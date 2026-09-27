// Convertit les pochettes Meshy fournies en modèles légers pour le navigateur.
// Les modèles saisonniers restent dans le dossier source jusqu'à leur sortie.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { MeshoptSimplifier } from 'meshoptimizer';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
await MeshoptSimplifier.ready;

const sources = new URL('../../nouveau design pack/', import.meta.url);
const destination = new URL('../public/m3d/packs-speciaux/', import.meta.url);
const saisons = new URL('../assets/packs-saisonniers/', import.meta.url);
const correspondances = {
  allBlacks: 'All_Blacks_',
  nationsCeltes: 'Celtic_Nations_',
  leagueOne: 'Rugby_Champio_',
  international: 'Rugby_Interna_',
  pumas: 'Rugby_Los_Pum_',
  iles: 'Rugby_Pacific_',
  urc: 'Rugby_Premium_',
  europeEmergente: 'EmergingNationsPack3D_',
  wallabies: 'Golden_Wallabies_',
  top14: 'Top14BoosterPack3D_',
  franceXV: 'Rugby_Pack_0927153822_',
  sixNations: 'Rugby_Pack_0927154535_',
  prod2: 'Rugby_Trading_0927153610_',
  premiership: 'Rugby_Trading_0927153639_',
  halloween: 'Rugby_Hallowe_',
  noel: 'Holiday_Rugby_Gold_',
  paques: 'Rugby_Blossom_',
};

await fs.mkdir(destination, { recursive: true });
await fs.mkdir(saisons, { recursive: true });
const fichiers = await fs.readdir(sources);
const selection = new Set(process.argv.slice(2));
for (const [id, fragment] of Object.entries(correspondances)) {
  if (selection.size && !selection.has(id)) continue;
  const nom = fichiers.find(fichier => fichier.includes(fragment) && fichier.endsWith('.glb'));
  if (!nom) throw new Error(`Modèle introuvable : ${id} (${fragment})`);
  const input = await fs.readFile(new URL(nom, sources));
  const jsonSize = input.readUInt32LE(12);
  const doc = JSON.parse(input.subarray(20, 20 + jsonSize).toString());
  const binary = input.subarray(28 + jsonSize);
  const views = doc.bufferViews;
  const accessors = doc.accessors;
  const parts = [];
  let offset = 0;
  doc.bufferViews = [];
  function add(bytes) {
    const index = doc.bufferViews.length;
    doc.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
    parts.push(bytes);
    const pad = (4 - bytes.length % 4) % 4;
    parts.push(Buffer.alloc(pad));
    offset += bytes.length + pad;
    return index;
  }
  function data(index) {
    const accessor = accessors[index];
    const view = views[accessor.bufferView];
    const bytes = binary.subarray((view.byteOffset || 0) + (accessor.byteOffset || 0), (view.byteOffset || 0) + view.byteLength);
    return accessor.componentType === 5125
      ? new Uint32Array(bytes.buffer, bytes.byteOffset, accessor.count)
      : new Float32Array(bytes.buffer, bytes.byteOffset, accessor.count * ({ VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type] || 1));
  }
  for (const image of doc.images) {
    const view = views[image.bufferView];
    const bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    image.bufferView = add(await sharp(bytes).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer());
    image.mimeType = 'image/jpeg';
  }
  for (const mesh of doc.meshes) for (const primitive of mesh.primitives) {
    const [indices] = MeshoptSimplifier.simplify(data(primitive.indices), data(primitive.attributes.POSITION), 3, 60000, 0.015);
    const [remap, count] = MeshoptSimplifier.compactMesh(indices);
    for (const [semantic, index] of Object.entries(primitive.attributes)) {
      const values = data(index);
      const accessor = accessors[index];
      const stride = values.length / accessor.count;
      const compact = new Float32Array(count * stride);
      for (let old = 0; old < remap.length; old++) if (remap[old] !== 0xffffffff) compact.set(values.subarray(old * stride, (old + 1) * stride), remap[old] * stride);
      accessor.bufferView = add(Buffer.from(compact.buffer));
      accessor.count = count;
      accessor.byteOffset = 0;
      if (semantic !== 'POSITION') { delete accessor.min; delete accessor.max; }
    }
    const accessor = accessors[primitive.indices];
    accessor.bufferView = add(Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength));
    accessor.count = indices.length;
    accessor.byteOffset = 0;
    delete accessor.min;
    delete accessor.max;
  }
  doc.buffers = [{ byteLength: offset }];
  const json = Buffer.from(JSON.stringify(doc));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + offset, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
  const fichier = `${id}.glb`;
  const dossier = ['halloween', 'noel', 'paques'].includes(id) ? saisons : destination;
  await fs.writeFile(new URL(fichier, dossier), Buffer.concat([header, padded, binHeader, ...parts]));
  console.log(`${fichier}: ${(input.length / 1e6).toFixed(1)} → ${(offset / 1e6).toFixed(1)} Mo`);
}
