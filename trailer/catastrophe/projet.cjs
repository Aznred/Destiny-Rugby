// QUELLE PUB ? — les outils de ce dossier (aligner, chronologie, filmer, monter, produire, apercu) servent à toutes les pubs.
// La variable PUB nomme le dossier de la pub sous trailer/ ; sans elle, c'est celle-ci (catastrophe).
//
//   node trailer/catastrophe/produire.cjs fr               # la pub « catastrophe »
//   PUB=enquete node trailer/catastrophe/produire.cjs fr   # la pub « enquête » (ou : node trailer/enquete/produire.cjs fr)
const path = require('node:path');

const NOM = process.env.PUB || 'catastrophe';
const PROJET = path.resolve(__dirname, '..', NOM);
const racine = path.resolve(__dirname, '..', '..');
const TEXTES = require(path.join(PROJET, 'textes.cjs'));

module.exports = {
  NOM, PROJET, racine, TEXTES,
  /** Un chemin dans le dossier de la pub. */
  ici: (...p) => path.join(PROJET, ...p),
  /** Un outil commun (ce dossier). */
  outil: nom => path.join(__dirname, nom),
  option: (nom, defaut) => { const i = process.argv.indexOf('--' + nom); return i > 0 ? process.argv[i + 1] : defaut; },
};
