// BANC DU CORRECTIF 30 — la bibliothèque d'animations contextuelles (niveau d'IA 6).
//
//   npm run verify:animations -- 12        (nombre de matchs joués ; 12 par défaut)
//
// Ce qu'il tient :
//   1. LES SÉLECTEURS (`moteur/animations.ts`) sont purs — aucun tirage dans leur source, la même entrée rend la même sortie —,
//      chaque variante est atteignable, et aucune ne sort de la famille que le moteur a décidée (un plaquage dominant ne joue
//      jamais un porteur qui gagne des mètres ; un défenseur resté debout n'est jamais couché).
//   2. LA SCÈNE A UNE SUITE POUR CHAQUE VARIANTE (`public/rn26/animations.mjs`), chaque clip cité existe dans le catalogue, et
//      chaque suite a un repli dans la banque commune.
//   3. DES MATCHS ENTIERS : chaque plaquage porte sa variante, chaque geste une variante connue ; un grattage ne change le
//      ballon de camp qu'à la fin de sa séquence ; personne n'est déplacé d'un coup par une animation ; les altercations
//      sont rares, brèves, et sanctionnent celui qui les a déclenchées ; deux rejoues du même match montrent la même chose.
//   4. LA VARIÉTÉ : combien de séquences différentes on a vues après 1, 3, 6, 12 matchs — on doit continuer d'en découvrir.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { avancer } from '../src/lib/moteur/moteur';
import type { EtatMatch } from '../src/lib/moteur/etat';
import type { Pion } from '../src/lib/moteur/entites';
import * as A from '../src/lib/moteur/animations';
import { lirePlaquage, type TypePlaquage } from '../src/lib/moteur/duels';
import { jeuxDeTouche, toutesLesTouches, sortieDeLaSuite } from '../src/lib/moteur/touches';
import { ALTERCATIONS_MAX, tirageAPart } from '../src/lib/moteur/altercations';
import { creerMatchDEmpreinte, empreinte } from './outilsEmpreinte';

