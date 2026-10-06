// LE MOTEUR DU TUTORIEL GUIDÉ (Correctif 18) — un seul parcours actif, une file, des déclencheurs surveillés.
//
// ═══ CE QUI A ÉTÉ TRANCHÉ ═══════════════════════════════════════════════════
//
// 1. ⚠️ JAMAIS DEUX TUTORIELS EN MÊME TEMPS. Un seul `etat.parcours`. Ce qui se déclenche pendant ce temps attend : soit parce que
//    son déclencheur reste vrai (il sera relevé à la tick suivante), soit parce qu'il a été SIGNALÉ (`signaler`) et mis en file.
// 2. ⚠️ LES PARCOURS SE DÉCLENCHENT PAR L'ÉCRAN, PAS PAR LE CODE DES ÉCRANS. Un déclencheur lit le DOM (`ancre('cel-portail')`)
//    ou le store ; les écrans n'ont qu'à porter des `data-tuto`. Pas de `useEffect` de tutoriel dans trente composants.
// 3. ⚠️ UN PARCOURS QUI PERD SON ÉCRAN S'ARRÊTE (`valide`), il ne s'accroche pas à un élément absent. S'il avait montré plus d'une
//    étape il compte comme vu : on ne rejoue pas une section pour avoir changé d'onglet.
// 4. ⚠️ UNE ÉTAPE DONT LA CIBLE N'ARRIVE PAS EST SAUTÉE (`patience`), jamais bloquante : un tutoriel qui reste muet devant un
//    écran qui a changé est pire que pas de tutoriel.
// 5. ⚠️ « REJOUER » ÉCRASE LE PARCOURS EN COURS ET IGNORE LE DRAPEAU ; « DÉSACTIVER » COUPE TOUT SANS RIEN RENDRE VU.

import { useSyncExternalStore } from 'react';
import { useGame } from '../../store/useGame';
import type { EtapeTuto, ParcoursTuto } from './types';
import { dejaVu, marquerVu, oublier, premiereFois, tutorielsDesactives, drapeauxVus } from './memoire';

// ───────────────────────────────────────────────────────────────────────────
// L'état, observable
// ───────────────────────────────────────────────────────────────────────────

export interface EtatGuide {
  parcours: ParcoursTuto | null;
  index: number;
  /** Change à chaque étape : sert de clé React pour rejouer l'entrée de la bulle. */
  seq: number;
  /** Le parcours a-t-il été lancé à la main (« Rejouer ») ? */
  rejeu: boolean;
}

const RIEN: EtatGuide = { parcours: null, index: 0, seq: 0, rejeu: false };
let etat: EtatGuide = RIEN;
let seqGlobale = 0;
const abonnes = new Set<() => void>();
const notifier = (): void => { for (const a of abonnes) a(); };
const abonner = (cb: () => void): (() => void) => { abonnes.add(cb); return () => { abonnes.delete(cb); }; };

export const lireGuide = (): EtatGuide => etat;
export const useGuide = (): EtatGuide => useSyncExternalStore(abonner, lireGuide, lireGuide);

// ───────────────────────────────────────────────────────────────────────────
// Le registre
// ───────────────────────────────────────────────────────────────────────────

const registre = new Map<string, ParcoursTuto>();
let ordre: ParcoursTuto[] = [];

export function enregistrerLesParcours(liste: readonly ParcoursTuto[]): void {
  for (const p of liste) registre.set(p.id, p);
  ordre = [...registre.values()].sort((a, b) => a.priorite - b.priorite);
}

export const parcoursConnus = (): readonly ParcoursTuto[] => ordre;
export const parcoursDe = (id: string): ParcoursTuto | undefined => registre.get(id);

// ───────────────────────────────────────────────────────────────────────────
// Les ancres
// ───────────────────────────────────────────────────────────────────────────

/**
 * Ce nœud appartient-il à une GRANDE couche fixe (modale, cadre plein écran, ouverture de pack) ? Un bandeau de navigation ou une pastille
 * fixe ne compte pas : une cible qui défile sous l'en-tête n'est pas « recouverte », elle est simplement en train de passer.
 */
function dansUneGrandeCouche(n: Element): boolean {
  const surface = window.innerWidth * window.innerHeight;
  for (let a: Element | null = n; a && a !== document.body; a = a.parentElement) {
    const pos = getComputedStyle(a).position;
    if (pos !== 'fixed') continue;
    const r = a.getBoundingClientRect();
    if (r.width * r.height >= surface * 0.4) return true;
  }
  return false;
}

