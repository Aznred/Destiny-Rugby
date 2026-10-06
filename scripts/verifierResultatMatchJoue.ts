// LE SCORE RÉEL D'UN MATCH JOUÉ ENTRE DANS LE CHAMPIONNAT — Correctif 19 (suite).
//
// Retour de jeu : « le match s'est fini à 10-10 », et le classement de Régionale 2 affichait, en « dernier match »,
// 21-15. Cause : le match de club joué en direct n'était enregistré nulle part. Le championnat rejoue le score
// THÉORIQUE de chaque rencontre (`jouerRencontre`, graine = clé de la rencontre) tant qu'aucun résultat n'est inscrit
// sous cette clé dans le registre des résultats joués — que seuls le manager et les sélections alimentaient.
//
// Ce banc joue un vrai match de la carrière d'un joueur, le termine par `enregistrerMatchVecu` comme `MatchLive`, et
// vérifie ce qui ne doit plus arriver (le classement rejoue le théorique) et ce qui doit arriver :
//
//  1. le score joué remplace le théorique dans le classement, le « dernier match » et la rencontre elle-même ;
//  2. il est PERSISTÉ (`Joueur.resultatsClub`) et RENDU au rechargement de la sauvegarde ;
//  3. une nouvelle carrière repart sans aucun score joué (les clés sont celles de la carrière suivante) ;
//  4. un match couperet (phase finale, coupe) ne reste jamais nul ;
//  5. un appel sans clé de rencontre (ancien appelant) ne change rien — et ne plante pas.
//
// Lancer : npm run verify:resultat-match
import assert from 'node:assert/strict';
import { useGame } from '../src/store/useGame';
import { championnatEnDirect, effacerResultatsJoues, jouerRencontre, resultatJoue, journeesALaSemaine, nombreJournees } from '../src/lib/championnat';
import { matchDeLaSemaine } from '../src/lib/matchLive';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { IA_MATCH_DE_CARRIERE } from '../src/lib/moteur/ia/reglages';
import { statsPourLaNote } from '../src/lib/moteur/apresMatch';
import { CLUBS_FRANCE_PAR_DIVISION } from '../src/data/clubs';
import type { Joueur } from '../src/types';

let ok = 0;
const verifier = (condition: unknown, message: string) => { assert.ok(condition, message); ok++; };
const g = () => useGame.getState();

const division = CLUBS_FRANCE_PAR_DIVISION.find((d) => d.id === 'reg2')!;
const club = division.clubs[0].nom;

g().reinitialiser();
g().creerJoueur({ nom: 'Test Resultat', poste: 'demi_ouverture', nation: 'France', club, division: 'reg2', age: 22 });

// La première semaine où le club joue son championnat.
let semaine = 0;
for (let s = 1; s <= 53 && !semaine; s++) {
  if (matchDeLaSemaine({ ...g().joueur!, semaine: s } as Joueur)) semaine = s;
}
verifier(semaine > 0, `le club joue en semaine ${semaine}`);
useGame.setState({ joueur: { ...g().joueur!, semaine } });

const affiche = matchDeLaSemaine(g().joueur!)!;
const chezMoi = affiche.match.domicile === club;
const adversaire = chezMoi ? affiche.match.exterieur : affiche.match.domicile;
const theorique = { ...affiche.match };

/** Le tableau tel que l'écran du classement le calcule, et la rencontre du club à la dernière journée jouée. */
function derniereRencontre() {
  const j = g().joueur!;
  const total = nombreJournees(j.division!, j.club);
  const jouees = journeesALaSemaine(j.division!, (j.semaine ?? 1) + 1, total);
  const champ = championnatEnDirect(j.division!, j.saison, j.club, jouees, 0);
  const derniere = champ.journees[champ.journees.length - 1] ?? [];
  return derniere.find((m) => m.domicile === club || m.exterieur === club);
}

console.log('— Avant : le classement rejoue le théorique —');
verifier(derniereRencontre()?.scoreD === theorique.scoreD && derniereRencontre()?.scoreE === theorique.scoreE,
  `la rencontre vaut ${theorique.scoreD}-${theorique.scoreE} avant d'être jouée`);

// Un vrai match, joué par le moteur avec le joueur de la carrière — comme `MatchLive`.
function jouerVraimentLeMatch(cle: string) {
  const j = g().joueur!;
  const [dom, ext] = chezMoi ? [club, adversaire] : [adversaire, club];
  const e = creerMatch(dom, ext, effectifDuClub(dom, j.saison), effectifDuClub(ext, j.saison), theorique.scoreD, theorique.scoreE, cle,
    { club, nom: j.nom, poste: j.poste, attributs: j.attributs, titulaire: true },
    { niveau: 'amateur', scoreSurTerrain: true, controle: true, cadenceDetaillee: true, placementJoue: true, ia: IA_MATCH_DE_CARRIERE });
  e.carriereDixMinutes = true;
  let garde = 0;
  while (!e.fini && garde++ < 200000) avancer(e, 0.6);
  return e;
}
const e = jouerVraimentLeMatch(affiche.cle);
const moi = e.pions.find((p) => p.moi)!;
let scorePour = chezMoi ? e.scoreA : e.scoreB, scoreContre = chezMoi ? e.scoreB : e.scoreA;
// Le banc veut un score qui DIFFÈRE du théorique : celui qu'on a joué ne doit pas en être, même par hasard.
if (scorePour === (chezMoi ? theorique.scoreD : theorique.scoreE) && scoreContre === (chezMoi ? theorique.scoreE : theorique.scoreD)) { scorePour += 10; }
const essaisPour = chezMoi ? e.essaisA : e.essaisB, essaisContre = chezMoi ? e.essaisB : e.essaisA;

