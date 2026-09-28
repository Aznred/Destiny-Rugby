/** Taille du tableau final : finale, demi-finales ou quarts selon l'effectif. */
export function nombreQualifiesPoules(nombre: number): 2 | 4 | 8 {
  return nombre >= 9 ? 8 : nombre >= 4 ? 4 : 2;
}

/**
 * Des poules de trois à quatre clubs quand c'est possible. La distribution en
 * serpentin évite de mettre tous les mieux classés dans le même groupe.
 */
export function repartirPoules(participants: readonly string[]): string[][] {
  const qualifies = nombreQualifiesPoules(participants.length);
  const nombrePoules = Math.min(Math.max(1, Math.ceil(participants.length / 4)), qualifies);
  const poules = Array.from({ length: nombrePoules }, () => [] as string[]);
  const tailles = poules.map((_, index) => Math.floor(participants.length / nombrePoules) + (index < participants.length % nombrePoules ? 1 : 0));
  let participant = 0;
  for (let ligne = 0; participant < participants.length; ligne++) {
    const ordre = Array.from({ length: nombrePoules }, (_, index) => ligne % 2 ? nombrePoules - 1 - index : index);
    for (const groupe of ordre) {
      if (poules[groupe].length < tailles[groupe] && participant < participants.length) poules[groupe].push(participants[participant++]);
    }
  }
  return poules;
}

export function estPuissanceDeDeux(nombre: number): boolean {
  return nombre >= 2 && (nombre & (nombre - 1)) === 0;
}
/** Tableau de phase finale : de la finale directe jusqu'aux seizièmes (32 clubs). */
export function nombreQualifiesPlayoffs(clubs: number): number {
  if (!Number.isFinite(clubs) || clubs < 2) return 0;
  return 2 ** Math.floor(Math.log2(Math.min(32, Math.floor(clubs))));
}
