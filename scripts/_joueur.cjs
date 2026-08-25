// LE RUGBYMAN, SEUL ET EN GRAND — la pièce maîtresse des couvertures.
//
// ⚠️ ON NE DÉCOUPE PAS UNE CAPTURE D'ÉCRAN. Recadrer le personnage dans une
// capture de l'accueil donne ce qu'on a mesuré : des jambes coupées, une taille
// qui change d'un chargement à l'autre (le modèle 3D s'anime), et un fond qui
// porte les dégradés de la page. On repart donc du jeu, mais on masque tout
// sauf le canevas : le personnage occupe alors toute la hauteur, au format qu'on
// veut, sur le fond du thème.

const puppeteer = require('puppeteer-core');
const fs = require('node:fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_JEU = 'http://127.0.0.1:5174/';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const navigateur = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', protocolTimeout: 120_000,
    args: ['--window-size=900,1200', '--hide-scrollbars'],
    defaultViewport: { width: 900, height: 1200, deviceScaleFactor: 2 },
  });
  const page = await navigateur.newPage();
  await page.goto(URL_JEU, { waitUntil: 'networkidle2' });
  await page.evaluate((s) => localStorage.setItem('destin-ovalie', s),
    fs.readFileSync('scripts/_seedTrailer.json', 'utf8'));
  await page.reload({ waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /Home|Accueil/.test(e.innerText || ''));
    if (b) b.click();
  });
  await dormir(4500);

  // Tout disparaît sauf le canevas, qui prend la page entière.
  await page.addStyleTag({ content: `
    .nav, .nav-mobile, .hero-texte, .section.lecture, .barre-jouer, .guide-pastille { display: none !important; }
    body::before, body::after { display: none !important; }
    .hero { min-height: 100dvh !important; grid-template-columns: 1fr !important; padding: 0 !important;
            width: 100% !important; margin: 0 !important; }
    .hero-canvas { height: 100dvh !important; border-radius: 0 !important; }
  ` });
  await dormir(2500);
  await page.screenshot({ path: 'trailer/joueur.png' });
  console.log(`✅ trailer/joueur.png · 1800x2400 · ${(fs.statSync('trailer/joueur.png').size / 1024).toFixed(0)} Ko`);
  await navigateur.close();
}
main().catch((e) => { console.error('❌', e.message); process.exit(1); });
