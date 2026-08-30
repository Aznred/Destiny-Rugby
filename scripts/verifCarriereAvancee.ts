import { useGame } from '../src/store/useGame';
import { effectifDuClub } from '../src/lib/effectif';
import {
  apresResultatCarriereAvancee, deciderMedical, finSaisonCarriereAvancee,
  indisponiblesCarriereAvancee, observerCible, rapportConnaissance,
  repondreDiscussionAvancee,
} from '../src/lib/carriereAvancee';
import type { CibleRecrutementManager } from '../src/types';

let echecs = 0;
function verifier(nom: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  ✅' : '  ❌'} ${nom}${detail ? ` · ${detail}` : ''}`);
  if (!ok) echecs++;
}

console.log('\n=== CARRIÈRE AVANCÉE : LES SYSTÈMES COMMUNIQUENT ===');
useGame.getState().reinitialiser();
useGame.getState().creerManager({ nom: 'Camille Martin', nation: 'France', club: 'Marseillais' });
const manager = useGame.getState().manager!;
const effectif = effectifDuClub(manager.club, manager.saison);
const avancee = manager.avancee!;

verifier('la direction fixe plusieurs objectifs pondérés', avancee.objectifs.length >= 4 && avancee.objectifs.some((o) => o.importance === 3));
verifier('tous les clubs IA possèdent une trajectoire', Object.keys(avancee.clubsMonde).length >= 800, `${Object.keys(avancee.clubsMonde).length} clubs`);
verifier('chaque club IA a un entraîneur persistant', Object.values(avancee.clubsMonde).every((c) => !!avancee.entraineursIA[c.entraineurId]));
verifier('le vestiaire possède hiérarchie et personnalité', Object.values(avancee.vestiaire).every((p) => p.traits.length > 0 && !!p.rang));

const j = effectif[0];
const cible: CibleRecrutementManager = {
  id: 'cible-test', pseudo: 'cible_test', nom: 'Joueur Observé', club: 'Stade Toulousain', division: 'top14',
  poste: 'arriere', age: 20, note: 76, potentiel: 88, nation: 'France', indemnite: 200_000, valeur: 500_000,
  saisonsRestantes: 2, situation: 'sousContrat', salaireDemande: 150_000, primeDemandee: 20_000,
  primeMatchDemandee: 0, dureeDemandee: 3, roleDemande: 'cadre',
};
const inconnu = rapportConnaissance(avancee, cible, 0);
let observe = avancee;
for (let i = 0; i < 4; i++) observe = observerCible(observe, cible.id, manager.saison, false);
const complet = rapportConnaissance(observe, cible, 4);
verifier('un inconnu est montré par fourchette, sans potentiel', inconnu.note[0] !== inconnu.note[1] && inconnu.potentiel === null);
verifier('les observations rendent le rapport précis', complet.niveau === 'complet' && !!complet.potentiel && !!complet.salaire);

const avecDiscussion = {
  ...avancee,
  discussions: [...avancee.discussions, {
    id: 'discussion-test', joueurId: j.id, nom: j.nom, type: 'tempsDeJeu' as const,
    semaine: manager.semaine, texte: 'Je veux jouer.', etat: 'ouverte' as const,
  }],
};
const promis = repondreDiscussionAvancee(avecDiscussion, manager, 'discussion-test', 'promettre');
verifier('une réponse engageante crée une promesse datée', promis.promesses.some((p) => p.type === 'PLAYTIME_PROMISE' && p.echeance > p.date));

const avecBlesse = {
  ...avancee,
  medical: [{
    id: 'medical-test', joueurId: j.id, nom: j.nom, type: 'Entorse', gravite: 'legere' as const,
    disponibilite: 65, douleur: 55, risqueAggravation: 12, semaines: 3,
    decision: 'attente' as const, penalitePerformance: 10, saison: 1, semaine: 1,
  }],
};
const repos = deciderMedical(avecBlesse, 'medical-test', 'repos');
const force = deciderMedical(avecBlesse, 'medical-test', 'forcer');
verifier('le repos rend réellement indisponible', indisponiblesCarriereAvancee(repos, 1).includes(j.id));
verifier('forcer augmente fortement le risque', force.medical[0].risqueAggravation >= avecBlesse.medical[0].risqueAggravation + 30);

const resultat = {
  cle: 'test-avance', club: manager.club, saison: 1, semaine: 1, journee: 1, domicile: true,
  adversaire: 'RC Toulon', scorePour: 24, scoreContre: 21, essaisPour: 3, essaisContre: 2,
};
const apres = apresResultatCarriereAvancee({ ...manager, avancee, resultats: { [resultat.cle]: resultat } }, effectif, resultat);
verifier('un vrai résultat alimente actualités et rivalités', apres.etat.actualites.length > 0 && apres.etat.rivalites.length > 0);

const tailleAvant = JSON.stringify(avancee).length;
const bilan = finSaisonCarriereAvancee(manager, effectif, manager.objectif);
verifier('la fin de saison archive le monde', Object.values(bilan.etat.histoire).some((s) => s.length === 1));
verifier('les clubs IA évoluent sans intervention', Object.values(bilan.etat.clubsMonde).some((c) => c.tendance !== 0));
verifier('l’état initial reste raisonnable pour localStorage', tailleAvant < 1_500_000, `${Math.round(tailleAvant / 1024)} Ko`);

if (echecs) {
  console.error(`\n❌ ${echecs} contrôle(s) en échec`);
  process.exitCode = 1;
} else {
  console.log('\n✅ Les systèmes avancés sont persistants, reliés et mesurés.');
}
