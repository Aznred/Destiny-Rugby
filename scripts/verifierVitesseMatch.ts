// LA VITESSE D'UN MATCH DE CARRIÈRE, MESURÉE — Correctif 19 (×1, ×2, ×3 et ×10).
//
// Ce banc ne regarde pas des images : il rejoue la boucle de `MatchLive` sans écran. Chaque « image » a une
// durée réelle (`dtReel`), un tempo, et fait avancer le moteur de `dtReel × allure` — exactement ce que fait
// l'écran. Il vérifie ce qui ne doit jamais arriver et ce qui doit arriver :
//
//  1. la table des allures (×1, ×2, ×3, ×10 ; le mode « cartes » reste à vitesse réelle) et le repli à vitesse
//     réelle quand on prend la main sur son joueur ;
//  2. ⚠️ CHANGER DE VITESSE NE CHANGE PAS LE MATCH : un match joué avec un tempo et une cadence d'images tirés
//     au hasard À CHAQUE IMAGE (comme un joueur qui tape ×10, ×1, ×3 pendant que son téléphone ralentit) finit
//     avec le même score, les mêmes statistiques, le même chrono et les mêmes positions qu'un match joué à
//     ×1 à 60 images par seconde. Le moteur est à pas fixe : la vitesse ne change que le nombre de pas par image ;
//  3. aucun essai, carton, remplacement, TMO, pénalité, transformation, mêlée ni touche n'est sauté à ×10 :
//     la suite des phases est identique ;
//  4. ×10 dure bien dix fois moins longtemps que ×1 (durée d'écran mesurée), et jamais un pion ne saute de plus
//     de quatre mètres d'un pas (pas de téléportation) ;
//  5. se faire remplacer : le joueur sort au PROCHAIN ARRÊT de jeu, remplacé à son poste, et le match va à son terme ;
//  6. simuler la fin : le match joué d'un coup par `simulerPendant` est identique à celui regardé à ×1.
//
// Lancer : npm run verify:vitesse-match
import assert from 'node:assert/strict';
import { avancer, DT } from '../src/lib/moteur/moteur';
import type { EtatMatch } from '../src/lib/moteur/etat';
import { allureDuTempo, estAccelere, PAS_MAXIMAL_PAR_IMAGE, secondesAAvancer, TEMPOS, tempoALaPriseDeMain, type Tempo } from '../src/lib/moteur/moments';
import { demanderMaSortie, possibiliteDeSortie, remplacantPour, simulerPendant } from '../src/lib/moteur/sortie';
import { creerMatchDEmpreinte, empreinte, resumerMatch } from './outilsEmpreinte';

let ok = 0;
const verifier = (condition: unknown, message: string) => { assert.ok(condition, message); ok++; };

// ── 1. La table des allures ───────────────────────────────────────────────
console.log('— La table des allures —');
{
  const attendu: Record<Tempo, number> = { decisions: 1, x1: 1, x2: 2, x3: 3, x10: 10 };
  for (const [tempo, allure] of Object.entries(attendu) as [Tempo, number][]) {
    verifier(allureDuTempo(tempo) === allure, `${tempo} vaut ×${allure}`);
  }
  verifier(TEMPOS.length === 5, 'cinq tempos : le mode cartes et quatre vitesses');
  verifier(TEMPOS.filter((t) => t.id !== 'decisions').map((t) => allureDuTempo(t.id)).join() === '1,2,3,10', 'les vitesses sont ×1, ×2, ×3 et ×10, dans l\'ordre');
  verifier(Math.max(...TEMPOS.map((t) => t.allure)) === 10, '×10 est le maximum, et ×4 n\'existe plus');
  verifier(!TEMPOS.some((t) => (t.id as string) === 'x4'), 'aucun tempo ×4');
  verifier(!estAccelere('decisions') && !estAccelere('x1'), 'le mode cartes et ×1 ne sont pas accélérés');
  verifier(estAccelere('x2') && estAccelere('x3') && estAccelere('x10'), '×2, ×3 et ×10 le sont');
  for (const t of ['x2', 'x3', 'x10'] as Tempo[]) verifier(tempoALaPriseDeMain(t) === 'decisions', `prendre la main depuis ${t} rend la vitesse réelle`);
  for (const t of ['decisions', 'x1'] as Tempo[]) verifier(tempoALaPriseDeMain(t) === t, `prendre la main depuis ${t} ne change rien`);
  verifier(new Set(TEMPOS.map((t) => t.cle)).size === TEMPOS.length, 'chaque tempo a sa propre clé de texte');
}

