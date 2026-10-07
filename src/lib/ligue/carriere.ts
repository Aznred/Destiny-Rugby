import { catalogueAdmin } from './atelierCatalogue.js';
import { BAREME_CLUBS, pointsDuMatch } from '../bareme.js';
import { statistiquesCarte } from './statistiquesCarte.js';
import { rareteCarriere } from './catalogueCarriere.js';
import { echelleFfrDuClub } from '../echelleNotesFfr.js';
/** Règles exécutées exclusivement par le serveur ; chaque commande travaille sur une copie. */
import { POSTE_PAR_ID } from '../../data/rugby.js';
import type { CompositionManager } from '../../types.js';
import { compositionManagerParDefaut, EFFECTIF_MINIMUM, POSTES_BANC_MANAGER, POSTES_XV_MANAGER, reconcilerCompositionManager } from '../compositionManager.js';
import { affichesToutesRondes } from './calendrier.js';
import { horairesChampionnat } from './horaires.js';
import { graine as hasard, tirerPondere } from './aleatoire.js';
import { packsCatalogueAdmin, bandesGaranties, carteDepuisSource, catalogueMondialCarriere, coequipierDepuisCarte, dotationBronzeCarriere, emblemeValide, logoCompetitionValide, nomTrophee, PACKS_CARRIERE, RARETES_CARRIERE, rayonDePack, tirerDuRayon, tropheeValide, vivierRestant } from './catalogueCarriere.js';
import { actualiserCahierMatchEnLigne, avancerMatchEnLigne, commanderMatchEnLigne, conclureMatchEnLigne, creerMatchEnLigne, DUREE_REELLE, forceFeuille, MARGE_AUTORITE, STRATEGIE_EN_LIGNE_DEFAUT, strategieValide, vueMatchEnLigne } from './matchCarriere.js';
import type { RepereChrono } from './filmDirect.js';
import type { CarteCarriere, ClubCarriere, CommandeCarriere, CompetitionCarriere, CreationCarriere, EtatCarriereEnLigne, LigneClassementCarriere, ObjectifCarriere, PackCarriere, RencontreCarriere, TransactionCarriere, VueCarriereEnLigne } from './typesCarriere.js';
import { LOT_VENTE_RAPIDE_MAX, valeurVenteRapide } from './venteRapideCarriere.js';
import { bonusCollectif, collectifCarriere } from './collectifCarriere.js';
import { carteSurMarcheAutorisee, catalogueSpecial, identiteJoueur, preparerTirageSpecial, resumeSpeciauxLigue, tirerSpeciale } from './catalogueSpecial.js';
import { estPuissanceDeDeux, nombreQualifiesPlayoffs, nombreQualifiesPoules, repartirPoules } from './poulesCarriere.js';

const HEURE = 3_600_000;
const JOUR = 24 * HEURE;
const SEMAINE = 7 * JOUR;
export const PACKS_GRATUITS_PAR_JOUR = 10;
export const PACKS_DIVISION_PUBLIQUE = ['bronze', 'standard', 'or'] as const;
const packsActifsLigue = (etat: EtatCarriereEnLigne): string[] | undefined =>
  etat.publique ? [...PACKS_DIVISION_PUBLIQUE] : etat.packsActifs;

/**
 * Une saison accélérée ne doit pas transformer chaque match en dette physique.
 * La base reste exigeante à un rendez-vous hebdomadaire ; chaque cran de rythme
 * rend trois points de fatigue supplémentaires entre deux rencontres.
 */
export function recuperationFatigueSelonRythme(rythme: number): number {
  const cadence = Math.max(1, Math.min(7, Math.round(rythme)));
  return 22 + (cadence - 1) * 3;
}

/** Les indisponibilités suivent le temps de la ligue, pas le calendrier réel. */
export function dureeBlessureSelonRythme(jours: number, rythme: number): number {
  const cadence = Math.max(1, Math.min(7, Math.round(rythme)));
  return Math.max(12 * HEURE, Math.round(jours * JOUR / cadence));
}
const copier = <T>(x: T): T => structuredClone(x);
let catalogueSources: ReturnType<typeof catalogueMondialCarriere> | undefined;
let sourcesParId: Map<string, ReturnType<typeof catalogueMondialCarriere>[number]> | undefined;

function actualiserCartesCatalogue(cartes: CarteCarriere[]): void {
  const catalogueActuel = catalogueMondialCarriere();
  if (catalogueSources !== catalogueActuel) { catalogueSources = catalogueActuel; sourcesParId = new Map(catalogueActuel.map(source => [source.sourceId, source])); }
  const speciales = catalogueSpecial().sources;
  for (const carte of cartes) {
    // ⚠️ UNE CARTE SPÉCIALE SUIT LE LABO (GEN, COL, image, nation…) mais ne
    // disparaît jamais : une définition retirée laisse l'exemplaire tel quel.
    const speciale = speciales.get(carte.sourceId);
    if (speciale) {
      Object.assign(carte, {
        nom: speciale.nom, note: speciale.note, potentiel: speciale.potentiel, poste: speciale.poste, famille: speciale.famille,
        postesSecondaires: speciale.postesSecondaires ? [...speciale.postesSecondaires] : undefined, rarete: speciale.rarete,
        photo: speciale.photo ?? carte.photo, statistiques: { ...speciale.statistiques }, clubReel: speciale.clubReel,
        championnat: speciale.championnat, pays: speciale.pays, nation: speciale.nation, age: speciale.age,
        speciale: { ...speciale.speciale! },
      });
      continue;
    }
    if (carte.speciale) continue;
    const source = sourcesParId!.get(carte.sourceId);
    if (!source) continue;
    if (source.origine === 'ffr' && !catalogueAdmin().joueurs[carte.sourceId]) {
      // L'échelle FFR est aussi corrigée sur les cartes déjà possédées.
      // La propriété et toute l'histoire sportive restent intactes.
      carte.note = source.note;
      carte.potentiel = source.potentiel;
      carte.rarete = rareteCarriere(source.note);
      carte.poste = source.poste;
      carte.famille = source.famille;
      carte.postesSecondaires = source.postesSecondaires ? [...source.postesSecondaires] : undefined;
      // ⚠️ UN PORTRAIT NE S'EFFACE PAS. Un import qui n'en a plus pour ce joueur laisse celui que la carte portait.
      carte.photo = source.photo ?? carte.photo;
      carte.statistiques = statistiquesCarte(carte.note, source.famille, source.sourceId);
      continue;
    }
    if (source.origine !== 'professionnel' && !catalogueAdmin().joueurs[carte.sourceId]) continue;
    // ⚠️ UN HOMONYME NE PREND PAS LA CARTE D'UN AUTRE (Correctif 24, audit des données). L'identifiant d'un joueur est son
    // nom : quand un import ajoute un professionnel du même nom qu'un licencié amateur déjà distribué, c'est le mieux
    // noté qui porte l'identifiant — et la carte du licencié devenait ce professionnel : autre club, autre poste, autre
    // portrait (mesuré : 81 identifiants ont ainsi changé de titulaire entre le 28 septembre et le 5 octobre). Une carte
    // d'amateur ne suit donc un professionnel que s'il s'agit du même club, ou si le Labo l'a décidé.
    if (carte.origine === 'ffr' && source.origine === 'professionnel' && carte.clubReel !== source.clubReel && !catalogueAdmin().joueurs[carte.sourceId]) continue;
    // L'identité de collection et la valeur sportive suivent le catalogue actuel.
    // L'historique de propriété, la fatigue, les blessures et les statistiques de
    // carrière restent ceux de cette carte déjà distribuée.
    carte.nom = source.nom;
    carte.note = source.note;
    carte.poste = source.poste;
    carte.famille = source.famille;
    carte.postesSecondaires = source.postesSecondaires ? [...source.postesSecondaires] : undefined;
    carte.potentiel = catalogueAdmin().joueurs[carte.sourceId] || echelleFfrDuClub(source.clubReel) ? source.potentiel : Math.max(carte.potentiel, source.potentiel);
    carte.rarete = source.rarete;
    carte.photo = source.photo ?? carte.photo;
    carte.statistiques = { ...source.statistiques };
    carte.clubReel = source.clubReel;
    carte.championnat = source.championnat;
    carte.pays = source.pays;
    carte.nation = source.nation;
  }
}
/**
 * ⚠️ LE NOM DE L'ERREUR EST UNE INTERFACE, PAS UNE DÉCORATION. `carriereApi`
 * distingue une règle du jeu (« Ovas insuffisants », qui se lit à l'écran et
 * rend un 400) d'une panne (une erreur SQL, qui rend un 503 sans jamais
 * exposer sa pile). Sans ce nom, « il te manque 200 Ovas » remontait au joueur
 * en « le serveur de carrière est indisponible ».
 */
export class ErreurCarriere extends Error {
  constructor(message: string) { super(message); this.name = 'ErreurCarriere'; }
}
function exiger(condition: unknown, message: string): asserts condition { if (!condition) throw new ErreurCarriere(message); }
function entier(n: unknown, min = 0, max = 1_000_000): asserts n is number { exiger(typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max, 'Montant ou nombre invalide.'); }
function texte(s: unknown, max = 60): asserts s is string { exiger(typeof s === 'string' && s.trim().length >= 2 && s.trim().length <= max, 'Texte invalide.'); }
function identifiant(s: unknown): asserts s is string { exiger(typeof s === 'string' && s.length > 0 && s.length <= 250, 'Identifiant invalide.'); }
function listeIds(ids: unknown, max = 20): asserts ids is string[] { exiger(Array.isArray(ids) && ids.length <= max, 'Liste invalide.'); ids.forEach(identifiant); exiger(new Set(ids).size === ids.length, 'Une carte ne peut pas apparaître deux fois.'); }
function dateServeur(maintenant: number): string { exiger(Number.isFinite(maintenant), 'Horloge serveur invalide.'); return new Date(maintenant).toISOString(); }
const prochainId = (etat: EtatCarriereEnLigne, nature: string, longueur: number) => `${etat.id}:${nature}:${longueur + 1}`;
// En ligue avec doublons, l'identité d'une carte est celle de son exemplaire,
// pas celle du joueur du catalogue. La version évite de réutiliser un ID après
// une vente rapide, même si le tableau des cartes a rétréci.
const idNouvelExemplaire = (etat: EtatCarriereEnLigne, index: number) => `${etat.id}:carte:${etat.version}:${index + 1}`;
const cartesClub = (etat: EtatCarriereEnLigne, clubId: string) => etat.cartes.filter(c => c.proprietaire === clubId);
const clubParId = (etat: EtatCarriereEnLigne, id: string) => { const club = etat.clubs.find(c => c.id === id); exiger(club, 'Club introuvable dans cette ligue.'); return club; };
const monClub = (etat: EtatCarriereEnLigne, compteId: string) => { const club = etat.clubs.find(c => c.compteId === compteId); exiger(club, 'Vous ne faites pas partie de cette ligue.'); return club; };
const carteParId = (etat: EtatCarriereEnLigne, id: string) => { const carte = etat.cartes.find(c => c.id === id); exiger(carte, 'Carte introuvable dans cette ligue.'); return carte; };
function reparerIdentifiantsDoublons(etat: EtatCarriereEnLigne): void {
  if (!etat.doublonsAutorises) return;
  const occupes = new Set(etat.cartes.map(c => c.id));
  const vus = new Set<string>();
  const parClub = new Map<string, Map<string, string>>();
  const premierProprietaire = new Map<string, string | null>();
  for (let i = 0; i < etat.cartes.length; i++) {
    const carte = etat.cartes[i];
    const ancien = carte.id;
    if (!vus.has(ancien)) { vus.add(ancien); premierProprietaire.set(ancien, carte.proprietaire); continue; }
    let nouvel = `${etat.id}:carte:ancienne:${i + 1}`;
    while (occupes.has(nouvel)) nouvel += ':copie';
    carte.id = nouvel;
    occupes.add(nouvel);
    if (carte.proprietaire) {
      let correspondance = parClub.get(carte.proprietaire);
      if (!correspondance) { correspondance = new Map(); parClub.set(carte.proprietaire, correspondance); }
      if (!correspondance.has(ancien) && premierProprietaire.get(ancien) !== carte.proprietaire)
        correspondance.set(ancien, nouvel);
    }
  }
  if (!parClub.size) return;
  const remplacer = (clubId: string, id: string) => parClub.get(clubId)?.get(id) ?? id;
  const composition = (clubId: string, valeur: CompositionManager) => {
    valeur.titulaires = valeur.titulaires.map(id => remplacer(clubId, id));
    valeur.remplacants = valeur.remplacants.map(id => remplacer(clubId, id));
    valeur.capitaineId = remplacer(clubId, valeur.capitaineId);
    valeur.buteurId = remplacer(clubId, valeur.buteurId);
  };
  for (const club of etat.clubs) {
    composition(club.id, club.composition);
    for (const sauvee of club.compositionsSauvegardees ?? []) composition(club.id, sauvee.composition);
  }
  for (const vente of etat.ventes) vente.carteId = remplacer(vente.vendeurId, vente.carteId);
  for (const echange of etat.echanges) {
    echange.cartesDonnees = echange.cartesDonnees.map(id => remplacer(echange.de, id));
    echange.cartesDemandees = echange.cartesDemandees.map(id => remplacer(echange.vers, id));
  }
  for (const transaction of etat.transactions) {
    if (transaction.nature === 'pack' || transaction.nature === 'dotation')
      transaction.cartes = transaction.cartes.map(id => remplacer(transaction.clubId, id));
  }
  for (const rencontre of etat.rencontres) {
    if (!rencontre.match) continue;
    for (const cote of ['domicile', 'exterieur'] as const) {
      const clubId = rencontre[cote];
      const equipe = rencontre.match.equipes?.[cote];
      if (equipe) {
        equipe.feuille = equipe.feuille.map(j => ({ ...j, id: remplacer(clubId, j.id) }));
        equipe.capitaineId = remplacer(clubId, equipe.capitaineId);
        equipe.buteurId = remplacer(clubId, equipe.buteurId);
      }
      for (const evenement of rencontre.match.journal) {
        if (evenement.cote === cote && evenement.commande.type === 'remplacement') {
          evenement.commande.sortantId = remplacer(clubId, evenement.commande.sortantId);
          evenement.commande.entrantId = remplacer(clubId, evenement.commande.entrantId);
        }
      }
      for (const ligne of rencontre.match.feuille ?? []) {
        if (ligne.cote === cote) ligne.carteId = remplacer(clubId, ligne.carteId);
      }
    }
  }
}
function journal(etat: EtatCarriereEnLigne, club: ClubCarriere, nature: TransactionCarriere['nature'], ovas: number, cartes: string[], libelle: string, date: string, meta?: TransactionCarriere['meta']) {
  exiger(Number.isSafeInteger(club.ovas + ovas) && club.ovas + ovas >= 0, 'Ovas insuffisants.');
  club.ovas += ovas;
  etat.transactions.push({ id: prochainId(etat, 'transaction', etat.transactions.length), clubId: club.id, nature, ovas, cartes, libelle, date, meta });
}

/** Tous les packs restent possibles ; le prix sert d'indice de rareté. */
export function poidsPackQuotidien(pack: PackCarriere, rang: number, clubs: number, classementActif = true): number {
  const indiceRarete = Math.max(0, Math.min(1, Math.log(Math.max(250, pack.prix) / 250) / Math.log(8500 / 250)));
  const poidsBase = 1 / (1 + 6 * indiceRarete ** 2);
  const retard = classementActif && clubs > 1 ? Math.max(0, Math.min(1, rang / (clubs - 1))) : 0;
  return poidsBase * (1 + 3 * retard * indiceRarete);
}

function attribuerPacksQuotidiens(etat: EtatCarriereEnLigne, maintenant: number): void {
  // ⚠️ RIEN AVANT LE COUP D'ENVOI. Le lot quotidien tombait dès la création de
  // la ligue : un créateur qui attend ses amis pendant trois jours ouvrait
  // trente packs et se présentait au premier match avec un effectif que
  // personne ne pouvait rattraper. Les packs sont une récompense de saison, pas
  // une avance sur inscription — le salon n'en distribue plus, et
  // `demarrerSaison` donne le premier lot au moment où tout le monde part
  // ensemble.
  if (etat.phase === 'salon') return;
  const jour = dateServeur(maintenant).slice(0, 10);
  const classement = classementCarriere(etat);
  const classementActif = classement.some(ligne => ligne.joues > 0);
  for (const club of etat.clubs) {
    club.packsGratuits ??= [];
    if (club.dernierLotPacksGratuits === jour) continue;
    // ⚠️ UN CLUB HORS CLASSEMENT EST DERNIER, PAS PREMIER. Celui qui a rejoint
    // après le coup d'envoi n'a pas de ligne au championnat en cours :
    // `findIndex` rend -1, et le `Math.max(0, …)` d'avant le traitait comme le
    // leader — donc les pires chances de packs rares, pour l'effectif le plus
    // faible de la ligue. Le rattrapage doit jouer POUR lui.
    const place = classement.findIndex(ligne => ligne.clubId === club.id);
    const rang = place >= 0 ? place : Math.max(0, etat.clubs.length - 1);
    const actifs = packsActifsLigue(etat);
    const disponibles = etat.packs.filter(pack => !pack.evenement && (!actifs || actifs.includes(pack.id)));
    const poids = disponibles.map(pack => poidsPackQuotidien(pack, rang, etat.clubs.length, classementActif));
    const rng = hasard(`${etat.graine}:packs-quotidiens:${jour}:${club.id}`);
    const programmes = club.packsGratuitsProgrammes?.[jour] ?? [];
    for (let i = 0; i < (etat.packsGratuitsParJour ?? PACKS_GRATUITS_PAR_JOUR); i++) {
      const force = programmes[i];
      const indexForce = force ? disponibles.findIndex(pack => pack.id === force) : -1;
      const index = indexForce >= 0 ? indexForce : tirerPondere(poids, rng);
      exiger(index >= 0, 'Aucun pack quotidien disponible.');
      club.packsGratuits.push({ id: `${club.id}:quotidien:${jour}:${i}`, packId: disponibles[index].id, recuLe: dateServeur(maintenant) });
    }
    if (club.packsGratuitsProgrammes?.[jour]) {
      delete club.packsGratuitsProgrammes[jour];
      if (!Object.keys(club.packsGratuitsProgrammes).length) delete club.packsGratuitsProgrammes;
    }
    club.dernierLotPacksGratuits = jour;
  }
}
/**
 * ⚠️ DEUX CARTES DU MÊME JOUEUR NE JOUENT PAS ENSEMBLE. Dupont et Dupont
 * Halloween, McCaw ICON et McCaw Halloween : une seule va sur la feuille —
 * celle que le manager y a mise, sinon la meilleure. Les autres restent dans
 * l'effectif. On ne regarde que les groupes où figure une carte spéciale : les
 * doublons ordinaires des ligues qui les autorisent ne changent pas.
 */
