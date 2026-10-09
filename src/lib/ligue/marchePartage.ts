// LE MARCHÉ COMMUN DES DIVISIONS PUBLIQUES (Correctif 24, points 13 à 15)
//
// Demande : « Toutes les divisions appartenant au même ensemble principal doivent partager le même marché. […] Une annonce
// ne doit jamais être dupliquée parce qu'elle apparaît dans plusieurs divisions. […] Si deux personnes essayent d'acheter
// le même joueur au même moment : une seule transaction doit réussir. Pas de duplication de carte. »
//
// ═══ LE PROBLÈME ════════════════════════════════════════════════════════════
//
// Chaque division publique est UNE ligue : une ligne de base, son état, sa version. Ses ventes vivaient dans cet état —
// la division 3 ne voyait donc jamais les annonces de la division 1, et aucune écriture ne pouvait toucher deux ligues
// d'un coup. Recopier les annonces dans chaque division aurait donné seize copies à tenir d'accord, et deux acheteurs de
// deux divisions auraient pu « gagner » chacun dans la sienne.
//
// ═══ LA RÉPONSE : UN SEUL DOCUMENT, QUI ARBITRE ══════════════════════════════
//
// Les annonces de toutes les divisions d'un même cycle vivent dans UN document (`EtatMarchePartage`), écrit par
// comparaison de version : deux écritures concurrentes ne peuvent pas passer toutes les deux. C'est lui qui tranche :
//
//   · une annonce y existe une fois, visible de toutes les divisions ;
//   · un achat est d'abord une RÉCLAMATION dans ce document (`reclamerAnnonce`) — le premier qui l'écrit a la carte,
//     le second lit une annonce déjà prise et se fait rembourser ;
//   · ce que les ligues doivent ensuite faire (livrer la carte à l'acheteur, la retirer au vendeur et le payer,
//     rendre ses Ovas à un enchérisseur dépassé, déverrouiller une carte retirée de la vente) est NOTÉ dans le document
//     tant que ce n'est pas fait. Un serveur qui s'arrête au milieu ne perd rien : le suivant reprend la liste.
//
// La carte, elle, ne quitte l'effectif du vendeur qu'à la vente : en vente, elle reste chez lui, verrouillée, comme avant.
//
// ⚠️ CE FICHIER TOURNE DES DEUX CÔTÉS et ne contient que des règles : ni base, ni horloge implicite, ni texte d'écran
// autre que les refus. Le déroulé (qui écrit quoi, dans quel ordre) est dans `serveur/marcheCommun.ts`.
import type { CarteCarriere, VenteCarriere } from './typesCarriere.js';
import { carteSeniorAutorisee } from './eligibiliteJoueurs.js';

export class ErreurMarche extends Error {}
function exiger(condition: unknown, message: string): asserts condition { if (!condition) throw new ErreurMarche(message); }

/** Un club, vu du marché commun : sa ligue le situe, son nom l'affiche. */
export interface PartieMarche { ligueId: string; clubId: string; pseudo: string; nom: string; division: number }

export interface AnnoncePartagee {
  /** L'identifiant de la vente dans la ligue du vendeur : il contient déjà celui de la ligue, donc unique partout. */
  id: string;
  vendeur: PartieMarche;
  /** La carte telle qu'elle était à la mise en vente (sans verrou ni favori) : ce que voient les autres divisions. */
  carte: CarteCarriere;
  type: 'directe' | 'enchere';
  prix: number;
  publieLe: string;
  expireLe: string;
  /** `reclamee` : vendue, il reste à livrer et à solder dans les deux ligues. */
  etat: 'ouverte' | 'reclamee';
  enchere?: PartieMarche & { montant: number };
  acheteur?: PartieMarche & { montant: number; le: string; solde?: true; livre?: true };
}
/** Des Ovas réservés à rendre : un enchérisseur dépassé. */
export interface RemboursementMarche { ligueId: string; clubId: string; ref: string }
/** Une annonce sortie du marché sans vente : la carte est à déverrouiller chez le vendeur. */
export interface ClotureMarche { ligueId: string; venteId: string; issue: 'annulee' | 'expiree' }

export interface EtatMarchePartage {
  cycle: number;
  annonces: AnnoncePartagee[];
  remboursements: RemboursementMarche[];
  clotures: ClotureMarche[];
}

export const marcheVide = (cycle: number): EtatMarchePartage => ({ cycle, annonces: [], remboursements: [], clotures: [] });
/** L'identifiant du document d'un cycle. */
export const idMarchePublic = (cycle: number) => `public:${cycle}`;
/** La référence d'une réserve d'Ovas : une annonce ET un montant (surenchérir sur soi-même en fait une seconde). */
export const refReserve = (annonceId: string, montant: number) => `${annonceId}@${montant}`;
/** La ligue d'une vente, lue dans son identifiant (`<ligue>:vente:<n>`). */
export const ligueDeLaVente = (venteId: string) => venteId.slice(0, venteId.indexOf(':vente:'));
/** Une vente du marché commun porte l'identifiant d'une ligue. */
export const estIdDeVente = (id: unknown): id is string => typeof id === 'string' && id.length <= 250 && /^[0-9a-f-]{36}:vente:\d+$/.test(id);

