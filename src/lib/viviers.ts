// ═══════════════════════════════════════════════════════════════════════════
// LE VIVIER — les jeunes existent AVANT qu'un club les découvre
// ═══════════════════════════════════════════════════════════════════════════
// Demande, et c'est elle qui commande tout le fichier : « le truc que je trouve
// particulièrement cool serait également que les jeunes existent avant
// d'arriver dans ton centre. Tu pourrais tomber à 17 ans sur un ailier
// incroyable de Régionale 2 qui joue dans le club de son village, plutôt que
// toutes les pépites apparaissent magiquement dans les académies des grands
// clubs. Ça donnerait beaucoup plus de vie à toute ta pyramide Top 14 →
// Régionale 3. »
//
// ⚠️ « JE NE FERAIS PAS APPARAÎTRE 30 JOUEURS ALÉATOIRES TOUS LES ANS. » Un
// jeune n'est pas tiré au moment où on le regarde : il est né dans un club,
// il y grandit, et il est là que quelqu'un l'observe ou non. Techniquement, ça
// veut dire une génération par COHORTE (année de naissance) et non par saison —
// sans quoi le « Jules Fabre, 15 ans » qu'on a repéré cette année serait un
// autre garçon la saison suivante.
//
// ⚠️ ET RIEN N'EST SAUVEGARDÉ, comme les effectifs et les championnats. Le
// vivier entier est déterministe : ~2 000 jeunes recalculés à la demande et
// mémoïsés. C'est aussi ce qui interdit de rouvrir sa sauvegarde jusqu'à
// tomber sur la bonne pépite.

import { COMPETITIONS, NOTE_PAR_NIVEAU, competitionDuClub } from '../data/clubs.js';
import { distanceKm, positionDuClub, region } from '../data/geographie.js';
import type { PositionClub } from '../data/geographie.js';
import { effectifDuClub, noteAmateur } from './effectif.js';
import { graine } from './championnat.js';
import { AGE_MAX_JEUNE, AGE_MIN_JEUNE, fabriquerJeune } from './jeunes.js';
import type { JeuneJoueur } from './jeunes.js';

/**
 * COMBIEN DE JEUNES SORTENT DE CE CLUB CHAQUE ANNÉE.
 *
 * ⚠️ LA COURBE EST PLATE EXPRÈS, et c'est le cœur de la demande. Un club de
 * Top 14 ne produit pas dix fois plus de gamins qu'un club de village : il a
 * une école de rugby plus grosse, pas une région dix fois plus peuplée. Ce qui
 * change entre eux, ce n'est pas le NOMBRE de jeunes, c'est la capacité à
 * les GARDER — et ça, c'est le centre de formation qui le décide
 * (`lib/centreFormation.ts`), pas le vivier.
 *
 * Une courbe raide aurait ramené toutes les pépites dans les académies des
 * grands clubs, c'est-à-dire exactement ce que la demande écarte.
 */
function jeunesParCohorte(niveau: number, poidsRegion: number): number {
  const parNiveau = niveau <= 1 ? 3 : niveau <= 3 ? 2.4 : niveau <= 6 ? 1.8 : 1.4;
  return parNiveau * (0.55 + poidsRegion / 24);
}

/** La note du club, quel que soit son étage — réelle en pro, tirée en amateur. */
function noteDuClub(club: string, niveau: number): number {
  return niveau > 3 ? noteAmateur(club, niveau) : (NOTE_PAR_NIVEAU[niveau] ?? 50);
}

const cacheVivier = new Map<string, JeuneJoueur[]>();

/**
 * LES JEUNES D'UN CLUB, à une saison donnée.
 *
 * Chaque cohorte (année de naissance) est générée une fois pour toutes ; on ne
 * garde que ceux qui ont entre 14 et 19 ans à la saison demandée. Un même
 * garçon revient donc d'une saison à l'autre, avec le même identifiant, le
 * même nom et un an de plus.
 */
