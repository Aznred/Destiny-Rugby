const fs = require('node:fs'), path = require('node:path'), sharp = require('sharp');
const dossiers = ['public/photos', 'public/photos/maj', 'public/photos/new maj', 'public/photos/monde'];
(async () => {
  for (const d of dossiers) {
    const fichiers = fs.readdirSync(d, { withFileTypes: true })
      .filter(e => e.isFile() && /\.(webp|png|jpe?g)$/i.test(e.name)).map(e => path.join(d, e.name));
    let detourees = 0, opaques = 0, erreurs = 0;
    const exemples = [];
    for (const f of fichiers) {
      try {
        const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const { width: w, height: h, channels: c } = info;
        // On regarde les quatre coins : un portrait detoure y est transparent.
        const coins = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
        const transparents = coins.filter(([x,y]) => data[(y*w+x)*c+3] < 32).length;
        if (transparents >= 3) detourees++; else { opaques++; if (exemples.length < 4) exemples.push(path.basename(f)); }
      } catch { erreurs++; }
    }
    console.log(`${d.padEnd(24)} ${String(fichiers.length).padStart(5)} fichiers | detourees ${String(detourees).padStart(5)} | FOND OPAQUE ${String(opaques).padStart(5)} | illisibles ${erreurs}`);
    if (exemples.length) console.log(`   ex. ${exemples.join(', ')}`);
  }
})();
