import * as THREE from '/rn26/vendor/three/build/three.module.js';
import { reach,aimBone } from './liaisons.js';
const point=new THREE.Vector3(),hips=new THREE.Vector3(),spine=new THREE.Vector3();
const front=new THREE.Vector3(),pole=new THREE.Vector3();
export const skins=['#e2b99a','#d3a17c','#c99168','#ad7651','#875333','#623b29','#452d23'];

// ---------------------------------------------------------------------------
// APPARENCE : coiffures, barbes et accessoires récupérés
// ---------------------------------------------------------------------------
// Les 23 coiffures et 15 barbes de l'APK, rangées par famille. Une donnée
// absente ne rend jamais un joueur chauve par défaut : la coupe est alors tirée
// dans une famille cohérente, et un maillage manquant est remplacé par un voisin.
// Rangées d'après ce qu'on VOIT une fois le masque appliqué (mesurer_coiffures.py) :
// surface opaque et hauteur où la coupe s'arrête, pas l'encombrement du maillage.
export const COIFFURES={
  ras:['19','18','16'],
  court:['09','13','14','21','23','12'],
  miLong:['01','02','10'],
  long:['03','05','06','07','08','25','11'],
  boucle:['22','15','17','24','12','10'],
};
export const BARBES={moustache:['01'],bouc:['02','03','04'],courte:['05','06','07','08','09','10'],longue:['11','12','13','14','15']};
const TEINTES_CLAIRES=['#2a211c','#3b2a1f','#4a3324','#5d4129','#7a5a34','#a07c48','#c2a063','#8a4a25','#6e6a66','#231c19'];
const TEINTES_SOMBRES=['#15110f','#1c1613','#241a15','#15110f','#2b1f18','#1c1613'];
/** Tirage reproductible entre 0 et 1 pour un joueur et un trait donnés. */
export function tirage(index,sel){
  let h=Math.imul(index+1,0x9e3779b1)^Math.imul(sel+7,0x85ebca6b);
  h=Math.imul(h^(h>>>15),0x2c1b3c6d);h=Math.imul(h^(h>>>12),0x297a2d39);
  return ((h^(h>>>15))>>>0)/4294967296;
}
const choisir=(liste,x)=>liste[Math.min(liste.length-1,Math.floor(x*liste.length))];
/**
 * L'apparence d'un joueur. `souhait` vient des données quand elles existent
 * ({coupe, barbe, teinte, peau, accessoire}) ; tout champ absent est tiré.
 */
export function appearance(index,souhait={},avant=false){
  const peau=souhait.peau??Math.floor(tirage(index,1)*skins.length);
  const sombre=souhait.sombre??peau>=4;
  const t=tirage(index,2);
  // Chauve, ras, court, mi-long, long, bouclé : la répartition d'un vestiaire.
  const famille=souhait.famille??(t<.07?'chauve':t<.19?'ras':t<.57?'court':t<.71?'miLong':t<.81?'long':'boucle');
  const coupe=souhait.coupe??(famille==='chauve'?'':choisir(COIFFURES[sombre&&famille==='long'?'boucle':famille]||COIFFURES.court,tirage(index,3)));
  const b=tirage(index,4);
  const familleBarbe=souhait.familleBarbe??(b<.42?'':b<.50?'moustache':b<.60?'bouc':b<.86?'courte':'longue');
  const barbe=souhait.barbe??(familleBarbe?choisir(BARBES[familleBarbe],tirage(index,5)):'');
  const teintes=sombre?TEINTES_SOMBRES:TEINTES_CLAIRES;
  const teinte=souhait.teinte??choisir(teintes,tirage(index,6));
  const a=tirage(index,7);
  // Le casque est une affaire d'avants ; le bandeau se voit partout.
  const accessoire=souhait.accessoire??(avant&&a<.14?'casque':a>.93?'bandeau':'');
  return {skin:souhait.couleurPeau??skins[peau],peau,famille,hair:coupe,beard:barbe,familleBarbe,color:teinte,accessory:accessoire,
    teinteBarbe:souhait.teinteBarbe,casqueModele:souhait.casque,cramponsModele:souhait.crampons,equipe:!!souhait.equipe,morpho:souhait.morpho,
    bandColor:choisir(['#f2f2ee','#16181c','#1f4fa8','#c8202a','#f2f2ee'],tirage(index,8))};
}
const FAMILLES_CARTE={bald:'chauve',buzz:'ras',short:'court',fade:'court',mohawk:'court',messy:'miLong',mullet:'miLong',curly:'boucle',afro:'boucle',long:'long',dreadlocks:'long'};
const BARBES_CARTE={none:'',moustache:'moustache',goatee:'bouc',short_beard:'courte',full_beard:'longue'};
/**
 * Ce que la carte du joueur sait de lui (peau, cheveux, coupe, barbe lues sur
 * son portrait) traduit en souhait pour `appearance`. Un champ inconnu reste
 * absent : il sera tiré dans une famille cohérente, jamais « chauve » par défaut.
 */
