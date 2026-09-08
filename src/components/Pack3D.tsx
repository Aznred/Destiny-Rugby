import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Group, Vector3 } from 'three';
import type { RareteCarriere } from '../lib/ligue/typesCarriere';
import { modelePack, PALIERS_PACK } from '../lib/presentationPacks';

class Repli3D extends Component<{ children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false };
  static getDerivedStateFromError() { return { erreur: true }; }
  render() { return this.state.erreur ? null : this.props.children; }
}

function Modele({ url, calme, transition }: { url: string; calme: boolean; transition: string }) {
  const { scene } = useGLTF(url);
  const gl = useThree(state => state.gl);
  useEffect(() => {
    gl.domElement.dataset.ready = 'true';
    return () => { delete gl.domElement.dataset.ready; };
  }, [gl, scene]);
  const ref = useRef<Group>(null);
  const debut = useRef(0);
  useEffect(() => { debut.current = performance.now(); }, [transition]);
  const clone = useMemo(() => {
    const objet = scene.clone(true);
    const box = new Box3().setFromObject(objet, true);
    const taille = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());
    const scale = 3.25 / Math.max(taille.x, taille.y, taille.z);
    const centreur = new Group();
    centreur.add(objet);
    centreur.scale.setScalar(scale);
    centreur.position.copy(centre.multiplyScalar(-scale));
    return centreur;
  }, [scene]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const groupe = ref.current;
    groupe.scale.setScalar(1);
    groupe.rotation.set(0, 0, 0);
    groupe.position.set(0, 0, 0);
    if (calme) return;
    const temps = performance.now() - debut.current;
    if (transition === 'charge') {
      const t = Math.min(1, temps / 440);
      groupe.rotation.y = t * t * Math.PI / 2;
      groupe.rotation.z = Math.sin(t * Math.PI * 5) * .04;
      groupe.scale.setScalar(1 - .2 * t * t);
    } else if (transition === 'evolution') {
      const t = Math.min(1, temps / 660);
      const arrivee = 1 - (1 - t) ** 3;
      groupe.rotation.y = -(1 - arrivee) * Math.PI / 2;
      groupe.scale.setScalar(.8 + .2 * arrivee + Math.sin(t * Math.PI) * .09);
    } else if (transition === 'ouverture') {
      const t = Math.min(1, temps / 1600);
      const compression = Math.max(0, 1 - Math.abs(t - .2) / .2);
      groupe.rotation.x = -.12 * Math.sin(t * Math.PI);
      groupe.rotation.y = Math.sin(t * Math.PI) * .2;
      groupe.position.y = (1 - (1 - t) ** 3) * .35;
      groupe.scale.setScalar(1 - .07 * compression + .12 * Math.sin(t * Math.PI) - .15 * t * t);
    } else {
      groupe.rotation.y = Math.sin(clock.elapsedTime * .8) * .16;
      groupe.rotation.z = Math.sin(clock.elapsedTime * .6) * .015;
    }
  });
  return <group ref={ref}><primitive object={clone} /></group>;
}

// ⚠️ Le préchargement des pochettes NE VIT PAS ICI : il partirait avec le
// module 3D qu'il est justement censé devancer. Voir `lib/prechargementPacks.ts`.
export default function Pack3D({ rarete, ouvert, calme, transition }: { rarete: RareteCarriere; ouvert: boolean; calme: boolean; transition: string }) {
  const [deplie, setDeplie] = useState(false);
  useEffect(() => {
    if (!ouvert) { setDeplie(false); return; }
    const timer = window.setTimeout(() => setDeplie(true), calme ? 0 : 360);
    return () => clearTimeout(timer);
  }, [ouvert, calme]);
  useEffect(() => {
    useGLTF.preload(modelePack(rarete, true));
    const suivante = PALIERS_PACK[PALIERS_PACK.indexOf(rarete) + 1];
    if (suivante) useGLTF.preload(modelePack(suivante));
  }, [rarete]);
  return <Repli3D><Canvas camera={{ position: [0, 0, 5.5], fov: 43 }} dpr={[1, 1.5]} frameloop={calme ? 'demand' : 'always'} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={1.8} />
    <directionalLight position={[3, 4, 5]} intensity={3.5} />
    <directionalLight position={[-3, 1, 2]} intensity={2} color="#b7dfff" />
    <Suspense fallback={null}><Modele url={modelePack(rarete, ouvert && deplie)} calme={calme} transition={transition} /></Suspense>
  </Canvas></Repli3D>;
}
