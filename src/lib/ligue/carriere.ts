import { catalogueAdmin } from './atelierCatalogue.js';
/** Règles exécutées exclusivement par le serveur ; chaque commande travaille sur une copie. */
import { POSTE_PAR_ID } from '../../data/rugby.js';
import type { CompositionManager } from '../../types.js';
import { compositionManagerParDefaut, EFFECTIF_MINIMUM, POSTES_BANC_MANAGER, POSTES_XV_MANAGER, reconcilerCompositionManager } from '../compositionManager.js';
import { affichesToutesRondes } from './calendrier.js';
import { horairesChampionnat } from './horaires.js';
import { graine as hasard, tirerPondere } from './aleatoire.js';
import { packsCatalogueAdmin, bandesGaranties, carteDepuisSource, catalogueMondialCarriere, coequipierDepuisCarte, dotationBronzeCarriere, emblemeValide, logoCompetitionValide, nomTrophee, PACKS_CARRIERE, RARETES_CARRIERE, rayonDePack, tirerDuRayon, tropheeValide, vivierRestant } from './catalogueCarriere.js';
import { avancerMatchEnLigne, commanderMatchEnLigne, conclureMatchEnLigne, creerMatchEnLigne, DUREE_REELLE, STRATEGIE_EN_LIGNE_DEFAUT, strategieValide, vueMatchEnLigne } from './matchCarriere.js';
import type { CarteCarriere, ClubCarriere, CommandeCarriere, CompetitionCarriere, CreationCarriere, EtatCarriereEnLigne, LigneClassementCarriere, ObjectifCarriere, PackCarriere, RencontreCarriere, TransactionCarriere, VueCarriereEnLigne } from './typesCarriere.js';
import { LOT_VENTE_RAPIDE_MAX, valeurVenteRapide } from './venteRapideCarriere.js';
import { bonusCollectif, collectifCarriere } from './collectifCarriere.js';
import { estPuissanceDeDeux, nombreQualifiesPoules, repartirPoules } from './poulesCarriere.js';

const HEURE = 3_600_000;
const JOUR = 24 * HEURE;
const SEMAINE = 7 * JOUR;
export const PACKS_GRATUITS_PAR_JOUR = 10;

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

