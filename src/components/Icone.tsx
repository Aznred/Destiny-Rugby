// LES ICÔNES — dessinées, pas empruntées à la police emoji.
//
// ⚠️ POURQUOI CE FICHIER EXISTE. Retour de jeu : « ça fait trop IA, rends-la
// plus propre, pro et jolie ». Les emoji en guise d'icônes sont le signal le
// plus fort de ce reproche, et pour trois raisons qui n'ont rien de subjectif :
//
// 1. **Ils ne sont pas à nous.** 👥 ✈️ 📊 sont dessinés par Apple, Google et
//    Microsoft, chacun à sa façon : l'interface change d'aspect selon la
//    machine, et sur aucune elle ne ressemble au reste du jeu.
// 2. **Ils sont en couleur, et pas dans la nôtre.** Un avion bleu ciel et un
//    graphique multicolore au milieu d'une palette or et vert nocturne, ça ne
//    se fond jamais — ça se pose dessus.
// 3. **Ils ne s'alignent pas.** Un emoji est une image dans une ligne de texte :
//    sa hauteur, sa ligne de base et ses marges varient d'un système à l'autre,
//    d'où les décalages d'un pixel qu'on passe son temps à rattraper.
//
// Les icônes ci-dessous sont des tracés à 24 unités, en `currentColor` — elles
// prennent donc la couleur du texte, se surlignent avec lui, et changent de
// taille sans jamais flouter. `stroke-width: 1.75` et les bouts arrondis leur
// donnent le trait du reste de l'interface.
//
// ⚠️ ON N'AJOUTE PAS UNE BIBLIOTHÈQUE POUR ÇA. Une dépendance d'icônes pèse
// entre 50 et 300 Ko pour qu'on en utilise huit, et c'est la porte ouverte à un
// style qui n'est pas celui du jeu. Huit tracés tiennent dans ce fichier.

export type NomIcone =
  | 'equipe' | 'marche' | 'resultats' | 'ovale' | 'retraite' | 'mentor'
  | 'reglages' | 'accueil' | 'ballon' | 'profil' | 'clubs' | 'plus'
  // ── Le bureau de l'entraîneur ────────────────────────────────────────────
  | 'stade' | 'sifflet' | 'monde' | 'formation' | 'loupe' | 'halteres'
  | 'institution' | 'maillot' | 'journal' | 'livre'
  // ── La feuille de match ──────────────────────────────────────────────────
  | 'brassard' | 'cible' | 'banc' | 'soin' | 'carton' | 'pousse' | 'drapeau'
  | 'batterie' | 'flamme' | 'coeur'
  // ── Les verdicts ─────────────────────────────────────────────────────────
  | 'ok' | 'alerte' | 'stop'
  // ── Le marché ────────────────────────────────────────────────────────────
  | 'oeil' | 'euro' | 'chrono' | 'signature' | 'poignee'
  // ── Les sauvegardes et la création ───────────────────────────────────────
  | 'disquette' | 'corbeille' | 'ajouter' | 'croix' | 'etoile' | 'trophee'
  | 'joueur' | 'entraineur' | 'fleche-droite'
  // ── Les menus, la boutique, le palmarès ──────────────────────────────────
  | 'boutique' | 'ova' | 'check' | 'verrou' | 'video' | 'medaille'
  | 'bouclier' | 'eclair' | 'calendrier' | 'image' | 'dossier' | 'cadeau'
  | 'contrat' | 'porte' | 'plein-ecran' | 'mallette' | 'repost'
  // ── Les listes déroulantes ───────────────────────────────────────────────
  | 'chevron';

interface Props {
  nom: NomIcone;
  /** Taille en pixels. Par défaut 20 : la taille d'un libellé de barre d'action. */
  taille?: number;
  className?: string;
}

