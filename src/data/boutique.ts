// ═══════════════════════════════════════════════════════════════════════════
// L'ÉCHELLE DES PRIX — trois marches, et elles veulent dire quelque chose
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ Demande explicite : « rééquilibre toute la boutique sur les prix, il faut
// que ce soit dur d'obtenir des cosmétiques ». Le repère qui rend ces nombres
// lisibles : une **belle carrière de 12 à 15 saisons rapporte ≈ 500 Ovas**
// (succès réétalonnés, défis plafonnés — voir `data/succes.ts` et
// `PLAFOND_OVAS_DEFIS_PAR_SAISON` dans le store). Donc :
//
//   • ENTRÉE   60 –  90 : une carrière en paie cinq. C'est ce qu'on s'offre en
//                         premier, sans réfléchir.
//   • PALIER   120 – 220 : deux ou trois par carrière. On choisit.
//   • PRESTIGE 340 – 450 : les pièces dorées. **Une seule par carrière**, et il
//                         faut la mériter jusqu'au bout.
//
// Tout acheter demande environ **9 carrières** (~5 000 Ovas depuis le second
// lot de cosmétiques). C'est voulu : le vestiaire est un objectif de long
// terme, pas une case à cocher — et quatre pièces échappent complètement aux
// Ovas, puisqu'elles s'obtiennent en regardant une pub (`parPub`).
//
// ⚠️ Le chiffre exact est MESURÉ, pas estimé :
//   npx vite-node scripts/verifEconomie.ts
export interface SkinBallon {
  id: string;
  nom: string;
  corps: string;
  bande: string;
  lisere: string;
  couture: string;
  lacet: string;
  metal?: number;
  france?: boolean; // dessine le motif Équipe de France (coq + FRANCE RUGBY)
  glb?: string; // si défini, utilise ce modèle 3D au lieu du ballon codé
  prix: number; // en Ovas (0 = de base)
}

export const SKINS: SkinBallon[] = [
  {
    id: 'classique',
    nom: 'France Rugby',
    corps: '#f4f4ef',
    bande: '#15317e',
    lisere: '#e2231a',
    couture: '#1a1a1a',
    lacet: '#f7f7f2',
    france: true,
    glb: '/ballon.glb',
    prix: 0,
  },
  {
    // ⚠️ L'ID RESTE `tricolore`, LE BALLON A CHANGÉ. Le modèle livré s'appelle
    // « ballon ubb à la place du ballon tricolore » : c'est une SUBSTITUTION
    // demandée, pas un ajout. Garder l'identifiant évite de faire disparaître
    // l'article de l'inventaire des joueurs qui l'avaient déjà acheté — ils
    // ouvrent la boutique et trouvent le nouveau ballon à sa place.
    id: 'tricolore',
    nom: 'Union Bordeaux-Bègles',
    corps: '#eef1f6',
    bande: '#0d2a6b',
    lisere: '#e2231a',
    couture: '#2a2a2a',
    lacet: '#ffffff',
    glb: '/m3d/ballon-ubb.glb',
    prix: 80,
  },
  {
    id: 'cuir',
    nom: 'Cuir Vintage',
    corps: '#8a4b2a',
    bande: '#5f3018',
    lisere: '#b3653a',
    couture: '#3a1d0e',
    lacet: '#e8dcc5',
    glb: '/m3d/ballon-cuir.glb',
    prix: 140,
  },
  {
    id: 'ocean',
    nom: 'RC Vannes',
    corps: '#7a1020',
    bande: '#ffffff',
    lisere: '#7a1020',
    couture: '#3a4046',
    lacet: '#e6e9ec',
    metal: 0.2,
    glb: '/m3d/ballon-vannes.glb',
    prix: 220,
  },
  {
    id: 'or',
    nom: 'Légende d’Or',
    corps: '#f4cd63',
    bande: '#8a5a12',
    lisere: '#6d3a1f',
    couture: '#a97b1c',
    lacet: '#fff4d6',
    metal: 0.5,
    glb: '/m3d/ballon-or.glb',
    prix: 450,
  },
];

export const SKIN_PAR_ID: Record<string, SkinBallon> = Object.fromEntries(
  SKINS.map((s) => [s.id, s]),
);