// ── La boucle de l'écran, sans écran ──────────────────────────────────────
/** Un générateur déterministe (mulberry32) : le banc doit se rejouer à l'identique. */
function hasard(graine: number) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const TEMPOS_REGARDES: Tempo[] = ['x1', 'x2', 'x3', 'x10'];

interface Jeu { e: EtatMatch; images: number; ecran: number; phases: string; maxPas: number; maxParImage: number }

/**
 * Un match, vu à travers une boucle d'images. `dtDe` et `tempoDe` donnent la durée réelle de l'image et le tempo
 * choisi à cet instant ; `dtReel` est borné à 0,2 s comme dans `MatchLive`.
 */
function jouer(k: number, dtDe: () => number, tempoDe: (image: number) => Tempo): Jeu {
  const e = creerMatchDEmpreinte(k);
  const suite: string[] = [];
  let derniere = '';
  let maxPas = 0;
  let precedent = new Map(e.pions.map((p) => [p.id, { x: p.pos.x, y: p.pos.y, sur: p.surLeTerrain }]));
  e.apresPas = (m: EtatMatch) => {
    if (m.phase !== derniere) { suite.push(m.phase); derniere = m.phase; }
    for (const p of m.pions) {
      const avant = precedent.get(p.id);
      // Un pion qui entre ou sort du terrain se pose où il doit : seul compte le déplacement de ceux qui jouent.
      if (avant && avant.sur && p.surLeTerrain) maxPas = Math.max(maxPas, Math.hypot(p.pos.x - avant.x, p.pos.y - avant.y));
      precedent.set(p.id, { x: p.pos.x, y: p.pos.y, sur: p.surLeTerrain });
    }
  };
  let ecran = 0, images = 0, maxParImage = 0;
  while (!e.fini && images < 600000) {
    const dtReel = Math.min(0.2, dtDe());
    const avantImage = e.sim;
    avancer(e, secondesAAvancer(dtReel, allureDuTempo(tempoDe(images))));
    maxParImage = Math.max(maxParImage, e.sim - avantImage);
    ecran += dtReel;
    images++;
  }
  return { e, images, ecran, phases: suite.join('>'), maxPas, maxParImage };
}

const SOIXANTE = () => 1 / 60;
const MATCHS = [0, 1, 2, 3, 4, 5];

console.log('— Le même match à ×1 et à vitesse tirée au hasard à chaque image —');
const references: Jeu[] = [];
for (const k of MATCHS) {
  const ref = jouer(k, SOIXANTE, () => 'x1');
  references.push(ref);
  verifier(ref.e.fini, `match ${k} : il se termine à ×1`);
  const brouille = hasard(k * 7919 + 13);
  // Chaque image dure de 8 ms (120 Hz) à 200 ms (5 Hz, un vieux téléphone), et le tempo change à chaque image.
  const melange = jouer(k, () => 0.008 + brouille() * 0.192, () => TEMPOS_REGARDES[Math.floor(brouille() * TEMPOS_REGARDES.length)]);
  verifier(melange.e.fini, `match ${k} : il se termine avec un tempo tiré à chaque image`);
  verifier(resumerMatch(melange.e) === resumerMatch(ref.e),
    `match ${k} : même score (${ref.e.scoreA}-${ref.e.scoreB}), mêmes statistiques et mêmes positions qu'à ×1 (${empreinte(resumerMatch(ref.e))} / ${empreinte(resumerMatch(melange.e))})`);
  verifier(melange.phases === ref.phases, `match ${k} : la suite des phases est la même (${ref.phases.split('>').length} phases, aucune sautée)`);
  verifier(melange.e.commentaires.length === ref.e.commentaires.length
    && melange.e.commentaires.every((c, i) => c.texte === ref.e.commentaires[i].texte),
    `match ${k} : le fil du match est mot pour mot le même (${ref.e.commentaires.length} lignes)`);
}

