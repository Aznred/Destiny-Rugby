/** Sound design original : rouleaux mécaniques, pièces et carillon de jackpot. */
export function creerSonsPacks() {
  let contexte: AudioContext | undefined;
  let sortie: GainNode | undefined;
  let entree: GainNode | undefined;
  let muet = false;
  const sources = new Set<AudioScheduledSourceNode>();

  function activer() {
    try {
      if (!contexte) {
        contexte = new AudioContext();
        entree = contexte.createGain();
        sortie = contexte.createGain();
        sortie.gain.value = muet ? 0 : .65;
        const limiteur = contexte.createDynamicsCompressor();
        limiteur.threshold.value = -18; limiteur.knee.value = 12;
        limiteur.ratio.value = 4; limiteur.attack.value = .003; limiteur.release.value = .15;
        entree.connect(limiteur); limiteur.connect(sortie); sortie.connect(contexte.destination);
        // Petit écho stéréo de salle, discret sous les tintements.
        const echo = contexte.createDelay(.3), retour = contexte.createGain(), panoramique = contexte.createStereoPanner();
        echo.delayTime.value = .095; retour.gain.value = .12; panoramique.pan.value = .35;
        entree.connect(echo); echo.connect(retour); retour.connect(panoramique); panoramique.connect(limiteur);
      }
      void contexte.resume().catch(() => {});
    } catch { /* Le pack reste utilisable sans audio. */ }
  }

  function suivre(source: AudioScheduledSourceNode, noeuds: AudioNode[]) {
    sources.add(source);
    source.onended = () => { sources.delete(source); source.disconnect(); noeuds.forEach(n => n.disconnect()); };
  }
  function note(frequence: number, debut: number, duree: number, volume: number, type: OscillatorType = 'sine', pan = 0, fin = frequence) {
    if (!contexte || !entree || muet) return;
    const osc = contexte.createOscillator(), gain = contexte.createGain(), stereo = contexte.createStereoPanner();
    const t = contexte.currentTime + debut;
    osc.type = type; osc.frequency.setValueAtTime(frequence, t);
    osc.frequency.exponentialRampToValueAtTime(fin, t + duree);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(volume, t + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duree);
    stereo.pan.value = pan;
    osc.connect(gain); gain.connect(stereo); stereo.connect(entree);
    suivre(osc, [gain, stereo]); osc.start(t); osc.stop(t + duree + .01);
  }
  function cliquet(debut: number, intensite = 1, pan = 0) {
    if (!contexte || !entree || muet) return;
    const buffer = contexte.createBuffer(1, Math.ceil(contexte.sampleRate * .035), contexte.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 4;
    const source = contexte.createBufferSource(), filtre = contexte.createBiquadFilter(), gain = contexte.createGain(), stereo = contexte.createStereoPanner();
    source.buffer = buffer; filtre.type = 'highpass'; filtre.frequency.value = 1800;
    gain.gain.value = .15 * intensite; stereo.pan.value = pan;
    source.connect(filtre); filtre.connect(gain); gain.connect(stereo); stereo.connect(entree);
    suivre(source, [filtre, gain, stereo]); source.start(contexte.currentTime + debut);
  }
  function cloche(frequence: number, debut: number, volume = .075, pan = 0) {
    note(frequence, debut, .6, volume, 'sine', pan);
    note(frequence * 2.76, debut, .22, volume * .22, 'sine', pan);
    note(frequence * 4.07, debut, .09, volume * .08, 'sine', pan);
  }
  function arreter() {
    for (const source of sources) { try { source.stop(); } catch { /* Déjà terminé. */ } }
    sources.clear();
  }
  return {
    activer, arreter,
    couper(valeur: boolean) {
      muet = valeur;
      if (sortie && contexte) sortie.gain.setTargetAtTime(valeur ? 0 : .65, contexte.currentTime, .015);
      if (valeur) arreter(); else activer();
    },
    palier(rang: number) {
      // Rouleau qui accélère, arrêt mécanique au changement de couleur (440 ms).
      [.0, .09, .165, .225, .275, .315, .35, .38].forEach((t, i) => {
        cliquet(t, .5 + i * .055, Math.sin(i * 1.8) * .4);
        note(300 + i * 65, t, .045, .018, 'triangle');
      });
      note(180, .02, .39, .035, 'triangle', 0, 680);
      cliquet(.44, 1.4); note(110, .44, .18, .12, 'sine', 0, 65);
      const ton = 523.25 * 2 ** ([0, 2, 4, 7, 12][rang] / 12);
      [1, 1.25, 1.5, 2].forEach((ratio, i) => cloche(ton * ratio, .44 + i * .08, .068, (i - 1.5) * .2));
      cloche(ton * 3, .83, .025, .45);
    },
    ouvrir(rang: number) {
      note(90, 0, .45, .13, 'sine', 0, 42);
      [0, .055, .11].forEach((t, i) => cliquet(t, 1.1, (i - 1) * .4));
      // Fanfare majeure, puis pluie légère de pièces pour les meilleures raretés.
      [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => cloche(523.25 * 2 ** (n / 12), .12 + i * .105, .08, Math.sin(i) * .35));
      [261.63, 329.63, 392].forEach(f => note(f, .45, .9, .026, 'triangle'));
      for (let i = 0; i < 4 + rang * 2; i++) {
        const t = .65 + i * .06;
        cliquet(t, .35, Math.sin(i * 2) * .6);
        cloche(1046.5 * [1, 1.25, 1.5, 2][i % 4], t, .018, Math.sin(i * 2) * .6);
      }
    },
    carte(rang: number) {
      cliquet(0, .45);
      cloche(659.25 * 2 ** (rang / 12), .025, .055, -.15);
      cloche(987.77 * 2 ** (rang / 12), .09, .045, .15);
    },
    detruire() { arreter(); void contexte?.close().catch(() => {}); contexte = undefined; sortie = undefined; entree = undefined; },
  };
}
