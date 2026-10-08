// LE STOCKAGE DES PACKS DE TEST (Correctif 33) — permission, packs, journal.
//
// Trois tables (`schema-carriere.sql`) :
//   compte_permissions      — qui a le droit (une ligne par compte et par permission, sur l'identifiant IMMUABLE) ;
//   packs_internes          — les packs composés, lisibles par leur seul auteur ;
//   packs_internes_journal  — chaque création, ouverture et suppression : compte, date, cartes, pack.
//
// ⚠️ SANS LES TABLES, PERSONNE N'A LA PERMISSION. Une table absente (`42P01`) répond « non » : l'outil reste fermé tant
// que le schéma n'est pas appliqué, il ne retombe jamais sur un contrôle par pseudo.
//
// Le SQL reçoit sa fonction d'exécution en paramètre : le même texte part vers Neon en production.

import type { EtatBoutiqueCompte } from '../src/lib/boutiqueCompte.js';
import { CLE_COFFRE_PACKS_INTERNES, PACKS_INTERNES_MAX, SOURCE_ACQUISITION_INTERNE, type LigneJournalPackInterne, type PackInterne } from '../src/lib/packsInternes.js';

export interface StockagePacksInternes {
  /** Le compte détient-il cette permission ? La réponse vient de la base, jamais d'un pseudo ni du navigateur. */
  permission(compte: string, permission: string): Promise<boolean>;
  lister(compte: string): Promise<PackInterne[]>;
  lire(compte: string, id: string): Promise<PackInterne | null>;
  /** `false` : le plafond de packs du compte est atteint. La création est consignée dans la même écriture. */
  creer(compte: string, pack: PackInterne): Promise<boolean>;
  supprimer(compte: string, id: string): Promise<boolean>;
  /**
   * Ouvre le pack : les cartes rejoignent le coffre, l'ouverture est comptée et consignée — d'un seul geste. `quantites` :
   * les clés du coffre ; `cartes` : les `sourceId` dans l'ordre de révélation, pour le journal. `null` : pack ou coffre absent.
   */
  ouvrir(compte: string, id: string, quantites: Record<string, number>, cartes: string[]): Promise<EtatBoutiqueCompte | null>;
  journal(compte: string, limite: number): Promise<LigneJournalPackInterne[]>;
}

/** Une requête SQL paramétrée, à la façon du pilote Neon : gabarit étiqueté, lignes en retour. */
export type ExecuterSql = (textes: TemplateStringsArray, ...valeurs: unknown[]) => Promise<Record<string, unknown>[]>;

const tableAbsente = (erreur: unknown) => (erreur as { code?: string }).code === '42P01';
const versIso = (v: unknown) => (v instanceof Date ? v : new Date(String(v))).toISOString();
const versPack = (l: Record<string, unknown>): PackInterne => ({
  id: String(l.id), nom: String(l.nom), cartes: (l.cartes as string[]).map(String),
  ...(l.principale ? { principale: String(l.principale) } : {}),
  creeLe: versIso(l.cree_le), ouvertures: Number(l.ouvertures),
  ...(l.derniere_ouverture ? { derniereOuverture: versIso(l.derniere_ouverture) } : {}),
});