function ecartesParIdentite(cartes: readonly CarteCarriere[], composition: CompositionManager | undefined): Set<string> {
  const groupes = new Map<string, CarteCarriere[]>();
  for (const c of cartes) { const id = identiteJoueur(c); groupes.set(id, [...(groupes.get(id) ?? []), c]); }
  const feuille = composition ? [...composition.titulaires, ...composition.remplacants] : [];
  const ecartes = new Set<string>();
  for (const groupe of groupes.values()) {
    if (groupe.length < 2 || !groupe.some(c => c.speciale)) continue;
    const garde = groupe.filter(c => feuille.includes(c.id)).sort((a, b) => feuille.indexOf(a.id) - feuille.indexOf(b.id))[0]
      ?? [...groupe].sort((a, b) => b.note - a.note || (a.id < b.id ? -1 : 1))[0];
    for (const c of groupe) if (c !== garde) ecartes.add(c.id);
  }
  return ecartes;
}
function ajusterComposition(etat: EtatCarriereEnLigne, club: ClubCarriere, maintenant: number) {
  const cartes = cartesClub(etat, club.id);
  const indisponibles = new Set(cartes.filter(c => c.blesseJusqua && Date.parse(c.blesseJusqua) > maintenant).map(c => c.id));
  for (const id of ecartesParIdentite(cartes, club.composition)) indisponibles.add(id);
  club.composition = reconcilerCompositionManager(cartes.map(coequipierDepuisCarte), club.composition, indisponibles);
  if (!club.buteurManuel) {
    const parId = new Map(cartes.map(c => [c.id, c]));
    const meilleur = club.composition.titulaires.map(id => parId.get(id)).filter((c): c is CarteCarriere => Boolean(c))
      .sort((a, b) => (b.statistiques.JDP ?? b.note) - (a.statistiques.JDP ?? a.note))[0];
    if (meilleur) club.composition.buteurId = meilleur.id;
  }
}
function clubLibre(etat: EtatCarriereEnLigne, clubId: string) {
  exiger(!etat.rencontres.some(r => r.match && !r.resultat && (r.domicile === clubId || r.exterieur === clubId)), 'Votre équipe joue actuellement ; attendez la fin du match.');
}
function transferer(carte: CarteCarriere, destinataire: ClubCarriere, saison: number) {
  // ⚠️ LE FAVORI NE SUIT PAS LA CARTE CHEZ L'ACHETEUR. C'est une marque posée
  // par UN manager sur SON effectif — « celui-là, je ne le brade pas ». La
  // laisser au nouveau propriétaire lui protégerait une carte qu'il n'a jamais
  // choisi de protéger, et surtout sans qu'il sache pourquoi.
  carte.proprietaire = destinataire.id; delete carte.verrou; delete carte.favori;
  carte.clubs.push({ clubId: destinataire.id, saison });
}
/**
 * ⚠️ UN JOUEUR ALIGNÉ NE QUITTE PAS LE CLUB. Vendre, vendre rapidement ou
 * conclure l'échange d'un titulaire ou d'un remplaçant était permis : la feuille se
 * réparait toute seule derrière (`ajusterComposition`), et on découvrait le
 * dimanche que le numéro 10 avait été remplacé par le premier venu du même
 * poste. On refuse maintenant le départ tant que la carte est sur la feuille —
 * la sortir du XV ou du banc est un geste conscient, et il reste à un clic.
 *
 * `ajusterComposition` garde tout son sens : elle rattrape les départs SUBIS
 * (blessure, carte achetée par un autre club, expiration d'enchère), pas ceux
 * qu'on décide.
 */
function verifierHorsFeuille(etat: EtatCarriereEnLigne, club: ClubCarriere, sortants: string[], action = 'échange') {
  const feuille = new Set([...(club.composition?.titulaires ?? []), ...(club.composition?.remplacants ?? [])]);
  const aligne = sortants.find(id => feuille.has(id));
  exiger(!aligne, `${club.pseudo} a ${aligne ? carteParId(etat, aligne).nom : 'ce joueur'} sur sa feuille de match : ${action === 'échange' ? 'l’échange ne peut pas aboutir' : 'la vente ne peut pas aboutir'}. Il faut d’abord le retirer du XV ou du banc.`);
}
function blocageFeuilleEchange(etat: EtatCarriereEnLigne, e: EtatCarriereEnLigne['echanges'][number]): string | undefined {
  for (const [clubId, ids] of [[e.de, e.cartesDonnees], [e.vers, e.cartesDemandees]] as const) {
    const club = clubParId(etat, clubId);
    const indisponible = ids.find(id => etat.cartes.find(c => c.id === id)?.proprietaire !== clubId);
    if (indisponible) return 'Une carte de cet échange n’est plus disponible dans son club : l’échange ne peut pas aboutir.';
    const feuille = new Set([...club.composition.titulaires, ...club.composition.remplacants]);
    const aligne = ids.find(id => feuille.has(id));
    if (aligne) return `${club.pseudo} a ${etat.cartes.find(c => c.id === aligne)?.nom ?? 'ce joueur'} sur sa feuille de match : l’échange ne peut pas aboutir. Il faut d’abord le retirer du XV ou du banc.`;
  }
  return undefined;
}
function verifierDepart(etat: EtatCarriereEnLigne, clubId: string, sortants: string[], entrants: string[] = []) {
  const restants = cartesClub(etat, clubId).filter(c => !sortants.includes(c.id) && !c.verrou).map(coequipierDepuisCarte);
  restants.push(...entrants.map(id => coequipierDepuisCarte(carteParId(etat, id))));
  exiger(restants.length >= EFFECTIF_MINIMUM, `Conservez au moins ${EFFECTIF_MINIMUM} joueurs disponibles dans votre effectif.`);
  const composition = compositionManagerParDefaut(restants);
  exiger(composition.titulaires.length === 15 && composition.remplacants.length === 8, 'Le transfert empêcherait de composer une équipe.');
  for (const famille of ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne', 'demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere']) {
    const minimum = famille === 'pilier' ? 4 : famille === 'talonneur' ? 2 : famille === 'troisieme_ligne' ? 3 : ['deuxieme_ligne', 'centre', 'ailier'].includes(famille) ? 2 : 1;
    exiger(restants.filter(j => [j.poste, ...(j.postesSecondaires ?? [])]
      .some(poste => POSTE_PAR_ID[poste].famille === famille)).length >= minimum,
    'Ce transfert laisse un poste sans profondeur suffisante.');
  }
}
function verifierComposition(etat: EtatCarriereEnLigne, club: ClubCarriere, valeur: CompositionManager, maintenant: number) {
  exiger(valeur && typeof valeur === 'object', 'Composition invalide.');
  listeIds(valeur.titulaires, 15); listeIds(valeur.remplacants, 8);
  const ids = [...valeur.titulaires, ...valeur.remplacants];
  exiger(valeur.titulaires.length === 15 && valeur.remplacants.length === 8 && new Set(ids).size === 23, 'La feuille doit contenir 15 titulaires et 8 remplaçants distincts.');
  exiger(valeur.titulaires.includes(valeur.capitaineId) && ids.includes(valeur.buteurId), 'Choisissez un capitaine titulaire et un buteur sur la feuille.');
  const presents = new Map<string, CarteCarriere>();
  for (const id of ids) {
    const c = carteParId(etat, id), identite = identiteJoueur(c), deja = presents.get(identite);
    exiger(!deja || (!deja.speciale && !c.speciale), `${c.nom} est déjà sur la feuille avec une autre de ses cartes.`);
    presents.set(identite, c);
  }
  ids.forEach((id, i) => {
    const c = carteParId(etat, id);
    exiger(c.proprietaire === club.id, 'Cette carte appartient à un autre club.');
    exiger(!c.blesseJusqua || Date.parse(c.blesseJusqua) <= maintenant, `${c.nom} est blessé : retire-le de la feuille avant de l’enregistrer.`);
    const poste = [...POSTES_XV_MANAGER, ...POSTES_BANC_MANAGER][i];
    // ⚠️ UN JOUEUR HORS DE SON POSTE EST AUTORISÉ, ET IL COÛTE.
    //
    // La règle a longtemps refusé tout croisement avant ↔ arrière
    // (`joueurCompatibleManager`). Elle contredisait trois choses à la fois :
    // le mode entraîneur solo, qui laisse composer librement ; le texte de
    // l'écran, qui promet « un joueur hors de son poste perd la cohérence
    // collective » ; et le barème du jeu lui-même — `adequationAuPoste` note
    // ces placements « hors poste » à 82 %, pas « interdits ».
    //
    // Pour le joueur, ça donnait le pire des messages : il range ses recrues,
    // clique « Enregistrer la feuille », et le serveur jette TOUTE la feuille
    // pour un seul pion. La sanction est désormais sur le terrain, où elle a
    // un sens — `feuilleGeleeEnLigne` pèse la note par l'adéquation avant de
    // geler la feuille du match.
    //
    // ⚠️ ET LA PREMIÈRE LIGNE NE FAIT PLUS EXCEPTION (Correctif 24). Elle restait
    // fermée aux non-spécialistes — au XV comme sur les trois premières places
    // du banc, alors même que l'écran annonce « sur le banc, on met qui on
    // veut » : il suffisait d'un trois-quarts en seizième pour que le serveur
    // refuse la feuille entière. Demande : « Ne pas empêcher la sauvegarde.
    // Laisser le joueur assumer son choix. » Un ailier au poste de pilier est
    // donc accepté, et joue à la moitié de sa valeur (`rendementAuPoste`).
    void poste;
  });
}

/** De 0 à 100 000, par pas de 100. Hors bornes, on ramène au défaut. */
const DOTATION_DEFAUT = 1000;
export const DOTATION_MAX = 100_000;
function dotationValide(valeur: unknown): number {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) return DOTATION_DEFAUT;
  return Math.min(DOTATION_MAX, Math.max(0, Math.round(valeur)));
}

/**
 * Vrai tant que la saison en cours n'a pas commencé à se jouer : salon,
 * intersaison, ou saison lancée dont aucune rencontre n'a de résultat ni de
 * match en route. On regarde TOUTES les compétitions de la saison, coupes
 * maison comprises : la première balle jouée ferme la porte, quelle qu'elle
 * soit.
 */
function avantLaPremiereJournee(etat: EtatCarriereEnLigne, maintenant: number): boolean {
  if (etat.phase !== 'saison') return true;
  const enCours = new Set(etat.competitions.filter(c => c.saison === etat.saison).map(c => c.id));
  // ⚠️ UNE FENÊTRE FERMÉE COMPTE COMME JOUÉE, MÊME SI PERSONNE N'A ENCORE
  // RÉVEILLÉ LA LIGUE. Le match ne se matérialise (`r.match`) qu'au premier
  // appel qui avance l'horloge — une lecture, une commande ou le cron. Entre la
  // fin de la fenêtre et ce réveil, la ligue est en sommeil : sans cette
  // troisième condition, le premier qui ouvre le lien d'invitation à cet
  // instant redessinerait un calendrier dont la première journée a déjà sonné.
  return !etat.rencontres.some(r => enCours.has(r.competitionId)
    && (r.resultat || r.match || Date.parse(r.ferme) <= maintenant));
}

/**
 * L'arrivant entre dans le championnat de la saison en cours, dont AUCUNE
 * affiche n'a encore été jouée : on jette le calendrier et on le retire au sort
 * à n clubs au lieu de n-1.
 *
 * ⚠️ LES COUPES MAISON NE SONT PAS TOUCHÉES. Leurs participants ont été choisis
 * un par un par le commissaire : y ajouter quelqu'un d'office reviendrait à
 * décider à sa place. Il l'invitera à la prochaine.
 */
function integrerAuChampionnat(etat: EtatCarriereEnLigne, clubId: string) {
  const championnat = etat.competitions.find(c =>
    c.saison === etat.saison && c.etat === 'enCours' && c.format === 'championnat');
  if (!championnat || championnat.participants.includes(clubId)) return;
  championnat.participants.push(clubId);
  etat.rencontres = etat.rencontres.filter(r => r.competitionId !== championnat.id);
  // La phase finale se rouvre si l'arrivant fait passer la ligue à quatre.
  championnat.playoffs = Boolean(etat.playoffs) && championnat.participants.length >= 2;
  calendrierCompetition(etat, championnat);
  championnat.journeesRegulieres = Math.max(...etat.rencontres.filter(r => r.competitionId === championnat.id).map(r => r.journee));
}

function ajouterClub(etat: EtatCarriereEnLigne, compteId: string, pseudo: string, nom: string, maintenant: number, graine: string, embleme?: unknown) {
  identifiant(compteId); texte(pseudo); texte(nom, 40);
  // ⚠️ LA PORTE SE FERME À LA PREMIÈRE JOURNÉE, PAS AU CLIC DE LANCEMENT. Le
  // créateur lance la saison dès qu'il a deux clubs ; fermer les inscriptions à
  // cet instant condamnait l'ami qui ouvre le lien le lendemain à attendre des
  // semaines, et une ligue qui refuse un manager en perd souvent deux. Tant
  // qu'aucune rencontre de la saison n'a été jouée ni même donné son coup
  // d'envoi, rien n'est faussé : on l'inscrit et on retire le calendrier au sort
  // avec lui (`integrerAuChampionnat`).
  //
  // ⚠️ APRÈS, C'EST NON — et ce n'est pas une précaution de principe. Le
  // classement d'un championnat où les clubs n'ont pas joué le même nombre de
  // matchs ne veut plus rien dire, et la dotation de fin de saison, distribuée
  // par rang, serait reprise à ceux qui étaient là depuis le début.
  exiger(etat.publique || avantLaPremiereJournee(etat, maintenant), 'Les inscriptions sont closes : la première journée est jouée.');
  exiger(etat.clubs.length < etat.maxClubs, 'Cette ligue est complète.');
  exiger(!etat.clubs.some(c => c.compteId === compteId), 'Ce compte possède déjà un club dans cette ligue.');
  exiger(!etat.clubs.some(c => c.nom.toLocaleLowerCase('fr') === nom.trim().toLocaleLowerCase('fr')), 'Ce nom de club est déjà pris.');
  const id = prochainId(etat, 'club', etat.clubs.length);
  // ⚠️ L'unicité par ligue commence ICI, pas au premier pack : deux amis
  // inscrits le même jour ne peuvent pas recevoir le même licencié.
  const cartes = dotationBronzeCarriere(etat.id, id, graine, new Set(etat.doublonsAutorises ? [] : etat.cartes.map(c => c.sourceId)), etat.saison);
  if (etat.doublonsAutorises) cartes.forEach((carte, i) => { carte.id = idNouvelExemplaire(etat, etat.cartes.length + i); });
  exiger(cartes.length === 30, 'Le vivier de départ est épuisé pour cette ligue.');
  const club: ClubCarriere = { id, compteId, pseudo: pseudo.trim(), nom: nom.trim(), ovas: 0, composition: compositionManagerParDefaut(cartes.map(coequipierDepuisCarte)), strategie: copier(STRATEGIE_EN_LIGNE_DEFAUT), rejointLe: dateServeur(maintenant), embleme: emblemeValide(embleme) ? embleme : undefined };
  etat.clubs.push(club); etat.cartes.push(...cartes);
  journal(etat, club, 'dotation', etat.dotationOvas, cartes.map(c => c.id), `Dotation de départ : 30 licenciés de Régionale 3 et ${etat.dotationOvas.toLocaleString('fr-FR')} Ovas`, dateServeur(maintenant));
  renouvelerObjectifs(etat, maintenant);
  if (etat.phase === 'saison' && (!etat.publique || avantLaPremiereJournee(etat, maintenant))) integrerAuChampionnat(etat, club.id);
}

export function creerCarriere(config: CreationCarriere, maintenant: number, graine: string): EtatCarriereEnLigne {
  exiger(config && typeof config === 'object', 'Paramètres invalides.');
  identifiant(config.id); texte(config.nom, 60); texte(config.code, 32); entier(config.maxClubs, 2, 64);
  entier(config.rythme, 1, 7);
  exiger(!Array.isArray(config.packsActifs) || config.packsActifs.length > 0 || config.packsGratuitsParJour === 0,
    'Choisissez au moins un pack pour les distributions quotidiennes.');
  texte(graine, 200);
  const etat: EtatCarriereEnLigne = { schema: 1, id: config.id, nom: config.nom.trim(), code: config.code, createurId: config.compteId, creeLe: dateServeur(maintenant), version: 1, saison: 1, phase: 'salon', rythme: config.rythme, maxClubs: config.maxClubs, graine,
    rotationPacks: catalogueAdmin().rotationPacks === true,
    // ⚠️ LE VIVIER NE SE COPIE PAS DANS LA LIGUE. Le catalogue mondial compte
    // 78 083 joueurs, soit 26 Mo de JSON : les recopier ici, ce serait réécrire
    // 26 Mo dans la base à chaque lecture de la ligue. Une carte n'existe qu'à
    // partir du moment où elle est DISTRIBUÉE ; ce qui reste libre se déduit,
    // parce que le catalogue est déterministe et identique partout, et
    // l'unicité par ligue se lit dans les `sourceId` déjà possédés.
    logo: logoCompetitionValide(config.logo) ? config.logo : undefined,
    tropheeId: tropheeValide(config.tropheeId) ? config.tropheeId : undefined,
    playoffs: config.playoffs === true,
    packsActifs: Array.isArray(config.packsActifs)
      ? [...new Set(config.packsActifs.filter(id => typeof id === 'string' && packsCatalogueAdmin().some(pack => pack.id === id)))]
      : undefined,
    packsGratuitsParJour: Number.isInteger(config.packsGratuitsParJour)
      ? Math.max(0, Math.min(20, config.packsGratuitsParJour!)) : PACKS_GRATUITS_PAR_JOUR,
    doublonsAutorises: config.doublonsAutorises === true,
    cartesSpeciales: config.cartesSpeciales === true,
    // ⚠️ BORNÉE, ET C'EST TOUTE LA DIFFÉRENCE ENTRE UN RÉGLAGE ET UNE FAILLE.
    // La dotation de départ est le seul robinet d'Ovas que le créateur ouvre
    // lui-même : sans plafond, il se donne dix millions et le marché de la
    // ligue n'existe plus. 100 000 Ovas, c'est déjà trois saisons de gains.
    dotationOvas: dotationValide(config.dotationOvas),
    clubs: [], cartes: [], packs: copier(packsCatalogueAdmin()), competitions: [], rencontres: [], ventes: [], echanges: [], transactions: [], objectifs: [], histoire: [] };
  ajouterClub(etat, config.compteId, config.pseudo, config.clubNom, maintenant, graine, config.embleme);
  attribuerPacksQuotidiens(etat, maintenant);
  return etat;
}

