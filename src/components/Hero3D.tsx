import { Canvas } from '@react-three/fiber';
import { Sparkles, ContactShadows, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { BallonRugby } from './BallonRugby';
import { ModeleBallon } from './ModeleBallon';
import { Rugbyman3D } from './Rugbyman3D';
import { useTenue } from '../lib/tenue';
import { modelePresent } from '../lib/modeles';
import { SKIN_PAR_ID } from '../data/boutique';

/** Le niveau du sol de la scène du hero — les pieds du rugbyman s'y posent. */
const SOL = -3.6;

// Scène 3D du hero : TON joueur, ballon sous le bras, sac de plaquage au pied.
//
// ⚠️ Demande explicite : « je veux un rugbyman 3D à l'accueil qui tient le
// ballon et sur lequel on peut customiser casque, ballon, chaussettes, maillot,
// chaussures ». Il ne reste un ballon seul que **tant qu'aucune carrière n'est
// commencée** : habiller un joueur qui n'existe pas encore n'aurait aucun sens,
// et l'accueil doit rester séduisant pour un visiteur qui découvre le jeu.
//
// ⚠️ PLUS DE POTEAUX EN TOILE DE FOND (demande explicite : « enlève les poteaux
// derrière le joueur »). `ModeleStade` / `poteaux.glb` et son repli en géométrie
// ont été retirés : le joueur se détache maintenant sur le fond du site, et la
// page d'accueil ne télécharge plus ce modèle au chargement. À la place, un
// **décor au sol** — le sac de plaquage des séances du mardi — pose la scène
// sans jamais repasser devant le joueur.
export function Hero3D({ skinId = 'classique' }: { skinId?: string }) {
  const skin = SKIN_PAR_ID[skinId] ?? SKIN_PAR_ID.classique;
  const tenue = useTenue();
  const avecJoueur = Boolean(tenue.nom);

  return (
    // ⚠️ LE JOUEUR TIENT EN ENTIER DANS LE CADRE, PIEDS COMPRIS — c'est une
    // demande explicite, et c'était encore faux : ses chaussures étaient
    // tranchées net par le bas du canvas. Le personnage mesure 6 unités, ses
    // crampons descendent plus bas encore, et il était calé trop bas pour le
    // champ de vision. La caméra recule (11 au lieu de 9,4) et le joueur remonte
    // (+0,35 au lieu de −0,2) pour se recentrer : rien n'est touché sur LUI, on
    // ne fait que recadrer la prise de vue.
    <Canvas
      camera={{ position: [0, 0, avecJoueur ? 11 : 8.2], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        {/* Éclairage stade */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 5]} intensity={1.6} color="#fff2d0" castShadow />
        <directionalLight position={[-5, 2, -3]} intensity={0.6} color="#3fae66" />
        <pointLight position={[0, -3, 2]} intensity={0.7} color="#e8b23a" />

        {avecJoueur ? (
          <>
            <group position={[0, 0.35, 0.6]}>
              <Rugbyman3D tenue={tenue} />
            </group>
            {/* ⚠️ DÉCOR, PAS COSMÉTIQUE : ce sac-là n'est pas celui qu'on achète
                au vestiaire, il est posé au sol pour tout le monde. Il est calé
                DERRIÈRE le plan du joueur (z négatif) et sur sa gauche pour ne
                jamais lui passer devant. */}
            <DecorSol url="/m3d/bouclier-plaquage.glb" hauteur={3.2} position={[-2.4, 0, -1.2]} rotationY={0.5} />
          </>
        ) : (
          // ⚠️ PAS DE `<Float>` NON PLUS (« aucun asset ne tourne dans le
          // menu ») : le ballon d'accueil se contente d'une belle pose.
          <group rotation={[0.1, -0.3, 0]}>
            {skin.glb
              ? <ModeleBallon url={skin.glb} tourne={false} />
              : <BallonRugby skinId={skinId} tourne={false} />}
          </group>
        )}

        <Sparkles count={40} scale={[9, 5, 4]} size={3} speed={0.4} color="#f4cd63" opacity={0.5} />

        {/* L'ombre se pose SOUS les chaussures, pas au milieu des tibias : sans
            poteaux derrière lui, c'est elle seule qui pose le joueur au sol. */}
        <ContactShadows position={[0, avecJoueur ? SOL : -1.8, 0]} opacity={0.35} scale={9} blur={2.6} far={4} color="#04120a" />
      </Suspense>
    </Canvas>
  );
}

/**
 * L'APERÇU DE LA BOUTIQUE — UN BALLON, ET RIEN QUE LE BALLON.
 *
 * ⚠️ Le grand cadre de la boutique appelait `Hero3D` : depuis que celui-ci
 * affiche le rugbyman dès qu'une carrière existe, la section « Ballons »
 * montrait le JOUEUR au lieu du ballon qu'on venait de survoler. On regardait
 * donc toujours le même personnage en cliquant sur cinq articles différents.
 * D'où ce composant dédié : même chunk paresseux, même éclairage que les
 * vignettes, mais on ne monte jamais le personnage ni ses accessoires.
 */
export function ApercuBallon({ skinId = 'classique' }: { skinId?: string }) {
  const skin = SKIN_PAR_ID[skinId] ?? SKIN_PAR_ID.classique;
  return (
    <Canvas
      camera={{ position: [0, 0.2, 6.4], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 4]} intensity={1.7} color="#fff2d0" />
        <directionalLight position={[-4, 1, -3]} intensity={0.5} color="#3fae66" />
        {/* ⚠️ ICI IL TOURNE, et c'est voulu : « aucun asset ne tourne dans le
            menu ou le profil » ne vaut pas pour la boutique, où l'on inspecte
            justement l'article sous toutes ses faces (voir `ModeleBallon`). */}
        {skin.glb
          ? <ModeleBallon url={skin.glb} />
          : <BallonRugby skinId={skin.id} />}
      </Suspense>
    </Canvas>
  );
}

/**
 * Un objet de décor POSÉ AU SOL. `hauteur` est sa taille finale dans la scène,
 * `position` le point d'appui — le modèle est recentré puis remonté de sa
 * demi-hauteur réelle, donc il repose sur `SOL` quelles que soient les
 * proportions du fichier livré.
 *
 * ⚠️ On vérifie que le `.glb` existe AVANT de le charger : un modèle absent
 * ferait lever `useGLTF` hors du canvas, et `Garde` remplacerait tout l'accueil
 * par un message d'erreur (déjà vu en jeu avec un cosmétique non modélisé).
 */
function DecorSol({
  url, hauteur, position, rotationY = 0,
}: { url: string; hauteur: number; position: [number, number, number]; rotationY?: number }) {
  const [present, setPresent] = useState(false);
  useEffect(() => {
    let vivant = true;
    void modelePresent(url).then((ok) => { if (vivant) setPresent(ok); });
    return () => { vivant = false; };
  }, [url]);
  if (!present) return null;
  return (
    <Suspense fallback={null}>
      <DecorCharge url={url} hauteur={hauteur} position={position} rotationY={rotationY} />
    </Suspense>
  );
}

function DecorCharge({
  url, hauteur, position, rotationY,
}: { url: string; hauteur: number; position: [number, number, number]; rotationY: number }) {
  const { scene } = useGLTF(url, true);

  const { objet, demiHauteur } = useMemo(() => {
    const clone = scene.clone(true);
    const boite = new THREE.Box3().setFromObject(clone);
    const taille = new THREE.Vector3();
    const centre = new THREE.Vector3();
    boite.getSize(taille);
    boite.getCenter(centre);
    const max = Math.max(taille.x, taille.y, taille.z) || 1;
    const echelle = hauteur / max;
    clone.scale.setScalar(echelle);
    clone.position.set(-centre.x * echelle, -centre.y * echelle, -centre.z * echelle);
    // ⚠️ Métal pur = rendu noir sans carte d'environnement (même piège que
    // `Rugbyman3D` et `ModeleObjet`), et on ne remplace JAMAIS un matériau
    // unique par un tableau : three.js ne dessinerait plus rien.
    clone.traverse((noeud) => {
      const maillage = noeud as THREE.Mesh;
      if (!maillage.isMesh) return;
      const retoucher = (m: THREE.Material): THREE.Material => {
        const copie = m.clone() as THREE.MeshStandardMaterial;
        if (copie.metalness != null) copie.metalness = Math.min(copie.metalness, 0.25);
        if (copie.roughness != null) copie.roughness = Math.max(copie.roughness, 0.45);
        return copie;
      };
      maillage.material = Array.isArray(maillage.material)
        ? maillage.material.map(retoucher)
        : retoucher(maillage.material);
    });
    return { objet: clone, demiHauteur: (taille.y * echelle) / 2 };
  }, [scene, hauteur]);

  return (
    <primitive
      object={objet}
      position={[position[0], SOL + demiHauteur + position[1], position[2]]}
      rotation={[0, rotationY, 0]}
    />
  );
}
