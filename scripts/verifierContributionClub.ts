import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { carteNormaleVide, compositionClubPropose, effectifClubProposeComplet, titulariserJoueurClubPropose, validerClubPropose } from '../src/lib/cartesNormales';
import type { PropositionClub } from '../src/lib/cartesNormales';
import { catalogueAvecClubPropose } from '../serveur/cartesNormales';
import { CATALOGUE_ADMIN_VIDE } from '../src/lib/ligue/atelierCatalogue';
import { catalogueMondialCarriere } from '../src/lib/ligue/catalogueCarriere';
import { appliquerLocalisations, identiteClubPubliee } from '../src/lib/localisationClub';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { demandesCartesSql } from '../serveur/demandesCartesStockage';
import { POSTES } from '../src/data/rugby';

const logo = '/logos/club-propose.webp';
const club: PropositionClub = { nom: 'Rugby Club Contribution Témoin', division: 'Régionale 1', pays: 'France',
  logo, c1: '#235c41', c2: '#dec175', joueurs: Array.from({ length: 30 }, (_, i) => ({ ...carteNormaleVide(),
    nom: `Contribution Joueur ${i + 1}`, poste: POSTES[i % 15].id, photo: '/photos/silhouette.webp',
    clubReel: 'Ancien nom du club', championnat: 'Ancienne division' })) };
const valide = validerClubPropose(club);
assert.ok(valide.joueurs.every(j => j.clubReel === club.nom && j.championnat === club.division));
assert.equal(compositionClubPropose(valide.joueurs).titulaires.length, 15);
assert.equal(compositionClubPropose(valide.joueurs).remplacants.length, 15);
const titulaire = titulariserJoueurClubPropose(valide.joueurs, 15);
assert.equal(titulaire[0].nom, valide.joueurs[15].nom);
assert.equal(titulaire.length, 30);
assert.equal(valide.joueurs[0].nom, 'Contribution Joueur 1', 'Le changement de XV conserve la saisie précédente.');
assert.throws(() => validerClubPropose({ ...club, joueurs: [...club.joueurs, club.joueurs[0]] }), /30 joueurs/);
const id = randomUUID();
const catalogue = catalogueAvecClubPropose(CATALOGUE_ADMIN_VIDE, id, club);
assert.equal(Object.keys(catalogue.ajouts!).length, 30);
assert.equal(catalogue.clubs![club.nom].logo, logo);
assert.ok(Object.values(catalogue.ajouts!).every(j => j.photo === '/photos/silhouette.webp'));
const repete = catalogueAvecClubPropose(catalogue, id, club);
assert.equal(Object.keys(repete.ajouts!).length, 30, 'Reprise sans doublons.');
assert.throws(() => catalogueAvecClubPropose(CATALOGUE_ADMIN_VIDE, randomUUID(), { ...club, joueurs: [] }), /15 postes du XV/);
assert.throws(() => catalogueAvecClubPropose(CATALOGUE_ADMIN_VIDE, id, { ...club, joueurs: [club.joueurs[0], club.joueurs[0]] }), /deux fois/);
const complet = { ...club, joueurs: club.joueurs.slice(0, 23) };
const sansPoste = { ...complet, joueurs: complet.joueurs.map(j => ({ ...j, poste: POSTES[0].id })) };
for (const partiel of [[], club.joueurs.slice(0, 15), club.joueurs.slice(0, 22), sansPoste.joueurs]) {
  assert.equal(effectifClubProposeComplet(partiel), false);
  assert.throws(() => validerClubPropose({ ...club, joueurs: partiel }), /15 postes du XV/);
}
assert.equal(effectifClubProposeComplet(complet.joueurs), true);
assert.equal(validerClubPropose(complet).joueurs.length, 23);
assert.throws(() => validerClubPropose({ ...complet, joueurs: [...complet.joueurs, null] }), /Carte invalide/);
assert.equal(validerClubPropose({ ...club, joueurs: [] }, false).joueurs.length, 0, 'Le Labo peut enregistrer les corrections d’un ancien dossier partiel.');
appliquerLocalisations(catalogue.clubs!);
assert.equal(identiteClubPubliee(club.nom)?.logo, logo);

