import { alignementCombinaison, choisirCombinaison, choisirVariante, etapesCombinaison, lancerApresBloc, placementsPersonnalises, porteursParEtape, receptionTouche, toucheValide, type Combinaison, type EtapeCombinaison, type PhaseCombinaison, type PointCombinaison, type VarianteCombinaison } from '../ligue/combinaisons.js';
import { cahierVivant, candidatsDeLaSituation, memoireTactique, ouvrirSuivi } from './lectureCombinaison.js';
import type { EtatMatch } from './etat.js';
import { stopper, type Pion } from './entites.js';
import { placementTouche } from './phasesArretees.js';
import { borner, LIGNE_A, LIGNE_B, sens, type Cote, type Vec } from './terrain.js';

export interface CombinaisonPreparee { cote: Cote; plan: Combinaison; variante: VarianteCombinaison; origineConquete?: Vec }
export interface CombinaisonEnCours extends CombinaisonPreparee {
  origine: Vec;
  miroir: number;
  index: number;
  depuis: number;
  debut: number;
  courses: Record<number, PointCombinaison>;
  etapes: EtapeCombinaison[];
  /** Cahier vivant : la dernière étape dont les options ont été lues (une lecture par étape). */
  lue?: number;
}
export function joueurCombinaison(e: EtatMatch, cote: Cote, numero: number): Pion | undefined {
  return e.pions.find(p => p.cote === cote && p.numero === numero && p.surLeTerrain && p.sanction <= 0);
}
/** Vérifie la situation sans tirer de variante ni consommer l'aléatoire. */
export function combinaisonSituation(e: EtatMatch, phase: PhaseCombinaison): Combinaison | undefined {
  const cote = e.possession;
  const jouables = (plan: Combinaison) => plan.variantes.filter(v => joueurCombinaison(e, cote, phase === 'touche' ? v.sauteur : v.depart)
    && (phase !== 'touche' || joueurCombinaison(e, cote, 2))
    && v.actions.every(a => a.type !== 'passe' || joueurCombinaison(e, cote, a.destinataire)));
  if (cahierVivant(e)) {
    // Parmi les plans aussi adaptés à la situation, celui que le match a vu marcher — ou qu'il n'a pas encore essayé.
    const candidats = candidatsDeLaSituation(e, phase).flatMap(plan => { const variantes = jouables(plan); return variantes.length ? [{ ...plan, variantes }] : []; });
    return memoireTactique(e.memoireCombinaisons?.[cote], candidats);
  }
  const plan = choisirCombinaison(e.plansCombinaisons?.[cote] ?? [], phase,
    cote === 'A' ? e.ballon.x - LIGNE_A : LIGNE_B - e.ballon.x, sens(cote) === 1 ? e.ballon.y : 70 - e.ballon.y);
  if (!plan) return undefined;
  const variantes = jouables(plan);
  return variantes.length ? { ...plan, variantes } : undefined;
}
export function preparerCombinaison(e: EtatMatch, phase: PhaseCombinaison): void {
  e.combinaisonEnCours = undefined;
  e.combinaisonPreparee = undefined;
  const cote = e.possession;
  const s = sens(cote);
  const plan = combinaisonSituation(e, phase);
  if (!plan) return;
  const variante = choisirVariante(plan, e.rng);
  e.combinaisonPreparee = { cote, plan, variante };
  if (phase === 'touche' && e.conquete) {
    if (!joueurCombinaison(e, cote, 2)) { e.combinaisonPreparee = undefined; return; }
    const t = toucheValide(variante.touche);
    e.combinaisonPreparee.origineConquete = { ...e.ballon };
    e.placement = placementTouche(e.pions, e.ballon, cote, t.alignes, variante);
    for (const p of e.pions) {
      const point = e.placement[p.id];
      if (!point || !p.surLeTerrain || p.sanction > 0) continue;
      p.pos = { ...point }; p.cible = { ...point }; delete p.corps; stopper(p);
    }
    const sauteur = joueurCombinaison(e, cote, variante.sauteur)!;
    e.conquete.combinaison = t.feinte ? 'leurreDevant' : t.distance <= 7 ? 'premierBloc' : t.distance >= 11 ? 'fond' : 'milieu';
    e.conquete.cibleId = sauteur.id;
    if (lancerApresBloc(variante)) { e.conquete.horsAlignement = true; e.conquete.reception = receptionTouche(e.ballon, variante, s); }
    else { delete e.conquete.horsAlignement; delete e.conquete.reception; }
    if (cahierVivant(e)) {
      // L'annonce de l'IA pour cette touche (faux sauts, sauteur qui vient d'ailleurs, peel) ne déborde pas sur le plan
      // du club : son sauteur n'est pas celui qu'elle visait, et il courrait à une place qui n'est pas la sienne.
      delete e.conquete.feintes; delete e.conquete.glissement; delete e.conquete.leurreId; delete e.conquete.peelId;
    }
    if (cahierVivant(e) && !e.conquete.horsAlignement) {
      // Les autres alignés, du premier bloc au fond : ce sont eux qui montent pour de faux, ou dont le sauteur emprunte le bloc.
      const autres = alignementCombinaison(variante).map(a => joueurCombinaison(e, cote, a.numero)).filter((p): p is Pion => !!p && p !== sauteur);
      if (t.doubleFeinte && autres.length >= 2) {
        const feintes = [autres[0].id, autres[autres.length - 1].id];
        e.conquete.feintes = feintes; e.conquete.leurreId = feintes[0];
      }
      const voisin = autres.length ? autres.reduce((loin, p) => Math.abs(p.pos.y - sauteur.pos.y) > Math.abs(loin.pos.y - sauteur.pos.y) ? p : loin) : undefined;
      if (t.glissement && voisin && e.placement?.[sauteur.id]) {
        // Changement de bloc : il attend à hauteur d'un autre bloc, en retrait, et n'entre à sa place qu'au dernier moment.
        const vers = { ...e.placement[sauteur.id] };
        const de = { x: borner(vers.x - s * 1.6, LIGNE_A - 2, LIGNE_B + 2), y: (e.placement[voisin.id] ?? voisin.pos).y };
        e.conquete.glissement = { de, vers, jusqua: 0.14 };
        e.placement[sauteur.id] = { ...de }; sauteur.pos = { ...de }; sauteur.cible = { ...de };
      }
    }
  }
}

