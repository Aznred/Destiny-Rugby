const assert = require('node:assert/strict');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');

(async () => {
  const p = await ouvrirNavigateur({ port: 9281 });
  const erreurs = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  try {
    for (const [largeur, hauteur] of [[1440, 1000], [390, 844]]) {
      await p.dimensions(largeur, hauteur);
      await p.ouvrir('http://127.0.0.1:5188/scripts/apercuCorrectif42.html?pack=1');
      await p.jusqua('document.querySelectorAll(".offre-pub .btn.primaire").length > 1');
      await p.evaluer('document.querySelector("[data-essai=manque]").click()');
      await p.evaluer('document.querySelector(".pub-manque button.pub-manque-action").click()');
      await p.jusqua('Boolean(document.querySelector(".pub-lecteur .btn.primaire"))');
      assert.equal(await p.evaluer('document.querySelector(".pub-lecteur").closest(".pub-overlay").inert'), false, 'Le lecteur au-dessus de la fenêtre des Ovas reste actif.');
      await p.evaluer('document.querySelector(".pub-lecteur .btn.primaire").click()');
      await p.jusqua('Boolean(document.querySelector("#applixir-ad-container button"))');
      await p.evaluer(`(() => {
        const video = document.createElement('video'); video.load = () => { throw new Error('Média démonté'); };
        document.querySelector('#applixir-ad-container').appendChild(video);
        if (window.AudioContext) AudioContext.prototype.createOscillator = () => { throw new Error('Son refusé'); };
      })()`);
      await p.evaluer('document.querySelector("#applixir-ad-container button").click()');
      await p.jusqua('Boolean(document.querySelector(".pub-roulette.gagnee"))');
      assert.equal(await p.evaluer('document.querySelector(".pub-roulette-overlay").inert'), false);
      await p.evaluer('document.querySelector(".pub-roulette .btn.primaire").click()');
      await p.jusqua('Boolean(document.querySelector(".pack-show"))');
      assert.equal(await p.evaluer('document.querySelector(".pack-show").inert'), false, 'Le vrai pack ouvert au-dessus de la roulette reste utilisable.');
      assert.equal(await p.evaluer('Boolean(document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest(".pack-show"))'), true, 'Le pack est devant la roulette.');
      await p.evaluer('document.querySelector(".pack-show-touch").click()');
      await p.jusqua('Boolean(document.querySelector("[data-tuto=pack-suite]"))');
      await p.evaluer('document.querySelector("[data-tuto=pack-suite]").click()');
      await p.jusqua('!document.querySelector(".pub-overlay")');
      assert.equal(await p.evaluer('document.getElementById("root").inert'), false, 'Le jeu répond après ouverture du pack.');
      assert.equal(await p.evaluer('document.body.style.overflow'), '');
      // Annulation d'un lecteur imbriqué, puis fermeture de son parent.
      await p.ouvrir('http://127.0.0.1:5188/scripts/apercuCorrectif42.html');
      await p.jusqua('document.querySelectorAll(".offre-pub .btn.primaire").length > 1');
      await p.evaluer('document.querySelector("[data-essai=manque]").click()');
      await p.evaluer('document.querySelector(".pub-manque button.pub-manque-action").click()');
      await p.jusqua('Boolean(document.querySelector(".pub-lecteur"))');
      await p.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
      await attendre(100);
      assert.equal(await p.evaluer('Boolean(document.querySelector(".pub-manque"))'), true, 'Échap ferme seulement le lecteur au premier plan.');
      assert.equal(await p.evaluer('document.querySelector(".pub-manque").closest(".pub-overlay").inert'), false);
      await p.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
      await p.jusqua('!document.querySelector(".pub-overlay")');
      assert.equal(await p.evaluer('document.getElementById("root").inert'), false);
      console.log(`OK ${largeur}px : vidéo, roulette, pack, annulation et fenêtres imbriquées.`);
      for (const division of ['fed2', 'fed1', 'nationale2']) {
        await p.ouvrir(`http://127.0.0.1:5188/scripts/apercuRetoursReglements.html?division=${division}`);
        await p.jusqua('document.querySelectorAll(".arbre-match").length > 0');
        for (let tour = 0; tour < 8; tour++) {
          if (await p.evaluer('Boolean(document.querySelector(".arbre-match.finale:not(.a-venir)"))')) break;
          await p.evaluer('document.querySelector("section button").click()'); await attendre(100);
        }
        assert.equal(await p.evaluer('document.querySelectorAll(".arbre-match.finale:not(.a-venir) .vainqueur").length'), 1, `${division} : une finale jouée et un seul champion visible.`);
        assert.equal(await p.evaluer('document.querySelectorAll(".arbre-match.a-venir").length'), 0);
        console.log(`OK ${division} ${largeur}px : tous les tours puis un champion visible.`);
      }
    }
    assert.deepEqual(erreurs, []);
  } catch (e) { console.error(erreurs); console.error(await p.evaluer('document.body.innerText.slice(0,3000)')); throw e; }
  finally { await p.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
