// Cahier de jeu partagé par le navigateur et le serveur. Les coordonnées sont
// des mètres depuis la conquête, dans le sens d'attaque de l'équipe.
export type PhaseCombinaison = 'melee' | 'touche' | 'ruck';
/** `ligne10` : les dix derniers mètres avant la ligne adverse (Correctif 41) — pick and go, cellule courte, maul. */
export type ZoneCombinaison = 'toutes' | 'nos22' | 'milieu' | 'leurs22' | 'ligne10';
export type CouloirCombinaison = 'tous' | 'gauche' | 'centre' | 'droite';
export type PiedCombinaison = 'occupation' | 'degagement' | 'chandelle' | 'rasant' | 'transversale' | 'cinquanteVingtDeux' | 'drop';
export interface PointCombinaison { x: number; y: number }
export interface PlacementCombinaison extends PointCombinaison { numero: number }
export interface ToucheCombinaison {
  alignes: 4 | 5 | 7;
  /** Distance de réception depuis la touche : alignement 5–15 m, lancer au-delà jusqu'à 25 m. */
  distance: number;
  feinte: boolean;
  /**
   * Cahier vivant (règles 11). Absents, la touche se joue exactement comme avant.
   * `doubleFeinte` : deux blocs montent pour de faux avant le vrai saut. `glissement` : le sauteur vient d'un autre bloc et
   * n'entre à sa place qu'au dernier moment. `maul` : le ballon gagné, le pack forme un maul ; quand le ballon en ressort,
   * la combinaison reprend au geste de celui qui le tient (en général le 9).
   */
  doubleFeinte?: boolean;
  glissement?: boolean;
  maul?: boolean;
}
export type ActionCombinaison = (
  | { type: 'passe'; destinataire: number }
  | { type: 'course'; destination: PointCombinaison }
  | { type: 'leurre'; numero: number; destination: PointCombinaison }
  | { type: 'pied'; intention: PiedCombinaison }) & {
    /** Ce geste rejoint la même étape que le geste précédent et démarre avec lui. */
    simultanee?: boolean;
  };
export interface EtapeCombinaison { actions: { action: ActionCombinaison; index: number }[] }

/**
 * LES OPTIONS D'UNE COMBINAISON (Correctif 41, points 8 et 9) — « une combinaison ne doit pas être une cinématique rigide ».
 * À l'étape `etape`, au moment où son porteur doit jouer, il LIT la défense : si la condition est vraie, il joue la réponse
 * au lieu du geste prévu, et la combinaison s'arrête là — le jeu reprend. Les options sont lues dans l'ordre : la première
 * vraie l'emporte, sinon c'est l'option principale (le geste du cahier).
 *
 * ⚠️ Lues par le moteur des seuls matchs en « cahier vivant » (règles 11). Un cahier sans options, ou un match d'avant,
 * rejoue exactement comme avant.
 */
export type ConditionCombinaison = 'monteeRapide' | 'receveurMarque' | 'intervalleInterieur' | 'intervalleExterieur' | 'joueurLibre' | 'ailierMonte' | 'surnombre';
export const CONDITIONS_COMBINAISON: readonly ConditionCombinaison[] = ['monteeRapide', 'receveurMarque', 'intervalleInterieur', 'intervalleExterieur', 'joueurLibre', 'ailierMonte', 'surnombre'];
export type ReponseCombinaison =
  | { type: 'passe'; destinataire: number }
  | { type: 'pied'; intention: PiedCombinaison }
  /** Il garde le ballon et attaque ce qu'il voit : la combinaison est abandonnée, le jeu libre reprend. */
  | { type: 'garder' };
export interface OptionCombinaison { etape: number; condition: ConditionCombinaison; reponse: ReponseCombinaison }
export const MAX_OPTIONS = 6;
/** D'où vient un plan ajouté depuis le marché des combinaisons : sert aux statistiques et aux nouvelles versions. */
export interface OrigineCombinaison { publication: string; version: number }

