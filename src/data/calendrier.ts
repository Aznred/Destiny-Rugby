// CALENDRIER D'UNE SAISON DE RUGBY
//
// La saison va d'août à juin, comme la vraie. Chaque semaine porte une date et
// un type d'évènement : journée de championnat, coupe d'Europe, fenêtre
// internationale (tournée d'automne, Tournoi, Coupe du monde), trêve, ou phase
// finale. C'est ce calendrier qui donne son rythme au mode « journée par
// journée » et qui décide QUAND les sélections tombent.
//
// Les dates sont celles d'une saison type (2025-26) : on ne gère pas les années
// bissextiles ni les décalages réels d'un exercice à l'autre — le but est de
// donner un fil crédible, pas un almanach.

import { locale, t } from '../lib/i18n';

export type TypeSemaine =
  | 'championnat'
  | 'coupe'
  | 'international'
  | 'phaseFinale'
  | 'treve';

export interface Semaine {
  numero: number; // 1 = première semaine d'août
  jour: number;
  mois: number; // 1-12
  type: TypeSemaine;
  libelle: string;
  journee?: number; // numéro de journée de championnat
  // Compétition internationale disputée cette semaine (id de COMPETITIONS_NATIONS)
  competitionInternationale?: string;
  finale?: boolean;
  // Tour de la phase finale disputé cette semaine (voir lib/phaseFinale.ts)
  tourFinal?: 'barrage' | 'demie' | 'finale' | 'acces';
}

export function libelleDate(s: Semaine): string {
  return new Intl.DateTimeFormat(locale(), {
    day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, s.mois - 1, s.jour)));
}

// ---------------------------------------------------------------------------
// L'HEURE DU JEU, PAS CELLE DE L'ORDINATEUR
// ---------------------------------------------------------------------------
// ⚠️ Retour de jeu : « sur X, dans les messages, fais que la date et l'heure
// soient celles du calendrier in-game et pas la date actuelle ». C'était le
// cas des publications (elles portent `date: libelleDate(sem)`), mais PAS des
// messages privés ni des notifications, qui affichaient `Date.now()` : on
// pouvait lire « 10 août 17:04 » sous un message reçu en pleine 12ᵉ journée,
// c'est-à-dire un mois de novembre du jeu.
//
// L'horodatage réel (`creeLe`) est conservé : il ne sert plus qu'à RANGER les
// conversations dans l'ordre. Ce qu'on AFFICHE vient d'ici.

/** « 12 oct. » — la date de cette semaine de jeu, en court. */
export function libelleDateCourte(s: Semaine): string {
  return new Intl.DateTimeFormat(locale(), {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, s.mois - 1, s.jour)));
}

/**
 * « 12 oct. · 18:42 ». L'heure est TIRÉE D'UNE GRAINE (l'identifiant du
 * message) plutôt que de l'horloge : le même message garde donc la même heure
 * à chaque ouverture de l'écran, et deux messages de la même semaine ne
 * s'affichent pas tous à la même minute.
 */
/**
 * L'heure d'un message, dans le temps du jeu.
 *
 * ⚠️ `rang` N'EST PAS UN CONFORT : SANS LUI, UNE CONVERSATION REMONTE LE TEMPS.
 * L'heure était tirée de l'identifiant du message, donc indépendante pour
 * chacun — vu à l'écran sur un échange de deux lignes : la réponse du club
 * était datée de 13:56 sous une question posée à 14:55. On sème donc sur le
 * FIL (son pseudo), pas sur le message, et chaque réplique avance de quelques
 * minutes. Deux fils gardent des heures différentes, un fil reste dans l'ordre.
 */