/**
 * ⚠️ « VISIBLE » VEUT DIRE : PAS RECOUVERT PAR UNE MODALE. La composition s'ouvre dans un cadre plein écran qui masque le reste de l'écran :
 * les rôles et la tactique existent dans le DOM, avec une taille, mais derrière lui. Sans ce contrôle, le tutoriel entourait de jaune un
 * point de l'écran où l'on voyait autre chose. On échantillonne cinq points de la partie visible, et pour chacun on descend la pile des
 * éléments : si l'on rencontre la cible (ou un de ses descendants) avant une grande couche fixe, elle est visible. Nos propres couches
 * (`.gt-racine`) et les petits éléments fixes (en-tête, pastille) ne comptent pas.
 */
function estVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const s = getComputedStyle(el);
  if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const x1 = Math.max(r.left, 0);
  const x2 = Math.min(r.right, w - 1);
  const y1 = Math.max(r.top, 0);
  const y2 = Math.min(r.bottom, h - 1);
  // Hors de la fenêtre (à faire défiler) : on ne peut rien conclure, l'étape l'amènera à l'écran.
  if (x2 - x1 < 2 || y2 - y1 < 2) return true;
  const points: [number, number][] = [
    [(x1 + x2) / 2, (y1 + y2) / 2],
    [x1 + (x2 - x1) * 0.2, y1 + (y2 - y1) * 0.2], [x1 + (x2 - x1) * 0.8, y1 + (y2 - y1) * 0.2],
    [x1 + (x2 - x1) * 0.2, y1 + (y2 - y1) * 0.8], [x1 + (x2 - x1) * 0.8, y1 + (y2 - y1) * 0.8],
  ];
  // La pile va du dessus vers le dessous : rencontrer la cible, un de ses descendants OU UN DE SES ANCÊTRES avant toute grande couche étrangère
  // veut dire que rien ne la recouvre (un descendant est peint au-dessus de son ancêtre ; une cible `pointer-events: none` n'apparaît jamais
  // dans la pile, mais ses ancêtres y sont).
  for (const [x, y] of points) {
    for (const n of document.elementsFromPoint(x, y)) {
      if (n.closest('.gt-racine')) continue;
      if (el.contains(n) || n.contains(el)) return true;
      if (dansUneGrandeCouche(n)) break;
    }
  }
  return false;
}

/**
 * L'élément de l'écran qui porte `data-tuto="<nom>"` — le PREMIER VISIBLE : une même ancre peut exister deux fois (barre
 * d'onglets du bureau et du téléphone) et seule celle qu'on voit compte.
 */
export function ancre(nom: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const tous = document.querySelectorAll<HTMLElement>(`[data-tuto="${nom}"]`);
  for (const el of tous) if (estVisible(el)) return el;
  return null;
}

export const ancrePresente = (nom: string): boolean => ancre(nom) !== null;

// ───────────────────────────────────────────────────────────────────────────
// Les actes que les écrans signalent
// ───────────────────────────────────────────────────────────────────────────

/**
 * Quand une étape attend un ACTE (« place un joueur », « choisis ton capitaine »), l'écran le signale par `noter('coach.place')` au
 * moment où il l'accomplit — le tutoriel ne devine pas depuis l'extérieur ce qui a changé dans l'état d'un composant.
 * ⚠️ `noter` est sans effet quand aucun parcours n'est actif : un appel dans un écran coûte une comparaison.
 */
const actes = new Map<string, number>();
export function noter(nom: string): void {
  if (etat.parcours) actes.set(nom, Date.now());
}
/** L'acte a-t-il été accompli DEPUIS L'ENTRÉE dans l'étape courante ? */
export function acteDepuisLEtape(nom: string): boolean {
  return (actes.get(nom) ?? 0) >= entreeEtape;
}

// ───────────────────────────────────────────────────────────────────────────
// La file et le déroulé
// ───────────────────────────────────────────────────────────────────────────

/** Parcours signalés (événements de jeu) en attente d'un créneau. */
let file: string[] = [];
let pauseJusqua = 0;
let entreeEtape = 0;
let debutParcours = 0;
/** Combien de fois d'affilée le joueur a passé un parcours sans le regarder. */
let passesConsecutives = 0;

const PAUSE_ENTRE_PARCOURS_MS = 900;
const PATIENCE_DEFAUT_MS = 3500;
const DELAI_AVANT_VALIDITE_MS = 1500;

export const etapeCourante = (): EtapeTuto | null => (etat.parcours ? etat.parcours.etapes[etat.index] ?? null : null);

function entrerDansLEtape(index: number): void {
  const p = etat.parcours;
  if (!p) return;
  const e = p.etapes[index];
  etat = { ...etat, index, seq: ++seqGlobale };
  entreeEtape = Date.now();
  try { e?.avant?.(); } catch { /* une étape qui échoue n'arrête pas le parcours */ }
  notifier();
}

