// Importe la base Mon Club House FFR fournie avec le projet.
//
// La source contient les clubs, les licenciés masculins, les communes,
// départements et coordonnées de la Nationale à la Régionale 3. Le jeu garde
// les vrais licenciés de rugby compétition et ne générera ensuite que les
// compléments nécessaires pour atteindre son minimum jouable de 26 joueurs.
//
// Relancer depuis `Destiny Rugby` :
//   node scripts/importEffectifsFfr.cjs
// Un autre fichier peut être passé en premier argument.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const CANDIDATS = [
  process.argv[2] && path.resolve(process.cwd(), process.argv[2]),
  path.join(RACINE, '..', 'effectifs_ffr.json'),
  path.join(RACINE, '..', 'effectifs', '_ffr.json'),
].filter(Boolean);
const SOURCE = CANDIDATS.find((p) => fs.existsSync(p));
if (!SOURCE) {
  throw new Error(`Base FFR introuvable. Chemins essayés :\n${CANDIDATS.join('\n')}`);
}

const SORTIE = path.join(RACINE, 'src', 'data', 'amateurs.ts');
let ancien = fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, 'utf8') : '';
// Pendant la première migration, la version suivie par Git contient davantage
// d'alias historiques que la sortie en cours de génération.
try {
  const versionnee = execFileSync('git', ['show', 'HEAD:src/data/amateurs.ts'], {
    cwd: RACINE,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (versionnee.includes('export const EFFECTIFS_AMATEURS')) ancien = versionnee;
} catch {
  // Le script doit aussi fonctionner dans une archive sans historique Git.
}
const brut = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

function decoderHtml(s) {
  return String(s ?? '')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const BRUIT = new Set([
  'a', 'ac', 'as', 'ca', 'cm', 'co', 'cs', 'fc', 'ol', 'rc', 'ro', 'sa', 'sc',
  'so', 'ua', 'uc', 'us', 'usa', 'xv', 'club', 'rugby', 'stade', 'sport',
  'sportif', 'sportive', 'sports', 'association', 'athletique', 'cercle',
  'municipal', 'union', 'entente', 'avenir', 'olympique', 'olympic', 'de', 'du',
  'des', 'la', 'le', 'les', 'en', 'sur', 'et', 'aux', 'd', 'l',
]);

function mots(s) {
  return decoderHtml(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bst\b/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((mot) => mot && !BRUIT.has(mot));
}

function cle(s) {
  return mots(s).join('');
}

function lireObjetChaine(source, exportNom) {
  const debut = source.indexOf(`export const ${exportNom}`);
  if (debut < 0) return {};
  const ouverture = source.indexOf('{', debut);
  const fin = source.indexOf('\n};', ouverture);
  if (ouverture < 0 || fin < 0) return {};
  const bloc = source.slice(ouverture + 1, fin);
  const resultat = {};
  for (const ligne of bloc.split('\n')) {
    const double = ligne.match(/^\s*("(?:\\.|[^"\\])*"):\s*("(?:\\.|[^"\\])*")[,]?$/);
    if (double) {
      resultat[JSON.parse(double[1])] = JSON.parse(double[2]);
      continue;
    }
    const simple = ligne.match(/^\s*("(?:\\.|[^"\\])*"):\s*'([^']*)'[,]?$/);
    if (simple) resultat[JSON.parse(simple[1])] = simple[2];
  }
  return resultat;
}

// Les anciennes clés servent d'alias de compatibilité : mercato, sauvegardes
// et récits historiques continuent ainsi à reconnaître les clubs déjà connus.
const anciensLogos = lireObjetChaine(ancien, 'LOGO_AMATEUR');
const anciensEffectifs = lireObjetChaine(ancien, 'EFFECTIFS_AMATEURS');
const anciensNomsMonde = new Set();
// La Nationale appartenait jusqu'ici à la base mondiale. Ses noms canoniques
// et logos locaux doivent eux aussi survivre au passage à la saison courante.
const mondeReel = fs.readFileSync(path.join(RACINE, 'src', 'data', 'mondeReel.ts'), 'utf8');
const franceReelle = mondeReel.slice(0, mondeReel.indexOf("id: 'premiership'"));
for (const match of franceReelle.matchAll(/\{ nom: '((?:\\'|[^'])+)', ville: '(?:\\'|[^'])*', logo: '([^']+)'/g)) {
  const nom = match[1].replace(/\\'/g, "'");
  anciensNomsMonde.add(nom);
  if (!anciensLogos[nom]) anciensLogos[nom] = match[2];
}
const anciensNoms = [...new Set([
  ...Object.keys(anciensLogos),
  ...Object.keys(anciensEffectifs),
])];

const positionsAnciennes = new Map();
for (const [club, chaine] of Object.entries(anciensEffectifs)) {
  const parNom = new Map();
  for (const entree of chaine.split('~')) {
    const separation = entree.lastIndexOf('|');
    const nom = separation >= 0 ? entree.slice(0, separation) : entree;
    const poste = separation >= 0 ? entree.slice(separation + 1) : '';
    if (nom && poste !== '') parNom.set(cle(nom), poste);
  }
  positionsAnciennes.set(club, parNom);
}

function scoreAlias(club, ancienNom) {
  // Un homonyme régional de Grenoble, Brive ou Castres n'est pas le club pro.
  // Seule la Nationale peut récupérer un alias de l'ancienne base pro, car
  // c'est la frontière réellement traversée par les promotions/relégations.
  if (anciensNomsMonde.has(ancienNom) && divisionDuClub(club) !== 'nationale') return 0;
  const kAncien = cle(ancienNom);
  if (!kAncien) return 0;
  // L'acronyme FFR contient souvent la commune postale (« ISLE SUR VIENNE »)
  // et ferait voler l'alias de Vienne par le club d'Isle. Le nom officiel est
  // le seul identifiant assez précis pour une migration automatique.
  const officiel = decoderHtml(club.nom);
  const kOfficiel = cle(officiel);
  if (kOfficiel === kAncien) return 10_000 + kAncien.length;
  let score = 0;
  const a = new Set(mots(officiel));
  const b = new Set(mots(ancienNom));
  const communs = [...a].filter((mot) => b.has(mot));
  const plusPetit = Math.min(a.size, b.size);
  // Inclusion de mots entiers seulement : « Stade Clermontois » ne doit pas
  // être confondu avec « Stade Montois » à cause du suffixe « montois ».
  if (communs.length && communs.length === plusPetit
    && communs.reduce((n, mot) => n + mot.length, 0) >= 5) {
    score = 7_000 + communs.reduce((n, mot) => n + mot.length, 0);
  } else if (communs.length) {
    score = Math.round(4_000 * communs.length / new Set([...a, ...b]).size);
  }
  const ville = cle(club.ville);
  if (ville && kAncien.includes(ville)) score += 300;
  return score;
}

const aliasesPris = new Set();
function nomCanonique(club) {
  let meilleur = '';
  let score = 0;
  for (const ancienNom of anciensNoms) {
    if (aliasesPris.has(ancienNom)) continue;
    const candidat = scoreAlias(club, ancienNom);
    if (candidat > score) {
      score = candidat;
      meilleur = ancienNom;
    }
  }
  if (meilleur && score >= 7_000) {
    aliasesPris.add(meilleur);
    return meilleur;
  }
  const officiel = decoderHtml(club.nom);
  if (officiel) return officiel;
  const acronyme = decoderHtml(club.acronyme);
  return acronyme ? `${acronyme} ${decoderHtml(club.ville)}` : `RC ${decoderHtml(club.ville)}`;
}

const DIVISIONS = [
  { id: 'nationale', test: (n) => n === 'FFR $ Nationale' },
  { id: 'nationale2', test: (n) => n === 'FFR $ Nationale 2' },
  { id: 'fed1', test: (n) => n === 'FFR $ Fédérale 1' },
  { id: 'fed2', test: (n) => n === 'FFR $ Fédérale 2' },
  { id: 'fed3', test: (n) => n === 'FFR $ Fédérale 3' },
  { id: 'reg1', test: (n) => /\$ Régionale 1 - Championnat Territorial$/.test(n) },
  { id: 'reg2', test: (n) => /\$ Régionale 2 - Championnat Territorial$/.test(n) },
  { id: 'reg3', test: (n) => /\$ Régionale 3 - Championnat Territorial$/.test(n) },
];

function divisionDuClub(club) {
  // Un club peut aussi engager une réserve en régionale. Le niveau le plus haut
  // est toujours celui retenu pour son équipe première.
  return DIVISIONS.find((division) => (club.niveaux ?? []).some(division.test))?.id;
}

function prenomPropre(prenom) {
  return decoderHtml(prenom).toLocaleLowerCase('fr-FR').replace(
    /(^|[\s'-])([\p{L}])/gu,
    (_, avant, lettre) => avant + lettre.toLocaleUpperCase('fr-FR'),
  );
}

function nomJoueur(joueur) {
  return `${prenomPropre(joueur.prenom)} ${decoderHtml(joueur.nom).toLocaleUpperCase('fr-FR')}`.trim();
}

function chaineEffectif(club, canonique) {
  const postesConnus = positionsAnciennes.get(canonique) ?? new Map();
  const ids = new Set();
  const joueurs = [];
  for (const joueur of club.joueurs ?? []) {
    if (joueur.genre !== 'M' || joueur.qualite !== 'Rugby compétition') continue;
    if (joueur.id != null && ids.has(joueur.id)) continue;
    if (joueur.id != null) ids.add(joueur.id);
    const nom = nomJoueur(joueur).replace(/[|~]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!nom) continue;
    joueurs.push(`${nom}|${postesConnus.get(cle(nom)) ?? ''}`);
  }
  return joueurs.join('~');
}

function longitudeLatitude(position) {
  if (!Array.isArray(position) || position.length < 2) return {};
  const longitude = Number(position[0]);
  const latitude = Number(position[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return {};
  return { latitude, longitude };
}

// Seul Dumbéa n'a pas de point dans l'export fourni. Coordonnées du centre
// de la commune, utilisées plutôt qu'un placement aléatoire en Grande Terre.
const COORDONNEES_MANUELLES = {
  '7351G': { latitude: -22.177178, longitude: 166.438508 },
};

const clubsParDivision = Object.fromEntries(DIVISIONS.map(({ id }) => [id, []]));
const effectifs = {};
const logos = {};
const nomsPris = new Set();
let joueursReels = 0;
let clubsSansJoueur = 0;

for (const club of brut.clubs ?? []) {
  const division = divisionDuClub(club);
  if (!division) continue;
  let nom = nomCanonique(club);
  if (nomsPris.has(nom)) nom = `${nom} (${decoderHtml(club.ville) || club.code})`;
  nomsPris.add(nom);

  const logo = anciensLogos[nom] ?? (decoderHtml(club.embleme) || undefined);
  const coordonneesFfr = longitudeLatitude(club.position);
  const coordonnees = Object.keys(coordonneesFfr).length
    ? coordonneesFfr
    : (COORDONNEES_MANUELLES[decoderHtml(club.code)] ?? {});
  const fiche = {
    nom,
    ville: decoderHtml(club.ville),
    departement: decoderHtml(club.departement),
    departementNum: decoderHtml(club.departement_num),
    codePostal: decoderHtml(club.code_postal),
    ligue: decoderHtml(club.ligue),
    ...coordonnees,
    structureId: club.structure_id,
    ffrCode: decoderHtml(club.code),
    ...(logo ? { logo } : {}),
  };
  clubsParDivision[division].push(fiche);
  if (logo) logos[nom] = logo;

  const effectif = chaineEffectif(club, nom);
  if (effectif) {
    effectifs[nom] = effectif;
    joueursReels += effectif.split('~').length;
  } else clubsSansJoueur += 1;
}

// Ordre déterministe et déjà géographique. Le moteur de championnat refait un
// regroupement équilibré, notamment après les montées et descentes.
for (const liste of Object.values(clubsParDivision)) {
  liste.sort((a, b) => (
    a.ligue.localeCompare(b.ligue, 'fr')
    || (a.latitude ?? 99) - (b.latitude ?? 99)
    || (a.longitude ?? 99) - (b.longitude ?? 99)
    || a.nom.localeCompare(b.nom, 'fr')
  ));
}

function lignesObjet(objet, indentation = '  ') {
  return Object.entries(objet).map(([cleObjet, valeur]) => (
    `${indentation}${JSON.stringify(cleObjet)}: ${JSON.stringify(valeur)},`
  )).join('\n');
}

const lignesClubs = Object.entries(clubsParDivision).map(([division, clubs]) => {
  const lignes = clubs.map((club) => `    ${JSON.stringify(club)},`).join('\n');
  return `  ${division}: [\n${lignes}\n  ],`;
}).join('\n');

const contenu = `// ⚠️ FICHIER GÉNÉRÉ par scripts/importEffectifsFfr.cjs — ne pas éditer à la main.
// Source : Mon Club House FFR, saison ${brut.saison ?? 'inconnue'}.
// Joueurs masculins « Rugby compétition » et géographie officielle des clubs.

export const POSTES_AMATEURS = ["pilier","talonneur","deuxieme_ligne","troisieme_ligne","demi_melee","demi_ouverture","centre","ailier","arriere"] as const;

export interface ClubAmateurFfr {
  nom: string;
  ville: string;
  departement: string;
  departementNum: string;
  codePostal: string;
  ligue: string;
  latitude?: number;
  longitude?: number;
  structureId: number;
  ffrCode: string;
  logo?: string;
}

export const SOURCE_EFFECTIFS_FFR = ${JSON.stringify({ saison: brut.saison, source: brut.source, fichier: path.basename(SOURCE) })} as const;

// Composition courante de la pyramide. La Nationale est incluse pour garder
// cohérentes les promotions depuis la Nationale 2 et les relégations vers elle.
export const CLUBS_AMATEURS: Record<string, ClubAmateurFfr[]> = {
${lignesClubs}
};

// Compatibilité avec les écrans qui distinguent encore les trois régionales.
export const CLUBS_REGIONAUX: Record<string, ClubAmateurFfr[]> = {
  reg1: CLUBS_AMATEURS.reg1,
  reg2: CLUBS_AMATEURS.reg2,
  reg3: CLUBS_AMATEURS.reg3,
};

export const LOGO_AMATEUR: Record<string, string> = {
${lignesObjet(logos)}
};

// Encodage compact : « Prénom NOM|indice de poste », séparé par « ~ ».
// Un poste absent est distribué sur une composition équilibrée côté jeu.
export const EFFECTIFS_AMATEURS: Record<string, string> = {
${lignesObjet(effectifs)}
};
`;

fs.writeFileSync(SORTIE, contenu, 'utf8');

console.log(`Source          : ${SOURCE}`);
console.log(`Saison FFR      : ${brut.saison ?? 'inconnue'}`);
for (const { id } of DIVISIONS) console.log(`${id.padEnd(15)}: ${clubsParDivision[id].length} clubs`);
console.log(`Joueurs réels   : ${joueursReels}`);
console.log(`Clubs sans joueur de compétition : ${clubsSansJoueur}`);
console.log(`Sortie          : ${SORTIE}`);
