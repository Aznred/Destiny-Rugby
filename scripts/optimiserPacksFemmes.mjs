// Modèles livrés le 9 octobre : pochettes et trophées féminins, 1024 px et maillage allégé.
// Relancer depuis le dépôt : node scripts/optimiserPacksFemmes.mjs [identifiant...]
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { MeshoptSimplifier } from 'meshoptimizer';

const sources = new URL('../../new pack et trophée/', import.meta.url);
const sorties = new URL('../public/m3d/', import.meta.url);
const correspondances = {
  'packs-speciaux/springboks': 'springbock.glb',
  'packs-speciaux/icon': 'icon pack.glb',
  'packs-speciaux/special': 'special pack.glb',
  'packs-speciaux/octobre-rose': 'Meshy_AI_Octobre_Rose_Destiny__1009175606_texture.glb',
  'packs-speciaux/f-pwr': 'premiership pack.glb',
  'packs-speciaux/f-aupiki': 'super rugby aupiki pack.glb',
  'packs-speciaux/f-superw': 'super rugby women pack.glb',
  'packs-speciaux/f-elite1': 'elite 1 pack.glb',
  'packs-speciaux/f-elite2': 'elite 2 pack.glb',
  'packs-speciaux/f-fpc': 'farhan cup pack.glb',
  'packs-speciaux/f-celtic': 'Meshy_AI_Celtic_Challenge_Dest_1009174954_texture.glb',
  'packs-speciaux/f-seriea': 'ligue italie pack.glb',
  'packs-speciaux/f-liga': 'ligue espagnole pack.glb',
  'packs-speciaux/f-ail': 'ail ireland pack.glb',
  'f-pwr': 'premiership women.glb',
  'f-aupiki': 'Meshy_AI_Super_Rugby_Aupiki_Tr_1009203201_texture.glb',
  'f-superw': 'super rugby women.glb',
  'f-elite': 'elite1 et 2 troph.glb',
  'f-fpc': 'Premiership Cup  (2).glb',
  'f-fpc2': 'Championship Cup.glb',
  'jjStewart': 'JJ Stewart Trophy.glb',
  'f-celtic': 'celtic league cup.glb',
  'f-seriea': 'ligue italienne.glb',
  'f-liga': 'ligue espagne trophee.glb',
  'f-ail': 'irlande 1a et 1b.glb',
  'f-monde': 'coupe du monde feminine.glb',
};
await MeshoptSimplifier.ready;
const selection = new Set(process.argv.slice(2));
for (const [id, fichier] of Object.entries(correspondances)) {
  if (selection.size && !selection.has(id)) continue;
  const cible = new URL(`${id}.glb`, sorties);
  const input = await fs.readFile(new URL(fichier, sources));
  const jsonSize = input.readUInt32LE(12);
  const doc = JSON.parse(input.subarray(20, 20 + jsonSize).toString());
  const binary = input.subarray(28 + jsonSize), views = doc.bufferViews, accessors = doc.accessors;
  const parts = []; let offset = 0; doc.bufferViews = [];
  function add(bytes) {
    const index = doc.bufferViews.length;
    doc.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
    parts.push(bytes, Buffer.alloc((4 - bytes.length % 4) % 4));
    offset += bytes.length + (4 - bytes.length % 4) % 4;
    return index;
  }
  function data(index) {
    const accessor = accessors[index], view = views[accessor.bufferView];
    if (view.byteStride) throw new Error(`Attribut entrelacé : ${fichier}`);
    const Type = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[accessor.componentType];
    if (!Type) throw new Error(`Type d’attribut inconnu : ${fichier}`);
    const length = accessor.count * ({ VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type] || 1);
    const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    return new Type(binary.buffer, binary.byteOffset + start, length);
  }
  for (const image of doc.images ?? []) {
    const view = views[image.bufferView];
    const bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    image.bufferView = add(await sharp(bytes).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer());
    image.mimeType = 'image/jpeg';
  }
  for (const mesh of doc.meshes) for (const primitive of mesh.primitives) {
    const positions = data(primitive.attributes.POSITION);
    const [simplified] = MeshoptSimplifier.simplify(new Uint32Array(data(primitive.indices)), positions, 3, 60000, 0.008);
    const [remap, count] = MeshoptSimplifier.compactMesh(simplified);
    for (const [semantic, index] of Object.entries(primitive.attributes)) {
      const values = data(index), accessor = accessors[index], stride = values.length / accessor.count;
      const compact = new Float32Array(count * stride);
      for (let old = 0; old < remap.length; old++) if (remap[old] !== 0xffffffff) compact.set(values.subarray(old * stride, (old + 1) * stride), remap[old] * stride);
      accessor.bufferView = add(Buffer.from(compact.buffer)); accessor.count = count; accessor.byteOffset = 0; accessor.componentType = 5126;
      if (semantic !== 'POSITION') { delete accessor.min; delete accessor.max; }
    }
    const accessor = accessors[primitive.indices];
    accessor.bufferView = add(Buffer.from(simplified.buffer, simplified.byteOffset, simplified.byteLength));
    accessor.count = simplified.length; accessor.byteOffset = 0; accessor.componentType = 5125;
    delete accessor.min; delete accessor.max;
  }
  doc.buffers = [{ byteLength: offset }];
  const json = Buffer.from(JSON.stringify(doc));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + offset, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
  await fs.mkdir(new URL('./', cible), { recursive: true });
  await fs.writeFile(cible, Buffer.concat([header, padded, binHeader, ...parts]));
  console.log(`${id}: ${(input.length / 1e6).toFixed(1)} → ${(offset / 1e6).toFixed(1)} Mo`);
}
