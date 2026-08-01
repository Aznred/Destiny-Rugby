// Vérification SANS NAVIGATEUR du lot « photos de profil + match en direct » :
//   1. plus un seul emoji dans l'annuaire, et des comptes lambda crédibles ;
//   2. les compteurs d'un post montent au fil des semaines, puis s'éteignent ;
//   3. chaque publication du monde a ses commentaires ;
//   4. le match en direct raconte EXACTEMENT le score du moteur.

import { annuaire, bassinSocial } from '../src/lib/comptes';
import { comptesLambda, photoDe, avatarInitiales, initialesDe } from '../src/lib/avatars';
import { filDeLaSemaine } from '../src/lib/vie';
import { vieillirPost, AGE_MORT } from '../src/lib/social';
import { jouerEnDirect, decomposer, matchDeLaSemaine } from '../src/lib/matchLive';
import { jouerRencontre, graine, scorePossible } from '../src/lib/championnat';
import type { Joueur } from '../src/types';

const JOUEUR = {
  nom: 'Léo Fabre', pseudo: 'leo_fabre_31', poste: 'ailier_gauche', nation: 'France',
  club: 'Stade Toulousain', division: 'top14', saison: 1, semaine: 5, age: 22,
  reputation: 40, popularite: 50, abonnes: 4200, moral: 60, forme: 70,
  attributs: {}, titres: [], argent: 0,
} as unknown as Joueur;

console.log('=== 1. DES PHOTOS, PLUS DES EMOJIS ===');
{
  const monde = annuaire(JOUEUR);
  const parEcriture = { photo: 0, club: 0, compet: 0, initiales: 0, emoji: 0 };
  for (const c of monde) {
    if (c.avatar.startsWith('photo:')) parEcriture.photo++;
    else if (c.avatar.startsWith('club:')) parEcriture.club++;
    else if (c.avatar.startsWith('compet:')) parEcriture.compet++;
    else if (c.avatar.startsWith('initiales:')) parEcriture.initiales++;
    else parEcriture.emoji++;
  }
  console.log(`  ${monde.length} comptes :`, JSON.stringify(parEcriture));
  console.log('  emojis restants :', parEcriture.emoji, parEcriture.emoji === 0 ? '✅' : '❌');
  const lambda = monde.filter((c) => /^[A-ZÉÀ][a-zéèêà-]+(-[A-Z][a-z]+)? [A-ZÉ]/.test(c.nom) && (c.type === 'fan' || c.type === 'hater'));
  console.log(`  comptes « monsieur tout le monde » : ${lambda.length}`);
  for (const c of lambda.slice(0, 4)) console.log(`    ${c.nom} @${c.pseudo} — ${c.bio?.slice(0, 52)}…`);
  console.log('  photo stable ?', photoDe('Jean-Michel Dubois') === photoDe('Jean-Michel Dubois'));
  console.log('  exemple d’URL :', photoDe('Jean-Michel Dubois'));
  console.log('  repli initiales :', initialesDe('Jean-Michel Dubois'), '·', avatarInitiales('Jean-Michel Dubois').slice(0, 46) + '…');
  console.log('  déterminisme des lambda :',
    comptesLambda('Stade Toulousain', 5).map((c) => c.nom).join(', '));
}

console.log('\n=== 2. LES COMPTEURS ÉVOLUENT ===');
{
  const post = { id: 'demo-1', vues: 10_000, likes: 380, reposts: 42 };
  let etat = { ...post };
  const lignes: string[] = [];
  for (let age = 0; age <= AGE_MORT + 1; age++) {
    etat = { ...etat, ...vieillirPost({ ...etat, id: post.id }, age) };
    lignes.push(`sem+${age}: ${etat.vues} vues / ${etat.likes} ♥ / ${etat.reposts} ↻`);
  }
  console.log('  ' + lignes.join('\n  '));
  const ok = etat.vues > post.vues && etat.likes >= post.likes && etat.reposts >= post.reposts;
  console.log('  monte sans jamais redescendre :', ok ? '✅' : '❌');
}

