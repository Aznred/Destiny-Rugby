// LES INSTRUMENTS ET LE MIXAGE — communs à toutes les pubs. Tout est synthétisé ici : grondements, impacts, vague, débris,
// montée, cœur, arrêt de bande, cordes, cuivres, batterie. Chaque pub écrit sa partition (son.cjs) avec ces sons ;
// `ouvrirMixage` lui donne de quoi les poser sur la chronologie, `fermerMixage` ajoute la voix et écrit les fichiers.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const F = 48000;
const racine = path.resolve(__dirname, '..', '..');

// ── Outils ─────────────────────────────────────────────────────────────────────────────────────────────────
function hasard(graine) { let a = graine >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; }
const n = duree => Math.max(1, Math.round(duree * F));
const bruit = (duree, rng) => { const x = new Float32Array(n(duree)); for (let i = 0; i < x.length; i++) x[i] = rng() * 2 - 1; return x; };
function passeBas(x, fc, poles = 2) {
  const a = 1 - Math.exp(-2 * Math.PI * fc / F);
  for (let p = 0; p < poles; p++) { let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; } }
  return x;
}
function passeHaut(x, fc) {
  const a = 1 - Math.exp(-2 * Math.PI * fc / F); let y = 0;
  for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] -= y; }
  return x;
}
/** Filtre à variable d'état, fréquence et sortie au choix à chaque échantillon (balayages). */
function balayer(x, frequence, Q = 1.2, sortie = 'bande') {
  let bas = 0, bande = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin(Math.PI * Math.min(9000, frequence(i / x.length, i / F)) / F);
    bas += f * bande; const haut = x[i] - bas - bande / Q; bande += f * haut;
    x[i] = sortie === 'bas' ? bas : sortie === 'haut' ? haut : bande;
  }
  return x;
}
const galber = (x, forme) => { for (let i = 0; i < x.length; i++) x[i] *= forme(i / x.length, i / F); return x; };
const somme = (...pistes) => { const y = new Float32Array(Math.max(...pistes.map(p => p.length))); for (const p of pistes) for (let i = 0; i < p.length; i++) y[i] += p[i]; return y; };
const gain = (x, g) => { for (let i = 0; i < x.length; i++) x[i] *= g; return x; };
const scie = phase => 2 * (phase - Math.floor(phase + 0.5));
const NOTE = { D1: 36.71, A1: 55, C2: 65.41, D2: 73.42, F2: 87.31, G2: 98, A2: 110, Bb2: 116.54, C3: 130.81, D3: 146.83, F3: 174.61, 'F#3': 185, G3: 196, A3: 220, B3: 246.94, 'C#4': 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, 'F#4': 369.99, G4: 392, A4: 440, B4: 493.88, D5: 587.33, 'F#5': 739.99, A5: 880, D6: 1174.66 };

