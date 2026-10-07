import { PhysicalPlayers } from '../public/rn26/placements.mjs';

// Même trajectoire, 30 corps, ordre des passages alterné pour limiter l'effet de la chauffe.
const joueurs=Array.from({length:30},(_,i)=>({id:`p${i}`,visible:true,number:i%15+1,team:i<15?0:1,x:(i%10)*4,z:Math.floor(i/10)*8,source:{role:'ligne',vitesseMax:8}}));
const cibles=Array.from({length:300},(_,t)=>joueurs.map((p,i)=>({...p,x:p.x+Math.sin(t/25+i)*4,z:p.z+Math.cos(t/30+i)*4})));
const base={slots:new Map(),phase:'jeuCourant',e:{placementJoue:false},progress:()=>0};
const mesures={avant:[],apres:[]};
for(let passage=0;passage<10;passage++)for(const optimise of passage%2?[true,false]:[false,true]){
  const corps=new PhysicalPlayers(),match={...base,broadphase:optimise},debut=performance.now();
  for(let t=0;t<1800;t++)corps.update(cibles[t%300],1/60,match);
  if(passage>1)mesures[optimise?'apres':'avant'].push((performance.now()-debut)/1800);
}
for(const cle of ['avant','apres']){
  const v=mesures[cle].sort((a,b)=>a-b);
  console.log(`${cle} : médiane ${((v[3]+v[4])/2).toFixed(4)} ms par pas, 30 corps.`);
}
