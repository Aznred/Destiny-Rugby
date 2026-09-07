/** Règles exécutées exclusivement par le serveur ; chaque commande travaille sur une copie. */
import { POSTE_PAR_ID } from '../../data/rugby.js';
import type { CompositionManager } from '../../types.js';
import { compositionManagerParDefaut, EFFECTIF_MINIMUM, POSTES_BANC_MANAGER, POSTES_XV_MANAGER, reconcilerCompositionManager } from '../compositionManager.js';
import { affichesToutesRondes } from './calendrier.js';
import { graine as hasard, tirerPondere } from './aleatoire.js';
import { bandesGaranties, carteDepuisSource, catalogueMondialCarriere, coequipierDepuisCarte, dotationBronzeCarriere, emblemeValide, logoCompetitionValide, nomTrophee, PACKS_CARRIERE, RARETES_CARRIERE, rayonDePack, tirerDuRayon, tropheeValide, vivierRestant } from './catalogueCarriere.js';
import { avancerMatchEnLigne, commanderMatchEnLigne, conclureMatchEnLigne, creerMatchEnLigne, DUREE_REELLE, STRATEGIE_EN_LIGNE_DEFAUT, strategieValide, vueMatchEnLigne } from './matchCarriere.js';
import type { CarteCarriere, ClubCarriere, CommandeCarriere, CompetitionCarriere, CreationCarriere, EtatCarriereEnLigne, LigneClassementCarriere, ObjectifCarriere, RencontreCarriere, TransactionCarriere, VueCarriereEnLigne } from './typesCarriere.js';

const HEURE = 3_600_000;
const JOUR = 24 * HEURE;
const SEMAINE = 7 * JOUR;
const copier = <T>(x: T): T => structuredClone(x);
let sourcesParId: Map<string, ReturnType<typeof catalogueMondialCarriere>[number]> | undefined;

function actualiserCartesProfessionnelles(cartes: CarteCarriere[]): void {
  sourcesParId ??= new Map(catalogueMondialCarriere().map(source => [source.sourceId, source]));
  for (const carte of cartes) {
    const source = sourcesParId.get(carte.sourceId);
    if (!source || source.origine !== 'professionnel') continue;
    // L'identité de collection et la valeur sportive suivent le catalogue actuel.
    // L'historique de propriété, la fatigue, les blessures et les statistiques de
    // carrière restent ceux de cette carte déjà distribuée.
    carte.nom = source.nom;
    carte.note = source.note;
    carte.potentiel = Math.max(carte.potentiel, source.potentiel);
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
function journal(etat: EtatCarriereEnLigne, club: ClubCarriere, nature: TransactionCarriere['nature'], ovas: number, cartes: string[], libelle: string, date: string) {
  exiger(Number.isSafeInteger(club.ovas + ovas) && club.ovas + ovas >= 0, 'Ovas insuffisants.');
  club.ovas += ovas;
  etat.transactions.push({ id: prochainId(etat, 'transaction', etat.transactions.length), clubId: club.id, nature, ovas, cartes, libelle, date });
}
function ajusterComposition(etat: EtatCarriereEnLigne, club: ClubCarriere, maintenant: number) {
  const cartes = cartesClub(etat, club.id);
  club.composition = reconcilerCompositionManager(cartes.map(coequipierDepuisCarte), club.composition,
    new Set(cartes.filter(c => c.blesseJusqua && Date.parse(c.blesseJusqua) > maintenant).map(c => c.id)));
}
function clubLibre(etat: EtatCarriereEnLigne, clubId: string) {
  exiger(!etat.rencontres.some(r => r.match && !r.resultat && (r.domicile === clubId || r.exterieur === clubId)), 'Votre équipe joue actuellement ; attendez la fin du match.');
}
function transferer(carte: CarteCarriere, destinataire: ClubCarriere, saison: number) {
  carte.proprietaire = destinataire.id; delete carte.verrou;
  carte.clubs.push({ clubId: destinataire.id, saison });
}
function verifierDepart(etat: EtatCarriereEnLigne, clubId: string, sortants: string[], entrants: string[] = []) {
  const restants = cartesClub(etat, clubId).filter(c => !sortants.includes(c.id) && !c.verrou).map(coequipierDepuisCarte);
  restants.push(...entrants.map(id => coequipierDepuisCarte(carteParId(etat, id))));
  exiger(restants.length >= EFFECTIF_MINIMUM, `Conservez au moins ${EFFECTIF_MINIMUM} joueurs disponibles dans votre effectif.`);
  const composition = compositionManagerParDefaut(restants);
  exiger(composition.titulaires.length === 15 && composition.remplacants.length === 8, 'Le transfert empêcherait de composer une équipe.');
  for (const famille of ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne', 'demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere']) {
    const minimum = famille === 'pilier' ? 4 : famille === 'talonneur' ? 2 : famille === 'troisieme_ligne' ? 3 : ['deuxieme_ligne', 'centre', 'ailier'].includes(famille) ? 2 : 1;
    exiger(restants.filter(j => POSTE_PAR_ID[j.poste].famille === famille).length >= minimum, 'Ce transfert laisse un poste sans profondeur suffisante.');
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
    if (i < 3 || (i >= 15 && i < 18)) exiger(c.famille === POSTE_PAR_ID[poste].famille, 'La première ligne nécessite des spécialistes : pilier, talonneur, pilier.');
  });
}

/** De 0 à 100 000, par pas de 100. Hors bornes, on ramène au défaut. */
const DOTATION_DEFAUT = 1000;
export const DOTATION_MAX = 100_000;
function dotationValide(valeur: unknown): number {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) return DOTATION_DEFAUT;
  return Math.min(DOTATION_MAX, Math.max(0, Math.round(valeur)));
}

