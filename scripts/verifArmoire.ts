// VÉRIFICATION — L'ARMOIRE À TROPHÉES
//
// Demande : « une armoire à trophée en 3D pour que dans le hall des légendes on
// puisse accéder à l'armoire avec tous les trophées dedans, ou autour s'ils sont
// trop grands ». Le « ou autour » est une règle géométrique : ce script la met à
// l'épreuve sur les VRAIS modèles, sans GPU ni fenêtre.
//
// Il lit la boîte englobante de chaque `.glb` directement dans le fichier (les
// bornes `min`/`max` de l'accesseur POSITION vivent dans le chunk JSON du GLB,
// même quand la géométrie est compressée en Draco), puis applique
// `disposerArmoire()` — la fonction que le composant utilise, à l'identique.
//
// Il contrôle six choses :
//   1. chaque trophée reçoit une place, dans un casier ou au sol ;
//   2. les pièces LARGES partent au sol, les élancées restent en rayon ;
//   3. aucun trophée de rayon ne déborde de son casier ni ne traverse une paroi ;
//   4. les casiers se remplissent SANS TROU (le bug de la première version) ;
//   5. deux trophées ne se retrouvent jamais au même endroit ;
//   6. tout reste dans le champ de la caméra, y compris au palmarès maximum.
//
// Lancer : npx vite-node scripts/verifArmoire.ts

import fs from 'node:fs';
import path from 'node:path';
import { TROPHEES } from '../src/data/trophees';
import { disposerArmoire, casier, CASIERS, COLONNES, type DimensionsArmoire, type TailleModele } from '../src/lib/armoire';

// Doivent rester alignés sur `components/ArmoireTrophees.tsx`.
const HAUTEUR_ARMOIRE = 4;
const MAX_MODELES = CASIERS;
const DISTANCE_CAMERA_MAX = 12;

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(46)} ${valeur}`);
}

// --- lecture de la boîte englobante d'un GLB --------------------------------
// Le GLB : en-tête de 12 octets, puis un chunk JSON. On n'a pas besoin du
// binaire — les bornes de POSITION sont dans le JSON, y compris en Draco.
function bbox(fichier: string): TailleModele | null {
  const buf = fs.readFileSync(fichier);
  if (buf.readUInt32LE(0) !== 0x46546c67) return null; // « glTF »
  const longueurJSON = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + longueurJSON).toString('utf8'));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let trouve = false;
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      const acc = json.accessors?.[prim.attributes?.POSITION];
      if (!acc?.min || !acc?.max) continue;
      trouve = true;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], acc.min[i]);
        max[i] = Math.max(max[i], acc.max[i]);
      }
    }
  }
  if (!trouve) return null;
  // ⚠️ L'échelle du nœud compte : Meshy sort parfois un `mesh_node` mis à
  // l'échelle. On prend la plus grande échelle rencontrée.
  let facteur = 1;
  for (const n of json.nodes ?? []) {
    if (Array.isArray(n.scale)) facteur = Math.max(facteur, ...n.scale.map(Math.abs));
  }
  return {
    x: (max[0] - min[0]) * facteur,
    y: (max[1] - min[1]) * facteur,
    z: (max[2] - min[2]) * facteur,
  };
}

function mesurerArmoire(): DimensionsArmoire {
  const t = bbox(path.join('public', 'm3d', 'armoire.glb'));
  if (!t) throw new Error('armoire.glb illisible — as-tu lancé node scripts/copierTrophees.cjs ?');
  const echelle = HAUTEUR_ARMOIRE / (t.y || 1);
  return { largeur: t.x * echelle, profondeur: t.z * echelle, hauteur: HAUTEUR_ARMOIRE };
}

const DIMS = mesurerArmoire();
const C = casier(DIMS);

// Tous les trophées mesurables, avec leur boîte.
const mesures = Object.values(TROPHEES)
  .map((tr) => ({ tr, taille: bbox(path.join('public', tr.modele)) }))
  .filter((m): m is { tr: Trophee; taille: TailleModele } => m.taille !== null);
type Trophee = (typeof TROPHEES)[string];

console.log(`=== L'ARMOIRE : ${DIMS.largeur.toFixed(2)} × ${DIMS.hauteur.toFixed(2)} × ${DIMS.profondeur.toFixed(2)} ===`);
console.log(`    ${CASIERS} casiers de ${C.largeur.toFixed(2)} × ${C.hauteur.toFixed(2)}`);
console.log(`    ${mesures.length}/${Object.keys(TROPHEES).length} modèles mesurés`);

// Le cas RÉEL : la modale n'affiche jamais plus de `MAX_MODELES` pièces.
const affiches = mesures.slice(0, MAX_MODELES);
const places = disposerArmoire(affiches.map((m) => m.taille), DIMS);

console.log('\n=== 1. CHAQUE TROPHÉE A UNE PLACE ===');
{
  const cassees = places.filter((p) => p.position.some((v) => !Number.isFinite(v)) || !Number.isFinite(p.echelle));
  ligne('positions et échelles calculables', `${places.length - cassees.length}/${places.length}`, cassees.length === 0);
  const dedans = places.filter((p) => !p.dehors).length;
  ligne('répartition dedans / autour', `${dedans} en rayon · ${places.length - dedans} au sol`, true);
}

