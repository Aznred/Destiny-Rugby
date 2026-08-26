// VÉRIFICATION — LES PÉPITES, ET LA NOTE DU JOUR QUI NE BOUGE PAS
//
// Demande : « des recruteurs pour trouver les pépites ; il peut aussi y avoir
// des gros potentiels dans les petites ligues ».
//
// ⚠️ IL N'Y EN AVAIT AUCUNE, ET C'ÉTAIT MÉCANIQUE. Le talent inventé est un
// tirage UNIFORME de ±7 autour de la note de la division : mesuré avant
// correction, la marge potentiel − note plafonnait à 13 points dans TOUTES les
// divisions amateurs, et à 9 dans la plupart. Un recruteur envoyé chercher des
// pépites serait rentré bredouille à chaque fois — non par malchance, mais
// parce que la loi de tirage n'en produit aucune.
//
// Ce que ce script contrôle :
//   1. des pépites existent, à TOUS les étages, et elles restent rares ;
//   2. le plafond est RELATIF à l'étage — pas de joueur de Fédérale 2 à 95 ;
//   3. ⚠️ LA NOTE DU JOUR N'A PAS BOUGÉ D'UN POINT (le contrôle qui compte) ;
//   4. une pépite éclôt vraiment au fil des saisons ;
//   5. tout ça est déterministe.
//
// Lancer : npx vite-node scripts/verifPepites.ts

import { COMPETITIONS } from '../src/data/clubs';
import {
  AGE_PEPITE, MARGE_PEPITE, PART_PEPITE, effectifDuClub, forceEffectif, plafondPepite,
} from '../src/lib/effectif';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(54)} ${valeur}`);
}

const CLUBS: { club: string; division: string; niveau: number }[] = [];
for (const c of COMPETITIONS) {
  for (const n of c.clubs) CLUBS.push({ club: n.nom, division: c.nom, niveau: c.niveau });
}

// Une pépite se RECONNAÎT à sa marge, comme un recruteur la verrait : on ne
// demande pas au jeu qui il a élu, on regarde ce qui est affichable.
const MARGE_VISIBLE = 14;
type Fiche = {
  club: string; division: string; niveau: number;
  nom: string; age: number; note: number; potentiel: number;
};
const pepites: Fiche[] = [];
let jeunes = 0;
for (const { club, division, niveau } of CLUBS) {
  for (const j of effectifDuClub(club, 1)) {
    if (j.age > AGE_PEPITE) continue;
    jeunes++;
    if (j.potentiel - j.note >= MARGE_VISIBLE) {
      pepites.push({ club, division, niveau, nom: j.nom, age: j.age, note: j.note, potentiel: j.potentiel });
    }
  }
}

// ---------------------------------------------------------------------------
console.log('\n=== 1. IL Y EN A, ET IL N’Y EN A PAS TROP ===');
// ---------------------------------------------------------------------------
const part = pepites.length / jeunes;
ligne('des pépites existent', `${pepites.length} sur ${jeunes} jeunes`, pepites.length > 20);
// ⚠️ La borne haute compte autant que la basse : au-delà, « pépite » désigne
// une classe d'âge entière et le mot ne veut plus rien dire.
ligne('… et elles restent rares',
  `${(part * 100).toFixed(2)} % (cible ${(PART_PEPITE * 100).toFixed(1)} % ± moitié)`,
  part >= PART_PEPITE * 0.5 && part <= PART_PEPITE * 1.5);

// ⚠️ LE POINT DE LA DEMANDE : « il peut aussi y avoir des gros potentiels dans
// les petites ligues ». Un système qui n'en produirait qu'en Top 14 aurait
// l'air de marcher et raterait entièrement l'intention.
const AMATEURS = [4, 5, 6, 7, 8, 9, 10];
const parNiveau = new Map<number, Fiche[]>();
for (const p of pepites) parNiveau.set(p.niveau, [...(parNiveau.get(p.niveau) ?? []), p]);
const etagesVides = AMATEURS.filter((n) => !(parNiveau.get(n) ?? []).length);
ligne('il y en a dans les PETITES ligues (n4 à n10)',
  etagesVides.length ? `aucune en ${etagesVides.map((n) => 'n' + n).join(', ')}` : 'les 7 étages en ont',
  etagesVides.length === 0);

console.log('\n  niveau | pépites | meilleur potentiel | plafond de l’étage');
for (const n of [...parNiveau.keys()].sort((a, b) => a - b)) {
  const l = parNiveau.get(n)!;
  const max = Math.max(...l.map((p) => p.potentiel));
  console.log(
    `   n${String(n).padStart(2)}   | ${String(l.length).padStart(7)} | ${String(max).padStart(18)} `
    + `| ${plafondPepite(n)}`,
  );
}

// ---------------------------------------------------------------------------
console.log('\n=== 2. LE PLAFOND EST RELATIF À L’ÉTAGE ===');
// ---------------------------------------------------------------------------
// ⚠️ UN PLAFOND ABSOLU NE MARCHE PAS, et c'est mesuré : à 94, la première
// version a sorti un joueur de Fédérale 2 qui culminait à 95 — meilleur que
// n'importe qui en Top 14, dans un club de sixième division. Et rien ne l'en
// sortirait : le jeu ne fait pas monter un bon joueur de club en club, il ne
// connaît que le mercato circulaire de sa division.
//
// La tolérance de 5 points n'est pas du mou : le calque « génération dorée »
// (lib/generations.ts) ajoute `bonus × 0,6` au potentiel APRÈS coup, en aval de
// toute fabrique de joueurs. C'est lui qu'on borne ici, pas la pépite.
const TOLERANCE_GENERATION = 5;
const debordent = pepites.filter((p) => p.potentiel > plafondPepite(p.niveau) + TOLERANCE_GENERATION);
ligne('aucune pépite ne dépasse le plafond de son étage',
  debordent.length
    ? `${debordent[0].nom} (${debordent[0].division}) à ${debordent[0].potentiel}`
    : `0 sur ${pepites.length}, marge ${MARGE_PEPITE} pts au-dessus de la division`,
  debordent.length === 0);

const meilleureAmateur = pepites.filter((p) => p.niveau >= 6).sort((a, b) => b.potentiel - a.potentiel)[0];
ligne('… et la meilleure des Fédérales/Régionales reste croyable',
  `${meilleureAmateur.potentiel} (${meilleureAmateur.division})`,
  meilleureAmateur.potentiel <= 84);

// ---------------------------------------------------------------------------
console.log('\n=== 3. ⚠️ LA NOTE DU JOUR N’A PAS BOUGÉ ===');
// ---------------------------------------------------------------------------
// C'EST LE CONTRÔLE QUI COMPTE, et le seul qui protège vraiment quelque chose.
// Une pépite n'écrase QUE le champ `potentiel` : la note de la saison 1 est
// démontrablement indépendante du potentiel aux deux fabriques (voir les
// commentaires dans effectif.ts). Si elle en dépendait, on aurait inflaté la
// force des effectifs, donc les classements, les montées et l'étalonnage des
// divisions — sans qu'aucun autre banc d'essai ne le signale.
//
// L'empreinte ci-dessous a été relevée en remisant la modification (`git
// stash`) : c'est LA MÊME, au point près, avec et sans pépites.
// [niveau, joueurs, somme des notes, somme des forces × 1000]
const EMPREINTE: [number, number, number, number][] = [
  [0, 4337, 252202, 6421947],
  [1, 677, 47930, 1129500],
  [2, 1473, 81406, 2219500],
  [3, 3148, 149663, 4931974],
  [4, 2547, 129444, 4141395],
  [5, 1727, 93809, 2758605],
  [6, 4214, 195803, 6151237],
  [7, 5426, 237937, 7517474],
  [8, 2450, 97572, 2892526],
  [9, 2285, 86565, 2329474],
  [10, 1829, 65849, 2261263],
];

