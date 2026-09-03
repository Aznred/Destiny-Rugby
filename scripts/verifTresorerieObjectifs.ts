import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { useGame } from '../src/store/useGame';
import { effectifDuClub } from '../src/lib/effectif';
import { setMouvementsClubs } from '../src/lib/divisions';
import { ciblesDuMarche, coutPremiereSaison, ouvrirNegociationManager, salairesEffectif, situationSalariale } from '../src/lib/recrutementManager';
import { reportsBudgets, renouvelerBudgets, reparerPlafondSalarial } from '../src/lib/tresorerieManager';
import { evaluerObjectif, objectifsDeSaison } from '../src/lib/objectifsManager';
import { assurerEtatCarriereAvancee, apresResultatCarriereAvancee } from '../src/lib/carriereAvancee';
import { avatarPourCompte, photoDe } from '../src/lib/avatars';
import { PHOTO_JOUEUR } from '../src/data/photosJoueurs';
import { coutAmelioration } from '../src/lib/installations';

useGame.getState().reinitialiser();
useGame.getState().creerManager({ nom: 'Contrôle trésorerie', club: 'Stade Toulousain', nation: 'France', age: 40, libre: true });
const initial = useGame.getState().manager!;
const cible = ciblesDuMarche('top14', 1, initial.club).find((j) => j.club !== initial.club)!;
assert.ok(cible, 'Une cible réelle pour tester la signature');
const negociation = ouvrirNegociationManager(cible, 1, 1);
negociation.etat = 'accord';
negociation.offre = { ...negociation.offre, salaire: 100_000, duree: 3 };
const cout = coutPremiereSaison(negociation);
useGame.setState({ manager: { ...initial, budgetSalarial: 11_000_000, budgetTransferts: cout + 80_000, negociations: [negociation] } });
useGame.getState().signerJoueurManager(negociation.id);
const signe = useGame.getState().manager!;
assert.equal(signe.recrues.length, 1, 'La signature aboutit');
assert.equal(signe.budgetSalarial, 11_000_000, 'Une signature ne débite pas le plafond');
assert.equal(signe.budgetTransferts, 80_000, 'La prime et l’indemnité sont payées une fois');
const lignes = salairesEffectif(signe.club, 1, signe.recrues);
assert.equal(lignes.find((j) => j.nom === cible.nom)?.salaire, 100_000, 'Le salaire signé remplace le barème');
assert.equal(lignes.filter((j) => j.nom === cible.nom).length, 1, 'La recrue compte une seule fois');
assert.equal(situationSalariale(signe).engagee, lignes.reduce((n, j) => n + j.salaire, 0), 'Le détail est exactement égal au total');
useGame.getState().signerJoueurManager(negociation.id);
assert.equal(useGame.getState().manager!.budgetTransferts, 80_000, 'Une deuxième signature est ignorée');
const transferts = useGame.getState().transfertsSociaux;
assert.equal(reparerPlafondSalarial({ ...signe, budgetSalarial: 10_900_000 }, transferts), 11_000_000, 'Les anciennes sauvegardes récupèrent le double débit');
assert.equal(situationSalariale({ ...signe, budgetSalarial: 20_000_000 }).plafond, 11_000_000, 'Le salary cap limite les anciens plafonds');

const deuxieme = ciblesDuMarche('top14', 1, initial.club).find((j) => j.nom !== cible.nom)!;
const refusee = { ...ouvrirNegociationManager(deuxieme, 1, 1), etat: 'accord' as const };
useGame.setState({ manager: { ...signe, budgetTransferts: 10_000_000, budgetSalarial: situationSalariale(signe).engagee, negociations: [refusee] } });
useGame.getState().signerJoueurManager(refusee.id);
assert.equal(useGame.getState().manager!.recrues.length, 1, 'Pas de signature sans marge salariale');

const reports = reportsBudgets(signe);
assert.equal(reports.transferts, 22_400);
assert.equal(reports.salarial, Math.round(situationSalariale(signe).disponible * .2), 'Report de la marge, pas du plafond');
const suivants = renouvelerBudgets(signe, { budget: 40_000_000, transferts: 1_000_000, salarial: 11_000_000, structure: 2_000_000 }, 12_345, 100_000);
assert.equal(suivants.budgetTransferts, 1_069_745);
assert.equal(suivants.budgetSalarial, 11_000_000);
assert.equal(suivants.budgetStructure, 2_015_000 + signe.budgetStructure);

