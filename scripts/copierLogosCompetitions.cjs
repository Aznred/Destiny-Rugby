// Copie les logos fournis (`sources/logos/competitions/`) vers
// public/logos-competitions/<id>.<ext>, nommés par l'ID DE COMPÉTITION du jeu :
// plus besoin de deviner à l'exécution, `src/data/logosCompetitions.ts` fait
// simplement `/logos-competitions/top14.webp`.
//
// Relancer avec : node scripts/copierLogosCompetitions.cjs
// Ajouter une compétition = déposer son image dans `sources/logos/competitions/` et ajouter
// une ligne dans CORRESPONDANCE ci-dessous.
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const SRC = path.join(RACINE, 'sources', 'logos', 'competitions');
const DEST = path.join(RACINE, 'public', 'logos-competitions');

// id de compétition (COMPETITIONS, COUPES_EUROPE, COMPETITIONS_NATIONS, ou id
// de trophée) → nom du fichier fourni.
const CORRESPONDANCE = {
  // France
  top14: 'Top_14.svg.webp',
  prod2: 'ProD2_logo_2012.svg.webp',
  nationale: 'Logo_championnat_fédéral_Nationale_2022.png',
  nationale2: 'Logo_championnat_fédéral_Nationale_2_2022.png',
  fed1: '960px-Logo_Fédérale_1_2019.png',
  fed2: 'Logo_championnat_Fédérale_2_2022.png',
  fed3: 'Logo_championnat_Fédérale_3_2022.png',
  reg1: 'reg1.webp',
  reg2: 'reg2.webp',
  reg3: 'reg3.webp',
  // Monde
  premiership: 'Logo_Premiership_Rugby_2018.svg.webp',
  championship: 'rfu championship.png',
  urc: 'Logo_URC.png',
  super: 'Logo_Super_Rugby_Pacific_2022.png',
  npc: 'bunningsNPClogo-797x1024.jpg',
  japon1: 'japan league one.png',
  japon2: 'japan league one.png',
  japon3: 'japan league one.png',
  mlr: 'Logo_Major_League_Rugby_2018.png',
  // Coupes de clubs
  championsCup: 'Logo_Investec_Champions_Cup_2023.svg.webp',
  challengeCup: 'Logo_Challenge_Cup_2021.png',
  premCup: 'premiership_cup_aem-540x650.png',
  // Sélections
  sixNations: '6nations.jpg',
  sixNationsU20: '6nations.jpg',
  mondialU20: 'World_Rugby_Under_20_Championship_logo.png',
  coupeDuMonde: 'Logo_Rugby_World_Cup_(générique_2023).svg.webp',
  qualifCdm: 'Logo_Rugby_World_Cup_(générique_2023).svg.webp',
};

fs.mkdirSync(DEST, { recursive: true });

const dispo = new Map();
for (const f of fs.readdirSync(SRC)) dispo.set(f, path.join(SRC, f));

let copies = 0;
const manquants = [];
const sortie = {};

for (const [id, fichier] of Object.entries(CORRESPONDANCE)) {
  const source = dispo.get(fichier);
  if (!source) { manquants.push(`${id} → ${fichier}`); continue; }
  const ext = path.extname(fichier).toLowerCase();
  const cible = path.join(DEST, id + ext);
  fs.copyFileSync(source, cible);
  sortie[id] = `/logos-competitions/${id}${ext}`;
  copies++;
}

// Fichiers fournis que personne n'utilise : on le signale (viser zéro).
const utilises = new Set(Object.values(CORRESPONDANCE));
const orphelins = [...dispo.keys()].filter((f) => !utilises.has(f));

console.log(`${copies} logos de compétition copiés vers public/logos-competitions/`);
if (manquants.length) console.log('⚠️ Fichiers introuvables :\n  ' + manquants.join('\n  '));
if (orphelins.length) console.log('ℹ️ Fournis mais non rattachés :\n  ' + orphelins.join('\n  '));

// On écrit la table côté jeu : elle est GÉNÉRÉE, ne pas l'éditer à la main.
const cheminTable = path.join(RACINE, 'src', 'data', 'logosCompetitions.ts');
const lignes = Object.entries(sortie)
  .map(([id, chemin]) => `  ${/^[a-z][a-zA-Z0-9]*$/.test(id) ? id : `'${id}'`}: '${chemin}',`)
  .join('\n');
fs.writeFileSync(
  cheminTable,
  `// ⚠️ FICHIER GÉNÉRÉ par scripts/copierLogosCompetitions.cjs — ne pas éditer.
// id de compétition (ou de trophée) → logo officiel dans public/.
export const LOGO_COMPETITION: Record<string, string> = {
${lignes}
};
`,
  'utf8',
);
console.log('→ src/data/logosCompetitions.ts écrit');
