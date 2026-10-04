import * as THREE from '/rn26/vendor/three/build/three.module.js';

// Courbes d'origine, axes/limites de l'Avatar et conversion de repère Unity → glTF.
export async function loadMotions(catalogueFile='catalogue-demo.json') {
  const [rigs,catalogue]=await Promise.all([
    fetch('/rn26/motions/avatars.json').then(r=>r.json()),
    fetch('/rn26/motions/'+catalogueFile).then(r=>r.json())
  ]);
  const clips={};
  const buffers=new Map();
  const buffer=file=>{if(!buffers.has(file))buffers.set(file,fetch('/rn26/motions/'+file).then(r=>{if(!r.ok)throw new Error(file+' : '+r.status);return r.arrayBuffer();}));return buffers.get(file);};
  for(const [key,rig] of Object.entries(rigs))rig.key=key;
  await Promise.all(catalogue.map(async meta=>{
    if(clips[meta.name])return;
    if(/^poses-v/.test(meta.format||'')){
      const poses=Object.fromEntries(await Promise.all(Object.entries(meta.poseFiles).map(async([key,p])=>[key,{stride:p.stride,values:new Float32Array(await buffer(p.file),p.byteOffset||0,p.byteLength?p.byteLength/4:undefined)}])));
      clips[meta.name]={...meta,poses};return;
    }
    const values=new Float32Array(await fetch('/rn26/motions/'+meta.file).then(r=>r.arrayBuffer()));
    clips[meta.name]={...meta,values,index:Object.fromEntries(meta.attributes.map((a,i)=>[a,i]))};
  }));
  return {rigs,clips};
}
const Q=a=>new THREE.Quaternion(...a);
/** Os animés par un geste du haut du corps : la course continue dessous. */
const UPPER=/Waist|Spine|Neck|Head|Clavicle|Upperarm|Forearm|Hand|Thumb|Index|Ring|Mid|Pinky|Eye|Jaw/;
/** Os des bras seuls : porter le ballon sans figer le buste. */
const ARMS=/Clavicle|Upperarm|Forearm|Hand|Thumb|Index|Ring|Mid|Pinky/;
export function preparePose(model,rig) {
  const bones=rig.bones.map((info,i)=>({
    ...info,index:i,bone:model.getObjectByName(info.name),preQ:Q(info.pre),postQ:Q(info.postInverse),bridgeQ:Q(info.bridgeInverse),upper:UPPER.test(info.name),arm:ARMS.test(info.name)
  })).filter(b=>b.bone);
  const hips=model.getObjectByName('CC_Base_Hips');
  return {bones,hips,rest:hips.position.clone(),scale:rig.scale,key:rig.key};
}
const swing=new THREE.Quaternion(),twist=new THREE.Quaternion(),out=new THREE.Quaternion(),axis=new THREE.Vector3();
const next=new THREE.Quaternion(),other=new THREE.Quaternion(),place=new THREE.Vector3(),place2=new THREE.Vector3();
function cursor(clip,time,loop){
  const t=loop ? ((time%clip.duration)+clip.duration)%clip.duration : Math.min(Math.max(0,time),clip.duration);
  const frame=t/clip.duration*(clip.frames-1),lo=Math.floor(frame),hi=Math.min(lo+1,clip.frames-1);
  return {lo,hi,alpha:frame-lo};
}
/**
 * Déplacement horizontal du centre de masse à l'instant donné, dans le repère
 * du joueur (x à sa droite, z vers son dos). Nul pour les anciens formats.
 */
