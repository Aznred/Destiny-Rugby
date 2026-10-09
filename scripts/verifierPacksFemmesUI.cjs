// Vite actif : node scripts/verifierPacksFemmesUI.cjs <module playwright> <Chrome>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.argv[2] || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true, args: ['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const captures = 'trailer/work/packs-femmes'; fs.mkdirSync(captures, { recursive: true });
  const page = await browser.newPage({ viewport: { width:1280, height:900 } });
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.emulateMedia({ reducedMotion:'reduce' });
  const ouvrir = async query => { await page.goto(`http://127.0.0.1:5173/scripts/apercuPacks.html?${query}`); await page.locator('canvas[data-ready="true"]').waitFor({timeout:30000}); };
  try {
    await ouvrir('special=icon');
    for (const palier of ['argent','or','elite','star','special','icon']) {
      await page.locator('.pack-show-touch').click();
      await page.locator(`.phase-attente.palier-${palier}`).waitFor();
      await page.locator(`canvas[data-modele="${['icon','special'].includes(palier) ? `/m3d/packs-speciaux/${palier}.glb` : `/m3d/packs/${palier}-ferme.glb`}"]`).waitFor();
    }
    await page.screenshot({path:`${captures}/icon-desktop.png`});
    await page.locator('.pack-show-touch').click();
    await page.locator('.phase-cartes .pack-show-card.visible').nth(2).waitFor();
    assert.equal(await page.locator('.phase-cartes.palier-icon').count(),1);
    await page.setViewportSize({width:390,height:844});
    await ouvrir('france=1');
    await page.locator('.pack-show-touch').click();
    await page.locator('.phase-attente').waitFor();
    await page.locator('canvas[data-modele="/m3d/packs-speciaux/f-elite1.glb"]').waitFor();
    await page.screenshot({path:`${captures}/elite1-mobile.png`});
    await ouvrir('france=1&elite2seule=1');
    assert.equal(await page.locator('canvas').getAttribute('data-modele'),'/m3d/packs-speciaux/f-elite2.glb');
    await page.locator('.pack-show-touch').click();
    await page.locator('.phase-cartes').waitFor();
    for (const modele of ['octobre-rose','springboks','f-pwr','f-aupiki','f-superw','f-fpc','f-celtic','f-liga','f-seriea','f-ail']) {
      await ouvrir(`modele=${modele}`);
      assert.ok(await page.evaluate(()=>document.querySelector('.pack-show').scrollWidth<=innerWidth));
      if(['octobre-rose','f-pwr'].includes(modele)) await page.screenshot({path:`${captures}/${modele}-mobile.png`});
    }
    assert.deepEqual(erreurs,[]);
    console.log('OK : montée complète jusqu’à ICON, Élite 2 → Élite 1 conditionnelle, dix skins, ordinateur et mobile.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
