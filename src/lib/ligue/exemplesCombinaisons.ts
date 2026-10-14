/**
 * LA BIBLIOTHÈQUE D'EXEMPLES DE L'ATELIER (Correctif 41, points 10 à 13) : touche, mêlée, ruck et zone des dix mètres.
 *
 * Un exemple n'est pas un format à part : c'est un cahier ordinaire, bâti avec les ordres rapides (`donnerOrdre`) ou
 * avec les gestes du cahier, puis validé comme tout plan. On part de lui, on le retouche, on le teste en 3D.
 */
import {
  creerCombinaison, erreursVariante, toucheValide,
  type ActionCombinaison, type Combinaison, type OptionCombinaison, type PhaseCombinaison, type SituationCahier, type ToucheCombinaison, type VarianteCombinaison,
} from './combinaisons.js';
import { donnerOrdre, type OrdreCombinaison } from './ordresCombinaisons.js';

type Ordre = [numero: number, ordre: OrdreCombinaison];
interface Recette {
  id: string; phase: PhaseCombinaison; situation: SituationCahier;
  depart?: number; sauteur?: number; touche?: Partial<ToucheCombinaison>;
  /** Les gestes posés d'abord, tels quels… */
  actions?: ActionCombinaison[];
  /** … puis les ordres donnés à la suite. */
  ordres?: Ordre[];
  options?: OptionCombinaison[];
}
const passe = (destinataire: number): ActionCombinaison => ({ type: 'passe', destinataire });

const RECETTES: Recette[] = [
  // ── Mêlée ──
  { id: 'melee-large', phase: 'melee', situation: 'melee', actions: [passe(10), passe(12), passe(13)], ordres: [[13, 'course']] },
  { id: 'melee-8', phase: 'melee', situation: 'melee', depart: 8, ordres: [[8, 'course'], [7, 'soutien']] },
  { id: 'melee-8-9', phase: 'melee', situation: 'melee', depart: 8, ordres: [[8, 'fixer'], [9, 'recevoir'], [9, 'course'], [12, 'soutien']] },
  { id: 'melee-croisee', phase: 'melee', situation: 'melee', actions: [passe(10)], ordres: [[12, 'croisee'], [12, 'course'], [13, 'leurre']] },
  { id: 'melee-ferme', phase: 'melee', situation: 'melee', ordres: [[11, 'recevoir'], [11, 'course'], [8, 'soutien']] },
  { id: 'melee-rapide', phase: 'melee', situation: 'melee', actions: [passe(10)], ordres: [[10, 'course'], [12, 'soutien']] },
  { id: 'melee-pied', phase: 'melee', situation: 'melee', actions: [passe(10), { type: 'pied', intention: 'occupation' }] },
  // ── Touche ──
  { id: 'touche-devant', phase: 'touche', situation: 'touche', touche: { distance: 6.5 }, actions: [passe(9), passe(10), passe(12)], ordres: [[12, 'course']] },
  { id: 'touche-milieu', phase: 'touche', situation: 'touche', touche: { distance: 9.6 }, actions: [passe(9), passe(10), passe(12), passe(13)], ordres: [[13, 'course'], [14, 'large']] },
  { id: 'touche-fond', phase: 'touche', situation: 'touche', sauteur: 6, touche: { distance: 12.8, alignes: 7 }, actions: [passe(9), passe(10)], ordres: [[12, 'leurre'], [13, 'recevoir'], [13, 'course']] },
  { id: 'touche-feinte', phase: 'touche', situation: 'touche', touche: { distance: 9.6, feinte: true }, actions: [passe(9), passe(10), passe(12)], ordres: [[12, 'course']] },
  { id: 'touche-double', phase: 'touche', situation: 'touche', touche: { distance: 9.6, alignes: 7, doubleFeinte: true }, actions: [passe(9), passe(10), passe(12)], ordres: [[12, 'course']] },
  { id: 'touche-bloc', phase: 'touche', situation: 'touche', sauteur: 5, touche: { distance: 11.2, alignes: 7, glissement: true }, actions: [passe(9), passe(10)], ordres: [[10, 'course'], [12, 'soutien']] },
  { id: 'touche-maul', phase: 'touche', situation: 'touche', touche: { distance: 6.5, maul: true }, actions: [passe(9), passe(10)], ordres: [[10, 'course'], [12, 'soutien']] },
  { id: 'touche-avant', phase: 'touche', situation: 'touche', touche: { distance: 8.1 }, actions: [passe(9), passe(8)], ordres: [[8, 'course'], [7, 'soutien']] },
  { id: 'touche-long', phase: 'touche', situation: 'touche', sauteur: 12, touche: { distance: 20 }, ordres: [[12, 'fixer'], [13, 'recevoir'], [13, 'course'], [14, 'large']] },
  // ── Ruck ──
  { id: 'ruck-large', phase: 'ruck', situation: 'ruck', actions: [passe(10), passe(12), passe(13)], ordres: [[13, 'course']] },
  { id: 'ruck-cellule', phase: 'ruck', situation: 'ruck', ordres: [[4, 'cellule'], [10, 'derriere'], [12, 'leurre'], [13, 'recevoir'], [13, 'course'], [14, 'large']] },
  { id: 'ruck-pick', phase: 'ruck', situation: 'ruck', depart: 8, ordres: [[8, 'course'], [7, 'soutien']] },
  { id: 'ruck-lecture', phase: 'ruck', situation: 'ruck', actions: [passe(10), passe(12)], ordres: [[12, 'course'], [13, 'soutien']],
    options: [{ etape: 1, condition: 'monteeRapide', reponse: { type: 'pied', intention: 'rasant' } }, { etape: 1, condition: 'receveurMarque', reponse: { type: 'passe', destinataire: 13 } }] },
  // ── Zone des dix mètres ──
  { id: 'ligne-pick', phase: 'ruck', situation: 'ligne10', depart: 8, ordres: [[8, 'course'], [6, 'soutien']] },
  { id: 'ligne-cellule', phase: 'ruck', situation: 'ligne10', ordres: [[4, 'cellule'], [4, 'course']] },
  { id: 'ligne-maul', phase: 'touche', situation: 'ligne10', touche: { distance: 6.5, maul: true }, actions: [passe(9)], ordres: [[9, 'course'], [8, 'soutien']] },
];

export const EXEMPLES_COMBINAISONS: readonly { id: string; situation: SituationCahier }[] = RECETTES.map(({ id, situation }) => ({ id, situation }));

/** Bâtit l'exemple. `nom` : son libellé traduit. `null` si l'exemple n'existe pas (ou s'il ne passe plus la validation). */
export function exempleCombinaison(exemple: string, id: string, nom: string): Combinaison | null {
  const r = RECETTES.find((x) => x.id === exemple);
  if (!r) return null;
  const base = creerCombinaison(id, r.phase);
  const c: Combinaison = { ...base, nom, zone: r.situation === 'ligne10' ? 'ligne10' : 'toutes' };
  let v: VarianteCombinaison = { ...base.variantes[0], nom: 'Variante 1', depart: r.depart ?? 9, sauteur: r.sauteur ?? 4, placements: [], actions: [...(r.actions ?? [])],
    ...(r.phase === 'touche' ? { touche: toucheValide({ ...toucheValide(undefined), ...r.touche }) } : {}) };
  for (const [numero, ordre] of r.ordres ?? []) {
    const resultat = donnerOrdre(c, v, numero, ordre);
    if (!resultat.refus) v = resultat.variante;
  }
  if (r.options) v = { ...v, options: r.options };
  return erreursVariante(c.phase, v).length ? null : { ...c, variantes: [v] };
}
