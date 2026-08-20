/**
 * Tirer un nom de rugbyman plausible pour une nationalité donnée.
 *
 * Sert quand le joueur laisse le champ « Nom » vide à la création : mieux vaut
 * un « Davit Ninikashvili » géorgien qu'un « Anonyme », qui était la valeur de
 * repli jusqu'ici.
 *
 * ⚠️ ON NE STOCKE AUCUN POOL DE PRÉNOMS. Le jeu embarque déjà **11 916 joueurs
 * étiquetés par nationalité** — 6 306 réels (`data/effectifsReels.ts`) et 5 610
 * générés pour les 18 championnats ajoutés (`data/nouvellesLigues.ts`). Écrire
 * une table de prénoms par pays à côté, ce serait recopier à la main ce qui est
 * déjà là, et se garantir qu'un jour les deux ne diront plus la même chose.
 * On recombine donc : le prénom de l'un, le nom de l'autre.
 *
 * ⚠️ 52 NATIONS SUR 202 ONT UN VIVIER, et la création en propose 202. Le repli
 * est explicite et il est assumé approximatif :
 *
 *   1. la nation elle-même ;
 *   2. à défaut, **sa zone géographique** (`NATIONS_PAR_ZONE`) — un Népalais
 *      reçoit un nom d'Asie, pas un nom français. C'est imparfait, mais un nom
 *      du bon continent se lit mieux qu'un « Léo Dupont » à Katmandou ;
 *   3. à défaut, n'importe qui.
 *
 * Le monde du rugby étant ce qu'il est, les grandes nations sont largement
 * couvertes (France 1 464 noms, Angleterre 1 233, Nouvelle-Zélande 1 015,
 * Japon 963, Géorgie 461, Portugal 325…).
 */

import { EFFECTIFS_REELS } from '../data/effectifsReels';
import { CLUBS_NOUVEAUX, effectifNouveau } from '../data/nouvellesLigues';
import { NATIONS_PAR_ZONE } from '../data/rugby';

/**
 * Combien de prénoms on cherche avant de s'arrêter.
 *
 * ⚠️ IL Y A UN ARRÊT ANTICIPÉ, ET C'EST VOLONTAIRE. Construire l'index complet
 * des 11 916 joueurs pour en tirer UN nom retiendrait des dizaines de milliers
 * de chaînes en mémoire jusqu'à la fin de la session, pour un clic. On balaie
 * jusqu'à avoir de quoi ne pas se répéter, puis on s'arrête.
 */
const CIBLE = 40;

/** Un vivier de prénoms et de noms, prêt à recombiner. */
interface Vivier {
  prenoms: string[];
  noms: string[];
}

/**
 * Découpe « Juan Cruz MALLÍA » en prénom(s) et nom de famille.
 *
 * ⚠️ LES DEUX BASES N'ÉCRIVENT PAS LES NOMS DE LA MÊME FAÇON, et l'ignorer
 * coûtait cher. Les joueurs RÉELS portent leur nom de famille en capitales
 * (« Cedate GOMES SA ») ; les joueurs GÉNÉRÉS des 18 championnats ajoutés sont
 * en casse normale (« Duarte Pinto »). Une première version ne lisait que la
 * casse : elle jetait donc **les 5 610 joueurs générés** sans rien signaler.
 * Mesuré avant correction — le Portugal, dont presque tout le vivier est
 * généré, tombait à **7 prénoms** pour 325 joueurs, et le tirage resservait
 * « Raffaele » trois fois de suite.
 *
 * Deux lectures, dans cet ordre :
 *
 *  1. **la casse**, quand il y a des capitales : c'est la seule façon fiable de
 *     savoir où commence un nom à particule — « Jean-Luc DU PREEZ »,
 *     « Michaël LE BOURGEOIS », « Cedate GOMES SA » ;
 *  2. **le dernier mot** sinon. Approximation assumée : un « Duarte Costa
 *     Storti » en casse normale rend « Duarte Costa » + « Storti ». On ne peut
 *     pas faire mieux sans deviner, et le résultat reste un nom portugais
 *     crédible — ce qui est tout ce qu'on demande ici.
 */
