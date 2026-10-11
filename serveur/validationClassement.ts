import { createHash, randomUUID } from 'node:crypto';
import { evaluerClassement, validationPublique, type ValidationClassement } from '../src/lib/validationClassement.js';
import { TROPHEES } from '../src/data/trophees.js';

export interface DossierClassement {
  careerId: string; userId: string | null; cle: string; fiche: unknown; validation: ValidationClassement;
  revision: number; date: string; derniereSynchronisation: string;
  decision?: { action: 'valider' | 'refuser'; auteur: string; motif: string; empreinte: string; date: string };
}
export interface StockageValidationClassement {
  lire(cle: string): Promise<DossierClassement | null>;
  parId(id: string): Promise<DossierClassement | null>;
  enregistrer(dossier: DossierClassement, revision: number | null): Promise<boolean>;
  lister(filtre: string, page: number): Promise<{ dossiers: DossierClassement[]; total: number }>;
  bilan(): Promise<unknown>;
}
const IDS = Object.keys(TROPHEES);
const CHAMPS = ['v','pseudo','nom','poste','nation','ageDebut','age','saisons','note','reputation','matchs','essais','selections','titres','clubs','manager','score','horsClassement'];
export function empreinteFiche(fiche: unknown): string { return createHash('sha256').update(JSON.stringify(fiche)).digest('hex'); }
export function fichePourValidation(fiche: unknown): unknown {
  if (!fiche || typeof fiche !== 'object' || Array.isArray(fiche)) return fiche;
  return Object.fromEntries(CHAMPS.filter(k => Object.hasOwn(fiche, k)).map(k => [k, (fiche as Record<string, unknown>)[k]]));
}
export function dossierPublic(d: DossierClassement) {
  return { careerId: d.careerId, userId: d.userId, pseudo: (d.fiche as { pseudo?: string })?.pseudo ?? 'Sans nom',
    validation: d.validation, revision: d.revision, date: d.date, derniereSynchronisation: d.derniereSynchronisation,
    decision: d.decision ? { action: d.decision.action, auteur: d.decision.auteur, motif: d.decision.motif, date: d.decision.date } : undefined };
}
function appliquerDecision(validation: ValidationClassement, decision: DossierClassement['decision']): ValidationClassement {
  if (!decision || validation.horsClassement) return validation;
  if (decision.action === 'refuser') return { ...validation, statut: 'REJECTED', visible: false, recompensesAutorisees: false,
    regles: [...validation.regles, { id: 'decision_kiri', points: 0, bloquante: true, detail: decision.motif }] };
  if (validation.regles.some(r => r.bloquante)) return validation;
  return { ...validation, statut: 'ELIGIBLE', visible: true, recompensesAutorisees: true };
}

export function creerServiceValidation(stockage: StockageValidationClassement) {
  return {
    async synchroniser(cle: string, userId: string | null, brut: unknown, maintenant = Date.now(), revalidation = false) {
      const fiche = fichePourValidation(brut);
      for (let tentative = 0; tentative < 3; tentative++) {
        const ancien = await stockage.lire(cle);
        const precedent = ancien ? evaluerClassement(ancien.fiche, IDS).fiche : undefined;
        const evaluation = evaluerClassement(fiche, IDS, {
          maintenant, precedent: precedent && ancien ? { fiche: precedent, synchroniseLe: Date.parse(ancien.derniereSynchronisation) } : undefined });
        const decision = ancien?.decision?.empreinte === empreinteFiche(fiche) ? ancien.decision : undefined;
        const validation = appliquerDecision(validationPublique(evaluation), decision);
        const date = new Date(maintenant).toISOString();
        const dossier: DossierClassement = { careerId: ancien?.careerId ?? randomUUID(), userId: userId ?? ancien?.userId ?? null,
          cle, fiche, validation, revision: (ancien?.revision ?? 0) + 1, date,
          derniereSynchronisation: revalidation ? ancien?.derniereSynchronisation ?? date : date, decision };
        if (await stockage.enregistrer(dossier, ancien?.revision ?? null)) return { dossier, evaluation: { ...evaluation, ...validation } };
      }
      throw new Error('Une synchronisation concurrente a modifié cette vérification.');
    },
    async decider(compte: { id: string; identifiant: string }, id: string, revision: number, action: string, motif: string) {
      if (compte.identifiant !== 'kiri') throw new Error('Accès réservé à Kiri.');
      if (!['valider','refuser','reinitialiser'].includes(action)) throw new Error('Décision inconnue.');
      const ancien = await stockage.parId(id);
      if (!ancien || ancien.revision !== revision) throw new Error('Cette vérification a changé. Actualise la liste.');
      const evaluation = evaluerClassement(ancien.fiche, IDS);
      if (action === 'valider' && (evaluation.horsClassement || evaluation.regles.some(r => r.bloquante))) throw new Error('Une incohérence forte doit être corrigée avant validation.');
      const date = new Date().toISOString();
      const decision: DossierClassement['decision'] = action === 'reinitialiser' ? undefined : {
        action: action as 'valider' | 'refuser', auteur: compte.id, motif: motif.trim().slice(0, 300) || (action === 'valider' ? 'Cas vérifié par Kiri.' : 'Refus après vérification par Kiri.'),
        empreinte: empreinteFiche(ancien.fiche), date };
      const dossier = { ...ancien, validation: appliquerDecision(validationPublique(evaluation), decision), decision, date, revision: ancien.revision + 1 };
      if (!await stockage.enregistrer(dossier, ancien.revision)) throw new Error('Cette vérification a changé. Actualise la liste.');
      return dossierPublic(dossier);
    },
    async revalider(page = 1) {
      const lot = await stockage.lister('ALL', page);
      let recuperes = 0;
      for (const d of lot.dossiers) {
        const r = await this.synchroniser(d.cle, d.userId, d.fiche, Date.now(), true);
        if (!d.validation.visible && r.dossier.validation.visible) recuperes++;
      }
      return { traites: lot.dossiers.length, recuperes, total: lot.total, page, suite: page * 50 < lot.total };
    },
  };
}

