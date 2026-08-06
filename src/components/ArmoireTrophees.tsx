// L'ARMOIRE À TROPHÉES — le palmarès d'une carrière, en 3D
//
// Demande explicite : « une armoire à trophée en 3D pour que dans le hall des
// légendes on puisse accéder à l'armoire avec tous les trophées dedans, ou
// autour s'ils sont trop grands ».
//
// ⚠️ LES ÉTAGÈRES SONT LUES SUR LE MODÈLE. La première version découpait la
// boîte englobante du meuble en une grille de 4 × 4 : le `.glb` fourni a SIX
// tablettes, à des hauteurs irrégulières, donc une rangée sur deux flottait
// entre deux étagères. `detecterEtageres()` (lib/armoire.ts) cherche maintenant
// les faces horizontales de la géométrie et en déduit les vraies tablettes ET
// la hauteur libre au-dessus de chacune. Si un jour l'armoire est remplacée par
// un autre `.glb`, la vitrine suit — rien à re-mesurer à la main.
//
// ⚠️ LES DISTINCTIONS EN VITRINE, LES TITRES AU SOL (demande explicite : « les
// trophées individuels dans l'armoire et les trophées collectifs à côté, plus
// gros »). Les tablettes du meuble sont hautes de ~13 cm à l'échelle réelle :
// tout ce qu'on y pose est petit — parfait pour un trophée de meilleur joueur.
// Les titres d'équipe, eux, se dressent au sol à hauteur de buste de rugbyman,
// et les boucliers s'appuient sur le coin avant du meuble.
//
// ⚠️ TOUS LES MODÈLES SONT CHARGÉS PAR LA SCÈNE, pas par chaque trophée. C'est
// ce qui permet de disposer l'ensemble d'un seul coup : un composant par
// trophée ne connaît que sa propre taille, et ne peut donc pas savoir combien
// de tablettes sont déjà prises — la vitrine se retrouvait trouée.
//
// ⚠️ `createPortal(document.body)` obligatoire, comme toutes les modales du jeu :
// le `backdrop-filter` des `.carte` crée un bloc conteneur qui piège les
// `position: fixed`.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, ContactShadows, OrbitControls, Sparkles } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import type { Group, Object3D } from 'three';
import { TROPHEES, estIndividuel, type Trophee } from '../data/trophees';
import type { TitreGagne } from '../types';
import { t } from '../lib/i18n';
import {
  cadrage, disposerArmoire, detecterEtageres, estBouclier, MAX_PIECES,
  type Boite, type DimensionsArmoire, type Geometrie, type Modele, type Place, type TailleModele,
} from '../lib/armoire';

const MODELE_ARMOIRE = '/m3d/armoire.glb';
// Le meuble est ramené à cette hauteur : toute la scène (caméra, sol, tablettes)
// est réglée dessus.
const HAUTEUR_ARMOIRE = 4;
// Au-delà, on n'affiche plus : chaque trophée est un `.glb` de ~1,4 Mo, et
// trente modèles chargés d'un coup mettraient une machine modeste à genoux.
// ⚠️ Ce qui est écarté est DIT au joueur (voir le pied de la modale), jamais
// escamoté en silence.
const MAX_MODELES = MAX_PIECES;

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

/**
 * Les sommets du meuble, exprimés dans le repère de la scène (posé en y = 0,
 * centré en x/z) : c'est ce que `detecterEtageres()` attend. On applique la
 * matrice monde de chaque maillage — le `.glb` peut très bien porter sa propre
 * hiérarchie de nœuds.
 */
