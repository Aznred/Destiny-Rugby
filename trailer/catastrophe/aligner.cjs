// ALIGNER UNE PRISE FOURNIE — une voix générée dans l'interface d'ElevenLabs n'a pas d'horodatage :
// on la transcrit (ElevenLabs Scribe rend le début et la fin de chaque mot), puis on recolle la transcription
// sur le texte de la pub, lettre à lettre. Le résultat a la même forme que celui de voix.cjs.
//
//   node trailer/catastrophe/aligner.cjs fr trailer/catastrophe/voix/fr.mp3
//   node trailer/catastrophe/aligner.cjs en "C:/…/ma prise.mp3" --controle   # compare à un alignement déjà connu
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TEXTES, racine, ici } = require('./projet.cjs');

const dossier = ici('voix');

function cle() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const ligne = fs.readFileSync(path.join(racine, '.env.local'), 'utf8').split(/\r?\n/).find(l => l.startsWith('ELEVENLABS_API_KEY='));
  if (!ligne) throw new Error('ELEVENLABS_API_KEY absente de .env.local');
  return ligne.slice('ELEVENLABS_API_KEY='.length).trim();
}

// Les lettres seules : sans accents, sans ponctuation. Les nombres que la transcription écrit en chiffres sont redits en lettres.
const NOMBRES = { fr: { 800: 'huitcents', 80000: 'quatrevingtmille' }, en: { 800: 'eighthundred' } };
const lettres = (texte, langue) => texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/(\d)[\s\u00a0.,](?=\d{3}(\D|$))/g, '$1').replace(/\d+/g, n => NOMBRES[langue][n] || n).replace(/[^a-z0-9]/g, '');

async function transcrire(fichier) {
  const cache = fichier.replace(/\.[a-z0-9]+$/i, '.json');
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, 'utf8'));
  const corps = new FormData();
  corps.append('model_id', 'scribe_v1');
  corps.append('file', new Blob([fs.readFileSync(fichier)]), path.basename(fichier));
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': cle() }, body: corps });
  if (!r.ok) throw new Error(`Scribe ${r.status} : ${(await r.text()).slice(0, 400)}`);
  const json = await r.json();
  fs.writeFileSync(cache, JSON.stringify(json));
  return json;
}

/** Recolle les lettres du texte sur celles de la transcription (distance d'édition), et rend un instant par lettre du texte. */
function recoller(texte, entendu) {
  const n = texte.length, m = entendu.length;
  const cout = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
  for (let i = 0; i <= n; i++) cout[i][0] = i;
  for (let j = 0; j <= m; j++) cout[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    cout[i][j] = Math.min(cout[i - 1][j - 1] + (texte[i - 1] === entendu[j - 1].c ? 0 : 1), cout[i - 1][j] + 1, cout[i][j - 1] + 1);
  }
  const instants = new Array(n).fill(null);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    const diag = cout[i - 1][j - 1] + (texte[i - 1] === entendu[j - 1].c ? 0 : 1);
    if (cout[i][j] === diag) { instants[i - 1] = { ...entendu[j - 1], exact: texte[i - 1] === entendu[j - 1].c }; i--; j--; }
    else if (cout[i][j] === cout[i - 1][j] + 1) i--;
    else j--;
  }
  return { instants, ecart: cout[n][m] };
}

