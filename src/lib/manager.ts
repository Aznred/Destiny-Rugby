// 🧑‍🏫 LE MODE MANAGER — qui a le droit d'entraîner quoi.
//
// Demande, mot pour mot : « prépare le mode manager du jeu, où on peut manager
// n'importe quel club AVEC DE L'EXPÉRIENCE ; si on crée notre carrière manager
// on peut commencer que dans des petits clubs puis évoluer dans de plus gros ;
// et si à la fin de notre carrière joueur on peut devenir entraîneur, avec
// notre statut on peut avoir de meilleurs clubs ; sinon mettre un mode triche
// où on peut partir avec n'importe quel club, mais donc pas dans le classement
// mondial ».
//
// ═══ CE FICHIER NE FAIT QU'UNE CHOSE : IL DIT QUI PEUT ENTRAÎNER QUOI ════════
//
// C'est la couche 1 du chantier, et c'est délibérément la seule. Tout le reste
// — composer le XV, coacher le match, le marché — viendra par-dessus, et
// s'appuiera sur ces règles-là. Les poser d'abord évite le piège classique :
// écrire la semaine du manager, puis découvrir qu'on ne sait pas dire si un
// débutant a le droit d'entraîner le Stade Toulousain.
//
// ⚠️ AUCUNE DÉPENDANCE AU STORE, AUCUN DOM. Comme `classementMondial.ts` et
// `plan.ts` : des fonctions pures, testables sans navigateur, et lisibles par
// l'écran de création comme par le banc d'essai.

import { COMPETITIONS, NOTE_PAR_NIVEAU, clubParNom, competitionDuClub } from '../data/clubs';
import { forceEffectif } from './effectif';
import type { Club, Competition, LegendeSauvegardee, Manager } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LE PRESTIGE — la monnaie du mode manager
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le prestige, de 0 à 100. C'est LUI qui ouvre les portes, et il n'y a rien
 * d'autre.
 *
 * ⚠️ UNE SEULE JAUGE, PAS TROIS. On aurait pu séparer « expérience »,
 * « réputation d'entraîneur » et « palmarès » : trois nombres qui disent la
 * même chose, qu'il faut équilibrer les uns contre les autres, et dont deux
 * finissent par ne servir à rien. Le prestige les résume, et chaque source
 * pousse dessus avec son propre poids (`POUSSEES`).
 */
export const PRESTIGE_MIN = 0;
export const PRESTIGE_MAX = 100;

/** Ce qu'un inconnu vaut au premier jour. Assez pour la Régionale, rien de plus. */
export const PRESTIGE_DEBUT = 6;

/**
 * Ce que chaque fin de saison pousse.
 *
 * ⚠️ RÉUSSIR AVEC UN PETIT CLUB RAPPORTE PLUS QUE RÉUSSIR AVEC UN GROS, et
 * c'est le cœur du mode : `verdictDeSaison` pondère par l'écart entre le rang
 * obtenu et le rang ATTENDU. Un cinquième avec le budget du dernier vaut mieux
 * qu'un titre avec le budget du premier — sinon la seule stratégie serait de
 * prendre le meilleur club accessible et de ne plus bouger.
 */
// ⚠️ RÉÉTALONNÉ APRÈS MESURE, ET L’ÉCART ÉTAIT ÉNORME. Le premier réglage
// (place 1,6 · titre 9 · montée 7 · saison 1,2) menait une carrière réussie à
// **100 de prestige en quinze saisons** : tout le monde entraînable, le Stade
// Toulousain vers la dixième, et plus rien à jouer ensuite. Un mode dont la
// seule jauge sature à mi-carrière n’a plus de courbe. Chaque poussée a donc
// été divisée par ~1,8 : la même carrière finit vers 60, c’est-à-dire au
// niveau de la Nationale ou du bas de la Pro D2 — il reste du chemin.
// ⚠️ Ne pas les remonter sans relancer `scripts/verifManager.ts`.
export const POUSSEES = {
  /** Par place gagnée sur l'objectif du board. */
  parPlaceAuDessus: 0.9,
  /** Par place perdue. Plus cher : on tombe plus vite qu'on ne monte. */
  parPlaceEnDessous: -1.6,
  titre: 5,
  montee: 4,
  descente: -6,
  /** Une saison de plus dans le métier, même sans rien gagner. */
  saison: 0.7,
} as const;