export function rootAt(clip,key,time,loop=false,target={x:0,z:0}) {
  const packed=clip.poses?.[key];
  if(!packed||clip.format!=='poses-v3'){target.x=0;target.z=0;return target;}
  const {lo,hi,alpha}=cursor(clip,time,loop),{values,stride}=packed,a=lo*stride,b=hi*stride;
  target.x=THREE.MathUtils.lerp(values[a+stride-5],values[b+stride-5],alpha);
  target.z=THREE.MathUtils.lerp(values[a+stride-4],values[b+stride-4],alpha);
  return target;
}
function hipsAt(packed,cur,v3,target){
  const {values,stride}=packed,a=cur.lo*stride,b=cur.hi*stride;
  if(v3)target.set(THREE.MathUtils.lerp(values[a+stride-3],values[b+stride-3],cur.alpha),THREE.MathUtils.lerp(values[a+stride-2],values[b+stride-2],cur.alpha),THREE.MathUtils.lerp(values[a+stride-1],values[b+stride-1],cur.alpha));
  else target.set(NaN,NaN,THREE.MathUtils.lerp(values[a+stride-1],values[b+stride-1],cur.alpha));
  return target;
}
/**
 * Pose d'un clip.
 *  - `second`/`weight` : mélange vers un second clip joué à la même phase (marche → course).
 *  - `blend` : adoucit le passage depuis la pose précédente.
 *  - `only` : 'upper' n'écrit que le haut du corps (passe, réception) par-dessus la course,
 *    'arms' que les bras (ballon porté).
 */
export function applyPose(pose,clip,time,loop=true,blend=1,second=null,secondTime=0,weight=0,only=null) {
  const cur=cursor(clip,time,loop),{lo,hi,alpha}=cur,n=clip.attributes.length;
  const packed=clip.poses?.[pose.key];
  if(packed){
    const {values,stride}=packed,a=lo*stride,b=hi*stride,v3=clip.format==='poses-v3';
    const mix=second?.poses?.[pose.key]&&weight>.001?second.poses[pose.key]:null;
    const c2=mix?cursor(second,secondTime,true):null,a2=mix?c2.lo*mix.stride:0,b2=mix?c2.hi*mix.stride:0;
    for(const bone of pose.bones){
      if(only&&!(only==='arms'?bone.arm:bone.upper))continue;
      const i=bone.index*4;out.fromArray(values,a+i);next.fromArray(values,b+i);out.slerp(next,alpha);
      if(mix){other.fromArray(mix.values,a2+i);next.fromArray(mix.values,b2+i);other.slerp(next,c2.alpha);out.slerp(other,weight);}
      if(blend<1)bone.bone.quaternion.slerp(out,blend);else bone.bone.quaternion.copy(out);}
    if(only)return;
    hipsAt(packed,cur,v3,place);
    if(mix)place.lerp(hipsAt(mix,c2,second.format==='poses-v3',place2),weight);
    if(Number.isNaN(place.x)){place.x=pose.rest.x;place.y=pose.rest.y;}
    if(blend<1)pose.hips.position.lerp(place,blend);else pose.hips.position.copy(place);
    return;
  }
  const value=name=>{const i=clip.index[name];return i===undefined?0:THREE.MathUtils.lerp(clip.values[lo*n+i],clip.values[hi*n+i],alpha);};
  for(const b of pose.bones) {
    const a=b.muscles.map((name,i)=>{
      const v=name?value(name):0;
      return (v>=0?v*b.max[i]:-v*b.min[i])*b.sign[i];
    });
    const theta=Math.hypot(a[1],a[2]);
    if(theta>1e-8)swing.setFromAxisAngle(axis.set(0,a[1]/theta,a[2]/theta),theta);else swing.identity();
    twist.setFromAxisAngle(axis.set(1,0,0),a[0]);
    out.copy(b.bridgeQ);
    if(b.name==='CC_Base_Hips' && clip.index['RootQ.w']!==undefined)out.multiply(new THREE.Quaternion(value('RootQ.x'),value('RootQ.y'),value('RootQ.z'),value('RootQ.w')).normalize());
    out.multiply(b.preQ).multiply(swing).multiply(twist).multiply(b.postQ).normalize();
    out.set(-out.x,-out.y,out.z,out.w);
    if(blend<1)b.bone.quaternion.slerp(out,blend);else b.bone.quaternion.copy(out);
  }
  // Les translations horizontales sont fournies par le moteur de déplacement.
  const rootY=clip.index['RootT.y'];
  pose.hips.position.copy(pose.rest);
  if(rootY!==undefined)pose.hips.position.z=-value('RootT.y')*pose.scale;
}