/** Les cahiers existants gardent une étape par action. Un seul ballon par étape. */
export function etapesCombinaison(actions: ActionCombinaison[]): EtapeCombinaison[] {
  const etapes: EtapeCombinaison[] = [];
  actions.forEach((action, index) => {
    if (!action.simultanee || !etapes.length) etapes.push({ actions: [] });
    etapes.at(-1)!.actions.push({ action, index });
  });
  return etapes;
}
export interface VarianteCombinaison {
  nom: string;
  poids: number;
  depart: number;
  sauteur: number;
  touche?: ToucheCombinaison;
  placements: PlacementCombinaison[];
  actions: ActionCombinaison[];
  options?: OptionCombinaison[];
}
export interface Combinaison {
  id: string;
  nom: string;
  active: boolean;
  phase: PhaseCombinaison;
  zone: ZoneCombinaison;
  couloir: CouloirCombinaison;
  variantes: VarianteCombinaison[];
  origine?: OrigineCombinaison;
}
/**
 * LES EMPLACEMENTS TACTIQUES (point 19) : le nombre de combinaisons ACTIVES par situation. On peut en garder davantage
 * dans son cahier ; celles en trop sont rangées (inactives). Leur somme est la taille du cahier.
 */
export type SituationCahier = 'ruck' | 'melee' | 'touche' | 'ligne10';
export const SITUATIONS_CAHIER: readonly SituationCahier[] = ['ruck', 'melee', 'touche', 'ligne10'];
export const EMPLACEMENTS: Record<SituationCahier, number> = { ruck: 4, melee: 3, touche: 3, ligne10: 2 };
export function situationDuPlan(c: Pick<Combinaison, 'phase' | 'zone'>): SituationCahier { return c.zone === 'ligne10' ? 'ligne10' : c.phase; }
/** Le compte des plans actifs par situation, et ceux qui dépassent (dans l'ordre du cahier : les derniers sont en trop). */
export function emplacementsOccupes(plans: readonly Combinaison[]): { occupes: Record<SituationCahier, number>; enTrop: string[] } {
  const occupes: Record<SituationCahier, number> = { ruck: 0, melee: 0, touche: 0, ligne10: 0 };
  const enTrop: string[] = [];
  for (const c of plans) {
    if (!c.active) continue;
    const s = situationDuPlan(c);
    if (occupes[s] >= EMPLACEMENTS[s]) enTrop.push(c.id); else occupes[s] += 1;
  }
  return { occupes, enTrop };
}
/** Range (désactive) les plans qui dépassent leurs emplacements. Rien d'autre ne change. */
export function rangerEnTrop(plans: Combinaison[]): Combinaison[] {
  const { enTrop } = emplacementsOccupes(plans);
  return enTrop.length ? plans.map(c => enTrop.includes(c.id) ? { ...c, active: false } : c) : plans;
}
/** Qui tient le ballon au début de chaque étape (index = étape), plus celui qui l'a après la dernière. */
export function porteursParEtape(phase: PhaseCombinaison, v: Pick<VarianteCombinaison, 'depart' | 'sauteur' | 'actions'>): number[] {
  let porteur = phase === 'touche' ? v.sauteur : v.depart;
  const porteurs = [porteur];
  for (const etape of etapesCombinaison(v.actions)) {
    const passe = etape.actions.find(a => a.action.type === 'passe')?.action;
    if (passe?.type === 'passe') porteur = passe.destinataire;
    porteurs.push(porteur);
  }
  return porteurs;
}
export const MAX_COMBINAISONS = 12;
export const MAX_VARIANTES = 3;
export const MAX_ACTIONS = 80;
export const MAX_ETAPES = 10;
export type ErreurVariante = { type: 'vide' | 'passeASoi' | 'apresPied' | 'ballonsMultiples' | 'joueurDouble' | 'tropEtapes'; action?: number };
export function erreursVariante(phase: PhaseCombinaison, v: Pick<VarianteCombinaison, 'depart' | 'sauteur' | 'actions'>): ErreurVariante[] {
  const erreurs: ErreurVariante[] = [];
  if (!v.actions.length) erreurs.push({ type: 'vide' });
  let porteur = phase === 'touche' ? v.sauteur : v.depart;
  let pied = false;
  const etapes = etapesCombinaison(v.actions);
  if (etapes.length > MAX_ETAPES) erreurs.push({ type: 'tropEtapes' });
  for (const etape of etapes) {
    const ballon = etape.actions.filter(a => a.action.type !== 'leurre');
    if (ballon.length > 1) erreurs.push({ type: 'ballonsMultiples', action: ballon[1].index + 1 });
    const joueurs = new Set<number>();
    for (const { action: a, index: i } of etape.actions) {
      if (pied) erreurs.push({ type: 'apresPied', action: i + 1 });
      const acteur = a.type === 'leurre' ? a.numero : porteur;
      if (joueurs.has(acteur)) erreurs.push({ type: 'joueurDouble', action: i + 1 });
      joueurs.add(acteur);
      if (a.type === 'passe' && a.destinataire === porteur) erreurs.push({ type: 'passeASoi', action: i + 1 });
    }
    const principale = ballon[0]?.action;
    if (principale?.type === 'passe') porteur = principale.destinataire;
    if (principale?.type === 'pied') pied = true;
  }
  return erreurs;
}
const PIEDS: PiedCombinaison[] = ['occupation', 'degagement', 'chandelle', 'rasant', 'transversale', 'cinquanteVingtDeux', 'drop'];
const objet = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const nombre = (v: unknown, min: number, max: number, defaut: number) => typeof v === 'number' && Number.isFinite(v) ? borner(v, min, max) : defaut;
const numero = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 15;
const texte = (v: unknown, defaut: string) => typeof v === 'string' ? v.replace(/\p{Cc}/gu, '').trim().slice(0, 40) || defaut : defaut;
const point = (v: unknown): PointCombinaison => ({ x: nombre(objet(v).x, -35, 35, 0), y: nombre(objet(v).y, -65, 65, 0) });

