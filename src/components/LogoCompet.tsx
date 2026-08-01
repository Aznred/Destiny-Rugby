// LOGO OFFICIEL D'UNE COMPÉTITION
//
// Partout où le jeu affichait un emoji à côté du nom d'un championnat, d'une
// coupe ou d'une compétition internationale, on affiche maintenant son VRAI
// logo (`public/logos-competitions/`, table générée par
// `scripts/copierLogosCompetitions.cjs`).
//
// L'emoji reste le repli : une compétition sans logo fourni ne disparaît pas.

import { LOGO_COMPETITION } from '../data/logosCompetitions';

interface Props {
  id?: string; // id de compétition (top14, championsCup, sixNations…)
  emoji?: string; // repli quand aucun logo n'est fourni
  taille?: number; // px
  titre?: string;
}

export function LogoCompet({ id, emoji = '🏉', taille = 26, titre }: Props) {
  const src = id ? LOGO_COMPETITION[id] : undefined;
  if (!src) {
    return (
      <span className="logo-compet vide" style={{ fontSize: `${taille * 0.8}px` }} title={titre}>
        {emoji}
      </span>
    );
  }
  return (
    <span className="logo-compet" style={{ width: taille, height: taille }} title={titre}>
      <img src={src} alt="" loading="lazy" decoding="async" />
    </span>
  );
}
