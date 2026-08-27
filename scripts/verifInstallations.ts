// VÉRIFICATION — LES INSTALLATIONS DU CLUB
//
// Demande : « fais qu'on puisse avoir un centre de formation avec des
// améliorations etc. et des recruteurs pour trouver les pépites ; il peut aussi
// y avoir des gros potentiels dans les petites ligues ; et fais le centre
// d'entraînement aussi pour faire des entraînements perso ».
//
// Ce que ce script contrôle :
//   1. la troisième enveloppe est cohérente avec les deux autres ;
//   2. ⚠️ le PRIX d'une marche et le REVENU d'une saison partent de la MÊME
//      enveloppe — c'est le contrôle qui manquait, et son absence a rendu tout
//      le lot injouable sous la Nationale lors d'une refonte du budget ;
//   3. le centre de formation achète une LOI DE TIRAGE, pas des joueurs ;
//   4. le programme individuel ne dépasse jamais le potentiel, et ne réécrit
//      pas les saisons déjà jouées ;
//   5. les recruteurs vont voir plus bas, trient par marge, et se trompent
//      d'autant moins qu'on les paie ;
//   6. la boucle entière par le store : payer, jouer une saison, récolter.
//
// Lancer : npx vite-node scripts/verifInstallations.ts

import { COMPETITIONS, NOTE_PAR_NIVEAU } from '../src/data/clubs';
import { effectifDuClub, forceEffectif, PART_PEPITE, setApportsDuCentre } from '../src/lib/effectif';
import { budgetsDuClub } from '../src/lib/recrutementManager';
import {
  CLUBS_OBSERVES, INCERTITUDE_RECRUTEURS, NIVEAU_INSTALLATION_MAX, PLACES_ENTRAINEMENT,
  coutAmelioration, gainEntrainement, installationsVierges,
} from '../src/lib/installations';
import { promotionDuCentre } from '../src/lib/formation';
import { tableauDetectionManager } from '../src/lib/formationManager';
import { explorer, fenetreDeProspection } from '../src/lib/recruteurs';
import { SEMAINES_PAR_SAISON } from '../src/data/calendrier';
import { matchDuClubSemaine } from '../src/lib/matchLive';
import { useGame } from '../src/store/useGame';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';