function actualiserCartesProfessionnelles(cartes: CarteCarriere[]): void {
  const catalogueActuel = catalogueMondialCarriere();
  if (catalogueSources !== catalogueActuel) { catalogueSources = catalogueActuel; sourcesParId = new Map(catalogueActuel.map(source => [source.sourceId, source])); }
  for (const carte of cartes) {
    const source = sourcesParId!.get(carte.sourceId);
    if (!source || (source.origine !== 'professionnel' && !catalogueAdmin().joueurs[carte.sourceId])) continue;
    // L'identité de collection et la valeur sportive suivent le catalogue actuel.
    // L'historique de propriété, la fatigue, les blessures et les statistiques de
    // carrière restent ceux de cette carte déjà distribuée.
    carte.nom = source.nom;
    carte.note = source.note;
    carte.poste = source.poste;
    carte.famille = source.famille;
    carte.postesSecondaires = source.postesSecondaires ? [...source.postesSecondaires] : undefined;
    carte.potentiel = catalogueAdmin().joueurs[carte.sourceId] ? source.potentiel : Math.max(carte.potentiel, source.potentiel);
    carte.rarete = source.rarete;
    carte.photo = source.photo;
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
const cartesClub = (etat: EtatCarriereEnLigne, clubId: string) => etat.cartes.filter(c => c.proprietaire === clubId);
const clubParId = (etat: EtatCarriereEnLigne, id: string) => { const club = etat.clubs.find(c => c.id === id); exiger(club, 'Club introuvable dans cette ligue.'); return club; };
const monClub = (etat: EtatCarriereEnLigne, compteId: string) => { const club = etat.clubs.find(c => c.compteId === compteId); exiger(club, 'Vous ne faites pas partie de cette ligue.'); return club; };
const carteParId = (etat: EtatCarriereEnLigne, id: string) => { const carte = etat.cartes.find(c => c.id === id); exiger(carte, 'Carte introuvable dans cette ligue.'); return carte; };
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
    const poids = etat.packs.map(pack => poidsPackQuotidien(pack, rang, etat.clubs.length, classementActif));
    const rng = hasard(`${etat.graine}:packs-quotidiens:${jour}:${club.id}`);
    const programmes = club.packsGratuitsProgrammes?.[jour] ?? [];
    for (let i = 0; i < PACKS_GRATUITS_PAR_JOUR; i++) {
      const force = programmes[i];
      const indexForce = force ? etat.packs.findIndex(pack => pack.id === force) : -1;
      const index = indexForce >= 0 ? indexForce : tirerPondere(poids, rng);
      exiger(index >= 0, 'Aucun pack quotidien disponible.');
      club.packsGratuits.push({ id: `${club.id}:quotidien:${jour}:${i}`, packId: etat.packs[index].id, recuLe: dateServeur(maintenant) });
    }
    if (club.packsGratuitsProgrammes?.[jour]) {
      delete club.packsGratuitsProgrammes[jour];
      if (!Object.keys(club.packsGratuitsProgrammes).length) delete club.packsGratuitsProgrammes;
    }
    club.dernierLotPacksGratuits = jour;
  }
}
function ajusterComposition(etat: EtatCarriereEnLigne, club: ClubCarriere, maintenant: number) {
  const cartes = cartesClub(etat, club.id);
  club.composition = reconcilerCompositionManager(cartes.map(coequipierDepuisCarte), club.composition,
    new Set(cartes.filter(c => c.blesseJusqua && Date.parse(c.blesseJusqua) > maintenant).map(c => c.id)));
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
 * échanger un titulaire ou un remplaçant était permis : la feuille se
 * réparait toute seule derrière (`ajusterComposition`), et on découvrait le
 * dimanche que le numéro 10 avait été remplacé par le premier venu du même
 * poste. On refuse maintenant le départ tant que la carte est sur la feuille —
 * la sortir du XV ou du banc est un geste conscient, et il reste à un clic.
 *
 * `ajusterComposition` garde tout son sens : elle rattrape les départs SUBIS
 * (blessure, carte achetée par un autre club, expiration d'enchère), pas ceux
 * qu'on décide.
 */
function verifierHorsFeuille(club: ClubCarriere, sortants: string[]) {
  const feuille = new Set([...(club.composition?.titulaires ?? []), ...(club.composition?.remplacants ?? [])]);
  exiger(!sortants.some(id => feuille.has(id)), 'Ce joueur est sur ta feuille de match. Sors-le du XV ou du banc avant de le laisser partir.');
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
  ids.forEach((id, i) => {
    const c = carteParId(etat, id);
    exiger(c.proprietaire === club.id, 'Cette carte appartient à un autre club.');
    exiger(!c.blesseJusqua || Date.parse(c.blesseJusqua) <= maintenant, 'Un joueur blessé ne peut pas être aligné.');
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
    // ⚠️ SAUF LA PREMIÈRE LIGNE. Celle-là reste fermée aux non-spécialistes,
    // et ce n'est pas une question d'équilibrage : une mêlée avec un ailier au
    // pilier, c'est un arbitre qui ordonne des mêlées simulées. Le règlement
    // du rugby l'exige, le jeu aussi.
    if (i < 3 || (i >= 15 && i < 18)) exiger(
      [c.poste, ...(c.postesSecondaires ?? [])].some(p => POSTE_PAR_ID[p].famille === POSTE_PAR_ID[poste].famille),
      'La première ligne nécessite des spécialistes : pilier, talonneur, pilier.',
    );
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
  championnat.playoffs = Boolean(etat.playoffs) && championnat.participants.length >= 4;
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
  exiger(avantLaPremiereJournee(etat, maintenant), 'Les inscriptions sont closes : la première journée est jouée.');
  exiger(etat.clubs.length < etat.maxClubs, 'Cette ligue est complète.');
  exiger(!etat.clubs.some(c => c.compteId === compteId), 'Ce compte possède déjà un club dans cette ligue.');
  exiger(!etat.clubs.some(c => c.nom.toLocaleLowerCase('fr') === nom.trim().toLocaleLowerCase('fr')), 'Ce nom de club est déjà pris.');
  const id = prochainId(etat, 'club', etat.clubs.length);
  // ⚠️ L'unicité par ligue commence ICI, pas au premier pack : deux amis
  // inscrits le même jour ne peuvent pas recevoir le même licencié.
  const cartes = dotationBronzeCarriere(etat.id, id, graine, new Set(etat.cartes.map(c => c.sourceId)), etat.saison);
  exiger(cartes.length === 30, 'Le vivier de départ est épuisé pour cette ligue.');
  const club: ClubCarriere = { id, compteId, pseudo: pseudo.trim(), nom: nom.trim(), ovas: 0, composition: compositionManagerParDefaut(cartes.map(coequipierDepuisCarte)), strategie: copier(STRATEGIE_EN_LIGNE_DEFAUT), rejointLe: dateServeur(maintenant), embleme: emblemeValide(embleme) ? embleme : undefined };
  etat.clubs.push(club); etat.cartes.push(...cartes);
  journal(etat, club, 'dotation', etat.dotationOvas, cartes.map(c => c.id), `Dotation de départ : 30 licenciés de Régionale 3 et ${etat.dotationOvas.toLocaleString('fr-FR')} Ovas`, dateServeur(maintenant));
  renouvelerObjectifs(etat, maintenant);
  if (etat.phase === 'saison') integrerAuChampionnat(etat, club.id);
}

export function creerCarriere(config: CreationCarriere, maintenant: number, graine: string): EtatCarriereEnLigne {
  exiger(config && typeof config === 'object', 'Paramètres invalides.');
  identifiant(config.id); texte(config.nom, 60); texte(config.code, 32); entier(config.maxClubs, 2, 64);
  entier(config.rythme, 1, 7);
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
  for (const robot of CLUBS_LABORATOIRE) ajouterClub(etat, robot.compteId, robot.pseudo, robot.nom, maintenant, `${graine}:${robot.compteId}`);
  demarrerSaison(etat, maintenant);
  const club = monClub(etat, config.compteId);
  club.ovas = 1_000_000;
  for (const carte of etat.cartes) { carte.fatigue = 0; delete carte.blesseJusqua; }
  return etat;
}

function ouvrirPack(etat: EtatCarriereEnLigne, club: ClubCarriere, packId: string, maintenant: number, graine: string, gratuit = false) {
  const pack = etat.packs.find(p => p.id === packId); exiger(pack, 'Pack inconnu.');
  entier(pack.prix, 1); entier(pack.cartes, 1, 12);
  exiger(RARETES_CARRIERE.every(r => Number.isFinite(pack.probabilites[r]) && pack.probabilites[r] >= 0), 'Probabilités de pack invalides.');
  if (!gratuit) exiger(club.ovas >= pack.prix, 'Ovas insuffisants pour ce pack.');
  // ⚠️ L'UNICITÉ PAR LIGUE SE TIENT ICI. Un joueur déjà possédé — par n'importe
  // quel club de CETTE ligue — ne peut plus sortir d'un pack : c'est ce qui
  // oblige à aller parler à celui qui l'a. Il reste évidemment disponible dans
  // toutes les autres ligues.
  const pris = new Set(etat.cartes.map(c => c.sourceId));
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
  exiger(rayons.reduce((n, rayon) => n + rayon.length, 0) >= pack.cartes, 'Pas assez de joueurs disponibles pour ce pack.');
  exiger(!pack.garantie || bandes.some(r => rayons[RARETES_CARRIERE.indexOf(r)].length > 0), 'La garantie de ce pack est épuisée. Aucun Ova débité.');
  for (let n = 0; n < pack.cartes; n++) {
    const derniere = n === pack.cartes - 1;
    const doitGarantir = derniere && bandes.length > 0 && !tirees.some(c => bandes.includes(c.rarete));
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
    rayons[i] = rayons[i].filter(c => c.sourceId !== source.sourceId);
    pris.add(carte.sourceId); etat.cartes.push(carte); tirees.push(carte);
  }
  const meilleure = [...tirees].sort((a, b) => b.note - a.note)[0];
  journal(etat, club, 'pack', gratuit ? 0 : -pack.prix, tirees.map(c => c.id), `${gratuit ? 'Pack quotidien offert' : `Pack ${pack.nom}`} : ${tirees.map(c => c.nom).join(', ')}`, dateServeur(maintenant), {
    packId: pack.id, packNom: pack.nom, packApparence: meilleure.rarete,
    meilleureNote: meilleure.note, meilleurJoueur: meilleure.nom, meilleurPortrait: meilleure.photo,
  });
}

function renouvelerObjectifs(etat: EtatCarriereEnLigne, maintenant: number) {
  const periode = Math.max(0, Math.floor((maintenant - Date.parse(etat.creeLe)) / SEMAINE));
  const debut = Date.parse(etat.creeLe) + periode * SEMAINE;
  const modeles: [ObjectifCarriere['type'], string, number, number][] = [
    ['participer', 'Terminer un match', 1, 200], ['gagner', 'Remporter un match', 1, 150], ['essais', 'Marquer 6 essais', 6, 180],
    ['formation', 'Aligner un titulaire de moins de 60 GEN', 1, 150], ['penalites', 'Réussir 5 pénalités', 5, 120], ['serie', 'Gagner deux matchs de suite', 2, 150],
  ];
  for (const club of etat.clubs) for (const [type, libelle, cible, recompense] of modeles) {
    const id = `${etat.id}:objectif:${club.id}:${periode}:${type}`;
    if (!etat.objectifs.some(o => o.id === id)) etat.objectifs.push({ id, clubId: club.id, libelle, type, cible, progression: 0, recompense, debut: dateServeur(debut), fin: dateServeur(debut + SEMAINE), reclame: false });
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
    [...aller, ...retour].forEach((paires, i) => {
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
function demarrerSaison(etat: EtatCarriereEnLigne, maintenant: number) {
  exiger(etat.phase !== 'saison', 'La saison est déjà en cours.');
  exiger(etat.clubs.length >= 2, 'Invitez au moins un autre manager pour commencer.');
  if (etat.phase === 'intersaison') etat.saison++;
  etat.phase = 'saison'; etat.debutSaison = dateServeur(maintenant);
  // Le coup d'envoi ouvre le robinet des packs quotidiens, pour tout le monde
  // le même jour.
  attribuerPacksQuotidiens(etat, maintenant);
  // ⚠️ LA PHASE FINALE DEMANDE QUATRE CLUBS. À trois, une demi-finale à deux
  // n'a pas de sens : le championnat couronne alors son premier, comme si le
  // réglage n'existait pas. Mieux vaut l'ignorer que produire un tableau bancal.
  const playoffs = Boolean(etat.playoffs) && etat.clubs.length >= 4;
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
      const bonus = (essais - essaisAdverses >= 3 ? 1 : 0) + (!victoire && !nul && contre - points <= 7 ? 1 : 0);
      l.joues++; l.gagnes += +victoire; l.nuls += +nul; l.perdus += +(!victoire && !nul); l.points += (victoire ? 4 : nul ? 2 : 0) + bonus;
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
      const gagnantDe = (r: RencontreCarriere) => r.resultat!.pointsD !== r.resultat!.pointsE
        ? (r.resultat!.pointsD > r.resultat!.pointsE ? r.domicile : r.exterieur)
        // À égalité, le mieux classé de la saison régulière passe : c'est
        // l'avantage qu'on a gagné en vingt journées.
        : rangs.indexOf(r.domicile) <= rangs.indexOf(r.exterieur) ? r.domicile : r.exterieur;
      const debut = Math.max(...matchs.map(r => Date.parse(r.ferme)));
      if (derniere === c.journeesRegulieres) {
        const nombre = Math.min(rangs.length, Math.max(4, 2 ** Math.floor(Math.log2(rangs.length / 2))));
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
      const gagnant = (r: RencontreCarriere) => r.resultat!.pointsD !== r.resultat!.pointsE
        ? (r.resultat!.pointsD > r.resultat!.pointsE ? r.domicile : r.exterieur)
        : r.resultat!.essaisD !== r.resultat!.essaisE
          ? (r.resultat!.essaisD > r.resultat!.essaisE ? r.domicile : r.exterieur)
          : classementReference.indexOf(r.domicile) <= classementReference.indexOf(r.exterieur) ? r.domicile : r.exterieur;
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
      // La prolongation virtuelle est déterministe : essais, puis meilleur rang de championnat.
      const classement = classementCarriere(etat);
      const gagnant = (r: RencontreCarriere) => r.resultat!.pointsD !== r.resultat!.pointsE ? (r.resultat!.pointsD > r.resultat!.pointsE ? r.domicile : r.exterieur)
        : r.resultat!.essaisD !== r.resultat!.essaisE ? (r.resultat!.essaisD > r.resultat!.essaisE ? r.domicile : r.exterieur)
          : classement.findIndex(l => l.clubId === r.domicile) <= classement.findIndex(l => l.clubId === r.exterieur) ? r.domicile : r.exterieur;
      const perdants = new Set(matchs.map(r => gagnant(r) === r.domicile ? r.exterieur : r.domicile));
      const restants = c.participants.filter(id => !perdants.has(id));
      if (restants.length === 1) {
        const finale = matchs[matchs.length - 1]; cloturerCompetition(etat, c, restants[0], finale.domicile === restants[0] ? finale.exterieur : finale.domicile, maintenant);
      } else {
        const journee = Math.max(...matchs.map(r => r.journee)) + 1;
        const debut = Math.max(...matchs.map(r => Date.parse(r.ferme)));
        ajouterRencontres(etat, c, journee, Array.from({ length: Math.floor(restants.length / 2) }, (_, i) => ({ domicile: restants[i * 2], exterieur: restants[i * 2 + 1] })), debut);
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
  const rng = hasard(`${graine}:sante:${r.id}`);
  for (const cote of ['domicile', 'exterieur'] as const) {
    const autre = cote === 'domicile' ? 'exterieur' : 'domicile'; const club = clubParId(etat, r[cote]);
    const victoire = m.score[cote] > m.score[autre], nul = m.score[cote] === m.score[autre];
    // ⚠️ LE RAPPORT VICTOIRE / DÉFAITE EST LE VRAI RÉGLAGE ANTI-BOULE-DE-NEIGE,
    // pas le montant. Une grosse victoire rapporte 2 050 Ovas, une défaite sèche
    // 600 : trois fois et demie sur le meilleur des cas, deux fois sur le cas
    // courant. Doubler l'écart, et le premier de la ligue s'achète l'effectif
    // qui garantit qu'il restera premier. Le reste des Ovas vient de ce que tout
    // le monde touche — participation, objectifs, dotation de compétition.
    const performance = (m.essais[cote] >= 4 ? 150 : 0) + (victoire && m.essais[autre] === 0 ? 200 : 0)
      + (victoire && cote === 'exterieur' ? 100 : 0) + (m.score[cote] >= 30 ? 100 : 0);
    const bonus = (m.essais[cote] - m.essais[autre] >= 3 ? 150 : 0) + (!victoire && !nul && m.score[autre] - m.score[cote] <= 7 ? 100 : 0);
    journal(etat, club, 'match', 500 + (victoire ? 750 : nul ? 350 : 100) + bonus + performance, [], `${clubParId(etat, r.domicile).nom} ${m.score.domicile} – ${m.score.exterieur} ${clubParId(etat, r.exterieur).nom}`, dateServeur(maintenant));
    const titulaires = new Set(club.composition.titulaires);
    for (const objectif of etat.objectifs.filter(o => o.clubId === club.id && Date.parse(o.debut) <= maintenant && maintenant < Date.parse(o.fin))) {
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
  for (const v of etat.ventes.filter(v => v.etat === 'ouverte' && Date.parse(v.expireLe) <= maintenant)) {
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
  // Un salon ne dépend pas d'un onglet laissé ouvert : après 48 heures il
  // démarre dès que deux managers sont présents. Avec un seul club, le second
  // inscrit déclenche immédiatement ce même départ.
  if (etat.phase === 'salon' && etat.clubs.length >= 2 && Date.parse(etat.creeLe) + 2 * JOUR <= maintenant) {
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
  for (const club of nouveau.clubs) {
    if (!Number.isFinite(club.ovas)) club.ovas = 0;
    club.strategie = strategieValide(club.strategie);
  }
  actualiserCartesProfessionnelles(nouveau.cartes);
  nouveau.catalogueRevision = catalogueAdmin().revision;
  nouveau.rotationPacks = catalogueAdmin().rotationPacks === true;
  for (const club of nouveau.clubs) ajusterComposition(nouveau, club, maintenant);
  reparerCalendriers(nouveau);
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
  const match = avancerMatchEnLigne(cible.match, maintenant);
  if (match.termine) return avancerCarriere(etat, maintenant, graine);
  return {
    ...etat,
    version: etat.version + 1,
    rencontres: etat.rencontres.map(r => r.id === matchId ? { ...r, match } : r),
  };
}

export function agirCarriere(etat: EtatCarriereEnLigne, compteId: string, commande: CommandeCarriere, maintenant: number, graine: string): EtatCarriereEnLigne {
  identifiant(compteId); dateServeur(maintenant);
  exiger(commande && typeof commande === 'object' && typeof commande.type === 'string', 'Commande invalide.');
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
    if (nouveau.phase === 'salon' && Date.parse(nouveau.creeLe) + 2 * JOUR <= maintenant) demarrerSaison(nouveau, maintenant);
  } else {
    const club = monClub(nouveau, compteId); avancerInterne(nouveau, maintenant, graine);
    switch (commande.type) {
      case 'actualiser': break;
      case 'demarrerSaison': exiger(compteId === nouveau.createurId, 'Seul le créateur peut lancer la saison.'); demarrerSaison(nouveau, maintenant); break;
      case 'modifierRythme': {
        exiger(compteId === nouveau.createurId, 'Seul le créateur peut modifier la fréquence des matchs.');
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
        r.match.debut = maintenant - commande.minute * 60_000 - r.match.gel;
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
      // ⚠️ On n'enregistre JAMAIS la stratégie telle qu'elle arrive : une valeur
      // inconnue est remplacée par le défaut, jamais refusée. C'est la même
      // fonction que le match en direct, donc un seul endroit décide.
      case 'strategie': club.strategie = strategieValide(commande.strategie); break;

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
        verifierHorsFeuille(club, ids); verifierDepart(nouveau, club.id, ids);
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
        verifierHorsFeuille(club, [carte.id]); verifierDepart(nouveau, club.id, [carte.id]); const id = prochainId(nouveau, 'vente', nouveau.ventes.length); carte.verrou = id;
        nouveau.ventes.push({ id, carteId: carte.id, vendeurId: club.id, type: commande.mode, prix: commande.prix, expireLe: dateServeur(maintenant + commande.dureeHeures * HEURE), etat: 'ouverte' }); break;
      }
      case 'acheter': {
        const v = nouveau.ventes.find(v => v.id === commande.venteId); exiger(v && v.etat === 'ouverte' && v.type === 'directe' && Date.parse(v.expireLe) > maintenant, 'Cette vente n’est plus disponible.');
        exiger(v.vendeurId !== club.id, 'Vous ne pouvez pas acheter votre propre carte.'); clubLibre(nouveau, club.id); clubLibre(nouveau, v.vendeurId);
        const vendeur = clubParId(nouveau, v.vendeurId), carte = carteParId(nouveau, v.carteId);
        exiger(carte.proprietaire === vendeur.id && carte.verrou === v.id, 'La propriété de cette carte a changé.');
        journal(nouveau, club, 'vente', -v.prix, [carte.id], `Achat : ${carte.nom}`, date); journal(nouveau, vendeur, 'vente', v.prix, [carte.id], `Vente : ${carte.nom}`, date);
        transferer(carte, club, nouveau.saison); v.etat = 'vendue'; v.acheteurId = club.id; v.joueurNom = carte.nom;
        ajusterComposition(nouveau, vendeur, maintenant); ajusterComposition(nouveau, club, maintenant); break;
      }
      case 'encherir': {
        entier(commande.montant, 1); const v = nouveau.ventes.find(v => v.id === commande.venteId);
        exiger(v && v.etat === 'ouverte' && v.type === 'enchere' && Date.parse(v.expireLe) > maintenant, 'Cette enchère est fermée.'); exiger(v.vendeurId !== club.id, 'Vous ne pouvez pas enchérir sur votre carte.');
        exiger(commande.montant >= (v.enchere ? v.enchere.montant + Math.max(25, Math.ceil(v.enchere.montant * .05)) : v.prix), 'Votre offre doit dépasser la meilleure enchère d’au moins 5 % (minimum 25 Ovas).');
        if (v.enchere) journal(nouveau, clubParId(nouveau, v.enchere.clubId), 'enchere', v.enchere.montant, [], 'Enchère dépassée : Ovas restitués', date);
        journal(nouveau, club, 'enchere', -commande.montant, [], 'Ovas réservés pour une enchère', date); v.enchere = { clubId: club.id, montant: commande.montant }; break;
      }
      case 'annulerVente': {
        const v = nouveau.ventes.find(v => v.id === commande.venteId); exiger(v && v.vendeurId === club.id && v.etat === 'ouverte' && !v.enchere, 'Cette vente ne peut pas être annulée.');
        v.etat = 'annulee'; delete carteParId(nouveau, v.carteId).verrou; break;
      }
      case 'proposerEchange': {
        clubLibre(nouveau, club.id); listeIds(commande.cartesDonnees, 10); listeIds(commande.cartesDemandees, 10); entier(commande.ovasDonnes); entier(commande.ovasDemandes);
        exiger(commande.vers !== club.id, 'Choisissez un autre club.'); const destinataire = clubParId(nouveau, commande.vers);
        exiger(commande.cartesDonnees.length + commande.cartesDemandees.length > 0, 'Un échange doit contenir au moins une carte.');
        exiger(nouveau.echanges.filter(e => e.de === club.id && e.etat === 'propose').length < 10, 'Vous avez déjà dix offres en cours.');
        for (const id of commande.cartesDonnees) { const c = carteParId(nouveau, id); exiger(c.proprietaire === club.id && !c.verrou, 'Une carte proposée est indisponible.'); }
        for (const id of commande.cartesDemandees) { const c = carteParId(nouveau, id); exiger(c.proprietaire === destinataire.id && !c.verrou, 'Une carte demandée est indisponible.'); }
        verifierHorsFeuille(club, commande.cartesDonnees);
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
          verifierHorsFeuille(emetteur, e.cartesDonnees); verifierHorsFeuille(destinataire, e.cartesDemandees);
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
        exiger(compteId === nouveau.createurId, 'Seul le créateur peut créer une coupe.'); exiger(nouveau.phase === 'saison', 'Lancez une saison avant de créer une coupe.');
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
          playoffs: format === 'championnat' && commande.playoffs === true && commande.participants.length >= 4,
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
 * Un direct fait bouger l'horloge, le score, le fil et les statistiques à chaque
 * sondage : l'état produit n'est jamais identique au précédent, donc les 300 à
 * 400 Ko de la ligue repartaient vers la base deux mille quatre cents fois par
 * rencontre. Or ces six champs ne sont PAS de l'information : ils se
 * reconstruisent intégralement de la graine, des feuilles gelées et du journal
 * — c'est tout le principe de `matchCarriere.ts`, « on ne stocke pas un match,
 * on stocke de quoi le rejouer ».
 *
 * ⚠️ ET CE QUI EST VRAIMENT NOUVEAU DÉCLENCHE TOUJOURS UNE ÉCRITURE : un ordre
 * au journal, une décision en attente avec sa date limite, le gel du chrono, la
 * présence d'un manager, et bien sûr la sirène (`termine`) avec le score final.
 * Un match TERMINÉ garde donc tous ses champs comparés : son fil et sa feuille
 * sont, eux, la seule trace qui restera.
 */
const DERIVES_DU_DIRECT = ['horloge', 'score', 'essais', 'penalites', 'fil', 'stats'] as const;

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

function construireVueCarriere(etat: EtatCarriereEnLigne, club?: ClubCarriere): VueCarriereEnLigne {
  const { graine: _secret, clubs: _clubs, cartes: _cartes, rencontres: _rencontres, objectifs: _objectifs, transactions: _transactions, echanges: _echanges, ...publics } = etat;
  return copier({ ...publics, monClubId: club?.id ?? '', observateur: club ? undefined : true,
    competitions: etat.competitions.map(c => c.format === 'poules' && c.poules
      ? { ...c, classementsPoules: c.poules.map(poule => classementCompetition(etat, c.id, poule, c.journeesRegulieres)) }
      : c),
    clubs: etat.clubs.map(c => { const { compteId: _compte, composition, strategie, packsGratuits, packsGratuitsProgrammes: _programmes, dernierLotPacksGratuits, buteurManuel: _buteurManuel, ...reste } = c; return c.id === club?.id ? { ...reste, composition, strategie, packsGratuits, dernierLotPacksGratuits } : reste; }),
    cartes: etat.cartes.filter(c => c.proprietaire !== null),
    rencontres: etat.rencontres.map(r => { const { match, ...reste } = r; return match ? { ...reste, match: vueMatchEnLigne(match, club?.id ?? '') } : reste; }),
    objectifs: club ? etat.objectifs.filter(o => o.clubId === club.id) : [],
    transactions: club ? etat.transactions.filter(t => t.clubId === club.id) : [],
    echanges: club ? etat.echanges.filter(e => e.de === club.id || e.vers === club.id) : [],
    classement: classementCarriere(etat), statistiques: statistiquesLigue(etat),
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
export function vueRencontreCarriere(etat: EtatCarriereEnLigne, compteId: string, matchId: string): VueCarriereEnLigne['rencontres'][number] | null {
  return vueRencontreInterne(etat, matchId, monClub(etat, compteId).id);
}

function vueRencontreInterne(etat: EtatCarriereEnLigne, matchId: string, clubId: string): VueCarriereEnLigne['rencontres'][number] | null {
  const rencontre = etat.rencontres.find(r => r.id === matchId);
  if (!rencontre) return null;
  const { match, ...publics } = rencontre;
  return copier(match ? { ...publics, match: vueMatchEnLigne(match, clubId) } : publics);
}

export function vueRencontreCarriereObservateur(etat: EtatCarriereEnLigne, matchId: string): VueCarriereEnLigne['rencontres'][number] | null {
  return vueRencontreInterne(etat, matchId, '');
}
