// LES TROIS COUVERTURES DU PORTAIL — 1920x1080, 800x1200, 800x800.
//
//   node scripts/_couvertures.cjs
//
// ⚠️ ON NE PHOTOGRAPHIE PAS L'INTERFACE. Première version : une capture de
// l'accueil à chaque format. Le paysage passait ; le carré, lui, tombait au
// milieu de la page — titre coupé en deux, barre de navigation en travers, un
// bouton « View my profile » en gros au centre. Une capture d'écran n'est pas
// une jaquette : le portail affiche cette image dans une grille, à 200 px de
// large, et il faut que le titre y soit ENCORE lisible.
//
// On rend donc un gabarit d'affiche (`trailer/_couverture.html`) qui reprend la
// palette, les polices et le grain du jeu, avec le rugbyman détouré par
// `scripts/_joueur.cjs`. Trois formats, trois mises en page.

const puppeteer = require('puppeteer-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GABARIT = 'file:///' + path.resolve('trailer/_couverture.html').split(path.sep).join('/');

const FORMATS = [
  { f: 'paysage', nom: 'couverture-paysage-1920x1080', large: 1920, haut: 1080 },
  { f: 'portrait', nom: 'couverture-portrait-800x1200', large: 800, haut: 1200 },
  { f: 'carre', nom: 'couverture-carre-800x800', large: 800, haut: 800 },
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync('trailer/joueur.png')) {
    console.error('❌ trailer/joueur.png manquant : lance d\'abord scripts/_joueur.cjs');
    process.exit(1);
  }
  const navigateur = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', protocolTimeout: 120_000,
    args: ['--hide-scrollbars'],
  });
  for (const f of FORMATS) {
    const page = await navigateur.newPage();
    await page.setViewport({ width: f.large, height: f.haut, deviceScaleFactor: 1 });
    await page.goto(`${GABARIT}?f=${f.f}`, { waitUntil: 'networkidle2' });
    // Les polices Google et le PNG du joueur doivent être là avant la photo.
    await page.evaluate(() => document.fonts.ready);
    await dormir(900);
    const chemin = path.join('trailer', f.nom + '.png');
    await page.screenshot({ path: chemin });
    console.log(`✅ ${chemin} · ${f.large}x${f.haut} · ${(fs.statSync(chemin).size / 1024).toFixed(0)} Ko`);
    await page.close();
  }
  await navigateur.close();
}
main().catch((e) => { console.error('❌', e.message); process.exit(1); });
