const normaliser = (nom: string) => nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Appellations des sources LNR et noms employés dans l'annuaire du jeu.
const ALIASES = new Map([
  ['asmclermont', 'asmclermontauvergne'],
  ['colomiersrugby', 'uscolomiers'],
  ['lourugby', 'lyonou'],
  ['montpellierheraultrugby', 'montpellierhr'],
  ['nissarugby', 'stadenicois'],
  ['rcnarbonnais', 'rcnarbonne'],
  ['biarritzolympiquepb', 'biarritzolympique'],
  ['fcgrenoblerugby', 'fcgrenoble'],
  ['oyonnaxrugby', 'usoyonnax'],
  ['valenceromans', 'valenceromansdromerugby'],
]);

/** Une identité commune pour l'effectif et l'écusson, indépendamment de l'orthographe de la source. */
export const cleClub = (nom: string): string => ALIASES.get(normaliser(nom)) ?? normaliser(nom);
