/**
 * LES ORDRES RAPIDES DE L'ATELIER (Correctif 41, points 3, 4, 6, 7 et 10).
 *
 * « Je sélectionne le 12, je trace 12 → intervalle extérieur, puis : Leurre. » Un ordre est une phrase de terrain —
 * recevoir, courir, fixer, leurre, croisée, soutien, rester large, cellule, passe derrière la cellule, jeu au pied —
 * que ce module traduit dans les gestes que le cahier connaît déjà (passe, course du porteur, appel, pied), en calculant
 * ce que personne n'a envie de saisir : le point de départ, la profondeur, la ligne de course. Le résultat reste un
 * cahier ordinaire : il se retouche à la main (mode Avancé), se valide par `combinaisonsValides` et se joue par le même
 * moteur. Aucun nouveau type de geste n'est inventé ici.
 *
 * Fonctions pures. Les coordonnées rendues sont relatives à la conquête, dans le sens de l'attaque — comme le cahier.
 */
import {
  erreursVariante, etapesCombinaison, MAX_ACTIONS, MAX_ETAPES, origineApercu, placementsPersonnalises,
  type ActionCombinaison, type Combinaison, type PiedCombinaison, type PointCombinaison, type VarianteCombinaison,
} from './combinaisons';
import { dureeApercu, imageApercu, tracesApercu } from './apercuCombinaisons';
import { joueursEngagesCombinaison } from './placementsCombinaisons';

export type OrdreCombinaison =
  | 'recevoir' | 'course' | 'fixer' | 'leurre' | 'croisee' | 'soutien' | 'large' | 'cellule' | 'derriere' | 'pied' | 'annuler';

export type RefusOrdre = 'plein' | 'apresPied' | 'porteur' | 'pasPorteur' | 'engage' | 'pasAvant' | 'rien';

export interface ResultatOrdre {
  variante: VarianteCombinaison;
  /** Le geste à sélectionner ensuite : c'est celui dont on trace la course sur le terrain. */
  action: number | null;
  refus?: RefusOrdre;
}

const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rond = (v: number) => Math.round(v * 2) / 2;
const point = (x: number, y: number): PointCombinaison => ({ x: borner(rond(x), -35, 35), y: borner(rond(y), -65, 65) });

/** Où en est la combinaison une fois tous ses gestes joués : qui porte le ballon, où est chacun (relatif à la conquête). */
export function finDeSequence(c: Combinaison, v: VarianteCombinaison): { porteur: number; positions: Record<number, PointCombinaison>; pied: boolean } {
  const origine = origineApercu(c);
  const image = imageApercu(c, v, dureeApercu(tracesApercu(c, v)));
  let porteur = c.phase === 'touche' ? v.sauteur : v.depart;
  let pied = false;
  for (const etape of etapesCombinaison(v.actions)) for (const { action } of etape.actions) {
    if (action.type === 'passe') porteur = action.destinataire;
    if (action.type === 'pied') pied = true;
  }
  const positions = Object.fromEntries(Object.entries(image.positions).map(([n, p]) => [n, { x: p.x - origine.x, y: p.y - origine.y }]));
  return { porteur, positions, pied };
}

/** Les ordres qu'on peut donner à ce joueur, maintenant. L'écran n'affiche que ceux-là. */
export function ordresPossibles(c: Combinaison, v: VarianteCombinaison, numero: number): OrdreCombinaison[] {
  const fin = finDeSequence(c, v);
  const aDesOrdres = v.actions.some((a) => (a.type === 'leurre' && a.numero === numero) || (a.type === 'passe' && a.destinataire === numero));
  if (fin.pied) return aDesOrdres ? ['annuler'] : [];
  if (numero === fin.porteur) return ['course', 'fixer', 'pied', ...(aDesOrdres ? ['annuler' as const] : [])];
  const engage = joueursEngagesCombinaison(c, v).includes(numero) && v.actions.length === 0;
  if (engage) return [];
  const avant = numero <= 8;
  const porteurAvant = fin.porteur <= 8;
  return [
    'recevoir', 'leurre', 'croisee', 'soutien',
    ...(avant ? ['cellule' as const] : ['large' as const]),
    ...(!avant && porteurAvant ? ['derriere' as const] : []),
    ...(aDesOrdres ? ['annuler' as const] : []),
  ];
}

