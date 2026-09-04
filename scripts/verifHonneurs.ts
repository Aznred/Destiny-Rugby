// VÉRIFICATION — LES HONNEURS INDIVIDUELS
//
// Demande : « mets en place les trophées individuels in game, qu'on puisse les
// gagner, et que ça soit par rapport à notre note de saison, nos stats et notre
// palmarès — ce qu'on a gagné dans l'année ».
//
// Ce script met le barème à l'épreuve sans navigateur. Il contrôle huit choses :
//   1. les huit distinctions existent, avec leur modèle 3D, et sont branchées ;
//   2. LES TROIS ENTRÉES COMPTENT VRAIMENT — note de saison, statistiques,
//      palmarès : faire varier chacune, seule, doit déplacer le verdict ;
//   3. l'échelle est juste : une saison correcte ne rapporte rien, une saison
//      historique rapporte tout ;
//   4. le barème est ÉQUITABLE ENTRE LES POSTES (un pilier doit pouvoir être
//      élu, pas seulement un ailier) ;
//   5. les conditions d'accès tiennent (pas de titre européen sans Europe, pas
//      d'homme du match sans finale gagnée, pas de couronne mondiale sans titre) ;
//   6. rien ne se décerne dans un championnat qui n'élit personne ;
//   7. tout est DÉTERMINISTE : rejouer la saison redonne le même verdict ;
//   8. le moteur ne peut pas dépasser `LIMITES.titresParSaison` du classement.
//
// Lancer : npx vite-node scripts/verifHonneurs.ts

import { jouerUneSaison } from './_saison';
import fs from 'node:fs';
import path from 'node:path';
import type { PosteId, StatsDetaillees } from '../src/types';
import {
  BARRES_HONNEURS, decernerHonneurs, noterSaisonIndividuelle, noteStatistiques,
  notePalmares, type SaisonJugee,
} from '../src/lib/honneurs';
import {
  TROPHEES, MEILLEUR_JOUEUR_PAR_DIVISION, estIndividuel,
  HONNEUR_CHAMPIONS_CUP, HONNEUR_FINALE_MONDE, HONNEUR_MONDIAL, HONNEUR_PAR_INTERNATIONAL,
} from '../src/data/trophees';
import { COMPETITIONS } from '../src/data/clubs';

