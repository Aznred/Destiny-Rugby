import { LOGO_COMPETITION } from '../data/logosCompetitions.js';
import { couleursDuTableau, departagerLesSigles, enHex } from './tenuesMatch.js';
import { LOGO_COMPETITION_NOUVEAU } from '../data/nouvellesLigues.js';
import type { EtatMatch } from './moteur/etat.js';

export interface PaletteTV {
  principale: string; secondaire: string; fond: string; accent: string; texte: string;
}
export interface IdentiteTV {
  nom?: string;
  /** Identifiant du catalogue ou URL du logo de la compétition. */
  logo?: string;
  journee?: number;
  couleurs?: Partial<PaletteTV>;
}
export interface EquipeTV {
  nom: string; couleur: string; texte?: string; logo?: string; score: number;
  /** La seconde couleur du club : un liseré sous son score. */
  lisere?: string;
  /** Essais marqués : affichés dans l'onglet au-dessus du score (« 4E »). */
  essais?: number;
}
export interface JoueurTV {
  id: string; nom: string; numero: number; poste: string; cote: 'A' | 'B'; capitaine?: boolean;
  /**
   * Le portrait de SA CARTE, quand l'hôte la connaît (ligue en ligne). `null` :
   * la carte existe et n'a pas de photo — on montre alors la silhouette grise
   * des cartes, sans aller chercher un visage par le nom (ce serait celui d'un
   * homonyme). Absent : le portrait se cherche par le nom et le club.
   */
  photo?: string | null;
}
export interface ExclusionTV extends JoueurTV {
  type: 'jaune' | 'rouge';
  /** Le motif donné par l'arbitre, affiché dans le bandeau du carton. */
  motif?: string;
  /** Échéance sur l'horloge du match, jamais sur l'horloge du navigateur. */
  retour?: number;
}
export const PALETTE_TV: PaletteTV = {
  principale: '#123e32', secondaire: '#f7f6f0', fond: '#101613', accent: '#b99a42', texte: '#ffffff',
};
/** Palette du logo Top 14 de référence, sans approximation par échantillonnage. */
export const PALETTE_TOP14: PaletteTV = {
  principale: '#090b0a', secondaire: '#f3f5f6', fond: '#040605', accent: '#b99a42', texte: '#ffffff',
};
/**
 * Ce que le tableau affiche pour une équipe : la couleur qu'elle PORTE, un texte lisible dessus, et sa seconde couleur en liseré.
 *
 * ⚠️ LE VISITEUR N'EST PLUS BLANC D'OFFICE (Correctif 24). Il recevait `#f3f5f6` quelle que soit sa couleur : un club
 * rouge en déplacement s'affichait en blanc, et deux clubs sur trois avaient le même tableau. Les deux tenues sont
 * départagées AVANT (`lib/tenuesMatch.ts`), une fois, pour le terrain comme pour le tableau.
 */
export function couleursEquipeTV(couleur: string, secondaire?: string | boolean): Pick<EquipeTV, 'couleur' | 'texte' | 'lisere'> {
  const hex = enHex(couleur);
  const franche = hex === '#c1121f' ? '#d5001c' : hex;
  const c = couleursDuTableau({ principal: franche, secondaire: typeof secondaire === 'string' ? secondaire : franche });
  return { couleur: c.couleur, texte: c.texte, ...(typeof secondaire === 'string' ? { lisere: c.lisere } : {}) };
}
export function logoTV(logo?: string): string {
  return (logo && (LOGO_COMPETITION[logo] ?? LOGO_COMPETITION_NOUVEAU[logo]
    ?? (/^(\/|https?:)/.test(logo) ? logo : undefined))) || '/favicon.svg';
}
export function tempsTV(secondes: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(secondes) ? secondes : 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
export function abreviationTV(nom: string): string {
  const connu: Record<string, string> = { 'stade toulousain': 'TOU', toulouse: 'TOU', 'union bordeaux bègles': 'BOR',
    'stade rochelais': 'LAR', 'la rochelle': 'LAR', 'asm clermont': 'CLE', 'racing 92': 'R92',
    'section paloise': 'PAU', 'rc vannes': 'VAN', 'aviron bayonnais': 'BAY', 'stade français': 'SFP' };
  return connu[nom.toLowerCase()] ?? nom.replace(/^(stade |racing |union |rc |us |ca |fc |as )/i, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase();
}
/** Les deux sigles du tableau, jamais identiques (« TOU » contre « RCT », pas « TOU » contre « TOU »). */
export function siglesTV(nomA: string, nomB: string): [string, string] {
  return departagerLesSigles(abreviationTV(nomA), nomA, abreviationTV(nomB), nomB);
}
export function texteSurCouleur(couleur: string): string {
  const hex = couleur.match(/^#([\da-f]{6}|[\da-f]{3})$/i)?.[1];
  if (!hex) return '#ffffff';
  const v = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255)
    .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b > .179 ? '#101613' : '#ffffff';
}
export function exclusionsDepuisEtat(e: Pick<EtatMatch, 'pions' | 't'> & { exclusionsTV?: ExclusionTV[] }): ExclusionTV[] {
  // Le film transporte les échéances : les pions exclus n'ont plus de positions à diffuser.
  if (e.exclusionsTV) return e.exclusionsTV.filter(p => p.type === 'rouge' || (p.retour ?? 0) > e.t);
  return e.pions.filter(p => p.stats.cartonsRouges > 0 || p.sanction > 0).map(p => ({
    id: p.id, nom: p.nom, numero: p.numeroMaillot ?? p.numero, poste: p.poste, cote: p.cote,
    type: p.stats.cartonsRouges > 0 || p.sanction > 3600 ? 'rouge' : 'jaune',
    ...(p.motifCarton ? { motif: p.motifCarton } : {}),
    retour: p.stats.cartonsRouges > 0 || p.sanction > 3600 ? undefined : Math.round((e.t + p.sanction) * 10) / 10,
  }));
}
/** `cle` : le texte de la ligne dans les sept langues (`textesSupplementaires.ts`). */
export const LIGNES_TV = [
  { nom: 'Première ligne', cle: 'tv.ligne.premiere', numeros: [1, 2, 3] }, { nom: 'Deuxième ligne', cle: 'tv.ligne.deuxieme', numeros: [4, 5] },
  { nom: 'Troisième ligne', cle: 'tv.ligne.troisieme', numeros: [6, 8, 7] }, { nom: 'Charnière', cle: 'tv.ligne.charniere', numeros: [9, 10] },
  { nom: 'Centres', cle: 'tv.ligne.centres', numeros: [12, 13] }, { nom: 'Ailiers', cle: 'tv.ligne.ailiers', numeros: [11, 14] },
  { nom: 'Arrière', cle: 'tv.ligne.arriere', numeros: [15] },
];
export const DUREE_LIGNE_TV = 3;
export const DUREE_EQUIPE_TV = LIGNES_TV.length * DUREE_LIGNE_TV;