/**
 * La note de club la plus haute qu'un prestige donné ouvre.
 *
 * ⚠️ L'ÉCHELLE EST CELLE DES CLUBS, PAS UNE ÉCHELLE INVENTÉE.
 * `NOTE_PAR_NIVEAU` va de 30 (Régionale 3) à 82 (élite), et les vrais clubs
 * montent à 86 (Stade Toulousain). Le prestige se lit donc directement sur
 * cette règle-là : 0 → 30, 100 → 88. Un débutant ne peut prendre qu'un club
 * noté 30, c'est-à-dire le fond de la Régionale 3 — exactement « on peut
 * commencer que dans des petits clubs ».
 */
export function noteMaximale(prestige: number): number {
  const p = Math.max(PRESTIGE_MIN, Math.min(PRESTIGE_MAX, prestige));
  return 30 + p * 0.58;
}

/**
 * ⚠️ ET ON PEUT TOUJOURS VISER UN CRAN AU-DESSUS. Sans cette marge, la
 * progression se bloque : il faut du prestige pour prendre un meilleur club, et
 * un meilleur club pour gagner du prestige. Deux points, c'est le club qu'on
 * n'était pas censé décrocher — celui qui fait une carrière.
 */
export const MARGE_AMBITION = 2;

// ═══════════════════════════════════════════════════════════════════════════
// 2. LE PASSÉ DE JOUEUR OUVRE DES PORTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le prestige de départ d'un ancien joueur qui passe entraîneur.
 *
 * Demande : « si à la fin de notre carrière joueur on peut devenir entraîneur,
 * avec notre statut on peut avoir de meilleurs clubs ».
 *
 * ⚠️ UN GRAND JOUEUR N'EST PAS UN GRAND ENTRAÎNEUR, et le réglage le dit. Le
 * meilleur palmarès du jeu plafonne autour de **48** — de quoi être accueilli
 * en Nationale ou en bas de Pro D2, jamais en Top 14. C'est la réalité du
 * métier, et c'est aussi ce qui garde une progression à jouer : sans ce
 * plafond, finir une belle carrière de joueur donnerait le Stade Toulousain le
 * lendemain, et le mode manager n'aurait plus de courbe.
 */
export const PRESTIGE_ANCIEN_JOUEUR_MAX = 48;

