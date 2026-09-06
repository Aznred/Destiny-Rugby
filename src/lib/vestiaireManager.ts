// ═══════════════════════════════════════════════════════════════════════════
// L'OVALE DU MANAGER — négocier avec le club, écouter le vestiaire, vendre
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « pareil pour X, sauf qu'on l'utilise pour démarcher les joueurs et
// négocier avec les autres clubs ; que les joueurs puissent demander leur besoin
// s'ils ne jouent pas assez ou dire qu'ils veulent partir ; pouvoir vendre les
// joueurs ».
//
// ⚠️ CE FICHIER EST PUR ET NE MUTE RIEN. Le store compare des références : une
// négociation qui se modifie en place ne redessinerait rien à l'écran. C'est la
// même règle que `lib/negociation.ts` du côté joueur.

import { competitionDuClub, COMPETITIONS } from '../data/clubs.js';
import { graine } from './championnat.js';
import { pseudoStable } from './comptes.js';
import { estAmateurNiveau, forceDuGroupe, saisonsDeContrat, valeurMarchande } from './recrutementManager.js';
import type {
  CibleRecrutementManager, DemandeJoueur, Manager, NegociationClubManager, OffreVente, VenteManager,
} from '../types.js';
import type { Coequipier } from './effectif.js';

function arrondir(v: number, pas: number): number {
  return Math.max(0, Math.round(v / pas) * pas);
}

// ---------------------------------------------------------------------------
// 1. NÉGOCIER L'INDEMNITÉ AVEC LE CLUB VENDEUR
// ---------------------------------------------------------------------------

export type LevierClubManager = 'monter' | 'bonus' | 'revente' | 'accepter';

/**
 * Le plancher d'un club vendeur, en part de ce qu'il réclame.
 *
 * ⚠️ IL EST CACHÉ, ET IL EST FIGÉ À L'OUVERTURE (graine = club + joueur +
 * saison). Rouvrir la sauvegarde ne redonne jamais une meilleure main : c'est
 * la même protection anti-save-scumming que les approches du mode joueur.
 */
const PLANCHER_MIN = 0.68;
const PLANCHER_MAX = 0.8;
/** L'offre d'ouverture du manager : SOUS le plancher, sinon il n'y a rien à négocier. */
const OUVERTURE = 0.6;
/** Ce qu'une marche fait monter l'offre. */
const PAS_MONTEE = 0.09;
/** Ce qu'un bonus conditionnel fait céder au club. */
const REMISE_BONUS = 0.06;
const PATIENCE_CLUB = 4;

export function ouvrirNegociationClub(
  cible: CibleRecrutementManager, saison: number, semaine: number,
): NegociationClubManager {
  const rng = graine(`indemnite#${cible.club}#${cible.id}#${saison}`);
  const part = PLANCHER_MIN + rng() * (PLANCHER_MAX - PLANCHER_MIN);
  const besoins: NonNullable<NegociationClubManager['besoinVendeur']>[] = [
    'finances', 'remplacement', 'garderCadre', 'degraisser',
  ];
  return {
    id: `club-${cible.id}-${saison}`,
    // ⚠️ LE PSEUDO DOIT ÊTRE CELUI DE L'ANNUAIRE. Avec un identifiant inventé
    // pour l'occasion, la messagerie ne retrouve pas le compte et la
    // conversation n'apparaît pas : le club écrit dans le vide. Défaut déjà
    // payé une fois sur les approches du mode joueur.
    pseudo: pseudoStable(cible.club, '_officiel'),
    club: cible.club,
    cible,
    demande: cible.indemnite,
    offre: arrondir(cible.indemnite * OUVERTURE, 25_000),
    plancher: arrondir(cible.indemnite * part, 25_000),
    patience: PATIENCE_CLUB,
    etat: 'ouverte',
    saison,
    semaine,
    bonus: 0,
    pourcentageRevente: 0,
    besoinVendeur: besoins[Math.floor(rng() * besoins.length)],
    urgence: 20 + Math.round(rng() * 75),
    alternatives: Math.floor(rng() * 4),
  };
}

export interface ResultatClub {
  negociation: NegociationClubManager;
  accord: boolean;
}

