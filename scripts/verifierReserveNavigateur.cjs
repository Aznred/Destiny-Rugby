const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');
const captures = fs.mkdtempSync(path.join(os.tmpdir(), 'destiny-reserve-'));
(async () => {
  const p = await ouvrirNavigateur({ port: 9261 });
  const erreurs = [], mesures = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  const cliquer = expression => p.evaluer(`${expression}.click()`);
  const groupe = reserve => cliquer(`document.querySelectorAll('.ct-groupes button')[${reserve ? 1 : 0}]`);
  const compte = () => p.evaluer(`document.querySelectorAll('.manager-reserve-carte').length`);
  try {
    for (const [largeur, hauteur] of [[1920,1080], [390,844]]) {
      await p.dimensions(largeur, hauteur);
      // Vrai bureau entraîneur : ouvrir, permuter, fermer, rouvrir.
      await p.ouvrir('http://127.0.0.1:5188/scripts/apercuFluiditeManager.html');
      await p.jusqua(`Boolean(document.querySelector('[data-tuto="mgr-onglet-equipe"]'))`);
      await cliquer(`document.querySelector('[data-tuto="mgr-onglet-equipe"]')`);
      await p.jusqua(`Boolean(document.querySelector('.ct-groupes'))`);
      assert.equal(await compte(), 0, 'les réserves masquées ne montent aucune carte');
      await groupe(true);
      assert.equal(await compte(), 12);
      const nom = await p.evaluer(`document.querySelector('.manager-reserve-carte').title.split(' · ')[0]`);
      await cliquer(`document.querySelector('.manager-reserve-carte')`);
      await cliquer(`document.querySelector('.manager-terrain-xv .ct-carte')`);
      assert.ok(await p.evaluer(`document.querySelector('.manager-terrain-xv').innerText.includes(${JSON.stringify(nom)}) || [...document.querySelectorAll('.manager-terrain-xv [title]')].some(e=>e.title.includes(${JSON.stringify(nom)}))`));
      await groupe(false); assert.equal(await compte(), 0);
      await groupe(true); assert.equal(await compte(), 12);
      await p.evaluer(`document.querySelector('.manager-reserves').scrollIntoView({block:'center'})`);
      await p.capture(path.join(captures, `manager-${largeur}.png`));
      await cliquer(`document.querySelector('[data-tuto="compo-fermer"]')`);
      assert.equal(await p.evaluer(`Boolean(document.querySelector('#root').inert)`), false);

      // 200 réservistes : chaque joueur reste accessible avec douze cartes montées au plus.
      await p.ouvrir('http://127.0.0.1:5188/scripts/apercuReserveManager.html?nombre=223');
      await p.jusqua(`Boolean(document.querySelector('.ct-groupes'))`);
      assert.equal(await compte(), 0);
      await groupe(true);
      const vus = new Set();
      for (let page = 0; page < 17; page++) {
        const titres = await p.evaluer(`[...document.querySelectorAll('.manager-reserve-carte')].map(e=>e.title)`);
        assert.ok(titres.length > 0 && titres.length <= 12);
        titres.forEach(t => { assert.ok(!vus.has(t)); vus.add(t); });
        if (page < 16) await cliquer(`document.querySelector('.ct-pagination-reserves button:last-child')`);
      }
      assert.equal(vus.size, 200);
      assert.equal(await p.evaluer(`document.querySelector('.ct-pagination-reserves button:last-child').disabled`), true);
      await p.evaluer(`document.querySelector('.manager-reserves').scrollIntoView({block:'center'})`);
      await p.capture(path.join(captures, `reserve-200-${largeur}.png`));
      for (let n = 0; n < 10; n++) { await groupe(false); assert.equal(await compte(), 0); await groupe(true); assert.equal(await compte(), 8); }
      mesures.push({ largeur, accessibles: vus.size, dom: await p.evaluer('document.querySelectorAll("*").length') });
      assert.equal(await p.evaluer('document.documentElement.scrollWidth > innerWidth'), false);
      console.log(`Réserve ${largeur}px : permutation réelle et 200 réservistes accessibles, OK.`);
    }
    // Ancienne présentation sans cartes : repli et réouverture restent fonctionnels.
    await p.ouvrir('http://127.0.0.1:5188/scripts/apercuReserveManager.html?nombre=60&classique');
    await p.jusqua(`Boolean(document.querySelector('.manager-reserves'))`);
    assert.equal(await compte(), 12);
    await cliquer(`document.querySelector('.manager-reserves summary')`); await attendre(100);
    assert.equal(await compte(), 0);
    await cliquer(`document.querySelector('.manager-reserves summary')`); await attendre(100);
    assert.equal(await compte(), 12);
    assert.deepEqual(erreurs, []);
    fs.writeFileSync('verification-reserve-navigateur.json', JSON.stringify({ captures, mesures, erreurs }, null, 2));
    console.log('Réserve : recette ordinateur/mobile validée. Captures : ' + captures);
  } finally { await p.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
