// VÉRIFICATION — L'ARMOIRE À TROPHÉES
//
// Demande initiale : « une armoire à trophée en 3D pour que dans le hall des
// légendes on puisse accéder à l'armoire avec tous les trophées dedans, ou
// autour s'ils sont trop grands ». Puis, après l'avoir vue en jeu : « les
// trophées font minuscules et certains sont entre deux étagères ; j'aimerais
// que le bouclier de Brennus soit grand à côté de l'armoire et certains
// boucliers contre l'armoire, posés ; le bouclier fait la taille d'un buste de
// rugbyman, et les grosses coupes pareil ».
//
// Ce script met tout ça à l'épreuve sur les VRAIS modèles, sans GPU ni fenêtre.
//
// ⚠️ IL DÉCODE VRAIMENT LA GÉOMÉTRIE. La version précédente se contentait des
// bornes `min`/`max` de l'accesseur POSITION, lisibles dans le chunk JSON du
// GLB : de quoi mesurer une boîte englobante, pas de quoi savoir où sont les
// étagères — et c'est exactement ce qui manquait. On passe donc le maillage du
// meuble au décodeur Draco livré avec `three` (aucune dépendance de plus), puis
// à `detecterEtageres()`, la fonction que le composant utilise, à l'identique.
//
// Il contrôle sept choses :
//   1. les étagères du meuble sont trouvées, et elles se tiennent ;
//   2. chaque trophée reçoit une place, sur une tablette ou au sol ;
//   3. AUCUN trophée ne flotte entre deux étagères (le bug signalé) ;
//   4. rien ne déborde : ni en hauteur, ni en largeur, ni à travers une paroi ;
//   5. boucliers et grandes coupes sont au sol, à hauteur de buste ;
//   6. deux pièces ne se chevauchent jamais, ni en vitrine ni au sol ;
//   7. tout tient dans le champ de la caméra, sur ordinateur ET sur téléphone.
//
// Lancer : npx vite-node scripts/verifArmoire.ts

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { TROPHEES, OVAS_PIECE_MAJEURE } from '../src/data/trophees';
import {
  cadrage, disposerArmoire, detecterEtageres, estBouclier, COLONNES, MAX_PIECES,
  type Boite, type DimensionsArmoire, type Geometrie, type Modele, type TailleModele,
} from '../src/lib/armoire';

// Doivent rester alignés sur `components/ArmoireTrophees.tsx`.
const HAUTEUR_ARMOIRE = 4;
const FOV = 42;
// Les deux tailles de canvas réelles (App.css : `min(820px, 95vw)` × `min(52vh,
// 420px)`, et `min(44vh, 320px)` sous 560 px).
const ECRANS: [string, number, number][] = [
  ['ordinateur', 790, 420],
  ['téléphone', 337, 320],
];

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(48)} ${valeur}`);
}

// --- LECTURE D'UN GLB --------------------------------------------------------
// En-tête de 12 octets, chunk JSON, chunk binaire.
function glb(fichier: string): { json: any; bin: Buffer } {
  const buf = fs.readFileSync(fichier);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${fichier} n'est pas un GLB`);
  const longueurJSON = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + longueurJSON).toString('utf8'));
  const debut = 20 + longueurJSON;
  const longueurBIN = debut + 8 <= buf.length ? buf.readUInt32LE(debut) : 0;
  return { json, bin: buf.subarray(debut + 8, debut + 8 + longueurBIN) };
}

/** L'échelle portée par les nœuds : Meshy sort parfois un `mesh_node` mis à l'échelle. */
function facteurNoeuds(json: any): number {
  let facteur = 1;
  for (const n of json.nodes ?? []) {
    if (Array.isArray(n.scale)) facteur = Math.max(facteur, ...n.scale.map(Math.abs));
  }
  return facteur;
}

/** La boîte englobante, lue dans le JSON — suffisant pour un trophée. */
function bbox(fichier: string): TailleModele | null {
  const { json } = glb(fichier);
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
  const f = facteurNoeuds(json);
  return { x: (max[0] - min[0]) * f, y: (max[1] - min[1]) * f, z: (max[2] - min[2]) * f };
}

