// Vérification SANS NAVIGATEUR de ce que les écrans vont afficher :
// données des coupes d'Europe, arbre des phases finales, robustesse du Hall et
// du Classement face à une sauvegarde abîmée.
import { coupeEnDirect, coupesDuClub } from '../src/lib/coupe';
import { phaseFinale } from '../src/lib/phaseFinale';
import { championnatEnDirect, nombreJournees } from '../src/lib/championnat';
import { COUPES_EUROPE } from '../src/data/mondeReel';
import { COMPETITIONS } from '../src/data/clubs';
import { POSTE_PAR_ID, migrerPoste } from '../src/data/rugby';
import { nomNation } from '../src/lib/nations';
import { LEGENDES_FICTIVES } from '../src/data/legendes';

const SAISON = 1;
const CLUB = 'Stade Toulousain';

console.log('=== COUPES D’EUROPE ===');
console.log('Coupes de', CLUB, ':', coupesDuClub(CLUB).join(', ') || 'aucune');
for (const c of COUPES_EUROPE) {
  const fin = coupeEnDirect(c.id, SAISON, CLUB, 99);
  if (!fin) { console.log('  ✗', c.nom, '— pas assez de clubs'); continue; }
  const tailles = fin.poules.map((p) => p.clubs.length).join('/');
  console.log(
    `  ${c.emoji} ${c.nom} : ${fin.poules.length} poules (${tailles}), ` +
    `${fin.totalJournees} journées, ${fin.bracket.length} matchs à élimination directe, ` +
    `vainqueur ${fin.vainqueur}`,
  );
  const tours = [...new Set(fin.bracket.map((m) => m.tour))].join(' → ');
  console.log('    tableau final :', tours);
  // Mi-parcours : les poules doivent être partiellement jouées et sans bracket.
  const mi = coupeEnDirect(c.id, SAISON, CLUB, 2)!;
  console.log(`    à 2 journées : ${mi.poules[0].journees.length} journée(s) jouée(s), bracket ${mi.bracket.length}`);
}

console.log('\n=== PHASES FINALES DES CHAMPIONNATS ===');
for (const comp of COMPETITIONS.slice(0, 6)) {
  const total = nombreJournees(comp.id, '');
  const etat = championnatEnDirect(comp.id, SAISON, '', total);
  const ph = phaseFinale(comp.id, SAISON, etat.poule[0] ?? '');
  console.log(
    `  ${comp.nom} : ${etat.poule.length} clubs, ${total} journées, ` +
    `${ph.matchs.length} matchs de phase finale, champion ${ph.champion}`,
  );
}

console.log('\n=== HALL / CLASSEMENT : données abîmées ===');
const abimees = [
  { nom: 'Poste inconnu', poste: 'trois_quart_centre_gauche' },
  { nom: 'Poste vide', poste: undefined },
  { nom: 'Famille', poste: 'pilier' },
];
for (const l of abimees) {
  const p = POSTE_PAR_ID[migrerPoste(l.poste as string)];
  console.log(`  ${l.nom} → ${p ? p.nom : '✗ CRASH'} · nation vide → "${nomNation(undefined)}"`);
}
console.log('  légendes fictives :', LEGENDES_FICTIVES.every((l) => !!POSTE_PAR_ID[migrerPoste(l.poste)]) ? 'toutes valides' : '✗');

console.log('\n=== ON NE S’INVITE PAS DANS LES AUTRES CHAMPIONNATS ===');
{
  const club = 'Stade Toulousain';
  for (const id of ['reg3', 'fed2', 'prod2', 'top14']) {
    const dedans = championnatEnDirect(id, 1, id === 'top14' ? club : '', 4)
      .poule.includes(club);
    console.log(`  ${id} : ${club} dans la poule ? ${dedans}`);
  }
}
