// LA VOIX — ElevenLabs, une prise par langue, avec l'horodatage de chaque caractère.
//
//   node trailer/catastrophe/voix.cjs fr            # voix/destiny_rugby_voice_fr.{mp3,wav} + voix/alignement-fr.json
//   node trailer/catastrophe/voix.cjs en --graine 7 --voix <voice_id> --modele eleven_multilingual_v2 --vitesse 1.08
//
// La clé se lit dans .env.local (ELEVENLABS_API_KEY) : elle n'est écrite nulle part ailleurs.
// Une seule prise pour les cinq répliques (la diction reste d'un seul tenant) ; l'horodatage rendu par l'API donne le
// début et la fin de chaque mot, donc de chaque scène : le montage et les sous-titres se calent dessus, pas sur une estimation.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { TEXTES, racine, ici } = require('./projet.cjs');

const dossier = ici('voix');
fs.mkdirSync(dossier, { recursive: true });

function cle() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  for (const fichier of ['.env.local', '.env']) {
    const chemin = path.join(racine, fichier);
    if (!fs.existsSync(chemin)) continue;
    const ligne = fs.readFileSync(chemin, 'utf8').split(/\r?\n/).find(l => l.startsWith('ELEVENLABS_API_KEY='));
    if (ligne) return ligne.slice('ELEVENLABS_API_KEY='.length).trim();
  }
  throw new Error('ELEVENLABS_API_KEY absente de .env.local');
}
const option = (nom, defaut) => { const i = process.argv.indexOf('--' + nom); return i > 0 ? process.argv[i + 1] : defaut; };

/** Les mots d'une prise : chaque mot écrit, avec le début de son premier caractère et la fin de son dernier. */
function decouper(repliques, alignement) {
  const { characters, character_start_times_seconds: debuts, character_end_times_seconds: fins } = alignement;
  const complet = characters.join('');
  let curseur = 0;
  return repliques.map((replique, scene) => {
    const depart = complet.indexOf(replique.dit || replique.texte, curseur);
    if (depart < 0) throw new Error(`réplique ${scene + 1} introuvable dans l'alignement`);
    const ecrits = replique.texte.split(' ');
    const dits = (replique.dit || replique.texte).split(' ');
    if (ecrits.length !== dits.length) throw new Error(`réplique ${scene + 1} : « dit » doit avoir autant de mots que « texte »`);
    let c = depart;
    const mots = dits.map((dit, k) => {
      const a = c, b = c + dit.length - 1;
      c += dit.length + 1;
      return { mot: ecrits[k], debut: debuts[a], fin: fins[b] };
    });
    curseur = c - 1;
    // Un signe de ponctuation isolé (« ? », « ?! », « ! ») se colle au mot d'avant, comme à l'écran.
    const propres = [];
    for (const m of mots) {
      if (/^[?!:;…]+$/.test(m.mot) && propres.length) { const p = propres.at(-1); p.mot += ' ' + m.mot; p.fin = Math.max(p.fin, m.fin); }
      else propres.push(m);
    }
    return { scene: scene + 1, texte: replique.texte, debut: propres[0].debut, fin: propres.at(-1).fin, mots: propres };
  });
}

async function main() {
  const langue = process.argv[2] === 'en' ? 'en' : 'fr';
  const T = TEXTES[langue];
  const voix = option('voix', T.voix.id);
  const modele = option('modele', 'eleven_multilingual_v2');
  const texte = T.repliques.map(r => r.dit || r.texte).join(' ');
  const corps = {
    text: texte, model_id: modele, seed: Number(option('graine', 12)),
    voice_settings: { stability: Number(option('stabilite', 0.38)), similarity_boost: 0.8, style: Number(option('style', 0.42)), use_speaker_boost: true, speed: Number(option('vitesse', 1.06)) },
  };
  console.log(`${langue} : ${texte.length} caractères, voix ${voix}, modèle ${modele}`);
  const reponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voix}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': cle(), 'content-type': 'application/json' }, body: JSON.stringify(corps),
  });
  if (!reponse.ok) { console.error(`ElevenLabs ${reponse.status} : ${(await reponse.text()).slice(0, 600)}`); process.exitCode = 2; return; }
  const json = await reponse.json();
  const suffixe = option('suffixe', '');
  const mp3 = path.join(dossier, `destiny_rugby_voice_${langue}${suffixe}.mp3`);
  const wav = path.join(dossier, `destiny_rugby_voice_${langue}${suffixe}.wav`);
  fs.writeFileSync(mp3, Buffer.from(json.audio_base64, 'base64'));
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', wav], { windowsHide: true });
  if (r.status !== 0) throw new Error(String(r.stderr));
  const scenes = decouper(T.repliques, json.alignment);
  const duree = json.alignment.character_end_times_seconds.at(-1);
  fs.writeFileSync(path.join(dossier, `alignement-${langue}${suffixe}.json`), JSON.stringify({
    langue, voix, modele, reglages: corps.voice_settings, graine: corps.seed, duree,
    normalise: json.normalized_alignment ? json.normalized_alignment.characters.join('') : null, scenes,
  }, null, 1));
  console.log(`  durée ${duree.toFixed(2)} s`);
  for (const s of scenes) console.log(`  scène ${s.scene} : ${s.debut.toFixed(2)} → ${s.fin.toFixed(2)} (${(s.fin - s.debut).toFixed(2)} s)`);
  if (json.normalized_alignment) console.log('  lu : ' + json.normalized_alignment.characters.join(''));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