// --- DÉCODAGE DRACO ----------------------------------------------------------
// ⚠️ Le décodeur vient de `three`, déjà en dépendance : `draco_decoder.js` est
// la version JavaScript pure (aucun `.wasm` à charger, aucun paquet de plus à
// installer). Il s'exporte en CommonJS — mais `three` se déclare `"type":
// "module"`, si bien qu'un `require()` de ce fichier renvoie un espace de noms
// ESM… VIDE. On le lit donc et on l'évalue nous-mêmes, dans le contexte courant
// (l'émetteur Emscripten a besoin de `process`, `require` et `__dirname`).
const requis = createRequire(import.meta.url);
const DracoDecoderModule = (() => {
  const chemin = requis.resolve('three/examples/jsm/libs/draco/draco_decoder.js');
  const source = fs.readFileSync(chemin, 'utf8');
  const mod = { exports: {} as unknown };
  const fabrique = new Function('module', 'exports', 'require', '__filename', '__dirname', `${source}\nreturn module.exports;`);
  return fabrique(mod, mod.exports, requis, chemin, path.dirname(chemin)) as (cfg: object) => Promise<any>;
})();

async function geometriesBrutes(fichier: string): Promise<Geometrie[]> {
  const { json, bin } = glb(fichier);
  const draco = await DracoDecoderModule({});
  const geos: Geometrie[] = [];

  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      const ext = prim.extensions?.KHR_draco_mesh_compression;
      if (!ext) throw new Error(`${fichier} : primitive non compressée, décodage non prévu`);
      const vue = json.bufferViews[ext.bufferView];
      const debut = vue.byteOffset ?? 0;
      const donnees = bin.subarray(debut, debut + vue.byteLength);

      const decodeur = new draco.Decoder();
      const tampon = new draco.DecoderBuffer();
      tampon.Init(new Int8Array(donnees), donnees.length);
      const maillage = new draco.Mesh();
      decodeur.DecodeBufferToMesh(tampon, maillage);

      const attribut = decodeur.GetAttributeByUniqueId(maillage, ext.attributes.POSITION);
      const sortie = new draco.DracoFloat32Array();
      decodeur.GetAttributeFloatForAllPoints(maillage, attribut, sortie);
      const positions = new Float32Array(sortie.size());
      for (let i = 0; i < positions.length; i++) positions[i] = sortie.GetValue(i);
      draco.destroy(sortie);

      const faces = maillage.num_faces();
      const trio = new draco.DracoInt32Array();
      const index = new Uint32Array(faces * 3);
      for (let f = 0; f < faces; f++) {
        decodeur.GetFaceFromMesh(maillage, f, trio);
        index[f * 3] = trio.GetValue(0);
        index[f * 3 + 1] = trio.GetValue(1);
        index[f * 3 + 2] = trio.GetValue(2);
      }
      draco.destroy(trio);
      draco.destroy(maillage);
      draco.destroy(tampon);
      draco.destroy(decodeur);

      geos.push({ positions, index });
    }
  }
  return geos;
}

/** Le meuble normalisé exactement comme dans la scène : posé en y = 0, centré en x/z. */
async function meubleNormalise(): Promise<{ geos: Geometrie[]; dims: DimensionsArmoire }> {
  const fichier = path.join('public', 'm3d', 'armoire.glb');
  const brutes = await geometriesBrutes(fichier);
  const facteur = facteurNoeuds(glb(fichier).json);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const g of brutes) {
    for (let i = 0; i < g.positions.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], g.positions[i + a] * facteur);
        max[a] = Math.max(max[a], g.positions[i + a] * facteur);
      }
    }
  }
  const echelle = (HAUTEUR_ARMOIRE / (max[1] - min[1])) * facteur;
  const centreX = ((min[0] + max[0]) / 2) * facteur;
  const centreZ = ((min[2] + max[2]) / 2) * facteur;
  const geos = brutes.map((g) => {
    const positions = new Float32Array(g.positions.length);
    for (let i = 0; i < g.positions.length; i += 3) {
      positions[i] = (g.positions[i] * facteur - centreX) * (echelle / facteur);
      positions[i + 1] = (g.positions[i + 1] * facteur - min[1] * facteur) * (echelle / facteur);
      positions[i + 2] = (g.positions[i + 2] * facteur - centreZ) * (echelle / facteur);
    }
    return { positions, index: g.index };
  });
  return {
    geos,
    dims: {
      largeur: (max[0] - min[0]) * echelle,
      profondeur: (max[2] - min[2]) * echelle,
      hauteur: HAUTEUR_ARMOIRE,
    },
  };
}

