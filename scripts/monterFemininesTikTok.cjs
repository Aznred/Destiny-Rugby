// MONTER LES VIDÉOS TIKTOK — promos du rugby féminin et edits de match (1080 × 1920, 30 images/s, sans son)
//
//   node scripts/monterFemininesTikTok.cjs            # tout ce qui a été filmé
//   node scripts/monterFemininesTikTok.cjs promo      # les deux promos seulement
//   node scripts/monterFemininesTikTok.cjs edits      # les edits de match seulement
//
// Les images viennent de `filmerFemininesTikTok.cjs` (trailer/work/feminines). Un edit n'invente rien : chaque
// plan est un extrait d'un vrai match, coupé autour d'un fait relevé dans l'état du moteur (essai, plaquage
// dominant, percée), avec un ralenti sur l'instant du fait. Le texte est incrusté ici, pas dans le jeu.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');

const travail = path.resolve(__dirname, '../trailer/work/feminines');
const sortie = path.resolve(__dirname, '../trailer/tiktok-feminines');
fs.mkdirSync(sortie, { recursive: true });
const IPS = 30, L = 1080, H = 1920;

const lire = dossier => {
  const d = JSON.parse(fs.readFileSync(path.join(travail, dossier, 'frames.json'), 'utf8'));
  d.frames = d.frames.filter(f => fs.existsSync(path.join(travail, dossier, f.file))).sort((a, b) => a.at - b.at);
  return d;
};
/** L'image affichée à l'instant `ms` d'une scène : la dernière reçue avant lui. */
function imageA(scene, dossier, ms, curseur) {
  while (curseur.i + 1 < scene.frames.length && scene.frames[curseur.i + 1].at <= ms) curseur.i++;
  while (curseur.i > 0 && scene.frames[curseur.i].at > ms) curseur.i--;
  return path.join(travail, dossier, scene.frames[curseur.i].file).replaceAll('\\', '/');
}

const echapper = t => t.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
/** Un calque de texte transparent, rendu une fois puis posé sur les images du plan. */
async function calque(nom, { accroche = [], etiquette = '', fin = false }) {
  const lignes = accroche.map((ligne, i) => `<text x="540" y="${250 + i * 132}" text-anchor="middle" font-family="Impact, 'Arial Narrow', sans-serif" font-size="128"
      fill="${i === accroche.length - 1 && accroche.length > 1 ? '#e8b23a' : '#f5f7f2'}" stroke="#04100a" stroke-width="10" paint-order="stroke" letter-spacing="2">${echapper(ligne)}</text>`).join('');
  const pastille = etiquette ? `<g><rect x="${540 - etiquette.length * 19 - 34}" y="1492" width="${etiquette.length * 38 + 68}" height="84" rx="42" fill="#04100acc" stroke="#e8b23a" stroke-width="3"/>
      <text x="540" y="1550" text-anchor="middle" font-family="Impact, sans-serif" font-size="46" fill="#e8b23a" letter-spacing="5">${echapper(etiquette)}</text></g>` : '';
  const carton = fin ? `<rect width="1080" height="1920" fill="#050d09"/>
      <text x="540" y="820" text-anchor="middle" font-family="Impact, sans-serif" font-size="60" fill="#e8b23a" letter-spacing="14">COMPOSE TON XV</text>
      <text x="540" y="1010" text-anchor="middle" font-family="Impact, sans-serif" font-size="200" fill="#f5f7f2">DESTINY</text>
      <text x="540" y="1190" text-anchor="middle" font-family="Impact, sans-serif" font-size="200" fill="#f5f7f2">RUGBY</text>
      <rect x="290" y="1290" width="500" height="96" rx="48" fill="none" stroke="#e8b23a" stroke-width="3"/>
      <text x="540" y="1356" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="46" fill="#e8b23a" letter-spacing="3">destiny-rugby.fr</text>` : '';
  const signature = fin ? '' : `<text x="540" y="1808" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="34" fill="#f5f7f2" fill-opacity=".86"
      stroke="#04100a" stroke-width="6" paint-order="stroke" letter-spacing="6">DESTINY RUGBY · destiny-rugby.fr</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">${carton}${lignes}${pastille}${signature}</svg>`;
  const fichier = path.join(travail, `_calque-${nom}.png`);
  await sharp(Buffer.from(svg)).png().toFile(fichier);
  return fichier.replaceAll('\\', '/');
}