export function souhaitDepuisCarte(a){
  if(!a)return {};
  const s={};
  if(a.peau){s.couleurPeau=a.peau;const n=parseInt(String(a.peau).replace('#',''),16);s.sombre=((n>>16&255)*.299+(n>>8&255)*.587+(n&255)*.114)/255<.44;}
  if(a.cheveux)s.teinte=a.cheveux;
  if(a.coiffure&&FAMILLES_CARTE[a.coiffure]!==undefined)s.famille=FAMILLES_CARTE[a.coiffure];
  if(a.barbe&&BARBES_CARTE[a.barbe]!==undefined)s.familleBarbe=BARBES_CARTE[a.barbe];
  if(a.accessoire!==undefined)s.accessoire=a.accessoire;
  // Correctif 20 : coupe et barbe EXACTES (numéro de maillage), couleur de barbe, équipement porté, morphologie.
  if(a.coupeId!==undefined)s.coupe=a.coupeId;
  if(a.barbeId!==undefined)s.barbe=a.barbeId;
  if(a.couleurBarbe)s.teinteBarbe=a.couleurBarbe;
  if(a.equipement){s.equipe=true;s.casque=a.equipement.casque||null;s.crampons=a.equipement.crampons||null;}
  if(a.morpho)s.morpho=a.morpho;
  return s;
}
/** Le maillage demandé, ou le plus proche disponible dans la même famille. */
export function findHairMesh(scene,prefixe,numero,familles){
  const direct=scene.getObjectByName(prefixe+'_'+numero+'_LOD2');
  if(direct)return direct;
  const famille=Object.values(familles).find(liste=>liste.includes(numero))||Object.values(familles).flat();
  for(const autre of [...famille,...Object.values(familles).flat()]){const m=scene.getObjectByName(prefixe+'_'+autre+'_LOD2');if(m)return m;}
  return null;
}

const ajustes=new Map();
/**
 * Pose une coiffure SUR le crâne. Les maillages récupérés sont légèrement plus
 * petits que la tête LOD2 : rendus tels quels ils restent sous la peau et tous
 * les joueurs paraissent chauves. Chaque sommet est donc repoussé juste
 * au-dessus de la surface de la tête, dans sa direction depuis le centre du crâne.
 */
/** Le nez de la tête pour laquelle les barbes de l'APK ont été modelées (repère du maillage, visage vers −z). */
const NEZ_DE_REFERENCE={y:1.672,z:-.066};
/** Retouche à l'œil par type de tête : décalage vertical, profondeur (négatif = vers l'avant du visage), échelle légère. */
export const REGLAGE_BARBE={male_back:{dy:0,dz:.008,echelle:1},male_forward:{dy:0,dz:.010,echelle:1.03}};
const rayonBarbe=new THREE.Raycaster();
/**
 * Pose une barbe ou une moustache SUR la mâchoire (Correctif 25). Voir `correctif_25_barbes.cjs` : la barbe est calée
 * sur le nez de la tête qui la porte, puis ses sommets enfouis sont ramenés à la peau le long d'un rayon parti de
 * derrière la bouche — jamais du sommet du crâne, qui les envoyait sous le menton.
 */
