const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');
const base = process.env.DESTINY_URL || 'http://127.0.0.1:5188';
const sortie = path.resolve('trailer/verification-duree');
fs.mkdirSync(sortie, { recursive: true });

(async () => {
  const p = await ouvrirNavigateur({ largeur: 1920, hauteur: 1080 });
  const erreurs = [];
  p.ecouter('Runtime.exceptionThrown', m => erreurs.push(m.exceptionDetails.exception?.description || m.exceptionDetails.text));
  const clic = async selecteur => {
    await p.jusqua(`Boolean(document.querySelector(${JSON.stringify(selecteur)}))`);
    await p.evaluer(`document.querySelector(${JSON.stringify(selecteur)}).click()`); await attendre(250);
  };
  const choix = async n => clic(`.choix-duree-match input[value="${n}"]`);
  const valeur = () => p.evaluer('window.__useGame.getState().dureeMiTempsSolo');
  const mesurer = async nom => {
    await p.jusqua(`document.querySelectorAll('.choix-duree-match-options label').length===8`);
    const etat = await p.evaluer(`({ deborde:document.documentElement.scrollWidth>innerWidth,
      cases:[...document.querySelectorAll('.choix-duree-match-options label')].map(e=>{const r=e.getBoundingClientRect();return {largeur:r.width,hauteur:r.height};}),
      coche:document.querySelector('.choix-duree-match input:checked')?.value })`);
    assert.equal(etat.deborde, false, nom);
    assert.equal(etat.cases.length, 8, nom);
    assert.ok(etat.cases.every(c => c.hauteur >= 44 && c.largeur >= 44), nom);
    await p.evaluer(`document.querySelector('.choix-duree-match').scrollIntoView({block:'center'})`);
    await attendre(250); await p.capture(path.join(sortie, nom + '.png'));
  };
  try {
    console.log('Ouverture de la vraie application…');
    await p.ouvrir(base); await p.jusqua('Boolean(window.__useGame)');
    await p.evaluer(`(async()=>{const t=await import('/src/lib/tutoriel/memoire.ts');t.desactiverLesTutoriels(true);__useGame.getState().setLangue('fr');__useGame.getState().setIAActivee(false);__useGame.getState().setEcran('creation');})()`);
    await clic('.cr-modes-grille .cr-mode:first-child'); await clic('[data-tuto="cr-origine-creer"]');
    await mesurer('creation-joueur-desktop');
    await choix(3); assert.equal(await valeur(), 3);
    await p.evaluer(`(()=>{const e=document.querySelector('#nom');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Camille Martin');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await clic('[data-tuto="cr-valider"]');
    await p.jusqua('Boolean(__useGame.getState().joueur)');
    assert.equal(await valeur(), 3, 'la création conserve la durée choisie');
    console.log('Création joueur : choix appliqué.');
    await clic('button[aria-label="Paramètres"]');
    await choix(10); await mesurer('reglages-desktop');
    await clic('.modale .rangee-fin button');
    const origine = await p.evaluer('performance.timeOrigin');
    await p.envoyer('Page.reload');
    await p.jusqua(`performance.timeOrigin!==${origine} && Boolean(window.__useGame)`);
    assert.equal(await valeur(), 10, 'durée rechargée depuis la sauvegarde');
    await p.dimensions(390, 844); await clic('button.nav-reglages-mobile');
    await mesurer('reglages-mobile'); await choix(5); await clic('.modale .rangee-fin button');
    await p.evaluer(`__useGame.getState().setEcran('creationManager')`);
    await mesurer('creation-manager-mobile');
    await choix(8); await clic('[data-tuto="cm-valider"]');
    await p.jusqua('Boolean(__useGame.getState().manager)'); assert.equal(await valeur(), 8);
    for (const sauvegarde of [{}, { dureeMiTempsSolo: -10 }]) {
      assert.equal(await p.evaluer(`__useGame.persist.getOptions().merge(${JSON.stringify(sauvegarde)},__useGame.getState()).dureeMiTempsSolo`), 6, 'ancienne sauvegarde ou valeur invalide : six minutes');
    }
    console.log('Réglages, rechargement et création entraîneur : OK, ordinateur et mobile.');
    await p.ouvrir(base + '/scripts/apercuCorrectif37.html');
    await p.jusqua(`location.pathname==='/scripts/apercuCorrectif37.html' && Boolean(window.__useGame)`);
    await p.jusqua(`Boolean(document.querySelector('.ce-modes button.fantome'))`);
    await p.evaluer(`__useGame.getState().setDureeMiTempsSolo(5)`);
    await clic('.ce-modes button.fantome');
    await p.jusqua('Boolean(window.__matchLive)');
    assert.equal(await p.evaluer('__matchLive.e.dureeMiTempsSolo'), 5, 'préférence transmise au match');
    await p.evaluer('__useGame.getState().setDureeMiTempsSolo(20)');
    assert.equal(await p.evaluer('__matchLive.e.dureeMiTempsSolo'), 5, 'la durée du match ouvert reste figée');
    assert.deepEqual(erreurs, [], 'pas d’exception dans le parcours');
    console.log('Moteur réel : durée choisie reçue et figée pour le match en cours. Aucune exception.');
    fs.writeFileSync(path.join(sortie, 'rapport.json'), JSON.stringify({ resultat: 'OK', formats: ['1920×1080', '390×844'], erreurs }, null, 2));
  } finally { await p.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
