// LES PLANS AU SOL — la foule qui lève la tête, le tsunami, les tours qui s'effondrent, l'avenue qui se fend.
// Unité : le mètre. Tout mouvement est une fonction fermée du temps (chute balistique, front de vague, fissure) :
// pas de simulation pas à pas, donc une image se redessine à l'identique et le flou de mouvement se calcule par sous-images.
import * as THREE from 'three';
import { BRUIT, tirage, tremblement, lisser, melange, adoucir, sortieDouce, borner } from './bruit.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

// ── L'éclairage commun : un soleil, un ciel, la lueur de l'objet, la brume ────────────────────────────────────
const AMBIANCE = /* glsl */`
uniform vec3 uSoleil; uniform vec3 uSoleilCouleur; uniform vec3 uCielHaut; uniform vec3 uCielBas; uniform vec3 uBrume;
uniform vec3 uMenaceDir; uniform vec3 uMenaceCouleur; uniform float uDensite; uniform float uTemps;
vec3 eclairerVille(vec3 alb, vec3 N){
  vec3 ciel = mix(uCielBas * 0.55, uCielHaut, N.y * 0.5 + 0.5);
  return alb * (uSoleilCouleur * max(dot(N, uSoleil), 0.0) + ciel + uMenaceCouleur * max(dot(N, uMenaceDir), 0.0));
}
vec3 brumer(vec3 c, vec3 P){
  float d = length(P - cameraPosition);
  float bas = exp(-max(P.y, 0.0) / 420.0);
  return mix(c, uBrume, 1.0 - exp(-d * uDensite * (0.35 + 0.65 * bas)));
}`;

function ambiance() {
  return {
    uSoleil: { value: v(0.4, 0.6, 0.5).normalize() }, uSoleilCouleur: { value: new THREE.Color(1, 1, 1) },
    uCielHaut: { value: new THREE.Color(0.1, 0.2, 0.4) }, uCielBas: { value: new THREE.Color(0.5, 0.6, 0.7) }, uBrume: { value: new THREE.Color(0.5, 0.6, 0.7) },
    uMenaceDir: { value: v(0, 1, 0) }, uMenaceCouleur: { value: new THREE.Color(0, 0, 0) }, uDensite: { value: 0.0005 }, uTemps: { value: 0 },
  };
}

// ── Le ciel ────────────────────────────────────────────────────────────────────────────────────────────────
function creerCiel(U) {
  const u = { ...U, uMenaceRayon: { value: 0.12 }, uMenaceForce: { value: 0 }, uMenaceQueue: { value: v(0.3, 1, 0).normalize() }, uNuages: { value: 0.1 }, uNuageClair: { value: new THREE.Color(0.8, 0.8, 0.85) }, uNuageSombre: { value: new THREE.Color(0.2, 0.22, 0.26) } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = position; vec4 p = viewMatrix * vec4(position + cameraPosition, 1.0); gl_Position = projectionMatrix * p; }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      uniform float uMenaceRayon; uniform float uMenaceForce; uniform vec3 uMenaceQueue; uniform float uNuages; uniform vec3 uNuageClair; uniform vec3 uNuageSombre;
      varying vec3 vDir;
      ${BRUIT}
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = mix(uCielBas, uCielHaut, pow(sat(h), 0.55));
        c = mix(c, uBrume, pow(1.0 - sat(h), 7.0));
        float vers = sat(dot(d, uMenaceDir));
        // L'objet : une masse incandescente, sa couronne, sa queue.
        float ang = acos(clamp(dot(d, uMenaceDir), -1.0, 1.0));
        vec3 t1 = normalize(uMenaceQueue - uMenaceDir * dot(uMenaceQueue, uMenaceDir));
        vec3 t2 = cross(uMenaceDir, t1);
        vec2 q = vec2(dot(d, t1), dot(d, t2)) / uMenaceRayon;
        float turbulence = fbm(vec3(q * 1.6, uTemps * 0.9)) * 0.5 + 0.5;
        float masse = smoothstep(1.0, 0.72, length(q) + (turbulence - 0.5) * 0.25);
        float couronne = exp(-max(length(q) - 0.85, 0.0) * 1.6);
        float queue = smoothstep(-0.2, 1.2, q.x) * exp(-abs(q.y) * (1.5 - 0.7 * sat(q.x * 0.2))) * exp(-max(q.x, 0.0) * 0.16) * (0.55 + 0.45 * fbm3(vec3(q.x * 0.9 - uTemps * 3.0, q.y * 2.4, 2.0)));
        vec3 feu = uMenaceCouleur * (masse * (2.2 + 3.0 * turbulence) + couronne * 1.6 + queue * 2.0) + vec3(1.0, 0.9, 0.75) * masse * turbulence * turbulence * 2.5;
        // Les nuages, éclairés par en dessous.
        if (h > 0.0) {
          vec2 p = d.xz / (h + 0.10);
          float n = fbm(vec3(p * 0.55 + uTemps * 0.012, 3.0)) + 0.35 * fbm3(vec3(p * 1.7, 9.0));
          float couv = smoothstep(uNuages - 0.32, uNuages + 0.40, n) * smoothstep(0.0, 0.14, h);
          vec3 nuage = mix(uNuageSombre, uNuageClair, sat(n * 0.6 + 0.5)) + uMenaceCouleur * pow(vers, 2.5) * 0.9 * uMenaceForce;
          c = mix(c, nuage, couv * 0.92);
          feu *= 1.0 - couv * 0.35;
        }
        c += feu * uMenaceForce * 0.42;
        c += uSoleilCouleur * pow(sat(dot(d, uSoleil)), 900.0) * 2.0;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const ciel = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), m);
  ciel.frustumCulled = false; ciel.renderOrder = -10;
  return { maillage: ciel, u };
}

// ── Les immeubles : des boîtes instanciées, fenêtres et façades dessinées par le matériau ───────────────────
const FACADE = /* glsl */`
vec3 facade(vec3 local, vec3 taille, vec3 N, vec3 teinte, float graine, float lumieres, out vec3 emission, out float vitre){
  emission = vec3(0.0); vitre = 0.0;
  if (abs(N.y) > 0.5) return vec3(0.085, 0.087, 0.095) * (0.8 + 0.4 * hash21(floor(local.xz / 6.0) + graine));
  float horizontal = abs(N.x) > 0.5 ? local.z : local.x;
  vec2 f = vec2(horizontal / 2.9, local.y / 3.5);
  vec2 cellule = floor(f), dans = fract(f);
  float flou = sat((fwidth(f.x) + fwidth(f.y)) * 1.4);
  float net = step(0.13, dans.x) * step(dans.x, 0.87) * step(0.20, dans.y) * step(dans.y, 0.84);
  vitre = mix(net, 0.52, flou);
  float alea = hash21(cellule + graine * 71.0);
  float allumee = step(1.0 - lumieres, alea) * net;
  emission = mix(vec3(1.0, 0.78, 0.45), vec3(0.75, 0.88, 1.0), step(0.8, hash21(cellule + graine * 13.0))) * allumee * (0.6 + 0.8 * hash21(cellule + 5.0)) * (1.0 - flou * 0.5);
  float bandeau = step(0.92, dans.y) * (1.0 - flou);
  return mix(teinte * (1.0 - 0.25 * bandeau), vec3(0.018, 0.026, 0.040), vitre);
}`;

