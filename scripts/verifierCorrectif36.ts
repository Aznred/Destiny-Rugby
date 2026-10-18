import { strict as assert } from 'node:assert';
import { construireBracket, TOURS_ELIMINATION, vainqueursDuTour, semaineElimination } from '../src/lib/bracketProgressif';
import { effacerResultatsJoues, enregistrerResultatJoue, resultatJoue, poulesDe, journeesALaSemaine, nombreJournees, estJourneeDe } from '../src/lib/championnat';
import { CALENDRIER } from '../src/data/calendrier';
import { phaseFinale } from '../src/lib/phaseFinale';
import { tournoiDeFinDAnnee } from '../src/lib/tournoi';
import { analyserReparationPlayoffs } from '../src/lib/reparationPlayoffs';
import { oublierResultats } from '../src/lib/promotion';
import { COMPETITIONS } from '../src/data/clubs';
import { useGame } from '../src/store/useGame';
import { afficheDuClub } from '../src/lib/matchLive';
import { avisProlongation, signerRenegociationJoueur } from '../src/lib/carriereAvancee';
import { effectifDuClub, joueursLibresDuMarche, setTransfertsSociaux } from '../src/lib/effectif';
import { salairesEffectif, negocierAvecJoueur, accepterDemandesJoueur, ciblesDuMarche, reparerRecrutementsDupliques, joueurDejaRecrute } from '../src/lib/recrutementManager';
import type { Joueur } from '../src/types';
import { afficheDuJoueur } from '../src/lib/matchLive';
import { bonusClubDuJoueur } from '../src/store/useGame';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

let sauvegarde: unknown;
useGame.persist.setOptions({ storage: { getItem: () => sauvegarde as never, setItem: (_, valeur) => { sauvegarde = JSON.parse(JSON.stringify(valeur)); }, removeItem: () => { sauvegarde = undefined; } } });

let controles = 0;
console.log('Vérification des tableaux 4 à 64 clubs…');
const ok = (v: unknown, texte: string) => { assert.ok(v, texte); controles++; };
const eg = (a: unknown, b: unknown, texte: string) => { assert.deepEqual(a, b, texte); controles++; };
const gagner = (m: { cle: string; domicile: string; exterieur: string }) => enregistrerResultatJoue(m.cle,
  { domicile: m.domicile, exterieur: m.exterieur, scoreD: 24, scoreE: 10, essaisD: 3, essaisE: 1 });

for (const taille of [4, 8, 16, 32, 64]) {
  effacerResultatsJoues();
  const qualifies = Array.from({ length: taille }, (_, i) => `Club ${i}`);
  const prefixe = `tournoi#test-${taille}#1`;
  let participants = taille;
  const parcours: number[] = [taille];
  let date = 0;
  while (participants >= 2) {
    const bracket = construireBracket(qualifies, prefixe);
    const tour = bracket.filter(m => m.status !== 'completed');
    eg(tour.length, participants / 2, `${taille} : exactement un match pour deux clubs`);
    ok(tour.every(m => m.scoreD === null && m.scoreE === null && m.vainqueur === null && m.qualifiedTeamId === null && m.status === 'scheduled'), 'Aucun résultat avant simulation');
    eg(tour[0].codeTour, TOURS_ELIMINATION[participants].code, 'Nomenclature liée au nombre de clubs');
    ok(tour[0].semaine > date, 'Chaque tour a une date différente'); date = tour[0].semaine;
    eg(construireBracket(qualifies, prefixe), bracket, 'Lecture idempotente, aucune double génération');
    for (let i = 0; i < tour.length; i++) {
      gagner(tour[i]);
      if (i < tour.length - 1) eg(construireBracket(qualifies, prefixe).length, bracket.length, 'Un tour incomplet ne génère pas le suivant');
    }
    participants /= 2; parcours.push(participants);
  }
  const fini = construireBracket(qualifies, prefixe);
  eg(fini.length, taille - 1, `${taille} : aucune rencontre ni club perdus`);
  eg(parcours, Array.from({ length: Math.log2(taille) + 1 }, (_, i) => taille / 2 ** i), 'Division par deux à chaque tour');
  ok(fini.every(m => m.status === 'completed' && m.vainqueur), 'Chaque sortie correspond à un résultat enregistré');
}
assert.throws(() => construireBracket(['A', 'A', 'B', 'C'], 'test'), /Tableau invalide/); controles++;
effacerResultatsJoues();
const invalides = construireBracket(['A', 'B', 'C', 'D'], 'test');
assert.throws(() => vainqueursDuTour([invalides[0]], ['A', 'B', 'C', 'D']), /Tableau invalide/); controles++;
enregistrerResultatJoue(invalides[0].cle, { domicile: 'A', exterieur: 'D', scoreD: 10, scoreE: 10, essaisD: 1, essaisE: 1 });
eg(construireBracket(['A', 'B', 'C', 'D'], 'test')[0].status, 'in_progress', 'Un nul non tranché ne qualifie personne');