function decouper(nomComplet: string): { prenom: string; nom: string } | null {
  const mots = nomComplet.trim().split(/\s+/).filter(Boolean);
  if (mots.length < 2) return null;

  // Une initiale isolée (« J. ») n'est pas un nom de famille : au moins deux
  // lettres, et le mot doit vraiment porter des lettres (« II » n'en est pas un).
  const enCapitales = (m: string) =>
    m.length >= 2 && m === m.toLocaleUpperCase('fr') && m !== m.toLocaleLowerCase('fr');

  const debut = mots.findIndex(enCapitales);
  const coupe = debut > 0 ? debut : mots.length - 1;
  return {
    prenom: mots.slice(0, coupe).join(' '),
    nom: mots.slice(coupe).map(capitaliser).join(' '),
  };
}

/**
 * « DU PREEZ » → « Du Preez », « BIELLE-BIARREY » → « Bielle-Biarrey ».
 *
 * ⚠️ On travaille sur les SUITES DE LETTRES, pas sur le premier caractère : un
 * nom composé ou apostrophé (« O'CONNOR ») garderait sinon ses capitales après
 * le tiret ou l'apostrophe.
 */
function capitaliser(mot: string): string {
  return mot
    .toLocaleLowerCase('fr')
    .replace(/\p{L}+/gu, (bloc) => bloc.charAt(0).toLocaleUpperCase('fr') + bloc.slice(1));
}

/** Balaie les deux bases et retient les noms des nations acceptées. */
function collecter(accepte: (nation: string) => boolean): Vivier {
  const prenoms = new Set<string>();
  const noms = new Set<string>();

  const ajouter = (nation: string, nomComplet: string): void => {
    if (!accepte(nation)) return;
    const d = decouper(nomComplet);
    if (!d) return;
    prenoms.add(d.prenom);
    noms.add(d.nom);
  };

  // ⚠️ LES EFFECTIFS RÉELS D'ABORD. Ils sont déjà décodés en objets, alors que
  // `effectifNouveau` décode à la demande et met en cache : commencer par eux
  // permet, pour les grandes nations, de ne jamais toucher aux 183 clubs des
  // nouveaux championnats.
  for (const liste of Object.values(EFFECTIFS_REELS)) {
    for (const j of liste) ajouter(j.nation, j.nom);
    if (prenoms.size >= CIBLE && noms.size >= CIBLE) return { prenoms: [...prenoms], noms: [...noms] };
  }

  for (const club of CLUBS_NOUVEAUX) {
    for (const j of effectifNouveau(club) ?? []) ajouter(j.nation, j.nom);
    if (prenoms.size >= CIBLE && noms.size >= CIBLE) break;
  }

  return { prenoms: [...prenoms], noms: [...noms] };
}

/** La zone géographique d'une nation, telle que l'écran de création la range. */
function zoneDe(nation: string): string | undefined {
  return NATIONS_PAR_ZONE.find((g) => g.nations.includes(nation))?.zone;
}

// Un vivier par nation demandée : on n'en demande qu'une poignée par session.
const cache = new Map<string, Vivier>();

/** Assez de matière pour ne pas resservir deux fois le même nom. */
const utilisable = (v: Vivier) => v.prenoms.length >= 3 && v.noms.length >= 3;

function vivierPour(nation: string): Vivier {
  const enCache = cache.get(nation);
  if (enCache) return enCache;

  let v = collecter((n) => n === nation);

  if (!utilisable(v)) {
    const zone = zoneDe(nation);
    const voisines = zone
      ? new Set(NATIONS_PAR_ZONE.find((g) => g.zone === zone)!.nations)
      : null;
    if (voisines) v = collecter((n) => voisines.has(n));
  }

  if (!utilisable(v)) v = collecter(() => true);

  cache.set(nation, v);
  return v;
}

/**
 * Un nom complet plausible pour cette nationalité.
 *
 * Le tirage est volontairement ALÉATOIRE, pas déterministe : deux carrières
 * créées de suite dans le même pays ne doivent pas porter le même nom.
 */
export function nomAleatoirePourNation(nation: string): string {
  const v = vivierPour(nation);
  if (!v.prenoms.length || !v.noms.length) return 'Anonyme';
  const prenom = v.prenoms[Math.floor(Math.random() * v.prenoms.length)];
  const nom = v.noms[Math.floor(Math.random() * v.noms.length)];
  return `${prenom} ${nom}`;
}
