const assert = require('node:assert/strict');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');
(async () => {
  const p = await ouvrirNavigateur({ port: 9285 });
  const erreurs = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  const clic = async selecteur => {
    await p.evaluer(`(() => { const e=document.querySelector(${JSON.stringify(selecteur)}); if(!e||e.disabled) throw Error('Bouton absent ou désactivé'); e.click(); })()`);
    await attendre(80);
  };
  const copie = () => p.evaluer(`(() => { const e=[...document.querySelectorAll('.manager-reserve-carte')].find(e=>e.textContent.includes('Copie de ')); if(!e)throw Error('Copie absente'); e.click(); })()`);
  const donnees = () => p.evaluer('({...document.querySelector("output").dataset})');
  try {
    for (const [largeur, hauteur] of [[1440,1000],[390,844]]) {
      await p.dimensions(largeur, hauteur);
      if (largeur === 1440) {
        await p.ouvrir('http://127.0.0.1:5188/scripts/apercuDoublonsLigue.html');
        await p.jusqua('document.querySelectorAll(".manager-position").length === 15');
      } else await clic('#reinitialiser');
      const avant = await donnees();
      await clic('.ct-groupes button:nth-child(2)');
      await copie(); await clic('.manager-position:nth-child(2) button.ct-carte');
      await p.jusqua('document.querySelector(".cel-erreur-compo")?.textContent.includes("déjà sur la feuille")');
      assert.equal(await p.evaluer('document.querySelector("[data-tuto=cel-compo-enregistrer]").disabled'), true);
      assert.deepEqual(await donnees(), avant, 'Le placement interdit ne change pas la composition.');
      // Une autre carte de la même personne peut remplacer celle qui occupe sa place.
      await copie(); await clic('.manager-position:first-child button.ct-carte');
      assert.equal(await p.evaluer('Boolean(document.querySelector(".cel-erreur-compo"))'), false);
      await clic('[data-tuto=cel-compo-enregistrer]');
      await p.jusqua('document.querySelector("output").dataset.commandes === "1"');
      const remplacee = await donnees();
      assert.equal(JSON.parse(remplacee.feuille)[0], 'exemplaire-en-double');
      assert.equal(new Set(JSON.parse(remplacee.identites)).size, 23);
      // Les anciens modèles contenant deux copies sont aussi refusés au chargement.
      await clic('.cel-details-outils:first-of-type summary');
      await clic('.cel-equipe-sauvegardee button');
      await p.jusqua('Boolean(document.querySelector(".cel-erreur-compo"))');
      assert.deepEqual(await donnees(), remplacee);
      await clic('[data-tuto=cel-assembler]');
      await p.jusqua('!document.querySelector("[data-tuto=cel-compo-enregistrer]").disabled');
      await clic('[data-tuto=cel-compo-enregistrer]');
      await p.jusqua('document.querySelector("output").dataset.commandes === "2"');
      assert.equal(new Set(JSON.parse((await donnees()).identites)).size, 23);
      assert.equal(await p.evaluer('document.documentElement.scrollWidth > innerWidth'), false);
      console.log(`OK ${largeur}px : copie supplémentaire bloquée, changement de version permis, ancien modèle refusé et assemblage de 23 personnes.`);
    }
    assert.deepEqual(erreurs, []);
  } catch (e) { console.error(erreurs); console.error(await p.evaluer('document.body.innerText.slice(-1800)')); throw e; }
  finally { await p.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
