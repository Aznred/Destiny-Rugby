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

/** Aucune temporisation : les achats restent sauvegardés immédiatement. */
export function stockageCarriereOptimise<T extends object>(): PersistStorage<T> {
  const brut = stockageParEmplacement();
  const json = createJSONStorage<T>(() => brut)!;
  const dernier = new Map<string, StorageValue<T>>();
  const cle = () => cleDe(emplacementActif());
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
      const avant = dernier.get(cle());
      const entree = valeur.state as Record<string, unknown>;
      const identique = !!avant && avant.version === valeur.version && Object.keys(entree)
        .every(k => k === 'ecransVus' || entree[k] === (avant.state as Record<string, unknown>)[k]);
      if (!identique) json.setItem(nom, valeur);
      if (!avant || entree.ecransVus !== (avant.state as Record<string, unknown>).ecransVus) {
        brut.setItem(`${cle()}:navigation`, JSON.stringify(entree.ecransVus ?? []));
      }
      dernier.set(cle(), valeur);
    },
    removeItem(nom) {
      dernier.delete(cle()); brut.removeItem(`${cle()}:navigation`); json.removeItem(nom);
    },
  };
}
