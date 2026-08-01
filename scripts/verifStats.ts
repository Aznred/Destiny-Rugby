// Vérification SANS NAVIGATEUR des classements individuels :
//   1. tous les joueurs de toutes les ligues ont des statistiques ;
//   2. les chiffres sont crédibles ET cohérents entre eux ;
//   3. chaque catégorie donne un classement sensé (le bon poste en tête) ;
//   4. le joueur humain apparaît avec SES vrais chiffres.

import {
  classementJoueurs, statsCompetition, CATEGORIES, afficherValeur, valeurDe, nomPoste,
} from '../src/lib/statsJoueurs';
import { journeesALaSemaine, nombreJournees } from '../src/lib/championnat';
import { POSTE_PAR_ID } from '../src/data/rugby';
import type { Joueur } from '../src/types';

const SAISON = 1;

console.log('=== 1. DES STATS DANS TOUTES LES LIGUES ===');
for (const id of ['top14', 'prod2', 'premiership', 'urc', 'nationale', 'fed2', 'reg3']) {
  const total = nombreJournees(id, '');
  const journees = journeesALaSemaine(id, 44, total); // saison complète
  const lignes = statsCompetition(id, SAISON, journees, id === 'reg3' || id === 'fed2' ? 0 : undefined);
  const joues = lignes.filter((l) => l.matchs > 0);
  console.log(
    `  ${id.padEnd(12)} ${String(journees).padStart(2)} journées · ` +
    `${String(lignes.length).padStart(4)} joueurs, ${joues.length} ont joué`,
  );
}

console.log('\n=== 2. DES CHIFFRES QUI SE TIENNENT (Top 14, saison complète) ===');
{
  const total = nombreJournees('top14', '');
  const journees = journeesALaSemaine('top14', 44, total);
  const lignes = statsCompetition('top14', SAISON, journees);
  const anomalies = lignes.filter((l) =>
    l.titularisations > l.matchs
    || l.butsReussis > l.butsTentes
    || l.matchs > journees
    || l.minutes > l.matchs * 80
    || l.essais > l.matchs,
  );
  console.log(`  ${lignes.length} joueurs, ${anomalies.length} incohérence(s)`);
  for (const a of anomalies.slice(0, 3)) console.log('   ✗', a.nom, JSON.stringify(a));

  const somme = (f: (l: typeof lignes[0]) => number) => lignes.reduce((s, l) => s + f(l), 0);
  const buteurs = lignes.filter((l) => l.butsTentes >= 10);
  console.log(`  essais marqués dans le championnat : ${somme((l) => l.essais)}`);
  console.log(`  buteurs attitrés (≥10 tentatives) : ${buteurs.length} sur 14 clubs`);
  console.log(`  plaquages moyens par match d’un titulaire : ${(
    somme((l) => l.plaquages) / Math.max(1, somme((l) => l.minutes) / 80)
  ).toFixed(1)}`);
  const reussite = buteurs.reduce((s, l) => s + l.butsReussis / l.butsTentes, 0) / Math.max(1, buteurs.length);
  console.log(`  réussite moyenne au pied : ${Math.round(reussite * 100)} %`);
}

console.log('\n=== 3. CHAQUE CATÉGORIE, ET LE POSTE EN TÊTE ===');
{
  const total = nombreJournees('top14', '');
  const journees = journeesALaSemaine('top14', 44, total);
  for (const c of CATEGORIES) {
    const cl = classementJoueurs('top14', SAISON, journees, c.id, null, undefined, 3);
    const tete = cl[0];
    console.log(
      `  ${c.emoji} ${c.nom.padEnd(13)} 1. ${tete.nom} (${nomPoste(tete.poste)}, ${tete.club}) — ${afficherValeur(tete, c.id)}`,
    );
    // Le classement doit être trié.
    const trie = cl.every((l, i) => i === 0 || valeurDe(cl[i - 1], c.id) >= valeurDe(l, c.id));
    if (!trie) console.log('    ✗ classement mal trié');
  }
  // Contrôle de bon sens : les meilleurs marqueurs doivent être des trois-quarts.
  const marqueurs = classementJoueurs('top14', SAISON, journees, 'essais', null, undefined, 10);
  const arrieres = marqueurs.filter((l) => POSTE_PAR_ID[l.poste].categorie === 'Arrière').length;
  console.log(`  → ${arrieres}/10 des meilleurs marqueurs sont des trois-quarts`);
  const plaqueurs = classementJoueurs('top14', SAISON, journees, 'plaquages', null, undefined, 10);
  const avants = plaqueurs.filter((l) => POSTE_PAR_ID[l.poste].categorie === 'Avant').length;
  console.log(`  → ${avants}/10 des meilleurs plaqueurs sont des avants`);
}

console.log('\n=== 4. LE JOUEUR HUMAIN AVEC SES VRAIS CHIFFRES ===');
{
  const joueur = {
    nom: 'Léo Fabre', poste: 'ailier_gauche', club: 'Stade Toulousain', division: 'top14',
    saison: SAISON, semaine: 44, age: 24, argent: 0, titres: [], attributs: {},
    saisonEnCours: {
      matchs: 20, titularisations: 18, essais: 17, notes: [], capes: 0,
      stats: {
        points: 85, butsTentes: 0, butsReussis: 0, plaquages: 74, plaquagesManques: 9,
        grattages: 5, passesDecisives: 11, cartonsJaunes: 1, cartonsRouges: 0,
      },
    },
  } as unknown as Joueur;

  const total = nombreJournees('top14', 'Stade Toulousain');
  const journees = journeesALaSemaine('top14', 44, total);
  const cl = classementJoueurs('top14', SAISON, journees, 'essais', joueur, undefined, 10);
  const rang = cl.findIndex((l) => l.moi);
  console.log(`  ${cl.length} joueurs classés, le joueur humain est ${rang >= 0 ? `${rang + 1}e` : 'hors du top 10'}`);
  for (const l of cl.slice(0, 6)) {
    console.log(`   ${l.moi ? '🫵' : '  '} ${String(l.essais).padStart(2)} essais — ${l.nom} (${l.club})`);
  }
  const mien = cl.find((l) => l.moi);
  console.log('  ses chiffres sont bien les siens :', mien?.essais === 17 && mien?.plaquages === 74 ? '✅' : '❌');
  // Il ne doit pas apparaître deux fois (estimation + vrais chiffres).
  const doublons = classementJoueurs('top14', SAISON, journees, 'plaquages', joueur, undefined, 400)
    .filter((l) => l.nom === joueur.nom).length;
  console.log('  présent une seule fois :', doublons === 1 ? '✅' : `❌ ${doublons} fois`);
}

console.log('\n=== 5. DÉTERMINISME ===');
{
  const total = nombreJournees('prod2', '');
  const j = journeesALaSemaine('prod2', 44, total);
  const a = classementJoueurs('prod2', SAISON, j, 'essais', null, undefined, 5).map((l) => `${l.nom}:${l.essais}`);
  const b = classementJoueurs('prod2', SAISON, j, 'essais', null, undefined, 5).map((l) => `${l.nom}:${l.essais}`);
  console.log('  deux appels donnent le même classement :', a.join() === b.join() ? '✅' : '❌');
  console.log('  ', a.join(' · '));
}
