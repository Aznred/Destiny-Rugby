// Navigateur isolé pour les recettes et captures locales ; aucun profil laissé dans le projet.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const attendre = ms => new Promise(resolve => setTimeout(resolve, ms));

async function ouvrirNavigateur({ largeur = 1440, hauteur = 1000, port = 9259 } = {}) {
  const temporaire = fs.realpathSync(os.tmpdir());
  const profil = fs.mkdtempSync(path.join(temporaire, 'destiny-navigateur-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`,
    '--no-first-run', '--no-sandbox', '--disable-gpu-sandbox', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required',
    '--use-gl=angle', '--use-angle=d3d11', `--window-size=${largeur},${hauteur}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let ws;
  const fin = new Promise(resolve => chrome.once('exit', resolve));
  const fermer = async () => {
    ws?.close(); chrome.kill();
    await Promise.race([fin, attendre(4000)]);
    const cible = path.resolve(profil);
    if (!cible.startsWith(temporaire + path.sep) || !path.basename(cible).startsWith('destiny-navigateur-')) throw new Error('Profil temporaire hors du dossier prévu.');
    fs.rmSync(cible, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  };
  try {
    let onglet;
    for (let i = 0; i < 100 && !onglet; i++) {
      try { onglet = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* Démarrage. */ }
      if (!onglet) await attendre(100);
    }
    if (!onglet) throw new Error('Navigateur de recette indisponible.');
    ws = new WebSocket(onglet.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let prochain = 1;
    const enAttente = new Map();
    const ecouteurs = new Map();
    ws.onmessage = event => {
      const m = JSON.parse(event.data);
      ecouteurs.get(m.method)?.(m.params);
      const rappel = enAttente.get(m.id);
      if (!rappel) return;
      enAttente.delete(m.id); clearTimeout(rappel.delai);
      if (m.error) rappel.reject(new Error(m.error.message)); else rappel.resolve(m.result);
    };
    const envoyer = (method, params = {}) => new Promise((resolve, reject) => {
      const id = prochain++;
      const delai = setTimeout(() => { enAttente.delete(id); reject(new Error(`Délai dépassé : ${method}`)); }, 45000);
      enAttente.set(id, { resolve, reject, delai }); ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluer = async expression => {
      const r = await envoyer('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const dimensions = (width, height) => envoyer('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await envoyer('Page.enable'); await envoyer('Runtime.enable'); await dimensions(largeur, hauteur);
    return {
      envoyer, evaluer, fermer, dimensions,
      ecouter: (evenement, rappel) => ecouteurs.set(evenement, rappel),
      async ouvrir(url) { await envoyer('Page.navigate', { url }); },
      async capture(fichier) { const r = await envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(fichier, Buffer.from(r.data, 'base64')); },
      async jusqua(expression) {
        for (let i = 0; i < 150; i++) { if (await evaluer(expression).catch(() => false)) return; await attendre(200); }
        throw new Error(`État attendu absent : ${expression}`);
      },
    };
  } catch (erreur) { await fermer(); throw erreur; }
}
module.exports = { ouvrirNavigateur, attendre };
