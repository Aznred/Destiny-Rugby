import assert from 'node:assert/strict';
import {
  creerMatch, avancer, DT, DUREE_MATCH_SOLO, arretMiseEnPlaceChrono,
} from '../src/lib/moteur/moteur.js';
import { creerMatchDEmpreinte } from './outilsEmpreinte.js';
import {
  creerDivisionPublique, packsActifsLigue, PACKS_DIVISION_PUBLIQUE,
} from '../src/lib/ligue/carriere.js';
import { catalogueMondialCarriere, packsChampionnatsFeminins } from '../src/lib/ligue/catalogueCarriere.js';
import { fournirPoolFfr } from '../src/lib/ligue/eligibiliteJoueurs.js';
import { collectionCarriere } from '../src/lib/ligue/collectionCarriere.js';

let totalOk = 0;
function verifier(condition: unknown, msg: string) {
  assert.ok(condition, msg);
  totalOk++;
}

const POOL_MIXED = { pool: 'mixed' as const, joueurs: [] as const };
fournirPoolFfr(() => POOL_MIXED);

const liguePublique = creerDivisionPublique(
  { id: 'pub-test', code: 'DR-PUBLIC-TEST', compteId: 'user-1', pseudo: 'Manager1', clubNom: 'Mon Club' },
  1, 1, Date.now(), 'graine-test',
);

verifier(liguePublique.playerPool === 'mixed', 'La division publique a le pool mixed');
const packsDispos = packsActifsLigue(liguePublique) ?? [];
console.log('Packs actifs en division publique :', packsDispos);
verifier(packsDispos.includes('bronze') && packsDispos.includes('standard') && packsDispos.includes('or'), 'Packs de base présents');
verifier(packsDispos.some(p => p.startsWith('womens:')), 'Les packs de championnats féminins sont disponibles en division publique');
verifier(packsDispos.includes('womens:premiership women s rugby'), 'Le pack Premiership Women Rugby (avec Holly Aitchison) est actif');

const searchAitchison = collectionCarriere(liguePublique, 'user-1', new URLSearchParams('q=Aitchison'));
verifier(searchAitchison.total >= 1, 'Holly Aitchison est trouvable dans la collection de la division publique');
const holly = searchAitchison.joueurs.find(j => j.carte.nom.toLowerCase().includes('aitchison'));
verifier(holly !== undefined, 'Holly Aitchison est présente');
console.log('Trouvée dans collection division publique :', holly?.carte.nom, '| Note:', holly?.carte.note, '| Club:', holly?.carte.clubReel);

console.log('=== 2. Vérification Chronomètre & Continuité Rugby après 80:00 ===');
const m = creerMatchDEmpreinte(0);
m.carriereDixMinutes = true;

// Avancer jusqu'à la 65e minute simulée
let minutesObservees: number[] = [];
let sautBrutalDetecte = false;
let derniereMinute = 0;

for (let pas = 0; pas < 6000 && !m.fini; pas++) {
  avancer(m, 0.3);
  const min = Math.floor(m.t / 60);
  if (min > derniereMinute) {
    if (min - derniereMinute > 2 && derniereMinute >= 60) {
      sautBrutalDetecte = true;
      console.error(`Saut brutal détecté : ${derniereMinute}' -> ${min}' !`);
    }
    derniereMinute = min;
    minutesObservees.push(min);
  }
  if (min >= 80) break;
}

verifier(!sautBrutalDetecte, 'Aucun saut brutal de chrono (ex: 66e -> 80e) n’a eu lieu !');
verifier(derniereMinute >= 80, `Le chrono a atteint 80 minutes naturellement (atteint: ${derniereMinute}')`);
verifier(m.sirene, 'La sirène a retenti à 80:00');

// Vérifier que le match ne se coupe pas immédiatement à la 80e minute si le jeu est vivant
console.log('=== 3. Vérification que le match peut continuer et marquer après la sirène ===');
m.sirene = true;
m.t = 4805; // 80:05
m.phase = 'jeuCourant';
m.porteur = m.pions[0];
m.fini = false;

// Avancer d'un pas
avancer(m, DT);
verifier(!m.fini, 'Le match n’est pas coupé brutalement tant que le ballon est en jeu !');

console.log(`\nOK - ${totalOk} vérifications réussies avec succès !`);
