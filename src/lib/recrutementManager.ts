// LE RECRUTEMENT DU MANAGER
//
// Les joueurs viennent des vrais effectifs simulés. Les montants, les attentes
// et les réponses sont déterministes : L'Ovale habille la discussion, mais le
// modèle économique reste jouable hors ligne et ne change pas au rechargement.

import type {
  CibleRecrutementManager, Manager, NegociationClubManager, NegociationManager,
  RecrueManager, RoleRecrueManager, TermesRecrutementManager, TransfertAnnonce,
} from '../types';
import { COMPETITIONS, competitionDuClub } from '../data/clubs';
import { competitionEffective } from './divisions';
import { effectifDuClub, forceMoyenneDivision } from './effectif';
import { graine } from './championnat';
import { pseudoStable } from './comptes';
import { primeDeMatch, salaire } from './offres';
import {
  financesDuClub, indemniteAmateur, indemniteDeRachat, salaryCap, situationDe, valeurEstimee,
} from './economie';

// ═══════════════════════════════════════════════════════════════════════════
// LE RÉGIME ÉCONOMIQUE D'UN CLUB — professionnel ou amateur
// ═══════════════════════════════════════════════════════════════════════════
// Demande explicite : « les clubs ne font pas de transfert payant jusqu'à
// Fédérale 1 / Nationale 2 ; pas de salaire, des primes de match un peu, mais
// sinon rien ».
//
// La table niveau → division française donne la frontière exacte :
//   n1 Top 14 · n2 Pro D2 · n3 Nationale · n4 NATIONALE 2 · n5 FÉDÉRALE 1 ·
//   n6 Fédérale 2 · n7 Fédérale 3 · n8-n10 Régionale 1/2/3
// donc « à partir du niveau 4 ».
//
// ⚠️ POURQUOI UNE RÈGLE MANAGER, ET PAS UNE RETOUCHE DE `PART_AMATEUR`.
// `lib/offres.ts` porte déjà un régime amateur pour le joueur incarné, mais il
// est PROBABILISTE et ne commence qu'à la Fédérale 1 : mesuré, `partAmateur(4)`
// vaut 0 — 100 % des clubs de Nationale 2 salarient — et 0,15 en Fédérale 1.
// Le réutiliser tel quel ne produirait donc PAS ce qui est demandé, et changer
// ses valeurs déplacerait l'étalonnage de difficulté du mode joueur… qu'aucun
// script ne peut mesurer aujourd'hui (`verifDifficulte.ts` compte des saisons
// sans un seul match joué, voir CLAUDE.md). On pose donc la règle DU CÔTÉ
// MANAGER, où elle ne peut rien casser d'autre, et on n'ajoute à `offres.ts`
// que des mots-clés `export` — qui ne changent aucun comportement.
export const PRO_JUSQUA = 3;

/** Ce club vend-il et salarie-t-il, ou est-il amateur ? */
export function estAmateurNiveau(niveau: number): boolean {
  return niveau > PRO_JUSQUA;
}

export type LevierRecrutementManager = 'salaire' | 'prime' | 'duree' | 'role';

const ORDRE_ROLE: RoleRecrueManager[] = ['espoir', 'rotation', 'cadre'];

function arrondir(montant: number, pas: number): number {
  return Math.max(pas, Math.round(montant / pas) * pas);
}

/** La force d'un groupe : la moyenne de ses 23 meilleures notes. */
export function forceDuGroupe(club: string, saison: number): number {
  const groupe = effectifDuClub(club, saison);
  if (!groupe.length) return 45;
  const notes = groupe.map((j) => j.note).sort((a, b) => b - a).slice(0, 23);
  return notes.reduce((s, n) => s + n, 0) / notes.length;
}

/**
 * LES ENVELOPPES D'UN CLUB.
 *
 * ⚠️ ELLES NE SORTENT PLUS DE LA FORCE DU GROUPE, ET C'ÉTAIT LE BUG. L'ancienne
 * formule (`(force − 31)² × k × facteurNiveau`) faisait dépendre le budget de
 * la seule qualité de l'effectif : mesuré, un bon club de Nationale 2 (force
 * 60,5) affichait **1 230 000 € de masse salariale contre 1 110 000 € pour un
 * club moyen de Nationale** (58,3). Une pyramide dont l'étage inférieur paie
 * mieux n'est pas une pyramide.
 *
 * On lit désormais la table d'étage (`lib/economie.ts`), et la force ne sert
 * plus qu'à PLACER le club dans la fourchette de sa division. La hiérarchie est
 * donc vraie par construction.
 *
 * ⚠️ ET `transferts` A CHANGÉ DE NATURE. Ce n'était pas une enveloppe de
 * transferts, c'était le budget du club : 28 650 000 € en Top 14, de quoi
 * acheter deux joueurs à 13 M€. Le rugby français n'achète presque personne —
 * on attend les fins de contrat. C'est maintenant 3 % du budget, soit ~1 M€ en
 * Top 14 : de quoi libérer deux joueurs en cours de contrat dans l'année.
 */