function geometriesMonde(meuble: Object3D): Geometrie[] {
  const geos: Geometrie[] = [];
  const v = new THREE.Vector3();
  meuble.updateWorldMatrix(true, true);
  meuble.traverse((o) => {
    const maillage = o as THREE.Mesh;
    if (!maillage.isMesh) return;
    const attribut = maillage.geometry.getAttribute('position');
    if (!attribut) return;
    const positions = new Float32Array(attribut.count * 3);
    for (let i = 0; i < attribut.count; i++) {
      v.fromBufferAttribute(attribut as THREE.BufferAttribute, i).applyMatrix4(maillage.matrixWorld);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }
    geos.push({ positions, index: maillage.geometry.index?.array ?? null });
  });
  return geos;
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
    // ⚠️ L'INCLINAISON EST SUR LE GROUPE EXTÉRIEUR, la rotation de survol sur
    // l'intérieur : sinon un bouclier adossé se redresserait au passage de la
    // souris.
    <group position={place.position} rotation={place.rotation}>
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

  const { meuble, dims, objets, places, etageres, boites } = useMemo(() => {
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
    const etageres = detecterEtageres(geometriesMonde(meuble), dims);

    // Les trophées : on mesure d'abord TOUT, puis on dispose l'ensemble.
    const objets = gltfs.map((g) => g.scene.clone(true));
    const englobantes = objets.map((o) => new THREE.Box3().setFromObject(o));
    const tailles: TailleModele[] = englobantes.map((b) => {
      const v = new THREE.Vector3();
      b.getSize(v);
      return { x: v.x, y: v.y, z: v.z };
    });
    const modeles: Modele[] = tailles.map((t, i) => ({
      taille: t,
      individuel: estIndividuel(pieces[i].trophee),
      bouclier: pieces[i].trophee.forme === 'bouclier' || estBouclier(t),
    }));
    const places = disposerArmoire(modeles, dims, etageres);

    objets.forEach((o, i) => {
      const c = new THREE.Vector3();
      englobantes[i].getCenter(c);
      const e = places[i].echelle;
      o.scale.setScalar(e);
      // Recentré en x/z, mais POSÉ sur sa base en y : un trophée doit toucher
      // l'étagère, pas flotter au-dessus.
      o.position.set(-c.x * e, -englobantes[i].min.y * e, -c.z * e);
    });

    // Ce qu'il faut cadrer : le meuble ET tout ce qui l'entoure.
    const boites: Boite[] = places.map((p, i) => ({
      x: p.position[0],
      y: p.position[1],
      z: p.position[2] + (tailles[i].z * p.echelle) / 2,
      demiLargeur: (tailles[i].x * p.echelle) / 2,
      hauteur: tailles[i].y * p.echelle,
    }));

    return { meuble, dims, objets, places, etageres, boites };
  }, [armoireGltf, gltfs, pieces]);

  // ⚠️ LE CADRAGE EST CALCULÉ, PAS CONSTANT — voir `cadrage()` (lib/armoire.ts).
  const taillePlan = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { distance, centreY } = useMemo(
    () => cadrage(boites, dims, camera.fov, taillePlan.width / Math.max(1, taillePlan.height)),
    [boites, dims, camera, taillePlan],
  );

  useEffect(() => {
    camera.position.set(0, centreY + dims.hauteur * 0.1, distance);
    camera.updateProjectionMatrix();
  }, [camera, distance, centreY, dims]);

  const demiLargeurScene = boites.reduce(
    (a, b) => Math.max(a, Math.abs(b.x) + b.demiLargeur),
    dims.largeur / 2,
  );

  const basEtagere = etageres[etageres.length - 1];

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 7, 6]} intensity={2.4} color="#fff4d6" />
      <directionalLight position={[-5, 3, -4]} intensity={1.1} color="#8ad6a8" />
      {/* La lumière chaude de la vitrine, à l'intérieur du meuble. */}
      <pointLight position={[0, dims.hauteur * 0.6, dims.profondeur * 0.5]} intensity={3.2} distance={9} color="#ffdf9e" />
      {/* Et une lumière rasante pour les pièces posées au sol, que la vitrine
          n'éclaire pas. */}
      <pointLight position={[0, (basEtagere?.y ?? 0) * 0.5, dims.profondeur * 2.4]} intensity={2.2} distance={12} color="#ffe9c4" />

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
          position={[0, 0.01, 0]} opacity={0.45} scale={demiLargeurScene * 3}
          blur={2.6} far={5} color="#04120a" frames={1}
        />
      </group>

      {!allege && (
        <Sparkles count={26} scale={[demiLargeurScene * 2, dims.hauteur, 3]} size={3} speed={0.32} color="#e8b23a" opacity={0.55} />
      )}
      {/* ⚠️ Zoom borné et pas de translation : sans ça on se retrouve à
          l'intérieur du meuble ou à cent mètres, sans moyen de revenir. */}
      <OrbitControls
        enablePan={false}
        target={[0, centreY, 0]}
        minDistance={distance * 0.5}
        maxDistance={distance * 1.6}
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
  const pieces = useMemo(() => toutes.slice(0, MAX_MODELES), [toutes]);
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
                camera={{ position: [0, 0.8, 8.4], fov: 42 }}
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
