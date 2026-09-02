// ═══════════════════════════════════════════════════════════════════════════
// L'ENVELOPPE STRUCTURE N'A LE DROIT QU'À UNE SEULE DÉFINITION
// ═══════════════════════════════════════════════════════════════════════════
// Retour de jeu : « les améliorations sont buggées, max 1 fois par saison ».
//
// L'écran des installations AFFICHAIT un prix, et le store en FACTURAIT un
// autre. Les deux partaient de la même intention — « ce que le club met dans
// ses murs » — mais par trois chemins différents :
//
//   écran  : budgetStructure(forceEffectif(club), competitionDuClub(club).niveau)
//   store  : budgetsDuClub(club, saison).structure
//              ├─ forceDuGroupe(club)        moyenne SIMPLE des 23 meilleurs
//              │                             (forceEffectif pondère : XV ×1, banc ×0,5)
//              ├─ competitionEffective(club) tient compte des montées/descentes
//              └─ forceMoyenneDivision(...)  la référence d'étage, ABSENTE côté écran
//
// Conséquence : le bouton s'active sur le prix A, `ameliorerInstallation` refuse
// en silence sur le prix B. On clique, il ne se passe rien — et comme l'enveloppe
// ne se recharge qu'au changement de saison, on croit à une limite « une fois
// par saison ».
//
// Ce banc mesure l'écart. Il doit rester à ZÉRO : c'est la mise en garde que
// `lib/installations.ts` porte déjà — « deux formules pour une même enveloppe
// finissent toujours par dire deux choses ».
//
//   npx vite-node scripts/verifEnveloppeStructure.ts

import { budgetsDuClub } from '../src/lib/recrutementManager';
import { coutAmelioration } from '../src/lib/installations';
import { financesDuClub } from '../src/lib/economie';
import { COMPETITIONS, competitionDuClub } from '../src/data/clubs';
import { forceEffectif } from '../src/lib/effectif';
import { setMouvementsClubs } from '../src/lib/divisions';

const DIVISIONS = ['top14', 'prod2', 'nationale', 'nationale2', 'fed1', 'fed3', 'reg1', 'reg3'];
const nomDe = (c: unknown) => (typeof c === 'string' ? c : (c as { nom: string }).nom);

/** Ce que l'écran calculait avant le correctif. */
function enveloppeEcranAvant(club: string, saison: number): number {
  return financesDuClub(forceEffectif(club, saison), competitionDuClub(club)?.niveau ?? 8).structure;
}

let divergents = 0;
let pires = 0;

console.log('\n  ENVELOPPE STRUCTURE — l\'écran et le store disent-ils la même chose ?\n');
console.log('  division    club                     store      écran(avant)   écart   prix marche 1');
console.log('  ' + '─'.repeat(92));

for (const id of DIVISIONS) {
  const comp = COMPETITIONS.find((c) => c.id === id);
  if (!comp?.clubs?.length) continue;
  const club = nomDe(comp.clubs[0]);

  const store = budgetsDuClub(club, 1).structure;
  const ecran = enveloppeEcranAvant(club, 1);
  const ecart = ecran - store;
  if (ecart !== 0) divergents++;

  // Le cas qui fait vraiment mal : l'écran annonce MOINS cher que le store.
  // Le bouton s'allume, le clic ne fait rien, et rien ne l'explique.
  const prixStore = coutAmelioration(0, store) ?? 0;
  const prixEcran = coutAmelioration(0, ecran) ?? 0;
  if (prixEcran < prixStore) pires++;

  console.log(
    `  ${id.padEnd(11)} ${club.slice(0, 24).padEnd(24)} ${String(store).padStart(9)} ${String(ecran).padStart(14)} ${(ecart >= 0 ? '+' : '') + ecart} ${String(prixStore).padStart(12)}`,
  );
}

// ── LE CAS DE LA MONTÉE ────────────────────────────────────────────────────
// `competitionDuClub` rend la division D'ORIGINE ; `competitionEffective` rend
// celle où le club joue VRAIMENT. Un club promu change donc d'étage pour le
// store et pas pour l'écran : c'est l'écart maximal, et c'est précisément la
// situation du retour de jeu (saison 3, promu en Régionale 2).
const promu = nomDe(COMPETITIONS.find((c) => c.id === 'reg3')!.clubs[0]);
const avantMontee = budgetsDuClub(promu, 1).structure;
setMouvementsClubs({ [promu]: 'reg1' });
const apresMontee = budgetsDuClub(promu, 1).structure;
const ecranMontee = enveloppeEcranAvant(promu, 1);
setMouvementsClubs({});

console.log('\n  ' + '─'.repeat(92));
console.log(`  Club promu (${promu}) : Régionale 3 → Régionale 1`);
console.log(`    store avant montée  ${avantMontee} €`);
console.log(`    store après montée  ${apresMontee} €   ← ce qui est facturé`);
console.log(`    écran après montée  ${ecranMontee} €   ← ce qui était affiché`);
// ── LE GARDE-FOU ───────────────────────────────────────────────────────────
// Les chiffres ci-dessus racontent le bug ; celui-ci empêche son retour. La
// règle n'est pas « les deux formules s'accordent » — c'est « il n'y a qu'une
// formule ». Tant que l'écran lit `budgetsDuClub`, l'écart ne peut plus exister.
import { readFileSync } from 'node:fs';

const ecranSrc = readFileSync(new URL('../src/screens/Manager.tsx', import.meta.url), 'utf8');
const libSrc = readFileSync(new URL('../src/lib/installations.ts', import.meta.url), 'utf8');

const litLeStore = /const enveloppe = manager\?\.club \? budgetsDuClub\(/.test(ecranSrc);
const raccourciRouvert = /export function budgetStructure\(/.test(libSrc);

console.log('\n  ' + '─'.repeat(92));
console.log(`  L'écran lit budgetsDuClub .................. ${litLeStore ? '✅ oui' : '❌ NON'}`);
console.log(`  Le raccourci budgetStructure() est refermé . ${raccourciRouvert ? '❌ ROUVERT' : '✅ oui'}`);

if (!litLeStore || raccourciRouvert) {
  console.log('\n  ❌ RÉGRESSION : deux définitions pour une même enveloppe.');
  console.log('     L\'écran doit lire budgetsDuClub(club, saison).structure, comme le store.\n');
  process.exit(1);
}
console.log('\n  ✅ Une seule définition de l\'enveloppe structure.\n');
