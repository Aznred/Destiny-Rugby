// LES CONSÉQUENCES DURES
//
// Demande explicite : « fais qu'il peut y avoir des évènements hard si trop
// grosses dingueries — prison, accident, mort du joueur, fin de carrière, exclu
// du club, relégation financière du club. Aussi que nos tweets peuvent avoir un
// impact s'il y a des folies : racisme, insultes du club, drogue. »
//
// ⚠️ CE MODULE NE FAIT QUE CALCULER. Il ne touche pas au store : il renvoie le
// joueur modifié et le texte à écrire au journal. C'est le store qui décide
// quand l'appliquer (issue d'une situation, dérapage sur L'Ovale, évènement).
//
// ⚠️ UNE CONSÉQUENCE DURE NE TOMBE JAMAIS PAR SURPRISE : elle est toujours la
// suite d'un choix explicite du joueur (prendre le volant ivre, frapper
// quelqu'un, publier une insanité). Le jeu ne punit pas au hasard.

import type { Joueur } from '../types';
import type { ConsequenceDure } from '../data/situations';

export interface EffetDur {
  joueur: Joueur;
  titre: string;
  texte: string;
  /** La carrière s'arrête ici : le store doit basculer sur le panthéon. */
  finale: boolean;
  emoji: string;
}

function borne(v: number): number { return Math.max(0, Math.min(100, Math.round(v))); }

export function appliquerConsequence(
  j: Joueur, type: ConsequenceDure, motif: string, semaines = 8,
): EffetDur {
  switch (type) {
    // ── Suspension sportive : on ne joue plus, mais le contrat tient ────────
    case 'suspension':
      return {
        joueur: {
          ...j,
          blessure: { nom: `Suspension — ${motif}`, gravite: 'saison', semaines },
          moral: borne(j.moral - 20),
          reputation: borne(j.reputation - 15),
          confianceCoach: borne((j.confianceCoach ?? 50) - 25),
        },
        emoji: '⛔',
        titre: `Suspension — ${semaines} semaines`,
        texte: `La commission de discipline te suspend ${semaines} semaines pour ${motif}. `
          + 'Tu ne peux plus jouer, tu continues de t’entraîner à part, et tout le monde en parle.',
        finale: false,
      };

    // ── Prison : le contrat est suspendu, le club prend ses distances ───────
    case 'prison':
      return {
        joueur: {
          ...j,
          blessure: { nom: `Détention — ${motif}`, gravite: 'saison', semaines },
          moral: borne(j.moral - 35),
          reputation: borne(j.reputation - 30),
          popularite: borne((j.popularite ?? 50) - 30),
          confianceCoach: borne((j.confianceCoach ?? 50) - 40),
          argent: Math.max(0, j.argent - 15_000),
        },
        emoji: '🚔',
        titre: 'Condamnation',
        texte: `Condamné pour ${motif}. Tu passes ${semaines} semaines loin des terrains, `
          + 'le club suspend ton salaire et la fédération ouvre un dossier. '
          + 'Ce que tu as construit met des années à revenir.',
        finale: false,
      };

    // ── Accident grave : très longue indisponibilité, séquelles physiques ───
    case 'accident':
      return {
        joueur: {
          ...j,
          blessure: { nom: `Accident — ${motif}`, gravite: 'saison', semaines },
          moral: borne(j.moral - 30),
          forme: borne(j.forme - 45),
          attributs: {
            ...j.attributs,
            vitesse: Math.max(1, j.attributs.vitesse - 4),
            endurance: Math.max(1, j.attributs.endurance - 4),
          },
          // ⚠️ Le potentiel aussi encaisse : on ne revient jamais tout à fait.
          potentiel: Math.max(20, (j.potentiel ?? 60) - 5),
        },
        emoji: '🚑',
        titre: 'Accident grave',
        texte: `${motif.charAt(0).toUpperCase() + motif.slice(1)}. `
          + `${semaines} semaines d’arrêt, opérations, rééducation. `
          + 'Tu rejoueras — mais pas tout à fait le même joueur.',
        finale: false,
      };

    // ── Fin de carrière forcée ─────────────────────────────────────────────
    case 'finDeCarriere':
      return {
        joueur: {
          ...j,
          blessure: { nom: motif, gravite: 'carriere', semaines: 99 },
          moral: borne(j.moral - 40),
        },
        emoji: '🛑',
        titre: 'Carrière terminée',
        texte: `Les médecins sont formels : ${motif}. Tu ne rejoueras plus. `
          + 'Il reste à raccrocher proprement, et à choisir ce que tu fais de la suite.',
        finale: true,
      };

    // ── Décès : la carrière s'arrête là, brutalement ───────────────────────
    case 'deces':
      return {
        joueur: { ...j, blessure: { nom: motif, gravite: 'carriere', semaines: 99 }, moral: 0 },
        emoji: '🕯️',
        titre: 'Fin brutale',
        texte: `${motif}. Le club, le championnat et le rugby français rendent hommage. `
          + 'Ton nom rejoint le Hall des Légendes.',
        finale: true,
      };

    // ── Exclusion : plus de club, plus de contrat, plus de salaire ─────────
    case 'exclusionClub':
      return {
        joueur: {
          ...j,
          contrat: undefined,
          moral: borne(j.moral - 25),
          reputation: borne(j.reputation - 12),
          confianceCoach: 20,
        },
        emoji: '📄',
        titre: 'Contrat rompu',
        texte: `Le club rompt ton contrat : ${motif}. Tu es libre — sans salaire, `
          + 'sans club, et avec une ligne de plus sur ton dossier. '
          + 'Il va falloir retrouver une équipe au marché des transferts.',
        finale: false,
      };

    // ── Le club saute administrativement ──────────────────────────────────
    case 'relegationFinanciere':
      return {
        joueur: {
          ...j,
          moral: borne(j.moral - 15),
          argent: Math.max(0, j.argent - 8000),
          contrat: j.contrat ? { ...j.contrat, salaire: Math.round(j.contrat.salaire * 0.6) } : undefined,
        },
        emoji: '🏦',
        titre: 'Le club est rétrogradé',
        texte: `${motif}. La commission financière rétrograde le club d’une division `
          + 'en fin de saison. Les salaires sont revus à la baisse et la moitié '
          + 'du vestiaire cherche déjà ailleurs.',
        finale: false,
      };

    default:
      return { joueur: j, emoji: '⚠️', titre: 'Incident', texte: motif, finale: false };
  }
}

