// correctif24-scene
// correctif23-touche
import * as THREE from '/rn26/vendor/three/build/three.module.js';
import { GLTFLoader } from '/rn26/vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from '/rn26/vendor/three/examples/jsm/utils/SkeletonUtils.js';
import { loadMotions,preparePose,applyPose,rootAt } from './motion.js';
import { DestinyMatch,xyz,clamp,TICK } from './destiny.mjs';
import { armChain } from './liaisons.js';
import { appearance,souhaitDepuisCarte,tirage,prepareBody,groundBody,grip,trackBall,bindLift,findHairMesh,fitToHead,fitBeard,raiseTorso,COIFFURES,BARBES } from './corps.js';
import { prepareGaits,locomotion } from './allures.js';
import { tenueDepuisImage,creerTenue,numeroter,creerPanneaux,creerAbords,creerPublic,creerEtiquette,creerBallon,nettoyerStade,creerEcranGeant,chargerImage,texture,departagerTenues,nomCourt,luminance,hexa,MAILLOT_DEFAUT } from './habillage.js';
import { creerSons } from './sons.js';
import { creerTelevision } from './television.js';
// Correctif 30 : les banques d'animations (ordre de chargement, banque d'une phase) et les signaux de l'arbitre.
import { ARBITRE,BANQUE_DE_LA_PHASE,ORDRE_DE_CHARGEMENT } from './animations.mjs';
import { protegerRessources,planLiberation,ressourcesLocales } from './ressources.mjs';

// ---------------------------------------------------------------------------
// LA SCÈNE DU MATCH EN TROIS DIMENSIONS
// ---------------------------------------------------------------------------
// Un module, deux usages : la page d'aperçu (`main.js`) et les écrans de match
// du jeu, qui la montent dans leur propre cadre. La scène ne décide de rien :
// elle LIT un état de match (celui du moteur, ou sa reconstitution à partir des
// relevés du direct en ligne) et le met en images.

const smooth=k=>{const u=clamp(k,0,1);return u*u*(3-2*u);};
const RACINE_MODELES='/rn26/modeles/',RACINE_DECOR='/rn26/decor/';
// Pose des casques et crampons allégés (repère : voir alleger_equipement.mjs).
// ⚠️ LE CASQUE SE RÈGLE SUR LA TÊTE, PAS SUR UNE TAILLE FIXE : posé à 30 cm de haut,
// son sommet flottait six centimètres au-dessus du crâne. Sa largeur suit celle de
// la tête (oreilles comprises) et son sommet affleure le haut du crâne.
const CASQUE={largeur:1.06,dessus:.012,recul:.004},CRAMPON={taille:1.04};
const ballons=new Map();
/** Le ballon équipé en boutique, allégé pour le match (alleger_equipement.mjs) ; `null` s'il manque. */
function chargerBallon(nom){
  if(!/^[a-z0-9-]+$/i.test(nom||''))return Promise.resolve(null);
  if(!ballons.has(nom))ballons.set(nom,new GLTFLoader().loadAsync(RACINE_DECOR+'equipement/ballon-'+nom+'.glb').then(g=>{protegerRessources([g.scene]);let m=null;g.scene.traverse(o=>{if(o.isMesh)m=o;});return m;}).catch(()=>null));
  return ballons.get(nom);
}
// ── ÉQUIPEMENT : un casque ou des crampons ne se chargent que s'ils sont portés ──
// Un joueur du jeu (casque rouge, crampons dorés) en demande un ; les adversaires tirent dans une petite réserve.
// ⚠️ Un fichier manquant n'empêche rien : le joueur garde l'équipement d'origine.
const equipements=new Map(),equipementPret=new Map();
const POOL_CASQUES=['casque','casque-rouge'],POOL_CRAMPONS=['crampons','crampons-bleus'];
/** Un modèle allégé de la boutique, par son nom de fichier ; `null` s'il manque. Mis en cache pour la session. */
export function chargerEquipement(nom){
  if(!/^[a-z0-9-]+$/i.test(nom||''))return Promise.resolve(null);
  if(!equipements.has(nom))equipements.set(nom,new GLTFLoader().loadAsync(RACINE_DECOR+'equipement/'+nom+'.glb').then(g=>{protegerRessources([g.scene]);let m=null;g.scene.traverse(o=>{if(o.isMesh)m=o;});equipementPret.set(nom,m);return m;}).catch(()=>{equipementPret.set(nom,null);return null;}));
  return equipements.get(nom);
}
/** Charge ce qu'une liste d'apparences porte, plus la réserve des adversaires. */
async function chargerEquipementsDe(apparences,avecReserve=true){
  const voulus=new Set(avecReserve?[...POOL_CASQUES,...POOL_CRAMPONS]:[]);
  for(const a of Object.values(apparences||{})){const q=a?.equipement;if(q?.casque?.modele)voulus.add(q.casque.modele);if(q?.crampons?.modele)voulus.add(q.crampons.modele);}
  await Promise.all([...voulus].map(chargerEquipement));
}
const teinter=(materiau,couleur)=>{const m=materiau.clone();if(m.color)m.color=m.color.clone().lerp(new THREE.Color(couleur),.75);return m;};
const tmpV=new THREE.Vector3();

/** Coiffure, barbe, casque, crampons : ajustés sur le crâne et aux pieds, puis attachés à l'os. */
function habiller(r,model,kind,look){
  const head=model.getObjectByName('CC_Base_Head');let headMesh=null;
  model.traverse(o=>{if(o.isSkinnedMesh&&/head_/.test(o.name))headMesh=o;});
  if(!head||!headMesh)return;
  const attach=(source,color,marge,roughness=.82,ajuster=fitToHead,decalageY=0)=>{
    if(!source)return;
    // Le masque de la planche découpe les mèches : sans lui, chaque coupe est un bloc plein.
    const masque=source.material?.map||null;
    const mesh=new THREE.Mesh(ajuster(source,headMesh,kind,marge),new THREE.MeshStandardMaterial({color,roughness,metalness:0,side:THREE.DoubleSide,map:masque,alphaTest:masque?.38:0}));
    mesh.name=source.name;mesh.position.y=decalageY;model.add(mesh);model.updateMatrixWorld(true);head.attach(mesh);
  };
  const casque=look.accessory==='casque';
  if(look.hair&&!casque)attach(findHairMesh(r.hair,'Hair',look.hair,COIFFURES),look.color,.007,.82,fitToHead,.01);
  if(look.beard)attach(findHairMesh(r.hair,'Beard',look.beard,BARBES),look.teinteBarbe?new THREE.Color(look.teinteBarbe):new THREE.Color(look.color).multiplyScalar(.85),.002,.82,fitBeard);
  if(casque){
    // Le casque que le joueur porte (modèle de la boutique, teinte comprise) ; les autres tirent dans la réserve.
    const demande=look.casqueModele,reserve=POOL_CASQUES.map(n=>equipementPret.get(n)).filter(Boolean);
    const modele=demande?(equipementPret.get(demande.modele)||reserve[0]||null):(reserve.length?reserve[Math.floor(tirage(look.graine??0,9)*reserve.length)%reserve.length]:null);
    if(modele){
      const box=new THREE.Box3().setFromBufferAttribute(headMesh.geometry.attributes.position);
      const mesh=new THREE.Mesh(modele.geometry,demande?.teinte?teinter(modele.material,demande.teinte):modele.material);mesh.name='Casque';
      modele.geometry.computeBoundingBox();
      const forme=modele.geometry.boundingBox,echelle=(box.max.x-box.min.x)*CASQUE.largeur/(forme.max.x-forme.min.x);
      mesh.scale.setScalar(echelle);
      // ⚠️ LE CASQUE REGARDE DU MÊME CÔTÉ QUE LE VISAGE. Les modèles allégés ont le
      // visage vers −Z (alleger_equipement.mjs), la tête du joueur vers +Z : posé
      // tel quel, il était devant-derrière — la nuque du casque sur les yeux.
      // Il est donc retourné d'un demi-tour, et ses décalages changent de signe.
      mesh.rotation.y=Math.PI;
      mesh.position.set((forme.min.x+forme.max.x)/2*echelle,box.max.y+CASQUE.dessus-forme.max.y*echelle,(box.min.z+box.max.z)/2-CASQUE.recul+(forme.min.z+forme.max.z)/2*echelle);
      model.add(mesh);model.updateMatrixWorld(true);head.attach(mesh);
    }else attach(r.hair.getObjectByName('Helmet_LOD2'),look.bandColor,.012,.6);
  }
  // Les crampons : ceux que le joueur porte ; sinon la paire d'origine, et un modèle de la réserve pour un adversaire sur deux.
  const demandeC=look.cramponsModele,reserveC=POOL_CRAMPONS.map(n=>equipementPret.get(n)).filter(Boolean);
  const veutCrampons=look.equipe?!!demandeC:(reserveC.length&&look.graine!==undefined&&tirage(look.graine,10)<.55);
  if(veutCrampons){
    const modele=demandeC?(equipementPret.get(demandeC.modele)||null):reserveC[Math.floor(tirage(look.graine,11)*reserveC.length)%reserveC.length];
    let bottes=null;model.traverse(o=>{if(o.isSkinnedMesh&&/boot/.test(o.name))bottes=o;});
    const pieds=['L','R'].map(c=>model.getObjectByName('CC_Base_'+c+'_Foot')).filter(Boolean);
    if(modele&&bottes&&pieds.length===2){
      const p=bottes.geometry.attributes.position,poses=[];
      for(const pied of pieds){
        const ou=model.worldToLocal(pied.getWorldPosition(new THREE.Vector3())),cote=Math.sign(ou.x)||1,b=new THREE.Box3();
        for(let i=0;i<p.count;i++)if(p.getX(i)*cote>0)b.expandByPoint(tmpV.set(p.getX(i),p.getY(i),p.getZ(i)));
        if(!b.isEmpty())poses.push({pied,b});
      }
      if(poses.length===2){
        bottes.visible=false;
        const materiau=demandeC?.teinte?teinter(modele.material,demandeC.teinte):modele.material;
        for(const {pied,b} of poses){
          const mesh=new THREE.Mesh(modele.geometry,materiau);mesh.name='Crampon';
          mesh.scale.setScalar((b.max.z-b.min.z)*CRAMPON.taille);mesh.position.set((b.min.x+b.max.x)/2,b.min.y,(b.min.z+b.max.z)/2);
          model.add(mesh);model.updateMatrixWorld(true);pied.attach(mesh);
        }
      }
    }
  }
  if(look.accessory==='bandeau')attach(r.hair.getObjectByName('Headband_LOD2'),look.bandColor,.014,.7);
}

/**
 * Morphologie : des FACTEURS, calculés et bornés par le jeu (`lib/apparenceJoueur.ts`), jamais des valeurs libres.
 * hauteur / largeur / épaisseur : échelle du corps ; épaules : écartement des bras ; bras et jambes : longueur.
 * ⚠️ Bornés à ±12 % : au-delà, l'appui des pieds et la prise du ballon se décalent et le rig se déforme.
 */
function appliquerMorpho(model,m){
  if(!m)return;
  model.scale.set(m.largeur||1,m.hauteur||1,m.epaisseur||1);
  for(const cote of ['L','R']){
    const bras=model.getObjectByName('CC_Base_'+cote+'_Upperarm');
    if(bras){if(m.epaules&&m.epaules!==1)bras.position.multiplyScalar(m.epaules);if(m.bras&&m.bras!==1)bras.scale.multiplyScalar(m.bras);}
    const cuisse=model.getObjectByName('CC_Base_'+cote+'_Thigh');
    if(cuisse&&m.jambes&&m.jambes!==1)cuisse.scale.multiplyScalar(m.jambes);
  }
}
let ressources=null;
const peintComme=(canvas,avant)=>{const t=texture(canvas,null);if(avant){t.wrapS=avant.wrapS;t.wrapT=avant.wrapT;t.repeat.copy(avant.repeat);t.offset.copy(avant.offset);t.flipY=avant.flipY;}return t;};
/** Joueurs, ballon, coiffures, équipement et mouvements : chargés une fois, partagés par tous les matchs de la session. */
function charger(){
  ressources??=(async()=>{
    const loader=new GLTFLoader(),image=nom=>chargerImage(RACINE_DECOR+nom);
    const [motions,forward,back,ball,hair,tee,kit]=await Promise.all([
      // Correctif 30 : seule la banque commune est attendue (4,7 Mo par morphologie au lieu de 11) ; le reste arrive ensuite.
      loadMotions('catalogue-match-poses.json',{banques:['common']}),loader.loadAsync(RACINE_MODELES+'player_male_forward_LOD2.glb'),loader.loadAsync(RACINE_MODELES+'player_male_back_LOD2.glb'),
      loader.loadAsync(RACINE_DECOR+'ballon.glb'),loader.loadAsync(RACINE_DECOR+'coiffures.glb'),
      loader.loadAsync(RACINE_DECOR+'tee.glb'),image('kit_france_home.png'),
    ]);
    // Casques et crampons : chargés à la demande, un par un (`chargerEquipement`), jamais les cinquante de la boutique.
    const gaits={};for(const [key,rig] of Object.entries(motions.rigs))gaits[key]=prepareGaits(motions.clips,rig.scale);
    // ⚠️ AUCUNE MARQUE DE L'ÉDITEUR D'ORIGINE NE RESTE À L'IMAGE : le ballon est
    // repeint une fois pour la session, le panneau du stade à son chargement (le
    // maillot, les réclames et les abords le sont par scène, dans habillage.js).
    try{
      await document.fonts?.load?.('40px Anton').catch(()=>{});
      ball.scene.traverse(o=>{if(o.isMesh&&o.material?.map&&/ball/i.test(o.material.name)&&!/shadow/i.test(o.material.name))o.material.map=peintComme(creerBallon(512),o.material.map);});
    }catch(e){console.warn('Marquage Destiny Rugby :',e);}
    protegerRessources([forward.scene,back.scene,hair.scene,ball.scene,tee.scene]);
    return {motions,gaits,forward:forward.scene,back:back.scene,hair:hair.scene,ball:ball.scene,tee:tee.scene,kit};
  })();
  return ressources;
}
// ── LE STADE DÉPEND DU NIVEAU DU CLUB QUI REÇOIT ────────────────────────────
// Du terrain de campagne (une tribune, des clôtures, des arbres) à l'enceinte
// internationale. Chaque décor est chargé à la demande et gardé pour la session.
// Tous partagent les mêmes noms de matériaux (public, réclames, abords, pelouse) :
// l'habillage aux couleurs du club s'applique donc à chacun sans cas particulier.
export const STADES={campagne:'stade-club-1.glb',village:'stade-club-2.glb',moyen:'stade-club-3.glb',grand:'stade-club-5.glb',international:'stade-france.glb'};
const decors=new Map();
/**
 * ⚠️ SUR TÉLÉPHONE, LE STADE EST CE QUI PÈSE. L'enceinte internationale porte
 * cinq textures de 2 048 px : quatre-vingts mégaoctets une fois décodées, autant
 * sur la carte graphique, et un WebView iOS qui manque de mémoire ne prévient
 * pas — la pelouse reste noire, ou l'application se ferme. En mode léger :
 * textures ramenées à 1 024 px (quatre fois moins de mémoire), matériaux sans
 * éclairage physique (un seul calcul par sommet), et UN seul stade gardé.
 */
