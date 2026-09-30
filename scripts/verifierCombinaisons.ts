import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { alignementCombinaison, choisirCombinaison, choisirVariante, combinaisonsValides, creerCombinaison, MAX_COMBINAISONS, origineApercu, placementsPersonnalises, receptionTouche, toucheValide } from '../src/lib/ligue/combinaisons';
import { imageApercu, positionsApercu, tracesApercu } from '../src/lib/ligue/apercuCombinaisons';
import { terrainSimulationCombinaison } from '../src/lib/ligue/simulationCombinaisons';
import { bornerVueCombinaison, commencerNavigation, poursuivreNavigation } from '../src/lib/ligue/navigationCombinaisons';
import { joueursEngagesCombinaison } from '../src/lib/ligue/placementsCombinaisons';
import { rugbyAnimations } from '../src/lib/spritesGenerateur/rugbyAnimations';
import { strategieValide, STRATEGIE_EN_LIGNE_DEFAUT, avancerMatchEnLigne, creerMatchEnLigne } from '../src/lib/ligue/matchCarriere';
import { preparerCombinaison, demarrerCombinaison, pointSurTerrain, placerCombinaison } from '../src/lib/moteur/combinaisons';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { placementMelee, placementRuck } from '../src/lib/moteur/phasesArretees';
import { structurerAttaque } from '../src/lib/moteur/tactique';
import { coteOuvert, LIGNE_A } from '../src/lib/moteur/terrain';
import { effectifDuClub } from '../src/lib/effectif';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';

const base = creerCombinaison('base');
// 10 pixels par mètre : un glissement de 50 px déplace la vue de 5 m,
// sans dépendre d'un joueur. Le pincement conserve le point sous les doigts.
const cadre = { x: 0, y: 0, largeur: 560, hauteur: 430 };
const vue = { zoom: 2, centre: { x: 50, y: 35 } };
const glissement = commencerNavigation(vue, [{ x: 300, y: 200 }], 100, cadre);
assert.deepEqual(poursuivreNavigation(glissement, [{ x: 350, y: 180 }], 100, cadre), { zoom: 2, centre: { x: 45, y: 37 } });
for (const largeurBase of [40, 65, 100]) for (const cadre of [{ x: 14, y: 120, largeur: 352, hauteur: 246 }, { x: 24, y: 170, largeur: 920, hauteur: 300 }]) {
  const milieu = { x: cadre.x + cadre.largeur * .6, y: cadre.y + cadre.hauteur * .6 };
  const contacts = [{ x: milieu.x - 40, y: milieu.y }, { x: milieu.x + 40, y: milieu.y }];
  const pincement = commencerNavigation(vue, contacts, largeurBase, cadre);
  const elargis = [{ x: milieu.x - 56, y: milieu.y }, { x: milieu.x + 56, y: milieu.y }];
  const zoomee = poursuivreNavigation(pincement, elargis, largeurBase, cadre);
  assert.equal(zoomee.zoom, 2.8);
  const sousLesDoigts = commencerNavigation(zoomee, elargis, largeurBase, cadre).ancre;
  assert.ok(Math.hypot(sousLesDoigts.x - pincement.ancre.x, sousLesDoigts.y - pincement.ancre.y) < 1e-10, 'Le point pincé reste sous les doigts, même avec les marges du SVG');
  const unDoigt = commencerNavigation(zoomee, [elargis[0]], largeurBase, cadre);
  assert.deepEqual(poursuivreNavigation(unDoigt, [elargis[0]], largeurBase, cadre), zoomee, 'Lever un doigt ne fait pas sauter la caméra');
  const limite = poursuivreNavigation(unDoigt, [{ x: 10_000, y: -10_000 }], largeurBase, cadre);
  assert.equal(limite.centre.x, largeurBase / limite.zoom / 2);
  assert.equal(limite.centre.y, 70 - largeurBase / limite.zoom * .7 / 2);
}
assert.deepEqual(bornerVueCombinaison({ zoom: .5, centre: { x: 10, y: 10 } }, 100), { zoom: 1, centre: { x: 50, y: 35 } });
assert.equal(bornerVueCombinaison({ ...vue, zoom: 10 }, 100).zoom, 3);
const precise = { ...structuredClone(base), id: 'precise', zone: 'leurs22' as const, couloir: 'gauche' as const };
assert.equal(choisirCombinaison([base, precise], 'melee', 85, 14)?.id, 'precise');
assert.equal(choisirCombinaison([base, precise], 'melee', 50, 35)?.id, 'base');
assert.equal(choisirCombinaison([base, precise], 'touche', 85, 14), undefined);
assert.equal(choisirCombinaison([{ ...precise, active: false }], 'melee', 85, 14), undefined);
assert.equal(choisirCombinaison([{ ...base, zone: 'nos22' }], 'melee', 22, 35)?.id, 'base');
assert.deepEqual(strategieValide(null), STRATEGIE_EN_LIGNE_DEFAUT);
assert.deepEqual(combinaisonsValides({ variantes: [] }), []);
const malveillant = structuredClone(base);
malveillant.variantes[0].placements = [{ numero: 99, x: Infinity, y: NaN }, { numero: 10, x: 9e6, y: -9e6 }];
malveillant.variantes[0].poids = 9e6;
malveillant.variantes[0].actions = [{ type: 'passe', destinataire: 99 }, { type: 'pied', intention: 'chandelle' }, { type: 'passe', destinataire: 10 }];
const valide = combinaisonsValides([malveillant])[0];
assert.deepEqual(valide.variantes[0].placements, [{ numero: 10, x: 35, y: -65 }]);
assert.equal(valide.variantes[0].poids, 100);
assert.deepEqual(valide.variantes[0].actions, [{ type: 'pied', intention: 'chandelle' }]);
assert.equal(combinaisonsValides(Array.from({ length: 50 }, (_, i) => ({ ...base, id: `${i}` }))).length, MAX_COMBINAISONS);
const variantes = { ...base, variantes: [{ ...base.variantes[0], nom: 'A', poids: 1 }, { ...base.variantes[0], nom: 'B', poids: 3 }] };
assert.equal(choisirVariante(variantes, () => .1).nom, 'A');
assert.equal(choisirVariante(variantes, () => .9).nom, 'B');
assert.deepEqual(toucheValide({ alignes: 99, distance: Infinity, feinte: 'oui' }), { alignes: 5, distance: 8.1, feinte: false });
assert.deepEqual(toucheValide({ alignes: 4, distance: -100, feinte: true }), { alignes: 4, distance: 5, feinte: true });
assert.equal(toucheValide({ distance: 90 }).distance, 25);
const ancienneTouche = creerCombinaison('ancienne-touche', 'touche');
delete ancienneTouche.variantes[0].touche;
assert.ok(combinaisonsValides([ancienneTouche])[0], 'Un cahier ancien reste valide');

