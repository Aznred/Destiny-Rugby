const JOUR = 86_400_000;
const formatParis = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
});

function partiesParis(instant: number) {
  const parties = formatParis.formatToParts(instant);
  const lire = (type: string) => Number(parties.find(p => p.type === type)!.value);
  return { annee: lire('year'), mois: lire('month'), jour: lire('day'), heure: lire('hour') };
}

function soiree(date: number): number[] {
  // À midi UTC, Paris est sur le même jour et a déjà changé d'heure si nécessaire.
  const decalage = partiesParis(date + 12 * 3_600_000).heure - 12;
  return [19, 20, 21].map(heure => date + (heure - decalage) * 3_600_000);
}

/** Répartition équilibrée par soirée, indépendante du fuseau du serveur. */
export function horairesChampionnat(lancement: number, rythme: number, ronde: number, nombre: number): number[] {
  const p = partiesParis(lancement);
  let premierJour = Date.UTC(p.annee, p.mois - 1, p.jour);
  if (lancement > soiree(premierJour)[2]) premierJour += JOUR;
  const jour = premierJour + Math.floor(ronde * 7 / rythme) * JOUR;
  const creneaux = soiree(jour).filter(heure => heure >= lancement);
  return Array.from({ length: nombre }, (_, i) => creneaux[(i + ronde) % creneaux.length]);
}

/**
 * Une saison accélérée ne doit pas transformer chaque match en dette physique.
 * La base reste exigeante à un rendez-vous hebdomadaire ; chaque cran de rythme
 * rend trois points de fatigue supplémentaires entre deux rencontres.
 */
export function recuperationFatigueSelonRythme(rythme: number): number {
  const cadence = Math.max(1, Math.min(7, Math.round(rythme)));
  return 22 + (cadence - 1) * 3;
}

/**
 * Récupération passive par jour de repos entre les matchs.
 * À un rythme hebdomadaire (rythme 1), les joueurs regagnent ~5 points de fatigue
 * par jour de repos (~35 points sur 7 jours, effaçant les 24 points d'un match de 80 min).
 * Plus le rythme de la ligue est accéléré, plus la récupération par jour augmente.
 */
export function recuperationFatigueParJour(rythme: number): number {
  const cadence = Math.max(1, Math.min(7, Math.round(rythme)));
  const joursParMatch = Math.max(1, 7 / cadence);
  const total = recuperationFatigueSelonRythme(cadence);
  return Math.max(5, Math.round(total / joursParMatch));
}

/** Barème commun aux ligues privées et publiques : 24 points pour 80 minutes. */
export function coutFatigueMatchEnLigne(minutes: number): number {
  return Number.isFinite(minutes) ? Math.round(Math.max(0, Math.min(120, minutes)) * .3) : 0;
}
