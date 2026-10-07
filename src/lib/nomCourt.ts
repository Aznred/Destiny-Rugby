// LE NOM COURT D'UNE ÉQUIPE — pour les écrans étroits (Correctif 29)
//
// Un nom trop long ne doit jamais pousser les points hors de l'écran. On abrège d'abord les formules d'usage
// (« Union Sportive » → « US », « Rugby Club » → « RC »), comme le font les tableaux d'affichage ; la mise en page
// tronque ensuite ce qui dépasserait encore.

const FORMULES: [RegExp, string][] = [
  [/\bUnion Sportive\b/gi, 'US'],
  [/\bAssociation Sportive\b/gi, 'AS'],
  [/\bRugby Club\b/gi, 'RC'],
  [/\bRacing Club\b/gi, 'RC'],
  [/\bStade Olympique\b/gi, 'SO'],
  [/\bClub Athlétique\b/gi, 'CA'],
  [/\bClub Sportif\b/gi, 'CS'],
  [/\bSporting Club\b/gi, 'SC'],
  [/\bFootball Club\b/gi, 'FC'],
  [/\bUnion Athlétique\b/gi, 'UA'],
  [/\bAvenir\b/gi, 'Av.'],
  [/\bOlympique\b/gi, 'Ol.'],
  [/\bEntente\b/gi, 'Ent.'],
  [/\bAthlétique\b/gi, 'Ath.'],
  [/\bRugby\b/gi, ''],
  [/\bSaint-/gi, 'St-'],
  [/\bSainte-/gi, 'Ste-'],
];

/** Longueur à partir de laquelle un nom mérite d'être abrégé. */
const SEUIL = 16;

export function nomCourt(nom: string): string {
  if (nom.length <= SEUIL) return nom;
  let court = nom;
  for (const [formule, sigle] of FORMULES) {
    court = court.replace(formule, sigle).replace(/\s{2,}/g, ' ').trim();
    if (court.length <= SEUIL) break;
  }
  return court || nom;
}