function allegerDecor(decor,materiaux,origine){
  const reduites=new Map(),legers=new Map();
  const reduire=t=>{
    if(!t?.image)return t||null;
    if(reduites.has(t))return reduites.get(t);
    const im=t.image,w=im.width||0,h=im.height||0;let r=t;
    if(Math.max(w,h)>1024){
      const k=1024/Math.max(w,h),c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      r=new THREE.CanvasTexture(c);r.colorSpace=t.colorSpace;r.wrapS=t.wrapS;r.wrapT=t.wrapT;
      r.repeat.copy(t.repeat);r.offset.copy(t.offset);r.flipY=t.flipY;r.name=t.name;
      // L'image d'origine ne servira plus : on rend sa mémoire tout de suite.
      t.dispose();im.close?.();
    }
    reduites.set(t,r);return r;
  };
  const convertir=m=>{
    if(!m||m.isMeshLambertMaterial)return m;
    if(legers.has(m))return legers.get(m);
    const l=new THREE.MeshLambertMaterial({name:m.name,color:m.color,map:reduire(m.map),alphaTest:m.alphaTest,transparent:m.transparent,opacity:m.opacity,side:m.side,vertexColors:m.vertexColors});
    for(const k of ['normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])m[k]?.dispose?.();
    m.dispose();legers.set(m,l);materiaux[m.name]=l;if(origine[m.name])origine[m.name]=l.map;
    return l;
  };
  decor.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(convertir):convertir(o.material);});
}
/** Rend la mémoire des stades gardés (textures, géométries). Une scène encore vivante les recharge d'elle-même. */
function libererStades(sauf,gardes=1){
  // Les plus anciens d'abord : la Map garde l'ordre d'arrivée, et un stade resservi repasse en dernier (`chargerStade`).
  const autres=[...decors.keys()].filter(c=>c!==sauf),aRendre=new Set(autres.slice(0,Math.max(0,autres.length-(gardes-1))));
  for(const [cle,promesse] of decors){
    if(!aRendre.has(cle)||promesse.utilisateurs>0)continue;
    decors.delete(cle);
    promesse.then(({decor,origine})=>planLiberation([decor],Object.values(origine),true).tout()).catch(()=>{});
  }
}
/** La pelouse de secours : un vert rayé dessiné sur place, quand la texture du terrain n'a pas pu être lue. */
function pelouseDeSecours(){
  const c=document.createElement('canvas');c.width=c.height=256;
  const g=c.getContext('2d');
  for(let i=0;i<8;i++){g.fillStyle=i%2?'#4d8a3f':'#5a9a49';g.fillRect(0,i*32,256,32);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}
// ── Le décor ne bouge pas (Correctif 25) ───────────────────────────────────
// Les matrices de ses morceaux ne sont plus recomposées à chaque image. La racine, elle, tourne au changement de
// côté : elle garde sa mise à jour et entraîne ses enfants.
// ⚠️ ON NE SOUDE PAS LES MORCEAUX DU STADE. Essayé et mesuré (`correctif_25_stade.cjs`) : three.js les élague déjà un
// par un, il n'en reste qu'une cinquantaine à l'image ; soudés, on gagne dix appels et on dessine 15 % de triangles en plus.
function figerDecor(decor){
  decor.updateMatrixWorld(true);
  decor.traverse(o=>{if(o===decor)return;o.updateMatrix();o.matrixAutoUpdate=false;});
}
function chargerStade(nom,leger=false){
  const fichier=(STADES[nom]||STADES.international),cle=fichier+(leger?'#leger':'');
  // Un téléphone ne garde pas le stade du match d'avant ; un ordinateur garde celui du match et le précédent
  // (il les gardait TOUS : cinq stades décodés au bout d'une soirée de jeu).
  if(decors.has(cle)){const dejaLa=decors.get(cle);decors.delete(cle);decors.set(cle,dejaLa);}
  libererStades(cle,leger?1:2);
  if(!decors.has(cle))decors.set(cle,(async()=>{
    const stadium=await new GLTFLoader().loadAsync(RACINE_DECOR+fichier);
    const decor=stadium.scene,origine={},materiaux={};
    decor.traverse(o=>{if(!o.isMesh)return;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        materiaux[m.name]=m;
        if(m.map){m.map.wrapS=m.map.wrapT=THREE.RepeatWrapping;origine[m.name]??=m.map;}
        if(/alpha|Crowd|Leaves|recolour|FENCE/i.test(m.name)){m.alphaTest=.45;m.transparent=false;}
        if(m.name==='CrowdMaterial'){m.vertexColors=false;m.map.repeat.set(.25,.06);m.color.set('#ffffff');}
        if(m.name==='union_pitch_normal_01'){m.color.set('#abc697');m.roughness=1;}
        // ⚠️ Les couleurs de sommets des abords codaient le vent des fanions dans
        // le jeu d'origine : lues comme une teinte, elles peignaient les poteaux en noir.
        if(m.name==='surround_objects_2021'){m.vertexColors=false;m.metalness=0;m.roughness=.55;m.color.set('#ffffff');}
      }
    });
    try{
      await document.fonts?.load?.('40px Anton').catch(()=>{});
      if(origine.stadedefrance?.image){
        const propre=peintComme(nettoyerStade(origine.stadedefrance.image),origine.stadedefrance);
        for(const n of ['stadedefrance','stadedefrance_alpha'])if(materiaux[n]?.map?.image===origine.stadedefrance.image){materiaux[n].map=propre;origine[n]=propre;}
      }
    }catch(e){console.warn('Marquage Destiny Rugby :',e);}
    // ⚠️ L'ÉCRAN GÉANT NE MONTRE JAMAIS SA TEXTURE D'ORIGINE (Correctif 31) : elle porte le logo du jeu d'origine
    // (stades de campagne et de village). Si la toile ne peut pas être peinte, il reste éteint plutôt que de l'afficher.
    if(materiaux.screen){
      const ecran=materiaux.screen,avant=ecran.map;
      try{ecran.map=peintComme(creerEcranGeant(leger?512:1024),avant);origine.screen=ecran.map;}
      catch(e){console.warn('Écran géant :',e);ecran.map=null;ecran.color.set('#0c3324');delete origine.screen;}
      if(avant&&avant!==ecran.map){avant.dispose();avant.image?.close?.();}
    }
    if(leger)allegerDecor(decor,materiaux,origine);
    figerDecor(decor);
    protegerRessources([decor],Object.values(origine));
    return {decor,origine,materiaux};
  })().catch(e=>{
    // Un décor absent ou illisible : on retombe sur l'enceinte d'origine, jamais sur un terrain vide.
    decors.delete(cle);if(fichier===STADES.international)throw e;
    console.warn('Stade « '+nom+' » indisponible :',e);return chargerStade('international',leger);
  }));
  const promesse=decors.get(cle);promesse.utilisateurs=(promesse.utilisateurs||0)+1;
  return promesse.then(stade=>{
    let rendu=false;
    return {...stade,restituer(){if(rendu)return;rendu=true;promesse.utilisateurs--;stade.restituer?.();}};
  });
}
// ── Un squelette par joueur (Correctif 25) ─────────────────────────────────
// Corps, tête, yeux, maillot, short, chaussettes : chaque pièce du modèle arrive avec SON squelette, et three.js
// recalcule puis renvoie à la carte graphique une texture d'os par squelette et par image — 192 pour un match.
// Les os de toutes les pièces sont rangés à la suite dans UN squelette (chacune y garde ses matrices de repos), et
// chaque géométrie reçoit une copie de ses indices d'os décalée d'autant. L'image est la même, pour six fois moins d'envois.
// ⚠️ Les géométries sont partagées par tous les joueurs : la copie décalée est faite une fois par pièce et gardée.
const peauxDecalees=new Map(),piecesSoudees=new Map();
function unirSquelettes(model){
  const peaux=[];model.traverse(o=>{if(o.isSkinnedMesh&&o.skeleton&&o.geometry?.attributes?.skinIndex)peaux.push(o);});
  if(peaux.length<2)return;
  const os=[],repos=[];
  for(const m of peaux){
    const base=os.length,ancien=m.skeleton;
    os.push(...ancien.bones);repos.push(...ancien.boneInverses);
    if(!base)continue;
    const cle=m.geometry.uuid+'#'+base;let g=peauxDecalees.get(cle);
    if(!g){
      const src=m.geometry,si=src.attributes.skinIndex,n=si.itemSize;
      g=new THREE.BufferGeometry();g.name=src.name;
      for(const nom in src.attributes)g.setAttribute(nom,src.attributes[nom]);
      g.setIndex(src.index);for(const gr of src.groups)g.addGroup(gr.start,gr.count,gr.materialIndex);
      g.boundingBox=src.boundingBox;g.boundingSphere=src.boundingSphere;g.morphAttributes=src.morphAttributes;g.morphTargetsRelative=src.morphTargetsRelative;g.userData=src.userData;
      const decales=new Uint16Array(si.count*n);
      for(let i=0;i<si.count;i++){decales[i*n]=si.getX(i)+base;if(n>1)decales[i*n+1]=si.getY(i)+base;if(n>2)decales[i*n+2]=si.getZ(i)+base;if(n>3)decales[i*n+3]=si.getW(i)+base;}
      g.setAttribute('skinIndex',new THREE.BufferAttribute(decales,n));
      peauxDecalees.set(cle,g);protegerRessources([],[g]);
    }
    m.geometry=g;
  }
  const commun=new THREE.Skeleton(os,repos);
  for(const m of peaux){const ancien=m.skeleton;m.skeleton=commun;ancien.dispose?.();}
}
// ── Les pièces qui se dessinent pareil sont soudées (Correctif 25) ─────────
// Maillot, short et chaussettes portent le même atlas et les mêmes réglages ; corps et tête, la même peau : un appel
// de dessin chacun au lieu de trois et de deux. ⚠️ La règle ne connaît pas les noms : deux pièces ne se soudent que si
// TOUT ce qui les dessine est identique (matière, textures, squelette, pose de repos, forme des tampons). Les tenues
// des arbitres (une couleur par pièce) et les yeux (leur propre texture) restent donc à part.
// ⚠️ À appeler après `unirSquelettes` : c'est le squelette commun qui rend les indices d'os comparables.
const TEXTURES_DE_MATIERE=['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','lightMap','envMap'];
const REGLAGES_DE_MATIERE=['type','side','transparent','opacity','alphaTest','depthWrite','depthTest','roughness','metalness','vertexColors','flatShading','envMapIntensity','emissiveIntensity','aoMapIntensity','wireframe','fog','toneMapped','blending'];
function dessinDeLaPiece(o){
  const m=o.material,g=o.geometry;
  if(!m||Array.isArray(m)||!o.skeleton||o.bindMode!=='attached'||g.groups.length>1||Object.keys(g.morphAttributes).length)return null;
  const tampons=Object.keys(g.attributes).sort().map(n=>{const a=g.attributes[n];return a.isInterleavedBufferAttribute?null:n+a.itemSize+a.array.constructor.name+(a.normalized?'n':'');});
  if(tampons.includes(null))return null;
  return [o.skeleton.uuid,o.bindMatrix.elements.join(','),o.renderOrder,o.layers.mask,tampons.join(','),
    m.color?.getHexString?.()??'',m.emissive?.getHexString?.()??'',m.normalScale?m.normalScale.x+','+m.normalScale.y:'',
    ...REGLAGES_DE_MATIERE.map(k=>m[k]),...TEXTURES_DE_MATIERE.map(k=>m[k]?.uuid??'')].join('|');
}
function souderLesPieces(model){
  const lots=new Map();
  model.traverse(o=>{
    if(!o.isSkinnedMesh||!o.visible||o.children.length)return;
    const cle=dessinDeLaPiece(o);if(!cle)return;
    let lot=lots.get(cle);if(!lot)lots.set(cle,lot=[]);lot.push(o);
  });
  for(const pieces of lots.values()){
    if(pieces.length<2)continue;
    const cle=pieces.map(o=>o.geometry.uuid).join('+');let g=piecesSoudees.get(cle);
    if(!g){
      let sommets=0,nIndices=0;
      for(const o of pieces){const n=o.geometry.attributes.position.count;sommets+=n;nIndices+=o.geometry.index?o.geometry.index.count:n;}
      g=new THREE.BufferGeometry();g.name=pieces.map(o=>o.geometry.name||o.name).join('+');
      for(const nom of Object.keys(pieces[0].geometry.attributes)){
        const modele=pieces[0].geometry.attributes[nom],k=modele.itemSize,tout=new modele.array.constructor(sommets*k);let s=0;
        for(const o of pieces){const a=o.geometry.attributes[nom];tout.set(a.array.subarray(0,a.count*k),s*k);s+=a.count;}
        g.setAttribute(nom,new THREE.BufferAttribute(tout,k,modele.normalized));
      }
      const indices=sommets>65535?new Uint32Array(nIndices):new Uint16Array(nIndices);let s0=0,i0=0;
      for(const o of pieces){
        const src=o.geometry.index,n=o.geometry.attributes.position.count,nb=src?src.count:n;
        for(let i=0;i<nb;i++)indices[i0+i]=s0+(src?src.getX(i):i);
        s0+=n;i0+=nb;
      }
      g.setIndex(new THREE.BufferAttribute(indices,1));g.computeBoundingBox();g.computeBoundingSphere();
      piecesSoudees.set(cle,g);protegerRessources([],[g]);
    }
    const premiere=pieces[0],soudee=new THREE.SkinnedMesh(g,premiere.material);
    soudee.name='pieces_soudees';soudee.bindMode=premiere.bindMode;soudee.bind(premiere.skeleton,premiere.bindMatrix);
    soudee.frustumCulled=premiere.frustumCulled;soudee.renderOrder=premiere.renderOrder;soudee.layers.mask=premiere.layers.mask;
    soudee.position.copy(premiere.position);soudee.quaternion.copy(premiere.quaternion);soudee.scale.copy(premiere.scale);
    premiere.parent.add(soudee);
    for(const o of pieces){o.parent.remove(o);if(o.material!==premiere.material)o.material.dispose?.();}
  }
}
/** Remplace la texture d'un matériau du stade en gardant son cadrage. */
function repeindre(materiau,canvas,renderer){
  if(!materiau)return null;
  const avant=materiau.map,t=texture(canvas,renderer);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;if(avant){t.repeat.copy(avant.repeat);t.offset.copy(avant.offset);}
  materiau.map=t;materiau.needsUpdate=true;return t;
}

/**
 * Monte la scène dans `conteneur`.
 *
 * options :
 *  - `outils` : fonctions pures du moteur (`positionVol`, `geometrieMelee`,
 *    `porteurPourAffichage`, `TEMPS_MELEE`, `RITUEL_TIR`) — celles de l'hôte,
 *    pour que l'affichage lise exactement la version du moteur qui joue ;
 *  - `equipes` : deux `{ nom, maillot, blason }` (domicile d'abord) ;
 *  - `apparences` : par identifiant de pion, ce que sa carte sait de lui ;
 *  - `moi` : identifiant du pion du joueur, cerclé sur la pelouse ;
 *  - `leger` : téléphone ou tablette — textures et définition réduites ;
 *  - `camera` : `tv` (la réalisation choisit ses plans), `follow`, `close`,
 *    `wide`, `aerienne`, `basse` ou `enbut` ;
 *  - `television` : `{ ralentis }` ; `habillage` : `{ nom, logo }` de la
 *    compétition, montrés sur le volet des ralentis ; `textes` : `{ ralenti }` ;
 *  - `son` : `false` pour une scène muette (vignettes, aperçus).
 */
