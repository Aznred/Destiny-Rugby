// Sélections nationales — l'onglet « Sélections » liste les équipes, pas les
// compétitions : on parcourt donc tous les classements de COMPETITIONS_NATIONS
// et on en déduit la liste dédoublonnée des sélections, séniors et U20.

import { COMPETITIONS_NATIONS } from './mondeReel';

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
  return nom.replace(/\s+(U20|A|XV)$/i, '').trim();
}

// Équipes qui ne sont pas la sélection première de leur pays.
const RESERVES = /\s(A|XV)$|^Barbarians$|^Māori All Blacks$/;

function construire(): Selection[] {
  const parNom = new Map<string, Selection>();
  for (const comp of COMPETITIONS_NATIONS) {
    for (const ligne of comp.classement) {
      const existante = parNom.get(ligne.equipe);
      if (existante) {
        if (!existante.competitions.includes(comp.nom)) existante.competitions.push(comp.nom);
        if (!existante.logo) existante.logo = ligne.logo;
        continue;
      }
      parNom.set(ligne.equipe, {
        nom: ligne.equipe,
        logo: ligne.logo,
        nation: nationDeBase(ligne.equipe),
        competitions: [comp.nom],
        u20: /\sU20$/i.test(ligne.equipe),
        reserve: RESERVES.test(ligne.equipe),
      });
    }
  }
  return [...parNom.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

const TOUTES = construire();

// Une seule équipe par pays : les équipes A / XV et les sélections d'invitation
// (Barbarians, Māori All Blacks) feraient doublon avec la sélection première.
export const SELECTIONS_SENIOR = TOUTES.filter((s) => !s.u20 && !s.reserve);
export const SELECTIONS_U20 = TOUTES.filter((s) => s.u20);