/** Nouveau groupe mensuel : les clubs gardent leur effectif et leur solde. */
export function creerDivisionPublique(config: Pick<CreationCarriere, 'id' | 'code' | 'compteId' | 'pseudo' | 'clubNom' | 'embleme'>,
  cycle: number, division: number, maintenant: number, graine: string,
  herites: { club: ClubCarriere; cartes: CarteCarriere[] }[] = []): EtatCarriereEnLigne {
  const etat = creerCarriere({ ...config, nom: `Destiny Rugby · Division ${division}`, rythme: 7, maxClubs: 16,
    dotationOvas: 5000, packsGratuitsParJour: 0, doublonsAutorises: true,
    packsActifs: [...PACKS_DIVISION_PUBLIQUE], playoffs: false }, maintenant, graine);
  etat.publique = { cycle, division };
  if (herites.length) {
    // ⚠️ LE MARCHÉ D'UN CYCLE SE FERME AVEC LUI. Une carte restée en vente repart déverrouillée (son annonce est restée
    // dans l'ancienne ligue : elle serait verrouillée pour toujours), et les Ovas réservés pour une enchère sont rendus.
    etat.clubs = herites.map(({ club }) => {
      const copie = { ...copier(club), packsGratuits: [], dernierLotPacksGratuits: undefined };
      copie.ovas += (copie.reservesMarche ?? []).reduce((total, r) => total + r.montant, 0);
      delete copie.reservesMarche;
      return copie;
    });
    etat.cartes = herites.flatMap(({ cartes }) => copier(cartes)).map(c => { delete c.verrou; return c; });
    etat.transactions = []; etat.objectifs = [];
    if (herites.length === etat.maxClubs) demarrerSaison(etat, maintenant);
  }
  return etat;
}

const CLUBS_LABORATOIRE = [
  { compteId: '00000000-0000-4000-8000-000000000101', pseudo: 'Mêlée', nom: 'Atelier Mêlée' },
  { compteId: '00000000-0000-4000-8000-000000000102', pseudo: 'Touche', nom: 'Atelier Touche' },
  { compteId: '00000000-0000-4000-8000-000000000103', pseudo: 'En-but', nom: 'Atelier En-but' },
] as const;

/**
 * Fabrique le bac à sable de Kiri avec assez d'adversaires pour éprouver le
 * championnat, les classements et les matchs sans inviter de vrais comptes.
 */
export function creerLaboratoireCarriere(config: Pick<CreationCarriere, 'id' | 'code' | 'compteId' | 'pseudo'>, maintenant: number, graine: string): EtatCarriereEnLigne {
  const etat = creerCarriere({
    ...config, nom: 'Laboratoire Kiri', clubNom: 'Kiri XV', rythme: 7,
    maxClubs: 8, playoffs: true, dotationOvas: 100_000,
  }, maintenant, graine);
  etat.laboratoire = true;
  // Le bac à sable de Kiri sert justement à essayer ce qui n'est pas encore public.
  etat.cartesSpeciales = true;
  for (const robot of CLUBS_LABORATOIRE) ajouterClub(etat, robot.compteId, robot.pseudo, robot.nom, maintenant, `${graine}:${robot.compteId}`);
  demarrerSaison(etat, maintenant);
  const club = monClub(etat, config.compteId);
  club.ovas = 1_000_000;
  for (const carte of etat.cartes) { carte.fatigue = 0; delete carte.blesseJusqua; }
  return etat;
}

function ouvrirPack(etat: EtatCarriereEnLigne, club: ClubCarriere, packId: string, maintenant: number, graine: string, gratuit = false) {
  const pack = etat.packs.find(p => p.id === packId); exiger(pack, 'Pack inconnu.');
  // ⚠️ UN PACK D'ÉVÉNEMENT (HALLOWEEN…) NE SE VEND PAS EN LIGUE : il est dans la
  // boutique de packs spéciaux de la Collection solo. Ses cartes, elles, peuvent
  // sortir des packs ordinaires d'une ligue qui les autorise.
  exiger(!pack.evenement, 'Ce pack se trouve dans la boutique de packs spéciaux de la Collection solo.');
  if (etat.publique || !gratuit) {
    const actifs = packsActifsLigue(etat);
    exiger(!actifs || actifs.includes(packId), 'Ce pack est désactivé dans cette ligue.');
  }
  entier(pack.prix, 1); entier(pack.cartes, 1, 12);
  exiger(RARETES_CARRIERE.every(r => Number.isFinite(pack.probabilites[r]) && pack.probabilites[r] >= 0), 'Probabilités de pack invalides.');
  if (!gratuit) exiger(club.ovas >= pack.prix, 'Ovas insuffisants pour ce pack.');
  // ⚠️ L'UNICITÉ PAR LIGUE SE TIENT ICI. Un joueur déjà possédé — par n'importe
  // quel club de CETTE ligue — ne peut plus sortir d'un pack : c'est ce qui
  // oblige à aller parler à celui qui l'a. Il reste évidemment disponible dans
  // toutes les autres ligues.
  const pris = new Set(etat.doublonsAutorises ? [] : etat.cartes.map(c => c.sourceId));
  const rayons = RARETES_CARRIERE.map(r => rayonDePack(r, pack).filter(c => !pris.has(c.sourceId)));
  exiger(rayons.some((rayon, i) => pack.probabilites[RARETES_CARRIERE[i]] > 0 && rayon.length > 0), 'Ce pack est épuisé dans votre ligue.');
  const rng = hasard(`${graine}:${etat.version}:${club.id}`); const tirees: CarteCarriere[] = [];
  // ⚠️ LA GARANTIE SE TIENT SUR LA DERNIÈRE CARTE, PAS SUR LA PREMIÈRE. Forcer
  // la bande dès le premier tirage ferait d'un « Or garanti » un pack qui
  // commence toujours par de l'Or puis retombe : le joueur apprendrait en trois
  // ouvertures que seule la carte n°1 compte. En la gardant pour la fin, et
  // SEULEMENT si le tirage normal n'a rien donné, la promesse est tenue sans
  // que la séquence devienne prévisible — et la plupart du temps elle ne sert
  // même pas, parce que le hasard a déjà fait le travail.
  const bandes = pack.garantie ? bandesGaranties(pack.garantie) : [];
  // Les cartes spéciales passent AVANT la bande : une chance par carte, qui
  // suit la qualité du pack (`chanceSpecialeParCarte`). Sans carte spéciale
  // possible, `tirage` vaut null et l'ouverture tire exactement comme avant.
  const tirage = preparerTirageSpecial(pack, etat.cartesSpeciales, maintenant, pris, catalogueSpecial());
  // Un pack d'événement promet SA carte : sans elle, il ne s'ouvre pas.
  exiger(!pack.garantieSpeciale || tirage?.lots.some(l => l.evenement === pack.garantieSpeciale),
    'Toutes les cartes de cet événement sont déjà distribuées dans votre ligue. Aucun Ova débité.');
  exiger(rayons.reduce((n, rayon) => n + rayon.length, 0) >= pack.cartes, 'Pas assez de joueurs disponibles pour ce pack.');
  exiger(!pack.garantie || bandes.some(r => rayons[RARETES_CARRIERE.indexOf(r)].length > 0), 'La garantie de ce pack est épuisée. Aucun Ova débité.');
  for (let n = 0; n < pack.cartes; n++) {
    const derniere = n === pack.cartes - 1;
    const doitGarantir = derniere && bandes.length > 0 && !tirees.some(c => bandes.includes(c.rarete));
    const doitGarantirSpeciale = derniere && Boolean(pack.garantieSpeciale) && !tirees.some(c => c.speciale?.evenement === pack.garantieSpeciale);
    const speciale = doitGarantirSpeciale ? tirerSpeciale(tirage, rng, { forcer: pack.garantieSpeciale })
      : doitGarantir ? tirerSpeciale(tirage, rng, {
        accepte: s => bandes.includes(s.rarete),
        base: bandes.reduce((total, r) => total + (rayons[RARETES_CARRIERE.indexOf(r)].length ? pack.probabilites[r] || 1 : 0), 0),
      })
      : tirerSpeciale(tirage, rng);
    if (speciale) {
      const carte = carteDepuisSource(speciale, etat.id, club.id, etat.saison);
      if (etat.doublonsAutorises) carte.id = idNouvelExemplaire(etat, etat.cartes.length);
      pris.add(carte.sourceId); etat.cartes.push(carte); tirees.push(carte);
      continue;
    }
    const poids = RARETES_CARRIERE.map((r, b) => {
      if (!rayons[b].length) return 0;
      if (doitGarantir && !bandes.includes(r)) return 0;
      return doitGarantir ? pack.probabilites[r] || 1 : pack.probabilites[r];
    });
    // Une garantie impossible (bande épuisée dans la ligue) ne bloque pas
    // l'ouverture : on retombe sur le tirage ordinaire plutôt que de refuser
    // un pack déjà payé.
    const i = tirerPondere(poids.some(x => x > 0) ? poids : RARETES_CARRIERE.map((r, b) => rayons[b].length ? pack.probabilites[r] : 0), rng);
    exiger(i >= 0, 'Ce pack ne contient plus de joueurs disponibles.');
    const source = tirerDuRayon(rayons[i], pris, rng);
    exiger(source, 'Ce pack ne contient plus de joueurs disponibles.');
    const carte = carteDepuisSource(source, etat.id, club.id, etat.saison);
    if (etat.doublonsAutorises) carte.id = idNouvelExemplaire(etat, etat.cartes.length);
    rayons[i] = rayons[i].filter(c => c.sourceId !== source.sourceId);
    pris.add(carte.sourceId); etat.cartes.push(carte); tirees.push(carte);
  }
  const meilleure = [...tirees].sort((a, b) => b.note - a.note)[0];
  journal(etat, club, 'pack', gratuit ? 0 : -pack.prix, tirees.map(c => c.id), `${gratuit ? 'Pack quotidien offert' : `Pack ${pack.nom}`} : ${tirees.map(c => c.nom).join(', ')}`, dateServeur(maintenant), {
    packId: pack.id, packNom: pack.nom, packApparence: meilleure.rarete,
    meilleureNote: meilleure.note, meilleurJoueur: meilleure.nom, meilleurPortrait: meilleure.photo,
  });
  for (const objectif of etat.objectifs.filter(o => o.clubId === club.id && !o.reclame)) {
    if (objectif.type === 'packs' || (objectif.type === 'packGratuit' && gratuit)) objectif.progression++;
  }
  verserObjectifsAtteints(etat, club, maintenant);
}

function verserObjectifsAtteints(etat: EtatCarriereEnLigne, club: ClubCarriere, maintenant: number) {
  for (const objectif of etat.objectifs.filter(o => o.clubId === club.id && !o.reclame && o.progression >= o.cible)) {
    objectif.reclame = true;
    journal(etat, club, 'objectif', objectif.recompense, [], objectif.libelle, dateServeur(maintenant));
  }
}

function renouvelerObjectifs(etat: EtatCarriereEnLigne, maintenant: number) {
  const modeles: [ObjectifCarriere['type'], string, number, number][] = [
    ['participer', 'Terminer un match', 1, 200], ['gagner', 'Remporter un match', 1, 150], ['essais', 'Marquer 2 essais', 2, 180],
    ['formation', 'Aligner un titulaire de moins de 60 GEN', 1, 150], ['penalites', 'Réussir 2 pénalités', 2, 120], ['essais', 'Marquer un essai', 1, 150],
    ['packs', 'Ouvrir un pack', 1, 100], ['packGratuit', 'Ouvrir un pack quotidien', 1, 100],
  ];
  for (const club of etat.clubs) {
    const periode = etat.rencontres.filter(r => r.resultat && (r.domicile === club.id || r.exterieur === club.id)).length;
    const prefixe = `${etat.id}:objectif:${club.id}:${periode}:`;
    // Les objectifs terminés des anciennes sauvegardes sont crédités avant
    // d'être retirés ; un retour après plusieurs semaines ne fait rien perdre.
    verserObjectifsAtteints(etat, club, maintenant);
    etat.objectifs = etat.objectifs.filter(o => o.clubId !== club.id || o.id.startsWith(prefixe));
    const prochaine = etat.rencontres.filter(r => !r.resultat && (r.domicile === club.id || r.exterieur === club.id))
      .sort((a, b) => Date.parse(a.ouvre) - Date.parse(b.ouvre))[0];
    if (!prochaine) continue;
    for (const [type, libelle, cible, recompense] of modeles.filter((_, index) => (index + periode) % 2 === 0)) {
      const id = `${prefixe}${type}`;
      if (!etat.objectifs.some(o => o.id === id)) etat.objectifs.push({ id, clubId: club.id, libelle, type, cible, progression: 0, recompense, debut: prochaine.ouvre, fin: prochaine.ferme, reclame: false });
    }
  }
}

/**
 * ⚠️ LE NUMÉRO SUIT LE PLUS GRAND DÉJÀ ATTRIBUÉ, PAS LA LONGUEUR DU TABLEAU.
 * Tant que rien n'est jamais retiré, les deux donnent le même résultat. Mais
 * redessiner le calendrier d'un championnat (`integrerAuChampionnat`) retire
 * ses affiches : repartir de la longueur redonnerait des numéros déjà pris par
 * une coupe maison créée entre-temps, et deux rencontres partageraient un
 * identifiant — donc un manager lancerait le match d'un autre.
 */
function prochainIdRencontre(etat: EtatCarriereEnLigne): string {
  const plusHaut = etat.rencontres.reduce((haut, r) => {
    const n = Number(r.id.slice(r.id.lastIndexOf(':') + 1));
    return Number.isFinite(n) && n > haut ? n : haut;
  }, 0);
  return `${etat.id}:rencontre:${plusHaut + 1}`;
}

function ajouterRencontres(etat: EtatCarriereEnLigne, competition: CompetitionCarriere, journee: number, paires: { domicile: string; exterieur: string }[], debut: number) {
  const intervalle = SEMAINE / etat.rythme;
  for (const paire of paires) etat.rencontres.push({ id: prochainIdRencontre(etat), competitionId: competition.id, journee, ...paire, ouvre: dateServeur(debut), ferme: dateServeur(debut + intervalle) });
}
function calendrierCompetition(etat: EtatCarriereEnLigne, competition: CompetitionCarriere) {
  const debut = Date.parse(competition.debut);
  if (competition.format === 'championnat') {
    const aller = affichesToutesRondes(competition.participants);
    const retour = aller.map(j => j.map(r => ({ domicile: r.exterieur, exterieur: r.domicile })));
    let ouverture = debut;
    (etat.publique ? aller : [...aller, ...retour]).forEach((paires, i) => {
      const horaires = horairesChampionnat(debut, etat.rythme, i, paires.length);
      paires.forEach((paire, index) => etat.rencontres.push({
        id: prochainIdRencontre(etat), competitionId: competition.id,
        journee: i + 1, ...paire, ouvre: dateServeur(ouverture), ferme: dateServeur(horaires[index]),
      }));
      // La journée suivante s'ouvre quand la dernière affiche de celle-ci se
      // ferme. Chaque rendez-vous a ainsi sa vraie date au lieu de réutiliser
      // le lancement de saison pendant tout le calendrier.
      ouverture = Math.max(...horaires);
    });
  } else if (competition.format === 'poules') {
    competition.poules ??= repartirPoules(competition.participants);
    competition.qualifies ??= nombreQualifiesPoules(competition.participants.length);
    const calendriers = competition.poules.map(poule => affichesToutesRondes(poule));
    const journees = Math.max(...calendriers.map(calendrier => calendrier.length));
    const intervalle = SEMAINE / etat.rythme;
    for (let journee = 0; journee < journees; journee++) {
      const paires = calendriers.flatMap(calendrier => calendrier[journee] ?? []);
      ajouterRencontres(etat, competition, journee + 1, paires, debut + journee * intervalle);
    }
    competition.journeesRegulieres = journees;
  } else {
    // Le tableau direct n'est utilisé que lorsque chaque tour peut être complet.
    const paires = Array.from({ length: Math.floor(competition.participants.length / 2) }, (_, i) => ({ domicile: competition.participants[i * 2], exterieur: competition.participants[i * 2 + 1] }));
    ajouterRencontres(etat, competition, 1, paires, debut);
  }
}

/**
 * Recale toutes les affiches encore intactes quand le commissaire change la
 * cadence. Les résultats et les directs en cours ne bougent jamais. Chaque
 * compétition est reprise depuis son dernier tour joué ; les tours suivants,
 * y compris ceux des coupes, utilisent immédiatement le nouveau rythme.
 */
