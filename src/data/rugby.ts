import type { FamillePoste, Poste, PosteId } from '../types';
import { ZONES } from './nations';
import { t } from '../lib/i18n';

// LES 15 POSTES DU RUGBY, numérotés comme sur le maillot (1 à 15).
// Chaque poste garde sa « famille » : c'est elle que les données réelles
// encodent (elles ne distinguent pas le pilier gauche du pilier droit).
export const POSTES: Poste[] = [
  { id: 'pilier_gauche', numero: 1, famille: 'pilier', nom: 'Pilier gauche', categorie: 'Avant',
    description: 'Le pilier « tête close ». Il encaisse toute la poussée adverse en mêlée.',
    cles: ['force', 'endurance', 'plaquage'] },
  { id: 'talonneur', numero: 2, famille: 'talonneur', nom: 'Talonneur', categorie: 'Avant',
    description: 'Cœur de la mêlée et lanceur en touche. Technique et gnaque.',
    cles: ['force', 'passe', 'mental'] },
  { id: 'pilier_droit', numero: 3, famille: 'pilier', nom: 'Pilier droit', categorie: 'Avant',
    description: 'Le pilier « tête libre ». Puissance brute et travail de l’ombre.',
    cles: ['force', 'endurance', 'plaquage'] },
  { id: 'deuxieme_ligne_g', numero: 4, famille: 'deuxieme_ligne', nom: 'Deuxième ligne (4)', categorie: 'Avant',
    description: 'La tour. Domine les airs en touche, abat un travail colossal.',
    cles: ['force', 'endurance', 'plaquage'] },
  { id: 'deuxieme_ligne_d', numero: 5, famille: 'deuxieme_ligne', nom: 'Deuxième ligne (5)', categorie: 'Avant',
    description: 'Sauteur en touche et moteur de la mêlée.',
    cles: ['force', 'endurance', 'plaquage'] },
  { id: 'troisieme_aile_g', numero: 6, famille: 'troisieme_ligne', nom: 'Troisième ligne aile (6)', categorie: 'Avant',
    description: 'Le flanker. Premier sur le ballon, plaqueur infatigable.',
    cles: ['plaquage', 'endurance', 'vitesse'] },
  { id: 'troisieme_aile_d', numero: 7, famille: 'troisieme_ligne', nom: 'Troisième ligne aile (7)', categorie: 'Avant',
    description: 'Le gratteur. Il vit sur les ballons au sol.',
    cles: ['plaquage', 'endurance', 'mental'] },
  { id: 'numero_8', numero: 8, famille: 'troisieme_ligne', nom: 'Numéro 8', categorie: 'Avant',
    description: 'Le porteur de balle. Il lance le jeu en base de mêlée.',
    cles: ['force', 'plaquage', 'vision'] },
  { id: 'demi_melee', numero: 9, famille: 'demi_melee', nom: 'Demi de mêlée', categorie: 'Arrière',
    description: 'Le chef d’orchestre. Vitesse de passe et vision du jeu.',
    cles: ['passe', 'vision', 'vitesse'] },
  { id: 'demi_ouverture', numero: 10, famille: 'demi_ouverture', nom: 'Demi d’ouverture', categorie: 'Arrière',
    description: 'Le stratège et le buteur. Il dicte le tempo.',
    cles: ['jeuAuPied', 'vision', 'mental'] },
  { id: 'ailier_gauche', numero: 11, famille: 'ailier', nom: 'Ailier gauche', categorie: 'Arrière',
    description: 'La foudre. Vitesse pure et finition dans le coin.',
    cles: ['vitesse', 'endurance', 'plaquage'] },
  { id: 'premier_centre', numero: 12, famille: 'centre', nom: 'Premier centre', categorie: 'Arrière',
    description: 'Le percuteur. Il casse la ligne d’avantage.',
    cles: ['force', 'plaquage', 'passe'] },
  { id: 'deuxieme_centre', numero: 13, famille: 'centre', nom: 'Deuxième centre', categorie: 'Arrière',
    description: 'Le lanceur d’attaque. Prise d’intervalle et vitesse.',
    cles: ['vitesse', 'vision', 'passe'] },
  { id: 'ailier_droit', numero: 14, famille: 'ailier', nom: 'Ailier droit', categorie: 'Arrière',
    description: 'Le finisseur. Il vit pour l’essai.',
    cles: ['vitesse', 'endurance', 'mental'] },
  { id: 'arriere', numero: 15, famille: 'arriere', nom: 'Arrière', categorie: 'Arrière',
    description: 'Le dernier rempart. Jeu au pied, relance et courage sous les chandelles.',
    cles: ['jeuAuPied', 'vitesse', 'vision'] },
];