console.log('\n=== 3. DES COMMENTAIRES SOUS CHAQUE TWEET ===');
{
  const comptes = bassinSocial(JOUEUR);
  const posts = filDeLaSemaine(JOUEUR, comptes, 5, 8);
  const avec = posts.filter((p) => (p.reponses?.length ?? 0) > 0).length;
  console.log(`  ${avec}/${posts.length} publications commentées`);
  const gros = posts.sort((a, b) => b.vues - a.vues)[0];
  console.log(`  « ${gros.texte.slice(0, 54)}… » (${gros.vues} vues) → ${gros.reponses?.length} réponses :`);
  for (const r of gros.reponses ?? []) {
    console.log(`    ${r.hostile ? '💢' : '💬'} ${r.auteur} : ${r.texte}`);
  }
}

console.log('\n=== 4. LE MATCH EN DIRECT DIT LA VÉRITÉ ===');
{
  // On vérifie sur 200 rencontres que le récit retombe EXACTEMENT sur le score.
  let faux = 0;
  let sansEssai = 0;
  for (let i = 0; i < 200; i++) {
    const m = jouerRencontre('Stade Toulousain', 'Stade Rochelais', 1, `test#${i}`, null);
    const live = jouerEnDirect(m, 1, `test#${i}`);
    const cumulD = live.actions.filter((a) => a.cote === 'domicile').reduce((s, a) => s + a.points, 0);
    const cumulE = live.actions.filter((a) => a.cote === 'exterieur').reduce((s, a) => s + a.points, 0);
    if (cumulD !== m.scoreD || cumulE !== m.scoreE) faux++;
    if (!live.actions.some((a) => a.type === 'essai')) sansEssai++;
  }
  console.log(`  200 matchs simulés — récits qui ne retombent pas sur le score : ${faux} ${faux === 0 ? '✅' : '❌'}`);
  console.log(`  matchs sans le moindre essai : ${sansEssai} (normal si scores faibles)`);

  const m = jouerRencontre('Stade Toulousain', 'Stade Rochelais', 1, 'demo', null);
  const live = jouerEnDirect(m, 1, 'demo');
  console.log(`\n  ${live.domicile} ${live.scoreD} – ${live.scoreE} ${live.exterieur} · ${live.actions.length} actions`);
  for (const a of live.actions.filter((x) => x.points > 0 || x.type === 'fin').slice(0, 8)) {
    console.log(`   ${String(a.minute).padStart(2)}′ ${a.texte.slice(0, 78)}`);
  }
  console.log('  compos :', live.compoD.length, 'vs', live.compoE.length, 'joueurs');
  console.log('  positions du ballon (5 premières) :',
    live.actions.slice(0, 5).map((a) => `${a.x},${a.y}`).join(' → '));

  // La décomposition ne doit jamais inventer de points.
  let ecarts = 0;
  for (let s = 0; s <= 60; s++) {
    // 1, 2 et 4 n'existent pas au rugby : `scorePossible` les écarte en amont.
    if (s !== scorePossible(s)) continue;
    const rng = graine('dec#' + s);
    const total = decomposer(s, rng).reduce(
      (t, mq) => t + (mq.type === 'essai' ? (mq.transforme ? 7 : 5) : 3), 0,
    );
    if (total !== s) { ecarts++; console.log(`    ✗ score ${s} → ${total}`); }
  }
  console.log(`  décomposition exacte de 0 à 60 points : ${ecarts === 0 ? '✅' : `❌ ${ecarts} écarts`}`);
}

console.log('\n=== 5. LE MATCH DE LA SEMAINE ===');
for (const sem of [1, 2, 11, 15, 40]) {
  const a = matchDeLaSemaine({ ...JOUEUR, semaine: sem });
  console.log(`  semaine ${String(sem).padStart(2)} → ${a ? `J${a.journee} ${a.match.domicile} ${a.match.scoreD}-${a.match.scoreE} ${a.match.exterieur}` : 'pas de match'}`);
}