// ── Instruments ────────────────────────────────────────────────────────────────────────────────────────────
function sousBasse(duree, f0, f1, chute, extinction) {
  const x = new Float32Array(n(duree)); let phase = 0;
  for (let i = 0; i < x.length; i++) { const t = i / F; phase += (f1 + (f0 - f1) * Math.exp(-t / chute)) / F; x[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-t / extinction) * Math.min(1, t * 400); }
  return x;
}
function impact(rng, poids = 1) {
  const souffle = galber(passeBas(bruit(1.2, rng), 1500 + 900 * poids), (k, t) => Math.exp(-t / (0.12 + 0.12 * poids)) * Math.min(1, t * 900));
  const claque = galber(passeHaut(bruit(0.05, rng), 1800), (k, t) => Math.exp(-t / 0.008));
  return somme(gain(sousBasse(2.2, 92, 31, 0.09, 0.38 + 0.25 * poids), 1.0), gain(souffle, 0.55), gain(claque, 0.35));
}
function cuivres(duree, frequence, rng) {                    // le « braam » : des scies désaccordées qui s'ouvrent puis se referment
  const x = new Float32Array(n(duree));
  const voix = [1, 1.006, 0.994, 2.003, 1.997, 0.5].map(r => ({ r, p: rng() }));
  for (let i = 0; i < x.length; i++) { let s = 0; for (const v of voix) { v.p += frequence * v.r / F; s += scie(v.p); } x[i] = s / voix.length; }
  balayer(x, k => 180 + 2600 * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.15)), 1.6), 0.9, 'bas');
  galber(x, (k, t) => Math.min(1, t / 0.06) * Math.pow(1 - k, 1.4));
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * 2.6);
  return x;
}
function nappe(duree, frequences, rng, ouverture = 900) {
  const x = new Float32Array(n(duree));
  const voix = frequences.flatMap(f => [0.997, 1, 1.004].map(r => ({ f: f * r, p: rng() })));
  for (let i = 0; i < x.length; i++) { let s = 0; for (const v of voix) { v.p += v.f / F; s += scie(v.p); } x[i] = s / voix.length; }
  passeBas(x, ouverture, 3);
  return galber(x, (k, t) => Math.min(1, t / 0.7) * Math.min(1, (duree - t) / 0.35));
}
function corde(frequence, duree, rng, mordant = 1) {         // une note courte de cordes frottées
  const x = new Float32Array(n(duree)); const p = [rng(), rng(), rng()];
  for (let i = 0; i < x.length; i++) { p[0] += frequence / F; p[1] += frequence * 1.005 / F; p[2] += frequence * 2 / F; x[i] = (scie(p[0]) + scie(p[1]) + 0.4 * scie(p[2])) / 2.4; }
  balayer(x, (k, t) => 320 + 2400 * mordant * Math.exp(-t / 0.07), 1.1, 'bas');
  return galber(x, (k, t) => Math.min(1, t / 0.006) * Math.exp(-t / (duree * 0.45)));
}
function pince(frequence, duree, rng) {                      // corde pincée (Karplus-Strong)
  const x = new Float32Array(n(duree)); const retard = Math.round(F / frequence); const tampon = new Float32Array(retard);
  for (let i = 0; i < retard; i++) tampon[i] = rng() * 2 - 1;
  let k = 0, avant = 0;
  for (let i = 0; i < x.length; i++) { const v = tampon[k]; const moyenne = 0.5 * (v + avant) * 0.994; avant = v; tampon[k] = moyenne; x[i] = v; k = (k + 1) % retard; }
  return passeBas(x, 3200, 1);
}
function cloche(frequence, duree) {
  const x = new Float32Array(n(duree));
  const partiels = [[1, 1, 1], [2.0, 0.5, 0.7], [2.76, 0.32, 0.5], [5.4, 0.16, 0.3], [8.93, 0.08, 0.18]];
  for (let i = 0; i < x.length; i++) { const t = i / F; let s = 0; for (const [r, a, d] of partiels) s += a * Math.sin(2 * Math.PI * frequence * r * t) * Math.exp(-t / (duree * 0.35 * d)); x[i] = s * Math.min(1, t * 600) * 0.5; }
  return x;
}
function souffle(duree, f0, f1, rng, Q = 1.4, forme = k => Math.pow(Math.sin(Math.PI * k), 2)) {   // le « whoosh »
  return galber(balayer(bruit(duree, rng), k => f0 * Math.pow(f1 / f0, k), Q), forme);
}
function montee(duree, rng) {
  const air = galber(balayer(bruit(duree, rng), k => 260 * Math.pow(26, k), 2.2), k => Math.pow(k, 1.5));
  const x = new Float32Array(n(duree)); let p = 0, p2 = 0;
  for (let i = 0; i < x.length; i++) { const k = i / x.length; const f = 110 * Math.pow(8, k); p += f / F; p2 += f * 1.5 / F; x[i] = (Math.sin(2 * Math.PI * p) + 0.5 * scie(p2)) * Math.pow(k, 1.8) * 0.5; }
  return somme(gain(air, 0.9), passeBas(x, 5000, 1));
}
function grondement(duree, rng, coupure = 85) {
  const x = bruit(duree, rng); let y = 0;
  for (let i = 0; i < x.length; i++) { y = y * 0.9985 + x[i] * 0.045; x[i] = y; }
  passeBas(x, coupure, 2);
  const lent = passeBas(bruit(duree, rng), 1.6, 1);
  return galber(x, (k, t) => 9 * (0.75 + 6 * Math.abs(lent[Math.min(lent.length - 1, Math.round(t * F))])));
}
function rugissement(duree, rng, bas, haut) {                // l'eau, le feu : un bruit borné qui respire
  const x = passeHaut(passeBas(bruit(duree, rng), haut, 2), bas);
  const lent = passeBas(bruit(duree, rng), 2.4, 1);
  return galber(x, (k, t) => 0.7 + 7 * Math.abs(lent[Math.min(lent.length - 1, Math.round(t * F))]));
}
function sirene(duree) {
  const x = new Float32Array(n(duree)); let p = 0;
  for (let i = 0; i < x.length; i++) { const t = i / F; p += (610 + 190 * Math.sin(2 * Math.PI * 0.42 * t - 1.2)) / F; x[i] = Math.sin(2 * Math.PI * p) + 0.3 * Math.sin(4 * Math.PI * p); }
  passeBas(x, 1300, 2);
  return galber(x, (k, t) => Math.min(1, t / 0.5) * Math.min(1, (duree - t) / 0.4));
}
function debris(duree, rng, densite = 26) {
  const x = new Float32Array(n(duree));
  for (let e = 0; e < duree * densite; e++) {
    const t0 = rng() * duree, d = 0.02 + rng() * 0.09, fc = 300 + rng() * 2600, g = (0.25 + rng() * 0.75) * (0.4 + 0.6 * t0 / duree);
    const grain = galber(balayer(bruit(d, rng), () => fc, 2.5), (k, t) => Math.exp(-t / (d * 0.3)));
    const o = Math.round(t0 * F);
    for (let i = 0; i < grain.length && o + i < x.length; i++) x[o + i] += grain[i] * g;
  }
  for (let e = 0; e < duree * 3.2; e++) {
    const t0 = rng() * duree, coup = sousBasse(0.5, 70 + rng() * 40, 34, 0.05, 0.14), o = Math.round(t0 * F);
    for (let i = 0; i < coup.length && o + i < x.length; i++) x[o + i] += coup[i] * (0.5 + rng() * 0.5);
  }
  return x;
}
function craquement(rng) {
  const sec = galber(passeHaut(bruit(0.25, rng), 900), (k, t) => Math.exp(-t / 0.035) * (0.6 + 0.4 * Math.sin(t * 900)));
  return somme(gain(sec, 0.8), gain(sousBasse(0.9, 120, 38, 0.06, 0.28), 0.9));
}
function coeur() {
  const coup = decalage => { const x = somme(sousBasse(0.42, 74, 40, 0.045, 0.11), gain(sousBasse(0.3, 210, 95, 0.03, 0.06), 0.55), gain(sousBasse(0.2, 420, 180, 0.02, 0.03), 0.22)); const y = new Float32Array(n(0.62)); const o = n(decalage); for (let i = 0; i < x.length && o + i < y.length; i++) y[o + i] = x[i]; return y; };
  return somme(coup(0), gain(coup(0.17), 0.68));
}
function arretDeBande(duree, rng) {                          // la musique qui cale : l'accord dévisse jusqu'à l'arrêt
  const x = new Float32Array(n(duree)); const voix = [NOTE.D3, NOTE.F3, NOTE.A3, NOTE.D4].map(f => ({ f, p: rng() }));
  for (let i = 0; i < x.length; i++) { const k = i / x.length; const v = Math.pow(1 - k, 1.7); let s = 0; for (const w of voix) { w.p += w.f * v / F; s += scie(w.p); } x[i] = s / 4 * Math.pow(1 - k, 0.5); }
  passeBas(x, 2600, 2);
  const griffe = galber(balayer(bruit(0.16, rng), k => 3800 * Math.pow(0.12, k), 3.5), k => Math.sin(Math.PI * k));
  return somme(x, gain(griffe, 0.9));
}
function frappe(rng) {                                       // le pied dans le ballon
  const cuir = galber(balayer(bruit(0.07, rng), () => 420, 2.2), (k, t) => Math.exp(-t / 0.014));
  const claque = galber(passeHaut(bruit(0.03, rng), 2200), (k, t) => Math.exp(-t / 0.004));
  return somme(gain(sousBasse(0.5, 150, 52, 0.03, 0.10), 1.0), gain(cuir, 1.3), gain(claque, 0.55));
}
const grosseCaisse = () => sousBasse(0.32, 135, 46, 0.035, 0.13);
function claquement(rng) {
  const x = balayer(bruit(0.22, rng), () => 1500, 1.6);
  return galber(x, (k, t) => (Math.exp(-((t % 0.011) / 0.004)) * (t < 0.033 ? 1 : 0) + Math.exp(-(t - 0.033) / 0.06) * (t >= 0.033 ? 1 : 0)) * 0.9);
}
const charleston = rng => galber(passeHaut(bruit(0.06, rng), 7000), (k, t) => Math.exp(-t / 0.014));
function accord(frequences, duree, rng) {                    // un accord plaqué, brillant
  const x = new Float32Array(n(duree)); const voix = frequences.flatMap(f => [0.996, 1.004].map(r => ({ f: f * r, p: rng() })));
  for (let i = 0; i < x.length; i++) { let s = 0; for (const v of voix) { v.p += v.f / F; s += scie(v.p); } x[i] = s / voix.length; }
  balayer(x, (k, t) => 500 + 5200 * Math.exp(-t / 0.10), 1.0, 'bas');
  return galber(x, (k, t) => Math.min(1, t / 0.004) * Math.exp(-t / (duree * 0.4)));
}
function basse(frequence, duree, rng) {
  const x = new Float32Array(n(duree)); let p = rng();
  for (let i = 0; i < x.length; i++) { p += frequence / F; x[i] = scie(p) * 0.6 + Math.sin(2 * Math.PI * p) * 0.6; }
  balayer(x, (k, t) => 160 + 900 * Math.exp(-t / 0.08), 1.2, 'bas');
  return galber(x, (k, t) => Math.min(1, t / 0.005) * Math.min(1, (duree - t) / 0.03));
}

