// LA BANDE-SON DE LA PUB « ENQUÊTE » — sa partition, écrite avec les instruments communs (../catastrophe/instruments.cjs).
// Un documentaire criminel : une nappe grave, l'horloge qui bat, le ronflement des écrans, des obturateurs d'appareil
// photo — puis la bande qui cale, le stade, et l'essai. Tout est synthétisé, sauf le stade et le pack, qui sont les sons
// du jeu lui-même (public/rn26/sons). Tout est calé sur la chronologie, donc sur la voix réelle de chaque langue.
//
//   node trailer/enquete/son.cjs fr     # → son/mixage-fr.wav (voix + musique + effets) et son/musique-effets-fr.wav
const path = require('node:path');
const { racine, ouvrirMixage, fermerMixage, F, n, NOTE, bruit, passeBas, passeHaut, balayer, galber, somme, gain, sousBasse, impact, cuivres, nappe, corde, pince, cloche,
  souffle, montee, grondement, coeur, arretDeBande, grosseCaisse, claquement, charleston, accord, basse, echantillon } = require('../catastrophe/instruments.cjs');

// ── Les sons propres à l'enquête ──
/** Le tic de l'horloge : un clic sec, plus grave une fois sur deux. */
const tic = (rng, grave) => galber(balayer(bruit(0.03, rng), () => (grave ? 1900 : 2600), 9), (k, t) => Math.exp(-t / 0.005));
/** L'obturateur d'un appareil photo : deux claquements et le moteur. */
function obturateur(rng) {
  const clac = () => galber(passeHaut(bruit(0.035, rng), 2400), (k, t) => Math.exp(-t / 0.004));
  const x = new Float32Array(n(0.28));
  const poserIci = (s, t0, g) => { const o = n(t0); for (let i = 0; i < s.length && o + i < x.length; i++) x[o + i] += s[i] * g; };
  poserIci(clac(), 0, 1); poserIci(clac(), 0.075, 0.8);
  poserIci(galber(balayer(bruit(0.16, rng), () => 950, 5), k => Math.sin(Math.PI * k) * 0.5), 0.09, 0.35);
  return x;
}
/** La bande qui saute : un grésillement haché, et la chute de tension. */
function sautDeBande(rng) {
  const grain = galber(passeHaut(bruit(0.34, rng), 500), (k, t) => (Math.sin(2 * Math.PI * 58 * t) > 0 ? 1 : 0.15) * (Math.sin(2 * Math.PI * 13 * t) > -0.2 ? 1 : 0) * Math.exp(-t / 0.16));
  for (let i = 0; i < grain.length; i++) if (i % 6) grain[i] = grain[i - (i % 6)];      // l'image qui se fige : le son aussi
  return somme(gain(grain, 0.9), gain(sousBasse(0.9, 140, 34, 0.12, 0.32), 0.9));
}
/** Le ronflement des écrans : le secteur et ses harmoniques, un souffle de bande par-dessus. */
function ronflement(duree, rng) {
  const x = new Float32Array(n(duree));
  for (let i = 0; i < x.length; i++) { const t = i / F; x[i] = Math.sin(2 * Math.PI * 50 * t) * 0.5 + Math.sin(2 * Math.PI * 100 * t) * 0.3 + Math.sin(2 * Math.PI * 150 * t) * 0.16 + Math.sin(2 * Math.PI * 250 * t) * 0.06; }
  return galber(somme(x, gain(passeHaut(bruit(duree, rng), 4200), 0.05)), (k, t) => Math.min(1, t / 0.4) * Math.min(1, (duree - t) / 0.3));
}

