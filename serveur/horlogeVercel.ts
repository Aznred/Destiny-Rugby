import {QueueClient} from '@vercel/queue';
const queue = new QueueClient({deploymentId:null});
import type {EtatCarriereEnLigne} from '../src/lib/ligue/typesCarriere.js';
import {prochaineEcheanceMatch} from '../src/lib/ligue/echeanceCarriere.js';
export const TOPIC_MATCHS='destiny-matchs';
const dejaProgrammes=new Map<string,number>();
/** Une chaîne durable par ligue ; aucune fonction ne reste ouverte pendant 80 minutes. */
export function prochainReveilMatch(etat:EtatCarriereEnLigne,n:number):number|null {
  const date=prochaineEcheanceMatch(etat,n);
  if(date===null)return null;
  if(date<=n)return Math.ceil((n+5000)/5000)*5000;
  // Une chaîne de réveils reste sous les sept jours de rétention de Vercel.
  return Math.min(date,n+6*86400000);
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
