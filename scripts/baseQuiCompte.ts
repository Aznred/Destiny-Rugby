// LA BASE QUI COMPTE — un stockage en mémoire qui répond comme celui de Neon
// (mêmes méthodes, mêmes lectures conditionnelles) et note chaque requête SQL
// que la vraie base aurait reçue : sa nature, sa table, les octets partis et
// revenus. Sert à mesurerConsommationDirect.ts et à verifierEcritureDirect.ts.
import { performance } from 'node:perf_hooks';
import type { CompteStocke, LigueStockee, StockageCarriere } from '../serveur/carriereStockage';
import { creerLimiteurReserve } from '../serveur/limiteurReserve';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { echeanceLigue, prochaineEcheanceMatch } from '../src/lib/ligue/echeanceCarriere';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

export type Nature = 'SELECT' | 'UPDATE' | 'INSERT' | 'DELETE';
export interface Compteur { nature: Nature; table: string; n: number; envoyes: number; recus: number }
export const poids = (x: unknown) => (x === undefined ? 0 : Buffer.byteLength(typeof x === 'string' ? x : JSON.stringify(x) ?? ''));

export class Releve {
  sql = new Map<string, Compteur>();
  tempsBase = 0;
  noter(methode: string, nature: Nature, table: string, envoyes: number, recus: number) {
    let c = this.sql.get(methode);
    if (!c) { c = { nature, table, n: 0, envoyes: 0, recus: 0 }; this.sql.set(methode, c); }
    c.n++; c.envoyes += envoyes; c.recus += recus;
  }
  total(nature?: Nature) {
    let n = 0, envoyes = 0, recus = 0;
    for (const c of this.sql.values()) if (!nature || c.nature === nature) { n += c.n; envoyes += c.envoyes; recus += c.recus; }
    return { n, envoyes, recus };
  }
}

interface LigneLigue {
  id: string; code: string; version: number; comptes: string[]; json: string;
  etatVersion: number; catalogue: number; echeance: number | null;
}