const MATCHS = Math.max(1, Number(process.argv[2] ?? 12));
let controles = 0;
const ok = (condition: unknown, message: string) => { controles++; assert.ok(condition, message); };
const titre = (t: string) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 76 - t.length))}`);

// ═══ 1. LES SÉLECTEURS ══════════════════════════════════════════════════════
titre('1. Sélecteurs purs, variantes atteignables, familles respectées');
for (const f of ['animations.ts', 'touches.ts']) {
  const source = fs.readFileSync(path.resolve('src/lib/moteur', f), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/Math\.random|\.rng\(|rng\(/.test(source), `${f} ne tire rien au sort`);
}
{
  const source = fs.readFileSync(path.resolve('src/lib/moteur/altercations.ts'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/Math\.random|e\.rng\(/.test(source), 'altercations.ts ne consomme pas le générateur du match');
}

/** Un petit générateur déterministe, pour balayer l'espace des situations (le banc, lui, a le droit de tirer). */
function suite(graine: number) { let s = graine >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const alea = suite(30);
const entre = (a: number, b: number) => a + (b - a) * alea();
function pion(numero: number, cote: 'A' | 'B', plus: Partial<Pion> = {}): Pion {
  const avant = numero <= 8;
  return {
    id: `${cote}${numero}`, sourceId: `${cote}${numero}`, nom: `${cote}${numero}`, numero, poste: 'ailier_droit', cote, avant, moi: false, capitaine: false, buteur: false,
    pos: { x: 60, y: 35 }, vitesse: { x: 0, y: 0 }, cible: { x: 60, y: 35 }, vitesseMax: avant ? 7.8 : 9.4, acceleration: avant ? 3.8 : 5,
    endurance: 85, sprint: 80, sprintMax: 90, battu: 0, horsJeu: false, surLeTerrain: true, sanction: 0, minutes: 0, role: 'ligne',
    plaquage: 65, puissance: avant ? 78 : 62, evitement: avant ? 50 : 72, passe: 62, vision: 62, pied: 55, detente: 60, discipline: 62,
    poidsKg: avant ? 112 : 90, effort: 1, stats: {} as Pion['stats'], ...plus,
  } as unknown as Pion;
}
const TYPES: TypePlaquage[] = ['jambes', 'taille', 'haut', 'cote', 'arriere', 'poursuite', 'dominant', 'debout', 'accroche'];
const FAMILLES: Record<TypePlaquage, A.VariantePlaquage[]> = {
  jambes: ['jambes', 'jambes-cote', 'fauche', 'in-extremis'], poursuite: ['chevilles', 'in-extremis'],
  taille: ['bassin', 'bassin-roule', 'epaules', 'protege', 'a-deux'], haut: ['haut', 'sur-le-dos', 'a-deux'],
  cote: ['cote', 'cote-roule', 'glisse'], arriere: ['dos', 'dos-plonge'], dominant: ['offensif', 'offensif-cote'],
  debout: ['debout', 'debout-porte'], accroche: ['gagne-metres', 'glisse'],
};
function contexte(): A.ContexteContact {
  const angle = (['face', 'cote', 'dos'] as const)[Math.floor(alea() * 3)];
  return {
    angle, cote: angle === 'face' ? 0 : alea() < 0.5 ? -1 : 1, vPorteur: entre(0, 9), vDefenseur: entre(0, 8), fermeture: entre(0, 11), rapport: entre(-18, 18),
    poidsPorteur: entre(78, 125), poidsDefenseur: entre(78, 125), equilibre: alea(), fatiguePorteur: Math.floor(alea() * 3) as A.NiveauFatigue,
    fatigueDefenseur: Math.floor(alea() * 3) as A.NiveauFatigue, profilPorteur: (['lourd', 'troisieme', 'demi', 'centre', 'arriere'] as const)[Math.floor(alea() * 5)],
    profilDefenseur: (['lourd', 'troisieme', 'demi', 'centre', 'arriere'] as const)[Math.floor(alea() * 5)], expose: alea() < 0.5, presLigne: entre(0, 90),
    ...(alea() < 0.2 ? { secondId: 'x' } : {}), isole: alea() < 0.4,
  };
}
{
  const vues = new Set<string>();
  for (let i = 0; i < 40000; i++) {
    const c = contexte(), type = TYPES[i % TYPES.length], alt = alea() < 0.5 ? 1 : -1;
    const v = A.choisirPlaquage(type, c, alt);
    vues.add(v);
    if (i < 4000) {
      ok(FAMILLES[type].includes(v), `plaquage ${type} → ${v} : hors de sa famille`);
      ok(v === A.choisirPlaquage(type, { ...c }, alt), 'même contact, même plaquage');
    }
  }
  for (const v of A.VARIANTES_PLAQUAGE) ok(vues.has(v), `plaquage « ${v} » atteignable`);
  ok(A.VARIANTES_PLAQUAGE.length >= 20, `au moins vingt plaquages (${A.VARIANTES_PLAQUAGE.length})`);
  console.log(`   ${A.VARIANTES_PLAQUAGE.length} plaquages aboutis, tous atteignables, chacun dans la famille du type lu par le moteur.`);
}
{
  const vues = new Set<string>();
  for (let i = 0; i < 30000; i++) {
    const c = contexte(), geste = ([null, 'crochet', 'raffut', 'sprint'] as const)[i % 4];
    const issue = geste === 'raffut' ? (['repousse', 'equilibre', 'tombe'] as const)[Math.floor(alea() * 3)] : geste === 'crochet' ? (['elimine', 'contrepied'] as const)[Math.floor(alea() * 2)] : null;
    const contact = geste === 'raffut' ? (['epaule', 'torse', 'percussion'] as const)[Math.floor(alea() * 3)] : null;
    const v = A.choisirManque(c, geste, issue, contact, alea() < 0.5 ? 1 : -1, alea() < 0.5 ? 1 : -1);
    vues.add(v);
    // Le moteur laisse le défenseur debout dans deux cas seulement : raffut « repoussé », crochet « éliminé ».
    const debout = (geste === 'raffut' && issue === 'repousse') || (geste === 'crochet' && issue === 'elimine');
    if (i < 6000) ok(A.MANQUES_DEBOUT.has(v) === debout, `manqué ${geste}/${issue} → ${v} : debout ou au sol, comme le moteur l'a décidé`);
  }
  for (const v of A.VARIANTES_MANQUE) ok(vues.has(v), `plaquage manqué « ${v} » atteignable`);
  ok(A.VARIANTES_MANQUE.length >= 10, 'au moins dix plaquages manqués');
  console.log(`   ${A.VARIANTES_MANQUE.length} plaquages manqués, tous atteignables ; debout ou au sol selon ce que le moteur a décidé.`);
}
{
  const vues = new Set<string>();
  for (let i = 0; i < 30000; i++) {
    const n = 1 + Math.floor(alea() * 15), v = entre(0, 9.5);
    const p = pion(n, 'A', { vitesse: { x: v, y: 0 }, evitement: entre(40, 92), puissance: entre(45, 92), endurance: entre(20, 100), acceleration: entre(3, 6) });
    const d = pion(1 + Math.floor(alea() * 15), 'B', { vitesse: { x: -entre(0, 8), y: 0 } });
    vues.add(A.choisirCrochet(p, d, alea() < 0.5 ? 1 : -1, alea() < 0.5 ? 1 : -1, entre(0, 12), alea() < 0.5 ? 1 : -1));
  }
  for (const v of A.VARIANTES_CROCHET) if (v !== 'rate') ok(vues.has(v), `crochet « ${v} » atteignable`);
  ok(!vues.has('rate'), 'le crochet raté n\'est jamais choisi d\'avance : c\'est le contact qui le dit');
  ok(A.VARIANTES_CROCHET.length >= 10, 'au moins dix crochets');
  console.log(`   ${A.VARIANTES_CROCHET.length} crochets (dont le crochet raté, posé par le moteur quand le défenseur est resté devant).`);
}
{
  const raffuts = new Set<string>(), percussions = new Set<string>(), deblayages = new Set<string>();
  for (let i = 0; i < 20000; i++) {
    const p = pion(1 + Math.floor(alea() * 15), 'A', { vitesse: { x: entre(0, 9), y: 0 }, puissance: entre(45, 95), poidsKg: entre(78, 125) });
    const d = pion(1 + Math.floor(alea() * 15), 'B', { poidsKg: entre(78, 125), puissance: entre(45, 95), endurance: entre(20, 100), pos: { x: 60 + entre(-1, 1), y: 35 + entre(-1, 1) } });
    const c = contexte();
    raffuts.add(A.choisirRaffut(p, d, c));
    percussions.add(A.choisirPercussion(p, d));
    const lu = A.lireDeblayage(p, d, entre(0, 5), 1, alea() < 0.2);
    deblayages.add(lu.variante);
    if (i < 3000) ok(lu.chute === (lu.variante === 'desequilibre'), 'déblayage : seul « déséquilibré » fait tomber');
  }
  for (const t of TYPES) percussions.add(A.issuePercussion(t));
  for (const v of A.VARIANTES_RAFFUT) ok(raffuts.has(v), `raffut « ${v} » atteignable`);
  for (const v of A.VARIANTES_PERCUSSION) ok(percussions.has(v), `percussion « ${v} » atteignable`);
  for (const v of A.VARIANTES_DEBLAYAGE) ok(deblayages.has(v), `déblayage « ${v} » atteignable`);
  console.log(`   ${A.VARIANTES_RAFFUT.length} raffuts, ${A.VARIANTES_PERCUSSION.length} percussions, ${A.VARIANTES_DEBLAYAGE.length} déblayages.`);
}
{
  const passes = new Set<string>(), receptions = new Set<string>(), essais = new Set<string>(), fetes = new Set<string>();
  for (let i = 0; i < 20000; i++) {
    const style = A.choisirPasse(entre(1, 22), entre(0.5, 12), entre(0, 6));
    passes.add(style);
    const r = pion(9 + Math.floor(alea() * 7), 'A', { vitesse: { x: entre(0, 9), y: 0 }, passe: entre(40, 90), endurance: entre(20, 100) });
    receptions.add(A.choisirReception(r, entre(1, 22), entre(-2, 2), entre(0.3, 3.2), entre(0.5, 12), style));
    const m = pion(1 + Math.floor(alea() * 15), 'A', { vitesse: { x: entre(0, 9), y: 0 }, pos: { x: 110, y: entre(1, 69) } });
    essais.add(A.choisirEssai(m, alea() < 0.3 ? Infinity : entre(0, 14), (['jeu', 'jeu', 'jeu', 'maul', 'melee', 'interception'] as const)[i % 6]));
    fetes.add(A.choisirCelebration(Math.round(entre(-40, 40)), entre(0, 80), 1 + Math.floor(alea() * 3), A.profilAnimation(m)));
  }
  for (const v of A.STYLES_PASSE) ok(passes.has(v), `passe « ${v} » atteignable`);
  for (const v of A.STYLES_RECEPTION) ok(receptions.has(v), `réception « ${v} » atteignable`);
  for (const v of A.STYLES_ESSAI) ok(essais.has(v), `essai « ${v} » atteignable`);
  for (const v of A.STYLES_CELEBRATION) ok(fetes.has(v), `célébration « ${v} » atteignable`);
  ok(A.choisirCelebration(-20, 70, 1, 'arriere') === 'sobre', 'mené de vingt points : une célébration sobre');
  ok(A.choisirCelebration(2, 74, 1, 'centre') === 'decisive', 'l\'essai qui fait passer devant à la 74ᵉ : célébration décisive');
  console.log(`   ${A.STYLES_PASSE.length} passes (+ 5 passes après contact de duels.ts), ${A.STYLES_RECEPTION.length} réceptions, ${A.STYLES_ESSAI.length} essais, ${A.STYLES_CELEBRATION.length} célébrations.`);
}
{
  // Le plaquage dangereux : il faut un vrai ascendant physique pour soulever, et la gravité suit la maîtrise de la chute.
  const leger = pion(11, 'A', { vitesse: { x: 6, y: 0 }, poidsKg: 82, puissance: 55 });
  const lourd = pion(4, 'B', { pos: { x: 61, y: 35 }, vitesse: { x: -4, y: 0 }, poidsKg: 122, puissance: 92, plaquage: 80, discipline: 80, endurance: 95 });
  const lu = lirePlaquage(leger, lourd, 1);
  const propre = A.lirePlaquageDangereux(leger, lourd, lu, false);
  ok(propre.type === 'souleve' && propre.souleve, 'un deuxième ligne sur un ailier lancé : il peut le soulever');
  const cuit = A.lirePlaquageDangereux(leger, { ...lourd, plaquage: 48, discipline: 35, endurance: 22 } as Pion, lu, false);
  ok(cuit.maitrise < propre.maitrise && cuit.gravite >= propre.gravite, 'épuisé et sans technique, il maîtrise moins la chute : la gravité monte');
  const inverse = A.lirePlaquageDangereux(lourd, leger, lirePlaquage(lourd, leger, 1), false);
  ok(inverse.type !== 'souleve', 'un ailier ne soulève pas un deuxième ligne');
  ok(A.lirePlaquageDangereux(leger, lourd, lu, true).type === 'retard', 'un plaquage en retard reste un plaquage en retard');
  for (const g of [propre, cuit, inverse]) ok([1, 2, 3].includes(g.gravite), 'gravité 1, 2 ou 3');
  console.log(`   Plaquage dangereux : soulevé maîtrisé → gravité ${propre.gravite} ; soulevé lâché → gravité ${cuit.gravite}.`);
}
{
  // Altercations : il faut une cause ET de la tension.
  ok(A.envieDAltercation(10, 'match-tendu', 1, 0, 70) < 0.3, 'match calme : aucune envie');
  ok(A.envieDAltercation(8, 'fautes-repetees', 1, 2, 62) < 0.55, 'une faute ordinaire dans un match calme ne dégénère jamais (seuil minimal 0,55)');
  ok(A.envieDAltercation(85, 'geste-dangereux', 3, 3, 40) > 0.9, 'geste dangereux dans un match tendu : presque sûr');
  ok(A.niveauAltercation(1, 20, 5) === 1 && A.niveauAltercation(2, 10, 3) === 1 && A.niveauAltercation(2, 25, 3) === 2 && A.niveauAltercation(1, 40, 2) === 2 && A.niveauAltercation(2, 60, 5) === 3, 'trois niveaux');
  ok(A.niveauAltercation(3, 90, 1) === 1, 'personne autour : cela reste entre deux hommes');
  ok(A.sanctionAltercation(1, true, true, 3) === 'rappel', 'se pousser vaut un rappel');
  ok(A.sanctionAltercation(2, true, false, 1) === 'penalite' && A.sanctionAltercation(3, true, false, 2) === 'jaune' && A.sanctionAltercation(3, true, true, 2) === 'rouge', 'pénalité, jaune, rouge selon le niveau et le passif');
  ok(A.sanctionAltercation(3, false, true, 3) === 'rappel', 'ce que l\'arbitre n\'a pas vu n\'est pas sanctionné');
  const t1 = tirageAPart({ ventGraine: 12, sim: 33.3 }, 'a'), t2 = tirageAPart({ ventGraine: 12, sim: 33.3 }, 'a');
  ok(t1 === t2 && t1 >= 0 && t1 < 1 && t1 !== tirageAPart({ ventGraine: 12, sim: 33.3 }, 'b'), 'le tirage à part est déterministe');
}
{
  const jeux = toutesLesTouches();
  ok(jeux.length >= 24, `au moins vingt-quatre combinaisons de touche (${jeux.length})`);
  ok(new Set(jeux.map((j) => j.id)).size === jeux.length, 'chaque combinaison a son nom');
  ok(jeux.some((j) => j.feintes.length === 2) && jeux.some((j) => j.feintes.length === 1) && jeux.some((j) => j.glissement), 'faux saut, double faux saut, sauteur qui change de bloc');
  const suites = new Set(jeux.map((j) => j.suite));
  for (const s of ['descente', 'neuf-rapide', 'neuf-dix', 'neuf-douze', 'leurre-centre', 'croisee', 'ferme', 'troisieme-ligne', 'peel', 'maul', 'faux-maul', 'maul-sortie', 'maul-peel', 'centre-direct'] as const) {
    ok(suites.has(s), `suite de touche « ${s} » jouée par au moins une combinaison`);
    ok(['deviation', 'peel', 'maul', 'mauleSimule', undefined].includes(sortieDeLaSuite(s)), 'chaque suite passe par une sortie que le moteur sait jouer');
  }
  const chezSoi = jeuxDeTouche({ pres: false, campAdverse: false, chezSoi: true, gestion: false, gout: { avants: 1, mains: 1, leurres: 1 }, alignes: 7, troisBlocs: true, lanceur: 70, centreLibre: true, troisiemeLigneAuFond: true, peeler: true, ligneEnPlace: true });
  const surs = chezSoi.filter((j) => j.suite === 'descente' && !j.feintes.length).reduce((n, j) => n + j.poids, 0), total = chezSoi.reduce((n, j) => n + j.poids, 0);
  ok(surs / total > 0.3, 'dans ses 22, plus d\'un lancer sur trois est un lancer sûr');
  ok(!chezSoi.some((j) => j.id === 'long-centre'), 'pas de lancer long par-dessus l\'alignement dans ses 22');
  console.log(`   ${jeux.length} combinaisons de touche, ${suites.size} suites.`);
}