const mesure = new Map<number, { n: number; notes: number; force: number }>();
for (const { club, niveau } of CLUBS) {
  const e = mesure.get(niveau) ?? { n: 0, notes: 0, force: 0 };
  for (const j of effectifDuClub(club, 1)) { e.notes += j.note; e.n++; }
  e.force += forceEffectif(club, 1);
  mesure.set(niveau, e);
}
for (const [niveau, n, notes, force] of EMPREINTE) {
  const e = mesure.get(niveau)!;
  const ok = e.n === n && e.notes === notes && Math.round(e.force * 1000) === force;
  ligne(`n${niveau} : ${n} joueurs, notes et force de la saison 1`,
    ok ? 'identique' : `${e.n} joueurs, notes ${e.notes} (attendu ${notes}), force ${Math.round(e.force * 1000)}`,
    ok);
}

// ---------------------------------------------------------------------------
console.log('\n=== 4. UNE PÉPITE ÉCLÔT VRAIMENT ===');
// ---------------------------------------------------------------------------
// Un potentiel qu'on n'atteint jamais est un chiffre décoratif : le recruteur
// aurait raison de dire qu'il a trouvé un joueur, et le jeu lui donnerait tort.
const suivies = pepites
  .filter((p) => p.niveau >= 4 && p.age <= 21)
  .sort((a, b) => (b.potentiel - b.note) - (a.potentiel - a.note))
  .slice(0, 6);

console.log('\n  division         | âge | S1 | S8 | potentiel');
let eclosent = 0;
for (const p of suivies) {
  const plusTard = effectifDuClub(p.club, 8).find((j) => j.nom === p.nom);
  const note8 = plusTard?.note ?? 0;
  // On ne demande pas d'atteindre le potentiel : le joueur peut partir, prendre
  // sa retraite, ou traverser un creux de club. On demande qu'il PROGRESSE.
  if (note8 >= p.note + 12) eclosent++;
  console.log(
    `  ${p.division.slice(0, 16).padEnd(16)} | ${String(p.age).padStart(3)} | ${String(p.note).padStart(2)} `
    + `| ${String(note8).padStart(2)} | ${p.potentiel}`,
  );
}
ligne('les plus grosses marges progressent vraiment',
  `${eclosent}/${suivies.length} gagnent au moins 12 points en 8 saisons`,
  eclosent >= suivies.length - 1);

// ---------------------------------------------------------------------------
console.log('\n=== 5. DÉTERMINISME ===');
// ---------------------------------------------------------------------------
// ⚠️ Une pépite prend SA PROPRE graine (`graine('pepite#…')`). `graine()` est
// une fermeture à état : seuls le NOMBRE et l'ORDRE des appels déterminent la
// suite, si bien qu'un tirage glissé dans le flux existant décalerait l'âge, la
// retraite et la nationalité de TOUS les joueurs générés du jeu.
const t = suivies[0];
const a = effectifDuClub(t.club, 1).map((j) => `${j.nom}:${j.note}:${j.potentiel}`).join('|');
const b = effectifDuClub(t.club, 1).map((j) => `${j.nom}:${j.note}:${j.potentiel}`).join('|');
ligne('deux appels donnent le même effectif', a === b ? t.club : 'DIVERGENCE', a === b);

console.log(
  echecs === 0
    ? '\n✅ Des pépites partout, bornées par leur étage, et pas un point de note déplacé.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