function ajouterClub(etat: EtatCarriereEnLigne, compteId: string, pseudo: string, nom: string, maintenant: number, graine: string, embleme?: unknown) {
  identifiant(compteId); texte(pseudo); texte(nom, 40);
  exiger(etat.phase === 'salon', 'Les inscriptions sont closes pour cette saison.');
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
}

export function creerCarriere(config: CreationCarriere, maintenant: number, graine: string): EtatCarriereEnLigne {
  exiger(config && typeof config === 'object', 'Paramètres invalides.');
  identifiant(config.id); texte(config.nom, 60); texte(config.code, 32); entier(config.maxClubs, 2, 64);
  entier(config.rythme, 1, 7);
  texte(graine, 200);
  const etat: EtatCarriereEnLigne = { schema: 1, id: config.id, nom: config.nom.trim(), code: config.code, createurId: config.compteId, creeLe: dateServeur(maintenant), version: 1, saison: 1, phase: 'salon', rythme: config.rythme, maxClubs: config.maxClubs, graine,
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
    clubs: [], cartes: [], packs: copier(PACKS_CARRIERE), competitions: [], rencontres: [], ventes: [], echanges: [], transactions: [], objectifs: [], histoire: [] };
  ajouterClub(etat, config.compteId, config.pseudo, config.clubNom, maintenant, graine, config.embleme);
  return etat;
}

