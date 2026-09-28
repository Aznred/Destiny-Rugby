// Filmer la vraie application (interface mobile, ouverture de pack et match en direct).
// Démarrer Vite sur 127.0.0.1:5188 avant de lancer ce script.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'trailer', 'work', 'tiktok-live');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(out, { recursive: true });

async function main() {
  const chrome = spawn(chromePath, [
    '--headless=new', '--remote-debugging-port=9233',
    `--user-data-dir=${path.join(out, 'chrome-profile-run3')}`,
    '--use-gl=angle', '--use-angle=d3d11', '--no-sandbox', '--disable-gpu-sandbox',
    '--no-first-run', '--hide-scrollbars', '--window-size=540,960',
    'http://127.0.0.1:5188/',
  ], { windowsHide: true, stdio: 'ignore' });
  let ws;
  try {
    let tab;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const tabs = await (await fetch('http://127.0.0.1:9233/json/list')).json();
        tab = tabs.find(item => item.type === 'page');
        if (tab) break;
      } catch { /* Chrome démarre. */ }
      await sleep(150);
    }
    if (!tab) throw new Error('Chrome DevTools indisponible');
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    let id = 1;
    const pending = new Map();
    let current = null;
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Page.screencastFrame') {
        const clip = current;
        if (clip) {
          const file = `${String(clip.frames.length).padStart(5, '0')}.jpg`;
          fs.writeFileSync(path.join(clip.dir, file), Buffer.from(message.params.data, 'base64'));
          clip.frames.push({ file, at: performance.now() - clip.start });
        }
        ws.send(JSON.stringify({ id: id++, method: 'Page.screencastFrameAck', params: { sessionId: message.params.sessionId } }));
        return;
      }
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const n = id++;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
    const evaluate = async expression => {
      const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
      return response.result.value;
    };
    const screen = async name => {
      const clip = { name, dir: path.join(out, name), start: performance.now(), frames: [] };
      fs.mkdirSync(clip.dir, { recursive: true });
      current = clip;
      const first = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
      fs.writeFileSync(path.join(clip.dir, '00000.jpg'), Buffer.from(first.data, 'base64'));
      clip.frames.push({ file: '00000.jpg', at: 0 });
      return clip;
    };
    const end = clip => {
      current = null;
      clip.duration = performance.now() - clip.start;
      fs.writeFileSync(path.join(clip.dir, 'frames.json'), JSON.stringify({ duration: clip.duration, frames: clip.frames }));
      console.log(`${clip.name}: ${clip.frames.length} images, ${(clip.duration / 1000).toFixed(1)} s`);
    };
    const click = async phrase => evaluate(`(() => { const bouton = [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes(${JSON.stringify(phrase)})); if (!bouton) return false; bouton.click(); return true; })()`);
    const state = expression => evaluate(`(async () => { const m = await import('/src/store/useGame.ts'); return (${expression}); })()`);

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://127.0.0.1:5188/' });
    await sleep(3500);
    await click('Passer');
    await sleep(700);
    await send('Page.startScreencast', { format: 'jpeg', quality: 86, maxWidth: 540, maxHeight: 960, everyNthFrame: 2 });

    let clip = await screen('01-accueil'); await sleep(3800); end(clip);

    await state(`m.useGame.getState().setEcran('creation')`); await sleep(700);
    clip = await screen('02-choix-carriere'); await sleep(3500); end(clip);

    await state(`m.useGame.getState().creerManager({nom:'Alex Martin',nation:'France',club:'Stade Toulousain',age:34,libre:false})`);
    await sleep(900);
    clip = await screen('03-bureau'); await sleep(3600); end(clip);

    await evaluate(`document.querySelector('.manager-onglets button:nth-child(2)')?.click()`); await sleep(600);
    clip = await screen('04-composition'); await sleep(3400); end(clip);

    await evaluate(`document.querySelector('.manager-onglets button:first-child')?.click()`); await sleep(350);
    await state(`m.useGame.getState().avancerJusquaManager(15,false)`);
    await click('Coacher le match'); await sleep(600);
    clip = await screen('05-avant-match'); await sleep(2700); end(clip);

    if (!await click('Prendre place sur le banc')) throw new Error('Bouton de lancement du match introuvable');
    await sleep(1200);
    clip = await screen('06-match');
    await sleep(2400);
    await click('Accéléré');
    const evenements = [];
    for (let tick = 0; tick < 13; tick++) {
      await sleep(3000);
      const text = String(await evaluate('document.body.innerText'));
      const extrait = text.slice(-1300);
      evenements.push({ at: performance.now() - clip.start, extrait });
      console.log(`Match ${(tick + 1) * 3}s : ${extrait.match(/\\d+′|Essai|Transformation|Pénalité|0\s+0/g)?.slice(-4).join(', ') ?? 'en cours'}`);
    }
    end(clip);
    fs.writeFileSync(path.join(clip.dir, 'evenements.json'), JSON.stringify(evenements));

    await state(`m.useGame.getState().setEcran('collectionSolo')`);
    await sleep(4500);
    clip = await screen('07-collection'); await sleep(3900); end(clip);

    await evaluate(`document.querySelector('.bp3-scene')?.focus()`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await sleep(1300);
    console.log('Pack visible:', String(await evaluate('document.body.innerText')).slice(-450));
    clip = await screen('08-ouverture-pack');
    for (let turn = 0; turn < 4; turn++) {
      await sleep(1600);
      await evaluate(`document.querySelector('.pack-show-touch')?.click()`);
      if (await evaluate(`Boolean(document.querySelector('.pack-show.phase-cartes'))`)) break;
    }
    await sleep(5300); end(clip);

    await state(`m.useGame.getState().setEcran('carriereEnLigne')`); await sleep(700);
    clip = await screen('09-en-ligne'); await sleep(4200); end(clip);

    await send('Page.stopScreencast');
    ws.close();
    console.log(`Captures enregistrées dans ${out}`);
  } finally {
    ws?.close();
    chrome.kill();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
