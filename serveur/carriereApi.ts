import { creerPaiement, diagnosticErreurStripe, journalErreurStripe } from './paiementsStripe.js';
import { contexteAtelier, enregistrerAtelier, vueAtelier } from './atelierAdmin.js';
import { catalogueAdmin, CATALOGUE_ADMIN_VIDE, type CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { isDeepStrictEqual, promisify } from 'node:util';
import { configurationPush, envoyerPush, idPush, notifierMatchs, validerAbonnement } from './notificationsPush.js';
import { agirCarriere, avancerCarriere as actualiserCarriere, avancerCarrierePourDirect, creerCarriere, creerDivisionPublique, creerLaboratoireCarriere, empreinteEcriture, vueCarriere, vueCarriereObservateur, vueRencontreCarriere, vueRencontreCarriereObservateur } from '../src/lib/ligue/carriere.js';
import { planifierDivisionsPubliques } from './divisionsPubliques.js';
import { echeanceLigue } from '../src/lib/ligue/echeanceCarriere.js';
import type { CommandeCarriere, EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere.js';
import { DELAI_PRESENCE } from '../src/lib/ligue/matchCarriere.js';
import type { CompteStocke, LigueStockee, ResumeDivisionPublique, SalonAmicalStocke, StockageCarriere } from './carriereStockage.js';
import { OAuth2Client } from 'google-auth-library';
import { validerEtatBoutiqueCompte } from '../src/lib/boutiqueCompte.js';
import { catalogueBaseCarriere, MEZE_RUGBY_EMBLEME } from '../src/lib/ligue/catalogueCarriere.js';
import { cleCarteSolo } from '../src/lib/collectionSolo.js';
import { lotCartesSolo } from '../src/lib/echangesSolo.js';

export interface RequeteCarriere {
  method?: string; url?: string; body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}
export interface ReponseCarriere {
  status(code: number): ReponseCarriere;
  setHeader(nom: string, valeur: string): unknown;
  json(contenu: unknown): unknown;
  /**
   * Réponse binaire — le relais d'écussons, et rien d'autre. Facultative :
   * un hôte qui ne la fournit pas rend simplement les écussons distants tels
   * qu'ils sont, sans détourage.
   */
  envoyer?(donnees: Uint8Array): unknown;
}
class ErreurHttp extends Error { constructor(public statut: number, message: string) { super(message); } }
const COOKIE = 'destiny_carriere';
const DUREE_SESSION = 30 * 24 * 60 * 60_000;
const DEUX_SEMAINES = 14 * 24 * 60 * 60_000;
const chiffrer = promisify(scrypt);
export const empreinteJeton = (valeur: string) => createHash('sha256').update(valeur).digest('hex');
const entete = (req: RequeteCarriere, nom: string) => String(req.headers[nom] ?? '');
const objet = (x: unknown): Record<string, unknown> => {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new ErreurHttp(400, 'Demande invalide.');
  return x as Record<string, unknown>;
};
const texte = (x: unknown, min: number, max: number, nom: string): string => {
  if (typeof x !== 'string' || x.trim().length < min || x.trim().length > max || /\p{Cc}/u.test(x)) {
    throw new ErreurHttp(400, `${nom} : entre ${min} et ${max} caractères.`);
  }
  return x.trim();
};
const idValide = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
let clesCartesSolo: Set<string> | undefined;
const cartesEchangeables = () => (clesCartesSolo ??= new Set(catalogueBaseCarriere().map(c => cleCarteSolo(c.sourceId))));

interface SalonAmicalServeur {
  code: string;
  creeLe: number;
  expireLe: number;
  hote: { compteId: string; pseudo: string; equipe: any; dernierVu: number; input?: any };
  invite?: { compteId: string; pseudo: string; equipe: any; dernierVu: number; input?: any };
  statut: 'attente' | 'pret' | 'en_cours' | 'termine';
  etatMatch?: any;
}

// Le gestionnaire HTTP est recréé à chaud en développement. Les salons doivent
// donc vivre au niveau du module, sinon chaque requête oublie la précédente.
const salonsAmicaux = new Map<string, SalonAmicalServeur>();

export async function hacherMotDePasse(mot: string): Promise<string> {
  const sel = randomBytes(16).toString('hex');
  const cle = await chiffrer(mot, sel, 64) as Buffer;
  return `scrypt$${sel}$${cle.toString('hex')}`;
}
export async function verifierMotDePasse(mot: string, empreinte: string): Promise<boolean> {
  const [algo, sel, attendu] = empreinte.split('$');
  if (algo !== 'scrypt' || !sel || !attendu || attendu.length !== 128) return false;
  const cle = await chiffrer(mot, sel, 64) as Buffer;
  return timingSafeEqual(cle, Buffer.from(attendu, 'hex'));
}
function lireJeton(req: RequeteCarriere) {
  return entete(req, 'cookie').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? '';
}
function cookie(req: RequeteCarriere, res: ReponseCarriere, jeton: string, expire = false) {
  const securise = entete(req, 'x-forwarded-proto') === 'https' || process.env.VERCEL === '1';
  res.setHeader('Set-Cookie', `${COOKIE}=${jeton}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${expire ? 0 : DUREE_SESSION / 1000}${securise ? '; Secure' : ''}`);
}
function protegerOrigine(req: RequeteCarriere) {
  if (req.method !== 'POST') return;
  if (!entete(req, 'content-type').toLowerCase().startsWith('application/json')) throw new ErreurHttp(415, 'Une demande JSON est requise.');
  if (entete(req, 'sec-fetch-site') === 'cross-site') throw new ErreurHttp(403, 'Origine de la demande refusée.');
  const origine = entete(req, 'origin');
  if (origine) {
    let hote = '';
    try { hote = new URL(origine).host; } catch { throw new ErreurHttp(403, 'Origine invalide.'); }
    if (hote !== entete(req, 'host')) throw new ErreurHttp(403, 'Origine de la demande refusée.');
  }
}

/** Aucune empreinte, graine ou identité privée ne part dans la vue. */
const publicCompte = (c: CompteStocke) => ({ id: c.id, pseudo: c.pseudo, administrateur: c.identifiant === 'kiri' });
const comptesEtat = (e: EtatCarriereEnLigne) => e.clubs.map(c => c.compteId);

export function creerGestionnaireCarriere(stockage: StockageCarriere, programmer?: (etat: EtatCarriereEnLigne) => Promise<void>) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const google = googleClientId ? new OAuth2Client(googleClientId) : null;
  let catalogueCache: CatalogueAdmin = CATALOGUE_ADMIN_VIDE;
  async function avecAtelier<T>(operation: () => Promise<T>): Promise<T> {
    const config = await stockage.atelier?.lire() ?? CATALOGUE_ADMIN_VIDE;
    if(config.revision !== catalogueCache.revision) catalogueCache = config;
    return contexteAtelier.run(catalogueCache, operation);
  }
  const notifier = async (etat: EtatCarriereEnLigne) => {
    await programmer?.(etat);
    if (stockage.push) await notifierMatchs(stockage.push, etat).catch(() => console.warn('[push] Service temporairement indisponible'));
  };
  // Les fonctions serverless chaudes réutilisent ces caches. Une vérification
  // d'en-tête minuscule garde la cohérence entre instances sans retransférer
  // les centaines de Ko de la ligue à chaque sondage de direct.
  const liguesChaudes = new Map<string, LigueStockee>();
  const poidsLigues = new Map<string, number>();
  /**
   * Tous les spectateurs arrivés dans la même tranche de 200 ms partagent UNE
   * avance du moteur. La vue reste personnalisée après (camp, banc, décision),
   * mais le calcul autoritaire n'est jamais répété pour chaque connexion.
   */
  const ticksDirects = new Map<string, { tick: number; etat: Promise<EtatCarriereEnLigne> }>();
  const PAS_DIRECT_MS = 200; // 5 Hz serveur ; le navigateur, lui, dessine à 60 Hz.
  let octetsLigues = 0;
  const oublierLigue = (id: string) => {
    octetsLigues -= poidsLigues.get(id) ?? 0;
    poidsLigues.delete(id); liguesChaudes.delete(id);
  };
  const sessionsChaudes = new Map<string, { compte: CompteStocke; jusqua: number }>();
  const lireSalonAmical = async (code: string): Promise<SalonAmicalServeur | null> => {
    const durable = await stockage.salonAmical?.(code);
    if (durable?.donnees) return structuredClone(durable.donnees) as SalonAmicalServeur;
    const memoire = salonsAmicaux.get(code);
    if (!memoire || memoire.expireLe < Date.now()) { salonsAmicaux.delete(code); return null; }
    return structuredClone(memoire);
  };
  const creerSalonPersistant = async (salon: SalonAmicalServeur): Promise<boolean> => {
    const ligne: SalonAmicalStocke = { code: salon.code, revision: 0, expireLe: salon.expireLe, donnees: salon };
    if (await stockage.creerSalonAmical?.(ligne)) return true;
    // Compatibilité immédiate tant que la migration SQL n'est pas encore appliquée.
    if (await stockage.salonAmical?.(salon.code)) return false;
    if (salonsAmicaux.has(salon.code)) return false;
    salonsAmicaux.set(salon.code, structuredClone(salon));
    return true;
  };
  const modifierSalonPersistant = async (
    code: string, modifier: (salon: SalonAmicalServeur) => void,
  ): Promise<SalonAmicalServeur | null> => {
    if (stockage.salonAmical && stockage.comparerEtEcrireSalonAmical) {
      for (let tentative = 0; tentative < 5; tentative++) {
        const ligne = await stockage.salonAmical(code);
        if (!ligne) break;
        const salon = structuredClone(ligne.donnees) as SalonAmicalServeur;
        modifier(salon);
        const suivante: SalonAmicalStocke = { code, revision: ligne.revision + 1, expireLe: salon.expireLe, donnees: salon };
        if (await stockage.comparerEtEcrireSalonAmical(suivante, ligne.revision)) return salon;
      }
    }
    const salon = salonsAmicaux.get(code);
    if (!salon || salon.expireLe < Date.now()) { salonsAmicaux.delete(code); return null; }
    modifier(salon);
    return structuredClone(salon);
  };
  const memoriserLigue = (id: string, recue: LigueStockee): LigueStockee => {
    const precedente = liguesChaudes.get(id);
    if (precedente && precedente.etat.version > recue.etat.version) return precedente;
    // Deux sondages peuvent finir dans le désordre tout en portant la même
    // version durable. Le cache ne doit jamais remplacer un direct plus avancé
    // par l'ancien score d'une réponse réseau plus lente.
    const matchsPrecedents = precedente && precedente.etat.version === recue.etat.version
      ? new Map(precedente.etat.rencontres.map(r => [r.id, r.match])) : null;
    const ligne = matchsPrecedents
      ? {
          ...recue,
          etat: {
            ...recue.etat,
            rencontres: recue.etat.rencontres.map(r => {
              const avant = matchsPrecedents.get(r.id);
              const apres = r.match;
              if (!avant || !apres || avant.id !== apres.id || avant.debut !== apres.debut) return r;
              const regresse = avant.termine && !apres.termine
                || apres.horloge + 1e-6 < avant.horloge
                || apres.score.domicile < avant.score.domicile
                || apres.score.exterieur < avant.score.exterieur;
              return regresse ? { ...r, match: avant } : r;
            }),
          },
        }
      : recue;
    octetsLigues -= poidsLigues.get(id) ?? 0;
    poidsLigues.delete(id);
    liguesChaudes.delete(id);
    const poids = Buffer.byteLength(JSON.stringify(ligne.etat));
    if (poids > 32 * 1024 * 1024) return ligne;
    liguesChaudes.set(id, ligne);
    poidsLigues.set(id, poids); octetsLigues += poids;
    while (liguesChaudes.size > 32 || octetsLigues > 32 * 1024 * 1024) {
      const ancien = liguesChaudes.keys().next().value!;
      octetsLigues -= poidsLigues.get(ancien) ?? 0;
      poidsLigues.delete(ancien); liguesChaudes.delete(ancien);
    }
    return ligne;
  };
  async function lireLigue(id: string, connue?: { version: number; comptes: string[]; echeance: number | null }) {
    const cache = liguesChaudes.get(id);
    if (!cache) {
      const ligne = await stockage.ligue(id);
      return ligne ? memoriserLigue(id, ligne) : ligne;
    }
    const entete = connue ?? await stockage.entete(id);
    if (entete && entete.version === cache.etat.version) {
      const ligne = { ...cache, comptes: entete.comptes, echeance: entete.echeance };
      return memoriserLigue(id, ligne);
    }
    const ligne = await stockage.ligue(id);
    if (ligne) return memoriserLigue(id, ligne);
    oublierLigue(id);
    return ligne;
  }
  async function avecPresences(etat: EtatCarriereEnLigne, maintenant: number) {
    if (!etat.rencontres.some(r => r.match && !r.match.termine)) return { etat, externes: false };
    const lignes = await stockage.presencesActives(etat.id, maintenant - DELAI_PRESENCE);
    if (lignes === null) return { etat, externes: false };
    const clubs = new Map(etat.clubs.map(c => [c.compteId, c.id]));
    const parMatch = new Map<string, Record<string, number>>();
    for (const p of lignes) {
      let presences = parMatch.get(p.match);
      if (!presences) { presences = {}; parMatch.set(p.match, presences); }
      presences[p.compte] = p.vu;
    }
    return {
      externes: true,
      etat: {
        ...etat,
        rencontres: etat.rencontres.map(r => {
          if (!r.match || r.match.termine) return r;
          const presence: typeof r.match.presence = {};
          for (const [compte, vu] of Object.entries(parMatch.get(r.id) ?? {})) {
            const club = clubs.get(compte);
            if (club === r.domicile) presence.domicile = vu;
            if (club === r.exterieur) presence.exterieur = vu;
          }
          return { ...r, match: { ...r.match, presence } };
        }),
      },
    };
  }
  const sansPresences = (etat: EtatCarriereEnLigne): EtatCarriereEnLigne => ({
    ...etat,
    rencontres: etat.rencontres.map(r => r.match && !r.match.termine
      ? { ...r, match: { ...r.match, presence: {} } }
      : r),
  });
  async function appliquer(id: string, compte: string, requete: string,
    operation: (etat: EtatCarriereEnLigne, maintenant: number, graine: string) => EtatCarriereEnLigne,
    autoriserInscription = false, verifierRecu = true,
    enteteConnue?: { version: number; comptes: string[]; echeance: number | null }) {
    for (let tentative = 0; tentative < 8; tentative++) {
      const cache = liguesChaudes.get(id);
      const controle = verifierRecu && stockage.verifierCommande ? await stockage.verifierCommande(id, compte, requete,
        cache ? { version: cache.etat.version, comptes: cache.comptes } : undefined) : undefined;
      if (controle === null) throw new ErreurHttp(404, 'Ligue introuvable.');
      const ligne = await lireLigue(id, controle ?? (tentative === 0 ? enteteConnue : undefined));
      if (!ligne || (!autoriserInscription && compte !== 'horloge' && !ligne.comptes.includes(compte))) {
        throw new ErreurHttp(404, 'Ligue introuvable.');
      }
      if (verifierRecu && (controle ? controle.dejaTraitee : await stockage.dejaTraitee(id, compte, requete))) return ligne.etat;
      const maintenant = Date.now();
      const presence = await avecPresences(ligne.etat, maintenant);
      const suivant = operation(presence.etat, maintenant, randomBytes(24).toString('hex'));
      // Une présence extérieure sert au calcul de la décision, puis disparaît
      // du gros agrégat. Sa petite ligne dédiée reste la seule source durable.
      const durable = presence.externes ? sansPresences(suivant) : suivant;
      const ancienDurable = presence.externes ? sansPresences(ligne.etat) : ligne.etat;
      /**
       * ⚠️ UN ÉTAT IDENTIQUE NE SE RÉÉCRIT PAS — et c'était la plus grosse fuite
       * du mode. `avancerCarriere` incrémente `version` À CHAQUE APPEL, même
       * quand il n'a rien trouvé à faire : un simple sondage de lecture
       * renvoyait donc les 300 à 400 Ko de l'état vers la base, six fois par
       * minute et par onglet ouvert. Lecture PLUS écriture, pour rien.
       *
       * On compare donc l'état produit à celui qu'on a lu, en neutralisant le
       * compteur de version — le seul champ qui bouge toujours. Identiques : on
       * garde l'ancien, on n'écrit pas, et la version reste stable. C'est ce qui
       * rend la lecture conditionnelle possible plus bas : une version qui
       * s'incrémente toute seule ne dit plus rien à personne.
       *
       * ⚠️ ON REPOUSSE QUAND MÊME L'ÉCHÉANCE. Une date peut passer sans rien
       * changer (`echeanceCarriere` est volontairement large et retient parfois
       * une date qui n'était l'échéance de rien). Sans ce rafraîchissement,
       * l'échéance resterait éternellement dans le passé et chaque sondage
       * relirait l'état entier — exactement ce qu'on cherche à éviter.
       */
      const memeEtat = empreinteEcriture(durable, ligne.etat.version) === empreinteEcriture(ancienDurable, ligne.etat.version);
      if (memeEtat) {
        const echeance = echeanceLigue(ligne.etat, maintenant);
        // En direct `echeanceLigue` vaut « maintenant » afin de laisser passer
        // chaque sondage. L'écrire toutes les deux secondes ne sert à rien :
        // l'ancienne échéance, déjà passée, produit exactement le même effet et
        // évite une UPDATE/WAL permanente pendant 80 minutes.
        if (echeance > maintenant && ligne.echeance !== echeance) await stockage.rafraichirEcheance(id, echeance).catch(() => {});
        // ⚠️ ON NE RÉÉCRIT PAS, MAIS ON REND BIEN L'ÉTAT AVANCÉ. Rendre l'état
        // LU ferait revivre indéfiniment la même seconde de match : pendant un
        // direct, la seule chose qui bouge est justement ce que
        // « empreinteEcriture » ignore — l'horloge, le score, le fil, le
        // terrain. Mesuré dans le navigateur : les trente joueurs restaient
        // figés, deux minutes durant.
        //
        // ⚠️ ET LA VERSION RESTE CELLE QUI EST STOCKÉE. « avancerCarriere »
        // l'incrémente à chaque appel ; la laisser filer rendrait au client des
        // numéros qui n'existent nulle part, et la première VRAIE écriture lui
        // reviendrait avec une version PLUS PETITE — que l'écran ignore, parce
        // qu'il refuse par principe de revenir en arrière.
        const avance = { ...suivant, version: ligne.etat.version };
        const stable = memoriserLigue(id, { ...ligne, etat: avance, echeance }).etat;
        // Un sondage du direct n'est qu'une lecture : le notifier ici lançait
        // une programmation de file et une recherche d'alertes à chaque GET.
        // Seul le réveil durable entretient la chaîne et diffuse les alertes.
        if (requete.startsWith('queue-') || requete.startsWith('tick-')) await notifier(stable);
        return stable;
      }
      const maj: LigueStockee = { ...ligne, etat: durable, comptes: comptesEtat(durable) };
      if (await stockage.comparerEtEcrire(maj, ligne.version, verifierRecu ? { compte, requete } : undefined)) {
        memoriserLigue(id, { ...maj, version: ligne.version + 1, echeance: echeanceLigue(durable, maintenant) });
        await notifier(durable);
        return durable;
      }
      oublierLigue(id);
    }
    throw new ErreurHttp(409, 'La ligue vient de changer. Réessayez dans un instant.');
  }
  function actualiserDirect(id: string, matchId: string, maintenant: number,
    enteteConnue?: { version: number; comptes: string[]; echeance: number | null }) {
    const tick = Math.floor(maintenant / PAS_DIRECT_MS);
    const cleDirect = `${id}:${matchId}`;
    const existant = ticksDirects.get(cleDirect);
    if (existant?.tick === tick) return existant.etat;
    if (existant) ticksDirects.delete(cleDirect);
    const etat = appliquer(
      id, 'horloge', `direct-${tick}`,
      (e, n, g) => avancerCarrierePourDirect(e, matchId, n, g), false, false, enteteConnue,
    );
    ticksDirects.set(cleDirect, { tick, etat });
    while (ticksDirects.size > 512) ticksDirects.delete(ticksDirects.keys().next().value!);
    void etat.catch(() => {
      if (ticksDirects.get(cleDirect)?.etat === etat) ticksDirects.delete(cleDirect);
    });
    return etat;
  }
  async function avancerLigues() {
    await stockage.nettoyerPresences(Date.now() - 24 * 60 * 60_000).catch(() => {});
    const supprimees = await stockage.supprimerLiguesInactives(Date.now() - DEUX_SEMAINES).catch(() => [] as string[]);
    for (const id of supprimees) oublierLigue(id);
    const ids = await stockage.actives();
    let traitees = 0;
    let index = 0;
    // Une concurrence bornée absorbe un pic sans ouvrir des centaines de
    // connexions Neon dans la même fonction Vercel.
    const ouvrier = async () => {
      while (index < ids.length) {
        const id = ids[index++];
        try {
          await appliquer(id, 'horloge', `tick-${randomUUID()}`, (e, n, g) => actualiserCarriere(e, n, g), false, false);
          traitees++;
        } catch { console.warn('[horloge] Une ligue sera reprise au prochain passage'); }
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, ids.length) }, () => ouvrier()));
    await assurerDivisionsPubliques(Date.now());
    return { actualisees: traitees, supprimees: supprimees.length };
  }
  async function assurerLaboratoireKiri(compte: CompteStocke, maintenant: number) {
    let ligues = await stockage.ligues(compte.id);
    if (compte.identifiant === 'kiri') {
      const ligue = ligues.filter(l => l.publique).sort((a, b) => (b.publique?.cycle ?? 0) - (a.publique?.cycle ?? 0))[0];
      if (ligue && (!ligue.clubEmbleme || ligue.clubEmbleme === '/logos/fc-meze.jpg')) {
        await appliquer(ligue.id, compte.id, 'logo-meze-rugby-kiri-v2', (etat, n, graine) => {
          const club = etat.clubs.find(c => c.compteId === compte.id);
          if (!club || (club.embleme && club.embleme !== '/logos/fc-meze.jpg')) return etat;
          const suivant = agirCarriere(etat, compte.id, { type: 'changerEmblemePublic', embleme: MEZE_RUGBY_EMBLEME }, n, graine);
          suivant.clubs.find(c => c.compteId === compte.id)!.emblemeKiriInitialise = true;
          return suivant;
        }, false, false);
      }
      if (ligue && (!ligue.clubEmbleme || ligue.clubEmbleme === '/logos/fc-meze.jpg')) ligues = await stockage.ligues(compte.id);
    }
    if (compte.identifiant !== 'kiri' || ligues.some(l => l.laboratoire)) return ligues;
    const empreinte = createHash('sha256').update(`laboratoire-kiri:${compte.id}`).digest('hex');
    const id = `${empreinte.slice(0, 8)}-${empreinte.slice(8, 12)}-4${empreinte.slice(13, 16)}-8${empreinte.slice(17, 20)}-${empreinte.slice(20, 32)}`;
    const code = `LAB-${empreinte.slice(0, 10).toUpperCase()}`;
    const etat = creerLaboratoireCarriere({ id, code, compteId: compte.id, pseudo: compte.pseudo }, maintenant, empreinte);
    if (await stockage.creerLigue({ id, code, etat, comptes: comptesEtat(etat), version: 0 })) {
      memoriserLigue(id, { id, code, etat, comptes: comptesEtat(etat), version: 0 });
    }
    ligues = await stockage.ligues(compte.id);
    return ligues;
  }
  async function assurerDivisionsPubliques(maintenant: number) {
    if (!stockage.dernierCyclePublic || !stockage.divisionsPubliques || !stockage.resumesDivisionsPubliques) return { cycle: 0, divisions: [] as ResumeDivisionPublique[] };
    const dernier = await stockage.dernierCyclePublic();
    if (dernier === null) return { cycle: 0, divisions: [] as ResumeDivisionPublique[] };
    const materialiser = async (numero: number, precedentesResume: ResumeDivisionPublique[], existantes: ResumeDivisionPublique[]) => {
      const precedentes = await stockage.divisionsPubliques(numero - 1);
      // Le dernier groupe plein peut avoir commencé après le premier. Chacun
      // joue ses 30 jours ; la nouvelle saison attend la fin du dernier groupe.
      const clotureSimulee = maintenant;
      for (const ligne of precedentes) {
        let terminee = false;
        for (let tour = 0; tour < 8; tour++) {
          const etat = await appliquer(ligne.id, 'horloge', `fin-cycle-${numero}-${tour}`,
            (courant, _n, g) => actualiserCarriere(courant, clotureSimulee, g), false, false);
          if (etat.phase === 'intersaison' || etat.phase === 'salon') { terminee = true; break; }
        }
        if (!terminee) return false;
      }
      const plans = planifierDivisionsPubliques(await stockage.divisionsPubliques(numero - 1), numero);
      for (const plan of plans) {
        if (existantes.some(l => l.division === plan.division) || !plan.heritiers.length) continue;
        const premier = plan.heritiers[0].club;
        const id = randomUUID();
        const code = `DR-PUBLIC-C${numero}-D${plan.division}`;
        const etat = creerDivisionPublique({ id, code, compteId: premier.compteId, pseudo: premier.pseudo, clubNom: premier.nom },
          numero, plan.division, maintenant, randomBytes(24).toString('hex'), plan.heritiers);
        if (plan.barrage) etat.publique!.barrage = plan.barrage;
        await stockage.creerLigue({ id, code, etat, comptes: comptesEtat(etat), version: 0 });
      }
      return true;
    };
    let cycle = dernier;
    for (let tour = 0; tour < 4; tour++) {
      const courantes = await stockage.resumesDivisionsPubliques(cycle);
      if (cycle > 0) {
        const precedentes = await stockage.resumesDivisionsPubliques(cycle - 1);
        if (courantes.length < precedentes.length) {
          if (!await materialiser(cycle, precedentes, courantes)) return { cycle: cycle - 1, divisions: precedentes };
          continue;
        }
      }
      const commencees = courantes.filter(l => l.phase !== 'salon');
      if (!commencees.length || commencees.some(l => !l.finLe || Date.parse(l.finLe) > maintenant)) return { cycle, divisions: courantes };
      if (!await materialiser(cycle + 1, courantes, await stockage.resumesDivisionsPubliques(cycle + 1))) return { cycle, divisions: courantes };
      cycle++;
    }
    return { cycle, divisions: await stockage.resumesDivisionsPubliques(cycle) };
  }
  async function rejoindreDivisionPublique(compte: CompteStocke, clubNom: string, embleme: string | undefined, maintenant: number) {
    if (!stockage.divisionsPubliques || !stockage.resumesDivisionsPubliques || !stockage.dernierCyclePublic) throw new ErreurHttp(503, 'La ligue publique est indisponible sur ce serveur.');
    for (let tentative = 0; tentative < 5; tentative++) {
      const etatPublic = await assurerDivisionsPubliques(maintenant);
      const deja = etatPublic.divisions.find(l => l.comptes.includes(compte.id));
      if (deja) return vueCarriere((await appliquer(deja.id, compte.id, `lecture-publique-${Math.floor(maintenant / 2000)}`,
        (e, n, g) => actualiserCarriere(e, n, g), false, false)), compte.id);
      const ouverte = etatPublic.divisions.find(l => l.nombreClubs < 16);
      if (ouverte) {
        try {
          const etat = await appliquer(ouverte.id, compte.id, `adhesion-publique-${compte.id}`,
            (e, n, g) => agirCarriere(e, compte.id, { type: 'rejoindre', pseudo: compte.pseudo, clubNom, embleme }, n, g), true);
          return vueCarriere(etat, compte.id);
        } catch (erreur) {
          if (tentative === 4) throw erreur;
          continue;
        }
      }
      const division = Math.max(0, ...etatPublic.divisions.map(l => l.division)) + 1;
      const id = randomUUID();
      const code = `DR-PUBLIC-C${etatPublic.cycle}-D${division}`;
      const etat = creerDivisionPublique({ id, code, compteId: compte.id, pseudo: compte.pseudo, clubNom, embleme },
        etatPublic.cycle, division, maintenant, randomBytes(24).toString('hex'));
      if (await stockage.creerLigue({ id, code, etat, comptes: comptesEtat(etat), version: 0 })) return vueCarriere(etat, compte.id);
    }
    throw new ErreurHttp(409, 'Inscription en cours. Réessaie dans un instant.');
  }
  async function handler(req: RequeteCarriere, res: ReponseCarriere) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.method !== 'GET' && req.method !== 'POST') throw new ErreurHttp(405, 'Méthode non autorisée.');
      protegerOrigine(req);
      const url = new URL(req.url ?? '/api/carriere', 'http://localhost');
      if (url.searchParams.get('horloge') === '1') {
        const secret = process.env.CRON_SECRET;
        if (!secret || entete(req, 'authorization') !== `Bearer ${secret}`) throw new ErreurHttp(401, 'Connexion requise.');
        const resultat = await avancerLigues();
        return res.status(200).json({ liguesActualisees: resultat.actualisees, liguesSupprimees: resultat.supprimees });
      }
      if (url.searchParams.get('configuration') === '1') {
        return res.status(200).json({ googleClientId: googleClientId || undefined });
      }
      if (req.method === 'GET' && url.searchParams.get('catalogueSolo') === '1') {
        const config = catalogueAdmin();
        const connue = Number(url.searchParams.get('revision'));
        // Le gros catalogue de base est déjà dans le jeu. Seules les éditions
        // de joueurs de la base en ligne traversent le réseau.
        return res.status(200).json(connue === config.revision
          ? { revision: config.revision }
          : { revision: config.revision, joueurs: config.joueurs });
      }
      // ⚠️ Les écussons se demandent à part, PAS dans la vue de la ligue :
      // 1 353 entrées, soit 80 Ko qui repartiraient toutes les deux secondes
      // pendant un direct. La liste est publique et ne change jamais, donc
      // elle se met en cache côté navigateur.
      if (url.searchParams.get('emblemes') === '1') {
        const { emblemesCarriere, competitionsCarriere, tropheesCarriere } = await import('../src/lib/ligue/catalogueCarriere.js');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).json({ groupes: emblemesCarriere(), competitions: competitionsCarriere(), trophees: tropheesCarriere() });
      }
      // ═══════════════════════════════════════════════════════════════════
      // LE RELAIS D'ÉCUSSONS
      // ═══════════════════════════════════════════════════════════════════
      // 599 écussons de Fédérale et de Régionale sont servis par l'API de la
      // FFR, qui renvoie `Access-Control-Allow-Origin: monclubhouse.ffr.fr` :
      // dessinés sur un canvas, ils le souillent, et on ne peut donc pas leur
      // enlever leur fond blanc. Relayés par NOTRE origine, ils redeviennent
      // détourables comme les 754 autres.
      //
      // ⚠️ CE N'EST PAS UN PROXY OUVERT, ET ÇA NE DOIT JAMAIS LE DEVENIR.
      // `emblemeValide` est une liste blanche fermée, construite depuis les
      // données du jeu : seule une URL qui y figure déjà est relayée. Sans ce
      // contrôle, n'importe qui ferait de notre serveur un relais anonyme vers
      // n'importe quelle adresse — y compris nos propres services internes.
      const ecusson = url.searchParams.get('ecusson');
      if (ecusson) {
        const { emblemeValide } = await import('../src/lib/ligue/catalogueCarriere.js');
        if (!emblemeValide(ecusson) || !ecusson.startsWith('https://')) {
          throw new ErreurHttp(404, 'Écusson inconnu.');
        }
        if (!res.envoyer) throw new ErreurHttp(501, 'Relais indisponible sur cet hôte.');
        // ⚠️ ET IL NE SUIT AUCUNE REDIRECTION. La liste blanche ne contrôle que
        // l'adresse DEMANDÉE : si l'un des serveurs autorisés répond un jour
        // « 302 vers http://169.254.169.254/… », c'est notre serveur qui va
        // chercher la page — et il le fait depuis l'intérieur, là où personne
        // d'autre n'a le droit d'aller. Une redirection est donc une erreur,
        // pas un détour : la liste blanche perd son sens dès qu'on la suit.
        const amont = await fetch(ecusson, { signal: AbortSignal.timeout(8000), redirect: 'manual' });
        if (amont.status >= 300 && amont.status < 400) throw new ErreurHttp(502, 'La source redirige : écusson refusé.');
        if (!amont.ok) throw new ErreurHttp(502, 'Écusson indisponible à la source.');
        const type = amont.headers.get('content-type') ?? '';
        if (!type.startsWith('image/')) throw new ErreurHttp(502, 'La source n’a pas renvoyé une image.');
        const octets = new Uint8Array(await amont.arrayBuffer());
        if (octets.byteLength > 3_000_000) throw new ErreurHttp(502, 'Écusson trop volumineux.');
        res.setHeader('Content-Type', type);
        // Une semaine : ces écussons ne changent jamais, et chaque relais est
        // un aller-retour vers un serveur qui n'est pas le nôtre.
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        res.status(200);
        return res.envoyer(octets);
      }

      const maintenant = Date.now();
      const corps = req.method === 'POST' ? objet(typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
      const tailleMax = corps.action === 'sauvegarderBoutique' ? 4_000_000 : corps.action === 'atelier' ? 120_000 : 24_000;
      if (JSON.stringify(corps).length > tailleMax) throw new ErreurHttp(413, 'Demande trop volumineuse.');
      const action = corps.action;
      if (action === 'google') {
        if (!google || !googleClientId) throw new ErreurHttp(503, 'La connexion Google attend sa configuration.');
        const credential = texte(corps.credential, 100, 5000, 'Jeton Google');
        const billet = await google.verifyIdToken({ idToken: credential, audience: googleClientId }).catch(() => null);
        const profil = billet?.getPayload();
        if (!profil?.sub || !profil.email || profil.email_verified !== true) throw new ErreurHttp(401, 'Le compte Google n’a pas pu être vérifié.');
        const courriel = profil.email.toLocaleLowerCase('fr');
        let compte = await stockage.compteParGoogle(profil.sub);
        if (!compte) {
          // Une adresse déjà utilisée rattache l'identité Google au compte
          // existant : elle a précisément été vérifiée par Google.
          const existant = await stockage.compteParIdentifiant(courriel);
          if (existant) {
            if (!await stockage.lierCompteGoogle(existant.id, profil.sub, courriel)) {
              compte = await stockage.compteParGoogle(profil.sub);
              if (!compte) throw new ErreurHttp(409, 'Cette adresse est déjà rattachée à un autre compte Google.');
            } else compte = { ...existant, fournisseur: 'google', sujetExterne: profil.sub, courriel };
          } else {
            const pseudoBrut = (profil.name || profil.given_name || courriel.split('@')[0]).trim().slice(0, 20);
            const pseudo = pseudoBrut.length >= 2 ? pseudoBrut : 'Manager';
            compte = { id: randomUUID(), identifiant: `google:${profil.sub}`, pseudo, fournisseur: 'google', sujetExterne: profil.sub, courriel };
            if (!await stockage.creerCompte(compte)) {
              compte = await stockage.compteParGoogle(profil.sub);
              if (!compte) throw new ErreurHttp(409, 'Ce compte Google est déjà utilisé.');
            }
          }
        }
        const jeton = randomBytes(32).toString('hex');
        await stockage.ouvrirSession(empreinteJeton(jeton), compte.id, maintenant + DUREE_SESSION);
        sessionsChaudes.set(empreinteJeton(jeton), { compte, jusqua: maintenant + 60_000 });
        cookie(req, res, jeton);
        return res.status(200).json({ compte: publicCompte(compte) });
      }
      if (action === 'inscription' || action === 'connexion') {
        const identifiant = texte(corps.identifiant, 3, 100, 'Identifiant').toLocaleLowerCase('fr');
        if (!/^[a-z0-9@._+-]+$/.test(identifiant)) throw new ErreurHttp(400, 'Utilisez un identifiant sans espaces ni accents.');
        // L'IP n'est jamais stockée en clair. La limite compte reste commune aux appareils.
        const ip = entete(req, 'x-forwarded-for').split(',')[0] || req.socket?.remoteAddress || 'local';
        const autorisations = await Promise.all([
          stockage.limiter(empreinteJeton(`connexion:${identifiant}`), 15, 15 * 60_000, maintenant),
          stockage.limiter(empreinteJeton(`adresse:${ip}`), 80, 15 * 60_000, maintenant),
        ]);
        if (autorisations.some(v => !v)) throw new ErreurHttp(429, 'Trop de tentatives. Patientez quelques minutes.');
        const mot = texte(corps.motDePasse, 10, 200, 'Mot de passe');
        if (action === 'inscription' && corps.confirmationMotDePasse !== mot) throw new ErreurHttp(400, 'Les deux mots de passe ne correspondent pas.');
        let compte = await stockage.compteParIdentifiant(identifiant);
        if (action === 'inscription') {
          if (compte) throw new ErreurHttp(409, 'Cet identifiant est déjà utilisé.');
          compte = { id: randomUUID(), identifiant, pseudo: texte(corps.pseudo, 2, 20, 'Pseudo'), empreinte: await hacherMotDePasse(mot) };
          if (!await stockage.creerCompte(compte)) throw new ErreurHttp(409, 'Cet identifiant est déjà utilisé.');
        } else {
          if (!compte) { await hacherMotDePasse(mot); throw new ErreurHttp(401, 'Identifiant ou mot de passe incorrect.'); }
          if (!compte.empreinte || !await verifierMotDePasse(mot, compte.empreinte)) throw new ErreurHttp(401, 'Identifiant ou mot de passe incorrect.');
        }
        const jeton = randomBytes(32).toString('hex');
        await stockage.ouvrirSession(empreinteJeton(jeton), compte.id, maintenant + DUREE_SESSION);
        sessionsChaudes.set(empreinteJeton(jeton), { compte, jusqua: maintenant + 60_000 });
        cookie(req, res, jeton);
        return res.status(200).json({ compte: publicCompte(compte) });
      }
      const jeton = lireJeton(req);
      const empreinteSession = jeton ? empreinteJeton(jeton) : '';
      const sessionChaude = empreinteSession ? sessionsChaudes.get(empreinteSession) : undefined;
      const compte = sessionChaude && sessionChaude.jusqua > maintenant ? sessionChaude.compte
        : empreinteSession ? await stockage.session(empreinteSession, maintenant) : null;
      if (compte && (!sessionChaude || sessionChaude.jusqua <= maintenant)) sessionsChaudes.set(empreinteSession, { compte, jusqua: maintenant + 60_000 });
      if (!compte) throw new ErreurHttp(401, 'Connectez-vous pour retrouver vos ligues.');
      if (['creerSalonAmical', 'rejoindreSalonAmical', 'syncSalonAmical', 'quitterSalonAmical'].includes(action)) {
        throw new ErreurHttp(410, 'Les matchs amicaux sont désactivés.');
      }
      // Un GET de sondage est une lecture sûre. Le limiter SQL écrivait une
      // ligne à chaque consultation et gonflait à lui seul le WAL / l'historique.
      if (req.method === 'POST' && !await stockage.limiter(`jeu:${compte.id}`, 240, 60_000, maintenant)) throw new ErreurHttp(429, 'Trop de demandes. Patientez quelques secondes.');
      if (url.searchParams.has('atelier') || action === 'atelier') {
        if (compte.identifiant !== 'kiri') throw new ErreurHttp(404, 'Page introuvable.');
        if (req.method === 'GET') return res.status(200).json(vueAtelier(url.searchParams.get('q') ?? ''));
        if (!stockage.atelier) throw new ErreurHttp(503, 'Atelier indisponible sur ce serveur.');
        return res.status(200).json(await enregistrerAtelier(stockage.atelier, corps));
      }
      if (action === 'deconnexion') {
        await stockage.fermerSession(empreinteSession); sessionsChaudes.delete(empreinteSession); cookie(req, res, '', true);
        return res.status(200).json({ ok: true });
      }
      if (action === 'paiementOvas') {
        try { return res.status(200).json(await creerPaiement(compte.id, corps.pack, corps.tentative, stockage)); }
        catch (e) {
          const diagnostic = diagnosticErreurStripe(e);
          if (diagnostic) {
            journalErreurStripe(e);
            throw new ErreurHttp(diagnostic.statut, diagnostic.message);
          }
          throw new ErreurHttp(400, e instanceof Error ? e.message : 'La création du paiement a échoué.');
        }
      }
      if (url.searchParams.has('paiementEtat')) {
        const boutique = await stockage.boutique(compte.id);
        return res.status(200).json({ achatsOvas: boutique?.achatsOvas ?? 0, credite: await stockage.achatCredite?.(url.searchParams.get('session') ?? '', compte.id) ?? false });
      }
      if (action === 'sauvegarderBoutique') {
        const boutique = validerEtatBoutiqueCompte(corps.boutique);
        if (!boutique) throw new ErreurHttp(400, 'Sauvegarde de boutique invalide.');
        const enregistree = await stockage.sauvegarderBoutique(compte.id, boutique);
        const visible = (coffre: typeof boutique) => ({
          ovas: coffre.ovas, achatsOvas: coffre.achatsOvas ?? 0, collectionSolo: coffre.collectionSolo,
          inventaire: [...coffre.inventaire].sort(), skinActif: coffre.skinActif,
          equipements: [...coffre.equipements].sort(), equipementActif: coffre.equipementActif,
          traitsDebloques: [...coffre.traitsDebloques].sort(),
        });
        // Un accusé minuscule remplace l'écho du coffre entier. Une fusion
        // serveur (trade ou achat intervenu entre-temps) renvoie encore l'état.
        return res.status(200).json({ boutique: corps.compact === true
          && isDeepStrictEqual(visible(enregistree), visible(boutique)) ? null : enregistree });
      }
      if (action === 'creerOffreSolo' || action === 'proposerOffreSolo' || action === 'accepterOffreSolo'
        || action === 'refuserOffreSolo' || action === 'annulerOffreSolo') {
        if (!stockage.echangesSolo) throw new ErreurHttp(503, 'Les échanges ne sont pas disponibles sur ce serveur.');
        const marche = stockage.echangesSolo;
        const id = action === 'creerOffreSolo' ? '' : texte(corps.offre, 36, 36, 'Offre');
        if (id && !idValide(id)) throw new ErreurHttp(400, 'Offre invalide.');
        try {
          if (action === 'creerOffreSolo') {
            const offertes = lotCartesSolo(corps.offertes, cartesEchangeables());
            const souhaitees = lotCartesSolo(corps.souhaitees, cartesEchangeables(), true);
            await marche.creer(randomUUID(), compte.id, compte.pseudo, offertes, souhaitees);
          } else if (action === 'proposerOffreSolo') {
            const cartes = lotCartesSolo(corps.cartes, cartesEchangeables());
            await marche.proposer(randomUUID(), id, compte.id, compte.pseudo, cartes);
          } else if (action === 'accepterOffreSolo') {
            const proposition = corps.proposition == null ? undefined : texte(corps.proposition, 36, 36, 'Proposition');
            if (proposition && !idValide(proposition)) throw new Error('Proposition invalide.');
            await marche.accepter(id, compte.id, proposition);
          } else if (action === 'refuserOffreSolo') {
            const proposition = texte(corps.proposition, 36, 36, 'Proposition');
            if (!idValide(proposition)) throw new Error('Proposition invalide.');
            await marche.refuser(id, compte.id, proposition);
          } else await marche.annuler(id, compte.id);
        } catch (erreur) {
          if (erreur instanceof ErreurHttp) throw erreur;
          if (erreur instanceof Error && ((erreur as { code?: string }).code === 'P0001' || !('code' in erreur)))
            throw new ErreurHttp(409, erreur.message);
          throw erreur;
        }
        return res.status(200).json({ ok: true, boutique: await stockage.boutique(compte.id) });
      }
      if (action === 'supprimerLigue') {
        const id = texte(corps.ligue, 36, 36, 'Ligue');
        if (!idValide(id) || !await stockage.supprimerLigue(id, compte.id)) throw new ErreurHttp(404, 'Ligue introuvable ou suppression non autorisée.');
        oublierLigue(id);
        return res.status(200).json({ ok: true });
      }
      if (action === 'creerSalonAmical') {
        const equipe = corps.equipe;
        if (!equipe || typeof equipe !== 'object' || !Array.isArray(equipe.joueurs) || equipe.joueurs.length !== 15) {
          throw new ErreurHttp(400, 'Un XV complet de 15 joueurs est requis.');
        }
        const code = `XV-${randomBytes(3).toString('hex').toUpperCase()}`;
        const salon: SalonAmicalServeur = {
          code,
          creeLe: maintenant,
          expireLe: maintenant + 2 * 3600_000,
          hote: {
            compteId: compte.id,
            pseudo: String(corps.pseudo || compte.pseudo || 'Manager'),
            equipe,
            dernierVu: maintenant,
          },
          statut: 'attente',
        };
        if (!await creerSalonPersistant(salon)) throw new ErreurHttp(409, 'Le code du salon est déjà utilisé. Réessaie.');
        return res.status(200).json({ ok: true, code, salon: {
          code, creeLe: salon.creeLe, statut: salon.statut,
          hote: { pseudo: salon.hote.pseudo, equipe: salon.hote.equipe, enLigne: true },
        }});
      }
      if (action === 'rejoindreSalonAmical') {
        const code = String(corps.code || '').trim().toUpperCase();
        const equipe = corps.equipe;
        if (!equipe || typeof equipe !== 'object' || !Array.isArray(equipe.joueurs) || equipe.joueurs.length !== 15) {
          throw new ErreurHttp(400, 'Un XV complet de 15 joueurs est requis.');
        }
        const salon = await modifierSalonPersistant(code, (courant) => {
          if (courant.expireLe < maintenant) throw new ErreurHttp(404, 'Salon amical introuvable ou expiré.');
          if (courant.hote.compteId === compte.id) throw new ErreurHttp(400, 'Tu es déjà l’hôte de ce salon.');
          if (courant.invite && courant.invite.compteId !== compte.id && maintenant - courant.invite.dernierVu < 15000) {
            throw new ErreurHttp(409, 'Ce salon a déjà un adversaire.');
          }
          courant.invite = {
            compteId: compte.id, pseudo: String(corps.pseudo || compte.pseudo || 'Ami'),
            equipe, dernierVu: maintenant,
          };
          courant.statut = 'pret';
        });
        if (!salon) throw new ErreurHttp(404, 'Salon amical introuvable ou expiré.');
        return res.status(200).json({ ok: true, code, salon: {
          code, creeLe: salon.creeLe, statut: salon.statut,
          hote: { pseudo: salon.hote.pseudo, equipe: salon.hote.equipe, enLigne: (maintenant - salon.hote.dernierVu) < 15000 },
          invite: { pseudo: salon.invite.pseudo, equipe: salon.invite.equipe, enLigne: true },
        }});
      }
      if (action === 'syncSalonAmical') {
        const code = String(corps.code || '').trim().toUpperCase();
        const role = corps.role === 'invite' ? 'invite' : 'hote';
        const input = corps.input && typeof corps.input === 'object' ? corps.input as Record<string, unknown> : undefined;
        if (input) {
          const evenements = Array.isArray(input.evenements) ? input.evenements : [];
          if (evenements.length > 16 || !Number.isFinite(input.dx) || !Number.isFinite(input.dy)
            || Math.abs(Number(input.dx)) > 1.1 || Math.abs(Number(input.dy)) > 1.1) {
            throw new ErreurHttp(400, 'Commandes de match invalides.');
          }
        }
        const etatMatch = corps.etatMatch && typeof corps.etatMatch === 'object' ? corps.etatMatch as Record<string, unknown> : undefined;
        if (etatMatch && (!Array.isArray(etatMatch.pions) || etatMatch.pions.length !== 30 || JSON.stringify(etatMatch).length > 64_000)) {
          throw new ErreurHttp(400, 'État de match invalide.');
        }
        const salon = await modifierSalonPersistant(code, (courant) => {
          if (role === 'hote' && courant.hote.compteId !== compte.id) throw new ErreurHttp(403, 'Tu n’es pas l’hôte de ce salon.');
          if (role === 'invite' && courant.invite?.compteId !== compte.id) throw new ErreurHttp(403, 'Tu n’es pas l’adversaire de ce salon.');
          if (role === 'hote') {
            courant.hote.dernierVu = maintenant;
            if (input) courant.hote.input = input;
            if (etatMatch !== undefined) courant.etatMatch = etatMatch;
            if (corps.statut === 'en_cours' || corps.statut === 'termine') courant.statut = corps.statut;
          } else if (courant.invite) {
            courant.invite.dernierVu = maintenant;
            if (input) courant.invite.input = input;
          }
          courant.expireLe = maintenant + 2 * 3600_000;
        });
        if (!salon) throw new ErreurHttp(404, 'Salon amical introuvable.');
        const invitePresent = !!salon.invite && (maintenant - salon.invite.dernierVu) < 15000;
        const hotePresent = (maintenant - salon.hote.dernierVu) < 15000;
        return res.status(200).json({
          ok: true,
          statut: salon.statut,
          inputAdverse: role === 'hote' ? salon.invite?.input : salon.hote.input,
          etatMatch: salon.etatMatch,
          invitePresent,
          hotePresent,
          equipeHote: salon.hote.equipe,
          equipeInvite: salon.invite?.equipe,
          tempsServeur: maintenant,
        });
      }
      if (action === 'quitterSalonAmical') {
        const code = String(corps.code || '').trim().toUpperCase();
        const salon = await lireSalonAmical(code);
        if (salon) {
          if (corps.role === 'hote' && salon.hote.compteId === compte.id) {
            salonsAmicaux.delete(code);
            await stockage.supprimerSalonAmical?.(code);
          }
          else if (corps.role === 'invite' && salon.invite?.compteId === compte.id) {
            await modifierSalonPersistant(code, (courant) => {
              courant.statut = 'attente'; courant.invite = undefined; courant.etatMatch = undefined;
            });
          } else throw new ErreurHttp(403, 'Tu ne fais pas partie de ce salon.');
        }
        return res.status(200).json({ ok: true });
      }
      if (url.searchParams.has('push') || action === 'push') {
        const configPush = configurationPush();
        const id = String(req.method === 'GET' ? url.searchParams.get('ligue') ?? '' : corps.ligue ?? '');
        const membre = idValide(id) ? await stockage.entete(id) : null;
        if (!membre?.comptes.includes(compte.id)) throw new ErreurHttp(404, 'Ligue introuvable.');
        if (req.method === 'GET') return res.status(200).json({ disponible: Boolean(configPush && stockage.push), clePublique: configPush?.publicKey });
        if (!stockage.push) throw new ErreurHttp(503, 'Le service de notifications attend son installation.');
        if (corps.operation === 'supprimer') {
          const endpoint = texte(corps.endpoint, 10, 2048, 'Abonnement');
          await stockage.push.supprimer(compte.id,idPush(endpoint),id);
          return res.status(200).json({ ok:true });
        }
        let abonnement;
        try { abonnement = validerAbonnement(corps.abonnement); } catch { throw new ErreurHttp(400,'Abonnement de notification invalide.'); }
        if (corps.operation === 'etat') {
          const actif = (await stockage.push.lister(id)).some(a => a.compte === compte.id && a.id === idPush(abonnement.endpoint));
          return res.status(200).json({ actif });
        }
        if (!configPush) throw new ErreurHttp(503, 'Les notifications attendent la configuration du serveur.');
        if (corps.operation === 'tester') {
          const actif = (await stockage.push.lister(id)).some(a => a.compte === compte.id && a.id === idPush(abonnement.endpoint));
          if (!actif) throw new ErreurHttp(403,'Active les notifications avant de les tester.');
          if (!await stockage.limiter(`push-test:${compte.id}`,3,60000,maintenant)) throw new ErreurHttp(429,'Patiente une minute avant un nouveau test.');
          await envoyerPush(abonnement,{title:'Destiny Rugby',body:'Les alertes de match arrivent ici, même lorsque le jeu est fermé.',tag:`test-${maintenant}`,url:`/?directLigue=${id}`});
        } else if (corps.operation === 'activer') {
          const existants = await stockage.push.lister(id);
          if (existants.filter(a => a.compte === compte.id).length >= 8 && !existants.some(a => a.id === idPush(abonnement.endpoint))) throw new ErreurHttp(400,'Huit appareils sont déjà abonnés à cette ligue.');
          await stockage.push.enregistrer({id:idPush(abonnement.endpoint),compte:compte.id,ligue:id,cree:maintenant,abonnement});
          const liguePush = await lireLigue(id);
          if (liguePush) await programmer?.(liguePush.etat);
        } else throw new ErreurHttp(400,'Action de notification inconnue.');
        return res.status(200).json({ok:true});
      }
      if (req.method === 'GET') {
        if (url.searchParams.has('echangesSolo')) {
          if (!stockage.echangesSolo) throw new ErreurHttp(503, 'Les échanges ne sont pas disponibles sur ce serveur.');
          const offset = Math.max(0, Math.min(10000, Number(url.searchParams.get('offset')) || 0));
          return res.status(200).json(await stockage.echangesSolo.lister(compte.id, offset));
        }
        if (url.searchParams.has('boutique')) {
          return res.status(200).json({ boutique: await stockage.boutique(compte.id) });
        }
        if (url.searchParams.has('administration')) {
          if (compte.identifiant !== 'kiri') throw new ErreurHttp(404, 'Page introuvable.');
          return res.status(200).json(await stockage.administration());
        }
        if (url.searchParams.get('statistiques') === 'globales') {
          if (compte.identifiant !== 'kiri') throw new ErreurHttp(404, 'Page introuvable.');
          return res.status(200).json(await stockage.statistiquesGlobales());
        }
        const id = url.searchParams.get('ligue');
        if (!id) {
          const publicCourant = await assurerDivisionsPubliques(maintenant);
          const ligues = (await assurerLaboratoireKiri(compte, maintenant))
            .filter(l => !l.publique || l.publique.cycle === publicCourant.cycle);
          // ⚠️ LE RÉSUMÉ ARRIVE DÉJÀ TAILLÉ. `stockage.ligues` rendait l'état
          // complet de chaque ligue pour qu'on en extraie ces sept champs ici :
          // 400 Ko traversaient le réseau par ligue et par ouverture d'écran.
          // C'est Postgres qui les extrait maintenant.
          return res.status(200).json({ compte: publicCompte(compte), ligues: ligues.map(l => ({
            id: l.id, nom: l.nom, etat: l.phase, clubNom: l.clubNom, ovas: l.ovas,
            clubEmbleme: l.clubEmbleme, logo: l.logo, laboratoire: l.laboratoire,
            createur: l.createurId === compte.id && !l.publique, publique: l.publique,
          })) });
        }
        if (!idValide(id)) throw new ErreurHttp(404, 'Ligue introuvable.');
        if (url.searchParams.get('collection') === '1') {
          const ligne = await lireLigue(id);
          if (!ligne || !ligne.comptes.includes(compte.id)) throw new ErreurHttp(404, 'Ligue introuvable.');
          const { collectionCarriere } = await import('../src/lib/ligue/collectionCarriere.js');
          return res.status(200).json(collectionCarriere(ligne.etat, compte.id, url.searchParams));
        }

        /**
         * ⚠️ LE SONDAGE QUI NE LIT RIEN. C'est ici que se joue l'essentiel du
         * transfert : l'écran redemande la ligue toutes les dix secondes, et
         * neuf fois sur dix rien n'a bougé. On lisait quand même les 300 à
         * 400 Ko de l'état pour s'en apercevoir.
         *
         * Le client annonce la version qu'il détient (`&v=`). Deux octets de
         * plus dans l'URL suffisent à répondre par un 304 : version identique
         * ET aucune échéance passée, donc rien n'a pu changer ni de la main
         * d'un manager (la version aurait bougé) ni toute seule (l'échéance
         * serait derrière nous).
         *
         * ⚠️ SANS `v`, ON RÉPOND COMME AVANT. Un client d'une version
         * antérieure, un onglet resté ouvert, un appel à la main : tous
         * continuent de recevoir la vue complète. L'optimisation ne peut pas
         * casser ce qui ne la connaît pas.
         */
        const connue = Number(url.searchParams.get('v'));
        let enteteConnue: { version: number; comptes: string[]; echeance: number | null } | undefined;
        const accesObservateurKiri = compte.identifiant === 'kiri';
        if (Number.isInteger(connue) && connue > 0) {
          // Kiri peut observer une ligue sans en devenir membre. Le sondage SQL
          // normal confond volontairement « non-membre » et « ligue absente » ;
          // l'administrateur passe donc par l'en-tête, toujours sans charger le
          // gros état JSON.
          const sondage = !accesObservateurKiri && stockage.verifierSondage
            ? await stockage.verifierSondage(id, compte.id, connue, catalogueAdmin().revision, maintenant)
            : undefined;
          if (sondage?.statut === 'absente') throw new ErreurHttp(404, 'Ligue introuvable.');
          if (sondage?.statut === 'inchange') return res.status(200).json({ inchange: true });
          const entete = sondage?.statut === 'lire' ? sondage.entete : await stockage.entete(id);
          enteteConnue = entete ?? undefined;
          if (!entete || (!accesObservateurKiri && !entete.comptes.includes(compte.id))) throw new ErreurHttp(404, 'Ligue introuvable.');
          /**
           * ⚠️ UN CORPS MINUSCULE PLUTÔT QU'UN VRAI 304. La réponse HTTP 304
           * serait la forme juste, mais elle exige un corps VIDE — donc un
           * `end()` que `ReponseCarriere` n'expose pas : le contrat volontaire
           * de ce module est de ne rien supposer de son hôte, pour tourner
           * derrière Vercel comme derrière le serveur de développement de Vite.
           * L'ajouter pour l'occasion, c'était le premier écart. Vingt octets
           * contre quatre cent mille, le gain est le même.
           */
          if ((entete.catalogueRevision ?? liguesChaudes.get(id)?.etat.catalogueRevision ?? 0) === catalogueAdmin().revision && entete.version === connue && entete.echeance !== null && maintenant < entete.echeance) {
            return res.status(200).json({ inchange: true });
          }
        }
        const direct = url.searchParams.get('direct');
        if (direct && (direct.length > 250 || /[\p{Cc}]/u.test(direct))) throw new ErreurHttp(400, 'Match invalide.');
        if (direct) {
          // Le calcul partagé utilise l'identité « horloge ». L'autorisation du
          // spectateur est donc vérifiée AVANT, sur l'en-tête minuscule.
          const autorisation = enteteConnue ?? await stockage.entete(id);
          if (!autorisation || (!accesObservateurKiri && !autorisation.comptes.includes(compte.id))) throw new ErreurHttp(404, 'Ligue introuvable.');
          const observateur = accesObservateurKiri && !autorisation.comptes.includes(compte.id);
          const e = await actualiserDirect(id, direct, maintenant, autorisation);
          const rencontre = observateur
            ? vueRencontreCarriereObservateur(e, direct)
            : vueRencontreCarriere(e, compte.id, direct);
          if (!rencontre) throw new ErreurHttp(404, 'Match introuvable.');
          return res.status(200).json({ id: e.id, version: e.version, rencontre });
        }
        const autorisationKiri = accesObservateurKiri ? enteteConnue ?? await stockage.entete(id) : undefined;
        if (accesObservateurKiri && !autorisationKiri) throw new ErreurHttp(404, 'Ligue introuvable.');
        const observateur = Boolean(autorisationKiri && !autorisationKiri.comptes.includes(compte.id));
        const e = await appliquer(id, observateur ? 'horloge' : compte.id, `lecture-${Math.floor(maintenant / 2000)}-catalogue-${catalogueAdmin().revision}`, (e, n, g) => actualiserCarriere(e, n, g), false, false, enteteConnue ?? autorisationKiri);
        return res.status(200).json(observateur ? vueCarriereObservateur(e) : vueCarriere(e, compte.id));
      }
      if (action === 'creer') {
        // ⚠️ COMPTER, C'EST COMPTER. Ce plafond lisait la liste entière — donc,
        // avant, l'état complet de vingt ligues — pour en prendre la longueur.
        if (await stockage.nombreLigues(compte.id) >= 20) throw new ErreurHttp(400, 'Vous participez déjà à 20 ligues.');
        if (!Number.isInteger(corps.rythme) || Number(corps.rythme) < 1 || Number(corps.rythme) > 7) throw new ErreurHttp(400, 'Choisissez entre 1 et 7 matchs par semaine.');
        if (!Number.isInteger(corps.maxClubs) || Number(corps.maxClubs) < 2 || Number(corps.maxClubs) > 64) throw new ErreurHttp(400, 'Une ligue accueille de 2 à 64 clubs.');
        for (let essai = 0; essai < 3; essai++) {
          const id = randomUUID();
          const code = `DR-${randomBytes(5).toString('hex').toUpperCase()}`;
          const e = creerCarriere({ id, code, compteId: compte.id, pseudo: compte.pseudo,
            nom: texte(corps.nom, 3, 40, 'Nom de ligue'), clubNom: texte(corps.clubNom, 3, 40, 'Nom du club'),
            rythme: Number(corps.rythme), maxClubs: Number(corps.maxClubs),
            embleme: typeof corps.embleme === 'string' ? corps.embleme : undefined,
            logo: typeof corps.logo === 'string' ? corps.logo : undefined, tropheeId: typeof corps.tropheeId === 'string' ? corps.tropheeId : undefined, playoffs: corps.playoffs === true,
            dotationOvas: typeof corps.dotationOvas === 'number' ? corps.dotationOvas : undefined,
            packsActifs: Array.isArray(corps.packsActifs) ? corps.packsActifs : undefined,
            packsGratuitsParJour: typeof corps.packsGratuitsParJour === 'number' ? corps.packsGratuitsParJour : undefined,
            doublonsAutorises: corps.doublonsAutorises === true,
          }, maintenant, randomBytes(24).toString('hex'));
          if (await stockage.creerLigue({ id, code, etat: e, comptes: comptesEtat(e), version: 0 })) return res.status(201).json(vueCarriere(e, compte.id));
        }
        throw new ErreurHttp(409, 'Création en cours. Réessayez.');
      }
      if (action === 'rejoindre') {
        const code = texte(corps.code, 5, 30, 'Code').toUpperCase();
        if (code.startsWith('DR-PUBLIC-')) return res.status(200).json(await rejoindreDivisionPublique(compte,
          texte(corps.clubNom, 3, 40, 'Nom du club'), typeof corps.embleme === 'string' ? corps.embleme : undefined, maintenant));
        const ligne = await stockage.ligueParCode(code);
        if (!ligne) throw new ErreurHttp(404, 'Code de ligue introuvable.');
        // ⚠️ UN LIEN D'INVITATION SE CLIQUE DEUX FOIS. On le range dans une
        // boucle de messages, on y revient le lendemain, on le rouvre depuis
        // l'historique du navigateur. La deuxième fois, la règle d'adhésion
        // répondait « Ce compte possède déjà un club dans cette ligue » — une
        // erreur, pour quelqu'un qui voulait simplement entrer chez lui.
        // Membre déjà inscrit : on ouvre la ligue, c'est tout ce qu'il demande.
        if (ligne.comptes.includes(compte.id)) {
          const e = await appliquer(ligne.id, compte.id, `lecture-${Math.floor(maintenant / 2000)}-catalogue-${catalogueAdmin().revision}`, (e, n, g) => actualiserCarriere(e, n, g));
          return res.status(200).json(vueCarriere(e, compte.id));
        }
        const e = await appliquer(ligne.id, compte.id, `adhesion-${compte.id}`, (e, n, g) => agirCarriere(e, compte.id,
          { type: 'rejoindre', pseudo: compte.pseudo, clubNom: texte(corps.clubNom, 3, 40, 'Nom du club'), embleme: corps.embleme as string | undefined }, n, g), true);
        return res.status(200).json(vueCarriere(e, compte.id));
      }
      if (action === 'rejoindreDivisionPublique') {
        return res.status(200).json(await rejoindreDivisionPublique(compte,
          texte(corps.clubNom, 3, 40, 'Nom du club'), typeof corps.embleme === 'string' ? corps.embleme : undefined, maintenant));
      }
      if (action === 'commande') {
        const id = texte(corps.ligue, 36, 36, 'Ligue');
        if (!idValide(id)) throw new ErreurHttp(404, 'Ligue introuvable.');
        const requete = texte(corps.requeteId, 16, 100, 'Requête');
        const commande = objet(corps.commande);
        if (commande.type === 'rejoindre') throw new ErreurHttp(400, 'Utilisez le code pour rejoindre la ligue.');
        if (typeof commande.type === 'string' && commande.type.startsWith('laboratoire') && compte.identifiant !== 'kiri') {
          throw new ErreurHttp(404, 'Commande introuvable.');
        }
        // Les anciennes PWA peuvent conserver plusieurs jours l'ancien client,
        // qui envoyait encore la présence comme une commande. On l'allège aussi
        // côté serveur pour qu'elles ne recommencent pas à réécrire le JSONB.
        if (commande.type === 'match') {
          const actionMatch = objet(commande.action);
          if (actionMatch.type === 'presence') {
            const matchId = texte(commande.matchId, 1, 100, 'Match');
            const ligne = await lireLigue(id);
            const club = ligne?.etat.clubs.find(c => c.compteId === compte.id);
            const rencontre = ligne?.etat.rencontres.find(r => r.id === matchId && r.match && !r.match.termine);
            if (!ligne || !ligne.comptes.includes(compte.id) || !club || !rencontre
              || (rencontre.domicile !== club.id && rencontre.exterieur !== club.id)) {
              throw new ErreurHttp(400, 'Ce direct n’est pas disponible.');
            }
            if (await stockage.marquerPresence(id, matchId, compte.id, maintenant)) {
              return res.status(200).json(vueCarriere(ligne.etat, compte.id));
            }
          }
        }
        const e = await appliquer(id, compte.id, requete, (e, n, g) => agirCarriere(e, compte.id, commande as unknown as CommandeCarriere, n, g));
        return res.status(200).json(vueCarriere(e, compte.id));
      }
      if (action === 'presence') {
        const id = texte(corps.ligue, 36, 36, 'Ligue');
        if (!idValide(id)) throw new ErreurHttp(404, 'Ligue introuvable.');
        const matchId = texte(corps.matchId, 1, 100, 'Match');
        const ligne = await lireLigue(id);
        if (!ligne || !ligne.comptes.includes(compte.id)) throw new ErreurHttp(404, 'Ligue introuvable.');
        const club = ligne.etat.clubs.find(c => c.compteId === compte.id);
        const rencontre = ligne.etat.rencontres.find(r => r.id === matchId && r.match && !r.match.termine);
        if (!club || !rencontre || (rencontre.domicile !== club.id && rencontre.exterieur !== club.id)) {
          throw new ErreurHttp(400, 'Ce direct n’est pas disponible.');
        }
        if (await stockage.marquerPresence(id, matchId, compte.id, maintenant)) return res.status(200).json({ ok: true });
        // Pendant une migration sans la table dédiée, le fonctionnement ancien
        // reste disponible afin de ne jamais casser un direct en cours.
        await appliquer(id, compte.id, `presence-${Math.floor(maintenant / 10_000)}`,
          (e, n, g) => agirCarriere(e, compte.id, { type: 'match', matchId, action: { type: 'presence' } }, n, g));
        return res.status(200).json({ ok: true });
      }
      throw new ErreurHttp(400, 'Action inconnue.');
    } catch (erreur) {
      if (erreur instanceof ErreurHttp) return res.status(erreur.statut).json({ erreur: erreur.message });
      // Les erreurs de règles sont lisibles ; ne jamais exposer une erreur SQL ou une pile.
      if (erreur instanceof Error && erreur.name === 'ErreurCarriere') return res.status(400).json({ erreur: erreur.message });
      if (erreur instanceof SyntaxError || erreur instanceof TypeError) return res.status(400).json({ erreur: 'Demande invalide.' });
      // ⚠️ UNE BASE NON INITIALISÉE N'EST PAS UN SECRET, C'EST UN ÉTAT DE
      // DÉPLOIEMENT — et le taire coûte cher. Tant que les schémas SQL n'ont
      // pas été passés, TOUTE requête échouait sur un « réessayez dans un
      // instant » qui invitait justement à ne rien faire, alors qu'il manquait
      // une action précise. Postgres nomme ces deux cas : 42P01 (table
      // absente) et 42703 (colonne absente, typiquement `schema-carriere.sql`
      // passé sans `schema-ligues.sql`). On les distingue, sans jamais rendre
      // la requête ni la pile.
      const code = (erreur as { code?: string })?.code;
      if (code === '42P01' || code === '42703') {
        return res.status(503).json({
          erreur: 'La base de la Carrière en ligne n’est pas encore initialisée. '
            + 'Il reste à exécuter serveur/schema-ligues.sql puis serveur/schema-carriere.sql '
            + '(dans cet ordre) — voir serveur/MISE-EN-LIGNE.md.',
        });
      }
      return res.status(503).json({ erreur: 'Le serveur de carrière est indisponible. Réessayez dans un instant.' });
    }
  }
  return { handler: async (req: RequeteCarriere, res: ReponseCarriere) => {
    try { return await avecAtelier(() => handler(req,res)); }
    catch { return res.status(503).json({erreur:'Le catalogue est momentanément indisponible. Réessaie dans un instant.'}); }
  }, avancerLigues: () => avecAtelier(avancerLigues), actualiserLigue: (id: string) => avecAtelier(async () => {
    if (!await stockage.entete(id)) return;
    return appliquer(id, 'horloge', `queue-${randomUUID()}`, (e,n,g) => actualiserCarriere(e,n,g), false, false);
  }) };
}
