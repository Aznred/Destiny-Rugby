import { alignementCombinaison, etapesCombinaison, lancerApresBloc, origineApercu, placementsPersonnalises, receptionTouche, toucheValide, type ActionCombinaison, type Combinaison, type PointCombinaison, type VarianteCombinaison } from './combinaisons';
import { positionsBaseCombinaison } from './placementsCombinaisons';

const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export interface TraceCombinaison {
  debut: number;
  de: PointCombinaison;
  vers: PointCombinaison;
  acteur: number;
  action?: ActionCombinaison;
  indexAction?: number;
  libelle: string;
}

export function positionsApercu(c: Combinaison, v: VarianteCombinaison, conquete = false): Record<number, PointCombinaison> {
  const origine = origineApercu(c);
  const positions = positionsBaseCombinaison(c, v);
  if (!conquete) for (const p of placementsPersonnalises(v)) {
    if (c.phase === 'touche' && (p.numero === 2 || p.numero === v.sauteur)) continue;
    positions[p.numero] = { x: borner(origine.x + p.x, .7, 99.3), y: borner(origine.y + p.y, .7, 69.3) };
  }
  if (c.phase === 'touche' && !conquete && lancerApresBloc(v)) positions[v.sauteur] = receptionTouche(origine, v);
  return positions;
}

function positionsReception(c: Combinaison, v: VarianteCombinaison) {
  const positions = positionsApercu(c, v, true);
  if (lancerApresBloc(v)) { positions[v.sauteur] = receptionTouche(origineApercu(c), v); return positions; }
  const t = toucheValide(v.touche);
  const lifteurs = alignementCombinaison(v).filter(p => p.numero !== v.sauteur).sort((a, b) => Math.abs(a.distance - t.distance) - Math.abs(b.distance - t.distance)).slice(0, 2);
  lifteurs.forEach((p, i) => { positions[p.numero] = { x: positions[v.sauteur].x, y: borner(positions[v.sauteur].y + (i === 0 ? -.7 : .7), 5, 65) }; });
  return positions;
}

/** Le lancer précède les gestes de sortie ; les numéros d'action restent ceux du cahier. */
export function tracesApercu(c: Combinaison, v: VarianteCombinaison): TraceCombinaison[] {
  const positions = positionsApercu(c, v);
  const origine = origineApercu(c);
  let porteur = c.phase === 'touche' ? v.sauteur : v.depart;
  const traces: TraceCombinaison[] = [];
  if (c.phase === 'touche') {
    if (toucheValide(v.touche).feinte) {
      const leurre = alignementCombinaison(v).find(f => f.numero !== v.sauteur);
      if (leurre) {
        const de = positionsApercu(c, v, true)[leurre.numero];
        traces.push({ debut: traces.length, de, vers: { ...de, y: de.y + (c.couloir === 'droite' ? -2.2 : 2.2) }, acteur: leurre.numero, libelle: `Feinte au premier bloc du n° ${leurre.numero}` });
      }
    }
    traces.push({ debut: traces.length, de: { ...positions[2] }, vers: { ...positions[v.sauteur] }, acteur: 2, libelle: `Lancer du n° 2 vers le n° ${v.sauteur}` });
  }
  const avantSortie = traces.length;
  for (const [etapeIndex, etape] of etapesCombinaison(v.actions).entries()) {
    const debut = avantSortie + etapeIndex;
    const nouvelles: Record<number, PointCombinaison> = {};
    for (const { action } of etape.actions) if (action.type === 'course' || action.type === 'leurre') {
      nouvelles[action.type === 'leurre' ? action.numero : porteur] = { x: borner(origine.x + action.destination.x, 1, 99), y: borner(origine.y + action.destination.y, 1, 69) };
    }
    for (const { action, index: i } of etape.actions) {
    const acteur = action.type === 'leurre' ? action.numero : porteur;
    // Un avant qui part immédiatement après la prise démarre de l'alignement,
    // sans se téléporter vers son placement de sortie.
    const departReception = c.phase === 'touche' && etapeIndex === 0 && acteur <= 8 && (action.type === 'course' || action.type === 'leurre');
    const de = { ...(departReception ? positionsReception(c, v)[acteur] : positions[acteur]) };
    const ciblePasse = action.type === 'passe' ? nouvelles[action.destinataire] : undefined;
    const vers = action.type === 'passe' ? ciblePasse
      ? { x: positions[action.destinataire].x + (ciblePasse.x - positions[action.destinataire].x) * .88, y: positions[action.destinataire].y + (ciblePasse.y - positions[action.destinataire].y) * .88 }
      : { ...positions[action.destinataire] }
      : action.type === 'course' || action.type === 'leurre' ? { x: borner(origine.x + action.destination.x, 1, 99), y: borner(origine.y + action.destination.y, 1, 69) }
        : { x: borner(de.x + (action.intention === 'drop' ? 20 : 30), 1, 99), y: action.intention === 'degagement' || action.intention === 'cinquanteVingtDeux' ? c.couloir === 'droite' ? 69 : 1 : de.y };
    const libelle = action.type === 'passe' ? `Passe du n° ${porteur} vers le n° ${action.destinataire}`
      : action.type === 'course' ? `Course du n° ${porteur}` : action.type === 'leurre' ? `Appel du n° ${action.numero}` : `Jeu au pied du n° ${porteur}`;
    traces.push({ debut, de, vers, acteur, action, indexAction: i, libelle });
    }
    Object.assign(positions, nouvelles);
    const principale = etape.actions.find(a => a.action.type !== 'leurre')?.action;
    if (principale?.type === 'passe') porteur = principale.destinataire;
  }
  return traces;
}

export function dureeApercu(traces: TraceCombinaison[]): number { return Math.max(0, ...traces.map(t => t.debut + 1)); }

