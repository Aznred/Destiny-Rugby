// BANC D'ESSAI DU MATCH EN FIL — la mécanique refaite, mesurée sans navigateur
//
// Demande : « refais la mécanique de match totalement, que ce soit super facile
// et fun à prendre en main sur n'importe quel appareil, super ludique », avec le
// format décrit juste avant : des blocs de deux à quatre actions, chaque ligne
// en `[minute'] [emoji] [phrase]`, centrée sur son joueur, qui s'arrête sur un
// moment décisif et attend la décision.
//
// Ce que ce script vérifie, et qu'aucun autre ne pouvait :
//   1. chaque type d'action a son emoji — une ligne sans emoji casse
//      l'alignement de tout le fil ;
//   2. les blocs font bien deux à quatre lignes, et le match va au bout ;
//   3. le joueur incarné apparaît assez souvent dans SON fil (sinon on lit le
//      match des autres) ;
//   4. combien de temps un match prend vraiment, blocs et décisions compris ;
//   5. la position du ballon est lisible et orientée du bon côté ;
//   6. et surtout : LE SCORE RESTE CELUI DE LA LIGUE.
//
//   npx vite-node scripts/verifFil.ts

import { avancer, bilan, creerMatch, ordonner, type EtatMatch } from '../src/lib/moteur/moteur';
import { jouerRencontre } from '../src/lib/championnat';
import { effectifDuClub } from '../src/lib/effectif';
import { decisionPour } from '../src/lib/moteur/decisions';
import {
  BLOC_MAX, BLOC_MIN, EMOJI_ACTION, avanceeDuBallon, filComplet, habiller, jouerUnBloc,
} from '../src/lib/moteur/fil';
import type { TypeCommentaire } from '../src/lib/moteur/etat';

let echecs = 0;
function ligne(nom: string, valeur: string | number, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(46)} ${valeur}`);
}

const A = 'Stade Toulousain';
const B = 'Stade Rochelais';
const effA = effectifDuClub(A, 1);
const effB = effectifDuClub(B, 1);
const AVATAR = {
  club: A,
  nom: 'Pilote Essai',
  poste: 'demi_ouverture' as const,
  attributs: {
    vitesse: 78, force: 66, endurance: 80, plaquage: 62,
    passe: 80, jeuAuPied: 76, vision: 78, mental: 72,
  },
  titulaire: true,
};

function nouveauMatch(cle: string): { e: EtatMatch; scoreD: number; scoreE: number } {
  const m = jouerRencontre(A, B, 1, cle, null);
  const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle, AVATAR,
    { niveau: 'pro', controle: true });
  return { e, scoreD: m.scoreD, scoreE: m.scoreE };
}

/** Rejoue un match comme l'écran : bloc par bloc, en répondant aux cartes. */
function jouerAuFil(cle: string) {
  const { e, scoreD, scoreE } = nouveauMatch(cle);
  let derniere = 0;
  let blocs = 0;
  let cartes = 0;
  let bagarres = 0;
  const tailles: number[] = [];
  let garde = 0;

  while (!e.fini && garde++ < 4000) {
    const r = jouerUnBloc(e, (etat) =>
      decisionPour(etat, etat.pions.find((p) => p.moi), etat.sim - derniere) !== null);
    if (r.produites > 0) { blocs++; tailles.push(r.produites); }
    if (r.raison === 'decision') {
      derniere = e.sim;
      cartes++;
      // L'écran arme un geste puis reprend : ici on relâche simplement, ce qui
      // est le cas le plus défavorable (le moteur joue son rugby automatique).
      continue;
    }
    if (r.raison === 'bagarre') {
      bagarres++;
      // Comme l'écran : on donne un ordre pour que le match reparte.
      ordonner(e, 'reculer');
      avancer(e, 1);
    }
  }
  return { e, scoreD, scoreE, blocs, cartes, bagarres, tailles };
}

// ═══ 1. CHAQUE ACTION A SON EMOJI ═══════════════════════════════════════════
console.log('=== 1. AUCUNE LIGNE SANS EMOJI ===');
{
  const TYPES: TypeCommentaire[] = [
    'essai', 'but', 'butRate', 'plaquage', 'franchissement', 'ruck', 'melee',
    'touche', 'maul', 'pied', 'penalite', 'carton', 'remplacement', 'jalon', 'jeu',
  ];
  const sans = TYPES.filter((t) => !EMOJI_ACTION[t]);
  ligne('les 15 types ont un emoji', sans.length ? sans.join(', ') : `${TYPES.length} types`,
    sans.length === 0);

  // ⚠️ ET LE SCORE NE S'AFFICHE QUE QUAND IL BOUGE. Le répéter à chaque ligne
  // ferait un fil de chiffres où l'essai ne se remarque plus.
  const c = (scoreA: number, scoreB: number) => ({
    minute: 10, texte: 'x', type: 'jeu' as const, cote: 'A' as const,
    points: 0, scoreA, scoreB,
  });
  ligne('le score ne s’affiche que s’il change',
    `${habiller(c(7, 0), 1, c(0, 0)).score} puis ${habiller(c(7, 0), 2, c(7, 0)).score}`,
    habiller(c(7, 0), 1, c(0, 0)).score === '7 - 0' && habiller(c(7, 0), 2, c(7, 0)).score === null);
}

// ═══ 2. LES BLOCS, ET LE MATCH QUI VA AU BOUT ═══════════════════════════════
console.log('\n=== 2. DES BLOCS DE 2 À 4 ACTIONS ===');
{
  const r = jouerAuFil('fil#1');
  const trop = r.tailles.filter((n) => n > BLOC_MAX + 2).length;
  const moyenne = r.tailles.reduce((a, b) => a + b, 0) / Math.max(1, r.tailles.length);

  console.log(`  ${'blocs par match'.padEnd(46)} ${r.blocs}`);
  console.log(`  ${'lignes au total'.padEnd(46)} ${r.e.commentaires.length}`);
  ligne('le match va au bout', `${r.e.scoreA}-${r.e.scoreB} · ${r.e.minute}′`, r.e.fini);
  ligne(`taille moyenne d’un bloc (≥ ${BLOC_MIN})`, moyenne.toFixed(1), moyenne >= BLOC_MIN);
  // ⚠️ Un bloc peut dépasser quatre : une phase arrêtée raconte parfois trois
  // choses dans le même pas de simulation. On refuse le PAVÉ, pas le débord.
  ligne('aucun bloc n’est un pavé (≤ 6)', `${trop} au-dessus`, trop === 0);
  ligne('assez de blocs pour un match (40 à 140)', r.blocs, r.blocs >= 40 && r.blocs <= 140);
}

// ═══ 3. LE FIL PARLE DE MON JOUEUR ══════════════════════════════════════════
console.log('\n=== 3. C’EST MON MATCH, PAS CELUI DES AUTRES ===');
{
  const r = jouerAuFil('fil#2');
  const lignes = filComplet(r.e);
  const miennes = lignes.filter((l) => l.moi).length;
  const fortes = lignes.filter((l) => l.fort).length;
  console.log(`  ${'lignes qui me concernent'.padEnd(46)} ${miennes} sur ${lignes.length}`);
  // Un ouvreur titulaire touche le ballon quarante fois : s'il n'apparaît pas
  // dans son propre fil, c'est qu'on regarde le match de quelqu'un d'autre.
  ligne('mon joueur apparaît dans son fil (≥ 8)', miennes, miennes >= 8);
  ligne('des faits marquants signalés (≥ 6)', fortes, fortes >= 6);
}

// ═══ 4. COMBIEN DE TEMPS ÇA PREND VRAIMENT ══════════════════════════════════
console.log('\n=== 4. UN MATCH TIENT DANS UNE PAUSE CAFÉ ===');
{
  const N = 3;
  let blocs = 0;
  let cartes = 0;
  for (let i = 0; i < N; i++) {
    const r = jouerAuFil(`duree#${i}`);
    blocs += r.blocs;
    cartes += r.cartes;
  }
  const bMoy = blocs / N;
  const cMoy = cartes / N;
  // Le rythme de l'écran : 1,15 s par bloc, plus ~6 s de réflexion par carte.
  const minutes = (bMoy * 1.15 + cMoy * 6) / 60;
  console.log(`  ${'blocs · cartes par match'.padEnd(46)} ${bMoy.toFixed(0)} · ${cMoy.toFixed(0)}`);
  console.log(`  ${'dont'.padEnd(46)} ${(bMoy * 1.15 / 60).toFixed(1)} min de lecture · ${(cMoy * 6 / 60).toFixed(1)} min de choix`);
  ligne('un match en 2 à 8 minutes', `${minutes.toFixed(1)} min`, minutes >= 2 && minutes <= 8);
  ligne('assez de décisions pour jouer (≥ 8)', cMoy.toFixed(0), cMoy >= 8);
}