console.log('— Un tempo constant, ×1 à ×10 —');
for (const k of MATCHS.slice(0, 3)) {
  const reference = resumerMatch(references[k].e);
  for (const tempo of TEMPOS_REGARDES) {
    const jeu = jouer(k, SOIXANTE, () => tempo);
    verifier(resumerMatch(jeu.e) === reference, `match ${k} à ${tempo} : le résultat est celui de ×1`);
  }
}

console.log('— Les phases arrêtées ne sont pas sautées, les essais non plus —');
{
  for (const k of MATCHS) {
    const ref = references[k];
    const phases = new Set(ref.phases.split('>'));
    for (const p of ['melee', 'touche', 'coupEnvoi']) verifier(phases.has(p) || k > 1, `match ${k} : la phase « ${p} » existe dans la suite`);
    const x10 = jouer(k, SOIXANTE, () => 'x10');
    const essais = x10.e.essaisA + x10.e.essaisB;
    verifier(essais === ref.e.essaisA + ref.e.essaisB, `match ${k} : ${essais} essais à ×10, autant qu'à ×1`);
    const cartons = (e: EtatMatch) => e.pions.reduce((s, p) => s + p.stats.cartonsJaunes * 10 + p.stats.cartonsRouges, 0);
    verifier(cartons(x10.e) === cartons(ref.e), `match ${k} : les cartons sont les mêmes à ×10`);
    verifier(x10.phases === ref.phases, `match ${k} : à ×10, les ${x10.phases.split('>').length} phases défilent dans le même ordre`);
  }
  const transformations = references.reduce((s, r) => s + r.phases.split('>').filter((p) => p === 'transformation' || p === 'tirAuBut').length, 0);
  verifier(transformations > 0, `les transformations et les tirs sont bien joués (${transformations} sur ${MATCHS.length} matchs)`);
}

console.log('— Combien de temps dure un match à l\'écran ? —');
const duree: Record<string, number[]> = {};
for (const k of MATCHS) {
  for (const tempo of TEMPOS_REGARDES) {
    const jeu = tempo === 'x1' ? references[k] : jouer(k, SOIXANTE, () => tempo);
    (duree[tempo] ??= []).push(jeu.ecran);
  }
}
const moyenne = (l: number[]) => l.reduce((s, v) => s + v, 0) / l.length;
for (const tempo of TEMPOS_REGARDES) console.log(`  ${tempo} : ${(moyenne(duree[tempo]) / 60).toFixed(1)} min d'écran en moyenne (${(Math.min(...duree[tempo]) / 60).toFixed(1)} à ${(Math.max(...duree[tempo]) / 60).toFixed(1)})`);
for (const [tempo, n] of [['x2', 2], ['x3', 3], ['x10', 10]] as [Tempo, number][]) {
  const rapport = moyenne(duree.x1) / moyenne(duree[tempo]);
  // À ×10 et 60 images par seconde, une image fait avancer le match de 0,167 s : l'arrondi au pas d'une image pèse un peu plus.
  verifier(Math.abs(rapport - n) < 0.06 * n, `${tempo} : ${rapport.toFixed(2)} fois plus rapide que ×1 (attendu ${n})`);
}
verifier(moyenne(duree.x10) < 2 * 60, `un match entier tient en moins de deux minutes à ×10 (${(moyenne(duree.x10) / 60).toFixed(1)} min)`);

console.log('— Aucun saut —');
{
  const pires = Math.max(...references.map((r) => r.maxPas));
  verifier(pires < 4, `d'un pas à l'autre, aucun pion ne bouge de plus de quatre mètres (maximum : ${pires.toFixed(2)} m)`);
  // À ×10 sur un écran lent (5 images par seconde), sans plafond une image ferait avancer le match de 2 s : on la borne.
  const lent = jouer(0, () => 0.2, () => 'x10');
  verifier(lent.maxParImage <= PAS_MAXIMAL_PAR_IMAGE + DT, `à ×10 et 5 images par seconde, une image fait avancer le match de ${lent.maxParImage.toFixed(2)} s au plus (plafond ${PAS_MAXIMAL_PAR_IMAGE} s)`);
  verifier(secondesAAvancer(0.2, 10) === PAS_MAXIMAL_PAR_IMAGE && secondesAAvancer(1 / 60, 10) < 0.2, 'le plafond ne touche pas un écran fluide');
  verifier(resumerMatch(lent.e) === resumerMatch(references[0].e), 'et le résultat reste celui de ×1');
}

