// LES RESPONSABILITÉS DU JOUEUR DE LA CARRIÈRE — ce qu'on lui confie, et quand (Correctif 17).
//
// Demande : « quand notre joueur commence à devenir important dans son club, on doit ressentir qu'il prend de plus en plus de
// responsabilités sur le terrain, jusqu'à éventuellement devenir capitaine et décider lui-même des choix importants du match :
// buteur secondaire puis principal, lanceur, vice-capitaine, capitaine ».
//
// ═══ CE QUI A ÉTÉ TRANCHÉ ═══════════════════════════════════════════════════════
//
// 1. ⚠️ UNE RESPONSABILITÉ SE MÉRITE PAR RAPPORT AU GROUPE, PAS DANS LE VIDE. Être le meilleur pied d'un club de Top 14 ne vaut pas
//    un 62 en jeu au pied dans un club amateur : on compare le joueur à SES coéquipiers (les mêmes notes dérivées que celles que
//    le moteur lit en match), rôle par rôle.
// 2. ⚠️ ELLES SE GAGNENT PAR MARCHES, et se perdent de même : une saison de mieux que tous ses partenaires donne le tee secondaire, la
//    suivante le principal ; un club qui recrute un meilleur buteur reprend le tee. On ne passe jamais de zéro à principal d'un coup.
// 3. ⚠️ LE BRASSARD EXISTAIT DÉJÀ (`Joueur.capitaine`, `meriteLeBrassard`) : il reste la source de vérité du capitanat, et la hiérarchie
//    n'ajoute que ce qui le précède — cadre du groupe, puis vice-capitaine.
// 4. ⚠️ LES RÔLES NE SONT QUE DES NOMS tant qu'on ne joue pas : c'est le moteur (`moteur/responsabilites.ts`) qui les lit, avec le
//    contrôle direct, pour donner au joueur les décisions et les tirs qui vont avec.

import type { Joueur, ResponsabilitesJoueur } from '../types';
import { attributsDe } from './carteJoueur';
import { effectifDuClub } from './effectif';
import { scoreLeadership, SEUIL_CAPITANAT } from './vestiaire';
import type { PosteId } from '../types';
import type { RoleEquipe } from './moteur/responsabilites';

/** Seuils de hiérarchie : un cadre reconnu, un vice-capitaine, un capitaine (`SEUIL_CAPITANAT`, 45). */
export const SEUIL_CADRE = 22;
export const SEUIL_VICE = 34;

export type Hierarchie = NonNullable<ResponsabilitesJoueur['hierarchie']>;

/** Les postes qui tapent : on n'y voit pas un pilier au tee. */
const POSTES_BOTTEURS: PosteId[] = ['demi_ouverture', 'arriere', 'premier_centre', 'deuxieme_centre', 'demi_melee', 'ailier_gauche', 'ailier_droit'];
const POSTES_ARRIERES: PosteId[] = POSTES_BOTTEURS;
const POSTES_TROISIEME_LIGNE: PosteId[] = ['troisieme_aile_g', 'troisieme_aile_d', 'numero_8'];

export function responsabilitesVides(): ResponsabilitesJoueur {
  return { hierarchie: 'aucune', buteur: 0, engagement: false, droppeur: false, lanceur: 0 };
}

/** Les rôles qu'il tient dans l'équipe, au format du moteur : ce que le match lit pour lui donner la main. */
export function rolesDuJoueur(j: Pick<Joueur, 'capitaine' | 'responsabilites'>): RoleEquipe[] {
  const r = j.responsabilites ?? responsabilitesVides();
  const roles: RoleEquipe[] = [];
  if (j.capitaine || r.hierarchie === 'capitaine') roles.push('capitaine');
  else if (r.hierarchie === 'vice') roles.push('viceCapitaine');
  if (r.buteur === 2) roles.push('buteur'); else if (r.buteur === 1) roles.push('buteur2');
  if (r.engagement) roles.push('engagement');
  if (r.droppeur) roles.push('droppeur');
  if (r.lanceur === 2) roles.push('lanceur'); else if (r.lanceur === 1) roles.push('lanceur2');
  return roles;
}

/** Ce qui a changé à l'évaluation : de quoi écrire le journal, sans phrase toute faite ici. */
export interface ChangementResponsabilite {
  role: 'cadre' | 'viceCapitaine' | 'capitaine' | 'buteur' | 'buteur2' | 'engagement' | 'droppeur' | 'lanceur' | 'lanceur2';
  gagne: boolean;
}