export function replanifierCalendrier(etat: EtatCarriereEnLigne, maintenant: number): number {
  let modifiees = 0;
  for (const competition of etat.competitions.filter(c => c.etat === 'enCours')) {
    const matchs = etat.rencontres.filter(r => r.competitionId === competition.id);
    // Une journée est un bloc. Dès qu'une de ses affiches a commencé, la
    // cadence ne doit plus la rouvrir ni déplacer les autres matchs du même
    // tour : à l'écran cela ressemblait à une première journée rejouée. On
    // conserve donc toute la journée telle quelle et on ne recale que les
    // tours entièrement vierges qui viennent après.
    const journeesCommencees = new Set(matchs.filter(r => r.resultat || r.match).map(r => r.journee));
    const verrouilles = matchs.filter(r => journeesCommencees.has(r.journee));
    const futurs = matchs.filter(r => !journeesCommencees.has(r.journee) && !r.resultat && !r.match);
    if (!futurs.length) continue;

    const groupes = [...new Set(futurs.map(r => r.journee))]
      .map(journee => futurs.filter(r => r.journee === journee)
        .sort((a, b) => Date.parse(a.ferme) - Date.parse(b.ferme) || a.id.localeCompare(b.id)))
      .sort((a, b) => Date.parse(a[0].ferme) - Date.parse(b[0].ferme) || a[0].journee - b[0].journee);
    const derniereCloture = verrouilles.length
      ? Math.max(...verrouilles.map(r => Date.parse(r.ferme)).filter(Number.isFinite))
      : Number.NEGATIVE_INFINITY;
    const debutCompetition = Date.parse(competition.debut);
    const base = Math.max(maintenant, Number.isFinite(debutCompetition) ? debutCompetition : maintenant,
      Number.isFinite(derniereCloture) ? derniereCloture : maintenant);
    let ouverture = base;
    const decalage = verrouilles.length ? 1 : 0;

    groupes.forEach((groupe, index) => {
      const horaires = horairesChampionnat(base, etat.rythme, index + decalage, groupe.length);
      const ouvre = dateServeur(ouverture);
      groupe.forEach((rencontre, position) => {
        const ferme = dateServeur(horaires[position]);
        if (rencontre.ouvre !== ouvre || rencontre.ferme !== ferme) modifiees++;
        rencontre.ouvre = ouvre;
        rencontre.ferme = ferme;
      });
      ouverture = Math.max(...horaires);
    });
  }
  return modifiees;
}

/**
 * Répare l'ancien calendrier qui donnait la date de lancement de saison comme
 * ouverture à TOUTES les journées. Les clôtures étaient déjà correctes : on
 * les conserve, ainsi que chaque résultat, et la journée suivante s'ouvre à
 * la dernière clôture de la précédente.
 *
 * Cette réparation reste sûre après le début de la saison puisqu'elle ne
 * touche jamais une affiche jouée ou déjà lancée.
 */
export function reparerOuverturesCalendrier(etat: EtatCarriereEnLigne): number {
  let corrigees = 0;
  for (const competition of etat.competitions.filter(c => c.etat === 'enCours' && c.format === 'championnat')) {
    const matchs = etat.rencontres.filter(r => r.competitionId === competition.id);
    const journees = [...new Set(matchs.map(r => r.journee))].sort((a, b) => a - b);
    let ouverture = Date.parse(competition.debut);
    if (!Number.isFinite(ouverture)) continue;
    for (const journee of journees) {
      const affiches = matchs.filter(r => r.journee === journee);
      const date = dateServeur(ouverture);
      for (const rencontre of affiches) {
        if (!rencontre.match && !rencontre.resultat && rencontre.ouvre !== date) {
          rencontre.ouvre = date;
          corrigees++;
        }
      }
      const fermetures = affiches.map(r => Date.parse(r.ferme)).filter(Number.isFinite);
      if (fermetures.length) ouverture = Math.max(...fermetures);
    }
  }
  return corrigees;
}

/** Répare les calendriers déjà enregistrés par les anciennes règles, seulement tant qu'aucun match n'a commencé. */
function reparerCalendriers(etat: EtatCarriereEnLigne) {
  reparerOuverturesCalendrier(etat);
  for (const competition of etat.competitions.filter(c => c.etat === 'enCours')) {
    const matchs = etat.rencontres.filter(r => r.competitionId === competition.id);
    if (!matchs.length || matchs.some(r => r.match || r.resultat)) continue;
    const premierTour = matchs.filter(r => r.journee === 1).length;
    const journees = [...new Set(matchs.map(r => r.journee))];
    const ouvertures = new Set(journees.map(j => matchs.find(r => r.journee === j)?.ouvre));
    const championnatMalDate = competition.format === 'championnat' && journees.length > 1 && ouvertures.size < journees.length;
    const coupeAncienne = competition.format === 'elimination' && premierTour !== Math.floor(competition.participants.length / 2);
    const eliminationIrreguliere = competition.format === 'elimination' && !estPuissanceDeDeux(competition.participants.length);
    if (!championnatMalDate && !coupeAncienne && !eliminationIrreguliere) continue;
    if (eliminationIrreguliere) {
      competition.format = 'poules';
      competition.poules = repartirPoules(competition.participants);
      competition.qualifies = nombreQualifiesPoules(competition.participants.length);
    }
    etat.rencontres = etat.rencontres.filter(r => r.competitionId !== competition.id);
    calendrierCompetition(etat, competition);
    competition.journeesRegulieres = Math.max(...etat.rencontres.filter(r => r.competitionId === competition.id).map(r => r.journee));
  }
}

/**
 * Répare les phases finales d'anciennes versions :
 * 1. Résout définitivement tout match d'élimination terminé sur égalité sans vainqueur.
 * 2. Purge les affiches fantômes créées après la finale.
 * 3. Clôture les compétitions dont la finale est déjà jouée.
 */
function reparerPhasesFinales(etat: EtatCarriereEnLigne) {
  for (const c of etat.competitions) {
    const matchs = etat.rencontres.filter(r => r.competitionId === c.id);
    for (const r of matchs) {
      if (estMatchElimination(etat, r) && r.resultat) {
        if (!r.vainqueurId && !r.resultat.vainqueurId) {
          if (r.resultat.pointsD !== r.resultat.pointsE) {
            r.resultat.vainqueurId = r.resultat.pointsD > r.resultat.pointsE ? r.domicile : r.exterieur;
            r.vainqueurId = r.resultat.vainqueurId;
          } else {
            resoudreEgaliteElimination(r, `${etat.graine}:reparer:${r.id}`);
          }
        } else if (r.resultat.vainqueurId && !r.vainqueurId) {
          r.vainqueurId = r.resultat.vainqueurId;
        }
      }
    }

    if (c.format === 'elimination' || c.format === 'poules' || (c.format === 'championnat' && c.playoffs)) {
      const debutKnockout = c.format === 'poules' || c.format === 'championnat'
        ? (c.journeesRegulieres ?? 0) + 1
        : 1;
      const journeesKnockout = [...new Set(matchs.filter(r => r.journee >= debutKnockout).map(r => r.journee))].sort((a, b) => a - b);
      for (const j of journeesKnockout) {
        const affiches = matchs.filter(r => r.journee === j);
        if (affiches.length === 1 && affiches[0].resultat) {
          const finale = affiches[0];
          const champion = finale.vainqueurId ?? finale.resultat?.vainqueurId ?? (finale.resultat && finale.resultat.pointsD > finale.resultat.pointsE ? finale.domicile : finale.exterieur);
          const finaliste = finale.domicile === champion ? finale.exterieur : finale.domicile;
          const aSupprimer = matchs.filter(r => r.journee > j);
          if (aSupprimer.length) {
            const idsASupprimer = new Set(aSupprimer.map(r => r.id));
            etat.rencontres = etat.rencontres.filter(r => !idsASupprimer.has(r.id));
          }
          if (c.etat !== 'terminee') {
            cloturerCompetition(etat, c, champion, finaliste, Date.now());
          }
          break;
        }
      }
    }
  }
}
function demarrerSaison(etat: EtatCarriereEnLigne, maintenant: number) {
  exiger(etat.phase !== 'saison', 'La saison est déjà en cours.');
  exiger(etat.clubs.length >= 2, 'Invitez au moins un autre manager pour commencer.');
  exiger(!etat.publique || etat.clubs.length === etat.maxClubs, 'La division publique démarre à 16 clubs.');
  if (etat.phase === 'intersaison') etat.saison++;
  etat.phase = 'saison'; etat.debutSaison = dateServeur(maintenant);
  if (etat.publique) etat.publique.finLe = dateServeur(maintenant + 30 * JOUR);
  // Le coup d'envoi ouvre le robinet des packs quotidiens, pour tout le monde
  // le même jour.
  attribuerPacksQuotidiens(etat, maintenant);
  // Deux clubs donnent une finale ; au-delà, le tableau s'étend selon le
  // nombre réel d'inscrits, jusqu'aux seizièmes de finale.
  const playoffs = Boolean(etat.playoffs) && etat.clubs.length >= 2;
  const competition: CompetitionCarriere = {
    id: prochainId(etat, 'competition', etat.competitions.length),
    nom: `Championnat · saison ${etat.saison}`, trophee: nomTrophee(etat.tropheeId),
    logo: etat.logo, tropheeId: etat.tropheeId,
    format: 'championnat', participants: etat.clubs.map(c => c.id), saison: etat.saison,
    debut: dateServeur(maintenant), etat: 'enCours', playoffs,
    recompenseParticipation: 2000, recompenseVainqueur: 8000, recompenseFinaliste: 4000,
  };
  etat.competitions.push(competition); calendrierCompetition(etat, competition);
  competition.journeesRegulieres = Math.max(...etat.rencontres.filter(r => r.competitionId === competition.id).map(r => r.journee));
  if (etat.publique) {
    const participants = etat.clubs.map(c => c.id);
    const rng = hasard(`${etat.graine}:coupe:${etat.saison}`);
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }
    const coupe: CompetitionCarriere = {
      id: prochainId(etat, 'competition', etat.competitions.length),
      nom: `Coupe Destiny Rugby · Division ${etat.publique.division}`, trophee: 'Coupe Destiny Rugby',
      format: estPuissanceDeDeux(participants.length) ? 'elimination' : 'poules',
      participants, saison: etat.saison, debut: dateServeur(maintenant), etat: 'enCours',
      recompenseParticipation: 250, recompenseVainqueur: 2000, recompenseFinaliste: 1000,
    };
    etat.competitions.push(coupe); calendrierCompetition(etat, coupe);
  }
  renouvelerObjectifs(etat, maintenant);
}

export function classementCarriere(etat: EtatCarriereEnLigne, competitionId?: string): LigneClassementCarriere[] {
  const competition = competitionId ? etat.competitions.find(c => c.id === competitionId) : etat.competitions.find(c => c.saison === etat.saison && c.nom.startsWith('Championnat ·'));
  return classementCompetition(etat, competition?.id, competition?.participants ?? etat.clubs.map(c => c.id));
}

function classementCompetition(etat: EtatCarriereEnLigne, competitionId: string | undefined, participants: readonly string[], journeeMax = Infinity): LigneClassementCarriere[] {
  const lignes = participants.map(id => ({ clubId: id, nom: clubParId(etat, id).nom, points: 0, joues: 0, gagnes: 0, nuls: 0, perdus: 0, pour: 0, contre: 0, difference: 0, bonus: 0 }));
  const ids = new Set(participants);
  for (const rencontre of etat.rencontres.filter(r => r.competitionId === competitionId && r.journee <= journeeMax && ids.has(r.domicile) && ids.has(r.exterieur) && r.resultat)) {
    const r = rencontre.resultat!;
    for (const [id, points, contre, essais, essaisAdverses] of [[rencontre.domicile, r.pointsD, r.pointsE, r.essaisD, r.essaisE], [rencontre.exterieur, r.pointsE, r.pointsD, r.essaisE, r.essaisD]] as const) {
      const l = lignes.find(c => c.clubId === id)!; const victoire = points > contre, nul = points === contre;
      const { points: gagnes, bonus } = pointsDuMatch(BAREME_CLUBS, points, contre, essais, essaisAdverses);
      l.joues++; l.gagnes += +victoire; l.nuls += +nul; l.perdus += +(!victoire && !nul); l.points += gagnes;
      l.pour += points; l.contre += contre; l.difference = l.pour - l.contre; l.bonus += bonus;
    }
  }
  return lignes.sort((a, b) => b.points - a.points || b.difference - a.difference || b.pour - a.pour || (a.clubId < b.clubId ? -1 : 1));
}

const comparerInterPoules = (a: LigneClassementCarriere, b: LigneClassementCarriere) =>
  b.points * Math.max(1, a.joues) - a.points * Math.max(1, b.joues)
  || b.difference * Math.max(1, a.joues) - a.difference * Math.max(1, b.joues)
  || b.pour * Math.max(1, a.joues) - a.pour * Math.max(1, b.joues)
  || (a.clubId < b.clubId ? -1 : 1);

function qualificationsPoules(etat: EtatCarriereEnLigne, c: CompetitionCarriere) {
  const classements = c.poules!.map(poule => classementCompetition(etat, c.id, poule, c.journeesRegulieres));
  const qualifies: { ligne: LigneClassementCarriere; rang: number }[] = [];
  for (let rang = 0; qualifies.length < c.qualifies!; rang++) {
    const niveau = classements.map(poule => poule[rang]).filter((ligne): ligne is LigneClassementCarriere => Boolean(ligne)).sort(comparerInterPoules);
    qualifies.push(...niveau.slice(0, c.qualifies! - qualifies.length).map(ligne => ({ ligne, rang })));
  }
  const tetes = qualifies.slice(0, c.qualifies! / 2);
  const bas = qualifies.slice(c.qualifies! / 2);
  // Le meilleur repêché rencontre le meilleur premier, comme annoncé dans le
  // créateur. Les autres places basses sont ensuite prises du moins bon au meilleur.
  const repeches = bas.filter(q => q.rang >= 2).sort((a,b) => comparerInterPoules(a.ligne,b.ligne));
  const autres = bas.filter(q => q.rang < 2).reverse();
  return {
    classements,
    ordre: qualifies.map(q => q.ligne.clubId),
    repeches: repeches.map(q => q.ligne.clubId),
    paires: tetes.map((q,index) => ({ domicile:q.ligne.clubId, exterieur:(repeches[index] ?? autres[index - repeches.length]).ligne.clubId })),
  };
}

/**
 * ⚠️ TOUT LE MONDE TOUCHE, ET LE PODIUM DÉCROÎT. « Éviter que le premier
 * devienne encore plus imbattable simplement parce qu'il gagne davantage
 * d'Ovas. » Un club à zéro en fin de saison ne peut plus rien acheter, donc plus
 * rien négocier : il décroche pour de bon, et une ligue qui perd un manager en
 * perd deux. Le champion gagne surtout un trophée et une ligne d'histoire.
 *
 * Pour un championnat, `rangs` porte le classement final et la dotation
 * s'étale du premier au dernier ; pour une coupe, seuls le vainqueur et le
 * finaliste sont connus, et les autres reçoivent la participation.
 */
function cloturerCompetition(etat: EtatCarriereEnLigne, c: CompetitionCarriere, vainqueur: string, finaliste: string | undefined, maintenant: number, rangs?: string[]) {
  if (c.etat === 'terminee') return;
  c.etat = 'terminee'; c.vainqueur = vainqueur; c.finaliste = finaliste;
  const date = dateServeur(maintenant);
  for (const id of c.participants) {
    const club = clubParId(etat, id);
    const rang = rangs ? rangs.indexOf(id) : -1;
    const marches = Math.max(1, c.participants.length - 1);
    const bonus = id === vainqueur ? c.recompenseVainqueur
      : id === finaliste ? c.recompenseFinaliste
        // Décroissance linéaire du 3ᵉ jusqu'au dernier, qui touche zéro de bonus.
        : rang >= 2 ? Math.round(c.recompenseFinaliste * (1 - (rang - 1) / marches) / 100) * 100
          : 0;
    journal(etat, club, 'competition', c.recompenseParticipation + Math.max(0, bonus), [], `${c.nom} · récompense de compétition`, date);
  }
  etat.histoire.push({ competitionId: c.id, nom: c.nom, trophee: c.trophee, logo: c.logo, tropheeId: c.tropheeId, saison: c.saison, vainqueur, finaliste, date });
}

/** Indique si une rencontre fait partie d'une phase à élimination directe (coupe, phase finale ou play-offs). */
export function estMatchElimination(etat: EtatCarriereEnLigne, r: RencontreCarriere): boolean {
  const comp = etat.competitions.find(c => c.id === r.competitionId);
  if (!comp) return false;
  if (comp.format === 'elimination') return true;
  if (comp.format === 'poules') return r.journee > (comp.journeesRegulieres ?? 0);
  if (comp.format === 'championnat') return Boolean(comp.playoffs && comp.journeesRegulieres && r.journee > comp.journeesRegulieres);
  return false;
}

/**
 * Tranche une égalité en match à élimination directe selon les règles officielles du rugby :
 * 1. Prolongations (2 x 10 minutes) où des points peuvent être marqués.
 * 2. Si l'égalité persiste : séance de tirs au but (5 tirs puis mort subite) pour désigner un UNIQUE vainqueur.
 */
export function resoudreEgaliteElimination(
  r: RencontreCarriere,
  graineRng: string,
  forceD = 50,
  forceE = 50,
): void {
  if (!r.resultat) return;
  const rng = hasard(graineRng);
  const ecartForce = (forceD - forceE) / 50;

  // 1. Prolongations (20 min)
  const probaD = Math.max(0.15, Math.min(0.65, 0.35 + ecartForce * 0.15));
  const probaE = Math.max(0.15, Math.min(0.65, 0.35 - ecartForce * 0.15));
  const gain = () => (rng() < 0.25 ? 7 : rng() < 0.6 ? 3 : 5);
  const ptsD = rng() < probaD ? gain() : 0;
  const ptsE = rng() < probaE ? gain() : 0;

  r.resultat.ap = true;
  r.resultat.prolongations = { pointsD: ptsD, pointsE: ptsE };
  r.resultat.pointsD += ptsD;
  r.resultat.pointsE += ptsE;

  if (r.resultat.pointsD !== r.resultat.pointsE) {
    r.resultat.vainqueurId = r.resultat.pointsD > r.resultat.pointsE ? r.domicile : r.exterieur;
    r.vainqueurId = r.resultat.vainqueurId;
    return;
  }

  // 2. Tirs au but si toujours égalité après prolongations
  r.resultat.tab = true;
  let tirsD = 0;
  let tirsE = 0;
  const reussiteD = Math.max(0.55, Math.min(0.9, 0.75 + ecartForce * 0.08));
  const reussiteE = Math.max(0.55, Math.min(0.9, 0.75 - ecartForce * 0.08));

  for (let t = 0; t < 5; t++) {
    if (rng() < reussiteD) tirsD++;
    if (rng() < reussiteE) tirsE++;
  }

  let mortSubite = 0;
  while (tirsD === tirsE && mortSubite < 10) {
    mortSubite++;
    const butD = rng() < reussiteD;
    const butE = rng() < reussiteE;
    if (butD) tirsD++;
    if (butE) tirsE++;
    if (butD !== butE) break;
  }
  if (tirsD === tirsE) {
    if (rng() < 0.5) tirsD++; else tirsE++;
  }

  r.resultat.tirsAuBut = { tirsD, tirsE };
  r.resultat.vainqueurId = tirsD > tirsE ? r.domicile : r.exterieur;
  r.vainqueurId = r.resultat.vainqueurId;
}