export function budgetsDuClub(club: string, saison: number): {
  transferts: number; salarial: number; structure: number; budget: number;
} {
  const force = forceDuGroupe(club, saison);
  const comp = competitionEffective(club);
  const niveau = comp?.niveau ?? 8;
  // La référence, c'est ce que pèsent VRAIMENT les effectifs de la division.
  const f = financesDuClub(force, niveau, comp ? forceMoyenneDivision(comp.id, saison) : undefined);

  // ⚠️ LE PLAFOND NE PEUT PAS ÊTRE INFÉRIEUR À CE QUE LE CLUB PAIE DÉJÀ, et
  // c'est une leçon de mesure. Le placement dans la fourchette d'étage et la
  // somme des salaires individuels sont deux formules INDÉPENDANTES : elles ne
  // s'accordent jamais parfaitement, et il suffit d'un écart pour qu'un club se
  // retrouve à 103 % ou 125 % de son propre plafond — donc dans l'incapacité de
  // recruter qui que ce soit, dès la première seconde, sans explication.
  // Un club a toujours au moins 15 % de marge sur sa masse actuelle : c'est ce
  // qui rend la contrainte lisible (« il te reste X ») plutôt qu'absurde.
  const engagee = masseSalarialeActuelle(club, saison);
  const cap = salaryCap(niveau);
  const plancher = Math.round(engagee * 1.15 / 10_000) * 10_000;
  const salarial = Math.min(cap ?? Number.POSITIVE_INFINITY, Math.max(f.masseMax, plancher));

  return {
    budget: f.budget,
    transferts: f.recrutement,
    salarial,
    structure: f.structure,
  };
}

/**
 * Ce que le club paie DÉJÀ à ses joueurs — la masse salariale consommée.
 *
 * ⚠️ SANS ELLE, LE PLAFOND NE VEUT RIEN DIRE. « Tu peux avoir énormément
 * d'argent en banque et quand même être incapable de recruter Dupont parce que
 * tu n'as plus assez de place sous ton salary cap » : c'est la demande, et elle
 * suppose de savoir ce qui est déjà engagé. On l'estime sur l'effectif réel,
 * chaque joueur au tarif de son écart au groupe — la même courbe que celle qui
 * fixe ce qu'on proposera à une recrue.
 */
export function masseSalarialeActuelle(club: string, saison: number): number {
  const niveau = competitionDuClub(club)?.niveau ?? 8;
  if (estAmateurNiveau(niveau)) return 0;
  const force = forceDuGroupe(club, saison);
  let total = 0;
  // Les 30 premiers : au-delà, ce sont des jeunes du centre qui ne pèsent rien.
  for (const j of effectifDuClub(club, saison)) {
    total += salaire(niveau, j.note - force, j.age);
  }
  return Math.round(total / 10_000) * 10_000;
}

function roleAttendu(note: number, potentiel: number, age: number, forceClub: number): RoleRecrueManager {
  if (age <= 23 && potentiel >= note + 4) return 'espoir';
  if (note >= forceClub + 1) return 'cadre';
  return 'rotation';
}

/** L'arrondi d'un défraiement, calé sur celui d'`offres.ts` (`primeDeMatch`). */
function arrondirPrime(brut: number): number {
  const pas = brut > 300 ? 50 : brut > 80 ? 10 : 5;
  return Math.max(15, Math.round(brut / pas) * pas);
}

