// LA PELOUSE — le terrain, dessiné une seule fois pour tout le match.
//
// ⚠️ IL EST DESSINÉ EN MÈTRES DE TERRAIN, dans le repère du moteur, et c'est la
// caméra qui le place à l'écran (`moteur/camera.ts`). Ce composant ne sait donc
// rien du cadrage, du pivot en portrait, ni de la taille du téléphone : il pose
// un terrain de 122 × 70 à l'origine, un point c'est tout. C'est ce qui permet
// de le `memo`-ïser une fois pour toutes alors que la vue bouge à chaque image.

import { memo } from 'react';
import { AXE, LARGEUR, LIGNE_A, LIGNE_B, LONGUEUR, M22_A, M22_B, MILIEU } from '../../lib/moteur/terrain';

function Pelouse() {
  return (
    <>
      <defs>
        <linearGradient id="ml-pelouse" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c5a37" />
          <stop offset="0.5" stopColor="#164a2c" />
          <stop offset="1" stopColor="#0f3a22" />
        </linearGradient>
      </defs>
      <rect width={LONGUEUR} height={LARGEUR} fill="url(#ml-pelouse)" />
      {/* Bandes de tonte, dans le sens de la longueur */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x="0" y={(i * LARGEUR) / 10} width={LONGUEUR} height={LARGEUR / 10}
          fill={i % 2 ? 'rgba(255,255,255,.035)' : 'transparent'} />
      ))}
      {/* En-buts */}
      <rect x="0" y="0" width={LIGNE_A} height={LARGEUR} fill="rgba(0,0,0,.28)" />
      <rect x={LIGNE_B} y="0" width={LIGNE_A} height={LARGEUR} fill="rgba(0,0,0,.28)" />
      {/* Lignes pleines : essai, 22, médiane */}
      {[LIGNE_A, M22_A, MILIEU, M22_B, LIGNE_B].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2={LARGEUR}
          stroke="rgba(255,255,255,.58)" strokeWidth={x === MILIEU ? 0.5 : 0.4} />
      ))}
      {/* Les 10 mètres, en pointillés */}
      {[MILIEU - 10, MILIEU + 10].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2={LARGEUR} stroke="rgba(255,255,255,.32)"
          strokeWidth="0.3" strokeDasharray="1.6 2.4" />
      ))}
      {/* Pointillés des 5 m et 15 m */}
      {[5, 15, LARGEUR - 15, LARGEUR - 5].map((y) => (
        <line key={y} x1={LIGNE_A} y1={y} x2={LIGNE_B} y2={y} stroke="rgba(255,255,255,.15)"
          strokeWidth="0.22" strokeDasharray="1 4" />
      ))}
      <rect x="0.2" y="0.2" width={LONGUEUR - 0.4} height={LARGEUR - 0.4}
        fill="none" stroke="rgba(255,255,255,.42)" strokeWidth="0.35" />
      {/* Poteaux en H, sur la ligne d'en-but */}
      {[LIGNE_A, LIGNE_B].map((x) => (
        <g key={x} stroke="#f6f2e6" strokeWidth="0.55" fill="none">
          <line x1={x} y1={AXE - 2.8} x2={x} y2={AXE - 9.5} />
          <line x1={x} y1={AXE + 2.8} x2={x} y2={AXE + 9.5} />
          <line x1={x} y1={AXE - 2.8} x2={x} y2={AXE + 2.8} strokeWidth="0.75" />
        </g>
      ))}
    </>
  );
}

export const PelouseMemo = memo(Pelouse);
