// ═══════════════════════════════════════════════════════════════════════════
// LES INFRASTRUCTURES ET LE CONSEIL D'ADMINISTRATION
// ═══════════════════════════════════════════════════════════════════════════
// Demande : onze bâtiments plutôt qu'un bouton « améliorer stade », des coûts
// « de plus en plus chers », des délais en mois, et surtout :
//
//   « Une mécanique que j'ajouterais absolument : le conseil d'administration.
//     Je ne laisserais pas le manager dépenser librement l'argent du club […]
//     Ça évite que le jeu devienne "j'ai 10 M€ donc je clique niveau 10". »
//
// ⚠️ CETTE DERNIÈRE PHRASE EST LA RAISON D'ÊTRE DU FICHIER. Sans conseil, une
// bonne saison se convertit mécaniquement en béton, et la seule décision qui
// reste est l'ordre des achats. Avec lui, il faut défendre un projet, accepter
// de le réduire, aller chercher un naming ou la mairie — et parfois attendre un
// an. C'est ça, diriger un club.

import { graine } from './championnat';
import { capacite } from './stade';
import type { Stade } from './stade';

export type Batiment =
  | 'stade' | 'terrain' | 'musculation' | 'medical' | 'formation'
  | 'academie' | 'siege' | 'boutique' | 'buvettes' | 'hospitalites' | 'parking';

export interface DefinitionBatiment {
  id: Batiment;
  emoji: string;
  niveauMax: number;
  /** Ce qu'il coûte au premier palier, avant l'échelle de l'étage. */
  coutBase: number;
  /** Mois de travaux au premier palier. */
  moisBase: number;
}

export const BATIMENTS: DefinitionBatiment[] = [
  { id: 'stade', emoji: '🏟️', niveauMax: 10, coutBase: 260_000, moisBase: 8 },
  { id: 'terrain', emoji: '🌱', niveauMax: 10, coutBase: 55_000, moisBase: 4 },
  { id: 'musculation', emoji: '🏋️', niveauMax: 10, coutBase: 38_000, moisBase: 3 },
  { id: 'medical', emoji: '🏥', niveauMax: 10, coutBase: 42_000, moisBase: 4 },
  { id: 'formation', emoji: '🎓', niveauMax: 10, coutBase: 70_000, moisBase: 6 },
  { id: 'academie', emoji: '🔎', niveauMax: 10, coutBase: 30_000, moisBase: 3 },
  { id: 'siege', emoji: '🏢', niveauMax: 5, coutBase: 46_000, moisBase: 5 },
  { id: 'boutique', emoji: '🛍️', niveauMax: 5, coutBase: 24_000, moisBase: 3 },
  { id: 'buvettes', emoji: '🍺', niveauMax: 5, coutBase: 16_000, moisBase: 2 },
  { id: 'hospitalites', emoji: '💎', niveauMax: 5, coutBase: 90_000, moisBase: 6 },
  { id: 'parking', emoji: '🅿️', niveauMax: 5, coutBase: 20_000, moisBase: 3 },
];

export function batiment(id: Batiment): DefinitionBatiment {
  return BATIMENTS.find((b) => b.id === id) ?? BATIMENTS[0];
}

export type NiveauxInfrastructures = Record<Batiment, number>;

/** Un club de village n'a rien : ni boutique, ni loges, ni salle. */
export function infrastructuresDeBase(niveau: number): NiveauxInfrastructures {
  const socle = Math.max(1, Math.round(9 - niveau * 0.85));
  const annexe = Math.max(0, Math.round(4.5 - niveau * 0.55));
  return {
    stade: socle, terrain: socle, musculation: socle, medical: socle,
    formation: socle, academie: socle, siege: Math.min(5, annexe + 1),
    boutique: annexe, buvettes: Math.min(5, annexe + 1),
    hospitalites: Math.max(0, annexe - 1), parking: annexe,
  };
}

/**
 * LE PRIX D'UN PALIER.
 *
 * Demande : « chaque amélioration coûterait de plus en plus cher », avec ses
 * deux exemples — 240 000 € pour passer une salle de musculation de 4 à 5 dans
 * un club modeste, 6,5 M€ pour un centre d'entraînement de 9 à 10 en Top 14.
 *
 * ⚠️ LA COURBE EST EXPONENTIELLE, ET C'EST CE QUI CRÉE L'ARBITRAGE PERMANENT
 * « recruter maintenant ou investir pour le futur ». Une courbe linéaire aurait
 * rendu le dernier palier accessible dès qu'on a de l'argent, et il n'y aurait
 * plus rien à construire au bout de trois saisons.
 */