function ciblePour(
  club: string,
  division: string,
  saison: number,
  joueur: ReturnType<typeof effectifDuClub>[number],
  forceClubManager: number,
  niveauVendeur: number,
  forceClubVendeur: number,
): CibleRecrutementManager {
  const rng = graine(`cible-manager#${club}#${joueur.id}#${saison}`);
  // ⚠️ LES QUATRE TIRAGES SONT HISSÉS ICI, DANS L'ORDRE HISTORIQUE, ET RIEN NE
  // DOIT S'INTERCALER. `graine()` est une fermeture à état : seuls le NOMBRE et
  // l'ORDRE des appels déterminent la suite. Changer ce qu'on FAIT d'un tirage
  // est sûr ; en insérer un décale tout ce qui suit et modifie la durée et la
  // prime de TOUTES les cibles du jeu — y compris celles des négociations déjà
  // ouvertes dans une sauvegarde en cours.
  // Tout nouvel aléa prend SA PROPRE graine (`graine('liberer#…')`, etc.).
  const rarete = 0.88 + rng() * 0.24;
  const exigenceSal = rng();
  const partPrime = rng();
  const bonusDuree = rng();

  const amateur = estAmateurNiveau(niveauVendeur);

  // ⚠️ LE PLANCHER `Math.max(35, note - 34)` A SAUTÉ, ET C'ÉTAIT LE BUG.
  // Il n'était inactif qu'à partir d'une note de 69 : en dessous — toute la
  // Nationale, les Fédérales, les Régionales et une partie de la Pro D2 — TOUS
  // les joueurs valaient exactement la même chose. Mesuré : un joueur de
  // Régionale 3 noté 39 était facturé 2 400 000 € à un club qui dispose de
  // 150 000 €, et la Nationale coûtait plus cher que la Pro D2.
  //
  // La nouvelle valeur part du MÊME point d'origine que le budget (`force - 31`
  // dans `budgetsDuClub`) : le rapport prix/budget est donc constant par
  // construction à tous les étages, au lieu de dépendre de deux courbes réglées
  // séparément. Et le potentiel entre DANS le carré au lieu de le multiplier —
  // en multiplicateur, un espoir coûtait presque tout le budget d'un club.
  // Le +10 borne la spéculation : on ne paie jamais un joueur plus de dix points
  // au-dessus de ce qu'il vaut aujourd'hui, sinon il jouerait déjà plus haut.
  // ⚠️ LA VALEUR N'EST PAS LE PRIX, ET C'EST TOUT LE MODÈLE. « Cette valeur ne
  // signifie pas qu'un club paie réellement cette somme à chaque changement de
  // club » : on affiche donc ce que le joueur VAUT, et on ne réclame que ce
  // qu'il faut pour le LIBÉRER avant la fin de son contrat — zéro s'il arrive
  // au bout, et jamais plus que ce que son étage sait négocier.
  const valeur = amateur ? 0 : valeurMarchande(joueur, niveauVendeur, rarete);
  const saisonsRestantes = saisonsDeContrat(club, joueur.id, saison);
  const situation = situationDe(saisonsRestantes, joueur.age, niveauVendeur);
  const indemnite = indemniteDeRachat(valeur, saisonsRestantes, niveauVendeur);

  // ⚠️ UNE SEULE ÉCHELLE DE RÉMUNÉRATION DANS LE JEU. Le manager réclamait
  // `valeur² × 180`, soit une QUATRIÈME formule de salaire (après `offres.ts`,
  // et le contrat de repli du store) — et elle produisait 290 000 € pour un
  // joueur de Nationale à qui le mode joueur propose 42 000 €. On passe donc
  // par `salaire()` d'`offres.ts`, âge compris.
  //
  // ⚠️ L'écart se mesure sur la force RÉELLE du club vendeur, pas sur
  // `NOTE_PAR_NIVEAU` : la table annonce 64 pour la Nationale quand ses
  // effectifs pèsent 53 — passer par elle sous-paierait toute la division.
  const ecart = joueur.note - forceClubVendeur;
  // Ce que le joueur demande au-dessus du marché. L'offre d'ouverture du manager
  // valant ×0,82, on ouvre sous le marché et on l'atteint en négociant bien —
  // la philosophie du `OUVERTURE = 0,86` du côté joueur.
  const gourmandise = 1.02 + exigenceSal * 0.22;
  const salaireDemande = amateur
    ? 0
    : arrondir(salaire(niveauVendeur, ecart, joueur.age) * gourmandise, 5_000);
  const primeMatchDemandee = amateur
    ? arrondirPrime(primeDeMatch(niveauVendeur, ecart, joueur.age) * gourmandise)
    : 0;

  const roleDemande = roleAttendu(joueur.note, joueur.potentiel, joueur.age, forceClubManager);
  return {
    id: `${club}#${joueur.id}`,
    pseudo: pseudoStable(joueur.nom),
    nom: joueur.nom,
    club,
    division,
    poste: joueur.poste,
    age: joueur.age,
    note: joueur.note,
    potentiel: joueur.potentiel,
    nation: joueur.nation,
    indemnite,
    valeur,
    saisonsRestantes,
    situation,
    salaireDemande,
    // Un club amateur ne verse aucune prime à la signature : il n'a pas de
    // trésorerie pour ça. Même règle que côté joueur (`offres.ts`).
    primeDemandee: amateur ? 0 : arrondir(salaireDemande * (0.12 + partPrime * 0.18), 2_500),
    primeMatchDemandee,
    dureeDemandee: joueur.age >= 31 ? 2 : 3 + (bonusDuree > 0.72 ? 1 : 0),
    roleDemande,
  };
}

/**
 * Le marché d'une compétition. « Tous les clubs » reste borné pour les grands
 * championnats amateurs ; choisir un club donne toujours son effectif complet.
 */
