// BANC DU CORRECTIF 39 — L'ESSAI QUI GARDE SON ÉLAN (niveau d'IA 7)
//
// Demande : « le joueur ne doit pas passer de 9 m/s à 0 m/s instantanément dès que TRY = true. Conserver le momentum pendant
// le saut, la chute, la glissade. Permettre de glisser sur la pelouse : la distance dépend de sa vitesse. »
//
//   npm run verify:essais -- 12        (nombre de matchs joués ; 12 par défaut)
//
// Ce qu'il tient :
//   1. `planifierEssai` est PUR (aucun tirage dans sa source, la même situation rend le même plan), chaque façon de marquer
//      est atteignable, et chacune répond à sa situation : le plongeon pour assurer quand le défenseur est dans le dos,
//      l'écart quand il est sur le côté, l'essai en force pour un avant sans élan, le grand saut seulement avec de
//      l'espace et de la vitesse — et pas à chaque fois ;
//   2. la glissade dépend de la vitesse : un ailier lancé va loin, un joueur au trot presque pas ;
//   3. la scène a un geste pour chaque façon de marquer (`public/rn26/animations.mjs`), et chaque clip existe ;
//   4. DES MATCHS ENTIERS au niveau 7 : à l'instant de l'essai le marqueur ne perd jamais sa vitesse d'un coup, il ne
//      ralentit jamais plus vite que la pelouse ne le freine, il reste dans l'en-but, le ballon reste dans ses mains, et
//      la marque de la transformation est le point où il a aplati ;
//   5. le MÊME banc au niveau 6 montre ce qui a été corrigé (un marqueur lancé y tombe à 2,6 m/s dès la ligne), et le
//      niveau 6 rejoue à l'identique ;
//   6. deux rejoues du même match au niveau 7 sont identiques.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { avancer } from '../src/lib/moteur/moteur';
import type { EtatMatch } from '../src/lib/moteur/etat';
import * as A from '../src/lib/moteur/animations';
import { LARGEUR, LIGNE_A, LIGNE_B, LONGUEUR } from '../src/lib/moteur/terrain';
import { creerMatchDEmpreinte, empreinte, resumerMatch } from './outilsEmpreinte';

