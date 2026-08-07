// LE GÉNÉRATEUR DES NOUVELLES LIGUES
//
// Entrée  : `sources/competitions/ligues/` — flashscore_rugby_data.json (88 compétitions avec
//           leurs classements) et un dossier de logos par compétition.
// Sortie  : `src/data/nouvellesLigues.ts` + les logos dans `public/`.
//
// Ce qu'il fait, dans l'ordre :
//   1. copie l'écusson de chaque équipe vers `public/logos/` et le logo de la
//      compétition vers `public/logos-competitions/<id>.png` ;
//   2. calcule la NOTE DE CHAQUE CLUB à partir du classement réel (points et
//      différence de points par match, étalés sur l'échelle de la ligue) ;
//   3. GÉNÈRE UN EFFECTIF de 30 joueurs par club — noms du pays, plus une part
//      d'étrangers pour la mixité (demande explicite) ;
//   4. calcule la FORCE de chaque sélection des nouvelles compétitions
//      internationales, à partir de leur classement.
//
// Tout est DÉTERMINISTE (graine = nom du club + numéro de slot) : relancer le
// script deux fois donne exactement le même fichier.
//
// Relancer : node scripts/genNouvellesLigues.cjs

const fs = require('fs');
const path = require('path');
const { CLUBS, NATIONS } = require('./nouvellesLigues.cjs');
const { NOMS, ETRANGERS } = require('./nomsPays.cjs');

const RACINE = path.join(__dirname, '..');
const SRC = path.join(RACINE, 'sources', 'competitions', 'ligues');
const DEST_LOGOS = path.join(RACINE, 'public', 'logos');
const DEST_COMPET = path.join(RACINE, 'public', 'logos-competitions');
const SORTIE = path.join(RACINE, 'src', 'data', 'nouvellesLigues.ts');

const avertissements = [];

// --- outils -----------------------------------------------------------------
function graine(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slug(nom) {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

// Couleurs de club, dérivées du nom : les données ne fournissent aucun maillot.
// Le même club a toujours les mêmes couleurs (>>> non signé, comme data/clubs.ts).
function couleurs(nom) {
  let h = 0;
  for (let i = 0; i < nom.length; i++) h = (Math.imul(h, 31) + nom.charCodeAt(i)) >>> 0;
  const t1 = h % 360;
  const t2 = (t1 + 150 + (h >>> 8) % 60) % 360;
  return [`hsl(${t1} 58% 38%)`, `hsl(${t2} 45% 62%)`];
}

// --- 1. lecture des données --------------------------------------------------
const brut = JSON.parse(fs.readFileSync(path.join(SRC, 'flashscore_rugby_data.json'), 'utf8'));
const normaliser = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]/gi, '').toLowerCase();
const parCle = new Map(brut.map((c) => [normaliser(c.pays) + '|' + normaliser(c.nom_ligue), c]));

function competitionSource(src) {
  if (!src) return null;
  const c = parCle.get(normaliser(src[0]) + '|' + normaliser(src[1]));
  if (!c) avertissements.push(`compétition introuvable dans le JSON : ${src.join(' | ')}`);
  return c ?? null;
}

// --- 2. les logos ------------------------------------------------------------
fs.mkdirSync(DEST_LOGOS, { recursive: true });
fs.mkdirSync(DEST_COMPET, { recursive: true });

let logosCopies = 0;
// Un club peut apparaître dans plusieurs compétitions (Premiership galloise +
// Challenge Cup) : on ne copie qu'une fois, et on garde le chemin public.
const logoParEquipe = new Map();
// id de compétition → logo de la ligue (le fichier « LOGO_LIGUE_… » du dossier).
const logosCompetition = {};