/**
 * CE QUE VAUT UN JOUEUR, dans un sens comme dans l'autre.
 *
 * ⚠️ UNE SEULE ÉCHELLE, ET C'EST LA RAISON D'ÊTRE DE CETTE FONCTION. Le prix
 * qu'on paie pour recruter (`ciblePour`) et celui qu'on encaisse en vendant
 * (`lib/vestiaireManager.ts`) doivent sortir de la MÊME ligne : deux barèmes,
 * c'est un jour deux vérités — et un manager qui achète 4 M€ ce qu'il revend
 * 900 000 € le lendemain sans que rien n'ait bougé.
 *
 * ⚠️ ET ELLE RENVOIE 0 CHEZ UN AMATEUR. Sous la Nationale 2, le rugby français
 * ne se vend pas de joueurs (demande explicite) : il n'y a rien à encaisser,
 * pas plus qu'il n'y a rien à payer.
 */
export function valeurMarchande(
  joueur: { note: number; potentiel: number; age: number },
  niveau: number,
  rarete = 1,
): number {
  // ⚠️ PLUS DE ZÉRO SEC : voir indemniteAmateur (lib/economie.ts). Sept des dix
  //    divisions françaises sont amateurs, et la carrière d’entraîneur commence
  //    là — rendre 0 y supprimait purement et simplement le marché.
  if (estAmateurNiveau(niveau)) return indemniteAmateur(joueur, niveau);
  return arrondir(valeurEstimee(joueur) * rarete, 5_000);
}

/**
 * COMBIEN DE SAISONS DE CONTRAT IL RESTE À UN JOUEUR DU MONDE.
 *
 * ⚠️ AUCUN JOUEUR DU JEU N'AVAIT DE CONTRAT — seul le joueur incarné en a un.
 * Or c'est LA donnée qui commande tout le nouveau marché : à zéro saison, le
 * transfert est gratuit et n'importe qui peut se manifester. On la tire donc,
 * de façon déterministe (graine = joueur + club), sur une durée de vie de
 * contrat crédible, et on la fait courir avec les saisons.
 *
 * ⚠️ ET ELLE EST STABLE D'UNE CONSULTATION À L'AUTRE : rouvrir le marché ne
 * redonne pas trois ans à un joueur qui était en fin de contrat. C'est la même
 * protection anti-save-scumming que les plafonds cachés des négociations.
 */
export function saisonsDeContrat(club: string, idJoueur: string, saison: number): number {
  const rng = graine(`contrat#${club}#${idJoueur}`);
  const duree = 2 + Math.floor(rng() * 3); // 2 à 4 saisons
  const debut = Math.floor(rng() * duree); // là où il en était à la saison 1
  const ecoulees = (debut + saison - 1) % duree;
  return duree - ecoulees - 1;
}

export function ciblesDuMarche(
  division: string,
  saison: number,
  clubManager: string,
  clubFiltre = '',
  max = 72,
): CibleRecrutementManager[] {
  const comp = COMPETITIONS.find((c) => c.id === division);
  if (!comp) return [];
  const forceManager = forceDuGroupe(clubManager, saison);
  const clubs = clubFiltre
    ? comp.clubs.filter((c) => c.nom === clubFiltre)
    : comp.clubs.filter((c) => c.nom !== clubManager).slice(0, 18);
  const parClub = clubFiltre ? 60 : Math.max(4, Math.ceil(max / Math.max(1, clubs.length)));
  // ⚠️ LE PRIX D'UN JOUEUR DÉPEND DE SON CLUB VENDEUR, PAS DU NÔTRE : son étage
  // fixe le régime (professionnel ou amateur) et sa richesse ; la force de SON
  // groupe dit s'il y est un cadre ou un remplaçant, donc ce qu'il réclame.
  // Les deux se calculent une fois par club, pas une fois par joueur.
  const niveauVendeur = comp.niveau;
  return clubs.flatMap((club) => {
    const forceVendeur = forceDuGroupe(club.nom, saison);
    return [...effectifDuClub(club.nom, saison)]
      .sort((a, b) => b.note - a.note || b.potentiel - a.potentiel)
      .slice(0, parClub)
      .map((joueur) => ciblePour(
        club.nom, division, saison, joueur, forceManager, niveauVendeur, forceVendeur,
      ));
  })
    .filter((c) => c.club !== clubManager)
    .sort((a, b) => b.note - a.note || b.potentiel - a.potentiel)
    .slice(0, max);
}

