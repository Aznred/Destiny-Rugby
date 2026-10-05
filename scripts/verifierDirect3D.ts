// LE DIRECT D'UNE LIGUE EN TROIS DIMENSIONS — ce que la scène montre du film.
//
// Ce banc rejoue la chaîne entière, sans navigateur :
//   1. un « serveur » joue un match de ligue (règles 2) à la vitesse réelle et
//      répond toutes les deux secondes par les pas du moteur que l'écran ne
//      connaît pas encore (`extraireFilm`), passés par JSON ;
//   2. un « client » les rejoue à trente images par seconde (`LecteurFilm`),
//      avec des réponses plus ou moins lentes ;
//   3. le lecteur 3D installé dans `public/rn26/` lit l'état rejoué comme il lit
//      un match de carrière, et on regarde ce qu'il AFFICHE.
//
// On vérifie ce que le Correctif 7 demandait : aucun corps déplacé d'un coup,
// un plaquage qui ne commence qu'au contact, une mêlée et une touche qui
// attendent leurs joueurs, un coup d'envoi donné quand tout le monde est
// replacé, et les étapes jouées par le moteur lui-même (plus de découpage
// deviné par la scène).
//
// Lancer : npm run verify:direct-3d

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { avancer, creerMatch, geometrieMelee, TEMPS_MELEE, RITUEL_TIR, DT } from '../src/lib/moteur/moteur';
import { positionVol } from '../src/lib/moteur/trajectoire';
import { porteurPourAffichage } from '../src/lib/moteur/dynamique';
import { effectifDuClub } from '../src/lib/effectif';
import { RESSERREMENT_REGLES_2 } from '../src/lib/ligue/matchCarriere';
import { cadrerFilm, extraireFilm, filmer, LecteurFilm, type FilmDirect } from '../src/lib/ligue/filmDirect';
// @ts-expect-error — module JavaScript du lecteur 3D, sans déclarations de types.
import { DestinyMatch } from '../public/rn26/destiny.mjs';

const IA_DU_BANC = Number(process.argv.find((a) => a.startsWith('--ia='))?.split('=')[1] ?? 0);

const clips = new Set((JSON.parse(fs.readFileSync('public/rn26/motions/catalogue-match-poses.json', 'utf8')) as { name: string }[]).map((c) => c.name));
const INTERVALLE = 2, IMAGE = 1 / 30;
const outils = { porteurPourAffichage, positionVol, geometrieMelee, TEMPS_MELEE, RITUEL_TIR };

interface Joueur3D { id: string; x: number; z: number; arrival: number; source: { role: string; pos: { x: number; y: number }; vitesse: { x: number; y: number }; corps?: unknown } }

