// ═══════════════════════════════════════════════════════════════════════════
// LES APPROCHES REÇUES — quand un club vient chercher un joueur qu'on garde
// ═══════════════════════════════════════════════════════════════════════════
//
// Jusqu'ici, un joueur ne bougeait que si le manager le POSAIT sur la liste
// des départs (`offresPourVente`) ou si le joueur lui-même réclamait de partir
// (`demandeAGenerer`). Il manquait le mouvement le plus banal d'un mercato :
// un club sonne à la porte pour un cadre qu'on n'a jamais mis en vente, et la
// décision devient « est-ce que j'ouvre ? » plutôt que « combien j'encaisse ? ».
//
// ⚠️ CE FICHIER EST PUR ET NE MUTE RIEN — même règle que `vestiaireManager.ts`
// et `negociation.ts`. Le store décide quand appeler et persiste le résultat.
//
// ⚠️ L'ACHETEUR N'EST PAS UN DÉ. Son besoin au poste, ses alternatives, son
// budget et son urgence sont LUS dans le monde (son effectif réel, l'enveloppe
// de `budgetsDuClub`). C'est la demande « éviter une IA qui négocie au hasard » :
// un club qui a cinq solutions au poste abandonne vite, celui qui n'en a aucune
// surpaie, et une contre-offre absurde ferme la porte au lieu de faire monter
// l'offre de 10 000 € de plus.

import { COMPETITIONS, competitionDuClub } from '../data/clubs';
import { graine } from './championnat';
import { pseudoStable } from './comptes';
import { effectifDuClub } from './effectif';
import { budgetsDuClub, estAmateurNiveau } from './recrutementManager';
import { valeurDeVente } from './vestiaireManager';
import type {
  ApprocheClubManager, LevierApprocheManager, Manager, ReponseApprocheManager,
} from '../types';
import type { ProfilMedicalJoueur, ProfilVestiaire, ContratJoueurAvance } from './carriereAvancee';
import type { Coequipier } from './effectif';

function arrondir(v: number, pas: number): number {
  return Math.max(0, Math.round(v / pas) * pas);
}
const borne = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Une approche ne naît que sur ces semaines : le mercato n'est pas permanent.
 *
 * ⚠️ AUCUNE AVANT LA MI-SAISON, et c'est délibéré. Un club qui vient chercher
 * un joueur en semaine 4 se positionne sur une réputation d'avant-saison : ni
 * le manager ni l'acheteur n'ont encore la moindre information de terrain, et
 * l'avance rapide s'interrompait dès le premier clic du jeu. À partir de la
 * seizième semaine, `interetExterieur` a été recalculé sur de vrais matchs.
 */
export const FENETRES_APPROCHE = [16, 23, 30, 36, 42, 48];
/** On ne harcèle pas : une approche à la fois, et une par joueur et par saison. */
const PATIENCE_ACHETEUR = 4;
/** Ce qu'une marche de négociation fait monter l'acheteur. */
const PAS_MONTEE = 0.14;

/**
 * L'acheteur crédible pour ce joueur : son étage, ou jusqu'à deux au-dessus.
 *
 * ⚠️ ON NE DESCEND PAS. Un Top 14 ne vient pas chercher un joueur de Fédérale
 * pour l'y laisser, et un club amateur n'a aucune indemnité à verser : sous la
 * Nationale 2, il n'y a rien à négocier entre clubs (`PRO_JUSQUA`) et donc
 * aucune approche — le joueur part libre en fin de contrat, ce que le reste du
 * mercato gère déjà.
 */
function acheteursPossibles(clubVendeur: string): { club: string; division: string; niveau: number }[] {
  const niveau = competitionDuClub(clubVendeur)?.niveau ?? 8;
  if (estAmateurNiveau(niveau)) return [];
  const liste: { club: string; division: string; niveau: number }[] = [];
  for (const c of COMPETITIONS) {
    if (estAmateurNiveau(c.niveau) || c.niveau > niveau || c.niveau < niveau - 2) continue;
    for (const club of c.clubs) {
      if (club.nom !== clubVendeur) liste.push({ club: club.nom, division: c.nom, niveau: c.niveau });
    }
  }
  return liste;
}