function fermer(marquer: boolean): void {
  const p = etat.parcours;
  if (!p) return;
  if (marquer) { marquerVu(p.id); rejeux.delete(p.famille); }
  const rejeu = etat.rejeu;
  etat = RIEN;
  pauseJusqua = Date.now() + PAUSE_ENTRE_PARCOURS_MS;
  notifier();
  if (marquer) { try { p.fin?.(); } catch { /* idem */ } }
  // Un rejeu manuel ne doit pas faire repartir les autres sections tout seul : il a posé sa file.
  if (rejeu) file = [];
}

/** Le parcours s'arrête : fini (dernière étape franchie) ou passé. Dans les deux cas il est vu. */
export function terminer(): void {
  passesConsecutives = 0;
  fermer(true);
}

/** « Passer » : on ferme la section, elle est vue. Trois « Passer » d'affilée sont comptés pour proposer de tout couper. */
export function passer(): void {
  passesConsecutives++;
  fermer(true);
}

/** Pour un parcours qui perd son écran, ou une désactivation : sans rien rendre vu. */
export function abandonner(marquerSiAvance: boolean): void {
  const p = etat.parcours;
  if (!p) return;
  fermer(marquerSiAvance && etat.index >= 1);
}

export function avancer(): void {
  const p = etat.parcours;
  if (!p) return;
  const e = p.etapes[etat.index];
  try { e?.apres?.(); } catch { /* idem */ }
  if (etat.index + 1 >= p.etapes.length) { terminer(); return; }
  entrerDansLEtape(etat.index + 1);
}

/**
 * L'étape précédente à laquelle on peut revenir : celle d'AVANT, si c'est une carte ou une info. On ne rejoue pas un clic ni une action : un
 * « Retour » qui sauterait par-dessus remettrait à l'écran un élément que l'action vient de faire disparaître (le pack qu'on vient d'ouvrir).
 */
export function indexPrecedent(): number | null {
  const p = etat.parcours;
  if (!p) return null;
  if (p.etapes[etat.index]?.sansRetour) return null;
  const i = etat.index - 1;
  if (i < 0) return null;
  const t = p.etapes[i].type ?? (p.etapes[i].cible ? 'info' : 'carte');
  return t === 'info' || t === 'carte' ? i : null;
}

export function reculer(): void {
  const i = indexPrecedent();
  if (i !== null) entrerDansLEtape(i);
}

/** Lance un parcours. `rejeu` : ignore le drapeau et remplace celui qui tourne. */
export function demarrer(id: string, rejeu = false): boolean {
  const p = registre.get(id);
  if (!p || tutorielsDesactives() && !rejeu) return false;
  if (etat.parcours) {
    if (!rejeu) { signaler(id); return false; }
    abandonner(false);
  }
  if (!rejeu && dejaVu(id)) return false;
  etat = { parcours: p, index: 0, seq: ++seqGlobale, rejeu };
  debutParcours = Date.now();
  entrerDansLEtape(0);
  return true;
}

/** Un événement de jeu demande un tutoriel contextuel : il passe à son tour, jamais par-dessus un autre. */
export function signaler(id: string): void {
  if (dejaVu(id) || file.includes(id) || etat.parcours?.id === id) return;
  if (!registre.has(id)) return;
  file.push(id);
}

// ───────────────────────────────────────────────────────────────────────────
// La surveillance (une tick toutes les 200 ms, démarrée par l'overlay)
// ───────────────────────────────────────────────────────────────────────────

function lancerLeSuivant(): void {
  if (Date.now() < pauseJusqua) return;
  while (file.length) {
    const id = file.shift() as string;
    if (!dejaVu(id) && demarrer(id)) return;
  }
  for (const p of ordre) {
    if (!p.declencheur || dejaVu(p.id)) continue;
    let pret = false;
    try { pret = p.declencheur(); } catch { pret = false; }
    if (pret && demarrer(p.id)) return;
  }
}

