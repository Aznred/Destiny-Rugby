// Cahier de jeu partagé par le navigateur et le serveur. Les coordonnées sont
// des mètres depuis la conquête, dans le sens d'attaque de l'équipe.
export type PhaseCombinaison = 'melee' | 'touche' | 'ruck';
export type ZoneCombinaison = 'toutes' | 'nos22' | 'milieu' | 'leurs22';
export type CouloirCombinaison = 'tous' | 'gauche' | 'centre' | 'droite';
export type PiedCombinaison = 'occupation' | 'degagement' | 'chandelle' | 'rasant' | 'transversale' | 'cinquanteVingtDeux' | 'drop';
export interface PointCombinaison { x: number; y: number }
export interface PlacementCombinaison extends PointCombinaison { numero: number }
export interface ToucheCombinaison {
  alignes: 4 | 5 | 7;
  /** Distance du sauteur depuis la ligne de touche, entre 5 et 15 mètres. */
  distance: number;
  feinte: boolean;
}
export type ActionCombinaison =
  | { type: 'passe'; destinataire: number }
  | { type: 'course'; destination: PointCombinaison }
  | { type: 'leurre'; numero: number; destination: PointCombinaison }
  | { type: 'pied'; intention: PiedCombinaison };
export interface VarianteCombinaison {
  nom: string;
  poids: number;
  depart: number;
  sauteur: number;
  touche?: ToucheCombinaison;
  placements: PlacementCombinaison[];
  actions: ActionCombinaison[];
}
export interface Combinaison {
  id: string;
  nom: string;
  active: boolean;
  phase: PhaseCombinaison;
  zone: ZoneCombinaison;
  couloir: CouloirCombinaison;
  variantes: VarianteCombinaison[];
}
export const MAX_COMBINAISONS = 12;
export const MAX_VARIANTES = 3;
export const MAX_ACTIONS = 10;
export function erreursVariante(phase: PhaseCombinaison, v: VarianteCombinaison): { type: 'vide' | 'passeASoi' | 'apresPied'; action?: number }[] {
  const erreurs: { type: 'vide' | 'passeASoi' | 'apresPied'; action?: number }[] = [];
  if (!v.actions.length) erreurs.push({ type: 'vide' });
  let porteur = phase === 'touche' ? v.sauteur : v.depart;
  let pied = false;
  v.actions.forEach((a, i) => {
    if (pied) erreurs.push({ type: 'apresPied', action: i + 1 });
    if (a.type === 'passe') {
      if (a.destinataire === porteur) erreurs.push({ type: 'passeASoi', action: i + 1 });
      porteur = a.destinataire;
    }
    if (a.type === 'pied') pied = true;
  });
  return erreurs;
}
const PIEDS: PiedCombinaison[] = ['occupation', 'degagement', 'chandelle', 'rasant', 'transversale', 'cinquanteVingtDeux', 'drop'];
const objet = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const nombre = (v: unknown, min: number, max: number, defaut: number) => typeof v === 'number' && Number.isFinite(v) ? borner(v, min, max) : defaut;
const numero = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 15;
const texte = (v: unknown, defaut: string) => typeof v === 'string' ? v.replace(/\p{Cc}/gu, '').trim().slice(0, 40) || defaut : defaut;
const point = (v: unknown): PointCombinaison => ({ x: nombre(objet(v).x, -35, 35, 0), y: nombre(objet(v).y, -65, 65, 0) });

/** Les anciens cahiers sans réglage de touche restent utilisables. */
export function toucheValide(brut: unknown): ToucheCombinaison {
  const t = objet(brut);
  return { alignes: t.alignes === 4 || t.alignes === 7 ? t.alignes : 5,
    distance: Math.round(nombre(t.distance, 5, 15, 8.1) * 10) / 10, feinte: t.feinte === true };
}

/** Même ordre et mêmes distances dans l'éditeur et dans le moteur. */
export function alignementCombinaison(v: Pick<VarianteCombinaison, 'sauteur' | 'touche'>, disponibles = [1, 3, 4, 5, 6, 7, 8]): { numero: number; distance: number }[] {
  const t = toucheValide(v.touche);
  const numeros = disponibles.slice(0, t.alignes);
  if (!numeros.includes(v.sauteur) && disponibles.includes(v.sauteur)) numeros[numeros.length - 1] = v.sauteur;
  const distances = numeros.map((_, i) => 5 + i * 1.55);
  const cible = distances.reduce((meilleur, d, i) => Math.abs(d - t.distance) < Math.abs(distances[meilleur] - t.distance) ? i : meilleur, 0);
  const ancien = numeros.indexOf(v.sauteur);
  if (ancien >= 0) [numeros[cible], numeros[ancien]] = [numeros[ancien], numeros[cible]];
  return numeros.map((numero, i) => ({ numero, distance: numero === v.sauteur ? t.distance : distances[i] }));
}

