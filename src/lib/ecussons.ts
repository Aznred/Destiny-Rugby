// D'OÙ VIENT L'IMAGE D'UN ÉCUSSON
//
// ⚠️ LES ÉCUSSONS DISTANTS PASSENT PAR NOTRE SERVEUR, SINON ON NE PEUT RIEN EN
// FAIRE. Sur les 1 353 écussons de clubs de la base, 599 — toute la Fédérale et
// toute la Régionale — sont servis par l'API de la FFR, qui répond
// `Access-Control-Allow-Origin: https://monclubhouse.ffr.fr`. Chargés
// directement, ils souillent le canvas : `getImageData` lève, on ne peut pas
// leur enlever leur fond blanc, et il reste un rectangle blanc à l'écran.
//
// Relayés par `/api/carriere?ecusson=…`, ils reviennent de NOTRE origine et
// redeviennent détourables comme les 754 autres. Le relais n'accepte que les
// URL déjà présentes dans les données du jeu — une liste blanche fermée, pour
// qu'il ne devienne jamais un proxy ouvert — et met en cache une semaine :
// ces écussons ne changent jamais.
//
// (Fonction séparée du composant : `components/EcussonClub.tsx` ne doit
// exporter qu'un composant, sinon le rafraîchissement à chaud de Vite décroche.)

const memeOrigine = (logo: string) => logo.startsWith('/') && !logo.startsWith('//');

export function sourceEcusson(logo: string): string {
  return memeOrigine(logo) ? logo : `/api/carriere?ecusson=${encodeURIComponent(logo)}`;
}
