// LE SCORE ET LA TRAJECTOIRE D'UN TIR DISENT LA MÊME CHOSE.
//
// Signalé en jeu : « le ballon ne passe visuellement pas entre les poteaux,
// mais les points sont quand même ajoutés ». Le moteur décidait du résultat,
// puis visait un point de chute derrière les poteaux : depuis un tee excentré,
// la droite qui y mène coupait la ligne de but à côté du poteau.
//
// Ce banc relit chaque tir sur sa TRAJECTOIRE — où le ballon traverse le plan
// des poteaux, à quelle hauteur — et la confronte au résultat compté :
//   1. sur vingt mille tirs tirés au hasard (tee, résultat, tirages) ;
//   2. sur des matchs entiers, en cadence normale puis détaillée, pénalités,
//      transformations et drops compris.
//
// Lancer : npx vite-node scripts/verifierTirsAuBut.ts

import assert from 'node:assert/strict';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { AXE, LARGEUR, LIGNE_A, LIGNE_B } from '../src/lib/moteur/terrain';
import {
  DEMI_POTEAUX, HAUTEUR_BARRE, passageAuxPoteaux, positionVol, tirPasseEntreLesPoteaux, viseeTir, viseeTirVariee,
} from '../src/lib/moteur/trajectoire';
import type { EtatMatch } from '../src/lib/moteur/etat';

// ── 1. La géométrie seule ────────────────────────────────────────────────────
let graine = 20261004;
const alea = () => { graine = (Math.imul(graine, 1664525) + 1013904223) >>> 0; return graine / 4294967296; };
const issues: Record<string, number> = {};
let margeBarre = Infinity, margePoteau = Infinity, margeDehors = Infinity;
for (let i = 0; i < 20_000; i++) {
  const cote = alea() < .5 ? 'A' : 'B';
  const ligne = cote === 'A' ? LIGNE_B : LIGNE_A;
  // Du pied des poteaux jusqu'à cinquante-cinq mètres, d'une touche à l'autre.
  const recul = 5 + alea() * 50;
  const de = { x: cote === 'A' ? ligne - recul : ligne + recul, y: 2 + alea() * (LARGEUR - 4) };
  const reussi = alea() < .6;
  const visee = viseeTir(de, cote, reussi, alea(), alea(), alea());
  issues[visee.issue] = (issues[visee.issue] ?? 0) + 1;
  const vol = { de, vers: visee.vers, duree: visee.duree };
  const vu = tirPasseEntreLesPoteaux(vol, cote);
  assert.equal(vu, reussi, `Tir ${reussi ? 'réussi' : 'manqué'} depuis ${recul.toFixed(0)} m, y = ${de.y.toFixed(0)} : la trajectoire dit ${vu ? 'dedans' : 'dehors'} (${visee.issue}).`);
  const p = passageAuxPoteaux(vol, cote);
  if (reussi) {
    assert.ok(p, 'Un tir réussi traverse le plan des poteaux.');
    margeBarre = Math.min(margeBarre, p.hauteur - HAUTEUR_BARRE);
    margePoteau = Math.min(margePoteau, DEMI_POTEAUX - Math.abs(p.ecart));
  } else if (p && p.hauteur > HAUTEUR_BARRE) {
    margeDehors = Math.min(margeDehors, Math.abs(p.ecart) - DEMI_POTEAUX);
  }
  assert.ok(visee.vers.y >= 1 && visee.vers.y <= LARGEUR - 1, 'Le ballon retombe dans le terrain, pas dans la tribune.');
  assert.ok(visee.vers.x >= 1 && visee.vers.x <= LIGNE_B + LIGNE_A - 1, 'Le ballon retombe avant la ligne de ballon mort.');
}
assert.ok(margeBarre > .5, `Un tir réussi passe nettement au-dessus de la barre (marge minimale ${margeBarre.toFixed(2)} m).`);
assert.ok(margePoteau > .9, `Un tir réussi passe nettement entre les poteaux (marge minimale ${margePoteau.toFixed(2)} m).`);
assert.ok(margeDehors > .9, `Un tir manqué sur le côté passe nettement dehors (marge minimale ${margeDehors.toFixed(2)} m).`);
assert.ok(issues.gauche > 500 && issues.droite > 500 && issues.court > 100, 'Les tirs manqués le sont à gauche, à droite ou trop court.');
console.log('géométrie : 20 000 tirs |', issues, `| marges : barre ${margeBarre.toFixed(2)} m, poteau ${margePoteau.toFixed(2)} m, dehors ${margeDehors.toFixed(2)} m`);