// =============================================================================

const { geos, dims } = await meubleNormalise();
const etageres = detecterEtageres(geos, dims);

console.log(`=== L'ARMOIRE : ${dims.largeur.toFixed(2)} × ${dims.hauteur.toFixed(2)} × ${dims.profondeur.toFixed(2)} ===`);

console.log('\n=== 1. LES ÉTAGÈRES SONT MESURÉES SUR LE MODÈLE ===');
{
  ligne('tablettes détectées', `${etageres.length}`, etageres.length >= 4);
  console.log(etageres
    .map((e, i) => `     tablette ${i} · y ${e.y.toFixed(2)} · vide ${e.vide.toFixed(2)} · largeur ${e.largeur.toFixed(2)}`)
    .join('\n'));
  const ordonnees = etageres.every((e, i) => i === 0 || etageres[i - 1].y > e.y);
  ligne('rangées de la plus haute à la plus basse', ordonnees ? 'oui' : 'non', ordonnees);
  const dedans = etageres.every((e) => e.y > 0 && e.y + e.vide <= dims.hauteur + 1e-6);
  ligne('toutes à l’intérieur du meuble', dedans ? 'oui' : 'non', dedans);
  const jamaisSuperposees = etageres.every((e, i) => i === 0 || e.y + e.vide <= etageres[i - 1].y + 1e-3);
  ligne('aucun vide qui traverse la tablette du dessus', jamaisSuperposees ? 'aucun' : 'chevauchement', jamaisSuperposees);
  const largeurs = etageres.every((e) => e.largeur >= dims.largeur * 0.6);
  ligne('tablettes traversantes', `la plus étroite ${Math.min(...etageres.map((e) => e.largeur)).toFixed(2)}`, largeurs);
}

// Tous les trophées mesurables, avec leur boîte.
type Mesure = { tr: (typeof TROPHEES)[string]; taille: TailleModele };
const mesures: Mesure[] = Object.values(TROPHEES)
  .map((tr) => ({ tr, taille: bbox(path.join('public', tr.modele)) }))
  .filter((m): m is Mesure => m.taille !== null);

function modeles(liste: Mesure[]): Modele[] {
  return liste.map((m) => ({
    taille: m.taille,
    majeur: m.tr.ovas >= OVAS_PIECE_MAJEURE,
    bouclier: m.tr.forme === 'bouclier' || estBouclier(m.taille),
  }));
}

// Le cas RÉEL : la modale n'affiche jamais plus de `MAX_PIECES` pièces.
const affiches = mesures.slice(0, MAX_PIECES);
const mods = modeles(affiches);
const places = disposerArmoire(mods, dims, etageres);

console.log(`\n    ${mesures.length}/${Object.keys(TROPHEES).length} modèles mesurés · ${affiches.length} disposés`);

console.log('\n=== 2. CHAQUE TROPHÉE A UNE PLACE ===');
{
  const cassees = places.filter((p) => p.position.some((v) => !Number.isFinite(v)) || !Number.isFinite(p.echelle));
  ligne('positions et échelles calculables', `${places.length - cassees.length}/${places.length}`, cassees.length === 0);
  const dedans = places.filter((p) => !p.dehors).length;
  ligne('répartition vitrine / sol', `${dedans} en vitrine · ${places.length - dedans} au sol`, dedans > 0);
}

