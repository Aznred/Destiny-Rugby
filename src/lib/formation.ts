// ═══════════════════════════════════════════════════════════════════════════
// 🎓 LE CENTRE DE FORMATION — ce qui sort du cru
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « fais qu'on puisse avoir un centre de formation avec des
// améliorations etc. ».
//
// ⚠️ CE QUE LE CENTRE ACHÈTE, CE N'EST PAS UN JOUEUR : C'EST UNE LOI DE TIRAGE.
// Le monde produit une pépite pour 1,2 % de ses jeunes (`PART_PEPITE`,
// lib/effectif.ts) ; un centre de niveau 4 en produit une fois sur cinq.
// C'est le seul écart qui justifie de payer — un centre qui sortirait des
// bouche-trous un peu plus souvent ne changerait rien à une carrière, et
// l'améliorer ne se verrait nulle part.

import { POSTES } from '../data/rugby.js';
import { competitionDuClub, NOTE_PAR_NIVEAU } from '../data/clubs.js';
import { forceEffectif, plafondPepite } from './effectif.js';
import { nomAleatoirePourNation } from './nomsJoueurs.js';
import {
  BONUS_POTENTIEL_CENTRE, CHANCE_PEPITE_CENTRE, CHANCE_UN_DE_PLUS,
  NIVEAU_INSTALLATION_MAX, PROMOTION_PAR_NIVEAU,
} from './installations.js';
import type { Coequipier } from './effectif.js';
import type { JeuneForme } from '../types.js';

/**
 * La promotion d'une saison.
 *
 * ⚠️ ELLE TIRE AU SORT SANS GRAINE, ET C'EST VOULU. Tout le reste du monde est
 * déterministe parce qu'on doit pouvoir le RETROUVER en rejouant sa clé ; un
 * jeune du centre, lui, est la conséquence d'une décision de carrière (avoir
 * payé, telle saison, dans tel club) et il est PERSISTÉ. Le semer n'apporterait
 * rien et permettrait de rouvrir la sauvegarde jusqu'à obtenir la bonne
 * promotion — exactement le save-scumming que le reste du jeu interdit.
 */
export function promotionDuCentre(
  club: string, saison: number, niveau: number, effectif: Coequipier[],
): JeuneForme[] {
  if (niveau <= 0) return [];
  const n = Math.min(niveau, NIVEAU_INSTALLATION_MAX);
  const combien = PROMOTION_PAR_NIVEAU[n] + (Math.random() < CHANCE_UN_DE_PLUS[n] ? 1 : 0);
  if (combien <= 0) return [];

  const niveauClub = competitionDuClub(club)?.niveau ?? 8;
  const force = forceEffectif(club, saison);
  // ⚠️ ON PART DE LA FORCE RÉELLE DU GROUPE, pas de `NOTE_PAR_NIVEAU`. La table
  // annonce 58 pour la Nationale 2 quand ses effectifs pèsent 54 : un centre
  // calé dessus sortirait des jeunes meilleurs que les cadres du club.
  const reference = Number.isFinite(force) && force > 0 ? force : (NOTE_PAR_NIVEAU[niveauClub] ?? 50);

  // La nationalité du cru : celle qui domine le vestiaire, pas une invention.
  const nations = new Map<string, number>();
  for (const j of effectif) nations.set(j.nation, (nations.get(j.nation) ?? 0) + 1);
  const nation = [...nations.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '🇫🇷 France';

  const sortie: JeuneForme[] = [];
  for (let i = 0; i < combien; i++) {
    const age = 18 + Math.floor(Math.random() * 3); // 18-20
    // Un sortant de centre n'est pas prêt : il entre NETTEMENT sous le groupe.
    // Sans ce retard, le centre ferait monter la force du club dès la première
    // promotion, et l'intérêt d'un espoir serait de jouer tout de suite —
    // c'est-à-dire l'inverse de ce qu'est un centre de formation.
    const note = Math.max(28, Math.round(reference - 9 + Math.random() * 7));

    const pepite = Math.random() < CHANCE_PEPITE_CENTRE[n];
    const ordinaire = note + 2 + Math.floor(Math.random() * 6) + BONUS_POTENTIEL_CENTRE[n];
    // ⚠️ MÊME PLAFOND QUE LE MONDE (`plafondPepite`) : un centre ne doit pas
    // pouvoir sortir, en Fédérale 2, un joueur meilleur que n'importe qui en
    // Top 14 — et rien ne l'en ferait sortir, le jeu ne faisant pas monter un
    // bon joueur de club en club.
    const brut = pepite
      ? note + 16 + Math.floor(Math.random() ** 1.6 * 30)
      : ordinaire;
    const potentiel = Math.max(note, Math.min(plafondPepite(niveauClub), brut));

    const poste = POSTES[Math.floor(Math.random() * POSTES.length)].id;
    sortie.push({
      id: `${club}-centre-${saison}-${i}-${Math.floor(Math.random() * 1e6)}`,
      club,
      saison,
      nom: nomAleatoirePourNation(nation),
      poste,
      nation,
      age,
      note,
      potentiel,
    });
  }
  return sortie;
}
