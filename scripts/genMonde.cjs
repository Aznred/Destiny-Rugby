// Générateur du « monde réel » de Destiny Rugby.
//
// Entrées (fournies par l'utilisateur, à la racine du projet) :
//   • base_rugby_finale.json   — 9 388 lignes joueur/compétition : club, poste,
//     âge, nationalité, matchs, minutes, essais, points… (saison 25-26)
//   • tous_les_classements.json — classements de la saison passée pour les
//     25 compétitions (clubs ET sélections nationales)
//   • logos_equipes/**          — logos officiels, copiés dans public/logos/
//     par scripts/copierLogos.cjs
//
// Sorties :
//   • src/data/mondeReel.ts     — championnats, clubs (nom, ville, logo,
//     couleurs), classements, coupes et compétitions internationales
//   • src/data/effectifsReels.ts — effectifs complets (note + potentiel) et
//     note générale de chaque club
//
// Relancer avec : node scripts/genMonde.cjs
const fs = require('fs');
const path = require('path');
const { LIGUES, COUPES, INTERNATIONALES } = require('./ligues.cjs');
const { VEDETTES } = require('./vedettes.cjs');

// La base écrit les noms avec leurs vrais accents (« Péato MAUVAKA »), la table
// des vedettes non : on compare sans accents ni casse.
const sansAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const VEDETTE_PAR_NOM = new Map(Object.entries(VEDETTES).map(([nom, note]) => [sansAccents(nom), note]));
const vedettesTrouvees = new Set();
function noteVedette(nom) {
  const cle = sansAccents(nom);
  if (!VEDETTE_PAR_NOM.has(cle)) return undefined;
  vedettesTrouvees.add(cle);
  return VEDETTE_PAR_NOM.get(cle);
}

const RACINE = path.join(__dirname, '..');
const JOUEURS = require(path.join(RACINE, 'base_rugby_finale.json'));
const CLASSEMENTS_SRC = require(path.join(RACINE, 'tous_les_classements.json'));
const DOSSIER_LOGOS = path.join(RACINE, 'public', 'logos');

const avertissements = [];
const avertir = (m) => avertissements.push(m);

// ---------------------------------------------------------------------------
// 1. Outils
// ---------------------------------------------------------------------------

// Nom court d'une équipe -> nom du fichier logo (public/logos/<slug>.png).
function slugLogo(nom) {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '_');
}

function logoDe(nomCourt) {
  const fichier = `${slugLogo(nomCourt)}.png`;
  if (!fs.existsSync(path.join(DOSSIER_LOGOS, fichier))) {
    avertir(`logo manquant : ${fichier} (« ${nomCourt} »)`);
    return null;
  }
  return `/logos/${fichier}`;
}

