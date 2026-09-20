import assert from 'node:assert/strict';
import { avancer, creerMatch, demanderRemplacement, bilan } from '../src/lib/moteur/moteur';
import { avancerArbitre, avancerCorps, creerArbitre, declencherChute, jouerGeste, visibiliteFaute } from '../src/lib/moteur/dynamique';
import { orientationSprite } from '../src/lib/moteur/orientationSprite';
import { effectifDuClub } from '../src/lib/effectif';
import { interpolerEtatDirect, projeterImageDirect } from '../src/lib/ligue/interpolationDirect';
import type { TerrainDirect } from '../src/lib/ligue/matchCarriere';
import { resoudreBagarre } from '../src/lib/moteur/bagarre';

function match(cle = 'dynamique') {
  return creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1), 27, 24, cle, undefined, { tempsReel: true, scoreSurTerrain: true });
}
const e = match();
e.arbitre = creerArbitre();
e.ballon = { x: 115, y: 65 };
for (let i = 0; i < 120; i++) {
  const avant = { ...e.arbitre.pos };
  const vitesse = { ...e.arbitre.vitesse };
  avancerArbitre(e, .15);
  assert.ok(Math.hypot(e.arbitre.pos.x - avant.x, e.arbitre.pos.y - avant.y) <= 7.6 * .15 + 1e-8, 'Arbitre : déplacement borné.');
  assert.ok(Math.hypot(e.arbitre.vitesse.x - vitesse.x, e.arbitre.vitesse.y - vitesse.y) <= 4.8 * .15 + 1e-8, 'Arbitre : accélération bornée.');
  if (i === 60) e.ballon = { x: 5, y: 5 };
}
const p = e.pions[0]!;
e.pions.forEach(q => { q.surLeTerrain = false; });
e.arbitre = { pos: { x: 30, y: 30 }, vitesse: { x: 0, y: 0 }, regard: 0 };
const clair = visibiliteFaute(e, { x: 40, y: 30 });
assert.ok(clair > .6);
assert.equal(visibiliteFaute(e, { x: 20, y: 30 }), 0, 'Faute derrière le dos non vue.');
assert.equal(visibiliteFaute(e, { x: 80, y: 30 }), 0, 'Faute trop éloignée non vue.');
p.surLeTerrain = true; p.pos = { x: 35, y: 30 };
assert.ok(visibiliteFaute(e, { x: 40, y: 30 }) < clair, 'Un joueur masque la vue.');

p.pos = { x: 50, y: 35 };
declencherChute(p, { x: 4, y: 1 }, 2);
const debut = { ...p.pos };
for (let i = 0; i < 12; i++) {
  const avant = { ...p.pos };
  avancerCorps(e, .15);
  assert.ok(Math.hypot(p.pos.x - avant.x, p.pos.y - avant.y) < 1, 'La chute ne téléporte pas le corps.');
  const c = p.corps!;
  assert.ok(c.points.every(q => Number.isFinite(q.x) && Number.isFinite(q.y)));
  assert.ok(Math.abs(Math.hypot(c.points[1]!.x - c.points[0]!.x, c.points[1]!.y - c.points[0]!.y) - .48) < .03, 'Le tronc ne se disloque pas.');
}
assert.ok(p.pos.x > debut.x + .1 && p.pos.x < debut.x + 3, 'Inertie physique réelle mais contrôlée.');
avancerCorps(e, .3);
assert.equal(p.corps, undefined, 'La chute libère ensuite le joueur.');

const innocent = e.pions[1]!;
innocent.surLeTerrain = true; p.moi = true;
e.fautesVues = { [p.id]: false, [innocent.id]: false };
e.bagarre = { origine: 'moi', adversaire: innocent, coupPorte: true, attente: 0, ordre: 'reculer', resume: [] };
const verdict = resoudreBagarre(e);
assert.equal(verdict.fauteVue, false);
assert.equal(p.stats.cartonsJaunes + p.stats.cartonsRouges, 0, 'Pas de sanction automatique pour une faute non vue.');

assert.equal(orientationSprite({ x: 1, y: 0 }, 0), 'right');
assert.equal(orientationSprite({ x: -1, y: 0 }, 0), 'left');
assert.equal(orientationSprite({ x: 1, y: 0 }, -90), 'back');
assert.equal(orientationSprite({ x: -1, y: 0 }, -90), 'front');
assert.equal(orientationSprite({ x: 0, y: 1 }, -90), 'right');
assert.equal(orientationSprite({ x: 1, y: 0 }, 90), 'front');

