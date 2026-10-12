// LA TERRE, SON ATMOSPHÈRE, LES ÉTOILES ET LE SOLEIL — tout est procédural, aucune image importée.
// Les continents sont tracés à la main (longitude, latitude) dans un masque, puis habillés par le matériau :
// côtes, déserts, forêts, glaces, nuages, lumières de nuit, reflet du soleil sur l'océan.
import * as THREE from 'three';
import { BRUIT, tirage } from './bruit.js';

// Contours grossiers (degrés). Le bruit du matériau redessine les côtes : seule la silhouette compte.
const CONTINENTS = [
  // Amérique du Nord et centrale
  [[-168, 66], [-156, 71], [-130, 70], [-110, 68], [-95, 72], [-82, 70], [-80, 63], [-65, 60], [-56, 52], [-66, 45], [-70, 42], [-75, 36], [-81, 31], [-80, 25], [-84, 30], [-90, 30], [-97, 27], [-97, 22], [-94, 18], [-88, 21], [-87, 16], [-83, 10], [-79, 8], [-83, 8], [-92, 14], [-105, 20], [-110, 24], [-114, 31], [-118, 34], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-160, 56], [-166, 62]],
  // Groenland
  [[-55, 60], [-44, 60], [-22, 70], [-20, 80], [-40, 83], [-60, 82], [-70, 77], [-55, 70]],
  // Amérique du Sud
  [[-79, 8], [-72, 12], [-62, 10], [-52, 5], [-50, 0], [-35, -6], [-39, -15], [-42, -23], [-48, -28], [-54, -34], [-58, -38], [-65, -42], [-68, -52], [-73, -52], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 1], [-77, 4]],
  // Afrique
  [[-17, 21], [-16, 12], [-12, 7], [-5, 5], [4, 6], [9, 4], [9, -1], [13, -8], [12, -17], [15, -27], [18, -34], [22, -34], [28, -33], [33, -27], [35, -22], [40, -15], [40, -5], [43, 0], [51, 11], [44, 11], [40, 15], [35, 25], [33, 31], [25, 32], [20, 31], [10, 34], [10, 37], [0, 36], [-6, 35], [-10, 30], [-14, 26]],
  // Eurasie
  [[-9, 37], [-9, 43], [-1, 44], [-4, 48], [3, 51], [8, 54], [9, 57], [12, 56], [14, 54], [21, 55], [24, 58], [29, 60], [23, 60], [21, 64], [25, 66], [22, 66], [18, 62], [16, 57], [12, 58], [10, 59], [6, 58], [5, 62], [13, 67], [25, 71], [33, 69], [41, 67], [44, 68], [60, 69], [68, 69], [73, 72], [80, 73], [98, 76], [113, 74], [130, 71], [150, 72], [160, 70], [180, 69], [180, 66], [178, 62], [163, 60], [156, 52], [160, 53], [155, 59], [143, 59], [135, 54], [141, 48], [133, 43], [127, 39], [129, 35], [126, 34], [122, 40], [118, 39], [121, 36], [121, 31], [118, 24], [110, 21], [108, 18], [109, 12], [105, 9], [100, 13], [101, 7], [104, 1], [100, 3], [98, 9], [98, 16], [94, 17], [91, 22], [87, 21], [80, 15], [80, 9], [77, 8], [73, 17], [72, 21], [67, 25], [57, 25], [60, 22], [55, 17], [45, 13], [43, 13], [39, 21], [35, 28], [35, 36], [28, 36], [26, 40], [23, 38], [22, 36], [20, 40], [18, 42], [13, 45], [16, 41], [18, 40], [16, 38], [12, 42], [8, 44], [3, 43], [-1, 38], [-5, 36]],
  // Australie
  [[114, -22], [114, -34], [118, -35], [124, -33], [131, -31], [135, -35], [140, -38], [146, -39], [150, -37], [153, -28], [149, -21], [146, -19], [142, -11], [141, -17], [136, -12], [131, -12], [129, -15], [122, -18]],
  // Îles
  [[-5, 50], [1, 51], [1, 53], [-2, 56], [-2, 58], [-5, 58], [-6, 55], [-3, 54], [-5, 52]],
  [[-10, 52], [-6, 52], [-6, 55], [-10, 54]],
  [[130, 31], [132, 34], [136, 34], [140, 36], [142, 40], [142, 44], [145, 44], [141, 45], [139, 38], [136, 36], [131, 34]],
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
  [[166, -46], [170, -47], [174, -42], [178, -38], [175, -36], [173, -35], [174, -39], [172, -41], [170, -44], [167, -45]],
  [[95, 5], [104, -5], [106, -6], [100, 0]],
  [[109, 1], [117, 7], [119, 1], [116, -4], [110, -3]],
  [[131, -1], [141, -3], [147, -6], [150, -10], [141, -9], [138, -7], [132, -4]],
  [[105, -7], [114, -8], [114, -7], [106, -6]],
  [[120, 18], [122, 18], [126, 7], [122, 7], [120, 14]],
  [[80, 9], [82, 7], [80, 6]],
  [[-24, 65], [-14, 64], [-14, 66], [-22, 66]],
  [[-85, 22], [-74, 20], [-78, 22], [-82, 23]],
  [[8, 39], [10, 39], [9, 41], [9, 43], [8, 41]],
  [[12, 38], [15, 37], [15, 38]],
];

