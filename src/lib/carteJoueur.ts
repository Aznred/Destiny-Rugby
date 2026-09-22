// ═══════════════════════════════════════════════════════════════════════════
// LA CARTE D'UN JOUEUR — « un 82 pilier et un 82 ailier »
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « les cartes pourraient donner toutes les infos importantes sans
// avoir à ouvrir le profil du joueur », avec six statistiques par carte — et
// surtout :
//
//   « Et je changerais les 6 stats selon le poste. C'est important. Un pilier ne
//     doit pas être jugé sur les mêmes choses qu'un ailier. […] Ça permet
//     d'avoir un 82 pilier et un 82 ailier sans prétendre qu'ils ont les mêmes
//     qualités. »
//
// ⚠️ IL FALLAIT D'ABORD QUE CES QUALITÉS EXISTENT. Le jeu ne donnait AUCUN
// attribut aux joueurs d'un effectif : `Coequipier` porte une note, un potentiel,
// un âge, un poste — et rien d'autre. Seul le joueur incarné a des attributs.
// Afficher six barres tirées de la seule note aurait donné six copies du même
// nombre, c'est-à-dire précisément ce que la demande veut éviter.
//
// ⚠️ ON LES DÉRIVE DONC, ET DE FAÇON DÉTERMINISTE. C'est la méthode déjà
// employée partout dans le projet pour ce que les données ne fournissent pas
// (l'âge et la note des joueurs amateurs, la position des clubs) : une graine
// stable, ici l'identifiant du joueur. Rien à sauvegarder, et la carte d'un
// joueur ne change jamais entre deux ouvertures de l'écran.

import { POSTES } from '../data/rugby.js';
import type { AttributId, FamillePoste, PosteId } from '../types.js';
import { graine } from './championnat.js';
import type { Coequipier } from './effectif.js';

/**
 * Les six axes affichables, dont cinq propres au rugby qui n'existent pas dans
 * `Attributs` : ils se déduisent des huit attributs de base.
 */
export type AxeCarte =
  | 'vitesse' | 'force' | 'endurance' | 'plaquage' | 'passe' | 'jeuAuPied'
  | 'vision' | 'mental'
  | 'melee' | 'touche' | 'ruck' | 'technique' | 'physique' | 'defense';

export const ABREVIATION: Record<AxeCarte, string> = {
  vitesse: 'VIT', force: 'FRC', endurance: 'END', plaquage: 'PLQ',
  passe: 'PAS', jeuAuPied: 'JDP', vision: 'VIS', mental: 'MEN',
  melee: 'MEL', touche: 'TOU', ruck: 'RCK', technique: 'TEC',
  physique: 'PHY', defense: 'DEF',
};

/**
 * LES SIX AXES DE CHAQUE FAMILLE DE POSTE — repris de la demande.
 *
 * ⚠️ CE N'EST PAS UN CHOIX D'AFFICHAGE, C'EST UN CHOIX DE JUGEMENT. Montrer la
 * vitesse d'un pilier et la mêlée d'un ailier, c'est prétendre qu'on les compare
 * sur la même échelle. Les six axes disent ce qu'on ATTEND de ce maillot.
 */
export const AXES_PAR_FAMILLE: Record<FamillePoste, AxeCarte[]> = {
  pilier: ['melee', 'physique', 'defense', 'ruck', 'endurance', 'technique'],
  talonneur: ['melee', 'touche', 'physique', 'defense', 'ruck', 'technique'],
  deuxieme_ligne: ['physique', 'defense', 'touche', 'ruck', 'endurance', 'technique'],
  troisieme_ligne: ['defense', 'ruck', 'physique', 'endurance', 'technique', 'vitesse'],
  demi_melee: ['passe', 'jeuAuPied', 'vision', 'technique', 'defense', 'vitesse'],
  demi_ouverture: ['passe', 'jeuAuPied', 'vision', 'technique', 'defense', 'vitesse'],
  centre: ['vitesse', 'passe', 'technique', 'defense', 'physique', 'jeuAuPied'],
  ailier: ['vitesse', 'passe', 'technique', 'defense', 'jeuAuPied', 'physique'],
  arriere: ['vitesse', 'passe', 'technique', 'defense', 'jeuAuPied', 'physique'],
};