export function stockageValidationLocal(base: Record<string, DossierClassement>, sauver: () => void): StockageValidationClassement {
  return {
    async lire(cle) { return structuredClone(Object.values(base).find(d => d.cle === cle) ?? null); },
    async parId(id) { return structuredClone(base[id] ?? null); },
    async enregistrer(d, revision) {
      const ancien = Object.values(base).find(a => a.cle === d.cle);
      if ((ancien?.revision ?? null) !== revision) return false;
      base[d.careerId] = structuredClone(d); sauver(); return true;
    },
    async lister(filtre, page) {
      const dossiers = Object.values(base).filter(d => filtre === 'ALL' || (filtre === 'HIGH_RISK' ? d.validation.riskScore >= 60
        : d.validation.statut === (filtre === 'PENDING' ? 'PENDING_VALIDATION' : filtre))).sort((a,b) => a.careerId.localeCompare(b.careerId));
      return { dossiers: structuredClone(dossiers.slice((page-1)*50,page*50)), total: dossiers.length };
    },
    async bilan() {
      const dossiers = Object.values(base); const causes: Record<string, number> = {};
      for (const d of dossiers) for (const r of d.validation.regles) causes[r.id] = (causes[r.id] ?? 0) + 1;
      return { total: dossiers.length, normalementEligibles: dossiers.filter(d => !d.validation.horsClassement).length,
        visibles: dossiers.filter(d => d.validation.visible).length, rejetes: dossiers.filter(d => d.validation.statut==='REJECTED').length,
        causes: Object.entries(causes).sort((a,b)=>b[1]-a[1]) };
    },
  };
}

type ClientSql = { query(texte: string, valeurs: unknown[]): Promise<Record<string, unknown>[]> };
export function stockageValidationNeon(sql: ClientSql): StockageValidationClassement {
  const lire = (r: Record<string, unknown>): DossierClassement => ({ careerId: String(r.id), cle: String(r.cle), userId: r.user_id ? String(r.user_id) : null,
    fiche: r.fiche, validation: r.validation as ValidationClassement, revision: Number(r.revision), date: new Date(r.valide_le as string).toISOString(),
    derniereSynchronisation: new Date(r.synchronise_le as string).toISOString(), decision: (r.decision ?? undefined) as DossierClassement['decision'] });
  return {
    async lire(cle) { const r = await sql.query('select * from classement_validations where cle=$1', [cle]); return r[0] ? lire(r[0]) : null; },
    async parId(id) { const r = await sql.query('select * from classement_validations where id=$1', [id]); return r[0] ? lire(r[0]) : null; },
    async enregistrer(d, revision) {
      // Le journal et la validation sont atomiques. Une nouvelle carrière plus faible ne masque pas le record précédent.
      const faits=d.fiche as {v?:number;score?:number}|null;
      const scoreRecord=faits?.v==null&&Number.isSafeInteger(faits?.score)?faits!.score:evaluerClassement(d.fiche,IDS).score;
      const r = await sql.query(`with ecrit as (
        insert into classement_validations(id,cle,user_id,fiche,validation,revision,valide_le,synchronise_le,decision)
        values($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9::jsonb)
        on conflict(cle) do update set user_id=coalesce(excluded.user_id,classement_validations.user_id),
          fiche=excluded.fiche,validation=excluded.validation,revision=excluded.revision,valide_le=excluded.valide_le,
          synchronise_le=excluded.synchronise_le,decision=excluded.decision where classement_validations.revision=$10
        returning *), journal as (
        insert into classement_validation_logs(career_id,user_id,validation,decision,cree_le)
        select id,user_id,validation,decision,valide_le from ecrit returning career_id)
        , publication as (
          update classement c set validation=ecrit.validation from ecrit
          where c.cle=ecrit.cle and c.score=$11 returning c.id)
        select id from ecrit`, [d.careerId,d.cle,d.userId,JSON.stringify(d.fiche),JSON.stringify(d.validation),d.revision,d.date,d.derniereSynchronisation,JSON.stringify(d.decision ?? null),revision,
          scoreRecord]);
      return !!r[0];
    },
    async lister(filtre, page) {
      const condition = `($1='ALL' or ($1='HIGH_RISK' and (validation->>'riskScore')::int>=60)
        or validation->>'statut'=case when $1='PENDING' then 'PENDING_VALIDATION' else $1 end)`;
      const dossiers = await sql.query(`select * from classement_validations where ${condition} order by id limit 50 offset $2`, [filtre,(page-1)*50]);
      const compte = await sql.query(`select count(*)::int as total from classement_validations where ${condition}`, [filtre]);
      return { dossiers: dossiers.map(lire), total: Number(compte[0]?.total ?? 0) };
    },
    async bilan() {
      const r = await sql.query(`select count(*)::int as total,
        count(*) filter(where not (validation->>'horsClassement')::boolean)::int as "normalementEligibles",
        count(*) filter(where (validation->>'visible')::boolean)::int as visibles,
        count(*) filter(where validation->>'statut'='REJECTED')::int as rejetes from classement_validations`, []);
      const causes = await sql.query(`select r->>'id' as regle,count(*)::int as nombre from classement_validations,
        jsonb_array_elements(validation->'regles') r group by r->>'id' order by nombre desc limit 30`, []);
      return { ...r[0], causes: causes.map(c=>[c.regle,c.nombre]) };
    },
  };
}
