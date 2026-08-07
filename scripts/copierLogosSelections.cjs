// LES ÉCUSSONS DES SÉLECTIONS NATIONALES
//
// Deux lots sources, désormais rangés sous `sources/logos/selections/` :
//   • `principaux/` : les 39 écussons historiques déjà référencés par les
//     données générées ; ils écrasent les petites vignettes du pack clubs ;
//   • `catalogue/` : la livraison complète, contrôlée par signature binaire.
//     Elle contient aussi des équipes A/U20 et des variantes non utilisées ; la
//     table explicite ci-dessous choisit la bonne image pour chaque nom du jeu.
//
// Les compléments sont isolés dans `public/logos-selections/` et une table
// TypeScript est générée. Cela évite qu'un futur passage de `copierLogos.cjs`
// ne les écrase avec un logo de club homonyme.
//
// Relancer APRÈS `node scripts/copierLogos.cjs` :
//   node scripts/copierLogosSelections.cjs

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const SOURCE_PRINCIPALE = path.join(RACINE, 'sources', 'logos', 'selections', 'principaux');
const SOURCE_CATALOGUE = path.join(RACINE, 'sources', 'logos', 'selections', 'catalogue');
const CIBLE_PRINCIPALE = path.join(RACINE, 'public', 'logos');
const CIBLE_COMPLEMENTS = path.join(RACINE, 'public', 'logos-selections');
const SORTIE = path.join(RACINE, 'src', 'data', 'logosSelections.ts');

