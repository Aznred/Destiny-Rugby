// Couverture des logos de compétition : quelle compétition affiche encore un
// emoji faute de logo fourni ? Viser zéro sur les compétitions jouables.
import { COMPETITIONS } from '../src/data/clubs';
import { COUPES_EUROPE, COMPETITIONS_NATIONS } from '../src/data/mondeReel';
import { LOGO_COMPETITION } from '../src/data/logosCompetitions';
import fs from 'node:fs';

let ok = 0;
const sans: string[] = [];
const fichiersManquants: string[] = [];

function verifier(id: string, nom: string) {
  const chemin = LOGO_COMPETITION[id];
  if (!chemin) { sans.push(`${nom} (${id})`); return; }
  if (!fs.existsSync('public' + chemin)) fichiersManquants.push(`${nom} → ${chemin}`);
  ok++;
}

console.log('=== CHAMPIONNATS ===');
for (const c of COMPETITIONS) verifier(c.id, c.nom);
console.log('=== COUPES DE CLUBS ===');
for (const c of COUPES_EUROPE) verifier(c.id, c.nom);
console.log('=== COMPÉTITIONS DE SÉLECTIONS ===');
for (const c of COMPETITIONS_NATIONS) verifier(c.id, c.nom);

console.log(`\n${ok} compétitions avec logo officiel.`);
if (sans.length) console.log(`Encore en emoji (${sans.length}) :\n  ` + sans.join('\n  '));
if (fichiersManquants.length) console.log('⚠️ Fichiers absents :\n  ' + fichiersManquants.join('\n  '));
