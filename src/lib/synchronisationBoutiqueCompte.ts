import { useGame } from '../store/useGame';
import { differencesBoutiqueCompte, type EtatBoutiqueCompte } from './boutiqueCompte';
import { chargerBoutiqueCompte, ErreurCarriere, modifierBoutiqueCompte, sauvegarderBoutiqueCompte } from './carriereEnLigneClient';

let collectionDistante = false;
let avantActionDistante: (() => Promise<void>) | undefined;
/** Enregistre les packs locaux en attente avant qu'un pack serveur avance la révision. */
export async function attendreBoutiqueSoloEnregistree(): Promise<void> {
  if (!avantActionDistante) throw new Error('La synchronisation du compte est indisponible.');
  await avantActionDistante();
}
/** Un échange est déjà enregistré côté serveur : sa réception ne se renvoie pas. */
export function appliquerCollectionSoloDistante(collection: EtatBoutiqueCompte['collectionSolo']): void {
  if ((collection.revision ?? 0) < (useGame.getState().collectionSolo.revision ?? 0)) return;
  collectionDistante = true;
  try { useGame.setState({ collectionSolo: collection }); }
  finally { collectionDistante = false; }
}

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
  let confirmee: EtatBoutiqueCompte | null = null;
  let ecritureEnCours = false;
  let attente: { etat: EtatBoutiqueCompte; empreinte: string } | null = null;
  let generation = 0;
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  let delaiReprise = 500;
  const finsEcriture: (() => void)[] = [];
  let lectureInitiale: Promise<void>;

  const planifier = () => {
    if (!minuterie && !ecritureEnCours && actif && compteConnecte) {
      minuterie = setTimeout(() => { minuterie = undefined; void viderAttente(); }, delaiReprise);
    }
  };

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
        confirmee = instantane();
        derniere = empreinte(confirmee);
      } else {
        await sauvegarderBoutiqueCompte(locale);
        if (!actif || numero !== generation) return;
        confirmee = locale;
        derniere = empreinte(locale);
      }
      compteConnecte = true;
    } catch (erreur) {
      if (erreur instanceof ErreurCarriere && erreur.statut === 401) compteConnecte = false;
    }
  };

  const viderAttente = async () => {
    if (ecritureEnCours) { await new Promise<void>(resolve => finsEcriture.push(resolve)); return; }
    ecritureEnCours = true;
    while (actif && compteConnecte && attente) {
      const cible = attente;
      attente = null;
      if (cible.empreinte === derniere) continue;
      const numero = generation;
      try {
        const reponse = confirmee
          ? await modifierBoutiqueCompte(differencesBoutiqueCompte(confirmee, cible.etat))
          : await sauvegarderBoutiqueCompte(cible.etat);
        if (!actif || numero !== generation) break;
        const dejaRecue = confirmee?.collectionSolo;
        confirmee = { ...cible.etat, collectionSolo: dejaRecue
          && (dejaRecue.revision ?? 0) > (cible.etat.collectionSolo.revision ?? 0)
          ? dejaRecue : cible.etat.collectionSolo };
        derniere = empreinte(confirmee);
        if (reponse.boutique && (reponse.boutique.collectionSolo.revision ?? 0) > (cible.etat.collectionSolo.revision ?? 0)) {
          appliquerCollectionSoloDistante(reponse.boutique.collectionSolo);
        }
        if (reponse.boutique) {
          // Une correction Stripe est reconnue une fois ; les modifications
          // locales arrivées pendant le POST restent en attente.
          const distante = reponse.boutique;
          const actuelle = instantane();
          const changements: Partial<ReturnType<typeof useGame.getState>> = {};
          const champs = { ovas: 'coins', achatsOvas: 'achatsOvas', inventaire: 'inventaire', skinActif: 'skinActif',
            equipements: 'equipements', equipementActif: 'equipementActif', traitsDebloques: 'traitsDebloques' } as const;
          for (const cle of Object.keys(champs) as (keyof typeof champs)[]) {
            const valeur = cle === 'achatsOvas' ? distante.achatsOvas ?? 0 : distante[cle];
            Object.assign(confirmee, { [cle]: valeur });
            if (JSON.stringify(actuelle[cle]) === JSON.stringify(cible.etat[cle])) Object.assign(changements, { [champs[cle]]: valeur });
          }
          // Ajouter la correction aux gains/dépenses apparus entre-temps,
          // sinon la prochaine écriture annulerait le crédit de l'achat.
          changements.coins = actuelle.ovas + distante.ovas - cible.etat.ovas;
          for (const cle of ['inventaire', 'equipements', 'traitsDebloques'] as const) {
            const acquisitions = distante[cle].filter(id => !cible.etat[cle].includes(id));
            changements[cle] = [...new Set([...actuelle[cle], ...acquisitions])];
          }
          derniere = empreinte(confirmee);
          useGame.setState(changements);
        }
        const actuelle = instantane();
        const cle = empreinte(actuelle);
        attente = cle === derniere ? null : { etat: actuelle, empreinte: cle };
        delaiReprise = 500;
        // Même pendant une rafale de packs, laisser les changements se
        // regrouper entre deux envois au lieu de vider une boucle sans pause.
        break;
      } catch (erreur) {
        if (erreur instanceof ErreurCarriere && erreur.statut === 401) compteConnecte = false;
        if (actif && numero === generation && compteConnecte) {
          const actuelle = instantane(), cle = empreinte(actuelle);
          attente = cle === derniere ? null : { etat: actuelle, empreinte: cle };
          delaiReprise = Math.min(60_000, Math.max(5000, delaiReprise * 2));
        }
        break;
      }
    }
    ecritureEnCours = false;
    for (const resolve of finsEcriture.splice(0)) resolve();
    if (attente) planifier();
  };

  const avantAction = async () => {
    await lectureInitiale;
    if (!actif || !compteConnecte) throw new Error('Connecte-toi pour ouvrir ce pack.');
    while (attente || ecritureEnCours) {
      clearTimeout(minuterie); minuterie = undefined;
      await viderAttente();
      if (!actif || !compteConnecte || delaiReprise > 500) {
        throw new Error('Impossible de sauvegarder ta collection. Réessaie dans un instant.');
      }
    }
  };
  avantActionDistante = avantAction;

  const desabonner = useGame.subscribe((etatStore, precedent) => {
    if (!actif || !compteConnecte) return;
    // Les changements de navigation, de chrono et de carrière n'affectent
    // pas le coffre. Ne pas sérialiser la collection sur chaque mise à jour.
    if (etatStore.coins === precedent.coins && etatStore.achatsOvas === precedent.achatsOvas
      && etatStore.collectionSolo === precedent.collectionSolo && etatStore.inventaire === precedent.inventaire
      && etatStore.skinActif === precedent.skinActif && etatStore.equipements === precedent.equipements
      && etatStore.equipementActif === precedent.equipementActif && etatStore.traitsDebloques === precedent.traitsDebloques) return;
    const etat = instantane();
    if (collectionDistante && confirmee) {
      confirmee = { ...confirmee, collectionSolo: etat.collectionSolo };
      derniere = empreinte(confirmee);
    }
    const suivante = empreinte(etat);
    if (suivante === derniere) { attente = null; return; }
    // Une seule ecriture a la fois : si trois gains arrivent pendant la
    // premiere, seule la photo la plus recente attend son tour.
    attente = { etat, empreinte: suivante };
    // Regroupe les gains successifs dans une sauvegarde. Un état déjà envoyé
    // est comparé de nouveau juste avant l'écriture.
    planifier();
  });

  const reconnecter = () => { compteConnecte = false; lectureInitiale = synchroniser(); };
  const deconnecter = () => { generation++; compteConnecte = false; attente = null; clearTimeout(minuterie); minuterie = undefined; };
  window.addEventListener('destiny-compte-connecte', reconnecter);
  window.addEventListener('destiny-compte-deconnecte', deconnecter);
  const surFermeture = () => { clearTimeout(minuterie); minuterie = undefined; void viderAttente(); };
  window.addEventListener('pagehide', surFermeture);
  lectureInitiale = synchroniser();
  return () => {
    if (avantActionDistante === avantAction) avantActionDistante = undefined;
    actif = false; generation++;
    clearTimeout(minuterie);
    attente = null;
    desabonner();
    window.removeEventListener('destiny-compte-connecte', reconnecter);
    window.removeEventListener('destiny-compte-deconnecte', deconnecter);
    window.removeEventListener('pagehide', surFermeture);
  };
}