// ===========================================================================
// LE VESTIAIRE — l'équipement du joueur
// ===========================================================================
// Demande explicite : « rajoute des items dans la boutique que je modéliserai
// en 3D ».
//
// ⚠️ COSMÉTIQUE, ET RIEN D'AUTRE. Aucun article ne touche à un attribut, à la
// forme, au moral ni au potentiel — c'est la règle qui a fait supprimer les
// boosts (voir plus bas), et elle vaut aussi pour l'équipement. On ne monte pas
// sa générale à la caisse : `scripts/verifDifficulte.ts` reste valable sans
// avoir à être relancé.
//
// ⚠️ CHAQUE ARTICLE DÉCLARE DÉJÀ SON `.glb`, MÊME S'IL N'EXISTE PAS ENCORE.
// C'est fait exprès : `<ModeleObjet>` vérifie la présence du fichier et retombe
// sur la pastille emoji tant qu'il manque. Déposer le modèle compressé dans
// `public/m3d/` suffit donc à le faire apparaître en 3D — zéro ligne de code à
// écrire. Les deux modèles déjà livrés (`crampons.glb`, `maillot.glb`) étaient
// dans le dossier depuis des mois sans être branchés nulle part : ils le sont.

// ⚠️ UNE CATÉGORIE = UNE PIÈCE PORTÉE À LA FOIS (`equipementActif` du store).
// Le casque a donc la SIENNE : rangé avec les accessoires, on ne pourrait pas
// le porter en même temps qu'autre chose.
//
// ⚠️ PLUS DE CATÉGORIE « CHAUSSETTES » (demande explicite : « supprime le
// protège-dents, mitaines, tee et chaussettes de la boutique »). Les trois
// paires vendues n'étaient d'ailleurs accrochées nulle part sur le rugbyman 3D.
export type CategorieEquipement =
  | 'crampons' | 'maillot' | 'casque' | 'accessoire';

export interface ArticleEquipement {
  id: string;
  nom: string;
  categorie: CategorieEquipement;
  /** Pastille de repli tant que le modèle 3D n'est pas déposé. */
  emoji: string;
  /** Modèle 3D — `public/m3d/<fichier>.glb`, compressé Draco. */
  glb: string;
  /**
   * Teinte appliquée au modèle. C'est ce qui permet à trois coloris de
   * crampons de partager UN seul fichier : sans elle, il faudrait modéliser
   * (et embarquer) trois fois le même objet.
   */
  teinte?: string;
  prix: number; // en Ovas
  /**
   * L'ARTICLE NE S'ACHÈTE PAS : IL SE REGARDE.
   *
   * ⚠️ Demande explicite : « fais en sorte que 3-4 cosmétiques on puisse les
   * obtenir en regardant une pub ». Un article marqué ainsi a `prix: 0` et
   * n'apparaît JAMAIS contre des Ovas — il se débloque en regardant une pub
   * récompensée, laquelle consomme un des passages quotidiens
   * (`PUBS_PAR_JOUR`, `lib/pub.ts`). C'est donc une porte de plus, pas un
   * raccourci : on ne peut pas en enchaîner dix dans la soirée.
   *
   * ⚠️ ET ÇA NE TOUCHE PAS À LA DIFFICULTÉ : ce sont des cosmétiques, comme
   * tout le reste de cette boutique. Règle 5 de `lib/pub.ts` — rien ne se
   * débloque UNIQUEMENT par la pub qui ait le moindre effet sur le jeu.
   */
  parPub?: boolean;
  /** Une ligne pour dire ce que c'est — et, pour la 3D, ce qu'il faut modéliser. */
  detail: string;
}

