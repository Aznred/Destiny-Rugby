// VÉRIFICATION — RARETÉS DE CARTE, GÉNÉRAL DU MARCHÉ, EMPLACEMENTS DE PARTIE
//
// Trois demandes d'un même message, et trois choses mesurables :
//
//   « faire comme sur FIFA des raretés de carte en mode bronze argent or
//     mythique rouge épique etc. en fonction du potentiel, de la qualité du
//     joueur etc. »
//   « dans le marché mondial, fix les généraux »
//   « faire en sorte de pouvoir avoir plusieurs sauvegardes de joueurs et
//     entraîneur »
//
// ⚠️ LE CONTRÔLE QUI COMPTE VRAIMENT EST LE 2. Une échelle de rareté n'a de
// sens que si elle est MONOTONE (un meilleur joueur ne descend jamais d'un
// cran) et si elle reste RARE en haut : si un effectif de Fédérale sort trois
// cartes légende, la couleur ne dit plus rien et on a juste repeint le jeu.
//
// Lancer : npx vite-node scripts/verifRaretes.ts

import { POSTES } from '../src/data/rugby';
import type { PosteId } from '../src/types';
import {
  NOM_RARETE, ORDRE_RARETE, estPepite, rareteDe, statutDe, valeurDeCarte,
} from '../src/lib/carteJoueur';
import type { RareteCarte } from '../src/lib/carteJoueur';
import { rapportConnaissance } from '../src/lib/carriereAvancee';
import { effectifDuClub } from '../src/lib/effectif';
import { COMPETITIONS } from '../src/data/clubs';
import {
  NB_EMPLACEMENTS, cleDe, emplacementActif, listerEmplacements,
  stockageParEmplacement, supprimerEmplacement,
} from '../src/lib/sauvegardes';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(58)} ${valeur}`);
}
function info(libelle: string, valeur: string): void {
  console.log(`     ${libelle.padEnd(58)} ${valeur}`);
}

const ARRIERE = POSTES.find((p) => p.famille === 'arriere')!.id as PosteId;
function joueur(id: string, note: number, age = 27, potentiel = note) {
  return { id, nom: id, poste: ARRIERE, age, note, potentiel, nation: 'France', regen: false };
}

// ---------------------------------------------------------------------------
console.log('\n=== 1. LES SIX RARETÉS EXISTENT, ET ELLES SE SUIVENT ===');
// ---------------------------------------------------------------------------
console.log('');
const paliers: Record<RareteCarte, number[]> = {
  bronze: [], argent: [], or: [], epique: [], mythique: [], legende: [],
};
for (let note = 20; note <= 99; note++) paliers[rareteDe(joueur(`n${note}`, note))].push(note);
for (const r of ORDRE_RARETE) {
  const l = paliers[r];
  info(`${NOM_RARETE[r].padEnd(9)} (${r})`, l.length ? `notes ${l[0]} à ${l.at(-1)}` : 'aucune');
}
ligne(
  'les six raretés sont atteignables',
  `${ORDRE_RARETE.filter((r) => paliers[r].length).length}/6`,
  ORDRE_RARETE.every((r) => paliers[r].length > 0),
);

// ⚠️ MONOTONIE : à âge et potentiel égaux, un joueur mieux noté ne peut pas
// tomber dans une rareté INFÉRIEURE. C'est le contrôle qui attrape un seuil mal
// ordonné — l'erreur la plus facile à commettre dans une table de paliers, et
// la plus difficile à voir à l'écran.
let recul = 0;
for (let note = 21; note <= 99; note++) {
  const avant = ORDRE_RARETE.indexOf(rareteDe(joueur('a', note - 1)));
  const apres = ORDRE_RARETE.indexOf(rareteDe(joueur('a', note)));
  if (apres < avant) recul++;
}
ligne('l’échelle ne recule jamais quand la note monte', `${recul} recul(s)`, recul === 0);

// ---------------------------------------------------------------------------
console.log('\n=== 2. LE POTENTIEL COMPTE, ET IL COMPTE MOINS AVEC L’ÂGE ===');
// ---------------------------------------------------------------------------
console.log('');
// Demande : « en fonction du potentiel, de la qualité du joueur etc. »
const espoir = joueur('espoir', 74, 19, 92);
const cadre = joueur('cadre', 74, 30, 92);
info('74 à 19 ans, potentiel 92', `${NOM_RARETE[rareteDe(espoir)]} (valeur ${valeurDeCarte(espoir).toFixed(1)})`);
info('74 à 30 ans, potentiel 92', `${NOM_RARETE[rareteDe(cadre)]} (valeur ${valeurDeCarte(cadre).toFixed(1)})`);
ligne(
  'le même joueur vaut plus jeune que vieux',
  `${valeurDeCarte(espoir).toFixed(1)} > ${valeurDeCarte(cadre).toFixed(1)}`,
  valeurDeCarte(espoir) > valeurDeCarte(cadre),
);
ligne(
  '⚠️ un potentiel inatteignable ne vaut rien à 30 ans',
  `valeur ${valeurDeCarte(cadre)} = note ${cadre.note}`,
  valeurDeCarte(cadre) === cadre.note,
);
// ⚠️ ET LA PART DE POTENTIEL EST BORNÉE. Sans plafond, un gamin noté 50 pour un
// potentiel de 95 passerait devant un international : on collectionnerait des
// promesses, plus des joueurs.
const promesse = joueur('promesse', 50, 17, 95);
const inter = joueur('inter', 84, 28, 84);
ligne(
  '⚠️ une promesse ne dépasse pas un international confirmé',
  `${valeurDeCarte(promesse).toFixed(1)} < ${valeurDeCarte(inter).toFixed(1)}`,
  valeurDeCarte(promesse) < valeurDeCarte(inter),
);
ligne(
  'une pépite reste marquée sans changer de métal',
  `${NOM_RARETE[rareteDe(promesse)]} + pépite=${estPepite(promesse)}`,
  estPepite(promesse) && rareteDe(promesse) === rareteDe(joueur('x', 62)),
);

// ---------------------------------------------------------------------------
console.log('\n=== 3. LA RARETÉ N’EST PAS LE STATUT, ET C’EST VOULU ===');
// ---------------------------------------------------------------------------
console.log('');
// Les deux coexistent sur la carte : le métal dit ce que la carte VAUT, la
// bande dit le RÔLE dans l'effectif. S'ils disaient la même chose, l'un des
// deux serait à retirer.
let differents = 0;
const CAS = [joueur('a', 78, 22, 90), joueur('b', 78, 31, 78), joueur('c', 90, 27, 90), joueur('d', 55, 19, 78)];
for (const j of CAS) {
  info(`note ${j.note}, ${j.age} ans, pot. ${j.potentiel}`, `${NOM_RARETE[rareteDe(j)]} · statut ${statutDe(j)}`);
  if (ORDRE_RARETE.indexOf(rareteDe(j)) !== ['espoir', 'pro', 'international', 'star', 'majeur'].indexOf(statutDe(j))) differents++;
}
ligne('les deux échelles ne se recopient pas', `${differents}/4 cas divergent`, differents >= 2);

// ---------------------------------------------------------------------------
console.log('\n=== 4. UN EFFECTIF RÉEL SORT UNE VRAIE HIÉRARCHIE ===');
// ---------------------------------------------------------------------------
console.log('');
// ⚠️ C'EST LE CONTRÔLE ANTI-« TOUT LE MONDE BRILLE ». Une échelle calée trop bas
// rendrait un club de Fédérale entièrement doré, et la rareté ne servirait plus
// à rien. On mesure donc sur les vrais effectifs du jeu, à chaque étage.
const ETAGES = ['top14', 'prod2', 'nationale', 'fed1', 'fed3', 'reg3'];
for (const id of ETAGES) {
  const comp = COMPETITIONS.find((c) => c.id === id);
  if (!comp?.clubs.length) continue;
  const compte: Record<string, number> = {};
  let total = 0;
  for (const club of comp.clubs.slice(0, 6)) {
    for (const j of effectifDuClub(club.nom, 1)) {
      const r = rareteDe(j);
      compte[r] = (compte[r] ?? 0) + 1;
      total++;
    }
  }
  const resume = ORDRE_RARETE
    .filter((r) => compte[r])
    .map((r) => `${r} ${Math.round((compte[r] / total) * 100)} %`)
    .join(' · ');
  info(comp.nom.padEnd(14), resume);
  if (id === 'reg3') {
    ligne(
      '⚠️ aucune carte légende en Régionale 3',
      `${compte.legende ?? 0} sur ${total}`,
      (compte.legende ?? 0) === 0,
    );
  }
  if (id === 'top14') {
    const hautes = (compte.mythique ?? 0) + (compte.legende ?? 0);
    ligne(
      'le Top 14 a des cartes mythiques et légende',
      `${hautes} sur ${total}`,
      hautes > 0 && hautes / total < 0.5,
    );
  }
}

// ---------------------------------------------------------------------------
console.log('\n=== 5. LE GÉNÉRAL DU MARCHÉ EST UN NOMBRE, ET IL EST POSSIBLE ===');
// ---------------------------------------------------------------------------
console.log('');
// Bug signalé : la carte imprimait « 78–100 », « 81–100 », « 74–100 ».
const cibles = [
  { id: 'c1', note: 90, potentiel: 93, salaireDemande: 300_000, age: 29 },
  { id: 'c2', note: 81, potentiel: 95, salaireDemande: 200_000, age: 22 },
  { id: 'c3', note: 74, potentiel: 78, salaireDemande: 90_000, age: 31 },
  { id: 'c4', note: 98, potentiel: 98, salaireDemande: 700_000, age: 28 },
];
let auDessus99 = 0;
let tropLarge = 0;
for (const c of cibles) {
  const r = rapportConnaissance(undefined, c, 0);
  info(
    `note réelle ${c.note} (${c.age} ans)`,
    `estimation ${r.estimation} ± ${r.marge} · fourchette ${r.note[0]}–${r.note[1]}`,
  );
  if (r.note[1] > 99) auDessus99++;
  if (r.note[1] - r.note[0] > 18) tropLarge++;
}
ligne('⚠️ aucune borne à 100 : le jeu plafonne à 99', `${auDessus99} dépassement(s)`, auDessus99 === 0);
ligne('la fourchette reste lisible (≤ 18 points)', `${tropLarge} trop large(s)`, tropLarge === 0);
ligne(
  'le rapport rend une estimation centrale',
  `${cibles.map((c) => rapportConnaissance(undefined, c, 0).estimation).join(' · ')}`,
  cibles.every((c) => Number.isInteger(rapportConnaissance(undefined, c, 0).estimation)),
);

// ⚠️ ET OBSERVER DOIT SERVIR À QUELQUE CHOSE. C'est ce qui donne son sens au
// bouton « Observer davantage » : sans resserrement mesurable, le scouting
// n'est qu'un clic qui change un libellé.
const avecObs = (n: number) => rapportConnaissance(
  {
    connaissances: { c1: { joueurId: 'c1', observations: n, derniereSaison: 1, paysConnu: true } },
  } as never,
  cibles[0], 3,
);
info('sans observation', `± ${rapportConnaissance(undefined, cibles[0], 0).marge}`);
for (const n of [1, 2, 4]) info(`après ${n} observation(s)`, `± ${avecObs(n).marge}`);
ligne(
  'observer resserre vraiment la marge',
  `${rapportConnaissance(undefined, cibles[0], 0).marge} → ${avecObs(4).marge}`,
  avecObs(4).marge < rapportConnaissance(undefined, cibles[0], 0).marge,
);
ligne(
  '⚠️ un rapport complet donne la vraie note',
  `${avecObs(4).estimation} = ${cibles[0].note}`,
  avecObs(4).estimation === cibles[0].note && avecObs(4).marge === 0,
);

// ---------------------------------------------------------------------------
console.log('\n=== 6. LES EMPLACEMENTS DE PARTIE ===');
// ---------------------------------------------------------------------------
console.log('');
// ⚠️ HORS NAVIGATEUR IL N'Y A PAS DE `localStorage` : l'adaptateur bascule sur
// une mémoire interne. On teste donc le ROUTAGE des clés, qui est la seule
// chose qui puisse casser une partie — pas la persistance elle-même.
ligne('l’emplacement 1 garde la clé historique', cleDe(1), cleDe(1) === 'destin-ovalie');
ligne(
  '⚠️ les autres emplacements ne peuvent pas la percuter',
  [2, 3, 6].map(cleDe).join(' · '),
  [2, 3, 4, 5, 6].every((n) => cleDe(n) !== cleDe(1)),
);
ligne(
  'toutes les clés sont distinctes',
  `${new Set(Array.from({ length: NB_EMPLACEMENTS }, (_, i) => cleDe(i + 1))).size}/${NB_EMPLACEMENTS}`,
  new Set(Array.from({ length: NB_EMPLACEMENTS }, (_, i) => cleDe(i + 1))).size === NB_EMPLACEMENTS,
);
ligne('un appareil neuf ouvre l’emplacement 1', String(emplacementActif()), emplacementActif() === 1);

const s = stockageParEmplacement();
s.setItem('destin-ovalie', JSON.stringify({
  state: { joueur: { nom: 'Test Joueur', club: 'Stade Toulousain', saison: 3, attributs: { vitesse: 71, force: 71, endurance: 71, plaquage: 71, passe: 71, jeuAuPied: 71, vision: 71, mental: 71 } }, manager: null },
}));
// ⚠️ La clé du jeu est redirigée, PAS les autres. Sans ce contrôle, un
// adaptateur trop zélé déplacerait aussi le pointeur d'emplacement lui-même,
// et l'on ne retrouverait plus sa partie.
s.setItem('autre-cle', 'intacte');
ligne('la clé du jeu passe par l’emplacement actif', s.getItem('destin-ovalie') ? 'écrite' : 'perdue', !!s.getItem('destin-ovalie'));
ligne('⚠️ les autres clés ne sont pas détournées', String(s.getItem('autre-cle')), s.getItem('autre-cle') === 'intacte');

const liste = listerEmplacements();
info('emplacements lus', `${liste.length}`);
info('emplacement 1', `${liste[0].type} · ${liste[0].nom} · ${liste[0].sous} · S${liste[0].saison}`);
ligne('la liste a bien six emplacements', String(liste.length), liste.length === NB_EMPLACEMENTS);
ligne(
  'le résumé lit le nom et le club sans charger la partie',
  `${liste[0].nom} · ${liste[0].sous}`,
  liste[0].type === 'joueur' && liste[0].nom === 'Test Joueur' && liste[0].valeur === 71,
);
ligne(
  'les emplacements vides sont vides',
  `${liste.filter((e) => e.type === 'vide').length} libre(s)`,
  liste.filter((e) => e.type === 'vide').length === NB_EMPLACEMENTS - 1,
);
supprimerEmplacement(1);
ligne('supprimer libère l’emplacement', listerEmplacements()[0].type, listerEmplacements()[0].type === 'vide');


// ---------------------------------------------------------------------------
console.log('\n=== 7. LE RELAIS DE FIN DE CARRIÈRE ===');
// ---------------------------------------------------------------------------
console.log('');
// Demande : « faire le relais en fin de carrière joueur, le parcours
// entraîneur ».
//
// ⚠️ LE CAS QUI COMPTE EST CELUI-CI : une carrière qui s'arrête SANS avoir
// coché « entraîneur » dans la liste des reconversions. Cette liste ne
// s'affiche que pendant la dernière saison ET seulement si l'on prend sa
// retraite volontairement : une carrière arrêtée par une blessure, par la
// limite d'âge ou faute de club n'y avait donc jamais accès. C'est exactement
// la fin de carrière après laquelle on veut entraîner.
const { useGame } = await import('../src/store/useGame');
const { prestigeDepuisJoueur, PRESTIGE_DEBUT } = await import('../src/lib/manager');

useGame.setState({ manager: null, joueur: null, pantheon: [], finCarriere: null });
useGame.getState().creerJoueur({
  nom: 'Blessé Illustre', poste: 'premier_centre', nation: 'France',
  club: 'Stade Toulousain', division: 'top14', age: 22, traits: [],
} as never);
useGame.setState((st) => ({
  joueur: st.joueur && {
    ...st.joueur, saison: 11, age: 32, reputation: 78,
    titres: ['Bouclier de Brennus (S7)'],
    palmares: [{ trophee: 'top14', nom: 'Bouclier de Brennus', saison: 7, club: 'Stade Toulousain' }],
  },
}));
// Retraite SUBIE : aucune reconversion choisie, motif « blessure ».
useGame.getState().prendreRetraite(undefined, 'blessure', 'Genou.');
const epilogue = useGame.getState();
ligne('une carrière stoppée par une blessure passe par l’épilogue',
  epilogue.ecran, epilogue.ecran === 'finCarriere');
ligne('⚠️ et elle NE désignait pas le banc toute seule',
  String(epilogue.finCarriere?.destination), epilogue.finCarriere?.destination !== 'manager');

const legende = epilogue.pantheon.at(-1)!;
info('prestige que vaut cette carrière', `${prestigeDepuisJoueur(legende)} (inconnu : ${PRESTIGE_DEBUT})`);
ligne('… et il ouvre plus de portes qu’un inconnu',
  `${prestigeDepuisJoueur(legende)} > ${PRESTIGE_DEBUT}`,
  prestigeDepuisJoueur(legende) > PRESTIGE_DEBUT);

// Le bouton de l'épilogue force la destination.
epilogue.continuerFinCarriere('manager');
const apres = useGame.getState();
ligne('le bouton « Devenir entraîneur » mène à la création',
  apres.ecran, apres.ecran === 'creationManager');
ligne('⚠️ et la légende est retrouvée même si rien ne l’avait posée',
  apres.reconversionManager?.nom ?? 'perdue',
  apres.reconversionManager?.id === legende.id);

// L'autre bouton, lui, va toujours au Hall.
useGame.setState({ finCarriere: { legendeId: legende.id, motif: 'blessure', reconversion: 'bar', destination: 'pantheon' } } as never);
useGame.getState().continuerFinCarriere('pantheon');
ligne('… et l’autre bouton va toujours au Hall',
  useGame.getState().ecran, useGame.getState().ecran === 'pantheon');
ligne('… sans laisser de légende en attente',
  String(useGame.getState().reconversionManager), useGame.getState().reconversionManager === null);
// ---------------------------------------------------------------------------
console.log('');
if (echecs) {
  console.log(`\n❌ ${echecs} contrôle(s) en échec.\n`);
  process.exitCode = 1;
} else {
  console.log('\n✅ Les cartes ont un métal, le marché a un général, et les carrières cohabitent.\n');
}
