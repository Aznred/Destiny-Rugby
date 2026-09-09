import assert from 'node:assert/strict';
import { meilleureComposition } from '../src/lib/meilleureComposition';
import { POSTES_XV_MANAGER, POSTES_BANC_MANAGER } from '../src/lib/compositionManager';
import { POSTE_PAR_ID } from '../src/data/rugby';
import type { CarteCarriere } from '../src/lib/ligue/typesCarriere';
const postes=[...POSTES_XV_MANAGER,...POSTES_BANC_MANAGER];
const cartes=postes.map((poste,i)=>({id:`j${i}`,poste,famille:POSTE_PAR_ID[poste].famille,note:60,age:25,fatigue:0,statistiques:{PIED:50}} as CarteCarriere));
cartes.push({...cartes[9],id:'meilleur',note:99,statistiques:{PIED:99}});
cartes.push({...cartes[9],id:'blesse',note:100,blesseJusqua:'2099-01-01'});
const c=meilleureComposition(cartes)!;
assert.equal(new Set([...c.titulaires,...c.remplacants]).size,23);
assert.ok(c.titulaires.includes('meilleur'));
assert.ok(![...c.titulaires,...c.remplacants].includes('blesse'));
assert.equal(c.buteurId,'meilleur');assert.ok(c.titulaires.includes(c.capitaineId));
for(const i of [0,1,2,15,16,17]) {const id=[...c.titulaires,...c.remplacants][i];assert.equal(cartes.find(x=>x.id===id)!.famille,POSTE_PAR_ID[postes[i]].famille);}
assert.equal(meilleureComposition(cartes.slice(0,22)),null);
assert.equal(meilleureComposition(cartes.map(x=>({...x,poste:'ailier_gauche',famille:'ailier'}))),null);
assert.deepEqual(meilleureComposition([...cartes].reverse()),c);
const cartesCollectif=postes.map((poste,i)=>({
  id:`c${i}`,poste,famille:POSTE_PAR_ID[poste].famille,note:70,age:25,fatigue:0,
  clubReel:[0,3,6].includes(i)?'Bloc':`Club ${i}`,nation:`Nation ${i}`,championnat:`Championnat ${i}`,
  statistiques:{PIED:50},
} as CarteCarriere));
cartesCollectif.push({...cartesCollectif[9],id:'bloc-quatre',note:68,clubReel:'Bloc',nation:'Autre',championnat:'Autre'});
const avecCollectif=meilleureComposition(cartesCollectif)!;
assert.ok(avecCollectif.titulaires.includes('bloc-quatre'), 'le total GEN + collectif doit battre le GEN individuel');
console.log('OK composition : 23 joueurs distincts, collectif + GEN optimisés, blessé exclu, spécialistes, rôles et ordre stable.');
