// LE MARCHÉ DES COMBINAISONS, CÔTÉ ÉCRAN — les appels, et la « méta » que lisent les clubs sans entraîneur.
//
// ⚠️ L'écran n'envoie jamais une statistique : elles sortent du moteur du serveur, à la fin des matchs.
// ⚠️ LA MÉTA NE BLOQUE RIEN : elle est lue au repos, gardée six heures sur l'appareil, et un match solo se sert de ce
// qu'il a déjà — sans réseau, sans table ou sans combinaison éprouvée, les clubs jouent comme avant.

import type { Combinaison } from './ligue/combinaisons';
import type { DetailPublie, DifficulteCombinaison, MetaCombinaison, MotifSignalement, RefusPublication, ResumePublie, TypeCombinaison } from './ligue/marcheCombinaisons';

export class ErreurMarche extends Error {
  readonly statut: number;
  /** La raison d'un refus de publication, quand le serveur en donne une. */
  readonly refus?: RefusPublication | 'note' | 'signalement';
  constructor(statut: number, message: string, refus?: ErreurMarche['refus']) { super(message); this.statut = statut; this.refus = refus; }
}

async function appel<T>(chemin: string, corps?: unknown): Promise<T> {
  const r = await fetch(`/api/carriere${chemin}`, corps === undefined ? { credentials: 'include' } : {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
  });
  const donnees = await r.json().catch(() => ({})) as T & { erreur?: string; refus?: ErreurMarche['refus'] };
  if (!r.ok) throw new ErreurMarche(r.status, donnees.erreur ?? '', donnees.refus);
  return donnees;
}
const action = <T>(corps: Record<string, unknown>) => appel<T>('?action=marcheCombinaisons', { action: 'marcheCombinaisons', ...corps });

export interface SaisieMarche { plan: Combinaison; nom: string; description: string; type: TypeCombinaison; difficulte: DifficulteCombinaison; note?: string; publication?: string }
/** Ce que l'écran du marché sait faire. L'aperçu local en fournit une version sans réseau. */
export interface ApiMarche {
  liste(): Promise<ResumePublie[]>;
  detail(id: string): Promise<DetailPublie>;
  publier(saisie: SaisieMarche): Promise<DetailPublie>;
  ajouter(id: string): Promise<DetailPublie>;
  noter(id: string, note: number): Promise<DetailPublie>;
  signaler(id: string, motif: MotifSignalement): Promise<DetailPublie>;
  retirer(id: string): Promise<DetailPublie>;
  retablir(id: string): Promise<DetailPublie>;
}
export const apiMarche: ApiMarche = {
  liste: async () => (await appel<{ fiches: ResumePublie[] }>('?marcheCombinaisons=1')).fiches,
  detail: async id => (await appel<{ detail: DetailPublie }>(`?marcheCombinaisons=${encodeURIComponent(id)}`)).detail,
  publier: async saisie => (await action<{ detail: DetailPublie }>({ operation: 'publier', ...saisie })).detail,
  ajouter: async id => (await action<{ detail: DetailPublie }>({ operation: 'ajouter', id })).detail,
  noter: async (id, note) => (await action<{ detail: DetailPublie }>({ operation: 'noter', id, note })).detail,
  signaler: async (id, motif) => (await action<{ detail: DetailPublie }>({ operation: 'signaler', id, motif })).detail,
  retirer: async id => (await action<{ detail: DetailPublie }>({ operation: 'retirer', id })).detail,
  retablir: async id => (await action<{ detail: DetailPublie }>({ operation: 'retablir', id })).detail,
};

// ── La méta, pour les clubs sans entraîneur ────────────────────────────────────────────────────────────────────────

const CLE_META = 'destiny-rugby:meta-combinaisons';
const FRAICHEUR_META = 6 * 3_600_000;
let meta: MetaCombinaison[] | null = null;
let demande: Promise<void> | undefined;

function relire(): { le: number; meta: MetaCombinaison[] } | null {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_META) ?? 'null') as { le?: number; meta?: MetaCombinaison[] } | null;
    return brut && typeof brut.le === 'number' && Array.isArray(brut.meta) ? { le: brut.le, meta: brut.meta } : null;
  } catch { return null; }
}
/** Ce que l'appareil sait de la méta, tout de suite. Vide tant que rien n'a été lu : les clubs jouent alors comme avant. */
export function metaCombinaisons(): MetaCombinaison[] {
  if (!meta) meta = relire()?.meta ?? [];
  return meta;
}
/** Rafraîchit la méta au repos, au plus une fois toutes les six heures. Jamais d'erreur visible. */
export function chargerMetaCombinaisons(maintenant = Date.now()): Promise<void> {
  const garde = relire();
  if (garde) meta = garde.meta;
  if (garde && maintenant - garde.le < FRAICHEUR_META) return Promise.resolve();
  demande ??= fetch('/api/carriere?metaCombinaisons=1', { credentials: 'omit' })
    .then(r => (r.ok ? r.json() as Promise<{ meta?: MetaCombinaison[] }> : null))
    .then(reponse => {
      if (!reponse || !Array.isArray(reponse.meta)) return;
      meta = reponse.meta;
      try { localStorage.setItem(CLE_META, JSON.stringify({ le: maintenant, meta })); } catch { /* la méta vaut pour la visite */ }
    })
    .catch(() => { /* hors ligne : on garde ce qu'on a */ })
    .finally(() => { demande = undefined; });
  return demande;
}
/** Pour les bancs et l'aperçu : pose une méta sans réseau. */
export function definirMetaCombinaisons(liste: MetaCombinaison[]): void { meta = liste; }
