import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';

// Charge le ballon modélisé en 3D (public/ballon.glb), le recentre et le
// normalise à une taille cible, puis le fait tourner.
// ⚠️ `tourne` EST UN VRAI RÉGLAGE, PAS UNE OPTION DE CONFORT. Demande
// explicite : « il faut qu'aucun asset ne tourne dans le menu ou le profil ».
// Un ballon qui pivote dans les mains d'un joueur immobile, ce n'est pas une
// animation, c'est un bug visuel. La boutique, elle, garde la rotation : c'est
// là qu'on inspecte un article sous toutes ses faces.
export function ModeleBallon({ url = '/ballon.glb', tourne = true }: { url?: string; tourne?: boolean }) {
  // 2e argument : active le décodeur Draco (le .glb est compressé, 40 Mo → 0,45 Mo)
  const { scene } = useGLTF(url, true);
  const spin = useRef<Group>(null);
  const bob = useRef<Group>(null);

  const modele = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const taille = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(taille);
    box.getCenter(centre);
    const maxDim = Math.max(taille.x, taille.y, taille.z) || 1;
    const echelle = 3.4 / maxDim;
    clone.scale.setScalar(echelle);
    clone.position.set(-centre.x * echelle, -centre.y * echelle, -centre.z * echelle);
    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    if (!tourne) return;
    if (spin.current) spin.current.rotation.y += delta * 0.5;
    if (bob.current) bob.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.12;
  });

  return (
    <group ref={bob} rotation={[0.15, 0, 0]}>
      <group ref={spin}>
        <primitive object={modele} />
      </group>
    </group>
  );
}

useGLTF.preload('/ballon.glb', true);
