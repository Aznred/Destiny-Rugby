// BANC D'ESSAI DES DUELS DE LA CARTE DE DÉCISION — sans navigateur.
//
// Retour de jeu, mot pour mot : « avec un système de pourcentage de réussite et
// d'impact dans le jeu, et aussi que ça s'applique vraiment — en mode plaquage
// réussi ça plaque direct, plaquage raté le mec perce, pareil pour les autres.
// Et il peut y avoir des combos sur l'action : tu perces, tu peux tenter un
// autre truc sur le défenseur. »
//
// Trois promesses ont été faites au joueur, et une seule d'entre elles se voit
// à l'œil nu. Ce script mesure les trois :
//
//  1. ⚠️ LE POURCENTAGE ANNONCÉ EST CELUI QUI SORT. C'est la promesse la plus
//     facile à trahir et la plus grave : un « 71 % » qui gagne une fois sur
//     deux transforme un jeu de décision en machine à frustration, et personne
//     ne s'en apercevrait en jouant — on met ça sur le compte de la malchance.
//     On regroupe les tirages par tranche de chance annoncée et on compare à la
//     fréquence RÉELLE de réussite.
//  2. LE GESTE S'APPLIQUE VRAIMENT. Plaquage réussi → le porteur est arrêté.
//     Plaquage raté → il a franchi, et le défenseur est au sol.
//  3. LES ENCHAÎNEMENTS EXISTENT, et ils ne s'emballent pas.
//
// Et le garde-fou de toujours : le score reste CELUI DE LA LIGUE.
//
//   npx vite-node scripts/verifDuels.ts

import {
  avancer, creerMatch, estUnDuel, resoudreChoix, type EtatMatch,
} from '../src/lib/moteur/moteur';
import { decisionPour, REPOS_DECISION } from '../src/lib/moteur/decisions';
import { jouerRencontre } from '../src/lib/championnat';
import { effectifDuClub } from '../src/lib/effectif';
import type { ActionJoueur } from '../src/lib/moteur/etat';

const A = 'Stade Toulousain';
const B = 'Stade Rochelais';
const effA = effectifDuClub(A, 1);
const effB = effectifDuClub(B, 1);

const AVATAR = {
  club: A,
  nom: 'Sonde Duel',
  poste: 'troisieme_aile_g' as const,
  attributs: { vitesse: 80, passe: 72, plaquage: 82, jeuAuPied: 58, vision: 74, force: 80, mental: 72, endurance: 82 },
  titulaire: true,
};