/** Les anciens cahiers sans réglage de touche restent utilisables. */
export function toucheValide(brut: unknown): ToucheCombinaison {
  const t = objet(brut);
  return { alignes: t.alignes === 4 || t.alignes === 7 ? t.alignes : 5,
    distance: Math.round(nombre(t.distance, 5, 25, 8.1) * 10) / 10, feinte: t.feinte === true,
    // Les champs du cahier vivant n'existent que s'ils sont demandés : un ancien cahier garde sa forme exacte.
    ...(t.doubleFeinte === true ? { doubleFeinte: true } : {}), ...(t.glissement === true ? { glissement: true } : {}),
    ...(t.maul === true ? { maul: true } : {}) };
}
/** Les options d'une variante, bornées et cohérentes : une étape qui existe, une réponse jouable par son porteur. */
export function optionsValides(brut: unknown, phase: PhaseCombinaison, v: Pick<VarianteCombinaison, 'depart' | 'sauteur' | 'actions'>): OptionCombinaison[] {
  if (!Array.isArray(brut)) return [];
  const etapes = etapesCombinaison(v.actions);
  const porteurs = porteursParEtape(phase, v);
  const vues = new Set<string>();
  return brut.slice(0, MAX_OPTIONS * 3).flatMap<OptionCombinaison>(oBrut => {
    const o = objet(oBrut), r = objet(o.reponse);
    const etape = typeof o.etape === 'number' && Number.isInteger(o.etape) ? o.etape : -1;
    if (etape < 0 || etape >= etapes.length || !CONDITIONS_COMBINAISON.includes(o.condition as ConditionCombinaison)) return [];
    // Une option se lit quand le porteur joue le ballon : pas sur une étape d'appels seuls.
    if (!etapes[etape].actions.some(a => a.action.type !== 'leurre')) return [];
    const cle = `${etape}:${o.condition as string}`;
    if (vues.has(cle)) return [];
    const condition = o.condition as ConditionCombinaison;
    let reponse: ReponseCombinaison | null = null;
    if (r.type === 'passe' && numero(r.destinataire) && r.destinataire !== porteurs[etape]) reponse = { type: 'passe', destinataire: r.destinataire as number };
    else if (r.type === 'pied' && PIEDS.includes(r.intention as PiedCombinaison)) reponse = { type: 'pied', intention: r.intention as PiedCombinaison };
    else if (r.type === 'garder') reponse = { type: 'garder' };
    if (!reponse) return [];
    vues.add(cle);
    return [{ etape, condition, reponse }];
  }).slice(0, MAX_OPTIONS);
}
export function origineValide(brut: unknown): OrigineCombinaison | undefined {
  const o = objet(brut);
  return typeof o.publication === 'string' && /^[a-z0-9-]{6,40}$/.test(o.publication) && typeof o.version === 'number' && Number.isInteger(o.version) && o.version >= 1 && o.version <= 999
    ? { publication: o.publication, version: o.version } : undefined;
}