function echantillon(fichier, filtre) {
  const args = ['-v', 'error', '-i', fichier]; if (filtre) args.push('-af', filtre);
  args.push('-ar', String(F), '-ac', '1', '-f', 'f32le', 'pipe:1');
  const r = spawnSync('ffmpeg', args, { maxBuffer: 256 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) throw new Error(String(r.stderr));
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
}

/** Réverbération de Schroeder (quatre peignes, deux passe-tout) : la taille de l'espace et des impacts. */
function reverberer(x, decalage = 0) {
  const peignes = [1687, 1601, 2053, 2251].map(d => ({ t: new Float32Array(d + decalage), k: 0, f: 0.86, m: 0 }));
  const tous = [347, 113].map(d => ({ t: new Float32Array(d + decalage), k: 0 }));
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let s = 0;
    for (const p of peignes) { const v = p.t[p.k]; p.m = v * 0.72 + p.m * 0.28; p.t[p.k] = x[i] + p.m * p.f; p.k = (p.k + 1) % p.t.length; s += v; }
    s *= 0.25;
    for (const a of tous) { const v = a.t[a.k]; const e = s + v * 0.5; a.t[a.k] = e; a.k = (a.k + 1) % a.t.length; s = v - e * 0.5; }
    y[i] = s;
  }
  return y;
}