function jouer(cle: string, minutesReelles: number) {
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1),
    24, 20, cle, undefined, {
      tempsReel: true, niveau: 'pro', scoreSurTerrain: true,
      cadenceDetaillee: true, placementJoue: true, resserrement: RESSERREMENT_REGLES_2,
      ...(IA_DU_BANC ? { ia: IA_DU_BANC } : {}),
    });
  filmer(e);
  const lecteur = new LecteurFilm();
  const enRoute: { arrive: number; film: FilmDirect }[] = [];
  let scene: InstanceType<typeof DestinyMatch> | null = null;
  let prochain = INTERVALLE, graine = 4242;
  const hasard = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; };
  const bilan = {
    images: 0, octets: 0, envois: 0, sautMax: 0, manquants: new Set<string>(), phases: new Set<string>(),
    etapesMelee: new Set<string>(), etapesTir: new Set<string>(),
    melees: 0, meleesPretes: 0, ecartMelee: 0,
    touches: 0, touchesPretes: 0, touchesAvecSaut: 0, ecartTouche: 0,
    coupsEnvoi: 0, coupsEnvoiPrets: 0, ecartCoupEnvoi: 0,
    plaquages: 0, plaquagesAuContact: 0, distancePlaquageMax: 0,
    rucks: 0, rucksLies: 0, tirs: 0,
  };
  const affiches = new Map<string, { x: number; z: number }>();
  const gestesVus = new Set<string>();
  let etapeMelee = '', phasePrec = '', ruckVu: unknown = null, toucheVue: unknown = null, tirVu: unknown = null;
  let sautVu = false, lieVu = false, lancerVu = false;

  for (let t = 0; t < minutesReelles * 60 && !e.fini; t += IMAGE) {
    // ── Le serveur ───────────────────────────────────────────────────────────
    if (t >= prochain) {
      prochain += INTERVALLE;
      cadrerFilm(e, t);
      let garde = 0;
      while (!e.fini && e.t < t && garde++ < 400) avancer(e, 0.6);
      const film = extraireFilm(e, lecteur.dernier);
      if (film) {
        const fil = JSON.stringify(film);
        bilan.envois++; bilan.octets += fil.length;
        enRoute.push({ arrive: t + 0.1 + hasard() * 0.8, film: JSON.parse(fil) as FilmDirect });
      }
    }
    for (let i = enRoute.length - 1; i >= 0; i--) {
      if (enRoute[i].arrive <= t) { lecteur.recevoir(enRoute[i].film); enRoute.splice(i, 1); }
    }
    // ── Le client : une image ────────────────────────────────────────────────
    lecteur.avancer(IMAGE);
    if (!lecteur.pret) continue;
    const etat = lecteur.etat;
    scene ??= new DestinyMatch({ etat, outils, direct: false });
    scene.observe();
    scene.slots = scene.formation(scene.offset());
    bilan.images++; bilan.phases.add(etat.phase);
    const alpha = scene.alpha();
    const montres = new Map<string, { x: number; z: number }>();
    for (const p of scene.players as Joueur3D[]) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z), 'Position invalide');
      const d = scene.motion(p, scene.offset());
      if (!d.loco && !clips.has(d.name)) bilan.manquants.add(d.name);
      if (d.upper && !clips.has(d.upper.name)) bilan.manquants.add(d.upper.name);
      assert.ok(Number.isFinite(d.time), `Temps d'animation invalide : ${d.name}`);
      if (d.lie) lieVu = true;
      if (d.air) sautVu = true;
      // Ce que l'écran dessine : entre la place du pas précédent et celle du pas courant.
      const avant = scene.previous.get(p.id) ?? p;
      const x = avant.x + (p.x - avant.x) * alpha, z = avant.z + (p.z - avant.z) * alpha;
      const prec = affiches.get(p.id);
      if (prec) bilan.sautMax = Math.max(bilan.sautMax, Math.hypot(x - prec.x, z - prec.z));
      montres.set(p.id, { x, z });
    }
    affiches.clear();
    for (const [id, v] of montres) affiches.set(id, v);
    const ecartAuMoteur = (p: Joueur3D) => {
      const m = montres.get(p.id)!;
      return Math.hypot(m.x - (p.source.pos.y - 35), m.z - (p.source.pos.x - 61));
    };

    // ── Un plaquage ne commence qu'au contact ────────────────────────────────
    // On mesure à l'instant où le geste DÉMARRE à l'image (son `debut`), pas à
    // celui où l'état le porte : l'écran montre le pas courant en fin d'image.
    const instant = etat.sim - DT + etat.reliquat;
    for (const g of etat.gestes) {
      if (gestesVus.has(g.id) || instant < g.debut - 1e-6) continue;
      gestesVus.add(g.id);
      if (!g.clip.startsWith('tackle') || g.variante === 'manque' || g.variante === 'apres-passe') continue;
      const ruck = etat.ruck as { porteurId?: string; plaqueurId?: string } | null;
      const porteurId = ruck?.plaqueurId === g.joueurId ? ruck.porteurId : undefined;
      const a = montres.get(g.joueurId), b = porteurId ? montres.get(porteurId) : undefined;
      if (!a || !b) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      bilan.plaquages++;
      if (d < 1.5) bilan.plaquagesAuContact++;
      bilan.distancePlaquageMax = Math.max(bilan.distancePlaquageMax, d);
    }

    // ── La mêlée : jouée par étapes par le moteur, liée seulement quand les packs sont là ──
    const melee = scene.melee as { etape: string; synthese?: boolean } | null;
    if (melee) {
      assert.ok(!melee.synthese, 'La mêlée du direct est jouée par le moteur, pas découpée par la scène');
      bilan.etapesMelee.add(melee.etape);
      if (melee.etape === 'liaison' && etapeMelee === 'placement') {
        bilan.melees++;
        const pack = (scene.players as Joueur3D[]).filter((p) => p.source.role === 'melee');
        // La scène range les packs à SES places de mêlée : c'est d'elles qu'on mesure l'écart.
        const pire = Math.max(...pack.map((p) => p.arrival));
        bilan.ecartMelee = Math.max(bilan.ecartMelee, pire);
        if (pire < 1.2) bilan.meleesPretes++;
      }
      etapeMelee = melee.etape;
    } else etapeMelee = '';

    // ── La touche : le lancer part quand l'alignement est formé ──────────────
    const conquete = etat.conquete as { type: string; progression?: number } | null;
    if (conquete?.type === 'touche') {
      if (toucheVue !== conquete) { toucheVue = conquete; bilan.touches++; sautVu = false; lancerVu = false; }
      if (!lancerVu && (conquete.progression ?? 0) > 0.05) {
        // Le temps de la touche vient de commencer à se décompter : l'attente est finie.
        lancerVu = true;
        const alignes = (scene.players as Joueur3D[]).filter((p) => p.source.role === 'alignement');
        const pire = Math.max(0, ...alignes.map((p) => p.arrival));
        const enCourse = alignes.filter((p) => Math.hypot(p.source.vitesse.x, p.source.vitesse.y) > 3).length;
        bilan.ecartTouche = Math.max(bilan.ecartTouche, pire);
        if (pire < 2 && enCourse === 0) bilan.touchesPretes++;
      }
    } else if (toucheVue) { if (sautVu) bilan.touchesAvecSaut++; toucheVue = null; }

    // ── Le coup d'envoi : donné quand chacun est à sa place ──────────────────
    if (phasePrec === 'coupEnvoi' && etat.phase !== 'coupEnvoi') {
      bilan.coupsEnvoi++;
      const loin = (scene.players as Joueur3D[]).filter((p) => ecartAuMoteur(p) > 2.5).length;
      const pire = Math.max(...(scene.players as Joueur3D[]).map(ecartAuMoteur));
      bilan.ecartCoupEnvoi = Math.max(bilan.ecartCoupEnvoi, pire);
      if (!loin) bilan.coupsEnvoiPrets++;
    }
    phasePrec = etat.phase;

    const tir = scene.tir as { etape?: string; volLance?: boolean; reussi?: boolean } | null;
    if (tir) {
      if (!tir.volLance && tir.etape) bilan.etapesTir.add(tir.etape);
      if (tir !== tirVu && tir.volLance) { tirVu = tir; bilan.tirs++; assert.equal(typeof tir.reussi, 'boolean', 'Le résultat du tir vient du moteur'); }
    }
    if (etat.ruck !== ruckVu) {
      if (ruckVu && lieVu) bilan.rucksLies++;
      ruckVu = etat.ruck; lieVu = false;
      if (etat.ruck) bilan.rucks++;
    }
  }
  return bilan;
}