export function negocierAvecClub(
  nego: NegociationClubManager, levier: LevierClubManager,
): ResultatClub {
  if (nego.etat !== 'ouverte') return { negociation: nego, accord: nego.etat === 'accord' };

  // Payer le prix demandé conclut sur-le-champ : c'est le droit du manager
  // pressé, et il coûte exactement ce qu'il évite de négocier.
  if (levier === 'accepter') {
    return { negociation: { ...nego, offre: nego.demande, etat: 'accord' }, accord: true };
  }

  let { offre, plancher, patience } = nego;
  let bonus = nego.bonus ?? 0;
  let pourcentageRevente = nego.pourcentageRevente ?? 0;
  if (levier === 'monter') {
    offre = Math.min(nego.demande, arrondir(offre * (1 + PAS_MONTEE), 25_000));
  } else if (levier === 'bonus') {
    // ⚠️ LE BONUS CONDITIONNEL NE COÛTE RIEN TOUT DE SUITE, et c'est ce qui en
    // fait un vrai levier : on paie en pourcentage de ce que le joueur fera.
    // Le club cède donc un peu — mais il n'est pas dupe, et sa patience
    // s'use : on ne peut pas empiler les promesses.
    plancher = arrondir(plancher * (1 - REMISE_BONUS), 25_000);
    bonus = Math.min(nego.demande * .3, bonus + arrondir(nego.demande * .06, 10_000));
  } else {
    // Un pourcentage à la revente vaut davantage pour un club formateur, mais
    // reste différé : il ne réduit le prix comptant que de façon limitée.
    pourcentageRevente = Math.min(20, pourcentageRevente + 10);
    plancher = arrondir(plancher * .95, 25_000);
  }
  patience -= 1;

  if (offre >= plancher) {
    return { negociation: { ...nego, offre, plancher, patience, bonus, pourcentageRevente, etat: 'accord' }, accord: true };
  }
  if (patience <= 0) {
    return { negociation: { ...nego, offre, plancher, patience: 0, bonus, pourcentageRevente, etat: 'rompue' }, accord: false };
  }
  return { negociation: { ...nego, offre, plancher, patience, bonus, pourcentageRevente }, accord: false };
}

// ---------------------------------------------------------------------------
// 2. LE VESTIAIRE PARLE
// ---------------------------------------------------------------------------

/**
 * La part de feuilles de match sous laquelle un joueur se sent lésé.
 *
 * ⚠️ C'EST MESURÉ, PAS TIRÉ AU SORT. `Manager.tempsDeJeu` compte les feuilles
 * de match réellement obtenues : un joueur se plaint parce qu'il n'a pas joué,
 * jamais parce qu'un dé l'a désigné. Un système qui punirait au hasard serait
 * illisible — et le joueur aurait raison de le prendre pour un bug.
 */
const PART_LESE = 0.34;
/** On ne se plaint pas avant d'avoir laissé sa chance au manager. */
const MATCHS_AVANT_DE_SE_PLAINDRE = 5;
/** Un jeune de 19 ans ne réclame pas sa place ; un joueur fait, oui. */
const AGE_MIN_DEMANDE = 22;

/**
 * Qui vient se plaindre, et de quoi. Rend `null` quand personne n'a de raison.
 *
 * ⚠️ UN SEUL À LA FOIS. Trois messages le même jour, et la réponse devient une
 * corvée administrative plutôt qu'une décision de manager.
 */
