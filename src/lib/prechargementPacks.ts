// LE PRÉCHARGEMENT DE L'OUVERTURE DE PACK
//
// ⚠️ SIGNALÉ EN JEU : « il y a de la latence en attendant que le pack
// s'affiche ». Trois attentes s'additionnaient, l'une après l'autre, au moment
// exact où l'écran devait bouger :
//
//   1. une pause décorative de 380 ms avant même d'appeler le serveur ;
//   2. l'aller-retour serveur, pendant lequel RIEN ne s'affichait ;
//   3. l'import dynamique du module 3D, puis le téléchargement de la pochette
//      OUVERTE — 1,2 Mo demandés une fois la modale déjà à l'écran.
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

import { modelePack } from './presentationPacks';
import type { RareteCarriere } from './ligue/typesCarriere';

/**
 * Réchauffe ce qu'il faut pour montrer une pochette.
 *
 * ⚠️ UNE RARETÉ, PAS LES CINQ. Sans précision on ne prend que le bronze :
 * télécharger les dix variantes ferait douze mégaoctets pour une pochette dont
 * une seule sera vue — et sur un forfait mobile, c'est le manager qui paie.
 * Appelé sans risque plusieurs fois : `useGLTF.preload` et l'import dynamique
 * sont tous deux idempotents.
 */
export function prechargerOuverturePack(rarete?: RareteCarriere): void {
  void import('../components/Pack3D').catch(() => {});
  void import('@react-three/drei').then(({ useGLTF }) => {
    for (const r of rarete ? [rarete] : (['bronze'] as RareteCarriere[])) {
      useGLTF.preload(modelePack(r));
      useGLTF.preload(modelePack(r, true));
    }
  }).catch(() => {});
}