export function coutDuPalier(id: Batiment, niveauActuel: number): number | null {
  const b = batiment(id);
  const vise = niveauActuel + 1;
  if (vise > b.niveauMax) return null;
  const brut = b.coutBase * 1.62 ** (vise - 1);
  return Math.round(brut / 5_000) * 5_000;
}

/** Les travaux durent, et ça compte : on ne bâtit pas pendant le mercato. */
export function dureeDuPalier(id: Batiment, niveauActuel: number): number {
  const b = batiment(id);
  return Math.round(b.moisBase + (niveauActuel + 1) * 1.15);
}

/** Ce qu'un bâtiment coûte à faire tourner chaque saison, une fois construit. */
export function entretienAnnuel(niveaux: NiveauxInfrastructures): number {
  let t = 0;
  for (const b of BATIMENTS) t += coutDuPalier(b.id, niveaux[b.id] - 1) ?? 0;
  // ~3,5 % de la valeur construite, chaque année, quoi qu'il arrive.
  return Math.round((t * 0.035) / 1_000) * 1_000;
}

// ---------------------------------------------------------------------------
// CONSTRUIRE OU AGRANDIR UN STADE
// ---------------------------------------------------------------------------
// « Ça, j'en ferais un événement majeur dans une carrière. […] Si tu descends
// juste après… tu peux être dans une merde financière monumentale 😭. Et c'est
// justement intéressant dans un jeu de gestion. »

export type ProjetStade = 'louer' | 'renover' | 'construire';

export interface Financement {
  fondsPropres: number;
  banque: number;
  ville: number;
  naming: number;
}

export interface DossierStade {
  type: ProjetStade;
  placesGagnees: number;
  cout: number;
  mois: number;
  financement: Financement;
  /** L'annuité à rembourser, et pendant combien de saisons. */
  annuite: number;
  saisonsDeDette: number;
}

export const DUREE_EMPRUNT = 15;
export const TAUX_EMPRUNT = 0.038;

/**
 * ⚠️ LA MAIRIE NE PAIE PAS PAREIL PARTOUT, et c'est ce qui rend la construction
 * atteignable en bas de pyramide. Une commune finance volontiers un équipement
 * de deux mille places qui sert au village ; elle ne met pas quinze millions
 * dans une enceinte de Top 14. Sans cette part, aucun club de Fédérale ne
 * pourrait jamais sortir de son stade municipal, et la promesse « partir de
 * Régionale 3 et construire un énorme club » serait fausse.
 */
export function dossierStade(
  club: string,
  stade: Stade,
  type: ProjetStade,
  placesVoulues: number,
  tresorerie: number,
  niveau: number,
): DossierStade {
  const rng = graine(`stadeProjet#${club}#${type}#${placesVoulues}`);
  const parPlace = type === 'construire' ? 2_100 + rng() * 700 : 1_250 + rng() * 500;
  const base = type === 'construire'
    ? (capacite(stade) + placesVoulues) * parPlace
    : placesVoulues * parPlace;
  const cout = Math.round(base / 50_000) * 50_000;
  const mois = type === 'construire' ? 30 + Math.round(placesVoulues / 900)
    : 8 + Math.round(placesVoulues / 260);

  const partVille = Math.max(0.05, 0.42 - niveau * 0.01 - Math.min(0.22, cout / 90_000_000));
  const ville = Math.round(cout * partVille);
  const naming = type === 'construire' ? Math.round(cout * (0.10 + rng() * 0.08)) : 0;
  const fondsPropres = Math.min(Math.max(0, tresorerie * 0.7), cout - ville - naming);
  const banque = Math.max(0, cout - ville - naming - fondsPropres);

  // Annuité constante : capital + intérêts sur quinze ans.
  const t = TAUX_EMPRUNT;
  const annuite = banque > 0
    ? Math.round((banque * t) / (1 - (1 + t) ** -DUREE_EMPRUNT) / 1_000) * 1_000
    : 0;

  return {
    type,
    placesGagnees: placesVoulues,
    cout,
    mois,
    financement: { fondsPropres: Math.round(fondsPropres), banque: Math.round(banque), ville, naming },
    annuite,
    saisonsDeDette: banque > 0 ? DUREE_EMPRUNT : 0,
  };
}

// ---------------------------------------------------------------------------
// LE CONSEIL D'ADMINISTRATION
// ---------------------------------------------------------------------------

export type VerdictConseil = 'approuve' | 'reduire' | 'refuse';

export interface ReponseDuConseil {
  verdict: VerdictConseil;
  motif: string;
  /** Ce que le conseil accepterait à la place, quand il demande de réduire. */
  contreProposition?: number;
  /** Ce qui débloquerait le dossier. */
  leviers: ('naming' | 'ville' | 'emprunt' | 'attendre' | 'reduire')[];
}