console.log('\n=== 3. PLUS RIEN NE FLOTTE ENTRE DEUX ÉTAGÈRES ===');
{
  // ⚠️ LE BUG SIGNALÉ EN JEU. La grille inventée tombait au bon endroit une fois
  // sur deux ; on vérifie ici que la base de chaque trophée est POSÉE sur une
  // tablette réelle, au millimètre.
  const flottent: string[] = [];
  affiches.forEach((m, i) => {
    if (places[i].dehors) return;
    const sur = etageres.some((e) => Math.abs(e.y - places[i].position[1]) < 1e-6);
    if (!sur) flottent.push(`${m.tr.id} à y=${places[i].position[1].toFixed(3)}`);
  });
  ligne('trophées posés sur une vraie tablette',
    flottent.length ? flottent.join(', ') : `${places.filter((p) => !p.dehors).length}/${places.filter((p) => !p.dehors).length}`,
    flottent.length === 0);

  const auSol = places.filter((p) => p.dehors);
  const poses = auSol.every((p) => p.position[1] >= 0 && p.position[1] < dims.hauteur * 0.05);
  ligne('pièces du sol posées au sol', `${auSol.length} pièces, y max ${Math.max(0, ...auSol.map((p) => p.position[1])).toFixed(3)}`, poses);
}

console.log('\n=== 4. RIEN NE DÉBORDE ===');
{
  const debordent: string[] = [];
  const traversent: string[] = [];
  affiches.forEach((m, i) => {
    const p = places[i];
    if (p.dehors) return;
    const et = etageres.find((e) => Math.abs(e.y - p.position[1]) < 1e-6);
    if (!et) return;
    const l = m.taille.x * p.echelle;
    const h = m.taille.y * p.echelle;
    if (h > et.vide + 1e-6) debordent.push(`${m.tr.id} (h ${h.toFixed(2)} > ${et.vide.toFixed(2)})`);
    if (l > et.largeur / COLONNES + 1e-6) debordent.push(`${m.tr.id} (l ${l.toFixed(2)})`);
    if (Math.abs(p.position[0]) + l / 2 > et.largeur / 2 + 1e-6) traversent.push(m.tr.id);
  });
  ligne('trophées de vitrine dans leur casier', debordent.length ? debordent.join(', ') : 'tous', debordent.length === 0);
  ligne('aucun trophée ne traverse un montant', traversent.length ? traversent.join(', ') : 'aucun', traversent.length === 0);

  // Le remplissage doit rester généreux : c'est l'autre moitié du reproche
  // (« les trophées font minuscules »).
  const parts = affiches
    .map((m, i) => ({ m, i }))
    .filter(({ i }) => !places[i].dehors)
    .map(({ m, i }) => {
      const et = etageres.find((e) => Math.abs(e.y - places[i].position[1]) < 1e-6)!;
      return (m.taille.y * places[i].echelle) / et.vide;
    });
  const mini = Math.min(...parts);
  ligne('hauteur libre réellement occupée',
    `${(Math.min(...parts) * 100).toFixed(0)} à ${(Math.max(...parts) * 100).toFixed(0)} %`, mini >= 0.6);
}

console.log('\n=== 5. BOUCLIERS ET GRANDES COUPES AU SOL, À HAUTEUR DE BUSTE ===');
{
  // ⚠️ Le sol est borné à six pièces (voir MAX_SOL) : au-delà, une pièce
  // majeure reste en vitrine. C'est le prix à payer pour que le meuble ne
  // devienne pas un timbre-poste sur un palmarès complet.
  const candidates = mods.filter((m) => m.majeur || m.bouclier).length;
  const dehorsReel = places.filter((p) => p.dehors).length;
  ligne('les pièces majeures sortent, dans la limite du sol',
    `${dehorsReel} au sol sur ${candidates} candidates`, dehorsReel === Math.min(candidates, 6));

  // Le Brennus, nommément : c'est la demande.
  const iBrennus = affiches.findIndex((m) => m.tr.id === 'brennus');
  if (iBrennus >= 0) {
    const p = places[iBrennus];
    const h = affiches[iBrennus].taille.y * p.echelle;
    const aCote = Math.abs(p.position[0]) > dims.largeur / 2;
    ligne('le Bouclier de Brennus est à côté du meuble',
      `x = ${p.position[0].toFixed(2)} (flanc à ${(dims.largeur / 2).toFixed(2)})`, p.dehors && aCote);
    ligne('… et il fait la taille d’un buste',
      `${h.toFixed(2)} pour un meuble de ${dims.hauteur} (${((h / dims.hauteur) * 100).toFixed(0)} %)`,
      h / dims.hauteur >= 0.3 && h / dims.hauteur <= 0.5);
  }

  const hauteursSol = affiches
    .map((m, i) => ({ m, p: places[i] }))
    .filter(({ p }) => p.dehors)
    .map(({ m, p }) => m.taille.y * p.echelle);
  const rapport = Math.max(...hauteursSol) / Math.min(...hauteursSol);
  ligne('les pièces du sol ont toutes la même stature',
    `${Math.min(...hauteursSol).toFixed(2)} à ${Math.max(...hauteursSol).toFixed(2)}`, rapport <= 1.25);

  // Une pièce au sol doit écraser une pièce de vitrine : c'est tout l'intérêt.
  const hautVitrine = Math.max(...affiches.map((m, i) => (places[i].dehors ? 0 : m.taille.y * places[i].echelle)));
  ligne('une pièce du sol domine la vitrine',
    `${Math.min(...hauteursSol).toFixed(2)} contre ${hautVitrine.toFixed(2)} en rayon`,
    Math.min(...hauteursSol) > hautVitrine * 2);

  const inclines = affiches.filter((m, i) => places[i].dehors && mods[i].bouclier && places[i].rotation[0] < 0).length;
  const boucliers = mods.filter((m) => m.bouclier).length;
  ligne('les boucliers sont adossés (inclinés)', `${inclines}/${boucliers}`, inclines === boucliers);
}

