import { competitionDuClub } from '../src/data/clubs';
import { effectifDuClub } from '../src/lib/effectif';
import { ciblesDuMarche } from '../src/lib/recrutementManager';
import {
  demandeAGenerer, negocierAvecClub, offresPourVente, ouvrirNegociationClub, valeurDeVente,
} from '../src/lib/vestiaireManager';
import type { Manager, VenteManager } from '../src/types';

let echecs = 0;
function verifier(nom: string, ok: boolean, detail: string) {
  console.log(`${ok ? '✅' : '❌'} ${nom.padEnd(54)} ${detail}`);
  if (!ok) echecs++;
}

console.log("\n=== L'OVALE DU MANAGER ===");

const clubAcheteur = 'Stade Toulousain';
const cible = ciblesDuMarche('top14', 1, clubAcheteur)
  .find((j) => j.club !== clubAcheteur && j.indemnite > 0);
if (!cible) throw new Error('Aucune cible professionnelle pour le banc de vérification.');

const ouverte = ouvrirNegociationClub(cible, 1, 1);
verifier('la discussion commence sous la demande', ouverte.offre < ouverte.demande,
  `${ouverte.offre} < ${ouverte.demande}`);
verifier('le plancher du vendeur reste caché et crédible',
  ouverte.plancher > ouverte.offre && ouverte.plancher < ouverte.demande,
  `${ouverte.offre} < ${ouverte.plancher} < ${ouverte.demande}`);
const acceptee = negocierAvecClub(ouverte, 'accepter').negociation;
verifier('payer la demande conclut entre clubs', acceptee.etat === 'accord', acceptee.etat);

const clubAmateur = 'RC Orléans';
const amateur = effectifDuClub(clubAmateur, 1)[0];
const valeurAmateur = valeurDeVente(amateur, clubAmateur);
verifier('un joueur amateur ne produit aucune indemnité', valeurAmateur === 0,
  `${competitionDuClub(clubAmateur)?.nom} · ${valeurAmateur} €`);

const joueurVendu = effectifDuClub(clubAcheteur, 1)[0];
const vente: VenteManager = {
  joueurId: joueurVendu.id, nom: joueurVendu.nom, poste: joueurVendu.poste,
  age: joueurVendu.age, note: joueurVendu.note, potentiel: joueurVendu.potentiel,
  valeur: valeurDeVente(joueurVendu, clubAcheteur), saison: 1, offres: [],
};
const offres = offresPourVente(vente, clubAcheteur, 1);
verifier('une vente professionnelle reçoit des projets crédibles', offres.length > 0,
  `${offres.length} offre(s)`);
verifier('aucun acheteur ne se confond avec le vendeur',
  offres.every((o) => o.club !== clubAcheteur), offres.map((o) => o.club).join(', '));

const groupe = effectifDuClub(clubAcheteur, 1);
const manager = {
  club: clubAcheteur, saison: 1, semaine: 8, demandes: [], tempsDeJeu: {},
} as unknown as Manager;
const demande = demandeAGenerer(manager, groupe, 8);
verifier('le vestiaire parle après un manque de temps de jeu mesuré', !!demande,
  demande ? `${demande.nom} · ${demande.type}` : 'aucune demande');

if (echecs) {
  console.error(`\n❌ ${echecs} échec(s)`);
  process.exit(1);
}
console.log('\n✅ L’Ovale du manager est cohérent.');