// Chaque tracé est décrit sur une grille de 24, comme tout jeu d'icônes
// cohérent : c'est ce qui garantit que les épaisseurs de trait et les marges
// optiques se ressemblent d'une icône à l'autre.
const TRACES: Record<NomIcone, React.ReactNode> = {
  // Trois silhouettes : le groupe, l'effectif.
  equipe: (
    <>
      <circle cx="9" cy="8" r="3.1" />
      <path d="M3.5 19.5c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" />
      <path d="M16 5.6a3.1 3.1 0 0 1 0 5.9" />
      <path d="M17.6 14.9c1.9.6 3 2.2 3 4.6" />
    </>
  ),
  // Une valise de voyage : le marché des transferts, le départ.
  marche: (
    <>
      <rect x="3" y="7.5" width="18" height="12" rx="2.2" />
      <path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7" />
      <path d="M3 12.5h18" />
    </>
  ),
  // Un histogramme : le classement, les résultats.
  resultats: (
    <>
      <path d="M4 20V10.5" />
      <path d="M10 20V4.5" />
      <path d="M16 20v-7" />
      <path d="M2.5 20h19" />
    </>
  ),
  // Le réseau social : deux traits croisés, sans citer une marque.
  ovale: (
    <>
      <path d="M4.5 4.5l15 15" />
      <path d="M19.5 4.5l-15 15" />
    </>
  ),
  // Une colonne à fronton : le hall, la fin de carrière.
  retraite: (
    <>
      <path d="M3.5 9.5 12 4.5l8.5 5" />
      <path d="M5.5 9.5v9M10 9.5v9M14 9.5v9M18.5 9.5v9" />
      <path d="M3 19.5h18" />
    </>
  ),
  // Un tableau et une baguette : transmettre.
  mentor: (
    <>
      <rect x="3" y="4.5" width="14" height="11" rx="1.8" />
      <path d="M6.5 8.5h7M6.5 11.5h4.5" />
      <path d="M17.5 17.5l3.5 3.5" />
    </>
  ),
  // ⚠️ DES CURSEURS, PAS UN ENGRENAGE. Un engrenage demande au moins huit dents
  // pour être reconnu ; à 18 px, huit rayons autour d'un cercle se lisent comme
  // un SOLEIL, et c'est exactement ce que donnait la première version. Trois
  // faders avec leur bouton restent lisibles à 16 px, et c'est devenu la
  // convention des réglages sur toutes les plateformes.
  reglages: (
    <>
      <path d="M4 7h10M18 7h2M4 12h3M11 12h9M4 17h8M16 17h4" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="14" cy="17" r="2" />
    </>
  ),
  accueil: (
    <>
      <path d="M3.5 10.8 12 4l8.5 6.8" />
      <path d="M5.8 9.6V20h12.4V9.6" />
      <path d="M9.8 20v-5.4h4.4V20" />
    </>
  ),
  // Le ballon ovale et ses coutures : la carrière.
  ballon: (
    <>
      <path d="M4.6 19.4c-1.9-1.9-1.2-7.4 2.3-10.9S15 4.3 16.9 6.2s1.2 7.4-2.3 10.9-8.1 4.2-10 2.3Z" />
      <path d="M8.6 15.4 15 9" />
      <path d="M10 12.4l1.4 1.4M12.2 10.2l1.4 1.4" />
    </>
  ),
  profil: (
    <>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M4.8 20c0-3.6 3.2-5.8 7.2-5.8s7.2 2.2 7.2 5.8" />
    </>
  ),
  // Une enceinte vue de dessus : l'atlas des clubs.
  clubs: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="6" />
      <ellipse cx="12" cy="12" rx="3.4" ry="2.4" />
      <path d="M3 12h1.8M19.2 12H21" />
    </>
  ),
  plus: (
    <>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // LE BUREAU DE L'ENTRAÎNEUR — les onze onglets du mode manager
  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠️ ILS SE DISTINGUENT À 18 PIXELS, et c'est la seule contrainte qui compte
  // ici : onze onglets côte à côte dont deux se ressemblent, c'est onze onglets
  // qu'on relit à chaque fois. Chacun tient sur une silhouette différente —
  // rond, carré, triangle, trait — avant même de tenir sur un détail.

  // Une enceinte en coupe : le club, la maison.
  stade: (
    <>
      <path d="M3 18.5v-6.2c0-3.6 4-6.3 9-6.3s9 2.7 9 6.3v6.2" />
      <path d="M3 18.5h18" />
      <path d="M7.5 18.5v-4.2M12 18.5v-5.4M16.5 18.5v-4.2" />
    </>
  ),
  // Un sifflet : le match.
  sifflet: (
    <>
      <path d="M7.5 8.5h9.2a3.8 3.8 0 0 1 0 7.6H7.5A3.8 3.8 0 0 1 7.5 8.5Z" />
      <circle cx="7.6" cy="12.3" r="1.5" />
      <path d="M14.5 8.5 17 5.2" />
    </>
  ),
  // Un globe : le marché mondial.
  monde: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.6c2.2 2.4 3.3 5.2 3.3 8.4s-1.1 6-3.3 8.4c-2.2-2.4-3.3-5.2-3.3-8.4s1.1-6 3.3-8.4Z" />
    </>
  ),
  // Une pousse : la formation, le centre.
  formation: (
    <>
      <path d="M12 20.5v-8.2" />
      <path d="M12 12.3C12 8.9 9.6 6.4 6 6.1c-.3 3.9 2 6.5 6 6.2Z" />
      <path d="M12 14.6c0-2.8 2-4.9 5-5.1.2 3.2-1.9 5.3-5 5.1Z" />
      <path d="M8 20.5h8" />
    </>
  ),
  // Une loupe : les recruteurs, la recherche.
  loupe: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="M15.4 15.4 20.5 20.5" />
    </>
  ),
  // Deux haltères : l'entraînement.
  halteres: (
    <>
      <path d="M4 9.5v5M7 7.5v9M17 7.5v9M20 9.5v5" />
      <path d="M7 12h10" />
    </>
  ),
  // Un fronton à colonnes : la direction, le conseil.
  institution: (
    <>
      <path d="M3.5 9.2 12 4.5l8.5 4.7" />
      <path d="M6 11v6.5M10 11v6.5M14 11v6.5M18 11v6.5" />
      <path d="M4 20h16" />
    </>
  ),
  // Un maillot : le vestiaire.
  maillot: (
    <>
      <path d="M8.6 4.5 5 6.4l1.4 3.6 1.7-.7V19h7.8V9.3l1.7.7L19 6.4l-3.6-1.9" />
      <path d="M8.6 4.5a3.4 3.4 0 0 0 6.8 0" />
    </>
  ),
  // Un journal plié : le monde, l'actualité.
  journal: (
    <>
      <rect x="3" y="5.5" width="14.5" height="13" rx="1.6" />
      <path d="M17.5 9h2a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 1-3 0V9Z" />
      <path d="M6 9h8M6 12.2h8M6 15.4h5" />
    </>
  ),
  // Un livre ouvert : l'histoire, la mémoire.
  livre: (
    <>
      <path d="M12 7.2C10.4 6 8.6 5.4 6.4 5.4H3.5v12.4h2.9c2.2 0 4 .6 5.6 1.8" />
      <path d="M12 7.2c1.6-1.2 3.4-1.8 5.6-1.8h2.9v12.4h-2.9c-2.2 0-4 .6-5.6 1.8" />
      <path d="M12 7.2v12.4" />
    </>
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // LA FEUILLE DE MATCH — les pastilles d'une carte de joueur
  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠️ ELLES SONT LUES À 11 PIXELS, dans le pied d'une carte de 110 px de large.
  // À cette taille un tracé à trois détails devient une tache : chacune tient
  // sur DEUX traits au maximum, et se reconnaît à sa forme extérieure.

  // Un brassard : le capitaine.
  brassard: (
    <>
      <path d="M6.4 7.5h11.2a1.6 1.6 0 0 1 1.6 1.6v5.8a1.6 1.6 0 0 1-1.6 1.6H6.4a1.6 1.6 0 0 1-1.6-1.6V9.1a1.6 1.6 0 0 1 1.6-1.6Z" />
      <path d="M14 10.4a2.6 2.6 0 1 0 0 3.2" />
    </>
  ),
  // Une cible : le buteur.
  cible: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // Un banc de touche : les remplaçants.
  banc: (
    <>
      <path d="M3.5 11.5h17" />
      <path d="M5 11.5V19M19 11.5V19" />
      <path d="M5.5 8.2h13a1.4 1.4 0 0 1 1.4 1.4v1.9H4.1V9.6a1.4 1.4 0 0 1 1.4-1.4Z" />
    </>
  ),
  // Une croix médicale : le blessé.
  soin: (
    <>
      <rect x="3.6" y="6.4" width="16.8" height="11.2" rx="2.2" />
      <path d="M12 9.6v4.8M9.6 12h4.8" />
    </>
  ),
  // Un carton : la suspension.
  carton: (
    <>
      <rect x="6.6" y="3.8" width="10.8" height="16.4" rx="1.6" />
    </>
  ),
  // Une jeune pousse : l'espoir.
  pousse: (
    <>
      <path d="M12 20v-7.4" />
      <path d="M12 12.6c-3 .2-5-1.6-5.2-4.8 3 -.2 5 1.6 5.2 4.8Z" />
      <path d="M12 14.4c2.6.2 4.4-1.4 4.6-4.2-2.6-.2-4.4 1.4-4.6 4.2Z" />
    </>
  ),
  // Un drapeau : la sélection.
  drapeau: (
    <>
      <path d="M6.4 20.5V4.2" />
      <path d="M6.4 5.2h11.4l-2.2 3.6 2.2 3.6H6.4" />
    </>
  ),
  // Une batterie : la fatigue, la condition.
  batterie: (
    <>
      <rect x="3.2" y="8.4" width="15.2" height="7.2" rx="1.8" />
      <path d="M20.8 10.6v2.8" />
      <path d="M6.2 11.2v1.6" />
    </>
  ),
  // Une flamme : la forme du moment.
  flamme: (
    <>
      <path d="M12 3.5c3.4 3.2 5.4 6 5.4 8.9a5.4 5.4 0 0 1-10.8 0c0-1.5.6-2.9 1.7-4.2.3 1.3.9 2.1 1.8 2.4-.4-2.6.2-4.9 1.9-7.1Z" />
    </>
  ),
  // Un cœur : la condition physique.
  coeur: (
    <>
      <path d="M12 19.4C7.2 16.1 4.2 13.4 4.2 10.3A3.9 3.9 0 0 1 12 8.4a3.9 3.9 0 0 1 7.8 1.9c0 3.1-3 5.8-7.8 9.1Z" />
    </>
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // LES VERDICTS — ce que remplaçaient 🟢 ⚠️ ⛔
  // ═══════════════════════════════════════════════════════════════════════════
  ok: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M8.2 12.2 11 15l4.8-5.4" />
    </>
  ),
  alerte: (
    <>
      <path d="M12 4.4 21 19.6H3L12 4.4Z" />
      <path d="M12 10v3.6" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  stop: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M6.6 6.6 17.4 17.4" />
    </>
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // LE MARCHÉ
  // ═══════════════════════════════════════════════════════════════════════════
  // Un œil : observer davantage.
  oeil: (
    <>
      <path d="M2.6 12s3.4-5.8 9.4-5.8S21.4 12 21.4 12 18 17.8 12 17.8 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  euro: (
    <>
      <path d="M17.2 6.6a6.6 6.6 0 1 0 0 10.8" />
      <path d="M4.6 10.4h8M4.6 13.6h8" />
    </>
  ),
  chrono: (
    <>
      <circle cx="12" cy="13.2" r="7" />
      <path d="M12 9.8v3.4l2.2 1.6" />
      <path d="M9.6 3.6h4.8" />
    </>
  ),
  // Un stylo : signer.
  signature: (
    <>
      <path d="M4 20h16" />
      <path d="M6.6 16.4 16 7a2.1 2.1 0 0 1 3 3l-9.4 9.4-3.9.9.9-3.9Z" />
    </>
  ),
  // Deux mains : l'accord.
  poignee: (
    <>
      <path d="M3.4 10.6 7 7.4l3.2 2.6 2.6-.4 3 2.8" />
      <path d="M20.6 10.6 17 7.4l-3.4 2.4" />
      <path d="M15.8 12.4 13 15l-2.4-2 -2.2 1.8" />
      <path d="M3.4 10.6v3.2l3 2.6M20.6 10.6v3.2l-2.8 2.4" />
    </>
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // LES SAUVEGARDES ET LA CRÉATION
  // ═══════════════════════════════════════════════════════════════════════════
  disquette: (
    <>
      <path d="M4.5 4.5h11.6L19.5 8v11.5h-15V4.5Z" />
      <path d="M8 4.5v4.8h6.4V4.5" />
      <rect x="7.6" y="13" width="8.8" height="6.5" />
    </>
  ),
  corbeille: (
    <>
      <path d="M4.6 6.8h14.8" />
      <path d="M9.4 6.8V4.9h5.2v1.9" />
      <path d="M6.6 6.8 7.5 20h9l.9-13.2" />
      <path d="M10.4 10.4v6M13.6 10.4v6" />
    </>
  ),
  ajouter: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 8.2v7.6M8.2 12h7.6" />
    </>
  ),
  croix: (
    <>
      <path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" />
    </>
  ),
  etoile: (
    <>
      <path d="m12 4 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8L12 4Z" />
    </>
  ),
  trophee: (
    <>
      <path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0v-5Z" />
      <path d="M7.5 6.2H5a2.4 2.4 0 0 0 2.5 4M16.5 6.2H19a2.4 2.4 0 0 1-2.5 4" />
      <path d="M12 14v3.4M8.8 20h6.4" />
    </>
  ),
  // Une silhouette qui court : la carrière de joueur.
  joueur: (
    <>
      <circle cx="13.6" cy="5.4" r="2" />
      <path d="M8 20.5l2.6-4.6-1.6-3 .6-3.8 3.4-1.2 2.6 2.4 3 .8" />
      <path d="M11.2 15.9 14.8 17l1 3.5" />
      <path d="M9 8.6 5.6 10" />
    </>
  ),
  // Un tableau tactique : la carrière d'entraîneur.
  entraineur: (
    <>
      <rect x="3.5" y="4.5" width="17" height="12" rx="1.8" />
      <path d="M12 4.5v12" />
      <circle cx="12" cy="10.5" r="1.9" />
      <path d="M8 20h8" />
    </>
  ),
  'fleche-droite': (
    <>
      <path d="M4.5 12h14" />
      <path d="m13.4 7 5.1 5-5.1 5" />
    </>
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // LES MENUS, LA BOUTIQUE, LE PALMARÈS
  // ═══════════════════════════════════════════════════════════════════════════
  // Un sac : la boutique.
  boutique: (
    <>
      <path d="M4.6 8.4h14.8l-1.1 11.1H5.7L4.6 8.4Z" />
      <path d="M8.8 10.6V7.4a3.2 3.2 0 0 1 6.4 0v3.2" />
    </>
  ),
  // Une pièce de face, avec son relief : l'Ova.
  ova: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.8" />
    </>
  ),
  // ⚠️ UNE COCHE NUE, distincte de `ok` (une coche DANS un cercle). Les deux
  // servent : `ok` est un verdict qui doit se voir seul, `check` accompagne un
  // libellé (« ✓ Équipé », « ✓ Ta carrière est sauvegardée »).
  // Le chevron des listes déroulantes. Il remplace le caractère « ▾ », qui
  // est un GLYPHE DE POLICE : dessiné par le système, jamais à la même
  // graisse que le reste, et décalé d'un ou deux pixels selon la machine.
  chevron: (
    <>
      <path d="m6 9.5 6 6 6-6" />
    </>
  ),
  check: (
    <>
      <path d="m5 12.6 4.6 4.6L19 6.8" />
    </>
  ),
  verrou: (
    <>
      <rect x="4.8" y="10.4" width="14.4" height="9.4" rx="2" />
      <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  // Un clap : la publicité récompensée.
  video: (
    <>
      <rect x="3" y="8" width="18" height="11.6" rx="2" />
      <path d="M3.6 8 6.4 4.4l3.4 3.6M9.8 8l2.8-3.6L16 8" />
    </>
  ),
  // Une médaille pendue à son ruban : les podiums du classement.
  medaille: (
    <>
      <path d="M8.6 3.6 12 9.6M15.4 3.6 12 9.6" />
      <circle cx="12" cy="15.2" r="5" />
    </>
  ),
  // Un bouclier : les avants.
  bouclier: (
    <>
      <path d="M12 3.6 19.4 6v6c0 4.1-3 7.2-7.4 8.4C7.6 19.2 4.6 16.1 4.6 12V6L12 3.6Z" />
    </>
  ),
  // Un éclair : les lignes arrière.
  eclair: (
    <>
      <path d="M13.4 3.2 6 13.4h5l-.4 7.4L18 10.4h-5l.4-7.2Z" />
    </>
  ),
  calendrier: (
    <>
      <rect x="3.6" y="5.6" width="16.8" height="14.4" rx="2" />
      <path d="M3.6 10.2h16.8M8.4 3.6v3.6M15.6 3.6v3.6" />
    </>
  ),
  image: (
    <>
      <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2" />
      <circle cx="8.8" cy="10" r="1.6" />
      <path d="m4.4 17 4.8-4.8 3.6 3.6 2.8-2.6 5 4.8" />
    </>
  ),
  dossier: (
    <>
      <path d="M3.4 7.4a1.8 1.8 0 0 1 1.8-1.8h3.6l2 2.4h8a1.8 1.8 0 0 1 1.8 1.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8V7.4Z" />
    </>
  ),
  cadeau: (
    <>
      <rect x="3.4" y="9.6" width="17.2" height="4" rx="1" />
      <path d="M5 13.6v6.2h14v-6.2M12 9.6v10.2" />
      <path d="M12 9.6S10.6 4.4 8.2 4.4a2.4 2.4 0 0 0 0 5.2M12 9.6s1.4-5.2 3.8-5.2a2.4 2.4 0 0 1 0 5.2" />
    </>
  ),
  // Une feuille signée : un contrat.
  contrat: (
    <>
      <path d="M6 3.6h8.4L19 8.2v12.2H6V3.6Z" />
      <path d="M14 3.6v4.8h4.8" />
      <path d="M8.8 15.4c1.4-1.8 2.4.8 3.6-.4s2 .8 3 .2" />
    </>
  ),
  // Une porte ouverte : le départ, la retraite.
  porte: (
    <>
      <path d="M14.4 3.6H5.6v16.8h8.8" />
      <path d="M18.4 12H10" />
      <path d="m14.2 8.2 4.2 3.8-4.2 3.8" />
    </>
  ),
  'plein-ecran': (
    <>
      <path d="M4 9V4.6h4.6M15.4 4.6H20V9M20 15v4.4h-4.6M8.6 19.4H4V15" />
    </>
  ),
  // Une mallette : les médias, la presse.
  mallette: (
    <>
      <rect x="3" y="7.6" width="18" height="12" rx="2" />
      <path d="M9 7.6V5.8a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 5.8v1.8" />
      <path d="M3 12.6h18" />
    </>
  ),
  // Deux flèches en boucle : le repost, le transfert annoncé.
  repost: (
    <>
      <path d="M4.6 9.4V8a2 2 0 0 1 2-2h9.8" />
      <path d="m13.4 3 3.2 3-3.2 3" />
      <path d="M19.4 14.6V16a2 2 0 0 1-2 2H7.6" />
      <path d="m10.6 21-3.2-3 3.2-3" />
    </>
  ),
};

export function Icone({ nom, taille = 20, className }: Props) {
  return (
    <svg
      className={className}
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      // ⚠️ L'icône est DÉCORATIVE : chaque bouton qui l'utilise porte déjà son
      // libellé ou son `title`. L'annoncer une seconde fois ferait lire deux
      // fois la même chose à un lecteur d'écran.
      aria-hidden="true"
      focusable="false"
    >
      {TRACES[nom]}
    </svg>
  );
}