function creerImmeubles(liste, U, options = {}) {
  const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
  const graines = new Float32Array(liste.length), teintes = new Float32Array(liste.length * 3);
  const u = { ...U, uSecousse: { value: 0 }, uLumieres: { value: 0.3 }, uEclat: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      attribute float aGraine; attribute vec3 aTeinte; uniform float uSecousse; uniform float uTemps;
      varying vec3 vP; varying vec3 vN; varying vec3 vLocal; varying vec3 vTaille; varying float vGraine; varying vec3 vTeinte;
      void main(){
        vTaille = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vLocal = position * vTaille; vN = normal; vGraine = aGraine; vTeinte = aTeinte;
        vec4 p = modelMatrix * instanceMatrix * vec4(position, 1.0);
        float k = p.y / 120.0;
        p.x += sin(uTemps * 21.0 + aGraine * 40.0) * uSecousse * k;
        p.z += cos(uTemps * 17.0 + aGraine * 31.0) * uSecousse * k;
        vP = p.xyz;
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      uniform float uLumieres; uniform float uEclat;
      varying vec3 vP; varying vec3 vN; varying vec3 vLocal; varying vec3 vTaille; varying float vGraine; varying vec3 vTeinte;
      ${BRUIT}
      ${FACADE}
      void main(){
        vec3 N = normalize(vN), emission; float vitre;
        vec3 alb = facade(vLocal, vTaille, N, vTeinte, vGraine, uLumieres, emission, vitre);
        vec3 V = normalize(cameraPosition - vP);
        vec3 R = reflect(-V, N);
        vec3 c = eclairerVille(alb, N) + emission * uEclat;
        // Le verre renvoie le ciel, et la masse incandescente quand elle est en face.
        float fres = 0.05 + 0.95 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
        c += vitre * fres * (mix(uCielBas, uCielHaut, sat(R.y)) * 0.55 + uMenaceCouleur * pow(max(dot(R, uMenaceDir), 0.0), 6.0) * 2.2);
        c *= 0.55 + 0.45 * smoothstep(0.0, 26.0, vP.y);          // la rue reste dans l'ombre des tours
        gl_FragColor = vec4(brumer(c, vP), 1.0);
      }`,
  });
  const lot = new THREE.InstancedMesh(g, m, liste.length);
  const M = new THREE.Matrix4();
  liste.forEach((b, i) => {
    M.compose(v(b.x, options.sol ?? 0, b.z), new THREE.Quaternion(), v(b.l, b.h, b.p));
    lot.setMatrixAt(i, M);
    graines[i] = b.graine; teintes.set(b.teinte, i * 3);
  });
  g.setAttribute('aGraine', new THREE.InstancedBufferAttribute(graines, 1));
  g.setAttribute('aTeinte', new THREE.InstancedBufferAttribute(teintes, 3));
  lot.frustumCulled = false;
  return { maillage: lot, u };
}

const TEINTES = [[0.30, 0.31, 0.34], [0.22, 0.24, 0.28], [0.38, 0.35, 0.31], [0.16, 0.19, 0.24], [0.42, 0.42, 0.44], [0.26, 0.22, 0.20]];

/** Une mégapole de bord de mer : des îlots réguliers, le centre qui monte. */
function plangMegapole() {
  const h = tirage(71), liste = [];
  for (let ix = -15; ix <= 15; ix++) for (let iz = 0; iz < 20; iz++) {
    const cx = ix * 92, cz = 110 + iz * 92;
    const centre = Math.exp(-(Math.pow((cx - 60) / 520, 2) + Math.pow((cz - 520) / 480, 2)));
    const n = h() < 0.35 ? 1 : h() < 0.75 ? 2 : 4;
    for (let k = 0; k < n; k++) {
      const l = n === 1 ? 58 : n === 2 ? 30 : 28, p = n === 4 ? 28 : 58;
      const dx = n === 1 ? 0 : (k % 2 ? 17 : -17), dz = n === 4 ? (k < 2 ? 17 : -17) : 0;
      const interieur = Math.min(1, Math.max(0, (cz - 330) / 520));
      const haut = (16 + h() * 40) * (1 + centre * 3.6 * interieur) + (h() < 0.09 * interieur * (0.3 + centre) ? 150 + h() * 130 : 0);
      liste.push({ x: cx + dx, z: cz + dz, l: l * (0.8 + h() * 0.2), p: p * (0.8 + h() * 0.2), h: haut, graine: h(), teinte: TEINTES[Math.floor(h() * TEINTES.length)] });
    }
  }
  return liste;
}

/** Une avenue entre deux rangées de tours (axe Z), avec les tours du fond. */
function planAvenue() {
  const h = tirage(1234), liste = [];
  for (const cote of [-1, 1]) {
    let z = 120;
    while (z > -900) {
      const p = 34 + h() * 30, l = 34 + h() * 22;
      const reserve = cote < 0 ? [-148, -92] : [-243, -187];
      const libre = z < reserve[0] || z - p > reserve[1];
      const immeuble = { x: cote * (27 + l / 2), z: z - p / 2, l, p, h: 55 + h() * 150 + (h() < 0.25 ? 110 : 0), graine: h(), teinte: TEINTES[Math.floor(h() * TEINTES.length)] };
      if (libre) liste.push(immeuble);
      z -= p + (h() < 0.2 ? 20 : 3);
    }
    for (let i = 0; i < 26; i++) liste.push({ x: cote * (120 + h() * 380), z: 100 - h() * 1100, l: 40 + h() * 30, p: 40 + h() * 30, h: 80 + h() * 260, graine: h(), teinte: TEINTES[Math.floor(h() * TEINTES.length)] });
  }
  for (let i = 0; i < 16; i++) liste.push({ x: -300 + h() * 600, z: -960 - h() * 300, l: 50 + h() * 30, p: 50, h: 120 + h() * 280, graine: h(), teinte: TEINTES[Math.floor(h() * TEINTES.length)] });
  return liste;
}

// ── Le sol ─────────────────────────────────────────────────────────────────────────────────────────────────
function creerSol(U) {
  const u = { ...U, uMode: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`varying vec3 vP; void main(){ vec4 p = modelMatrix * vec4(position, 1.0); vP = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      uniform float uMode; varying vec3 vP;
      ${BRUIT}
      void main(){
        vec3 alb = vec3(0.060, 0.062, 0.068) * (0.85 + 0.3 * hash21(floor(vP.xz * 0.6)));
        if (uMode < 0.5) {                                  // la mégapole : une trame de rues éclairées
          vec2 r = abs(fract(vP.xz / 92.0 + 0.5) - 0.5) * 92.0;
          float rue = step(min(r.x, r.y), 9.0);
          alb = mix(vec3(0.10, 0.10, 0.10), alb, rue);
          alb = mix(alb, vec3(0.40, 0.36, 0.30), smoothstep(100.0, 20.0, vP.z) * step(vP.z, 100.0));   // le front de mer
        } else {                                            // l'avenue : trottoirs de part et d'autre
          // La chaussée a son propre maillage (qui se fend) : le sol plein ne doit pas boucher la faille.
          if (abs(vP.x) < 14.9 && vP.z > -1000.0 && vP.z < 120.0) discard;
          float trottoir = smoothstep(15.0, 15.4, abs(vP.x));
          alb = mix(alb, vec3(0.20, 0.19, 0.18) * (0.9 + 0.2 * hash21(floor(vP.xz * 0.5))), trottoir);
        }
        gl_FragColor = vec4(brumer(eclairerVille(alb, vec3(0.0, 1.0, 0.0)), vP), 1.0);
      }`,
  });
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), m);
  sol.rotation.x = -Math.PI / 2;
  return { maillage: sol, u };
}

// ── La mer et la vague ─────────────────────────────────────────────────────────────────────────────────────
const VAGUE = /* glsl */`
uniform float uFront; uniform float uHauteur;
float ligneDeFront(float x){ return uFront + 110.0 * snoise(vec3(x * 0.0013, 0.0, uTemps * 0.04)) + 34.0 * snoise(vec3(x * 0.0052, 3.0, uTemps * 0.09)); }
float niveau(vec2 p, out float avant){
  float d = p.y - ligneDeFront(p.x);
  avant = smoothstep(150.0, -20.0, d);
  float arriere = mix(0.40, 1.0, exp(min(d, 0.0) / 520.0));
  float houle = (1.2 + 7.0 * avant) * snoise(vec3(p * 0.010, uTemps * 0.55)) + 0.7 * snoise(vec3(p * 0.045, uTemps * 1.1));
  float crete = 22.0 * exp(-d * d / 2600.0) * (0.6 + 0.4 * snoise(vec3(p.x * 0.02, uTemps * 1.6, 4.0)));
  return uHauteur * avant * arriere + houle + crete;
}`;

function creerMer(U) {
  const u = { ...U, uFront: { value: -2000 }, uHauteur: { value: 320 } };
  const g = new THREE.PlaneGeometry(6400, 4600, 300, 260);
  g.rotateX(-Math.PI / 2); g.translate(0, 0, -1500);
  const eau = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      uniform float uTemps;
      ${BRUIT}
      ${VAGUE}
      varying vec3 vP; varying vec3 vN; varying float vAvant; varying float vH;
      void main(){
        vec2 p = position.xz; float a, a2;
        float h = niveau(p, a);
        float hx = niveau(p + vec2(7.0, 0.0), a2), hz = niveau(p + vec2(0.0, 7.0), a2);
        vN = normalize(vec3(h - hx, 7.0, h - hz));
        vAvant = a; vH = h;
        vP = vec3(position.x, h, position.z);
        gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      uniform float uHauteur;
      varying vec3 vP; varying vec3 vN; varying float vAvant; varying float vH;
      ${BRUIT}
      void main(){
        vec3 N = normalize(vN);
        N = normalize(N + 0.10 * vec3(snoise(vP * 0.07 + uTemps * 0.7), 0.0, snoise(vP.zxy * 0.07 - uTemps * 0.6)));
        vec3 V = normalize(cameraPosition - vP);
        float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        vec3 ciel = mix(uCielBas, uCielHaut, sat(R.y * 0.9 + 0.1));
        float mur = sat(vH / uHauteur);
        vec3 eau = mix(vec3(0.004, 0.030, 0.045), vec3(0.020, 0.170, 0.160), mur * mur);
        vec3 c = eau * (uSoleilCouleur * (0.25 + 0.75 * max(dot(N, uSoleil), 0.0)) + uCielHaut * 0.6);
        c += vec3(0.02, 0.16, 0.15) * pow(mur, 3.0) * uSoleilCouleur * 0.5;          // la lumière traverse le haut de la vague
        c = mix(c, ciel, fres * 0.7);
        c += uSoleilCouleur * pow(max(dot(R, uSoleil), 0.0), 120.0) * 1.5;
        // L'écume : sur la crête, et en traînées le long du mur d'eau.
        float pente = 1.0 - N.y;
        float n = fbm(vec3(vP.x * 0.018, vP.y * 0.030 - uTemps * 1.4, vP.z * 0.018));
        float trainees = smoothstep(0.30, 0.75, snoise(vec3(vP.x * 0.035, vP.y * 0.006 - uTemps * 0.5, 7.0)) * 0.5 + 0.5 + n * 0.3);
        float ecume = smoothstep(0.30, 0.80, pente) * vAvant * trainees * (0.35 + 0.35 * smoothstep(-0.2, 0.5, n));
        ecume = max(ecume, smoothstep(40.0, 4.0, vH) * smoothstep(0.25, 0.7, pente + n * 0.3) * 0.9);
        ecume = max(ecume, smoothstep(0.86, 1.02, vH / uHauteur + n * 0.10) * vAvant);
        ecume = max(ecume, smoothstep(0.55, 0.9, n + 0.35) * 0.35 * (1.0 - vAvant));
        vec3 blanc = vec3(0.93, 0.96, 0.98) * (uSoleilCouleur * (0.45 + 0.55 * max(dot(N, uSoleil), 0.0)) + uCielHaut * 0.9);
        c = mix(c, blanc, sat(ecume));
        gl_FragColor = vec4(brumer(c, vP), 1.0);
      }`,
  }));
  eau.frustumCulled = false;

  // Les embruns arrachés à la crête.
  const N = 900, h = tirage(99);
  const gi = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  gi.index = base.index; gi.setAttribute('position', base.getAttribute('position')); gi.setAttribute('uv', base.getAttribute('uv'));
  const a = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) a.set([-2900 + h() * 5800, h(), h(), h()], i * 4);
  gi.setAttribute('aGrain', new THREE.InstancedBufferAttribute(a, 4));
  gi.instanceCount = N;
  const embruns = new THREE.Mesh(gi, new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      uniform float uTemps;
      ${BRUIT}
      ${VAGUE}
      attribute vec4 aGrain; varying vec2 vUv; varying float vVie; varying vec3 vP;
      void main(){
        float age = fract(uTemps * (0.22 + 0.25 * aGrain.y) + aGrain.z);
        float x = aGrain.x;
        float zf = ligneDeFront(x);
        float a; float h = niveau(vec2(x, zf - 10.0), a);
        vec3 c = vec3(x, h * (0.80 + 0.22 * aGrain.w) + age * 70.0 - age * age * 120.0, zf + 10.0 + age * (60.0 + 80.0 * aGrain.y));
        float taille = (40.0 + 110.0 * aGrain.w) * (0.5 + age);
        vec4 vue = viewMatrix * vec4(c, 1.0);
        vue.xy += position.xy * taille;
        vUv = uv; vVie = age; vP = c;
        gl_Position = projectionMatrix * vue;
      }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      varying vec2 vUv; varying float vVie; varying vec3 vP;
      void main(){
        float r = length(vUv - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.1, r) * (1.0 - vVie) * smoothstep(0.0, 0.08, vVie) * 0.55;
        vec3 c = vec3(0.92, 0.96, 0.98) * (uSoleilCouleur * 0.6 + uCielHaut * 0.9);
        gl_FragColor = vec4(brumer(c, vP), a);
      }`,
  }));
  embruns.frustumCulled = false; embruns.renderOrder = 5;
  const groupe = new THREE.Group(); groupe.add(eau, embruns);
  return { groupe, u };
}

// ── Les tours qui s'effondrent : une grille de blocs, chacun sur sa trajectoire ─────────────────────────────
function creerTour(U, { base, nx = 8, ny = 35, nz = 8, bloc = v(4.9, 5.25, 4.9), teinte, graine, axe }) {
  const h = tirage(Math.floor(graine * 1e6) + 7);
  const n = nx * ny * nz;
  const centres = new Float32Array(n * 3), chutes = new Float32Array(n * 4), bordsMin = new Float32Array(n * 3), bordsMax = new Float32Array(n * 3);
  let i = 0;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
    centres.set([(x - (nx - 1) / 2) * bloc.x, (y + 0.5) * bloc.y, (z - (nz - 1) / 2) * bloc.z], i * 3);
    const bord = x === 0 || x === nx - 1 || z === 0 || z === nz - 1;
    const dx = x - (nx - 1) / 2, dz = z - (nz - 1) / 2, norme = Math.hypot(dx, dz) || 1;
    // Les blocs de façade se détachent plus tôt, et partent vers l'extérieur.
    chutes.set([dx / norme * (0.4 + h()) , h(), dz / norme * (0.4 + h()), (bord ? 0.25 + h() * 2.4 : 1.4 + h() * 3.0) + (1 - y / ny) * 0.4], i * 4);
    bordsMin.set([x === 0 ? 1 : 0, y === 0 ? 1 : 0, z === 0 ? 1 : 0], i * 3);
    bordsMax.set([x === nx - 1 ? 1 : 0, y === ny - 1 ? 1 : 0, z === nz - 1 ? 1 : 0], i * 3);
    i++;
  }
  const g = new THREE.InstancedBufferGeometry();
  const boite = new THREE.BoxGeometry(1, 1, 1);
  g.index = boite.index; g.setAttribute('position', boite.getAttribute('position')); g.setAttribute('normal', boite.getAttribute('normal'));
  g.setAttribute('aCentre', new THREE.InstancedBufferAttribute(centres, 3));
  g.setAttribute('aChute', new THREE.InstancedBufferAttribute(chutes, 4));
  g.setAttribute('aBordMin', new THREE.InstancedBufferAttribute(bordsMin, 3));
  g.setAttribute('aBordMax', new THREE.InstancedBufferAttribute(bordsMax, 3));
  g.instanceCount = n;
  const u = { ...U, uT: { value: -1 }, uBase: { value: base.clone() }, uBloc: { value: bloc.clone() }, uTaille: { value: v(nx * bloc.x, ny * bloc.y, nz * bloc.z) },
    uAxe: { value: axe.clone().normalize() }, uInclinaison: { value: 0.30 }, uTeinte: { value: new THREE.Color(...teinte) }, uGraine: { value: graine }, uLumieres: { value: 0.2 } };
  const tour = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      attribute vec3 aCentre; attribute vec4 aChute; attribute vec3 aBordMin; attribute vec3 aBordMax;
      uniform float uT; uniform vec3 uBase; uniform vec3 uBloc; uniform vec3 uTaille; uniform vec3 uAxe; uniform float uInclinaison; uniform float uTemps;
      varying vec3 vP; varying vec3 vN; varying vec3 vLocal; varying float vExterieur; varying vec3 vFace;
      vec3 tourner(vec3 p, vec3 axe, float a){ float c = cos(a), s = sin(a); return p * c + cross(axe, p) * s + axe * dot(axe, p) * (1.0 - c); }
      void main(){
        float tt = max(uT, 0.0);
        // Le corps de la tour s'enfonce dans sa propre base en penchant ; ce qui passe sous le sol est broyé.
        float enfonce = min(0.5 * 15.0 * tt * tt, uTaille.y);
        float penche = uInclinaison * smoothstep(0.0, 2.6, tt);
        vec3 c = aCentre; c.y -= enfonce;
        float broye = step(c.y, -uBloc.y * 0.5);
        c.y = max(c.y, -uBloc.y);
        c = tourner(c, uAxe, penche);
        // Le bloc se détache : il garde sa vitesse, prend celle de l'éclatement, et tombe.
        float ta = max(tt - aChute.w, 0.0);
        vec3 vitesse = vec3(aChute.x * 17.0, 4.0 + aChute.y * 7.0 - 15.0 * aChute.w, aChute.z * 17.0);
        c += vitesse * ta * step(0.0001, ta); c.y -= 0.5 * (26.0 - 15.0) * ta * ta;
        vec3 n = normal;
        vec3 pl = position * uBloc * (1.0 - broye);
        vec3 axeBloc = normalize(aChute.xyz + vec3(0.13, 0.31, 0.21));
        float vrille = ta * (1.2 + 2.0 * aChute.y);
        pl = tourner(tourner(pl, axeBloc, vrille), uAxe, penche); n = tourner(tourner(n, axeBloc, vrille), uAxe, penche);
        // Le tremblement, avant et pendant.
        vec3 monde = uBase + c + pl;
        monde.x += sin(uTemps * 23.0 + aCentre.y * 0.05) * 0.5 * (aCentre.y / uTaille.y);
        monde.y = max(monde.y, 0.2 - broye * 30.0);
        vP = monde; vN = n; vFace = normal; vLocal = aCentre + position * uBloc;
        vec3 dehors = mix(aBordMin, aBordMax, step(0.0, normal));
        vExterieur = dot(dehors, abs(normal));
        gl_Position = projectionMatrix * viewMatrix * vec4(monde, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      uniform vec3 uTeinte; uniform float uGraine; uniform float uLumieres; uniform vec3 uTaille; uniform float uT;
      varying vec3 vP; varying vec3 vN; varying vec3 vLocal; varying float vExterieur; varying vec3 vFace;
      ${BRUIT}
      ${FACADE}
      void main(){
        vec3 N = normalize(vN), emission; float vitre;
        // La façade se lit dans le repère de la tour entière : le dessin continue d'un bloc à l'autre.
        vec3 Nf = normalize(vFace);
        vec3 alb = facade(vLocal, uTaille, Nf, uTeinte, uGraine, uLumieres * step(uT, 0.4), emission, vitre);
        vec3 beton = vec3(0.16, 0.15, 0.14) * (0.7 + 0.5 * hash21(floor(vLocal.xy * 0.7) + floor(vLocal.z * 0.7)));
        alb = mix(beton, alb, vExterieur); emission *= vExterieur;
        vec3 c = eclairerVille(alb, N) + emission * 1.6;
        c *= 0.55 + 0.45 * smoothstep(0.0, 26.0, vP.y);
        gl_FragColor = vec4(brumer(c, vP), 1.0);
      }`,
  }));
  tour.frustumCulled = false;
  return { maillage: tour, u };
}