assert.equal(DT, 0.15);
const b = jouer('direct-3d', 26);
assert.equal(b.manquants.size, 0, `Animations manquantes : ${[...b.manquants].join(', ')}`);
// À trente images par seconde, un sprint couvre 35 cm par image : au-delà de 60, un corps a été projeté.
assert.ok(b.sautMax < 0.6, `Corps déplacé d'un coup : ${b.sautMax.toFixed(2)} m en une image`);
assert.ok(b.plaquages > 40, `Trop peu de plaquages observés : ${b.plaquages}`);
assert.ok(b.plaquagesAuContact / b.plaquages >= 0.97, `Plaquages commencés à distance : ${b.plaquages - b.plaquagesAuContact} sur ${b.plaquages} (jusqu'à ${b.distancePlaquageMax.toFixed(1)} m)`);
assert.ok(b.melees >= 3 && b.meleesPretes === b.melees, `Mêlées liées avec des packs encore en route : ${b.melees - b.meleesPretes} sur ${b.melees} (écart ${b.ecartMelee.toFixed(1)} m)`);
assert.ok(b.touches >= 3 && b.touchesPretes >= b.touches - 1, `Touches jouées avant que l'alignement soit formé : ${b.touches - b.touchesPretes} sur ${b.touches} (écart ${b.ecartTouche.toFixed(1)} m)`);
assert.ok(b.coupsEnvoi >= 1 && b.coupsEnvoiPrets === b.coupsEnvoi, `Coups d'envoi donnés avant le replacement : ${b.coupsEnvoi - b.coupsEnvoiPrets} sur ${b.coupsEnvoi} (écart ${b.ecartCoupEnvoi.toFixed(1)} m)`);
assert.ok(b.rucks > 10 && b.rucksLies / b.rucks > 0.6, `Regroupements où des soutiens se lient : ${b.rucksLies}/${b.rucks}`);
assert.ok(b.touchesAvecSaut / Math.max(1, b.touches) >= 0.6, `Touches avec un sauteur lifté : ${b.touchesAvecSaut}/${b.touches}`);
for (const etape of ['placement', 'liaison', 'impact', 'introduction', 'poussee']) {
  assert.ok(b.etapesMelee.has(etape), `Mêlée : étape « ${etape} » jamais vue (${[...b.etapesMelee].join(', ')})`);
}
if (b.tirs) for (const etape of ['pose', 'pret', 'elan']) {
  assert.ok(b.etapesTir.has(etape), `Tir : étape « ${etape} » jamais vue (${[...b.etapesTir].join(', ')})`);
}
console.log(`OK — ${b.images} images montrées à partir de ${b.envois} envois du film (${(b.octets / b.envois / 1024).toFixed(1)} Ko chacun) ;`
  + ` déplacement maximal d'un corps ${b.sautMax.toFixed(2)} m par image ;`
  + ` ${b.plaquagesAuContact}/${b.plaquages} plaquages commencés au contact (au plus ${b.distancePlaquageMax.toFixed(1)} m) ;`
  + ` ${b.meleesPretes}/${b.melees} mêlées liées packs en place, ${b.touchesPretes}/${b.touches} touches jouées alignement formé (${b.touchesAvecSaut} avec saut),`
  + ` ${b.coupsEnvoiPrets}/${b.coupsEnvoi} coups d'envoi après replacement ; ${b.rucksLies}/${b.rucks} regroupements liés ;`
  + ` mêlée [${[...b.etapesMelee].join(' → ')}], ${b.tirs} tirs [${[...b.etapesTir].join(' → ')}] ; phases : ${[...b.phases].join(', ')}.`);
