// Instantanés anonymes : un identifiant aléatoire par carrière, aucun nom de compte.
import { decaler, debutPeriode, type PeriodeUsage } from './agregats.js';

export const TYPES_CARRIERES = ['cree', 'existant', 'entraineur'] as const;
export type TypeCarriereUsage = typeof TYPES_CARRIERES[number];
export interface CarriereUsage {
  id: string; type: TypeCarriereUsage; debut: string; dernier: string;
  club: string; poste: string; incarne?: string;
  matchs: number; saisons: number; secondes: number; fermee: boolean;
}
export interface BilanCarriereUsage {
  type: TypeCarriereUsage; nombre: number; actives: number; abandonnees: number;
  dureeJours: number; secondes: number; matchs: number; saisons: number; matchsAvantAbandon: number | null;
}
export interface DetailCarrieresUsage { bilans: BilanCarriereUsage[]; clubsExistants: { nom: string; n: number }[] }

export function validerCarrieres(brut: unknown, jour: string): CarriereUsage[] | null {
  if (!Array.isArray(brut) || brut.length > 8) return null;
  const ids = new Set<string>();
  const texte = (v: unknown) => typeof v === 'string' && v.length <= 60 && !Array.from(v).some(c => c.charCodeAt(0) < 32);
  const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
    && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  const entier = (v: unknown, max: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
  const resultat: CarriereUsage[] = [];
  for (const valeur of brut) {
    if (!valeur || typeof valeur !== 'object') return null;
    const c = valeur as CarriereUsage;
    if (typeof c.id !== 'string' || !/^[0-9a-f-]{16,64}$/.test(c.id) || ids.has(c.id)
      || !TYPES_CARRIERES.includes(c.type) || !date(c.debut) || !date(c.dernier) || c.debut > c.dernier || c.dernier > jour
      || !texte(c.club) || !texte(c.poste) || (c.incarne !== undefined && !texte(c.incarne))
      || !entier(c.matchs, 100_000) || !entier(c.saisons, 1000) || !entier(c.secondes, 100_000_000) || typeof c.fermee !== 'boolean') return null;
    ids.add(c.id);
    // Une carrière créée ne révèle jamais son nom librement saisi.
    resultat.push({ id: c.id, type: c.type, debut: c.debut, dernier: c.dernier, club: c.club, poste: c.poste,
      ...(c.type === 'existant' && c.incarne ? { incarne: c.incarne } : {}), matchs: c.matchs, saisons: c.saisons, secondes: c.secondes, fermee: c.fermee });
  }
  return resultat;
}

/** Remplace seulement les instantanés plus anciens. Les reçus répétés ne doublent aucun total. */
export function fusionnerCarrieres(courantes: CarriereUsage[], nouvelles: readonly CarriereUsage[]): void {
  for (const c of nouvelles) {
    const i = courantes.findIndex(x => x.id === c.id);
    if (i < 0) courantes.push({ ...c });
    else if (c.dernier >= courantes[i].dernier) courantes[i] = { ...c, secondes: Math.max(c.secondes, courantes[i].secondes), matchs: Math.max(c.matchs, courantes[i].matchs), saisons: Math.max(c.saisons, courantes[i].saisons), fermee: c.fermee || courantes[i].fermee };
  }
}

export function bilanCarrieres(carrieres: readonly CarriereUsage[], periode: PeriodeUsage, aujourdHui: string): DetailCarrieresUsage {
  const debut = debutPeriode(periode, aujourdHui);
  const recentes = carrieres.filter(c => c.dernier <= aujourdHui && (!debut || c.dernier >= debut));
  const active = (c: CarriereUsage) => !c.fermee && c.dernier >= decaler(aujourdHui, -29);
  const bilans = TYPES_CARRIERES.map(type => {
    const lignes = recentes.filter(c => c.type === type), abandonnees = lignes.filter(c => !active(c));
    const moyenne = (liste: readonly CarriereUsage[], f: (c: CarriereUsage) => number) => liste.length ? liste.reduce((s, c) => s + f(c), 0) / liste.length : 0;
    return { type, nombre: lignes.length, actives: lignes.filter(active).length, abandonnees: abandonnees.length,
      dureeJours: moyenne(lignes, c => (Date.parse(c.dernier) - Date.parse(c.debut)) / 86_400_000 + 1),
      secondes: moyenne(lignes, c => c.secondes), matchs: moyenne(lignes, c => c.matchs), saisons: moyenne(lignes, c => c.saisons),
      matchsAvantAbandon: abandonnees.length ? moyenne(abandonnees, c => c.matchs) : null };
  });
  const clubs = new Map<string, number>();
  for (const c of recentes) if (c.type === 'existant') clubs.set(c.club, (clubs.get(c.club) ?? 0) + 1);
  return { bilans, clubsExistants: [...clubs].map(([nom, n]) => ({ nom, n })).sort((a, b) => b.n - a.n).slice(0, 15) };
}
