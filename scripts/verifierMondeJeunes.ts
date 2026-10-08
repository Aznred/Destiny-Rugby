import { strict as assert } from 'node:assert';
import { performance } from 'node:perf_hooks';
import type { SourceJeuneFfr } from '../src/lib/jeunesFfr';
import {
  avancerMondeJeunes, bilanMondeJeunes, candidatsMondeJeunes, creerMondeJeunes,
  enregistrerActionMondeJeune, historiqueJeuneMonde, jeuneMondeParId,
  jeuneMondeEnJeuneJoueur, jeunesMondeDuClub, joueursMondeJeunes, mondeJeunesDisponible, planClubJeunes,
  regensMondeJeunesAutorises, seniorsMondeDuClub, setSourcesMondeJeunes,
} from '../src/lib/mondeJeunes';
import { ficheDe } from '../src/lib/detection';
import { COMPETITIONS } from '../src/data/clubs';

const debut = performance.now();
let controles = 0;
const verifier = (condition: unknown, message: string): void => { assert.ok(condition, message); controles++; };
const source = (id: number, club = 'Montauban', age = 17, extra: Partial<SourceJeuneFfr> = {}): SourceJeuneFfr => ({
  id: `ffr_${id}`, sourcePlayerId: `ffr_${id}`, youthPlayerId: `ffr_${id}`,
  nom: `Profil de mesure ${id}`, clubSource: club, age, ageEstime: true,
  categorie: 'u18', poste: 'premier_centre', postesSecondaires: ['deuxieme_centre'],
  niveauCompetition: 8, competition: 'U18 régional', saisonSource: '2025-2026',
  matchs: 12, titularisations: 8, apparitionsSenior: 0, surclassement: false,
  confiance: 0.5, sourceSeasonHistory: [], ...extra,
});
const creer = (sources: SourceJeuneFfr[], id: string, seed = 'mesure-34') => creerMondeJeunes(sources,
  { snapshotId: id, sourceVersion: 'source-test-2026', graine: seed, saison: 1, annee: 2026 });

const original = source(1);
let monde = creer([original, original, source(2, 'Club de mesure inconnu', 13)], 'identites');
verifier(monde.totalSources === 2, 'la même identité FFR ne peut entrer deux fois');
verifier(jeuneMondeParId(monde, 'ffr_2')?.age === 13, 'les vrais U14 de treize ans restent présents');
original.nom = 'Changement du catalogue réel'; original.clubSource = 'Stade Toulousain';
setSourcesMondeJeunes('identites', [source(1, 'Autre club', 18)]);
verifier(jeuneMondeParId(monde, 'ffr_1')?.nom === 'Profil de mesure 1', 'le snapshot existant ne reçoit pas les corrections réelles');
verifier(jeuneMondeParId(monde, 'ffr_1')?.club === 'Montauban', 'le club réel mis à jour ne remplace pas le club de la carrière');
const nouvelle = creer([source(1, 'Stade Toulousain', 18)], 'nouvelle-source');
verifier(jeuneMondeParId(nouvelle, 'ffr_1')?.club === 'Stade Toulousain', 'une nouvelle carrière utilise le dernier snapshot réel');

const faible = creer([source(3, 'Club régional de mesure', 17)], 'regional');
const fort = creer([source(3, 'Club régional de mesure', 17, { niveauCompetition: 3, competition: 'Nationale',
  apparitionsSenior: 14, surclassement: true, matchs: 20, groupePro: true })], 'senior-pro');
verifier(jeuneMondeParId(fort, 'ffr_3')!.note > jeuneMondeParId(faible, 'ffr_3')!.note + 15,
  'le niveau de compétition et les apparitions seniors changent fortement la note initiale');
const forceSource = creer([source(3, 'Club régional de mesure', 17, { niveauCompetition: 57, competition: 'Espoirs' })], 'force-source');
verifier(jeuneMondeParId(forceSource, 'ffr_3')!.note > jeuneMondeParId(faible, 'ffr_3')!.note + 5,
  'la force 57 du pipeline ne devient pas une division numéro 57');
