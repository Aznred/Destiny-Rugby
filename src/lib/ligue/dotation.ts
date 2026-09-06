// LA DOTATION DE DÉPART — les 30 joueurs que chacun reçoit au coup d'envoi
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ PERSONNE NE COMMENCE AVEC UNE ÉQUIPE MONSTRUEUSE — ET PERSONNE NE
//    COMMENCE AVEC LA MÊME
// ═══════════════════════════════════════════════════════════════════════════
// Tout le monde reçoit exactement la même RÉPARTITION DE NOTES :
//
//        3 joueurs 75-79 · 8 joueurs 70-74 · 12 joueurs 65-69 · 7 joueurs 55-64
//
// … mais pas au même endroit du terrain. « Quelqu'un peut tomber sur un
// excellent 10 et un mauvais pack. Un autre sur une énorme première ligne et
// des trois-quarts moyens. »
//
// C'est ça, et rien d'autre, qui crée le commerce dès la première journée :
// deux effectifs de force identique mais de FORME différente ont chacun ce qui
// manque à l'autre. Un tirage à plat, lui, donnerait dix équipes moyennes en
// tout point, et personne n'aurait rien à se dire.
//
// ⚠️ ET LA DOTATION NE PIOCHE QUE DANS LE VIVIER DE LA LIGUE. Une carte
// distribuée sort du stock : elle n'est plus dans les packs, elle n'est plus
// sur le marché, elle appartient à quelqu'un. C'est l'invariant du mode.

import type { FamillePoste } from '../../types.js';
import type { CarteJoueur, IdCarte, IdClub, TypeLigue } from './types.js';
import { QUOTAS_POSTE, TAILLE_EFFECTIF } from './vivier.js';
import { graine, melanger } from './aleatoire.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LES PALIERS DE LA DOTATION
// ═══════════════════════════════════════════════════════════════════════════

export interface PalierDotation {
  min: number;
  max: number;
  combien: number;
}

