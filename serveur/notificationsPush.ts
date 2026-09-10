import { createHash } from 'node:crypto';
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere.js';
import { momentsDepuisFil, TYPES_IMPORTANTS } from '../src/lib/ligue/momentsForts.js';
import type { StockagePush } from './pushStockage.js';

export const idPush = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex');
export function configurationPush() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}
export function validerAbonnement(x: unknown): PushSubscription {
  const a = x as PushSubscription;
  if (!a || typeof a.endpoint !== 'string' || a.endpoint.length > 2048) throw new Error('Abonnement invalide.');
  const u = new URL(a.endpoint);
  // Les destinations sont imposées : l'API ne peut servir de relais HTTP arbitraire.
  if (u.protocol !== 'https:' || u.port || u.username || u.password || !(
    u.hostname === 'fcm.googleapis.com' || u.hostname === 'updates.push.services.mozilla.com' ||
    u.hostname.endsWith('.push.services.mozilla.com') || u.hostname === 'web.push.apple.com' ||
    u.hostname.endsWith('.notify.windows.com'))) throw new Error('Service de notification non reconnu.');
  if (!a.keys || !/^[\w-]{87}$/.test(a.keys.p256dh) || !/^[\w-]{22}$/.test(a.keys.auth)) throw new Error('Clés de notification invalides.');
  return { endpoint: a.endpoint, keys: { p256dh: a.keys.p256dh, auth: a.keys.auth } };
}
export interface AlerteMatch { id: string; match: string; titre: string; corps: string; date: number; expire: number; comptes: string[] }
export function alertesMatchs(e: EtatCarriereEnLigne, n: number): AlerteMatch[] {
  const resultat: AlerteMatch[] = [];
  for (const r of e.rencontres) {
    const clubs = e.clubs.filter(c => [r.domicile,r.exterieur].includes(c.id));
    const comptes = clubs.map(c => c.compteId);
    const nom = (id: string) => clubs.find(c => c.id === id)?.nom ?? 'Club';
    const affiche = `${nom(r.domicile)} – ${nom(r.exterieur)}`;
    const ajouter = (id: string,titre: string,corps: string,date: number,expire = date + 120000,cibles = comptes) => {
      if (date <= n && expire > n) resultat.push({ id: `${r.id}:${id}`,match:r.id,titre,corps,date,expire,comptes:cibles });
    };
    ajouter('ouverture','La journée est ouverte',affiche,Date.parse(r.ouvre));
    ajouter('rappel','Coup d’envoi dans deux minutes',affiche,Date.parse(r.ferme)-120000,Date.parse(r.ferme));
    const m = r.match;
    if (!m) continue;
    ajouter('debut','Coup d’envoi',affiche,m.debut);
    for (const v of momentsDepuisFil(m.id,m.fil)) {
      if (!TYPES_IMPORTANTS.has(v.type) || v.type === 'jalon') continue;
      const titre = v.type === 'essai' ? 'Essai !' : v.type === 'but' ? (v.points === 2 ? 'Transformation réussie' : 'Trois points !') :
        ({ penalite:'Pénalité',carton:'Carton',butRate:'Coup de pied manqué',blessure:'Blessure',remplacement:'Remplacement' } as Record<string,string>)[v.type] ?? 'Moment fort';
      ajouter(v.id,titre,`${Math.floor(v.seconde/60)}′ · ${nom(r.domicile)} ${v.score.domicile}–${v.score.exterieur} ${nom(r.exterieur)}. ${v.texte}`,m.debut+v.seconde*1000+m.gel);
    }
    if (m.horloge >= 40) ajouter('pause','Mi-temps',affiche,m.debut+40*60000+m.gel);
    if (m.termine) ajouter('fin','Fin du match',`${nom(r.domicile)} ${m.score.domicile}–${m.score.exterieur} ${nom(r.exterieur)}`,m.debut+80*60000+m.gel);
    if (m.decision) {
      const compte = e.clubs.find(c => c.id === r[m.decision!.cote])?.compteId;
      ajouter(`decision-${m.decision.jusqua}`,'À toi de décider',`Pénalité à ${m.decision.distance} m : points, touche, mêlée ou jeu rapide.`,m.decision.jusqua-20000,m.decision.jusqua,compte ? [compte] : []);
    }
  }
  return resultat;
}
export async function envoyerPush(abonnement: PushSubscription, message: object, ttl = 120) {
  const config = configurationPush();
  if (!config) throw new Error('Les notifications attendent la configuration du serveur.');
  await webpush.sendNotification(abonnement,JSON.stringify(message),{ vapidDetails: config, TTL: ttl, urgency:'high', timeout:5000 });
}
export async function notifierMatchs(stockage: StockagePush, etat: EtatCarriereEnLigne, n = Date.now()) {
  if (!configurationPush()) return;
  const alertes = alertesMatchs(etat,n);
  if (!alertes.length) return;
  const abonnements = await stockage.lister(etat.id);
  // Huit terminaux au plus en parallèle ; chaque terminal reçoit les événements dans l'ordre.
  let index = 0;
  const envoyerTerminal = async () => { while(index < abonnements.length) {
    const a = abonnements[index++];
    for (const v of alertes) {
    if (!v.comptes.includes(a.compte) || v.date < a.cree) continue;
    const cle = `${a.id}:${a.compte}:${etat.id}:${v.id}`;
    if (!await stockage.reserver(cle,n)) continue;
    try {
      await envoyerPush(a.abonnement,{ title:v.titre, body:v.corps, tag:v.id, url:`/?directLigue=${etat.id}&directMatch=${v.match}` },Math.max(1,Math.ceil((v.expire-n)/1000)));
      await stockage.terminer(cle);
    } catch (e) {
      const code = (e as {statusCode?:number}).statusCode;
      if (code === 404 || code === 410) { await stockage.supprimer(a.compte,a.id); break; }
      await stockage.liberer(cle);
      console.warn('[push] Livraison à réessayer',code ?? 'réseau');
    }
  }
  } };
  await Promise.all(Array.from({length:Math.min(8,abonnements.length)},envoyerTerminal));
}