export function vivierDuClub(club: string, saison: number): JeuneJoueur[] {
  const cle = `${club}#${saison}`;
  const memo = cacheVivier.get(cle);
  if (memo) return memo;

  const comp = competitionDuClub(club);
  const niveau = comp?.niveau ?? 8;
  const pos = positionDuClub(club);
  const r = region(pos.region);
  const noteClub = noteDuClub(club, niveau);
  const parCohorte = jeunesParCohorte(niveau, r.poids);

  const liste: JeuneJoueur[] = [];
  for (let age = AGE_MIN_JEUNE; age <= AGE_MAX_JEUNE; age++) {
    // La cohorte est l'année d'entrée dans le vivier : elle ne bouge pas quand
    // la saison avance, et c'est ce qui fait vieillir le même garçon.
    const cohorte = saison - (age - AGE_MIN_JEUNE);
    // ⚠️ LA PARTIE FRACTIONNAIRE EST TIRÉE, PAS ARRONDIE. À 1,8 jeune par
    // cohorte, un arrondi donnerait 2 partout : tous les clubs d'un étage
    // auraient exactement le même effectif de jeunes, ce qui se voit tout de
    // suite. Le tirage rend une moyenne juste et des clubs différents.
    const rngNombre = graine(`vivier#${club}#${cohorte}`);
    const combien = Math.floor(parCohorte) + (rngNombre() < parCohorte % 1 ? 1 : 0);
    for (let i = 0; i < combien; i++) {
      liste.push(fabriquerJeune(
        `${club}#${cohorte}#${i}`, club, pos.region, age, r.qualite, noteClub,
      ));
    }
  }
  cacheVivier.set(cle, liste);
  return liste;
}

export interface JeuneRepere extends JeuneJoueur {
  /** Distance entre son club et celui qui l'observe, en kilomètres. */
  distance: number;
  /** L'étage où il joue aujourd'hui. */
  niveauClub: number;
}

/**
 * TOUS LES JEUNES À PORTÉE D'UN CLUB.
 *
 * ⚠️ LE RAYON EST LA SEULE CHOSE QUI SÉPARE UN PETIT CLUB D'UN GRAND ICI.
 * « Détection locale : peu chère, rayon proche du club. Détection nationale :
 * académies, compétitions Crabos, lycées, sélections régionales. » Un club de
 * Régionale voit 50 km autour de lui ; le Stade Toulousain voit la France.
 * Le vivier, lui, est le même pour tout le monde — c'est ce qui permet de
 * tomber sur l'ailier du village.
 *
 * ⚠️ ET ON BALAIE LA PYRAMIDE ENTIÈRE, pas seulement les clubs de son étage.
 * Restreindre aux clubs comparables aurait remis les pépites dans les
 * académies — le défaut que la demande nomme explicitement.
 */
export function jeunesAPortee(
  clubObservateur: string,
  saison: number,
  rayonKm: number,
  ageMin = AGE_MIN_JEUNE,
): JeuneRepere[] {
  const depuis = positionDuClub(clubObservateur);
  const trouves: JeuneRepere[] = [];
  for (const comp of COMPETITIONS) {
    if (comp.pays !== 'France' || comp.niveau < 1) continue;
    for (const club of comp.clubs) {
      const d = distanceKm(depuis, positionDuClub(club.nom));
      if (d > rayonKm) continue;
      for (const j of vivierDuClub(club.nom, saison)) {
        if (j.age < ageMin) continue;
        trouves.push({ ...j, distance: d, niveauClub: comp.niveau });
      }
    }
  }
  return trouves;
}

const QUALITE_PAYS: Record<string, number> = {
  'Nouvelle-Zélande': 9.5, 'Afrique du Sud': 9.3, Irlande: 8.7,
  Angleterre: 8.6, Argentine: 8.4, Géorgie: 8.1, Fidji: 8.8,
  Australie: 8.2, Galles: 8, Écosse: 7.4, Italie: 6.7,
  Espagne: 5.7, Portugal: 6.2, Japon: 6.8,
};

const cacheInternational = new Map<string, JeuneRepere[]>();

/**
 * Une cellule au rayon international complète le vivier français avec une
 * poignée de profils issus des championnats étrangers réellement présents
 * dans le jeu. Les identités viennent de leurs effectifs, pas d'une liste de
 * noms français appliquée partout.
 */
