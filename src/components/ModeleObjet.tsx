// L'APERÇU 3D DU VESTIAIRE — **UN SEUL** CANVAS POUR TOUTE LA SECTION
//
// ⚠️ CE N'EST PAS UN CHOIX ESTHÉTIQUE, C'EST UNE LIMITE DU NAVIGATEUR.
// Chaque `<Canvas>` ouvre un contexte WebGL, et un navigateur n'en accorde
// qu'une petite dizaine par page. La boutique en consomme déjà six (les cinq
// ballons et le grand aperçu). Une vignette 3D par article de vestiaire, ça en
// faisait vingt-deux : mesuré en jeu, le navigateur ferme alors les plus
// anciens — « THREE.WebGLRenderer: Context Lost » en boucle — et les vignettes
// deviennent des carrés vides. Monter le modèle seulement au survol ne suffit
// pas non plus : chaque entrée/sortie de souris crée et détruit un contexte,
// et le navigateur ne les rend pas assez vite.
//
// D'où ce montage : les articles affichent une PASTILLE (aucun canvas), et un
// aperçu unique — monté une fois, jamais démonté — montre le modèle de
// l'article survolé. Un contexte, quel que soit le nombre d'articles.
//
// ⚠️ ET IL DOIT SURVIVRE À UN MODÈLE QUI N'EXISTE PAS ENCORE. Les articles
// déclarent tous leur `.glb`, y compris ceux qui restent à modéliser : le jour
// où le fichier est déposé dans `public/m3d/`, il s'affiche sans toucher une
// ligne de code. En attendant, l'aperçu montre l'emoji de l'article.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Group } from 'three';
import { vignetteModele } from '../lib/vignettes3d';
import { modeAllege, modelePresent } from '../lib/modeles';

/**
 * L'ICÔNE D'UN ARTICLE : le vrai modèle 3D, mais en IMAGE.
 *
 * ⚠️ Demande explicite (« mets en icônes les modèles 3D dans la boutique »),
 * et la seule façon de la tenir : un `<Canvas>` par article épuiserait les
 * contextes WebGL de la page (voir l'en-tête de ce fichier et
 * `lib/vignettes3d.ts`). Le modèle est donc rendu **une fois**, hors écran, et
 * l'icône est un `<img>`. Tant que l'image n'est pas prête — ou si le modèle
 * n'a pas encore été fabriqué — on affiche la pastille emoji.
 */
export function IconeArticle({
  url, teinte, emoji, taille = 78,
}: { url: string; teinte?: string; emoji: string; taille?: number }) {
  const [image, setImage] = useState<string | null>(null);
  const allege = useMemo(modeAllege, []);

  useEffect(() => {
    if (allege) return;
    let vivant = true;
    void vignetteModele(url, teinte).then((src) => { if (vivant) setImage(src); });
    return () => { vivant = false; };
  }, [url, teinte, allege]);

  if (!image) return <PastilleEquipement emoji={emoji} teinte={teinte} taille={taille} />;
  return (
    <img
      className="icone-article"
      src={image}
      alt=""
      width={taille}
      height={taille}
      decoding="async"
    />
  );
}

/** La vignette d'un article : une pastille, sans le moindre contexte WebGL. */
export function PastilleEquipement({
  emoji, teinte, taille,
}: { emoji: string; teinte?: string; taille?: number }) {
  return (
    <div
      className="pastille-equipement"
      style={{
        background: `radial-gradient(circle at 32% 28%, ${teinte ?? '#3fae66'}, #10171200 72%)`,
        ...(taille ? { width: taille, height: taille } : {}),
      }}
      aria-hidden="true"
    >
      <span style={taille ? { fontSize: taille * 0.42 } : undefined}>{emoji}</span>
    </div>
  );
}

