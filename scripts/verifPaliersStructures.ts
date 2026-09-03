// ═══════════════════════════════════════════════════════════════════════════
// LES STRUCTURES ONT UN PRIX FIXE — ET LA RÉGIONALE PLAFONNE BAS
// ═══════════════════════════════════════════════════════════════════════════
// Retour de jeu : « les structures n'ont pas de prix fixe et augmentent en
// fonction du championnat, donc impossible de les augmenter ; fais plutôt des
// paliers, le prix est fixe mais un club de Régionale ne pourra jamais avoir le
// meilleur ».
//
//   npx vite-node scripts/verifPaliersStructures.ts

import { coutAmelioration, NIVEAU_INSTALLATION_MAX } from '../src/lib/installations';
import { budgetsDuClub } from '../src/lib/recrutementManager';
import { COMPETITIONS } from '../src/data/clubs';

let ko = 0;
const dire = (ok: boolean, quoi: string, detail = '') => {
  if (!ok) ko++;
  console.log(`  ${ok ? '✅' : '❌'} ${quoi.padEnd(52)} ${detail}`);
};
const nomDe = (c: unknown) => (typeof c === 'string' ? c : (c as { nom: string }).nom);

// ── 1. le prix ne dépend PLUS du club ──────────────────────────────────────
console.log('\n  1. Le prix d’une marche est-il le même pour tout le monde ?\n');
const prix = [0, 1, 2, 3].map((n) => coutAmelioration(n));
console.log(`     marches : ${prix.map((p) => (p ?? 0).toLocaleString('fr-FR') + ' €').join(' · ')}`);
dire(coutAmelioration(NIVEAU_INSTALLATION_MAX) === null, 'la 5e marche n’existe pas', 'null');
dire(prix.every((p, i) => i === 0 || (p ?? 0) > (prix[i - 1] ?? 0)), 'les paliers sont croissants');

// ── 2. combien de saisons d'épargne par étage ──────────────────────────────
console.log('\n  2. Saisons d’enveloppe nécessaires, par étage :\n');
console.log('     étage         enveloppe/an       N1     N2      N3       N4   plafond');
console.log('     ' + '─'.repeat(76));
const attendu: Record<string, number> = {
  top14: 4, prod2: 4, nationale: 3, nationale2: 2, fed1: 2, reg1: 1, reg3: 1,
};
for (const id of ['top14', 'prod2', 'nationale', 'nationale2', 'fed1', 'reg1', 'reg3']) {
  const comp = COMPETITIONS.find((c) => c.id === id);
  if (!comp?.clubs?.length) continue;
  const club = nomDe(comp.clubs[0]);
  const env = budgetsDuClub(club, 1).structure;
  // « atteignable » = moins de 8 saisons d'épargne pour cette marche
  const saisons = [1, 2, 3, 4].map((n) => (env > 0 ? (coutAmelioration(n - 1) ?? 0) / env : Infinity));
  let plafond = 0;
  for (let n = 0; n < 4; n++) if (saisons[n] <= 8) plafond = n + 1;
  console.log(
    `     ${comp.nom.padEnd(13)} ${(env.toLocaleString('fr-FR') + ' €').padStart(13)}  ${saisons.map((s) => s.toFixed(1).padStart(6)).join(' ')}   ${plafond}`,
  );
  dire(plafond === attendu[id], `  ${comp.nom} plafonne au niveau ${attendu[id]}`, `mesuré ${plafond}`);
}

// ── 3. la Régionale n'atteint JAMAIS la dernière marche ────────────────────
console.log('\n  3. La dernière marche est-elle hors de portée en Régionale ?\n');
for (const id of ['reg1', 'reg2', 'reg3']) {
  const comp = COMPETITIONS.find((c) => c.id === id);
  if (!comp?.clubs?.length) continue;
  const club = nomDe(comp.clubs[0]);
  const env = budgetsDuClub(club, 1).structure;
  const saisons = env > 0 ? (coutAmelioration(3) ?? 0) / env : Infinity;
  dire(saisons > 100, `${comp.nom} : dernière marche hors d’atteinte`, `${saisons.toFixed(0)} saisons`);
}

// ── 4. LE RACCOURCI RESTE REFERMÉ ──────────────────────────────────────────
// Cette garde vient de `verifEnveloppeStructure.ts`, retiré avec ce lot : le
// prix ne lisant plus l'enveloppe, il ne peut plus y avoir deux formules qui
// divergent. Mais `budgetStructure(force, niveau)` doit rester fermé — c'est
// lui qui avait créé l'écart d'origine (5 étages sur 8, 125 000 € affichés
// contre 315 000 € facturés).
import { readFileSync } from 'node:fs';
{
  console.log('\n  4. Le raccourci budgetStructure() est-il toujours refermé ?\n');
  const lib = readFileSync(new URL('../src/lib/installations.ts', import.meta.url), 'utf8');
  dire(!/export function budgetStructure\(/.test(lib),
    'aucun raccourci d’enveloppe dans installations.ts',
    'la seule source reste budgetsDuClub');
  dire(/const PRIX_PAR_NIVEAU/.test(lib),
    'le prix vient bien d’une table de paliers', 'PRIX_PAR_NIVEAU');
}


console.log(`\n  ${ko === 0 ? '✅ Paliers fixes, hiérarchie tenue par le tarif.' : `❌ ${ko} contrôle(s) en échec.`}\n`);
process.exit(ko === 0 ? 0 : 1);