export function lancerApresBloc(v: Pick<VarianteCombinaison, 'touche'>): boolean { return toucheValide(v.touche).distance > 15; }

/** Un lancer long traverse l'alignement ; personne ne s'aligne au-delà des 15 m avant le lancer. */
export function receptionTouche(mark: PointCombinaison, v: Pick<VarianteCombinaison, 'touche'>, sensAttaque = 1): PointCombinaison {
  return { x: mark.x - sensAttaque * .44, y: mark.y < 35 ? toucheValide(v.touche).distance : 70 - toucheValide(v.touche).distance };
}

/** Remplace seulement le gabarit erroné des anciens exemples ; les placements dessinés restent libres. */
export function placementsPersonnalises(v: VarianteCombinaison): PlacementCombinaison[] {
  const numeros = [9, 10, 12, 13, 14, 15];
  const ancien = (laterale: boolean) => numeros.every((n, i) => v.placements.some(p => p.numero === n && p.x === -2 - i * 2 && p.y === (laterale ? 10 + i * 6 : -12 + i * 6)));
  return ancien(false) || ancien(true) ? v.placements.filter(p => !numeros.includes(p.numero)) : v.placements;
}

/** Même ordre et mêmes distances dans l'éditeur et dans le moteur. */
export function alignementCombinaison(v: Pick<VarianteCombinaison, 'sauteur' | 'touche'>, disponibles = [1, 3, 4, 5, 6, 7, 8]): { numero: number; distance: number }[] {
  const t = toucheValide(v.touche);
  const numeros = disponibles.slice(0, t.alignes);
  if (!numeros.includes(v.sauteur) && disponibles.includes(v.sauteur)) numeros[numeros.length - 1] = v.sauteur;
  const distances = numeros.map((_, i) => 5 + i * 1.55);
  if (lancerApresBloc(v)) return numeros.map((numero, i) => ({ numero, distance: distances[i] }));
  const cible = distances.reduce((meilleur, d, i) => Math.abs(d - t.distance) < Math.abs(distances[meilleur] - t.distance) ? i : meilleur, 0);
  const ancien = numeros.indexOf(v.sauteur);
  if (ancien >= 0) [numeros[cible], numeros[ancien]] = [numeros[ancien], numeros[cible]];
  return numeros.map((numero, i) => ({ numero, distance: numero === v.sauteur ? t.distance : distances[i] }));
}

