// LE VRAI ESSAI DE LA CHUTE — « C'était juste Antoine Dupont » / « That's just Cheslin Kolbe ».
//
//   node trailer/enquete/gameplay.cjs chercher fr [graines]   # joue de vrais matchs du moteur, relève les essais du joueur voulu
//   node trailer/enquete/gameplay.cjs filmer fr [camera]      # rejoue le match retenu et photographie la percée et l'essai
//   SANS_NOM=1 node trailer/enquete/gameplay.cjs filmer fr    # la même prise sans l'étiquette du porteur (dossier …-sansnom) :
//                                                             # dans la pub, c'est la voix qui donne le nom, pas l'image
//   node trailer/enquete/gameplay.cjs pack en                 # la vraie ouverture d'un pack Springboks (Kolbe en meilleure carte)
//   node trailer/enquete/gameplay.cjs sonde "<expression>"    # mise au point
//
// Même méthode que scripts/filmerFemininesTikTok.cjs : /rn26/index.html?banc=1, un pas du match par image. Rien n'est mis en
// scène — on ne fait que donner aux quinze joueurs les noms de la feuille de match (comme le jeu le fait avec ses cartes) et
// attendre que le bon joueur marque. Les deux passes dessinent chaque image (la scène retient le moteur pendant les phases
// arrêtées) : le match rejoué est donc le même, et l'essai retombe sur la même image.
const fs = require('node:fs');
const path = require('node:path');
const { ouvrir, pause, racine } = require('../catastrophe/cdp.cjs');

const BASE = process.env.DESTINY_URL || 'http://localhost:5199';
const sortie = path.join(__dirname, 'rushes');
const IPS = 30;                                             // un pas de 1/30 s par image : la cadence de la pub

const FEUILLES = {
  fr: {
    numero: 9, nom: 'Antoine DUPONT',
    equipes: [
      { nom: 'France', maillot: { principal: '#0a2459', secondaire: '#1b3d9e', accent: '#ffffff', short: '#f1f1ee', chaussettes: '#d00000', motif: 'epaules' } },
      { nom: 'Angleterre', maillot: { principal: '#f2f4f3', secondaire: '#dfe5e8', accent: '#c8102e', short: '#f2f4f3', chaussettes: '#0b1f44', motif: 'uni' } },
    ],
    xv: ['Cyril BAILLE', 'Julien MARCHAND', 'Uini ATONIO', 'Thibaud FLAMENT', 'Emmanuel MEAFOU', 'François CROS', 'Charles OLLIVON', 'Greg ALLDRITT', 'Antoine DUPONT', 'Romain NTAMACK', 'Louis BIELLE-BIARREY', 'Yoram MOEFANA', 'Gaël FICKOU', 'Damian PENAUD', 'Thomas RAMOS'],
  },
  en: {
    numero: 14, nom: 'Cheslin KOLBE',
    // Consigne d'équipe : jouer au large (l'un des cinq styles du moteur) — sans elle, l'ailier ne touche presque pas le ballon.
    style: 'large',
    equipes: [
      { nom: 'Afrique du Sud', maillot: { principal: '#0b5d3b', secondaire: '#0a4a30', accent: '#f2b632', short: '#ffffff', chaussettes: '#0b5d3b', motif: 'uni' } },
      { nom: 'Angleterre', maillot: { principal: '#f2f4f3', secondaire: '#dfe5e8', accent: '#c8102e', short: '#f2f4f3', chaussettes: '#0b1f44', motif: 'uni' } },
    ],
    xv: ['Wilco LOUW', 'Malcolm MARX', 'Frans MALHERBE', 'Eben ETZEBETH', 'Franco MOSTERT', 'Siya KOLISI', 'Pieter-Steph DU TOIT', 'Jasper WIESE', 'Grant WILLIAMS', 'Handré POLLARD', 'Kurt-Lee ARENDSE', 'Damian DE ALLENDE', 'Jesse KRIEL', 'Cheslin KOLBE', 'Damian WILLEMSE'],
  },
};

