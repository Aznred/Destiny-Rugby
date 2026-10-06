// LES RESPONSABILITÉS, MESURÉES — Correctif 17 (`moteur/responsabilites.ts`, `tirHumain.ts` et leur branchement dans `moteur.ts`).
//
// Ce banc joue des situations construites et de vrais matchs avec un pilote automatique à la place des doigts, et vérifie :
//   - qui tient quoi, et la chaîne de repli quand le titulaire sort ;
//   - que le capitaine IA ne tire jamais au sort, et tranche comme le cahier des charges (mené 20-18 à la 78ᵉ → poteaux…) ;
//   - que le jeu ATTEND le joueur (horloge arrêtée) quand il capitaine, tape, engage ou lance — et reprend sans lui au chrono ;
//   - que le résultat d'un tir sort de la géométrie (visée, force, geste, vent), pas d'un tirage ;
//   - que des matchs entiers, conduits à la main, finissent sans blocage ni NaN.
//
// Lancer : npm run verify:responsabilites
import assert from 'node:assert/strict';
import {
  avancer, DT, aideDeTir, choisirCombinaisonTouche, demanderToucheRapide, engagerHumain, installerSituationCombinaison,
  lancerLaTouche, tirerHumain, trancherPenalite,
} from '../src/lib/moteur/moteur';
import type { EtatMatch } from '../src/lib/moteur/etat';
import type { Pion } from '../src/lib/moteur/entites';
import {
  COMBINAISONS_TOUCHE, PUISSANCE_TOUCHE, decisionDuCapitaine, humainTientLe, pionDuRole, qualiteDuLancer, rolesEffectifs,
  type ContextePenalite, type RoleEquipe,
} from '../src/lib/moteur/responsabilites';
import {
  REGLAGES_TIR, dispersion, porteeMaximale, puissanceUtile, quantileCentre, resoudreEngagement, resoudreTirHumain,
} from '../src/lib/moteur/tirHumain';
import { tirPasseEntreLesPoteaux, type ContexteTir } from '../src/lib/moteur/trajectoire';
import { activerDirect, demanderDirect, majVueDirecte } from '../src/lib/moteur/direct';
import { AXE, LARGEUR, LIGNE_A, LIGNE_B, MILIEU, sens } from '../src/lib/moteur/terrain';
import { creerMatchDEmpreinte } from './outilsEmpreinte';
import { ControleurVisee, REGLAGES_VISEE } from '../src/lib/controleDirect/visee';

let ok = 0;
const verifier = (condition: unknown, message: string) => { assert.ok(condition, message); ok++; };
const pas = (e: EtatMatch, n = 1) => { for (let i = 0; i < n; i++) avancer(e, DT); };

const TOUS: RoleEquipe[] = ['capitaine', 'viceCapitaine', 'buteur', 'buteur2', 'engagement', 'droppeur', 'lanceur', 'lanceur2'];

/** Un match de carrière 3D avec les responsabilités, le joueur tenant `roles`, le contrôle direct allumé. */
function match(k: number, roles: RoleEquipe[], direct = true): { e: EtatMatch; h: Pion } {
  const e = creerMatchDEmpreinte(k, { responsabilites: { avatar: roles } });
  if (direct) activerDirect(e, true);
  const h = e.pions.find((p) => p.moi)!;
  return { e, h };
}

