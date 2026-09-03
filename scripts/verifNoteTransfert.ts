// ═══════════════════════════════════════════════════════════════════════════
// LA NOTE DU MARCHÉ EST LA NOTE QU'ON OBTIENT
// ═══════════════════════════════════════════════════════════════════════════
// Retour de jeu : « sur le marché mondial ils ont pas du tout les bons généraux
// quand on les recrute ».
//
// `effectifDuClub` applique à TOUT l'effectif le bonus de `generationDuClub` —
// le cycle propre au club. La fiche du marché lisait donc la note bonifiée par
// le club VENDEUR, tandis que le transfert reprenait le joueur dans
// `effectifBrut` (note nue) avant de lui appliquer le bonus du club ACHETEUR.
// Mesuré à la saison 3 sur 70 clubs : bonus de −3,5 à +5,2, soit près de neuf
// points d'écart possible. Un joueur affiché 74 arrivait à 65.
//
//   npx vite-node scripts/verifNoteTransfert.ts

import { COMPETITIONS } from '../src/data/clubs';
import { effectifDuClub, setTransfertsSociaux } from '../src/lib/effectif';
import { generationDuClub } from '../src/lib/generations';

const nomDe = (c: unknown) => (typeof c === 'string' ? c : (c as { nom: string }).nom);
const S = 3;

// Les clubs aux bonus les plus opposés : c'est là que l'écart se voit.
const clubs: { club: string; b: number }[] = [];
for (const id of ['top14', 'prod2', 'nationale', 'nationale2']) {
  for (const c of (COMPETITIONS.find((x) => x.id === id)?.clubs ?? []).slice(0, 14)) {
    const nom = nomDe(c);
    const eff = effectifDuClub(nom, S);
    if (!eff.length) continue;
    const moy = eff.reduce((s, j) => s + j.note, 0) / eff.length;
    clubs.push({ club: nom, b: generationDuClub(nom, S, moy).bonus });
  }
}
clubs.sort((a, b) => a.b - b.b);
const acheteur = clubs[0];          // le plus gros creux
const vendeur = clubs[clubs.length - 1]; // la plus belle génération

console.log(`\n  Vendeur  ${vendeur.club} (bonus ${vendeur.b.toFixed(2)})`);
console.log(`  Acheteur ${acheteur.club} (bonus ${acheteur.b.toFixed(2)})`);
console.log(`  Écart de génération : ${(vendeur.b - acheteur.b).toFixed(1)} points\n`);

let echecs = 0;
const candidats = effectifDuClub(vendeur.club, S).sort((a, b) => b.note - a.note).slice(0, 6);

console.log('  joueur                      marché   après transfert   écart');
console.log('  ' + '─'.repeat(64));
for (const j of candidats) {
  const affichee = j.note; // ce que la carte du marché montre

  setTransfertsSociaux([{
    nom: j.nom, de: vendeur.club, vers: acheteur.club, saison: S,
    note: j.note, age: j.age, poste: undefined, nation: j.nation,
  } as never]);

  const arrive = effectifDuClub(acheteur.club, S)
    .find((x) => x.nom === j.nom);
  setTransfertsSociaux(undefined);

  const obtenue = arrive?.note ?? 0;
  const ecart = obtenue - affichee;
  if (Math.abs(ecart) > 0) echecs++;
  console.log(
    `  ${(Math.abs(ecart) === 0 ? '✅' : '❌')} ${j.nom.slice(0, 24).padEnd(25)} ${String(affichee).padStart(5)} ${String(obtenue).padStart(15)} ${(ecart >= 0 ? '+' : '') + ecart}`,
  );
}

// ── 2. UNE RECRUE PEUT REPARTIR ────────────────────────────────────────────
// Retour de jeu : « on peut pas virer les joueurs qu'on a recrutés ».
// Les départs se calculaient sur la liste d'origine, puis la boucle d'arrivée
// remettait le joueur sans regarder s'il en était reparti.
console.log('  Un joueur recruté puis vendu quitte-t-il vraiment le club ?\n');

const cible = effectifDuClub(vendeur.club, S).sort((a, b) => b.note - a.note)[0];
const tiers = clubs[Math.floor(clubs.length / 2)].club;

// a) on le recrute
setTransfertsSociaux([{
  nom: cible.nom, de: vendeur.club, vers: acheteur.club, saison: S,
  note: cible.note, age: cible.age, poste: undefined, nation: cible.nation,
} as never]);
const apresAchat = effectifDuClub(acheteur.club, S).some((j) => j.nom === cible.nom);

// b) puis on le revend à un troisième club
setTransfertsSociaux([
  { nom: cible.nom, de: vendeur.club, vers: acheteur.club, saison: S, note: cible.note, age: cible.age, poste: undefined, nation: cible.nation },
  { nom: cible.nom, de: acheteur.club, vers: tiers, saison: S, note: cible.note, age: cible.age, poste: undefined, nation: cible.nation },
] as never);
const encoreLa = effectifDuClub(acheteur.club, S).some((j) => j.nom === cible.nom);
const chezLeTiers = effectifDuClub(tiers, S).some((j) => j.nom === cible.nom);
setTransfertsSociaux(undefined);

const ok1 = apresAchat, ok2 = !encoreLa, ok3 = chezLeTiers;
if (!ok1 || !ok2 || !ok3) echecs++;
console.log(`  ${ok1 ? '✅' : '❌'} après achat, ${cible.nom} est à ${acheteur.club}`);
console.log(`  ${ok2 ? '✅' : '❌'} après revente, il n'y est plus`);
console.log(`  ${ok3 ? '✅' : '❌'} il est bien à ${tiers}`);

console.log(`\n  ${echecs === 0
  ? '✅ Note fidèle, et une recrue peut repartir.'
  : `❌ ${echecs} contrôle(s) en échec.`}\n`);
process.exit(echecs === 0 ? 0 : 1);
