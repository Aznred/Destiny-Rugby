// Usage: node scripts/optimiserPacks.mjs <chemin du module sharp>
// Conserve les originaux ; simplifie la géométrie et réduit les textures à 1K.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { MeshoptSimplifier } from 'meshoptimizer';
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
await MeshoptSimplifier.ready;
const source = new URL('../../pack/', import.meta.url);
const output = new URL('../public/m3d/packs/', import.meta.url);
await fs.mkdir(output, { recursive: true });
for (const file of await fs.readdir(source)) {
  if (!file.endsWith('.glb')) continue;
  const rarete = file.includes('bronze') ? 'bronze' : file.includes('silver') ? 'argent' : file.includes('cyan') ? 'elite' : file.includes('mythique') ? 'star' : 'or';
  const name = `${rarete}-${file.includes('ouvert') ? 'ouvert' : 'ferme'}.glb`;
  // Le fichier mythique ouvert fourni est un doublon exact du bronze fermé.
  // On utilise donc la géométrie ouverte bronze avec une finition rouge.
  const corrigerMythique = rarete === 'star' && file.includes('ouvert');
  const input = await fs.readFile(new URL(corrigerMythique ? 'pack bronze ouvert.glb' : file, source));
  const jsonSize = input.readUInt32LE(12);
  const doc = JSON.parse(input.subarray(20, 20 + jsonSize).toString());
  if (corrigerMythique) for (const material of doc.materials) material.pbrMetallicRoughness.baseColorFactor = [1, 0.16, 0.22, 1];
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
    const a = accessors[index], v = views[a.bufferView];
    const bytes = binary.subarray((v.byteOffset || 0) + (a.byteOffset || 0), (v.byteOffset || 0) + v.byteLength);
    return a.componentType === 5125 ? new Uint32Array(bytes.buffer, bytes.byteOffset, a.count) : new Float32Array(bytes.buffer, bytes.byteOffset, a.count * ({ VEC2: 2, VEC3: 3, VEC4: 4 }[a.type] || 1));
  }
  for (const image of doc.images) {
    const view = views[image.bufferView];
    const bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    image.bufferView = add(await sharp(bytes).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer());
    image.mimeType = 'image/jpeg';
  }
  for (const mesh of doc.meshes) for (const primitive of mesh.primitives) {
    const [indices] = MeshoptSimplifier.simplify(data(primitive.indices), data(primitive.attributes.POSITION), 3, 60000, 0.015);
    const [remap, count] = MeshoptSimplifier.compactMesh(indices);
    for (const [semantic, index] of Object.entries(primitive.attributes)) {
      const values = data(index), a = accessors[index];
      const stride = values.length / a.count;
      const compact = new Float32Array(count * stride);
      for (let old = 0; old < remap.length; old++) if (remap[old] !== 0xffffffff) compact.set(values.subarray(old * stride, (old + 1) * stride), remap[old] * stride);
      a.bufferView = add(Buffer.from(compact.buffer)); a.count = count; a.byteOffset = 0;
      if (semantic !== 'POSITION') { delete a.min; delete a.max; }
    }
    const a = accessors[primitive.indices];
    a.bufferView = add(Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength)); a.count = indices.length; a.byteOffset = 0; delete a.min; delete a.max;
    console.log(name, count, 'vertices', indices.length / 3, 'triangles');
  }
  doc.buffers = [{ byteLength: offset }];
  const json = Buffer.from(JSON.stringify(doc));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + offset, 8); header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
  await fs.writeFile(new URL(name, output), Buffer.concat([header, padded, binHeader, ...parts]));
  console.log(`${(input.length / 1e6).toFixed(1)} MB → ${(offset / 1e6).toFixed(2)} MB`);
}
