const assert = require('node:assert/strict');
const { ouvrirNavigateur } = require('./outilsNavigateur.cjs');
(async () => {
  const p = await ouvrirNavigateur({port: 9286});
  const erreurs = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  try {
    for (const [largeur, hauteur] of [[1440,1000],[390,844]]) {
      await p.dimensions(largeur, hauteur);
      await p.ouvrir('http://127.0.0.1:5188/scripts/apercuRetraitEffectif.html');
      await p.jusqua('document.querySelectorAll(".fiche-club .ligne-joueur").length === 26');
      assert.equal(await p.evaluer('document.querySelector("output").dataset.catalogue'), '0');
      assert.equal(await p.evaluer('document.querySelector(".fiche-club h2").textContent'), 'Le Relecq Kerhuon Rugby');
      const simule = await p.evaluer("import('/src/lib/i18n.ts').then(m=>m.t('fc.effectifSimule'))");
      assert.ok((await p.evaluer('document.querySelector(".fiche-club-stats").textContent')).includes(simule));
      assert.equal(await p.evaluer('document.documentElement.scrollWidth > innerWidth'), false);
      const noms = await p.evaluer('[...document.querySelectorAll(".fiche-club .j-nom")].map(e=>e.textContent)');
      assert.ok(noms.every(n => n.trim()));
      await p.evaluer('document.querySelector(".fiche-club-fermer").click()');
      await p.jusqua('!document.querySelector(".fiche-club")');
      await p.evaluer('document.querySelector("main button").click()');
      await p.jusqua('document.querySelectorAll(".fiche-club .ligne-joueur").length === 26');
      assert.deepEqual(await p.evaluer('[...document.querySelectorAll(".fiche-club .j-nom")].map(e=>e.textContent)'), noms);
      console.log(`OK ${largeur}px : club conservé, aucune carte dans le catalogue, effectif fictif identifié, fermeture et réouverture stables.`);
    }
    assert.deepEqual(erreurs, []);
  } finally { await p.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