// Postes possibles pour une famille donnée (les données réelles ne donnent que
// la famille : « pilier », pas « pilier droit »).
export const POSTES_PAR_FAMILLE: Record<FamillePoste, PosteId[]> = POSTES.reduce(
  (acc, p) => {
    (acc[p.famille] ??= []).push(p.id);
    return acc;
  },
  {} as Record<FamillePoste, PosteId[]>,
);

// Un poste concret à partir d'une famille, tiré de façon DÉTERMINISTE : le même
// joueur occupe toujours le même numéro d'une saison à l'autre.
export function posteDepuisFamille(famille: FamillePoste, graine: number): PosteId {
  const liste = POSTES_PAR_FAMILLE[famille] ?? ['arriere'];
  return liste[Math.abs(graine) % liste.length];
}

// Compatibilité : les sauvegardes d'avant les 15 postes stockent une famille.
export function migrerPoste(poste: string): PosteId {
  if (POSTES.some((p) => p.id === poste)) return poste as PosteId;
  return posteDepuisFamille(poste as FamillePoste, 0);
}

export const POSTE_PAR_ID: Record<PosteId, Poste> = Object.fromEntries(
  POSTES.map((p) => [p.id, p]),
) as Record<PosteId, Poste>;

// Nations jouables, groupées par zone. Le drapeau est rendu en SVG par
// <Drapeau> (correspondance nom → code dans components/Drapeau.tsx).
// NB : les anciennes sauvegardes stockent « 🇫🇷 France » — `nomNation()`
// retire le préfixe, les deux formats restent compatibles.
export const NATIONS_PAR_ZONE: { zone: string; nations: string[] }[] = ZONES.map(
  (z) => ({ zone: z.zone, nations: z.nations.map((n) => n.nom) }),
);

// Toutes les nations, à plat (202 pays et nations de rugby).
export const NATIONS = NATIONS_PAR_ZONE.flatMap((g) => g.nations);

export const CLUBS_DEPART = [
  'Espoirs du club',
  'Fédérale 2 — village natal',
  'Académie régionale',
  'Centre de formation pro',
];

export const ATTRIBUTS_LABELS: Record<string, string> = {
  vitesse: 'Vitesse',
  force: 'Force',
  endurance: 'Endurance',
  plaquage: 'Plaquage',
  passe: 'Passe',
  jeuAuPied: 'Jeu au pied',
  vision: 'Vision',
  mental: 'Mental',
  forme: 'Forme',
  moral: 'Moral',
  reputation: 'Réputation',
  argent: 'Argent',
};

// ---------------------------------------------------------------------------
// LES MÊMES LIBELLÉS, DANS LA LANGUE DU JOUEUR
// ---------------------------------------------------------------------------
// ⚠️ POURQUOI DES FONCTIONS ET PAS UNE TABLE PAR LANGUE. `ATTRIBUTS_LABELS` et
// `POSTES` sont lus depuis une trentaine d'endroits, dont des fonctions PURES
// (prompts, journal) qui n'ont pas de hook React. On garde donc les constantes
// françaises — elles restent la source, et `lib/groq.ts` s'en sert telles quelles
// pour décrire le joueur au MJ — et on ajoute à côté trois accesseurs traduits,
// à utiliser partout où le texte est AFFICHÉ.
//
// Le repli sur le français n'est pas décoratif : une clé absente rendrait
// « poste.arriere » en toutes lettres à l'écran (`t()` renvoie la clé inconnue).

/** « Jeu au pied », « Kicking », « Juego al pie »… */
export function labelAttribut(cle: string): string {
  const traduit = t(`attr.${cle}`);
  return traduit === `attr.${cle}` ? (ATTRIBUTS_LABELS[cle] ?? cle) : traduit;
}

/** « Demi de mêlée », « Scrum-half », « Mediano de melé »… */
export function nomPoste(id: PosteId): string {
  const traduit = t(`poste.${id}`);
  return traduit === `poste.${id}` ? (POSTE_PAR_ID[id]?.nom ?? id) : traduit;
}

/** La description d'un poste (écran de création). */
export function descriptionPoste(id: PosteId): string {
  const traduit = t(`poste.${id}.desc`);
  return traduit === `poste.${id}.desc` ? (POSTE_PAR_ID[id]?.description ?? '') : traduit;
}

/** « Avant » / « Arrière », traduits. */
export function categoriePoste(id: PosteId): string {
  return POSTE_PAR_ID[id]?.categorie === 'Avant' ? t('poste.cat.avant') : t('poste.cat.arriere');
}