console.log('\n=== 6. AUCUN CHEVAUCHEMENT ===');
{
  // En vitrine : deux voisins d'une même tablette ne doivent pas se toucher.
  const collisions: string[] = [];
  etageres.forEach((et) => {
    const rangee = affiches
      .map((m, i) => ({ m, p: places[i] }))
      .filter(({ p }) => !p.dehors && Math.abs(p.position[1] - et.y) < 1e-6)
      .sort((a, b) => a.p.position[0] - b.p.position[0]);
    for (let k = 1; k < rangee.length; k++) {
      const g = rangee[k - 1], d = rangee[k];
      const bordG = g.p.position[0] + (g.m.taille.x * g.p.echelle) / 2;
      const bordD = d.p.position[0] - (d.m.taille.x * d.p.echelle) / 2;
      if (bordD < bordG - 1e-6) collisions.push(`${g.m.tr.id} ↔ ${d.m.tr.id}`);
    }
  });
  ligne('vitrine : voisins qui se touchent', collisions.length ? collisions.join(', ') : 'aucun', collisions.length === 0);

  // Au sol : vrai test d'emprise au sol, en x ET en z (les rangs s'avancent).
  const auSol = affiches
    .map((m, i) => ({ m, p: places[i] }))
    .filter(({ p }) => p.dehors)
    .map(({ m, p }) => ({
      id: m.tr.id,
      x0: p.position[0] - (m.taille.x * p.echelle) / 2,
      x1: p.position[0] + (m.taille.x * p.echelle) / 2,
      z0: p.position[2] - (m.taille.z * p.echelle) / 2,
      z1: p.position[2] + (m.taille.z * p.echelle) / 2,
    }));
  const chocsSol: string[] = [];
  for (let a = 0; a < auSol.length; a++) {
    for (let b = a + 1; b < auSol.length; b++) {
      const u = auSol[a], v = auSol[b];
      if (u.x0 < v.x1 - 1e-6 && v.x0 < u.x1 - 1e-6 && u.z0 < v.z1 - 1e-6 && v.z0 < u.z1 - 1e-6) {
        chocsSol.push(`${u.id} ↔ ${v.id}`);
      }
    }
  }
  ligne('sol : emprises qui se recouvrent', chocsSol.length ? chocsSol.join(', ') : 'aucune', chocsSol.length === 0);

  // Et aucune pièce du sol ne rentre dans le meuble.
  const dansLeMeuble = auSol.filter((a) => Math.min(Math.abs(a.x0), Math.abs(a.x1)) < dims.largeur / 2 - 1e-6);
  ligne('sol : pièces encastrées dans le meuble', dansLeMeuble.length ? dansLeMeuble.map((a) => a.id).join(', ') : 'aucune', dansLeMeuble.length === 0);
}

