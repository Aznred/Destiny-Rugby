import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Poteaux de rugby 3D (public/m3d/poteaux.glb, compressé Draco) en toile de
// fond du hero — recentrés, normalisés, posés derrière le ballon.
export function ModeleStade() {
  const { scene } = useGLTF('/m3d/poteaux.glb', true);

  const modele = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const taille = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(taille);
    box.getCenter(centre);
    const maxDim = Math.max(taille.x, taille.y, taille.z) || 1;
    const echelle = 7 / maxDim;
    clone.scale.setScalar(echelle);
    clone.position.set(
      -centre.x * echelle,
      -centre.y * echelle,
      -centre.z * echelle,
    );
    return clone;
  }, [scene]);

  return (
    <group position={[0, -0.5, -2.2]}>
      <primitive object={modele} />
    </group>
  );
}

useGLTF.preload('/m3d/poteaux.glb', true);
