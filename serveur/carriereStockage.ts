import { neon } from '@neondatabase/serverless';
import { pushNeon, type StockagePush } from './pushStockage.js';
import type { EtatCarriereEnLigne, StatistiquesGlobalesCarriere } from '../src/lib/ligue/typesCarriere.js';
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
  push?: StockagePush;
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
  /** Agrégats administrateur calculés dans Postgres : aucun état JSON ne traverse le réseau. */
  statistiquesGlobales(): Promise<StatistiquesGlobalesCarriere>;
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
/**
 * ⚠️ UNE MIGRATION ET UN DÉPLOIEMENT NE SONT JAMAIS SIMULTANÉS, et ça s'est
 * payé cash : le code qui écrit `echeance` est parti en production avant que la
 * colonne existe. Résultat, `alter table` en retard d'une minute et TOUTES les
 * écritures de la carrière échouaient — l'écran annonçait « la base n'est pas
 * encore initialisée » alors que les ligues s'affichaient juste au-dessus.
 *
 * Toute requête qui touche une colonne récente passe donc par ici : on tente la
 * version complète, et sur `42703` (« column does not exist ») on retombe sur
 * celle d'avant. Le jeu perd l'optimisation, jamais la partie. C'est la même
 * cascade que `api/classement.ts` tient entre ses schémas v3, v2 et v1.
 */
async function sansColonne<T>(complete: () => Promise<T>, repli: () => Promise<T>): Promise<T> {
  try { return await complete(); }
  catch (erreur) {
    if ((erreur as { code?: string }).code !== '42703') throw erreur;
    return repli();
  }
}

