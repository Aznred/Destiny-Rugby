// VÉRIFICATION — L'ENTRAÎNEMENT DE L'ÉQUIPE PRO
//
// Demande : « planning hebdomadaire + intensité + priorités tactiques +
// programmes individuels + fatigue », « sans tomber dans le micro-management
// chiant », et surtout : « la préparation du prochain adversaire, c'est
// probablement la mécanique que je rendrais la plus importante ».
//
// Ce que ce script contrôle :
//   1. la semaine par défaut n'abîme personne — c'est la condition pour que le
//      mode automatique soit vraiment jouable ;
//   2. l'intensité est un ARBITRAGE, pas un curseur à pousser à fond ;
//   3. la charge cumulée mord, et faire tourner devient une décision sportive ;
//   4. ⚠️ la préparation de l'adversaire : cibler bat marteler, et elle est
//      bornée pour ne jamais renverser une hiérarchie ;
//   5. un analyste médiocre rend un rapport FAUX, pas un rapport vide ;
//   6. les automatismes tombent vite et remontent lentement, secteur par
//      secteur ;
//   7. la délégation produit des semaines correctes et variées ;
//   8. les programmes individuels coûtent ce qu'ils rapportent.
//
// Lancer : npx vite-node scripts/verifEntrainementPro.ts

import {
  ETAT_NEUF, JOURS, SEANCES, appliquerSemaine, apportProgramme, composerSemaine,
  efficacite, etoilesDePoste, penalitesDeCharge, progresserAuNouveauPoste,
  seance, semaineParDefaut,
} from '../src/lib/entrainementPro';
import type {
  ContexteSeance, Intensite, PrioritesEntrainement, SemaineEntrainement, TypeSeance,
} from '../src/lib/entrainementPro';
import {
  BONUS_MAX_TOTAL, preparerLeMatch, rapportSur, semaineContre,
} from '../src/lib/analyseAdversaire';
import {
  PLANCHER_COHESION, SECTEURS_COHESION, apresChangements, apresLaSemaine,
  automatismesNeufs, cohesionGlobale, connexion, effetSurLeJeu,
} from '../src/lib/cohesion';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(56)} ${valeur}`);
}
function info(libelle: string, valeur: string): void {
  console.log(`     ${libelle.padEnd(56)} ${valeur}`);
}

const STAFF_MOYEN: ContexteSeance = {
  coach: 62, installations: 60, motivation: 70, condition: 85, charge: 15,
};

/** Fait tourner N semaines et rend l'état final. */
function saison(
  semaine: SemaineEntrainement,
  minutesParMatch: number,
  semaines: number,
  ctx: ContexteSeance = STAFF_MOYEN,
) {
  let etat = { ...ETAT_NEUF };
  const cumul: Record<string, number> = {};
  let risque = 0;
  for (let s = 0; s < semaines; s++) {
    const r = appliquerSemaine(etat, semaine, { ...ctx, charge: etat.charge }, 'avants', minutesParMatch);
    etat = r.etat;
    risque += r.risque;
    for (const [k, v] of Object.entries(r.gains)) cumul[k] = (cumul[k] ?? 0) + v;
  }
  return { etat, cumul, risque: Math.round(risque) };
}

// ---------------------------------------------------------------------------
console.log('\n=== 1. LE CATALOGUE ET LA SEMAINE PAR DÉFAUT ===');
// ---------------------------------------------------------------------------
info('séances au catalogue', `${SEANCES.length} (cible 15 à 25)`);
ligne('le catalogue reste lisible', `${SEANCES.length} séances`,
  SEANCES.length >= 15 && SEANCES.length <= 25);
const categories = new Set(SEANCES.map((s) => s.categorie));
ligne('les cinq familles sont couvertes', [...categories].join(', '), categories.size === 5);
// ⚠️ Une séance de mêlée ne doit rien apprendre à un ailier.
const cibleesAvants = SEANCES.filter((s) => s.concerne === 'avants').map((s) => s.id);
const cibleesArrieres = SEANCES.filter((s) => s.concerne === 'arrieres').map((s) => s.id);
ligne('des séances ne concernent qu\'une partie de l\'effectif',
  `${cibleesAvants.length} avants · ${cibleesArrieres.length} arrières`,
  cibleesAvants.length >= 4 && cibleesArrieres.length >= 3);

// ⚠️ LA SEMAINE PAR DÉFAUT DOIT ÊTRE JOUABLE TOUTE UNE SAISON. C'est la
// condition pour que le mode automatique existe : un réglage par défaut qui
// laisse l'équipe rincée au bout de dix journées rend la délégation piégeuse.
const defaut = saison(semaineParDefaut(), 60, 26);
console.log(`\n  26 semaines avec la semaine du staff, 60 min de match par week-end :`);
info('fatigue finale', `${defaut.etat.fatigue}/100`);
info('condition finale', `${defaut.etat.condition}/100`);
info('charge cumulée', `${defaut.etat.charge}/100 (${penalitesDeCharge(defaut.etat.charge).libelle})`);
ligne('la semaine par défaut ne détruit pas un titulaire',
  `fatigue ${defaut.etat.fatigue}, condition ${defaut.etat.condition}`,
  defaut.etat.fatigue <= 92 && defaut.etat.condition >= 70);

// ---------------------------------------------------------------------------
console.log('\n=== 2. ⚠️ L\'INTENSITÉ EST UN ARBITRAGE ===');
// ---------------------------------------------------------------------------
// « Plus tu pousses, plus tu progresses, mais plus tu augmentes fatigue et
// blessures. » Si pousser était gratuit, il n'y aurait qu'une seule stratégie.
console.log('\n  intensité   | gain relatif | fatigue finale | risque cumulé');
const parIntensite: { i: Intensite; gain: number; fatigue: number; risque: number }[] = [];
for (const i of [1, 2, 3, 4] as Intensite[]) {
  const s = semaineParDefaut();
  for (const j of JOURS) s[j] = s[j].map((c) => (c.intensite > 0 ? { ...c, intensite: i } : c)) as [typeof s['lundi'][0], typeof s['lundi'][1]];
  const r = saison(s, 60, 20);
  const gain = Object.values(r.cumul).reduce((a, b) => a + b, 0);
  parIntensite.push({ i, gain, fatigue: r.etat.fatigue, risque: r.risque });
  console.log(`  ${['', 'légère', 'normale', 'forte', 'très forte'][i].padEnd(11)} | `
    + `${gain.toFixed(1).padStart(12)} | ${String(r.etat.fatigue).padStart(14)} | ${r.risque}`);
}
const legere = parIntensite[0]; const forte = parIntensite[3];
ligne('pousser fait vraiment progresser plus',
  `${legere.gain.toFixed(1)} → ${forte.gain.toFixed(1)} points d'attributs`,
  forte.gain > legere.gain * 1.5);
