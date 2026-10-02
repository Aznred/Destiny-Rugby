import { PHOTOS_DETOUREES_PAR_CLUB } from '../data/photosDetourees.js';
import { normaliserNomFfr } from './joueursFfr.js';

let portraitsUniques: Map<string, string | null> | undefined;
/** Le catalogue déduplique déjà les identités par nom. Un transfert garde
 * son nouveau portrait si une seule photo livrée correspond à ce nom exact. */
export function photoDetoureeCatalogue(nom: string, club: string): string | undefined {
  const cle = normaliserNomFfr(nom);
  const locale = PHOTOS_DETOUREES_PAR_CLUB[club]?.[cle];
  if (locale) return locale;
  if (!portraitsUniques) {
    portraitsUniques = new Map();
    for (const photos of Object.values(PHOTOS_DETOUREES_PAR_CLUB)) for (const [nom, url] of Object.entries(photos)) {
      const connue = portraitsUniques.get(nom);
      portraitsUniques.set(nom, portraitsUniques.has(nom) && connue !== url ? null : url);
    }
  }
  return portraitsUniques.get(cle) ?? undefined;
}
