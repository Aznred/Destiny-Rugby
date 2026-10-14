/**
 * L'ADJOINT COMPOSE (Correctif 41).
 *
 * Signalé en jeu : « quand je laisse l'entraîneur adjoint gérer, il aligne parfois un effectif clairement inférieur
 * alors que de meilleurs joueurs sont disponibles ».
 *
 * ⚠️ CE QUE FAISAIT L'ANCIEN CHOIX (`compositionManagerParDefaut`, toujours utilisé pour les clubs que personne ne
 * dirige) : poste par poste, dans l'ordre des numéros, le mieux noté parmi ceux qui portent EXACTEMENT ce poste — quel
 * que soit son niveau. Un ailier gauche de 58 passait donc devant trois ailiers droits de 72, et rien ne lisait ni la
 * condition physique ni l'enjeu du match.
 *
 * Ici, UNE SEULE GRANDEUR décide : la NOTE EFFECTIVE AU POSTE (`noteEffectiveAuPoste`) — la note, pesée par le rendement
 * au poste occupé (le barème du jeu, `rendementAuPoste`) et par la condition physique, selon l'importance du match.
 * Les vingt-trois places sont attribuées ensemble (affectation optimale), pas l'une après l'autre : le XV d'abord, puis
 * un banc qui COUVRE la première ligne, la cage, la troisième ligne, la charnière et les lignes arrière.
 *
 * Fonctions pures : aucun tirage, aucun store, aucune horloge. Le même effectif dans le même état rend la même feuille,
 * et le rapport dit pourquoi (`choix`, `ecartes`) — c'est ce que l'écran affiche.
 */
import type { CompositionManager, PosteId } from '../types.js';
import type { Coequipier } from './effectif.js';
import { rendementAuPoste } from './carteJoueur.js';
import { COUVERTURE_BANC, POSTES_XV_MANAGER } from './compositionManager.js';

export { COUVERTURE_BANC };

/** Ce que vaut le match : une finale aligne les meilleurs, un match mineur fait souffler ceux qui en ont besoin. */
export type ImportanceMatch = 'finale' | 'decisif' | 'ordinaire' | 'mineur' | 'amical';

/** La consigne de l'entraîneur sur un joueur : « toujours titulaire s'il est disponible » ou « ne pas le sélectionner ». */
export type ConsigneAdjoint = 'titulaire' | 'exclu';

export interface ConsignesAdjoint {
  joueurs?: Record<string, ConsigneAdjoint>;
  /** À niveau proche, l'adjoint préfère le jeune qui a encore de la marge. Jamais en finale. */
  prioriteJeunes?: boolean;
}

/** Ce que l'adjoint sait du physique d'un joueur. Absent : il est tenu pour frais. */
export interface EtatPhysiqueAdjoint {
  /** Condition physique, 0-100 (100 = parfaitement frais). */
  fraicheur?: number;
  /** Forme du moment, 0-100 (50 = neutre). */
  forme?: number;
  /** Points de note perdus à jouer diminué (soins en cours). */
  penalite?: number;
}

export interface ContexteAdjoint {
  /** Blessés, suspendus, convoqués en sélection : hors du groupe. */
  indisponibles?: ReadonlySet<string>;
  /** Autorisés par le médecin à entrer en jeu, pas à débuter. */
  bancSeulement?: ReadonlySet<string>;
  etats?: ReadonlyMap<string, EtatPhysiqueAdjoint>;
  importance?: ImportanceMatch;
  consignes?: ConsignesAdjoint;
}

export type RaisonChoix = 'consigne' | 'meilleur' | 'rotation' | 'jeune' | 'couverture' | 'depannage';
export type RaisonEcart = 'indisponible' | 'consigne' | 'repos' | 'reprise' | 'concurrence';

export interface ChoixAdjoint {
  joueurId: string;
  /** 0 à 14 : le XV ; 15 à 22 : le banc. */
  place: number;
  /** Le poste occupé (XV) ou couvert (banc). */
  poste: PosteId;
  note: number;
  noteEffective: number;
  rendement: number;
  fraicheur: number;
  raison: RaisonChoix;
  /** Rotation ou priorité aux jeunes : le joueur mieux noté qu'il remplace ce jour-là. */
  aLaPlaceDe?: string;
}

export interface EcartAdjoint {
  joueurId: string;
  note: number;
  raison: RaisonEcart;
  fraicheur: number;
  /** Concurrence : celui qui lui est préféré. */
  devance?: string;
}

export interface RapportAdjoint {
  composition: CompositionManager;
  importance: ImportanceMatch;
  choix: ChoixAdjoint[];
  ecartes: EcartAdjoint[];
  /** Faux quand le groupe disponible ne suffit pas à remplir vingt-trois places. */
  complet: boolean;
}

