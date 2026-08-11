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
    id: 'tricolore',
    nom: 'Tricolore Away',
    corps: '#eef1f6',
    bande: '#0d2a6b',
    lisere: '#e2231a',
    couture: '#2a2a2a',
    lacet: '#ffffff',
    france: true,
    prix: 90,
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
    prix: 120,
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
    prix: 180,
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
    prix: 350,
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
// Le casque et les chaussettes ont donc la LEUR : rangés avec les accessoires,
// on ne pourrait pas porter les deux, alors que la demande est justement de
// « customiser casque, ballon, chaussettes, maillot, chaussures ».
export type CategorieEquipement =
  | 'crampons' | 'maillot' | 'casque' | 'chaussettes' | 'accessoire';

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
  /** Une ligne pour dire ce que c'est — et, pour la 3D, ce qu'il faut modéliser. */
  detail: string;
}

export const EQUIPEMENTS: ArticleEquipement[] = [
  // --- Crampons (modèle livré : m3d/crampons.glb) -------------------------
  { id: 'crampons-cuir', nom: 'Crampons cuir', categorie: 'crampons', emoji: '👟', glb: '/m3d/crampons.glb', teinte: '#2f2318', prix: 60, detail: 'Le noir mat des vieux terrains gras.' },
  { id: 'crampons-flash', nom: 'Crampons flash', categorie: 'crampons', emoji: '⚡', glb: '/m3d/crampons.glb', teinte: '#2ad17c', prix: 120, detail: 'On te voit arriver de la tribune d’en face.' },
  { id: 'crampons-or', nom: 'Crampons dorés', categorie: 'crampons', emoji: '🥇', glb: '/m3d/crampons.glb', teinte: '#d8a94a', prix: 260, detail: 'À ne sortir qu’un soir de finale.' },
  // --- Maillots (modèle livré : m3d/maillot.glb) --------------------------
  { id: 'maillot-bleu', nom: 'Maillot bleu nuit', categorie: 'maillot', emoji: '👕', glb: '/m3d/maillot.glb', teinte: '#15317e', prix: 90, detail: 'La coupe classique, col lacé.' },
  { id: 'maillot-blanc', nom: 'Maillot extérieur', categorie: 'maillot', emoji: '🤍', glb: '/m3d/maillot.glb', teinte: '#eef1f6', prix: 110, detail: 'Blanc cassé, liseré discret.' },
  { id: 'maillot-legende', nom: 'Maillot des légendes', categorie: 'maillot', emoji: '🐐', glb: '/m3d/maillot.glb', teinte: '#f4cd63', prix: 320, detail: 'Le numéro brodé fil d’or.' },
  // --- Accessoires : LES MODÈLES RESTENT À FAIRE -------------------------
  // Le nom du fichier attendu est déjà écrit : dépose-le et il s'affiche.
  // --- Casque (se porte sur la tête du rugbyman 3D) -----------------------
  { id: 'casque', nom: 'Casque de mêlée', categorie: 'casque', emoji: '🪖', glb: '/m3d/casque.glb', teinte: '#1f2b22', prix: 90, detail: 'Casque souple de première ligne, sangle sous le menton.' },
  { id: 'casque-blanc', nom: 'Casque blanc', categorie: 'casque', emoji: '⚪', glb: '/m3d/casque.glb', teinte: '#eef1f6', prix: 110, detail: 'Celui qu’on repère au fond du ruck.' },
  { id: 'casque-or', nom: 'Casque doré', categorie: 'casque', emoji: '👑', glb: '/m3d/casque.glb', teinte: '#d8a94a', prix: 280, detail: 'Discret comme un projecteur de stade.' },
  // --- Chaussettes ---------------------------------------------------------
  { id: 'chaussettes', nom: 'Chaussettes du club', categorie: 'chaussettes', emoji: '🧦', glb: '/m3d/chaussettes.glb', teinte: '#7a1020', prix: 45, detail: 'Rayures du club, repliées sous le genou.' },
  { id: 'chaussettes-noires', nom: 'Chaussettes noires', categorie: 'chaussettes', emoji: '🖤', glb: '/m3d/chaussettes.glb', teinte: '#15181b', prix: 45, detail: 'Sobres, hautes, tenues par du strap.' },
  { id: 'chaussettes-or', nom: 'Chaussettes dorées', categorie: 'chaussettes', emoji: '✨', glb: '/m3d/chaussettes.glb', teinte: '#d8a94a', prix: 190, detail: 'Pour les soirs où l’on joue le titre.' },
  // --- Accessoires ---------------------------------------------------------
  { id: 'protege-dents', nom: 'Protège-dents tricolore', categorie: 'accessoire', emoji: '🦷', glb: '/m3d/protege-dents.glb', teinte: '#e2231a', prix: 40, detail: 'Thermoformé, bleu-blanc-rouge.' },
  { id: 'mitaines', nom: 'Mitaines d’ailier', categorie: 'accessoire', emoji: '🧤', glb: '/m3d/mitaines.glb', teinte: '#101418', prix: 70, detail: 'Doigts coupés, grip caoutchouté.' },
  { id: 'tee', nom: 'Tee de buteur', categorie: 'accessoire', emoji: '⛳', glb: '/m3d/tee.glb', teinte: '#f4cd63', prix: 55, detail: 'Le petit socle qu’on pose avant de viser les poteaux.' },
  { id: 'sac', nom: 'Sac de match brodé', categorie: 'accessoire', emoji: '🎒', glb: '/m3d/sac.glb', teinte: '#2a3a30', prix: 80, detail: 'Ton nom cousu sur le rabat.' },
  { id: 'bouclier', nom: 'Bouclier de plaquage', categorie: 'accessoire', emoji: '🛡️', glb: '/m3d/bouclier-plaquage.glb', teinte: '#1d5c9c', prix: 65, detail: 'Le pare-chocs mousse des séances du mardi.' },
];

export const EQUIPEMENT_PAR_ID: Record<string, ArticleEquipement> = Object.fromEntries(
  EQUIPEMENTS.map((e) => [e.id, e]),
);

export const CATEGORIES_EQUIPEMENT: { id: CategorieEquipement; cle: string; emoji: string }[] = [
  { id: 'maillot', cle: 'bo.catMaillot', emoji: '👕' },
  { id: 'crampons', cle: 'bo.catCrampons', emoji: '👟' },
  { id: 'chaussettes', cle: 'bo.catChaussettes', emoji: '🧦' },
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