/** Le trophée du Tournoi des 6 Nations : la seule distinction de sélection. */
const HONNEUR_TOURNOI = HONNEUR_PAR_INTERNATIONAL.sixNations;
import { PROFILS } from '../src/lib/statsJoueurs';
import { LIMITES } from '../src/lib/classementMondial';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(52)} ${valeur}`);
}

// --- FABRIQUER UNE SAISON ----------------------------------------------------
// Des statistiques « à la hauteur de son poste » : on multiplie les repères de
// `PROFILS` par un facteur. 1 = exactement ce qu'on attend, 2 = le double.
function statsPour(poste: PosteId, matchs: number, facteur: number): StatsDetaillees {
  const p = PROFILS[poste];
  return {
    points: Math.round(p.essais * matchs * facteur * 5),
    butsTentes: p.buteur > 0.3 ? 40 : 0,
    butsReussis: p.buteur > 0.3 ? Math.round(40 * (0.75 + (facteur - 1) * 0.12)) : 0,
    plaquages: Math.round(p.plaquages * matchs * facteur),
    plaquagesManques: 0,
    grattages: Math.round(p.grattages * matchs * facteur),
    passesDecisives: Math.round(p.passesD * matchs * facteur),
    cartonsJaunes: 0,
    cartonsRouges: 0,
  };
}

/** Le niveau reel d un championnat (0 = elite, 10 = Regionale 3). */
const niveauDe = (id: string) => COMPETITIONS.find((c) => c.id === id)?.niveau ?? 10;

function saison(over: Partial<SaisonJugee> = {}): SaisonJugee {
  const poste = over.poste ?? 'deuxieme_centre';
  const matchs = over.matchs ?? 22;
  const facteur = (over as { facteur?: number }).facteur ?? 1;
  return {
    note: 6,
    reputation: 60,
    poste,
    matchs,
    essais: Math.round(PROFILS[poste].essais * matchs * facteur),
    stats: statsPour(poste, matchs, facteur),
    rang: 5,
    taillePoule: 14,
    titres: [],
    competition: 'top14',
    niveau: 0,
    championsCup: false,
    saison: 5,
    ...over,
  };
}

/** Une saison avec des statistiques calées sur un facteur donné. */
function avecStats(over: Partial<SaisonJugee> & { facteur: number }): SaisonJugee {
  const s = saison(over);
  const matchs = s.matchs;
  return {
    ...s,
    essais: Math.round(PROFILS[s.poste].essais * matchs * over.facteur),
    stats: statsPour(s.poste, matchs, over.facteur),
  };
}

console.log('=== 1. LES HUIT DISTINCTIONS EXISTENT ET SONT BRANCHÉES ===');
{
  const individuels = Object.values(TROPHEES).filter(estIndividuel);
  ligne('distinctions déclarées', `${individuels.length} : ${individuels.map((t) => t.id).join(', ')}`,
    individuels.length === 8);

  const sansModele = individuels.filter((t) => !fs.existsSync(path.join('public', t.modele)));
  ligne('chacune a son modèle 3D',
    sansModele.length ? sansModele.map((t) => t.modele).join(', ') : `${individuels.length}/${individuels.length}`,
    sansModele.length === 0);

  // ⚠️ Un trophée qu'aucun code ne peut décerner est un trophée MORT : il
  // s'affiche dans les données, ne tombe jamais en jeu, et rien ne le signale.
  const decernables = new Set([
    ...Object.values(MEILLEUR_JOUEUR_PAR_DIVISION),
    HONNEUR_CHAMPIONS_CUP, HONNEUR_TOURNOI, HONNEUR_FINALE_MONDE, HONNEUR_MONDIAL,
  ]);
  const morts = individuels.filter((t) => !decernables.has(t.id));
  ligne('aucune distinction morte (jamais décernable)',
    morts.length ? morts.map((t) => t.id).join(', ') : 'aucune', morts.length === 0);

  // Et l'inverse : une table qui cite un trophée inexistant ne tombera jamais.
  const fantomes = [...decernables].filter((id) => !TROPHEES[id]);
  ligne('les tables ne citent que des trophées réels',
    fantomes.length ? fantomes.join(', ') : 'toutes', fantomes.length === 0);
}

console.log('\n=== 2. LES TROIS ENTRÉES COMPTENT VRAIMENT ===');
{
  // ⚠️ C'EST LE CŒUR DE LA DEMANDE. Chaque levier doit, SEUL, déplacer la note.
  const base = saison({ note: 7.5, rang: 3 });
  const n0 = noterSaisonIndividuelle(base);

  const mieuxNote = noterSaisonIndividuelle({ ...base, note: 9 });
  ligne('la note de saison déplace la cote',
    `7,5/10 → ${n0.toFixed(1)} · 9,0/10 → ${mieuxNote.toFixed(1)} (+${(mieuxNote - n0).toFixed(1)})`,
    mieuxNote - n0 > 8);

  const grosseStats = noterSaisonIndividuelle(avecStats({ note: 7.5, rang: 3, facteur: 2 }));
  ligne('les statistiques déplacent la cote',
    `au niveau du poste → ${n0.toFixed(1)} · au double → ${grosseStats.toFixed(1)} (+${(grosseStats - n0).toFixed(1)})`,
    grosseStats - n0 > 6);

  const titre = noterSaisonIndividuelle({ ...base, titres: ['brennus'] });
  const double = noterSaisonIndividuelle({ ...base, titres: ['brennus', 'champions'] });
  ligne('le palmarès de l’année déplace la cote',
    `sans titre ${n0.toFixed(1)} · Brennus ${titre.toFixed(1)} · + Europe ${double.toFixed(1)}`,
    Math.abs((titre - n0) - notePalmares(['brennus'])) < 0.01
      && Math.abs((double - n0) - notePalmares(['brennus', 'champions'])) < 0.01);

  // Et le prestige compte : un titre de Fédérale ne vaut pas un Brennus.
  ligne('le prestige du titre est pris en compte',
    `Fédérale ${notePalmares(['federale']).toFixed(1)} · Brennus ${notePalmares(['brennus']).toFixed(1)} `
    + `· Brennus + Champions Cup ${notePalmares(['brennus', 'champions']).toFixed(1)}`,
    notePalmares(['brennus']) > notePalmares(['federale']) * 2);

  // ⚠️ ET UNE SAISON ÉCOURTÉE NE VAUT PAS UNE SAISON PLEINE : sans le prorata
  // de présence, six matchs énormes battaient vingt-deux bons matchs, et une
  // blessure de six mois devenait le meilleur plan de carrière.
  const pleine = noterSaisonIndividuelle(avecStats({ note: 8.5, matchs: 22, facteur: 1.5 }));
  const ecourtee = noterSaisonIndividuelle(avecStats({ note: 8.5, matchs: 5, facteur: 1.5 }));
  ligne('une saison écourtée ne bat pas une saison pleine',
    `22 matchs → ${pleine.toFixed(1)} · 5 matchs → ${ecourtee.toFixed(1)}`,
    ecourtee < pleine - 15);
}

console.log('\n=== 3. L’ÉCHELLE EST JUSTE ===');
{
  const reperes: [string, SaisonJugee][] = [
    ['saison correcte   (6,0/10, 5ᵉ, sans titre)', saison({ note: 6, rang: 5 })],
    ['bonne saison      (7,5/10, 3ᵉ, sans titre)', saison({ note: 7.5, rang: 3 })],
    ['grande saison     (8,5/10, champion)', avecStats({ note: 8.5, rang: 1, titres: ['brennus'], facteur: 1.4 })],
    ['saison historique (9,5/10, doublé)', avecStats({ note: 9.5, rang: 1, titres: ['brennus', 'champions'], reputation: 92, facteur: 1.8 })],
  ];
  for (const [nom, s] of reperes) {
    console.log(`     ${nom.padEnd(46)} cote ${noterSaisonIndividuelle(s).toFixed(1)}/100`);
  }
  const [, correcte] = reperes[0];
  const [, historique] = reperes[3];
  ligne('une saison correcte ne rapporte RIEN',
    `${decernerHonneurs(correcte).length} distinction(s)`, decernerHonneurs(correcte).length === 0);

  const grande = decernerHonneurs(reperes[2][1]);
  ligne('une grande saison rapporte le titre du championnat',
    grande.length ? grande.map((h) => h.trophee).join(', ') : 'rien',
    grande.some((h) => h.trophee === 'meilleurTop14'));

  const top = decernerHonneurs({ ...historique, championsCup: true, tournoiId: 'sixNations' });
  ligne('une saison historique rapporte la couronne mondiale',
    top.map((h) => h.trophee).join(', ') || 'rien',
    top.some((h) => h.trophee === HONNEUR_MONDIAL));
}

console.log('\n=== 4. LE BARÈME EST ÉQUITABLE ENTRE LES POSTES ===');
{
  // ⚠️ LE PIÈGE CLASSIQUE : noter les essais dans l'absolu. Un pilier n'en
  // marque pas, et aucun avant ne serait jamais élu. On compare donc chaque
  // ligne à `PROFILS[poste]`.
  //
  // ⚠️ MAIS ON NE PEUT PAS EXIGER L'ÉGALITÉ PARFAITE, et il ne faut pas
  // essayer : les statistiques sont des ENTIERS. Un pilier attendu à 1,1 essai
  // n'a le choix qu'entre 1 et 2 — il ne peut pas « faire 60 % de mieux ». Ce
  // qu'on exige, c'est qu'AUCUN POSTE NE SOIT STRUCTURELLEMENT EXCLU : que les
  // quinze maillots atteignent une bonne note en faisant bien leur métier.
  const postes: PosteId[] = ['pilier_gauche', 'talonneur', 'deuxieme_ligne_g', 'numero_8',
    'demi_melee', 'demi_ouverture', 'premier_centre', 'ailier_droit', 'arriere'];
  const notes = postes.map((p) => ({ p, n: noteStatistiques(avecStats({ poste: p, facteur: 1.6 })) }));
  console.log(notes.map((x) => `     ${x.p.padEnd(18)} ${x.n.toFixed(1)}/16`).join('\n'));
  const bas = notes.filter((x) => x.n < 7.5);
  ligne('aucun poste n’est exclu (≥ 7,5/16 à +60 % du poste)',
    bas.length ? bas.map((x) => `${x.p} ${x.n.toFixed(1)}`).join(', ')
      : `de ${Math.min(...notes.map((x) => x.n)).toFixed(1)} à ${Math.max(...notes.map((x) => x.n)).toFixed(1)}`,
    bas.length === 0);
  // L'écart qui reste est celui du BUTEUR, et il est mérité : un ouvreur à 82 %
  // au pied gagne des matchs à lui seul. On refuse en revanche qu'il double.
  const ecart = Math.max(...notes.map((x) => x.n)) - Math.min(...notes.map((x) => x.n));
  ligne('l’écart entre postes reste modéré',
    `${ecart.toFixed(2)} point sur 16`, ecart < 3.2);

  // Et un avant peut réellement décrocher le titre du championnat.
  const pilier = decernerHonneurs(avecStats({
    poste: 'pilier_gauche', note: 9, rang: 1, titres: ['brennus'], reputation: 85, facteur: 1.7,
  }));
  ligne('un pilier peut être élu meilleur joueur',
    pilier.map((h) => h.trophee).join(', ') || 'rien',
    pilier.some((h) => h.trophee === 'meilleurTop14'));

  // La discipline pèse : un carton rouge coûte cher.
  const propre = avecStats({ note: 8.5, rang: 1, titres: ['brennus'], facteur: 1.5 });
  const expulse = { ...propre, stats: { ...propre.stats!, cartonsRouges: 1, cartonsJaunes: 3 } };
  ligne('l’indiscipline se paie',
    `${noterSaisonIndividuelle(propre).toFixed(1)} → ${noterSaisonIndividuelle(expulse).toFixed(1)}`,
    noterSaisonIndividuelle(expulse) < noterSaisonIndividuelle(propre) - 3);
}

console.log('\n=== 5. LES CONDITIONS D’ACCÈS TIENNENT ===');
{
  const enorme = avecStats({
    note: 9.8, rang: 1, titres: ['brennus'], reputation: 100, facteur: 2.2,
  });

  const sansEurope = decernerHonneurs({ ...enorme, championsCup: false });
  ligne('pas de titre européen sans disputer l’Europe',
    sansEurope.map((h) => h.trophee).join(', ') || 'rien',
    !sansEurope.some((h) => h.trophee === HONNEUR_CHAMPIONS_CUP));
  const avecEurope = decernerHonneurs({ ...enorme, championsCup: true });
  ligne('… et il tombe quand on la dispute',
    avecEurope.map((h) => h.trophee).join(', ') || 'rien',
    avecEurope.some((h) => h.trophee === HONNEUR_CHAMPIONS_CUP));

  const sansSelection = decernerHonneurs({ ...enorme, tournoiId: undefined });
  ligne('pas de meilleur joueur du Tournoi sans sélection',
    sansSelection.map((h) => h.trophee).join(', ') || 'rien',
    !sansSelection.some((h) => h.trophee === HONNEUR_TOURNOI));
  const avecTournoi = decernerHonneurs({ ...enorme, tournoiId: 'sixNations' });
  ligne('… et il tombe quand on l’a disputé',
    avecTournoi.map((h) => h.trophee).join(', ') || 'rien',
    avecTournoi.some((h) => h.trophee === HONNEUR_TOURNOI));

  // ⚠️ BUG DE JEU, GARDÉ SOUS TEST : « j’ai gagné les Six Nations meilleur
  // joueur en étant sud-africain ». Un Springbok dispute le Rugby
  // Championship, pas le Tournoi — et le jeu lui décernait quand même le
  // trophée du Tournoi, parce que la condition était un booléen « il joue la
  // compétition de sa fenêtre de février ».
  for (const id of ['rugbyChampionship', 'recEurope', 'americasChamp', 'oceaniaCup']) {
    const autre = decernerHonneurs({ ...enorme, tournoiId: id });
    ligne(`pas de trophée du Tournoi en jouant ${id}`,
      autre.map((h) => h.trophee).join(', ') || 'rien',
      !autre.some((h) => h.trophee === HONNEUR_TOURNOI));
  }

  const sansFinale = decernerHonneurs({ ...enorme, titres: ['brennus'] });
  ligne('pas d’homme du match sans finale du monde gagnée',
    sansFinale.map((h) => h.trophee).join(', ') || 'rien',
    !sansFinale.some((h) => h.trophee === HONNEUR_FINALE_MONDE));
  const championDuMonde = decernerHonneurs({ ...enorme, titres: ['brennus', 'monde'] });
  ligne('… et il tombe quand on l’a gagnée',
    championDuMonde.map((h) => h.trophee).join(', ') || 'rien',
    championDuMonde.some((h) => h.trophee === HONNEUR_FINALE_MONDE));

  const sansTitre = decernerHonneurs({ ...enorme, titres: [] });
  ligne('pas de couronne mondiale sans un titre dans l’année',
    sansTitre.map((h) => h.trophee).join(', ') || 'rien',
    !sansTitre.some((h) => h.trophee === HONNEUR_MONDIAL));
}

console.log('\n=== 6. RIEN NE SE DÉCERNE LÀ OÙ PERSONNE N’ÉLIT ===');
{
  // Une saison énorme en Fédérale 2 ne rapporte aucune distinction de
  // championnat : ces divisions n'en décernent pas, et c'est voulu.
  const amateurs = ['fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3', 'nationale', 'nationale2', 'prod2'];
  const fautifs = amateurs.filter((c) => decernerHonneurs(avecStats({
    competition: c, niveau: niveauDe(c), note: 9.8, rang: 1, titres: ['federale'],
    reputation: 95, facteur: 2.2, taillePoule: 12,
  })).length > 0);
  ligne('aucune distinction hors des cinq championnats concernés',
    fautifs.length ? fautifs.join(', ') : `${amateurs.length} championnats testés`,
    fautifs.length === 0);

  const attendus = ['top14', 'premiership', 'urc', 'super', 'npc'];
  const manquants = attendus.filter((c) => !decernerHonneurs(avecStats({
    competition: c, niveau: niveauDe(c), note: 9.4, rang: 1, titres: ['brennus'],
    reputation: 92, facteur: 2, taillePoule: 12,
  })).some((h) => h.trophee === MEILLEUR_JOUEUR_PAR_DIVISION[c]));
  ligne('les cinq championnats concernés décernent bien',
    manquants.length ? `sans titre : ${manquants.join(', ')}` : attendus.join(', '),
    manquants.length === 0);
}

console.log('\n=== 6 bis. LA COURONNE MONDIALE NE SORT PAS DU MONDE AMATEUR ===');
{
  // ⚠️ BUG DE JEU, GARDÉ SOUS TEST : « j’ai gagné le meilleur joueur de
  //    l’année en étant en Nationale 2, j’avais 9,6 de note moyenne ». La note
  //    de saison est RELATIVE au groupe : trop fort pour son étage, on frôle le
  //    10 sans effort. La sélection nationale suffisait alors à ouvrir la
  //    vitrine mondiale, et un amateur convoqué chez lui décrochait la couronne.
  for (const c of ['nationale2', 'fed1', 'fed2', 'reg1', 'reg3']) {
    const enAmateur = decernerHonneurs(avecStats({
      competition: c, niveau: niveauDe(c), note: 9.8, rang: 1,
      titres: ['federale'], reputation: 98, facteur: 2.4, taillePoule: 12,
      tournoiId: 'sixNations', championsCup: true,
    }));
    ligne(`pas de couronne mondiale depuis ${c}`,
      enAmateur.map((h) => h.trophee).join(', ') || 'rien',
      !enAmateur.some((h) => h.trophee === 'meilleurJoueur'));
  }

  // Et la porte reste ouverte là où le monde regarde vraiment.
  const enPro = decernerHonneurs(avecStats({
    competition: 'top14', niveau: niveauDe('top14'), note: 9.5, rang: 1,
    titres: ['brennus', 'champions'], reputation: 96, facteur: 2, taillePoule: 14,
    tournoiId: 'sixNations', championsCup: true,
  }));
  ligne('… mais elle reste atteignable en Top 14',
    enPro.map((h) => h.trophee).join(', ') || 'rien',
    enPro.some((h) => h.trophee === 'meilleurJoueur'));
}

console.log('\n=== 7. TOUT EST DÉTERMINISTE ===');
{
  const s = avecStats({ note: 8.7, rang: 1, titres: ['brennus'], championsCup: true, facteur: 1.6 });
  const a = decernerHonneurs(s).map((h) => `${h.trophee}@${h.barre.toFixed(3)}`).join('|');
  const b = decernerHonneurs(s).map((h) => `${h.trophee}@${h.barre.toFixed(3)}`).join('|');
  ligne('deux appels, même verdict', a === b ? (a || 'rien') : `${a} ≠ ${b}`, a === b);

  // ⚠️ Mais la barre BOUGE d'une saison à l'autre : c'est le rival de l'année.
  const barres = new Set(
    Array.from({ length: 12 }, (_, k) => decernerHonneurs({ ...s, saison: k + 1 })[0]?.barre.toFixed(3)),
  );
  ligne('la barre varie d’une saison à l’autre',
    `${barres.size} valeurs distinctes sur 12 saisons`, barres.size >= 6);
}

console.log('\n=== 8. LE PLAFOND DU CLASSEMENT MONDIAL TIENT ===');
{
  // Le maximum théorique que le moteur peut produire en une saison : quatre
  // titres collectifs (championnat, Europe, Tournoi, Coupe du monde) et les
  // cinq distinctions. Il doit rester sous `LIMITES.titresParSaison`.
  const parfaite = avecStats({
    note: 9.8, rang: 1, reputation: 100, facteur: 2.4,
    titres: ['brennus', 'champions', 'sixNations', 'monde'],
    championsCup: true, tournoiId: 'sixNations',
  });
  const individuels = decernerHonneurs(parfaite).length;
  const total = parfaite.titres.length + individuels;
  ligne('la saison la plus riche possible reste sous le plafond',
    `${parfaite.titres.length} collectifs + ${individuels} distinctions = ${total} (plafond ${LIMITES.titresParSaison})`,
    total <= LIMITES.titresParSaison);
}

console.log('\n=== 9. UNE PROJECTION ACCÉLÉRÉE N’INVENTE PAS DES HONNEURS ===');
{
  // Cette projection saute les semaines avec `saisonSuivante` : elle contrôle
  // la robustesse des intersaisons, mais ne joue aucun match et ne doit donc
  // pas être présentée comme une mesure d'équilibrage d'une vraie carrière.
  // Son invariant utile est inverse : sans statistiques vécues, elle ne doit
  // pas fabriquer une distinction individuelle.
  const { useGame, noteGlobale } = await import('../src/store/useGame');
  const g = () => useGame.getState();
  const compte = new Map<string, number>();
  const cotes: number[] = [];
  const generales: number[] = [];
  let carrieresPrimees = 0;
  let collectifs = 0;
  let carrieresEnVue = 0; // carrières ayant atteint une compétition qui élit

  // Même départ que `verifDifficulte.ts` : Nationale 2, 18 ans.
  for (let n = 0; n < 60; n++) {
    const pantheonAvant = g().pantheon.length;
    g().reinitialiser();
    g().creerJoueur({
      nom: `Test${n}`, poste: 'deuxieme_centre', nation: 'France',
      club: 'Stade Nantais', division: 'nationale2', age: 18,
    });
    for (let s = 0; s < 14; s++) {
      // Un contrat arrivé à terme bloque la saison tant qu'on n'a pas signé
      // (voir `saisonSuivante`) : `jouerUneSaison` négocie à notre place.
      jouerUneSaison(g, (p) => useGame.setState(p));
    }
    // ⚠️ ON LIT LA COTE DANS LE JOURNAL, c'est-à-dire EXACTEMENT ce que le
    // joueur voit à l'écran. Un test qui recalculerait la cote de son côté
    // vérifierait sa propre arithmétique, pas ce que la partie affiche.
    let enVue = false;
    for (const e of g().journal) {
      const m = /cotée (\d+)\/100/.exec(e.titre);
      if (m) { cotes.push(Number(m[1])); enVue = true; }
    }
    if (enVue) carrieresEnVue++;
    const joueurFinal = g().joueur;
    const legende = !joueurFinal && g().pantheon.length > pantheonAvant ? g().pantheon.at(-1) : undefined;
    const noteFinale = joueurFinal ? noteGlobale(joueurFinal) : legende?.note;
    if (noteFinale === undefined) {
      throw new Error(`La carrière ${n + 1} n'a ni joueur actif ni bilan au Panthéon.`);
    }
    generales.push(noteFinale);
    const tropheeIds = joueurFinal
      ? (joueurFinal.palmares ?? []).map((t) => t.trophee)
      : (legende?.tropheeIds ?? []);
    let perso = 0;
    for (const tropheeId of tropheeIds) {
      if (estIndividuel(TROPHEES[tropheeId])) {
        compte.set(tropheeId, (compte.get(tropheeId) ?? 0) + 1);
        perso++;
      } else collectifs++;
    }
    if (perso > 0) carrieresPrimees++;
  }

  const total = [...compte.values()].reduce((a, b) => a + b, 0);
  cotes.sort((a, b) => a - b);
  generales.sort((a, b) => a - b);
  const centile = (p: number) => cotes[Math.min(cotes.length - 1, Math.floor(cotes.length * p))] ?? 0;
  console.log(`     60 projections × 14 intersaisons, départ Nationale 2 à 18 ans`);
  console.log(`     générale finale : médiane ${generales[30]} · max ${generales[59]}`);
  console.log(`     ${collectifs} titres collectifs · ${total} distinctions individuelles`);
  console.log(`     ${carrieresEnVue}/60 carrières ont atteint une compétition qui élit,`
    + ` soit ${cotes.length} saisons :`);
  console.log(`       cote médiane ${centile(0.5)} · 90ᵉ centile ${centile(0.9)}`
    + ` · maximum ${cotes[cotes.length - 1] ?? 0} (barre ${BARRES_HONNEURS.championnat})`);
  for (const [id, n] of [...compte].sort((a, b) => b[1] - a[1])) {
    console.log(`       ${(TROPHEES[id]?.nom ?? id).padEnd(42)} ${n}`);
  }
  ligne('aucune distinction inventée sans matchs joués',
    `${carrieresPrimees}/60 projection(s) primée(s)`,
    carrieresPrimees === 0 && total === 0);
  ligne('… mais elles restent rares',
    `${(total / 60).toFixed(2)} distinction(s) par carrière de 14 saisons`,
    total / 60 <= 3);
}

console.log('\n     Barres : championnat ' + BARRES_HONNEURS.championnat
  + ' · Champions Cup ' + BARRES_HONNEURS.championsCup
  + ' · Tournoi ' + BARRES_HONNEURS.tournoi
  + ' · finale du monde ' + BARRES_HONNEURS.finaleMonde
  + ' · monde ' + BARRES_HONNEURS.mondial);
console.log(echecs === 0 ? '\n✅ Honneurs individuels conformes.' : `\n❌ ${echecs} contrôle(s) en échec.`);
