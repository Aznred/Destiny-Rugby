// LE MARCHÉ DES COMBINAISONS, CÔTÉ SERVEUR (Correctif 41) — une table (`combinaisons_publiees`, `schema-carriere.sql`),
// une ligne par publication, écrite par comparaison de révision.
//
// ⚠️ SANS LA TABLE, LE MARCHÉ EST FERMÉ, PAS CASSÉ : une table absente (`42P01`) rend une liste vide, refuse la
// publication, et les matchs gardent ce qu'ils doivent au marché jusqu'à ce qu'elle existe. Le cahier, lui, ne dépend
// de rien d'ici.
// ⚠️ CE MODE SE PAIE AU TRANSFERT : la liste est gardée en mémoire par instance, et une sonde de quelques octets
// (`empreinte`) dit s'il faut la relire. Les règles sont dans `src/lib/ligue/marcheCombinaisons.ts` — ici on ne fait que
// lire, vérifier qui demande, et écrire.

import {
  appliquerRemontee, creerFiche, detailDeFiche, lirePublication, metaDepuisFiches, modererFiche, noterFiche, noterTelechargement, nouvelleVersion,
  refusNouvellePublication, resumeDeFiche, signalerFiche,
  type DetailPublie, type FichePubliee, type MetaCombinaison, type MotifSignalement, type RefusPublication, type RemonteeCombinaisons, type ResumePublie,
} from '../src/lib/ligue/marcheCombinaisons.js';
import type { ExecuterSql } from './packsInternesStockage.js';

export interface StockageMarcheCombinaisons {
  /** Quelques octets qui changent dès qu'une fiche est créée ou écrite. `null` : table absente. */
  empreinte(): Promise<string | null>;
  toutes(): Promise<FichePubliee[]>;
  lire(id: string): Promise<{ fiche: FichePubliee; revision: number } | null>;
  creer(fiche: FichePubliee): Promise<boolean>;
  /** Écrit seulement si la révision lue est encore la bonne. */
  ecrire(fiche: FichePubliee, revision: number): Promise<boolean>;
}

const tableAbsente = (erreur: unknown) => (erreur as { code?: string }).code === '42P01';
const FICHES_MAX = 600;

export function marcheCombinaisonsSql(sql: ExecuterSql): StockageMarcheCombinaisons {
  const sansTable = async <T>(lire: () => Promise<T>, repli: T): Promise<T> => {
    try { return await lire(); } catch (erreur) { if (tableAbsente(erreur)) return repli; throw erreur; }
  };
  return {
    empreinte: () => sansTable(async () => {
      const l = (await sql`select count(*)::int as n, coalesce(sum(revision), 0)::bigint as r from combinaisons_publiees`)[0];
      return `${l.n}:${l.r}`;
    }, null),
    toutes: () => sansTable(async () => (await sql`select donnees from combinaisons_publiees order by maj_le desc limit ${FICHES_MAX}::int`)
      .map(l => l.donnees as FichePubliee), []),
    lire: id => sansTable(async () => {
      const l = (await sql`select donnees, revision from combinaisons_publiees where id = ${id}::text`)[0];
      return l ? { fiche: l.donnees as FichePubliee, revision: Number(l.revision) } : null;
    }, null),
    creer: fiche => sansTable(async () => (await sql`insert into combinaisons_publiees (id, auteur, donnees)
      values (${fiche.id}::text, ${fiche.auteur}::uuid, ${JSON.stringify(fiche)}::jsonb) on conflict (id) do nothing returning id`).length > 0, false),
    ecrire: (fiche, revision) => sansTable(async () => (await sql`update combinaisons_publiees
      set donnees = ${JSON.stringify(fiche)}::jsonb, revision = revision + 1, maj_le = now()
      where id = ${fiche.id}::text and revision = ${revision}::int returning id`).length > 0, false),
  };
}

export class RefusMarche extends Error { constructor(readonly raison: RefusPublication | 'note' | 'signalement') { super(raison); } }

export interface ServiceMarcheCombinaisons {
  liste(compte: string, moderateur: boolean): Promise<ResumePublie[]>;
  detail(id: string, compte: string, moderateur: boolean): Promise<DetailPublie | null>;
  publier(compte: string, pseudo: string, corps: unknown, maintenant: number): Promise<DetailPublie>;
  /** Note qu'un compte l'ajoute à ses tactiques, et rend le plan à ranger dans son cahier. */
  ajouter(id: string, compte: string): Promise<DetailPublie | null>;
  noter(id: string, compte: string, note: number): Promise<DetailPublie | null>;
  signaler(id: string, compte: string, motif: MotifSignalement): Promise<DetailPublie | null>;
  moderer(id: string, decision: 'retirer' | 'retablir', compte: string, moderateur: boolean): Promise<DetailPublie | null>;
  /** Verse les statistiques de matchs terminés. `false` : marché indisponible, à réessayer plus tard. */
  verser(remontees: readonly RemonteeCombinaisons[]): Promise<boolean>;
  meta(): Promise<MetaCombinaison[]>;
}

