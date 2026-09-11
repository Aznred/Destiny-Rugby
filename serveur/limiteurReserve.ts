/** Réserve atomiquement quelques autorisations en base, jamais au-delà du
 * plafond global. Une instance perdue gaspille ses jetons, elle n'en crée pas. */
export function creerLimiteurReserve(reserver: (cle: string, maximum: number, debut: number, lot: number) => Promise<number>) {
  const caches = new Map<string, { debut: number; maximum: number; restants: number; file: Promise<void> }>();
  return async (cle: string, maximum: number, fenetre: number, maintenant: number) => {
    const debut = Math.floor(maintenant / fenetre) * fenetre;
    let cache = caches.get(cle);
    if (!cache || cache.debut !== debut || cache.maximum !== maximum) {
      cache = { debut, maximum, restants: 0, file: Promise.resolve() };
      caches.delete(cle); caches.set(cle, cache);
      if (caches.size > 4096) caches.delete(caches.keys().next().value!);
    }
    const courant = cache;
    const resultat = courant.file.then(async () => {
      // Une requête en attente ne peut pas consommer un jeton de la fenêtre
      // précédente après avoir franchi la limite de minute.
      if (Math.floor(Date.now() / fenetre) * fenetre !== debut) return false;
      if (!courant.restants) courant.restants = await reserver(cle, maximum, debut, Math.min(4, maximum));
      if (!courant.restants) return false;
      courant.restants--; return true;
    });
    courant.file = resultat.then(() => {}, () => {});
    return resultat;
  };
}
