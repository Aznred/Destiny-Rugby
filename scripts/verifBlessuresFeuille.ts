// ═══════════════════════════════════════════════════════════════════════════
// UN BLESSÉ NE RESTE PAS SUR LA FEUILLE DE MATCH
// ═══════════════════════════════════════════════════════════════════════════
// Retour de jeu : « on ne peut pas avoir un joueur blessé qui commence ou sur
// le banc ». La composition n'était réconciliée que si le manager avait
// DÉLÉGUÉ ce domaine : sinon la feuille sauvegardée gardait le blessé.
//
//   npx vite-node scripts/verifBlessuresFeuille.ts

import { compositionManagerParDefaut, reconcilerCompositionManager } from '../src/lib/compositionManager';
import { blessuresParJoueur } from '../src/lib/carriereAvancee';
import { effectifDuClub } from '../src/lib/effectif';
import { COMPETITIONS } from '../src/data/clubs';

let ko = 0;
const dire = (ok: boolean, quoi: string, detail = '') => {
  if (!ok) ko++;
  console.log(`  ${ok ? '✅' : '❌'} ${quoi.padEnd(54)} ${detail}`);
};
const nomDe = (c: unknown) => (typeof c === 'string' ? c : (c as { nom: string }).nom);

const club = nomDe(COMPETITIONS.find((c) => c.id === 'top14')!.clubs[0]);
const groupe = effectifDuClub(club, 1);
const compo = compositionManagerParDefaut(groupe);
const feuille = () => [...compo.titulaires, ...compo.remplacants];

// trois titulaires se blessent
const blesses = compo.titulaires.slice(0, 3);
const absents = new Set(blesses);

dire(feuille().filter((id) => absents.has(id)).length === 3,
  'départ : les trois blessés sont bien titulaires', `${blesses.length}`);

// 1. la feuille par défaut ne les prend plus
const parDefaut = compositionManagerParDefaut(groupe, absents);
const surDefaut = [...parDefaut.titulaires, ...parDefaut.remplacants].filter((id) => absents.has(id));
dire(surDefaut.length === 0, 'feuille par défaut : aucun blessé retenu',
  surDefaut.length ? `${surDefaut.length} encore présent(s)` : 'aucun');
dire(parDefaut.titulaires.length === 15, 'et le XV est complet', `${parDefaut.titulaires.length} titulaires`);

// 2. la réconciliation évince les blessés d'une feuille EXISTANTE
const reconcilie = reconcilerCompositionManager(groupe, compo, absents);
const surReconcilie = [...reconcilie.titulaires, ...reconcilie.remplacants].filter((id) => absents.has(id));
dire(surReconcilie.length === 0, 'réconciliation : les blessés sont évincés',
  surReconcilie.length ? `${surReconcilie.length} encore présent(s)` : 'aucun');
dire(reconcilie.titulaires.length === 15, 'et le XV reste complet', `${reconcilie.titulaires.length} titulaires`);

// 3. les choix du manager sur les autres postes sont préservés
const gardes = compo.titulaires.slice(3).filter((id) => reconcilie.titulaires.includes(id));
dire(gardes.length === compo.titulaires.length - 3,
  'les autres choix du manager sont conservés', `${gardes.length}/${compo.titulaires.length - 3}`);

// 4. le capitaine blessé est remplacé
const compoCap = { ...compo, capitaineId: blesses[0] };
const r2 = reconcilerCompositionManager(groupe, compoCap, absents);
dire(r2.capitaineId !== blesses[0] && !!r2.capitaineId,
  'un capitaine blessé cède le brassard', r2.capitaineId ? 'remplacé' : 'AUCUN CAPITAINE');

// 5. blessuresParJoueur retient le dossier le plus long
const map = blessuresParJoueur([
  { joueurId: 'x', semaines: 2, gravite: 'legere', type: 'A' },
  { joueurId: 'x', semaines: 9, gravite: 'grave', type: 'B' },
] as never);
dire(map.get('x')?.semaines === 9, 'deux dossiers : le plus long l’emporte', `${map.get('x')?.semaines} semaines`);

console.log(`\n  ${ko === 0 ? '✅ Aucun blessé ne peut être aligné.' : `❌ ${ko} contrôle(s) en échec.`}\n`);
process.exit(ko === 0 ? 0 : 1);
