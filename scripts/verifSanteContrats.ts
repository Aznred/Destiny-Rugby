import { useGame } from '../src/store/useGame';
import { effectifDuClub } from '../src/lib/effectif';
import {
  avancerSemaineCarriereAvancee, CHARGE_HEBDO_DEFAUT, deciderMedical,
  definirChargeEntrainement, indisponiblesCarriereAvancee, ouvrirRenegociationJoueur,
  risqueMoyenGroupe, signerRenegociationJoueur,
} from '../src/lib/carriereAvancee';
import { negocierAvecJoueur } from '../src/lib/recrutementManager';
import { negocierAvecClub, ouvrirNegociationClub } from '../src/lib/vestiaireManager';
import type { CibleRecrutementManager } from '../src/types';

let echecs = 0;
function verifier(nom: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  OK' : '  ECHEC'} ${nom}${detail ? ` · ${detail}` : ''}`);
  if (!ok) echecs++;
}

console.log('\n=== SANTE, CONTRATS ET MERCATO ===');
useGame.getState().reinitialiser();
useGame.getState().creerManager({ nom: 'Morgan Test', nation: 'France', club: 'Stade Toulousain' });
const manager = useGame.getState().manager!;
const effectif = effectifDuClub(manager.club, manager.saison);
const avancee = manager.avancee!;

verifier('chaque joueur a un profil medical permanent', effectif.every((j) => avancee.profilsMedicaux[j.id]?.zones.genou >= 0));
verifier('chaque joueur a un contrat suivi', effectif.every((j) => avancee.contratsJoueurs[j.id]?.fin > manager.saison));

const faible = definirChargeEntrainement(definirChargeEntrainement(avancee, 'contacts', 0), 'physique', 0);
const forte = { ...avancee, chargeEntrainement: { physique: 3, contacts: 3, sprint: 3, melee: 3, recuperation: 0 } as const };
verifier('la charge augmente le risque du groupe', risqueMoyenGroupe(forte, effectif) > risqueMoyenGroupe(faible, effectif), `${risqueMoyenGroupe(faible, effectif)} -> ${risqueMoyenGroupe(forte, effectif)}`);

const joueur = effectif[0];
const commotion = {
  ...avancee,
  chargeEntrainement: { ...CHARGE_HEBDO_DEFAUT },
  medical: [{
    id: 'commotion-test', joueurId: joueur.id, nom: joueur.nom, type: 'Commotion cérébrale',
    gravite: 'moyenne' as const, disponibilite: 0, douleur: 65, risqueAggravation: 30,
    semaines: 4, decision: 'attente' as const, penalitePerformance: 18, saison: 1, semaine: 1,
    phase: 'diagnostic' as const, zone: 'commotion' as const, origine: 'match' as const,
    diagnosticDans: 0, guerison: 10, condition: 55, rythme: 40, risqueRechute: 25,
    protocoleCommotion: true,
  }],
};
const forceInterdite = deciderMedical(commotion, 'commotion-test', 'forcer');
verifier('le protocole commotion interdit de forcer', forceInterdite.medical[0].decision === 'attente');
const repos = deciderMedical(commotion, 'commotion-test', 'repos');
verifier('le repos retire bien le joueur de la feuille', indisponiblesCarriereAvancee(repos, 1).includes(joueur.id));
const apresSemaine = avancerSemaineCarriereAvancee({ ...manager, avancee: repos }, effectif, 2);
verifier('la guerison progresse sans rendre instantanement la forme', (apresSemaine.medical[0].guerison ?? 0) > 10 && (apresSemaine.medical[0].condition ?? 100) < 100);

const nego = ouvrirRenegociationJoueur(avancee, manager, effectif, joueur.id)!;
verifier('une negociation expose motivations concurrence et visite medicale', !!nego.motivations?.length && !!nego.examenMedical && Array.isArray(nego.offresConcurrentes));
const avecPrimes = negocierAvecJoueur(nego, 'bonus').negociation;
const avecOption = negocierAvecJoueur(nego, 'option').negociation;
const avecClauses = negocierAvecJoueur(nego, 'clause').negociation;
verifier('les leviers modifient les vraies conditions', (avecPrimes.offre.primeVictoire ?? 0) > 0
  && avecOption.offre.option === nego.exigences.option
  && avecClauses.offre.clauseRelegation === nego.exigences.clauseRelegation);
const signee = signerRenegociationJoueur(avancee, { ...nego, offre: nego.exigences, etat: 'signee' });
verifier('la signature remplace duree salaire et demande', signee.contratsJoueurs[joueur.id].fin === manager.saison + nego.exigences.duree && !signee.contratsJoueurs[joueur.id].demandeRevalorisation);

const cible: CibleRecrutementManager = {
  id: 'cible-club', pseudo: 'cible_club', nom: 'Cible Club', club: 'RC Toulon', division: 'top14',
  poste: 'arriere', age: 25, note: 78, potentiel: 82, nation: 'France', indemnite: 500_000,
  valeur: 900_000, saisonsRestantes: 2, situation: 'sousContrat', salaireDemande: 200_000,
  primeDemandee: 30_000, primeMatchDemandee: 0, dureeDemandee: 3, roleDemande: 'cadre',
};
const club = ouvrirNegociationClub(cible, 1, 1);
const avecBonus = negocierAvecClub(club, 'bonus').negociation;
const avecRevente = negocierAvecClub(avecBonus.etat === 'ouverte' ? avecBonus : { ...avecBonus, etat: 'ouverte' }, 'revente').negociation;
verifier('le club vendeur memorise bonus et pourcentage', (avecBonus.bonus ?? 0) > 0 && (avecRevente.pourcentageRevente ?? 0) === 10);
verifier('le club vendeur a besoins urgence et alternatives', !!club.besoinVendeur && typeof club.urgence === 'number' && typeof club.alternatives === 'number');

if (echecs) {
  console.error(`\n${echecs} controle(s) en echec`);
  process.exitCode = 1;
} else console.log('\nOK · sante, contrats et mercato sont relies et persistants.');
