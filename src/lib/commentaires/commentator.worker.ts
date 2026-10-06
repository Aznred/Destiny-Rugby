import type { EtatVoix, RequeteVoix, ReponseVoix } from './voiceProtocol';

// F5 calcule dans le processus local. Le Worker transporte le PCM sans bloquer
// le rendu du match et sans charger de modèle pour chaque phrase.
const SERVICE = 'http://127.0.0.1:8765';
const poster = (message: ReponseVoix, transfert: Transferable[] = []) => self.postMessage(message, { transfer: transfert });
let chargement: Promise<void> | null = null;
let generation = 0;
let travail = Promise.resolve();
let annulation: AbortController | null = null;

async function verifier(): Promise<void> {
  const debut = Date.now();
  for (;;) {
    let reponse: Response;
    try { reponse = await fetch(`${SERVICE}/health`, { signal: AbortSignal.timeout(5000), cache: 'no-store' }); }
    catch { throw new Error('Lance « Lancer voix F5.cmd » dans le dossier test voice, puis réactive la voix.'); }
    if (!reponse.ok) throw new Error('Le service vocal local est indisponible.');
    const etat = await reponse.json() as EtatVoix;
    if (!['chargement', 'pret', 'erreur'].includes(etat.statut)) throw new Error('Service vocal incompatible.');
    poster({ type: 'etat', etat });
    if (etat.statut === 'pret') return;
    if (etat.statut === 'erreur') throw new Error(etat.erreur ?? 'F5-TTS n’a pas pu préparer la voix.');
    if (Date.now() - debut > 590_000) throw new Error('La préparation de F5-TTS prend trop de temps. Consulte sa fenêtre locale.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
const initialiser = () => chargement ??= verifier().catch((erreur) => { chargement = null; throw erreur; });

self.onmessage = ({ data }: MessageEvent<RequeteVoix>) => {
  if (data.type === 'stop') { generation = data.generation; annulation?.abort(); return; }
  travail = travail.then(async () => {
    try {
      await initialiser();
      if (data.type === 'initialize') { poster({ type: 'ready', id: data.id }); return; }
      if (data.generation !== generation) { poster({ type: 'annule', id: data.id }); return; }
      annulation = new AbortController();
      const reponse = await fetch(`${SERVICE}/synthesize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte: data.texte, debit: data.debit }),
        signal: AbortSignal.any([annulation.signal, AbortSignal.timeout(180_000)]),
      });
      if (!reponse.ok) {
        const erreur = await reponse.json() as { erreur?: string };
        throw new Error(erreur.erreur ?? 'La génération F5-TTS a échoué.');
      }
      const frequence = Number(reponse.headers.get('X-Sample-Rate'));
      const contenu = await reponse.arrayBuffer();
      if (data.generation !== generation) { poster({ type: 'annule', id: data.id }); return; }
      if (frequence !== 24000 || contenu.byteLength % 4 || contenu.byteLength === 0 || contenu.byteLength > 24000 * 4 * 120) throw new Error('Réponse audio F5-TTS invalide.');
      const audio = new Float32Array(contenu);
      if (audio.some((valeur) => !Number.isFinite(valeur))) throw new Error('Réponse audio F5-TTS invalide.');
      poster({ type: 'audio', id: data.id, audio, frequence }, [audio.buffer]);
    } catch (erreur) {
      if (data.type === 'synthesize' && data.generation !== generation) { poster({ type: 'annule', id: data.id }); return; }
      poster({ type: 'error', id: data.id, erreur: erreur instanceof Error ? erreur.message : 'Le service vocal local ne répond plus.' });
    } finally { annulation = null; }
  });
};
