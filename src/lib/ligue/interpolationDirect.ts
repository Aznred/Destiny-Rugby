import { LARGEUR, LONGUEUR, borner, type Vec } from '../moteur/terrain.js';
import type { PionDirect, TerrainDirect, VolDirect } from './matchCarriere.js';

/** Position dessinée du ballon, hauteur comprise. */
export interface BallonAfficheDirect extends Vec { h: number }

/** Une image reconstruite entre deux relevés du serveur. */
export interface ImageDirect {
  pions: Map<string, Vec>;
  ballon: BallonAfficheDirect;
}

const borner01 = (n: number): number => borner(n, 0, 1);
const melanger = (a: number, b: number, u: number): number => a + (b - a) * u;
const PHASES_REPLACEMENT_BALLON = new Set([
  'melee', 'touche', 'coupEnvoi', 'renvoi22', 'tirAuBut', 'transformation',
]);

/** Courbe sans à-coup, mais qui reste strictement entre son départ et son arrivée. */
export function adoucirDirect(u: number): number {
  const t = borner01(u);
  return t * t * (3 - 2 * t);
}

/**
 * Spline d'Hermite entre deux positions et leurs vitesses.
 *
 * Elle n'est employée que pour un mouvement continu et plausible. Une reprise,
 * un changement de phase ou un onglet revenu de l'arrière-plan passe par une
 * transition bornée : une tangente vieille de plusieurs secondes ne peut donc
 * plus envoyer un joueur faire une boucle ou traverser le terrain.
 */
function hermite(p0: number, v0: number, p1: number, v1: number, u: number, dt: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0
    + (u3 - 2 * u2 + u) * dt * v0
    + (-2 * u3 + 3 * u2) * p1
    + (u3 - u2) * dt * v1;
}

function positionPion(a: PionDirect, b: PionDirect, u: number, dtSim: number): Vec {
  const t = borner01(u);
  const doux = adoucirDirect(t);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const vitesseA = Math.hypot(a.vx, a.vy);
  const vitesseB = Math.hypot(b.vx, b.vy);
  const continu = dtSim > 0 && dtSim <= 6
    && distance <= Math.max(5, dtSim * 12 + 2)
    && vitesseA <= 13 && vitesseB <= 13;

  if (!continu) {
    return {
      x: borner(melanger(a.x, b.x, doux), 0, LONGUEUR),
      y: borner(melanger(a.y, b.y, doux), 0, LARGEUR),
    };
  }

  const x = hermite(a.x, a.vx, b.x, b.vx, t, dtSim);
  const y = hermite(a.y, a.vy, b.y, b.vy, t, dtSim);
  // Une relance peut inverser les deux vitesses dans le même intervalle. La
  // marge garde un vrai arrondi de course, sans autoriser une boucle visible.
  const marge = Math.min(2.5, 0.6 + distance * 0.12);
  return {
    x: borner(x, Math.max(0, Math.min(a.x, b.x) - marge), Math.min(LONGUEUR, Math.max(a.x, b.x) + marge)),
    y: borner(y, Math.max(0, Math.min(a.y, b.y) - marge), Math.min(LARGEUR, Math.max(a.y, b.y) + marge)),
  };
}

/**
 * Trajectoire purement visuelle d'un ballon. Le serveur fixe toujours les deux
 * extrémités et la durée ; la graine ne choisit qu'une légère courbure stable.
 * Deux spectateurs dessinent donc exactement la même passe.
 */
