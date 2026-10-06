// LES MINI-DÉMONSTRATIONS DU TUTORIEL — un geste, une boucle, quatre secondes.
//
// ⚠️ ELLES MONTRENT LE GESTE, ELLES NE LE DÉCRIVENT PAS : un doigt qui glisse, une molette qui tourne, un stick qu'on pousse.
// Dessinées en SVG et animées en CSS (`GuideTutoriel.css`) : pas de vidéo, pas de dépendance, aucune image à charger.
// Sous « réduire les animations » (`prefers-reduced-motion`), elles restent en place sur leur image la plus lisible.

import type { NomAnimation } from '../../lib/tutoriel/types';

const DOIGT = (
  <g className="gta-doigt" aria-hidden="true">
    <rect x="-4.5" y="-2" width="9" height="19" rx="4.5" />
    <circle r="7" cy="0" className="gta-bout" />
  </g>
);

function Cadre({ nom, children }: { nom: NomAnimation; children: React.ReactNode }) {
  return (
    <svg className={`gta gta-${nom}`} viewBox="0 0 160 76" role="presentation" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function AnimationTuto({ nom }: { nom: NomAnimation }) {
  switch (nom) {
    case 'clic':
      return (
        <Cadre nom={nom}>
          <rect className="gta-bouton" x="40" y="22" width="80" height="32" rx="16" />
          <rect className="gta-bouton-trait" x="52" y="35" width="56" height="6" rx="3" />
          <circle className="gta-onde" cx="80" cy="38" r="10" />
          <circle className="gta-onde gta-onde-2" cx="80" cy="38" r="10" />
          <g transform="translate(80 38)"><g className="gta-main-clic">{DOIGT}</g></g>
        </Cadre>
      );
    case 'glisse':
      return (
        <Cadre nom={nom}>
          <rect className="gta-ecran" x="52" y="4" width="56" height="68" rx="9" />
          <path className="gta-trace" d="M80 58 C 80 46, 84 34, 80 18" />
          <path className="gta-pointe" d="M73 24 L80 15 L87 24" />
          <g transform="translate(80 58)"><g className="gta-main-glisse">{DOIGT}</g></g>
        </Cadre>
      );
    case 'molette':
      return (
        <Cadre nom={nom}>
          <rect className="gta-souris" x="60" y="8" width="40" height="60" rx="20" />
          <line className="gta-souris-trait" x1="80" y1="8" x2="80" y2="30" />
          <rect className="gta-molette" x="76.5" y="16" width="7" height="14" rx="3.5" />
          <path className="gta-pointe gta-fleche-haut" d="M118 28 L124 20 L130 28" />
          <path className="gta-pointe gta-fleche-bas" d="M118 48 L124 56 L130 48" />
          <path className="gta-pointe gta-fleche-haut" d="M30 28 L36 20 L42 28" />
          <path className="gta-pointe gta-fleche-bas" d="M30 48 L36 56 L42 48" />
        </Cadre>
      );
    case 'stick':
      return (
        <Cadre nom={nom}>
          <circle className="gta-base" cx="80" cy="38" r="31" />
          <circle className="gta-base-int" cx="80" cy="38" r="21" />
          <g className="gta-levier">
            <circle className="gta-manche" cx="80" cy="38" r="13" />
            <circle className="gta-manche-reflet" cx="76" cy="34" r="4.5" />
          </g>
          <path className="gta-pointe" d="M80 3 L86 10 M80 3 L74 10" />
        </Cadre>
      );
    case 'glisser':
      return (
        <Cadre nom={nom}>
          <rect className="gta-case" x="14" y="14" width="46" height="48" rx="9" />
          <rect className="gta-case gta-case-cible" x="100" y="14" width="46" height="48" rx="9" />
          <g className="gta-carte-volante">
            <rect className="gta-carte" x="-18" y="-22" width="36" height="44" rx="7" />
            <rect className="gta-carte-bande" x="-12" y="-14" width="24" height="5" rx="2.5" />
            <circle className="gta-carte-tete" cx="0" cy="3" r="6" />
            <g transform="translate(6 14)"><g className="gta-doigt-fixe">{DOIGT}</g></g>
          </g>
        </Cadre>
      );
    case 'retourne':
      return (
        <Cadre nom={nom}>
          <g transform="translate(80 38)">
            <g className="gta-retourne">
              <rect className="gta-carte" x="-23" y="-31" width="46" height="62" rx="8" />
              <rect className="gta-carte-bande" x="-16" y="-22" width="32" height="6" rx="3" />
              <circle className="gta-carte-tete" cx="0" cy="3" r="9" />
              <rect className="gta-carte-bande" x="-14" y="18" width="28" height="5" rx="2.5" />
            </g>
          </g>
          <path className="gta-etincelle" d="M30 14 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          <path className="gta-etincelle gta-etincelle-2" d="M126 52 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" />
        </Cadre>
      );
    case 'defile':
      return (
        <Cadre nom={nom}>
          <g className="gta-rail">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} className="gta-carte" x={8 + i * 36} y="14" width="30" height="48" rx="6" />
            ))}
          </g>
          <path className="gta-pointe" d="M140 12 L148 20 L140 28" />
          <g transform="translate(80 58)"><g className="gta-main-defile">{DOIGT}</g></g>
        </Cadre>
      );
  }
}
