const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');

(async () => {
  const p = await ouvrirNavigateur({ port: 9273 });
  const temporaire = fs.realpathSync(os.tmpdir());
  const captures = fs.mkdtempSync(path.join(temporaire, 'destiny-optimisation-'));
  const erreurs = [], mesures = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  const clic = async selecteur => {
    await p.jusqua(`Boolean(document.querySelector(${JSON.stringify(selecteur)}))`);
    await p.evaluer(`(()=>{const e=document.querySelector(${JSON.stringify(selecteur)});e.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));e.focus();e.click();})()`);
    await attendre(100);
  };
  const touche = async key => {
    await p.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key });
    await p.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key });
    await attendre(80);
  };
  const chercher = async texte => {
    await p.evaluer(`document.querySelector('.sel-recherche input').focus()`);
    await p.envoyer('Input.insertText', { text: texte });
  };
  const attendreFermeture = () => p.jusqua(`!document.querySelector('.sel-menu')`);
  try {
    for (const [largeur, hauteur] of [[1920,1080],[390,844]]) {
      await p.dimensions(largeur, hauteur);
      await p.ouvrir('http://127.0.0.1:5188/scripts/apercuOptimisation.html');
      await p.jusqua(`Boolean(window.__bancOptimisation) && Boolean(document.querySelector('#equipes'))`);
      const grandeListe = await p.evaluer(`__bancOptimisation.mesurer(true)`);
      assert.ok(grandeListe.lectures <= 16, 'Fermé : seule la sélection est traduite même quand les options sont remplacées.');
      const nombres = await p.evaluer('__bancOptimisation.mesurerNombres()');
      await clic('#equipes');
      await p.jusqua(`document.querySelectorAll('.sel-option').length===2000`);
      assert.equal(await p.evaluer(`document.querySelectorAll('.sel-groupe').length`), 2);
      await chercher('herault');
      await p.jusqua(`document.querySelectorAll('.sel-option').length===1`);
      assert.match(await p.evaluer(`document.querySelector('.sel-option').innerText`), /Béziers/);
      await clic('.sel-option'); await attendreFermeture();
      assert.equal(await p.evaluer(`document.querySelector('#choix').textContent`), '37');
      await clic('#equipes'); await chercher('aucune-équipe-possible');
      await p.jusqua(`Boolean(document.querySelector('.sel-vide'))`);
      await touche('Escape'); await attendreFermeture();
      await clic('#equipes'); await p.jusqua(`document.querySelectorAll('.sel-option').length===2000`);
      await touche('End'); await touche('Enter'); await attendreFermeture();
      assert.equal(await p.evaluer(`document.querySelector('#choix').textContent`), '1999');
      await clic('#equipes');
      const courantVisible = await p.evaluer(`(()=>{const o=document.querySelector('.sel-option.choisie').getBoundingClientRect(),l=document.querySelector('.sel-liste').getBoundingClientRect();return o.top>=l.top-1 && o.bottom<=l.bottom+1;})()`);
      assert.equal(courantVisible, true, 'La sélection reste visible à la réouverture.');
      await touche('Home'); await touche('Enter'); await attendreFermeture();
      await p.evaluer(`__bancOptimisation.choisirLangue('en')`);
      assert.match(await p.evaluer(`document.querySelector('#equipes').innerText`), /Easy/);
      await clic('#equipes'); await p.evaluer(`__bancOptimisation.choisirLangue('fr')`);
      assert.match(await p.evaluer(`document.querySelector('.sel-option').innerText`), /Facile/);
      const position = await p.evaluer(`(()=>{const r=document.querySelector('.sel-menu').getBoundingClientRect();return {gauche:r.left,droite:r.right,haut:r.top,bas:r.bottom,largeur:innerWidth,hauteur:innerHeight};})()`);
      assert.ok(position.gauche >= 0 && position.droite <= position.largeur + 1 && position.haut >= 0 && position.bas <= position.hauteur + 1);
      await p.capture(path.join(captures, `listes-${largeur}.png`));
      await clic('#autre'); await attendreFermeture();
      assert.equal(await p.evaluer(`document.querySelector('#choix').textContent`), '1999');
      mesures.push({ largeur, grandeListe, nombres });

      await p.ouvrir('http://127.0.0.1:5188/scripts/apercuFluiditeManager.html');
      await p.jusqua(`Boolean(window.__fluiditeManager) && document.querySelectorAll('.manager-onglets button').length>0`);
      await p.evaluer(`(async()=>{const t=await import('/src/lib/tutoriel/memoire.ts');t.desactiverLesTutoriels(true);})()`);
      await p.evaluer(`[...document.querySelectorAll('.manager-onglets button')].find(e=>e.textContent.trim()==='Composition').click()`);
      await p.jusqua(`Boolean(document.querySelector('.manager-feuille-visuelle'))`);
      const feuilleAvant = await p.evaluer(`JSON.stringify(__fluiditeManager.useGame.getState().manager.composition)`);
      await p.evaluer(`[...document.querySelectorAll('.ct-groupes button')].find(e=>e.textContent.includes('Réserve')).click()`);
      await p.jusqua(`document.querySelector('.manager-feuille-visuelle').dataset.groupe==='reserves'`);
      assert.equal(await p.evaluer(`JSON.stringify(__fluiditeManager.useGame.getState().manager.composition)`), feuilleAvant);
      await p.capture(path.join(captures, `reserve-${largeur}.png`));
      // La composition s'ouvre dans un terrain agrandi ; ses tactiques restent
      // derrière la modale jusqu'au retour au bureau.
      await clic('[data-tuto="compo-fermer"]');
      await p.jusqua(`!document.querySelector('#root').inert`);
      await clic('.manager-tactiques-selects .sel-declencheur');
      await p.jusqua(`document.querySelectorAll('.sel-option').length>0`);
      await touche('End'); await touche('Enter'); await attendreFermeture();
      assert.equal(await p.evaluer(`JSON.stringify(__fluiditeManager.useGame.getState().manager.composition)`), feuilleAvant);
      const nomTitulaire = await p.evaluer(`document.querySelector('.rapport-adjoint ol .ra-qui b').textContent`);
      const rapportInitial = await p.evaluer(`JSON.stringify([...document.querySelectorAll('.rapport-adjoint ol .ra-qui b')].map(e=>e.textContent))`);
      await clic('.ra-consignes summary');
      const consigne = index => p.evaluer(`(()=>{const l=[...document.querySelectorAll('.ra-consignes .ra-ligne')].find(e=>e.querySelector('.ra-qui b').textContent===${JSON.stringify(nomTitulaire)});l.querySelectorAll('.ra-choix button')[${index}].click();})()`);
      await consigne(2);
      await p.jusqua(`![...document.querySelectorAll('.rapport-adjoint ol .ra-qui b')].some(e=>e.textContent===${JSON.stringify(nomTitulaire)})`);
      await consigne(0);
      await p.jusqua(`JSON.stringify([...document.querySelectorAll('.rapport-adjoint ol .ra-qui b')].map(e=>e.textContent))===${JSON.stringify(rapportInitial)}`);
      assert.equal(await p.evaluer(`document.documentElement.scrollWidth>innerWidth`), false);
      console.log(`OK ${largeur}px — toutes les options, recherche accentuée, clavier, langue, sélection, réserve, tactique et actualisation de l'adjoint.`);
    }
    assert.deepEqual(erreurs, []);
    console.log(JSON.stringify({ mesures, erreurs }));
  } finally {
    await p.fermer();
    if (process.env.DESTINY_GARDER_CAPTURES === '1') console.log('Captures de vérification : ' + captures);
    else {
      const cible = path.resolve(captures);
      assert.ok(cible.startsWith(temporaire + path.sep) && path.basename(cible).startsWith('destiny-optimisation-'), 'Dossier de captures hors du temporaire prévu.');
      fs.rmSync(cible, { recursive: true, force: true });
    }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
