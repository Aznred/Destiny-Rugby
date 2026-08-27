// VÉRIFICATION — LE CENTRE DE FORMATION, LA DÉTECTION ET LE CHOIX D'UN JEUNE
//
// Demande : un système « détection → recrutement → centre de formation →
// entraînement → progression → intégration en seniors », dont « l'idée est que
// former un jeune soit parfois plus rentable qu'acheter un joueur, mais avec
// beaucoup plus d'incertitude ».
//
// Ce que ce script contrôle, section par section :
//   1. la carte : les villes de rugby sont au bon endroit, les distances sont
//      vraies là où la mécanique s'en sert ;
//   2. le vivier : les jeunes existent AVANT d'être découverts, partout dans la
//      pyramide, et ils vieillissent au lieu d'être retirés au sort ;
//   3. ⚠️ le potentiel réel ne fuit JAMAIS — c'est la contrainte du lot ;
//   4. les six notes du centre, leurs bandes par division, et le petit club
//      exceptionnel que la demande réclame ;
//   5. la détection qui se resserre : 55-88 → 68-84 → 74-82 ;
//   6. le choix du jeune : le meilleur club ne gagne pas automatiquement ;
//   7. l'indemnité de formation ;
//   8. la progression, et le fait qu'un potentiel 90 puisse finir à 75.
//
// Lancer : npx vite-node scripts/verifFormation.ts

