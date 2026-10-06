import { avancer, creerMatch, DT } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1), 24, 20, 'conquete-0', undefined,
  { niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia: 4 });
e.carriereDixMinutes = true;
let issue: any = null; let poss = '';
e.apresPas = (m) => {
  if (m.phase === 'touche' && m.conquete?.issue && !issue) { issue = m.conquete.issue; poss = m.possession; }
  else if (issue && m.phase !== 'touche') {
    console.log('issue', issue.type, issue.variante, 'poss avant', poss, 'après', m.possession, 'phase', m.phase, 'porteur', m.porteur?.id, 'contre', issue.contreurId, 'sim', m.sim.toFixed(1));
    issue = null;
  }
};
let g = 0; while (!e.fini && g++ < 60000) avancer(e, DT * 4);
