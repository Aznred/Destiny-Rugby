import {QueueClient} from '@vercel/queue';
import {creerGestionnaireCarriere} from '../serveur/carriereApi.js';
import {stockageNeon} from '../serveur/carriereStockage.js';
import {programmerMatchsVercel} from '../serveur/horlogeVercel.js';
export const config={runtime:'nodejs'};
export const maxDuration=60;
const queue=new QueueClient();
let gestionnaire:ReturnType<typeof creerGestionnaireCarriere>|undefined;
// Le SDK authentifie la livraison Vercel et assure les reprises après erreur.
export default queue.handleNodeCallback(async (message: {ligue:string})=>{
  if(!message || !/^[0-9a-f-]{36}$/i.test(message.ligue))throw new Error('Message horloge invalide');
  if(!process.env.DATABASE_URL)throw new Error('Base non configurée');
  gestionnaire??=creerGestionnaireCarriere(stockageNeon(process.env.DATABASE_URL),programmerMatchsVercel);
  await gestionnaire.actualiserLigue(message.ligue);
},{retry:()=>({afterSeconds:10})});
