// LE PORTRAIT D'UN JOUEUR OU D'UNE JOUEUSE — UNE SEULE SOURCE (Correctif 40).
//
// Signalé : « la carte peut avoir une image correcte, mais lorsqu'on ouvre la fiche détaillée de la joueuse, son image
// n'apparaît pas ».
//
// ⚠️ IL Y AVAIT DEUX CHEMINS. La carte (`CarteJoueurEnLigne`) lisait le portrait PORTÉ par la carte (`carte.photo`) ; la
// fiche de composition, elle, recevait un joueur fabriqué sans ce champ et cherchait un portrait par le NOM dans l'index
// des photos — qui est celui des joueurs. Un joueur y retrouvait son visage ; une joueuse, dont le portrait n'existe que
// sur sa carte, n'y trouvait rien. Et quand son nom ressemblait à celui d'un joueur, elle recevait le sien : mesuré sur
// les 1 803 cartes de joueuses, « Bethan LEWIS » y prenait le portrait d'Ethan Lewis.
//
// Désormais tout passe par ici : la carte, la fiche, la composition, le marché, la collection, l'ouverture d'un pack.
//
//   1. « Mon image » : le portrait que le joueur a proposé — ou rien s'il a demandé le retrait du sien ;
//   2. le portrait porté par la carte ;
//   3. le portrait indexé par le nom et le club — JAMAIS pour une carte spéciale (une Halloween n'emprunte pas la photo
//      de club) ni pour une joueuse hors du monde féminin (l'index est alors celui des joueurs) ;
//   4. sinon la silhouette de son genre. Jamais un cadre vide, jamais une image cassée, jamais « undefined ».
import { useMemo, useState } from 'react';
import { choixImage, photoReelle } from './avatars';
import { MONDE_FEMININ } from './mondeActif';

export const SILHOUETTE_JOUEUR = '/photos/silhouette.webp';
export const SILHOUETTE_JOUEUSE = '/photos/silhouette-femme.webp';

/** Ce qu'il faut savoir d'un joueur pour trouver son portrait : une carte de ligue, un joueur de composition, une fiche. */
export interface PorteurDImage {
  nom: string;
  clubReel?: string;
  club?: string;
  photo?: string | null;
  gender?: 'male' | 'female';
  speciale?: unknown;
}

const utilisable = (url: unknown): url is string => typeof url === 'string' && url.length > 0 && url !== 'undefined' && url !== 'null';

/** La silhouette qui remplace un portrait absent : celle d'une joueuse pour une joueuse. */
export function silhouetteDe(joueur: Pick<PorteurDImage, 'gender'>): string {
  return joueur.gender === 'female' ? SILHOUETTE_JOUEUSE : SILHOUETTE_JOUEUR;
}

/** Les portraits à essayer, dans l'ordre. Vide : aucun portrait (ou retrait demandé) — la silhouette s'affiche. */
export function portraitsDe(joueur: PorteurDImage): string[] {
  const choix = choixImage(joueur.nom);
  if (choix === null) return [];
  const indexe = joueur.speciale || (joueur.gender === 'female' && !MONDE_FEMININ)
    ? undefined : photoReelle(joueur.nom, joueur.clubReel ?? joueur.club);
  return [...new Set([choix, joueur.photo, indexe].filter(utilisable))];
}

/** Le portrait à afficher sans attendre le chargement : le premier candidat, sinon la silhouette. */
export function imageDe(joueur: PorteurDImage): string {
  return portraitsDe(joueur)[0] ?? silhouetteDe(joueur);
}

/**
 * Le portrait d'un joueur, pour un composant : `src` est toujours une adresse affichable. Si un fichier ne charge pas
 * (`surErreur`), le candidat suivant prend sa place, puis la silhouette — `reel` dit s'il s'agit d'un vrai portrait.
 */
export function usePortrait(joueur: PorteurDImage): { src: string; reel: boolean; surErreur: () => void } {
  const { nom, clubReel, club, photo, gender } = joueur;
  const speciale = !!joueur.speciale;
  const candidats = useMemo(
    () => portraitsDe({ nom, clubReel, club, photo, gender, speciale: speciale || undefined }),
    [nom, clubReel, club, photo, gender, speciale],
  );
  // Les fichiers qui n'ont pas chargé, rangés avec le joueur qu'ils concernent : un autre joueur dans le même cadre repart
  // de zéro, sans effet ni rendu de plus.
  const cle = `${nom}|${photo ?? ''}`;
  const [echecs, setEchecs] = useState<{ cle: string; ratees: ReadonlySet<string> }>(() => ({ cle, ratees: AUCUNE }));
  const ratees = echecs.cle === cle ? echecs.ratees : AUCUNE;
  const src = candidats.find((c) => !ratees.has(c));
  return {
    src: src ?? silhouetteDe({ gender }),
    reel: !!src,
    surErreur: () => { if (src) setEchecs((avant) => ({ cle, ratees: new Set(avant.cle === cle ? avant.ratees : []).add(src) })); },
  };
}

const AUCUNE: ReadonlySet<string> = new Set();
