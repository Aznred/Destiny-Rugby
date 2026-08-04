// L'Ovale : audience réaliste par division, profils uniques, invitations.
import { annuaire, abonnesClub, abonnesJoueur, niveauDuClub } from '../src/lib/comptes';
import { statsDePost, statsDepuisVues, compact } from '../src/lib/social';
import { invitationCoequipier } from '../src/lib/vie';
import { graine } from '../src/lib/championnat';
import { COMPETITIONS } from '../src/data/clubs';
import type { Joueur } from '../src/types';

console.log('=== 1. ABONNÉS PAR DIVISION (demande explicite) ===');
const cibles: [string, string][] = [
  ['top14', 'Top 14'], ['prod2', 'Pro D2'], ['nationale', 'Nationale'],
  ['nationale2', 'Nationale 2'], ['fed1', 'Fédérale 1'], ['fed3', 'Fédérale 3'],
  ['reg1', 'Régionale 1'], ['reg3', 'Régionale 3'],
];
for (const [id, nom] of cibles) {
  const comp = COMPETITIONS.find((c) => c.id === id);
  if (!comp) { console.log(`  ${nom} : introuvable`); continue; }
  const vals = comp.clubs.slice(0, 40).map((c) => abonnesClub(c.nom));
  vals.sort((a, b) => a - b);
  console.log(`  ${nom.padEnd(14)} niveau ${String(comp.niveau).padStart(2)} · médiane ${compact(vals[Math.floor(vals.length / 2)]).padStart(7)} · max ${compact(vals[vals.length - 1])}`);
}

console.log('\n=== 2. UN JOUEUR NE DÉPASSE PAS SON ÉTAGE ===');
for (const [club, note] of [['Stade Toulousain', 90], ['Stade Toulousain', 60], ['Provence Rugby', 70]] as [string, number][]) {
  console.log(`  ${club} (niveau ${niveauDuClub(club)}), note ${note} → ${compact(abonnesJoueur('Test Joueur ' + note, club, note))} abonnés`);
}

console.log('\n=== 3. LES COMPTEURS SE TIENNENT ===');
{
  let incoherences = 0;
  for (let i = 0; i < 400; i++) {
    const rng = graine('t#' + i);
    const abonnes = [80, 500, 3000, 20_000, 400_000][i % 5];
    const s = statsDePost(abonnes, rng);
    if (s.likes > s.vues || s.reposts > s.likes) incoherences++;
  }
  console.log(`  400 publications : ${incoherences} incohérence(s) likes>vues ou reposts>likes ${incoherences === 0 ? '✅' : '❌'}`);
  for (const a of [120, 900, 25_000, 600_000]) {
    const s = statsDePost(a, graine('ex#' + a));
    console.log(`  ${compact(a).padStart(7)} abonnés → ${compact(s.vues).padStart(7)} vues · ${compact(s.likes).padStart(6)} likes · ${compact(s.reposts)} reposts`);
  }
  const v = statsDepuisVues(50, graine('petit'));
  console.log(`  un petit compte (50 vues) → ${v.likes} likes, ${v.reposts} reposts`);
}

console.log('\n=== 4. DES PROFILS TOUS DIFFÉRENTS ===');
{
  const j = { nom: 'Léo Fabre', club: 'Stade Toulousain', division: 'top14', saison: 1, poste: 'ailier_droit', nation: 'France' } as unknown as Joueur;
  const a = annuaire(j);
  const bios = new Set(a.map((c) => c.bio));
  const bannieres = new Set(a.map((c) => c.banniere));
  console.log(`  ${a.length} comptes · ${bios.size} bios distinctes · ${bannieres.size} bannières`);
  const joueurs = a.filter((c) => c.type === 'joueur');
  const biosJ = new Set(joueurs.map((c) => c.bio));
  console.log(`  joueurs : ${joueurs.length} comptes, ${biosJ.size} bios distinctes`);
  for (const c of joueurs.slice(0, 4)) console.log(`     ${c.nom} — « ${c.bio} » (${compact(c.abonnes)})`);
  const fans = a.filter((c) => c.type === 'fan' || c.type === 'hater');
  console.log(`  supporters : ${fans.length} comptes, ${new Set(fans.map((c) => c.bio)).size} bios distinctes`);
  for (const c of fans.slice(0, 3)) console.log(`     ${c.nom} — « ${c.bio} » (${compact(c.abonnes)})`);
  const certifies = a.filter((c) => c.certifie).length;
  console.log(`  comptes certifiés : ${certifies} / ${a.length}`);
}

console.log('\n=== 5. LES COÉQUIPIERS PROPOSENT DES ACTIVITÉS ===');
for (let i = 0; i < 5; i++) console.log(`  « ${invitationCoequipier('demo#' + i)} »`);
const tous = new Set(Array.from({ length: 60 }, (_, i) => invitationCoequipier('v#' + i)));
console.log(`  60 tirages → ${tous.size} messages distincts`);