// ═══ 2. LA SCÈNE ════════════════════════════════════════════════════════════
titre('2. Chaque variante du moteur a sa suite dans la scène, chaque clip existe');
const B = await import(pathToFileURL(path.resolve('public/rn26/animations.mjs')).href);
const catalogue: { name: string; banque: string; duration: number }[] = JSON.parse(fs.readFileSync(path.resolve('public/rn26/motions/catalogue-match-poses.json'), 'utf8'));
const clips = new Map(catalogue.map((c) => [c.name, c]));
{
  for (const v of A.VARIANTES_PLAQUAGE) {
    const P = B.PLAQUAGES30[v];
    ok(P && typeof P.plaqueur === 'function' && typeof P.plaque === 'function', `plaquage « ${v} » : une suite pour le plaqueur, une pour le plaqué`);
    ok(['jambes', 'poursuite', 'cote', 'arriere', 'dominant', 'debout', 'haut', 'accroche'].includes(P.repli), `plaquage « ${v} » : un repli dans le jeu d'origine`);
  }
  ok(typeof B.PLAQUAGES30['a-deux'].second === 'function', 'plaquage à deux : le second plaqueur a sa suite');
  for (const v of A.VARIANTES_MANQUE) { ok(Array.isArray(B.MANQUES[v]), `plaquage manqué « ${v} » : une suite`); ok(B.MANQUES_DEBOUT.has(v) === A.MANQUES_DEBOUT.has(v), `manqué « ${v} » : debout ou au sol, comme dans le moteur`); }
  for (const v of A.VARIANTES_CROCHET) ok(typeof B.CROCHETS[v] === 'function', `crochet « ${v} » : un appui`);
  for (const v of A.VARIANTES_RAFFUT) ok(B.RAFFUTS[v], `raffut « ${v} »`);
  for (const v of A.VARIANTES_PERCUSSION) ok(B.PERCUSSIONS[v], `percussion « ${v} »`);
  for (const v of A.VARIANTES_DEBLAYAGE) ok(B.DEBLAYAGES[v], `déblayage « ${v} »`);
  for (const v of A.SEQUENCES_GRATTAGE) ok(typeof B.GRATTAGES[v] === 'function', `grattage « ${v} »`);
  for (const v of ['un', 'deux', 'collectif']) ok(B.CONTRE_RUCKS[v], `contre-ruck « ${v} »`);
  for (const v of A.STYLES_PASSE) ok(B.PASSES[v], `passe « ${v} »`);
  for (const v of A.STYLES_RECEPTION) ok(B.RECEPTIONS[v], `réception « ${v} »`);
  for (const v of A.STYLES_ESSAI) ok(B.ESSAIS[v], `essai « ${v} »`);
  for (const v of A.STYLES_CELEBRATION) ok(B.CELEBRATIONS30[v], `célébration « ${v} »`);
  for (const v of A.SIGNAUX_ARBITRE) ok(B.ARBITRE[v], `arbitre « ${v} »`);
  for (const v of ['foul_high', 'foul_late', 'foul_charge', 'foul_tip', 'foul_holding_ball', 'foul_not_rolling', 'foul_off_feet', 'foul_side_entry', 'foul_collapse', 'foul_scrum', 'foul_obstruction']) ok(B.FAUTES30[v], `faute « ${v} » : le geste du joueur`);
  for (const b of A.BANQUES) ok(B.BANQUES.includes(b), `banque « ${b} » connue de la scène`);
  for (const phase of ['ruck', 'maul', 'melee', 'touche', 'penalite', 'aplatissage', 'jeuCourant', 'ballonEnLAir'] as const) ok(B.BANQUE_DE_LA_PHASE[phase] === A.banqueDeLaPhase(phase), `la banque de la phase « ${phase} » est la même des deux côtés`);
  for (let n = 1; n <= 15; n++) ok(B.profilDuNumero(n) === A.profilAnimation(pion(n, 'A')), `profil du n° ${n} : le même des deux côtés`);
  const cites: string[] = B.clipsDeLaBibliotheque();
  const absents = cites.filter((n) => !clips.has(n));
  ok(absents.length === 0, `clips cités absents du catalogue : ${absents.join(', ')}`);
  // Les signaux de l'arbitre ne sont plus joués par les joueurs.
  const signaux = new Set(['high_tackle', 'not_releasing_ball', 'not_rolling_away', 'collapsing_ruck_or_maul', 'not_releasing_player', 'knock_on', 'forward_pass', 'not_supporting_own_weight', 'unplayable_maul', 'penalty']);
  for (const f of Object.values(B.FAUTES30) as { suite: (c: number) => [string, number][] }[]) for (const [nom] of f.suite(1)) ok(!signaux.has(nom), `le joueur fautif ne joue pas le signal de l'arbitre (${nom})`);
  for (const [signal, def] of Object.entries(B.ARBITRE) as [string, { clip?: string; apres?: string }][]) if (def.clip) ok(clips.get(def.clip)?.banque === 'common', `le signal « ${signal} » de l'arbitre est dans la banque commune`);
  // Ce qui se joue dès la première seconde est dans la banque commune.
  for (const nom of ['idle', 'running', 'pass_short_left', 'standing_tackle_front_grab', 'standing_tackled_going_down', 'standing_tackle_fail_going_down', 'kick_running', 'pick_up_ball', 'try_dive', 'whistle', 'dodge_left', 'handoff_left']) ok(clips.get(nom)?.banque === 'common', `« ${nom} » est dans la banque commune`);
  for (const s of [B.REPLIS_MANQUE.debout, B.REPLIS_MANQUE.sol, B.REPLI_GRATTAGE, B.REPLI_DEBLAYAGE.nettoyeur, B.REPLI_DEBLAYAGE.cible] as [string, number][][]) for (const [nom] of s) ok(clips.get(nom)?.banque === 'common' || clips.get(nom)?.banque === 'ruck', `repli « ${nom} » disponible tôt`);
  const parBanque = new Map<string, number>();
  for (const c of catalogue) parBanque.set(c.banque, (parBanque.get(c.banque) ?? 0) + 1);
  for (const b of A.BANQUES) ok((parBanque.get(b) ?? 0) > 0, `la banque « ${b} » a des clips`);
  const octets = (b: string) => fs.statSync(path.resolve(`public/rn26/motions/poses-${b}-male_back.bin`)).size;
  const total = A.BANQUES.reduce((n, b) => n + octets(b), 0);
  ok(octets('common') < total * 0.4, 'la banque commune pèse moins de quarante pour cent des animations');
  console.log(`   ${cites.length} clips cités par la bibliothèque, ${catalogue.length} clips au catalogue, ${A.BANQUES.length} banques : ${[...parBanque].map(([b, n]) => `${b} ${n}`).join(', ')}.`);
  console.log(`   Banque commune : ${(octets('common') / 1048576).toFixed(1)} Mo par morphologie sur ${(total / 1048576).toFixed(1)} Mo (avant : 10,5 Mo pour 267 clips, tout d'un bloc).`);
}

