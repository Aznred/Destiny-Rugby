// À exécuter comme service permanent, avec redémarrage automatique par l'hébergeur.
// Une seule requête en vol ; aucune session de joueur et aucun secret dans l'URL.
import {setTimeout as attendre} from 'node:timers/promises';
const origine = process.env.DESTINY_ORIGIN;
const secret = process.env.CRON_SECRET;
if(!origine || !secret) throw new Error('DESTINY_ORIGIN et CRON_SECRET sont requis.');
const url=new URL('/api/carriere?horloge=1',origine);
if(url.protocol!=='https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('HTTPS est requis.');
let arret=false;
process.on('SIGINT',()=>{arret=true;});process.on('SIGTERM',()=>{arret=true;});
while(!arret) {
  const debut=Date.now();
  try {
    const r=await fetch(url,{headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(55000)});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    await r.json();
  } catch(e) { console.error(new Date().toISOString(),'Horloge indisponible :',e instanceof Error?e.message:'réseau'); }
  if(!arret)await attendre(Math.max(1000,5000-(Date.now()-debut)));
}
