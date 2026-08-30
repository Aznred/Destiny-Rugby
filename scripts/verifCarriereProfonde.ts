import { useGame } from '../src/store/useGame';
import { effectifDuClub } from '../src/lib/effectif';
import {
  ajustementsCapitaines, apresDepartJoueurProfonde, apresResultatProfonde,
  avancerSemaineProfonde, compatibiliteManagerClub, configurerDelegationProfonde,
  enregistrerTransfertProfonde, facteurAmbitionRecrutement, finSaisonProfonde, genererDecisionStrategique,
  repondreDecisionStrategiqueProfonde, vieClubProfonde,
} from '../src/lib/carriereProfonde';

let echecs = 0;
function verifier(nom: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  ✅' : '  ❌'} ${nom}${detail ? ` · ${detail}` : ''}`);
  if (!ok) echecs++;
}

console.log('\n=== CARRIÈRE PROFONDE : PERSONNES, IDENTITÉ ET MÉMOIRE ===');
useGame.getState().reinitialiser();
useGame.getState().creerManager({ nom: 'Camille Martin', nation: 'France', club: 'Marseillais' });
const manager = useGame.getState().manager!;
const effectif = effectifDuClub(manager.club, manager.saison);
const initial = manager.avancee!.profonde;
const vieInitiale = vieClubProfonde(initial, manager.club)!;

verifier('les neuf responsabilités commencent sous contrôle du manager', Object.values(initial.delegations).every((v) => !v));
verifier('le directeur sportif possède de vraies compétences distinctes', new Set([
  initial.directeurSportif.recrutement, initial.directeurSportif.negociation,
  initial.directeurSportif.formation, initial.directeurSportif.tactique,
]).size >= 3);
verifier('direction et supporters sont deux jauges séparées', vieInitiale.supporters.confiance !== undefined && manager.confiance !== undefined);
verifier('les supporters ont quatre profils dont la somme reste cohérente', Object.keys(vieInitiale.supporters.profils).length === 4 && Math.abs(Object.values(vieInitiale.supporters.profils).reduce((n, v) => n + v, 0) - 100) <= 2);
verifier('chaque joueur possède adaptation, langue, cohésion et ambition', effectif.every((j) => {
  const i = initial.integrations[j.id];
  return i && i.adaptationPays >= 0 && i.langue >= 0 && i.cohesion >= 0 && !!i.ambition;
}));
verifier('les joueurs ont aussi des relations entre eux', initial.relations.length >= 5 && initial.relations.every((r) => r.joueurA !== r.joueurB));

let delegue = configurerDelegationProfonde(initial, 'recrutement', true);
delegue = configurerDelegationProfonde(delegue, 'compositions', true);
const apresSemaine = avancerSemaineProfonde(delegue, manager, effectif, 8);
verifier('une délégation produit des décisions attribuées au staff', apresSemaine.decisionsDeleguees.some((d) => d.domaine === 'recrutement') && apresSemaine.decisionsDeleguees.some((d) => d.domaine === 'compositions'));

const etranger = effectif.find((j) => !j.nation.includes('France')) ?? effectif[0];
const avantIntegration = initial.integrations[etranger.id];
const apresIntegration = apresSemaine.integrations[etranger.id];
verifier('l’intégration progresse réellement avec le temps', apresIntegration.cohesion >= avantIntegration.cohesion && apresIntegration.langue >= avantIntegration.langue);

const resultat = {
  cle: 'profonde-test', club: manager.club, saison: 1, semaine: 1, journee: 1,
  domicile: true, adversaire: 'Pierrefeucain', scorePour: 42, scoreContre: 12,
  essaisPour: 6, essaisContre: 2,
};
const apresMatch = apresResultatProfonde(initial, {
  ...manager, tactique: { ...manager.tactique, attaque: 'large', rythme: 'intense', defense: 'blitz' },
  resultats: { [resultat.cle]: resultat },
}, effectif, resultat, 68);
const vieApres = vieClubProfonde(apresMatch, manager.club)!;
verifier('le style du manager apprend des vraies consignes', apresMatch.profilManager.matchsObserves === 1 && apresMatch.profilManager.jeuAuLarge > initial.profilManager.jeuAuLarge && apresMatch.profilManager.rythme > initial.profilManager.rythme);
verifier('le match remplit records et XV historique', Object.keys(vieApres.records.club).length >= 5 && Object.keys(vieApres.records.xvHistorique).length >= 10);
verifier('numéros et capitanats restent comptés', !!vieApres.records.club['numero-plus-porte'] && !!vieApres.records.club.capitanats);
verifier('un record devient un événement daté', apresMatch.chronologie.some((e) => e.categorie === 'record'));
verifier('le public réagit au résultat et au style', vieApres.supporters.motifs.length >= 2);
verifier('le capitaine influe réellement sur le moteur', Object.keys(ajustementsCapitaines(apresMatch, effectif)).length === 1);
const avecTransfert = enregistrerTransfertProfonde(apresMatch, manager, { id: 'star-test', nom: 'Star Test' }, 2_400_000, 'recrue', 'Stade Toulousain');
verifier('la plus grosse recrue devient record et événement', vieClubProfonde(avecTransfert, manager.club)?.records.club['plus-grosse-recrue']?.valeur === 2_400_000 && avecTransfert.chronologie.some((e) => e.id.includes('star-test')));

