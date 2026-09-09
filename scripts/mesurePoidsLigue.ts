// ═══════════════════════════════════════════════════════════════════════════
// LE POIDS D'UNE LIGUE — ce que le mode écrit vraiment dans Postgres
// ═══════════════════════════════════════════════════════════════════════════
//   npx vite-node scripts/mesurePoidsLigue.ts
//
// La Carrière en ligne range TOUTE une ligue dans une seule colonne `jsonb`
// (`carriere_ligues.donnees`), réécrite en entier à chaque commande. La
// question n'est donc pas « combien pèse une ligne de match » mais :
//
//   1. jusqu'où grossit l'état d'une ligue au fil des saisons ?
//   2. combien d'octets une saison fait-elle traverser à la base ?
//
// Ce banc ne teste rien : il mesure, et il imprime des nombres.

import { gzipSync } from 'node:zlib';
import { agirCarriere, avancerCarriere, creerCarriere } from '../src/lib/ligue/carriere';
import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere';

const T0 = Date.parse('2026-09-07T10:00:00.000Z');
const JOUR = 24 * 3600_000;
const nb = (n: number) => Math.round(n).toLocaleString('fr-FR');
const ko = (octets: number) => `${nb(octets / 1024)} Ko`;
const mo = (octets: number) => `${(octets / 1024 / 1024).toFixed(2)} Mo`;

const poids = (x: unknown) => Buffer.byteLength(JSON.stringify(x) ?? '');
const poidsCompresse = (x: unknown) => gzipSync(Buffer.from(JSON.stringify(x) ?? '')).length;

/** Une ligue prête à jouer : n clubs inscrits, saison lancée. */
function ligue(clubs: number, rythme: number): EtatCarriereEnLigne {
  let e = creerCarriere({
    id: `mesure-${clubs}`, nom: 'La Ligue du dimanche', code: 'DR-POIDS',
    compteId: 'compte-1', pseudo: 'Colin', clubNom: 'Colin RFC', rythme, maxClubs: 20,
  }, T0, 'graine-de-mesure');
  for (let i = 2; i <= clubs; i++) {
    e = agirCarriere(e, `compte-${i}`, { type: 'rejoindre', pseudo: `Ami ${i}`, clubNom: `Club ${i}` }, T0, `graine-${i}`);
  }
  return agirCarriere(e, 'compte-1', { type: 'demarrerSaison' }, T0, 'graine-saison');
}

/** Avance jusqu'à ce que la saison soit finie, en jouant tous les matchs. */
function jouerLaSaison(depart: EtatCarriereEnLigne, debut: number): { etat: EtatCarriereEnLigne; fin: number } {
  let e = depart;
  let t = debut;
  for (let i = 0; i < 400 && e.phase === 'saison'; i++) {
    t += JOUR;
    e = avancerCarriere(e, t, `graine-jour-${i}`);
  }
  return { etat: e, fin: t };
}

function detail(e: EtatCarriereEnLigne) {
  const lignes = Object.entries(e)
    .map(([cle, valeur]) => ({ cle, octets: poids(valeur), n: Array.isArray(valeur) ? valeur.length : null }))
    .sort((a, b) => b.octets - a.octets)
    .filter(l => l.octets > 1024);
  for (const l of lignes) {
    console.log(`      ${l.cle.padEnd(16)} ${ko(l.octets).padStart(10)}${l.n === null ? '' : `   ${nb(l.n)} entrées`}`);
  }
}

console.log('\n═══ 1. LE POIDS DE L’ÉTAT, SAISON APRÈS SAISON (20 clubs) ═══\n');