/** Surenchère minimale : 5 % de plus, 25 Ovas au moins — la règle des enchères d'une ligue. */
export const enchereMinimale = (a: Pick<AnnoncePartagee, 'prix' | 'enchere'>) =>
  a.enchere ? a.enchere.montant + Math.max(25, Math.ceil(a.enchere.montant * 0.05)) : a.prix;

const trouver = (m: EtatMarchePartage, id: string) => m.annonces.find((a) => a.id === id);
const memeClub = (a: Pick<PartieMarche, 'ligueId' | 'clubId'>, b: Pick<PartieMarche, 'ligueId' | 'clubId'>) => a.ligueId === b.ligueId && a.clubId === b.clubId;

/** Publie une annonce. Rejouée (reprise après une coupure), elle ne s'ajoute pas deux fois. */
export function publierAnnonce(m: EtatMarchePartage, annonce: AnnoncePartagee): boolean {
  exiger(carteSeniorAutorisee(annonce.carte, 'mixed'), 'Cette carte est indisponible.');
  if (trouver(m, annonce.id)) return false;
  const { verrou: _verrou, favori: _favori, ...carte } = annonce.carte;
  m.annonces.push({ ...annonce, carte: carte as CarteCarriere, etat: 'ouverte' });
  return true;
}

/**
 * ⚠️ LE POINT ATOMIQUE DE L'ACHAT. L'annonce passe d'« ouverte » à « réclamée » au nom d'UN acheteur ; le document est
 * écrit par comparaison de version, donc de deux réclamations simultanées une seule est enregistrée — l'autre relit une
 * annonce déjà prise et lève ce refus.
 */
export function reclamerAnnonce(m: EtatMarchePartage, id: string, acheteur: PartieMarche, maintenant: number): AnnoncePartagee {
  const a = trouver(m, id);
  exiger(a && a.etat === 'ouverte' && a.type === 'directe' && Date.parse(a.expireLe) > maintenant, 'Cette vente n’est plus disponible.');
  exiger(carteSeniorAutorisee(a.carte, 'mixed'), 'Cette carte est indisponible.');
  exiger(!memeClub(a.vendeur, acheteur), 'Vous ne pouvez pas acheter votre propre carte.');
  a.etat = 'reclamee';
  a.acheteur = { ...acheteur, montant: a.prix, le: new Date(maintenant).toISOString() };
  return a;
}

/** Une enchère. L'enchérisseur dépassé passe dans la file des remboursements. */
export function placerEnchere(m: EtatMarchePartage, id: string, encherisseur: PartieMarche, montant: number, maintenant: number): AnnoncePartagee {
  const a = trouver(m, id);
  exiger(a && a.etat === 'ouverte' && a.type === 'enchere' && Date.parse(a.expireLe) > maintenant, 'Cette enchère est fermée.');
  exiger(carteSeniorAutorisee(a.carte, 'mixed'), 'Cette carte est indisponible.');
  exiger(!memeClub(a.vendeur, encherisseur), 'Vous ne pouvez pas enchérir sur votre carte.');
  exiger(Number.isSafeInteger(montant) && montant >= enchereMinimale(a), 'Votre offre doit dépasser la meilleure enchère d’au moins 5 % (minimum 25 Ovas).');
  if (a.enchere) m.remboursements.push({ ligueId: a.enchere.ligueId, clubId: a.enchere.clubId, ref: refReserve(a.id, a.enchere.montant) });
  a.enchere = { ...encherisseur, montant };
  return a;
}

/** Le vendeur retire son annonce : seulement tant qu'elle est ouverte et sans enchère. */
export function annulerAnnonce(m: EtatMarchePartage, id: string, vendeur: Pick<PartieMarche, 'ligueId' | 'clubId'>): void {
  const a = trouver(m, id);
  exiger(a && a.etat === 'ouverte' && !a.enchere && memeClub(a.vendeur, vendeur), 'Cette vente ne peut pas être annulée.');
  m.annonces = m.annonces.filter((x) => x !== a);
  m.clotures.push({ ligueId: a.vendeur.ligueId, venteId: a.id, issue: 'annulee' });
}

/**
 * Les échéances : une enchère arrivée à terme devient une vente réclamée par le meilleur enchérisseur ; une annonce sans
 * preneur sort du marché. Rend vrai si quelque chose a changé.
 */
