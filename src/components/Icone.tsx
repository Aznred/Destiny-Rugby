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
  | 'reglages' | 'accueil' | 'ballon' | 'profil' | 'clubs' | 'plus';

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
