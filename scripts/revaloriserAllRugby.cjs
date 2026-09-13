// Transforme les 4 000+ fiches AllRugby fournies par l'utilisateur en
// PLANCHERS de note. Le jeu garde toujours la meilleure valeur entre sa note
// existante, les classements éditoriaux et ce calcul statistique.
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const SOURCE = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(RACINE, '..', 'allrugby_joueurs_complets.json');
const SORTIE = path.join(RACINE, 'src', 'data', 'evaluationsAllRugby.ts');

const normaliser = (s) => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const nombre = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const borner = (n, min, max) => Math.max(min, Math.min(max, n));

function identite(joueur) {
  return String(joueur.header ?? '').replace(/\s+\d+\s+ans?.*$/i, '').trim();
}

function profil(header) {
  const h = normaliser(header);
  if (/ailier/.test(h)) return { essai: 0.36, nom: 'ailier' };
  if (/centre/.test(h)) return { essai: 0.20, nom: 'centre' };
  if (/arriere/.test(h)) return { essai: 0.25, nom: 'arrière' };
  if (/melee|ouverture/.test(h)) return { essai: 0.12, nom: 'demi' };
  if (/3eme ligne|troisieme ligne/.test(h)) return { essai: 0.14, nom: 'troisième ligne' };
  if (/2eme ligne|deuxieme ligne/.test(h)) return { essai: 0.07, nom: 'deuxième ligne' };
  if (/talonneur/.test(h)) return { essai: 0.08, nom: 'talonneur' };
  return { essai: 0.04, nom: 'pilier' };
}

const POSTES_DETAILLES = [
  ['pilier_gauche', /pilier gauche\s+(\d+)(?:\s|$)/g],
  ['pilier_droit', /pilier droit\s+(\d+)(?:\s|$)/g],
  ['talonneur', /talonneur\s+(\d+)(?:\s|$)/g],
  ['deuxieme_ligne_g', /numero 4\s+(\d+)(?:\s|$)/g],
  ['deuxieme_ligne_d', /numero 5\s+(\d+)(?:\s|$)/g],
  ['troisieme_aile_g', /numero 6\s+(\d+)(?:\s|$)/g],
  ['troisieme_aile_d', /numero 7\s+(\d+)(?:\s|$)/g],
  ['numero_8', /troisieme ligne centre\s+(\d+)(?:\s|$)/g],
  ['demi_melee', /demi de melee\s+(\d+)(?:\s|$)/g],
  ['demi_ouverture', /demi d ouverture\s+(\d+)(?:\s|$)/g],
  ['ailier_gauche', /ailier gauche\s+(\d+)(?:\s|$)/g],
  ['ailier_droit', /ailier droit\s+(\d+)(?:\s|$)/g],
  ['premier_centre', /premier centre\s+(\d+)(?:\s|$)/g],
  ['deuxieme_centre', /second centre\s+(\d+)(?:\s|$)/g],
  ['arriere', /arriere\s+(\d+)(?:\s|$)/g],
];

/** Lit les postes exacts et leur part d'utilisation dans `positions_jouees`. */
function profilPostes(joueur) {
  const scores = new Map();
  let echantillon = 0;
  for (const brut of joueur.positions_jouees ?? []) {
    const texte = normaliser(brut);
    echantillon += nombre(texte.match(/:\s*(\d+)\s*fois/)?.[1] ?? texte.match(/\s(\d+)\s+fois/)?.[1]);
    for (const [poste, motif] of POSTES_DETAILLES) {
      motif.lastIndex = 0;
      const trouves = [...texte.matchAll(motif)];
      // Pour « Talonneur : 8 fois (Talonneur 100 %) », le dernier résultat
      // est le pourcentage détaillé, le premier est l'effectif du groupe.
      const part = nombre(trouves.at(-1)?.[1]);
      if (part > 0) scores.set(poste, (scores.get(poste) ?? 0) + part);
    }
  }
  const classes = [...scores].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!classes.length) return null;
  const postePrincipal = classes[0][0];
  const postesSecondaires = classes.slice(1)
    // Un dépannage isolé à 3 % n'est pas un second poste. Dix pour cent, ou
    // environ trois titularisations sur un gros échantillon, prouvent un rôle.
    .filter(([, part]) => part >= 10 || echantillon * part / 100 >= 3)
    .slice(0, 3).map(([poste]) => poste);
  return { postePrincipal, postesSecondaires, echantillon };
}

