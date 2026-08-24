// Vérifie que les compétitions de sélections sont JOUÉES et cohérentes.
import {
  internationalEnDirect, affichesInternationales, fenetreInternationale,
  matchInternationalDuJoueur, effectifNational, competitionsDeLaSaison,
  journeesInternationalesA, classementMondial,
} from '../src/lib/international';
import { mondialEnDirect } from '../src/lib/mondial';
import { CALENDRIER } from '../src/data/calendrier';
import { simulerJourneeInternationale, simulerJourneeCoupe } from '../src/lib/moteur/saison';
import type { Joueur } from '../src/types';

console.log('=== 1. LES COMPÉTITIONS SE JOUENT ===');
for (const c of competitionsDeLaSaison(1)) {
  const e = internationalEnDirect(c.id, 1, 99);
  if (!e) { console.log(`  ❌ ${c.id} introuvable`); continue; }
  const matchs = e.journees.flat().length;
  const tete = e.classement[0];
  console.log(`  ${c.emoji} ${c.nom.padEnd(26)} ${e.equipes.length} équipes · ${e.totalJournees} journées · ${matchs} matchs`);
  console.log(`     vainqueur : ${tete.club} (${tete.points} pts, ${tete.gagnes}V ${tete.perdus}D, diff ${tete.difference > 0 ? '+' : ''}${tete.difference})`);
  const impossibles = e.journees.flat().filter((m) => [1, 2, 4].includes(m.scoreD) || [1, 2, 4].includes(m.scoreE)).length;
  console.log(`     scores impossibles au rugby : ${impossibles} ${impossibles === 0 ? '✅' : '❌'}`);
}

console.log('\n=== 2. LA FENÊTRE SUIT LE CALENDRIER ===');
for (const s of CALENDRIER.filter((x) => x.type === 'international')) {
  const f = fenetreInternationale(s.numero, 1);
  console.log(`  sem ${String(s.numero).padStart(2)} ${s.libelle.padEnd(34)} → ${f ? `${f.competition.nom} J${f.journee}` : '—'}`);
}

console.log('\n=== 3. LE MATCH DU JOUEUR ===');
const base = { nom: 'Léo Fabre', poste: 'demi_ouverture', nation: 'France', club: 'Stade Toulousain', division: 'top14', saison: 1 } as unknown as Joueur;
for (const sem of CALENDRIER.filter((x) => x.type === 'international').map((x) => x.numero)) {
  const a = matchInternationalDuJoueur({ ...base, semaine: sem });
  console.log(`  sem ${String(sem).padStart(2)} → ${a ? `${a.competition.nom} J${a.journee} : ${a.match.domicile} ${a.match.scoreD}-${a.match.scoreE} ${a.match.exterieur}` : 'pas de match'}`);
}
const italien = matchInternationalDuJoueur({ ...base, nation: 'Italie', semaine: 22 });
console.log(`  un Italien semaine 22 → ${italien ? italien.match.domicile + ' – ' + italien.match.exterieur : 'pas de match'}`);
const belge = matchInternationalDuJoueur({ ...base, nation: 'Belgique', semaine: 22 });
console.log(`  un Belge semaine 22 → ${belge ? 'match' : 'pas de match (nation hors tournoi) ✅'}`);

console.log('\n=== 4. LES EFFECTIFS DE SÉLECTION ===');
for (const n of ['France', 'Irlande', 'Italie', 'Nouvelle-Zélande']) {
  const g = effectifNational(n, 1);
  const moy = g.slice(0, 23).reduce((s, c) => s + c.note, 0) / Math.min(23, g.length);
  console.log(`  ${n.padEnd(18)} ${g.length} joueurs · 23 meilleurs à ${moy.toFixed(1)} de moyenne`);
  console.log(`     ex. ${g.slice(0, 3).map((c) => `${c.nom} (${c.poste}, ${c.note})`).join(' · ')}`);
}

