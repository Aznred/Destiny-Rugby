// LE CONTRÔLE DIRECT, MESURÉ — Correctif 16 (`moteur/direct.ts` + « pilotage direct » de `moteur.ts`).
//
// Ce banc ne regarde pas des images : il joue des situations construites et de vrais
// matchs avec un pilote automatique à la place des doigts, et vérifie ce qui ne doit
// jamais arriver (téléportation, virage instantané, passe en avant gratuite,
// plaquage tout seul) ainsi que ce qui doit arriver (le ballon sert l'appelant
// démarqué, le plaquage lancé plaque, le geste armé au bon moment compte).
//
// Lancer : npm run verify:controle-direct
import assert from 'node:assert/strict';
import { avancer, DT } from '../src/lib/moteur/moteur';
import type { EtatMatch } from '../src/lib/moteur/etat';
import type { Pion } from '../src/lib/moteur/entites';
import {
  REGLAGES_DIRECT, activerDirect, chanceDeLeServir, choisirReceveur, classerCoupDePied, commanderDirect, deplacerHumain,
  demanderDirect, humainPilote, jugerAppel, majVueDirecte, receveursDuCote, vitesseVoulue,
} from '../src/lib/moteur/direct';
import { AXE, LARGEUR, LONGUEUR, MILIEU, sens } from '../src/lib/moteur/terrain';
import { creerMatchDEmpreinte, empreinte, jouerPourEmpreinte, resumerMatch } from './outilsEmpreinte';
import { detailNote, noterMatch, statsPourLaNote, type StatsMatchJoueur } from '../src/lib/moteur/apresMatch';
import { statsDirectesVides } from '../src/lib/moteur/direct';

let ok = 0;
const verifier = (condition: unknown, message: string) => { assert.ok(condition, message); ok++; };
const pas = (e: EtatMatch, n = 1) => { for (let i = 0; i < n; i++) avancer(e, DT); };

/** Un match de carrière 3D, la main passée au pilote, jusqu'à ce que le jeu soit ouvert. */
function matchOuvert(k: number): { e: EtatMatch; h: Pion } {
  const e = creerMatchDEmpreinte(k);
  activerDirect(e, true);
  let garde = 0;
  while (e.phase !== 'jeuCourant' && garde++ < 4000) pas(e);
  const h = e.pions.find((p) => p.moi)!;
  return { e, h };
}

/** Pose un pion sans histoire : à l'arrêt, debout, là où on le veut. */
function poser(p: Pion, x: number, y: number, vx = 0, vy = 0): void {
  p.pos = { x, y }; p.cible = { x, y }; p.vitesse = { x: vx, y: vy };
  p.corps = undefined; p.battu = 0; p.sanction = 0; p.surLeTerrain = true; p.role = 'ligne';
}

/** Une situation de jeu ouvert : le joueur au ballon, ses partenaires rangés à la main, les adversaires loin. */
function situation(k: number): { e: EtatMatch; h: Pion; amis: Pion[]; adv: Pion[] } {
  const { e, h } = matchOuvert(k);
  const amis = e.pions.filter((p) => p.cote === h.cote && p !== h && p.surLeTerrain);
  const adv = e.pions.filter((p) => p.cote !== h.cote && p.surLeTerrain);
  // Tout le monde loin du point d'essai, sur des rangées qui ne se gênent pas.
  amis.forEach((p, i) => poser(p, 30 + (i % 7) * 3, 6 + i * 4));
  adv.forEach((p, i) => poser(p, 95 + (i % 5) * 2.5, 5 + i * 4));
  e.phase = 'jeuCourant'; e.vol = null; e.ruck = null; e.ballonLibre = null; e.piedPrepare = undefined as never;
  delete e.piedPrepare;
  e.lancement = null; e.cellule = null; e.duel = null; e.conquete = null; e.placement = null; e.blocPrepare = null;
  e.minuteur = 99; e.gardeRuck = 0; e.combinaisonEnCours = undefined; e.combinaisonPreparee = undefined;
  return { e, h, amis, adv };
}

function donnerLeBallon(e: EtatMatch, p: Pion): void {
  e.porteur = p; e.possession = p.cote; e.ballon = { x: p.pos.x, y: p.pos.y };
  e.origine = { x: p.pos.x - sens(p.cote) * 3, y: p.pos.y }; e.ligneAvantage = p.pos.x;
}

