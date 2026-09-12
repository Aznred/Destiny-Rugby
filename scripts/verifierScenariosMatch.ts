import assert from 'node:assert/strict';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { coequipierDepuisCarte, dotationBronzeCarriere } from '../src/lib/ligue/catalogueCarriere';
import { conclureMatchEnLigne, creerMatchEnLigne, STRATEGIE_EN_LIGNE_DEFAUT } from '../src/lib/ligue/matchCarriere';
import type { TerrainDirect } from '../src/lib/ligue/matchCarriere';
import { creerScenarioDirect } from '../src/lib/ligue/scenarioDirect';
import * as C from '../src/lib/moteur/commentaire';
import { POOLS_COMMENTAIRES } from '../src/data/commentairesMatch';

const cartesA=dotationBronzeCarriere('scenarios','club-a','scenarios-a');
const cartesB=dotationBronzeCarriere('scenarios','club-b','scenarios-b');
const equipe=(clubId:string,nom:string,cartes:typeof cartesA)=>({
  clubId,nom,effectif:cartes.map(coequipierDepuisCarte),
  composition:compositionManagerParDefaut(cartes.map(coequipierDepuisCarte)),
  strategie:STRATEGIE_EN_LIGNE_DEFAUT,
});
const textes=new Set<string>();
const types=new Set<string>();
let filMax=0;
for(let i=0;i<32;i++){
  const match=conclureMatchEnLigne(creerMatchEnLigne({
    id:`scenario-${i}`,domicile:equipe('club-a','Les Bleus',cartesA),
    exterieur:equipe('club-b','Les Rouges',cartesB),debut:1700000000000,graine:7919*(i+1),
  }));
  filMax=Math.max(filMax,match.fil.length);
  match.fil.forEach(l=>{textes.add(l.texte);types.add(l.type);});
}
for(const type of ['essai','penalite','melee','touche','maul','ruck','faute'])
  assert.ok(types.has(type),`Le direct doit raconter les événements « ${type} ».`);
assert.ok(textes.size>=120,`Seulement ${textes.size} récits différents observés.`);
assert.ok(filMax<240,'Le nouveau récit ne doit pas saturer la limite du fil.');
const pools=[C.ESSAI,C.ESSAI_PRECISION,C.PENALITE,C.PENALITE_BUT,C.PENALITE_RATEE,C.RUCK_GRATTAGE,
  C.EN_AVANT,C.PASSE_AVANT,C.TOUCHE_GAGNEE,C.TOUCHE_PERDUE,C.MELEE_GAGNEE,C.MELEE_DOMINEE,
  C.MAUL,C.MAUL_ESSAI,C.PICK_AND_GO,C.PERCUSSION];
assert.ok(pools.reduce((n,p)=>n+p.length,0)>=100,'Le catalogue français doit contenir au moins cent variantes ciblées.');
for(const langue of Object.values(POOLS_COMMENTAIRES))
  assert.equal(langue.motif.length,C.MOTIFS_PENALITE.length,'Chaque motif de faute doit rester traduit.');

const terrain=(x:number,y:number,type:NonNullable<TerrainDirect['lancement']>['type'],cote:'domicile'|'exterieur'='domicile'):TerrainDirect=>({
  pions:[],ballon:{x,y},phase:'jeuCourant',systeme:'blitz',possession:cote,
  sequence:3,metresGagnes:2,ballonLent:false,lancement:{type},cadence:1,horloge:24,
});
const variantes=new Set<string>();
for(const type of ['ras','pod','large','saute','pickAndGo'] as const)
  for(const x of [5,12,40,61,80,95,108,115])
    for(const y of [8,35,62]) variantes.add(creerScenarioDirect(terrain(x,y,type)).id);
assert.ok(variantes.size>=120,`Seulement ${variantes.size} variantes de mise en scène structurées.`);
const danger=creerScenarioDirect({...terrain(108,8,'large'),metresGagnes:11});
assert.equal(danger.momentFort,true);
assert.equal(danger.cadrage,'proche');
assert.equal(danger.type,'franchissement');
assert.equal(creerScenarioDirect(terrain(22,35,'ras','exterieur')).zone,'vingtDeuxAdverse','Les zones doivent suivre le sens d’attaque.');

console.log(`OK — ${textes.size} récits observés, ${types.size} types visibles, ${variantes.size} variantes 2D, fil maximal ${filMax}/240, motifs traduits dans 6 langues.`);