// PRNG mulberry32 seedé par chaîne (même formule que src/lib/effectif.ts).
function graine(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Couleurs des blasons générés (identique à src/data/clubs.ts) — servent de
// repli quand un club n'a pas de logo.
const PALETTE = [
  '#c1121f', '#0a2a6b', '#0a7a3b', '#f2c200', '#5a2d82',
  '#7a1020', '#0a5a5a', '#d96a00', '#000000', '#1a6bb5',
];
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}
const COULEURS_CONNUES = {
  'Stade Toulousain': ['#c1121f', '#000000'],
  'Stade Rochelais': ['#f2c200', '#000000'],
  'Union Bordeaux Bègles': ['#1a2a6c', '#ffffff'],
  'Stade Français Paris': ['#e6007e', '#001b7a'],
  'Racing 92': ['#0a2b6b', '#87e0ff'],
  'RC Toulon': ['#c1121f', '#000000'],
  'Castres Olympique': ['#0a2a6b', '#c1121f'],
  'ASM Clermont Auvergne': ['#0a2a6b', '#f2c200'],
  'Section Paloise': ['#0a7a3b', '#c1121f'],
  'USA Perpignan': ['#c1121f', '#f2c200'],
  'Lyon OU': ['#c1121f', '#0a2a6b'],
  'Montpellier HR': ['#0a2a6b', '#f2c200'],
  'Aviron Bayonnais': ['#0a2a6b', '#87e0ff'],
  'RC Vannes': ['#7a1020', '#ffffff'],
  'US Oyonnax': ['#c1121f', '#000000'],
  'Biarritz Olympique': ['#c1121f', '#0a2a6b'],
  'CA Brive': ['#ffffff', '#000000'],
  'FC Grenoble': ['#0a2a6b', '#c1121f'],
  'SU Agen': ['#0a2a6b', '#ffffff'],
  'US Montauban': ['#0a2a6b', '#f2c200'],
  Leinster: ['#0a2a6b', '#87e0ff'],
  Munster: ['#7a1020', '#ffffff'],
  Connacht: ['#0a7a3b', '#ffffff'],
  Ulster: ['#ffffff', '#c1121f'],
  'Glasgow Warriors': ['#1a1a2e', '#c1121f'],
  'Édimbourg Rugby': ['#0a2a6b', '#f2c200'],
  Saracens: ['#000000', '#c1121f'],
  'Leicester Tigers': ['#0a7a3b', '#c1121f'],
  'Northampton Saints': ['#000000', '#0a7a3b'],
  'Bath Rugby': ['#0a2a6b', '#ffffff'],
  Harlequins: ['#5a2d82', '#0a5a5a'],
  'Exeter Chiefs': ['#000000', '#f2c200'],
  'Sale Sharks': ['#0a2a6b', '#87e0ff'],
  'Bristol Bears': ['#c1121f', '#1a6bb5'],
  Crusaders: ['#c1121f', '#000000'],
  Blues: ['#0a2a6b', '#ffffff'],
  Chiefs: ['#f2c200', '#000000'],
  Hurricanes: ['#f2c200', '#000000'],
  Highlanders: ['#0a5a5a', '#f2c200'],
  'ACT Brumbies': ['#0a2a6b', '#f2c200'],
  'NSW Waratahs': ['#0a2a6b', '#ffffff'],
  'Queensland Reds': ['#7a1020', '#f2c200'],
  'Vodacom Bulls': ['#1a2a6c', '#ffffff'],
  'DHL Stormers': ['#0a2a6b', '#c1121f'],
  'Emirates Lions': ['#c1121f', '#ffffff'],
  'Hollywoodbets Sharks': ['#000000', '#f2c200'],
  'Benetton Trévise': ['#0a7a3b', '#ffffff'],
  'Zebre Parme': ['#ffffff', '#000000'],
};
function couleurs(nom) {
  const connues = COULEURS_CONNUES[nom];
  if (connues) return connues;
  const h = hash(nom);
  const i = h % PALETTE.length;
  let j = (h >>> 4) % PALETTE.length;
  if (j === i) j = (j + 3) % PALETTE.length;
  return [PALETTE[i], PALETTE[j]];
}

// ---------------------------------------------------------------------------
// 2. Index des clubs : nom court des données -> club du jeu
// ---------------------------------------------------------------------------
const CLUBS = new Map(); // nom court -> { nom, ville, logo, ligue }
for (const ligue of LIGUES) {
  for (const [src, nom, ville, noteFixe] of ligue.clubs) {
    if (CLUBS.has(src)) avertir(`club en double dans ligues.cjs : « ${src} »`);
    CLUBS.set(src, { src, nom, ville, logo: logoDe(src), ligue: ligue.id, noteFixe });
  }
}
const clubDuNomCourt = (src) => CLUBS.get(src);

// Vérifie que toutes les équipes de la base sont rattachées à un club du jeu.
// NB : un club peut être déclaré dans une AUTRE division que celle où la base
// l'a vu jouer (montée / descente) — c'est voulu, pas une erreur.
{
  for (const ligue of LIGUES) {
    if (ligue.srcLigue && !JOUEURS.some((l) => l.Ligue === ligue.srcLigue)) {
      avertir(`ligue absente de la base : ${ligue.srcLigue}`);
    }
  }
  for (const e of new Set(JOUEURS.map((l) => l['Équipe']))) {
    if (!CLUBS.has(e)) avertir(`équipe inconnue (joueurs ignorés) : « ${e} »`);
  }
}

