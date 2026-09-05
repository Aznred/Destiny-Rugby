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
  agirCarriere, avancerCarriere, classementCarriere, creerCarriere, vueCarriere,
} from '../src/lib/ligue/carriere';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';
import {
  avancerMatchEnLigne, cibleDeScore, commanderMatchEnLigne, conclureMatchEnLigne,
  creerMatchEnLigne, decisionIA, forceFeuille, MS_PAR_MINUTE, STRATEGIE_EN_LIGNE_DEFAUT,
  strategieValide, impactStrategie, tactiqueDepuisStrategie, mentaliteAppliquee,
} from '../src/lib/ligue/matchCarriere';
import {
  catalogueMondialCarriere, catalogueParRarete, coequipierDepuisCarte,
  competitionsCarriere, dotationBronzeCarriere, emblemesCarriere, emblemeValide, PACKS_CARRIERE, rareteCarriere, rayonDePack, tropheesCarriere,
} from '../src/lib/ligue/catalogueCarriere';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';

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
  const poids = JSON.stringify(e).length;
  dire(poids < 900_000, 'et l’état complet d’une ligue de six tient sous 900 Ko', `${nb(poids / 1024)} Ko`);
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
  dire(parMatch < 400, 'un match complet se rejoue en moins de 400 ms', `${parMatch.toFixed(0)} ms`);

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
  dire(e.clubs.every((c) => c.ova > 0), 'les OVA du match sont versés à tout le monde',
    e.clubs.map((c) => nb(c.ova)).join(' · '));
  const classement = classementCarriere(e);
  dire(classement.reduce((s, l) => s + l.joues, 0) === jouees.length * 2,
    'le classement compte exactement les matchs joués');

  // Idempotence : une deuxième avance à la même date ne double rien.
  const avant = e.clubs.map((c) => c.ova).join('|');
  const encore = avancerCarriere(e, T0 + 7 * JOUR + 3600_000, 'graine-tick');
  dire(encore.clubs.map((c) => c.ova).join('|') === avant,
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

  const avants = rayonDePack('or', 'avants');
  const arrieres = rayonDePack('or', 'arrieres');
  dire(avants.length > 100 && arrieres.length > 100 && avants.length + arrieres.length === bandes.or.length,
    '⚠️ le pack Avants et le pack Arrières se partagent exactement le catalogue',
    `${nb(avants.length)} + ${nb(arrieres.length)}`);
  dire(rayonDePack('or', 'france').every((c) => c.pays === 'France'), 'le pack France ne contient que la France');
  dire(rayonDePack('or', 'international').every((c) => c.pays !== 'France'), 'le pack International n’en contient aucun');

  // Ouverture réelle : 60 packs Premium dans une ligue.
  let e = ligue(4);
  const club = e.clubs[0];
  e.clubs[0].ova = 200_000;
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

  const soldes = e.clubs.map((c) => c.ova).sort((a, b) => b - a);
  console.log(`     OVA en fin de saison : ${soldes.map(nb).join(' · ')}`);
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
  for (const club of e.clubs) club.ova = 50_000;
  // Colin remplit son effectif pour pouvoir vendre sans casser sa profondeur.
  for (let n = 0; n < 6; n++) {
    e = agirCarriere(e, colin.compteId, { type: 'ouvrirPack', packId: 'premium' }, T0 + n * 1000, `p-${n}`);
  }
  const aVendre = e.cartes.filter((c) => c.proprietaire === colin.id && c.origine !== 'formation')
    .sort((a, b) => b.note - a.note)[0];
  e = agirCarriere(e, colin.compteId, { type: 'vendre', carteId: aVendre.id, prix: 9_000, mode: 'directe', dureeHeures: 24 }, T0, 'v');
  dire(e.ventes.length === 1 && e.ventes[0].etat === 'ouverte', 'une carte se met en vente', `${aVendre.nom} (${aVendre.note})`);
  dire(e.cartes.find((c) => c.id === aVendre.id)!.verrou === e.ventes[0].id,
    '⚠️ et elle est VERROUILLÉE : impossible de la vendre deux fois');

  const soldeColin = e.clubs.find((c) => c.id === colin.id)!.ova;
  const soldeHugo = e.clubs.find((c) => c.id === hugo.id)!.ova;
  e = agirCarriere(e, hugo.compteId, { type: 'acheter', venteId: e.ventes[0].id }, T0 + 1000, 'a');
  dire(e.cartes.find((c) => c.id === aVendre.id)!.proprietaire === hugo.id, 'l’acheteur reçoit la carte');
  dire(e.clubs.find((c) => c.id === colin.id)!.ova === soldeColin + 9_000, 'le vendeur est crédité', '+9 000 OVA');
  dire(e.clubs.find((c) => c.id === hugo.id)!.ova === soldeHugo - 9_000, 'l’acheteur est débité', '−9 000 OVA');
  dire(e.cartes.find((c) => c.id === aVendre.id)!.clubs.length === 2, 'la carte garde la trace de ses clubs successifs');

  // Enchère : la surenchère rend ses OVA au perdant.
  const autre = e.cartes.filter((c) => c.proprietaire === colin.id && c.origine !== 'formation').sort((a, b) => b.note - a.note)[0];
  e = agirCarriere(e, colin.compteId, { type: 'vendre', carteId: autre.id, prix: 1_000, mode: 'enchere', dureeHeures: 2 }, T0 + 2000, 'e');
  const enchere = e.ventes[e.ventes.length - 1].id;
  e = agirCarriere(e, hugo.compteId, { type: 'encherir', venteId: enchere, montant: 1_500 }, T0 + 3000, 'e1');
  const apresPremiere = e.clubs.find((c) => c.id === hugo.id)!.ova;
  e = agirCarriere(e, e.clubs[2].compteId, { type: 'encherir', venteId: enchere, montant: 3_000 }, T0 + 4000, 'e2');
  dire(e.clubs.find((c) => c.id === hugo.id)!.ova === apresPremiere + 1_500,
    '⚠️ un enchérisseur dépassé RÉCUPÈRE ses OVA immédiatement');
  e = avancerCarriere(e, T0 + 3 * 3600_000, 'fin-enchere');
  const vendue = e.ventes.find((v) => v.id === enchere)!;
  dire(vendue.etat === 'vendue' && e.cartes.find((c) => c.id === autre.id)!.proprietaire === e.clubs[2].id,
    'à l’expiration, la carte part au plus offrant', `${nb(vendue.enchere!.montant)} OVA`);

  // Échange croisé.
  const mien = e.cartes.filter((c) => c.proprietaire === colin.id && c.origine !== 'formation')[0];
  const sien = e.cartes.filter((c) => c.proprietaire === hugo.id && c.origine !== 'formation')[0];
  if (mien && sien) {
    e = agirCarriere(e, colin.compteId, {
      type: 'proposerEchange', vers: hugo.id, cartesDonnees: [mien.id], cartesDemandees: [sien.id],
      ovaDonnes: 2_000, ovaDemandes: 0,
    }, T0 + 5000, 'ec');
    dire(e.echanges.length === 1, 'une offre d’échange se propose');
    e = agirCarriere(e, hugo.compteId, { type: 'repondreEchange', echangeId: e.echanges[0].id, accepter: true }, T0 + 6000, 'ec2');
    dire(e.cartes.find((c) => c.id === mien.id)!.proprietaire === hugo.id
      && e.cartes.find((c) => c.id === sien.id)!.proprietaire === colin.id,
      '⚠️ LES DEUX ONT ACCEPTÉ : les cartes changent de mains ensemble');
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
  refuse('ouvrir un pack sans les OVA', () =>
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
  refuse('gérer la rencontre d’un autre', () => {
    const ailleurs = e.rencontres.find((r) => r.domicile !== colin.id && r.exterieur !== colin.id)!;
    agirCarriere(e, colin.compteId, { type: 'lancerMatch', matchId: ailleurs.id }, T0, 'x');
  });
  refuse('rejoindre une ligue déjà lancée', () =>
    agirCarriere(e, 'compte-inconnu', { type: 'rejoindre', pseudo: 'Tricheur', clubNom: 'Club fantôme' }, T0, 'x'));

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
    recompenseParticipation: 1_000, recompenseVainqueur: 10_000, recompenseFinaliste: 5_000,
  }, T0, 'coupe');
  const coupe = e.competitions.find((c) => c.nom === 'Christmas Cup')!;
  dire(Boolean(coupe), 'le créateur invente une coupe');
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
    gains.map((g) => nb(g.ova)).join(' · '));
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
  const gains = new Map(e.transactions.filter((t) => t.nature === 'competition').map((t) => [t.clubId, t.ova]));
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

console.log(`\n  ${ko === 0 ? '✅ La carrière en ligne tient.' : `❌ ${ko} contrôle(s) en échec.`}\n`);