console.log('\n=== 5. AFFICHES ET PROGRESSION ===');
{
  const j3 = affichesInternationales('sixNations', 1, 1, 1);
  console.log(`  6 Nations J1 : ${j3.map((a) => `${a.domicile} ${a.match?.scoreD}-${a.match?.scoreE} ${a.exterieur}`).join(' · ')}`);
  const aVenir = affichesInternationales('sixNations', 1, 5, 1);
  console.log(`  J5 non jouée : ${aVenir.every((a) => !a.jouee) ? '✅ affiches connues, scores en attente' : '❌'}`);
  for (const sem of [22, 23, 25, 27, 28]) {
    console.log(`  journées disputées au calendrier sem ${sem} : ${journeesInternationalesA('sixNations', sem, 1)}`);
  }
}

console.log('\n=== 6. STATISTIQUES DE FOND : COUPES ET SÉLECTIONS ===');
{
  const t0 = Date.now();
  const inter = simulerJourneeInternationale('sixNations', 1, 1, undefined);
  const ms1 = Date.now() - t0;
  const clubs = [...new Set(inter.map((l) => l.club))];
  const meilleur = [...inter].sort((a, b) => b.plaquages - a.plaquages)[0];
  console.log(`  6 Nations J1 : ${inter.length} lignes · ${clubs.length} sélections · ${ms1} ms`);
  console.log(`     ${clubs.join(' · ')}`);
  console.log(`     top plaqueur : ${meilleur.nom} (${meilleur.club}) — ${meilleur.plaquages} plaquages, ${meilleur.minutes}′`);
  const essais = inter.reduce((s, l) => s + l.essais, 0);
  console.log(`     essais cumulés : ${essais}`);

  const t1 = Date.now();
  const coupe = simulerJourneeCoupe('championsCup', 1, 1, 'Stade Toulousain', undefined);
  const ms2 = Date.now() - t1;
  const clubsC = [...new Set(coupe.map((l) => l.club))];
  console.log(`  Champions Cup J1 : ${coupe.length} lignes · ${clubsC.length} clubs · ${ms2} ms`);
  console.log(`     ${clubsC.slice(0, 6).join(' · ')}…`);
}