const dossier = mkdtempSync(join(tmpdir(), 'contribution-club-'));
try {
const db = stockageFichier(join(dossier, 'carriere.json'));
const api = creerGestionnaireCarriere(db);
const membre = randomUUID(), kiri = randomUUID();
for (const [compte, identifiant] of [[membre, 'contribution_test'], [kiri, 'kiri']]) {
  await db.creerCompte({ id: compte, identifiant, pseudo: identifiant, empreinte: 'test' });
  await db.ouvrirSession(empreinteJeton(compte), compte, Date.now() + 600_000);
}
async function appel(compte: string, corps?: unknown, params = '') {
  let statut = 200;
  let donnees: any;
  const res = { setHeader() {}, status(n: number) { statut = n; return res; }, json(d: unknown) { donnees = d; } };
  await api.handler({ method: corps ? 'POST' : 'GET', url: `/api/carriere?demandesCartes=1${params}`,
    headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${compte}` }, body: corps }, res);
  return { statut, donnees };
}
for (const incomplet of [{ ...club, joueurs: [] }, { ...club, joueurs: club.joueurs.slice(0, 22) }, sansPoste]) {
  const rejet = await appel(membre, { action: 'demandesCartes', operation: 'soumettre', type: 'club', clubPropose: incomplet, droitsCertifies: true });
  assert.equal(rejet.statut, 400);
  assert.match(rejet.donnees.erreur, /15 postes du XV/);
  assert.equal((await appel(membre)).donnees.demandes.length, 0, 'Un appel direct ne contourne pas le XV et le banc.');
}
const soumise = await appel(membre, { action: 'demandesCartes', operation: 'soumettre', type: 'club', clubPropose: club, droitsCertifies: true });
assert.equal(soumise.statut, 200);
const demande = soumise.donnees.demandes[0];
assert.equal(demande.clubPropose.joueurs.length, 30);
assert.ok(demande.clubPropose.joueurs.every((j: { photo?: string }) => !j.photo));
assert.ok(!JSON.stringify(demande).includes('/photos/silhouette.webp'), 'Les images imbriquées ne traversent pas les listes.');
const details = await appel(kiri, undefined, `&id=${demande.id}`);
assert.equal(details.donnees.demande.clubPropose.joueurs[29].photo, '/photos/silhouette.webp');
assert.equal((await appel(membre, { action: 'demandesCartes', operation: 'approuver', id: demande.id, revision: 0, revisionCatalogue: 0, clubPropose: valide })).statut, 403);
const corrige = { ...valide, nom: 'Rugby Club Contribution Corrigé', joueurs: valide.joueurs.map((j, i) => i === 29 ? { ...j, note: 68, potentiel: 70 } : j) };
assert.equal((await appel(kiri, { action: 'demandesCartes', operation: 'modifier', id: demande.id, revision: 0, clubPropose: corrige })).statut, 200);
const relue = (await appel(kiri, undefined, `&id=${demande.id}`)).donnees.demande;
assert.equal(relue.clubPropose.joueurs[29].note, 68);
assert.equal(relue.clubPropose.logo, logo);
assert.equal((await appel(kiri, { action: 'demandesCartes', operation: 'approuver', id: demande.id, revision: 1, revisionCatalogue: 99, clubPropose: corrige })).statut, 409);
assert.equal(Object.keys((await db.atelier!.lire()).ajouts ?? {}).length, 0, 'Aucune publication partielle après conflit.');
assert.equal((await appel(kiri, { action: 'demandesCartes', operation: 'approuver', id: demande.id, revision: 1, revisionCatalogue: 0, clubPropose: corrige })).statut, 200);
const publie = await db.atelier!.lire();
assert.equal(Object.keys(publie.ajouts!).length, 30);
assert.equal(catalogueMondialCarriere(publie).filter(c => c.clubReel === corrige.nom).length, 30);
assert.equal(publie.clubs![corrige.nom].logo, logo);
assert.equal((await appel(kiri, undefined, `&id=${demande.id}`)).donnees.demande.clubPropose.joueurs.length, 30);
assert.equal((await appel(kiri, { action: 'demandesCartes', operation: 'approuver', id: demande.id, revision: 1, revisionCatalogue: 1, clubPropose: corrige })).statut, 409);

// Trente portraits dépassent aisément l'ancienne limite de 500 Ko.
const grosClub = { ...club, nom: 'Club Trente Portraits', joueurs: club.joueurs.map(j => ({ ...j,
  photo: `data:image/webp;base64,${'AAAA'.repeat(5000)}` })) };
assert.ok(JSON.stringify(grosClub).length > 500_000);
const grosEnvoi = await appel(membre, { action: 'demandesCartes', operation: 'soumettre', type: 'club', clubPropose: grosClub, droitsCertifies: true });
assert.equal(grosEnvoi.statut, 200);
assert.ok(JSON.stringify(grosEnvoi.donnees).length < 40_000, 'La liste garde les informations sans rapatrier les portraits.');

// La même écriture SQL conserve les données du club lors de l'édition et de l'approbation atomique.
const ecritures: string[] = [];
const sql = async (morceaux: TemplateStringsArray, ...valeurs: unknown[]) => {
  const requete = morceaux.join('?');
  if (requete.includes('update demandes_cartes') || requete.includes('with demande as')) {
    ecritures.push(...valeurs.filter((v): v is string => typeof v === 'string' && v.includes('clubPropose')));
    return [{ id: demande.id }];
  }
  return [];
};
const depotSql = demandesCartesSql(sql);
await depotSql.modifier(demande.id, 0, corrige.joueurs[0], corrige);
await depotSql.approuver(demande.id, 1, publie, 0, corrige.joueurs[0], 'kiri', corrige);
assert.equal(ecritures.length, 2);
assert.ok(ecritures.every(e => JSON.parse(e).clubPropose.joueurs.length === 30));
console.log('OK — 30 cartes publiées, blason distinct du portrait, édition conservée, reprise sans doublons, autorisations et révisions, métadonnées SQL.');
} finally { rmSync(dossier, {recursive: true, force: true}); }