export function demarrerCombinaison(e: EtatMatch, lieu: Vec, porteurImpose?: Pion): boolean {
  const preparee = e.combinaisonPreparee;
  e.combinaisonPreparee = undefined;
  e.combinaisonEnCours = undefined;
  if (!preparee || preparee.cote !== e.possession) return false;
  const premier = porteurImpose ?? joueurCombinaison(e, preparee.cote, preparee.variante.depart);
  if (!premier) return false;
  const origine = preparee.origineConquete ?? lieu;
  const localY = sens(preparee.cote) === 1 ? origine.y : 70 - origine.y;
  const etapes = etapesCombinaison(preparee.variante.actions);
  let index = 0;
  if (cahierVivant(e) && preparee.plan.phase === 'touche' && premier.numero !== preparee.variante.sauteur) {
    // Le ballon ne sort pas des mains du sauteur (il ressort d'un maul, servi au 9) : la combinaison reprend au geste de
    // celui qui le tient. Si personne, dans la suite, ne part de lui, il n'y a rien à raccorder : jeu libre.
    const attendus = porteursParEtape('touche', preparee.variante);
    index = etapes.findIndex((_, i) => i > 0 && attendus[i] === premier.numero);
    if (index < 0) return false;
  }
  const enCours: CombinaisonEnCours = { ...preparee, origine: { ...origine },
    miroir: preparee.plan.couloir === 'tous' && localY > 35 ? -1 : 1,
    index, depuis: e.sim, debut: e.sim, courses: {}, etapes };
  e.combinaisonEnCours = enCours;
  ouvrirSuivi(e, enCours);
  const chaine = [premier, ...preparee.variante.actions.flatMap(a => a.type === 'passe' ? [joueurCombinaison(e, preparee.cote, a.destinataire)!] : [])];
  e.lancement = { type: 'large', chaine, index: 0, libelle: `${preparee.plan.nom} · ${preparee.variante.nom}` };
  e.porteur = premier;
  return true;
}

export function pointSurTerrain(c: CombinaisonEnCours, p: PointCombinaison): Vec {
  const s = sens(c.cote);
  return { x: borner(c.origine.x + s * p.x, LIGNE_A - 2, LIGNE_B + 2),
    y: borner(c.origine.y + s * c.miroir * p.y, 1.5, 68.5) };
}
export function placerCombinaison(e: EtatMatch): void {
  const c = e.combinaisonEnCours;
  if (!c || c.cote !== e.possession || e.phase !== 'jeuCourant') return;
  lancerAppelsCombinaison(e);
  for (const placement of placementsPersonnalises(c.variante)) {
    const p = joueurCombinaison(e, c.cote, placement.numero);
    if (!p || p === e.porteur || e.vol?.receveur === p) continue;
    const cible = pointSurTerrain(c, c.courses[p.numero] ?? placement);
    // Le destinataire se présente toujours derrière le ballon. La passe
    // elle-même conserve les risques et l'arbitrage du moteur habituel.
    if (!c.courses[p.numero]) {
      const s = sens(c.cote);
      if ((cible.x - e.ballon.x) * s > -.7) cible.x = e.ballon.x - s * .7;
    }
    p.cible = cible;
  }
  for (const [numero, destination] of Object.entries(c.courses)) {
    const p = joueurCombinaison(e, c.cote, Number(numero));
    if (p && p !== e.porteur && e.vol?.receveur !== p) p.cible = pointSurTerrain(c, destination);
  }
}
/** Les appels démarrent au même tick que le geste du porteur. */
export function lancerAppelsCombinaison(e: EtatMatch): void {
  const c = e.combinaisonEnCours;
  if (!c || c.cote !== e.possession || !(e.phase === 'jeuCourant' || e.phase === 'ballonEnLAir' && e.vol?.type === 'passe')) return;
  // Le geste suivant attend la réception. Les appels déjà lancés continuent
  // pendant le vol ; le receveur garde la priorité pour rejoindre le ballon.
  if (e.phase === 'jeuCourant') for (const { action } of c.etapes[c.index]?.actions ?? []) if (action.type === 'leurre') c.courses[action.numero] = action.destination;
  for (const [numero, destination] of Object.entries(c.courses)) {
    const p = joueurCombinaison(e, c.cote, Number(numero));
    if (p && p !== e.porteur && p !== e.vol?.receveur) p.cible = pointSurTerrain(c, destination);
  }
}
export function cibleCourseCombinaison(e: EtatMatch): Vec | undefined {
  const c = e.combinaisonEnCours;
  const action = c?.etapes[c.index]?.actions.find(a => a.action.type === 'course')?.action;
  return c && c.cote === e.porteur?.cote && action?.type === 'course' ? pointSurTerrain(c, action.destination) : undefined;
}