export function creerMarcheCombinaisons(stockage: StockageMarcheCombinaisons, horloge: () => number = Date.now): ServiceMarcheCombinaisons {
  let cache: { fiches: FichePubliee[]; empreinte: string | null; jusqua: number } | null = null;
  let meta: { liste: MetaCombinaison[]; jusqua: number } | null = null;
  let fermeJusqua = 0;

  /** Les fiches, relues seulement si la sonde a bougé. Table absente : on ne redemande pas avant dix minutes. */
  async function fiches(frais = false): Promise<FichePubliee[]> {
    const maintenant = horloge();
    if (maintenant < fermeJusqua) return [];
    if (cache && !frais && maintenant < cache.jusqua) return cache.fiches;
    const empreinte = await stockage.empreinte();
    if (empreinte === null) { fermeJusqua = maintenant + 600_000; cache = null; return []; }
    if (!cache || cache.empreinte !== empreinte) cache = { fiches: await stockage.toutes(), empreinte, jusqua: 0 };
    cache.jusqua = maintenant + 20_000;
    return cache.fiches;
  }
  const oublier = () => { cache = null; meta = null; };
  /** Lire, transformer, écrire — et recommencer si quelqu'un d'autre a écrit entre-temps. */
  async function modifier(id: string, transformer: (fiche: FichePubliee) => FichePubliee | null): Promise<FichePubliee | null> {
    for (let essai = 0; essai < 4; essai++) {
      const lu = await stockage.lire(id);
      if (!lu) return null;
      const suite = transformer(lu.fiche);
      if (!suite) return null;
      if (suite === lu.fiche) return lu.fiche;
      if (await stockage.ecrire(suite, lu.revision)) { oublier(); return suite; }
    }
    return null;
  }
  const visible = (f: FichePubliee, compte: string, moderateur: boolean) =>
    f.etat === 'publiee' || (f.etat !== 'retiree' && (f.auteur === compte || moderateur)) || (moderateur && f.etat === 'retiree');

  return {
    async liste(compte, moderateur) {
      return (await fiches()).filter(f => visible(f, compte, moderateur) && (moderateur || f.etat !== 'retiree')).map(f => resumeDeFiche(f, compte));
    },
    async detail(id, compte, moderateur) {
      const f = (await stockage.lire(id))?.fiche;
      return f && visible(f, compte, moderateur) ? detailDeFiche(f, compte, moderateur) : null;
    },
    async publier(compte, pseudo, corps, maintenant) {
      const lu = lirePublication(corps);
      if ('refus' in lu) throw new RefusMarche(lu.refus);
      const toutes = await fiches(true);
      const publication = (corps as { publication?: unknown })?.publication;
      if (typeof publication === 'string' && publication) {
        let refus: RefusPublication | null = 'introuvable';
        const suite = await modifier(publication, f => {
          const r = nouvelleVersion(f, compte, toutes, lu.saisie, maintenant);
          if ('refus' in r) { refus = r.refus; return null; }
          refus = null;
          return r.fiche;
        });
        if (!suite || refus) throw new RefusMarche(refus ?? 'introuvable');
        return detailDeFiche(suite, compte);
      }
      const refus = refusNouvellePublication(toutes, compte, lu.saisie, maintenant);
      if (refus) throw new RefusMarche(refus);
      const fiche = creerFiche(globalThis.crypto.randomUUID(), compte, pseudo, lu.saisie, maintenant);
      if (!await stockage.creer(fiche)) throw new RefusMarche('introuvable');
      oublier();
      return detailDeFiche(fiche, compte);
    },
    async ajouter(id, compte) {
      const f = await modifier(id, fiche => (fiche.etat === 'publiee' || fiche.auteur === compte ? noterTelechargement(fiche, compte) : null));
      return f ? detailDeFiche(f, compte) : null;
    },
    async noter(id, compte, note) {
      const f = await modifier(id, fiche => noterFiche(fiche, compte, note));
      return f ? detailDeFiche(f, compte) : null;
    },
    async signaler(id, compte, motif) {
      const f = await modifier(id, fiche => signalerFiche(fiche, compte, motif));
      return f ? detailDeFiche(f, compte) : null;
    },
    async moderer(id, decision, compte, moderateur) {
      const f = await modifier(id, fiche => modererFiche(fiche, decision, compte, moderateur));
      return f ? detailDeFiche(f, compte, moderateur) : null;
    },
    async verser(remontees) {
      if (horloge() < fermeJusqua) return false;
      if (await stockage.empreinte() === null) { fermeJusqua = horloge() + 600_000; return false; }
      for (const remontee of remontees) {
        for (const id of new Set(remontee.lignes.map(l => l.publication))) {
          // Une fiche disparue ou un match déjà compté ne retiennent pas la remontée : elle est tenue pour versée.
          await modifier(id, fiche => appliquerRemontee(fiche, remontee));
        }
      }
      return true;
    },
    async meta() {
      const maintenant = horloge();
      if (!meta || maintenant >= meta.jusqua) meta = { liste: metaDepuisFiches(await fiches()), jusqua: maintenant + 600_000 };
      return meta.liste;
    },
  };
}

/** Le même marché sur un tableau en mémoire : le serveur de développement et les bancs. */
export function marcheCombinaisonsMemoire(lignes: { fiche: FichePubliee; revision: number }[], apresEcriture: () => void = () => {}): StockageMarcheCombinaisons {
  return {
    empreinte: async () => `${lignes.length}:${lignes.reduce((n, l) => n + l.revision, 0)}`,
    toutes: async () => [...lignes].sort((a, b) => b.fiche.majLe - a.fiche.majLe).slice(0, FICHES_MAX).map(l => structuredClone(l.fiche)),
    lire: async id => { const l = lignes.find(x => x.fiche.id === id); return l ? { fiche: structuredClone(l.fiche), revision: l.revision } : null; },
    creer: async fiche => { if (lignes.some(l => l.fiche.id === fiche.id)) return false; lignes.push({ fiche: structuredClone(fiche), revision: 0 }); apresEcriture(); return true; },
    ecrire: async (fiche, revision) => {
      const l = lignes.find(x => x.fiche.id === fiche.id);
      if (!l || l.revision !== revision) return false;
      l.fiche = structuredClone(fiche); l.revision += 1; apresEcriture(); return true;
    },
  };
}
