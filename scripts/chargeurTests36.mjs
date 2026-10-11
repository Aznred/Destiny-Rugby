// Repli de test sans serveur Vite : aucune clé distante n'est chargée.
import { load as charger, resolve } from './chargeurTypeScript.mjs';
export { resolve };
export async function load(url, context, suite) {
  const resultat = await charger(url, context, suite);
  if (typeof resultat.source === 'string' && (url.endsWith('.ts') || url.endsWith('.tsx'))) {
    resultat.source = resultat.source.replaceAll('import.meta.env', '({ DEV: false, PROD: false, MODE: "test" })');
  }
  return resultat;
}