for (const division of ['reg3', 'reg2', 'reg1', 'fed3', 'fed2', 'fed1', 'nationale2', 'nationale']) {
  console.log(`Vérification ${division}…`);
  effacerResultatsJoues(); oublierResultats();
  const comp = COMPETITIONS.find(c => c.id === division)!;
  const tournoi = tournoiDeFinDAnnee(division, 1, comp.nom);
  const matchs = tournoi?.matchs ?? phaseFinale(division, 1, '').matchs;
  ok(matchs.length && matchs.every(m => m.status === 'scheduled' && m.vainqueur === null), `${division} : création sans score`);
  if (tournoi) {
    eg(new Set(tournoi.qualifies.map(q => q.qualificationId)).size, tournoi.qualifies.length, 'Identités uniques même avec les mêmes places de poule');
    ok(tournoi.qualifies.every(q => q.poule < poulesDe(division).length && q.rang > 0 && q.seed), 'Origine et classement conservés');
    eg(matchs.length, tournoi.barragistes?.length ? tournoi.barragistes.length / 2 : tournoi.qualifies.length - 2 ** Math.floor(Math.log2(tournoi.qualifies.length)), 'Premier tour complet, exemptions respectées');
    const club = matchs[0].domicile;
    eg(journeesALaSemaine(division, matchs[0].semaine, nombreJournees(division, club)), nombreJournees(division, club), 'Toutes les journées régulières précèdent le premier tour');
    ok(!estJourneeDe(division, CALENDRIER[matchs[0].semaine - 1]), 'Aucun conflit entre journée régulière et tour éliminatoire');
    const c = { club, division, saison: 1, semaine: matchs[0].semaine - 1, resultats: {} };
    ok(!afficheDuClub(c)?.cle.startsWith('tournoi#'), 'Aucun match avant sa date');
    const a = afficheDuClub({ ...c, semaine: matchs[0].semaine });
    ok(a?.cle.startsWith('tournoi#'), 'Le tour est proposé à sa propre date, y compris avant juin');
    const quart = `tournoi#${division}#1#${Math.max(2, tournoi.qualifies.length / 4)}#${club}#${tournoi.qualifies[1].club}`;
    gagner({ cle: quart, domicile: club, exterieur: tournoi.qualifies[1].club });
    const rapport = analyserReparationPlayoffs({ ...c, semaine: 52 });
    ok(rapport.resultatsEnAttente.includes(quart), 'Ancien quart sauté conservé en attente');
    eg(rapport.semaineReprise, matchs[0].semaine, 'Reprise au premier tour manquant');
    ok(resultatJoue(quart), 'La réparation ne détruit aucun vrai score');
  }
}