console.log('— La course : un cap et une allure qu\'on infléchit —');
{
  const { h } = matchOuvert(0);
  poser(h, 40, AXE);
  const s = sens(h.cote);
  const vmax = vitesseVoulue(h, 1, true);
  const marche = vitesseVoulue(h, 0.35, false);
  verifier(marche > 0 && marche < vitesseVoulue(h, 1, false), 'une commande partielle donne une allure partielle');
  verifier(vitesseVoulue(h, 0.1, false) === 0, 'sous la zone morte, on ne bouge pas');
  verifier(vmax <= REGLAGES_DIRECT.plafondVitesse + 1e-9, 'jamais plus de 10,9 m/s');
  // Départ arrêté, stick droit devant : l'allure monte avec l'accélération, sans à-coup.
  const course0 = vitesseVoulue(h, 1, false);
  let v0 = 0, maxPas = 0, maxAcc = 0;
  for (let i = 0; i < 24; i++) {
    const avant = { x: h.pos.x, y: h.pos.y };
    deplacerHumain(h, DT, { mx: s, my: 0, sprint: false });
    const v = Math.hypot(h.vitesse.x, h.vitesse.y);
    maxAcc = Math.max(maxAcc, (v - v0) / DT);
    maxPas = Math.max(maxPas, Math.hypot(h.pos.x - avant.x, h.pos.y - avant.y));
    v0 = v;
  }
  verifier(maxAcc <= h.acceleration * REGLAGES_DIRECT.vivacite + 1e-6, `accélération bornée (${maxAcc.toFixed(2)} m/s²)`);
  verifier(maxPas <= course0 * DT * 1.001, 'aucun pas ne dépasse la vitesse voulue');
  verifier(v0 > course0 * 0.93, 'il atteint sa course');
  // Un demi-tour à pleine course : un arc, pas un point.
  let capPrecedent = Math.atan2(h.vitesse.y, h.vitesse.x), maxVirage = 0, vitesseMin = Infinity;
  for (let i = 0; i < 40; i++) {
    deplacerHumain(h, DT, { mx: -s, my: 0, sprint: false });
    const v = Math.hypot(h.vitesse.x, h.vitesse.y);
    vitesseMin = Math.min(vitesseMin, v);
    if (v > 0.5) {
      const cap = Math.atan2(h.vitesse.y, h.vitesse.x);
      maxVirage = Math.max(maxVirage, Math.abs(Math.atan2(Math.sin(cap - capPrecedent), Math.cos(cap - capPrecedent))));
      capPrecedent = cap;
    }
  }
  verifier(maxVirage <= REGLAGES_DIRECT.virageMax * DT + 1e-6, `le cap tourne d'au plus ${(REGLAGES_DIRECT.virageMax * DT * 57.3).toFixed(0)}° par pas (mesuré ${(maxVirage * 57.3).toFixed(0)}°)`);
  verifier(vitesseMin < 3, `un demi-tour ralentit vraiment (jusqu'à ${vitesseMin.toFixed(1)} m/s)`);
  // L'endurance : le sprint coûte plus qu'une course.
  const a = creerMatchDEmpreinte(0).pions.find((p) => p.moi)!, b = creerMatchDEmpreinte(0).pions.find((p) => p.moi)!;
  poser(a, 40, AXE); poser(b, 40, AXE);
  for (let i = 0; i < 40; i++) { deplacerHumain(a, DT, { mx: s, my: 0, sprint: true }); deplacerHumain(b, DT, { mx: s, my: 0, sprint: false }); }
  verifier(100 - a.endurance > (100 - b.endurance) * 1.6, `le sprint vide l'endurance bien plus vite (${(100 - a.endurance).toFixed(1)} contre ${(100 - b.endurance).toFixed(1)} en 6 s)`);
  // Lâcher le stick : il s'arrête en moins de deux secondes, sans glisser indéfiniment.
  let n = 0;
  while (Math.hypot(a.vitesse.x, a.vitesse.y) > 0.05 && n < 60) { deplacerHumain(a, DT, { mx: 0, my: 0, sprint: false }); n++; }
  verifier(n * DT < 2.2, `il s'arrête en ${(n * DT).toFixed(1)} s`);
}

