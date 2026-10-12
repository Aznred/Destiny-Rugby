// APERÇU — des images fixes de la pub à des instants donnés, rangées en planche.
//
//   node trailer/catastrophe/apercu.cjs fr 0.5,1.5,2.8          # → apercus/planche.jpg (+ une image par instant)
//   node trailer/catastrophe/apercu.cjs fr 12.9 --plein --flou 8 # image entière, en 1080 × 1920, avec le flou de mouvement
//   node trailer/catastrophe/apercu.cjs fr plans                 # le milieu de chaque plan
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ouvrir, racine } = require('./cdp.cjs');
const { NOM, ici } = require('./projet.cjs');

const BASE = process.env.DESTINY_URL || 'http://localhost:5199';
const sortie = ici('apercus');
fs.mkdirSync(sortie, { recursive: true });
const option = (nom, defaut) => { const i = process.argv.indexOf('--' + nom); return i > 0 ? process.argv[i + 1] : defaut; };

(async () => {
  const langue = process.argv[2] === 'en' ? 'en' : 'fr';
  const plein = process.argv.includes('--plein');
  const flou = Number(option('flou', 1));
  const page = await ouvrir({ largeur: 540, hauteur: 960, echelle: plein ? 2 : 1, port: 9263, profil: path.join(racine, 'node_modules', `.capture-${NOM}-apercu`) });
  try {
    await page.send('Page.navigate', { url: `${BASE}/trailer/${NOM}/pub.html?langue=${langue}&fige=1&flou=${flou}` });
    try { await page.attendre('Boolean(window.__pub && window.__pub.pret)', 240, 500); }
    catch (e) { console.log(page.journal.join('\n')); throw e; }
    const infos = await page.evaluer('({ carte: __pub.carte, taille: __pub.taille, duree: __pub.duree, plans: __pub.plans, jeu: __pub.jeu })');
    console.log(`${infos.carte} — ${infos.taille.join('×')} — ${infos.duree.toFixed(2)} s`);
    const voulu = process.argv[3] || 'plans';
    const instants = voulu === 'plans'
      ? [...infos.plans.map(p => (p.debut + p.fin) / 2), ...Object.values(infos.jeu).filter(Array.isArray).map(([a, b]) => a + (b - a) * 0.5)]
      : voulu.split(',').map(Number);
    const fichiers = [];
    for (const t of instants) {
      const t0 = Date.now();
      const nom = await page.evaluer(`__pub.dessiner(${t})`);
      await page.evaluer('new Promise(r => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 120); })');
      const fichier = path.join(sortie, `${langue}-${t.toFixed(2).padStart(5, '0')}.jpg`);
      fs.writeFileSync(fichier, await page.photo('jpeg', 90));
      fichiers.push(fichier);
      console.log(`${t.toFixed(2)} s : ${nom} (${Date.now() - t0} ms)`);
    }
    if (page.journal.length) console.log([...new Set(page.journal)].slice(0, 12).join('\n'));
    if (fichiers.length > 1) {
      const liste = path.join(sortie, '_liste.txt');
      fs.writeFileSync(liste, fichiers.map(f => `file '${f.replace(/\\/g, '/')}'\nduration 1`).join('\n'));
      const colonnes = Math.min(6, fichiers.length), lignes = Math.ceil(fichiers.length / colonnes);
      const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', liste, '-vf', `scale=${option('largeur', 300)}:-1,tile=${colonnes}x${lignes}`, '-frames:v', '1', path.join(sortie, 'planche.jpg')], { windowsHide: true });
      if (r.status !== 0) console.log(String(r.stderr));
    }
  } finally { page.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
