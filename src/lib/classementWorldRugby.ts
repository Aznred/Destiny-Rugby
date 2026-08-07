// Formule d'échange de points du classement World Rugby.
//
// Le système est à somme nulle : chaque centième gagné par une sélection est
// perdu par l'autre. L'écart utilisé dans la formule est borné à ±10, après
// ajout de trois points à l'équipe qui reçoit. Une victoire de l'équipe mieux
// notée rapporte donc peu ; un exploit de l'outsider rapporte beaucoup.

export interface MatchWorldRugby {
  noteDomicile: number;
  noteExterieur: number;
  scoreDomicile: number;
  scoreExterieur: number;
  terrainNeutre?: boolean;
  coupeDuMonde?: boolean;
}

export interface EchangeWorldRugby {
  variationDomicile: number;
  variationExterieur: number;
  ecartCorrige: number;
  coefficient: number;
}

const borner = (valeur: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, valeur));

const centieme = (valeur: number) => Math.round((valeur + Number.EPSILON) * 100) / 100;

export function echangeWorldRugby(match: MatchWorldRugby): EchangeWorldRugby {
  const avantageDomicile = match.terrainNeutre ? 0 : 3;
  const ecartCorrige = borner(
    match.noteDomicile + avantageDomicile - match.noteExterieur,
    -10,
    10,
  );

  let variationDomicile: number;
  if (match.scoreDomicile === match.scoreExterieur) {
    // Un nul transfère des points de l'équipe théoriquement la plus forte vers
    // la plus faible. Si les notes corrigées sont égales, personne ne bouge.
    variationDomicile = -ecartCorrige / 10;
  } else if (match.scoreDomicile > match.scoreExterieur) {
    variationDomicile = 1 - ecartCorrige / 10;
  } else {
    variationDomicile = -(1 + ecartCorrige / 10);
  }

  const coefficientMarge = Math.abs(match.scoreDomicile - match.scoreExterieur) > 15 ? 1.5 : 1;
  const coefficientMondial = match.coupeDuMonde ? 2 : 1;
  const coefficient = coefficientMarge * coefficientMondial;
  // Le document de référence applique les coefficients à l'échange annoncé au
  // centième : dans son exemple, 0,64 × 1,5 donne bien 0,96 (et non 0,97).
  const brute = centieme(centieme(variationDomicile) * coefficient);

  // Les notes restent sur l'échelle 0–100 sans détruire la somme nulle : on
  // borne la variation elle-même selon la place encore disponible des deux
  // côtés, puis l'extérieur reçoit strictement l'opposé.
  const minimum = Math.max(-match.noteDomicile, match.noteExterieur - 100);
  const maximum = Math.min(100 - match.noteDomicile, match.noteExterieur);
  const variationBornee = centieme(borner(brute, minimum, maximum));

  return {
    variationDomicile: variationBornee,
    variationExterieur: -variationBornee,
    ecartCorrige: centieme(ecartCorrige),
    coefficient,
  };
}

export function appliquerEchangeWorldRugby(match: MatchWorldRugby): {
  noteDomicile: number;
  noteExterieur: number;
  echange: EchangeWorldRugby;
} {
  const echange = echangeWorldRugby(match);
  return {
    noteDomicile: centieme(match.noteDomicile + echange.variationDomicile),
    noteExterieur: centieme(match.noteExterieur + echange.variationExterieur),
    echange,
  };
}
