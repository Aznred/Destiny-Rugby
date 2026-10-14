// SONDE — une combinaison bâtie uniquement avec les ordres rapides, puis jouée sur le moteur (Correctif 41).
// L'exemple de la demande : ruck au centre → cellule à gauche → le 12 en leurre → le 10 reçoit derrière → le 13 attaque
// l'intervalle → l'ailier reste large.
//   npx vite-node scripts/sonderOrdresCombinaisons.ts
import { combinaisonsValides, creerCombinaison, erreursVariante, etapesCombinaison, type Combinaison, type VarianteCombinaison } from '../src/lib/ligue/combinaisons';
import { donnerOrdre, finDeSequence, ordresPossibles, type OrdreCombinaison } from '../src/lib/ligue/ordresCombinaisons';
import { chronologieCombinaison, creerEssaiCombinaison, jouerEssaiCombinaison } from '../src/lib/ligue/essaiCombinaisons';

const c: Combinaison = { ...creerCombinaison('exemple', 'ruck'), nom: 'Cellule, leurre du 12, 13 intérieur' };
let v: VarianteCombinaison = { ...c.variantes[0], nom: 'Variante 1', actions: [], placements: [] };
const ordre = (numero: number, o: OrdreCombinaison) => {
  const possibles = ordresPossibles(c, v, numero);
  const r = donnerOrdre(c, v, numero, o);
  console.log(`n° ${String(numero).padStart(2)} ${o.padEnd(9)} ${r.refus ? `REFUS ${r.refus}` : `→ ${r.variante.actions.length} gestes, ${etapesCombinaison(r.variante.actions).length} étapes`} (possibles : ${possibles.join(', ')})`);
  if (!r.refus) v = r.variante;
};
ordre(4, 'cellule');
ordre(10, 'derriere');
ordre(12, 'leurre');
ordre(13, 'recevoir');
ordre(13, 'course');
ordre(14, 'large');
ordre(11, 'soutien');
console.log('\nGestes :', JSON.stringify(v.actions));
console.log('Placements :', JSON.stringify(v.placements));
console.log('Erreurs :', erreursVariante(c.phase, v), '· valide côté serveur :', combinaisonsValides([{ ...c, variantes: [v] }])[0]?.variantes[0].actions.length === v.actions.length);
console.log('Fin de séquence : porteur', finDeSequence(c, v).porteur);
const chrono = chronologieCombinaison(c, v);
console.log('Chronologie :', chrono.lignes.map((l) => `${l.t}s ${l.action.type}${l.action.type === 'passe' ? `→${l.action.destinataire}` : l.action.type === 'leurre' ? `(${l.action.numero})` : ''}${l.mesure ? '' : '?'}`).join(' · '));
for (const niveau of ['aucune', 'faible', 'normale', 'forte'] as const) {
  const issues: Record<string, number> = {}; let metres = 0;
  for (let n = 0; n < 12; n++) {
    const essai = creerEssaiCombinaison(c, v, {}, { niveau, systeme: 'glissee', essai: n })!;
    const { bilan } = jouerEssaiCombinaison(essai);
    issues[bilan.issue] = (issues[bilan.issue] ?? 0) + 1; metres += bilan.metres;
  }
  console.log(`${niveau.padEnd(8)} ${(metres / 12).toFixed(1)} m · ${Object.entries(issues).map(([k, n]) => `${k} ${n}`).join(', ')}`);
}
