import type { Club } from '../types';

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
export function LogoEquipe({ nom, logo, taille = 28 }: { nom: string; logo?: string; taille?: number }) {
  if (!logo) return <span className="blason-vide" style={{ width: taille, height: taille }} />;
  return (
    <img
      className="blason-logo"
      src={logo}
      alt={nom}
      title={nom}
      width={taille}
      height={taille}
      loading="lazy"
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