export function positionVol(vol: VolDirect, kBrut: number): BallonAfficheDirect {
  const k = borner01(kBrut);
  const dx = vol.vers.x - vol.de.x;
  const dy = vol.vers.y - vol.de.y;
  const distance = Math.hypot(dx, dy);
  const signe = ((vol.seed ?? 0) & 1) === 0 ? 1 : -1;
  const amplitude = vol.seed === undefined ? 0 : vol.type === 'pied'
    ? Math.min(1.8, distance * 0.018)
    : Math.min(0.42, distance * 0.022);
  const courbe = distance > 0.01 ? Math.sin(Math.PI * k) * amplitude * signe : 0;
  return {
    x: melanger(vol.de.x, vol.vers.x, k) - (dy / Math.max(0.01, distance)) * courbe,
    y: melanger(vol.de.y, vol.vers.y, k) + (dx / Math.max(0.01, distance)) * courbe,
    h: Math.max(0, vol.hauteur * Math.sin(Math.PI * k)),
  };
}

/** Positions continues des joueurs, identifiées par leur identifiant stable. */
export function interpolerPionsDirect(a: TerrainDirect, b: TerrainDirect, u: number, dtSim: number): Map<string, Vec> {
  const resultat = new Map<string, Vec>();
  const parId = new Map(b.pions.map((p) => [p.id, p]));
  for (const p0 of a.pions) {
    const p1 = parId.get(p0.id);
    resultat.set(p0.id, p1
      ? positionPion(p0, p1, u, dtSim)
      : { x: p0.x, y: p0.y });
  }
  // Un remplaçant n'apparaît qu'au terme de la transition. Le composant le
  // dessine avec le second relevé, jamais au milieu de l'action précédente.
  if (u >= 1) {
    for (const p1 of b.pions) if (!resultat.has(p1.id)) resultat.set(p1.id, { x: p1.x, y: p1.y });
  }
  return resultat;
}

/** Position exacte du ballon dans un relevé isolé. */
export function ballonAuReleve(t: TerrainDirect, pions: Map<string, Vec>, avance = 0): BallonAfficheDirect {
  if (t.vol) {
    const k = borner01((t.vol.ecoule + avance) / Math.max(0.01, t.vol.duree));
    return positionVol(t.vol, k);
  }
  if (t.porteurId) {
    const p = pions.get(t.porteurId);
    const donnees = t.pions.find((joueur) => joueur.id === t.porteurId);
    if (p) {
      const sens = donnees?.cote === 'exterieur' ? -1 : 1;
      return { x: p.x + sens * 0.92, y: p.y + 0.42, h: 0.18 };
    }
  }
  return { x: t.ballon.x, y: t.ballon.y, h: Math.max(0, t.ballon.hauteur ?? 0) };
}

function memeVol(a?: VolDirect, b?: VolDirect): boolean {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  const proche = (x: number, y: number) => Math.abs(x - y) < 0.08;
  return proche(a.de.x, b.de.x) && proche(a.de.y, b.de.y)
    && proche(a.vers.x, b.vers.x) && proche(a.vers.y, b.vers.y)
    && proche(a.duree, b.duree) && a.type === b.type && a.intention === b.intention;
}

function ballonSurJoueur(
  id: string,
  a: TerrainDirect,
  b: TerrainDirect,
  pions: Map<string, Vec>,
): BallonAfficheDirect | null {
  const p = pions.get(id);
  if (!p) return null;
  const donnees = b.pions.find((joueur) => joueur.id === id)
    ?? a.pions.find((joueur) => joueur.id === id);
  const sens = donnees?.cote === 'exterieur' ? -1 : 1;
  return { x: p.x + sens * 0.92, y: p.y + 0.42, h: 0.18 };
}

/**
 * Rejoue les actions très courtes conservées par le serveur. Entre deux
 * passes, le ballon reste dans les mains du bon joueur au lieu de parcourir
 * lentement en deux secondes un trajet qui n'en a pris que trois dixièmes.
 */
