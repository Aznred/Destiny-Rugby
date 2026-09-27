/* Exécuter avec Vite actif : node scripts/verifierOuverturePacks.cjs <module playwright> [executable Chrome] */
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');

(async () => {
  const browser = await chromium.launch({
    ...(process.argv[3] ? { executablePath: process.argv[3] } : {}),
    headless: true,
    args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const raretes = ['bronze', 'argent', 'or', 'elite', 'star'];
    for (let rang = 0; rang < raretes.length; rang++) {
      await page.goto(`http://127.0.0.1:5173/scripts/apercuPacks.html?rang=${rang}`);
      await page.locator('.pack-show.phase-ouverture').waitFor();
      assert.equal(await page.locator('.pack-show-upgrade').count(), 0, 'Aucune montée en palier.');
      assert.equal(await page.locator('.pack-show-touch').count(), 0, 'Aucun second clic nécessaire.');
      await page.locator('canvas[data-ready=true]').waitFor();
      await page.getByRole('button', { name: 'Rejoindre le vestiaire' }).waitFor({ timeout: 20000 });
      assert.equal(await page.locator('.pack-show-card.visible').count(), 3);
      assert.equal(await page.locator(`.pack-show-card.meilleure .cel-carte.${raretes[rang]}`).count(), 1);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Rejouer l’ouverture' }).waitFor();
      console.log(`OK ${raretes[rang]} : ouverture directe, 3 cartes, fermeture`);
    }
    for (let rang = 1; rang < raretes.length; rang++) {
      await page.goto(`http://127.0.0.1:5173/scripts/apercuPacks.html?rang=${rang}&garantie=${rang}`);
      await page.locator('.pack-show.phase-ouverture').waitFor();
      assert.equal(await page.locator(`.pack-show.palier-${raretes[rang]}`).count(), 1);
      await page.getByRole('button', { name: 'Rejoindre le vestiaire' }).waitFor({ timeout: 20000 });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:5173/scripts/apercuPacks.html?rang=4&cartes=8');
    await page.locator('.pack-show.phase-ouverture').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.pack-show-card.visible').count(), 8);
    assert.ok(await page.evaluate(() => document.querySelector('.pack-show').scrollWidth <= innerWidth));
    console.log('OK mobile : 8 cartes, animation réduite, aucun débordement');
    await page.route('**/m3d/packs/**', route => route.abort());
    await page.goto('http://127.0.0.1:5173/scripts/apercuPacks.html?rang=0&cartes=1');
    await page.locator('.pack-show.phase-ouverture').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.pack-show-card.visible').count(), 1);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
