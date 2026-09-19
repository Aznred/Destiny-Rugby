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
          <stop offset="0" stopColor="#25bd6b" />
          <stop offset="0.5" stopColor="#1fb365" />
          <stop offset="1" stopColor="#18a55b" />
        </linearGradient>
      </defs>
      <rect width={LONGUEUR} height={LARGEUR} fill="url(#ml-pelouse)" />
      {/* Bandes verticales comme sur la référence : elles rendent la vitesse
          et le déplacement horizontal du ballon immédiatement lisibles. */}
      {Array.from({ length: 18 }, (_, i) => (
        <rect key={i} x={(i * LONGUEUR) / 18} y="0" width={LONGUEUR / 18} height={LARGEUR}
          fill={i % 2 ? 'rgba(255,255,255,.055)' : 'rgba(0,70,35,.025)'} />
      ))}
      {/* En-buts */}
      <rect x="0" y="0" width={LIGNE_A} height={LARGEUR} fill="rgba(0,70,35,.12)" />
      <rect x={LIGNE_B} y="0" width={LIGNE_A} height={LARGEUR} fill="rgba(0,70,35,.12)" />
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
      {/* Poteaux vus du dessus. Les anciens H étaient dessinés couchés le long
          de la touche et devenaient gigantesques au bord de l'écran. Ici les
          deux montants sont ancrés sur la ligne, avec protections et ombres. */}
      {[LIGNE_A, LIGNE_B].map((x) => {
        const directionOmbre = x === LIGNE_A ? -1 : 1;
        const xOmbre = x + directionOmbre * 5.8;
        return <g key={x} className="rg-poteaux">
          <g stroke="rgba(5,36,25,.28)" strokeWidth=".55" strokeLinecap="round">
            <line x1={x} y1={AXE - 2.8} x2={xOmbre} y2={AXE - 4.2} />
            <line x1={x} y1={AXE + 2.8} x2={xOmbre} y2={AXE + 1.4} />
            <line x1={xOmbre} y1={AXE - 4.2} x2={xOmbre} y2={AXE + 1.4} />
          </g>
          <line x1={x} y1={AXE - 2.8} x2={x} y2={AXE + 2.8}
            stroke="#f8faf8" strokeWidth=".48" strokeLinecap="round" />
          {[AXE - 2.8, AXE + 2.8].map((y) => <g key={y}>
            <circle cx={x} cy={y} r=".48" fill="#f8faf8" stroke="#68757a" strokeWidth=".16" />
            <rect x={x - .64} y={y - .76} width="1.28" height="1.52" rx=".28"
              fill="#343d43" stroke="#edf2ef" strokeWidth=".15" />
            <rect x={x - .45} y={y - .58} width=".9" height="1.16" rx=".18" fill="#f4f6f5" opacity=".92" />
          </g>)}
        </g>;
      })}
    </>
  );
}

export const PelouseMemo = memo(Pelouse);