ligne('… mais ça se paie en blessures',
  `risque ${legere.risque} → ${forte.risque}`, forte.risque > legere.risque * 2.5);
const normale = parIntensite[1];
ligne('⚠️ le gain est concave, la fatigue est convexe',
  `+${Math.round(100 * (forte.gain / normale.gain - 1))} % de gain pour `
  + `+${Math.round(100 * (forte.risque / normale.risque - 1))} % de risque`,
  (forte.gain / normale.gain) < (forte.risque / normale.risque));

// ---------------------------------------------------------------------------
console.log('\n=== 3. ⚠️ LA CHARGE CUMULÉE MORD ===');
// ---------------------------------------------------------------------------
// « La fatigue ne disparaît pas complètement chaque semaine […] et là tu dois
// faire tourner ton effectif. » Sans dette qui s'accumule, la rotation
// d'effectif serait purement décorative.
const titulaire = saison(semaineParDefaut(), 78, 26);
const remplaçant = saison(semaineParDefaut(), 22, 26);
console.log('\n  profil                    | charge | libellé   | vitesse | endurance | risque');
for (const [nom, r] of [['joue tout (78 min)', titulaire], ['fait tourner (22 min)', remplaçant]] as const) {
  const p = penalitesDeCharge(r.etat.charge);
  console.log(`  ${nom.padEnd(25)} | ${String(r.etat.charge).padStart(6)} | ${p.libelle.padEnd(9)} | `
    + `${String(p.vitesse).padStart(7)} | ${String(p.endurance).padStart(9)} | +${p.risque} %`);
}
ligne('un joueur qui joue tout finit dans le rouge',
  `charge ${titulaire.etat.charge} (${penalitesDeCharge(titulaire.etat.charge).libelle})`,
  titulaire.etat.charge >= 60);
ligne('… et faire tourner le protège vraiment',
  `${titulaire.etat.charge} contre ${remplaçant.etat.charge}`,
  remplaçant.etat.charge < titulaire.etat.charge - 15);
