// LES DÉCORS DE L'ENQUÊTE — quatre plateaux de faux documentaire criminel, en vraie 3D :
//   la salle des écrans (où l'homme disparaît de l'image), l'alignement des quinze suspects, le tableau d'indices,
//   la pelouse de la police scientifique (cavaliers numérotés, contours à la craie, traces de crampons).
// Rien ne dit « rugby » avant la chute — mais tout y est : quinze suspects numérotés de 1 à 15 et bâtis comme une équipe,
// un terrain de 100 m sur 70, des crampons dans l'herbe, trois défenseurs laissés sur place.
// Chaque plan est une fonction du temps (k de 0 à 1 dans le plan, t en secondes) : l'image se redessine à l'identique.
import * as THREE from 'three';
import { tirage, tremblement, melange, adoucir, lisser, borner } from '../../catastrophe/scene/bruit.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const POLICE = "'Archivo', 'Segoe UI', sans-serif";

/** Une toile 2D devenue texture. */
function toile(l, h, dessiner, couleur = true) {
  const c = document.createElement('canvas'); c.width = l; c.height = h;
  const x = c.getContext('2d');
  dessiner(x, l, h);
  const t = new THREE.CanvasTexture(c);
  if (couleur) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return Object.assign(t, { crayon: x, largeur: l, hauteur: h });
}

