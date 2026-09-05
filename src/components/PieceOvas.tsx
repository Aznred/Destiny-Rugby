// LA PIÈCE D'OVAS
//
// ⚠️ CE N'EST PAS UNE ICÔNE, ET C'EST POUR ÇA QU'ELLE N'EST PAS DANS
// `Icone.tsx`. Le jeu de pictogrammes du jeu suit une règle stricte : tracés
// sur grille de 24, en `currentColor`, une seule épaisseur de trait. C'est ce
// qui les rend cohérents entre eux — et c'est exactement ce qui empêche d'y
// mettre une pièce de monnaie, qui a besoin de matière : un métal, une
// tranche, un relief, une lumière.
//
// L'ancienne « icône ova » était donc deux cercles concentriques au trait. Ça
// marche à côté d'un libellé, ça ne tient pas quand la monnaie est le sujet —
// dans un portefeuille, sur un prix, dans une récompense. D'où ce composant à
// part : un dégradé doré, une tranche plus sombre, un reflet, et un ballon
// gravé au centre.
//
// ⚠️ LES IDENTIFIANTS DE DÉGRADÉ SONT UNIQUES PAR INSTANCE. Deux `<svg>` qui
// déclarent `id="or"` dans la même page, et le second réutilise le dégradé du
// premier : la pièce de la boutique prend la teinte de celle du portefeuille.
// C'est le genre de panne qui ne se voit qu'à l'écran, jamais dans le code.

import { useId } from 'react';

export function PieceOvas({ taille = 20, className }: { taille?: number; className?: string }) {
  const base = useId();
  const metal = `${base}-metal`;
  const creux = `${base}-creux`;
  const reflet = `${base}-reflet`;
  return (
    <svg className={className ?? 'piece-ovas'} width={taille} height={taille} viewBox="0 0 24 24"
      role="img" aria-label="Ovas" focusable="false">
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ffe9ab" />
          <stop offset="0.42" stopColor="#f4cd63" />
          <stop offset="0.72" stopColor="#e8b23a" />
          <stop offset="1" stopColor="#a8761f" />
        </linearGradient>
        <linearGradient id={creux} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#c9931f" />
          <stop offset="1" stopColor="#8a5c14" />
        </linearGradient>
        <linearGradient id={reflet} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* La tranche, décalée d'un demi-pixel : c'est elle qui donne l'épaisseur. */}
      <circle cx="12" cy="12.6" r="9.6" fill={`url(#${creux})`} />
      <circle cx="12" cy="12" r="9.6" fill={`url(#${metal})`} />
      {/* Le listel, ce léger anneau en retrait du bord d'une vraie pièce. */}
      <circle cx="12" cy="12" r="7.9" fill="none" stroke="#a8761f" strokeOpacity="0.55" strokeWidth="0.7" />
      {/* Le ballon gravé : un ovale et sa couture. */}
      <ellipse cx="12" cy="12" rx="5.3" ry="3.5" transform="rotate(-32 12 12)"
        fill="none" stroke="#8a5c14" strokeOpacity="0.85" strokeWidth="1.15" />
      <path d="M9.4 14.6 L14.6 9.4" stroke="#8a5c14" strokeOpacity="0.85" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M10.5 13.1 L11.6 14.2 M12.4 11.2 L13.5 12.3" stroke="#8a5c14" strokeOpacity="0.7" strokeWidth="0.85" strokeLinecap="round" />
      {/* Le reflet de lumière, en haut à gauche, comme sur un métal poli. */}
      <path d="M12 2.9a9.1 9.1 0 0 0-8.4 5.6A9.1 9.1 0 0 1 12 4.6a9.1 9.1 0 0 1 8.4 3.9A9.1 9.1 0 0 0 12 2.9Z"
        fill={`url(#${reflet})`} />
    </svg>
  );
}