// ═══ 3. DES MATCHS ENTIERS ══════════════════════════════════════════════════
titre(`3. ${MATCHS} matchs de carrière au niveau 6`);
interface Bilan {
  vues: Set<string>; plaquages: Map<string, number>; manques: Map<string, number>; crochets: Map<string, number>; touches: Map<string, number>;
  grattages: Map<string, number>; deblayages: Map<string, number>; essais: Map<string, number>; fetes: Map<string, number>; receptions: Map<string, number>;
  altercations: number[]; dangereux: number; sauts: number; points: number; nEssais: number; journal: string[];
}
const compter = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
function jouer(k: number, ia: number, bilan?: Bilan): EtatMatch {
  const e = creerMatchDEmpreinte(k, { ia });
  let ruck: unknown = null, conquete: unknown = null, duel: unknown = null, aplatissage: unknown = null, tir: unknown = null, altercation: unknown = null;
  const gestesVus = new Set<string>();
  const avant = new Map<string, { x: number; y: number }>();
  let possessionAuDuel: string | null = null, garde = 0;
  while (!e.fini && garde++ < 400000) {
    for (const p of e.pions) if (p.surLeTerrain && p.sanction <= 0) avant.set(p.id, { x: p.pos.x, y: p.pos.y }); else avant.delete(p.id);
    const phaseAvant = e.phase;
    avancer(e, 0.15);
    if (!bilan) continue;
    // Personne n'est déplacé d'un coup : le déplacement d'un pas reste celui d'un homme qui court (ou d'une installation d'arrêt de jeu d'origine).
    if (phaseAvant === e.phase && ['jeuCourant', 'ruck', 'maul', 'ballonLibre', 'ballonEnLAir'].includes(e.phase)) {
      for (const p of e.pions) {
        const a = avant.get(p.id);
        if (a && p.surLeTerrain && p.sanction <= 0 && Math.hypot(p.pos.x - a.x, p.pos.y - a.y) > 2.4) bilan.sauts++;
      }
    }
    for (const g of e.gestes ?? []) {
      if (gestesVus.has(g.id)) continue;
      gestesVus.add(g.id);
      const v = g.variante ?? '';
      bilan.journal.push(`${g.debut.toFixed(2)}:${g.joueurId}:${g.clip}:${v}`);
      if (g.clip === 'tackle_low' && v.startsWith('manque:')) { const m = v.slice(7); ok(B.MANQUES[m], `manqué inconnu de la scène : ${m}`); compter(bilan.manques, m); bilan.vues.add('manqué ' + m); }
      else if (g.clip === 'tackle_low' && v === 'manque') ok(false, 'au niveau 6, plus de plaquage manqué générique');
      else if (g.clip === 'dodge') { const c = v.split(':')[0]; ok(B.CROCHETS[c], `crochet inconnu : ${c}`); compter(bilan.crochets, c); bilan.vues.add('crochet ' + c); }
      else if (g.clip === 'handoff') { ok(B.RAFFUTS[v], `raffut inconnu : ${v}`); bilan.vues.add('raffut ' + v); }
      else if (g.clip === 'bump') { ok(B.PERCUSSIONS[v], `percussion inconnue : ${v}`); bilan.vues.add('percussion ' + v); }
      else if (g.clip === 'catch') { if (v) { ok(B.RECEPTIONS[v], `réception inconnue : ${v}`); compter(bilan.receptions, v); bilan.vues.add('réception ' + v); } }
      else if ((g.clip === 'pass' || g.clip === 'pass_left') && v && B.PASSES[v]) bilan.vues.add('passe ' + v);
      else if (g.clip === 'offload' && v) bilan.vues.add('offload ' + v);
      else if (g.clip === 'try' || g.clip === 'dive_try') { ok(B.ESSAIS[v], `essai sans style : ${v}`); compter(bilan.essais, v); bilan.vues.add('essai ' + v); }
      else if (g.clip === 'clearout_drive' || g.clip === 'contact_brace') { if (v && B.DEBLAYAGES[v]) { if (g.clip === 'clearout_drive') compter(bilan.deblayages, v); bilan.vues.add('déblayage ' + v); } else if (v) ok(B.DELOGEURS[v], `déblayage inconnu : ${v}`); }
      else if (g.clip === 'foul_tip' || g.clip === 'foul_charge') { bilan.dangereux++; bilan.vues.add('faute ' + g.clip); }
      else if (g.clip.startsWith('foul_') || g.clip.startsWith('scuffle_')) bilan.vues.add('geste ' + g.clip);
      else if (g.clip === 'charge_down' && v) bilan.vues.add('contre ' + v);
      else if (['punt', 'grubber', 'box_kick', 'chip', 'drop'].includes(g.clip) && v) bilan.vues.add('frappe ' + g.clip + ' ' + v);
    }
    if (e.ruck !== ruck) {
      ruck = e.ruck;
      const p = e.ruck?.plaquage;
      if (p) {
        ok(p.variante && B.PLAQUAGES30[p.variante], `plaquage sans variante connue : ${p.variante}`);
        ok(FAMILLES[p.type].includes(p.variante!), `plaquage ${p.type} → ${p.variante} : hors famille`);
        if (p.variante === 'a-deux') ok(!!p.secondId && p.secondId !== e.ruck!.plaqueurId, 'plaquage à deux : un second plaqueur, distinct du premier');
        compter(bilan.plaquages, p.variante!); bilan.vues.add('plaquage ' + p.variante);
      }
    }
    const d = e.ruck?.duel ?? null;
    if (d !== duel) {
      duel = d;
      if (d) {
        possessionAuDuel = e.possession;
        if (d.type === 'gratte') {
          ok(d.sequence && d.temps, 'un grattage du niveau 6 a sa séquence et ses trois temps');
          ok(Math.abs(d.fin - (d.contact + d.temps!.appui + d.temps!.lutte + d.temps!.fin)) < 1e-6, 'la séquence dure exactement ses trois temps');
          compter(bilan.grattages, d.sequence!); bilan.vues.add('grattage ' + d.sequence);
          if (d.sequence === 'rapide' || d.sequence === 'conteste') ok(d.issue === 'turnover', 'grattage gagné : il change le ballon de camp');
          if (d.sequence === 'perdu') ok(d.issue === 'attaqueConserve' && (d.nettoyeursIds?.length ?? 0) >= 1, 'grattage perdu : l\'attaque garde le ballon, un soutien le déloge');
          if (d.sequence === 'penalite' || d.sequence === 'tardif') ok(d.issue === 'penalite', 'grattage sifflé : pénalité');
        } else { ok(d.variante, 'un contre-ruck dit à combien il se mène'); bilan.vues.add('contre-ruck ' + d.variante + ' ' + d.issue); }
      }
    }
    // ⚠️ Le ballon ne change jamais de camp AVANT la fin de la séquence.
    if (d && e.sim < d.fin - 0.16) ok(e.possession === possessionAuDuel, 'possession inchangée pendant le duel du ruck');
    if (d?.type === 'gratte' && d.balle) ok(d.sequence === 'rapide' || d.sequence === 'conteste', 'seul un grattage gagné finit ballon en main');
    if (e.conquete !== conquete) {
      conquete = e.conquete;
      const c = e.conquete;
      if (c?.type === 'touche' && !c.rapide) {
        ok(c.jeu, 'une touche du niveau 6 annonce sa combinaison');
        compter(bilan.touches, c.jeu!); bilan.vues.add('touche ' + c.jeu);
        for (const id of c.feintes ?? []) ok(id !== c.cibleId && e.pions.some((p) => p.id === id && p.role === 'alignement'), 'un faux sauteur est dans l\'alignement, et ce n\'est pas le vrai');
      }
    }
    if (e.conquete?.issue?.cause) bilan.vues.add('touche contrée ' + e.conquete.issue.cause);
    if (e.lancement?.jeu?.startsWith('touche:')) bilan.vues.add('lancement ' + e.lancement.jeu);
    if (e.maul?.suite) bilan.vues.add('maul ' + e.maul.suite);
    if (e.aplatissage && e.aplatissage !== aplatissage) { aplatissage = e.aplatissage; ok(e.aplatissage.style, 'un essai du niveau 6 a son style'); }
    if (e.tir && e.tir !== tir) {
      tir = e.tir;
      if (e.tir.marqueurId) {
        ok(e.tir.celebration, 'une célébration choisie d\'après le match');
        ok((e.tir.feteurs?.length ?? 0) <= A.FETEURS[e.tir.celebration!], 'pas plus de coéquipiers que la célébration n\'en appelle');
        compter(bilan.fetes, e.tir.celebration!); bilan.vues.add('fête ' + e.tir.celebration);
      }
    }
    if (e.altercation && e.altercation !== altercation) {
      altercation = e.altercation;
      const a = e.altercation, de = e.pions.find((p) => p.id === a.declencheurId), sur = e.pions.find((p) => p.id === a.cibleId);
      ok(de && sur && de.cote !== sur.cote, 'altercation : un déclencheur et sa cible, de deux camps');
      ok(e.phase === 'penalite', 'une altercation ne naît qu\'à un coup de sifflet');
      ok(a.fin - a.debut <= 8, 'une altercation ne dure pas');
      ok(a.participants[0] === a.declencheurId && a.participants[1] === a.cibleId, 'le jeu sait qui a déclenché l\'incident');
      ok(a.niveau === 1 ? a.participants.length === 2 : a.participants.length > 2, 'niveau 1 : deux joueurs ; au-delà, d\'autres s\'en mêlent');
      if (a.niveau === 1) ok(a.sanction === 'rappel', 'niveau 1 : un rappel');
      bilan.altercations.push(a.niveau); bilan.vues.add('altercation niveau ' + a.niveau + ' → ' + a.sanction);
    }
    if (e.altercation) ok(e.phase === 'penalite' || e.sim >= e.altercation.fin, 'pendant l\'altercation, la pénalité attend');
    // La fatigue de geste est relue une fois par pas, avant les efforts du pas : elle suit celle du moteur à un cran près.
    for (const p of e.pions) if (p.surLeTerrain && p.fatigue !== undefined) ok(Math.abs(p.fatigue - A.niveauFatigue(p)) <= 1, 'la fatigue lue par la scène suit celle du moteur');
  }
  ok(e.fini, `le match ${k} va à son terme`);
  if (bilan) { bilan.points += e.scoreA + e.scoreB; bilan.nEssais += e.essaisA + e.essaisB; ok((e.altercations?.n ?? 0) <= ALTERCATIONS_MAX, 'au plus deux altercations par match'); }
  return e;
}
const neuf = (): Bilan => ({
  vues: new Set(), plaquages: new Map(), manques: new Map(), crochets: new Map(), touches: new Map(), grattages: new Map(), deblayages: new Map(),
  essais: new Map(), fetes: new Map(), receptions: new Map(), altercations: [], dangereux: 0, sauts: 0, points: 0, nEssais: 0, journal: [],
});
const total = neuf();
const decouvertes: [number, number][] = [];
for (let k = 0; k < MATCHS; k++) {
  const b = neuf();
  jouer(k, 6, b);
  for (const v of b.vues) total.vues.add(v);
  for (const cle of ['plaquages', 'manques', 'crochets', 'touches', 'grattages', 'deblayages', 'essais', 'fetes', 'receptions'] as const) for (const [n, c] of b[cle]) total[cle].set(n, (total[cle].get(n) ?? 0) + c);
  total.altercations.push(...b.altercations); total.dangereux += b.dangereux; total.sauts += b.sauts; total.points += b.points; total.nEssais += b.nEssais;
  decouvertes.push([k + 1, total.vues.size]);
  if (k === 0) {
    // Deux rejoues du même match montrent exactement la même chose : mêmes gestes, mêmes variantes, aux mêmes instants.
    const b2 = neuf();
    jouer(0, 6, b2);
    ok(empreinte(b.journal.join('|')) === empreinte(b2.journal.join('|')), 'deux rejoues du même match : la même suite d\'animations');
    console.log(`   Match 0 rejoué : ${b.journal.length} gestes, empreinte ${empreinte(b.journal.join('|'))} — identique.`);
  }
}
const tri = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]);
const part = (m: Map<string, number>) => { const t = [...m.values()].reduce((n, x) => n + x, 0); return `[${(t / MATCHS).toFixed(1)} par match] ` + tri(m).map(([n, c]) => `${n} ${(100 * c / Math.max(1, t)).toFixed(0)} %`).join(' · '); };
console.log(`   Plaquages (${[...total.plaquages.values()].reduce((n, x) => n + x, 0)}, ${total.plaquages.size} variantes) : ${part(total.plaquages)}`);
console.log(`   Manqués (${total.manques.size} variantes) : ${part(total.manques)}`);
console.log(`   Crochets (${total.crochets.size}) : ${part(total.crochets)}`);
console.log(`   Réceptions (${total.receptions.size}) : ${part(total.receptions)}`);
console.log(`   Déblayages (${total.deblayages.size}) : ${part(total.deblayages)}`);
console.log(`   Grattages (${total.grattages.size}) : ${part(total.grattages)}`);
console.log(`   Touches (${total.touches.size} combinaisons) : ${part(total.touches)}`);
console.log(`   Essais (${total.essais.size} styles) : ${part(total.essais)}`);
console.log(`   Célébrations : ${part(total.fetes)}`);
console.log(`   Plaquages dangereux (soulevé, charge) : ${total.dangereux} en ${MATCHS} matchs. Altercations : ${total.altercations.length} (${total.altercations.join(', ') || 'aucune'}).`);
console.log(`   Joueurs déplacés de plus de 2,4 m en un pas, ballon vivant : ${total.sauts}.`);
if (MATCHS >= 6) {
  ok(total.plaquages.size >= 14, `au moins quatorze plaquages différents vus en ${MATCHS} matchs (${total.plaquages.size})`);
  ok(total.manques.size >= 7, `au moins sept plaquages manqués différents (${total.manques.size})`);
  ok(total.touches.size >= 10, `au moins dix combinaisons de touche (${total.touches.size})`);
  ok(total.altercations.length <= MATCHS, 'moins d\'une altercation par match en moyenne');
  const plusFrequent = tri(total.plaquages)[0][1] / [...total.plaquages.values()].reduce((n, x) => n + x, 0);
  ok(plusFrequent < 0.4, `aucun plaquage ne fait plus de quarante pour cent des plaquages (${(plusFrequent * 100).toFixed(0)} %)`);
}

