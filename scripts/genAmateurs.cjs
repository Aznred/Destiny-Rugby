// Générateur du MONDE AMATEUR — Destiny Rugby 🏉
//
// Lit les données fournies :
//   liste club regionaux/clubs_regionaux.json            (185 clubs R1/R2/R3)
//   transfert + joueur .../effectifs_nationale2.json     (675 joueurs)
//   transfert + joueur .../effectifs_federales_complet.json  (6 898)
//   transfert + joueur .../effectifs_regionales.json     (4 402)
//   transfert + joueur .../transferts_amateurs_complet.json  (3 224 mouvements)
//   logos_equipes/logos_amateurs/**                      (525 logos)
//
// Écrit :
//   src/data/amateurs.ts   clubs régionaux, logos amateurs, effectifs amateurs
//   src/data/mercato.ts    mercato estival (arrivées/départs/prolongations)
//
// Les données amateurs ne donnent NI âge NI note : seuls le nom et le poste sont
// réels. L'âge et le niveau sont tirés à la génération, de façon déterministe
// (seed = nom du joueur), à partir du niveau de la division — voir effectif.ts.
//
// Relancer : node scripts/genAmateurs.cjs
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const lire = (p) => JSON.parse(fs.readFileSync(path.join(RACINE, p), 'utf8'));

const DOSSIER_T = 'transfert + joueur nat2, fed et reg';

// --------------------------------------------------------------------------
// Outils de normalisation / rapprochement de noms de clubs
// --------------------------------------------------------------------------
const sansAccent = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'");

// Les sources HTML laissent passer des entités (« Rives d&#039;Orb ») et les
// noms de fichiers les gardent encodées (« rives_d039orb.png »).
function decoderHtml(s) {
  return String(s)
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/([a-z])0?39([a-z])/gi, "$1'$2") // « d039orb » → « d'orb »
    .replace(/\s+/g, ' ')
    .trim();
}

// Mots qui ne distinguent pas un club (« RC », « Stade », « Rugby »…) : on les
// retire pour rapprocher « US Tyrosse » de « Tyrosse » ou « SC Graulhet » de
// « SG Graulhet ».
const BRUIT = new Set([
  'rc', 'us', 'as', 'sc', 'ca', 'co', 'cs', 'fc', 'sa', 'so', 'ac', 'ua', 'uc',
  'usa', 'ro', 'roc', 'ol', 'rcba', 'aorc', 'xv', 'rugby', 'club', 'stade',
  'sporting', 'sports', 'sport', 'union', 'sportive', 'olympique', 'olympic',
  'athletique', 'avenir', 'entente', 'association', 'de', 'du', 'des', 'la',
  'le', 'les', 'en', 'sur', 'et', 'aux', 'd', 'l', 'rugbyclub', 'ovalie',
]);

// Sigles employés par les sources de mercato et absents des listes officielles.
const ALIAS_CLUB = {
  aix: 'Provence Rugby',
  usbpa: 'US Bressane', // Union Sportive Bressane Pays de l'Ain
  aorc: 'Anglet Olympique',
  rcba: 'Rugby Club Bassin D Arcachon',
  maulenon: 'SA Mauléonais', // faute de frappe dans le nom du fichier fourni
};

function cle(nom) {
  const brut = decoderHtml(nom);
  const sigle = sansAccent(brut).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (ALIAS_CLUB[sigle]) return cle(ALIAS_CLUB[sigle]);
  return sansAccent(brut)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((m) => m && !BRUIT.has(m))
    .join('');
}

// Slug de fichier logo (même règle que copierLogos.cjs).
function slugLogo(nomFichier) {
  return sansAccent(nomFichier).toLowerCase().replace(/[^a-z0-9._-]/g, '_');
}

// Nom de club présentable : on ne reformate QUE les noms tout en majuscules
// (« RHONE SPORTI »), sinon on abîmerait ceux déjà bien écrits (« Rives d'Orb »).
function nomPropre(brut) {
  const nom = decoderHtml(brut);
  return /[a-zà-ÿ]/.test(nom) ? nom : reformater(nom);
}

