// LE VRAI GAMEPLAY DE LA SCÈNE 5 — rien n'est mis en scène.
//
//   node trailer/catastrophe/gameplay.cjs tir [n]        # une transformation réussie du moteur de match 3D, image par image
//   node trailer/catastrophe/gameplay.cjs interface fr   # ouverture de pack, composition (vraie application, vraie langue)
//
// Le jeu doit tourner (DESTINY_URL, par défaut http://localhost:5199). Le tir sort de /rn26/index.html?banc=1 :
// un vrai match du moteur, avancé jusqu'à sa prochaine transformation, puis dessiné et photographié pas à pas (1/60 s).
// Sortie : trailer/catastrophe/rushes/<nom>/ (images + frames.json).
const fs = require('node:fs');
const path = require('node:path');
const { ouvrir, pause, racine } = require('./cdp.cjs');

const BASE = process.env.DESTINY_URL || 'http://localhost:5199';
const sortie = path.join(__dirname, 'rushes');
const profil = path.join(racine, 'node_modules', '.capture-catastrophe');

function clip(nom) {
  const dir = path.join(sortie, nom);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return { nom, dir, frames: [] };
}
function ecrire(c, tampon, infos) {
  const file = `${String(c.frames.length).padStart(5, '0')}.jpg`;
  fs.writeFileSync(path.join(c.dir, file), tampon);
  c.frames.push({ file, ...infos });
}
function clore(c, extra = {}) {
  fs.writeFileSync(path.join(c.dir, 'frames.json'), JSON.stringify({ ...extra, frames: c.frames }));
  console.log(`${c.nom} : ${c.frames.length} images`);
}

const PLEIN_CADRE = `(() => {
  const style = document.createElement('style');
  style.textContent = 'header,aside,#status,#saved,body>div:not(#scene){display:none!important} html,body{margin:0;overflow:hidden;background:#000} #scene{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}';
  document.head.appendChild(style);
  window.dispatchEvent(new Event('resize'));
  return true;
})()`;

async function tir(combien) {
  const page = await ouvrir({ largeur: 540, hauteur: 960, echelle: 2, profil });
  try {
    const stade = process.env.STADE || 'international';
    await page.send('Page.navigate', { url: `${BASE}/rn26/index.html?banc=1&stade=${stade}` });
    await page.attendre('Boolean(window.rn26 && window.rn26.match)', 400, 500);
    await page.evaluer(PLEIN_CADRE);
    await page.evaluer(`(() => { const c = document.querySelector('#camera'); c.value = ${JSON.stringify(process.env.CAMERA || 'tv')}; c.dispatchEvent(new Event('change', { bubbles: true }));
      rn26.scene3D.television = { ralentis: false }; rn26.scene3D.recadrer(); return true; })()`);
    let gardes = 0;
    for (let essai = 0; essai < 14 && gardes < combien; essai++) {
      // Jusqu'à la prochaine transformation, sans photo ; puis jusqu'à ce que le buteur pose le ballon.
      const trouve = await page.evaluer(`(() => { const m = rn26.match; if (m.e.phase === 'transformation') { let g = 0; while (m.e.phase === 'transformation' && !m.e.fini && g++ < 6000) m.step(1/60); }
        return m.nextPhase('transformation'); })()`);
      if (!trouve) { console.log('plus de transformation dans ce match'); break; }
      // Le rituel du buteur, dessiné (la scène retient le moteur sur ce qu'elle affiche) mais pas photographié.
      let etat;
      for (let k = 0; k < 4000; k++) {
        etat = await page.evaluer(`(() => { const m = rn26.match, e = m.e; for (let i = 0; i < 6; i++) { if (e.phase !== 'transformation' || (e.tir && (e.tir.etape === 'pret' || e.tir.etape === 'elan' || e.tir.volLance))) break; m.step(1/60); rn26.scene3D.image(1/60, { vitesse: 1 }); }
          return { phase: e.phase, etape: e.tir && e.tir.etape, vol: !!(e.tir && e.tir.volLance), a: e.scoreA, b: e.scoreB }; })()`);
        if (etat.phase !== 'transformation' || etat.etape === 'pret' || etat.etape === 'elan' || etat.vol) break;
      }
      if (etat.phase !== 'transformation') continue;
      const avant = etat.a + etat.b;
      const c = clip(`tir-essai-${essai}`);
      let apres = 0, frappe = -1;
      for (let k = 0; k < 60 * 16; k++) {
        const r = await page.evaluer(`(() => { const m = rn26.match, e = m.e; m.step(1/60); rn26.scene3D.image(1/60, { vitesse: 1 });
          const b = e.ballon || {}; return { phase: e.phase, etape: e.tir && e.tir.etape || null, vol: !!(e.tir && e.tir.volLance), reussi: e.tir ? e.tir.reussi : null, a: e.scoreA, b: e.scoreB, sim: e.sim, bx: b.x, by: b.y, bz: e.vol ? e.vol.hauteur || null : null }; })()`);
        if (r.vol && frappe < 0) frappe = c.frames.length;
        ecrire(c, await page.photo('jpeg', 93), r);
        if (r.phase !== 'transformation') { if (++apres > 75) break; }
      }
      const fin = c.frames.at(-1);
      const reussi = fin.a + fin.b === avant + 2;
      clore(c, { ips: 60, frappe, reussi, stade });
      console.log(`  frappe à l'image ${frappe}, ${reussi ? 'RÉUSSIE' : 'manquée'} (${fin.a}-${fin.b})`);
      if (reussi && frappe > 0) { gardes++; const cible = path.join(sortie, `tir-${process.env.CAMERA || 'tv'}-${gardes}`); fs.rmSync(cible, { recursive: true, force: true }); fs.renameSync(c.dir, cible); }
      else fs.rmSync(c.dir, { recursive: true, force: true });
    }
    if (page.journal.length) console.log(page.journal.slice(0, 8).join('\n'));
  } finally { page.fermer(); }
}

