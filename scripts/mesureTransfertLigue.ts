// ═══════════════════════════════════════════════════════════════════════════
// CE QUI TRAVERSE LE RÉSEAU PENDANT UN DIRECT
// ═══════════════════════════════════════════════════════════════════════════
//   npx vite-node scripts/mesureTransfertLigue.ts
//
// Complément de `mesurePoidsLigue.ts` : celui-là mesure ce que la base RANGE,
// celui-ci mesure ce qu'elle LIT et ce qu'elle RÉÉCRIT pendant qu'un match se
// joue en direct — les deux postes qui avaient vidé le quota Neon.

import { gzipSync } from 'node:zlib';
import { agirCarriere, avancerCarriere, creerCarriere, empreinteEcriture, vueCarriere } from '../src/lib/ligue/carriere';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

const T0 = Date.parse('2026-09-07T10:00:00.000Z');
const nb = (n: number) => Math.round(n).toLocaleString('fr-FR');
const ko = (o: number) => `${nb(o / 1024)} Ko`;
const mo = (o: number) => `${(o / 1024 / 1024).toFixed(1)} Mo`;
const poids = (x: unknown) => Buffer.byteLength(JSON.stringify(x) ?? '');
const gz = (x: unknown) => gzipSync(Buffer.from(JSON.stringify(x) ?? '')).length;

function ligue(clubs: number): EtatCarriereEnLigne {
  let e = creerCarriere({
    id: `transfert-${clubs}`, nom: 'La Ligue du dimanche', code: 'DR-TRANS',
    compteId: 'compte-1', pseudo: 'Colin', clubNom: 'Colin RFC', rythme: 1, maxClubs: 20,
  }, T0, 'graine-transfert');
  for (let i = 2; i <= clubs; i++) {
    e = agirCarriere(e, `compte-${i}`, { type: 'rejoindre', pseudo: `Ami ${i}`, clubNom: `Club ${i}` }, T0, `graine-${i}`);
  }
  return agirCarriere(e, 'compte-1', { type: 'demarrerSaison' }, T0, 'graine-saison');
}

for (const clubs of [8, 20]) {
  const e = ligue(clubs);
  const vue = vueCarriere(e, 'compte-1');
  console.log(`\n  ─── ${clubs} clubs, saison lancée, aucun match joué ───`);
  console.log(`      l’état rangé en base       : ${ko(poids(e))} (gzip ${ko(gz(e))})`);
  console.log(`      la vue envoyée au client   : ${ko(poids(vue))} (gzip ${ko(gz(vue))})`);
  console.log(`      → une réponse complète coûte ${ko(gz(vue))} de transfert sortant`);
}

console.log('\n  ─── Un direct : qui écrit, qui ne fait que lire ? ───\n');
{
  // 20 clubs, on va jusqu'au coup d'envoi du match de Colin et on le suit comme
  // le fait l'écran. ⚠️ Le match part à `ferme`, pas à `ouvre` : la journée est
  // une fenêtre, et le coup d'envoi tombe à sa fermeture.
  let e = ligue(20);
  const monClub = e.clubs[0].id;
  const r = e.rencontres.find(x => x.domicile === monClub || x.exterieur === monClub)!;
  const debut = Date.now();
  let t = Date.parse(r.ferme);
  e = avancerCarriere(e, t, 'coup-denvoi');
  let ecritures = 0;
  let lectures = 0;
  let octetsLus = 0;

  // 40 sondages de 2 s : ce que fait l'écran d'un manager qui suit son match.
  for (let i = 0; i < 40; i++) {
    t += 2_000;
    const avant = e;
    const apres = avancerCarriere(avant, t, `sondage-${i}`);
    lectures++;
    octetsLus += poids(vueCarriere(apres, 'compte-1'));
    // C'est exactement le test de `appliquer` : même empreinte, aucune écriture.
    if (empreinteEcriture(apres, avant.version) !== empreinteEcriture(avant, avant.version)) ecritures++;
    e = apres;
  }
  console.log(`      40 sondages de 2 s : ${nb(ecritures)} écriture(s), ${nb(lectures)} lecture(s)`);
  console.log(`      soit ${ko(octetsLus / lectures)} rendus en moyenne par sondage`);

  // Le moteur sait toujours recevoir une présence, mais l'API ne la range plus
  // dans cet agrégat : elle fait un UPSERT de trois identifiants et une date.
  const presence = { ligue: e.id, match: r.id, compte: 'compte-1', vu: t };
  console.log(`      un battement écrit ${poids(presence)} octets logiques dans carriere_presences, pas l’état`);

  const DUREE = 80 * 60_000;
  const battements = 2 * (DUREE / 12_000);       // deux managers devant leur match
  const sondages = 2 * (DUREE / 2_000);
  const etat = poids(e);
  const vue = poids(vueCarriere(e, 'compte-1'));
  const petitBattement = poids(presence);
  console.log('');
  console.log(`      Sur un match complet de 80 minutes, à 20 clubs :`);
  console.log(`        présences  ${nb(battements)} × ${petitBattement} o = ${mo(battements * petitBattement)} de données logiques`);
  console.log(`        évité      ${nb(battements)} × ${ko(etat)} = ${mo(battements * etat)} de réécritures du JSONB`);
  console.log(`        sondages   ${nb(sondages)} en-têtes relationnels ; l’état chaud reste en mémoire serveur`);
  console.log(`        sortant    ${nb(sondages)} × ${ko(vue)} = ${mo(sondages * vue)} envoyés aux navigateurs`);
  console.log(`        reçus      ${nb(sondages)} × ${ko(gz(vueCarriere(e, 'compte-1')))} = ${mo(sondages * gz(vueCarriere(e, 'compte-1')))} après compression HTTP`);
  console.log('');
  console.log(`      Une saison de 380 matchs tous suivis évite ${mo(380 * battements * etat)} de`);
  console.log(`      réécritures JSONB dues aux présences ; seuls les vrais événements persistent.`);
  console.log(`\n      (mesure faite en ${nb(Date.now() - debut)} ms)\n`);
}
