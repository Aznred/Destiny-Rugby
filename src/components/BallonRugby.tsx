import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { SKIN_PAR_ID } from '../data/boutique';
import { makeBallonTexture } from './ballonTexture';

// Ballon de rugby texturé façon Gilbert France Rugby. La forme ovale vient d'une
// sphère étirée sur son axe polaire (Y local) ; on couche le ballon à
// l'horizontale (groupe externe) puis on le fait tourner autour de son grand axe
// (groupe interne) pour voir le profil ovale et défiler le panneau au coq.
// 	ourne : voir ModeleBallon — aucun asset ne tourne dans le menu ni dans
// le profil, seule la boutique anime ses articles.
export function BallonRugby({ skinId = 'classique', tourne = true }: { skinId?: string; tourne?: boolean }) {
  const skin = SKIN_PAR_ID[skinId] ?? SKIN_PAR_ID.classique;
  const spin = useRef<Group>(null);
  const externe = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);

  const texture = useMemo(() => makeBallonTexture(skin), [skin]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state, delta) => {
    if (!tourne) return;
    if (spin.current) spin.current.rotation.y += delta * 0.6;
    if (externe.current) {
      externe.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.12;
    }
  });

  return (
    // Grand axe (Y local) couché vers l'horizontale, léger 3/4
    <group ref={externe} rotation={[0.12, 0.18, Math.PI / 2 - 0.18]} scale={1.2}>
      <group ref={spin}>
        <mesh ref={mesh} scale={[1, 1.62, 1]} castShadow>
          <sphereGeometry args={[1, 128, 96]} />
          <meshStandardMaterial map={texture} roughness={0.34} metalness={skin.metal ?? 0.05} />
        </mesh>
      </group>
    </group>
  );
}