console.log('— Les passes : du bon côté, jamais en avant —');
{
  const { e, h, amis } = situation(0);
  const s = sens(h.cote);
  poser(h, 60, AXE);
  donnerLeBallon(e, h);
  // Deux partenaires à sa gauche (y croissant pour le camp A), un à sa droite, un devant lui.
  const gauche = s === 1 ? 1 : -1;
  poser(amis[0], 56, AXE + gauche * 5);       // proche, à gauche
  poser(amis[1], 53, AXE + gauche * 12);      // loin, à gauche
  poser(amis[2], 57, AXE - gauche * 6);       // proche, à droite
  poser(amis[3], 64, AXE + gauche * 4);       // DEVANT lui, à gauche : jamais
  const versGauche = { x: 0, y: gauche }, versDroite = { x: 0, y: -gauche };
  verifier(choisirReceveur(e, h, versGauche, false) === amis[0], 'la passe à gauche sert le plus proche à gauche');
  verifier(choisirReceveur(e, h, versGauche, true) === amis[1], 'la passe sautée à gauche saute le premier');
  verifier(choisirReceveur(e, h, versDroite, false) === amis[2], 'la passe à droite sert celui de droite');
  verifier(!receveursDuCote(e, h, versGauche, true).some((r) => r.pion === amis[3]), 'on ne passe jamais à quelqu\'un qui est devant');
  // Dans le moteur : la passe part, le ballon vole vers le bon joueur.
  majVueDirecte(e);
  demanderDirect(e, { action: 'passe', vers: versGauche });
  pas(e);
  verifier(e.vol?.type === 'passe' && e.vol.receveur === amis[0], 'la passe demandée part vers le bon receveur');
  verifier(e.direct!.stats.passesReussies >= 1, 'elle est comptée à la feuille du jeu direct');
}

console.log('— Le plaquage : manuel, à portée, et pas tout seul —');
{
  // Sans demande, un joueur de l'IA plaque ; le pion du joueur, non.
  const { e, h, adv } = situation(1);
  const s = sens(h.cote);
  const porteur = adv[0];
  poser(h, 60, AXE);
  poser(porteur, 60 + s * 1.2, AXE, -s * 0.5, 0);      // au contact, immobile
  donnerLeBallon(e, porteur);
  porteur.cible = { x: porteur.pos.x, y: porteur.pos.y };
  majVueDirecte(e);
  pas(e, 4);
  verifier(e.phase === 'jeuCourant' && e.porteur === porteur && !porteur.corps, 'collé au porteur, sans rien demander, le pion du joueur ne plaque pas');
}
{
  const { e, h, adv } = situation(1);
  const s = sens(h.cote);
  const porteur = adv[0];
  poser(h, 60, AXE, s * 4, 0);
  poser(porteur, 60 + s * 3.0, AXE, -s * 2, 0);       // à trois mètres, il vient sur nous
  donnerLeBallon(e, porteur);
  majVueDirecte(e);
  verifier(e.direct!.vue.possible.plaquage, 'à trois mètres du porteur, plaquer est possible');
  demanderDirect(e, { action: 'plaquage' });
  let plaque = false;
  for (let i = 0; i < 10 && !plaque; i++) { pas(e); plaque = e.phase === 'ruck' || !!porteur.corps || e.phase === 'penalite'; }
  verifier(plaque, `un plaquage lancé sur un porteur qui arrive plaque (phase ${e.phase})`);
  verifier(h.stats.plaquages + h.stats.plaquagesManques >= 1, 'le duel est inscrit à sa feuille');
}
{
  const { e, h, adv } = situation(1);
  const s = sens(h.cote);
  const porteur = adv[0];
  poser(h, 60, AXE);
  poser(porteur, 60 + s * 12, AXE, s * 8, 0);          // s'éloigne à pleine vitesse
  donnerLeBallon(e, porteur);
  majVueDirecte(e);
  verifier(!e.direct!.vue.possible.plaquage, 'à douze mètres, plaquer n\'est pas proposé');
  poser(porteur, 60 + s * 3.2, AXE, s * 9, 0);         // s'éloigne, juste à portée
  majVueDirecte(e);
  demanderDirect(e, { action: 'plaquage' });
  pas(e, 9);
  verifier(!!h.corps || h.battu > 0 || e.phase !== 'jeuCourant', 'un plaquage lancé dans le vide laisse le joueur au sol ou hors du coup');
  verifier(e.direct!.stats.plaquagesDansLeVide >= 1 || e.phase === 'ruck', 'et il est compté comme un plaquage dans le vide');
}