export function horodatageJeu(numeroSemaine: number, graine: string, rang = 0): string {
  let h = 2166136261;
  for (let i = 0; i < graine.length; i += 1) {
    h ^= graine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const tirage = (h >>> 0) / 4294967295;
  // On vit entre 8 h et 23 h : personne n'envoie un message de club à 4 h du matin.
  const depart = (8 + Math.floor(tirage * 14)) * 60 + Math.floor((tirage * 997) % 60);
  // Un pas propre au fil : deux conversations ne battent pas au même rythme.
  const pas = 2 + ((h >>> 8) % 9);
  // Borné à 23:59 : au-delà, l'échange se poursuit simplement dans la soirée.
  const total = Math.min(23 * 60 + 59, depart + rang * pas);
  const jour = libelleDateCourte(semaine(numeroSemaine));
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${jour} · ${hh}:${mm}`;
}

/**
 * Libellé destiné à l’interface. La valeur brute reste dans le calendrier pour
 * le moteur.
 *
 * ⚠️ LA SAISON EST UN PARAMÈTRE, ET ELLE COMPTE POUR UNE SEULE RAISON : une
 * saison sur quatre, la **Coupe du monde REMPLACE la tournée d’automne**
 * (`competitionsDeLaSaison` retire `autumn` cette année-là). Le calendrier, lui,
 * ne connaît qu’un libellé figé par semaine : l’écran annonçait donc
 * « Tournée d’automne » en pleine Coupe du monde — bug signalé en jeu, capture à
 * l’appui. Une semaine ne peut pas savoir seule en quelle année on est.
 *
 * Sans `saison`, le comportement ne change pas : c’est ce qui permet de ne pas
 * réécrire les huit appelants d’un coup, et les écrans qui n’ont pas de carrière
 * sous la main (la frise d’une compétition consultée) restent justes.
 */
export function libelleSemaine(s: Semaine, saison?: number): string {
  if (s.libelle === 'Reprise du championnat') return t('cal.reprise');
  if (s.libelle === 'Journée de championnat') return t('cal.journeeChamp');
  if (s.libelle === 'Journée des fêtes') return t('cal.journeeFetes');
  if (s.type === 'coupe') {
    const numero = /([1-4])(?:re|e) journée/.exec(s.libelle)?.[1];
    if (numero) return t('cal.coupeJournee', { n: numero });
  }
  if (s.competitionInternationale === 'autumn') {
    return saison != null && estAnneeDeCoupeDuMonde(saison)
      ? t('cal.coupeMonde') : t('cal.tourneeAutomne');
  }
  if (s.competitionInternationale === 'sixNations') {
    return s.finale ? t('cal.sixNationsFinale') : t('cal.sixNations');
  }
  if (s.competitionInternationale === 'worldCup') return t('cal.coupeMonde');
  if (s.competitionInternationale === 'qualifWorldCup') return t('cal.qualifMondial');
  if (s.competitionInternationale === 'friendly') return t('cal.matchAmical');
  if (s.type === 'phaseFinale') {
    return t(`cal.${s.tourFinal ?? 'phaseFinale'}`);
  }
  if (s.type === 'treve') return s.libelle;
  return s.libelle;
}

// Une saison civile de rugby : juillet → juin. Le type décrit UNIQUEMENT
// l'activité du club. Les sélections se superposent via calendrierMondial.ts.
function construire(): Semaine[] {
  const coupes = new Map(['10-10', '12-12', '1-9', '1-16', '4-3', '4-10', '5-1', '5-22']
    .map((d, i) => [d, i]));
  const finales = new Map<string, Semaine['tourFinal']>([
    ['6-5', 'barrage'], ['6-12', 'demie'], ['6-19', 'finale'], ['6-26', 'acces'],
  ]);
  let journee = 0;
  const dates: Semaine[] = Array.from({ length: 52 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 6, 4 + i * 7));
    const mois = d.getUTCMonth() + 1;
    const jour = d.getUTCDate();
    const cle = `${mois}-${jour}`;
    const coupe = coupes.get(cle);
    const tourFinal = finales.get(cle);
    const preparation = mois === 7 || (mois === 8 && jour < 29);
    const type: TypeSemaine = tourFinal ? 'phaseFinale' : coupe !== undefined ? 'coupe'
      : preparation ? 'treve' : 'championnat';
    return {
      numero: i + 1, mois, jour, type,
      libelle: tourFinal ? 'Playoffs du championnat' : coupe !== undefined
        ? ['Coupe d’Europe : 1re journée', 'Coupe d’Europe : 2e journée', 'Coupe d’Europe : 3e journée',
          'Coupe d’Europe : 4e journée', 'Coupe d’Europe, huitièmes', 'Coupe d’Europe, quarts',
          'Coupe d’Europe, demi-finales', 'Finale de la Coupe d’Europe'][coupe]
        : preparation ? 'Intersaison et préparation' : 'Journée de championnat',
      ...(type === 'championnat' ? { journee: ++journee } : {}),
      ...(tourFinal ? { tourFinal } : {}),
      ...(tourFinal === 'finale' || coupe === 7 ? { finale: true } : {}),
    };
  });
  // Clôture après le dernier match d'accès : aucun match n'est sauté.
  dates.push({ numero: 53, jour: 30, mois: 6, type: 'treve', libelle: 'Clôture de la saison' });
  return dates;
}

export const CALENDRIER: Semaine[] = construire();
export const SEMAINES_PAR_SAISON = CALENDRIER.length;
export const NB_JOURNEES = CALENDRIER.filter((s) => s.type === 'championnat').length;

export function semaine(numero: number): Semaine {
  return CALENDRIER[Math.max(0, Math.min(CALENDRIER.length - 1, numero - 1))];
}

/** Saison 1 = juillet 2026 à juin 2027 ; Mondial en octobre 2027, saison 2. */
export function estAnneeDeCoupeDuMonde(saison: number): boolean {
  return saison >= 2 && saison % 4 === 2;
}

export function anneeDuCalendrier(saison: number, mois: number): number {
  return 2025 + saison + (mois < 7 ? 1 : 0);
}

/** Recalage des sauvegardes v24, sans effacer leurs scores ni leurs titres. */
export function migrerSemaineCalendrier(numero: number): number {
  const anciennes = ['8-30','9-6','9-13','9-20','9-27','10-4','10-11','10-18','10-25',
    '11-8','11-15','11-22','11-29','12-6','12-13','12-20','12-27','1-3','1-10','1-17',
    '1-24','1-31','2-7','2-14','2-21','2-28','3-7','3-14','3-21','3-28','4-4','4-11',
    '4-18','4-25','5-2','5-9','5-16','5-23','5-30','6-6','6-13','6-20','6-27','7-4','7-11'];
  if (numero >= 44) return SEMAINES_PAR_SAISON;
  const [mois, jour] = (anciennes[Math.max(0, numero - 1)] ?? anciennes[0]).split('-').map(Number);
  const cible = Date.UTC(mois < 7 ? 2027 : 2026, mois - 1, jour);
  return CALENDRIER.reduce((meilleur, s) =>
    Math.abs(Date.UTC(s.mois < 7 ? 2027 : 2026, s.mois - 1, s.jour) - cible)
      < Math.abs(Date.UTC(meilleur.mois < 7 ? 2027 : 2026, meilleur.mois - 1, meilleur.jour) - cible)
      ? s : meilleur).numero;
}
