// LE RECRUTEMENT DU MANAGER
//
// Les joueurs viennent des vrais effectifs simulés. Les montants, les attentes
// et les réponses sont déterministes : L'Ovale habille la discussion, mais le
// modèle économique reste jouable hors ligne et ne change pas au rechargement.

import type {
  CibleRecrutementManager, NegociationManager, RoleRecrueManager,
  TermesRecrutementManager,
} from '../types';
import { COMPETITIONS, competitionDuClub } from '../data/clubs';
import { effectifDuClub } from './effectif';
import { graine } from './championnat';
import { pseudoStable } from './comptes';
import { primeDeMatch, salaire } from './offres';

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

/**
 * Le coefficient de richesse d'un étage. ⚠️ C'est LA MÊME fonction pour le prix
 * d'un joueur et pour le budget d'un club : c'est ce qui garantit que le
 * rapport prix/budget reste constant d'une division à l'autre, au lieu de
 * dépendre de deux courbes qu'on aurait réglées séparément.
 */
export function facteurNiveau(niveau: number): number {
  return Math.max(0.28, 1.1 - niveau * 0.075);
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

export function budgetsDuClub(club: string, saison: number): {
  transferts: number; salarial: number;
} {
  const force = forceDuGroupe(club, saison);
  const niveau = competitionDuClub(club)?.niveau ?? 8;
  const facteur = facteurNiveau(niveau);
  const brut = (force - 31) ** 2;
  // ⚠️ CHEZ UN CLUB AMATEUR, « BUDGET TRANSFERTS » NE VEUT PLUS RIEN DIRE — il
  // n'y a plus rien à acheter. L'enveloppe devient un BUDGET DE FONCTIONNEMENT
  // (frais de mutation, structures), d'où le coefficient 0,18 et le plancher
  // abaissé de 150 000 à 60 000 €. Mesuré, l'ancien plancher était précisément
  // ce qui rendait la Régionale 3 absurde : 150 000 € affichés pour un club de
  // village, à côté de joueurs facturés 2,4 M€. Laisser le chiffre tel quel en
  // l'ignorant aurait été pire : un nombre mort à l'écran, et l'écran affiche
  // les deux enveloppes.
  const amateur = estAmateurNiveau(niveau);
  return {
    transferts: amateur
      ? arrondir(Math.max(60_000, brut * 8_200 * facteur * 0.18), 5_000)
      : arrondir(Math.max(150_000, brut * 8_200 * facteur), 25_000),
    salarial: arrondir(Math.max(90_000, brut * 1_850 * facteur), 10_000),
  };
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
  const jeunesse = joueur.age <= 24 ? 1.25 : joueur.age >= 32 ? 0.55 : 1;

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
  const marge = Math.max(0, joueur.potentiel - joueur.note);
  const valeurJoueur = Math.max(0, joueur.note - 31) + Math.min(10, marge * 0.4);
  const indemnite = amateur
    ? 0
    : arrondir(valeurJoueur ** 2 * 3_000 * facteurNiveau(niveauVendeur) * jeunesse * rarete, 25_000);

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

export function coutPremiereSaison(negociation: NegociationManager): number {
  return negociation.joueur.indemnite + negociation.offre.prime;
}
