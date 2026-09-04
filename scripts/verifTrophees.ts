// VÉRIFICATION — LES TROPHÉES
//
// Demande : « rajoute toutes les coupes à chacune des bonnes compétitions ».
// Les lots de `sources/modeles/trophees/` ont été compressés et branchés ; ce script
// vérifie qu'aucun maillon ne manque entre le fichier sur le disque, l'entrée de
// `data/trophees.ts` et la compétition qui le décerne.
//
// Il contrôle cinq choses :
//   1. chaque trophée pointe un `.glb` qui existe VRAIMENT dans public/m3d/
//      (un chemin faux ne se voit qu'au moment de la cérémonie, trop tard) ;
//   2. chaque modèle reste au poids des trophées historiques (les fichiers
//      livrés faisaient jusqu'à 49 Mo) ;
//   3. chaque compétition de `COMPETITIONS` décerne un titre, et chaque titre
//      décerné existe ;
//   4. le Rugby Europe Championship est bien branché sur ses nations ;
//   5. aucun modèle livré n'a été oublié en route.
//
// Lancer : npx vite-node scripts/verifTrophees.ts

import fs from 'node:fs';
import path from 'node:path';
import {
  TROPHEES, TROPHEE_PAR_DIVISION, TROPHEE_PAR_COUPE, TROPHEE_PAR_INTERNATIONAL,
  NATIONS_REC, NATIONS_6N,
} from '../src/data/trophees';
import { COMPETITIONS } from '../src/data/clubs';
import {
  COMPETITIONS_INTERNATIONALES, COUPE_DU_MONDE, competitionsNouvellesNations,
} from '../src/lib/international';

