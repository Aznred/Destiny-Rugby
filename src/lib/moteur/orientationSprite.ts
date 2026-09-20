import type { Orientation } from '../spritesGenerateur/models';
import type { Vec } from './terrain';

/** Le sprite reste droit à l'écran, mais regarde dans le repère de la caméra. */
export function orientationSprite(direction: Vec, angleVue: number): Orientation {
  const angle = angleVue * Math.PI / 180;
  const x = direction.x * Math.cos(angle) - direction.y * Math.sin(angle);
  const y = direction.x * Math.sin(angle) + direction.y * Math.cos(angle);
  return Math.abs(y) > Math.abs(x) * 1.15 ? y < 0 ? 'back' : 'front' : x < 0 ? 'left' : 'right';
}
