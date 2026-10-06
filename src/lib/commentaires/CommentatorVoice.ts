import type { EtatVoix, RequeteVoix, ReponseVoix } from './voiceProtocol';

type AudioGenere = { audio: Float32Array; frequence: number };
type Attente = { resolve: (audio: AudioGenere | null) => void; reject: (erreur: Error) => void; minuterie: ReturnType<typeof setTimeout>; type: 'initialize' | 'synthesize' };

/** TEXTE → VOIX seulement. La file du match appartient toujours à voix.ts.
 * speak() se termine à la FIN de la lecture ; les appels doivent être séquentiels.
 * stop() annule le son et les résultats en retard, sans décharger le modèle.
 */
export class CommentatorVoice {
  private worker: Worker | null = null;
  private contexte: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private terminerLecture: (() => void) | null = null;
  private chargement: Promise<void> | null = null;
  private attentes = new Map<number, Attente>();
  private observateurs = new Set<(etat: EtatVoix) => void>();
  private etat: EtatVoix = { statut: 'repos' };
  private numero = 0;
  private generation = 0;
  private occupe = false;
  private detruit = false;

  static isSupported() { return typeof Worker !== 'undefined' && typeof AudioContext !== 'undefined' && globalThis.isSecureContext; }
  isReady() { return this.etat.statut === 'pret'; }
  getState() { return this.etat; }
  subscribe(observateur: (etat: EtatVoix) => void) {
    this.observateurs.add(observateur); observateur(this.etat);
    return () => { this.observateurs.delete(observateur); };
  }
  private publier(etat: EtatVoix) { this.etat = etat; for (const observateur of this.observateurs) observateur(etat); }

  /** Appeler sur un geste utilisateur pour autoriser l'audio, même avant le téléchargement. */
  async initialize() {
    if (this.detruit) throw new Error('Le lecteur vocal est fermé.');
    if (!CommentatorVoice.isSupported()) throw new Error('La voix locale nécessite un navigateur compatible et une connexion HTTPS.');
    this.contexte ??= new AudioContext();
    await Promise.all([this.contexte.resume(), this.preload()]);
  }

  /** Attend le modèle du service local une seule fois, sans jouer de son. */
  preload(): Promise<void> {
    if (this.detruit) return Promise.reject(new Error('Le lecteur vocal est fermé.'));
    if (this.chargement) return this.chargement;
    this.publier({ statut: 'chargement', progression: 0 });
    try {
      this.worker = new Worker(new URL('./commentator.worker.ts', import.meta.url), { type: 'module', name: 'destiny-commentateur' });
      this.worker.onmessage = ({ data }: MessageEvent<ReponseVoix>) => {
        if (data.type === 'etat') { this.publier(data.etat); return; }
        const attente = this.attentes.get(data.id);
        if (!attente) return;
        clearTimeout(attente.minuterie); this.attentes.delete(data.id);
        if (data.type === 'error') attente.reject(new Error(data.erreur));
        else attente.resolve(data.type === 'audio' ? data : null);
      };
      this.worker.onerror = () => this.echouer(new Error('Le moteur vocal local a été interrompu.'));
      this.worker.onmessageerror = () => this.echouer(new Error('Réponse audio illisible.'));
      // Un Worker recréé après une erreur doit connaître les annulations précédentes.
      this.worker.postMessage({ type: 'stop', generation: this.generation } satisfies RequeteVoix);
      this.chargement = this.demander({ type: 'initialize', id: ++this.numero }).then(() => undefined);
    } catch (erreur) { this.chargement = Promise.reject(erreur); }
    this.chargement = this.chargement.catch((erreur: Error) => { this.echouer(erreur); throw erreur; });
    return this.chargement;
  }

  private demander(requete: Exclude<RequeteVoix, { type: 'stop' }>): Promise<AudioGenere | null> {
    return new Promise((resolve, reject) => {
      const minuterie = setTimeout(() => this.echouer(new Error('Le moteur vocal local ne répond plus.')), requete.type === 'initialize' ? 600_000 : 185_000);
      this.attentes.set(requete.id, { resolve, reject, minuterie, type: requete.type });
      try { this.worker!.postMessage(requete); }
      catch (erreur) { clearTimeout(minuterie); this.attentes.delete(requete.id); reject(erreur); }
    });
  }
  private echouer(erreur: Error) {
    for (const attente of this.attentes.values()) { clearTimeout(attente.minuterie); attente.reject(erreur); }
    this.attentes.clear();
    this.stop(); this.worker?.terminate(); this.worker = null; this.chargement = null;
    this.publier({ statut: 'erreur', erreur: erreur.message });
  }

  async speak(texte: string, options: { debit?: number; hauteur?: number; surDebut?: () => void } = {}) {
    if (!texte.trim()) return;
    if (this.detruit) throw new Error('Le lecteur vocal est fermé.');
    if (this.occupe) throw new Error('Une phrase est déjà en cours : utiliser la file du lecteur de match.');
    this.occupe = true;
    const generation = this.generation;
    try {
      await this.initialize();
      if (generation !== this.generation || this.detruit) return;
      const donnees = await this.demander({ type: 'synthesize', id: ++this.numero, texte, debit: options.debit ?? 1.08, generation });
      if (!donnees || generation !== this.generation || this.detruit) return;
      const contexte = this.contexte!;
      if (contexte.state !== 'running') throw new Error('Réactive les commentateurs pour autoriser la lecture audio.');
      const tampon = contexte.createBuffer(1, donnees.audio.length, donnees.frequence);
      tampon.getChannelData(0).set(donnees.audio);
      const source = contexte.createBufferSource();
      source.buffer = tampon; source.playbackRate.value = options.hauteur ?? 1;
      source.connect(contexte.destination); this.source = source;
      await new Promise<void>((resolve) => {
        const fin = () => {
          source.disconnect();
          if (this.source === source) { this.source = null; this.terminerLecture = null; }
          resolve();
        };
        this.terminerLecture = fin; source.onended = fin;
        source.start(); options.surDebut?.();
      });
    } finally { if (generation === this.generation) this.occupe = false; }
  }

  stop() {
    this.generation++; this.occupe = false;
    if (this.source) { this.source.onended = null; this.source.stop(); this.terminerLecture?.(); }
    for (const [id, attente] of this.attentes) {
      if (attente.type !== 'synthesize') continue;
      clearTimeout(attente.minuterie); attente.resolve(null); this.attentes.delete(id);
    }
    this.worker?.postMessage({ type: 'stop', generation: this.generation } satisfies RequeteVoix);
  }
  /** À la sortie du match : libère le lecteur ; le service F5 reste chargé. */
  dispose() {
    this.stop(); this.detruit = true; this.worker?.terminate(); this.worker = null;
    for (const attente of this.attentes.values()) { clearTimeout(attente.minuterie); attente.reject(new Error('Le lecteur vocal est fermé.')); }
    this.attentes.clear(); this.chargement = null; this.observateurs.clear();
    void this.contexte?.close().catch(() => undefined); this.contexte = null; this.etat = { statut: 'repos' };
  }
}