// ═══ 5. LA POSITION DU BALLON ═══════════════════════════════════════════════
console.log('\n=== 5. LA BARRE DE TERRAIN DIT OÙ ON EN EST ===');
{
  const { e } = nouveauMatch('ballon#1');
  let hors = 0;
  let min = 1;
  let max = 0;
  for (let i = 0; i < 400 && !e.fini; i++) {
    avancer(e, 1.5);
    const a = avanceeDuBallon(e, 'A');
    if (a < 0 || a > 1) hors++;
    min = Math.min(min, a);
    max = Math.max(max, a);
    // ⚠️ LES DEUX CAMPS VOIENT LEUR EN-BUT ADVERSE À DROITE : sans ce
    // retournement, la barre dirait « on pilonne » quand on défend, un match
    // sur deux.
    if (Math.abs(avanceeDuBallon(e, 'B') - (1 - a)) > 1e-9) hors++;
  }
  ligne('toujours entre 0 et 1', `${hors} sortie(s)`, hors === 0);
  ligne('le ballon parcourt le terrain', `${(min * 100).toFixed(0)} % → ${(max * 100).toFixed(0)} %`,
    min < 0.3 && max > 0.7);
}

// ═══ 6. LE SCORE RESTE CELUI DE LA LIGUE ════════════════════════════════════
console.log('\n=== 6. ⚠️ LE SCORE NE BOUGE PAS D’UN POINT ===');
{
  let ecarts = 0;
  const N = 6;
  for (let i = 0; i < N; i++) {
    const r = jouerAuFil(`score#${i}`);
    const b = bilan(r.e);
    if (b.scoreA !== r.scoreD || b.scoreB !== r.scoreE) ecarts++;
  }
  // C'est LA garantie du projet : la surface change, la simulation non. Le
  // classement, les montées et les coupes lisent le même score qu'avant.
  ligne('score du fil == score de la ligue', `${ecarts} écart(s) sur ${N}`, ecarts === 0);
}

console.log(echecs === 0
  ? '\n✅ Le fil raconte le match du joueur, par blocs, et n’invente pas un point.'
  : `\n❌ ${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
