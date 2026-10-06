import assert from 'node:assert/strict';
import { CommentatorVoice } from '../src/lib/commentaires/CommentatorVoice';
import { creerLecteurVoix } from '../src/lib/commentaires/voix';
import type { Replique } from '../src/lib/commentaires/retransmission';
import type { RequeteVoix, ReponseVoix } from '../src/lib/commentaires/voiceProtocol';

// Transport et sortie audio contrôlés : vérifie les courses réelles de pause,
// d'interruption et de démontage sans télécharger un modèle à chaque test.
class FauxWorker {
  static instances: FauxWorker[] = [];
  onmessage: ((event: { data: ReponseVoix }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  requetes: RequeteVoix[] = [];
  ferme = false;
  generation = 0;
  constructor() { FauxWorker.instances.push(this); }
  postMessage(message: RequeteVoix) { this.requetes.push(message); if (message.type === 'stop') this.generation = message.generation; }
  terminate() { this.ferme = true; }
  repondre(data: ReponseVoix) { this.onmessage?.({ data }); }
  pret() {
    const requete = this.requetes.find((r) => r.type === 'initialize')!;
    this.repondre({ type: 'etat', etat: { statut: 'pret', moteur: 'cpu' } });
    if ('id' in requete) this.repondre({ type: 'ready', id: requete.id });
  }
  audio(id: number) {
    const requete = this.requetes.find((r) => 'id' in r && r.id === id);
    if (requete?.type === 'synthesize' && requete.generation !== this.generation) this.repondre({ type: 'annule', id });
    else this.repondre({ type: 'audio', id, audio: new Float32Array([.1, -.1, .1]), frequence: 24000 });
  }
}
class FausseSource {
  static instances: FausseSource[] = [];
  onended: (() => void) | null = null;
  playbackRate = { value: 1 }; buffer: unknown;
  commence = false; arretee = false;
  constructor() { FausseSource.instances.push(this); }
  connect() {} disconnect() {}
  start() { this.commence = true; }
  stop() { this.arretee = true; }
  finir() { this.onended?.(); }
}
class FauxContexte {
  state = 'running'; destination = {};
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createBuffer(_canaux: number, taille: number) { return { getChannelData: () => new Float32Array(taille) }; }
  createBufferSource() { return new FausseSource(); }
}
Object.defineProperties(globalThis, {
  Worker: { value: FauxWorker, configurable: true },
  AudioContext: { value: FauxContexte, configurable: true },
  isSecureContext: { value: true, configurable: true },
});
const tourner = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const derniereSynthese = (worker: FauxWorker) => worker.requetes.filter((r) => r.type === 'synthesize').at(-1)! as Extract<RequeteVoix, { type: 'synthesize' }>;
let controles = 0;

const moteur = new CommentatorVoice();
const chargement1 = moteur.preload(); const chargement2 = moteur.preload();
assert.equal(chargement1, chargement2);
const worker = FauxWorker.instances.at(-1)!;
assert.equal(worker.requetes.filter((r) => r.type === 'initialize').length, 1);
worker.pret(); await chargement1;
assert.equal(moteur.isReady(), true); controles++;

let commence = 0;
const ancien = moteur.speak('Phrase annulée pendant sa génération.', { surDebut: () => commence++ });
await tourner(); const requeteAncienne = derniereSynthese(worker);
moteur.stop(); await ancien;
worker.audio(requeteAncienne.id); await tourner();
assert.equal(commence, 0); assert.equal(FausseSource.instances.length, 0); controles++;

const nouveau = moteur.speak('Phrase suivante.', { surDebut: () => commence++ });
await tourner(); worker.audio(derniereSynthese(worker).id); await tourner();
assert.equal(commence, 1);
moteur.stop(); await nouveau;
assert.equal(FausseSource.instances.at(-1)!.arretee, true);
assert.equal(moteur.isReady(), true);
assert.equal(worker.requetes.filter((r) => r.type === 'initialize').length, 1); controles++;

const parole: string[] = [];
const lecteur = creerLecteurVoix('fr', (r) => { if (r) parole.push(r.texte); }, { moteur });
await tourner();
const r = (texte: string, priorite = 4): Replique => ({ texte, priorite, t: performance.now() / 1000, voix: 'commentateur', categorie: 'accueil' });
lecteur.dire(r('Un'), performance.now() / 1000);
lecteur.dire(r('Deux'), performance.now() / 1000);
lecteur.dire(r('Trois'), performance.now() / 1000);
await tourner();
assert.equal(derniereSynthese(worker).texte, 'Un');
for (const texte of ['Un', 'Deux', 'Trois']) {
  assert.equal(derniereSynthese(worker).texte, texte);
  worker.audio(derniereSynthese(worker).id); await tourner();
  FausseSource.instances.at(-1)!.finir(); await tourner();
}
assert.deepEqual(parole, ['Un', 'Deux', 'Trois']); controles++;

lecteur.dire(r('Anecdote', 2), performance.now() / 1000); await tourner();
const anecdote = derniereSynthese(worker);
lecteur.dire(r('Essai', 5), performance.now() / 1000); await tourner();
assert.equal(derniereSynthese(worker).texte, 'Essai');
worker.audio(anecdote.id); await tourner();
assert.equal(parole.includes('Anecdote'), false);
worker.audio(derniereSynthese(worker).id); await tourner();
FausseSource.instances.at(-1)!.finir(); await tourner();
assert.equal(parole.at(-1), 'Essai'); controles++;

lecteur.dire(r('Pause'), performance.now() / 1000); await tourner();
const pause = derniereSynthese(worker);
lecteur.couper(); worker.audio(pause.id); await tourner();
assert.equal(parole.includes('Pause'), false); controles++;
lecteur.detruire();
assert.equal(worker.ferme, false); // le composant du match possède le modèle
const autre = creerLecteurVoix('fr', undefined, { moteur }); await tourner();
assert.equal(worker.requetes.filter((r) => r.type === 'initialize').length, 1);
autre.detruire(); moteur.dispose();
assert.equal(worker.ferme, true); assert.equal(moteur.isReady(), false); controles++;

// Une initialisation tardive ne ressuscite pas une réplique après fermeture.
const tardif = new CommentatorVoice(); let parleTard = false;
const lecteurTardif = creerLecteurVoix('fr', () => { parleTard = true; }, { moteur: tardif });
lecteurTardif.dire(r('Trop tard'), performance.now() / 1000);
lecteurTardif.detruire(); FauxWorker.instances.at(-1)!.pret(); await tourner();
assert.equal(parleTard, false); tardif.dispose(); controles++;

// Une panne du Worker doit rejeter la génération en cours, pas annoncer une réussite.
const panne = new CommentatorVoice(); const attente = panne.preload();
const workerPanne = FauxWorker.instances.at(-1)!; workerPanne.pret(); await attente;
const phrasePanne = panne.speak('Ne doit pas réussir.'); await tourner();
workerPanne.onerror?.();
await assert.rejects(phrasePanne, /interrompu/);
controles++;
// Après une panne, le Worker neuf reprend le compteur d'annulation du lecteur.
const reprise = panne.preload(); const workerReprise = FauxWorker.instances.at(-1)!;
workerReprise.pret(); await reprise;
const phraseReprise = panne.speak('La voix reprend.'); await tourner();
assert.equal(derniereSynthese(workerReprise).generation, workerReprise.generation);
workerReprise.audio(derniereSynthese(workerReprise).id); await tourner();
assert.equal(FausseSource.instances.at(-1)!.commence, true);
FausseSource.instances.at(-1)!.finir(); await phraseReprise;
panne.dispose(); controles++;
console.log(`${controles} contrôles vocaux réussis : chargement unique, ordre, interruption, pause, réutilisation et libération.`);
