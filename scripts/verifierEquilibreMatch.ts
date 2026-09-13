import assert from 'node:assert/strict';
import { cibleDeScore } from '../src/lib/ligue/matchCarriere';

const matchs = 2_000;
let victoiresDomicileEgales = 0;
let victoiresOutsider = 0;
let ecartCollectifFaible = 0;
let ecartCollectifFort = 0;

for (let i = 0; i < matchs; i++) {
  const egal = cibleDeScore(75, 75, `egal-${i}`, 50, 50);
  if (egal.domicile > egal.exterieur) victoiresDomicileEgales++;

  // L'équipe à domicile part avec huit points de GEN en moins.
  const outsider = cibleDeScore(72, 80, `outsider-${i}`, 50, 50);
  if (outsider.domicile > outsider.exterieur) victoiresOutsider++;

  // Même graine et mêmes GEN : seul le collectif est inversé.
  const faible = cibleDeScore(75, 75, `collectif-${i}`, 20, 80);
  const fort = cibleDeScore(75, 75, `collectif-${i}`, 80, 20);
  ecartCollectifFaible += faible.domicile - faible.exterieur;
  ecartCollectifFort += fort.domicile - fort.exterieur;
}

const tauxDomicile = victoiresDomicileEgales / matchs;
const tauxSurprise = victoiresOutsider / matchs;
const effetCollectif = (ecartCollectifFort - ecartCollectifFaible) / matchs;

assert.ok(tauxDomicile >= 0.55 && tauxDomicile <= 0.75,
  `L'avantage domicile doit rester sensible et crédible (${(tauxDomicile * 100).toFixed(1)} %).`);
assert.ok(tauxSurprise >= 0.12 && tauxSurprise <= 0.40,
  `Un outsider à -8 GEN doit pouvoir gagner sans devenir favori (${(tauxSurprise * 100).toFixed(1)} %).`);
assert.ok(effetCollectif >= 7,
  `Le collectif doit déplacer nettement l'écart attendu (${effetCollectif.toFixed(1)} points).`);

console.log(`OK — domicile ${(tauxDomicile * 100).toFixed(1)} %, surprises ${(tauxSurprise * 100).toFixed(1)} %, impact collectif ${effetCollectif.toFixed(1)} points.`);
