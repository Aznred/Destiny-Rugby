// LE LECTEUR DES PUBS — commun à toutes : il dessine l'image de l'instant qu'on lui demande.
//
//   …/pub.html?langue=fr            # l'aperçu joue en boucle
//   …&flou=8                        # sous-images par image (flou de mouvement) ; 1 pour aller vite
//   window.__pub.dessiner(t)        # ce que filmer.cjs appelle, image par image
//
// Chaque pub (catastrophe/pub.js, enquete/pub.js…) lui donne ses décors 3D, la liste de ses extraits de vrai jeu et la
// façon de les cadrer. Lui apporte le reste : la chaîne d'image (flou de mouvement, flou lumineux, étalonnage), la
// chronologie calée sur la voix, les sous-titres mot à mot, le carton final.
// Rien ne dépend de l'horloge : chaque plan est une fonction du temps, donc une image se redessine à l'identique.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { TexturePass } from 'three/examples/jsm/postprocessing/TexturePass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { lisser, borner, sortieDouce } from './scene/bruit.js';

const OBTURATEUR = 0.55;                                   // part de l'image pendant laquelle l'obturateur est ouvert

const ETALONNAGE = (L, H) => ({
  uniforms: {
    tDiffuse: { value: null }, temps: { value: 0 }, vignette: { value: 0.8 }, grain: { value: 0.04 }, aberration: { value: 0.5 }, eclair: { value: 0 }, noir: { value: 0 },
    saturation: { value: 1 }, exposition: { value: 1 }, teinte: { value: new THREE.Vector3(1, 1, 1) }, flouRadial: { value: 0 }, taille: { value: new THREE.Vector2(L, H) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float temps, vignette, grain, aberration, eclair, noir, saturation, exposition, flouRadial; uniform vec3 teinte; uniform vec2 taille;
    varying vec2 vUv;
    float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec2 c = vUv - 0.5;
      float r2 = dot(c * vec2(0.5625, 1.0), c * vec2(0.5625, 1.0)) * 4.0;
      vec2 ecart = c * aberration * 0.012 * r2;
      vec3 couleur = vec3(0.0);
      // Flou de zoom : douze échantillons vers le centre (une seule lecture quand il est nul).
      for (int i = 0; i < 12; i++) {
        float k = float(i) / 11.0;
        vec2 p = 0.5 + c * (1.0 - flouRadial * k);
        couleur += vec3(texture2D(tDiffuse, p + ecart).r, texture2D(tDiffuse, p).g, texture2D(tDiffuse, p - ecart).b);
        if (flouRadial <= 0.0) { couleur *= 12.0; break; }
      }
      couleur /= 12.0;
      couleur *= exposition * teinte;
      float lum = dot(couleur, vec3(0.2126, 0.7152, 0.0722));
      couleur = mix(vec3(lum), couleur, saturation);
      couleur *= mix(1.0, smoothstep(1.25, 0.20, sqrt(r2)), vignette);
      couleur += (h21(vUv * taille + fract(temps * 7.31) * 913.0) - 0.5) * grain * (0.35 + lum);
      couleur += eclair * vec3(7.0);
      couleur *= 1.0 - noir;
      gl_FragColor = vec4(max(couleur, 0.0), 1.0);
    }`,
});

/**
 * @param {object} pub
 * @param {(outils: { moteur: THREE.WebGLRenderer, L: number, H: number, C: object, langue: string }) => Record<string, Function>} pub.decors
 *   construit les décors et rend, pour chaque plan de la chronologie, la fonction (k, t, plan) qui le pose.
 * @param {Record<string, string>} pub.clips  nom de l'extrait (clé de montage.json) → fenêtre de la chronologie (clé de C.jeu) qui donne sa durée.
 * @param {(t: number, outils: object) => number} pub.jeu  dessine le vrai jeu à l'instant t (là où aucun plan 3D ne joue) ; rend la clarté de l'éclair de coupe.
 */
export async function lancerLecteur(pub) {
  const reglages = new URLSearchParams(location.search);
  const LANGUE = reglages.get('langue') === 'en' ? 'en' : 'fr';
  const FLOU = Math.max(1, Number(reglages.get('flou') || 1));
  const echelle = window.devicePixelRatio || 1;
  const L = Math.round(540 * echelle), H = Math.round(960 * echelle);

  const toile = document.getElementById('toile');
  const moteur = new THREE.WebGLRenderer({ canvas: toile, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  moteur.setPixelRatio(1);
  moteur.setSize(L, H, false);
  moteur.toneMapping = THREE.ACESFilmicToneMapping;
  moteur.outputColorSpace = THREE.SRGBColorSpace;
  moteur.setClearColor(0x000000, 1);

  // ── La chaîne d'image : la scène est dessinée FLOU fois dans l'obturateur et moyennée (en lumière linéaire),
  //    puis flou lumineux, étalonnage, courbe de film. ───────────────────────────────────────────────────────
  const cibleScene = new THREE.WebGLRenderTarget(L, H, { type: THREE.HalfFloatType, samples: 4 });
  const cibleCumul = new THREE.WebGLRenderTarget(L, H, { type: THREE.HalfFloatType, depthBuffer: false });
  const cameraPlate = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const matiereCumul = new THREE.ShaderMaterial({
    uniforms: { carte: { value: cibleScene.texture }, poids: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D carte; uniform float poids; varying vec2 vUv; void main(){ gl_FragColor = vec4(min(texture2D(carte, vUv).rgb, vec3(90.0)) * poids, 1.0); }',
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, depthTest: false, depthWrite: false, transparent: true,
  });
  const sceneCumul = new THREE.Scene();
  sceneCumul.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matiereCumul));
  const chaine = new EffectComposer(moteur);
  chaine.setSize(L, H);
  const passeLumiere = new UnrealBloomPass(new THREE.Vector2(L, H), 0.6, 0.55, 0.9);
  const passeEtalonnage = new ShaderPass(ETALONNAGE(L, H));
  chaine.addPass(new TexturePass(cibleCumul.texture));
  chaine.addPass(passeLumiere);
  chaine.addPass(passeEtalonnage);
  chaine.addPass(new OutputPass());

  // ── La chronologie : les scènes viennent de la voix, les plans se partagent chaque scène. ───────────────────
  const C = await (await fetch(`./chronologie-${LANGUE}.json`)).json();
  const M = await (await fetch('./montage.json')).json();
  pub.preparer?.(C, M, LANGUE);                             // la pub peut caler ses extraits sur la chronologie
  const rendus = pub.decors({ moteur, L, H, C, M, langue: LANGUE });
  const plans = C.plans.filter(p => rendus[p.nom]).map(p => ({ ...p, rendre: rendus[p.nom] }));
  const planA = t => plans.find(p => t >= p.debut && t < p.fin) || null;

  // ── Le vrai gameplay : des images du jeu, chargées et décodées d'avance, posées sur une toile 2D. ───────────
  const toileJeu = document.getElementById('jeu');
  const crayon = toileJeu.getContext('2d');
  const clips = {};
  async function chargerClip(nom, brut, duree) {
    // Un extrait peut avoir une définition par langue (un essai de Dupont en français, de Kolbe en anglais).
    const definition = brut[LANGUE] && typeof brut[LANGUE] === 'object' ? { ...brut, ...brut[LANGUE] } : brut;
    const n = Math.ceil(duree * C.ips) + 2;
    let liste;                                              // l'image du jeu à montrer pour chaque image de la pub
    if (definition.segments) {                              // match 3D : un pas du moteur par image, d'une image à l'autre
      const pas = definition.ips / C.ips * (definition.vitesse || 1);
      const toutes = [];
      for (const s of definition.segments) for (let i = s.de; i <= s.a; i++) toutes.push(`./${s.dossier}/${String(i).padStart(5, '0')}.jpg`);
      liste = Array.from({ length: n }, (_, k) => toutes[Math.min(toutes.length - 1, Math.round(k * pas))]);
    } else {                                                // interface : flux horodaté
      const dossier = definition[LANGUE];
      const index = await (await fetch(`./${dossier}/frames.json`)).json();
      // « morceaux » : l'extrait saute d'un moment du flux à un autre ({ a: seconde de l'extrait, depart: seconde du flux }).
      const morceaux = definition.morceaux?.[LANGUE] || definition.morceaux || [{ a: 0, depart: definition.depart }];
      liste = Array.from({ length: n }, (_, k) => {
        const tau = k / C.ips, morceau = morceaux.filter(m => tau >= m.a).at(-1) || morceaux[0];
        const cible = (morceau.depart + (tau - morceau.a) * (definition.vitesse || 1)) * 1000;
        let i = 0; while (i + 1 < index.frames.length && index.frames[i + 1].at <= cible) i++;
        return `./${dossier}/${index.frames[i].file}`;
      });
    }
    const images = new Map();
    await Promise.all([...new Set(liste)].map(async url => { const image = new Image(); image.src = url; await image.decode(); images.set(url, image); }));
    clips[nom] = { liste, images };
  }
  await Promise.all(Object.entries(pub.clips).map(([nom, fenetre]) => chargerClip(nom, M[nom], C.jeu[fenetre][1] - C.jeu[fenetre][0])));
  const outilsJeu = {
    C, M, langue: LANGUE, toile: toileJeu,
    /** Pose l'image d'un extrait, `tau` secondes après son début. */
    poser(nom, tau) {
      const clip = clips[nom];
      const image = clip.images.get(clip.liste[Math.min(clip.liste.length - 1, Math.max(0, Math.round(tau * C.ips)))]);
      if (image) crayon.drawImage(image, 0, 0, toileJeu.width, toileJeu.height);
    },
    /** Cadre l'image posée : grossissement, point fixe, filtre CSS éventuel. */
    cadrer(zoom, origine = '50% 50%', filtre = '') {
      toileJeu.style.transformOrigin = origine;
      toileJeu.style.transform = `scale(${zoom.toFixed(4)})`;
      toileJeu.style.filter = filtre;
    },
  };

  // ── Les calques : sous-titres, éclair de coupe, carton final ─────────────────────────────────────────────
  const zoneST = document.getElementById('sous-titres');
  const eclair = document.getElementById('eclair');
  const fin = document.getElementById('fin');
  const el = s => fin.querySelector(s);
  el('.fin-accroche').textContent = C.accroche;
  let groupeAffiche = null;
  const rebond = x => { const t = borner(x); return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); };   // dépasse puis revient

  function sousTitres(t) {
    // Sur le carton final, l'accroche et l'adresse SONT le sous-titre : elles arrivent sur les mots qui les disent.
    const g = t >= C.jeu.titre[0] ? null : C.sousTitres.find(s => t >= s.debut && t < s.fin) || null;
    if (g !== groupeAffiche) {
      groupeAffiche = g;
      zoneST.replaceChildren(...(g ? g.mots.map(m => {
        const span = document.createElement('span');
        span.className = 'mot' + (m.fort ? ' fort' : '') + (/\.fr/.test(m.mot) ? ' adresse' : '');
        span.textContent = m.mot;
        return span;
      }) : []));
      // Garde-fou : un mot plus large que la zone réduit le corps du groupe au lieu de sortir du cadre.
      zoneST.style.fontSize = '';
      const large = Math.max(0, ...[...zoneST.children].map(s => s.offsetWidth));
      if (large > zoneST.clientWidth) zoneST.style.fontSize = `${(50 * zoneST.clientWidth / large * 0.96).toFixed(1)}px`;
    }
    if (!g) return;
    g.mots.forEach((m, i) => {
      const span = zoneST.children[i];
      const depuis = t - m.debut;
      const suivant = g.mots[i + 1];
      const actif = depuis >= 0 && (!suivant || t < suivant.debut);
      const entree = rebond(depuis / 0.16);
      span.style.opacity = depuis < -0.02 ? '0' : '1';
      span.style.transform = `translateY(${depuis < 0 ? 14 : 0}px) scale(${(depuis < 0 ? 0.7 : entree * (actif ? 1.06 : 1)).toFixed(4)}) rotate(${(actif && m.fort ? -2 : 0)}deg)`;
    });
  }

  function cartonFinal(t) {
    const [debut] = C.jeu.titre;
    const p = t - debut;
    fin.style.visibility = p >= 0 ? 'visible' : 'hidden';
    if (p < 0) return;
    el('.fin-voile').style.opacity = lisser(0, 0.28, p).toFixed(3);
    el('.fin-lignes').style.transform = `translateX(${(-30 + p * 9).toFixed(2)}px)`;
    const mot = (id, retard, sens) => {
      const k = borner((p - retard) / 0.30);
      const e = rebond(k);
      const m = document.getElementById(id);
      m.style.opacity = k <= 0 ? '0' : '1';
      m.style.transform = `translateX(${((1 - sortieDouce(k)) * 260 * sens).toFixed(2)}px) scale(${(0.86 + 0.14 * e).toFixed(4)}) skewX(${((1 - k) * -9 * sens).toFixed(2)}deg)`;
    };
    mot('fin-destiny', 0.06, -1);
    mot('fin-rugby', 0.16, 1);
    const embleme = borner((p - 0.0) / 0.34);
    el('.fin-embleme').style.opacity = embleme.toFixed(3);
    el('.fin-embleme').style.transform = `translateY(${((1 - sortieDouce(embleme)) * -60).toFixed(2)}px) rotate(${((1 - sortieDouce(embleme)) * -18).toFixed(2)}deg) scale(${(0.6 + 0.4 * rebond(embleme)).toFixed(4)})`;
    el('.fin-filet').style.transform = `scaleX(${sortieDouce((p - 0.40) / 0.35).toFixed(4)})`;
    const quandAccroche = Math.max(0.40, C.jeu.accroche - debut - 0.04);
    const accroche = borner((p - quandAccroche) / 0.26);
    el('.fin-accroche').style.opacity = accroche <= 0 ? '0' : '1';
    el('.fin-accroche').style.transform = `translateX(-50%) scale(${(accroche <= 0 ? 0 : rebond(accroche)).toFixed(4)}) rotate(-2deg)`;
    const quandAdresse = Math.max(quandAccroche + 0.45, C.jeu.adresse - debut - 0.05);
    const adresse = borner((p - quandAdresse) / 0.30);
    const pouls = 1 + 0.035 * Math.sin(Math.max(0, p - quandAdresse - 0.3) * 7.0) * lisser(quandAdresse + 0.3, quandAdresse + 0.6, p);
    el('.fin-adresse').style.opacity = adresse.toFixed(3);
    el('.fin-adresse').style.transform = `translateY(${((1 - sortieDouce(adresse)) * 26).toFixed(2)}px) scale(${pouls.toFixed(4)})`;
  }

  // ── Une image ────────────────────────────────────────────────────────────────────────────────────────────
  function dessiner(t) {
    t = borner(t, 0, C.duree - 1e-4);
    const plan = planA(t);
    const enJeu = !plan;                                    // là où aucun plan 3D ne joue, c'est le vrai jeu
    toileJeu.style.visibility = enJeu ? 'visible' : 'hidden';
    toile.style.visibility = enJeu ? 'hidden' : 'visible';
    let clarte = 0;
    if (enJeu) clarte = pub.jeu(t, outilsJeu);
    else {
      let reglage = null;
      moteur.setRenderTarget(cibleCumul); moteur.setClearColor(0x000000, 1); moteur.clear();
      for (let i = 0; i < FLOU; i++) {
        const dans = FLOU === 1 ? 0 : ((i + 0.5) / FLOU - 0.5) * OBTURATEUR / C.ips;
        const ts = borner(t + dans, plan.debut, plan.fin - 1e-4);
        reglage = plan.rendre((ts - plan.debut) / (plan.fin - plan.debut), ts, plan);
        moteur.setRenderTarget(cibleScene);
        moteur.setClearColor(reglage.fond ?? 0x000000, 1);
        moteur.clear();
        moteur.render(reglage.scene, reglage.camera);
        matiereCumul.uniforms.poids.value = 1 / FLOU;
        moteur.setRenderTarget(cibleCumul);
        const auto = moteur.autoClear; moteur.autoClear = false;
        moteur.render(sceneCumul, cameraPlate);
        moteur.autoClear = auto;
      }
      const u = passeEtalonnage.uniforms;
      const [force, rayon, seuil] = reglage.bloom || [0.5, 0.5, 0.9];
      passeLumiere.strength = force; passeLumiere.radius = rayon; passeLumiere.threshold = seuil;
      u.temps.value = t; u.vignette.value = reglage.vignette ?? 0.8; u.grain.value = reglage.grain ?? 0.04; u.aberration.value = reglage.aberration ?? 0.5;
      u.eclair.value = reglage.flash ?? 0; u.noir.value = reglage.noir ?? 0; u.saturation.value = reglage.saturation ?? 1; u.exposition.value = reglage.exposition ?? 1;
      u.flouRadial.value = reglage.flouRadial ?? 0;
      const teinte = reglage.teinte || [1, 1, 1]; u.teinte.value.set(teinte[0], teinte[1], teinte[2]);
      moteur.setRenderTarget(null);
      chaine.render();
    }
    eclair.style.opacity = clarte.toFixed(3);
    sousTitres(t);
    cartonFinal(t);
    pub.calques?.(t, outilsJeu);
    return plan ? plan.nom : 'jeu';
  }

  await document.fonts.ready;
  await Promise.all([document.fonts.load("50px 'Anton'"), document.fonts.load("800 46px 'Archivo'")]).catch(() => null);
  const gl = moteur.getContext();
  const infoCarte = gl.getExtension('WEBGL_debug_renderer_info');
  window.__pub = {
    pret: true, duree: C.duree, ips: C.ips, plans: C.plans.map(p => ({ nom: p.nom, debut: p.debut, fin: p.fin })), jeu: C.jeu,
    carte: infoCarte ? gl.getParameter(infoCarte.UNMASKED_RENDERER_WEBGL) : 'inconnue', taille: [L, H], flou: FLOU,
    dessiner,
  };

  // L'aperçu : en boucle, à la cadence de l'écran (sans flou de mouvement si ?flou n'est pas donné).
  if (!reglages.has('fige')) {
    const depart = performance.now() - Number(reglages.get('t') || 0) * 1000;
    const boucle = () => { dessiner(((performance.now() - depart) / 1000) % C.duree); requestAnimationFrame(boucle); };
    requestAnimationFrame(boucle);
  } else dessiner(Number(reglages.get('t') || 0));
}