const CATALOGUE = {
  '2013_British_and_Irish_Lions_logo.svg': {
    slug: 'lions_britanniques_irlandais',
    nations: ['Lions britanniques et irlandais', 'British & Irish Lions', 'British and Irish Lions'],
  },
  'Algeria_national_rugby_union_team.gif': { slug: 'algerie', nations: ['Algérie'] },
  'ANDORRA_1.jpg': { slug: 'andorre', nations: ['Andorre'] },
  'Armenie-rugby.JPG': { slug: 'armenie', nations: ['Arménie'] },
  'Austria_rugby_logo.png': { slug: 'autriche', nations: ['Autriche'] },
  'Barbados_rugby.png': { slug: 'barbade', nations: ['Barbade'] },
  'BelarusRugbyLogo.jpg': { slug: 'bielorussie', nations: ['Biélorussie'] },
  'Belgium_national_rugby_union_team.png': { slug: 'belgique', nations: ['Belgique'] },
  'Bulgarian_Rugby_Federation_(logo).png': { slug: 'bulgarie', nations: ['Bulgarie'] },
  'Colombia_rugby_logo.jpg': { slug: 'colombie', nations: ['Colombie'] },
  'Cook_islands_rugby_logo.png': { slug: 'iles_cook', nations: ['Îles Cook'] },
  'Curacao_rugby_logo.png': { slug: 'curacao', nations: ['Curaçao'] },
  'Federación_Peruana_de_Rugby_(logo).png': { slug: 'perou', nations: ['Pérou'] },
  'FMR-1.png': { slug: 'monaco', nations: ['Monaco'] },
  'France_Rugby_Logo.svg': { slug: 'france', nations: ['France'] },
  'French_Guiana_Rugby.gif': { slug: 'guyane_francaise', nations: ['Guyane française'] },
  'German_Rugby_Eagle.png': { slug: 'allemagne', nations: ['Allemagne'] },
  'Guadeloupe_Rugby_logo.png': { slug: 'guadeloupe', nations: ['Guadeloupe'] },
  'Hong_Kong_China_Rugby_Union.svg': { slug: 'hong_kong', nations: ['Hong Kong', 'Hong Kong Chine'] },
  'Hungaryrugby.jpg': { slug: 'hongrie', nations: ['Hongrie'] },
  'IcelandRugbyLogo.jpg': { slug: 'islande', nations: ['Islande'] },
  'IranRugbyFederation.JPG': { slug: 'iran', nations: ['Iran'] },
  'Irish_Rugby_Football_Union_logo.svg': { slug: 'irlande', nations: ['Irlande'] },
  'Italian_Rugby_Federation_logo.svg': { slug: 'italie', nations: ['Italie'] },
  'Kazakhstanrugbylogo.jpg': { slug: 'kazakhstan', nations: ['Kazakhstan'] },
  'Kenya_Rugby_logo.png': { slug: 'kenya', nations: ['Kenya'] },
  'LatviaRFLogo.jpg': { slug: 'lettonie', nations: ['Lettonie'] },
  'LiechtensteinRugbyLogo.png': { slug: 'liechtenstein', nations: ['Liechtenstein'] },
  'Logo_American_SamoaRugby.png': { slug: 'samoa_americaines', nations: ['Samoa Américaines'] },
  'Logo_Barbarians_français.png': { slug: 'barbarians_francais', nations: ['Barbarians français'] },
  'Logo_Canada_Rugby.svg': { slug: 'canada', nations: ['Canada'] },
  'Logo_Ceské_ragby_2010.png': { slug: 'tchequie', nations: ['Tchéquie', 'République tchèque', 'République Tchèque'] },
  'Logo_Crna_Gora_Rugby.png': { slug: 'montenegro', nations: ['Monténégro'] },
  'Logo_Federação_Portuguesa_de_Rugby_2020.png': { slug: 'portugal', nations: ['Portugal'] },
  'Logo_Fijian_Under_20s_2019.png': { slug: 'fidji_u20', nations: ['Fidji U20', 'Fidji -20'] },
  'Logo_Flying_Fijians_2019.svg': { slug: 'fidji', nations: ['Fidji'] },
  'Logo_Junior_Springboks.svg': { slug: 'afrique_du_sud_u20', nations: ['Afrique du Sud U20', 'Afrique du Sud -20'] },
  'Logo_Junior_Wallabies.png': { slug: 'australie_u20', nations: ['Australie U20', 'Australie -20'] },
  'Logo_Los_Condores_2020.svg': { slug: 'chili', nations: ['Chili'] },
  'Logo_Los_Pumas_2023.svg': { slug: 'argentine', nations: ['Argentine'] },
  'Logo_Os_Tupis_2021.png': { slug: 'bresil', nations: ['Brésil'] },
  'Logo_Namibia_Rugby.svg': { slug: 'namibie', nations: ['Namibie'] },
  'Logo_Pumitas_2023.svg': { slug: 'argentine_u20', nations: ['Argentine U20', 'Argentine -20'] },
  'Logo_Samoa_Rugby.svg': { slug: 'samoa', nations: ['Samoa'] },
  'Logo_Scotland_A_(rugby).png': { slug: 'ecosse_a', nations: ['Écosse A', 'Ecosse A'] },
  'Mexicorugby.png': { slug: 'mexique', nations: ['Mexique'] },
  'Logo_South_Africa_A_(Springboks).svg': { slug: 'afrique_du_sud_a', nations: ['Afrique du Sud A'] },
  'Logo_Tonga_Rugby.svg': { slug: 'tonga', nations: ['Tonga'] },
  'Logo_U20_France_masculin_(Rugby)_-_2019.svg': { slug: 'france_u20', nations: ['France U20'] },
  'Logo_Wallabies.svg': { slug: 'australie', nations: ['Australie'] },
  'Luxembourgrugby.jpg': { slug: 'luxembourg', nations: ['Luxembourg'] },
  'Martinique_Rugby_logo.png': { slug: 'martinique', nations: ['Martinique'] },
  'Mayotte_Rugby_logo.gif': { slug: 'mayotte', nations: ['Mayotte'] },
  'Netherlands_rugby_logo.jpg': { slug: 'pays_bas', nations: ['Pays-Bas'] },
  'New_Caledonia_Rugby_logo.png': { slug: 'nouvelle_caledonie', nations: ['Nouvelle-Calédonie'] },
  'New_Zealand_Heartland_XV_logo.svg': { slug: 'new_zealand_heartland_xv', nations: ['New Zealand Heartland XV'] },
  'New_Zealand_national_under-20_rugby_union_team_logo.svg': { slug: 'nouvelle_zelande_u20', nations: ['Nouvelle-Zélande U20', 'Nouvelle-Zélande -20'] },
  'Norwayrugby.png': { slug: 'norvege', nations: ['Norvège'] },
  'Papua_New_Guinea_rugby.png': { slug: 'papouasie_nouvelle_guinee', nations: ['Papouasie-Nouvelle-Guinée', 'Papouasie Nouvelle-Guinée'] },
  'Poland_Rugby.svg': { slug: 'pologne', nations: ['Pologne'] },
  'Ragbibih.jpg': { slug: 'bosnie_herzegovine', nations: ['Bosnie-Herzégovine'] },
  'Ragbi_savez_Srbije_logo.jpg': { slug: 'serbie', nations: ['Serbie'] },
  'Royal_Moroccan_Rugby_Federation.png': { slug: 'maroc', nations: ['Maroc'] },
  'Rugby_Logo_Cote_dIvoire.png': { slug: 'cote_ivoire', nations: ['Côte d’Ivoire', "Côte d'Ivoire"] },
  'Rugbyniue.png': { slug: 'niue', nations: ['Niue'] },
  'Rugbyparaguay.jpg': { slug: 'paraguay', nations: ['Paraguay'] },
  'Rugbytahiti.png': { slug: 'tahiti', nations: ['Tahiti'] },
  'Rugbytunisia.png': { slug: 'tunisie', nations: ['Tunisie'] },
  'Russiarugbyicon.jpg': { slug: 'russie', nations: ['Russie'] },
  'Réunion_Rugby_logo.jpg': { slug: 'la_reunion', nations: ['La Réunion', 'Réunion'] },
  'Scottish_Rugby_team_logo.svg': { slug: 'ecosse', nations: ['Écosse', 'Ecosse'] },
  'Singapore_rugby.png': { slug: 'singapour', nations: ['Singapour'] },
  'South_Africa_national_rugby_union_team.svg': {
    slug: 'afrique_du_sud', nations: ['Afrique du Sud'],
  },
  'Turks_and_Caicos_Islands_Rugby_logo.png': { slug: 'iles_turques_caiques', nations: ['Îles Turques-et-Caïques'] },
  'Wallis_and_Fortuna_Rugby_logo.png': { slug: 'wallis_futuna', nations: ['Wallis-et-Futuna'] },
  'Welsh_Rugby_Union_logo.svg': { slug: 'pays_de_galles', nations: ['Pays de Galles', 'Galles'] },
  'Zimbabwe_rugby_team_logo.PNG': { slug: 'zimbabwe', nations: ['Zimbabwe'] },
};