/** Limites identiques côté client et serveur ; aucun bonus de performance reçu. */
export function combinaisonsValides(brut: unknown): Combinaison[] {
  if (!Array.isArray(brut)) return [];
  const ids = new Set<string>();
  return brut.slice(0, MAX_COMBINAISONS).flatMap((valeur, i) => {
    const c = objet(valeur);
    if (!['melee', 'touche', 'ruck'].includes(c.phase as string)) return [];
    const variantes = (Array.isArray(c.variantes) ? c.variantes : []).slice(0, MAX_VARIANTES).flatMap((valeurV, j) => {
      const v = objet(valeurV);
      const vus = new Set<number>();
      const placements: PlacementCombinaison[] = (Array.isArray(v.placements) ? v.placements : []).slice(0, 15).flatMap(pBrut => {
        const p = objet(pBrut);
        if (!numero(p.numero) || vus.has(p.numero as number)) return [];
        vus.add(p.numero as number);
        return [{ numero: p.numero as number, ...point(p) }];
      });
      const actions: ActionCombinaison[] = (Array.isArray(v.actions) ? v.actions : []).slice(0, MAX_ACTIONS).flatMap<ActionCombinaison>(aBrut => {
        const a = objet(aBrut);
        if (a.type === 'passe' && numero(a.destinataire)) return [{ type: 'passe', destinataire: a.destinataire as number }];
        if (a.type === 'course') return [{ type: 'course', destination: point(a.destination) }];
        if (a.type === 'leurre' && numero(a.numero)) return [{ type: 'leurre', numero: a.numero as number, destination: point(a.destination) }];
        if (a.type === 'pied' && PIEDS.includes(a.intention as PiedCombinaison)) return [{ type: 'pied', intention: a.intention as PiedCombinaison }];
        return [];
      });
      if (!actions.length) return [];
      // Après un coup de pied, le ballon est disputé : la suite appartient au jeu.
      const pied = actions.findIndex(a => a.type === 'pied');
      return [{ nom: texte(v.nom, `Variante ${j + 1}`), poids: Math.round(nombre(v.poids, 1, 100, 1)),
        depart: c.phase === 'melee' ? v.depart === 8 ? 8 : 9 : numero(v.depart) && (v.depart as number) <= 9 ? v.depart as number : 9,
        sauteur: numero(v.sauteur) && v.sauteur !== 2 && (v.sauteur as number) <= 8 ? v.sauteur as number : 4,
        ...(v.touche !== undefined ? { touche: toucheValide(v.touche) } : {}),
        placements, actions: pied < 0 ? actions : actions.slice(0, pied + 1) }];
    });
    if (!variantes.length) return [];
    let id = texte(c.id, `combinaison-${i + 1}`);
    const racine = id.slice(0, 30);
    let suffixe = 1;
    while (ids.has(id)) id = `${racine}-${i + 1}-${suffixe++}`;
    ids.add(id);
    return [{ id, nom: texte(c.nom, `Combinaison ${i + 1}`), active: c.active !== false, phase: c.phase as PhaseCombinaison,
      zone: ['nos22', 'milieu', 'leurs22'].includes(c.zone as string) ? c.zone as ZoneCombinaison : 'toutes',
      couloir: ['gauche', 'centre', 'droite'].includes(c.couloir as string) ? c.couloir as CouloirCombinaison : 'tous', variantes }];
  });
}

/** x = 0 sur notre ligne d'essai, 100 sur la ligne adverse ; gauche vue en attaque. */
export function choisirCombinaison(combinaisons: Combinaison[], phase: PhaseCombinaison, x: number, y: number): Combinaison | undefined {
  const zone: ZoneCombinaison = x <= 22 ? 'nos22' : x >= 78 ? 'leurs22' : 'milieu';
  const couloir: CouloirCombinaison = y < 70 / 3 ? 'gauche' : y > 140 / 3 ? 'droite' : 'centre';
  return combinaisons.filter(c => c.active && c.phase === phase && (c.zone === 'toutes' || c.zone === zone)
    && (c.couloir === 'tous' || c.couloir === couloir))
    .sort((a, b) => Number(b.zone !== 'toutes') + Number(b.couloir !== 'tous') - Number(a.zone !== 'toutes') - Number(a.couloir !== 'tous'))[0];
}

export function choisirVariante(c: Combinaison, rng: () => number): VarianteCombinaison {
  let reste = rng() * c.variantes.reduce((total, v) => total + v.poids, 0);
  return c.variantes.find(v => (reste -= v.poids) < 0) ?? c.variantes[c.variantes.length - 1];
}

export function origineApercu(c: Pick<Combinaison, 'phase' | 'zone' | 'couloir'>): PointCombinaison {
  return { x: c.zone === 'nos22' ? 14 : c.zone === 'leurs22' ? 86 : 50,
    y: c.phase === 'touche' ? c.couloir === 'droite' ? 69 : 1 : c.couloir === 'gauche' ? 14 : c.couloir === 'droite' ? 56 : 35 };
}

export function creerCombinaison(id: string, phase: PhaseCombinaison = 'melee'): Combinaison {
  const laterale = phase === 'touche';
  const placements = [9, 10, 12, 13, 14, 15].map((numero, i) => ({ numero, x: -2 - i * 2,
    y: laterale ? 10 + i * 6 : -12 + i * 6 }));
  return { id, nom: phase === 'touche' ? 'Sortie de touche' : 'Lancement au large', active: true, phase, zone: 'toutes', couloir: 'tous',
    variantes: [{ nom: 'Au large', poids: 1, depart: 9, sauteur: 4, placements,
      ...(laterale ? { touche: toucheValide(undefined) } : {}),
      actions: [...(laterale ? [{ type: 'passe' as const, destinataire: 9 }] : []),
        { type: 'passe', destinataire: 10 }, { type: 'passe', destinataire: 12 }, { type: 'passe', destinataire: 13 },
        { type: 'course', destination: { x: 15, y: laterale ? 34 : 10 } }] }] };
}