const achete = effectifDuClub(signe.club, 1).find((j) => j.nom === cible.nom)!;
useGame.setState({ manager: { ...signe, ventes: [{ joueurId: achete.id, nom: achete.nom, poste: achete.poste, age: achete.age, note: achete.note, potentiel: achete.potentiel, valeur: 42_000, saison: 1,
  offres: [{ id: 'offre-test', club: 'RC Toulon', montant: 42_000, saison: 1 }] }] } });
useGame.getState().accepterOffreVenteManager(achete.id, 'offre-test');
const vendu = useGame.getState().manager!;
assert.equal(vendu.budgetTransferts, 122_000);
assert.ok(!salairesEffectif(vendu.club, 1, vendu.recrues).some((j) => j.nom === cible.nom), 'Le départ libère la charge salariale');

const migrer = useGame.persist.getOptions().migrate!;
const sauvegarde26 = JSON.parse(JSON.stringify({
  manager: { ...signe, budgetSalarial: 10_900_000, recrues: signe.recrues.map(({ club: _club, ...r }) => r),
    avancee: { ...signe.avancee, objectifs: [{ id: 'finance-1', categorie: 'financier', titre: 'Ancien', detail: 'Ancien montant', importance: 2, cible: 1, progression: 0, etat: 'enCours' }] } },
  transfertsSociaux: transferts,
  mouvementsClubs: {},
  posts: [{ auteur: 'Nathalie Martin', avatar: 'photo:https://randomuser.me/api/portraits/women/2.jpg' }],
  comptesSuivis: [], notifsSocial: [],
}));
const migree = await Promise.resolve(migrer(sauvegarde26, 26)) as typeof sauvegarde26;
assert.equal(migree.manager.budgetSalarial, 11_000_000, 'La migration rembourse le double débit salarial');
assert.equal(migree.manager.recrues[0].club, signe.club, 'La migration rattache le contrat à son club');
assert.ok(migree.posts[0].avatar.startsWith('photo:data:image/svg+xml;'), 'La migration remplace l’ancienne photo distante');
assert.ok(migree.manager.avancee.objectifs.every((o: { indicateur?: string }) => o.indicateur), 'La migration remplace les anciens objectifs incohérents');

console.log('OK — signatures, vente, totaux et reports des trois enveloppes');

const groupe = effectifDuClub(vendu.club, 1);
const objectifs = objectifsDeSaison(vendu, groupe);
assert.equal(objectifs.length, 4);
const objectifsSuivants = objectifsDeSaison({ ...vendu, saison: 2 }, groupe);
assert.notDeepEqual(objectifs.map((o) => o.indicateur), objectifsSuivants.map((o) => o.indicateur), 'Les priorités changent la saison suivante');
assert.ok(!objectifs.slice(2).some((o) => objectifsSuivants.slice(2).some((n) => n.indicateur === o.indicateur)), 'Les deux priorités complémentaires ne se répètent pas la saison suivante');
const finance = objectifs.find((o) => o.indicateur === 'masseSalariale')!;
assert.ok(evaluerObjectif(finance, vendu, groupe, 1, true).atteint);
const depasse = evaluerObjectif(finance, { ...vendu, budgetSalarial: 1 }, groupe, 1, true);
assert.equal(depasse.etat, 'echoue', 'Un plafond positif mais dépassé ne valide pas les finances');
assert.equal(depasse.cible, 1, 'Le montant affiché suit le plafond courant');
const sportif = objectifs[0];
assert.equal(evaluerObjectif(sportif, vendu, groupe, sportif.cible + 1, true).etat, 'echoue');
assert.ok(!objectifsDeSaison(vendu, groupe.map((j) => ({ ...j, age: 30 }))).some((o) => o.indicateur === 'feuillesJeunes'), 'Pas d’objectif de formation sans jeunes');

