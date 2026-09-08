// LE LOGO DU CHAMPIONNAT D'UNE CARTE
//
// ⚠️ UNE CARTE PORTE UN NOM DE CHAMPIONNAT, PAS UN IDENTIFIANT. `CarteCarriere`
// range « Top 14 », « Gallagher Premiership », « Régionale 3 » — le nom lisible
// que `catalogueCarriere` recopie depuis la compétition d'origine. Les tables de
// logos, elles, sont indexées par identifiant (`top14`, `premiership`, `reg3`).
// Ce module fait le pont, une seule fois, à la première demande.
//
// ⚠️ ET IL REND `undefined` PLUTÔT QU'UN REPLI. `LogoCompet` dessine une icône
// de ballon quand il n'a pas d'image : sur une carte de joueur, sous l'écusson
// du club, ce ballon générique se lirait comme un vrai blason de championnat.
// Mesuré : 20 championnats sur 22 ont leur logo, et ils couvrent 99,9 % des
// 78 083 joueurs du vivier — les deux exceptions (« Autres clubs européens »,
// « Championnat professionnel ») ne sont pas des compétitions, ce sont des
// fourre-tout. Mieux vaut donc ne rien afficher pour ces 76 cartes-là.

import { COMPETITIONS } from '../data/clubs';
import { LOGO_COMPETITION } from '../data/logosCompetitions';
import { LOGO_COMPETITION_NOUVEAU } from '../data/nouvellesLigues';

let parNom: Map<string, string> | undefined;

export function logoChampionnat(championnat: string | undefined): string | undefined {
  if (!championnat) return undefined;
  if (!parNom) {
    const logos: Record<string, string> = { ...LOGO_COMPETITION, ...LOGO_COMPETITION_NOUVEAU };
    parNom = new Map();
    for (const competition of COMPETITIONS) {
      const logo = logos[competition.id];
      if (logo) parNom.set(competition.nom, logo);
    }
  }
  return parNom.get(championnat);
}
