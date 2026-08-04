// LA SIMULATION DE FOND — toute la poule rejouée, sans une ligne d'affichage.
//
// Le match du joueur n'est pas un cas particulier : les autres affiches de la
// journée passent par le MÊME moteur, poussé jusqu'à la sirène par pas de huit
// secondes. Comme la graine d'une rencontre est celle du championnat, le match
// regardé en direct et celui rejoué ici sont rigoureusement identiques — mêmes
// essais, mêmes plaquages, mêmes minutes. Aucun double comptage possible.

import { affichesDeLaJournee, graine } from '../championnat';
import { effectifDuClub } from '../effectif';
import { avancer, bilan, creerMatch } from './moteur';
import type { AttributsPion } from './entites';
import type { Joueur, PosteId } from '../../types';

export interface LigneReelle {
  nom: string; club: string; numero: number; poste: PosteId; minutes: number;
  essais: number; plaquages: number; plaquagesManques: number; passes: number;
  metres: number; grattages: number; rucksNettoyes: number; turnovers: number;
  butsTentes: number; butsReussis: number; cartons: number; matchs: number;
}

export function ligneVide(nom: string, club: string, numero: number, poste: PosteId): LigneReelle {
  return {
    nom, club, numero, poste, minutes: 0, essais: 0, plaquages: 0, plaquagesManques: 0,
    passes: 0, metres: 0, grattages: 0, rucksNettoyes: 0, turnovers: 0,
    butsTentes: 0, butsReussis: 0, cartons: 0, matchs: 0,
  };
}

export interface Avatar {
  club: string; nom: string; poste: PosteId; attributs: AttributsPion; titulaire?: boolean;
}

export const MAX_MATCHS_PAR_JOURNEE = 8;

// Titulaire ou remplaçant ? La confiance du staff et le niveau décident, de
// façon déterministe. ⚠️ Cette fonction est partagée par le direct et par la
// simulation de fond : sinon les deux divergeraient.
export function estTitulaire(j: Joueur, cle: string): boolean {
  const valeurs = Object.values(j.attributs ?? {});
  const general = valeurs.length ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length : 45;
  const chance = 0.18 + (j.confianceCoach ?? 50) / 190 + (general - 45) / 120;
  return graine('titu#' + cle + j.nom)() < Math.max(0.08, Math.min(0.95, chance));
}

// Joue un match complet sans rendu et renvoie l'état final.
export function jouerSansRendu(
  domicile: string, exterieur: string, saison: number,
  scoreD: number, scoreE: number, cle: string, avatar?: Avatar,
) {
  const e = creerMatch(
    domicile, exterieur,
    effectifDuClub(domicile, saison), effectifDuClub(exterieur, saison),
    scoreD, scoreE, cle, avatar,
  );
  let garde = 0;
  while (!e.fini && garde++ < 4000) avancer(e, 8);
  return e;
}

export function simulerJournee(
  divisionId: string, saison: number, journee: number, clubJoueur: string,
  bonusJoueur: number, numeroPoule: number | undefined, avatar?: Avatar,
): LigneReelle[] {
  const affiches = affichesDeLaJournee(
    divisionId, saison, clubJoueur, journee, journee, bonusJoueur, numeroPoule,
  );
  const sortie: LigneReelle[] = [];

  for (const a of affiches.slice(0, MAX_MATCHS_PAR_JOURNEE)) {
    if (!a.match) continue;
    const cle = `${divisionId}#${saison}#${journee - 1}#${a.domicile}#${a.exterieur}`;
    const concerne = avatar && (avatar.club === a.domicile || avatar.club === a.exterieur);
    const e = jouerSansRendu(
      a.domicile, a.exterieur, saison, a.match.scoreD, a.match.scoreE, cle,
      concerne ? avatar : undefined,
    );

    for (const j of bilan(e).parJoueur) {
      sortie.push({
        nom: j.nom, club: j.club, numero: j.numero, poste: j.poste,
        minutes: j.minutes, essais: j.stats.essais, plaquages: j.stats.plaquages,
        plaquagesManques: j.stats.plaquagesManques, passes: j.stats.passes,
        metres: Math.round(j.stats.metres), grattages: j.stats.grattages,
        rucksNettoyes: j.stats.rucksNettoyes, turnovers: j.stats.passesRatees,
        butsTentes: j.stats.butsTentes, butsReussis: j.stats.butsReussis,
        cartons: j.stats.cartons, matchs: 1,
      });
    }
  }
  return sortie;
}

export function cumuler(
  total: Record<string, LigneReelle>, journee: LigneReelle[],
): Record<string, LigneReelle> {
  const sortie = { ...total };
  for (const l of journee) {
    const cle = `${l.club}|${l.nom}`;
    const a = sortie[cle] ?? ligneVide(l.nom, l.club, l.numero, l.poste);
    sortie[cle] = {
      ...a, numero: l.numero, poste: l.poste,
      minutes: a.minutes + l.minutes, essais: a.essais + l.essais,
      plaquages: a.plaquages + l.plaquages, plaquagesManques: a.plaquagesManques + l.plaquagesManques,
      passes: a.passes + l.passes, metres: a.metres + l.metres,
      grattages: a.grattages + l.grattages, rucksNettoyes: a.rucksNettoyes + l.rucksNettoyes,
      turnovers: a.turnovers + l.turnovers, butsTentes: a.butsTentes + l.butsTentes,
      butsReussis: a.butsReussis + l.butsReussis, cartons: a.cartons + l.cartons,
      matchs: a.matchs + l.matchs,
    };
  }
  return sortie;
}