export function familleDePoste(poste: PosteId): FamillePoste {
  return POSTES.find((p) => p.id === poste)?.famille ?? 'centre';
}

export function axesDe(poste: PosteId): AxeCarte[] {
  return AXES_PAR_FAMILLE[familleDePoste(poste)];
}

/**
 * LE PROFIL DE CHAQUE FAMILLE, en écarts à la note générale.
 *
 * ⚠️ LA SOMME DES ÉCARTS EST PROCHE DE ZÉRO dans chaque ligne, et c'est la
 * condition pour que la note générale reste comparable d'un poste à l'autre. Un
 * profil qui ajouterait dix points partout ferait d'un pilier noté 82 un
 * meilleur joueur qu'un ailier noté 82 — exactement ce que la demande refuse.
 */
// ⚠️ CHAQUE LIGNE SOMME EXACTEMENT À ZÉRO, et ce n'est pas de l'esthétique.
// Mesuré sur la première version : le pilier perdait 2,75 points de moyenne et
// le demi de mêlée en gagnait 1,4, soit 4,4 points d'écart entre familles. Un
// pilier noté 82 valait donc moins qu'un demi de mêlée noté 82 — alors que TOUT
// le jeu (marché, salary cap, classements, force d'effectif) raisonne sur cette
// note comme sur une échelle commune. Le profil doit REDISTRIBUER, jamais
// ajouter. Le banc d'essai refuse plus de 3 points d'écart entre familles.
const PROFIL: Record<FamillePoste, Partial<Record<AttributId, number>>> = {
  pilier: { force: 20, plaquage: 8, endurance: 7, mental: 5, vision: -2, passe: -9, jeuAuPied: -17, vitesse: -12 },
  talonneur: { force: 16, mental: 7, plaquage: 6, passe: 3, endurance: 2, vision: -3, vitesse: -13, jeuAuPied: -18 },
  deuxieme_ligne: { force: 18, plaquage: 8, endurance: 4, mental: 2, vision: -3, passe: -8, vitesse: -13, jeuAuPied: -8 },
  troisieme_ligne: { plaquage: 10, endurance: 7, force: 6, mental: 2, vitesse: 0, vision: -2, passe: -5, jeuAuPied: -18 },
  demi_melee: { passe: 15, vision: 12, vitesse: 5, mental: 4, jeuAuPied: 3, endurance: -2, plaquage: -9, force: -28 },
  demi_ouverture: { jeuAuPied: 18, vision: 15, passe: 12, mental: 5, vitesse: 0, endurance: -3, plaquage: -13, force: -34 },
  centre: { plaquage: 7, vitesse: 7, passe: 4, vision: 3, force: 2, mental: -1, endurance: -2, jeuAuPied: -20 },
  ailier: { vitesse: 18, passe: 3, endurance: 2, mental: 0, vision: -2, plaquage: -6, jeuAuPied: -5, force: -10 },
  arriere: { jeuAuPied: 14, vitesse: 11, vision: 7, passe: 3, mental: 1, endurance: -2, plaquage: -9, force: -25 },
};

const ATTRIBUTS: AttributId[] = [
  'vitesse', 'force', 'endurance', 'plaquage', 'passe', 'jeuAuPied', 'vision', 'mental',
];

export type AttributsDerives = Record<AttributId, number>;

const cache = new Map<string, AttributsDerives>();

/**
 * LES HUIT ATTRIBUTS D'UN JOUEUR D'EFFECTIF.
 *
 * ⚠️ LE BRUIT PERSONNEL EST INDISPENSABLE. Sans lui, deux piliers de la même
 * note auraient exactement la même carte, et la lecture d'un effectif se
 * réduirait à trier par note — ce que l'écran fait déjà. C'est le bruit qui crée
 * le pilier lourd et lent face au pilier mobile, donc le choix de composition.
 *
 * ⚠️ ET IL EST BORNÉ À ±9. Au-delà, un joueur noté 70 pouvait afficher 92 en
 * vitesse : la note générale ne voudrait plus rien dire, et on ne pourrait plus
 * comparer deux cartes.
 */