function niveauCompetition(competition, club) {
  const c = normaliser(competition);
  const equipe = normaliser(club);
  const espoir = /u20|developpement|espoir|academy|universitaire/.test(c) || /u20|developpement| a$| xv$/.test(equipe);
  if (espoir) return null;
  const nationsElite = new Set(['afrique du sud', 'nouvelle zelande', 'irlande', 'france', 'angleterre', 'argentine', 'australie']);
  const nationsTier1 = new Set(['ecosse', 'pays de galles', 'italie', 'japon', 'fidji']);
  const nationsTier2 = new Set(['georgie', 'samoa', 'tonga', 'portugal', 'uruguay', 'etats unis', 'roumanie', 'espagne', 'chili', 'canada', 'namibie']);
  const baseInternationale = nationsElite.has(equipe) ? 70
    : nationsTier1.has(equipe) ? 66
      : nationsTier2.has(equipe) ? 58
        : 51;
  if (/coupe du monde/.test(c)) return { base: baseInternationale + 2, cap: 500, libelle: 'Coupe du monde', international: true };
  if (/tournoi des 6 nations|nations championship|rugby championship|autumn nations|summer nations|test matchs?/.test(c)) {
    return { base: baseInternationale, cap: 430, libelle: 'international', international: true };
  }
  if (/champions cup/.test(c)) return { base: 66, cap: 650, libelle: 'Champions Cup' };
  if (/top 14/.test(c)) return { base: 62, cap: 1500, libelle: 'Top 14' };
  if (/premiership rugby cup/.test(c)) return { base: 54, cap: 700, libelle: 'Premiership Rugby Cup' };
  if (/premiership|united rugby championship|super rugby/.test(c)) return { base: 62, cap: 1450, libelle: competition };
  if (/challenge cup/.test(c)) return { base: 58, cap: 620, libelle: 'Challenge Cup' };
  if (/pro d2/.test(c)) return { base: 55, cap: 1650, libelle: 'Pro D2' };
  if (/nationale 2/.test(c)) return { base: 48, cap: 1650, libelle: 'Nationale 2' };
  if (/nationale/.test(c)) return { base: 51, cap: 1650, libelle: 'Nationale' };
  if (/federale 1/.test(c)) return { base: 45, cap: 1500, libelle: 'Fédérale 1' };
  return null;
}

const poidsSaison = new Map([['25/26', 1], ['24/25', 0.55], ['23/24', 0.22], ['26/27', 0.18]]);

function evaluation(joueur) {
  const nom = identite(joueur);
  if (!nom) return null;
  const poste = profil(joueur.header);
  const lignes = (joueur.stats_carriere_toutes_saisons ?? [])
    .filter((r) => Array.isArray(r) && poidsSaison.has(String(r[0] ?? '')))
    .map((r) => ({
      saison: String(r[0]), club: String(r[2] ?? ''), competition: String(r[3] ?? ''),
      matchs: nombre(r[4]), victoires: nombre(String(r[5] ?? '').split(/\s+/)[0]),
      titulaires: nombre(r[6]), essais: nombre(r[7]), points: nombre(r[11]), minutes: nombre(r[13]),
      niveau: niveauCompetition(String(r[3] ?? ''), String(r[2] ?? '')),
    }))
    .filter((r) => r.niveau && r.matchs > 0 && r.minutes > 0);
  if (!lignes.length) return null;

  const candidats = [];
  for (const r of lignes) {
    const poids = poidsSaison.get(r.saison) ?? 0;
    const preuveSuffisante = r.niveau.international
      ? r.matchs >= 2 && r.minutes >= 80
      : r.minutes >= 120 && (r.matchs >= (r.saison === '25/26' ? 3 : 4) || r.minutes >= 180);
    if (!preuveSuffisante) continue;
    const minutesPonderees = r.minutes * (0.72 + 0.28 * poids);
    const usage = borner(minutesPonderees / r.niveau.cap, 0, 1);
    const titularisation = borner(r.titulaires / Math.max(1, r.matchs), 0, 1);
    const par80 = Math.max(0.5, r.minutes / 80);
    const essais80 = r.essais / par80;
    const pointsPied80 = Math.max(0, r.points - r.essais * 5) / par80;
    const confiancePerformance = borner(r.minutes / 400, 0.2, 1);
    const bonusEssais = borner((essais80 - poste.essai) * 7.5, 0, 5) * confiancePerformance;
    const bonusPied = borner((pointsPied80 - 2) / 3.5, 0, 4) * confiancePerformance;
    const bonusVictoire = borner((r.victoires / Math.max(1, r.matchs) - 0.45) * 2.4, 0, 1.3);
    const anciennete = r.saison === '25/26' ? 0 : r.saison === '26/27' ? 0 : -1.2 * (1 - poids);
    const note = Math.round(borner(
      r.niveau.base + 3 + 10 * Math.sqrt(usage) + 2 * titularisation
        + bonusEssais + bonusPied + bonusVictoire + anciennete,
      30, 94,
    ));
    candidats.push({
      saison: r.saison,
      note,
      source: `AllRugby ${r.saison} · ${r.niveau.libelle} · ${r.matchs} m. · ${r.minutes} min`,
      matchs: r.matchs,
      minutes: r.minutes,
      competition: r.niveau.libelle,
      poste: poste.nom,
    });
  }
  // Une grosse saison ancienne ne doit pas masquer le niveau actuel. On prend
  // d'abord la dernière saison complète suffisamment documentée ; les saisons
  // plus anciennes ne servent que lorsque 2025-26 ne fournit aucune preuve.
  const saisonRetenue = ['25/26', '24/25', '23/24', '26/27']
    .find((saison) => candidats.some((c) => c.saison === saison));
  const meilleure = candidats
    .filter((c) => c.saison === saisonRetenue)
    .sort((a, b) => b.note - a.note || b.minutes - a.minutes)[0];
  if (meilleure) delete meilleure.saison;
  return meilleure ? [normaliser(nom), meilleure] : null;
}

