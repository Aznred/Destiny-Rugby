// LA BANDE-SON DE LA PUB « CATASTROPHE » — sa partition, écrite avec les instruments communs (instruments.cjs).
// Tout est synthétisé, sauf le stade et le pack de la scène 5, qui sont les sons du jeu lui-même (public/rn26/sons).
// Tout est calé sur la chronologie, donc sur la voix réelle de chaque langue.
//
//   node trailer/catastrophe/son.cjs fr     # → son/mixage-fr.wav (voix + musique + effets) et son/musique-effets-fr.wav
const path = require('node:path');
const { racine, ouvrirMixage, fermerMixage, F, bruit, passeHaut, balayer, galber, NOTE, sousBasse, impact, cuivres, nappe, corde, pince, cloche, souffle, montee, grondement, rugissement, sirene, debris, craquement, coeur, arretDeBande, frappe, grosseCaisse, claquement, charleston, accord, basse, echantillon } = require('./instruments.cjs');

function mixer(langue) {
  const mix = ouvrirMixage(__dirname, langue);
  const { C, M, rng, poser, P } = mix;
  const [, c12, c23, c34, c45] = C.scenes.map(s => s.debut);
  const J = C.jeu, fin = C.duree;
  const finVoix3 = C.voix[2].fin;
  const temps = 0.5;                                          // 120 à la noire

  // ── Scène 1 : la menace ──
  poser(impact(rng, 1), 0, 1.3, 0, 0.5);
  poser(cuivres(2.6, NOTE.D1 * 2, rng), 0.02, 0.9, 0, 0.5);
  poser(galber(grondement(c12 + 0.3, rng), k => 0.45 + 0.55 * k), 0, 0.22, 0, 0.1);
  poser(souffle(P.entree.debut - 0.2, 180, 900, rng, 0.9, k => 0.35 + 0.65 * k * k), 0.2, 0.10, -0.2, 0.3);
  poser(souffle(0.5, 400, 3200, rng), P.entree.debut - 0.36, 0.5, 0, 0.3);
  poser(impact(rng, 0.7), P.entree.debut, 0.6, 0, 0.5);
  poser(galber(rugissement(P.foule.debut - P.entree.debut + 0.15, rng, 90, 1400), k => 0.5 + 0.5 * k), P.entree.debut, 0.20, 0.1, 0.25);
  poser(montee(P.foule.debut - P.entree.debut, rng), P.entree.debut, 0.20, 0, 0.3);
  poser(impact(rng, 0.8), P.foule.debut, 0.62, 0, 0.6);
  poser(sirene(c12 - P.foule.debut + 0.5), P.foule.debut, 0.055, -0.5, 0.9);
  poser(sirene(c12 - P.foule.debut + 0.2), P.foule.debut + 0.3, 0.035, 0.6, 0.9);
  poser(montee(0.8, rng), c12 - 0.8, 0.22, 0, 0.3);

  // L'ostinato de cordes : il serre de scène en scène, et s'arrête net au laboratoire.
  const motif = [NOTE.D2, NOTE.D2, NOTE.D3, NOTE.D2, NOTE.F2, NOTE.D2, NOTE.D3, NOTE.C2 * 2];
  for (let i = 0, t = 0.5; t < c23 - 0.05; i++, t += temps / 2) {
    const tension = Math.min(1, t / c23);
    const f = motif[i % motif.length] * (t >= c12 ? 2 : 1);
    poser(corde(f, 0.22, rng, 0.6 + 0.8 * tension), t, (0.17 + 0.20 * tension) * (i % 2 ? 0.7 : 1), i % 2 ? 0.35 : -0.35, 0.25);
    if (t >= c12 && i % 2 === 0) poser(corde(f * 1.5, 0.2, rng, 1.2), t, 0.07, 0.5, 0.3);
  }
  // ── Scène 2 : la destruction — un coup sur chaque temps, un impact à chaque coupe ──
  for (let t = c12; t < c23 - 0.1; t += temps) poser(sousBasse(0.5, 105, 42, 0.04, 0.16), t, 0.42, 0, 0.3);
  poser(impact(rng, 1.2), c12, 0.95, 0, 0.6);
  poser(cuivres(1.7, NOTE.F2, rng), c12, 0.40, 0, 0.5);
  poser(galber(rugissement(P.effondrement.debut - c12 + 0.2, rng, 60, 900), k => 0.3 + 0.7 * k), c12, 0.24, 0, 0.3);
  poser(galber(passeHaut(bruit(P.effondrement.debut - c12, rng), 2500), k => 0.05 + 0.25 * k * k), c12, 0.10, 0.2, 0.3);
  poser(souffle(0.4, 500, 2600, rng), P.effondrement.debut - 0.3, 0.45, 0, 0.3);
  poser(impact(rng, 1.0), P.effondrement.debut, 0.85, -0.2, 0.6);
  poser(cuivres(1.5, NOTE.G2, rng), P.effondrement.debut, 0.36, 0, 0.5);
  poser(debris(P.faille.debut - P.effondrement.debut, rng), P.effondrement.debut, 0.36, -0.15, 0.4);
  poser(grondement(P.faille.debut - P.effondrement.debut, rng, 110), P.effondrement.debut, 0.26, 0, 0.2);
  poser(souffle(0.4, 500, 2600, rng), P.faille.debut - 0.3, 0.45, 0, 0.3);
  poser(impact(rng, 0.9), P.faille.debut, 0.8, 0.2, 0.6);
  poser(cuivres(1.5, NOTE.A2, rng), P.faille.debut, 0.36, 0, 0.5);
  const dFaille = P.onde.debut - P.faille.debut;
  for (const k of [0.12, 0.34, 0.55, 0.74, 0.9]) poser(craquement(rng), P.faille.debut + dFaille * k, 0.42 + 0.3 * k, (rng() - 0.5) * 0.8, 0.5);
  poser(grondement(dFaille, rng, 120), P.faille.debut, 0.28, 0, 0.2);
  poser(debris(dFaille, rng, 12), P.faille.debut, 0.16, 0.3, 0.4);
  poser(souffle(0.45, 300, 2200, rng), P.onde.debut - 0.34, 0.5, 0, 0.3);
  poser(impact(rng, 1.6), P.onde.debut, 1.05, 0, 0.8);
  poser(sousBasse(3.2, 64, 26, 0.5, 1.1), P.onde.debut, 0.75, 0, 0.3);
  poser(cuivres(c23 - P.onde.debut + 0.3, NOTE.Bb2 / 2, rng), P.onde.debut, 0.46, 0, 0.6);
  poser(galber(balayer(bruit(c23 - P.onde.debut, rng), k => 2600 * Math.pow(0.08, k), 0.8, 'bas'), k => Math.pow(1 - k, 1.2)), P.onde.debut, 0.5, 0, 0.5);

  // ── Scène 3 : le mystère — la musique tombe, il reste une nappe froide, les bips du laboratoire, puis le cœur ──
  poser(sousBasse(2.4, 58, 30, 0.3, 0.9), c23, 0.5, 0, 0.5);
  const duMystere = finVoix3 - c23 + 0.25;
  poser(nappe(duMystere, [NOTE.D3, NOTE.A3, NOTE.Eb4], rng, 700), c23, 0.20, 0, 0.6, 0.3);
  poser(nappe(duMystere, [NOTE.D5, NOTE.D5 * 1.059], rng, 2400), c23 + 0.3, 0.035, 0.3, 0.9, 0.3);
  poser(galber(grondement(duMystere, rng, 60), k => 0.6), c23, 0.12, 0, 0.2, 0.3);
  for (let t = P.labo.debut + 0.1; t < P.labo.fin - 0.1; t += 0.42) {
    poser(galber(cloche(1318, 0.3), k => 1), t, 0.07, 0.4, 0.8);
    for (let b = 0; b < 3; b++) poser(galber(balayer(bruit(0.03, rng), () => 2400 + 1800 * rng(), 6), (k, tt) => Math.exp(-tt / 0.008)), t + 0.1 + rng() * 0.28, 0.05, -0.5 + rng(), 0.3);
  }
  const silence = c34 - finVoix3;                              // ce qui reste avant la révélation
  for (const k of [0.16, 0.50, 0.78]) poser(coeur(), finVoix3 + silence * k, 1.5 + 0.5 * k, 0, 0.15);
  poser(montee(Math.min(1.25, silence * 0.72), rng), c34 - Math.min(1.25, silence * 0.72), 1.5, 0, 0.35, 0.004);

  // ── Scène 4 : la révélation — la montée cale comme une bande qu'on arrête, puis la légèreté ──
  poser(arretDeBande(0.5, rng), c34 - 0.015, 1.3, 0, 0.1);
  poser(galber(grondement(c45 - c34, rng, 70), () => 0.5), c34 + 0.4, 0.13, 0, 0.3, 0.2);
  const pas = [NOTE.D3, NOTE.A3, NOTE.F3, NOTE.A3, NOTE.D3, NOTE.Bb2 * 2, NOTE.F3, NOTE.A3, NOTE.G3, NOTE.Bb2 * 2, NOTE.E4, NOTE.A3];
  for (let i = 0, t = c34 + 0.75; t < P.ruee.debut - 0.1; i++, t += 0.25) poser(pince(pas[i % pas.length], 0.5, rng), t, i % 4 === 0 ? 0.85 : 0.58, i % 2 ? 0.4 : -0.4, 0.35);
  for (let t = c34 + 0.75; t < P.ruee.debut - 0.3; t += 1.0) poser(pince(NOTE.D2 * 2, 0.8, rng), t, 0.9, 0, 0.25);
  const dRuee = c45 - P.ruee.debut;
  poser(souffle(dRuee + 0.1, 160, 4200, rng, 1.1, k => Math.pow(k, 2.4)), P.ruee.debut - 0.08, 0.95, 0, 0.3, 0.004);
  poser(montee(dRuee, rng), P.ruee.debut, 0.30, 0, 0.3, 0.004);

  // ── Scène 5 : la frappe, le stade, la musique qui démarre, le carton, la signature sonore ──
  const laFrappe = c45 + (M.tir.frappe - M.tir.segments[0].de) / M.tir.ips / (M.tir.vitesse || 1);
  poser(frappe(rng), laFrappe, 2.6, 0, 0.25);
  poser(souffle(0.7, 900, 240, rng, 1.2, k => Math.pow(1 - k, 1.5)), laFrappe + 0.02, 0.45, 0.2, 0.4);
  const sons = path.join(racine, 'public', 'rn26', 'sons');
  poser(galber(echantillon(path.join(sons, 'foule_forte.ogg')), (k, t) => Math.min(1, t / 0.25)), c45, 0.75, 0, 0.1, 0.6);
  const passage = c45 + (M.tir.segments[0].a - M.tir.segments[0].de + 1 + (M.tir.entrePoteaux - M.tir.segments[1].de)) / M.tir.ips;
  poser(echantillon(path.join(sons, 'acclamation.ogg')), passage - 0.15, 1.0, 0, 0.1, 0.8);
  poser(echantillon(path.join(sons, 'sifflet_essai.ogg')), passage + 0.05, 0.4, 0.2, 0.2);
  poser(souffle(0.34, 600, 3200, rng), J.pack[0] - 0.26, 0.45, 0, 0.3);
  poser(echantillon(path.join(sons, 'pack1.ogg')), J.pack[0], 0.7, 0, 0.2, 0.2);
  poser(souffle(0.34, 600, 3200, rng), J.compo[0] - 0.26, 0.45, 0, 0.3);
  poser(souffle(0.34, 500, 2800, rng), J.titre[0] - 0.26, 0.5, 0, 0.3);
  poser(impact(rng, 0.9), J.titre[0], 0.6, 0, 0.6);

  // La musique de la chute : ré majeur, quatre temps au plancher, qui s'arrête sur la signature.
  const tempo = 60 / 126, depart = laFrappe + 0.06, arret = fin - 1.42;
  const grille = [[NOTE.D2, [NOTE.D4, NOTE['F#4'], NOTE.A4]], [NOTE.A1 * 2, [NOTE['C#4'], NOTE.E4, NOTE.A4]], [NOTE.B3 / 2, [NOTE.D4, NOTE['F#4'], NOTE.B4]], [NOTE.G2, [NOTE.D4, NOTE.G4, NOTE.B4]]];
  for (let b = 0, t = depart; t < arret; b++, t += tempo) {
    const [fondamentale, notes] = grille[Math.floor(b / 2) % grille.length];
    poser(grosseCaisse(), t, 1.5, 0, 0.05);
    if (b % 2 === 1) poser(claquement(rng), t, 0.8, 0.1, 0.4);
    poser(charleston(rng), t + tempo / 2, 0.4, 0.5, 0.1);
    poser(basse(fondamentale, tempo * 0.46, rng), t, 0.8, 0, 0);
    poser(basse(fondamentale, tempo * 0.40, rng), t + tempo / 2, 0.6, 0, 0);
    poser(accord(notes, tempo * 0.9, rng), t + (b % 2 ? tempo / 2 : 0), 0.42, -0.3, 0.4);
    if (b % 4 === 3) poser(accord(notes.map(f => f * 2), tempo * 0.5, rng), t + tempo * 0.75, 0.26, 0.4, 0.4);
  }
  // La signature : trois notes qui montent, puis l'accord tenu.
  const logo = fin - 1.32;
  poser(impact(rng, 0.6), logo, 0.9, 0, 0.6);
  [[NOTE.D5, 0], [NOTE.A5, 0.13], [NOTE.D6, 0.26]].forEach(([f, d], i) => { poser(cloche(f, 1.3), logo + d, 0.8, -0.4 + 0.4 * i, 0.8, 0.25); poser(pince(f / 2, 0.9, rng), logo + d, 0.6, 0, 0.5); });
  poser(nappe(1.25, [NOTE.D3, NOTE.A3, NOTE.D4, NOTE['F#4']], rng, 2600), logo + 0.26, 0.5, 0, 0.6, 0.5);

  fermerMixage(mix, `frappe à ${laFrappe.toFixed(2)} s, ballon entre les poteaux à ${passage.toFixed(2)} s`);
}

mixer(process.argv[2] === 'en' ? 'en' : 'fr');
