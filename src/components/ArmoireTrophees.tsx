// L'ARMOIRE À TROPHÉES — le palmarès d'une carrière, en 3D
//
// Demande explicite : « une armoire à trophée en 3D pour que dans le hall des
// légendes on puisse accéder à l'armoire avec tous les trophées dedans, ou
// autour s'ils sont trop grands ».
//
// ⚠️ LE PLACEMENT EST CALCULÉ, PAS CODÉ EN DUR. On ne connaît pas la position
// des étagères du modèle : on part de sa BOÎTE ENGLOBANTE, une fois le meuble
// normalisé, et on y découpe une grille de casiers. Si un jour l'armoire est
// remplacée par un autre `.glb`, la grille suit — rien à re-mesurer à la main.
// La règle elle-même vit dans `lib/armoire.ts`, en fonction pure : c'est la
// seule façon de la vérifier sans GPU (`scripts/verifArmoire.ts`).
//
// ⚠️ TOUS LES MODÈLES SONT CHARGÉS PAR LA SCÈNE, pas par chaque trophée. C'est
// ce qui permet de disposer l'ensemble d'un seul coup : un composant par
// trophée ne connaît que sa propre taille, et ne peut donc pas savoir combien
// de casiers sont déjà pris — la vitrine se retrouvait trouée.
//
// ⚠️ `createPortal(document.body)` obligatoire, comme toutes les modales du jeu :
// le `backdrop-filter` des `.carte` crée un bloc conteneur qui piège les
// `position: fixed`.

import { Suspense, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, ContactShadows, OrbitControls, Sparkles } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import type { Group, Object3D } from 'three';
import { TROPHEES, type Trophee } from '../data/trophees';
import type { TitreGagne } from '../types';
import { t } from '../lib/i18n';
import { disposerArmoire, CASIERS, type DimensionsArmoire, type Place } from '../lib/armoire';

const MODELE_ARMOIRE = '/m3d/armoire.glb';
// Le meuble est ramené à cette hauteur : toute la scène (caméra, sol, casiers)
// est réglée dessus.
const HAUTEUR_ARMOIRE = 4;
// Au-delà, on n'affiche plus : chaque trophée est un `.glb` de ~1,4 Mo, et
// trente modèles chargés d'un coup mettraient une machine modeste à genoux.
// ⚠️ Ce qui est écarté est DIT au joueur (voir le pied de la modale), jamais
// escamoté en silence.
const MAX_MODELES = CASIERS;

// Machine modeste ou « prefers-reduced-motion » : on coupe les particules,
// exactement comme dans la cérémonie de trophée.
function modeAllege(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return (navigator.hardwareConcurrency ?? 8) <= 4;
}

// Un trophée distinct, avec le nombre de fois où il a été gagné.
interface Piece {
  trophee: Trophee;
  fois: number;
  saisons: number[];
}

function regrouper(palmares: TitreGagne[]): Piece[] {
  const parId = new Map<string, Piece>();
  for (const titre of palmares) {
    const trophee = TROPHEES[titre.trophee];
    if (!trophee) continue;
    const vu = parId.get(trophee.id);
    if (vu) {
      vu.fois += 1;
      vu.saisons.push(titre.saison);
    } else {
      parId.set(trophee.id, { trophee, fois: 1, saisons: [titre.saison] });
    }
  }
  // Les plus gagnés d'abord, puis les plus prestigieux (les Ovas sont notre
  // seule mesure de prestige, et elle est calibrée pour ça).
  return [...parId.values()].sort((a, b) => b.fois - a.fois || b.trophee.ovas - a.trophee.ovas);
}