/** La poussière : des bouffées qui naissent au pied des tours, gonflent et montent. */
function creerPoussiere(U, sources, nombre = 420) {
  const h = tirage(555);
  const g = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  g.index = base.index; g.setAttribute('position', base.getAttribute('position')); g.setAttribute('uv', base.getAttribute('uv'));
  const depart = new Float32Array(nombre * 4), elan = new Float32Array(nombre * 4);
  for (let i = 0; i < nombre; i++) {
    const s = sources[i % sources.length];
    const a = h() * Math.PI * 2, r = h() * s.rayon;
    depart.set([s.x + Math.cos(a) * r, h() * s.haut, s.z + Math.sin(a) * r, s.t0 + h() * s.duree], i * 4);
    elan.set([Math.cos(a) * (6 + h() * 22), 3 + h() * 16, Math.sin(a) * (6 + h() * 22), 16 + h() * 30], i * 4);
  }
  g.setAttribute('aDepart', new THREE.InstancedBufferAttribute(depart, 4));
  g.setAttribute('aElan', new THREE.InstancedBufferAttribute(elan, 4));
  g.instanceCount = nombre;
  const u = { ...U, uT: { value: 0 }, uTeintePoussiere: { value: new THREE.Color(0.55, 0.50, 0.44) } };
  const nuage = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      attribute vec4 aDepart; attribute vec4 aElan; uniform float uT;
      varying vec2 vUv; varying float vAge; varying vec3 vP; varying float vGraine;
      void main(){
        float age = uT - aDepart.w;
        float vivant = step(0.0, age);
        float e = pow(max(age, 0.0), 0.62);
        vec3 c = aDepart.xyz + vec3(aElan.x, 0.0, aElan.z) * e * 1.9 + vec3(0.0, aElan.y * e * 1.5, 0.0);
        float taille = aElan.w * (0.45 + e * 0.95) * vivant;
        vec4 vue = viewMatrix * vec4(c, 1.0);
        vue.xy += position.xy * taille;
        vUv = uv; vAge = age; vP = c; vGraine = aDepart.w + aElan.w;
        gl_Position = projectionMatrix * vue;
      }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      uniform vec3 uTeintePoussiere;
      varying vec2 vUv; varying float vAge; varying vec3 vP; varying float vGraine;
      ${BRUIT}
      void main(){
        vec2 q = vUv - 0.5; float r = length(q) * 2.0;
        float n = fbm3(vec3(q * 3.2 + vGraine, vAge * 0.35 + vGraine * 3.0));
        float a = smoothstep(1.0, 0.25, r + n * 0.45) * smoothstep(0.0, 0.25, vAge) * exp(-vAge * 0.20) * 0.62;
        vec3 N = normalize(vec3(q * 1.6, 0.6));
        vec3 c = uTeintePoussiere * (0.75 + 0.3 * n) * (uSoleilCouleur * (0.35 + 0.65 * max(dot(N, vec3(0.3, 0.8, 0.5)), 0.0)) + mix(uCielBas, uCielHaut, 0.5) * 1.2 + uMenaceCouleur * 0.4);
        gl_FragColor = vec4(brumer(c, vP), a);
      }`,
  }));
  nuage.frustumCulled = false; nuage.renderOrder = 6;
  return { maillage: nuage, u };
}

// ── L'avenue qui se fend ───────────────────────────────────────────────────────────────────────────────────
const FISSURE = /* glsl */`
uniform float uPointe;
float dent(float z){ return 1.6 * snoise(vec3(z * 0.045, 1.0, 0.0)) + 0.6 * snoise(vec3(z * 0.21, 5.0, 0.0)) + 0.25 * snoise(vec3(z * 0.9, 9.0, 0.0)); }
float ouverture(float z){ return 10.5 * pow(sat((uPointe - z) / 34.0), 0.6) * (0.8 + 0.3 * snoise(vec3(z * 0.03, 2.0, 0.0))); }`;

function creerAvenue(U) {
  const u = { ...U, uPointe: { value: -1e5 } };
  const NX = 14, NZ = 560, Z0 = -1000, Z1 = 120;
  const sommets = [], cotes = [], indices = [];
  for (const cote of [-1, 1]) {
    const depart = sommets.length / 3;
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      sommets.push(i / NX, 0, Z0 + (Z1 - Z0) * j / NZ); cotes.push(cote);
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = depart + j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      if (cote > 0) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(sommets, 3));
  g.setAttribute('aCote', new THREE.Float32BufferAttribute(cotes, 1));
  g.setIndex(indices);
  const SOMMET_ROUTE = /* glsl */`
    ${BRUIT}
    ${FISSURE}
    attribute float aCote; uniform float uTemps;
    varying vec3 vP; varying float vBord; varying float vOuverte; varying float vProfondeur; varying vec3 vPlat;
    vec3 chaussee(float k, float z, float cote){
      float w = ouverture(z);
      float dedans = 1.0 - k;
      float x = cote * k * 15.0 + dent(z) * dedans * dedans * dedans + cote * w * 0.5 * dedans;
      float dalle = snoise(vec3(floor(z / 9.0) * 1.7, cote * 3.0, 4.0));
      float y = -w * 0.22 * dedans * dedans + w * 0.16 * dalle * dedans * smoothstep(0.0, 0.3, k) + 0.02;
      return vec3(x, y, z);
    }`;
  const route = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      ${SOMMET_ROUTE}
      void main(){
        vec3 p = chaussee(position.x, position.z, aCote);
        vP = p; vBord = position.x; vOuverte = ouverture(position.z); vProfondeur = 0.0; vPlat = vec3(aCote * position.x * 15.0, 0.0, position.z);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      varying vec3 vP; varying float vBord; varying float vOuverte; varying vec3 vPlat;
      ${BRUIT}
      void main(){
        vec3 N = normalize(cross(dFdx(vP), dFdy(vP))); if (N.y < 0.0) N = -N;
        vec3 alb = vec3(0.120, 0.122, 0.130) * (0.8 + 0.35 * fbm3(vPlat * 0.35));
        // Le marquage : deux files par sens, une ligne de rive.
        float x = abs(vPlat.x);
        float tirets = step(0.5, fract(vPlat.z / 9.0));
        float file = (smoothstep(0.11, 0.07, abs(x - 5.2)) + smoothstep(0.11, 0.07, abs(x - 10.2))) * tirets + smoothstep(0.12, 0.08, abs(x - 14.3));
        alb = mix(alb, vec3(0.55, 0.55, 0.52), sat(file) * 0.85);
        // Les lézardes qui précèdent et accompagnent la faille.
        float veines = smoothstep(0.035, 0.0, abs(snoise(vec3(vPlat.xz * 0.16, 3.0))) ) * smoothstep(12.0, 1.0, x) * smoothstep(0.0, 1.5, vOuverte + 0.6);
        alb *= 1.0 - 0.85 * veines;
        vec3 c = eclairerVille(alb, N);
        c *= 0.6 + 0.4 * smoothstep(0.0, 0.25, vBord);
        // La lueur du fond remonte sur les lèvres de la faille.
        c += vec3(1.6, 0.42, 0.08) * alb * 6.0 * smoothstep(0.30, 0.0, vBord) * smoothstep(0.5, 6.0, vOuverte);
        gl_FragColor = vec4(brumer(c, vP), 1.0);
      }`,
  }));
  // Les parois de la faille : du bord de la chaussée jusqu'au fond, rougeoyant.
  const sp = [], cp = [], ip = [];
  for (const cote of [-1, 1]) {
    const depart = sp.length / 3;
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= 6; i++) { sp.push(i / 6, 0, Z0 + (Z1 - Z0) * j / NZ); cp.push(cote); }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < 6; i++) {
      const a = depart + j * 7 + i, b = a + 1, c = a + 7, d = c + 1;
      if (cote > 0) ip.push(a, b, c, b, d, c); else ip.push(a, c, b, b, c, d);
    }
  }
  const gp = new THREE.BufferGeometry();
  gp.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  gp.setAttribute('aCote', new THREE.Float32BufferAttribute(cp, 1));
  gp.setIndex(ip);
  const parois = new THREE.Mesh(gp, new THREE.ShaderMaterial({
    uniforms: u, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      ${SOMMET_ROUTE}
      void main(){
        vec3 bord = chaussee(0.0, position.z, aCote);
        float fond = position.x;
        vec3 p = bord + vec3(-aCote * fond * ouverture(position.z) * 0.42 + snoise(vec3(position.z * 0.2, fond * 6.0, aCote)) * 0.8 * fond, -fond * 46.0, 0.0);
        vP = p; vBord = 0.0; vOuverte = ouverture(position.z); vProfondeur = fond; vPlat = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      varying vec3 vP; varying float vProfondeur; varying float vOuverte;
      ${BRUIT}
      void main(){
        float strates = fbm3(vec3(vP.z * 0.08, vP.y * 0.45, 2.0));
        vec3 roche = mix(vec3(0.045, 0.036, 0.030), vec3(0.11, 0.085, 0.065), strates * 0.5 + 0.5) * (1.0 - vProfondeur * 0.75);
        vec3 c = roche * (uCielHaut * 1.5 + uSoleilCouleur * 0.25 + uMenaceCouleur * 0.3);
        float braise = smoothstep(0.35, 1.0, vProfondeur) * (0.55 + 0.45 * fbm3(vec3(vP.z * 0.05, vP.y * 0.1 - uTemps * 0.8, 6.0)));
        c += vec3(3.4, 0.80, 0.12) * braise * smoothstep(0.5, 4.0, vOuverte) + vec3(0.9, 0.22, 0.04) * (1.0 - vProfondeur) * 0.35 * smoothstep(0.5, 4.0, vOuverte);
        gl_FragColor = vec4(brumer(c, vP), 1.0);
      }`,
  }));
  route.frustumCulled = false; parois.frustumCulled = false;
  const groupe = new THREE.Group(); groupe.add(route, parois);
  return { groupe, u };
}

// ── Les voitures ───────────────────────────────────────────────────────────────────────────────────────────
function creerVoitures(U, nombre = 110) {
  const h = tirage(808);
  const caisse = new THREE.BoxGeometry(1.85, 0.72, 4.5); caisse.translate(0, 0.62, 0);
  const habitacle = new THREE.BoxGeometry(1.62, 0.62, 2.3); habitacle.translate(0, 1.26, -0.25);
  const positions = [], normales = [], parties = [];
  for (const [geo, partie] of [[caisse, 0], [habitacle, 1]]) {
    const ng = geo.toNonIndexed();
    positions.push(...ng.getAttribute('position').array); normales.push(...ng.getAttribute('normal').array);
    for (let i = 0; i < ng.getAttribute('position').count; i++) parties.push(partie);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
  g.setAttribute('aPartie', new THREE.Float32BufferAttribute(parties, 1));
  const a = new Float32Array(nombre * 4), b = new Float32Array(nombre * 4);
  const files = [-12.3, -7.7, -2.9, 2.9, 7.7, 12.3];
  for (let i = 0; i < nombre; i++) {
    a.set([files[i % files.length] + (h() - 0.5) * 1.2, -700 + h() * 780, 15 + h() * 16, h()], i * 4);
    const t = [[0.55, 0.06, 0.05], [0.75, 0.76, 0.78], [0.05, 0.06, 0.08], [0.10, 0.18, 0.42], [0.85, 0.82, 0.74], [0.35, 0.36, 0.38]][Math.floor(h() * 6)];
    b.set([...t, h()], i * 4);
  }
  g.setAttribute('aTrajet', new THREE.InstancedBufferAttribute(a, 4));
  g.setAttribute('aRobe', new THREE.InstancedBufferAttribute(b, 4));
  g.instanceCount = nombre;
  const u = { ...U, uT: { value: 0 }, uPointe: { value: -1e5 }, uVitessePointe: { value: 200 }, uArret: { value: 0 } };
  const voitures = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      attribute float aPartie; attribute vec4 aTrajet; attribute vec4 aRobe;
      uniform float uT; uniform float uPointe; uniform float uVitessePointe; uniform float uArret; uniform float uTemps;
      varying vec3 vP; varying vec3 vN; varying vec3 vLocal; varying vec3 vRobe; varying float vPartie;
      vec3 tourner(vec3 p, vec3 axe, float a){ float c = cos(a), s = sin(a); return p * c + cross(axe, p) * s + axe * dot(axe, p) * (1.0 - c); }
      void main(){
        float vitesse = aTrajet.z * (1.0 - uArret);
        float z = aTrajet.y + vitesse * uT;
        float x = aTrajet.x + sin(uT * (1.5 + aTrajet.w * 2.0) + aTrajet.w * 30.0) * 0.7 * (1.0 - uArret);
        // Rattrapée par la faille : la voiture bascule et tombe.
        float depuis = max((uPointe - 30.0 - z) / max(uVitessePointe - vitesse, 1.0), 0.0) * step(abs(aTrajet.x), 9.0);
        vec3 p = tourner(position, vec3(0.0, 0.0, 1.0), -sign(aTrajet.x) * min(depuis * 1.6, 1.4));
        p = tourner(p, vec3(0.0, 1.0, 0.0), sin(uT * 2.0 + aTrajet.w * 9.0) * 0.07 * (1.0 - uArret));
        vec3 monde = vec3(x - sign(aTrajet.x) * min(depuis * 5.0, 5.0), -0.5 * 16.0 * depuis * depuis, z) + p;
        vP = monde; vN = normal; vLocal = position; vRobe = aRobe.rgb; vPartie = aPartie;
        gl_Position = projectionMatrix * viewMatrix * vec4(monde, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      varying vec3 vP; varying vec3 vN; varying vec3 vLocal; varying vec3 vRobe; varying float vPartie;
      void main(){
        vec3 N = normalize(vN);
        vec3 alb = vPartie > 0.5 ? vec3(0.02, 0.03, 0.045) : vRobe;
        vec3 V = normalize(cameraPosition - vP);
        vec3 c = eclairerVille(alb, N) + (0.04 + 0.5 * pow(1.0 - max(dot(N, V), 0.0), 3.0)) * mix(uCielBas, uCielHaut, 0.6) * 0.8;
        // Les phares à l'avant (+Z), les feux à l'arrière.
        float phare = step(2.2, vLocal.z) * step(0.42, abs(vLocal.x)) * step(abs(vLocal.x), 0.86) * step(0.48, vLocal.y) * step(vLocal.y, 0.78) * (1.0 - vPartie);
        float feu = step(vLocal.z, -2.2) * step(0.45, abs(vLocal.x)) * step(0.55, vLocal.y) * step(vLocal.y, 0.80) * (1.0 - vPartie);
        c += vec3(4.2, 3.8, 3.0) * phare + vec3(2.2, 0.08, 0.03) * feu;
        gl_FragColor = vec4(brumer(c, vP), 1.0);
      }`,
  }));
  voitures.frustumCulled = false;
  return { maillage: voitures, u };
}

