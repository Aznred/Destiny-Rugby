import assert from 'node:assert/strict';
import * as THREE from '../public/rn26/vendor/three/build/three.module.js';
import { planLiberation,protegerRessources,ressourcesLocales } from '../public/rn26/ressources.mjs';

const toile=()=>({width:512,height:512,getContext(){}});
const image=toile(),texture=new THREE.Texture(image),geometrie=new THREE.BoxGeometry();
const mat=new THREE.MeshStandardMaterial({map:texture}),source=new THREE.Mesh(geometrie,mat);
protegerRessources([source]);
let controles=0;
const verifier=(c,m)=>{assert.ok(c,m);controles++;};
let partagesDetruits=0;
for(const r of [geometrie,mat,texture])r.addEventListener('dispose',()=>partagesDetruits++);

// Deux scènes simultanées : objets GPU distincts, gros tampons CPU identiques.
const localesA=ressourcesLocales(),localesB=ressourcesLocales(),voisinA=source.clone(),voisinB=source.clone();
localesA.appliquer(voisinA);localesB.appliquer(voisinB);
verifier(voisinA.geometry!==voisinB.geometry&&voisinA.material!==voisinB.material&&voisinA.material.map!==voisinB.material.map,'deux renderers ne posent pas leurs écouteurs sur les mêmes objets en cache');
verifier(voisinA.geometry.attributes.position===geometrie.attributes.position&&voisinA.material.map.image===image,'aucune copie des gros tableaux ou images CPU');
const second=source.clone();localesA.appliquer(second);
verifier(second.geometry===voisinA.geometry&&second.material===voisinA.material,'les trente joueurs d’une scène réutilisent ses copies');
planLiberation([voisinA]).tout();localesA.oublier();
verifier(voisinB.material.map.image===image&&image.width===512,'la fermeture d’un renderer préserve l’aperçu voisin');
planLiberation([voisinB]).tout();localesB.oublier();

// Trente joueurs, matériaux sous forme de tableaux, squelette partagé entre
// les pièces d'un même corps, textures de maillot et ombres propres au match.
for(let match=0;match<10;match++){
  const scene=new THREE.Scene(),maillots=[],squelettes=[],compteurs=[];
  scene.add(source.clone());
  for(let i=0;i<30;i++){
    const kit=new THREE.Texture(toile()),matiere=mat.clone();matiere.map=kit;
    const os=new THREE.Skeleton([new THREE.Bone()]);os.computeBoneTexture();
    const corps=new THREE.SkinnedMesh(geometrie,[matiere,mat]);corps.bind(os);
    const tete=new THREE.SkinnedMesh(geometrie,matiere);tete.bind(os);
    scene.add(corps,tete,new THREE.Mesh(new THREE.CircleGeometry(),new THREE.MeshBasicMaterial()));
    const compte={kit:0,matiere:0,squelette:0};
    kit.addEventListener('dispose',()=>compte.kit++);
    matiere.addEventListener('dispose',()=>compte.matiere++);
    os.boneTexture.addEventListener('dispose',()=>compte.squelette++);
    maillots.push(kit.image);squelettes.push(os);compteurs.push(compte);
  }
  const plan=planLiberation([scene]);
  verifier(plan.restant>=150,'le plan inclut ombres, textures, matériaux et squelettes');
  while(plan.restant)plan.tranche(7);
  plan.tout();
  verifier(compteurs.every(c=>c.kit===1&&c.matiere===1&&c.squelette===1),'chaque ressource du joueur est rendue une seule fois');
  verifier(maillots.every(c=>c.width===1&&c.height===1),'les toiles CPU des maillots sont rendues');
  verifier(squelettes.every(s=>s.boneTexture===null),'les textures d’os sont libérées');
  verifier(partagesDetruits===0&&texture.image===image&&image.width===512,'le modèle en cache et l’aperçu voisin restent utilisables');
}
const clone=texture.clone();
planLiberation([], [clone]).tout();
verifier(image.width===512&&texture.image===image,'une texture clonée ne détruit pas son image partagée');
let fermetures=0;
const bitmap={width:512,height:512,close(){fermetures++;}},a=new THREE.Texture(bitmap),b=new THREE.Texture(bitmap);
planLiberation([], [a,b]).tout();
verifier(fermetures===1,'un ImageBitmap utilisé par deux textures se ferme une seule fois');
const enEchec=new THREE.Texture(toile()),im=enEchec.image;
enEchec.dispose=()=>{throw new Error('contexte déjà perdu');};
const dernier=new THREE.Texture(toile()),p=planLiberation([], [enEchec,dernier]);
p.tout();
verifier(p.restant===0&&im.width===1&&dernier.image===null,'une libération en erreur rend les images et laisse passer les suivantes');
planLiberation([source],[],true).tout();
verifier(partagesDetruits===3&&image.width===1,'un cache évincé rend aussi ses images et géométries');
console.log(`Mémoire 3D : ${controles} contrôles, dix groupes de trente joueurs, OK.`);
