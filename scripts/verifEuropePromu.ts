// ═══════════════════════════════════════════════════════════════════════════
// UN PROMU NE PREND PAS UNE PLACE DE CHAMPIONS CUP
// ═══════════════════════════════════════════════════════════════════════════
// Retour de jeu : « je viens de monter en Top 14, je devrais être en Challenge
// Cup, pas en Champions Cup ». `classementFinal` reconstruisait le classement
// de la saison PASSÉE avec la composition D'AUJOURD'HUI : un promu s'y voyait
// donc attribuer un rang dans un championnat qu'il n'avait pas disputé.
//
//   npx vite-node scripts/verifEuropePromu.ts

import { engagesEuropeens } from '../src/lib/coupe';
import { setMouvementsClubs, setArriveesClubs, clubsDeDivision } from '../src/lib/divisions';
import { COMPETITIONS } from '../src/data/clubs';

let ko = 0;
const dire = (ok: boolean, quoi: string, detail = '') => {
  if (!ok) ko++;
  console.log(`  ${ok ? '✅' : '❌'} ${quoi.padEnd(58)} ${detail}`);
};
const nomDe = (c: unknown) => (typeof c === 'string' ? c : (c as { nom: string }).nom);

// Le champion de Pro D2 monte en Top 14 pour la saison 2.
const prod2 = COMPETITIONS.find((c) => c.id === 'prod2')!;
const promu = nomDe(prod2.clubs[0]);
const descendu = nomDe(COMPETITIONS.find((c) => c.id === 'top14')!.clubs[13]);

console.log(`\n  Promu : ${promu} (Pro D2 → Top 14)`);
console.log(`  Descendu : ${descendu}\n`);

setMouvementsClubs({ [promu]: 'top14', [descendu]: 'prod2' });
setArriveesClubs({ [promu]: 2, [descendu]: 2 });

const e = engagesEuropeens(2);
const enChampions = e.championsCup.some((x) => x.club === promu);
const enChallenge = e.challengeCup.some((x) => x.club === promu);

dire(!enChampions, 'le promu n’est PAS en Champions Cup', enChampions ? 'IL Y EST' : 'correct');
dire(enChallenge, 'le promu est bien en Challenge Cup', enChallenge ? 'correct' : 'il n’est nulle part');
dire(clubsDeDivision('top14').includes(promu), 'et il joue bien le Top 14', '');

// Les habitués gardent leurs places
const top14 = clubsDeDivision('top14');
const championsTop14 = e.championsCup.filter((x) => x.ligue === 'top14').length;
dire(championsTop14 === 8, 'le Top 14 fournit toujours 8 clubs en Champions Cup', `${championsTop14}`);
dire(e.championsCup.every((x) => x.club !== promu), 'aucune place volée à un habitué', '');
void top14;

// Un club installé depuis longtemps reste qualifiable
setArriveesClubs({ [promu]: 2 });
const e5 = engagesEuropeens(5);
dire(e5.championsCup.some((x) => x.ligue === 'top14'),
  'trois saisons plus tard, le promu redevient qualifiable',
  e5.championsCup.some((x) => x.club === promu) ? 'il est en Champions Cup' : 'pas encore assez fort, mais éligible');

setMouvementsClubs({}); setArriveesClubs({});
console.log(`\n  ${ko === 0 ? '✅ La règle européenne est juste.' : `❌ ${ko} contrôle(s) en échec.`}\n`);
process.exit(ko === 0 ? 0 : 1);