export function attributsDe(j: Pick<Coequipier, 'id' | 'note' | 'poste'>): AttributsDerives {
  const cle = `${j.id}:${j.poste}:${j.note}`;
  const memo = cache.get(cle);
  if (memo) return memo;
  const profil = PROFIL[familleDePoste(j.poste)];
  const rng = graine(`attributs#${j.id}`);
  const out = {} as AttributsDerives;
  for (const a of ATTRIBUTS) {
    const perso = (rng() * 2 - 1) * 9;
    out[a] = Math.max(5, Math.min(99, Math.round(j.note + (profil[a] ?? 0) + perso)));
  }
  if (cache.size > 20000) cache.clear();
  cache.set(cle, out);
  return out;
}

/**
 * LES AXES COMPOSITES, ceux qui n'existent pas dans `Attributs`.
 *
 * ⚠️ ILS SE DÉDUISENT, ILS NE SE TIRENT PAS. La mêlée d'un joueur est faite de
 * sa force et de sa technique : la tirer séparément produirait un pilier
 * faible et bon en mêlée, ce qui n'a pas de sens et se verrait immédiatement.
 */
export function valeurAxe(j: Pick<Coequipier, 'id' | 'note' | 'poste'>, axe: AxeCarte): number {
  const a = attributsDe(j);
  switch (axe) {
    case 'melee': return Math.round(a.force * 0.62 + a.mental * 0.18 + a.endurance * 0.20);
    case 'touche': return Math.round(a.passe * 0.34 + a.force * 0.30 + a.vision * 0.36);
    case 'ruck': return Math.round(a.force * 0.44 + a.plaquage * 0.34 + a.endurance * 0.22);
    case 'technique': return Math.round(a.passe * 0.46 + a.vision * 0.30 + a.mental * 0.24);
    case 'physique': return Math.round(a.force * 0.55 + a.endurance * 0.45);
    case 'defense': return Math.round(a.plaquage * 0.72 + a.mental * 0.28);
    default: return a[axe];
  }
}

/** Les six valeurs à imprimer sur la carte, dans l'ordre. */
export function statsDeCarte(j: Pick<Coequipier, 'id' | 'note' | 'poste'>): {
  axe: AxeCarte; abrege: string; valeur: number;
}[] {
  return axesDe(j.poste).map((axe) => ({
    axe, abrege: ABREVIATION[axe], valeur: valeurAxe(j, axe),
  }));
}

// ---------------------------------------------------------------------------
// LE STATUT — la couleur de la carte
// ---------------------------------------------------------------------------
// « Je ne copierais pas les cartes or/argent/bronze de FIFA. Pour ton jeu de
// carrière, je les utiliserais plutôt pour indiquer le STATUT. »
//
// ⚠️ ET LA COULEUR NE CHANGE AUCUNE STATISTIQUE. « Mais les couleurs ne
// changeraient pas artificiellement les stats comme FUT : elles servent à lire
// l'effectif. » C'est une aide de lecture, pas une monnaie.

export type StatutCarte = 'espoir' | 'pro' | 'international' | 'star' | 'majeur';

export const ORDRE_STATUT: StatutCarte[] = ['espoir', 'pro', 'international', 'star', 'majeur'];

/**
 * ⚠️ « ESPOIR » N'EST PAS UN NIVEAU, C'EST UN ÂGE ET UNE MARGE. Un joueur de
 * 19 ans noté 78 avec dix points de marge est un espoir ; un joueur de 30 ans
 * noté 78 est un professionnel. Classer sur la seule note aurait fait
 * disparaître la catégorie la plus intéressante à lire dans un effectif.
 */
export function statutDe(j: Pick<Coequipier, 'note' | 'potentiel' | 'age'>): StatutCarte {
  if (j.age <= 23 && j.potentiel - j.note >= 5) return 'espoir';
  if (j.note >= 88) return 'majeur';
  if (j.note >= 82) return 'star';
  if (j.note >= 75) return 'international';
  return 'pro';
}

// ---------------------------------------------------------------------------
// L'ADÉQUATION AU POSTE
// ---------------------------------------------------------------------------
// « Pas de malus FIFA artificiel du genre −5 général, mais plutôt un
// indicateur : 🟢 Poste naturel · 🟡 Poste secondaire · 🔴 Hors poste. Et ses
// performances en match sont affectées. »

export type Adequation = 'naturel' | 'secondaire' | 'horsPoste';