const relation = initial.relations.find((r) => ['amitie', 'famille', 'mentor'].includes(r.type));
if (relation) {
  const depart = apresDepartJoueurProfonde(initial, manager, relation.joueurA);
  verifier('le départ d’un proche touche le moral de celui qui reste', (depart.moralTouches[relation.joueurB] ?? 0) < 0);
} else verifier('le départ d’un proche touche le moral de celui qui reste', true, 'aucun lien proche dans cette graine');

let decision;
let saisonDecision = 1;
for (; saisonDecision <= 20 && !decision; saisonDecision++) {
  decision = genererDecisionStrategique(initial, { ...manager, saison: saisonDecision, semaine: 12 });
}
verifier('une vraie décision stratégique apparaît rarement', !!decision, decision ? decision.titre : 'aucune en 20 saisons');
if (decision) {
  const reponse = repondreDecisionStrategiqueProfonde({ ...initial, decisionsStrategiques: [decision] }, { ...manager, saison: decision.saison, semaine: decision.semaine }, decision.id, decision.choix[0].id);
  verifier('son choix conserve un effet pluriannuel', !!reponse.choix && reponse.etat.effetsStrategiques.some((e) => e.jusquA > decision!.saison));
}

let facteurAmbition = 1;
for (let i = 0; i < 30 && facteurAmbition === 1; i++) facteurAmbition = facteurAmbitionRecrutement(initial, { id: `cible-ambition-${i}`, age: 24, club: 'Pierrefeucain' }, manager.club);
verifier('une ambition cachée peut rendre une offre plus exigeante', facteurAmbition > 1, `×${facteurAmbition.toFixed(2)}`);
verifier('les clubs peuvent mesurer la compatibilité de ton rugby avec leur ADN', compatibiliteManagerClub(initial, manager.avancee!.identites[manager.club]) >= 0 && compatibiliteManagerClub(initial, manager.avancee!.identites[manager.club]) <= 100);

const veteran = { ...effectif[0], age: 38 };
const groupeVeteran = [veteran, ...effectif.slice(1)];
const avecLegende = {
  ...apresMatch,
  integrations: { ...apresMatch.integrations, [veteran.id]: { ...apresMatch.integrations[veteran.id], saisonsAuClub: 12, bonheur: 82 } },
  clubs: {
    ...apresMatch.clubs,
    [manager.club]: {
      ...vieApres,
      popularites: { ...vieApres.popularites, [veteran.id]: { ...vieApres.popularites[veteran.id], locale: 94, marketing: 88 } },
    },
  },
};
const fin = finSaisonProfonde(avecLegende, manager, groupeVeteran, 1);
const vieFin = vieClubProfonde(fin, manager.club)!;
verifier('la fin de saison calcule de vrais revenus marketing', vieFin.revenuMarketingDerniereSaison > 0, `${vieFin.revenuMarketingDerniereSaison.toLocaleString('fr-FR')} €`);
verifier('un vétéran reçoit un dernier chapitre de carrière', fin.finsCarriere.some((f) => f.joueurId === veteran.id));
verifier('le titre et les fins de carrière entrent dans la chronologie annuelle', fin.chronologie.some((e) => e.categorie === 'titre') && fin.chronologie.some((e) => e.categorie === 'retraite'));

const taille = JSON.stringify({ ...manager.avancee, profonde: fin }).length;
verifier('la nouvelle mémoire reste compatible avec localStorage', taille < 1_800_000, `${Math.round(taille / 1024)} Ko`);

if (echecs) {
  console.error(`\n❌ ${echecs} contrôle(s) en échec`);
  process.exitCode = 1;
} else console.log('\n✅ La carrière profonde produit des conséquences, pas seulement des textes.');