const PLEIN_CADRE = `(() => { const s = document.createElement('style');
  s.textContent = 'header,aside,#status,#saved,body>div:not(#scene){display:none!important} html,body{margin:0;overflow:hidden;background:#000} #scene{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}';
  document.head.appendChild(s); window.dispatchEvent(new Event('resize')); return true; })()`;

const preparer = (feuille, graine, camera) => `(async () => {
  const moteur = await import('/rn26/moteur-destiny.js');
  const { DestinyMatch } = await import('/rn26/destiny.mjs');
  const etat = moteur.creerApercuDestiny('enquete-' + ${JSON.stringify(String(graine))});
  const xv = ${JSON.stringify(feuille.xv)};
  for (const p of etat.pions) if (p.cote === 'A' && xv[p.numero - 1]) p.nom = xv[p.numero - 1];
  // L'aperçu donne aux trente joueurs des notes voisines (76 à 79) : la vedette reçoit des appuis et une pointe de vitesse
  // à la mesure de sa carte. Le match reste celui du moteur : rien n'est écrit d'avance.
  const vedette = etat.pions.find(p => p.cote === 'A' && p.numero === ${feuille.numero});
  if (${JSON.stringify(feuille.style || '')} && etat.styles) etat.styles.A = ${JSON.stringify(feuille.style || '')};
  vedette.evitement = 96; vedette.vision = 97; vedette.acceleration *= 1.12; vedette.vitesseMax = Math.min(10.6, vedette.vitesseMax * 1.07);
  etat.carriereDixMinutes = true;
  rn26.match = new DestinyMatch({ etat, outils: rn26.match.outils, avancer: moteur.avancer });
  const c = document.querySelector('#camera'); c.value = ${JSON.stringify(camera)}; c.dispatchEvent(new Event('change', { bubbles: true }));
  rn26.scene3D.television = { ralentis: false };
  rn26.scene3D.recadrer();
  // Le relevé : à chaque essai de l'équipe A, qui a marqué, et ce qu'il a fait dans les secondes d'avant.
  const journal = [];
  let essais = etat.essaisA, i = 0;
  window.__film = { pas(n) {
    const faits = [];
    for (let k = 0; k < n; k++) {
      const e = rn26.match.e;
      if (e.fini) break;
      const porteur = e.porteur ? { id: e.porteur.id, cote: e.porteur.cote, numero: e.porteur.numero, x: e.porteur.pos.x, y: e.porteur.pos.y } : null;
      rn26.match.step(1 / ${IPS}); rn26.scene3D.image(1 / ${IPS}, { vitesse: 1 });
      i++;
      if (porteur) { journal.push({ i, ...porteur, percee: !!(e.perceeSignalee || e.echappee) }); if (journal.length > ${IPS * 14}) journal.shift(); }
      if (e.essaisA > essais) {
        essais = e.essaisA;
        const marqueur = e.pions.find(p => p.id === (e.tir && e.tir.marqueurId)) || (journal.length ? e.pions.find(p => p.id === journal.at(-1).id) : null);
        const sien = journal.filter(j => marqueur && j.id === marqueur.id);
        // Depuis quand il porte le ballon sans interruption, et combien de mètres il a courus avec.
        let depuis = journal.length - 1; while (depuis > 0 && marqueur && journal[depuis - 1].id === marqueur.id) depuis--;
        const course = journal.slice(depuis);
        const gestes = (e.gestes || []).filter(g => marqueur && (g.joueurId === marqueur.id || g.id === marqueur.id || g.pionId === marqueur.id)).slice(-6).map(g => (g.clip || '') + ':' + (g.variante || ''));
        faits.push({ i, minute: e.minute, score: e.scoreA + '-' + e.scoreB, numero: marqueur ? marqueur.numero : 0, nom: marqueur ? marqueur.nom : '?',
          imagesBallonEnMain: course.length, metres: course.length ? Math.round(Math.hypot(course.at(-1).x - course[0].x, course.at(-1).y - course[0].y)) : 0,
          percee: course.some(j => j.percee), gestes });
      }
    }
    const e = rn26.match.e;
    return { i, fini: !!e.fini, faits, a: e.scoreA, b: e.scoreB };
  } };
  return true;
})()`;

