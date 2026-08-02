// LA SIMULATION DE FOND : TOUTE LA JOURNÉE, SANS RENDU
//
// Le moteur ne servait qu'au match qu'on regarde. Les 29 autres joueurs de la
// rencontre — et les six autres matchs de la poule — n'existaient que dans le
// modèle statistique : impossible d'avoir un vrai classement des marqueurs.
//
// Ici on rejoue TOUTES les affiches de la journée avec le même moteur, mais
// sans une seule ligne d'affichage : pas de `requestAnimationFrame`, pas de
// SVG, juste la boucle de simulation poussée jusqu'à la sirène. Ça tourne au
// moment où l'on passe à la semaine suivante.
//
// ⚠️ MÊME GRAINE = MÊME MATCH. La clé d'une rencontre est celle du championnat
// (`division#saison#journée#domicile#extérieur`). Le match qu'on a regardé en
// direct et celui rejoué en fond sont donc RIGOUREUSEMENT identiques : mêmes
// essais, mêmes plaquages, mêmes minutes. Aucun risque de compter deux fois, et
// la feuille de match correspond exactement à ce qu'on a vu.

import { affichesDeLaJournee } from '../championnat';
import { effectifDuClub } from '../effectif';
import { avancer, bilan, creerMatch } from './moteur';
import type { AttributsPion } from './entites';
import type { Joueur, PosteId } from '../../types';
import { graine } from '../championnat';

export interface LigneReelle {
  nom: string;
  club: string;
  numero: number;
  poste: PosteId;
  minutes: number;
  essais: number;
  plaquages: number;
  plaquagesManques: number;
  passes: number;
  metres: number;
  grattages: number;
  rucksNettoyes: number;
  turnovers: number;
  butsTentes: number;
  butsReussis: number;
  cartons: number;
  matchs: number;
}

export function ligneVide(nom: string, club: string, numero: number, poste: PosteId): LigneReelle {
  return {
    nom, club, numero, poste, minutes: 0, essais: 0, plaquages: 0, plaquagesManques: 0,
    passes: 0, metres: 0, grattages: 0, rucksNettoyes: 0, turnovers: 0,
    butsTentes: 0, butsReussis: 0, cartons: 0, matchs: 0,
  };
}

export interface Avatar {
  club: string;
  nom: string;
  poste: PosteId;
  attributs: AttributsPion;
  titulaire?: boolean;
}

// ⚠️ GARDE-FOU DE PERFORMANCE. Un match coûte ~100 ms ; on n'en rejoue donc
// qu'une poule (jusqu'à 8 affiches, soit ~0,8 s), pas les treize poules d'une
// Fédérale 3. Le classement affiché est de toute façon celui d'UNE poule.
export const MAX_MATCHS_PAR_JOURNEE = 8;

// ⚠️ TITULAIRE OU REMPLAÇANT ? La décision doit être la MÊME pour le match
// qu'on regarde et pour celui rejoué en fond, sinon les statistiques du direct
// et celles du classement divergeraient. Elle vit donc ici, partagée, et elle
// est déterministe : la confiance du staff et le niveau décident, la graine fixe
// le reste.
export function estTitulaire(j: Joueur, cle: string): boolean {
  const valeurs = Object.values(j.attributs ?? {});
  const general = valeurs.length
    ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length : 45;
  const chance = 0.18 + (j.confianceCoach ?? 50) / 190 + (general - 45) / 120;
  return graine('titu#' + cle + j.nom)() < Math.max(0.08, Math.min(0.95, chance));
}

// Rejoue toutes les affiches d'une journée et renvoie les statistiques
// individuelles de chaque joueur ayant foulé le terrain.
export function simulerJournee(
  divisionId: string,
  saison: number,
  journee: number,
  clubJoueur: string,
  bonusJoueur: number,
  numeroPoule: number | undefined,
  avatar?: Avatar,
): LigneReelle[] {
  const affiches = affichesDeLaJournee(
    divisionId, saison, clubJoueur, journee, journee, bonusJoueur, numeroPoule,
  );
  const sortie: LigneReelle[] = [];

  for (const a of affiches.slice(0, MAX_MATCHS_PAR_JOURNEE)) {
    if (!a.match) continue;
    // La clé est EXACTEMENT celle du championnat : c'est ce qui garantit que le
    // match rejoué ici est le même que celui affiché en direct.
    const cle = `${divisionId}#${saison}#${journee - 1}#${a.domicile}#${a.exterieur}`;
    const concerne = avatar && (avatar.club === a.domicile || avatar.club === a.exterieur);
    const e = creerMatch(
      a.domicile, a.exterieur,
      effectifDuClub(a.domicile, saison), effectifDuClub(a.exterieur, saison),
      a.match.scoreD, a.match.scoreE, cle,
      concerne ? avatar : undefined,
    );
    // On pousse la simulation jusqu'à la sirène, par gros pas : sans rendu, le
    // pas de temps n'a aucune raison d'être fin.
    let garde = 0;
    while (!e.fini && garde++ < 20000) avancer(e, 8);

    for (const j of bilan(e).parJoueur) {
      const pion = e.pions.find((p) => p.nom === j.nom && p.numero === j.numero);
      sortie.push({
        nom: j.nom,
        club: j.club,
        numero: j.numero,
        poste: pion?.poste ?? 'premier_centre',
        minutes: j.minutes,
        essais: j.stats.essais,
        plaquages: j.stats.plaquages,
        plaquagesManques: j.stats.plaquagesManques,
        passes: j.stats.passes,
        metres: Math.round(j.stats.metres),
        grattages: j.stats.grattages,
        rucksNettoyes: j.stats.rucksNettoyes,
        turnovers: j.stats.passesRatees,
        butsTentes: j.stats.butsTentes,
        butsReussis: j.stats.butsReussis,
        cartons: j.stats.cartons,
        matchs: 1,
      });
    }
  }
  return sortie;
}

// Cumule une journée dans le total de la saison. La clé d'un joueur est
// `club|nom` : deux homonymes de clubs différents restent distincts.
export function cumuler(
  total: Record<string, LigneReelle>, journee: LigneReelle[],
): Record<string, LigneReelle> {
  const sortie = { ...total };
  for (const l of journee) {
    const cle = `${l.club}|${l.nom}`;
    const a = sortie[cle] ?? ligneVide(l.nom, l.club, l.numero, l.poste);
    sortie[cle] = {
      ...a,
      // Le numéro et le poste sont ceux du dernier match disputé.
      numero: l.numero,
      poste: l.poste,
      minutes: a.minutes + l.minutes,
      essais: a.essais + l.essais,
      plaquages: a.plaquages + l.plaquages,
      plaquagesManques: a.plaquagesManques + l.plaquagesManques,
      passes: a.passes + l.passes,
      metres: a.metres + l.metres,
      grattages: a.grattages + l.grattages,
      rucksNettoyes: a.rucksNettoyes + l.rucksNettoyes,
      turnovers: a.turnovers + l.turnovers,
      butsTentes: a.butsTentes + l.butsTentes,
      butsReussis: a.butsReussis + l.butsReussis,
      cartons: a.cartons + l.cartons,
      matchs: a.matchs + l.matchs,
    };
  }
  return sortie;
}
