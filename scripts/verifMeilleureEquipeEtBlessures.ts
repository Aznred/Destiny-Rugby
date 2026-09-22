import { formatTempsBlessure, formatTempsBlessureDetaille } from '../src/lib/carteJoueur';
import { meilleureCompositionManager } from '../src/lib/compositionManager';
import type { JoueurClub } from '../src/types/manager';

console.log('=== Test Formatage Blessures ===');
const maintenant = Date.now();
const dans30min = new Date(maintenant + 30 * 60 * 1000).toISOString();
const dans5h = new Date(maintenant + 5 * 3600 * 1000).toISOString();
const dans3j = new Date(maintenant + 3 * 24 * 3600 * 1000).toISOString();
const dans10j = new Date(maintenant + 10 * 24 * 3600 * 1000).toISOString();

console.log('30 min:', formatTempsBlessure(dans30min, maintenant));
console.log('5 h:', formatTempsBlessure(dans5h, maintenant));
console.log('3 j:', formatTempsBlessure(dans3j, maintenant));
console.log('10 j:', formatTempsBlessure(dans10j, maintenant));
console.log('Détail 3 j:', formatTempsBlessureDetaille(dans3j, maintenant));

if (formatTempsBlessure(dans30min, maintenant) !== '30 min') throw new Error('Erreur 30 min');
if (formatTempsBlessure(dans5h, maintenant) !== '5 h') throw new Error('Erreur 5 h');
if (formatTempsBlessure(dans3j, maintenant) !== '3 j') throw new Error('Erreur 3 j');
if (formatTempsBlessure(dans10j, maintenant) !== '2 sem.') throw new Error('Erreur 10 j');

console.log('=== Test Meilleure Équipe Manager ===');
// Création d'un effectif simulé de 30 joueurs
const postes: import('../src/types.js').PosteId[] = [
  'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_g', 'deuxieme_ligne_d',
  'troisieme_aile_g', 'troisieme_aile_d', 'numero_8',
  'demi_melee', 'demi_ouverture', 'ailier_gauche', 'premier_centre', 'deuxieme_centre',
  'ailier_droit', 'arriere',
  'pilier_gauche', 'talonneur', 'pilier_droit', 'deuxieme_ligne_d', 'troisieme_aile_d',
  'demi_melee', 'demi_ouverture', 'deuxieme_centre',
  'arriere', 'ailier_gauche', 'numero_8', 'pilier_gauche'
];

const effectif: JoueurClub[] = postes.map((poste, i) => ({
  id: `j-${i + 1}`,
  nom: `Joueur ${i + 1}`,
  prenom: `Prénom`,
  poste,
  postesSecondaires: [],
  note: 75 + (i % 15),
  age: 26,
  potentiel: 80,
  forme: 90,
  energie: 90,
  moral: 85,
  nationalite: 'FR',
  salaireMensuel: 10000,
  finContrat: 2027,
  jeuAuPied: poste === 'demi_ouverture' ? 88 : 50,
}));

const compo = meilleureCompositionManager(effectif, new Set(['j-1']), new Map());
console.log('Titulaires retenus:', compo.titulaires.length);
console.log('Remplaçants retenus:', compo.remplacants.length);
console.log('Buteur ID:', compo.buteurId);
console.log('Capitaine ID:', compo.capitaineId);

if (compo.titulaires.includes('j-1')) throw new Error('Un joueur indisponible ne doit pas être aligné');
if (compo.titulaires.filter(Boolean).length !== 15) throw new Error('Le XV titulaire doit avoir 15 joueurs');
if (compo.remplacants.filter(Boolean).length !== 8) throw new Error('Le banc doit avoir 8 remplaçants');
if (!compo.buteurId) throw new Error('Un buteur doit être désigné');
if (!compo.capitaineId) throw new Error('Un capitaine doit être désigné');

console.log('✅ Tous les tests sont validés avec succès !');
