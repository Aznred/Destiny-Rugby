// Bancs sans serveur Vite : mêmes imports TypeScript, environnement client vide et aucune clé distante.
import { load as chargerTypeScript } from './chargeurTypeScript.mjs';
export { resolve } from './chargeurTypeScript.mjs';
export async function load(url, contexte, suite) {
  const resultat = await chargerTypeScript(url, contexte, suite);
  // Le banc de classement remplace fetch lui-même : une URL fictive active ses assertions, sans clé ni service distant.
  const environnement = process.env.DESTINY_BANC_CLASSEMENT === '1'
    ? '({VITE_CLASSEMENT_URL:"https://classement.invalid/api/classement"})' : '({})';
  if (typeof resultat.source === 'string') resultat.source = resultat.source.replaceAll('import.meta.env', environnement);
  return resultat;
}
