// LE RELEVÉ D'UTILISATION, CÔTÉ NAVIGATEUR (Correctif 25, points 13 à 23)
//
// Ce module REGARDE le jeu sans s'y brancher : il s'abonne au store (l'écran affiché, la carrière en cours, la
// collection) et en déduit du temps par mode et quelques compteurs. La collection lui fournit seulement son catalogue
// déjà chargé ; il reste indépendant des actions et des règles de jeu.
//
// ⚠️ CE QUI PART EST ANONYME ET MINUSCULE (voir `agregats.ts`) : un identifiant d'appareil tiré au hasard, des secondes
// par mode, des compteurs. Un relevé au plus toutes les dix minutes de jeu, et un à la fermeture de l'onglet
// (`sendBeacon`). Rien ne part d'un onglet caché, rien ne part si le joueur n'a pas bougé depuis dix minutes.
// ⚠️ UN RELEVÉ PERDU EST PERDU. Pas de file d'attente, pas de reprise : ce sont des statistiques, pas une sauvegarde.
import { useGame } from '../../store/useGame';
import { estCarriereClassee } from '../carriereExistante';
import type { Ecran, Joueur, Manager } from '../../types';
import { jourUTC, type EnvoiUsage, type JaugesUsage, type ModeUsage } from './agregats';
import type { CarriereUsage } from './carrieres';
import { EVENEMENT_FLUIDITE, plateforme, type DetailFluidite } from '../profilAppareil';
import { EVENEMENT_SORTIE, releverFilInterrompu, type DetailSortie } from '../finMatch';
import { fusionnerJaugesCollection, jaugesCollection, nomCarteUsage } from './collection';
import { EVENEMENT_MATCHS_LIGUE, type DetailMatchsLigue } from './matchsLigue';

const CLE = 'destiny-rugby:usage';
const PAS = 15;                    // secondes entre deux relevés du mode affiché
const ENVOI = 600;                 // secondes de jeu entre deux envois
const INACTIF = 10 * 60_000;       // sans un geste depuis dix minutes, on ne compte plus
const NOUVELLE_SESSION = 30 * 60_000;

interface Memoire {
  appareil: string; premier: string; modePremier?: ModeUsage; jour: string;
  secondes: Partial<Record<ModeUsage, number>>; sessions: number; compteurs: Record<string, number>;
  dernierPas: number;
  carrieres?: CarriereUsage[];
  jauges?: JaugesUsage;
  /** Ce qu'on a déjà vu du store, pour ne compter que ce qui CHANGE. */
  vu: { carriere?: string; matchs?: number; saison?: number; entraineur?: string; saisonEntraineur?: number; matchsEntraineur?: number; packs?: number; matchsLigues?: Record<string, number> };
}

