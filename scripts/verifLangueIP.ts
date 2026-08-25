import { langueDuPays } from '../src/lib/i18n';
import { GET } from '../api/langue';

const cas = [
  ['France', langueDuPays('FR'), 'fr'],
  ['Sénégal francophone', langueDuPays('SN'), 'fr'],
  ['Maroc francophone', langueDuPays('MA'), 'fr'],
  ['Royaume-Uni', langueDuPays('GB'), 'en'],
  ['Mexique', langueDuPays('MX'), 'es'],
  ['Italie', langueDuPays('IT'), 'it'],
  ['Autriche', langueDuPays('AT'), 'de'],
  ['Brésil', langueDuPays('BR'), 'pt'],
  ['Japon', langueDuPays('JP'), 'ja'],
  ['Suisse francophone', langueDuPays('CH', ['fr-CH']), 'fr'],
  ['Suisse germanophone', langueDuPays('CH', ['de-CH']), 'de'],
  ['Canada francophone', langueDuPays('CA', ['fr-CA']), 'fr'],
  ['Canada anglophone', langueDuPays('CA', ['en-CA']), 'en'],
  ['Pays non traduit', langueDuPays('NL', ['fr-FR']), 'en'],
  ['Repli sans IP', langueDuPays(null, ['it-IT']), 'it'],
] as const;

for (const [nom, obtenu, attendu] of cas) {
  if (obtenu !== attendu) throw new Error(`${nom} : ${obtenu}, attendu ${attendu}`);
  console.log(`✅ ${nom} → ${obtenu}`);
}

const reponse = GET(new Request('https://destiny-rugby.test/api/langue', {
  headers: {
    'x-vercel-ip-country': 'CH',
    'accept-language': 'it-CH,it;q=0.9,de;q=0.7',
  },
}));
const corps = await reponse.json() as { langue?: string };
if (corps.langue !== 'it') throw new Error(`API Suisse italienne : ${String(corps.langue)}, attendu it`);
console.log('✅ API IP + pays multilingue → it');