if (!fs.existsSync(SOURCE)) throw new Error(`Fichier AllRugby introuvable : ${SOURCE}`);
const joueurs = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
if (!Array.isArray(joueurs)) throw new Error('Le fichier AllRugby doit contenir un tableau de joueurs.');

const evaluations = new Map();
const profilsPostes = new Map();
for (const joueur of joueurs) {
  const nom = identite(joueur);
  const profilJoueur = nom ? profilPostes(joueur) : null;
  if (profilJoueur) {
    const cleProfil = normaliser(nom);
    const precedentProfil = profilsPostes.get(cleProfil);
    if (!precedentProfil || profilJoueur.echantillon > precedentProfil.echantillon) {
      profilsPostes.set(cleProfil, profilJoueur);
    }
  }
  const resultat = evaluation(joueur);
  if (!resultat) continue;
  const [cle, valeur] = resultat;
  const precedent = evaluations.get(cle);
  if (!precedent || valeur.note > precedent.note) evaluations.set(cle, valeur);
}

const lignes = [...evaluations].sort(([a], [b]) => a.localeCompare(b)).map(([nom, v]) =>
  `  ${JSON.stringify(nom)}: ${JSON.stringify(v)},`);
const lignesPostes = [...profilsPostes].sort(([a], [b]) => a.localeCompare(b)).map(([nom, v]) =>
  `  ${JSON.stringify(nom)}: ${JSON.stringify(v)},`);
fs.writeFileSync(SORTIE, `// Fichier généré par scripts/revaloriserAllRugby.cjs depuis le relevé statistique AllRugby fourni.\n`
  + `import type { PosteId } from '../types.js';\n`
  + `export interface EvaluationAllRugby { note: number; source: string; matchs: number; minutes: number; competition: string; poste: string }\n`
  + `export interface ProfilPostesAllRugby { postePrincipal: PosteId; postesSecondaires: PosteId[]; echantillon: number }\n`
  + `export const EVALUATION_ALLRUGBY: Record<string, EvaluationAllRugby> = {\n${lignes.join('\n')}\n};\n`
  + `export const PROFIL_POSTES_ALLRUGBY: Record<string, ProfilPostesAllRugby> = {\n${lignesPostes.join('\n')}\n};\n`);

const notes = [...evaluations.values()].map((v) => v.note);
const repartition = [50, 60, 70, 80, 88].map((seuil) => `${seuil}+: ${notes.filter((n) => n >= seuil).length}`).join(' · ');
console.log(`${joueurs.length} fiches lues · ${evaluations.size} évaluations fiables · ${profilsPostes.size} profils de poste · ${repartition}`);