export function imageApercu(c: Combinaison, v: VarianteCombinaison, temps: number | null) {
  const traces = tracesApercu(c, v);
  const debutSortie = traces.find(t => t.action !== undefined)?.debut ?? -1;
  const avantSortie = c.phase === 'touche' && (temps === null || temps < (debutSortie < 0 ? traces.length : debutSortie));
  const positions = positionsApercu(c, v, temps === null || avantSortie);
  const mouvements: Record<number, PointCombinaison> = {};
  let porteur: number | null = c.phase === 'touche' ? 2 : v.depart;
  let ballon = { ...positions[porteur] };
  let hauteurBallon = 0;
  const formation = alignementCombinaison(v);
  const t = toucheValide(v.touche);
  const lifteurs = formation.filter(p => p.numero !== v.sauteur).sort((a, b) => Math.abs(a.distance - t.distance) - Math.abs(b.distance - t.distance)).slice(0, 2);
  const reception = positionsReception(c, v);
  // Après la prise, les avants rejoignent leur placement de sortie en courant.
  if (c.phase === 'touche' && !avantSortie && temps !== null && debutSortie >= 0) {
    const avance = borner((temps - debutSortie) / .65, 0, 1);
    for (const n of [1, 3, 4, 5, 6, 7, 8]) {
      const cible = positions[n]; const de = reception[n];
      positions[n] = { x: de.x + (cible.x - de.x) * avance, y: de.y + (cible.y - de.y) * avance };
      if (avance < 1) mouvements[n] = { x: (cible.x - de.x) / .65, y: (cible.y - de.y) / .65 };
    }
  }
  if (temps !== null) for (const trace of traces) {
    if (temps < trace.debut) break;
    const avance = borner(temps - trace.debut, 0, 1);
    const point = { x: trace.de.x + (trace.vers.x - trace.de.x) * avance, y: trace.de.y + (trace.vers.y - trace.de.y) * avance };
    const feinte = trace.action === undefined && trace.acteur !== 2;
    const lancer = trace.action === undefined && trace.acteur === 2;
    const enCours = temps < trace.debut + 1;
    if (trace.action?.type === 'course' || trace.action?.type === 'leurre') {
      positions[trace.acteur] = point;
      if (enCours) mouvements[trace.acteur] = { x: trace.vers.x - trace.de.x, y: trace.vers.y - trace.de.y };
      if (trace.action.type === 'course') { porteur = trace.acteur; ballon = point; }
    }
    if (feinte && avantSortie) positions[trace.acteur] = { x: trace.de.x, y: trace.de.y + (trace.vers.y - trace.de.y) * Math.sin(Math.PI * avance) };
    if (feinte && enCours) mouvements[trace.acteur] = { x: 0, y: (trace.vers.y - trace.de.y) * Math.PI * Math.cos(Math.PI * avance) };
    if (lancer && avantSortie) {
      if (lancerApresBloc(v)) {
        const de = positionsApercu(c, v, true)[v.sauteur]; const cible = reception[v.sauteur];
        const course = borner((avance - .4) / .48, 0, 1);
        positions[v.sauteur] = { x: de.x + (cible.x - de.x) * course, y: de.y + (cible.y - de.y) * course };
        if (course < 1 && avance >= .4) mouvements[v.sauteur] = { x: (cible.x - de.x) / .48, y: (cible.y - de.y) / .48 };
      } else {
        const rapprochement = borner(avance / .4, 0, 1);
        for (const p of lifteurs) {
          const de = positionsApercu(c, v, true)[p.numero]; const cible = reception[p.numero];
          positions[p.numero] = { x: de.x + (cible.x - de.x) * rapprochement, y: de.y + (cible.y - de.y) * rapprochement };
          if (rapprochement < 1 && enCours) mouvements[p.numero] = { x: (cible.x - de.x) / .4, y: (cible.y - de.y) / .4 };
        }
      }
    }
    if (lancer || trace.action?.type === 'passe' || trace.action?.type === 'pied') {
      const departVol = lancer ? .4 : trace.action?.type === 'pied' ? .38 : .3;
      const receptionVol = lancer ? .9 : .88;
      const vol = borner((avance - departVol) / (receptionVol - departVol), 0, 1);
      ballon = { x: trace.de.x + (trace.vers.x - trace.de.x) * vol, y: trace.de.y + (trace.vers.y - trace.de.y) * vol };
      porteur = avance < departVol ? trace.acteur : lancer ? avance >= receptionVol ? v.sauteur : null
        : trace.action?.type === 'passe' && avance >= receptionVol ? trace.action.destinataire : null;
      const hauteur = lancer ? 2.4 : trace.action?.type !== 'pied' ? .6 : trace.action.intention === 'rasant' ? .2 : trace.action.intention === 'chandelle' ? 6 : 3;
      hauteurBallon = Math.sin(Math.PI * vol) * hauteur;
    }
  }
  if (porteur !== null) ballon = { ...positions[porteur] };
  return { positions, mouvements, ballon, porteur, hauteurBallon, traces };
}

/** Pose de préparation : tous les gestes précédents sont terminés, ceux de
 * cette étape n'ont pas commencé. Le lancer est déjà reçu en touche. */
export function imageDebutEtape(c: Combinaison, v: VarianteCombinaison, etapeIndex: number) {
  const premiereAction = etapesCombinaison(v.actions)[etapeIndex]?.actions[0];
  if (!premiereAction) return undefined;
  const debut = tracesApercu(c, v).find(t => t.indexAction === premiereAction.index)?.debut;
  if (debut === undefined) return undefined;
  return { ...imageApercu(c, v, debut), mouvements: {}, hauteurBallon: 0, debut };
}