console.log('— Le coup de pied : la visée devient une intention —');
{
  const { e, h } = situation(2);
  const s = sens(h.cote);
  poser(h, MILIEU - s * 8, AXE);
  donnerLeBallon(e, h);
  const plan = (x: number, y: number, puissance: number) => classerCoupDePied(e, h, { visee: { x, y, puissance } });
  verifier(plan(s, 0, 0.12).intention === 'rasant' || plan(s, 0, 0.12).intention === 'parDessus', 'une touche : un petit coup de pied');
  verifier(plan(s, 0.05, 0.45).intention === 'chandelle', 'vers l\'avant, moyen : une chandelle');
  verifier(['occupation', 'cinquanteVingtDeux', 'degagement'].includes(plan(s, 0.1, 0.95).intention), 'vers l\'avant, à fond : de la longueur');
  const touche = plan(s * 0.3, 1, 0.9);
  verifier(touche.arrivee.y >= LARGEUR || touche.arrivee.y <= 0 || touche.intention === 'occupation', 'vers la touche : le ballon cherche la touche');
  const arriere = plan(-s, 0, 1);
  verifier(arriere.arrivee.x * s >= h.pos.x * s, 'jamais de coup de pied vers l\'arrière');
  const auto = classerCoupDePied(e, h, { auto: true });
  verifier(!!auto.intention, 'sans visée, la situation choisit');
  // Dans le moteur, le coup de pied lance un vol et le ballon part de la main du porteur.
  majVueDirecte(e);
  demanderDirect(e, { action: 'coupDePied', visee: { x: s, y: 0, puissance: 0.6 } });
  pas(e, 12);
  verifier(e.vol?.type === 'pied' || e.phase === 'ballonEnLAir' || e.phase === 'ballonLibre' || e.phase === 'touche' || e.piedPrepare, 'le coup de pied voulu part');
  verifier(h.stats.coupsDePied >= 1, 'il est inscrit à sa feuille');
}

console.log('— Réclamer le ballon : démarqué, on est servi ; couvert ou devant, non —');
{
  // Mesure : un porteur de l'IA court, le joueur appelle. Sur beaucoup de tirages, qui reçoit ?
  const mesure = (couvert: boolean, devant: boolean): number => {
    let servi = 0;
    const essais = 60;
    for (let k = 0; k < essais; k++) {
      const { e, h, amis, adv } = situation(k % 6);
      const s = sens(h.cote);
      const porteur = amis[0];
      poser(porteur, 60, AXE, s * 5, 0);
      donnerLeBallon(e, porteur);
      // Devant le ballon : assez loin pour que le porteur ne le dépasse pas pendant la mesure.
      poser(h, 60 + s * (devant ? 16 : -6), AXE + 9);
      adv.forEach((p, i) => poser(p, 85, 5 + i * 4));
      // L'adversaire loin du porteur : le contact n'arrive pas avant l'appel.
      poser(adv[1], 64, AXE - 12);
      majVueDirecte(e);
      e.rng = (() => { let g = 1234567 + k * 7919; return () => { g = (g * 1664525 + 1013904223) % 4294967296; return g / 4294967296; }; })();
      demanderDirect(e, { action: 'appel' });
      for (let i = 0; i < 14 && e.phase === 'jeuCourant' && e.porteur === porteur && !e.vol; i++) {
        // Le marqueur reste collé au joueur : sinon l'IA l'envoie sur le porteur et l'appelant se démarque seul.
        if (couvert) poser(adv[0], h.pos.x + s * 1.2, h.pos.y + 0.5);
        pas(e);
      }
      if (e.vol?.receveur === h || e.porteur === h) servi++;
    }
    return servi / essais;
  };
  const libre = mesure(false, false), couvert = mesure(true, false), devant = mesure(false, true);
  console.log(`  appel démarqué : ${(libre * 100).toFixed(0)} % servi · couvert : ${(couvert * 100).toFixed(0)} % · devant le ballon : ${(devant * 100).toFixed(0)} %`);
  verifier(libre >= 0.6, 'démarqué, l\'appelant est servi la plupart du temps');
  verifier(couvert < libre * 0.45, 'couvert, il l\'est bien moins');
  verifier(devant === 0, 'devant le ballon, on ne l\'entend même pas');
  const { e, h, amis } = situation(0);
  poser(amis[0], 60, AXE); donnerLeBallon(e, amis[0]); poser(h, 54, AXE + 10);
  const j = jugerAppel(e, h, amis[0]);
  verifier(j.force > 0.4 && ['large', 'soutien', 'intervalle'].includes(j.type), `l'appel démarqué à dix mètres de large est lu comme « ${j.type} »`);
  verifier(chanceDeLeServir(e, amis[0], h) === 0, 'sans appel en vigueur, personne ne le sert');
}