export function demandeAGenerer(
  m: Manager, effectif: Coequipier[], matchsJoues: number,
): Omit<DemandeJoueur, 'id' | 'saison' | 'semaine' | 'etat'> | null {
  if (matchsJoues < MATCHS_AVANT_DE_SE_PLAINDRE) return null;
  const dejaVus = new Set(
    m.demandes.filter((d) => d.saison === m.saison).map((d) => d.joueurId),
  );
  const force = forceDuGroupe(m.club, m.saison);
  const seuil = matchsJoues * PART_LESE;

  const laises = effectif.filter((j) => (
    j.age >= AGE_MIN_DEMANDE
    && !dejaVus.has(j.id)
    && (m.tempsDeJeu[j.id] ?? 0) < seuil
    // Un remplaçant qui vaut dix points de moins que le groupe sait pourquoi il
    // ne joue pas. Celui qui se plaint, c'est celui qui a des arguments.
    && j.note >= force - 3
  ));
  if (!laises.length) {
    // ⚠️ ON N'ÉTAIT CONVOITÉ QUE QUAND ON BOUDAIT. Jusqu'ici, la seule façon
    // qu'un joueur bouge était qu'il se PLAIGNE de son temps de jeu : une star
    // alignée tous les week-ends ne recevait donc jamais la moindre marque
    // d'intérêt, et le manager n'avait aucun moyen de faire rentrer de l'argent
    // sans d'abord mettre au placard son meilleur élément. Retour de jeu :
    // « ils se font pas acheter ou reçoivent pas d'offres en fonction du
    // potentiel ou du niveau ».
    //
    // ⚠️ LE CRITÈRE EST CELUI QU'ON ATTEND : trop bon pour son étage, ou jeune
    // avec de la marge. Un club supérieur remarque d'abord celui qui dépasse,
    // ensuite celui qui promet. Le tirage est SEEDÉ sur la semaine : la même
    // sauvegarde rejouée donne la même convoitise, et recharger la page ne fait
    // pas apparaître une offre qui n'était pas là.
    const convoitables = effectif.filter((j) => {
      if (dejaVus.has(j.id) || j.age < AGE_MIN_DEMANDE) return false;
      const auDessus = j.note - force;
      const marge = j.potentiel - j.note;
      return auDessus >= 5 || (j.age <= 23 && marge >= 8 && auDessus >= -2);
    });
    if (!convoitables.length) return null;

    // Plus le joueur dépasse son étage, plus les clubs sont insistants — mais
    // ça reste un évènement : une fois toutes les huit journées environ.
    const lui = convoitables.sort((a, b) => (b.note - b.age * 0.3) - (a.note - a.age * 0.3))[0];
    const interet = Math.min(0.3, 0.05 + Math.max(0, lui.note - force) * 0.025);
    const dé = graine(`convoitise#${m.club}#${lui.id}#${m.saison}#${m.semaine}`)();
    if (dé > interet) return null;

    return {
      pseudo: pseudoStable(lui.nom),
      joueurId: lui.id,
      nom: lui.nom,
      poste: lui.poste,
      note: lui.note,
      type: 'depart',
      raison: m.avancee?.contratsJoueurs[lui.id]?.offresExterieures ? 'offreRecue' : 'ambition',
    };
  }

  const lui = laises.sort((a, b) => b.note - a.note)[0];
  return {
    pseudo: pseudoStable(lui.nom),
    joueurId: lui.id,
    nom: lui.nom,
    poste: lui.poste,
    note: lui.note,
    // ⚠️ CELUI QUI EST TROP BON POUR LE BANC NE DEMANDE PAS À JOUER : IL PART.
    // C'est la différence entre les deux messages, et elle décide de ce que le
    // manager peut faire — donner du temps de jeu, ou vendre.
    type: lui.note >= force + 2 ? 'depart' : 'tempsDeJeu',
    // ⚠️ UN DOSSIER ABSENT N'EST PAS UN CONFLIT. Ces trois lectures sont
    // optionnelles (`?.`) : sans valeur par défaut, TypeScript refuse la
    // comparaison — et à l'exécution `undefined < 35` vaut `false`, ce qui
    // aurait silencieusement rangé tout le monde dans « temps de jeu ». On
    // prend donc le repli le plus NEUTRE : pas de dossier, pas de grief.
    raison: (m.avancee?.vestiaire[lui.id]?.relationManager ?? 100) < 35 ? 'conflitManager'
      : (m.avancee?.profonde.integrations[lui.id]?.bonheur ?? 100) < 38 ? 'famillePays'
        : m.avancee?.contratsJoueurs[lui.id]?.demandeRevalorisation ? 'contrat' : 'tempsDeJeu',
  };
}

// ---------------------------------------------------------------------------
// 3. VENDRE
// ---------------------------------------------------------------------------

/** Ce qu'on peut espérer d'un joueur du groupe, au barème du jeu. */
/**
 * CE QUE VAUT UN JOUEUR QU'ON MET SUR LA LISTE — contrat compris.
 *
 * ⚠️ LE CONTRAT ÉTAIT IGNORÉ, ET C'EST CE QUI FAISAIT « TOUT LE MONDE EST
 * LIBRE ». `saisonsDeContrat` existe depuis le lot du marché mondial et donne à
 * CHAQUE joueur du monde une durée de contrat déterministe (2 à 4 saisons, qui
 * s'écoulent) — le commentaire de cette fonction dit même qu'elle « commande
 * tout le nouveau marché ». Mais la vente, elle, ne la lisait pas : on vendait
 * un cadre sous contrat trois ans au même prix qu'un joueur libre dans un mois,
 * et l'écran ne montrait nulle part qu'un contrat existait.
 *
 * ⚠️ À ZÉRO SAISON RESTANTE, ON NE TOUCHE RIEN. C'est la règle du rugby comme
 * du football : un joueur en fin de contrat part libre. Vendre, c'est donc
 * arbitrer — encaisser maintenant, ou garder et perdre l'indemnité.
 */
