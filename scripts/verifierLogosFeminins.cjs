// Les vrais composants du jeu, dans un navigateur avec son propre profil jetable.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const pause = ms => new Promise(r => setTimeout(r, ms));
const sortie = path.resolve(__dirname, '../trailer/work/feminin-verification');
async function main() {
  fs.mkdirSync(sortie, { recursive: true });
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--remote-debugging-port=9238', `--user-data-dir=${path.resolve(__dirname, '../node_modules/.cache/chrome-logos-feminin-' + Date.now())}`, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let ws;
  const erreurs = [], rapports = [];
  try {
    let tab;
    for (let i = 0; i < 50; i++) {
      try { tab = (await (await fetch('http://127.0.0.1:9238/json/list')).json()).find(t => t.type === 'page'); } catch { /* Démarrage. */ }
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
    const attendre = async expression => { for (let i = 0; i < 100; i++) { if (await lire(expression)) return; await pause(250); } throw new Error('Élément absent : ' + expression); };
    const capture = async (nom, entier = false) => {
      const hauteur = entier ? await lire('document.documentElement.scrollHeight') : 1000;
      const { data } = await envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: entier, ...(entier ? { clip: { x: 0, y: 0, width: await lire('innerWidth'), height: hauteur, scale: 1 } } : {}) });
      fs.writeFileSync(path.join(sortie, nom + '.png'), Buffer.from(data, 'base64'));
    };
    await envoyer('Page.enable'); await envoyer('Runtime.enable');
    await envoyer('Page.addScriptToEvaluateOnNewDocument', { source: "performance.setResourceTimingBufferSize(5000);localStorage.setItem('destiny-rugby:monde','F')" });
    for (const largeur of [1440, 390]) {
      await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: 1000, deviceScaleFactor: 1, mobile: largeur < 700 });
      await envoyer('Page.navigate', { url: 'http://127.0.0.1:5191/scripts/apercuLiguesFeminines.html' });
      await attendre("document.querySelectorAll('[data-ligue]').length===11");
      await attendre('[...document.images].every(i=>i.complete&&i.naturalWidth>0)');
      const bilan = await lire("({largeur:innerWidth,debordement:document.documentElement.scrollWidth>innerWidth,ligues:[...document.querySelectorAll('[data-ligue]')].map(s=>({id:s.dataset.ligue,logo:s.querySelector('.btv-logo img').getAttribute('src'),cadre:getComputedStyle(s.querySelector('.btv-logo img')).objectFit}))})");
      if (bilan.debordement || bilan.ligues.some(l => !l.logo.includes('/logos-competitions/' + l.id) || l.cadre !== 'contain')) throw new Error('Logo de ligue absent ou recadré : ' + JSON.stringify(bilan));
      rapports.push(bilan); await capture(largeur + '-logos-ligues', true);
    }
    await envoyer('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await lire("document.querySelector('[data-ligue=f-elite2] button').click()");
    await attendre("!!document.querySelector('.match-live')");
    await attendre("!!document.querySelector('.match-live .btv-logo img[src*=f-elite2]')");
    await attendre("performance.getEntriesByType('resource').some(e=>e.name.includes('player_female'))");
    await pause(3500);
    await capture('match-elite2');
    const match = await lire("({logo:document.querySelector('.match-live .btv-logo img').getAttribute('src'),modeles:performance.getEntriesByType('resource').filter(e=>e.name.includes('player_female')).map(e=>e.name),racing:[...document.querySelectorAll('.match-live img')].filter(i=>i.src.includes('racing')).map(i=>i.getAttribute('src'))})");
    if (!match.modeles.length || !match.racing.includes('/logos/racing_92.png')) throw new Error('Modèles féminins ou écusson du Racing absents : ' + JSON.stringify(match));
    rapports.push(match);
    if (erreurs.length) throw new Error(erreurs.join('\n'));
    fs.writeFileSync(path.join(sortie, 'rapport-logos.json'), JSON.stringify({ rapports, erreurs }, null, 2));
    console.log('Onze logos vérifiés sur ordinateur et mobile ; match féminin et écusson du Racing vérifiés.');
  } finally { ws?.close(); chrome.kill(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
