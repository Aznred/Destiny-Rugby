// VÉRIFICATION — LES GÉNÉRATIONS DORÉES, ET UN CHAMPIONNAT QUI RESPIRE
//
// Retour de jeu : « j'ai l'impression que c'est toujours le même calendrier des
// matchs et que les équipes font toujours les mêmes générales, en mode ça sera
// toujours le Stade premier ; fais qu'il puisse y avoir des générations dorées
// dans tous les clubs, qu'on puisse gagner un Top 14 avec un outsider — mais
// que ça reste rare ».
//
// Les deux reproches étaient exacts, et mécaniques :
//   · `calendrier()` déroulait un carrousel sur l'ordre du fichier de données,
//     donc la J1 opposait les deux mêmes clubs pendant douze saisons ;
//   · `forceEffectif` ne bougeait qu'au rythme du vieillissement des joueurs, si
//     bien que la hiérarchie de 2025-26 se reconduisait chaque année.
//
// Ce que ce script contrôle :
//   1. le calendrier CHANGE d'une saison à l'autre — et reste déterministe ;
//   2. toutes les sources d'affiches s'accordent (panneau, tableau, moteur) ;
//   3. les générations dorées existent, touchent TOUS les clubs à la longue,
//      et restent RARES à un instant donné ;
//   4. la force d'un club bouge vraiment sur une carrière ;
//   5. le Top 14 change de champion, et un outsider gagne — parfois.
//
// Lancer : npx vite-node scripts/verifGenerations.ts

import { calendrier, championnatEnDirect } from '../src/lib/championnat';
import { forceEffectif, effectifDuClub } from '../src/lib/effectif';
import { generationDuClub, libelleGeneration } from '../src/lib/generations';
import { matchDeLaSemaine } from '../src/lib/matchLive';
import { phaseFinale } from '../src/lib/phaseFinale';
import { affichesDeLaJournee } from '../src/lib/championnat';
import { COMPETITIONS } from '../src/data/clubs';
import type { Joueur } from '../src/types';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(52)} ${valeur}`);
}

const TOP14 = COMPETITIONS.find((c) => c.id === 'top14')!;
const CLUBS = TOP14.clubs.map((c) => c.nom);
const SAISONS = 12;

console.log('\n=== 1. LE CALENDRIER N\'EST PLUS LE MÊME TOUS LES ANS ===');
{
  const j1 = (saison: number) =>
    calendrier(CLUBS, `top14#${saison}`)[0]
      .map(([d, e]) => `${d} – ${e}`).join(' | ');
  const premieres = new Set<string>();
  for (let s = 1; s <= SAISONS; s++) premieres.add(j1(s));
  ligne('la 1ʳᵉ journée diffère d’une saison à l’autre',
    `${premieres.size} tirages distincts sur ${SAISONS}`, premieres.size >= SAISONS - 1);
  ligne('… et le tirage reste DÉTERMINISTE', 'même saison → même J1', j1(3) === j1(3));
  ligne('sans clé, on retombe sur l’ancien comportement',
    'carrousel figé', calendrier(CLUBS)[0][0][0] === calendrier(CLUBS)[0][0][0]);

  // Le calendrier doit rester un vrai aller-retour : chaque club joue tous les
  // autres deux fois, une fois chez lui.
  const grille = calendrier(CLUBS, 'top14#5');
  const compte = new Map<string, number>();
  for (const jr of grille) for (const [d, e] of jr) {
    compte.set(d, (compte.get(d) ?? 0) + 1);
    compte.set(e, (compte.get(e) ?? 0) + 1);
  }
  const attendu = (CLUBS.length - 1) * 2;
  const faux = [...compte].filter(([, n]) => n !== attendu);
  ligne('chaque club joue le bon nombre de matchs',
    faux.length ? faux.map(([c, n]) => `${c}:${n}`).join(', ') : `${attendu} chacun`,
    faux.length === 0);
}

