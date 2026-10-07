// LES STATISTIQUES D'UTILISATION — banc du Correctif 25 (points 13 à 23) — `npm run verify:usage`
//
// Ce qu'il tient fermé :
//   1. un relevé hors bornes n'entre pas (point d'entrée sans compte : tout doit être borné) ;
//   2. les sommes sont justes : actifs, temps par mode, sessions, compteurs, classements, collections ;
//   3. la rétention ne compte que les appareils qui ont eu le temps de revenir ;
//   4. à travers le vrai gestionnaire : le relevé part sans compte, la lecture est réservée à Kiri, le débit est limité,
//      et rien de nominatif ne sort.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';
import {
  assemblerStatistiques, decaler, fusionnerEnvoi, jourUTC, matiereDepuisLignes, validerEnvoi,
  type CompteurUsage, type EnvoiUsage, type LigneUsage, type ModeUsage, type StatistiquesUsage,
} from '../src/lib/usage/agregats';

const T0 = Date.parse('2026-11-20T15:00:00.000Z');
let horloge = T0;
Date.now = () => horloge;
const AUJ = jourUTC(T0);
let controles = 0;
const ok = (c: unknown, m: string) => { controles++; assert.ok(c, m); };
const egal = <T>(a: T, b: T, m: string) => { controles++; assert.deepEqual(a, b, m); };
const appareil = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const releve = (n: number, jour: string, premier: string, modePremier: ModeUsage, secondes: Partial<Record<ModeUsage, number>>, compteurs: Record<string, number> = {}, extra: Partial<EnvoiUsage> = {}): EnvoiUsage =>
  ({ appareil: appareil(n), jour, premier, modePremier, secondes, sessions: 1, compteurs, ...extra });

// ── 1. Ce qui entre, ce qui n'entre pas ─────────────────────────────────────
{
  const bon = releve(1, AUJ, decaler(AUJ, -3), 'joueur', { joueur: 600, autre: 45 }, { 'carrieres.cree': 1, 'poste.demi_melee': 1, 'club.Stade Toulousain': 1, 'incarne.Antoine DUPONT.matchs': 2 }, { jauges: { taille: 120, exemplaires: 150, packs: 40 } });
  egal(validerEnvoi(JSON.parse(JSON.stringify(bon)), T0), bon, 'un relevé ordinaire est accepté tel quel');
  ok(validerEnvoi({ ...bon, jour: decaler(AUJ, -1) }, T0), 'le relevé de la veille est accepté (onglet resté ouvert après minuit)');
  const refuse = (modif: Record<string, unknown>, quoi: string) => ok(validerEnvoi({ ...bon, ...modif }, T0) === null, `refusé : ${quoi}`);
  refuse({ appareil: 'kiri' }, 'un identifiant d\'appareil qui n\'en est pas un');
  refuse({ appareil: '../../etc/passwd-0000-0000' }, 'un identifiant avec des caractères de chemin');
  refuse({ jour: decaler(AUJ, -2) }, 'un relevé d\'il y a deux jours');
  refuse({ jour: decaler(AUJ, 1) }, 'un relevé daté de demain');
  refuse({ premier: decaler(AUJ, 1) }, 'une première visite postérieure au relevé');
  refuse({ modePremier: 'triche' }, 'un mode inconnu en première visite');
  refuse({ secondes: { joueur: 3601 } }, 'plus d\'une heure dans un relevé');
  refuse({ secondes: { joueur: 2000, ligue: 2000 } }, 'plus d\'une heure au total');
  refuse({ secondes: { joueur: -5 } }, 'un temps négatif');
  refuse({ secondes: { casino: 60 } }, 'un mode inventé');
  refuse({ sessions: 9 }, 'neuf sessions dans un relevé');
  refuse({ compteurs: { 'ovas.offerts': 5 } }, 'une famille de compteurs inconnue');
  refuse({ compteurs: { 'carrieres.cree': 0 } }, 'un compteur nul');
  refuse({ compteurs: { 'carrieres.cree': 99999 } }, 'un compteur démesuré');
  refuse({ compteurs: { 'club.<script>': 1 } }, 'une clé avec du balisage');
  refuse({ compteurs: { 'incarne.a.b.c': 1 } }, 'une clé trop profonde');
  refuse({ compteurs: Object.fromEntries(Array.from({ length: 41 }, (_, k) => [`club.Club ${k}`, 1])) }, 'quarante et un compteurs');
  refuse({ jauges: { taille: -1, exemplaires: 0, packs: 0 } }, 'une collection de taille négative');
  ok(validerEnvoi(null, T0) === null && validerEnvoi('bonjour', T0) === null, 'ce qui n\'est pas un relevé est refusé');
  console.log('1. validation des relevés');
}

