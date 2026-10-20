const assert = require('node:assert/strict');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');

(async () => {
  const p = await ouvrirNavigateur({ port: 9286 });
  const erreurs = [];
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  const clic = async selecteur => {
    await p.evaluer(`(() => { const e=document.querySelector(${JSON.stringify(selecteur)}); if(!e || e.disabled) throw Error('Bouton absent ou désactivé: '+${JSON.stringify(selecteur)}); e.click(); })()`);
    await attendre(50);
  };
  const saisir = async (selecteur, valeur) => {
    await p.evaluer(`(() => { const e=document.querySelector(${JSON.stringify(selecteur)}); if(!e)throw Error('Champ absent'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(valeur)}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await attendre(30);
  };
  const texte = cle => p.evaluer(`import('/src/lib/i18n.ts').then(m => m.t(${JSON.stringify(cle)}))`);
  const envoi = '.cn-joueurs-section ~ .complete-carte-actions-fin button';
  try {
    for (const [largeur, hauteur] of [[1440,1000],[390,844]]) {
      await p.dimensions(largeur, hauteur);
      for (const langue of ['fr','en','es','it','de','pt','ja']) {
        await p.ouvrir(`http://127.0.0.1:5188/scripts/apercuContributionClub.html?langue=${langue}`);
        await p.jusqua('!!document.querySelector(".complete-carte-onglets")');
        for (let onglet=0; onglet<5; onglet++) {
          await clic(`.complete-carte-onglets button:nth-child(${onglet+1})`);
          assert.equal(await p.evaluer('document.documentElement.scrollWidth > innerWidth'), false, `${langue}, ${largeur}px, onglet ${onglet}`);
        }
        await clic('.complete-carte-onglets button:nth-child(3)');
        assert.equal(await p.evaluer('document.querySelector(".complete-carte-sous-titre h2").textContent.trim()'), await texte('contributionCarte.clubTitre'));
        assert.equal(await p.evaluer('document.querySelector(".cn-effectif-entete h3").textContent.trim()'), await texte('contributionCarte.effectif'));
        await saisir('.complete-carte-colonne-formulaire input[type=text]', 'Club Témoin Hors Catalogue');
        await clic('.cn-droits input');
        assert.equal(await p.evaluer(`document.querySelector(${JSON.stringify(envoi)}).disabled`), true, 'Un club sans joueurs ne peut pas être envoyé.');
        await clic('.cn-terrain-proposition button');
        await clic('.cn-nouveau-joueur-formulaire > .cn-actions button');
        assert.equal(await p.evaluer('document.querySelector(".cn-nouveau-joueur-formulaire [role=alert]").textContent'), await texte('contributionCarte.validation.nom'));
        await clic('.cn-nouveau-joueur-formulaire > .cn-actions button:last-child');
        console.log(`OK ${langue}, ${largeur}px : cinq onglets, libellés et erreur traduits, envoi incomplet bloqué.`);
      }
      // Saisie réelle du XV et des huit remplaçants, sans injecter l'état React.
      await p.ouvrir(`http://127.0.0.1:5188/scripts/apercuContributionClub.html?langue=${largeur===1440?'en':'fr'}`);
      await p.jusqua('!!document.querySelector(".complete-carte-onglets")');
      await clic('.complete-carte-onglets button:nth-child(3)');
      await saisir('.complete-carte-colonne-formulaire input[type=text]', 'Club Témoin Hors Catalogue');
      await clic('.cn-droits input');
      const ajouter = async i => {
        if (i < 15) {
          await p.evaluer(`([...document.querySelectorAll('.cn-terrain-proposition button')].find(b=>b.querySelector('b').textContent==='${i+1}')).click()`);
          await attendre(50);
        } else await clic('.cn-effectif-entete button');
        await saisir('.cn-nouveau-joueur-formulaire input[maxlength="80"]', `Joueur Témoin ${i+1}`);
        await clic('.cn-nouveau-joueur-formulaire > .cn-actions button');
        await p.jusqua('!document.querySelector(".cn-nouveau-joueur-formulaire")');
      };
      for (let i=0; i<23; i++) {
        await ajouter(i);
        assert.equal(await p.evaluer(`document.querySelector(${JSON.stringify(envoi)}).disabled`), i<22, `Envoi à ${i+1} joueurs`);
      }
      assert.equal(await p.evaluer('document.querySelectorAll(".cn-terrain-proposition button.renseigne").length'), 15);
      await clic('.cn-joueur-carte-mini:last-child .cn-actions button:last-child');
      assert.equal(await p.evaluer(`document.querySelector(${JSON.stringify(envoi)}).disabled`), true, 'Retirer un remplaçant rebloque l’envoi.');
      await ajouter(22);
      await clic(envoi);
      await p.jusqua('!!document.querySelector(".complete-carte-message.succes")');
      assert.equal(await p.evaluer('document.querySelector(".complete-carte-message.succes span").textContent'), await texte('contributionCarte.clubEnvoye'));
      await clic('.complete-carte-onglets button:last-child');
      await p.jusqua('document.querySelectorAll(".cn-demande-carte").length === 2');
      assert.equal(await p.evaluer('document.querySelector(".cn-demande-carte h3").textContent'), 'Club Témoin Hors Catalogue');
      assert.match(await p.evaluer('document.querySelector(".cn-demande-details-club").textContent'), /23/);
      assert.equal(await p.evaluer('document.documentElement.scrollWidth > innerWidth'), false);
      console.log(`OK ${largeur}px : 15 postes + 8 remplaçants saisis, retrait contrôlé, proposition de 23 joueurs envoyée et suivie.`);
    }
    assert.deepEqual(erreurs, []);
  } catch (e) { console.error(await p.evaluer('document.body.innerText.slice(-1600)')); throw e; }
  finally { await p.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
