import * as THREE from '/rn26/vendor/three/build/three.module.js';
import { GLTFLoader } from '/rn26/vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from '/rn26/vendor/three/examples/jsm/utils/SkeletonUtils.js';
import { loadMotions,preparePose,applyPose,rootAt } from './motion.js';
import { DestinyMatch,xyz,clamp,TICK } from './destiny.mjs';
import { armChain } from './liaisons.js';
import { appearance,souhaitDepuisCarte,tirage,prepareBody,groundBody,grip,trackBall,bindLift,findHairMesh,fitToHead,raiseTorso,COIFFURES,BARBES } from './corps.js';
import { prepareGaits,locomotion } from './allures.js';
import { creerTenue,numeroter,creerPanneaux,creerAbords,creerPublic,creerEtiquette,creerBallon,nettoyerStade,chargerImage,texture,departagerTenues,nomCourt,luminance,hexa,MAILLOT_DEFAUT } from './habillage.js';
import { creerSons } from './sons.js';
import { creerTelevision } from './television.js';

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
  if(!ballons.has(nom))ballons.set(nom,new GLTFLoader().loadAsync(RACINE_DECOR+'equipement/ballon-'+nom+'.glb').then(g=>{let m=null;g.scene.traverse(o=>{if(o.isMesh)m=o;});return m;}).catch(()=>null));
  return ballons.get(nom);
}
let ressources=null;
const peintComme=(canvas,avant)=>{const t=texture(canvas,null);if(avant){t.wrapS=avant.wrapS;t.wrapT=avant.wrapT;t.repeat.copy(avant.repeat);t.offset.copy(avant.offset);t.flipY=avant.flipY;}return t;};
/** Joueurs, ballon, coiffures, équipement et mouvements : chargés une fois, partagés par tous les matchs de la session. */
function charger(){
  ressources??=(async()=>{
    const loader=new GLTFLoader(),image=nom=>chargerImage(RACINE_DECOR+nom);
    const [motions,forward,back,ball,hair,tee,kit]=await Promise.all([
      loadMotions('catalogue-match-poses.json'),loader.loadAsync(RACINE_MODELES+'player_male_forward_LOD2.glb'),loader.loadAsync(RACINE_MODELES+'player_male_back_LOD2.glb'),
      loader.loadAsync(RACINE_DECOR+'ballon.glb'),loader.loadAsync(RACINE_DECOR+'coiffures.glb'),
      loader.loadAsync(RACINE_DECOR+'tee.glb'),image('kit_france_home.png'),
    ]);
    // Casques et crampons de la boutique, allégés pour le match (alleger_equipement.mjs).
    // Un fichier manquant n'empêche rien : le joueur garde l'équipement d'origine.
    const equipement=async noms=>(await Promise.all(noms.map(n=>loader.loadAsync(RACINE_DECOR+'equipement/'+n+'.glb').then(g=>{let m=null;g.scene.traverse(o=>{if(o.isMesh)m=o;});return m;}).catch(()=>null)))).filter(Boolean);
    const [casques,crampons]=await Promise.all([equipement(['casque','casque-rouge','casque-australie','casque-tribal','casque-rose']),equipement(['crampons','crampons-bleus','crampons-dupont','crampons-graffiti','crampons-roses'])]);
    const gaits={};for(const [key,rig] of Object.entries(motions.rigs))gaits[key]=prepareGaits(motions.clips,rig.scale);
    // ⚠️ AUCUNE MARQUE DE L'ÉDITEUR D'ORIGINE NE RESTE À L'IMAGE : le ballon est
    // repeint une fois pour la session, le panneau du stade à son chargement (le
    // maillot, les réclames et les abords le sont par scène, dans habillage.js).
    try{
      await document.fonts?.load?.('40px Anton').catch(()=>{});
      ball.scene.traverse(o=>{if(o.isMesh&&o.material?.map&&/ball/i.test(o.material.name)&&!/shadow/i.test(o.material.name))o.material.map=peintComme(creerBallon(512),o.material.map);});
    }catch(e){console.warn('Marquage Destiny Rugby :',e);}
    return {motions,gaits,forward:forward.scene,back:back.scene,hair:hair.scene,casques,crampons,ball:ball.scene,tee:tee.scene,kit};
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
function chargerStade(nom){
  const fichier=STADES[nom]||STADES.international;
  if(!decors.has(fichier))decors.set(fichier,(async()=>{
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
    return {decor,origine,materiaux};
  })().catch(e=>{
    // Un décor absent ou illisible : on retombe sur l'enceinte d'origine, jamais sur un terrain vide.
    decors.delete(fichier);if(fichier===STADES.international)throw e;
    console.warn('Stade « '+nom+' » indisponible :',e);return chargerStade('international');
  }));
  return decors.get(fichier);
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
  const [r,stade]=await Promise.all([charger(),chargerStade(options.stade)]);
  const {motions,gaits}=r,leger=!!options.leger;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#b6d4e4');scene.fog=new THREE.Fog('#b6d4e4',180,420);
  const camera=new THREE.PerspectiveCamera(48,1,.1,600);
  const renderer=new THREE.WebGLRenderer({antialias:!leger,preserveDrawingBuffer:!!options.capture,powerPreference:'high-performance'});
  let definition=Math.min(globalThis.devicePixelRatio||1,leger?1.25:1.5);
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
  const decor=clone(stade.decor);scene.add(decor);
  // Autour d'un petit stade il n'y a pas de ville modélisée : un sol jusqu'à l'horizon évite le vide sous le ciel.
  const alentours=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshStandardMaterial({color:'#7d9160',roughness:1,metalness:0}));alentours.rotation.x=-Math.PI/2;alentours.position.y=-.12;scene.add(alentours);
  const jetables=[],propres={};
  decor.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material)||!['banners','banners_noscroll','surround_objects_2021'].includes(o.material.name))return;
    propres[o.material.name]??=o.material.clone();o.material=propres[o.material.name];
  });
  jetables.push(...Object.values(propres));
  const [tenueA,tenueB]=departagerTenues({...MAILLOT_DEFAUT,...options.equipes?.[0]?.maillot},{...MAILLOT_DEFAUT,principal:'#f2f4f3',secondaire:'#dfe5e8',accent:'#c8102e',short:'#f2f4f3',chaussettes:'#0b1f44',...options.equipes?.[1]?.maillot});
  const blasons=await Promise.all([0,1].map(i=>chargerImage(options.equipes?.[i]?.blason)));
  await document.fonts?.load?.('40px Anton').catch(()=>{});
  const tailleTenue=leger?512:1024;
  const tenues=[tenueA,tenueB].map((m,i)=>{
    try{return creerTenue(r.kit,m,blasons[i],1024);}
    // Un écusson servi sans en-tête de partage « salit » la toile : on recommence sans lui.
    catch{return creerTenue(r.kit,m,null,1024);}
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
  const teeMesh=clone(r.tee);teeMesh.rotation.x=Math.PI/2;teeMesh.visible=false;scene.add(teeMesh);
  teeMesh.updateMatrixWorld(true);const teeBounds=new THREE.Box3().setFromObject(teeMesh);teeMesh.userData.floor=-teeBounds.min.y;teeMesh.userData.top=teeBounds.max.y-teeBounds.min.y;
  const anneau=(interieur,exterieur,teinte,opacite)=>{const m=new THREE.Mesh(new THREE.RingGeometry(interieur,exterieur,40),new THREE.MeshBasicMaterial({color:teinte,side:THREE.DoubleSide,transparent:true,opacity:opacite,depthWrite:false}));m.rotation.x=-Math.PI/2;m.visible=false;scene.add(m);return m;};
  const halo=anneau(.48,.58,'#f5efb9',.7),aura=anneau(.62,.74,'#ffd257',.85);
  const etiquette=creerEtiquette(renderer);scene.add(etiquette.sprite);
  // Le halo du porteur prend la couleur de son équipe, éclaircie si elle est trop sombre pour la pelouse.
  const teintesHalo=[tenueA,tenueB].map(t=>luminance(t.principal)<.3?'#f5efb9':hexa(t.principal));

  const actors=new Map(),officials=[];
  let match=null,paused=false,snap=true,speed=1,mode=options.camera||'follow',detruite=false;
  const handA=new THREE.Vector3(),handB=new THREE.Vector3(),tmp=new THREE.Vector3(),tmp2=new THREE.Vector3(),tmp3=new THREE.Vector3();
  const gripL=new THREE.Vector3(),gripR=new THREE.Vector3(),rootNow={x:0,z:0},rootRef={x:0,z:0};
  const qa=new THREE.Quaternion();

  function shadow(){const m=new THREE.Mesh(new THREE.CircleGeometry(.42,18),new THREE.MeshBasicMaterial({color:'#172319',transparent:true,opacity:.24,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.015;return m;}
  /** Coiffure, barbe et accessoire : ajustés sur le crâne puis attachés à l'os de la tête. */
  function dress(model,kind,look){
    const head=model.getObjectByName('CC_Base_Head');let headMesh=null;
    model.traverse(o=>{if(o.isSkinnedMesh&&/head_/.test(o.name))headMesh=o;});
    if(!head||!headMesh)return;
    const attach=(source,color,marge,roughness=.82)=>{
      if(!source)return;
      // Le masque de la planche découpe les mèches : sans lui, chaque coupe est un bloc plein.
      const masque=source.material?.map||null;
      const mesh=new THREE.Mesh(fitToHead(source,headMesh,kind,marge),new THREE.MeshStandardMaterial({color,roughness,metalness:0,side:THREE.DoubleSide,map:masque,alphaTest:masque?.38:0}));
      mesh.name=source.name;model.add(mesh);model.updateMatrixWorld(true);head.attach(mesh);
    };
    const casque=look.accessory==='casque';
    if(look.hair&&!casque)attach(findHairMesh(r.hair,'Hair',look.hair,COIFFURES),look.color,.007);
    if(look.beard)attach(findHairMesh(r.hair,'Beard',look.beard,BARBES),new THREE.Color(look.color).multiplyScalar(.85),.004);
    if(casque){
      // Un des casques de la boutique, tiré par joueur ; à défaut, le casque d'origine teinté.
      const modele=r.casques.length?r.casques[Math.floor(tirage(look.graine??0,9)*r.casques.length)%r.casques.length]:null;
      if(modele){
        const box=new THREE.Box3().setFromBufferAttribute(headMesh.geometry.attributes.position);
        const mesh=new THREE.Mesh(modele.geometry,modele.material);mesh.name='Casque';
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
    // Les crampons : la paire d'origine pour un joueur sur deux, un modèle de la boutique pour les autres.
    if(r.crampons.length&&look.graine!==undefined&&tirage(look.graine,10)<.55){
      const modele=r.crampons[Math.floor(tirage(look.graine,11)*r.crampons.length)%r.crampons.length];
      let bottes=null;model.traverse(o=>{if(o.isSkinnedMesh&&/boot/.test(o.name))bottes=o;});
      const pieds=['L','R'].map(c=>model.getObjectByName('CC_Base_'+c+'_Foot')).filter(Boolean);
      if(bottes&&pieds.length===2){
        const p=bottes.geometry.attributes.position,poses=[];
        for(const pied of pieds){
          const ou=model.worldToLocal(pied.getWorldPosition(new THREE.Vector3())),cote=Math.sign(ou.x)||1,b=new THREE.Box3();
          for(let i=0;i<p.count;i++)if(p.getX(i)*cote>0)b.expandByPoint(tmp.set(p.getX(i),p.getY(i),p.getZ(i)));
          if(!b.isEmpty())poses.push({pied,b});
        }
        if(poses.length===2){
          bottes.visible=false;
          for(const {pied,b} of poses){
            const mesh=new THREE.Mesh(modele.geometry,modele.material);mesh.name='Crampon';
            mesh.scale.setScalar((b.max.z-b.min.z)*CRAMPON.taille);mesh.position.set((b.min.x+b.max.x)/2,b.min.y,(b.min.z+b.max.z)/2);
            model.add(mesh);model.updateMatrixWorld(true);pied.attach(mesh);
          }
        }
      }
    }
    if(look.accessory==='bandeau')attach(r.hair.getObjectByName('Headband_LOD2'),look.bandColor,.014,.7);
  }
  function buildActor(template,kind,kit,index,number,ref=false,wish={}){
    const model=clone(template),group=new THREE.Group(),look=appearance(index,wish,kind==='male_forward'&&!ref);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model,true);model.position.y=-bounds.min.y;
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
    prepareBody(actor);return actor;
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
      a=buildActor(p.number<=8?r.forward:r.back,kind,kit,index,p.shirt,false,{...souhait(p),accessoire:porteCasque(p)?'casque':tirage(index,7)>.93?'bandeau':''});
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
    const l=Math.max(1,conteneur.clientWidth),h=Math.max(1,conteneur.clientHeight);
    if(l===largeur&&h===hauteur)return;largeur=l;hauteur=h;
    camera.aspect=l/h;camera.fov=camera.aspect<.8?64:camera.aspect<1.2?56:48;camera.updateProjectionMatrix();renderer.setSize(l,h,false);
  }
  const observateur=new ResizeObserver(cadrer);observateur.observe(conteneur);cadrer();

  // ── Son et réalisation ────────────────────────────────────────────────────
  const sons=options.son===false?null:creerSons({leger});
  const tele=creerTelevision({conteneur,actors,officials,ballMesh,teeMesh,leger,habillage:options.habillage||{},textes:options.textes||{},surVolet:()=>sons?.evenement('volet',{gain:.45})});
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
    for(const b of a.pose.bones){b.bone.quaternion.toArray(s,i);i+=4;}
    s[i]=a.pose.hips.position.x;s[i+1]=a.pose.hips.position.y;s[i+2]=a.pose.hips.position.z;
  }
  function crossFade(a,k){
    const s=a.snapshot;let i=0;
    for(const b of a.pose.bones){qa.fromArray(s,i);b.bone.quaternion.copy(qa.slerp(b.bone.quaternion,k));i+=4;}
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
  function construire(a,proc){
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
      const played=posePlayer(a,m,{x:p.vx,z:p.vz},simDt,still);
      placePlayer(a,p,m,played,base,simDt,still);
      a.shown.copy(a.group.position);
      if(m.air){a.model.position.y=a.baseY;a.lift=0;a.group.updateMatrixWorld(true);}else groundBody(a,simDt||.016);
      if(m.proc)gestesConstruits.push([a,m.proc]);
      if(m.ouvre)ouvrir(a,m.ouvre);
      else if(m.watch||match.flight?.type==='pied'&&m.loco)trackBall(a,tmp.set(ball.x,Math.max(.3,ball.y),ball.z),m.watch?.55:.28);
      else if(m.regard&&m.loco)trackBall(a,tmp.set(m.regard.x,m.regard.y??1.5,m.regard.z),.5);
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
    renderCamera(dt,visualTime);
    // Le nom du porteur, dans sa flamme, sous ses appuis.
    if(porteur&&porteur.nom&&options.noms!==false){
      etiquette.ecrire(porteur.nom,match.team===0?tenueA.principal:tenueB.principal);
      const sp=etiquette.sprite,d=camera.position.distanceTo(porteur.group.position),h=d*Math.tan(camera.fov*Math.PI/360)*2*(leger?.062:.05)*clamp(900/hauteur,.75,1.6);
      sp.position.set(porteur.group.position.x,-.06,porteur.group.position.z);sp.scale.set(h*4,h,1);sp.visible=true;
    }else etiquette.sprite.visible=false;
    if(!still&&!fige)tele.enregistrer(visualTime);
    renderer.render(scene,camera);snap=false;
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
        const sifflet=match.whistle&&visualTime-match.whistle.start<2.4?match.whistle:null;
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
        else if(sifflet){
          const t=visualTime-sifflet.start;
          upper=t<1?{name:'whistle',time:t*1.6}:{name:/enAvant|passeAvant/.test(sifflet.cle)?'knock_on':/hors-jeu/.test(e.penalite?.motif||'')&&clips.indicate_offside_low?'indicate_offside_low':'penalty',time:t-1};
        }else if(m&&m.etape==='placement'&&visualTime-match.phaseStart<1.9)upper={name:'forming_a_scrum',time:visualTime-match.phaseStart};
        a.card.visible=!!card&&age>3.5&&age<4.5;
        if(a.card.visible){a.rightHand.getWorldPosition(a.card.position);a.card.material.color.set(match.card.red?'#e32622':'#ffe229');a.card.quaternion.copy(a.group.quaternion);a.card.position.y+=.065;}
      }else{
        // Arbitre de touche : il court le long de sa ligne, à hauteur du ballon.
        const side=i===1?-1:1;let tx=side*TOUCHE_X,tz,vmax=6.2,zone=1.1;
        if(tir&&(tir.etape==='pose'||tir.etape==='pret'||tir.etape==='elan'||tir.volLance)){
          // Tir au but : les deux juges vont se placer derrière les poteaux.
          const goal=tir.buteur.cote==='A'?1:-1;tx=side*3.6;tz=goal*51.7;vmax=6.5;zone=.3;
        }else if(kick){tz=xyz(kick.vers).z;vmax=8.4;zone=.6;}
        else{
          tz=match.ball.z+(match.carrier?clamp((match.byId.get(match.carrier)?.vz||0)*.5,-3,3):0);
          if(!['jeuCourant','ballonLibre'].includes(e.phase)){vmax=3.4;zone=1.6;}
        }
        tz=clamp(tz,-57,57);
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
      else if(tir.etape==='celebration'||tir.etape==='approche'){const sol=xyz(tir.ballonAuSol||tir.lieu||e.ballon);t.set(sol.x,SOL,sol.z);key='sol:tir';}
      else if(tir.etape==='ramassage'){
        const sol=xyz(tir.ballonAuSol||tir.lieu||e.ballon);
        if(depuis<.5||!kicker){t.set(sol.x,SOL,sol.z);key='sol:tir';}else{hands(kicker,t);key='main:'+tir.buteur.id;heading=kicker.heading;orientation='main';}
      }else if(tir.etape==='transport'&&kicker){hands(kicker,t);key='main:'+tir.buteur.id;heading=kicker.heading;orientation='main';}
      else if(tir.etape==='pose'&&kicker){
        // Le buteur s'accroupit, cale le tee puis y dépose le ballon.
        const u=depuis/(match.outils.RITUEL_TIR?.pose??9.6);teeMesh.visible=u>.095;
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
      const progress=match.progress(offset),thrower=match.players.find(p=>p.number===2&&p.team===match.team),target=actors.get(e.conquete?.cibleId),lanceur=actors.get(thrower?.id);
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
          const u=clamp((progress-.6)/.22,0,1);t.lerp(handA,u);t.y+=Math.sin(Math.PI*u)*1.2;key='lancer';orientation=u<1?'vol':'main';st.spin+=simDt*9;
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
      }else{hands(holder,t,motion?.carry==='bras');key='main:'+match.carrier;heading=holder.heading;orientation='main';}
    }else if(e.ballonLibre){key='libre';orientation='libre';}
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
    else if(orientation==='libre'){const o=e.ballonLibre.orientation||0;ballMesh.rotation.set(o,0,o*.37);}
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
      if(kicker&&!tir.volLance){want.copy(kicker.group.position).lerp(tmp.set(xyz(tir.lieu||e.ballon).x,0,xyz(tir.lieu||e.ballon).z),tir.etape==='pose'||tir.etape==='pret'||tir.etape==='elan'?.5:.15);want.y=1.1;}
      zoom=tir.volLance?1.15:tir.etape==='pose'||tir.etape==='pret'||tir.etape==='elan'?.5:.7;suivi=.7;
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
    if(mode==='tv'){const c=tele.choisirPlan(match,visualTime);plan=c.plan;coupe=c.coupe;}
    if(plan!==planAffiche){coupe=coupe||!(['follow','close'].includes(plan)&&['follow','close'].includes(planAffiche));planAffiche=plan;}
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
  }

  // ── Définition adaptative : on préfère une image un peu moins fine à une image saccadée ──
  let cumul=0,images=0,ips=60;
  function mesurer(dt){
    // Au-delà d'un dixième de seconde par image, ce n'est plus la carte graphique
    // qui peine : c'est le navigateur qui bride un onglet caché.
    if(dt>.1||document.hidden)return;
    cumul+=dt;images++;
    if(images<75)return;
    const moyenne=cumul/images;ips=Math.round(1/moyenne);cumul=0;images=0;
    if(moyenne>1/40&&definition>.72&&!paused){definition=Math.max(.72,definition-.16);renderer.setPixelRatio(definition);renderer.setSize(largeur,hauteur,false);}
  }

  const projete=new THREE.Vector3();
  const api={
    /** Vue forcée [dx, y, dz, hauteur visée] pour les vérifications ; `null` en jeu. */
    vue:null,
    get match(){return match;},
    get ips(){return ips;},
    get definition(){return definition;},
    interne:{actors,officials,camera,scene,renderer,motions,THREE,rig,ballState,tenues,tele},
    /** Branche un état de match. `direct` : état déjà interpolé (relevés du direct en ligne). */
    brancher(etat,{direct=false}={}){
      match=etat instanceof DestinyMatch?etat:new DestinyMatch({etat,outils:options.outils,direct});
      for(const a of actors.values()){a.group.visible=false;a.vivait=false;a.anchorBlend=0;}
      snap=true;ballState.key='';return match;
    },
    /** Une image. `fige` : le match est arrêté (carte de décision, pause), la scène reste affichée. */
    image(dt,{fige=false,vitesse=1,still=false}={}){
      if(detruite||!match)return;
      paused=fige;speed=vitesse;
      if(match.observe())api.surPas?.(match);
      if(!still){realiser(match.time+match.offset(),fige,vitesse);sons?.surImage(match,dt,{fige,vitesse});}
      render(dt,still);
      if(!fige&&!still)mesurer(dt);
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
      return {x:(projete.x+1)/2*largeur,y:(1-projete.y)/2*hauteur,dedans:projete.z<1&&Math.abs(projete.x)<.98&&Math.abs(projete.y)<.98};
    },
    cadrer,
    detruire(){
      if(detruite)return;detruite=true;observateur.disconnect();
      toile.removeEventListener('pointerdown',passerAuToucher);sons?.detruire();tele.detruire();
      for(const a of [...actors.values(),...officials]){a.kit?.dispose();a.model.traverse(o=>{if(o.isMesh&&o.material?.dispose&&o.material!==undefined){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});scene.remove(a.group);if(a.flag)scene.remove(a.flag);if(a.card)scene.remove(a.card);}
      actors.clear();
      // Le stade partagé n'a jamais été touché : seules les copies de cette scène sont libérées.
      for(const j of jetables)j.dispose?.();
      etiquette.sprite.material.map.dispose();etiquette.sprite.material.dispose();
      scene.remove(decor);
      renderer.dispose();renderer.forceContextLoss?.();toile.remove();
    },
  };
  return api;
}
export { DestinyMatch,TICK };