function Objet({ url, teinte }: { url: string; teinte?: string }) {
  const { scene } = useGLTF(url, '/draco/');
  const spin = useRef<Group>(null);

  const modele = useMemo(() => {
    const clone = scene.clone(true);
    const boite = new THREE.Box3().setFromObject(clone);
    const taille = new THREE.Vector3();
    const centre = new THREE.Vector3();
    boite.getSize(taille);
    boite.getCenter(centre);
    const max = Math.max(taille.x, taille.y, taille.z) || 1;
    const echelle = 3.2 / max;
    clone.scale.setScalar(echelle);
    clone.position.set(-centre.x * echelle, -centre.y * echelle, -centre.z * echelle);
    // ⚠️ ON REPASSE SUR LES MATÉRIAUX, MÊME SANS TEINTE, ET C'EST OBLIGATOIRE.
    // Les modèles livrés sortent d'un outil de génération : mesuré sur
    // `crampons.glb`, leur matériau arrive en `metalness: 1, roughness: 1`. Un
    // métal pur n'a pas de diffus — il ne rend QUE ce qu'il réfléchit, et sans
    // carte d'environnement il n'a rien à réfléchir : le modèle s'affichait
    // parfaitement NOIR sur un fond noir, donc invisible, alors qu'il était
    // chargé, cadré et éclairé. On ramène le métal à raison et on garantit un
    // minimum de rugosité pour que les lumières de la scène suffisent.
    const couleur = teinte ? new THREE.Color(teinte) : null;
    const retoucher = (m: THREE.Material): THREE.Material => {
      const copie = m.clone() as THREE.MeshStandardMaterial;
      if (copie.metalness != null) copie.metalness = Math.min(copie.metalness, 0.25);
      if (copie.roughness != null) copie.roughness = Math.max(copie.roughness, 0.45);
      // On TIRE la couleur d'origine vers la teinte plutôt que de l'écraser :
      // les coutures, les ombres peintes et les logos du modèle survivent.
      if (couleur && copie.color) copie.color = copie.color.clone().lerp(couleur, 0.8);
      return copie;
    };
    clone.traverse((noeud) => {
      const maillage = noeud as THREE.Mesh;
      if (!maillage.isMesh) return;
      // ⚠️ ON NE TRANSFORME PAS UN MATÉRIAU UNIQUE EN TABLEAU. C'était LE bug :
      // `material.map(...)` rendait toujours un tableau, et three.js ne dessine
      // un maillage à plusieurs matériaux qu'en suivant les `geometry.groups`.
      // Le modèle n'en a aucun → aucun appel de rendu → rien à l'écran, sans
      // le moindre message d'erreur.
      maillage.material = Array.isArray(maillage.material)
        ? maillage.material.map(retoucher)
        : retoucher(maillage.material);
    });
    return clone;
  }, [scene, teinte]);

  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * 0.55;
  });

  return (
    <group rotation={[0.2, 0, 0]}>
      <group ref={spin}>
        <primitive object={modele} />
      </group>
    </group>
  );
}

/**
 * L'aperçu 3D d'un article. Il occupe TOUT son conteneur — dans la boutique,
 * c'est le grand cadre d'aperçu, celui-là même qui montre les ballons : on ne
 * garde ainsi qu'un seul contexte WebGL pour le vestiaire entier.
 *
 * ⚠️ LE CANVAS RESTE MONTÉ quand on passe d'un article à l'autre, même vers un
 * modèle qui n'existe pas encore : c'est l'emoji qui s'affiche par-dessus. Le
 * démonter rouvrirait un contexte à chaque changement, et le navigateur ne les
 * rend pas assez vite.
 */
export function ApercuObjet({
  url, teinte, emoji,
}: { url: string; teinte?: string; emoji: string }) {
  const allege = useMemo(modeAllege, []);
  const [present, setPresent] = useState<boolean | null>(null);

  useEffect(() => {
    if (allege) return;
    let vivant = true;
    setPresent(null);
    void modelePresent(url).then((ok) => { if (vivant) setPresent(ok); });
    return () => { vivant = false; };
  }, [url, allege]);

  if (allege) {
    return (
      <div className="apercu-vestiaire-repli">
        <PastilleEquipement emoji={emoji} teinte={teinte} taille={140} />
      </div>
    );
  }

  return (
    <div className="apercu-vestiaire-scene">
      <Canvas
        camera={{ position: [0, 0.2, 6.2], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
      >
        <ambientLight intensity={1.1} />
        <hemisphereLight args={['#dfe8ff', '#1d3b28', 0.9]} />
        <directionalLight position={[3, 5, 4]} intensity={2} color="#fff2d0" />
        <directionalLight position={[-4, 1, -3]} intensity={0.8} color="#8fd6a8" />
        {present === true && (
          <Suspense fallback={null}>
            <Objet url={url} teinte={teinte} />
          </Suspense>
        )}
      </Canvas>
      {present !== true && (
        <div className="apercu-vestiaire-repli">
          <PastilleEquipement emoji={emoji} teinte={teinte} taille={140} />
        </div>
      )}
    </div>
  );
}