export function fitBeard(source,headMesh,key,marge=.002){
  const cle='barbe:'+key+':'+source.name+':'+marge+':'+JSON.stringify(REGLAGE_BARBE[key]);
  if(ajustes.has(cle))return ajustes.get(cle);
  const tete=headMesh.geometry.attributes.position;
  let nez=null;
  for(let i=0;i<tete.count;i++){if(Math.abs(tete.getX(i))>.012)continue;const z=tete.getZ(i);if(!nez||z<nez.z)nez={y:tete.getY(i),z};}
  const r=REGLAGE_BARBE[key]||{dy:0,dz:0,echelle:1};
  const dy=(nez?nez.y-NEZ_DE_REFERENCE.y:0)+r.dy,dz=(nez?nez.z-NEZ_DE_REFERENCE.z:0)+r.dz,e=r.echelle||1;
  // L'échelle se prend autour d'un point situé derrière la lèvre : la barbe s'élargit sans monter ni descendre.
  const ax=0,ay=NEZ_DE_REFERENCE.y-.03,az=NEZ_DE_REFERENCE.z+.05;
  const geometry=source.geometry.clone(),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setXYZ(i,ax+(p.getX(i)-ax)*e,ay+(p.getY(i)-ay)*e+dy,az+(p.getZ(i)-az)*e+dz);
  // Les barbes complètes rejoignent le bord avant des oreilles par leurs pattes.
  // Seule leur extrémité latérale remonte : ni le menton, ni la moustache, ni les boucs ne sont étirés.
  if(nez&&/^Beard_(0[5-9]|1[0-5])_/.test(source.name)){
    let largeur=0;for(let i=0;i<tete.count;i++)largeur=Math.max(largeur,Math.abs(tete.getX(i)));
    let oreilleY=-Infinity,oreilleZ=Infinity;
    for(let i=0;i<tete.count;i++)if(Math.abs(tete.getX(i))>largeur*.84&&tete.getY(i)>nez.y-.015&&tete.getY(i)<nez.y+.06){
      oreilleY=Math.max(oreilleY,tete.getY(i));oreilleZ=Math.min(oreilleZ,tete.getZ(i));
    }
    let haut=-Infinity,arriere=-Infinity;
    for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))>.05&&p.getZ(i)>-.005){haut=Math.max(haut,p.getY(i));arriere=Math.max(arriere,p.getZ(i));}
    if(Number.isFinite(haut)&&Number.isFinite(oreilleY))for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const k=THREE.MathUtils.smoothstep(Math.abs(x),.045,.065)*THREE.MathUtils.smoothstep(y,haut-.055,haut-.005)*THREE.MathUtils.smoothstep(z,-.01,.025);
      p.setXYZ(i,x+Math.sign(x)*k*.004,y+k*Math.max(0,oreilleY-.008-haut),z+k*Math.max(0,oreilleZ-.006-arriere));
    }
  }
  if(nez){
    // La peau : les triangles de la tête au repos, vus de l'intérieur.
    const peau=new THREE.Mesh(headMesh.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
    const centre=new THREE.Vector3(0,nez.y-.055,nez.z+.085),dir=new THREE.Vector3(),pt=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      pt.set(p.getX(i),p.getY(i),p.getZ(i));dir.copy(pt).sub(centre);
      const d=dir.length();if(d<1e-5)continue;dir.multiplyScalar(1/d);
      rayonBarbe.set(centre,dir);rayonBarbe.far=.4;
      const touche=rayonBarbe.intersectObject(peau,false)[0];
      // Les lèvres ont un relief anguleux : conserver une fine épaisseur évite de couper la moustache en fragments.
      const epaisseur=pt.y>nez.y-.04&&Math.abs(pt.x)<.05?Math.max(marge,.006):marge;
      if(touche&&d<touche.distance+epaisseur)p.setXYZ(i,centre.x+dir.x*(touche.distance+epaisseur),centre.y+dir.y*(touche.distance+epaisseur),centre.z+dir.z*(touche.distance+epaisseur));
    }
    peau.material.dispose();
  }
  p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();ajustes.set(cle,geometry);return geometry;
}
export function fitToHead(source,headMesh,key,marge=.006){
  const cle=key+':'+source.name+':'+marge;
  if(ajustes.has(cle))return ajustes.get(cle);
  const tete=headMesh.geometry.attributes.position,box=new THREE.Box3().setFromBufferAttribute(tete);
  const centre=new THREE.Vector3(0,box.max.y-.118,(box.min.z+box.max.z)/2+.012);
  const U=36,V=18,carte=new Float32Array(U*V);
  const cellule=(dx,dy,dz)=>{const r=Math.hypot(dx,dy,dz)||1;return [Math.floor((Math.atan2(dx,dz)/Math.PI+1)/2*U)%U,Math.min(V-1,Math.floor(Math.acos(Math.max(-1,Math.min(1,dy/r)))/Math.PI*V)),r];};
  for(let i=0;i<tete.count;i++){
    const x=tete.getX(i),y=tete.getY(i),z=tete.getZ(i);
    // Les oreilles dépassent : elles ne doivent pas gonfler la coiffure.
    if(Math.abs(x)>.086&&y<box.max.y-.07)continue;
    const [u,v,r]=cellule(x-centre.x,y-centre.y,z-centre.z);if(r>carte[v*U+u])carte[v*U+u]=r;
  }
  const rayon=(u,v)=>{let m=0;for(let dv=-1;dv<=1;dv++)for(let du=-1;du<=1;du++){const vv=v+dv;if(vv<0||vv>=V)continue;m=Math.max(m,carte[vv*U+(u+du+U)%U]);}return m;};
  const geometry=source.geometry.clone(),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const dx=p.getX(i)-centre.x,dy=p.getY(i)-centre.y,dz=p.getZ(i)-centre.z,[u,v,r]=cellule(dx,dy,dz),crane=rayon(u,v);
    if(!crane||r>=crane+marge)continue;
    const k=(crane+marge)/r;p.setXYZ(i,centre.x+dx*k,centre.y+dy*k,centre.z+dz*k);
  }
  p.needsUpdate=true;geometry.computeVertexNormals();ajustes.set(cle,geometry);return geometry;
}