/**
 * Renvoie le vainqueur certain d'une rencontre à élimination directe.
 * En cas de match d'élimination ancien non résolu terminé sur égalité, tranche
 * immédiatement et persiste le résultat.
 */
export function vainqueurRencontre(r: RencontreCarriere, etat?: EtatCarriereEnLigne): string {
  if (r.vainqueurId) return r.vainqueurId;
  if (r.resultat?.vainqueurId) {
    r.vainqueurId = r.resultat.vainqueurId;
    return r.vainqueurId;
  }
  if (!r.resultat) return r.domicile;
  if (r.resultat.pointsD !== r.resultat.pointsE) {
    const v = r.resultat.pointsD > r.resultat.pointsE ? r.domicile : r.exterieur;
    r.resultat.vainqueurId = v;
    r.vainqueurId = v;
    return v;
  }
  const graine = etat ? `${etat.graine}:tiebreak:${r.id}` : `tiebreak:${r.id}`;
  resoudreEgaliteElimination(r, graine);
  const vainqueur = r.resultat.vainqueurId ?? r.domicile;
  r.vainqueurId = vainqueur;
  return vainqueur;
}

function avancerCompetitions(etat: EtatCarriereEnLigne, maintenant: number) {
  for (const c of etat.competitions.filter(c => c.etat === 'enCours')) {
    const matchs = etat.rencontres.filter(r => r.competitionId === c.id);
    if (!matchs.length || matchs.some(r => !r.resultat)) continue;
    if (c.format === 'championnat') {
      const classement = classementCarriere(etat, c.id);
      const rangs = classement.map(l => l.clubId);
      // ⚠️ LA PHASE FINALE NE REJOUE PAS LA SAISON, ELLE LA COURONNE. Le
      // classement régulier garde la main sur l'ARGENT (chacun est payé à sa
      // place réelle) ; les playoffs décident du seul TROPHÉE. Sans ça, un
      // quatrième qui gagne la finale toucherait aussi la dotation du premier,
      // et vingt journées de championnat ne vaudraient plus rien.
      if (!c.playoffs || !c.journeesRegulieres) {
        cloturerCompetition(etat, c, classement[0].clubId, classement[1]?.clubId, maintenant, rangs);
        continue;
      }
      const derniere = Math.max(...matchs.map(r => r.journee));
      const gagnantDe = (r: RencontreCarriere) => vainqueurRencontre(r, etat);
      const debut = Math.max(...matchs.map(r => Date.parse(r.ferme)));
      if (derniere === c.journeesRegulieres) {
        const nombre = nombreQualifiesPlayoffs(rangs.length);
        ajouterRencontres(etat, c, derniere + 1, Array.from({length: nombre / 2}, (_, i) => ({domicile: rangs[i], exterieur: rangs[nombre - 1 - i]})), debut);
      } else if (matchs.filter(r => r.journee === derniere).length > 1) {
        const qualifies = matchs.filter(r => r.journee === derniere).map(gagnantDe).sort((a,b) => rangs.indexOf(a)-rangs.indexOf(b));
        ajouterRencontres(etat, c, derniere + 1, Array.from({length: qualifies.length / 2}, (_, i) => ({domicile: qualifies[i], exterieur: qualifies[qualifies.length - 1 - i]})), debut);
      } else {
        const finale = matchs.find(r => r.journee === derniere)!;
        const champion = gagnantDe(finale);
        cloturerCompetition(etat, c, champion,
          finale.domicile === champion ? finale.exterieur : finale.domicile, maintenant, rangs);
      }
    } else if (c.format === 'poules') {
      const derniere = Math.max(...matchs.map(r => r.journee));
      const classementReference = c.phaseFinaleSeed ?? c.participants;
      const gagnant = (r: RencontreCarriere) => vainqueurRencontre(r, etat);
      const debut = Math.max(...matchs.map(r => Date.parse(r.ferme)));
      if (derniere === c.journeesRegulieres) {
        const qualification = qualificationsPoules(etat,c);
        c.phaseFinaleSeed = qualification.ordre; c.repeches = qualification.repeches;
        ajouterRencontres(etat,c,derniere+1,qualification.paires,debut);
      } else {
        const tour = matchs.filter(r => r.journee === derniere);
        if (tour.length > 1) {
          const suivants = tour.map(gagnant).sort((a,b)=>classementReference.indexOf(a)-classementReference.indexOf(b));
          ajouterRencontres(etat,c,derniere+1,Array.from({length:suivants.length/2},(_,i)=>({domicile:suivants[i],exterieur:suivants[suivants.length-1-i]})),debut);
        } else {
          const finale=tour[0],champion=gagnant(finale);
          cloturerCompetition(etat,c,champion,finale.domicile===champion?finale.exterieur:finale.domicile,maintenant);
        }
      }
    } else {
      const derniere = Math.max(...matchs.map(r => r.journee));
      const tour = matchs.filter(r => r.journee === derniere);
      if (tour.length > 1) {
        const vainqueurs = tour.map(r => vainqueurRencontre(r, etat));
        const debut = Math.max(...matchs.map(r => Date.parse(r.ferme)));
        const paires: { domicile: string; exterieur: string }[] = [];
        for (let i = 0; i < vainqueurs.length; i += 2) {
          if (vainqueurs[i] && vainqueurs[i + 1]) {
            paires.push({ domicile: vainqueurs[i], exterieur: vainqueurs[i + 1] });
          }
        }
        if (paires.length > 0) {
          ajouterRencontres(etat, c, derniere + 1, paires, debut);
        }
      } else if (tour.length === 1) {
        const finale = tour[0];
        const champion = vainqueurRencontre(finale, etat);
        const finaliste = finale.domicile === champion ? finale.exterieur : finale.domicile;
        cloturerCompetition(etat, c, champion, finaliste, maintenant);
      }
    }
  }
  if (etat.phase === 'saison' && etat.competitions.filter(c => c.saison === etat.saison).every(c => c.etat === 'terminee')) etat.phase = 'intersaison';
}

function lancerRencontre(etat: EtatCarriereEnLigne, r: RencontreCarriere, maintenant: number, graine: string) {
  exiger(!r.resultat, 'Ce match est déjà terminé.');
  if (r.match) return;
  exiger(maintenant >= Date.parse(r.ouvre), 'La fenêtre de ce match n’est pas encore ouverte.');
  const equipe = (id: string) => {
    const club = clubParId(etat, id); ajusterComposition(etat, club, maintenant);
    const cartes = cartesClub(etat, id).filter(c => !c.blesseJusqua || Date.parse(c.blesseJusqua) <= maintenant);
    // ⚠️ LE COLLECTIF EST CALCULÉ LÀ OÙ LE MATCH SE PRÉPARE, et par le MÊME
    // module que celui qui l'affiche à l'écran de composition
    // (`collectifCarriere`). Deux formules donneraient un jour deux vérités :
    // un manager qui compose pour 78 de collectif et une équipe qui entre sur
    // le terrain avec autre chose.
    const equipeCollectif = collectifCarriere(cartes, club.composition);
    const affinites = equipeCollectif.parCarte;
    // ⚠️ UNE CARTE ABSENTE DE `parCarte` N'EST PAS UNE CARTE À ZÉRO POINT. Le
    // banc et la réserve ne sont pas comptés dans le collectif ; leur passer 0
    // leur infligerait la pénalité de −1 pour n'avoir pas été alignés, et un
    // remplaçant entrerait à la 60ᵉ minute avec une note rabotée sans raison.
    const collectif = (c: CarteCarriere) => (affinites[c.id] ? bonusCollectif(affinites[c.id].points) : 0);
    // ⚠️ LE COLLECTIF PART AUSSI ENTIER AU MOTEUR, et pas seulement réparti
    // dans les notes. Une note dit ce que vaut un joueur ; elle ne peut pas
    // dire que deux joueurs se comprennent. Les fautes de liaison — passe en
    // avant, ballon lâché à la réception, offload dans le vide — sont le seul
    // endroit du moteur où « ils se connaissent » a un sens, et c'est là que
    // le total d'équipe va (voir `erreurDeLiaison` dans `moteur/moteur.ts`).
    return { clubId: id, nom: club.nom, effectif: cartes.map(c => ({ ...coequipierDepuisCarte(c), note: Math.max(20, Math.min(99, c.note + collectif(c)) - Math.round(c.fatigue * .12)) })), composition: club.composition, strategie: club.strategie, collectif: equipeCollectif.total };
  };
  r.match = creerMatchEnLigne({ id: r.id, domicile: equipe(r.domicile), exterieur: equipe(r.exterieur), debut: maintenant, graine: Math.floor(hasard(`${graine}:${r.id}`)() * 2 ** 31) });
}

function enregistrerResultat(etat: EtatCarriereEnLigne, r: RencontreCarriere, maintenant: number, graine: string) {
  if (r.resultat || !r.match?.termine) return;
  const m = r.match;
  r.resultat = { pointsD: m.score.domicile, pointsE: m.score.exterieur, essaisD: m.essais.domicile, essaisE: m.essais.exterieur, penalitesD: m.penalites.domicile, penalitesE: m.penalites.exterieur, joueLe: dateServeur(maintenant), origine: m.debut >= Date.parse(r.ferme) ? 'absence' : 'direct' };

  if (estMatchElimination(etat, r)) {
    if (r.resultat.pointsD === r.resultat.pointsE) {
      const forceD = forceFeuille(r.match.equipes?.domicile.feuille ?? []);
      const forceE = forceFeuille(r.match.equipes?.exterieur.feuille ?? []);
      resoudreEgaliteElimination(r, `${graine}:elimination:${r.id}`, forceD || 50, forceE || 50);
    } else {
      r.resultat.vainqueurId = r.resultat.pointsD > r.resultat.pointsE ? r.domicile : r.exterieur;
      r.vainqueurId = r.resultat.vainqueurId;
    }
  }

  const rng = hasard(`${graine}:sante:${r.id}`);
  for (const cote of ['domicile', 'exterieur'] as const) {
    const autre = cote === 'domicile' ? 'exterieur' : 'domicile'; const club = clubParId(etat, r[cote]);
    const victoire = r.resultat.vainqueurId ? r.resultat.vainqueurId === r[cote] : m.score[cote] > m.score[autre];
    const nul = !r.resultat.vainqueurId && m.score[cote] === m.score[autre];
    // ⚠️ LE RAPPORT VICTOIRE / DÉFAITE EST LE VRAI RÉGLAGE ANTI-BOULE-DE-NEIGE,
    // pas le montant. Une grosse victoire rapporte 2 050 Ovas, une défaite sèche
    // 600 : trois fois et demie sur le meilleur des cas, deux fois sur le cas
    // courant. Doubler l'écart, et le premier de la ligue s'achète l'effectif
    // qui garantit qu'il restera premier. Le reste des Ovas vient de ce que tout
    // le monde touche — participation, objectifs, dotation de compétition.
    const performance = (m.essais[cote] >= 4 ? 150 : 0) + (victoire && m.essais[autre] === 0 ? 200 : 0)
      + (victoire && cote === 'exterieur' ? 100 : 0) + (m.score[cote] >= 30 ? 100 : 0);
    const bonus = (m.essais[cote] - m.essais[autre] >= 3 ? 150 : 0) + (!victoire && !nul && m.score[autre] - m.score[cote] <= 7 ? 100 : 0);
    journal(etat, club, 'match', 500 + (victoire ? 750 : nul ? 350 : 100) + bonus + performance, [], `${clubParId(etat, r.domicile).nom} ${r.resultat.pointsD} – ${r.resultat.pointsE} ${clubParId(etat, r.exterieur).nom}${r.resultat.tab ? ' (t.a.b.)' : r.resultat.ap ? ' (a.p.)' : ''}`, dateServeur(maintenant));
    const titulaires = new Set(club.composition.titulaires);
    for (const objectif of etat.objectifs.filter(o => o.clubId === club.id)) {
      if (objectif.type === 'participer') objectif.progression++;
      if (objectif.type === 'gagner') objectif.progression += +victoire;
      if (objectif.type === 'essais') objectif.progression += m.essais[cote];
      if (objectif.type === 'penalites') objectif.progression += m.penalites[cote];
      if (objectif.type === 'serie') objectif.progression = victoire ? objectif.progression + 1 : 0;
      if (objectif.type === 'formation' && etat.cartes.some(c => titulaires.has(c.id) && c.note < 60)) objectif.progression++;
    }
    // ⚠️ LA FEUILLE DE MATCH FAIT AUTORITÉ SUR QUI A JOUÉ, pas la composition.
    // Un remplaçant entré à la 50ᵉ a couru une demi-heure : le compter comme
    // resté au chaud lui donnerait une fraîcheur qu'il n'a pas, et son essai
    // ne serait crédité à personne. Les minutes réelles décident de tout.
    const minutes = new Map((m.feuille ?? []).map(l => [l.carteId, l]));
    for (const c of cartesClub(etat, club.id)) {
      c.fatigue = Math.max(0, c.fatigue - recuperationFatigueSelonRythme(etat.rythme));
      const ligne = minutes.get(c.id);
      if (!ligne && !titulaires.has(c.id)) continue;
      const jouees = ligne?.minutes ?? 80;
      c.matchs++; c.essais += ligne?.essais ?? 0;
      c.fatigue = Math.min(100, c.fatigue + Math.round(jouees * 0.4));
      if (rng() < .018 * (jouees / 80)) {
        const jours = 3 + Math.floor(rng() * 6);
        c.blesseJusqua = dateServeur(maintenant + dureeBlessureSelonRythme(jours, etat.rythme));
      }
    }
  }
  elaguerArchives(etat);
}

/**
 * ⚠️ UNE LIGUE NE GARDE PAS 380 FEUILLES DE MATCH EN MÉMOIRE.
 *
 * Une rencontre archivée pèse 17 Ko : le fil de commentaires (3,5 Ko) et
 * surtout la feuille de match, 46 lignes à 276 octets. Une saison à vingt clubs
 * compte 380 rencontres — soit 6,5 Mo de jsonb RÉÉCRITS à chaque lecture de la
 * ligue, et il y en a une toutes les deux secondes pendant un direct.
 *
 * On garde donc le détail des VINGT dernières rencontres jouées — celles dont
 * on parle encore — et on réduit les plus anciennes à ce qui fait l'histoire :
 * le score, les essais, les pénalités et les statistiques d'équipe. Rien n'est
 * perdu de ce qui compte : les statistiques individuelles ont été créditées aux
 * cartes au moment de l'archivage (`carte.matchs`, `carte.essais`), et elles y
 * restent pour toute la carrière du joueur.
 */
const ARCHIVES_DETAILLEES = 20;
function elaguerArchives(etat: EtatCarriereEnLigne) {
  const jouees = etat.rencontres.filter(r => r.resultat && r.match);
  for (const r of jouees.slice(0, Math.max(0, jouees.length - ARCHIVES_DETAILLEES))) {
    if (!r.match!.feuille && !r.match!.fil.length) continue;
    delete r.match!.feuille;
    r.match!.fil = [];
  }
}

function expirerMarche(etat: EtatCarriereEnLigne, maintenant: number) {
  const date = dateServeur(maintenant);
  for (const v of etat.ventes.filter(v => v.etat === 'ouverte' && !v.partagee && Date.parse(v.expireLe) <= maintenant)) {
    const carte = carteParId(etat, v.carteId);
    // Une enchère reste sous séquestre jusqu'à la fin d'un match déjà commencé.
    if (etat.rencontres.some(r => r.match && !r.resultat && [r.domicile, r.exterieur].some(id => id === v.vendeurId || id === v.enchere?.clubId))) continue;
    if (v.enchere) {
      const vendeur = clubParId(etat, v.vendeurId), acheteur = clubParId(etat, v.enchere.clubId);
      transferer(carte, acheteur, etat.saison); v.etat = 'vendue'; v.acheteurId = acheteur.id; v.joueurNom = carte.nom;
      journal(etat, vendeur, 'enchere', v.enchere.montant, [carte.id], `Vente aux enchères : ${carte.nom}`, date);
      journal(etat, acheteur, 'enchere', 0, [carte.id], `Enchère remportée : ${carte.nom} (${v.enchere.montant} Ovas déjà réservés)`, date);
      ajusterComposition(etat, vendeur, maintenant); ajusterComposition(etat, acheteur, maintenant);
    } else { v.etat = 'expiree'; delete carte.verrou; }
  }
  for (const e of etat.echanges.filter(e => e.etat === 'propose' && Date.parse(e.expireLe) <= maintenant)) {
    e.etat = 'expire'; for (const id of e.cartesDonnees) delete carteParId(etat, id).verrou;
    journal(etat, clubParId(etat, e.de), 'echange', e.ovasDonnes, [], 'Offre expirée : Ovas réservés restitués', date);
  }
}

