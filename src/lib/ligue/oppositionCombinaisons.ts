import type { Coequipier } from '../effectif';
import { ORDRE_MAILLOTS } from '../moteur/entites';
import { avancer, creerMatch, DT, installerSituationCombinaison } from '../moteur/moteur';
import { LIGNE_A, type Vec } from '../moteur/terrain';
import type { SystemeDefensif } from '../moteur/etat';
import { combinaisonsValides, erreursVariante, origineApercu, type Combinaison, type VarianteCombinaison } from './combinaisons';
import { extraireTerrain, type TerrainDirect } from './matchCarriere';

export interface ImageOpposition {
  terrain: TerrainDirect;
  temps: number;
  libelle: string;
  passes: number;
  plaquages: number;
  metres: number;
  etape: number | null;
}
export interface EssaiOpposition { images: ImageOpposition[]; duree: number; resultat: string }

/** Exercice local, sans modifier la ligue : mêmes conquêtes, défense et contacts. */
export function simulerOppositionCombinaison(c: Combinaison, v: VarianteCombinaison, joueurs: Record<number, string>, defense: SystemeDefensif = 'glissee', essai = 0, effectif?: Coequipier[]): EssaiOpposition {
  const plan = combinaisonsValides([{ ...c, active: true, variantes: [v] }])[0];
  if (!plan || erreursVariante(c.phase, v).length) return { images: [], duree: 0, resultat: 'Corrige la variante avant de lancer l’opposition.' };
  const equipe = (adverse: boolean): Coequipier[] => ORDRE_MAILLOTS.map((poste, i) => ({
    ...(adverse ? undefined : effectif?.[i]), id: `exercice-${adverse ? 'defense' : 'attaque'}-${i + 1}`,
    nom: adverse ? `Défenseur ${i + 1}` : joueurs[i + 1] ?? `Joueur ${i + 1}`, poste,
    age: adverse ? 27 : effectif?.[i]?.age ?? 27, note: adverse ? 65 : effectif?.[i]?.note ?? 65,
    potentiel: adverse ? 65 : effectif?.[i]?.potentiel ?? 65,
    nation: adverse ? 'France' : effectif?.[i]?.nation ?? 'France', regen: adverse ? false : effectif?.[i]?.regen ?? false,
  }));
  const attaque = equipe(false), adversaires = equipe(true);
  const e = creerMatch('Ton XV', 'Opposition', attaque, adversaires, 0, 0,
    JSON.stringify([c.id, v, defense, essai]), undefined, { compositionA: attaque, compositionB: adversaires,
      tempsReel: true, scoreSurTerrain: true, tactiqueB: { attaque: 'equilibre', defense, rythme: 'normal', penalites: 'mixte', remplacements: 'standard' } });
  e.plansCombinaisons = { A: [plan] };
  e.commentaires = [];
  const origine = origineApercu(c);
  installerSituationCombinaison(e, c.phase, { x: origine.x + LIGNE_A, y: origine.y });
  const point = (p: Vec) => ({ x: p.x - LIGNE_A, y: p.y });
  const images: ImageOpposition[] = [];
  let fin: number | null = null, resultat = 'Fin de l’exercice', demarree = false;
  const prendreImage = () => {
    const t = extraireTerrain(e, e.sim * 1000);
    t.pions = t.pions.map(p => ({ ...p, x: p.x - LIGNE_A }));
    t.ballon = { ...t.ballon, ...point(t.ballon) };
    if (t.origine) t.origine = point(t.origine);
    if (t.arbitre) t.arbitre = { ...t.arbitre, x: t.arbitre.x - LIGNE_A };
    if (t.ligneAvantage !== undefined) t.ligneAvantage -= LIGNE_A;
    if (t.conquete?.reception) t.conquete = { ...t.conquete, reception: point(t.conquete.reception) };
    const vol = (v: NonNullable<TerrainDirect['vol']>) => ({ ...v, de: point(v.de), vers: point(v.vers) });
    if (t.vol) t.vol = vol(t.vol);
    if (t.volsRecents) t.volsRecents = t.volsRecents.map(vol);
    const attaque = e.pions.filter(p => p.cote === 'A'), defenseurs = e.pions.filter(p => p.cote === 'B');
    const plaquages = defenseurs.reduce((n, p) => n + p.stats.plaquages, 0);
    const libelle = e.commentaires.at(-1)?.texte ?? (c.phase === 'touche' ? 'Préparation du lancer' : c.phase === 'ruck' ? 'Préparation de la sortie du ruck' : 'Mise en place de la mêlée');
    images.push({ terrain: t, temps: e.sim, libelle,
      passes: attaque.reduce((n, p) => n + p.stats.passes, 0), plaquages,
      metres: Math.round(attaque.reduce((n, p) => n + p.stats.metres, 0)), etape: e.combinaisonEnCours?.index ?? null });
    if (e.combinaisonEnCours) { demarree = true; e.plansCombinaisons = {}; }
    if (fin === null) {
      if (plaquages) { fin = e.sim + 1.8; resultat = 'Porteur plaqué : la défense a arrêté l’action.'; }
      else if (e.possession === 'B') { fin = e.sim + 1.2; resultat = demarree ? 'Ballon perdu face à la défense.' : 'Conquête perdue : nouvel essai possible.'; }
      else if (e.scoreA > 0 || e.phase === 'aplatissage') { fin = e.sim + 1.8; resultat = 'L’attaque a atteint l’en-but.'; }
      else if (e.phase === 'penalite') { fin = e.sim + 1.2; resultat = 'Exercice arrêté par une faute.'; }
      else if (demarree && !e.combinaisonEnCours && e.phase !== 'jeuCourant' && e.phase !== 'ballonEnLAir') { fin = e.sim + 1.2; resultat = libelle; }
    }
  };
  prendreImage();
  while (e.sim < Math.min(fin ?? 45, 45) && !e.fini) { avancer(e, DT); prendreImage(); }
  if (fin === null) resultat = 'Fin de l’exercice : 45 secondes jouées.';
  return { images, duree: Math.round((images.at(-1)?.temps ?? 0) * 100) / 100, resultat };
}

/** La lecture reste fluide et réversible ; les contacts viennent des relevés du moteur. */
export function imageOppositionCombinaison(essai: EssaiOpposition, temps: number): ImageOpposition | undefined {
  const i = Math.min(essai.images.length - 1, Math.max(0, Math.floor(temps / DT + 1e-6)));
  const a = essai.images[i], b = essai.images[i + 1];
  if (!a || !b) return a;
  const k = Math.max(0, Math.min(1, (temps - a.temps) / DT));
  const suivant = new Map(b.terrain.pions.map(p => [p.id, p]));
  return { ...a, terrain: { ...a.terrain, simulation: temps,
    pions: a.terrain.pions.map(p => { const q = suivant.get(p.id); return q ? { ...p, x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k } : p; }),
    ballon: { ...a.terrain.ballon, x: a.terrain.ballon.x + (b.terrain.ballon.x - a.terrain.ballon.x) * k, y: a.terrain.ballon.y + (b.terrain.ballon.y - a.terrain.ballon.y) * k },
  } };
}
