// L'ÉCUSSON D'UNE ÉQUIPE DONT ON N'A QUE LE NOM — sélections, classements, et
// maintenant les maillots du match en trois dimensions.
//
// (Module séparé du composant : `components/Blason.tsx` ne doit exporter que
// des composants, sinon le rafraîchissement à chaud de Vite décroche.)

import { LOGO_PAR_EQUIPE } from '../data/mondeReel';
import { COMPETITIONS_NATIONS_NOUVELLES } from '../data/nouvellesLigues';
import {
  LOGO_SELECTION_CATALOGUE, LOGO_SELECTION_NATIONS, LOGO_SELECTION_PRINCIPALE,
} from '../data/logosSelections';
import { nomNation } from './nations';

// ⚠️ DEUX SOURCES D'ÉCUSSONS DE SÉLECTION. Les compétitions historiques
// viennent de `mondeReel.ts`, les treize nouvelles (Rugby Europe Conference,
// Oceania Cup, Americas Championship…) de `nouvellesLigues.ts` — elles
// apportent 86 équipes nationales de plus, dont l'Andorre, le Kosovo ou les
// Îles Salomon, qui n'existaient nulle part ailleurs.
const LOGOS_EQUIPE: Record<string, string> = { ...LOGO_PAR_EQUIPE };
for (const comp of COMPETITIONS_NATIONS_NOUVELLES) {
  for (const e of comp.equipes) if (e.logo && !LOGOS_EQUIPE[e.nom]) LOGOS_EQUIPE[e.nom] = e.logo;
}
// Le moteur emploie les noms canoniques (« Écosse », « Pays de Galles »,
// « États-Unis ») alors que certaines sources de logos écrivent Ecosse, Galles
// ou USA. On indexe donc chaque logo aussi sous sa nation canonique.
for (const [nom, logo] of Object.entries({ ...LOGOS_EQUIPE })) {
  const canonique = nomNation(nom);
  if (canonique && !/\s+(?:U20|A|B|C|XV|-20)$/i.test(nom) && !LOGOS_EQUIPE[canonique]) {
    LOGOS_EQUIPE[canonique] = logo;
  }
}

/**
 * L'adresse de l'écusson d'une équipe dont on n'a que le nom, ou rien.
 *
 * Les 39 écussons principaux sont la référence absolue. Le catalogue ne prend
 * le relais que pour une sélection absente du lot principal.
 *
 * ⚠️ ET `LOGO_SELECTION_NATIONS` PASSE EN DERNIER, APRÈS le logo fourni par
 * l'appelant. C'est le bouche-trou : avant lui, **41 des 114 nations
 * classées** n'avaient aucune image et retombaient sur leurs initiales. Il ne
 * doit jamais passer devant un écusson officiel — d'où sa place en fin de
 * chaîne (voir `scripts/copierLogosSelections.cjs`, lot « nations »).
 *
 * Le match en trois dimensions s'en sert aussi : c'est cet écusson qui est
 * cousu sur les maillots et posé sur les protections des poteaux.
 */
export function urlLogoEquipe(nom: string, logo?: string): string | undefined {
  return LOGO_SELECTION_PRINCIPALE[nom]
    ?? LOGO_SELECTION_PRINCIPALE[nomNation(nom)]
    ?? LOGO_SELECTION_CATALOGUE[nom]
    ?? LOGO_SELECTION_CATALOGUE[nomNation(nom)]
    ?? logo
    ?? LOGOS_EQUIPE[nom]
    ?? LOGO_SELECTION_NATIONS[nom]
    ?? LOGO_SELECTION_NATIONS[nomNation(nom)];
}