/** Les étapes d'une variante, geste par geste, et le chemin inverse : le drapeau `simultanee` se repose tout seul. */
const groupes = (v: VarianteCombinaison): ActionCombinaison[][] => etapesCombinaison(v.actions).map((e) => e.actions.map((a) => a.action));
function aplatir(liste: ActionCombinaison[][]): ActionCombinaison[] {
  return liste.filter((g) => g.length).flatMap((g) => g.map((a, i) => { const copie = { ...a }; delete copie.simultanee; return i ? { ...copie, simultanee: true } : copie; }));
}
function ajouterEtape(v: VarianteCombinaison, actions: ActionCombinaison[]): VarianteCombinaison {
  return { ...v, actions: aplatir([...groupes(v), actions]) };
}
/**
 * Ajoute un appel à la DERNIÈRE étape : il part avec le geste du porteur. Un joueur n'a qu'un appel par étape (le
 * nouveau remplace l'ancien) ; si l'étape ne peut pas le prendre — c'est lui qui y joue le ballon —, il ouvre la sienne.
 */
function ajouterAppel(c: Combinaison, v: VarianteCombinaison, appel: ActionCombinaison & { type: 'leurre' }): { variante: VarianteCombinaison; action: number } {
  const liste = groupes(v);
  const derniere = liste.at(-1);
  if (derniere) {
    const avec = [...liste.slice(0, -1), [...derniere.filter((a) => !(a.type === 'leurre' && a.numero === appel.numero)), appel]];
    const variante = { ...v, actions: aplatir(avec) };
    if (!erreursVariante(c.phase, variante).some((e) => e.type === 'joueurDouble' || e.type === 'ballonsMultiples')) return { variante, action: variante.actions.length - 1 };
  }
  const variante = { ...v, actions: aplatir([...liste, [appel]]) };
  return { variante, action: variante.actions.length - 1 };
}
function placer(v: VarianteCombinaison, numero: number, p: PointCombinaison): VarianteCombinaison {
  return { ...v, placements: [...placementsPersonnalises(v).filter((x) => x.numero !== numero), { numero, ...point(p.x, p.y) }] };
}

/**
 * Donne un ordre au joueur `numero`. `intention` : le type de coup de pied pour l'ordre `pied`.
 *
 * ⚠️ UN ORDRE N'EST JAMAIS APPLIQUÉ À MOITIÉ : si le cahier qui en résulte dépasse ses limites ou devient invalide, la
 * variante d'origine est rendue avec la raison du refus.
 */
