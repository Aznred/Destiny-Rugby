// LE PRÉCHARGEMENT DE L'OUVERTURE DE PACK
//
// ⚠️ SIGNALÉ EN JEU : « il y a de la latence en attendant que le pack
// s'affiche ». Trois attentes s'additionnaient, l'une après l'autre, au moment
// exact où l'écran devait bouger :
//
//   1. une pause décorative de 380 ms avant même d'appeler le serveur ;
//   2. l'aller-retour serveur, pendant lequel RIEN ne s'affichait ;
//   3. l'import dynamique du module 3D, puis le téléchargement du modèle
//      nécessaire à la révélation.
//
// La pause a disparu, la modale s'ouvre au clic sans attendre la réponse, et ce
// module s'occupe du troisième point : il réchauffe le morceau 3D et les
// modèles PENDANT que le manager regarde le présentoir.
//
// ⚠️ IL VIT HORS DES COMPOSANTS, et ce n'est pas un détail de rangement. Exporté
// depuis `Pack3D.tsx`, il forçait le Fast Refresh à recharger tout le module à
// chaque retouche ; importé statiquement, il tirerait Three.js et ses 263 Ko
// dans le bundle principal. Les deux imports sont donc DYNAMIQUES : rien n'est
// téléchargé tant que personne n'entre dans la boutique.

import { apparencePack, modelePack, modelePackParNom, packAvecSkin } from './presentationPacks';
import type { PackCarriere } from './ligue/typesCarriere';

/**
 * Réchauffe ce qu'il faut pour montrer la pochette du pack choisi.
 *
 * Sans pack précis on ne prend que le bronze générique : télécharger tout le
 * catalogue ferait dépenser des données pour des pochettes non consultées.
 * Appelé sans risque plusieurs fois : `useGLTF.preload` et l'import dynamique
 * sont tous deux idempotents.
 */
export function prechargerOuverturePack(pack?: PackCarriere): void {
  void import('../components/Pack3D').catch(() => {});
  void import('@react-three/drei').then(({ useGLTF }) => {
    if (pack) {
      useGLTF.preload(modelePackParNom(pack));
      if (!packAvecSkin(pack)) useGLTF.preload(modelePack(apparencePack(pack), true));
    } else {
      useGLTF.preload(modelePack('bronze'));
      useGLTF.preload(modelePack('bronze', true));
    }
  }).catch(() => {});
}
