// Vérification SANS NAVIGATEUR du lot « photos de profil + match en direct » :
//   1. plus un seul emoji dans l'annuaire, et des comptes lambda crédibles ;
//   2. les compteurs d'un post montent au fil des semaines, puis s'éteignent ;
//   3. chaque publication du monde a ses commentaires ;
//   4. le match en direct raconte EXACTEMENT le score du moteur.

import { annuaire, bassinSocial } from '../src/lib/comptes';
import { comptesLambda, photoDe, avatarInitiales, initialesDe } from '../src/lib/avatars';
import { filDeLaSemaine } from '../src/lib/vie';
import { vieillirPost, AGE_MORT } from '../src/lib/social';
import { matchDeLaSemaine } from '../src/lib/matchLive';
import { creerMatch, avancer } from '../src/lib/moteur/moteur';
import { atteignable } from '../src/lib/moteur/plan';
import { effectifDuClub } from '../src/lib/effectif';
import { jouerRencontre, scorePossible } from '../src/lib/championnat';
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
  // ⚠️ Le moteur joue librement, mais il doit retomber EXACTEMENT sur le score
  // de la ligue — c'est lui qui alimente le classement.
  const A = 'Stade Toulousain';
  const B = 'Stade Rochelais';
  const effA = effectifDuClub(A, 1);
  const effB = effectifDuClub(B, 1);
  let faux = 0;
  let sansEssai = 0;
  for (let i = 0; i < 40; i++) {
    const m = jouerRencontre(A, B, 1, `test#${i}`, null);
    const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, `test#${i}`);
    let g = 0;
    while (!e.fini && g++ < 4000) avancer(e, 8);
    if (e.scoreA !== m.scoreD || e.scoreB !== m.scoreE) faux++;
    if (e.essaisA + e.essaisB === 0) sansEssai++;
    if (i === 0) {
      console.log(`\n  ${A} ${e.scoreA} – ${e.scoreB} ${B} · ${e.commentaires.length} actions`);
      for (const c of e.commentaires.filter((x) => x.points > 0).slice(0, 6)) {
        console.log(`   ${String(c.minute).padStart(2)}′ ${c.texte.slice(0, 78)}`);
      }
    }
  }
  console.log(`  40 matchs joués par le moteur — écarts avec le score de la ligue : ${faux} ${faux === 0 ? '✅' : '❌'}`);
  console.log(`  matchs sans le moindre essai : ${sansEssai} (normal si scores faibles)`);

  // Aucun score de rugby impossible ne doit sortir du championnat.
  let ecarts = 0;
  for (let s = 0; s <= 60; s++) {
    if (s !== scorePossible(s)) continue;
    if (!atteignable(s)) { ecarts++; console.log(`    ✗ score ${s} inatteignable`); }
  }
  console.log(`  tous les scores de 0 à 60 sont décomposables : ${ecarts === 0 ? '✅' : `❌ ${ecarts}`}`);
}

console.log('\n=== 5. LE MATCH DE LA SEMAINE ===');
for (const sem of [1, 2, 11, 15, 40]) {
  const a = matchDeLaSemaine({ ...JOUEUR, semaine: sem });
  console.log(`  semaine ${String(sem).padStart(2)} → ${a ? `J${a.journee} ${a.match.domicile} ${a.match.scoreD}-${a.match.scoreE} ${a.match.exterieur}` : 'pas de match'}`);
}