function copierLogos(ligne) {
  // `base` permet de ranger une compétition ailleurs que dans le lot principal.
  const racine = ligne.base ? path.join(RACINE, ligne.base) : SRC;
  const dossier = path.join(racine, ligne.dossier);
  if (!fs.existsSync(dossier)) {
    avertissements.push(`dossier de logos absent : ${ligne.dossier}`);
    return [];
  }
  const noms = [];
  for (const fichier of fs.readdirSync(dossier)) {
    if (!/\.(png|webp|jpg|jpeg|svg)$/i.test(fichier)) continue;
    const ext = path.extname(fichier).toLowerCase();
    const base = path.basename(fichier, ext);
    if (base.startsWith('LOGO_LIGUE')) {
      // Le logo de la COMPÉTITION, nommé par son id — plus rien à deviner
      // à l'exécution (même convention que copierLogosCompetitions.cjs).
      fs.copyFileSync(path.join(dossier, fichier), path.join(DEST_COMPET, ligne.id + ext));
      logosCompetition[ligne.id] = '/logos-competitions/' + ligne.id + ext;
      continue;
    }
    // ⚠️ Le préfixe n'est pas cosmétique : « Bulls.png » de la Currie Cup et
    // « bulls.png » des Vodacom Bulls partagent le même slug. Sans préfixe, le
    // second écrase le premier — et cinq clubs de l'URC perdent leur écusson.
    const cible = (ligne.prefixeLogo ? ligne.prefixeLogo + '_' : '') + slug(base) + ext;
    // La clé reste le nom de fichier BRUT, préfixé par la ligue quand il y a
    // ambiguïté : deux compétitions peuvent avoir un fichier « Bulls.png ».
    const cle = ligne.prefixeLogo ? `${ligne.prefixeLogo}#${base}` : base;
    if (!logoParEquipe.has(cle)) {
      fs.copyFileSync(path.join(dossier, fichier), path.join(DEST_LOGOS, cible));
      logosCopies += 1;
    }
    logoParEquipe.set(cle, '/logos/' + cible);
    noms.push(cle);
  }
  return noms;
}

// Rapproche un nom du classement d'un nom de fichier de logo.
function trouverLogo(nomEquipe, candidats) {
  if (logoParEquipe.has(nomEquipe)) return logoParEquipe.get(nomEquipe);
  const cle = normaliser(nomEquipe);
  const exact = candidats.find((c) => normaliser(c) === cle);
  if (exact) return logoParEquipe.get(exact);
  // Repli par inclusion : « Coventry R.F.C » ↔ « Coventry RFC ».
  const proche = candidats.find((c) => normaliser(c).includes(cle) || cle.includes(normaliser(c)));
  return proche ? logoParEquipe.get(proche) : undefined;
}

// --- 3. la note d'un club, à partir du classement ---------------------------
// Moitié RANG, moitié VALEUR (points et différence par match), comme pour les
// championnats déjà en place (voir scripts/genMonde.cjs) : un club qui gagne
// petit ne vaut pas un club qui écrase, à nombre de points égal.
function noterClubs(equipes, echelle) {
  const lignes = equipes.map((e) => {
    const s = e.statistiques ?? {};
    const joues = Math.max(1, Number(s.matchs_joues) || 1);
    const points = Number(s.points) || 0;
    const [pour, contre] = String(s.score_marque_encaisse ?? '0:0').split(':').map(Number);
    return {
      nom: e.nom,
      valeur: points / joues + 0.05 * (((pour || 0) - (contre || 0)) / joues),
    };
  });
  // Un même club peut apparaître deux fois (phases de poules puis finale) :
  // on garde sa meilleure ligne.
  const parNom = new Map();
  for (const l of lignes) {
    const vu = parNom.get(l.nom);
    if (!vu || l.valeur > vu.valeur) parNom.set(l.nom, l);
  }
  const uniques = [...parNom.values()].sort((a, b) => b.valeur - a.valeur);

  const [bas, haut] = echelle;
  const vMax = uniques[0]?.valeur ?? 1;
  const vMin = uniques[uniques.length - 1]?.valeur ?? 0;
  const etendue = Math.max(0.001, vMax - vMin);
  return uniques.map((l, i) => {
    const parRang = uniques.length > 1 ? 1 - i / (uniques.length - 1) : 1;
    const parValeur = (l.valeur - vMin) / etendue;
    const mixte = parRang * 0.5 + parValeur * 0.5;
    return { nom: l.nom, note: Math.round(bas + (haut - bas) * mixte) };
  });
}