function surveillerLEtape(p: ParcoursTuto, e: EtapeTuto): void {
  const maintenant = Date.now();
  if (p.valide && maintenant - debutParcours > DELAI_AVANT_VALIDITE_MS) {
    let ok = true;
    try { ok = p.valide(); } catch { ok = false; }
    if (!ok) { abandonner(true); return; }
  }
  // Une étape sans objet se franchit d'elle-même (et l'overlay ne l'a jamais dessinée : voir `EtapeGuide`).
  let sansObjet = false;
  try { sansObjet = e.ignorerSi?.() ?? false; } catch { sansObjet = false; }
  if (sansObjet) { avancer(); return; }
  // Une étape ne se règle jamais dans la tick qui l'a ouverte : l'écran a besoin de se redessiner.
  if (maintenant - entreeEtape < 120) return;
  if (e.type === 'action' && e.jusqua) {
    let fait = false;
    try { fait = e.jusqua(); } catch { fait = false; }
    if (fait) { avancer(); return; }
  }
  if (e.cible && !ancre(e.cible)) {
    const attendu = maintenant - entreeEtape > (e.patience ?? PATIENCE_DEFAUT_MS);
    if (attendu && e.facultative !== false) avancer();
  }
}

export function tick(): void {
  if (tutorielsDesactives()) { if (etat.parcours) abandonner(false); file = []; return; }
  const p = etat.parcours;
  if (!p) { lancerLeSuivant(); return; }
  const e = p.etapes[etat.index];
  if (e) surveillerLEtape(p, e);
}

/** Le clic sur la cible d'une étape `clic` la termine — après que l'écran a réagi au clic. */
function surClic(ev: MouseEvent): void {
  const p = etat.parcours;
  const e = etapeCourante();
  if (!p || !e || e.type !== 'clic' || !e.cible) return;
  const el = ancre(e.cible);
  if (!el || !(ev.target instanceof Node) || !el.contains(ev.target)) return;
  const seq = etat.seq;
  window.setTimeout(() => { if (etat.seq === seq) avancer(); }, 90);
}

/** Démarre la surveillance : à appeler une fois (l'overlay le fait au montage), renvoie son arrêt. */
export function surveiller(): () => void {
  const horloge = window.setInterval(tick, 200);
  document.addEventListener('click', surClic, true);
  return () => { window.clearInterval(horloge); document.removeEventListener('click', surClic, true); };
}

export const passesDAffilee = (): number => passesConsecutives;

// ───────────────────────────────────────────────────────────────────────────
// Rejouer, et reconnaître les anciens joueurs
// ───────────────────────────────────────────────────────────────────────────

/**
 * Les familles qu'on a demandé de REJOUER : un déclencheur qui, d'habitude, se tait pour un ancien (le portail de la ligue, pour qui a déjà
 * une ligue) s'y reporte — sans cela, « Rejouer » ne montrerait rien à qui connaît déjà les lieux.
 */
const rejeux = new Set<string>();
export const rejeuDemande = (famille: string): boolean => rejeux.has(famille);

/**
 * « Rejouer » une famille : ses drapeaux sont effacés ; le premier de ses parcours dont l'écran est déjà là redémarre à la
 * tick suivante. Les parcours qui ont besoin d'un autre écran repartent quand on y arrive.
 */
export function rejouerLaFamille(famille: 'league' | 'player' | 'coach'): void {
  rejeux.add(famille);
  oublier(famille);
  file = [];
  if (etat.parcours) abandonner(false);
  pauseJusqua = 0;
}

/**
 * Les joueurs qui ont déjà une carrière ne repassent pas par le premier contact : on marque comme vus les parcours dont ils ont,
 * par leurs actes, déjà fait le tour. Appelé une seule fois, au premier lancement de cette version (`premiereFois`).
 * ⚠️ UNE CARRIÈRE N'EXPLIQUE PAS LA LIGUE EN LIGNE : on ne marque QUE ce que la sauvegarde prouve.
 */
export function reconnaitreLesAnciens(): void {
  if (!premiereFois()) return;
  const s = useGame.getState();
  let ancien = false;
  // ⚠️ LES RÔLES (capitaine, buteur…) NE SONT PAS MARQUÉS : ils sont nés après les anciennes carrières, qui les découvrent.
  if (s.joueur) { for (const id of parcoursDeLaFamille('player')) if (!id.includes('.role.')) marquerVu(id); ancien = true; }
  if (s.manager) { for (const id of parcoursDeLaFamille('coach')) marquerVu(id); ancien = true; }
  // ⚠️ L'ANCIEN TUTORIEL (`tutoVu`) NE COMPTE PAS : il n'existe plus, celui-ci est tout autre — qui n'a pas de carrière le voit.
  if (ancien) marquerVu('general.intro');
  // Même sans carrière, on écrit la mémoire : la prochaine ouverture n'est plus « la première fois ».
  marquerVu('general.migration');
}

export const parcoursDeLaFamille = (famille: string): string[] => ordre.filter((p) => p.famille === famille).map((p) => p.id);

/** Pour les bancs et les réglages : la liste lisible de ce qui a été vu. */
export const parcoursVus = (): string[] => drapeauxVus();
