// Chrome piloté par son port de débogage — même méthode que scripts/filmerFemininesTikTok.cjs.
const path = require('node:path');
const { spawn } = require('node:child_process');

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function ouvrir({ largeur, hauteur, echelle = 1, port = 9261, profil }) {
  const chrome = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`,
    '--use-gl=angle', '--use-angle=d3d11', '--no-sandbox', '--disable-gpu-sandbox', '--no-first-run', '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required', '--force_high_performance_gpu',
    // Écran éteint ou session verrouillée, Chrome croit la page masquée et ne la rafraîchit plus qu'une fois par seconde.
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--mute-audio', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist',
    `--window-size=${largeur},${hauteur}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let tab;
  for (let essai = 0; essai < 120 && !tab; essai++) {
    try { tab = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* Chrome démarre. */ }
    if (!tab) await pause(150);
  }
  if (!tab) { chrome.kill(); throw new Error('Chrome DevTools indisponible'); }
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 1;
  const attente = new Map();
  let surImage = null;
  const journal = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.screencastFrame') {
      surImage?.(Buffer.from(message.params.data, 'base64'), message.params.metadata);
      ws.send(JSON.stringify({ id: id++, method: 'Page.screencastFrameAck', params: { sessionId: message.params.sessionId } }));
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') { journal.push('EXCEPTION ' + (message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)); return; }
    if (message.method === 'Runtime.consoleAPICalled' && (message.params.type === 'error' || message.params.type === 'warning')) {
      journal.push(message.params.type.toUpperCase() + ' ' + message.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 600)); return;
    }
    const entree = attente.get(message.id);
    if (!entree) return;
    attente.delete(message.id);
    if (message.error) entree.reject(new Error(message.error.message)); else entree.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = id++; attente.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluer = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: echelle, mobile: false });
  return {
    send, evaluer, journal,
    ecouter(f) { surImage = f; },
    async attendre(expression, essais = 240, delai = 250) {
      for (let i = 0; i < essais; i++) { if (await evaluer(expression).catch(() => false)) return true; await pause(delai); }
      throw new Error('Attente expirée : ' + expression);
    },
    async photo(format = 'jpeg', qualite = 92) {
      const p = await send('Page.captureScreenshot', format === 'png' ? { format: 'png' } : { format: 'jpeg', quality: qualite });
      return Buffer.from(p.data, 'base64');
    },
    fermer() { try { ws.close(); } catch { /* déjà fermé */ } chrome.kill(); },
  };
}

module.exports = { ouvrir, pause, racine: path.resolve(__dirname, '..', '..') };