/** Le poids de la fatigue selon l'enjeu : presque rien en finale, davantage quand le match compte peu. */
const POIDS_FATIGUE: Record<ImportanceMatch, number> = { finale: .25, decisif: .55, ordinaire: 1, mineur: 1.5, amical: 1.7 };
/** En dessous de ce seuil de condition, jouer coûte quelque chose. Un match mineur ménage plus tôt. */
const SEUIL_FRAICHEUR: Record<ImportanceMatch, number> = { finale: 80, decisif: 80, ordinaire: 80, mineur: 88, amical: 92 };
/** Ce qu'un point de condition manquant retire au rendement (avant le poids de l'enjeu). */
const COUT_PAR_POINT = .0045;

export function seuilDeFraicheur(importance: ImportanceMatch): number {
  return SEUIL_FRAICHEUR[importance];
}

/** Ce que la condition physique laisse du joueur : 1 au-dessus du seuil, jamais moins de 0,6. */
export function facteurPhysique(fraicheur: number, importance: ImportanceMatch = 'ordinaire'): number {
  const manque = Math.max(0, SEUIL_FRAICHEUR[importance] - fraicheur);
  return Math.max(.6, 1 - manque * COUT_PAR_POINT * POIDS_FATIGUE[importance]);
}

/**
 * LA NOTE EFFECTIVE AU POSTE : ce que le joueur vaut VRAIMENT à cette place, ce jour-là.
 * Un centre de 71 placé à l'aile (rendement 0,82) vaut 58 : l'ailier de 69 passe devant.
 */
export function noteEffectiveAuPoste(
  j: Pick<Coequipier, 'note' | 'poste' | 'postesSecondaires'>, poste: PosteId,
  etat: EtatPhysiqueAdjoint = {}, importance: ImportanceMatch = 'ordinaire',
): number {
  const base = j.note - (etat.penalite ?? 0) + ((etat.forme ?? 50) - 50) * .04;
  return base * rendementAuPoste(j.poste, poste, j.postesSecondaires) * facteurPhysique(etat.fraicheur ?? 100, importance);
}

/** La même note, sans la fatigue : ce qu'il vaudrait reposé. Sert à dire qui a été ménagé. */
function noteReposee(j: Coequipier, poste: PosteId, etat: EtatPhysiqueAdjoint): number {
  return noteEffectiveAuPoste(j, poste, { ...etat, fraicheur: 100 });
}

function bonusJeune(j: Coequipier, importance: ImportanceMatch, priorite: boolean): number {
  if (j.age > 23 || j.potentiel <= j.note) return 0;
  const marge = j.potentiel - j.note;
  if (importance === 'amical') return Math.min(7, marge * .6);
  if (!priorite || importance === 'finale') return 0;
  return Math.min(importance === 'decisif' ? 1.5 : 4, marge * .4);
}

/**
 * L'importance d'une affiche. `ecartDeForce` = force de l'adversaire − la nôtre ; `journeesRestantes` en championnat.
 * Un match couperet est toujours décisif, sa finale est une finale ; en championnat, un adversaire nettement plus
 * faible loin de la fin de saison est un match où l'on peut faire tourner.
 */
export function importanceDeLAffiche(
  affiche: { nature?: string; tour?: string; cle?: string } | null | undefined,
  ecartDeForce = 0, journeesRestantes = 99,
): ImportanceMatch {
  if (!affiche) return 'ordinaire';
  if (affiche.cle?.startsWith('prepa#') || affiche.nature === 'amical') return 'amical';
  if (affiche.tour === 'finale') return 'finale';
  if (affiche.nature === 'phaseFinale' || (affiche.nature === 'coupe' && affiche.tour)) return 'decisif';
  if (journeesRestantes <= 3 && ecartDeForce > -6) return 'decisif';
  if (ecartDeForce >= 3) return 'decisif';
  if (ecartDeForce <= -6) return 'mineur';
  return 'ordinaire';
}

