// Adaptateur TEXTE → VOIX. Une seule file, avec les règles existantes du match.
import { CommentatorVoice } from './CommentatorVoice';
import type { EtatVoix } from './voiceProtocol';
import type { LangueRetransmission, Voix } from './phrases.js';
import type { Replique } from './retransmission.js';

export interface LecteurVoix {
  readonly disponible: boolean;
  dire(replique: Replique, maintenant: number): void;
  couper(): void;
  detruire(): void;
}
type OptionsVoix = { moteur?: CommentatorVoice; surEtat?: (etat: EtatVoix) => void };
type SortieVocale = {
  disponible: boolean;
  initialiser(): Promise<void> | null;
  parler(replique: Replique, debut: () => void, fin: () => void): void;
  couper(): void;
  detruire(): void;
};
const PROFILS: Record<Voix, { debit: number; hauteur: number }> = {
  commentateur: { debit: 1.14, hauteur: 1.06 },
  consultant: { debit: 0.98, hauteur: 0.8 },
};
const qualite = (v: SpeechSynthesisVoice) => (/natural|neural|online|enhanced|premium|siri|google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);

/** Sortie de l'appareil existante, utilisée pour l'anglais. */
function sortieAppareil(langue: LangueRetransmission): SortieVocale {
  const synthese = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synthese || typeof SpeechSynthesisUtterance === 'undefined') {
    return { disponible: false, initialiser: () => null, parler: (_r, debut, fin) => { debut(); fin(); }, couper() {}, detruire() {} };
  }
  let voix: Partial<Record<Voix, SpeechSynthesisVoice>> = {};
  const choisir = () => {
    const dans = synthese.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(langue)).sort((a, b) => qualite(b) - qualite(a));
    voix = { commentateur: dans[0], consultant: dans[1] ?? dans[0] };
  };
  choisir(); synthese.addEventListener?.('voiceschanged', choisir);
  return {
    disponible: true, initialiser: () => null,
    parler(r, debut, fin) {
      const u = new SpeechSynthesisUtterance(r.texte);
      const p = PROFILS[r.voix];
      u.lang = langue === 'fr' ? 'fr-FR' : 'en-GB';
      if (voix[r.voix]) u.voice = voix[r.voix]!;
      u.rate = p.debit; u.pitch = voix.commentateur === voix.consultant && r.voix === 'consultant' ? 0.65 : p.hauteur; u.volume = 1;
      u.onend = fin; u.onerror = fin;
      debut(); synthese.speak(u);
    },
    couper: () => synthese.cancel(),
    detruire() { synthese.cancel(); synthese.removeEventListener?.('voiceschanged', choisir); },
  };
}

/** Sortie F5 locale : aucune file supplémentaire. */
function sortieF5(options: OptionsVoix): SortieVocale {
  if (!CommentatorVoice.isSupported()) {
    options.surEtat?.({ statut: 'erreur', erreur: 'La voix locale est indisponible sur ce navigateur.' });
    return { disponible: false, initialiser: () => null, parler: (_r, debut, fin) => { debut(); fin(); }, couper() {}, detruire() {} };
  }
  const moteur = options.moteur ?? new CommentatorVoice();
  const desabonner = moteur.subscribe((etat) => options.surEtat?.(etat));
  let detruit = false;
  return {
    disponible: true,
    // Sur le clic existant, AudioContext est déverrouillé avant l'attente du service.
    initialiser: () => moteur.initialize(),
    parler(r, debut, fin) {
      void moteur.speak(r.texte, { debit: PROFILS[r.voix].debit, hauteur: 1, surDebut: debut })
        .catch((erreur: Error) => {
          if (!detruit) { options.surEtat?.({ statut: 'erreur', erreur: erreur.message }); debut(); }
        }).finally(fin);
    },
    couper: () => moteur.stop(),
    detruire() { detruit = true; moteur.stop(); desabonner(); if (!options.moteur) moteur.dispose(); },
  };
}

export function creerLecteurVoix(langue: LangueRetransmission, surParole?: (replique: Replique | null) => void,
  options: OptionsVoix = {}): LecteurVoix {
  const sortie = langue === 'fr' ? sortieF5(options) : sortieAppareil(langue);
  let file: Replique[] = [];
  let enCours: Replique | null = null;
  let detruit = false;
  let pret = false;
  let indisponible = !sortie.disponible;
  let version = 0;
  const suivante = () => {
    if (detruit || !pret || enCours) return;
    const r = file.shift();
    if (!r) { surParole?.(null); return; }
    enCours = r;
    const numero = version;
    sortie.parler(r,
      () => { if (!detruit && numero === version && enCours === r) surParole?.(r); },
      () => { if (!detruit && numero === version && enCours === r) { enCours = null; suivante(); } });
  };
  const preparation = sortie.initialiser();
  if (!preparation) pret = true;
  else void preparation.then(() => {
    if (detruit) return;
    pret = true;
    file = file.filter((r) => performance.now() / 1000 - r.t < 5 || r.priorite >= 4);
    suivante();
  }).catch((erreur: Error) => {
    if (detruit) return;
    indisponible = true; file = [];
    options.surEtat?.({ statut: 'erreur', erreur: erreur.message });
  });
  return {
    disponible: sortie.disponible,
    dire(replique, maintenant) {
      if (detruit) return;
      if (indisponible) { surParole?.(replique); return; }
      // Ce qui attend depuis plus de cinq secondes n'a plus de sens : l'action est passée.
      file = file.filter((r) => maintenant - r.t < 5 || r.priorite >= 4);
      // Un essai, un carton : on coupe la parole à une anecdote.
      if (replique.priorite >= 5 && enCours && enCours.priorite <= 2) {
        version++; enCours = null; sortie.couper(); file = file.filter((r) => r.priorite >= 3);
      }
      // Jamais plus de trois phrases en attente : les moins importantes cèdent leur place.
      file.push(replique);
      if (file.length > 3) file = [...file].sort((a, b) => b.priorite - a.priorite || a.t - b.t).slice(0, 3).sort((a, b) => a.t - b.t);
      suivante();
    },
    couper() { version++; file = []; enCours = null; sortie.couper(); surParole?.(null); },
    detruire() { detruit = true; version++; file = []; enCours = null; sortie.detruire(); },
  };
}

/** La langue de la retransmission pour une langue d'interface : français, sinon anglais. */
export const langueDeRetransmission = (langue: string): LangueRetransmission => (langue === 'fr' ? 'fr' : 'en');