/**
 * L'adéquation au poste repose STRICTEMENT sur les postes déclarés sur la fiche du joueur :
 * - Poste naturel : le poste principal exact du joueur (100 % de performance, pastille verte 🟢).
 * - Poste secondaire : un des postes secondaires exacts inscrits sur sa fiche (100 % de performance, pastille dorée 🟡).
 * - Hors poste : tout autre poste non inscrit sur sa fiche (82 % de performance, pastille rouge 🔴).
 * Aucune assimilation par famille de poste ni voisins génériques.
 */
export function adequationAuPoste(
  joueur: PosteId, slot: PosteId, postesSecondaires: readonly PosteId[] = [],
): Adequation {
  if (joueur === slot) return 'naturel';
  if (postesSecondaires.includes(slot)) return 'secondaire';
  return 'horsPoste';
}

/**
 * CE QUE ÇA COÛTE SUR LE TERRAIN.
 *
 * ⚠️ ON N'ABÎME PAS LA NOTE AFFICHÉE, ON PÈSE SUR LA PERFORMANCE. C'est
 * littéralement la demande : « pas de malus FIFA artificiel du genre −5 général,
 * mais […] ses performances en match sont affectées ». Un joueur reste ce qu'il
 * est ; c'est le manager qui l'a mal placé, et ça se voit dimanche.
 * Les postes naturels et secondaires conservent 100 % de leur rendement (aucun malus).
 */
export function facteurDePerformance(a: Adequation): number {
  return a === 'naturel' || a === 'secondaire' ? 1 : 0.82;
}

// ---------------------------------------------------------------------------
// LES BADGES TEMPORAIRES
// ---------------------------------------------------------------------------

export type BadgeCarte = 'enForme' | 'blesse' | 'suspendu' | 'espoir' | 'international' | 'fatigue';

/**
 * ⚠️ NIVEAU, CONDITION ET FORME SONT TROIS CHOSES DIFFÉRENTES — c'est la demande,
 * et c'est aussi ce que `lib/entrainementPro.ts` modélise. Le NIVEAU est ce que
 * le joueur sait faire, la CONDITION son état physique, la FORME le moment
 * qu'il traverse. Les confondre, c'est perdre la question « dois-je titulariser
 * le joueur de 76 qui est en feu plutôt que celui de 84 qui ne l'est pas ? ».
 *
 * ⚠️ TOUS LES CHAMPS SONT FACULTATIFS, et l'écran cache ce qu'il n'a pas. Le
 * mode manager ne tient pas encore la condition de ses joueurs : afficher un
 * chiffre au jugé donnerait une valeur crédible et fausse.
 */
export interface EtatDuJoueur {
  condition?: number;
  forme?: number;
  fatigue?: number;
  blesse?: boolean;
  suspendu?: boolean;
  enSelection?: boolean;
}

/**
 * ⚠️ LES BADGES SONT ORDONNÉS DU PLUS BLOQUANT AU PLUS ANECDOTIQUE, et l'écran
 * n'en montre que les deux premiers. Une carte de quatre-vingts pixels qui
 * affiche cinq pastilles ne se lit plus : ce qui compte, c'est de voir en un
 * coup d'œil qui ne peut pas jouer.
 */
export function badgesDe(
  j: Pick<Coequipier, 'note' | 'potentiel' | 'age'>,
  etat: EtatDuJoueur,
): BadgeCarte[] {
  const b: BadgeCarte[] = [];
  if (etat.blesse) b.push('blesse');
  if (etat.suspendu) b.push('suspendu');
  if (etat.enSelection) b.push('international');
  if ((etat.fatigue ?? 0) >= 70) b.push('fatigue');
  if ((etat.forme ?? 0) >= 82) b.push('enForme');
  if (statutDe(j) === 'espoir') b.push('espoir');
  return b;
}

/**
 * ⚠️ CETTE TABLE N'EST PLUS LUE, ET ELLE EST CONSERVÉE EXPRÈS COMME DOCUMENT.
 * L'écran de composition rendait ces six emoji ; il rend maintenant six tracés
 * (`ICONE_BADGE`, dans `components/CompositionTerrainManager.tsx`), pour la
 * raison écrite en tête de `components/Icone.tsx` : un emoji est dessiné par
 * Apple, Google ou Microsoft, il est en couleur — jamais la nôtre — et sa ligne
 * de base varie d'une machine à l'autre.
 *
 * Elle reste ici parce qu'elle DIT ce que chaque badge veut signifier, en une
 * ligne, et qu'un tracé abstrait ne le dit pas. Quiconque ajoute un badge peut
 * s'y référer pour choisir l'icône juste.
 */
