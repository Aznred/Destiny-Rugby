// BANC DE LA BAGARRE (Correctif 32)
//
// Signalé : « quand il y a une bagarre ça bloque le jeu, on ne peut cliquer sur aucun des choix, on doit relancer ».
// Deux causes. L'écran : le panneau des ordres passait sous les zones tactiles du contrôle direct (vérifié dans le
// navigateur, pas ici). Le moteur : `e.phase` valait « bagarre » à la déclaration, mais rien ne l'y maintenait — le
// contrôle direct continuait d'obéir au joueur, une décision en attente pouvait tomber — et la phase repartait AVEC la
// bagarre posée. `phaseBagarre` ne tournait plus : l'ordre cliqué n'était jamais résolu. Ce banc tient le moteur :
//   1. une bagarre attend son ordre, puis se résout au pas suivant ;
//   2. une phase qui a bougé sous la bagarre y revient, et l'ordre donné est résolu quand même ;
//   3. en contrôle direct, rien de ce que demande le joueur ne relance le jeu pendant l'attente ;
//   4. sans ordre, le garde-fou tranche tout seul ;
//   5. des matchs entiers conduits au hasard : à chaque pas, une bagarre posée EST la phase du match.
//
//   npm run verify:bagarre

import assert from 'node:assert/strict';
import { avancer, DT, ordonner } from '../src/lib/moteur/moteur';
import { declencherBagarre, monPion, ORDRES } from '../src/lib/moteur/bagarre';
import { activerDirect, commanderDirect, demanderDirect, type DemandeDirecte } from '../src/lib/moteur/direct';
import { graine } from '../src/lib/ligue/aleatoire';
import type { EtatMatch, Phase } from '../src/lib/moteur/etat';
import { creerMatchDEmpreinte } from './outilsEmpreinte';

let controles = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); controles++; };
const pas = (e: EtatMatch) => avancer(e, DT);

/** Un match de carrière 3D avec un joueur titulaire, amené jusqu'au jeu ouvert. */
function matchOuvert(k: number, direct = false): EtatMatch {
  const e = creerMatchDEmpreinte(k);
  if (direct) activerDirect(e, true);
  let garde = 0;
  while ((e.phase !== 'jeuCourant' || !monPion(e)?.surLeTerrain) && garde++ < 6000) pas(e);
  assert.ok(monPion(e)?.surLeTerrain, 'le joueur du banc est sur le terrain');
  return e;
}
function declencher(e: EtatMatch): void {
  const moi = monPion(e)!;
  const adversaire = e.pions.find((p) => p.cote !== moi.cote && p.surLeTerrain && p.sanction <= 0)!;
  declencherBagarre(e, 'adversaire', false, adversaire);
}

// ── 1. Une bagarre attend son ordre ──────────────────────────────────────────────────────────────────────────────
for (const ordre of ORDRES) {
  const e = matchOuvert(0);
  declencher(e);
  ok(e.bagarre && e.phase === 'bagarre' && !e.porteur && !e.vol, `« ${ordre.id} » : la bagarre arrête le jeu`);
  for (let i = 0; i < 40; i++) pas(e);
  ok(e.bagarre && e.phase === 'bagarre' && !e.bagarre.ordre, `« ${ordre.id} » : sans ordre, le moteur attend`);
  ordonner(e, ordre.id);
  pas(e);
  ok(!e.bagarre && (e.phase as Phase) !== 'bagarre', `« ${ordre.id} » : l'ordre est résolu au pas suivant`);
  let garde = 0;
  while (!e.fini && garde++ < 200000) pas(e);
  ok(e.fini, `« ${ordre.id} » : le match va à son terme`);
}

// ── 2. La phase a bougé sous la bagarre ──────────────────────────────────────────────────────────────────────────
for (const ailleurs of ['ballonEnLAir', 'jeuCourant', 'ruck', 'penalite', 'coupEnvoi', 'touche'] as Phase[]) {
  // a. Sans ordre : le pas suivant ramène le match à la bagarre.
  const e = matchOuvert(1);
  declencher(e);
  e.phase = ailleurs;
  pas(e);
  ok(e.bagarre && (e.phase as Phase) === 'bagarre', `phase « ${ailleurs} » sous une bagarre : le match y revient`);
  // b. Ordre donné alors que la phase est ailleurs (c'était le blocage) : il est résolu quand même.
  e.phase = ailleurs;
  ordonner(e, 'calmer');
  pas(e);
  ok(!e.bagarre, `phase « ${ailleurs} » : l'ordre donné est résolu, le panneau peut se fermer`);
}

