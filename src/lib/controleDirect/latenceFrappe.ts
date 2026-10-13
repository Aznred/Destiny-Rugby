// LA LATENCE D'UN COUP DE PIED, MESURÉE — Correctif 40.
//
// Demande : « ajouter temporairement au profiler kickInputTimestamp, animationStartTimestamp, ballContactTimestamp, puis
// afficher Input → animation et Animation → ball contact. Cela permettra d'identifier précisément où se situe le délai. »
//
// Trois instants, tous lus à l'horloge du navigateur (`performance.now()`) :
//   - l'APPUI : le pilote vient de transformer le geste du joueur en demande de coup de pied ;
//   - l'ANIMATION : la scène pose pour la première fois le clip de frappe de ce joueur ;
//   - le CONTACT : la scène affiche l'image où le pied touche le ballon — celle où il part.
// Le pilote note l'appui ; la scène tient son propre journal (`frappesAffichees`) ; ce module les rapproche.
//
// ⚠️ CE QU'ON MESURE EST CE QUE LE JOUEUR VOIT, pas ce que le moteur calcule : l'image a un pas de retard (0,15 s) sur
// le moteur, et il est compté. Rien n'est envoyé nulle part : c'est un relevé de cet appareil, lu par le profileur.
export interface ReleveLatenceFrappe { appuiAnimation: number; animationContact: number; clip: string }
interface FrappeAffichee { id?: number; joueurId?: string; clip: string; animA: number | null; contactA: number | null }

const MEMOIRE = 40;
let releves: ReleveLatenceFrappe[] = [];
let appui: { t: number; joueurId: string; animA?: number; clip?: string } | null = null;

/** Le joueur vient de demander un coup de pied (ou un drop). */
export function noterAppuiFrappe(joueurId: string, t = performance.now()): void {
  // Un appui pendant qu'un coup de pied se prépare ne relance rien : la mesure reste celle du premier.
  if (appui && t - appui.t < 1500) return;
  appui = { t, joueurId };
}

/** À chaque image : rapproche l'appui en attente de ce que la scène a montré. */
export function suivreFrappes(scene: { frappesAffichees?: () => FrappeAffichee[] } | null, maintenant = performance.now()): void {
  if (!appui) return;
  if (maintenant - appui.t > 3000) { appui = null; return; }
  const montrees = scene?.frappesAffichees?.();
  if (!montrees?.length) return;
  for (let i = montrees.length - 1; i >= 0; i--) {
    const f = montrees[i];
    if (f.joueurId !== appui.joueurId || f.animA === null || f.animA < appui.t - 40) continue;
    appui.animA = f.animA; appui.clip = f.clip;
    if (f.contactA !== null) {
      releves.push({ appuiAnimation: Math.max(0, f.animA - appui.t), animationContact: Math.max(0, f.contactA - f.animA), clip: f.clip });
      if (releves.length > MEMOIRE) releves.shift();
      appui = null;
    }
    return;
  }
}

export interface LatenceFrappes {
  n: number;
  appuiAnimation: { moyenne: number; max: number; dernier: number };
  animationContact: { moyenne: number; max: number; dernier: number };
  dernierClip: string;
}

/** Ce que le profileur affiche ; `null` tant qu'aucun coup de pied n'a été tapé à la main. */
export function latenceFrappes(): LatenceFrappes | null {
  if (!releves.length) return null;
  const resume = (v: number[]) => ({ moyenne: v.reduce((n, x) => n + x, 0) / v.length, max: Math.max(...v), dernier: v[v.length - 1] });
  return {
    n: releves.length,
    appuiAnimation: resume(releves.map((r) => r.appuiAnimation)),
    animationContact: resume(releves.map((r) => r.animationContact)),
    dernierClip: releves[releves.length - 1].clip,
  };
}

export function oublierLatenceFrappes(): void { releves = []; appui = null; }
