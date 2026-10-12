// PRODUIRE — toute la chaîne pour une langue, ou pour les deux.
//
//   node trailer/catastrophe/produire.cjs            # fr puis en
//   node trailer/catastrophe/produire.cjs fr --flou 10
//   PUB=enquete node trailer/catastrophe/produire.cjs   # une autre pub (ou : node trailer/enquete/produire.cjs)
//
// 1. Si une prise a été déposée (voix/fr.mp3, voix/fr.wav…), elle est alignée par transcription et devient la voix.
// 2. La chronologie est recalculée sur la voix, les sous-titres (.srt) réécrits.
// 3. La bande-son est synthétisée et mixée ; l'image est filmée en 1080 × 1920 ; le tout est monté dans livrables/.
// Le jeu doit tourner (DESTINY_URL, par défaut http://localhost:5199) : la page de la pub et le vrai gameplay en sortent.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { ici, outil, option } = require('./projet.cjs');

const lancer = (script, ...args) => {
  const r = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit', windowsHide: true });
  if (r.status !== 0) throw new Error(`${script} ${args.join(' ')} a échoué`);
};
const langues = ['fr', 'en'].includes(process.argv[2]) ? [process.argv[2]] : ['fr', 'en'];

for (const langue of langues) {
  const prise = ['mp3', 'wav', 'm4a', 'flac', 'ogg'].map(e => ici('voix', `${langue}.${e}`)).find(f => fs.existsSync(f));
  const alignement = ici('voix', `alignement-${langue}.json`);
  // Une prise déposée plus récente que l'alignement en cours le remplace.
  if (prise && (!fs.existsSync(alignement) || fs.statSync(prise).mtimeMs > fs.statSync(alignement).mtimeMs)) {
    const cache = prise.replace(/\.[a-z0-9]+$/i, '.json');
    if (fs.existsSync(cache) && fs.statSync(cache).mtimeMs < fs.statSync(prise).mtimeMs) fs.rmSync(cache);
    lancer(outil('aligner.cjs'), langue, prise);
  }
  lancer(outil('chronologie.cjs'), langue);
  lancer(ici('son.cjs'), langue);                             // la partition est propre à chaque pub
  if (!process.argv.includes('--sans-image')) lancer(outil('filmer.cjs'), langue, '--flou', option('flou', '10'));
  lancer(outil('monter.cjs'), langue);
}
