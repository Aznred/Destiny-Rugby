// LES ÉCUSSONS DES SÉLECTIONS NATIONALES
//
// TROIS lots sources, rangés sous `sources/logos/selections/`, du plus
// prioritaire au moins prioritaire :
//   • `principaux/` : les 39 écussons historiques déjà référencés par les
//     données générées ; ils écrasent les petites vignettes du pack clubs ;
//   • `catalogue/` : la livraison complète, contrôlée par signature binaire.
//     Elle contient aussi des équipes A/U20 et des variantes non utilisées ; la
//     table explicite ci-dessous choisit la bonne image pour chaque nom du jeu ;
//   • `nations/` : ⚠️ **LE BOUCHE-TROU**, et rien d'autre. 167 écussons livrés
//     en vrac, un fichier par pays, nommés dans la langue du jeu. Il ne sert
//     qu'aux nations que les deux autres lots ne couvrent pas — mesuré avant
//     son arrivée : **41 des 114 nations classées n'avaient aucun logo**
//     (Corée du Sud, Sénégal, Ouganda, Nigeria, Chine, Grèce…) et affichaient
//     donc un simple drapeau. Il n'a AUCUNE table à tenir à la main : le nom du
//     fichier EST le nom du pays, la correspondance se fait toute seule (plus
//     `ALIAS_NATIONS` pour les quelques orthographes qui diffèrent).
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
const SOURCE_NATIONS = path.join(RACINE, 'sources', 'logos', 'selections', 'nations');
const CIBLE_PRINCIPALE = path.join(RACINE, 'public', 'logos');
const CIBLE_COMPLEMENTS = path.join(RACINE, 'public', 'logos-selections');
const SORTIE = path.join(RACINE, 'src', 'data', 'logosSelections.ts');

// Priorité absolue : ces fichiers sont les logos de référence du jeu. Les
// alias couvrent les noms canoniques du moteur et ceux des données historiques.
const PRINCIPAUX = {
  'afrique_du_sud.png': ['Afrique du Sud'],
  'afrique_du_sud_a.png': ['Afrique du Sud A'],
  'all_blacks_xv.png': ['All Blacks XV'],
  'allemagne.png': ['Allemagne'],
  'angleterre.png': ['Angleterre'],
  'angleterre_a.png': ['Angleterre A'],
  'argentine.png': ['Argentine'],
  'australie.png': ['Australie'],
  'barbarians.png': ['Barbarians'],
  'belgique.png': ['Belgique'],
  'brésil.png': ['Brésil'],
  'canada.png': ['Canada'],
  'chili.png': ['Chili'],
  'espagne.png': ['Espagne'],
  'fidji.png': ['Fidji'],
  'france.png': ['France'],
  'france_a.png': ['France A'],
  'galles.png': ['Galles', 'Pays de Galles'],
  'géorgie.png': ['Géorgie'],
  'hong_kong.png': ['Hong Kong', 'Hong Kong Chine'],
  'irlande.png': ['Irlande'],
  'irlande_a.png': ['Irlande A'],
  'italie.png': ['Italie'],
  'italie_xv.png': ['Italie XV'],
  'japon.png': ['Japon'],
  'japon_xv.png': ['Japon XV'],
  'māori_all_blacks.png': ['Māori All Blacks'],
  'namibie.png': ['Namibie'],
  'nouvelle-zélande.png': ['Nouvelle-Zélande', 'Nouvelle Zélande'],
  'pays-bas.png': ['Pays-Bas'],
  'portugal.png': ['Portugal'],
  'roumanie.png': ['Roumanie'],
  'samoa.png': ['Samoa'],
  'suisse.png': ['Suisse'],
  'tonga.png': ['Tonga'],
  'uruguay.png': ['Uruguay'],
  'usa.png': ['États-Unis', 'USA'],
  'zimbabwe.png': ['Zimbabwe'],
  'écosse.png': ['Écosse', 'Ecosse'],
};

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

