import type { PionDirect, TerrainDirect } from './matchCarriere';
import type { Combinaison, VarianteCombinaison } from './combinaisons';
import { alignementCombinaison, toucheValide } from './combinaisons';
import { ORDRE_MAILLOTS } from '../moteur/entites';
import type { imageApercu } from './apercuCombinaisons';

const id = (numero: number) => `atelier-joueur-${numero}`;

/** Adapte le tracé au même rendu de joueurs que le direct, sans lancer un match. */
export function terrainSimulationCombinaison(c: Combinaison, v: VarianteCombinaison, image: ReturnType<typeof imageApercu>, temps: number | null, noms: Record<number, string>): TerrainDirect {
  const pions: PionDirect[] = Object.entries(image.positions).map(([n, pos]) => {
    const numero = Number(n); const vitesse = image.mouvements[numero] ?? { x: 0, y: 0 };
    return { id: id(numero), numero, nom: noms[numero] ?? `Joueur ${numero}`, poste: ORDRE_MAILLOTS[numero - 1], cote: 'domicile',
      x: pos.x, y: pos.y, vx: vitesse.x, vy: vitesse.y };
  });
  const terrain: TerrainDirect = { pions, phase: 'jeuCourant', systeme: c.nom, possession: 'domicile', cadence: 1, horloge: 0,
    simulation: temps ?? 0, ballon: { ...image.ballon, hauteur: image.hauteurBallon }, porteurId: image.porteur === null ? undefined : id(image.porteur), gestes: [] };
  if (temps === null || temps >= image.traces.length) return terrain;
  const index = Math.floor(temps); const trace = image.traces[index]; const progression = temps - index;
  if (!trace) return terrain;
  const geste = (numero: number, clip: string, debut = index, duree = 1) => terrain.gestes!.push({ id: `atelier-${index}-${numero}-${clip}`, joueurId: id(numero), clip, debut, duree });
  const orienter = (numero: number, dx: number, dy: number) => {
    const pion = pions.find(p => p.numero === numero)!; const norme = Math.hypot(dx, dy) || 1;
    pion.vx = dx / norme * .3; pion.vy = dy / norme * .3;
  };
  if (!trace.action && trace.acteur === 2) {
    terrain.phase = 'touche';
    geste(2, 'lineout_throw'); geste(v.sauteur, 'lineout_jump');
    const t = toucheValide(v.touche);
    const lifteurs = alignementCombinaison(v).filter(p => p.numero !== v.sauteur).sort((a, b) => Math.abs(a.distance - t.distance) - Math.abs(b.distance - t.distance)).slice(0, 2);
    lifteurs.forEach(p => geste(p.numero, 'lineout_lift'));
    orienter(2, trace.vers.x - trace.de.x, trace.vers.y - trace.de.y);
  } else if (!trace.action) geste(trace.acteur, 'dodge');
  else if (trace.action.type === 'passe') {
    geste(trace.acteur, trace.vers.y < trace.de.y ? 'pass_left' : 'pass');
    geste(trace.action.destinataire, 'catch', index + .55, .45);
    orienter(trace.acteur, trace.vers.x - trace.de.x, trace.vers.y - trace.de.y);
    orienter(trace.action.destinataire, trace.de.x - trace.vers.x, trace.de.y - trace.vers.y);
  } else if (trace.action.type === 'pied') {
    const intention = trace.action.intention;
    geste(trace.acteur, intention === 'rasant' ? 'grubber' : intention === 'drop' ? 'drop' : intention === 'chandelle' ? 'chip' : trace.acteur === 9 ? 'box_kick' : 'punt');
    orienter(trace.acteur, trace.vers.x - trace.de.x, trace.vers.y - trace.de.y);
  }
  if (image.porteur === null && (trace.acteur === 2 && !trace.action || trace.action?.type === 'passe' || trace.action?.type === 'pied')) {
    const depart = trace.acteur === 2 && !trace.action ? .4 : trace.action?.type === 'pied' ? .38 : .3;
    const fin = trace.acteur === 2 && !trace.action ? .9 : .88;
    terrain.vol = { de: trace.de, vers: trace.vers, auteurId: id(trace.acteur), receveurId: trace.action?.type === 'passe' ? id(trace.action.destinataire) : !trace.action ? id(v.sauteur) : undefined,
      type: trace.action?.type === 'pied' ? 'pied' : 'passe', intention: trace.action?.type === 'pied' ? trace.action.intention : 'passe', ecoule: progression - depart, duree: fin - depart, hauteur: image.hauteurBallon };
  }
  return terrain;
}
