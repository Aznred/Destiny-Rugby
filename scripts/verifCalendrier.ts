// Une saison complète jouée SEMAINE PAR SEMAINE, puis 5 saisons enchaînées.
import { useGame } from '../src/store/useGame';
import { CALENDRIER, SEMAINES_PAR_SAISON } from '../src/data/calendrier';
const g = () => useGame.getState();

console.log(`Calendrier : ${SEMAINES_PAR_SAISON} semaines · ` +
  `${CALENDRIER.filter((s) => s.type === 'championnat').length} journées · ` +
  `${CALENDRIER.filter((s) => s.type === 'coupe').length} coupe · ` +
  `${CALENDRIER.filter((s) => s.type === 'international').length} internationales · ` +
  `${CALENDRIER.filter((s) => s.type === 'phaseFinale').length} phase finale`);

g().reinitialiser();
g().creerJoueur({ nom: 'Semaine Test', poste: 'ailier_droit', nation: 'France', club: 'RC Vannes', division: 'top14', age: 21 });
useGame.setState({ joueur: { ...g().joueur!, attributs: { vitesse: 78, force: 70, endurance: 74, plaquage: 70, passe: 72, jeuAuPied: 62, vision: 74, mental: 72 }, reputation: 55 } });

console.log('\n--- SAISON 1, semaine par semaine (extraits) ---');
for (let i = 0; i < SEMAINES_PAR_SAISON - 1; i++) {
  g().semaineSuivante();
  const e = g().journal.at(-1)!;
  if (i < 3 || /international|Coupe|FINALE|sélection/i.test(e.titre ?? '')) {
    console.log(`  ${e.titre} → ${e.texte.slice(0, 96)}`);
  }
}
const v = g().joueur!.saisonEnCours!;
console.log(`\n  bilan accumulé : ${v.matchs} matchs (${v.titularisations} titulaire), ${v.essais} essais, ` +
  `note moyenne ${(v.notes.reduce((a, b) => a + b, 0) / (v.notes.length || 1)).toFixed(2)}, ${v.capes} capes`);

g().semaineSuivante(); // trêve → clôture
const j = g().joueur!;
console.log(`  après clôture : saison ${j.saison}, ${j.matchsJoues} matchs, ${j.essais} essais, note ${j.noteSaison}/10, semaine ${j.semaine}`);
console.log('  ' + g().journal.slice(-6).map((e) => e.titre).filter(Boolean).join(' | '));

console.log('\n--- 6 SAISONS ENCHAÎNÉES (rythme semaine) ---');
for (let s = 0; s < 6; s++) {
  for (let i = 0; i < SEMAINES_PAR_SAISON; i++) g().semaineSuivante();
  let k = g().joueur!;
  // Ce test vérifie le calendrier, pas la négociation. Si le contrat arrive à
  // zéro, on le prolonge explicitement afin que la saison suivante puisse se
  // jouer sans ressusciter l'ancien panneau `offres/signerOffre`.
  if ((k.contrat?.saisons ?? 0) <= 0 && k.contrat) {
    k = { ...k, contrat: { ...k.contrat, saisons: 2 } };
    useGame.setState({ joueur: k });
  }
  useGame.setState({ tropheesEnAttente: [] });
  console.log(`  S${k.saison - 1} → ${k.club} (${k.division}) · ${k.matchsJoues} matchs · ${k.essais} essais · ` +
    `note ${k.noteSaison}/10 · ${k.selections ?? 0} capes · titres ${k.titres.length}`);
}
console.log('  mouvements enregistrés :', Object.keys(g().mouvementsClubs).length, 'clubs ont changé de division');
console.log('  exemples :', Object.entries(g().mouvementsClubs).slice(0, 4).map(([c, d]) => `${c}→${d}`).join(', '));

// Les feuilles complètes sont calculées en file de fond dans le navigateur.
// Le test attend la file afin de détecter les erreurs et de rendre la main.
await g().simulerStatsJournee();