const effectifA = effectifDuClub('Stade Toulousain', 1);
const effectifB = effectifDuClub('RC Toulon', 1);
// L'atelier doit reprendre les formations réellement calculées par le match,
// dans chaque zone et sur chaque côté, y compris la sortie du 9 au ruck.
for (const phase of ['melee', 'ruck'] as const) for (const zone of ['nos22', 'milieu', 'leurs22'] as const) for (const couloir of ['gauche', 'centre', 'droite'] as const) {
  const c = { ...creerCombinaison(`placement-${phase}-${zone}-${couloir}`, phase), zone, couloir };
  const v = c.variantes[0]; const origine = origineApercu(c);
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, c.id);
  const pions = e.pions.filter(p => p.cote === 'A' && p.surLeTerrain);
  e.ballon = { x: origine.x + LIGNE_A, y: origine.y }; e.origine = { ...e.ballon };
  e.ouvert = coteOuvert(e.ballon); e.porteur = null; e.lancement = null;
  let placement = placementMelee(pions, e.ballon, 'A');
  for (const p of pions) p.pos = { ...placement[p.id] };
  if (phase === 'ruck') {
    structurerAttaque(e, pions, 'A');
    placement = { ...Object.fromEntries(pions.map(p => [p.id, p.cible])), ...placementRuck(pions, e.ballon, 'A') };
  }
  const apercu = positionsApercu(c, v, true);
  const lies = joueursEngagesCombinaison(c, v);
  assert.deepEqual(lies, pions.filter(p => p.role === phase).map(p => p.numero), 'Seuls les joueurs réellement liés au regroupement sont verrouillés');
  assert.equal(lies.length, phase === 'melee' ? 8 : 3);
  assert.ok(!lies.includes(9), 'Le demi reste disponible pour organiser la sortie');
  for (const p of pions) assert.deepEqual(apercu[p.numero], { x: Math.max(.7, Math.min(99.3, placement[p.id].x - LIGNE_A)), y: placement[p.id].y });
  assert.equal(apercu[9].x - origine.x, phase === 'melee' ? -.5 : -1.5);
  const rendu = terrainSimulationCombinaison(c, v, imageApercu(c, v, null), null, {});
  assert.equal(rendu.phase, phase);
  if (phase === 'ruck') assert.deepEqual(rendu.gestes?.filter(g => g.clip === 'ruck_bind').map(g => Number(g.joueurId.split('-').at(-1))), lies);
}
// La sortie choisie survit à la sauvegarde et à une vraie conquête du moteur,
// puis le premier geste part du 8 lié à l'arrière ou du demi de mêlée.
for (const cote of ['A', 'B'] as const) for (const depart of [8, 9]) {
  const c = creerCombinaison(`depart-melee-${cote}-${depart}`);
  c.variantes[0].depart = depart;
  c.variantes[0].actions = [{ type: 'course', destination: { x: 8, y: 0 } }, { type: 'passe', destinataire: 10 }];
  const valide = combinaisonsValides([c])[0]; const v = valide.variantes[0];
  assert.equal(v.depart, depart);
  const initiales = positionsApercu(valide, v, true);
  assert.equal(tracesApercu(valide, v)[0].acteur, depart);
  assert.deepEqual(tracesApercu(valide, v)[0].de, initiales[depart]);
  assert.equal(imageApercu(valide, v, .5).porteur, depart);
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, c.id);
  e.phase = 'melee'; e.possession = cote; e.porteur = null; e.ballon = { x: 61, y: 35 };
  e.placement = placementMelee(e.pions, e.ballon, cote);
  for (const p of e.pions) { p.pos = { ...e.placement[p.id] }; p.cible = { ...p.pos }; p.puissance = p.plaquage = p.endurance = p.cote === cote ? 90 : 40; p.discipline = 99; }
  e.plansCombinaisons = { [cote]: [valide] }; preparerCombinaison(e, 'melee');
  e.minuteur = 0; e.rng = () => .99; avancer(e, .15);
  assert.equal(e.phase, 'jeuCourant');
  assert.equal(e.combinaisonEnCours?.variante.depart, depart);
  assert.equal(e.porteur?.numero, depart, `La mêlée ${cote} sort réellement par le n° ${depart}`);
  assert.deepEqual(e.ballon, e.porteur!.pos);
  assert.ok(e.porteur!.stats.courses > 0);
}
const ancienPlacement = structuredClone(base.variantes[0]);
ancienPlacement.placements = [9, 10, 12, 13, 14, 15].map((numero, i) => ({ numero, x: -2 - i * 2, y: -12 + i * 6 }));
assert.deepEqual(placementsPersonnalises(ancienPlacement), [], 'Les anciens exemples reprennent les positions corrigées');
ancienPlacement.placements.push({ numero: 6, x: -9, y: 7 });
assert.deepEqual(placementsPersonnalises(ancienPlacement), [{ numero: 6, x: -9, y: 7 }]);
ancienPlacement.placements[0].y++;
assert.equal(placementsPersonnalises(ancienPlacement).length, 7, 'Un placement modifié par le coach reste conservé');
// Le ballon quitte la main au lancer, passe en vol, puis appartient au receveur.
// Les gestes demandés sont ceux réellement disponibles dans le direct.
const clips = new Set(rugbyAnimations.map(a => a.id.replace(/^rugby_/, '')));
const animation = creerCombinaison('animation', 'touche');
const av = animation.variantes[0]; av.touche = { alignes: 5, distance: 9, feinte: true };
av.placements.push({ numero: 1, x: -8, y: 23 });
av.actions = [{ type: 'passe', destinataire: 9 }, { type: 'course', destination: { x: 8, y: 10 } }, { type: 'leurre', numero: 12, destination: { x: 6, y: 15 } }, { type: 'pied', intention: 'chandelle' }];
const rendu = (temps: number | null) => {
  const image = imageApercu(animation, av, temps);
  return { image, terrain: terrainSimulationCombinaison(animation, av, image, temps, { 2: 'Lanceur', 4: 'Sauteur' }) };
};
assert.equal(rendu(null).image.porteur, 2);
assert.equal(rendu(1.2).image.porteur, 2);
assert.equal(rendu(1.65).image.porteur, null);
assert.equal(rendu(1.95).image.porteur, 4);
const saut = rendu(1.65).terrain;
assert.equal(saut.pions.length, 15); assert.equal(saut.pions.find(p => p.numero === 2)?.nom, 'Lanceur');
assert.ok(saut.gestes?.some(g => g.clip === 'lineout_throw'));
assert.ok(saut.gestes?.some(g => g.clip === 'lineout_jump'));
assert.equal(saut.gestes?.filter(g => g.clip === 'lineout_lift').length, 2);
assert.ok(rendu(2.5).terrain.gestes?.some(g => g.clip.startsWith('pass')));
assert.equal(rendu(2.5).image.porteur, null);
assert.equal(rendu(2.95).image.porteur, 9);
assert.ok(Math.hypot(rendu(3.5).terrain.pions.find(p => p.numero === 9)!.vx, rendu(3.5).terrain.pions.find(p => p.numero === 9)!.vy) > 1);
assert.ok(Math.hypot(rendu(4.5).terrain.pions.find(p => p.numero === 12)!.vx, rendu(4.5).terrain.pions.find(p => p.numero === 12)!.vy) > 1);
assert.equal(rendu(5.65).image.porteur, null); assert.ok(rendu(5.65).image.hauteurBallon > 3);
assert.ok(rendu(5.65).terrain.gestes?.some(g => g.clip === 'chip'));
assert.deepEqual(rendu(3), rendu(3), 'Une pause ou un retour dans le tracé produit la même pose');
assert.deepEqual(rendu(3).image.positions[1], positionsApercu(animation, av)[1], 'La feinte ne rétablit pas l’ancien alignement après la sortie');
const departAvant = structuredClone(animation);
departAvant.variantes[0].actions = [{ type: 'leurre', numero: 1, destination: { x: 6, y: 18 } }];
const avantPrise = imageApercu(departAvant, departAvant.variantes[0], 1.999).positions[1];
const apresPrise = imageApercu(departAvant, departAvant.variantes[0], 2).positions[1];
assert.ok(Math.hypot(avantPrise.x - apresPrise.x, avantPrise.y - apresPrise.y) < .01, 'L’appel immédiat d’un avant reste continu à la réception');
for (let instant = 0; instant <= 6; instant += .05) {
  const { image, terrain } = rendu(instant);
  for (const pion of terrain.pions) for (const n of [pion.x, pion.y, pion.vx, pion.vy]) assert.ok(Number.isFinite(n));
  for (const geste of terrain.gestes ?? []) assert.ok(clips.has(geste.clip), `Animation absente : ${geste.clip}`);
  assert.equal(Boolean(terrain.porteurId), image.porteur !== null);
  assert.ok(image.hauteurBallon >= 0);
}
// Le lancer, son sauteur et son alignement concordent avec le tracé, dans
// les deux sens d'attaque et sur les deux lignes de touche.
for (const cote of ['A', 'B'] as const) for (const bord of [0, 70]) for (const distance of [5, 9, 15]) {
  const c = creerCombinaison(`lancer-${cote}-${bord}-${distance}`, 'touche');
  c.couloir = (cote === 'A' ? bord : 70 - bord) > 35 ? 'droite' : 'gauche';
  const v = c.variantes[0]; v.sauteur = 8;
  v.touche = { alignes: distance === 5 ? 4 : distance === 9 ? 5 : 7, distance, feinte: distance === 9 };
  const formation = alignementCombinaison(v);
  assert.equal(formation.length, v.touche.alignes);
  assert.equal(formation.find(p => p.numero === 8)?.distance, distance);
  assert.equal(new Set(formation.map(p => p.numero)).size, formation.length);
  const apercu = positionsApercu(c, v, true);
  const traces = tracesApercu(c, v);
  const lancer = traces.find(t => t.acteur === 2 && !t.action)!;
  assert.deepEqual(lancer.de, apercu[2]); assert.deepEqual(lancer.vers, apercu[8]);
  assert.equal(Math.abs(lancer.vers.y - (c.couloir === 'droite' ? 70 : 0)), distance);
  assert.deepEqual(imageApercu(c, v, null).ballon, apercu[2]);
  const finLancer = traces.indexOf(lancer) + 1;
  assert.deepEqual(imageApercu(c, v, finLancer).ballon, apercu[8]);
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, c.id);
  e.phase = 'touche'; e.possession = cote; e.ballon = { x: 90, y: bord === 0 ? .6 : 69.4 };
  e.conquete = { type: 'touche', progression: 0 }; e.plansCombinaisons = { [cote]: [c] };
  const origine = { ...e.ballon };
  preparerCombinaison(e, 'touche');
  const sauteur = e.pions.find(p => p.id === e.conquete?.cibleId)!;
  assert.equal(sauteur.numero, 8); assert.equal(Math.abs(sauteur.pos.y - bord), distance);
  assert.equal(e.pions.filter(p => p.cote === cote && p.role === 'alignement').length, v.touche.alignes);
  assert.equal(e.conquete.combinaison, v.touche.feinte ? 'leurreDevant' : distance <= 7 ? 'premierBloc' : 'fond');
  e.minuteur = 0; e.rng = () => .99;
  for (const p of e.pions) { p.detente = p.cote === cote ? 99 : 10; p.puissance = p.cote === cote ? 99 : 10; p.vision = p.cote === cote ? 99 : 10; p.passe = 99; p.discipline = 99; }
  avancer(e, .15);
  assert.equal(sauteur.stats.touchesGagnees, 1, 'Le sauteur choisi capte réellement le lancer');
  assert.ok(e.combinaisonEnCours, 'La sortie démarre après la conquête gagnée');
  assert.deepEqual(e.combinaisonEnCours.origine, origine, 'Les placements de sortie sont relatifs à la touche');
}
// Au-delà du troisième bloc, le ballon cherche aussi un demi ou un arrière.
// L'alignement reste entre 5 et 15 m et le receveur court après le lancer.
for (const cote of ['A', 'B'] as const) for (const bord of [0, 70]) for (const numero of [4, 9, 10, 15]) for (const distance of [18, 25]) {
  const c = creerCombinaison(`long-${cote}-${bord}-${numero}-${distance}`, 'touche');
  c.couloir = (cote === 'A' ? bord : 70 - bord) > 35 ? 'droite' : 'gauche';
  const v = c.variantes[0]; v.sauteur = numero;
  v.touche = { alignes: numero === 4 ? 7 : numero === 9 ? 4 : 5, distance, feinte: numero === 9 };
  v.actions = [{ type: 'course', destination: { x: 8, y: 28 } }];
  assert.equal(combinaisonsValides([c])[0].variantes[0].sauteur, numero);
  const formation = alignementCombinaison(v);
  assert.equal(formation.length, v.touche.alignes); assert.ok(formation.every(p => p.distance >= 5 && p.distance <= 15));
  const traces = tracesApercu(c, v); const index = traces.findIndex(t => t.acteur === 2 && !t.action);
  const depart = imageApercu(c, v, index + .2);
  assert.deepEqual(depart.positions[numero], positionsApercu(c, v, true)[numero], 'Le receveur attend le lâcher du ballon');
  const vol = imageApercu(c, v, index + .65);
  assert.equal(vol.porteur, null); assert.ok(vol.hauteurBallon > 0);
  const terrain = terrainSimulationCombinaison(c, v, vol, index + .65, {});
  assert.ok(terrain.gestes?.some(g => g.joueurId === `atelier-joueur-${numero}` && g.clip === 'run'));
  assert.ok(!terrain.gestes?.some(g => g.clip === 'lineout_jump' || g.clip === 'lineout_lift'));
  const reception = imageApercu(c, v, index + .95);
  assert.equal(reception.porteur, numero);
  assert.deepEqual(reception.positions[numero], receptionTouche(origineApercu(c), v));
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, c.id);
  e.phase = 'touche'; e.possession = cote; e.porteur = null;
  e.ballon = { x: 90, y: bord === 0 ? .6 : 69.4 }; const origine = { ...e.ballon };
  e.conquete = { type: 'touche', progression: 0 }; e.plansCombinaisons = { [cote]: [c] };
  preparerCombinaison(e, 'touche');
  assert.equal(e.conquete.horsAlignement, true);
  const receveur = e.pions.find(p => p.id === e.conquete?.cibleId)!;
  assert.equal(receveur.numero, numero);
  assert.equal(e.pions.filter(p => p.cote === cote && p.role === 'alignement').length, v.touche.alignes);
  const cible = e.conquete.reception!;
  assert.deepEqual(cible, receptionTouche(origine, v, cote === 'A' ? 1 : -1));
  assert.ok(Math.hypot(receveur.pos.x - cible.x, receveur.pos.y - cible.y) > 2, 'Le receveur démarre à sa position réglementaire');
  e.minuteur = 0; e.rng = () => .99;
  for (const p of e.pions) { p.detente = p.puissance = p.vision = p.passe = p.cote === cote ? 99 : 10; p.discipline = 99; }
  for (let t = 0; t < 12 && !receveur.stats.touchesGagnees; t += .15) avancer(e, .15);
  assert.equal(receveur.stats.touchesGagnees, 1, `Le n° ${numero} reçoit le lancer long (${cote}, ${bord}, ${distance})`);
  assert.ok(Math.hypot(receveur.pos.x - cible.x, receveur.pos.y - cible.y) < 1);
  assert.deepEqual(e.combinaisonEnCours?.origine, origine);
}
const perteLongue = creerCombinaison('perte-longue', 'touche');
perteLongue.variantes[0].sauteur = 10; perteLongue.variantes[0].touche = { alignes: 5, distance: 18, feinte: false };
const ePerte = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, perteLongue.id);
ePerte.phase = 'touche'; ePerte.possession = 'A'; ePerte.porteur = null; ePerte.ballon = { x: 61, y: .6 };
ePerte.conquete = { type: 'touche', progression: 0 }; ePerte.plansCombinaisons = { A: [perteLongue] };
preparerCombinaison(ePerte, 'touche');
const ciblePerdue = { ...ePerte.conquete.reception! }; ePerte.minuteur = 0; ePerte.rng = () => .99;
for (const p of ePerte.pions) { p.passe = p.discipline = 99; p.detente = p.puissance = p.vision = p.cote === 'A' ? 5 : 99; }
for (let t = 0; t < 12 && ePerte.phase === 'touche'; t += .15) avancer(ePerte, .15);
assert.equal(ePerte.possession, 'B', 'Le lancer long reste disputé');
assert.equal(ePerte.combinaisonEnCours, undefined, 'Une conquête perdue annule le plan préparé');
assert.ok(Math.hypot(ePerte.origine.x - ciblePerdue.x, ePerte.origine.y - ciblePerdue.y) < 1, 'La reprise repart du point de réception');
for (const cote of ['A', 'B'] as const) {
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, `atelier-${cote}`);
  const s = cote === 'A' ? 1 : -1;
  e.possession = cote; e.phase = 'melee'; e.ballon = { x: 61, y: cote === 'A' ? 14 : 56 };
  e.plansCombinaisons = { [cote]: [base] };
  preparerCombinaison(e, 'melee');
  assert.ok(e.combinaisonPreparee);
  assert.ok(demarrerCombinaison(e, e.ballon));
  e.phase = 'jeuCourant'; e.origine = { ...e.ballon }; e.rng = () => .99;
  const neuf = e.porteur!;
  const dix = e.pions.find(p => p.cote === cote && p.numero === 10)!;
  neuf.pos = { x: 59, y: 35 }; dix.pos = { x: 59 - s * 4, y: 41 };
  e.ballon = { ...neuf.pos };
  for (const p of e.pions.filter(p => p.cote !== cote)) p.pos = { x: 59 + s * 35, y: 60 };
  const relative = pointSurTerrain(e.combinaisonEnCours!, { x: -4, y: 6 });
  assert.equal(relative.x, 61 - s * 4);
  assert.equal(relative.y, cote === 'A' ? 20 : 50);
  placerCombinaison(e);
  assert.ok((dix.cible.x - neuf.pos.x) * s < 0);
  avancer(e, .65);
  assert.ok(neuf.stats.passes > 0, `La passe programmée doit être effectuée pour ${cote}`);
  assert.ok(e.vol?.receveur === dix || e.porteur === dix, 'Le n° 10 choisi reçoit la passe');
}

