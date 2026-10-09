// « MON IMAGE », CÔTÉ ÉCRAN — la liste publique des portraits retirés ou remplacés, et les appels du formulaire.
//
// ⚠️ UNE REQUÊTE PAR VISITE, PAS PAR CARTE : la liste (quelques octets tant que personne n'a rien demandé) est lue une
// fois, au repos, puis rangée dans le registre de `avatars.ts` que lisent les cartes, les compositions et les bandeaux.
// Sans réseau, ou sans la table côté serveur, rien ne change : les portraits du jeu restent ceux d'origine.

import { definirChoixImages } from './avatars';
import type { DemandeImage, ImagesJoueurs, SaisieDemandeImage, StatutDemandeImage } from './demandesImage';

let demande: Promise<void> | undefined;
/** Lit la liste publique une fois par visite (appelée par `main.tsx`, hors du chemin du premier rendu). */
export function chargerImagesJoueurs(): Promise<void> {
  demande ??= fetch('/api/carriere?imagesJoueurs=1', { credentials: 'omit' })
    .then(r => (r.ok ? r.json() as Promise<ImagesJoueurs> : null))
    .then(liste => { if (liste && Array.isArray(liste.retirees)) definirChoixImages(liste.retirees, liste.ajoutees ?? {}); })
    .catch(() => { demande = undefined; });
  return demande;
}

export interface VueDemandesImage { miennes: DemandeImage[]; toutes?: DemandeImage[] }
export class ErreurDemandeImage extends Error {
  readonly statut: number;
  constructor(statut: number, message: string) { super(message); this.statut = statut; }
}

async function appel<T>(chemin: string, corps?: unknown): Promise<T> {
  const r = await fetch(`/api/carriere${chemin}`, corps === undefined ? { credentials: 'include' } : {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
  });
  const donnees = await r.json().catch(() => ({})) as T & { erreur?: string };
  if (!r.ok) throw new ErreurDemandeImage(r.status, donnees.erreur ?? '');
  return donnees;
}

export const lireDemandesImage = () => appel<VueDemandesImage>('?demandesImage=1');
export const envoyerDemandeImage = (saisie: SaisieDemandeImage) => appel<VueDemandesImage>('?action=demandeImage', { action: 'demandeImage', ...saisie });
export const lireImageDemande = (id: string) => appel<{ image: string | null }>(`?demandesImage=1&image=${encodeURIComponent(id)}`);
export const deciderDemandeImage = (id: string, decision: StatutDemandeImage) =>
  appel<VueDemandesImage>('?action=deciderDemandeImage', { action: 'deciderDemandeImage', id, decision });

/** Le portrait choisi par le joueur, ramené à 600 px et encodé en WebP (ou JPEG) : c'est ce qui part au serveur. */
export async function preparerPortrait(fichier: File, cote = 600): Promise<string> {
  const image = await createImageBitmap(fichier);
  const echelle = Math.min(1, cote / Math.max(image.width, image.height));
  const toile = document.createElement('canvas');
  toile.width = Math.max(1, Math.round(image.width * echelle));
  toile.height = Math.max(1, Math.round(image.height * echelle));
  toile.getContext('2d')!.drawImage(image, 0, 0, toile.width, toile.height);
  image.close();
  // Un portrait détouré garde sa transparence en WebP ; à défaut (vieux Safari), JPEG.
  for (const [type, qualite] of [['image/webp', .86], ['image/webp', .7], ['image/jpeg', .8], ['image/jpeg', .6]] as const) {
    const url = toile.toDataURL(type, qualite);
    if (url.startsWith(`data:${type}`) && url.length <= 270_000) return url;
  }
  throw new Error('img.erreur.poids');
}
