import { atelierNeon, type StockageAtelier } from './atelierStockage.js';
import { neon } from '@neondatabase/serverless';
import { pushNeon, type StockagePush } from './pushStockage.js';
import type { AdministrationCarriere, EtatCarriereEnLigne, StatistiquesGlobalesCarriere } from '../src/lib/ligue/typesCarriere.js';
import { echeanceLigue, prochaineEcheanceMatch } from '../src/lib/ligue/echeanceCarriere.js';
import { assemblerTransfert, champsDepuisForme, decoderBloc, encoderTransfert, formeTransfert, type BlocTransfert, type ManifestTransfert } from './transfertCarriere.js';
import { creerLimiteurReserve } from './limiteurReserve.js';
import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte.js';

export interface CompteStocke {
  id: string; identifiant: string; pseudo: string; empreinte?: string;
  fournisseur?: 'google'; sujetExterne?: string; courriel?: string;
  creeLe?: string; vuLe?: string;
}
export interface LigueStockee { id: string; code: string; version: number; comptes: string[]; etat: EtatCarriereEnLigne; echeance?: number | null }
export interface PresenceMatchStockee { match: string; compte: string; vu: number }
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
  clubNom: string; ovas: number; clubEmbleme?: string; laboratoire?: boolean; createurId?: string;
}
const resumeEtat = (etat: EtatCarriereEnLigne) => ({
  nom: etat.nom, phase: etat.phase, logo: etat.logo, laboratoire: etat.laboratoire === true, createurId: etat.createurId,
  clubs: etat.clubs.map(c => ({ compteId: c.compteId, nom: c.nom, ovas: c.ovas, embleme: c.embleme })),
});
export interface StockageCarriere {
  atelier?: StockageAtelier;
  push?: StockagePush;
  compteParIdentifiant(identifiant: string): Promise<CompteStocke | null>;
  compteParGoogle(sujet: string): Promise<CompteStocke | null>;
  lierCompteGoogle(id: string, sujet: string, courriel: string): Promise<boolean>;
  creerCompte(compte: CompteStocke): Promise<boolean>;
  session(empreinte: string, maintenant: number): Promise<CompteStocke | null>;
  ouvrirSession(empreinte: string, compte: string, expiration: number): Promise<void>;
  fermerSession(empreinte: string): Promise<void>;
  boutique(compte: string): Promise<EtatBoutiqueCompte | null>;
  sauvegarderBoutique(compte: string, boutique: EtatBoutiqueCompte): Promise<void>;
  limiter(cle: string, maximum: number, fenetre: number, maintenant: number): Promise<boolean>;
  /**
   * ⚠️ LA LECTURE QUI NE COÛTE RIEN : version, membres, prochaine échéance.
   * Quelques octets au lieu des 300 à 400 Ko de l'état. C'est elle qui permet
   * de répondre « rien n'a changé » à un sondage sans rien télécharger.
   */
  entete(id: string): Promise<{ version: number; comptes: string[]; echeance: number | null; catalogueRevision?: number } | null>;
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
  /** Repertoire prive du compte kiri, sans empreintes ni jetons de session. */
  administration(): Promise<AdministrationCarriere>;
  ligue(id: string): Promise<LigueStockee | null>;
  ligueParCode(code: string): Promise<LigueStockee | null>;
  creerLigue(ligue: LigueStockee): Promise<boolean>;
  supprimerLigue(id: string, createur: string): Promise<boolean>;
  supprimerLiguesInactives(avant: number): Promise<string[]>;
  dejaTraitee(ligue: string, compte: string, requete: string): Promise<boolean>;
  /** Version, membres et reçu dans une seule réponse compacte. */
  verifierCommande?(ligue: string, compte: string, requete: string, connue?: { version: number; comptes: string[] }): Promise<{
    version: number; comptes: string[]; echeance: number | null; dejaTraitee: boolean;
  } | null>;
  verifierSondage?(ligue: string, compte: string, version: number, catalogue: number, maintenant: number): Promise<
    { statut: 'absente' | 'inchange' } | { statut: 'lire'; entete: { version: number; comptes: string[]; echeance: number | null; catalogueRevision?: number } }
  >;
  /** Le nouvel état et, pour une commande utilisateur, son reçu sont écrits indivisiblement. */
  comparerEtEcrire(ligue: LigueStockee, version: number, recu?: { compte: string; requete: string }): Promise<boolean>;
  /** Battement minuscule du direct, séparé du gros JSON de la ligue. `false`/`null` = migration pas encore appliquée. */
  marquerPresence(ligue: string, match: string, compte: string, maintenant: number): Promise<boolean>;
  presencesActives(ligue: string, depuis: number): Promise<PresenceMatchStockee[] | null>;
  /** Purge les données temporaires : présences, sessions expirées et compteurs de débit. */
  nettoyerPresences(avant: number): Promise<void>;
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
  const limiterJeu = creerLimiteurReserve(async (cle, maximum, debut, lot) => {
    const [r] = await sql`select carriere_reserver_debit(${cle},${maximum},${debut},${lot}) as n`;
    return Number(r.n);
  });
  // Cache borné en octets, indépendant du nombre de ligues. Les hashes sont
  // vérifiés en base à chaque lecture : aucun délai de cohérence entre serveurs.
  const blocsChauds = new Map<string, { valeur: unknown; poids: number }>();
  const manifestsConnus = new Map<string, { version: number; manifest: ManifestTransfert }>();
  const memoriserManifest = (id: string, version: number, manifest: ManifestTransfert) => {
    manifestsConnus.delete(id); manifestsConnus.set(id, { version, manifest });
    if (manifestsConnus.size > 32) manifestsConnus.delete(manifestsConnus.keys().next().value!);
  };
  let poidsCache = 0;
  const memoriserBloc = (b: BlocTransfert) => {
    if (blocsChauds.has(b.empreinte)) return;
    const valeur = decoderBloc(b);
    const poids = Buffer.byteLength(JSON.stringify(valeur));
    blocsChauds.set(b.empreinte, { valeur, poids }); poidsCache += poids;
    while (poidsCache > 48 * 1024 * 1024 && blocsChauds.size > 1) {
      const cle = blocsChauds.keys().next().value!;
      poidsCache -= blocsChauds.get(cle)!.poids; blocsChauds.delete(cle);
    }
  };
  const ligne = (r: Record<string, unknown>): LigueStockee => ({
    id: String(r.id), code: String(r.code), version: Number(r.version),
    comptes: r.comptes as string[], etat: r.donnees as EtatCarriereEnLigne,
    echeance: r.echeance == null ? null : Date.parse(String(r.echeance)),
  });
  async function lirePagesLegacy(valeur: string, parCode = false): Promise<LigueStockee | null> {
    const legacy = async () => {
      const r = parCode
        ? await sql`select id,code,version,comptes,donnees,echeance from carriere_ligues where code=${valeur}`
        : await sql`select id,code,version,comptes,donnees,echeance from carriere_ligues where id=${valeur}`;
      if (r[0]) manifestsConnus.delete(String(r[0].id));
      return r[0] ? ligne(r[0]) : null;
    };
    try {
      const projection = `id,code,version,comptes,echeance,
        case when transfert_version=version then transfert_manifest end as manifest,
        case when transfert_version=version and transfert_manifest is not null then null else donnees end as donnees`;
      const rows = await sql.query(`select ${projection} from carriere_ligues where ${parCode ? 'code' : 'id'}=$1`, [valeur]);
      const r = rows[0];
      if (!r) return null;
      if (!r.manifest) { manifestsConnus.delete(String(r.id)); return ligne(r); }
      const manifest = r.manifest as ManifestTransfert;
      const disponibles = new Map<string, unknown>();
      for (const hash of Object.values(manifest.empreintes)) {
        const cache = blocsChauds.get(hash);
        if (cache) disponibles.set(hash, cache.valeur);
      }
      const manquants = Object.entries(manifest.empreintes).filter(([, hash]) => !disponibles.has(hash));
      if (manquants.length) {
        const blocs = await sql`select b.cle,b.empreinte,b.contenu from carriere_transfert_blocs b
          join jsonb_each_text(${JSON.stringify(Object.fromEntries(manquants))}::jsonb) m on b.cle=m.key and b.empreinte=m.value
          where b.ligue=${r.id}`;
        for (const bloc of blocs) {
          const b = bloc as unknown as BlocTransfert;
          memoriserBloc(b); disponibles.set(b.empreinte, blocsChauds.get(b.empreinte)!.valeur);
        }
      }
      // Une écriture a remplacé une page entre les deux SELECT : relire une
      // image atomique plutôt que mélanger des versions (vente/double achat).
      if (Object.values(manifest.empreintes).some(hash => !disponibles.has(hash))) return legacy();
      const etat = assemblerTransfert(manifest, (_cle, hash) => disponibles.get(hash));
      memoriserManifest(String(r.id), Number(r.version), manifest);
      return ligne({ ...r, donnees: structuredClone(etat) });
    } catch (erreur) {
      if (!['42703','42P01'].includes((erreur as { code?: string }).code ?? '')) throw erreur;
      return legacy();
    }
  }
  async function lireCompact(valeur: string, parCode = false): Promise<LigueStockee | null> {
    const precedent = parCode ? undefined : manifestsConnus.get(valeur)?.manifest;
    // Capturer les valeurs avant l'appel : une autre requête peut provoquer
    // une éviction du cache pendant que cette lecture attend la base.
    const disponibles = new Map<string, unknown>();
    const empreintes: Record<string, string> = {};
    for (const [cle, hash] of Object.entries(precedent?.empreintes ?? {})) {
      const bloc = blocsChauds.get(hash);
      if (bloc) { empreintes[cle] = hash; disponibles.set(hash, bloc.valeur); }
    }
    const connu = { champs: precedent ? formeTransfert(precedent) : undefined, empreintes };
    try {
      const [r] = await sql`select * from carriere_lire_delta(${parCode ? null : valeur}::uuid,${parCode ? valeur : null}::text,${JSON.stringify(connu)}::jsonb)`;
      if (!r) return null;
      if (!r.compact) { manifestsConnus.delete(String(r.id)); return ligne(r); }
      const champs = r.champs ? champsDepuisForme(r.champs) : precedent!.champs;
      const hashes = { ...empreintes, ...r.empreintes };
      const manifest: ManifestTransfert = { format: 1, champs, empreintes: {} };
      for (const cles of Object.values(manifest.champs)) for (const cle of cles) manifest.empreintes[cle] = hashes[cle];
      for (const b of r.blocs as BlocTransfert[]) {
        memoriserBloc(b); disponibles.set(b.empreinte, blocsChauds.get(b.empreinte)!.valeur);
      }
      if (Object.values(manifest.empreintes).some(hash => !disponibles.has(hash))) throw new Error('Transfert de ligue incomplet');
      const etat = assemblerTransfert(manifest, (_cle, hash) => disponibles.get(hash));
      memoriserManifest(String(r.id), Number(r.version), manifest);
      return ligne({ ...r, donnees: structuredClone(etat) });
    } catch (erreur) {
      if (!['42883','42703','42P01'].includes((erreur as { code?: string }).code ?? '')) throw erreur;
      return lirePagesLegacy(valeur, parCode);
    }
  }
  return {
    atelier: atelierNeon(url),
    push: pushNeon(url),
    async compteParIdentifiant(identifiant) {
      const r = await sql`select id, identifiant, pseudo, empreinte from comptes where identifiant=${identifiant}`;
      return (r[0] as CompteStocke) ?? null;
    },
    async compteParGoogle(sujet) {
      const r = await sql`select id,identifiant,pseudo,empreinte,courriel,fournisseur,sujet_externe as "sujetExterne"
        from comptes where fournisseur='google' and sujet_externe=${sujet}`;
      return (r[0] as CompteStocke) ?? null;
    },
    async lierCompteGoogle(id, sujet, courriel) {
      const r = await sql`update comptes set fournisseur='google',sujet_externe=${sujet},courriel=${courriel}
        where id=${id} and sujet_externe is null returning id`;
      return r.length === 1;
    },
    async creerCompte(c) {
      const r = await sansColonne(
        () => sql`insert into comptes (id,identifiant,pseudo,empreinte,courriel,fournisseur,sujet_externe)
          values (${c.id},${c.identifiant},${c.pseudo},${c.empreinte ?? null},${c.courriel ?? null},${c.fournisseur ?? null},${c.sujetExterne ?? null})
          on conflict do nothing returning id`,
        () => c.sujetExterne ? Promise.resolve([]) : sql`insert into comptes (id,identifiant,pseudo,empreinte)
          values (${c.id},${c.identifiant},${c.pseudo},${c.empreinte ?? null}) on conflict do nothing returning id`,
      );
      return r.length === 1;
    },
    async session(empreinte, maintenant) {
      const r = await sql`with active as (
          select c.id from sessions s join comptes c on c.id=s.compte
          where s.empreinte=${empreinte} and s.expire_le>${new Date(maintenant).toISOString()}
        )
        update comptes c set vu_le=now() from active a where c.id=a.id returning c.id,c.identifiant,c.pseudo`;
      return r[0] ? { ...r[0], empreinte: '' } as CompteStocke : null;
    },
    async ouvrirSession(empreinte, compte, expiration) {
      await sql`with nouvelle_session as (
        insert into sessions (empreinte,compte,expire_le)
        values (${empreinte},${compte},${new Date(expiration).toISOString()})
      ) update comptes set vu_le=now() where id=${compte}`;
    },
    async fermerSession(empreinte) { await sql`delete from sessions where empreinte=${empreinte}`; },
    async boutique(compte) {
      const r = await sql`select donnees from compte_boutique where compte=${compte}`;
      return (r[0]?.donnees as EtatBoutiqueCompte | undefined) ?? null;
    },
    async sauvegarderBoutique(compte, boutique) {
      await sql`insert into compte_boutique (compte,donnees,modifie_le)
        values (${compte},${JSON.stringify(boutique)}::jsonb,now())
        on conflict (compte) do update set donnees=excluded.donnees,modifie_le=excluded.modifie_le`;
    },
    async limiter(cle, maximum, fenetre, maintenant) {
      if (cle.startsWith('jeu:')) {
        try { return await limiterJeu(cle, maximum, fenetre, maintenant); }
        catch (erreur) { if ((erreur as { code?: string }).code !== '42883') throw erreur; }
      }
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
      const lire = (resume: boolean) => resume ? sql`
        select l.id,l.resume->>'nom' as nom,l.phase,l.resume->>'logo' as logo,l.resume->>'laboratoire' as laboratoire,l.resume->>'createurId' as createur_id,
               c.club->>'nom' as club_nom,c.club->>'ovas' as ovas,c.club->>'embleme' as club_embleme
        from carriere_ligues l cross join lateral (
          select club from jsonb_array_elements(l.resume->'clubs') club
          where club->>'compteId'=${compte} limit 1) c
        where l.comptes @> array[${compte}::uuid] order by l.cree_le desc`
        : sql`
        select l.id,l.donnees->>'nom' as nom,l.donnees->>'phase' as phase,l.donnees->>'logo' as logo,l.donnees->>'laboratoire' as laboratoire,l.donnees->>'createurId' as createur_id,
               c.club->>'nom' as club_nom,c.club->>'ovas' as ovas,c.club->>'embleme' as club_embleme
        from carriere_ligues l cross join lateral (
          select club from jsonb_array_elements(l.donnees->'clubs') club
          where club->>'compteId'=${compte} limit 1) c
        where l.comptes @> array[${compte}::uuid] order by l.cree_le desc`;
      const r = await sansColonne(() => lire(true), () => lire(false));
      return r.map(x => ({
        id: String(x.id), nom: String(x.nom ?? ''), phase: String(x.phase ?? ''),
        logo: x.logo == null ? undefined : String(x.logo),
        clubNom: String(x.club_nom ?? ''), ovas: Number(x.ovas ?? 0),
        clubEmbleme: x.club_embleme == null ? undefined : String(x.club_embleme),
        laboratoire: x.laboratoire === true || x.laboratoire === 'true',
        createurId: x.createur_id == null ? undefined : String(x.createur_id),
      }));
    },
    // ⚠️ COMPTER, C'EST COMPTER. Le plafond de 20 ligues lisait la liste
    //    entière pour en prendre la longueur.
    async nombreLigues(compte) {
      const r = await sql`select count(*)::int as n from carriere_ligues where comptes @> array[${compte}::uuid]
        and coalesce(donnees->>'laboratoire','false')<>'true'`;
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
    async administration() {
      const limite = 500;
      const [comptes, ligues] = await Promise.all([
        sql`select c.id,c.pseudo,c.cree_le,c.vu_le,count(l.id)::int as ligues
            from comptes c left join carriere_ligues l on l.comptes @> array[c.id]
            group by c.id,c.pseudo,c.cree_le,c.vu_le order by c.cree_le desc limit ${limite + 1}`,
        sql`select l.id,l.code,l.cree_le,l.donnees->>'nom' as nom,l.donnees->>'phase' as phase,
                   coalesce((l.donnees->>'saison')::int,1) as saison,
                   jsonb_array_length(coalesce(l.donnees->'clubs','[]'::jsonb))::int as clubs,
                   coalesce(c.pseudo,'Compte supprime') as createur
            from carriere_ligues l left join comptes c on c.id::text=l.donnees->>'createurId'
            order by l.cree_le desc limit ${limite + 1}`,
      ]);
      return {
        comptes: comptes.slice(0, limite).map(x => ({
          id: String(x.id), pseudo: String(x.pseudo), ligues: Number(x.ligues ?? 0),
          creeLe: x.cree_le ? new Date(String(x.cree_le)).toISOString() : undefined,
          vuLe: x.vu_le ? new Date(String(x.vu_le)).toISOString() : undefined,
        })),
        ligues: ligues.slice(0, limite).map(x => ({
          id: String(x.id), code: String(x.code), nom: String(x.nom ?? ''), phase: String(x.phase ?? ''),
          saison: Number(x.saison ?? 1), clubs: Number(x.clubs ?? 0), createur: String(x.createur),
          creeLe: x.cree_le ? new Date(String(x.cree_le)).toISOString() : undefined,
        })),
        limite, comptesTronques: comptes.length > limite, liguesTronquees: ligues.length > limite,
      };
    },
    async ligue(id) { return lireCompact(id); },
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
      // `etat_version` évite à Postgres de décompresser le JSONB TOASTé à
      // chaque sondage. Le repli garde le déploiement compatible avant migration.
      const r = await sansColonne(
        () => sql`select etat_version as version, comptes, catalogue_revision, extract(epoch from echeance) * 1000 as echeance from carriere_ligues where id=${id}`,
        () => sansColonne(
          () => sql`select (donnees->>'version')::int as version, comptes, extract(epoch from echeance) * 1000 as echeance from carriere_ligues where id=${id}`,
          () => sql`select (donnees->>'version')::int as version, comptes from carriere_ligues where id=${id}`,
        ),
      );
      if (!r[0]) return null;
      const e = r[0].echeance == null ? NaN : Number(r[0].echeance);
      return { version: Number(r[0].version), comptes: r[0].comptes as string[], echeance: Number.isFinite(e) ? e : null,
        catalogueRevision: r[0].catalogue_revision == null ? undefined : Number(r[0].catalogue_revision) };
    },
    async rafraichirEcheance(id, echeance) {
      // Sans la colonne, il n'y a rien à repousser : la lecture conditionnelle
      // ne s'arme pas, et le mode retrouve exactement son comportement d'avant.
      await sansColonne(
        () => sql`update carriere_ligues set echeance=to_timestamp(${echeance / 1000}) where id=${id}`,
        async () => [],
      );
    },
    async ligueParCode(code) { return lireCompact(code, true); },
    async creerLigue(l) {
      const resume = JSON.stringify(resumeEtat(l.etat));
      const maintenant = Date.now();
      const reveil = prochaineEcheanceMatch(l.etat, maintenant);
      const r = await sansColonne(
        () => sql`insert into carriere_ligues (id,code,version,etat_version,phase,resume,comptes,donnees,echeance,reveil_match) values (${l.id},${l.code},${l.version},${l.etat.version},${l.etat.phase},${resume}::jsonb,${l.comptes},${JSON.stringify(l.etat)}::jsonb,to_timestamp(${echeanceLigue(l.etat, maintenant) / 1000}),${reveil === null ? null : new Date(reveil).toISOString()}) on conflict do nothing returning id`,
        () => sql`insert into carriere_ligues (id,code,version,comptes,donnees) values (${l.id},${l.code},${l.version},${l.comptes},${JSON.stringify(l.etat)}::jsonb) on conflict do nothing returning id`,
      );
      return r.length === 1;
    },
    async supprimerLigue(id, createur) {
      const r = await sql`with cible as (
          select id from carriere_ligues where id=${id} and donnees->>'createurId'=${createur}
        ), commandes as (
          delete from carriere_commandes where ligue in (select id from cible)
        )
        delete from carriere_ligues where id in (select id from cible) returning id`;
      return r.length === 1;
    },
    async supprimerLiguesInactives(avant) {
      const limite = new Date(avant).toISOString();
      const r = await sql`with cibles as (
          select l.id from carriere_ligues l
          where not coalesce((l.donnees->>'laboratoire')::boolean,false)
            and not exists (
              select 1 from unnest(l.comptes) membre
              join comptes c on c.id=membre
              where c.vu_le>=${limite}
            )
        ), commandes as (
          delete from carriere_commandes where ligue in (select id from cibles)
        )
        delete from carriere_ligues where id in (select id from cibles) returning id`;
      return r.map(x => String(x.id));
    },
    async dejaTraitee(ligue, compte, requete) {
      return (await sql`select 1 from carriere_commandes where ligue=${ligue} and compte=${compte} and requete=${requete}`).length > 0;
    },
    async verifierCommande(ligue, compte, requete, connue) {
      const [r] = await sql`select jsonb_build_array(l.etat_version,
        case when l.etat_version=${connue?.version ?? null} then null else to_jsonb(l.comptes) end,extract(epoch from l.echeance)*1000,
        exists(select 1 from carriere_commandes c where c.ligue=l.id and c.compte=${compte} and c.requete=${requete})) as r
        from carriere_ligues l where l.id=${ligue}`;
      if (!r) return null;
      return { version: Number(r.r[0]), comptes: r.r[1] ?? connue!.comptes, echeance: r.r[2] == null ? null : Number(r.r[2]), dejaTraitee: Boolean(r.r[3]) };
    },
    async verifierSondage(ligue, compte, version, catalogue, maintenant) {
      const [r] = await sql`select case
        when not (comptes @> array[${compte}::uuid]) then '[-1]'::jsonb
        when etat_version=${version} and catalogue_revision=${catalogue} and echeance>to_timestamp(${maintenant / 1000}) then '[1]'::jsonb
        else jsonb_build_array(0,etat_version,comptes,extract(epoch from echeance)*1000,catalogue_revision)
        end as r from carriere_ligues where id=${ligue}`;
      if (!r || r.r[0] === -1) return { statut: 'absente' };
      if (r.r[0] === 1) return { statut: 'inchange' };
      return { statut: 'lire', entete: { version: Number(r.r[1]), comptes: r.r[2], echeance: r.r[3] == null ? null : Number(r.r[3]), catalogueRevision: r.r[4] == null ? undefined : Number(r.r[4]) } };
    },
    async comparerEtEcrire(l, version, recu) {
      // ⚠️ L'ÉCRITURE DOIT PASSER MÊME SANS LA COLONNE. C'est celle qui enregistre
      // tout ce que fait un manager : la faire dépendre d'une migration récente,
      // c'est arrêter le jeu le temps d'un `alter table`.
      const echeance = echeanceLigue(l.etat, Date.now()) / 1000;
      const reveil = prochaineEcheanceMatch(l.etat, Date.now());
      const donnees = JSON.stringify(l.etat);
      const resume = JSON.stringify(resumeEtat(l.etat));
      try {
        const precedent = manifestsConnus.get(l.id);
        const { manifest, blocs: modifies } = encoderTransfert(l.etat,
          precedent?.version === version ? precedent.manifest.empreintes : undefined);
        // Le CAS, le reçu et les pages sont un seul commit. Le CTE ne renvoie
        // que l'identifiant, jamais l'état. Seules les pages modifiées s'écrivent.
        const r = await sql`with modification as (
          update carriere_ligues set donnees=${donnees}::jsonb,resume=${resume}::jsonb,
            comptes=${l.comptes},version=version+1,etat_version=${l.etat.version},phase=${l.etat.phase},
            echeance=to_timestamp(${echeance}),reveil_match=${reveil === null ? null : new Date(reveil).toISOString()},
            transfert_manifest=${JSON.stringify(manifest)}::jsonb,transfert_version=version+1
          where id=${l.id} and version=${version}
            and (${!recu} or not exists (select 1 from carriere_commandes where ligue=${l.id} and compte=${recu?.compte ?? ''} and requete=${recu?.requete ?? ''}))
          returning id
        ), recu as (
          insert into carriere_commandes(ligue,compte,requete)
          select id,${recu?.compte ?? ''},${recu?.requete ?? ''} from modification where ${Boolean(recu)} returning ligue
        ), pages as (
          insert into carriere_transfert_blocs(ligue,cle,empreinte,contenu)
          select m.id,b.cle,b.empreinte,b.contenu from modification m
          cross join jsonb_to_recordset(${JSON.stringify(modifies)}::jsonb) as b(cle text,empreinte text,contenu text)
          on conflict(ligue,cle) do update set empreinte=excluded.empreinte,contenu=excluded.contenu
            where carriere_transfert_blocs.empreinte is distinct from excluded.empreinte returning ligue
        ), obsoletes as (
          delete from carriere_transfert_blocs b using modification m
          where b.ligue=m.id and not (${JSON.stringify(manifest.empreintes)}::jsonb ? b.cle) returning b.ligue
        ) select 1 as ok from modification`;
        if (r.length) {
          for (const b of modifies) memoriserBloc(b);
          memoriserManifest(l.id, version + 1, manifest);
        }
        return r.length === 1;
      } catch (erreur) {
        if (!['42703','42P01'].includes((erreur as { code?: string }).code ?? '')) throw erreur;
      }
      const ecrire = (colonnes: 'toutes' | 'echeance' | 'anciennes') => {
        const modification = recu
          ? colonnes === 'toutes'
            ? sql`with modification as (update carriere_ligues set donnees=${donnees}::jsonb,resume=${resume}::jsonb,comptes=${l.comptes},version=version+1,etat_version=${l.etat.version},phase=${l.etat.phase},echeance=to_timestamp(${echeance}),reveil_match=${reveil === null ? null : new Date(reveil).toISOString()} where id=${l.id} and version=${version} and not exists (select 1 from carriere_commandes where ligue=${l.id} and compte=${recu.compte} and requete=${recu.requete}) returning id) insert into carriere_commandes (ligue,compte,requete) select id,${recu.compte},${recu.requete} from modification returning ligue`
            : colonnes === 'echeance'
              ? sql`with modification as (update carriere_ligues set donnees=${donnees}::jsonb,comptes=${l.comptes},version=version+1,echeance=to_timestamp(${echeance}) where id=${l.id} and version=${version} and not exists (select 1 from carriere_commandes where ligue=${l.id} and compte=${recu.compte} and requete=${recu.requete}) returning id) insert into carriere_commandes (ligue,compte,requete) select id,${recu.compte},${recu.requete} from modification returning ligue`
              : sql`with modification as (update carriere_ligues set donnees=${donnees}::jsonb,comptes=${l.comptes},version=version+1 where id=${l.id} and version=${version} and not exists (select 1 from carriere_commandes where ligue=${l.id} and compte=${recu.compte} and requete=${recu.requete}) returning id) insert into carriere_commandes (ligue,compte,requete) select id,${recu.compte},${recu.requete} from modification returning ligue`
          : colonnes === 'toutes'
            ? sql`update carriere_ligues set donnees=${donnees}::jsonb,resume=${resume}::jsonb,comptes=${l.comptes},version=version+1,etat_version=${l.etat.version},phase=${l.etat.phase},echeance=to_timestamp(${echeance}),reveil_match=${reveil === null ? null : new Date(reveil).toISOString()} where id=${l.id} and version=${version} returning id`
            : colonnes === 'echeance'
              ? sql`update carriere_ligues set donnees=${donnees}::jsonb,comptes=${l.comptes},version=version+1,echeance=to_timestamp(${echeance}) where id=${l.id} and version=${version} returning id`
              : sql`update carriere_ligues set donnees=${donnees}::jsonb,comptes=${l.comptes},version=version+1 where id=${l.id} and version=${version} returning id`;
        return modification;
      };
      const r = await sansColonne(() => ecrire('toutes'), () => sansColonne(() => ecrire('echeance'), () => ecrire('anciennes')));
      return r.length === 1;
    },
    async marquerPresence(ligue, match, compte, maintenant) {
      try {
        await sql`insert into carriere_presences (ligue,match,compte,vu_le) values (${ligue},${match},${compte},to_timestamp(${maintenant / 1000})) on conflict (ligue,match,compte) do update set vu_le=excluded.vu_le`;
        return true;
      } catch (erreur) {
        if ((erreur as { code?: string }).code === '42P01') return false;
        throw erreur;
      }
    },
    async presencesActives(ligue, depuis) {
      try {
        const r = await sql`select match,compte,extract(epoch from vu_le)*1000 as vu from carriere_presences where ligue=${ligue} and vu_le>=to_timestamp(${depuis / 1000})`;
        return r.map(x => ({ match: String(x.match), compte: String(x.compte), vu: Number(x.vu) }));
      } catch (erreur) {
        if ((erreur as { code?: string }).code === '42P01') return null;
        throw erreur;
      }
    },
    async nettoyerPresences(avant) {
      try { await sql`delete from carriere_presences where vu_le<to_timestamp(${avant / 1000})`; }
      catch (erreur) { if ((erreur as { code?: string }).code !== '42P01') throw erreur; }
      await sql`delete from sessions where expire_le<now()`;
      await sql`delete from carriere_debits where debut<${avant}`;
    },
    async actives() { return (await sansColonne(
      () => sql`select id from carriere_ligues where (phase='saison' and reveil_match<=now()) or (phase='salon' and echeance<=now()) order by coalesce(reveil_match,echeance)`,
      () => sql`select id from carriere_ligues where donnees->>'phase'='saison'
        or (donnees->>'phase'='salon' and (donnees->>'creeLe')::timestamptz<=now()-interval '2 days')`,
    )).map(r => String(r.id)); },
  };
}
