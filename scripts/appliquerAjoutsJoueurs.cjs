// APPLIQUER LES AJOUTS MANUELS AUX EFFECTIFS ACTUELS — sans régénérer le monde (Correctif 33).
//
// ⚠️ POURQUOI PAS `genMonde.cjs`. Mesuré le 8 octobre 2026 : relancé tel quel, le générateur NE REPRODUIT PLUS les
// fichiers du dépôt — `effectifsReels.ts` et `mondeReel.ts` portent des retouches faites à la main depuis (imports en
// `.js` exigés par les fonctions serverless, une note corrigée, un joueur ajouté, un nom de championnat). Régénérer
// pour ajouter deux joueurs les effacerait. Ce script fait donc la seule chose demandée : il ajoute les joueurs de
// `ajoutsJoueurs.cjs` À LA FIN de l'effectif de leur club, et rien d'autre ne bouge dans le fichier.
//
// Il se relance sans effet (un joueur déjà présent n'est pas ajouté deux fois), et écrit à côté la table des maillots
// fixés à la main (`src/data/postesExactsJoueurs.generated.ts`).
//
//   node scripts/appliquerAjoutsJoueurs.cjs            applique
//   node scripts/appliquerAjoutsJoueurs.cjs --verifier ne touche à rien, échoue si un ajout manque (pour un banc)

const fs = require('fs');
const path = require('path');
const { AJOUTS_JOUEURS, FAMILLES, appliquerAjouts, postesExacts } = require('./ajoutsJoueurs.cjs');

const RACINE = path.join(__dirname, '..');
const EFFECTIFS = path.join(RACINE, 'src', 'data', 'effectifsReels.ts');
const POSTES = path.join(RACINE, 'src', 'data', 'postesExactsJoueurs.generated.ts');
const VERIFIER = process.argv.includes('--verifier');

const source = fs.readFileSync(EFFECTIFS, 'utf8');
const fin = source.includes('\r\n') ? '\r\n' : '\n';
const lignes = source.split(fin);

// Les deux tables d'index du fichier : familles de postes et nations.
const lignePostes = lignes.find((l) => l.startsWith('const POSTES: FamillePoste[] = ['));
const postes = [...lignePostes.matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (postes.join() !== FAMILLES.join()) throw new Error('Les familles de postes du fichier ne sont plus celles attendues : ne rien écrire.');
const debutNations = lignes.findIndex((l) => l.startsWith('const NATIONS: string[] = ['));
const finNations = lignes.findIndex((l, i) => i > debutNations && l.startsWith('];'));
const nations = lignes.slice(debutNations + 1, finNations).map((l) => l.trim().replace(/^'|',?$/g, '').replace(/\\'/g, "'"));

// Les effectifs : `  'Club': [` … `  ],`, une ligne par joueur.
const debutBrut = lignes.findIndex((l) => l.startsWith('const BRUT: Record<string, string[]> = {'));
const finBrut = lignes.findIndex((l, i) => i > debutBrut && l === '};');
const decoder = (texte) => texte.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
const encoder = (texte) => `'${String(texte).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const effectifs = {};
const finDuClub = {};
let club = null;
for (let i = debutBrut + 1; i < finBrut; i++) {
  const l = lignes[i];
  const tete = l.match(/^  '((?:[^'\\]|\\.)*)': \[$/);
  if (tete) { club = decoder(tete[1]); effectifs[club] = []; continue; }
  if (l === '  ],') { finDuClub[club] = i; club = null; continue; }
  const joueur = l.match(/^    '((?:[^'\\]|\\.)*)',$/);
  if (!joueur || !club) throw new Error(`Ligne inattendue dans les effectifs (${i + 1}) : ne rien écrire.`);
  const [nom, poste, age, note, potentiel, nation] = decoder(joueur[1]).split('|');
  effectifs[club].push({ nom, poste: postes[+poste], age: +age, note: +note, potentiel: +potentiel, nation: nations[+nation] });
}

const avant = JSON.parse(JSON.stringify(effectifs));
const bilan = appliquerAjouts(effectifs);
for (const b of bilan) console.log(`  ${b.action === 'refuse' ? '✗' : '✓'} ${b.nom} — ${b.action}${b.club ? ` (${b.club}${b.rang !== undefined ? `, place ${b.rang}` : ''})` : ''}${b.raison ? ` : ${b.raison}` : ''}`);
if (bilan.some((b) => b.action === 'refuse')) { console.error('Ajout refusé : rien n’est écrit.'); process.exit(1); }

const ligneJoueur = (j) => {
  const iNation = nations.indexOf(j.nation);
  if (iNation < 0) throw new Error(`Nation absente de la table du fichier : « ${j.nation} » (${j.nom}). Elle ne s'ajoute pas ici : passer par genMonde.cjs.`);
  return `    ${encoder(`${j.nom}|${postes.indexOf(j.poste)}|${j.age}|${j.note}|${j.potentiel}|${iNation}`)},`;
};
// Les clubs touchés, du bas du fichier vers le haut : les numéros de ligne du dessus restent justes.
const sortie = [...lignes];
const touches = Object.keys(effectifs).filter((c) => JSON.stringify(effectifs[c]) !== JSON.stringify(avant[c])).sort((a, b) => finDuClub[b] - finDuClub[a]);
for (const c of touches) {
  // ⚠️ Seules les lignes de ce club sont réécrites, et seulement celles qui changent : un joueur corrigé garde sa place.
  const debut = finDuClub[c] - avant[c].length;
  const nouvelles = effectifs[c].map(ligneJoueur);
  for (let i = 0; i < avant[c].length; i++) if (JSON.stringify(effectifs[c][i]) !== JSON.stringify(avant[c][i])) sortie[debut + i] = nouvelles[i];
  sortie.splice(finDuClub[c], 0, ...nouvelles.slice(avant[c].length));
}
const texte = sortie.join(fin);

const exacts = postesExacts();
const textePostes = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.${fin}// Source : scripts/ajoutsJoueurs.cjs · Généré par scripts/appliquerAjoutsJoueurs.cjs (et genMonde.cjs).${fin}//${fin}`
  + `// Le maillot d'un joueur ajouté à la main, quand sa famille de poste en couvre deux (un centre est 12 ou 13).${fin}`
  + `// Lu par \`postesJoueurReel\` AVANT toute autre source : c'est une valeur donnée, pas déduite.${fin}`
  + `import type { PosteId } from '../types.js';${fin}${fin}`
  + `export const POSTES_EXACTS_JOUEURS: Record<string, PosteId> = {${fin}`
  + Object.entries(exacts).sort(([a], [b]) => a.localeCompare(b)).map(([nom, poste]) => `  ${encoder(nom)}: ${encoder(poste)},${fin}`).join('')
  + `};${fin}`;

const aJour = texte === source && fs.existsSync(POSTES) && fs.readFileSync(POSTES, 'utf8') === textePostes;
if (VERIFIER) {
  if (!aJour) { console.error('Les ajouts manuels ne sont pas appliqués : node scripts/appliquerAjoutsJoueurs.cjs'); process.exit(1); }
  console.log(`${AJOUTS_JOUEURS.length} ajout(s) manuel(s) en place.`);
} else if (aJour) {
  console.log('Rien à écrire : les ajouts sont déjà en place.');
} else {
  fs.writeFileSync(EFFECTIFS, texte, 'utf8');
  fs.writeFileSync(POSTES, textePostes, 'utf8');
  console.log(`Écrit : ${path.relative(RACINE, EFFECTIFS)} (${texte.split(fin).length - lignes.length} ligne(s) de plus) et ${path.relative(RACINE, POSTES)}.`);
}