export function creerBase(releve: Releve) {
  const comptes = new Map<string, CompteStocke>();
  const sessions = new Map<string, string>();
  const ligues = new Map<string, LigneLigue>();
  const recus = new Set<string>();
  const presences = new Map<string, { ligue: string; match: string; compte: string; vu: number }>();
  /** Ce qui a fait écrire l'état entier : la liste des champs du match qui ont bougé. */
  const causes = new Map<string, number>();
  /** Ce que la table de l'atelier contient : un banc peut y poser une révision plus récente. */
  const reglages = { catalogue: CATALOGUE_ADMIN_VIDE };
  const mesurer = async <T>(methode: string, nature: Nature, table: string, envoi: unknown, f: () => T): Promise<T> => {
    const debut = performance.now();
    const r = f();
    releve.noter(methode, nature, table, poids(envoi) + 60, r && typeof r === 'object' && 'etat' in (r as object) ? 0 : poids(r));
    releve.tempsBase += performance.now() - debut;
    return r;
  };
  const entete = (l: LigneLigue) => ({ version: l.etatVersion, comptes: l.comptes, echeance: l.echeance, catalogueRevision: l.catalogue });

  /** Une instance Neon : le limiteur garde ses jetons par processus, comme en production. */
  const instance = (): StockageCarriere => {
    const limiterJeu = creerLimiteurReserve(async (cle, maximum, _debut, lot) =>
      mesurer('limiter (carriere_reserver_debit)', 'UPDATE', 'carriere_debits', [cle, maximum, lot], () => lot));
    return {
      atelier: {
        lire: () => mesurer('atelier.lire (révision du catalogue)', 'SELECT', 'carriere_catalogue_admin', 1, () => reglages.catalogue),
        ecrire: async () => false,
      },
      push: {
        lister: (ligue: string) => mesurer('push.lister', 'SELECT', 'carriere_push', ligue, () => []),
        enregistrer: async () => {}, supprimer: async () => {},
        reserver: (cle: string) => mesurer('push.reserver', 'INSERT', 'carriere_push_envois', cle, () => true),
        terminer: (cle: string) => mesurer('push.terminer', 'UPDATE', 'carriere_push_envois', cle, () => undefined),
        liberer: async () => {},
      },
      session: (empreinte: string, _maintenant: number, toucher = true) => mesurer(
        toucher ? 'session (comptes.vu_le)' : 'session (lecture seule)', toucher ? 'UPDATE' : 'SELECT', 'comptes', empreinte, () => {
          const compte = comptes.get(sessions.get(empreinte) ?? '');
          return compte ? { ...compte, empreinte: '' } : null;
        }),
      sondageDirect: (id: string, depuis: number) => mesurer('sondageDirect (en-tête + présences)', 'SELECT', 'carriere_ligues', [id, depuis], () => {
        const l = ligues.get(id);
        if (!l) return null;
        return { entete: entete(l), presences: [...presences.values()].filter((p) => p.ligue === id && p.vu >= depuis)
          .map((p) => ({ match: p.match, compte: p.compte, vu: p.vu })) };
      }),
      limiter: (cle: string, maximum: number, fenetre: number, maintenant: number) => limiterJeu(cle, maximum, fenetre, maintenant),
      entete: (id: string) => mesurer('entete', 'SELECT', 'carriere_ligues', id, () => {
        const l = ligues.get(id); return l ? entete(l) : null;
      }),
      verifierSondage: (id: string, compte: string, version: number, catalogue: number, maintenant: number) =>
        mesurer('verifierSondage', 'SELECT', 'carriere_ligues', [id, compte, version, catalogue], () => {
          const l = ligues.get(id);
          if (!l || !l.comptes.includes(compte)) return { statut: 'absente' as const };
          if (l.etatVersion === version && l.catalogue === catalogue && l.echeance !== null && l.echeance > maintenant) return { statut: 'inchange' as const };
          return { statut: 'lire' as const, entete: entete(l) };
        }),
      verifierCommande: (id: string, compte: string, requete: string, connue?: { version: number; comptes: string[] }) =>
        mesurer('verifierCommande', 'SELECT', 'carriere_ligues', [id, compte, requete], () => {
          const l = ligues.get(id);
          if (!l) return null;
          return { version: l.etatVersion, comptes: l.etatVersion === connue?.version ? connue.comptes : l.comptes,
            echeance: l.echeance, dejaTraitee: recus.has(`${id}|${compte}|${requete}`) };
        }),
      dejaTraitee: (id: string, compte: string, requete: string) =>
        mesurer('dejaTraitee', 'SELECT', 'carriere_commandes', [id, compte, requete], () => recus.has(`${id}|${compte}|${requete}`)),
      async ligue(id: string) {
        const debut = performance.now();
        const l = ligues.get(id);
        // L'état entier revient de la base : c'est LA lecture chère.
        releve.noter('ligue (état entier)', 'SELECT', 'carriere_ligues', 100, l ? Buffer.byteLength(l.json) : 0);
        const r = l ? { id: l.id, code: l.code, version: l.version, comptes: l.comptes, etat: JSON.parse(l.json) as EtatCarriereEnLigne, echeance: l.echeance } : null;
        releve.tempsBase += performance.now() - debut;
        return r;
      },
      async creerLigue(l: LigueStockee) {
        const json = JSON.stringify(l.etat);
        ligues.set(l.id, { id: l.id, code: l.code, version: l.version, comptes: l.comptes, json,
          etatVersion: l.etat.version, catalogue: l.etat.catalogueRevision ?? 0, echeance: echeanceLigue(l.etat, Date.now()) });
        return true;
      },
      async comparerEtEcrire(l: LigueStockee, version: number, recu?: { compte: string; requete: string }) {
        const debut = performance.now();
        const ligne = ligues.get(l.id);
        const cle = recu ? `${l.id}|${recu.compte}|${recu.requete}` : '';
        if (!ligne || ligne.version !== version || (recu && recus.has(cle))) {
          releve.noter('comparerEtEcrire (refusée)', 'UPDATE', 'carriere_ligues', 200, 10);
          releve.tempsBase += performance.now() - debut;
          return false;
        }
        const json = JSON.stringify(l.etat);
        // D'où vient l'écriture : quels champs des matchs en cours ont changé.
        const avant = JSON.parse(ligne.json) as EtatCarriereEnLigne;
        const raisons = new Set<string>();
        for (const r of l.etat.rencontres) {
          const a = avant.rencontres.find((x) => x.id === r.id);
          if (!a) { raisons.add('rencontre créée'); continue; }
          if (Boolean(a.match) !== Boolean(r.match)) raisons.add('coup d’envoi');
          else if (a.match && r.match) {
            const ma = a.match as unknown as Record<string, unknown>, mr = r.match as unknown as Record<string, unknown>;
            for (const k of new Set([...Object.keys(ma), ...Object.keys(mr)])) {
              if (['horloge', 'essais', 'penalites', 'fil', 'stats'].includes(k)) continue;
              if (JSON.stringify(ma[k]) !== JSON.stringify(mr[k])) raisons.add(`match.${k}`);
            }
          }
          if (Boolean(a.resultat) !== Boolean(r.resultat)) raisons.add('résultat');
        }
        if (!raisons.size) raisons.add('hors match');
        const motif = [...raisons].sort().join(' + ');
        causes.set(motif, (causes.get(motif) ?? 0) + 1);
        ligne.json = json; ligne.version = version + 1; ligne.comptes = l.comptes;
        ligne.etatVersion = l.etat.version; ligne.catalogue = l.etat.catalogueRevision ?? 0;
        ligne.echeance = echeanceLigue(l.etat, Date.now());
        prochaineEcheanceMatch(l.etat, Date.now());
        if (recu) recus.add(cle);
        releve.noter('comparerEtEcrire (état entier)', 'UPDATE', 'carriere_ligues', Buffer.byteLength(json), 10);
        if (recu) releve.noter('comparerEtEcrire → reçu', 'INSERT', 'carriere_commandes', 120, 0);
        releve.tempsBase += performance.now() - debut;
        return true;
      },
      rafraichirEcheance: (id: string, echeance: number) => mesurer('rafraichirEcheance', 'UPDATE', 'carriere_ligues', [id, echeance], () => {
        const l = ligues.get(id); if (l) l.echeance = echeance;
      }),
      marquerPresence: (ligue: string, match: string, compte: string, maintenant: number) =>
        mesurer('marquerPresence', 'INSERT', 'carriere_presences', [ligue, match, compte, maintenant], () => {
          presences.set(`${ligue}|${match}|${compte}`, { ligue, match, compte, vu: maintenant });
          return true;
        }),
      presencesActives: (ligue: string, depuis: number) => mesurer('presencesActives', 'SELECT', 'carriere_presences', [ligue, depuis], () =>
        [...presences.values()].filter((p) => p.ligue === ligue && p.vu >= depuis).map((p) => ({ match: p.match, compte: p.compte, vu: p.vu }))),
      nettoyerPresences: async () => {},
      actives: async () => [],
    } as unknown as StockageCarriere;
  };
  return { instance, comptes, sessions, ligues, causes, reglages };
}