function masqueDesContinents() {
  const L = 2048, H = 1024;
  const toile = document.createElement('canvas');
  toile.width = L; toile.height = H;
  const c = toile.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, L, H);
  c.filter = 'blur(9px)';                                  // un masque très adouci : c'est le bruit du matériau qui dessine les côtes
  c.fillStyle = '#fff';
  for (const contour of CONTINENTS) {
    c.beginPath();
    contour.forEach(([lon, lat], i) => {
      const x = (lon + 180) / 360 * L, y = (90 - lat) / 180 * H;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    });
    c.closePath(); c.fill();
  }
  // L'Antarctique : une bande, que le bruit du matériau découpe.
  c.fillRect(0, (90 + 70) / 180 * H, L, H);
  const texture = new THREE.CanvasTexture(toile);
  texture.wrapS = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

const SOMMETS = /* glsl */`
varying vec3 vObj; varying vec3 vN; varying vec3 vP;
void main(){
  vObj = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 p = modelMatrix * vec4(position, 1.0);
  vP = p.xyz;
  gl_Position = projectionMatrix * viewMatrix * p;
}`;

const SURFACE = /* glsl */`
uniform sampler2D masque;
uniform vec3 soleil;
uniform float temps;
uniform vec3 impactDir; uniform float impactRayon; uniform float impactForce; uniform float impactEclair;
uniform vec3 lueurDir; uniform float lueurForce;
varying vec3 vObj; varying vec3 vN; varying vec3 vP;
${BRUIT}
vec3 tournerY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
void main(){
  vec3 n = normalize(vObj);
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vP);
  float lon = atan(n.z, n.x), lat = asin(clamp(n.y, -1.0, 1.0));
  vec2 uv = vec2(lon / 6.2831853 + 0.5, lat / 3.14159265 + 0.5);
  float m = texture2D(masque, uv).r;
  float gros = fbm(n * 7.0);
  float fin = snoise(n * 46.0);
  float cote = m + gros * 0.40 + fbm3(n * 19.0 + 3.0) * 0.16 + fin * 0.05;
  float terre = smoothstep(0.485, 0.515, cote);

  // Les sols : forêts, prairies, déserts vers les tropiques, roche en altitude, neige vers les pôles.
  float veg = fbm3(n * 13.0 + 1.7) * 0.5 + 0.5;
  float relief = fbm(n * 26.0 + 9.0);
  float tropique = 1.0 - smoothstep(0.0, 0.30, abs(abs(lat) - 0.42));
  float aride = sat(tropique * 1.25 + fbm3(n * 3.1 + 4.0) * 0.75 - 0.35);
  vec3 sol = mix(vec3(0.026, 0.095, 0.020), vec3(0.120, 0.175, 0.045), veg);
  sol = mix(sol, vec3(0.46, 0.36, 0.20), aride);
  sol = mix(sol, vec3(0.20, 0.17, 0.14), smoothstep(0.18, 0.55, relief) * 0.55);
  float neige = smoothstep(0.80, 0.93, abs(n.y) + relief * 0.07 + gros * 0.05);
  sol = mix(sol, vec3(0.86, 0.89, 0.93), neige);

  // L'océan : clair au bord des côtes, profond au large ; banquise aux pôles.
  float large = smoothstep(0.50, 0.10, m + gros * 0.16);
  vec3 mer = mix(vec3(0.020, 0.150, 0.230), vec3(0.004, 0.026, 0.080), large);
  float banquise = max(smoothstep(0.935, 0.965, n.y + gros * 0.03), smoothstep(0.87, 0.90, -n.y + gros * 0.03));
  vec3 alb = mix(mer, sol, terre);
  alb = mix(alb, vec3(0.90, 0.93, 0.97), banquise);

  // Les nuages : un bruit tordu par un autre, qui dérive lentement.
  vec3 nc = tournerY(n, temps * 0.010);
  vec3 tors = nc * 2.4 + 0.85 * vec3(fbm3(nc * 2.1 + 11.0), fbm3(nc * 2.1 + 23.0), fbm3(nc * 2.1 + 37.0));
  float c = fbm(tors) * 0.80 + fbm3(tors * 3.3 + 5.0) * 0.32;
  float couv = smoothstep(0.02, 0.52, c);

  // L'impact : un front de feu qui s'étend, l'intérieur brûlé, les nuages soufflés devant lui.
  float ang = acos(clamp(dot(n, impactDir), -1.0, 1.0));
  float d = ang - impactRayon;
  float dedans = smoothstep(0.012, -0.03, d) * impactForce;
  float front = exp(-d * d / 0.00022) * impactForce;
  float bourrelet = exp(-(d - 0.035) * (d - 0.035) / 0.0009) * impactForce;
  float onde2 = exp(-(d - 0.12) * (d - 0.12) / 0.0012) * impactForce * 0.5;
  couv = sat(couv * (1.0 - dedans * 0.92) + bourrelet * 0.95 + onde2 * 0.5);

  float ndl = dot(N, soleil);
  float jour = smoothstep(-0.10, 0.22, ndl);
  vec3 lum = vec3(1.0, 0.965, 0.90) * 1.55 * max(ndl, 0.0);
  vec3 couleur = alb * (lum + 0.012);
  vec3 Hh = normalize(soleil + V);
  float reflet = pow(max(dot(N, Hh), 0.0), 150.0) * (1.0 - terre) * (1.0 - couv) * 0.9;
  couleur += reflet * vec3(1.0, 0.9, 0.72) * jour;
  // L'ombre portée des nuages, décalée vers le soleil.
  vec3 no = tournerY(normalize(n + soleil * 0.012), temps * 0.010);
  vec3 torsO = no * 2.4 + 0.85 * vec3(fbm3(no * 2.1 + 11.0), fbm3(no * 2.1 + 23.0), fbm3(no * 2.1 + 37.0));
  float ombre = smoothstep(0.02, 0.52, fbm(torsO) * 0.80);
  couleur *= 1.0 - 0.45 * ombre * (1.0 - couv);
  couleur = mix(couleur, vec3(1.0) * (lum * 1.05 + 0.02), couv);
  // Le terminateur rougit.
  couleur *= mix(vec3(1.0, 0.50, 0.26), vec3(1.0), smoothstep(-0.02, 0.32, ndl));

  // Les villes, la nuit.
  float foyers = smoothstep(0.55, 0.9, snoise(n * 70.0) * 0.5 + 0.5) * smoothstep(-0.1, 0.35, fbm3(n * 9.0 + 2.0)) * smoothstep(0.2, 0.6, snoise(n * 210.0) * 0.5 + 0.5);
  couleur += foyers * terre * (1.0 - neige) * (1.0 - aride * 0.7) * vec3(1.0, 0.70, 0.32) * 1.9 * (1.0 - jour) * (1.0 - couv * 0.85) * (1.0 - dedans);

  // L'intérieur de l'impact : sol calciné, braises ; le front lui-même est blanc-orangé.
  float prof = sat(-d / max(impactRayon, 0.02));           // 0 sur le front, 1 au centre
  float veines = smoothstep(0.60, 0.95, fbm(n * 10.0 + vec3(0.0, temps * 0.22, 0.0)) * 0.5 + 0.5 + 0.22 * snoise(n * 38.0));
  float volutes = smoothstep(0.25, 0.85, fbm(n * 5.5 + vec3(temps * 0.04, 0.0, 3.0)) * 0.5 + 0.5);
  vec3 brule = mix(vec3(0.050, 0.028, 0.020), vec3(0.012, 0.010, 0.012), prof);
  brule = mix(brule, vec3(0.115, 0.095, 0.085), volutes * 0.55 * prof);
  brule += vec3(1.7, 0.42, 0.05) * veines * (1.0 - prof * 0.7);
  brule += vec3(1.5, 0.55, 0.12) * exp(d / 0.030) * step(d, 0.0);
  couleur = mix(couleur, brule, dedans * 0.95);
  couleur += front * vec3(3.6, 1.7, 0.5);
  couleur += impactEclair * exp(-ang * ang / 0.012) * vec3(5.0, 3.8, 2.6);

  // La lueur du bolide sur les nuages (rentrée atmosphérique).
  float sousBolide = max(dot(n, lueurDir), 0.0);
  couleur += lueurForce * pow(sousBolide, 220.0) * vec3(2.2, 0.9, 0.25) * (0.35 + 0.65 * couv);

  // L'air : bleu sur le limbe, voile léger de face.
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float eclaire = smoothstep(-0.28, 0.35, ndl);
  couleur += vec3(0.20, 0.46, 1.0) * fres * 1.25 * eclaire;
  couleur += vec3(0.05, 0.12, 0.30) * 0.22 * eclaire;
  couleur += vec3(1.0, 0.36, 0.12) * fres * 0.9 * smoothstep(0.3, 0.0, abs(ndl)) * 0.6;
  gl_FragColor = vec4(couleur, 1.0);
}`;

