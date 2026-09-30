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

function positionsReception(c: Combinaison, v: VarianteCombinaison) {
  const positions = positionsApercu(c, v, true);
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
        traces.push({ de, vers: { ...de, y: de.y + (c.couloir === 'droite' ? -2.2 : 2.2) }, acteur: leurre.numero, libelle: `Feinte au premier bloc du n° ${leurre.numero}` });
      }
    }
    traces.push({ de: { ...positions[2] }, vers: { ...positions[v.sauteur] }, acteur: 2, libelle: `Lancer du n° 2 vers le n° ${v.sauteur}` });
  }
  for (const [i, action] of v.actions.entries()) {
    const acteur = action.type === 'leurre' ? action.numero : porteur;
    // Un avant qui part immédiatement après la prise démarre de l'alignement,
    // sans se téléporter vers son placement de sortie.
    const departReception = c.phase === 'touche' && i === 0 && acteur <= 8 && (action.type === 'course' || action.type === 'leurre');
    const de = { ...(departReception ? positionsReception(c, v)[acteur] : positions[acteur]) };
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
  const avantSortie = c.phase === 'touche' && (temps === null || temps < (debutSortie < 0 ? traces.length : debutSortie));
  const positions = positionsApercu(c, v, avantSortie);
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
  if (temps !== null) for (const [i, trace] of traces.entries()) {
    if (temps < i) break;
    const avance = borner(temps - i, 0, 1);
    const point = { x: trace.de.x + (trace.vers.x - trace.de.x) * avance, y: trace.de.y + (trace.vers.y - trace.de.y) * avance };
    const feinte = trace.action === undefined && trace.acteur !== 2;
    const lancer = trace.action === undefined && trace.acteur === 2;
    const enCours = temps < i + 1;
    if (trace.action?.type === 'course' || trace.action?.type === 'leurre') {
      positions[trace.acteur] = point;
      if (enCours) mouvements[trace.acteur] = { x: trace.vers.x - trace.de.x, y: trace.vers.y - trace.de.y };
      if (trace.action.type === 'course') { porteur = trace.acteur; ballon = point; }
    }
    if (feinte && avantSortie) positions[trace.acteur] = { x: trace.de.x, y: trace.de.y + (trace.vers.y - trace.de.y) * Math.sin(Math.PI * avance) };
    if (feinte && enCours) mouvements[trace.acteur] = { x: 0, y: (trace.vers.y - trace.de.y) * Math.PI * Math.cos(Math.PI * avance) };
    if (lancer && avantSortie) {
      const rapprochement = borner(avance / .4, 0, 1);
      for (const p of lifteurs) {
        const de = positionsApercu(c, v, true)[p.numero]; const cible = reception[p.numero];
        positions[p.numero] = { x: de.x + (cible.x - de.x) * rapprochement, y: de.y + (cible.y - de.y) * rapprochement };
        if (rapprochement < 1 && enCours) mouvements[p.numero] = { x: (cible.x - de.x) / .4, y: (cible.y - de.y) / .4 };
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