// ═══ 4. LA VARIÉTÉ ══════════════════════════════════════════════════════════
titre('4. Séquences différentes vues, match après match');
for (const [n, vus] of decouvertes) if ([1, 2, 3, 6, 9, 12, 18, 24].includes(n) || n === MATCHS) console.log(`   après ${String(n).padStart(2)} match(s) : ${vus} séquences différentes`);
if (MATCHS >= 6) ok(decouvertes[MATCHS - 1][1] > decouvertes[0][1] + 8, 'on découvre encore des séquences après le premier match');

// ═══ 5. LE NIVEAU 5 N'A PAS BOUGÉ ═══════════════════════════════════════════
titre('5. Sous le niveau 6, rien ne change');
{
  const e = jouer(0, 5);
  ok(!e.pions.some((p) => p.fatigue !== undefined), 'niveau 5 : pas de fatigue de geste');
  ok(!(e.gestes ?? []).some((g) => (g.variante ?? '').startsWith('manque:')), 'niveau 5 : les gestes d\'origine');
  ok(e.altercations === undefined, 'niveau 5 : aucune altercation');
}
console.log(`\n✅ ${controles} contrôles — ${MATCHS} matchs, ${(total.points / MATCHS).toFixed(1)} points et ${(total.nEssais / MATCHS).toFixed(1)} essais par match au niveau 6.`);
