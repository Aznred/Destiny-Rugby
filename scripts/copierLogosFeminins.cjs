// LES ÉCUSSONS DES CLUBS FÉMININS → public/logos/feminines/ + src/data/logosFeminins.generated.ts
//
//   node scripts/copierLogosFeminins.cjs
//
// Les logos viennent de `../Objectif Ffr/exports/feminines/logos/<ligue>/<club>.png` (sites officiels : thepwr.com,
// FFR, franchises du Super Rugby Women's). ⚠️ UNE CARTE RETROUVE SON ÉCUSSON PAR LE NOM DU CLUB, et le filet de
// `useBlasonCarte` accepte un nom qui en contient un autre : « Gloucester-Hartpury » recevait l'écusson de Gloucester
// Rugby (les hommes), et « Loughborough Lightning », qui ne ressemble à rien, sortait sans écusson. Une carte de
// joueuse lit donc D'ABORD cette table, par le nom exact de son club.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const source = path.resolve(__dirname, '../../Objectif Ffr/exports/feminines');
const cible = path.resolve(__dirname, '../public/logos/feminines');
const joueuses = JSON.parse(fs.readFileSync(path.join(source, 'joueuses.json'), 'utf8'));

(async () => {
  const table = {};
  const manquants = new Set();
  const partages = { 'Racing 92': 'racing_92', 'Nancy Seichamps Rugby': 'nancy_seichamps_rugby',
    'AS Bayonnaise': 'a_s_bayonnaise', 'CA Briviste Corrèze': 'brive', 'US Colomiers': 'colomiers' };
  for (const j of joueuses) {
    if (j.ligue === 'selections' || table[j.club]) continue;
    // Même club, même écusson officiel : le fichier féminin fourni par la FFR est mal détouré.
    if (partages[j.club]) { table[j.club] = `/logos/${partages[j.club]}.png`; continue; }
    // PNG, WebP ou JPEG selon le site ; un logo vectoriel (Chiefs) est rendu par sharp.
    const ligues = [j.ligue, ...fs.readdirSync(path.join(source, 'logos')).filter(l => l !== j.ligue)];
    const fichier = ligues.flatMap(l => ['png', 'webp', 'jpg', 'svg'].map(ext => path.join(source, 'logos', l, `${j.club_id}.${ext}`))).find(f => fs.existsSync(f));
    if (!fichier) { manquants.add(j.club); continue; }
    const sortie = path.join(cible, j.ligue, `${j.club_id}.png`);
    fs.mkdirSync(path.dirname(sortie), { recursive: true });
    // Bords transparents rognés : l'écusson remplit sa case de 25 px sur la carte.
    await sharp(fichier, fichier.endsWith('.svg') ? { density: 300 } : {}).trim().resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(sortie);
    table[j.club] = `/logos/feminines/${j.ligue}/${j.club_id}.png`;
  }
  const lignes = Object.entries(table).sort(([a], [b]) => a.localeCompare(b, 'fr')).map(([nom, logo]) => `  ${JSON.stringify(nom)}: ${JSON.stringify(logo)},`);
  fs.writeFileSync(path.resolve(__dirname, '../src/data/logosFeminins.generated.ts'),
    `// GÉNÉRÉ par scripts/copierLogosFeminins.cjs — ne pas éditer à la main.\n// L'écusson d'un club féminin, par le nom exact que porte la carte de la joueuse.\nexport const LOGOS_CLUBS_FEMININS: Record<string, string> = {\n${lignes.join('\n')}\n};\n`);
  console.log(`${lignes.length} écussons copiés ; sans logo : ${[...manquants].join(', ') || 'aucun'}`);
})().catch(erreur => { console.error(erreur); process.exitCode = 1; });
