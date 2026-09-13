import assert from 'node:assert/strict';
import { EVALUATION_ALLRUGBY, PROFIL_POSTES_ALLRUGBY } from '../src/data/evaluationsAllRugby';
import { EVALUATION_JOUEUR_MAJ } from '../src/data/evaluationsJoueursMaj';
import { EFFECTIFS_REELS } from '../src/data/effectifsReels';
import { POSTE_PAR_ID } from '../src/data/rugby';
import { catalogueBaseCarriere, coequipierDepuisCarte } from '../src/lib/ligue/catalogueCarriere';
import { adequationAuPoste } from '../src/lib/carteJoueur';

const normaliser = (s: string): string => s.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const parNom = new Map<string, { nom: string; avant: number; apres: number; source?: string }>();

for (const effectif of Object.values(EFFECTIFS_REELS)) {
  for (const joueur of effectif) {
    const cle = normaliser(joueur.nom);
    const evaluation = EVALUATION_JOUEUR_MAJ[cle];
    const classement = evaluation && /^(RugbyPass|FloRugby|We Talk Rugby|Ajustement jeu)/.test(evaluation.source);
    const avant = classement ? evaluation.note : Math.max(30, joueur.note, evaluation?.note ?? 0);
    const allrugby = EVALUATION_ALLRUGBY[cle];
    const apres = Math.max(30, joueur.note, evaluation?.note ?? 0, allrugby?.note ?? 0);
    const precedent = parNom.get(cle);
    if (!precedent) parNom.set(cle, { nom: joueur.nom, avant, apres, source: allrugby?.source });
    else {
      precedent.avant = Math.max(precedent.avant, avant);
      precedent.apres = Math.max(precedent.apres, apres);
      if (allrugby?.source) precedent.source = allrugby.source;
    }
  }
}

const correspondances = [...parNom.keys()].filter((cle) => EVALUATION_ALLRUGBY[cle]).length;
const lignes = [...parNom.values()].filter((ligne) => ligne.apres > ligne.avant && ligne.source);
lignes.sort((a, b) => (b.apres - b.avant) - (a.apres - a.avant) || b.apres - a.apres);
const meilleuresNotes = [...lignes]
  .sort((a, b) => b.apres - a.apres || (b.apres - b.avant) - (a.apres - a.avant));
const hausseMoyenne = lignes.reduce((s, l) => s + l.apres - l.avant, 0) / Math.max(1, lignes.length);
assert.ok(Object.keys(EVALUATION_ALLRUGBY).length >= 2_500, 'Trop peu de fiches statistiques exploitables.');
assert.ok(correspondances >= 1_500, `Seulement ${correspondances} joueurs du jeu reconnus.`);
assert.ok(lignes.length >= 300, `Seulement ${lignes.length} joueurs réellement revalorisés.`);
assert.ok(hausseMoyenne <= 15, `Hausse moyenne excessive : +${hausseMoyenne.toFixed(1)}.`);
assert.ok(Object.values(EVALUATION_ALLRUGBY).every((e) => e.note >= 30 && e.note <= 94));

const profils = Object.values(PROFIL_POSTES_ALLRUGBY);
const parNumero = new Map<number, number>();
for (const profil of profils) {
  const numero = POSTE_PAR_ID[profil.postePrincipal].numero;
  parNumero.set(numero, (parNumero.get(numero) ?? 0) + 1);
}
for (const numero of [3, 5, 7, 8]) {
  assert.ok((parNumero.get(numero) ?? 0) >= 80, `Seulement ${parNumero.get(numero) ?? 0} joueurs au poste n°${numero}.`);
}
const polyvalents = profils.filter((p) => p.postesSecondaires.length > 0).length;
assert.ok(polyvalents >= 500, `Seulement ${polyvalents} profils avec un second poste.`);
assert.equal(PROFIL_POSTES_ALLRUGBY['francisco coria marchetti']?.postePrincipal, 'pilier_droit');
assert.equal(PROFIL_POSTES_ALLRUGBY['loan lavergne']?.postePrincipal, 'numero_8');
assert.ok(PROFIL_POSTES_ALLRUGBY['thomas canaleta']?.postesSecondaires.includes('troisieme_aile_d'));
assert.ok(PROFIL_POSTES_ALLRUGBY['jonny green']?.postesSecondaires.includes('deuxieme_ligne_d'));

const cartesProfessionnelles = catalogueBaseCarriere().filter((c) => c.origine === 'professionnel');
const cartesParNumero = new Map<number, number>();
for (const carte of cartesProfessionnelles) {
  const numero = POSTE_PAR_ID[carte.poste].numero;
  cartesParNumero.set(numero, (cartesParNumero.get(numero) ?? 0) + 1);
}
for (const numero of [3, 5, 7, 8]) {
  assert.ok((cartesParNumero.get(numero) ?? 0) >= 100,
    `Le catalogue ne contient que ${cartesParNumero.get(numero) ?? 0} cartes n°${numero}.`);
}
const carteCoria = cartesProfessionnelles.find((c) => normaliser(c.nom) === 'francisco coria marchetti');
const carteGreen = cartesProfessionnelles.find((c) => normaliser(c.nom) === 'jonny green');
assert.equal(carteCoria?.poste, 'pilier_droit');
assert.deepEqual(carteGreen && [carteGreen.poste, ...(carteGreen.postesSecondaires ?? [])],
  ['deuxieme_ligne_g', 'deuxieme_ligne_d']);
if (carteGreen) {
  const joueurGreen = coequipierDepuisCarte({
    ...carteGreen, id: 'test:green', proprietaire: null, fatigue: 0, matchs: 0, essais: 0, clubs: [],
  });
  assert.deepEqual(joueurGreen.postesSecondaires, ['deuxieme_ligne_d']);
}
assert.equal(adequationAuPoste('ailier_droit', 'deuxieme_centre', ['deuxieme_centre']), 'secondaire');

console.log(`${correspondances} joueurs du jeu reconnus · ${lignes.length} revalorisés · hausse moyenne +${hausseMoyenne.toFixed(1)}.`);
console.log(lignes.slice(0, 18).map((l) => `  ${l.nom}: ${l.avant} → ${l.apres} · ${l.source}`).join('\n'));
console.log('\n10 meilleures notes finales parmi les joueurs revalorisés :');
console.log(meilleuresNotes.slice(0, 10).map((l, i) =>
  `  ${i + 1}. ${l.nom}: ${l.avant} → ${l.apres} (+${l.apres - l.avant}) · ${l.source}`,
).join('\n'));
console.log(`\nPostes exacts : ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => `n°${n}: ${parNumero.get(n) ?? 0}`).join(' · ')}`);
console.log(`${polyvalents} joueurs possèdent au moins un second poste fiable.`);
console.log(`Catalogue professionnel : ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => `n°${n}: ${cartesParNumero.get(n) ?? 0}`).join(' · ')}`);
