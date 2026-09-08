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