/** Ce que l'acheteur a DÉJÀ à ce poste : c'est ça, ses alternatives. */
function alternativesAuPoste(club: string, saison: number, j: Coequipier): { alternatives: number; manque: number } {
  const groupe = effectifDuClub(club, saison);
  const auPoste = groupe.filter((x) => x.poste === j.poste);
  const meilleure = auPoste.reduce((n, x) => Math.max(n, x.note), 0);
  return {
    alternatives: auPoste.filter((x) => x.note >= j.note - 2).length,
    manque: Math.max(0, j.note - meilleure),
  };
}

export interface ContexteApproche {
  contrat: ContratJoueurAvance;
  profilMedical?: ProfilMedicalJoueur;
}

/**
 * Qui vient frapper à la porte cette semaine, et pour qui. `null` la plupart
 * du temps — une approche est un évènement, pas une routine hebdomadaire.
 *
 * ⚠️ LE TIRAGE EST SEEDÉ SUR LA SEMAINE. Recharger la page ne fait pas
 * apparaître une offre qui n'était pas là, et n'en fait pas disparaître une.
 */
export function approcheAGenerer(
  m: Manager,
  effectif: Coequipier[],
  contrats: Record<string, ContratJoueurAvance>,
  profilsMedicaux: Record<string, ProfilMedicalJoueur>,
  approches: readonly ApprocheClubManager[],
  semaine: number,
): ApprocheClubManager | null {
  if (!FENETRES_APPROCHE.includes(semaine)) return null;
  if (approches.some((a) => a.etat === 'ouverte' || a.etat === 'negociation')) return null;
  const acheteurs = acheteursPossibles(m.club);
  if (!acheteurs.length) return null;

  const dejaVus = new Set(approches.filter((a) => a.saison === m.saison).map((a) => a.joueurId));
  const enVente = new Set(m.ventes.map((v) => v.joueurId));
  // On convoite celui qui intéresse VRAIMENT : `interetExterieur` est déjà
  // nourri chaque semaine par la note, le potentiel, la fin de contrat et la
  // satisfaction. On ne recalcule pas une seconde échelle à côté.
  const convoites = effectif
    .map((j) => ({ j, c: contrats[j.id] }))
    .filter(({ j, c }) => c && !dejaVus.has(j.id) && !enVente.has(j.id)
      && c.fin > m.saison && c.interetExterieur >= 45)
    .sort((a, b) => b.c.interetExterieur - a.c.interetExterieur);
  if (!convoites.length) return null;

  const rng = graine(`approche#${m.club}#${m.saison}#${semaine}`);
  const { j, c } = convoites[Math.min(convoites.length - 1, Math.floor(rng() * Math.min(4, convoites.length)))];
  if (rng() > Math.min(0.55, 0.1 + c.interetExterieur / 220 + c.offresExterieures * 0.06)) return null;

  const acheteur = acheteurs[Math.floor(rng() * acheteurs.length)];
  const { alternatives, manque } = alternativesAuPoste(acheteur.club, m.saison, j);
  // Cinq solutions au poste : ce club n'a aucune raison de venir. C'est le
  // même filtre que celui qui le fera abandonner vite s'il vient quand même.
  if (alternatives >= 3 || manque <= 0) return null;

  const profil = profilsMedicaux[j.id];
  const sequelles = Object.values(profil?.sequelles ?? {}).reduce((n, x) => n + (x ?? 0), 0);
  const valeur = valeurDeVente(j, m.club, m.saison, {
    historiqueMedical: profil?.historique.length,
    sequelles,
    contratFin: c.fin,
  });
  if (valeur <= 0) return null;

  const urgence = borne(28 + manque * 6 + (3 - alternatives) * 9 + rng() * 20);
  const budget = budgetsDuClub(acheteur.club, m.saison).transferts;
  // ⚠️ LE PLAFOND EST BORNÉ PAR L'ENVELOPPE RÉELLE DE L'ACHETEUR. Sans ça, un
  // promu de Pro D2 pouvait « proposer » trois millions parce que le barème du
  // joueur le disait — et le manager apprenait le prix du marché auprès d'un
  // club incapable de le payer.
  const plafond = arrondir(Math.min(budget * 0.75, valeur * (0.92 + urgence / 190)), 25_000);
  // ⚠️ L'OFFRE D'OUVERTURE RESTE SOUS LE PLAFOND, sinon les leviers sont morts.
  // Un club au budget serré posait son maximum d'entrée : « qu'ils montent »
  // ne montait rien, et trois boutons sur quatre ne faisaient plus rien.
  const offre = arrondir(Math.min(plafond * 0.82, valeur * (0.5 + urgence / 320)), 25_000);
  if (plafond <= 0 || offre <= 0) return null;
  // ⚠️ ET LA DEMANDE D'OUVERTURE RESTE NÉGOCIABLE. Réclamer le barème plein à
  // un club qui ne peut pas le payer dépassait d'entrée le seuil d'absurdité :
  // le premier clic terminait les négociations, et le joueur n'avait jamais vu
  // la table. On reste au-dessus du plafond — il faut bien négocier — mais
  // dans l'épaisseur du raisonnable. Le manager reste libre de réclamer une
  // somme délirante à la main : c'est SON choix, pas un piège du jeu.
  const demande = arrondir(Math.max(
    offre * 1.15,
    Math.min(valeur * 1.25, plafond * (1 + rng() * 0.14)),
  ), 25_000);

  const besoin: ApprocheClubManager['besoin'] = manque >= 6 ? 'poste'
    : alternatives === 0 ? 'blessure'
      : acheteur.niveau < (competitionDuClub(m.club)?.niveau ?? 8) ? 'ambition' : 'remplacement';

  return {
    id: `approche#${j.id}#${m.saison}#${semaine}`,
    pseudo: pseudoStable(acheteur.club, '_recrutement'),
    club: acheteur.club,
    division: acheteur.division,
    joueurId: j.id,
    nom: j.nom,
    poste: j.poste,
    age: j.age,
    note: j.note,
    saisonsRestantes: Math.max(0, c.fin - m.saison),
    offre,
    demande,
    plafond,
    bonus: 0,
    pourcentageRevente: 0,
    besoin,
    urgence,
    alternatives,
    patience: PATIENCE_ACHETEUR,
    etat: 'ouverte',
    saison: m.saison,
    semaine,
  };
}