let echecs = 0;
function ligne(nom: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(48)} ${valeur}`);
}

const monPion = (e: EtatMatch) => e.pions.find((p) => p.moi)!;

/** Un tirage observé : ce qu'on avait annoncé, et ce qui est sorti. */
interface Tirage {
  action: ActionJoueur;
  chance: number;
  /** Le dé a-t-il été lancé ? Un geste resté armé ne s'étalonne pas. */
  joue: boolean;
  reussi: boolean;
}

/**
 * Joue un match en prenant TOUJOURS la première option de chaque carte, et
 * relève chaque duel.
 *
 * ⚠️ ON PASSE PAR `decisionPour`, PAS PAR UNE LISTE D'ACTIONS INVENTÉE : c'est
 * exactement le chemin de l'écran. Un duel que la carte ne propose jamais n'a
 * pas à être mesuré ici, et un duel qu'elle propose doit l'être.
 */
function jouerAvecCartes(cle: string, choix: (n: number) => number): {
  e: EtatMatch; tirages: Tirage[]; chaines: number[];
} {
  const m = jouerRencontre(A, B, 1, cle, null);
  const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle, AVATAR, {
    niveau: 'pro', controle: true,
  });
  const tirages: Tirage[] = [];
  const chaines: number[] = [];
  let depuis = 0;
  let enchaine = false;
  let chaine = 0;
  let garde = 0;

  while (!e.fini && garde++ < 30_000) {
    const moi = monPion(e);

    // ⚠️ ON CONSOMME LA PERCÉE EXACTEMENT COMME L'ÉCRAN. Le drapeau est posé au
    // fond du moteur, dans `resoudrePlaquage`, et il couvre les DEUX chemins :
    // le duel joué sur-le-champ et le geste resté armé qui trouve son contact
    // deux secondes plus tard. Le mesurer autrement, ce serait mesurer un jeu
    // que personne ne joue.
    if (e.perceeJoueur) {
      e.perceeJoueur = false;
      if (chaine < 2) { enchaine = true; chaine += 1; chaines.push(chaine); }
    }

    const repos = enchaine ? REPOS_DECISION : e.sim - depuis;
    const carte = decisionPour(e, moi, repos);
    if (carte) {
      depuis = e.sim;
      enchaine = false;
      const o = carte.options[choix(carte.options.length)];
      const issue = resoudreChoix(e, moi, o.action);
      if (estUnDuel(o.action)) {
        tirages.push({ action: o.action, chance: o.chance, joue: issue.joue, reussi: issue.reussi });
      }
      if (!issue.combo) chaine = 0;
      continue;
    }
    avancer(e, 0.4);
  }
  return { e, tirages, chaines };
}

// ---------------------------------------------------------------------------
console.log('=== 1. ⚠️ LE POURCENTAGE ANNONCÉ EST CELUI QUI SORT ===');
const tous: Tirage[] = [];
const parties: EtatMatch[] = [];
const chainesVues: number[] = [];
{
  const N = 48;
  for (let i = 0; i < N; i++) {
    // On alterne les choix pour balayer toutes les options, donc toute la
    // gamme de probabilités — sinon on ne mesurerait qu'un seul geste.
    const r = jouerAvecCartes(`duel#${i}`, (n) => i % n);
    tous.push(...r.tirages);
    chainesVues.push(...r.chaines);
    parties.push(r.e);
  }
  const joues = tous.filter((t) => t.joue);
  console.log(`  ${'gestes choisis'.padEnd(48)} ${tous.length}`);
  // ⚠️ ON N'ÉTALONNE QUE LES DÉS RÉELLEMENT LANCÉS. Un crochet demandé sur une
  // carte de RÉCEPTION reste armé : le ballon n'est pas encore là, il n'y a rien
  // à trancher. Le compter comme une réussite était le défaut qui faisait sortir
  // la tranche « 55-75 % » à 78,6 % — et le total, lui, tombait juste.
  console.log(`  ${'dont duels tranchés sur-le-champ'.padEnd(48)} ${joues.length}`);
  ligne('assez de duels tranchés pour conclure', `${joues.length}`, joues.length >= 60);

  // Par tranche de chance annoncée.
  const tranches = [[0, 0.35], [0.35, 0.55], [0.55, 0.75], [0.75, 1.01]];
  let pireSigma = 0;
  let pireTranche = 'aucune tranche mesurable';
  for (const [bas, haut] of tranches) {
    const lot = joues.filter((t) => t.chance >= bas && t.chance < haut);
    if (lot.length < 12) {
      console.log(`  ${`tranche ${Math.round(bas * 100)}-${Math.round(haut * 100)} %`.padEnd(48)} ${lot.length} tirage(s), trop peu pour conclure`);
      continue;
    }
    const annonce = lot.reduce((s, t) => s + t.chance, 0) / lot.length;
    const reel = lot.filter((t) => t.reussi).length / lot.length;
    const ecart = Math.abs(annonce - reel);
    const sigma = Math.max(0.04, Math.sqrt(Math.max(0.01, annonce * (1 - annonce)) / lot.length));
    const n = ecart / sigma;
    if (n > pireSigma) { pireSigma = n; pireTranche = `${(ecart * 100).toFixed(1)} pts = ${n.toFixed(1)} σ`; }
    console.log(`  ${`tranche ${Math.round(bas * 100)}-${Math.round(haut * 100)} %`.padEnd(48)} annoncé ${(annonce * 100).toFixed(1)} % · sorti ${(reel * 100).toFixed(1)} % (${lot.length}, ${n.toFixed(1)} σ)`);
  }
  // ⚠️ LA TOLÉRANCE SE CALCULE, ELLE NE SE DEVINE PAS. Un seuil fixe est un
  // piège sur des lots de tailles inégales : huit points, c'est laxiste sur
  // trois cents tirages et intenable sur cinquante, où l'écart-type d'une
  // proportion vaut déjà sept points à lui seul. On compare donc chaque tranche
  // à DEUX ÉCARTS-TYPES DE SA PROPRE TAILLE — ce qui refuse un biais
  // systématique tout en acceptant le hasard. Le plancher de 4 points évite
  // qu'une tranche énorme devienne absurdement exigeante.
  ligne('aucune tranche ne dévie au-delà du hasard',
    pireTranche, pireSigma <= 2);

  const global = joues.filter((t) => t.reussi).length / Math.max(1, joues.length);
  const attendu = joues.reduce((s, t) => s + t.chance, 0) / Math.max(1, joues.length);
  ligne('et sur l’ensemble, à 4 points près',
    `annoncé ${(attendu * 100).toFixed(1)} % · sorti ${(global * 100).toFixed(1)} %`,
    Math.abs(global - attendu) <= 0.04);
}