// ---------------------------------------------------------------------------
// LES DÉRAPAGES SUR L'OVALE
// ---------------------------------------------------------------------------
// ⚠️ Trois familles de dérapages, et seulement celles-là. Le reste (clash,
// punchline, règlement de comptes) reste autorisé : c'est le ton du réseau
// voulu par le projet. Ici on ne sanctionne QUE ce qui, dans la vraie vie,
// termine devant une commission de discipline.
const DISCRIMINATION = [
  'raciste', 'racisme', 'négro', 'negro', 'bougnoule', 'youpin', 'sale arabe', 'sale noir',
  'sale juif', 'pédé', 'pede', 'tarlouze', 'sale pd', 'macaque', 'bamboula', 'nazi',
  'hitler', 'sale race', 'retourne dans ton pays', 'singe',
];
const DROGUE = [
  'cocaïne', 'cocaine', 'coke', 'héroïne', 'heroine', 'ecstasy', 'lsd', 'crack',
  'dopé', 'dopage', 'stéroïdes', 'steroides', 'epo', 'je me défonce', 'je me defonce',
];
const MENACES = [
  'je vais te tuer', 'je vais te crever', 'je te bute', 'balle dans la tête',
  'je sais où tu habites', 'je sais ou tu habites',
];

export type DerapageGrave = 'discrimination' | 'drogue' | 'menace' | null;

export function lireDerapage(texte: string): DerapageGrave {
  const t = texte.toLowerCase();
  if (DISCRIMINATION.some((m) => t.includes(m))) return 'discrimination';
  if (MENACES.some((m) => t.includes(m))) return 'menace';
  if (DROGUE.some((m) => t.includes(m))) return 'drogue';
  return null;
}

// Ce qu'un dérapage grave déclenche vraiment.
export function consequenceDuDerapage(d: Exclude<DerapageGrave, null>): {
  type: ConsequenceDure; semaines: number; motif: string; titre: string;
} {
  switch (d) {
    case 'discrimination':
      return {
        type: 'exclusionClub', semaines: 0,
        motif: 'propos discriminatoires publiés sur les réseaux',
        titre: 'Propos discriminatoires — le club rompt',
      };
    case 'menace':
      return {
        type: 'suspension', semaines: 12,
        motif: 'menaces publiques',
        titre: 'Menaces publiques — suspension',
      };
    case 'drogue':
      return {
        type: 'suspension', semaines: 18,
        motif: 'apologie de produits interdits',
        titre: 'Publication sur les stupéfiants — contrôle et suspension',
      };
  }
}
