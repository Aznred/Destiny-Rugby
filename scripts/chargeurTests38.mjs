import {resolve as precedent,load} from './chargeurTests36.mjs';
export {load};
export async function resolve(specifier,contexte,suite) {
  if(specifier==='@neondatabase/serverless'&&contexte.parentURL?.endsWith('/api/classement.ts'))
    return {url:'data:text/javascript,export const neon=()=>globalThis.sqlClassementTest38',shortCircuit:true};
  return precedent(specifier,contexte,suite);
}