// ---------------------------------------------------------------------------
// 3. Classements de la saison passée
// ---------------------------------------------------------------------------
// Ils ne sont PLUS affichés pour les clubs (l'écran Championnats montre les
// effectifs à la place) : ils servent uniquement à calculer la note des clubs.
// Seuls les classements des SÉLECTIONS sont écrits dans le fichier généré.
const lignesParLigue = {};
for (const l of CLASSEMENTS_SRC) (lignesParLigue[l.Ligue] = lignesParLigue[l.Ligue] || []).push(l);
for (const a of Object.values(lignesParLigue)) a.sort((x, y) => x.Position - y.Position);

// ---------------------------------------------------------------------------
// 4. Note générale d'un club, à partir du classement de la saison passée
// ---------------------------------------------------------------------------
// Deux lectures combinées à parts égales : le RANG (robuste) et la VALEUR
// (points par match + différence de points par match, qui sépare vraiment un
// champion d'un promu massacré). Les championnats dont le classement est vide
// ou embryonnaire (NPC) n'utilisent que le rang.
//
// ⚠️ La note est TOUJOURS calculée sur l'échelle du championnat où le club a
// JOUÉ la saison passée, pas sur celle où il joue aujourd'hui. C'est ce qui
// donne une hiérarchie juste après montées et descentes : le champion de
// Pro D2 (72) arrive en bas de Top 14, le relégué du Top 14 (67) arrive en
// haut de Pro D2, et les promus de Nationale (60-61) ferment la Pro D2.
const NOTE_PAR_EQUIPE_SRC = new Map();

for (const ligue of LIGUES) {
  if (!ligue.srcLigue) continue;
  const [bas, haut] = ligue.echelle;
  const milieu = (bas + haut) / 2;
  const lignes = lignesParLigue[ligue.srcLigue] ?? [];
  const exploitables = lignes.filter((l) => l['Joués'] >= 5);
  const utiliseValeur = exploitables.length >= lignes.length * 0.7 && exploitables.length > 4;

  const indices = new Map();
  if (utiliseValeur) {
    for (const l of lignes) {
      const j = Math.max(1, l['Joués']);
      indices.set(l['Équipe'], l.Points / j + 0.05 * (l['Différence'] / j));
    }
    const vals = [...indices.values()];
    const moy = vals.reduce((a, b) => a + b, 0) / vals.length;
    const ecart = Math.sqrt(vals.reduce((a, b) => a + (b - moy) ** 2, 0) / vals.length) || 1;
    for (const [eq, v] of indices) indices.set(eq, (v - moy) / ecart);
  }

  const n = Math.max(1, lignes.length - 1);
  for (const l of lignes) {
    const parRang = haut - ((l.Position - 1) / n) * (haut - bas);
    const parValeur = utiliseValeur
      ? clamp(milieu + indices.get(l['Équipe']) * ((haut - bas) / 3.4), bas, haut)
      : parRang;
    NOTE_PAR_EQUIPE_SRC.set(l['Équipe'], Math.round(0.5 * parRang + 0.5 * parValeur));
  }
}

const NOTE_CLUB = {};
const MOUVEMENTS = []; // montées / descentes, pour le récapitulatif
for (const ligue of LIGUES) {
  for (const [src, nom, , noteFixe] of ligue.clubs) {
    if (noteFixe) { NOTE_CLUB[nom] = noteFixe; continue; }
    const note = NOTE_PAR_EQUIPE_SRC.get(src);
    if (note === undefined) {
      avertir(`${ligue.nom} : « ${src} » absent de tous les classements, note = milieu de division`);
      NOTE_CLUB[nom] = Math.round((ligue.echelle[0] + ligue.echelle[1]) / 2);
      continue;
    }
    NOTE_CLUB[nom] = note;
    // Club qui a changé de division depuis le classement de référence.
    const srcLigue = (lignesParLigue[ligue.srcLigue] ?? []).some((l) => l['Équipe'] === src);
    if (!srcLigue) MOUVEMENTS.push(`${nom} (${note}) évolue désormais en ${ligue.nom}`);
  }
}

