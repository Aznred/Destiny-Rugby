// LES VOIX DE LA RETRANSMISSION — deux timbres, sans rien télécharger
//
// Les répliques sont écrites à la volée (elles nomment les joueurs, donnent le
// score) : aucun enregistrement ne peut les dire. Elles passent par la synthèse
// vocale de l'appareil (`speechSynthesis`), dont les voix appartiennent au
// système — rien à héberger, rien à payer, aucune voix de personne réelle
// imitée. Le commentateur parle vite et haut ; le consultant plus bas, plus
// lentement, avec une AUTRE voix quand l'appareil en a deux dans la langue.
//
// ⚠️ CE MODULE EST UNE INTERFACE (`LecteurVoix`). Des voix de studio générées à
// l'avance, ou un service de synthèse en ligne, se brancheront ici sans toucher
// au reste : la retransmission produit du texte et un nom de voix, rien d'autre.
import type { LangueRetransmission, Voix } from './phrases.js';
import type { Replique } from './retransmission.js';

export interface LecteurVoix {
  /** L'appareil sait-il parler dans cette langue ? Sinon les sous-titres restent seuls. */
  readonly disponible: boolean;
  dire(replique: Replique, maintenant: number): void;
  couper(): void;
  detruire(): void;
}

const PROFILS: Record<Voix, { debit: number; hauteur: number }> = {
  commentateur: { debit: 1.14, hauteur: 1.06 },
  consultant: { debit: 0.98, hauteur: 0.8 },
};
/** Les voix « neuronales » des systèmes récents se reconnaissent à leur nom. */
const qualite = (v: SpeechSynthesisVoice) => (/natural|neural|online|enhanced|premium|siri|google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);

export function creerLecteurVoix(langue: LangueRetransmission, surParole?: (replique: Replique | null) => void): LecteurVoix {
  const synthese = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synthese || typeof SpeechSynthesisUtterance === 'undefined') {
    return { disponible: false, dire: (r) => surParole?.(r), couper: () => surParole?.(null), detruire() {} };
  }
  let voix: Partial<Record<Voix, SpeechSynthesisVoice>> = {};
  const choisir = () => {
    const dans = synthese.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(langue)).sort((a, b) => qualite(b) - qualite(a));
    voix = { commentateur: dans[0], consultant: dans[1] ?? dans[0] };
  };
  choisir();
  synthese.addEventListener?.('voiceschanged', choisir);
  let file: Replique[] = [];
  let enCours: Replique | null = null;
  let detruit = false;
  const suivante = () => {
    if (detruit || enCours) return;
    const r = file.shift();
    if (!r) { surParole?.(null); return; }
    enCours = r;
    const u = new SpeechSynthesisUtterance(r.texte);
    const p = PROFILS[r.voix];
    u.lang = langue === 'fr' ? 'fr-FR' : 'en-GB';
    if (voix[r.voix]) u.voice = voix[r.voix]!;
    // Une seule voix sur l'appareil : le consultant descend encore d'un ton pour s'en distinguer.
    u.rate = p.debit; u.pitch = voix.commentateur === voix.consultant && r.voix === 'consultant' ? 0.65 : p.hauteur; u.volume = 1;
    const fin = () => { if (enCours === r) { enCours = null; suivante(); } };
    u.onend = fin; u.onerror = fin;
    surParole?.(r);
    synthese.speak(u);
  };
  return {
    disponible: true,
    dire(replique, maintenant) {
      // Ce qui attend depuis plus de cinq secondes n'a plus de sens : l'action est passée.
      file = file.filter((r) => maintenant - r.t < 5 || r.priorite >= 4);
      // Un essai, un carton : on coupe la parole à une anecdote.
      if (replique.priorite >= 5 && enCours && enCours.priorite <= 2) { synthese.cancel(); enCours = null; file = file.filter((r) => r.priorite >= 3); }
      // Jamais plus de trois phrases en attente : les moins importantes cèdent leur place.
      file.push(replique);
      if (file.length > 3) file = [...file].sort((a, b) => b.priorite - a.priorite || a.t - b.t).slice(0, 3).sort((a, b) => a.t - b.t);
      suivante();
    },
    couper() { file = []; enCours = null; synthese.cancel(); surParole?.(null); },
    detruire() { detruit = true; file = []; enCours = null; synthese.cancel(); synthese.removeEventListener?.('voiceschanged', choisir); },
  };
}

/** La langue de la retransmission pour une langue d'interface : français, sinon anglais. */
export const langueDeRetransmission = (langue: string): LangueRetransmission => (langue === 'fr' ? 'fr' : 'en');
