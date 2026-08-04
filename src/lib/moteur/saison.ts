// LA SIMULATION DE FOND — toute la poule rejouée, sans une ligne d'affichage.
//
// Le match du joueur n'est pas un cas particulier : les autres affiches de la
// journée passent par le MÊME moteur, poussé jusqu'à la sirène par pas de huit
// secondes. Comme la graine d'une rencontre est celle du championnat, le match
// regardé en direct et celui rejoué ici sont rigoureusement identiques — mêmes
// essais, mêmes plaquages, mêmes minutes. Aucun double comptage possible.

import { affichesDeLaJournee } from '../championnat';
import { effectifDuClub } from '../effectif';
import { coupeEnDirect } from '../coupe';
import { affichesInternationales, effectifNational } from '../international';
import { avancer, bilan, creerMatch } from './moteur';
import type { AttributsPion } from './entites';
import type { PosteId } from '../../types';

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

// ⚠️ `estTitulaire` vit dans `moteur/titulaire.ts` : le store l'appelle à chaque
// semaine, et l'importer d'ici tirait TOUT le moteur dans le chunk principal.
// On la ré-exporte pour les appelants historiques.
export { estTitulaire } from './titulaire';

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

// Verse le bilan d'un match joué dans les lignes de statistiques.
function verser(sortie: LigneReelle[], e: ReturnType<typeof jouerSansRendu>): void {
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
    verser(sortie, jouerSansRendu(
      a.domicile, a.exterieur, saison, a.match.scoreD, a.match.scoreE, cle,
      concerne ? avatar : undefined,
    ));
  }
  return sortie;
}

// ---------------------------------------------------------------------------
// LES COUPES D'EUROPE
// ---------------------------------------------------------------------------
// ⚠️ Une journée de coupe se rejoue exactement comme une journée de championnat.
// Sans ça, les statistiques d'une semaine européenne n'existaient tout
// simplement pas : le joueur regardait son match, et le lendemain il était le
// seul de la compétition à avoir des chiffres.
export function simulerJourneeCoupe(
  coupeId: string, saison: number, journee: number, clubJoueur: string, avatar?: Avatar,
): LigneReelle[] {
  const etat = coupeEnDirect(coupeId, saison, clubJoueur, journee);
  if (!etat) return [];
  const sortie: LigneReelle[] = [];
  let joues = 0;
  for (let p = 0; p < etat.poules.length; p++) {
    const journees = etat.poules[p].journees;
    const matchs = journees[journee - 1];
    if (!matchs) continue;
    for (const m of matchs) {
      if (joues++ >= MAX_MATCHS_PAR_JOURNEE) break;
      const cle = `${coupeId}#${saison}#${p}#${journee - 1}#${m.domicile}#${m.exterieur}`;
      const concerne = avatar && (avatar.club === m.domicile || avatar.club === m.exterieur);
      verser(sortie, jouerSansRendu(
        m.domicile, m.exterieur, saison, m.scoreD, m.scoreE, cle,
        concerne ? avatar : undefined,
      ));
    }
  }
  return sortie;
}

// ---------------------------------------------------------------------------
// LES SÉLECTIONS NATIONALES
// ---------------------------------------------------------------------------
// Un test-match se joue avec le MÊME moteur, à ceci près que les « clubs » sont
// des sélections : leur effectif est composé des meilleurs joueurs réels de la
// nation (`effectifNational`).
export function simulerJourneeInternationale(
  competitionId: string, saison: number, journee: number, avatar?: Avatar,
): LigneReelle[] {
  const affiches = affichesInternationales(competitionId, saison, journee, journee, null);
  const sortie: LigneReelle[] = [];
  for (const a of affiches.slice(0, MAX_MATCHS_PAR_JOURNEE)) {
    if (!a.match) continue;
    const cle = `${competitionId}#${saison}#${journee - 1}#${a.domicile}#${a.exterieur}`;
    const concerne = avatar && (avatar.club === a.domicile || avatar.club === a.exterieur);
    const e = creerMatch(
      a.domicile, a.exterieur,
      effectifNational(a.domicile, saison), effectifNational(a.exterieur, saison),
      a.match.scoreD, a.match.scoreE, cle, concerne ? avatar : undefined,
    );
    let garde = 0;
    while (!e.fini && garde++ < 4000) avancer(e, 8);
    verser(sortie, e);
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
