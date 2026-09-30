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
      await page.locator('.pack-show.phase-attente.palier-bronze').waitFor();
      for (let palier = 1; palier <= rang; palier++) {
        assert.equal(await page.getByRole('button', { name: 'Améliorer le pack' }).count(), 0, 'Le prochain palier reste une surprise.');
        assert.equal(await page.locator('.pack-show-footer').count(), 0, 'Seule la pochette déclenche la révélation.');
        assert.equal(await page.locator('.pack-show-hint').innerText(), 'Touche le pack pour l’ouvrir.');
        await page.getByRole('button', { name: 'Ouvrir le pack', exact: true }).press('Enter');
        await page.locator('.pack-show-upgrade').waitFor();
        await page.locator(`.pack-show.phase-attente.palier-${raretes[palier]}`).waitFor();
      }
      await page.getByRole('button', { name: 'Ouvrir le pack' }).last().click();
      await page.locator('.pack-show.phase-ouverture').waitFor();
      await page.locator('canvas[data-ready=true]').waitFor();
      await page.getByRole('button', { name: 'Rejoindre le vestiaire' }).waitFor({ timeout: 20000 });
      assert.equal(await page.locator('.pack-show-card.visible').count(), 3);
      assert.equal(await page.locator(`.pack-show-card.meilleure .cel-carte.${raretes[rang]}`).count(), 1);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Rejouer l’ouverture' }).waitFor();
      console.log(`OK ${raretes[rang]} : ${rang} montée(s), ouverture manuelle, 3 cartes, fermeture`);
    }
    for (let rang = 1; rang < raretes.length; rang++) {
      await page.goto(`http://127.0.0.1:5173/scripts/apercuPacks.html?rang=${rang}&base=${rang}`);
      assert.equal(await page.locator(`.pack-show.palier-${raretes[rang]}`).count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Améliorer le pack' }).count(), 0);
      await page.getByRole('button', { name: 'Ouvrir le pack' }).last().click();
      await page.getByRole('button', { name: 'Rejoindre le vestiaire' }).waitFor({ timeout: 20000 });
    }
    await page.goto('http://127.0.0.1:5173/scripts/apercuPacks.html?rang=4&skin=1');
    assert.equal(await page.getByRole('button', { name: 'Améliorer le pack' }).count(), 0, 'Une pochette dédiée ne change pas de texture.');
    await page.getByRole('button', { name: 'Ouvrir le pack' }).last().click();
    await page.getByRole('button', { name: 'Rejoindre le vestiaire' }).waitFor({ timeout: 20000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:5173/scripts/apercuPacks.html?rang=4&base=4&cartes=8');
    await page.getByRole('button', { name: 'Ouvrir le pack' }).last().click();
    await page.locator('.pack-show.phase-ouverture').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.pack-show-card.visible').count(), 8);
    assert.ok(await page.evaluate(() => document.querySelector('.pack-show').scrollWidth <= innerWidth));
    console.log('OK mobile : 8 cartes, animation réduite, aucun débordement');
    await page.route('**/m3d/packs/**', route => route.abort());
    await page.goto('http://127.0.0.1:5173/scripts/apercuPacks.html?rang=0&cartes=1');
    await page.getByRole('button', { name: 'Ouvrir le pack' }).last().click();
    await page.locator('.pack-show.phase-ouverture').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.pack-show-card.visible').count(), 1);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
