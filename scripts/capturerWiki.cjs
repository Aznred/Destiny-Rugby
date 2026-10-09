// Navigateur de vérification isolé : aucune partie ni aucun compte réel n'est ouvert.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sharp = require('sharp');
const origine = process.env.WIKI_ORIGINE || 'http://127.0.0.1:5188';
const verification = process.argv.includes('--verifier');
const sortie = path.resolve(__dirname, '..', verification ? 'trailer/work/wiki-verification' : 'public/images/wiki');
const pause = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(sortie, { recursive: true });
async function main() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--remote-debugging-port=9236', `--user-data-dir=${path.resolve(__dirname, '../node_modules/.cache/chrome-wiki')}`, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--hide-scrollbars', '--window-size=1600,1000', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let ws;
  try {
    let tab;
    for (let i = 0; i < 50; i++) {
      try { tab = (await (await fetch('http://127.0.0.1:9236/json/list')).json()).find(t => t.type === 'page'); } catch { /* Démarrage. */ }
      if (tab) break;
      await pause(200);
    }
    if (!tab) throw new Error('Navigateur indisponible');
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const attentes = new Map();
    ws.onmessage = ev => { const m = JSON.parse(ev.data); const a = attentes.get(m.id); if (a) { attentes.delete(m.id); if (m.error) a.j(new Error(m.error.message)); else a.r(m.result); } };
    const envoyer = (method, params = {}) => new Promise((r, j) => { const numero = ++id; attentes.set(numero, { r, j }); ws.send(JSON.stringify({ id: numero, method, params })); });
    const lire = async expression => { const r = await envoyer('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    await envoyer('Page.enable');
    await envoyer('Runtime.enable');
    const captures = verification ? ['/wiki/', '/wiki/carriere-joueur/', '/wiki/carriere-entraineur/', '/wiki/ligue-en-ligne/', '/wiki/collection/', '/mises-a-jour/', '/guide/', '/moteur/', '/pyramide/', '/postes-rugby/', '/saison-rugby/', '/transferts-contrats/', '/blessures-recuperation/', '/journal/', '/scripts/apercuWiki.html?vue=wiki'] : ['/scripts/apercuWiki.html?vue=joueur', '/scripts/apercuWiki.html?vue=manager', '/scripts/apercuComposition.html', '/scripts/apercuWiki.html?vue=collection', '/scripts/apercu-direct-3d.html?vitesse=2&decision=0'];
    const noms = ['carriere-joueur', 'carriere-entraineur', 'ligue-en-ligne', 'collection', 'match'];
    const rapports = [];
    for (const largeur of verification ? [1440, 390] : [1600]) {
      await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: verification ? 1000 : 1000, deviceScaleFactor: 1, mobile: largeur < 700 });
      for (let i = 0; i < captures.length; i++) {
        if (!verification && process.argv.includes('--rafraichir-visuels') && i < 3) continue;
        if (verification && process.argv.includes('--guides-modifies') && !['/guide/', '/pyramide/'].includes(captures[i])) continue;
        await envoyer('Page.navigate', { url: origine + captures[i] });
        await pause(verification ? 650 : i === 4 ? 18000 : 5500);
        if (verification) {
          for (let essai = 0; essai < 60; essai++) {
            if (await lire("!!document.querySelector('.entete,.wiki-ligue') && document.readyState !== 'loading'")) break;
            await pause(200);
          }
          await lire("(async()=>{await document.fonts.ready;for(const i of document.images){i.loading='eager';await i.decode().catch(()=>{})}return true})()");
          if (captures[i] === '/wiki/') {
            const recherche = await lire("(()=>{const c=document.getElementById('recherche-guide');c.value='collection';c.dispatchEvent(new Event('input'));const trouves=[...document.querySelectorAll('[data-recherche]')].filter(a=>!a.hidden);const ok=trouves.some(a=>a.pathname==='/wiki/collection/');c.value='azertyintrouvable';c.dispatchEvent(new Event('input'));const vide=!document.getElementById('aucun-guide').hidden;c.value='';c.dispatchEvent(new Event('input'));return ok&&vide})()");
            if (!recherche) throw new Error('Recherche non fonctionnelle');
          }
          if (largeur < 700 && !captures[i].includes('apercuWiki')) {
            const menu = await lire("(()=>{const d=document.querySelector('.barre-guide details');if(!d)return false;d.querySelector('summary').click();const ouvert=d.open&&d.querySelector('.barre-contenu').getBoundingClientRect().height>0;d.querySelector('summary').click();return ouvert&&!d.open})()");
            if (!menu) throw new Error('Navigation mobile non fonctionnelle');
          }
          if (largeur > 900 && !captures[i].includes('apercuWiki')) {
            if (!await lire("document.querySelector('.barre-contenu')?.getBoundingClientRect().height>100")) throw new Error('Navigation desktop masquée');
          }
        }
        if (!verification) {
          await lire("(async()=>{await document.fonts.ready;return true})()");
          if (i === 3) { await lire('window.scrollTo(0,430)'); await pause(3500); }
          if (i === 4) {
            await lire("(async()=>{const {chargerTextes,definirLangue}=await import('/src/lib/i18n.ts');const {TEXTES}=await import('/src/data/textes.ts');chargerTextes(TEXTES);definirLangue('fr');[...document.querySelectorAll('button')].find(b=>/tv.passer|Passer/.test(b.textContent||''))?.click();return true})()");
            await pause(5000);
          }
        }
        if (verification) {
          const bilan = await lire(`({titre:document.title, h1:document.querySelector('h1')?.textContent, debordement:document.documentElement.scrollWidth>innerWidth, images:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src), ancres:[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash.length>1&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash), navigation:!!document.querySelector('.entete'), texte:document.body.innerText.slice(0,100)})`);
          rapports.push({ largeur, page: captures[i], ...bilan });
          const nom = captures[i].replace(/[^a-z0-9]+/gi, '-');
          const { data } = await envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          fs.writeFileSync(path.join(sortie, `${largeur}${nom}.png`), Buffer.from(data, 'base64'));
          console.log(largeur, captures[i], JSON.stringify(bilan));
        } else {
          const clip = i === 4 ? await lire("(()=>{const c=document.querySelector('canvas');if(!c)return undefined;const r=c.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()") : undefined;
          const { data } = await envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? {clip} : {}) });
          await sharp(Buffer.from(data, 'base64')).webp({ quality: 86 }).toFile(path.join(sortie, `${noms[i]}.webp`));
          console.log(noms[i], await lire('document.body.innerText.slice(0,180)'));
        }
      }
    }
    if (verification) {
      fs.writeFileSync(path.join(sortie, 'rapport.json'), JSON.stringify(rapports, null, 2));
      if (rapports.some(r => r.debordement || r.images.length || r.ancres.length || !r.titre || (!r.navigation && !r.page.includes('apercuWiki')))) throw new Error('Échec de vérification : consulter le rapport');
    }
  } finally { ws?.close(); chrome.kill(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
