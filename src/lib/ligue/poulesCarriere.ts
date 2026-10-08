import { qualifiesPlayoffsEnLigne, tableauPlayoffs } from '../competitionRules.js';

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

/**
 * Phase finale d'un championnat : 4 clubs → 2 qualifiés, 6 → 4, 8 → 4, 10 → 6, 16 et plus → 8.
 * La définition vit dans le règlement (`qualifiesPlayoffsEnLigne`) : le serveur, le tableau et le classement la lisent.
 */
export function nombreQualifiesPlayoffs(clubs: number): number {
  return qualifiesPlayoffsEnLigne(clubs);
}

/** Matchs par tour d'une phase finale à `qualifies` clubs : six qualifiés → 2 barrages, 2 demi-finales, 1 finale. */
export function toursPlayoffs(qualifies: number): number[] {
  return tableauPlayoffs(qualifies).tours;
}

export interface TourPlayoffs {
  /** Les affiches du prochain tour : le mieux classé reçoit. Vide quand le champion est connu. */
  paires: { domicile: string; exterieur: string }[];
  /** Le dernier club en lice, une fois la finale jouée. */
  champion?: string;
}

/**
 * LE PROCHAIN TOUR D'UNE PHASE FINALE, déduit de deux faits : l'ordre des qualifiés au classement régulier, et ceux
 * qui ont déjà perdu.
 *
 * ⚠️ ON NE SE FIE NI AU NUMÉRO DU TOUR NI AU NOMBRE D'AFFICHES DU TOUR PRÉCÉDENT. Apparier « les vainqueurs du dernier
 * tour » oubliait les exemptés d'un tableau à six : les deux vainqueurs des barrages se seraient retrouvés en finale,
 * sans que le premier ni le deuxième aient joué. Ici, tant qu'il reste plus de clubs qu'une puissance de deux, les
 * moins bien classés jouent un barrage ; ensuite le premier rencontre le dernier, le deuxième l'avant-dernier.
 */
export function prochainTourPlayoffs(qualifies: readonly string[], elimines: ReadonlySet<string>): TourPlayoffs {
  const vivants = qualifies.filter(id => !elimines.has(id));
  if (vivants.length <= 1) return { paires: [], champion: vivants[0] };
  const plein = 2 ** Math.floor(Math.log2(vivants.length));
  const barrages = vivants.length - plein;
  const enLice = barrages ? vivants.slice(vivants.length - 2 * barrages) : vivants;
  return {
    paires: Array.from({ length: enLice.length / 2 }, (_, i) => ({ domicile: enLice[i], exterieur: enLice[enLice.length - 1 - i] })),
  };
}
