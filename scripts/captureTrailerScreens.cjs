// Captures réelles de l'interface du jeu pour le trailer de présentation.
// Démarrer Vite sur le port 5188, puis : node scripts/captureTrailerScreens.cjs
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'trailer', 'work');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9231;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(OUT, 'chrome-capture-profile')}`,
    '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--disable-gpu-sandbox',
    '--no-first-run', '--hide-scrollbars', '--window-size=1600,900',
    'http://127.0.0.1:5188/',
  ], { windowsHide: true, stdio: 'ignore' });
  try {
    let tab;
    for (let i = 0; i < 80; i++) {
      try {
        const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        tab = tabs.find((item) => item.type === 'page');
        if (tab) break;
      } catch { /* Chrome démarre encore. */ }
      await sleep(150);
    }
    if (!tab) throw new Error('Chrome DevTools indisponible');
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    const pending = new Map();
    let nextId = 1;
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const screenshot = async (name, attente = 1400) => {
      await sleep(attente);
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(OUT, `${name}.png`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      console.log(`${name}: ${Math.round(fs.statSync(file).size / 1024)} Ko`);
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://127.0.0.1:5188/' });
    await sleep(2200);
    await evaluate(`[...document.querySelectorAll('button')].find(b=>/Passer/.test(b.textContent||''))?.click()`);
    await screenshot('accueil-jeu');
    for (const [screen, file] of [
      ['creation', 'creation-jeu'], ['collectionSolo', 'collection-jeu'],
      ['carriereEnLigne', 'en-ligne-jeu'], ['championnats', 'championnats-jeu'],
      ['classement', 'classement-jeu'], ['boutique', 'boutique-jeu'],
    ]) {
      try {
        const state = await evaluate(`(async()=>{const m=await import('/src/store/useGame.ts');m.useGame.getState().setEcran('${screen}');return m.useGame.getState().ecran})()`);
        console.log(`Écran ${screen} -> ${state}`);
        await screenshot(file, screen === 'carriereEnLigne' ? 7000 : screen === 'collectionSolo' ? 4500 : 1400);
      } catch (error) { console.log(`${screen}: ${error.message}`); }
    }
    console.log('Texte visible :', String(await evaluate('document.body.innerText')).slice(0, 500));
    ws.close();
  } finally { chrome.kill(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