// Le sauteur sélectionné est réellement annoncé pendant la conquête.
const touche = creerCombinaison('touche', 'touche');
touche.variantes[0].sauteur = 5;
touche.variantes[0].touche = { alignes: 4, distance: 13, feinte: true };
const eTouche = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, 'atelier-touche');
eTouche.phase = 'touche'; eTouche.possession = 'A'; eTouche.ballon = { x: 90, y: .6 };
eTouche.conquete = { type: 'touche', progression: 0 };
eTouche.plansCombinaisons = { A: [touche] };
preparerCombinaison(eTouche, 'touche');
assert.equal(eTouche.pions.find(p => p.id === eTouche.conquete?.cibleId)?.numero, 5);
// Un joueur sanctionné annule la combinaison, sans bloquer le jeu.
eTouche.pions.find(p => p.cote === 'A' && p.numero === 10)!.sanction = 600;
preparerCombinaison(eTouche, 'touche');
assert.equal(eTouche.combinaisonPreparee, undefined);

// Courses et leurres déplacent les joueurs, puis le botteur joue un vrai pied.
const course = creerCombinaison('course-et-pied');
course.variantes[0].actions = [
  { type: 'leurre', numero: 12, destination: { x: 10, y: 8 } },
  { type: 'course', destination: { x: 6, y: 0 } },
  { type: 'pied', intention: 'occupation' },
];
const eCourse = creerMatch('Stade Toulousain', 'RC Toulon', effectifA, effectifB, 27, 24, 'atelier-course');
eCourse.phase = 'melee'; eCourse.possession = 'A'; eCourse.ballon = { x: 61, y: 35 };
eCourse.plansCombinaisons = { A: [course] };
preparerCombinaison(eCourse, 'melee'); demarrerCombinaison(eCourse, eCourse.ballon);
eCourse.phase = 'jeuCourant'; eCourse.origine = { ...eCourse.ballon }; eCourse.rng = () => .99;
const botteur = eCourse.porteur!;
botteur.pos = { x: 60, y: 35 }; eCourse.ballon = { ...botteur.pos };
for (const p of eCourse.pions.filter(p => p.cote === 'B')) p.pos = { x: 102, y: 60 };
avancer(eCourse, .3);
placerCombinaison(eCourse);
const leurre = eCourse.pions.find(p => p.cote === 'A' && p.numero === 12)!;
assert.deepEqual(leurre.cible, { x: 71, y: 43 });
avancer(eCourse, 5);
assert.ok(botteur.pos.x > 60, 'Le porteur court vers sa destination');
assert.ok(botteur.stats.coupsDePied > 0, 'Le dernier geste exécute un vrai coup de pied');

