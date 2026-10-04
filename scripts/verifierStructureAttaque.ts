// LA FORME COLLECTIVE DE L'ATTAQUE (cadence détaillée) — Correctif 8.
//
// « On ne doit plus voir : ballon à droite → dix joueurs courent tous à droite. »
// Ce banc joue des matchs à la vitesse réelle et regarde, trois fois par
// seconde, comment l'équipe qui a le ballon occupe le terrain :
//   - les places VISÉES ne s'empilent pas dans un couloir (c'était le défaut :
//     des décalages depuis le ballon, tous rabotés sur la même ligne de touche) ;
//   - les deux ailiers tiennent leur ligne ;
//   - la largeur est occupée, couloir par couloir ;
//   - les avants servis par le 9 prennent le ballon lancés ;
//   - la ligne d'avantage se gagne plus souvent qu'elle ne se perd.
//
// Lancer : npm run verify:structure

import assert from 'node:assert/strict';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import type { EtatMatch } from '../src/lib/moteur/etat';

const N = Number(process.argv[2] ?? 6);
const b = {
  ticks: 0, visees: 0, visees6: 0, aile: 0, ailierBord: 0, ailiers: 0, ailierLoin: 0, largeur: 0, couloirs: 0, suiveurs: 0,
  receptionsAvant: 0, vitesseAvant: 0, avantArrete: 0, rucks: 0, gagnes: 0, perdus: 0, essais: 0, points: 0, passes: 0, pieds: 0, phasesMax: 0,
  blocServis: 0, blocArretes: 0,
};
for (let k = 0; k < N; k++) {
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1), 24, 20, `structure-${k}`, undefined,
    { tempsReel: true, niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, resserrement: 1 });
  let volVu: unknown = null, ruckVu: unknown = null, n = 0;
  e.apresPas = (m: EtatMatch) => {
    if (m.vol && m.vol !== volVu) {
      volVu = m.vol;
      if (m.vol.type === 'pied') b.pieds++;
      else {
        b.passes++;
        const r = m.vol.receveur;
        if (r?.avant) {
          const v = Math.hypot(r.vitesse.x, r.vitesse.y);
          b.receptionsAvant++; b.vitesseAvant += v; if (v < 1.5) b.avantArrete++;
          if (m.vol.auteur.numero === 9 && m.blocPrepare?.ids.includes(r.id)) { b.blocServis++; if (v < 1.5) b.blocArretes++; }
        }
      }
    }
    if (m.ruck && m.ruck !== ruckVu) {
      ruckVu = m.ruck; b.rucks++;
      if ((m.avantage ?? 0) > 0) b.gagnes++; else if ((m.avantage ?? 0) < 0) b.perdus++;
      b.phasesMax = Math.max(b.phasesMax, m.phasesDepuisArret);
    }
    if (n++ % 3 || !(m.phase === 'jeuCourant' || m.phase === 'ruck')) return;
    const att = m.pions.filter((p) => p.surLeTerrain && p.sanction <= 0 && p.cote === m.possession && p.role !== 'ruck' && !p.corps);
    if (att.length < 10) return;
    b.ticks++;
    // Les places VISÉES : c'est la structure voulue, sans les regroupements qui se défont.
    let visees = 0, aile = 0;
    for (const p of att) {
      let c = 0;
      for (const q of att) if (Math.hypot(p.cible.x - q.cible.x, p.cible.y - q.cible.y) < 5) c++;
      visees = Math.max(visees, c);
      if (c >= 5 && Math.min(p.cible.y, 70 - p.cible.y) < 12) aile = 1;
    }
    b.visees += visees; if (visees >= 6) b.visees6++; b.aile += aile;
    for (const p of att) {
      if (p.numero !== 11 && p.numero !== 14) continue;
      const d = p.numero === 11 ? p.pos.y : 70 - p.pos.y;
      b.ailierBord += d; b.ailiers++; if (d > 15) b.ailierLoin++;
    }
    const ys = att.map((p) => p.pos.y);
    b.largeur += Math.max(...ys) - Math.min(...ys);
    b.couloirs += new Set(att.map((p) => Math.min(4, Math.floor(p.pos.y / 14)))).size;
    // Ceux qui courent vers le ballon de loin, sans être du temps de jeu.
    for (const p of att) {
      const dy = m.ballon.y - p.pos.y, d = Math.hypot(m.ballon.x - p.pos.x, dy), v = Math.hypot(p.vitesse.x, p.vitesse.y);
      if (d > 12 && v > 3 && Math.abs(dy) > 8 && (p.vitesse.y * dy) / (v * Math.abs(dy)) > 0.75) b.suiveurs++;
    }
  };
  let garde = 0;
  while (!e.fini && garde++ < 60000 && e.t < 2400) avancer(e, 0.6);
  b.essais += e.essaisA + e.essaisB; b.points += e.scoreA + e.scoreB;
}
const t = Math.max(1, b.ticks);
const empilees = b.aile / t * 100, ailier = b.ailierBord / Math.max(1, b.ailiers), couloirs = b.couloirs / t;
const arretes = b.avantArrete / Math.max(1, b.receptionsAvant) * 100, blocArretes = b.blocArretes / Math.max(1, b.blocServis) * 100;
// Avant le Correctif 8 : places empilées près d'une touche 9,3 % du temps, ailiers à 7,3 m, 4,5 couloirs,
// 18 % d'avants servis à l'arrêt (34 % pour le bloc servi par le 9).
assert.ok(empilees < 6.5, `Places empilées près d'une touche : ${empilees.toFixed(1)} % du temps`);
assert.ok(ailier < 6.5, `Les ailiers quittent leur ligne : ${ailier.toFixed(1)} m en moyenne`);
assert.ok(couloirs > 4.55, `Largeur mal occupée : ${couloirs.toFixed(2)} couloirs sur 5`);
assert.ok(arretes < 16, `Avants servis à l'arrêt : ${arretes.toFixed(0)} %`);
assert.ok(blocArretes < 18, `Bloc servi par le 9 à l'arrêt : ${blocArretes.toFixed(0)} %`);
assert.ok(b.gagnes > b.perdus, `La ligne d'avantage se perd plus qu'elle ne se gagne : ${b.gagnes} contre ${b.perdus}`);
console.log(`OK — ${N} × 40 min : cinq places ou plus empilées près d'une touche ${empilees.toFixed(1)} % du temps (plus gros paquet visé ${(b.visees / t).toFixed(1)}) ;`
  + ` ailiers à ${ailier.toFixed(1)} m de leur ligne, largeur occupée ${(b.largeur / t).toFixed(0)} m sur ${couloirs.toFixed(1)} couloirs ;`
  + ` ${(b.suiveurs / t).toFixed(2)} joueur lancé vers le ballon de loin par relevé ;`
  + ` avants à la réception ${(b.vitesseAvant / Math.max(1, b.receptionsAvant)).toFixed(1)} m/s, à l'arrêt ${arretes.toFixed(0)} % (bloc servi par le 9 : ${blocArretes.toFixed(0)} %) ;`
  + ` ligne d'avantage gagnée ${(b.gagnes / Math.max(1, b.rucks) * 100).toFixed(0)} %, perdue ${(b.perdus / Math.max(1, b.rucks) * 100).toFixed(0)} % sur ${b.rucks} rucks ;`
  + ` ${(b.essais / N).toFixed(1)} essais et ${(b.points / N).toFixed(1)} points par 40 min, séquence la plus longue ${b.phasesMax} temps.`);
