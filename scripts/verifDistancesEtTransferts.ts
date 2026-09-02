import type {
  CibleRecrutementManager, NegociationClubManager, NegociationManager,
  RecrueManager, TermesRecrutementManager, TransfertAnnonce,
} from '../src/types';
import { contexteDerby } from '../src/lib/carriereProfonde';
import {
  joueurDejaRecrute, reparerRecrutementsDupliques,
} from '../src/lib/recrutementManager';

let echecs = 0;
function verifier(nom: string, ok: boolean, detail = ''): void {
  console.log(`  ${ok ? '✅' : '❌'} ${nom}${detail ? ` · ${detail}` : ''}`);
  if (!ok) echecs++;
}

console.log('\n=== DISTANCES DE MATCH ET SIGNATURES UNIQUES ===');

const toulouseMontpellier = contexteDerby('Stade Toulousain', 'Montpellier HR');
verifier(
  'Toulouse–Montpellier lit les vraies villes et ne devient pas un derby',
  !toulouseMontpellier.derby
    && toulouseMontpellier.distance >= 180
    && toulouseMontpellier.distance <= 230,
  `${toulouseMontpellier.distance} km`,
);

const toulouseColomiers = contexteDerby('Stade Toulousain', 'US Colomiers');
verifier(
  'Toulouse–Colomiers reste un vrai derby local',
  toulouseColomiers.derby && toulouseColomiers.distance <= 25,
  `${toulouseColomiers.distance} km`,
);

const cible: CibleRecrutementManager = {
  id: 'Union Bordeaux Bègles#test-joueur',
  pseudo: 'joueur_test',
  nom: 'Joueur TEST',
  club: 'Union Bordeaux Bègles',
  division: 'top14',
  poste: 'ailier_gauche',
  age: 23,
  note: 78,
  potentiel: 84,
  nation: 'France',
  indemnite: 500_000,
  valeur: 1_200_000,
  saisonsRestantes: 2,
  situation: 'sous_contrat',
  salaireDemande: 120_000,
  primeDemandee: 25_000,
  primeMatchDemandee: 0,
  dureeDemandee: 3,
  roleDemande: 'cadre',
};
const premiersTermes: TermesRecrutementManager = {
  salaire: 100_000, prime: 15_000, primeMatch: 0, duree: 3, role: 'cadre',
};
const termesDupliques: TermesRecrutementManager = {
  salaire: 110_000, prime: 20_000, primeMatch: 0, duree: 4, role: 'cadre',
};
const baseNegociation = {
  id: `nego-manager#${cible.id}#1`, pseudo: cible.pseudo, joueur: cible,
  exigences: { ...premiersTermes }, patience: 2, saison: 1, semaine: 5,
};
const negociations: NegociationManager[] = [
  { ...baseNegociation, offre: { ...premiersTermes }, etat: 'signee' },
  { ...baseNegociation, offre: { ...termesDupliques }, etat: 'accord', semaine: 7 },
];
const negociationsClubs: NegociationClubManager[] = [{
  id: `club-${cible.id}-1`, pseudo: 'ubb_officiel', club: cible.club, cible,
  demande: 500_000, offre: 420_000, plancher: 400_000, patience: 2,
  etat: 'accord', saison: 1, semaine: 4,
}];
const recrues: RecrueManager[] = [
  { joueur: cible, termes: premiersTermes, saison: 1 },
  { joueur: cible, termes: termesDupliques, saison: 1 },
];
const transfert: TransfertAnnonce = {
  nom: cible.nom, de: cible.club, vers: 'Stade Toulousain', saison: 1,
};

const repare = reparerRecrutementsDupliques(
  { recrues, negociations, negociationsClubs },
  [transfert, { ...transfert }],
);

verifier('un joueur signé est reconnu comme déjà recruté', joueurDejaRecrute({ recrues, negociations }, cible.id));
verifier('la copie de la recrue est supprimée', repare.recrues.length === 1 && repare.doublonsSupprimes === 1);
verifier('le contrat final reste signé avec les premiers termes', repare.negociations.length === 1
  && repare.negociations[0].etat === 'signee'
  && repare.negociations[0].offre.salaire === premiersTermes.salaire);
verifier('les deux budgets débités en trop sont remboursés exactement',
  repare.remboursementTransferts === 440_000 && repare.remboursementSalarial === 110_000,
  `${repare.remboursementTransferts} € + ${repare.remboursementSalarial} € salarial`);
verifier('l’annonce sociale du transfert reste unique', repare.transfertsSociaux.length === 1);

if (echecs) {
  console.error(`\n❌ ${echecs} contrôle(s) en échec`);
  process.exitCode = 1;
} else console.log('\n✅ Les distances sont géographiques et chaque joueur ne signe qu’une fois.');