// --- UN TROPHÉE POSÉ ---------------------------------------------------------
// Il ne décide de rien : la scène lui donne son objet déjà mis à l'échelle et sa
// place. Il ne gère que le survol et la rotation.
function TropheePose({
  objet, place, couleur, surbrillance, onSurvol, onClic,
}: {
  objet: Object3D;
  place: Place;
  couleur: string;
  surbrillance: boolean;
  onSurvol: (dedans: boolean) => void;
  onClic: () => void;
}) {
  const pivot = useRef<Group>(null);

  // Le trophée survolé tourne sur lui-même : c'est ce qui rend l'armoire
  // vivante sans animer les quinze autres en permanence.
  useFrame((_, delta) => {
    if (pivot.current && surbrillance) pivot.current.rotation.y += delta * 1.1;
  });

  return (
    <group position={place.position}>
      <group
        ref={pivot}
        onPointerOver={(e) => { e.stopPropagation(); onSurvol(true); }}
        onPointerOut={() => onSurvol(false)}
        onClick={(e) => { e.stopPropagation(); onClic(); }}
      >
        <primitive object={objet} />
      </group>
      {surbrillance && (
        <pointLight position={[0, 0.5, 0.6]} intensity={2.4} distance={2.5} color={couleur} />
      )}
    </group>
  );
}

// --- LA SCÈNE ----------------------------------------------------------------
function Scene({
  pieces, allege, actif, setActif,
}: {
  pieces: Piece[];
  allege: boolean;
  actif: number | null;
  setActif: (i: number | null) => void;
}) {
  // Le meuble ET tous les trophées, en une seule suspension.
  const armoireGltf = useGLTF(MODELE_ARMOIRE, true);
  const urls = pieces.map((p) => p.trophee.modele);
  const gltfs = useGLTF(urls, true) as { scene: THREE.Group }[];

  const { meuble, dims, objets, places } = useMemo(() => {
    // Le meuble : recentré horizontalement, POSÉ SUR LE SOL (y = 0). On veut
    // pouvoir aligner les trophées du sol sur la même base, pas sur son centre.
    const meuble = armoireGltf.scene.clone(true);
    const boite = new THREE.Box3().setFromObject(meuble);
    const taille = new THREE.Vector3();
    const centre = new THREE.Vector3();
    boite.getSize(taille);
    boite.getCenter(centre);
    const echelle = HAUTEUR_ARMOIRE / (taille.y || 1);
    meuble.scale.setScalar(echelle);
    meuble.position.set(-centre.x * echelle, -boite.min.y * echelle, -centre.z * echelle);
    const dims: DimensionsArmoire = {
      largeur: taille.x * echelle,
      profondeur: taille.z * echelle,
      hauteur: HAUTEUR_ARMOIRE,
    };

    // Les trophées : on mesure d'abord TOUT, puis on dispose l'ensemble.
    const objets = gltfs.map((g) => g.scene.clone(true));
    const boites = objets.map((o) => new THREE.Box3().setFromObject(o));
    const tailles = boites.map((b) => {
      const v = new THREE.Vector3();
      b.getSize(v);
      return { x: v.x, y: v.y, z: v.z };
    });
    const places = disposerArmoire(tailles, dims);

    objets.forEach((o, i) => {
      const c = new THREE.Vector3();
      boites[i].getCenter(c);
      const e = places[i].echelle;
      o.scale.setScalar(e);
      // Recentré en x/z, mais POSÉ sur sa base en y : un trophée doit toucher
      // l'étagère, pas flotter au-dessus.
      o.position.set(-c.x * e, -boites[i].min.y * e, -c.z * e);
    });

    return { meuble, dims, objets, places };
  }, [armoireGltf, gltfs]);

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 7, 6]} intensity={2.4} color="#fff4d6" />
      <directionalLight position={[-5, 3, -4]} intensity={1.1} color="#8ad6a8" />
      {/* La lumière chaude de la vitrine, à l'intérieur du meuble. */}
      <pointLight position={[0, dims.hauteur * 0.6, dims.profondeur * 0.5]} intensity={3.2} distance={9} color="#ffdf9e" />

      <group position={[0, -dims.hauteur / 2, 0]}>
        <primitive object={meuble} />
        {pieces.map((p, i) => (
          <TropheePose
            key={p.trophee.id}
            objet={objets[i]}
            place={places[i]}
            couleur={p.trophee.couleur}
            surbrillance={actif === i}
            onSurvol={(dedans) => setActif(dedans ? i : null)}
            onClic={() => setActif(i)}
          />
        ))}
        <ContactShadows
          position={[0, 0.01, 0]} opacity={0.45} scale={dims.largeur * 4}
          blur={2.6} far={5} color="#04120a" frames={1}
        />
      </group>

      {!allege && (
        <Sparkles count={26} scale={[dims.largeur * 2, dims.hauteur, 3]} size={3} speed={0.32} color="#e8b23a" opacity={0.55} />
      )}
      {/* ⚠️ Zoom borné et pas de translation : sans ça on se retrouve à
          l'intérieur du meuble ou à cent mètres, sans moyen de revenir. */}
      <OrbitControls
        enablePan={false}
        minDistance={4.5}
        maxDistance={12}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.52}
        autoRotate={actif === null}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

