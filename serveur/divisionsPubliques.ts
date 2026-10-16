import { classementCarriere } from '../src/lib/ligue/carriere.js';
import { capaciteDivision, eloInitial, monteeMaximum, positionPublique } from '../src/lib/ligue/pyramidePublique.js';
import type { CarteCarriere, ClubCarriere, HistoireCarriere, LigneClassementCarriere } from '../src/lib/ligue/typesCarriere.js';
import type { LigueStockee } from './carriereStockage.js';
import { actualiserEloPublic } from './eloPublic.js';

export interface HeritierDivision { club: ClubCarriere; cartes: CarteCarriere[]; histoire?: HistoireCarriere[] }
export interface EquipePyramide extends LigneClassementCarriere {
  compteId: string; ligueId: string; division: number; poule: number; rang: number; elo: number;
}
export interface PlanPoule { division: number; poule: number; equipes: EquipePyramide[] }
export interface PlanDivision { division: number; poule: number; heritiers: HeritierDivision[]; barrage?: string }

/** Petit résumé sans cartes ni films : le reclassement de 100 000 comptes ne charge pas leurs effectifs. */
export function equipesPyramide(ligne: LigueStockee): EquipePyramide[] {
  if (!ligne.etat.publique) return [];
  const etat = actualiserEloPublic(ligne.etat);
  const clubs = new Map(etat.clubs.map(c => [c.id, c]));
  return classementCarriere(etat).map((l, i) => ({ ...l, compteId: clubs.get(l.clubId)!.compteId,
    ligueId: ligne.id, ...positionPublique(etat.publique!), rang: i + 1, elo: clubs.get(l.clubId)!.eloPublic?.valeur ?? 1500 }));
}

const sportif = (a: EquipePyramide, b: EquipePyramide) => a.rang - b.rang
  || b.points / Math.max(1, b.joues) - a.points / Math.max(1, a.joues)
  || b.difference / Math.max(1, b.joues) - a.difference / Math.max(1, a.joues)
  || b.elo - a.elo || a.compteId.localeCompare(b.compteId);