// ---------------------------------------------------------------------------
// 5. Joueurs
// ---------------------------------------------------------------------------
const POSTE_SRC = {
  Pilier: 'pilier', Talonneur: 'talonneur', '2ème ligne': 'deuxieme_ligne',
  '3ème ligne': 'troisieme_ligne', 'Mêlée': 'demi_melee', Ouverture: 'demi_ouverture',
  Centre: 'centre', Ailier: 'ailier', 'Arrière': 'arriere',
};

// Orthographes de la base -> orthographe du jeu (voir components/Drapeau.tsx).
const NATION_SRC = {
  'Afrique du sud': 'Afrique du Sud',
  'Pays-de-Galles': 'Pays de Galles',
  Ecosse: 'Écosse',
  'Etats-Unis': 'États-Unis',
  'République démocratique du Congo': 'République Démocratique du Congo',
  "Côte d'Ivoire": 'Côte d’Ivoire',
  'Ile de Jersey': 'Jersey',
  Taïwan: 'Taïwan',
};

// Niveau du rugby international du pays d'origine : un Néo-Zélandais au Japon
// ou un Géorgien en Pro D2 est presque toujours un renfort de qualité.
const BONUS_NATION = {
  'Nouvelle-Zélande': 2, 'Afrique du Sud': 2, Irlande: 1.5, Angleterre: 1,
  Australie: 1.5, Écosse: 1, Argentine: 1.5, Fidji: 1.5, Italie: 0.5,
  Géorgie: 1, Samoa: 1, Tonga: 1, France: 0,
};

// Essais attendus par match, par poste (mêmes valeurs que le store).
const ESSAIS_PAR_MATCH = {
  pilier: 0.06, talonneur: 0.1, deuxieme_ligne: 0.08, troisieme_ligne: 0.14,
  demi_melee: 0.16, demi_ouverture: 0.12, centre: 0.24, ailier: 0.42, arriere: 0.3,
};

// Priorité de championnat : un joueur qui apparaît en Champions Cup ET en
// Top 14 est un joueur de Top 14. Les coupes ne servent qu'aux joueurs qu'on
// ne trouve nulle part ailleurs (Black Lion, Cheetahs).
const PRIORITE = [
  'Top 14', 'Premiership', 'URC', 'Super Rugby', 'League One D1', 'Pro D2',
  'NPC', 'MLR', 'Champ Rugby', 'Nationale', 'League One D2', 'League One D3',
  'Champions Cup', 'Challenge Cup', 'Prem. Rugby Cup',
];
const rangLigue = (l) => {
  const i = PRIORITE.indexOf(l);
  return i === -1 ? 99 : i;
};

// Dédoublonnage : une ligne par joueur (clé = lien allrugby, unique).
const parLien = new Map();
for (const l of JOUEURS) {
  const cle = l['Lien Joueur'] || `${l.Joueur}|${l['Équipe']}`;
  const actuel = parLien.get(cle);
  if (!actuel) { parLien.set(cle, l); continue; }
  // On garde la ligne du championnat le plus « domestique », et à égalité
  // celle de la saison en cours.
  const mieux =
    rangLigue(l.Ligue) < rangLigue(actuel.Ligue) ||
    (rangLigue(l.Ligue) === rangLigue(actuel.Ligue) && l.Saison === '25/26' && actuel.Saison !== '25/26');
  if (mieux) parLien.set(cle, l);
}

