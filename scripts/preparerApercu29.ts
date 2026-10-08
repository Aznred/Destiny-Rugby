// Données jetables du serveur local, sans accès à la base de production.
import { randomUUID } from 'node:crypto';
import { stockageFichier } from '../serveur/carriereFichier';
import { hacherMotDePasse } from '../serveur/carriereApi';
import { creerCarriere, agirCarriere } from '../src/lib/ligue/carriere';
const db = stockageFichier('node_modules/.destiny/carriere.json');
const identifiant = 'verification29';
let compte = await db.compteParIdentifiant(identifiant);
if (!compte) {
  compte = { id: randomUUID(), identifiant, pseudo: 'Contrôle 29', empreinte: await hacherMotDePasse('MatchLocal29!') };
  await db.creerCompte(compte);
}
const maintenant = Date.now();
let ligue = creerCarriere({ id: randomUUID(), nom: 'Vérification du Correctif 29', code: 'DR-VERIF29',
  compteId: compte.id, pseudo: compte.pseudo, clubNom: 'Rugby Club des Deux Rives', rythme: 7, maxClubs: 16,
  playoffs: true }, maintenant, 'verification29');
for (let i = 1; i < 16; i++) ligue = agirCarriere(ligue, randomUUID(), { type: 'rejoindre',
  pseudo: `Manager ${i}`, clubNom: `Association Sportive de la Vallée ${i}` }, maintenant, `club-${i}`);
ligue = agirCarriere(ligue, compte.id, { type: 'demarrerSaison' }, maintenant, 'saison29');
await db.creerLigue({ id: ligue.id, code: ligue.code, version: 0, comptes: ligue.clubs.map(c => c.compteId), etat: ligue });
console.log('Ligue locale de 16 clubs créée pour la vérification à l’écran.');
