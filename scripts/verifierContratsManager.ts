import { strict as assert } from 'node:assert';
import { useGame } from '../src/store/useGame';
import { effectifDuClub, setContratsEffectifManager, joueursLibresDuMarche } from '../src/lib/effectif';
import { signerRenegociationJoueur } from '../src/lib/carriereAvancee';
import { pseudoStable } from '../src/lib/comptes';

let sauvegarde: unknown;
useGame.persist.setOptions({ storage: {
  getItem: () => sauvegarde as never,
  setItem: (_, valeur) => { sauvegarde = JSON.parse(JSON.stringify(valeur)); },
  removeItem: () => { sauvegarde = undefined; },
} });
let controles = 0;
const verifier = (condition: unknown, message: string) => { assert.ok(condition, message); controles++; };
const creer = (club: string) => {
  useGame.getState().creerManager({ nom: 'Contrats manager', club, nation: 'France', age: 40, libre: true });
  useGame.setState(s => ({ iaActivee: false, manager: {
    ...s.manager!, budgetTransferts: 100_000_000, budgetSalarial: 100_000_000,
  } }));
  return useGame.getState().manager!;
};

// Choisir un vrai départ de l'été : le banc reproduit le défaut du monde, sans inventer son identité.
let manager = creer('Stade Toulousain');
const debut = effectifDuClub(manager.club, 1);
setContratsEffectifManager();
const ete = effectifDuClub(manager.club, 2);
const partant = debut.find(j => j.age < 31 && !ete.some(x => x.id === j.id || x.nom === j.nom));
assert.ok(partant, 'Le scénario doit contenir un départ réel du mercato');
useGame.setState({ manager: { ...manager, avancee: { ...manager.avancee!, contratsJoueurs: {
  ...manager.avancee!.contratsJoueurs, [partant.id]: {
    ...manager.avancee!.contratsJoueurs[partant.id], fin: 2, demandeRevalorisation: true,
  },
} } } });
useGame.getState().ouvrirRenegociationJoueurManager(partant.id);
let nego = useGame.getState().manager!.negociations.at(-1)!;
verifier(nego.nature === 'prolongation', 'Une hausse salariale à échéance ouvre une prolongation');
useGame.getState().accepterDemandesJoueurManager(nego.id);
useGame.getState().signerJoueurManager(nego.id);
manager = useGame.getState().manager!;
nego = manager.negociations.at(-1)!;
verifier(nego.etat === 'signee', 'La prolongation est réellement signée');
verifier(effectifDuClub(manager.club, 2).some(j => j.id === partant.id), 'Le mercato réel conserve le joueur prolongé');
verifier(effectifDuClub(manager.club, 2).filter(j => j.nom === partant.nom).length === 1, 'Une seule identité dans le club');
await useGame.persist.rehydrate();
verifier(effectifDuClub(manager.club, 2).some(j => j.id === partant.id), 'Le maintien survit au rechargement');

const annuel = signerRenegociationJoueur(manager.avancee!, {
  ...nego, offre: { ...nego.offre, duree: 1 },
}, {});
verifier(annuel.contratsJoueurs[partant.id].fin >= 3, 'Un an signé en saison 1 couvre la saison 2');
const court = signerRenegociationJoueur({ ...manager.avancee!, contratsJoueurs: {
  ...manager.avancee!.contratsJoueurs, [partant.id]: { ...manager.avancee!.contratsJoueurs[partant.id], fin: 2 },
} }, { ...nego, offre: { ...nego.offre, duree: 1 } });
verifier(court.contratsJoueurs[partant.id].fin === 3, 'La prolongation d’un an ne se termine pas à la signature');
useGame.setState({ manager: { ...manager, semaine: 53, avancee: court } });
useGame.getState().saisonManager();
verifier(useGame.getState().manager!.saison === 2, 'La clôture avance vraiment à la saison suivante');
verifier(effectifDuClub(manager.club, 2).some(j => j.id === partant.id), 'Le joueur prolongé reste après la clôture réelle');
verifier(!useGame.getState().transfertsSociaux.some(t => t.joueurId === partant.id && t.vers === 'Sans club'), 'Aucun départ libre après prolongation');

