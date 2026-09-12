import assert from 'node:assert/strict';
import { EVALUATION_ALLRUGBY } from '../src/data/evaluationsAllRugby';
import { EVALUATION_JOUEUR_MAJ } from '../src/data/evaluationsJoueursMaj';
import { EFFECTIFS_REELS } from '../src/data/effectifsReels';

const normaliser = (s: string): string => s.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const parNom = new Map<string, { nom: string; avant: number; apres: number; source?: string }>();

for (const effectif of Object.values(EFFECTIFS_REELS)) {
  for (const joueur of effectif) {
    const cle = normaliser(joueur.nom);
    const evaluation = EVALUATION_JOUEUR_MAJ[cle];
    const classement = evaluation && /^(RugbyPass|FloRugby|We Talk Rugby|Ajustement jeu)/.test(evaluation.source);
    const avant = classement ? evaluation.note : Math.max(30, joueur.note, evaluation?.note ?? 0);
    const allrugby = EVALUATION_ALLRUGBY[cle];
    const apres = Math.max(30, joueur.note, evaluation?.note ?? 0, allrugby?.note ?? 0);
    const precedent = parNom.get(cle);
    if (!precedent) parNom.set(cle, { nom: joueur.nom, avant, apres, source: allrugby?.source });
    else {
      precedent.avant = Math.max(precedent.avant, avant);
      precedent.apres = Math.max(precedent.apres, apres);
      if (allrugby?.source) precedent.source = allrugby.source;
    }
  }
}

const correspondances = [...parNom.keys()].filter((cle) => EVALUATION_ALLRUGBY[cle]).length;
const lignes = [...parNom.values()].filter((ligne) => ligne.apres > ligne.avant);
lignes.sort((a, b) => (b.apres - b.avant) - (a.apres - a.avant) || b.apres - a.apres);
const hausseMoyenne = lignes.reduce((s, l) => s + l.apres - l.avant, 0) / Math.max(1, lignes.length);
assert.ok(Object.keys(EVALUATION_ALLRUGBY).length >= 2_500, 'Trop peu de fiches statistiques exploitables.');
assert.ok(correspondances >= 1_500, `Seulement ${correspondances} joueurs du jeu reconnus.`);
assert.ok(lignes.length >= 300, `Seulement ${lignes.length} joueurs réellement revalorisés.`);
assert.ok(hausseMoyenne <= 15, `Hausse moyenne excessive : +${hausseMoyenne.toFixed(1)}.`);
assert.ok(Object.values(EVALUATION_ALLRUGBY).every((e) => e.note >= 30 && e.note <= 94));

console.log(`${correspondances} joueurs du jeu reconnus · ${lignes.length} revalorisés · hausse moyenne +${hausseMoyenne.toFixed(1)}.`);
console.log(lignes.slice(0, 18).map((l) => `  ${l.nom}: ${l.avant} → ${l.apres} · ${l.source}`).join('\n'));