async function aligner(langue, fichier) {
  const T = TEXTES[langue];
  const S = await transcrire(fichier);
  // Une lettre entendue = son mot, et sa place dans le mot (le temps est réparti sur les lettres).
  const entendu = [];
  for (const w of S.words.filter(x => x.type === 'word')) {
    const l = lettres(w.text, langue);
    [...l].forEach((c, k) => entendu.push({ c, debut: w.start + (w.end - w.start) * k / l.length, fin: w.start + (w.end - w.start) * (k + 1) / l.length }));
  }
  const mots = [];
  T.repliques.forEach((r, scene) => r.texte.split(' ').forEach(mot => {
    if (/^[?!:;…]+$/.test(mot) && mots.length) { mots.at(-1).mot += '\u00a0' + mot; return; }
    mots.push({ mot, scene: scene + 1, l: lettres(mot, langue) });
  }));
  const { instants, ecart } = recoller(mots.map(m => m.l).join(''), entendu);
  let c = 0;
  for (const m of mots) {
    const tranche = instants.slice(c, c + m.l.length).filter(Boolean);
    c += m.l.length;
    // Un mot que la transcription écrit autrement (un nombre en chiffres) n'a pas d'instant sûr : il prendra la place entre ses voisins.
    const sur = tranche.filter(x => x.exact).length >= m.l.length * 0.5;
    m.debut = sur ? tranche[0].debut : null; m.fin = sur ? tranche.at(-1).fin : null;
  }
  // Un mot sans aucune lettre retrouvée prend la place laissée entre ses voisins.
  mots.forEach((m, k) => {
    if (m.debut !== null) return;
    const avant = mots.slice(0, k).reverse().find(x => x.fin !== null), apres = mots.slice(k + 1).find(x => x.debut !== null);
    m.debut = avant ? avant.fin : 0; m.fin = apres ? apres.debut : m.debut + 0.3;
  });
  const duree = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', fichier], { windowsHide: true }).stdout.toString().trim());
  const scenes = T.repliques.map((r, i) => {
    const siens = mots.filter(m => m.scene === i + 1).map(m => ({ mot: m.mot, debut: +m.debut.toFixed(3), fin: +m.fin.toFixed(3) }));
    return { scene: i + 1, texte: r.texte, debut: siens[0].debut, fin: siens.at(-1).fin, mots: siens };
  });
  return { langue, voix: path.basename(fichier), modele: 'prise fournie, alignée par transcription (Scribe)', duree, ecart, entendu: S.text, scenes };
}

if (require.main === module) (async () => {
  const langue = process.argv[2] === 'en' ? 'en' : 'fr';
  const fichier = path.resolve(process.argv[3]);
  const A = await aligner(langue, fichier);
  console.log(`${langue} : ${A.duree.toFixed(2)} s, ${A.ecart} lettre(s) d'écart entre le texte et la transcription`);
  for (const s of A.scenes) console.log(`  scène ${s.scene} : ${s.debut.toFixed(2)} → ${s.fin.toFixed(2)} (${(s.fin - s.debut).toFixed(2)} s)`);
  if (process.argv.includes('--controle')) {
    // Banc : la même prise a un alignement exact (rendu par la synthèse) ; on mesure l'écart mot à mot.
    const exact = JSON.parse(fs.readFileSync(path.join(dossier, `alignement-${langue}.json`), 'utf8'));
    const a = A.scenes.flatMap(s => s.mots), b = exact.scenes.flatMap(s => s.mots);
    const ecarts = a.map((m, i) => Math.abs(m.debut - b[i].debut));
    console.log(`  contrôle : ${a.length} mots, écart moyen ${(ecarts.reduce((x, y) => x + y, 0) / ecarts.length * 1000).toFixed(0)} ms, pire ${(Math.max(...ecarts) * 1000).toFixed(0)} ms (${a[ecarts.indexOf(Math.max(...ecarts))].mot})`);
    return;
  }
  // La prise devient la voix de la pub : copie, version WAV, alignement.
  const mp3 = path.join(dossier, `destiny_rugby_voice_${langue}.mp3`);
  if (path.resolve(fichier) !== mp3) fs.copyFileSync(fichier, mp3);
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', path.join(dossier, `destiny_rugby_voice_${langue}.wav`)], { windowsHide: true });
  if (r.status !== 0) throw new Error(String(r.stderr));
  fs.writeFileSync(path.join(dossier, `alignement-${langue}.json`), JSON.stringify(A, null, 1));
})().catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { aligner };