// --- 4. les effectifs générés ------------------------------------------------
// Les 9 familles de poste de `src/types.ts`, dans l'ordre où un effectif se
// construit : trois premières lignes, quatre deuxièmes lignes, etc.
const FAMILLES = [
  'pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne',
  'demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere',
];
// Combien de joueurs par famille dans un groupe de 30.
const PAR_FAMILLE = {
  pilier: 5, talonneur: 3, deuxieme_ligne: 4, troisieme_ligne: 5,
  demi_melee: 3, demi_ouverture: 3, centre: 3, ailier: 3, arriere: 1,
};

function tirerNation(rng, nationLocale, partEtrangers) {
  if (rng() >= partEtrangers) return nationLocale;
  const total = ETRANGERS.reduce((a, [, p]) => a + p, 0);
  let seuil = rng() * total;
  for (const [nom, poids] of ETRANGERS) {
    seuil -= poids;
    // Un « étranger » de la même nationalité que le championnat n'en est pas un.
    if (seuil <= 0) return nom === nationLocale ? nationLocale : nom;
  }
  return nationLocale;
}

function genererEffectif(club, noteClub, ligne) {
  const rng = graine(`nouvelle#${club}`);
  const joueurs = [];
  let slot = 0;
  for (const famille of FAMILLES) {
    for (let n = 0; n < PAR_FAMILLE[famille]; n++) {
      slot += 1;
      const nation = tirerNation(rng, ligne.nation, ligne.etrangers);
      // Le joueur du cru pioche dans le pool LOCAL de la ligue s'il en a un
      // (`poolLocal`) ; l'étranger garde le pool d'export de son pays.
      const clePool = nation === ligne.nation ? (ligne.poolLocal ?? ligne.nation) : nation;
      const pool = NOMS[clePool] ?? NOMS[ligne.nation] ?? NOMS.France;
      const prenom = pool.prenoms[Math.floor(rng() * pool.prenoms.length)];
      const nom = pool.noms[Math.floor(rng() * pool.noms.length)];

      // L'âge : une pyramide réaliste, du jeune du centre au cadre de 34 ans.
      const age = 19 + Math.floor(Math.pow(rng(), 1.35) * 16);
      // La note : les cadres au niveau du club, la fin de banc en dessous.
      // `n` est le rang dans la famille — le premier de chaque poste est titulaire.
      const rangDansPoste = n / Math.max(1, PAR_FAMILLE[famille] - 1);
      const ecart = -rangDansPoste * 7 + (rng() * 6 - 3);
      // Un étranger recruté vient renforcer : il est un cran au-dessus.
      const bonusEtranger = nation !== ligne.nation ? 2 : 0;
      // Un joueur trop jeune n'a pas encore son niveau d'adulte.
      const jeunesse = age < 22 ? -(22 - age) * 1.6 : 0;
      const note = clamp(Math.round(noteClub + ecart + bonusEtranger + jeunesse), 25, 92);

      // Le potentiel : la note visée au pic. Marge d'autant plus grande que le
      // joueur est jeune ET qu'il joue déjà (même règle que genMonde.cjs).
      const marge = age < 27
        ? Math.round((27 - age) * (0.35 + rng() * 1.5) * (1 - rangDansPoste * 0.4))
        : 0;
      const potentiel = clamp(note + Math.min(marge, 16), note, ligne.echelle[1] + 8);

      joueurs.push({ nom: `${prenom} ${nom}`, famille, age, note, potentiel, nation, slot });
    }
  }
  return joueurs.sort((a, b) => b.note - a.note);
}

// --- 5. génération -----------------------------------------------------------
const competitions = [];
const effectifs = {};
const noteClubs = {};
const logosClub = {};

