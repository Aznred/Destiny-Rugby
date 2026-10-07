import { createJSONStorage, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { cleDe, emplacementActif, stockageParEmplacement } from './sauvegardes';

/** Les projections coûteuses ne sont refaites que si leurs sources changent. */
export function projectionMemoisee<T extends object, P extends object>(projeter: (s: T) => P): (s: T) => P {
  let precedent: T | undefined, projection: P | undefined;
  let cles: (keyof T)[] = [];
  return (s) => {
    if (precedent && projection && cles.every(k => s[k] === precedent![k])) {
      precedent = s;
      // La navigation est légère et indépendante du contenu de la carrière.
      projection = { ...projection, ecransVus: (s as T & { ecransVus?: unknown }).ecransVus };
      return projection;
    }
    projection = projeter(s);
    precedent = s;
    cles = Object.keys(projection).filter(k => k !== 'ecransVus') as (keyof T)[];
    return projection;
  };
}

// ── UNE SEULE ÉCRITURE POUR TOUTE UNE FIN DE MATCH (Correctif 26) ────────────────────────────────────────────────
// `persist` réécrit la sauvegarde à CHAQUE `set()` : toute la carrière repasse par `JSON.stringify` puis par
// `localStorage.setItem`, qui est synchrone. À la sirène le store reçoit le résultat, les statistiques, la sanction,
// les succès, puis la semaine suivante : six à dix sérialisations complètes dans la même image, plusieurs centaines
// de millisecondes sur un téléphone, scène 3D encore ouverte. Pendant une suspension, seule la DERNIÈRE photo est
// gardée ; elle est écrite une fois, à la reprise.
// ⚠️ Rien ne se perd si l'onglet se ferme : la page qui passe en arrière-plan écrit tout de suite ce qui attend, et
// une suspension oubliée se lève seule au bout de quatre secondes.
let suspensions = 0;
let ecritureEnAttente: (() => void) | null = null;
let ecrituresEvitees = 0;
const ecrireCeQuiAttend = () => { const ecrire = ecritureEnAttente; ecritureEnAttente = null; ecrire?.(); };
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', ecrireCeQuiAttend);
  if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', () => { if (document.hidden) ecrireCeQuiAttend(); });
}

/** Suspend les écritures de la sauvegarde. Rend la fonction qui les reprend (un second appel ne fait rien). */
export function suspendreEcritures(): () => void {
  suspensions++;
  let rendue = false;
  const reprendre = () => {
    if (rendue) return;
    rendue = true;
    clearTimeout(garde);
    if (--suspensions <= 0) { suspensions = 0; ecrireCeQuiAttend(); }
  };
  const garde = setTimeout(reprendre, 4000);
  return reprendre;
}

/** Diagnostic et banc : combien de sérialisations complètes une suspension a épargnées. */
export function ecrituresEpargnees(): number { return ecrituresEvitees; }

/** Aucune temporisation : les achats restent sauvegardés immédiatement. */
export function stockageCarriereOptimise<T extends object>(): PersistStorage<T> {
  const brut = stockageParEmplacement();
  const json = createJSONStorage<T>(() => brut)!;
  const dernier = new Map<string, StorageValue<T>>();
  const cle = () => cleDe(emplacementActif());
  const ecrire = (nom: string, valeur: StorageValue<T>) => {
    const avant = dernier.get(cle());
    const entree = valeur.state as Record<string, unknown>;
    const identique = !!avant && avant.version === valeur.version && Object.keys(entree)
      .every(k => k === 'ecransVus' || entree[k] === (avant.state as Record<string, unknown>)[k]);
    if (!identique) json.setItem(nom, valeur);
    if (!avant || entree.ecransVus !== (avant.state as Record<string, unknown>).ecransVus) {
      brut.setItem(`${cle()}:navigation`, JSON.stringify(entree.ecransVus ?? []));
    }
    dernier.set(cle(), valeur);
  };
  return {
    getItem(nom) {
      const valeur = json.getItem(nom) as StorageValue<T> | null;
      if (valeur) {
        try {
          const navigation = JSON.parse(brut.getItem(`${cle()}:navigation`) ?? 'null');
          if (Array.isArray(navigation) && navigation.every(v => typeof v === 'string')) {
            valeur.state = { ...valeur.state, ecransVus: navigation };
          }
        } catch { /* La carrière reste lisible si le petit cache est invalide. */ }
        dernier.set(cle(), valeur);
      }
      return valeur;
    },
    setItem(nom, valeur) {
      if (suspensions > 0) {
        if (ecritureEnAttente) ecrituresEvitees++;
        // La photo appartient à L'EMPLACEMENT où elle a été prise : jamais écrite dans une autre partie ouverte entre-temps.
        const emplacement = cle();
        ecritureEnAttente = () => { if (cle() === emplacement) ecrire(nom, valeur); };
        return;
      }
      ecrire(nom, valeur);
    },
    removeItem(nom) {
      // Effacer une partie annule ce qui attendait : une écriture tardive la ferait renaître.
      ecritureEnAttente = null;
      dernier.delete(cle()); brut.removeItem(`${cle()}:navigation`); json.removeItem(nom);
    },
  };
}
