const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');
const captures = fs.mkdtempSync(path.join(os.tmpdir(), 'destiny-forme-'));
(async () => {
  const p = await ouvrirNavigateur({ port: 9264 });
  const erreurs = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  const clic = async s => { await p.jusqua(`Boolean(document.querySelector(${JSON.stringify(s)}))`); await p.evaluer(`document.querySelector(${JSON.stringify(s)}).click()`); await attendre(100); };
  const choisir = n => clic(`.choix-difficulte-carriere input[value="${n}"]`);
  const verifier = async nom => {
    await p.jusqua(`document.querySelectorAll('.difficulte-carriere-options label').length===3`);
    const mesures = await p.evaluer(`({deborde:document.documentElement.scrollWidth>innerWidth,cases:[...document.querySelectorAll('.difficulte-carriere-options label')].map(e=>e.getBoundingClientRect().height),textes:document.querySelector('.choix-difficulte-carriere').innerText})`);
    assert.equal(mesures.deborde, false); assert.ok(mesures.cases.every(h => h >= 44));
    assert.ok(['Facile','Moyen','Difficile'].every(t => mesures.textes.includes(t)));
    await p.evaluer(`document.querySelector('.choix-difficulte-carriere').scrollIntoView({block:'center'})`);
    await p.capture(path.join(captures, nom + '.png'));
  };
  try {
    await p.ouvrir('http://127.0.0.1:5188');
    await p.jusqua('Boolean(window.__useGame)');
    await p.evaluer(`(async()=>{const t=await import('/src/lib/tutoriel/memoire.ts');t.desactiverLesTutoriels(true);__useGame.getState().setLangue('fr');__useGame.getState().setIAActivee(false);})()`);
    for (const [largeur,hauteur] of [[1920,1080],[390,844]]) {
      await p.dimensions(largeur, hauteur);
      await p.evaluer(`__useGame.getState().setEcran('accueil')`); await attendre(150);
      await p.evaluer(`__useGame.getState().setEcran('creation')`);
      await clic('.cr-modes-grille .cr-mode:first-child'); await clic('[data-tuto="cr-origine-creer"]');
      await verifier(`creation-joueur-${largeur}`); await choisir('difficile');
      await clic('[data-tuto="cr-valider"]'); await p.jusqua('Boolean(__useGame.getState().joueur)');
      assert.equal(await p.evaluer('__useGame.getState().joueur.difficulteCarriere'), 'difficile');
      await clic(largeur < 600 ? 'button.nav-reglages-mobile' : 'button[aria-label="Paramètres"]');
      const avant = await p.evaluer('__useGame.getState().joueur.forme');
      await choisir('facile'); await verifier(`parametres-${largeur}`);
      assert.equal(await p.evaluer('__useGame.getState().joueur.forme'), avant, 'changer de niveau ne recharge pas la forme');
      await clic('.modale .rangee-fin button');
      const origine = await p.evaluer('performance.timeOrigin'); await p.envoyer('Page.reload');
      await p.jusqua(`performance.timeOrigin!==${origine} && Boolean(window.__useGame)`);
      assert.equal(await p.evaluer('__useGame.getState().joueur.difficulteCarriere'), 'facile');
      await p.evaluer(`__useGame.getState().setEcran('creationManager')`);
      await choisir('moyen'); await verifier(`creation-entraineur-${largeur}`);
      await clic('[data-tuto="cm-valider"]'); await p.jusqua('Boolean(__useGame.getState().manager)');
      assert.equal(await p.evaluer('__useGame.getState().manager.difficulteCarriere'), 'moyen');
      await p.evaluer(`__useGame.getState().setEcran('creation')`);
      await clic('.cr-modes-grille .cr-mode:first-child'); await clic('[data-tuto="cr-origine-existant"]');
      await clic('.cr-avertissement .btn.primaire');
      await verifier(`joueur-existant-${largeur}`); await choisir('difficile');
      console.log(`Gestion de la forme ${largeur}px : création, réglages, sauvegarde et joueur existant, OK.`);
    }
    assert.deepEqual(erreurs, []);
    fs.writeFileSync('verification-forme-navigateur.json', JSON.stringify({ captures, erreurs }, null, 2));
    console.log('Recette forme ordinateur/mobile : OK. Captures : ' + captures);
  } finally { await p.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
