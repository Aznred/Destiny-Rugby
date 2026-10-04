// LE DIRECT D'UNE LIGUE EN TROIS DIMENSIONS, SANS RIEN DEMANDER DE PLUS AU SERVEUR.
//
// Ce banc rejoue la chaîne entière, sans navigateur :
//   1. un « serveur » fait tourner le moteur à la vitesse réelle et n'émet
//      qu'un relevé du terrain toutes les deux secondes (`extraireTerrain`) ;
//   2. un « client » les interpole à trente images par seconde, avec le même
//      retard et les mêmes fonctions que l'écran (`interpolationDirect`) ;
//   3. chaque image est traduite pour la scène (`etat3DDepuisDirect`) et lue
//      par le lecteur 3D installé dans `public/rn26/`.
//
// On vérifie que la scène reçoit de quoi animer un vrai match — conquêtes
// découpées en étapes, alignement et lifteurs retrouvés, regroupements liés,
// tirs lus sur leur trajectoire — et qu'aucun corps ne se téléporte.
//
// Lancer : npx vite-node scripts/verifierDirect3D.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { avancer, creerMatch, geometrieMelee, TEMPS_MELEE, RITUEL_TIR } from '../src/lib/moteur/moteur';
import { positionVol } from '../src/lib/moteur/trajectoire';
import { effectifDuClub } from '../src/lib/effectif';
import { extraireTerrain, type TerrainDirect } from '../src/lib/ligue/matchCarriere';
import {
  amortirImageDirect, interpolerEtatDirect, interpolerImageDirect, type ImageDirect,
} from '../src/lib/ligue/interpolationDirect';
import { creerMemoireEtat3D, etat3DDepuisDirect, type Etat3D } from '../src/lib/ligue/etat3DDepuisDirect';
// @ts-expect-error — module JavaScript du lecteur 3D, sans déclarations de types.
import { DestinyMatch } from '../public/rn26/destiny.mjs';

const clips = new Set((JSON.parse(fs.readFileSync('public/rn26/motions/catalogue-match-poses.json', 'utf8')) as { name: string }[]).map((c) => c.name));
const INTERVALLE = 2, RETARD = 2.4, IMAGE = 1 / 30;
const outils = {
  porteurPourAffichage: (etat: Etat3D) => etat.porteurAffiche ?? undefined,
  positionVol, geometrieMelee, TEMPS_MELEE, RITUEL_TIR,
};

