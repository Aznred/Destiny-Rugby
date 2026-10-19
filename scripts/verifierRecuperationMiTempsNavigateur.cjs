const assert = require('node:assert/strict');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');
(async () => {
  const p = await ouvrirNavigateur({ port: 9284 });
  const erreurs = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  const lire = () => p.evaluer(`({phase:document.querySelector('output').dataset.phase,horloge:Number(document.querySelector('output').dataset.horloge),joueurs:[...document.querySelectorAll('.joueur')].map(e=>({avant:Number(e.dataset.avant),endurance:Number(e.dataset.endurance)}))})`);
  const clic = async id => { await p.evaluer(`document.getElementById(${JSON.stringify(id)}).click()`); await attendre(50); };
  try {
    for (const [largeur, hauteur] of [[1440, 1000], [390, 844]]) {
      await p.dimensions(largeur, hauteur);
      await p.ouvrir('http://127.0.0.1:5188/scripts/apercuRecuperationMiTemps.html');
      await p.jusqua('document.querySelectorAll(".joueur").length === 46 && document.querySelector("output").dataset.phase === "ballonLibre"');
      await clic('pause');
      const pause = await lire(); assert.equal(pause.phase, 'miTemps');
      assert.ok(pause.joueurs.every(p => p.endurance === Math.min(100, p.avant + 15)));
      await clic('attendre'); assert.deepEqual(await lire(), pause);
      await clic('reprendre');
      const reprise = await lire(); assert.equal(reprise.phase, 'coupEnvoi');
      assert.deepEqual(reprise.joueurs, pause.joueurs);
      assert.equal(await p.evaluer('document.documentElement.scrollWidth > innerWidth'), false);
      console.log(`OK ${largeur}px : 46 joueurs, récupération partielle, plafond, pause sans double gain et reprise.`);
    }
    assert.deepEqual(erreurs, []);
  } finally { await p.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