const MATCHS = Math.max(1, Number(process.argv[2] ?? 12));
let controles = 0;
const ok = (condition: unknown, message: string) => { controles++; assert.ok(condition, message); };
const titre = (t: string) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 76 - t.length))}`);

// ═══ 1. LE PLAN ══════════════════════════════════════════════════════════════
titre('1. planifierEssai : pur, atteignable, à sa place');
{
  const source = fs.readFileSync(path.resolve('src/lib/moteur/animations.ts'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/Math\.random|\.rng\(|rng\(/.test(source), 'animations.ts ne tire rien au sort');
}
const base: A.ContexteEssai = { vitesse: 8, defenseur: Infinity, devant: 0, cote: 0, touche: 30, axe: 20, profil: 'arriere', intercepte: false, hasard: 0.9 };
const plan = (plus: Partial<A.ContexteEssai>) => A.planifierEssai({ ...base, ...plus });
ok(JSON.stringify(plan({})) === JSON.stringify(plan({})), 'la même situation rend le même plan');
// Chaque situation de la demande.
ok(plan({ defenseur: 1.8, devant: -0.8 }).style === 'securise' && plan({ defenseur: 1.8, devant: -0.8 }).plonge, 'défenseur dans le dos : il plonge bas pour assurer');
{
  const droite = plan({ defenseur: 2, devant: 0.1, cote: 1 }), gauche = plan({ defenseur: 2, devant: 0.1, cote: -1 });
  ok(droite.style === 'bas' && droite.ecart < 0 && gauche.ecart > 0, 'défenseur sur le côté : il plonge en s’écartant du contact, de l’autre côté');
}
ok(plan({ profil: 'lourd', vitesse: 3.2, defenseur: 1.5 }).style === 'force' && !plan({ profil: 'lourd', vitesse: 3.2, defenseur: 1.5 }).plonge, 'pilier au ras, sans élan : en force, sans plonger');
ok(plan({ touche: 3, vitesse: 8.5 }).style === 'coin' && plan({ touche: 3, vitesse: 8.5 }).plonge, 'ailier lancé le long de la touche : le long plongeon dans le coin');
ok(plan({ vitesse: 8.5, defenseur: 12, hasard: 0.1 }).style === 'extension', 'beaucoup d’espace et de vitesse : le grand saut en extension');
ok(plan({ vitesse: 8.5, defenseur: 12, hasard: 0.6 }).style === 'plongeon', '… mais pas à chaque essai : le plongeon bras tendus sinon');
ok(plan({ vitesse: 8.5, defenseur: 4.5, hasard: 0.1 }).style !== 'extension', 'pas de grand saut avec un défenseur à portée');
ok(plan({ vitesse: 5.5, defenseur: 12, hasard: 0.1 }).style !== 'extension', 'ni sans vitesse');
ok(plan({ vitesse: 4.5, defenseur: 12, axe: 3 }).style === 'poteaux' && !plan({ vitesse: 4.5, defenseur: 12, axe: 3 }).plonge, 'seul sous les poteaux, sans se presser : il aplatit calmement');
ok(plan({ vitesse: 7.5, defenseur: 5 }).style === 'horizontal', 'poursuivi à distance, lancé : le plongeon horizontal');
ok(plan({ vitesse: 8, defenseur: 10, intercepte: true }).style === 'interception', 'après une interception, seul : le plongeon du voleur');
{
  // Balayage de l'espace des situations : tout est atteignable, rien d'inconnu ne sort.
  const vus = new Set<string>();
  let s = 39;
  const alea = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const profils: A.ContexteEssai['profil'][] = ['lourd', 'troisieme', 'demi', 'centre', 'arriere'];
  for (let i = 0; i < 6000; i++) {
    const c: A.ContexteEssai = {
      vitesse: alea() * 10.5, defenseur: alea() < 0.3 ? Infinity : alea() * 14, devant: alea() * 2 - 1, cote: Math.round(alea() * 2 - 1),
      touche: alea() * 35, axe: alea() * 35, profil: profils[Math.floor(alea() * 5)], intercepte: alea() < 0.1, hasard: alea(),
    };
    const p = A.planifierEssai(c);
    vus.add(p.style);
    ok(A.STYLES_ESSAI_VIVANT.includes(p.style), `style connu (${p.style})`);
    ok(!p.plonge || (p.vol >= 0.25 && p.vol <= 1 && p.garde > 0.7 && p.garde <= 1 && p.reception > 0.5 && p.reception <= p.garde && p.frottement >= 7), `un plongeon garde l’essentiel de la vitesse (${p.style})`);
    ok(Math.abs(p.ecart) <= 0.5, 'l’écart reste un écart');
    if (p.style === 'extension') ok(c.vitesse >= 7.4 && c.defenseur >= 7 && c.hasard < 0.34 && c.profil !== 'lourd', 'le grand saut demande de l’espace, de la vitesse, et n’est pas systématique');
    if (p.style === 'force') ok(!p.plonge && (c.profil === 'lourd' || c.profil === 'troisieme'), 'l’essai en force est celui d’un avant, sans plongeon');
  }
  for (const v of A.STYLES_ESSAI_VIVANT) ok(vus.has(v), `essai « ${v} » atteignable`);
}

// ═══ 2. LA GLISSADE ═════════════════════════════════════════════════════════
titre('2. La distance dépend de la vitesse');
{
  const p = plan({ vitesse: 9, defenseur: 5 });
  const vite = A.porteeDuPlongeon(p, 9), moyen = A.porteeDuPlongeon(p, 6), lent = A.porteeDuPlongeon(p, 3.5);
  const total = (x: { vol: number; glissade: number }) => x.vol + x.glissade;
  ok(total(vite) > total(moyen) && total(moyen) > total(lent), 'plus il arrive vite, plus il va loin');
  ok(vite.glissade > 2.2 && total(vite) > 5.5, `un ailier à 9 m/s : ${vite.vol.toFixed(1)} m de vol, ${vite.glissade.toFixed(1)} m de glissade`);
  ok(lent.glissade < 0.7, `à 3,5 m/s, la glissade est presque nulle (${lent.glissade.toFixed(2)} m)`);
  console.log(`   portée d'un plongeon horizontal : 9 m/s → ${total(vite).toFixed(1)} m · 6 m/s → ${total(moyen).toFixed(1)} m · 3,5 m/s → ${total(lent).toFixed(1)} m`);
}