// Le réparateur produit une copie, conserve les vrais scores et reprend même si seul le match humain a été joué.
console.log('Vérification du script de réparation…');
effacerResultatsJoues(); oublierResultats();
const tReparation = tournoiDeFinDAnnee('fed3', 1, 'Fédérale 3')!;
const ancien = tReparation.matchs[0];
gagner(ancien);
const rapportPartiel = analyserReparationPlayoffs({ club: ancien.domicile, division: 'fed3', saison: 1, semaine: 52 });
eg(rapportPartiel.semaineReprise, ancien.semaine, 'Reprise du tour incomplet après une victoire humaine déjà sauvegardée');
ok(rapportPartiel.qualifies.includes(ancien.domicile) && !rapportPartiel.qualifies.includes(ancien.exterieur), 'La réparation conserve le vainqueur et exclut le vrai perdant');
const dossier = mkdtempSync(join(tmpdir(), 'rugby-c36-'));
const fichier = join(dossier, 'partie.json');
const scoreAncien = { cle: ancien.cle, club: ancien.domicile, adversaire: ancien.exterieur, domicile: true,
  saison: 1, semaine: ancien.semaine, scorePour: 24, scoreContre: 10, essaisPour: 3, essaisContre: 1 };
const contenu = JSON.stringify({ version: 32, state: { manager: { club: ancien.domicile, division: 'fed3', saison: 1, semaine: 52, resultats: { [ancien.cle]: scoreAncien } } } });
writeFileSync(fichier, contenu);
const execution = spawnSync(process.execPath, ['--loader', './scripts/chargeurTests36.mjs', 'scripts/reparerCorrectif36.ts', fichier], { encoding: 'utf8' });
eg(execution.status, 0, `Le script termine correctement : ${execution.stderr}`);
eg(readFileSync(fichier, 'utf8'), contenu, 'Le fichier d’origine reste intact');
const copie = JSON.parse(readFileSync(fichier + '.correctif36.json', 'utf8'));
eg(copie.state.manager.resultats[ancien.cle], scoreAncien, 'La copie conserve le vrai résultat sans réécriture');
eg(copie.state.manager.semaine, ancien.semaine, 'La copie reprend au tour manquant');
eg(copie.version, 36, 'La copie porte la version de migration');

// Parcours réel du store : gagner tous les tours avec le club humain, partenaires simulés au bon week-end.
console.log('Vérification du parcours entraîneur…');
effacerResultatsJoues(); oublierResultats();
const division = 'fed3';
const comp = COMPETITIONS.find(c => c.id === division)!;
// Un barragiste dispute le tour préliminaire puis tous les tours du tableau.
const club = tournoiDeFinDAnnee(division, 1, comp.nom)!.matchs[0].domicile;
useGame.getState().creerManager({ nom: 'Banc 36', club, nation: 'France', age: 40, libre: true });
const initial = tournoiDeFinDAnnee(division, 1, comp.nom, club)!;
let joues = 0;
for (let semaine = initial.matchs[0].semaine; semaine <= semaineElimination(2); semaine++) {
  useGame.setState(s => ({ manager: { ...s.manager!, semaine } }));
  useGame.getState().simulerAutresPhasesFinales(1, semaine, club);
  const m = useGame.getState().manager!;
  const a = afficheDuClub(m);
  ok(a?.cle.startsWith('tournoi#'), 'Le manager dispute chaque tour sans saut');
  const domicile = a!.match.domicile === club;
  useGame.getState().enregistrerResultatManager({ cle: a!.cle, club, saison: 1, semaine, journee: 0, domicile,
    adversaire: domicile ? a!.match.exterieur : a!.match.domicile, scorePour: 42, scoreContre: 3, essaisPour: 6, essaisContre: 0 });
  ok(useGame.getState().manager!.resultats[a!.cle], 'Score enregistré par le store'); joues++;
  useGame.getState().semaineManager();
  eg(useGame.getState().manager!.semaine, semaine + 1, 'La semaine avance après son match');
}
eg(joues, 1 + Math.ceil(Math.log2(initial.tailleTableau!)), 'Le club joue son barrage puis tous ses tours');
eg(tournoiDeFinDAnnee(division, 1, comp.nom, club)!.champion, club, 'Champion issu de la finale réellement jouée');
ok(Object.keys(useGame.getState().resultatsPhasesFinales).length, 'Les autres résultats sont persistés');
const resultatsAvant = JSON.stringify(useGame.getState().resultatsPhasesFinales);
effacerResultatsJoues(); oublierResultats();
await useGame.persist.rehydrate();
eg(JSON.stringify(useGame.getState().resultatsPhasesFinales), resultatsAvant, 'Rechargement sans modifier les scores');
eg(tournoiDeFinDAnnee(division, 1, comp.nom, club)!.champion, club, 'Même champion après restauration des vrais résultats');

