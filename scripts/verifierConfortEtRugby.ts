import assert from 'node:assert/strict';
import { projectionMemoisee, stockageCarriereOptimise } from '../src/lib/persistanceNavigation';
import { ouvrirEmplacement } from '../src/lib/sauvegardes';
import { attributsDe } from '../src/lib/carteJoueur';
import { creerPion, deplacer } from '../src/lib/moteur/entites';
import { avancer, creerMatch, probaPlaquage } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { organiserRuck, preparerChenille, placerRegroupement } from '../src/lib/moteur/regroupements';
import { porteurPourAffichage } from '../src/lib/moteur/dynamique';
import { rugbyAnimations } from '../src/lib/spritesGenerateur/rugbyAnimations';

const donnees = new Map<string, string>();
const ecritures: string[] = [];
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (k: string) => donnees.get(k) ?? null,
  setItem: (k: string, v: string) => { donnees.set(k, v); ecritures.push(k); },
  removeItem: (k: string) => donnees.delete(k),
} });
type Etat = { manager: { historique: number[] }; ecransVus: string[]; coins: number; ecran: string };
let etat: Etat = { manager: { historique: Array.from({length: 100000}, (_, i) => i) }, ecransVus: [], coins: 4, ecran: 'accueil' };
let projections = 0;
const projeter = projectionMemoisee((s: Etat) => { projections++; return { manager: s.manager, ecransVus: s.ecransVus, coins: s.coins }; });
const stockage = stockageCarriereOptimise<ReturnType<typeof projeter>>();
stockage.setItem('destin-ovalie', { state: projeter(etat), version: 1 });
const debut = performance.now();
for (let i = 0; i < 100; i++) {
  etat = { ...etat, ecran: `ecran${i}`, ecransVus: [...etat.ecransVus, `ecran${i}`] };
  stockage.setItem('destin-ovalie', { state: projeter(etat), version: 1 });
}
assert.equal(projections, 1);
assert.equal(ecritures.filter(k => k === 'destin-ovalie').length, 1, 'La navigation ne sérialise plus la carrière.');
console.log(`Navigation : 100 changements en ${(performance.now() - debut).toFixed(1)} ms, 0 réécriture de carrière.`);
etat = { ...etat, coins: 3 };
stockage.setItem('destin-ovalie', { state: projeter(etat), version: 1 });
assert.equal(JSON.parse(donnees.get('destin-ovalie')!).state.coins, 3, 'Les achats sont persistés immédiatement.');
const recharge = await stockageCarriereOptimise<ReturnType<typeof projeter>>().getItem('destin-ovalie');
assert.equal(recharge?.state.ecransVus.length, 100);
ouvrirEmplacement(2);
stockage.setItem('destin-ovalie', { state: projeter(etat), version: 1 });
assert.ok(donnees.has('destin-ovalie:s2'), 'Le cache ne masque pas la première écriture d’un autre emplacement.');

const liste = effectifDuClub('Stade Toulousain', 1);
const fiche = liste[0]!;
const pion = creerPion(fiche, 0, 'A', false);
const notes = attributsDe(fiche);
assert.equal(pion.puissance, notes.force); assert.equal(pion.passe, notes.passe);
assert.notDeepEqual(attributsDe({ ...fiche, note: 30 }), notes, 'Une progression ne réutilise pas des attributs périmés.');
const lent = creerPion(fiche, 0, 'A', false, { vitesse: 20 });
const rapide = creerPion(fiche, 0, 'A', false, { vitesse: 95 });
lent.cible = rapide.cible = { x: 100, y: 35 };
for (let i = 0; i < 40; i++) { deplacer(lent, .15); deplacer(rapide, .15); }
assert.ok(rapide.pos.x > lent.pos.x * 1.35, 'La note de vitesse change nettement la course.');