export async function creerScene3D(conteneur,options={}){
  // iPhone, iPad (qui se présente comme un Mac tactile) : la mémoire d'un WebView y est la plus courte.
  const ios=typeof navigator!=='undefined'&&(/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  const leger=ios||!!options.leger;
  // ⚠️ SUR TÉLÉPHONE, UN CHARGEMENT APRÈS L'AUTRE : décoder le stade, les joueurs et
  // les mouvements en même temps fait un pic de mémoire que le match ne redemandera jamais.
  let r,stade;
  if(leger){r=await charger();stade=await chargerStade(options.stade,true);}
  else {
    const charges=await Promise.allSettled([charger(),chargerStade(options.stade)]);
    if(charges[1].status==='fulfilled')stade=charges[1].value;
    if(charges.some(c=>c.status==='rejected')){
      stade?.restituer();libererStades();
      throw charges.find(c=>c.status==='rejected').reason;
    }
    r=charges[0].value;
  }
  let sceneEnCours=null,rendererEnCours=null;
  const locales=ressourcesLocales();
  const nettoyagesEchec=[];
  try{
  const {motions,gaits}=r;
  // ── Correctif 30 : LES BANQUES D'ANIMATIONS ────────────────────────────────
  // Le match s'affiche avec la banque commune. Les autres arrivent en tâche de fond, dans l'ordre où un match en a besoin
  // (contacts, regroupements, lignes arrière, mêlées, touches…), l'une après l'autre pour ne pas disputer le réseau au stade.
  // Sur téléphone les célébrations (4 Mo) attendent le premier essai. Une phase qui commence réclame la sienne si elle manque
  // encore ; en attendant, `destiny.mjs` joue le geste de repli de la banque commune — jamais une pose vide.
  const banquesDemandees=new Set();
  const demanderBanque=b=>{if(!b||!motions.charger||motions.chargees.has(b)||banquesDemandees.has(b))return;banquesDemandees.add(b);motions.charger(b);};
  if(motions.charger&&!motions.suite){
    const ordre=ORDRE_DE_CHARGEMENT.filter(b=>motions.banques.includes(b)&&!(leger&&b==='celebrations'));
    motions.suite=(async()=>{for(const b of ordre)await motions.charger(b);})();
  }
  let posesFaites=0,posesEvitees=0;
  await chargerEquipementsDe(options.apparences);
  const scene=new THREE.Scene();
  sceneEnCours=scene;
  scene.background=new THREE.Color('#b6d4e4');scene.fog=new THREE.Fog('#b6d4e4',180,420);
  const camera=new THREE.PerspectiveCamera(48,1,.1,600);
  const renderer=new THREE.WebGLRenderer({antialias:!leger,preserveDrawingBuffer:!!options.capture,powerPreference:leger?'default':'high-performance',failIfMajorPerformanceCaveat:false});
  rendererEnCours=renderer;
  let definition=Math.min(globalThis.devicePixelRatio||1,ios?1:leger?1.25:1.5);
  renderer.setPixelRatio(definition);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const toile=renderer.domElement;toile.style.cssText='display:block;width:100%;height:100%;touch-action:none';
  conteneur.prepend(toile);
  scene.add(new THREE.HemisphereLight('#e1efff','#626d45',2.1));
  const sun=new THREE.DirectionalLight('#fff3de',2.3);sun.position.set(-40,80,-35);scene.add(sun);

  // ── Le stade aux couleurs de l'affiche ────────────────────────────────────
  // ⚠️ CHAQUE SCÈNE CLONE LE DÉCOR ET LES MATÉRIAUX QU'ELLE REPEINT. Le stade
  // chargé est partagé par toute la session ; repeindre ses matériaux en place
  // faisait qu'une scène détruite (React monte deux fois en développement, et
  // deux matchs peuvent s'enchaîner) rendait à l'autre les panneaux d'origine.
  const decor=clone(stade.decor);locales.appliquer(decor);scene.add(decor);
  // ⚠️ LA PELOUSE S'AFFICHE TOUJOURS. Une texture que l'appareil n'a pas pu décoder laisse
  // un terrain noir : on la remplace sur-le-champ par un vert rayé dessiné sur place.
  decor.traverse(o=>{if(!o.isMesh)return;
    for(const m of Array.isArray(o.material)?o.material:[o.material]){
      if(m&&/pitch/i.test(m.name||'')&&!(m.map?.image?.width>0)){m.map=pelouseDeSecours();m.color?.set('#ffffff');m.needsUpdate=true;}
    }
  });
  // Le navigateur a repris la mémoire graphique (fréquent sur iOS quand elle manque) : l'hôte
  // revient au terrain vu de haut au lieu de laisser une image noire.
  let contextePerdu=false;
  const surPerteDeContexte=ev=>{ev.preventDefault();if(contextePerdu)return;contextePerdu=true;paused=true;options.surPerte?.();};
  renderer.domElement.addEventListener('webglcontextlost',surPerteDeContexte);
  nettoyagesEchec.push(()=>toile.removeEventListener('webglcontextlost',surPerteDeContexte));
  // Autour d'un petit stade il n'y a pas de ville modélisée : un sol jusqu'à l'horizon évite le vide sous le ciel.
  const alentours=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshStandardMaterial({color:'#7d9160',roughness:1,metalness:0}));alentours.rotation.x=-Math.PI/2;alentours.position.y=-.12;scene.add(alentours);
  const jetables=[],propres={};
  decor.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material)||!['banners','banners_noscroll','surround_objects_2021'].includes(o.material.name))return;
    propres[o.material.name]??=o.material;o.material=propres[o.material.name];
  });
  jetables.push(...Object.values(propres));
  const [tenueA,tenueB]=(options.tenuesDepartagees?(a,b)=>[a,b]:departagerTenues)({...MAILLOT_DEFAUT,...options.equipes?.[0]?.maillot},{...MAILLOT_DEFAUT,principal:'#f2f4f3',secondaire:'#dfe5e8',accent:'#c8102e',short:'#f2f4f3',chaussettes:'#0b1f44',...options.equipes?.[1]?.maillot});
  const blasons=await Promise.all([0,1].map(i=>chargerImage(options.equipes?.[i]?.blason)));
  await document.fonts?.load?.('40px Anton').catch(()=>{});
  const tailleTenue=leger?512:1024;
  // Un kit du Labo peut fournir son atlas : il est posé tel quel (les couleurs ne servent alors qu'à l'encre du numéro).
  const imagesKit=await Promise.all([tenueA,tenueB].map(m=>chargerImage(m.texture)));
  const tenues=[tenueA,tenueB].map((m,i)=>{
    if(imagesKit[i])return tenueDepuisImage(imagesKit[i],m,tailleTenue);
    try{return creerTenue(r.kit,m,blasons[i],tailleTenue);}
    // Un écusson servi sans en-tête de partage « salit » la toile : on recommence sans lui.
    catch{return creerTenue(r.kit,m,null,tailleTenue);}
  });
  const teintePad=luminance(tenueA.principal)>.82?tenueA.secondaire:tenueA.principal;
  const peindre=(nom,fabrique)=>{try{const t=repeindre(propres[nom],fabrique(),renderer);if(t)jetables.push(t);}catch(e){console.warn('Habillage du stade ('+nom+') :',e);}};
  // Les stades de club n'ont que des panneaux fixes : ils portent les mêmes réclames.
  if(propres.banners){peindre('banners',creerPanneaux);if(propres.banners_noscroll&&propres.banners.map)propres.banners_noscroll.map=propres.banners.map;}
  else peindre('banners_noscroll',creerPanneaux);
  if(stade.origine.surround_objects_2021)peindre('surround_objects_2021',()=>{
    try{return creerAbords(stade.origine.surround_objects_2021.image,teintePad,blasons[0]);}
    catch{return creerAbords(stade.origine.surround_objects_2021.image,teintePad,null);}
  });
  // Le public : six tribunes pour le club qui reçoit, deux pour les visiteurs.
  if(stade.origine.CrowdMaterial&&stade.materiaux.CrowdMaterial){
    try{
      const foule=stade.origine.CrowdMaterial.image,taille=leger?512:1024;
      const publics=[[tenueA.principal,tenueA.secondaire],[tenueB.principal,tenueB.secondaire]].map(([p,s])=>{
        const m=stade.materiaux.CrowdMaterial.clone();m.map=stade.origine.CrowdMaterial;repeindre(m,creerPublic(foule,p,s,taille),renderer);jetables.push(m.map,m);return m;
      });
      decor.traverse(cible=>{const nom=cible.name;if(!cible.isMesh||!/CrowdSection/.test(nom))return;
        cible.material=publics[/SectionNorth-|SectionNorthEast-/.test(nom)?1:0];
      });
    }catch(e){console.warn('Habillage des tribunes :',e);}
  }

  const ballMesh=clone(r.ball);scene.add(ballMesh);
  // Le ballon du joueur : celui qu'il a équipé en boutique prend la place du ballon de la scène,
  // à la même taille et sur le même axe — tout ce qui le lance, le pose ou le fait tourner n'y voit rien.
  const skinBallon=options.ballon?await chargerBallon(options.ballon):null;
  if(skinBallon){
    let cuir=null;ballMesh.traverse(o=>{if(o.isMesh&&!cuir&&!/shadow/i.test(o.material?.name||''))cuir=o;});
    if(cuir){
      cuir.geometry.computeBoundingBox();
      const taille=cuir.geometry.boundingBox.getSize(new THREE.Vector3()),centre=cuir.geometry.boundingBox.getCenter(new THREE.Vector3());
      const axe=taille.x>=taille.y&&taille.x>=taille.z?'x':taille.y>=taille.z?'y':'z';
      const neuf=new THREE.Mesh(skinBallon.geometry,skinBallon.material);neuf.name='BallonBoutique';
      neuf.scale.setScalar(taille[axe]);neuf.position.copy(centre);
      if(axe==='x')neuf.rotation.y=Math.PI/2;else if(axe==='y')neuf.rotation.x=Math.PI/2;
      cuir.add(neuf);cuir.material=new THREE.MeshBasicMaterial({visible:false});jetables.push(cuir.material);
    }
  }
  locales.appliquer(ballMesh);
  const teeMesh=clone(r.tee);teeMesh.rotation.x=Math.PI/2;teeMesh.visible=false;scene.add(teeMesh);
  locales.appliquer(teeMesh);
  teeMesh.updateMatrixWorld(true);const teeBounds=new THREE.Box3().setFromObject(teeMesh);teeMesh.userData.floor=-teeBounds.min.y;teeMesh.userData.top=teeBounds.max.y-teeBounds.min.y;
  const anneau=(interieur,exterieur,teinte,opacite)=>{const m=new THREE.Mesh(new THREE.RingGeometry(interieur,exterieur,40),new THREE.MeshBasicMaterial({color:teinte,side:THREE.DoubleSide,transparent:true,opacity:opacite,depthWrite:false}));m.rotation.x=-Math.PI/2;m.visible=false;scene.add(m);return m;};
  const halo=anneau(.48,.58,'#f5efb9',.7),aura=anneau(.62,.74,'#ffd257',.85);
  // ── Les repères du pilotage direct : anneaux (rayon 1 en base, mis à l'échelle) et pointillés ──
  // Posés sur la pelouse par l'hôte (`reperes`) ; la scène ne décide de rien, elle dessine ce qu'on lui donne.
  const anneauxRepere=[0,1,2,3,4,5,6,7].map(()=>anneau(.8,1,'#ffffff',.6));
  const pointsRepere=[...Array(16)].map(()=>{const m=new THREE.Mesh(new THREE.CircleGeometry(.11,10),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.6,depthWrite:false}));m.rotation.x=-Math.PI/2;m.visible=false;scene.add(m);return m;});
  let reperes=null;
  for(const m of [...anneauxRepere,...pointsRepere])jetables.push(m.geometry,m.material);
  const etiquette=creerEtiquette(renderer);scene.add(etiquette.sprite);
  // Le halo du porteur prend la couleur de son équipe, éclaircie si elle est trop sombre pour la pelouse.
  const teintesHalo=[tenueA,tenueB].map(t=>luminance(t.principal)<.3?'#f5efb9':hexa(t.principal));

  const actors=new Map(),officials=[];
  let match=null,paused=false,snap=true,speed=1,mode=options.camera||'follow',detruite=false;
  const handA=new THREE.Vector3(),handB=new THREE.Vector3(),tmp=new THREE.Vector3(),tmp2=new THREE.Vector3(),tmp3=new THREE.Vector3();
  const gripL=new THREE.Vector3(),gripR=new THREE.Vector3(),rootNow={x:0,z:0},rootRef={x:0,z:0};
  const qa=new THREE.Quaternion();

  function shadow(){const m=new THREE.Mesh(new THREE.CircleGeometry(.42,18),new THREE.MeshBasicMaterial({color:'#172319',transparent:true,opacity:.24,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.015;return m;}
  const dress=(model,kind,look)=>habiller(r,model,kind,look);
  function buildActor(template,kind,kit,index,number,ref=false,wish={}){
    const model=clone(template),group=new THREE.Group(),look=appearance(index,wish,kind==='male_forward'&&!ref);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model,true);model.position.y=-bounds.min.y;
    if(look.morpho){appliquerMorpho(model,look.morpho);model.updateMatrixWorld(true);const apres=new THREE.Box3().setFromObject(model,true);model.position.y-=apres.min.y;}
    model.traverse(o=>{if(!o.isSkinnedMesh)return;o.frustumCulled=false;
      // Le corps utilise le shader de peau Unity, pas l'atlas du maillot.
      if(/body_|head_/.test(o.name)){o.material=o.material.clone();o.material.map=null;o.material.vertexColors=false;o.material.color.set(look.skin);o.material.roughness=.92;return;}
      const clothing=/shirt|short|sock|boot|body_/.test(o.name);
      if(clothing){o.material=o.material.clone();o.material.color.set('#fff');o.material.roughness=.85;
        if(ref){o.material.map=null;o.material.color.set(o.name.includes('shirt')?'#13bdb7':o.name.includes('sock')?'#161e24':o.name.includes('short')?'#18252d':'#272b29');}
        else o.material.map=kit;
      }
    });
    group.add(model);scene.add(group);group.updateMatrixWorld(true);
    dress(model,kind,ref?{...look,accessory:''}:{...look,graine:index});
    group.add(shadow());
    const pose=preparePose(model,motions.rigs[kind]);
    const actor={group,model,kind,pose,look,kit,heading:Math.PI,ref,number,graine:index,
      leftHand:model.getObjectByName('CC_Base_L_Hand'),rightHand:model.getObjectByName('CC_Base_R_Hand'),leftArm:armChain(model,'L'),rightArm:armChain(model,'R'),
      rightForearm:model.getObjectByName('CC_Base_R_Forearm'),
      gait:{phase:(index*.173)%1},idleClock:index*.61,cycle:0,key:undefined,fade:1,fadeFor:.2,snapshot:new Float32Array(pose.bones.length*4+3),anchorBlend:0,entry:new THREE.Vector3(),shown:new THREE.Vector3()};
    prepareBody(actor);
    // Un squelette pour tout le corps, et les pièces qui se dessinent pareil soudées (`squelettes`, `soudure` : false pour mesurer sans).
    if(options.squelettes!==false){unirSquelettes(model);if(options.soudure!==false)souderLesPieces(model);}
    locales.appliquer(model);
    return actor;
  }
  /** Ce que la carte du joueur sait de son apparence, traduit pour le modèle. */
  const souhait=p=>{const a=options.apparences?.[p.id]??p.source.apparence;return a&&(a.coiffure!==undefined||a.cheveux!==undefined||a.barbe!==undefined||typeof a.peau==='string')?souhaitDepuisCarte(a):a||{};};
  function graine(texte){let h=2166136261;for(let i=0;i<texte.length;i++)h=Math.imul(h^texte.charCodeAt(i),16777619);return (h>>>0)%9973;}
  // ⚠️ UN, DEUX OU TROIS CASQUES PAR ÉQUIPE, PAS UN SUR SEPT AU HASARD : surtout des
  // avants, parfois un ailier, rarement quelqu'un d'autre. Tiré une fois par équipe,
  // sur les postes — le remplaçant d'un casqué n'hérite pas du casque.
  const casquesParEquipe=new Map();
  function porteCasque(p){
    let porteurs=casquesParEquipe.get(p.team);
    if(!porteurs){
      const cle=graine((options.equipes?.[p.team]?.nom||'equipe')+':casques')+p.team*17;
      const combien=1+Math.floor(tirage(cle,1)*3),poids=n=>n<=8?1:n===11||n===14?.7:.1,rangs=[];
      for(let n=1;n<=15;n++)rangs.push([n,tirage(cle,20+n)/poids(n)]);
      rangs.sort((x,y)=>x[1]-y[1]);porteurs=new Set(rangs.slice(0,combien).map(x=>x[0]));casquesParEquipe.set(p.team,porteurs);
    }
    return p.shirt<=15&&porteurs.has(p.shirt);
  }
  function actorFor(p){
    let a=actors.get(p.id);
    if(!a){
      const kind=p.number<=8?'male_forward':'male_back',kit=numeroter(tenues[p.team],p.shirt,renderer,tailleTenue);
      // Le tirage des traits manquants suit le nom : un joueur garde la même tête d'un match à l'autre.
      const index=p.source.nom?graine(p.source.nom)+p.team*31:p.shirt+p.team*31;
      const voulu=souhait(p);
      // Un joueur du jeu porte ce qu'il a équipé (et rien d'autre) ; les autres suivent le tirage de leur équipe.
      a=buildActor(p.number<=8?r.forward:r.back,kind,kit,index,p.shirt,false,{...voulu,accessoire:voulu.equipe?(voulu.casque?'casque':''):porteCasque(p)?'casque':tirage(index,7)>.93?'bandeau':''});
      a.nom=nomCourt(p.source.nom||'');actors.set(p.id,a);
    }
    return a;
  }
  function creerOfficiels(){
    for(let i=0;i<3;i++){const a=buildActor(r.back,'male_back',null,97+i*13,0,true);officials.push(a);
      a.state={x:i===0?0:i===1?-36.3:36.3,z:0,vx:0,vz:0,signal:null};
      if(i){a.flag=new THREE.Group();const stick=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.56,8),new THREE.MeshStandardMaterial({color:'#e9e9e4'}));stick.position.y=.28;a.flag.add(stick);
        const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.34,.26),new THREE.MeshStandardMaterial({color:'#ffbc18',side:THREE.DoubleSide}));cloth.position.set(.17,.42,0);a.flag.add(cloth);scene.add(a.flag);
      }else{a.card=new THREE.Mesh(new THREE.BoxGeometry(.10,.15,.008),new THREE.MeshStandardMaterial({color:'#ffdf00'}));a.card.visible=false;scene.add(a.card);}
    }
  }
  creerOfficiels();

  // En portrait, le champ s'ouvre : sans cela un téléphone ne verrait qu'une bande du terrain.
  let largeur=1,hauteur=1;
  function cadrer(){
    if(detruite||contextePerdu)return;
    const l=Math.max(1,conteneur.clientWidth),h=Math.max(1,conteneur.clientHeight);
    if(l===largeur&&h===hauteur)return;largeur=l;hauteur=h;
    // La définition 1 ne suffit pas sur une grande tablette : borner aussi
    // la surface évite de gros tampons GPU lors du passage paysage/portrait.
    const ratio=Math.min(definition,ios?Math.sqrt(921600/(l*h)):Infinity);
    renderer.setDrawingBufferSize(l,h,ratio);
    camera.aspect=l/h;camera.fov=(camera.aspect<.8?64:camera.aspect<1.2?56:48)+(leger?4:0);camera.updateProjectionMatrix();
  }
  const observateur=new ResizeObserver(cadrer);observateur.observe(conteneur);cadrer();
  nettoyagesEchec.push(()=>observateur.disconnect());

  // ── Son et réalisation ────────────────────────────────────────────────────
  const sons=options.son===false?null:creerSons({leger});
  nettoyagesEchec.push(()=>sons?.detruire());
  const tele=creerTelevision({conteneur,actors,officials,ballMesh,teeMesh,leger,habillage:options.habillage||{},textes:options.textes||{},surVolet:()=>sons?.evenement('volet',{gain:.45})});
  nettoyagesEchec.push(()=>tele.detruire());
  const reglagesTele={ralentis:options.television?.ralentis!==false};
  tele.surChangement=(actif,motif)=>{if(!actif)snap=true;api.surRalenti?.(actif,motif);};
  // Un appui pendant un ralenti le passe.
  const passerAuToucher=()=>{if(tele.ralenti.actif)tele.finirRalenti(true);};
  toile.addEventListener('pointerdown',passerAuToucher);
  const suiviTele={essai:null,prevu:null};
  /** Ce que la réalisation déclenche d'elle-même : le ralenti d'un essai, et sa coupure si le jeu reprend. */
  function realiser(visualTime,fige,vitesse){
    const e=match.e,tir=match.tir||e.tir,essai=match.essai;
    if(essai&&suiviTele.essai!==essai){
      suiviTele.essai=essai;
      // On laisse le marqueur se relever, puis on revoit l'action sous un autre angle.
      suiviTele.prevu={quand:essai.start+2.6,debut:essai.start-5.2,fin:essai.start+1.3,sens:e.possession==='A'?1:-1};
    }
    const p=suiviTele.prevu;
    if(p&&visualTime<p.quand-8)suiviTele.prevu=null;
    else if(p&&visualTime>=p.quand){
      suiviTele.prevu=null;
      const jeuArrete=!['jeuCourant','ballonEnLAir','ballonLibre','ruck','maul'].includes(e.phase);
      if(reglagesTele.ralentis&&!fige&&vitesse<=1.5&&jeuArrete&&tele.disponible&&visualTime-p.quand<1.5){
        if(tele.lancerRalenti({debut:p.debut,fin:p.fin,vitesse:.5,motif:'essai'}))tele.ralenti.sens=p.sens;
      }
    }
    if((tele.ralenti.actif||tele.ralenti.attendu)&&!tele.ralenti.sortie){
      const reprise=['jeuCourant','ballonEnLAir','ballonLibre','coupEnvoi'].includes(e.phase)||tir?.etape==='elan'||!!tir?.volLance;
      if(fige||vitesse>1.5||(reprise&&tele.ralenti.motif!=='hote'))tele.finirRalenti(!fige);
    }
  }
  const cibleRalenti=new THREE.Vector3();
  /** Une image du ralenti : les corps tels qu'ils ont été affichés, vus d'un autre angle. */
  function renduRalenti(dt){
    const reel=Math.min(dt,.05);
    if(!tele.imageRalenti(reel)){tele.finirRalenti(false);return;}
    halo.visible=false;aura.visible=false;etiquette.sprite.visible=false;
    for(const m of anneauxRepere)m.visible=false;for(const m of pointsRepere)m.visible=false;
    // Contre-champ bas, côté opposé à la caméra principale, qui suit le ballon.
    const rl=tele.ralenti,s=rl.sens||1;
    cibleRalenti.set(ballMesh.position.x,clamp(ballMesh.position.y*.5,.9,2.2),ballMesh.position.z);
    tmp.set(clamp(cibleRalenti.x-9.5,-36,36),2.3,cibleRalenti.z+s*6.5);
    if(rl.premiere){rl.premiere=false;rig.focus.copy(cibleRalenti);rig.focusV.set(0,0,0);rig.pos.copy(tmp);rig.posV.set(0,0,0);}
    else{dampVector(rig.focus,cibleRalenti,rig.focusV,.45,reel);dampVector(rig.pos,tmp,rig.posV,.7,reel);}
    camera.position.copy(rig.pos);camera.lookAt(rig.focus);
    renderer.render(scene,camera);
  }

  // ── Liaisons des mains ────────────────────────────────────────────────────
  function bind(actor,partner,bone='CC_Base_Spine02',weight=1){
    if(!actor||!partner)return;
    const anchor=partner.model.getObjectByName(bone);if(!anchor)return;
    anchor.getWorldPosition(gripL);gripR.copy(gripL);
    const side=tmp.set(.18,0,0).applyQuaternion(partner.group.quaternion);gripL.sub(side);gripR.add(side);
    grip(actor,gripL,'left',weight);grip(actor,gripR,'right',weight);
  }
  function bindings(progress,visualTime){
    const e=match.e;
    if(e.phase==='touche'&&progress>.48){
      for(const group of match.liftGroups){const jumper=actors.get(group.jumper);if(!jumper)continue;
        bindLift(jumper,group.lifters.map(id=>actors.get(id)).filter(Boolean));
      }
    }
    if(e.phase==='ruck'){
      const ruck=e.ruck,o=ruck?.organisation,age=visualTime-match.ruckStart;
      if(ruck?.plaqueurId&&ruck?.porteurId&&age<1.3)bind(actors.get(ruck.plaqueurId),actors.get(ruck.porteurId),'CC_Base_Spine01',.8);
      for(const [ids,opponents] of [[o?.attaque,o?.defense],[o?.defense,o?.attaque]]){
        if(!ids)continue;for(let i=0;i<ids.length;i++){const actor=actors.get(ids[i]),p=match.byId.get(ids[i]);if(!actor||!p||p.source.corps||!actor.motion?.lie)continue;
          const candidates=o.chenille&&ids===o.attaque?[i===0?ruck.porteurId:ids[i-1]]:i>1?[ids[0]]:opponents||[];
          const friend=candidates.map(id=>match.byId.get(id)).filter(Boolean).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
          if(friend&&Math.hypot(friend.x-p.x,friend.z-p.z)<1.4)bind(actor,actors.get(friend.id),'CC_Base_Spine02',.7);
        }
      }
    }
    // Cellule d'avants : les deux soutiens liés tiennent leur porteur par le maillot.
    const cellule=e.cellule;
    if(cellule?.accroches?.length&&e.phase==='jeuCourant'){
      const porteur=actors.get(cellule.porteurId);
      for(const id of cellule.accroches){const actor=actors.get(id);if(actor&&porteur&&actor.group.position.distanceTo(porteur.group.position)<1.25)bind(actor,porteur,'CC_Base_Spine02',cellule.pousse?.8:.55);}
    }
    // Maul : chacun saisit le coéquipier devant lui ; le porteur garde ses mains sur le ballon.
    if(e.phase==='maul'){
      const porteur=match.maulHolder(visualTime);
      for(const [id,slot] of match.slots){
        if(slot.kind!=='maul'||slot.role==='garde'||id===porteur)continue;
        const p=match.byId.get(id),actor=actors.get(id);if(!p||!actor||p.arrival>.5)continue;
        const fx=-Math.sin(actor.heading),fz=-Math.cos(actor.heading);
        let best=null,score=Infinity;
        for(const [other,s2] of match.slots){
          if(other===id||s2.kind!=='maul'||s2.role==='garde')continue;
          const q=actors.get(other);if(!q)continue;
          const dx=q.group.position.x-actor.group.position.x,dz=q.group.position.z-actor.group.position.z,ahead=dx*fx+dz*fz,d=Math.hypot(dx,dz);
          if(ahead>.15&&d<1.25&&d<score){score=d;best=q;}
        }
        if(best)bind(actor,best,'CC_Base_Spine02',.72);
      }
    }
  }

  // ── Poses : fondus entre deux gestes, allures, superpositions ────────────
  function snapshot(a){
    const s=a.snapshot;let i=0;
    for(const b of a.osComplets||a.pose.bones){b.bone.quaternion.toArray(s,i);i+=4;}
    s[i]=a.pose.hips.position.x;s[i+1]=a.pose.hips.position.y;s[i+2]=a.pose.hips.position.z;
  }
  function crossFade(a,k){
    const s=a.snapshot;let i=0;
    for(const b of a.osComplets||a.pose.bones){qa.fromArray(s,i);b.bone.quaternion.copy(qa.slerp(b.bone.quaternion,k));i+=4;}
    const h=a.pose.hips.position;h.set(s[i]+(h.x-s[i])*k,s[i+1]+(h.y-s[i+1])*k,s[i+2]+(h.z-s[i+2])*k);
  }
  /**
   * Pose complète d'un acteur pour cette image.
   * `v` est sa vitesse réelle (m/s) : c'est elle qui cadence la foulée.
   */
  function posePlayer(a,m,v,simDt,still){
    const clips=motions.clips;
    a.idleClock+=simDt;
    const key=m.loco?'loco':m.name;
    if(key!==a.key){
      // Changement de geste : on part de la pose affichée, jamais d'une pose neutre.
      if(a.key!==undefined&&!snap)snapshot(a);
      a.fadeFor=m.fondu??(m.loco||a.key==='loco'?.24:.16);a.fade=a.key===undefined||snap?1:0;a.key=key;if(!m.loco)a.cycle=m.time;
    }
    let clip=null,time=0;
    if(m.loco){
      const fx=-Math.sin(a.heading),fz=-Math.cos(a.heading);
      const loc=locomotion(a.gait,gaits[a.kind],v.x*fx+v.z*fz,v.x*(-fz)+v.z*fx,simDt);
      const idle=clips[m.idle]||clips.light_idle;
      if(!loc)applyPose(a.pose,idle,a.idleClock,true);
      else{
        applyPose(a.pose,loc.clip,loc.time,true,1,loc.second,loc.secondTime,loc.weight);
        // À très petite vitesse, la marche se fond dans l'attente.
        if(loc.idle>.02)applyPose(a.pose,idle,a.idleClock,true,smooth(loc.idle));
      }
    }else{
      clip=clips[m.name]||clips.idle;
      if(m.rate!==undefined){a.cycle+=simDt*m.rate;time=a.cycle;}
      else time=m.normalized?m.time*clip.duration:m.time;
      applyPose(a.pose,clip,time,m.loop);
    }
    // Ballon porté : les bras seuls, la course continue dessous.
    if(m.carry==='bras'&&clips.hold_ball_side_01)applyPose(a.pose,clips.hold_ball_side_01,0,false,.92,null,0,0,'arms');
    else if(m.carry==='deux'&&clips.kickoff_hold_ball_idle)applyPose(a.pose,clips.kickoff_hold_ball_idle,a.idleClock,true,.95,null,0,0,'arms');
    if(m.upper&&clips[m.upper.name]&&m.upper.weight>.01)applyPose(a.pose,clips[m.upper.name],m.upper.time,m.upper.loop??false,m.upper.weight,null,0,0,'upper');
    if(a.fade<1){a.fade=Math.min(1,a.fade+simDt/Math.max(.05,a.fadeFor)+(still?1:0));crossFade(a,smooth(a.fade));}
    if(m.raise||m.sway)raiseTorso(a,m.raise||0,m.sway||0);
    return {clip,time};
  }
  function orient(a,target,dt,rate=9){
    // ⚠️ Les TROIS angles, pas seulement le lacet : un ralenti écrit le quaternion du groupe, et three en redéduit
    // des angles où un demi-tour devient (π, π−θ, π). Ne reposer que y laissait le joueur retourné après chaque essai.
    if(target===null||target===undefined||!Number.isFinite(target)){a.group.rotation.set(0,a.heading,0);return;}
    const delta=Math.atan2(Math.sin(target-a.heading),Math.cos(target-a.heading));
    // Rotation bornée : un joueur ne pivote pas d'un demi-tour en une image.
    // Un vrai demi-tour se fait d'un appui : le corps rattrape vite sa course au lieu de la suivre à reculons.
    const plafond=dt*(Math.abs(delta)>1.75&&rate>=9?13:7.5);
    a.heading+=snap?delta:clamp(delta*Math.min(1,dt*rate),-plafond,plafond);
    a.group.rotation.set(0,a.heading,0);
  }
  /** Place l'acteur : corps physique, ou geste ancré (racine du clip, place de formation). */
  function placePlayer(a,p,m,played,base,simDt,still){
    if(m.anchor&&played.clip){
      const an=m.anchor,key=a.kind;
      let ox=0,oz=0;
      if(an.mode==='abs'){rootAt(played.clip,key,played.time,m.loop,rootNow);ox=rootNow.x;oz=rootNow.z;}
      else if(an.mode==='rel'||an.ref){
        rootAt(played.clip,key,played.time,m.loop,rootNow);rootAt(played.clip,key,an.ref==='end'?played.clip.duration:an.t0??0,false,rootRef);
        ox=rootNow.x-rootRef.x;oz=rootNow.z-rootRef.z;
      }
      const c=Math.cos(an.heading),s=Math.sin(an.heading);
      tmp.set(an.x+ox*c+oz*s,0,an.z-ox*s+oz*c);
      if(a.anchorBlend<=0)a.entry.copy(snap?tmp:a.shown);
      a.anchorBlend=Math.min(1,a.anchorBlend+(snap||still?1:simDt/(an.fondu??.28)));
      a.group.position.lerpVectors(a.entry,tmp,smooth(a.anchorBlend));
      match.physics.pin(p.id,a.group.position.x,a.group.position.z);
      a.heading=snap?an.heading:a.heading;orient(a,an.heading,simDt||.016,an.pivot??12);
      return;
    }
    if(a.anchorBlend>0){a.anchorBlend=0;match.physics.unpin(p.id);}
    a.group.position.copy(base);
  }
  // ── Attentes vivantes ─────────────────────────────────────────────────────
  // Pendant un arrêt de jeu, chacun enchaîne ses propres gestes d'attente :
  // changer d'appui, mains sur les hanches, bras croisés, regard levé, deux ou
  // trois pas. Le premier geste est pris en cours de route et la suite est tirée
  // joueur par joueur — trente statues ne s'animent jamais au même instant.
  const ATTENTES=['PlayerIdleSpot01_001','PlayerIdleSpot02_001','PlayerIdleSpot03_002','PlayerIdleSpot04_002','PlayerIdleSpot05_001','PlayerIdleSpot06_001','PlayerIdleSpot07_001','PlayerReady01_002','PlayerReady05_001','menu_idle_breathing_arms_folded','menu_idle_breathing_legs_apart','menu_idle_look_up','PlayerIdleWandering01_001','PlayerIdleWandering02_001','light_idle','heavy_idle'].filter(n=>motions.clips[n]);
  function vivre(a,m){
    const clips=motions.clips,w=a.attente??={n:0,nom:null,fin:0};
    if(!ATTENTES.length)return;
    if(!a.vivait||!w.nom||a.idleClock>=w.fin){
      let nom=w.nom;for(let essai=0;essai<5&&nom===w.nom;essai++)nom=ATTENTES[Math.floor(tirage(a.graine,20+w.n++)*ATTENTES.length)];
      const duree=clips[nom].duration,depart=a.vivait?0:tirage(a.graine,90+w.n)*duree*.7;
      // Il se tourne vers ce qu'il regarde, sans pivoter pour un rien.
      let cap=a.heading;
      if(m.regard){const vise=Math.atan2(m.regard.x-a.shown.x,m.regard.z-a.shown.z)+Math.PI,delta=Math.atan2(Math.sin(vise-cap),Math.cos(vise-cap));if(Math.abs(delta)>.45)cap=vise-Math.sign(delta)*.2;}
      Object.assign(w,{nom,debut:a.idleClock-depart,t0:depart,fin:a.idleClock-depart+duree-.05,ancre:{x:a.shown.x,z:a.shown.z,heading:cap}});
    }
    a.vivait=true;
    m.loco=false;m.name=w.nom;m.time=a.idleClock-w.debut;m.loop=false;m.fondu=.5;
    m.anchor={...w.ancre,mode:'rel',t0:w.t0,fondu:.5,pivot:2.4};
  }
  /**
   * Le receveur s'ouvre vers le ballon : le buste tourne vers lui (pas plus
   * d'un quart de tour), la tête finit le geste. Les jambes gardent leur course.
   */
  function ouvrir(a,vise){
    const poids=clamp(vise.poids??1,0,1);if(poids<.02)return;
    const dx=vise.x-a.group.position.x,dz=vise.z-a.group.position.z,n=Math.hypot(dx,dz);if(n<.3)return;
    const fx=-Math.sin(a.heading),fz=-Math.cos(a.heading);
    const angle=Math.atan2(fz*dx-fx*dz,fx*dx+fz*dz);
    raiseTorso(a,0,clamp(angle,-.8,.8)*.6*poids);
    trackBall(a,tmp.set(vise.x,vise.y??1.3,vise.z),.45+.4*poids);
  }
  // ── Gestes construits ─────────────────────────────────────────────────────
  // L'APK n'a ni coup de poing ni bousculade. Ils sont construits ici, par
  // cinématique inverse sur les bras et inclinaison du buste : deux directs
  // brefs vers la tête, ou les deux mains qui repoussent la poitrine.
  const gestesConstruits=[],cloche=(t,centre,largeur)=>Math.exp(-(((t-centre)/largeur)**2));
  // ── Correctif 30 : les gestes construits de la bibliothèque ───────────────
  // Rien de tout cela n'existe dans l'APK : la main du raffut qui se POSE sur le défenseur, les mains du gratteur sur le
  // ballon, les bras qui se referment trop haut, le maillot qu'on agrippe, les bras écartés de celui qui sépare, le ballon
  // brandi, l'arbitre qui dessine l'écran. Cinématique inverse des bras, par-dessus le geste en cours.
  const osVise=new THREE.Vector3(),aPortee=(a,point,portee=.74)=>{
    const ep=a.model.getObjectByName('CC_Base_Spine02');if(!ep)return point;
    ep.getWorldPosition(osVise);tmp3.copy(point).sub(osVise);const n=tmp3.length();
    // Un bras ne s'allonge pas : au-delà de sa portée, la main s'arrête sur la droite épaule → cible.
    if(n>portee)point.copy(osVise).addScaledVector(tmp3,portee/n);return point;
  };
  function construire30(a,proc){
    const fx=-Math.sin(a.heading),fz=-Math.cos(a.heading),dx=-fz,dz=fx;
    const buste=a.model.getObjectByName('CC_Base_Spine02');if(!buste)return false;
    if(proc.type==='mainsBallon'){
      // Le gratteur : il prend appui, pose les deux mains sur le ballon, puis le tire à lui.
      const pose=smooth(clamp(proc.t/Math.max(.15,proc.appui*.8),0,1)),tire=proc.tire?smooth(clamp((proc.t-proc.appui)/Math.max(.2,proc.fin-proc.appui),0,1)):0;
      const w=pose*(1-smooth(clamp((proc.t-proc.fin)/.25,0,1)));if(w<.02)return true;
      gripR.copy(ballMesh.position);gripR.y=Math.max(gripR.y,.15)+tire*.17;gripR.x-=fx*tire*.13;gripR.z-=fz*tire*.13;
      gripL.copy(gripR);gripR.x+=dx*.11;gripR.z+=dz*.11;gripL.x-=dx*.11;gripL.z-=dz*.11;
      grip(a,aPortee(a,gripR,.82),'right',w);grip(a,aPortee(a,gripL,.82),'left',w);a.group.updateMatrixWorld(true);return true;
    }
    if(proc.type==='mainsVers'){
      const w=clamp(proc.poids,0,1);if(w<.02)return true;
      gripR.set(proc.point.x,proc.point.y,proc.point.z);gripL.copy(gripR);gripR.x+=dx*.1;gripR.z+=dz*.1;gripL.x-=dx*.1;gripL.z-=dz*.1;
      grip(a,aPortee(a,gripR),'right',w);grip(a,aPortee(a,gripL),'left',w);a.group.updateMatrixWorld(true);return true;
    }
    if(proc.type==='ballonLeve'){
      const u=clamp(proc.t/proc.duree,0,1),g=smooth(u/.2)*smooth((1-u)/.25);if(g<.02)return true;
      buste.getWorldPosition(gripR);gripR.x+=dx*.2+fx*.08;gripR.z+=dz*.2+fz*.08;gripR.y+=.7;raiseTorso(a,.06*g,0);
      grip(a,gripR,'right',g);a.group.updateMatrixWorld(true);return true;
    }
    if(proc.type==='ecran'||proc.type==='separer'||proc.type==='ecarter'){
      const u=clamp(proc.t/Math.max(.4,proc.duree),0,1),g=smooth(u/.15)*smooth((1-u)/.2);if(g<.02)return true;
      buste.getWorldPosition(gripR);gripL.copy(gripR);
      if(proc.type==='ecran'){
        // L'arbitre demande la vidéo : les deux mains dessinent un rectangle devant lui, du haut vers le bas, deux fois.
        const k=(proc.t%1.7)/1.7,large=k<.3?k/.3:k<.7?1:1-(k-.7)/.3,haut=k<.3?1:k<.7?1-(k-.3)/.4*2:-1;
        const ex=.3*large,ey=.14+.17*haut;
        gripR.x+=dx*ex+fx*.38;gripR.z+=dz*ex+fz*.38;gripR.y+=ey;gripL.x+=-dx*ex+fx*.38;gripL.z+=-dz*ex+fz*.38;gripL.y+=ey;
      }else{
        // Celui qui sépare : les bras écartés, une paume vers chacun des deux hommes.
        const e2=proc.type==='separer'?.66:.6;
        gripR.x+=dx*e2+fx*.14;gripR.z+=dz*e2+fz*.14;gripL.x+=-dx*e2+fx*.14;gripL.z+=-dz*e2+fz*.14;gripR.y-=.02;gripL.y-=.02;
      }
      grip(a,gripR,'right',g);grip(a,gripL,'left',g);a.group.updateMatrixWorld(true);return true;
    }
    if(!['raffut','brasHaut','saisir','parler'].includes(proc.type))return false;
    const cible=proc.cible&&actors.get(proc.cible);if(!cible)return true;
    const u=clamp(proc.t/Math.max(.3,proc.duree),0,1);
    const corps=cible.model.getObjectByName('CC_Base_Spine02');if(!corps)return true;
    if(proc.type==='raffut'){
      const g=smooth(u/.18)*smooth((1-u)/.3)*(proc.poids??1);if(g<.02)return true;
      if(proc.os==='epaule'){
        // L'épaule du défenseur la plus proche du porteur.
        buste.getWorldPosition(osVise);let mieux=Infinity;
        for(const nom of ['CC_Base_L_Clavicle','CC_Base_R_Clavicle']){const os=cible.model.getObjectByName(nom);if(!os)continue;os.getWorldPosition(tmp);const dd=tmp.distanceToSquared(osVise);if(dd<mieux){mieux=dd;gripR.copy(tmp);}}
        if(mieux===Infinity)corps.getWorldPosition(gripR);
      }else{corps.getWorldPosition(gripR);gripR.y+=.05;}
      raiseTorso(a,-.05*g,(proc.cote<0?1:-1)*.12*g);
      grip(a,aPortee(a,gripR,.78),proc.cote<0?'left':'right',Math.min(1,g*1.1));
    }else if(proc.type==='brasHaut'){
      // Plaquage haut : les deux bras se referment à hauteur des épaules de la victime.
      const g=smooth(u/.2)*smooth((1-u)/.3);if(g<.02)return true;
      const cou=cible.model.getObjectByName('CC_Base_NeckTwist01')||corps;cou.getWorldPosition(gripR);gripR.y-=.07;gripL.copy(gripR);
      gripR.x+=dx*.15;gripR.z+=dz*.15;gripL.x-=dx*.15;gripL.z-=dz*.15;
      grip(a,aPortee(a,gripR,.8),'right',g);grip(a,aPortee(a,gripL,.8),'left',g);
    }else if(proc.type==='saisir'){
      // Par le maillot : les deux mains à la poitrine de l'autre, et ça tire — sans coup, sans chute.
      const g=smooth(u/.1)*smooth((1-u)/.18);if(g<.02)return true;
      const secoue=.035*Math.sin(proc.t*8.5+(proc.reponse?1.6:0));
      corps.getWorldPosition(gripR);gripR.y+=.12+secoue;gripL.copy(gripR);
      gripR.x+=dx*.12;gripR.z+=dz*.12;gripL.x-=dx*.12;gripL.z-=dz*.12;
      raiseTorso(a,-.1*g,.07*Math.sin(proc.t*4.3)*g);
      grip(a,aPortee(a,gripR,.7),'right',g);grip(a,aPortee(a,gripL,.7),'left',g);
    }else{
      // On se parle : un doigt pointé vers la poitrine de l'autre — ou, pour celui qui répond, les deux mains ouvertes.
      const g=smooth(u/.2)*smooth((1-u)/.25)*(.78+.22*Math.sin(proc.t*7));if(g<.02)return true;
      if(proc.reponse){
        buste.getWorldPosition(gripR);gripL.copy(gripR);
        gripR.x+=dx*.4+fx*.28;gripR.z+=dz*.4+fz*.28;gripL.x+=-dx*.4+fx*.28;gripL.z+=-dz*.4+fz*.28;gripR.y-=.22;gripL.y-=.22;
        grip(a,gripR,'right',g);grip(a,gripL,'left',g);
      }else{corps.getWorldPosition(gripR);gripR.y+=.1;grip(a,aPortee(a,gripR,.6),'right',g);}
    }
    a.group.updateMatrixWorld(true);return true;
  }
  function construire(a,proc){
    if(construire30(a,proc))return;
    if(['appel','mainsLevees','pointer','parDessus'].includes(proc.type)){
      // Bras levé pour réclamer le ballon, mains levées du joueur sifflé hors-jeu,
      // bras tendu du demi de mêlée qui annonce son côté, équilibre d'un petit
      // par-dessus : aucun n'existe dans l'APK. Les mains vont chercher un point
      // repéré depuis les épaules ; le reste du corps garde le geste en cours.
      const epaules=a.model.getObjectByName('CC_Base_Spine02');if(!epaules)return;
      epaules.getWorldPosition(gripR);gripL.copy(gripR);
      const fx=-Math.sin(a.heading),fz=-Math.cos(a.heading),dx=-fz,dz=fx;
      const u=clamp(proc.t/Math.max(.3,proc.duree),0,1),g=smooth(u/.22)*smooth((1-u)/.28);
      if(g<.02)return;
      if(proc.type==='appel'){
        const c=proc.cote>=0?1:-1,agite=.05*Math.sin(proc.t*11);
        gripR.x+=dx*(.26+agite)*c+fx*.16;gripR.z+=dz*(.26+agite)*c+fz*.16;gripR.y+=.66;
        grip(a,gripR,c>0?'right':'left',Math.min(1,g*1.1));
      }else if(proc.type==='mainsLevees'){
        raiseTorso(a,.07*g,0);
        gripR.x+=dx*.34+fx*.24;gripR.z+=dz*.34+fz*.24;gripR.y+=.3;
        gripL.x+=-dx*.34+fx*.24;gripL.z+=-dz*.34+fz*.24;gripL.y+=.3;
        grip(a,gripR,'right',g);grip(a,gripL,'left',g);
      }else if(proc.type==='pointer'){
        const px=proc.point.x-gripR.x,pz=proc.point.z-gripR.z,n=Math.hypot(px,pz)||1,aDroite=dx*px+dz*pz>=0;
        raiseTorso(a,.12*g,(aDroite?-1:1)*.22*g);
        gripR.x+=px/n*.7;gripR.z+=pz/n*.7;gripR.y+=.04;
        grip(a,gripR,aDroite?'right':'left',g);
      }else{
        // Petit par-dessus : buste en arrière au moment de la frappe, bras ouverts pour l'équilibre.
        raiseTorso(a,.2*g,0);
        gripR.x+=dx*.52-fx*.12;gripR.z+=dz*.52-fz*.12;gripR.y+=.06;
        gripL.x+=-dx*.44+fx*.24;gripL.z+=-dz*.44+fz*.24;gripL.y+=.14;
        grip(a,gripR,'right',g*.85);grip(a,gripL,'left',g*.85);
      }
      a.group.updateMatrixWorld(true);return;
    }
    if(proc.point){
      // Chistera et offload à une main : aucune animation dans l'APK. Le bras
      // va chercher le soutien — dans le dos pour la chistera, tendu sur le
      // côté pour l'offload — et le buste accompagne.
      const buste=a.model.getObjectByName('CC_Base_Spine02');if(!buste)return;
      buste.getWorldPosition(gripR);
      const dx=proc.point.x-gripR.x,dz=proc.point.z-gripR.z,n=Math.hypot(dx,dz)||1,rx=dx/n,rz=dz/n;
      const fx=-Math.sin(a.heading),fz=-Math.cos(a.heading),aDroite=(-fz)*rx+fx*rz>=0;
      const geste=cloche(clamp(proc.t/Math.max(.3,proc.duree),0,1.4),.4,.24);
      if(proc.type==='chistera'){
        gripR.x+=-fx*.27+rx*.36;gripR.z+=-fz*.27+rz*.36;gripR.y-=.17;
        raiseTorso(a,0,(aDroite?-1:1)*.22*geste);
        grip(a,gripR,aDroite?'left':'right',Math.min(1,geste*1.15));
      }else{
        gripR.x+=rx*.62+fx*.05;gripR.z+=rz*.62+fz*.05;gripR.y+=.03;
        raiseTorso(a,-.08*geste,(aDroite?-1:1)*.3*geste);
        grip(a,gripR,aDroite?'right':'left',Math.min(1,geste*1.15));
      }
      a.group.updateMatrixWorld(true);return;
    }
    const cible=proc.cible&&actors.get(proc.cible);if(!cible)return;
    const u=clamp(proc.t/Math.max(.4,proc.duree),0,1);
    if(proc.type==='poing'){
      const tete=cible.model.getObjectByName('CC_Base_Head');if(!tete)return;
      const droite=cloche(u,.22,.085),gauche=cloche(u,.55,.09),elan=Math.max(droite,gauche);
      raiseTorso(a,-.1*elan,(gauche-droite)*.55);
      tete.getWorldPosition(gripR);gripR.y-=.04;gripL.copy(gripR);
      if(droite>.02)grip(a,gripR,'right',Math.min(1,droite*1.15));
      if(gauche>.02)grip(a,gripL,'left',Math.min(1,gauche*1.15));
    }else{
      const buste=cible.model.getObjectByName('CC_Base_Spine02');if(!buste)return;
      const pousse=Math.max(cloche(u,.3,.13),cloche(u,.68,.11)*.8);
      raiseTorso(a,-.24*pousse,0);
      buste.getWorldPosition(gripL);gripR.copy(gripL);
      const ecart=tmp.set(.16,0,0).applyQuaternion(a.group.quaternion);gripL.sub(ecart);gripR.add(ecart);
      grip(a,gripL,'left',Math.min(1,pousse*1.1));grip(a,gripR,'right',Math.min(1,pousse*1.1));
    }
    a.group.updateMatrixWorld(true);
  }
  const vus=new Set();
  function render(dt,still=false){
    if(tele.ralenti.actif&&!still){renduRalenti(dt);return;}
    const fige=paused&&!still;
    const offset=still?0:match.offset(),visualTime=match.time+offset,simDt=fige?0:dt*(still?1:speed);
    const alpha=snap||still?1:match.alpha();
    match.slots=match.formation(offset);
    const ball=match.ball,e=match.e,open=['jeuCourant','ballonEnLAir','ballonLibre'].includes(e.phase);
    // La phase en cours réclame sa banque si elle n'est pas encore arrivée (un écran qui rejoint un direct en pleine mêlée).
    demanderBanque(BANQUE_DE_LA_PHASE[e.phase]);
    vus.clear();
    for(const p of match.players){
      const a=actorFor(p);vus.add(p.id);
      const m=match.motion(p,offset);a.group.visible=p.visible;a.motion=m;
      // À la première image d'un état qu'on vient de brancher, l'acteur n'a pas
      // encore été posé : sa dernière place connue est celle d'un autre match
      // (ou le centre du terrain). On ne l'y ancre pas.
      if(m.vivant&&!snap)vivre(a,m);else a.vivait=false;
      const previous=match.previous.get(p.id);
      tmp2.set(previous?THREE.MathUtils.lerp(previous.x,p.x,alpha):p.x,0,previous?THREE.MathUtils.lerp(previous.z,p.z,alpha):p.z);
      const base=tmp2.clone(),speedNow=Math.hypot(p.vx,p.vz);
      // Cap : celui du geste, sinon la course ; à petite vitesse en reculant,
      // le joueur garde le jeu devant lui au lieu de lui tourner le dos.
      let heading=m.heading;
      if(heading===null&&m.loco){
        if(speedNow>.35){
          heading=Math.atan2(p.vx,p.vz)+Math.PI;
          // ⚠️ ON NE COURT PAS EN ARRIÈRE. On recule face au jeu en marchant ou en
          // trottinant ; au-delà, on se retourne et on court, la tête seule suit
          // le ballon. La règle valait jusqu'à 2,7 m/s : des joueurs traversaient
          // le terrain à reculons, « en regardant ailleurs ».
          if(open&&speedNow<1.9&&p.id!==match.carrier){
            const bx=ball.x-base.x,bz=ball.z-base.z,d=Math.hypot(bx,bz);
            if(d>3&&d<34&&(bx*p.vx+bz*p.vz)/(d*speedNow)<-.35)heading=Math.atan2(bx,bz)+Math.PI;
          }
        }else if(p.id===match.carrier)heading=p.team===0?Math.PI:0;
        else if(m.regard)heading=Math.atan2(m.regard.x-base.x,m.regard.z-base.z)+Math.PI;
      }
      if(!m.anchor)orient(a,heading,snap?1:simDt||.0001,m.pivot??(m.regard&&speedNow<=.35?2.2:9));
      // Hors champ, seule la position continue : aucune pose ni IK n'est calculée inutilement.
      // La sphère est volontairement large ; une coupe de caméra ou un geste remet immédiatement la pose complète.
      bouleCorps.center.set(base.x,.95,base.z);bouleCorps.radius=3.5;
      const loinDuBallon=Math.hypot(base.x-ball.x,base.z-ball.z)>25;
      const horsVue=options.animationsEconomes!==false&&!snap&&!still&&open&&m.loco&&!m.upper&&!m.carry&&loinDuBallon&&!champ.intersectsSphere(bouleCorps);
      if(horsVue){
        a.group.position.copy(base);a.shown.copy(base);a.poseIgnoree=true;continue;
      }
      if(a.poseIgnoree){a.key=undefined;a.poseIgnoree=false;}
      const distant=options.animationsEconomes!==false&&!snap&&!still&&open&&m.loco&&!m.upper&&!m.carry&&loinDuBallon&&camera.position.distanceToSquared(base)>4900;
      // À distance, les doigts et les yeux ne demandent aucun échantillonnage. Les membres, le visage et la foulée restent interpolés.
      const osComplets=a.pose.bones;
      a.osComplets??=osComplets;
      if(distant){a.osLointains??=osComplets.filter(b=>!/Thumb|Index|Ring|Mid|Pinky|Eye|Jaw/.test(b.name));a.pose.bones=a.osLointains;}
      // ── Correctif 30 : NIVEAUX DE DÉTAIL DES ANIMATIONS ──────────────────────
      // Une interaction près du ballon se pose à chaque image, en entier. Un joueur qui ne fait que courir ou attendre loin
      // de l'action n'est reposé qu'une image sur deux (au-delà de 40 m de la caméra) ou sur trois (au-delà de 70 m) : sa place
      // et son cap suivent toujours le moteur, seule la pose de ses os attend — le temps sauté est rendu à la pose suivante.
      // Un geste, un fondu, un ballon porté, une attente vivante : pose complète, toujours.
      const dCam=camera.position.distanceToSquared(base);
      const simple=options.animationsEconomes!==false&&!snap&&!still&&m.loco&&!m.upper&&!m.carry&&!m.proc&&!m.vivant&&a.key==='loco'&&a.fade>=1&&Math.hypot(base.x-ball.x,base.z-ball.z)>(leger?10:14);
      const saut=!simple?1:dCam>(leger?2500:4900)?3:dCam>(leger?900:1600)?2:1;
      a.lodTour=((a.lodTour|0)+1)%saut;
      if(saut>1&&a.lodTour){
        a.pose.bones=osComplets;a.lodDt=(a.lodDt||0)+simDt;posesEvitees++;
        if(a.anchorBlend>0){a.anchorBlend=0;match.physics.unpin(p.id);}
        a.group.position.copy(base);a.shown.copy(base);continue;
      }
      const dtPose=simDt+(a.lodDt||0);a.lodDt=0;posesFaites++;
      const played=posePlayer(a,m,{x:p.vx,z:p.vz},dtPose,still);
      a.pose.bones=osComplets;
      placePlayer(a,p,m,played,base,simDt,still);
      a.shown.copy(a.group.position);
      if(m.air){a.model.position.y=a.baseY;a.lift=0;a.group.updateMatrixWorld(true);}else groundBody(a,simDt||.016);
      if(m.proc)gestesConstruits.push([a,m.proc]);
      if(m.ouvre)ouvrir(a,m.ouvre);
      else if(!distant&&(m.watch||match.flight?.type==='pied'&&m.loco))trackBall(a,tmp.set(ball.x,Math.max(.3,ball.y),ball.z),m.watch?.55:.28);
      else if(!distant&&m.regard&&m.loco)trackBall(a,tmp.set(m.regard.x,m.regard.y??1.5,m.regard.z),.5);
    }
    // Après la pose de tout le monde : un geste construit vise le corps de l'adversaire tel qu'il est affiché.
    for(const [a,proc] of gestesConstruits)construire(a,proc);
    gestesConstruits.length=0;
    // Un joueur remplacé ou exclu quitte la pelouse : son modèle ne reste pas planté là.
    for(const [id,a] of actors)if(!vus.has(id))a.group.visible=false;
    renderOfficials(simDt,visualTime);
    bindings(match.progress(offset),visualTime);
    renderBall(simDt,visualTime,offset,alpha,still);
    const porteur=match.carrier&&open?actors.get(match.carrier):null;
    halo.position.set(ballMesh.position.x,.035,ballMesh.position.z);halo.visible=!!porteur;halo.material.color.set(teintesHalo[match.team]);
    const moi=options.moi&&actors.get(options.moi);
    aura.visible=!!moi&&moi.group.visible;if(aura.visible){aura.position.set(moi.group.position.x,.03,moi.group.position.z);aura.material.opacity=.6+.25*Math.sin(visualTime*4);}
    dessinerReperes(visualTime);
    renderCamera(dt,visualTime);
    // Le nom du porteur, dans sa flamme, sous ses appuis.
    if(porteur&&porteur.nom&&options.noms!==false){
      etiquette.ecrire(porteur.nom,match.team===0?tenueA.principal:tenueB.principal);
      const sp=etiquette.sprite,d=camera.position.distanceTo(porteur.group.position),h=d*Math.tan(camera.fov*Math.PI/360)*2*(leger?.062:.05)*clamp(900/hauteur,.75,1.6);
      sp.position.set(porteur.group.position.x,-.06,porteur.group.position.z);sp.scale.set(h*4,h,1);sp.visible=true;
    }else etiquette.sprite.visible=false;
    if(!still&&!fige)tele.enregistrer(visualTime);
    const horsChamp=elaguer();
    renderer.render(scene,camera);snap=false;
    for(const g of horsChamp)g.visible=true;
  }

  // ── Arbitres ──────────────────────────────────────────────────────────────
  const TOUCHE_X=36.3;
  function renderOfficials(simDt,visualTime){
    const e=match.e,ref=e.arbitre||{pos:{x:54,y:26},vitesse:{x:0,y:0}},clips=motions.clips;
    const tir=e.tir,kick=match.flight?.type==='pied'?match.flight:null;
    for(let i=0;i<officials.length;i++){
      const a=officials[i],st=a.state;let upper=null,heading=null,full=null;
      if(i===0){
        // Arbitre central : position du moteur, lissée entre deux pas.
        const pos=xyz(ref.pos);
        if(snap){st.x=pos.x;st.z=pos.z;}
        else{const k=1-Math.exp(-(simDt||0)*9);st.x+=(pos.x-st.x)*k;st.z+=(pos.z-st.z)*k;}
        st.vx=ref.vitesse.y;st.vz=ref.vitesse.x;
        const card=match.card&&visualTime-match.card.start<5.8,age=visualTime-(match.card?.start||0);
        const sifflet=match.whistle&&visualTime-match.whistle.start<5.4?match.whistle:null;
        // Correctif 30 — LE GESTE CORRESPOND À LA DÉCISION. Le moteur dit laquelle (`signalArbitre`, lu sur l'état que tout
        // écran possède) ; la bibliothèque dit quel signal de l'APK la porte. Ces signaux étaient joués… par le joueur fautif.
        const signal=match.outils.signalArbitre?.(e)??null,S=signal?ARBITRE[signal]:null;
        let construit=null;
        if(S?.construit==='ecran'&&e.tmo)construit={type:'ecran',t:visualTime-(st.tmoDepuis??=visualTime),duree:1e6};else st.tmoDepuis=undefined;
        const alt=e.altercation&&visualTime<e.altercation.fin?e.altercation:null;
        if(alt){const lieu=xyz(alt.lieu);heading=Math.atan2(lieu.x-st.x,lieu.z-st.z)+Math.PI;if(Math.hypot(lieu.x-st.x,lieu.z-st.z)<4.5&&alt.niveau>=2)construit={type:'separer',t:visualTime-alt.debut,duree:alt.fin-alt.debut};}
        st.construit=construit;
        const m=e.conquete?.melee;
        // Avertissement : il appelle le capitaine d'un geste et lui parle, tourné vers lui.
        const appel=match.whistle?.avertissement&&e.phase==='penalite'&&clips.RefereeCallOverPlayer01_001?visualTime-match.whistle.start-1.2:-1;
        if(card)full={name:'RefereeCard01_002',time:clamp(age/5.8,0,1)*clips.RefereeCard01_002.duration};
        else if(appel>=0&&appel<7.4){
          full={name:'RefereeCallOverPlayer01_001',time:appel};
          const cap=actors.get(match.whistle.avertissement);
          if(cap)heading=Math.atan2(cap.group.position.x-st.x,cap.group.position.z-st.z)+Math.PI;
        }
        else if(tir?.etape==='celebration'&&visualTime-tir.etapeDepuis<2)upper={name:'try',time:visualTime-tir.etapeDepuis};
        else if(sifflet&&!construit){
          const t=visualTime-sifflet.start,nom=S?.clip&&!S.plein&&clips[S.clip]?S.clip:null,apres=S?.apres&&clips[S.apres]?S.apres:null;
          // Le coup de sifflet, le bras de la pénalité, puis le signal de la faute : ballon gardé, plaquage haut, hors-jeu…
          if(t<1)upper={name:'whistle',time:t*1.6};
          else if(apres&&t<2.05)upper={name:apres,time:t-1};
          else if(nom){const tt=(t-(apres?2.05:1))*(S.cadence||1);if(tt<clips[nom].duration)upper={name:nom,time:tt};}
          else if(t<2.4)upper={name:/enAvant|passeAvant/.test(sifflet.cle)?'knock_on':/hors-jeu/.test(e.penalite?.motif||'')&&clips.indicate_offside_low?'indicate_offside_low':'penalty',time:t-1};
        }else if(m&&m.etape==='placement'&&signal==='maul-injouable'&&clips.unplayable_maul&&visualTime-match.phaseStart<2.7)upper={name:'unplayable_maul',time:visualTime-match.phaseStart};
        else if(m&&m.etape==='placement'&&visualTime-match.phaseStart<1.9)upper={name:'forming_a_scrum',time:visualTime-match.phaseStart};
        a.card.visible=!!card&&age>3.5&&age<4.5;
        if(a.card.visible){a.rightHand.getWorldPosition(a.card.position);a.card.material.color.set(match.card.red?'#e32622':'#ffe229');a.card.quaternion.copy(a.group.quaternion);a.card.position.y+=.065;}
      }else{
        // Arbitre de touche : il court le long de sa ligne, à hauteur du ballon.
        const side=i===1?-1:1;let tx=side*TOUCHE_X,tz,vmax=6.2,zone=1.1;
        // Correctif 30 : regroupement général — les juges de touche entrent sur la pelouse aider l'arbitre à séparer.
        const melee=e.altercation&&e.altercation.niveau===3&&visualTime<e.altercation.fin?xyz(e.altercation.lieu):null;
        if(melee){tx=melee.x+side*2.6;tz=melee.z;vmax=7;zone=.6;}
        else
        if(tir&&(tir.etape==='pose'||tir.etape==='vise'||tir.etape==='pret'||tir.etape==='elan'||tir.volLance)){
          // Tir au but : les deux juges vont se placer derrière les poteaux.
          const goal=tir.buteur.cote==='A'?1:-1;tx=side*3.6;tz=goal*51.7;vmax=6.5;zone=.3;
        }else if(kick){tz=xyz(kick.vers).z;vmax=8.4;zone=.6;}
        else{
          tz=match.ball.z+(match.carrier?clamp((match.byId.get(match.carrier)?.vz||0)*.5,-3,3):0);
          if(!['jeuCourant','ballonLibre'].includes(e.phase)){vmax=3.4;zone=1.6;}
        }
        tz=clamp(tz,-57,57);
        st.construit=melee&&Math.hypot(tx-st.x,tz-st.z)<1.6?{type:'separer',t:visualTime-e.altercation.debut,duree:e.altercation.fin-e.altercation.debut}:null;
        if(snap){st.x=tx;st.z=tz;st.vx=st.vz=0;}
        else if(simDt>0){
          const dx=tx-st.x,dz=tz-st.z,d=Math.hypot(dx,dz);
          // Il accélère franchement quand le ballon s'éloigne, ralentit en arrivant.
          const voulu=d<zone?0:Math.min(vmax,(d-zone*.6)*1.7),wx=d>0?dx/d*voulu:0,wz=d>0?dz/d*voulu:0;
          const ax=wx-st.vx,az=wz-st.vz,an=Math.hypot(ax,az),maxA=7*simDt,k=an>maxA?maxA/an:1;
          st.vx+=ax*k;st.vz+=az*k;st.x+=st.vx*simDt;st.z+=st.vz*simDt;
        }
        const sp=Math.hypot(st.vx,st.vz);
        // Lancé, il court dans l'axe ; pour un petit ajustement, il reste face au jeu.
        heading=sp>3.1?Math.atan2(st.vx,st.vz)+Math.PI:Math.atan2(match.ball.x-st.x,(match.ball.z-st.z)*.35)+Math.PI;
        const touche=e.phase==='touche'&&(match.ball.x<0)===(side<0),t=visualTime-match.phaseStart;
        const but=tir?.retombe&&tir.reussi;
        if(touche&&sp<1.2)upper={name:i===1?'ball_in_touch_left':'ball_in_touch_right',time:Math.min(t*1.15,clips.ball_in_touch_right.duration*.72)};
        else if(but)upper={name:'conversion',time:Math.min(visualTime-(st.butDepuis??=visualTime),2.6)};
        if(!but)st.butDepuis=undefined;
      }
      a.group.position.set(st.x,0,st.z);
      const sp=Math.hypot(st.vx,st.vz);
      if(heading===null)heading=sp>.5?Math.atan2(st.vx,st.vz)+Math.PI:Math.atan2(match.ball.x-st.x,match.ball.z-st.z)+Math.PI;
      orient(a,heading,snap?1:simDt||.0001,7);
      const m={loco:!full,name:full?.name,time:full?.time||0,loop:false,idle:'light_idle',upper:upper?{...upper,weight:1}:null};
      posePlayer(a,m,{x:st.vx,z:st.vz},simDt,false);
      groundBody(a,simDt||.016);
      if(st.construit)construire30(a,st.construit);
      if(a.flag){
        // Le drapeau prolonge l'avant-bras : bras le long du corps il pointe vers
        // le sol, bras levé il se dresse au-dessus de la tête.
        a.rightHand.getWorldPosition(handA);a.rightForearm.getWorldPosition(handB);
        tmp.copy(handA).sub(handB).normalize();
        a.flag.position.copy(handA);a.flag.quaternion.setFromUnitVectors(tmp2.set(0,1,0),tmp);
      }
    }
  }

  // ── Ballon ────────────────────────────────────────────────────────────────
  const ballState={key:'',from:new THREE.Vector3(),fade:1,fadeFor:.18,shown:new THREE.Vector3(),target:new THREE.Vector3(),spin:0};
  const SOL=.125;
  function hands(actor,target,one=false){
    actor.leftHand.getWorldPosition(handA);actor.rightHand.getWorldPosition(handB);
    if(one||handA.distanceTo(handB)>.42)target.copy(handB);else target.copy(handA).add(handB).multiplyScalar(.5);
    // Le ballon est tenu contre le corps, un peu en avant des poignets.
    tmp.set(-Math.sin(actor.heading),0,-Math.cos(actor.heading));
    return target.addScaledVector(tmp,.06);
  }
  function renderBall(simDt,visualTime,offset,alpha,still){
    const e=match.e,st=ballState,t=st.target,tir=e.tir,m=e.conquete?.melee,positionVol=match.outils.positionVol;
    let key='sol',orientation='sol',heading=0;
    // Ballon au sol ou libre : interpolé entre deux pas du moteur, comme les joueurs.
    const avant=match.previousBall||match.ball,lerp=THREE.MathUtils.lerp;
    t.set(lerp(avant.x,match.ball.x,alpha),Math.max(SOL,lerp(avant.y??match.ball.y,match.ball.y,alpha)),lerp(avant.z,match.ball.z,alpha));
    teeMesh.visible=false;
    const flight=match.flight;
    if(flight){
      const sample=positionVol(flight,offset),pos=xyz(sample),next=positionVol(flight,offset+.015),np=xyz(next);
      t.set(pos.x,sample.hauteur,pos.z);key='vol:'+match.flightStart;orientation='vol';
      const axis=tmp.set(np.x-pos.x,next.hauteur-sample.hauteur,np.z-pos.z);
      if(axis.lengthSq()<1e-8)axis.set(0,0,1);axis.normalize();
      // Le grand axe du ballon récupéré est son Z local : il vrille autour de lui.
      ballMesh.quaternion.setFromUnitVectors(tmp2.set(0,0,1),axis);
      const handed=flight.vers.y<flight.de.y?-1:1,age=flight.ecoule+offset;
      ballMesh.rotateZ(age*(flight.type==='passe'?26*handed:6));
      if(flight.type==='pied')ballMesh.rotateX(age*(flight.intention==='rasant'?9:3.6));
      if(tir?.volLance){teeMesh.visible=true;teeMesh.position.set(xyz(tir.lieu||flight.de).x,teeMesh.userData.floor,xyz(tir.lieu||flight.de).z);}
    }else if(tir&&!tir.volLance){
      const place=xyz(tir.lieu||e.ballon),kicker=actors.get(tir.buteur.id),depuis=visualTime-(tir.etapeDepuis??visualTime);
      const surTee=()=>{ballMesh.rotation.set(Math.PI/2+.16,0,0);t.set(place.x,teeMesh.userData.top+.14,place.z);orientation='tee';};
      teeMesh.position.set(place.x,teeMesh.userData.floor,place.z);
      if(!tir.etape){teeMesh.visible=true;surTee();key='tee';}
      else if(tir.etape==='celebration'||tir.etape==='approche'){const sol=xyz(tir.ballonAuSol||tir.lieu||e.ballon);
        // correctif24-tee : sur une pénalité, le ballon est déjà à la marque — le tee y est posé pendant l'approche.
        if(tir.etape==='approche'&&tir.rituel&&depuis>1.1&&Math.hypot(sol.x-place.x,sol.z-place.z)<.7){teeMesh.visible=true;surTee();key='tee';}
        else{t.set(sol.x,SOL,sol.z);key='sol:tir';}}
      else if(tir.etape==='ramassage'){
        const sol=xyz(tir.ballonAuSol||tir.lieu||e.ballon);
        if(depuis<.5||!kicker){t.set(sol.x,SOL,sol.z);key='sol:tir';}else{hands(kicker,t);key='main:'+tir.buteur.id;heading=kicker.heading;orientation='main';}
      }else if(tir.etape==='transport'&&kicker){hands(kicker,t);key='main:'+tir.buteur.id;heading=kicker.heading;orientation='main';}
      else if(tir.etape==='pose'&&kicker){
        // Le buteur s'accroupit, cale le tee puis y dépose le ballon.
        const fait=tir.humain?0:(tir.rituel?.de??0),u=fait+(1-fait)*depuis/(tir.humain?(match.outils.RITUEL_TIR?.poseHumain??2.4):(tir.rituel?.pose??match.outils.RITUEL_TIR?.pose??9.6));teeMesh.visible=u>.095;
        if(u<.2){hands(kicker,t);key='main:'+tir.buteur.id;heading=kicker.heading;orientation='main';}else{surTee();key='tee';}
      }else{teeMesh.visible=true;surTee();key='tee';}
    }else if(tir){teeMesh.visible=true;teeMesh.position.set(xyz(tir.lieu||e.ballon).x,teeMesh.userData.floor,xyz(tir.lieu||e.ballon).z);key='sol:apres';}
    else if(e.phase==='melee'&&m){
      const equipe=m.introducteur==='A'?0:1,neuf=match.players.find(p=>p.number===9&&p.team===equipe),actor=neuf&&actors.get(neuf.id),depuis=visualTime-m.etapeDepuis;
      const debut=['placement','liaison','impact'].includes(m.etape)||m.etape==='introduction'&&depuis<.62;
      if(debut&&actor){hands(actor,t);key='main:'+neuf.id;heading=actor.heading;orientation='main';}
      else{
        // Introduit au milieu du tunnel, puis talonné jusqu'aux pieds du numéro 8.
        const centre=match.scrum?.centre||match.ball,sous=m.etape==='introduction'?centre:match.ball;
        t.set(sous.x,SOL,sous.z);key='sol:melee';st.spin+=simDt*(m.etape==='introduction'?5:1.5);
      }
    }else if(e.phase==='touche'&&e.conquete?.rapide){
      const r=e.conquete.rapide,lanceur=actors.get(r.lanceurId);
      if(lanceur&&r.etape==='arme'){hands(lanceur,t);key='main:'+r.lanceurId;heading=lanceur.heading;orientation='main';}
      else{
        key='sol:touche';
        // Il monte du sol à ses mains pendant qu'il se baisse.
        const k=lanceur&&r.etape==='ramasse'?clamp((visualTime-(r.depuis??visualTime)-.42)/.3,0,1):0;
        if(k>0){hands(lanceur,handA);t.lerp(handA,k);}
      }
    }else if(e.phase==='touche'){
      const progress=match.progress(offset),thrower=(e.conquete?.lanceurId&&match.byId.get(e.conquete.lanceurId))||match.players.find(p=>p.number===2&&p.team===match.team),target=actors.get(e.conquete?.cibleId),lanceur=actors.get(thrower?.id);
      const ram=e.conquete?.ramassage,sol=e.conquete?.ballonAuSol;
      if(ram&&ram!=='tenu'&&sol){
        // Le ballon attend derrière la ligne de touche ; il monte dans les mains
        // du lanceur pendant qu'il le ramasse.
        const k=ram==='ramasse'&&lanceur?clamp((visualTime-(e.conquete.ramassageDepuis??visualTime)-.42)/.3,0,1):0;
        t.set(sol.y-35,SOL,sol.x-61);key='sol:touche';
        if(k>0){hands(lanceur,handA);t.lerp(handA,k);if(k>=1){key='main:'+thrower.id;heading=lanceur.heading;orientation='main';}}
      }else if(lanceur){
        hands(lanceur,t);key='main:'+thrower.id;heading=lanceur.heading;orientation='main';
        if(progress>=.6&&target){
          target.leftHand.getWorldPosition(handA);target.rightHand.getWorldPosition(handB);handA.add(handB).multiplyScalar(.5);
          const u=clamp((progress-.6)/.22,0,1),issue=e.conquete?.issue;
          // ⚠️ L'ISSUE EST CONNUE AVANT LE SAUT (Correctif 23) : le ballon va où elle l'annonce. Pris par-dessus, arraché des mains,
          // dévié, ou retombé court ou long — jamais « apparu » chez le 9 adverse.
          const preneur=issue?.type==='perdue'&&issue.contreurId?actors.get(issue.contreurId):null;
          let sol=false;
          if(issue&&(issue.type==='courte'||issue.type==='longue')&&issue.point){const z=xyz(issue.point);handA.set(z.x,SOL+.12,z.z);sol=u>=1;}
          else if(preneur&&issue.variante!==1){preneur.leftHand.getWorldPosition(handA);preneur.rightHand.getWorldPosition(handB);handA.add(handB).multiplyScalar(.5);}
          t.lerp(handA,u);t.y+=Math.sin(Math.PI*u)*1.2;key='lancer';orientation=u<1?'vol':'main';st.spin+=simDt*9;
          if(preneur&&issue.variante===1&&progress>.84){
            // Arraché : il l'a d'abord aux mains de notre sauteur, puis le tire à lui.
            preneur.leftHand.getWorldPosition(handB);preneur.rightHand.getWorldPosition(tmp2);handB.add(tmp2).multiplyScalar(.5);
            t.lerp(handB,smooth(clamp((progress-.84)/.1,0,1)));
          }
          if(issue?.type==='devie'&&issue.point&&progress>.84){
            const z=xyz(issue.point),w=clamp((progress-.84)/.16,0,1);
            tmp2.set(z.x,SOL+.25,z.z);t.lerp(tmp2,smooth(w));t.y+=Math.sin(Math.PI*w)*.7;key='devie';orientation='vol';st.spin+=simDt*7;
          }
          if(sol){key='sol:touche';orientation='libre';}
        }
      }
    }else if(e.phase==='maul'){
      // Le ballon glisse de main en main vers l'arrière du groupe.
      const tr=match.maulTransfer(visualTime),from=actors.get(tr.from),to=actors.get(tr.to);
      if(from&&to){hands(from,t);hands(to,tmp2);t.lerp(tmp2,smooth(tr.u));t.y+=Math.sin(Math.PI*tr.u)*.08;key='maul';heading=to.heading;orientation='main';}
    }else if(match.carrier&&actors.get(match.carrier)){
      const holder=actors.get(match.carrier),motion=holder.motion;
      if(motion?.attache==='sol'){
        // Ramassé au pied du ruck : le ballon reste au sol sous les mains jusqu'au geste.
        hands(holder,t);t.y=SOL;key='sol:relais';
      }else{
        hands(holder,t,motion?.carry==='bras');key='main:'+match.carrier;heading=holder.heading;orientation='main';
        // Correctif 30 — la réception mal assurée : le ballon danse une fraction de seconde au-dessus des mains avant d'être maîtrisé.
        const j=match.jongle,u=j&&j.id===match.carrier?(visualTime-j.arrivee)/j.duree:-1;
        if(u>0&&u<1){t.y+=Math.sin(Math.PI*u)*.24;t.x-=Math.sin(holder.heading)*.11*Math.sin(Math.PI*u);t.z-=Math.cos(holder.heading)*.11*Math.sin(Math.PI*u);st.spin+=simDt*8;orientation='sol';}
      }
    }else if(e.ballonLibre){key='libre';orientation='libre';}
    // Correctif 30 — le marqueur ramasse le ballon qu'il vient d'aplatir et le brandit, puis le repose : le buteur viendra le chercher là.
    const feteur=tir?.etape==='celebration'&&tir.marqueurId?actors.get(tir.marqueurId):null,tenu=feteur?.motion?.ballon;
    if(tenu&&tenu>.02){feteur.rightHand.getWorldPosition(handA);handA.y+=.09;t.lerp(handA,clamp(tenu,0,1));if(tenu>.5){key='leve';heading=feteur.heading;orientation='main';}}
    // Jamais de saut : un changement de support se fait en un court trajet visible.
    if(key!==st.key){
      const vol=key.startsWith('vol')||st.key.startsWith('vol');
      st.from.copy(st.shown);st.fade=snap||!st.key?1:0;st.fadeFor=vol?.14:key.startsWith('main')&&st.key.startsWith('sol')?.2:.22;st.key=key;
    }
    if(st.fade<1){st.fade=Math.min(1,st.fade+(simDt||(still?1:0))/st.fadeFor);ballMesh.position.lerpVectors(st.from,t,smooth(st.fade));}
    else if((key.startsWith('sol')||key==='libre')&&!snap&&simDt>0){
      // Un ballon posé ailleurs par le moteur (ruck formé, renvoi) y roule vite au lieu d'y apparaître.
      const d=st.shown.distanceTo(t),pas=Math.max(20,d*6)*simDt;
      if(d>pas)ballMesh.position.copy(st.shown).lerp(t,pas/d);else ballMesh.position.copy(t);
    }else ballMesh.position.copy(t);
    st.shown.copy(ballMesh.position);
    if(orientation==='main')ballMesh.rotation.set(.3,heading,1.3);
    else if(orientation==='sol')ballMesh.rotation.set(0,st.spin*.2,Math.PI/2+st.spin);
    else if(orientation==='libre'){const o=e.ballonLibre?.orientation||0;ballMesh.rotation.set(o,0,o*.37);}
  }

  // ── Caméra : suivi amorti, jamais de changement de cadre brutal ──────────
  const rig={focus:new THREE.Vector3(),focusV:new THREE.Vector3(),pos:new THREE.Vector3(),posV:new THREE.Vector3(),zoom:1,zoomV:0,want:new THREE.Vector3()};
  /** Ressort critique : rejoint la cible sans dépassement ni à-coup. */
  function damp(value,target,velocity,time,dt){
    const omega=2/Math.max(.0001,time),x=omega*dt,k=1/(1+x+.48*x*x+.235*x*x*x),change=value-target,temp=(velocity+omega*change)*dt;
    return [target+(change+temp)*k,(velocity-omega*temp)*k];
  }
  function dampVector(v,target,velocity,time,dt){
    for(const axis of ['x','y','z']){const [p,s]=damp(v[axis],target[axis],velocity[axis],time,dt);v[axis]=p;velocity[axis]=s;}
  }
  let planAffiche=null;
  const cibleFixe=new THREE.Vector3(),secousse={source:null,t:-10};

  // ── Le glissé : de la pose où l'on était à celle où l'on va, sans coupe ───────
  // ⚠️ IL SE JOUE PAR-DESSUS LE PLAN QUI VIENT D'ÊTRE CALCULÉ : chaque plan trouve sa pose comme avant,
  // et ce calque la fond avec celle de l'image précédente le temps d'une seconde et demie.
  const poseDerniere={pos:new THREE.Vector3(),quat:new THREE.Quaternion(),ok:false},poseBlend={pos:new THREE.Vector3(),quat:new THREE.Quaternion()};
  let transition=null;
  function glisser(duree=1.5){if(poseDerniere.ok)transition={t:0,dur:duree,pos:poseDerniere.pos.clone(),quat:poseDerniere.quat.clone()};}
  function miseEnPose(dt){
    if(transition){
      transition.t+=dt;
      if(transition.t>=transition.dur||snap)transition=null;
      else{
        const k=smooth(transition.t/transition.dur);
        poseBlend.pos.copy(camera.position);poseBlend.quat.copy(camera.quaternion);
        camera.position.lerpVectors(transition.pos,poseBlend.pos,k);camera.quaternion.slerpQuaternions(transition.quat,poseBlend.quat,k);
      }
    }
    poseDerniere.pos.copy(camera.position);poseDerniere.quat.copy(camera.quaternion);poseDerniere.ok=true;
  }

  // ── La caméra derrière notre joueur ───────────────────────────────────────────
  // ⚠️ ELLE SUIT SON CAP, PAS SA TÊTE : un cap vers l'avant du terrain (l'axe d'attaque de son camp), infléchi par
  // sa course quand il va vite vers l'avant ou en travers, et par le ballon quand celui-ci est LOIN — ou DANS SON DOS,
  // auquel cas elle pivote, mais lentement (au plus 63° par seconde, et le poids du ballon est lissé sur sept
  // dixièmes de seconde pour qu'une passe ou un coup de pied ne la fasse pas tourner pour rien). Jamais de demi-tour instantané.
  // Elle recule quand le ballon s'éloigne et se resserre quand le joueur est dans l'action.
  const cible_J=new THREE.Vector3(),viser_J=new THREE.Vector3();
  function cameraJoueur(real,moiA,e){
    let J=rig.joueur;
    const P=moiA.group.position,B=ballMesh.position,equipe=match.byId.get(options.moi)?.team??0;
    const ax=0,az=equipe===0?1:-1;
    if(!J){J=rig.joueur={yaw:az>0?0:Math.PI,zoom:1,wB:0,vx:0,vz:0,px:P.x,pz:P.z,pos:new THREE.Vector3(),posV:new THREE.Vector3(),look:new THREE.Vector3(),lookV:new THREE.Vector3(),init:false};}
    const dt=Math.max(real,.001);
    // La course lissée, vue de la caméra (positions affichées, pas celles du moteur : jamais de saut).
    const vx=(P.x-J.px)/dt,vz=(P.z-J.pz)/dt;J.px=P.x;J.pz=P.z;
    const kv=1-Math.exp(-dt*7);
    if(Math.hypot(vx,vz)<14){J.vx+=(vx-J.vx)*kv;J.vz+=(vz-J.vz)*kv;}
    const sp=Math.hypot(J.vx,J.vz),dvx=sp>.05?J.vx/sp:0,dvz=sp>.05?J.vz/sp:0;
    let bx=B.x-P.x,bz=B.z-P.z;const db=Math.hypot(bx,bz)||1;bx/=db;bz/=db;
    const derriere=Math.max(0,-(bx*ax+bz*az));
    // Courir vers l'avant ou en travers oriente la vue ; battre en retraite ne la retourne pas.
    const wV=clamp((sp-3)/4,0,1)*.8*clamp(dvx*ax+dvz*az+.5,0,1);
    const wBvoulu=.22*clamp((db-8)/22,0,1)+1.3*derriere*clamp((db-3)/12,0,1);
    J.wB+=(wBvoulu-J.wB)*(1-Math.exp(-dt/.7));
    let dx=ax+dvx*wV+bx*J.wB,dz=az+dvz*wV+bz*J.wB;
    // ⚠️ CAMÉRA À 360° (Correctif 23). Le joueur peut la tourner où il veut (`orbiter`) ; deux comportements :
    //   libre    — elle reste où il l'a mise ;
    //   assistée — après `delaiAssistee` secondes sans geste, elle revient doucement DERRIÈRE la direction de course (un retard
    //              fluide : jamais d'à-coup), sauf quand il bat en retraite face au jeu (on ne lui tourne pas le dos).
    // Dans les deux cas, une aide au ballon redresse la vue quand une passe arrive sur lui, qu'un ballon aérien approche, ou qu'un
    // partenaire porte tout près — mais plus lentement en mode libre, et jamais contre un geste en cours.
    // ⚠️ LA CAMÉRA ASSISTÉE SUIT LA SITUATION (Correctif 33). Elle reste derrière notre joueur, mais elle sait où est le
    // ballon : derrière la course quand il porte ; entre son orientation et le porteur quand un coéquipier porte ; tournée
    // davantage vers le ballon en défense et sur un ballon aérien. Le ballon ne quitte pas le cadre (`marge`).
    // Le geste du joueur (`orbiter`) passe toujours devant : après lui l'assistance attend 2 s, puis reprend en 1,6 s.
    // Mode libre : inchangé — elle reste où il l'a mise, avec la seule aide lente au ballon franchement hors champ.
    const cap=null;
    J.age=(J.age??99)+dt;
    if(options.orbite){J.yaw-=options.orbite;options.orbite=0;J.age=0;}
    const porteurJ=match.carrier?match.byId.get(match.carrier):null;
    const moiPorte=match.carrier===options.moi;
    const amiPorte=!!porteurJ&&!moiPorte&&porteurJ.team===equipe;
    const advPorte=!!porteurJ&&porteurJ.team!==equipe;
    const volJ=match.flights.get(options.moi),passeSurMoi=!!volJ&&match.time-volJ.start<volJ.duree+.2;
    const aerienJ=!porteurJ&&ballMesh.position.y>2.2;
    if(!J.init||snap){J.yaw=Math.atan2(ax+dvx*wV,az+dvz*wV);J.age=99;}
    else{
      const libre=options.cameraLibre===true;
      const ab=Math.atan2(bx,bz);
      const ecartVue=Math.atan2(Math.sin(ab-J.yaw),Math.cos(ab-J.yaw));
      let voulu=null,vmax=0,raideur=1.7;
      if(libre){
        if((passeSurMoi||(aerienJ&&db<24)||(amiPorte&&db<9))&&J.age>.6&&Math.abs(ecartVue)>1.05){voulu=ab;vmax=.22;raideur=1.2;}
      }else{
        // Notre orientation : la course quand il avance ou court en travers ; le sens du jeu à l'arrêt ou en repli.
        const enCourse=sp>1.3&&dvx*ax+dvz*az>-.55;
        const base=enCourse?Math.atan2(dvx,dvz):Math.atan2(ax,az);
        const versBallon=Math.atan2(Math.sin(ab-base),Math.cos(ab-base));
        // La part du ballon dans la visée.
        const part=moiPorte?0:passeSurMoi?.85:aerienJ?.6:advPorte?.68:amiPorte?.5:.4;
        voulu=base+versBallon*part*clamp((db-2.5)/6,0,1);
        // Et il ne sort pas du cadre : au plus `marge` radians entre l'axe de la vue et lui.
        if(!moiPorte&&db>4){
          const marge=aerienJ?.42:advPorte?.5:.58;
          const reste=Math.atan2(Math.sin(ab-voulu),Math.cos(ab-voulu));
          if(Math.abs(reste)>marge)voulu=ab-Math.sign(reste)*marge;
        }
        // Après un geste du joueur : deux secondes de silence, puis l'assistance reprend progressivement.
        const reprise=clamp((J.age-2)/1.6,0,1);
        // Ballon en main et à l'arrêt : rien à suivre, la vue reste où elle est.
        const actif=moiPorte?enCourse:true;
        // Un demi-tour complet (ballon dans le dos) se fait plus lentement qu'un simple recadrage.
        vmax=actif?(moiPorte?.95:Math.abs(versBallon)>2?.9:1.25)*reprise:0;
        raideur=moiPorte?1.7:2.1;
      }
      if(voulu!==null&&vmax>0){
        const delta=Math.atan2(Math.sin(voulu-J.yaw),Math.cos(voulu-J.yaw));
        J.yaw+=clamp(delta*(1-Math.exp(-dt*raideur)),-vmax*dt,vmax*dt);
      }
    }
    const fx=Math.sin(J.yaw),fz=Math.cos(J.yaw);
    // Le joueur est dans l'action : il porte, ou le ballon est tout près. Elle se resserre alors d'un sixième.
    const porte=match.carrier===options.moi;
    const impliquee=porte?1:clamp(1-(db-2)/9,0,1);
    // ⚠️ CAMÉRA DE JEU DE SPORT, PAS COLLÉE AU PERSONNAGE (Correctif 20) : on doit voir notre joueur, plusieurs coéquipiers,
    // la ligne défensive, l'espace devant et les ailiers. Le zoom varie PEU et glisse (1,2 s) :
    //   ballon très près → un peu plus près ; on reçoit → léger resserrement ; percée → on recule pour montrer l'espace ;
    //   défense → large, pour voir le porteur ET ses soutiens.
    const porteur=match.carrier?match.byId.get(match.carrier):null;
    const defense=!!porteur&&porteur.team!==equipe;
    const percee=porte&&sp>6.5;
    const reception=!porteur&&db<9;
    const zoomVoulu=1+.18*clamp((db-12)/30,0,1)-.08*impliquee-(reception?.06:0)+(percee?.14:0)+(defense?.1:0)+(aerienJ?.12:0)+.05*clamp(sp/9,0,1);
    J.zoom+=(zoomVoulu-J.zoom)*(1-Math.exp(-dt/1.2));
    const asp=camera.aspect<1?1.3:camera.aspect<1.5?1.1:1;
    // Recul de base 11,8 m (6,6 avant) ; un téléphone (écran plus petit) recule encore de 12 % pour ne perdre ni un ailier ni un défenseur.
    const recul=(options.reculCamera||1)*(leger?1.12:1);
    const dist=11.8*J.zoom*asp*recul,haut=5.6*J.zoom*asp*recul;
    // Pas collée à son dos : un peu décalée de l'autre côté du ballon, pour qu'il reste lisible à côté du joueur.
    const droiteX=-fz,droiteZ=fx;
    const decal=clamp(-((B.x-P.x)*droiteX+(B.z-P.z)*droiteZ)*.07,-1.4,1.4)*(1-impliquee*.7);
    cible_J.set(P.x-fx*dist+droiteX*decal,Math.max(2.1,haut),P.z-fz*dist+droiteZ*decal);
    cible_J.x=clamp(cible_J.x,-37,37);cible_J.z=clamp(cible_J.z,-72,72);
    // On regarde plus loin devant : l'espace et la ligne défensive comptent plus que le dos du joueur.
    // Quand un autre porte (ou que le ballon vole), le regard se pose entre l'espace devant le joueur et le ballon.
    const poidsB=moiPorte?.1:.3,avance=(12+.7*sp)*(moiPorte?1:.8);
    const eB=Math.min(1,16/Math.max(1,db));
    viser_J.set(P.x+fx*avance+(B.x-P.x)*poidsB*eB,1.1,P.z+fz*avance+(B.z-P.z)*poidsB*eB);
    if(!J.init||snap){J.pos.copy(cible_J);J.posV.set(0,0,0);J.look.copy(viser_J);J.lookV.set(0,0,0);J.init=true;}
    else{dampVector(J.pos,cible_J,J.posV,.24,real);dampVector(J.look,viser_J,J.lookV,.16,real);}
    camera.position.copy(J.pos);camera.lookAt(J.look);
    J.cap=J.yaw;
  }

  // ── Les repères : anneaux et pointillés posés sur la pelouse ──────────────────
  function poserAnneau(i,x,z,rayon,teinte,opacite){const m=anneauxRepere[i];if(!m)return;m.visible=true;m.position.set(x,.045+i*.001,z);m.scale.setScalar(rayon);m.material.color.set(teinte);m.material.opacity=opacite;}
  function pointiller(de,vers,depart,teinte,opacite,pas=1.7){
    let n=0;const dx=vers.x-de.x,dz=vers.z-de.z,d=Math.hypot(dx,dz);if(d<1.2)return 0;
    const nb=Math.min(pointsRepere.length,Math.floor((d-depart)/pas));
    for(let k=0;k<nb;k++){const m=pointsRepere[n++],u=(depart+k*pas+pas*.5)/d;m.visible=true;m.position.set(de.x+dx*u,.05,de.z+dz*u);m.material.color.set(teinte);m.material.opacity=opacite*(.35+.65*(k+1)/nb);}
    return n;
  }
  function dessinerReperes(t){
    for(const m of anneauxRepere)m.visible=false;
    for(const m of pointsRepere)m.visible=false;
    const r=reperes;if(!r||!match||tele.ralenti.actif)return;
    const moiA=options.moi?actors.get(options.moi):null;
    const pied=moiA&&moiA.group.visible?moiA.group.position:null;
    let i=0;
    const sur=id=>{const a=id?actors.get(id):null;return a&&a.group.visible?a.group.position:null;};
    // Le poste que l'IA lui donnerait : un anneau vert, et un pointillé quand il est loin.
    if(r.suggestion&&pied){
      const z=xyz(r.suggestion),loin=Math.hypot(z.x-pied.x,z.z-pied.z);
      const teinte=r.horsPoste?'#ffb347':'#7ee08f',pouls=.5+.14*Math.sin(t*3.2);
      poserAnneau(i++,z.x,z.z,1.5,teinte,pouls);
      if(loin>6)pointiller(pied,z,1.4,teinte,.55);
    }
    // Les receveurs qu'une passe à gauche ou à droite servirait.
    for(const p of r.passes||[]){const q=sur(p.id);if(q)poserAnneau(i++,q.x,q.z,p.fort===false?.8:.95,'#ffd257',p.fort===false?.5:.85);}
    // Le porteur qu'on peut plaquer.
    if(r.plaquage){const q=sur(r.plaquage);if(q)poserAnneau(i++,q.x,q.z,1.05,'#ff5a4d',.55+.25*Math.sin(t*9));}
    // La visée d'un coup de pied : où le ballon retombera, d'après la puissance.
    if(r.visee&&pied){
      const z=xyz(r.visee.arrivee),p=clamp(r.visee.puissance,0,1);
      const teinte=p<.35?'#e8f1ff':p<.7?'#ffd257':'#ff9a3c';
      poserAnneau(i++,z.x,z.z,1.9,teinte,.8);
      pointiller(pied,z,1.0,teinte,.8,2.2);
    }
  }

  function renderCamera(dt,visualTime){
    const e=match.e,tir=e.tir,want=rig.want;
    // ⚠️ LE CHANGEMENT DE CÔTÉ : LE STADE TOURNE, PAS LE MATCH. Le moteur garde
    // son repère (A attaque toujours dans le même sens) ; en seconde période le
    // décor fait un demi-tour autour de lui, et la caméra est calculée dans le
    // repère du STADE — elle reste dans sa tribune, et voit donc les équipes
    // attaquer dans l'autre sens. Tout ce qui est relatif au jeu (courses,
    // appuis, gestes) n'a rien à savoir de ce demi-tour.
    const inv=e.cotesInverses?-1:1;
    if(inv!==rig.inv){rig.inv=inv;decor.rotation.y=inv<0?Math.PI:0;snap=true;}
    // Ce qu'on cadre : le ballon, un peu en avant de sa course.
    want.copy(ballMesh.position);want.y=clamp(want.y*.35,.9,2.6);
    let zoom=1,suivi=.5;
    const carrier=match.carrier&&match.byId.get(match.carrier);
    if(carrier){want.x+=clamp(carrier.vx*.45,-3,3);want.z+=clamp(carrier.vz*.45,-4,4);}
    if(match.flight?.type==='pied'){
      // Jeu au pied : le cadre s'élargit et anticipe le point de chute.
      const chute=xyz(match.flight.vers),u=clamp((match.flight.ecoule)/match.flight.duree,0,1);
      want.x+=(chute.x-want.x)*(.35+.3*u);want.z+=(chute.z-want.z)*(.35+.3*u);want.y=1.6;zoom=1.22;suivi=.6;
    }else if(tir?.etape==='celebration'){
      // Essai : léger rapproché sur le marqueur, puis retour au plan large.
      const marqueur=actors.get(tir.marqueurId),t=visualTime-tir.etapeDepuis;
      if(marqueur){want.copy(marqueur.group.position);want.y=1.25;}
      zoom=t<4.6?.36:.62;suivi=.6;
    }else if(tir){
      const kicker=actors.get(tir.buteur.id);
      if(kicker&&!tir.volLance){want.copy(kicker.group.position).lerp(tmp.set(xyz(tir.lieu||e.ballon).x,0,xyz(tir.lieu||e.ballon).z),tir.etape==='pose'||tir.etape==='vise'||tir.etape==='pret'||tir.etape==='elan'?.5:.15);want.y=1.1;}
      zoom=tir.volLance?1.15:tir.etape==='pose'||tir.etape==='vise'||tir.etape==='pret'||tir.etape==='elan'?.5:.7;suivi=.7;
    }else if(['melee','maul'].includes(e.phase))zoom=.56;
    else if(e.phase==='touche')zoom=.72;
    else if(e.phase==='ruck')zoom=.8;
    else if(e.phase==='aplatissage')zoom=.6;
    // Le joueur suit SON pion : le cadre reste entre lui et le ballon, un peu resserré.
    const moi=options.moi&&match.byId.get(options.moi);
    if(moi&&options.suivreMoi&&!tir&&match.flight?.type!=='pied'){
      const poids=options.suivreMoi===true?.4:options.suivreMoi;
      want.x+=(moi.x-want.x)*poids;want.z+=(moi.z-want.z)*poids;zoom=Math.min(zoom,poids>=1?.52:poids>=.5?.7:.86);
    }
    // Le point visé passe dans le repère du stade.
    want.x*=inv;want.z*=inv;
    // Un écran étroit voit moins large : la caméra recule d'autant.
    zoom*=camera.aspect<1?1.18:camera.aspect<1.5?1.06:1;
    const real=Math.min(dt,.05)*Math.max(1,Math.sqrt(speed));
    if(snap){rig.focus.copy(want);rig.focusV.set(0,0,0);rig.zoom=zoom;rig.zoomV=0;}
    else{dampVector(rig.focus,want,rig.focusV,suivi,real);[rig.zoom,rig.zoomV]=damp(rig.zoom,zoom,rig.zoomV,1.1,real);}
    const z=rig.zoom;
    // Le plan : celui qu'on a choisi, ou celui de la réalisation (`tv`). Passer
    // d'un point de vue à un autre se fait par une COUPE, comme à la télévision ;
    // seuls le plan large et le plan serré, qui partagent leur axe, se rejoignent en glissant.
    let plan=mode,coupe=false;
    // ⚠️ LE PLAN « JOUEUR » EXIGE UN JOUEUR À L'IMAGE : sur le banc, ou entre deux jeux, la réalisation reprend la main.
    const moiJ=mode==='joueur'&&options.moi?actors.get(options.moi):null;
    const joueurVisible=!!moiJ&&moiJ.group.visible&&match.byId.has(options.moi);
    if(mode==='tv'||(mode==='joueur'&&!joueurVisible)){const c=tele.choisirPlan(match,visualTime);plan=c.plan;coupe=c.coupe;}
    // Entrer dans le plan « joueur », ou en sortir, se fait en glissant : jamais de coupe sèche.
    if(!snap&&plan!==planAffiche&&(plan==='joueur'||planAffiche==='joueur'))glisser(1.5);
    if(plan!==planAffiche){coupe=coupe||!(['follow','close'].includes(plan)&&['follow','close'].includes(planAffiche));planAffiche=plan;}
    if(plan==='joueur'&&joueurVisible){cameraJoueur(real,moiJ,e);miseEnPose(real);return;}
    const buteur=tir&&actors.get(tir.buteur?.id),versPoteaux=((tir?.buteur?.cote??e.possession)==='A'?1:-1)*inv;
    const stade=v=>tmp3.set(v.x*inv,v.y,v.z*inv);
    let viser=rig.focus;
    if(plan==='wide')tmp.set(48,46,-9);
    else if(plan==='close')tmp.copy(rig.focus).add(tmp2.set(6.5,3.6,-8.5).multiplyScalar(Math.max(.62,z)));
    else if(plan==='aerienne')tmp.set(rig.focus.x*.35+12,34,rig.focus.z-27);
    else if(plan==='basse')tmp.set(rig.focus.x+11.5,1.3,rig.focus.z-4);
    else if(plan==='enbut'){const s=(e.possession==='A'?1:-1)*inv;tmp.set(rig.focus.x*.5,6.4,s*63.5);}
    else if(plan==='tunnel'){tmp.set(15,2.2,8.5);viser=cibleFixe.set(31,1.45,0);}
    else if(plan==='banc'){const zb=(match.remplacement?.z??0)*inv;tmp.set(19,3.4,zb*2.4);viser=cibleFixe.set(34,1.3,zb*.7);}
    else if(plan==='buteur'&&buteur){
      // Dans le dos du buteur, les poteaux au fond : on lit la trajectoire à venir.
      const k=stade(buteur.group.position);tmp2.set(k.x,0,k.z-versPoteaux*50);const d=Math.max(1,tmp2.length());
      tmp.set(k.x+tmp2.x/d*8,3,k.z+tmp2.z/d*8);
      viser=cibleFixe.set(k.x*.25,3.4,versPoteaux*50).lerp(tmp2.set(k.x,1.2,k.z),.22);
    }else if(plan==='poteaux'||plan==='buteur'){
      // Derrière les poteaux : le ballon vient vers la caméra, entre les montants ou non.
      const kx=buteur?buteur.group.position.x*inv:rig.focus.x;
      tmp.set(clamp(kx*.18,-3,3),8.2,versPoteaux*64);
      viser=cibleFixe.set(ballMesh.position.x*inv*.6,Math.max(2.2,ballMesh.position.y*.7),ballMesh.position.z*inv);
    }else tmp.copy(rig.focus).add(tmp2.set(16,17,-22).multiplyScalar(z));
    // Reste en avant des tribunes proches pour éviter de traverser leurs murs.
    if(plan!=='wide')tmp.x=clamp(tmp.x,-37,37);
    if(snap||coupe){rig.pos.copy(tmp);rig.posV.set(0,0,0);if(coupe){rig.focus.copy(want);rig.focusV.set(0,0,0);}}
    else dampVector(rig.pos,tmp,rig.posV,plan==='wide'?.01:plan==='follow'||plan==='close'?.32:.5,real);
    // Du repère du stade à celui de l'image : le même demi-tour, dans l'autre sens.
    camera.position.set(rig.pos.x*inv,rig.pos.y,rig.pos.z*inv);
    if(plan==='wide')camera.lookAt(rig.focus.x*.3*inv,rig.focus.y*.3,rig.focus.z*.3*inv);else camera.lookAt(viser.x*inv,viser.y,viser.z*inv);
    // Un très gros impact se sent : l'image tremble un tiers de seconde, à peine.
    if(e.grosImpact&&e.grosImpact!==secousse.source){secousse.source=e.grosImpact;secousse.t=visualTime;}
    const age=visualTime-secousse.t;
    if(age>=0&&age<.34&&speed<=1.5){const k=(1-age/.34)**2*.1;camera.position.x+=Math.sin(age*88)*k;camera.position.y+=Math.cos(age*71)*k*.7;}
    const view=api.vue;if(view){camera.position.set((rig.focus.x+view[0])*inv,view[1],(rig.focus.z+view[2])*inv);camera.lookAt(rig.focus.x*inv,view[3]??.9,rig.focus.z*inv);}
    miseEnPose(real);
  }

  // ── Définition, puis cadence adaptatives (Correctif 25) ───────────────────
  // « Il vaut mieux un 30 images par seconde stable qu'un 60 qui oscille entre 20 et 60. »
  //   1. l'image s'affine moins (définition) ;
  //   2. si cela ne suffit pas, la scène vise 30 : elle ne pose et ne dessine plus qu'une image sur deux (écran à
  //      60 Hz ; une sur quatre à 120 Hz), RÉGULIÈREMENT — le moteur du match, lui, avance à chaque appel de l'hôte ;
  //   3. elle ne retente la pleine cadence que si une image lui coûte assez peu pour y tenir, et de plus en plus
  //      rarement si l'essai échoue.
  // Sur téléphone la pleine cadence est 60 : un écran à 120 Hz ne fait pas travailler la scène deux fois plus.
  // ⚠️ La période de l'écran se LIT (l'écart le plus courant entre deux appels de l'hôte), elle ne se suppose pas.
  const regulee=options.cadence!==false,PLEINE=leger?60:Infinity,PLANCHER=.72,definitionDeDepart=definition;
  let cible=regulee&&options.profil==='bas'?30:PLEINE,pas=1,periode=1/60,dette=0,saute=0;
  let cumul=0,coutCumule=0,images=0,ips=60,lentes=0,horloge=0,essaiLe=12,attenteEssai=12,enEssai=false,imagesTotales=0,tempsTotal=0;
  const appelsHote=[];
  function mesurer(dt,cout){
    // Au-delà d'un dixième de seconde par image, ce n'est plus la carte graphique
    // qui peine : c'est le navigateur qui bride un onglet caché.
    if(dt>.1*pas||document.hidden)return;
    cumul+=dt;coutCumule+=cout;images++;horloge+=dt;imagesTotales++;tempsTotal+=dt;
    if(cumul<1.5)return;
    const moyenne=cumul/images,coutMoyen=coutCumule/images;ips=Math.round(1/moyenne);cumul=0;coutCumule=0;images=0;
    if(appelsHote.length>=12){appelsHote.sort((a,b)=>a-b);periode=appelsHote[Math.floor(appelsHote.length*.2)];}
    appelsHote.length=0;
    if(!regulee||paused)return;
    const lente=moyenne>(cible===30?1/24:1/45);
    if(lente){
      // Un essai de pleine cadence qui échoue : retour immédiat à 30, et le prochain essai attendra deux fois plus.
      if(enEssai){cible=30;enEssai=false;attenteEssai=Math.min(120,attenteEssai*2);essaiLe=horloge+attenteEssai;}
      else if(definition>PLANCHER){definition=Math.max(PLANCHER,definition-.16);renderer.setDrawingBufferSize(largeur,hauteur,Math.min(definition,ios?Math.sqrt(921600/(largeur*hauteur)):Infinity));lentes=0;}
      else if(cible>30&&++lentes>=2){cible=30;lentes=0;essaiLe=horloge+attenteEssai;}
    }else{
      lentes=0;
      if(enEssai){enEssai=false;attenteEssai=12;}
      else if(cible===30&&PLEINE>30&&horloge>=essaiLe&&coutMoyen<7){cible=PLEINE;enEssai=true;}
    }
    pas=cible===Infinity?1:Math.max(1,Math.round(1/(cible*periode)));
  }

  // ── L'élagage (Correctif 25) : un joueur hors du champ de la caméra n'est pas dessiné ───
  const champ=new THREE.Frustum(),vueProjection=new THREE.Matrix4(),bouleCorps=new THREE.Sphere(),horsChampListe=[];
  let elagues=0;
  function elaguer(){
    horsChampListe.length=0;
    if(options.elagage===false)return horsChampListe;
    camera.updateMatrixWorld();
    vueProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);champ.setFromProjectionMatrix(vueProjection);
    const tester=g=>{
      if(!g||!g.visible)return;
      bouleCorps.center.set(g.position.x,g.position.y+.95,g.position.z);bouleCorps.radius=2.6;
      if(!champ.intersectsSphere(bouleCorps)){g.visible=false;horsChampListe.push(g);}
    };
    for(const a of actors.values())tester(a.group);
    for(const a of officials)tester(a.group);
    elagues=horsChampListe.length;
    return horsChampListe;
  }
  // ── Le profileur (Correctif 25) : ce que coûte une image, lu par le Labo ───
  const couts=new Float32Array(240),ecarts=new Float32Array(240),coutsCpu=new Float32Array(240),coutsGpu=new Float32Array(120);let nCouts=0,nGpu=0;
  function noterCout(ms,dt,cpu){couts[nCouts%240]=ms;ecarts[nCouts%240]=dt*1000;coutsCpu[nCouts%240]=cpu;nCouts++;}
  function resumerCouts(t,compte=nCouts){const n=Math.min(compte,t.length);if(!n)return{moyenne:0,p95:0,max:0};const v=Array.from(t.subarray(0,n)).sort((a,b)=>a-b);return{moyenne:v.reduce((s,x)=>s+x,0)/n,p95:v[Math.min(n-1,Math.floor(n*.95))],max:v[n-1]};}
  let mesureGpu=false,extensionGpu=null;const contexteGpu=renderer.getContext(),requetesGpu=[];
  function arreterGpu(){mesureGpu=false;for(const q of requetesGpu)contexteGpu.deleteQuery(q);requetesGpu.length=0;}
  function commencerGpu(){
    if(!mesureGpu||!extensionGpu||contexteGpu.isContextLost())return null;
    const disjoint=contexteGpu.getParameter(extensionGpu.GPU_DISJOINT_EXT);
    while(requetesGpu.length&&(disjoint||contexteGpu.getQueryParameter(requetesGpu[0],contexteGpu.QUERY_RESULT_AVAILABLE))){
      const q=requetesGpu.shift();if(!disjoint){coutsGpu[nGpu++%120]=contexteGpu.getQueryParameter(q,contexteGpu.QUERY_RESULT)/1e6;}contexteGpu.deleteQuery(q);
    }
    if(disjoint||requetesGpu.length>=8)return null;
    const q=contexteGpu.createQuery();if(!q)return null;contexteGpu.beginQuery(extensionGpu.TIME_ELAPSED_EXT,q);return q;
  }
  const projete=new THREE.Vector3();
  let liberation=null,nettoyage=null,stadeRendu=false;
  // Correctif 32 : chaque étape tient seule. Un son qui refuse de se fermer ou une requête GPU supprimée sur un
  // contexte déjà repris par le système ne doit pas empêcher de rendre le contexte et la toile : ce sont eux qui pèsent.
  const tenter=etape=>{try{etape();}catch(e){console.warn('Libération de la scène :',e);}};
  function commencerLiberation(){
    if(detruite)return;
    detruite=true;paused=true;
    tenter(arreterGpu);tenter(()=>observateur.disconnect());
    tenter(()=>{toile.removeEventListener('webglcontextlost',surPerteDeContexte);toile.removeEventListener('pointerdown',passerAuToucher);});
    tenter(()=>{liberation=planLiberation([scene],jetables);});
    tenter(()=>sons?.detruire());tenter(()=>tele.detruire());
    // Le contexte doit disparaître AVANT la sauvegarde, le pivot de l'écran
    // et le montage du bureau. Le nettoyage CPU se poursuit par tranches.
    tenter(()=>{renderer.forceContextLoss?.();renderer.renderLists?.dispose?.();});
    tenter(()=>{toile.width=1;toile.height=1;toile.remove();});
    tenter(()=>{actors.clear();officials.length=0;scene.clear();match=null;reperes=null;jetables.length=0;api.surRalenti=null;api.vue=null;});
    tenter(()=>{for(const c of tenues){c.width=1;c.height=1;}});
  }
  function finirLiberation(){
    if(stadeRendu)return;stadeRendu=true;
    tenter(()=>renderer.dispose());tenter(()=>locales.oublier());tenter(()=>stade.restituer());
    tenter(()=>{if(leger)libererStades();});
  }
  // Une tâche courte plutôt qu'une image : les minuteries et rappels ne
  // restent pas en attente quand iOS masque l'onglet pendant la transition.
  const souffler=()=>new Promise(fin=>setTimeout(fin,0));
  const api={
    /** Vue forcée [dx, y, dz, hauteur visée] pour les vérifications ; `null` en jeu. */
    vue:null,
    get match(){return match;},
    get ips(){return ips;},
    /** Le profileur : coût du rendu et écart entre deux images (ms, sur les 240 dernières), compteurs de three.js. */
    mesures(){const i=renderer.info;return{banques:[...(motions.chargees||[])],octetsAnimations:Object.values(motions.octets||{}).reduce((n,x)=>n+x,0),poses:{faites:posesFaites,evitees:posesEvitees},images:nCouts,rendu:resumerCouts(couts),cpu:resumerCouts(coutsCpu),gpu:nGpu?resumerCouts(coutsGpu,nGpu):undefined,ecart:resumerCouts(ecarts),ips,appels:i.render.calls,triangles:i.render.triangles,geometries:i.memory.geometries,textures:i.memory.textures,definition:renderer.getPixelRatio(),largeur,hauteur,leger,elagues,cadence:cible===Infinity?0:cible,pas,definitionDeDepart,moyenneMatch:tempsTotal>0?imagesTotales/tempsTotal:0,dureeMesuree:tempsTotal};},
    mesurerGpu(actif){if(!actif){arreterGpu();return;}extensionGpu??=contexteGpu.getExtension('EXT_disjoint_timer_query_webgl2');mesureGpu=!!extensionGpu;},
    get definition(){return definition;},
    interne:{actors,officials,camera,scene,renderer,motions,THREE,rig,ballState,tenues,tele,unirSquelettes,souderLesPieces,stadesEnCache:()=>decors.size},
    /** Branche un état de match. `direct` : état déjà interpolé (relevés du direct en ligne). */
    brancher(etat,{direct=false}={}){
      match=etat instanceof DestinyMatch?etat:new DestinyMatch({etat,outils:options.outils,direct});
      // Correctif 30 : le match sait quels clips sont arrivés — une variante dont la banque manque encore joue son repli.
      match.dispo=nom=>!!motions.clips[nom];
      for(const a of actors.values()){a.group.visible=false;a.vivait=false;a.anchorBlend=0;}
      snap=true;ballState.key='';return match;
    },
    /** Une image. `fige` : le match est arrêté (carte de décision, pause), la scène reste affichée. */
    image(dt,{fige=false,vitesse=1,still=false}={}){
      if(detruite||!match)return;
      paused=fige;speed=vitesse;
      if(match.observe())api.surPas?.(match);
      // Cadence réduite : l'image sautée n'est ni posée ni dessinée, et son temps est rendu à la suivante.
      if(regulee&&!still){
        if(dt>.004&&appelsHote.length<240)appelsHote.push(dt);
        if(pas>1){dette+=dt;if(++saute<pas)return;dt=dette;dette=0;saute=0;}
      }
      const debutCpu=performance.now();
      if(!still){realiser(match.time+match.offset(),fige,vitesse);sons?.surImage(match,dt,{fige,vitesse});}
      const q=commencerGpu(),debutRendu=performance.now();
      try{render(dt,still);}finally{if(q){contexteGpu.endQuery(extensionGpu.TIME_ELAPSED_EXT);requetesGpu.push(q);}}
      const coutImage=performance.now()-debutRendu;noterCout(coutImage,dt,performance.now()-debutCpu);
      if(!fige&&!still)mesurer(dt,coutImage);
    },
    /** Entrée des équipes : `k` de 0 (tunnel) à 1 (en place), `null` pour rendre la main au match. */
    entrer(k,dt){match?.entrer(k,dt);if(k==null)snap=true;},
    /** Retient une conquête tant que les avants ne sont pas en place : à appeler avant d'avancer le moteur. */
    retenir(dt){match?.hold(dt);},
    recadrer(){snap=true;},
    set camera(v){mode=v;},get camera(){return mode;},
    /** Le plan réellement à l'image (celui de la réalisation quand la caméra est `tv`). */
    get plan(){return planAffiche;},
    /** Le son du match : `muet`, `volume`, `evenement(nom)`. `null` pour une scène muette. */
    son:sons,
    /** Réglages de la réalisation : `{ ralentis }`. */
    get television(){return reglagesTele;},
    set television(v){Object.assign(reglagesTele,v);if(!reglagesTele.ralentis)tele.finirRalenti(false);},
    get ralenti(){return tele.ralenti.actif||tele.ralenti.attendu;},
    passerRalenti(){tele.finirRalenti(true);},
    /** Revoir les dernières secondes (en secondes avant maintenant) : vidéo de l'arbitre, action demandée par l'hôte. */
    revoir({depuis=6,jusqua=0,vitesse=.5,motif='hote'}={}){
      if(!match)return false;
      const t=match.time,lance=tele.lancerRalenti({debut:t-depuis,fin:t-jusqua,vitesse,motif});
      if(lance)tele.ralenti.sens=match.e.possession==='A'?1:-1;
      return lance;
    },
    /** Le volet de la compétition, pour habiller une coupe décidée par l'hôte. */
    volet(auMilieu){tele.passerVolet(auMilieu||(()=>{}));},
    /** Appelé quand un ralenti commence ou finit : `(actif, motif)`. */
    surRalenti:null,
    set moi(id){options.moi=id;},
    set suivreMoi(v){options.suivreMoi=v;},
    /** Facteur de recul de la caméra du joueur (réglage du joueur, 1 par défaut). */
    set reculCamera(v){options.reculCamera=v>0?Math.min(1.5,Math.max(.8,v)):1;},
    /** Tourne la caméra du joueur : `dYaw` en radians, positif = la vue part vers la droite. À appeler à chaque geste. */
    orbiter(dYaw){if(Number.isFinite(dYaw))options.orbite=(options.orbite||0)+Math.max(-1.6,Math.min(1.6,dYaw));},
    /** `'libre'` : la caméra reste où le joueur l'a mise ; `'assistee'` : elle revient derrière sa course après un moment. */
    set modeCamera(v){options.cameraLibre=v==='libre';},get modeCamera(){return options.cameraLibre?'libre':'assistee';},
    /** Les repères à poser sur la pelouse : `{ suggestion, horsPoste, passes: [{id, fort}], plaquage, visee: { arrivee, puissance } }`, ou `null`. */
    set reperes(v){reperes=v||null;},
    get reperes(){return reperes;},
    /** Ce que le joueur voit : « droit devant » et « à droite », en repère TERRAIN (x vers la ligne B, y vers la touche haute). */
    reperesCamera(){
      const f=tmp.set(0,0,0);camera.getWorldDirection(f);
      const n=Math.hypot(f.x,f.z)||1,fx=f.x/n,fz=f.z/n;
      // Scène → terrain : x_terrain = z_scène, y_terrain = x_scène. La droite de l'image est (−fz, fx) en scène.
      return {avant:{x:fz,y:fx},droite:{x:fx,y:-fz}};
    },
    /** Le remplaçant est-il encore en train d'entrer sur le terrain ? (La caméra attend qu'il soit sur la pelouse.) */
    entreeEnCours(id){return !!match&&(match.changements||[]).some(c=>c.type==='entree'&&c.id===id&&!c.retour);},
    /** Fond la pose de la caméra avec la précédente (par défaut en 1,5 s) : un changement de point de vue sans coupe. */
    glisser,
    /** Position à l'écran (pixels du conteneur) du dessus de la tête d'un joueur. */
    ecran(id,hauteurTete=2.02){
      const a=actors.get(id);if(!a||!a.group.visible)return null;
      projete.set(a.group.position.x,hauteurTete,a.group.position.z).project(camera);
      if(projete.z>1)return null;
      return {x:(projete.x+1)/2*largeur,y:(1-projete.y)/2*hauteur};
    },
    /** Le ballon est-il dans le cadre ? Sinon, la direction où le chercher. */
    ballonAEcran(){
      projete.copy(ballMesh.position).project(camera);
      // Derrière la caméra, la projection est retournée : on rend la direction VRAIE (`dx`,`dy`, écran, y vers le bas).
      const derriere=projete.z>1,nx=derriere?-projete.x:projete.x,ny=derriere?-projete.y:projete.y;
      const dedans=!derriere&&Math.abs(projete.x)<.98&&Math.abs(projete.y)<.98;
      const n=Math.hypot(nx*largeur,ny*hauteur)||1;
      return {x:(projete.x+1)/2*largeur,y:(1-projete.y)/2*hauteur,dedans,largeur,hauteur,dx:nx*largeur/n,dy:-ny*hauteur/n};
    },
    cadrer,
    /**
     * La même destruction que `detruire`, PAR TRANCHES : l'image disparaît tout de suite, la mémoire graphique est
     * rendue ensuite un peu à chaque image. Rend une promesse tenue quand tout est libéré.
     */
    detruireParEtapes(){
      if(nettoyage)return nettoyage;
      commencerLiberation();
      nettoyage=(async()=>{
        // Correctif 32 : six millisecondes de travail par tâche. Le contexte est déjà rendu, libérer une ressource
        // n'est plus qu'une écriture en mémoire — seize par tâche, c'était des centaines de minuteries pour rien.
        try{while(liberation?.restant){await souffler();const limite=performance.now()+6;do liberation.tranche(32);while(liberation.restant&&performance.now()<limite);}}
        finally{liberation?.tout();finirLiberation();}
      })();
      return nettoyage;
    },
    detruire(){
      commencerLiberation();liberation?.tout();finirLiberation();
    },
  };
  return api;
  }catch(erreur){
    // Une création interrompue (WebGL refusé, ressource illisible) doit rendre
    // le même budget qu'un match terminé avant de laisser l'hôte passer en 2D.
    for(const nettoyer of nettoyagesEchec)try{nettoyer();}catch{ /* chargement partiel */ }
    rendererEnCours?.forceContextLoss?.();rendererEnCours?.dispose();
    if(rendererEnCours){const c=rendererEnCours.domElement;c.width=1;c.height=1;c.remove();}
    planLiberation([sceneEnCours]).tout();sceneEnCours?.clear();locales.oublier();
    stade.restituer();if(leger)libererStades();
    throw erreur;
  }
}
export { DestinyMatch,TICK };


