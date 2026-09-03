// ═══════════════════════════════════════════════════════════════════════════
// CHASSE AUX BUGS — les invariants de la carrière JOUEUR, semaine par semaine
// ═══════════════════════════════════════════════════════════════════════════
// On ne mesure pas un équilibrage ici : on cherche ce qui NE DOIT JAMAIS
// ARRIVER. Une note à 137, un solde négatif, un joueur qui rajeunit, une
// semaine qui recule, un NaN. Chaque carrière est pilotée par le VRAI store.
//
//   npx vite-node scripts/_chasse.ts

import { useGame, AGE_RETRAITE_FORCEE } from '../src/store/useGame';
import { COMPETITIONS } from '../src/data/clubs';
import { POSTES } from '../src/data/rugby';
import type { Joueur } from '../src/types';

const nomDe = (c: unknown) => (typeof c === 'string' ? c : (c as { nom: string }).nom);
const store = useGame.getState();

type Bug = { quoi: string; ou: string; detail: string };
const bugs: Bug[] = [];
const vus = new Set<string>();
function bug(quoi: string, ou: string, detail: string) {
  const cle = `${quoi}|${detail.slice(0, 60)}`;
  if (vus.has(cle)) return;           // un même défaut ne compte qu'une fois
  vus.add(cle);
  bugs.push({ quoi, ou, detail });
}

const ATTRIBUTS = ['vitesse', 'force', 'endurance', 'plaquage', 'passe', 'jeuAuPied', 'vision', 'mental'] as const;
const JAUGES = ['forme', 'moral', 'reputation'] as const;

/** Tout ce qu'un joueur ne doit jamais être. */
function controler(j: Joueur, ou: string, precedent?: Joueur) {
  const fini = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

  for (const a of ATTRIBUTS) {
    const v = (j.attributs as Record<string, number>)[a];
    if (!fini(v)) bug('attribut non fini', ou, `${a} = ${v}`);
    else if (v < 0 || v > 100) bug('attribut hors bornes 0-100', ou, `${a} = ${v}`);
  }
  for (const g of JAUGES) {
    const v = (j as unknown as Record<string, number>)[g];
    if (!fini(v)) bug('jauge non finie', ou, `${g} = ${v}`);
    else if (v < 0 || v > 100) bug('jauge hors bornes 0-100', ou, `${g} = ${v}`);
  }
  if (!fini(j.argent)) bug('argent non fini', ou, `${j.argent}`);
  else if (j.argent < 0) bug('argent négatif', ou, `${j.argent} €`);

  if (!fini(j.age)) bug('âge non fini', ou, `${j.age}`);
  else if (j.age < 15 || j.age > AGE_RETRAITE_FORCEE + 1) bug('âge aberrant', ou, `${j.age} ans`);

  for (const [cle, v] of Object.entries(j.carriere ?? {})) {
    if (typeof v === 'number' && v < 0) bug('statistique de carrière négative', ou, `${cle} = ${v}`);
  }
  for (const [cle, v] of Object.entries(j.saisonEnCours ?? {})) {
    if (typeof v === 'number' && v < 0) bug('statistique de saison négative', ou, `${cle} = ${v}`);
  }

  if (j.contrat && j.contrat.saisonsRestantes < 0) {
    bug('contrat à durée négative', ou, `${j.contrat.saisonsRestantes} saison(s)`);
  }
  if (j.contrat && !fini(j.contrat.salaire)) bug('salaire non fini', ou, `${j.contrat.salaire}`);
  if (j.contrat && j.contrat.salaire < 0) bug('salaire négatif', ou, `${j.contrat.salaire} €`);

  // Le club doit exister quelque part dans le monde du jeu.
  if (j.club && !COMPETITIONS.some((c) => c.clubs.some((k) => nomDe(k) === j.club))) {
    bug('club inconnu du monde', ou, `« ${j.club} »`);
  }

  if (precedent) {
    if (j.age < precedent.age) bug('le joueur rajeunit', ou, `${precedent.age} → ${j.age}`);
    if (j.saison < precedent.saison) bug('la saison recule', ou, `${precedent.saison} → ${j.saison}`);
    for (const cle of ['matchsJoues', 'essais'] as const) {
      const av = (precedent.carriere as Record<string, number>)?.[cle] ?? 0;
      const ap = (j.carriere as Record<string, number>)?.[cle] ?? 0;
      if (ap < av) bug('compteur de carrière qui recule', ou, `${cle} : ${av} → ${ap}`);
    }
  }
}

// ── LE BALAYAGE ────────────────────────────────────────────────────────────
const DIVISIONS = ['top14', 'prod2', 'nationale', 'nationale2', 'fed1', 'fed3', 'reg1', 'reg3'];
const CARRIERES = 24;
const SAISONS = 14;

console.log(`\n  Chasse : ${CARRIERES} carrières × ${SAISONS} saisons, contrôle à chaque semaine.\n`);

for (let n = 0; n < CARRIERES; n++) {
  const divId = DIVISIONS[n % DIVISIONS.length];
  const comp = COMPETITIONS.find((c) => c.id === divId);
  if (!comp?.clubs?.length) continue;
  const club = nomDe(comp.clubs[n % comp.clubs.length]);
  const poste = POSTES[n % POSTES.length].id;
  const age = 17 + (n % 6);

  store.reinitialiser();
  store.creerJoueur({
    nom: `Chasse ${n}`, poste, nation: 'France', club, division: divId, age, traits: [],
  });

  let precedent = useGame.getState().joueur!;
  controler(precedent, `création · ${comp.nom}`);

  for (let s = 0; s < SAISONS; s++) {
    const j0 = useGame.getState().joueur;
    if (!j0) break;
    // on joue la saison semaine par semaine
    for (let sem = 0; sem < 54; sem++) {
      const avant = useGame.getState().joueur;
      if (!avant) break;
      store.semaineSuivante();
      const apres = useGame.getState().joueur;
      if (!apres) break;
      controler(apres, `S${apres.saison} sem.${apres.semaine} · ${comp.nom}`, precedent);
      precedent = apres;
      if (apres.saison !== avant.saison) break;   // la saison a tourné
    }
    const j = useGame.getState().joueur;
    if (!j || j.age >= AGE_RETRAITE_FORCEE) break;
  }

  // Les Ovas ne descendent jamais sous zéro.
  const fin = useGame.getState();
  if (typeof fin.coins === 'number' && fin.coins < 0) {
    bug('solde d’Ovas négatif', `carrière ${n}`, `${fin.coins}`);
  }
}

// ── RAPPORT ────────────────────────────────────────────────────────────────
console.log('  ' + '─'.repeat(88));
if (!bugs.length) {
  console.log('  ✅ Aucun invariant violé sur les carrières balayées.\n');
} else {
  console.log(`  ❌ ${bugs.length} défaut(s) distinct(s) :\n`);
  for (const b of bugs) {
    console.log(`  · ${b.quoi}`);
    console.log(`      ${b.detail}`);
    console.log(`      vu à : ${b.ou}`);
  }
  console.log();
}
process.exit(0);
