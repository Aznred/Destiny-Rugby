/**
 * L'ADJOINT DU MODE ENTRAÎNEUR : ce qu'il sait du groupe au moment de composer (Correctif 41).
 *
 * `composerParLAdjoint` ne connaît ni le store ni la carrière ; ce fichier lui traduit l'état du club — absents,
 * joueurs réservés au banc par le médecin, condition physique, consignes de l'entraîneur, enjeu de l'affiche.
 *
 * ⚠️ LA CONDITION LUE ICI EST CELLE QUE L'ÉCRAN AFFICHE (`etatsPhysiquesManager`, passé à la composition) : l'adjoint
 * ne décide pas sur un chiffre que l'entraîneur ne voit pas. C'est `ProfilMedicalJoueur.condition` (−3 par match
 * joué, +2 par semaine sans surcharge), pas `fatigue`, qui sert au risque de blessure et sature à 100 chez tout
 * titulaire régulier : s'en servir ferait tourner l'effectif entier une semaine sur deux.
 */
import type { CompositionManager, Manager } from '../types.js';
import type { Coequipier } from './effectif.js';
import type { EtatCarriereAvancee } from './carriereAvancee.js';
import { indisponiblesCarriereAvancee, penalitesMedicales } from './carriereAvancee.js';
import { autorisationMedicale } from './infirmerieManager.js';
import { nombreJournees } from './championnat.js';
import { forceDuGroupe } from './recrutementManager.js';
import {
  composerParLAdjoint, importanceDeLAffiche,
  type EtatPhysiqueAdjoint, type ImportanceMatch, type RapportAdjoint,
} from './adjointComposition.js';
import type { AfficheComplete } from './matchLive.js';

/** La condition de chaque joueur du groupe : le dossier médical ouvert prime sur le profil. */
export function etatsPhysiquesManager(
  avancee: EtatCarriereAvancee | undefined, effectif: readonly Coequipier[],
): Map<string, EtatPhysiqueAdjoint> {
  const etats = new Map<string, EtatPhysiqueAdjoint>();
  if (!avancee) return etats;
  const penalites = penalitesMedicales(avancee);
  for (const j of effectif) {
    const profil = avancee.profilsMedicaux?.[j.id];
    if (profil) etats.set(j.id, { fraicheur: Math.round(profil.condition) });
  }
  for (const d of avancee.medical ?? []) {
    if (d.phase === 'clos') continue;
    const actuel = etats.get(d.joueurId) ?? {};
    etats.set(d.joueurId, { ...actuel, fraicheur: Math.round(Math.min(actuel.fraicheur ?? 100, d.condition ?? 100)),
      ...(penalites[d.joueurId] ? { penalite: penalites[d.joueurId] } : {}) });
  }
  return etats;
}

/** L'enjeu de l'affiche pour ce club : couperet, finale, adversaire nettement plus fort ou plus faible, fin de saison. */
export function importanceDuMatchManager(m: Pick<Manager, 'club' | 'saison' | 'division'>, affiche: AfficheComplete | null | undefined): ImportanceMatch {
  if (!affiche) return 'ordinaire';
  const adversaire = affiche.match.domicile === m.club ? affiche.match.exterieur : affiche.match.domicile;
  let ecart = 0, restantes = 99;
  try {
    ecart = forceDuGroupe(adversaire, m.saison) - forceDuGroupe(m.club, m.saison);
    if (affiche.nature === 'championnat') restantes = Math.max(0, nombreJournees(m.division, m.club) - affiche.journee);
  } catch { /* un adversaire sans effectif connu : match ordinaire */ }
  return importanceDeLAffiche(affiche, ecart, restantes);
}

export interface OptionsAdjointManager {
  /** L'état à lire (celui de la semaine qui commence, quand l'adjoint compose pour la suivante). */
  avancee?: EtatCarriereAvancee;
  semaine?: number;
  affiche?: AfficheComplete | null;
  importance?: ImportanceMatch;
}

/** La feuille de l'adjoint pour ce club, cette semaine — et son rapport. */
export function rapportAdjointManager(m: Manager, effectif: readonly Coequipier[], options: OptionsAdjointManager = {}): RapportAdjoint {
  const avancee = options.avancee ?? m.avancee;
  const semaine = options.semaine ?? m.semaine;
  const absents = new Set(indisponiblesCarriereAvancee(avancee, semaine));
  const bancSeulement = new Set<string>();
  for (const d of avancee?.medical ?? []) {
    if (d.phase === 'clos') continue;
    const droit = autorisationMedicale(d);
    if (droit === 'aucune') absents.add(d.joueurId);
    if (droit === 'banc') bancSeulement.add(d.joueurId);
  }
  return composerParLAdjoint(effectif, {
    indisponibles: absents, bancSeulement,
    etats: etatsPhysiquesManager(avancee, effectif),
    importance: options.importance ?? importanceDuMatchManager(m, options.affiche),
    consignes: m.consignesAdjoint,
  });
}

/** La feuille seule, avec les rôles que l'entraîneur avait choisis s'ils sont toujours alignés. */
export function compositionDeLAdjoint(m: Manager, effectif: readonly Coequipier[], options: OptionsAdjointManager = {}): CompositionManager {
  const rapport = rapportAdjointManager(m, effectif, options);
  // Une feuille incomplète (groupe trop court) : on garde celle qui existe plutôt que de jouer à moins de vingt-trois.
  if (!rapport.complet && m.composition?.titulaires.length === 15) return m.composition;
  const feuille = new Set([...rapport.composition.titulaires, ...rapport.composition.remplacants]);
  const precedente = m.composition;
  return {
    ...rapport.composition,
    ...(precedente?.capitaineId && rapport.composition.titulaires.includes(precedente.capitaineId) ? { capitaineId: precedente.capitaineId } : {}),
    ...(precedente?.buteurId && feuille.has(precedente.buteurId) ? { buteurId: precedente.buteurId } : {}),
  };
}
