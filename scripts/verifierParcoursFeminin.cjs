// Navigateur isolé : création réelle, bascules, reprise de sauvegarde et vues desktop/mobile.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const origine = process.env.FEMININ_ORIGINE || 'http://127.0.0.1:5191';
const pause = ms => new Promise(r => setTimeout(r, ms));
const sortie = path.resolve(__dirname, '../trailer/work/feminin-verification');
fs.mkdirSync(sortie, { recursive: true });
async function main() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--remote-debugging-port=9237', `--user-data-dir=${path.resolve(__dirname, '../node_modules/.cache/chrome-feminin-' + Date.now())}`, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let ws;
  const erreurs = [], rapports = [];
  try {
    let tab;
    for (let i = 0; i < 50; i++) {
      try { tab = (await (await fetch('http://127.0.0.1:9237/json/list')).json()).find(t => t.type === 'page'); } catch { /* Démarrage. */ }
      if (tab) break;
      await pause(200);
    }
    if (!tab) throw new Error('Navigateur indisponible');
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const attentes = new Map();
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data), a = attentes.get(m.id);
      if (a) { attentes.delete(m.id); if (m.error) a.j(new Error(m.error.message)); else a.r(m.result); }
      if (m.method === 'Runtime.exceptionThrown') erreurs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    };
    const envoyer = (method, params = {}) => new Promise((r, j) => { const numero = ++id; attentes.set(numero, { r, j }); ws.send(JSON.stringify({ id: numero, method, params })); });
    const lire = async expression => { const r = await envoyer('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const attendre = async expression => {
      for (let i = 0; i < 150; i++) { try { if (await lire(expression)) return; } catch { /* Nouvelle page. */ } await pause(400); }
      const diagnostic = await lire("({texte:document.body.innerText.slice(0,1800),html:document.querySelector('main')?.innerHTML.slice(0,900)})");
      const { data } = await envoyer('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(sortie, 'echec.png'), Buffer.from(data, 'base64'));
      throw new Error('Écran attendu absent : ' + expression + '\n' + JSON.stringify(diagnostic));
    };
    const ouvrirCreation = () => lire("(async()=>{const {useGame}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/store/useGame.ts')).name);const {demanderLeModeDeCreation}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/lib/tutoriel/intentions.ts')).name);demanderLeModeDeCreation('joueur');useGame.getState().setLangue('fr');useGame.setState({iaActivee:false,guideFerme:true,tutoriel:null,ecran:'creation'});return true})()");
    const capture = async nom => {
      await pause(500);
      const bilan = await lire("({largeur:innerWidth,ecran:document.querySelector('[data-ecran]')?.getAttribute('data-ecran'),titre:document.querySelector('h1')?.textContent,debordement:document.documentElement.scrollWidth>innerWidth,images:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),erreur:!!document.querySelector('.garde-erreur')})");
      rapports.push({ nom, ...bilan });
      const { data } = await envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(sortie, nom + '.png'), Buffer.from(data, 'base64'));
      console.log(nom, JSON.stringify(bilan));
      if (bilan.debordement || bilan.images.length || bilan.erreur) throw new Error('Vue invalide : ' + nom);
    };
    await envoyer('Page.enable'); await envoyer('Runtime.enable');
    await envoyer('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `performance.setResourceTimingBufferSize(5000);localStorage.setItem('destiny-rugby:tutoriel',JSON.stringify({v:1,vus:{},desactive:true}))` });
    await envoyer('Page.navigate', { url: origine });
    await attendre("!!document.querySelector('.racine')");
    await ouvrirCreation(); await attendre("!!document.querySelector('.creation-genre')");
    await capture('creation-joueur');
    // Trois bascules consécutives : aucune pause de huit secondes entre deux mondes.
    for (const monde of ['F', 'H', 'F']) {
      await lire(`document.querySelectorAll('.creation-genre button')[${monde === 'F' ? 1 : 0}].click()`);
      await attendre(`document.querySelectorAll('.creation-genre button')[${monde === 'F' ? 1 : 0}]?.getAttribute('aria-checked')==='true'`);
    }
    await capture('creation-joueuse');
    await lire("document.querySelector('[data-tuto=cr-origine-creer]').click()");
    await attendre("!!document.getElementById('nom')");
    const clubs = await lire("(async()=>{const {COMPETITIONS}=await import('/src/data/clubs.ts');return COMPETITIONS.length===11&&COMPETITIONS.every(c=>c.id.startsWith('f-'))})()");
    if (!clubs) throw new Error('Clubs masculins dans la création féminine');
    await attendre("!!document.querySelector('.aj3d canvas') || !!document.querySelector('.aj3d-repli')");
    await attendre("performance.getEntriesByType('resource').some(e=>e.name.includes('player_female'))");
    if (await lire("[...document.querySelectorAll('legend')].some(e=>e.textContent==='Barbe')")) throw new Error('Apparence masculine dans la création féminine');
    await capture('formulaire-joueuse');
    await lire("document.querySelector('.aj3d').scrollIntoView({block:'center'})"); await capture('apparence-joueuse');
    await lire("(()=>{const i=document.getElementById('nom');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Lou Vérification');i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-tuto=cr-valider]').click()})()");
    await attendre("document.querySelector('[data-ecran]')?.getAttribute('data-ecran')==='carriere'");
    const sauvegarde = await lire("(async()=>{const {useGame}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/store/useGame.ts')).name);const j=useGame.getState().joueur;return {nom:j.nom,genre:j.genre,club:j.club,division:j.division}})()");
    if (sauvegarde.genre !== 'F' || !sauvegarde.division.startsWith('f-')) throw new Error('Création féminine incorrecte');
    await capture('carriere-joueuse');
    // Un écran utilisant le catalogue serveur recharge H ; reprendre la joueuse recharge F et garde sa partie.
    await lire("(async()=>{const {useGame}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/store/useGame.ts')).name);useGame.getState().setEcran('carriereEnLigne')})()");
    await attendre("document.querySelector('[data-ecran]')?.getAttribute('data-ecran')==='carriereEnLigne' && localStorage.getItem('destiny-rugby:monde')==='H'");
    await lire("(async()=>{const {useGame}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/store/useGame.ts')).name);useGame.getState().setEcran('carriere')})()");
    await attendre("document.querySelector('[data-ecran]')?.getAttribute('data-ecran')==='carriere' && localStorage.getItem('destiny-rugby:monde')==='F'");
    const reprise = await lire("(async()=>{const {useGame}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/store/useGame.ts')).name);return useGame.getState().joueur.nom})()");
    if (reprise !== sauvegarde.nom) throw new Error('Sauvegarde perdue lors de la bascule');
    for (const largeur of [1440, 390]) {
      await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 1000, deviceScaleFactor: 1, mobile: largeur < 700 });
      for (const ecran of ['carriere', 'effectif', 'championnats']) {
        await lire(`(async()=>{const {useGame}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/store/useGame.ts')).name);useGame.getState().setEcran('${ecran}')})()`);
        await attendre(`document.querySelector('[data-ecran]')?.getAttribute('data-ecran')==='${ecran}' && !!document.querySelector('h1')`);
        await pause(1200); await capture(largeur + '-' + ecran);
      }
      await ouvrirCreation(); await attendre("!!document.querySelector('.creation-genre')"); await capture(largeur + '-creation');
      if (largeur === 390) {
        await lire("document.querySelector('[data-tuto=cr-origine-creer]').click()");
        await attendre("!!document.getElementById('nom')"); await capture('390-formulaire-joueuse');
      }
    }
    // Le choix d'une vraie carte passe par les mêmes boutons et confirmation que la création normale.
    await lire("(async()=>{const {useGame}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/store/useGame.ts')).name);useGame.getState().setEcran('accueil')})()");
    await attendre("document.querySelector('[data-ecran]')?.getAttribute('data-ecran')==='accueil'");
    await ouvrirCreation(); await attendre("!!document.querySelector('[data-tuto=cr-origine-existant]')");
    await lire("document.querySelector('[data-tuto=cr-origine-existant]').click()");
    await attendre("!!document.querySelector('.cr-avertissement .primaire')");
    await lire("document.querySelector('.cr-avertissement .primaire').click()");
    await attendre("!!document.querySelector('.sje-recherche input')");
    await lire("(()=>{const i=document.querySelector('.sje-recherche input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Bourdon Sansus');i.dispatchEvent(new Event('input',{bubbles:true}))})()");
    await attendre("document.querySelector('.sje-resume [role=status]')?.textContent==='1 joueuse'");
    await capture('390-joueuse-reelle');
    await lire("document.querySelector('.sje-carte button').click()");
    await attendre("!!document.querySelector('.sje-modale .primaire')");
    await lire("document.querySelector('.sje-modale .primaire').click()");
    await attendre("document.querySelector('[data-ecran]')?.getAttribute('data-ecran')==='carriere'");
    const reelle = await lire("(async()=>{const {useGame}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/store/useGame.ts')).name);const j=useGame.getState().joueur;return {nom:j.nom,genre:j.genre,division:j.division,photo:j.photo,classement:j.rankedCareer}})()");
    if (reelle.genre !== 'F' || reelle.division !== 'f-elite1' || !reelle.photo || reelle.classement !== false) throw new Error('Incarnation féminine incorrecte : ' + JSON.stringify(reelle));
    await capture('390-carriere-reelle');
    if (erreurs.length) throw new Error(erreurs.join('\n'));
    fs.writeFileSync(path.join(sortie, 'rapport.json'), JSON.stringify({ sauvegarde, reelle, rapports, erreurs }, null, 2));
    console.log('Parcours, rechargements et sauvegarde vérifiés.');
  } finally { ws?.close(); chrome.kill(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