function ouvrirPack(etat: EtatCarriereEnLigne, club: ClubCarriere, packId: string, maintenant: number, graine: string) {
  const pack = etat.packs.find(p => p.id === packId); exiger(pack, 'Pack inconnu.');
  entier(pack.prix, 1); entier(pack.cartes, 1, 12);
  exiger(RARETES_CARRIERE.every(r => Number.isFinite(pack.probabilites[r]) && pack.probabilites[r] >= 0), 'Probabilités de pack invalides.');
  exiger(club.ovas >= pack.prix, 'Ovas insuffisants pour ce pack.');
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
      return pack.probabilites[r];
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
  journal(etat, club, 'pack', -pack.prix, tirees.map(c => c.id), `Pack ${pack.nom} : ${tirees.map(c => c.nom).join(', ')}`, dateServeur(maintenant));
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

function ajouterRencontres(etat: EtatCarriereEnLigne, competition: CompetitionCarriere, journee: number, paires: { domicile: string; exterieur: string }[], debut: number) {
  const intervalle = SEMAINE / etat.rythme;
  for (const paire of paires) etat.rencontres.push({ id: prochainId(etat, 'rencontre', etat.rencontres.length), competitionId: competition.id, journee, ...paire, ouvre: dateServeur(debut), ferme: dateServeur(debut + intervalle) });
}
function calendrierCompetition(etat: EtatCarriereEnLigne, competition: CompetitionCarriere) {
  const debut = Date.parse(competition.debut);
  if (competition.format === 'championnat') {
    const aller = affichesToutesRondes(competition.participants);
    const retour = aller.map(j => j.map(r => ({ domicile: r.exterieur, exterieur: r.domicile })));
    [...aller, ...retour].forEach((paires, i) => ajouterRencontres(etat, competition, i + 1, paires, debut + i * SEMAINE / etat.rythme));
  } else {
    // Un premier tour réduit au plus proche tableau de puissance de deux ; les autres sont exempts.
    const taille = 2 ** Math.floor(Math.log2(competition.participants.length));
    const n = competition.participants.length === taille ? taille / 2 : competition.participants.length - taille;
    const paires = Array.from({ length: n }, (_, i) => ({ domicile: competition.participants[i * 2], exterieur: competition.participants[i * 2 + 1] }));
    ajouterRencontres(etat, competition, 1, paires, debut);
  }
}
function demarrerSaison(etat: EtatCarriereEnLigne, maintenant: number) {
  exiger(etat.phase !== 'saison', 'La saison est déjà en cours.');
  exiger(etat.clubs.length >= 2, 'Invitez au moins un autre manager pour commencer.');
  if (etat.phase === 'intersaison') etat.saison++;
  etat.phase = 'saison'; etat.debutSaison = dateServeur(maintenant);
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
  const lignes = (competition?.participants ?? etat.clubs.map(c => c.id)).map(id => ({ clubId: id, nom: clubParId(etat, id).nom, points: 0, joues: 0, gagnes: 0, nuls: 0, perdus: 0, pour: 0, contre: 0, difference: 0, bonus: 0 }));
  for (const rencontre of etat.rencontres.filter(r => r.competitionId === competition?.id && r.resultat)) {
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
    const titulaires = cartes.filter(c => club.composition.titulaires.includes(c.id));
    const collectif = (c: CarteCarriere) => Math.min(3, titulaires.filter(j => j.id !== c.id && ((c.clubReel && j.clubReel === c.clubReel) || (c.nation && j.nation === c.nation))).length * .3);
    return { clubId: id, nom: club.nom, effectif: cartes.map(c => ({ ...coequipierDepuisCarte(c), note: Math.max(20, Math.min(99, c.note + collectif(c)) - Math.round(c.fatigue * .12)) })), composition: club.composition, strategie: club.strategie };
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
      c.fatigue = Math.max(0, c.fatigue - 22);
      const ligne = minutes.get(c.id);
      if (!ligne && !titulaires.has(c.id)) continue;
      const jouees = ligne?.minutes ?? 80;
      c.matchs++; c.essais += ligne?.essais ?? 0;
      c.fatigue = Math.min(100, c.fatigue + Math.round(jouees * 0.4));
      if (rng() < .018 * (jouees / 80)) c.blesseJusqua = dateServeur(maintenant + (3 + Math.floor(rng() * 6)) * JOUR);
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
      transferer(carte, acheteur, etat.saison); v.etat = 'vendue'; v.acheteurId = acheteur.id;
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
 * éternellement avec sept packs alors que le jeu en propose vingt-trois.
 *
 * On complète donc, sans écraser : les packs ABSENTS sont ajoutés tels quels,
 * et pour ceux qui existent déjà on ne rafraîchit que la PRÉSENTATION (nom,
 * promesse, rayon, garantie annoncée). Le prix et les probabilités — ce qui
 * fait l'économie — restent ceux de la ligue.
 */
function completerPacks(etat: EtatCarriereEnLigne) {
  const connus = new Map(etat.packs.map(p => [p.id, p]));
  for (const modele of PACKS_CARRIERE) {
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
  completerPacks(etat);
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
function reprendre(etat: EtatCarriereEnLigne): EtatCarriereEnLigne {
  const nouveau = copier(etat);
  if (!Number.isFinite(nouveau.dotationOvas)) nouveau.dotationOvas = DOTATION_DEFAUT;
  for (const club of nouveau.clubs) if (!Number.isFinite(club.ovas)) club.ovas = 0;
  actualiserCartesProfessionnelles(nouveau.cartes);
  return nouveau;
}

export function avancerCarriere(etat: EtatCarriereEnLigne, maintenant: number, graine: string): EtatCarriereEnLigne {
  dateServeur(maintenant); const nouveau = reprendre(etat); avancerInterne(nouveau, maintenant, graine);
  nouveau.version = etat.version + 1; return nouveau;
}

export function agirCarriere(etat: EtatCarriereEnLigne, compteId: string, commande: CommandeCarriere, maintenant: number, graine: string): EtatCarriereEnLigne {
  identifiant(compteId); dateServeur(maintenant);
  exiger(commande && typeof commande === 'object' && typeof commande.type === 'string', 'Commande invalide.');
  const nouveau = reprendre(etat); const date = dateServeur(maintenant);
  if (commande.type === 'rejoindre') {
    ajouterClub(nouveau, compteId, commande.pseudo, commande.clubNom, maintenant, graine, commande.embleme);
  } else {
    const club = monClub(nouveau, compteId); avancerInterne(nouveau, maintenant, graine);
    switch (commande.type) {
      case 'actualiser': break;
      case 'demarrerSaison': exiger(compteId === nouveau.createurId, 'Seul le créateur peut lancer la saison.'); demarrerSaison(nouveau, maintenant); break;
      case 'composition': clubLibre(nouveau, club.id); verifierComposition(nouveau, club, commande.composition, maintenant); club.composition = copier(commande.composition); break;
      // ⚠️ On n'enregistre JAMAIS la stratégie telle qu'elle arrive : une valeur
      // inconnue est remplacée par le défaut, jamais refusée. C'est la même
      // fonction que le match en direct, donc un seul endroit décide.
      case 'strategie': club.strategie = strategieValide(commande.strategie); break;

      case 'ouvrirPack': identifiant(commande.packId); ouvrirPack(nouveau, club, commande.packId, maintenant, graine); break;
      case 'vendre': {
        clubLibre(nouveau, club.id); identifiant(commande.carteId); entier(commande.prix, 1); entier(commande.dureeHeures, 1, 168);
        exiger(commande.mode === 'directe' || commande.mode === 'enchere', 'Type de vente invalide.');
        const carte = carteParId(nouveau, commande.carteId); exiger(carte.proprietaire === club.id && !carte.verrou, 'Cette carte ne peut pas être mise en vente.');
        verifierDepart(nouveau, club.id, [carte.id]); const id = prochainId(nouveau, 'vente', nouveau.ventes.length); carte.verrou = id;
        nouveau.ventes.push({ id, carteId: carte.id, vendeurId: club.id, type: commande.mode, prix: commande.prix, expireLe: dateServeur(maintenant + commande.dureeHeures * HEURE), etat: 'ouverte' }); break;
      }
      case 'acheter': {
        const v = nouveau.ventes.find(v => v.id === commande.venteId); exiger(v && v.etat === 'ouverte' && v.type === 'directe' && Date.parse(v.expireLe) > maintenant, 'Cette vente n’est plus disponible.');
        exiger(v.vendeurId !== club.id, 'Vous ne pouvez pas acheter votre propre carte.'); clubLibre(nouveau, club.id); clubLibre(nouveau, v.vendeurId);
        const vendeur = clubParId(nouveau, v.vendeurId), carte = carteParId(nouveau, v.carteId);
        exiger(carte.proprietaire === vendeur.id && carte.verrou === v.id, 'La propriété de cette carte a changé.');
        journal(nouveau, club, 'vente', -v.prix, [carte.id], `Achat : ${carte.nom}`, date); journal(nouveau, vendeur, 'vente', v.prix, [carte.id], `Vente : ${carte.nom}`, date);
        transferer(carte, club, nouveau.saison); v.etat = 'vendue'; v.acheteurId = club.id;
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
      case 'reclamerObjectif': {
        const o = nouveau.objectifs.find(o => o.id === commande.objectifId); exiger(o && o.clubId === club.id && !o.reclame && o.progression >= o.cible, 'Cet objectif ne peut pas être réclamé.');
        o.reclame = true; journal(nouveau, club, 'objectif', o.recompense, [], o.libelle, date); break;
      }
      case 'creerCoupe': {
        exiger(compteId === nouveau.createurId, 'Seul le créateur peut créer une coupe.'); exiger(nouveau.phase === 'saison', 'Lancez une saison avant de créer une coupe.');
        texte(commande.nom); texte(commande.trophee); listeIds(commande.participants); exiger(commande.participants.length >= 2, 'Une coupe nécessite au moins deux clubs.'); commande.participants.forEach(id => clubParId(nouveau, id));
        exiger(commande.format === 'elimination' || commande.format === 'championnat', 'Format de coupe invalide.');
        entier(commande.recompenseParticipation, 0, 1000); entier(commande.recompenseVainqueur, 0, 10000); entier(commande.recompenseFinaliste, 0, 5000);
        exiger(typeof commande.debut === 'string' && Number.isFinite(Date.parse(commande.debut)) && Date.parse(commande.debut) >= maintenant && Date.parse(commande.debut) <= maintenant + 90 * JOUR, 'La coupe doit débuter dans les 90 prochains jours.');
        exiger(nouveau.competitions.filter(c => c.saison === nouveau.saison).length < 3, 'Deux coupes par saison au maximum pour préserver l’économie.');
        const c: CompetitionCarriere = { id: prochainId(nouveau, 'competition', nouveau.competitions.length), nom: commande.nom.trim(), trophee: commande.trophee.trim(), format: commande.format, participants: [...commande.participants], saison: nouveau.saison, debut: new Date(commande.debut).toISOString(), etat: 'enCours', recompenseParticipation: commande.recompenseParticipation, recompenseVainqueur: commande.recompenseVainqueur, recompenseFinaliste: commande.recompenseFinaliste,
          logo: logoCompetitionValide(commande.logo) ? commande.logo : undefined,
          tropheeId: tropheeValide(commande.tropheeId) ? commande.tropheeId : undefined,
          playoffs: commande.format === 'championnat' && commande.playoffs === true && commande.participants.length >= 4 };
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

export function vueCarriere(etat: EtatCarriereEnLigne, compteId: string): VueCarriereEnLigne {
  const club = monClub(etat, compteId);
  const { graine: _secret, clubs: _clubs, cartes: _cartes, rencontres: _rencontres, objectifs: _objectifs, transactions: _transactions, echanges: _echanges, ...publics } = etat;
  return copier({ ...publics, monClubId: club.id,
    clubs: etat.clubs.map(c => { const { compteId: _compte, composition, strategie, ...reste } = c; return c.id === club.id ? { ...reste, composition, strategie } : reste; }),
    cartes: etat.cartes.filter(c => c.proprietaire !== null),
    rencontres: etat.rencontres.map(r => { const { match, ...reste } = r; return match ? { ...reste, match: vueMatchEnLigne(match, club.id) } : reste; }),
    objectifs: etat.objectifs.filter(o => o.clubId === club.id), transactions: etat.transactions.filter(t => t.clubId === club.id),
    echanges: etat.echanges.filter(e => e.de === club.id || e.vers === club.id), classement: classementCarriere(etat),
    vivierDisponible: vivierRestant(new Set(etat.cartes.map(c => c.sourceId))) });
}
