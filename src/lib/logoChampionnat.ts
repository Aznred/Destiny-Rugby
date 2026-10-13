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

/**
 * ⚠️ LES CHAMPIONNATS FÉMININS SONT DES COMPÉTITIONS COMME LES AUTRES (Correctif 40). Leurs douze logos étaient livrés
 * (`LOGO_COMPETITION`, identifiants `f-…`), mais ce pont ne parcourait que `COMPETITIONS` — le monde masculin, où ils ne
 * sont pas (leurs clubs portent les mêmes noms que ceux des joueurs). Mesuré sur les 1 803 cartes de joueuses : pas une
 * seule ne trouvait le logo de sa ligue, ni sur la carte ni sur la fiche.
 *
 * Le nom → l'identifiant, tels que `data/mondeFeminin.generated.ts` les déclare. La table est recopiée ici plutôt
 * qu'importée : ce module est chargé par chaque carte affichée, le monde féminin pèse ses 2 400 joueuses.
 * `npm run verify:correctif40` vérifie qu'elle dit la même chose que lui, et que chaque logo existe.
 */
export const CHAMPIONNATS_FEMININS_PAR_NOM: Readonly<Record<string, string>> = {
  "Premiership Women's Rugby": 'f-pwr',
  'Super Rugby Aupiki': 'f-aupiki',
  'Élite 1 Féminine': 'f-elite1',
  "Super Rugby Women's": 'f-superw',
  'Farah Palmer Cup Premiership': 'f-fpc',
  'Farah Palmer Cup Championship': 'f-fpc2',
  'Celtic Challenge': 'f-celtic',
  'Serie A Élite Femminile': 'f-seriea',
  'Liga Iberdrola': 'f-liga',
  'Élite 2 Féminine': 'f-elite2',
  "Women's All-Ireland League 1A": 'f-ail',
  "Women's All-Ireland League 1B": 'f-ail2',
};

/** Le même nom, quelle que soit sa graphie : une carte distribuée avant une retouche des accents garde son logo. */
const cle = (nom: string): string => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").trim().toLowerCase();

let parNom: Map<string, string> | undefined;

export function logoChampionnat(championnat: string | undefined): string | undefined {
  if (!championnat) return undefined;
  if (!parNom) {
    const logos: Record<string, string> = { ...LOGO_COMPETITION, ...LOGO_COMPETITION_NOUVEAU };
    parNom = new Map();
    for (const [nom, id] of Object.entries(CHAMPIONNATS_FEMININS_PAR_NOM)) {
      const logo = logos[id];
      if (logo) parNom.set(cle(nom), logo);
    }
    // Les championnats du monde chargé passent APRÈS : à nom égal, c'est leur logo qui fait foi.
    for (const competition of COMPETITIONS) {
      const logo = logos[competition.id];
      if (logo) parNom.set(cle(competition.nom), logo);
    }
  }
  return parNom.get(cle(championnat));
}