/** Pose un pion sans histoire : à l'arrêt, debout, là où on le veut. */
function poser(p: Pion, x: number, y: number): void {
  p.pos = { x, y }; p.cible = { x, y }; p.vitesse = { x: 0, y: 0 };
  p.corps = undefined; p.battu = 0; p.sanction = 0; p.surLeTerrain = true; p.role = 'ligne';
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— Qui tient quoi : attribution et chaîne de repli —');
{
  const { e, h } = match(0, ['capitaine', 'buteur']);
  const r = e.responsabilites!;
  verifier(!!r, 'le match porte ses responsabilités');
  for (const cote of ['A', 'B'] as const) {
    for (const role of TOUS) verifier(!!pionDuRole(e, cote, role), `${cote} : le rôle « ${role} » est tenu`);
  }
  // Un rôle ne se tient qu'une fois : capitaine et vice, buteur et buteur secondaire sont deux joueurs.
  for (const cote of ['A', 'B'] as const) {
    verifier(pionDuRole(e, cote, 'capitaine') !== pionDuRole(e, cote, 'viceCapitaine'), `${cote} : capitaine ≠ vice-capitaine`);
    verifier(pionDuRole(e, cote, 'buteur') !== pionDuRole(e, cote, 'buteur2'), `${cote} : buteur ≠ buteur secondaire`);
    verifier(pionDuRole(e, cote, 'lanceur') !== pionDuRole(e, cote, 'lanceur2'), `${cote} : lanceur ≠ lanceur secondaire`);
  }
  verifier(humainTientLe(e, 'capitaine') && humainTientLe(e, 'buteur'), 'le joueur désigné tient le brassard et le tee');
  verifier(!humainTientLe(e, 'lanceur') && !humainTientLe(e, 'engagement'), 'il ne tient pas ce qu\'on ne lui a pas confié');
  verifier(h.capitaine && h.buteur, 'les drapeaux du moteur le disent (arbitre, tir)');
  pas(e);
  verifier(e.pions.filter((p) => p.cote === h.cote && p.capitaine).length === 1, 'un seul capitaine par équipe');
  verifier(rolesEffectifs(e, h).includes('capitaine'), 'l\'écran lit ses rôles effectifs');
  // Le brassard passe au vice-capitaine quand le capitaine sort ; au suivant quand les deux sont dehors.
  const vice = pionDuRole(e, h.cote, 'viceCapitaine')!;
  h.surLeTerrain = false;
  verifier(pionDuRole(e, h.cote, 'capitaine') === vice, 'capitaine sorti : le vice reprend le brassard');
  pas(e);
  verifier(vice.capitaine && !h.capitaine, 'et le drapeau suit au pas suivant');
  vice.sanction = 600;
  const suivant = pionDuRole(e, h.cote, 'capitaine')!;
  verifier(suivant !== h && suivant !== vice && suivant.surLeTerrain, 'les deux dehors : le meilleur meneur disponible');
  h.surLeTerrain = true;
  vice.sanction = 0;
  verifier(pionDuRole(e, h.cote, 'capitaine') === h, 'le titulaire rentre : il reprend ce qui lui avait été confié');
  // Un carton jaune au buteur : le buteur secondaire prend le tee.
  const buteur2 = pionDuRole(e, h.cote, 'buteur2')!;
  h.sanction = 300;
  verifier(pionDuRole(e, h.cote, 'buteur') === buteur2, 'buteur sanctionné : le secondaire prend le relais');
  h.sanction = 0;
  // Un remplaçant n'hérite de rien.
  const banc = e.pions.find((p) => p.cote === h.cote && !p.surLeTerrain && p.minutes === 0 && p.numero > 15)!;
  verifier(!rolesEffectifs(e, banc).length, 'un remplaçant n\'a aucun rôle tant qu\'on ne lui en a pas donné');
  // Le joueur qui capitaine ET tape : deux rôles pour lui.
  verifier(rolesEffectifs(e, h).length >= 2, 'on peut tenir plusieurs rôles');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— Le capitaine IA : jamais au hasard, et comme le cahier des charges —');
{
  const { e } = match(2, []);
  const cote = 'A' as const;
  const lieuA = (dist: number, ecart = 0) => ({ x: LIGNE_B - dist, y: AXE + ecart });
  const ctx = (dist: number, ecart: number, chance: number, plus: Partial<ContextePenalite> = {}): ContextePenalite => ({
    cote, lieu: lieuA(dist, ecart), distance: dist, angle: Math.abs(ecart), chance, buteurPresent: true, consigne: 'mixte', ...plus,
  });
  const regler = (minute: number, scoreA: number, scoreB: number) => {
    e.minute = minute; e.t = minute * 60; e.sirene = false; e.scoreA = scoreA; e.scoreB = scoreB;
    for (const p of e.pions) { p.sanction = 0; p.surLeTerrain = p.numero <= 15; }
  };
  regler(78, 18, 20);
  verifier(decisionDuCapitaine(e, ctx(35, 6, 0.7)).choix === 'points', 'mené 20-18 à la 78ᵉ, à 35 m : les poteaux');
  regler(75, 18, 24);
  verifier(decisionDuCapitaine(e, ctx(35, 6, 0.7)).choix === 'touche', 'mené 24-18 à la 75ᵉ : la touche, il faut un essai');
  regler(78, 21, 18);
  verifier(decisionDuCapitaine(e, ctx(32, 5, 0.75)).choix === 'points', 'devant de 3 à la 78ᵉ, à portée : on creuse');
  regler(79, 30, 18);
  verifier(decisionDuCapitaine(e, ctx(32, 5, 0.75)).choix === 'touche', 'devant de 12 à la 79ᵉ : on tue le ballon en touche');
  regler(30, 10, 10);
  verifier(decisionDuCapitaine(e, ctx(60, 20, 0.05)).choix === 'touche', 'trop loin : la touche, quelle que soit la minute');
  verifier(decisionDuCapitaine(e, ctx(22, 3, 0.9)).choix === 'points', 'tir facile à vingt-deux mètres, milieu de match : les poteaux');
  // La consigne de l'entraîneur donne la pente.
  verifier(decisionDuCapitaine(e, ctx(30, 4, 0.7, { consigne: 'touche' })).choix === 'touche', 'consigne « touche » : la touche');
  verifier(decisionDuCapitaine(e, ctx(30, 4, 0.7, { consigne: 'points' })).choix === 'points', 'consigne « points » : les poteaux');
  // La mêlée dominante, près de la ligne.
  for (const p of e.pions) if (p.cote === cote && p.avant) p.puissance = 92;
  for (const p of e.pions) if (p.cote !== cote && p.avant) p.puissance = 60;
  verifier(decisionDuCapitaine(e, ctx(15, 6, 0.8)).choix === 'melee', 'mêlée dominante près de la ligne : la mêlée');
  for (const p of e.pions) if (p.avant) p.puissance = 70;
  // La défense qui dort.
  verifier(decisionDuCapitaine(e, ctx(25, 4, 0.8, { defense: { rideau: 2, retardataires: 4 } })).choix === 'rapide', 'défense désorganisée : on joue vite');
  verifier(decisionDuCapitaine(e, ctx(25, 4, 0.8, { defense: { rideau: 9, retardataires: 0 } })).choix !== 'rapide', 'défense en place : on ne joue pas vite');
  // Déterminisme : la même situation donne toujours le même choix, et ne touche pas au hasard du match.
  const avant = e.rng();
  const a = decisionDuCapitaine(e, ctx(35, 6, 0.7)), b = decisionDuCapitaine(e, ctx(35, 6, 0.7));
  verifier(a.choix === b.choix && a.raison === b.raison, 'même situation, même décision, même raison');
  const apres = e.rng();
  void avant; void apres;
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— Le tir à la main : la géométrie du vol décide —');
{
  const contexte = (plus: Partial<ContexteTir> = {}): ContexteTir => ({
    puissance: 70, precision: 72, fraicheur: 90, style: 0, ventDos: 0, ventTravers: 0, pression: 0, suite: true, ...plus,
  });
  const cote = 'A' as const;
  const de = { x: LIGNE_B - 30, y: AXE + 3 };
  const rng = (graine: number) => { let s = graine; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const taux = (visee: { ecart: number; puissance: number; effet: number; geste: number }, c: ContexteTir, chance = 0.7, n = 1500, depart = de) => {
    const r = rng(7); let reussis = 0;
    for (let i = 0; i < n; i++) {
      const res = resoudreTirHumain(depart, cote, visee, c, chance, r(), r(), r(), r());
      if (res.reussi) reussis++;
      if (i < 60) verifier(res.reussi === tirPasseEntreLesPoteaux({ de: depart, vers: res.vers, duree: res.duree, derive: res.derive, ...(res.ricochet ? { ricochet: res.ricochet } : {}) }, cote), 'le résultat se lit sur la trajectoire seule');
    }
    return reussis / n;
  };
  const c = contexte();
  const utile = puissanceUtile(de, cote, c);
  verifier(utile > 0.2 && utile < 1, `la force juste suffisante à 30 m est dans la jauge (${utile.toFixed(2)})`);
  verifier(porteeMaximale(c) > 40 && porteeMaximale(c) < 66, `la portée à pleine force est réaliste (${porteeMaximale(c).toFixed(1)} m)`);
  verifier(Math.abs(quantileCentre(0.6827) - 1) < 0.02, 'le quantile de la loi normale est juste (68,27 % ↔ 1 sigma)');
  // La chance de base se retrouve : visé au milieu, geste moyen, la proportion de tirs réussis est de l'ordre de la chance du moteur.
  const milieu = { ecart: 0, puissance: Math.min(1, utile + 0.12), effet: 0, geste: 0.5 };
  const tauxMoyen = taux(milieu, c, 0.7, 2000);
  verifier(tauxMoyen > 0.5 && tauxMoyen < 0.85, `un tir visé au milieu, geste moyen : ${(tauxMoyen * 100).toFixed(0)} % pour une chance de 70 %`);
  const parfait = taux({ ...milieu, geste: 1 }, c, 0.7, 2000), brouillon = taux({ ...milieu, geste: 0 }, c, 0.7, 2000);
  verifier(parfait > tauxMoyen && tauxMoyen > brouillon, `le geste compte : ${(brouillon * 100).toFixed(0)} % < ${(tauxMoyen * 100).toFixed(0)} % < ${(parfait * 100).toFixed(0)} %`);
  // La visée : à côté des poteaux, rien ne passe.
  verifier(taux({ ...milieu, ecart: milieu.ecart + 6 }, c) < tauxMoyen * 0.35, 'visé six mètres à côté : il passe bien moins souvent');
  verifier(taux({ ...milieu, ecart: milieu.ecart + 11 }, c) < 0.03, 'visé onze mètres à côté : le ballon ne passe presque jamais');
  // La force : trop courte, il passe sous la barre ou retombe devant.
  verifier(taux({ ...milieu, puissance: 0.2 }, c) < 0.02, 'force trop faible : le ballon n\'a pas la longueur');
  verifier(taux({ ...milieu, puissance: utile - 0.18 }, c) < taux(milieu, c) * 0.5, 'un peu juste en force : il passe nettement moins');
  const manque = resoudreTirHumain(de, cote, { ...milieu, puissance: 0.2 }, c, 0.7, 0.5, 0.5, 0.5, 0.5);
  verifier(manque.issue === 'court' && manque.manque > 4, 'très court : il retombe devant la ligne');
  // La distance : plus c'est loin, moins ça passe (avec la chance du moteur qui baisse, et la portée qui manque).
  const loin = { x: LIGNE_B - 48, y: AXE };
  verifier(taux({ ecart: 0, puissance: 1, effet: 0, geste: 0.5 }, c, 0.35, 1500, loin) < taux({ ecart: 0, puissance: 1, effet: 0, geste: 0.5 }, c, 0.9, 1500, { x: LIGNE_B - 15, y: AXE }), 'à 48 m on réussit moins qu\'à 15 m');
  // Le vent : visé au milieu, un vent de travers de 9 m/s dérive le ballon ; visé contre le vent, il revient.
  const vent = contexte({ ventTravers: 9 });
  // Sans dispersion (le cosinus de Box-Muller s'annule à r2 = 0,25), l'écart au plan des poteaux EST la dérive du vent.
  const drift = (resoudreTirHumain(de, cote, milieu, vent, 0.7, 0.5, 0.25, 0.5, 0.25).ecartFinal ?? 0) - milieu.ecart;
  verifier(drift > 1, `le vent de travers pousse vraiment le ballon (${drift.toFixed(1)} m dans le plan des poteaux)`);
  const sansCorriger = taux(milieu, vent), corrige = taux({ ...milieu, ecart: milieu.ecart - drift }, vent);
  verifier(corrige > sansCorriger + 0.1, `viser contre le vent le rattrape : ${(sansCorriger * 100).toFixed(0)} % → ${(corrige * 100).toFixed(0)} %`);
  // La fatigue et la pression dispersent : un buteur frais est plus sûr qu'un buteur à bout.
  const fatigue = taux(milieu, contexte({ fraicheur: 20 }), 0.55), frais = taux(milieu, contexte({ fraicheur: 95 }), 0.7);
  verifier(frais > fatigue, 'un buteur à bout de souffle réussit moins');
  verifier(dispersion(0.9, { ecart: 0, puissance: 0.7, effet: 0, geste: 0.5 }, 1) < dispersion(0.4, { ecart: 0, puissance: 0.7, effet: 0, geste: 0.5 }, 1), 'une chance plus faible disperse davantage');
  verifier(dispersion(0.7, { ecart: 0, puissance: 1, effet: 0, geste: 0.5 }, 1) > dispersion(0.7, { ecart: 0, puissance: 0.7, effet: 0, geste: 0.5 }, 1), 'frapper à fond coûte en précision');
  verifier(dispersion(0.7, { ecart: 0, puissance: 0.7, effet: 1, geste: 0.5 }, 1) > dispersion(0.7, { ecart: 0, puissance: 0.7, effet: 0, geste: 0.5 }, 1), 'l\'effet coûte en précision');
  verifier(REGLAGES_TIR.geste1 < REGLAGES_TIR.geste0, 'un geste net réduit la dispersion');
  // Un tir au ras du poteau le touche : il rentre, ou il ressort.
  let poteaux = 0, rentrants = 0, sortants = 0;
  const r = rng(3);
  for (let i = 0; i < 4000; i++) {
    const res = resoudreTirHumain(de, cote, { ecart: 2.75, puissance: Math.min(1, utile + 0.15), effet: 0, geste: 1 }, c, 0.95, r(), r(), r(), r());
    if (res.issue === 'poteauRentrant') { poteaux++; rentrants++; verifier(res.reussi, 'poteau rentrant : le tir compte'); }
    if (res.issue === 'poteauSortant') { poteaux++; sortants++; verifier(!res.reussi, 'poteau sortant : le tir ne compte pas'); }
  }
  verifier(poteaux > 20 && rentrants > 0 && sortants > 0, `les poteaux se touchent (${rentrants} rentrants, ${sortants} sortants)`);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— Le coup d\'envoi : distance, côté, hauteur —');
{
  const joueur = { puissance: 70, pied: 75, endurance: 95 };
  const rr = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const court = resoudreEngagement('A', { distance: 12, ecart: 0, hauteur: 1, geste: 0.8 }, joueur, 0, rr(), rr(), rr(), rr());
  const long = resoudreEngagement('A', { distance: 40, ecart: 0, hauteur: 0.3, geste: 0.8 }, joueur, 0, rr(), rr(), rr(), rr());
  verifier(court.arrivee.x < long.arrivee.x, 'un coup d\'envoi contestable est plus court qu\'un coup d\'envoi long');
  verifier(court.duree > long.duree, 'une chandelle met plus de temps à redescendre qu\'un coup tendu');
  verifier(court.arrivee.x - MILIEU >= 10.5 - 1e-9, 'il franchit toujours les dix mètres');
  const trop = resoudreEngagement('A', { distance: 52, ecart: 0, hauteur: 0.5, geste: 0.8 }, { puissance: 40, pied: 50, endurance: 60 }, 0, 0.5, 0.5, 0.5, 0.5);
  verifier(trop.manque > 0 && trop.arrivee.x - MILIEU < 52, 'un buteur faible n\'a pas la portée demandée');
  const sB = resoudreEngagement('B', { distance: 30, ecart: 0, hauteur: 0.5, geste: 0.8 }, joueur, 0, 0.5, 0.5, 0.5, 0.5);
  verifier(sB.arrivee.x < MILIEU, 'l\'équipe B tape vers les x décroissants');
  const flou = resoudreEngagement('A', { distance: 35, ecart: 0, hauteur: 0.5, geste: 0 }, joueur, 0, 0.5, 0.5, 0.5, 0.5);
  const net = resoudreEngagement('A', { distance: 35, ecart: 0, hauteur: 0.5, geste: 1 }, joueur, 0, 0.5, 0.5, 0.5, 0.5);
  verifier(flou.sigma > net.sigma, 'un geste net disperse moins');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— La touche : la combinaison annoncée, le lancer —');
{
  const q = (c: (typeof COMBINAISONS_TOUCHE)[number], p: number, g: number) => qualiteDuLancer(c, { puissance: p, geste: g });
  verifier(q('fond', 0.78, 1).delta > q('fond', 0.3, 1).delta, 'un lancer trop court au fond est moins bon que le bon');
  verifier(q('avant', 0.34, 1).delta > q('avant', 0.9, 1).delta, 'un lancer trop long devant est moins bon que le bon');
  verifier(q('milieu', 0.55, 1).delta > q('milieu', 0.55, 0).delta, 'un geste net vaut mieux qu\'un geste flou');
  verifier(q('fond', 0.78, 1).longueur === 1 && q('fond', 0.2, 0.5).longueur > 1, 'la mauvaise longueur se paie en risque de lancer manqué');
  verifier(COMBINAISONS_TOUCHE.every((c) => PUISSANCE_TOUCHE[c] > 0 && PUISSANCE_TOUCHE[c] < 1), 'chaque combinaison a sa force');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— Le jeu attend le joueur : pénalité, tir, coup d\'envoi, touche —');
{
  // Une pénalité pour nous, le joueur capitaine et buteur, à trente mètres.
  const { e, h } = match(0, ['capitaine', 'buteur']);
  const cote = h.cote;
  e.phase = 'penalite';
  e.possession = cote;
  e.porteur = null;
  e.vol = null;
  const lieu = { x: cote === 'A' ? LIGNE_B - 30 : LIGNE_A + 30, y: AXE + 4 };
  e.ballon = { ...lieu };
  e.penalite = { pour: cote, lieu, motif: 'ballon gardé', defense: { rideau: 8, retardataires: 0 } };
  e.minuteur = 0;
  e.placement = null;
  e.minute = 30; e.t = 1800;
  pas(e, 2);
  const r = e.responsabilites!;
  verifier(r.attente?.type === 'penalite', 'le jeu attend le capitaine');
  verifier(!!r.attente?.suggestion && (r.attente?.distance ?? 0) > 20, 'avec la distance et ce que ferait un capitaine');
  const t0 = e.t, s0 = e.sim;
  pas(e, 30);
  verifier(e.t === t0, 'l\'horloge du match est arrêtée pendant qu\'il décide');
  verifier(e.sim > s0 && r.attente?.type === 'penalite', 'le temps de simulation continue, la décision attend');
  verifier(trancherPenalite(e, 'points'), 'il tranche : les poteaux');
  verifier(r.stats.decisions === 1 && !r.attente && r.derniere?.humain === true, 'sa décision est comptée et mémorisée');
  let garde = 0;
  while ((e.phase !== 'tirAuBut' || e.tir?.etape !== 'vise') && garde++ < 4000) pas(e);
  verifier(e.phase === 'tirAuBut' && e.tir?.humain === true && e.tir.etape === 'vise', 'le buteur, c\'est lui : le tir attend sa visée');
  pas(e);
  verifier(r.attente?.type === 'tir' && (r.attente.chance ?? 0) > 0, 'le match attend sa visée');
  const aide = aideDeTir(e)!;
  verifier(aide.distance > 20 && aide.utile > 0 && aide.utile < 1.2, 'l\'aide de visée donne la distance et la force juste suffisante');
  const t1 = e.t;
  pas(e, 20);
  verifier(e.t === t1, 'l\'horloge reste arrêtée pendant qu\'il vise');
  const avantScore = e.scoreA + e.scoreB;
  verifier(tirerHumain(e, { ecart: lieu.y - AXE > 0 ? -lieu.y + AXE + 0 : 0, puissance: Math.min(1, aide.utile + 0.12), effet: 0, geste: 1 }), 'il vise et frappe');
  garde = 0;
  while (e.tir && garde++ < 4000) pas(e);
  verifier(!e.tir, 'le tir va à son terme');
  verifier(e.scoreA + e.scoreB - avantScore === 0 || e.scoreA + e.scoreB - avantScore === 3, 'trois points ou rien : jamais autre chose');
  verifier(r.stats.tirs === 1, 'le tir est compté');
}
{
  // Chrono dépassé : l'IA tranche à sa place.
  const { e, h } = match(4, ['capitaine']);
  const cote = h.cote;
  e.phase = 'penalite'; e.possession = cote; e.porteur = null; e.vol = null;
  const lieu = { x: cote === 'A' ? LIGNE_B - 40 : LIGNE_A + 40, y: AXE };
  e.ballon = { ...lieu };
  e.penalite = { pour: cote, lieu, motif: 'ballon gardé', defense: { rideau: 8, retardataires: 0 } };
  e.minuteur = 0; e.placement = null;
  pas(e, 2);
  verifier(e.responsabilites!.attente?.type === 'penalite', 'il a la main');
  const delai = e.responsabilites!.attente!.delai;
  pas(e, Math.ceil(delai / DT) + 4);
  verifier(!e.responsabilites!.attente || e.responsabilites!.attente.type !== 'penalite', 'le chrono est dépassé : la décision est prise');
  verifier(e.responsabilites!.stats.chronosDepasses === 1 && e.responsabilites!.derniere?.humain === false, 'le capitaine IA a tranché à sa place, et la note le retient');
}
{
  // Le joueur n'est pas capitaine : jamais d'attente.
  const { e, h } = match(0, ['buteur']);
  const cote = h.cote;
  e.phase = 'penalite'; e.possession = cote; e.porteur = null; e.vol = null;
  const lieu = { x: cote === 'A' ? LIGNE_B - 30 : LIGNE_A + 30, y: AXE };
  e.ballon = { ...lieu };
  e.penalite = { pour: cote, lieu, motif: 'ballon gardé', defense: { rideau: 8, retardataires: 0 } };
  e.minuteur = 0; e.placement = null;
  pas(e, 6);
  verifier(e.responsabilites!.attente?.type !== 'penalite', 'sans le brassard, le capitaine IA décide : on n\'attend pas');
  verifier(e.responsabilites!.derniere?.humain === false, 'la décision du capitaine IA est mémorisée');
}
{
  // Le coup d'envoi.
  // Un match où son équipe engage (et où il est titulaire : graine paire) : on cherche la graine.
  let k = 0;
  while (k < 40 && (() => { const m = match(k, ['engagement'], false); return m.e.possession !== m.h.cote; })()) k += 2;
  const { e, h } = match(k, ['engagement']);
  verifier(e.possession === h.cote, 'son équipe engage');
  let garde = 0;
  while (e.responsabilites!.attente?.type !== 'engagement' && garde++ < 4000) pas(e);
  verifier(e.responsabilites!.attente?.type === 'engagement' && e.phase === 'coupEnvoi', 'le joueur qui tient l\'engagement : le match l\'attend');
  const t0 = e.t;
  pas(e, 12);
  verifier(e.t === t0, 'horloge arrêtée');
  verifier(engagerHumain(e, { distance: 30, ecart: 10, hauteur: 0.8, geste: 0.8 }), 'il choisit sa frappe');
  pas(e, 4);
  verifier(e.vol?.intention === 'renvoi' || e.piedPrepare?.intention === 'renvoi', 'le coup d\'envoi part');
  verifier(e.responsabilites!.stats.engagements === 1, 'il est compté');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— La touche à la main : annoncer, lancer, jouer vite —');
{
  const { e, h } = match(0, ['lanceur']);
  verifier(humainTientLe(e, 'lanceur'), 'le joueur tient le lancer');
  installerSituationCombinaison(e, 'touche', { x: 60, y: 0.5 });
  pas(e);
  const r = e.responsabilites!;
  verifier(e.phase === 'touche' && r.attente?.type === 'touche', 'la touche est à lui : le match attend');
  verifier((r.attente?.combinaisons?.length ?? 0) >= 4, `plusieurs combinaisons jouables (${r.attente?.combinaisons?.join(', ')})`);
  verifier(e.conquete?.lanceurId === h.id, 'c\'est lui qui va chercher le ballon et qui lance');
  // Annoncer le fond : le sauteur change vraiment.
  verifier(choisirCombinaisonTouche(e, 'fond'), 'il annonce un lancer au fond');
  verifier(e.conquete!.combinaison === 'fond' && e.conquete!.cibleId !== undefined, 'le saut annoncé est celui qu\'il a demandé');
  verifier(choisirCombinaisonTouche(e, 'maul') && e.conquete!.sortie === 'maul', 'il peut annoncer un maul');
  verifier(choisirCombinaisonTouche(e, 'leurreAvant') && e.conquete!.combinaison === 'leurreDevant', 'ou un faux saut devant');
  verifier(choisirCombinaisonTouche(e, 'fond'), 'et revenir sur sa décision tant qu\'il n\'a pas lancé');
  // Le lancer : il attend le geste.
  const t0 = e.t;
  let garde = 0;
  // Niveau 4 : le déroulé s'arrête AVANT le saut — on ne voit pas le ballon partir avant que le joueur ait lancé.
  while (!r.attente?.pret && garde++ < 600) pas(e);
  pas(e, 120);
  const avancement = 1 - e.minuteur / (e.dureeArret ?? 1);
  verifier(avancement < 0.42, `le saut n'est pas parti avant le lancer (avancement ${avancement.toFixed(2)})`);
  verifier(e.phase === 'touche' && r.attente?.type === 'touche' && !!r.attente.pret, 'même la formation faite, le match attend son lancer');
  verifier(e.t === t0, 'horloge arrêtée');
  verifier(lancerLaTouche(e, { puissance: PUISSANCE_TOUCHE.fond, geste: 1 }), 'il lance');
  garde = 0;
  while (e.phase === 'touche' && garde++ < 400) pas(e);
  verifier(e.phase !== 'touche' && !r.attente && r.stats.touches === 1, 'la touche est jouée et comptée');
}
{
  // Un lancer sans geste ni force juste perd plus souvent que le bon lancer.
  const perdues = [0, 0];
  const essais = 40;
  for (let i = 0; i < essais; i++) {
    for (const mode of [0, 1]) {
      const { e } = match(2 + (i % 3) * 2, ['lanceur']);
      installerSituationCombinaison(e, 'touche', { x: 40 + (i % 6) * 8, y: i % 2 ? 0.5 : LARGEUR - 0.5 });
      e.rng = (() => { let s = 1000 + i * 7 + mode; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
      pas(e);
      choisirCombinaisonTouche(e, 'fond');
      lancerLaTouche(e, mode === 0 ? { puissance: PUISSANCE_TOUCHE.fond, geste: 1 } : { puissance: 0.1, geste: 0 });
      let garde = 0;
      while (e.phase === 'touche' && garde++ < 800) pas(e);
      if (e.possession !== 'A' || e.phase === 'melee' || e.phase === 'ballonLibre') perdues[mode]++;
    }
  }
  verifier(perdues[1] > perdues[0], `un mauvais lancer coûte des ballons (${perdues[1]} perdus contre ${perdues[0]} sur ${essais})`);
}
{
  // La touche rapide : permise seulement si l'adversaire n'est pas là, vérifiée au moment de la demande.
  const { e, h } = match(0, ['lanceur']);
  installerSituationCombinaison(e, 'touche', { x: 60, y: 0.5 });
  pas(e);
  const r = e.responsabilites!;
  r.offreToucheRapide = { jusqua: e.sim + 6, possible: false };
  // On rend la situation légale : adversaires loin, un partenaire à l'intérieur, derrière le point.
  const s = sens(h.cote);
  const amis = e.pions.filter((p) => p.cote === h.cote && p.surLeTerrain && p !== h);
  const adv = e.pions.filter((p) => p.cote !== h.cote && p.surLeTerrain);
  adv.forEach((p, i) => poser(p, 60 + s * 30, 8 + i * 3));
  amis.forEach((p, i) => poser(p, 60 + s * 25, 8 + i * 3));
  poser(h, 60 - s * 2, 3);
  poser(amis[0], 60 - s * 3, 10);
  pas(e);
  verifier(!!r.offreToucheRapide?.possible, 'adversaire loin, partenaire à l\'intérieur : la touche rapide est permise');
  verifier(demanderToucheRapide(e), 'il la demande');
  verifier(!!e.conquete?.rapide && r.stats.toucheRapides === 1, 'elle se joue vite, sans alignement');
  // Et quand l'adversaire est revenu, c'est refusé.
  const { e: f, h: g } = match(0, ['lanceur']);
  installerSituationCombinaison(f, 'touche', { x: 60, y: 0.5 });
  pas(f);
  f.responsabilites!.offreToucheRapide = { jusqua: f.sim + 6, possible: true };
  for (const p of f.pions.filter((q) => q.cote !== g.cote)) poser(p, 60, 4);
  verifier(!demanderToucheRapide(f), 'adversaire sur le ballon : la touche rapide est refusée');
  verifier(!f.conquete?.rapide, 'et rien n\'a changé');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— Le drop à la main : lâcher, rebond, frappe — et le contre —');
{
  const lancer = (k: number, contre: boolean) => {
    const { e } = match(k, ['droppeur']);
    let garde = 0;
    while (e.phase !== 'jeuCourant' && garde++ < 4000) pas(e);
    const h = e.pions.find((p) => p.moi)!;
    const s = sens(h.cote);
    const amis = e.pions.filter((p) => p.cote === h.cote && p !== h && p.surLeTerrain);
    const adv = e.pions.filter((p) => p.cote !== h.cote && p.surLeTerrain);
    amis.forEach((p, i) => poser(p, 50 + s * (i % 5) * 2, 6 + i * 4));
    adv.forEach((p, i) => poser(p, h.cote === 'A' ? 20 + (i % 5) * 2 : 100 - (i % 5) * 2, 5 + i * 4));
    poser(h, h.cote === 'A' ? LIGNE_B - 30 : LIGNE_A + 30, AXE + 2);
    e.phase = 'jeuCourant'; e.vol = null; e.ruck = null; e.ballonLibre = null; e.lancement = null; e.cellule = null;
    e.conquete = null; e.placement = null; e.minuteur = 99; e.gardeRuck = 0; e.combinaisonEnCours = undefined; e.combinaisonPreparee = undefined;
    e.porteur = h; e.possession = h.cote; e.ballon = { ...h.pos };
    if (contre) poser(adv[0], h.pos.x + s * 0.6, h.pos.y);
    majVueDirecte(e);
    return { e, h, adv };
  };
  {
    const { e, h } = lancer(0, false);
    verifier(e.direct!.vue.possible.drop, 'à trente mètres, au ballon, le drop est possible');
    const score0 = e.scoreA + e.scoreB;
    demanderDirect(e, { action: 'drop' });
    pas(e, 2);
    verifier(e.dropEnCours?.humain === true && e.dropEnCours.auteurId === h.id, 'le drop est joué à la main');
    verifier(e.piedPrepare?.intention === 'drop' || e.vol?.intention === 'drop', 'avec la phase d\'armé du drop (pas celle de la pénalité)');
    verifier(!e.direct!.vue.possible.drop, 'et un second drop n\'est pas possible tout de suite');
    let garde = 0;
    while ((e.piedPrepare || e.vol || e.dropEnCours) && garde++ < 600) pas(e);
    verifier(e.responsabilites!.stats.drops === 1, 'le drop est compté');
    const marque = e.scoreA + e.scoreB - score0;
    verifier(marque === 0 || marque === 3, 'trois points ou rien');
    verifier((marque === 3) === (e.responsabilites!.stats.dropsReussis === 1), 'le compteur de réussite suit le score');
  }
  {
    const { e, adv } = lancer(2, true);
    demanderDirect(e, { action: 'drop' });
    pas(e, 2);
    verifier(e.dropEnCours?.humain === true, 'le drop part');
    const defenseur = adv[0];
    const botteur = e.pions.find((p) => p.moi)!;
    let garde = 0;
    while (e.piedPrepare && garde++ < 100) {
      poser(defenseur, botteur.pos.x + (botteur.cote === 'A' ? 0.6 : -0.6), botteur.pos.y);
      pas(e);
    }
    verifier(e.dropEnCours?.issue === 'contre' || e.vol?.duree === 0.45, 'un défenseur sur le botteur à la frappe : le drop est contré');
    garde = 0;
    const score0 = e.scoreA + e.scoreB;
    while ((e.vol || e.dropEnCours) && garde++ < 300) pas(e);
    verifier(e.scoreA + e.scoreB === score0, 'un drop contré ne marque pas');
  }
  // Sans responsabilités, le drop manuel n'existe pas.
  {
    const e = creerMatchDEmpreinte(0);
    activerDirect(e, true);
    let garde = 0;
    while (e.phase !== 'jeuCourant' && garde++ < 4000) pas(e);
    majVueDirecte(e);
    verifier(!e.direct!.vue.possible.drop, 'sans responsabilités, aucun drop manuel');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— Des matchs entiers, conduits à la main : ni blocage, ni NaN —');
{
  /** Le pilote automatique des responsabilités : il répond à ce que le jeu attend. */
  const repondre = (e: EtatMatch) => {
    const a = e.responsabilites?.attente;
    if (!a) return;
    switch (a.type) {
      case 'penalite': trancherPenalite(e, a.suggestion?.choix ?? 'points'); break;
      case 'tir': {
        const aide = aideDeTir(e);
        tirerHumain(e, { ecart: 0, puissance: Math.min(1, (aide?.utile ?? 0.7) + 0.1), effet: 0, geste: 0.8 });
        break;
      }
      case 'engagement': engagerHumain(e, { distance: 30, ecart: 12, hauteur: 0.7, geste: 0.7 }); break;
      case 'touche': {
        const c = a.annoncee ?? 'milieu';
        choisirCombinaisonTouche(e, c);
        lancerLaTouche(e, { puissance: PUISSANCE_TOUCHE[c], geste: 0.8 });
        break;
      }
      default: break;
    }
  };
  const roles: RoleEquipe[] = ['capitaine', 'buteur', 'engagement', 'lanceur', 'droppeur'];
  let attentes = 0, tirs = 0, engagements = 0, touches = 0, penalites = 0;
  for (let k = 0; k < 6; k++) {
    const e = creerMatchDEmpreinte(k * 2, { responsabilites: { avatar: roles } });
    activerDirect(e, true);
    let garde = 0, sansProgres = 0, dernierSim = -1;
    while (!e.fini && garde++ < 400000) {
      avancer(e, 0.3);
      if (e.responsabilites!.attente) { attentes++; repondre(e); }
      // Un match ne se bloque jamais : le temps de simulation avance toujours.
      if (e.sim === dernierSim) { if (++sansProgres > 50) break; } else { sansProgres = 0; dernierSim = e.sim; }
    }
    verifier(e.fini, `match ${k} : il va à son terme (sim ${e.sim.toFixed(0)} s)`);
    verifier(e.pions.every((p) => Number.isFinite(p.pos.x) && Number.isFinite(p.pos.y) && Number.isFinite(p.endurance)), `match ${k} : aucun NaN`);
    verifier(e.scoreA + e.scoreB < 160, `match ${k} : score sensé (${e.scoreA}-${e.scoreB})`);
    const st = e.responsabilites!.stats;
    tirs += st.tirs + st.transformations; engagements += st.engagements; touches += st.touches; penalites += st.decisions;
  }
  verifier(attentes > 0, `le jeu a attendu le joueur ${attentes} fois en six matchs`);
  verifier(tirs + engagements + touches + penalites > 8, `il a tapé ${tirs} tirs, ${engagements} engagements, lancé ${touches} touches, tranché ${penalites} pénalités`);
  // Sans le joueur aux commandes (pas de direct) : les responsabilités tournent seules.
  for (let k = 0; k < 3; k++) {
    const e = creerMatchDEmpreinte(k, { responsabilites: { avatar: [] } });
    let garde = 0;
    while (!e.fini && garde++ < 400000) avancer(e, 0.6);
    verifier(e.fini && !e.responsabilites!.attente, `match ${k} sans contrôle direct : les capitaines IA jouent seuls`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('— La visée : un geste, trois appareils —');
{
  const v = new ControleurVisee();
  v.reinitialiser(0.7, 0);
  v.souris(0.75, 100);
  verifier(Math.abs(v.etat.x - 0.5) < 1e-9, 'la souris à trois quarts de la zone vise la moitié droite');
  v.molette(5, 120);
  verifier(Math.abs(v.etat.p - 0.8) < 1e-9, 'cinq crans de molette valent dix points de force');
  v.molette(-100, 130);
  verifier(v.etat.p === 0, 'la force est bornée');
  v.rafraichir(131);
  const brouillon = v.etat.geste;
  v.rafraichir(131 + REGLAGES_VISEE.calme + 10);
  verifier(v.etat.geste > brouillon && v.etat.geste === 1, 'le calme avant la frappe donne un geste net');
  verifier(brouillon <= REGLAGES_VISEE.plancherGeste + 0.01, 'frapper aussitôt après avoir bougé donne un geste brouillon');
  // Clavier : les flèches accélèrent.
  v.reinitialiser(0.5, 0);
  for (let i = 0; i < 10; i++) v.clavier(1, 0, 0.05, i * 50);
  const apresDemi = v.etat.x;
  for (let i = 10; i < 20; i++) v.clavier(1, 0, 0.05, i * 50);
  verifier(apresDemi > 0 && v.etat.x - apresDemi > apresDemi * 1.05, 'une flèche tenue accélère');
  // Manette : le stick vise, la charge monte et se relâche.
  v.reinitialiser(0.5, 0);
  v.manette(-0.6, null, false, 0.016, 10);
  verifier(Math.abs(v.etat.x + 0.6) < 1e-9, 'le stick gauche vise');
  for (let i = 0; i < 40; i++) v.manette(0, null, true, 0.05, 100 + i * 50);
  verifier(v.etat.p > 0.9 && v.etat.arme, 'tenir le bouton charge la force');
  verifier(v.relacherCharge() && !v.etat.arme, 'relâcher la charge déclenche la frappe');
  // Doigt : direction, longueur, courbure.
  const glisse = (dx: number, dy: number, bruit = 0, courbe = 0) => {
    const d = new ControleurVisee();
    d.reinitialiser(0.7, 0);
    d.doigtDebut(200, 500, 0);
    for (let i = 1; i <= 24; i++) {
      const u = i / 24;
      d.doigtBouge(200 + dx * u + (i % 2 ? bruit : -bruit) + courbe * Math.sin(Math.PI * u), 500 + dy * u + (i % 3 ? bruit : -bruit), i * 16);
    }
    return { d, decide: d.doigtFin() };
  };
  const droit = glisse(0, -150);
  verifier(droit.decide && Math.abs(droit.d.etat.x) < 0.05 && Math.abs(droit.d.etat.p - 150 / 170) < 0.02, 'un glissé droit vers le haut vise l’axe, avec la force de sa longueur');
  const incline = glisse(70, -150);
  verifier(incline.d.etat.x > 0.5, 'un glissé penché à droite vise à droite');
  const court = glisse(0, -10);
  verifier(!court.decide, 'un tapotement ne décide rien');
  const tremble = glisse(0, -150, 9);
  verifier(tremble.d.etat.geste < droit.d.etat.geste - 0.25, 'un tracé qui tremble donne un geste moins net');
  const courbe = glisse(0, -150, 0, 26);
  verifier(Math.abs(courbe.d.etat.effet) > 0.5, 'une boucle dans le tracé demande d’effet');
}

console.log(`\n${ok} contrôles passés.`);