export function ouvrirNegociationManager(
  cible: CibleRecrutementManager,
  saison: number,
  semaine: number,
): NegociationManager {
  const exigences: TermesRecrutementManager = {
    salaire: cible.salaireDemande,
    prime: cible.primeDemandee,
    primeMatch: cible.primeMatchDemandee,
    duree: cible.dureeDemandee,
    role: cible.roleDemande,
  };
  const rang = Math.max(0, ORDRE_ROLE.indexOf(cible.roleDemande) - 1);
  // ⚠️ ON N'OUVRE PAS SOUS ZÉRO. `arrondir()` renvoie au minimum son pas : sur
  // un contrat amateur, `arrondir(0, 5 000)` rendrait 5 000 € de salaire là où
  // le club n'en verse aucun. Chaque montant nul reste donc nul explicitement.
  const sousOffre = (montant: number, part: number, pas: number) =>
    (montant > 0 ? arrondir(montant * part, pas) : 0);
  return {
    id: `nego-manager#${cible.id}#${saison}`,
    pseudo: cible.pseudo,
    joueur: cible,
    offre: {
      salaire: sousOffre(cible.salaireDemande, 0.82, 5_000),
      prime: sousOffre(cible.primeDemandee, 0.55, 2_500),
      primeMatch: cible.primeMatchDemandee > 0
        ? arrondirPrime(cible.primeMatchDemandee * 0.82)
        : 0,
      duree: Math.max(1, cible.dureeDemandee - 1),
      role: ORDRE_ROLE[rang],
    },
    exigences,
    patience: 4,
    etat: 'ouverte',
    saison,
    semaine,
  };
}

/** Un contrat amateur : pas de salaire, un défraiement par feuille de match. */
export function contratAmateur(t: TermesRecrutementManager): boolean {
  return t.salaire <= 0 && (t.primeMatch ?? 0) > 0;
}

/**
 * ⚠️ CE SCORE NE POUVAIT PAS CONCLURE UN CONTRAT AMATEUR, et le bug était
 * silencieux. Chez un club sans salaire, `exigences.salaire` vaut 0 : le
 * `Math.max(1, …)` protège de la division par zéro, mais `offre.salaire / 1`
 * vaut alors 0 — et la prime à la signature aussi. Le score plafonnait donc à
 * `0,12 × 1,1 + 0,22 = 0,352` pour un seuil d'accord de 0,94 : le joueur
 * refusait indéfiniment, et la négociation se terminait toujours par « le club
 * se braque », ce qui est un comportement légitime du jeu. Introuvable.
 *
 * L'axe de rémunération est donc CHOISI selon le régime : le salaire chez un
 * professionnel, le défraiement chez un amateur. Les poids ne bougent pas — la
 * négociation garde exactement la même amplitude des deux côtés.
 */
function score(offre: TermesRecrutementManager, exigences: TermesRecrutementManager): number {
  const amateur = contratAmateur(exigences);
  const remuneration = amateur
    ? Math.min(1.15, (offre.primeMatch ?? 0) / Math.max(1, exigences.primeMatch ?? 0))
    : Math.min(1.15, offre.salaire / Math.max(1, exigences.salaire));
  // Un club amateur ne verse pas de prime à la signature : le poids de cet axe
  // rejoint la rémunération plutôt que de rester acquis ou perdu d'avance.
  const prime = amateur
    ? remuneration
    : Math.min(1.15, offre.prime / Math.max(1, exigences.prime));
  const duree = Math.min(1.1, offre.duree / Math.max(1, exigences.duree));
  const role = ORDRE_ROLE.indexOf(offre.role) >= ORDRE_ROLE.indexOf(exigences.role) ? 1 : 0.55;
  return remuneration * 0.52 + prime * 0.14 + duree * 0.12 + role * 0.22;
}

export function negocierAvecJoueur(
  negociation: NegociationManager,
  levier: LevierRecrutementManager,
): { negociation: NegociationManager; accord: boolean } {
  if (negociation.etat !== 'ouverte') return { negociation, accord: negociation.etat === 'accord' };
  const offre = { ...negociation.offre };
  const amateur = contratAmateur(negociation.exigences);
  // ⚠️ CHEZ UN AMATEUR, « PLUS DE SALAIRE » NÉGOCIE LE DÉFRAIEMENT. Multiplier
  // un salaire nul par 1,12 laisse zéro : le levier le plus utilisé du jeu
  // serait un bouton mort. Même bascule que côté joueur (`negociation.ts`), où
  // le levier salaire agit sur `primeMatch` quand le club n'en verse pas.
  if (levier === 'salaire') {
    if (amateur) offre.primeMatch = arrondirPrime((offre.primeMatch ?? 0) * 1.12);
    else offre.salaire = arrondir(offre.salaire * 1.12, 5_000);
  }
  // Un club amateur n'a pas de prime à la signature : le levier retombe sur le
  // défraiement plutôt que d'être proposé sans effet.
  if (levier === 'prime') {
    if (amateur) offre.primeMatch = arrondirPrime((offre.primeMatch ?? 0) * 1.1);
    else offre.prime = arrondir(offre.prime * 1.35, 2_500);
  }
  if (levier === 'duree') offre.duree = Math.min(5, offre.duree + 1);
  if (levier === 'role') {
    offre.role = ORDRE_ROLE[Math.min(ORDRE_ROLE.length - 1, ORDRE_ROLE.indexOf(offre.role) + 1)];
  }
  const accord = score(offre, negociation.exigences) >= 0.94;
  const patience = Math.max(0, negociation.patience - 1);
  return {
    accord,
    negociation: {
      ...negociation,
      offre,
      patience,
      etat: accord ? 'accord' : patience === 0 ? 'rompue' : 'ouverte',
    },
  };
}

