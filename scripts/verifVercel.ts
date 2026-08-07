// Régression du crash Vercel : l'import de la fonction doit toujours réussir,
// même sans base configurée, puis répondre avec un diagnostic exploitable.
import { GET } from '../api/classement';

const ancienneUrl = process.env.DATABASE_URL;
delete process.env.DATABASE_URL;
const reponse = await GET();
const corps = await reponse.json() as { erreur?: string };
if (reponse.status !== 500 || !corps.erreur?.includes('DATABASE_URL')) {
  throw new Error(`Diagnostic Vercel inattendu : ${reponse.status} ${JSON.stringify(corps)}`);
}
if (ancienneUrl) process.env.DATABASE_URL = ancienneUrl;

console.log('✅ La fonction Vercel s’importe sans dépendance i18n introuvable.');
console.log('✅ Une configuration de base absente renvoie un JSON 500 explicite.');
