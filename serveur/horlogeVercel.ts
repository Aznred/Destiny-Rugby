import {QueueClient} from '@vercel/queue';
const queue = new QueueClient({deploymentId:null});
import type {EtatCarriereEnLigne} from '../src/lib/ligue/typesCarriere.js';
export const TOPIC_MATCHS='destiny-matchs';
const dejaProgrammes=new Map<string,number>();
/** Une chaîne durable par ligue ; aucune fonction ne reste ouverte pendant 80 minutes. */
export function prochainReveilMatch(etat:EtatCarriereEnLigne,n:number):number|null {
  if(etat.phase!=='saison') return null;
  if(etat.rencontres.some(r=>r.match && !r.match.termine)) return Math.ceil((n+5000)/5000)*5000;
  const dates=etat.rencontres.filter(r=>!r.resultat && !r.match).flatMap(r=>[Date.parse(r.ouvre),Date.parse(r.ferme)-120000,Date.parse(r.ferme)]).filter(t=>Number.isFinite(t)&&t>n);
  // Une rencontre en retard doit démarrer même si son échéance est déjà passée.
  if(etat.rencontres.some(r=>!r.resultat&&!r.match&&Date.parse(r.ferme)<=n)) return Math.ceil((n+5000)/5000)*5000;
  return dates.length?Math.min(...dates,n+6*86400000):null;
}
export async function programmerMatchsVercel(etat:EtatCarriereEnLigne) {
  if(process.env.VERCEL!=='1')return;
  const n=Date.now(),date=prochainReveilMatch(etat,n);
  if(date===null)return;
  const cle=`${etat.id}:${date}`;
  if(dejaProgrammes.has(cle))return;
  await queue.send(TOPIC_MATCHS,{ligue:etat.id},{delaySeconds:Math.max(0,Math.ceil((date-n)/1000)),retentionSeconds:7*86400,idempotencyKey:cle});
  for(const [id,t] of dejaProgrammes)if(t<n)dejaProgrammes.delete(id);
  if(dejaProgrammes.size>512)dejaProgrammes.delete(dejaProgrammes.keys().next().value!);
  dejaProgrammes.set(cle,date+60000);
}