// Deux rythmes d'appels au serveur doivent produire le même match.
const plans = (['melee', 'touche', 'ruck'] as const).map(phase => {
  const c = creerCombinaison(`serveur-${phase}`, phase);
  c.variantes[0].actions = phase === 'touche' ? [{ type: 'passe', destinataire: 9 }, { type: 'pied', intention: 'chandelle' }] : [{ type: 'passe', destinataire: 10 }, { type: 'pied', intention: 'occupation' }];
  if (phase === 'touche') c.variantes.push({ ...structuredClone(c.variantes[0]), nom: 'Après le troisième bloc', sauteur: 10, touche: { alignes: 4, distance: 18, feinte: false } });
  return c;
});
const equipe = (id: string, effectif: typeof effectifA) => ({ clubId: id, nom: id, effectif, composition: compositionManagerParDefaut(effectif), strategie: { ...STRATEGIE_EN_LIGNE_DEFAUT, modeCombinaisons: 'configure' as const, combinaisons: plans } });
const debut = Date.parse('2026-09-30T12:00:00Z');
const faire = (id: string) => creerMatchEnLigne({ id, domicile: equipe('club-a', effectifA), exterieur: equipe('club-b', effectifB), debut, graine: 43219 });
const original = faire('combinaisons-determinisme');
const direct = avancerMatchEnLigne(structuredClone(original), debut + 40 * 60_000);
let progressif = structuredClone(original);
for (let minute = 1; minute <= 40; minute++) progressif = avancerMatchEnLigne(progressif, debut + minute * 60_000);
// L'avance directe a rempli le cache à la 40e. Revenir à la 1re force une
// reconstruction complète avant la série d'appels progressifs.
assert.deepEqual(direct.score, progressif.score);
assert.deepEqual(direct.fil, progressif.fil);
assert.ok(direct.fil.some(l => l.texte.startsWith('Combinaison :')), 'Les plans sont exécutés dans le moteur en ligne');
assert.ok(direct.fil.some(l => l.texte.includes('Après le troisième bloc')), 'Le match en ligne exécute aussi la variante longue');

