import assert from 'node:assert/strict';
import { agirCarriere, creerCarriere, vueCarriere } from '../src/lib/ligue/carriere';

const maintenant = Date.parse('2026-09-07T10:00:00.000Z');
let etat = creerCarriere({ id: 'equipes-test', nom: 'Ligue test', code: 'TEST', compteId: 'a', pseudo: 'Lenny', clubNom: 'Lenny RFC', rythme: 1, maxClubs: 2 }, maintenant, 'graine-test');
etat = agirCarriere(etat, 'b', { type: 'rejoindre', pseudo: 'Camille', clubNom: 'Camille RFC' }, maintenant, 'rejoindre');
etat = agirCarriere(etat, 'a', { type: 'demarrerSaison' }, maintenant, 'saison');
const [lenny, camille] = etat.clubs;
const feuille = structuredClone(lenny.composition);

for (let i = 0; i < 15; i++) {
  etat = agirCarriere(etat, 'a', { type: 'sauvegarderComposition', nom: `Équipe ${i + 1}`, composition: feuille }, maintenant + i, `sauvegarde-${i}`);
}
assert.equal(etat.clubs[0].compositionsSauvegardees?.length, 15);
assert.equal(vueCarriere(etat, 'b').clubs.find(c => c.id === lenny.id)?.compositionsSauvegardees, undefined);
assert.throws(() => agirCarriere(etat, 'a', { type: 'sauvegarderComposition', nom: 'Seizième', composition: feuille }, maintenant + 20, 'limite'), /15 équipes/);
const sauvegardeId = etat.clubs[0].compositionsSauvegardees![0].id;
etat = agirCarriere(etat, 'a', { type: 'supprimerComposition', id: sauvegardeId }, maintenant + 21, 'supprimer');
assert.equal(etat.clubs[0].compositionsSauvegardees?.length, 14);

let aligneId = '';
for (const id of etat.clubs[0].composition.titulaires.slice(3)) {
  try {
    etat = agirCarriere(etat, 'a', { type: 'proposerEchange', vers: camille.id, cartesDonnees: [id], cartesDemandees: [], ovasDonnes: 0, ovasDemandes: 0 }, maintenant + 22, `offre-${id}`);
    aligneId = id;
    break;
  } catch { /* Certains postes n'ont pas assez de profondeur pour céder un joueur. */ }
}
assert.ok(aligneId, 'une offre avec un titulaire doit pouvoir être proposée');
const offre = etat.echanges.at(-1)!;
const nom = etat.cartes.find(c => c.id === aligneId)!.nom;
const blocage = vueCarriere(etat, 'b').echanges.find(e => e.id === offre.id)?.blocage;
assert.match(blocage ?? '', new RegExp(`${lenny.pseudo}.*${nom}`));
assert.throws(() => agirCarriere(etat, 'b', { type: 'repondreEchange', echangeId: offre.id, accepter: true }, maintenant + 23, 'refus-aligne'), /feuille de match/);

const composition = structuredClone(etat.clubs[0].composition);
const surFeuille = new Set([...composition.titulaires, ...composition.remplacants]);
const reserve = etat.cartes.find(c => c.proprietaire === lenny.id && !surFeuille.has(c.id) && !c.blesseJusqua)!;
composition.titulaires[composition.titulaires.indexOf(aligneId)] = reserve.id;
if (composition.capitaineId === aligneId) composition.capitaineId = reserve.id;
if (composition.buteurId === aligneId) composition.buteurId = reserve.id;
etat = agirCarriere(etat, 'a', { type: 'composition', composition }, maintenant + 24, 'sortir-feuille');
assert.equal(vueCarriere(etat, 'b').echanges.find(e => e.id === offre.id)?.blocage, undefined);
etat = agirCarriere(etat, 'b', { type: 'repondreEchange', echangeId: offre.id, accepter: true }, maintenant + 25, 'accepter');
assert.equal(etat.cartes.find(c => c.id === aligneId)?.proprietaire, camille.id);

console.log('Équipes sauvegardées et échanges alignés : OK');