function jouer(cle: string, minutesReelles: number) {
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1),
    24, 20, cle, undefined, { tempsReel: true, niveau: 'pro', scoreSurTerrain: true });
  const releves: { instant: number; terrain: TerrainDirect }[] = [{ instant: 0, terrain: extraireTerrain(e, 0) }];
  const memoire = creerMemoireEtat3D();
  let scene: InstanceType<typeof DestinyMatch> | null = null;
  let affichee: ImageDirect | null = null;
  let prochain = INTERVALLE;
  const bilan = {
    images: 0, octets: 0, releves: 0, sautMax: 0, manquants: new Set<string>(),
    etapesMelee: new Set<string>(), etapesTir: new Set<string>(), touchesAvecSaut: 0, touches: 0,
    rucks: 0, rucksLies: 0, tirs: 0, phases: new Set<string>(),
  };
  const avant = new Map<string, { x: number; z: number }>();
  let ruckVu: unknown = null, toucheVue: unknown = null, tirVu: unknown = null, sautVu = false, lieVu = false;
  for (let t = 0; t < minutesReelles * 60 && !e.fini; t += IMAGE) {
    // ── Le serveur : le moteur avance, un relevé part toutes les deux secondes ──
    avancer(e, IMAGE);
    if (t >= prochain) {
      prochain += INTERVALLE;
      const terrain = extraireTerrain(e, Math.round(t * 1000));
      releves.push({ instant: t, terrain });
      bilan.releves++; bilan.octets += JSON.stringify(terrain).length;
      if (releves.length > 6) releves.shift();
    }
    // ── Le client : il montre le match avec 2,4 s de retard, entre deux relevés ──
    const instant = t - RETARD;
    if (instant < 0 || releves.length < 2) continue;
    let i = 0;
    while (i < releves.length - 2 && releves[i + 1].instant <= instant) i++;
    const a = releves[i], b = releves[i + 1];
    if (instant > b.instant) continue;
    const u = Math.max(0, Math.min(1, (instant - a.instant) / Math.max(0.001, b.instant - a.instant)));
    const dtSim = Math.max(0, (b.terrain.simulation ?? 0) - (a.terrain.simulation ?? 0));
    affichee = amortirImageDirect(affichee, interpolerImageDirect(a.terrain, b.terrain, u, dtSim), IMAGE);
    const courant = interpolerEtatDirect(a.terrain, b.terrain, u);
    const etat = etat3DDepuisDirect(memoire, courant, affichee.pions, affichee.ballon);
    scene ??= new DestinyMatch({ etat, outils, direct: true });
    scene.observe();
    scene.slots = scene.formation(0);
    bilan.images++; bilan.phases.add(etat.phase);
    for (const p of scene.players) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z), 'Position invalide');
      const d = scene.motion(p, 0);
      if (!d.loco && !clips.has(d.name)) bilan.manquants.add(d.name);
      if (d.upper && !clips.has(d.upper.name)) bilan.manquants.add(d.upper.name);
      assert.ok(Number.isFinite(d.time), `Temps d'animation invalide : ${d.name}`);
      if (d.anchor) assert.ok(Number.isFinite(d.anchor.x + d.anchor.z + d.anchor.heading), `Ancre invalide : ${d.name}`);
      if (d.lie) lieVu = true;
      if (d.air) sautVu = true;
      const precedent = avant.get(p.id);
      if (precedent) bilan.sautMax = Math.max(bilan.sautMax, Math.hypot(p.x - precedent.x, p.z - precedent.z));
      avant.set(p.id, { x: p.x, z: p.z });
    }
    const melee = scene.melee;
    if (melee) { assert.ok(melee.synthese, 'La mêlée du direct est découpée par la scène'); bilan.etapesMelee.add(melee.etape); }
    const tir = scene.tir;
    if (tir) {
      if (!tir.volLance) bilan.etapesTir.add(tir.etape);
      if (tir !== tirVu && tir.volLance) { tirVu = tir; bilan.tirs++; assert.equal(typeof tir.reussi, 'boolean', 'Le résultat du tir se lit sur sa trajectoire'); }
    }
    if (etat.ruck !== ruckVu) {
      if (ruckVu && lieVu) bilan.rucksLies++;
      ruckVu = etat.ruck; lieVu = false;
      if (etat.ruck) bilan.rucks++;
    }
    if (etat.conquete?.type === 'touche') {
      if (toucheVue !== etat.conquete) { toucheVue = etat.conquete; bilan.touches++; sautVu = false; }
    } else if (toucheVue) { if (sautVu) bilan.touchesAvecSaut++; toucheVue = null; }
  }
  return bilan;
}

const b = jouer('direct-3d', 26);
assert.equal(b.manquants.size, 0, `Animations manquantes : ${[...b.manquants].join(', ')}`);
// À trente images par seconde, un sprint couvre 35 cm par image : au-delà de 60, un corps a été projeté.
assert.ok(b.sautMax < 0.6, `Corps téléporté : ${b.sautMax.toFixed(2)} m en une image`);
assert.ok(b.rucks > 10 && b.rucksLies / b.rucks > 0.6, `Regroupements où des soutiens se lient : ${b.rucksLies}/${b.rucks}`);
assert.ok(b.touches > 0 && b.touchesAvecSaut / b.touches >= 0.6, `Touches avec un sauteur lifté : ${b.touchesAvecSaut}/${b.touches}`);
for (const etape of ['liaison', 'impact', 'introduction', 'poussee']) {
  assert.ok(b.etapesMelee.size === 0 || b.etapesMelee.has(etape), `Mêlée : étape « ${etape} » jamais vue (${[...b.etapesMelee].join(', ')})`);
}
if (b.tirs) for (const etape of ['pose', 'pret', 'elan']) {
  assert.ok(b.etapesTir.has(etape), `Tir : étape « ${etape} » jamais vue (${[...b.etapesTir].join(', ')})`);
}
const parReleve = Math.round(b.octets / Math.max(1, b.releves));
console.log(`OK — ${b.images} images reconstruites à partir de ${b.releves} relevés (${(parReleve / 1024).toFixed(1)} Ko chacun, un toutes les ${INTERVALLE} s, inchangés) ;`
  + ` ${b.rucksLies}/${b.rucks} regroupements liés, ${b.touchesAvecSaut}/${b.touches} touches avec saut, mêlée [${[...b.etapesMelee].join(' → ')}],`
  + ` ${b.tirs} tirs [${[...b.etapesTir].join(' → ')}], saut maximal d'un corps ${b.sautMax.toFixed(2)} m par image ; phases : ${[...b.phases].join(', ')}.`);
