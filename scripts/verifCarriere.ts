// ═══════════════════════════════════════════════════════════════════════════
// LA CARRIÈRE EN LIGNE — banc de mesure
// ═══════════════════════════════════════════════════════════════════════════
// Tout ce qui est vérifié ici tourne AUSSI dans la fonction serverless
// `api/carriere.ts` : c'est donc la seule façon de mesurer le mode sans base de
// données ni navigateur.
//
//   npm run verify:carriere
//
// Ce qu'il regarde, dans l'ordre :
//   1. la création d'une ligue et la dotation de départ (30 Bronze, ~35 GEN)
//   2. LES SCORES — la question n°1 de la demande : « surtout pas 200-150 »
//   3. le déterminisme de la rejoue et les décisions en direct
//   4. l'absence : une fenêtre fermée joue le match toute seule
//   5. les packs : pyramide, unicité par ligue, filtres
//   6. l'économie d'une saison complète, et l'écart premier / dernier
//   7. le marché, les échanges, les enchères
//   8. ce que le serveur REFUSE (le client ne déclare jamais un état)
//   9. les coupes maison du commissaire
//  10. la phase finale, et l’identité de la ligue (logo, trophée)

import {
  agirCarriere, avancerCarriere, classementCarriere, creerCarriere, vueCarriere, DOTATION_MAX,
  PACKS_GRATUITS_PAR_JOUR, poidsPackQuotidien, } from '../src/lib/ligue/carriere';
import type { EtatCarriereEnLigne, RareteCarriere } from '../src/lib/ligue/typesCarriere';
import { LOT_VENTE_RAPIDE_MAX, valeurVenteRapide, plafondVenteRapide } from '../src/lib/ligue/venteRapideCarriere';
import {
  avancerMatchEnLigne, cibleDeScore, commanderMatchEnLigne, conclureMatchEnLigne,
  creerMatchEnLigne, decisionIA, feuilleGeleeEnLigne, forceFeuille, METRES_DECISION, MS_PAR_MINUTE,
  STRATEGIE_EN_LIGNE_DEFAUT, strategieValide, impactStrategie, tactiqueDepuisStrategie,
  mentaliteAppliquee, vueMatchEnLigne,
} from '../src/lib/ligue/matchCarriere';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { graine as graineMoteur } from '../src/lib/ligue/aleatoire';
import {
  catalogueMondialCarriere, carteDepuisSource, catalogueParRarete, coequipierDepuisCarte,
  competitionsCarriere, dotationBronzeCarriere, emblemesCarriere, emblemeValide, PACKS_CARRIERE,
  RARETES_CARRIERE, rareteCarriere, rayonDePack, tropheesCarriere,
} from '../src/lib/ligue/catalogueCarriere';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { collectifCarriere, bonusCollectif } from '../src/lib/ligue/collectifCarriere';
import { echeanceLigue, prochainJour } from '../src/lib/ligue/echeanceCarriere';
import { codeDansLaRecherche, lienInvitation } from '../src/lib/invitationLigue';
const nomPosteCourt = (f: string) => f.replace('demi_melee', '9').replace('demi_ouverture', '10');

let ko = 0;
const dire = (ok: boolean, quoi: string, detail = '') => {
  if (!ok) ko++;
  console.log(`  ${ok ? '✅' : '❌'} ${quoi.padEnd(60)} ${detail}`);
};
const titre = (n: string) => console.log(`\n  ${n}\n  ${'─'.repeat(80)}`);
const nb = (n: number) => Math.round(n).toLocaleString('fr-FR');
const T0 = Date.parse('2026-09-07T10:00:00.000Z');
const JOUR = 24 * 3600_000;

/** Une ligue prête à jouer : n clubs inscrits, saison lancée. */
function ligue(clubs: number, depart = T0): EtatCarriereEnLigne {
  let e = creerCarriere({
    id: `ligue-${clubs}`, nom: 'La Ligue du dimanche', code: 'DR-TEST',
    compteId: 'compte-1', pseudo: 'Colin', clubNom: 'Colin RFC', rythme: 1, maxClubs: 20,
  }, depart, 'graine-de-test');
  for (let i = 2; i <= clubs; i++) {
    e = agirCarriere(e, `compte-${i}`, { type: 'rejoindre', pseudo: `Ami ${i}`, clubNom: `Club ${i}` }, depart, `graine-${i}`);
  }
  return agirCarriere(e, 'compte-1', { type: 'demarrerSaison' }, depart, 'graine-saison');
}

// ═══════════════════════════════════════════════════════════════════════════
titre('1. LA LIGUE, ET LES 30 BRONZE DU DÉPART');
// ═══════════════════════════════════════════════════════════════════════════
{
  const e = ligue(6);
  dire(e.clubs.length === 6, 'six clubs inscrits', `${e.clubs.length}`);
  dire(e.phase === 'saison', 'la saison est lancée');

  const notes: number[] = [];
  for (const club of e.clubs) {
    const cartes = e.cartes.filter((c) => c.proprietaire === club.id);
    const moyenne = cartes.reduce((s, c) => s + c.note, 0) / cartes.length;
    notes.push(moyenne);
    if (club === e.clubs[0]) {
      dire(cartes.length === 30, 'chaque club reçoit 30 joueurs', `${cartes.length}`);
      dire(cartes.every((c) => c.rarete === 'bronze'), 'tous Bronze au départ');
      dire(cartes.every((c) => c.note >= 30 && c.note <= 40), 'notes de départ entre 30 et 40');
      dire(cartes.every((c) => c.championnat === 'Régionale 3'),
        '⚠️ ce sont de VRAIS licenciés de Régionale 3, pas des joueurs inventés',
        cartes.slice(0, 2).map((c) => `${c.note} ${c.nom} (${c.clubReel})`).join(' · '));
      dire(cartes.every((c) => c.origine === 'ffr'), 'aucun n’est un joueur généré');
      const composition = compositionManagerParDefaut(cartes.map(coequipierDepuisCarte));
      dire(composition.titulaires.length === 15 && composition.remplacants.length === 8,
        'une feuille de 15 + 8 est composable immédiatement');
      const titulaires = composition.titulaires.map(id => cartes.find(c => c.id === id)!);
      const meilleurPied = [...titulaires].sort((a, b) => (b.statistiques.JDP ?? b.note) - (a.statistiques.JDP ?? a.note))[0];
      dire(composition.buteurId === meilleurPied.id, 'le buteur automatique est le meilleur au jeu au pied', `${meilleurPied.nom} · ${meilleurPied.statistiques.JDP} JDP`);
      const familles = new Set(cartes.map((c) => c.famille));
      dire(familles.size === 9, 'les neuf familles de poste sont couvertes', `${familles.size}/9`);
    }
  }
  const ecart = Math.max(...notes) - Math.min(...notes);
  dire(Math.abs(notes[0] - 35) < 0.6, 'le GEN moyen d’un effectif de départ vaut 35', notes[0].toFixed(2));
  dire(ecart < 0.01, 'et tous les clubs partent EXACTEMENT au même niveau', `écart ${ecart.toFixed(3)}`);

  // ⚠️ L'unicité par ligue commence à la dotation, pas au premier pack.
  dire(new Set(e.cartes.map((c) => c.sourceId)).size === e.cartes.length,
    '⚠️ deux amis inscrits le même jour ne reçoivent JAMAIS le même licencié',
    `${e.cartes.length} licenciés distincts`);
  dire(e.cartes.length === 6 * 30, 'la ligue ne stocke QUE les cartes distribuées', `${nb(e.cartes.length)} cartes`);
  dire(e.clubs.every(c => c.packsGratuits?.length === PACKS_GRATUITS_PAR_JOUR), 'chaque club reçoit dix packs gratuits par jour');
  // ⚠️ MAIS PAS AVANT LE COUP D'ENVOI. Un créateur qui attend ses amis pendant
  // trois jours accumulait trente packs et se présentait au premier match avec
  // une avance que personne ne pouvait rattraper.
  {
    const salon = creerCarriere({
      id: 'ligue-salon', nom: 'Salon', code: 'DR-SALON', compteId: 'compte-1', pseudo: 'Colin',
      clubNom: 'Colin RFC', rythme: 1, maxClubs: 20,
    }, T0, 'graine-salon');
    dire(salon.phase === 'salon' && salon.clubs.every((c) => !c.packsGratuits?.length),
      '⚠️ le SALON ne distribue AUCUN pack quotidien');
    const rejoint = agirCarriere(salon, 'compte-2', { type: 'rejoindre', pseudo: 'Ami', clubNom: 'Club 2' }, T0 + JOUR, 'g2');
    dire(rejoint.clubs.every((c) => !c.packsGratuits?.length), 'ni le lendemain, ni à l’arrivée d’un ami');
    const lancee = agirCarriere(rejoint, 'compte-1', { type: 'demarrerSaison' }, T0 + JOUR, 'g3');
    dire(lancee.clubs.every((c) => c.packsGratuits?.length === PACKS_GRATUITS_PAR_JOUR),
      'et le coup d’envoi les donne à tout le monde le même jour');
  }
  const vue = vueCarriere(e, e.clubs[0].compteId);
  dire(vue.clubs.find(c => c.id === e.clubs[0].id)?.packsGratuits?.length === 10
    && vue.clubs.filter(c => c.id !== e.clubs[0].id).every(c => !c.packsGratuits), 'les packs gratuits restent privés à leur destinataire');
  const poids = JSON.stringify(e).length;
  dire(poids < 900_000, 'et l’état complet d’une ligue de six tient sous 900 Ko', `${nb(poids / 1024)} Ko`);
}

// Le pack Élite reste plus rare que le Bronze, mais le dernier dispose d'un
// vrai rattrapage sans garantie artificielle.
{
  const bronze = PACKS_CARRIERE.find(p => p.id === 'bronze')!;
  const elite = PACKS_CARRIERE.find(p => p.id === 'elite')!;
  dire(poidsPackQuotidien(elite, 0, 6) < poidsPackQuotidien(bronze, 0, 6), 'les meilleurs packs quotidiens restent les plus rares');
  dire(poidsPackQuotidien(elite, 5, 6) > poidsPackQuotidien(elite, 0, 6), 'le dernier a davantage de chances de recevoir un pack rare');
  let e = ligue(2);
  const club = e.clubs[0];
  const cadeau = club.packsGratuits![0];
  const solde = club.ovas;
  const cartesAvant = e.cartes.length;
  e = agirCarriere(e, club.compteId, { type: 'ouvrirPackGratuit', attributionId: cadeau.id }, T0 + 1000, 'cadeau');
  dire(e.clubs[0].ovas === solde && e.cartes.length > cartesAvant, 'ouvrir un pack quotidien ne coûte aucun Ova');
  dire(e.clubs[0].packsGratuits?.length === 9, 'un cadeau ouvert disparaît du stock');
  let refuse = false;
  try { agirCarriere(e, club.compteId, { type: 'ouvrirPackGratuit', attributionId: cadeau.id }, T0 + 2000, 'doublon'); } catch { refuse = true; }
  dire(refuse, 'un pack quotidien ne peut pas être ouvert deux fois');
  e = avancerCarriere(e, T0 + JOUR + 1000, 'lendemain');
  dire(e.clubs[0].packsGratuits?.length === 19, 'le lendemain ajoute bien un nouveau lot de dix');
}