for (const ligne of CLUBS) {
  const noms = copierLogos(ligne);
  const source = competitionSource(ligne.src);

  let classement;
  if (source) {
    classement = noterClubs(source.equipes, ligne.echelle);
  } else if (ligne.equipes) {
    // Hiérarchie DÉCLARÉE (Bundesliga, Currie Cup) : l'ordre de `equipes` fait
    // foi, et les notes s'étalent linéairement sur l'échelle de la ligue.
    const [bas, haut] = ligne.echelle;
    const prefixe = ligne.prefixeLogo ? ligne.prefixeLogo + '#' : '';
    classement = ligne.equipes.map(([fichier, nomJeu], i) => ({
      nom: nomJeu,
      cleLogo: prefixe + fichier,
      note: Math.round(haut - ((haut - bas) * i) / Math.max(1, ligne.equipes.length - 1)),
    }));
    // Un fichier de logo laissé de côté est une erreur de saisie, pas un choix.
    const declares = new Set(classement.map((c) => c.cleLogo));
    for (const n of noms) {
      if (!declares.has(n)) avertissements.push(`club non déclaré dans « equipes » : ${n} (${ligne.nom})`);
    }
  } else {
    // Pas de classement fourni (Portugal) : on étale les clubs du dossier de
    // logos sur l'échelle, dans un ordre déterministe.
    const rng = graine('sansclassement#' + ligne.id);
    const melanges = [...noms].sort((a, b) => graine(ligne.id + a)() - graine(ligne.id + b)());
    const [bas, haut] = ligne.echelle;
    classement = melanges.map((nom, i) => ({
      nom,
      note: Math.round(haut - ((haut - bas) * i) / Math.max(1, melanges.length - 1) + (rng() * 2 - 1)),
    }));
  }

  const clubs = [];
  for (const c of classement) {
    const logo = c.cleLogo ? logoParEquipe.get(c.cleLogo) : trouverLogo(c.nom, noms);
    if (!logo) avertissements.push(`logo manquant : ${c.nom} (${ligne.nom})`);
    const [c1, c2] = couleurs(c.nom);
    clubs.push({ nom: c.nom, note: c.note, logo, c1, c2 });
    noteClubs[c.nom] = c.note;
    if (logo) logosClub[c.nom] = logo;
    effectifs[c.nom] = genererEffectif(c.nom, c.note, ligne);
  }

  competitions.push({
    id: ligne.id, nom: ligne.nom, pays: ligne.pays, emoji: ligne.emoji,
    niveau: ligne.niveau, coupe: !!ligne.coupe, clubs,
  });
}

// --- 6. les sélections -------------------------------------------------------
const nations = [];
for (const ligne of NATIONS) {
  const noms = copierLogos(ligne);
  const source = competitionSource(ligne.src);
  if (!source) continue;

  const parNom = new Map();
  for (const e of source.equipes) {
    const s = e.statistiques ?? {};
    const joues = Math.max(1, Number(s.matchs_joues) || 1);
    const [pour, contre] = String(s.score_marque_encaisse ?? '0:0').split(':').map(Number);
    const valeur = (Number(s.points) || 0) / joues + 0.05 * (((pour || 0) - (contre || 0)) / joues);
    const vu = parNom.get(e.nom);
    if (!vu || valeur > vu) parNom.set(e.nom, valeur);
  }
  const ordre = [...parNom.entries()].sort((a, b) => b[1] - a[1]);
  const [bas, haut] = ligne.force;
  const equipes = ordre.map(([nom], i) => ({
    nom,
    logo: trouverLogo(nom, noms),
    force: Math.round(haut - ((haut - bas) * i) / Math.max(1, ordre.length - 1)),
  }));
  nations.push({ id: ligne.id, nom: ligne.nom, emoji: ligne.emoji, fenetre: ligne.fenetre, equipes });
}

