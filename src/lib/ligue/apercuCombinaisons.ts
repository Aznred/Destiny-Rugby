import { alignementCombinaison, origineApercu, toucheValide, type ActionCombinaison, type Combinaison, type PointCombinaison, type VarianteCombinaison } from './combinaisons';

const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export interface TraceCombinaison {
  de: PointCombinaison;
  vers: PointCombinaison;
  acteur: number;
  action?: ActionCombinaison;
  indexAction?: number;
  libelle: string;
}

export function positionsApercu(c: Combinaison, v: VarianteCombinaison, conquete = false): Record<number, PointCombinaison> {
  const origine = origineApercu(c);
  const signe = c.couloir === 'droite' ? -1 : 1;
  const bord = signe === 1 ? 0 : 70;
  const formation = alignementCombinaison(v);
  const dehors = [1, 3, 4, 5, 6, 7, 8].filter(n => !formation.some(f => f.numero === n));
  const positions: Record<number, PointCombinaison> = {};
  for (let n = 1; n <= 15; n++) {
    const p = v.placements.find(p => p.numero === n);
    const aligne = formation.find(f => f.numero === n);
    let defaut = n <= 8 ? { x: origine.x - 2 - Math.floor((n - 1) / 3) * 2.8, y: origine.y + ((n - 1) % 3 - 1) * 3 }
      : { x: origine.x - 4 - (n - 9) * 2, y: origine.y + (-18 + (n - 9) * 6) * signe };
    if (c.phase === 'touche') {
      defaut = n === 2 ? { x: origine.x, y: bord + signe * .7 }
        : aligne ? { x: origine.x - .44, y: bord + signe * aligne.distance }
          : n <= 8 ? { x: origine.x - 9, y: bord + signe * (19 + dehors.indexOf(n) * 6) }
            : { x: origine.x - (n === 9 ? 3 : 12 + (n - 10) * 2), y: bord + signe * (n === 9 ? 8 : 17 + (n - 10) * 6) };
    }
    // Au lancer, les avants occupent leur alignement. Le sauteur commence
    // l'enchaînement à l'endroit où il capte, comme dans le match.
    const fixe = c.phase === 'touche' && (n === 2 || n === v.sauteur || conquete && n <= 8);
    positions[n] = { x: borner(p && !fixe ? origine.x + p.x : defaut.x, .7, 99.3),
      y: borner(p && !fixe ? origine.y + p.y : defaut.y, .7, 69.3) };
  }
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
        traces.push({ de, vers: { ...de, y: de.y + (c.couloir === 'droite' ? -2.2 : 2.2) }, acteur: leurre.numero, libelle: `Feinte au premier bloc du n° ${leurre.numero}` });
      }
    }
    traces.push({ de: { ...positions[2] }, vers: { ...positions[v.sauteur] }, acteur: 2, libelle: `Lancer du n° 2 vers le n° ${v.sauteur}` });
  }
  for (const [i, action] of v.actions.entries()) {
    const acteur = action.type === 'leurre' ? action.numero : porteur;
    const de = { ...positions[acteur] };
    const vers = action.type === 'passe' ? { ...positions[action.destinataire] }
      : action.type === 'course' || action.type === 'leurre' ? { x: borner(origine.x + action.destination.x, 1, 99), y: borner(origine.y + action.destination.y, 1, 69) }
        : { x: borner(de.x + (action.intention === 'drop' ? 20 : 30), 1, 99), y: action.intention === 'degagement' || action.intention === 'cinquanteVingtDeux' ? c.couloir === 'droite' ? 69 : 1 : de.y };
    const libelle = action.type === 'passe' ? `Passe du n° ${porteur} vers le n° ${action.destinataire}`
      : action.type === 'course' ? `Course du n° ${porteur}` : action.type === 'leurre' ? `Appel du n° ${action.numero}` : `Jeu au pied du n° ${porteur}`;
    traces.push({ de, vers, acteur, action, indexAction: i, libelle });
    if (action.type === 'passe') porteur = action.destinataire;
    if (action.type === 'course' || action.type === 'leurre') positions[acteur] = vers;
  }
  return traces;
}

export function imageApercu(c: Combinaison, v: VarianteCombinaison, temps: number | null) {
  const traces = tracesApercu(c, v);
  const debutSortie = traces.findIndex(t => t.action !== undefined);
  const positions = positionsApercu(c, v, c.phase === 'touche' && (temps === null || temps < (debutSortie < 0 ? traces.length : debutSortie)));
  let ballon = { ...positions[c.phase === 'touche' ? 2 : v.depart] };
  if (temps !== null) for (const [i, trace] of traces.entries()) {
    if (temps < i) break;
    const avance = borner(temps - i, 0, 1);
    const point = { x: trace.de.x + (trace.vers.x - trace.de.x) * avance, y: trace.de.y + (trace.vers.y - trace.de.y) * avance };
    const feinte = trace.action === undefined && trace.acteur !== 2;
    if (trace.action?.type === 'course' || trace.action?.type === 'leurre') positions[trace.acteur] = point;
    if (feinte) positions[trace.acteur] = { x: trace.de.x, y: trace.de.y + (trace.vers.y - trace.de.y) * Math.sin(Math.PI * avance) };
    if (trace.action?.type !== 'leurre' && !feinte) ballon = point;
  }
  return { positions, ballon, traces };
}