// ⚠️ « Progression entraînement −30 % » : un joueur cramé n'apprend plus rien.
const frais = efficacite({ ...STAFF_MOYEN, charge: 10 }, 2);
const crame = efficacite({ ...STAFF_MOYEN, charge: 92 }, 2);
ligne('⚠️ un joueur cramé ne progresse quasiment plus',
  `efficacité ${frais.toFixed(2)} → ${crame.toFixed(2)} (−${Math.round(100 * (1 - crame / frais))} %)`,
  crame < frais * 0.82);

// ---------------------------------------------------------------------------
console.log('\n=== 4. ⚠️ LA PRÉPARATION DE L\'ADVERSAIRE ===');
// ---------------------------------------------------------------------------
const rapport = rapportSur('Stade Toulousain', 1, 3, 78);
console.log(`\n  Rapport ${rapport.club} — fiabilité ${rapport.fiabilite} %`);
for (const [k, v] of Object.entries(rapport.notes)) info(`⭐ ${k}`, String(v));
info('⚠️ faiblesse détectée', rapport.faiblesse);
info('⚠️ point fort', rapport.force);
info('⚠️ tendance', `${rapport.tendance.part} % ${rapport.tendance.quoi}`);

// Une semaine CIBLÉE contre lui, contre une semaine générique, contre du matraquage.
const ciblee = semaineContre(semaineParDefaut(), rapport);
const generique = semaineParDefaut();
const matraquage = semaineParDefaut();
for (const j of ['mardi', 'mercredi', 'jeudi'] as const) {
  matraquage[j] = [{ seance: 'melee', intensite: 4 }, { seance: 'melee', intensite: 4 }];
}
console.log('');
const prepCiblee = preparerLeMatch(ciblee, rapport, 70, 60);
const prepGenerique = preparerLeMatch(generique, rapport, 70, 60);
const prepMatraquage = preparerLeMatch(matraquage, rapport, 70, 60);
for (const [nom, p] of [['ciblée sur le rapport', prepCiblee], ['générique', prepGenerique],
  ['matraquage (6 × mêlée à fond)', prepMatraquage]] as const) {
  console.log(`  ${nom.padEnd(32)} total +${p.total} % · `
    + p.bonus.slice(0, 3).map((b) => `${b.secteur} +${b.valeur}`).join(' · '));
}
ligne('⚠️ cibler le rapport bat une semaine générique',
  `+${prepCiblee.total} % contre +${prepGenerique.total} %`, prepCiblee.total > prepGenerique.total);
ligne('… et bat le matraquage d\'une seule séance',
  `+${prepCiblee.total} % contre +${prepMatraquage.total} %`, prepCiblee.total > prepMatraquage.total);
ligne('⚠️ le bonus est BORNÉ — il fait pencher, il ne renverse pas',
  `plafond ${BONUS_MAX_TOTAL} %, le meilleur relevé fait +${prepCiblee.total} %`,
  prepCiblee.total <= BONUS_MAX_TOTAL && prepMatraquage.total <= BONUS_MAX_TOTAL);

// ⚠️ LA MISE EN PLACE DU VENDREDI CONDITIONNE TOUT LE RESTE.
const sansMiseEnPlace: SemaineEntrainement = {
  ...ciblee, vendredi: [{ seance: 'repos', intensite: 0 }, { seance: 'repos', intensite: 0 }],
};
const prepSansPlan = preparerLeMatch(sansMiseEnPlace, rapport, 70, 60);
ligne('sans mise en place, la semaine ne se transmet pas',
  `+${prepSansPlan.total} % contre +${prepCiblee.total} %`, prepSansPlan.total < prepCiblee.total * 0.8);

// Le staff compte : un coach médiocre transmet mal.
const bonCoach = preparerLeMatch(ciblee, rapport, 92, 85).total;
const mauvaisCoach = preparerLeMatch(ciblee, rapport, 25, 30).total;
ligne('un bon staff transforme mieux la semaine en préparation',
  `+${bonCoach} % contre +${mauvaisCoach} %`, bonCoach > mauvaisCoach * 1.4);