// Regroupement par club
const parClub = new Map();
for (const l of parLien.values()) {
  const club = clubDuNomCourt(l['Équipe']);
  if (!club) continue;
  const poste = POSTE_SRC[l.Poste];
  if (!poste) { avertir(`poste inconnu : « ${l.Poste} » (${l.Joueur})`); continue; }
  // Âge : quelques centaines de joueurs (académies anglaises surtout) n'en ont
  // pas dans la base — on leur en tire un plausible, de façon déterministe.
  let age = parseInt(l['Âge'], 10);
  if (!Number.isFinite(age)) age = 20 + Math.floor(graine(`age|${l.Joueur}|${l['Équipe']}`)() * 9);
  const liste = parClub.get(club.nom) ?? [];
  liste.push({
    nom: l.Joueur,
    poste,
    age: clamp(age, 17, 42),
    nation: NATION_SRC[l['Nationalité']] ?? l['Nationalité'],
    minutes: l.Minutes || 0,
    essais: l.Essais || 0,
    points: l.Points || 0,
  });
  parClub.set(club.nom, liste);
}

// --- Note d'un joueur --------------------------------------------------------
// La base ne donne aucune note : on la reconstruit à partir du niveau du club
// et de ce que le joueur y a réellement fait cette saison.
//   1. TEMPS DE JEU : ses minutes rapportées à celles des cadres du club
//      (moyenne des 5 plus gros temps de jeu). C'est de loin le meilleur
//      indicateur — un titulaire indiscutable de Toulouse vaut mieux qu'un
//      espoir qui gratte 200 minutes.
//   2. FINITION : essais par 80 minutes comparés à la moyenne de son poste.
//   3. BUTEUR : points au pied par 80 minutes (ouvreurs, arrières, centres).
//   4. NATION + ÂGE : petits ajustements.
// Les internationaux identifiés (scripts/vedettes.cjs) écrasent le calcul.
function noterClub(nomClub, ligue) {
  const liste = parClub.get(nomClub) ?? [];
  const base = NOTE_CLUB[nomClub];
  // Sans statistique individuelle de qualité, un joueur non identifié ne peut
  // pas dépasser de beaucoup le niveau de son club : le plafond garde les
  // hiérarchies crédibles (les vraies stars passent par la table VEDETTES).
  const plafond = Math.min(base + 5, ligue.echelle[1] + 1);
  const plancher = Math.max(36, base - 22);

  const cadres = liste.map((j) => j.minutes).sort((a, b) => b - a).slice(0, 5);
  const reference = cadres.length ? cadres.reduce((a, b) => a + b, 0) / cadres.length : 0;

  return liste.map((j) => {
    const rng = graine(`${nomClub}|${j.nom}`);
    const part = reference > 0 ? j.minutes / reference : 0.5;
    let note = base + (clamp(part, 0, 1.05) - 0.85) * 24;

    // Finition
    const matchs = j.minutes / 80;
    if (matchs > 3) {
      const parMatch = j.essais / matchs;
      note += clamp((parMatch - ESSAIS_PAR_MATCH[j.poste]) * 8, -2, 3);
      // Buteur : points qui ne viennent pas de ses essais.
      if (['demi_ouverture', 'arriere', 'centre'].includes(j.poste)) {
        const auPied = Math.max(0, j.points - j.essais * 5) / matchs;
        note += clamp((auPied - 3) * 0.4, 0, 1.5);
      }
    }

    note += BONUS_NATION[j.nation] ?? 0.4;
    // Âge : les très jeunes ne sont pas encore à leur niveau, les vétérans
    // gardent l'essentiel du leur tant qu'ils jouent.
    note += j.age <= 19 ? -5 : j.age <= 21 ? -3.5 : j.age <= 23 ? -1.5
      : j.age <= 24 ? 0 : j.age <= 30 ? 1 : j.age <= 32 ? 0 : j.age <= 34 ? -1 : -2;
    note += rng() * 1.6 - 0.8;

    // Un international identifié garde sa note calibrée, mais reste bridé par
    // le niveau de son club (un ancien Top 14 descendu en Nationale y perd).
    const vedette = noteVedette(j.nom);
    note = Math.round(vedette !== undefined ? Math.min(vedette, base + 14) : clamp(note, plancher, plafond));

    // POTENTIEL : la note visée au pic (27 ans). D'autant plus haut que le
    // joueur est jeune ET qu'il joue déjà — un titulaire de 20 ans explosera
    // plus souvent qu'un espoir qui ne quitte pas le banc.
    let potentiel = note;
    if (j.age < 27) {
      const marge = (27 - j.age) * (0.35 + rng() * 1.5) * (0.75 + clamp(part, 0, 1) * 0.6);
      potentiel = Math.max(note, Math.min(ligue.echelle[1] + 6, note + Math.round(Math.min(marge, 16))));
    }

    return { nom: j.nom, poste: j.poste, age: j.age, note, potentiel, nation: j.nation };
  }).sort((a, b) => b.note - a.note);
}