// L'interface : flux d'images du navigateur, horodaté (le montage rééchantillonne).
async function interfaceJeu(langue) {
  const page = await ouvrir({ largeur: 540, hauteur: 960, echelle: 2, profil });
  let actuel = null;
  page.ecouter((tampon, meta) => { if (actuel) ecrire(actuel, tampon, { at: Math.max(0, (meta.timestamp - actuel.debut) * 1000) }); });
  const filmer = async (nom, duree, action) => {
    const c = clip(`${langue}-${nom}`);
    c.debut = Date.now() / 1000;
    actuel = c;
    await page.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
    if (action) await action();
    await pause(duree * 1000);
    await page.send('Page.stopScreencast');
    actuel = null;
    c.frames.sort((x, y) => x.at - y.at);
    clore(c, { duree: duree * 1000 });
  };
  try {
    // 1. L'ouverture d'un pack Top 14 : le vrai composant OuverturePack et les vraies cartes du catalogue (plateau du 12 octobre).
    if (!fs.existsSync(path.join(sortie, `${langue}-pack`, 'frames.json'))) {
      await page.send('Page.navigate', { url: `${BASE}/trailer/capture-2026-10-12/plateau.html?lang=${langue}` });
      await page.attendre('Boolean(document.querySelector("canvas[data-ready=true]"))', 240, 500);
      await pause(800);
      await filmer('pack', 15, () => page.evaluer('document.querySelector(".pack-show-touch").click(), true'));
    }
    // 2. Le bureau d'entraîneur et la composition, dans la vraie application (profil Chrome à part : aucune sauvegarde touchée).
    await page.send('Page.navigate', { url: `${BASE}/` });
    await pause(3500);
    await page.evaluer(`localStorage.setItem('destiny-rugby:tutoriel', JSON.stringify({ v: 1, vus: {}, desactive: true })), true`);
    await page.send('Page.navigate', { url: `${BASE}/` });
    await pause(3500);
    await page.evaluer(`[...document.querySelectorAll('button')].find(b => /Passer|Skip/.test(b.textContent))?.click(), true`);
    const store = expr => page.evaluer(`(async () => { const { useGame } = await import('/src/store/useGame.ts'); return ${expr}; })()`);
    await store(`useGame.getState().setLangue('${langue}')`);
    await store(`useGame.getState().creerManager({ nom: 'Alex Martin', nation: 'France', club: 'Stade Toulousain', age: 34, libre: true })`);
    // Le bureau est chargé à la demande : on attend qu'il soit réellement à l'écran avant de filmer.
    await page.attendre('Boolean(document.querySelector(".manager-onglets"))', 240, 500);
    await pause(2500);
    await filmer('manager', 3.5, () => page.evaluer('window.scrollBy({ top: 260, behavior: "smooth" }), true'));
    await page.evaluer('window.scrollTo(0, 0), document.querySelector(".manager-onglets button:nth-child(2)")?.click(), true');
    await page.attendre('Boolean(document.querySelector("[data-tuto=compo-terrain]"))', 240, 500);
    await pause(2500);
    await page.evaluer('document.querySelector("[data-tuto=compo-terrain]").scrollIntoView({ block: "center" }), true');
    await pause(900);
    await filmer('composition', 4, () => page.evaluer('window.scrollBy({ top: 160, behavior: "smooth" }), true'));
    if (page.journal.length) console.log(page.journal.slice(0, 8).join('\n'));
  } finally { page.fermer(); }
}

const mode = process.argv[2];
(mode === 'tir' ? tir(Number(process.argv[3] || 2)) : mode === 'interface' ? interfaceJeu(process.argv[3] === 'en' ? 'en' : 'fr') : Promise.reject(new Error('Usage : tir [n] | interface fr|en')))
  .catch(erreur => { console.error(erreur); process.exitCode = 1; });
