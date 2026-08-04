// LE PLAN DE MARQUE — comment atteindre EXACTEMENT le score de la ligue.
//
// ⚠️ Le choix d'architecture le plus important du moteur. Le score final vient
// de `jouerRencontre` (lib/championnat.ts) : c'est lui qui alimente le
// classement, les montées, les coupes et toute la saison. Si le moteur marquait
// librement, regarder son match donnerait un résultat différent de celui inscrit
// au classement — et c'est exactement ce qui produisait des 248-207.
//
// On décompose donc le score visé en ÉVÉNEMENTS DE RUGBY plausibles (essais
// transformés, essais secs, pénalités), et le moteur choisit librement QUAND et
// COMMENT chacun tombe. La ligue décide combien, le terrain décide le reste.

export interface Decomposition {
  essaisTransformes: number;
  essaisSecs: number;
  penalites: number;
}

// Proportions du rugby professionnel : ~6,6 points par essai marqué (essais
// transformés à ~72 %), et 3 à 4 pénalités par équipe et par match.
const POINTS_PAR_ESSAI = 6.6;
const PART_PENALITES = 0.22;

export function decomposer(total: number, rng: () => number): Decomposition {
  if (total <= 0) return { essaisTransformes: 0, essaisSecs: 0, penalites: 0 };

  const essaisAttendus = total / POINTS_PAR_ESSAI;
  const penalitesAttendues = (total * PART_PENALITES) / 3;

  let meilleur: Decomposition = { essaisTransformes: 0, essaisSecs: 0, penalites: 0 };
  let meilleurCout = Infinity;

  for (let a = 0; a * 7 <= total; a++) {
    for (let b = 0; a * 7 + b * 5 <= total; b++) {
      const reste = total - a * 7 - b * 5;
      if (reste % 3 !== 0) continue;
      const c = reste / 3;
      const essais = a + b;

      let cout = Math.abs(essais - essaisAttendus) * 1.15
        + Math.abs(c - penalitesAttendues) * 1.0;
      // Un essai sur quatre n'est pas transformé : au-delà, ça sonne faux.
      if (essais > 0) cout += Math.abs(b / essais - 0.20) * 3.6;
      // ⚠️ Trois pénalités par match, c'est déjà beaucoup — et surtout, au-delà
      // le moteur n'obtient pas assez de fautes À PORTÉE pour les inscrire, et
      // les points finissaient soldés à la sirène. Mesuré : 45 pénalités non
      // tentées sur 30 matchs avant ce garde-fou.
      if (c > 3) cout += (c - 3) * 2.6;
      if (c > 5) cout += (c - 5) * 4;
      // Un match sans le moindre essai au-delà de 15 points est très rare.
      if (essais === 0 && total >= 15) cout += 6;

      cout += rng() * 0.55; // départage : deux décompositions crédibles alternent
      if (cout < meilleurCout) { meilleurCout = cout; meilleur = { essaisTransformes: a, essaisSecs: b, penalites: c }; }
    }
  }
  return meilleur;
}

// Vérifie qu'un total est atteignable avec des 7, des 5 et des 3.
export function atteignable(total: number): boolean {
  if (total < 0) return false;
  if (total === 0) return true;
  for (let a = 0; a * 7 <= total; a++) {
    for (let b = 0; a * 7 + b * 5 <= total; b++) {
      if ((total - a * 7 - b * 5) % 3 === 0) return true;
    }
  }
  return false;
}
