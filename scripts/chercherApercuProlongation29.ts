import { writeFileSync } from 'node:fs';
import { creerMatch, avancer } from '../src/lib/moteur/moteur';
import { effectifNational } from '../src/lib/international';
import { departageDuMatch } from '../src/lib/couperet';
import { IA_MATCH_DE_CARRIERE } from '../src/lib/moteur/ia/reglages';
for (let n = 0; n < 32; n++) {
  const cle = `mondial#1#finale#France#Irlande#apercu-${n}`;
  const e = creerMatch('France', 'Irlande', effectifNational('France', 1), effectifNational('Irlande', 1), 17, 17, cle,
    undefined, { niveau: 'pro', controle: true, departage: departageDuMatch(cle), cadenceDetaillee: true,
      placementJoue: true, ia: IA_MATCH_DE_CARRIERE, responsabilites: { avatar: [] } });
  e.carriereDixMinutes = true;
  let garde = 0;
  while (!e.fini && garde++ < 100000) avancer(e, .6);
  console.log(`${n} : ${e.scoreA}-${e.scoreB}, ${e.periode} périodes`);
  if (e.prolongation) {
    writeFileSync('scripts/.verification29-solo.json', JSON.stringify({ cle, scoreD: 17, scoreE: 17 }));
    break;
  }
}