export function planifierPyramide(equipes: readonly EquipePyramide[]): PlanPoule[] {
  const comptes = new Set<string>();
  for (const e of equipes) {
    if (comptes.has(e.compteId)) throw new Error('Un compte figure dans plusieurs poules publiques : reclassement suspendu.');
    comptes.add(e.compteId);
  }
  if (!equipes.length) return [];
  const moyennes = new Map<string, { total: number; nombre: number }>();
  for (const e of equipes) {
    const cle = `${e.division}:${e.poule}`, m = moyennes.get(cle) ?? { total: 0, nombre: 0 };
    m.total += e.elo; m.nombre++; moyennes.set(cle, m);
  }
  let reste = equipes.length, derniere = 1;
  while (reste > capaciteDivision(derniere)) { reste -= capaciteDivision(derniere); derniere++; }
  const elite = equipes.filter(e => e.division === 1).sort(sportif);
  const qualifies = equipes.filter(e => e.division === 2 && e.rang <= 2 && e.joues > 0).sort(sportif);
  const changements = Math.min(4, qualifies.length, elite.filter(e => e.joues > 0).length);
  const conserves = elite.slice(0, Math.max(0, elite.length - changements));
  const entrants = qualifies.slice(0, changements);
  entrants.push(...qualifies.slice(changements, changements + Math.max(0, 16 - conserves.length - entrants.length)));
  const d1 = [...conserves, ...entrants];
  const elus = new Set(d1.map(e => e.compteId));
  const releguesD1 = new Set(elite.filter(e => !elus.has(e.compteId)).map(e => e.compteId));
  const candidats = equipes.filter(e => !elus.has(e.compteId)).map(e => {
    const m = moyennes.get(`${e.division}:${e.poule}`)!;
    const boost = monteeMaximum(e.rang, e.joues, e.gagnes, e.difference, e.elo, m.total / m.nombre);
    const dernierDePoule = e.rang > m.nombre - 4;
    const cible = releguesD1.has(e.compteId) ? 2 : e.joues && e.rang <= 2 ? Math.max(2, e.division - boost)
      : e.joues && dernierDePoule && e.division < derniere ? e.division + 1 : e.division;
    return { e, cible, limite: e.joues ? Math.min(derniere, e.division + 1) : e.division };
  });
  const repartition = new Map<number, EquipePyramide[]>([[1, d1]]);
  for (let division = 2; division <= derniere; division++) {
    const places = Math.min(capaciteDivision(division), equipes.length - [...repartition.values()].reduce((n, l) => n + l.length, 0));
    const disponibles = candidats.filter(c => !elus.has(c.e.compteId) && (c.cible <= division || c.limite <= division));
    disponibles.sort((a, b) => +(b.limite <= division) - +(a.limite <= division)
      || +(b.e.division === division && b.cible <= division) - +(a.e.division === division && a.cible <= division)
      || sportif(a.e, b.e));
    if (disponibles.length < places) {
      // Ne pas faire descendre quatre clubs lorsqu'il n'existe pas assez de qualifiés pour les remplacer.
      disponibles.push(...candidats.filter(c => !elus.has(c.e.compteId) && c.e.division === division && c.cible > division)
        .sort((a, b) => sportif(a.e, b.e)).slice(0, places - disponibles.length));
    }
    const retenus = disponibles.slice(0, places).map(c => c.e);
    for (const e of retenus) elus.add(e.compteId);
    repartition.set(division, retenus);
  }
  // Les places encore libres se comblent sans inventer de résultats ni exclure de compte.
  for (const e of equipes.filter(e => !elus.has(e.compteId)).sort((a, b) => a.division - b.division || sportif(a, b))) {
    const niveaux = Array.from({ length: derniere }, (_, i) => i + 1)
      .filter(d => (repartition.get(d)?.length ?? 0) < capaciteDivision(d));
    const d = niveaux.find(d => d >= Math.max(1, e.division - 1)) ?? niveaux.at(-1)!;
    const liste = repartition.get(d) ?? []; liste.push(e); repartition.set(d, liste); elus.add(e.compteId);
  }
  const plans: PlanPoule[] = [];
  for (const [division, membres] of repartition) {
    const nombre = Math.ceil(membres.length / 16);
    const poules = Array.from({ length: nombre }, (_, i) => ({ division, poule: i + 1, equipes: [] as EquipePyramide[] }));
    membres.sort((a, b) => b.elo - a.elo || sportif(a, b));
    const capacites = poules.map((_, i) => Math.min(16, membres.length - i * 16));
    let curseur = 0, sens = 1;
    for (const e of membres) {
      while (poules[curseur].equipes.length >= capacites[curseur]) {
        curseur += sens;
        if (curseur >= nombre || curseur < 0) { sens *= -1; curseur += sens; }
      }
      poules[curseur].equipes.push(e);
      curseur += sens;
      if (curseur >= nombre || curseur < 0) { sens *= -1; curseur += sens; }
    }
    plans.push(...poules);
  }
  return plans;
}

/** Compatibilité des outils locaux ; le serveur utilise les plans légers ci-dessus. */
export function planifierDivisionsPubliques(ligues: readonly LigueStockee[], _cycle: number): PlanDivision[] {
  const clubs = new Map<string, HeritierDivision>();
  const equipes = ligues.flatMap(ligne => {
    const etat = actualiserEloPublic(ligne.etat);
    for (const club of etat.clubs) clubs.set(club.compteId, { club: structuredClone(club), cartes: structuredClone(etat.cartes.filter(c => c.proprietaire === club.id)) });
    return equipesPyramide({ ...ligne, etat });
  });
  return planifierPyramide(equipes).map(p => ({ ...p, heritiers: p.equipes.map(e => clubs.get(e.compteId)!) }));
}

export function preparerHeritier(club: ClubCarriere, cartes: CarteCarriere[], division: number, precedente: number, histoire: HistoireCarriere[] = []): HeritierDivision {
  return { club: { ...structuredClone(club), eloPublic: { ...(club.eloPublic ?? eloInitial()) },
    mouvementPublic: { divisionPrecedente: precedente, division, motif: division < precedente ? 'Promotion sportive' : division > precedente ? 'Relégation' : 'Maintien' } },
    cartes: structuredClone(cartes), histoire: structuredClone(histoire.filter(h => h.vainqueur === club.id || h.finaliste === club.id)) };
}
