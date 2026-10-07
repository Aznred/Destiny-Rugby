// LES STATISTIQUES D'UTILISATION — ce qu'on compte, et comment on l'agrège (Correctif 25, points 13 à 23)
//
// Demande : « savoir quels modes les gens utilisent vraiment et pendant combien de temps », dans le Labo, par onglets
// (Global, Collection solo, Carrière joueur, Carrière entraîneur, Carrières hors classement), avec la rétention.
//
// ═══ CE QU'ON ENVOIE, ET CE QU'ON N'ENVOIE PAS ═══════════════════════════════
//
// Les modes solo vivent dans le navigateur : le serveur n'en savait rien. Chaque appareil envoie donc, toutes les dix
// minutes de jeu au plus et quand l'onglet se ferme, un petit relevé (`EnvoiUsage`, quelques centaines d'octets) :
//
//   · un identifiant d'APPAREIL tiré au hasard — ni compte, ni pseudo, ni adresse ;
//   · les secondes passées dans chaque mode depuis le dernier relevé, et le nombre de sessions ouvertes ;
//   · des COMPTEURS déjà anonymes : « une carrière créée », « deux matchs joués », « un pack ouvert », le poste et le
//     club choisis, et — pour une carrière avec un joueur existant — le nom de ce joueur (une donnée du catalogue) ;
//   · la taille de la collection solo.
//
// Le serveur additionne (`usage_jours` : une ligne par appareil et par jour ; `usage_compteurs` : une ligne par jour
// et par compteur). Le Labo ne lit que des sommes : personne n'y est nommé.
//
// ⚠️ CE FICHIER TOURNE DES DEUX CÔTÉS (navigateur, serveur, banc) : ni DOM, ni base, ni horloge implicite.

import { validerCarrieres, type CarriereUsage, type DetailCarrieresUsage } from './carrieres.js';

export const MODES_USAGE = ['ligue', 'joueur', 'existant', 'entraineur', 'collection', 'autre'] as const;
export type ModeUsage = typeof MODES_USAGE[number];
export const LIBELLES_MODES: Record<ModeUsage, string> = {
  ligue: 'Ligue en ligne', joueur: 'Carrière joueur', existant: 'Joueur existant (hors classement)',
  entraineur: 'Carrière entraîneur', collection: 'Collection solo', autre: 'Menus et autres écrans',
};

