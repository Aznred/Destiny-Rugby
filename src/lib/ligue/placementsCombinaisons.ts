import { creerPion, ORDRE_MAILLOTS } from '../moteur/entites';
import { placementMelee, placementRuck, placementTouche } from '../moteur/phasesArretees';
import { structurerAttaque } from '../moteur/tactique';
import { coteOuvert, LIGNE_A } from '../moteur/terrain';
import { origineApercu, toucheValide, type Combinaison, type PointCombinaison, type VarianteCombinaison } from './combinaisons';

const cache = new Map<string, Record<number, PointCombinaison>>();

/** Les mêmes fonctions de placement que le match, converties vers les 100 m de l'atelier. */
export function positionsBaseCombinaison(c: Combinaison, v: VarianteCombinaison): Record<number, PointCombinaison> {
  const origine = origineApercu(c);
  const cle = JSON.stringify([c.phase, origine, c.phase === 'touche' ? [v.sauteur, toucheValide(v.touche)] : null]);
  let positions = cache.get(cle);
  if (!positions) {
    const mark = { x: origine.x + LIGNE_A, y: origine.y };
    const pions = ORDRE_MAILLOTS.map((poste, i) => creerPion({ id: `atelier-${i + 1}`, nom: `Joueur ${i + 1}`, poste, age: 25, note: 50, potentiel: 50, nation: 'France', regen: false }, i, 'A', false));
    const melee = placementMelee(pions, mark, 'A');
    for (const p of pions) p.pos = { ...melee[p.id] };
    let placement = melee;
    if (c.phase === 'ruck') {
      // Le ruck fixe les trois avants les plus proches et le 9. Le reste du XV
      // garde la structure offensive calculée pendant les matchs.
      structurerAttaque({ ouvert: coteOuvert(mark), porteur: null, ballon: mark, origine: mark, lancement: null }, pions, 'A');
      placement = { ...Object.fromEntries(pions.map(p => [p.id, p.cible])), ...placementRuck(pions, mark, 'A') };
    } else if (c.phase === 'touche') placement = placementTouche(pions, mark, 'A', toucheValide(v.touche).alignes, v);
    positions = Object.fromEntries(pions.map(p => [p.numero, { x: Math.max(.7, Math.min(99.3, placement[p.id].x - LIGNE_A)), y: placement[p.id].y }]));
    if (cache.size >= 80) cache.delete(cache.keys().next().value!);
    cache.set(cle, positions);
  }
  return Object.fromEntries(Object.entries(positions).map(([n, p]) => [n, { ...p }]));
}