// ── 2 et 3. Les sommes et la rétention, sur une population connue ───────────
{
  const lignes: LigneUsage[] = [], compteurs: CompteurUsage[] = [];
  const poser = (e: EnvoiUsage) => fusionnerEnvoi(lignes, compteurs, e);
  // Dix appareils arrivés il y a 40 jours par la carrière joueur : tous reviennent le lendemain, cinq à 7 jours, deux à 30.
  const J40 = decaler(AUJ, -40);
  for (let n = 1; n <= 10; n++) {
    poser(releve(n, J40, J40, 'joueur', { joueur: 1200 }, { 'carrieres.cree': 1, 'poste.demi_melee': 1, 'club.Stade Toulousain': 1 }));
    poser(releve(n, decaler(J40, 1), J40, 'joueur', { joueur: 600 }, { 'matchs.cree': 2 }));
    if (n <= 5) poser(releve(n, decaler(J40, 9), J40, 'joueur', { joueur: 300 }));
    if (n <= 2) poser(releve(n, decaler(J40, 33), J40, 'joueur', { joueur: 300 }));
  }
  // Quatre appareils arrivés il y a 3 jours par la collection : un seul revient le lendemain ; trop jeunes pour le 7ᵉ jour.
  const J3 = decaler(AUJ, -3);
  for (let n = 11; n <= 14; n++) {
    poser(releve(n, J3, J3, 'collection', { collection: 900, autre: 100 }, { 'packs.solo': 5, 'collection.debut': 1 }, { jauges: { taille: 40 + n, exemplaires: 60, packs: 5 } }));
    if (n === 11) poser(releve(n, decaler(J3, 1), J3, 'collection', { collection: 300 }, { 'packs.solo': 3 }, { jauges: { taille: 80, exemplaires: 100, packs: 8 } }));
  }
  // Aujourd'hui : trois appareils, dont deux carrières avec un joueur existant, et un relevé envoyé en deux fois.
  poser(releve(21, AUJ, AUJ, 'existant', { existant: 1500 }, { 'carrieres.existant': 1, 'incarne.Antoine DUPONT': 1, 'incarne.Antoine DUPONT.matchs': 3, 'incarne.Antoine DUPONT.secondes': 1500, 'matchs.existant': 3, 'poste.demi_melee': 1 }));
  poser(releve(22, AUJ, AUJ, 'existant', { existant: 500 }, { 'carrieres.existant': 1, 'incarne.Romain NTAMACK': 1, 'incarne.Romain NTAMACK.secondes': 500, 'poste.demi_ouverture': 1 }));
  poser(releve(23, AUJ, AUJ, 'ligue', { ligue: 2000 }));
  poser(releve(23, AUJ, AUJ, 'ligue', { ligue: 1000, entraineur: 600 }, { 'carrieres.entraineur': 1 }, { sessions: 0 }));
  egal(lignes.filter((l) => l.appareil === appareil(23)).length, 1, 'deux relevés du même jour ne font qu\'une ligne');
  egal(lignes.find((l) => l.appareil === appareil(23))!.secondes, { ligue: 3000, entraineur: 600 }, 'et leurs temps s\'additionnent');

  const jour = assemblerStatistiques(matiereDepuisLignes(lignes, compteurs, 'jour', AUJ), 'jour');
  egal([jour.global.actifsJour, jour.global.actifs7, jour.global.actifs30], [3, 7, 9], 'actifs : 3 aujourd\'hui, 7 sur sept jours, 9 sur trente');
  egal(jour.global.tempsTotal, 1500 + 500 + 3000 + 600, 'temps total du jour');
  egal(jour.global.sessions, 3, 'trois sessions aujourd\'hui (le second relevé n\'en ouvrait pas)');
  egal(jour.global.modes[0].mode, 'ligue', 'le mode le plus joué est en tête');
  ok(Math.abs(jour.global.modes.reduce((s, m) => s + m.part, 0) - 1) < 1e-9, 'les parts des modes font 100 %');
  egal(jour.global.modes.find((m) => m.mode === 'existant')!.utilisateurs, 2, 'deux appareils en carrière hors classement');
  egal(jour.global.dureeSession, 5600 / 3, 'durée moyenne d\'une session');
  egal([jour.horsClassement.total, jour.horsClassement.matchs, jour.horsClassement.temps], [2, 3, 2000], 'hors classement : carrières, matchs, temps');
  egal(jour.horsClassement.top.map((l) => [l.nom, l.n, l.matchs, l.secondes]), [['Antoine DUPONT', 1, 3, 1500], ['Romain NTAMACK', 1, 0, 500]], 'les joueurs les plus incarnés, avec leurs matchs et leur temps');
  egal(jour.entraineur.creees, 1, 'une carrière d\'entraîneur créée');
  egal(jour.joueur.postes[0], { nom: 'demi_melee', n: 1 }, 'les postes de la période seulement');
  ok(!jour.horsClassement.top.some((l) => l.nom.includes('matchs') || l.nom.includes('secondes')), 'les compteurs de détail ne se glissent pas dans le classement');

  const tout = assemblerStatistiques(matiereDepuisLignes(lignes, compteurs, 'tout', AUJ), 'tout');
  egal(tout.global.actifsPeriode, 17, 'dix-sept appareils depuis le début');
  egal([tout.joueur.creees, tout.joueur.existantes, tout.joueur.matchs], [10, 2, 23], 'carrières créées, existantes, matchs');
  egal(tout.joueur.postes[0], { nom: 'demi_melee', n: 11 }, 'le poste le plus choisi');
  egal(tout.joueur.clubs[0], { nom: 'Stade Toulousain', n: 10 }, 'le club le plus choisi');
  egal([tout.collection.commencees, tout.collection.packs, tout.collection.actifs], [4, 23, 4], 'collection : commencées, packs, actifs');
  egal(tout.collection.packsParJoueur, 23 / 4, 'packs par joueur actif');
  egal(tout.collection.tailleMoyenne, (80 + 52 + 53 + 54) / 4, 'taille moyenne : le DERNIER relevé de chaque collection');
  egal(tout.collection.joursActifsParJoueur, 5 / 4, 'jours actifs par joueur');
  const cree = tout.comparaison.find((c) => c.type === 'cree')!, existant = tout.comparaison.find((c) => c.type === 'existant')!;
  egal([cree.creations, cree.matchsParCarriere, cree.tempsParCarriere], [10, 2, (10 * 1800 + 5 * 300 + 2 * 300) / 10], 'joueur créé : créations, matchs et temps par carrière');
  egal([existant.creations, existant.matchsParCarriere], [2, 1.5], 'joueur existant : créations et matchs par carrière');

  // La rétention.
  const r = (s: StatistiquesUsage, mode: ModeUsage) => s.retention.find((x) => x.mode === mode);
  egal([r(tout, 'joueur')!.cohorte, r(tout, 'joueur')!.j1, r(tout, 'joueur')!.j7, r(tout, 'joueur')!.j30], [10, 1, 0.5, 0.2], 'carrière joueur : 100 % le lendemain, 50 % à 7 jours, 20 % à 30 jours');
  egal([r(tout, 'collection')!.cohorte, r(tout, 'collection')!.j1, r(tout, 'collection')!.j7, r(tout, 'collection')!.j30], [4, 0.25, null, null], 'collection : 25 % le lendemain ; trop jeune pour dire le 7ᵉ jour');
  egal([r(tout, 'existant')!.cohorte, r(tout, 'existant')!.j1], [2, null], 'arrivés aujourd\'hui : rien à dire du lendemain');
  egal(cree.j7, 0.5, 'la comparaison reprend le retour à 7 jours');
  ok(!r(jour, 'joueur'), 'sur la journée, la cohorte d\'il y a quarante jours n\'apparaît pas');
  const sept = assemblerStatistiques(matiereDepuisLignes(lignes, compteurs, '7', AUJ), '7');
  egal(sept.global.actifsPeriode, 7, 'sept appareils sur sept jours');
  egal(sept.collection.packs, 23, 'les packs de la semaine');
  egal(sept.joueur.creees, 0, 'aucune carrière créée cette semaine');
  console.log('2-3. sommes, classements, collections et rétention');
}

