import assert from 'node:assert/strict';
import { detruireScene, scenesRendues, webglDisponible } from '../src/lib/match3D';
import { profilAppareil } from '../src/lib/profilAppareil';

let contextes = 0, pertes = 0, controles = 0;
const toiles: {width: number; height: number}[] = [];
Object.defineProperty(globalThis, 'document', {configurable:true,value:{createElement(){
  const c={width:300,height:150,getContext(){contextes++;return {getExtension(){return {loseContext(){pertes++;}};}};}};
  toiles.push(c);return c;
}}});
Object.defineProperty(globalThis, 'window', {configurable:true,value:{innerWidth:1600,innerHeight:1200,matchMedia:()=>({matches:false})}});
Object.defineProperty(globalThis, 'localStorage', {configurable:true,value:{getItem:()=>null}});
Object.defineProperty(globalThis, 'navigator', {configurable:true,value:{userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5,deviceMemory:8,hardwareConcurrency:16}});
const verifier=(c: unknown,m: string)=>{assert.ok(c,m);controles++;};
for(let n=0;n<10;n++)verifier(webglDisponible(),'WebGL reste disponible');
verifier(contextes===1&&pertes===1,'dix matchs ne créent qu’un seul contexte de diagnostic, aussitôt rendu');
verifier(toiles.every(c=>c.width===1&&c.height===1),'la toile du diagnostic est vidée');
verifier(profilAppareil().plateforme==='ios'&&profilAppareil().leger,'un iPad à grand écran et processeur puissant garde le budget iOS');
Object.defineProperty(globalThis, 'navigator', {configurable:true,value:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5,hardwareConcurrency:6}});
verifier(profilAppareil().leger,'un iPhone à écran large garde aussi le budget iOS');
Object.defineProperty(globalThis, 'navigator', {configurable:true,value:{userAgent:'Windows',platform:'Win32',maxTouchPoints:0,deviceMemory:8,hardwareConcurrency:16}});
verifier(!profilAppareil().leger,'l’ordinateur conserve son rendu complet');

let secours = 0;
await detruireScene({detruireParEtapes(){throw new Error('destruction interrompue');},detruire(){secours++;}} as never);
verifier(secours===1,'une erreur synchrone déclenche la destruction de secours');
let finirA!: ()=>void,finirB!: ()=>void;
const a={detruireParEtapes:()=>new Promise<void>(r=>{finirA=r;}),detruire(){}};
const b={detruireParEtapes:()=>new Promise<void>(r=>{finirB=r;}),detruire(){}};
const premiere=detruireScene(a as never);
verifier(detruireScene(a as never)===premiere,'une seconde demande n’écourte pas la destruction');
let pret=false;
const attente=scenesRendues().then(()=>{pret=true;});
void detruireScene(b as never);finirA();
await new Promise(r=>setTimeout(r,0));
verifier(!pret,'la navigation attend aussi une scène détruite pendant l’attente');
finirB();await attente;
verifier(pret,'la navigation reprend une fois les deux scènes rendues');
console.log(`Sortie iOS : ${controles} contrôles, OK.`);
