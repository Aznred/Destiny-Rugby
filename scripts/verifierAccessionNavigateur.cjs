const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');
(async () => {
  const p = await ouvrirNavigateur({ port:9276 });
  const temporaire = fs.realpathSync(os.tmpdir());
  const captures = fs.mkdtempSync(path.join(temporaire, 'destiny-accession-'));
  const erreurs = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  try {
    for (const [largeur,hauteur] of [[1920,1080],[390,844]]) {
      await p.dimensions(largeur,hauteur);
      for (const [division,nombre] of [['fed2',8],['fed1',4],['nationale2',2]]) {
        await p.ouvrir(`http://127.0.0.1:5188/scripts/apercuRetoursReglements.html?division=${division}`);
        await p.jusqua(`Boolean(document.querySelector('[data-promus="0"]'))`);
        assert.equal(await p.evaluer(`document.querySelectorAll('.clt-rang[data-statut^="PROMOTION"]').length`), 0);
        assert.ok((await p.evaluer(`document.querySelector('.regle-accession').innerText`)).includes(`${nombre} clubs`));
        for (let tour=0;tour<3;tour++) {
          await p.evaluer(`document.querySelector('section button').click()`); await attendre(150);
          assert.equal(await p.evaluer(`Number(document.querySelector('[data-promus]').dataset.promus)`), tour<2?0:nombre);
        }
        const promus = await p.evaluer(`document.querySelector('[data-promus]').textContent`);
        await p.evaluer(`document.querySelector('.regle-accession').scrollIntoView({block:'center'})`);
        await p.capture(path.join(captures,`${division}-${largeur}.png`));
        await p.evaluer(`document.querySelector('section button').click()`); await attendre(100);
        assert.equal(await p.evaluer(`document.querySelector('[data-promus]').textContent`),promus,'Perdre au tour suivant ne retire pas la montée.');
        assert.equal(await p.evaluer(`document.documentElement.scrollWidth>innerWidth`), false);
        for (const ecran of ['manager','tableau']) {
          await p.ouvrir(`http://127.0.0.1:5188/scripts/apercuAccessionCarriere.html?division=${division}&ecran=${ecran}`);
          await p.jusqua(`Boolean(document.querySelector('.regle-accession'))`);
          assert.ok((await p.evaluer(`document.querySelector('.regle-accession').textContent`)).includes(`${nombre} clubs`));
          assert.equal(await p.evaluer(`document.documentElement.scrollWidth>innerWidth`), false);
          if(ecran==='manager') {
            await p.evaluer(`[...document.querySelectorAll('.manager-onglets button')].find(b=>b.textContent==='Calendrier').click()`);
            await p.jusqua(`Boolean(document.querySelector('.manager-calendrier .regle-accession')) || Boolean(document.querySelector('.regle-accession'))`);
            assert.equal(await p.evaluer(`document.querySelectorAll('.manager-cal-reglement').length`),0,'Le calendrier ne promet plus la montée au champion seul.');
          }
        }
        console.log(`OK ${division} ${largeur}px : ${nombre} promus, aucune montée au classement, bureau, calendrier et tableau.`);
      }
    }
    assert.deepEqual(erreurs, []);
  } finally {
    await p.fermer();
    if(process.env.DESTINY_GARDER_CAPTURES==='1') console.log('Captures : '+captures);
    else { assert.ok(path.resolve(captures).startsWith(temporaire+path.sep) && path.basename(captures).startsWith('destiny-accession-')); fs.rmSync(captures,{recursive:true,force:true}); }
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
