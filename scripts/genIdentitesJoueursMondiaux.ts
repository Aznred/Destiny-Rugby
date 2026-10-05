// Conserve les cartes historiques et restaure les homonymes prouvés par les fiches source.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { EFFECTIFS_REELS } from '../src/data/effectifsReels';
import { noteJoueurRevalorisee } from '../src/lib/evaluationJoueurReel';
import { recalibrerNoteFfr } from '../src/lib/echelleNotesFfr';

const require = createRequire(import.meta.url);
const { LIGUES } = require('./ligues.cjs');
const clubs = new Map<string, string>(LIGUES.flatMap((l: { clubs: string[][] }) => l.clubs.map(c => [c[0], c[1]])));
const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const source = JSON.parse(readFileSync('sources/data/base_rugby_finale.json', 'utf8')) as Record<string, string>[];
const cibles = new Set(source.filter(l => ['MLR', 'Champ Rugby', 'NPC'].includes(l.Ligue)).map(l => normaliser(l.Joueur)));
const fiches = new Map<string, Set<string>>();
const fichesParClub = new Map<string, Set<string>>();
for (const l of source) {
  const nom = normaliser(l.Joueur), club = clubs.get(l['Équipe']);
  if (!cibles.has(nom) || !l['Lien Joueur']) continue;
  fiches.set(nom, (fiches.get(nom) ?? new Set()).add(l['Lien Joueur']));
  if (club) {
    const cle = `${nom}|${club}`;
    fichesParClub.set(cle, (fichesParClub.get(cle) ?? new Set()).add(l['Lien Joueur']));
  }
}
const identites: Record<string, { sourceId: string; fiche: string; distinct: boolean }> = {};
for (const [nom, liens] of fiches) {
  if (liens.size < 2) continue;
  const candidats = Object.entries(EFFECTIFS_REELS).flatMap(([club, js]) => js.filter(j => normaliser(j.nom) === nom).map(j => ({ club, j })));
  // Même choix que l'ancien catalogue : meilleure note, premier effectif en cas d'égalité.
  const gagnant = candidats.reduce((a, b) => recalibrerNoteFfr(b.club, noteJoueurRevalorisee(b.j.nom, b.j.note)) > recalibrerNoteFfr(a.club, noteJoueurRevalorisee(a.j.nom, a.j.note)) ? b : a);
  const lien = (club: string) => {
    const liste = fichesParClub.get(`${nom}|${club}`);
    assert.equal(liste?.size, 1, `Identité ambiguë : ${nom}, ${club}`);
    return [...liste!][0];
  };
  const historique = lien(gagnant.club);
  const ids = new Map<string, string>([[historique, `reel:${nom}`]]);
  for (const { club } of candidats) {
    const fiche = lien(club);
    const distinct = fiche !== historique;
    // Compatible avec les joueurs déjà ajoutés depuis le Labo.
    if (!ids.has(fiche)) ids.set(fiche, `import:${nom.replace(/ /g, '-')}:${normaliser(club).replace(/ /g, '-')}`);
    identites[`${nom}|${club}`] = { sourceId: ids.get(fiche)!, fiche, distinct };
  }
}
writeFileSync('src/data/identitesJoueursMondiaux.ts', `// Généré depuis les fiches de sources/data/base_rugby_finale.json.
// Régénérer : node node_modules/vite-node/dist/cli.mjs scripts/genIdentitesJoueursMondiaux.ts
// Les identifiants des cartes existantes restent inchangés.
export const IDENTITES_JOUEURS_MONDIAUX: Record<string, { sourceId: string; fiche: string; distinct: boolean }> = ${JSON.stringify(identites, null, 2)};\n`);
console.log(`${new Set(Object.values(identites).filter(i => i.distinct).map(i => i.sourceId)).size} homonymes restaurés.`);