/** ⚠️ La somme des `combien` DOIT valoir `TAILLE_EFFECTIF` (30). */
export const PALIERS: readonly PalierDotation[] = [
  { min: 75, max: 79, combien: 3 },
  { min: 70, max: 74, combien: 8 },
  { min: 65, max: 69, combien: 12 },
  { min: 55, max: 64, combien: 7 },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// 2. LES PROFILS — où tombent les bons joueurs
// ═══════════════════════════════════════════════════════════════════════════

export type ProfilDotation =
  /** Une première ligne à faire peur, des trois-quarts quelconques. */
  | 'premiereLigne'
  /** Le pack domine, derrière c'est plus mince. */
  | 'packDominant'
  /** Charnière de luxe : un 9 et un 10 au-dessus du lot. */
  | 'charniere'
  /** Une ligne de trois-quarts qui court vite, des avants moyens. */
  | 'troisQuartsDominants'
  /** Des ailes et un arrière tranchants, l'axe plus faible. */
  | 'finisseurs'
  /** Rien de saillant : le même niveau partout. */
  | 'equilibre';

export const PROFILS: readonly ProfilDotation[] = [
  'premiereLigne', 'packDominant', 'charniere',
  'troisQuartsDominants', 'finisseurs', 'equilibre',
] as const;

/**
 * Le poids d'un poste dans un profil : plus il est haut, plus ce poste sert en
 * premier quand on distribue les meilleures notes.
 *
 * ⚠️ AUCUN POIDS N'EST NUL. Un zéro signifierait « ce poste ne reçoit jamais
 * rien de bon », et le profil `packDominant` produirait un 10 à 55 dans toutes
 * les ligues — injouable, et surtout jamais négociable : personne ne veut
 * l'échanger. Un profil incline, il ne condamne pas.
 */
const POIDS: Record<ProfilDotation, Partial<Record<FamillePoste, number>>> = {
  premiereLigne: { pilier: 3, talonneur: 3, deuxieme_ligne: 1.4 },
  packDominant: { pilier: 2, talonneur: 2, deuxieme_ligne: 2.4, troisieme_ligne: 2.6 },
  charniere: { demi_melee: 3.2, demi_ouverture: 3.4 },
  troisQuartsDominants: { centre: 2.6, ailier: 2.4, arriere: 2.2, demi_ouverture: 1.8 },
  finisseurs: { ailier: 3.2, arriere: 3, centre: 1.3 },
  equilibre: {},
};

/**
 * Attribue un profil à chaque club.
 *
 * ⚠️ SANS DOUBLON TANT QU'IL Y A DES PROFILS DISPONIBLES. À six clubs, chacun
 * a le sien ; à douze, chaque profil sort deux fois. Un tirage indépendant
 * club par club donnerait, une ligue sur trois, quatre `charniere` sur six —
 * et l'asymétrie qui fait l'intérêt du mode disparaîtrait.
 *
 * ⚠️ SAUF EN LIGUE `equilibre` : là, tout le monde reçoit le même profil plat.
 * C'est la promesse du type de ligue (« équipes initiales de force similaire »),
 * et un profil incliné la trahirait — deux effectifs de même moyenne mais de
 * formes opposées ne s'affrontent pas à armes égales, l'un a un 10 et pas
 * l'autre.
 */
export function profilsDesClubs(
  graineLigue: string,
  clubs: readonly IdClub[],
  type: TypeLigue,
): Record<IdClub, ProfilDotation> {
  const sortie: Record<IdClub, ProfilDotation> = {};
  if (type === 'equilibre') {
    for (const club of clubs) sortie[club] = 'equilibre';
    return sortie;
  }
  const rng = graine(`profils|${graineLigue}`);
  let sac: ProfilDotation[] = [];
  for (const club of clubs) {
    if (!sac.length) sac = melanger(PROFILS, rng);
    sortie[club] = sac.pop() as ProfilDotation;
  }
  return sortie;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LA DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════

export interface Dotation {
  /** Les cartes de chaque club, dans l'ordre où elles ont été attribuées. */
  attributions: Record<IdClub, IdCarte[]>;
  /** Le vivier mis à jour : les cartes distribuées ont un propriétaire. */
  vivier: CarteJoueur[];
  profils: Record<IdClub, ProfilDotation>;
  /** Postes qu'on n'a pas pu servir dans la bande voulue, par club. */
  compromis: { club: IdClub; poste: FamillePoste; palier: number }[];
}

/** Les 30 postes d'un effectif, un par carte à recevoir. */
function postesDeLEffectif(): FamillePoste[] {
  const liste: FamillePoste[] = [];
  for (const [famille, combien] of Object.entries(QUOTAS_POSTE) as [FamillePoste, number][]) {
    for (let i = 0; i < combien; i++) liste.push(famille);
  }
  return liste;
}

/**
 * Ordonne les 30 postes d'un effectif du « servi en premier » au « servi en
 * dernier », selon le profil. Un peu de bruit pour que deux ligues avec le même
 * profil ne donnent pas exactement le même effectif.
 */
function ordreDeService(profil: ProfilDotation, rng: () => number): FamillePoste[] {
  const poids = POIDS[profil];
  return postesDeLEffectif()
    .map((poste) => ({ poste, note: (poids[poste] ?? 1) + rng() * 0.9 }))
    .sort((a, b) => b.note - a.note)
    .map((x) => x.poste);
}

/**
 * Distribue les effectifs de départ.
 *
 * ⚠️ ON SERT PALIER PAR PALIER, PAS CLUB PAR CLUB. Si on donnait ses 30 cartes
 * au premier club avant de passer au second, le premier raflerait les trois
 * meilleurs 79 et le dernier hériterait de trois 75 : à répartition égale sur
 * le papier, quatre points d'écart réels. On distribue donc le palier 75-79 à
 * tout le monde, puis le palier 70-74, et l'ordre de passage tourne d'un palier
 * à l'autre.
 */
export function distribuerDotations(
  vivier: readonly CarteJoueur[],
  clubs: readonly IdClub[],
  graineLigue: string,
  type: TypeLigue,
): Dotation {
  const profils = profilsDesClubs(graineLigue, clubs, type);
  const attributions: Record<IdClub, IdCarte[]> = {};
  const compromis: Dotation['compromis'] = [];
  // Copie de travail : on ne touche jamais le vivier reçu.
  const cartes = vivier.map((c) => ({ ...c }));

  // L'ordre des postes de chaque club, décidé une fois.
  const ordres: Record<IdClub, FamillePoste[]> = {};
  for (const club of clubs) {
    attributions[club] = [];
    ordres[club] = ordreDeService(profils[club], graine(`ordre|${graineLigue}|${club}`));
  }

  let curseur = 0; // combien de postes déjà servis par club
  for (let p = 0; p < PALIERS.length; p++) {
    const palier = PALIERS[p];
    const rng = graine(`dotation|${graineLigue}|${palier.min}`);
    // L'ordre de passage tourne : le dernier servi au palier précédent passe
    // en tête du suivant.
    const tour = clubs.map((_, i) => clubs[(i + p) % clubs.length]);

    for (let n = 0; n < palier.combien; n++) {
      for (const club of tour) {
        const posteVoulu = ordres[club][curseur + n];
        const carte = choisirCarte(cartes, palier, posteVoulu, rng);
        if (!carte) continue; // vivier épuisé : `verifierDotation` le signalera
        carte.proprietaire = club;
        attributions[club].push(carte.id);
        if (carte.poste !== posteVoulu) {
          compromis.push({ club, poste: posteVoulu, palier: palier.min });
        }
      }
    }
    curseur += palier.combien;
  }

  reparerCouverture(cartes, clubs, attributions, compromis);
  return { attributions, vivier: cartes, profils, compromis };
}

/**
 * LA RÉPARATION DE COUVERTURE — aucun club ne finit sans arrière.
 *
 * ⚠️ CE PASSAGE EXISTE PARCE QUE LE BANC L'A TROUVÉ, pas parce qu'on l'a
 * imaginé. À huit clubs, `npm run verify:ligue` sortait « posteVide : arriere » :
 * un club recevait bien ses 30 cartes, mais pas un seul arrière. Le mécanisme
 * est simple à voir après coup — un profil `finisseurs` place ses deux créneaux
 * d'arrière dans les paliers hauts, où le vivier n'en compte qu'une poignée ;
 * les deux créneaux tombent alors sur le repli « n'importe quel poste du
 * palier », et la famille reste vide.
 *
 * Ce n'est pas un désavantage sportif, c'est un BLOCAGE : sans arrière, aucune
 * composition n'est légale. Un club dans cet état ne peut pas jouer sa première
 * journée, et il n'a personne à qui reprocher quoi que ce soit.
 *
 * ⚠️ LA RÉPARATION ÉCHANGE AVEC LE VIVIER LIBRE, JAMAIS AVEC UN AUTRE CLUB.
 * Prendre l'arrière d'un voisin réglerait un problème en en créant un autre, et
 * surtout ça ferait de la dotation un jeu à somme nulle où l'ordre de passage
 * décide. Le club rend une carte d'un poste où il est EN EXCÉDENT et reçoit une
 * carte du poste manquant, choisie pour être **la plus proche possible en
 * note** : l'effectif garde sa force, il change seulement de forme.
 */
function reparerCouverture(
  cartes: CarteJoueur[],
  clubs: readonly IdClub[],
  attributions: Record<IdClub, IdCarte[]>,
  compromis: Dotation['compromis'],
): void {
  const parId = new Map(cartes.map((c) => [c.id, c]));
  for (const club of clubs) {
    const possedees = () => (attributions[club] ?? [])
      .map((id) => parId.get(id))
      .filter((c): c is CarteJoueur => Boolean(c));

    for (const famille of Object.keys(QUOTAS_POSTE) as FamillePoste[]) {
      const effectif = possedees();
      if (effectif.some((c) => c.poste === famille)) continue;

      const libres = cartes.filter((c) => c.proprietaire === null && c.poste === famille);
      if (!libres.length) continue; // rien à faire : `verifierDotation` le dira

      // On ne rend qu'une carte d'un poste EN EXCÉDENT — sinon la réparation
      // d'un trou en creuserait un autre.
      const parPoste = new Map<FamillePoste, CarteJoueur[]>();
      for (const c of effectif) {
        const liste = parPoste.get(c.poste) ?? [];
        liste.push(c);
        parPoste.set(c.poste, liste);
      }
      const cedables = effectif.filter((c) => (parPoste.get(c.poste)?.length ?? 0) > QUOTAS_POSTE[c.poste]);
      const candidatsACeder = cedables.length ? cedables : effectif;

      // Le couple (carte cédée, carte reçue) qui change le moins la force.
      let meilleur: { rendue: CarteJoueur; recue: CarteJoueur; ecart: number } | null = null;
      for (const rendue of candidatsACeder) {
        for (const recue of libres) {
          const ecart = Math.abs(rendue.note - recue.note);
          if (!meilleur || ecart < meilleur.ecart) meilleur = { rendue, recue, ecart };
        }
      }
      if (!meilleur) continue;

      meilleur.rendue.proprietaire = null;
      meilleur.recue.proprietaire = club;
      attributions[club] = (attributions[club] ?? [])
        .filter((id) => id !== meilleur.rendue.id)
        .concat(meilleur.recue.id);
      compromis.push({ club, poste: famille, palier: meilleur.recue.note });
    }
  }
}

/**
 * Choisit une carte libre : d'abord le poste voulu dans le palier voulu, puis
 * n'importe quel poste du palier.
 *
 * ⚠️ ON NE DÉBORDE JAMAIS DU PALIER. Compléter avec la bande au-dessus
 * donnerait un effectif plus fort que les autres — une pénurie de talonneurs
 * deviendrait un avantage sportif. Mieux vaut un poste doublé qu'un club
 * favorisé par un manque ; le compromis est journalisé, et l'écran peut le dire.
 */
function choisirCarte(
  cartes: CarteJoueur[],
  palier: PalierDotation,
  poste: FamillePoste,
  rng: () => number,
): CarteJoueur | null {
  const dansLePalier = cartes.filter(
    (c) => c.proprietaire === null && c.note >= palier.min && c.note <= palier.max,
  );
  const auPoste = dansLePalier.filter((c) => c.poste === poste);
  const candidats = auPoste.length ? auPoste : dansLePalier;
  if (!candidats.length) return null;
  return candidats[Math.floor(rng() * candidats.length)];
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LE CONTRÔLE — on ne lance pas une ligue sur une dotation bancale
// ═══════════════════════════════════════════════════════════════════════════

export interface DefautDotation {
  club: IdClub;
  motif: 'effectifIncomplet' | 'posteVide' | 'doublonCarte';
  detail: string;
}

/**
 * Relit une dotation et rend ses défauts.
 *
 * Le serveur l'appelle AVANT d'écrire quoi que ce soit : une ligue qui démarre
 * avec un club à 27 joueurs et sans talonneur ne se rattrape pas — il faudrait
 * la recréer, donc perdre les inscriptions déjà faites.
 */
export function verifierDotation(dotation: Dotation, clubs: readonly IdClub[]): DefautDotation[] {
  const defauts: DefautDotation[] = [];
  const vues = new Set<IdCarte>();
  const parId = new Map(dotation.vivier.map((c) => [c.id, c]));

  for (const club of clubs) {
    const ids = dotation.attributions[club] ?? [];
    if (ids.length !== TAILLE_EFFECTIF) {
      defauts.push({ club, motif: 'effectifIncomplet', detail: `${ids.length}/${TAILLE_EFFECTIF}` });
    }
    const parPoste = new Map<FamillePoste, number>();
    for (const id of ids) {
      if (vues.has(id)) {
        defauts.push({ club, motif: 'doublonCarte', detail: id });
      }
      vues.add(id);
      const carte = parId.get(id);
      if (carte) parPoste.set(carte.poste, (parPoste.get(carte.poste) ?? 0) + 1);
    }
    // ⚠️ AU MOINS UN JOUEUR PAR FAMILLE DE POSTE. En dessous, il n'existe
    // aucune composition légale : ce n'est pas un désavantage, c'est un blocage.
    for (const famille of Object.keys(QUOTAS_POSTE) as FamillePoste[]) {
      if (!parPoste.get(famille)) {
        defauts.push({ club, motif: 'posteVide', detail: famille });
      }
    }
  }
  return defauts;
}
