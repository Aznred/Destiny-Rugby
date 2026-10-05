// LE LOT « MLR · CHAMPIONSHIP · NPC » POUR LES IMPORTS DU LABO
//
//   npx vite-node scripts/genLotImportJoueurs.ts   → serveur/lotImportJoueurs.ts
//
// Les trois championnats sont générés depuis `sources/data/base_rugby_finale.json`
// (scripts/genMonde.cjs). Ce lot reprend leurs effectifs tels que le jeu les
// connaît (nom, poste, club, note, âge, nation, portrait éventuel) et compte,
// pour chaque nom, le nombre de FICHES allrugby différentes qui le portent :
// c'est ce qui sépare un joueur prêté (une fiche, deux clubs) d'un homonyme
// (deux fiches) que le catalogue fusionnait à tort. Le Labo l'analyse
// (`analyserImport`) et Kiri tranche les lignes douteuses.
//
// Le fichier produit n'est importé QUE par le serveur, à la demande.

import { readFileSync, writeFileSync } from 'node:fs';
import { EFFECTIFS_REELS } from '../src/data/effectifsReels';
import { COMPETITIONS } from '../src/data/clubs';
import { photoReelle } from '../src/lib/avatars';
import type { LigneImport } from '../src/lib/ligue/importsJoueurs';

const CHAMPIONNATS = ['Major League Rugby', 'RFU Championship', 'Championship Cup', 'Bunnings NPC'];
const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const nationLisible = (s: string) => s.replace(/[^\p{L}\p{M}\s'-]/gu, '').trim();

const source = JSON.parse(readFileSync('sources/data/base_rugby_finale.json', 'utf8')) as Record<string, string>[];
const fiches = new Map<string, Set<string>>();
for (const l of source) {
  const cle = normaliser(l.Joueur);
  const fiche = l['Lien Joueur'] || `${l.Joueur}|${l['Équipe']}`;
  fiches.set(cle, (fiches.get(cle) ?? new Set()).add(fiche));
}

const competitionDuClub = new Map(COMPETITIONS.flatMap(c => c.clubs.map(club => [club.nom, c.nom] as const)));
const lignes: LigneImport[] = [];
for (const [club, effectif] of Object.entries(EFFECTIFS_REELS)) {
  const ligue = competitionDuClub.get(club);
  if (!ligue || !CHAMPIONNATS.includes(ligue)) continue;
  for (const j of effectif) {
    const image = photoReelle(j.nom, club);
    lignes.push({
      nom: j.nom, poste: j.poste, club, ligue, note: j.note, age: j.age, nation: nationLisible(j.nation),
      fichesSource: fiches.get(normaliser(j.nom))?.size ?? 1,
      ...(image ? { image } : {}),
    });
  }
}
lignes.sort((a, b) => a.ligue.localeCompare(b.ligue) || a.club.localeCompare(b.club) || a.nom.localeCompare(b.nom));

const entete = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : sources/data/base_rugby_finale.json via src/data/effectifsReels.ts.
// Régénérer avec : npx vite-node scripts/genLotImportJoueurs.ts
// ${lignes.length} joueurs : ${CHAMPIONNATS.map(c => `${c} ${lignes.filter(l => l.ligue === c).length}`).join(', ')}.
// Importé uniquement par le serveur (Labo · Imports joueurs).
import type { LigneImport } from '../src/lib/ligue/importsJoueurs.js';

export const LOT_MLR_CHAMPIONSHIP_NPC: readonly LigneImport[] = [
`;
writeFileSync('serveur/lotImportJoueurs.ts', `${entete}${lignes.map(l => `  ${JSON.stringify(l)},`).join('\n')}\n];\n`);
console.log(`serveur/lotImportJoueurs.ts : ${lignes.length} joueurs, ${lignes.filter(l => (l.fichesSource ?? 1) > 1).length} portent un nom partagé par plusieurs fiches.`);