async function ouvrirMatch(page, feuille, graine, camera = 'tv') {
  await page.send('Page.navigate', { url: `${BASE}/rn26/index.html?banc=1&stade=international&equipes=${encodeURIComponent(JSON.stringify(feuille.equipes))}` });
  await page.attendre('Boolean(window.rn26 && window.rn26.match)', 400, 500);
  await page.evaluer(PLEIN_CADRE);
  await page.evaluer(preparer(feuille, graine, camera));
}

async function chercher(langue, graines) {
  const feuille = FEUILLES[langue];
  // Petite toile : la recherche n'a pas besoin de l'image, seulement que la scène tourne comme au tournage.
  const page = await ouvrir({ largeur: 180, hauteur: 320, echelle: 1, port: Number(process.env.PORT_CDP || (langue === 'en' ? 9272 : 9271)), profil: path.join(racine, 'node_modules', `.capture-enquete-recherche-${langue}-${process.env.PORT_CDP || 0}`) });
  const trouves = [];
  try {
    for (const graine of graines) {
      await ouvrirMatch(page, feuille, graine);
      const t0 = Date.now();
      let etat = { i: 0 };
      const essais = [];
      while (!etat.fini && etat.i < IPS * 60 * 24) { etat = await page.evaluer('__film.pas(300)'); essais.push(...etat.faits); }
      console.log(`${langue} graine ${graine} : ${etat.i} images en ${((Date.now() - t0) / 1000).toFixed(0)} s, ${etat.a}-${etat.b} — ` + essais.map(f => `n°${f.numero} (${f.metres} m${f.percee ? ', percée' : ''})`).join(' · '));
      for (const f of essais) if (f.numero === feuille.numero) { trouves.push({ graine, ...f }); console.log('   ★ ' + JSON.stringify(f)); }
      fs.mkdirSync(sortie, { recursive: true });
      fs.writeFileSync(path.join(sortie, `essais-${langue}-${graines.join('_')}.json`), JSON.stringify(trouves, null, 1));
    }
  } finally { page.fermer(); }
}

async function filmer(langue, camera) {
  const feuille = FEUILLES[langue];
  const choix = JSON.parse(fs.readFileSync(path.join(__dirname, 'montage.json'), 'utf8')).essai[langue];
  const page = await ouvrir({ largeur: 540, hauteur: 960, echelle: 2, port: Number(process.env.PORT_CDP || (langue === 'en' ? 9274 : 9273)), profil: path.join(racine, 'node_modules', `.capture-enquete-film-${langue}-${process.env.PORT_CDP || 0}`) });
  try {
    await ouvrirMatch(page, feuille, choix.graine, camera);
    const debut = choix.image - Math.round(IPS * (choix.avant ?? 9)), fin = choix.image + Math.round(IPS * (choix.apres ?? 3.5));
    let i = 0;
    while (i < debut) { const r = await page.evaluer(`__film.pas(${Math.min(300, debut - i)})`); if (r.i === i) break; i = r.i; }
    // L'étiquette du porteur est un sprite de la scène : rendue transparente, l'image est la même, sans le nom.
    const sansNom = !!process.env.SANS_NOM;
    if (sansNom) await page.evaluer(`(() => { let n = 0; rn26.scene.traverse(o => { if (o.isSprite && o.material && o.material.map && o.material.map.isCanvasTexture) { o.material.transparent = true; o.material.opacity = 0; n++; } }); return n; })()`).then(n => console.log(`étiquette masquée (${n} sprite)`));
    const dir = path.join(sortie, `essai-${langue}-${camera}${sansNom ? '-sansnom' : ''}`);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const frames = []; let essai = null;
    while (i < fin) {
      const r = await page.evaluer('__film.pas(1)');
      if (r.i === i) break;
      i = r.i;
      if (r.faits.length) essai = { image: frames.length, ...r.faits[0] };
      const etat = await page.evaluer(`(() => { const e = rn26.match.e, p = e.porteur; return { phase: e.phase, porteur: p ? p.nom : null, numero: p ? p.numero : 0, cote: p ? p.cote : '', percee: !!(e.perceeSignalee || e.echappee),
        geste: p ? (e.gestes || []).filter(g => g.joueurId === p.id && e.sim >= g.debut && e.sim <= g.debut + g.duree).map(g => g.clip + ':' + (g.variante || '')).join('+') : '' }; })()`);
      const file = `${String(frames.length).padStart(5, '0')}.jpg`;
      fs.writeFileSync(path.join(dir, file), await page.photo('jpeg', 93));
      frames.push({ file, i, ...etat });
    }
    fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify({ ips: IPS, camera, graine: choix.graine, essai, frames }));
    console.log(`${langue} ${camera} : ${frames.length} images, essai ${essai ? `à l'image ${essai.image} par ${essai.nom} (n°${essai.numero})` : 'NON RETROUVÉ — le match rejoué diffère'}`);
  } finally { page.fermer(); }
}