const changement = match('remplacements-role');
const sortant = changement.pions.find(q => q.cote === 'A' && q.numero === 10)!;
const entrant = changement.pions.find(q => q.cote === 'A' && !q.surLeTerrain)!;
const maillot = entrant.numero;
sortant.buteur = true; sortant.capitaine = true;
assert.ok(demanderRemplacement(changement, 'A', entrant.sourceId, sortant.sourceId));
avancer(changement, .15);
assert.ok(entrant.surLeTerrain && !sortant.surLeTerrain);
assert.equal(entrant.numero, 10);
assert.equal(entrant.numeroMaillot, maillot);
assert.equal(entrant.poste, sortant.poste);
assert.ok(entrant.buteur && entrant.capitaine);
assert.equal(new Set(changement.pions.filter(q => q.cote === 'A' && q.surLeTerrain).map(q => q.numero)).size, 15);
avancer(changement, .15);
assert.equal(bilan(changement).parJoueur.find(q => q.nom === entrant.nom)?.numero, maillot, 'La feuille conserve le numéro porté.');

const a: TerrainDirect = {
  pions: ['a', 'b'].map((id, i) => ({ id, nom: id, numero: 10 + i, poste: 'demi_ouverture', cote: 'domicile', x: 30 + i * 10, y: 30, vx: 4, vy: 0 })),
  ballon: { x: 30, y: 30 }, porteurId: 'a', phase: 'jeuCourant', systeme: 'glissee', possession: 'domicile',
  sequence: 1, metresGagnes: 0, ballonLent: false, cadence: 1, horloge: 20, instantJeu: 1200, simulation: 100,
};
const b: TerrainDirect = { ...a, instantJeu: 1202, simulation: 102, porteurId: 'b',
  gestes: [{ id: 'pass1', joueurId: 'a', clip: 'pass', debut: 100.5, duree: 1 }],
  volsRecents: [{ de: { x: 30, y: 30 }, vers: { x: 40, y: 30 }, duree: .5, ecoule: 1.5, hauteur: 1, type: 'passe', debut: 1200.5, fin: 1201, auteurId: 'a', receveurId: 'b' }],
};
assert.equal(interpolerEtatDirect(a, b, .1).porteurId, 'a');
assert.equal(interpolerEtatDirect(a, b, .4).porteurId, undefined, 'Pendant la passe, aucun ballon collé aux mains.');
assert.equal(interpolerEtatDirect(a, b, .7).porteurId, 'b');
assert.equal(interpolerEtatDirect(a, b, .4).gestes?.[0]?.clip, 'pass', 'Une animation entièrement entre deux relevés reste visible.');
assert.deepEqual(projeterImageDirect(a, 10), projeterImageDirect(a, .7), 'La prédiction s’arrête si le réseau disparaît.');
for (let i = 0; i < 100; i++) jouerGeste(e, p, 'run');
assert.ok(e.gestes!.length <= 64, 'Mémoire réseau bornée.');

// Préparation d'une transformation avec botteur initialement très éloigné.
const tir = match('routine-buteur');
const botteur = tir.pions.find(q => q.cote === 'A' && q.numero === 10)!;
tir.phase = 'transformation'; tir.possession = 'A'; tir.porteur = null; tir.vol = null;
tir.minuteur = tir.dureeArret = 45;
tir.ballon = { x: 89, y: 35 }; botteur.pos = { x: 15, y: 10 };
tir.tir = { buteur: botteur, distance: 22, angle: 0, valeur: 2, suite: 'coupEnvoi', lieu: { ...tir.ballon }, reussi: true };
tir.placement = { [botteur.id]: { ...tir.ballon } };
let frappe = false;
for (let i = 0; i < 420; i++) {
  avancer(tir, .15);
  if (tir.vol) {
    assert.ok(tir.sim >= 44.9, 'La préparation ne doit pas être sautée.');
    assert.ok(Math.hypot(botteur.pos.x - tir.vol.de.x, botteur.pos.y - tir.vol.de.y) <= .81, 'Le pied rejoint réellement le ballon.');
    frappe = true; break;
  }
}
assert.ok(frappe, 'Le botteur finit sa préparation et frappe, sans blocage.');
console.log('OK — arbitre physique, visibilité, chute contrainte, discipline, rôles des remplaçants, mobile, horloge réseau et préparation du tir.');
