// LA MANETTE — branchée, reconnue, lue image par image.
//
// ⚠️ ON LIT LE `standard` DU NAVIGATEUR, pas un modèle. L'API Gamepad range les
// boutons des manettes courantes dans le même ordre (0 A/Croix, 1 B/Rond, 2 X/Carré,
// 3 Y/Triangle, 4-5 épaules, 6-7 gâchettes, 9 Start, 12-15 croix directionnelle) :
// Xbox, PlayStation et les génériques « compatibles navigateur » passent donc par le
// même chemin. Le TYPE ne sert qu'à choisir les symboles qu'on affiche.

export type TypeManette = 'xbox' | 'playstation' | 'generique';

export type NomBouton = 'a' | 'b' | 'x' | 'y' | 'lb' | 'rb' | 'lt' | 'rt' | 'start';

export const INDEX_BOUTON: Record<NomBouton, number> = {
  a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, start: 9,
};

/** Ce que porte chaque bouton, selon la manette (les formes PlayStation sont dessinées par `GlypheManette`). */
export const LIBELLES_MANETTE: Record<TypeManette, Record<NomBouton, string>> = {
  xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', start: '☰' },
  playstation: { a: 'croix', b: 'rond', x: 'carre', y: 'triangle', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', start: '☰' },
  generique: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', start: '☰' },
};

export function typeDeManette(id: string): TypeManette {
  const s = id.toLowerCase();
  if (/(playstation|dualshock|dualsense|054c|sony|ps4|ps5|wireless controller)/.test(s)) return 'playstation';
  if (/(xbox|xinput|045e|microsoft)/.test(s)) return 'xbox';
  return 'generique';
}

export interface EtatManette {
  connectee: boolean;
  type: TypeManette;
  nom: string;
  /** Stick gauche, zone morte retirée : x à droite, y vers le haut, norme ≤ 1. */
  stick: { x: number; y: number };
  /** Stick droit, même repère. */
  droit: { x: number; y: number };
  sprint: boolean;
  /** Boutons pressés à cet instant. */
  boutons: boolean[];
  /** Boutons qui viennent d'être pressés (front montant) et relâchés, depuis la dernière lecture. */
  fronts: number[];
  relaches: number[];
  /** Quelque chose a bougé (un bouton, un stick au-delà de la zone morte) : la manette devient l'appareil du moment. */
  activite: boolean;
}

const ZONE_MORTE = 0.2;

function sansZoneMorte(x: number, y: number): { x: number; y: number } {
  const n = Math.hypot(x, y);
  if (n < ZONE_MORTE) return { x: 0, y: 0 };
  const k = Math.min(1, (n - ZONE_MORTE) / (1 - ZONE_MORTE)) / n;
  return { x: x * k, y: y * k };
}

export const MANETTE_ABSENTE: EtatManette = {
  connectee: false, type: 'generique', nom: '', stick: { x: 0, y: 0 }, droit: { x: 0, y: 0 }, sprint: false,
  boutons: [], fronts: [], relaches: [], activite: false,
};

/** Lit la première manette branchée, et retient ses boutons pour en tirer les fronts. */
export class LecteurManette {
  private avant: boolean[] = [];

  private trouver(): Gamepad | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    try {
      for (const g of navigator.getGamepads()) if (g && g.connected && g.buttons.length >= 8) return g;
    } catch {
      // Certains navigateurs refusent l'accès hors d'une page sécurisée : pas de manette.
    }
    return null;
  }

  lire(): EtatManette {
    const g = this.trouver();
    if (!g) { this.avant = []; return MANETTE_ABSENTE; }
    const boutons = g.buttons.map((b) => b.pressed || b.value > 0.55);
    const fronts: number[] = [], relaches: number[] = [];
    boutons.forEach((p, i) => {
      if (p && !this.avant[i]) fronts.push(i);
      else if (!p && this.avant[i]) relaches.push(i);
    });
    this.avant = boutons;
    const ax = (i: number) => g.axes[i] ?? 0;
    const stick = sansZoneMorte(ax(0), -ax(1));
    const droit = sansZoneMorte(ax(2), -ax(3));
    const croix = { x: (boutons[15] ? 1 : 0) - (boutons[14] ? 1 : 0), y: (boutons[12] ? 1 : 0) - (boutons[13] ? 1 : 0) };
    // La croix directionnelle sert de stick quand le stick ne dit rien (manette de salon, clavier de secours).
    const s = stick.x || stick.y ? stick : { x: croix.x, y: croix.y };
    const sprint = !!(boutons[6] || boutons[7]);
    const activite = fronts.length > 0 || Math.hypot(s.x, s.y) > 0.15 || Math.hypot(droit.x, droit.y) > 0.4 || sprint;
    return { connectee: true, type: typeDeManette(g.id), nom: g.id, stick: s, droit, sprint, boutons, fronts, relaches, activite };
  }

  /** Une secousse : une passe donnée, un plaquage encaissé. Silencieux partout où la manette n'a pas de moteur. */
  vibrer(duree = 90, fort = 0.45): void {
    const g = this.trouver() as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: unknown) => Promise<unknown> } }) | null;
    try {
      void g?.vibrationActuator?.playEffect?.('dual-rumble', { startDelay: 0, duration: duree, weakMagnitude: fort * 0.6, strongMagnitude: fort });
    } catch {
      // Pas de retour de force sur cette manette : ce n'est pas une erreur.
    }
  }
}
