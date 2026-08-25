// LA NÉGOCIATION D'UN CONTRAT — le club écrit, tu réponds, il tranche.
//
// Demande explicite : « j'aimerais refaire tout le système de transfert, que ça
// se passe par X : un club envoie un message et c'est à nous de négocier ».
//
// ⚠️ CE FICHIER NE REFAIT PAS LE MARCHÉ. `lib/offres.ts` décide DÉJÀ qui
// s'intéresse à toi et à quel prix — `cote()`, `besoinAuPoste()`, l'interdiction
// de sauter deux étages, le plafond qui dépend de l'âge, les salaires par âge.
// Tout ça est calibré et protégé par `verifMarche.ts` et `verifDifficulte.ts`.
// Ce qu'on ajoute ici, c'est la CONVERSATION : ce qui se passe entre le moment
// où un club se manifeste et celui où on signe.
//
// ⚠️ CE SONT LES CHIFFRES QUI TRANCHENT, PAS L'IA (décision de l'utilisateur).
// L'IA locale n'écrit que l'habillage des messages — jamais le montant, jamais le
// verdict. C'est le patron de tout le projet : « le MJ propose, le jeu dispose ».
// Un modèle qui fixe les salaires offre un jour 3 M€ à un joueur de Fédérale 2,
// et le mode SANS CLÉ n'aurait plus de marché du tout. Ici, tout marche hors
// ligne, à l'identique.
//
// ⚠️ LE PLAFOND DU CLUB N'EST JAMAIS MONTRÉ. C'est ce qui rend la négociation
// intéressante : on ne sait pas jusqu'où pousser. Il est calculé une fois, à la
// naissance de l'approche, et il ne bouge plus — sinon il suffirait de rouvrir
// la conversation pour retenter sa chance (« save-scumming »).

import type { Joueur, OffreContrat } from '../types';
import { agentDe } from '../data/agents';
import { graine } from './championnat';
import { pseudoStable } from './comptes';
import { nombre, t } from './i18n';

// ═══════════════════════════════════════════════════════════════════════════
// 1. UNE APPROCHE
// ═══════════════════════════════════════════════════════════════════════════

/** Ce qui est sur la table à un instant donné. */
export interface Termes {
  salaire: number;
  prime: number;
  /**
   * ⚠️ LE DÉFRAIEMENT PAR MATCH — ce que propose un club qui ne paie pas de
   * salaire. Retour de jeu : « certains clubs ne proposent pas de salaires, que
   * des primes ». En dessous de la Nationale 2, et dans les petits championnats
   * étrangers, `salaire` vaut 0 et c'est CE chiffre qui se négocie.
   * Optionnel : les approches d'une sauvegarde antérieure ne l'ont pas.
   */
  primeMatch?: number;
  saisons: number;
  /** Temps de jeu promis : ça se paie en confiance du staff à l'arrivée. */
  garantie: boolean;
}

/** Un club qui ne verse pas de salaire : tout se joue sur la feuille de match. */
export function estAmateur(t: Termes): boolean {
  return t.salaire <= 0 && (t.primeMatch ?? 0) > 0;
}

export type EtatApproche =
  | 'ouverte'   // la négociation est en cours
  | 'accord'    // on s'est mis d'accord — le transfert attend l'intersaison
  | 'rompue'    // le club s'est braqué, ou on a refusé
  | 'signee';   // le pré-accord a été appliqué (intersaison passée)