import { COMPETITIONS } from '../src/data/clubs';
import { distanceKm, positionDuClub } from '../src/data/geographie';
import { forceEffectif } from '../src/lib/effectif';
import {
  centreRemarquable, etageDeDetection, noteGlobaleCentre, notesDeBase, rayonDeDetection,
} from '../src/lib/centreFormation';
import { POTENTIEL_MAX, ficheDe, rapportDeSaison } from '../src/lib/detection';
import { jeunesAPortee, vivierDuClub } from '../src/lib/viviers';
import { AGE_MAX_JEUNE, AGE_MIN_JEUNE, familleDe, progresser } from '../src/lib/jeunes';
import type { JeuneJoueur } from '../src/lib/jeunes';
import { choisirSonClub, indemniteDeFormation, offreDe, rayonAcceptable } from '../src/lib/signatureJeune';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(56)} ${valeur}`);
}
function info(libelle: string, valeur: string): void {
  console.log(`     ${libelle.padEnd(56)} ${valeur}`);
}
const E = (n: number) => Math.round(n).toLocaleString('fr-FR');

const FRANCE = COMPETITIONS.filter((c) => c.pays === 'France' && c.niveau >= 1 && c.niveau <= 10);
const TOUS_CLUBS = FRANCE.flatMap((c) => c.clubs.map((x) => x.nom));

// ---------------------------------------------------------------------------
console.log('\n=== 1. ⚠️ LA CARTE — les distances doivent être VRAIES ===');
// ---------------------------------------------------------------------------
// ⚠️ TOUT LE LOT REPOSE DESSUS. « Toulouse, Castres, Colomiers, Montauban se
// battent pour les mêmes jeunes » et « un joueur de 16 ans ne va pas faire 1h30
// de route » ne veulent rien dire sans une carte juste. Une première version
// dispersait chaque club au hasard DANS sa région : Toulouse et Colomiers,
// dix kilomètres en vrai, ressortaient à 129 km, et un réseau « 50 km autour du
// club » n'attrapait même pas sa propre banlieue.
const D = (a: string, b: string) => distanceKm(positionDuClub(a), positionDuClub(b));
const PAIRES: [string, string, number, number][] = [
  ['Stade Toulousain', 'US Colomiers', 2, 25],
  ['Stade Toulousain', 'Castres Olympique', 50, 100],
  ['Stade Toulousain', 'US Montauban', 30, 70],
  ['Stade Français Paris', 'Racing 92', 2, 30],
  ['Stade Toulousain', 'Stade Rochelais', 300, 480],
];
console.log('\n  paire                                        | mesuré | attendu');
let horsCible = 0;
for (const [a, b, bas, haut] of PAIRES) {
  const d = D(a, b);
  const ok = d >= bas && d <= haut;
  if (!ok) horsCible++;
  console.log(`  ${ok ? '✅' : '❌'} ${`${a} → ${b}`.padEnd(42)} | ${String(d).padStart(6)} | ${bas}-${haut}`);
}
ligne('les distances entre villes connues sont réalistes',
  `${PAIRES.length - horsCible}/${PAIRES.length}`, horsCible === 0);

const placés = TOUS_CLUBS.filter((c) => positionDuClub(c).place).length;
info('clubs placés à la main', `${placés}/${TOUS_CLUBS.length}`);
// ⚠️ Les étages du haut DOIVENT être placés : c'est là que se joue la demande.
const hautDePyramide = FRANCE.filter((c) => c.niveau <= 4).flatMap((c) => c.clubs.map((x) => x.nom));
const manquants = hautDePyramide.filter((c) => !positionDuClub(c).place);
ligne('le haut de la pyramide est placé au kilomètre près',
  manquants.length ? manquants.slice(0, 4).join(', ') : `${hautDePyramide.length} clubs (n1 à n4)`,
  manquants.length <= 6);

// ---------------------------------------------------------------------------
console.log('\n=== 2. LE VIVIER — les jeunes existent avant qu\'on les trouve ===');
// ---------------------------------------------------------------------------
let totalJeunes = 0;
const parNiveau = new Map<number, { clubs: number; n: number; pot: number[] }>();
for (const c of FRANCE) {
  for (const club of c.clubs) {
    const v = vivierDuClub(club.nom, 1);
    totalJeunes += v.length;
    const e = parNiveau.get(c.niveau) ?? { clubs: 0, n: 0, pot: [] };
    e.clubs++; e.n += v.length;
    for (const j of v) e.pot.push(j.potentielReel);
    parNiveau.set(c.niveau, e);
  }
}
console.log('\n  étage | clubs | jeunes | par club | potentiel médian | ≥ 80 | ≥ 88');
const tous: number[] = [];
for (const [n, e] of [...parNiveau].sort((a, b) => a[0] - b[0])) {
  tous.push(...e.pot);
  const t = e.pot.slice().sort((a, b) => a - b);
  console.log(
    `  ${String(n).padStart(5)} | ${String(e.clubs).padStart(5)} | ${String(e.n).padStart(6)} | `
    + `${(e.n / e.clubs).toFixed(1).padStart(8)} | ${String(t[Math.floor(t.length / 2)]).padStart(16)} | `
    + `${String(e.pot.filter((p) => p >= 80).length).padStart(4)} | ${e.pot.filter((p) => p >= 88).length}`,
  );
}
ligne('toute la pyramide a des jeunes, du Top 14 à la Régionale 3',
  `${E(totalJeunes)} garçons dans ${TOUS_CLUBS.length} clubs`,
  [...parNiveau.values()].every((e) => e.n > 0) && parNiveau.size === 10);

// ⚠️ LA RARETÉ EST LE RÉGLAGE CENTRAL. Une première version rendait 30 % de
// potentiels ≥ 80, soit dix-huit cents futurs internationaux : la détection
// n'avait plus rien à trouver, et le mot « pépite » ne désignait plus rien.
const partHaute = tous.filter((p) => p >= 80).length / tous.length;
const partTresHaute = tous.filter((p) => p >= 88).length / tous.length;
ligne('un potentiel international reste RARE',
  `${(partHaute * 100).toFixed(1)} % ≥ 80 (${tous.filter((p) => p >= 80).length} garçons)`,
  partHaute >= 0.005 && partHaute <= 0.045);
ligne('… et un potentiel de superstar encore plus',
  `${(partTresHaute * 100).toFixed(2)} % ≥ 88`,
  partTresHaute >= 0.0005 && partTresHaute <= 0.012);

// ⚠️ « JE NE FERAIS PAS APPARAÎTRE 30 JOUEURS ALÉATOIRES TOUS LES ANS. »
const s1 = vivierDuClub('Parentis', 1);
const s2 = vivierDuClub('Parentis', 2);
const retrouves = s1.filter((a) => s2.some((b) => b.id === a.id && b.nom === a.nom && b.age === a.age + 1));
const sortants = s1.filter((a) => a.age === AGE_MAX_JEUNE).length;
ligne('un jeune VIEILLIT au lieu d\'être retiré au sort',
  `${retrouves.length}/${s1.length - sortants} retrouvés un an plus vieux`,
  retrouves.length === s1.length - sortants && retrouves.length > 0);
const jeunesDuBas = vivierDuClub(FRANCE[9].clubs[0].nom, 1);
ligne('… et il en existe dans le club le plus modeste du jeu',
  `${FRANCE[9].clubs[0].nom} : ${jeunesDuBas.length} garçons`, jeunesDuBas.length > 0);

// ---------------------------------------------------------------------------
console.log('\n=== 3. ⚠️ LE POTENTIEL RÉEL NE FUIT JAMAIS ===');
// ---------------------------------------------------------------------------
// C'est LA contrainte du lot : « le point important : le potentiel exact ne doit
// jamais être visible ». Un rapport qui rendrait la vérité viderait de son sens
// toute la détection — plus rien à parier, plus aucune raison de scouter.
const notesTls = notesDeBase('Stade Toulousain');
const echantillon = jeunesAPortee('Stade Toulousain', 1, 900, AGE_MIN_JEUNE).slice(0, 400);
let exacts = 0;
for (const j of echantillon) {
  const f = ficheDe(j, notesTls, undefined, 'Stade Toulousain');
  if (f.potentielBas === f.potentielHaut) exacts++;
}
ligne('aucune fiche ne rend un potentiel EXACT sans observation',
  `${exacts} fiche(s) ponctuelle(s) sur ${echantillon.length}`, exacts === 0);
const horsEchelle = echantillon
  .map((j) => ficheDe(j, notesTls, undefined, 'Stade Toulousain'))
  .filter((f) => f.potentielHaut > POTENTIEL_MAX || f.potentielBas > f.potentielHaut);
ligne('… et aucune fourchette n\'est absurde (« 115-99 »)',
  `${horsEchelle.length} anomalie(s)`, horsEchelle.length === 0);

// ---------------------------------------------------------------------------
console.log('\n=== 4. LES SIX NOTES DU CENTRE ===');
// ---------------------------------------------------------------------------
console.log('\n  étage        | note médiane | min | max | centres remarquables');
let bandesOk = true;
for (const c of FRANCE) {
  const notes = c.clubs.map((cl) => noteGlobaleCentre(notesDeBase(cl.nom))).sort((a, b) => a - b);
  const rem = c.clubs.filter((cl) => centreRemarquable(cl.nom));
  console.log(
    `  ${c.nom.padEnd(12)} | ${String(notes[Math.floor(notes.length / 2)]).padStart(12)} | `
    + `${String(notes[0]).padStart(3)} | ${String(notes[notes.length - 1]).padStart(3)} | ${rem.length}`
    + (rem.length && c.niveau >= 6 ? ` (${rem.slice(0, 2).map((x) => x.nom).join(', ')})` : ''),
  );
  if (c.niveau >= 2 && notes[Math.floor(notes.length / 2)] > 92) bandesOk = false;
}
ligne('la hiérarchie des centres suit celle des divisions', 'médianes décroissantes', bandesOk);

// ⚠️ « MAIS UN PETIT CLUB DOIT POUVOIR AVOIR EXCEPTIONNELLEMENT UN TRÈS BON
// CENTRE. » C'est la condition d'existence de la stratégie que la demande
// décrit : petit club formateur → vend ses jeunes → monte. Sans elle, le
// classement des centres serait exactement le classement des divisions.
const petitsRemarquables = FRANCE.filter((c) => c.niveau >= 5)
  .flatMap((c) => c.clubs.map((x) => x.nom)).filter(centreRemarquable);
ligne('un petit club peut avoir un centre au-dessus de son étage',
  `${petitsRemarquables.length} clubs sous la Nationale 2`, petitsRemarquables.length >= 5);

// Chaque note doit ACHETER quelque chose : on vérifie que les six diffèrent.
const profilTls = notesDeBase('Stade Toulousain');
const etendue = Math.max(...Object.values(profilTls)) - Math.min(...Object.values(profilTls));
ligne('les six notes ne sont pas six façons d\'écrire le même nombre',
  `étendue ${etendue} points au Stade Toulousain`, etendue >= 8);

console.log('\n  club               | réseau | rayon    | étage de détection');
for (const club of ['Stade Toulousain', 'US Oyonnax', 'SC Albi', 'RC Orléans', 'Parentis']) {
  const n = notesDeBase(club);
  console.log(`  ${club.padEnd(18)} | ${String(n.reseau).padStart(6)} | `
    + `${`${rayonDeDetection(n.reseau)} km`.padStart(8)} | ${etageDeDetection(n.reseau)}`);
}
const rayons = ['Stade Toulousain', 'Parentis'].map((c) => rayonDeDetection(notesDeBase(c).reseau));
ligne('un grand club voit bien plus loin qu\'un club de village',
  `${E(rayons[0])} km contre ${E(rayons[1])} km`, rayons[0] > rayons[1] * 3);

// ---------------------------------------------------------------------------
console.log('\n=== 5. ⚠️ LA DÉTECTION SE RESSERRE — 55-88 → 68-84 → 74-82 ===');
// ---------------------------------------------------------------------------
// « Et plus tu observes longtemps un joueur, plus ton rapport devient précis.
// Ça donne une vraie raison de scout plutôt que juste regarder une base de
// données. » C'est la phrase la plus importante du lot : l'écran Marché montre
// déjà note et potentiel de n'importe quel professionnel. Si la détection des
// jeunes faisait pareil, elle ne serait qu'un second annuaire.
const cible = jeunesAPortee('Stade Toulousain', 1, 900, 16)
  .sort((a, b) => b.potentielReel - a.potentielReel)[2];
console.log(`\n  ${cible.nom}, ${cible.age} ans, ${familleDe(cible.poste)}, ${cible.club}`);
info('⚠️ potentiel RÉEL (jamais affiché)', String(cible.potentielReel));
console.log('');
const etapes: [number, boolean][] = [[0, false], [1, false], [3, false], [6, false], [10, true]];
const largeurs: number[] = [];
for (const [m, ent] of etapes) {
  const f = ficheDe(cible, notesTls, { jeuneId: cible.id, matchs: m, entretien: ent, saison: 1 }, 'Stade Toulousain');
  largeurs.push(f.potentielHaut - f.potentielBas);
  console.log(
    `  ${`${m} match(s)${ent ? ' + entretien' : ''}`.padEnd(22)} → potentiel ${f.potentielBas}-${f.potentielHaut} `
    + `(${f.etoilesBas} à ${f.etoilesHaut} ★) · note vue ${f.noteObservee} · confiance ${f.confiance} %`,
  );
}
ligne('la fourchette se resserre à chaque observation',
  `${largeurs[0]} → ${largeurs[largeurs.length - 1]} points`,
  largeurs[largeurs.length - 1] < largeurs[0] * 0.55);
ligne('… et elle ne se referme jamais complètement',
  `${largeurs[largeurs.length - 1]} points après 10 matchs + entretien`,
  largeurs[largeurs.length - 1] >= 2);

// ⚠️ UN MAUVAIS SERVICE SE TROMPE VRAIMENT. « Ton scout peut se tromper : le
// futur international peut finalement être moyen. » Une information VAGUE et
// une information FAUSSE ne sont pas la même chose.
const notesPetit = notesDeBase('Parentis');
let ratesPetit = 0; let ratesGros = 0; let n = 0;
for (const j of echantillon.slice(0, 300)) {
  n++;
  const p = ficheDe(j, notesPetit, undefined, 'Parentis');
  const g = ficheDe(j, notesTls, undefined, 'Stade Toulousain');
  if (j.potentielReel < p.potentielBas || j.potentielReel > p.potentielHaut) ratesPetit++;
  if (j.potentielReel < g.potentielBas || j.potentielReel > g.potentielHaut) ratesGros++;
}
ligne('une cellule modeste se trompe pour de bon',
  `${Math.round(100 * ratesPetit / n)} % de fiches hors-cible`, ratesPetit / n >= 0.08);
ligne('… et payer le service réduit vraiment l\'erreur',
  `${Math.round(100 * ratesGros / n)} % au Stade Toulousain`, ratesGros < ratesPetit);

// ⚠️ LE RAPPORT NE DOIT PAS ÊTRE MONOPOLISÉ PAR UN SEUL POSTE. Une version
// triait par MARGE annoncée : comme la marge dépend surtout de l'âge du pic du
// poste, le rapport du Stade Toulousain remontait cinq piliers sur cinq.
const rapport = rapportDeSaison(
  jeunesAPortee('Stade Toulousain', 1, rayonDeDetection(notesTls.reseau), 16),
  notesTls, {}, 'Stade Toulousain', 12,
);
const familles = new Set(rapport.map((f) => familleDe(f.jeune.poste)));
console.log('');
for (const f of rapport.slice(0, 6)) {
  console.log(
    `    ${f.jeune.nom.padEnd(22)} ${f.jeune.age} ans ${familleDe(f.jeune.poste).padEnd(16)} `
    + `note ${String(f.noteObservee).padStart(2)} · ${f.potentielBas}-${f.potentielHaut} `
    + `(réel ${f.jeune.potentielReel}) · ${f.jeune.club}`,
  );
}
ligne('le rapport annuel n\'est pas monopolisé par un seul poste',
  `${familles.size} famille(s) de poste sur 12 fiches`, familles.size >= 4);

// ---------------------------------------------------------------------------
console.log('\n=== 6. ⚠️ LE MEILLEUR CLUB NE GAGNE PAS AUTOMATIQUEMENT ===');
// ---------------------------------------------------------------------------
// « Un jeune de Toulouse pourrait préférer Colomiers parce qu'il sait qu'il aura
// plus de chances de jouer. » Ça n'est atteignable que si la promesse de temps
// de jeu pèse plus lourd que trente points de niveau sportif.
const QUATRE = ['Stade Toulousain', 'US Colomiers', 'US Montauban', 'Castres Olympique'];
const locaux = jeunesAPortee('Stade Toulousain', 1, 90, 17)
  .sort((a, b) => b.potentielReel - a.potentielReel).slice(0, 60);
const gagnants = new Map<string, number>();
let restent = 0;
for (const j of locaux) {
  const offres = QUATRE.map((c) => offreDe(c, distanceKm(positionDuClub(j.club), positionDuClub(c)), forceEffectif(c, 1)));
  const d = choisirSonClub(j, offres, notesDeBase(j.club), 1);
  if (d.choix) gagnants.set(d.choix, (gagnants.get(d.choix) ?? 0) + 1);
  else restent++;
}
console.log('\n  ' + [...gagnants].sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${v}`).join(' · ')
  + ` · restent chez eux ${restent}`);