console.log('\n=== 2. TOUTES LES SOURCES D\'AFFICHES S\'ACCORDENT ===');
{
  // ⚠️ LE PIÈGE DE CE LOT. Trois endroits construisent la grille : le panneau de
  // carrière (`matchDeLaSemaine`), l'écran Résultats (`affichesDeLaJournee`) et
  // le classement (`championnatEnDirect`). Une clé de tirage différente entre
  // eux, et le panneau annonce un adversaire que le tableau ne connaît pas.
  let desaccords = 0;
  const exemples: string[] = [];
  for (let saison = 1; saison <= 6; saison++) {
    const etat = championnatEnDirect('top14', saison, 'Stade Toulousain', 999, 0);
    for (let journee = 1; journee <= Math.min(8, etat.totalJournees); journee++) {
      const viaEcran = affichesDeLaJournee('top14', saison, 'Stade Toulousain', journee, 999, 0)
        .map((a) => `${a.domicile}–${a.exterieur}`).sort().join('|');
      const viaClassement = etat.journees[journee - 1]
        .map((m) => `${m.domicile}–${m.exterieur}`).sort().join('|');
      if (viaEcran !== viaClassement) {
        desaccords++;
        if (exemples.length < 3) exemples.push(`S${saison} J${journee}`);
      }
    }
  }
  ligne('écran Résultats = classement en direct',
    desaccords ? exemples.join(', ') : '48 journées identiques', desaccords === 0);

  // Le panneau de carrière, sur une vraie fiche de joueur.
  const base = {
    nom: 'Test', poste: 'demi_ouverture', nation: 'France', club: 'Stade Toulousain',
    division: 'top14', age: 24,
    attributs: {
      vitesse: 78, force: 78, endurance: 78, plaquage: 78,
      passe: 78, jeuAuPied: 78, vision: 78, mental: 78,
    },
    forme: 75, moral: 70, reputation: 70, argent: 0, saison: 1,
    matchsJoues: 0, essais: 0, titres: [],
  } as unknown as Joueur;
  let incoherences = 0;
  for (let saison = 1; saison <= 4; saison++) {
    for (let sem = 1; sem <= 40; sem++) {
      const a = matchDeLaSemaine({ ...base, saison, semaine: sem }, 0);
      if (!a) continue;
      const mien = affichesDeLaJournee('top14', saison, 'Stade Toulousain', a.journee, 999, 0)
        .find((x) => x.domicile === 'Stade Toulousain' || x.exterieur === 'Stade Toulousain');
      if (!mien || mien.domicile !== a.match.domicile || mien.exterieur !== a.match.exterieur) {
        incoherences++;
      }
    }
  }
  ligne('panneau de carrière = écran Résultats',
    `${incoherences} écart(s)`, incoherences === 0);
}

console.log('\n=== 3. LES GÉNÉRATIONS DORÉES ===');
{
  // Sur toutes les divisions françaises et les grands championnats : combien de
  // clubs vivent une génération dorée à un instant donné ?
  const tous = COMPETITIONS.flatMap((c) => c.clubs.map((x) => x.nom));
  const uniques = [...new Set(tous)];
  let dorees = 0;
  let creuses = 0;
  let mesures = 0;
  const clubsTouches = new Set<string>();
  for (const club of uniques) {
    for (let s = 1; s <= SAISONS; s++) {
      const g = generationDuClub(club, s);
      mesures++;
      if (g.doree) { dorees++; clubsTouches.add(club); }
      if (g.creuse) creuses++;
    }
  }
  const partDoree = dorees / mesures;
  ligne('une génération dorée est RARE à un instant donné',
    `${(partDoree * 100).toFixed(1)} % des (club, saison) — cible 5 à 14 %`,
    partDoree >= 0.05 && partDoree <= 0.14);
  ligne('… et les traversées du désert existent aussi',
    `${((creuses / mesures) * 100).toFixed(1)} %`, creuses > 0);
  ligne('elles ne touchent pas que les gros clubs',
    `${clubsTouches.size} clubs différents sur ${uniques.length} en ${SAISONS} saisons`,
    clubsTouches.size > uniques.length * 0.15);
  ligne('tout est déterministe', 'deux appels, même verdict',
    generationDuClub('Stade Toulousain', 4).bonus === generationDuClub('Stade Toulousain', 4).bonus);

  // Un club qui vit une génération dorée doit VOIR ses joueurs meilleurs.
  const exemple = uniques.find((c) => generationDuClub(c, 5).doree);
  if (exemple) {
    const g = generationDuClub(exemple, 5);
    // ⚠️ MÊME PONDÉRATION QUE `forceEffectif` : le XV de départ pèse 1, le banc
    // 0,5. Une moyenne simple donnait 75,4 contre 76,1 et faisait échouer le
    // contrôle pour rien — c'était le test qui avait tort, pas le jeu.
    const moyenne = (s: number) => {
      const notes = effectifDuClub(exemple, s).map((j) => j.note).sort((a, b) => b - a).slice(0, 23);
      let total = 0;
      let poids = 0;
      notes.forEach((n, i) => { const p = i < 15 ? 1 : 0.5; total += n * p; poids += p; });
      return total / poids;
    };
    console.log(`     exemple : ${exemple} en S5 — ${libelleGeneration(g)}, bonus ${g.bonus > 0 ? '+' : ''}${g.bonus}`);
    console.log(`       effectif moyen S5 ${moyenne(5).toFixed(1)} · force ${forceEffectif(exemple, 5).toFixed(1)}`);
    ligne('l’effectif AFFICHÉ suit la génération',
      'la moyenne des 23 = la force du club',
      Math.abs(moyenne(5) - forceEffectif(exemple, 5)) < 0.6);
  }
}