/** Combien de coéquipiers ont mieux que ce score, parmi ceux qui sont à ces postes. */
function rang(valeur: number, effectif: ReturnType<typeof effectifDuClub>, postes: PosteId[] | null, lire: (c: ReturnType<typeof effectifDuClub>[number]) => number): number {
  let n = 0;
  for (const c of effectif) {
    if (postes && !postes.includes(c.poste)) continue;
    if (lire(c) > valeur) n++;
  }
  return n;
}

const unCran = (avant: number, vise: number): 0 | 1 | 2 => {
  // On monte d'une marche par saison, on peut descendre d'une marche par saison : jamais de zéro à principal.
  const suivant = vise > avant ? avant + 1 : vise < avant ? avant - 1 : avant;
  return Math.max(0, Math.min(2, suivant)) as 0 | 1 | 2;
};

/**
 * L'ÉVALUATION D'INTERSAISON : ce que le staff lui confie, d'après sa place dans le groupe.
 *
 * ⚠️ DÉTERMINISTE (aucun tirage) : la même saison, le même joueur, le même effectif donnent les mêmes responsabilités — c'est ce qui
 * permet de la rejouer, de la tester, et de l'expliquer.
 */
export function evaluerResponsabilites(
  j: Joueur, saison: number, forceGroupe: number,
): { responsabilites: ResponsabilitesJoueur; changements: ChangementResponsabilite[] } {
  const avant = { ...responsabilitesVides(), ...(j.responsabilites ?? {}) };
  const effectif = effectifDuClub(j.club, saison).filter((c) => c.nom !== j.nom);
  const pied = j.attributs.jeuAuPied, passe = j.attributs.passe;
  const piedDe = (c: (typeof effectif)[number]) => attributsDe(c).jeuAuPied;
  const passeDe = (c: (typeof effectif)[number]) => attributsDe(c).passe;
  const apres: ResponsabilitesJoueur = { ...avant, evalueeEn: saison };
  const changements: ChangementResponsabilite[] = [];
  const note = (role: ChangementResponsabilite['role'], gagne: boolean) => changements.push({ role, gagne });

  // ── Hiérarchie : cadre, vice-capitaine, capitaine ────────────────────────
  const score = scoreLeadership(j, forceGroupe);
  const hierarchie: Hierarchie = j.capitaine || score >= SEUIL_CAPITANAT ? 'capitaine' : score >= SEUIL_VICE ? 'vice' : score >= SEUIL_CADRE ? 'cadre' : 'aucune';
  const ordre: Hierarchie[] = ['aucune', 'cadre', 'vice', 'capitaine'];
  apres.hierarchie = hierarchie;
  const monte = ordre.indexOf(hierarchie) - ordre.indexOf(avant.hierarchie ?? 'aucune');
  if (monte !== 0) note(hierarchie === 'capitaine' ? 'capitaine' : hierarchie === 'vice' ? 'viceCapitaine' : 'cadre', monte > 0);

  // ── Le tee : meilleur pied du groupe parmi ceux qui tapent ───────────────
  const botteur = POSTES_BOTTEURS.includes(j.poste);
  const rangPied = rang(pied, effectif, POSTES_BOTTEURS, piedDe);
  const viseButeur = !botteur || pied < 52 ? 0 : rangPied === 0 && pied >= 60 ? 2 : rangPied <= 1 && pied >= 55 ? 1 : 0;
  apres.buteur = unCran(avant.buteur ?? 0, viseButeur);
  if (apres.buteur !== (avant.buteur ?? 0)) note(apres.buteur === 2 || (avant.buteur ?? 0) === 2 ? 'buteur' : 'buteur2', apres.buteur > (avant.buteur ?? 0));

  // ── L'engagement : un arrière ou un demi qui tape bien, parmi les trois meilleurs pieds ──
  const vise_engagement = botteur && POSTES_ARRIERES.includes(j.poste) && pied >= 56 && rangPied <= 2;
  apres.engagement = vise_engagement;
  if (apres.engagement !== !!avant.engagement) note('engagement', apres.engagement);

  // ── Le drop : l'ouvreur dont le pied est parmi les deux meilleurs du groupe ──
  const vise_drop = j.poste === 'demi_ouverture' && pied >= 62 && rangPied <= 1;
  apres.droppeur = vise_drop;
  if (apres.droppeur !== !!avant.droppeur) note('droppeur', apres.droppeur);

  // ── Le lancer en touche : le talonneur, ou un troisième ligne qui passe bien ─
  let viseLanceur: 0 | 1 | 2 = 0;
  if (j.poste === 'talonneur') {
    const rangTalonneur = rang(passe, effectif, ['talonneur'], passeDe);
    viseLanceur = rangTalonneur === 0 ? 2 : rangTalonneur === 1 ? 1 : 0;
  } else if (POSTES_TROISIEME_LIGNE.includes(j.poste) && passe >= 58 && rang(passe, effectif, POSTES_TROISIEME_LIGNE, passeDe) === 0) {
    viseLanceur = 1;
  }
  apres.lanceur = unCran(avant.lanceur ?? 0, viseLanceur);
  if (apres.lanceur !== (avant.lanceur ?? 0)) note(apres.lanceur === 2 || (avant.lanceur ?? 0) === 2 ? 'lanceur' : 'lanceur2', apres.lanceur > (avant.lanceur ?? 0));

  return { responsabilites: apres, changements };
}