// ⚠️ LES QUELQUES NOMS QUI NE TOMBENT PAS EN FACE. Le pack est nommé en
// français, comme le jeu : la correspondance est automatique dans 95 % des cas.
// Ne sont listées ici que les divergences réelles — clé = nom du fichier livré
// (sans extension), valeur = les noms canoniques du jeu.
const ALIAS_NATIONS = {
  'Corée du Sud': ['Corée du Sud', 'Coree du Sud'],
  'Côte d’Ivoire': ['Côte d’Ivoire', "Côte d'Ivoire"],
  'États-Unis': ['États-Unis', 'USA', 'Etats-Unis'],
  'Trinité-et-Tobago': ['Trinité-et-Tobago', 'Trinidad-et-Tobago'],
  'Saint-Vincent-et-les-Grenadines': ['Saint-Vincent-et-les-Grenadines', 'Saint-Vincent et les Grenadines'],
  'Émirats arabes unis': ['Émirats arabes unis', 'Emirats arabes unis'],
  'Îles Caïmans': ['Îles Caïmans', 'Iles Caïmans', 'Îles Caimans'],
  'Taïwan': ['Taïwan', 'Taiwan', 'Taipei chinois'],
  'Bosnie-Herzégovine': ['Bosnie-Herzégovine', 'Bosnie Herzégovine'],
  'République tchèque': ['République tchèque', 'République Tchèque', 'Tchéquie'],
  'Pays-Bas': ['Pays-Bas', 'Pays Bas'],
  'Nouvelle-Zélande': ['Nouvelle-Zélande', 'Nouvelle Zélande'],
  'Papouasie-Nouvelle-Guinée': ['Papouasie-Nouvelle-Guinée', 'Papouasie Nouvelle-Guinée'],
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
const principauxLivres = fs.readdirSync(SOURCE_PRINCIPALE)
  .filter((f) => /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(f));
const principauxNonDeclares = principauxLivres.filter((f) => !PRINCIPAUX[f]);
const principauxAbsents = Object.keys(PRINCIPAUX).filter((f) => !principauxLivres.includes(f));
if (principauxNonDeclares.length || principauxAbsents.length) {
  throw new Error(`Table des logos principaux désynchronisée : non déclarés [${principauxNonDeclares.join(', ')}], absents [${principauxAbsents.join(', ')}]`);
}
const tablePrincipale = {};
for (const fichier of principauxLivres) {
  const source = path.join(SOURCE_PRINCIPALE, fichier);
  if (!estImage(source)) throw new Error(`Fausse image détectée : ${source}`);
  const ext = path.extname(fichier).toLowerCase();
  const cible = path.join(CIBLE_PRINCIPALE, slug(path.basename(fichier, ext)) + ext);
  const existait = fs.existsSync(cible);
  fs.copyFileSync(source, cible);
  if (existait) remplaces += 1;
  else ajoutes += 1;
  for (const nation of PRINCIPAUX[fichier]) {
    tablePrincipale[nation] = `/logos/${path.basename(cible)}`;
  }
}

const livres = fs.readdirSync(SOURCE_CATALOGUE)
  .filter((f) => /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(f));
for (const fichier of livres) {
  const source = path.join(SOURCE_CATALOGUE, fichier);
  if (!estImage(source)) throw new Error(`Fausse image détectée : ${source}`);
}
const nonUtilises = livres.filter((f) => !CATALOGUE[f]);

const tableCatalogue = {};
const ciblesAttendues = new Set();
for (const [fichier, entree] of Object.entries(CATALOGUE)) {
  const source = path.join(SOURCE_CATALOGUE, fichier);
  if (!fs.existsSync(source)) throw new Error(`Logo déclaré mais absent : ${source}`);
  const ext = path.extname(fichier).toLowerCase();
  const nomCible = `${entree.slug}${ext}`;
  ciblesAttendues.add(nomCible);
  fs.copyFileSync(source, path.join(CIBLE_COMPLEMENTS, nomCible));
  for (const nation of entree.nations) tableCatalogue[nation] = `/logos-selections/${nomCible}`;
}
// ⚠️ LA PURGE A ÉTÉ DÉPLACÉE PLUS BAS, après le lot « nations » : elle efface
// tout ce qui n'est pas dans `ciblesAttendues`, et les `nation_*.png` n'y
// entrent qu'au bloc suivant. Purger ici les aurait supprimés à chaque passage
// pour les recopier aussitôt — inutile, et surtout piégeux le jour où le lot
// « nations » est absent.

// ═══════════════════════════════════════════════════════════════════════════
// LE BOUCHE-TROU : un écusson pour les nations qu'aucun des deux lots ne couvre
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ AUCUNE TABLE À TENIR À LA MAIN. Le nom du fichier EST le nom du pays dans
// la langue du jeu — c'est ce qui rend ce lot maintenable : ajouter un pays,
// c'est déposer un PNG, rien d'autre. Et c'est bien un REPLI : la table générée
// est consultée en DERNIER (`LOGO_SELECTION_NATIONS`), après les écussons
// officiels des deux autres lots.
const tableNations = {};
let nationsCopiees = 0;
if (fs.existsSync(SOURCE_NATIONS)) {
  for (const fichier of fs.readdirSync(SOURCE_NATIONS).filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))) {
    const source = path.join(SOURCE_NATIONS, fichier);
    // Une « image » qui n'en est pas casserait l'affichage sans le moindre
    // message : même contrôle par signature binaire que pour les autres lots.
    if (!estImage(source)) {
      console.warn(`   ⚠ ignoré (pas une image) : nations/${fichier}`);
      continue;
    }
    const ext = path.extname(fichier).toLowerCase();
    const pays = path.basename(fichier, ext);
    const nomCible = `nation_${slug(pays)}${ext}`;
    ciblesAttendues.add(nomCible);
    fs.copyFileSync(source, path.join(CIBLE_COMPLEMENTS, nomCible));
    nationsCopiees += 1;
    for (const nom of ALIAS_NATIONS[pays] ?? [pays]) {
      tableNations[nom] = `/logos-selections/${nomCible}`;
    }
  }
} else {
  console.warn(`ℹ️ lot « nations » absent (${SOURCE_NATIONS}) — les nations sans écusson garderont leur drapeau.`);
}

