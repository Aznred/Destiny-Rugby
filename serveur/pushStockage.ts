import { neon } from '@neondatabase/serverless';
import type { PushSubscription } from 'web-push';
export interface AbonnementPush { id: string; compte: string; ligue: string; cree: number; abonnement: PushSubscription }
export interface StockagePush {
  lister(ligue: string): Promise<AbonnementPush[]>;
  enregistrer(a: AbonnementPush): Promise<void>;
  supprimer(compte: string, id: string, ligue?: string): Promise<void>;
  reserver(cle: string, maintenant: number): Promise<boolean>;
  terminer(cle: string): Promise<void>;
  liberer(cle: string): Promise<void>;
}
export function pushNeon(url: string): StockagePush {
  const sql = neon(url);
  return {
    async lister(ligue) { return (await sql`select * from carriere_push where ligue=${ligue}`).map(r => ({ id: String(r.id), compte: String(r.compte), ligue: String(r.ligue), cree: Number(r.cree), abonnement: r.abonnement as PushSubscription })); },
    async enregistrer(a) {
      // Un terminal peut suivre plusieurs ligues, mais appartient à un seul compte.
      await sql`delete from carriere_push where id=${a.id} and compte<>${a.compte}`;
      await sql`insert into carriere_push (id,compte,ligue,cree,abonnement) values (${a.id},${a.compte},${a.ligue},${a.cree},${JSON.stringify(a.abonnement)}::jsonb) on conflict(id,ligue) do update set abonnement=excluded.abonnement`;
    },
    async supprimer(compte,id,ligue) { await sql`delete from carriere_push where compte=${compte} and id=${id} and (${ligue ?? null}::text is null or ligue::text=${ligue ?? null})`; },
    async reserver(cle,n) { return (await sql`insert into carriere_push_envois (cle,bail) values (${cle},${n + 30000}) on conflict(cle) do update set bail=excluded.bail where not carriere_push_envois.envoye and carriere_push_envois.bail<${n} returning cle`).length > 0; },
    async terminer(cle) { await sql`update carriere_push_envois set envoye=true where cle=${cle}`; },
    async liberer(cle) { await sql`delete from carriere_push_envois where cle=${cle} and not envoye`; },
  };
}

/** Le stockage local sérialise ces données avec le reste de la base de développement. */
export interface BasePush { abonnements: AbonnementPush[]; envois: Record<string, number> }
export function pushLocal(base: BasePush, sauver: () => void): StockagePush {
  return {
    async lister(l) { return structuredClone(base.abonnements.filter(a => a.ligue === l)); },
    async enregistrer(a) { base.abonnements = base.abonnements.filter(b => b.id !== a.id || b.compte === a.compte); if (!base.abonnements.some(b => b.id === a.id && b.ligue === a.ligue)) base.abonnements.push(a); sauver(); },
    async supprimer(c,id,l) { base.abonnements = base.abonnements.filter(a => !(a.compte === c && a.id === id && (!l || a.ligue === l))); sauver(); },
    async reserver(c,n) { if (base.envois[c] && base.envois[c] > n) return false; base.envois[c] = n + 30000; sauver(); return true; },
    async terminer(c) { base.envois[c] = Number.MAX_SAFE_INTEGER; sauver(); },
    async liberer(c) { delete base.envois[c]; sauver(); },
  };
}
