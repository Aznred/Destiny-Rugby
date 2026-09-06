/* Exécuter avec Vite actif : node scripts/verifierOuverturePacks.cjs <module playwright> [executable Chrome] */
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');
(async () => {
 const browser = await chromium.launch({ ...(process.argv[3] ? { executablePath:process.argv[3] } : {}), headless:true, args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
 try {
  const page = await browser.newPage({ viewport:{width:1280,height:900} });
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  const tiers=['bronze','argent','or','elite','star'];
  for (let rang=0;rang<5;rang++) {
   await page.goto(`http://127.0.0.1:5173/scripts/apercuPacks.html?rang=${rang}`);
   const pack = page.locator('.pack-show-touch');
   await pack.waitFor();
   assert.match(await page.locator('.pack-show').getAttribute('class'),/palier-bronze/);
   assert.equal(await page.locator('.pack-show button').count(),1);
   assert.equal(await page.locator('.cel-carte').count(),0);
   const centre = await pack.boundingBox();
   assert.ok(Math.abs(centre.x+centre.width/2-640)<2);
   assert.ok(Math.abs(centre.y+centre.height/2-450)<2);
   await page.locator('canvas[data-ready=true]').waitFor();
   const rendu = await page.locator('canvas').boundingBox();
   assert.ok(Math.abs(rendu.x+rendu.width/2-640)<2, 'Canvas centré horizontalement');
   assert.ok(Math.abs(rendu.y+rendu.height/2-450)<2, 'Canvas centré verticalement');
   for(let palier=1;palier<=rang;palier++) {
    await pack.click();
    await page.locator('.pack-show.phase-attente').waitFor();
    assert.match(await page.locator('.pack-show').getAttribute('class'),new RegExp(`palier-${tiers[palier]}`));
    // Aucun palier ne doit avancer tout seul une fois l'impact terminé.
    await page.waitForTimeout(600);
    assert.match(await page.locator('.pack-show').getAttribute('class'),new RegExp(`palier-${tiers[palier]}`));
   }
   await page.keyboard.press('m');
   assert.match(await page.locator('.pack-show-sr').textContent(),/Son désactivé/);
   await pack.click();
   await page.getByRole('button',{name:'Rejoindre le vestiaire'}).waitFor({timeout:15000});
   assert.equal(await page.locator('.pack-show-card.visible').count(),3);
   await page.waitForFunction(() => [...document.querySelectorAll('.pack-show-card.visible')].every(e => Number(getComputedStyle(e).opacity) > .98));
   assert.equal(await page.locator(`.pack-show-card.meilleure .cel-carte.${tiers[rang]}`).count(),1);
   await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'Rejouer l’ouverture'}).waitFor();
   console.log(`OK ${tiers[rang]} : bronze initial, palier maximal, son, 3 cartes, fermeture`);
  }
  for (let garantie=1;garantie<5;garantie++) {
   await page.goto(`http://127.0.0.1:5173/scripts/apercuPacks.html?rang=${garantie}&garantie=${garantie}`);
   await page.locator('.pack-show-touch').waitFor();
   assert.equal(await page.locator(`.pack-show.palier-${tiers[garantie]}`).count(),1);
   assert.equal(await page.locator('.pack-show-fallback').count(),0);
   await page.locator('.pack-show-touch').click();
   await page.locator('.pack-show.phase-ouverture').waitFor();
   await page.keyboard.press('Escape');
  }
  console.log('OK garanties : couleur initiale Argent, Or, Élite et Mythique ; aucun faux pack.');
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:5173/scripts/apercuPacks.html?rang=4&cartes=8');
  await page.locator('.pack-show-touch').waitFor();
  const centreMobile=await page.locator('.pack-show-touch').boundingBox();
  assert.ok(Math.abs(centreMobile.x+centreMobile.width/2-195)<2);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.pack-show-card.visible').count(),8);
  assert.ok(await page.evaluate(()=>document.querySelector('.pack-show').scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Rejoindre le vestiaire'}).focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button',{name:'Rejoindre le vestiaire',exact:true}).evaluate(e=>e===document.activeElement),true);
  await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'destiny-pack-mobile.png'),fullPage:true});
  console.log('OK mobile : 8 cartes, animation réduite, aucun débordement, focus contenu');
  await page.route('**/m3d/packs/**',route=>route.abort());
  await page.goto('http://127.0.0.1:5173/scripts/apercuPacks.html?rang=0&cartes=1');
  await page.locator('.pack-show-touch').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Rejoindre le vestiaire'}).waitFor();
  assert.equal(await page.locator('.pack-show-card.visible').count(),1);
  console.log('OK indisponibilité 3D : récompense accessible par Échap');
  assert.deepEqual(errors,[]);
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});