// ---------------------------------------------------------------------------
// CORPS ET APPUIS
// ---------------------------------------------------------------------------
const CONTACTS=[['L_Foot',.077],['R_Foot',.077],['L_ToeBase',.039],['R_ToeBase',.039],['L_Calf',.06],['R_Calf',.06],['L_Hand',.035],['R_Hand',.035],['L_Forearm',.04],['R_Forearm',.04],['Hips',.11],['Spine02',.11],['Head',.105]];
export function prepareBody(actor){
  actor.feet=['L','R'].map(side=>['Thigh','Calf','Foot'].map(n=>actor.model.getObjectByName('CC_Base_'+side+'_'+n)));
  actor.contacts=CONTACTS.map(([n,radius])=>({bone:actor.model.getObjectByName('CC_Base_'+n),radius})).filter(x=>x.bone);
  actor.baseY=actor.model.position.y;
  actor.neck=actor.model.getObjectByName('CC_Base_NeckTwist01')||actor.model.getObjectByName('CC_Base_Neck');
  actor.torso=['Waist','Spine01','Spine02'].map(n=>actor.model.getObjectByName('CC_Base_'+n)).filter(Boolean);
  actor.lift=0;
}
/**
 * Les hauteurs viennent des clips reconstruits : le bassin est à sa vraie place.
 * Il ne reste qu'un filet de sécurité, pour qu'aucune partie du corps ne passe
 * sous la pelouse pendant un fondu entre deux poses (debout → lié, par exemple).
 */
export function groundBody(actor,dt=.016){
  actor.model.position.y=actor.baseY;
  actor.group.updateMatrixWorld(true);
  let low=Infinity;
  // correctif25-corps : les matrices viennent d'être calculées, on les lit sans remonter treize fois jusqu'à la racine.
  for(const {bone,radius} of actor.contacts){const y=bone.matrixWorld.elements[13]-radius;if(y<low)low=y;}
  const need=low<0?-low:0;
  // Montée immédiate, redescente progressive : pas de saut d'une image à l'autre.
  actor.lift=need>actor.lift?need:Math.max(need,actor.lift-dt*.6);
  if(actor.lift>1e-4){actor.model.position.y+=actor.lift;actor.group.updateMatrixWorld(true);}
}
export function grip(actor,target,side='both',weight=1){
  for(const [chain,sign] of [[actor.leftArm,-1],[actor.rightArm,1]]){
    if(side==='left'&&sign>0||side==='right'&&sign<0)continue;
    pole.set(sign*.55,-.25,-.2);actor.group.localToWorld(pole);pole.y+=1.2;
    reach(chain,target,weight,pole);
  }
}
const regard=new THREE.Quaternion(),euler=new THREE.Euler();
export function trackBall(actor,ball,weight=.28){
  const neck=actor.neck;if(!neck)return;
  neck.getWorldPosition(point);front.copy(ball).sub(point).normalize();
  const local=front.clone().applyQuaternion(actor.group.quaternion.clone().invert());
  // Limit neck rotation: the chest turns separately as the receiver slows.
  const yaw=THREE.MathUtils.clamp(Math.atan2(-local.x,-local.z),-.65,.65);
  const pitch=THREE.MathUtils.clamp(Math.asin(local.y),-.25,.65);
  neck.quaternion.multiply(regard.setFromEuler(euler.set(pitch*weight,0,yaw*weight)));
  // Seul le cou a tourné : lui et ce qu'il porte, pas tout le corps (toujours appelé après une mise à jour complète).
  neck.updateWorldMatrix(false,true);
}
const axe=new THREE.Vector3(),tour=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),mondeQ=new THREE.Quaternion();
/**
 * Redresse le buste (angle positif) autour de l'axe des épaules, et le tourne
 * légèrement autour de la verticale. Les jambes ne bougent pas : dans un maul,
 * on pousse debout, le dos bien plus haut qu'en mêlée.
 */