console.log('— Un match entier au pilote automatique —');
{
  // Le pilote court vers son poste, appelle, passe, plaque. Rien d'illégal ne doit en sortir.
  let totalPas = 0, maxVitesse = 0, nan = 0, tele = 0, passes = 0, plaquages = 0, appels = 0;
  for (const k of [0, 1, 2, 3]) {
    const e = creerMatchDEmpreinte(k);
    activerDirect(e, true);
    const h = e.pions.find((p) => p.moi)!;
    let dernier = { x: h.pos.x, y: h.pos.y };
    let garde = 0;
    e.apresPas = (m: EtatMatch) => {
      const q = m.pions.find((p) => p.moi)!;
      if (!Number.isFinite(q.pos.x) || !Number.isFinite(q.pos.y) || !Number.isFinite(q.endurance)) nan++;
      const v = Math.hypot(q.vitesse.x, q.vitesse.y);
      maxVitesse = Math.max(maxVitesse, v);
      const saut = Math.hypot(q.pos.x - dernier.x, q.pos.y - dernier.y);
      // Un remplacement, un carton, un ruck ou un retour de carton déplacent le pion : seul le jeu ouvert compte.
      if (humainPilote(m, q) && m.phase === 'jeuCourant' && saut > 12.5 * DT + 1.2 && !q.corps) tele++;
      dernier = { x: q.pos.x, y: q.pos.y };
      totalPas++;
    };
    while (!e.fini && garde++ < 200000) {
      const p = e.pions.find((q) => q.moi)!;
      const d = e.direct!;
      if (humainPilote(e, p)) {
        const sug = d.vue.suggestion ?? e.ballon;
        const cible = e.porteur === p ? { x: p.pos.x + sens(p.cote) * 20, y: p.pos.y } : sug;
        const dx = cible.x - p.pos.x, dy = cible.y - p.pos.y, n = Math.hypot(dx, dy) || 1;
        commanderDirect(e, n > 1.5 ? dx / n : 0, n > 1.5 ? dy / n : 0, n > 14 && p.endurance > 40);
        const v = d.vue;
        if (v.possible.plaquage && garde % 3 === 0) { demanderDirect(e, { action: 'plaquage' }); plaquages++; }
        else if (v.possible.appel && garde % 11 === 0) { demanderDirect(e, { action: 'appel' }); appels++; }
        else if (v.porte && v.contactImminent && garde % 2 === 0) demanderDirect(e, { action: 'raffut' });
        else if (v.porte && garde % 17 === 0) { demanderDirect(e, { action: 'passe', vers: { x: 0, y: sens(p.cote) } }); passes++; }
        else if (v.possible.grattage) demanderDirect(e, { action: 'grattage' });
        else if (v.possible.engager && garde % 5 === 0) demanderDirect(e, { action: 'engager' });
      }
      avancer(e, DT * 2);
    }
    verifier(e.fini, `le match ${k} va à son terme avec un pilote humain`);
  }
  verifier(nan === 0, 'aucune valeur absurde (NaN) dans le pion du joueur');
  verifier(maxVitesse <= REGLAGES_DIRECT.plafondVitesse + 1.5, `jamais plus de ${(REGLAGES_DIRECT.plafondVitesse + 1.5).toFixed(1)} m/s (mesuré ${maxVitesse.toFixed(1)})`);
  verifier(tele === 0, `aucune téléportation en jeu ouvert (${tele} sauts)`);
  console.log(`  ${totalPas} pas · ${passes} passes demandées · ${plaquages} plaquages demandés · ${appels} appels`);
}