export interface DossierProjet {
  cout: number;
  /** Ce que le projet rapportera chaque saison, estimé. */
  retourAnnuel: number;
  tresorerie: number;
  /** Le résultat d'exploitation de la saison écoulée. */
  resultatSaison: number;
  /** 0-100 : la confiance du board dans le manager. */
  confiance: number;
  /** L'annuité de dette déjà engagée. */
  detteExistante: number;
  totalRevenus: number;
}

/**
 * LE PRÉSIDENT TRANCHE.
 *
 * ⚠️ LE CONSEIL NE REGARDE PAS LA TRÉSORERIE, IL REGARDE LE RETOUR SUR
 * INVESTISSEMENT ET LA DETTE. C'est ce qui empêche « j'ai 10 M€ donc je clique
 * niveau 10 » : un projet peut être payable et refusé parce qu'il ne se
 * rembourse jamais, et un projet cher peut passer parce qu'il rapporte.
 *
 * ⚠️ ET LA CONFIANCE DU BOARD PÈSE. Un manager qui vient de faire monter le club
 * obtient des choses qu'un manager sur la sellette n'obtiendra pas — c'est la
 * même jauge que celle qui décide de son licenciement, et ça donne un second
 * usage à une réussite sportive.
 */
export function soumettreAuConseil(d: DossierProjet): ReponseDuConseil {
  const retourEnAnnees = d.retourAnnuel > 0 ? d.cout / d.retourAnnuel : 99;
  const detteApres = d.detteExistante + d.cout / DUREE_EMPRUNT;
  const partDeLaDette = detteApres / Math.max(1, d.totalRevenus);
  const couvert = d.tresorerie >= d.cout * 0.35;

  if (partDeLaDette > 0.22) {
    return {
      verdict: 'refuse',
      motif: 'conseil.motif.dette',
      leviers: ['reduire', 'ville', 'naming', 'attendre'],
    };
  }
  if (retourEnAnnees > 16) {
    return {
      verdict: 'refuse',
      motif: 'conseil.motif.rentabilite',
      leviers: ['reduire', 'attendre'],
    };
  }
  if (d.resultatSaison < 0 && d.confiance < 55) {
    return {
      verdict: 'refuse',
      motif: 'conseil.motif.situation',
      leviers: ['attendre', 'ville', 'naming'],
    };
  }
  // ⚠️ « RÉDUIRE » EST LA RÉPONSE LA PLUS INTÉRESSANTE DES TROIS, et c'est pour
  // ça qu'elle a sa propre branche. Un simple oui/non ferait du conseil un
  // portail ; une contre-proposition en fait un interlocuteur, et laisse au
  // manager le choix entre un petit projet tout de suite et le vrai projet dans
  // deux ans.
  if (!couvert || retourEnAnnees > 11 || (d.confiance < 45 && d.cout > d.totalRevenus * 0.4)) {
    const facteur = Math.max(0.35, Math.min(0.8, (d.tresorerie * 0.9) / Math.max(1, d.cout)));
    return {
      verdict: 'reduire',
      motif: 'conseil.motif.reduire',
      contreProposition: Math.round((d.cout * facteur) / 5_000) * 5_000,
      leviers: ['reduire', 'ville', 'naming', 'emprunt'],
    };
  }
  return { verdict: 'approuve', motif: 'conseil.motif.approuve', leviers: [] };
}

/**
 * CE QU'UN PROJET RAPPORTERA, pour le défendre devant le conseil.
 *
 * ⚠️ C'EST UNE ESTIMATION, PAS UNE PROMESSE. Elle se calcule sur le
 * remplissage ATTENDU, qui suppose que le club reste à son niveau. S'il descend
 * l'année d'après, l'estimation était juste et le club est quand même en
 * difficulté — c'est exactement le drame que la demande veut rendre possible.
 */
export function retourAttendu(
  id: Batiment,
  niveauActuel: number,
  spectateursMoyens: number,
  prixMoyen: number,
): number {
  const vise = niveauActuel + 1;
  switch (id) {
    case 'stade': return Math.round(spectateursMoyens * 0.08 * prixMoyen * 15);
    case 'buvettes': return Math.round(spectateursMoyens * 1.3 * 15);
    case 'boutique': return Math.round(spectateursMoyens * 0.8 * 15);
    case 'parking': return Math.round(spectateursMoyens * 0.35 * 15);
    case 'hospitalites': return Math.round(vise * 12 * 3_800);
    case 'siege': return Math.round(spectateursMoyens * 9 * vise);
    // Les bâtiments sportifs ne rapportent pas d'argent directement : le conseil
    // leur reconnaît une valeur, mais bien moindre. C'est ce qui rend un centre
    // de formation difficile à faire approuver — et donc précieux.
    default: return Math.round(spectateursMoyens * 3.2 * vise);
  }
}
