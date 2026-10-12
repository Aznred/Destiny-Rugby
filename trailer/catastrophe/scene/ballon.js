// L'OBJET DE 800 KILOMÈTRES — c'est un ballon de rugby, et il l'est dès la première image.
// Le même maillage sert de « bolide » (vu par l'arrière, noirci, noyé dans son plasma), de surface étrange
// (grain en nid d'abeilles, couture, points de fil en lumière rasante) puis de ballon révélé : rien n'est échangé au montage.
// Unité de la scène d'espace : 100 km. Diamètre 8 (800 km), longueur 12.
import * as THREE from 'three';
import { BRUIT } from './bruit.js';

export const RAYON = 4, DEMI = 6;

function geometrieBallon() {
  const points = [];
  const n = 220;
  for (let i = 0; i <= n; i++) {
    const s = Math.sin((i / n - 0.5) * Math.PI);          // resserré vers les pointes
    points.push(new THREE.Vector2(Math.max(0, RAYON * Math.pow(1 - s * s, 0.58)), DEMI * s));
  }
  const g = new THREE.LatheGeometry(points, 320);
  g.rotateX(Math.PI / 2);                                   // le grand axe passe sur Z : la pointe +Z ouvre la route
  g.computeVertexNormals();
  return g;
}

/** L'habillage : cuir blanc, deux bandes vertes et dorées par panneau. Aucun texte, aucune marque. */
function decorBallon() {
  const L = 2048, H = 1024;
  const toile = document.createElement('canvas');
  toile.width = L; toile.height = H;
  const c = toile.getContext('2d');
  c.fillStyle = '#f1eee4'; c.fillRect(0, 0, L, H);
  const panneau = L / 4;
  for (let k = 0; k < 4; k++) {
    c.save();
    c.beginPath(); c.rect(k * panneau, 0, panneau, H); c.clip();
    c.translate(k * panneau, 0);
    for (const sens of [0, 1]) {
      c.save();
      if (sens) { c.translate(panneau, H); c.rotate(Math.PI); }
      const bande = (y0, y1, epaisseur, couleur) => {
        c.beginPath();
        c.moveTo(-10, y0); c.quadraticCurveTo(panneau * 0.45, y0 - 30, panneau + 10, y1);
        c.lineTo(panneau + 10, y1 + epaisseur); c.quadraticCurveTo(panneau * 0.45, y0 - 30 + epaisseur * 1.25, -10, y0 + epaisseur * 0.55);
        c.closePath(); c.fillStyle = couleur; c.fill();
      };
      bande(118, 250, 96, '#0d5a3a');
      bande(196, 352, 22, '#d9a53a');
      bande(60, 150, 12, '#123d2c');
      c.restore();
    }
    c.restore();
  }
  const t = new THREE.CanvasTexture(toile);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const SOMMETS = /* glsl */`
varying vec3 vO; varying vec3 vN; varying vec3 vP;
void main(){
  vO = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 p = modelMatrix * vec4(position, 1.0);
  vP = p.xyz;
  gl_Position = projectionMatrix * viewMatrix * p;
}`;

const CUIR = /* glsl */`
uniform sampler2D decor;
uniform vec3 soleil; uniform vec3 soleilCouleur;
uniform vec3 terreDir; uniform vec3 terreCouleur;
uniform vec3 plasmaDir; uniform vec3 plasmaCouleur;
uniform vec3 ambiante;
uniform float suie; uniform float chauffe; uniform float temps; uniform float pas; uniform float balayage; uniform float croute;
varying vec3 vO; varying vec3 vN; varying vec3 vP;
${BRUIT}
float pastilles(vec2 p){
  vec2 r = vec2(1.0, 1.7320508), h = r * 0.5;
  vec2 a = mod(p, r) - h, b = mod(p - h, r) - h;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  return smoothstep(0.40, 0.16, length(g));
}
vec3 bosseler(vec3 N, vec3 P, float h){
  vec3 dpx = dFdx(P), dpy = dFdy(P);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
  float det = dot(dpx, r1);
  vec3 pente = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * N - pente);
}
vec3 eclairer(vec3 alb, vec3 N, vec3 Ng, vec3 V, vec3 L, vec3 C, float rug, float enveloppe){
  float ndl = max((dot(N, L) + enveloppe) / (1.0 + enveloppe), 0.0) * smoothstep(-0.12 - enveloppe, 0.10, dot(Ng, L));
  vec3 H = normalize(L + V);
  float ndh = max(dot(N, H), 0.0);
  float a2 = rug * rug * rug * rug;
  float dn = ndh * ndh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159265 * dn * dn);
  float F = 0.04 + 0.96 * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  return C * ndl * (alb + min(D * F * 0.25, 3.0));
}
void main(){
  vec3 o = vO;
  float s = o.z / ${DEMI.toFixed(1)};
  float r = length(o.xy);
  float u = atan(o.y, o.x) / 6.2831853 + 0.5;
  float dansPanneau = fract(u * 4.0) - 0.5;
  float largeur = 6.2831853 * r / 4.0;
  float dCouture = (0.5 - abs(dansPanneau)) * largeur;

  // Le relief : picots en nid d'abeilles, couture creusée entre deux lèvres, points de fil en travers.
  vec2 q = vec2(dansPanneau * largeur, o.z) / pas;
  float empreinte = fwidth(q.x) + fwidth(q.y);
  float grain = pastilles(q) * smoothstep(0.10, 0.24, dCouture) * smoothstep(1.1, 0.3, empreinte);
  float creux = smoothstep(0.070, 0.0, dCouture);
  float levre = smoothstep(0.17, 0.10, dCouture) * smoothstep(0.035, 0.10, dCouture);
  float maille = fract(o.z / 0.26) - 0.5;
  float fil = smoothstep(0.19, 0.13, abs(maille)) * smoothstep(0.185, 0.14, dCouture) * smoothstep(0.012, 0.03, dCouture + 0.02) * smoothstep(0.9, 0.3, fwidth(o.z / 0.26));
  float cuirFin = snoise(o * 9.0) * 0.0018;
  float h = grain * 0.016 + levre * 0.020 - creux * 0.055 + fil * 0.030 + cuirFin;
  // La croûte : tant que l'objet passe pour un astéroïde, une gangue de roche recouvre le cuir et sa couture.
  float roche = fbm(o * 0.55) * 0.55 + fbm(o * 1.9 + 4.0) * 0.26 + snoise(o * 6.5) * 0.07;
  h = mix(h, roche * 0.55, croute);

  vec3 Ng = normalize(vN);
  vec3 N = bosseler(Ng, vP, h);
  vec3 V = normalize(cameraPosition - vP);

  vec3 alb = texture2D(decor, vec2(u, s * 0.5 + 0.5)).rgb;
  alb *= 0.90 + 0.10 * snoise(o * 2.2) + 0.04 * snoise(o * 14.0);
  alb *= 0.84 + 0.22 * grain;
  alb = mix(alb, alb * 0.30, creux);
  alb = mix(alb, vec3(0.78, 0.73, 0.60), fil * 0.92);
  // La pointe qui ouvre la route roussit ; la suie couvre tout le reste tant que l'objet est un « astéroïde ».
  float nez = smoothstep(0.50, 1.0, s);
  vec3 calcine = vec3(0.045, 0.034, 0.030) * (0.75 + 0.5 * fbm3(o * 1.3));
  alb = mix(alb, calcine, max(suie, nez * 0.85 * chauffe));
  vec3 gangue = vec3(0.050, 0.043, 0.040) * (0.55 + 0.9 * (fbm3(o * 1.1 + 7.0) * 0.5 + 0.5)) * (0.75 + 0.5 * smoothstep(-0.2, 0.5, roche));
  alb = mix(alb, gangue, croute);

  float rug = mix(mix(0.46, 0.72, suie), 0.9, croute);
  vec3 couleur = alb * ambiante;
  couleur += eclairer(alb, N, Ng, V, soleil, soleilCouleur, rug, 0.0);
  couleur += eclairer(alb, N, Ng, V, terreDir, terreCouleur, rug, 0.35);
  couleur += eclairer(alb, N, Ng, V, plasmaDir, plasmaCouleur, rug, 0.25);
  // Le cuir chauffé à blanc sur la pointe.
  couleur += chauffe * pow(nez, 3.0) * vec3(3.2, 0.85, 0.16) * (0.55 + 0.45 * fbm3(o * 2.0 + vec3(0.0, 0.0, temps * 1.5)));
  // Le faisceau d'analyse du laboratoire : une bande de lumière froide qui parcourt la surface.
  float bande = exp(-pow((o.z - balayage) / 0.10, 2.0));
  couleur += bande * vec3(0.10, 0.9, 1.0) * 1.4 * step(-50.0, balayage);
  gl_FragColor = vec4(couleur, 1.0);
}`;

const PLASMA = /* glsl */`
uniform float temps; uniform float force; uniform vec3 teinte;
varying vec3 vO; varying vec3 vN; varying vec3 vP;
${BRUIT}
void main(){
  float rho = length(vO.xy);
  vec2 cs = rho > 0.001 ? vO.xy / rho : vec2(1.0, 0.0);
  vec3 V = normalize(cameraPosition - vP);
  float bord = pow(1.0 - abs(dot(normalize(vN), V)), 1.1);
  float stries = snoise(vec3(cs * 3.2, vO.z * 0.22 + temps * 6.5)) * 0.5 + 0.5;
  float flux = fbm3(vec3(cs * rho * 0.45, vO.z * 0.30 + temps * 4.0)) * 0.5 + 0.5;
  float fondu = smoothstep(${(RAYON * 2.05).toFixed(2)}, ${(RAYON * 0.6).toFixed(2)}, rho);
  float i = (0.30 + 0.70 * bord) * (0.15 + 0.85 * stries * (0.4 + 0.6 * flux)) * fondu * fondu * force;
  vec3 c = mix(teinte, vec3(1.0, 0.86, 0.62), smoothstep(${(RAYON * 0.9).toFixed(2)}, 0.0, rho));
  gl_FragColor = vec4(c * i * 1.5, 1.0);
}`;

const TRAINE = /* glsl */`
uniform float temps; uniform float force; uniform float fumee; uniform float longueur; uniform vec3 teinte;
varying vec3 vO; varying vec3 vN; varying vec3 vP;
${BRUIT}
void main(){
  float k = sat(-vO.z / longueur);
  float rho = length(vO.xy);
  vec2 cs = rho > 0.001 ? vO.xy / rho : vec2(1.0, 0.0);
  vec3 V = normalize(cameraPosition - vP);
  float coeur = pow(abs(dot(normalize(vN), V)), 2.4);
  float n = fbm(vec3(cs * 2.2, vO.z * 0.16 + temps * 5.5)) * 0.5 + 0.5;
  float filets = snoise(vec3(cs * 5.0, vO.z * 0.07 + temps * 8.0)) * 0.5 + 0.5;
  float meches = smoothstep(0.30, 0.85, filets * 0.75 + n * 0.45);
  float a = coeur * meches * pow(1.0 - k, 2.3) * smoothstep(0.0, 0.03, k);
  vec3 feu = mix(vec3(1.0, 0.80, 0.50), teinte, smoothstep(0.0, 0.25, k)) * mix(1.0, 0.25, smoothstep(0.2, 1.0, k));
  if (fumee > 0.5) {
    float dense = coeur * smoothstep(0.25, 0.9, n) * pow(1.0 - k, 1.4) * smoothstep(0.02, 0.12, k);
    gl_FragColor = vec4(mix(vec3(0.05, 0.035, 0.03), vec3(0.20, 0.11, 0.07), n) * 0.5, dense * force * 0.5);
  } else gl_FragColor = vec4(feu * a * force * 1.5, 1.0);
}`;

function nappe(profil, segments) {
  const g = new THREE.LatheGeometry(profil, segments);
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

export function creerBallon() {
  const uniformes = {
    decor: { value: decorBallon() },
    soleil: { value: new THREE.Vector3(1, 0, 0) }, soleilCouleur: { value: new THREE.Color(1.45, 1.38, 1.26) },
    terreDir: { value: new THREE.Vector3(0, 0, 1) }, terreCouleur: { value: new THREE.Color(0.10, 0.20, 0.42) },
    plasmaDir: { value: new THREE.Vector3(0, 0, 1) }, plasmaCouleur: { value: new THREE.Color(0, 0, 0) },
    ambiante: { value: new THREE.Color(0.012, 0.014, 0.02) },
    suie: { value: 0 }, chauffe: { value: 0 }, temps: { value: 0 }, pas: { value: 0.115 }, balayage: { value: -100 }, croute: { value: 0 },
  };
  const corps = new THREE.Mesh(geometrieBallon(), new THREE.ShaderMaterial({ uniforms: uniformes, vertexShader: SOMMETS, fragmentShader: CUIR }));

  // L'onde de choc : une coiffe parabolique posée devant la pointe, ouverte vers l'arrière.
  const profilChoc = [];
  for (let i = 0; i <= 60; i++) { const rho = RAYON * 2.05 * (i / 60); profilChoc.push(new THREE.Vector2(rho, DEMI + 0.75 - 0.20 * rho * rho)); }
  const uPlasma = { temps: uniformes.temps, force: { value: 0 }, teinte: { value: new THREE.Color(1.0, 0.30, 0.05) } };
  const choc = new THREE.Mesh(nappe(profilChoc, 96), new THREE.ShaderMaterial({
    uniforms: uPlasma, vertexShader: SOMMETS, fragmentShader: PLASMA, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));

  // La traîne : un cône qui s'évase derrière l'objet. Deux couches : le feu (additif) et, dans l'air, la fumée.
  const traine = (longueur, evasement, fumee) => {
    const profil = [];
    for (let i = 0; i <= 80; i++) { const k = i / 80; profil.push(new THREE.Vector2(RAYON * (1.02 + evasement * Math.pow(k, 0.7)), 1.5 - longueur * k)); }
    const u = { temps: uniformes.temps, force: { value: 0 }, fumee: { value: fumee ? 1 : 0 }, longueur: { value: longueur }, teinte: { value: new THREE.Color(1.0, 0.26, 0.04) } };
    const m = new THREE.Mesh(nappe(profil, 72), new THREE.ShaderMaterial({
      uniforms: u, vertexShader: SOMMETS, fragmentShader: TRAINE, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: fumee ? THREE.NormalBlending : THREE.AdditiveBlending,
    }));
    m.userData.u = u;
    return m;
  };
  const feu = traine(95, 0.75, false);
  const fumee = traine(150, 1.5, true);
  fumee.renderOrder = 1; feu.renderOrder = 2; choc.renderOrder = 3;

  // L'éclat de la pointe.
  const uEclat = { force: { value: 0 }, teinte: { value: new THREE.Color(1.0, 0.45, 0.12) } };
  const eclat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: uEclat,
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); c.xy += position.xy * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz)); gl_Position = projectionMatrix * c; }`,
    fragmentShader: /* glsl */`uniform float force; uniform vec3 teinte; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float g = exp(-r * 5.5) + exp(-r * 2.6) * 0.10; gl_FragColor = vec4(mix(teinte, vec3(1.0, 0.92, 0.8), exp(-r * 9.0)) * g * force * smoothstep(1.0, 0.6, r), 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  eclat.position.set(0, 0, DEMI + 0.4);
  eclat.scale.setScalar(RAYON * 4.2);
  eclat.renderOrder = 4;

  const tourne = new THREE.Group();       // la rotation propre du ballon (vrille, culbute)
  tourne.add(corps);
  const sillage = new THREE.Group();      // ce qui suit la trajectoire, pas la rotation
  sillage.add(choc, feu, fumee, eclat);
  const groupe = new THREE.Group();
  groupe.add(tourne, sillage);
  return { groupe, tourne, sillage, corps, choc, feu, fumee, eclat, uniformes, uPlasma, uFeu: feu.userData.u, uFumee: fumee.userData.u, uEclat };
}
