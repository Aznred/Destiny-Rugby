import { useGame } from '../store/useGame';
import type { EtatBoutiqueCompte } from './boutiqueCompte';
import { chargerBoutiqueCompte, ErreurCarriere, sauvegarderBoutiqueCompte } from './carriereEnLigneClient';

function instantane(): EtatBoutiqueCompte {
  const s = useGame.getState();
  return {
    ovas: s.coins, achatsOvas: s.achatsOvas ?? 0, collectionSolo: s.collectionSolo,
    inventaire: s.inventaire, skinActif: s.skinActif,
    equipements: s.equipements, equipementActif: s.equipementActif,
    traitsDebloques: s.traitsDebloques,
  };
}

const empreinte = (etat: EtatBoutiqueCompte) => JSON.stringify(etat);

/** Relie la sauvegarde locale instantanee au coffre du compte connecte. */
export function activerSynchronisationBoutiqueCompte(): () => void {
  let actif = true;
  let compteConnecte = false;
  let derniere = '';
  let ecritureEnCours = false;
  let attente: { etat: EtatBoutiqueCompte; empreinte: string } | null = null;
  let generation = 0;

  const synchroniser = async () => {
    const numero = ++generation;
    try {
      const locale = instantane();
      const reponse = await chargerBoutiqueCompte();
      if (!actif || numero !== generation) return;
      if (reponse.boutique) {
        const distante = reponse.boutique;
        useGame.setState({
          coins: distante.ovas, achatsOvas: distante.achatsOvas ?? 0, collectionSolo: distante.collectionSolo,
          inventaire: distante.inventaire, skinActif: distante.skinActif,
          equipements: distante.equipements, equipementActif: distante.equipementActif,
          traitsDebloques: distante.traitsDebloques,
        });
        derniere = empreinte(distante);
      } else {
        await sauvegarderBoutiqueCompte(locale);
        if (!actif || numero !== generation) return;
        derniere = empreinte(locale);
      }
      compteConnecte = true;
    } catch (erreur) {
      if (erreur instanceof ErreurCarriere && erreur.statut === 401) compteConnecte = false;
    }
  };

  const viderAttente = async () => {
    if (ecritureEnCours) return;
    ecritureEnCours = true;
    while (actif && compteConnecte && attente) {
      const cible = attente;
      attente = null;
      try {
        await sauvegarderBoutiqueCompte(cible.etat);
        derniere = cible.empreinte;
      } catch (erreur) {
        if (erreur instanceof ErreurCarriere && erreur.statut === 401) compteConnecte = false;
        break;
      }
    }
    ecritureEnCours = false;
  };

  const desabonner = useGame.subscribe(() => {
    if (!actif || !compteConnecte) return;
    const etat = instantane();
    const suivante = empreinte(etat);
    if (suivante === derniere) return;
    // Une seule ecriture a la fois : si trois gains arrivent pendant la
    // premiere, seule la photo la plus recente attend son tour.
    attente = { etat, empreinte: suivante };
    void viderAttente();
  });

  const reconnecter = () => { compteConnecte = false; void synchroniser(); };
  const deconnecter = () => { generation++; compteConnecte = false; attente = null; };
  window.addEventListener('destiny-compte-connecte', reconnecter);
  window.addEventListener('destiny-compte-deconnecte', deconnecter);
  void synchroniser();
  return () => {
    actif = false; generation++;
    attente = null;
    desabonner();
    window.removeEventListener('destiny-compte-connecte', reconnecter);
    window.removeEventListener('destiny-compte-deconnecte', deconnecter);
  };
}