export function valeurDeVente(
  j: Pick<Coequipier, 'note' | 'potentiel' | 'age' | 'id'>, club: string, saison = 1,
  contexte?: { historiqueMedical?: number; sequelles?: number; contratFin?: number },
): number {
  const base = valeurMarchande(j, competitionDuClub(club)?.niveau ?? 8);
  if (base <= 0) return 0;
  const restantes = contexte?.contratFin !== undefined
    ? Math.max(0, contexte.contratFin - saison) : saisonsDeContrat(club, j.id, saison);
  // Trois ans et plus : plein tarif. Un an : le club acheteur sait qu'il peut
  // attendre, il ne paie qu'une part. Zéro : départ libre.
  const part = restantes <= 0 ? 0 : restantes === 1 ? 0.5 : restantes === 2 ? 0.8 : 1;
  // La visite médicale ne détruit pas une valeur sur une petite contusion.
  // Les récidives et séquelles durables, elles, réduisent le risque que prend
  // l'acheteur et donc ce qu'il accepte de garantir au vendeur.
  const medical = Math.max(.62, 1 - (contexte?.historiqueMedical ?? 0) * .025 - (contexte?.sequelles ?? 0) * .006);
  return Math.round(base * part * medical);
}

/**
 * Qui se manifeste pour un joueur mis sur la liste.
 *
 * Sous la Nationale 2, les clubs ne versent pas un prix de transfert
 * professionnel : ils règlent une petite indemnité de formation. L'ancienne
 * version confondait « pas de gros transfert payant » et « aucun départ
 * possible » : le bouton restait grisé pendant toute une carrière amateur et
 * donnait l'impression que le mercato ne fonctionnait pas.
 */
export function offresPourVente(
  vente: VenteManager, clubVendeur: string, saison: number,
): OffreVente[] {
  const niveau = competitionDuClub(clubVendeur)?.niveau ?? 8;
  const amateur = estAmateurNiveau(niveau) || vente.valeur <= 0;

  const rng = graine(`vente#${clubVendeur}#${vente.joueurId}#${saison}`);
  // Les acheteurs crédibles : le même étage, ou un cran au-dessus. Un club de
  // Fédérale 1 ne rachète pas un joueur de Top 14, et l'inverse ne se négocie
  // pas sur une liste des transferts.
  const candidats: { club: string; division: string }[] = [];
  for (const c of COMPETITIONS) {
    if (c.niveau > niveau || c.niveau < niveau - 2) continue;
    // Un départ amateur reste dans le bassin amateur ou peut offrir un premier
    // projet semi-pro. Une vente professionnelle, elle, ne redescend pas vers
    // un club qui ne peut verser aucune indemnité.
    if (!amateur && estAmateurNiveau(c.niveau)) continue;
    for (const club of c.clubs) {
      if (club.nom !== clubVendeur) candidats.push({ club: club.nom, division: c.nom });
    }
  }
  if (!candidats.length) return [];

  const combien = 1 + Math.floor(rng() * 3);
  const offres: OffreVente[] = [];
  const vus = new Set<string>();
  for (let i = 0; i < combien; i++) {
    const pris = candidats[Math.floor(rng() * candidats.length)];
    if (vus.has(pris.club)) continue;
    vus.add(pris.club);
    // Autour de la valeur du barème : on ne brade pas, on ne s'envole pas.
    //
    // ⚠️ UN CLUB AMATEUR NE PAYAIT RIEN, MÊME QUAND LE JOUEUR VALAIT QUELQUE
    // CHOSE. Ce `montant: 0` était le second verrou du marché amateur : même
    // après avoir donné une vraie indemnité au barème, toutes les offres reçues
    // sous la Nationale restaient à zéro. On verse donc l'indemnité — au pas de
    // 500 € et non de 25 000, parce qu'on parle de milliers d'euros, pas de
    // millions.
    const pas = amateur ? 500 : 25_000;
    offres.push({
      id: `${pris.club}#${vente.joueurId}#${saison}#${i}`,
      club: pris.club,
      division: pris.division,
      montant: vente.valeur <= 0 ? 0 : arrondir(vente.valeur * (0.82 + rng() * 0.36), pas),
    });
  }
  return offres.sort((a, b) => b.montant - a.montant);
}
