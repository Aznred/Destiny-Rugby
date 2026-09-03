// ═══════════════════════════════════════════════════════════════════════════
// LE CLASSEMENT N'EST PAS EN RETARD D'UNE JOURNÉE
// ═══════════════════════════════════════════════════════════════════════════
// Retour de jeu : « quand on voit le classement général, une journée de retard :
// on a joué le match mais ce n'est pas actualisé ».
//
// `journeesALaSemaine` ne compte que les week-ends STRICTEMENT antérieurs à la
// semaine en cours. Le bureau de l'entraîneur ajoutait la journée du jour dès
// que le match était enregistré ; l'écran « classement complet » appelait
// `journeesALaSemaine` à sec. Deux comptes pour une même donnée.
//
//   npx vite-node scripts/verifClassementAJour.ts

import { journeesDuClassement } from '../src/lib/tableauManager';
import {
  enregistrerResultatJoue, effacerResultatsJoues, journeesALaSemaine, nombreJournees,
} from '../src/lib/championnat';
import { matchDuClubSemaine } from '../src/lib/matchLive';
import { COMPETITIONS } from '../src/data/clubs';

let ko = 0;
const dire = (ok: boolean, quoi: string, detail = '') => {
  if (!ok) ko++;
  console.log(`  ${ok ? '✅' : '❌'} ${quoi.padEnd(56)} ${detail}`);
};
const nomDe = (c: unknown) => (typeof c === 'string' ? c : (c as { nom: string }).nom);

for (const id of ['top14', 'prod2', 'nationale2']) {
  const comp = COMPETITIONS.find((c) => c.id === id);
  if (!comp?.clubs?.length) continue;
  const club = nomDe(comp.clubs[0]);
  const total = nombreJournees(id, club);

  // on cherche une semaine où ce club a un match de championnat
  let semaine = 0;
  let cle = '';
  for (let s = 1; s <= 53; s++) {
    const a = matchDuClubSemaine({ club, division: id, saison: 1, semaine: s });
    if (a) { semaine = s; cle = a.cle; break; }
  }
  if (!semaine) { console.log(`  (aucun match trouvé en ${comp.nom})`); continue; }

  effacerResultatsJoues();
  const carriere = { club, division: id, saison: 1, semaine };
  const avant = journeesDuClassement(carriere);
  const brut = journeesALaSemaine(id, semaine, total);

  // le match est joué
  enregistrerResultatJoue(cle, { domicile: club, exterieur: 'X', scoreD: 24, scoreE: 12, essaisD: 3, essaisE: 1 } as never);
  const apres = journeesDuClassement(carriere);
  effacerResultatsJoues();

  console.log(`\n  ── ${comp.nom} · ${club} · semaine ${semaine}`);
  dire(avant === brut, 'avant le match : même compte qu’avant le correctif', `${avant} journée(s)`);
  dire(apres === avant + 1, 'après le match : la journée du jour est comptée', `${avant} → ${apres}`);
}

console.log(`\n  ${ko === 0 ? '✅ Le classement suit le match, sans attendre la semaine suivante.' : `❌ ${ko} contrôle(s) en échec.`}\n`);
process.exit(ko === 0 ? 0 : 1);
