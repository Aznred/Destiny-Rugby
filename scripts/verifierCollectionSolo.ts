import assert from 'node:assert/strict';
import { catalogueBaseCarriere, PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import { cleCarteSolo, etatCollectionSoloVide, IDS_PACKS_SOLO_GRATUITS, normaliserCollectionSolo, ouvrirPackSolo, packCollectionSolo, packsCollectionSolo, prixPackSolo } from '../src/lib/collectionSolo';
import { apparencePack, IDS_PACKS_AVEC_SKIN, modelePackParNom } from '../src/lib/presentationPacks';
import { clubsProfessionnelsAmicaux, composerEquipeClubProfessionnel, convertirEnCoequipiers } from '../src/lib/amicalCollection';
import { creerMatch } from '../src/lib/moteur/moteur';
import {
  actionContextuelleArcade, creerQteArcade, evaluerQteArcade, InputManagerArcade,
  MachineEtatsJoueurs, selectionnerJoueurPertinent,
} from '../src/lib/moteur/arcade';

const catalogue = catalogueBaseCarriere();
assert.ok(PACKS_CARRIERE.length >= 30, 'Le catalogue complet des packs doit rester disponible pour la ligue.');
const packsSolo = packsCollectionSolo(PACKS_CARRIERE);
assert.deepEqual(packsSolo.map(pack => pack.id), PACKS_CARRIERE.filter(pack => IDS_PACKS_AVEC_SKIN.includes(pack.id as typeof IDS_PACKS_AVEC_SKIN[number]) || IDS_PACKS_SOLO_GRATUITS.includes(pack.id as typeof IDS_PACKS_SOLO_GRATUITS[number])).map(pack => pack.id), 'La collection solo propose les packs illustrés et les trois packs gratuits.');
assert.ok(packsSolo.filter(pack => !IDS_PACKS_SOLO_GRATUITS.includes(pack.id as typeof IDS_PACKS_SOLO_GRATUITS[number])).every(pack => modelePackParNom(pack).includes('/packs-speciaux/')), 'Chaque pack payant solo doit afficher sa propre pochette.');
assert.deepEqual(packsSolo.filter(pack => IDS_PACKS_SOLO_GRATUITS.includes(pack.id as typeof IDS_PACKS_SOLO_GRATUITS[number])).map(pack => pack.id), ['bronze', 'standard', 'or'], 'Bronze, Argent et Or restent gratuits dans la roue solo.');
assert.ok(IDS_PACKS_SOLO_GRATUITS.every(id => modelePackParNom(PACKS_CARRIERE.find(pack => pack.id === id)!).includes('/m3d/packs/')), 'Les trois packs gratuits utilisent leur visuel de rareté.');
for (const id of ['prod2', 'premiership', 'leagueOne', 'urc', 'sixNations']) {
  assert.equal(modelePackParNom(PACKS_CARRIERE.find(pack => pack.id === id)!), `/m3d/packs-speciaux/${id}.glb`, `Le pack ${id} affiche sa pochette correspondante.`);
}
for (const id of ['standard', 'grand', 'premium', 'rugbyChampionship']) {
  assert.ok(modelePackParNom(PACKS_CARRIERE.find(pack => pack.id === id)!).includes('/m3d/packs/'), `Le pack ${id} ne doit pas afficher le logo d'une autre compétition.`);
}
assert.equal(new Set(PACKS_CARRIERE.map(pack => pack.id)).size, PACKS_CARRIERE.length, 'Chaque pack doit avoir un identifiant unique.');
assert.ok(catalogue.length >= 78_000, 'Le catalogue mondial complet doit etre disponible hors ligne.');
assert.deepEqual([...IDS_PACKS_SOLO_GRATUITS], ['bronze', 'standard', 'or']);
for (const id of IDS_PACKS_SOLO_GRATUITS) {
  const pack = PACKS_CARRIERE.find(candidat => candidat.id === id);
  assert.ok(pack, `Le pack gratuit ${id} doit exister.`);
  assert.equal(prixPackSolo(pack), 0, `Le pack ${id} doit etre gratuit dans la collection solo.`);
}
const premierPayant = PACKS_CARRIERE.find(pack => !IDS_PACKS_SOLO_GRATUITS.includes(pack.id as typeof IDS_PACKS_SOLO_GRATUITS[number]))!;
assert.ok(prixPackSolo(premierPayant) > 0 && prixPackSolo(premierPayant) <= 350, 'Les packs payants en solo doivent avoir des tarifs calibres (25-350 Ovas).');
assert.ok(premierPayant.prix >= 400, 'Les prix de base pour le jeu en ligne doivent rester intacts.');

const chanceDansUnPack = (probabiliteParCarte: number, cartes: number) => 1 - (1 - probabiliteParCarte / 100) ** cartes;
const gratuitsSolo = IDS_PACKS_SOLO_GRATUITS.map(id => packCollectionSolo(PACKS_CARRIERE.find(pack => pack.id === id)!));
for (const pack of gratuitsSolo) {
  const chanceRouge = chanceDansUnPack(pack.probabilites.star, pack.cartes);
  assert.ok(chanceRouge >= 0.0009 && chanceRouge <= 0.0011, `Le pack gratuit ${pack.id} doit donner environ une rouge sur 1 000 packs.`);
}
assert.equal(gratuitsSolo.find(pack => pack.id === 'bronze')!.probabilites.elite, 0, 'Le pack Bronze gratuit ne doit pas distribuer de bleue.');
assert.equal(gratuitsSolo.find(pack => pack.id === 'standard')!.probabilites.elite, 0, 'Le pack Argent gratuit ne doit pas distribuer de bleue.');
const packOrGratuit = gratuitsSolo.find(pack => pack.id === 'or')!;
const chanceBleueOr = chanceDansUnPack(packOrGratuit.probabilites.elite, packOrGratuit.cartes);
assert.ok(chanceBleueOr >= 0.009 && chanceBleueOr <= 0.011, 'Le pack Or gratuit doit donner environ une bleue sur 100 packs.');
assert.deepEqual(packCollectionSolo(premierPayant).probabilites, premierPayant.probabilites, 'Les probabilites des packs payants doivent rester intactes.');
assert.equal(apparencePack(gratuitsSolo.find(pack => pack.id === 'standard')!), 'argent', 'Le pack Argent doit utiliser le modele 3D argent meme si le Bronze reste le tirage le plus courant.');

const clubsProfessionnels = clubsProfessionnelsAmicaux(catalogue);
assert.ok(clubsProfessionnels.length >= 20, 'Le mode contre ordinateur doit proposer plusieurs championnats professionnels.');
const equipeOrdinateur = composerEquipeClubProfessionnel(clubsProfessionnels[0].nom, catalogue);
assert.equal(equipeOrdinateur.joueurs.length, 15, 'Le club professionnel adverse doit aligner un XV complet.');
assert.ok(equipeOrdinateur.joueurs.every(joueur => joueur.clubReel === clubsProfessionnels[0].nom), 'Le XV ordinateur doit uniquement contenir les joueurs du club choisi.');

const autreEquipe = composerEquipeClubProfessionnel(clubsProfessionnels.find(club => club.nom !== clubsProfessionnels[0].nom)!.nom, catalogue);
const matchArcade = creerMatch(
  equipeOrdinateur.nom, autreEquipe.nom,
  convertirEnCoequipiers(equipeOrdinateur.joueurs), convertirEnCoequipiers(autreEquipe.joueurs),
  20, 17, 'verification-arcade', undefined, { niveau: 'pro', tempsReel: true, controle: false },
);
matchArcade.phase = 'jeuCourant';
matchArcade.porteur = matchArcade.pions.find(pion => pion.cote === 'A')!;
matchArcade.possession = 'A';
assert.equal(selectionnerJoueurPertinent(matchArcade, 'A')?.id, matchArcade.porteur.id, 'Le porteur doit devenir automatiquement le joueur controle en attaque.');
const defenseur = selectionnerJoueurPertinent(matchArcade, 'B');
assert.ok(defenseur && defenseur.cote === 'B', 'Le changement defensif doit choisir un joueur capable d intervenir.');
assert.equal(actionContextuelleArcade(matchArcade, matchArcade.porteur).principale, 'raffut', 'L action principale du porteur doit devenir un raffut.');
assert.equal(actionContextuelleArcade(matchArcade, defenseur).principale, 'plaquage', 'L action principale du defenseur doit devenir un plaquage.');

const commandes = new InputManagerArcade();
assert.equal(commandes.enfoncer('KeyQ'), 'PASS_LEFT', 'Le clavier doit etre traduit en action logique.');
commandes.emettre('PASS_LEFT');
assert.equal(commandes.trame(null).evenements[0]?.action, 'PASS_LEFT', 'La trame reseau doit transporter l intention, pas la touche physique.');
commandes.acquitter(1);
assert.equal(commandes.trame(null).evenements.length, 0, 'Une commande acquittee ne doit jamais etre rejouee en double.');

const machine = new MachineEtatsJoueurs();
assert.ok(machine.transition('A1', 'SCRUM'));
assert.equal(machine.transition('A1', 'TACKLING'), false, 'Un joueur en melee ne doit pas pouvoir lancer un plaquage.');
assert.equal(machine.autorise('A1', 'ACTION_PRIMARY'), true, 'La QTE de melee doit rester utilisable.');

const qte = creerQteArcade('melee', 'meme-graine', 10_000);
const qteBis = creerQteArcade('melee', 'meme-graine', 10_000);
assert.deepEqual(qte, qteBis, 'La fenetre QTE doit etre deterministe sur tous les clients.');
assert.equal(evaluerQteArcade(qte, qte.debutServeur + qte.cible * qte.dureeMs).qualite, 'excellent', 'Un input dans la zone centrale doit etre excellent, independamment du framerate.');

const cles = catalogue.map(carte => cleCarteSolo(carte.sourceId));
assert.equal(new Set(cles).size, catalogue.length, 'Les empreintes des joueurs doivent rester uniques.');

const ancienne = normaliserCollectionSolo({ possedees: cles.slice(0, 2), packsOuverts: { bronze: 1 }, doublons: 0 });
assert.equal(Object.keys(ancienne.quantites).length, 2, 'L ancienne collection gratuite doit etre conservee sur le compte.');

let etat = etatCollectionSoloVide();
for (const packBase of PACKS_CARRIERE) {
  const pack = packCollectionSolo(packBase);
  assert.ok(pack.cartes >= 10, `Le pack ${pack.id} doit contenir au moins 10 cartes en solo.`);
  assert.ok(pack.cartes > packBase.cartes, `Le pack ${pack.id} doit avoir plus de cartes en solo que le pack en ligne (${pack.cartes} vs ${packBase.cartes}).`);
  const resultat = ouvrirPackSolo(pack, catalogue, etat, () => .37);
  assert.equal(resultat.indices.length, pack.cartes, `Le pack ${pack.id} doit livrer le nombre de cartes annonce.`);
  if (pack.garantie) {
    const seuil = ['bronze', 'argent', 'or', 'elite', 'star'].indexOf(pack.garantie);
    assert.ok(resultat.indices.some(indice => ['bronze', 'argent', 'or', 'elite', 'star'].indexOf(catalogue[indice].rarete) >= seuil), `La garantie du pack ${pack.id} doit etre tenue.`);
  }
  etat = resultat.etat;
}

const bronze = PACKS_CARRIERE.find(pack => pack.id === 'bronze')!;
const premier = ouvrirPackSolo(bronze, catalogue, etatCollectionSoloVide(), () => .37);
assert.ok(premier.indices.length > new Set(premier.indices).size, 'Un pack doit pouvoir contenir plusieurs exemplaires du meme joueur.');
assert.ok(premier.etat.doublons > 0, 'Les exemplaires repetes doivent etre comptes comme doublons.');
const cleDouble = cleCarteSolo(catalogue[premier.indices[0]].sourceId);
assert.ok(premier.etat.quantites[cleDouble] > 1, 'La quantite possedee doit conserver les doublons.');

assert.equal(Object.values(etat.packsOuverts).reduce((somme, valeur) => somme + valeur, 0), PACKS_CARRIERE.length);
console.log(`OK — collection de compte verifiee sur ${catalogue.length} joueurs, packs avec skin et doublons actifs.`);