export function accepterDemandesJoueur(negociation: NegociationManager): NegociationManager {
  if (negociation.etat !== 'ouverte') return negociation;
  return { ...negociation, offre: { ...negociation.exigences }, etat: 'accord' };
}

/**
 * Ce que la signature coûte tout de suite.
 *
 * ⚠️ `indemniteNegociee` PASSE DEVANT LE PRIX AFFICHÉ, et c'est tout l'intérêt
 * d'avoir parlé au club vendeur : sans ce paramètre, on aurait négocié une
 * indemnité pour finalement payer celle du départ, et la discussion avec le
 * club n'aurait servi qu'à faire perdre du temps.
 */
export function coutPremiereSaison(
  negociation: NegociationManager, indemniteNegociee?: number,
): number {
  const indemnite = indemniteNegociee ?? negociation.joueur.indemnite;
  return indemnite + negociation.offre.prime;
}

/**
 * Une signature est définitive dans ce marché : elle ne peut pas devenir une
 * nouvelle négociation de contrat en rouvrant l'ancien message du club.
 */
export function joueurDejaRecrute(
  manager: Pick<Manager, 'recrues' | 'negociations'>,
  cibleId: string,
): boolean {
  return manager.recrues.some((r) => r.joueur.id === cibleId)
    || manager.negociations.some((n) => n.joueur.id === cibleId && n.etat === 'signee');
}

export interface ReparationRecrutementManager {
  recrues: RecrueManager[];
  negociations: NegociationManager[];
  negociationsClubs: NegociationClubManager[];
  transfertsSociaux: TransfertAnnonce[];
  doublonsSupprimes: number;
  remboursementTransferts: number;
  remboursementSalarial: number;
}

const RANG_NEGOCIATION: Record<NegociationManager['etat'], number> = {
  rompue: 0, ouverte: 1, accord: 2, signee: 3,
};
const RANG_NEGOCIATION_CLUB: Record<NegociationClubManager['etat'], number> = {
  rompue: 0, ouverte: 1, accord: 2,
};

function cleTransfert(t: TransfertAnnonce): string {
  const normaliser = (texte: string) => texte.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  return [normaliser(t.nom), normaliser(t.de), normaliser(t.vers), t.saison].join('|');
}

/**
 * Répare les sauvegardes touchées par l'ancien bouton « Écrire au joueur ».
 *
 * Le bouton recréait une négociation avec le même identifiant. Le prochain
 * levier remplaçait alors aussi l'ancien état `signee`, ce qui autorisait une
 * deuxième signature, un deuxième débit et un deuxième transfert social.
 * On conserve la première vraie recrue, ferme son dossier, retire les copies
 * et rembourse exactement chaque débit surnuméraire.
 */