// ───────────────────────── APERÇU DU JOUEUR (Correctif 20) ─────────────────────────
// Un joueur seul sur fond transparent, qui respire, qu'on tourne au doigt ou à la souris, et qui se
// reconstruit à chaque changement (peau, coupe, barbe, morphologie, casque, crampons, maillot).
// ⚠️ MÊME CODE QUE LE MATCH (`habiller`, `appliquerMorpho`, `appearance`) : ce qu'on voit ici EST ce qu'on verra sur le terrain.
export async function creerApercuJoueur(conteneur,options={}){
  const r=await charger();
  const {motions}=r;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,options.leger?1.5:2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const toile=renderer.domElement;toile.style.cssText='display:block;width:100%;height:100%;touch-action:none;cursor:grab';
  conteneur.prepend(toile);
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#f3f7ff','#46503a',1.9));
  const cle=new THREE.DirectionalLight('#fff4e0',2.2);cle.position.set(2.2,3.4,3.2);scene.add(cle);
  const contre=new THREE.DirectionalLight('#9fc4ff',1.1);contre.position.set(-2.8,2.2,-2.6);scene.add(contre);
  const camera=new THREE.PerspectiveCamera(28,1,.05,60);
  const sol=new THREE.Mesh(new THREE.CircleGeometry(.75,40),new THREE.MeshBasicMaterial({color:'#0b1a12',transparent:true,opacity:.35,depthWrite:false}));sol.rotation.x=-Math.PI/2;sol.position.y=.002;scene.add(sol);
  const groupe=new THREE.Group();scene.add(groupe);
  let acteur=null,angle=options.angle??0,cible=angle,cadrage=options.cadrage||'corps',hauteurCorps=1.85,detruit=false,horloge=0,version=0,enGlisse=false,dernierX=0,optionsCourantes={};
  let largeur=0,hauteur=0;
  function cadrer(){
    const l=Math.max(1,conteneur.clientWidth),h=Math.max(1,conteneur.clientHeight);
    if(l!==largeur||h!==hauteur){largeur=l;hauteur=h;camera.aspect=l/h;renderer.setSize(l,h,false);}
    // Le corps entier, ou le visage de près (pour choisir une coupe) ; plus de recul sur un écran étroit.
    const H=hauteurCorps,marge=camera.aspect<.75?1.18:1;
    const visage=cadrage==='visage';
    const dist=(visage?H*.34:H*.84)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*marge/(visage?1.55:1);
    const cy=visage?H*.9:H*.5;
    camera.position.set(0,cy+(visage?.02:H*.06),dist);camera.lookAt(0,cy,0);camera.updateProjectionMatrix();
  }
  async function construire(opt){
    const mien=++version;
    optionsCourantes=opt;
    await chargerEquipementsDe({a:{equipement:opt.apparence?.equipement}},false);
    if(detruit||mien!==version)return;
    // Correctif 32 : l'ancien modèle reste à l'image jusqu'à ce que le nouveau soit prêt, puis il est RENDU (voir plus bas).
    const avant=!!opt.avant,kind=avant?'male_forward':'male_back',modele=clone(avant?r.forward:r.back);
    const souhait=souhaitDepuisCarte(opt.apparence||{});
    const look={...appearance(0,souhait,false),graine:0};
    look.accessory=souhait.equipe?(souhait.casque?'casque':''):'';
    modele.updateMatrixWorld(true);
    const bornes=new THREE.Box3().setFromObject(modele,true);modele.position.y=-bornes.min.y;
    if(look.morpho){appliquerMorpho(modele,look.morpho);modele.updateMatrixWorld(true);const apres=new THREE.Box3().setFromObject(modele,true);modele.position.y-=apres.min.y;}
    // Le kit : le MÊME atlas repeint que sur le terrain (motif, short, chaussettes, numéro dans le dos). Un kit du Labo fournit son atlas.
    const tenue=opt.maillot||{};
    let kitTex=null;
    try{
      await document.fonts?.load?.('40px Anton').catch(()=>{});
      const m={...MAILLOT_DEFAUT,...tenue},img=tenue.texture?await chargerImage(tenue.texture):null;
      const base=img?tenueDepuisImage(img,m,1024):creerTenue(r.kit,m,null,1024);
      kitTex=numeroter(base,opt.numero??9,renderer,1024);
      // La tenue sans numéro ne sert plus : sa toile (4 Mo) est rendue tout de suite, sans attendre le ramasse-miettes.
      base.width=1;base.height=1;
    }catch(e){console.warn('Kit de l\'aperçu :',e);}
    // Une reconstruction plus récente est partie pendant qu'on peignait ce maillot : on le rend et on s'arrête là.
    if(detruit||mien!==version){rendreTexture(kitTex);return;}
    modele.traverse(o=>{if(!o.isSkinnedMesh)return;o.frustumCulled=false;
      if(/body_|head_/.test(o.name)){o.material=o.material.clone();o.material.map=null;o.material.vertexColors=false;o.material.color.set(look.skin);o.material.roughness=.92;return;}
      if(/shirt|short|sock|boot/.test(o.name)){o.material=o.material.clone();o.material.roughness=.85;
        if(kitTex){o.material.color.set('#fff');o.material.map=kitTex;}
        else{o.material.map=null;o.material.color.set(o.name.includes('shirt')?(tenue.principal||'#15317e'):o.name.includes('sock')?(tenue.chaussettes||tenue.principal||'#15317e'):o.name.includes('short')?(tenue.short||'#16203a'):'#202325');}}
    });
    groupe.add(modele);groupe.updateMatrixWorld(true);
    habiller(r,modele,kind,look);
    const pose=preparePose(modele,motions.rigs[kind]);
    const clip=motions.clips[options.pose||'menu_idle_breathing_legs_apart']||motions.clips.idle||motions.clips.light_idle;
    acteur={model:modele,pose,clip};
    // Le nouveau joueur est en place : tout autre modèle encore dans la scène est retiré ET rendu.
    for(const ancien of [...groupe.children])if(ancien!==modele){groupe.remove(ancien);rendreModele(ancien);}
    applyPose(pose,clip,0,true);modele.updateMatrixWorld(true);
    const total=new THREE.Box3().setFromObject(modele,true);
    modele.position.y-=total.min.y;modele.updateMatrixWorld(true);
    hauteurCorps=Math.max(1.4,total.max.y-total.min.y);
    cadrer();
  }
  // Correctif 32 : ce qu'une reconstruction remplace est RENDU — matériaux clonés, squelette, maillot peint et sa toile.
  // Les modèles en cache sont protégés (`ressources.mjs`) : seul ce qui appartient à ce modèle-ci part.
  function rendreModele(m){try{planLiberation([m]).tout();}catch(e){console.warn('Aperçu du joueur :',e);}}
  function rendreTexture(t){if(!t)return;try{t.dispose();const im=t.image;if(im&&typeof im.getContext==='function'){im.width=1;im.height=1;}}catch{}}
  // Sorti de l'écran (page défilée, onglet du profil replié), l'aperçu ne pose ni ne dessine plus rien.
  let aLEcran=true;
  const veilleur=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(vues=>{aLEcran=vues[vues.length-1].isIntersecting;}):null;veilleur?.observe(conteneur);
  let trame=0;
  function boucle(t){
    if(detruit)return;
    trame=requestAnimationFrame(boucle);
    if(!aLEcran){horloge=t;return;}
    const dt=Math.min(.05,(t-horloge)/1000||0);horloge=t;
    if(acteur){applyPose(acteur.pose,acteur.clip,t/1000,true);}
    if(!enGlisse)angle+=(cible-angle)*Math.min(1,dt*8);
    groupe.rotation.y=angle+Math.PI;
    cadrer();renderer.render(scene,camera);
  }
  const bas=ev=>{enGlisse=true;dernierX=ev.clientX;toile.style.cursor='grabbing';toile.setPointerCapture?.(ev.pointerId);};
  const bouge=ev=>{if(!enGlisse)return;const dx=ev.clientX-dernierX;dernierX=ev.clientX;angle+=dx*.012;cible=angle;};
  const haut=ev=>{enGlisse=false;toile.style.cursor='grab';try{toile.releasePointerCapture?.(ev.pointerId);}catch{}};
  toile.addEventListener('pointerdown',bas);toile.addEventListener('pointermove',bouge);toile.addEventListener('pointerup',haut);toile.addEventListener('pointercancel',haut);
  const observateur=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>cadrer()):null;observateur?.observe(conteneur);
  await construire(options);
  trame=requestAnimationFrame(boucle);
  return {
    /** Reconstruit le joueur avec de nouvelles options (apparence, équipement, maillot, poste). */
    async mettreAJour(opt){await construire({...optionsCourantes,...opt});},
    /** 'face' | 'profil' | 'dos' | un angle en radians. */
    orienter(cote){cible=typeof cote==='number'?cote:cote==='profil'?Math.PI/2:cote==='dos'?Math.PI:0;enGlisse=false;},
    cadrer(mode){cadrage=mode==='visage'?'visage':'corps';cadrer();},
    get angle(){return angle;},interne:{scene,renderer,camera,groupe},
    recadrer:cadrer,
    detruire(){detruit=true;cancelAnimationFrame(trame);toile.removeEventListener('pointerdown',bas);toile.removeEventListener('pointermove',bouge);toile.removeEventListener('pointerup',haut);toile.removeEventListener('pointercancel',haut);observateur?.disconnect();veilleur?.disconnect();rendreModele(scene);acteur=null;renderer.dispose();renderer.forceContextLoss?.();toile.width=1;toile.height=1;toile.remove();},
  };
}