console.log('— Éteint, le moteur rejoue à l\'identique —');
{
  const a = empreinte(resumerMatch(jouerPourEmpreinte(0)));
  const b = empreinte(resumerMatch(jouerPourEmpreinte(0, (e) => { activerDirect(e, true); activerDirect(e, false); })));
  verifier(a === b, `activer puis éteindre ne change rien (${a} contre ${b})`);
  void LONGUEUR;
}

// ---------------------------------------------------------------------------
console.log('— La note : le jeu à la manette entre dans le barème, borné, et seulement quand on a conduit —');
{
  const { e, h } = matchOuvert(0);
  // Un match mené par l'IA : aucune ligne nouvelle, la note d'avant.
  h.minutes = 60; h.stats.plaquages = 6; h.stats.metres = 40;
  const sansDirect = statsPourLaNote(h, null);
  const lignesIA = detailNote(h.poste, sansDirect).map((l) => l.cle);
  verifier(!lignesIA.some((c) => ['ml.note.placement', 'ml.note.soutien', 'ml.note.appels', 'ml.note.fautes'].includes(c)),
    'sans contrôle direct, aucune ligne du jeu à la manette');
  const vides = statsDirectesVides();
  verifier(statsPourLaNote(h, vides).directTemps === undefined, 'un contrôle direct jamais utilisé (tempsJeu = 0) ne pose rien');
  void e;

  const bonJoueur: StatsMatchJoueur = {
    ...sansDirect, directTemps: 400, directAuPoste: 360, directHorsPoste: 40, directSoutien: 220,
    appels: 9, appelsServis: 5, appelsIgnores: 4, passesReussies: 20,
  };
  const mauvais: StatsMatchJoueur = {
    ...sansDirect, directTemps: 400, directAuPoste: 120, directHorsPoste: 280, directSoutien: 0,
    appels: 12, appelsServis: 0, appelsIgnores: 12, passesInterceptees: 6, ballonsPerdus: 5, plaquagesDansLeVide: 9, fautes: 8,
  };
  const note0 = noterMatch(h.poste, sansDirect), noteBon = noterMatch(h.poste, bonJoueur), noteMauvais = noterMatch(h.poste, mauvais);
  verifier(noteBon > note0, `un bon placement et des appels servis relèvent la note (${note0} → ${noteBon})`);
  verifier(noteMauvais < note0, `hors poste, des passes interceptées et des fautes l'abaissent (${note0} → ${noteMauvais})`);
  // Les groupes sont plafonnés : +1,1 au plus, −2 au plus.
  const somme = (s: StatsMatchJoueur, signe: 1 | -1) => detailNote(h.poste, s)
    .filter((l) => l.cle.startsWith('ml.note.') && ['placement', 'soutien', 'appels', 'passesReussies', 'interceptions', 'ballonsPerdus', 'plaquagesDansLeVide', 'fautes'].some((k) => l.cle === `ml.note.${k}`))
    .reduce((a, l) => a + (l.points * signe > 0 ? l.points : 0), 0);
  verifier(somme(bonJoueur, 1) <= 1.1 + 1e-9, `le groupe positif est plafonné à +1,1 (${somme(bonJoueur, 1).toFixed(2)})`);
  verifier(somme(mauvais, -1) >= -2 - 1e-9, `le groupe négatif est plafonné à −2 (${somme(mauvais, -1).toFixed(2)})`);
  // Moins d'une minute et demie de jeu conduit : pas de ligne (on ne juge pas trente secondes).
  const court = { ...mauvais, directTemps: 60 };
  verifier(noterMatch(h.poste, court) === note0, 'moins de 90 s de jeu conduit : la note ne bouge pas');
}

console.log(`OK — ${ok} contrôles du contrôle direct.`);