export function donnerOrdre(
  c: Combinaison, v: VarianteCombinaison, numero: number, ordre: OrdreCombinaison, intention: PiedCombinaison = 'occupation',
): ResultatOrdre {
  const refuser = (refus: RefusOrdre): ResultatOrdre => ({ variante: v, action: null, refus });
  const fin = finDeSequence(c, v);
  const moi = fin.positions[numero] ?? { x: -6, y: 0 };
  const porteur = fin.positions[fin.porteur] ?? { x: 0, y: 0 };
  // De quel côté du porteur se trouve le joueur : +1 vers les y croissants, −1 sinon.
  const cote = moi.y >= porteur.y ? 1 : -1;
  let suite: VarianteCombinaison = v;
  let action: number | null = null;

  if (ordre === 'annuler') {
    const actions = v.actions.filter((a) => !(a.type === 'leurre' && a.numero === numero));
    // La passe qui lui était destinée emporte la suite : sans elle, les gestes d'après n'ont plus de porteur.
    const passe = actions.findIndex((a) => a.type === 'passe' && a.destinataire === numero);
    const gardees = passe < 0 ? actions : actions.slice(0, passe);
    if (gardees[0]?.simultanee) { gardees[0] = { ...gardees[0] }; delete gardees[0].simultanee; }
    if (gardees.length === v.actions.length) return refuser('rien');
    return { variante: { ...v, actions: gardees }, action: null };
  }
  if (fin.pied) return refuser('apresPied');

  if (ordre === 'course' || ordre === 'fixer' || ordre === 'pied') {
    if (numero !== fin.porteur) return refuser('pasPorteur');
    const geste: ActionCombinaison = ordre === 'pied' ? { type: 'pied', intention }
      // Fixer : quatre mètres droit sur son vis-à-vis, pas davantage — il faut encore donner derrière.
      : { type: 'course', destination: point(porteur.x + (ordre === 'fixer' ? 4.5 : 11), porteur.y) };
    suite = ajouterEtape(v, [geste]);
    action = suite.actions.length - 1;
  } else {
    if (numero === fin.porteur) return refuser('porteur');
    if (joueursEngagesCombinaison(c, v).includes(numero) && v.actions.length === 0) return refuser('engage');
    if (ordre === 'recevoir') {
      suite = ajouterEtape(v, [{ type: 'passe', destinataire: numero }]);
      action = suite.actions.length - 1;
    } else if (ordre === 'derriere') {
      // Le ballon passe dans le dos de la cellule : le receveur se place deux mètres plus profond et un cran plus large.
      suite = placer(ajouterEtape(v, [{ type: 'passe', destinataire: numero }]), numero, { x: porteur.x - 2.5, y: porteur.y + cote * 3 });
      action = suite.actions.length - 1;
    } else if (ordre === 'leurre') {
      // Une course lancée, tranchante, qui passe DEVANT le porteur : neuf mètres, en rentrant d'un tiers vers son couloir.
      ({ variante: suite, action } = ajouterAppel(c, v, { type: 'leurre', numero, destination: point(Math.max(moi.x, porteur.x) + 9, moi.y + (porteur.y - moi.y) * .35) }));
    } else if (ordre === 'soutien') {
      // À l'épaule intérieure du porteur, un mètre et demi derrière sa prochaine position.
      const cible = [...v.actions].reverse().find((a) => a.type === 'course');
      const arrivee = cible?.type === 'course' ? cible.destination : { x: porteur.x + 4, y: porteur.y };
      ({ variante: suite, action } = ajouterAppel(c, v, { type: 'leurre', numero, destination: point(arrivee.x - 1.5, arrivee.y + cote * 1.5) }));
    } else if (ordre === 'large') {
      // Son couloir, à cinq mètres de la touche : il s'y place, et il y reste en avançant avec le jeu.
      const origine = origineApercu(c);
      const couloir = (cote > 0 ? 65 : 5) - origine.y;
      suite = placer(v, numero, { x: Math.min(moi.x, porteur.x - 3), y: couloir });
      if (v.actions.length) ({ variante: suite, action } = ajouterAppel(c, suite, { type: 'leurre', numero, destination: point(porteur.x + 7, couloir) }));
    } else if (ordre === 'croisee') {
      // Le porteur part vers lui en travers ; il coupe dans son dos et reçoit en changeant de sens.
      const course: ActionCombinaison = { type: 'course', destination: point(porteur.x + 3, porteur.y + cote * 3.5) };
      const coupe: ActionCombinaison = { type: 'leurre', numero, destination: point(porteur.x + 2.5, porteur.y - cote * 1.5) };
      suite = ajouterEtape(ajouterEtape(v, [course, coupe]), [{ type: 'passe', destinataire: numero }]);
      action = suite.actions.length - 1;
    } else if (ordre === 'cellule') {
      if (numero > 8) return refuser('pasAvant');
      // Une cellule de trois : le porteur à cinq mètres de la conquête, deux avants à ses épaules, un demi-pas derrière.
      const engages = joueursEngagesCombinaison(c, v);
      const libres = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => n !== numero && n !== fin.porteur && !engages.includes(n) && !(c.phase === 'touche' && n === 2))
        .sort((a, b) => Math.abs((fin.positions[a]?.y ?? 0) - moi.y) - Math.abs((fin.positions[b]?.y ?? 0) - moi.y)).slice(0, 2);
      const centre = { x: porteur.x - 1.5, y: porteur.y + cote * 5 };
      suite = placer(v, numero, centre);
      libres.forEach((n, i) => { suite = placer(suite, n, { x: centre.x - 1, y: centre.y + (i ? 1 : -1) * 1.4 }); });
      suite = ajouterEtape(suite, [{ type: 'passe', destinataire: numero },
        ...libres.map((n, i): ActionCombinaison => ({ type: 'leurre', numero: n, destination: point(centre.x + 3.5, centre.y + (i ? 1 : -1) * 1.2) }))]);
      // Le geste suivant reste à donner : le porteur de la cellule peut courir, fixer, ou le ballon passer dans son dos.
      action = null;
    }
  }
  if (suite.actions.length > MAX_ACTIONS || etapesCombinaison(suite.actions).length > MAX_ETAPES) return refuser('plein');
  if (erreursVariante(c.phase, suite).some((e) => e.type !== 'vide')) return refuser('rien');
  return { variante: suite, action };
}