// ── Les passants : un corps en six pièces, animé au sommet (course, ou tête levée vers le ciel) ──────────────
function creerPassants(U, liste) {
  const pieces = [];
  const ajouter = (geo, partie, pivot) => {
    const ng = geo.toNonIndexed();
    const n = ng.getAttribute('position').count;
    pieces.push({ p: ng.getAttribute('position').array, n: ng.getAttribute('normal').array, partie: new Float32Array(n).fill(partie), pivot: new Float32Array(n * 3).map((_, i) => pivot[i % 3]) });
  };
  const capsule = (r, l, x, y, z) => { const c = new THREE.CapsuleGeometry(r, l, 3, 8); c.translate(x, y, z); return c; };
  ajouter(capsule(0.17, 0.42, 0, 1.18, 0), 0, [0, 0.9, 0]);
  const tete = new THREE.SphereGeometry(0.115, 10, 8); tete.translate(0, 1.66, 0.01);
  ajouter(tete, 1, [0, 1.5, 0]);
  ajouter(capsule(0.052, 0.52, -0.25, 1.13, 0), 2, [-0.25, 1.42, 0]);
  ajouter(capsule(0.052, 0.52, 0.25, 1.13, 0), 3, [0.25, 1.42, 0]);
  ajouter(capsule(0.075, 0.72, -0.10, 0.46, 0), 4, [-0.10, 0.90, 0]);
  ajouter(capsule(0.075, 0.72, 0.10, 0.46, 0), 5, [0.10, 0.90, 0]);
  const total = pieces.reduce((n, x) => n + x.partie.length, 0);
  const P = new Float32Array(total * 3), Nn = new Float32Array(total * 3), Pa = new Float32Array(total), Pi = new Float32Array(total * 3);
  let o = 0;
  for (const x of pieces) { P.set(x.p, o * 3); Nn.set(x.n, o * 3); Pa.set(x.partie, o); Pi.set(x.pivot, o * 3); o += x.partie.length; }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  g.setAttribute('aPartie', new THREE.BufferAttribute(Pa, 1)); g.setAttribute('aPivot', new THREE.BufferAttribute(Pi, 3));
  const a = new Float32Array(liste.length * 4), b = new Float32Array(liste.length * 4), c = new Float32Array(liste.length * 3);
  liste.forEach((q, i) => { a.set([q.x, q.z, q.cap, q.phase], i * 4); b.set([q.vitesse, q.bras, q.taille, q.tete], i * 4); c.set(q.teinte, i * 3); });
  g.setAttribute('aPlace', new THREE.InstancedBufferAttribute(a, 4));
  g.setAttribute('aAllure', new THREE.InstancedBufferAttribute(b, 4));
  g.setAttribute('aHabit', new THREE.InstancedBufferAttribute(c, 3));
  g.instanceCount = liste.length;
  const u = { ...U, uT: { value: 0 }, uContre: { value: new THREE.Color(0, 0, 0) } };
  const foule = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */`
      attribute float aPartie; attribute vec3 aPivot; attribute vec4 aPlace; attribute vec4 aAllure; attribute vec3 aHabit;
      uniform float uT;
      varying vec3 vP; varying vec3 vN; varying vec3 vHabit; varying float vPartie;
      vec3 autourX(vec3 p, vec3 pivot, float a){ float c = cos(a), s = sin(a); vec3 d = p - pivot; return pivot + vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c); }
      vec3 autourZ(vec3 p, vec3 pivot, float a){ float c = cos(a), s = sin(a); vec3 d = p - pivot; return pivot + vec3(d.x * c - d.y * s, d.x * s + d.y * c, d.z); }
      void main(){
        float vitesse = aAllure.x;
        float court = step(0.5, vitesse);
        float pas = uT * (6.5 + vitesse * 0.9) + aPlace.w * 6.283;
        vec3 p = position; vec3 n = normal;
        float angle = 0.0;
        if (aPartie > 3.5) angle = (aPartie > 4.5 ? 1.0 : -1.0) * sin(pas) * 0.95 * court;
        else if (aPartie > 1.5) {
          float cote = aPartie > 2.5 ? 1.0 : -1.0;
          angle = -cote * sin(pas) * 0.85 * court;
          // Debout : un bras levé vers le ciel pour ceux qui montrent l'objet du doigt.
          angle += (1.0 - court) * (cote > 0.0 ? -2.55 * aAllure.y : 0.0);
        } else if (aPartie > 0.5) angle = (1.0 - court) * -0.55 * aAllure.w;
        p = autourX(p, aPivot, angle); n = autourX(n, vec3(0.0), angle);
        // Le buste : penché en avant dans la course, cambré quand on regarde en l'air.
        float buste = court * 0.22 - (1.0 - court) * 0.10 * aAllure.w;
        if (aPartie < 3.5) { p = autourX(p, vec3(0.0, 0.9, 0.0), buste); n = autourX(n, vec3(0.0), buste); }
        p.y += abs(sin(pas)) * 0.07 * court;
        p *= aAllure.z;
        float cap = aPlace.z;
        float cs = cos(cap), sn = sin(cap);
        p = vec3(p.x * cs + p.z * sn, p.y, -p.x * sn + p.z * cs); n = vec3(n.x * cs + n.z * sn, n.y, -n.x * sn + n.z * cs);
        vec3 monde = vec3(aPlace.x + sin(cap) * vitesse * uT, 0.0, aPlace.y + cos(cap) * vitesse * uT) + p;
        vP = monde; vN = n; vHabit = aHabit; vPartie = aPartie;
        gl_Position = projectionMatrix * viewMatrix * vec4(monde, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${AMBIANCE}
      uniform vec3 uContre;
      varying vec3 vP; varying vec3 vN; varying vec3 vHabit; varying float vPartie;
      void main(){
        vec3 N = normalize(vN);
        vec3 alb = abs(vPartie - 1.0) < 0.5 ? vec3(0.36, 0.25, 0.19) : vPartie > 3.5 ? vHabit * 0.45 : vHabit;
        vec3 V = normalize(cameraPosition - vP);
        vec3 c = eclairerVille(alb, N);
        c += uContre * pow(1.0 - max(dot(N, V), 0.0), 2.2) * max(dot(N, uMenaceDir) * 0.6 + 0.4, 0.0);   // le liseré de la lueur
        gl_FragColor = vec4(brumer(c, vP), 1.0);
      }`,
  }));
  foule.frustumCulled = false;
  return { maillage: foule, u };
}