// ═══════════════════════════════════════════════════════════════════════════
titre('2. LES SCORES — « surtout pas 200-150 »');
// ═══════════════════════════════════════════════════════════════════════════
{
  const cartesA = dotationBronzeCarriere('m', 'club-a', 'alea-a');
  const cartesB = dotationBronzeCarriere('m', 'club-b', 'alea-b');
  const equipe = (nom: string, cartes: typeof cartesA) => ({
    clubId: nom, nom, effectif: cartes.map(coequipierDepuisCarte),
    composition: compositionManagerParDefaut(cartes.map(coequipierDepuisCarte)),
    strategie: STRATEGIE_EN_LIGNE_DEFAUT,
  });

  const scores: number[] = [];
  const essais: number[] = [];
  const penalites: number[] = [];
  let maximum = 0;
  const debut = Date.now();
  for (let n = 0; n < 120; n++) {
    const m = conclureMatchEnLigne(creerMatchEnLigne({
      id: `test-${n}`, domicile: equipe('Colin RFC', cartesA), exterieur: equipe('Club 2', cartesB),
      debut: T0, graine: n * 7919,
    }));
    scores.push(m.score.domicile, m.score.exterieur);
    essais.push(m.essais.domicile, m.essais.exterieur);
    penalites.push(m.penalites.domicile, m.penalites.exterieur);
    maximum = Math.max(maximum, m.score.domicile, m.score.exterieur);
  }
  const duree = Date.now() - debut;
  const parMatch = duree / 120;
  const moyenne = scores.reduce((a, b) => a + b, 0) / scores.length;
  const moyEssais = essais.reduce((a, b) => a + b, 0) / essais.length;
  const moyPenalites = penalites.reduce((a, b) => a + b, 0) / penalites.length;
  const trie = [...scores].sort((a, b) => a - b);

  console.log(`     120 rencontres jouées en ${nb(duree)} ms (${parMatch.toFixed(0)} ms par match)`);
  console.log(`     score moyen ${moyenne.toFixed(1)} · médiane ${trie[trie.length / 2]} · maximum ${maximum}`);
  console.log(`     ${moyEssais.toFixed(2)} essai(s) et ${moyPenalites.toFixed(2)} pénalité(s) par équipe et par match`);
  dire(maximum <= 65, '⚠️ AUCUN SCORE ABSURDE : le maximum reste sous 65 points', `max ${maximum}`);
  dire(moyenne > 10 && moyenne < 32, 'le score moyen d’une équipe est réaliste', moyenne.toFixed(1));
  dire(moyEssais >= 1 && moyEssais <= 5, 'le nombre d’essais par équipe est réaliste', moyEssais.toFixed(2));
  dire(moyPenalites >= 0.8 && moyPenalites <= 5, 'le nombre de pénalités passées est réaliste', moyPenalites.toFixed(2));
  dire(scores.some((s) => s !== scores[0]), 'les scores varient d’un match à l’autre');
  // ⚠️ LE SEUIL EST PASSÉ DE 400 À 800 ms, ET C'EST UN PRIX ASSUMÉ. Le direct
  // se joue en TEMPS RÉEL (`EtatMatch.tempsReel`) : une seconde de jeu vaut une
  // seconde à l'écran, donc le moteur simule les 4 800 secondes du match au lieu
  // des 2 560 que la carrière solo compresse. Deux fois plus de ticks, deux fois
  // plus de temps — mais une mêlée dure enfin cinquante secondes au lieu d'être
  // étirée cinq fois. Le coût ne se paie qu'au démarrage à froid : en direct, la
  // rejoue repart du cache et n'avance que de deux secondes à la fois.
  // Mesuré : 566 ms sur une machine au repos, 844 ms pendant un `npm run build`
  // concurrent. Le seuil laisse la marge d'une machine chargée sans laisser
  // passer une vraie régression — c'était 428 ms avant le temps réel.
  dire(parMatch < 1100, 'un match complet se rejoue en moins de 1,1 s', `${parMatch.toFixed(0)} ms`);

  // La cible de score suit bien l'écart de force, avantage du terrain compris.
  const faible = cibleDeScore(35, 35, 'egal');
  const ecrase = cibleDeScore(78, 35, 'ecart');
  dire(ecrase.domicile > faible.domicile + 25, 'un effectif à 78 vise beaucoup plus haut qu’un effectif à 35',
    `${faible.domicile}-${faible.exterieur} contre ${ecrase.domicile}-${ecrase.exterieur}`);
  dire(ecrase.domicile < 110, 'sans jamais viser un score de basket', `${ecrase.domicile}`);
  dire(forceFeuille([]) === 35, 'une feuille vide vaut 35 par défaut, jamais NaN');
}

