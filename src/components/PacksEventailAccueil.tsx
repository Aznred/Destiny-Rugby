import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Group, Vector3 } from 'three';
import type { RareteCarriere } from '../lib/ligue/typesCarriere';
import { modelePack, PALIERS_PACK } from '../lib/presentationPacks';

const PLACES = [
  { x: -2.45, y: -.26, z: -.72, r: -.34 },
  { x: -1.25, y: -.05, z: -.28, r: -.17 },
  { x: 0, y: .08, z: .12, r: 0 },
  { x: 1.25, y: -.05, z: -.28, r: .17 },
  { x: 2.45, y: -.26, z: -.72, r: .34 },
] as const;

function Pochette({ rarete, index }: { rarete: RareteCarriere; index: number }) {
  const { scene } = useGLTF(modelePack(rarete));
  const objet = useMemo(() => {
    const clone = scene.clone(true);
    const boite = new Box3().setFromObject(clone, true);
    const taille = boite.getSize(new Vector3());
    const centre = boite.getCenter(new Vector3());
    const echelle = 2.55 / Math.max(taille.x, taille.y, taille.z);
    const groupe = new Group();
    groupe.add(clone);
    groupe.scale.setScalar(echelle);
    groupe.position.copy(centre.multiplyScalar(-echelle));
    return groupe;
  }, [scene]);
  const place = PLACES[index];
  return <group position={[place.x, place.y, place.z]} rotation={[0, 0, place.r]}>
    <primitive object={objet} />
  </group>;
}

/** Les cinq pochettes du jeu, sans doublon de canvas, disposées comme des cartes en main. */
export function PacksEventailAccueil() {
  return <Canvas camera={{ position: [0, .15, 8.2], fov: 42 }} dpr={[1, 1.5]} frameloop="demand" gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={2.2} />
    <directionalLight position={[3, 5, 6]} intensity={4} color="#fff2d0" />
    <directionalLight position={[-4, 1, 3]} intensity={2.4} color="#9bdcff" />
    <Suspense fallback={null}>
      {PALIERS_PACK.map((rarete, index) => <Pochette key={rarete} rarete={rarete} index={index} />)}
    </Suspense>
  </Canvas>;
}

for (const rarete of PALIERS_PACK) useGLTF.preload(modelePack(rarete));