const nomSur = (s: string) => s.replace(/[^\p{L}\p{N} _'’-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
const neuve = (maintenant: number): Memoire => ({
  appareil: crypto.randomUUID(), premier: jourUTC(maintenant), jour: jourUTC(maintenant), secondes: {}, sessions: 0, compteurs: {}, dernierPas: 0, vu: {},
});

function lire(maintenant: number): Memoire {
  try {
    const m = JSON.parse(localStorage.getItem(CLE) ?? 'null') as Memoire | null;
    if (m && typeof m.appareil === 'string' && typeof m.premier === 'string') return { ...neuve(maintenant), ...m, vu: m.vu ?? {} };
  } catch { /* stockage refusé ou abîmé : on repart d'un appareil neuf */ }
  return neuve(maintenant);
}
const ranger = (m: Memoire) => { try { localStorage.setItem(CLE, JSON.stringify(m)); } catch { /* quota : tant pis */ } };

/** Le mode auquel appartient l'écran affiché. */
export function modeDeLEcran(ecran: Ecran, joueur: Joueur | null, manager: Manager | null): ModeUsage {
  if (ecran === 'carriereEnLigne') return 'ligue';
  if (ecran === 'collectionSolo') return 'collection';
  if (ecran === 'manager' || ecran === 'creationManager') return 'entraineur';
  if (['carriere', 'profil', 'effectif', 'tableau', 'social', 'finCarriere', 'creation', 'championnats'].includes(ecran)) {
    if (manager && !joueur) return 'entraineur';
    if (joueur) return estCarriereClassee(joueur) ? 'joueur' : 'existant';
    return ecran === 'creation' ? 'joueur' : 'autre';
  }
  return 'autre';
}

let demarre = false;
/** Lance le relevé. Sans effet hors d'un navigateur, et une seule fois. */
export function demarrerLeSuivi(): void {
  if (demarre || typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  demarre = true;
  try {
    let m = lire(Date.now());
    let dernierGeste = Date.now();
    let depuisEnvoi = 0;
    let dernierMode: ModeUsage | undefined;
    let quantitesVues: Record<string, number> | undefined;
    let derniereMesure = Date.now();
    let visible = !document.hidden;
    const geste = () => { dernierGeste = Date.now(); };
    for (const type of ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const) window.addEventListener(type, geste, { passive: true, capture: true });

    const compter = (cle: string, n = 1) => {
      if (n <= 0 || !cle.split('.').slice(1).every(Boolean)) return;
      // Un relevé reste borné même après une série de packs ou de nombreuses saisons.
      if (Object.keys(m.compteurs).length >= 38 && !m.compteurs[cle]) envoyer(false);
      if ((m.compteurs[cle] ?? 0) + n > 3600) envoyer(false);
      m.compteurs[cle] = Math.min(3600, (m.compteurs[cle] ?? 0) + n);
    };
    const instantane = (personne: Joueur | Manager, type: CarriereUsage['type']) => {
      m.carrieres ??= [];
      const cle = personne.usageId ?? (type === 'entraineur' ? m.vu.entraineur : m.vu.carriere);
      let c = m.carrieres.find(x => x.id === cle);
      // Vieille sauvegarde : une identité locale stable, adoptée sans compter une création.
      if (!c && !personne.usageId) c = m.carrieres.find(x => x.type === type && !x.fermee);
      if (!c) {
        if (m.carrieres.length >= 8) { envoyer(false); m.carrieres = m.carrieres.filter(x => !x.fermee).slice(-2); }
        c = { id: personne.usageId ?? crypto.randomUUID(), type, debut: personne.usageDebut ?? jourUTC(Date.now()), dernier: jourUTC(Date.now()),
          club: nomSur(personne.club), poste: type === 'entraineur' ? '' : (personne as Joueur).poste, matchs: 0, saisons: 0, secondes: 0, fermee: false };
        m.carrieres.push(c);
      }
      c.club = nomSur(personne.club);
      if (type !== 'entraineur') c.matchs = (personne as Joueur).matchsJoues;
      c.saisons = Math.max(0, personne.saison - 1);
      if (type === 'existant') c.incarne = nomSur(personne.nom);
      return c;
    };

    /** Ce que le store vient de changer : une carrière qui commence, un match de plus, une saison de plus, un pack ouvert. */
    const observer = (compterLesNouveautes: boolean) => {
      if (jourUTC(Date.now()) !== m.jour) { envoyer(false); m.jour = jourUTC(Date.now()); }
      const { joueur, manager, collectionSolo } = useGame.getState();
      const type = joueur ? (estCarriereClassee(joueur) ? 'cree' : 'existant') : undefined;
      const carriere = joueur ? joueur.usageId ?? `${joueur.nom}|${joueur.origine ? 'existant' : 'cree'}` : '';
      if (carriere !== (m.vu.carriere ?? '')) {
        if (compterLesNouveautes) for (const c of m.carrieres ?? []) if (c.type !== 'entraineur') c.fermee = true;
        // ⚠️ UNE CARRIÈRE NE SE COMPTE QUE SI ON LA VOIT NAÎTRE : aucun match joué, première saison. Une sauvegarde
        // rechargée ou reçue du coffre arrive avec ses matchs — on l'adopte sans la compter.
        if (compterLesNouveautes && joueur && type && joueur.matchsJoues === 0) {
          compter(`carrieres.${type}`); compter(`poste.${joueur.poste}`); compter(`club.${nomSur(joueur.club)}`);
          if (type === 'existant') compter(`incarne.${nomSur(joueur.nom)}`);
        }
        m.vu.carriere = carriere; m.vu.matchs = joueur?.matchsJoues ?? 0; m.vu.saison = joueur?.saison;
      } else if (joueur && type) {
        const matchs = joueur.matchsJoues - (m.vu.matchs ?? joueur.matchsJoues);
        if (compterLesNouveautes && matchs > 0 && matchs <= 100) { compter(`matchs.${type}`, matchs); if (type === 'existant') { compter(`incarne.${nomSur(joueur.nom)}.matchs`, matchs); compter(`utilisee.${nomSur(joueur.nom)}`, matchs); } }
        if (compterLesNouveautes && m.vu.saison !== undefined && joueur.saison === m.vu.saison + 1) compter(`saisons.${type}`);
        m.vu.matchs = joueur.matchsJoues; m.vu.saison = joueur.saison;
      }
      if (joueur && type) instantane(joueur, type);
      const entraineur = manager ? manager.usageId ?? manager.nom : '';
      if (entraineur !== (m.vu.entraineur ?? '')) {
        if (compterLesNouveautes) for (const c of m.carrieres ?? []) if (c.type === 'entraineur') c.fermee = true;
        if (compterLesNouveautes && manager && manager.saison <= 1) compter('carrieres.entraineur');
        m.vu.entraineur = entraineur; m.vu.saisonEntraineur = manager?.saison;
        m.vu.matchsEntraineur = manager ? Object.keys(manager.resultats).length : 0;
      } else if (manager) {
        if (compterLesNouveautes && m.vu.saisonEntraineur !== undefined && manager.saison === m.vu.saisonEntraineur + 1) compter('saisons.entraineur');
        m.vu.saisonEntraineur = manager.saison;
      }
      if (manager) {
        const c = instantane(manager, 'entraineur'), joues = Object.keys(manager.resultats).length;
        const ajout = Math.max(0, joues - (m.vu.matchsEntraineur ?? joues));
        if (compterLesNouveautes && ajout > 0 && ajout <= 100) { compter('matchs.entraineur', ajout); c.matchs += ajout; }
        else if (!compterLesNouveautes) c.matchs = Math.max(c.matchs, joues);
        m.vu.matchsEntraineur = joues;
      }
      if (collectionSolo?.quantites !== quantitesVues) {
        if (compterLesNouveautes && quantitesVues) for (const [id, n] of Object.entries(collectionSolo?.quantites ?? {})) {
          const gain = n - (quantitesVues[id] ?? 0), nom = nomCarteUsage(id);
          if (gain > 0 && gain <= 100 && nom) compter(`obtenue.${nomSur(nom)}`, gain);
        }
        quantitesVues = collectionSolo?.quantites;
      }
      const packs = Object.values(collectionSolo?.packsOuverts ?? {}).reduce((s, n) => s + n, 0);
      if (m.vu.packs !== undefined && compterLesNouveautes) {
        const ouverts = packs - m.vu.packs;
        if (ouverts > 0 && ouverts <= 30) { compter('packs.solo', ouverts); if (m.vu.packs === 0) compter('collection.debut'); }
      }
      m.vu.packs = packs;
    };

    const jauges = (): JaugesUsage | undefined => {
      const c = useGame.getState().collectionSolo;
      if (!c) return undefined;
      const j = jaugesCollection(c);
      if (j.packs <= 0) return undefined;
      // Avant que le catalogue ait été chargé, garder le dernier résumé connu.
      m.jauges = fusionnerJaugesCollection(m.jauges, j);
      return m.jauges;
    };

    /** Le relevé à envoyer, ou `null` s'il n'y a rien à dire. */
    const releve = (): EnvoiUsage | null => {
      const total = Object.values(m.secondes).reduce((s, n) => s + (n ?? 0), 0);
      if (!total && !m.sessions && !Object.keys(m.compteurs).length) return null;
      const j = jauges();
      return { appareil: m.appareil, jour: m.jour, premier: m.premier, modePremier: m.modePremier ?? 'autre', secondes: m.secondes, sessions: m.sessions, compteurs: m.compteurs, ...(j ? { jauges: j } : {}), ...(m.carrieres?.length ? { carrieres: m.carrieres } : {}) };
    };
    const vider = () => { m.secondes = {}; m.sessions = 0; m.compteurs = {}; depuisEnvoi = 0; ranger(m); };
    const envoyer = (enFermant: boolean) => {
      const r = releve();
      if (!r) return;
      const corps = JSON.stringify({ action: 'usage', releve: r });
      vider();
      try {
        const accepte = enFermant && navigator.sendBeacon?.('/api/carriere?action=usage', new Blob([corps], { type: 'application/json' }));
        if (!accepte) void fetch('/api/carriere?action=usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corps, keepalive: true }).catch(() => {});
      } catch { /* jamais d'erreur visible pour une statistique */ }
    };

    const pas = (enFermant = false, etat = useGame.getState()) => {
      const maintenant = Date.now();
      const secondes = Math.max(0, Math.floor(Math.min(PAS, (maintenant - derniereMesure) / 1000)));
      derniereMesure = maintenant;
      if ((!enFermant && document.hidden) || !visible || maintenant - dernierGeste > INACTIF || !secondes) return;
      // Un nouveau jour : le relevé de la veille part d'abord, entier.
      if (jourUTC(maintenant) !== m.jour) { envoyer(false); m.jour = jourUTC(maintenant); }
      const nouvelleSession = maintenant - m.dernierPas > NOUVELLE_SESSION;
      if (nouvelleSession) { if (m.sessions >= 5) envoyer(false); m.sessions += 1; }
      m.dernierPas = maintenant;
      const { ecran, joueur, manager } = etat;
      const mode = modeDeLEcran(ecran, joueur, manager);
      // Le premier VRAI mode joué (pas les menus) : c'est la porte d'entrée de cet appareil.
      if (!m.modePremier && mode !== 'autre') { m.modePremier = mode; m.premier = jourUTC(maintenant); }
      if (mode !== dernierMode || nouvelleSession) compter(`sessions.${mode}`);
      dernierMode = mode;
      m.secondes[mode] = (m.secondes[mode] ?? 0) + secondes;
      if (mode === 'existant' && joueur) compter(`incarne.${nomSur(joueur.nom)}.secondes`, secondes);
      const c = mode === 'joueur' || mode === 'existant' ? joueur && instantane(joueur, mode === 'joueur' ? 'cree' : 'existant')
        : mode === 'entraineur' ? manager && instantane(manager, 'entraineur') : undefined;
      if (c) { c.secondes += secondes; c.dernier = jourUTC(maintenant); if (ecran === 'finCarriere') c.fermee = true; }
      depuisEnvoi += secondes;
      ranger(m);
      if (depuisEnvoi >= ENVOI) envoyer(false);
    };

    // ⚠️ ON N'OBSERVE QU'APRÈS LA RELECTURE DE LA SAUVEGARDE : sinon la carrière rechargée au démarrage passerait pour
    // une carrière créée à chaque visite.
    const brancher = () => {
      observer(false);
      window.addEventListener(EVENEMENT_MATCHS_LIGUE, ((e: CustomEvent<DetailMatchsLigue>) => { try {
        const { cle, nombre } = e.detail;
        if (typeof cle !== 'string' || cle.length > 200 || !Number.isInteger(nombre) || nombre < 0 || nombre > 5000) return;
        if (jourUTC(Date.now()) !== m.jour) { envoyer(false); m.jour = jourUTC(Date.now()); }
        const vues = m.vu.matchsLigues ??= {}, avant = vues[cle];
        if (avant !== undefined && nombre > avant) compter('matchs.ligue', nombre - avant);
        vues[cle] = Math.max(avant ?? 0, nombre);
        if (Object.keys(vues).length > 30) delete vues[Object.keys(vues)[0]];
        ranger(m);
      } catch { /* idem */ } }) as EventListener);
      // La fluidité d'un match en 3D : sa tranche d'images par seconde, et s'il a fini à cadence réduite ou moins fin.
      window.addEventListener(EVENEMENT_FLUIDITE, ((e: CustomEvent<DetailFluidite>) => {
        compter(`fluidite.${e.detail.plateforme}.${e.detail.tranche}`);
        if (e.detail.cadence30) compter(`fluidite.${e.detail.plateforme}.cadence30`);
        if (e.detail.definitionReduite) compter(`fluidite.${e.detail.plateforme}.definition`);
      }) as EventListener);
      // Les fins de match (Correctif 32) : menées au bout, restées en chemin — avec la dernière étape atteinte —, ou
      // jouées avec un stockage plein. C'est ce qui dit où un téléphone se fige quand on ne peut pas l'avoir en main.
      window.addEventListener(EVENEMENT_SORTIE, ((e: CustomEvent<DetailSortie>) => { try {
        const { issue, etape } = e.detail;
        compter(`sortie.${plateforme()}.${issue === 'coupee' ? `coupee-${(etape || 'inconnue').slice(0, 50)}` : issue}`);
      } catch { /* idem */ } }) as EventListener);
      // La fin de match de la visite précédente est-elle restée ouverte ? (Jeu fermé à la main, ou gelé.)
      try { releverFilInterrompu(); } catch { /* idem */ }
      useGame.subscribe((etat, avant) => { try {
        if (modeDeLEcran(etat.ecran, etat.joueur, etat.manager) !== modeDeLEcran(avant.ecran, avant.joueur, avant.manager)) pas(false, avant);
        observer(true);
      } catch { /* le relevé ne casse jamais le jeu */ } });
      window.setInterval(() => { try { pas(); } catch { /* idem */ } }, PAS * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { pas(true); visible = false; envoyer(true); }
        else { visible = true; derniereMesure = Date.now(); dernierGeste = Date.now(); }
      });
      window.addEventListener('pagehide', () => { pas(true); visible = false; envoyer(true); });
    };
    const persistance = (useGame as unknown as { persist?: { hasHydrated(): boolean; onFinishHydration(f: () => void): void } }).persist;
    if (!persistance || persistance.hasHydrated()) brancher(); else persistance.onFinishHydration(brancher);
  } catch { /* stockage indisponible, navigateur ancien : pas de relevé, et c'est tout */ }
}
