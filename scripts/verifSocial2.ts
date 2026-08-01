// Vérification SANS NAVIGATEUR de L'Ovale vivant : annuaire, recherche,
// battement automatique, relations et ripostes.
import { useGame } from '../src/store/useGame';
import { annuaire, chercherComptes, chercherPosts } from '../src/lib/comptes';
import { humeur, tonDuMessage, effetSurRelation } from '../src/lib/vie';

const g = useGame.getState();
g.creerJoueur({
  nom: 'Test Joueur', poste: 'demi_ouverture', nation: 'France',
  club: 'Stade Toulousain', division: 'top14', age: 22, traits: [],
});
const joueur = () => useGame.getState().joueur!;

console.log('=== ANNUAIRE ===');
const monde = annuaire(joueur());
const parType = monde.reduce<Record<string, number>>((a, c) => {
  a[c.type] = (a[c.type] ?? 0) + 1; return a;
}, {});
console.log(' ', monde.length, 'comptes :', JSON.stringify(parType));
console.log('  exemple club :', monde.find((c) => c.type === 'club')?.nom, '→ avatar', monde.find((c) => c.type === 'club')?.avatar);
console.log('  exemple compétition :', monde.find((c) => c.type === 'competition')?.nom, '→ avatar', monde.find((c) => c.type === 'competition')?.avatar);

console.log('\n=== RECHERCHE ===');
for (const q of ['toulouse', 'top 14', 'dupont', 'ramos']) {
  const r = chercherComptes(joueur(), q, 3);
  console.log(`  « ${q} » → ${r.length} comptes : ${r.map((c) => '@' + c.pseudo).join(', ') || '—'}`);
}

console.log('\n=== LE FIL SUIT LES SEMAINES ===');
const avant = useGame.getState().posts.length;
// Une fournée par semaine, et pas deux fois la même : `filSemaine` fait verrou.
for (let i = 0; i < 4; i++) {
  useGame.getState().vivreSemaineSociale();
  useGame.getState().vivreSemaineSociale(); // rappel immédiat : ne doit rien ajouter
  const j = useGame.getState().joueur!;
  useGame.setState({ joueur: { ...j, semaine: (j.semaine ?? 1) + 1 } });
}
const apres = useGame.getState().posts;
console.log(`  ${avant} → ${apres.length} publications sur 4 semaines jouées`);
console.log('  dernier :', apres[0]?.auteur, '—', apres[0]?.texte.slice(0, 70));
console.log('  recherche dans le fil « entraînement » :', chercherPosts(apres, 'entraînement').length, 'résultat(s)');

console.log('\n=== RELATIONS ET RIPOSTES ===');
const cible = monde.find((c) => c.type === 'joueur')!;
useGame.getState().suivreCompte(cible);
await useGame.getState().envoyerMessage(cible.pseudo, 'Salut, bravo pour ton match, respect 💪');
await useGame.getState().envoyerMessage(cible.pseudo, 'En fait t’es nul, ferme ta gueule');
const fil = useGame.getState().conversations[cible.pseudo] ?? [];
for (const m of fil) console.log(`  ${m.de === 'moi' ? '→' : '←'} ${m.texte}`);
const rel = useGame.getState().relationsSociales[cible.pseudo] ?? 0;
console.log(`  relation avec @${cible.pseudo} : ${rel} (${humeur(rel)})`);
console.log('  détection du ton :', tonDuMessage('bravo mon frère'), '/', tonDuMessage('t’es un clown'));
console.log('  effet d’une insulte sur une relation à +40 :', effetSurRelation('t’es nul', 40));

console.log('\n=== PROFIL PERSONNALISÉ ===');
useGame.getState().majProfilSocial({ nomAffiche: 'Le Patron', pseudo: 'le_patron_10', bio: 'Ouvreur. Tête froide.', avatar: '👑' });
const j = joueur();
console.log(`  ${j.profilSocial?.nomAffiche} @${j.pseudo} — « ${j.profilSocial?.bio} » photo ${j.profilSocial?.avatar}`);
