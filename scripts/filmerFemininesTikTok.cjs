// FILMER LES VIDÉOS TIKTOK DU RUGBY FÉMININ ET LES EDITS DE MATCH
//
//   node scripts/filmerFemininesTikTok.cjs promo            # les deux promos (arrivée, Octobre Rose)
//   node scripts/filmerFemininesTikTok.cjs match [graines]  # un ou plusieurs matchs 3D, image par image : on ne garde que les temps forts
//
// Démarrer le jeu avant (`npm run dev -- --port 5199`). Même méthode que `filmerGameplayTikTok.cjs` : un Chrome
// piloté par son port de débogage, sa propre carte graphique, et le flux d'images de la page. Les promos sont
// les pages `/scripts/promoFeminines.html` ; les matchs sont de VRAIS matchs du moteur, joués en 3D dans
// `/rn26/index.html`. Rien n'est mis en scène : le script regarde l'état du match et garde les secondes autour
// d'un essai, d'un gros plaquage ou d'un défenseur mis sur les fesses.
//
// Sortie : trailer/work/feminines/<scène>/ (images + frames.json), montées par `monterFemininesTikTok.cjs`.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'trailer', 'work', 'feminines');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.DESTINY_URL || 'http://localhost:5199';
const PORT = 9247;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(out, { recursive: true });

async function ouvrir(largeur, hauteur, echelle) {
  const chrome = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(out, 'chrome-profil')}`,
    '--use-gl=angle', '--use-angle=d3d11', '--no-sandbox', '--disable-gpu-sandbox', '--no-first-run', '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio', `--window-size=${largeur},${hauteur}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let tab;
  for (let essai = 0; essai < 120 && !tab; essai++) {
    try { tab = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* Chrome démarre. */ }
    if (!tab) await sleep(150);
  }
  if (!tab) { chrome.kill(); throw new Error('Chrome DevTools indisponible'); }
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 1;
  const attente = new Map();
  let surImage = null;
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.screencastFrame') {
      surImage?.(Buffer.from(message.params.data, 'base64'));
      ws.send(JSON.stringify({ id: id++, method: 'Page.screencastFrameAck', params: { sessionId: message.params.sessionId } }));
      return;
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
    send, evaluer,
    ecouter(f) { surImage = f; },
    async filmer(qualite = 84) { await send('Page.startScreencast', { format: 'jpeg', quality: qualite, maxWidth: largeur * echelle, maxHeight: hauteur * echelle, everyNthFrame: 1 }); },
    async arreter() { surImage = null; await send('Page.stopScreencast'); },
    fermer() { try { ws.close(); } catch { /* déjà fermé */ } chrome.kill(); },
  };
}

function scene(nom) {
  const dir = path.join(out, nom);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return { nom, dir, depart: performance.now(), frames: [] };
}
function ecrire(clip, tampon, at = performance.now() - clip.depart) {
  const file = `${String(clip.frames.length).padStart(5, '0')}.jpg`;
  fs.writeFileSync(path.join(clip.dir, file), tampon);
  clip.frames.push({ file, at });
}
function clore(clip, extra = {}) {
  const duree = clip.frames.length ? clip.frames.at(-1).at : 0;
  fs.writeFileSync(path.join(clip.dir, 'frames.json'), JSON.stringify({ duration: duree, frames: clip.frames, ...extra }));
  console.log(`${clip.nom} : ${clip.frames.length} images, ${(duree / 1000).toFixed(1)} s`);
}

async function promos() {
  const page = await ouvrir(540, 960, 2);
  try {
    for (const video of ['arrivee', 'octobre-rose']) {
      await page.send('Page.navigate', { url: `${BASE}/scripts/promoFeminines.html?video=${video}` });
      for (let i = 0; i < 100 && !(await page.evaluer('Boolean(window.__promo?.pret)').catch(() => false)); i++) await sleep(200);
      // Tous les portraits doivent être décodés avant le premier plan, sinon les cartes arrivent vides.
      await page.evaluer(`Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.decode().catch(() => null); })).then(() => true)`);
      await sleep(800);
      const duree = await page.evaluer('window.__promo.duree');
      const clip = scene(`promo-${video}`);
      page.ecouter(tampon => ecrire(clip, tampon));
      await page.filmer(90);
      clip.depart = performance.now();
      await page.evaluer('window.__promo.lancer(), true');
      await sleep(duree * 1000 + 500);
      await page.arreter();
      clore(clip, { duree });
    }
  } finally { page.fermer(); }
}