function ballonDepuisVolsRecents(
  a: TerrainDirect,
  b: TerrainDirect,
  pions: Map<string, Vec>,
  u: number,
): BallonAfficheDirect | null {
  const debutImage = a.instantJeu ?? a.horloge * 60;
  const finImage = b.instantJeu ?? b.horloge * 60;
  if (finImage <= debutImage) return null;
  const instant = melanger(debutImage, finImage, borner01(u));
  const uniques = new Map<string, VolDirect>();
  for (const vol of [...(a.volsRecents ?? []), ...(b.volsRecents ?? [])]) {
    if (vol.debut === undefined || vol.fin === undefined) continue;
    const id = vol.id ?? `${vol.debut}:${vol.auteurId ?? '-'}:${vol.receveurId ?? '-'}`;
    uniques.set(id, vol);
  }
  const vols = [...uniques.values()]
    .filter((vol) => (vol.fin ?? -Infinity) >= debutImage && (vol.debut ?? Infinity) <= finImage)
    .sort((x, y) => (x.debut ?? 0) - (y.debut ?? 0));
  if (!vols.length) return null;

  const actif = vols.find((vol) => instant >= (vol.debut ?? Infinity) && instant <= (vol.fin ?? -Infinity));
  if (actif) return positionVol(actif, (instant - actif.debut!) / Math.max(0.01, actif.duree));

  const passes = vols.filter((vol) => vol.type === 'passe');
  const terminees = passes.filter((vol) => (vol.fin ?? Infinity) < instant && vol.receveurId);
  const derniere = terminees[terminees.length - 1];
  if (derniere?.receveurId) {
    const tenu = ballonSurJoueur(derniere.receveurId, a, b, pions);
    if (tenu) return tenu;
  }
  const suivante = passes.find((vol) => (vol.debut ?? -Infinity) > instant && vol.auteurId);
  return suivante?.auteurId ? ballonSurJoueur(suivante.auteurId, a, b, pions) : null;
}

/**
 * Ballon continu entre deux relevés.
 *
 * Une passe dure souvent moins que les deux secondes séparant deux réponses du
 * serveur. Si les deux relevés ne contiennent pas le même vol, on reconstruit
 * ce trajet entre leurs positions exactes au lieu de changer de porteur à
 * mi-chemin. Les deux extrémités coïncident donc toujours avec la vérité du
 * moteur et le ballon ne peut plus se téléporter.
 */
export function interpolerBallonDirect(
  a: TerrainDirect,
  b: TerrainDirect,
  pions: Map<string, Vec>,
  u: number,
): BallonAfficheDirect {
  const t = borner01(u);
  // Si le vol du relevé précédent n'avait pas encore touché le sol, on poursuit sa descente
  if (a.vol && !b.vol && a.vol.ecoule < a.vol.duree) {
    const reste = a.vol.duree - a.vol.ecoule;
    const ecoule = a.vol.ecoule + t * (reste + 0.15);
    if (ecoule <= a.vol.duree) {
      return positionVol(a.vol, borner01(ecoule / a.vol.duree));
    }
  }

  // Quand l'arbitre replace le ballon pour une conquête, une transformation
  // ou un engagement, on ne dessine pas un faux coup de pied lent à travers le
  // terrain. La balle reste au lieu de l'action, puis rejoint son nouveau point
  // au sol pendant la fin de transition, en quelques images fluides.
  const replacement = a.phase !== b.phase && !b.vol && PHASES_REPLACEMENT_BALLON.has(b.phase);
  if (replacement) {
    const debut = a.vol
      ? { x: a.vol.vers.x, y: a.vol.vers.y, h: 0 }
      : ballonAuReleve(a, new Map(a.pions.map((p) => [p.id, { x: p.x, y: p.y }])));
    const fin = ballonAuReleve(b, new Map(b.pions.map((p) => [p.id, { x: p.x, y: p.y }])));
    const k = adoucirDirect(borner01((t - 0.72) / 0.28));
    return { x: melanger(debut.x, fin.x, k), y: melanger(debut.y, fin.y, k), h: melanger(debut.h, fin.h, k) };
  }
  const recent = ballonDepuisVolsRecents(a, b, pions, t);
  if (recent) return recent;
  if (a.vol && b.vol && memeVol(a.vol, b.vol)) {
    const vol: TerrainDirect = {
      ...a,
      vol: { ...a.vol, ecoule: melanger(a.vol.ecoule, b.vol!.ecoule, t) },
    };
    return ballonAuReleve(vol, pions);
  }
  if (a.porteurId && a.porteurId === b.porteurId) return ballonAuReleve(a, pions);

  const depart = ballonAuReleve(a, new Map(a.pions.map((p) => [p.id, { x: p.x, y: p.y }])));
  const arrivee = ballonAuReleve(b, new Map(b.pions.map((p) => [p.id, { x: p.x, y: p.y }])));
  const doux = adoucirDirect(t);
  const distance = Math.hypot(arrivee.x - depart.x, arrivee.y - depart.y);
  const volManque = !a.vol || !b.vol;
  const coupDePied = a.vol?.type === 'pied' || b.vol?.type === 'pied';
  const arche = volManque && distance > 2
    ? (coupDePied ? Math.min(3.8, distance * 0.11) : Math.min(0.12, distance * 0.006)) * Math.sin(Math.PI * t)
    : 0;
  // Même si une passe entière a eu lieu entre deux relevés, elle garde une
  // courbe cohérente en vue de dessus au lieu de couper le terrain au cordeau.
  const dx = arrivee.x - depart.x;
  const dy = arrivee.y - depart.y;
  const signe = ((a.snapshot ?? 0) + (b.snapshot ?? 0)) % 2 === 0 ? 1 : -1;
  const courbe = volManque && distance > 2
    ? (coupDePied ? Math.min(1.8, distance * 0.025) : Math.min(0.4, distance * 0.02)) * Math.sin(Math.PI * t) * signe
    : 0;
  return {
    x: melanger(depart.x, arrivee.x, doux) - (dy / Math.max(0.01, distance)) * courbe,
    y: melanger(depart.y, arrivee.y, doux) + (dx / Math.max(0.01, distance)) * courbe,
    h: Math.max(0, melanger(depart.h, arrivee.h, doux) + arche),
  };
}