export function stockageNeon(url: string): StockageCarriere {
  const sql = neon(url);
  const ligne = (r: Record<string, unknown>): LigueStockee => ({
    id: String(r.id), code: String(r.code), version: Number(r.version),
    comptes: r.comptes as string[], etat: r.donnees as EtatCarriereEnLigne,
    echeance: r.echeance == null ? null : Date.parse(String(r.echeance)),
  });
  return {
    push: pushNeon(url),
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
    async statistiquesGlobales() {
      const r = await sql`
        with tx as (
          select l.id as ligue_id, l.donnees->>'nom' as ligue, l.donnees as donnees, t
          from carriere_ligues l
          cross join lateral jsonb_array_elements(coalesce(l.donnees->'transactions','[]'::jsonb)) t
        ), ouvreurs as (
          select ligue_id, ligue, t->>'clubId' as club_id, count(*)::int as packs
          from tx where t->>'nature'='pack' group by ligue_id, ligue, t->>'clubId'
          order by packs desc limit 1
        ), meilleurs as (
          select x.*, (select c from jsonb_array_elements(coalesce(x.donnees->'cartes','[]'::jsonb)) c
                         where c->>'id' in (select jsonb_array_elements_text(coalesce(x.t->'cartes','[]'::jsonb)))
                         order by (c->>'note')::int desc limit 1) as carte
          from tx x where t->>'nature'='pack'
          order by coalesce((t->'meta'->>'meilleureNote')::int,
            (select max((c->>'note')::int) from jsonb_array_elements(coalesce(x.donnees->'cartes','[]'::jsonb)) c
             where c->>'id' in (select jsonb_array_elements_text(coalesce(x.t->'cartes','[]'::jsonb)))),0) desc,
            t->>'date' desc limit 1
        ), ventes_vendues as (
          select l.id as ligue_id, l.donnees->>'nom' as ligue, l.donnees, v,
                 case when v->>'type'='enchere' then coalesce((v->'enchere'->>'montant')::bigint,(v->>'prix')::bigint)
                      else (v->>'prix')::bigint end as montant
          from carriere_ligues l
          cross join lateral jsonb_array_elements(coalesce(l.donnees->'ventes','[]'::jsonb)) v
          where v->>'etat'='vendue' and v->>'acheteurId' is not null
        ), achats as (
          select x.*, (select c from jsonb_array_elements(coalesce(x.donnees->'cartes','[]'::jsonb)) c
                         where c->>'id'=x.v->>'carteId' limit 1) as carte
          from ventes_vendues x order by montant desc limit 1
        )
        select
          (select count(*)::int from carriere_ligues) as ligues,
          (select count(*)::int from comptes) as comptes,
          (select coalesce(sum(jsonb_array_length(coalesce(donnees->'clubs','[]'::jsonb))),0)::int from carriere_ligues) as clubs,
          (select count(*)::int from tx where t->>'nature'='pack') as packs_ouverts,
          (select count(*)::int from carriere_ligues l cross join lateral jsonb_array_elements(coalesce(l.donnees->'rencontres','[]'::jsonb)) m where m ? 'resultat') as matchs_joues,
          (select coalesce(sum(abs((t->>'ovas')::bigint)),0)::bigint from tx where t->>'nature'='pack' and (t->>'ovas')::bigint < 0) as ovas_packs,
          (select coalesce(sum(montant),0)::bigint from ventes_vendues) as volume_marche,
          (select jsonb_build_object('pseudo',coalesce(c->>'pseudo',c->>'nom'),'packs',o.packs,'ligue',o.ligue)
             from ouvreurs o, carriere_ligues l cross join lateral jsonb_array_elements(l.donnees->'clubs') c
             where l.id=o.ligue_id and c->>'id'=o.club_id limit 1) as meilleur_ouvreur,
          (select jsonb_build_object('pseudo',coalesce(c->>'pseudo',c->>'nom'),'pack',coalesce(m.t->'meta'->>'packNom',split_part(m.t->>'libelle',':',1),'Pack'),
                    'apparence',coalesce(m.t->'meta'->>'packApparence',m.carte->>'rarete','bronze'),
                    'note',coalesce((m.t->'meta'->>'meilleureNote')::int,(m.carte->>'note')::int,0),
                    'joueur',coalesce(m.t->'meta'->>'meilleurJoueur',m.carte->>'nom','Joueur'),
                    'portrait',coalesce(m.t->'meta'->>'meilleurPortrait',m.carte->>'photo'),'ligue',m.ligue)
             from meilleurs m, carriere_ligues l cross join lateral jsonb_array_elements(l.donnees->'clubs') c
             where l.id=m.ligue_id and c->>'id'=m.t->>'clubId' limit 1) as meilleur_pack,
          (select jsonb_build_object('pseudo',coalesce(c->>'pseudo',c->>'nom'),
                    'joueur',coalesce(a.v->>'joueurNom',a.carte->>'nom','Joueur du marché'),
                    'montant',a.montant,'ligue',a.ligue)
             from achats a, carriere_ligues l cross join lateral jsonb_array_elements(l.donnees->'clubs') c
             where l.id=a.ligue_id and c->>'id'=a.v->>'acheteurId' limit 1) as plus_gros_achat`;
      const x = r[0] ?? {};
      return {
        ligues: Number(x.ligues ?? 0), comptes: Number(x.comptes ?? 0), clubs: Number(x.clubs ?? 0),
        packsOuverts: Number(x.packs_ouverts ?? 0), matchsJoues: Number(x.matchs_joues ?? 0),
        ovasDepensesPacks: Number(x.ovas_packs ?? 0), volumeMarche: Number(x.volume_marche ?? 0),
        meilleurOuvreur: x.meilleur_ouvreur as StatistiquesGlobalesCarriere['meilleurOuvreur'],
        meilleurPack: x.meilleur_pack as StatistiquesGlobalesCarriere['meilleurPack'],
        plusGrosAchat: x.plus_gros_achat as StatistiquesGlobalesCarriere['plusGrosAchat'],
      };
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
      // ⚠️ SANS LA COLONNE, ON RÉPOND « JE NE SAIS PAS » — voir `sansColonne`.
      const r = await sansColonne(
        () => sql`
          select (donnees->>'version')::int as version, comptes,
                 extract(epoch from echeance) * 1000 as echeance
          from carriere_ligues where id=${id}`,
        () => sql`select (donnees->>'version')::int as version, comptes from carriere_ligues where id=${id}`,
      );
      if (!r[0]) return null;
      const e = Number(r[0].echeance);
      return { version: Number(r[0].version), comptes: r[0].comptes as string[], echeance: Number.isFinite(e) ? e : null };
    },
    async rafraichirEcheance(id, echeance) {
      // Sans la colonne, il n'y a rien à repousser : la lecture conditionnelle
      // ne s'arme pas, et le mode retrouve exactement son comportement d'avant.
      await sansColonne(
        () => sql`update carriere_ligues set echeance=to_timestamp(${echeance / 1000}) where id=${id}`,
        async () => [],
      );
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
      // ⚠️ L'ÉCRITURE DOIT PASSER MÊME SANS LA COLONNE. C'est celle qui enregistre
      // tout ce que fait un manager : la faire dépendre d'une migration récente,
      // c'est arrêter le jeu le temps d'un `alter table`.
      const echeance = echeanceLigue(l.etat, Date.now()) / 1000;
      const ecrire = (avecEcheance: boolean) => avecEcheance
        ? sql`with modification as (
        update carriere_ligues set donnees=${JSON.stringify(l.etat)}::jsonb,comptes=${l.comptes},version=version+1,echeance=to_timestamp(${echeance})
        where id=${l.id} and version=${version} and not exists (
          select 1 from carriere_commandes where ligue=${l.id} and compte=${compte} and requete=${requete}
        ) returning id
      ) insert into carriere_commandes (ligue,compte,requete) select id,${compte},${requete} from modification returning ligue`
        : sql`with modification as (
        update carriere_ligues set donnees=${JSON.stringify(l.etat)}::jsonb,comptes=${l.comptes},version=version+1
        where id=${l.id} and version=${version} and not exists (
          select 1 from carriere_commandes where ligue=${l.id} and compte=${compte} and requete=${requete}
        ) returning id
      ) insert into carriere_commandes (ligue,compte,requete) select id,${compte},${requete} from modification returning ligue`;
      const r = await sansColonne(() => ecrire(true), () => ecrire(false));
      return r.length === 1;
    },
    async actives() { return (await sansColonne(
      () => sql`select id from carriere_ligues where donnees->>'phase'='saison' and (echeance is null or echeance<=now()) order by echeance nulls first`,
      () => sql`select id from carriere_ligues where donnees->>'phase'='saison'`,
    )).map(r => String(r.id)); },
  };
}
