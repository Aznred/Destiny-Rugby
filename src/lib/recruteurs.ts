// ═══════════════════════════════════════════════════════════════════════════
// 🔎 LES RECRUTEURS — aller voir où personne ne regarde
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « des recruteurs pour trouver les pépites ; il peut aussi y avoir
// des gros potentiels dans les petites ligues ».
//
// ⚠️ ON TRIE PAR MARGE, PAS PAR NOTE, et c'est toute la différence entre un
// service de recrutement et l'écran Marché qui existe déjà. Le Marché montre
// qui est bon AUJOURD'HUI — il est trié par note, et il ne remontera jamais un
// joueur de Régionale 2 noté 34. Un recruteur, lui, cherche l'écart entre ce
// qu'un joueur vaut et ce qu'il vaudra : c'est le seul angle sous lequel une
// pépite se distingue d'un joueur moyen de son étage.
//
// ⚠️ ET IL RAPPORTE CE QU'IL CROIT, PAS CE QUI EST. Le potentiel annoncé est
// une ESTIMATION, décalée de la vérité d'autant que le service est modeste
// (`INCERTITUDE_RECRUTEURS`). Sans ça, un rapport serait un oracle : on
// signerait à coup sûr, et améliorer le service ne changerait que le nombre de
// lignes. Ici, monter de niveau, c'est cesser de parier.

import { COMPETITIONS, competitionDuClub } from '../data/clubs.js';
import { graine } from './championnat.js';
import { effectifDuClub } from './effectif.js';
import {
  CLUBS_OBSERVES, INCERTITUDE_RECRUTEURS, NIVEAU_INSTALLATION_MAX, PORTEE_RECRUTEURS, seuilInteret,
} from './installations.js';
import type { RapportRecruteur } from '../types.js';

/** L'âge au-delà duquel un « espoir » n'en est plus un. */
const AGE_MAX_CIBLE = 23;
/** Combien de lignes un rapport compte au maximum. */
const LIGNES_MAX = 8;

/**
 * Les clubs que le service sait aller voir.
 *
 * ⚠️ LA FENÊTRE DESCEND, ELLE NE MONTE QUASIMENT PAS (un seul étage au-dessus).
 * C'est la demande : on va chercher dans les petites ligues. Regarder vers le
 * haut ne servirait à rien — ces joueurs-là, tout le monde les voit, et ils
 * sont hors de prix.
 */
export function fenetreDeProspection(niveauDuClub: number, niveauService: number): [number, number] {
  const n = Math.max(0, Math.min(niveauService, NIVEAU_INSTALLATION_MAX));
  return [Math.max(0, niveauDuClub - 1), Math.min(10, niveauDuClub + PORTEE_RECRUTEURS[n])];
}

/**
 * Le rapport d'une saison.
 *
 * Déterministe (graine `recruteurs#club#saison#niveau`) : rouvrir la
 * sauvegarde ne redistribue pas les cartes. Le store le fige de toute façon
 * dans `Manager.rapports`, mais la fonction reste rejouable — c'est ce qui la
 * rend mesurable sans navigateur.
 */
export function explorer(
  clubDuManager: string, saison: number, niveauService: number,
): RapportRecruteur[] {
  const n = Math.max(0, Math.min(niveauService, NIVEAU_INSTALLATION_MAX));
  if (n <= 0) return [];

  const niveauDuClub = competitionDuClub(clubDuManager)?.niveau ?? 8;
  const [bas, haut] = fenetreDeProspection(niveauDuClub, n);
  const seuil = seuilInteret(niveauDuClub);

  // Le vivier : tous les clubs de la fenêtre, moins le sien.
  const vivier: { club: string; division: string; niveau: number }[] = [];
  for (const c of COMPETITIONS) {
    if (c.niveau < bas || c.niveau > haut) continue;
    for (const club of c.clubs) {
      if (club.nom === clubDuManager) continue;
      vivier.push({ club: club.nom, division: c.nom, niveau: c.niveau });
    }
  }
  if (!vivier.length) return [];

  const rng = graine(`recruteurs#${clubDuManager}#${saison}#${n}`);
  // ⚠️ ON TIRE LES CLUBS AU SORT, ON NE PREND PAS « LES N PREMIERS ». Le
  // vivier est rangé par compétition, donc par ordre de fichier : prendre le
  // début renverrait chaque saison le même coin de la même division, et le
  // service n'aurait jamais l'air de se déplacer.
  const visites = new Set<number>();
  const combien = Math.min(CLUBS_OBSERVES[n], vivier.length);
  let gardeFou = 0;
  while (visites.size < combien && gardeFou++ < combien * 12) {
    visites.add(Math.floor(rng() * vivier.length));
  }

  const incertitude = INCERTITUDE_RECRUTEURS[n];
  const trouves: (RapportRecruteur & { marge: number })[] = [];
  for (const i of visites) {
    const { club, division, niveau } = vivier[i];
    for (const j of effectifDuClub(club, saison)) {
      if (j.age > AGE_MAX_CIBLE) continue;
      if (j.note < seuil) continue;
      const marge = j.potentiel - j.note;
      if (marge < 6) continue;
      // L'erreur d'appréciation du service, tirée une fois par joueur observé.
      const biais = incertitude ? Math.round((rng() * 2 - 1) * incertitude) : 0;
      const annonce = Math.max(j.note, Math.min(99, j.potentiel + biais));
      trouves.push({
        id: `${club}#${j.id}#${saison}`,
        saison,
        club,
        division,
        niveau,
        nom: j.nom,
        poste: j.poste,
        nation: j.nation,
        age: j.age,
        note: j.note,
        potentiel: annonce,
        incertitude,
        marge: annonce - j.note,
      });
    }
  }

  // ⚠️ LE TRI PORTE SUR LA MARGE ANNONCÉE, pas sur la vraie : le service
  // hiérarchise ce qu'il croit avoir vu. Trier sur la vérité reviendrait à lui
  // prêter une connaissance qu'on vient justement de lui retirer.
  return trouves
    .sort((a, b) => b.marge - a.marge || b.potentiel - a.potentiel)
    .slice(0, LIGNES_MAX)
    .map(({ marge: _marge, ...r }) => r);
}