// ---------------------------------------------------------------------------
console.log('\n=== 5. ⚠️ UN ANALYSTE MÉDIOCRE SE TROMPE ===');
// ---------------------------------------------------------------------------
// « Ton analyste te donne… » — s'il disait toujours vrai, le poste serait une
// décoration et le staff n'aurait aucune valeur.
let bonJuste = 0; let mauvaisJuste = 0; let n = 0;
const CLUBS = ['Stade Toulousain', 'US Oyonnax', 'SC Albi', 'RC Orléans', 'Union Bordeaux Bègles'];
for (const club of CLUBS) {
  for (let j = 1; j <= 12; j++) {
    n++;
    const vrai = rapportSur(club, 1, j, 100);
    const bon = rapportSur(club, 1, j, 88);
    const mauvais = rapportSur(club, 1, j, 18);
    if (bon.faiblesse === vrai.faiblesse) bonJuste++;
    if (mauvais.faiblesse === vrai.faiblesse) mauvaisJuste++;
  }
}
ligne('un bon analyste désigne souvent la vraie faiblesse',
  `${Math.round(100 * bonJuste / n)} % sur ${n} rapports`, bonJuste / n >= 0.45);
ligne('⚠️ un analyste médiocre se trompe vraiment',
  `${Math.round(100 * mauvaisJuste / n)} % seulement`, mauvaisJuste < bonJuste);
const stable = rapportSur('Stade Toulousain', 1, 3, 78);
ligne('un rapport ne se rejoue pas quand on rouvre l\'écran',
  stable.faiblesse === rapport.faiblesse ? 'déterministe' : 'DIVERGENCE',
  stable.faiblesse === rapport.faiblesse && stable.notes.melee === rapport.notes.melee);

// ---------------------------------------------------------------------------
console.log('\n=== 6. ⚠️ LES AUTOMATISMES, SECTEUR PAR SECTEUR ===');
// ---------------------------------------------------------------------------
// « Tu changes ton talonneur titulaire ? Cohésion touche 88 → 79. »
let auto = automatismesNeufs();
for (let s = 0; s < 30; s++) {
  auto = apresLaSemaine(auto, { melee: 2, touche: 2, ligneArriere: 2, defense: 2, attaque: 2 }, true);
}
const rode = { ...auto };
console.log(`\n  après 30 semaines ensemble : ${SECTEURS_COHESION.map((k) => `${k} ${Math.round(rode[k])}`).join(' · ')}`);
const apresTalonneur = apresChangements(rode, ['talonneur'], ['talonneur']);
console.log(`  on change le talonneur     : ${SECTEURS_COHESION.map((k) => `${k} ${Math.round(apresTalonneur[k])}`).join(' · ')}`);
ligne('⚠️ changer le talonneur coûte cher en touche',
  `${Math.round(rode.touche)} → ${Math.round(apresTalonneur.touche)}`,
  apresTalonneur.touche <= rode.touche - 5);
ligne('… et ne touche pas la ligne arrière',
  `${Math.round(rode.ligneArriere)} → ${Math.round(apresTalonneur.ligneArriere)}`,
  apresTalonneur.ligneArriere === rode.ligneArriere);

// ⚠️ LA REMONTÉE EST PLUS LENTE QUE LA CHUTE : sans ça, le mercato est indolore.
let repare = { ...apresTalonneur };
const courbe: number[] = [Math.round(repare.touche)];
for (let s = 0; s < 5; s++) {
  repare = apresLaSemaine(repare, { touche: 2 }, true);
  courbe.push(Math.round(repare.touche));
}
info('la touche se recolle', courbe.join(' → '));
const chute = rode.touche - apresTalonneur.touche;
const regagne = repare.touche - apresTalonneur.touche;
ligne('⚠️ on recolle plus lentement qu\'on ne casse',
  `−${Math.round(chute)} d'un coup, +${Math.round(regagne)} en 5 semaines`,
  regagne < chute * 1.2);

// Un mercato entier ne doit pas rendre l'équipe injouable.
const grandMenage = apresChangements(rode,
  ['talonneur', 'pilier_gauche', 'deuxieme_ligne_g', 'demi_melee', 'premier_centre'],
  ['talonneur', 'pilier_droit', 'deuxieme_ligne_d', 'demi_melee', 'deuxieme_centre']);
ligne('un gros mercato ne met jamais la cohésion à zéro',
  `globale ${cohesionGlobale(grandMenage)} (plancher ${PLANCHER_COHESION})`,
  cohesionGlobale(grandMenage) >= PLANCHER_COHESION);
// ⚠️ L'effet sur le jeu doit se sentir SANS réécrire la hiérarchie.
const effetRode = effetSurLeJeu(rode);
const effetNeuf = effetSurLeJeu(automatismesNeufs());
ligne('l\'écart d\'automatismes reste modeste sur le terrain',
  `×${effetNeuf.toFixed(3)} contre ×${effetRode.toFixed(3)}`,
  effetRode - effetNeuf > 0.02 && effetRode - effetNeuf < 0.12);

