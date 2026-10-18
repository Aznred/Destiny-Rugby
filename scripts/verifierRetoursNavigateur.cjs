const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');
const sortie = fs.mkdtempSync(path.join(os.tmpdir(), 'destiny-reglements-'));
const controles = [];
(async () => {
  const p = await ouvrirNavigateur();
  const erreurs = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  try {
    for (const [largeur, hauteur] of [[1920, 1080], [390, 844]]) {
      await p.dimensions(largeur, hauteur);
      for (const division of ['nationale2', 'fed1', 'fed2', 'fed3', 'reg1', 'premiership', 'challengeCup']) {
        await p.ouvrir(`http://127.0.0.1:5188/scripts/apercuRetoursReglements.html?division=${division}`);
        await p.jusqua(`document.querySelector('main')?.dataset.division==='${division}' && document.querySelectorAll('.clt [role="row"]').length>5`);
        const lire = () => p.evaluer(`({deborde:document.documentElement.scrollWidth>innerWidth,texte:document.body.innerText,tours:[...document.querySelectorAll('.arbre-titre')].map(e=>e.textContent)})`);
        let etat = await lire(); assert.equal(etat.deborde, false, `${division} ${largeur}`);
        if (division === 'premiership') assert.ok(!etat.texte.includes('Relégation directe') && !etat.texte.includes('Match d’accès'));
        else {
          if (division === 'challengeCup') assert.equal(etat.tours[0], 'Huitièmes de finale');
          else if (division !== 'reg1') assert.equal(etat.tours[0], 'Barrage');
          else assert.ok(etat.tours.length);
          await p.evaluer(`document.querySelector('section button').click()`); await attendre(200);
          etat = await lire(); assert.equal(etat.deborde, false);
          assert.ok(etat.tours.length > 1);
          await p.evaluer(`document.querySelector('.arbre').scrollIntoView({block:'center'})`);
        }
        await p.capture(path.join(sortie, `${division}-${largeur}.png`));
        controles.push({ division, largeur, tours: etat.tours }); console.log(`${division} ${largeur}px : OK`);
      }
    }
    assert.deepEqual(erreurs, []);
    fs.writeFileSync(path.resolve('verification-retours-navigateur.json'), JSON.stringify({ captures: sortie, controles, erreurs }, null, 2));
    console.log('Recette ordinateur/mobile : OK. Captures : ' + sortie);
  } finally { await p.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