/** Une image complète entre deux réponses du serveur. */
export function interpolerImageDirect(a: TerrainDirect, b: TerrainDirect, u: number, dtSim: number): ImageDirect {
  const pions = interpolerPionsDirect(a, b, u, dtSim);
  return { pions, ballon: interpolerBallonDirect(a, b, pions, u) };
}

/**
 * Absorbe la correction entre la position déjà dessinée et la nouvelle cible.
 *
 * L'interpolation serveur reconstruit le bon film, mais un paquet retardé peut
 * changer soudainement le couple de relevés utilisé. Cette dernière couche ne
 * modifie jamais la simulation : elle fait simplement rejoindre la nouvelle
 * vérité sur plusieurs images, à 60 FPS, plutôt que de téléporter les pions.
 */
export function amortirImageDirect(courante: ImageDirect | null, cible: ImageDirect, dt: number): ImageDirect {
  if (!courante || courante.pions.size === 0 || dt <= 0) return cible;
  const alphaPion = 1 - Math.exp(-14 * Math.min(dt, 0.1));
  const alphaBallon = 1 - Math.exp(-30 * Math.min(dt, 0.1));
  const pions = new Map<string, Vec>();
  for (const [id, destination] of cible.pions) {
    const depart = courante.pions.get(id);
    pions.set(id, depart ? {
      x: melanger(depart.x, destination.x, alphaPion),
      y: melanger(depart.y, destination.y, alphaPion),
    } : destination);
  }
  return {
    pions,
    ballon: {
      x: melanger(courante.ballon.x, cible.ballon.x, alphaBallon),
      y: melanger(courante.ballon.y, cible.ballon.y, alphaBallon),
      h: melanger(courante.ballon.h, cible.ballon.h, alphaBallon),
    },
  };
}