// ── 1 bis. Les tirs « à leur manière » de l'IA par poste : vent, hauteur, poteau ──
{
  const vus: Record<string, number> = {};
  let dureeMin = Infinity, dureeMax = 0, sommetMin = Infinity, sommetMax = 0, deriveMax = 0, ecartMaxReussi = 0, largeMax = 0;
  for (let i = 0; i < 20_000; i++) {
    const cote = alea() < .5 ? 'A' : 'B';
    const ligne = cote === 'A' ? LIGNE_B : LIGNE_A;
    const recul = 5 + alea() * 50;
    const de = { x: cote === 'A' ? ligne - recul : ligne + recul, y: 2 + alea() * (LARGEUR - 4) };
    const reussi = alea() < .6;
    const contexte = {
      puissance: 45 + alea() * 50, precision: 45 + alea() * 50, fraicheur: 30 + alea() * 70, style: alea() * 2 - 1,
      ventDos: (alea() - .5) * 22, ventTravers: (alea() - .5) * 22, pression: alea() < .3 ? 1 : 0,
    };
    const visee = viseeTirVariee(de, cote, reussi, alea(), alea(), alea(), contexte);
    vus[visee.issue] = (vus[visee.issue] ?? 0) + 1;
    const vol = { de, vers: visee.vers, duree: visee.duree, derive: visee.derive, ricochet: visee.ricochet };
    const dedans = tirPasseEntreLesPoteaux(vol, cote);
    assert.equal(dedans, reussi, `Tir varié ${reussi ? 'réussi' : 'manqué'} (${visee.issue}) depuis ${recul.toFixed(0)} m : la trajectoire dit ${dedans ? 'dedans' : 'dehors'}.`);
    const p = passageAuxPoteaux(vol, cote);
    if (reussi && !visee.ricochet) {
      assert.ok(p && p.hauteur > HAUTEUR_BARRE + .4 && Math.abs(p.ecart) < DEMI_POTEAUX - .2, 'Un tir réussi passe nettement dedans.');
      ecartMaxReussi = Math.max(ecartMaxReussi, Math.abs(p.ecart));
    }
    if (!reussi && p && p.hauteur > HAUTEUR_BARRE && !visee.ricochet) {
      assert.ok(Math.abs(p.ecart) > DEMI_POTEAUX + .25, `Un tir manqué sur le côté passe dehors (${p.ecart.toFixed(2)} m).`);
      largeMax = Math.max(largeMax, Math.abs(p.ecart) - DEMI_POTEAUX);
    }
    // Ce que l'écran dessine au plan des poteaux est bien ce que le calcul annonce.
    if (p && !visee.ricochet) {
      const vu = positionVol({ ...vol, ecoule: p.t, type: 'pied', intention: 'drop', hauteur: 1 });
      assert.ok(Math.abs(vu.x - ligne) < .05 && Math.abs(vu.y - AXE - p.ecart) < .05 && Math.abs(vu.hauteur - p.hauteur) < .05, 'La courbe dessinée passe où le calcul le dit.');
    }
    if (visee.ricochet) {
      const choc = positionVol({ ...vol, ecoule: visee.ricochet.t, ricochet: undefined, type: 'pied', intention: 'drop', hauteur: 1 });
      assert.ok(Math.abs(Math.abs(choc.y - AXE) - DEMI_POTEAUX) < .08 && choc.hauteur > HAUTEUR_BARRE, 'Un ballon sur le poteau touche bien le montant, au-dessus de la barre.');
    }
    dureeMin = Math.min(dureeMin, visee.duree); dureeMax = Math.max(dureeMax, visee.duree);
    const sommet = .19 + 9.81 * visee.duree * visee.duree / 8;
    sommetMin = Math.min(sommetMin, sommet); sommetMax = Math.max(sommetMax, sommet);
    deriveMax = Math.max(deriveMax, Math.abs(visee.derive?.y ?? 0));
    assert.ok(visee.vers.y >= 1 && visee.vers.y <= LARGEUR - 1 && visee.vers.x >= 1 && visee.vers.x <= LIGNE_B + LIGNE_A - 1, 'Le ballon retombe dans l’enceinte.');
  }
  for (const issue of ['dedans', 'poteauRentrant', 'poteauSortant', 'gauche', 'droite', 'court', 'sousLaBarre']) {
    assert.ok((vus[issue] ?? 0) > 40, `L’issue « ${issue} » doit exister (${vus[issue] ?? 0}).`);
  }
  assert.ok(sommetMax - sommetMin > 6, 'Les tirs n’ont pas tous la même hauteur.');
  assert.ok(ecartMaxReussi > 2 && largeMax > 5, 'Un tir réussi peut frôler le poteau ; un raté peut passer très large.');
  console.log('tirs variés : 20 000 |', vus, `| vol de ${dureeMin.toFixed(2)} à ${dureeMax.toFixed(2)} s, sommet de ${sommetMin.toFixed(1)} à ${sommetMax.toFixed(1)} m, dérive du vent jusqu’à ${deriveMax.toFixed(1)} m, réussi jusqu’à ${ecartMaxReussi.toFixed(2)} m de l’axe, raté jusqu’à ${largeMax.toFixed(1)} m du poteau`);
}