// Le compteur des trois sections ajoutées, indépendant de celui du haut.
let rates = 0;
console.log('\n=== 7. ⚠️ LA COUPE DU MONDE SE JOUE VRAIMENT ===');
{
  // Retour de jeu : « gros bug, il n’y a jamais de Coupe du monde jouée ».
  //
  // ⚠️ ELLE EXISTAIT POURTANT DANS LE CODE, et `fenetreInternationale` la
  // rendait bien une saison sur quatre. Ce qui n’existait pas, c’est le
  // TOURNOI : 24 nations dans un mini-championnat de 4 journées dont la
  // quatrième n’était jamais jouée (le calendrier n’en réserve que trois), un
  // classement au barème rugby, et un « vainqueur » qui était le premier de
  // cette ligue interrompue. Ni poule, ni quart, ni finale.
  let echecs7 = 0;
  const dit = (nom: string, valeur: string, ok: boolean) => {
    if (!ok) echecs7++;
    console.log(`  ${ok ? "✅" : "❌"} ${nom.padEnd(46)} ${valeur}`);
  };

  const SAISONS = [4, 8, 12];
  let vainqueurs: string[] = [];
  let sansFinale = 0;
  let nulsEnTableau = 0;
  let scoresImpossibles = 0;
  let poulesIncompletes = 0;
  let matchsEnDouble = 0;
  let seizeIncomplets = 0;
  let sansPetiteFinale = 0;
  let troisiemesHorsPoule = 0;

  for (const saison of SAISONS) {
    const m = mondialEnDirect(saison, 3);
    // ⚠️ FORMAT 2027 : six poules de QUATRE, en toutes rondes. Chaque nation
    //    joue exactement TROIS matchs, contre ses trois adversaires, une fois
    //    chacun. L’ancien format (4 poules de 6, deux matchs) ne pouvait pas
    //    dire « toutes rondes » — et sa première version rejouait une affiche
    //    sur trois.
    for (const p of m.poules) {
      if (p.equipes.length !== 4) poulesIncompletes++;
      const compte = new Map<string, number>();
      const paires = new Set<string>();
      for (const j of p.journees) for (const x of j) {
        compte.set(x.domicile, (compte.get(x.domicile) ?? 0) + 1);
        compte.set(x.exterieur, (compte.get(x.exterieur) ?? 0) + 1);
        const paire = [x.domicile, x.exterieur].sort().join("|");
        if (paires.has(paire)) matchsEnDouble++;
        paires.add(paire);
      }
      for (const e of p.equipes) if (compte.get(e) !== 3) poulesIncompletes++;
    }
    // Les seize : deux par poule + les quatre meilleurs troisièmes.
    if (m.qualifies.length !== 16) seizeIncomplets++;
    // ⚠️ UN REPÊCHÉ DOIT VRAIMENT ÊTRE TROISIÈME DE SA POULE. Le tri des
    //    troisièmes compare des lignes de tableaux DIFFÉRENTS : une erreur
    //    d’index y repêcherait un quatrième sans que rien ne le montre.
    for (const n of m.meilleursTroisiemes) {
      const p = m.poules.find((x) => x.equipes.includes(n));
      if (!p || p.classement[2]?.club !== n) troisiemesHorsPoule++;
    }
    // Le tableau : 8 huitièmes + 4 quarts + 2 demies + finale + petite finale.
    if (m.bracket.length !== 16) sansFinale++;
    if (!m.bracket.some((f) => f.tour === 'petiteFinale')) sansPetiteFinale++;
    for (const f of m.bracket) {
      if (f.scoreD === f.scoreE) nulsEnTableau++;
      for (const sc of [f.scoreD, f.scoreE]) if (sc === 1 || sc === 2 || sc === 4) scoresImpossibles++;
    }
    if (m.vainqueur) vainqueurs.push(m.vainqueur);
  }

  const m4 = mondialEnDirect(4, 3);
  console.log(`  ${"poules".padEnd(46)} ${m4.poules.map((p) => p.equipes.length).join(" · ")}`);
  console.log(`  ${"tableau".padEnd(46)} ${m4.bracket.map((f) => f.tour).join(" · ")}`);
  console.log(`  ${"finale".padEnd(46)} ${m4.bracket.find((f) => f.tour === "finale")?.libelle ?? "aucune"}`);
  console.log(`  ${"3e place".padEnd(46)} ${m4.troisieme ?? "aucun"}`);

  dit(`six poules de quatre, en toutes rondes`,
    poulesIncompletes ? `${poulesIncompletes} anomalie(s)` : `6 poules de 4, 3 matchs chacun`,
    poulesIncompletes === 0);
  dit(`seize qualifiés : 12 + les 4 meilleurs troisièmes`,
    seizeIncomplets ? `${seizeIncomplets} édition(s) incomplète(s)` : `16 à chaque fois`,
    seizeIncomplets === 0);
  dit(`et un repêché est bien 3ᵉ de sa poule`,
    `${troisiemesHorsPoule} anomalie(s)`, troisiemesHorsPoule === 0);
  dit(`le match pour la 3ᵉ place se joue`,
    `${SAISONS.length - sansPetiteFinale}/${SAISONS.length}`, sansPetiteFinale === 0);
  dit(`et jamais deux fois le même adversaire`,
    `${matchsEnDouble} doublon(s)`, matchsEnDouble === 0);
  dit(`le tableau va des huitièmes à la finale (16 matchs)`,
    `${SAISONS.length - sansFinale}/${SAISONS.length} mondiaux complets`, sansFinale === 0);
  dit(`aucun nul à élimination directe`, `${nulsEnTableau}`, nulsEnTableau === 0);
  dit(`aucun score impossible au rugby`, `${scoresImpossibles}`, scoresImpossibles === 0);
  dit(`un champion du monde à chaque édition`,
    vainqueurs.join(" · ") || `aucun`, vainqueurs.length === SAISONS.length);

  // ⚠️ ET LE TITRE VA AU VAINQUEUR DE LA FINALE, pas au premier d’un tableau.
  // C’est le chemin exact que suit `resoudreTrophees` (store).
  const etat = internationalEnDirect('coupeDuMonde', 4, 3, null);
  dit(`le vainqueur du jeu est celui de la finale`,
    `${etat?.vainqueur ?? "aucun"}`, !!etat?.vainqueur && etat.vainqueur === m4.vainqueur);
  // Et une saison ordinaire n’en a pas : c’est la tournée d’automne.
  const auto = internationalEnDirect('autumn', 5, 3, null);
  dit(`une saison ordinaire n’a pas de Mondial`,
    `${auto?.vainqueur ?? "null"}`, !auto?.vainqueur);

  rates += echecs7;
}

