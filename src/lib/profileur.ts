// LE PROFILEUR (Correctif 25, points 49 et 50) — ce que coûte un match en 3D sur CET appareil
//
// « Ajouter un profiler interne dans le Labo. Mesurer avant/après chaque optimisation. » Une optimisation qu'on ne mesure
// pas est une opinion : avant de toucher au rendu, il faut des chiffres pris sur l'appareil qui peine — pas sur celui du
// développeur. Le profileur s'allume dans le Labo (un réglage de CET appareil), s'affiche par-dessus un match en 3D, et
// garde un résumé de chaque match mesuré pour comparer deux séances.
//
// ⚠️ ÉTEINT, IL NE COÛTE RIEN : aucun écouteur, aucun minuteur ; la scène note deux horodatages par image, c'est tout.

/** Ce que rend `scene.mesures()` (voir `analyse-rn26/correctif_25_profileur.cjs`). */
export interface MesuresScene {
  images: number;
  /** Temps passé à dessiner une image, et écart entre deux images (ms, sur les 240 dernières). */
  rendu: { moyenne: number; p95: number; max: number };
  cpu?: { moyenne: number; p95: number; max: number };
  gpu?: { moyenne: number; p95: number; max: number };
  ecart: { moyenne: number; p95: number; max: number };
  ips: number;
  appels: number; triangles: number; geometries: number; textures: number;
  definition: number; largeur: number; hauteur: number; leger: boolean;
  /** Joueurs et officiels hors du champ de la caméra, non dessinés à cette image. */
  elagues?: number;
  /** La cadence visée : 0 = celle de l'écran, sinon 60 ou 30 ; `pas` : une image dessinée tous les `pas` appels de l'hôte. */
  cadence?: number; pas?: number;
  /** La définition au montage de la scène (elle baisse avant que la cadence ne soit réduite). */
  definitionDeDepart?: number;
  /** Images par seconde sur TOUT le match mesuré (pas seulement les 240 dernières images), et sa durée en secondes. */
  moyenneMatch?: number; dureeMesuree?: number;
}

/** Le résumé d'un match mesuré, gardé pour comparer « avant » et « après ». */
export interface SeanceProfilee {
  le: string;
  duree: number;
  ips: number; ecartMoyen: number; ecartP95: number; ecartMax: number; renduMoyen: number; renduP95: number;
  appels: number; triangles: number; geometries: number; textures: number;
  definition: number; largeur: number; hauteur: number; leger: boolean;
  /** Mémoire du tas JavaScript (Mo), quand le navigateur la donne. */
  memoire?: number;
  /** Requêtes `/api/` pendant le match, et leur poids sur le réseau (Ko). */
  requetes: number; reseau: number;
  /** Images par seconde sur tout le match, cadence visée à la fin (0 = celle de l'écran), plateforme et profil de l'appareil. */
  ipsMatch?: number; cadence?: number; plateforme?: string; profil?: string;
  note?: string;
  cpu?: number; gpu?: number; latence?: number; erreurs?: number;
}

export interface ReleveReseau { requetes: number; octets: number; latenceTotal: number; terminees: number; erreurs: number }
/** Installé seulement pour une séance du profileur. Une annulation volontaire n'est pas une erreur. */
export function observerReseau(compte: ReleveReseau): () => void {
  const origine = window.fetch;
  const enveloppe: typeof fetch = async (entree, options) => {
    const adresse = typeof entree === 'string' ? entree : entree instanceof URL ? entree.href : entree.url;
    if (!new URL(adresse, location.href).pathname.startsWith('/api/')) return origine.call(window, entree, options);
    const debut = performance.now();
    try {
      const r = await origine.call(window, entree, options);
      if (!r.ok) compte.erreurs++;
      return r;
    } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) compte.erreurs++; throw e; }
    finally { compte.latenceTotal += performance.now() - debut; compte.terminees++; }
  };
  window.fetch = enveloppe;
  return () => { if (window.fetch === enveloppe) window.fetch = origine; };
}

const CLE_ACTIF = 'destiny-rugby:profileur';
const CLE_SEANCES = 'destiny-rugby:profileur:seances';
const SEANCES_MAX = 12;

export function profileurActif(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(CLE_ACTIF) === '1'; } catch { return false; }
}
export function reglerProfileur(actif: boolean): void {
  try { if (actif) localStorage.setItem(CLE_ACTIF, '1'); else localStorage.removeItem(CLE_ACTIF); } catch { /* stockage refusé */ }
}
export function seancesProfilees(): SeanceProfilee[] {
  try { const l = JSON.parse(localStorage.getItem(CLE_SEANCES) ?? '[]') as SeanceProfilee[]; return Array.isArray(l) ? l : []; } catch { return []; }
}
export function garderSeance(seance: SeanceProfilee): void {
  try { localStorage.setItem(CLE_SEANCES, JSON.stringify([seance, ...seancesProfilees()].slice(0, SEANCES_MAX))); } catch { /* quota */ }
}
export function oublierLesSeances(): void {
  try { localStorage.removeItem(CLE_SEANCES); } catch { /* rien */ }
}
export function annoterSeance(le: string, note: string): void {
  try { localStorage.setItem(CLE_SEANCES, JSON.stringify(seancesProfilees().map((s) => (s.le === le ? { ...s, note: note.slice(0, 60) } : s)))); } catch { /* quota */ }
}

/** Le tas JavaScript en Mo (Chrome seulement). */
export function memoireJs(): number | undefined {
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return m ? Math.round(m.usedJSHeapSize / 1048576) : undefined;
}

/** Résume une séance à partir de la dernière lecture de la scène. */
export function resumerSeance(m: MesuresScene, debut: number, requetes: number, octets: number, appareil?: { plateforme: string; profil: string }, reseau?: ReleveReseau): SeanceProfilee {
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    le: new Date().toISOString(), duree: Math.round((Date.now() - debut) / 1000),
    ips: m.ecart.moyenne > 0 ? Math.round(1000 / m.ecart.moyenne) : m.ips,
    ecartMoyen: r1(m.ecart.moyenne), ecartP95: r1(m.ecart.p95), ecartMax: r1(m.ecart.max), renduMoyen: r1(m.rendu.moyenne), renduP95: r1(m.rendu.p95),
    appels: m.appels, triangles: m.triangles, geometries: m.geometries, textures: m.textures,
    definition: Math.round(m.definition * 100) / 100, largeur: m.largeur, hauteur: m.hauteur, leger: m.leger,
    memoire: memoireJs(), requetes, reseau: Math.round(octets / 1024),
    ...(m.moyenneMatch ? { ipsMatch: Math.round(m.moyenneMatch) } : {}), ...(m.cadence !== undefined ? { cadence: m.cadence } : {}),
    ...(appareil ? { plateforme: appareil.plateforme, profil: appareil.profil } : {}),
    cpu: m.cpu?.moyenne, gpu: m.gpu?.moyenne, latence: reseau?.terminees ? r1(reseau.latenceTotal / reseau.terminees) : undefined, erreurs: reseau?.erreurs,
  };
}
