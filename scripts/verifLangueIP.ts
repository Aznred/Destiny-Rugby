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

// ═══════════════════════════════════════════════════════════════════════════
// LE CÔTÉ JEU — qui a le dernier mot sur la langue
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ La table pays → langue était juste, et pourtant la détection ne marchait
// plus pour une grande partie des joueurs. Le bug n'était pas ici : l'ancien
// panneau ⚙️ publiait TOUT son brouillon au clic sur « Enregistrer », y compris
// `setLangue(langueLocale)` — même quand personne n'avait touché à la langue.
// Or `setLangue` lève `langueManuelle`, qui est persisté. Ouvrir ⚙️ une seule
// fois pour coller une clé ou changer d'ambiance éteignait donc la détection
// par le pays de l'IP, DÉFINITIVEMENT.
const { useGame } = await import('../src/store/useGame');
const { langueDuNavigateur } = await import('../src/lib/i18n');

function verifier(nom: string, obtenu: unknown, attendu: unknown): void {
  if (obtenu !== attendu) throw new Error(`${nom} : ${String(obtenu)}, attendu ${String(attendu)}`);
  console.log(`✅ ${nom} → ${String(obtenu)}`);
}

// 1. Sans choix explicite, le pays de l'IP décide.
useGame.setState({ langue: 'fr', langueManuelle: false });
useGame.getState().appliquerLangueAutomatique('en');
verifier('une IP anglaise met le jeu en anglais', useGame.getState().langue, 'en');

// 2. Un choix explicite gagne, et il n'est plus jamais écrasé.
useGame.getState().setLangue('ja');
verifier('choisir une langue la marque comme manuelle', useGame.getState().langueManuelle, true);
useGame.getState().appliquerLangueAutomatique('en');
verifier('… et la détection ne la touche plus', useGame.getState().langue, 'ja');

// 3. LA MIGRATION QUI DÉCOINCE LES SAUVEGARDES MARQUÉES À TORT.
const migrer = (useGame as unknown as {
  persist: { getOptions: () => { migrate?: (etat: unknown, version: number) => unknown } };
}).persist.getOptions().migrate;
if (!migrer) throw new Error('la migration de sauvegarde est introuvable');

// Marquage parasite : le drapeau est levé, mais la langue est restée celle du
// navigateur — signe qu'aucun clic n'a jamais eu lieu. On rouvre la détection.
const parasite = migrer({ langue: langueDuNavigateur(), langueManuelle: true }, 16) as {
  langueManuelle?: boolean;
};
verifier('un marquage parasite rouvre la détection', parasite.langueManuelle, false);

// Choix réel : la langue diffère de celle du navigateur, elle ne peut venir que
// d'un clic. On n'y touche pas.
const autre = langueDuNavigateur() === 'ja' ? 'de' : 'ja';
const choisi = migrer({ langue: autre, langueManuelle: true }, 16) as { langueManuelle?: boolean };
verifier('un choix délibéré reste protégé', choisi.langueManuelle, true);

console.log('\n✅ La langue suit le pays, et un choix explicite reste un choix.');