// La purge, maintenant que TOUS les lots ont annoncé leurs cibles : ce qui
// traîne dans `public/logos-selections/` sans être déclaré est un reste d'une
// version précédente du script.
for (const fichier of fs.readdirSync(CIBLE_COMPLEMENTS)) {
  if (!ciblesAttendues.has(fichier)) fs.unlinkSync(path.join(CIBLE_COMPLEMENTS, fichier));
}

const lignesNations = Object.entries(tableNations)
  .sort(([a], [b]) => a.localeCompare(b, 'fr'))
  .map(([nation, logo]) => `  ${JSON.stringify(nation)}: ${JSON.stringify(logo)},`);

const lignesPrincipales = Object.entries(tablePrincipale)
  .sort(([a], [b]) => a.localeCompare(b, 'fr'))
  .map(([nation, logo]) => `  ${JSON.stringify(nation)}: ${JSON.stringify(logo)},`);
const lignesCatalogue = Object.entries(tableCatalogue)
  .sort(([a], [b]) => a.localeCompare(b, 'fr'))
  .map(([nation, logo]) => `  ${JSON.stringify(nation)}: ${JSON.stringify(logo)},`);

fs.writeFileSync(SORTIE, `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.\n`
  + `// Sources, dans l'ordre de priorité : sources/logos/selections/principaux/,\n`
  + `// puis catalogue/, puis nations/ (le bouche-trou, un fichier par pays).\n\n`
  + `export const LOGO_SELECTION_PRINCIPALE: Readonly<Record<string, string>> = {\n`
  + `${lignesPrincipales.join('\n')}\n};\n\n`
  + `export const LOGO_SELECTION_CATALOGUE: Readonly<Record<string, string>> = {\n`
  + `${lignesCatalogue.join('\n')}\n};\n\n`
  + `// ⚠️ CONSULTÉE EN DERNIER. Écussons génériques livrés en vrac : ils évitent\n`
  + `// qu'une nation classée n'ait aucune image, jamais ils ne passent devant un\n`
  + `// écusson officiel des deux tables ci-dessus.\n`
  + `export const LOGO_SELECTION_NATIONS: Readonly<Record<string, string>> = {\n`
  + `${lignesNations.join('\n')}\n};\n\n`
  + `// Alias conservé pour les éventuels imports plus anciens.\n`
  + `export const LOGO_SELECTION_SUPPLEMENTAIRE = LOGO_SELECTION_CATALOGUE;\n`, 'utf8');

console.log(`✅ ${remplaces} écusson(s) principal(aux) remplacé(s), ${ajoutes} ajouté(s)`);
console.log(`✅ ${Object.keys(CATALOGUE).length} écusson(s) du catalogue copié(s)`);
console.log(`✅ ${nationsCopiees} écusson(s) du lot « nations » copié(s) (bouche-trou)`);
console.log(`✅ ${Object.keys(tablePrincipale).length} nom(s) principal(aux), prioritaires`);
console.log(`✅ ${Object.keys(tableCatalogue).length} nom(s) du catalogue, utilisés en repli`);
console.log(`✅ ${Object.keys(tableNations).length} nom(s) du lot nations, en dernier recours`);
if (nonUtilises.length) console.log(`ℹ️ ${nonUtilises.length} variante(s) conservée(s), non utilisée(s) par le jeu`);