/**
 * ⚠️ LES PACKS SONT COPIÉS DANS LA LIGUE, ET ÇA A DEUX CONSÉQUENCES OPPOSÉES.
 *
 * D'un côté c'est voulu : les prix et les probabilités d'une ligue en cours ne
 * doivent pas changer sous les pieds de ses membres parce qu'on a retouché le
 * catalogue. Une économie qui bouge en plein milieu d'une saison, c'est une
 * économie à laquelle personne ne fait confiance.
 *
 * De l'autre, sans rien, une ligue créée avant une mise à jour resterait
 * éternellement avec sept packs alors que le catalogue s'enrichit au fil des mises à jour.
 *
 * On complète donc, sans écraser : les packs ABSENTS sont ajoutés tels quels,
 * et pour ceux qui existent déjà on ne rafraîchit que la PRÉSENTATION (nom,
 * promesse, rayon, garantie annoncée). Le prix et les probabilités — ce qui
 * fait l'économie — restent ceux de la ligue.
 */
function completerPacks(etat: EtatCarriereEnLigne) {
  // Les packs d'événement vivent dans la boutique de packs spéciaux de la
  // Collection solo, jamais dans l'état d'une ligue.
  if (etat.packs.some(p => p.evenement)) etat.packs = etat.packs.filter(p => !p.evenement);
  for (const edition of Object.values(catalogueAdmin().packs)) {
    const i = etat.packs.findIndex(p => p.id === edition.id);
    if(i < 0) etat.packs.push(copier(edition)); else etat.packs[i] = copier(edition);
  }
  const connus = new Map(etat.packs.map(p => [p.id, p]));
  for (const modele of PACKS_CARRIERE) {
    if (catalogueAdmin().packs[modele.id]) continue;
    const existant = connus.get(modele.id);
    if (!existant) { etat.packs.push(copier(modele)); continue; }
    // Migration ciblée des anciens tarifs officiels ; conserver les réglages personnalisés.
    const anciens: Record<string, number> = {top14:2600, or:3200, elite:11000};
    if (existant.prix === anciens[modele.id]) {
      existant.prix = modele.prix;
      if (modele.id === 'top14' && existant.probabilites.elite === 11 && existant.probabilites.star === 1) existant.probabilites = copier(modele.probabilites);
    }
    existant.nom = modele.nom;
    existant.promesse = modele.promesse;
    existant.famille = modele.famille;
    existant.garantie = modele.garantie;
    existant.filtre = copier(modele.filtre);
  }
}

function avancerInterne(etat: EtatCarriereEnLigne, maintenant: number, graine: string) {
  // Un salon privé démarre après 48 heures avec au moins deux managers.
  // Une division publique attend toujours ses 16 clubs, sans limite de temps.
  if (etat.phase === 'salon' && (etat.publique
    ? etat.clubs.length === etat.maxClubs
    : etat.clubs.length >= 2 && Date.parse(etat.creeLe) + 2 * JOUR <= maintenant)) {
    demarrerSaison(etat, maintenant);
  }
  completerPacks(etat);
  attribuerPacksQuotidiens(etat, maintenant);
  renouvelerObjectifs(etat, maintenant);
  // La récupération est attachée aux dates des rencontres, pas au nombre d'actualisations.
  for (const c of etat.cartes) if (c.blesseJusqua && Date.parse(c.blesseJusqua) <= maintenant) delete c.blesseJusqua;
  for (const r of etat.rencontres) {
    if (r.resultat) continue;
    // ⚠️ LA FENÊTRE FERMÉE JOUE LE MATCH, MÊME SI PERSONNE N'EST VENU. C'est
    // l'invariant du mode : « un match ne doit jamais bloquer toute la ligue ».
    // Les compositions et les consignes enregistrées entraînent les deux
    // équipes, et c'est exactement le même moteur qu'en direct.
    if (!r.match && Date.parse(r.ferme) <= maintenant) {
      lancerRencontre(etat, r, Date.parse(r.ferme), `${etat.graine}:${r.id}`);
      r.match = avancerMatchEnLigne(r.match!, maintenant);
    } else if (r.match) {
      // Un direct lancé puis abandonné se termine tout seul : on ne laisse pas
      // une rencontre ouverte au-delà de sa durée réelle plus une heure.
      r.match = r.match.debut + DUREE_REELLE + HEURE < maintenant
        ? conclureMatchEnLigne(r.match)
        : avancerMatchEnLigne(r.match, maintenant);
    }
    enregistrerResultat(etat, r, maintenant, graine);
    if (r.resultat) renouvelerObjectifs(etat, maintenant);
  }
  expirerMarche(etat, maintenant); avancerCompetitions(etat, maintenant);
}

/** Appelé par lecture, cron et commande. Les résultats et récompenses sont idempotents. */
/**
 * L'état tel qu'il revient du stockage — copié, et complété de ce que les
 * versions précédentes n'écrivaient pas encore.
 *
 * ⚠️ UNE LIGUE EN BASE EST PLUS VIEILLE QUE LE CODE QUI LA RELIT. Le type dit
 * `dotationOvas: number`, et TypeScript le garantit… pour les états que ce
 * code a écrits. Les lignes enregistrées AVANT l'arrivée du champ n'ont rien à
 * cet endroit, et le compilateur ne peut rien y voir : c'est du jsonb.
 *
 * Ce qu'on a mesuré sans ce filet : un ami qui rejoint une ligue créée la
 * veille tombe sur `undefined.toLocaleString()`, l'API rend « Demande
 * invalide. », et la ligue devient impossible à rejoindre POUR TOUJOURS —
 * l'écran n'offre aucune issue et rien dans le message ne dit pourquoi.
 *
 * Le remplissage est écrit dans l'état retourné, donc la première commande
 * venue le persiste et le trou se referme de lui-même.
 */
function reprendre(etat: EtatCarriereEnLigne, maintenant: number): EtatCarriereEnLigne {
  const nouveau = copier(etat);
  if (!Number.isFinite(nouveau.dotationOvas)) nouveau.dotationOvas = DOTATION_DEFAUT;
  reparerIdentifiantsDoublons(nouveau);
  for (const club of nouveau.clubs) {
    if (!Number.isFinite(club.ovas)) club.ovas = 0;
    club.strategie = strategieValide(club.strategie);
  }
  actualiserCartesCatalogue(nouveau.cartes);
  nouveau.catalogueRevision = catalogueAdmin().revision;
  nouveau.rotationPacks = catalogueAdmin().rotationPacks === true;
  for (const club of nouveau.clubs) ajusterComposition(nouveau, club, maintenant);
  reparerCalendriers(nouveau);
  reparerPhasesFinales(nouveau);
  return nouveau;
}

export function avancerCarriere(etat: EtatCarriereEnLigne, maintenant: number, graine: string): EtatCarriereEnLigne {
  dateServeur(maintenant); const nouveau = reprendre(etat, maintenant); avancerInterne(nouveau, maintenant, graine);
  nouveau.version = etat.version + 1; return nouveau;
}

/**
 * Lecture rapide d'un direct : seul le match demandé passe dans le moteur.
 *
 * Une journée peut lancer dix rencontres à la même heure. Faire avancer les
 * dix à chaque sondage d'un seul spectateur multipliait le calcul par le nombre
 * de matchs, puis encore par le nombre de spectateurs. Les autres rencontres
 * sont prises en charge par leur propre direct et par l'horloge générale.
 * La fin du match repasse par l'avancée complète afin d'enregistrer résultat,
 * récompenses, fatigue et compétitions de façon atomique.
 */
export function avancerCarrierePourDirect(
  etat: EtatCarriereEnLigne,
  matchId: string,
  maintenant: number,
  graine: string,
): EtatCarriereEnLigne {
  dateServeur(maintenant);
  const cible = etat.rencontres.find(r => r.id === matchId);
  if (!cible || cible.resultat || cible.match?.termine) return { ...etat, version: etat.version + 1 };
  if (!cible.match) {
    return Date.parse(cible.ferme) <= maintenant
      ? avancerCarriere(etat, maintenant, graine)
      : { ...etat, version: etat.version + 1 };
  }
  // Ce match est regardé : sa caméra tourne (une instance qui le rejoue à froid filme d'emblée la fin).
  const match = avancerMatchEnLigne(cible.match, maintenant, true);
  if (match.termine) return avancerCarriere(etat, maintenant, graine);
  return {
    ...etat,
    version: etat.version + 1,
    rencontres: etat.rencontres.map(r => r.id === matchId ? { ...r, match } : r),
  };
}

