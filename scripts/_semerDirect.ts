// Amorce du serveur de développement : une ligue à deux clubs dont la première
// rencontre vient de commencer. Sert à REGARDER le direct dans le navigateur.
//
//   npx vite-node scripts/_semerDirect.ts
//   puis npm run dev, et on se connecte avec  colin / motdepasse123
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { agirCarriere, creerCarriere } from '../src/lib/ligue/carriere';
import { hacherMotDePasse } from '../serveur/carriereApi';

const maintenant = Date.now();
const ligueId = randomUUID();
const c1 = randomUUID();
const c2 = randomUUID();

let e = creerCarriere({
  id: ligueId, code: 'DR-DEMO01', compteId: c1, pseudo: 'Colin',
  nom: 'La Ligue du dimanche', clubNom: 'Colin RFC', rythme: 7, maxClubs: 2,
}, maintenant, 'graine-demo');
e = agirCarriere(e, c2, { type: 'rejoindre', pseudo: 'Ami', clubNom: 'Union Bordelaise' }, maintenant, 'graine-2');
e = agirCarriere(e, c1, { type: 'demarrerSaison' }, maintenant, 'graine-saison');

// La première rencontre vient de siffler le coup d'envoi ; les autres sont
// repoussées pour ne pas se lancer toutes seules pendant l'essai.
const iso = (ms: number) => new Date(ms).toISOString();
e.rencontres.forEach((r, i) => {
  if (i === 0) { r.ouvre = iso(maintenant - 120_000); r.ferme = iso(maintenant - 20_000); }
  else { r.ouvre = iso(maintenant + (i + 1) * 86_400_000); r.ferme = iso(maintenant + (i + 1) * 86_400_000 + 3_600_000); }
});

const empreinte = await hacherMotDePasse('motdepasse123');
const base = {
  comptes: [
    { id: c1, identifiant: 'colin', pseudo: 'Colin', empreinte },
    { id: c2, identifiant: 'ami', pseudo: 'Ami', empreinte },
  ],
  sessions: {},
  ligues: [{ id: ligueId, code: 'DR-DEMO01', version: 0, comptes: [c1, c2], etat: e }],
  recus: {},
  debits: {},
};
mkdirSync('node_modules/.destiny', { recursive: true });
writeFileSync('node_modules/.destiny/carriere.json', JSON.stringify(base));
console.log(`Ligue « ${e.nom} » semée : ${e.clubs.map((c) => c.nom).join(' contre ')}`);
console.log(`Coup d'envoi il y a 20 s · comptes : colin / ami · mot de passe : motdepasse123`);