const duo = connexion(40, 'demi_melee', 'demi_ouverture', rode);
const neuf = connexion(1, 'demi_melee', 'demi_ouverture', rode);
ligne('la charnière rodée se lit dans la connexion',
  `${duo} contre ${neuf} pour un nouveau 9`, duo > neuf + 20);

// ---------------------------------------------------------------------------
console.log('\n=== 7. LA DÉLÉGATION — « sans micro-management chiant » ===');
// ---------------------------------------------------------------------------
const PROFILS: [string, PrioritesEntrainement][] = [
  ['tout conquête', { physique: 0, technique: 1, attaque: 0, defense: 1, conquete: 3 }],
  ['tout attaque', { physique: 1, technique: 1, attaque: 3, defense: 0, conquete: 0 }],
  ['équilibré', { physique: 2, technique: 2, attaque: 2, defense: 2, conquete: 2 }],
];
console.log('');
let toutesJouables = true;
for (const [nom, p] of PROFILS) {
  const s = composerSemaine(p, `test#${nom}`);
  const seances: TypeSeance[] = [];
  for (const j of JOURS) for (const c of s[j]) if (c.intensite > 0) seances.push(c.seance);
  const r = saison(s, 60, 20);
  console.log(`  ${nom.padEnd(14)} ${seances.map((x) => seance(x).emoji).join('')} `
    + `· fatigue ${r.etat.fatigue} · charge ${r.etat.charge}`);
  if (r.etat.fatigue > 95 || r.etat.condition < 60) toutesJouables = false;
}
ligne('le staff compose des semaines tenables',
  '3 profils sur 3', toutesJouables);
// ⚠️ Les deux bouts de semaine ne sont pas négociables : sinon le mode
// automatique arrive au match avec une équipe rincée.
const auto1 = composerSemaine(PROFILS[0][1], 'a');
ligne('lundi reste de la récupération et samedi reste vide',
  `${auto1.lundi[0].seance} · ${auto1.samedi[0].seance}`,
  auto1.lundi[0].seance === 'recuperation' && auto1.samedi[0].seance === 'repos');
ligne('… et le vendredi reste la mise en place',
  auto1.vendredi[0].seance, auto1.vendredi[0].seance === 'mise_en_place');
const a = composerSemaine(PROFILS[0][1], 'x');
const b = composerSemaine(PROFILS[1][1], 'x');
ligne('deux priorités différentes donnent deux semaines différentes',
  JSON.stringify(a.mardi) === JSON.stringify(b.mardi) ? 'IDENTIQUES' : 'distinctes',
  JSON.stringify(a.mardi) !== JSON.stringify(b.mardi));

// ---------------------------------------------------------------------------
console.log('\n=== 8. LES PROGRAMMES INDIVIDUELS ===');
// ---------------------------------------------------------------------------
const prog = apportProgramme('plaquage', 3, STAFF_MOYEN);
info('un programme « plaquage » à intensité forte',
  `+${prog.gain}/semaine sur ${prog.attribut} · fatigue +${prog.fatigue.toFixed(1)}`);
ligne('un programme individuel rapporte vraiment',
  `+${(prog.gain * 30).toFixed(1)} sur une saison`, prog.gain * 30 >= 5);
// ⚠️ « Pendant cette période il progresse moins dans ses autres attributs. »
ligne('⚠️ … et il freine le reste du travail',
  `×${prog.freinLeReste.toFixed(2)} sur les autres gains`, prog.freinLeReste < 1);
ligne('« aucun » ne coûte et ne rapporte rien',
  `gain ${apportProgramme('aucun', 3, STAFF_MOYEN).gain}`,
  apportProgramme('aucun', 3, STAFF_MOYEN).gain === 0);

// Apprendre un nouveau poste : « après plusieurs mois ».
let maitrise = 40; let semainesPoste = 0;
while (maitrise < 80 && semainesPoste < 60) {
  maitrise = progresserAuNouveauPoste(maitrise, 3, STAFF_MOYEN);
  semainesPoste++;
}
info('passer de 2 à 4 étoiles à un nouveau poste', `${semainesPoste} semaines`);
ligne('⚠️ apprendre un poste prend des MOIS, pas des semaines',
  `${semainesPoste} semaines · ${etoilesDePoste(40)} ★ → ${etoilesDePoste(maitrise)} ★`,
  semainesPoste >= 12 && semainesPoste <= 45);

console.log(
  echecs === 0
    ? '\n✅ La semaine se joue, l\'adversaire se prépare, et le mercato se paie.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