/** Limites identiques côté client et serveur ; aucun bonus de performance reçu. */
export function combinaisonsValides(brut: unknown): Combinaison[] {
  if (!Array.isArray(brut)) return [];
  const ids = new Set<string>();
  return brut.slice(0, MAX_COMBINAISONS).flatMap((valeur, i) => {
    const c = objet(valeur);
    if (!['melee', 'touche', 'ruck'].includes(c.phase as string)) return [];
    const variantes = (Array.isArray(c.variantes) ? c.variantes : []).slice(0, MAX_VARIANTES).flatMap((valeurV, j) => {
      const v = objet(valeurV);
      const vus = new Set<number>();
      const placements: PlacementCombinaison[] = (Array.isArray(v.placements) ? v.placements : []).slice(0, 15).flatMap(pBrut => {
        const p = objet(pBrut);
        if (!numero(p.numero) || vus.has(p.numero as number)) return [];
        vus.add(p.numero as number);
        return [{ numero: p.numero as number, ...point(p) }];
      });
      const actions: ActionCombinaison[] = (Array.isArray(v.actions) ? v.actions : []).slice(0, MAX_ACTIONS).flatMap<ActionCombinaison>(aBrut => {
        const a = objet(aBrut);
        const simultanee = a.simultanee === true ? { simultanee: true } : {};
        if (a.type === 'passe' && numero(a.destinataire)) return [{ type: 'passe', destinataire: a.destinataire as number, ...simultanee }];
        if (a.type === 'course') return [{ type: 'course', destination: point(a.destination), ...simultanee }];
        if (a.type === 'leurre' && numero(a.numero)) return [{ type: 'leurre', numero: a.numero as number, destination: point(a.destination), ...simultanee }];
        if (a.type === 'pied' && PIEDS.includes(a.intention as PiedCombinaison)) return [{ type: 'pied', intention: a.intention as PiedCombinaison, ...simultanee }];
        return [];
      });
      if (!actions.length) return [];
      // Après un coup de pied, le ballon est disputé : la suite appartient au jeu.
      const pied = etapesCombinaison(actions).findIndex(e => e.actions.some(a => a.action.type === 'pied'));
      const bornees = etapesCombinaison(actions).slice(0, pied < 0 ? MAX_ETAPES : Math.min(MAX_ETAPES, pied + 1)).flatMap(e => e.actions.map(a => a.action));
      // Un client bricolé ne peut commander deux gestes du ballon ni deux
      // déplacements contradictoires du même joueur au même instant.
      const candidate = { depart: c.phase === 'melee' ? v.depart === 8 ? 8 : 9 : numero(v.depart) && (v.depart as number) <= 9 ? v.depart as number : 9,
        sauteur: numero(v.sauteur) && v.sauteur !== 2 && ((v.sauteur as number) <= 8 || toucheValide(v.touche).distance > 15) ? v.sauteur as number : 4,
        actions: bornees };
      if (erreursVariante(c.phase as PhaseCombinaison, candidate).some(e => e.type === 'ballonsMultiples' || e.type === 'joueurDouble')) return [];
      const options = optionsValides(v.options, c.phase as PhaseCombinaison, candidate);
      return [{ nom: texte(v.nom, `Variante ${j + 1}`), poids: Math.round(nombre(v.poids, 1, 100, 1)),
        depart: candidate.depart, sauteur: candidate.sauteur,
        ...(v.touche !== undefined ? { touche: toucheValide(v.touche) } : {}),
        placements, actions: bornees, ...(options.length ? { options } : {}) }];
    });
    if (!variantes.length) return [];
    let id = texte(c.id, `combinaison-${i + 1}`);
    const racine = id.slice(0, 30);
    let suffixe = 1;
    while (ids.has(id)) id = `${racine}-${i + 1}-${suffixe++}`;
    ids.add(id);
    return [{ id, nom: texte(c.nom, `Combinaison ${i + 1}`), active: c.active !== false, phase: c.phase as PhaseCombinaison,
      zone: ['nos22', 'milieu', 'leurs22', 'ligne10'].includes(c.zone as string) ? c.zone as ZoneCombinaison : 'toutes',
      couloir: ['gauche', 'centre', 'droite'].includes(c.couloir as string) ? c.couloir as CouloirCombinaison : 'tous', variantes,
      ...(origineValide(c.origine) ? { origine: origineValide(c.origine) } : {}) }];
  });
}