const EFFECTIFS = {};
for (const ligue of LIGUES) {
  for (const [, nom] of ligue.clubs) {
    const joueurs = noterClub(nom, ligue);
    if (!joueurs.length) { avertir(`aucun joueur pour « ${nom} »`); continue; }
    EFFECTIFS[nom] = joueurs;
  }
}

// ---------------------------------------------------------------------------
// 6. Écriture — src/data/mondeReel.ts
// ---------------------------------------------------------------------------
const esc = (s) => (s === null || s === undefined ? 'undefined' : `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);

function ecrireMonde() {
  let ts = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : base_rugby_finale.json + tous_les_classements.json + logos_equipes/
// Régénérer avec : node scripts/genMonde.cjs
//
// Contient les championnats couverts par la base réelle (France : Top 14,
// Pro D2, Nationale ; monde : Premiership, Championship, URC, Super Rugby,
// NPC, Japan League One D1-D3, MLR), leurs clubs (nom, ville, logo officiel,
// couleurs de repli), les coupes d'Europe et les compétitions internationales.
//
// Les classements de clubs ne sont PAS exportés : ils servent uniquement au
// calcul de la note des clubs, dans le générateur. Seules les sélections
// nationales gardent leur classement, faute d'effectif à afficher.

import type { Competition, CompetitionCoupe, CompetitionNations } from '../types';

`;

  // Clubs par compétition
  ts += 'export const COMPETITIONS_REELLES: Competition[] = [\n';
  for (const ligue of LIGUES) {
    ts += `  {\n    id: ${esc(ligue.id)}, nom: ${esc(ligue.nom)}, pays: ${esc(ligue.pays)},\n`;
    ts += `    drapeaux: [${ligue.drapeaux.map(esc).join(', ')}], emoji: ${esc(ligue.emoji)},\n`;
    ts += `    niveau: ${ligue.niveau}, zone: ${esc(ligue.zone)},${ligue.note ? ` note: ${esc(ligue.note)},` : ''}\n`;
    ts += '    clubs: [\n';
    for (const [src, nom, ville] of ligue.clubs) {
      const [c1, c2] = couleurs(nom);
      const club = CLUBS.get(src);
      ts += `      { nom: ${esc(nom)}, ville: ${esc(ville)}, logo: ${esc(club.logo)}, c1: ${esc(c1)}, c2: ${esc(c2)} },\n`;
    }
    ts += '    ],\n  },\n';
  }
  ts += '];\n\n';

  // Coupes
  ts += '// Coupes (pas de championnat propre : les clubs viennent des ligues).\n';
  ts += 'export const COUPES_EUROPE: CompetitionCoupe[] = [\n';
  for (const coupe of COUPES) {
    ts += `  {\n    id: ${esc(coupe.id)}, nom: ${esc(coupe.nom)}, pays: ${esc(coupe.pays)},\n`;
    ts += `    drapeaux: [${coupe.drapeaux.map(esc).join(', ')}], emoji: ${esc(coupe.emoji)}, desc: ${esc(coupe.desc)},\n`;
    // Clubs engagés, par ordre alphabétique
    const engages = [...new Set(JOUEURS.filter((x) => x.Ligue === coupe.srcLigue).map((x) => x['Équipe']))];
    ts += '    clubs: [\n';
    for (const src of engages.sort()) {
      const club = clubDuNomCourt(src);
      if (!club) continue;
      const [c1, c2] = couleurs(club.nom);
      ts += `      { nom: ${esc(club.nom)}, ville: ${esc(club.ville)}, logo: ${esc(club.logo)}, c1: ${esc(c1)}, c2: ${esc(c2)} },\n`;
    }
    ts += '    ],\n  },\n';
  }
  ts += '];\n\n';

  // Sélections nationales
  ts += '// Compétitions internationales : classement de la saison passée.\n';
  ts += 'export const COMPETITIONS_NATIONS: CompetitionNations[] = [\n';
  for (const comp of INTERNATIONALES) {
    const lignes = lignesParLigue[comp.srcLigue] ?? [];
    if (!lignes.length) { avertir(`compétition internationale sans classement : ${comp.srcLigue}`); continue; }
    ts += `  {\n    id: ${esc(comp.id)}, nom: ${esc(comp.nom)}, emoji: ${esc(comp.emoji)}, desc: ${esc(comp.desc)},\n`;
    ts += '    classement: [\n';
    for (const l of lignes) {
      ts += `      { position: ${l.Position}, equipe: ${esc(l['Équipe'])}, logo: ${esc(logoDe(l['Équipe']))}, points: ${l.Points}, joues: ${l['Joués']}, gagnes: ${l['Gagnés']}, nuls: ${l.Nuls}, perdus: ${l.Perdus}, difference: ${l['Différence']}, bonus: ${l.Bonus} },\n`;
    }
    ts += '    ],\n  },\n';
  }
  ts += '];\n\n';

  ts += `// Toutes les équipes (clubs ET sélections) qui disposent d'un logo officiel.
export const LOGO_PAR_EQUIPE: Record<string, string> = {\n`;
  const logos = {};
  for (const c of CLUBS.values()) if (c.logo) logos[c.nom] = c.logo;
  for (const comp of INTERNATIONALES) {
    for (const l of lignesParLigue[comp.srcLigue] ?? []) {
      const lg = logoDe(l['Équipe']);
      if (lg) logos[l['Équipe']] = lg;
    }
  }
  for (const [nom, url] of Object.entries(logos).sort()) ts += `  ${esc(nom)}: ${esc(url)},\n`;
  ts += '};\n';

  fs.writeFileSync(path.join(RACINE, 'src', 'data', 'mondeReel.ts'), ts, 'utf8');
}