/** Projection de secours bornée lorsque le prochain relevé n'est pas encore arrivé. */
export function projeterImageDirect(t: TerrainDirect, secondesReelles: number): ImageDirect {
  const temps = borner(secondesReelles, 0, .7) * t.cadence;
  const avance = .45 * (1 - Math.exp(-temps / .45));
  const pions = new Map<string, Vec>();
  for (const p of t.pions) {
    pions.set(p.id, {
      x: borner(p.x + p.vx * avance, 0, LONGUEUR),
      y: borner(p.y + p.vy * avance, 0, LARGEUR),
    });
  }
  return { pions, ballon: ballonAuReleve(t, pions, avance) };
}

/** Métadonnées, gestes et possesseur sur LA MÊME horloge que la trajectoire. */
export function interpolerEtatDirect(a: TerrainDirect, b: TerrainDirect, u: number): TerrainDirect {
  const t = borner01(u);
  const courant = t < 1 ? a : b;
  const simulation = melanger(a.simulation ?? a.instantJeu ?? a.horloge * 60, b.simulation ?? b.instantJeu ?? b.horloge * 60, t);
  const instantJeu = melanger(a.instantJeu ?? a.horloge * 60, b.instantJeu ?? b.horloge * 60, t);
  const gestes = [...new Map([...(a.gestes ?? []), ...(b.gestes ?? [])].map((g) => [g.id, g])).values()]
    .filter((g) => simulation >= g.debut && simulation < g.debut + g.duree);
  const suivants = new Map(b.pions.map((p) => [p.id, p]));
  const pions = courant.pions.map((p) => {
    const fin = suivants.get(p.id) ?? p;
    return { ...p, vx: melanger(p.vx, fin.vx, t), vy: melanger(p.vy, fin.vy, t),
      corps: p.corps ? { ...p.corps, age: p.corps.age + Math.max(0, simulation - (courant.simulation ?? simulation)) } : undefined };
  });
  let porteurId = courant.porteurId;
  const vols = [...(a.volsRecents ?? []), ...(b.volsRecents ?? []), ...(a.vol ? [a.vol] : []), ...(b.vol ? [b.vol] : [])];
  const actif = vols.find((v) => v.debut !== undefined && v.fin !== undefined && instantJeu >= v.debut && instantJeu < v.fin);
  if (actif) porteurId = undefined;
  else {
    const dernier = vols.filter((v) => v.type === 'passe' && v.fin !== undefined && v.fin <= instantJeu)
      .sort((x, y) => y.fin! - x.fin!)[0];
    if (dernier && dernier.fin! >= (a.instantJeu ?? a.horloge * 60) && courant.phase === 'jeuCourant') porteurId = dernier.receveurId;
  }
  let arbitre = courant.arbitre;
  if (a.arbitre && b.arbitre) {
    const debut = a.arbitre, fin = b.arbitre;
    const delta = Math.atan2(Math.sin(fin.regard - debut.regard), Math.cos(fin.regard - debut.regard));
    arbitre = { x: melanger(debut.x, fin.x, t), y: melanger(debut.y, fin.y, t),
      vx: melanger(debut.vx, fin.vx, t), vy: melanger(debut.vy, fin.vy, t), regard: debut.regard + delta * t };
  }
  return { ...courant, pions, porteurId, gestes, simulation, instantJeu, arbitre,
    vol: actif ? { ...actif, ecoule: instantJeu - actif.debut! }
      : courant.vol?.fin !== undefined && courant.vol.fin <= instantJeu ? undefined : courant.vol,
    contact: a.contact ? { ...a.contact, progression: Math.min(1, a.contact.progression + Math.max(0, simulation - (a.simulation ?? simulation)) / 1.35) } : courant.contact,
    conquete: a.conquete && b.conquete?.type === a.conquete.type
      ? { ...a.conquete, progression: melanger(a.conquete.progression, b.conquete.progression, t) } : courant.conquete,
    preparationTir: a.preparationTir && b.preparationTir?.buteurId === a.preparationTir.buteurId
      ? { ...a.preparationTir, ...b.preparationTir, progression: melanger(a.preparationTir.progression, b.preparationTir.progression, t) } : courant.preparationTir,
  };
}