export interface Approche {
  id: string;
  /**
   * Le compte L'Ovale qui écrit.
   * ⚠️ C'EST LE PSEUDO DE L'ANNUAIRE (`pseudoStable(club, '_officiel')`), pas un
   * identifiant inventé ici. Bug attrapé en jeu : avec un `club:<nom>` maison,
   * la messagerie ne retrouvait pas le compte dans l'annuaire et la
   * conversation n'apparaissait tout simplement pas — le club écrivait dans le
   * vide.
   */
  pseudo: string;
  club: string;
  division: string;
  divisionNom: string;
  pays: string;
  noteClub: number;
  etranger: boolean;
  /** Vrai si c'est le club actuel qui propose de prolonger. */
  prolongation: boolean;
  /** L'offre COURANTE, celle qu'on peut accepter. */
  offre: Termes;
  /**
   * ⚠️ CE QUE LE CLUB NE DÉPASSERA JAMAIS. Jamais affiché : c'est l'inconnue de
   * la négociation. Calculé une fois, à la naissance de l'approche.
   */
  plafond: Termes;
  /** Tours de discussion restants avant que le club se braque. */
  patience: number;
  etat: EtatApproche;
  saison: number;
  semaine: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LES LEVIERS — ce qu'on peut demander
// ═══════════════════════════════════════════════════════════════════════════
// Quatre, et seulement quatre. Une liste plus longue donnerait un formulaire ;
// ici on veut une conversation où chaque demande coûte quelque chose.

export type Levier = 'salaire' | 'prime' | 'duree' | 'garantie';

export interface DefinitionLevier {
  id: Levier;
  nom: string;
  emoji: string;
  /** Ce que le joueur dit, en clair — sert de repli quand il n'y a pas de clé. */
  phrase: string;
  /** Ce qu'on demande, appliqué aux termes courants. */
  demander: (t: Termes) => Termes;
  /** Ce que ça coûte en patience. Le temps de jeu agace plus qu'un chiffre. */
  cout: number;
}

export const LEVIERS: DefinitionLevier[] = [
  {
    id: 'salaire', nom: 'Plus de salaire', emoji: '💰',
    phrase: 'Le projet me parle, mais pas le salaire. Il faut faire un effort là-dessus.',
    // ⚠️ CHEZ UN CLUB AMATEUR, IL N'Y A PAS DE SALAIRE À AUGMENTER : ×1,18 sur
    // zéro fait zéro, et le levier le plus utilisé du jeu devenait un bouton
    // mort. On négocie alors ce qui est réellement sur la table — le
    // défraiement par feuille de match.
    demander: (t) => (estAmateur(t)
      ? { ...t, primeMatch: Math.round((t.primeMatch ?? 0) * 1.18) }
      : { ...t, salaire: Math.round(t.salaire * 1.18) }),
    cout: 1,
  },
  {
    id: 'prime', nom: 'Une prime à la signature', emoji: '✍️',
    phrase: 'Je peux m’aligner sur le salaire si vous mettez quelque chose à la signature.',
    // Un club du dimanche n'a pas 2 000 € de trésorerie pour une signature : le
    // plancher suit ce que la saison rapporterait vraiment.
    demander: (t) => ({
      ...t,
      prime: estAmateur(t)
        ? Math.max(120, Math.round(t.prime * 1.6 + (t.primeMatch ?? 0) * 2.4))
        : Math.max(2000, Math.round(t.prime * 1.6 + t.salaire * 0.12)),
    }),
    cout: 1,
  },
  {
    id: 'duree', nom: 'Un contrat plus long', emoji: '📅',
    phrase: 'Je ne viens pas pour un an. Engagez-vous sur la durée et on avance.',
    demander: (t) => ({ ...t, saisons: Math.min(5, t.saisons + 1) }),
    cout: 1,
  },
  {
    id: 'garantie', nom: 'Du temps de jeu garanti', emoji: '🎽',
    phrase: 'Ce que je veux savoir, c’est si je joue. Je ne viens pas cirer le banc.',
    demander: (t) => ({ ...t, garantie: true }),
    // ⚠️ Le plus cher : un club déteste s'engager sur une feuille de match, et
    // c'est ce qui rend ce levier fort. Le demander deux fois braque presque à
    // coup sûr.
    cout: 2,
  },
];

export const LEVIER_PAR_ID: Record<Levier, DefinitionLevier> =
  Object.fromEntries(LEVIERS.map((l) => [l.id, l])) as Record<Levier, DefinitionLevier>;

export function nomLevier(id: Levier): string {
  return t(`nego.levier.${id}.nom`);
}

export function phraseLevier(id: Levier): string {
  return t(`nego.levier.${id}.phrase`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. NAÎTRE — d'une offre du marché à une approche négociable
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ LE PREMIER MOT DU CLUB EST EN DESSOUS DE CE QU'IL PEUT METTRE, sinon il n'y
 * a rien à négocier. `genererOffres` donne le montant JUSTE pour ce joueur et ce
 * club : on ouvre en dessous et on garde la marge en réserve. Négocier
 * parfaitement rend donc un peu plus que l'ancien panneau « Choix de carrière »,
 * mal négocier rend moins — c'est l'intérêt.
 */
const OUVERTURE = 0.86;

/** Ce que le club peut monter au-dessus de son offre juste, au maximum. */
const MARGE_CLUB = 0.3;

export function approcheDepuisOffre(
  o: OffreContrat, j: Joueur, semaine: number, prolongation = false,
): Approche {
  // Déterministe : même club, même saison → même marge de manœuvre. Rouvrir la
  // conversation ne redonne donc jamais une meilleure main.
  const rng = graine(`nego#${o.club}#${j.saison}#${j.nom}`);
  const agent = agentDe(j.agent);

  // L'agent négocie POUR toi : c'est là qu'il gagne sa commission.
  const marge = MARGE_CLUB * (0.7 + rng() * 0.6) * agent.salaire;
  const base: Termes = {
    salaire: Math.round(o.salaire * OUVERTURE),
    prime: Math.round(o.prime * OUVERTURE),
    primeMatch: Math.round((o.primeMatch ?? 0) * OUVERTURE),
    saisons: o.saisons,
    garantie: false,
  };
  return {
    id: `app-${o.club}-${j.saison}-${semaine}`,
    pseudo: pseudoStable(o.club, '_officiel'),
    club: o.club,
    division: o.division,
    divisionNom: o.divisionNom,
    pays: o.pays,
    noteClub: o.noteClub,
    etranger: o.etranger,
    prolongation,
    offre: base,
    plafond: {
      salaire: Math.round(o.salaire * (1 + marge)),
      prime: Math.round(
        Math.max(o.prime, o.salaire * 0.1, (o.primeMatch ?? 0) * 2.5) * (1 + marge * 2),
      ),
      primeMatch: Math.round((o.primeMatch ?? 0) * (1 + marge)),
      // Un club s'engage rarement au-delà de ce qu'il a proposé + 1 an, et
      // jamais plus de 5 : au-delà, c'est le joueur qui devient un risque.
      saisons: Math.min(5, o.saisons + (rng() < 0.55 ? 1 : 0)),
      // ⚠️ Le temps de jeu garanti n'est PAS toujours accordable. Un club qui a
      // déjà mieux que toi à ton poste ne le promettra jamais — c'est la seule
      // chose qu'il ne peut pas acheter.
      garantie: rng() < 0.5 + (agent.salaire - 1) * 1.2,
    },
    // Trois tours, un de plus avec un bon agent. Assez pour tenter deux
    // demandes, pas assez pour tout obtenir.
    patience: agent.salaire >= 1.1 ? 4 : 3,
    etat: 'ouverte',
    saison: j.saison,
    semaine,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LE VERDICT DU CLUB
// ═══════════════════════════════════════════════════════════════════════════

export type Verdict = 'accepte' | 'contre' | 'rompt';

export interface Reponse {
  verdict: Verdict;
  /** L'approche mise à jour — c'est elle qu'on range dans le store. */
  approche: Approche;
  /** Ce que le club répond, en clair (repli sans IA locale). */
  texte: string;
}

function sous(t: Termes, p: Termes): boolean {
  return t.salaire <= p.salaire && t.prime <= p.prime
    && (t.primeMatch ?? 0) <= (p.primeMatch ?? 0)
    && t.saisons <= p.saisons && (!t.garantie || p.garantie);
}

/** À mi-chemin entre ce qu'on demande et ce qui est sur la table, sans dépasser. */
function contreProposition(demande: Termes, courant: Termes, plafond: Termes): Termes {
  return {
    salaire: Math.min(plafond.salaire, Math.round((demande.salaire + courant.salaire) / 2)),
    prime: Math.min(plafond.prime, Math.round((demande.prime + courant.prime) / 2)),
    primeMatch: Math.min(
      plafond.primeMatch ?? 0,
      Math.round(((demande.primeMatch ?? 0) + (courant.primeMatch ?? 0)) / 2),
    ),
    saisons: Math.min(plafond.saisons, demande.saisons),
    garantie: demande.garantie && plafond.garantie,
  };
}

const MONNAIE = (n: number) => `${nombre(n)} €`;

/** Le club répond à une demande. PURE : elle ne touche à rien. */
export function repondreAuClub(a: Approche, levier: Levier): Reponse {
  if (a.etat !== 'ouverte') {
    return { verdict: 'rompt', approche: a, texte: t('nego.close') };
  }
  const def = LEVIER_PAR_ID[levier];
  const demande = def.demander(a.offre);
  const patience = a.patience - def.cout;

  // ⚠️ ON REGARDE LA DEMANDE AVANT LA PATIENCE. Une demande raisonnable passe
  // même au dernier tour : c'est le club qui se braque quand on pousse trop
  // loin, pas quand on discute.
  if (sous(demande, a.plafond)) {
    const approche = { ...a, offre: demande, patience: Math.max(0, patience) };
    return {
      verdict: 'accepte',
      approche,
      texte: levier === 'garantie'
        ? t('nego.accepte.garantie')
        : levier === 'duree'
          ? t(demande.saisons > 1 ? 'nego.accepte.duree.pluriel' : 'nego.accepte.duree', { n: demande.saisons })
          : levier === 'prime'
            ? t('nego.accepte.prime', { montant: MONNAIE(demande.prime) })
            : estAmateur(demande)
              ? t('nego.accepte.primeMatch', { montant: MONNAIE(demande.primeMatch ?? 0) })
              : t('nego.accepte.salaire', { montant: MONNAIE(demande.salaire) }),
    };
  }

  // Hors du plafond, et plus de patience : le club claque la porte.
  if (patience <= 0) {
    return {
      verdict: 'rompt',
      approche: { ...a, etat: 'rompue', patience: 0 },
      texte: t('nego.rompt'),
    };
  }

  // Hors du plafond mais il reste du temps : on coupe la poire en deux.
  const contre = contreProposition(demande, a.offre, a.plafond);
  const bouge = contre.salaire > a.offre.salaire || contre.prime > a.offre.prime
    || (contre.primeMatch ?? 0) > (a.offre.primeMatch ?? 0)
    || contre.saisons > a.offre.saisons || (contre.garantie && !a.offre.garantie);
  return {
    verdict: 'contre',
    approche: { ...a, offre: bouge ? contre : a.offre, patience },
    texte: bouge
      ? t('nego.contre', { termes: resumerTermes(contre) })
      : levier === 'garantie'
        ? t('nego.refusGarantie')
        : t('nego.refus'),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. CE QUE ÇA DONNE À L'ARRIVÉE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le résumé lisible d'une offre — utilisé dans les DM et le journal.
 *
 * ⚠️ UN CLUB AMATEUR N'ANNONCE PAS « 0 € PAR SAISON ». C'est exact, et ça se lit
 * comme un bug. Ce qu'il met sur la table, c'est un défraiement par feuille de
 * match : on le dit tel quel, avec ce que ça vaut sur une saison pleine.
 */
export function resumerTermes(termes: Termes): string {
  const duree = `${termes.saisons} ${termes.saisons > 1 ? t('nego.saisons') : t('nego.saison')}`;
  const tete = estAmateur(termes)
    ? `${t('nego.sansSalaire')} · ${MONNAIE(termes.primeMatch ?? 0)} ${t('nego.parMatch')} · ${duree}`
    : `${MONNAIE(termes.salaire)} ${t('nego.parSaison')} · ${duree}`;
  return tete
    + (termes.prime > 0 ? ` · ${MONNAIE(termes.prime)} ${t('nego.signature')}` : '')
    + (termes.garantie ? ` · ${t('nego.garantie')}` : '');
}

/**
 * La confiance du staff à l'arrivée. Une garantie de temps de jeu, c'est un
 * coach qui t'attend — et ça se lit sur la feuille de match dès la première
 * journée (`chanceTitulaire` dans le store lit `confianceCoach`).
 */
export function confianceALArrivee(t: Termes, prolongation: boolean): number {
  if (prolongation) return 0; // 0 = on ne touche pas à l'existant
  return t.garantie ? 68 : 50;
}