// --------------------------------------------------------------------------
// Noms de clubs du JEU : on les relit dans src/data/clubs.ts pour rester la
// seule source de vérité (Nationale 2 = tableau `club(...)`, Fédérales = blocs
// « NOM OFFICIEL|Nom court »).
// --------------------------------------------------------------------------
const ACRONYMES = new Set([
  'XV', 'AS', 'RC', 'US', 'SC', 'SA', 'SO', 'CA', 'CO', 'CS', 'FC', 'ES', 'RO',
  'UA', 'UC', 'OL', 'ASV', 'USO', 'USON', 'USEP', 'SCUF', 'SMUC', 'TOEC',
  'TOAC', 'FCT', 'ACBB', 'JA', 'BSE', 'ROC', 'ACLR',
]);
const MINUSCULES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'sur', 'en', 'et', 'aux', 'd', 'l']);

function reformater(officiel) {
  return officiel
    .split(' ')
    .map((mot, i) => {
      if (mot.length <= 1) return mot.toUpperCase();
      if (ACRONYMES.has(mot.toUpperCase())) return mot.toUpperCase();
      const bas = mot.toLowerCase();
      if (i > 0 && MINUSCULES.has(bas)) return bas;
      return bas.charAt(0).toUpperCase() + bas.slice(1);
    })
    .join(' ');
}

function clubsDuJeu() {
  const src = fs.readFileSync(path.join(RACINE, 'src/data/clubs.ts'), 'utf8');
  const par = {};

  // Nationale 2 : suite de club('Nom', 'Ville')
  const blocN2 = src.slice(src.indexOf('const NATIONALE2'), src.indexOf('const FEDERALE1'));
  // Les apostrophes obligent parfois les guillemets doubles : club('X', "Y").
  par.nationale2 = [...blocN2.matchAll(/club\(\s*(['"])(.+?)\1\s*,\s*(['"])(.+?)\3\s*\)/g)].map((m) => ({
    nom: m[2], ville: m[4],
  }));

  // Fédérales : blocs `NOM OFFICIEL|Nom court`
  for (const [id, nomConst] of [['fed1', 'FEDERALE1'], ['fed2', 'FEDERALE2'], ['fed3', 'FEDERALE3']]) {
    const debut = src.indexOf(`const ${nomConst} = parser(\``);
    const fin = src.indexOf('`)', debut);
    par[id] = src
      .slice(src.indexOf('`', debut) + 1, fin)
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [officiel, court] = l.split('|');
        return { nom: reformater(officiel.trim()), ville: (court || '').trim() };
      });
  }
  return par;
}

// --------------------------------------------------------------------------
// 1. CLUBS RÉGIONAUX (R1 / R2 / R3)
// --------------------------------------------------------------------------
const DIV_REG = {
  'Regionale 1': 'reg1',
  'Regionale 2': 'reg2',
  'Regionale 3': 'reg3',
};

const clubsRegionaux = lire('liste club regionaux/clubs_regionaux.json');
const REGIONALES = { reg1: [], reg2: [], reg3: [] };
for (const c of clubsRegionaux) {
  const id = DIV_REG[c.Division];
  if (!id) {
    console.warn(`⚠ division régionale inconnue : ${c.Division}`);
    continue;
  }
  REGIONALES[id].push({ nom: nomPropre(c['Équipe']), logoFichier: c.Fichier_Logo });
}

// --------------------------------------------------------------------------
// 2. LOGOS AMATEURS : slug de fichier → chemin public
// --------------------------------------------------------------------------
// Parcours RÉCURSIF du pack amateur : les logos sont rangés par division, et
// les compléments arrivent dans des sous-dossiers (« nationale_2/qui manque »).
const RACINE_LOGOS = path.join(RACINE, 'logos_equipes/logos_amateurs');