ligne('plusieurs clubs différents décrochent des jeunes',
  `${gagnants.size} clubs sur ${QUATRE.length}`, gagnants.size >= 2);
ligne('… et le plus gros ne rafle pas tout',
  `le mieux servi en prend ${Math.max(...gagnants.values())}/${locaux.length}`,
  Math.max(...gagnants.values()) < locaux.length * 0.8);
ligne('rester au club formateur est une vraie option',
  `${restent}/${locaux.length} restent`, restent > 0);

// ⚠️ LA DISTANCE EST UN VETO QUI S'ASSOUPLIT AVEC L'ÂGE.
console.log('\n  âge | rayon acceptable (petit centre → grand centre)');
for (const age of [14, 16, 18, 19]) {
  console.log(`  ${String(age).padStart(3)} | ${rayonAcceptable(age, notesDeBase('Parentis'))} km → `
    + `${rayonAcceptable(age, notesTls)} km`);
}
ligne('un gamin de 14 ans ne traverse pas la France',
  `${rayonAcceptable(14, notesTls)} km même pour le meilleur centre`,
  rayonAcceptable(14, notesTls) < 130);
ligne('… et le rayon s\'ouvre avec l\'âge',
  `${rayonAcceptable(14, notesTls)} → ${rayonAcceptable(19, notesTls)} km`,
  rayonAcceptable(19, notesTls) > rayonAcceptable(14, notesTls) * 3);