export interface ResultatApproche {
  approche: ApprocheClubManager;
  /** L'accord est-il conclu ? Le store n'encaisse que sur ce booléen. */
  accord: boolean;
}

/** Les quatre réponses du manager à une approche fraîche. */
export function repondreApproche(
  approche: ApprocheClubManager, reponse: ReponseApprocheManager,
): ResultatApproche {
  if (approche.etat !== 'ouverte') return { approche, accord: false };
  if (reponse === 'accepter') return { approche: { ...approche, etat: 'accord' }, accord: true };
  if (reponse === 'negocier') return { approche: { ...approche, etat: 'negociation' }, accord: false };
  // Refuser et « il n'est pas disponible » ne se valent pas : le second ferme
  // la porte pour de bon, mais il s'entend aussi à l'intérieur du vestiaire.
  return { approche: { ...approche, etat: reponse === 'refuser' ? 'refusee' : 'indisponible' }, accord: false };
}

/**
 * Une marche de négociation, du côté du VENDEUR.
 *
 * ⚠️ ON NE « MONTE » PAS : ON RÉCLAME. Chaque levier fait monter l'acheteur
 * vers son plafond caché, et lui coûte de la patience. `exiger` est le levier
 * brut ; les bonus différés et la part à la revente lui permettent d'aller un
 * peu plus haut en comptant, parce qu'il paiera plus tard.
 *
 * ⚠️ UNE DEMANDE ABSURDE FERME LA TABLE. Si ce qu'on réclame dépasse le
 * plafond d'un tiers, la réponse n'est pas une contre-offre polie : le club
 * s'en va. C'était la demande explicite — « Offre 150k, contre-offre 4M » doit
 * donner « Négociations terminées », pas « nous proposons 160k ».
 */
