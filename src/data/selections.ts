// Sélections nationales — l'onglet « Sélections » liste les équipes, pas les
// compétitions : on parcourt les classements historiques ET les compétitions
// ajoutées dans `sources/competitions/ligues/`, puis on en déduit la liste
// dédoublonnée des sélections, séniors et U20.

import { COMPETITIONS_NATIONS } from './mondeReel.js';
import { COMPETITIONS_NATIONS_NOUVELLES } from './nouvellesLigues.js';
import { CLASSEMENT_WORLD_RUGBY_INITIAL } from './classementWorldRugby.js';
import { nomNation } from '../lib/nations.js';

export interface Selection {
  nom: string;
  logo?: string;
  nation: string; // nom de la nation, sans le suffixe (pour le drapeau)
  competitions: string[]; // compétitions où elle apparaît
  u20: boolean;
  reserve: boolean; // équipe A / XV / invitation (Barbarians, Māori…)
}

// « France U20 » → « France », « Italie XV » → « Italie », « Angleterre A » → …
function nationDeBase(nom: string): string {
  return nom.replace(/\s+(U20|-20|A|B|C|XV)$/i, '').trim();
}

// Équipes qui ne sont pas la sélection première de leur pays.
const RESERVES = /\s(A|B|C|XV)$|^Barbarians$|^Māori All Blacks$/;

function identiteEquipe(nom: string): { cle: string; nation: string; u20: boolean; reserve: boolean } {
  const u20 = /\s(?:U20|-20)$/i.test(nom);
  const reserve = RESERVES.test(nom);
  const nation = nomNation(nationDeBase(nom));
  return {
    cle: u20 ? `u20:${nation}` : reserve ? `reserve:${nom}` : `senior:${nation}`,
    nation,
    u20,
    reserve,
  };
}

function construire(): Selection[] {
  const parIdentite = new Map<string, Selection>();

  const ajouter = (nom: string, logo: string | undefined, competition: string, normaliser: boolean) => {
    const identite = identiteEquipe(nom);
    const existante = parIdentite.get(identite.cle);
    if (existante) {
      if (!existante.competitions.includes(competition)) existante.competitions.push(competition);
      if (!existante.logo) existante.logo = logo;
      return;
    }
    parIdentite.set(identite.cle, {
      nom: normaliser
        ? identite.u20 ? `${identite.nation} U20` : identite.reserve ? nom : identite.nation
        : nom,
      logo,
      nation: identite.nation,
      competitions: [competition],
      u20: identite.u20,
      reserve: identite.reserve,
    });
  };

  for (const comp of COMPETITIONS_NATIONS) {
    for (const ligne of comp.classement) {
      ajouter(ligne.equipe, ligne.logo, comp.nom, false);
    }
  }

  // Les 13 compétitions complémentaires n'ont pas un objet `classement` mais
  // une liste `equipes`. Sans ce second passage, leurs 86 sélections existaient
  // dans le calendrier et les résultats, mais restaient absentes de l'atlas.
  for (const comp of COMPETITIONS_NATIONS_NOUVELLES) {
    for (const equipe of comp.equipes) {
      ajouter(equipe.nom, equipe.logo, comp.nom, true);
    }
  }

  // Le classement vivant contient 114 nations. Celles qui ne jouent pas l'une
  // des compétitions simulées doivent malgré tout être consultables dans
  // l'atlas (et profiter de leur écusson lorsqu'on en possède un).
  for (const { nation } of CLASSEMENT_WORLD_RUGBY_INITIAL) {
    const identite = identiteEquipe(nation);
    if (!parIdentite.has(identite.cle)) {
      parIdentite.set(identite.cle, {
        nom: identite.nation,
        nation: identite.nation,
        competitions: ['Classement World Rugby'],
        u20: false,
        reserve: false,
      });
    }
  }
  return [...parIdentite.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

const TOUTES = construire();

// Une seule équipe par pays : les équipes A / XV et les sélections d'invitation
// (Barbarians, Māori All Blacks) feraient doublon avec la sélection première.
export const SELECTIONS_SENIOR = TOUTES.filter((s) => !s.u20 && !s.reserve);
export const SELECTIONS_U20 = TOUTES.filter((s) => s.u20);
