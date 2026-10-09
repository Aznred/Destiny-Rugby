// Logos existants des ligues : téléchargement, archivage des sources et réduction sans création d'image.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const racine = path.resolve(__dirname, '..');
const dossier = path.join(racine, 'sources/competitions/feminines/logos');
const sources = [
  ['f-pwr', 'https://www.thepwr.com/logo.svg', 'https://www.thepwr.com/'],
  ['f-elite1', 'https://api-web.monclubhouse.ffr.fr/assets/ea454b79-c1b9-4ac3-ad31-c0a742938515?format=png&width=512', 'https://monclubhouse.ffr.fr/nationales/elite-1-feminine/qualification-50150'],
  ['f-elite2', 'https://api-web.monclubhouse.ffr.fr/assets/dff11de5-ff0b-4a0e-8be9-efad6c24b5f3?format=png&width=512', 'https://monclubhouse.ffr.fr/nationales/elite-2-feminine/phase-finale-48900'],
  ['f-celtic', 'https://celticrugbycomp.com/wp-content/uploads/2024/01/WRU-3939-Celtic-Challenge-Logo_LS-REV.png', 'https://celticrugbycomp.com/'],
  ['f-aupiki', 'https://upload.wikimedia.org/wikipedia/en/f/f1/Super_Rugby_Aupiki.png', 'https://en.wikipedia.org/wiki/Super_Rugby_Aupiki'],
  ['f-superw', 'https://upload.wikimedia.org/wikipedia/en/e/e6/Super_W_logo_2018.png', "https://en.wikipedia.org/wiki/Super_Rugby_Women%27s"],
  ['f-fpc', 'https://upload.wikimedia.org/wikipedia/en/d/d6/Farah_Palmer_Cup.svg', 'https://en.wikipedia.org/wiki/Farah_Palmer_Cup'],
  ['f-seriea', 'https://upload.wikimedia.org/wikipedia/commons/c/cc/FIR_Women%27s_Serie_A_Elite_2023.png', "https://commons.wikimedia.org/wiki/File:FIR_Women%27s_Serie_A_Elite_2023.png"],
  ['f-liga', 'https://ferugby.es/wp-content/uploads/2024/02/AF_Iberdrola_Rugby_RGB_POS.png', 'https://ferugby.es/wp-json/wp/v2/media?search=logo%20iberdrola&per_page=100'],
  ['f-ail', '/logos-competitions/irlandeAIL.png', 'https://www.irishrugby.ie/league/fixtures-results/1271'],
  ['f-ail2', '/logos-competitions/irlandeAIL.png', 'https://www.irishrugby.ie/league/fixtures-results/1271'],
];
async function main() {
  fs.mkdirSync(dossier, { recursive: true });
  const manifeste = [];
  for (const [id, url, reference] of sources) {
    const fichierBrut = path.join(dossier, id + (url.includes('.svg') ? '.svg' : '.png'));
    let brut;
    if (fs.existsSync(fichierBrut)) brut = fs.readFileSync(fichierBrut);
    else {
      if (url.startsWith('/')) brut = fs.readFileSync(path.join(racine, 'public', url));
      else {
        const r = await fetch(url, { headers: { 'User-Agent': 'DestinyRugby/1.0 (collecte de ressources publiques)' }, signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error(`${id} : HTTP ${r.status}`);
        brut = Buffer.from(await r.arrayBuffer());
      }
      fs.writeFileSync(fichierBrut, brut);
    }
    // La version blanche du Celtic Challenge reste lisible sur un fond sombre ; les autres gardent un fond blanc.
    const fond = id === 'f-celtic' ? '#17332c' : '#ffffff';
    await sharp(brut, url.includes('.svg') ? { density: 300 } : {}).trim().resize(452, 452, { fit: 'inside' })
      .extend({ top: 30, bottom: 30, left: 30, right: 30, background: fond }).flatten({ background: fond })
      .png().toFile(path.join(racine, 'sources/logos/competitions', id + '.png'));
    manifeste.push({ id, url, reference, fichier: path.relative(racine, fichierBrut).replaceAll('\\', '/'), collecte: '2026-10-09' });
    fs.writeFileSync(path.join(dossier, 'sources.json'), JSON.stringify(manifeste, null, 2));
    console.log(id + ' : logo prêt');
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