/** Une fiche de responsabilités à la création ou à la migration : l'évaluation sans historique. */
export function responsabilitesInitiales(j: Joueur, saison: number, forceGroupe: number): ResponsabilitesJoueur {
  // Sans historique, on part de zéro et on monte d'une marche : un joueur qui arrive n'a rien reçu.
  const { responsabilites } = evaluerResponsabilites({ ...j, responsabilites: undefined }, saison, forceGroupe);
  return responsabilites;
}

/** Les rôles à afficher dans le bloc « Rôles dans l'équipe » : seulement ceux qu'il tient, dans un ordre stable. */
export function rolesAffichables(j: Pick<Joueur, 'capitaine' | 'responsabilites'>): RoleEquipe[] {
  const ordre: RoleEquipe[] = ['capitaine', 'viceCapitaine', 'buteur', 'buteur2', 'engagement', 'droppeur', 'lanceur', 'lanceur2'];
  const tenus = new Set(rolesDuJoueur(j));
  return ordre.filter((r) => tenus.has(r));
}

/** Les mots pour le journal : une phrase par changement, dans la voix des autres entrées du journal du joueur. */
export function ligneDeJournal(c: ChangementResponsabilite, club: string): { titre: string; texte: string } | null {
  const T = 'Responsabilités';
  switch (c.role) {
    case 'capitaine': return null; // le brassard a déjà sa propre entrée
    case 'cadre':
      return c.gagne
        ? { titre: T, texte: `Le staff te compte désormais parmi les cadres du groupe de ${club}. On te demande ton avis, et on t'écoute.` }
        : { titre: T, texte: 'Tu n\'es plus de ceux dont le staff réclame l\'avis : il va falloir te remettre en avant.' };
    case 'viceCapitaine':
      return c.gagne
        ? { titre: T, texte: `Tu es nommé vice-capitaine de ${club}. Quand le capitaine sort, c'est toi qui prends le brassard — et les décisions de la fin de match.` }
        : { titre: T, texte: 'Le brassard de vice-capitaine passe à un autre. Le staff te le redonnera si tu reprends ta place dans le groupe.' };
    case 'buteur2':
      return c.gagne
        ? { titre: T, texte: 'Le staff te confie le tee quand le buteur n\'est pas là : tu es buteur secondaire. Les transformations et les pénalités, c\'est aussi pour toi.' }
        : { titre: T, texte: 'Un coéquipier tape mieux que toi : tu n\'es plus le buteur de rechange.' };
    case 'buteur':
      return c.gagne
        ? { titre: T, texte: `Le tee est à toi : tu es le buteur principal de ${club}. Transformations et pénalités, c'est désormais ton pied qui décide.` }
        : { titre: T, texte: 'Le club a recruté un meilleur pied : tu laisses le tee principal. Tu restes dans la hiérarchie des buteurs si tu y gardes ta place.' };
    case 'engagement':
      return c.gagne
        ? { titre: T, texte: 'Les coups d\'envoi et les engagements après les points, c\'est toi : choisis la longueur, le côté et la hauteur.' }
        : { titre: T, texte: 'Les engagements passent à un autre pied.' };
    case 'droppeur':
      return c.gagne
        ? { titre: T, texte: 'Tu es le droppeur de l\'équipe : à portée des poteaux, le staff compte sur ton pied pour aller chercher trois points.' }
        : { titre: T, texte: 'Le drop est confié à un autre.' };
    case 'lanceur':
      return c.gagne
        ? { titre: T, texte: 'Tu es le lanceur de touche de l\'équipe : l\'annonce de la combinaison et le lancer, c\'est toi.' }
        : { titre: T, texte: 'Un autre lancer en touche que le tien a la confiance du staff.' };
    case 'lanceur2':
      return c.gagne
        ? { titre: T, texte: 'Tu seras le lanceur de touche de rechange : si le premier sort, l\'alignement se fie à ton bras.' }
        : { titre: T, texte: 'Tu n\'es plus le lanceur de rechange.' };
  }
}
