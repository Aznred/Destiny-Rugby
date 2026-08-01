import { useGame } from '../src/store/useGame';
import { SEMAINES_PAR_SAISON } from '../src/data/calendrier';
import { tirerBlessure, risqueDeBlessure } from '../src/lib/blessures';
const g = () => useGame.getState();
console.log('Risque par match (25 ans, forme 80, 70 min) :', (risqueDeBlessure({ age: 25, forme: 80, attributs: { endurance: 70 } } as never, 70) * 100).toFixed(1) + ' %');
console.log('Risque par match (34 ans, forme 40, 80 min) :', (risqueDeBlessure({ age: 34, forme: 40, attributs: { endurance: 60 } } as never, 80) * 100).toFixed(1) + ' %');
const grav: Record<string, number> = {};
for (let i = 0; i < 1000; i++) { const b = tirerBlessure(); grav[b.gravite] = (grav[b.gravite] ?? 0) + 1; }
console.log('Gravités sur 1000 tirages :', JSON.stringify(grav));

g().reinitialiser();
g().creerJoueur({ nom: 'Bobo', poste: 'troisieme_aile_d', nation: 'France', club: 'RC Vannes', division: 'top14', age: 29 });
useGame.setState({ joueur: { ...g().joueur!, attributs: { vitesse: 76, force: 78, endurance: 74, plaquage: 82, passe: 68, jeuAuPied: 55, vision: 72, mental: 76 }, reputation: 60 } });
let semainesBlesse = 0;
for (let s = 0; s < 3; s++) {
  for (let i = 0; i < SEMAINES_PAR_SAISON; i++) {
    g().semaineSuivante();
    if (g().joueur?.blessure) semainesBlesse++;
  }
  useGame.setState({ tropheesEnAttente: [], offres: [], offresOuvertes: false });
}
const j = g().joueur!;
console.log(`3 saisons : ${j.matchsJoues} matchs, ${semainesBlesse} semaines blessé, âge ${j.age}`);
console.log('  journal blessures :', g().journal.filter((e) => /Infirmerie|🚑/.test(e.titre ?? '') || /🚑/.test(e.texte)).slice(0, 3).map((e) => e.titre).join(' | ') || 'aucune');
g().prendreMentorat();
console.log('  mentorat :', g().joueur!.mentorat, '· moral', g().joueur!.moral);
g().prendreRetraite('consultant');
console.log('  panthéon :', JSON.stringify(g().pantheon.at(-1)!.reconversion), '· score', g().pantheon.at(-1)!.score);