// --- 7. écriture -------------------------------------------------------------
// Encodage COMPACT pour les effectifs, comme `effectifsReels.ts` : en objets
// littéraux, 6 000 joueurs feraient plusieurs centaines de kilo-octets de
// bundle. Ici : « nom|indice de famille|âge|note|potentiel|indice de nation ».
const nationsIndex = [...new Set(Object.values(effectifs).flat().map((j) => j.nation))].sort();
const iNation = new Map(nationsIndex.map((n, i) => [n, i]));

let ts = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : sources/competitions/ligues/ (flashscore_rugby_data.json + logos).
// Régénérer avec : node scripts/genNouvellesLigues.cjs
// La table des ligues, leurs niveaux et leurs échelles : scripts/nouvellesLigues.cjs
//
// ⚠️ LES EFFECTIFS SONT GÉNÉRÉS, PAS RÉELS. Les données ne fournissent que des
// classements : noms, âges et notes sont tirés de façon déterministe (graine =
// nom du club), avec des NOMS DU PAYS et une part d'étrangers pour la mixité.
// Les CLUBS, leurs écussons et leur hiérarchie, eux, sont réels.

import type { FamillePoste } from '../types';

export interface ClubNouveau {
  nom: string;
  note: number;
  logo?: string;
  c1: string;
  c2: string;
}

export interface CompetitionNouvelle {
  id: string;
  nom: string;
  pays: string;
  emoji: string;
  niveau: number;
  /** true = épreuve à élimination, pas un championnat au long cours. */
  coupe: boolean;
  clubs: ClubNouveau[];
}

export interface SelectionNouvelle {
  nom: string;
  logo?: string;
  force: number;
}

export interface CompetitionNationsNouvelle {
  id: string;
  nom: string;
  emoji: string;
  fenetre: 'automne' | 'tournoi';
  equipes: SelectionNouvelle[];
}

`;

ts += `export const COMPETITIONS_NOUVELLES: CompetitionNouvelle[] = [\n`;
for (const c of competitions) {
  ts += `  {\n    id: ${esc(c.id)}, nom: ${esc(c.nom)}, pays: ${esc(c.pays)}, emoji: ${esc(c.emoji)},\n`;
  ts += `    niveau: ${c.niveau}, coupe: ${c.coupe},\n    clubs: [\n`;
  for (const cl of c.clubs) {
    ts += `      { nom: ${esc(cl.nom)}, note: ${cl.note}`;
    if (cl.logo) ts += `, logo: ${esc(cl.logo)}`;
    ts += `, c1: ${esc(cl.c1)}, c2: ${esc(cl.c2)} },\n`;
  }
  ts += `    ],\n  },\n`;
}
ts += `];\n\n`;

ts += `export const COMPETITIONS_NATIONS_NOUVELLES: CompetitionNationsNouvelle[] = [\n`;
for (const n of nations) {
  ts += `  {\n    id: ${esc(n.id)}, nom: ${esc(n.nom)}, emoji: ${esc(n.emoji)}, fenetre: ${esc(n.fenetre)},\n`;
  ts += `    equipes: [\n`;
  for (const e of n.equipes) {
    ts += `      { nom: ${esc(e.nom)}, force: ${e.force}`;
    if (e.logo) ts += `, logo: ${esc(e.logo)}`;
    ts += ` },\n`;
  }
  ts += `    ],\n  },\n`;
}
ts += `];\n\n`;

ts += `// Écusson d'un club des nouvelles ligues, par son nom.\n`;
ts += `export const LOGO_NOUVEAU: Record<string, string> = {\n`;
for (const nom of Object.keys(logosClub).sort()) ts += `  ${esc(nom)}: ${esc(logosClub[nom])},\n`;
ts += `};\n\n`;

ts += `// Note générale de chaque club des nouvelles ligues.\n`;
ts += `export const NOTE_CLUB_NOUVEAU: Record<string, number> = {\n`;
for (const nom of Object.keys(noteClubs).sort()) ts += `  ${esc(nom)}: ${noteClubs[nom]},\n`;
ts += `};\n\n`;

