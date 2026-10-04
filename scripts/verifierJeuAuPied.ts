// LE JEU AU PIED ET LE LANCEUR DE TOUCHE (cadence détaillée) — Correctif 8.
//
// Ce banc joue des matchs à la vitesse réelle, fait lire chaque image au lecteur
// 3D installé dans `public/rn26/`, et vérifie :
//   - qu'à la frappe le botteur est tourné vers là où part le ballon (un coup de
//     pied sur vingt-cinq partait dans son dos) ;
//   - que chercher la touche n'est plus une certitude : des touches manquées,
//     des ballons qui restent en jeu, et un gain qui va de dix à cinquante mètres ;
//   - que le lanceur va chercher le ballon, le ramasse, et lance les deux pieds
//     hors du terrain, tourné vers le couloir.
//
// Lancer : npm run verify:pied
import assert from 'node:assert/strict';
import { avancer, creerMatch, geometrieMelee, TEMPS_MELEE, RITUEL_TIR } from '../src/lib/moteur/moteur';
import { positionVol } from '../src/lib/moteur/trajectoire';
import { porteurPourAffichage } from '../src/lib/moteur/dynamique';
import { effectifDuClub } from '../src/lib/effectif';
// @ts-expect-error
import { DestinyMatch } from '../public/rn26/destiny.mjs';
const outils = { porteurPourAffichage, positionVol, geometrieMelee, TEMPS_MELEE, RITUEL_TIR };
const stats: Record<string, { n: number; envers: number; travers: number }> = {};
const exemples: string[] = [];
const issues: Record<string, number> = {};
const gains: number[] = [];
const touches = { n: 0, ramassees: 0, dehors: 0, versTerrain: 0, enCourseAuLancer: 0, attente: 0 };
for (const cle of (process.argv[2] ?? 'pied-1,pied-2').split(',')) {
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1), 24, 20, cle, undefined,
    { tempsReel: true, niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, resserrement: 1 });
  const scene: any = new DestinyMatch({ etat: e, outils });
  const caps = new Map<string, { cap: number; source: string; geste: string }>();
  let volVu: unknown = null, toucheVue: unknown = null, lancerVu = false, debutTouche = 0;
  for (let t = 0; t < 2400 && !e.fini; t += 1 / 15) {
    avancer(e, 1 / 15); scene.observe(); scene.slots = scene.formation(scene.offset());
    for (const p of scene.players) {
      const d = scene.motion(p, scene.offset());
      const vit = Math.hypot(p.vx, p.vz);
      const prec = caps.get(p.id);
      if (d.heading !== null && d.heading !== undefined) caps.set(p.id, { cap: d.heading, source: 'geste', geste: d.name ?? 'loco' });
      else if (d.anchor) caps.set(p.id, { cap: d.anchor.heading, source: 'ancre', geste: d.name ?? 'loco' });
      else if (vit > .35) caps.set(p.id, { cap: Math.atan2(p.vx, p.vz) + Math.PI, source: 'course', geste: d.name ?? 'loco' });
      else if (prec) prec.geste = d.name ?? 'loco';
    }
    // ── La touche : ballon ramassé, lanceur hors du terrain et tourné vers le couloir ──
    const c = e.conquete;
    if (c?.type === 'touche') {
      if (c !== toucheVue) { toucheVue = c; lancerVu = false; touches.n++; debutTouche = e.sim; }
      const lanceur = e.pions.find(p => p.id === c.lanceurId);
      if (!lancerVu && c.progression > 0.42 && lanceur) {
        lancerVu = true;
        touches.attente += e.sim - debutTouche;
        if (c.ramassage === 'tenu') touches.ramassees++;
        if (lanceur.pos.y < 0 || lanceur.pos.y > 70) touches.dehors++;
        if (Math.hypot(lanceur.vitesse.x, lanceur.vitesse.y) > 1) touches.enCourseAuLancer++;
        const cap = caps.get(lanceur.id);
        const voulu = Math.atan2(35 - lanceur.pos.y, 0) + Math.PI;
        if (cap && Math.abs(Math.atan2(Math.sin(cap.cap - voulu), Math.cos(cap.cap - voulu))) < 0.5) touches.versTerrain++;
      }
    }
    const v = e.vol;
    if (!v || v.type !== 'pied' || v === volVu) continue;
    volVu = v;
    const sA = v.auteur.cote === 'A' ? 1 : -1;
    if (['degagement', 'occupation', 'penaltouche'].includes(v.intention)) {
      const dehors = v.vers.y < 0 || v.vers.y > 70;
      const gain = (v.vers.x - v.de.x) * sA;
      const bord = Math.min(v.vers.y, 70 - v.vers.y);
      const cle2 = v.intention === 'penaltouche' ? 'pénaltouche trouvée' : dehors ? 'touche trouvée' : bord < 5 ? 'reste en jeu, à moins de 5 m de la ligne' : gain < 14 ? 'court dans le terrain' : 'dans le terrain';
      issues[cle2] = (issues[cle2] ?? 0) + 1;
      if (dehors) gains.push(gain);
    } else if (v.intention === 'rasant' && v.duree < 0.7) issues['contré'] = (issues['contré'] ?? 0) + 1;
    const cp = caps.get(v.auteur.id);
    if (!cp) continue;
    const voulu = Math.atan2(v.vers.y - v.de.y, v.vers.x - v.de.x) + Math.PI;
    const err = Math.abs(Math.atan2(Math.sin(cp.cap - voulu), Math.cos(cp.cap - voulu))) * 180 / Math.PI;
    const cle3 = `${v.intention} · cap pris sur ${cp.source}`;
    const s = stats[cle3] ??= { n: 0, envers: 0, travers: 0 };
    s.n++; if (err > 120) s.envers++; else if (err > 50) s.travers++;
    if (err > 50 && exemples.length < 10) exemples.push(`${(e.t / 60).toFixed(1)} min ${cle3} (${cp.geste}) n°${v.auteur.numero}${v.auteur.cote} erreur ${err.toFixed(0)}° phase ${e.phase}`);
  }
}
let n = 0, envers = 0, travers = 0;
for (const s of Object.values(stats)) { n += s.n; envers += s.envers; travers += s.travers; }
console.log(`COUPS DE PIED : ${n}, à l'envers ${envers}, de travers ${travers}`);
for (const x of exemples) console.log('  ' + x);
console.log('ISSUES : ' + Object.entries(issues).map(([k, v]) => `${k} ${v}`).join(' · '));
gains.sort((a, b) => a - b);
if (gains.length) console.log(`GAIN DES TOUCHES TROUVÉES : de ${gains[0].toFixed(0)} à ${gains.at(-1)!.toFixed(0)} m, médiane ${gains[Math.floor(gains.length / 2)].toFixed(0)} m — ${gains.map(g => g.toFixed(0)).join(' ')}`);
console.log(`TOUCHES : ${touches.n}, ballon ramassé avant le lancer ${touches.ramassees}, lanceur hors du terrain ${touches.dehors}, tourné vers le couloir ${touches.versTerrain}, encore en course ${touches.enCourseAuLancer}, ${(touches.attente / Math.max(1, touches.n)).toFixed(1)} s entre la sortie et le lancer`);
const manquees = (issues['reste en jeu, à moins de 5 m de la ligne'] ?? 0) + (issues['court dans le terrain'] ?? 0) + (issues['dans le terrain'] ?? 0) + (issues['contré'] ?? 0);
assert.ok(n >= 40, `Trop peu de coups de pied observés : ${n}`);
assert.ok(envers / n <= 0.025, `Coups de pied partis dans le dos du botteur : ${envers} sur ${n}`);
assert.ok(manquees >= 2, 'Aucune touche manquée : chercher la touche est redevenu une certitude');
assert.ok(gains.length >= 10 && gains[0] < 22 && gains[gains.length - 1] > 42, `Le gain d'une touche ne varie pas assez : de ${gains[0]?.toFixed(0)} à ${gains.at(-1)?.toFixed(0)} m`);
assert.ok(touches.n >= 10 && touches.ramassees === touches.n, `Touches lancées sans que le ballon ait été ramassé : ${touches.n - touches.ramassees} sur ${touches.n}`);
assert.ok(touches.dehors >= touches.n * 0.95, `Lanceur dans le terrain au moment du lancer : ${touches.n - touches.dehors} sur ${touches.n}`);
assert.ok(touches.versTerrain >= touches.n * 0.95 && touches.enCourseAuLancer === 0, 'Lanceur mal tourné ou encore en course au moment du lancer');
console.log('OK');