// La carrière joueur partage les mêmes dates et qualifiés avec son apport sportif.
effacerResultatsJoues(); oublierResultats();
const clubJoueur = tournoiDeFinDAnnee(division, 1, comp.nom)!.qualifies.at(-1)!.club;
const contexteJoueur = { club: clubJoueur, division, saison: 1, semaine: initial.matchs[0].semaine, resultatsClub: {},
  age: 25, forme: 90, moral: 80, reputation: 45, apportClub: 0 } as unknown as Joueur;
const bonus = bonusClubDuJoueur(contexteJoueur);
useGame.setState({ manager: null, joueur: contexteJoueur });
useGame.getState().simulerAutresPhasesFinales(1, contexteJoueur.semaine!, clubJoueur);
const afficheJoueur = afficheDuJoueur(contexteJoueur, bonus);
ok(afficheJoueur?.cle.startsWith('tournoi#'), 'Le joueur attend son propre premier tour');
ok(tournoiDeFinDAnnee(division, 1, comp.nom, clubJoueur, bonus)!.matchs.some(m => m.status === 'scheduled' && [m.domicile, m.exterieur].includes(clubJoueur)), 'La simulation des partenaires ne joue jamais à sa place');

// Prolongation : offre modifiable, acceptation, nouveau salaire, refus et absence de double signature.
console.log('Vérification des contrats…');
useGame.getState().creerManager({ nom: 'Contrats 36', club: COMPETITIONS.find(c => c.id === 'nationale')!.clubs[0].nom, nation: 'France', age: 40, libre: true });
let manager = useGame.getState().manager!;
const joueur = effectifDuClub(manager.club, 1)[0];
useGame.setState({ manager: { ...manager, budgetTransferts: 10_000_000, budgetSalarial: 100_000_000 } });
useGame.getState().ouvrirRenegociationJoueurManager(joueur.id);
manager = useGame.getState().manager!;
let nego = manager.negociations.at(-1)!;
ok(nego && nego.nature === 'prolongation', 'Le bouton ouvre une vraie négociation');
const basse = negocierAvecJoueur(nego, 'salaire', { ...nego.offre, salaire: 0, prime: 0, duree: 1, role: 'espoir' });
ok(!basse.accord, 'Une offre insuffisante peut être refusée');
useGame.getState().negocierJoueurManager(nego.id, 'salaire', { ...nego.exigences });
nego = useGame.getState().manager!.negociations.at(-1)!;
eg(nego.etat, 'accord', 'Proposition acceptée selon ses exigences');
useGame.getState().signerJoueurManager(nego.id);
manager = useGame.getState().manager!;
const contrat = manager.avancee!.contratsJoueurs[joueur.id];
eg(contrat.salaire, nego.offre.salaire, 'Salaire appliqué');
ok(contrat.fin > 1, 'Date de fin actualisée');
eg(contrat.termes, nego.offre, 'Rôle et primes conservés');
await useGame.persist.rehydrate();
eg(useGame.getState().manager!.avancee!.contratsJoueurs[joueur.id].termes, JSON.parse(JSON.stringify(nego.offre)), 'Les conditions signées survivent au rechargement');
const budget = manager.budgetTransferts;
useGame.getState().signerJoueurManager(nego.id);
eg(useGame.getState().manager!.budgetTransferts, budget, 'Double clic sans second débit');
const avecRecrue = { ...manager, recrues: [{ club: manager.club, joueur: nego.joueur, termes: { ...nego.offre, salaire: 1 }, saison: 1 }] };
eg(salairesEffectif(manager.club, 1, avecRecrue.recrues, manager.avancee!.contratsJoueurs).find(j => j.joueurId === joueur.id)!.salaire, contrat.salaire, 'La prolongation remplace le salaire de la recrue');
ok(reparerRecrutementsDupliques(avecRecrue, []).negociations.some(n => n.id === nego.id && n.nature === 'prolongation'), 'Migration des recrutements sans écraser la prolongation');
const ambitieux = { ...joueur, note: 99, age: 24 };
const avancee = { ...manager.avancee!, contratsJoueurs: { ...manager.avancee!.contratsJoueurs, [joueur.id]: { ...contrat,
  attachement: 15, offresExterieures: 2, interetExterieur: 99, motivations: [{ type: 'ambition' as const, importance: 99 }] } } };
