// LES PLANS D'ESPACE — la Terre à l'origine, l'objet qui fonce vers elle le long de −Z.
// Unité : 100 km. Chaque plan est une fonction pure (k de 0 à 1 dans le plan, t en secondes absolues) :
// elle pose les objets, la caméra, et rend les réglages de l'étalonnage.
import * as THREE from 'three';
import { creerTerre, creerEtoiles, creerSoleil } from './terre.js';
import { creerBallon, RAYON, DEMI } from './ballon.js';
import { tremblement, lisser, melange, sortieDouce, entreeDouce, adoucir, borner } from './bruit.js';

const RT = 63.71;
const SOLEIL = new THREE.Vector3(0.80, 0.42, 0.42).normalize();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const v = (x, y, z) => new THREE.Vector3(x, y, z);

export function creerEspace(largeur) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.03, 4000);
  const terre = creerTerre(RT);
  const etoiles = creerEtoiles();
  etoiles.material.uniforms.echelle.value = largeur / 1080;
  const soleil = creerSoleil();
  const ballon = creerBallon();
  scene.add(etoiles, terre.groupe, ballon.groupe, soleil);

  // La Terre est tournée pour que le point d'impact (Atlantique, au large du Maroc) regarde l'objet, le nord vers le haut.
  const lon = -24 * Math.PI / 180, lat = 31 * Math.PI / 180;
  const impactObjet = v(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
  const q1 = new THREE.Quaternion().setFromUnitVectors(impactObjet, Z);
  const nord = Y.clone().applyQuaternion(q1); nord.z = 0; nord.normalize();
  const vrille = new THREE.Quaternion().setFromAxisAngle(Z, Math.atan2(nord.x, nord.y));
  terre.groupe.quaternion.copy(vrille.multiply(q1));
  terre.uniformes.impactDir.value.copy(impactObjet);
  terre.uniformes.soleil.value.copy(SOLEIL);
  ballon.uniformes.soleil.value.copy(SOLEIL);

  const qAxial = new THREE.Quaternion().setFromUnitVectors(Z, v(0, 0, -1));       // la pointe ouvre la route
  const qTravers = new THREE.Quaternion().setFromUnitVectors(Z, Y);                // le grand axe en travers de la route

  const reperes = { devoile: 0 };
  function raz() {
    terre.uniformes.impactForce.value = 0; terre.uniformes.impactEclair.value = 0; terre.uniformes.lueurForce.value = 0;
    terre.uHalo.impactLueur.value = 0;
    ballon.groupe.visible = true;
    ballon.uniformes.balayage.value = -100;
    ballon.uniformes.croute.value = 0;
  }
  function commun(t, cam) {
    terre.uniformes.temps.value = t;
    ballon.uniformes.temps.value = t;
    ballon.uniformes.terreDir.value.copy(v(0, 0, 0).sub(ballon.groupe.position).normalize());
    soleil.position.copy(cam.position).addScaledVector(SOLEIL, 900);
    soleil.scale.setScalar(900 * 0.55);
    soleil.lookAt(cam.position);
    cam.updateMatrixWorld();
  }
  function viser(pos, cible, haut, t, secousse = 0, roulis = 0, fov = 50) {
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.position.copy(pos); camera.up.copy(haut); camera.lookAt(cible);
    const s = tremblement(t, 3);
    camera.rotateX(s.y * secousse); camera.rotateY(s.x * secousse); camera.rotateZ(roulis + s.r * secousse * 0.6);
  }
  /** Le sillage : onde de choc, feu, fumée, éclat, et ce que le plasma renvoie sur la coque. */
  function sillage(choc, feu, fumee, eclat, deTravers = false, direction = v(0, 0, -1)) {
    ballon.sillage.quaternion.setFromUnitVectors(Z, direction);
    ballon.sillage.position.copy(direction).multiplyScalar(deTravers ? -(DEMI - RAYON) - 0.4 : 0);
    ballon.sillage.scale.set(deTravers ? 1.6 : 1, deTravers ? 1.6 : 1, 1);
    ballon.uPlasma.force.value = choc; ballon.uFeu.force.value = feu; ballon.uFumee.force.value = fumee; ballon.uEclat.force.value = eclat;
    ballon.choc.visible = choc > 0.001; ballon.feu.visible = feu > 0.001; ballon.fumee.visible = fumee > 0.001; ballon.eclat.visible = eclat > 0.001;
    ballon.uniformes.plasmaDir.value.copy(direction);
    ballon.uniformes.plasmaCouleur.value.setRGB(0.9 * choc, 0.32 * choc, 0.07 * choc);
  }

  // ── Scène 1a : la caméra file derrière l'objet, la Terre grossit ───────────────────────────────────────────
  function approche(k, t) {
    raz();
    const dist = melange(330, 196, entreeDouce(k) * 0.35 + k * 0.65);
    ballon.groupe.position.set(0, 0, dist);
    ballon.tourne.quaternion.copy(qAxial).multiply(new THREE.Quaternion().setFromAxisAngle(Z, t * 0.5));
    ballon.uniformes.suie.value = 0.9; ballon.uniformes.chauffe.value = 0.45; ballon.uniformes.croute.value = 1;
    sillage(0.95 + 0.30 * k, 0.50, 0, 0.30);
    const a = melange(-0.42, 0.30, adoucir(k));
    const recul = melange(40, 27, k);
    const pos = v(Math.sin(a) * recul * 0.62, 7.5 - 3.5 * k, dist + Math.cos(a) * recul);
    viser(pos, v(pos.x * 0.25, 15 - 4 * k, dist - 60), Y, t, 0.006 + 0.006 * k, melange(-0.10, 0.05, k), 52);
    commun(t, camera);
    return { scene, camera, bloom: [0.30, 0.5, 0.95], vignette: 0.75, grain: 0.035, aberration: 0.5, exposition: 1.05 };
  }

  // ── Scène 1b : l'entrée dans l'atmosphère, vue de profil au ras du globe ───────────────────────────────────
  function entree(k, t) {
    raz();
    const alt = melange(30, 8.5, k);
    ballon.groupe.position.set(0, 0, RT + alt);
    ballon.tourne.quaternion.copy(qAxial).multiply(new THREE.Quaternion().setFromAxisAngle(Z, t * 0.5));
    ballon.uniformes.suie.value = 0.95; ballon.uniformes.chauffe.value = 1.0; ballon.uniformes.croute.value = 1;
    const f = 0.6 + 0.4 * k;
    sillage(1.1 * f, 1.5 * f, 0.35 * f, 0.7 * f);
    terre.uniformes.lueurDir.value.copy(terre.uniformes.impactDir.value);
    terre.uniformes.lueurForce.value = lisser(0.1, 1.0, k) * 1.4;
    const pos = v(-38 + 8 * k, 12 - 16 * k, RT + alt + 9 - 6 * k);
    viser(pos, v(4, 0, RT + alt + 2.5), Z, t, 0.010 + 0.012 * k, -0.22 + 0.10 * k, 56);
    commun(t, camera);
    return { scene, camera, bloom: [0.42, 0.6, 0.92], vignette: 0.8, grain: 0.04, aberration: 0.9, exposition: 1.0, flash: 0.06 * lisser(0.82, 1.0, k) };
  }

  // ── Scène 2d : vue d'altitude, l'onde de choc s'étend sur le globe ─────────────────────────────────────────
  function onde(k, t) {
    raz();
    ballon.groupe.visible = false;
    const pos = v(9 - 5 * k, -46 - 30 * k, RT + 62 + 62 * k);
    viser(pos, v(0, 9 + 6 * k, RT - 6), Y, t, 0.012 * (1 - k * 0.6), 0.05 - 0.07 * k, 50);
    commun(t, camera);
    terre.uniformes.impactForce.value = 1;
    terre.uniformes.impactRayon.value = 0.025 + 0.36 * Math.pow(k, 0.78);
    terre.uniformes.impactEclair.value = Math.exp(-k * 9.0) * 1.6 + 0.06;
    terre.uHalo.impactLueur.value = 0.5 * lisser(0.0, 0.6, k);
    return { scene, camera, bloom: [0.48, 0.65, 0.92], vignette: 0.8, grain: 0.04, aberration: 1.0, exposition: 1.0, flash: Math.exp(-k * 14.0) * 0.5 };
  }

  // ── Scènes 3 et 4 : l'objet de travers, la Terre derrière lui. Une seule géométrie pour la surface, la macro,
  //    le recul et le plan du ballon dévoilé — le recul de la scène 4 part exactement d'où la scène 3 s'arrête.
  const BETA = -108 * Math.PI / 180;                 // où la lumière du soleil rase la coque
  const normale = v(Math.cos(BETA), 0, -Math.sin(BETA));
  const DIST_TERRE = 205;
  function travers(t, tDevoile, culbute) {
    ballon.groupe.position.set(0, 0, DIST_TERRE - 7 * Math.max(0, t - tDevoile));
    // Une couture passe dans la lumière rasante ; le ballon tourne à peine sur lui-même, puis culbute une fois dévoilé.
    const propre = new THREE.Quaternion().setFromAxisAngle(Z, -18 * Math.PI / 180 + 0.012 * t);
    const helice = new THREE.Quaternion().setFromAxisAngle(Z, culbute);
    ballon.tourne.quaternion.copy(helice).multiply(qTravers).multiply(propre);
    ballon.uniformes.chauffe.value = 0;
  }
  const surSurface = (z, d, lateral = 0) => {
    const r = RAYON * Math.pow(Math.max(0, 1 - (z / DEMI) ** 2), 0.58);
    const tangente = v(-normale.z, 0, normale.x);
    return ballon.groupe.position.clone().addScaledVector(normale, r + d).addScaledVector(Y, z).addScaledVector(tangente, lateral);
  };

  function surface(k, t) {
    raz();
    travers(t, 1e9, 0);
    ballon.uniformes.suie.value = 0.62;
    sillage(0.20, 0, 0, 0, true);
    const d = melange(8.5, 3.4, adoucir(k));
    const pos = surSurface(melange(-1.8, -0.2, k), d, melange(-2.2, -0.6, k));
    viser(pos, surSurface(melange(-0.9, 0.3, k), 0, melange(0.5, 0.1, k)), Y, t, 0.0025, melange(0.10, 0.02, k), 46);
    commun(t, camera);
    return { scene, camera, bloom: [0.22, 0.5, 0.97], vignette: 0.95, grain: 0.05, aberration: 0.5, exposition: 2.2, saturation: 0.72 };
  }

  const macroPose = k => ({
    pos: surSurface(melange(-1.5, 0.25, k) - 1.05, melange(1.25, 0.72, adoucir(k)), melange(0.55, 0.22, k)),
    cible: surSurface(melange(-1.5, 0.25, k) + 0.55, 0, melange(-0.10, 0.02, k)),
  });
  function macro(k, t) {
    raz();
    travers(t, 1e9, 0);
    ballon.uniformes.suie.value = 0.55;
    sillage(0.14, 0, 0, 0, true);
    const p = macroPose(k);
    viser(p.pos, p.cible, Y, t, 0.0018, melange(-0.05, 0.03, k), 44);
    commun(t, camera);
    return { scene, camera, bloom: [0.20, 0.5, 0.97], vignette: 1.0, grain: 0.055, aberration: 0.6, exposition: 2.4 + 0.4 * k, saturation: 0.66 };
  }

  const culbuteA = (t, t0) => { const x = Math.max(0, t - t0); return 0.55 * (x - 0.9 * (1 - Math.exp(-x / 0.9))); };
  const poseHeros = k => v(Math.sin(melange(-0.20, 0.34, k)) * 45, 4 + 5 * k, DIST_TERRE + Math.cos(melange(-0.20, 0.34, k)) * melange(46, 40, k));

  function devoile(k, t) {
    raz();
    const t0 = reperes.devoile;
    travers(t, t0, culbuteA(t, t0));
    const e = sortieDouce(Math.min(1, k * 1.25));
    ballon.uniformes.suie.value = melange(0.55, 0.0, lisser(0.0, 0.45, k));
    sillage(melange(0.14, 0.60, e), 0, 0, melange(0, 0.30, e), true);
    const m = macroPose(1);
    const fin = poseHeros(0).add(v(0, 0, -7 * (t - t0)));
    const pos = m.pos.clone().lerp(fin, e);
    const cible = m.cible.clone().lerp(ballon.groupe.position, Math.min(1, e * 1.6));
    viser(pos, cible, Y, t, 0.004 * (1 - e), melange(0.03, 0, e), melange(44, 48, e));
    commun(t, camera);
    return { scene, camera, bloom: [melange(0.2, 0.3, e), 0.55, 0.95], vignette: 0.8, grain: 0.04, aberration: melange(2.2, 0.5, e), exposition: melange(2.8, 1.0, Math.min(1, e * 1.8)),
      saturation: melange(0.66, 1.08, e), flouRadial: 0.28 * (1 - e) * lisser(0, 0.12, k), flash: 0.22 * Math.exp(-Math.pow((k - 0.02) / 0.05, 2)) };
  }

  function heros(k, t) {
    raz();
    const t0 = reperes.devoile;
    travers(t, t0, culbuteA(t, t0));
    ballon.uniformes.suie.value = 0;
    sillage(0.60, 0, 0, 0.30, true);
    const pos = poseHeros(adoucir(k)).add(v(0, 0, -7 * (t - t0)));
    viser(pos, ballon.groupe.position.clone().add(v(0, 0.6, 0)), Y, t, 0.0025, 0, 48);
    commun(t, camera);
    return { scene, camera, bloom: [0.30, 0.55, 0.95], vignette: 0.8, grain: 0.035, aberration: 0.5, exposition: 1.0, saturation: 1.08 };
  }

  function ruee(k, t) {
    raz();
    const t0 = reperes.devoile;
    travers(t, t0, culbuteA(t, t0));
    ballon.uniformes.suie.value = 0;
    sillage(0.60, 0, 0, 0.30 * (1 - k), true);
    const depart = poseHeros(1).add(v(0, 0, -7 * (t - t0)));
    const e = Math.pow(k, 2.6);
    const pos = depart.lerp(ballon.groupe.position.clone().add(v(0.4, 0.3, RAYON + 0.55)), e);
    viser(pos, ballon.groupe.position, Y, t, 0.004 + 0.02 * e, 0.5 * e, melange(48, 62, e));
    commun(t, camera);
    return { scene, camera, bloom: [0.30 + 0.4 * e, 0.6, 0.92], vignette: 0.8 * (1 - e), grain: 0.035, aberration: 0.5 + 2.5 * e, exposition: 1.0 + 0.4 * e, saturation: 1.08,
      flouRadial: 0.35 * e, flash: Math.pow(k, 5.0) * 1.1 };
  }

  return { scene, camera, ballon, terre, reperes, plans: { approche, entree, onde, surface, macro, devoile, heros, ruee } };
}