interface Props {
  /** Palmarès structuré. Pour une légende du Panthéon, reconstruit depuis ses libellés. */
  palmares: TitreGagne[];
  /** Nom du joueur dont c'est l'armoire. */
  nom: string;
  onFermer: () => void;
}

export function ArmoireTrophees({ palmares, nom, onFermer }: Props) {
  const allege = useMemo(modeAllege, []);
  const [actif, setActif] = useState<number | null>(null);
  const toutes = useMemo(() => regrouper(palmares), [palmares]);
  const pieces = toutes.slice(0, MAX_MODELES);
  const restantes = toutes.slice(MAX_MODELES);
  const total = palmares.length;
  const enAvant = actif !== null ? pieces[actif] : null;

  return createPortal(
    <div className="overlay overlay-armoire" onClick={onFermer}>
      <motion.div
        className="carte modale-armoire"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 210, damping: 24 }}
      >
        <header className="armoire-tete">
          <div>
            <div className="eyebrow">{t('arm.eyebrow')}</div>
            <h2>{nom}</h2>
          </div>
          <button className="armoire-fermer" onClick={onFermer} aria-label={t('reg.fermer')}>✕</button>
        </header>

        <div className="armoire-canvas">
          {pieces.length === 0 ? (
            <div className="armoire-vide">
              <div style={{ fontSize: '2.6rem' }}>🗄️</div>
              <p>{t('arm.vide')}</p>
            </div>
          ) : (
            <>
              <div className="trophee-chargement"><span /><span /><span /></div>
              <Canvas
                camera={{ position: [0, 0.8, 7.4], fov: 42 }}
                dpr={[1, 1.5]}
                gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
              >
                <Suspense fallback={null}>
                  <Scene pieces={pieces} allege={allege} actif={actif} setActif={setActif} />
                </Suspense>
              </Canvas>
            </>
          )}
        </div>

        {/* La fiche du trophée survolé. Un emplacement FIXE, réservé en
            permanence : sinon la modale saute de vingt pixels à chaque survol. */}
        <div className="armoire-fiche" style={{ ['--aura' as string]: enAvant?.trophee.couleur ?? 'var(--or)' }}>
          {enAvant ? (
            <>
              <b>{enAvant.trophee.nom}{enAvant.fois > 1 ? ` ×${enAvant.fois}` : ''}</b>
              <span>{enAvant.trophee.desc}</span>
              <em>{t('arm.saisons')} {[...enAvant.saisons].sort((a, b) => a - b).join(' · ')}</em>
            </>
          ) : (
            <span className="armoire-aide">{pieces.length > 0 ? t('arm.aide') : ''}</span>
          )}
        </div>

        <footer className="armoire-pied">
          <span>{t('arm.total', { n: total, distincts: toutes.length })}</span>
          {/* ⚠️ Aucun escamotage silencieux : ce qui n'est pas modélisé à
              l'écran est listé ici, noir sur blanc. */}
          {restantes.length > 0 && (
            <span className="armoire-reste">
              {t('arm.reste')} {restantes.map((p) => p.trophee.nom).join(', ')}
            </span>
          )}
        </footer>
      </motion.div>
    </div>,
    document.body,
  );
}

// Le meuble est le même pour tout le monde : on le précharge dès que le module
// est chargé, pour que l'ouverture de la modale ne montre pas un trou.
useGLTF.preload(MODELE_ARMOIRE);
