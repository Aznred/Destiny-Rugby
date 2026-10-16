import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validerCarteNormale,
  validerClubPropose,
  validerDemandeCarte,
  carteNormaleVide,
  type PropositionClub,
  type SaisieCarteNormale,
} from '../src/lib/cartesNormales.js';
import { stockageFichier } from '../serveur/carriereFichier.js';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi.js';

let controles = 0;
const eg = <T>(obtenu: T, attendu: T, message: string) => {
  assert.deepEqual(obtenu, attendu, message);
  controles++;
};

console.log('--- Test de CompleteTaCarte & Propositions de clubs ---');

// 1. Validation de validerClubPropose
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const clubValide: PropositionClub = {
  nom: 'RC Vannes',
  division: 'Top 14',
  ville: 'Vannes',
  pays: 'France',
  logo: PNG,
  c1: '#002B49',
  c2: '#FFFFFF',
  joueurs: [
    { ...carteNormaleVide(), nom: 'Maxime Lafage', poste: 'demi_ouverture', note: 74, potentiel: 76, age: 26 },
    { ...carteNormaleVide(), nom: 'Gwenael Duprat', poste: 'talonneur', note: 71, potentiel: 74, age: 24 },
  ],
};

const clubNettoye = validerClubPropose(clubValide);
eg(clubNettoye.nom, 'RC Vannes', 'Nom de club préservé');
eg(clubNettoye.division, 'Top 14', 'Division préservée');
eg(clubNettoye.joueurs.length, 2, 'Les 2 joueurs sont validés');
eg(clubNettoye.logo, PNG, 'Logo préservé');

// Rejets sur données invalides
assert.throws(() => validerClubPropose({ ...clubValide, nom: '' }), /Nom du club/);
controles++;
assert.throws(() => validerClubPropose({ ...clubValide, division: '' }), /Division/);
controles++;
assert.throws(() => validerClubPropose({ ...clubValide, logo: 'javascript:alert(1)' }), /Logo/);
controles++;

// 2. Certification des droits obligatoire
const carte: SaisieCarteNormale = {
  ...carteNormaleVide(),
  nom: 'Test Joueur',
  clubReel: 'RC Vannes',
  championnat: 'Top 14',
  note: 70,
  potentiel: 75,
  photo: PNG,
};

assert.throws(
  () => validerDemandeCarte({ type: 'creation', carte, droitsCertifies: false }),
  /droits d'utilisation de l'image postée/,
  'droitsCertifies: false est rejeté pour une création de carte',
);
controles++;

assert.throws(
  () => validerDemandeCarte({ type: 'club', clubPropose: clubValide, droitsCertifies: false }),
  /droits d'utilisation de l'image postée/,
  'droitsCertifies: false est rejeté pour une proposition de club',
);
controles++;

const demandeValidee = validerDemandeCarte({
  type: 'club',
  clubPropose: clubValide,
  droitsCertifies: true,
  message: 'Montée en Top 14 !',
});
eg(demandeValidee.type, 'club', 'Type club accepté');
eg(demandeValidee.clubPropose?.nom, 'RC Vannes', 'Club inclus dans la demande');
eg(demandeValidee.droitsCertifies, true, 'Droits certifiés acceptés');

// 3. Cycle complet API serveur : soumission, consultation, décision Kiri
const dossier = mkdtempSync(join(tmpdir(), 'destiny-complete-carte-'));
const fichier = join(dossier, 'carriere.json');
const db = stockageFichier(fichier);
const api = creerGestionnaireCarriere(db);

const joueur = randomUUID();
const kiri = randomUUID();
await db.creerCompte({ id: joueur, identifiant: 'joueur_contributeur', pseudo: 'Contributeur', empreinte: 'test' });
await db.creerCompte({ id: kiri, identifiant: 'kiri', pseudo: 'Kiri', empreinte: 'test' });
await db.ouvrirSession(empreinteJeton(joueur), joueur, Date.now() + 600_000);
await db.ouvrirSession(empreinteJeton(kiri), kiri, Date.now() + 600_000);

const appel = async (compte: string, corps?: unknown, params = '') => {
  let statut = 200;
  let donnees: any;
  const res: any = {
    setHeader: () => {},
    status: (s: number) => { statut = s; return res; },
    json: (d: any) => { donnees = d; },
  };
  await api.handler(
    {
      method: corps ? 'POST' : 'GET',
      url: `/api/carriere?demandesCartes=1${params}`,
      headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: compte ? `destiny_carriere=${compte}` : '' },
      body: corps,
    },
    res,
  );
  return { statut, donnees };
};

// 3.1 Rejet si droits non certifiés à l'API
const repRejet = await appel(joueur, {
  action: 'demandesCartes',
  operation: 'soumettre',
  type: 'club',
  clubPropose: clubValide,
  droitsCertifies: false,
});
eg(repRejet.statut, 400, 'Rejet API si droits non certifiés');

// 3.2 Soumission réussie d'une proposition de club
const repSucces = await appel(joueur, {
  action: 'demandesCartes',
  operation: 'soumettre',
  type: 'club',
  clubPropose: clubValide,
  droitsCertifies: true,
  message: 'Proposition officielle du RC Vannes',
});
eg(repSucces.statut, 200, 'Proposition de club enregistrée');
eg(repSucces.donnees.demandes.length, 1, 'Une demande visible par le joueur');
eg(repSucces.donnees.demandes[0].type, 'club', 'Demande de type club');
eg(repSucces.donnees.demandes[0].statut, 'attente', 'Demande en statut attente');

// 3.3 Consultation côté Kiri
const repKiri = await appel(kiri);
eg(repKiri.statut, 200, 'Kiri accède aux demandes');
const demandeId = repKiri.donnees.demandes[0].id;

const detailDemande = await appel(kiri, undefined, `&id=${demandeId}`);
eg(detailDemande.statut, 200, 'Détail de la demande accessible');
eg(detailDemande.donnees.demande.clubPropose.nom, 'RC Vannes', 'Détails du club complets');
eg(detailDemande.donnees.demande.clubPropose.logo, PNG, 'Logo accessible pour examen');
eg(detailDemande.donnees.demande.clubPropose.joueurs.length, 2, 'Effectif complet accessible');

// 3.4 Décision de refus avec message explicatif
const repRefus = await appel(kiri, {
  action: 'demandesCartes',
  operation: 'refuser',
  id: demandeId,
  revision: 0,
  reponse: 'Logo nécessitant une version haute définition.',
});
eg(repRefus.statut, 200, 'Refus enregistré par le modérateur');

// 3.5 Le joueur voit la décision et le motif
const repJoueurApres = await appel(joueur);
eg(repJoueurApres.donnees.demandes[0].statut, 'refusee', 'Demande marquée refusée');
eg(
  repJoueurApres.donnees.demandes[0].reponse,
  'Logo nécessitant une version haute définition.',
  'Motif visible par le proposant',
);

console.log(`OK · ${controles} contrôles réussis pour CompleteTaCarte, clubs et droits d'images.`);