const HABITS = [[0.10, 0.12, 0.20], [0.30, 0.08, 0.07], [0.42, 0.40, 0.36], [0.07, 0.07, 0.08], [0.16, 0.25, 0.18], [0.45, 0.33, 0.12], [0.20, 0.20, 0.30]];

export function creerVille() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.2, 30000);
  const U = ambiance();
  const ciel = creerCiel(U);
  const sol = creerSol(U);
  const megapole = creerImmeubles(plangMegapole(), U, { sol: 3 });
  const avenueBatie = creerImmeubles(planAvenue(), U);
  const mer = creerMer(U);
  const avenue = creerAvenue(U);
  const voitures = creerVoitures(U);

  // Les deux tours qui tombent, dans le plan de l'effondrement.
  const tourA = creerTour(U, { base: v(-47, 0, -120), teinte: [0.30, 0.31, 0.34], graine: 0.37, axe: v(0.25, 0, 1) });
  const tourB = creerTour(U, { base: v(47, 0, -215), ny: 40, teinte: [0.22, 0.24, 0.28], graine: 0.81, axe: v(-0.2, 0, -1) });
  const poussiere = creerPoussiere(U, [
    { x: -47, z: -120, rayon: 30, haut: 16, t0: 0.10, duree: 3.4 }, { x: 47, z: -215, rayon: 30, haut: 16, t0: 0.85, duree: 3.2 },
    { x: -47, z: -120, rayon: 20, haut: 60, t0: 0.5, duree: 3.0 },
  ]);

  const h = tirage(2026);
  // La foule qui regarde le ciel, sur l'avenue.
  const badauds = [];
  for (let i = 0; i < 90; i++) {
    const rang = Math.floor(i / 9);
    badauds.push({ x: (h() - 0.5) * 22 + (rang < 2 ? (h() - 0.5) * 3 : 0), z: -3.2 - rang * 2.6 - h() * 2.2, cap: Math.PI + (h() - 0.5) * 0.5, phase: h(), vitesse: 0, bras: h() < 0.28 ? 0.8 + h() * 0.2 : 0, taille: 0.92 + h() * 0.16, tete: 0.7 + h() * 0.5, teinte: HABITS[Math.floor(h() * HABITS.length)] });
  }
  const foule = creerPassants(U, badauds);
  // Les fuyards de l'avenue qui se fend : ils courent vers la caméra (+Z).
  const fuyards = [];
  for (let i = 0; i < 150; i++) {
    const trottoir = h() < 0.72;
    fuyards.push({ x: trottoir ? (h() < 0.5 ? -1 : 1) * (16.2 + h() * 7) : (h() - 0.5) * 26, z: -330 + h() * 360, cap: (h() - 0.5) * 0.24, phase: h(), vitesse: 5.2 + h() * 3.4, bras: 0, taille: 0.92 + h() * 0.16, tete: 0, teinte: HABITS[Math.floor(h() * HABITS.length)] });
  }
  const fuite = creerPassants(U, fuyards);

  scene.add(ciel.maillage, sol.maillage, megapole.maillage, avenueBatie.maillage, mer.groupe, avenue.groupe, voitures.maillage, tourA.maillage, tourB.maillage, poussiere.maillage, foule.maillage, fuite.maillage);
  const tout = { megapole: megapole.maillage, avenueBatie: avenueBatie.maillage, mer: mer.groupe, avenue: avenue.groupe, voitures: voitures.maillage, tourA: tourA.maillage, tourB: tourB.maillage, poussiere: poussiere.maillage, foule: foule.maillage, fuite: fuite.maillage };
  const montrer = (...noms) => { for (const [nom, objet] of Object.entries(tout)) objet.visible = noms.includes(nom); };

  function viser(pos, cible, t, secousse = 0, roulis = 0, fov = 50) {
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.position.copy(pos); camera.up.set(0, 1, 0); camera.lookAt(cible);
    const s = tremblement(t, 7);
    camera.rotateX(s.y * secousse); camera.rotateY(s.x * secousse); camera.rotateZ(roulis + s.r * secousse * 0.7);
    camera.updateMatrixWorld();
  }
  const lumiere = (soleil, soleilC, haut, bas, brume, densite) => {
    U.uSoleil.value.copy(soleil).normalize(); U.uSoleilCouleur.value.setRGB(...soleilC); U.uCielHaut.value.setRGB(...haut); U.uCielBas.value.setRGB(...bas); U.uBrume.value.setRGB(...brume); U.uDensite.value = densite;
  };
  const menace = (dir, couleur, force, rayon) => {
    U.uMenaceDir.value.copy(dir).normalize(); U.uMenaceCouleur.value.setRGB(...couleur);
    ciel.u.uMenaceForce.value = force; ciel.u.uMenaceRayon.value = rayon;
  };

  // ── Scène 1c : des passants lèvent la tête vers la masse incandescente ────────────────────────────────────
  function foulePlan(k, t) {
    montrer('avenueBatie', 'avenue', 'foule', 'voitures');
    U.uTemps.value = t;
    sol.u.uMode.value = 1; avenue.u.uPointe.value = -1e5; avenueBatie.u.uSecousse.value = 0.25 * k; avenueBatie.u.uLumieres.value = 0.13; avenueBatie.u.uEclat.value = 0.7;
    voitures.u.uT.value = 0; voitures.u.uArret.value = 1; voitures.u.uPointe.value = -1e5;
    foule.u.uT.value = t; foule.u.uContre.value.setRGB(1.5, 0.6, 0.16);
    const grossit = 0.125 + 0.085 * k;
    lumiere(v(0.3, 0.5, 0.6), [0.02, 0.02, 0.03], [0.022, 0.028, 0.050], [0.20, 0.09, 0.045], [0.13, 0.065, 0.035], 0.00075);
    menace(v(0.06, 0.66, -0.75), [1.0 + 0.35 * k, 0.40 + 0.14 * k, 0.11], 1, grossit);
    ciel.u.uMenaceQueue.value.set(0.55, 0.85, 0.2).normalize(); ciel.u.uNuages.value = 0.18;
    ciel.u.uNuageClair.value.setRGB(0.55, 0.30, 0.16); ciel.u.uNuageSombre.value.setRGB(0.07, 0.05, 0.06);
    viser(v(1.4 - 0.7 * k, 1.30, 1.9 - 1.5 * k), v(0.6, 5.0 + 9.0 * adoucir(k), -22), t, 0.006 + 0.012 * k, 0.03, 62);
    return { scene, camera, bloom: [0.40, 0.65, 0.92], vignette: 0.9, grain: 0.05, aberration: 0.5, exposition: 1.15 };
  }

  // ── Scène 2a : le mur d'eau arrive sur la ville côtière ──────────────────────────────────────────────────
  function tsunami(k, t) {
    montrer('megapole', 'mer');
    U.uTemps.value = t;
    sol.u.uMode.value = 0; megapole.u.uSecousse.value = 0.5; megapole.u.uLumieres.value = 0.05; megapole.u.uEclat.value = 0.35;
    mer.u.uFront.value = melange(-1150, 230, Math.pow(k, 1.1)); mer.u.uHauteur.value = 430;
    lumiere(v(-0.50, 0.45, 0.74), [1.35, 1.18, 1.0], [0.13, 0.18, 0.26], [0.46, 0.50, 0.54], [0.42, 0.47, 0.52], 0.00024);
    menace(v(0, 1, 0), [0, 0, 0], 0, 0.1);
    ciel.u.uNuages.value = -0.05; ciel.u.uNuageClair.value.setRGB(0.62, 0.65, 0.70); ciel.u.uNuageSombre.value.setRGB(0.12, 0.14, 0.18);
    viser(v(-150 + 60 * k, 130 + 40 * k, 560 + 150 * k), v(10, 150 + 110 * k, -500), t, 0.004 + 0.014 * k, -0.05 + 0.04 * k, 54);
    return { scene, camera, bloom: [0.22, 0.5, 0.95], vignette: 0.8, grain: 0.04, aberration: 0.5, exposition: 1.0, saturation: 0.95 };
  }

  // ── Scène 2b : les tours s'effondrent ────────────────────────────────────────────────────────────────────
  function effondrement(k, t, plan) {
    montrer('avenueBatie', 'avenue', 'tourA', 'tourB', 'poussiere', 'voitures');
    const tl = (t - plan.debut);
    U.uTemps.value = t;
    sol.u.uMode.value = 1; avenue.u.uPointe.value = -1e5; avenueBatie.u.uSecousse.value = 2.2; avenueBatie.u.uLumieres.value = 0.04; avenueBatie.u.uEclat.value = 0.3;
    voitures.u.uT.value = 0; voitures.u.uArret.value = 1; voitures.u.uPointe.value = -1e5;
    const avance = 0.55 + tl * 1.25;                         // le plan commence quand la première tour cède
    tourA.u.uT.value = avance; tourB.u.uT.value = avance - 0.75; poussiere.u.uT.value = avance;
    lumiere(v(0.55, 0.50, 0.35), [1.5, 1.05, 0.62], [0.16, 0.19, 0.25], [0.52, 0.42, 0.32], [0.46, 0.39, 0.32], 0.0009 + 0.0008 * k);
    menace(v(0, 1, 0), [0, 0, 0], 0, 0.1);
    ciel.u.uNuages.value = 0.0; ciel.u.uNuageClair.value.setRGB(0.75, 0.62, 0.50); ciel.u.uNuageSombre.value.setRGB(0.22, 0.20, 0.20);
    viser(v(7 - 3 * k, 1.75, 38 + 12 * k), v(-14 + 14 * k, 92 - 38 * k, -150), t, 0.020, 0.07 - 0.10 * k, 60);
    return { scene, camera, bloom: [0.20, 0.5, 0.95], vignette: 0.85, grain: 0.05, aberration: 0.5, exposition: 0.95 };
  }

  // ── Scène 2c : l'avenue se fend, voitures et passants fuient vers la caméra ───────────────────────────────
  function faille(k, t, plan) {
    montrer('avenueBatie', 'avenue', 'voitures', 'fuite');
    const tl = t - plan.debut, duree = plan.fin - plan.debut;
    U.uTemps.value = t;
    sol.u.uMode.value = 1; avenueBatie.u.uSecousse.value = 1.6; avenueBatie.u.uLumieres.value = 0.12; avenueBatie.u.uEclat.value = 0.6;
    const vitessePointe = 215 / duree;
    const pointe = -140 + vitessePointe * tl;
    avenue.u.uPointe.value = pointe;
    voitures.u.uT.value = 4.0 + tl; voitures.u.uArret.value = 0; voitures.u.uPointe.value = pointe; voitures.u.uVitessePointe.value = vitessePointe;
    fuite.u.uT.value = 2.0 + tl; fuite.u.uContre.value.setRGB(0.5, 0.3, 0.15);
    lumiere(v(-0.35, 0.45, 0.60), [0.80, 0.46, 0.25], [0.11, 0.13, 0.20], [0.40, 0.25, 0.16], [0.26, 0.17, 0.12], 0.0016);
    menace(v(-0.2, 0.5, -0.8), [0.5, 0.2, 0.06], 0, 0.1);
    ciel.u.uNuages.value = 0.05; ciel.u.uNuageClair.value.setRGB(0.70, 0.42, 0.26); ciel.u.uNuageSombre.value.setRGB(0.10, 0.09, 0.11);
    viser(v(5.6 - 1.2 * k, 3.0 + 2.2 * k, 30 + 26 * k), v(-0.5, -3.0, -70), t, 0.028, -0.06 + 0.05 * k, 62);
    return { scene, camera, bloom: [0.35, 0.6, 0.93], vignette: 0.85, grain: 0.05, aberration: 0.5, exposition: 1.25 };
  }

  return { scene, camera, plans: { foule: foulePlan, tsunami, effondrement, faille } };
}