// ═══ 3. LA SCÈNE ════════════════════════════════════════════════════════════
titre('3. La scène a un geste pour chaque façon de marquer');
{
  const B = await import(pathToFileURL(path.resolve('public/rn26/animations.mjs')).href);
  const catalogue = new Set((JSON.parse(fs.readFileSync(path.resolve('public/rn26/motions/catalogue-match-poses.json'), 'utf8')) as { name: string }[]).map((c) => c.name));
  for (const v of A.STYLES_ESSAI_VIVANT) {
    const E = B.ESSAIS[v];
    ok(E, `essai « ${v} » : la scène a son geste`);
    ok(catalogue.has(E.clip), `essai « ${v} » : le clip ${E.clip} existe`);
    if (['plongeon', 'horizontal', 'bas', 'extension', 'coin', 'securise', 'interception'].includes(v)) ok(E.sol > 0 && E.sol <= 1.1, `essai « ${v} » : la scène sait quand le corps touche la pelouse (${E.sol} s)`);
  }
  const scene = fs.readFileSync(path.resolve('public/rn26/scene.js'), 'utf8'), passerelle = fs.readFileSync(path.resolve('public/rn26/destiny.mjs'), 'utf8');
  ok(scene.includes('Correctif 39') && passerelle.includes('tempsEssai') && passerelle.includes('capTerrain'), 'le lecteur installé porte le Correctif 39');
  ok(scene.includes('collectif'), 'et la caméra du contrôle d’équipe, retouchée directement, n’a pas été écrasée');
}

// ═══ 4 et 5. DES MATCHS ENTIERS ═════════════════════════════════════════════
interface Essai {
  match: number; sim: number; nom: string; style?: string; plonge: boolean;
  /** Vitesse au pas d'avant la ligne, au premier pas après, plus forte décélération d'un pas à l'autre (m/s²). */
  avant: number; apres: number; freinage: number;
  /** Mètres parcourus pendant l'aplatissage, écart maximal ballon-marqueur, sortie de l'en-but. */
  metres: number; ballon: number; dehors: boolean;
  /** Écart entre la marque de la transformation et le point d'aplatissage (m, en largeur). */
  marque: number | null;
}

function jouer(k: number, ia: number): { e: EtatMatch; essais: Essai[] } {
  const e = creerMatchDEmpreinte(k, { ia });
  const essais: Essai[] = [];
  let enCours: (Essai & { x0: number; y0: number; v: number; pose?: number }) | null = null;
  let vPorteur = 0, tAvant = 0;
  e.apresPas = () => {
    const dt = Math.max(1e-6, e.sim - tAvant);
    tAvant = e.sim;
    const a = e.aplatissage;
    if (a && a.origine === 'jeu') {
      const m = a.marqueur, v = Math.hypot(m.vitesse.x, m.vitesse.y);
      if (!enCours || enCours.nom !== m.nom || e.sim - enCours.sim > 6) {
        if (enCours) essais.push(enCours);
        enCours = {
          match: k, sim: e.sim, nom: m.nom, style: a.style, plonge: !!a.pose, avant: vPorteur, apres: v, freinage: 0,
          metres: 0, ballon: 0, dehors: false, marque: null, x0: m.pos.x, y0: m.pos.y, v, pose: a.pose?.y,
        };
      } else {
        enCours.freinage = Math.max(enCours.freinage, (enCours.v - v) / dt);
        enCours.v = v;
      }
      enCours.metres = Math.hypot(m.pos.x - enCours.x0, m.pos.y - enCours.y0);
      enCours.ballon = Math.max(enCours.ballon, Math.hypot(e.ballon.x - m.pos.x, e.ballon.y - m.pos.y));
      if (m.pos.x < 0.5 || m.pos.x > LONGUEUR - 0.5 || m.pos.y < 0.4 || m.pos.y > LARGEUR - 0.4) enCours.dehors = true;
      // Un marqueur qui pose le ballon dans le contact peut être repoussé de quelques centimètres : un pas, pas davantage.
      if (m.cote === 'A' ? m.pos.x < LIGNE_B - 0.4 : m.pos.x > LIGNE_A + 0.4) enCours.dehors = true;
    } else if (enCours) {
      // L'essai est validé (ou refusé) : la marque de la transformation, s'il y en a une.
      if (e.tir?.lieu && enCours.pose !== undefined && e.tir.valeur === 2) enCours.marque = Math.abs(e.tir.lieu.y - Math.max(2.5, Math.min(LARGEUR - 2.5, enCours.pose)));
      if (e.phase !== 'tmo') { essais.push(enCours); enCours = null; }
    }
    vPorteur = e.porteur ? Math.hypot(e.porteur.vitesse.x, e.porteur.vitesse.y) : 0;
  };
  let garde = 0;
  while (!e.fini && garde++ < 200000) avancer(e, 0.6);
  if (enCours) essais.push(enCours);
  return { e, essais };
}

