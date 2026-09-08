import { neon } from '@neondatabase/serverless';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere.js';
import { echeanceLigue } from '../src/lib/ligue/echeanceCarriere.js';

export interface CompteStocke { id: string; identifiant: string; pseudo: string; empreinte: string }
export interface LigueStockee { id: string; code: string; version: number; comptes: string[]; etat: EtatCarriereEnLigne; echeance?: number | null }
/**
 * ⚠️ L'ÉCRAN « MES LIGUES » N'A BESOIN QUE DE ÇA, et il téléchargeait tout.
 * `ligues()` faisait `select *` : pour afficher sept champs par ligue, il
 * rapatriait l'ÉTAT COMPLET de chacune — 400 Ko par ligue pour 200 octets
 * utiles, à chaque ouverture d'écran. C'est ce qui a vidé le quota de
 * transfert Neon (6,1 Go sur 5 en huit jours). Postgres sait extraire ces
 * champs lui-même : seul le résumé traverse le réseau.
 */
export interface ResumeLigue {
  id: string; nom: string; phase: string; logo?: string;
  clubNom: string; ovas: number; clubEmbleme?: string;
}
export interface StockageCarriere {
  compteParIdentifiant(identifiant: string): Promise<CompteStocke | null>;
  creerCompte(compte: CompteStocke): Promise<boolean>;
  session(empreinte: string, maintenant: number): Promise<CompteStocke | null>;
  ouvrirSession(empreinte: string, compte: string, expiration: number): Promise<void>;
  fermerSession(empreinte: string): Promise<void>;
  limiter(cle: string, maximum: number, fenetre: number, maintenant: number): Promise<boolean>;
  /**
   * ⚠️ LA LECTURE QUI NE COÛTE RIEN : version, membres, prochaine échéance.
   * Quelques octets au lieu des 300 à 400 Ko de l'état. C'est elle qui permet
   * de répondre « rien n'a changé » à un sondage sans rien télécharger.
   */
  entete(id: string): Promise<{ version: number; comptes: string[]; echeance: number | null } | null>;
  /**
   * Repousse la seule échéance, sans toucher à l'état ni à la version.
   * Sert quand une date est passée sans que rien n'ait changé : sans ça, on
   * relirait l'état entier à chaque sondage jusqu'à la fin des temps.
   */
  rafraichirEcheance(id: string, echeance: number): Promise<void>;
  /** Le résumé seul — jamais l'état complet : voir `ResumeLigue`. */
  ligues(compte: string): Promise<ResumeLigue[]>;
  /** Pour le plafond de 20 ligues : un compte, pas une liste. */
  nombreLigues(compte: string): Promise<number>;
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
    echeance: r.echeance == null ? null : Date.parse(String(r.echeance)),
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
    /**
     * ⚠️ LA PROJECTION SE FAIT DANS POSTGRES, PAS DANS NODE. `select *` puis
     * `.map()` côté fonction, c'était faire traverser le réseau à l'état
     * entier de chaque ligue pour en garder sept champs. `jsonb_array_elements`
     * trouve le club du compte dans la base ; il ne revient qu'une ligne de
     * texte par ligue.
     */
    async ligues(compte) {
      const r = await sql`
        select l.id,
               l.donnees->>'nom'   as nom,
               l.donnees->>'phase' as phase,
               l.donnees->>'logo'  as logo,
               c.club->>'nom'      as club_nom,
               c.club->>'ovas'     as ovas,
               c.club->>'embleme'  as club_embleme
        from carriere_ligues l
        cross join lateral (
          select club from jsonb_array_elements(l.donnees->'clubs') as club
          where club->>'compteId' = ${compte} limit 1
        ) c
        where ${compte}::uuid = any(l.comptes)
        order by l.cree_le desc`;
      return r.map(x => ({
        id: String(x.id), nom: String(x.nom ?? ''), phase: String(x.phase ?? ''),
        logo: x.logo == null ? undefined : String(x.logo),
        clubNom: String(x.club_nom ?? ''), ovas: Number(x.ovas ?? 0),
        clubEmbleme: x.club_embleme == null ? undefined : String(x.club_embleme),
      }));
    },
    // ⚠️ COMPTER, C'EST COMPTER. Le plafond de 20 ligues lisait la liste
    //    entière pour en prendre la longueur.
    async nombreLigues(compte) {
      const r = await sql`select count(*)::int as n from carriere_ligues where ${compte}::uuid=any(comptes)`;
      return Number(r[0]?.n ?? 0);
    },
    async ligue(id) { const r = await sql`select * from carriere_ligues where id=${id}`; return r[0] ? ligne(r[0]) : null; },
    /**
     * ⚠️ ON DEMANDE `donnees->>'version'`, PAS `version`. Ce sont DEUX
     * compteurs : celui de la ligne sert au verrou optimiste d'écriture, celui
     * de l'état est le seul que l'écran connaisse (`vueCarriere` le recopie).
     * Les comparer entre eux répondrait « rien n'a changé » sur deux nombres
     * qui n'ont jamais parlé de la même chose.
     *
     * ⚠️ ET L'EXTRACTION SE FAIT DANS POSTGRES. `donnees->>'version'` ne fait
     * traverser le réseau qu'un entier ; c'est tout l'intérêt de cette lecture.
     */
    async entete(id) {
      const r = await sql`
        select (donnees->>'version')::int as version, comptes,
               extract(epoch from echeance) * 1000 as echeance
        from carriere_ligues where id=${id}`;
      if (!r[0]) return null;
      const e = Number(r[0].echeance);
      return { version: Number(r[0].version), comptes: r[0].comptes as string[], echeance: Number.isFinite(e) ? e : null };
    },
    async rafraichirEcheance(id, echeance) {
      await sql`update carriere_ligues set echeance=to_timestamp(${echeance / 1000}) where id=${id}`;
    },
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
        update carriere_ligues set donnees=${JSON.stringify(l.etat)}::jsonb,comptes=${l.comptes},version=version+1,echeance=to_timestamp(${echeanceLigue(l.etat, Date.now()) / 1000})
        where id=${l.id} and version=${version} and not exists (
          select 1 from carriere_commandes where ligue=${l.id} and compte=${compte} and requete=${requete}
        ) returning id
      ) insert into carriere_commandes (ligue,compte,requete) select id,${compte},${requete} from modification returning ligue`;
      return r.length === 1;
    },
    async actives() { return (await sql`select id from carriere_ligues where donnees->>'phase'='saison'`).map(r => String(r.id)); },
  };
}