// Le halo : pour chaque rayon de vue, la distance à laquelle il frôle le globe.
const HALO = /* glsl */`
uniform vec3 soleil; uniform vec3 centre; uniform float rayon; uniform float impactLueur;
varying vec3 vP;
void main(){
  vec3 o = cameraPosition - centre;
  vec3 r = normalize(vP - cameraPosition);
  float tm = -dot(o, r);
  vec3 proche = o + r * max(tm, 0.0);
  float h = (length(proche) - rayon) / rayon;
  float dense = exp(-max(h, 0.0) / 0.018) * smoothstep(-0.004, 0.004, h);
  float fin = exp(-max(h, 0.0) / 0.075) * 0.22;
  float cote = dot(normalize(proche), soleil);
  float eclaire = smoothstep(-0.35, 0.30, cote);
  vec3 teinte = mix(vec3(1.0, 0.42, 0.14), vec3(0.28, 0.56, 1.0), smoothstep(-0.12, 0.25, cote));
  vec3 couleur = teinte * (dense * 1.35 + fin * 0.7) * eclaire;
  couleur += vec3(1.0, 0.5, 0.18) * (dense + fin) * impactLueur;
  gl_FragColor = vec4(couleur, 1.0);
}`;

export function creerTerre(rayon) {
  const uniformes = {
    masque: { value: masqueDesContinents() }, soleil: { value: new THREE.Vector3(1, 0.2, 0.4).normalize() }, temps: { value: 0 },
    impactDir: { value: new THREE.Vector3(0, 0, 1) }, impactRayon: { value: 0 }, impactForce: { value: 0 }, impactEclair: { value: 0 },
    lueurDir: { value: new THREE.Vector3(0, 1, 0) }, lueurForce: { value: 0 },
  };
  const globe = new THREE.Mesh(new THREE.SphereGeometry(rayon, 192, 128), new THREE.ShaderMaterial({ uniforms: uniformes, vertexShader: SOMMETS, fragmentShader: SURFACE }));
  const uHalo = { soleil: uniformes.soleil, centre: { value: new THREE.Vector3() }, rayon: { value: rayon }, impactLueur: { value: 0 } };
  const halo = new THREE.Mesh(new THREE.SphereGeometry(rayon * 1.32, 96, 64), new THREE.ShaderMaterial({
    uniforms: uHalo, vertexShader: SOMMETS, fragmentShader: HALO, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const groupe = new THREE.Group();
  groupe.add(globe, halo);
  return { groupe, globe, halo, uniformes, uHalo, rayon };
}

/** Le ciel profond : étoiles ponctuelles et une traînée laiteuse, qui suivent la caméra. */
export function creerEtoiles(nombre = 9000) {
  const h = tirage(4242);
  const positions = new Float32Array(nombre * 3), couleurs = new Float32Array(nombre * 3), tailles = new Float32Array(nombre);
  for (let i = 0; i < nombre; i++) {
    // Deux tiers uniformes, un tiers resserré autour d'un grand cercle incliné (la Voie lactée).
    let x, y, z;
    if (h() < 0.62) { const u = h() * 2 - 1, a = h() * Math.PI * 2, s = Math.sqrt(1 - u * u); x = s * Math.cos(a); y = u; z = s * Math.sin(a); }
    else { const a = h() * Math.PI * 2, e = (h() + h() + h() - 1.5) * 0.22; x = Math.cos(a); y = e; z = Math.sin(a); const c = Math.cos(0.9), s = Math.sin(0.9); const y2 = y * c - z * s; z = y * s + z * c; y = y2; }
    const n = Math.hypot(x, y, z);
    positions.set([x / n * 900, y / n * 900, z / n * 900], i * 3);
    const eclat = Math.pow(h(), 5.0);
    const chaud = h();
    couleurs.set([0.75 + 0.25 * chaud, 0.80 + 0.12 * Math.abs(chaud - 0.5), 1.0 - 0.3 * chaud].map(v => v * (0.35 + eclat * 3.2)), i * 3);
    tailles[i] = 1.3 + eclat * 3.4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('couleur', new THREE.BufferAttribute(couleurs, 3));
  g.setAttribute('taille', new THREE.BufferAttribute(tailles, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { echelle: { value: 1 }, eclat: { value: 1 } },
    vertexShader: /* glsl */`attribute vec3 couleur; attribute float taille; uniform float echelle; varying vec3 vC;
      void main(){ vC = couleur; vec4 p = viewMatrix * vec4(position + cameraPosition, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; gl_PointSize = taille * echelle; }`,
    fragmentShader: /* glsl */`uniform float eclat; varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; gl_FragColor = vec4(vC * eclat * exp(-r * 3.5), 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
  });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  points.renderOrder = -10;
  return points;
}

/** Le Soleil : un disque très lumineux, que le flou lumineux étale. */
export function creerSoleil() {
  const m = new THREE.ShaderMaterial({
    uniforms: { force: { value: 1 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`uniform float force; varying vec2 vUv;
      void main(){ vec2 d = vUv - 0.5; float r = length(d) * 2.0; float coeur = smoothstep(0.085, 0.060, r);
        float halo = exp(-r * 7.0) * 0.9 + exp(-r * 2.4) * 0.12;
        float rais = pow(max(0.0, cos(atan(d.y, d.x) * 6.0)), 40.0) * exp(-r * 3.0) * 0.35;
        gl_FragColor = vec4(vec3(1.0, 0.93, 0.80) * (coeur * 9.0 + halo * 1.1 + rais * 0.5) * force * smoothstep(1.0, 0.7, r), 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const disque = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
  disque.frustumCulled = false;
  return disque;
}