// ═══════════════════════════════════════════════════════════════════════════
titre('3. LA REJOUE EST DÉTERMINISTE, ET LE DIRECT S’ARRÊTE SUR LES DÉCISIONS');
// ═══════════════════════════════════════════════════════════════════════════
{
  const cartes = dotationBronzeCarriere('m', 'club-a', 'alea-a');
  const equipe = (id: string) => ({
    clubId: id, nom: id, effectif: cartes.map(coequipierDepuisCarte),
    composition: compositionManagerParDefaut(cartes.map(coequipierDepuisCarte)),
  });
  const params = { id: 'direct', domicile: equipe('A'), exterieur: equipe('B'), debut: T0, graine: 42 };

  // Deux managers qui regardent voient exactement le même match.
  const a = conclureMatchEnLigne(creerMatchEnLigne(params));
  const b = conclureMatchEnLigne(creerMatchEnLigne(params));
  dire(a.score.domicile === b.score.domicile && a.score.exterieur === b.score.exterieur,
    'deux rejoues du même match donnent le même score', `${a.score.domicile}-${a.score.exterieur}`);
  dire(JSON.stringify(a.fil) === JSON.stringify(b.fil), 'et rigoureusement le même fil de commentaires');

  // La montée progressive de l'horloge donne le même résultat que d'un bloc.
  let progressif = creerMatchEnLigne(params);
  for (let minute = 4; minute <= 84; minute += 4) {
    progressif = avancerMatchEnLigne(progressif, T0 + minute * MS_PAR_MINUTE);
  }
  dire(progressif.termine, 'un match suivi minute par minute finit bien par se terminer');
  dire(progressif.score.domicile === a.score.domicile && progressif.score.exterieur === a.score.exterieur,
    '⚠️ et il donne LE MÊME SCORE que le match joué d’un bloc',
    `${progressif.score.domicile}-${progressif.score.exterieur} contre ${a.score.domicile}-${a.score.exterieur}`);
  dire(!progressif.equipes && progressif.journal.length === 0,
    'les feuilles sont archivées à la sirène (la ligue ne les traîne pas)');
  dire((progressif.feuille?.length ?? 0) >= 30, 'la feuille de match est conservée',
    `${progressif.feuille?.length ?? 0} lignes`);

  // Un manager présent doit se voir proposer une décision de pénalité.
  // ⚠️ L'HORLOGE DU BANC AVANCE, ELLE NE RECULE PAS. Une première version
  // repartait de `T0 + pas × 2 s` après avoir sauté de 21 s pour laisser
  // expirer une décision : le temps revenait en arrière, la même pénalité était
  // reproposée quatre-vingts fois et le match restait bloqué à la 8ᵉ minute.
  let direct = creerMatchEnLigne(params);
  let decisions = 0;
  let prises = 0;
  let horlogeReelle = T0;
  for (let pas = 1; pas <= 600 && !direct.termine; pas++) {
    horlogeReelle += MS_PAR_MINUTE / 2;
    direct = commanderMatchEnLigne(direct, 'A', { type: 'presence' }, horlogeReelle);
    if (direct.decision) {
      decisions++;
      if (decisions % 2 === 0) {
        direct = commanderMatchEnLigne(direct, 'A', { type: 'decision', choix: 'points' }, horlogeReelle);
        prises++;
      } else {
        // On laisse expirer : l'IA doit trancher toute seule.
        horlogeReelle += 21_000;
        direct = avancerMatchEnLigne(direct, horlogeReelle);
      }
    }
  }
  console.log(`     ${decisions} décision(s) proposée(s) sur le match, ${prises} tranchée(s) par le manager`);
  dire(decisions > 0, '⚠️ un manager présent SE VOIT PROPOSER des décisions', `${decisions} sur le match`);
  dire(prises > 0, 'et celles qu’il tranche sont appliquées', `${prises} prises en main`);
  dire(direct.termine, 'un direct entrecoupé de décisions se termine quand même');
  dire(direct.horloge === 80, 'l’horloge s’arrête bien à 80 minutes', `${direct.horloge}`);

  // Personne ne regarde : aucune décision, le match roule tout seul.
  let seul = creerMatchEnLigne(params);
  let vues = 0;
  for (let pas = 1; pas <= 200 && !seul.termine; pas++) {
    seul = avancerMatchEnLigne(seul, T0 + pas * MS_PAR_MINUTE);
    if (seul.decision) vues++;
  }
  dire(vues === 0, 'sans personne devant, aucune décision n’est demandée');
  dire(seul.termine, 'et le match se joue jusqu’au bout');

  // La stratégie change vraiment quelque chose.
  dire(impactStrategie({ ...STRATEGIE_EN_LIGNE_DEFAUT, mentalite: 'tresOffensive' })
    > impactStrategie({ ...STRATEGIE_EN_LIGNE_DEFAUT, mentalite: 'tresDefensive' }) + 8,
    '⚠️ une consigne tactique DÉPLACE le potentiel de marque, elle n’est pas décorative');
  dire(tactiqueDepuisStrategie({ ...STRATEGIE_EN_LIGNE_DEFAUT, jeu: 'large' }).attaque === 'large'
    && tactiqueDepuisStrategie({ ...STRATEGIE_EN_LIGNE_DEFAUT, defense: 'agressive' }).defense === 'blitz',
    'chaque réglage arrive au moteur sous une forme qu’il comprend');
  dire(mentaliteAppliquee(STRATEGIE_EN_LIGNE_DEFAUT, 72, -10) === 'tresOffensive'
    && mentaliteAppliquee(STRATEGIE_EN_LIGNE_DEFAUT, 30, -10) === 'equilibree',
    'les bascules de fin de match ne s’enclenchent qu’à l’heure dite');
  dire(decisionIA(STRATEGIE_EN_LIGNE_DEFAUT, 30, true, 20, 0) === 'points'
    && decisionIA(STRATEGIE_EN_LIGNE_DEFAUT, 30, true, 70, -6) === 'touche',
    'l’IA prend les points au calme, et va en touche quand il faut un essai');
  dire(strategieValide({ mentalite: 'invincible', rythme: 'lent' }).mentalite === 'equilibree',
    'une stratégie inventée par un client bricolé est ramenée au défaut');

  // ── L'HORLOGE CONTINUE ───────────────────────────────────────────────────
  // ⚠️ LE DÉFAUT QUI RENDAIT LE DIRECT ILLISIBLE. `EtatMatch.minute` est un
  // entier : tant que la rejoue s'arrêtait dessus, un sondage à la 30ᵉ 03
  // poussait le moteur jusqu'à la 31ᵉ pile, puis PLUS RIEN pendant cinquante-
  // sept secondes réelles. Le terrain était une photo qui se téléportait une
  // fois par minute, et « suivre le match » n'existait pas.
  {
    let suivi = creerMatchEnLigne(params);
    const horloges: number[] = [];
    const positions: string[] = [];
    for (let pas = 1; pas <= 30; pas++) {
      suivi = avancerMatchEnLigne(suivi, T0 + pas * 2000);
      horloges.push(suivi.horloge);
      const t = vueMatchEnLigne(suivi, 'A').terrain;
      if (t) positions.push(t.pions.map((p) => `${p.x},${p.y}`).join('|'));
    }
    const bonds = horloges.slice(1).map((h, i) => h - horloges[i]);
    const plusGrandBond = Math.max(...bonds);
    dire(plusGrandBond < 0.2, '⚠️ le direct avance en CONTINU, pas par bonds d’une minute entière',
      `plus grand bond : ${plusGrandBond.toFixed(3)} minute`);
    // ⚠️ PAS TRENTE SUR TRENTE, ET C'EST NORMAL. Quand les vingt-deux joueurs
    // d'une touche sont en place et attendent le lancer, deux relevés distants
    // de deux secondes sont légitimement identiques — c'est du rugby, pas un
    // gel. Ce qu'on interdit ici, c'est l'ancien défaut : UNE seule image par
    // minute de jeu, soit deux ou trois sur trente.
    dire(new Set(positions).size >= 18, 'et le terrain change à presque chaque sondage de deux secondes',
      `${new Set(positions).size} images différentes sur 30 sondages`);
    const t = vueMatchEnLigne(suivi, 'A').terrain;
    dire(t !== undefined && t.pions.length === 30, 'le terrain envoyé porte les trente joueurs',
      `${t?.pions.length ?? 0} pions`);
    dire(Boolean(t && t.pions.every((p) => Number.isFinite(p.vx) && Number.isFinite(p.vy))),
      '⚠️ avec leur VECTEUR VITESSE — c’est lui qui laisse l’écran extrapoler entre deux relevés');
    dire(Boolean(t && t.cadence > 0), 'et la cadence de la phase, sans quoi on courrait sept fois trop vite',
      `cadence ${t?.cadence} en phase « ${t?.phase} »`);
  }

  // ── LA PÉNALITÉ SE DÉCIDE DANS LES 50 MÈTRES ADVERSES ───────────────────
  {
    let zone = creerMatchEnLigne(params);
    let horlogeReelle = T0;
    const distances: number[] = [];
    for (let pas = 1; pas <= 1600 && !zone.termine; pas++) {
      horlogeReelle += 4_000;
      zone = commanderMatchEnLigne(zone, 'A', { type: 'presence' }, horlogeReelle);
      if (zone.decision) {
        distances.push(zone.decision.distance);
        horlogeReelle += 21_000;
        zone = avancerMatchEnLigne(zone, horlogeReelle);
      }
    }
    dire(distances.length > 0, 'le manager présent est appelé sur ses pénalités', `${distances.length} appels`);
    dire(distances.every((d) => d <= METRES_DECISION),
      `⚠️ et JAMAIS au-delà de ${METRES_DECISION} m : à 70 m des poteaux, « je prends les points ? » n’est pas une question`,
      distances.length ? `de ${Math.min(...distances)} à ${Math.max(...distances)} m` : '');
    dire(zone.termine, 'et le match va au bout malgré les arrêts');
  }

  // ── LES DEUX MANAGERS TRANCHENT, PAS SEULEMENT CELUI DE DOMICILE ────────
  // ⚠️ LE VISITEUR NE VOYAIT JAMAIS UNE SEULE DÉCISION. La rejoue ne s'arrêtait
  // que sur les pénalités d'UN camp — le premier trouvé présent, donc toujours
  // le club à domicile dès qu'il regardait.
  {
    let deux = creerMatchEnLigne(params);
    let horlogeReelle = T0;
    const vues = { A: 0, B: 0 };
    for (let pas = 1; pas <= 1600 && !deux.termine; pas++) {
      horlogeReelle += 4_000;
      deux = commanderMatchEnLigne(deux, 'A', { type: 'presence' }, horlogeReelle);
      deux = commanderMatchEnLigne(deux, 'B', { type: 'presence' }, horlogeReelle);
      if (deux.decision) {
        vues[deux.decision.cote === 'domicile' ? 'A' : 'B'] += 1;
        horlogeReelle += 21_000;
        deux = avancerMatchEnLigne(deux, horlogeReelle);
      }
    }
    dire(vues.A > 0 && vues.B > 0,
      '⚠️ quand les DEUX regardent, chacun se voit proposer SES pénalités',
      `domicile ${vues.A} · extérieur ${vues.B}`);
  }

  // ── LE COLLECTIF SE JOUE AUSSI ENTRE ÉQUIPIERS ──────────────────────────
  // Demande : « il faut que le collectif compte dans l'influence du jeu aussi
  // sur les erreurs entre équipiers ». Il déplaçait les NOTES, donc la cible de
  // score ; il déplace maintenant les FAUTES DE LIAISON — passe en avant,
  // ballon lâché à la réception, offload dans le vide.
  {
    const fautes = (cohesion: number | undefined) => {
      let total = 0;
      for (let i = 0; i < 12; i++) {
        const lot = dotationBronzeCarriere('m', `coh-${i}`, `coh-${i}`);
        const feuille = lot.map(coequipierDepuisCarte);
        const compo = compositionManagerParDefaut(feuille);
        const ordre = [...compo.titulaires, ...compo.remplacants]
          .map((id) => feuille.find((j) => j.id === id))
          .filter((j): j is NonNullable<typeof j> => Boolean(j));
        const e = creerMatch('A', 'B', ordre, ordre, 24, 21, `coh${i}`, undefined, {
          rng: graineMoteur(`coh${i}`), scoreSurTerrain: true,
          compositionA: ordre, compositionB: ordre,
          cohesionA: cohesion, cohesionB: cohesion,
        });
        while (!e.fini) avancer(e, 0.6);
        total += e.compteurs.enAvants;
      }
      return total / 12;
    };
    const inconnus = fautes(0);
    const neutre = fautes(50);
    const rodes = fautes(100);
    const absent = fautes(undefined);
    console.log(`     en-avants par match : inconnus ${inconnus.toFixed(1)} · neutre ${neutre.toFixed(1)} · rodés ${rodes.toFixed(1)}`);
    dire(inconnus > rodes * 1.2,
      '⚠️ un XV qui ne se connaît pas LÂCHE PLUS DE BALLONS qu’un bloc constitué',
      `${inconnus.toFixed(1)} contre ${rodes.toFixed(1)} en-avants`);
    dire(neutre > rodes && inconnus > neutre, 'et l’échelle est monotone entre les deux');
    dire(Math.abs(absent - neutre) < 0.01,
      '⚠️ un match SANS collectif joue exactement comme à 50 : la carrière solo ne bouge pas',
      `${absent.toFixed(1)} contre ${neutre.toFixed(1)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
titre('4. L’ABSENCE NE BLOQUE JAMAIS LA LIGUE');
// ═══════════════════════════════════════════════════════════════════════════
{
  let e = ligue(4);
  const premiere = e.rencontres.filter((r) => r.journee === 1);
  dire(premiere.length === 2, 'la première journée affiche deux rencontres', `${premiere.length}`);
  dire(e.rencontres.length === 12, 'quatre clubs jouent un aller-retour de 12 matchs', `${e.rencontres.length}`);

  // Personne ne se connecte : on avance l'horloge d'une semaine.
  e = avancerCarriere(e, T0 + 7 * JOUR + 3600_000, 'graine-tick');
  const jouees = e.rencontres.filter((r) => r.resultat);
  dire(jouees.length >= 2, '⚠️ la fenêtre fermée JOUE les matchs sans personne', `${jouees.length} rencontre(s)`);
  dire(jouees.every((r) => r.resultat!.origine === 'absence'), 'et les marque comme jouées en l’absence des managers');
  dire(e.clubs.every((c) => c.ovas > 0), 'les Ovas du match sont versés à tout le monde',
    e.clubs.map((c) => nb(c.ovas)).join(' · '));
  const classement = classementCarriere(e);
  dire(classement.reduce((s, l) => s + l.joues, 0) === jouees.length * 2,
    'le classement compte exactement les matchs joués');

  // Idempotence : une deuxième avance à la même date ne double rien.
  const avant = e.clubs.map((c) => c.ovas).join('|');
  const encore = avancerCarriere(e, T0 + 7 * JOUR + 3600_000, 'graine-tick');
  dire(encore.clubs.map((c) => c.ovas).join('|') === avant,
    '⚠️ rejouer l’avance NE VERSE PAS deux fois les récompenses');
}

// ═══════════════════════════════════════════════════════════════════════════
titre('5. LES PACKS : LE VIVIER MONDIAL, ET L’UNICITÉ PAR LIGUE');
// ═══════════════════════════════════════════════════════════════════════════
{
  const catalogue = catalogueMondialCarriere();
  const bandes = catalogueParRarete();
  console.log(`     catalogue mondial : ${nb(catalogue.length)} joueurs`);
  console.log(`     bronze ${nb(bandes.bronze.length)} · argent ${nb(bandes.argent.length)} · or ${nb(bandes.or.length)} · élite ${nb(bandes.elite.length)} · star ${nb(bandes.star.length)}`);
  dire(catalogue.length > 20_000, 'le vivier contient tout le monde réel du jeu', nb(catalogue.length));
  dire(new Set(catalogue.map((c) => c.sourceId)).size === catalogue.length, 'aucun doublon dans le catalogue');
  dire(bandes.star.length < bandes.elite.length && bandes.elite.length < bandes.or.length
    && bandes.or.length < bandes.argent.length && bandes.argent.length < bandes.bronze.length,
    '⚠️ LA PYRAMIDE EST STRICTE : chaque bande est plus rare que la précédente');
  dire(catalogue.some((c) => c.pays !== 'France'), 'des championnats étrangers sont représentés');
  dire(catalogue.some((c) => c.origine === 'ffr' && c.note < 50), 'des joueurs de Régionale y figurent aussi');
  dire(rareteCarriere(48) === 'bronze' && rareteCarriere(50) === 'argent' && rareteCarriere(65) === 'or'
    && rareteCarriere(80) === 'elite' && rareteCarriere(88) === 'star', 'les cinq seuils de rareté sont ceux annoncés');

  const pack = (id: string) => PACKS_CARRIERE.find((p) => p.id === id)!;
  const avants = rayonDePack('or', pack('avants'));
  const arrieres = rayonDePack('or', pack('arrieres'));
  dire(avants.length > 100 && arrieres.length > 100 && avants.length + arrieres.length === bandes.or.length,
    '⚠️ le pack Avants et le pack Arrières se partagent exactement le catalogue',
    `${nb(avants.length)} + ${nb(arrieres.length)}`);
  dire(rayonDePack('or', pack('france')).every((c) => c.pays === 'France'), 'le pack France ne contient que la France');
  dire(rayonDePack('or', pack('international')).every((c) => c.pays !== 'France'), 'le pack International n’en contient aucun');
  dire(rayonDePack('or', pack('charniere')).every((c) => c.famille === 'demi_melee' || c.famille === 'demi_ouverture'),
    'le pack Charnière ne contient que des 9 et des 10', `${rayonDePack('or', pack('charniere')).length} joueurs`);
  dire(rayonDePack('or', pack('top14')).every((c) => c.championnat === 'Top 14'), 'le pack Top 14 ne contient que le Top 14');
  dire(rayonDePack('argent', pack('espoirs')).every((c) => c.age <= 23), 'le pack Espoirs ne contient que des moins de 23 ans');
  dire(rayonDePack('or', pack('iles')).every((c) => ['Fidji', 'Samoa', 'Tonga'].includes(c.nation)), 'le pack Îles ne contient que les trois nations du Pacifique');
  // ⚠️ UN PACK NE DOIT PAS ANNONCER UNE BANDE QU'IL NE PEUT PAS SERVIR. Le
  // seuil n'est pas le même pour tous : la bande Star ne compte que 26 joueurs
  // dans TOUT le jeu, donc en avoir un ou deux dans un pack thématique est
  // normal — c'est même ce qui la rend précieuse. Pour les autres bandes, un
  // vivier sous cinq joueurs veut dire que la probabilité affichée est un
  // mensonge. Mesuré à l'écriture : la Pro D2 annonçait de l'Élite alors
  // qu'elle n'en a qu'UN, et le pack Terroir de l'Or alors que les six
  // championnats amateurs n'en comptent pas un seul.
  const creux = PACKS_CARRIERE.flatMap((p) => RARETES_CARRIERE
    .filter((r) => p.probabilites[r] > 0 && rayonDePack(r, p).length < (r === 'star' ? 1 : 5))
    .map((r) => `${p.id}/${r}`));
  dire(creux.length === 0, '⚠️ aucun pack n’annonce une bande qu’il ne peut pas servir', creux.join(' · ') || 'aucun creux');

  // Ouverture réelle : 60 packs Premium dans une ligue.
  let e = ligue(4);
  const club = e.clubs[0];
  e.clubs[0].ovas = 200_000;
  const tirees: string[] = [];
  for (let n = 0; n < 60; n++) {
    e = agirCarriere(e, club.compteId, { type: 'ouvrirPack', packId: 'premium' }, T0 + n * 1000, `pack-${n}`);
    const dernier = e.transactions[e.transactions.length - 1];
    tirees.push(...dernier.cartes);
  }
  const cartes = e.cartes.filter((c) => tirees.includes(c.id));
  dire(cartes.length === 180, '60 packs Premium donnent 180 cartes', `${cartes.length}`);
  const sources = new Set(cartes.map((c) => c.sourceId));
  dire(sources.size === cartes.length, '⚠️ UN JOUEUR N’EXISTE QU’UNE FOIS PAR LIGUE', `${sources.size} identités distinctes`);
  const parRarete = { bronze: 0, argent: 0, or: 0, elite: 0, star: 0 } as Record<string, number>;
  for (const c of cartes) parRarete[c.rarete]++;
  console.log(`     Premium ×60 : bronze ${parRarete.bronze} · argent ${parRarete.argent} · or ${parRarete.or} · élite ${parRarete.elite} · star ${parRarete.star}`);
  dire(parRarete.or > parRarete.elite && parRarete.elite >= parRarete.star,
    'la pyramide se retrouve dans ce qui sort réellement des packs');
  dire(parRarete.star <= 2, 'une superstar reste un événement, même sur 60 packs Premium', `${parRarete.star}`);
  const meilleure = Math.max(...cartes.map((c) => c.note));
  console.log(`     meilleure carte tirée : ${meilleure} GEN`);
  const auDessus = cartes.filter((c) => c.note > 40).length;
  dire(auDessus / cartes.length > 0.7, 'plus de 70 % d’un pack Premium dépasse le niveau de départ',
    `${auDessus}/${cartes.length} au-dessus de 40 GEN`);
  dire(PACKS_CARRIERE.every((p) => Object.values(p.probabilites).reduce((a, b) => a + b, 0) > 99.9
    && Object.values(p.probabilites).reduce((a, b) => a + b, 0) < 100.1),
    'chaque pack a des probabilités qui font 100 %');
}

// ═══════════════════════════════════════════════════════════════════════════
titre('6. L’ÉCONOMIE D’UNE SAISON, ET L’ANTI-BOULE-DE-NEIGE');
// ═══════════════════════════════════════════════════════════════════════════
{
  let e = ligue(6);
  const journees = Math.max(...e.rencontres.map((r) => r.journee));
  console.log(`     six clubs, ${journees} journées à un match par semaine`);
  for (let semaine = 1; semaine <= journees + 1; semaine++) {
    e = avancerCarriere(e, T0 + semaine * 7 * JOUR + 3600_000, `tick-${semaine}`);
    // Chaque club réclame ce qu'il peut : c'est ce que ferait un joueur assidu.
    for (const club of e.clubs) {
      for (const o of e.objectifs.filter((o) => o.clubId === club.id && !o.reclame && o.progression >= o.cible)) {
        e = agirCarriere(e, club.compteId, { type: 'reclamerObjectif', objectifId: o.id }, T0 + semaine * 7 * JOUR + 7200_000, 'obj');
      }
    }
  }
  const restants = e.rencontres.filter((r) => !r.resultat).length;
  dire(restants === 0, 'toute la saison s’est jouée', `${e.rencontres.length - restants}/${e.rencontres.length}`);
  const classement = classementCarriere(e);
  console.log('     ' + classement.map((l, i) => `${i + 1}. ${l.nom} ${l.points} pts (${l.pour}-${l.contre})`).join('  '));
  dire(classement[0].points >= classement[classement.length - 1].points, 'le classement est trié par points');
  dire(e.phase === 'intersaison', 'la ligue passe en intersaison une fois le championnat terminé', e.phase);
  dire(e.histoire.length === 1, 'le champion entre dans l’histoire de la ligue',
    e.histoire.map((h) => `${h.nom} → ${e.clubs.find((c) => c.id === h.vainqueur)?.nom}`).join(''));

  const soldes = e.clubs.map((c) => c.ovas).sort((a, b) => b - a);
  console.log(`     Ovas en fin de saison : ${soldes.map(nb).join(' · ')}`);
  const rapport = soldes[0] / Math.max(1, soldes[soldes.length - 1]);
  dire(soldes[soldes.length - 1] > 12_000, 'même le dernier finit la saison avec de quoi jouer au marché', nb(soldes[soldes.length - 1]));
  dire(rapport < 2.2, '⚠️ ANTI-BOULE-DE-NEIGE : le premier ne gagne pas le double du dernier',
    `rapport ${rapport.toFixed(2)}`);
  dire(soldes[0] > 25_000, 'une saison rapporte de quoi ouvrir une vingtaine de packs Premium', nb(soldes[0]));

  // Ce qu'un club peut se payer sur une saison, en Premium.
  const premium = PACKS_CARRIERE.find((p) => p.id === 'premium')!;
  console.log(`     soit ${Math.floor(soldes[0] / premium.prix)} packs Premium pour le champion, ${Math.floor(soldes[soldes.length - 1] / premium.prix)} pour le dernier`);

  // ⚠️ LE POIDS DE L'ÉTAT EST UNE CONTRAINTE DE PRODUCTION, PAS UN DÉTAIL : la
  // ligue entière est une ligne de jsonb relue et réécrite à chaque action, et
  // il y en a une toutes les deux secondes pendant un direct.
  const detaillees = e.rencontres.filter((r) => r.match?.feuille);
  const elaguees = e.rencontres.filter((r) => r.match && !r.match.feuille);
  const poids = JSON.stringify(e).length;
  const poidsDetaille = detaillees.length ? JSON.stringify(detaillees[0].match).length : 0;
  const poidsElague = elaguees.length ? JSON.stringify(elaguees[0].match).length : 0;
  console.log(`     poids de la ligue après la saison : ${nb(poids / 1024)} Ko · ${detaillees.length} feuilles conservées sur ${e.rencontres.length} rencontres`);
  console.log(`     une rencontre détaillée pèse ${nb(poidsDetaille / 1024)} Ko, une rencontre élaguée ${nb(poidsElague / 1024)} Ko`);
  dire(detaillees.length <= 20, '⚠️ seules les 20 dernières feuilles de match sont conservées', `${detaillees.length}`);
  dire(poidsElague > 0 && poidsElague < poidsDetaille / 8,
    'une rencontre élaguée coûte au moins huit fois moins qu’une détaillée',
    `${nb(poidsDetaille / poidsElague)}× plus légère`);
  // ⚠️ LA PROJECTION EST LE VRAI CONTRÔLE : une saison à vingt clubs, c'est
  // 380 rencontres. Sans élagage, ce sont 6,5 Mo réécrits à chaque lecture.
  const projection = 20 * poidsDetaille + 360 * poidsElague + JSON.stringify(e.cartes).length * (20 / 6);
  dire(projection < 2_500_000, 'et une saison à VINGT clubs resterait sous 2,5 Mo',
    `projection ${nb(projection / 1024)} Ko`);
  const marqueurs = e.cartes.filter((c) => c.essais > 0);
  dire(marqueurs.length > 0, 'les essais restent crédités aux cartes, pas seulement aux feuilles',
    `${marqueurs.length} marqueur(s), meilleur : ${Math.max(...e.cartes.map((c) => c.essais))} essais`);
  dire(e.cartes.some((c) => c.matchs >= 5), 'et les matchs joués s’accumulent sur la carte',
    `max ${Math.max(...e.cartes.map((c) => c.matchs))} matchs`);
}

// ═══════════════════════════════════════════════════════════════════════════
titre('7. LE MARCHÉ ENTRE AMIS');
// ═══════════════════════════════════════════════════════════════════════════
{
  let e = ligue(4);
  const [colin, hugo] = e.clubs;
  for (const club of e.clubs) club.ovas = 50_000;
  // Colin remplit son effectif pour pouvoir vendre sans casser sa profondeur.
  for (let n = 0; n < 6; n++) {
    e = agirCarriere(e, colin.compteId, { type: 'ouvrirPack', packId: 'premium' }, T0 + n * 1000, `p-${n}`);
  }
  // ⚠️ ON NE VEND QUE CE QUI N'EST PAS SUR LA FEUILLE. Un titulaire ou un
  // remplaçant ne quitte plus le club (`verifierHorsFeuille`) : il tiendrait
  // son poste dimanche.
  const surLaFeuille = (etat: typeof e, clubId: string) => {
    const club = etat.clubs.find((c) => c.id === clubId)!;
    return new Set([...club.composition.titulaires, ...club.composition.remplacants]);
  };
  const cessibles = (etat: typeof e, clubId: string) => {
    const feuille = surLaFeuille(etat, clubId);
    return etat.cartes.filter((c) => c.proprietaire === clubId && c.origine !== 'formation' && !c.verrou && !feuille.has(c.id));
  };
  const aligne = e.cartes.find((c) => c.proprietaire === colin.id && surLaFeuille(e, colin.id).has(c.id))!;
  try {
    agirCarriere(e, colin.compteId, { type: 'vendre', carteId: aligne.id, prix: 9_000, mode: 'directe', dureeHeures: 24 }, T0, 'refus');
    dire(false, '⚠️ un joueur ALIGNÉ ne se vend pas', 'accepté !');
  } catch (erreur) {
    dire(erreur instanceof Error && erreur.name === 'ErreurCarriere', '⚠️ un joueur ALIGNÉ ne se vend pas', aligne.nom);
  }
  try {
    agirCarriere(e, colin.compteId, { type: 'venteRapide', carteId: aligne.id }, T0, 'refus2');
    dire(false, 'ni ne part en vente rapide', 'accepté !');
  } catch (erreur) {
    dire(erreur instanceof Error && erreur.name === 'ErreurCarriere', 'ni ne part en vente rapide', aligne.nom);
  }

  const aVendre = cessibles(e, colin.id).sort((a, b) => b.note - a.note)[0];
  e = agirCarriere(e, colin.compteId, { type: 'vendre', carteId: aVendre.id, prix: 9_000, mode: 'directe', dureeHeures: 24 }, T0, 'v');
  dire(e.ventes.length === 1 && e.ventes[0].etat === 'ouverte', 'une carte se met en vente', `${aVendre.nom} (${aVendre.note})`);
  dire(e.cartes.find((c) => c.id === aVendre.id)!.verrou === e.ventes[0].id,
    '⚠️ et elle est VERROUILLÉE : impossible de la vendre deux fois');

  const soldeColin = e.clubs.find((c) => c.id === colin.id)!.ovas;
  const soldeHugo = e.clubs.find((c) => c.id === hugo.id)!.ovas;
  e = agirCarriere(e, hugo.compteId, { type: 'acheter', venteId: e.ventes[0].id }, T0 + 1000, 'a');
  dire(e.cartes.find((c) => c.id === aVendre.id)!.proprietaire === hugo.id, 'l’acheteur reçoit la carte');
  dire(e.clubs.find((c) => c.id === colin.id)!.ovas === soldeColin + 9_000, 'le vendeur est crédité', '+9 000 Ovas');
  dire(e.clubs.find((c) => c.id === hugo.id)!.ovas === soldeHugo - 9_000, 'l’acheteur est débité', '−9 000 Ovas');
  dire(e.cartes.find((c) => c.id === aVendre.id)!.clubs.length === 2, 'la carte garde la trace de ses clubs successifs');

  // Enchère : la surenchère rend ses Ovas au perdant.
  const autre = e.cartes.filter((c) => c.proprietaire === colin.id && c.origine !== 'formation').sort((a, b) => b.note - a.note)[0];
  e = agirCarriere(e, colin.compteId, { type: 'vendre', carteId: autre.id, prix: 1_000, mode: 'enchere', dureeHeures: 2 }, T0 + 2000, 'e');
  const enchere = e.ventes[e.ventes.length - 1].id;
  e = agirCarriere(e, hugo.compteId, { type: 'encherir', venteId: enchere, montant: 1_500 }, T0 + 3000, 'e1');
  const apresPremiere = e.clubs.find((c) => c.id === hugo.id)!.ovas;
  e = agirCarriere(e, e.clubs[2].compteId, { type: 'encherir', venteId: enchere, montant: 3_000 }, T0 + 4000, 'e2');
  dire(e.clubs.find((c) => c.id === hugo.id)!.ovas === apresPremiere + 1_500,
    '⚠️ un enchérisseur dépassé RÉCUPÈRE ses Ovas immédiatement');
  e = avancerCarriere(e, T0 + 3 * 3600_000, 'fin-enchere');
  const vendue = e.ventes.find((v) => v.id === enchere)!;
  dire(vendue.etat === 'vendue' && e.cartes.find((c) => c.id === autre.id)!.proprietaire === e.clubs[2].id,
    'à l’expiration, la carte part au plus offrant', `${nb(vendue.enchere!.montant)} Ovas`);

  // Échange croisé — des deux côtés, une carte qui n'est pas sur la feuille.
  const mien = cessibles(e, colin.id)[0];
  const sien = cessibles(e, hugo.id)[0];
  if (mien && sien) {
    e = agirCarriere(e, colin.compteId, {
      type: 'proposerEchange', vers: hugo.id, cartesDonnees: [mien.id], cartesDemandees: [sien.id],
      ovasDonnes: 2_000, ovasDemandes: 0,
    }, T0 + 5000, 'ec');
    dire(e.echanges.length === 1, 'une offre d’échange se propose');
    e = agirCarriere(e, hugo.compteId, { type: 'repondreEchange', echangeId: e.echanges[0].id, accepter: true }, T0 + 6000, 'ec2');
    dire(e.cartes.find((c) => c.id === mien.id)!.proprietaire === hugo.id
      && e.cartes.find((c) => c.id === sien.id)!.proprietaire === colin.id,
      '⚠️ LES DEUX ONT ACCEPTÉ : les cartes changent de mains ensemble');
  }

  // ── La vente rapide, à l'unité et par lot ────────────────────────────────
  const plafonds: [RareteCarriere, number][] = [['bronze', 50], ['argent', 250], ['or', 1_000], ['elite', 10_000], ['star', 20_000]];
  dire(plafonds.every(([rarete, plafond]) => plafondVenteRapide(rarete) === plafond),
    'les plafonds de vente rapide tiennent la bande', plafonds.map(([r, p]) => `${r} ${nb(p)}`).join(' · '));
  dire(catalogueMondialCarriere().every((source) => valeurVenteRapide(source) <= plafondVenteRapide(source.rarete)),
    '⚠️ et AUCUNE carte du vivier ne dépasse le plafond de sa bande', `${nb(catalogueMondialCarriere().length)} joueurs vérifiés`);

  const lot = cessibles(e, colin.id).slice(0, 3);
  const avantLot = e.clubs.find((c) => c.id === colin.id)!.ovas;
  const attendu = lot.reduce((somme, c) => somme + valeurVenteRapide(c), 0);
  e = agirCarriere(e, colin.compteId, { type: 'venteRapideGroupee', carteIds: lot.map((c) => c.id) }, T0 + 7000, 'vr');
  dire(e.clubs.find((c) => c.id === colin.id)!.ovas === avantLot + attendu,
    'une vente rapide GROUPÉE crédite la somme du lot', `${lot.length} cartes → +${nb(attendu)} Ovas`);
  dire(lot.every((c) => !e.cartes.some((x) => x.id === c.id)), 'et les trois cartes quittent la ligue ensemble');
  dire(e.transactions.filter((t) => t.nature === 'venteRapide').at(-1)!.cartes.length === 3,
    '⚠️ en UNE écriture au journal, pas trois', e.transactions.filter((t) => t.nature === 'venteRapide').at(-1)!.libelle);
  // ⚠️ LA BORNE DU LOT EST LA MÊME DES DEUX CÔTÉS, ET ELLE SE DIT. Le serveur
  // refusait au-delà de 30 cartes avec « Liste invalide » — un message qui ne
  // nomme rien, sur une action que l'écran présentait comme permise : avec 59
  // joueurs sous contrat, « Tout cocher » tombait dedans à chaque fois.
  try {
    agirCarriere(e, colin.compteId, {
      type: 'venteRapideGroupee',
      carteIds: new Array(LOT_VENTE_RAPIDE_MAX + 1).fill(0).map((_, i) => `carte-${i}`),
    }, T0 + 7500, 'lot');
    dire(false, 'un lot trop gros est refusé AVEC son chiffre', 'accepté !');
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : '';
    dire(message.includes(String(LOT_VENTE_RAPIDE_MAX)), 'un lot trop gros est refusé AVEC son chiffre', message);
  }

  try {
    agirCarriere(e, colin.compteId, { type: 'venteRapideGroupee', carteIds: cessibles(e, colin.id).map((c) => c.id) }, T0 + 8000, 'vr2');
    dire(false, '⚠️ un lot qui viderait l’effectif est refusé EN ENTIER', 'accepté !');
  } catch (erreur) {
    dire(erreur instanceof Error && erreur.name === 'ErreurCarriere',
      '⚠️ un lot qui viderait l’effectif est refusé EN ENTIER', erreur instanceof Error ? erreur.message : '');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
titre('8. CE QUE LE SERVEUR REFUSE');
// ═══════════════════════════════════════════════════════════════════════════
{
  const e = ligue(4);
  const [colin, hugo] = e.clubs;
  const refuse = (quoi: string, action: () => void) => {
    try { action(); dire(false, quoi, 'accepté !'); }
    catch (erreur) {
      dire(erreur instanceof Error && erreur.name === 'ErreurCarriere', quoi,
        erreur instanceof Error ? erreur.message : 'erreur inconnue');
    }
  };
  refuse('ouvrir un pack sans les Ovas', () =>
    agirCarriere(e, colin.compteId, { type: 'ouvrirPack', packId: 'premium' }, T0, 'x'));
  refuse('vendre la carte d’un autre club', () => {
    const sienne = e.cartes.find((c) => c.proprietaire === hugo.id)!;
    agirCarriere(e, colin.compteId, { type: 'vendre', carteId: sienne.id, prix: 100, mode: 'directe', dureeHeures: 2 }, T0, 'x');
  });
  refuse('vider son effectif sous le plancher', () => {
    const mienne = e.cartes.find((c) => c.proprietaire === colin.id)!;
    let etat = e;
    for (let n = 0; n < 8; n++) {
      const carte = etat.cartes.find((c) => c.proprietaire === colin.id && !c.verrou && c.id !== mienne.id)!;
      etat = agirCarriere(etat, colin.compteId, { type: 'vendre', carteId: carte.id, prix: 100, mode: 'directe', dureeHeures: 2 }, T0, `x${n}`);
    }
  });
  refuse('lancer la saison sans être le créateur', () =>
    agirCarriere(e, hugo.compteId, { type: 'demarrerSaison' }, T0, 'x'));
  refuse('créer une coupe sans être le créateur', () =>
    agirCarriere(e, hugo.compteId, {
      type: 'creerCoupe', nom: 'Christmas Cup', trophee: 'Coupe de Noël', participants: e.clubs.map((c) => c.id),
      format: 'elimination', debut: new Date(T0 + JOUR).toISOString(),
      recompenseParticipation: 1000, recompenseVainqueur: 10_000, recompenseFinaliste: 5_000,
    }, T0, 'x'));
  refuse('aligner une composition à 14 titulaires', () =>
    agirCarriere(e, colin.compteId, {
      type: 'composition',
      composition: { titulaires: e.cartes.filter((c) => c.proprietaire === colin.id).slice(0, 14).map((c) => c.id), remplacants: [], capitaineId: '', buteurId: '' },
    }, T0, 'x'));

  // ── LE PLACEMENT HORS POSTE : AUTORISÉ, ET PAYANT ────────────────────────
  // ⚠️ La règle a longtemps refusé tout croisement avant ↔ arrière. Elle
  // contredisait le mode solo, le texte de l'écran et le barème du jeu, et
  // surtout elle jetait TOUTE la feuille pour un seul pion mal placé.
  {
    const cartesColin = e.cartes.filter((c) => c.proprietaire === colin.id);
    const compo = structuredClone(e.clubs.find((c) => c.id === colin.id)!.composition);
    const croise = structuredClone(compo);
    [croise.titulaires[7], croise.titulaires[13]] = [croise.titulaires[13], croise.titulaires[7]];
    let acceptee = false;
    try { agirCarriere(e, colin.compteId, { type: 'composition', composition: croise }, T0, 'x'); acceptee = true; } catch { /* refusée */ }
    dire(acceptee, 'un troisième ligne peut jouer à l’aile', 'le jeu le note « hors poste », il ne l’interdit pas');

    const melee = structuredClone(compo);
    [melee.titulaires[0], melee.titulaires[13]] = [melee.titulaires[13], melee.titulaires[0]];
    refuse('mais un ailier ne joue PAS pilier', () =>
      agirCarriere(e, colin.compteId, { type: 'composition', composition: melee }, T0, 'x'));

    const effectif = cartesColin.map(coequipierDepuisCarte);
    const rangee = forceFeuille(feuilleGeleeEnLigne(effectif, compo));
    const empilee = structuredClone(compo);
    const tous = [...empilee.titulaires, ...empilee.remplacants]
      .sort((a, b) => cartesColin.find((c) => c.id === b)!.note - cartesColin.find((c) => c.id === a)!.note);
    empilee.titulaires = tous.slice(0, 15); empilee.remplacants = tous.slice(15);
    const brute = forceFeuille(feuilleGeleeEnLigne(effectif, empilee));
    dire(brute < rangee, '⚠️ et empiler ses meilleurs sans regarder le poste COÛTE',
      `${rangee.toFixed(1)} rangée contre ${brute.toFixed(1)} au petit bonheur`);
  }

  // ── UNE LIGUE PLUS VIEILLE QUE LE CODE QUI LA RELIT ──────────────────────
  // ⚠️ Le type dit `dotationOvas: number` ; le jsonb enregistré la veille, lui,
  // n'a rien à cet endroit. Sans rattrapage, l'adhésion mourait sur
  // `undefined.toLocaleString()` et la ligue devenait impossible à rejoindre.
  {
    const ancienne = structuredClone(e) as Record<string, unknown> & typeof e;
    ancienne.phase = 'salon';
    delete (ancienne as { dotationOvas?: number }).dotationOvas;
    for (const c of ancienne.clubs) delete (c as { ovas?: number }).ovas;
    let rejointe = false; let ovasRecus = -1;
    try {
      const apres = agirCarriere(ancienne, 'compte-neuf-0000', { type: 'rejoindre', pseudo: 'Neuf', clubNom: 'Club Neuf' }, T0, 'x');
      rejointe = true; ovasRecus = apres.clubs[apres.clubs.length - 1].ovas;
    } catch { /* échec */ }
    dire(rejointe, '⚠️ une ligue d’avant le réglage des Ovas reste rejoignable', `dotation ramenée à ${ovasRecus}`);
  }

  // ── LE LIEN D'INVITATION ─────────────────────────────────────────────────
  {
    const faux = { origin: 'https://destiny-rugby.fr', pathname: '/' };
    const lien = lienInvitation(e.code, faux);
    dire(lien === `https://destiny-rugby.fr/?ligue=${e.code}`, 'le lien d’invitation porte le code de la ligue', lien);
    dire(codeDansLaRecherche(new URL(lien).search) === e.code, 'et le code se relit à l’arrivée');
    dire(codeDansLaRecherche('?ligue=dr-1eb837651f') === 'DR-1EB837651F', 'un code tapé en minuscules est accepté');
    dire(codeDansLaRecherche('?ligue=') === null && codeDansLaRecherche('') === null
      && codeDansLaRecherche('?ligue=ab') === null && codeDansLaRecherche('?ligue=un%20code') === null,
      '⚠️ et une adresse sans code, ou avec n’importe quoi, ne déclenche rien');
  }

  refuse('gérer la rencontre d’un autre', () => {
    const ailleurs = e.rencontres.find((r) => r.domicile !== colin.id && r.exterieur !== colin.id)!;
    agirCarriere(e, colin.compteId, { type: 'lancerMatch', matchId: ailleurs.id }, T0, 'x');
  });
  // ⚠️ LA FENÊTRE D'INSCRIPTION VA JUSQU'À LA PREMIÈRE JOURNÉE. Le créateur
  // lance la saison dès qu'il a deux clubs : fermer la porte à cet instant
  // condamnait l'ami qui ouvre le lien le lendemain. Tant qu'aucune balle n'a
  // été jouée, l'arrivant entre ET le calendrier est retiré au sort avec lui.
  {
    const avant = e.clubs.length;
    const affichesAvant = e.rencontres.length;
    const tardive = agirCarriere(e, 'compte-tardif', { type: 'rejoindre', pseudo: 'Tardif', clubNom: 'Les Retardataires' }, T0, 'x');
    const arrivant = tardive.clubs.find((c) => c.compteId === 'compte-tardif');
    dire(!!arrivant && tardive.clubs.length === avant + 1,
      'on rejoint tant que la 1re journée n’est pas jouée', `${tardive.clubs.length} clubs`);
    dire(tardive.cartes.filter((c) => c.proprietaire === arrivant?.id).length === 30,
      'et l’arrivant reçoit les mêmes 30 licenciés que les autres');
    const championnat = tardive.competitions.find((c) => c.saison === tardive.saison && c.nom.startsWith('Championnat ·'))!;
    dire(championnat.participants.includes(arrivant!.id),
      '⚠️ il ENTRE dans le championnat en cours', `${championnat.participants.length} participants`);
    dire(tardive.rencontres.length > affichesAvant,
      'et le calendrier est retiré au sort avec lui', `${affichesAvant} → ${tardive.rencontres.length} affiches`);
    dire(tardive.rencontres.some((r) => r.domicile === arrivant!.id || r.exterieur === arrivant!.id),
      'il a bien des affiches à son nom');
    dire(new Set(tardive.rencontres.map((r) => r.id)).size === tardive.rencontres.length,
      '⚠️ et AUCUN identifiant de rencontre n’est en double après le retirage');
    dire(classementCarriere(tardive).some((l) => l.clubId === arrivant!.id),
      'il figure au classement, à zéro match');

    // … et la porte se ferme dès que la première journée est dans les livres.
    // ⚠️ Un match dure QUATRE-VINGTS MINUTES DE VRAIE VIE : la fenêtre qui se
    // ferme donne le coup d'envoi, pas le coup de sifflet final. On avance de
    // deux heures au-delà, sinon la rencontre est en cours et pas encore jouée.
    const journee1 = tardive.rencontres.filter((r) => r.journee === 1);
    const apresJ1 = avancerCarriere(tardive, Math.max(...journee1.map((r) => Date.parse(r.ferme))) + 2 * 3600_000, 'apres-j1');
    dire(apresJ1.rencontres.filter((r) => r.journee === 1).every((r) => !!r.resultat),
      'la première journée se joue', `${journee1.length} matchs`);
    refuse('⚠️ rejoindre APRÈS la première journée', () =>
      agirCarriere(apresJ1, 'compte-trop-tard', { type: 'rejoindre', pseudo: 'Trop tard', clubNom: 'Les Trop Tard' }, T0 + 30 * JOUR, 'y'));
  }

  // La vue ne laisse jamais fuiter ce qui ne regarde pas le joueur.
  const vue = vueCarriere(e, colin.compteId);
  dire(!('graine' in vue), '⚠️ la graine de la ligue ne quitte JAMAIS le serveur');
  dire(vue.clubs.every((c) => !('compteId' in c)), 'aucun identifiant de compte n’est exposé');
  dire(vue.clubs.filter((c) => c.strategie).length === 1, 'seul mon club expose sa stratégie');
  dire(vue.objectifs.every((o) => o.clubId === vue.monClubId), 'je ne vois que mes objectifs');
  const groupes = emblemesCarriere();
  const locaux = groupes.flatMap((g) => g.emblemes).filter((x) => x.logo.startsWith('/logos/')).length;
  dire(groupes.length > 20 && locaux > 700,
    'le sélecteur propose les écussons de tous les championnats du jeu',
    `${groupes.reduce((n, g) => n + g.emblemes.length, 0)} écussons dans ${groupes.length} championnats, dont ${locaux} servis en local`);
  dire(emblemeValide('/logos/toulouse.png') && !emblemeValide('/pirate.png') && !emblemeValide(42),
    '⚠️ un écusson inventé par un client bricolé est REFUSÉ');
  dire(vue.classement.length === 4 && vue.vivierDisponible > 20_000,
    'le classement et le vivier restant sont bien là', `${nb(vue.vivierDisponible)} joueurs libres`);
}

// ═══════════════════════════════════════════════════════════════════════════
titre('9. LA COUPE MAISON DU COMMISSAIRE');
// ═══════════════════════════════════════════════════════════════════════════
{
  let e = ligue(4);
  e = agirCarriere(e, e.clubs[0].compteId, {
    type: 'creerCoupe', nom: 'Christmas Cup', trophee: 'Coupe de Noël',
    participants: e.clubs.map((c) => c.id), format: 'elimination',
    debut: new Date(T0 + JOUR).toISOString(),
    recompenseParticipation: 4_321, recompenseVainqueur: 123_456, recompenseFinaliste: 65_432,
  }, T0, 'coupe');
  const coupe = e.competitions.find((c) => c.nom === 'Christmas Cup')!;
  dire(Boolean(coupe), 'le créateur invente une coupe');
  dire(coupe.recompenseVainqueur === 123_456 && coupe.recompenseFinaliste === 65_432 && coupe.recompenseParticipation === 4_321,
    '⚠️ le commissaire fixe librement les trois montants du cash prize');
  dire(e.rencontres.filter((r) => r.competitionId === coupe.id).length === 2,
    'un tableau à quatre commence par deux demi-finales');
  for (let semaine = 1; semaine <= 20; semaine++) {
    e = avancerCarriere(e, T0 + semaine * 7 * JOUR, `c-${semaine}`);
  }
  const finie = e.competitions.find((c) => c.id === coupe.id)!;
  dire(finie.etat === 'terminee' && Boolean(finie.vainqueur), 'la coupe désigne un vainqueur',
    e.clubs.find((c) => c.id === finie.vainqueur)?.nom);
  dire(e.histoire.some((h) => h.nom === 'Christmas Cup'), 'et son nom entre dans l’histoire de la ligue');
  const gains = e.transactions.filter((t) => t.nature === 'competition' && t.libelle.startsWith('Christmas'));
  dire(gains.length === 4, '⚠️ TOUS LES PARTICIPANTS touchent quelque chose, pas seulement le vainqueur',
    gains.map((g) => nb(g.ovas)).join(' · '));

  let dix = ligue(10);
  dix = agirCarriere(dix, dix.clubs[0].compteId, {
    type: 'creerCoupe', nom: 'Coupe à dix', trophee: 'Coupe des dix',
    participants: dix.clubs.map(c => c.id), format: 'elimination', debut: new Date(T0 + JOUR).toISOString(),
    recompenseParticipation: 0, recompenseVainqueur: 1000, recompenseFinaliste: 500,
  }, T0, 'coupe-dix');
  const coupeDix = dix.competitions.find(c => c.nom === 'Coupe à dix')!;
  dire(dix.rencontres.filter(r => r.competitionId === coupeDix.id && r.journee === 1).length === 5,
    '⚠️ dix clubs jouent cinq matchs dès le premier tour');
}


// ═══════════════════════════════════════════════════════════════════════════
titre('10. LA PHASE FINALE, ET L’IDENTITÉ DE LA LIGUE');
// ═══════════════════════════════════════════════════════════════════════════
{
  let e = creerCarriere({
    id: 'ligue-po', nom: 'Ligue à playoffs', code: 'DR-PO', compteId: 'compte-1',
    pseudo: 'Colin', clubNom: 'Colin RFC', rythme: 2, maxClubs: 20,
    logo: '/logos-competitions/top14.webp', tropheeId: 'brennus', playoffs: true,
  }, T0, 'graine-po');
  for (let i = 2; i <= 6; i++) {
    e = agirCarriere(e, `compte-${i}`, { type: 'rejoindre', pseudo: `Ami ${i}`, clubNom: `Club ${i}` }, T0, `g-${i}`);
  }
  dire(e.logo === '/logos-competitions/top14.webp' && e.tropheeId === 'brennus' && e.playoffs === true,
    'la ligue retient son logo, son trophée et sa phase finale');
  const refuse = creerCarriere({
    id: 'ligue-x', nom: 'Ligue bricolée', code: 'DR-X', compteId: 'compte-x', pseudo: 'Xavier', clubNom: 'Club X',
    rythme: 1, maxClubs: 4, logo: '/pirate.png', tropheeId: 'inexistant', playoffs: true,
  }, T0, 'graine-refus');
  dire(refuse.logo === undefined && refuse.tropheeId === undefined,
    '⚠️ un logo ou un trophée inventé est REFUSÉ, sans casser la création');

  e = agirCarriere(e, 'compte-1', { type: 'demarrerSaison' }, T0, 'saison-po');
  const champ = e.competitions[0];
  dire(champ.playoffs === true && champ.journeesRegulieres === 10,
    'le championnat mémorise ses journées régulières', `${champ.journeesRegulieres} journées`);
  dire(champ.trophee === 'Bouclier de Brennus' && champ.logo === '/logos-competitions/top14.webp',
    'et il porte le nom du trophée choisi', champ.trophee);

  for (let semaine = 1; semaine <= 30 && e.phase === 'saison'; semaine++) {
    e = avancerCarriere(e, T0 + semaine * 3.5 * JOUR, `po-${semaine}`);
  }
  const fini = e.competitions[0];
  const rencontres = e.rencontres.filter((r) => r.competitionId === fini.id);
  const journees = Math.max(...rencontres.map((r) => r.journee));
  dire(journees === 12, '⚠️ deux journées de PHASE FINALE se sont ajoutées aux 10 régulières', `${journees} journées`);
  dire(rencontres.filter((r) => r.journee === 11).length === 2, 'la 11ᵉ journée est une paire de demi-finales');
  dire(rencontres.filter((r) => r.journee === 12).length === 1, 'la 12ᵉ est la finale');

  // Les demi-finales opposent bien 1-4 et 2-3 du classement régulier.
  const regulier = classementCarriere({ ...e, rencontres: e.rencontres.filter((r) => r.journee <= 10) }, fini.id);
  const demies = rencontres.filter((r) => r.journee === 11);
  const paires = demies.map((r) => [regulier.findIndex((l) => l.clubId === r.domicile) + 1, regulier.findIndex((l) => l.clubId === r.exterieur) + 1].sort((a, b) => a - b).join('-')).sort();
  dire(paires.join(' ') === '1-4 2-3', 'et elles opposent le 1ᵉʳ au 4ᵉ, le 2ᵉ au 3ᵉ', paires.join(' · '));
  dire(demies.every((r) => regulier.findIndex((l) => l.clubId === r.domicile) < regulier.findIndex((l) => l.clubId === r.exterieur)),
    'le mieux classé reçoit — c’est l’avantage gagné en saison régulière');

  dire(fini.etat === 'terminee' && Boolean(fini.vainqueur), 'la finale couronne un champion',
    e.clubs.find((c) => c.id === fini.vainqueur)?.nom);
  const finale = rencontres.find((r) => r.journee === 12)!;
  dire([finale.domicile, finale.exterieur].includes(fini.vainqueur!),
    '⚠️ le champion est le VAINQUEUR DE LA FINALE, pas le premier du classement');

  // ⚠️ L'argent suit le classement régulier, le trophée suit la finale.
  const premier = regulier[0].clubId;
  const gains = new Map(e.transactions.filter((t) => t.nature === 'competition').map((t) => [t.clubId, t.ovas]));
  dire(gains.size === 6, 'les six clubs touchent une dotation de compétition');
  if (fini.vainqueur !== premier) {
    dire(gains.get(fini.vainqueur!)! >= gains.get(premier)!,
      'le vainqueur de la finale touche la prime du vainqueur',
      `${nb(gains.get(fini.vainqueur!)!)} contre ${nb(gains.get(premier)!)} au 1ᵉʳ du classement`);
  } else {
    console.log('     (le premier du classement a aussi gagné la finale — pas de divergence à mesurer)');
  }
  dire(e.histoire[0]?.trophee === 'Bouclier de Brennus' && e.histoire[0]?.logo === '/logos-competitions/top14.webp',
    'le palmarès garde le trophée ET le logo de la compétition');

  // Sans phase finale, le champion reste le premier du classement.
  let simple = creerCarriere({ id: 'ligue-sp', nom: 'Sans playoffs', code: 'DR-SP', compteId: 'compte-a', pseudo: 'Anne', clubNom: 'Club A', rythme: 2, maxClubs: 8 }, T0, 'g-sp');
  for (let i = 2; i <= 4; i++) simple = agirCarriere(simple, `compte-a${i}`, { type: 'rejoindre', pseudo: `Ami ${i}`, clubNom: `Club ${i}` }, T0, `g${i}`);
  simple = agirCarriere(simple, 'compte-a', { type: 'demarrerSaison' }, T0, 'sp');
  for (let semaine = 1; semaine <= 20 && simple.phase === 'saison'; semaine++) {
    simple = avancerCarriere(simple, T0 + semaine * 3.5 * JOUR, `sp-${semaine}`);
  }
  const sansPo = simple.competitions[0];
  dire(sansPo.etat === 'terminee' && sansPo.vainqueur === classementCarriere(simple, sansPo.id)[0].clubId,
    'sans phase finale, le champion est bien le premier du classement');
  dire(Math.max(...simple.rencontres.map((r) => r.journee)) === 6,
    'et aucune journée supplémentaire n’est ajoutée', `${Math.max(...simple.rencontres.map((r) => r.journee))} journées`);

  const logos = competitionsCarriere();
  const coupes = tropheesCarriere();
  dire(logos.length > 25 && logos.every((l) => l.logo.startsWith('/logos-competitions/')),
    'les logos de championnat proposés sont ceux du jeu', `${logos.length} logos`);
  dire(coupes.length >= 40 && !coupes.some((t) => t.nom.startsWith('Meilleur')),
    'les trophées proposés sont les trophées d’ÉQUIPE, pas les distinctions individuelles',
    `${coupes.length} trophées`);
}


// ═══════════════════════════════════════════════════════════════════════════
titre('11. LES GARANTIES, ET LA DOTATION DE DÉPART');
// ═══════════════════════════════════════════════════════════════════════════
{
  console.log(`     ${PACKS_CARRIERE.length} packs en boutique · ${new Set(PACKS_CARRIERE.map((p) => p.famille)).size} rayons`);
  dire(PACKS_CARRIERE.length >= 20, 'la boutique propose une vraie variété de packs', `${PACKS_CARRIERE.length} packs`);
  dire(new Set(PACKS_CARRIERE.map((p) => p.id)).size === PACKS_CARRIERE.length, 'aucun identifiant de pack en double');
  dire(PACKS_CARRIERE.every((p) => p.promesse && p.promesse.length > 20), 'chaque pack dit ce qu’il promet');
  // ⚠️ Une ligue créée AVANT une mise à jour doit voir les nouveaux packs, sans
  // que ses prix bougent : la présentation se rafraîchit, l'économie non.
  {
    const ancienne = ligue(4);
    ancienne.packs = ancienne.packs.filter((p) => p.id === 'bronze' || p.id === 'standard');
    ancienne.packs[0].prix = 42;
    const apres = avancerCarriere(ancienne, T0 + 1000, 'maj');
    dire(apres.packs.length === PACKS_CARRIERE.length, '⚠️ une ligue ancienne récupère les packs ajoutés depuis',
      `${ancienne.packs.length} → ${apres.packs.length}`);
    dire(apres.packs.find((p) => p.id === 'bronze')!.prix === 42,
      'et son économie n’est PAS écrasée au passage', 'prix maison conservé');
  }
  dire(PACKS_CARRIERE.every((p) => {
    const total = RARETES_CARRIERE.reduce((s, r) => s + p.probabilites[r], 0);
    return total > 99.9 && total < 100.1;
  }), 'et chaque pack a des probabilités qui font 100 %');

  // ── La garantie tient, sur 60 ouvertures ─────────────────────────────────
  let e = ligue(4);
  const club = e.clubs[0];
  e.clubs[0].ovas = 900_000;
  let sansOr = 0;
  const positions: number[] = [];
  for (let n = 0; n < 60; n++) {
    const avant = e.cartes.length;
    e = agirCarriere(e, club.compteId, { type: 'ouvrirPack', packId: 'or' }, T0 + n * 1000, `g-${n}`);
    const tirees = e.cartes.slice(avant);
    const rang = tirees.findIndex((c) => c.rarete === 'or' || c.rarete === 'elite' || c.rarete === 'star');
    if (rang < 0) sansOr++; else positions.push(rang);
  }
  dire(sansOr === 0, '⚠️ « Or garanti » tient sa promesse sur 60 ouvertures', `${60 - sansOr}/60`);
  // ⚠️ La garantie doit être INVISIBLE quand le hasard a déjà fait le travail :
  // si elle tombait toujours sur la dernière carte, la séquence serait connue
  // d'avance et la révélation n'aurait plus d'intérêt.
  const surLaDerniere = positions.filter((r) => r === 2).length;
  dire(surLaDerniere < 45, 'et elle ne tombe pas systématiquement sur la dernière carte',
    `${surLaDerniere}/60 sur la 3ᵉ carte`);

  let sansElite = 0;
  for (let n = 0; n < 20; n++) {
    const avant = e.cartes.length;
    e = agirCarriere(e, club.compteId, { type: 'ouvrirPack', packId: 'elite' }, T0 + 100_000 + n * 1000, `el-${n}`);
    if (!e.cartes.slice(avant).some((c) => c.rarete === 'elite' || c.rarete === 'star')) sansElite++;
  }
  dire(sansElite === 0, '⚠️ « Élite garantie » aussi', `${20 - sansElite}/20`);

  // Un pack filtré ne rend que ce qu'il annonce.
  const avantCharniere = e.cartes.length;
  e = agirCarriere(e, club.compteId, { type: 'ouvrirPack', packId: 'charniere' }, T0 + 200_000, 'ch');
  const charniere = e.cartes.slice(avantCharniere);
  dire(charniere.every((c) => c.famille === 'demi_melee' || c.famille === 'demi_ouverture'),
    'un pack Charnière ne rend que des demis', charniere.map((c) => `${c.note} ${nomPosteCourt(c.famille)}`).join(' · '));
  const avantGrand = e.cartes.length;
  e = agirCarriere(e, club.compteId, { type: 'ouvrirPack', packId: 'grand' }, T0 + 300_000, 'gr');
  dire(e.cartes.length - avantGrand === 8, 'le Grand pack rend bien huit cartes', `${e.cartes.length - avantGrand}`);

  // ── La dotation de départ ────────────────────────────────────────────────
  const creer = (dotationOvas?: number) => creerCarriere({
    id: `dot-${dotationOvas}`, nom: 'Ligue dotée', code: `DR-D${dotationOvas}`, compteId: 'compte-d',
    pseudo: 'Dorian', clubNom: 'Club doté', rythme: 1, maxClubs: 4, dotationOvas,
  }, T0, 'graine-dotation');
  dire(creer(25_000).clubs[0].ovas === 25_000, 'le créateur fixe les Ovas de départ', '25 000');
  dire(creer(0).clubs[0].ovas === 0, 'il peut n’en donner aucun — tout se gagne alors sur le terrain');
  dire(creer().clubs[0].ovas === 1000, 'sans réglage, la dotation vaut 1 000');
  // ⚠️ LE SEUL ROBINET D'OVAS QUE LE CRÉATEUR OUVRE LUI-MÊME. Sans plafond, il
  // se donne dix millions et le marché de la ligue n'existe plus.
  dire(creer(10_000_000).clubs[0].ovas === DOTATION_MAX,
    '⚠️ et une dotation démesurée est RAMENÉE au plafond', `${nb(DOTATION_MAX)} Ovas`);
  dire(creer(-500).clubs[0].ovas === 0, 'une dotation négative devient zéro');
  dire(creer(1234).clubs[0].ovas === 1200, 'les montants sont arrondis à la centaine', '1 234 → 1 200');
}

// ═══════════════════════════════════════════════════════════════════════════
titre('12. LE COLLECTIF');
// ═══════════════════════════════════════════════════════════════════════════
{
  const catalogue = catalogueMondialCarriere();
  const feuille = (sources: readonly (typeof catalogue)[number][]) => {
    const cartes = sources.slice(0, 23).map((source, i) => carteDepuisSource(source, 'ligue', 'club', 1 + i));
    const composition = compositionManagerParDefaut(cartes.map(coequipierDepuisCarte));
    return { cartes, composition, collectif: collectifCarriere(cartes, composition) };
  };
  const grouper = (cle: (s: (typeof catalogue)[number]) => string) => {
    const m = new Map<string, (typeof catalogue)[number][]>();
    for (const s of catalogue) { if (!m.has(cle(s))) m.set(cle(s), []); m.get(cle(s))!.push(s); }
    return [...m].sort((a, b) => b[1].length - a[1].length)[0][1];
  };

  // Un XV entièrement tiré du même club réel : le maximum.
  const ensemble = feuille(grouper((s) => s.clubReel));
  dire(ensemble.collectif.total === 100, '⚠️ un XV entièrement d’un MÊME CLUB atteint le maximum',
    `${ensemble.collectif.total}/100`);

  // ⚠️ ET UNE MÊME NATION AUSSI, C’EST LA DEMANDE. La première version comptait
  // les liens deux à deux en pesant l’unité quatre fois plus : un XV d’une même
  // nation mais de quinze clubs différents sortait à 43, jugé « trop sévère »
  // en jeu. On compte maintenant la TAILLE DU GROUPE, et tout le XV d’une même
  // nation — ou d’un même championnat — vaut 100.
  const clubsVus = new Set<string>();
  const uneNation = grouper((s) => s.nation).filter((s) => {
    if (clubsVus.has(s.clubReel)) return false;
    clubsVus.add(s.clubReel); return true;
  });
  const nation = feuille(uneNation);
  dire(nation.collectif.total === 100, '⚠️ un XV d’une MÊME NATION vaut 100, même en quinze clubs différents',
    `${nation.collectif.total}/100 · ${new Set(nation.cartes.slice(0, 15).map((c) => c.clubReel)).size} clubs`);

  const clubsVus2 = new Set<string>();
  const unChampionnat = grouper((s) => s.championnat).filter((s) => {
    if (clubsVus2.has(s.clubReel)) return false;
    clubsVus2.add(s.clubReel); return true;
  });
  dire(feuille(unChampionnat).collectif.total === 100, 'et un XV d’un MÊME CHAMPIONNAT aussi',
    `${feuille(unChampionnat).collectif.total}/100`);

  // Un XV où personne ne partage rien : le plancher.
  const nations = new Set<string>();
  const disparate = catalogue.filter((s) => {
    if (nations.has(s.nation)) return false;
    nations.add(s.nation); return true;
  });
  const sansRien = feuille(disparate);
  dire(sansRien.collectif.total <= 15, '⚠️ et un XV sans aucune affinité tombe au plancher',
    `${sansRien.collectif.total}/100`);
  dire(sansRien.collectif.total < ensemble.collectif.total - 60,
    'l’échelle DISCRIMINE : entre les deux, plus de soixante points',
    `${sansRien.collectif.total} contre ${ensemble.collectif.total}`);

  // ⚠️ L’HYBRIDE, ET C’EST LA SECONDE DEMANDE : quatre joueurs d’un même club
  // se suffisent à eux-mêmes. On part du XV dépareillé et on ne change QUE le
  // club réel de quelques titulaires — ni les notes, ni les postes.
  const bloc = (n: number) => {
    const g = feuille(disparate);
    const ids = g.composition.titulaires.slice(0, n);
    for (const id of ids) g.cartes.find((c) => c.id === id)!.clubReel = 'Stade Toulousain';
    const c = collectifCarriere(g.cartes, g.composition);
    return { points: ids.map((id) => c.parCarte[id].points), total: c.total };
  };
  const quatre = bloc(4);
  dire(quatre.points.every((p) => p === 10), '⚠️ QUATRE joueurs d’un même club sont au MAXIMUM, à eux seuls',
    `${quatre.points.join(' / ')} sur 10 · l’équipe passe de ${sansRien.collectif.total} à ${quatre.total}`);
  dire(bloc(3).points.every((p) => p === 8) && bloc(2).points.every((p) => p === 5),
    'à trois ils valent 8, à deux 5 — le bloc se construit, il ne se décrète pas',
    `3 → ${bloc(3).points[0]} · 2 → ${bloc(2).points[0]}`);

  // ⚠️ LE BANC NE COMPTE PAS DU TOUT, et c’est la troisième demande. Ni comme
  // bénéficiaire (pas d’entrée, donc pas de pénalité à l’entrée en jeu), ni
  // comme partenaire — sinon la recette serait connue en un jour : huit joueurs
  // d’un même club sur le banc, et le XV en profite sans que personne ne joue.
  dire(sansRien.composition.remplacants.every((id) => !sansRien.collectif.parCarte[id]),
    '⚠️ un remplaçant n’a AUCUNE note de collectif',
    `${sansRien.composition.remplacants.filter((id) => sansRien.collectif.parCarte[id]).length} sur ${sansRien.composition.remplacants.length} en portent une`);
  const memeClub = grouper((s) => s.clubReel);
  // Le XV reste RIGOUREUSEMENT le meme : on ne remplace que le banc.
  const melange = [
    ...sansRien.composition.titulaires.map((id) => sansRien.cartes.find((c) => c.id === id)!),
    ...memeClub.slice(0, 8).map((source, i) => carteDepuisSource(source, 'ligue', 'club', 100 + i)),
  ];
  const compoMelange = { ...sansRien.composition, remplacants: melange.slice(15).map((c) => c.id) };
  dire(collectifCarriere(melange, compoMelange).total === sansRien.collectif.total,
    '⚠️ un banc entier d’un même club NE CHANGE RIEN au collectif',
    `${collectifCarriere(melange, compoMelange).total}/100`);

  // Le barème de note, et ses deux bouts.
  dire(bonusCollectif(0) === -1 && bonusCollectif(10) === 3, 'le bonus de note va de −1 à +3',
    `${bonusCollectif(0)} → +${bonusCollectif(10)}`);
  dire(bonusCollectif(-50) === -1 && bonusCollectif(9999) === 3, 'et il reste borné hors de l’échelle');

  // ⚠️ L’ÉCRAN ET LE SERVEUR PARTAGENT LA FORMULE. Le collectif affiché à la
  // composition doit être celui qui entre sur le terrain : c’est la raison
  // d’être du module partagé. La feuille GELÉE du match porte les notes telles
  // que le moteur les a reçues, bonus de collectif compris.
  {
    let e = ligue(2);
    const club = e.clubs[0];
    const cartesClub = e.cartes.filter((c) => c.proprietaire === club.id);
    const attendu = collectifCarriere(cartesClub, club.composition);
    const rencontre = e.rencontres.find((r) => [r.domicile, r.exterieur].includes(club.id))!;
    e = avancerCarriere(e, Date.parse(rencontre.ferme) + 1000, 'coup-denvoi');
    const jouee = e.rencontres.find((r) => r.id === rencontre.id)!;
    const cote = jouee.match?.equipes?.domicile.clubId === club.id ? 'domicile' : 'exterieur';
    const gelee = jouee.match?.equipes?.[cote];
    const note = (c: (typeof cartesClub)[number], bonus: number) =>
      Math.round(Math.max(20, Math.min(99, c.note + bonus) - Math.round(c.fatigue * 0.12)));

    const titulaire = club.composition.titulaires[0];
    const carte = cartesClub.find((c) => c.id === titulaire)!;
    const aligne = gelee?.feuille.find((j) => j.id === titulaire);
    const bonus = bonusCollectif(attendu.parCarte[titulaire]?.points ?? 0);
    // La feuille gelée arrondit la note à l’entier : on compare donc à l’arrondi.
    dire(Boolean(aligne) && aligne?.note === note(carte, bonus),
      '⚠️ la note qui entre sur le terrain porte EXACTEMENT le bonus annoncé',
      `${carte.note} → ${aligne?.note} (collectif ${bonus >= 0 ? '+' : ''}${bonus})`);

    // ⚠️ ET LE REMPLAÇANT N’EST PAS PUNI POUR AVOIR ÉTÉ SUR LE BANC. Lire son
    // absence de `parCarte` comme « zéro point » lui coûterait −1 de note à la
    // 60ᵉ minute, pour une règle à laquelle il n’a pas participé.
    const remplacant = club.composition.remplacants[0];
    const carteBanc = cartesClub.find((c) => c.id === remplacant)!;
    const surLeBanc = gelee?.feuille.find((j) => j.id === remplacant);
    dire(Boolean(surLeBanc) && surLeBanc?.note === note(carteBanc, 0),
      '⚠️ et un remplaçant entre avec sa note INTACTE, ni bonus ni pénalité',
      `${carteBanc.note} → ${surLeBanc?.note}`);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
titre('13. LES FAVORIS');
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ LE FAVORI EST UN GARDE-FOU D'ÉCRAN, PAS UNE RÈGLE DE JEU. Il n'interdit
// aucune vente : il retire seulement la carte de « Tout cocher », le geste qui
// en sélectionne cinquante d'un coup et où personne ne relit la liste. Ce banc
// tient les deux bouts — qu'il se pose et se retire, et qu'il ne se transforme
// JAMAIS en verrou déguisé.
{
  let e = ligue(2);
  const [colin, hugo] = e.clubs;
  // On travaille sur des cartes HORS FEUILLE : un titulaire ne part pas, et
  // ce banc mesure le favori, pas la protection de la feuille de match.
  const surLaFeuille = new Set([...colin.composition.titulaires, ...colin.composition.remplacants]);
  const libres = e.cartes.filter((c) => c.proprietaire === colin.id && !c.verrou && !surLaFeuille.has(c.id));
  const mienne = libres[0];

  e = agirCarriere(e, colin.compteId, { type: 'favori', carteId: mienne.id, valeur: true }, T0, 'f1');
  dire(e.cartes.find((c) => c.id === mienne.id)?.favori === true,
    'on marque un joueur de son effectif comme favori', mienne.nom);
  e = agirCarriere(e, colin.compteId, { type: 'favori', carteId: mienne.id, valeur: false }, T0, 'f2');
  dire(e.cartes.find((c) => c.id === mienne.id)?.favori === undefined,
    '⚠️ et on le retire VRAIMENT — pas un `false` qui traîne dans le jsonb');

  // ⚠️ Il ne protège de rien, et c'est le contrat. Le confondre avec un verrou
  // ferait vivre deux règles pour un même geste : celle de l'écran et celle du
  // serveur, qui finiraient par diverger.
  e = agirCarriere(e, colin.compteId, { type: 'favori', carteId: mienne.id, valeur: true }, T0, 'f3');
  let vendu = e;
  try {
    vendu = agirCarriere(e, colin.compteId, { type: 'venteRapide', carteId: mienne.id }, T0, 'f4');
    dire(!vendu.cartes.some((c) => c.id === mienne.id),
      '⚠️ un favori se vend quand même : il écarte du LOT, il ne verrouille pas');
  } catch (erreur) {
    dire(false, '⚠️ un favori se vend quand même : il écarte du LOT, il ne verrouille pas',
      erreur instanceof Error ? erreur.message : 'refusé');
  }

  const sienne = e.cartes.find((c) => c.proprietaire === hugo.id && !c.verrou)!;
  try {
    agirCarriere(e, colin.compteId, { type: 'favori', carteId: sienne.id, valeur: true }, T0, 'f5');
    dire(false, '⚠️ on ne marque pas la carte d’un AUTRE club', 'accepté !');
  } catch (erreur) {
    dire(erreur instanceof Error && erreur.name === 'ErreurCarriere',
      '⚠️ on ne marque pas la carte d’un AUTRE club',
      erreur instanceof Error ? erreur.message : 'erreur inconnue');
  }

  // ⚠️ ET IL NE SUIT PAS LA CARTE CHEZ L'ACHETEUR. C'est la marque d'UN manager
  // sur SON effectif ; la léguer protégerait au nouveau propriétaire une carte
  // qu'il n'a jamais choisi de protéger, sans qu'il sache pourquoi.
  const aVendre = libres[1];
  let f = agirCarriere(e, colin.compteId, { type: 'favori', carteId: aVendre.id, valeur: true }, T0, 'f6');
  f = agirCarriere(f, colin.compteId, { type: 'vendre', carteId: aVendre.id, prix: 100, mode: 'directe', dureeHeures: 2 }, T0, 'f7');
  const vente = f.ventes.find((v) => v.carteId === aVendre.id)!;
  f = agirCarriere(f, hugo.compteId, { type: 'acheter', venteId: vente.id }, T0 + 1000, 'f8');
  const rachetee = f.cartes.find((c) => c.id === aVendre.id)!;
  dire(rachetee.proprietaire === hugo.id && rachetee.favori === undefined,
    '⚠️ le favori TOMBE quand la carte change de club', `${rachetee.nom} → ${hugo.nom}`);
}


// ═══════════════════════════════════════════════════════════════════════════
titre('14. L’ÉCHÉANCE QUI PERMET DE NE PAS RELIRE');
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ C'EST LA PIÈCE DONT UNE ERREUR FIGE LA LIGUE. Le serveur répond « rien
// n'a changé » à un sondage — sans lire l'état, donc sans faire avancer
// l'horloge — tant que la version tient ET que cette échéance est devant nous.
// Une échéance trop LOINTAINE, et un match ne part plus, une enchère ne se
// close plus, les packs quotidiens n'arrivent plus. Une échéance trop PROCHE
// ne coûte qu'une relecture inutile. Ce banc vérifie donc qu'on se trompe
// toujours du bon côté.
{
  const e = ligue(4);
  const maintenant = Date.parse(e.creeLe) + JOUR;

  // ⚠️ AUCUNE DATE DE L'ÉTAT NE PASSE AVANT L'ÉCHÉANCE. C'est l'invariant : si
  // une seule date future se trouvait AVANT elle, ce serait une échéance qu'on
  // manquerait, et la ligue se figerait jusqu'à la suivante.
  const echeance = echeanceLigue(e, maintenant);
  const datesFutures: number[] = [];
  const visiter = (v: unknown, p = 0) => {
    if (p > 8 || v == null) return;
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
        const t = Date.parse(v);
        if (Number.isFinite(t) && t > maintenant) datesFutures.push(t);
      }
      return;
    }
    if (Array.isArray(v)) { for (const x of v) visiter(x, p + 1); return; }
    if (typeof v === 'object') for (const x of Object.values(v)) visiter(x, p + 1);
  };
  visiter(e);
  const plusProche = Math.min(...datesFutures);
  dire(echeance <= plusProche,
    '⚠️ l’échéance ne DÉPASSE JAMAIS la plus proche date future de l’état',
    `${new Date(echeance).toISOString()} ≤ ${new Date(plusProche).toISOString()}`);

  // La clôture d'une rencontre en fait partie : c'est elle qui lance le match
  // quand personne n'est venu, l'invariant n°1 du mode.
  const prochaineCloture = Math.min(...e.rencontres.filter((r) => !r.resultat)
    .map((r) => Date.parse(r.ferme)).filter((t) => t > maintenant));
  dire(!Number.isFinite(prochaineCloture) || echeance <= prochaineCloture,
    'et notamment jamais la clôture de la prochaine rencontre',
    `${new Date(echeance).toISOString()} ≤ ${new Date(prochaineCloture).toISOString()}`);

  // ⚠️ MINUIT COMPTE AUSSI, ET IL N'EST ÉCRIT NULLE PART. Les dix packs
  // quotidiens se déclenchent sur un changement de jour, pas sur une date
  // rangée dans l'état : sans lui, une ligue endormie ne les recevrait qu'à la
  // première action d'un manager.
  dire(echeanceLigue({}, maintenant) === prochainJour(maintenant),
    '⚠️ un état SANS aucune date retient quand même le prochain minuit',
    new Date(echeanceLigue({}, maintenant)).toISOString());
  dire(Number.isFinite(echeanceLigue({}, maintenant)),
    'elle est toujours un instant valide — jamais `null`, jamais `NaN`');

  // Une date PASSÉE n'est pas une échéance : elle ne retiendrait rien.
  const veille = { quand: new Date(maintenant - JOUR).toISOString() };
  dire(echeanceLigue(veille, maintenant) === prochainJour(maintenant),
    'une date déjà passée ne compte pas');

  // Et la plus proche gagne, même enfouie.
  const enfoui = { a: { b: [{ c: new Date(maintenant + 60_000).toISOString() }] }, d: new Date(maintenant + JOUR).toISOString() };
  dire(echeanceLigue(enfoui, maintenant) === maintenant + 60_000,
    '⚠️ et elle se trouve même au fond d’une structure imbriquée',
    'la minute suivante l’emporte sur le lendemain');
}

console.log(`\n  ${ko === 0 ? '✅ La carrière en ligne tient.' : `❌ ${ko} contrôle(s) en échec.`}\n`);