console.log(`— Après : ${scorePour}-${scoreContre} joué (théorique ${chezMoi ? theorique.scoreD : theorique.scoreE}-${chezMoi ? theorique.scoreE : theorique.scoreD}) —`);
const contexte = {
  adversaire, scorePour, scoreContre, domicile: chezMoi, libelle: 'Régionale 2 · journée 1',
  cle: affiche.cle, equipe: club, essaisPour, essaisContre,
};
g().enregistrerMatchVecu(statsPourLaNote(moi, undefined), contexte);
{
  const rencontre = derniereRencontre()!;
  const jouee = chezMoi ? [scorePour, scoreContre] : [scoreContre, scorePour];
  verifier(rencontre.scoreD === jouee[0] && rencontre.scoreE === jouee[1], `le classement affiche le score JOUÉ (${rencontre.scoreD}-${rencontre.scoreE}), plus le théorique`);
  verifier(resultatJoue(affiche.cle)?.scoreD === jouee[0], 'le registre des résultats joués le porte');
  verifier(jouerRencontre(affiche.match.domicile, affiche.match.exterieur, g().joueur!.saison, affiche.cle, { club, bonus: 0 }).scoreE === jouee[1],
    'la rencontre elle-même rend le score joué (calendrier, résultats, verdict du board)');
  verifier(g().joueur!.resultatsClub?.[affiche.cle]?.scoreD === jouee[0], 'il est gardé dans la sauvegarde du joueur');
  const essaisD = chezMoi ? essaisPour : essaisContre;
  verifier(rencontre.essaisD === essaisD, 'les essais joués aussi (bonus offensif du classement)');
  const ligne = championnatEnDirect('reg2', g().joueur!.saison, club, 1, 0).classement.find((l) => l.club === club)!;
  verifier(ligne.joues === 1 && ligne.pour === scorePour && ligne.contre === scoreContre, `la ligne du club compte ${ligne.pour}-${ligne.contre}`);
}

console.log('— Le rechargement de la sauvegarde —');
{
  effacerResultatsJoues();
  verifier(resultatJoue(affiche.cle) === undefined, 'registre vidé (nouvelle session)');
  const etat = g();
  useGame.persist.getOptions().onRehydrateStorage?.(etat)?.(etat);
  verifier(resultatJoue(affiche.cle)?.scoreD === (chezMoi ? scorePour : scoreContre), 'le score joué est rendu au rechargement');
  const rencontre = derniereRencontre()!;
  verifier(rencontre.scoreD === (chezMoi ? scorePour : scoreContre), 'et le classement le retrouve');
}

console.log('— Une nouvelle carrière repart de zéro —');
{
  g().creerJoueur({ nom: 'Autre Joueur', poste: 'pilier_gauche', nation: 'France', club, division: 'reg2', age: 20 });
  verifier(resultatJoue(affiche.cle) === undefined, 'aucun score de la carrière précédente ne subsiste sous la même clé');
  verifier(!g().joueur!.resultatsClub, 'et la fiche n\'en porte aucun');
}

console.log('— Un match couperet ne reste jamais nul —');
{
  const cleCoupe = `phase#reg2#${g().joueur!.saison}#demie#${club}#${adversaire}`;
  g().enregistrerMatchVecu(statsPourLaNote(moi, undefined), {
    adversaire, scorePour: 10, scoreContre: 10, domicile: true, libelle: 'Demi-finale', cle: cleCoupe, equipe: club, essaisPour: 1, essaisContre: 1,
  });
  const r = resultatJoue(cleCoupe)!;
  verifier(!!r && r.scoreD !== r.scoreE && Math.abs(r.scoreD - r.scoreE) === 3, `10-10 en phase finale devient ${r.scoreD}-${r.scoreE} (trois points de départage)`);
  verifier(r.domicile === club && r.exterieur === adversaire, 'équipes dans le bon sens');
  // Le départage est déterministe : le même jeu de clés donne le même vainqueur.
  const e2 = resultatJoue(cleCoupe)!;
  verifier(e2.scoreD === r.scoreD, 'décidé une fois');
}

console.log('— Un appelant sans clé de rencontre —');
{
  g().reinitialiser();
  g().creerJoueur({ nom: 'Sans Cle', poste: 'ailier_droit', nation: 'France', club, division: 'reg2', age: 21 });
  useGame.setState({ joueur: { ...g().joueur!, semaine } });
  g().enregistrerMatchVecu(statsPourLaNote(moi, undefined), { adversaire, scorePour: 10, scoreContre: 10, domicile: chezMoi, libelle: 'Match' });
  verifier(resultatJoue(affiche.cle) === undefined && !g().joueur!.resultatsClub, 'sans clé, rien n\'est inscrit au championnat (et rien ne plante)');
  verifier(g().joueur!.saisonEnCours?.matchs === 1, 'mais le match compte dans la saison du joueur');
}

console.log(`OK — ${ok} contrôles du score réel d'un match joué.`);
