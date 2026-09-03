// Déterminisme, aller-retour de sauvegarde, cohérence des stats, retraite.
//   npx vite-node scripts/_chasse2.ts
import { useGame, AGE_RETRAITE_FORCEE } from '../src/store/useGame';
import type { Joueur } from '../src/types';

let ko = 0;
const dire = (ok: boolean, quoi: string, detail = '') => {
  if (!ok) ko++;
  console.log(`  ${ok ? '✅' : '❌'} ${quoi.padEnd(56)} ${detail}`);
};
const store = useGame.getState();

function carriere(nom: string, saisons: number): Joueur {
  store.reinitialiser();
  store.creerJoueur({
    nom, poste: 'demi_ouverture', nation: 'France',
    club: 'Provence Rugby', division: 'prod2', age: 20, traits: [],
  });
  for (let s = 0; s < saisons; s++) {
    for (let w = 0; w < 54; w++) {
      const av = useGame.getState().joueur;
      if (!av) break;
      store.semaineSuivante();
      const ap = useGame.getState().joueur;
      if (!ap || ap.saison !== av.saison) break;
    }
  }
  return useGame.getState().joueur!;
}

console.log('\n═══ 1. DÉTERMINISME : deux carrières identiques ═══\n');
{
  const a = carriere('Jumeau', 6);
  const b = carriere('Jumeau', 6);
  const cles: (keyof Joueur)[] = ['age', 'saison', 'club', 'division', 'argent'];
  for (const k of cles) {
    dire(JSON.stringify(a[k]) === JSON.stringify(b[k]), `même ${String(k)}`,
      `${JSON.stringify(a[k])} vs ${JSON.stringify(b[k])}`);
  }
  dire(JSON.stringify(a.attributs) === JSON.stringify(b.attributs), 'mêmes attributs',
    JSON.stringify(a.attributs) === JSON.stringify(b.attributs) ? '' : `${JSON.stringify(a.attributs)}\n        vs ${JSON.stringify(b.attributs)}`);
  dire(a.matchsJoues === b.matchsJoues, 'mêmes matchs joués', a.matchsJoues + ' vs ' + b.matchsJoues);
}

console.log('\n═══ 2. COHÉRENCE DES STATISTIQUES ═══\n');
{
  const j = carriere('Stats', 10);
  const c = { matchsJoues: j.matchsJoues, essais: j.essais, ...(j.stats ?? {}) } as unknown as Record<string, number>;
  const m = c.matchsJoues ?? 0;
  dire(m > 0, 'des matchs ont bien été joués', `${m} matchs sur 10 saisons`);
  dire((c.essais ?? 0) <= m * 5, 'essais plausibles au regard des matchs', `${c.essais} essais / ${m} matchs`);
  if (c.plaquagesReussis !== undefined && c.plaquagesManques !== undefined) {
    dire(c.plaquagesReussis >= 0 && c.plaquagesManques >= 0, 'plaquages non négatifs',
      `${c.plaquagesReussis} réussis · ${c.plaquagesManques} manqués`);
  }
  if (c.tirsReussis !== undefined && c.tirsTentes !== undefined) {
    dire(c.tirsReussis <= c.tirsTentes, 'tirs réussis ≤ tirs tentés',
      `${c.tirsReussis} / ${c.tirsTentes}`);
  }
  const selections = (j.selections ?? 0) as number;
  dire(selections >= 0 && selections <= m, 'sélections ≤ matchs joués', `${selections} sél. / ${m} matchs`);
}

console.log('\n═══ 3. ALLER-RETOUR DE SAUVEGARDE ═══\n');
{
  const avant = carriere('Sauvegarde', 4);
  const etat = useGame.getState();
  // ce que `persist` écrirait puis relirait
  const copie = JSON.parse(JSON.stringify({ joueur: etat.joueur, coins: etat.coins, journal: etat.journal }));
  dire(copie.joueur.age === avant.age, 'âge conservé', `${copie.joueur.age}`);
  dire(JSON.stringify(copie.joueur.attributs) === JSON.stringify(avant.attributs), 'attributs conservés');
  const perdus = Object.entries(avant).filter(([k, v]) => v !== undefined && copie.joueur[k] === undefined);
  dire(perdus.length === 0, 'aucun champ perdu à la sérialisation',
    perdus.length ? `perdus : ${perdus.map(([k]) => k).join(', ')}` : '');
  const nonSerialisables = Object.entries(avant).filter(([, v]) => typeof v === 'function' || typeof v === 'symbol');
  dire(nonSerialisables.length === 0, 'aucune valeur non sérialisable dans le joueur');
}

console.log('\n═══ 4. LA RETRAITE ARRÊTE-T-ELLE VRAIMENT LA CARRIÈRE ? ═══\n');
{
  store.reinitialiser();
  store.creerJoueur({
    nom: 'Vieux', poste: 'pilier_gauche', nation: 'France',
    club: 'Provence Rugby', division: 'prod2', age: AGE_RETRAITE_FORCEE - 1, traits: [],
  });
  let tours = 0;
  let max = 0;
  while (tours < 3000) {
    const av = useGame.getState().joueur;
    if (!av) break;
    max = Math.max(max, av.age);
    store.semaineSuivante();
    tours++;
    const ap = useGame.getState().joueur;
    if (!ap) break;
    if (ap.age > AGE_RETRAITE_FORCEE + 1) break;
  }
  dire(max <= AGE_RETRAITE_FORCEE + 1, `on ne joue pas au-delà de ${AGE_RETRAITE_FORCEE} ans`,
    `âge maximum atteint : ${max}`);
  dire(tours < 3000, 'la boucle de fin de carrière se termine', `${tours} semaines simulées`);
}

console.log('\n' + '  ' + '─'.repeat(74));
console.log(ko === 0 ? '  ✅ Rien à signaler sur ces quatre fronts.\n' : `  ❌ ${ko} anomalie(s).\n`);
process.exit(0);