// Le repère est le parc EXISTANT, pas un chiffre rond : les trophées d'origine
// vont de 739 Ko (six-nations) à 2 191 Ko (mlr). Un modèle qui dépasse ce
// plafond est reparti non compressé — les fichiers livrés font 9 à 49 Mo.
const POIDS_MAX = 2200 * 1024;
// Les pseudo-compétitions : des vitrines, pas des championnats. Elles n'ont ni
// classement ni calendrier — donc pas de champion, donc pas de trophée.
const SANS_TITRE = new Set(['invitesEurope']);

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(46)} ${valeur}`);
}

console.log('=== 1. CHAQUE TROPHÉE A SON MODÈLE 3D ===');
{
  const absents = Object.values(TROPHEES).filter((t) => !fs.existsSync(path.join('public', t.modele)));
  ligne('modèles présents dans public/m3d/',
    `${Object.keys(TROPHEES).length - absents.length}/${Object.keys(TROPHEES).length}`
    + (absents.length ? ` — manquants : ${absents.map((t) => t.modele).join(', ')}` : ''),
    absents.length === 0);
}

console.log('\n=== 2. LES MODÈLES SONT AU POIDS DES ANCIENS ===');
{
  const poids = Object.values(TROPHEES)
    .map((t) => ({ id: t.id, o: fs.existsSync(path.join('public', t.modele)) ? fs.statSync(path.join('public', t.modele)).size : 0 }))
    .filter((p) => p.o > 0);
  const lourds = poids.filter((p) => p.o > POIDS_MAX);
  const total = poids.reduce((a, p) => a + p.o, 0);
  const plusLourd = poids.reduce((a, p) => (p.o > a.o ? p : a), poids[0]);
  ligne('aucun modèle au-dessus de 2,2 Mo',
    `plus lourd : ${plusLourd.id} (${(plusLourd.o / 1024).toFixed(0)} Ko)`
    + (lourds.length ? ` — ${lourds.map((l) => l.id).join(', ')}` : ''),
    lourds.length === 0);
  ligne('poids total des trophées', `${(total / 1024 / 1024).toFixed(1)} Mo pour ${poids.length} modèles`, true);
}

console.log('\n=== 3. CHAQUE COMPÉTITION DÉCERNE UN TITRE ===');
{
  const sans = COMPETITIONS.filter((c) => !TROPHEE_PAR_DIVISION[c.id] && !SANS_TITRE.has(c.id));
  ligne('compétitions récompensées',
    `${COMPETITIONS.filter((c) => TROPHEE_PAR_DIVISION[c.id]).length}/${COMPETITIONS.length}`
    + (sans.length ? ` — sans titre : ${sans.map((c) => c.id).join(', ')}` : ''),
    sans.length === 0);

  const inconnus = Object.entries(TROPHEE_PAR_DIVISION).filter(([, id]) => !TROPHEES[id]);
  ligne('trophées cités qui existent',
    inconnus.length ? inconnus.map(([d, i]) => `${d}→${i}`).join(', ') : 'tous',
    inconnus.length === 0);

  // Une clé qui ne correspond à aucune compétition ne se déclenchera jamais :
  // c'est un trophée mort, et rien ne le signale en jeu.
  const orphelines = Object.keys(TROPHEE_PAR_DIVISION).filter((d) => !COMPETITIONS.some((c) => c.id === d));
  ligne('divisions citées qui existent',
    orphelines.length ? orphelines.join(', ') : 'toutes', orphelines.length === 0);

  const coupesKo = Object.entries(TROPHEE_PAR_COUPE).filter(([, id]) => !TROPHEES[id]);
  ligne('coupes d’Europe branchées',
    `${Object.keys(TROPHEE_PAR_COUPE).length} coupes`, coupesKo.length === 0);
}

console.log('\n=== 4. LES TITRES DE SÉLECTION ===');
{
  ligne('Tournoi des 6 Nations', `${NATIONS_6N.length} nations`, NATIONS_6N.length === 6);
  ligne('Rugby Europe Championship', NATIONS_REC.join(', ') || 'aucune', NATIONS_REC.length >= 6);
  // Un joueur ne doit pas pouvoir gagner les deux : les listes sont disjointes.
  const double = NATIONS_REC.filter((n) => NATIONS_6N.includes(n));
  ligne('aucune nation dans les deux tournois',
    double.length ? double.join(', ') : 'aucune', double.length === 0);

  // Certaines compétitions consultables n'ont volontairement pas de trophée :
  // tournées, compétitions de développement et doublon de données du Rugby
  // Championship. Un trophée n'est branché que lorsqu'un modèle 3D existe.
  const sansTitre = new Set([
    'autumn', 'amicaux', 'sixNationsU20', 'americasPacific', 'autumnCup',
    'tbilisiCup', 'trcMonde', 'trcU20Monde', 'u20Trophy',
  ]);
  const competitions = [
    ...COMPETITIONS_INTERNATIONALES,
    ...competitionsNouvellesNations(),
    COUPE_DU_MONDE,
  ];
  const manquantes = competitions
    .filter((c) => !sansTitre.has(c.id) && !TROPHEE_PAR_INTERNATIONAL[c.id]);
  ligne('compétitions internationales récompensées',
    `${competitions.length - sansTitre.size - manquantes.length}/${competitions.length - sansTitre.size}`
    + (manquantes.length ? ` — manquantes : ${manquantes.map((c) => `${c.id} (${c.nom})`).join(', ')}` : ''),
    manquantes.length === 0);

  const inconnus = Object.entries(TROPHEE_PAR_INTERNATIONAL)
    .filter(([, id]) => !TROPHEES[id]);
  ligne('trophées internationaux cités qui existent',
    inconnus.length ? inconnus.map(([c, t]) => `${c}→${t}`).join(', ') : 'tous',
    inconnus.length === 0);
}

console.log('\n=== 5. AUCUN MODÈLE LIVRÉ OUBLIÉ ===');
{
  // Un lot livré = un dossier de `.glb` bruts et la liste des trophées qu'il
  // doit alimenter (`scripts/copierTrophees.cjs`). Un modèle qui reste sur le
  // disque sans être branché, c'est un trophée qui n'existe pas en jeu.
  const utilises = new Set(Object.values(TROPHEES).map((t) => path.basename(t.modele, '.glb')));
  const LOTS: [string, string[]][] = [
    // 20 modèles → 20 trophées (le 21ᵉ, Championship Cup, réutilise
    // volontairement le modèle de la Premiership Rugby Cup).
    ['sources/modeles/trophees/championnats', ['bundesliga', 'currieCup', 'ecosseSuper', 'espagne', 'finlande', 'gallesSRC',
      'gallesPrem', 'gallesChall', 'georgie', 'irlandeAIL', 'argentine', 'paysBas', 'nzHeartland',
      'pologne', 'portugal', 'tcheque', 'roumanie', 'russie', 'italie', 'recEurope']],
    // Les honneurs individuels, plus les deux modèles relivrés en correction
    // (le trophée allemand et celui du meilleur joueur du monde).
    ['sources/modeles/trophees/honneurs', ['bundesliga', 'meilleur-joueur', 'meilleurTop14',
      'meilleurPremiership', 'meilleurUrc', 'meilleurNZ', 'meilleurChampionsCup',
      'meilleurSixNations', 'hommeDuMatchMonde']],
    ['sources/modeles/trophees/internationaux', ['americasChamp', 'oceaniaCup',
      'recTrophyConference', 'rugbyChampionship', 'nationsCup', 'pacificChallenge', 'mondialU20']],
  ];
  for (const [dossier, branches] of LOTS) {
    const livres = fs.existsSync(dossier)
      ? fs.readdirSync(dossier).filter((f) => f.toLowerCase().endsWith('.glb'))
      : [];
    const manquants = branches.filter((b) => !utilises.has(b));
    ligne(`modèles branchés — ${dossier}/`,
      `${branches.length - manquants.length}/${branches.length}`
      + (livres.length ? ` (${livres.length} fichiers livrés)` : ' (dossier source absent)')
      + (manquants.length ? ` — manquants : ${manquants.join(', ')}` : ''),
      manquants.length === 0);
    // ⚠️ ET LA CORRECTION EST-ELLE VRAIMENT PARTIE ? Un modèle relivré doit être
    // PLUS RÉCENT dans public/m3d/ que dans le dossier source, sinon la version
    // embarquée est encore l'ancienne — et rien ne le dirait à l'écran.
    for (const b of branches) {
      const src = livres.map((f) => path.join(dossier, f))
        .filter((f) => fs.statSync(f).size > 0);
      if (!src.length) break;
      const cible = path.join('public', 'm3d', `${b}.glb`);
      if (!fs.existsSync(cible)) continue;
      const plusRecent = src.some((f) => fs.statSync(f).mtimeMs > fs.statSync(cible).mtimeMs
        && path.basename(f, '.glb').toLowerCase().includes(b.slice(0, 6).toLowerCase()));
      if (plusRecent) ligne(`  ${b} : source plus récente que l’embarqué`, 'relancer copierTrophees.cjs', false);
    }
  }
}

console.log(echecs === 0 ? '\n✅ Trophées conformes.' : `\n❌ ${echecs} contrôle(s) en échec.`);
