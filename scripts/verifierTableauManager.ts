import { journeesALaSemaine, nombreJournees } from '../src/lib/championnat';
import { matchDuClubSemaine } from '../src/lib/matchLive';
import {
  classementManagerEnDirect, journeesClassementManager,
} from '../src/lib/tableauManager';
import { useGame } from '../src/store/useGame';
import type { Manager, ResultatMatchManager } from '../src/types';

function verifier(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const base = {
  club: 'US Oyonnax', division: 'prod2', divisionNom: 'Pro D2', saison: 1,
  resultats: {},
} as Manager;
const total = nombreJournees(base.division, base.club);

let managerAvant: Manager | null = null;
for (let numero = 1; numero < 40; numero++) {
  const candidat = { ...base, semaine: numero, resultats: {} } as Manager;
  const avant = journeesALaSemaine(candidat.division, numero, total);
  const apres = journeesALaSemaine(candidat.division, numero + 1, total);
  if (apres > avant && matchDuClubSemaine(candidat)) {
    managerAvant = candidat;
    break;
  }
}

verifier(managerAvant, 'aucune semaine de championnat trouvée pour la Pro D2');
const manager = managerAvant!;
const affiche = matchDuClubSemaine(manager)!;
const avant = journeesALaSemaine(manager.division, manager.semaine, total);
const apres = journeesALaSemaine(manager.division, manager.semaine + 1, total);

verifier(journeesClassementManager(manager) === avant,
  'le bureau compte la journée avant que le match soit joué');

const domicile = affiche.match.domicile === manager.club;
const resultat: ResultatMatchManager = {
  cle: affiche.cle,
  club: manager.club,
  saison: manager.saison,
  semaine: manager.semaine,
  journee: affiche.journee,
  domicile,
  adversaire: domicile ? affiche.match.exterieur : affiche.match.domicile,
  scorePour: 24,
  scoreContre: 17,
  essaisPour: 3,
  essaisContre: 2,
};
const managerApres = { ...manager, resultats: { [resultat.cle]: resultat } };

verifier(journeesClassementManager(managerApres) === apres,
  'le bureau ne se synchronise pas après le match coaché');
const tableau = classementManagerEnDirect(managerApres);
const ligne = tableau?.classement.find((l) => l.club === manager.club);
verifier(ligne?.joues === apres,
  `le classement affiche ${ligne?.joues ?? '—'} match(s) au lieu de ${apres}`);

useGame.setState({ manager: managerApres, joueur: null, ecran: 'manager' });
useGame.getState().ouvrirMessagesOvale();
verifier(useGame.getState().ecran === 'manager',
  "L'Ovale a quitté la carrière manager");
verifier(useGame.getState().ouvrirSocialSur === 'messages',
  "L'Ovale manager ne s'ouvre pas sur la messagerie");
useGame.getState().ouvrirDiscussionOvale('club_test');
verifier(useGame.getState().ecran === 'manager'
  && useGame.getState().conversationSocialeCible === 'club_test',
"une négociation de L'Ovale quitte la carrière manager");

console.log("✓ classement synchronisé et L'Ovale intégré à la carrière manager");