export function agirCarriere(etat: EtatCarriereEnLigne, compteId: string, commande: CommandeCarriere, maintenant: number, graine: string, accesCombinaisonsBeta = false): EtatCarriereEnLigne {
  identifiant(compteId); dateServeur(maintenant);
  exiger(commande && typeof commande === 'object' && typeof commande.type === 'string', 'Commande invalide.');
  const strategieDemandee = commande.type === 'strategie' ? commande.strategie
    : commande.type === 'match' && commande.action?.type === 'strategie' ? commande.action.strategie : undefined;
  if (strategieDemandee) {
    const s = strategieValide(strategieDemandee);
    exiger(accesCombinaisonsBeta || (s.modeCombinaisons !== 'configure' && !s.combinaisons?.length), 'L’éditeur de combinaisons est en bêta privée sur le compte Kiri.');
  }
  exiger(!etat.publique?.finLe || maintenant < Date.parse(etat.publique.finLe) || commande.type === 'actualiser',
    'Cette saison publique est terminée. Retrouve ta nouvelle division dans le portail.');
  if (commande.type === 'laboratoireReinitialiser') {
    exiger(etat.laboratoire === true && compteId === etat.createurId, 'Commande réservée au laboratoire Kiri.');
    const createur = etat.clubs.find(c => c.compteId === compteId);
    exiger(createur, 'Créateur du laboratoire introuvable.');
    const neuf = creerLaboratoireCarriere({ id: etat.id, code: etat.code, compteId, pseudo: createur.pseudo }, maintenant, graine);
    neuf.version = etat.version + 1;
    return neuf;
  }
  const nouveau = reprendre(etat, maintenant); const date = dateServeur(maintenant);
  if (commande.type === 'rejoindre') {
    ajouterClub(nouveau, compteId, commande.pseudo, commande.clubNom, maintenant, graine, commande.embleme);
    attribuerPacksQuotidiens(nouveau, maintenant);
    if (nouveau.phase === 'salon' && (nouveau.publique
      ? nouveau.clubs.length === nouveau.maxClubs
      : Date.parse(nouveau.creeLe) + 2 * JOUR <= maintenant)) demarrerSaison(nouveau, maintenant);
  } else {
    const club = monClub(nouveau, compteId); avancerInterne(nouveau, maintenant, graine);
    switch (commande.type) {
      case 'changerEmblemePublic': {
        exiger(Boolean(nouveau.publique), 'Le logo ne peut être modifié que dans la ligue publique.');
        exiger(commande.embleme === undefined || emblemeValide(commande.embleme), 'Logo inconnu.');
        club.embleme = commande.embleme;
        break;
      }
      case 'celebrationVue': {
        exiger(nouveau.histoire.some(h => h.competitionId === commande.competitionId && h.saison === commande.saison && h.vainqueur === club.id), 'Trophée introuvable.');
        club.tropheesVus = [...new Set([...(club.tropheesVus ?? []), commande.competitionId + ':' + commande.saison])];
        break;
      }
      case 'actualiser': break;
      case 'demarrerSaison': exiger(!nouveau.publique && compteId === nouveau.createurId, 'La saison publique démarre automatiquement.'); demarrerSaison(nouveau, maintenant); break;
      case 'reglerCartesSpeciales': {
        exiger(!nouveau.publique && compteId === nouveau.createurId, 'Seul le créateur de la ligue peut régler les cartes spéciales.');
        exiger(typeof commande.active === 'boolean', 'Réglage invalide.');
        // ⚠️ ON N'ÉTEINT PAS CE QUI EST DÉJÀ DANS LES VESTIAIRES. Une ICON
        // achetée ne peut ni disparaître ni rester orpheline d'une règle qui
        // dirait « interdite ici » : une fois distribuées, elles restent permises.
        if (!commande.active) exiger(!nouveau.cartes.some(c => c.speciale), 'Des clubs possèdent déjà des cartes spéciales : elles restent autorisées dans cette ligue.');
        nouveau.cartesSpeciales = commande.active;
        break;
      }
      case 'modifierRythme': {
        exiger(!nouveau.publique && compteId === nouveau.createurId, 'La fréquence de la division publique est fixe.');
        entier(commande.rythme, 1, 7);
        nouveau.rythme = commande.rythme;
        replanifierCalendrier(nouveau, maintenant);
        break;
      }
      case 'laboratoireLancer': {
        exiger(nouveau.laboratoire === true && compteId === nouveau.createurId, 'Commande réservée au laboratoire Kiri.');
        identifiant(commande.matchId);
        const r = nouveau.rencontres.find(r => r.id === commande.matchId);
        exiger(r && !r.resultat, 'Cette rencontre ne peut pas être lancée.');
        exiger(!nouveau.rencontres.some(autre => autre.id !== r.id && autre.match && !autre.resultat
          && [autre.domicile, autre.exterieur].some(id => id === r.domicile || id === r.exterieur)), 'Un de ces clubs joue déjà un match.');
        r.ouvre = date;
        r.ferme = dateServeur(maintenant + DUREE_REELLE);
        lancerRencontre(nouveau, r, maintenant, `${nouveau.graine}:${r.id}:laboratoire`);
        break;
      }
      case 'laboratoireMinute': {
        exiger(nouveau.laboratoire === true && compteId === nouveau.createurId, 'Commande réservée au laboratoire Kiri.');
        identifiant(commande.matchId); entier(commande.minute, 1, 79);
        const r = nouveau.rencontres.find(r => r.id === commande.matchId);
        exiger(r?.match && !r.resultat && !r.match.termine, 'Lancez d’abord cette rencontre.');
        exiger(commande.minute > r.match.horloge, 'Choisissez une minute après l’horloge actuelle.');
        // Le moteur joue une marge d'autorité derrière l'heure : on l'ajoute pour tomber sur la minute demandée.
        r.match.debut = Math.round(maintenant - (commande.minute * 60 + MARGE_AUTORITE) * 1000);
        r.match = avancerMatchEnLigne(r.match, maintenant);
        break;
      }
      case 'laboratoireTerminer': {
        exiger(nouveau.laboratoire === true && compteId === nouveau.createurId, 'Commande réservée au laboratoire Kiri.');
        identifiant(commande.matchId);
        const r = nouveau.rencontres.find(r => r.id === commande.matchId);
        exiger(r?.match && !r.resultat, 'Lancez d’abord cette rencontre.');
        r.match = conclureMatchEnLigne(r.match);
        enregistrerResultat(nouveau, r, maintenant, graine);
        avancerCompetitions(nouveau, maintenant);
        break;
      }
      case 'laboratoireSoigner': {
        exiger(nouveau.laboratoire === true && compteId === nouveau.createurId, 'Commande réservée au laboratoire Kiri.');
        for (const carte of nouveau.cartes) { carte.fatigue = 0; delete carte.blesseJusqua; }
        break;
      }
      case 'laboratoireCrediter': {
        exiger(nouveau.laboratoire === true && compteId === nouveau.createurId, 'Commande réservée au laboratoire Kiri.');
        journal(nouveau, club, 'dotation', 100_000, [], 'Crédit de test du laboratoire', date);
        break;
      }
      case 'composition': clubLibre(nouveau, club.id); verifierComposition(nouveau, club, commande.composition, maintenant); club.composition = copier(commande.composition); club.buteurManuel = true; break;
      case 'sauvegarderComposition': {
        texte(commande.nom, 40);
        verifierComposition(nouveau, club, commande.composition, maintenant);
        club.compositionsSauvegardees ??= [];
        exiger(club.compositionsSauvegardees.length < 15, 'Tu as déjà 15 équipes sauvegardées. Supprime une équipe avant d’en créer une autre.');
        club.compositionsSauvegardees.push({ id: `${club.id}:composition:${nouveau.version + 1}`, nom: commande.nom.trim(), composition: copier(commande.composition) });
        break;
      }
      case 'supprimerComposition': {
        identifiant(commande.id);
        const avant = club.compositionsSauvegardees?.length ?? 0;
        club.compositionsSauvegardees = club.compositionsSauvegardees?.filter(c => c.id !== commande.id) ?? [];
        exiger(club.compositionsSauvegardees.length < avant, 'Équipe sauvegardée introuvable.');
        break;
      }
      // ⚠️ On n'enregistre JAMAIS la stratégie telle qu'elle arrive : une valeur
      // inconnue est remplacée par le défaut, jamais refusée. C'est la même
      // fonction que le match en direct, donc un seul endroit décide.
      case 'strategie': {
        club.strategie = strategieValide(commande.strategie);
        if (accesCombinaisonsBeta) for (const r of nouveau.rencontres) {
          if (!r.match || r.resultat || ![r.domicile, r.exterieur].includes(club.id)) continue;
          r.match = actualiserCahierMatchEnLigne(r.match, club.id, {
            modeCombinaisons: club.strategie.modeCombinaisons, combinaisons: club.strategie.combinaisons,
          }, maintenant);
        }
        break;
      }

      case 'ouvrirPack': identifiant(commande.packId); ouvrirPack(nouveau, club, commande.packId, maintenant, graine); break;
      case 'ouvrirPackGratuit': {
        identifiant(commande.attributionId);
        const attribution = club.packsGratuits?.find(pack => pack.id === commande.attributionId);
        exiger(attribution, 'Ce pack quotidien a déjà été ouvert ou n’existe pas.');
        ouvrirPack(nouveau, club, attribution.packId, maintenant, graine, true);
        club.packsGratuits = club.packsGratuits!.filter(pack => pack.id !== attribution.id);
        break;
      }
      // ⚠️ UNE SEULE VOIE POUR UNE CARTE OU POUR VINGT. Le lot n'est pas une
      // boucle sur la vente unitaire : le plancher d'effectif et la profondeur
      // aux postes se vérifient sur TOUS les sortants à la fois, sinon on
      // laisserait passer les premières ventes avant de refuser la dernière.
      case 'venteRapide':
      case 'venteRapideGroupee': {
        clubLibre(nouveau, club.id);
        const ids = commande.type === 'venteRapide' ? [commande.carteId] : commande.carteIds;
        exiger(Array.isArray(ids) && ids.length > 0, 'Choisissez au moins une carte à vendre.');
        exiger(ids.length <= LOT_VENTE_RAPIDE_MAX, `Vends au maximum ${LOT_VENTE_RAPIDE_MAX} joueurs à la fois.`);
        listeIds(ids, LOT_VENTE_RAPIDE_MAX);
        const lot = ids.map(id => carteParId(nouveau, id));
        for (const carte of lot) exiger(carte.proprietaire === club.id && !carte.verrou, `${carte.nom} ne peut pas être vendu rapidement.`);
        verifierHorsFeuille(nouveau, club, ids, 'vente'); verifierDepart(nouveau, club.id, ids);
        const valeur = lot.reduce((total, carte) => total + valeurVenteRapide(carte), 0);
        const libelle = lot.length === 1 ? `Vente rapide : ${lot[0].nom}` : `Vente rapide : ${lot.length} joueurs`;
        journal(nouveau, club, 'venteRapide', valeur, ids, libelle, date);
        const partants = new Set(ids);
        nouveau.cartes = nouveau.cartes.filter(c => !partants.has(c.id));
        ajusterComposition(nouveau, club, maintenant);
        break;
      }
      case 'vendre': {
        clubLibre(nouveau, club.id); identifiant(commande.carteId); entier(commande.prix, 1); entier(commande.dureeHeures, 1, 168);
        exiger(commande.mode === 'directe' || commande.mode === 'enchere', 'Type de vente invalide.');
        const carte = carteParId(nouveau, commande.carteId); exiger(carte.proprietaire === club.id && !carte.verrou, 'Cette carte ne peut pas être mise en vente.');
        exiger(carteSurMarcheAutorisee(carte, nouveau.cartesSpeciales === true), 'Cette carte spéciale ne peut pas être mise sur le marché.');
        verifierHorsFeuille(nouveau, club, [carte.id], 'vente'); verifierDepart(nouveau, club.id, [carte.id]); const id = prochainId(nouveau, 'vente', nouveau.ventes.length); carte.verrou = id;
        nouveau.ventes.push({ id, carteId: carte.id, vendeurId: club.id, type: commande.mode, prix: commande.prix, expireLe: dateServeur(maintenant + commande.dureeHeures * HEURE), etat: 'ouverte',
          ...(commande.partagee === true && nouveau.publique ? { partagee: true } : {}) }); break;
      }
      case 'acheter': {
        const v = nouveau.ventes.find(v => v.id === commande.venteId); exiger(v && v.etat === 'ouverte' && v.type === 'directe' && Date.parse(v.expireLe) > maintenant, 'Cette vente n’est plus disponible.');
        exiger(!v.partagee, MARCHE_COMMUN_SEUL);
        exiger(v.vendeurId !== club.id, 'Vous ne pouvez pas acheter votre propre carte.'); clubLibre(nouveau, club.id); clubLibre(nouveau, v.vendeurId);
        const vendeur = clubParId(nouveau, v.vendeurId), carte = carteParId(nouveau, v.carteId);
        exiger(carte.proprietaire === vendeur.id && carte.verrou === v.id, 'La propriété de cette carte a changé.');
        exiger(carteSurMarcheAutorisee(carte, nouveau.cartesSpeciales === true), 'Cette carte spéciale n’est plus proposée sur le marché.');
        journal(nouveau, club, 'vente', -v.prix, [carte.id], `Achat : ${carte.nom}`, date); journal(nouveau, vendeur, 'vente', v.prix, [carte.id], `Vente : ${carte.nom}`, date);
        transferer(carte, club, nouveau.saison); v.etat = 'vendue'; v.acheteurId = club.id; v.joueurNom = carte.nom;
        ajusterComposition(nouveau, vendeur, maintenant); ajusterComposition(nouveau, club, maintenant); break;
      }
      case 'encherir': {
        entier(commande.montant, 1); const v = nouveau.ventes.find(v => v.id === commande.venteId);
        exiger(v && v.etat === 'ouverte' && v.type === 'enchere' && Date.parse(v.expireLe) > maintenant, 'Cette enchère est fermée.'); exiger(v.vendeurId !== club.id, 'Vous ne pouvez pas enchérir sur votre carte.');
        exiger(!v.partagee, MARCHE_COMMUN_SEUL);
        exiger(carteSurMarcheAutorisee(carteParId(nouveau, v.carteId), nouveau.cartesSpeciales === true), 'Cette carte spéciale n’est plus proposée sur le marché.');
        exiger(commande.montant >= (v.enchere ? v.enchere.montant + Math.max(25, Math.ceil(v.enchere.montant * .05)) : v.prix), 'Votre offre doit dépasser la meilleure enchère d’au moins 5 % (minimum 25 Ovas).');
        if (v.enchere) journal(nouveau, clubParId(nouveau, v.enchere.clubId), 'enchere', v.enchere.montant, [], 'Enchère dépassée : Ovas restitués', date);
        journal(nouveau, club, 'enchere', -commande.montant, [], 'Ovas réservés pour une enchère', date); v.enchere = { clubId: club.id, montant: commande.montant }; break;
      }
      case 'annulerVente': {
        const v = nouveau.ventes.find(v => v.id === commande.venteId); exiger(v && v.vendeurId === club.id && v.etat === 'ouverte' && !v.enchere, 'Cette vente ne peut pas être annulée.');
        exiger(!v.partagee, MARCHE_COMMUN_SEUL);
        v.etat = 'annulee'; delete carteParId(nouveau, v.carteId).verrou; break;
      }
      case 'proposerEchange': {
        clubLibre(nouveau, club.id); listeIds(commande.cartesDonnees, 10); listeIds(commande.cartesDemandees, 10); entier(commande.ovasDonnes); entier(commande.ovasDemandes);
        exiger(commande.vers !== club.id, 'Choisissez un autre club.'); const destinataire = clubParId(nouveau, commande.vers);
        exiger(commande.cartesDonnees.length + commande.cartesDemandees.length > 0, 'Un échange doit contenir au moins une carte.');
        exiger(nouveau.echanges.filter(e => e.de === club.id && e.etat === 'propose').length < 10, 'Vous avez déjà dix offres en cours.');
        for (const id of [...commande.cartesDonnees, ...commande.cartesDemandees]) exiger(!carteParId(nouveau, id).speciale || nouveau.cartesSpeciales === true, 'Les cartes spéciales ne s’échangent pas dans cette ligue.');
        for (const id of commande.cartesDonnees) { const c = carteParId(nouveau, id); exiger(c.proprietaire === club.id && !c.verrou, 'Une carte proposée est indisponible.'); }
        for (const id of commande.cartesDemandees) { const c = carteParId(nouveau, id); exiger(c.proprietaire === destinataire.id && !c.verrou, 'Une carte demandée est indisponible.'); }
        verifierDepart(nouveau, club.id, commande.cartesDonnees, commande.cartesDemandees); verifierDepart(nouveau, destinataire.id, commande.cartesDemandees, commande.cartesDonnees);
        const id = prochainId(nouveau, 'echange', nouveau.echanges.length);
        nouveau.echanges.push({ id, de: club.id, vers: destinataire.id, cartesDonnees: [...commande.cartesDonnees], cartesDemandees: [...commande.cartesDemandees], ovasDonnes: commande.ovasDonnes, ovasDemandes: commande.ovasDemandes, expireLe: dateServeur(maintenant + 48 * HEURE), etat: 'propose' });
        commande.cartesDonnees.forEach(c => { carteParId(nouveau, c).verrou = id; }); journal(nouveau, club, 'echange', -commande.ovasDonnes, [], 'Ovas réservés pour une proposition d’échange', date); break;
      }
      case 'repondreEchange':
      case 'annulerEchange': {
        const e = nouveau.echanges.find(e => e.id === commande.echangeId); exiger(e && e.etat === 'propose' && Date.parse(e.expireLe) > maintenant, 'Cette offre n’est plus disponible.');
        const annule = commande.type === 'annulerEchange'; exiger(annule ? e.de === club.id : e.vers === club.id, 'Vous ne pouvez pas répondre à cette offre.');
        if (!annule) exiger(typeof commande.accepter === 'boolean', 'Réponse invalide.');
        const emetteur = clubParId(nouveau, e.de), destinataire = clubParId(nouveau, e.vers);
        if (!annule && commande.accepter) {
          clubLibre(nouveau, e.de); clubLibre(nouveau, e.vers);
          for (const id of e.cartesDonnees) { const c = carteParId(nouveau, id); exiger(c.proprietaire === e.de && c.verrou === e.id, 'Une carte proposée n’est plus disponible.'); }
          for (const id of e.cartesDemandees) { const c = carteParId(nouveau, id); exiger(c.proprietaire === e.vers && !c.verrou, 'Une carte demandée n’est plus disponible.'); }
          verifierHorsFeuille(nouveau, emetteur, e.cartesDonnees); verifierHorsFeuille(nouveau, destinataire, e.cartesDemandees);
          verifierDepart(nouveau, e.de, e.cartesDonnees, e.cartesDemandees); verifierDepart(nouveau, e.vers, e.cartesDemandees, e.cartesDonnees);
          // Les Ovas entrants ne servent pas à garantir les Ovas promis : le solde doit exister.
          exiger(destinataire.ovas >= e.ovasDemandes, 'Le destinataire ne dispose plus des Ovas nécessaires.');
          journal(nouveau, destinataire, 'echange', e.ovasDonnes - e.ovasDemandes, [...e.cartesDonnees, ...e.cartesDemandees], 'Échange accepté', date);
          journal(nouveau, emetteur, 'echange', e.ovasDemandes, [...e.cartesDonnees, ...e.cartesDemandees], 'Échange accepté (Ovas donnés déjà réservés)', date);
          e.cartesDonnees.forEach(id => transferer(carteParId(nouveau, id), destinataire, nouveau.saison)); e.cartesDemandees.forEach(id => transferer(carteParId(nouveau, id), emetteur, nouveau.saison)); e.etat = 'accepte';
          ajusterComposition(nouveau, emetteur, maintenant); ajusterComposition(nouveau, destinataire, maintenant);
        } else {
          e.etat = annule ? 'annule' : 'refuse'; e.cartesDonnees.forEach(id => { delete carteParId(nouveau, id).verrou; });
          journal(nouveau, emetteur, 'echange', e.ovasDonnes, [], 'Offre close : Ovas réservés restitués', date);
        }
        break;
      }
      /**
       * ⚠️ LE FAVORI EST UN GARDE-FOU, PAS UN VERROU. Il n'empêche AUCUNE
       * vente : la carte se vend, s'échange, se brade encore d'un clic. Il la
       * retire seulement de « Tout cocher », le geste qui coche cinquante
       * joueurs d'un coup et où l'on ne relit pas la liste. C'est là qu'on
       * perd son meilleur ailier, pas dans une vente qu'on a choisie.
       *
       * ⚠️ ET IL VIT SUR LE SERVEUR, pas dans le navigateur. Une marque rangée
       * en `localStorage` disparaîtrait au changement de téléphone et ne
       * suivrait pas le manager qui joue sur deux écrans — alors qu'elle vaut
       * précisément pour la session où l'on vide son effectif à la hâte.
       */
      case 'favori': {
        identifiant(commande.carteId);
        const carte = carteParId(nouveau, commande.carteId);
        exiger(carte.proprietaire === club.id, 'Cette carte ne t’appartient pas.');
        if (commande.valeur) carte.favori = true; else delete carte.favori;
        break;
      }
      case 'reclamerObjectif': {
        const o = nouveau.objectifs.find(o => o.id === commande.objectifId); exiger(o && o.clubId === club.id && !o.reclame && o.progression >= o.cible, 'Cet objectif ne peut pas être réclamé.');
        o.reclame = true; journal(nouveau, club, 'objectif', o.recompense, [], o.libelle, date); break;
      }
      case 'creerCoupe': {
        exiger(!nouveau.publique && compteId === nouveau.createurId, 'La coupe de division est créée automatiquement.'); exiger(nouveau.phase === 'saison', 'Lancez une saison avant de créer une coupe.');
        texte(commande.nom); texte(commande.trophee); listeIds(commande.participants); exiger(commande.participants.length >= 2, 'Une coupe nécessite au moins deux clubs.'); commande.participants.forEach(id => clubParId(nouveau, id));
        exiger(commande.format === 'elimination' || commande.format === 'championnat' || commande.format === 'poules', 'Format de coupe invalide.');
        if (commande.format === 'poules') exiger(commande.participants.length >= 3, 'Une phase de poules nécessite au moins trois clubs.');
        // Le commissaire fixe librement le cash prize. La seule borne restante
        // est celle des entiers sûrs, indispensable pour que les soldes et les
        // transactions ne perdent jamais de précision en base.
        entier(commande.recompenseParticipation, 0, Number.MAX_SAFE_INTEGER);
        entier(commande.recompenseVainqueur, 0, Number.MAX_SAFE_INTEGER);
        entier(commande.recompenseFinaliste, 0, Number.MAX_SAFE_INTEGER);
        exiger(Number.isSafeInteger(commande.recompenseParticipation + commande.recompenseVainqueur)
          && Number.isSafeInteger(commande.recompenseParticipation + commande.recompenseFinaliste), 'Cash prize trop élevé.');
        exiger(typeof commande.debut === 'string' && Number.isFinite(Date.parse(commande.debut)) && Date.parse(commande.debut) >= maintenant && Date.parse(commande.debut) <= maintenant + 90 * JOUR, 'La coupe doit débuter dans les 90 prochains jours.');
        exiger(nouveau.competitions.filter(c => c.saison === nouveau.saison).length < 3, 'Deux coupes par saison au maximum pour préserver l’économie.');
        // Un tableau direct reste parfait à 4, 8, 16… Pour 10 ou tout autre
        // nombre irrégulier, les poules évitent les exemptions arbitraires.
        const format = commande.format === 'elimination' && !estPuissanceDeDeux(commande.participants.length) ? 'poules' : commande.format;
        const rangChampionnat = new Map(classementCarriere(nouveau).map((ligne, index) => [ligne.clubId, index]));
        const participants = [...commande.participants].sort((a, b) => (rangChampionnat.get(a) ?? 999) - (rangChampionnat.get(b) ?? 999));
        const c: CompetitionCarriere = { id: prochainId(nouveau, 'competition', nouveau.competitions.length), nom: commande.nom.trim(), trophee: commande.trophee.trim(), format, participants, saison: nouveau.saison, debut: new Date(commande.debut).toISOString(), etat: 'enCours', recompenseParticipation: commande.recompenseParticipation, recompenseVainqueur: commande.recompenseVainqueur, recompenseFinaliste: commande.recompenseFinaliste,
          logo: logoCompetitionValide(commande.logo) ? commande.logo : undefined,
          tropheeId: tropheeValide(commande.tropheeId) ? commande.tropheeId : undefined,
          playoffs: format === 'championnat' && commande.playoffs === true && commande.participants.length >= 2,
          poules: format === 'poules' ? repartirPoules(participants) : undefined,
          qualifies: format === 'poules' ? nombreQualifiesPoules(commande.participants.length) : undefined };
        nouveau.competitions.push(c); calendrierCompetition(nouveau, c);
        c.journeesRegulieres = Math.max(...nouveau.rencontres.filter(r => r.competitionId === c.id).map(r => r.journee));
        break;
      }
      case 'lancerMatch':
      case 'match': {
        const r = nouveau.rencontres.find(r => r.id === commande.matchId); exiger(r && [r.domicile, r.exterieur].includes(club.id), 'Vous ne pouvez gérer que votre propre rencontre.');
        exiger(!r.resultat, 'Ce match est déjà terminé.');
        if (!r.match) { exiger(maintenant >= Date.parse(r.ferme), 'Le match débutera automatiquement à l’heure prévue.'); clubLibre(nouveau, r.domicile); clubLibre(nouveau, r.exterieur); lancerRencontre(nouveau, r, Date.parse(r.ferme), `${nouveau.graine}:${r.id}`); }
        if (commande.type === 'match') r.match = commanderMatchEnLigne(r.match!, club.id, commande.action, maintenant);
        enregistrerResultat(nouveau, r, maintenant, graine); avancerCompetitions(nouveau, maintenant); break;
      }
      default: throw new ErreurCarriere('Commande inconnue.');
    }
  }
  nouveau.version = etat.version + 1; return nouveau;
}

/**
 * L'état tel qu'on le COMPARE avant d'écrire, débarrassé de ce qu'une simple
 * lecture recalcule.
 *
 * ⚠️ SANS ELLE, REGARDER UN MATCH RÉÉCRIT LA LIGUE TOUTES LES DEUX SECONDES.
 * Un direct fait bouger l'horloge, le fil et les statistiques à chaque
 * sondage : l'état produit n'est jamais identique au précédent, donc les 300 à
 * 400 Ko de la ligue repartaient vers la base deux mille quatre cents fois par
 * rencontre. Or ces champs dérivés ne sont PAS de l'information : ils se
 * reconstruisent intégralement de la graine, des feuilles gelées et du journal
 * — c'est tout le principe de `matchCarriere.ts`, « on ne stocke pas un match,
 * on stocke de quoi le rejouer ». Le score fait exception : chaque changement
 * est enregistré pour que toutes les instances serveur partagent le même
 * résultat après une actualisation ou une reconnexion.
 *
 * ⚠️ ET CE QUI EST VRAIMENT NOUVEAU DÉCLENCHE TOUJOURS UNE ÉCRITURE : un ordre
 * au journal, une décision en attente avec sa date limite, le gel du chrono
 * (une fois la décision tombée : voir `gelDerive`), la
 * présence d'un manager, et bien sûr la sirène (`termine`) avec le score final.
 * Un match TERMINÉ garde donc tous ses champs comparés : son fil et sa feuille
 * sont, eux, la seule trace qui restera.
 */
const DERIVES_DU_DIRECT = ['horloge', 'essais', 'penalites', 'fil', 'stats', 'decision', 'gel'] as const;

/**
 * ⚠️ UNE DÉCISION EN ATTENTE N'EST PLUS UNE INFORMATION, ELLE SE DÉDUIT
 * (Correctif 24). Toutes les instances arrêtent le moteur au même pas — la
 * veille des bancs est au journal — et lisent donc la même pénalité à trancher,
 * avec la même échéance. L'écrire coûtait une réécriture de la ligue entière
 * par décision, et c'était surtout la porte d'entrée des matchs divergents :
 * l'instance qui l'apprenait en retard avait déjà joué la suite. Ce qui
 * s'écrit, c'est le CHOIX (au journal), une fois.
 */