/** Affectation optimale (algorithme hongrois) : `gains[place][joueur]`, autant de joueurs que de places au moins. */
function affecter(gains: number[][]): number[] {
  const n = gains.length, m = gains[0]?.length ?? 0;
  const u = Array<number>(n + 1).fill(0), v = Array<number>(m + 1).fill(0);
  const p = Array<number>(m + 1).fill(0), chemin = Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array<number>(m + 1).fill(Infinity), vu = Array<boolean>(m + 1).fill(false);
    do {
      vu[j0] = true;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (vu[j]) continue;
        const cout = -gains[i0 - 1][j - 1] - u[i0] - v[j];
        if (cout < minv[j]) { minv[j] = cout; chemin[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (vu[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = chemin[j0]; p[j0] = p[j1]; j0 = j1; } while (j0 !== 0);
  }
  const choix = Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) choix[p[j] - 1] = j - 1;
  return choix;
}

const INTERDIT = -1e7;
/** Ce qui fait passer le XV avant le banc dans une seule affectation. */
const POIDS_XV = 100;
const VERROU = 5_000;

/** Le poste que couvre le mieux ce joueur à cette place du banc, et ce qu'il y vaut. */
function couverture(j: Coequipier, place: number, etat: EtatPhysiqueAdjoint, importance: ImportanceMatch): { poste: PosteId; note: number } {
  const postes = COUVERTURE_BANC[place] ?? COUVERTURE_BANC[COUVERTURE_BANC.length - 1];
  let meilleur = { poste: postes[0], note: -Infinity };
  postes.forEach((poste, rang) => {
    const note = noteEffectiveAuPoste(j, poste, etat, importance) * (rang ? .97 : 1);
    if (note > meilleur.note) meilleur = { poste, note };
  });
  return meilleur;
}

/**
 * La feuille de l'adjoint, et pourquoi.
 *
 * ⚠️ UNE CONSIGNE « TOUJOURS TITULAIRE » PASSE AVANT TOUT, y compris la fatigue : c'est l'entraîneur qui l'a posée.
 * Elle ne force pas un blessé ni un joueur que le médecin réserve au banc.
 * ⚠️ UNE CONSIGNE « NE PAS SÉLECTIONNER » CÈDE SI LE GROUPE NE SUFFIT PLUS : on ne joue pas à vingt-deux pour la tenir.
 */
export function composerParLAdjoint(effectif: readonly Coequipier[], contexte: ContexteAdjoint = {}): RapportAdjoint {
  const importance = contexte.importance ?? 'ordinaire';
  const indisponibles = contexte.indisponibles ?? new Set<string>();
  const bancSeulement = contexte.bancSeulement ?? new Set<string>();
  const consignes = contexte.consignes?.joueurs ?? {};
  const priorite = !!contexte.consignes?.prioriteJeunes;
  const etatDe = (id: string): EtatPhysiqueAdjoint => contexte.etats?.get(id) ?? {};
  const fraicheurDe = (id: string) => Math.round(etatDe(id).fraicheur ?? 100);

  // Vingt et un clubs du jeu ont deux licenciés sous le même identifiant (homonymes à une espace près) : un seul compte.
  const uniques = new Set<string>();
  const aptes = effectif.filter((j) => !indisponibles.has(j.id) && !uniques.has(j.id) && !!uniques.add(j.id));
  const libres = aptes.filter((j) => consignes[j.id] !== 'exclu');
  // La consigne d'exclusion cède devant une feuille incomplète : les exclus reviennent, les mieux notés d'abord.
  const rappeles = libres.length >= 23 ? [] : aptes.filter((j) => consignes[j.id] === 'exclu')
    .sort((a, b) => b.note - a.note).slice(0, 23 - libres.length);
  const groupe = [...libres, ...rappeles].sort((a, b) => b.note - a.note);
  const places = Math.min(23, groupe.length);

  const gainXV = (j: Coequipier, place: number) => {
    if (bancSeulement.has(j.id)) return INTERDIT;
    const poste = POSTES_XV_MANAGER[place];
    const rendement = rendementAuPoste(j.poste, poste, j.postesSecondaires);
    return noteEffectiveAuPoste(j, poste, etatDe(j.id), importance) + bonusJeune(j, importance, priorite)
      + (j.poste === poste ? .05 : 0) + (consignes[j.id] === 'titulaire' ? VERROU * rendement : 0);
  };
  const gains = Array.from({ length: places }, (_, place) => groupe.map((j) => (place < 15
    ? gainXV(j, place) * POIDS_XV
    : couverture(j, place - 15, etatDe(j.id), importance).note + bonusJeune(j, importance, priorite) * .5)));
  const affectation = places ? affecter(gains) : [];
  const elus = affectation.map((index) => groupe[index]).filter(Boolean);
  const titulaires = elus.slice(0, 15), remplacants = elus.slice(15);
  const dansLeXV = new Set(titulaires.map((j) => j.id));
  const retenus = new Set(elus.map((j) => j.id));

  // ── Pourquoi ces vingt-trois ────────────────────────────────────────────
  const choix: ChoixAdjoint[] = [];
  const menages = new Map<string, string>();
  titulaires.forEach((j, place) => {
    const poste = POSTES_XV_MANAGER[place];
    const etat = etatDe(j.id);
    const rendement = rendementAuPoste(j.poste, poste, j.postesSecondaires);
    const noteEffective = noteEffectiveAuPoste(j, poste, etat, importance);
    // Le joueur qui, reposé, aurait pris la place : s'il existe hors du XV, c'est lui qu'on ménage (ou qu'un jeune devance).
    const rival = groupe.filter((x) => !dansLeXV.has(x.id) && !bancSeulement.has(x.id))
      .map((x) => ({ x, reposee: noteReposee(x, poste, etatDe(x.id)), jour: noteEffectiveAuPoste(x, poste, etatDe(x.id), importance) }))
      .sort((a, b) => b.reposee - a.reposee)[0];
    let raison: RaisonChoix = rendement < 1 ? 'depannage' : 'meilleur';
    let aLaPlaceDe: string | undefined;
    if (consignes[j.id] === 'titulaire') raison = 'consigne';
    else if (rival && rival.reposee > noteReposee(j, poste, etat) + .01) {
      aLaPlaceDe = rival.x.id;
      raison = rival.jour > noteEffective && bonusJeune(j, importance, priorite) > 0 ? 'jeune' : 'rotation';
      if (raison === 'rotation') menages.set(rival.x.id, j.id);
    }
    choix.push({ joueurId: j.id, place, poste, note: j.note, noteEffective: Math.round(noteEffective * 10) / 10,
      rendement, fraicheur: fraicheurDe(j.id), raison, ...(aLaPlaceDe ? { aLaPlaceDe } : {}) });
  });
  remplacants.forEach((j, index) => {
    const c = couverture(j, index, etatDe(j.id), importance);
    choix.push({ joueurId: j.id, place: 15 + index, poste: c.poste, note: j.note, noteEffective: Math.round(c.note * 10) / 10,
      rendement: rendementAuPoste(j.poste, c.poste, j.postesSecondaires), fraicheur: fraicheurDe(j.id),
      raison: rendementAuPoste(j.poste, c.poste, j.postesSecondaires) < 1 ? 'depannage' : 'couverture' });
  });

  // ── Ceux qu'on s'attendrait à voir, et qui n'y sont pas ─────────────────
  const plancher = elus.length ? Math.min(...elus.map((j) => j.note)) : 0;
  const titulaireAuPoste = (j: Coequipier) => {
    const index = POSTES_XV_MANAGER.findIndex((poste, i) => titulaires[i] && rendementAuPoste(j.poste, poste, j.postesSecondaires) === 1
      && titulaires[i].id !== j.id);
    return index >= 0 ? titulaires[index].id : undefined;
  };
  const ecartes: EcartAdjoint[] = [...effectif].sort((a, b) => b.note - a.note)
    .filter((j) => (!retenus.has(j.id) && j.note >= plancher) || (menages.has(j.id) && !dansLeXV.has(j.id)))
    .slice(0, 10)
    .map((j) => {
      const fraicheur = fraicheurDe(j.id);
      if (indisponibles.has(j.id)) return { joueurId: j.id, note: j.note, raison: 'indisponible' as const, fraicheur };
      if (consignes[j.id] === 'exclu' && !retenus.has(j.id)) return { joueurId: j.id, note: j.note, raison: 'consigne' as const, fraicheur };
      if (menages.has(j.id)) return { joueurId: j.id, note: j.note, raison: 'repos' as const, fraicheur, devance: menages.get(j.id) };
      if (bancSeulement.has(j.id)) return { joueurId: j.id, note: j.note, raison: 'reprise' as const, fraicheur };
      if (fraicheur < SEUIL_FRAICHEUR[importance]) return { joueurId: j.id, note: j.note, raison: 'repos' as const, fraicheur };
      return { joueurId: j.id, note: j.note, raison: 'concurrence' as const, fraicheur, devance: titulaireAuPoste(j) };
    });

  // Le capitaine : l'expérience et le niveau, parmi les titulaires. Le buteur : le meilleur pied, un titulaire d'abord.
  const capitaine = [...titulaires].sort((a, b) => (b.age * 1.4 + b.note) - (a.age * 1.4 + a.note))[0];
  const pied = (j: Coequipier) => j.jeuAuPied ?? j.note;
  const buteur = [...titulaires].sort((a, b) => pied(b) - pied(a))[0] ?? [...remplacants].sort((a, b) => pied(b) - pied(a))[0];
  return {
    composition: {
      titulaires: titulaires.map((j) => j.id), remplacants: remplacants.map((j) => j.id),
      capitaineId: capitaine?.id ?? '', buteurId: buteur?.id ?? '',
    },
    importance, choix, ecartes, complet: places === 23,
  };
}
