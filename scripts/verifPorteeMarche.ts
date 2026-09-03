// ═══════════════════════════════════════════════════════════════════════════
// LA PORTÉE DU MARCHÉ — un club doit toujours pouvoir recruter chez lui
// ═══════════════════════════════════════════════════════════════════════════
// Retour de jeu : « je suis en Nationale 2, je ne peux pas recruter des joueurs
// de Nationale 2 ou de la ligue juste au-dessus, même les moins bons ou fin de
// carrière ».
//
// `porteeSportive` n'ancrait son plafond que sur `forceDuGroupe` — la moyenne
// des 23 meilleurs de SON effectif. Or on la comparait à une note INDIVIDUELLE,
// et le meilleur joueur d'une poule est toujours loin au-dessus de la moyenne
// de cette poule. Tout club plus faible que son étage — donc tout promu — se
// retrouvait enfermé :
//
//   groupe 45 en Nationale 2 → plafond 49 →  1 % de sa PROPRE division
//   groupe 50                → plafond 54 → 10 %  (40 % en vétéran libre)
//
// On montait de division, on avait besoin de renforts, et la règle interdisait
// tout recrutement. Le plafond s'ancre désormais sur le PLUS HAUT des deux :
// son groupe, ou la référence de sa division.
//
// Ce banc tient les deux bouts : la hiérarchie de la pyramide (une Régionale 3
// ne signe pas une star) ET l'accès au marché de son propre étage.
//
//   npx vite-node scripts/verifPorteeMarche.ts

import { COMPETITIONS } from '../src/data/clubs';
import { porteeSportive, forceDuGroupe } from '../src/lib/recrutementManager';
import { effectifDuClub, forceMoyenneDivision } from '../src/lib/effectif';

const nomDe = (c: unknown) => (typeof c === 'string' ? c : (c as { nom: string }).nom);
const S = 1;
type Cible = { note: number; age: number; club: string; situation: 'sousContrat' };

const ETAGES = ['reg3', 'fed3', 'nationale2', 'nationale', 'prod2', 'top14'];

let echecs = 0;
const dire = (ok: boolean, texte: string) => {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${texte}`);
};

// ── 1. SA PROPRE DIVISION RESTE ACCESSIBLE, QUELLE QUE SOIT SA FORCE ────────
console.log('\n  1. Le club le plus faible d\'une poule accède-t-il à sa poule ?\n');
for (const id of ETAGES) {
  const comp = COMPETITIONS.find((c) => c.id === id);
  if (!comp?.clubs?.length) continue;

  const cibles: Cible[] = [];
  for (const c of comp.clubs.slice(0, 10)) {
    for (const j of effectifDuClub(nomDe(c), S)) {
      cibles.push({ note: j.note, age: j.age, club: nomDe(c), situation: 'sousContrat' });
    }
  }
  const faible = comp.clubs.map((c) => nomDe(c))
    .map((c) => ({ c, f: forceDuGroupe(c, S) }))
    .sort((a, b) => a.f - b.f)[0];

  const ok = cibles.filter((x) => porteeSportive(x, faible.c, S).aPortee).length;
  const pc = Math.round(ok / cibles.length * 100);
  dire(pc >= 60, `${comp.nom.padEnd(12)} ${faible.c.slice(0, 22).padEnd(23)} groupe ${faible.f.toFixed(0).padStart(2)} · réf ${forceMoyenneDivision(id, S).toFixed(0).padStart(2)} → ${String(pc).padStart(3)} % de sa poule à portée`);
}

// ── 2. LA HIÉRARCHIE DE LA PYRAMIDE TIENT TOUJOURS ─────────────────────────
console.log('\n  2. La pyramide tient-elle ? (meilleure recrue possible par étage)\n');
const marche: Cible[] = [];
for (const id of ['top14', 'prod2', 'nationale', 'nationale2', 'fed1', 'fed3', 'reg1', 'reg3']) {
  const comp = COMPETITIONS.find((c) => c.id === id);
  for (const c of (comp?.clubs ?? []).slice(0, 6)) {
    for (const j of effectifDuClub(nomDe(c), S).slice(0, 12)) {
      marche.push({ note: j.note, age: j.age, club: nomDe(c), situation: 'sousContrat' });
    }
  }
}
const plafondsAttendus: Record<string, number> = {
  reg3: 50, fed3: 58, nationale2: 76, nationale: 72, prod2: 82, top14: 100,
};
let precedent = 0;
for (const id of ETAGES) {
  const comp = COMPETITIONS.find((c) => c.id === id);
  if (!comp?.clubs?.length) continue;
  const club = nomDe(comp.clubs[0]);
  const ok = marche.filter((c) => porteeSportive(c, club, S).aPortee);
  const best = ok.length ? Math.max(...ok.map((c) => c.note)) : 0;
  dire(best <= plafondsAttendus[id],
    `${comp.nom.padEnd(12)} meilleure recrue ${String(best).padStart(3)} (limite ${plafondsAttendus[id]})`);
  precedent = best;
}
void precedent;

// ── 3. UN VÉTÉRAN EN FIN DE CARRIÈRE DESCEND VRAIMENT ──────────────────────
console.log('\n  3. Un vétéran de 34 ans, libre, est-il plus accessible qu\'un cadre ?\n');
{
  const club = nomDe(COMPETITIONS.find((c) => c.id === 'nationale2')!.clubs[0]);
  const base = marche.map((c) => ({ ...c }));
  const cadres = base.filter((c) => porteeSportive({ ...c, age: 27, situation: 'sousContrat' }, club, S).aPortee).length;
  const vets = base.filter((c) => porteeSportive({ ...c, age: 34, situation: 'libre' }, club, S).aPortee).length;
  dire(vets > cadres, `cadres 27 ans : ${cadres} · vétérans libres 34 ans : ${vets} (doit être supérieur)`);
}

console.log(`\n  ${echecs === 0 ? '✅ Tout est vert.' : `❌ ${echecs} contrôle(s) en échec.`}\n`);
process.exit(echecs === 0 ? 0 : 1);