eg(avisProlongation(avancee, manager, ambitieux), 'ambition', 'Un joueur convoité peut vouloir partir');
const refus = { ...nego, refusProlongation: 'ambition' as const, etat: 'rompue' as const };
eg(accepterDemandesJoueur(refus), refus, 'Ses exigences ne permettent pas de forcer un refus de prolonger');
eg(signerRenegociationJoueur(avancee, { ...refus, etat: 'signee' }), avancee, 'Une signature forgée ne contourne pas le refus');

// Départ libre : projection de l'effectif et vivier de recrutement.
setTransfertsSociaux([{ joueurId: joueur.id, nom: joueur.nom, de: manager.club, vers: 'Sans club', saison: 2,
  age: joueur.age, note: joueur.note, nation: joueur.nation }]);
ok(effectifDuClub(manager.club, 1).some(j => j.id === joueur.id), 'Le contrat reste actif avant expiration');
ok(!effectifDuClub(manager.club, 2).some(j => j.nom === joueur.nom), 'Le joueur sort réellement du club à échéance');
ok(joueursLibresDuMarche(2).some(j => j.id === joueur.id), 'Son identité reste disponible libre');
ok(ciblesDuMarche('nationale', 2, manager.club, '', 1000).some(j => j.id === joueur.id && j.situation === 'libre' && j.indemnite === 0), 'Recrutable sans indemnité');
ok(!joueurDejaRecrute({ ...avecRecrue, saison: 2 }, joueur.id), 'Un ancien recrutement ne bloque pas un joueur parti libre');
setTransfertsSociaux([]);
useGame.setState({ manager: { ...manager, semaine: 53, avancee: { ...manager.avancee!, contratsJoueurs: Object.fromEntries(
  Object.entries(manager.avancee!.contratsJoueurs).map(([id, c]) => [id, { ...c, fin: id === joueur.id ? 2 : 5 }])) } } });
useGame.getState().saisonManager();
ok(useGame.getState().transfertsSociaux.some(t => t.joueurId === joueur.id && t.vers === 'Sans club' && t.saison === 2), 'Le passage de saison enregistre le départ sans prolongation automatique');
ok(!effectifDuClub(manager.club, 2).some(j => j.id === joueur.id), 'L’effectif suivant exclut vraiment le contrat expiré');
await useGame.persist.rehydrate();
ok(!effectifDuClub(manager.club, 2).some(j => j.id === joueur.id), 'Le départ reste effectif après rechargement');
console.log(`Correctif 36 : ${controles} contrôles validés.`);
