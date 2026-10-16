import assert from 'node:assert/strict';
import { avancer, DT, frapperPiedHumain } from '../src/lib/moteur/moteur';
import { creerMatchDEmpreinte } from './outilsEmpreinte';
import { assainirBoutons, BOUTONS_PAR_DEFAUT, reassignerBouton } from '../src/lib/controleDirect/boutons';
import { ecrirePreferencesControle } from '../src/lib/controleDirect/prefs';
import { LecteurManette, libellesManette } from '../src/lib/controleDirect/manette';
for (let k=0;k<12;k++) {
 const e=creerMatchDEmpreinte(k); let n=0;
 while(!e.fini && n++<5200) avancer(e, DT);
 assert.ok(e.fini, 'match terminé'); assert.ok((e.secondesActivesSolo??0)<=720.16,'moins de douze minutes');
 console.log('Match',k,Math.round(e.secondesActivesSolo??0),'secondes',e.scoreA,e.scoreB);
}
for(const type of ['penaltouche','box'] as const) {
 const e=creerMatchDEmpreinte(0); const p=e.pions.find(p=>p.surLeTerrain && p.cote==='A')!;
 p.pos={x:45,y:15}; e.piedHumain={type,auteurId:p.id,origine:{...p.pos}};
 const avant=[e.sim,e.t,e.secondesActivesSolo]; avancer(e,30); assert.deepEqual([e.sim,e.t,e.secondesActivesSolo],avant);
 assert.equal(frapperPiedHumain(e,{x:NaN,y:0}),false); assert.ok(e.piedHumain);
 assert.ok(frapperPiedHumain(e,{x:60,y:-1})); assert.ok(!e.piedHumain);
 assert.ok(e.piedPrepare || e.vol); if(type==='penaltouche') assert.equal(e.piedPrepare?.dePenalite,true);
 assert.equal(frapperPiedHumain(e,{x:60,y:-1}),false);
}
const table=reassignerBouton(BOUTONS_PAR_DEFAUT,1,5); assert.equal(table[1],5); assert.equal(table[5],1);
assert.deepEqual(assainirBoutons([1,1]),BOUTONS_PAR_DEFAUT);
ecrirePreferencesControle({boutonsManette:table});
let presse=false;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[{connected:true,id:'Xbox',buttons:Array.from({length:17},(_,i)=>({pressed:presse&&i===5,value:0})),axes:[0,0,0,0]}]}});
const lecteur=new LecteurManette();lecteur.lire();presse=true;
assert.deepEqual(lecteur.lire().fronts,[1]);assert.equal(libellesManette('xbox').b,'RB');presse=false;assert.deepEqual(lecteur.lire().relaches,[1]);
console.log('Durée, visée suspendue, cible et remappage : OK');