// ── Les matchs ──────────────────────────────────────────────────────────────
// ⚠️ IMAGE PAR IMAGE, PAS EN TEMPS RÉEL. Filmé au fil de l'eau, le flux d'images du navigateur tombait à dix-sept
// images par seconde, et moins encore à l'instant d'un plaquage (c'est là que la scène travaille le plus) : ralenti
// au montage, le contact saccadait. La page est ouverte en `?banc=1` (elle n'avance que sur demande) : chaque image
// est UN pas de 1/60 s du match, dessiné puis photographié. La cadence de la machine ne compte plus.
//
// Deux passes sur la même graine (le match est rejoué à l'identique) :
//   1. le match entier, dessiné mais pas photographié : on relève à quelle image tombe chaque temps fort ;
//   2. le même match, photographié autour de ces images.
// ⚠️ LES DEUX PASSES DESSINENT CHAQUE IMAGE. La scène retient le moteur pendant qu'une mêlée ou une touche se met en
// place (`hold`, d'après l'arrivée AFFICHÉE des joueurs) : un match joué sans dessin n'est pas le même match — mesuré,
// le premier essai tombait à l'image 4 815 sans dessin et 5 778 avec (`rejoue`).
// Un temps fort est un FAIT de l'état du moteur : essai, plaquage dominant, défenseur assis par le porteur, percée.
const IPS_FILM = 60;
const FENETRES = { essai: [5.6, 3.2], plaquage: [3.0, 2.4], assis: [2.8, 2.6], percee: [1.6, 5.0] };
const OUTILS = `(() => {
  const vus = { essais: 0, percee: false, plaquages: new WeakSet(), gestes: new Set() };
  const e0 = rn26.match.e; vus.essais = e0.essaisA + e0.essaisB;
  window.__film = { i: 0, pas(n, dessiner) {
    const faits = [];
    for (let k = 0; k < n; k++) {
      const m = rn26.match, e = m.e;
      if (e.fini) break;
      m.step(1 / ${IPS_FILM});
      if (dessiner) rn26.scene3D.image(1 / ${IPS_FILM}, { vitesse: 1 });
      this.i++;
      if (e.essaisA + e.essaisB > vus.essais) { vus.essais = e.essaisA + e.essaisB; faits.push({ type: 'essai', detail: e.scoreA + '-' + e.scoreB, i: this.i }); }
      const percee = !!(e.perceeSignalee || e.echappee);
      if (percee && !vus.percee) faits.push({ type: 'percee', detail: 'minute ' + e.minute, i: this.i });
      vus.percee = percee;
      const q = e.ruck && e.ruck.plaquage;
      if (q && !vus.plaquages.has(q)) { vus.plaquages.add(q); const nom = (q.type || '') + ':' + (q.variante || '');
        if (/^dominant|souleve|epaule-contre|offensif|percut/.test(nom)) faits.push({ type: 'plaquage', detail: nom, i: this.i }); }
      for (const g of e.gestes || []) { if (vus.gestes.has(g.id)) continue; vus.gestes.add(g.id);
        if (/assis|percute/.test(g.variante || '')) faits.push({ type: 'assis', detail: g.clip + ':' + g.variante, i: this.i }); }
    }
    const e = rn26.match.e;
    return { i: this.i, fini: !!e.fini, faits, a: e.scoreA, b: e.scoreB, sim: e.sim };
  } };
  return true;
})()`;
// France (A) contre Angleterre (B) : les mieux notées à chaque poste dans `cartes_feminines.json`.
const XV_FEMININS = {
  A: ['Annaelle DESHAYE', 'Agathe GERIN', 'Rose BERNADOU', 'Manae FELEU', 'Madoussou FALL RACLOT', 'Axelle BERTHOUMIEU', 'Charlotte ESCUDERO', 'Teani FELEU', 'Pauline BOURDON SANSUS', 'Lina QUEYROI', 'Joanna GRISEZ', 'Gabrielle VERNIER', 'Maelle FILOPON', 'Marine MENAGER', 'Emilie BOULARD'],
  B: ['Hannah BOTTERMAN', 'Amy COKAYNE', 'Sarah BERN', 'Morwenna TALLING', 'Abbie WARD', 'Zoe STRATFORD', 'Marlie PACKER', 'Alex MATTHEWS', 'Natasha HUNT', 'Zoe HARRISON', 'Jess BREACH', 'Tatyana HEARD', 'Helena ROWLAND', 'Claudia MOLONEY-MACDONALD', 'Ellie KILDUNNE'],
};
// La page d'aperçu a ses réglages de développeur autour de la scène : on ne filme que la scène, plein cadre.
const PREPARER = graine => `(async () => {
  const style = document.createElement('style');
  style.textContent = 'header,aside,#status,#saved,body>div:not(#scene){display:none!important} html,body{margin:0;overflow:hidden;background:#000} #scene{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}';
  document.head.appendChild(style);
  window.dispatchEvent(new Event('resize'));
  const moteur = await import('/rn26/moteur-destiny.js');
  const { DestinyMatch } = await import('/rn26/destiny.mjs');
  const etat = moteur.creerApercuDestiny('tiktok-' + ${JSON.stringify(String(graine))});
  // Les trente noms de l'aperçu sont masculins : la flamme sous la porteuse affiche les joueuses des cartes du jeu.
  const XV = ${JSON.stringify(XV_FEMININS)};
  if (${JSON.stringify(process.env.GENRE !== 'homme')}) for (const p of etat.pions) { const nom = XV[p.cote]?.[p.numero - 1]; if (nom) p.nom = nom; }
  etat.carriereDixMinutes = true;
  rn26.match = new DestinyMatch({ etat, outils: rn26.match.outils, avancer: moteur.avancer });
  const camera = document.querySelector('#camera'); camera.value = ${JSON.stringify(process.env.CAMERA || 'close')}; camera.dispatchEvent(new Event('change', { bubbles: true }));
  // Les ralentis de la réalisation rejouent d'anciennes images par-dessus le jeu : le montage fait les siens.
  rn26.scene3D.television = { ralentis: false };
  rn26.scene3D.recadrer();
  return true;
})()`;