{
  let e = ligue(20, 7);
  const rencontresParSaison = e.rencontres.length;
  console.log(`  À l’inscription des 20 clubs, avant le premier match :`);
  console.log(`      état complet     ${ko(poids(e)).padStart(10)}   (gzip ${ko(poidsCompresse(e))})`);
  console.log(`      ${nb(rencontresParSaison)} affiches au calendrier, ${nb(e.cartes.length)} cartes distribuées\n`);

  let t = T0;
  const historique: { saison: number; octets: number; gz: number; rencontres: number; transactions: number; cartes: number }[] = [];
  for (let saison = 1; saison <= 3; saison++) {
    const r = jouerLaSaison(e, t);
    e = r.etat; t = r.fin;
    historique.push({
      saison, octets: poids(e), gz: poidsCompresse(e),
      rencontres: e.rencontres.length, transactions: e.transactions.length, cartes: e.cartes.length,
    });
    console.log(`  Fin de la saison ${saison} :`);
    console.log(`      état complet     ${ko(poids(e)).padStart(10)}   (gzip ${ko(poidsCompresse(e))})`);
    detail(e);
    console.log('');
    if (saison < 3) { e = agirCarriere(e, 'compte-1', { type: 'demarrerSaison' }, t, `graine-saison-${saison + 1}`); }
  }

  console.log('  Croissance par saison :');
  for (let i = 0; i < historique.length; i++) {
    const avant = i === 0 ? 0 : historique[i - 1].octets;
    console.log(`      saison ${historique[i].saison} : +${ko(historique[i].octets - avant)}  →  ${ko(historique[i].octets)} au total`);
  }

  console.log('\n═══ 2. CE QUE LA BASE ENCAISSE ═══\n');
  const etatMoyen = historique[historique.length - 1].octets;
  const gzMoyen = historique[historique.length - 1].gz;
  const matchsParSaison = rencontresParSaison;

  // Chaque commande d'un manager réécrit l'état ENTIER (une seule ligne jsonb).
  // Un match en direct change l'état toutes les deux secondes : chaque sondage
  // d'un spectateur voit du neuf, donc écrit.
  // Cadences réelles, lues dans `CarriereEnLigne.tsx` (`delaiSondage`) :
  //   • 2 s   quand le manager SUIT le match,
  //   • 10 s  quand un match tourne dans la ligue sans qu'il le regarde,
  //   • 12 s  pour le battement de présence, qui est une commande POST.
  const DUREE_MATCH = 80 * 60_000;   // 80 minutes de vraie vie
  const suiviParMatch = DUREE_MATCH / 2_000;
  const sondagesParMatch = DUREE_MATCH / 10_000;
  const presencesParMatch = DUREE_MATCH / 12_000;

  console.log(`  État en fin de saison 3 : ${ko(etatMoyen)} brut, ${ko(gzMoyen)} gzip`);
  console.log(`  (Postgres compresse le jsonb en TOAST avec pglz, moins efficace que gzip :`);
  console.log(`   comptez entre les deux, soit de l’ordre de ${ko(gzMoyen)} à ${ko(etatMoyen / 2)} par version de ligne.)\n`);

  console.log(`  UN match en direct suivi par ses DEUX managers :`);
  console.log(`      ${nb(2 * suiviParMatch)} sondages à 2 s + ${nb(2 * presencesParMatch)} battements de présence`);
  console.log(`      chacun réécrit ${ko(etatMoyen)}  =  ${mo((2 * suiviParMatch + 2 * presencesParMatch) * etatMoyen)} écrits`);
  console.log(`      et autant relus : ${mo((2 * suiviParMatch + 2 * presencesParMatch) * etatMoyen)} de transfert sortant\n`);

  console.log(`  Le même match, personne ne le regarde (une écriture au dénouement) :`);
  console.log(`      ${ko(etatMoyen)} écrits — soit ${nb(2 * suiviParMatch + 2 * presencesParMatch)} fois moins.\n`);

  console.log(`  Une saison de ${nb(matchsParSaison)} matchs, tous suivis par leurs deux managers :`);
  console.log(`      ${mo(matchsParSaison * (2 * suiviParMatch + 2 * presencesParMatch) * etatMoyen)} écrits dans la même ligne`);
  console.log(`      (${nb(matchsParSaison * (2 * suiviParMatch + 2 * presencesParMatch))} versions de la ligne, à ${ko(etatMoyen)} pièce)\n`);

  console.log(`  Une saison entière jouée en l’absence de tout le monde :`);
  console.log(`      ${mo(matchsParSaison * etatMoyen)} écrits.\n`);

  console.log(`  Un onglet ouvert pendant un match qu’il ne regarde pas (10 s) :`);
  console.log(`      ${nb(sondagesParMatch)} lectures — dont la plupart repartent en « inchangé » (20 octets)\n`);

  console.log('  Ce que pèseraient plusieurs groupes d’amis (3 saisons chacun) :');
  for (const ligues of [20, 100, 1000]) {
    console.log(`      ${nb(ligues).padStart(5)} ligues de 20 clubs : ${mo(ligues * etatMoyen)} bruts, ${mo(ligues * gzMoyen)} compressés`);
  }
  console.log('');
}

console.log('═══ 3. LE POIDS D’UN DIRECT, SECONDE PAR SECONDE ═══\n');
{
  let e = ligue(6, 7);
  const avant = poids(e);
  // On avance d'un jour : la première fenêtre se ferme, le match se joue seul.
  const apres = avancerCarriere(e, T0 + JOUR, 'graine-direct');
  const jouees = apres.rencontres.filter(r => r.resultat);
  const detaillees = apres.rencontres.filter(r => r.match?.fil?.length);
  console.log(`  ${nb(jouees.length)} rencontre(s) jouée(s) : l’état passe de ${ko(avant)} à ${ko(poids(apres))}`);
  if (jouees.length) {
    const r = jouees[jouees.length - 1];
    console.log(`      une rencontre archivée complète : ${ko(poids(r))}`);
    console.log(`          dont le fil de commentaires : ${ko(poids(r.match?.fil ?? []))} (${nb(r.match?.fil?.length ?? 0)} lignes)`);
    console.log(`          dont la feuille de match    : ${ko(poids(r.match?.feuille ?? []))} (${nb(r.match?.feuille?.length ?? 0)} lignes)`);
    console.log(`          le reste (score, stats)     : ${ko(poids({ ...r, match: { ...r.match, fil: [], feuille: undefined } }))}`);
  }
  console.log(`      rencontres gardées en détail : ${nb(detaillees.length)} (l’élagage en garde 20)\n`);
}