export function echeancesMarche(m: EtatMarchePartage, maintenant: number): boolean {
  let change = false;
  for (const a of [...m.annonces]) {
    if(!carteSeniorAutorisee(a.carte, 'mixed')){
      // Une vente partiellement soldée exige la lecture des deux ligues : la
      // rembourser ici pourrait payer le vendeur ET rendre l'argent à l'acheteur.
      if(a.etat==='reclamee')continue;
      change=true;
      if(a.enchere)m.remboursements.push({ligueId:a.enchere.ligueId,clubId:a.enchere.clubId,ref:refReserve(a.id,a.enchere.montant)});
      if(a.acheteur&&!a.acheteur.livre)m.remboursements.push({ligueId:a.acheteur.ligueId,clubId:a.acheteur.clubId,ref:refReserve(a.id,a.acheteur.montant)});
      m.annonces=m.annonces.filter(x=>x!==a);m.clotures.push({ligueId:a.vendeur.ligueId,venteId:a.id,issue:'annulee'});continue;
    }
    if (a.etat !== 'ouverte' || Date.parse(a.expireLe) > maintenant) continue;
    change = true;
    if (a.enchere) {
      a.etat = 'reclamee';
      a.acheteur = { ...a.enchere, le: new Date(maintenant).toISOString() };
    } else {
      m.annonces = m.annonces.filter((x) => x !== a);
      m.clotures.push({ ligueId: a.vendeur.ligueId, venteId: a.id, issue: 'expiree' });
    }
  }
  return change;
}

/** Une étape faite dans une ligue. L'annonce quitte le document quand la carte est livrée ET le vendeur payé. */
export function noterEtape(m: EtatMarchePartage, id: string, etape: 'solde' | 'livre', carte?: CarteCarriere): void {
  const a = trouver(m, id);
  if (!a?.acheteur) return;
  a.acheteur[etape] = true;
  if (carte) { const { verrou: _verrou, favori: _favori, ...reste } = carte; a.carte = reste as CarteCarriere; }
  if (a.acheteur.solde && a.acheteur.livre) m.annonces = m.annonces.filter((x) => x !== a);
}

/** Y a-t-il des suites à donner dans les ligues ? */
export function travailEnAttente(m: EtatMarchePartage, maintenant: number): boolean {
  return m.remboursements.length > 0 || m.clotures.length > 0
    || m.annonces.some((a) => !carteSeniorAutorisee(a.carte, 'mixed') || a.etat === 'reclamee' || Date.parse(a.expireLe) <= maintenant);
}

/** Ce que le document garde d'une réserve : sert à décider si une réserve restée dans une ligue est encore justifiée. */
export function reserveJustifiee(m: EtatMarchePartage, ligueId: string, clubId: string, ref: string): boolean {
  const annonceId = ref.slice(0, ref.lastIndexOf('@'));
  const montant = Number(ref.slice(ref.lastIndexOf('@') + 1));
  const a = trouver(m, annonceId);
  if (!a) return false;
  const partie = a.etat === 'reclamee' ? a.acheteur : a.enchere;
  return Boolean(partie && partie.ligueId === ligueId && partie.clubId === clubId && partie.montant === montant && !(a.acheteur?.livre));
}

/** Le préfixe d'un club d'une autre division dans la vue : il ne peut pas se confondre avec un club de la ligue. */
export const idClubExterne = (p: Pick<PartieMarche, 'ligueId' | 'clubId'>) => `ext:${p.ligueId}:${p.clubId}`;

export interface VueMarchePartage {
  version: number;
  /** Les annonces ouvertes, dans la forme des ventes d'une ligue : l'écran du marché les lit sans les distinguer. */
  ventes: VenteCarriere[];
  /** Les cartes des annonces des AUTRES divisions (celles de la mienne sont déjà dans la vue de ma ligue). */
  cartes: CarteCarriere[];
  /** Le nom à afficher pour un club d'une autre division. */
  clubs: Record<string, string>;
}

/**
 * Le marché vu d'une ligue. Les clubs de MA division gardent leur identifiant (l'écran sait ainsi reconnaître mes
 * annonces et mes enchères) ; ceux des autres portent `ext:…` et leur nom suit dans `clubs`.
 */
export function vueMarchePartage(m: EtatMarchePartage, version: number, ligueId: string, maintenant: number): VueMarchePartage {
  const clubs: Record<string, string> = {};
  const idDe = (p: PartieMarche) => {
    if (p.ligueId === ligueId) return p.clubId;
    const id = idClubExterne(p);
    clubs[id] = `${p.nom} · D${p.division}`;
    return id;
  };
  const ventes: VenteCarriere[] = [], cartes: CarteCarriere[] = [];
  for (const a of m.annonces) {
    if(!carteSeniorAutorisee(a.carte, 'mixed'))continue;
    if (a.etat !== 'ouverte' || Date.parse(a.expireLe) <= maintenant) continue;
    const vendeurId = idDe(a.vendeur);
    ventes.push({ id: a.id, carteId: a.carte.id, vendeurId, type: a.type, prix: a.prix, expireLe: a.expireLe, etat: 'ouverte', partagee: true,
      ...(a.enchere ? { enchere: { clubId: idDe(a.enchere), montant: a.enchere.montant } } : {}) });
    if (a.vendeur.ligueId !== ligueId) cartes.push({ ...a.carte, proprietaire: vendeurId, verrou: a.id });
  }
  return { version, ventes, cartes, clubs };
}