const match = () => creerMatch('Stade Toulousain', 'RC Toulon', liste, effectifDuClub('RC Toulon', 1),
  27, 24, 'confort-rugby', undefined, { tempsReel: true, scoreSurTerrain: true });
const e = match();
const porteur = e.pions[0]!, defenseur = e.pions.find(p => p.cote !== porteur.cote)!;
defenseur.plaquage = 25;
const faible = probaPlaquage(e, porteur, defenseur, null, false);
defenseur.plaquage = 95;
assert.ok(probaPlaquage(e, porteur, defenseur, null, false) > faible);

for (const reussi of [true, false]) {
  const d = match();
  const dix = d.pions.find(p => p.cote === 'A' && p.numero === 10)!;
  dix.pos = { x: 85, y: 35 }; dix.cible = { ...dix.pos };
  d.phase = 'jeuCourant'; d.porteur = dix; d.vol = null; d.ballon = { ...dix.pos };
  d.dropEnCours = { auteurId: dix.id, reussi };
  d.piedPrepare = { auteurId: dix.id, depuis: { ...dix.pos }, arrivee: { x: 113, y: 35 }, intention: 'drop', duree: 2.1, hauteur: .7 };
  const score = d.scoreA;
  avancer(d, 1.05);
  assert.equal(d.scoreA, score, 'Pas de score avant le geste et le vol.');
  assert.equal(porteurPourAffichage(d), dix.id, 'Le ballon suit les mains pendant le drop.');
  avancer(d, .6);
  assert.equal(d.vol?.intention, 'drop');
  assert.equal(porteurPourAffichage(d), undefined);
  avancer(d, 2.1);
  assert.equal(d.scoreA, score + (reussi ? 3 : 0));
  assert.equal(d.phase, reussi ? 'coupEnvoi' : 'renvoi22');
}

const r = match(); r.phase = 'ruck'; r.porteur = null; r.vol = null; r.ballon = { x: 45, y: 35 };
r.possession = 'A'; r.ruck = { attaque: 'A', vitesseAttaque: 65, vitesseDefense: 60 }; r.minuteur = 5;
organiserRuck(r);
const neuf = r.pions.find(p => p.cote === 'A' && p.numero === 9)!;
assert.ok(preparerChenille(r, neuf)); placerRegroupement(r);
const o = r.ruck!.organisation!;
assert.equal(o.attaque.length, 3); assert.equal(o.defense.length, 2);
const chaine = o.attaque.map(id => r.pions.find(p => p.id === id)!);
assert.ok(Math.abs(chaine[0].cible.x - chaine[1].cible.x) < 1, 'Liaisons compactes, pas trois mètres entre les avants.');
for (const p of [...chaine, neuf]) { p.pos = { ...p.cible }; p.vitesse = { x: 0, y: 0 }; }
let box = false;
for (let i = 0; i < 80; i++) {
  avancer(r, .15);
  if (r.vol?.auteur === neuf && r.vol.type === 'pied') { box = true; break; }
}
assert.ok(box, 'La chenille construite doit se terminer par le box kick.');
assert.ok(r.gestes?.some(g => g.clip === 'caterpillar_bind'));
assert.ok(r.gestes?.some(g => g.clip === 'box_kick'));

for (const nom of ['bump', 'tackle_drive', 'support_arrive', 'ruck_bind', 'clearout_drive', 'counter_ruck',
  'contact_brace', 'roll_away', 'caterpillar_bind', 'box_setup', 'fall_forward', 'fall_back']) {
  const clip = rugbyAnimations.find(c => c.id === `rugby_${nom}`);
  assert.ok(clip && clip.frames.length >= 16, `Animation complète : ${nom}`);
  assert.ok(clip.frames.every(f => Object.values(f.pose.bones).every(b => Number.isFinite(b.rotation))));
}
console.log('OK — sauvegardes immédiates, stats de fiche, vitesse, drops animés, chenille compacte et 12 nouveaux gestes.');
