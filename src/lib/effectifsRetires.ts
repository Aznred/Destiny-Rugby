import effectifsRetires from '../data/effectifsRetires.json' with { type: 'json' };

const normaliser = (nom: string) => nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clubs = new Set(effectifsRetires.map(normaliser));

/** Retire les identités de l'effectif, sans retirer le club de ses compétitions. */
export function effectifClubRetire(nom: unknown): boolean {
  return typeof nom === 'string' && clubs.has(normaliser(nom));
}