/** Ouvre le mixage d'une pub : sa chronologie, son montage, et la fonction qui pose un son à un instant. */
function ouvrirMixage(projet, langue) {
  const C = JSON.parse(fs.readFileSync(path.join(projet, `chronologie-${langue}.json`), 'utf8'));
  const M = JSON.parse(fs.readFileSync(path.join(projet, 'montage.json'), 'utf8'));
  const total = n(C.duree + 0.05);
  const G = new Float32Array(total), D = new Float32Array(total), envoi = new Float32Array(total);
  const rng = hasard(20261012);
  /** Pose un son : instant, niveau, panoramique (−1 à 1), part envoyée à la réverbération. */
  const poser = (x, t, niveau = 1, pan = 0, reverb = 0, fonduFin = 0.02) => {
    const o = Math.round(t * F), g = niveau * Math.cos((pan + 1) * Math.PI / 4), d = niveau * Math.sin((pan + 1) * Math.PI / 4), queue = Math.round(fonduFin * F);
    for (let i = 0; i < x.length; i++) {
      const j = o + i; if (j < 0) continue; if (j >= total) break;
      const f = Math.min(1, (x.length - i) / queue, (total - j) / (0.03 * F));
      G[j] += x[i] * g * 1.414 * f; D[j] += x[i] * d * 1.414 * f; envoi[j] += x[i] * niveau * reverb * f;
    }
  };
  return { projet, langue, C, M, total, G, D, envoi, rng, poser, P: Object.fromEntries(C.plans.map(p => [p.nom, p])) };
}