function mixer(langue) {
  const mix = ouvrirMixage(__dirname, langue);
  const { C, M, rng, poser, P } = mix;
  const [, c12, c23, c34, c45] = C.scenes.map(s => s.debut);
  const J = C.jeu, fin = C.duree;
  const finVoix3 = C.voix[2].fin;
  const temps = 0.5;                                          // 120 à la noire : l'horloge bat la mesure
  const motDisparu = C.mots.find(m => m.scene === 1 && /disparu|vanished/i.test(m.mot));
  const disparition = motDisparu ? motDisparu.debut + 0.14 : c12 * 0.6;

  // ── Scènes 1 à 3 : l'enquête ──
  poser(impact(rng, 0.8), 0, 1.0, 0, 0.6);
  poser(nappe(finVoix3 + 0.3, [NOTE.D2, NOTE.A2, NOTE.D3], rng, 420), 0, 0.42, 0, 0.5, 0.4);
  poser(nappe(finVoix3 + 0.3, [NOTE.F3, NOTE.A3], rng, 650), 1.5, 0.12, 0.3, 0.7, 0.4);
  poser(galber(grondement(finVoix3 + 0.3, rng, 70), () => 0.6), 0, 0.10, 0, 0.2, 0.3);
  poser(ronflement(c12 + 0.2, rng), 0, 0.10, -0.2, 0.2);
  for (let i = 0, t = 0.5; t < finVoix3 + 0.1; i++, t += temps) poser(tic(rng, i % 2 === 1), t, 0.22, i % 2 ? 0.25 : -0.25, 0.35);
  // Le piano sourd : une note tous les deux temps, ré mineur.
  const motif = [NOTE.D3, NOTE.F3, NOTE.A3, NOTE.E4 / 2, NOTE.D3, NOTE.F3, NOTE.Bb2, NOTE.A2];
  for (let i = 0, t = 1.0; t < finVoix3 - 0.2; i++, t += temps * 2) { poser(pince(motif[i % motif.length], 1.6, rng), t, 0.85, i % 2 ? 0.2 : -0.2, 0.6, 0.3); poser(cloche(motif[i % motif.length] * 2, 1.2), t, 0.12, 0, 0.8, 0.3); }
  // L'homme disparaît de l'image : la bande saute.
  poser(sautDeBande(rng), disparition - 0.03, 1.35, 0, 0.4);
  poser(souffle(0.5, 2400, 300, rng, 1.4, k => Math.pow(1 - k, 1.4)), disparition + 0.25, 0.4, 0.2, 0.5);

  // Scène 2 : les suspects sous les projecteurs, puis le tableau.
  poser(impact(rng, 0.9), c12, 1.0, 0, 0.6);
  poser(cuivres(1.6, NOTE.D2, rng), c12, 0.36, 0, 0.5);
  for (let i = 0, t = c12; t < c23 - 0.05; i++, t += temps / 2) poser(corde(i % 4 === 2 ? NOTE.F2 : NOTE.D2, 0.2, rng, 0.7), t, i % 2 ? 0.16 : 0.24, i % 2 ? 0.3 : -0.3, 0.3);
  const dSuspects = P.tableau.debut - c12;
  for (const k of [0.22, 0.52, 0.80]) poser(obturateur(rng), c12 + dSuspects * k, 0.95, (rng() - 0.5) * 0.8, 0.35);
  poser(souffle(0.36, 500, 2600, rng), P.tableau.debut - 0.27, 0.42, 0, 0.3);
  poser(impact(rng, 0.7), P.tableau.debut, 0.8, 0, 0.6);
  poser(cuivres(1.5, NOTE.F2, rng), P.tableau.debut, 0.30, 0, 0.5);

  // Scène 3 : la pelouse, de nuit. La musique s'amincit ; il reste l'horloge, puis le cœur.
  poser(souffle(0.36, 500, 2600, rng), c23 - 0.27, 0.42, 0, 0.3);
  poser(impact(rng, 0.8), c23, 0.9, 0, 0.7);
  poser(nappe(finVoix3 - c23 + 0.3, [NOTE.D5, NOTE.D5 * 1.059], rng, 2400), c23 + 0.2, 0.05, 0.3, 0.9, 0.3);
  const dIndices = P.craie.debut - c23;
  for (const k of [0.35, 0.72]) poser(obturateur(rng), c23 + dIndices * k, 0.8, (rng() - 0.5) * 0.8, 0.4);
  poser(souffle(0.36, 500, 2600, rng), P.craie.debut - 0.27, 0.36, 0, 0.3);
  poser(sousBasse(2.2, 62, 30, 0.3, 0.8), P.craie.debut, 0.6, 0, 0.5);
  const silence = c34 - finVoix3;
  for (const k of [0.14, 0.48, 0.76]) poser(coeur(), finVoix3 + silence * k, 1.5 + 0.5 * k, 0, 0.15);
  poser(montee(Math.min(1.15, silence * 0.7), rng), c34 - Math.min(1.15, silence * 0.7), 1.5, 0, 0.35, 0.004);

  // ── Scène 4 : la chute — la bande cale, la caméra de surveillance dézoome : c'est un stade ──
  const tEssai = C.voix[3].fin + (M.essai.delai ?? 0.15);
  const sons = path.join(racine, 'public', 'rn26', 'sons');
  poser(arretDeBande(0.5, rng), c34 - 0.015, 1.3, 0, 0.1);
  poser(souffle(M.essai.intro, 300, 5200, rng, 1.6, k => Math.pow(k, 1.6) * (1 - Math.pow(k, 12))), c34 + 0.04, 0.7, 0, 0.3);      // la bande rembobinée
  poser(galber(echantillon(path.join(sons, 'rumeur.ogg')), (k, t) => Math.min(1, t / 0.5)), c34 + 0.15, 3.6, 0, 0.1, 0.5);
  poser(galber(echantillon(path.join(sons, 'foule_forte.ogg')), (k, t) => Math.min(1, t / 1.2) * (0.45 + 0.55 * Math.min(1, t / Math.max(1, tEssai - c34)))), c34 + M.essai.intro, 4.2, 0, 0.1, 0.8);
  poser(montee(Math.min(1.6, tEssai - c34 - M.essai.intro), rng), tEssai - Math.min(1.6, tEssai - c34 - M.essai.intro), 0.5, 0, 0.3, 0.004);
  // L'essai.
  poser(impact(rng, 1.1), tEssai, 1.0, 0, 0.6);
  poser(echantillon(path.join(sons, 'acclamation.ogg')), tEssai - 0.05, 2.4, 0, 0.1, 0.8);
  poser(echantillon(path.join(sons, 'sifflet_essai.ogg')), tEssai + 0.3, 0.8, 0.2, 0.2);

  // ── Scène 5 : le pack, la composition, le carton ──
  poser(souffle(0.34, 600, 3200, rng), J.pack[0] - 0.26, 0.45, 0, 0.3);
  poser(echantillon(path.join(sons, 'pack1.ogg')), J.pack[0], 0.7, 0, 0.2, 0.2);
  poser(souffle(0.34, 600, 3200, rng), J.compo[0] - 0.26, 0.45, 0, 0.3);
  poser(souffle(0.34, 500, 2800, rng), J.titre[0] - 0.26, 0.5, 0, 0.3);
  poser(impact(rng, 0.9), J.titre[0], 0.6, 0, 0.6);

  // La musique de la chute : ré majeur, quatre temps au plancher, de l'essai à la signature.
  const tempo = 60 / 126, depart = tEssai + 0.05, arret = fin - 1.42;
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
  // La signature : trois notes qui montent, puis l'accord tenu (la même que dans la première pub).
  const logo = fin - 1.32;
  poser(impact(rng, 0.6), logo, 0.9, 0, 0.6);
  [[NOTE.D5, 0], [NOTE.A5, 0.13], [NOTE.D6, 0.26]].forEach(([f, d], i) => { poser(cloche(f, 1.3), logo + d, 0.8, -0.4 + 0.4 * i, 0.8, 0.25); poser(pince(f / 2, 0.9, rng), logo + d, 0.6, 0, 0.5); });
  poser(nappe(1.25, [NOTE.D3, NOTE.A3, NOTE.D4, NOTE['F#4']], rng, 2600), logo + 0.26, 0.5, 0, 0.6, 0.5);

  fermerMixage(mix, `disparition à ${disparition.toFixed(2)} s, essai à ${tEssai.toFixed(2)} s`);
}

mixer(process.argv[2] === 'en' ? 'en' : 'fr');