// L'accès repose sur l'identifiant authentifié, jamais sur le pseudo Kiri.
const dossier = mkdtempSync(join(tmpdir(), 'destiny-combinaisons-'));
try {
  const db = stockageFichier(join(dossier, 'base.json'));
  const kiri = randomUUID(); const visiteur = randomUUID();
  for (const [id, identifiant] of [[kiri, 'kiri'], [visiteur, 'visiteur']] as const) {
    await db.creerCompte({ id, identifiant, pseudo: 'Kiri', empreinte: 'test' });
    await db.ouvrirSession(empreinteJeton(id), id, Date.now() + 600_000);
  }
  const api = creerGestionnaireCarriere(db);
  async function appel(jeton: string, url: string, body?: unknown) {
    let statut = 200; let donnees: any;
    const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(d: unknown) { donnees = d; } };
    await api.handler({ method: body ? 'POST' : 'GET', url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: `destiny_carriere=${jeton}` }, body }, res);
    return { statut, donnees };
  }
  const creee = await appel(kiri, '/api/carriere', { action: 'creer', nom: 'Bêta combinaisons', clubNom: 'Club Kiri', rythme: 1, maxClubs: 4 });
  assert.equal(creee.statut, 201);
  const ligue = creee.donnees.id;
  const inscription = await appel(visiteur, '/api/carriere', { action: 'rejoindre', code: creee.donnees.code, clubNom: 'Club visiteur' });
  assert.equal(inscription.statut, 200);
  const longue = creerCombinaison('touche-longue', 'touche');
  longue.variantes[0].sauteur = 15; longue.variantes[0].touche = { alignes: 4, distance: 25, feinte: false };
  const strategie = { ...STRATEGIE_EN_LIGNE_DEFAUT, combinaisons: [base, touche, longue], modeCombinaisons: 'configure' };
  const commande = (jeton: string, action: unknown) => appel(jeton, '/api/carriere', { action: 'commande', ligue, requeteId: randomUUID(), commande: action });
  const refuse = await commande(visiteur, { type: 'strategie', strategie });
  assert.equal(refuse.statut, 400);
  assert.match(refuse.donnees.erreur, /bêta privée/);
  const refuseDirect = await commande(visiteur, { type: 'match', matchId: 'faux', action: { type: 'strategie', strategie } });
  assert.equal(refuseDirect.statut, 400); assert.match(refuseDirect.donnees.erreur, /bêta privée/);
  const accepte = await commande(kiri, { type: 'strategie', strategie });
  assert.equal(accepte.statut, 200);
  assert.deepEqual(accepte.donnees.clubs.find((c: any) => c.id === accepte.donnees.monClubId).strategie.combinaisons, [base, touche, longue]);
  const relecture = await appel(kiri, `/api/carriere?ligue=${ligue}`);
  assert.equal(relecture.donnees.clubs.find((c: any) => c.id === relecture.donnees.monClubId).strategie.modeCombinaisons, 'configure');
  assert.deepEqual(relecture.donnees.clubs.find((c: any) => c.id === relecture.donnees.monClubId).strategie.combinaisons[1].variantes[0].touche, touche.variantes[0].touche);
  assert.deepEqual(relecture.donnees.clubs.find((c: any) => c.id === relecture.donnees.monClubId).strategie.combinaisons[2], longue);
  const autreVue = await appel(visiteur, `/api/carriere?ligue=${ligue}`);
  assert.equal(autreVue.donnees.clubs.find((c: any) => c.id === accepte.donnees.monClubId).strategie, undefined, 'Les combinaisons adverses restent privées');
  assert.equal((await commande(visiteur, { type: 'strategie', strategie: STRATEGIE_EN_LIGNE_DEFAUT })).statut, 200);
} finally {
  rmSync(dossier, { recursive: true, force: true });
}
console.log('Combinaisons : joueurs liés et sorties de mêlée 8/9 A/B, navigation et pincement, placements du match, animation, lancers 5–25 m vers avants/demis/arrière A/B sur les deux touches, passes, moteur en ligne, sauvegarde et bêta Kiri vérifiés.');