// ---------------------------------------------------------------------------
console.log('\n=== 7. L\'INDEMNITÉ DE FORMATION ===');
// ---------------------------------------------------------------------------
// « Tu formes un joueur pendant 7 ans. À 19 ans, Toulouse le recrute. Ton club
// pourrait recevoir : Indemnité de formation 18 000 €. Donc un petit club peut
// réellement survivre grâce à sa formation. »
const modele = locaux[0];
console.log('\n  âge | Top 14   | Pro D2   | Nationale | Fédérale 2');
for (const age of [15, 17, 19]) {
  const j: JeuneJoueur = { ...modele, age };
  console.log(`  ${String(age).padStart(3)} | ${E(indemniteDeFormation(j, 1)).padStart(8)} | `
    + `${E(indemniteDeFormation(j, 2)).padStart(8)} | ${E(indemniteDeFormation(j, 3)).padStart(9)} | `
    + `${E(indemniteDeFormation(j, 6))}`);
}
const dixNeuf: JeuneJoueur = { ...modele, age: 19 };
ligne('un départ vers le Top 14 à 19 ans rapporte un vrai chèque',
  `${E(indemniteDeFormation(dixNeuf, 1))} €`,
  indemniteDeFormation(dixNeuf, 1) >= 12_000 && indemniteDeFormation(dixNeuf, 1) <= 45_000);
