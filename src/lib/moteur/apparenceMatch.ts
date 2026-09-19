import type { PosteId } from '../../types';
import { APPARENCES_JOUEURS_MATCH, type CoiffureMatch } from '../../data/apparencesMatch.generated';

export type MorphologieMatch = 'pilier' | 'avant' | 'athletique' | 'arriere' | 'ailier';
export type MotifMaillot = 'uni' | 'cerceaux' | 'rayures' | 'epaules' | 'bande' | 'diagonale';

export interface ApparenceMatch {
  tailleCm: number;
  poidsKg: number;
  peau: string;
  cheveux: string;
  coiffure: CoiffureMatch;
  morphologie: MorphologieMatch;
}

export interface MaillotMatch {
  principal: string;
  secondaire: string;
  accent: string;
  short: string;
  chaussettes: string;
  motif: MotifMaillot;
}

const PROFIL_POSTE: Record<PosteId, [number, number, MorphologieMatch]> = {
  pilier_gauche: [184, 119, 'pilier'], talonneur: [181, 108, 'pilier'], pilier_droit: [185, 121, 'pilier'],
  deuxieme_ligne_g: [199, 116, 'avant'], deuxieme_ligne_d: [199, 116, 'avant'],
  troisieme_aile_g: [191, 107, 'avant'], troisieme_aile_d: [191, 107, 'avant'], numero_8: [193, 112, 'avant'],
  demi_melee: [176, 82, 'arriere'], demi_ouverture: [183, 88, 'arriere'],
  ailier_gauche: [186, 91, 'ailier'], premier_centre: [188, 99, 'athletique'],
  deuxieme_centre: [189, 100, 'athletique'], ailier_droit: [186, 91, 'ailier'], arriere: [187, 92, 'arriere'],
};

const PEAUX = ['#efc19d', '#d99b72', '#b87550', '#8f573b', '#633d2f', '#4a3028'];
const CHEVEUX = ['#171311', '#2c1d17', '#4c2f20', '#72503a', '#b07d4f'];
const COIFFURES: CoiffureMatch[] = ['buzz', 'short', 'fade', 'curly', 'afro', 'messy'];

export function normaliserNomMatch(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase();
}

export function graineVisuelleMatch(texte: string): number {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function apparenceJoueurMatch(nom: string, poste: PosteId): ApparenceMatch {
  const cle = normaliserNomMatch(nom);
  const generee = APPARENCES_JOUEURS_MATCH[cle];
  const h = graineVisuelleMatch(`${cle}:${poste}`);
  const [taille, poids, morphologie] = PROFIL_POSTE[poste];
  return {
    tailleCm: generee?.tailleCm ?? taille + (h % 7) - 3,
    poidsKg: generee?.poidsKg ?? poids + ((h >>> 4) % 9) - 4,
    peau: generee?.peau ?? PEAUX[(h >>> 8) % PEAUX.length],
    cheveux: generee?.cheveux ?? CHEVEUX[(h >>> 12) % CHEVEUX.length],
    coiffure: generee?.coiffure ?? COIFFURES[(h >>> 16) % COIFFURES.length],
    morphologie,
  };
}

function assombrir(hex: string, facteur: number): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(n)) return '#171b20';
  const c = (decalage: number) => Math.round(((n >> decalage) & 255) * facteur).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return (((n >> 16) & 255) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) / 255;
}

export function maillotDeSecours(principal: string, cle: string): MaillotMatch {
  const h = graineVisuelleMatch(cle);
  const clair = luminance(principal) > .55;
  return {
    principal,
    secondaire: clair ? '#182128' : '#f3efe2',
    accent: clair ? '#111820' : '#ffffff',
    short: assombrir(principal.startsWith('#') ? principal : '#344054', .48),
    chaussettes: principal,
    motif: (['uni', 'cerceaux', 'rayures', 'epaules', 'bande', 'diagonale'] as MotifMaillot[])[h % 6],
  };
}

const couleurHex = (r: number, g: number, b: number) => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Lit les pixels d'un écusson local et en tire un maillot contrasté. */
export async function maillotDepuisBlason(url: string | undefined, secours: MaillotMatch, cle: string): Promise<MaillotMatch> {
  if (!url || typeof document === 'undefined') return secours;
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 40;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(secours);
        ctx.drawImage(image, 0, 0, 40, 40);
        const pixels = ctx.getImageData(0, 0, 40, 40).data;
        const groupes = new Map<string, { rgb: number[]; n: number; score: number }>();
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] < 160) continue;
          const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
          const max = Math.max(...rgb), min = Math.min(...rgb), saturation = max - min;
          if (max < 35 || (max > 238 && saturation < 18)) continue;
          const q = rgb.map(v => Math.round(v / 32) * 32);
          const id = q.join(':'); const actuel = groupes.get(id);
          if (actuel) { actuel.n++; actuel.score += saturation + 25; }
          else groupes.set(id, { rgb, n: 1, score: saturation + 25 });
        }
        const tries = [...groupes.values()].sort((a, b) => b.score - a.score);
        if (!tries.length) return resolve(secours);
        const principal = tries[0].rgb;
        const second = tries.find(c => c.n > 2 && distance(c.rgb, principal) > 105)?.rgb
          ?? (luminance(couleurHex(...principal as [number, number, number])) > .5 ? [25, 31, 38] : [245, 241, 226]);
        const p = couleurHex(...principal as [number, number, number]);
        const s = couleurHex(...second as [number, number, number]);
        const h = graineVisuelleMatch(`${cle}:${p}:${s}`);
        resolve({ principal: p, secondaire: s, accent: luminance(p) > .52 ? '#10161c' : '#ffffff', short: assombrir(p, .48), chaussettes: p, motif: (['uni', 'cerceaux', 'rayures', 'epaules', 'bande', 'diagonale'] as MotifMaillot[])[h % 6] });
      } catch { resolve(secours); }
    };
    image.onerror = () => resolve(secours);
    image.src = url;
  });
}