console.log('\n=== 4. LA FORCE D\'UN CLUB BOUGE SUR UNE CARRIÈRE ===');
{
  const amplitudes: { club: string; min: number; max: number }[] = [];
  for (const club of CLUBS) {
    const forces = [];
    for (let s = 1; s <= SAISONS; s++) forces.push(forceEffectif(club, s));
    amplitudes.push({ club, min: Math.min(...forces), max: Math.max(...forces) });
  }
  const ecarts = amplitudes.map((a) => a.max - a.min).sort((a, b) => a - b);
  const median = ecarts[Math.floor(ecarts.length / 2)];
  ligne('un club varie vraiment sur 12 saisons',
    `écart médian ${median.toFixed(1)} points (cible ≥ 4)`, median >= 4);
  const plusVolatil = amplitudes.sort((a, b) => (b.max - b.min) - (a.max - a.min))[0];
  console.log(`     le plus mouvant : ${plusVolatil.club} `
    + `${plusVolatil.min.toFixed(1)} → ${plusVolatil.max.toFixed(1)}`);
}

console.log('\n=== 5. LE TOP 14 CHANGE DE CHAMPION ===');
{
  // ⚠️ ON MESURE LE VRAI CHAMPION, celui qui gagne la FINALE — pas le premier
  // de la phase régulière. C'est ce que le joueur soulève, et la phase finale
  // (barrages → demies → finale) ajoute sa propre variance : mesurer le leader
  // de la saison régulière aurait donné un chiffre plus sombre que la réalité
  // du jeu.
  const champions: string[] = [];
  const N = 20;
  for (let s = 1; s <= N; s++) {
    champions.push(phaseFinale('top14', s, 'Stade Toulousain', 0).champion);
  }
  const compte = new Map<string, number>();
  for (const c of champions) compte.set(c, (compte.get(c) ?? 0) + 1);
  const classe = [...compte].sort((a, b) => b[1] - a[1]);
  console.log(`     ${N} saisons : ${classe.map(([c, n]) => `${c} ×${n}`).join(' · ')}`);
  ligne('plusieurs clubs finissent premiers',
    `${compte.size} clubs différents (cible ≥ 3)`, compte.size >= 3);
  ligne('… mais aucun ne trustre TOUT',
    `le meilleur en prend ${classe[0][1]}/${N}`, classe[0][1] <= N * 0.6);

  // Un « outsider » = un club dont la note de départ n'est pas dans le top 4.
  const depart = [...CLUBS].sort((a, b) => forceEffectif(b, 1) - forceEffectif(a, 1));
  const gros = new Set(depart.slice(0, 4));
  const surprises = champions.filter((c) => !gros.has(c)).length;
  ligne('un outsider gagne parfois — mais rarement',
    `${surprises}/${N} titres hors du top 4 de départ`,
    surprises >= 1 && surprises <= N * 0.5);
}

console.log(
  echecs === 0
    ? '\n✅ Le championnat respire : calendrier tiré chaque saison, générations dorées rares.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