async function ouvrirMatch(page, graine) {
  const genre = process.env.GENRE === 'homme' ? '' : '&genre=femme';
  await page.send('Page.navigate', { url: `${BASE}/rn26/index.html?banc=1&stade=${process.env.STADE || 'grand'}${genre}${process.env.EQUIPES ? '&equipes=' + encodeURIComponent(process.env.EQUIPES) : ''}` });
  for (let i = 0; i < 300 && !(await page.evaluer('Boolean(window.rn26 && window.rn26.match)').catch(() => false)); i++) await sleep(500);
  await page.evaluer(PREPARER(graine));
  await page.evaluer(OUTILS);
}

async function matchs(graines) {
  // Portrait natif : la scène 3D se dessine directement en 9:16, rien n'est recadré au montage.
  const page = await ouvrir(540, 960, 2);
  const imagesMax = Number(process.env.DUREE_MAX || 22 * 60) * IPS_FILM;
  const parType = { essai: Number(process.env.ESSAIS || 6), plaquage: 8, assis: 8, percee: Number(process.env.PERCEES || 4) };
  try {
    for (const graine of graines) {
      // Passe 1 : où tombent les temps forts.
      await ouvrirMatch(page, graine);
      const faits = [];
      let etat = { i: 0 };
      while (!etat.fini && etat.i < imagesMax) { etat = await page.evaluer(`__film.pas(120, true)`); faits.push(...etat.faits); }
      const compte = {};
      const gardes = faits.filter(f => (compte[f.type] = (compte[f.type] || 0) + 1) <= parType[f.type]);
      console.log(`match ${graine} : ${etat.i} images, score ${etat.a}-${etat.b}, ` + Object.entries(compte).map(([k, n]) => `${n} ${k}`).join(', '));
      // Les fenêtres à filmer, fusionnées quand elles se touchent.
      const fenetres = [];
      for (const f of gardes.sort((x, y) => x.i - y.i)) {
        const [avant, apres] = FENETRES[f.type];
        const debut = Math.max(0, Math.round(f.i - avant * IPS_FILM)), fin = Math.round(f.i + apres * IPS_FILM);
        const derniere = fenetres.at(-1);
        if (derniere && debut <= derniere.fin + IPS_FILM) { derniere.fin = Math.max(derniere.fin, fin); derniere.faits.push(f); }
        else fenetres.push({ debut, fin, faits: [f] });
      }
      // Passe 2 : le même match, dessiné et photographié autour de chaque fenêtre.
      await ouvrirMatch(page, graine);
      let i = 0, numero = 0;
      const revus = [];
      const avancer = async (jusqua, dessiner) => {
        while (i < jusqua) { const r = await page.evaluer(`__film.pas(${Math.min(120, jusqua - i)}, true)`); revus.push(...r.faits); if (r.i === i) break; i = r.i; }
      };
      for (const fenetre of fenetres) {
        await avancer(fenetre.debut);
        const clip = scene(`match-${graine}-${String(++numero).padStart(2, '0')}`);
        while (i < fenetre.fin) {
          const r = await page.evaluer(`__film.pas(1, true)`);
          revus.push(...r.faits);
          if (r.i === i) break;
          i = r.i;
          // Soixante images par seconde là où le montage ralentit (autour du fait), trente ailleurs : moitié moins de photos.
          if (i % 2 && !fenetre.faits.some(f => i > f.i - 1.2 * IPS_FILM && i < f.i + 1.6 * IPS_FILM)) continue;
          const photo = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, optimizeForSpeed: true });
          ecrire(clip, Buffer.from(photo.data, 'base64'), (i - fenetre.debut) * 1000 / IPS_FILM);
        }
        const evenements = fenetre.faits.map(f => ({ type: f.type, detail: f.detail, at: (f.i - fenetre.debut) * 1000 / IPS_FILM }));
        clore(clip, { evenements, graine, ips: IPS_FILM });
        console.log('  ' + evenements.map(ev => `${ev.type} ${ev.detail}`).join(' · '));
      }
      // Le match rejoué doit être le même : chaque temps fort filmé retombe sur son image.
      const decales = gardes.filter(f => f.i <= i && !revus.some(r => r.type === f.type && r.i === f.i));
      if (decales.length) console.warn(`⚠️ match ${graine} : ${decales.length} temps forts ne retombent pas sur leur image (rejoue différente)`);
      fs.writeFileSync(path.join(out, `match-${graine}.json`), JSON.stringify({ faits, fenetres: fenetres.length, score: [etat.a, etat.b] }, null, 1));
    }
  } finally { page.fermer(); }
}

