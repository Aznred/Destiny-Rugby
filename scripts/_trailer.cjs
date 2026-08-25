// TOURNAGE DES VIDÉOS DE PRÉSENTATION — on filme le VRAI jeu.
//
// ⚠️ AUCUNE IMAGE N'EST MISE EN SCÈNE. Le script pilote un Chrome local sur le
// serveur de dev, charge une sauvegarde de tournage, et photographie ce qui se
// passe à l'écran. Le match filmé est un vrai match du moteur.
//
//   node scripts/_trailer.cjs paysage   → 1920 x 1080
//   node scripts/_trailer.cjs portrait  → 1080 x 1920
//
// Les images sortent dans `trailer/images-<format>/`, puis ffmpeg les assemble.
// Ce fichier ne fait pas partie du jeu : il dépend de puppeteer-core et d'un
// Chrome installé, et il n'est jamais importé par `src/`.

const puppeteer = require('puppeteer-core');
const fs = require('node:fs');
const path = require('node:path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_JEU = 'http://127.0.0.1:5174/';
const IPS = 20; // images par seconde du rendu final

const format = process.argv[2] === 'portrait' ? 'portrait' : 'paysage';
// ⚠️ On filme à la MOITIÉ de la définition finale et on agrandit à l'assemblage :
// une capture 1920x1080 prend ~250 ms, une 960x540 en prend ~70. Sur 700 images,
// c'est trois minutes contre douze. Le jeu est vectoriel et le texte reste net.
const LARGE = format === 'portrait' ? 720 : 1280;
const HAUT = format === 'portrait' ? 1280 : 720;
const SORTIE = path.join('trailer', `images-${format}`);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.rmSync(SORTIE, { recursive: true, force: true });
  fs.mkdirSync(SORTIE, { recursive: true });

  const navigateur = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    // Le match est la séquence la plus lourde : une capture peut y demander
    // plusieurs secondes, bien au-delà des 30 s par défaut sur une salve.
    protocolTimeout: 180_000,
    args: [`--window-size=${LARGE},${HAUT}`, '--hide-scrollbars'],
    defaultViewport: { width: LARGE, height: HAUT, deviceScaleFactor: 1 },
  });
  const page = await navigateur.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('  [page]', m.text().slice(0, 100)); });

  await page.goto(URL_JEU, { waitUntil: 'networkidle2' });

  // La sauvegarde de tournage, puis rechargement pour qu'elle prenne.
  const sauvegarde = fs.readFileSync('scripts/_seedTrailer.json', 'utf8');
  await page.evaluate((s) => localStorage.setItem('destin-ovalie', s), sauvegarde);
  await page.reload({ waitUntil: 'networkidle2' });
  await dormir(2500);

  let n = 0;
  const clic = async (texte) => {
    const ok = await page.evaluate((t) => {
      const b = [...document.querySelectorAll('button,a')]
        .find((e) => (e.innerText || '').trim().replace(/\s+/g, ' ').includes(t));
      if (b) { b.click(); return true; }
      return false;
    }, texte);
    return ok;
  };
  /** Filme pendant N secondes de temps réel. */
  const filmer = async (secondes, etiquette) => {
    const images = Math.round(secondes * IPS);
    for (let i = 0; i < images; i++) {
      await page.screenshot({
        path: path.join(SORTIE, String(n++).padStart(5, '0') + '.jpg'),
        type: 'jpeg', quality: 90, optimizeForSpeed: true,
      });
    }
    console.log(`  ${etiquette} : ${images} images (${n} au total)`);
  };

  console.log(`\n▶ Tournage ${format} (${LARGE}x${HAUT} ×2)`);

  // ── 1. L'accueil, le titre et le rugbyman en 3D ──────────────────────────
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.nav .liens button, .nav-mobile button')]
      .find((e) => /Home|Accueil/.test(e.innerText || ''));
    if (b) b.click();
  });
  await dormir(2200);
  await filmer(3, 'accueil');

  // ── 2. La fiche de carrière : stats, jauges, contrat ─────────────────────
  if (!(await clic('Career'))) await clic('Carrière');
  await dormir(1400);
  await filmer(3.5, 'carrière');

  // ── 3. LE MATCH — c'est la séquence qui vend le jeu ──────────────────────
  const matchOuvert = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find((e) => /Play the match|Jouer le match|▶/.test(e.innerText || ''));
    if (b) { b.click(); return true; }
    return false;
  });
  if (matchOuvert) {
    await dormir(2600);
    // Ceinture et bretelles : si la notice de match s'affiche quand même
    // (vieille sauvegarde, drapeau absent), on la referme avant de filmer.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((e) => /Let.s go|C.est parti/.test(e.innerText || ''));
      if (b) b.click();
    });
    await dormir(700);
    // Tempo « Suivre » : le match se déroule sans attendre de décision.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((e) => /Follow|Suivre|👁/.test(e.innerText || ''));
      if (b) b.click();
    });
    await dormir(600);
    await filmer(13, 'match');
    await page.keyboard.press('Escape');
    await dormir(900);
  } else {
    console.log('  ⚠️ aucun match cette semaine — on filme la carrière plus longtemps');
    await filmer(4, 'carrière (rattrapage)');
  }

  // ── 4. Le marché des transferts sur L'Ovale ──────────────────────────────
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /Ovale/.test(e.innerText || ''));
    if (b) b.click();
  });
  await dormir(1800);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /Messages/.test(e.innerText || ''));
    if (b) b.click();
  });
  await dormir(1600);
  await filmer(5, 'transferts');

  // ── 5. L'atlas des clubs : la profondeur du contenu ──────────────────────
  await clic('Clubs');
  await dormir(2200);
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
  await dormir(900);
  await filmer(3.5, 'atlas');

  await navigateur.close();
  const duree = (n / IPS).toFixed(1);
  console.log(`\n✅ ${n} images · ${duree} s · ${SORTIE}`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
