import { imagePourRequete, chercherMedias } from '../src/lib/images';
import { annuaire } from '../src/lib/comptes';
import { useGame } from '../src/store/useGame';

useGame.getState().creerJoueur({ nom: 'Test', poste: 'ailier_gauche', nation: 'France', club: 'Stade Toulousain', division: 'top14', age: 21, traits: [] });
const j = useGame.getState().joueur!;

console.log('=== IMAGES SANS CLÉ ===');
console.log('  Wikimedia « rugby scrum » →', (await imagePourRequete('rugby scrum')).url.slice(0, 90));
const m = await chercherMedias('rugby', '', 4);
console.log('  recherche sans clé Tenor →', m.length, 'images, gif =', m[0].gif);

console.log('\n=== MENTIONS ===');
const texte = 'Bravo @antoine_dupont et merci @stade_toulousain_officiel #Top14';
const morceaux = texte.split(/(@[A-Za-z0-9_]{2,32}|#[A-Za-zÀ-ÿ0-9_]{2,30})/g).filter((x) => x.startsWith('@') || x.startsWith('#'));
console.log('  détectées :', morceaux.join(' · '));
for (const mot of morceaux.filter((x) => x.startsWith('@'))) {
  const c = annuaire(j).find((x) => x.pseudo === mot.slice(1));
  console.log(`  ${mot} → ${c ? c.nom + ' (' + c.type + ')' : 'profil de repli'}`);
}
