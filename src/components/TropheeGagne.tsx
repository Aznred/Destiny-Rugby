import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Sparkles, ContactShadows, Float } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import type { Group } from 'three';
import { TROPHEES } from '../data/trophees';
import { t, tn } from '../lib/i18n';
import { descriptionTrophee, nomTrophee } from '../lib/tropheesI18n';
import { Icone } from './Icone';

// Modèle du trophée : recentré, normalisé, en rotation continue sur lui-même.
function ModeleTrophee({ url }: { url: string }) {
  const { scene } = useGLTF(url, true);
  const pivot = useRef<Group>(null);

  const modele = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const taille = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(taille);
    box.getCenter(centre);
    const maxDim = Math.max(taille.x, taille.y, taille.z) || 1;
    const echelle = 3.2 / maxDim;
    clone.scale.setScalar(echelle);
    clone.position.set(
      -centre.x * echelle,
      -centre.y * echelle,
      -centre.z * echelle,
    );
    return clone;
  }, [scene]);

  useFrame((_, delta) => {
    if (pivot.current) pivot.current.rotation.y += delta * 0.8;
  });

  return (
    <group ref={pivot}>
      <primitive object={modele} />
    </group>
  );
}

interface Props {
  tropheeId: string;
  index: number; // position dans la file (1-based)
  total: number;
  onFermer: () => void;
}

// Machine modeste ou utilisateur qui a demandé moins d'animations : on retire
// les particules, qui sont la partie la plus coûteuse de la scène.
function modeAllege(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return (navigator.hardwareConcurrency ?? 8) <= 4;
}

export function TropheeGagne({ tropheeId, index, total, onFermer }: Props) {
  const trophee = TROPHEES[tropheeId];
  const allege = useMemo(modeAllege, []);
  if (!trophee) return null;
  const reste = total - index;

  return (
    <div className="overlay overlay-trophee" onClick={onFermer}>
      <motion.div
        className="carte modale-trophee"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        style={{ ['--aura' as string]: trophee.couleur }}
      >
        <motion.div
          className="eyebrow trophee-eyebrow"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Icone nom="trophee" taille={17} /> {t('trophee.remporte')}{total > 1 ? ` · ${index} / ${total}` : ''}
        </motion.div>

        <motion.h2
          className="trophee-nom"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 200 }}
        >
          {nomTrophee(trophee)}
        </motion.h2>

        <div className="trophee-canvas">
          <div className="trophee-chargement">
            <span /><span /><span />
          </div>
          {/* ⚡ Scène volontairement sobre : le trophée tourne à 60 fps, tout ce
              qui est recalculé à chaque image coûte cher. dpr plafonné à 1,5
              (au lieu de 2 = 4× plus de pixels sur un écran Retina),
              anti-aliasing coupé, ombre de contact calculée UNE fois. */}
          <Canvas
            camera={{ position: [0, 0.4, 5.2], fov: 42 }}
            dpr={[1, 1.5]}
            gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={1.5} />
              <directionalLight position={[3, 5, 4]} intensity={3} color="#fff4d6" />
              <directionalLight position={[-4, 2, -3]} intensity={1.6} color={trophee.couleur} />
              <directionalLight position={[0, 2, -5]} intensity={1.2} color="#ffffff" />
              <pointLight position={[0, -2, 3]} intensity={2} color={trophee.couleur} />
              <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.5}>
                <ModeleTrophee url={trophee.modele} />
              </Float>
              {!allege && (
                <Sparkles count={32} scale={[5, 5, 3]} size={4} speed={0.5} color={trophee.couleur} opacity={0.9} />
              )}
              <ContactShadows
                position={[0, -1.7, 0]} opacity={0.4} scale={7} blur={2.4} far={4}
                color="#04120a" frames={1}
              />
            </Suspense>
          </Canvas>
        </div>

        <motion.p
          className="trophee-desc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {descriptionTrophee(trophee)}
        </motion.p>

        <motion.button
          className="btn primaire grand"
          onClick={onFermer}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          {reste > 0 ? `${tn('trophee.suivant', reste)} →` : t('trophee.soulever')}
        </motion.button>
      </motion.div>
    </div>
  );
}