// ── 2. Des matchs entiers ────────────────────────────────────────────────────
function jouer(cle: string, cadenceDetaillee: boolean, ia?: number) {
  const e: EtatMatch = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1),
    27, 24, cle, undefined, { scoreSurTerrain: true, niveau: 'pro', cadenceDetaillee, ...(ia ? { ia, placementJoue: true } : {}) });
  e.carriereDixMinutes = true;
  let vu: unknown = null, tirs = 0, drops = 0, contres = 0, garde = 0;
  // Ce que la trajectoire a annoncé pour le tir en cours, confronté aux points réellement marqués.
  let attendu: { points: number; cote: 'A' | 'B'; avant: number; libelle: string } | null = null;
  const score = (cote: 'A' | 'B') => (cote === 'A' ? e.scoreA : e.scoreB);
  while (!e.fini && garde++ < 80_000) {
    avancer(e, .15);
    const vol = e.vol;
    if (vol && vol !== vu && vol.type === 'pied') {
      vu = vol;
      const tir = e.tir?.volLance ? e.tir : null;
      const drop = !tir && vol.intention === 'drop' && e.dropEnCours ? e.dropEnCours : null;
      if (tir || drop) {
        const cote = vol.auteur.cote;
        const dedans = tirPasseEntreLesPoteaux(vol, cote);
        const reussi = tir ? !!tir.reussi : !!drop!.reussi;
        if (tir?.contre || drop?.issue === 'contre' || drop?.issue === 'malFrappe') contres++;
        else {
          assert.equal(dedans, reussi, `${cle} · ${tir ? (tir.valeur === 2 ? 'transformation' : 'pénalité') : 'drop'} de ${vol.auteur.nom} à ${e.minute}′ : compté ${reussi ? 'réussi' : 'manqué'}, vu ${dedans ? 'entre les poteaux' : 'dehors'}.`);
        }
        if (tir) tirs++; else drops++;
        attendu = { points: reussi ? (tir ? tir.valeur : 3) : 0, cote, avant: score(cote), libelle: `${vol.auteur.nom} à ${e.minute}′` };
      }
    }
    // Le ballon est retombé : les points marqués sont ceux que la trajectoire annonçait.
    if (attendu && !e.vol) {
      assert.equal(score(attendu.cote) - attendu.avant, attendu.points, `${cle} · tir de ${attendu.libelle} : ${attendu.points} point(s) annoncé(s) par la trajectoire.`);
      attendu = null;
    }
  }
  assert.ok(e.fini, `${cle} : le match va à son terme.`);
  return { tirs, drops, contres, score: `${e.scoreA}-${e.scoreB}` };
}
for (const [detaillee, ia] of [[false, 0], [true, 0], [true, 2]] as const) {
  let tirs = 0, drops = 0, contres = 0;
  const scores: string[] = [];
  const combien = ia ? 16 : 8;
  for (let i = 0; i < combien; i++) {
    const r = jouer(`tirs-${detaillee ? 'detail' : 'normal'}-${ia}-${i}`, detaillee, ia || undefined);
    tirs += r.tirs; drops += r.drops; contres += r.contres; scores.push(r.score);
  }
  assert.ok(tirs >= 8, `Cadence ${detaillee ? 'détaillée' : 'normale'} : assez de tirs pour conclure (${tirs}).`);
  console.log(`cadence ${detaillee ? 'détaillée' : 'normale'}${ia ? ', IA par poste et vent' : ''} : ${combien} matchs, ${tirs} tirs au but, ${drops} drops, ${contres} contrés ou mal frappés | ${scores.join(' ')}`);
}
console.log('✓ Chaque tir compté passe entre les poteaux au-dessus de la barre ; chaque tir manqué passe à côté ou retombe trop court.');
void AXE;