export function empreinteEcriture(etat: EtatCarriereEnLigne, version: number): string {
  return JSON.stringify({
    ...etat,
    version,
    rencontres: etat.rencontres.map((r) => {
      if (!r.match || r.match.termine) return r;
      const durable: Record<string, unknown> = { ...r.match };
      for (const cle of DERIVES_DU_DIRECT) delete durable[cle];
      return { ...r, match: durable };
    }),
  });
}

/** Égalité de contenu, au sens du JSON : une clé `undefined` est une clé absente. */
function memeContenu(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const tableau = Array.isArray(a);
  if (tableau !== Array.isArray(b)) return false;
  if (tableau) {
    const x = a as unknown[], y = b as unknown[];
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (!memeContenu(x[i], y[i])) return false;
    return true;
  }
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  for (const cle in x) if (x[cle] !== undefined && !memeContenu(x[cle], y[cle])) return false;
  for (const cle in y) if (y[cle] !== undefined && x[cle] === undefined) return false;
  return true;
}

/**
 * La question que pose `empreinteEcriture` — « y a-t-il quelque chose à
 * écrire ? » — SANS sérialiser la ligue.
 *
 * ⚠️ DEUX `JSON.stringify` DE 300 À 400 Ko PAR TICK, c'était la moitié du temps
 * de calcul d'un direct (mesuré au profileur). Or un tick ne recopie que ce
 * qu'il touche : tout le reste de l'état est le MÊME objet qu'avant. On descend
 * donc seulement là où les références diffèrent — une rencontre, son match,
 * quelques champs — et on répond en quelques microsecondes.
 *
 * Même règle que l'empreinte, champ pour champ ; `npm run verify:ecriture-direct`
 * rejoue des matchs entiers et vérifie que les deux répondent pareil.
 */
export function memeEtatDurable(avant: EtatCarriereEnLigne, apres: EtatCarriereEnLigne): boolean {
  if (avant === apres) return true;
  const x = avant as unknown as Record<string, unknown>, y = apres as unknown as Record<string, unknown>;
  for (const cle of new Set([...Object.keys(x), ...Object.keys(y)])) {
    if (cle === 'version' || x[cle] === y[cle]) continue;
    if (cle !== 'rencontres') { if (!memeContenu(x[cle], y[cle])) return false; continue; }
    const a = avant.rencontres, b = apres.rencontres;
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!memeRencontreDurable(a[i], b[i])) return false;
  }
  return true;
}

function memeRencontreDurable(a: RencontreCarriere, b: RencontreCarriere): boolean {
  if (a === b) return true;
  const x = a as unknown as Record<string, unknown>, y = b as unknown as Record<string, unknown>;
  for (const cle of new Set([...Object.keys(x), ...Object.keys(y)])) {
    if (x[cle] === y[cle]) continue;
    const enCours = cle === 'match' && a.match && b.match && !a.match.termine && !b.match.termine;
    if (!enCours) { if (!memeContenu(x[cle], y[cle])) return false; continue; }
    const m = a.match as unknown as Record<string, unknown>, n = b.match as unknown as Record<string, unknown>;
    for (const champ of new Set([...Object.keys(m), ...Object.keys(n)])) {
      if ((DERIVES_DU_DIRECT as readonly string[]).includes(champ)) continue;
      if (!memeContenu(m[champ], n[champ])) return false;
    }
  }
  return true;
}

function statistiquesLigue(etat: EtatCarriereEnLigne) {
  const cartes = new Map(etat.cartes.map(c => [c.id, c]));
  const parClub = etat.clubs.map(club => ({
    clubId: club.id, pseudo: club.pseudo, nom: club.nom,
    packs: etat.transactions.filter(t => t.clubId === club.id && t.nature === 'pack').length,
  })).sort((a, b) => b.packs - a.packs || a.pseudo.localeCompare(b.pseudo, 'fr'));
  const packs = etat.transactions.filter(t => t.nature === 'pack');
  const candidats = packs.map(t => {
    const meilleureCarte = t.cartes.map(id => cartes.get(id)).filter((c): c is CarteCarriere => Boolean(c)).sort((a, b) => b.note - a.note)[0];
    const club = etat.clubs.find(c => c.id === t.clubId);
    const note = t.meta?.meilleureNote ?? meilleureCarte?.note;
    if (!club || note == null) return null;
    return { clubId: club.id, pseudo: club.pseudo, pack: t.meta?.packNom ?? t.libelle.split(':')[0].replace(/^Pack quotidien offert$/, 'Pack quotidien'),
      apparence: t.meta?.packApparence ?? meilleureCarte?.rarete ?? 'bronze' as const, note,
      joueur: t.meta?.meilleurJoueur ?? meilleureCarte?.nom ?? 'Joueur', portrait: t.meta?.meilleurPortrait ?? meilleureCarte?.photo, date: t.date };
  }).filter((x): x is NonNullable<typeof x> => Boolean(x)).sort((a, b) => b.note - a.note || b.date.localeCompare(a.date));
  const achats = etat.ventes.filter(v => v.etat === 'vendue' && v.acheteurId).map(v => {
    const club = etat.clubs.find(c => c.id === v.acheteurId);
    if (!club) return null;
    return { clubId: club.id, pseudo: club.pseudo, joueur: v.joueurNom ?? cartes.get(v.carteId)?.nom ?? 'Joueur du marché',
      montant: v.type === 'enchere' ? v.enchere?.montant ?? v.prix : v.prix,
      date: v.expireLe };
  }).filter((x): x is NonNullable<typeof x> => Boolean(x)).sort((a, b) => b.montant - a.montant);
  return { packsOuverts: packs.length, parClub,
    meilleurOuvreur: parClub[0]?.packs ? { clubId: parClub[0].clubId, pseudo: parClub[0].pseudo, packs: parClub[0].packs } : undefined,
    meilleurPack: candidats[0], plusGrosAchat: achats[0] };
}

// ═══════════════════════════════════════════════════════════════════════════
// LE MARCHÉ COMMUN DES DIVISIONS PUBLIQUES — ce qu'il fait dans UNE ligue
// ═══════════════════════════════════════════════════════════════════════════
//
// Une annonce partagée se conclut entre DEUX ligues (celle du vendeur, celle de l'acheteur) et un document commun qui
// arbitre (`marchePartage.ts`). Aucune écriture ne couvre les trois : chaque étape est donc une opération sur une seule
// ligue, REJOUABLE SANS EFFET — le serveur les reprend tant que le document commun dit qu'elles restent à faire.
//
// ⚠️ CE NE SONT PAS DES COMMANDES. Aucune n'est dans `agirCarriere` : un client ne peut ni se livrer une carte, ni se
// rembourser. Seul `serveur/marcheCommun.ts` les appelle, après avoir fait trancher le document commun.

const MARCHE_COMMUN_SEUL = 'Cette annonce se traite sur le marché commun des divisions.';

export type OperationMarche =
  /** L'acheteur ou l'enchérisseur paie d'avance : ses Ovas sont réservés sous `ref`. */
  | { type: 'reserver'; compteId: string; ref: string; montant: number; libelle: string; carte: Pick<CarteCarriere, 'sourceId' | 'speciale'>;
      /** Un achat ferme demande une équipe qui ne joue pas ; une enchère, non (comme dans une ligue). */
      clubLibre: boolean }
  /** L'affaire ne s'est pas faite (annonce déjà prise, enchère dépassée) : les Ovas réservés sont rendus. */
  | { type: 'restituer'; clubId: string; ref: string; libelle: string }
  /** La carte arrive chez l'acheteur ; sa réserve est consommée. */
  | { type: 'livrer'; clubId: string; ref: string; carte: CarteCarriere }
  /** La carte quitte le vendeur, qui est payé. */
  | { type: 'solder'; venteId: string; montant: number; acheteur: string }
  /** L'annonce sort du marché sans vente : la carte est déverrouillée. */
  | { type: 'clore'; venteId: string; issue: 'annulee' | 'expiree' };

/**
 * Applique UNE opération du marché commun à une ligue. Rejouée, elle ne fait rien : la réserve dit si l'on a déjà payé
 * ou déjà été livré, l'état de la vente dit si le vendeur a déjà été soldé.
 * `carte` : pour `solder`, la carte telle qu'elle était chez le vendeur à l'instant de partir (c'est elle qu'on livre).
 */
export function operationMarcheCarriere(etat: EtatCarriereEnLigne, op: OperationMarche, maintenant: number): { etat: EtatCarriereEnLigne; carte?: CarteCarriere; fait: boolean } {
  const date = dateServeur(maintenant);
  const nouveau = copier(etat);
  const rendre = (fait: boolean, carte?: CarteCarriere) => {
    if (!fait) return { etat, fait, carte };
    nouveau.version = etat.version + 1;
    return { etat: nouveau, fait, carte };
  };
  switch (op.type) {
    case 'reserver': {
      identifiant(op.compteId); identifiant(op.ref); entier(op.montant, 1);
      exiger(nouveau.publique, 'Le marché commun est réservé aux divisions publiques.');
      exiger(!nouveau.publique.finLe || maintenant < Date.parse(nouveau.publique.finLe), 'Cette saison publique est terminée. Retrouve ta nouvelle division dans le portail.');
      const club = monClub(nouveau, op.compteId);
      if (club.reservesMarche?.some(r => r.ref === op.ref)) return rendre(false);
      if (op.clubLibre) clubLibre(nouveau, club.id);
      exiger(carteSurMarcheAutorisee(op.carte, nouveau.cartesSpeciales === true), 'Cette carte spéciale n’est pas autorisée dans ta division.');
      journal(nouveau, club, 'vente', -op.montant, [], op.libelle, date);
      (club.reservesMarche ??= []).push({ ref: op.ref, montant: op.montant, le: date });
      return rendre(true);
    }
    case 'restituer': {
      const club = nouveau.clubs.find(c => c.id === op.clubId);
      const reserve = club?.reservesMarche?.find(r => r.ref === op.ref);
      if (!club || !reserve) return rendre(false);
      club.reservesMarche = club.reservesMarche!.filter(r => r !== reserve);
      if (!club.reservesMarche.length) delete club.reservesMarche;
      journal(nouveau, club, 'vente', reserve.montant, [], op.libelle, date);
      return rendre(true);
    }
    case 'livrer': {
      const club = nouveau.clubs.find(c => c.id === op.clubId);
      const reserve = club?.reservesMarche?.find(r => r.ref === op.ref);
      // Pas de réserve : la carte est déjà arrivée (ou l'acheteur n'a jamais payé) — on ne livre pas deux fois.
      if (!club || !reserve) return rendre(false);
      club.reservesMarche = club.reservesMarche!.filter(r => r !== reserve);
      if (!club.reservesMarche.length) delete club.reservesMarche;
      const { verrou: _verrou, favori: _favori, ...reste } = op.carte;
      // Un exemplaire neuf DANS cette ligue : l'identifiant d'origine appartient à celle du vendeur.
      const carte: CarteCarriere = { ...copier(reste as CarteCarriere), id: idNouvelExemplaire(nouveau, nouveau.cartes.length), proprietaire: club.id };
      while (nouveau.cartes.some(c => c.id === carte.id)) carte.id += ':m';
      carte.clubs = [...(carte.clubs ?? []), { clubId: club.id, saison: nouveau.saison }];
      nouveau.cartes.push(carte);
      nouveau.transactions.push({ id: prochainId(nouveau, 'transaction', nouveau.transactions.length), clubId: club.id, nature: 'vente', ovas: 0,
        cartes: [carte.id], libelle: `Achat : ${carte.nom} (${reserve.montant} Ovas déjà réservés)`, date });
      ajusterComposition(nouveau, club, maintenant);
      return rendre(true, carte);
    }
    case 'solder': {
      const v = nouveau.ventes.find(x => x.id === op.venteId);
      if (!v || v.etat !== 'ouverte') return rendre(false);
      const vendeur = nouveau.clubs.find(c => c.id === v.vendeurId);
      const carte = nouveau.cartes.find(c => c.id === v.carteId && c.proprietaire === v.vendeurId);
      v.etat = 'vendue'; v.acheteurNom = op.acheteur; if (carte) v.joueurNom = carte.nom;
      if (v.type === 'enchere') v.enchere = { clubId: '', montant: op.montant };
      if (carte) nouveau.cartes = nouveau.cartes.filter(c => c !== carte);
      if (vendeur) {
        journal(nouveau, vendeur, v.type === 'enchere' ? 'enchere' : 'vente', op.montant, carte ? [carte.id] : [],
          `${v.type === 'enchere' ? 'Vente aux enchères' : 'Vente'} : ${carte?.nom ?? v.joueurNom ?? 'joueur'} (${op.acheteur})`, date);
        ajusterComposition(nouveau, vendeur, maintenant);
      }
      return rendre(true, carte ? copier(carte) : undefined);
    }
    case 'clore': {
      const v = nouveau.ventes.find(x => x.id === op.venteId);
      if (!v || v.etat !== 'ouverte') return rendre(false);
      v.etat = op.issue;
      const carte = nouveau.cartes.find(c => c.id === v.carteId);
      if (carte?.verrou === v.id) delete carte.verrou;
      return rendre(true);
    }
  }
}

function construireVueCarriere(etat: EtatCarriereEnLigne, club?: ClubCarriere): VueCarriereEnLigne {
  const { graine: _secret, clubs: _clubs, cartes: _cartes, rencontres: _rencontres, objectifs: _objectifs, transactions: _transactions, echanges: _echanges, ...publics } = etat;
  return copier({ ...publics, packsActifs: packsActifsLigue(etat), monClubId: club?.id ?? '', observateur: club ? undefined : true,
    competitions: etat.competitions.map(c => c.format === 'poules' && c.poules
      ? { ...c, classementsPoules: c.poules.map(poule => classementCompetition(etat, c.id, poule, c.journeesRegulieres)) }
      : c),
    clubs: etat.clubs.map(c => { const { compteId: _compte, composition, strategie, compositionsSauvegardees, packsGratuits, packsGratuitsProgrammes: _programmes, dernierLotPacksGratuits, buteurManuel: _buteurManuel, ...reste } = c; return c.id === club?.id ? { ...reste, composition, strategie, compositionsSauvegardees, packsGratuits, dernierLotPacksGratuits } : reste; }),
    cartes: etat.cartes.filter(c => c.proprietaire !== null),
    rencontres: etat.rencontres.map(r => { const { match, ...reste } = r; return match ? { ...reste, match: vueMatchEnLigne(match, club?.id ?? '') } : reste; }),
    objectifs: club ? etat.objectifs.filter(o => o.clubId === club.id) : [],
    transactions: club ? etat.transactions.filter(t => t.clubId === club.id) : [],
    echanges: club ? etat.echanges.filter(e => e.de === club.id || e.vers === club.id).map(e => ({ ...e, blocage: e.etat === 'propose' ? blocageFeuilleEchange(etat, e) : undefined })) : [],
    classement: classementCarriere(etat), statistiques: statistiquesLigue(etat),
    ...(etat.cartesSpeciales ? { speciales: resumeSpeciauxLigue(etat.packs) } : {}),
    vivierDisponible: vivierRestant(new Set(etat.cartes.map(c => c.sourceId))) });
}

export function vueCarriere(etat: EtatCarriereEnLigne, compteId: string): VueCarriereEnLigne {
  return construireVueCarriere(etat, monClub(etat, compteId));
}

/** Vue publique d'administration : aucune composition, stratégie ou économie privée. */
export function vueCarriereObservateur(etat: EtatCarriereEnLigne): VueCarriereEnLigne {
  return construireVueCarriere(etat);
}

/** Vue minimale d'un direct : quelques dizaines de Ko au lieu de toute la ligue. */
export function vueRencontreCarriere(
  etat: EtatCarriereEnLigne, compteId: string, matchId: string,
  /** L'écran rejoue le film du match : voir `filmDirect.ts`. */
  film?: { depuis?: number },
  /** La réponse part aussitôt sur le réseau : inutile de recopier le fil et les temps forts. */
  sansCopie = false,
  /** L'écran lit la chronologie (film v2) : son dernier pas et sa somme de contrôle. */
  chrono?: RepereChrono,
): VueCarriereEnLigne['rencontres'][number] | null {
  return vueRencontreInterne(etat, matchId, monClub(etat, compteId).id, film, sansCopie, chrono);
}

function vueRencontreInterne(
  etat: EtatCarriereEnLigne, matchId: string, clubId: string, film?: { depuis?: number }, sansCopie = false, chrono?: RepereChrono,
): VueCarriereEnLigne['rencontres'][number] | null {
  const rencontre = etat.rencontres.find(r => r.id === matchId);
  if (!rencontre) return null;
  const { match, ...publics } = rencontre;
  // ⚠️ PAS DE `copier` SUR LE FILM : il est déjà fait de valeurs neuves, et le
  // recopier doublerait le coût de chaque sondage du direct.
  if (!match) return copier(publics);
  const { film: pas, chrono: suite, ...vue } = vueMatchEnLigne(match, clubId, undefined, film, chrono);
  // ⚠️ LE DIRECT NE RECOPIE PLUS SA RÉPONSE. Cloner deux cents lignes de fil à
  // chaque sondage pour les sérialiser l'instant d'après coûtait autant que de
  // les envoyer. La vue est un objet neuf ; ce qu'elle référence n'est que lu.
  if (sansCopie) return { ...copier(publics), match: { ...vue, ...(pas ? { film: pas } : {}), ...(suite ? { chrono: suite } : {}) } as ReturnType<typeof vueMatchEnLigne> };
  const copie = copier({ ...publics, match: vue as ReturnType<typeof vueMatchEnLigne> });
  if (pas && copie.match) copie.match.film = pas;
  if (suite && copie.match) copie.match.chrono = suite;
  return copie;
}

export function vueRencontreCarriereObservateur(
  etat: EtatCarriereEnLigne, matchId: string, film?: { depuis?: number }, sansCopie = false, chrono?: RepereChrono,
): VueCarriereEnLigne['rencontres'][number] | null {
  return vueRencontreInterne(etat, matchId, '', film, sansCopie, chrono);
}
