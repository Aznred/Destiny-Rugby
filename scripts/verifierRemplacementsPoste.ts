// UN REMPLAÇANT ENTRE À SON POSTE, PAS À CELUI DE SA PLACE SUR LE BANC — Correctif 33.
//
// Signalé en jeu : « les remplacements en ligue doivent rentrer au bon poste en fonction du mec sur le banc, pas par
// rapport au numéro ». La feuille de match donnait à chaque remplaçant le poste de son numéro (16 = talonneur,
// 17 = pilier…) : le moteur, qui apparie l'entrant au titulaire de son poste, faisait donc entrer un ailier assis à la
// place 16 en première ligne.
//
// Ce banc range le banc À L'ENVERS (les arrières aux places des avants, et inversement), joue des matchs entiers en
// ligue et en carrière d'entraîneur, et regarde où chaque remplaçant a réellement joué.
//
// Lancer : npm run verify:remplacements
import { conclureMatchEnLigne, creerMatchEnLigne, feuilleGeleeEnLigne, STRATEGIE_EN_LIGNE_DEFAUT } from '../src/lib/ligue/matchCarriere';
import { coequipierDepuisCarte, dotationBronzeCarriere } from '../src/lib/ligue/catalogueCarriere';
import { compositionManagerParDefaut, feuilleDepuisComposition, POSTES_BANC_MANAGER } from '../src/lib/compositionManager';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import type { Coequipier } from '../src/lib/effectif';
import { POSTE_PAR_ID } from '../src/data/rugby';
import type { CompositionManager } from '../src/types';

let controles = 0, echecs = 0;
function dire(ok: boolean, quoi: string, detail = '') {
  controles++;
  if (!ok) echecs++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${quoi}${detail ? ` — ${detail}` : ''}`);
}
const titre = (t: string) => console.log(`\n${t}`);
const famille = (poste: string) => POSTE_PAR_ID[poste as keyof typeof POSTE_PAR_ID]?.famille;
const avant = (poste: string) => POSTE_PAR_ID[poste as keyof typeof POSTE_PAR_ID]?.categorie === 'Avant';
/** Le banc retourné : les trois-quarts aux premières places (celles des avants), les avants aux dernières. */
const bancInverse = (c: CompositionManager): CompositionManager => ({ ...c, remplacants: [...c.remplacants].reverse() });

// ── 1. La feuille gelée ─────────────────────────────────────────────────────
titre('1. La feuille de match');
const cartesA = dotationBronzeCarriere('m', 'club-a', 'alea-a'), cartesB = dotationBronzeCarriere('m', 'club-b', 'alea-b');
const effectifA = cartesA.map(coequipierDepuisCarte), effectifB = cartesB.map(coequipierDepuisCarte);
const compoA = bancInverse(compositionManagerParDefaut(effectifA)), compoB = compositionManagerParDefaut(effectifB);
const naturel = new Map([...effectifA, ...effectifB].map(j => [j.id, j]));
{
  const feuille = feuilleGeleeEnLigne(effectifA, compoA);
  const banc = feuille.slice(15);
  dire(banc.length === 8 && banc.every(j => j.poste === naturel.get(j.id)!.poste), 'chaque remplaçant garde son propre poste sur la feuille', banc.map(j => j.poste).join(' · '));
  dire(banc.some((j, i) => j.poste !== POSTES_BANC_MANAGER[i]), 'le banc de ce scénario est bien rangé à l\'envers (sinon le banc ne prouverait rien)');
  dire(banc.every(j => j.note === naturel.get(j.id)!.note), 'et sa note n\'est plus rabotée pour une place qu\'il n\'occupe pas');
  const solo = feuilleDepuisComposition(effectifA, compoA).slice(15);
  dire(solo.every(j => j.poste === naturel.get(j.id)!.poste), 'même règle pour la feuille d\'un match d\'entraîneur');
}

// ── 2. Des matchs de ligue entiers ──────────────────────────────────────────
interface Entree { nom: string; naturel: string; joue: string }
function juger(entrees: Entree[], quoi: string) {
  const memeFamille = entrees.filter(x => famille(x.naturel) === famille(x.joue)).length;
  const contreEmploi = entrees.filter(x => avant(x.naturel) !== avant(x.joue));
  dire(entrees.length >= 8, `${quoi} : assez d'entrées pour juger`, `${entrees.length}`);
  dire(contreEmploi.length === 0, `${quoi} : AUCUN avant entré chez les arrières, aucun arrière entré devant`,
    contreEmploi.slice(0, 3).map(x => `${x.nom} (${x.naturel}) à ${x.joue}`).join(' ; '));
  dire(memeFamille / entrees.length >= 0.9, `${quoi} : les remplaçants entrent dans leur famille de poste`, `${memeFamille} sur ${entrees.length}`);
}
titre('2. Douze matchs de ligue, banc rangé à l\'envers');
{
  const equipe = (nom: string, effectif: Coequipier[], composition: CompositionManager) => ({ clubId: nom, nom, effectif, composition, strategie: STRATEGIE_EN_LIGNE_DEFAUT });
  const entrees: Entree[] = [];
  const bancA = new Set(compoA.remplacants);
  for (let n = 0; n < 12; n++) {
    const m = conclureMatchEnLigne(creerMatchEnLigne({ id: `remplacements-${n}`, domicile: equipe('Club A', effectifA, compoA), exterieur: equipe('Club B', effectifB, compoB), debut: Date.parse('2026-10-12T18:00:00Z'), graine: n * 7919 + 3 }));
    for (const l of m.feuille ?? []) {
      if (l.cote !== 'domicile' || !bancA.has(l.carteId) || l.minutes <= 0) continue;
      entrees.push({ nom: l.nom, naturel: naturel.get(l.carteId)!.poste, joue: l.poste });
    }
  }
  juger(entrees, 'ligue');
}

// ── 3. Des matchs d'entraîneur (le même moteur, la feuille solo) ─────────────
titre('3. Six matchs de carrière d\'entraîneur, banc rangé à l\'envers');
{
  const clubA = 'Stade Toulousain', clubB = 'RC Toulon';
  const eA = effectifDuClub(clubA, 1), eB = effectifDuClub(clubB, 1);
  const compo = bancInverse(compositionManagerParDefaut(eA));
  const feuille = feuilleDepuisComposition(eA, compo);
  const parId = new Map(eA.map(j => [j.id, j]));
  const banc = new Set(compo.remplacants);
  const entrees: Entree[] = [];
  for (let n = 0; n < 6; n++) {
    const e = creerMatch(clubA, clubB, eA, eB, 24, 18, `remplacements-solo-${n}`, undefined, { compositionA: feuille, capitaineAId: compo.capitaineId, buteurAId: compo.buteurId, scoreSurTerrain: true });
    let garde = 0;
    while (!e.fini && garde++ < 200000) avancer(e, 0.6);
    for (const p of e.pions) {
      if (p.cote !== 'A' || !banc.has(p.sourceId) || p.minutes <= 0) continue;
      entrees.push({ nom: p.nom, naturel: parId.get(p.sourceId)!.poste, joue: p.poste });
    }
  }
  juger(entrees, 'carrière');
}

console.log(`\n${controles - echecs}/${controles} contrôles${echecs ? ` — ${echecs} ÉCHEC(S)` : ''}`);
if (echecs) process.exit(1);