export const EQUIPEMENTS: ArticleEquipement[] = [
  // --- Crampons (modèle livré : m3d/crampons.glb) -------------------------
  { id: 'crampons-cuir', nom: 'Crampons cuir', categorie: 'crampons', emoji: '👟', glb: '/m3d/crampons.glb', teinte: '#2f2318', prix: 60, detail: 'Le noir mat des vieux terrains gras.' },
  { id: 'crampons-flash', nom: 'Crampons flash', categorie: 'crampons', emoji: '⚡', glb: '/m3d/crampons.glb', teinte: '#2ad17c', prix: 130, detail: 'On te voit arriver de la tribune d’en face.' },
  { id: 'crampons-or', nom: 'Crampons dorés', categorie: 'crampons', emoji: '🥇', glb: '/m3d/crampons.glb', teinte: '#d8a94a', prix: 340, detail: 'À ne sortir qu’un soir de finale.' },
  // ⚠️ CEUX-CI NE SE TEINTENT PAS : chacun a son propre `.glb` peint (second lot
  // de modèles, `scripts/copierTrophees.cjs`). Une `teinte` repeindrait le motif.
  { id: 'crampons-dupont', nom: 'Crampons signature', categorie: 'crampons', emoji: '✒️', glb: '/m3d/crampons-dupont.glb', prix: 300, detail: 'La paire d’un demi de mêlée international, signée sur le talon.' },
  { id: 'crampons-graffiti', nom: 'Crampons graffiti', categorie: 'crampons', emoji: '🎨', glb: '/m3d/crampons-graffiti.glb', prix: 0, parPub: true, detail: 'Peints à la bombe, un soir de tournoi à sept.' },
  // --- Maillots (modèle livré : m3d/maillot.glb) --------------------------
  { id: 'maillot-bleu', nom: 'Maillot bleu nuit', categorie: 'maillot', emoji: '👕', glb: '/m3d/maillot.glb', teinte: '#15317e', prix: 80, detail: 'La coupe classique, col lacé.' },
  { id: 'maillot-blanc', nom: 'Maillot extérieur', categorie: 'maillot', emoji: '🤍', glb: '/m3d/maillot.glb', teinte: '#eef1f6', prix: 130, detail: 'Blanc cassé, liseré discret.' },
  { id: 'maillot-legende', nom: 'Maillot des légendes', categorie: 'maillot', emoji: '🐐', glb: '/m3d/maillot.glb', teinte: '#f4cd63', prix: 420, detail: 'Le numéro brodé fil d’or.' },
  // --- Maillots de club et de sélection (second lot, un .glb par maillot) ---
  { id: 'maillot-toulousain', nom: 'Stade Toulousain', categorie: 'maillot', emoji: '🔴', glb: '/m3d/maillot-toulousain.glb', prix: 260, detail: 'Rouge et noir, le maillot le plus titré de France.' },
  { id: 'maillot-stade-francais', nom: 'Stade Français', categorie: 'maillot', emoji: '💗', glb: '/m3d/maillot-stade-francais.glb', prix: 240, detail: 'Le rose de Paris, celui qu’on reconnaît de la dernière tribune.' },
  { id: 'maillot-lyon', nom: 'LOU Rugby', categorie: 'maillot', emoji: '🔵', glb: '/m3d/maillot-lyon.glb', prix: 200, detail: 'Rouge et bleu, sur les bords du Rhône.' },
  { id: 'maillot-bayonnais', nom: 'Aviron Bayonnais', categorie: 'maillot', emoji: '⚓', glb: '/m3d/maillot-bayonnais.glb', prix: 200, detail: 'Ciel et blanc, et Jean Dauger derrière.' },
  { id: 'maillot-vannes', nom: 'RC Vannes', categorie: 'maillot', emoji: '🦅', glb: '/m3d/maillot-vannes.glb', prix: 0, parPub: true, detail: 'Grenat et blanc, le promu qui a tout renversé.' },
  { id: 'maillot-angleterre', nom: 'Angleterre', categorie: 'maillot', emoji: '🌹', glb: '/m3d/maillot-angleterre.glb', prix: 220, detail: 'Blanc, rose brodée sur le cœur.' },
  { id: 'maillot-irlande', nom: 'Irlande', categorie: 'maillot', emoji: '🍀', glb: '/m3d/maillot-irlande.glb', prix: 220, detail: 'Le vert de Dublin, un soir de Tournoi.' },
  { id: 'maillot-italie', nom: 'Italie', categorie: 'maillot', emoji: '🇮🇹', glb: '/m3d/maillot-italie.glb', prix: 0, parPub: true, detail: 'L’azzurro, et l’envie d’y croire jusqu’au bout.' },
  // --- Casque (se porte sur la tête du rugbyman 3D) -----------------------
  { id: 'casque', nom: 'Casque de mêlée', categorie: 'casque', emoji: '🪖', glb: '/m3d/casque.glb', teinte: '#1f2b22', prix: 85, detail: 'Casque souple de première ligne, sangle sous le menton.' },
  { id: 'casque-blanc', nom: 'Casque blanc', categorie: 'casque', emoji: '⚪', glb: '/m3d/casque.glb', teinte: '#eef1f6', prix: 120, detail: 'Celui qu’on repère au fond du ruck.' },
  { id: 'casque-or', nom: 'Casque doré', categorie: 'casque', emoji: '👑', glb: '/m3d/casque.glb', teinte: '#d8a94a', prix: 360, detail: 'Discret comme un projecteur de stade.' },
  { id: 'casque-rouge', nom: 'Casque rouge', categorie: 'casque', emoji: '🟥', glb: '/m3d/casque-rouge.glb', prix: 130, detail: 'Le rouge franc des premières lignes qui ne reculent pas.' },
  { id: 'casque-australie', nom: 'Casque Wallabies', categorie: 'casque', emoji: '🇦🇺', glb: '/m3d/casque-australie.glb', prix: 210, detail: 'Or et vert, ramené d’une tournée dans l’hémisphère sud.' },
  { id: 'casque-tribal', nom: 'Casque tribal', categorie: 'casque', emoji: '🗿', glb: '/m3d/casque-tribal.glb', prix: 230, detail: 'Motifs gravés, comme un tatouage du Pacifique.' },
  { id: 'casque-rose', nom: 'Casque rose fluo', categorie: 'casque', emoji: '🩷', glb: '/m3d/casque-rose.glb', prix: 0, parPub: true, detail: 'On te repère depuis le parking. C’est le but.' },
  // --- Accessoires ---------------------------------------------------------
  // ⚠️ RETIRÉS À LA DEMANDE : protège-dents, mitaines, tee de buteur et les
  // trois paires de chaussettes. Leurs `.glb` restent dans `public/m3d/` — il
  // suffirait de remettre une ligne ici pour les revendre.
  { id: 'sac', nom: 'Sac de match brodé', categorie: 'accessoire', emoji: '🎒', glb: '/m3d/sac.glb', teinte: '#2a3a30', prix: 90, detail: 'Ton nom cousu sur le rabat.' },
  { id: 'bouclier', nom: 'Bouclier de plaquage', categorie: 'accessoire', emoji: '🛡️', glb: '/m3d/bouclier-plaquage.glb', teinte: '#1d5c9c', prix: 70, detail: 'Le pare-chocs mousse des séances du mardi.' },
];