// Les sauvegardes antérieures n'ont pas encore de profil attaché au contrat.
manager = useGame.getState().manager!;
useGame.setState({ manager: { ...manager, avancee: { ...manager.avancee!, contratsJoueurs: Object.fromEntries(
  Object.entries(manager.avancee!.contratsJoueurs).map(([id, c]) => [id, { ...c, profil: undefined }]),
) } } });
await useGame.persist.rehydrate();
verifier(effectifDuClub(manager.club, 2).some(j => j.id === partant.id), 'Ancienne sauvegarde : identité récupérée avant le mercato');

// Une vente décidée par le manager reste prioritaire sur le contrat en cours.
useGame.getState().mettreEnVenteManager(partant.id);
const vente = useGame.getState().manager!.ventes.find(v => v.joueurId === partant.id)!;
assert.ok(vente?.offres[0], 'Une offre doit exister pour vérifier la vente');
useGame.getState().accepterOffreVenteManager(partant.id, vente.offres[0].id);
verifier(!effectifDuClub(manager.club, 2).some(j => j.id === partant.id), 'La vente explicite retire le joueur sous contrat');
verifier(effectifDuClub(vente.offres[0].club, 2).some(j => j.id === partant.id), 'La vente rejoint effectivement le club acheteur');

// Le mercato simulé, à partir de la saison 3, ne peut pas emporter les joueurs du manager.
manager = creer('RC Toulon');
const effectifInitial = effectifDuClub(manager.club, 1);
setContratsEffectifManager();
const saisonDeux = effectifDuClub(manager.club, 2);
const saisonTrois = effectifDuClub(manager.club, 3);
const simule = effectifInitial.find(j => saisonDeux.some(x => x.id === j.id)
  && !saisonTrois.some(x => x.id === j.id));
assert.ok(simule, 'Le scénario doit contenir un départ simulé');
useGame.setState({ manager: { ...manager, avancee: { ...manager.avancee!, contratsJoueurs: {
  ...manager.avancee!.contratsJoueurs, [simule.id]: { ...manager.avancee!.contratsJoueurs[simule.id], fin: 5 },
} } } });
verifier(effectifDuClub(manager.club, 3).some(j => j.id === simule.id), 'Le mercato simulé respecte le contrat');

// Demande refusée et contrat : l'ouverture ne ferme ni ne remplace les autres dossiers.
const pseudo = pseudoStable(simule.nom);
useGame.setState(s => ({ manager: { ...s.manager!, demandes: [
  { id: 'depart-contrats', joueurId: simule.id, pseudo, nom: simule.nom, poste: simule.poste, note: simule.note,
    type: 'depart', raison: 'contrat', saison: 1, semaine: 1, etat: 'ouverte' },
] } }));
useGame.getState().repondreDemandeManager('depart-contrats', false);
useGame.getState().ouvrirRenegociationJoueurManager(simule.id);
verifier(useGame.getState().manager!.demandes[0].etat === 'refusee', 'La demande reste refusée');
verifier(useGame.getState().manager!.negociations.at(-1)?.joueur.id === simule.id, 'La prolongation peut s’ouvrir après le refus');

// À échéance réelle, le maintien s'arrête et le joueur quitte le club.
manager = creer('Stade Toulousain');
const libre = effectifDuClub(manager.club, 1).find(j => j.age < 30)!;
useGame.setState({ manager: { ...manager, semaine: 53, avancee: { ...manager.avancee!, contratsJoueurs: {
  ...manager.avancee!.contratsJoueurs, [libre.id]: { ...manager.avancee!.contratsJoueurs[libre.id], fin: 2 },
} } } });
useGame.getState().saisonManager();
verifier(!effectifDuClub(manager.club, 2).some(j => j.id === libre.id), 'Un contrat non prolongé quitte le club à échéance');
verifier(joueursLibresDuMarche(2).some(j => j.id === libre.id), 'Le joueur libéré reste disponible au recrutement');
console.log(`OK · ${controles} contrôles des contrats manager, du mercato et des demandes.`);