export const EMOJI_BADGE: Record<BadgeCarte, string> = {
  enForme: '🔥', blesse: '🚑', suspendu: '🔴', espoir: '🌱',
  international: '🏳️', fatigue: '🥵',
};

/** Un joueur est-il alignable ce week-end ? */
export function disponible(etat: EtatDuJoueur): boolean {
  return !etat.blesse && !etat.suspendu && !etat.enSelection;
}

// ---------------------------------------------------------------------------
// LES TROIS NOTES DE SECTEUR DE L'ÉQUIPE
// ---------------------------------------------------------------------------
// « NOTE ÉQUIPE 86 · ATTAQUE 89 · DÉFENSE 84 · CONQUÊTE 87 »

export interface NotesEquipe {
  generale: number;
  attaque: number;
  defense: number;
  conquete: number;
}

/**
 * ⚠️ CHAQUE SECTEUR SE LIT SUR LES JOUEURS QUI LE JOUENT, pas sur tout le XV.
 * La conquête, ce sont les huit devants ; l'attaque, ce sont les lignes
 * arrière et le 9. Une moyenne du quinze aurait rendu les trois notes presque
 * identiques, et l'en-tête n'aurait rien appris au manager.
 */
export function notesDeLEquipe(xv: (Coequipier | undefined)[]): NotesEquipe {
  const presents = xv.filter((j): j is Coequipier => !!j);
  if (!presents.length) return { generale: 0, attaque: 0, defense: 0, conquete: 0 };
  const moy = (l: number[]) => (l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : 0);
  const avants = presents.filter((j) => ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne']
    .includes(familleDePoste(j.poste)));
  const arrieres = presents.filter((j) => !avants.includes(j));
  return {
    generale: moy(presents.map((j) => j.note)),
    attaque: moy(arrieres.map((j) => valeurAxe(j, 'technique') * 0.5 + valeurAxe(j, 'vitesse') * 0.5)),
    defense: moy(presents.map((j) => valeurAxe(j, 'defense'))),
    conquete: moy(avants.map((j) => (valeurAxe(j, 'melee') + valeurAxe(j, 'touche')) / 2)),
  };
}

// ---------------------------------------------------------------------------
// LES ALERTES DE COMPOSITION
// ---------------------------------------------------------------------------
// « ⚠️ Première ligne remplaçante insuffisante · ⚠️ 2 joueurs très fatigués ·
// 🟢 Composition conforme · 🟢 Quota JIFF respecté »

export type Alerte =
  | { gravite: 'bloquant' | 'attention' | 'ok'; cle: string; valeur?: string };

/**
 * ⚠️ LA PREMIÈRE LIGNE REMPLAÇANTE EST UNE VRAIE RÈGLE DE RUGBY, pas une
 * coquetterie : sans première ligne de remplacement qualifiée, l'arbitre impose
 * des mêlées simulées. C'est la première alerte qu'un entraîneur regarde, et
 * c'est pour ça qu'elle est bloquante là où les autres sont des avertissements.
 */
export function alertesDeComposition(
  titulaires: (Coequipier | undefined)[],
  remplacants: (Coequipier | undefined)[],
  etats: Map<string, EtatDuJoueur>,
  slotsTitulaires: PosteId[],
): Alerte[] {
  const alertes: Alerte[] = [];
  const estPremiereLigne = (j?: Coequipier) => !!j
    && [j.poste, ...(j.postesSecondaires ?? [])]
      .some((poste) => ['pilier', 'talonneur'].includes(familleDePoste(poste)));

  const pl = remplacants.filter(estPremiereLigne).length;
  if (pl < 2) {
    alertes.push({ gravite: 'bloquant', cle: 'compo.alerte.premiereLigne', valeur: `${pl}/2` });
  }

  const trous = titulaires.filter((j) => !j).length;
  if (trous > 0) alertes.push({ gravite: 'bloquant', cle: 'compo.alerte.trous', valeur: String(trous) });

  const indisponibles = [...titulaires, ...remplacants]
    .filter((j): j is Coequipier => !!j)
    .filter((j) => !disponible(etats.get(j.id) ?? {}));
  if (indisponibles.length) {
    alertes.push({ gravite: 'bloquant', cle: 'compo.alerte.indisponible', valeur: String(indisponibles.length) });
  }

  const cuits = [...titulaires].filter((j): j is Coequipier => !!j)
    .filter((j) => (etats.get(j.id)?.fatigue ?? 0) >= 70);
  if (cuits.length) {
    alertes.push({ gravite: 'attention', cle: 'compo.alerte.fatigue', valeur: String(cuits.length) });
  }

  const malPlaces = titulaires
    .map((j, i) => (j ? adequationAuPoste(j.poste, slotsTitulaires[i], j.postesSecondaires) : 'naturel'))
    .filter((a) => a === 'horsPoste').length;
  if (malPlaces) {
    alertes.push({ gravite: 'attention', cle: 'compo.alerte.horsPoste', valeur: String(malPlaces) });
  }

  if (!alertes.some((a) => a.gravite === 'bloquant')) {
    alertes.push({ gravite: 'ok', cle: 'compo.alerte.conforme' });
  }
  return alertes;
}