// Le dossier donne la division : indispensable pour ne pas coller le logo de
// « R C Orléans la Source » (Fédérale 3) au « RC Orléans » de Nationale 2.
function divisionDuDossier(chemin) {
  const bas = chemin.toLowerCase();
  if (bas.includes('nationale_1')) return 'nationale';
  if (bas.includes('nationale_2')) return 'nationale2';
  if (bas.includes('federale_1')) return 'fed1';
  if (bas.includes('federale_2')) return 'fed2';
  if (bas.includes('federale_3')) return 'fed3';
  if (bas.includes('regionale_1') || bas.includes('rgionale_1')) return 'reg1';
  if (bas.includes('regionale_2') || bas.includes('rgionale_2')) return 'reg2';
  if (bas.includes('regionale_3') || bas.includes('rgionale_3')) return 'reg3';
  return 'autre';
}

const logoParDivision = new Map(); // division → Map(clé → fichier)
const logoGlobal = new Map();
let nbLogos = 0;
(function parcourirLogos(chemin) {
  if (!fs.existsSync(chemin)) return;
  for (const entree of fs.readdirSync(chemin, { withFileTypes: true })) {
    const complet = path.join(chemin, entree.name);
    if (entree.isDirectory()) { parcourirLogos(complet); continue; }
    if (!/\.(png|svg)$/i.test(entree.name)) continue;
    nbLogos += 1;
    // « Logo_Rugby_Club_Orléans_-_2022.svg » → « orleans »
    const k = cle(entree.name.replace(/\.(png|svg)$/i, '').replace(/_/g, ' ').replace(/\b(logo|20\d\d)\b/gi, ''));
    if (!k) continue;
    const fichier = slugLogo(entree.name);
    const division = divisionDuDossier(complet);
    if (!logoParDivision.has(division)) logoParDivision.set(division, new Map());
    const m = logoParDivision.get(division);
    if (!m.has(k)) m.set(k, fichier);
    if (!logoGlobal.has(k)) logoGlobal.set(k, fichier);
  }
})(RACINE_LOGOS);

// Rapprochement souple : « quillan limoux » retrouve « US Quillan Limoux Haute
// Vallée de l'Aude », « josbaig st goin » retrouve « U S Josbaig ». On exige au
// moins 5 caractères DES DEUX CÔTÉS et on garde la correspondance la plus
// longue, pour éviter les faux amis (« tt » ⊂ « servettegeneve »).
function chercherLogo(table, cles) {
  for (const k of cles) {
    const direct = table.get(k);
    if (direct) return direct;
  }
  let meilleur = null;
  let longueur = 0;
  for (const [k, fichier] of table) {
    if (k.length < 5) continue;
    for (const x of cles) {
      if (x.length < 5) continue;
      if ((x.includes(k) || k.includes(x)) && k.length > longueur) {
        meilleur = fichier;
        longueur = k.length;
      }
    }
  }
  return meilleur ?? undefined;
}

function logoPourCles(cles, division) {
  const meme = logoParDivision.get(division);
  return (meme ? chercherLogo(meme, cles) : undefined) ?? chercherLogo(logoGlobal, cles);
}

// --------------------------------------------------------------------------
// 3. EFFECTIFS AMATEURS
// --------------------------------------------------------------------------
const POSTES = [
  'pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne',
  'demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere',
];
const POSTE_PAR_LIBELLE = {
  'pilier': 'pilier',
  'talonneur': 'talonneur',
  'deuxieme ligne': 'deuxieme_ligne',
  '2eme ligne': 'deuxieme_ligne',
  'troisieme ligne': 'troisieme_ligne',
  '3eme ligne': 'troisieme_ligne',
  'demi de melee': 'demi_melee',
  "demi d'ouverture": 'demi_ouverture',
  'centre': 'centre',
  'ailier': 'ailier',
  'arriere': 'arriere',
};

