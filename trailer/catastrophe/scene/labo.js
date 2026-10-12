// LE LABORATOIRE — des scientifiques devant un mur d'écrans. L'écran central montre la VRAIE surface de l'objet :
// la scène d'espace est dessinée dans une texture (le plan macro, balayé par un faisceau d'analyse), puis traitée en
// image de sonde. Aucune forme d'ensemble n'apparaît : seulement le grain régulier et la couture.
import * as THREE from 'three';
import { tirage, tremblement, melange, adoucir } from './bruit.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

/** Un personnage debout, en une seule géométrie. `bras` : angles (rad) du bras gauche et droit vers l'avant. */
function personnage({ bras = [0.1, 0.1], tete = 0.25, taille = 1 }) {
  const morceaux = [];
  const poser = (geo, pivot, angle) => {
    const m = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(new THREE.Matrix4().makeRotationX(angle)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
    geo.applyMatrix4(m); morceaux.push(geo.toNonIndexed());
  };
  const capsule = (r, l, x, y, z) => { const c = new THREE.CapsuleGeometry(r, l, 3, 10); c.translate(x, y, z); return c; };
  poser(capsule(0.18, 0.44, 0, 1.18, 0), v(0, 0.9, 0), -0.04);
  const crane = new THREE.SphereGeometry(0.118, 14, 10); crane.translate(0, 1.67, 0.01);
  poser(crane, v(0, 1.5, 0), -tete);
  poser(capsule(0.055, 0.54, -0.26, 1.12, 0), v(-0.26, 1.42, 0), -bras[0]);
  poser(capsule(0.055, 0.54, 0.26, 1.12, 0), v(0.26, 1.42, 0), -bras[1]);
  poser(capsule(0.08, 0.74, -0.10, 0.45, 0), v(-0.10, 0.9, 0), 0);
  poser(capsule(0.08, 0.74, 0.10, 0.45, 0), v(0.10, 0.9, 0), 0);
  const total = morceaux.reduce((n, g) => n + g.getAttribute('position').count, 0);
  const P = new Float32Array(total * 3), N = new Float32Array(total * 3);
  let o = 0;
  for (const g of morceaux) { P.set(g.getAttribute('position').array, o * 3); N.set(g.getAttribute('normal').array, o * 3); o += g.getAttribute('position').count; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.scale(taille, taille, taille);
  return g;
}

/** Un écran de données, redessiné à chaque image : oscillogramme, trame de points réguliers, barres, chiffres. */
function ecranDonnees(variante) {
  const toile = document.createElement('canvas');
  toile.width = 512; toile.height = 640;
  const c = toile.getContext('2d');
  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  const h = tirage(77 + variante * 13);
  const barres = Array.from({ length: 22 }, () => h());
  function dessiner(t) {
    c.fillStyle = '#020a10'; c.fillRect(0, 0, 512, 640);
    c.strokeStyle = 'rgba(40, 200, 220, .22)'; c.lineWidth = 1;
    for (let x = 0; x <= 512; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 640); c.stroke(); }
    for (let y = 0; y <= 640; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
    c.fillStyle = '#ff9d2e'; c.font = "700 30px 'Archivo', sans-serif";
    c.fillText(variante === 0 ? 'Ø 800 KM' : 'Δ 10,4 KM', 22, 46);
    c.fillStyle = '#7ef3ff'; c.font = "600 20px 'Archivo', sans-serif";
    c.fillText(variante === 0 ? `${(7.2 - 0.03 * t).toFixed(2)} · 10⁴ KM/H` : `σ ${(0.0004 + 0.0001 * Math.sin(t * 3)).toFixed(4)}`, 22, 76);
    if (variante === 0) {
      // Un signal trop régulier pour être naturel.
      c.strokeStyle = '#35e9ff'; c.lineWidth = 3; c.beginPath();
      for (let x = 0; x <= 512; x += 4) { const y = 190 + Math.sin(x * 0.11 + t * 6) * 46 * (0.75 + 0.25 * Math.sin(x * 0.011 + t)) ; if (x) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      barres.forEach((b, i) => { const hb = 40 + (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.9 + b * 6)) * 150; c.fillStyle = i % 5 === 2 ? '#ff9d2e' : 'rgba(53, 233, 255, .75)'; c.fillRect(24 + i * 21.5, 560 - hb, 13, hb); });
      c.fillStyle = '#eaffff'; c.font = "800 64px 'Archivo', sans-serif"; c.fillText('99,98 %', 22, 340);
    } else {
      // La trame de la surface : des points en quinconce, aux distances rigoureusement égales.
      const pas = 46, decal = (t * 14) % pas;
      for (let ligne = 0; ligne < 12; ligne++) for (let col = -1; col < 13; col++) {
        const x = col * pas + (ligne % 2 ? pas / 2 : 0) - decal + 20, y = 120 + ligne * pas * 0.866;
        c.fillStyle = 'rgba(53, 233, 255, .85)'; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = '#ff9d2e'; c.lineWidth = 3;
      const x0 = 3 * pas - decal + 20, y0 = 120 + 4 * pas * 0.866;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + pas, y0); c.lineTo(x0 + pas / 2, y0 + pas * 0.866); c.closePath(); c.stroke();
      c.strokeStyle = 'rgba(255, 157, 46, .55)'; c.beginPath(); c.arc(x0 + pas / 2, y0 + pas * 0.29, 70 + 6 * Math.sin(t * 5), 0, Math.PI * 2); c.stroke();
    }
    texture.needsUpdate = true;
  }
  return { texture, dessiner };
}

export function creerLabo(largeur, espace, moteur) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.1, 200);
  const cibleSonde = new THREE.WebGLRenderTarget(468, 832, { type: THREE.HalfFloatType, samples: 4 });

  const sombre = new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.78, metalness: 0.1 });
  const solMatiere = new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.28, metalness: 0.65 });
  const piece = new THREE.Group();
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), solMatiere); sol.rotation.x = -Math.PI / 2;
  const fond = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), sombre); fond.position.set(0, 7, -8.2);
  const plafond = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), sombre); plafond.rotation.x = Math.PI / 2; plafond.position.y = 9;
  piece.add(sol, fond, plafond);

  // Le mur d'écrans : la sonde au centre, les données de part et d'autre.
  const uSonde = { flux: { value: cibleSonde.texture }, temps: { value: 0 } };
  const sonde = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 8.2), new THREE.ShaderMaterial({
    uniforms: uSonde,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D flux; uniform float temps; varying vec2 vUv;
      float lum(vec2 p){ return dot(texture2D(flux, p).rgb, vec3(0.30, 0.59, 0.11)); }
      void main(){
        vec2 px = vec2(1.0 / 468.0, 1.0 / 832.0);
        float l = lum(vUv);
        float bord = clamp(length(vec2(lum(vUv + vec2(px.x, 0.0)) - l, lum(vUv + vec2(0.0, px.y)) - l)) * 26.0, 0.0, 1.0);
        vec3 c = vec3(0.02, 0.36, 0.44) * l * 3.0 + vec3(0.25, 1.0, 0.95) * bord;
        c *= 0.86 + 0.14 * sin(vUv.y * 832.0 * 1.6);
        vec2 g = abs(fract(vUv * vec2(5.0, 9.0)) - 0.5);
        c += vec3(0.04, 0.26, 0.30) * smoothstep(0.488, 0.5, max(g.x, g.y)) * 0.7;
        vec2 q = (vUv - vec2(0.5, 0.52)) * vec2(0.5625, 1.0);
        float r = length(q);
        float viseur = smoothstep(0.0035, 0.0, abs(r - 0.17)) + smoothstep(0.003, 0.0, abs(r - 0.105)) * step(0.5, fract(atan(q.y, q.x) * 1.9099 + temps * 0.35));
        viseur += (smoothstep(0.002, 0.0, abs(q.x)) + smoothstep(0.002, 0.0, abs(q.y))) * step(0.19, r) * step(r, 0.24);
        c += vec3(1.0, 0.52, 0.12) * viseur * 1.3;
        c += vec3(0.2, 0.9, 1.0) * exp(-pow((vUv.y - fract(temps * 0.31)) * 46.0, 2.0)) * 0.30;
        c *= smoothstep(0.0, 0.03, vUv.x) * smoothstep(1.0, 0.97, vUv.x) * smoothstep(0.0, 0.02, vUv.y) * smoothstep(1.0, 0.98, vUv.y);
        gl_FragColor = vec4(c * 0.85, 1.0);
      }`,
  }));
  sonde.position.set(0, 4.7, -8.0);
  const donnees = [ecranDonnees(0), ecranDonnees(1)];
  const panneaux = [
    [donnees[0], -4.4, 6.2, 0.36, 3.2], [donnees[1], 4.4, 6.2, -0.36, 3.2], [donnees[1], -4.5, 2.4, 0.36, 2.6], [donnees[0], 4.5, 2.4, -0.36, 2.6],
  ].map(([d, x, y, tourne, l]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(l, l * 1.25), new THREE.MeshBasicMaterial({ map: d.texture, color: new THREE.Color(0.95, 0.95, 0.95) }));
    m.position.set(x, y, -7.6); m.rotation.y = tourne;
    return m;
  });
  const cadre = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 8.5), new THREE.MeshBasicMaterial({ color: 0x010203 })); cadre.position.set(0, 4.7, -8.05);
  piece.add(cadre, sonde, ...panneaux);

  // Les pupitres et leurs moniteurs.
  const h = tirage(31);
  for (const [x, z, tourne] of [[-2.6, -2.9, 0.22], [0.2, -3.3, 0], [2.9, -2.9, -0.22], [-4.6, -1.2, 0.5], [4.8, -1.3, -0.5]]) {
    const pupitre = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.92, 0.85), sombre); pupitre.position.set(x, 0.46, z); pupitre.rotation.y = tourne;
    const moniteur = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.5), new THREE.MeshBasicMaterial({ map: donnees[h() < 0.5 ? 0 : 1].texture, color: new THREE.Color(0.8, 0.8, 0.8) }));
    moniteur.position.set(x + 0.35 * Math.cos(tourne), 1.30, z + 0.05); moniteur.rotation.set(-0.16, tourne + Math.PI, 0);
    const dos = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.54, 0.04), sombre); dos.position.copy(moniteur.position).add(v(0, 0, 0.03)); dos.rotation.copy(moniteur.rotation);
    piece.add(pupitre, dos, moniteur);
  }

  // Les scientifiques, de dos, tournés vers le mur.
  const blouse = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.85 });
  const costume = new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.8 });
  for (const [x, z, cap, pose, matiere] of [
    [0.42, 0.35, 0.06, { bras: [0.15, 1.75], tete: 0.38, taille: 1.02 }, blouse],
    [1.72, 0.95, -0.10, { bras: [0.5, 0.5], tete: 0.42, taille: 0.97 }, costume],
    [-1.6, -0.6, 0.15, { bras: [0.3, 0.3], tete: 0.4, taille: 1.0 }, costume],
    [2.65, -1.75, -0.30, { bras: [0.1, 0.1], tete: 0.34, taille: 1.0 }, blouse],
    [-3.3, -2.0, 0.35, { bras: [0.9, 0.9], tete: 0.2, taille: 0.95 }, costume],
  ]) {
    const corps = new THREE.Mesh(personnage(pose), matiere);
    corps.position.set(x, 0, z); corps.rotation.y = Math.PI + cap;
    piece.add(corps);
  }

  const lueur = new THREE.PointLight(0x4fe9ff, 34, 40, 1.6); lueur.position.set(0, 4.8, -6.2);
  const lueurBasse = new THREE.PointLight(0x39d6f0, 7, 18, 1.8); lueurBasse.position.set(0, 1.4, -5.0);
  const ambre = new THREE.PointLight(0xff8a2a, 5, 14, 2); ambre.position.set(-4.5, 2.6, 2.5);
  scene.add(piece, lueur, lueurBasse, ambre, new THREE.AmbientLight(0x0a1420, 0.6));

  function salle(k, t) {
    // 1. Le flux de la sonde : le plan macro de l'espace, avec le faisceau d'analyse qui remonte la surface.
    const macro = espace.plans.macro(melange(0.10, 0.42, k), t);
    espace.ballon.uniformes.balayage.value = -1.2 + ((t * 0.9) % 2.6);
    espace.ballon.uniformes.suie.value = 0.35;
    moteur.setRenderTarget(cibleSonde); moteur.setClearColor(0x000000, 1); moteur.clear();
    moteur.render(macro.scene, macro.camera);
    moteur.setRenderTarget(null);
    // 2. La salle.
    uSonde.temps.value = t;
    donnees.forEach(d => d.dessiner(t));
    lueur.intensity = 34 + 4 * Math.sin(t * 9.0) + 2.5 * Math.sin(t * 23.0);
    const e = adoucir(k);
    camera.fov = 52; camera.updateProjectionMatrix();
    camera.position.set(melange(1.9, 1.25, e), melange(1.62, 1.70, e), melange(4.6, 3.5, e));
    camera.up.set(0, 1, 0);
    camera.lookAt(melange(-0.3, 0.0, e), melange(3.0, 3.7, e), -8);
    const s = tremblement(t, 11);
    camera.rotateX(s.y * 0.0015); camera.rotateY(s.x * 0.0015); camera.rotateZ(-0.02 + 0.03 * e);
    camera.updateMatrixWorld();
    return { scene, camera, bloom: [0.35, 0.6, 0.9], vignette: 0.95, grain: 0.055, aberration: 0.5, exposition: 1.0, saturation: 0.95 };
  }
  return { scene, camera, plans: { salle } };
}