verifier(jeuneMondeParId(forceSource, 'ffr_3')!.niveauClub <= 10, 'la pyramide utilise toujours un étage distinct de la force de compétition');
const espoir = creer([source(4, 'Montauban', 23, { categorie: 'Senior', competition: 'Reichel Espoirs', espoirs: true })], 'espoirs');
verifier(jeuneMondeParId(espoir, 'ffr_4')?.categorie === 'espoirs', 'la preuve Espoirs prime sur une catégorie générique Senior');

monde = enregistrerActionMondeJeune(monde, { id: 'ffr_1', saison: 1, type: 'recrutement', club: 'Montauban' });
monde = enregistrerActionMondeJeune(monde, { id: 'ffr_1', saison: 1, type: 'developpement', note: 58, potentielReel: 83, moral: 78, tempsDeJeu: 75 });
monde = avancerMondeJeunes(monde);
verifier(jeuneMondeParId(monde, 'ffr_1')?.age === 18, 'une clôture ne fait vieillir le même jeune qu’une fois');
verifier(jeuneMondeParId(monde, 'ffr_1')?.note === 58, 'le bilan de l’académie remplace la progression IA');
verifier(jeuneMondeParId(monde, 'ffr_1')?.potentielReel === 83, 'le bilan interne garde le potentiel sans double progression');
monde = enregistrerActionMondeJeune(monde, { id: 'ffr_1', saison: 2, type: 'pret', clubPret: 'Colomiers', duree: 1 });
verifier(jeunesMondeDuClub(monde, 'Montauban').some(j => j.id === 'ffr_1' && j.club === 'Colomiers'), 'un prêt reste visible dans le centre propriétaire');
monde = avancerMondeJeunes(monde);
verifier(jeuneMondeParId(monde, 'ffr_1')?.club === 'Montauban', 'le prêt revient automatiquement à son propriétaire');
monde = enregistrerActionMondeJeune(monde, { id: 'ffr_1', saison: 3, type: 'senior', club: 'Montauban' });
const senior = seniorsMondeDuClub(monde, 'Montauban').find(j => j.id === 'ffr_1');
verifier(senior?.id === 'ffr_1' && senior.sourcePlayerId === 'ffr_1', 'la promotion senior conserve exactement le playerId');
verifier(senior && !('potentielReel' in senior) && senior.potentielEstime[0] < senior.potentielEstime[1],
  'la projection publique senior conserve une estimation et masque le vrai potentiel');
const historique = historiqueJeuneMonde(monde, 'ffr_1')!;
verifier(historique.saisons.length === 2 && historique.saisons[0].noteApres === 58, 'les saisons et leur développement restent consultables');
verifier(historique.mouvements.some(m => m.motif === 'pret') && historique.mouvements.some(m => m.motif === 'retour_pret'), 'l’historique conserve prêts et retours');
verifier(historique.mouvements.some(m => m.motif === 'senior'), 'la promotion fait partie du même historique');
const relu = JSON.parse(JSON.stringify(monde));
assert.deepEqual(jeuneMondeParId(relu, 'ffr_1'), jeuneMondeParId(monde, 'ffr_1')); controles++;
assert.deepEqual(historiqueJeuneMonde(relu, 'ffr_1'), historique); controles++;
monde = enregistrerActionMondeJeune(monde, { id: 'ffr_1', saison: 3, type: 'liberation' });
verifier(jeuneMondeParId(monde, 'ffr_1')?.id === 'ffr_1', 'la libération ne supprime jamais un joueur');

let tropAge = creer([source(5, 'Montauban', 23, { espoirs: true })], 'limite-age');
tropAge = enregistrerActionMondeJeune(tropAge, { id: 'ffr_5', saison: 1, type: 'gestion', controle: true });
tropAge = avancerMondeJeunes(tropAge);
verifier(jeuneMondeParId(tropAge, 'ffr_5')?.categorie === 'senior', 'la limite Espoirs transforme aussi un jeune sous contrôle humain');
verifier(seniorsMondeDuClub(tropAge, 'Montauban').some(j => j.id === 'ffr_5'), 'le senior atteint par la limite d’âge participe au groupe');

