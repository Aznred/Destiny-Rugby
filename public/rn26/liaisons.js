import * as THREE from '/rn26/vendor/three/build/three.module.js';
// Les clips restent d'origine ; ces contraintes remplacent leurs cibles de main Unity.
const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),dir=new THREE.Vector3(),bend=new THREE.Vector3(),elbow=new THREE.Vector3(),destination=new THREE.Vector3(),from=new THREE.Vector3(),to=new THREE.Vector3();
const world=new THREE.Quaternion(),parent=new THREE.Quaternion(),delta=new THREE.Quaternion(),local=new THREE.Quaternion();
function aim(bone,current,target,weight){
  if(current.lengthSq()<1e-8||target.lengthSq()<1e-8)return;
  delta.setFromUnitVectors(current.normalize(),target.normalize());bone.getWorldQuaternion(world);local.copy(delta).multiply(world);bone.parent.getWorldQuaternion(parent);local.premultiply(parent.invert());bone.quaternion.slerp(local,weight);bone.updateWorldMatrix(false,true);
}
export function armChain(model,side){return ['Upperarm','Forearm','Hand'].map(part=>model.getObjectByName('CC_Base_'+side+'_'+part));}
export function reach(chain,target,weight=.8,pole=null){
  const [upper,lower,hand]=chain;if(!upper||!lower||!hand)return;
  upper.getWorldPosition(a);lower.getWorldPosition(b);hand.getWorldPosition(c);
  const l1=a.distanceTo(b),l2=b.distanceTo(c);dir.copy(target).sub(a);const distance=THREE.MathUtils.clamp(dir.length(),Math.abs(l1-l2)+.01,l1+l2-.005);dir.normalize();
  destination.copy(a).addScaledVector(dir,distance);const x=(l1*l1-l2*l2+distance*distance)/(2*distance),h=Math.sqrt(Math.max(0,l1*l1-x*x));
  bend.copy(pole||b).sub(a);bend.addScaledVector(dir,-bend.dot(dir));if(bend.lengthSq()<.001){bend.set(0,1,0).addScaledVector(dir,-dir.y);if(bend.lengthSq()<.001)bend.set(1,0,0).addScaledVector(dir,-dir.x);}bend.normalize();
  elbow.copy(a).addScaledVector(dir,x).addScaledVector(bend,h);
  aim(upper,from.copy(b).sub(a),to.copy(elbow).sub(a),weight);
  lower.getWorldPosition(b);hand.getWorldPosition(c);aim(lower,from.copy(c).sub(b),to.copy(destination).sub(b),weight);
}
export function aimBone(bone,current,target,weight=1){aim(bone,current.clone(),target.clone(),weight);}