chargerTextes(TEXTES);

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(54)} ${valeur}`);
}
function info(libelle: string, valeur: string): void {
  console.log(`     ${libelle.padEnd(54)} ${valeur}`);
}

// ---------------------------------------------------------------------------
console.log('\n=== 1. LA TROISIÈME ENVELOPPE ===');
// ---------------------------------------------------------------------------
const TEMOINS: [string, string][] = [
  ['Stade Toulousain', 'Top 14'],
  ['US Oyonnax', 'Pro D2'],
  ['RC Orléans', 'Nationale 2'],
];
console.log('\n  club                     | transferts | salarial | structure');
for (const [club, label] of TEMOINS) {
  const b = budgetsDuClub(club, 1);
  console.log(
    `  ${label.padEnd(24)} | ${b.transferts.toString().padStart(10)} | `
    + `${b.salarial.toString().padStart(8)} | ${b.structure.toString().padStart(9)}`,
  );
}
// ⚠️ ELLE DOIT RESTER LA PLUS PETITE DES TROIS. Une enveloppe structure qui
// dépasserait le budget salarial ferait des murs le premier poste de dépense
// d'un club de rugby, ce qui n'a de sens nulle part.
const troisOk = TEMOINS.every(([club]) => {
  const b = budgetsDuClub(club, 1);
  return b.structure < b.salarial && b.structure > 0;
});
ligne('la structure reste sous la masse salariale', troisOk ? 'aux trois étages' : 'non', troisOk);

// Le plancher amateur : un club de village a de quoi construire, un jour.
// ⚠️ ON NE CONTRÔLE PLUS UN MONTANT. L'ancienne version exigeait « entre 40 000
// et 60 000 € » : un seuil en euros ne survit pas à une refonte du budget, et
// c'est précisément ce qui s'est passé — il est resté au vert pendant que le
// lot devenait injouable. Ce qui compte, c'est l'EFFORT que ça représente, et
// c'est la section 2 qui le mesure.
const r3 = budgetsDuClub('Parentis', 1).structure;
ligne('un club de Régionale 3 a une enveloppe', `${r3} €`, r3 > 0);

// ---------------------------------------------------------------------------
console.log('\n=== 2. ⚠️ LE PRIX ET LE REVENU PARTENT DE LA MÊME ENVELOPPE ===');
// ---------------------------------------------------------------------------
// ⚠️ C'EST LE CONTRÔLE QUI MANQUAIT, ET SON ABSENCE A COÛTÉ TOUT LE LOT.
// `installations.ts` calculait l'enveloppe avec sa PROPRE formule — une copie
// de `facteurNiveau` — pendant que la fin de saison la versait depuis
// `budgetsDuClub`. Le jour où le budget des clubs est passé aux fourchettes
// réelles, le REVENU a suivi et le PRIX est resté sur l'ancienne courbe :
// mesuré, un centre complet demandait 121 saisons de revenus en Fédérale 2
// contre les 10 prévues. Tout le lot était mort sous la Nationale, et le banc
// d'essai restait au vert parce qu'il ne contrôlait qu'un montant en euros.
//
// La copie a disparu (`budgetStructure` délègue à `financesDuClub`), mais on
// ne se contente pas de la supprimer : le prix d'une marche est écrit en
// SAISONS d'enveloppe (`COUT_PAR_NIVEAU`), donc on mesure ce que ça coûte
// VRAIMENT à chaque étage. C'est la seule forme de contrôle qui survive à la
// prochaine refonte du budget.
console.log('\n  étage        | enveloppe/saison | centre complet | en saisons');
const PYRAMIDE: [string, string][] = [
  ['Stade Toulousain', 'Top 14'], ['US Oyonnax', 'Pro D2'], ['SC Albi', 'Nationale'],
  ['RC Orléans', 'Nationale 2'], ['U S Nafarroa', 'Fédérale 1'], ['R C Sablais', 'Fédérale 2'],
  ['R C Teillois', 'Fédérale 3'], ['Orsay', 'Régionale 1'], ['Chartreuse', 'Régionale 2'],
  ['Parentis', 'Régionale 3'],
];
const courbes = PYRAMIDE.map(([club, nom]) => {
  const env = budgetsDuClub(club, 1).structure;
  let cumul = 0;
  for (let n = 0; n < NIVEAU_INSTALLATION_MAX; n++) cumul += coutAmelioration(n, env)!;
  const enSaisons = cumul / env;
  console.log(
    `  ${nom.padEnd(12)} | ${env.toLocaleString('fr-FR').padStart(16)} | `
    + `${cumul.toLocaleString('fr-FR').padStart(14)} | ${enSaisons.toFixed(1)}`,
  );
  return { nom, enSaisons };
});
const hors = courbes.filter((c) => c.enSaisons < 8 || c.enSaisons > 13);
ligne('un centre complet coûte le même effort partout',
  hors.length ? hors.map((c) => `${c.nom} ${c.enSaisons.toFixed(1)}`).join(', ')
    : `8 à 13 saisons aux ${courbes.length} étages`,
  hors.length === 0);
// ⚠️ ET AUCUN ÉTAGE N'EST LAISSÉ POUR COMPTE. C'était la forme exacte du bug :
// jouable en Top 14, hors de portée en Fédérale, sans un avertissement.
const ecartEtages = Math.max(...courbes.map((c) => c.enSaisons))
  - Math.min(...courbes.map((c) => c.enSaisons));
ligne('… et l’écart entre le haut et le bas reste faible',
  `${ecartEtages.toFixed(1)} saison(s)`, ecartEtages <= 2);

// ---------------------------------------------------------------------------
console.log('\n=== 3. LE COÛT D’UN CENTRE COMPLET ===');
// ---------------------------------------------------------------------------
const enveloppe = budgetsDuClub('RC Orléans', 1).structure;
let total = 0;
const marches: string[] = [];
for (let n = 0; n < NIVEAU_INSTALLATION_MAX; n++) {
  const c = coutAmelioration(n, enveloppe)!;
  total += c;
  marches.push(String(c));
}
info('les quatre marches', marches.join(' → '));
const saisons = total / enveloppe;
ligne('un centre complet coûte une carrière de patience',
  `${saisons.toFixed(1)} saisons d’enveloppe`, saisons >= 8 && saisons <= 12);
ligne('… et la dernière marche est atteignable',
  'l’enveloppe se banque intégralement (store)', coutAmelioration(3, enveloppe)! / enveloppe < 5);
ligne('au maximum, il n’y a plus rien à payer',
  String(coutAmelioration(NIVEAU_INSTALLATION_MAX, enveloppe)),
  coutAmelioration(NIVEAU_INSTALLATION_MAX, enveloppe) === null);

// ---------------------------------------------------------------------------
console.log('\n=== 4. 🎓 LE CENTRE ACHÈTE UNE LOI DE TIRAGE ===');
// ---------------------------------------------------------------------------
// ⚠️ C'EST LE SEUL CONTRÔLE QUI JUSTIFIE DE PAYER. Un centre qui sortirait des
// bouche-trous un peu plus souvent ne changerait rien à une carrière : ce qu'on
// achète, c'est la CHANCE qu'un jeune du cru soit une vraie pépite — contre
// 1,2 % dans le monde (`PART_PEPITE`).
const CLUB_ESSAI = 'RC Orléans';
const groupe = effectifDuClub(CLUB_ESSAI, 1);
const niveauClub = 4;
// ⚠️ LA BARRE EST À 22, PAS À 14 comme pour le monde (`verifPepites.ts`), et
// c'est une leçon de mesure. Un sortant de centre a structurellement plus de
// marge qu'un jeune ordinaire — il a 18 ans et il vient d'être formé. À 14, la
// première version relevait « 81 % de pépites » au niveau 4 : elle ne mesurait
// pas la rareté, elle comptait les diplômés.
const MARGE_PEPITE_CENTRE = 22;
console.log('\n  niveau | jeunes sortis | pépites (marge ≥ 22) | part | meilleur potentiel');
const parts: number[] = [];
for (let n = 1; n <= NIVEAU_INSTALLATION_MAX; n++) {
  let sortis = 0; let pepites = 0; let max = 0;
  for (let s = 0; s < 400; s++) {
    for (const j of promotionDuCentre(CLUB_ESSAI, 2, n, groupe)) {
      sortis++;
      if (j.potentiel - j.note >= MARGE_PEPITE_CENTRE) pepites++;
      max = Math.max(max, j.potentiel);
    }
  }
  const part = pepites / Math.max(1, sortis);
  parts.push(part);
  console.log(
    `    n${n}   | ${String(sortis).padStart(13)} | ${String(pepites).padStart(20)} | `
    + `${(part * 100).toFixed(1).padStart(4)} % | ${max}`,
  );
}
ligne('un centre de niveau 4 sort bien plus de pépites que le monde',
  `${(parts[3] * 100).toFixed(1)} % contre ${(PART_PEPITE * 100).toFixed(1)} %`,
  parts[3] > PART_PEPITE * 8);
ligne('… et la courbe monte avec le niveau',
  parts.map((p) => `${(p * 100).toFixed(0)}%`).join(' → '),
  parts[3] > parts[0]);
// ⚠️ ET IL RESTE BORNÉ PAR SON ÉTAGE : un centre de Fédérale 2 ne doit pas
// sortir un joueur meilleur que n'importe qui en Top 14.
const plafondAttendu = (NOTE_PAR_NIVEAU[6] ?? 47) + 32;
let deborde = 0;
for (let s = 0; s < 300; s++) {
  for (const j of promotionDuCentre('R C Sablais', 1, 4, effectifDuClub('R C Sablais', 1))) {
    if (j.potentiel > plafondAttendu) deborde++;
  }
}
ligne('un centre de Fédérale 2 reste borné par son étage',
  `${deborde} dépassement(s) au-dessus de ${plafondAttendu}`, deborde === 0);

// Un sortant de centre n'est PAS prêt : il entre sous le groupe.
// ⚠️ ON COMPARE À LA FORCE DE LA MÊME SAISON, et le premier jet ne le faisait
// pas : il tirait 200 promotions sur 200 saisons différentes et les comparait
// toutes à la force de la saison 1. Un club vieillit et traverse des
// générations dorées — 60 « échecs » sur 492 étaient de la mesure, pas du jeu.
const force = forceEffectif(CLUB_ESSAI, 1);
let sousLeGroupe = 0; let echantillon = 0;
for (let s = 0; s < 200; s++) {
  for (const j of promotionDuCentre(CLUB_ESSAI, 1, 3, groupe)) {
    echantillon++;
    if (j.note < force) sousLeGroupe++;
  }
}
ligne('un sortant de centre entre SOUS le groupe',
  `${sousLeGroupe}/${echantillon} (groupe à ${force.toFixed(1)})`,
  sousLeGroupe === echantillon);

// ---------------------------------------------------------------------------
console.log('\n=== 5. 🏋️ LE PROGRAMME NE DÉPASSE JAMAIS LE POTENTIEL ===');
// ---------------------------------------------------------------------------
ligne('un joueur arrivé à son plafond ne gagne rien',
  String(gainEntrainement(4, 21, 0)), gainEntrainement(4, 21, 0) === 0);
ligne('le gain est borné par la marge qui reste',
  String(gainEntrainement(4, 21, 0.5)), gainEntrainement(4, 21, 0.5) === 0.5);
ligne('un jeune profite plus qu’un vétéran',
  `${gainEntrainement(3, 21, 20)} contre ${gainEntrainement(3, 32, 20)}`,
  gainEntrainement(3, 21, 20) > gainEntrainement(3, 32, 20));
ligne('sans centre, aucun gain', String(gainEntrainement(0, 21, 20)), gainEntrainement(0, 21, 20) === 0);
info('places par niveau', PLACES_ENTRAINEMENT.join(' · '));

// ⚠️ LES INCRÉMENTS SONT DATÉS. Un simple cumul s'appliquerait aussi aux
// saisons DÉJÀ JOUÉES : rouvrir un classement de la saison 3 en saison 9
// montrerait le joueur avec six ans d'entraînement qu'il n'avait pas faits.
const cobaye = effectifDuClub(CLUB_ESSAI, 3).find((j) => j.potentiel - j.note >= 4)!;
const noteAvant3 = cobaye.note;
const noteAvant6 = effectifDuClub(CLUB_ESSAI, 6).find((j) => j.nom === cobaye.nom)?.note ?? 0;
setApportsDuCentre([], { [`${CLUB_ESSAI}|${cobaye.nom}`]: [{ depuis: 5, gain: 3 }] });
const noteApres3 = effectifDuClub(CLUB_ESSAI, 3).find((j) => j.nom === cobaye.nom)?.note ?? 0;
const noteApres6 = effectifDuClub(CLUB_ESSAI, 6).find((j) => j.nom === cobaye.nom)?.note ?? 0;
ligne('la saison 3 ne bouge pas (gain acquis en saison 5)',
  `${noteAvant3} → ${noteApres3}`, noteAvant3 === noteApres3);
ligne('la saison 6, elle, en profite',
  `${noteAvant6} → ${noteApres6}`, noteApres6 > noteAvant6);
setApportsDuCentre([], {});

// ---------------------------------------------------------------------------
console.log('\n=== 6. 🔎 LES RECRUTEURS ===');
// ---------------------------------------------------------------------------
// La demande, littéralement : « il peut aussi y avoir des gros potentiels dans
// les petites ligues ». Un service qui ne regarderait qu'à son étage ne
// trouverait jamais rien que le Marché ne montre déjà.
console.log('\n  niveau | fenêtre | fiches | étages visités | marge moyenne | ± annoncé');
let toujoursTriees = true;
let regardeEnBas = false;
for (let n = 1; n <= NIVEAU_INSTALLATION_MAX; n++) {
  const r = explorer(CLUB_ESSAI, 2, n);
  const [bas, haut] = fenetreDeProspection(niveauClub, n);
  const etages = new Set(r.map((x) => x.niveau));
  const marges = r.map((x) => x.potentiel - x.note);
  const moy = marges.reduce((s, m) => s + m, 0) / Math.max(1, marges.length);
  for (let i = 1; i < marges.length; i++) if (marges[i] > marges[i - 1]) toujoursTriees = false;
  if ([...etages].some((e) => e > niveauClub)) regardeEnBas = true;
  console.log(
    `    n${n}   | ${bas}-${haut}    | ${String(r.length).padStart(6)} | `
    + `${[...etages].sort((a, b) => a - b).map((e) => 'n' + e).join(',').padEnd(14)} | `
    + `${moy.toFixed(1).padStart(13)} | ${INCERTITUDE_RECRUTEURS[n]}`,
  );
}
ligne('les fiches sont triées par marge, pas par note', 'de la plus grosse à la plus petite', toujoursTriees);
ligne('⚠️ le service va chercher DANS LES PETITES LIGUES', 'des étages sous le sien', regardeEnBas);
ligne('la portée s’élargit avec le niveau',
  `${fenetreDeProspection(niveauClub, 1)[1]} → ${fenetreDeProspection(niveauClub, 4)[1]}`,
  fenetreDeProspection(niveauClub, 4)[1] > fenetreDeProspection(niveauClub, 1)[1]);
ligne('la précision s’améliore jusqu’à l’exactitude',
  INCERTITUDE_RECRUTEURS.slice(1).map((i) => '±' + i).join(' → '),
  INCERTITUDE_RECRUTEURS[4] === 0 && INCERTITUDE_RECRUTEURS[1] > 0);
ligne('sans cellule, aucun rapport', `${explorer(CLUB_ESSAI, 2, 0).length} fiche(s)`,
  explorer(CLUB_ESSAI, 2, 0).length === 0);
info('clubs observés par niveau', CLUBS_OBSERVES.slice(1).join(' · '));

// ⚠️ ET LE SERVICE SE TROMPE TANT QU'ON NE LE PAIE PAS. C'est ce qui rend le
// niveau 4 désirable : on cesse de parier.
const bas1 = explorer(CLUB_ESSAI, 2, 1);
const vraisPotentiels = new Map<string, number>();
for (const r of bas1) {
  const vrai = effectifDuClub(r.club, r.saison).find((j) => j.nom === r.nom);
  if (vrai) vraisPotentiels.set(r.id, vrai.potentiel);
}
const erreurs = bas1.filter((r) => (vraisPotentiels.get(r.id) ?? r.potentiel) !== r.potentiel).length;
ligne('un service de niveau 1 se trompe vraiment',
  `${erreurs}/${bas1.length} fiches inexactes`, erreurs > 0);
const haut4 = explorer(CLUB_ESSAI, 2, 4);
const exactes = haut4.every((r) => {
  const vrai = effectifDuClub(r.club, r.saison).find((j) => j.nom === r.nom);
  return !vrai || vrai.potentiel === r.potentiel;
});
ligne('… un service de niveau 4 ne se trompe plus',
  `${haut4.length} fiches exactes`, exactes && haut4.length > 0);

// ---------------------------------------------------------------------------
console.log('\n=== 7. LA BOUCLE ENTIÈRE, PAR LE STORE ===');
// ---------------------------------------------------------------------------
useGame.setState({ manager: null, joueur: null });
useGame.getState().creerManager({
  nom: 'Bâtisseur', nation: 'France', club: 'RC Orléans', age: 40, libre: true,
});
const m0 = useGame.getState().manager!;
ligne('un club se prend sans le moindre mur',
  JSON.stringify(m0.installations), Object.keys(m0.installations).length === 0);
ligne('… mais avec une enveloppe structure', `${m0.budgetStructure} €`, m0.budgetStructure > 0);

// On paie les trois structures d'un coup (le budget est forcé : ce qu'on teste
// ici, c'est la mécanique, pas la patience).
useGame.setState((st) => ({ manager: st.manager && { ...st.manager, budgetStructure: 90_000_000 } }));
for (const type of ['formation', 'entrainement', 'recrutement'] as const) {
  for (let n = 0; n < NIVEAU_INSTALLATION_MAX; n++) useGame.getState().ameliorerInstallation(type);
}
const m1 = useGame.getState().manager!;
const murs = m1.installations[m1.club] ?? installationsVierges();
ligne('les trois structures montent au maximum',
  `formation ${murs.formation} · entraînement ${murs.entrainement} · recrutement ${murs.recrutement}`,
  murs.formation === 4 && murs.entrainement === 4 && murs.recrutement === 4);
ligne('… et l’enveloppe a été débitée',
  `${m1.budgetStructure} €`, m1.budgetStructure < 90_000_000);
useGame.getState().ameliorerInstallation('formation');
ligne('on ne dépasse pas le niveau maximum',
  String(useGame.getState().manager!.installations[m1.club].formation),
  useGame.getState().manager!.installations[m1.club].formation === 4);

// Un joueur au programme individuel.
const groupeStore = effectifDuClub(m1.club, m1.saison);
const espoir = [...groupeStore].sort((a, b) => (b.potentiel - b.note) - (a.potentiel - a.note))[0];
useGame.getState().basculerEntrainement(espoir.nom);
ligne('un joueur entre au programme individuel',
  espoir.nom, useGame.getState().manager!.entrainements.includes(espoir.nom));

// La nouvelle filière ne déverse plus une promotion magique dans les seniors :
// on repère, on propose un projet, puis on forme avant d'intégrer.
const detection = tableauDetectionManager(useGame.getState().manager!);
for (const fiche of detection.fiches.filter((f) => f.jeune.age >= 17)) {
  useGame.getState().proposerProjetJeuneManager(fiche.jeune.id);
  if (useGame.getState().manager!.academie.length) break;
}
const signe = useGame.getState().manager!.academie[0];
ligne('🎓 un jeune choisit réellement le centre',
  signe ? `${signe.nom} · ${signe.age} ans` : 'aucune signature', !!signe);

// Une saison entière, semaine par semaine.
for (let i = 0; i < SEMAINES_PAR_SAISON + 1; i++) {
  const courant = useGame.getState().manager;
  if (courant?.decision) {
    useGame.getState().repondreDecisionManager(courant.decision.id, courant.decision.choix[0].id);
  }
  const prepare = useGame.getState().manager!;
  const affiche = matchDuClubSemaine(prepare);
  if (affiche && !prepare.resultats[affiche.cle]) {
    const domicile = affiche.match.domicile === prepare.club;
    useGame.getState().enregistrerResultatManager({
      cle: affiche.cle, club: prepare.club, saison: prepare.saison,
      semaine: prepare.semaine, journee: affiche.journee, domicile,
      adversaire: domicile ? affiche.match.exterieur : affiche.match.domicile,
      scorePour: domicile ? affiche.match.scoreD : affiche.match.scoreE,
      scoreContre: domicile ? affiche.match.scoreE : affiche.match.scoreD,
      essaisPour: domicile ? affiche.match.essaisD : affiche.match.essaisE,
      essaisContre: domicile ? affiche.match.essaisE : affiche.match.essaisD,
    });
  }
  useGame.getState().semaineManager();
}

const m2 = useGame.getState().manager!;
ligne('la saison s’est bien close', `saison ${m2.saison}`, m2.saison === 2);
const forme = signe ? m2.academie.find((j) => j.id === signe.id) : undefined;
ligne('🎓 le jeune a vieilli et reçu un bilan expliqué',
  forme ? `${signe.age} → ${forme.age} ans · note ${signe.note} → ${forme.note}` : 'absent',
  !!forme && forme.age === signe.age + 1 && !!forme.derniereProgression);
ligne('🏋️ le programme a rapporté quelque chose',
  `${Object.keys(m2.progres).length} joueur(s) crédité(s)`, Object.keys(m2.progres).length > 0);
ligne('🔎 les recruteurs ont rendu leur rapport',
  `${m2.rapports.length} fiche(s)`, m2.rapports.length > 0);
ligne('l’enveloppe s’est renouvelée', `${m2.budgetStructure} €`, m2.budgetStructure > 0);

if (forme) useGame.getState().gererAcademicienManager(forme.id, 'senior');
const m2Integre = useGame.getState().manager!;
const jeuneSenior = forme
  ? effectifDuClub(m2Integre.club, m2Integre.saison)
    .find((j) => j.id === `${forme.clubCentre}-academie-${forme.id}`)
  : undefined;
ligne('… puis la décision « intégrer seniors » l’ajoute vraiment au groupe',
  jeuneSenior ? `${jeuneSenior.nom} · ${jeuneSenior.note}` : 'absent', !!jeuneSenior?.duCentre);

// ⚠️ LES MURS APPARTIENNENT AU CLUB. On change de banc : on ne les emporte pas.
const autre = COMPETITIONS.find((c) => c.id === 'fed2')!.clubs[0].nom;
useGame.getState().signerBanc(autre);
const m3 = useGame.getState().manager!;
ligne('⚠️ on n’emporte pas le centre de formation ailleurs',
  `${autre} : niveau ${m3.installations[autre]?.formation ?? 0}`,
  (m3.installations[autre]?.formation ?? 0) === 0);
ligne('… mais l’ancien club garde le sien',
  `RC Orléans : niveau ${m3.installations['RC Orléans']?.formation ?? 0}`,
  m3.installations['RC Orléans']?.formation === 4);

console.log(
  echecs === 0
    ? '\n✅ Les trois structures existent, coûtent, produisent — et restent au club.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