/**
 * Les articles retirés de la vente. Ils servent encore à NETTOYER les
 * sauvegardes : un joueur qui portait des chaussettes dorées ne doit pas garder
 * un emplacement occupé par un article qui n'existe plus (`useGame`, version 10).
 */
export const EQUIPEMENTS_RETIRES = [
  'chaussettes', 'chaussettes-noires', 'chaussettes-or',
  'protege-dents', 'mitaines', 'tee',
];

export const EQUIPEMENT_PAR_ID: Record<string, ArticleEquipement> = Object.fromEntries(
  EQUIPEMENTS.map((e) => [e.id, e]),
);

export const CATEGORIES_EQUIPEMENT: { id: CategorieEquipement; cle: string; emoji: string }[] = [
  { id: 'maillot', cle: 'bo.catMaillot', emoji: '👕' },
  { id: 'crampons', cle: 'bo.catCrampons', emoji: '👟' },
  { id: 'casque', cle: 'bo.catCasque', emoji: '🪖' },
  { id: 'accessoire', cle: 'bo.catAccessoire', emoji: '🎒' },
];

// ⚠️ LES BOOSTS ONT ÉTÉ SUPPRIMÉS (demande explicite).
// Ils vendaient « +2 à tous les attributs » et « forme et moral au maximum »
// pour 60 à 80 Ovas. C'était en contradiction directe avec l'étalonnage de
// difficulté (`lib/progression.ts`, `scripts/verifDifficulte.ts`) : une carrière
// se construit sur le terrain, pas au comptoir. La boutique ne vend plus que
// des ballons — du cosmétique, et rien qui touche à la progression.
// Ne pas les réintroduire sans relancer `npx vite-node scripts/verifDifficulte.ts`.

// Packs d'Ovas (achat en argent réel — NON branché, purement indicatif).
export interface PackOvas {
  id: string;
  ovas: number;
  prix: string;
  bonus?: string;
}

export const PACKS: PackOvas[] = [
  { id: 'p1', ovas: 100, prix: '0,99 €' },
  { id: 'p2', ovas: 550, prix: '4,99 €', bonus: '+10 %' },
  { id: 'p3', ovas: 1200, prix: '9,99 €', bonus: '+20 %' },
];