const mode = process.argv[2];
(mode === 'sonde' || mode === 'rejoue' ? Promise.resolve() : mode === 'promo' ? promos() : mode === 'match' ? matchs((process.argv[3] || '7').split(',')) : Promise.reject(new Error('Usage : promo | match [graines]')))
  .catch(erreur => { console.error(erreur); process.exitCode = 1; });

// Mode de mise au point : `node scripts/filmerFemininesTikTok.cjs sonde "<expression>"` évalue une expression dans la page du match.
if (mode === 'sonde') (async () => {
  process.exitCode = 0;
  const page = await ouvrir(1280, 720, 1);
  try {
    await page.send('Page.navigate', { url: `${BASE}/rn26/index.html?stade=grand` });
    for (let i = 0; i < 200 && !(await page.evaluer('Boolean(window.rn26 && window.rn26.match)').catch(() => false)); i++) await sleep(500);
    await sleep(Number(process.argv[4] || 3000));
    console.log(JSON.stringify(await page.evaluer(process.argv[3]), null, 1));
  } finally { page.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

// Mise au point : `node scripts/filmerFemininesTikTok.cjs rejoue <graine>` joue trois fois les mêmes 9 000 images
// (sans dessin, sans dessin, avec dessin) et montre si le match est le même.
if (mode === 'rejoue') (async () => {
  process.exitCode = 0;
  const page = await ouvrir(540, 960, 2);
  try {
    for (const dessiner of [true, true]) {
      await ouvrirMatch(page, process.argv[3] || 'f1');
      let r, faits = [];
      for (let k = 0; k < (dessiner ? 300 : 8); k++) { r = await page.evaluer(`__film.pas(${dessiner ? 30 : 1125}, ${dessiner})`); faits.push(...r.faits); }
      const etat = await page.evaluer(`(() => { const e = rn26.match.e; return [e.sim, e.t, e.minuteur, e.phase, e.scoreA, e.scoreB, e.pions[9].pos.x, e.pions[20].pos.y].join(' '); })()`);
      console.log(dessiner ? 'dessiné    ' : 'sans dessin', r.i, etat, faits.map(f => f.type + '@' + f.i).join(' '));
    }
  } finally { page.fermer(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