// ── 3. En contrôle direct, le joueur ne relance pas le jeu pendant l'attente ─────────────────────────────────────
{
  const demandes: DemandeDirecte[] = [
    { action: 'passe', vers: { x: 0, y: 1 } }, { action: 'coupDePied', auto: true },
    { action: 'coupDePied', visee: { x: 1, y: 0, puissance: 0.9 } }, { action: 'drop' }, { action: 'plaquage' },
    { action: 'raffut' }, { action: 'crochet', vers: { x: 0, y: -1 } }, { action: 'appel' }, { action: 'grattage' },
  ];
  for (let k = 0; k < 4; k += 2) {
    const e = matchOuvert(k, true);
    // Le joueur a le ballon en main quand ça dégénère : c'est là qu'une passe ou un coup de pied repartaient.
    const moi = monPion(e)!;
    e.porteur = moi; e.possession = moi.cote;
    declencher(e);
    let tenue = true, vols = 0;
    for (let i = 0; i < 60; i++) {
      commanderDirect(e, 1, 0, true);
      demanderDirect(e, demandes[i % demandes.length]);
      pas(e);
      if ((e.phase as Phase) !== 'bagarre' || !e.bagarre) tenue = false;
      if (e.vol) vols++;
    }
    ok(tenue && vols === 0, `match ${k} : soixante pas de commandes et de demandes ne sortent pas le match de la bagarre`);
    ordonner(e, 'reculer');
    pas(e);
    ok(!e.bagarre, `match ${k} : l'ordre est résolu`);
    let garde = 0;
    while (!e.fini && garde++ < 200000) pas(e);
    ok(e.fini, `match ${k} : le match conduit va à son terme`);
  }
}

// ── 4. Sans ordre, le garde-fou tranche ──────────────────────────────────────────────────────────────────────────
{
  const e = matchOuvert(2);
  declencher(e);
  let pasFaits = 0;
  while (e.bagarre && pasFaits++ < 2000) pas(e);
  ok(!e.bagarre && pasFaits * DT > 85 && pasFaits * DT < 100, `sans ordre, la bagarre se résout seule (${(pasFaits * DT).toFixed(0)} s simulées)`);
}

// ── 5. Matchs entiers conduits au hasard ─────────────────────────────────────────────────────────────────────────
{
  let bagarres = 0, resolues = 0, pasJoues = 0, ecarts = 0;
  for (let k = 0; k < 6; k++) {
    const e = creerMatchDEmpreinte(k);
    activerDirect(e, true);
    const rng = graine(`banc-bagarre#${k}`);
    let attente = 0, prochaine = 20 + rng() * 40, garde = 0;
    while (!e.fini && garde++ < 200000) {
      const moi = monPion(e);
      // Un joueur qui martèle ses commandes, bagarre ou pas.
      commanderDirect(e, rng() * 2 - 1, rng() * 2 - 1, rng() < 0.4);
      if (rng() < 0.12) demanderDirect(e, { action: (['passe', 'coupDePied', 'plaquage', 'raffut', 'crochet', 'drop'] as const)[Math.floor(rng() * 6)], vers: { x: 0, y: rng() < 0.5 ? 1 : -1 }, auto: true });
      // Une bagarre de temps en temps, dans n'importe quelle phase — y compris pendant un arrêt ou un vol.
      if (!e.bagarre && moi?.surLeTerrain && moi.sanction <= 0 && e.sim > prochaine && e.phase !== 'miTemps') {
        declencher(e);
        if (e.bagarre) { bagarres++; attente = 0; }
        prochaine = e.sim + 45 + rng() * 90;
      }
      if (e.bagarre && !e.bagarre.ordre && (attente += DT) > 1.5) ordonner(e, ORDRES[Math.floor(rng() * ORDRES.length)].id);
      const avait = !!e.bagarre?.ordre;
      pas(e);
      pasJoues++;
      if (e.bagarre && (e.phase as Phase) !== 'bagarre' && !e.fini) ecarts++;
      if (avait && !e.bagarre) resolues++;
    }
    ok(e.fini, `match ${k} : joué jusqu'à la sirène`);
  }
  ok(bagarres >= 20, `assez de bagarres pour que le contrôle dise quelque chose (${bagarres})`);
  ok(ecarts === 0, `sur ${pasJoues} pas, une bagarre posée est toujours la phase du match (${ecarts} écart)`);
  ok(resolues >= bagarres - 6, `chaque ordre donné est résolu (${resolues} sur ${bagarres} ; les autres : sirène pendant l'attente)`);
}

console.log(`OK — ${controles} contrôles : la bagarre attend son ordre, tient le match, et se résout toujours.`);
process.exit(0);