ts += `// Logo officiel de chaque nouvelle compétition (fusionné avec la table\n`;
ts += `// historique par <LogoCompet>).\n`;
ts += `export const LOGO_COMPETITION_NOUVEAU: Record<string, string> = {\n`;
for (const id of Object.keys(logosCompetition).sort()) ts += `  ${esc(id)}: ${esc(logosCompetition[id])},\n`;
ts += `};\n\n`;

ts += `// Index d'encodage : familles de poste et nations.\n`;
ts += `const FAMILLES: FamillePoste[] = [${FAMILLES.map(esc).join(', ')}];\n`;
ts += `const NATIONS: string[] = [\n`;
for (const n of nationsIndex) ts += `  ${esc(n)},\n`;
ts += `];\n\n`;

ts += `// « nom|famille|âge|note|potentiel|nation », un joueur par chaîne.\n`;
ts += `const BRUT: Record<string, string[]> = {\n`;
for (const club of Object.keys(effectifs).sort()) {
  ts += `  ${esc(club)}: [\n`;
  for (const j of effectifs[club]) {
    ts += `    ${esc(`${j.nom}|${FAMILLES.indexOf(j.famille)}|${j.age}|${j.note}|${j.potentiel}|${iNation.get(j.nation)}`)},\n`;
  }
  ts += `  ],\n`;
}
ts += `};\n\n`;

ts += `export interface JoueurNouveau {
  nom: string;
  poste: FamillePoste;
  age: number;
  note: number;
  potentiel: number;
  nation: string;
}

function decoder(ligne: string): JoueurNouveau {
  const [nom, famille, age, note, potentiel, nation] = ligne.split('|');
  return {
    nom,
    poste: FAMILLES[+famille],
    age: +age,
    note: +note,
    potentiel: +potentiel,
    nation: NATIONS[+nation],
  };
}

// Décodé une seule fois, à la première demande.
const cache = new Map<string, JoueurNouveau[]>();

export function effectifNouveau(club: string): JoueurNouveau[] | undefined {
  const enCache = cache.get(club);
  if (enCache) return enCache;
  const brut = BRUT[club];
  if (!brut) return undefined;
  const liste = brut.map(decoder);
  cache.set(club, liste);
  return liste;
}

export const CLUBS_NOUVEAUX: string[] = Object.keys(BRUT);
`;

fs.writeFileSync(SORTIE, ts, 'utf8');

// --- 8. rapport --------------------------------------------------------------
const nbClubs = competitions.reduce((a, c) => a + c.clubs.length, 0);
const nbJoueurs = Object.values(effectifs).reduce((a, e) => a + e.length, 0);
const nbSelections = nations.reduce((a, n) => a + n.equipes.length, 0);
const parNation = {};
for (const j of Object.values(effectifs).flat()) parNation[j.nation] = (parNation[j.nation] ?? 0) + 1;

console.log(`\n✅ ${path.relative(RACINE, SORTIE)} — ${(ts.length / 1024).toFixed(0)} Ko`);
console.log(`   ${competitions.length} championnats et coupes · ${nbClubs} clubs · ${nbJoueurs} joueurs générés`);
console.log(`   ${nations.length} compétitions de sélections · ${nbSelections} équipes nationales`);
console.log(`   ${logosCopies} écussons copiés vers public/logos/`);
console.log(`\n   Mixité des effectifs (top 12 nationalités) :`);
for (const [n, c] of Object.entries(parNation).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`     ${n.padEnd(22)} ${String(c).padStart(4)} (${((c / nbJoueurs) * 100).toFixed(1)} %)`);
}
if (avertissements.length) {
  console.log(`\n⚠ ${avertissements.length} avertissement(s) :`);
  for (const a of avertissements.slice(0, 30)) console.log('   ·', a);
  if (avertissements.length > 30) console.log(`   … et ${avertissements.length - 30} de plus`);
} else {
  console.log('\n   Aucun avertissement ✅');
}