console.log('\n=== 2. LES PIÈCES LARGES VONT AU SOL ===');
{
  // Un bouclier est LARGE et PLAT : son rapport largeur/hauteur le sort des
  // étagères. C'est exactement le cas que la demande visait.
  const parRapport = mesures
    .map((m) => ({ nom: m.tr.nom, ratio: m.taille.x / (m.taille.y || 1), taille: m.taille }))
    .sort((a, b) => b.ratio - a.ratio);
  const large = parRapport[0];
  const etroit = parRapport[parRapport.length - 1];
  // Seuls face à une armoire vide : le large doit sortir, l'élancé doit rester.
  const sortLarge = disposerArmoire([large.taille], DIMS)[0].dehors;
  const resteEtroit = !disposerArmoire([etroit.taille], DIMS)[0].dehors;
  ligne('le modèle le plus large est posé au sol',
    `${large.nom} (l/h ${large.ratio.toFixed(2)}) → ${sortLarge ? 'au sol' : 'en rayon'}`, sortLarge);
  ligne('le modèle le plus élancé reste en rayon',
    `${etroit.nom} (l/h ${etroit.ratio.toFixed(2)}) → ${resteEtroit ? 'en rayon' : 'au sol'}`, resteEtroit);
  console.log(`     les 4 plus larges : ${parRapport.slice(0, 4).map((p) => `${p.nom} ${p.ratio.toFixed(2)}`).join(' · ')}`);
}

console.log('\n=== 3. RIEN NE DÉBORDE ===');
{
  const debordent: string[] = [];
  const traversent: string[] = [];
  affiches.forEach((m, i) => {
    const p = places[i];
    if (p.dehors) return;
    const l = m.taille.x * p.echelle;
    const h = m.taille.y * p.echelle;
    if (l > C.largeur || h > C.hauteur) debordent.push(`${m.tr.id} (${l.toFixed(2)}×${h.toFixed(2)})`);
    if (Math.abs(p.position[0]) + l / 2 > DIMS.largeur / 2) traversent.push(m.tr.id);
    if (p.position[1] < 0 || p.position[1] + h > DIMS.hauteur) traversent.push(m.tr.id);
  });
  ligne('trophées de rayon dans leur casier', debordent.length ? debordent.join(', ') : 'tous', debordent.length === 0);
  ligne('aucun trophée ne traverse une paroi', traversent.length ? traversent.join(', ') : 'aucun', traversent.length === 0);
}

console.log('\n=== 4. LES CASIERS SE REMPLISSENT SANS TROU ===');
{
  // ⚠️ LE BUG DE LA PREMIÈRE VERSION. Le placement se décidait trophée par
  // trophée à partir du seul rang : dès qu'une pièce partait au sol, son casier
  // restait vide et la vitrine était trouée. On vérifie ici que les casiers
  // occupés forment bien une suite continue, à partir du premier.
  const occupes = places.filter((p) => !p.dehors)
    .map((p) => {
      const colonne = Math.round((p.position[0] + C.utileL / 2 - C.largeur * 0.5) / C.largeur);
      const ligneY = Math.round((C.basY + C.utileH - C.hauteur * 0.28 - C.hauteur * 0.5 - p.position[1]) / C.hauteur);
      return ligneY * COLONNES + colonne;
    })
    .sort((a, b) => a - b);
  const attendu = occupes.map((_, i) => i);
  const continu = occupes.length === attendu.length && occupes.every((v, i) => v === attendu[i]);
  ligne('casiers occupés d’affilée, sans saut',
    occupes.length ? `${occupes.length} casiers : ${occupes.join(', ')}` : 'aucun', continu);
}

console.log('\n=== 5. AUCUNE COLLISION ===');
{
  const vues = new Map<string, string>();
  const collisions: string[] = [];
  affiches.forEach((m, i) => {
    const cle = places[i].position.map((v) => v.toFixed(3)).join('|');
    const deja = vues.get(cle);
    if (deja) collisions.push(`${deja} ↔ ${m.tr.id}`);
    else vues.set(cle, m.tr.id);
  });
  ligne('deux trophées au même endroit', collisions.length ? collisions.join(', ') : 'aucun', collisions.length === 0);
}

console.log('\n=== 6. TOUT RESTE DANS LE CHAMP ===');
{
  const trop = places.filter((p) => Math.hypot(p.position[0], p.position[2]) > DISTANCE_CAMERA_MAX);
  const plusLoin = places.reduce((a, p) => Math.max(a, Math.hypot(p.position[0], p.position[2])), 0);
  ligne('pièces à portée de caméra',
    `la plus éloignée à ${plusLoin.toFixed(2)} (max ${DISTANCE_CAMERA_MAX})`, trop.length === 0);

  // Le cas extrême : QUE des boucliers, donc seize pièces au sol d'un coup.
  const boucliers = Array.from({ length: MAX_MODELES }, () => ({ x: 3, y: 1, z: 0.4 }));
  const auSol = disposerArmoire(boucliers, DIMS);
  const loin = auSol.reduce((a, p) => Math.max(a, Math.hypot(p.position[0], p.position[2])), 0);
  ligne('seize pièces au sol tiennent dans le champ',
    `${auSol.filter((p) => p.dehors).length}/${MAX_MODELES} au sol, la plus loin à ${loin.toFixed(2)}`,
    auSol.every((p) => p.dehors) && loin <= DISTANCE_CAMERA_MAX);
}

console.log(echecs === 0 ? '\n✅ Armoire conforme.' : `\n❌ ${echecs} contrôle(s) en échec.`);
