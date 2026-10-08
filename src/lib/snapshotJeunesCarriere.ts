import type { PageJeunesFfr, SourceJeuneFfr } from './jeunesFfr.js';

/** Le vivier volumineux vit dans IndexedDB, hors des six emplacements localStorage. */
export interface SnapshotJeunesCarriere {
  id: string;
  version: string;
  referenceDate: string;
  sources: SourceJeuneFfr[];
}
const memoire = new Map<string, SnapshotJeunesCarriere>();
const chargements = new Map<string, Promise<SnapshotJeunesCarriere>>();

function baseLocale(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open('destiny-rugby:jeunes-carriere', 1);
    requete.onupgradeneeded = () => requete.result.createObjectStore('snapshots', { keyPath: 'id' });
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(new Error('Le stockage du vivier est indisponible.'));
  });
}

export async function lireSnapshotJeunes(id: string): Promise<SnapshotJeunesCarriere | undefined> {
  if (memoire.has(id)) return memoire.get(id);
  if (typeof indexedDB === 'undefined') return undefined;
  const base = await baseLocale();
  try {
    const snapshot = await new Promise<SnapshotJeunesCarriere | undefined>((resolve, reject) => {
      const requete = base.transaction('snapshots').objectStore('snapshots').get(id);
      requete.onsuccess = () => resolve(requete.result);
      requete.onerror = () => reject(new Error('Le vivier sauvegardé ne peut pas être relu.'));
    });
    if (snapshot) memoire.set(id, snapshot);
    return snapshot;
  } finally { base.close(); }
}

export async function conserverSnapshotJeunes(snapshot: SnapshotJeunesCarriere): Promise<void> {
  if (typeof indexedDB !== 'undefined') {
    const base = await baseLocale();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = base.transaction('snapshots', 'readwrite');
        transaction.objectStore('snapshots').put(snapshot);
        transaction.oncomplete = () => resolve();
        transaction.onerror = transaction.onabort = () => reject(new Error('Le vivier ne peut pas être sauvegardé sur cet appareil.'));
      });
    } finally { base.close(); }
  } else if (typeof window !== 'undefined') {
    throw new Error('Ce navigateur ne permet pas de sauvegarder le vivier de carrière.');
  }
  memoire.set(snapshot.id, snapshot);
}

/** Aucun remplacement par la version courante lorsque la sauvegarde épingle une ancienne version. */
export function chargerSnapshotJeunes(id: string, version?: string): Promise<SnapshotJeunesCarriere> {
  const enCours = chargements.get(id);
  if (enCours) return enCours;
  const travail = (async () => {
    const conserve = await lireSnapshotJeunes(id);
    if (conserve) {
      if (version && conserve.version !== version) throw new Error('La version du vivier sauvegardé ne correspond pas à cette carrière.');
      return conserve;
    }
    const sources: SourceJeuneFfr[] = [];
    const identites = new Set<string>();
    let versionFigee = version;
    let referenceDate = '';
    let apres: string | null = null;
    let total = -1;
    do {
      const params = new URLSearchParams({ jeunesCarriere: '1', limit: '2000' });
      if (versionFigee) params.set('version', versionFigee);
      if (apres) params.set('after', apres);
      const reponse = await fetch(`/api/carriere?${params}`, { credentials: 'same-origin', cache: 'no-store' });
      if (!reponse.ok) throw new Error(reponse.status === 401
        ? 'Connecte ton compte pour charger le vivier FFR de cette carrière.'
        : 'Le vivier FFR de cette carrière est temporairement indisponible.');
      const page = await reponse.json() as PageJeunesFfr;
      if (!page.version || !Array.isArray(page.joueurs) || !Number.isSafeInteger(page.total) || page.total < 0
        || (versionFigee && versionFigee !== page.version)
        || (total >= 0 && total !== page.total)) throw new Error('Le vivier a changé pendant son chargement. Réessaie.');
      versionFigee = page.version;
      total = page.total;
      referenceDate = page.referenceDate;
      for (const joueur of page.joueurs) {
        if (!joueur.id || identites.has(joueur.id)) throw new Error('Le vivier contient une identité en double.');
        identites.add(joueur.id);
        sources.push(joueur);
      }
      if (page.next && (page.next === apres || !page.joueurs.length)) throw new Error('Le chargement du vivier ne progresse plus.');
      apres = page.next;
    } while (apres);
    if (sources.length !== total) throw new Error('Le vivier chargé est incomplet. Réessaie.');
    const snapshot: SnapshotJeunesCarriere = { id, version: versionFigee!, referenceDate, sources };
    await conserverSnapshotJeunes(snapshot);
    return snapshot;
  })();
  chargements.set(id, travail);
  void travail.finally(() => chargements.delete(id)).catch(() => {});
  return travail;
}