titre(`4. ${MATCHS} matchs au niveau 7 : le marqueur garde son élan`);
const vivants: Essai[] = [];
const resumes7: string[] = [];
for (let k = 0; k < MATCHS; k++) {
  const { e, essais } = jouer(k, 7);
  ok(e.fini, `match ${k} : mené à son terme`);
  resumes7.push(empreinte(resumerMatch(e)));
  vivants.push(...essais);
}
ok(vivants.length >= MATCHS * 2, `${vivants.length} essais de jeu courant observés`);
const lances = vivants.filter((x) => x.avant >= 6);
for (const x of vivants) {
  const ou = `match ${x.match}, ${x.sim.toFixed(1)} s, ${x.nom} (${x.style})`;
  ok(x.style && A.STYLES_ESSAI_VIVANT.includes(x.style as A.StyleEssai), `${ou} : une façon de marquer du niveau 7`);
  ok(!x.dehors, `${ou} : il reste dans l’en-but`);
  ok(x.ballon < 0.05, `${ou} : le ballon ne quitte pas ses mains (écart ${x.ballon.toFixed(2)} m)`);
  // Jamais d'arrêt net : au premier pas, il a encore l'essentiel de sa vitesse (un plongeon) ; ensuite la pelouse le freine.
  if (x.plonge && x.avant >= 3.4) ok(x.apres >= x.avant * 0.55, `${ou} : ${x.avant.toFixed(1)} m/s avant la ligne, ${x.apres.toFixed(1)} m/s en l’air — pas d’arrêt net`);
  if (x.plonge) ok(x.freinage <= 60, `${ou} : il ne perd jamais sa vitesse d’un coup (${x.freinage.toFixed(0)} m/s² au plus fort)`);
  if (x.marque !== null) ok(x.marque < 0.05, `${ou} : la transformation se tape du point d’aplatissage (écart ${x.marque.toFixed(2)} m)`);
}
ok(lances.length >= 5, `${lances.length} marqueurs sont arrivés à plus de 6 m/s`);
{
  const plonges = lances.filter((x) => x.plonge);
  const moyenne = plonges.reduce((n, x) => n + x.metres, 0) / Math.max(1, plonges.length);
  ok(plonges.length >= 3 && moyenne >= 3, `un marqueur lancé qui plonge parcourt ${moyenne.toFixed(1)} m après la ligne en moyenne (${plonges.length} essais)`);
  const lents = vivants.filter((x) => x.plonge && x.avant < 4.5);
  if (lents.length >= 2) {
    const m2 = lents.reduce((n, x) => n + x.metres, 0) / lents.length;
    ok(m2 < moyenne, `un plongeon sans élan va moins loin (${m2.toFixed(1)} m contre ${moyenne.toFixed(1)} m)`);
  }
  const styles = new Map<string, number>();
  for (const x of vivants) styles.set(x.style!, (styles.get(x.style!) ?? 0) + 1);
  console.log(`   façons de marquer : ${[...styles].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(' · ')}`);
  ok(styles.size >= 4, `${styles.size} façons de marquer différentes en ${MATCHS} matchs`);
  ok((styles.get('extension') ?? 0) <= vivants.length * 0.2, 'le grand saut reste occasionnel');
}

titre('5. Le même banc au niveau 6 : ce qui a été corrigé, et rien d’autre n’a bougé');
{
  const anciens: Essai[] = [];
  const n = Math.min(MATCHS, 6);
  for (let k = 0; k < n; k++) anciens.push(...jouer(k, 6).essais);
  const lances6 = anciens.filter((x) => x.avant >= 6);
  ok(lances6.length >= 2, `${lances6.length} marqueurs lancés au niveau 6`);
  const pire = Math.min(...lances6.map((x) => x.apres / x.avant));
  ok(pire < 0.5, `au niveau 6, un marqueur lancé perd plus de la moitié de sa vitesse dès la ligne (il lui en reste ${(pire * 100).toFixed(0)} %)`);
  const metres6 = lances6.reduce((s, x) => s + x.metres, 0) / lances6.length;
  const metres7 = lances.reduce((s, x) => s + x.metres, 0) / Math.max(1, lances.length);
  ok(metres7 > metres6 * 1.8, `après la ligne, un marqueur lancé parcourait ${metres6.toFixed(1)} m ; il en parcourt ${metres7.toFixed(1)}`);
  console.log(`   niveau 6 : ${metres6.toFixed(1)} m après la ligne · niveau 7 : ${metres7.toFixed(1)} m`);
}

titre('6. Deux rejoues du même match au niveau 7 sont identiques');
for (let k = 0; k < Math.min(MATCHS, 3); k++) ok(empreinte(resumerMatch(jouer(k, 7).e)) === resumes7[k], `match ${k} : même empreinte`);

console.log(`\n${controles} contrôles réussis.`);