function posteId(libelle) {
  const l = sansAccent(String(libelle).replace(/&#0?39;/g, "'"))
    .toLowerCase()
    .trim();
  return POSTE_PAR_LIBELLE[l] ?? null;
}

// --------------------------------------------------------------------------
// FILTRE DES SECTIONS FÉMININES
// rugbyamateur.fr liste TOUS les licenciés d'un club, sections féminines
// comprises. La source ne donne aucun indicateur de genre : on s'appuie donc
// sur le prénom. Les prénoms mixtes (Camille, Dominique, Claude…) sont
// volontairement ABSENTS de la liste — mieux vaut garder une joueuse qu'écarter
// un joueur.
const PRENOMS_FEMININS = new Set(`
alice alicia aline amandine amelie ana anais andrea angele angelique anna annabelle anne
annie anouk astrid aude audrey aurelie aurore axelle barbara beatrice berengere bernadette
blandine brigitte camelia capucine carine carla carole caroline cassandra catherine cecile
celia celine chantal charlene charlotte chloe christelle christiane christine cindy claire
clara clarisse clemence clementine colette coline constance coralie corinne cyrielle daniele
danielle deborah delphine denise diane dorine edith eleonore elena elisa elisabeth elise ella
elodie eloise elsa emeline emilie emma emmanuelle estelle esther eugenie eva evelyne fanny
fatima fatoumata flavie fleur flora florence florine france francoise gaelle genevieve
georgette gisele guylaine gwenaelle helene heloise hortense ines ingrid irene isabelle jade
jeanne jennifer jessica joelle josephine josiane judith julie juliette justine karine katia
laetitia laura laure laurence laurie lea leane leila lena leonie leslie lilou lise louane
louise louna lucie lucile ludivine lydie maelle magali maeva maiwenn manon margaux margot
maria marianne marie marielle marina marine marion marlene marthe martine maryline mathilde
maud maureen melanie melina melissa melodie mia michele mireille monique morgane muriel
myriam nadege nadia nadine naomi nathalie nelly nina noemie nolwenn oceane odile olivia
ophelie pascale patricia paula pauline penelope perrine priscilla prune rachel raphaelle
rebecca regine renee romane rosalie rose roseline sabine sabrina salome sandra sandrine sarah
severine sidonie simone sofia solange solene sonia sophie stephanie susana suzanne sylvie
tatiana thais therese tiphaine valentine valerie vanessa veronique victoire victoria violette
virginie viviane yasmine yolande zoe enola margaux ambre lou lola lilly meline maylis
`.trim().split(/\s+/));

function estFeminin(nomComplet) {
  const prenom = sansAccent(decoderHtml(nomComplet)).toLowerCase().split(/[\s-]/)[0];
  return PRENOMS_FEMININS.has(prenom);
}

const LIGUE_VERS_DIVISION = {
  'Nationale 2': 'nationale2',
  'Fédérale 1': 'fed1',
  'Fédérale 2': 'fed2',
  'Fédérale 3': 'fed3',
  'Régionale 1': 'reg1',
  'Régionale 2': 'reg2',
  'Régionale 3': 'reg3',
};

const brutEffectifs = [
  ...lire(`${DOSSIER_T}/effectifs_nationale2.json`),
  ...lire(`${DOSSIER_T}/effectifs_federales_complet.json`),
  ...lire(`${DOSSIER_T}/effectifs_regionales.json`),
];

// division → clé d'équipe (données) → liste de joueurs
const effectifsParDivision = {};
let joueusesEcartees = 0;
for (const l of brutEffectifs) {
  const div = LIGUE_VERS_DIVISION[l.Ligue];
  if (!div) {
    console.warn(`⚠ ligue inconnue : ${l.Ligue}`);
    continue;
  }
  // Carrière masculine : on écarte les sections féminines du club.
  if (estFeminin(l.Joueur)) { joueusesEcartees += 1; continue; }
  const k = cle(l['Équipe']);
  (effectifsParDivision[div] ??= new Map());
  const m = effectifsParDivision[div];
  if (!m.has(k)) m.set(k, { equipe: l['Équipe'], joueurs: [] });
  m.get(k).joueurs.push({ nom: nettoyerNom(l.Joueur), poste: posteId(l.Poste) });
}

function nettoyerNom(nom) {
  return decoderHtml(nom);
}

// --------------------------------------------------------------------------
// 4. RAPPROCHEMENT clubs du jeu ↔ données (effectifs + logos)
// --------------------------------------------------------------------------
const jeu = clubsDuJeu();
// Les divisions régionales sont, elles, créées à partir des données : leur clé
// est directement celle du nom fourni.
for (const id of ['reg1', 'reg2', 'reg3']) {
  jeu[id] = REGIONALES[id].map((c) => ({ nom: c.nom, ville: '', logoFichier: c.logoFichier }));
}

// Cherche un effectif dans les AUTRES divisions (club promu ou relégué depuis
// la collecte des données : Niort et Tarbes sont montés en Nationale).
const consommeesAilleurs = new Set();
function chercherAilleurs(cles, saufDivision) {
  for (const [division, m] of Object.entries(effectifsParDivision)) {
    if (division === saufDivision) continue;
    for (const k of cles) {
      const marque = `${division}#${k}`;
      if (m.has(k) && !consommeesAilleurs.has(marque)) {
        consommeesAilleurs.add(marque);
        return m.get(k);
      }
    }
  }
  return null;
}

const EFFECTIFS = {}; // nom de club (jeu) → liste encodée
const LOGOS = {}; // nom de club (jeu) → /logos/xxx.png
const sansEffectif = [];
const sansLogo = [];
const equipesNonUtilisees = [];
const prisesParDivision = {};

for (const [division, clubs] of Object.entries(jeu)) {
  const dispo = effectifsParDivision[division] ?? new Map();
  const prises = new Set();

  for (const c of clubs) {
    // Un club peut se retrouver sous son nom complet OU son nom court.
    const cles = [cle(c.nom), cle(c.ville)].filter(Boolean);
    let trouve = null;
    for (const k of cles) {
      if (dispo.has(k)) { trouve = k; break; }
    }
    // Repli : correspondance par inclusion (« saintjeandeluzolympique » ⊃ « saintjeandeluz »).
    if (!trouve) {
      for (const k of dispo.keys()) {
        if (prises.has(k)) continue;
        if (cles.some((x) => x.length >= 5 && (x.includes(k) || k.includes(x)))) { trouve = k; break; }
      }
    }
    if (trouve) {
      prises.add(trouve);
      EFFECTIFS[c.nom] = encoder(dispo.get(trouve).joueurs);
    } else {
      // Le club a pu changer de division depuis la collecte (Niort et Tarbes
      // sont en Nationale dans le jeu, en Fédérale 3 dans les données).
      const ailleurs = chercherAilleurs(cles, division);
      if (ailleurs) EFFECTIFS[c.nom] = encoder(ailleurs.joueurs);
      else sansEffectif.push(`${division} · ${c.nom}`);
    }

    // Logo : le fichier fourni pour les régionales, sinon rapprochement par clé.
    const parFichier = c.logoFichier ? slugLogo(c.logoFichier) : null;
    const logo = parFichier ?? logoPourCles(cles, division);
    if (logo) LOGOS[c.nom] = `/logos/${logo}`;
    else sansLogo.push(`${division} · ${c.nom}`);
  }

  prisesParDivision[division] = prises;
}

// Équipes des données qu'aucun club du jeu n'a réclamées (bilan final : un club
// peut avoir été rattaché depuis une autre division).
for (const [division, m] of Object.entries(effectifsParDivision)) {
  for (const [k, v] of m) {
    if (prisesParDivision[division]?.has(k) || consommeesAilleurs.has(`${division}#${k}`)) continue;
    equipesNonUtilisees.push(`${division} · ${v.equipe} (${v.joueurs.length} joueurs)`);
  }
}

// Encodage compact : « nom|posteIdx » séparés par des ~. L'âge, la note et le
// potentiel sont tirés côté jeu (seed = nom), les données ne les donnent pas.
function encoder(joueurs) {
  return joueurs
    .filter((j) => j.nom)
    .map((j) => `${j.nom}|${j.poste ? POSTES.indexOf(j.poste) : ''}`)
    .join('~');
}

// --------------------------------------------------------------------------
// 5. MERCATO ESTIVAL (Top 14 → Fédérale 1)
// --------------------------------------------------------------------------
const brutTransferts = lire(`${DOSSIER_T}/transferts_amateurs_complet.json`);

// Nom d'équipe des données → nom de club du jeu (toutes divisions confondues,
// y compris les 3 divisions pro qui viennent de mondeReel.ts).
const clubsPro = clubsProDuJeu();
const clesJeu = new Map();
for (const [division, clubs] of Object.entries({ ...clubsPro, ...jeu })) {
  for (const c of clubs) {
    for (const k of [cle(c.nom), cle(c.ville)].filter(Boolean)) {
      if (!clesJeu.has(k)) clesJeu.set(k, { nom: c.nom, division });
    }
  }
}

function clubDuJeu(nomDonnees) {
  const k = cle(nomDonnees);
  if (clesJeu.has(k)) return clesJeu.get(k);
  for (const [kk, v] of clesJeu) {
    if (k.length >= 5 && (kk.includes(k) || k.includes(kk))) return v;
  }
  return null;
}

function clubsProDuJeu() {
  const src = fs.readFileSync(path.join(RACINE, 'src/data/mondeReel.ts'), 'utf8');
  const par = {};
  for (const id of ['top14', 'prod2', 'nationale']) {
    const debut = src.indexOf(`id: '${id}'`);
    const fin = src.indexOf('  {\n    id:', debut + 10);
    const bloc = src.slice(debut, fin === -1 ? undefined : fin);
    par[id] = [...bloc.matchAll(/\{ nom: '([^']+)', ville: '([^']*)'/g)].map((m) => ({
      nom: m[1], ville: m[2],
    }));
  }
  return par;
}

const MERCATO = {}; // club (jeu) → { arrivees: [], departs: [], prolongations: [] }
const clubsMercatoInconnus = new Set();
const MOUVEMENTS = { 'Arrivées': 'arrivees', 'Départs': 'departs', 'Prolongations': 'prolongations' };

for (const t of brutTransferts) {
  const cible = clubDuJeu(t['Équipe']);
  if (!cible) { clubsMercatoInconnus.add(t['Équipe']); continue; }
  const type = MOUVEMENTS[t.Mouvement];
  if (!type) continue;
  const age = parseInt(String(t['Âge']), 10);
  const dest = String(t['Club (Prov/Dest)'] ?? '').trim();
  // La colonne mélange club, année de contrat, statut JIFF… on ne garde que ce
  // qui ressemble à un club connu.
  const autre = /^(JIFF|NON JIFF|ESPOIR|N\/A|\d{4}|Retraite)$/i.test(dest) ? null : clubDuJeu(dest);
  (MERCATO[cible.nom] ??= { arrivees: [], departs: [], prolongations: [] })[type].push({
    nom: nettoyerNom(t.Joueur),
    poste: posteId(String(t.Poste).replace('2ème ligne', 'deuxieme ligne').replace('3ème ligne', 'troisieme ligne')),
    nation: String(t['Nationalité'] || 'France').trim(),
    age: Number.isFinite(age) ? age : null,
    autre: autre ? autre.nom : (dest && dest !== 'N/A' && !/^(JIFF|NON JIFF|ESPOIR|\d{4})$/i.test(dest) ? dest : null),
  });
}

// --------------------------------------------------------------------------
// 6. ÉCRITURE
// --------------------------------------------------------------------------
const entete = (titre) => `// ⚠️ FICHIER GÉNÉRÉ par scripts/genAmateurs.cjs — ne pas éditer à la main.
// ${titre}
`;

// --- amateurs.ts ---
let out = entete('Clubs régionaux, logos et effectifs du rugby amateur français.');
out += `
export const POSTES_AMATEURS = ${JSON.stringify(POSTES)} as const;

// Clubs des divisions régionales (nom + fichier logo), par division.
export const CLUBS_REGIONAUX: Record<string, { nom: string; logo?: string }[]> = {
`;
for (const id of ['reg1', 'reg2', 'reg3']) {
  out += `  ${id}: [\n`;
  for (const c of REGIONALES[id]) {
    const logo = LOGOS[c.nom] ? `, logo: '${LOGOS[c.nom]}'` : '';
    out += `    { nom: ${JSON.stringify(c.nom)}${logo} },\n`;
  }
  out += '  ],\n';
}
out += '};\n\n';

out += '// Logo officiel des clubs amateurs (Nationale 2 → Régionale 3).\n';
out += 'export const LOGO_AMATEUR: Record<string, string> = {\n';
for (const [nom, logo] of Object.entries(LOGOS)) {
  out += `  ${JSON.stringify(nom)}: '${logo}',\n`;
}
out += '};\n\n';

out += `// Effectifs réels amateurs. Encodage compact « nom|indice de poste »,
// joueurs séparés par « ~ ». Les données ne donnent ni âge ni note : ils sont
// tirés côté jeu (seed = nom du joueur), voir src/lib/effectif.ts.
export const EFFECTIFS_AMATEURS: Record<string, string> = {
`;
for (const [nom, enc] of Object.entries(EFFECTIFS)) {
  out += `  ${JSON.stringify(nom)}: ${JSON.stringify(enc)},\n`;
}
out += '};\n';
fs.writeFileSync(path.join(RACINE, 'src/data/amateurs.ts'), out);

// --- mercato.ts ---
// Encodage compact d'un mouvement : « nom|posteIdx|nation|âge|autre club ».
const encoderMouv = (l) =>
  l.map((m) => [m.nom, m.poste ? POSTES.indexOf(m.poste) : '', m.nation === 'France' ? '' : m.nation,
    m.age ?? '', m.autre ?? ''].join('|')).join('~');

let mer = entete('Mercato estival réel (Top 14 → Nationale 2) : arrivées, départs, prolongations.');
mer += `
// Encodage compact « nom|indice de poste|nation|âge|club lié », séparés par ~.
// Nation vide = France. Décodé par src/lib/mercato.ts.
export const MERCATO_REEL: Record<string, [string, string, string]> = {
`;
for (const [nom, m] of Object.entries(MERCATO)) {
  mer += `  ${JSON.stringify(nom)}: [${JSON.stringify(encoderMouv(m.arrivees))},${JSON.stringify(encoderMouv(m.departs))},${JSON.stringify(encoderMouv(m.prolongations))}],\n`;
}
mer += '};\n';
fs.writeFileSync(path.join(RACINE, 'src/data/mercato.ts'), mer);

// --------------------------------------------------------------------------
// 7. RAPPORT
// --------------------------------------------------------------------------
const nbJoueurs = Object.values(EFFECTIFS).reduce((a, e) => a + e.split('~').length, 0);
const nbMouv = Object.values(MERCATO).reduce(
  (a, m) => a + m.arrivees.length + m.departs.length + m.prolongations.length, 0);

console.log('--- MONDE AMATEUR ---');
console.log(`Clubs régionaux  : ${REGIONALES.reg1.length} R1 · ${REGIONALES.reg2.length} R2 · ${REGIONALES.reg3.length} R3`);
console.log(`Logos trouvés    : ${nbLogos} fichiers, ${Object.keys(LOGOS).length} clubs équipés`);
console.log(`Effectifs        : ${Object.keys(EFFECTIFS).length} clubs, ${nbJoueurs} joueurs (${joueusesEcartees} joueuses écartées)`);
console.log(`Mercato          : ${Object.keys(MERCATO).length} clubs, ${nbMouv} mouvements`);
if (sansEffectif.length) console.log(`\n⚠ ${sansEffectif.length} clubs sans effectif :\n  ${sansEffectif.slice(0, 40).join('\n  ')}`);
if (sansLogo.length) console.log(`\n⚠ ${sansLogo.length} clubs sans logo :\n  ${sansLogo.slice(0, 40).join('\n  ')}`);
if (equipesNonUtilisees.length) console.log(`\n⚠ ${equipesNonUtilisees.length} équipes des données non rattachées :\n  ${equipesNonUtilisees.slice(0, 40).join('\n  ')}`);
if (clubsMercatoInconnus.size) console.log(`\n⚠ ${clubsMercatoInconnus.size} clubs du mercato inconnus : ${[...clubsMercatoInconnus].join(', ')}`);
