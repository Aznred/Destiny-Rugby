// FABRIQUE LES VISUELS DU TRAILER — jetable, à supprimer après usage.
//
// Rend les vrais modèles 3D du jeu (le Bouclier de Brennus, le ballon, le
// rugbyman) sur fond TRANSPARENT, en 1080 px, et poste les PNG au petit serveur
// de capture. ffmpeg assemble ensuite la vidéo à partir de ces images : le
// trailer montre donc les VRAIS objets du jeu, pas des dessins qui leur
// ressemblent.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const DECODEUR = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
const ENVOI = 'http://localhost:7788/';

const etat = document.getElementById('etat')!;
const dire = (m: string) => { etat.textContent += `\n${m}`; };

const draco = new DRACOLoader();
draco.setDecoderPath(DECODEUR);
const chargeur = new GLTFLoader();
chargeur.setDRACOLoader(draco);

function charger(url: string): Promise<THREE.Group> {
  return new Promise((ok, ko) => chargeur.load(url, (g) => ok(g.scene), undefined, ko));
}

/** Métal pur = rendu noir sans carte d'environnement : même garde-fou qu'en jeu. */
function assainir(o: THREE.Object3D): void {
  o.traverse((n) => {
    const m = n as THREE.Mesh;
    if (!m.isMesh) return;
    const retoucher = (mat: THREE.Material) => {
      const c = mat.clone() as THREE.MeshStandardMaterial;
      if (c.metalness != null) c.metalness = Math.min(c.metalness, 0.55);
      if (c.roughness != null) c.roughness = Math.max(c.roughness, 0.25);
      return c;
    };
    m.material = Array.isArray(m.material) ? m.material.map(retoucher) : retoucher(m.material);
  });
}

async function rendre(
  nom: string, url: string, taille: number, rotY: number, rotX: number, or = 1,
): Promise<void> {
  const source = await charger(url);
  const objet = source.clone(true);
  assainir(objet);

  const boite = new THREE.Box3().setFromObject(objet);
  const dim = new THREE.Vector3();
  const centre = new THREE.Vector3();
  boite.getSize(dim);
  boite.getCenter(centre);
  const max = Math.max(dim.x, dim.y, dim.z) || 1;
  const k = 4 / max;
  objet.scale.setScalar(k);
  objet.position.set(-centre.x * k, -centre.y * k, -centre.z * k);
  objet.rotation.set(rotX, rotY, 0);

  const scene = new THREE.Scene();
  scene.add(objet);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  scene.add(new THREE.HemisphereLight(0xfff0cf, 0x0b2416, 1.1));
  const cle = new THREE.DirectionalLight(0xfff2d0, 3.2 * or);
  cle.position.set(4, 6, 6);
  const contre = new THREE.DirectionalLight(0xf4cd63, 2.2 * or);
  contre.position.set(-5, 2, -4);
  const rasant = new THREE.SpotLight(0xffffff, 3 * or, 40, 0.8, 0.6);
  rasant.position.set(0, 8, 3);
  scene.add(cle, contre, rasant);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 8.4);
  camera.lookAt(0, 0, 0);

  const moteur = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  moteur.setSize(taille, taille);
  moteur.setClearColor(0x000000, 0);
  moteur.toneMapping = THREE.ACESFilmicToneMapping;
  moteur.toneMappingExposure = 1.25;
  document.body.appendChild(moteur.domElement);
  moteur.render(scene, camera);

  const data = moteur.domElement.toDataURL('image/png');
  await fetch(ENVOI, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nom, data }),
  });
  dire(`${nom} envoyé`);
}

(async () => {
  try {
    await rendre('brennus', '/m3d/brennus.glb', 1080, 0.35, 0.02, 1.15);
    await rendre('ballon', '/ballon.glb', 720, -0.35, 0.12);
    await rendre('champions', '/m3d/champions.glb', 900, 0.4, 0.02, 1.1);
    dire('TERMINÉ');
  } catch (e) {
    dire(`ÉCHEC : ${(e as Error).message}`);
  }
})();