const clubs = COMPETITIONS.filter(c => c.pays === 'France' && c.niveau >= 4).flatMap(c => c.clubs.map(j => ({ club: j.nom, niveau: c.niveau })));
const sources = Array.from({ length: 10000 }, (_, i) => {
  const c = clubs[i % clubs.length]; return source(1000 + i, c.club, 14 + i % 6,
    { niveauCompetition: c.niveau, competition: 'U18 régional', matchs: 8 + i % 15 });
});
let large = creer(sources, 'pyramide');
verifier(JSON.stringify(large).length < 600, 'dix mille identités ne sont pas dupliquées dans la sauvegarde Zustand');
verifier(bilanMondeJeunes(large).total === 10000, 'tout le snapshot participe à la simulation');
const joueursInitiaux = joueursMondeJeunes(large, Infinity);
const cracks = joueursInitiaux.filter(j => j.potentielReel >= 80).length;
verifier(cracks / sources.length < 0.04, 'les très hauts potentiels restent rares dans la pyramide amateur');
const tardif = joueursInitiaux.find(j => j.profilDeveloppement === 'tardif' && j.age === 18 && j.potentielReel > 52)!;
verifier(!!tardif, 'le vivier contient des joueurs à développement tardif');
const tardifAvant = tardif.note;
verifier(jeuneMondeEnJeuneJoueur(tardif).developmentCurve![1] < 0.5,
  'la progression de l’académie humaine respecte aussi le développement tardif');
for (let i = 0; i < 7; i++) large = avancerMondeJeunes(large);
const bilan = bilanMondeJeunes(large);
verifier(bilan.total === 10000, 'tous les joueurs réels restent présents lorsqu’ils deviennent seniors');
verifier(bilan.transfertsIA > 0, 'les carrières ignorées par l’humain reçoivent de vrais recrutements IA');
verifier(bilan.pros / bilan.total < 0.04, 'une petite minorité seulement atteint une première équipe professionnelle');
verifier(joueursMondeJeunes(large, Infinity).filter(j => j.club === j.clubOrigine).length / bilan.total > 0.7,
  'les clubs amateurs gardent la majorité de leur génération');
verifier(jeuneMondeParId(large, tardif.id)!.note > tardifAvant + 6, 'un joueur tardif peut émerger après ses premières années lentes');
const hLate = historiqueJeuneMonde(large, tardif.id)!;
verifier(hLate.saisons.every(s => s.noteApres >= 12 && s.matchs >= 0 && s.minutes >= 0), 'les saisons gardent des statistiques cohérentes');
const rejoue = JSON.parse(JSON.stringify(large));
assert.deepEqual(jeuneMondeParId(rejoue, tardif.id), jeuneMondeParId(large, tardif.id)); controles++;
assert.deepEqual(historiqueJeuneMonde(rejoue, tardif.id), hLate); controles++;
const autreGraine = creer(sources.slice(0, 100), 'autre-graine', 'autre-partie');
verifier(jeuneMondeParId(autreGraine, sources[0].id)!.potentielReel !== joueursInitiaux[0].potentielReel,
  'deux carrières peuvent donner une trajectoire différente à la même personne');

const depenses = new Map<string, number>();
const quantites = new Map<string, number>();
for (const j of joueursMondeJeunes(large, Infinity)) {
  const h = historiqueJeuneMonde(large, j.id)!;
  for (const m of h.mouvements) if (m.motif === 'recrutement') {
    const cle = `${m.saison}:${m.vers}`; depenses.set(cle, (depenses.get(cle) ?? 0) + m.indemnite);
    quantites.set(cle, (quantites.get(cle) ?? 0) + 1);
  }
}
for (const [cle, montant] of depenses) {
  const club = cle.slice(cle.indexOf(':') + 1); const plan = planClubJeunes(club);
  verifier(montant <= plan.academyBudget, 'l’IA respecte le budget annuel du centre');
  verifier((quantites.get(cle) ?? 0) <= plan.recrutementsMax, 'l’IA respecte les places de recrutement annuelles');
}

