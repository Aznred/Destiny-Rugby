// LA RARETÉ D'UNE CARTE ET LE FILTRE D'UN PACK — sans le catalogue mondial
//
// ⚠️ SÉPARÉ DE `catalogueCarriere.ts` POUR UNE RAISON DE POIDS. Ces deux règles
// servent aussi à la Collection solo, dont le module est importé par le store :
// les y prendre depuis `catalogueCarriere` ferait entrer les 78 000 joueurs du
// catalogue dans le paquet principal du jeu. `catalogueCarriere` les réexporte.

import { POSTE_PAR_ID } from '../../data/rugby.js';
import type { CarteCarriere, FiltrePack, RareteCarriere } from './typesCarriere.js';

export function rareteCarriere(note: number): RareteCarriere {
  return note >= 88 ? 'star' : note >= 80 ? 'elite' : note >= 65 ? 'or' : note >= 50 ? 'argent' : 'bronze';
}

/**
 * Une carte entre-t-elle dans ce pack ? Chaque champ du filtre est un ET ; à
 * l'intérieur d'un champ, c'est un OU.
 */
export function carteDansPack(c: Pick<CarteCarriere, 'poste' | 'famille' | 'pays' | 'nation' | 'championnat' | 'age'>, filtre?: FiltrePack): boolean {
  if (!filtre) return true;
  // ⚠️ « Avant » PORTE UNE MAJUSCULE dans `data/rugby.ts`. Comparé en
  // minuscules, le pack Avants ne trouvait personne et le pack Arrières
  // renvoyait tout le catalogue, piliers compris.
  if (filtre.categorie) {
    const avant = POSTE_PAR_ID[c.poste].categorie === 'Avant';
    if (avant !== (filtre.categorie === 'avant')) return false;
  }
  if (filtre.familles && !filtre.familles.includes(c.famille)) return false;
  if (filtre.championnats && !filtre.championnats.includes(c.championnat)) return false;
  if (filtre.pays && !filtre.pays.includes(c.pays)) return false;
  if (filtre.nations && !filtre.nations.includes(c.nation)) return false;
  if (filtre.horsFrance && c.pays === 'France') return false;
  if (filtre.ageMax !== undefined && c.age > filtre.ageMax) return false;
  if (filtre.ageMin !== undefined && c.age < filtre.ageMin) return false;
  return true;
}