export function reparerRecrutementsDupliques(
  manager: Pick<Manager, 'recrues' | 'negociations' | 'negociationsClubs'>,
  transfertsSociaux: TransfertAnnonce[],
): ReparationRecrutementManager {
  const recrues: RecrueManager[] = [];
  const recrueParCible = new Map<string, RecrueManager>();
  let doublonsSupprimes = 0;
  let remboursementTransferts = 0;
  let remboursementSalarial = 0;

  for (const recrue of manager.recrues) {
    if (!recrueParCible.has(recrue.joueur.id)) {
      recrueParCible.set(recrue.joueur.id, recrue);
      recrues.push(recrue);
      continue;
    }
    doublonsSupprimes++;
    const dossier = [...manager.negociationsClubs].reverse().find((n) => (
      n.cible.id === recrue.joueur.id && n.saison === recrue.saison && n.etat === 'accord'
    ));
    remboursementTransferts += (dossier?.offre ?? recrue.joueur.indemnite) + recrue.termes.prime;
    remboursementSalarial += recrue.termes.salaire;
  }

  // Un même id ne doit décrire qu'un dossier. Si plusieurs états survivent,
  // le plus avancé gagne ; à rang égal, le plus récent porte la dernière offre.
  const negociationsParId = new Map<string, NegociationManager>();
  for (const nego of manager.negociations) {
    const avant = negociationsParId.get(nego.id);
    if (!avant || RANG_NEGOCIATION[nego.etat] >= RANG_NEGOCIATION[avant.etat]) {
      negociationsParId.set(nego.id, nego);
    }
  }

  const libres: NegociationManager[] = [];
  const finaleParCible = new Map<string, NegociationManager>();
  for (const nego of negociationsParId.values()) {
    const recrue = recrueParCible.get(nego.joueur.id);
    if (!recrue) {
      libres.push(nego);
      continue;
    }
    const avant = finaleParCible.get(nego.joueur.id);
    const priorite = (n: NegociationManager) => (
      (n.etat === 'signee' ? 10 : 0) + (n.saison === recrue.saison ? 2 : 0) + n.semaine / 100
    );
    if (!avant || priorite(nego) >= priorite(avant)) finaleParCible.set(nego.joueur.id, nego);
  }
  const finales = [...finaleParCible.entries()].map(([cibleId, nego]) => ({
    ...nego,
    offre: { ...recrueParCible.get(cibleId)!.termes },
    etat: 'signee' as const,
  }));

  const negociationsClubsParId = new Map<string, NegociationClubManager>();
  for (const nego of manager.negociationsClubs) {
    const avant = negociationsClubsParId.get(nego.id);
    if (!avant || RANG_NEGOCIATION_CLUB[nego.etat] >= RANG_NEGOCIATION_CLUB[avant.etat]) {
      negociationsClubsParId.set(nego.id, nego);
    }
  }

  const transfertsVus = new Set<string>();
  const transfertsNettoyes = transfertsSociaux.filter((transfert) => {
    const cle = cleTransfert(transfert);
    if (transfertsVus.has(cle)) return false;
    transfertsVus.add(cle);
    return true;
  });

  return {
    recrues,
    negociations: [...libres, ...finales],
    negociationsClubs: [...negociationsClubsParId.values()],
    transfertsSociaux: transfertsNettoyes,
    doublonsSupprimes,
    remboursementTransferts,
    remboursementSalarial,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LA PORTÉE SPORTIVE — « c'est trop facile de recruter qui on veut »
// ═══════════════════════════════════════════════════════════════════════════
// Retour de jeu, et c'est un défaut de conception, pas un réglage : de la
// Régionale 3 à la Nationale, on signait n'importe qui.
//
// ⚠️ LA CAUSE : LA NÉGOCIATION N'AVAIT AUCUN CRITÈRE SPORTIF. `score()` ne
// pèse que du CONTRACTUEL — rémunération, prime, durée, rôle — et rien n'y
// demande jamais « ce joueur accepterait-il seulement ce club ? ». Or dans le
// bas de la pyramide, les exigences contractuelles sont dérisoires (un
// défraiement de trente euros la feuille de match) : elles se satisfont d'un
// clic, et il ne restait donc AUCUN obstacle entre un club de Régionale 3 et
// le meilleur joueur du monde.
//
// ⚠️ ET LA RÈGLE EXISTE DÉJÀ, DE L'AUTRE CÔTÉ. `lib/offres.ts` la tient pour
// le joueur incarné depuis longtemps, sous deux formes : « on ne saute pas deux
// étages d'un coup » et un plafond de niveau au-dessus duquel un club ne fait
// pas rêver. C'est littéralement le même problème vu du banc — le mode manager
// ne l'avait simplement jamais reçu. On le reprend donc mot pour mot plutôt que
// d'inventer une seconde doctrine qui dirait un jour le contraire.

/**
 * Ce qu'un club peut convaincre AU-DESSUS de la moyenne de son groupe.
 *
 * ⚠️ IL EN FAUT UNE, ET ELLE DOIT ÊTRE PETITE. À zéro, un club ne pourrait
 * jamais recruter mieux que ce qu'il a déjà : aucun effectif ne progresserait
 * par le marché, et la seule voie de progression serait le centre de formation.
 * Quatre points, c'est le renfort qui fait une saison sans faire un miracle.
 */
const MARGE_ATTRACTIVITE = 4;

export interface PorteeSportive {
  /** Ce club peut-il seulement espérer ce joueur ? */
  aPortee: boolean;
  /** La note la plus haute que le club peut convaincre aujourd'hui. */
  plafond: number;
  /** Ce qui bloque, quand ça bloque. */
  motif?: 'niveau' | 'etage';
  /** Combien d'étages séparent le joueur du club (positif = il descend). */
  chute: number;
}

/**
 * ⚠️ LE SAUT D'ÉTAGE EST PLUS LARGE EN AMATEUR, ET C'EST VOULU. Dans le monde
 * professionnel, changer de club est une décision sportive : on ne descend pas
 * de trois divisions. En Fédérale et en Régionale, on bouge pour un travail,
 * une mutation, un retour au pays — le sportif ne commande plus seul. Sans
 * cette ouverture, un club de Régionale 3 ne pourrait même pas recruter en
 * Fédérale 3, ce qui est pourtant le mouvement le plus banal de la pyramide.
 */
function chuteMax(age: number, niveauClub: number): number {
  return (age <= 22 ? 3 : 2) + (niveauClub >= 4 ? 2 : 0);
}

/**
 * Ce club peut-il attirer ce joueur ?
 *
 * ⚠️ DEUX CRITÈRES, ET IL FAUT LES DEUX. Le PLAFOND DE NIVEAU règle le cas
 * général — un groupe à 30 ne convainc pas un joueur à 90 — mais il laisse
 * passer le club au groupe anormalement fort pour son étage. Le SAUT D'ÉTAGE
 * ferme celui-là : on ne dégringole pas la pyramide entière pour un
 * défraiement.
 *
 * ⚠️ LE PRESTIGE DE L'ENTRAÎNEUR COMPTE, un peu. C'est la jauge centrale du
 * mode, et il serait étrange qu'elle n'ouvre que des BANCS sans jamais aider à
 * convaincre un joueur. Divisé par 10, il vaut au mieux dix points de plafond
 * à 100 de prestige : de quoi faire signer un renfort qu'on n'aurait pas eu,
 * jamais de quoi renverser la hiérarchie.
 */
export function porteeSportive(
  cible: Pick<CibleRecrutementManager, 'note' | 'age' | 'club' | 'situation'>,
  club: string,
  saison: number,
  prestige = 0,
): PorteeSportive {
  // ⚠️ LA DIVISION EFFECTIVE, PAS CELLE D'ORIGINE. Un club promu joue dans sa
  // nouvelle poule partout ailleurs dans le mode ; le marché doit le juger sur
  // celle-là, sinon la promotion n'ouvre aucun recrutement.
  const comp = competitionEffective(club);
  const niveauClub = comp?.niveau ?? 8;
  const niveauJoueur = competitionEffective(cible.club)?.niveau ?? niveauClub;

  // Un joueur libre a moins d'options : il regarde un cran plus bas.
  const libre = cible.situation === 'libre' || cible.situation === 'finDeContrat';
  // Un jeune descend pour jouer, un vétéran pour finir : ce sont les deux âges
  // où l'on accepte un club en dessous de son niveau.
  const age = cible.age <= 22 ? 3 : cible.age >= 32 ? 3 : 0;

  // ⚠️ L'ANCRE EST LE PLUS HAUT DES DEUX : SON GROUPE, OU SA DIVISION.
  //
  // Le plafond n'a longtemps lu que `forceDuGroupe`, et c'était une IMPASSE
  // pour tout club plus faible que son étage — c'est-à-dire pour tout promu.
  // On compare une note INDIVIDUELLE à une MOYENNE d'effectif : le meilleur
  // joueur d'une poule est toujours très au-dessus de la moyenne de la poule.
  // Mesuré en Nationale 2 (notes réelles : q1 57, médiane 61) :
  //
  //   groupe 45 → plafond 49 →  1 % de sa PROPRE division à portée
  //   groupe 50 → plafond 54 → 10 %  (40 % en visant un vétéran libre)
  //   groupe 64 → plafond 68 → 93 %
  //
  // Autrement dit : on montait de division, on avait besoin de se renforcer,
  // et la règle interdisait TOUT recrutement — y compris les moins bons de sa
  // nouvelle poule et les fins de carrière. Le garde-fou censé empêcher une
  // Régionale 3 de signer le meilleur joueur du monde empêchait surtout un
  // club en difficulté de signer qui que ce soit.
  //
  // Ancrer sur `forceMoyenneDivision` ne rouvre PAS la porte du haut : c'est la
  // référence de l'étage où l'on joue, donc ~34 en Régionale 3 et ~86 en
  // Top 14. Un club garde toujours accès au marché de sa division ; il ne gagne
  // rien au-dessus.
  const reference = comp
    ? Math.max(forceDuGroupe(club, saison), forceMoyenneDivision(comp.id, saison))
    : forceDuGroupe(club, saison);
  const plafond = reference + MARGE_ATTRACTIVITE + age + (libre ? 2 : 0) + prestige / 10;

  const chute = niveauClub - niveauJoueur;
  if (chute > chuteMax(cible.age, niveauClub)) {
    return { aPortee: false, plafond, motif: 'etage', chute };
  }
  if (cible.note > plafond) return { aPortee: false, plafond, motif: 'niveau', chute };
  return { aPortee: true, plafond, chute };
}