export function prestigeDepuisJoueur(l: LegendeSauvegardee): number {
  // Trois choses comptent, et elles ne pèsent pas pareil : ce qu'on a gagné,
  // le niveau qu'on a atteint, et le temps qu'on a passé dans le vestiaire.
  const palmares = Math.min(20, (l.tropheeIds?.length ?? l.titres.length) * 2.4);
  const niveau = Math.max(0, (l.note - 55)) * 0.42;
  const duree = Math.min(8, l.saisons * 0.55);
  const renom = l.reputation * 0.06;
  return Math.round(Math.min(
    PRESTIGE_ANCIEN_JOUEUR_MAX,
    PRESTIGE_DEBUT + palmares + niveau + duree + renom,
  ));
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LES CLUBS QU'ON PEUT PRENDRE
// ═══════════════════════════════════════════════════════════════════════════

export interface ClubAccessible {
  club: Club;
  competition: Competition;
  /** La force réelle de l'effectif à cette saison, pas la note figée. */
  force: number;
  /** Le rang que le board attendra. */
  objectif: number;
  /** Au-dessus de la note maximale, mais dans la marge d'ambition. */
  ambitieux: boolean;
}

/**
 * ⚠️ ON LIT LA FORCE RÉELLE DE L'EFFECTIF, PAS LA NOTE DE LA DIVISION.
 *
 * `NOTE_PAR_NIVEAU` dit ce que vaut un étage ; elle ne dit pas qu'un club de
 * Fédérale 1 en pleine génération dorée vaut mieux qu'un promu de Nationale
 * (`lib/generations.ts`). Un manager qui accepte le club le plus fort de son
 * étage doit le sentir dans l'objectif qu'on lui fixe et dans ce qu'il gagne à
 * réussir — sinon la « progression vers de plus gros clubs » n'est qu'un
 * changement de libellé.
 */
export function clubsAccessibles(
  prestige: number, saison: number, options: { triche?: boolean; limite?: number } = {},
): ClubAccessible[] {
  const plafond = options.triche ? Infinity : noteMaximale(prestige) + MARGE_AMBITION;
  const seuil = options.triche ? Infinity : noteMaximale(prestige);
  const tous: ClubAccessible[] = [];

  for (const competition of COMPETITIONS) {
    for (const club of competition.clubs) {
      tous.push({
        club,
        competition,
        force: forceEffectif(club.nom, saison),
        // ⚠️ L'OBJECTIF N'EST CALCULÉ QU'À LA DEMANDE. `objectifDuBoard` classe
        // toute la poule du club : l'appeler pour les 855 clubs du jeu ferait
        // 855 tris de division à chaque ouverture d'écran.
        get objectif() { return objectifDuBoard(club.nom, competition, saison); },
        ambitieux: false,
      });
    }
  }
  for (const c of tous) c.ambitieux = c.force > seuil;

  // Du plus gros au plus petit : on veut voir tout de suite le meilleur club
  // qu'on a le droit de prendre, c'est lui qui dit où on en est.
  tous.sort((a, b) => b.force - a.force);
  let sortie = tous.filter((c) => c.force <= plafond);

  // ⚠️ IL Y A TOUJOURS UN BANC À PRENDRE, ET C'EST UN GARDE-FOU, PAS UN CADEAU.
  // Le banc d'essai a trouvé l'impasse : un entraîneur licencié trois fois
  // retombe à 0 de prestige, `noteMaximale(0)` vaut 30, et le club le plus
  // faible du jeu passe au-dessus dès qu'un de ses effectifs est un peu garni.
  // Plus AUCUN club accessible, donc plus aucun moyen de rejouer une saison,
  // donc plus aucun moyen de remonter : la carrière était morte sans être
  // terminée. On rend alors les clubs les plus faibles du monde — c'est-à-dire
  // exactement là où le métier recommence.
  if (!sortie.length) sortie = tous.slice(-PLANCHER_ACCES);

  return options.limite ? sortie.slice(0, options.limite) : sortie;
}

/** Nombre de clubs rendus quand le prestige n'ouvre plus rien du tout. */
export const PLANCHER_ACCES = 12;

/**
 * Le rang que le board attend, dans la poule du club.
 *
 * ⚠️ IL VIENT DU CLASSEMENT DES FORCES, PAS D'UN TIRAGE. Un objectif inventé se
 * lit comme une punition arbitraire ; un objectif égal au rang que l'effectif
 * mérite est une promesse tenable, et la seule façon de rendre lisible
 * « surperformer ». On lui laisse **une place de mou** : un board raisonnable
 * ne demande pas la place exacte, il demande de ne pas décevoir.
 */
export function objectifDuBoard(
  nomClub: string, competition: Competition | undefined, saison: number,
): number {
  const comp = competition ?? competitionDuClub(nomClub);
  if (!comp) return 8;
  const forces = comp.clubs
    .map((c) => ({ nom: c.nom, force: forceEffectif(c.nom, saison) }))
    .sort((a, b) => b.force - a.force);
  const rang = forces.findIndex((c) => c.nom === nomClub) + 1;
  if (rang <= 0) return Math.max(1, Math.round(comp.clubs.length / 2));
  // Une place de mou, et jamais au-delà du dernier.
  return Math.max(1, Math.min(comp.clubs.length, rang + 1));
}

/** Le club le plus fort qu'un prestige donné met à portée. Sert à l'écran. */
export function meilleurClubAccessible(prestige: number, saison: number): ClubAccessible | null {
  return clubsAccessibles(prestige, saison, { limite: 1 })[0] ?? null;
}

/**
 * L'étage le plus haut qu'on peut viser, en clair.
 *
 * ⚠️ « Tu peux entraîner en Fédérale 2 » se comprend ; « ta note maximale de
 * club est 41,4 » ne veut rien dire pour personne. L'écran de création montre
 * l'étage, le code raisonne sur la note.
 */
export function etageAccessible(prestige: number): Competition | undefined {
  const plafond = noteMaximale(prestige) + MARGE_AMBITION;
  return [...COMPETITIONS]
    .filter((c) => (NOTE_PAR_NIVEAU[c.niveau] ?? 30) <= plafond)
    .sort((a, b) => (NOTE_PAR_NIVEAU[b.niveau] ?? 0) - (NOTE_PAR_NIVEAU[a.niveau] ?? 0))[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA FIN DE SAISON — ce que le board retient
// ═══════════════════════════════════════════════════════════════════════════

export interface VerdictSaison {
  /** Ce que le prestige gagne ou perd. */
  prestige: number;
  /** Ce que la confiance du board gagne ou perd. */
  confiance: number;
  /** Le board a-t-il vu son objectif tenu ? */
  tenu: boolean;
  /** En clair, pour le journal. */
  verdict: string;
}

/** Sous ce seuil de confiance, le board remercie l'entraîneur. */
export const CONFIANCE_LICENCIEMENT = 18;
export const CONFIANCE_DEPART = 50;

export function verdictDeSaison(
  rang: number, objectif: number,
  extras: { titres?: number; montee?: boolean; descente?: boolean } = {},
): VerdictSaison {
  const ecart = objectif - rang; // positif = mieux que demandé
  const tenu = ecart >= 0;
  // ⚠️ `parPlaceEnDessous` EST DÉJÀ NÉGATIF, et `ecart` l'est aussi quand on a
  // manqué : les multiplier redonnerait un gain. On prend donc sa valeur
  // absolue et on soustrait — un double signe dans un calcul de progression est
  // exactement le genre de ligne qu'on relit trois fois sans voir l'erreur.
  let prestige = POUSSEES.saison + ecart * POUSSEES.parPlaceAuDessus;
  if (ecart < 0) prestige = POUSSEES.saison + ecart * Math.abs(POUSSEES.parPlaceEnDessous);
  prestige += (extras.titres ?? 0) * POUSSEES.titre;
  if (extras.montee) prestige += POUSSEES.montee;
  if (extras.descente) prestige += POUSSEES.descente;

  // La confiance suit le même écart, mais elle réagit plus fort et plus vite :
  // un board se lasse en une saison, une réputation se construit en dix.
  const confiance = ecart * (ecart >= 0 ? 7 : 11)
    + (extras.titres ?? 0) * 18
    + (extras.montee ? 20 : 0)
    + (extras.descente ? -35 : 0);

  const verdict = extras.descente ? 'descente'
    : extras.montee ? 'montee'
      : (extras.titres ?? 0) > 0 ? 'titre'
        : ecart >= 3 ? 'exploit'
          : tenu ? 'objectif tenu' : 'objectif manqué';

  return { prestige: Math.round(prestige * 10) / 10, confiance, tenu, verdict };
}

/** Le prestige, borné, après une saison. */
export function appliquerVerdict(m: Manager, v: VerdictSaison): Pick<Manager, 'prestige' | 'confiance'> {
  return {
    prestige: Math.max(PRESTIGE_MIN, Math.min(PRESTIGE_MAX, Math.round((m.prestige + v.prestige) * 10) / 10)),
    confiance: Math.max(0, Math.min(100, Math.round(m.confiance + v.confiance))),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LE SALAIRE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ IL SUIT LE CLUB, PAS LE PRESTIGE. Un entraîneur réputé qui accepte la
 * Fédérale 2 est payé au tarif de la Fédérale 2 : c'est ce qui donne un coût à
 * un choix de carrière, et ce qui rend « accepter plus petit pour se relancer »
 * une vraie décision plutôt qu'un détail cosmétique.
 */
export function salaireManager(force: number): number {
  const brut = Math.pow(Math.max(0, force - 26), 2.15) * 42;
  return Math.max(9_000, Math.round(brut / 1_000) * 1_000);
}

/** Le club existe-t-il vraiment ? Garde-fou du mode libre. */
export function clubJouable(nom: string): boolean {
  return !!clubParNom(nom);
}