export function raiseTorso(actor,angle,lacet=0){
  const os=actor.torso;if(!os?.length||(!angle&&!lacet))return;
  actor.group.updateMatrixWorld(true);
  // Droite du joueur : avant × haut.
  axe.set(Math.cos(actor.heading),0,-Math.sin(actor.heading));
  for(const bone of os){
    bone.getWorldQuaternion(mondeQ);bone.parent.getWorldQuaternion(parentQ);
    tour.setFromAxisAngle(axe,angle/os.length);mondeQ.premultiply(tour);
    if(lacet){tour.setFromAxisAngle(front.set(0,1,0),lacet/os.length);mondeQ.premultiply(tour);}
    bone.quaternion.copy(parentQ.invert().multiply(mondeQ));bone.updateWorldMatrix(false,true);
  }
}

/** A single solve for ascent, hold and descent, with two reachable hand grips. */
export function bindLift(jumper,helpers){
  const bindings=[];
  for(const helper of helpers){
    const direction=jumper.group.position.clone().sub(helper.group.position);direction.y=0;
    if(direction.length()>.95)continue;direction.normalize();
    helper.heading=Math.atan2(direction.x,direction.z)+Math.PI;helper.group.rotation.y=helper.heading;helper.group.updateMatrixWorld(true);
    const feet=helper.feet.map(chain=>chain[2].getWorldPosition(new THREE.Vector3()));
    helper.pose.hips.getWorldPosition(point);helper.model.getObjectByName('CC_Base_Spine02').getWorldPosition(spine);
    // The lifter leans into the jumper with bent knees instead of reaching
    // behind his back or dislocating a shoulder to compensate for root motion.
    aimBone(helper.pose.hips,spine.sub(point),direction.clone().multiplyScalar(.32).add(new THREE.Vector3(0,.64,0)),.9);
    helper.group.updateMatrixWorld(true);
    jumper.pose.hips.getWorldPosition(hips);
    helper.leftArm[0].getWorldPosition(point);helper.rightArm[0].getWorldPosition(spine);
    const crouch=THREE.MathUtils.clamp(hips.y-.10-(point.y+spine.y)/2,-.42,0);
    helper.model.position.y+=crouch;helper.group.updateMatrixWorld(true);
    helper.feet.forEach((chain,i)=>{feet[i].y=.077;const knee=feet[i].clone().addScaledVector(direction,.5);knee.y=.5;reach(chain,feet[i],1,knee);});
    helper.group.updateMatrixWorld(true);
    const side=new THREE.Vector3(-direction.z,0,direction.x).multiplyScalar(.12);
    for(const [arm,sign] of [[helper.leftArm,-1],[helper.rightArm,1]]){
      const target=hips.clone().addScaledVector(direction,-.10).addScaledVector(side,sign);target.y-=.24;
      arm[0].getWorldPosition(point);arm[1].getWorldPosition(spine);arm[2].getWorldPosition(front);
      const length=point.distanceTo(spine)+spine.distanceTo(front)-.012;
      const horizontal=Math.hypot(target.x-point.x,target.z-point.z);
      const top=point.y+Math.sqrt(Math.max(0,length*length-horizontal*horizontal));
      bindings.push({helper,arm,target,sign,top});
    }
  }
  const lower=Math.max(0,...bindings.map(b=>b.target.y-b.top));
  if(lower){jumper.model.position.y-=lower;jumper.group.updateMatrixWorld(true);}
  for(const b of bindings){b.target.y-=lower;grip(b.helper,b.target,b.sign<0?'left':'right');}
  return bindings;
}