export function negocierApproche(
  approche: ApprocheClubManager, levier: LevierApprocheManager,
): ResultatApproche {
  if (approche.etat !== 'negociation') return { approche, accord: approche.etat === 'accord' };

  if (levier === 'accepter') {
    return { approche: { ...approche, demande: approche.offre, etat: 'accord' }, accord: true };
  }
  if (approche.demande > approche.plafond * 1.33) {
    return { approche: { ...approche, patience: 0, etat: 'rompue' }, accord: false };
  }

  let { offre, demande, patience } = approche;
  let bonus = approche.bonus;
  let pourcentageRevente = approche.pourcentageRevente;
  if (levier === 'exiger') {
    offre = arrondir(Math.min(approche.plafond, offre * (1 + PAS_MONTEE)), 25_000);
  } else if (levier === 'bonus') {
    // Il n'a pas plus de comptant, mais il peut promettre : matchs joués,
    // sélections, titre. Le vendeur baisse donc son exigence en échange.
    bonus = Math.min(Math.round(approche.plafond * 0.35), bonus + arrondir(approche.plafond * 0.08, 10_000));
    demande = arrondir(demande * 0.93, 25_000);
  } else {
    pourcentageRevente = Math.min(20, pourcentageRevente + 10);
    demande = arrondir(demande * 0.92, 25_000);
  }
  patience -= 1;

  if (offre + bonus * 0.5 >= demande) {
    return { approche: { ...approche, offre, demande, patience, bonus, pourcentageRevente, etat: 'accord' }, accord: true };
  }
  if (patience <= 0) {
    return { approche: { ...approche, offre, demande, patience: 0, bonus, pourcentageRevente, etat: 'rompue' }, accord: false };
  }
  return { approche: { ...approche, offre, demande, patience, bonus, pourcentageRevente }, accord: false };
}

/** Réclamer davantage : c'est le seul chiffre que le manager écrit lui-même. */
export function exigerSurApproche(approche: ApprocheClubManager, montant: number): ApprocheClubManager {
  if (approche.etat !== 'negociation') return approche;
  return { ...approche, demande: arrondir(montant, 25_000) };
}

export interface ReactionApproche {
  reaction: NonNullable<ApprocheClubManager['reaction']>;
  /** Ce que le refus coûte dans le vestiaire. */
  satisfaction: number;
  moral: number;
  texte: string;
}

/**
 * CE QUE LE JOUEUR RÉPOND QUAND ON REFUSE.
 *
 * ⚠️ C'EST ICI QUE LE SYSTÈME DEVIENT UN VRAI CHOIX. Refuser sans conséquence
 * rendrait l'approche décorative : on cliquerait « non » à chaque fois. Un
 * loyal, heureux et titulaire comprend ; un ambitieux mécontent à qui on ferme
 * la porte d'un club supérieur demande officiellement son départ. Ce sont les
 * mêmes données que partout ailleurs — attachement, satisfaction, traits, temps
 * de jeu — jamais un tirage.
 */
export function reactionAuRefus(
  approche: ApprocheClubManager,
  contrat: ContratJoueurAvance,
  vestiaire: ProfilVestiaire | undefined,
  contexte: { partDeJeu: number; monterDEtage: boolean; indisponible: boolean },
): ReactionApproche {
  const ambitieux = vestiaire?.traits.includes('ambitieux') || vestiaire?.traits.includes('mercenaire');
  const loyal = vestiaire?.traits.includes('loyal') || vestiaire?.traits.includes('professionnel');
  const envie = contrat.motivations.find((x) => x.type === 'ambition')?.importance ?? 40;
  // Plus l'attachement est haut, plus il faut de raisons de partir pour qu'un
  // refus soit vécu comme une trahison.
  const pression = borne(
    (contexte.monterDEtage ? 22 : 0)
    + (ambitieux ? 18 : 0) - (loyal ? 12 : 0)
    + Math.max(0, 55 - contrat.satisfaction) * 0.8
    + Math.max(0, 45 - contexte.partDeJeu * 100) * 0.35
    + envie * 0.25
    - contrat.attachement * 0.55
    + (contexte.indisponible ? 8 : 0),
  );
  if (pression >= 55) return {
    reaction: 'demandeDepart',
    satisfaction: -18,
    moral: -14,
    texte: `« Je souhaite rejoindre ${approche.club}. Le club a fermé une porte que je voulais ouvrir. »`,
  };
  return {
    reaction: 'comprend',
    satisfaction: pression >= 32 ? -6 : -2,
    moral: pression >= 32 ? -4 : -1,
    texte: pression >= 32
      ? `« Je comprends la décision du club, même si elle me coûte. »`
      : `« Ma place est ici. Je n'ai rien demandé à ${approche.club}. »`,
  };
}
