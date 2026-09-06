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

import type { ActionClub, Blessure, ConsequenceDure, Joueur } from '../types.js';

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
          blessure: { nom: `Suspension : ${motif}`, gravite: 'saison', semaines },
          moral: borne(j.moral - 20),
          reputation: borne(j.reputation - 15),
          confianceCoach: borne((j.confianceCoach ?? 50) - 25),
        },
        emoji: '⛔',
        titre: `Suspension : ${semaines} semaines`,
        texte: `La commission de discipline te suspend ${semaines} semaines pour ${motif}. `
          + 'Tu ne peux plus jouer, tu continues de t’entraîner à part, et tout le monde en parle.',
        finale: false,
      };

    // ── Prison : le contrat est suspendu, le club prend ses distances ───────
    case 'prison':
      return {
        joueur: {
          ...j,
          blessure: { nom: `Détention : ${motif}`, gravite: 'saison', semaines },
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
          blessure: { nom: `Accident : ${motif}`, gravite: 'saison', semaines },
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
          + 'Tu rejoueras, mais pas tout à fait le même joueur.',
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

    // ── Blessure : le corps lâche, sans faute morale ───────────────────────
    // ⚠️ LA SEULE CONSÉQUENCE QUI NE SANCTIONNE RIEN. Elle existe parce que le
    // MJ doit pouvoir casser un joueur qui force sur une séance, joue sur une
    // cheville douteuse ou part au contact la tête la première — sans devoir
    // choisir entre « rien du tout » et « fin de carrière ». La gravité se
    // déduit de la durée, et `lib/ia.ts` la borne à 10 semaines quand la scène
    // n'était pas dangereuse.
    case 'blessure': {
      const semainesBlessure = Math.max(1, Math.round(semaines));
      const gravite: Blessure['gravite'] = semainesBlessure <= 3
        ? 'legere' : semainesBlessure <= 10 ? 'moyenne' : 'saison';
      const degats = gravite === 'legere'
        ? { forme: -8, moral: -4 }
        : gravite === 'moyenne' ? { forme: -22, moral: -12 } : { forme: -40, moral: -25 };
      return {
        joueur: {
          ...j,
          blessure: { nom: motif, gravite, semaines: semainesBlessure },
          forme: borne(j.forme + degats.forme),
          moral: borne(j.moral + degats.moral),
        },
        emoji: '🩼',
        titre: `Blessure : ${semainesBlessure} semaine${semainesBlessure > 1 ? 's' : ''}`,
        texte: `${motif}. Le staff médical annonce ${semainesBlessure} semaine`
          + `${semainesBlessure > 1 ? 's' : ''} d’indisponibilité : `
          + (gravite === 'legere'
            ? 'des soins, du vélo, et tu reprends.'
            : gravite === 'moyenne'
              ? 'tu perds ta place, et il faudra la reprendre.'
              : 'opération, rééducation, et une saison à regarder les autres jouer.'),
        finale: false,
      };
    }

    // ── Exclusion : plus de club, plus de contrat, plus de salaire ─────────
    // ⚠️ LE CONTRAT N'EST PLUS EFFACÉ, IL EST MIS À ZÉRO. Avec `contrat:
    // undefined`, `contratBloque()` (store) lisait `?? 1` et concluait que tout
    // allait bien : le joueur continuait de jouer pour le club qui venait de le
    // virer, et `saisonSuivante` lui refabriquait un contrat à l'intersaison.
    // Autrement dit, l'exclusion ne faisait rien. Un contrat à 0 saison et 0 €
    // met VRAIMENT le joueur au chômage : le calendrier s'arrête, le marché
    // s'ouvre, et il ne rejoue qu'après avoir signé ailleurs.
    case 'exclusionClub':
      return {
        joueur: {
          ...j,
          contrat: j.contrat
            ? { ...j.contrat, saisons: 0, salaire: 0 }
            : { club: j.club, division: j.division ?? '', saisons: 0, salaire: 0 },
          capitaine: false,
          moral: borne(j.moral - 25),
          reputation: borne(j.reputation - 12),
          popularite: borne((j.popularite ?? 50) - 10),
          confianceCoach: 20,
        },
        emoji: '📄',
        titre: 'Licencié par le club',
        texte: `Le club rompt ton contrat : ${motif}. Tu es libre, sans salaire, `
          + 'sans club, et avec une ligne de plus sur ton dossier. '
          + 'Tant que tu n’as pas resigné ailleurs, tu ne joues plus une minute.',
        finale: false,
      };

    // ── Radiation : la fédération te retire ta licence, à vie ──────────────
    // ⚠️ LA SANCTION LA PLUS LOURDE DU JEU, et la seule qui ferme la porte de
    // TOUS les clubs à la fois. Demande explicite : « toute action qui porte
    // atteinte au club ou à son image, c'est l'exclusion — ou le bannissement
    // du rugby ». Une exclusion se rattrape en signant ailleurs ; une radiation
    // ne se rattrape pas.
    case 'banRugby':
      return {
        joueur: {
          ...j,
          contrat: j.contrat
            ? { ...j.contrat, saisons: 0, salaire: 0 }
            : { club: j.club, division: j.division ?? '', saisons: 0, salaire: 0 },
          capitaine: false,
          blessure: { nom: `Radiation : ${motif}`, gravite: 'carriere', semaines: 99 },
          moral: borne(j.moral - 45),
          reputation: borne(j.reputation - 40),
          popularite: borne((j.popularite ?? 50) - 35),
          confianceCoach: 0,
        },
        emoji: '🚫',
        titre: 'Radié à vie',
        texte: `La commission de discipline de la fédération te RADIE : ${motif}. `
          + 'Licence retirée, contrat rompu, aucun club au monde ne peut plus t’aligner. '
          + 'Ta carrière s’arrête ici, et ce n’est pas le terrain qui en a décidé.',
        finale: true,
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

// ⚠️ LA QUATRIÈME FAMILLE, DEMANDÉE EXPLICITEMENT : « toute action qui porte
// atteinte au club ou à son image, c'est l'exclusion ». Elle ne se lit pas
// comme les trois autres — il n'existe pas de liste de mots « atteinte à
// l'image ». Il faut une CIBLE (le club, le président, le staff, le maillot, le
// sponsor, les supporters) ET un acte hostile dirigé contre elle. « Je clashe
// l'arbitre » n'est pas une atteinte au club ; « je traite le président de
// voleur devant les caméras » en est une.
const CIBLES_CLUB = [
  'club', 'président', 'president', 'direction', 'dirigeant', 'staff', 'coach',
  'entraîneur', 'entraineur', 'maillot', 'blason', 'écusson', 'ecusson', 'sponsor',
  'partenaire', 'supporters', 'supporteurs', 'vestiaire', 'institution', 'centre de formation',
];
const ACTES_HOSTILES = [
  'insulte', 'insulter', 'insulté', 'traite de', 'traiter de', 'traité de',
  'crache', 'cracher', 'craché', 'balance', 'balancer', 'balancé', 'trahi', 'trahir',
  'sabote', 'saboter', 'sabotage', 'humilie', 'humilier', 'humiliation',
  'ridiculise', 'ridiculiser', 'démolis', 'demolis', 'démolir', 'demolir',
  'incendie', 'incendier', 'dénigre', 'denigre', 'dénigrer', 'denigrer',
  'vole', 'voler', 'volé', 'détourne', 'detourne', 'détourner', 'detourner',
  'menace', 'menacer', 'frappe', 'frapper', 'frappé', 'agresse', 'agresser',
  'escroque', 'escroquer', 'salis', 'salir', 'sali', 'casse la gueule', 'poings',
  'me fous de', 'nique', 'niquer', 'merde', 'connard', 'enfoiré', 'enfoire', 'fils de pute',
];
// Actes qui se suffisent à eux-mêmes : pas besoin de nommer le club, ils
// mettent déjà tout le monde en commission de discipline.
const ACTES_GRAVES = [
  'match truqué', 'match truque', 'truquer le match', 'truque le match',
  'parie sur mon match', 'parier sur mon match', 'parie sur le match',
  'vends le match', 'vendre le match', 'pari truqué', 'corruption', 'pot-de-vin',
  'dopage', 'me dope', 'je me dope', 'anabolisant', 'stéroïde', 'steroide', 'epo',
  'contrôle antidopage positif', 'controle antidopage positif',
];
const ACTES_CRIMINELS = [
  'au volant bourré', 'au volant bourre', 'je conduis bourré', 'je conduis bourre',
  'prends le volant bourré', 'prends le volant bourre', 'conduis ivre', 'volant ivre',
  'délit de fuite', 'delit de fuite', 'coup de couteau', 'couteau', 'arme à feu',
  'arme a feu', 'flingue', 'braquage', 'cambriolage', 'trafic', 'je deale', 'dealer',
  'agression sexuelle', 'je le tabasse', 'tabasser', 'je le défonce', 'je le defonce',
];

/**
 * LE NIVEAU DE FAUTE DE CE QUE LE JOUEUR A ÉCRIT.
 *
 * ⚠️ CE N'EST PAS UN JUGE, C'EST UN TROUSSEAU DE CLÉS. Il n'inflige rien : il
 * dit seulement quelles portes le MJ a le droit d'ouvrir sur cette réponse
 * (`consequenceAutorisee`). La sanction reste décidée par le modèle, qui lit le
 * contexte ; le code, lui, garantit qu'on ne peut pas être licencié pour avoir
 * répondu « je vais m'entraîner ».
 */
export type NiveauFaute = 'image' | 'grave' | 'criminel';

export function niveauDeFaute(texte: string): NiveauFaute | null {
  const t = texte.toLowerCase();
  if (ACTES_CRIMINELS.some((m) => t.includes(m))) return 'criminel';
  if (ACTES_GRAVES.some((m) => t.includes(m))) return 'grave';
  // ⚠️ `lireDerapage` répond aussi « atteinteClub », et il ne faut SURTOUT pas
  // la traiter comme une insulte raciste : traiter le président de voleur est
  // une faute d'image (licenciement possible), pas une faute qui ouvre la
  // radiation à vie. Sans cette distinction, les deux niveaux se confondaient.
  const derapage = lireDerapage(texte);
  if (derapage === 'atteinteClub') return 'image';
  if (derapage) return 'grave';
  return null;
}

// Ce que chaque niveau de faute autorise. Une exclusion se rattrape ; une
// radiation, non — d'où l'échelle.
const PORTES: Record<NiveauFaute, ConsequenceDure[]> = {
  image: ['blessure', 'suspension', 'exclusionClub'],
  grave: ['blessure', 'suspension', 'exclusionClub', 'banRugby'],
  criminel: ['blessure', 'suspension', 'exclusionClub', 'banRugby', 'prison', 'accident'],
};

/**
 * Le MJ a-t-il le droit d'infliger CETTE conséquence sur CETTE réponse ?
 *
 * Deux clés, et deux seulement :
 *   1. la scène était DANGEREUSE (`risque`) — c'est la règle historique : le
 *      jeu prévient avant de pouvoir tuer ;
 *   2. ou bien la réponse du joueur est ELLE-MÊME la faute (`niveauDeFaute`) —
 *      c'est la demande explicite : porter atteinte au club ou à son image,
 *      c'est l'exclusion, même si la semaine avait l'air tranquille.
 *
 * Une blessure passe toujours : elle ne sanctionne personne (sa gravité, elle,
 * est bornée par l'appelant).
 */
export function consequenceAutorisee(
  c: ConsequenceDure, risque: boolean, faute: NiveauFaute | null,
): boolean {
  if (c === 'blessure') return true;
  if (risque) return true;
  return !!faute && PORTES[faute].includes(c);
}

export type DerapageGrave = 'discrimination' | 'drogue' | 'menace' | 'atteinteClub' | null;

export function lireDerapage(texte: string): DerapageGrave {
  const t = texte.toLowerCase();
  if (DISCRIMINATION.some((m) => t.includes(m))) return 'discrimination';
  if (MENACES.some((m) => t.includes(m))) return 'menace';
  if (DROGUE.some((m) => t.includes(m))) return 'drogue';
  // ⚠️ EN DERNIER, ET C'EST VOULU. Les trois familles au-dessus sont des mots
  // interdits ; celle-ci demande une cible ET un acte, donc elle ne doit jamais
  // souffler la place à une insulte raciste qui, elle, vaut plus cher.
  if (CIBLES_CLUB.some((m) => t.includes(m)) && ACTES_HOSTILES.some((m) => t.includes(m))) {
    return 'atteinteClub';
  }
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
        titre: 'Propos discriminatoires, le club rompt',
      };
    case 'menace':
      return {
        type: 'suspension', semaines: 12,
        motif: 'menaces publiques',
        titre: 'Menaces publiques, suspension',
      };
    case 'drogue':
      return {
        type: 'suspension', semaines: 18,
        motif: 'apologie de produits interdits',
        titre: 'Publication sur les stupéfiants, contrôle et suspension',
      };
    case 'atteinteClub':
      return {
        type: 'exclusionClub', semaines: 0,
        motif: 'publication portant atteinte au club et à son image',
        titre: 'Tu as sali ton club en public, le club rompt',
      };
  }
}

// ---------------------------------------------------------------------------
// CE QUE LE CLUB DONNE, ET CE QU'IL REPREND
// ---------------------------------------------------------------------------
// Demande explicite : « augmentation, prime de match ». Ça n'existait nulle
// part — le MJ ne pouvait que verser de l'argent d'un coup (`deltas.argent`),
// jamais toucher au CONTRAT. Une augmentation change le salaire annuel, donc
// tout ce qui en dépend : la cote, les offres, le plafond des gains du MJ.
//
// ⚠️ COMME PARTOUT : LE MJ PROPOSE, LE CODE DISPOSE. Les montants ci-dessous
// sont bornés au salaire réel du joueur. Un joueur de Fédérale 3 ne décroche
// pas 40 000 € de prime parce qu'il a bien écrit sa réponse.

export type { ActionClub };

export interface EffetClub {
  joueur: Joueur;
  emoji: string;
  titre: string;
  texte: string;
  /** Montant réellement retenu, après plafonnement (toujours positif). */
  montant: number;
}

/** Salaire de référence, y compris pour un joueur sans contrat. */
function salaireDe(j: Joueur): number {
  return Math.max(0, j.contrat?.salaire ?? 0);
}

export function appliquerActionClub(
  j: Joueur, type: ActionClub, montantBrut: number, motif: string,
): EffetClub | null {
  const salaire = salaireDe(j);
  const montant = Math.abs(Math.round(montantBrut));

  switch (type) {
    // ── Le club remet la main à la poche ───────────────────────────────────
    case 'augmentation': {
      // Sans contrat, il n'y a rien à augmenter : c'est une signature qu'il
      // faut, et ça passe par le marché.
      if (!j.contrat || salaire <= 0) return null;
      // De 3 % à 35 % du salaire annuel. Au-delà, ce n'est plus une
      // augmentation, c'est un nouveau contrat — et ça se négocie sur L'Ovale.
      const hausse = Math.max(
        Math.round(salaire * 0.03),
        Math.min(montant || Math.round(salaire * 0.08), Math.round(salaire * 0.35)),
      );
      const arrondie = Math.max(100, Math.round(hausse / 100) * 100);
      const nouveau = salaire + arrondie;
      return {
        joueur: {
          ...j,
          contrat: { ...j.contrat, salaire: nouveau },
          moral: borne(j.moral + 8),
          confianceCoach: borne((j.confianceCoach ?? 50) + 5),
        },
        emoji: '📈',
        titre: 'Salaire revalorisé',
        texte: `${motif} Le club revoit ton contrat à la hausse : `
          + `+${arrondie.toLocaleString('fr-FR')} € par saison, soit `
          + `${nouveau.toLocaleString('fr-FR')} € annuels. Le reste du contrat ne bouge pas.`,
        montant: arrondie,
      };
    }

    // ── La prime de match : une performance qui se paie tout de suite ──────
    case 'prime': {
      // 20 % du salaire annuel au maximum. Pour un amateur sans salaire, une
      // prime de match reste une enveloppe de quelques centaines d'euros.
      const plafond = Math.max(400, Math.round(salaire * 0.2));
      const verse = Math.max(50, Math.min(montant || Math.round(plafond / 2), plafond));
      return {
        joueur: {
          ...j,
          argent: Math.max(0, j.argent + verse),
          moral: borne(j.moral + 4),
        },
        emoji: '💰',
        titre: 'Prime de match',
        texte: `${motif} Le club te verse ${verse.toLocaleString('fr-FR')} € de prime.`,
        montant: verse,
      };
    }

    // ── L'amende interne : le club sanctionne sans licencier ───────────────
    case 'amende': {
      const plafond = Math.max(150, Math.round(salaire * 0.15));
      const preleve = Math.max(50, Math.min(montant || Math.round(plafond / 2), plafond));
      return {
        joueur: {
          ...j,
          argent: Math.max(0, j.argent - preleve),
          moral: borne(j.moral - 6),
          confianceCoach: borne((j.confianceCoach ?? 50) - 10),
        },
        emoji: '⚖️',
        titre: 'Amende interne',
        texte: `${motif} Le club te met à l’amende : `
          + `${preleve.toLocaleString('fr-FR')} € prélevés sur ta prochaine paie.`,
        montant: preleve,
      };
    }
  }
}