/** Encode une suite de plans : chaque plan = { images: [chemins], calque? }. */
function encoder(nom, plans) {
  const morceaux = [];
  plans.forEach((plan, i) => {
    if (!plan.images.length) return;
    const liste = path.join(travail, `_liste-${nom}-${i}.txt`);
    fs.writeFileSync(liste, plan.images.map(p => `file '${p}'\nduration ${(1 / IPS).toFixed(6)}`).join('\n') + `\nfile '${plan.images.at(-1)}'\n`);
    const morceau = path.join(travail, `_plan-${nom}-${i}.mp4`);
    const base = `fps=${IPS},scale=${L}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${L}:${H}`;
    const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', liste];
    if (plan.calque) args.push('-i', plan.calque, '-filter_complex', `[0:v]${base}[v];[v][1:v]overlay=0:0,format=yuv420p[o]`, '-map', '[o]');
    else args.push('-vf', `${base},format=yuv420p`);
    args.push('-r', String(IPS), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', morceau);
    const r = spawnSync(ffmpeg, args, { stdio: 'inherit', timeout: 600000 });
    if (r.status !== 0) throw new Error(`Encodage du plan ${nom}-${i} échoué`);
    morceaux.push(morceau.replaceAll('\\', '/'));
  });
  const liste = path.join(travail, `_montage-${nom}.txt`);
  fs.writeFileSync(liste, morceaux.map(m => `file '${m}'`).join('\n'));
  const fichier = path.join(sortie, `${nom}.mp4`);
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', liste, '-c', 'copy', '-movflags', '+faststart', fichier], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`Assemblage de ${nom} échoué`);
  const secondes = plans.reduce((s, p) => s + p.images.length, 0) / IPS;
  console.log(`${nom}.mp4 : ${secondes.toFixed(1)} s, ${(fs.statSync(fichier).size / 1e6).toFixed(1)} Mo`);
  return fichier;
}

async function promos() {
  for (const [dossier, nom] of [['promo-arrivee', '1-elles-arrivent'], ['promo-octobre-rose', '2-octobre-rose']]) {
    if (!fs.existsSync(path.join(travail, dossier, 'frames.json'))) { console.log(`${dossier} : pas encore filmé`); continue; }
    const scene = lire(dossier), curseur = { i: 0 }, images = [];
    const duree = Math.min(scene.duration, (scene.duree ?? 99) * 1000);
    for (let t = 80; t < duree; t += 1000 / IPS) images.push(imageA(scene, dossier, t, curseur));
    encoder(nom, [{ images }]);
  }
}

// Ce qu'on garde autour d'un fait (secondes avant, après) et où tombe le ralenti.
const COUPES = {
  essai: { avant: 5.0, apres: 2.4, ralenti: [-1.3, 0.5], etiquette: 'ESSAI' },
  plaquage: { avant: 2.6, apres: 1.9, ralenti: [-0.45, 0.8], etiquette: 'GROS PLAQUAGE' },
  assis: { avant: 2.4, apres: 2.2, ralenti: [-0.5, 0.9], etiquette: 'SUR LES FESSES' },
  percee: { avant: 1.2, apres: 4.4, ralenti: [0.2, 1.3], etiquette: 'PERCÉE' },
};
// Les matchs sont filmés à 60 images par seconde : à demi-vitesse, chaque image montée est une vraie image du match.
const VITESSE_RALENTI = 0.5;

/** Les images d'un moment : vitesse réelle, et ralenti sur la fenêtre du fait. */
function moment(dossier, scene, fait) {
  const regle = COUPES[fait.type];
  const debut = Math.max(0, fait.at - regle.avant * 1000), fin = Math.min(scene.duration, fait.at + regle.apres * 1000);
  const [r0, r1] = [fait.at + regle.ralenti[0] * 1000, fait.at + regle.ralenti[1] * 1000];
  const curseur = { i: 0 }, images = [];
  for (let t = debut; t < fin; t += (1000 / IPS) * (t >= r0 && t < r1 ? VITESSE_RALENTI : 1)) images.push(imageA(scene, dossier, t, curseur));
  return images;
}

async function edits() {
  const dossiers = fs.readdirSync(travail).filter(d => /^match-.+-\d\d$/.test(d) && fs.existsSync(path.join(travail, d, 'frames.json')));
  const faits = [];
  for (const dossier of dossiers) {
    const scene = lire(dossier);
    let dernier = {};
    for (const ev of scene.evenements ?? []) {
      if (!COUPES[ev.type]) continue;
      // Deux faits du même type à moins de trois secondes : c'est la même action.
      if (dernier[ev.type] !== undefined && ev.at - dernier[ev.type] < 3000) continue;
      dernier[ev.type] = ev.at;
      faits.push({ ...ev, dossier, scene });
    }
  }
  const par = type => faits.filter(f => f.type === type);
  console.log(`faits filmés : ${par('essai').length} essais, ${par('plaquage').length} gros plaquages, ${par('assis').length} défenseurs assis, ${par('percee').length} percées (${dossiers.length} extraits)`);
  // Une percée qui finit en essai appartient à l'essai : on ne la montre pas deux fois.
  // Chaque edit MÊLE les deux : un clip des joueuses, un clip des joueurs, et ainsi de suite (les matchs masculins
  // sont filmés sous une graine en « h », `GENRE=homme`). Quand un genre n'a plus de matière, l'autre continue.
  const meler = liste => {
    const elles = liste.filter(f => !/^match-h/.test(f.dossier)), eux = liste.filter(f => /^match-h/.test(f.dossier)), sortie = [];
    for (let i = 0; i < Math.max(elles.length, eux.length); i++) { if (elles[i]) sortie.push(elles[i]); if (eux[i]) sortie.push(eux[i]); }
    return sortie;
  };
  const essaisBruts = par('essai');
  const essais = meler(essaisBruts);
  const percees = meler(par('percee').filter(p => !essaisBruts.some(e => e.dossier === p.dossier && e.at > p.at && e.at - p.at < 9000)));
  // Gros contacts : les défenseurs assis par le porteur d'abord (le plus rare), puis les plaquages dominants.
  const plaquages = meler([...par('assis'), ...par('plaquage')]);
  const fin = await calque('fin', { fin: true });
  const carton = { images: Array(Math.round(1.8 * IPS)).fill(fin), calque: null };
  const recettes = [
    ['3-edit-gros-contacts', ['ÇA', 'TAMPONNE.'], plaquages.slice(0, 8)],
    ['4-edit-essais', ['ESSAIS', 'DE FOU.'], essais.slice(0, 4)],
    ['5-edit-percees', ['PERSONNE', 'NE LES ARRÊTE.'], percees.slice(0, 6)],
    // Le best-of prend ce que les trois autres n'ont pas montré, et se rabat sur leurs premiers plans s'il en manque.
    ['6-edit-best-of', ['ELLES ET EUX.', 'MÊME TERRAIN.'], [essais[4] ?? essais[0], plaquages[8] ?? plaquages[0], percees[6] ?? percees[0],
      essais[5] ?? essais[1], plaquages[9] ?? plaquages[1], essais[6] ?? essais[2]].filter(Boolean)],
  ];
  for (const [nom, accroche, choisis] of recettes) {
    if (choisis.length < 2) { console.log(`${nom} : pas assez de matière (${choisis.length})`); continue; }
    const plans = [];
    for (const [i, fait] of choisis.entries()) {
      const images = moment(fait.dossier, fait.scene, fait);
      const tete = i === 0 ? Math.min(images.length, Math.round(1.9 * IPS)) : 0;
      if (tete) plans.push({ images: images.slice(0, tete), calque: await calque(`${nom}-accroche`, { accroche }) });
      plans.push({ images: images.slice(tete), calque: await calque(`${nom}-${fait.type}`, { etiquette: COUPES[fait.type].etiquette }) });
    }
    plans.push(carton);
    encoder(nom, plans);
  }
}

(async () => {
  const mode = process.argv[2];
  if (mode !== 'edits') await promos();
  if (mode !== 'promo') await edits();
})().catch(erreur => { console.error(erreur); process.exitCode = 1; });