export function jeunesInternationaux(
  clubObservateur: string,
  saison: number,
  combien = 64,
): JeuneRepere[] {
  const cle = `${clubObservateur}#${saison}#${combien}`;
  const memo = cacheInternational.get(cle);
  if (memo) return memo;

  const clubs = COMPETITIONS
    .filter((c) => c.pays !== 'France')
    .flatMap((c) => c.clubs.map((club) => ({ club: club.nom, pays: c.pays, niveau: c.niveau })));
  const rng = graine(`vivier-international#${clubObservateur}#${saison}`);
  const melanges = clubs
    .map((c) => ({ ...c, ordre: rng() }))
    .sort((a, b) => a.ordre - b.ordre)
    .slice(0, Math.min(clubs.length, Math.ceil(combien / 2)));
  const sortie: JeuneRepere[] = [];

  for (const c of melanges) {
    const effectif = effectifDuClub(c.club, saison);
    const qualite = QUALITE_PAYS[c.pays] ?? 5.8;
    for (let i = 0; i < 2 && sortie.length < combien; i++) {
      const age = 16 + Math.floor(rng() * 4);
      const cohorte = saison - (age - AGE_MIN_JEUNE);
      const id = `${c.club}#${cohorte}#intl-${i}`;
      const base = fabriquerJeune(
        id,
        c.club,
        c.pays,
        age,
        qualite,
        NOTE_PAR_NIVEAU[c.niveau] ?? 52,
      );
      const premier = effectif[Math.floor(rng() * Math.max(1, effectif.length))]?.nom;
      const second = effectif[Math.floor(rng() * Math.max(1, effectif.length))]?.nom;
      const prenom = premier?.split(' ')[0] ?? base.nom.split(' ')[0];
      const nom = second?.split(' ').slice(1).join(' ') || base.nom.split(' ').slice(1).join(' ');
      sortie.push({
        ...base,
        nom: `${prenom} ${nom}`.trim(),
        nation: c.pays,
        distance: 900 + Math.round(rng() * 17_000),
        niveauClub: c.niveau,
      });
    }
  }
  cacheInternational.set(cle, sortie);
  return sortie;
}

/**
 * COMBIEN DE CLUBS SE BATTENT POUR CE JEUNE.
 *
 * Demande : « Toulouse, Castres, Colomiers, Montauban se battent pour les mêmes
 * jeunes ». La concurrence n'est pas un chiffre inventé : c'est le nombre de
 * clubs assez sérieux dont le réseau atteint vraiment ce garçon. On la mesure
 * donc sur la carte, avec la même distance que tout le reste.
 *
 * ⚠️ UN CLUB N'EST UN CONCURRENT QUE S'IL EST PLUS HAUT QUE LE CLUB ACTUEL DU
 * JEUNE. Un club de Fédérale 3 ne « dispute » pas un espoir à Toulouse — il ne
 * le voit même pas passer. Sans cette borne, un jeune de village afficherait
 * quarante prétendants dont trente-huit ne signeront jamais personne.
 */
export function concurrenceSur(
  jeune: JeuneJoueur,
  rayonParEtage: (niveau: number) => number,
): { club: string; niveau: number; distance: number }[] {
  const chezLui = positionDuClub(jeune.club);
  const compJeune = competitionDuClub(jeune.club);
  const niveauJeune = compJeune?.niveau ?? 10;
  const rivaux: { club: string; niveau: number; distance: number }[] = [];
  for (const comp of COMPETITIONS) {
    if (comp.pays !== 'France' || comp.niveau < 1 || comp.niveau >= niveauJeune) continue;
    for (const club of comp.clubs) {
      if (club.nom === jeune.club) continue;
      const d = distanceKm(chezLui, positionDuClub(club.nom));
      if (d <= rayonParEtage(comp.niveau)) {
        rivaux.push({ club: club.nom, niveau: comp.niveau, distance: d });
      }
    }
  }
  // Le plus dangereux d'abord : haut niveau, puis proximité.
  return rivaux.sort((a, b) => a.niveau - b.niveau || a.distance - b.distance);
}

/** Purge les mémoires — utilisé par les bancs d'essai entre deux mesures. */
export function oublierViviers(): void {
  cacheVivier.clear();
  cacheInternational.clear();
}

export type { PositionClub };
