import assert from 'node:assert/strict';
import { COMPETITIONS } from '../src/data/clubs';
import { catalogueBaseCarriere, rareteCarriere, carteDepuisSource } from '../src/lib/ligue/catalogueCarriere';
import { creerCarriere, avancerCarriere } from '../src/lib/ligue/carriere';
import { effectifDuClub, noteALAge } from '../src/lib/effectif';
import { ECHELLE_NOTES_FFR, echelleFfrDuClub } from '../src/lib/echelleNotesFfr';
import { statistiquesCarte } from '../src/lib/ligue/statistiquesCarte';

const ids = ['top14', 'prod2', 'nationale', 'nationale2', 'fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3'];
const catalogue = catalogueBaseCarriere();
const lignes = ids.map(id => {
  const competition = COMPETITIONS.find(c => c.id === id)!;
  assert.ok(competition, id);
  const cartes = catalogue.filter(j => j.championnat === competition.nom).map(j => j.note).sort((a, b) => a - b);
  const effectifs = competition.clubs.flatMap(c => effectifDuClub(c.nom, 1).map(j => j.note)).sort((a, b) => a - b);
  const mesurer = (notes: number[]) => ({ n: notes.length, min: notes[0], mediane: notes[Math.floor(notes.length / 2)], p90: notes[Math.floor(notes.length * .9)], max: notes.at(-1)! });
  return { division: id, cartes: mesurer(cartes), effectifs: mesurer(effectifs) };
});
console.table(lignes.map(l => ({ division: l.division, cartes: l.cartes.n, min: l.cartes.min, mediane: l.cartes.mediane, p90: l.cartes.p90, max: l.cartes.max, terrainMediane: l.effectifs.mediane, terrainMax: l.effectifs.max })));
for (const ligne of lignes) {
  const echelle = ECHELLE_NOTES_FFR[ligne.division];
  if (!echelle) continue;
  for (const mesures of [ligne.cartes, ligne.effectifs]) {
    assert.ok(mesures.min >= echelle.min && mesures.max <= echelle.max, `${ligne.division}: notes hors échelle`);
  }
}
for (let i = 1; i < lignes.length; i++) {
  assert.ok(lignes[i].cartes.mediane < lignes[i - 1].cartes.mediane, 'Hiérarchie médiane des cartes');
  assert.ok(lignes[i].effectifs.mediane < lignes[i - 1].effectifs.mediane, 'Hiérarchie médiane du terrain');
  if (i >= 2) assert.ok(lignes[i].cartes.max < lignes[i - 1].cartes.mediane || lignes[i].division.startsWith('reg'), 'Le plafond inférieur dépasse le joueur médian supérieur');
}
for (const carte of catalogue) if (echelleFfrDuClub(carte.clubReel)) {
  assert.equal(carte.rarete, rareteCarriere(carte.note));
  assert.deepEqual(carte.statistiques, statistiquesCarte(carte.note, carte.famille, carte.sourceId));
  assert.ok(carte.potentiel >= carte.note);
}
assert.equal(noteALAge(60, 30, 90, 30, .5), 60, 'Un adulte reçoit sa note actuelle, pas son potentiel');
assert.equal(noteALAge(40, 19, 80, 19, .5), 40);
assert.equal(noteALAge(40, 19, 80, 27, .5), 80, 'Une pépite peut progresser avec les saisons');
const maintenant = Date.parse('2026-10-03T10:00:00Z');
const etat = creerCarriere({ id: 'echelle', nom: 'Échelle', code: 'DR-NOTES', compteId: 'test', pseudo: 'Test', clubNom: 'Test Rugby', rythme: 1, maxClubs: 4 }, maintenant, 'echelle');
const sources = Object.keys(ECHELLE_NOTES_FFR).map(id => catalogue.find(c => c.championnat === COMPETITIONS.find(d => d.id === id)!.nom)!);
for (const source of sources) {
  const carte = carteDepuisSource(source, etat.id, etat.clubs[0].id, 1);
  carte.note = 90; carte.potentiel = 95; carte.rarete = 'star'; carte.matchs = 19; carte.essais = 7; carte.fatigue = 24; carte.favori = true;
  etat.cartes.push(carte);
}
const avant = structuredClone(etat);
const corrige = avancerCarriere(etat, maintenant, 'echelle');
for (const source of sources) {
  const carte = corrige.cartes.find(c => c.sourceId === source.sourceId)!;
  assert.equal(carte.note, source.note); assert.equal(carte.potentiel, source.potentiel);
  assert.equal(carte.rarete, source.rarete); assert.deepEqual(carte.statistiques, source.statistiques);
  const originale = avant.cartes.find(c => c.id === carte.id)!;
  for (const cle of ['id', 'proprietaire', 'clubs', 'matchs', 'essais', 'fatigue', 'favori'] as const) assert.deepEqual(carte[cle], originale[cle]);
}
assert.deepEqual(etat, avant, 'La sauvegarde source a été mutée');
const encore = avancerCarriere(corrige, maintenant, 'echelle');
assert.deepEqual(encore.cartes, corrige.cartes, 'Une seconde lecture change encore les notes');
console.log('OK : hiérarchie des deux modes, raretés, statistiques, notes adultes et progression des espoirs.');
console.log('OK : anciennes cartes des huit divisions corrigées, historique préservé, correction stable.');
