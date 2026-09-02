// LOGO OFFICIEL D'UNE COMPÉTITION
//
// Partout où le jeu affichait un emoji à côté du nom d'un championnat, d'une
// coupe ou d'une compétition internationale, on affiche maintenant son VRAI
// logo (`public/logos-competitions/`, table générée par
// `scripts/copierLogosCompetitions.cjs`).
//
// ⚠️ LE REPLI N'EST PLUS UN EMOJI, C'EST UN TRACÉ DU JEU. Sept compétitions sur
// trente-trois n'ont pas de logo fourni : leur pictogramme s'affichait donc à
// côté de vingt-six vraies images, en couleurs du système et à une taille qui
// change d'une machine à l'autre. La prop garde son nom (`emoji`) parce qu'une
// douzaine d'appelants la passent, mais elle attend désormais un NOM D'ICÔNE.

import { LOGO_COMPETITION } from '../data/logosCompetitions';
import { Icone } from './Icone';
import type { NomIcone } from './Icone';
import { LOGO_COMPETITION_NOUVEAU } from '../data/nouvellesLigues';

// ⚠️ DEUX TABLES, DEUX GÉNÉRATEURS. Les compétitions historiques viennent de
// `sources/logos/competitions/` (copierLogosCompetitions.cjs), les nouvelles
// ligues et coupes de `sources/competitions/` (genNouvellesLigues.cjs). On fusionne
// ici plutôt que de faire écrire un générateur dans le fichier de l'autre.
const LOGOS: Record<string, string> = { ...LOGO_COMPETITION, ...LOGO_COMPETITION_NOUVEAU };

interface Props {
  id?: string; // id de compétition (top14, championsCup, sixNations…)
  emoji?: NomIcone; // repli dessiné quand aucun logo n'est fourni
  taille?: number; // px
  titre?: string;
}

export function LogoCompet({ id, emoji = 'ballon', taille = 26, titre }: Props) {
  const src = id ? LOGOS[id] : undefined;
  if (!src) {
    return (
      <span className="logo-compet vide" title={titre}>
        <Icone nom={emoji} taille={Math.round(taille * 0.8)} />
      </span>
    );
  }
  return (
    <span className="logo-compet" style={{ width: taille, height: taille }} title={titre}>
      <img src={src} alt="" loading="lazy" decoding="async" />
    </span>
  );
}