function slug(nom) {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function estImage(fichier) {
  const b = fs.readFileSync(fichier);
  const debut = b.subarray(0, Math.min(4096, b.length)).toString('utf8');
  return (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    || (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    || (b.length >= 12 && b.subarray(0, 4).toString() === 'RIFF'
      && b.subarray(8, 12).toString() === 'WEBP')
    || debut.startsWith('GIF8')
    || /<svg[\s>]/i.test(debut);
}

for (const dossier of [SOURCE_PRINCIPALE, SOURCE_CATALOGUE]) {
  if (!fs.existsSync(dossier)) {
    console.error(`❌ Dossier introuvable : ${dossier}`);
    process.exit(1);
  }
}
fs.mkdirSync(CIBLE_PRINCIPALE, { recursive: true });
fs.mkdirSync(CIBLE_COMPLEMENTS, { recursive: true });

let remplaces = 0;
let ajoutes = 0;
for (const fichier of fs.readdirSync(SOURCE_PRINCIPALE)) {
  if (!/\.(png|jpg|jpeg|webp|svg|gif)$/i.test(fichier)) continue;
  const source = path.join(SOURCE_PRINCIPALE, fichier);
  if (!estImage(source)) throw new Error(`Fausse image détectée : ${source}`);
  const ext = path.extname(fichier).toLowerCase();
  const cible = path.join(CIBLE_PRINCIPALE, slug(path.basename(fichier, ext)) + ext);
  const existait = fs.existsSync(cible);
  fs.copyFileSync(source, cible);
  if (existait) remplaces += 1;
  else ajoutes += 1;
}

const livres = fs.readdirSync(SOURCE_CATALOGUE)
  .filter((f) => /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(f));
for (const fichier of livres) {
  const source = path.join(SOURCE_CATALOGUE, fichier);
  if (!estImage(source)) throw new Error(`Fausse image détectée : ${source}`);
}
const nonUtilises = livres.filter((f) => !CATALOGUE[f]);

const table = {};
const ciblesAttendues = new Set();
for (const [fichier, entree] of Object.entries(CATALOGUE)) {
  const source = path.join(SOURCE_CATALOGUE, fichier);
  if (!fs.existsSync(source)) throw new Error(`Logo déclaré mais absent : ${source}`);
  const ext = path.extname(fichier).toLowerCase();
  const nomCible = `${entree.slug}${ext}`;
  ciblesAttendues.add(nomCible);
  fs.copyFileSync(source, path.join(CIBLE_COMPLEMENTS, nomCible));
  for (const nation of entree.nations) table[nation] = `/logos-selections/${nomCible}`;
}
for (const fichier of fs.readdirSync(CIBLE_COMPLEMENTS)) {
  if (!ciblesAttendues.has(fichier)) fs.unlinkSync(path.join(CIBLE_COMPLEMENTS, fichier));
}

const lignes = Object.entries(table)
  .sort(([a], [b]) => a.localeCompare(b, 'fr'))
  .map(([nation, logo]) => `  ${JSON.stringify(nation)}: ${JSON.stringify(logo)},`);

fs.writeFileSync(SORTIE, `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.\n`
  + `// Source : sources/logos/selections/catalogue/\n\n`
  + `export const LOGO_SELECTION_SUPPLEMENTAIRE: Readonly<Record<string, string>> = {\n`
  + `${lignes.join('\n')}\n};\n`, 'utf8');

console.log(`✅ ${remplaces} écusson(s) principal(aux) remplacé(s), ${ajoutes} ajouté(s)`);
console.log(`✅ ${Object.keys(CATALOGUE).length} écusson(s) du catalogue copié(s)`);
console.log(`✅ ${Object.keys(table).length} nom(s) indexé(s) dans src/data/logosSelections.ts`);
if (nonUtilises.length) console.log(`ℹ️ ${nonUtilises.length} variante(s) conservée(s), non utilisée(s) par le jeu`);
