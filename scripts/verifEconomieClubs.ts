// VÉRIFICATION — L'ÉCONOMIE DES CLUBS ET LE MARCHÉ DES TRANSFERTS
//
// Demande : « revois le système de valeur, budget et transfert par rapport à
// ça », avec une table d'ordres de grandeur réels (produits d'exploitation LNR
// 2024/25, salary cap Top 14, minima de l'accord collectif du rugby fédéral).
//
// ⚠️ TROIS DÉFAUTS MESURÉS AVANT D'ÉCRIRE LA MOINDRE LIGNE :
//   · un joueur noté 98 valait 13 800 000 €, un Nationale noté 74 en valait
//     6 175 000 — un barème de football dans un sport qui n'achète presque pas ;
//   · la masse salariale s'INVERSAIT entre étages (Nationale 2 : 1 230 000 €,
//     Nationale : 1 110 000 €) ;
//   · le « budget transferts » valait le budget du club (28 650 000 € en Top 14).
//
// Ce script tient la table de référence et refuse toute dérive.
// Lancer : npx vite-node scripts/verifEconomieClubs.ts

import { COMPETITIONS } from '../src/data/clubs';

import {
  budgetsDuClub, ciblesDuMarche, masseSalarialeActuelle,
} from '../src/lib/recrutementManager';
import { partAmateur, primeDeMatch, salaire } from '../src/lib/offres';
import { indemniteDeRachat, salaryCap, valeurEstimee } from '../src/lib/economie';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(52)} ${valeur}`);
}
const E = (n: number) => Math.round(n).toLocaleString('fr-FR');

/** Un club témoin par étage, et la fourchette annoncée pour cet étage. */
const REFERENCE: {
  niveau: number; nom: string; club: string;
  budget: [number, number]; masse: [number, number]; indemniteMax: number;
}[] = [
  { niveau: 1, nom: 'Top 14', club: 'Stade Toulousain', budget: [20e6, 55e6], masse: [8e6, 11e6], indemniteMax: 500_000 },
  { niveau: 2, nom: 'Pro D2', club: 'US Oyonnax', budget: [5e6, 18e6], masse: [2e6, 6e6], indemniteMax: 150_000 },
  { niveau: 3, nom: 'Nationale', club: 'SC Albi', budget: [2e6, 6e6], masse: [800_000, 2.5e6], indemniteMax: 50_000 },
  { niveau: 4, nom: 'Nationale 2', club: 'RC Orléans', budget: [800_000, 2.5e6], masse: [250_000, 900_000], indemniteMax: 0 },
  { niveau: 5, nom: 'Fédérale 1', club: 'U S Nafarroa', budget: [400_000, 1.5e6], masse: [100_000, 500_000], indemniteMax: 0 },
  { niveau: 6, nom: 'Fédérale 2', club: 'R C Sablais', budget: [200_000, 700_000], masse: [30_000, 200_000], indemniteMax: 0 },
  { niveau: 7, nom: 'Fédérale 3', club: 'R C Teillois', budget: [100_000, 400_000], masse: [10_000, 100_000], indemniteMax: 0 },
  { niveau: 8, nom: 'Régionale 1', club: 'Orsay', budget: [70_000, 250_000], masse: [0, 50_000], indemniteMax: 0 },
  { niveau: 9, nom: 'Régionale 2', club: 'Chartreuse', budget: [40_000, 150_000], masse: [0, 25_000], indemniteMax: 0 },
  { niveau: 10, nom: 'Régionale 3', club: 'Parentis', budget: [20_000, 100_000], masse: [0, 8_000], indemniteMax: 0 },
];

// ---------------------------------------------------------------------------
console.log('\n=== 1. CHAQUE ÉTAGE TIENT DANS SA FOURCHETTE ===');
// ---------------------------------------------------------------------------
console.log('\n  étage        | budget club   | fourchette          | masse max   | fourchette');
const budgets: number[] = [];
const masses: number[] = [];
for (const r of REFERENCE) {
  const b = budgetsDuClub(r.club, 1);
  budgets.push(b.budget);
  masses.push(b.salarial);
  console.log(
    `  ${r.nom.padEnd(12)} | ${E(b.budget).padStart(13)} | ${`${E(r.budget[0])} – ${E(r.budget[1])}`.padEnd(19)} | `
    + `${E(b.salarial).padStart(11)} | ${E(r.masse[0])} – ${E(r.masse[1])}`,
  );
}
const horsBudget = REFERENCE.filter((r, i) => budgets[i] < r.budget[0] || budgets[i] > r.budget[1]);
ligne('le budget de chaque club témoin est dans sa bande',
  horsBudget.length ? horsBudget.map((r) => r.nom).join(', ') : '10 étages sur 10',
  horsBudget.length === 0);
// ⚠️ La masse a le droit de dépasser le HAUT de la bande : le plafond ne peut
// jamais être inférieur à ce que le club paie déjà (voir `budgetsDuClub`).
const sousMasse = REFERENCE.filter((r, i) => masses[i] < r.masse[0]);
ligne('… et la masse salariale ne tombe jamais sous sa bande',
  sousMasse.length ? sousMasse.map((r) => r.nom).join(', ') : '10 étages sur 10',
  sousMasse.length === 0);

// ---------------------------------------------------------------------------
console.log('\n=== 2. ⚠️ LA PYRAMIDE NE S’INVERSE PLUS ===');
// ---------------------------------------------------------------------------
// C'était le défaut le plus grave : la masse salariale sortait de la FORCE du
// groupe, si bien qu'un bon club de Nationale 2 payait mieux qu'un club moyen
// de Nationale. Une pyramide dont l'étage inférieur paie mieux n'en est pas une.
let inversions = 0;
const details: string[] = [];
for (let i = 1; i < REFERENCE.length; i++) {
  if (masses[i] > masses[i - 1]) {
    inversions++;
    details.push(`${REFERENCE[i].nom} (${E(masses[i])}) > ${REFERENCE[i - 1].nom} (${E(masses[i - 1])})`);
  }
}
ligne('aucun étage ne paie mieux que celui du dessus',
  inversions ? details.join(' · ') : `${masses.map((m) => E(m)).join(' > ')}`.slice(0, 60), inversions === 0);
let budgetInverse = 0;
for (let i = 1; i < REFERENCE.length; i++) if (budgets[i] > budgets[i - 1]) budgetInverse++;
ligne('… et aucun n’a un plus gros budget', `${budgetInverse} inversion(s)`, budgetInverse === 0);

// ---------------------------------------------------------------------------
console.log('\n=== 3. LA VALEUR D’UN JOUEUR, PAR NIVEAU ===');
// ---------------------------------------------------------------------------
const PROFILS: [number, string, number, number][] = [
  [96, 'Superstar internationale', 800_000, 1_500_000],
  [90, 'International', 500_000, 1_000_000],
  [84, 'Excellent Top 14', 300_000, 700_000],
  [78, 'Titulaire Top 14', 150_000, 400_000],
  [72, 'Rotation T14 / excellent Pro D2', 80_000, 250_000],
  [66, 'Titulaire Pro D2', 40_000, 120_000],
  [59, 'Nationale', 10_000, 60_000],
  [52, 'Nationale 2', 5_000, 30_000],
  [46, 'Fédérale 1', 0, 15_000],
  [40, 'Fédérale 2 et dessous', 0, 0],
];
console.log('\n  note | profil                          | cible              | jeu');
let horsBande = 0;
for (const [note, profil, bas, haut] of PROFILS) {
  const v = valeurEstimee({ note, potentiel: note, age: 27 });
  const ok = v >= bas && v <= haut;
  if (!ok) horsBande++;
  console.log(
    `  ${ok ? '✅' : '❌'} ${String(note).padStart(3)} | ${profil.padEnd(32)} | `
    + `${`${E(bas)} – ${E(haut)}`.padEnd(18)} | ${E(v)}`,
  );
}
ligne('la courbe de valeur tient dans la table', `${PROFILS.length - horsBande}/${PROFILS.length} profils`, horsBande === 0);
// ⚠️ ET ELLE EST BORNÉE EN HAUT. Sans plafond, un espoir de 22 ans noté 96 avec
// de la marge ressortait à 1 695 000 €, au-dessus du haut de la table.
const jeunePhenomene = valeurEstimee({ note: 97, potentiel: 99, age: 21 });
ligne('… même pour le cas le plus rare du jeu', `${E(jeunePhenomene)} €`, jeunePhenomene <= 1_500_000);

// ---------------------------------------------------------------------------
console.log('\n=== 4. ⚠️ ON NE PAIE QUE POUR LIBÉRER, PAS POUR RECRUTER ===');
// ---------------------------------------------------------------------------
// « Plutôt que de payer systématiquement, tu pourrais attendre sa fin de
// contrat — coût transfert : 0 € — mais Bordeaux, Pau et Montpellier peuvent
// aussi le contacter. » C'est le cœur du marché du rugby français.
console.log('\n  étage        | 3 saisons | 2 saisons | 1 saison  | fin de contrat');
for (const r of REFERENCE.slice(0, 5)) {
  const l = [3, 2, 1, 0].map((s) => E(indemniteDeRachat(250_000, s, r.niveau)).padStart(9));
  console.log(`  ${r.nom.padEnd(12)} | ${l.join(' | ')}`);
}
const finDeContratGratuite = REFERENCE.every((r) => indemniteDeRachat(1_000_000, 0, r.niveau) === 0);
ligne('une fin de contrat ne coûte JAMAIS rien', 'aux dix étages', finDeContratGratuite);
const bornees = REFERENCE.every((r) => indemniteDeRachat(5_000_000, 3, r.niveau) <= r.indemniteMax);
ligne('l’indemnité est bornée par l’étage du vendeur',
  `max ${E(REFERENCE[0].indemniteMax)} € en Top 14`, bornees);
const amateurGratuit = REFERENCE.slice(3).every((r) => indemniteDeRachat(500_000, 3, r.niveau) === 0);
ligne('aucun transfert payant sous la Nationale', 'Nationale 2 → Régionale 3', amateurGratuit);

// ---------------------------------------------------------------------------
console.log('\n=== 5. LES SALAIRES, ET LEUR AMPLITUDE ===');
// ---------------------------------------------------------------------------
// « Rends les écarts énormes, ça donnera de la personnalité aux divisions. »
// L'ancienne formule bornait le facteur à 1,8 : tout un Top 14 tenait dans un
// rapport de 2,8, quand la table demandée va de 2-6k €/mois à 75k €/mois.
console.log('\n  étage        | jeune (−10) | typique | vedette (+10) | amplitude');
for (const r of REFERENCE) {
  const bas = salaire(r.niveau, -10, 22);
  const moyen = salaire(r.niveau, 0, 27);
  const haut = salaire(r.niveau, 10, 27);
  const amp = bas > 0 ? (haut / bas).toFixed(1) : '—';
  console.log(
    `  ${r.nom.padEnd(12)} | ${E(bas).padStart(11)} | ${E(moyen).padStart(7)} | ${E(haut).padStart(13)} | ×${amp}`,
  );
}
const ampTop14 = salaire(1, 10, 27) / Math.max(1, salaire(1, -10, 22));
ligne('l’écart de salaire est énorme en Top 14',
  `×${ampTop14.toFixed(1)} entre un jeune et une vedette (avant : ×2,8)`, ampTop14 >= 6);
// Le rugby fédéral paie la feuille de match, pas un salaire.
const primeF2 = primeDeMatch(6, 10, 27);
ligne('une vedette de Fédérale 2 touche un vrai défraiement',
  `${E(primeF2)} € le match, soit ~${E(primeF2 * 22 / 12)} €/mois`,
  primeF2 * 22 / 12 >= 800 && primeF2 * 22 / 12 <= 2_500);
// ⚠️ ET LE BAS DE LA PYRAMIDE N'EST PAS « TOUT À ZÉRO ». La table donne un
// salaire typique NUL en Régionale 2 et 3, mais une vedette à 3 000 € et
// 1 500 €. Une interpolation géométrique ne sait pas partir de zéro : la
// première version rendait 0 à tout l'étage, vedette comprise — et un club
// non amateur y proposait alors un contrat SANS salaire NI défraiement, c'est
// à dire rien du tout. Le défaut ne se voyait qu'au bout de la chaîne.
const basDePyramide = [9, 10].every((n) => salaire(n, 0, 27) === 0);
ligne('en Régionale 2 et 3, le joueur ordinaire ne gagne rien', 'aux deux étages', basDePyramide);
const vedettesBasses = [[9, 3_000], [10, 1_500]] as const;
const vedettesOk = vedettesBasses.every(([n, cible]) => salaire(n, 10, 27) === cible);
ligne('… mais la vedette de la poule touche ce que dit la table',
  vedettesBasses.map(([n]) => `${E(salaire(n, 10, 27))} €`).join(' · '), vedettesOk);
// Un étage où personne n'est payé n'a aucun club employeur : sinon il reste des
// clubs « professionnels » qui proposent zéro euro et aucune prime.
const toutAmateur = [9, 10].every((n) => partAmateur(n, false) === 1);
ligne('… et aucun club n’y prétend employer ses joueurs',
  `part amateur ${partAmateur(9, false) * 100} %`, toutAmateur);

// ---------------------------------------------------------------------------
console.log('\n=== 6. ⚠️ LE SALARY CAP MORD ===');
// ---------------------------------------------------------------------------
// « Tu peux avoir énormément d'argent en banque et quand même être incapable de
// recruter Dupont parce que tu n'as plus assez de place sous ton salary cap. »
console.log('\n  club                 | plafond     | engagée     | %    | marge       | stars possibles');
for (const club of ['Stade Toulousain', 'US Oyonnax', 'SC Albi', 'RC Orléans']) {
  const b = budgetsDuClub(club, 1);
  const engagee = masseSalarialeActuelle(club, 1);
  const marge = Math.max(0, b.salarial - engagee);
  const star = salaire(COMPETITIONS.find((c) => c.clubs.some((x) => x.nom === club))?.niveau ?? 8, 10, 27);
  console.log(
    `  ${club.padEnd(20)} | ${E(b.salarial).padStart(11)} | ${E(engagee).padStart(11)} | `
    + `${String(b.salarial ? Math.round(100 * engagee / b.salarial) : 0).padStart(3)} % | ${E(marge).padStart(11)} | `
    + `${star > 0 ? Math.floor(marge / star) : '—'}`,
  );
}
const tls = budgetsDuClub('Stade Toulousain', 1);
const engageeTls = masseSalarialeActuelle('Stade Toulousain', 1);
ligne('le plafond du Top 14 est bien celui de la ligue', `${E(tls.salarial)} €`, tls.salarial === salaryCap(1));
const margeTls = tls.salarial - engageeTls;
const starTop14 = salaire(1, 10, 27);
ligne('… et il ne laisse pas signer indéfiniment',
  `${Math.floor(margeTls / starTop14)} vedette(s) avant saturation`,
  margeTls / starTop14 >= 2 && margeTls / starTop14 <= 8);
// ⚠️ Un club ne doit JAMAIS démarrer au-dessus de son propre plafond : il ne
// pourrait rien signer, sans que rien ne l'explique. Mesuré avant correction :
// le SC Albi payait 996 700 € pour un plafond de 800 000 €.
const saturés = REFERENCE.filter((r) => masseSalarialeActuelle(r.club, 1) > budgetsDuClub(r.club, 1).salarial);
ligne('aucun club témoin ne démarre au-dessus de son plafond',
  saturés.length ? saturés.map((r) => r.nom).join(', ') : '10 sur 10', saturés.length === 0);

// ---------------------------------------------------------------------------
console.log('\n=== 7. LE MARCHÉ EST MAJORITAIREMENT GRATUIT ===');
// ---------------------------------------------------------------------------
const cibles = ciblesDuMarche('prod2', 1, 'Stade Toulousain', '', 200);
const parSituation = new Map<string, number>();
for (const c of cibles) parSituation.set(c.situation, (parSituation.get(c.situation) ?? 0) + 1);
const gratuits = cibles.filter((c) => c.indemnite === 0).length;
console.log('\n  ' + [...parSituation].map(([k, v]) => `${k} : ${v}`).join(' · '));
ligne('une bonne part du marché ne coûte aucune indemnité',
  `${gratuits}/${cibles.length} (${Math.round(100 * gratuits / cibles.length)} %)`,
  gratuits / cibles.length >= 0.25 && gratuits / cibles.length <= 0.7);
ligne('… et les autres restent sous le plafond de leur étage',
  `plus chère : ${E(Math.max(...cibles.map((c) => c.indemnite)))} €`,
  Math.max(...cibles.map((c) => c.indemnite)) <= 150_000);
// La situation contractuelle est STABLE : rouvrir le marché ne rend pas trois
// ans à un joueur en fin de contrat (protection anti-save-scumming).
const encore = ciblesDuMarche('prod2', 1, 'Stade Toulousain', '', 200);
const stable = cibles.every((c, i) => encore[i].saisonsRestantes === c.saisonsRestantes);
ligne('la situation d’un joueur ne se rejoue pas', stable ? 'déterministe' : 'DIVERGENCE', stable);
// … mais elle AVANCE avec les saisons.
const dansTrois = ciblesDuMarche('prod2', 4, 'Stade Toulousain', '', 200);
const memeJoueur = cibles.find((c) => dansTrois.some((d) => d.id === c.id));
const plusTard = dansTrois.find((d) => d.id === memeJoueur?.id);
ligne('… mais le contrat court vraiment',
  `${memeJoueur?.nom} : ${memeJoueur?.saisonsRestantes} → ${plusTard?.saisonsRestantes} saison(s)`,
  !!memeJoueur && !!plusTard);

console.log(
  echecs === 0
    ? '\n✅ Budgets, salaires, valeurs et indemnités tiennent la table de référence.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
