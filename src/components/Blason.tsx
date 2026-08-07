import type { Club } from '../types';
import { LOGO_PAR_EQUIPE } from '../data/mondeReel';
import { COMPETITIONS_NATIONS_NOUVELLES } from '../data/nouvellesLigues';
import { nomNation } from '../lib/nations';

// ⚠️ DEUX SOURCES D'ÉCUSSONS DE SÉLECTION. Les compétitions historiques
// viennent de `mondeReel.ts`, les treize nouvelles (Rugby Europe Conference,
// Oceania Cup, Americas Championship…) de `nouvellesLigues.ts` — elles
// apportent 86 équipes nationales de plus, dont l'Andorre, le Kosovo ou les
// Îles Salomon, qui n'existaient nulle part ailleurs.
const LOGOS_EQUIPE: Record<string, string> = { ...LOGO_PAR_EQUIPE };
for (const comp of COMPETITIONS_NATIONS_NOUVELLES) {
  for (const e of comp.equipes) if (e.logo && !LOGOS_EQUIPE[e.nom]) LOGOS_EQUIPE[e.nom] = e.logo;
}
// Le moteur emploie les noms canoniques (« Écosse », « Pays de Galles »,
// « États-Unis ») alors que certaines sources de logos écrivent Ecosse, Galles
// ou USA. On indexe donc chaque logo aussi sous sa nation canonique.
for (const [nom, logo] of Object.entries({ ...LOGOS_EQUIPE })) {
  const canonique = nomNation(nom);
  if (canonique && !/\s+(?:U20|A|B|C|XV|-20)$/i.test(nom) && !LOGOS_EQUIPE[canonique]) {
    LOGOS_EQUIPE[canonique] = logo;
  }
}

// Écusson d'un club. Les clubs couverts par la base réelle (Top 14, Pro D2,
// Nationale et championnats du monde) affichent leur VRAI logo ; les autres
// (Nationale 2, Fédérales) gardent un blason généré : initiales sur un bouclier
// bicolore.
export function Blason({ club, taille = 40 }: { club: Club; taille?: number }) {
  if (club.logo) {
    return (
      <img
        className="blason-logo"
        src={club.logo}
        alt={club.nom}
        title={club.nom}
        width={taille}
        height={taille}
        loading="lazy"
        decoding="async"
        style={{ width: taille, height: taille }}
      />
    );
  }

  const initiales = club.nom
    .replace(/[^A-Za-zÀ-ÿ ]/g, '')
    .split(' ')
    .filter((m) => m.length > 2 || /^[A-Z]/.test(m))
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join('') || club.nom.slice(0, 2).toUpperCase();

  const clair = estClair(club.c2);

  return (
    <svg width={taille} height={taille} viewBox="0 0 48 52" aria-label={club.nom}>
      <defs>
        <clipPath id={`b-${sanitize(club.nom)}`}>
          <path d="M4 4 H44 V30 Q44 44 24 50 Q4 44 4 30 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#b-${sanitize(club.nom)})`}>
        <rect x="0" y="0" width="48" height="52" fill={club.c1} />
        <rect x="24" y="0" width="24" height="52" fill={club.c2} />
        <path d="M0 26 H48" stroke="rgba(255,255,255,0.15)" strokeWidth="52" opacity="0" />
      </g>
      <path
        d="M4 4 H44 V30 Q44 44 24 50 Q4 44 4 30 Z"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2"
      />
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontFamily="Anton, sans-serif"
        fontSize="18"
        fill={clair ? '#10240f' : '#ffffff'}
        style={{ paintOrder: 'stroke' }}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      >
        {initiales}
      </text>
    </svg>
  );
}

// Logo d'une équipe dont on n'a que le nom (sélections nationales, classements).
//
// ⚠️ IL VA LE CHERCHER TOUT SEUL. Les appelants passaient `nom` sans `logo`
// (classement des sélections, en-tête d'un match international) et le composant
// rendait un carré vide : aucune icône ne s'affichait dans les classements de
// sélections. `LOGO_PAR_EQUIPE` (data/mondeReel.ts) contient l'écusson de
// toutes les équipes des compétitions de nations — on s'en sert par défaut, et
// à défaut on retombe sur les initiales plutôt que sur du vide.
export function LogoEquipe({ nom, logo, taille = 28 }: { nom: string; logo?: string; taille?: number }) {
  const src = logo ?? LOGOS_EQUIPE[nom];
  if (!src) {
    const initiales = nom
      .replace(/[^A-Za-zÀ-ÿ ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((m) => m[0]?.toUpperCase())
      .join('') || nom.slice(0, 2).toUpperCase();
    return (
      <svg width={taille} height={taille} viewBox="0 0 40 40" aria-label={nom}>
        <circle cx="20" cy="20" r="19" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.22)" />
        <text
          x="20" y="26" textAnchor="middle" fontFamily="Archivo, sans-serif"
          fontSize="16" fontWeight="700" fill="rgba(246,242,230,.85)"
        >
          {initiales}
        </text>
      </svg>
    );
  }
  return (
    <img
      className="blason-logo"
      src={src}
      alt={nom}
      title={nom}
      width={taille}
      height={taille}
      // ⚠️ PAS DE `loading="lazy"` ICI. Même leçon que pour les avatars de
      // L'Ovale : sur des vignettes de 40 px empilées dans un conteneur en
      // `content-visibility: auto` (les blocs de l'atlas), le navigateur ne
      // déclenche jamais le chargement et la liste des sélections reste pleine
      // de cases vides. Il n'y a que ~41 écussons de sélection dans tout le
      // jeu : les charger tout de suite ne coûte rien.
      decoding="async"
      style={{ width: taille, height: taille }}
    />
  );
}

function sanitize(s: string) {
  return s.replace(/[^a-z0-9]/gi, '');
}

function estClair(hex: string | undefined) {
  if (!hex) return false;
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}