export function packsInternesSql(sql: ExecuterSql): StockagePacksInternes {
  return {
    async permission(compte, permission) {
      try {
        const lignes = await sql`select 1 as ok from compte_permissions where compte = ${compte}::uuid and permission = ${permission}::text`;
        return lignes.length > 0;
      } catch (erreur) { if (tableAbsente(erreur)) return false; throw erreur; }
    },
    async lister(compte) {
      const lignes = await sql`select id, nom, cartes, principale, cree_le, ouvertures, derniere_ouverture
        from packs_internes where compte = ${compte}::uuid order by cree_le desc, id limit 200`;
      return lignes.map(versPack);
    },
    async lire(compte, id) {
      const lignes = await sql`select id, nom, cartes, principale, cree_le, ouvertures, derniere_ouverture
        from packs_internes where id = ${id}::uuid and compte = ${compte}::uuid`;
      return lignes.length ? versPack(lignes[0]) : null;
    },
    async creer(compte, pack) {
      const cartes = JSON.stringify(pack.cartes);
      const lignes = await sql`with nouveau as (
          insert into packs_internes (id, compte, nom, cartes, principale)
          select ${pack.id}::uuid, ${compte}::uuid, ${pack.nom}::text, ${cartes}::jsonb, ${pack.principale ?? null}::text
          where (select count(*) from packs_internes where compte = ${compte}::uuid) < ${PACKS_INTERNES_MAX}::int
          returning id, compte, nom, cartes
        ), trace as (
          insert into packs_internes_journal (pack_id, compte, action, source, nom, cartes)
          select id, compte, 'CREATE', ${SOURCE_ACQUISITION_INTERNE}::text, nom, cartes from nouveau
        ) select id from nouveau`;
      return lignes.length > 0;
    },
    async supprimer(compte, id) {
      const lignes = await sql`with retire as (
          delete from packs_internes where id = ${id}::uuid and compte = ${compte}::uuid returning id, compte, nom, cartes
        ), trace as (
          insert into packs_internes_journal (pack_id, compte, action, source, nom, cartes)
          select id, compte, 'DELETE', ${SOURCE_ACQUISITION_INTERNE}::text, nom, cartes from retire
        ) select id from retire`;
      return lignes.length > 0;
    },
    async ouvrir(compte, id, quantites, cartes) {
      const ajout = JSON.stringify(quantites), ordre = JSON.stringify(cartes), cle = CLE_COFFRE_PACKS_INTERNES;
      // ⚠️ UNE SEULE INSTRUCTION : les cartes n'entrent dans le coffre que si le pack appartient au compte, et le journal
      // n'inscrit que ce qui est entré. L'expression du coffre est celle de `ajouterPackSolo`, déjà en production.
      const lignes = await sql`with coffre as (
          update compte_boutique b set donnees = jsonb_set(b.donnees, '{collectionSolo}',
            coalesce(b.donnees->'collectionSolo','{}'::jsonb) || jsonb_build_object(
              'quantites', coalesce(b.donnees->'collectionSolo'->'quantites','{}'::jsonb) ||
                (select jsonb_object_agg(k, coalesce((b.donnees->'collectionSolo'->'quantites'->>k)::bigint,0) + v::bigint)
                 from jsonb_each_text(${ajout}::jsonb) a(k,v)),
              'packsOuverts', coalesce(b.donnees->'collectionSolo'->'packsOuverts','{}'::jsonb) ||
                jsonb_build_object(${cle}::text, coalesce((b.donnees->'collectionSolo'->'packsOuverts'->>${cle}::text)::bigint,0) + 1),
              'doublons', coalesce((b.donnees->'collectionSolo'->>'doublons')::bigint,0) +
                (select sum(v::bigint - case when coalesce((b.donnees->'collectionSolo'->'quantites'->>k)::bigint,0) > 0 then 0 else 1 end)
                 from jsonb_each_text(${ajout}::jsonb) a(k,v)),
              'revision', coalesce((b.donnees->'collectionSolo'->>'revision')::bigint,0) + 1
            )), modifie_le = now()
          where b.compte = ${compte}::uuid
            and exists (select 1 from packs_internes p where p.id = ${id}::uuid and p.compte = ${compte}::uuid)
          returning b.donnees
        ), compteur as (
          update packs_internes set ouvertures = ouvertures + 1, derniere_ouverture = now()
          where id = ${id}::uuid and compte = ${compte}::uuid and exists (select 1 from coffre)
          returning nom
        ), trace as (
          insert into packs_internes_journal (pack_id, compte, action, source, nom, cartes)
          select ${id}::uuid, ${compte}::uuid, 'OPEN', ${SOURCE_ACQUISITION_INTERNE}::text, nom, ${ordre}::jsonb from compteur
        ) select donnees from coffre`;
      return lignes.length ? lignes[0].donnees as EtatBoutiqueCompte : null;
    },
    async journal(compte, limite) {
      const lignes = await sql`select pack_id, nom, action, cartes, source, date from packs_internes_journal
        where compte = ${compte}::uuid order by id desc limit ${Math.max(1, Math.min(200, Math.floor(limite)))}::int`;
      return lignes.map((l) => ({ packId: String(l.pack_id), ...(l.nom ? { nom: String(l.nom) } : {}), action: l.action as LigneJournalPackInterne['action'],
        cartes: (l.cartes as string[]).map(String), source: String(l.source), date: versIso(l.date) }));
    },
  };
}