/** Les familles de compteurs acceptées. Toute autre clé est refusée à l'entrée. */
const PREFIXES = ['carrieres', 'matchs', 'saisons', 'packs', 'collection', 'poste', 'club', 'incarne', 'sessions', 'obtenue', 'utilisee', 'fluidite'] as const;
const CLE_VALIDE = /^[a-z]+(\.[\p{L}\p{N} _'’-]{1,60}){1,2}$/u;

export interface CarteRareUsage { nom: string; rarete: 'elite' | 'star'; note: number; n: number }
export interface JaugesUsage { taille: number; exemplaires: number; packs: number; genEquipe?: number; rares?: CarteRareUsage[]; xv?: string[] }
export interface EnvoiUsage {
  appareil: string;
  /** Le jour UTC du relevé (`AAAA-MM-JJ`) et celui de la première visite de cet appareil. */
  jour: string;
  premier: string;
  /** Le mode joué en premier par cet appareil : sert à comparer la rétention selon la porte d'entrée. */
  modePremier: ModeUsage;
  secondes: Partial<Record<ModeUsage, number>>;
  sessions: number;
  compteurs: Record<string, number>;
  jauges?: JaugesUsage;
  carrieres?: CarriereUsage[];
}

const JOUR = /^\d{4}-\d{2}-\d{2}$/;
export const jourUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const decaler = (jour: string, jours: number) => jourUTC(Date.parse(`${jour}T00:00:00.000Z`) + jours * 86_400_000);
const entier = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max ? v : null);

/**
 * Ce que le serveur accepte d'un appareil. ⚠️ TOUT EST BORNÉ : ce point d'entrée n'est pas authentifié (les modes solo
 * n'ont pas de compte), n'importe qui peut donc y poster. Un jour ne peut pas durer plus de vingt-quatre heures, un
 * relevé ne peut pas dater d'il y a une semaine, et une clé inconnue n'entre pas. `null` : relevé refusé.
 */
export function validerEnvoi(brut: unknown, maintenant: number): EnvoiUsage | null {
  if (!brut || typeof brut !== 'object') return null;
  const b = brut as Record<string, unknown>;
  if (typeof b.appareil !== 'string' || !/^[0-9a-f-]{16,64}$/.test(b.appareil)) return null;
  if (typeof b.jour !== 'string' || !JOUR.test(b.jour) || typeof b.premier !== 'string' || !JOUR.test(b.premier)) return null;
  const aujourdhui = jourUTC(maintenant);
  // Un onglet resté ouvert après minuit envoie encore le relevé de la veille.
  if (b.jour !== aujourdhui && b.jour !== decaler(aujourdhui, -1)) return null;
  if (!Number.isFinite(Date.parse(b.premier)) || new Date(b.premier).toISOString().slice(0, 10) !== b.premier || b.premier > b.jour) return null;
  if (typeof b.modePremier !== 'string' || !MODES_USAGE.includes(b.modePremier as ModeUsage)) return null;
  const secondes: Partial<Record<ModeUsage, number>> = {};
  let total = 0;
  for (const [mode, valeur] of Object.entries((b.secondes ?? {}) as Record<string, unknown>)) {
    if (!MODES_USAGE.includes(mode as ModeUsage)) return null;
    const s = entier(valeur, 0, 3600);   // un relevé couvre dix minutes ; une heure laisse de la marge à un onglet endormi
    if (s === null) return null;
    if (s) { secondes[mode as ModeUsage] = s; total += s; }
  }
  if (total > 3600) return null;
  const sessions = entier(b.sessions ?? 0, 0, 5);
  if (sessions === null) return null;
  const compteurs: Record<string, number> = {};
  const entrees = Object.entries((b.compteurs ?? {}) as Record<string, unknown>);
  if (entrees.length > 40) return null;
  for (const [cle, valeur] of entrees) {
    if (!CLE_VALIDE.test(cle) || !PREFIXES.includes(cle.slice(0, cle.indexOf('.')) as typeof PREFIXES[number])) return null;
    const n = entier(valeur, 1, 3600);
    if (n === null) return null;
    compteurs[cle] = n;
  }
  let jauges: JaugesUsage | undefined;
  if (b.jauges && typeof b.jauges === 'object') {
    const j = b.jauges as Record<string, unknown>;
    const taille = entier(j.taille, 0, 200_000), exemplaires = entier(j.exemplaires, 0, 5_000_000), packs = entier(j.packs, 0, 1_000_000);
    if (taille === null || exemplaires === null || packs === null) return null;
    const gen = j.genEquipe === undefined ? undefined : entier(j.genEquipe, 0, 99);
    if (gen === null) return null;
    let rares: CarteRareUsage[] | undefined;
    if (j.rares !== undefined) {
      if (!Array.isArray(j.rares) || j.rares.length > 60) return null;
      rares = [];
      for (const valeur of j.rares) {
        if (!valeur || typeof valeur !== 'object') return null;
        const carte = valeur as CarteRareUsage;
        if (typeof carte.nom !== 'string' || !carte.nom.length || carte.nom.length > 60 || !['elite', 'star'].includes(carte.rarete)
          || entier(carte.note, 0, 99) === null || entier(carte.n, 1, 100_000) === null) return null;
        rares.push({ nom: carte.nom, rarete: carte.rarete, note: carte.note, n: carte.n });
      }
    }
    if (j.xv !== undefined && (!Array.isArray(j.xv) || j.xv.length !== 15 || j.xv.some(n => typeof n !== 'string' || !n.length || n.length > 60))) return null;
    jauges = { taille, exemplaires, packs, ...(gen !== undefined ? { genEquipe: gen } : {}), ...(rares ? { rares } : {}), ...(j.xv ? { xv: j.xv as string[] } : {}) };
  }
  const carrieres = b.carrieres === undefined ? undefined : validerCarrieres(b.carrieres, b.jour);
  if (carrieres === null) return null;
  return { appareil: b.appareil, jour: b.jour, premier: b.premier, modePremier: b.modePremier as ModeUsage, secondes, sessions, compteurs, ...(jauges ? { jauges } : {}), ...(carrieres ? { carrieres } : {}) };
}

// ── Ce que le stockage garde, et ce qu'il rend ──────────────────────────────

export interface LigneUsage {
  jour: string; appareil: string; premier: string; modePremier: ModeUsage;
  secondes: Partial<Record<ModeUsage, number>>; sessions: number; jauges?: JaugesUsage;
}
export interface CompteurUsage { jour: string; cle: string; n: number }

/** Ajoute un relevé à ce qui est déjà rangé pour cet appareil et ce jour. */
export function fusionnerEnvoi(lignes: LigneUsage[], compteurs: CompteurUsage[], envoi: EnvoiUsage): void {
  let ligne = lignes.find((l) => l.jour === envoi.jour && l.appareil === envoi.appareil);
  if (!ligne) { ligne = { jour: envoi.jour, appareil: envoi.appareil, premier: envoi.premier, modePremier: envoi.modePremier, secondes: {}, sessions: 0 }; lignes.push(ligne); }
  for (const [mode, s] of Object.entries(envoi.secondes) as [ModeUsage, number][]) ligne.secondes[mode] = Math.min(86_400, (ligne.secondes[mode] ?? 0) + s);
  ligne.sessions = Math.min(200, ligne.sessions + envoi.sessions);
  if (ligne.modePremier === 'autre' && envoi.modePremier !== 'autre') { ligne.modePremier = envoi.modePremier; ligne.premier = envoi.premier; }
  if (envoi.jauges) ligne.jauges = envoi.jauges;
  for (const [cle, n] of Object.entries(envoi.compteurs)) {
    const c = compteurs.find((x) => x.jour === envoi.jour && x.cle === cle);
    if (c) c.n += n; else compteurs.push({ jour: envoi.jour, cle, n });
  }
}

export type PeriodeUsage = 'jour' | '7' | '30' | 'tout';
/** Le premier jour d'une période (`null` : depuis toujours). */
export const debutPeriode = (periode: PeriodeUsage, aujourdhui: string): string | null =>
  periode === 'jour' ? aujourdhui : periode === '7' ? decaler(aujourdhui, -6) : periode === '30' ? decaler(aujourdhui, -29) : null;

/** La matière que le stockage rend pour une période : déjà sommée, jamais une ligne par appareil. */
export interface MatiereUsage {
  actifs: { jour: number; j7: number; j30: number; periode: number };
  parMode: { mode: ModeUsage; secondes: number; utilisateurs: number; joursActifs: number }[];
  sessions: number;
  compteurs: Record<string, number>;
  /** Les collections solo telles qu'elles sont aujourd'hui (dernier relevé de chaque appareil). */
  collections: { nombre: number; taille: number; exemplaires: number; packs: number; genEquipe?: number | null; rares?: CarteRareUsage[]; joueursXV?: LigneClassee[] };
  carrieres?: DetailCarrieresUsage;
  /** Par mode joué en premier : la cohorte, ceux qui sont revenus, et ceux qui ont eu le TEMPS de revenir. */
  retention: { mode: ModeUsage; cohorte: number; j1: number; j7: number; j30: number; mures1: number; mures7: number; mures30: number }[];
}

/** La même matière, calculée sur des lignes en mémoire (stockage local, banc). */
export function matiereDepuisLignes(lignes: readonly LigneUsage[], compteurs: readonly CompteurUsage[], periode: PeriodeUsage, aujourdhui: string): MatiereUsage {
  const debut = debutPeriode(periode, aujourdhui);
  const dans = (jour: string) => (debut === null || jour >= debut) && jour <= aujourdhui;
  const distincts = (depuis: string | null) => new Set(lignes.filter((l) => (depuis === null || l.jour >= depuis) && l.jour <= aujourdhui).map((l) => l.appareil)).size;
  const periodeLignes = lignes.filter((l) => dans(l.jour));
  const parMode = MODES_USAGE.map((mode) => {
    const avec = periodeLignes.filter((l) => (l.secondes[mode] ?? 0) > 0);
    return { mode, secondes: avec.reduce((s, l) => s + (l.secondes[mode] ?? 0), 0), utilisateurs: new Set(avec.map((l) => l.appareil)).size, joursActifs: avec.length };
  });
  const sommes: Record<string, number> = {};
  for (const c of compteurs) if (dans(c.jour)) sommes[c.cle] = (sommes[c.cle] ?? 0) + c.n;
  // La collection de chacun telle qu'elle est aujourd'hui : son dernier relevé qui en porte une.
  const dernieres = new Map<string, LigneUsage>();
  for (const l of [...lignes].sort((a, b) => a.jour.localeCompare(b.jour))) if (l.jour <= aujourdhui && l.jauges && l.jauges.packs > 0) dernieres.set(l.appareil, l);
  const coll = [...dernieres.values()].map((l) => l.jauges!);
  const moyenne = (f: (j: JaugesUsage) => number) => (coll.length ? coll.reduce((s, j) => s + f(j), 0) / coll.length : 0);
  // La rétention : les appareils arrivés dans la période, selon le mode par lequel ils sont entrés.
  const jours = new Map<string, Set<string>>();
  const entree = new Map<string, { premier: string; mode: ModeUsage }>();
  for (const l of lignes) {
    (jours.get(l.appareil) ?? jours.set(l.appareil, new Set()).get(l.appareil)!).add(l.jour);
    if (!entree.has(l.appareil) || entree.get(l.appareil)!.mode === 'autre') entree.set(l.appareil, { premier: l.premier, mode: l.modePremier });
  }
  const revenu = (appareil: string, premier: string, de: number, a: number) => { for (let k = de; k <= a; k++) if (jours.get(appareil)!.has(decaler(premier, k))) return true; return false; };
  const retention = MODES_USAGE.map((mode) => {
    const r = { mode, cohorte: 0, j1: 0, j7: 0, j30: 0, mures1: 0, mures7: 0, mures30: 0 };
    for (const [appareil, e] of entree) {
      if (e.mode !== mode || !dans(e.premier)) continue;
      r.cohorte++;
      // Une cohorte n'entre dans un taux que si elle a eu le temps de revenir : arrivée hier, elle ne dit rien du 7ᵉ jour.
      if (decaler(e.premier, 1) <= aujourdhui) { r.mures1++; if (revenu(appareil, e.premier, 1, 1)) r.j1++; }
      if (decaler(e.premier, 7) <= aujourdhui) { r.mures7++; if (revenu(appareil, e.premier, 7, 13)) r.j7++; }
      if (decaler(e.premier, 30) <= aujourdhui) { r.mures30++; if (revenu(appareil, e.premier, 30, 36)) r.j30++; }
    }
    return r;
  }).filter((r) => r.cohorte > 0);
  return {
    actifs: { jour: distincts(aujourdhui), j7: distincts(decaler(aujourdhui, -6)), j30: distincts(decaler(aujourdhui, -29)), periode: new Set(periodeLignes.map((l) => l.appareil)).size },
    parMode, sessions: periodeLignes.reduce((s, l) => s + l.sessions, 0), compteurs: sommes,
    collections: { nombre: coll.length, taille: moyenne((j) => j.taille), exemplaires: moyenne((j) => j.exemplaires), packs: moyenne((j) => j.packs),
      genEquipe: coll.some(j => j.genEquipe !== undefined) ? coll.filter(j => j.genEquipe !== undefined).reduce((s, j) => s + j.genEquipe!, 0) / coll.filter(j => j.genEquipe !== undefined).length : null,
      rares: agregerCartesRares(coll.flatMap(j => j.rares ?? [])), joueursXV: agregerJoueursXV(coll.flatMap(j => j.xv ?? [])) },
    retention,
  };
}

// ── Ce que le Labo affiche ──────────────────────────────────────────────────

export interface LigneClassee { nom: string; n: number; matchs?: number; secondes?: number }
export function agregerJoueursXV(noms: readonly string[]): LigneClassee[] {
  const comptes = new Map<string, number>();
  for (const nom of noms) comptes.set(nom, (comptes.get(nom) ?? 0) + 1);
  return [...comptes].map(([nom, n]) => ({ nom, n })).sort((a, b) => b.n - a.n || a.nom.localeCompare(b.nom, 'fr')).slice(0, 20);
}
export function agregerCartesRares(cartes: readonly CarteRareUsage[]): CarteRareUsage[] {
  const parNom = new Map<string, CarteRareUsage>();
  for (const c of cartes) { const cle = `${c.rarete}:${c.nom}`; const ancienne = parNom.get(cle); parNom.set(cle, { ...c, note: Math.max(ancienne?.note ?? 0, c.note), n: (ancienne?.n ?? 0) + c.n }); }
  return [...parNom.values()].sort((a, b) => (a.rarete === b.rarete ? b.note - a.note || a.n - b.n : a.rarete === 'star' ? -1 : 1)).slice(0, 20);
}
export interface StatistiquesUsage {
  periode: PeriodeUsage;
  global: {
    actifsJour: number; actifs7: number; actifs30: number; actifsPeriode: number;
    sessions: number; dureeSession: number; tempsParUtilisateur: number; tempsTotal: number; matchs: number;
    modes: { mode: ModeUsage; libelle: string; secondes: number; part: number; utilisateurs: number }[];
  };
  collection: { commencees: number; actifs: number; packs: number; packsParJoueur: number; tailleMoyenne: number; exemplairesMoyens: number;
    packsMoyensParCollection: number; temps: number; tempsParJoueur: number; joursActifsParJoueur: number };
  joueur: { creees: number; existantes: number; actifs: number; matchs: number; saisons: number; temps: number; tempsParCarriere: number;
    matchsParCarriere: number; postes: LigneClassee[]; clubs: LigneClassee[] };
  comparaison: { type: 'cree' | 'existant'; libelle: string; creations: number; utilisateurs: number; temps: number; tempsParCarriere: number; matchs: number; matchsParCarriere: number; saisons: number; saisonsParCarriere: number; j7: number | null }[];
  horsClassement: { total: number; matchs: number; matchsMoyens: number; temps: number; saisons: number; saisonsMoyennes: number; top: LigneClassee[] };
  entraineur: { creees: number; actifs: number; saisons: number; temps: number; tempsParUtilisateur: number };
  retention: { mode: ModeUsage; libelle: string; cohorte: number; j1: number | null; j7: number | null; j30: number | null }[];
  details: { carrieres?: DetailCarrieresUsage; genEquipe: number | null; rares: CarteRareUsage[]; obtenues: LigneClassee[]; utilisees: LigneClassee[]; joueursXV: LigneClassee[];
    sessions: Partial<Record<ModeUsage, { nombre: number; moyenne: number; parJoueur: number }>>; fluidite: LigneClassee[] };
}

const taux = (n: number, sur: number): number | null => (sur > 0 ? n / sur : null);
const div = (a: number, b: number) => (b > 0 ? a / b : 0);

/** Met la matière en forme pour l'écran. Aucune requête ici : tout sort de ce que le stockage a rendu. */
export function assemblerStatistiques(m: MatiereUsage, periode: PeriodeUsage): StatistiquesUsage {
  const c = (cle: string) => m.compteurs[cle] ?? 0;
  const mode = (id: ModeUsage) => m.parMode.find((x) => x.mode === id) ?? { mode: id, secondes: 0, utilisateurs: 0, joursActifs: 0 };
  const total = m.parMode.reduce((s, x) => s + x.secondes, 0);
  const classer = (prefixe: string, limite: number): LigneClassee[] => Object.entries(m.compteurs)
    .filter(([cle]) => cle.startsWith(prefixe) && cle.indexOf('.', prefixe.length) < 0)
    .map(([cle, n]) => ({ nom: cle.slice(prefixe.length), n })).sort((a, b) => b.n - a.n || a.nom.localeCompare(b.nom)).slice(0, limite);
  const r = (id: ModeUsage) => m.retention.find((x) => x.mode === id);
  const creees = c('carrieres.cree'), existantes = c('carrieres.existant');
  const bilan = (type: 'cree' | 'existant') => m.carrieres?.bilans.find(b => b.type === type && b.nombre > 0);
  const bilansJoueur = m.carrieres?.bilans.filter(b => b.type !== 'entraineur') ?? [];
  const suivies = bilansJoueur.reduce((s, b) => s + b.nombre, 0);
  const moyenneJoueur = (cle: 'secondes' | 'matchs') => suivies ? bilansJoueur.reduce((s, b) => s + b[cle] * b.nombre, 0) / suivies : undefined;
  const ligne = (type: 'cree' | 'existant', id: ModeUsage, libelle: string, creations: number) => ({
    type, libelle, creations, utilisateurs: mode(id).utilisateurs, temps: mode(id).secondes, tempsParCarriere: bilan(type)?.secondes ?? div(mode(id).secondes, creations),
    matchs: c(`matchs.${type}`), matchsParCarriere: bilan(type)?.matchs ?? div(c(`matchs.${type}`), creations), saisons: c(`saisons.${type}`), saisonsParCarriere: bilan(type)?.saisons ?? div(c(`saisons.${type}`), creations),
    j7: r(id) ? taux(r(id)!.j7, r(id)!.mures7) : null,
  });
  return {
    periode,
    global: {
      actifsJour: m.actifs.jour, actifs7: m.actifs.j7, actifs30: m.actifs.j30, actifsPeriode: m.actifs.periode,
      sessions: m.sessions, dureeSession: div(total, m.sessions), tempsParUtilisateur: div(total, m.actifs.periode), tempsTotal: total,
      matchs: c('matchs.cree') + c('matchs.existant') + c('matchs.entraineur') + c('matchs.ligue'),
      modes: m.parMode.map((x) => ({ mode: x.mode, libelle: LIBELLES_MODES[x.mode], secondes: x.secondes, part: div(x.secondes, total), utilisateurs: x.utilisateurs }))
        .sort((a, b) => b.secondes - a.secondes),
    },
    collection: {
      commencees: c('collection.debut'), actifs: mode('collection').utilisateurs, packs: c('packs.solo'), packsParJoueur: div(c('packs.solo'), mode('collection').utilisateurs),
      tailleMoyenne: m.collections.taille, exemplairesMoyens: m.collections.exemplaires, packsMoyensParCollection: m.collections.packs,
      temps: mode('collection').secondes, tempsParJoueur: div(mode('collection').secondes, mode('collection').utilisateurs),
      joursActifsParJoueur: div(mode('collection').joursActifs, mode('collection').utilisateurs),
    },
    joueur: {
      creees, existantes, actifs: mode('joueur').utilisateurs + mode('existant').utilisateurs, matchs: c('matchs.cree') + c('matchs.existant'),
      saisons: c('saisons.cree') + c('saisons.existant'), temps: mode('joueur').secondes + mode('existant').secondes,
      tempsParCarriere: moyenneJoueur('secondes') ?? div(mode('joueur').secondes + mode('existant').secondes, creees + existantes),
      matchsParCarriere: moyenneJoueur('matchs') ?? div(c('matchs.cree') + c('matchs.existant'), creees + existantes), postes: classer('poste.', 15), clubs: classer('club.', 15),
    },
    comparaison: [ligne('cree', 'joueur', 'Joueur créé', creees), ligne('existant', 'existant', 'Joueur existant', existantes)],
    horsClassement: {
      total: existantes, matchs: c('matchs.existant'), matchsMoyens: bilan('existant')?.matchs ?? div(c('matchs.existant'), existantes), temps: mode('existant').secondes,
      saisons: c('saisons.existant'), saisonsMoyennes: bilan('existant')?.saisons ?? div(c('saisons.existant'), existantes),
      top: classer('incarne.', 20).map((l) => ({ ...l, matchs: c(`incarne.${l.nom}.matchs`), secondes: c(`incarne.${l.nom}.secondes`) })),
    },
    entraineur: { creees: c('carrieres.entraineur'), actifs: mode('entraineur').utilisateurs, saisons: c('saisons.entraineur'), temps: mode('entraineur').secondes,
      tempsParUtilisateur: div(mode('entraineur').secondes, mode('entraineur').utilisateurs) },
    retention: m.retention.map((x) => ({ mode: x.mode, libelle: LIBELLES_MODES[x.mode], cohorte: x.cohorte, j1: taux(x.j1, x.mures1), j7: taux(x.j7, x.mures7), j30: taux(x.j30, x.mures30) })),
    details: { carrieres: m.carrieres, genEquipe: m.collections.genEquipe ?? null, rares: m.collections.rares ?? [], joueursXV: m.collections.joueursXV ?? [], obtenues: classer('obtenue.', 20), utilisees: classer('utilisee.', 20),
      sessions: Object.fromEntries(MODES_USAGE.map(id => [id, { nombre: c(`sessions.${id}`), moyenne: div(mode(id).secondes, c(`sessions.${id}`)), parJoueur: div(c(`sessions.${id}`), mode(id).utilisateurs) }])),
      fluidite: Object.entries(m.compteurs).filter(([cle]) => cle.startsWith('fluidite.')).map(([cle, n]) => ({ nom: cle.slice(9), n })) },
  };
}
