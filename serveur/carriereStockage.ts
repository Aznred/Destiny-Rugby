import { neon } from '@neondatabase/serverless';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere.js';

export interface CompteStocke { id: string; identifiant: string; pseudo: string; empreinte: string }
export interface LigueStockee { id: string; code: string; version: number; comptes: string[]; etat: EtatCarriereEnLigne }
export interface StockageCarriere {
  compteParIdentifiant(identifiant: string): Promise<CompteStocke | null>;
  creerCompte(compte: CompteStocke): Promise<boolean>;
  session(empreinte: string, maintenant: number): Promise<CompteStocke | null>;
  ouvrirSession(empreinte: string, compte: string, expiration: number): Promise<void>;
  fermerSession(empreinte: string): Promise<void>;
  limiter(cle: string, maximum: number, fenetre: number, maintenant: number): Promise<boolean>;
  ligues(compte: string): Promise<LigueStockee[]>;
  ligue(id: string): Promise<LigueStockee | null>;
  ligueParCode(code: string): Promise<LigueStockee | null>;
  creerLigue(ligue: LigueStockee): Promise<boolean>;
  dejaTraitee(ligue: string, compte: string, requete: string): Promise<boolean>;
  /** Le nouvel état et le reçu d'idempotence sont écrits indivisiblement. */
  comparerEtEcrire(ligue: LigueStockee, version: number, compte: string, requete: string): Promise<boolean>;
  actives(): Promise<string[]>;
}

/** Une seule ligne versionnée protège toutes les ressources d'une même ligue.
 * Un achat concurrent perd le CAS et relit l'état avant de recalculer son action. */
export function stockageNeon(url: string): StockageCarriere {
  const sql = neon(url);
  const ligne = (r: Record<string, unknown>): LigueStockee => ({
    id: String(r.id), code: String(r.code), version: Number(r.version),
    comptes: r.comptes as string[], etat: r.donnees as EtatCarriereEnLigne,
  });
  return {
    async compteParIdentifiant(identifiant) {
      const r = await sql`select id, identifiant, pseudo, empreinte from comptes where identifiant=${identifiant}`;
      return (r[0] as CompteStocke) ?? null;
    },
    async creerCompte(c) {
      const r = await sql`insert into comptes (id,identifiant,pseudo,empreinte) values (${c.id},${c.identifiant},${c.pseudo},${c.empreinte}) on conflict do nothing returning id`;
      return r.length === 1;
    },
    async session(empreinte, maintenant) {
      const r = await sql`select c.id,c.identifiant,c.pseudo,c.empreinte from sessions s join comptes c on c.id=s.compte where s.empreinte=${empreinte} and s.expire_le>${new Date(maintenant).toISOString()}`;
      return (r[0] as CompteStocke) ?? null;
    },
    async ouvrirSession(empreinte, compte, expiration) {
      await sql`insert into sessions (empreinte,compte,expire_le) values (${empreinte},${compte},${new Date(expiration).toISOString()})`;
    },
    async fermerSession(empreinte) { await sql`delete from sessions where empreinte=${empreinte}`; },
    async limiter(cle, maximum, fenetre, maintenant) {
      const debut = Math.floor(maintenant / fenetre) * fenetre;
      const r = await sql`insert into carriere_debits (cle,debut,nombre) values (${cle},${debut},1) on conflict (cle) do update set debut=excluded.debut,nombre=case when carriere_debits.debut=excluded.debut then carriere_debits.nombre+1 else 1 end returning nombre`;
      return Number(r[0].nombre) <= maximum;
    },
    async ligues(compte) { return (await sql`select * from carriere_ligues where ${compte}::uuid=any(comptes) order by cree_le desc`).map(ligne); },
    async ligue(id) { const r = await sql`select * from carriere_ligues where id=${id}`; return r[0] ? ligne(r[0]) : null; },
    async ligueParCode(code) { const r = await sql`select * from carriere_ligues where code=${code}`; return r[0] ? ligne(r[0]) : null; },
    async creerLigue(l) {
      const r = await sql`insert into carriere_ligues (id,code,version,comptes,donnees) values (${l.id},${l.code},${l.version},${l.comptes},${JSON.stringify(l.etat)}::jsonb) on conflict do nothing returning id`;
      return r.length === 1;
    },
    async dejaTraitee(ligue, compte, requete) {
      return (await sql`select 1 from carriere_commandes where ligue=${ligue} and compte=${compte} and requete=${requete}`).length > 0;
    },
    async comparerEtEcrire(l, version, compte, requete) {
      const r = await sql`with modification as (
        update carriere_ligues set donnees=${JSON.stringify(l.etat)}::jsonb,comptes=${l.comptes},version=version+1
        where id=${l.id} and version=${version} and not exists (
          select 1 from carriere_commandes where ligue=${l.id} and compte=${compte} and requete=${requete}
        ) returning id
      ) insert into carriere_commandes (ligue,compte,requete) select id,${compte},${requete} from modification returning ligue`;
      return r.length === 1;
    },
    async actives() { return (await sql`select id from carriere_ligues where donnees->>'phase'='saison'`).map(r => String(r.id)); },
  };
}