console.log('\n=== 7. TOUT TIENT DANS LE CHAMP ===');
{
  const boites: Boite[] = affiches.map((m, i) => ({
    x: places[i].position[0],
    y: places[i].position[1],
    z: places[i].position[2] + (m.taille.z * places[i].echelle) / 2,
    demiLargeur: (m.taille.x * places[i].echelle) / 2,
    hauteur: m.taille.y * places[i].echelle,
  }));
  const demiLargeur = boites.reduce((a, b) => Math.max(a, Math.abs(b.x) + b.demiLargeur), dims.largeur / 2);
  const haut = boites.reduce((a, b) => Math.max(a, b.y + b.hauteur), dims.hauteur);
  console.log(`     scène : ${(demiLargeur * 2).toFixed(2)} de large sur ${haut.toFixed(2)} de haut`);
  for (const [nom, l, h] of ECRANS) {
    const { distance, centreY } = cadrage(boites, dims, FOV, l / h);
    const tan = Math.tan((FOV * Math.PI) / 360);
    // Chaque pièce doit tenir À SA distance : c'est tout l'objet de `cadrage()`.
    const dehors = boites.filter((b) => {
      const d = distance - b.z;
      const bas = b.y - dims.hauteur / 2;
      return (Math.abs(b.x) + b.demiLargeur) > tan * (l / h) * d + 1e-6
        || Math.max(Math.abs(bas - centreY), Math.abs(bas + b.hauteur - centreY)) > tan * d + 1e-6;
    });
    ligne(`cadrage ${nom} (${l}×${h})`,
      `caméra à ${distance.toFixed(2)}, cible y ${centreY.toFixed(2)} · ${dehors.length} pièce(s) hors champ`,
      dehors.length === 0);
  }
}

console.log('\n=== 8. LES CAS LIMITES ===');
{
  // Que des boucliers : six s'adossent au meuble, les autres restent en vitrine
  // — c'est la borne qui empêche la scène de s'étaler sur vingt unités.
  const bouclier: Modele = { taille: { x: 1.4, y: 1.9, z: 0.17 }, majeur: false, bouclier: true };
  const tous = disposerArmoire(Array.from({ length: MAX_PIECES }, () => bouclier), dims, etageres);
  const loin = tous.reduce((a, p) => Math.max(a, Math.abs(p.position[0])), 0);
  ligne('seize boucliers : le sol reste borné',
    `${tous.filter((p) => p.dehors).length} au sol, ${tous.filter((p) => !p.dehors).length} en vitrine, le plus loin à x = ${loin.toFixed(2)}`,
    tous.filter((p) => p.dehors).length === 6 && loin < dims.largeur * 1.2);

  // Rien du tout : la fonction ne doit pas exploser.
  ligne('palmarès vide', `${disposerArmoire([], dims, etageres).length} place(s)`, disposerArmoire([], dims, etageres).length === 0);

  // Une vitrine pleine à ras bord : aucun trou, et le débordement part au sol.
  const petit: Modele = { taille: { x: 0.9, y: 1.9, z: 0.9 }, majeur: false, bouclier: false };
  const capacite = etageres.length * COLONNES;
  const pleine = disposerArmoire(Array.from({ length: capacite + 3 }, () => petit), dims, etageres);
  const enVitrine = pleine.filter((p) => !p.dehors).length;
  ligne('vitrine saturée : le surplus descend au sol',
    `${enVitrine}/${capacite} en vitrine, ${pleine.length - enVitrine} au sol`,
    enVitrine === capacite && pleine.length - enVitrine === 3);

  // Et les tablettes se remplissent du HAUT vers le BAS, sans sauter de rangée.
  const troisPieces = disposerArmoire([petit, petit, petit], dims, etageres);
  const surLaPremiere = troisPieces.every((p) => Math.abs(p.position[1] - etageres[0].y) < 1e-6);
  ligne('un petit palmarès reste à hauteur d’œil', surLaPremiere ? 'sur la tablette du haut' : 'éparpillé', surLaPremiere);
  const centre = troisPieces.reduce((a, p) => a + p.position[0], 0) / 3;
  ligne('une rangée incomplète est centrée', `centre de gravité à ${centre.toFixed(3)}`, Math.abs(centre) < 1e-6);
}

console.log(echecs === 0 ? '\n✅ Armoire conforme.' : `\n❌ ${echecs} contrôle(s) en échec.`);