console.log('\n=== 8. ⚠️ LA TOURNÉE D’ÉTÉ VA CHEZ LE SUD ===');
{
  // Retour de jeu : « c’est toujours les mêmes matchs pour la tournée d’été ».
  //
  // ⚠️ LE TIRAGE CHANGEAIT BIEN — mesuré, six grilles distinctes sur six
  // saisons. Le défaut était ailleurs : `calendrier()` déroulait un carrousel
  // sur TRENTE-DEUX nations de tous niveaux mélangées, et rendait « Biélorussie
  // 0-81 France », « Russie 0-61 France », « France 68-0 Zimbabwe ». Trois étés
  // de suite avec ce programme et on ne distingue plus une tournée d’une autre :
  // elles se ressemblent parce qu’aucune ne ressemble à quelque chose.
  let echecs8 = 0;
  const dit = (nom: string, valeur: string, ok: boolean) => {
    if (!ok) echecs8++;
    console.log(`  ${ok ? "✅" : "❌"} ${nom.padEnd(46)} ${valeur}`);
  };

  const NORD = ['France', 'Irlande', 'Angleterre', 'Écosse', 'Pays de Galles', 'Italie'];
  const grilles = new Set<string>();
  let nordRecoit = 0;
  let nordContreNord = 0;
  let ecrasements = 0;
  let total = 0;
  const adversaires: string[] = [];

  for (let saison = 1; saison <= 8; saison++) {
    const etat = internationalEnDirect('amicaux', saison, 1, null);
    const affiches = etat?.journees[0] ?? [];
    grilles.add(JSON.stringify(affiches.map((m) => [m.domicile, m.exterieur])));
    for (const m of affiches) {
      total++;
      const dNord = NORD.includes(m.domicile);
      const eNord = NORD.includes(m.exterieur);
      // Une tournée, c’est le Nord qui SE DÉPLACE : il ne reçoit pas.
      if (dNord && !eNord) nordRecoit++;
      if (dNord && eNord) nordContreNord++;
      if (Math.abs(m.scoreD - m.scoreE) >= 60) ecrasements++;
    }
    const fr = affiches.find((m) => m.domicile === 'France' || m.exterieur === 'France');
    if (fr) adversaires.push(fr.domicile === 'France' ? fr.exterieur : fr.domicile);
  }

  console.log(`  ${"la France en tournée".padEnd(46)} ${adversaires.join(" · ")}`);
  dit(`le Nord se déplace, il ne reçoit pas`,
    `${nordRecoit} affiche(s) à l’envers`, nordRecoit === 0);
  dit(`et il ne s’affronte pas lui-même en juillet`,
    `${nordContreNord}`, nordContreNord === 0);
  // ⚠️ SOIXANTE POINTS D’ÉCART, C’EST LE SEUIL DE L’ABSURDE. Un test-match
  // peut être sévère ; « 81-0 » n’est pas un résultat, c’est un tirage raté.
  dit(`plus de déroute à soixante points`,
    `${ecrasements} sur ${total} matchs`, ecrasements <= total * 0.04);
  dit(`et le programme change chaque été`,
    `${grilles.size} grille(s) sur 8 saisons`, grilles.size >= 7);

  rates += echecs8;
}

