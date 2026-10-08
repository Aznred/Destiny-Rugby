import { ACADEMIES_FFR } from '../data/academiesFfr.generated.js';
import { POSTES } from '../data/rugby.js';
import { graine } from './ligue/aleatoire.js';
import type { PosteId } from '../types.js';
import { courbeDeveloppement } from './jeunes.js';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const academieFfr=(club:string)=>ACADEMIES_FFR[normalize(club)];
export function posteAcademieFfr(club:string,rng:()=>number):PosteId {
  const source=academieFfr(club);
  // Smoothing: even sparse/specialized youth cohorts can produce every rugby position.
  const weights=POSTES.map(p=>1+(source?.positions[p.id]??0)*.3);
  let value=rng()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<POSTES.length;i++){value-=weights[i];if(value<=0)return POSTES[i].id;}
  return 'arriere';
}
export function genererRegensFfr(club:string,seed:string,staff=50){
  const academy=academieFfr(club),rating=academy?.rating??30,rng=graine(`fiction:${club}:${seed}`);
  const count=2+Math.floor(rating/25)+(rng()<.3?1:0);
  const first=['Mathis','Louis','Hugo','Adam','Noé','Arthur','Jules','Gabriel','Léo','Raphaël'];
  const last=['Bernard','Laurent','Morel','Fontaine','Roux','Garnier','Perrin','Leroy','Faure','Blanc'];
  return Array.from({length:count},(_,i)=>{
    const poste=posteAcademieFfr(club,rng);
    const overall=Math.round(Math.min(65,Math.max(25,24+rating*.3+rng()*12)));
    const gem=rng()<.005+rating/100*.035;
    const potential=Math.min(96,Math.round(gem?82+rng()*14:overall+8+rating*.17+rng()*10));
    const uncertainty=Math.ceil(3+(100-Math.max(0,Math.min(100,staff)))/10);
    const developmentCurve=courbeDeveloppement(poste);
    return {id:`fiction:${seed}:${i}`,nom:`${first[Math.floor(rng()*first.length)]} ${last[Math.floor(rng()*last.length)]}`,
      club,age:17+Math.floor(rng()*3),poste,overall,potential,developmentCurve,
      estimatedPotential:[Math.max(overall,potential-uncertainty),Math.min(99,potential+uncertainty)],fictional:true as const};
  });
}
