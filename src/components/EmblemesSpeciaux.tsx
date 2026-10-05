import { useId } from 'react';

// LES EMBLÈMES DES CARTES SPÉCIALES
//
// Ils prennent la place du logo de championnat sur la carte, et servent de
// pastille aux filtres de la collection et au Labo. Dessinés ici, en SVG, pour
// la même raison que `Icone.tsx` : un emoji citrouille est dessiné par Apple ou
// Google, pas par nous, et il ne s'accorde ni à l'or des ICONS ni au noir des
// cartes Halloween.

/** La citrouille orange des cartes Halloween : trois côtes, une tige, un éclat. */
export function Citrouille({ taille = 24, className }: { taille?: number; className?: string }) {
  const id = useId().replaceAll(':', '');
  return <svg className={className} width={taille} height={taille} viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-corps`} cx="42%" cy="38%" r="70%"><stop offset="0" stopColor="#ffc46b" /><stop offset=".55" stopColor="#ff8a1c" /><stop offset="1" stopColor="#b14a05" /></radialGradient>
    </defs>
    <path d="M23 12 C22.6 8.4 24.6 5.6 28.4 4.6 L29.6 7 C27 7.8 26 9.6 26.2 12.4 Z" fill="#5b6b2e" />
    <path d="M26.4 9.6 C29.8 7.6 33.4 8.2 35.2 10.2 C32.6 10.6 30.2 11.4 27.6 12.8 Z" fill="#7f9440" />
    <ellipse cx="15.5" cy="28" rx="10.5" ry="13" fill={`url(#${id}-corps)`} />
    <ellipse cx="32.5" cy="28" rx="10.5" ry="13" fill={`url(#${id}-corps)`} />
    <ellipse cx="24" cy="28" rx="10" ry="14.5" fill={`url(#${id}-corps)`} />
    <path d="M24 14.2 C20 19 20 37 24 41.8 M24 14.2 C28 19 28 37 24 41.8 M15 16 C10.4 21 10.4 35 15 40 M33 16 C37.6 21 37.6 35 33 40" fill="none" stroke="#9c3f04" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
    <ellipse cx="19" cy="21" rx="2.4" ry="4.2" fill="#fff3cf" opacity=".45" transform="rotate(-18 19 21)" />
  </svg>;
}

/**
 * L'emblème ICON : un médaillon noir cerclé d'or, une couronne de laurier et
 * une étoile. Le mot ICON n'y est pas — il est gravé ailleurs sur la carte,
 * discrètement, comme demandé.
 */
export function EmblemeIcon({ taille = 24, className }: { taille?: number; className?: string }) {
  const id = useId().replaceAll(':', '');
  const feuilles = Array.from({ length: 6 }, (_, i) => i);
  return <svg className={className} width={taille} height={taille} viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-or`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff1b8" /><stop offset=".45" stopColor="#d6a43a" /><stop offset=".75" stopColor="#8a6418" /><stop offset="1" stopColor="#f2cf72" /></linearGradient>
    </defs>
    <circle cx="24" cy="24" r="22" fill={`url(#${id}-or)`} />
    <circle cx="24" cy="24" r="18.6" fill="#141110" />
    <circle cx="24" cy="24" r="17.2" fill="none" stroke={`url(#${id}-or)`} strokeWidth=".8" opacity=".7" />
    {[-1, 1].map(sens => <g key={sens} transform={sens < 0 ? undefined : 'translate(48 0) scale(-1 1)'}>
      <path d="M17 35 C11.5 31 10.5 22.5 14.5 15.5" fill="none" stroke={`url(#${id}-or)`} strokeWidth="1.2" strokeLinecap="round" />
      {feuilles.map(i => {
        const t = i / 5, x = 17 - 5.6 * Math.sin(t * 2.4), y = 34 - t * 18;
        return <ellipse key={i} cx={x - 1.4} cy={y} rx="1.2" ry="2.6" fill={`url(#${id}-or)`} transform={`rotate(${-35 + t * 25} ${x - 1.4} ${y})`} />;
      })}
    </g>)}
    <path d="M24 14.2 L26.3 20.6 L33.1 20.8 L27.7 25 L29.6 31.5 L24 27.6 L18.4 31.5 L20.3 25 L14.9 20.8 L21.7 20.6 Z" fill={`url(#${id}-or)`} transform="translate(24 24) scale(.62) translate(-24 -24)" />
    <path d="M18.5 34.5 H29.5" stroke={`url(#${id}-or)`} strokeWidth="1" strokeLinecap="round" />
  </svg>;
}

/** L'emblème d'une famille spéciale, quelle qu'elle soit (repli : l'emblème ICON). */
export function EmblemeSpecial({ logo, taille, className }: { logo: string; taille?: number; className?: string }) {
  return logo === 'citrouille' ? <Citrouille taille={taille} className={className} /> : <EmblemeIcon taille={taille} className={className} />;
}