// ---------------------------------------------------------------------------
// 7. Écriture — src/data/effectifsReels.ts
// ---------------------------------------------------------------------------
// Format compact : un joueur = une chaîne « nom|poste|âge|note|potentiel|nation »
// (indices pour le poste et la nation). ~6 300 joueurs : en objets littéraux le
// fichier ferait plus de 700 Ko dans le bundle, ici il en fait le quart.
function ecrireEffectifs() {
  const POSTES = ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne',
    'demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere'];
  const nations = [...new Set(Object.values(EFFECTIFS).flat().map((j) => j.nation))].sort();
  const iNation = new Map(nations.map((n, i) => [n, i]));

  let ts = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : base_rugby_finale.json (9 388 lignes, saison 25-26) — voir
// scripts/genMonde.cjs. Régénérer avec : node scripts/genMonde.cjs
//
// • NOTE_CLUB_REEL : note générale d'un club, déduite du classement de la
//   saison passée (rang + points/différence par match) et de l'échelle de son
//   championnat.
// • EFFECTIFS_REELS : l'effectif complet de chaque club. La note d'un joueur
//   vient de son TEMPS DE JEU réel rapporté aux cadres de son club, de ses
//   essais et points au pied, de sa nation et de son âge ; les internationaux
//   identifiés ont une note calibrée à la main (scripts/vedettes.cjs).
// • potentiel : la note visée au pic de carrière (27 ans) — c'est elle qui
//   fait progresser les espoirs saison après saison (voir lib/effectif.ts).

