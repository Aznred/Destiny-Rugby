import type { BodyProportions, BodyType } from '../spritesGenerateur/models';
import type { MorphologieMatch } from './apparenceMatch';

const borner = (valeur: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, valeur));
const TYPE_POSTE: Record<MorphologieMatch, BodyType> = {
  pilier: 'prop', avant: 'forward', athletique: 'athletic', arriere: 'back', ailier: 'winger',
};

/** Les mensurations réelles modifient la silhouette, y compris à poste identique. */
export function morphologieSprite(tailleCm: number, poidsKg: number, force: number, profil: MorphologieMatch): {
  type: BodyType; corps: BodyProportions;
} {
  const taille = borner(Number.isFinite(tailleCm) ? tailleCm : 184, 155, 215);
  const poids = borner(Number.isFinite(poidsKg) ? poidsKg : 95, 55, 180);
  const puissance = borner(Number.isFinite(force) ? force : 60, 20, 100);
  const indice = poids / (taille / 100) ** 2;
  const volume = indice - 27;
  const ventre = borner((indice - 29) / 7 - (puissance - 70) / 65, 0, 1.45);
  const type = indice >= 34 ? 'prop' : indice <= 23 && profil !== 'pilier' ? 'winger' : TYPE_POSTE[profil];
  return {
    type,
    corps: {
      height: borner(taille / 184, .80, 1.18),
      torsoLength: borner(1 + (taille - 184) * .0015, .94, 1.06),
      torsoWidth: borner(.95 + volume * .039, .72, 1.52),
      belly: ventre,
      shoulderWidth: borner(.95 + volume * .017 + (puissance - 60) * .0028, .78, 1.38),
      armLength: borner(1 + (taille - 184) * .0017, .94, 1.06),
      armThickness: borner(.94 + volume * .019 + (puissance - 60) * .0028, .76, 1.32),
      legLength: borner(1 + (taille - 184) * .0032, .89, 1.11),
      legThickness: borner(.94 + volume * .023 + (puissance - 60) * .0014, .76, 1.35),
      headScale: borner(1 - (taille - 184) * .0022, .90, 1.09),
    },
  };
}
