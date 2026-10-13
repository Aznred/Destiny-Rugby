// SONDE DES COUPS DE PIED DE L'IA — Correctif 40. Sur des matchs entiers : quels coups de pied passent par l'action unique
// du niveau 8, lesquels gardent le placement d'avant (ballon au sol, renvoi), et combien d'armés chacun a demandés.
//
//   npx vite-node scripts/sonderFrappesIA40.ts [matchs]
//   IA_EMPREINTE=7 npx vite-node scripts/sonderFrappesIA40.ts
import { avancer, DT } from '../src/lib/moteur/moteur';
import { creerMatchDEmpreinte } from './outilsEmpreinte';

const N = Number(process.argv[2] ?? 6);
const GESTES = new Set(['grubber', 'chip', 'punt', 'box_kick', 'drop', 'restart']);
interface Ligne { n: number; armes: number; partis: number; abandonnes: number; duree: number[] }
const parSorte = new Map<string, Ligne>();
const ligne = (cle: string) => { let l = parSorte.get(cle); if (!l) { l = { n: 0, armes: 0, partis: 0, abandonnes: 0, duree: [] }; parSorte.set(cle, l); } return l; };

for (let k = 0; k < N; k++) {
  // Sans joueur conduit : ce sont les coups de pied de l'IA qu'on regarde.
  const e = creerMatchDEmpreinte(k);
  let enCours: { cle: string; debut: number; auteurId: string; vus: Set<string> } | null = null;
  let garde = 0;
  while (!e.fini && garde++ < 200000) {
    avancer(e, DT);
    const p = e.piedPrepare;
    if (p && (!enCours || enCours.debut !== p.debut || enCours.auteurId !== p.auteurId)) {
      const auteur = e.pions.find((q) => q.id === p.auteurId)!;
      const sorte = `${p.id !== undefined ? 'action unique' : 'placement    '} · ${p.intention.padEnd(18)} · ${p.avaitBallon ? 'ballon en main' : 'ballon au sol '} · ${auteur.numero === 9 ? 'n° 9' : 'autre'}`;
      enCours = { cle: sorte, debut: p.debut ?? e.sim, auteurId: p.auteurId, vus: new Set() };
      ligne(sorte).n++;
    }
    if (enCours) {
      for (const g of e.gestes ?? []) if (g.joueurId === enCours.auteurId && GESTES.has(g.clip) && g.debut >= enCours.debut - 1.5 && !enCours.vus.has(g.id)) { enCours.vus.add(g.id); ligne(enCours.cle).armes++; }
      if (!e.piedPrepare) {
        const l = ligne(enCours.cle);
        if (e.vol?.type === 'pied' && e.vol.auteur.id === enCours.auteurId) { l.partis++; l.duree.push(e.sim - enCours.debut); } else l.abandonnes++;
        enCours = null;
      }
    }
  }
}
console.log(`Niveau d'IA ${process.env.IA_EMPREINTE ?? '(carrière)'} — ${N} matchs\n`);
console.log('sorte                                                              demandes  armés  partis  abandonnés  demande→départ (moy / max)');
for (const [cle, l] of [...parSorte].sort((a, b) => b[1].n - a[1].n)) {
  const moy = l.duree.length ? l.duree.reduce((n, x) => n + x, 0) / l.duree.length : NaN;
  console.log(`${cle.padEnd(66)} ${String(l.n).padStart(6)} ${String(l.armes).padStart(6)} ${String(l.partis).padStart(7)} ${String(l.abandonnes).padStart(9)}      ${moy.toFixed(2)} s / ${(l.duree.length ? Math.max(...l.duree) : NaN).toFixed(2)} s`);
}
