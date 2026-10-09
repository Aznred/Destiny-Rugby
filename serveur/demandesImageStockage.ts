// LE STOCKAGE DES DEMANDES « MON IMAGE » — une table (`demandes_image`, `schema-carriere.sql`).
//
// ⚠️ SANS LA TABLE, LA FONCTION EST FERMÉE, PAS CASSÉE : une table absente (`42P01`) rend des listes vides et refuse la
// création. Les portraits du jeu ne changent pas tant que le schéma n'est pas appliqué.
// ⚠️ LE PORTRAIT PROPOSÉ NE VOYAGE QUE QUAND ON LE REGARDE : les listes ne le lisent pas (`image` absent), seul le détail
// d'une demande (Labo) et l'adresse publique d'un portrait ACCEPTÉ le rapatrient.

import { DEMANDES_EN_ATTENTE_MAX, type DemandeImage, type SaisieDemandeImage, type StatutDemandeImage } from '../src/lib/demandesImage.js';
import type { ExecuterSql } from './packsInternesStockage.js';

export interface StockageDemandesImage {
  /** `false` : trop de demandes en attente pour ce compte, ou table absente. */
  creer(compte: string, id: string, saisie: SaisieDemandeImage, cle: string): Promise<boolean>;
  miennes(compte: string): Promise<DemandeImage[]>;
  /** Toutes les demandes, les plus récentes d'abord, sans leur image. */
  toutes(limite: number): Promise<DemandeImage[]>;
  /** Le portrait proposé d'une demande (Labo), ou celui d'une demande acceptée (`accepteeSeulement`). */
  image(id: string, accepteeSeulement: boolean): Promise<string | null>;
  /** `null` : demande introuvable. */
  decider(id: string, statut: StatutDemandeImage, par: string): Promise<DemandeImage | null>;
  /** Les demandes acceptées, pour la liste publique. */
  acceptees(): Promise<Pick<DemandeImage, 'id' | 'type' | 'joueur' | 'decideLe'>[]>;
}

const tableAbsente = (erreur: unknown) => (erreur as { code?: string }).code === '42P01';
const versIso = (v: unknown) => (v instanceof Date ? v : new Date(String(v))).toISOString();
const versDemande = (l: Record<string, unknown>): DemandeImage => ({
  id: String(l.id), type: l.type === 'ajout' ? 'ajout' : 'retrait', joueur: String(l.joueur), club: String(l.club ?? ''),
  message: String(l.message ?? ''), statut: String(l.statut) as StatutDemandeImage, creeLe: versIso(l.cree_le),
  ...(l.decide_le ? { decideLe: versIso(l.decide_le) } : {}), ...(l.pseudo ? { pseudo: String(l.pseudo) } : {}),
});

export function demandesImageSql(sql: ExecuterSql): StockageDemandesImage {
  const sansTable = async <T>(lire: () => Promise<T>, repli: T): Promise<T> => {
    try { return await lire(); } catch (erreur) { if (tableAbsente(erreur)) return repli; throw erreur; }
  };
  return {
    creer: (compte, id, s, cle) => sansTable(async () => {
      const lignes = await sql`insert into demandes_image (id, compte, type, joueur, cle, club, message, image)
        select ${id}::uuid, ${compte}::uuid, ${s.type}::text, ${s.joueur}::text, ${cle}::text, ${s.club}::text, ${s.message}::text, ${s.image ?? null}::text
        where (select count(*) from demandes_image where compte = ${compte}::uuid and statut = 'attente') < ${DEMANDES_EN_ATTENTE_MAX}::int
        returning id`;
      return lignes.length > 0;
    }, false),
    miennes: compte => sansTable(async () => (await sql`select id, type, joueur, club, message, statut, cree_le, decide_le
      from demandes_image where compte = ${compte}::uuid order by cree_le desc limit 30`).map(versDemande), []),
    toutes: limite => sansTable(async () => (await sql`select d.id, d.type, d.joueur, d.club, d.message, d.statut, d.cree_le, d.decide_le, c.pseudo
      from demandes_image d left join comptes c on c.id = d.compte order by (d.statut = 'attente') desc, d.cree_le desc limit ${limite}::int`).map(versDemande), []),
    image: (id, accepteeSeulement) => sansTable(async () => {
      const lignes = await sql`select image from demandes_image where id = ${id}::uuid and type = 'ajout'
        and (not ${accepteeSeulement}::boolean or statut = 'acceptee')`;
      return lignes.length && lignes[0].image ? String(lignes[0].image) : null;
    }, null),
    decider: (id, statut, par) => sansTable(async () => {
      const lignes = await sql`update demandes_image set statut = ${statut}::text, decide_le = now(), decide_par = ${par}::text
        where id = ${id}::uuid returning id, type, joueur, club, message, statut, cree_le, decide_le`;
      return lignes.length ? versDemande(lignes[0]) : null;
    }, null),
    acceptees: () => sansTable(async () => (await sql`select id, type, joueur, decide_le from demandes_image
      where statut = 'acceptee' order by decide_le limit 5000`).map(l => ({
      id: String(l.id), type: l.type === 'ajout' ? 'ajout' as const : 'retrait' as const, joueur: String(l.joueur), decideLe: versIso(l.decide_le),
    })), []),
  };
}
