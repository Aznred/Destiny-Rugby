import { Canvas } from '@react-three/fiber';
import { Float, Sparkles, ContactShadows } from '@react-three/drei';
import { Suspense } from 'react';
import { BallonRugby } from './BallonRugby';
import { ModeleBallon } from './ModeleBallon';
import { ModeleStade } from './ModeleStade';
import { SKIN_PAR_ID } from '../data/boutique';

// Scène 3D du hero : ballon flottant, poteaux stylisés, particules dorées.
export function Hero3D({ skinId = 'classique' }: { skinId?: string }) {
  const skin = SKIN_PAR_ID[skinId] ?? SKIN_PAR_ID.classique;
  return (
    <Canvas
      camera={{ position: [0, 0.3, 8.2], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        {/* Éclairage stade */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 5]} intensity={1.6} color="#fff2d0" castShadow />
        <directionalLight position={[-5, 2, -3]} intensity={0.6} color="#3fae66" />
        <pointLight position={[0, -3, 2]} intensity={0.7} color="#e8b23a" />

        <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.6}>
          {skin.glb ? <ModeleBallon url={skin.glb} /> : <BallonRugby skinId={skinId} />}
        </Float>

        {/* Stade en toile de fond (draco, chargé à la demande) */}
        <Suspense fallback={
          <group position={[0, -0.2, -2.6]}>
            <PoteauxH />
          </group>
        }>
          <ModeleStade />
        </Suspense>

        <Sparkles count={40} scale={[9, 5, 4]} size={3} speed={0.4} color="#f4cd63" opacity={0.5} />

        <ContactShadows position={[0, -1.8, 0]} opacity={0.35} scale={9} blur={2.6} far={4} color="#04120a" />
      </Suspense>
    </Canvas>
  );
}

function PoteauxH() {
  const blanc = '#dfe7dc';
  return (
    <group>
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 5, 12]} />
          <meshStandardMaterial color={blanc} roughness={0.6} transparent opacity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 2.9, 12]} />
        <meshStandardMaterial color={blanc} roughness={0.6} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