console.log('\n=== 9. ⚠️ LE CLASSEMENT MONDIAL BOUGE, ET SUR LES BONS RÉSULTATS ===');
{
  // Retour de jeu : « c’est le classement mondial qui doit bouger, pas un
  // classement de toutes les nations ».
  let echecs9 = 0;
  const dit = (nom: string, valeur: string, ok: boolean) => {
    if (!ok) echecs9++;
    console.log(`  ${ok ? "✅" : "❌"} ${nom.padEnd(46)} ${valeur}`);
  };

  const rangs = [1, 2, 3, 4, 5, 6, 7, 8].map((s) =>
    classementMondial(s).find((l) => l.nation === 'France')?.rang ?? 0);
  const bouges = new Set(rangs).size;
  console.log(`  ${"la France, rangs S1→S8".padEnd(46)} ${rangs.join(" → ")}`);
  dit(`le rang d’une nation change avec les saisons`, `${bouges} rang(s) distincts`, bouges >= 3);

  // ⚠️ LE CONTRÔLE QUI COMPTE : le classement doit découler des résultats
  // AFFICHÉS. `appliquerCompetitionAuClassement` rejouait chaque match avec la
  // graine `rang#…` alors que l’écran utilisait `…` tout court : deux graines,
  // donc deux scores. La France pouvait gagner 30-10 à l’écran et perdre dans
  // le calcul du rang, sans que rien ne le montre.
  const tournoi = internationalEnDirect('sixNations', 2, 5, null);
  const affiches = tournoi?.journees.flat() ?? [];
  // ⚠️ ON ENCADRE LE TOURNOI, ET RIEN D’AUTRE. Première version : semaine 1
  // contre semaine 40 — c’est-à-dire la tournée d’automne ET le Tournoi. Une
  // nation qui gagnait cinq matchs en février après en avoir perdu trois en
  // novembre descendait, et le contrôle criait au bug (1/4). Le test était
  // faux, pas le classement : on borne à la fenêtre qu’on mesure.
  const avant = classementMondial(2, 22);
  const apres = classementMondial(2, 30);
  const rangDe = (l: typeof avant, n: string) => l.find((x) => x.nation === n)?.points ?? 0;
  // Une nation qui a tout gagné au Tournoi doit avoir MONTÉ.
  const bilans = new Map<string, number>();
  for (const m of affiches) {
    bilans.set(m.domicile, (bilans.get(m.domicile) ?? 0) + (m.scoreD > m.scoreE ? 1 : -1));
    bilans.set(m.exterieur, (bilans.get(m.exterieur) ?? 0) + (m.scoreE > m.scoreD ? 1 : -1));
  }
  // ⚠️ ON NE TESTE QUE LES BILANS SANS AMBIGUÏTÉ, et c’est la formule World
  // Rugby qui l’impose : l’échange est PONDÉRÉ PAR L’ÉCART DE NOTE. Battre
  // beaucoup plus faible que soi ne rapporte presque rien, perdre contre plus
  // fort ne coûte presque rien — une nation à quatre victoires et une défaite
  // peut donc terminer à l’équilibre, et c’est exact. Un Grand Chelem et un
  // bilan vierge, eux, ne se discutent pas.
  let coherents = 0;
  let observes = 0;
  const joues = new Map<string, number>();
  for (const m of affiches) {
    joues.set(m.domicile, (joues.get(m.domicile) ?? 0) + 1);
    joues.set(m.exterieur, (joues.get(m.exterieur) ?? 0) + 1);
  }
  for (const [nation, bilan] of bilans) {
    const n = joues.get(nation) ?? 0;
    if (n < 3 || Math.abs(bilan) !== n) continue; // ni sans faute, ni bredouille
    observes++;
    const delta = rangDe(apres, nation) - rangDe(avant, nation);
    if (Math.sign(delta) === Math.sign(bilan)) coherents++;
  }
  dit(`un sans-faute monte, une bredouille descend`,
    `${coherents}/${observes} nations`, observes > 0 && coherents === observes);

  rates += echecs9;
}

console.log(rates
  ? `\n❌ ${rates} contrôle(s) international(aux) en échec.`
  : '\n✅ Coupe du monde jouée, tournée d’été crédible, classement mondial vivant.');
if (rates) process.exitCode = 1;
