// MESURE DU CORRECTIF 30 — ce que le jeu physique produit de RARE, sur beaucoup de matchs (le banc `verify:animations` en
// joue une douzaine avec un contrôle à chaque pas ; ici on en joue cent sans rien vérifier, pour compter).
//
//   npm run mesure:animations -- 144            (matchs de carrière en trois dimensions, niveau d'IA 6)
//   npm run mesure:animations -- 144 60         (… avec une température de match forcée à 60 : un match tendu)
//
// On y lit : plaquages dangereux par match et par type (soulevé, charge, haut, en retard), leur sanction (non vu, pénalité,
// jaune, rouge), altercations par match, par niveau, par cause et par sanction, et les séquences de grattage.
import { avancer } from '../src/lib/moteur/moteur';
import { creerMatchDEmpreinte } from './outilsEmpreinte';

const N = Math.max(1, Number(process.argv[2] ?? 144));
const TENSION = process.argv[3] ? Number(process.argv[3]) : undefined;
const compte = new Map<string, number>();
const plus = (k: string, n = 1) => compte.set(k, (compte.get(k) ?? 0) + n);
let avecAltercation = 0, points = 0, essais = 0, jaunes = 0, rouges = 0;
for (let k = 0; k < N; k++) {
  const e = creerMatchDEmpreinte(k, { ia: 6 });
  let altercation: unknown = null, duel: unknown = null, garde = 0, vue = false;
  const gestes = new Set<string>();
  while (!e.fini && garde++ < 400000) {
    // Un match « tendu » : la température ne redescend pas sous le plancher demandé (derby, fin de saison, rivalité).
    if (TENSION !== undefined && e.tension < TENSION) e.tension = TENSION;
    avancer(e, 0.15);
    for (const g of e.gestes ?? []) {
      if (gestes.has(g.id)) continue;
      gestes.add(g.id);
      if (g.clip === 'foul_tip') plus('dangereux soulevé (' + (g.variante?.split(':')[1] ?? '?') + ')');
      else if (g.clip === 'foul_charge') plus('dangereux charge sans les bras');
      else if (g.clip === 'foul_high') plus('dangereux plaquage haut');
      else if (g.clip === 'foul_late') plus('dangereux plaquage en retard');
    }
    if (e.altercation && e.altercation !== altercation) {
      altercation = e.altercation; vue = true;
      plus('altercation'); plus('altercation niveau ' + e.altercation.niveau); plus('altercation cause ' + e.altercation.cause); plus('altercation → ' + e.altercation.sanction);
    }
    const d = e.ruck?.duel ?? null;
    if (d !== duel) { duel = d; if (d) plus(d.type === 'gratte' ? 'grattage ' + d.sequence : 'contre-ruck ' + d.variante + ' (' + d.issue + ')'); }
  }
  if (vue) avecAltercation++;
  points += e.scoreA + e.scoreB; essais += e.essaisA + e.essaisB;
  for (const p of e.pions) { jaunes += p.stats.cartonsJaunes; rouges += p.stats.cartonsRouges; }
}
console.log(`══ ${N} matchs de carrière 3D, niveau 6${TENSION !== undefined ? `, température plancher ${TENSION}` : ''}`);
console.log(`  ${(points / N).toFixed(1)} points et ${(essais / N).toFixed(1)} essais par match ; ${(jaunes / N).toFixed(2)} jaune(s), ${(rouges / N).toFixed(2)} rouge(s)`);
console.log(`  matchs avec au moins une altercation : ${avecAltercation}/${N} (un sur ${avecAltercation ? (N / avecAltercation).toFixed(1) : '∞'})`);
for (const [k, n] of [...compte].sort((a, b) => a[0].localeCompare(b[0]))) console.log(`  ${k.padEnd(44)} ${(n / N).toFixed(3)} par match (${n})`);