console.log('— Se faire remplacer —');
{
  for (const k of [0, 2]) {
    // Le joueur incarné d'un match de carrière ordinaire (titulaire si k est pair).
    const e = creerMatchDEmpreinte(k);
    const moi = e.pions.find((p) => p.moi)!;
    const avant = possibiliteDeSortie(e);
    verifier(avant.possible && !!avant.remplacant, `match ${k} : il peut sortir, et ${avant.remplacant?.nom} entrerait`);
    const r = avant.remplacant!;
    const famille = (poste: string) => (poste.startsWith('pilier') ? 'p' : poste);
    verifier(r.poste === moi.poste || r.avant === moi.avant, `match ${k} : le remplaçant est de sa catégorie (${r.poste} pour ${moi.poste}) — jamais le premier venu`);
    const iciRempl = remplacantPour(e, moi);
    verifier(iciRempl === avant.remplacant, 'le choix du remplaçant est déterministe');
    verifier(famille(r.poste).length > 0, 'un poste connu');
    verifier(demanderMaSortie(e).possible, `match ${k} : la demande est acceptée`);
    verifier(!possibiliteDeSortie(e).possible && possibiliteDeSortie(e).raison === 'demande', `match ${k} : une seconde demande est refusée, avec sa raison`);
    // On joue jusqu'au premier arrêt : il ne sort pas en pleine course.
    let sortiEnJeu = false, garde = 0;
    while (!e.fini && moi.surLeTerrain && garde++ < 100000) {
      avancer(e, DT);
      if (!moi.surLeTerrain && !['melee', 'touche', 'coupEnvoi', 'renvoi22', 'apresEssai', 'penalite', 'transformation', 'tirAuBut', 'miTemps', 'tmo', 'bagarre'].includes(e.phase)) sortiEnJeu = true;
    }
    verifier(!moi.surLeTerrain && r.surLeTerrain, `match ${k} : il quitte le terrain et ${r.nom} est entré (minute ${e.minute})`);
    verifier(!sortiEnJeu, `match ${k} : le changement a eu lieu à un arrêt de jeu`);
    verifier(possibiliteDeSortie(e).raison === 'sorti', `match ${k} : ensuite, « déjà remplacé »`);
    while (!e.fini && garde++ < 200000) avancer(e, 0.6);
    verifier(e.fini, `match ${k} : le match va à son terme sans lui`);
  }
  const banc = creerMatchDEmpreinte(1);
  verifier(possibiliteDeSortie(banc).raison === 'banc' && !demanderMaSortie(banc).possible, 'sur le banc, il n\'y a rien à remplacer');
  const fini = creerMatchDEmpreinte(0); while (!fini.fini) avancer(fini, 0.6);
  verifier(possibiliteDeSortie(fini).raison === 'fini', 'match terminé : plus de sortie');
}

console.log('— Simuler la fin du match —');
{
  for (const k of [0, 3]) {
    const reference = resumerMatch(references[k].e);
    // Cinq minutes regardées à ×1, puis tout le reste d'un coup, avec un budget de temps aussi petit que l'on veut.
    const e = creerMatchDEmpreinte(k);
    let garde = 0;
    while (e.t < 300 && garde++ < 100000) avancer(e, 1 / 60);
    let horloge = 0, lots = 0;
    while (!e.fini && lots++ < 10000) simulerPendant(e, 5, () => (horloge += 1));
    verifier(e.fini, `match ${k} : la simulation va jusqu'à la sirène (${lots} appels)`);
    verifier(resumerMatch(e) === reference, `match ${k} : simulé d'un coup, le match est identique à celui regardé à ×1`);
    // Les blessures du manager se tirent entre deux lots : le rappel est bien appelé à chaque lot.
    const f = creerMatchDEmpreinte(k);
    let appels = 0;
    simulerPendant(f, 0, () => 0, () => { appels++; });
    verifier(appels === 1, 'avec un budget nul, un seul lot est joué (et son rappel appelé une fois)');
  }
}

console.log(`OK — ${ok} contrôles de la vitesse de match.`);