const jeunes = groupe.map((j, i) => ({ ...j, age: i < 2 ? 20 : 30 }));
const formation = { ...sportif, indicateur: 'feuillesJeunes' as const, categorie: 'formation' as const, cible: 12, progression: 3 };
const local = { ...sportif, indicateur: 'locaux' as const, categorie: 'identite' as const, cible: 60, progression: 0 };
const resultat = { cle: 'objectif-test', club: vendu.club, saison: 1, semaine: 1, journee: 1, domicile: true, adversaire: 'RC Toulon', scorePour: 28, scoreContre: 12, essaisPour: 4, essaisContre: 2 };
const blesse = { id: 'blessure-test', joueurId: jeunes[0].id, nom: jeunes[0].nom, type: 'Entorse', gravite: 'legere' as const, disponibilite: 0, douleur: 40, risqueAggravation: 10, semaines: 3, decision: 'repos' as const, penalitePerformance: 10, saison: 1, semaine: 1 };
const avecJeunes = { ...vendu, composition: { ...vendu.composition, titulaires: [jeunes[0].id, jeunes[1].id], remplacants: [] },
  avancee: { ...vendu.avancee!, objectifs: [formation, local], medical: [blesse] } };
const apres = apresResultatCarriereAvancee(avecJeunes, jeunes, resultat);
assert.equal(apres.etat.objectifs[0].progression, 4, 'Seul le jeune disponible apporte une feuille');
assert.equal(apres.etat.objectifs[1].progression, 0, 'Marquer des essais ne valide pas l’identité locale');
assert.equal(evaluerObjectif(local, vendu, groupe.map((j) => ({ ...j, nation: 'Nouvelle-Zélande' })), 1, true).etat, 'echoue');

setMouvementsClubs({ [vendu.club]: 'prod2' });
const promu = { ...vendu, saison: 2, division: 'prod2', divisionNom: 'Pro D2', objectif: 7, budgetSalarial: 4_000_000 };
const nouvelleDirection = assurerEtatCarriereAvancee(promu, effectifDuClub(vendu.club, 2));
assert.equal(nouvelleDirection.objectifs[0].cible, 7, 'Le rang demandé est celui de la nouvelle saison');
assert.ok(nouvelleDirection.objectifs[0].detail.includes('Pro D2'));
assert.equal(nouvelleDirection.objectifs.find((o) => o.indicateur === 'reserveTransferts')!.cible, Math.round(promu.budgetTransferts * .1));
setMouvementsClubs({});
console.log('OK — objectifs variés, mesures réelles, jeunes absents et changement de division');

useGame.setState({ manager: { ...vendu, budgetStructure: 40_000, installations: {} } });
useGame.getState().ameliorerInstallation('formation');
assert.equal(useGame.getState().manager!.budgetStructure, 0);
assert.equal(useGame.getState().manager!.installations[vendu.club].formation, 1);
useGame.getState().ameliorerInstallation('formation');
assert.equal(useGame.getState().manager!.installations[vendu.club].formation, 1);
useGame.setState({ manager: { ...useGame.getState().manager!, budgetStructure: 250_000 } });
useGame.getState().ameliorerInstallation('formation');
assert.equal(useGame.getState().manager!.installations[vendu.club].formation, 2, 'Deux achats dans la même saison si les fonds suffisent');
assert.deepEqual([0, 1, 2, 3, 4].map(coutAmelioration), [40_000, 250_000, 1_200_000, 5_000_000, null]);
for (const chemin of new Set(Object.values(PHOTO_JOUEUR))) assert.ok(existsSync(new URL(`../public${chemin}`, import.meta.url)), chemin);
assert.ok(avatarPourCompte('Antoine Dupont', 'joueur').startsWith('photo:/photos/'));
assert.equal(photoDe('Joueur Test'), photoDe('Joueur Test'));
assert.ok(avatarPourCompte('Nathalie Martin', 'fan').startsWith('photo:data:image/svg+xml;'));
assert.equal(avatarPourCompte('Midi Olympique', 'media'), 'initiales:Midi Olympique');
console.log('OK — achats au prix affiché, portraits locaux et replis valides');

useGame.setState({ manager: vendu });
useGame.getState().saisonManager();
const saison2 = useGame.getState().manager!;
assert.equal(saison2.saison, 2);
assert.equal(saison2.avancee!.objectifs[0].cible, saison2.objectif);
assert.equal(saison2.avancee!.dernierBilanObjectifs!.saison, 1);
assert.ok(saison2.avancee!.dernierBilanObjectifs!.objectifs.every((o) => o.etat !== 'enCours'));
console.log('OK — clôture réelle du store et conservation du bilan');
