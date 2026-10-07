import { COMPETITIONS, clubParNom } from '../data/clubs.js';
import { coordonneesValides, haversine, rivalitesHistoriques, localisationDeReference } from './localisationClub.js';
import { cleClub } from './cleClub.js';

export function verifierDonneesClubs() {
  const clubs = [...new Set(COMPETITIONS.flatMap(c => c.clubs.map(c => c.nom)))].map(nom => clubParNom(nom)!);
  const points = new Map<string, string[]>();
  for (const c of clubs) if (coordonneesValides(c)) {
    const cle = `${c.latitude},${c.longitude}`;
    points.set(cle, [...(points.get(cle) ?? []), c.nom]);
  }
  return clubs.map(c => {
    const alertes: string[] = [];
    if (!coordonneesValides(c)) alertes.push('Coordonnées manquantes ou invalides');
    if (coordonneesValides(c) && (points.get(`${c.latitude},${c.longitude}`)?.length ?? 0) > 1) alertes.push('Plusieurs clubs exactement aux mêmes coordonnées');
    if (!c.ville?.trim() || /CEDEX|\//i.test(c.ville)) alertes.push('Commune ambiguë : adresse postale ou plusieurs villes');
    const reference = localisationDeReference(c.nom);
    if (reference?.ville && c.ville && cleClub(reference.ville) !== cleClub(c.ville)) alertes.push(`Ville différente de la référence officielle : ${reference.ville}`);
    if (reference?.pays && c.pays && cleClub(reference.pays) !== cleClub(c.pays)) alertes.push(`Pays incompatible avec la référence officielle : ${reference.pays}`);
    if (!c.region || !c.pays) alertes.push('Région ou pays manquant');
    if (!c.sourceLocalisation || c.precisionLieu === 'fallback') alertes.push('Donnée obtenue uniquement par fallback');
    if (c.precisionLieu === 'commune') alertes.push('Position de commune : stade ou siège sportif à confirmer');
    const latVille = c.latitudeVille ?? reference?.latitude, lonVille = c.longitudeVille ?? reference?.longitude;
    if (coordonneesValides(c) && typeof latVille === 'number' && typeof lonVille === 'number'
      && haversine(c.latitude!, c.longitude!, latVille, lonVille) > 25) alertes.push('Distance importante entre ville de référence et stade');
    return { ...c, alertes };
  });
}
const distances = new Map<string, number>();
/** Inclure les coordonnées dans la clé invalide une ancienne distance après correction. */
export function distanceEntreClubs(nomA: string, nomB: string): number | null {
  const a = clubParNom(nomA), b = clubParNom(nomB);
  if (!a || !b || !coordonneesValides(a) || !coordonneesValides(b) || !a.sourceLocalisation || !b.sourceLocalisation
    || a.precisionLieu === 'fallback' || b.precisionLieu === 'fallback') return null;
  const cle = [`${a.nom}:${a.latitude},${a.longitude}`, `${b.nom}:${b.latitude},${b.longitude}`].sort().join('|');
  const memo = distances.get(cle);
  if (memo !== undefined) return memo;
  const distance = Math.round(haversine(a.latitude!, a.longitude!, b.latitude!, b.longitude!) * 10) / 10;
  if (distances.size > 5000) distances.clear();
  distances.set(cle, distance);
  return distance;
}
export function derbyGeographique(nomA: string, nomB: string) {
  const a = clubParNom(nomA), b = clubParNom(nomB);
  const distance = distanceEntreClubs(nomA, nomB);
  const historique = cleClub(nomA) !== cleClub(nomB) && rivalitesHistoriques().some(r => [cleClub(r.clubA), cleClub(r.clubB)].sort().join('|') === [cleClub(nomA), cleClub(nomB)].sort().join('|'));
  const fiable = a && b && a.pays === b.pays && a.ville && b.ville && !/CEDEX|\//i.test(a.ville + b.ville)
    && (distance !== 0 || (a.statutGeographique === 'verifie' && b.statutGeographique === 'verifie'));
  const type = cleClub(nomA) === cleClub(nomB) ? null : historique ? 'historique' as const
    : fiable && distance !== null && distance <= 30 ? 'local' as const
      : fiable && distance !== null && distance <= 150 && !!a.region && cleClub(a.region) === cleClub(b.region ?? '') ? 'regional' as const : null;
  const intensite = type === 'local' || type === 'historique' ? 2 : type === 'regional' ? 1 : 0;
  return { derby: type !== null, distance, type, libelle: type === 'historique' ? 'Rivalité historique' : type === 'local' ? 'Derby local' : type === 'regional' ? 'Derby régional' : '',
    motivation: 0, pression: intensite * 6, medias: intensite * 8 };
}
