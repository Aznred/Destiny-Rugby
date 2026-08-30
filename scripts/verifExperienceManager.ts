// Vérification ciblée de l'expérience demandée pour le mode entraîneur :
// vrais trophées de coupe, cérémonie partagée et succès propres au manager.

import { COMPETITIONS, competitionDuClub } from '../src/data/clubs';
import { CALENDRIER } from '../src/data/calendrier';
import { TROPHEE_PAR_COUPE } from '../src/data/trophees';
import { evaluerSuccesManager, progressionSuccesManager, SUCCES_MANAGER } from '../src/data/succesManager';
import { coupeEnDirect, coupesDuClub } from '../src/lib/coupe';
import { photoReelle } from '../src/lib/avatars';
import { useGame } from '../src/store/useGame';

let erreurs = 0;
function verifie(label: string, condition: boolean, detail = '') {
  console.log(`  ${condition ? '✅' : '❌'} ${label}${detail ? ` · ${detail}` : ''}`);
  if (!condition) erreurs++;
}

console.log('\n=== EXPÉRIENCE MANAGER : COUPES ET SUCCÈS ===');

const clubs = COMPETITIONS.flatMap((competition) => competition.clubs.map((club) => club.nom));
const clubEngage = clubs.find((club) => coupesDuClub(club, 1).length > 0);
if (!clubEngage) throw new Error('Aucun club engagé en coupe pour la saison de contrôle.');
const coupeId = coupesDuClub(clubEngage, 1)[0];
const weekEndsCoupe = CALENDRIER.filter((semaine) => semaine.type === 'coupe').length;
const coupe = coupeEnDirect(coupeId, 1, clubEngage, weekEndsCoupe);
const vainqueur = coupe?.vainqueur;
if (!vainqueur) throw new Error(`La ${coupeId} n'a pas de vainqueur à la fin du calendrier.`);
const competition = competitionDuClub(vainqueur);
if (!competition) throw new Error(`Champion de coupe inconnu : ${vainqueur}.`);

useGame.getState().creerManager({
  nom: 'Coach de contrôle', nation: 'France', club: vainqueur, age: 40, libre: true,
});
useGame.getState().saisonManager();

const etat = useGame.getState();
const manager = etat.manager!;
const tropheeAttendu = TROPHEE_PAR_COUPE[coupeId];
verifie('la coupe gagnée entre dans le palmarès du manager',
  manager.palmares.some((titre) => titre.trophee === tropheeAttendu),
  `${coupe?.nom} · ${vainqueur}`);
verifie('le trophée attend la même cérémonie 3D que chez le joueur',
  etat.tropheesEnAttente.includes(tropheeAttendu), tropheeAttendu);
verifie('le premier titre débloque un succès d’entraîneur',
  etat.succesDebloques.manager_premier_titre != null);

const collection = progressionSuccesManager(etat.succesDebloques);
verifie('la collection manager contient vingt objectifs', collection.total === 20, `${collection.faits}/${collection.total}`);
verifie('les identifiants manager ne peuvent pas heurter ceux du joueur',
  SUCCES_MANAGER.every((succes) => succes.id.startsWith('manager_')));
verifie('une star connue reçoit bien son portrait officiel',
  photoReelle('Antoine Dupont') === '/photos/antoine_dupont.webp');
verifie('un nom absent reste absent pour déclencher la silhouette grise',
  photoReelle('Joueur Sans Photo') === undefined);

const encore = evaluerSuccesManager(manager, etat.succesDebloques);
verifie('un succès déjà reçu ne retombe pas une seconde fois',
  !encore.some((succes) => succes.id === 'manager_premier_titre'));

if (erreurs) {
  console.error(`\n❌ ${erreurs} contrôle(s) en échec.`);
  process.exitCode = 1;
} else {
  console.log('\n✅ Les coupes et succès du manager sont branchés sur la vraie carrière.');
}
