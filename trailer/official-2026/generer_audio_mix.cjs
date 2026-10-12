const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const FREQ = 48000;
const DURATION = 42.0; // 42 seconds
const TOTAL_SAMPLES = Math.round(FREQ * DURATION);

function pcm(filePath, filter = '') {
  if (!fs.existsSync(filePath)) {
    console.warn('Fichier audio manquant:', filePath);
    return new Float32Array(0);
  }
  const args = ['-v', 'error', '-i', filePath];
  if (filter) args.push('-af', filter);
  args.push('-ar', String(FREQ), '-ac', '1', '-f', 'f32le', 'pipe:1');
  const res = spawnSync(ffmpeg, args, { maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (res.status !== 0) throw new Error(res.stderr.toString());
  return new Float32Array(res.stdout.buffer, res.stdout.byteOffset, res.stdout.length / 4);
}

function trimSilence(audio) {
  let start = 0, end = audio.length - 1;
  while (start < end && Math.abs(audio[start]) < 0.005) start++;
  while (end > start && Math.abs(audio[end]) < 0.005) end--;
  start = Math.max(0, start - 480);
  end = Math.min(audio.length, end + 2400);
  return audio.slice(start, end);
}

function genererMix(isEn = false) {
  console.log(`Mixage audio ${isEn ? 'EN' : 'FR'} en cours (${DURATION}s)...`);
  const left = new Float32Array(TOTAL_SAMPLES);
  const right = new Float32Array(TOTAL_SAMPLES);
  const voiceTrack = new Float32Array(TOTAL_SAMPLES);

  let randSeed = 948271;
  const whiteNoise = () => {
    randSeed = (Math.imul(randSeed, 1664525) + 1013904223) >>> 0;
    return (randSeed / 4294967296) * 2 - 1;
  };

  const addSound = (startSec, durSec, genFn, gain = 1.0, pan = 0.0) => {
    const startIdx = Math.round(startSec * FREQ);
    const count = Math.round(durSec * FREQ);
    for (let j = 0; j < count && startIdx + j < TOTAL_SAMPLES; j++) {
      const s = genFn(j / FREQ, j) * gain;
      left[startIdx + j] += s * (1.0 - pan * 0.4);
      right[startIdx + j] += s * (1.0 + pan * 0.4);
    }
  };

  const addClip = (startSec, audioData, gain = 1.0, pan = 0.0) => {
    const startIdx = Math.round(startSec * FREQ);
    for (let j = 0; j < audioData.length && startIdx + j < TOTAL_SAMPLES; j++) {
      const s = audioData[j] * gain;
      left[startIdx + j] += s * (1.0 - pan * 0.4);
      right[startIdx + j] += s * (1.0 + pan * 0.4);
    }
  };

  // 1. Hook Sound Design (0.0s - 3.0s)
  // Shot 0: FIFA (0.0s)
  addSound(0.0, 0.9, (t) => Math.sin(2 * Math.PI * (50 + t * 40) * t) * Math.exp(-t * 3.5), 0.5);
  // Shot 1: FM (1.0s)
  addSound(1.0, 0.8, (t) => (Math.sin(2 * Math.PI * 180 * t) * 0.6 + whiteNoise() * 0.4) * Math.exp(-t * 12), 0.55);
  // Shot 2: BUT FOR RUGBY! (2.0s) -> Massive 808 Drop + Sub
  addSound(2.0, 1.8, (t) => Math.sin(2 * Math.PI * (55 * Math.exp(-t * 0.8)) * t) * Math.exp(-t * 1.5), 0.9);

  // Load sound effects from public/rn26/sons/
  const sfxDir = path.resolve(__dirname, '../../public/rn26/sons');
  const plaquage = pcm(path.join(sfxDir, 'gros_plaquage.ogg'));
  const siffletEssai = pcm(path.join(sfxDir, 'sifflet_essai.ogg'));
  const siffletEngage = pcm(path.join(sfxDir, 'sifflet_engagement.ogg'));
  const packSfx = pcm(path.join(sfxDir, 'pack1.ogg'));
  const confettis = pcm(path.join(sfxDir, 'confettis.ogg'));
  const foule = pcm(path.join(sfxDir, 'foule_forte.ogg'));
  const acclamation = pcm(path.join(sfxDir, 'acclamation_courte.ogg'));
  const victoire = pcm(path.join(sfxDir, 'victoire.ogg'));

  // Trigger SFX
  addClip(2.05, plaquage, 0.75);
  addClip(2.2, siffletEssai, 0.6);
  addClip(3.0, foule, 0.35);
  addClip(11.2, packSfx, 0.8);
  addClip(14.8, confettis, 0.7); // On Star reveal!
  addClip(15.0, foule, 0.4);
  addClip(29.0, siffletEngage, 0.65);
  addClip(33.5, siffletEssai, 0.7);
  addClip(33.8, acclamation, 0.6);
  addClip(36.0, victoire, 0.6);

  // 2. High-Energy Sports Trap Beat (3.0s to 42.0s)
  // Tempo: 148 BPM -> 0.4054 seconds per beat
  const beatSec = 60 / 148;
  const startBeat = Math.round(3.0 / beatSec);
  const endBeat = Math.round(41.0 / beatSec);

  // Bass scale: D (37Hz / 74Hz), F (44Hz / 87Hz), G (49Hz / 98Hz), A (55Hz / 110Hz)
  const bassNotes = [37, 37, 44, 49, 37, 37, 55, 49];

  for (let b = startBeat; b <= endBeat; b++) {
    const t = b * beatSec;
    // Silence at 14.4 - 14.8 for tension before the Star Reveal!
    if (t >= 14.4 && t < 14.8) continue;

    // Kick on beat 1 and 3 of every 4-beat bar (or syncopated)
    const barBeat = b % 4;
    const isKick = barBeat === 0 || barBeat === 2 || (b % 8 === 7);
    if (isKick) {
      addSound(t, 0.28, (s) => Math.sin(2 * Math.PI * (52 * s + 28 * 0.03 * (1 - Math.exp(-s / 0.03)))) * Math.exp(-s * 15), 0.75);
    }

    // Snare / Clap on beat 2 and 4
    const isSnare = barBeat === 1 || barBeat === 3;
    if (isSnare) {
      addSound(t, 0.22, (s) => (whiteNoise() * 0.7 + Math.sin(2 * Math.PI * 220 * s) * 0.3) * Math.exp(-s * 25), 0.45);
    }

    // Hi-hats: 8th notes and 16th triplets
    for (const off of [0, beatSec * 0.5]) {
      addSound(t + off, 0.05, (s) => whiteNoise() * Math.exp(-s * 60), 0.18, (b % 3 - 1) * 0.4);
    }
    // Occasional fast trap roll
    if (b % 8 === 3 || b % 8 === 7) {
      for (let sub = 0; sub < 4; sub++) {
        addSound(t + beatSec * 0.5 + sub * (beatSec * 0.125), 0.035, (s) => whiteNoise() * Math.exp(-s * 80), 0.14);
      }
    }

    // 808 Sub Bass
    const noteFreq = bassNotes[Math.floor(b / 2) % bassNotes.length];
    addSound(t, beatSec * 1.8, (s) => (Math.sin(2 * Math.PI * noteFreq * s) + 0.3 * Math.sin(4 * Math.PI * noteFreq * s)) * Math.min(1, s * 80) * Math.exp(-s * 4), 0.55);

    // Synth Brass / Lead stab
    const leadFreq = noteFreq * 8; // Octaves up
    addSound(t, 0.25, (s) => (Math.sin(2 * Math.PI * leadFreq * s) + 0.25 * Math.sin(6 * Math.PI * leadFreq * s)) * Math.exp(-s * 10), 0.15, (b % 2 ? -0.5 : 0.5));
  }

  // 3. Voiceovers Loading & Mixing
  const voiceDir = path.resolve(__dirname, isEn ? 'voix-en' : 'voix-fr');
  const voiceTimings = [
    { idx: 0, start: 0.05, maxDur: 0.9 },
    { idx: 1, start: 1.05, maxDur: 0.9 },
    { idx: 2, start: 2.05, maxDur: 0.95 },
    { idx: 3, start: 3.15, maxDur: 2.7 },
    { idx: 4, start: 6.10, maxDur: 4.8 },
    { idx: 5, start: 11.20, maxDur: 5.6 },
    { idx: 6, start: 17.20, maxDur: 7.2 },
    { idx: 7, start: 24.80, maxDur: 3.9 },
    { idx: 8, start: 29.10, maxDur: 5.6 },
    { idx: 9, start: 34.80, maxDur: 3.2 },
    { idx: 10, start: 38.05, maxDur: 2.4 },
    { idx: 11, start: 40.50, maxDur: 1.4 }
  ];

  for (const item of voiceTimings) {
    const file = path.join(voiceDir, `${isEn ? 'en' : 'fr'}_${String(item.idx).padStart(2, '0')}.wav`);
    if (!fs.existsSync(file)) continue;

    let vAudio = trimSilence(pcm(file));
    const origDur = vAudio.length / FREQ;
    const speedRatio = Math.max(1.0, origDur / item.maxDur);

    if (speedRatio > 1.03) {
      vAudio = trimSilence(pcm(file, `atempo=${speedRatio.toFixed(4)}`));
    }

    const peak = vAudio.reduce((m, val) => Math.max(m, Math.abs(val)), 0);
    const gain = 0.85 / Math.max(0.1, peak);

    const startIdx = Math.round(item.start * FREQ);
    for (let j = 0; j < vAudio.length && startIdx + j < TOTAL_SAMPLES; j++) {
      voiceTrack[startIdx + j] += vAudio[j] * gain;
    }
  }

  // 4. Combine Voice with Music (with automatic Audio Ducking)
  const wavBuf = Buffer.alloc(44 + TOTAL_SAMPLES * 4);
  wavBuf.write('RIFF', 0);
  wavBuf.writeUInt32LE(wavBuf.length - 8, 4);
  wavBuf.write('WAVEfmt ', 8);
  wavBuf.writeUInt32LE(16, 16);
  wavBuf.writeUInt16LE(1, 20); // PCM
  wavBuf.writeUInt16LE(2, 22); // Stereo
  wavBuf.writeUInt32LE(FREQ, 24);
  wavBuf.writeUInt32LE(FREQ * 4, 28);
  wavBuf.writeUInt16LE(4, 32);
  wavBuf.writeUInt16LE(16, 34); // 16-bit
  wavBuf.write('data', 36);
  wavBuf.writeUInt32LE(TOTAL_SAMPLES * 4, 40);

  for (let j = 0; j < TOTAL_SAMPLES; j++) {
    const t = j / FREQ;
    const fadeOut = Math.min(1.0, (DURATION - t) / 0.5); // 0.5s fade at end
    const v = voiceTrack[j];
    // Duck music when voice is active: duck factor 0.52 vs 0.78
    const isSpeaking = Math.abs(v) > 0.05;
    const musicFactor = isSpeaking ? 0.52 : 0.78;

    const outL = (left[j] * musicFactor + v) * fadeOut;
    const outR = (right[j] * musicFactor + v) * fadeOut;

    // Soft limiter tanh
    const sampleL = Math.round(Math.tanh(outL) * 32700);
    const sampleR = Math.round(Math.tanh(outR) * 32700);

    wavBuf.writeInt16LE(sampleL, 44 + j * 4);
    wavBuf.writeInt16LE(sampleR, 44 + j * 4 + 2);
  }

  const outFile = path.join(__dirname, isEn ? 'mixage-en.wav' : 'mixage-fr.wav');
  fs.writeFileSync(outFile, wavBuf);
  console.log(`Mixage terminé et enregistré: ${outFile}`);
}

genererMix(false);
genererMix(true);
