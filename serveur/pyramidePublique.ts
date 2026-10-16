import { randomUUID } from 'node:crypto';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere.js';
import type { LigueStockee, StockageCarriere } from './carriereStockage.js';
import { planifierPyramide, preparerHeritier, type HeritierDivision } from './divisionsPubliques.js';
import { codePoule } from './pyramideStockage.js';
import type { PlanPoule } from './divisionsPubliques.js';

interface OperationsPyramide {
  lire(id: string): Promise<LigueStockee | null>;
  actualiser(id: string, maintenant: number): Promise<EtatCarriereEnLigne>;
  creer(cycle: number, plan: PlanPoule, heritiers: HeritierDivision[], maintenant: number): Promise<void>;
}

/** Reprise par petits lots : une interruption conserve les poules sources et les poules déjà matérialisées. */
export function creerPyramidePublique(stockage: StockageCarriere, operations: OperationsPyramide) {
  const depot = stockage.pyramide;
  let enCours: Promise<{ cycle: number; nombre: number; transition?: number }> | undefined;
  let cache: { expire: number; valeur: { cycle: number; nombre: number; transition?: number } } | undefined;
  async function initialiser(cycle: number, limite = 4) {
    if (!depot) return;
    for (const id of await depot.aInitialiser(cycle, limite)) {
      const l = await operations.lire(id);
      if (l) await depot.synchroniser(l);
    }
  }
  async function poursuivre(numero: number, maintenant: number) {
    if (!depot) return false;
    const jeton = randomUUID(), cle = `cycle:${numero}`;
    if (!await depot.verrou(cle, jeton, maintenant, 120_000)) return false;
    try {
      let plan = await depot.plan(numero);
      if (!plan) {
        const bilan = await depot.bilan(numero - 1);
        // Les groupes commencés plus tard disposent toujours de leurs trente jours.
        if (bilan.fin === null || bilan.fin > maintenant) return false;
        for (const id of await depot.aClore(numero - 1, 4)) {
          for (let tour = 0; tour < 8; tour++) {
            const etat = await operations.actualiser(id, maintenant);
            if (etat.phase !== 'saison') break;
          }
        }
        if ((await depot.bilan(numero - 1)).enCours > 0) return false;
        await initialiser(numero - 1, 8);
        if ((await depot.aInitialiser(numero - 1, 1)).length) return false;
        const equipes = await depot.equipes(numero - 1);
        if (equipes.length !== bilan.equipes) throw new Error('Les équipes du cycle ne sont pas encore toutes indexées.');
        await depot.enregistrerPlan(numero, planifierPyramide(equipes));
        plan = await depot.plan(numero);
      }
      if (plan?.termine) return true;
      for (const p of await depot.manquants(numero, 4)) {
        const heritiers: HeritierDivision[] = [];
        // Au plus seize petits groupes sources par cible, jamais tous les effectifs du monde en mémoire.
        const sources = new Map<string, LigueStockee>();
        for (const e of p.equipes) {
          let source = sources.get(e.ligueId);
          if (!source) { source = await operations.lire(e.ligueId) ?? undefined; if (source) sources.set(e.ligueId, source); }
          const club = source?.etat.clubs.find(c => c.compteId === e.compteId);
          if (!source || !club) throw new Error(`Club introuvable pendant le reclassement ${codePoule(numero, p)}.`);
          heritiers.push(preparerHeritier(club, source.etat.cartes.filter(c => c.proprietaire === club.id), p.division, e.division, source.etat.histoire));
        }
        await operations.creer(numero, p, heritiers, maintenant);
      }
      if ((await depot.manquants(numero, 1)).length) return false;
      await depot.terminer(numero);
      return true;
    } finally { await depot.liberer(cle, jeton); }
  }
  async function calculer(maintenant: number) {
    if (!depot || !stockage.dernierCyclePublic) return { cycle: 0, nombre: 0 };
    const dernier = await stockage.dernierCyclePublic() ?? 0;
    const partiel = await depot.plan(dernier);
    const suivant = await depot.plan(dernier + 1);
    const bilan = await depot.bilan(dernier);
    const cible = partiel && !partiel.termine ? dernier : suivant && !suivant.termine ? dernier + 1
      : bilan.fin !== null && bilan.fin <= maintenant ? dernier + 1 : undefined;
    if (cible !== undefined) {
      if (await poursuivre(cible, maintenant)) return { cycle: cible, nombre: (await depot.bilan(cible)).nombre };
      // Tant que le plan n'existe pas, les poules sources restent la référence. Les nouvelles inscriptions attendent
      // leurs places réservées dans le cycle suivant dès que son plan est figé.
      return { cycle: cible - 1, nombre: (await depot.bilan(cible - 1)).nombre, transition: (await depot.plan(cible)) ? cible : undefined };
    }
    return { cycle: dernier, nombre: bilan.nombre };
  }
  return {
    initialiser,
    invalider() { cache = undefined; },
    async assurer(maintenant: number) {
      if (cache && cache.expire > maintenant) return cache.valeur;
      enCours ??= calculer(maintenant).finally(() => { enCours = undefined; });
      const valeur = await enCours;
      cache = { expire: maintenant + (valeur.transition ? 500 : 5000), valeur };
      return valeur;
    },
  };
}