// ---------------------------------------------------------------------------
console.log('\n=== 2. LE GESTE S’APPLIQUE VRAIMENT, TOUT DE SUITE ===');
{
  // ⚠️ ON FABRIQUE LA SITUATION plutôt que de l'attendre : on avance jusqu'à ce
  // que mon pion défende face à un porteur à portée, puis on plaque. C'est le
  // seul moyen de séparer proprement « réussi » et « raté » sur assez de cas.
  let ok = 0; let ko = 0; let arretes = 0; let franchis = 0; let plaqueursAuSol = 0;
  for (let i = 0; i < 60; i++) {
    const m = jouerRencontre(A, B, 1, `plq#${i}`, null);
    const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, `plq#${i}`, AVATAR, {
      niveau: 'pro', controle: true,
    });
    let garde = 0;
    let fait = false;
    while (!e.fini && garde++ < 20_000 && !fait) {
      avancer(e, 0.15);
      const moi = monPion(e);
      const porteur = e.porteur;
      if (!moi.surLeTerrain || moi.sanction > 0) continue;
      if (!porteur || porteur.cote === moi.cote) continue;
      const d = Math.hypot(porteur.pos.x - moi.pos.x, porteur.pos.y - moi.pos.y);
      if (d > 6) continue;
      const avantFranch = porteur.stats.franchissements;
      const issue = resoudreChoix(e, moi, 'plaquage');
      fait = true;
      if (issue.reussi) {
        ok++;
        // Un plaquage abouti met fin à la course : ruck, mêlée, ou coup de
        // sifflet. Ce qu'on refuse, c'est « rien ne s'est passé ».
        if (e.porteur !== porteur || e.phase !== 'jeuCourant') arretes++;
      } else {
        ko++;
        if (porteur.stats.franchissements > avantFranch) franchis++;
        if (moi.battu > 0) plaqueursAuSol++;
      }
    }
  }
  console.log(`  ${'plaquages joués'.padEnd(48)} ${ok} réussis · ${ko} ratés`);
  ligne('plaquage réussi → le porteur est stoppé',
    `${arretes}/${ok}`, ok > 0 && arretes === ok);
  ligne('plaquage raté → il franchit',
    `${franchis}/${ko}`, ko > 0 && franchis === ko);
  ligne('… et le plaqueur reste au sol',
    `${plaqueursAuSol}/${ko}`, ko > 0 && plaqueursAuSol === ko);
}

// ---------------------------------------------------------------------------
console.log('\n=== 3. LES ENCHAÎNEMENTS EXISTENT, ET NE S’EMBALLENT PAS ===');
{
  const toutesChaines = parties.length ? chainesVues : [];
  const combos = toutesChaines.length;
  const parMatch = combos / Math.max(1, parties.length);
  console.log(`  ${'enchaînements ouverts'.padEnd(48)} ${combos} sur ${parties.length} matchs`);
  ligne('percer ouvre bien un enchaînement', `${parMatch.toFixed(1)}/match`, combos > 0);
  // ⚠️ ET ÇA RESTE UNE ACTION D'ANTHOLOGIE, pas la trame du match. Au-delà d'une
  // dizaine par match, le rugby devient un jeu de cartes.
  ligne('et ça reste l’exception (≤ 10 par match)', `${parMatch.toFixed(1)}/match`, parMatch <= 10);
  // Le plafond de l'écran tient : jamais plus de deux maillons d'affilée.
  const pire = toutesChaines.length ? Math.max(...toutesChaines) : 0;
  ligne('jamais plus de deux maillons d’affilée', `${pire}`, pire <= 2);
}

// ---------------------------------------------------------------------------
console.log('\n=== 4. LE GARDE-FOU : LE SCORE RESTE CELUI DE LA LIGUE ===');
{
  let ecarts = 0;
  for (let i = 0; i < parties.length; i++) {
    const attendu = jouerRencontre(A, B, 1, `duel#${i}`, null);
    const e = parties[i];
    if (e.scoreA !== attendu.scoreD || e.scoreB !== attendu.scoreE) ecarts++;
  }
  ligne('aucun duel ne déplace le résultat',
    `${ecarts} écart(s) sur ${parties.length}`, ecarts === 0);

  // ⚠️ ET LE MATCH VA AU BOUT. Un duel qui laisse le moteur dans un état
  // impossible (porteur nul, phase orpheline) se verrait ici et nulle part
  // ailleurs — l'écran, lui, se contenterait de figer.
  const bloques = parties.filter((e) => !e.fini).length;
  ligne('et tous les matchs vont à la sirène', `${parties.length - bloques}/${parties.length}`, bloques === 0);
}

console.log(echecs === 0
  ? '\n✅ TOUT EST BON — le pourcentage annoncé est celui qui sort, le geste s’applique sur-le-champ, et les enchaînements restent des exceptions.'
  : `\n❌ ${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
