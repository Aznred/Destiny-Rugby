// LE JETON DE CRÉDITS (Correctif 21) — la monnaie premium, qui ne doit jamais se confondre avec les Ovas
//
// Direction artistique : là où la pièce d'Ovas est ronde, dorée et chaude (un ballon gravé), le Crédit est un JETON
// OCTOGONAL à bord d'acier, au cœur bleu-violet qui vire au cyan, avec le signe de Destiny Rugby — un ovale traversé d'un D —
// en blanc. La silhouette (huit pans), la matière (acier) et la couleur (froide) diffèrent toutes les trois : même en vingt
// pixels, sur un téléphone, on lit « jeton premium » et non « pièce ».
//
// ⚠️ CE N'EST PAS UNE ICÔNE `Icone.tsx` (traits fins, `currentColor`) : un jeton a besoin de matière, comme `PieceOvas`.
// ⚠️ LES IDENTIFIANTS DE DÉGRADÉ SONT UNIQUES PAR INSTANCE (`useId`), pour la même raison que la pièce d'Ovas.
//
// QUATRE TAILLES, car le détail ne se lit pas partout :
//   ui        ≤ 20 px — le jeton nu : pans, cœur, ovale (sans D ni crans) ;
//   boutique  ~ 32-48 — crans de l'arête, D du Destiny, reflet ;
//   achat     ~ 64+  — l'animation d'achat : le jeton tourne sur son axe, étincelle sur l'arête ;
//   popup     ~ 56+  — « crédits insuffisants » : le jeton grisé et fêlé d'un trait, solde à côté.
// Les mêmes quatre se retrouvent en fichiers autonomes dans `public/icons/credit_icon*.svg` (`scripts/genererIconeCredit.tsx`).

import { useId } from 'react';

export type VarianteCredit = 'ui' | 'boutique' | 'achat' | 'popup';

/** Un octogone régulier de rayon `r`, pans à plat en haut et en bas. */
function octogone(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 8) + (i * Math.PI) / 4;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const CRANS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const [x1, y1, x2, y2] = [16 + 13.2 * Math.cos(a), 16 + 13.2 * Math.sin(a), 16 + 14.6 * Math.cos(a), 16 + 14.6 * Math.sin(a)];
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`;
}).join('');

export function PieceCredits({ taille = 20, variante, className, titre = 'Crédits' }: {
  taille?: number; variante?: VarianteCredit; className?: string; titre?: string;
}) {
  const base = useId();
  const v: VarianteCredit = variante ?? (taille <= 20 ? 'ui' : 'boutique');
  const acier = `${base}-acier`, coeur = `${base}-coeur`, reflet = `${base}-reflet`, ombre = `${base}-ombre`;
  const grise = v === 'popup';
  return (
    <svg className={className ?? `piece-credits piece-credits-${v}`} width={taille} height={taille} viewBox="0 0 32 32"
      role="img" aria-label={titre} focusable="false" data-variante={v}>
      <defs>
        <linearGradient id={acier} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={grise ? '#c9ced6' : '#f4f9ff'} />
          <stop offset="0.45" stopColor={grise ? '#8d94a0' : '#a9bad1'} />
          <stop offset="1" stopColor={grise ? '#5b616b' : '#566883'} />
        </linearGradient>
        <linearGradient id={coeur} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={grise ? '#6f7683' : '#3be3d4'} />
          <stop offset="0.5" stopColor={grise ? '#575d68' : '#4a78f0'} />
          <stop offset="1" stopColor={grise ? '#3f444d' : '#5a3fd8'} />
        </linearGradient>
        <linearGradient id={reflet} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={ombre} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className={v === 'achat' ? 'piece-credits-tour' : undefined}>
        {v !== 'ui' && <ellipse cx="16" cy="29" rx="10" ry="1.8" fill={`url(#${ombre})`} />}
        {/* L'arête : l'épaisseur du jeton, décalée d'un demi-pan vers le bas. */}
        <path d={octogone(16, 16.9, 14.6)} fill={grise ? '#3a3f48' : '#34425a'} />
        <path d={octogone(16, 16, 14.6)} fill={`url(#${acier})`} />
        {v !== 'ui' && <path d={CRANS} stroke={grise ? '#4a505a' : '#3a4b66'} strokeWidth="1.1" strokeLinecap="round" fill="none" />}
        {/* Le cœur, en retrait, plus froid et plus profond que l'acier. */}
        <path d={octogone(16, 16, 11.4)} fill={`url(#${coeur})`} />
        <path d={octogone(16, 16, 11.4)} fill="none" stroke="#fff" strokeOpacity={v === 'ui' ? 0.35 : 0.45} strokeWidth="0.7" />
        {/* Le signe Destiny : l'ovale de ballon traversé d'un D. */}
        <ellipse cx="16" cy="16" rx="7.2" ry="4.7" transform="rotate(-32 16 16)" fill="none" stroke="#fff" strokeWidth={v === 'ui' ? 1.9 : 1.5} strokeOpacity="0.95" />
        {v !== 'ui' && (
          <path d="M13.6 12.4h2.1a3.6 3.6 0 0 1 0 7.2h-2.1Z" fill="none" stroke="#fff" strokeWidth="1.45" strokeLinejoin="round" strokeOpacity="0.95" />
        )}
        {/* Le reflet, en haut à gauche, comme sur un métal brossé. */}
        <path d="M16 2.2c-5 0-9.4 2.7-11.7 6.8 2.4-3 6.7-4.7 11.7-4.7s9.300 1.700 11.700 4.700C25.400 4.900 21 2.200 16 2.200Z" fill={`url(#${reflet})`} />
        {v === 'achat' && <path d="M25.200 5.400l.7 1.800 1.800.7-1.800.7-.7 1.800-.7-1.800-1.800-.7 1.800-.7Z" fill="#fff" className="piece-credits-etincelle" />}
        {v === 'popup' && <path d="M19.500 6.500 16.800 13.200 20.600 15 15.200 25.500" fill="none" stroke="#14171c" strokeOpacity="0.75" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />}
      </g>
    </svg>
  );
}