const local = candidatsMondeJeunes(faible, 'Club régional de mesure', { rayonKm: 50 })[0];
verifier(!!local, 'le jeune de son club est connu localement');
const notes = { installations: 50, coaching: 60, recrutement: 65, reseau: 60, medical: 60, reputation: 65 };
const sansVisite = ficheDe(local, notes, undefined, 'Club régional de mesure');
const observe = ficheDe(local, notes, { jeuneId: local.id, matchs: 8, entretien: true, saison: 1 }, 'Club régional de mesure');
verifier(observe.potentielHaut - observe.potentielBas < sansVisite.potentielHaut - sansVisite.potentielBas,
  'les observations resserrent le potentiel estimé sans devenir un oracle');
verifier(observe.potentielHaut > observe.potentielBas, 'même un dossier complet conserve une incertitude');

const debutCharge = performance.now();
const sourcesCharge = Array.from({ length: 131000 }, (_, i) => ({ ...sources[i % sources.length],
  id: `ffr_charge_${i}`, sourcePlayerId: `ffr_charge_${i}`, youthPlayerId: `ffr_charge_${i}` }));
let charge = creer(sourcesCharge, 'charge-131k');
verifier(bilanMondeJeunes(charge).total === 131000, 'le moteur initialise tout le vivier de 131 000 personnes');
charge = avancerMondeJeunes(charge);
verifier(bilanMondeJeunes(charge).total === 131000, 'le passage de saison conserve tout le vivier de 131 000 personnes');
verifier(JSON.stringify(charge).length < 600, 'la sauvegarde reste compacte à 131 000 personnes');
console.log(`Charge 131 000 identités + une saison : ${((performance.now() - debutCharge) / 1000).toFixed(2)} s ; sauvegarde ${JSON.stringify(charge).length} caractères.`);

let future = creer([source(9, 'Montauban', 23)], 'avenir');
for (let i = 0; i < 7; i++) future = avancerMondeJeunes(future);
verifier(!regensMondeJeunesAutorises(future), 'les premières saisons n’utilisent aucun regen');
verifier(!joueursMondeJeunes(future, Infinity).some(j => j.fictif), 'aucun profil fictif n’apparaît avant l’épuisement');
future = avancerMondeJeunes(future);
verifier(regensMondeJeunesAutorises(future), 'le remplacement devient possible après la période réellement couverte');
const nouveaux = joueursMondeJeunes(future, Infinity).filter(j => j.fictif);
verifier(nouveaux.length > 0 && nouveaux.every(j => j.id.startsWith('regen-carriere:')), 'les générations futures ont leurs propres identités procédurales');
verifier(!!jeuneMondeParId(future, 'ffr_9'), 'l’arrivée de nouvelles générations ne supprime pas les anciennes');
const regen = nouveaux[0]; future = avancerMondeJeunes(future);
verifier(jeuneMondeParId(future, regen.id)?.age === regen.age + 1, 'un regen futur devient lui aussi persistant');
verifier(historiqueJeuneMonde(future, regen.id)?.saisons.length === 1, 'un regen futur n’a pas de fausses saisons avant sa naissance');
let attente = creerMondeJeunes([], { snapshotId: 'en-attente', sourceVersion: 'en_attente', graine: 'attente' });
for (let i = 0; i < 12; i++) attente = avancerMondeJeunes(attente);
verifier(!mondeJeunesDisponible(attente) && bilanMondeJeunes(attente).total === 0, 'un snapshot privé en attente n’est pas remplacé par de faux jeunes');

console.log(`Monde jeunes : ${controles} contrôles réussis en ${((performance.now() - debut) / 1000).toFixed(2)} s.`);
console.log(`Pyramide de mesure : ${sources.length} identités, ${cracks} potentiels ≥ 80, ${bilan.pros} seniors professionnels, ${bilan.transfertsIA} transferts IA.`);
