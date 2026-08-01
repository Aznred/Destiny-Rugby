// Vérification SANS NAVIGATEUR de L'Ovale : repli hors ligne, abonnements,
// messages privés, et surtout — un transfert annoncé se produit VRAIMENT.
import { useGame } from '../src/store/useGame';
import { effectifDuClub } from '../src/lib/effectif';
import { suggestionsLocales } from '../src/lib/social';
import type { PostSocial } from '../src/types';

const g = useGame.getState();
g.creerJoueur({
  nom: 'Test Joueur', poste: 'demi_ouverture', nation: 'France',
  club: 'Stade Toulousain', division: 'top14', age: 20, traits: [],
});
const joueur = () => useGame.getState().joueur!;

console.log('=== PUBLIER (sans clé : réponses du pool) ===');
await useGame.getState().publier('Content du travail du groupe cette semaine.', 'humble');
const post = useGame.getState().posts[0];
console.log(`  post : "${post.texte}" · ${post.reponses?.length} réponses · ${post.vues} vues`);
console.log(`  abonnés : ${joueur().abonnes} · popularité ${joueur().popularite}`);

console.log('\n=== FIL HORS LIGNE ===');
await useGame.getState().rafraichirFil();
console.log('  publications dans le fil :', useGame.getState().posts.length);

console.log('\n=== COMPTES À SUIVRE (repli local, tirés du vrai monde) ===');
const suggestions = suggestionsLocales(joueur(), []);
for (const c of suggestions) console.log(`  @${c.pseudo} — ${c.nom} (${c.type})`);
useGame.getState().suivreCompte(suggestions[0]);
console.log('  abonnements :', useGame.getState().comptesSuivis.length);

console.log('\n=== MESSAGE PRIVÉ (sans clé : réponse de repli) ===');
await useGame.getState().envoyerMessage(suggestions[0].pseudo, 'Salut, on se voit à l’entraînement ?');
const fil = useGame.getState().conversations[suggestions[0].pseudo] ?? [];
for (const m of fil) console.log(`  ${m.de === 'moi' ? '→' : '←'} ${m.texte}`);

console.log('\n=== UN TRANSFERT ANNONCÉ SE FAIT VRAIMENT ===');
const avant = effectifDuClub('Stade Toulousain', joueur().saison);
const cible = avant[3];
console.log(`  avant : ${cible.nom} est à Toulouse (${effectifDuClub('CA Brive', joueur().saison).some((j) => j.nom === cible.nom) ? 'et à Brive ?!' : 'pas à Brive'})`);

const annonce: PostSocial = {
  id: 'test', auteur: 'Insider Mercato', pseudo: 'insider', avatar: '🕵️',
  texte: `🚨 OFFICIEL — ${cible.nom} quitte le Stade Toulousain pour le CA Brive.`,
  saison: joueur().saison, semaine: 1, date: '1 sept.', likes: 0, reposts: 0, vues: 0,
  action: { type: 'transfert', joueur: cible.nom, de: 'Stade Toulousain', vers: 'CA Brive' },
};
useGame.getState().appliquerAnnonce(annonce);

const apresTls = effectifDuClub('Stade Toulousain', joueur().saison);
const apresBrive = effectifDuClub('CA Brive', joueur().saison);
console.log(`  après : encore à Toulouse ? ${apresTls.some((j) => j.nom === cible.nom)}`);
console.log(`          arrivé à Brive ?     ${apresBrive.some((j) => j.nom === cible.nom)}`);
console.log('  transferts enregistrés :', useGame.getState().transfertsSociaux.length);

console.log('\n=== GARDE-FOUS ===');
useGame.getState().appliquerAnnonce({
  ...annonce, id: 't2',
  action: { type: 'transfert', joueur: joueur().nom, de: 'Stade Toulousain', vers: 'CA Brive' },
});
useGame.getState().appliquerAnnonce({
  ...annonce, id: 't3',
  action: { type: 'transfert', joueur: 'Machin Truc', de: 'Club Inventé', vers: 'CA Brive' },
});
console.log('  après tentative sur le joueur humain et sur un club inventé :',
  useGame.getState().transfertsSociaux.length, 'transfert(s) — attendu 1');
