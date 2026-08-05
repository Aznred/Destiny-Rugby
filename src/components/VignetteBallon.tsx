// LA VIGNETTE 3D D'UN BALLON — l'article de la boutique, en vrai.
//
// ⚠️ Demande explicite : « change l'icône des ballons par les ballons 3D ».
// Chaque article de la boutique affichait une simple pastille de couleur (un
// dégradé entre `corps` et `bande`) : impossible de reconnaître le ballon qu'on
// achète, et ça faisait maquette au milieu d'un jeu qui a de vrais modèles.
//
// ⚠️ CINQ CANVAS SUR UN ÉCRAN, ÇA SE PAIE. Trois précautions :
//   • pas de décor (ni stade, ni particules, ni ombres de contact) : un ballon,
//     deux lumières, fond transparent ;
//   • `dpr` plafonné à 1,5 et anti-aliasing coupé ;
//   • `frameloop="demand"` serait tentant, mais le ballon TOURNE — on garde donc
//     la boucle et on préfère limiter la résolution.
// Sur machine modeste (≤ 4 cœurs) ou si l'utilisateur a demandé moins
// d'animations, on retombe sur la pastille de couleur : c'est le même repli que
// pour la cérémonie de trophée.

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { BallonRugby } from './BallonRugby';
import { ModeleBallon } from './ModeleBallon';
import { SKIN_PAR_ID } from '../data/boutique';

function modeAllege(): boolean {
  if (typeof navigator === 'undefined') return true;
  const coeurs = navigator.hardwareConcurrency ?? 4;
  const moinsDAnimations = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return coeurs <= 4 || moinsDAnimations;
}

export function VignetteBallon({ skinId, taille = 92 }: { skinId: string; taille?: number }) {
  const skin = SKIN_PAR_ID[skinId] ?? SKIN_PAR_ID.classique;
  const allege = useMemo(modeAllege, []);

  if (allege) {
    return (
      <div
        className="pastille-couleur"
        style={{ background: `linear-gradient(135deg, ${skin.corps}, ${skin.bande})` }}
        aria-label={skin.nom}
      />
    );
  }

  return (
    <div className="vignette-ballon" style={{ width: taille, height: taille }}>
      <Canvas
        camera={{ position: [0, 0.2, 6.4], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 4]} intensity={1.7} color="#fff2d0" />
          <directionalLight position={[-4, 1, -3]} intensity={0.5} color="#3fae66" />
          {skin.glb ? <ModeleBallon url={skin.glb} /> : <BallonRugby skinId={skinId} />}
        </Suspense>
      </Canvas>
    </div>
  );
}