// ── 4. À travers le vrai gestionnaire ───────────────────────────────────────
{
  const fichier = join(mkdtempSync(join(tmpdir(), 'usage-')), 'base.json');
  const kiri = appareil(901), autre = appareil(902);
  writeFileSync(fichier, JSON.stringify({
    comptes: [{ id: kiri, identifiant: 'kiri', pseudo: 'Kiri', empreinte: '', creeLe: T0, vuLe: T0 }, { id: autre, identifiant: 'visiteur', pseudo: 'Visiteur', empreinte: '', creeLe: T0, vuLe: T0 }],
    sessions: { [empreinteJeton('jeton-kiri')]: { compte: kiri, expiration: T0 + 1e10 }, [empreinteJeton('jeton-autre')]: { compte: autre, expiration: T0 + 1e10 } },
    ligues: [], recus: {}, debits: {},
  }));
  const api = creerGestionnaireCarriere(stockageFichier(fichier), async () => {});
  async function appeler(methode: 'GET' | 'POST', url: string, jeton?: string, body?: object, ip = '203.0.113.7') {
    let statut = 200; let donnees: any;
    const res = { status(x: number) { statut = x; return res; }, setHeader() {}, json(x: unknown) { donnees = JSON.parse(JSON.stringify(x)); } };
    await api.handler({ method: methode, url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', 'x-forwarded-for': ip, ...(jeton ? { cookie: `destiny_carriere=${jeton}` } : {}) }, body } as never, res as never);
    return { statut, donnees };
  }
  const poster = (r: unknown, ip?: string) => appeler('POST', '/api/carriere?action=usage', undefined, { action: 'usage', releve: r }, ip);
  const un = await poster(releve(1, AUJ, AUJ, 'existant', { existant: 900 }, { 'carrieres.existant': 1, 'incarne.Antoine DUPONT': 1 }));
  egal([un.statut, un.donnees], [200, { ok: true }], 'un relevé part SANS compte');
  egal((await poster({ ...releve(2, AUJ, AUJ, 'joueur', { joueur: 99999 }) })).donnees, { ok: false }, 'un relevé hors bornes est refusé sans erreur visible');
  egal((await poster({ pas: 'un relevé' })).statut, 200, 'un envoi abîmé ne rend jamais une erreur au joueur');
  ok((await poster(releve(3, AUJ, AUJ, 'collection', { collection: 300 }, { 'packs.solo': 2 }, { jauges: { taille: 12, exemplaires: 15, packs: 2 } }))).donnees.ok, 'un second appareil');

  egal((await appeler('GET', '/api/carriere?statistiques=usage&periode=7')).statut, 401, 'sans compte, on ne lit pas les statistiques');
  egal((await appeler('GET', '/api/carriere?statistiques=usage&periode=7', 'jeton-autre')).statut, 404, 'un autre compte que Kiri non plus');
  const lu = await appeler('GET', '/api/carriere?statistiques=usage&periode=7', 'jeton-kiri');
  egal(lu.statut, 200, 'Kiri lit les statistiques');
  const s = lu.donnees as StatistiquesUsage;
  egal([s.global.actifsJour, s.global.tempsTotal, s.collection.packs, s.horsClassement.top[0]?.nom], [2, 1200, 2, 'Antoine DUPONT'], 'les relevés acceptés y sont, le refusé n\'y est pas');
  ok(!JSON.stringify(s).includes('00000000-0000-4000'), 'aucun identifiant d\'appareil ne sort du serveur');
  egal((await appeler('GET', '/api/carriere?statistiques=usage&periode=n-importe-quoi', 'jeton-kiri')).donnees.periode, 'tout', 'une période inconnue vaut « depuis le début »');

  // Le débit : soixante relevés par adresse et par dix minutes.
  let acceptes = 0;
  for (let k = 0; k < 70; k++) if ((await poster(releve(100 + k, AUJ, AUJ, 'autre', { autre: 15 }), '198.51.100.9')).donnees.ok) acceptes++;
  egal(acceptes, 60, 'au-delà de soixante relevés en dix minutes, une adresse n\'est plus écoutée');
  horloge += 11 * 60_000;
  ok((await poster(releve(200, AUJ, AUJ, 'autre', { autre: 15 }), '198.51.100.9')).donnees.ok, 'et elle l\'est de nouveau dix minutes plus tard');
  console.log('4. gestionnaire : relevé sans compte, lecture réservée, débit limité');
}

console.log(`\n✅ ${controles} contrôles`);