// L'ouverture de pack de la version anglaise : le vrai composant du jeu, les vraies cartes (plateau.tsx).
async function pack(langue) {
  const page = await ouvrir({ largeur: 540, hauteur: 960, echelle: 2, port: 9276, profil: path.join(racine, 'node_modules', '.capture-enquete-pack') });
  const dir = path.join(sortie, `${langue}-pack`);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const frames = []; let debut = 0;
  page.ecouter((tampon, meta) => { if (!debut) return; const file = `${String(frames.length).padStart(5, '0')}.jpg`; fs.writeFileSync(path.join(dir, file), tampon); frames.push({ file, at: Math.max(0, (meta.timestamp - debut) * 1000) }); });
  try {
    await page.send('Page.navigate', { url: `${BASE}/trailer/enquete/plateau.html?lang=${langue}&noms=KOLISI,POLLARD,KOLBE&pack=Springboks&modele=/m3d/packs-speciaux/springboks.glb` });
    await page.attendre('Boolean(document.querySelector("canvas[data-ready=true]"))', 400, 500);
    await pause(900);
    console.log(JSON.stringify(await page.evaluer('window.__provenance')));
    debut = Date.now() / 1000;
    await page.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
    await page.evaluer('document.querySelector(".pack-show-touch").click(), true');
    await pause(15000);
    await page.send('Page.stopScreencast');
    frames.sort((a, b) => a.at - b.at);
    fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify({ duree: 15000, frames }));
    console.log(`${langue}-pack : ${frames.length} images`);
    if (page.journal.length) console.log(page.journal.slice(0, 6).join(String.fromCharCode(10)));
  } finally { page.fermer(); }
}

const [mode, langue, extra] = process.argv.slice(2);
(mode === 'chercher' ? chercher(langue === 'en' ? 'en' : 'fr', (extra || '1,2,3,4').split(','))
  : mode === 'filmer' ? filmer(langue === 'en' ? 'en' : 'fr', extra || 'tv')
  : mode === 'pack' ? pack(langue === 'en' ? 'en' : 'fr')
  : mode === 'sonde' ? (async () => {
    const page = await ouvrir({ largeur: 360, hauteur: 640, echelle: 1, port: 9275, profil: path.join(racine, 'node_modules', '.capture-enquete-sonde') });
    try { await ouvrirMatch(page, FEUILLES.fr, 's', 'tv'); console.log(JSON.stringify(await page.evaluer(langue), null, 1)); } finally { page.fermer(); }
  })() : Promise.reject(new Error('Usage : chercher fr|en [graines] | filmer fr|en [camera] | sonde "<expression>"')))
  .catch(e => { console.error(e); process.exitCode = 1; });
