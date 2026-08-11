// LES ICÔNES DE LA BOUTIQUE SONT DE VRAIES IMAGES DU MODÈLE 3D
//
// Demande : « mets en icônes les modèles 3D dans la boutique ».
//
// ⚠️ ON NE PEUT PAS METTRE UN `<Canvas>` PAR ARTICLE, et ce n'est pas une
// question de performance : un navigateur n'accorde qu'une **poignée de
// contextes WebGL** par page (mesuré en jeu : le septième est perdu à la
// seconde où il s'ouvre). La boutique en consomme déjà six pour les ballons et
// le grand aperçu ; seize articles de vestiaire en plus, et tout devient noir,
// ballons compris — « THREE.WebGLRenderer: Context Lost » en boucle.
//
// D'où ce module : **UN SEUL rendu hors écran**, réutilisé pour tous les
// articles, qui rend une image `data:` mise en cache. Les cartes de la boutique
// affichent alors de simples `<img>` — aucun contexte, aucune boucle
// d'animation, et l'icône reste le VRAI modèle.
//
// Le renderer est créé à la première demande et **libéré** dès qu'il n'y a plus
// rien à rendre : garder un contexte ouvert pour rien, c'est en voler un aux
// scènes qui, elles, sont animées (l'accueil, le grand aperçu, le match).

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Le même décodeur que celui utilisé par `useGLTF(url, true)` (drei) : les
// modèles du jeu sont tous compressés Draco.
const DECODEUR_DRACO = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

const TAILLE = 192; // px — assez pour une vignette nette en écran Retina

const cache = new Map<string, Promise<string | null>>();
const scenes = new Map<string, Promise<THREE.Group | null>>();

let chargeur: GLTFLoader | null = null;
let rendu: THREE.WebGLRenderer | null = null;
let enCours = 0;
let liberation: ReturnType<typeof setTimeout> | null = null;

function loader(): GLTFLoader {
  if (chargeur) return chargeur;
  const draco = new DRACOLoader();
  draco.setDecoderPath(DECODEUR_DRACO);
  chargeur = new GLTFLoader();
  chargeur.setDRACOLoader(draco);
  return chargeur;
}

function renderer(): THREE.WebGLRenderer | null {
  if (rendu) return rendu;
  if (typeof document === 'undefined') return null;
  try {
    rendu = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      // ⚠️ Obligatoire : sans ça, `toDataURL()` rend une image VIDE. Le
      // navigateur a le droit d'effacer le tampon de dessin dès qu'il l'a
      // composé, et c'est ce qu'il fait par défaut.
      preserveDrawingBuffer: true,
    });
  } catch {
    return null; // pas de WebGL : les cartes garderont leur pastille
  }
  rendu.setSize(TAILLE, TAILLE);
  rendu.setClearColor(0x000000, 0);
  return rendu;
}

/** Rendu le renderer au navigateur quand plus personne n'attend d'icône. */
function planifierLiberation(): void {
  if (liberation) clearTimeout(liberation);
  liberation = setTimeout(() => {
    liberation = null;
    if (enCours > 0 || !rendu) return;
    rendu.dispose();
    rendu.forceContextLoss();
    rendu = null;
  }, 1500);
}

async function chargerScene(url: string): Promise<THREE.Group | null> {
  const connue = scenes.get(url);
  if (connue) return connue;
  const promesse = new Promise<THREE.Group | null>((resoudre) => {
    loader().load(
      url,
      (gltf) => resoudre(gltf.scene),
      undefined,
      // Modèle absent (pas encore modélisé) ou illisible : la carte garde sa
      // pastille, et on ne réessaie pas.
      () => resoudre(null),
    );
  });
  scenes.set(url, promesse);
  return promesse;
}

/**
 * Une image `data:` du modèle, teintée, prête à poser dans un `<img>`.
 * Renvoie `null` quand le modèle n'existe pas encore ou que WebGL manque —
 * l'appelant retombe alors sur sa pastille emoji.
 */
export function vignetteModele(url: string, teinte?: string): Promise<string | null> {
  const cle = `${url}|${teinte ?? ''}`;
  const connue = cache.get(cle);
  if (connue) return connue;
  const promesse = fabriquer(url, teinte);
  cache.set(cle, promesse);
  return promesse;
}

async function fabriquer(url: string, teinte?: string): Promise<string | null> {
  enCours += 1;
  try {
    const source = await chargerScene(url);
    if (!source) return null;
    const moteur = renderer();
    if (!moteur) return null;

    const objet = preparer(source, teinte);
    const scene = new THREE.Scene();
    scene.add(objet);
    // Le même éclairage que le grand aperçu, pour que l'icône et l'aperçu ne
    // racontent pas deux objets différents.
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1d3b28, 0.9));
    const cle1 = new THREE.DirectionalLight(0xfff2d0, 2);
    cle1.position.set(3, 5, 4);
    const cle2 = new THREE.DirectionalLight(0x8fd6a8, 0.8);
    cle2.position.set(-4, 1, -3);
    scene.add(cle1, cle2);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(1.6, 0.9, 5.4);
    camera.lookAt(0, 0, 0);

    moteur.render(scene, camera);
    const image = moteur.domElement.toDataURL('image/png');

    // On ne garde rien : la scène est jetable, seule l'image survit.
    objet.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => mat.dispose());
    });
    return image;
  } catch {
    return null;
  } finally {
    enCours -= 1;
    planifierLiberation();
  }
}

/**
 * Recentre, normalise et teinte une copie du modèle.
 *
 * ⚠️ MÊMES DEUX PIÈGES QUE DANS `ModeleObjet` — et ils sont mortels tous les
 * deux : ne JAMAIS transformer un matériau unique en tableau (three.js ne
 * dessine alors qu'en suivant `geometry.groups`, que ces modèles n'ont pas →
 * rien à l'écran, sans erreur), et borner `metalness` (ces modèles arrivent en
 * métal pur, qui sans carte d'environnement rend parfaitement noir).
 */
function preparer(source: THREE.Group, teinte?: string): THREE.Group {
  const clone = source.clone(true);
  const boite = new THREE.Box3().setFromObject(clone);
  const taille = new THREE.Vector3();
  const centre = new THREE.Vector3();
  boite.getSize(taille);
  boite.getCenter(centre);
  const max = Math.max(taille.x, taille.y, taille.z) || 1;
  const echelle = 3.1 / max;
  clone.scale.setScalar(echelle);
  clone.position.set(-centre.x * echelle, -centre.y * echelle, -centre.z * echelle);
  clone.rotation.y = 0.5;

  const couleur = teinte ? new THREE.Color(teinte) : null;
  const retoucher = (m: THREE.Material): THREE.Material => {
    const copie = m.clone() as THREE.MeshStandardMaterial;
    if (copie.metalness != null) copie.metalness = Math.min(copie.metalness, 0.25);
    if (copie.roughness != null) copie.roughness = Math.max(copie.roughness, 0.45);
    if (couleur && copie.color) copie.color = copie.color.clone().lerp(couleur, 0.8);
    return copie;
  };
  clone.traverse((noeud) => {
    const maillage = noeud as THREE.Mesh;
    if (!maillage.isMesh) return;
    maillage.material = Array.isArray(maillage.material)
      ? maillage.material.map(retoucher)
      : retoucher(maillage.material);
  });
  return clone;
}