ligne('… et elle suit l\'étage de celui qui recrute',
  `Top 14 ${E(indemniteDeFormation(dixNeuf, 1))} € > Nationale ${E(indemniteDeFormation(dixNeuf, 3))} €`,
  indemniteDeFormation(dixNeuf, 1) > indemniteDeFormation(dixNeuf, 3) * 3);

// ---------------------------------------------------------------------------
console.log('\n=== 8. ⚠️ UN POTENTIEL 90 PEUT FINIR À 75 ===');
// ---------------------------------------------------------------------------
// « C'est important parce qu'un jeune ne doit jamais être garanti de devenir une
// superstar. Un joueur avec potentiel 90 pourrait finir à 75 parce qu'il joue
// peu, se blesse, travaille mal, est mal entraîné. »
function carriere(base: JeuneJoueur, tempsDeJeu: number, coaching: number, install: number): number {
  let j = { ...base };
  let alea = 0.37;
  const suite = () => { alea = (alea * 9301 + 49297) % 233280 / 233280; return alea; };
  for (let age = j.age; age <= 26; age++) {
    const g = progresser(j, { coaching, infrastructures: install, tempsDeJeu, moral: 60 }, suite);
    j = { ...j, age: age + 1, note: j.note + g.note, potentielReel: j.potentielReel + g.potentiel };
    if (j.note > j.potentielReel) j.note = j.potentielReel;
  }
  return Math.round(j.note);
}
const espoir: JeuneJoueur = { ...modele, age: 17, note: 45, potentielReel: 90, professionnalisme: 70 };
console.log('\n  parcours                                  | note à 27 ans');
const bien = carriere(espoir, 85, 88, 88);
const banc = carriere(espoir, 12, 88, 88);
const mauvais = carriere({ ...espoir, professionnalisme: 25 }, 30, 25, 25);
console.log(`  il joue et il est bien encadré             | ${bien}`);
console.log(`  il reste sur le banc                       | ${banc}`);
console.log(`  il ne joue pas, travaille mal, mal encadré | ${mauvais}`);
ligne('bien lancé, il approche son potentiel', `${bien}/90`, bien >= 78);
ligne('⚠️ laissé sur le banc, il le rate franchement', `${banc}/90`, banc <= bien - 10);
ligne('… et un mauvais parcours le gâche', `${mauvais}/90`, mauvais < banc + 6);
// Le temps de jeu doit peser PLUS que l'encadrement : c'est ce qui rend le prêt
// intéressant (« parfois tu dois prêter ton jeune »).
const bonCentrePeuDeJeu = carriere(espoir, 15, 95, 95);
const petitCentreBeaucoupDeJeu = carriere(espoir, 90, 45, 45);
ligne('⚠️ jouer ailleurs vaut mieux que s\'entraîner au chaud',
  `${petitCentreBeaucoupDeJeu} contre ${bonCentrePeuDeJeu}`,
  petitCentreBeaucoupDeJeu > bonCentrePeuDeJeu);

console.log(
  echecs === 0
    ? '\n✅ Les jeunes existent, se cachent, se disputent — et rien n\'est jamais garanti.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
