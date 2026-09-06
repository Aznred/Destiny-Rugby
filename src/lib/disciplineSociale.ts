// DISCIPLINE SUR L'OVALE
//
// Les clashs font partie du réseau, mais ils ne sont plus décoratifs. Ce module
// évalue une embrouille (publique ou privée), choisit une réponse graduée du
// club et applique réellement la sanction à la carrière.

import type { CompteSuivi, Joueur } from '../types.js';
import { MOTS_INTERDITS } from '../data/social.js';
import { graine as creerGraine } from './championnat.js';
import { appliquerConsequence } from './consequences.js';

export type NiveauSanctionSociale =
  | 'avertissement'
  | 'amende'
  | 'banc'
  | 'suspension'
  | 'exclusion';

export type CanalEmbrouille = 'publication' | 'commentaire' | 'messagePrive';

export interface SanctionSociale {
  niveau: NiveauSanctionSociale;
  amende: number;
  semaines: number;
  fuite: boolean;
  grossier: boolean;
  canal: CanalEmbrouille;
  motif: string;
}

interface ContexteEmbrouille {
  canal: CanalEmbrouille;
  cibleType?: CompteSuivi['type'];
  relation?: number;
  cle: string;
  tonClash?: boolean;
}

// Vocabulaire volontairement multilingue : le jeu ne doit pas ignorer une
// altercation simplement parce que la carrière est jouée hors de France.
const PROVOCATION = /(?:\b(?:nul(?:le|s)?|clown|bouffon|tocard|guignol|pourri|ridicule|minable|incapable|loser|trash|useless|idiot|moron|payaso|basura|in[uú]til|pagliaccio|scarso|nutzlos|palha[cç]o|ot[aá]rio)\b|馬鹿|バカ|アホ|下手|雑魚)/i;
const INSULTE_FORTE = /(?:\b(?:merde|conn?ard|conn?asse|encul\w*|batard|bâtard|abruti|d[eé]bile|clochard|ta gueule|ferme[- ]?(?:la|ta bouche)|shut up|asshole|fuck\w*|shit\w*|gilipollas|cabr[oó]n|c[aá]llate|mierda|stronzo|stai zitto|schei(?:ss|ß)e|arschloch|halt die klappe|cala a boca)\b|黙れ|クソ)/i;

export function estEmbrouille(texte: string): boolean {
  return PROVOCATION.test(texte) || INSULTE_FORTE.test(texte) || MOTS_INTERDITS.test(texte);
}

/**
 * Une discussion privée n'arrive au club que si une capture fuit. En public,
 * le club voit tout. Plus la relation est détruite, plus une nouvelle sortie
 * ressemble à une récidive et plus la sanction monte.
 */
export function evaluerEmbrouilleSociale(
  joueur: Joueur,
  texte: string,
  contexte: ContexteEmbrouille,
): SanctionSociale | null {
  const grossier = INSULTE_FORTE.test(texte) || MOTS_INTERDITS.test(texte);
  const agressif = grossier || PROVOCATION.test(texte);
  if (!agressif && !contexte.tonClash) return null;

  const relation = contexte.relation ?? 0;
  const rng = creerGraine(`discipline-x#${contexte.cle}#${texte.toLocaleLowerCase()}`);
  let fuite = false;
  if (contexte.canal === 'messagePrive') {
    const risqueFuite = Math.min(0.82,
      (grossier ? 0.34 : 0.13)
      + (relation <= -35 ? 0.16 : 0)
      + (relation <= -65 ? 0.16 : 0)
      + (contexte.cibleType === 'hater' ? 0.12 : 0));
    if (rng() >= risqueFuite) return null;
    fuite = true;
  }

  const publicDirect = contexte.canal === 'commentaire';
  const confiance = joueur.confianceCoach ?? 50;
  let gravite = grossier ? 4 : 2;
  gravite += contexte.canal === 'messagePrive' ? 0 : 2;
  gravite += publicDirect ? 1 : 0;
  gravite += contexte.tonClash ? 1 : 0;
  gravite += relation <= -35 ? 1 : 0;
  gravite += relation <= -65 ? 1 : 0;
  gravite += confiance < 40 ? 1 : 0;
  gravite += confiance < 22 ? 1 : 0;
  gravite += Math.floor(rng() * 3);

  let niveau: NiveauSanctionSociale = 'avertissement';
  // Le licenciement reste rare : il faut une sortie violente et un staff qui
  // avait déjà pratiquement rompu avec le joueur.
  if (grossier && confiance < 18 && gravite >= 10) niveau = 'exclusion';
  else if (gravite >= 9) niveau = 'suspension';
  else if (gravite >= 7) niveau = 'banc';
  else if (gravite >= 5) niveau = 'amende';

  const salaire = joueur.contrat?.salaire ?? 12_000;
  const taux = niveau === 'exclusion' ? 0.14
    : niveau === 'suspension' ? 0.11
      : niveau === 'banc' ? 0.08
        : niveau === 'amende' ? 0.05 : 0;
  const amende = taux ? Math.max(150, Math.round(salaire * taux)) : 0;
  const semaines = niveau === 'suspension' ? 2 + Math.floor(rng() * 5)
    : niveau === 'banc' ? 1 + Math.floor(rng() * 3) : 0;

  return {
    niveau,
    amende,
    semaines,
    fuite,
    grossier,
    canal: contexte.canal,
    motif: fuite
      ? 'une capture de l’altercation privée diffusée sur L’Ovale'
      : 'une altercation publique sur L’Ovale',
  };
}

export interface EffetSanctionSociale {
  joueur: Joueur;
  exclusion: boolean;
}

/** Applique l'argent, les jauges et surtout la disponibilité sportive. */
export function appliquerSanctionSociale(
  joueur: Joueur,
  sanction: SanctionSociale,
): EffetSanctionSociale {
  const pertes = sanction.niveau === 'exclusion' ? { moral: 18, reputation: 10, coach: 35, popularite: 10 }
    : sanction.niveau === 'suspension' ? { moral: 14, reputation: 8, coach: 28, popularite: 7 }
      : sanction.niveau === 'banc' ? { moral: 10, reputation: 4, coach: 20, popularite: 4 }
        : sanction.niveau === 'amende' ? { moral: 6, reputation: 2, coach: 12, popularite: 2 }
          : { moral: 3, reputation: 1, coach: 6, popularite: 1 };

  let j: Joueur = {
    ...joueur,
    argent: Math.max(0, joueur.argent - sanction.amende),
    moral: Math.max(0, joueur.moral - pertes.moral),
    reputation: Math.max(0, joueur.reputation - pertes.reputation),
    confianceCoach: Math.max(0, (joueur.confianceCoach ?? 50) - pertes.coach),
    popularite: Math.max(0, (joueur.popularite ?? 50) - pertes.popularite),
  };

  if (sanction.niveau === 'banc') {
    j = {
      ...j,
      capitaine: false,
      miseAuBanc: {
        semaines: Math.max(j.miseAuBanc?.semaines ?? 0, sanction.semaines),
        motif: sanction.motif,
      },
    };
  } else if (sanction.niveau === 'suspension') {
    // La suspension utilise la mécanique d'indisponibilité déjà partagée par
    // le direct et la simulation : aucune feuille de match ne peut l'ignorer.
    j = appliquerConsequence(j, 'suspension', sanction.motif, sanction.semaines).joueur;
  } else if (sanction.niveau === 'exclusion') {
    j = appliquerConsequence(j, 'exclusionClub', sanction.motif).joueur;
  }

  return { joueur: j, exclusion: sanction.niveau === 'exclusion' };
}