/** x = 0 sur notre ligne d'essai, 100 sur la ligne adverse ; gauche vue en attaque. */
export function choisirCombinaison(combinaisons: Combinaison[], phase: PhaseCombinaison, x: number, y: number): Combinaison | undefined {
  return candidatesCombinaison(combinaisons, phase, x, y)[0];
}
/**
 * Les plans qui répondent à la situation, les plus précis d'abord. `choisirCombinaison` prend le premier ; le cahier
 * vivant choisit parmi ceux qui sont AUSSI précis que lui, d'après ce qui a marché dans le match (`memoireTactique`).
 */
export function candidatesCombinaison(combinaisons: Combinaison[], phase: PhaseCombinaison, x: number, y: number): Combinaison[] {
  const zone: ZoneCombinaison = x <= 22 ? 'nos22' : x >= 78 ? 'leurs22' : 'milieu';
  const couloir: CouloirCombinaison = y < 70 / 3 ? 'gauche' : y > 140 / 3 ? 'droite' : 'centre';
  // ⚠️ UN CAHIER SANS PLAN « DIX MÈTRES » CHOISIT EXACTEMENT COMME AVANT : la zone ne s'ajoute qu'à dix mètres de la
  // ligne, pour les plans qui la visent, et passe alors devant ceux des 22. Les matchs déjà commencés rejouent pareil.
  const pres = x >= 90;
  const precision = (c: Combinaison) => (c.zone === 'ligne10' ? 2 : Number(c.zone !== 'toutes')) + Number(c.couloir !== 'tous');
  return combinaisons.filter(c => c.active && c.phase === phase && (c.zone === 'toutes' || c.zone === zone || (pres && c.zone === 'ligne10'))
    && (c.couloir === 'tous' || c.couloir === couloir))
    .sort((a, b) => precision(b) - precision(a))
    .filter((c, _i, liste) => precision(c) === precision(liste[0]));
}

export function choisirVariante(c: Combinaison, rng: () => number): VarianteCombinaison {
  let reste = rng() * c.variantes.reduce((total, v) => total + v.poids, 0);
  return c.variantes.find(v => (reste -= v.poids) < 0) ?? c.variantes[c.variantes.length - 1];
}

export function origineApercu(c: Pick<Combinaison, 'phase' | 'zone' | 'couloir'>): PointCombinaison {
  return { x: c.zone === 'nos22' ? 14 : c.zone === 'leurs22' ? 86 : c.zone === 'ligne10' ? 94 : 50,
    y: c.phase === 'touche' ? c.couloir === 'droite' ? 69 : 1 : c.couloir === 'gauche' ? 14 : c.couloir === 'droite' ? 56 : 35 };
}

export function creerCombinaison(id: string, phase: PhaseCombinaison = 'melee'): Combinaison {
  const laterale = phase === 'touche';
  return { id, nom: phase === 'touche' ? 'Sortie de touche' : phase === 'ruck' ? 'Sortie de ruck' : 'Lancement au large', active: true, phase, zone: 'toutes', couloir: 'tous',
    variantes: [{ nom: 'Au large', poids: 1, depart: 9, sauteur: 4, placements: [],
      ...(laterale ? { touche: toucheValide(undefined) } : {}),
      actions: [...(laterale ? [{ type: 'passe' as const, destinataire: 9 }] : []),
        { type: 'passe', destinataire: 10 }, { type: 'passe', destinataire: 12 }, { type: 'passe', destinataire: 13 },
        { type: 'course', destination: { x: 15, y: laterale ? 34 : 10 } }] }] };
}