/** Ferme le mixage : réverbération, voix, retrait du fond sous la voix, fichiers, contrôle des niveaux. */
function fermerMixage({ projet, langue, C, total, G, D, envoi }, resume = '') {
  // ── La réverbération, puis la voix ──
  const rG = reverberer(envoi, 0), rD = reverberer(envoi, 23);
  for (let i = 0; i < total; i++) { G[i] += rG[i] * 0.34; D[i] += rD[i] * 0.34; }
  const voix = new Float32Array(total);
  const fichier = path.join(projet, 'voix', `destiny_rugby_voice_${langue}.wav`);
  for (const v of C.voix) {
    const x = echantillon(fichier, `atrim=${v.source[0].toFixed(3)}:${v.source[1].toFixed(3)},asetpts=PTS-STARTPTS,highpass=f=70,acompressor=threshold=-21dB:ratio=3:attack=4:release=150:makeup=3`);
    const o = Math.round(v.a * F), bord = Math.round(0.012 * F);
    for (let i = 0; i < x.length && o + i < total; i++) if (o + i >= 0) voix[o + i] += x[i] * Math.min(1, i / bord, (x.length - i) / bord);
  }
  const creteVoix = voix.reduce((m, s) => Math.max(m, Math.abs(s)), 0) || 1;
  for (let i = 0; i < total; i++) voix[i] *= 0.92 / creteVoix;
  // La musique s'efface sous la voix (suiveur d'enveloppe : monte en 15 ms, redescend en 280 ms).
  let enveloppe = 0;
  const monte = 1 - Math.exp(-1 / (0.015 * F)), descend = 1 - Math.exp(-1 / (0.28 * F));
  const sans = [new Float32Array(total), new Float32Array(total)], avec = [new Float32Array(total), new Float32Array(total)];
  let crete = 0;
  const NIVEAU_FOND = 0.34;                                  // le fond (musique, effets) par rapport à la voix
  const sous = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const a = Math.abs(voix[i]); enveloppe += (a > enveloppe ? monte : descend) * (a - enveloppe);
    const retrait = 1 - 0.76 * Math.min(1, enveloppe / 0.10);
    const g = G[i] * NIVEAU_FOND, d = D[i] * NIVEAU_FOND;
    sans[0][i] = Math.tanh(g); sans[1][i] = Math.tanh(d);
    sous[i] = Math.hypot(Math.tanh(g * retrait), Math.tanh(d * retrait)) / 1.414;
    avec[0][i] = Math.tanh(Math.tanh(g * retrait) + voix[i] * 1.0); avec[1][i] = Math.tanh(Math.tanh(d * retrait) + voix[i] * 1.0);
    crete = Math.max(crete, Math.abs(avec[0][i]), Math.abs(avec[1][i]));
  }
  const ecrire = (nom, [g, d], niveau) => {
    const t = Buffer.alloc(44 + total * 4);
    t.write('RIFF', 0); t.writeUInt32LE(t.length - 8, 4); t.write('WAVEfmt ', 8); t.writeUInt32LE(16, 16); t.writeUInt16LE(1, 20); t.writeUInt16LE(2, 22);
    t.writeUInt32LE(F, 24); t.writeUInt32LE(F * 4, 28); t.writeUInt16LE(4, 32); t.writeUInt16LE(16, 34); t.write('data', 36); t.writeUInt32LE(total * 4, 40);
    for (let i = 0; i < total; i++) { t.writeInt16LE(Math.round(Math.max(-1, Math.min(1, g[i] * niveau)) * 32767), 44 + i * 4); t.writeInt16LE(Math.round(Math.max(-1, Math.min(1, d[i] * niveau)) * 32767), 46 + i * 4); }
    fs.writeFileSync(path.join(projet, 'son', nom), t);
  };
  fs.mkdirSync(path.join(projet, 'son'), { recursive: true });
  ecrire(`mixage-${langue}.wav`, avec, 0.94 / crete);
  const creteFond = sans[0].reduce((m, s, i) => Math.max(m, Math.abs(s), Math.abs(sans[1][i])), 0) || 1;
  ecrire(`musique-effets-${langue}.wav`, sans, Math.min(0.94 / crete, 0.94 / creteFond));
  console.log(`${langue} : ${C.duree.toFixed(2)} s${resume ? ', ' + resume : ''}, crête ${crete.toFixed(2)}`);
  // Contrôle (on ne peut pas tout juger à l'oreille) : niveau du fond et de la voix par scène, et crête du fond avant écrêtage.
  const dB = x => (20 * Math.log10(Math.max(1e-6, x))).toFixed(1);
  for (const s of C.scenes) {
    let fond = 0, parole = 0, parle = 0, pic = 0;
    for (let i = Math.round(s.debut * F); i < Math.min(total, Math.round(s.fin * F)); i++) {
      pic = Math.max(pic, Math.abs(G[i]), Math.abs(D[i]));
      if (Math.abs(voix[i]) > 0.02) { parle++; parole += voix[i] * voix[i]; fond += sous[i] * sous[i]; }
    }
    console.log(`  scène ${s.scene} : fond sous la voix ${dB(Math.sqrt(fond / Math.max(1, parle)))} dB, voix ${dB(Math.sqrt(parole / Math.max(1, parle)))} dB, crête du fond ${(pic * NIVEAU_FOND).toFixed(2)}`);
  }
}

module.exports = { racine, F, hasard, n, bruit, passeBas, passeHaut, balayer, galber, somme, gain, scie, NOTE, sousBasse, impact, cuivres, nappe, corde, pince, cloche, souffle, montee, grondement, rugissement, sirene, debris, craquement, coeur, arretDeBande, frappe, grosseCaisse, claquement, charleston, accord, basse, echantillon, reverberer, ouvrirMixage, fermerMixage };
