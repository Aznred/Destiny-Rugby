const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ouvrirNavigateur, attendre } = require('./outilsNavigateur.cjs');

(async () => {
  const p = await ouvrirNavigateur({ port: 9282 });
  const erreurs = [], mesures = [];
  const reseau = [];
  const captures = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'destiny-effectif-'));
  p.ecouter('Runtime.exceptionThrown', e => erreurs.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
  await p.envoyer('Log.enable');
  p.ecouter('Log.entryAdded', e => { if (e.entry.level === 'error') reseau.push(e.entry); });
  const cliquer = async selecteur => {
    const point = await p.evaluer(`(() => { const e = document.querySelector(${JSON.stringify(selecteur)}); if (!e || e.disabled) throw new Error('Bouton absent ou indisponible'); e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await p.envoyer('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await p.envoyer('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
    await attendre(60);
  };
  const mesurer = async () => ({ cartes: await p.evaluer('document.querySelectorAll(".cel-carte-quick").length'),
    dom: await p.envoyer('Memory.getDOMCounters'), tas: await p.envoyer('Runtime.getHeapUsage') });
  const donnees = () => p.evaluer('({...document.querySelector("output").dataset})');
  const identifiants = () => p.evaluer('[...document.querySelectorAll(".cel-carte-quick")].map(e=>e.dataset.carteId)');
  const suivant = '.cel-pagination-effectif:last-of-type button:last-child';
  const precedent = '.cel-pagination-effectif:first-of-type button:first-child';
  const ouvrir = async nombre => {
    await p.ouvrir(`http://127.0.0.1:5188/scripts/apercuEffectifMobile.html?nombre=${nombre}`);
    // Ne pas agir sur les cartes de l'ancien document avant la navigation.
    await p.jusqua(`location.search === '?nombre=${nombre}' && document.querySelector('output')?.dataset.effectif === '${nombre}' && document.querySelectorAll('.cel-carte-quick').length > 0`);
  };
  const choisir = async (champ, option) => {
    await cliquer(`.cel-filtres > .cel-champ:nth-child(${champ + 1}) .sel-declencheur`);
    await p.jusqua('Boolean(document.querySelector("[role=listbox]"))');
    await cliquer(`[role=listbox] .sel-option:nth-of-type(${option})`);
    await p.jusqua('!document.querySelector("[role=listbox]")');
  };
  try {
    for (const [largeur, hauteur, densite] of [[1440,1000,1],[390,844,3]]) {
      await p.envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: densite, mobile: largeur < 600 });
      await p.envoyer('Emulation.setTouchEmulationEnabled', { enabled: largeur < 600, maxTouchPoints: 1 });
      if (mesures.length === 0) await ouvrir(500);
      else await cliquer('[data-recette=initiale]');
      await p.jusqua('document.querySelector("output")?.dataset.effectif === "500"');
      await cliquer('.cel-filtres > button');
      await p.jusqua('document.querySelector(".cel-barre-selection b")?.textContent.includes("100")');
      for (let i=0;i<12;i++) { await p.evaluer(`window.scrollTo(0,document.documentElement.scrollHeight*${i/11})`); await attendre(40); }
      await p.envoyer('HeapProfiler.collectGarbage');
      mesures.push({ largeur, densite, ...await mesurer() });
      await p.capture(path.join(captures, `apres-${largeur}.png`));
      assert.ok(await p.evaluer('document.querySelectorAll(".cel-carte-quick").length <= 12'), 'Le nombre de cartes montées reste borné.');
      assert.equal(await p.evaluer('document.querySelector("output").dataset.commandes'), '0', 'Cocher et défiler ne vend rien.');
      assert.equal(await p.evaluer('document.documentElement.scrollWidth > innerWidth'), false);
      // Tout cocher porte sur l'effectif filtré entier, y compris les pages non affichées.
      assert.equal(await p.evaluer('getComputedStyle(document.querySelector(".cel-barre-selection")).backdropFilter'), 'none');
      assert.equal(await p.evaluer('getComputedStyle(document.querySelector(".cel-carte.dr-player")).filter'), 'none');
      await cliquer(suivant);
      assert.ok(await p.evaluer('document.querySelector(".cel-barre-selection b").textContent.includes("100")'));
      await cliquer('.cel-barre-actions .btn.fantome');
      assert.equal(await p.evaluer('Boolean(document.querySelector(".cel-barre-selection"))'), false);
      // Les joueurs cochés gardent leur sélection pendant les changements de page.
      await cliquer('.cel-coche');
      const nom = await p.evaluer('document.querySelector(".cel-carte-quick.choisie .dr-player-identity strong").textContent');
      await cliquer(suivant);
      assert.ok(await p.evaluer('document.querySelector(".cel-barre-selection b").textContent.includes("1")'));
      assert.equal(await p.evaluer('Boolean(document.querySelector("[data-carte-id=carte-mobile-25].choisie"))'), false, 'Le favori ne fait pas partie du lot automatique.');
      assert.equal(await p.evaluer('Boolean(document.querySelector("[data-carte-id=carte-mobile-26] .cel-coche"))'), false, 'La carte verrouillée ne se coche pas.');
      await cliquer(precedent);
      assert.equal(await p.evaluer('document.querySelector(".cel-carte-quick.choisie .dr-player-identity strong").textContent'), nom);
      await cliquer('.cel-barre-actions .btn.primaire');
      await p.jusqua('Boolean(document.querySelector("[role=dialog]"))');
      assert.ok((await p.evaluer('document.querySelector("[role=dialog]").textContent')).includes(nom));
      // Annuler la confirmation ne supprime aucune carte et rend le défilement.
      await p.envoyer('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape' });
      await p.jusqua('!document.querySelector("[role=dialog]")');
      assert.equal(await p.evaluer('document.getElementById("root").inert'), false);
      assert.equal(await p.evaluer('document.body.style.overflow'), '');
      assert.equal(await p.evaluer('document.querySelector("output").dataset.commandes'), '0');
      // Trier et filtrer repartent à la première page sans perdre le joueur coché.
      await choisir(1, 4);
      assert.ok(await p.evaluer('document.querySelector(".cel-pagination-effectif span").textContent.includes("Page 1 /")'));
      await choisir(2, 2);
      assert.ok(await p.evaluer('document.querySelector(".cel-barre-selection b").textContent.includes("1")'));
      await choisir(2, 1);
      await choisir(1, 1);
      await cliquer('.cel-barre-actions .btn.fantome');
      // Toutes les cartes restent accessibles, mais aucune page ne s'accumule.
      const vues = new Set();
      for (;;) {
        const ids = await identifiants();
        assert.ok(ids.length > 0 && ids.length <= 12);
        ids.forEach(id => { assert.ok(!vues.has(id), 'Aucune carte répétée entre pages.'); vues.add(id); });
        if (await p.evaluer(`document.querySelector(${JSON.stringify(suivant)}).disabled`)) break;
        await cliquer(suivant);
      }
      assert.equal(vues.size, 500, 'Les 500 joueurs restent accessibles.');
      await attendre(500);
      await p.envoyer('HeapProfiler.collectGarbage');
      const apresParcours = await mesurer();
      mesures.at(-1).apresParcours = apresParcours;
      // Le compteur Chrome inclut aussi les caches SVG/images et les nœuds
      // détachés du banc. Le parcours ne doit pas conserver la grille de
      // 500 joueurs (plus de 40 000 nœuds avant correction).
      assert.ok(apresParcours.dom.nodes < 10000, `Le parcours conserve un nombre borné de nœuds : ${JSON.stringify(apresParcours)}.`);
      assert.equal(await p.evaluer('document.querySelectorAll(".cel-carte-quick").length'), 8);
      await p.capture(path.join(captures, `derniere-page-${largeur}.png`));
      await cliquer('.cel-coche');
      const idVendu = await p.evaluer('document.querySelector(".cel-carte-quick.choisie").dataset.carteId');
      const avantVente = await donnees();
      await cliquer('.cel-barre-actions .btn.primaire');
      await p.jusqua('Boolean(document.querySelector("[role=dialog]"))');
      await cliquer('[role=dialog] .btn.primaire');
      await p.jusqua('document.querySelector("output").dataset.commandes === "1"');
      const apresVente = await donnees();
      assert.equal(apresVente.effectif, '499');
      assert.equal(JSON.parse(apresVente.derniereCommande).carteId, idVendu);
      assert.ok(Number(apresVente.ovas) > Number(avantVente.ovas));
      assert.equal(await p.evaluer('Boolean(document.querySelector(".cel-barre-selection"))'), false);
      // Le lot est borné à 100, exclut favoris / feuille / verrou et passe par la vraie règle de vente.
      await cliquer('.cel-filtres > button');
      await cliquer('.cel-barre-actions .btn.primaire');
      await p.jusqua('Boolean(document.querySelector("[role=dialog]"))');
      await cliquer('[role=dialog] .btn.primaire');
      await p.jusqua('document.querySelector("output").dataset.commandes === "2"');
      const groupe = await donnees(), commande = JSON.parse(groupe.derniereCommande);
      assert.equal(commande.type, 'venteRapideGroupee'); assert.equal(commande.carteIds.length, 100);
      assert.ok(commande.carteIds.every(id => Number(id.split('-').at(-1)) >= 23 && !['carte-mobile-25','carte-mobile-26'].includes(id)));
      assert.equal(groupe.effectif, '399');
      assert.ok((await identifiants()).length > 0, 'La dernière page se recale après la vente du lot.');
      assert.equal(await p.evaluer('Boolean(document.querySelector("[role=alert]"))'), false);
      assert.equal(await p.evaluer('document.body.style.overflow'), '');
      console.log(`OK ${largeur}px : 500 cartes accessibles par 12, défilement, tri, filtre, sélection conservée, annulation, vente simple et lot de 100 protégés.`);
      // Au plancher d'effectif, Tout cocher ne prépare aucune vente.
      await cliquer('[data-recette=plancher]');
      await p.jusqua('document.querySelector("output")?.dataset.effectif === "26"');
      await cliquer('.cel-filtres > button');
      assert.equal(await p.evaluer('Boolean(document.querySelector(".cel-barre-selection"))'), false);
      assert.equal((await donnees()).commandes, '0');
    }
    assert.deepEqual(erreurs, []);
    console.log(JSON.stringify({ mesures, captures }));
  } catch (e) {
    console.error({ erreurs, reseau });
    console.error(await p.evaluer('({url:location.href,etat:document.readyState,texte:document.body.innerText.slice(0,1500)})'));
    await p.capture(path.join(captures, 'echec.png'));
    throw e;
  }
  finally {
    await p.fermer();
    if (!process.env.DESTINY_GARDER_CAPTURES) {
      const temporaire = fs.realpathSync(os.tmpdir());
      assert.ok(path.resolve(captures).startsWith(temporaire+path.sep) && path.basename(captures).startsWith('destiny-effectif-'));
      fs.rmSync(captures, { recursive:true, force:true });
    }
  }
})().catch(e => { console.error(e); process.exitCode=1; });