import type { PosteId } from '../types';

export interface JoueurReel {
  nom: string;
  poste: PosteId;
  age: number;
  note: number;
  potentiel: number;
  nation: string;
}

// Note générale des clubs (classement de la saison passée).
export const NOTE_CLUB_REEL: Record<string, number> = {
`;
  for (const [k, v] of Object.entries(NOTE_CLUB).sort((a, b) => b[1] - a[1])) ts += `  ${esc(k)}: ${v},\n`;
  ts += `};

const POSTES: PosteId[] = [${POSTES.map((p) => `'${p}'`).join(', ')}];
const NATIONS: string[] = [\n`;
  for (const n of nations) ts += `  ${esc(n)},\n`;
  ts += `];

// « nom|poste|âge|note|potentiel|nation » (poste et nation = index ci-dessus).
const BRUT: Record<string, string[]> = {\n`;
  for (const [club, js] of Object.entries(EFFECTIFS)) {
    ts += `  ${esc(club)}: [\n`;
    for (const j of js) {
      ts += `    ${esc(`${j.nom}|${POSTES.indexOf(j.poste)}|${j.age}|${j.note}|${j.potentiel}|${iNation.get(j.nation)}`)},\n`;
    }
    ts += '  ],\n';
  }
  ts += `};

function lire(ligne: string): JoueurReel {
  const [nom, poste, age, note, potentiel, nation] = ligne.split('|');
  return {
    nom,
    poste: POSTES[+poste],
    age: +age,
    note: +note,
    potentiel: +potentiel,
    nation: NATIONS[+nation],
  };
}

export const EFFECTIFS_REELS: Record<string, JoueurReel[]> = Object.fromEntries(
  Object.entries(BRUT).map(([club, lignes]) => [club, lignes.map(lire)]),
);

// Un club dispose-t-il d'un effectif réel ?
export function aEffectifReel(club: string): boolean {
  return club in EFFECTIFS_REELS;
}
`;
  fs.writeFileSync(path.join(RACINE, 'src', 'data', 'effectifsReels.ts'), ts, 'utf8');
}

ecrireMonde();
ecrireEffectifs();

// ---------------------------------------------------------------------------
// 8. Récapitulatif
// ---------------------------------------------------------------------------
const total = Object.values(EFFECTIFS).reduce((a, l) => a + l.length, 0);
console.log(`\n${Object.keys(EFFECTIFS).length} clubs · ${total} joueurs\n`);
for (const ligue of LIGUES) {
  console.log(`=== ${ligue.nom} (${ligue.echelle[0]}-${ligue.echelle[1]}) ===`);
  for (const [, nom] of ligue.clubs) {
    const js = EFFECTIFS[nom] ?? [];
    const top = js.slice(0, 3).map((j) => `${j.nom} ${j.note}`).join(', ');
    console.log(`${String(NOTE_CLUB[nom]).padStart(3)} ${nom.padEnd(30)} ${String(js.length).padStart(3)} j. | ${top}`);
  }
}
if (MOUVEMENTS.length) {
  console.log('\nℹ Montées / descentes depuis le classement de référence :');
  for (const m of MOUVEMENTS) console.log('  -', m);
}
const vedettesPerdues = [...VEDETTE_PAR_NOM.keys()].filter((n) => !vedettesTrouvees.has(n));
if (vedettesPerdues.length) {
  console.log(`\nℹ ${vedettesPerdues.length} vedette(s) sans joueur correspondant (transfert, retraite…) :`);
  console.log('  ' + vedettesPerdues.join(', '));
}
if (avertissements.length) {
  console.log(`\n⚠ ${avertissements.length} avertissement(s) :`);
  for (const a of [...new Set(avertissements)]) console.log('  -', a);
}