/** Purge les mémoires — pour les bancs d'essai. */
export function oublierAttributs(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// LA RARETÉ D'UNE CARTE — bronze, argent, or, épique, mythique, légende
// ---------------------------------------------------------------------------
// Demande : « faire comme sur FIFA des raretés de carte en mode bronze argent
// or mythique rouge épique etc. en fonction du potentiel, de la qualité du
// joueur etc. »
//
// ⚠️ LA RARETÉ N'EST PAS LE STATUT, ET LES DEUX COEXISTENT. `statutDe` répond à
// « quel rôle tient-il dans un effectif » (espoir, cadre, star) : c'est une aide
// de lecture pour composer. La rareté répond à « que vaut cette carte », et
// c'est ce qu'on collectionne. Les confondre ferait d'un espoir de 19 ans une
// carte bronze alors que c'est précisément la carte qu'on veut garder.
//
// ⚠️ ET ELLE NE CHANGE TOUJOURS AUCUNE STATISTIQUE. La règle posée plus haut
// pour le statut vaut telle quelle : « les couleurs ne changeraient pas
// artificiellement les stats comme FUT ». Une carte légende n'est pas meilleure
// qu'une carte or de même note — elle est plus rare.

export type RareteCarte =
  | 'bronze' | 'argent' | 'or' | 'epique' | 'mythique' | 'legende';

export const ORDRE_RARETE: RareteCarte[] = [
  'bronze', 'argent', 'or', 'epique', 'mythique', 'legende',
];

/**
 * CE QUE VAUT UNE CARTE : la note d'aujourd'hui, plus ce qu'il reste à venir.
 *
 * ⚠️ LE POTENTIEL PÈSE MOINS À MESURE QU'ON VIEILLIT, et ce n'est pas un
 * détail d'équilibrage : une marge de quinze points à 19 ans est une promesse,
 * la même marge à 30 ans est une statistique morte — il ne reste plus assez de
 * saisons pour la combler (`noteALAge` fait progresser jusqu'à 27 ans puis
 * décliner). Sans cette pondération, un joueur de 33 ans noté 74 pour un
 * potentiel de 88 sortirait en carte épique alors qu'il ne progressera plus
 * jamais.
 *
 * ⚠️ ET LA PART DE POTENTIEL EST BORNÉE À 12 POINTS. Au-delà, un espoir de
 * 17 ans noté 55 pour un potentiel de 95 passerait devant un international
 * confirmé : on collectionnerait des promesses, plus des joueurs.
 */
export function valeurDeCarte(j: Pick<Coequipier, 'note' | 'potentiel' | 'age'>): number {
  const poids = j.age <= 20 ? 0.55
    : j.age <= 23 ? 0.44
      : j.age <= 26 ? 0.28
        : j.age <= 29 ? 0.12
          : 0;
  const marge = Math.max(0, (j.potentiel ?? j.note) - j.note);
  return j.note + Math.min(12, marge * poids);
}

/**
 * LES SIX PALIERS.
 *
 * ⚠️ ILS SONT CALÉS SUR LA PYRAMIDE DU JEU, pas sur une échelle abstraite.
 * Chaque rareté correspond à un étage réel : une montée se lit alors dans la
 * COULEUR des cartes de son effectif, et c'est ce qui fait de la promotion une
 * récompense visible autant que sportive.
 *
 *   bronze   < 48   Régionale, Fédérale 3
 *   argent   < 59   Fédérale 2 et 1, bas de Nationale
 *   or       < 70   Nationale, Nationale 2, bas de Pro D2
 *   épique   < 81   Pro D2, rotation de Top 14
 *   mythique < 90   titulaire de Top 14
 *   légende  ≥ 90   international confirmé
 *
 * ⚠️ ILS ONT ÉTÉ MESURÉS SUR LES VRAIS EFFECTIFS, pas posés au jugé — c'est le
 * seul moyen de savoir si l'échelle sépare vraiment quelque chose. Le premier
 * réglage (52/62/72/80/88) donnait **100 % de cartes bronze en Régionale 1 ET
 * en Régionale 3** : deux divisions entières indistinguables, donc aucun
 * progrès lisible pendant les premières saisons — exactement là où l'on
 * commence en mode entraîneur. Il rendait aussi 38 % de cartes mythiques en
 * Top 14, ce qui fait beaucoup pour un métal censé se remarquer.
 *
 * Mesuré avec ce réglage (`scripts/verifRaretes.ts`, six clubs par étage) :
 *
 *   Top 14       argent 4 % · or 31 % · épique 23 % · mythique 37 % · légende 5 %
 *   Pro D2       bronze 4 % · argent 45 % · or 28 % · épique 23 %
 *   Nationale    bronze 43 % · argent 40 % · or 16 %
 *   Fédérale 1   bronze 9 % · argent 66 % · or 25 %
 *   Fédérale 3   bronze 73 % · argent 27 %
 *   Régionale 1  bronze 89 % · argent 11 %
 *   Régionale 3  bronze 100 %
 *
 * ⚠️ ET LA RÉGIONALE 3 RESTE ENTIÈREMENT BRONZE, volontairement. C'est le fond
 * de la pyramide : y voir des cartes dorées viderait de son sens tout ce qu'on
 * gagne en montant. La lecture doit être « je pars de rien », pas « tout le
 * monde brille ».
 */
const SEUILS_RARETE: [RareteCarte, number][] = [
  ['bronze', 48], ['argent', 59], ['or', 70],
  ['epique', 81], ['mythique', 90],
];

export function rareteDe(j: Pick<Coequipier, 'note' | 'potentiel' | 'age'>): RareteCarte {
  const v = valeurDeCarte(j);
  for (const [rarete, plafond] of SEUILS_RARETE) if (v < plafond) return rarete;
  return 'legende';
}

/**
 * ⚠️ UNE PÉPITE SE SIGNALE EN PLUS DE SA RARETÉ, elle ne la remplace pas. Un
 * espoir de 18 ans noté 48 pour un potentiel de 84 reste une carte bronze —
 * c'est ce qu'il vaut aujourd'hui — mais elle porte un liseré vert. Le
 * remonter d'un cran ferait mentir la couleur sur ce qu'on aligne dimanche.
 */
export function estPepite(j: Pick<Coequipier, 'note' | 'potentiel' | 'age'>): boolean {
  return j.age <= 23 && (j.potentiel ?? j.note) - j.note >= 12;
}

/**
 * LE NOM D'UNE RARETÉ.
 *
 * ⚠️ IL VIT ICI, PAS DANS UN COMPOSANT. Trois écrans l'affichent — la carte de
 * composition, la fiche d'un joueur, la carte du marché — et une table recopiée
 * finit toujours par diverger d'une copie à l'autre. C'est aussi la règle du
 * projet pour les composants React : un fichier qui exporte à la fois un
 * composant et une constante casse le rafraîchissement à chaud de Vite.
 *
 * ⚠️ ET CE N'EST VOLONTAIREMENT PAS TRADUIT. « Bronze », « Or », « Épique » et
 * « Légende » sont les mêmes mots dans les sept langues du jeu ou presque, et
 * les traduire au mot près donnerait des libellés plus longs que la pastille
 * qui les porte. Le jour où l'un d'eux gêne, il prendra une clé — pas les six.
 */
export const NOM_RARETE: Record<RareteCarte, string> = {
  bronze: 'Bronze', argent: 'Argent', or: 'Or',
  epique: 'Épique', mythique: 'Mythique', legende: 'Légende',
};