/** Un personnage debout, en une seule géométrie. `carrure` élargit les épaules et le buste, `taille` est en mètres. */
function personnage({ bras = [0.08, 0.08], tete = 0, taille = 1.8, carrure = 1 }) {
  const morceaux = [];
  const poser = (geo, pivot, angle) => {
    const m = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(new THREE.Matrix4().makeRotationX(angle)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
    geo.applyMatrix4(m); morceaux.push(geo.toNonIndexed());
  };
  const capsule = (r, l, x, y, z) => { const c = new THREE.CapsuleGeometry(r, l, 3, 10); c.translate(x, y, z); return c; };
  const buste = capsule(0.18, 0.44, 0, 1.18, 0); buste.scale(carrure, 1, 0.82 + 0.3 * (carrure - 1));
  poser(buste, v(0, 0.9, 0), -0.03);
  const crane = new THREE.SphereGeometry(0.118, 14, 10); crane.translate(0, 1.67, 0.01);
  poser(crane, v(0, 1.5, 0), -tete);
  const epaule = 0.26 * carrure;
  poser(capsule(0.058 * (0.8 + 0.25 * carrure), 0.54, -epaule, 1.12, 0), v(-epaule, 1.42, 0), -bras[0]);
  poser(capsule(0.058 * (0.8 + 0.25 * carrure), 0.54, epaule, 1.12, 0), v(epaule, 1.42, 0), -bras[1]);
  poser(capsule(0.085 * (0.85 + 0.2 * carrure), 0.74, -0.11 * carrure, 0.45, 0), v(-0.11, 0.9, 0), 0);
  poser(capsule(0.085 * (0.85 + 0.2 * carrure), 0.74, 0.11 * carrure, 0.45, 0), v(0.11, 0.9, 0), 0);
  const total = morceaux.reduce((n, g) => n + g.getAttribute('position').count, 0);
  const P = new Float32Array(total * 3), N = new Float32Array(total * 3);
  let o = 0;
  for (const g of morceaux) { P.set(g.getAttribute('position').array, o * 3); N.set(g.getAttribute('normal').array, o * 3); o += g.getAttribute('position').count; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  const k = taille / 1.79;
  g.scale(k, k, k);
  return g;
}

export function creerEnquete({ langue, heure, date }) {
  const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.05, 200);
  const reperes = { disparition: 3 };                       // l'instant du mot « disparu » : la silhouette s'efface dessus
  const sombre = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.8, metalness: 0.1 });
  const h = tirage(1210);
  function viser(pos, cible, t, secousse = 0.0015, roulis = 0, fov = 50, haut = v(0, 1, 0)) {
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.position.copy(pos); camera.up.copy(haut); camera.lookAt(cible);
    const s = tremblement(t, 21);
    camera.rotateX(s.y * secousse); camera.rotateY(s.x * secousse); camera.rotateZ(roulis + s.r * secousse * 0.6);
    camera.updateMatrixWorld();
  }

  // ══ 1. LA SALLE DES ÉCRANS ═══════════════════════════════════════════════════════════════════════════════
  const salle = new THREE.Scene();
  {
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.3, metalness: 0.6 })); sol.rotation.x = -Math.PI / 2;
    const mur = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), sombre); mur.position.set(0, 6, -4.3);
    salle.add(sol, mur);
  }
  // L'image de la caméra 9 : un homme seul dans un rond de lumière. À l'instant dit, la bande saute, et il n'y est plus.
  const flux = toile(540, 720, () => {});
  function dessinerFlux(t) {
    const c = flux.crayon, L = 540, H = 720;
    const depuis = t - reperes.disparition;
    const saut = depuis > -0.05 && depuis < 0.28;                // la bande qui saute
    c.fillStyle = '#04100a'; c.fillRect(0, 0, L, H);
    const rond = c.createRadialGradient(270, 500, 10, 270, 500, 300);
    rond.addColorStop(0, 'rgba(150, 230, 170, .85)'); rond.addColorStop(0.45, 'rgba(60, 130, 85, .55)'); rond.addColorStop(1, 'rgba(4, 16, 10, 0)');
    c.save(); c.translate(0, 360); c.scale(1, 0.42); c.translate(0, -360); c.fillStyle = rond; c.fillRect(0, -400, L, 1800); c.restore();
    // Les bandes tondues du sol : on les devine à peine.
    c.globalAlpha = 0.10; c.fillStyle = '#bfffd0';
    for (let k = -3; k < 6; k++) { c.beginPath(); c.moveTo(k * 150 - 200, 720); c.lineTo(k * 150 - 110, 720); c.lineTo(k * 60 + 215, 380); c.lineTo(k * 60 + 180, 380); c.fill(); }
    c.globalAlpha = 1;
    const presence = depuis < 0 ? 1 : depuis < 0.28 ? (Math.sin(t * 190) > 0 ? 0.7 : 0.15) : 0;
    if (presence > 0) {
      const x = 270 + Math.sin(t * 1.3) * 2 + (saut ? Math.sin(t * 310) * 26 : 0), y = 500;
      c.globalAlpha = presence;
      c.fillStyle = 'rgba(4, 14, 9, .55)'; c.beginPath(); c.ellipse(x + 26, y + 6, 62, 15, 0, 0, Math.PI * 2); c.fill();   // l'ombre
      c.fillStyle = '#e9fff0';
      c.beginPath(); c.arc(x, y - 208, 21, 0, Math.PI * 2); c.fill();                                                         // la tête
      c.beginPath(); c.moveTo(x - 44, y - 178); c.quadraticCurveTo(x, y - 196, x + 44, y - 178); c.lineTo(x + 34, y - 92); c.lineTo(x - 34, y - 92); c.closePath(); c.fill();
      c.fillRect(x - 31, y - 95, 26, 92); c.fillRect(x + 5, y - 95, 26, 92);
      c.fillRect(x - 58, y - 172, 15, 84); c.fillRect(x + 43, y - 172, 15, 84);
      c.globalAlpha = 1;
    } else {
      // Ce qu'il reste : une place vide, que la caméra continue de filmer.
      c.strokeStyle = `rgba(233, 255, 240, ${(0.5 * Math.exp(-(depuis - 0.28) * 2.2)).toFixed(3)})`; c.lineWidth = 3; c.setLineDash([10, 12]);
      c.beginPath(); c.ellipse(270, 500, 64, 20, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    }
    // Neige, lignes de balayage, déchirures.
    c.fillStyle = 'rgba(180, 255, 200, .05)';
    for (let k = 0; k < 150; k++) { const a = Math.sin(k * 91.7 + Math.floor(t * 30) * 13.1) * 43758.5; c.fillRect((a - Math.floor(a)) * L, ((a * 7.3) - Math.floor(a * 7.3)) * H, 3, 2); }
    c.fillStyle = 'rgba(0, 0, 0, .22)'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, L, 2);
    c.fillStyle = 'rgba(190, 255, 210, .09)'; c.fillRect(0, ((t * 130) % (H + 80)) - 80, L, 60);
    if (saut) for (let k = 0; k < 7; k++) { const y = (Math.sin(k * 12.9 + Math.floor(t * 60) * 7.7) * 0.5 + 0.5) * H; c.drawImage(flux.image, 0, y, L, 22, Math.sin(k * 3.1 + t * 400) * 46, y, L, 22); }
    // L'habillage de la caméra de surveillance.
    c.fillStyle = '#eafff0'; c.font = `700 30px ${POLICE}`; c.textBaseline = 'top';
    c.fillText('CAM 09', 26, 24);
    const secondes = 7 + Math.max(0, Math.min(52, t - reperes.disparition + 3));
    c.fillText(`${date}   ${heure.replace(/(\d+:\d+)/, `$1:${String(Math.floor(secondes)).padStart(2, '0')}`)}`, 26, H - 58);
    if (Math.floor(t * 2) % 2 === 0) { c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(L - 44, 40, 11, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#eafff0'; c.textAlign = 'right'; c.fillText('REC', L - 66, 24); c.textAlign = 'left';
    flux.needsUpdate = true;
  }
  // Les autres caméras : des couloirs vides.
  const voisines = [0, 1, 2].map(variante => toile(360, 270, (c, L, H) => {
    c.fillStyle = '#050f0a'; c.fillRect(0, 0, L, H);
    c.strokeStyle = 'rgba(150, 230, 170, .35)'; c.lineWidth = 2;
    const fx = L * (0.35 + 0.15 * variante), fy = H * 0.42;
    for (const [x, y] of [[0, 0], [L, 0], [0, H], [L, H]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(fx, fy); c.stroke(); }
    for (const k of [0.25, 0.5, 0.72]) c.strokeRect(fx - fx * k, fy - fy * k, L * k, H * k);
    c.fillStyle = 'rgba(0, 0, 0, .25)'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, L, 2);
    c.fillStyle = '#d6ffe0'; c.font = `700 22px ${POLICE}`; c.fillText(`CAM 0${[3, 5, 7][variante]}`, 14, 30);
  }));
  const uSalle = { eclat: 1 };
  const ecrans = [];
  {
    const cadre = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5, metalness: 0.5 });
    const poste = (texture, x, y, l, ht) => {
      const boite = new THREE.Mesh(new THREE.BoxGeometry(l + 0.14, ht + 0.14, 0.3), cadre); boite.position.set(x, y, -4.05);
      const dalle = new THREE.Mesh(new THREE.PlaneGeometry(l, ht), new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color(texture === flux ? 2.3 : 1.5, texture === flux ? 2.3 : 1.5, texture === flux ? 2.3 : 1.5) })); dalle.position.set(x, y, -3.89);
      salle.add(boite, dalle); ecrans.push(dalle);
      return dalle;
    };
    poste(flux, 0, 2.55, 1.5, 2.0);                               // la caméra 9, au centre
    let k = 0;
    for (const x of [-1.85, 1.85]) for (const y of [1.3, 2.55, 3.8]) poste(voisines[k++ % 3], x, y, 1.48, 1.1);
    poste(voisines[1], 0, 4.3, 1.48, 1.1); poste(voisines[2], 0, 0.9, 1.48, 1.0);
    // Deux enquêteurs devant le mur, de dos, et un pupitre sous une lampe.
    const costume = new THREE.MeshStandardMaterial({ color: 0x101319, roughness: 0.85 });
    for (const [x, z, cap, pose] of [[-0.95, -0.9, 0.12, { bras: [0.15, 0.9], tete: 0.3, taille: 1.84 }], [1.15, -0.4, -0.16, { bras: [0.5, 0.5], tete: 0.34, taille: 1.72 }]]) {
      const corps = new THREE.Mesh(personnage(pose), costume); corps.position.set(x, 0, z); corps.rotation.y = Math.PI + cap; salle.add(corps);
    }
    const pupitre = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.8), sombre); pupitre.position.set(0.1, 0.45, -2.6); salle.add(pupitre);
  }
  const lueurEcrans = new THREE.PointLight(0x7dffb0, 34, 30, 1.7); lueurEcrans.position.set(0, 2.7, -2.4);
  const lampe = new THREE.PointLight(0xffa24a, 3.2, 9, 2); lampe.position.set(-2.6, 1.5, -1.6);
  salle.add(lueurEcrans, lampe, new THREE.AmbientLight(0x1c2a24, 1.3));

  function ecransPlan(k, t) {
    dessinerFlux(t);
    lueurEcrans.intensity = 34 + 3.5 * Math.sin(t * 11) + 2.0 * Math.sin(t * 27);
    const e = adoucir(k);
    viser(v(melange(1.3, 0.7, e), melange(1.62, 1.72, e), melange(4.4, 2.6, e)), v(0, melange(2.3, 2.5, e), -4), t, 0.0018, -0.015, 52);
    return { scene: salle, camera, bloom: [0.45, 0.6, 0.9], vignette: 1.0, grain: 0.07, aberration: 0.6, exposition: 1.25, saturation: 0.9 };
  }
  function disparitionPlan(k, t) {
    dessinerFlux(t);
    const depuis = t - reperes.disparition;
    lueurEcrans.intensity = 34 + (depuis > -0.05 && depuis < 0.28 ? 22 * Math.abs(Math.sin(t * 90)) : 0);
    const e = adoucir(k);
    viser(v(melange(0.34, 0.06, e), melange(2.32, 2.52, e), melange(-0.5, -1.9, e)), v(0, 2.55, -4), t, 0.0016 + (depuis > 0 && depuis < 0.3 ? 0.012 : 0), melange(-0.03, 0.01, e), 50);
    return { scene: salle, camera, bloom: [0.5, 0.6, 0.85], vignette: 1.0, grain: 0.08, aberration: 0.7 + (depuis > 0 && depuis < 0.3 ? 3 : 0), exposition: 1.05, saturation: 0.9,
      flash: depuis > 0 && depuis < 0.1 ? 0.05 : 0 };
  }

  // ══ 2. L'ALIGNEMENT DES QUINZE SUSPECTS ═════════════════════════════════════════════════════════════════
  const parade = new THREE.Scene();
  const PAS = 0.98;
  // Bâtis comme une équipe : trois larges devant, deux très grands, puis les plus fins — et le petit numéro 9.
  const GABARITS = [[1.86, 1.30], [1.82, 1.22], [1.88, 1.34], [2.02, 1.12], [2.04, 1.12], [1.92, 1.10], [1.90, 1.08], [1.95, 1.14], [1.70, 0.90], [1.81, 0.95], [1.84, 0.95], [1.88, 1.06], [1.86, 1.02], [1.80, 0.94], [1.88, 0.98]];
  {
    // Le mur des tailles : une ligne tous les dix centimètres.
    const murTailles = toile(2048, 512, (c, L, H) => {
      c.fillStyle = '#c9c6bd'; c.fillRect(0, 0, L, H);
      for (let cm = 100; cm <= 220; cm += 10) {
        const y = H - (cm / 240) * H;
        c.fillStyle = cm % 20 === 0 ? '#1a1a1a' : 'rgba(26, 26, 26, .45)'; c.fillRect(0, y, L, cm % 20 === 0 ? 5 : 2);
        if (cm % 20 === 0) { c.fillStyle = '#1a1a1a'; c.font = `800 30px ${POLICE}`; for (let x = 40; x < L; x += 410) c.fillText(String(cm), x, y - 8); }
      }
    });
    murTailles.wrapS = THREE.RepeatWrapping; murTailles.repeat.set(4, 1);
    const mur = new THREE.Mesh(new THREE.PlaneGeometry(26, 2.4), new THREE.MeshStandardMaterial({ map: murTailles, roughness: 0.9 })); mur.position.set(7, 1.2, -0.55);
    const haut = new THREE.Mesh(new THREE.PlaneGeometry(26, 4), sombre); haut.position.set(7, 4.4, -0.56);
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.45, metalness: 0.3 })); sol.rotation.x = -Math.PI / 2; sol.position.set(7, 0, 3);
    parade.add(mur, haut, sol);
    const habit = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.8 });
    GABARITS.forEach(([taille, carrure], i) => {
      const x = i * PAS;
      const corps = new THREE.Mesh(personnage({ taille, carrure, bras: [0.62, 0.62], tete: 0 }), habit); corps.position.set(x, 0, 0); parade.add(corps);
      // L'ardoise tenue devant la poitrine : son numéro.
      const ardoise = toile(256, 192, (c, L, H) => {
        c.fillStyle = '#0d0d0f'; c.fillRect(0, 0, L, H); c.strokeStyle = '#e8e4d8'; c.lineWidth = 8; c.strokeRect(6, 6, L - 12, H - 12);
        c.fillStyle = '#f2efe6'; c.font = `800 128px ${POLICE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), L / 2, H / 2 + 8);
      });
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.30), new THREE.MeshStandardMaterial({ map: ardoise, roughness: 0.7 }));
      plaque.position.set(x, taille * 0.635, 0.30 + 0.05 * carrure); plaque.rotation.x = -0.12; parade.add(plaque);
    });
  }
  const projecteurs = [];
  for (let i = 0; i < 6; i++) { const p = new THREE.SpotLight(0xfff1dc, 19, 12, 0.55, 0.7, 1.4); p.position.set(i * 2.9 - 0.4, 4.2, 2.6); p.target.position.set(i * 2.9 - 0.4, 1.0, -0.2); parade.add(p, p.target); projecteurs.push(p); }
  parade.add(new THREE.AmbientLight(0x3a4254, 1.1));

  function suspectsPlan(k, t) {
    const e = adoucir(k);
    // Le néon qui grésille.
    projecteurs.forEach((p, i) => { p.intensity = 19 * (Math.sin(t * 37 + i * 2.1) > 0.93 ? 0.55 : 1); });
    viser(v(melange(-1.55, 2.4, e), melange(1.36, 1.48, e), melange(1.85, 2.5, e)), v(melange(3.6, 9.5, e), 1.34, 0.1), t, 0.002, melange(0.02, -0.01, e), 54);
    return { scene: parade, camera, bloom: [0.20, 0.5, 0.97], vignette: 1.0, grain: 0.075, aberration: 0.5, exposition: 0.9, saturation: 0.55, teinte: [0.96, 1.0, 1.05] };
  }

  // ══ 3. LE TABLEAU D'INDICES ══════════════════════════════════════════════════════════════════════════════
  const bureau = new THREE.Scene();
  {
    const liege = toile(1024, 1365, (c, L, H) => {
      c.fillStyle = '#7a5a36'; c.fillRect(0, 0, L, H);
      for (let k = 0; k < 9000; k++) { c.fillStyle = `rgba(${40 + h() * 90}, ${28 + h() * 60}, ${12 + h() * 30}, ${0.10 + h() * 0.25})`; c.fillRect(h() * L, h() * H, 2 + h() * 5, 2 + h() * 4); }
      const feuille = (x, y, l, ht, angle, dessin, fond = '#f1ede2') => {
        c.save(); c.translate(x, y); c.rotate(angle);
        c.shadowColor = 'rgba(0, 0, 0, .55)'; c.shadowBlur = 22; c.shadowOffsetY = 9;
        c.fillStyle = fond; c.fillRect(-l / 2, -ht / 2, l, ht); c.shadowColor = 'transparent';
        dessin(l, ht); c.restore();
      };
      const punaise = (x, y) => { c.fillStyle = '#c21d1d'; c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255, 255, 255, .45)'; c.beginPath(); c.arc(x - 4, y - 4, 4, 0, Math.PI * 2); c.fill(); };
      // Le plan des lieux : un rectangle de 100 m sur 70, quinze croix, et le trajet du disparu qui passe entre elles.
      feuille(512, 760, 620, 760, -0.02, (l, ht) => {
        c.strokeStyle = '#24323a'; c.lineWidth = 5; c.strokeRect(-l / 2 + 60, -ht / 2 + 70, l - 120, ht - 150);
        c.lineWidth = 2; c.setLineDash([14, 10]);
        for (const y of [-ht / 2 + 70 + (ht - 150) * 0.22, 0 - 5, -ht / 2 + 70 + (ht - 150) * 0.78]) { c.beginPath(); c.moveTo(-l / 2 + 60, y); c.lineTo(l / 2 - 60, y); c.stroke(); }
        c.setLineDash([]);
        const croix = [[-170, -210], [-90, -230], [-10, -215], [70, -235], [150, -205], [-200, -120], [-110, -105], [-25, -125], [60, -100], [150, -120], [-150, -20], [-60, 5], [40, -15], [130, 10], [0, 95]];
        c.strokeStyle = '#24323a'; c.lineWidth = 4;
        for (const [x, y] of croix) { c.beginPath(); c.moveTo(x - 9, y - 9); c.lineTo(x + 9, y + 9); c.moveTo(x + 9, y - 9); c.lineTo(x - 9, y + 9); c.stroke(); }
        c.strokeStyle = '#c21d1d'; c.lineWidth = 6; c.lineJoin = 'round'; c.beginPath();
        [[-30, 250], [-10, 150], [70, 60], [-5, -50], [-70, -110], [20, -170], [-45, -220], [-20, -300]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
        c.fillStyle = '#c21d1d'; c.font = `800 44px ${POLICE}`; c.textAlign = 'center'; c.fillText('?', -20, -318);
        c.fillStyle = '#24323a'; c.font = `700 30px ${POLICE}`; c.fillText('100 m × 70 m', 0, ht / 2 - 34);
      });
      // La dernière image connue.
      feuille(250, 250, 300, 360, -0.09, (l, ht) => {
        c.fillStyle = '#16211b'; c.fillRect(-l / 2 + 18, -ht / 2 + 18, l - 36, ht - 90);
        c.fillStyle = 'rgba(214, 255, 224, .8)'; c.beginPath(); c.arc(0, -70, 30, 0, Math.PI * 2); c.fill(); c.fillRect(-50, -34, 100, 130);
        c.filter = 'blur(6px)'; c.fillStyle = 'rgba(22, 33, 27, .65)'; c.fillRect(-l / 2 + 18, -ht / 2 + 18, l - 36, ht - 90); c.filter = 'none';
        c.fillStyle = '#24323a'; c.font = `800 34px ${POLICE}`; c.textAlign = 'center'; c.fillText('CAM 09', 0, ht / 2 - 30);
      });
      const note = (x, y, angle, texte, fond, corps = 76) => feuille(x, y, 250, 220, angle, () => { c.fillStyle = '#1b1b1b'; c.font = `800 ${corps}px ${POLICE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(texte, 0, 6); }, fond);
      note(770, 215, 0.07, heure, '#f6d75a', heure.length > 5 ? 54 : 78);
      note(800, 1190, -0.06, '15', '#f6d75a', 110);
      note(225, 1215, 0.05, langue === 'en' ? '80,000' : '80 000', '#f2a65a', 62);
      // Les fils rouges.
      c.strokeStyle = '#b8161a'; c.lineWidth = 5; c.shadowColor = 'rgba(0, 0, 0, .5)'; c.shadowBlur = 6; c.shadowOffsetY = 4;
      for (const [a, b] of [[[250, 90], [770, 120]], [[770, 120], [512, 400]], [[250, 90], [512, 400]], [[512, 1120], [800, 1090]], [[512, 1120], [225, 1115]]]) { c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }
      c.shadowColor = 'transparent';
      for (const [x, y] of [[250, 90], [770, 120], [512, 400], [512, 1120], [800, 1090], [225, 1115]]) punaise(x, y);
    });
    const panneau = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 4.0), new THREE.MeshStandardMaterial({ map: liege, roughness: 0.92 })); panneau.position.set(0, 2.35, -2.0);
    const cadre = new THREE.Mesh(new THREE.BoxGeometry(3.16, 4.16, 0.08), new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.7 })); cadre.position.set(0, 2.35, -2.05);
    const mur = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshStandardMaterial({ color: 0x161a1f, roughness: 0.95 })); mur.position.set(0, 3, -2.1);
    bureau.add(mur, cadre, panneau);
    const epaule = new THREE.Mesh(personnage({ taille: 1.85, carrure: 1.1, bras: [0.1, 1.9], tete: 0.2 }), new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.9 }));
    epaule.position.set(-1.25, 0, -0.75); epaule.rotation.y = Math.PI - 0.5; bureau.add(epaule);
  }
  const lampeBureau = new THREE.SpotLight(0xffd9a0, 12, 14, 0.62, 0.8, 1.3); lampeBureau.position.set(1.4, 4.4, 1.4); lampeBureau.target.position.set(0, 2.3, -2); bureau.add(lampeBureau, lampeBureau.target);
  bureau.add(new THREE.AmbientLight(0x202838, 1.0));

  function tableauPlan(k, t) {
    const e = adoucir(k);
    lampeBureau.intensity = 12 * (1 + 0.05 * Math.sin(t * 13) + (Math.sin(t * 5.3) > 0.985 ? -0.4 : 0));
    lampeBureau.target.position.set(melange(-0.5, 0.15, e), melange(3.2, 2.2, e), -2); lampeBureau.target.updateMatrixWorld();
    viser(v(melange(-0.75, 0.2, e), melange(3.05, 2.2, e), melange(0.55, 1.5, e)), v(melange(-0.55, 0.0, e), melange(3.25, 2.2, e), -2), t, 0.002, melange(-0.05, 0.015, e), 50);
    return { scene: bureau, camera, bloom: [0.18, 0.5, 0.96], vignette: 1.0, grain: 0.07, aberration: 0.5, exposition: 1.0, saturation: 0.82 };
  }

  // ══ 4. LA PELOUSE DE LA POLICE SCIENTIFIQUE ═════════════════════════════════════════════════════════════
  const pelouse = new THREE.Scene();
  pelouse.fog = new THREE.FogExp2(0x020405, 0.085);
  // Les trois corps laissés sur place (contours à la craie) et le trajet de crampons qui serpente entre eux.
  const CORPS = [[-1.25, -0.9, 0.5], [0.95, 0.35, -2.2], [-0.7, 1.75, 2.5]];
  const TRAJET = [[1.9, 3.4], [0.9, 2.5], [0.25, 1.55], [0.55, 0.85], [-0.35, 0.1], [-0.55, -0.35], [0.1, -1.2], [0.45, -2.0], [0.2, -3.2]];
  {
    const herbe = toile(1024, 1024, (c, L, H) => {
      for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#2c6a2a' : '#245a24'; c.fillRect(0, k * H / 8, L, H / 8); }
      for (let k = 0; k < 26000; k++) { c.strokeStyle = `rgba(${20 + h() * 60}, ${70 + h() * 110}, ${20 + h() * 50}, ${0.25 + h() * 0.35})`; c.lineWidth = 1 + h(); const x = h() * L, y = h() * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (h() - 0.5) * 5, y - 3 - h() * 7); c.stroke(); }
    });
    herbe.wrapS = herbe.wrapT = THREE.RepeatWrapping; herbe.repeat.set(5, 5);
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: herbe, roughness: 0.95 })); sol.rotation.x = -Math.PI / 2; pelouse.add(sol);
    // Un contour de corps étalé, bras en croix : le défenseur resté sur place.
    const contour = toile(512, 512, (c, L, H) => {
      c.clearRect(0, 0, L, H);
      c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.lineJoin = 'round'; c.lineCap = 'round'; c.setLineDash([26, 9]);
      c.beginPath(); c.arc(256, 92, 42, 0, Math.PI * 2); c.stroke();
      c.beginPath();
      [[214, 132], [140, 150], [56, 110], [40, 150], [128, 204], [196, 214], [190, 318], [150, 462], [202, 470], [256, 350], [300, 474], [356, 460], [322, 318], [316, 214], [384, 196], [470, 250], [486, 206], [372, 146], [298, 132]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath(); c.stroke();
    });
    CORPS.forEach(([x, z, angle]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshStandardMaterial({ map: contour, transparent: true, roughness: 0.9, depthWrite: false, emissive: 0x151515 }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = angle; m.position.set(x, 0.012, z); m.renderOrder = 2; pelouse.add(m);
    });
    // Les traces de crampons : six pastilles par appui, un pied puis l'autre, le long du trajet.
    const semelle = toile(128, 256, (c, L, H) => {
      c.clearRect(0, 0, L, H); c.fillStyle = 'rgba(8, 20, 8, .92)';
      for (const [x, y] of [[40, 40], [88, 40], [34, 100], [94, 100], [46, 190], [82, 190]]) { c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = 'rgba(8, 20, 8, .28)'; c.beginPath(); c.ellipse(64, 120, 46, 110, 0, 0, Math.PI * 2); c.fill();
    });
    const matSemelle = new THREE.MeshStandardMaterial({ map: semelle, transparent: true, roughness: 1, depthWrite: false });
    let pied = 1;
    for (let i = 0; i < TRAJET.length - 1; i++) {
      const [x0, z0] = TRAJET[i], [x1, z1] = TRAJET[i + 1];
      const pas = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.62));
      for (let s = 0; s < pas; s++) {
        const k = s / pas, cap = Math.atan2(x1 - x0, z1 - z0);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.30), matSemelle);
        m.rotation.x = -Math.PI / 2; m.rotation.z = -cap + Math.PI;
        m.position.set(melange(x0, x1, k) + Math.cos(cap) * 0.11 * pied, 0.008, melange(z0, z1, k) - Math.sin(cap) * 0.11 * pied); m.renderOrder = 1;
        pelouse.add(m); pied = -pied;
      }
    }
    // Les cavaliers jaunes numérotés.
    [[-0.55, -0.55, 1], [1.55, 0.75, 2], [-0.05, 2.25, 3], [0.6, -1.35, 4]].forEach(([x, z, numero]) => {
      const face = toile(128, 128, (c, L, H) => { c.fillStyle = '#f5c400'; c.fillRect(0, 0, L, H); c.fillStyle = '#141414'; c.font = `800 92px ${POLICE}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(numero), L / 2, H / 2 + 6); });
      const matiere = new THREE.MeshStandardMaterial({ map: face, roughness: 0.6, side: THREE.DoubleSide });
      for (const sens of [-1, 1]) {
        const pan = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.19), matiere);
        pan.position.set(x, 0.088, z + sens * 0.045); pan.rotation.x = sens * -0.45; if (sens < 0) pan.rotation.y = Math.PI;
        pelouse.add(pan);
      }
    });
    // Le ruban de scène : jaune et noir, sans un mot.
    const ruban = toile(1024, 64, (c, L, H) => { c.fillStyle = '#f5c400'; c.fillRect(0, 0, L, H); c.fillStyle = '#141414'; for (let x = -H; x < L; x += 96) { c.beginPath(); c.moveTo(x, H); c.lineTo(x + 40, H); c.lineTo(x + 40 + H, 0); c.lineTo(x + H, 0); c.fill(); } });
    ruban.wrapS = THREE.RepeatWrapping; ruban.repeat.set(3, 1);
    const bande = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.085, 40, 1), new THREE.MeshStandardMaterial({ map: ruban, side: THREE.DoubleSide, roughness: 0.6 }));
    const pos = bande.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) - 0.16 * Math.cos(pos.getX(i) / 14 * Math.PI) ** 2 * (Math.abs(pos.getX(i)) < 7 ? 1 : 0));
    bande.position.set(0, 0.86, 2.75); bande.rotation.y = 0.14; pelouse.add(bande);
    // La poussière dans le faisceau.
    const grains = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) grains.set([(h() - 0.5) * 9, h() * 3.2, (h() - 0.5) * 9], i * 3);
    const gPoussiere = new THREE.BufferGeometry(); gPoussiere.setAttribute('position', new THREE.BufferAttribute(grains, 3));
    const poussiere = new THREE.Points(gPoussiere, new THREE.PointsMaterial({ color: 0xcfe6ff, size: 0.018, transparent: true, opacity: 0.55, depthWrite: false }));
    poussiere.name = 'poussiere'; pelouse.add(poussiere);
  }
  const torche = new THREE.SpotLight(0xdfeeff, 46, 26, 0.36, 0.6, 1.2); pelouse.add(torche, torche.target);
  const mat = new THREE.SpotLight(0x9fb8ff, 26, 40, 0.9, 0.9, 1.1); mat.position.set(-7, 9, -6); mat.target.position.set(0, 0, 0); pelouse.add(mat, mat.target);
  pelouse.add(new THREE.AmbientLight(0x0b1220, 0.9));
  const poussiere = pelouse.getObjectByName('poussiere');

  function indicesPlan(k, t) {
    const e = adoucir(k);
    torche.position.set(2.6, 2.4, 3.6); torche.target.position.set(melange(-1.4, 0.2, e) + 0.25 * Math.sin(t * 2.3), 0, melange(-0.2, 0.2, e) + 0.2 * Math.sin(t * 1.7)); torche.target.updateMatrixWorld();
    torche.intensity = 68;
    poussiere.position.y = (t * 0.05) % 0.4;
    viser(v(melange(-2.6, -0.9, e), melange(0.30, 0.42, e), melange(4.3, 2.1, e)), v(melange(-0.9, -0.5, e), 0.12, melange(-0.3, -0.5, e)), t, 0.0022, melange(0.03, -0.01, e), 48);
    return { scene: pelouse, camera, bloom: [0.32, 0.55, 0.9], vignette: 1.0, grain: 0.075, aberration: 0.6, exposition: 1.05, saturation: 0.7, teinte: [0.94, 1.0, 1.06] };
  }
  function craiePlan(k, t) {
    const e = adoucir(k);
    // La torche suit le trajet : elle éclaire les trois contours l'un après l'autre.
    const u = borner(k * 1.15) * (TRAJET.length - 1), i = Math.min(TRAJET.length - 2, Math.floor(u));
    const x = melange(TRAJET[i][0], TRAJET[i + 1][0], u - i), z = melange(TRAJET[i][1], TRAJET[i + 1][1], u - i);
    torche.position.set(0.4, 6.2, 0.8); torche.target.position.set(x * 0.55, 0, z * 0.5); torche.target.updateMatrixWorld();
    torche.intensity = 70 + 25 * lisser(0.75, 1.0, k);
    poussiere.position.y = (t * 0.05) % 0.4;
    const tour = melange(-0.35, 0.25, e);
    viser(v(0.15, melange(7.2, 5.2, e), 0.55), v(0, 0, 0.3), t, 0.0012, 0, 46, v(Math.sin(tour), 0, -Math.cos(tour)));
    return { scene: pelouse, camera, bloom: [0.30, 0.55, 0.9], vignette: 1.0, grain: 0.075, aberration: 0.6, exposition: 1.0 + 0.15 * e, saturation: 0.7, teinte: [0.94, 1.0, 1.06] };
  }

  return { reperes, plans: { ecrans: ecransPlan, disparition: disparitionPlan, suspects: suspectsPlan, tableau: tableauPlan, indices: indicesPlan, craie: craiePlan } };
}
