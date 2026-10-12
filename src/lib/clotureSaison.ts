// LA CLÔTURE D'UNE SAISON D'ENTRAÎNEUR — ce qui la retient, ce qui se règle tout seul (Correctif 39)
//
// Signalé en jeu : « on arrive à la fin de saison mais le bouton permettant de conclure reste bloqué ».
//
// ⚠️ LA CLÔTURE REFUSAIT EN SILENCE. `semaineManager` et `saisonManager` rendaient la main sans un mot dans deux cas
// (contrat de l'entraîneur à zéro, affiche de la semaine sans résultat), et une exception levée par une étape annexe
// — le monde de 1 300 clubs, lu en entier — arrêtait tout : le clic ne faisait rien, et rien ne disait pourquoi.
//
// Ce module est la LISTE de ce que la clôture regarde. Il ne modifie rien : il lit la fiche de l'entraîneur et rend
// des verrous, chacun avec sa gravité :
//
//   · `bloquant` — la saison ne se clôt pas tant qu'il est là, et lui seul demande un geste de l'entraîneur ;
//   · `auto`     — réglé d'office à la clôture (un contrat de joueur oublié, une négociation restée ouverte, un match
//                  de phase finale d'une date passée) : il est annoncé, jamais bloquant ;
//   · `info`     — sans effet sur la clôture, mais utile à qui cherche pourquoi un titre ou une montée manque.
//
// ⚠️ MODULE PUR : ni store ni DOM. Le store l'appelle à la clôture, l'écran quand un clic n'a rien fait, et la console
// (`__clotureSaison()` en développement) pour lire la liste telle quelle.

import type { Manager } from '../types.js';
import type { Coequipier } from './effectif.js';
import { effectifDuClub } from './effectif.js';
import { SEMAINES_PAR_SAISON, semaine as semaineDuCalendrier } from '../data/calendrier.js';
import { afficheDuClub, type AfficheComplete } from './matchLive.js';
import { assurerEtatCarriereAvancee, clubsAbsentsDuMonde, type EtatCarriereAvancee, type IncidentCloture } from './carriereAvancee.js';
import { tournoiDeFinDAnnee } from './tournoi.js';
import { phaseFinale } from './phaseFinale.js';
import { nomDivision } from './promotion.js';
import type { MatchElimination } from './bracketProgressif.js';

export type CodeVerrou =
  | 'contratEntraineur'   // le contrat de l'entraîneur est à zéro : il doit répondre au conseil
  | 'matchEnAttente'      // l'affiche de la semaine n'a pas de résultat
  | 'matchEnRetard'       // un match du club d'une date passée n'a jamais été joué
  | 'playoffsEnRetard'    // des matchs de phase finale des autres clubs, d'une date passée, n'ont pas de résultat
  | 'titreNonDecerne'     // la phase finale de la division n'a pas de vainqueur
  | 'contratsJoueurs'     // contrats de joueurs qui expirent à la clôture
  | 'prolongationsAcceptees' // prolongations acceptées par le joueur, pas encore signées
  | 'negociations'        // négociations restées ouvertes
  | 'approches'           // offres reçues pour un joueur, sans réponse
  | 'ventes'              // joueurs mis en vente, sans acheteur
  | 'demandes'            // demandes du vestiaire sans réponse
  | 'decision'            // décision de la direction en attente
  | 'mondeIncomplet'      // clubs du jeu que la partie ne connaît pas encore
  | 'erreur';             // une lecture a levé une exception : problème de structure

export type GraviteVerrou = 'bloquant' | 'auto' | 'info';

export interface VerrouCloture {
  code: CodeVerrou;
  gravite: GraviteVerrou;
  nombre: number;
  /** Ce qui est concerné, en clair : noms, clés de match, message d'erreur. Jamais traduit : c'est du diagnostic. */
  details: string[];
}

/** Ce que la dernière clôture a fait : gardé dans la fiche, montré à l'écran et dans le Labo. */
export interface RapportCloture {
  saison: number;
  club: string;
  /** Ce qui a été réglé d'office. */
  resolutions: VerrouCloture[];
  /** Les étapes annexes qui ont échoué : la saison s'est close sans elles. */
  incidents: IncidentCloture[];
}

/** Les joueurs dont le contrat s'arrête à la fin de CETTE saison. La même lecture que la clôture. */
export function contratsExpirants(m: Manager, effectif: Coequipier[], a: EtatCarriereAvancee | undefined = m.avancee): Coequipier[] {
  if (!a?.contratsJoueurs) return [];
  return effectif.filter((j) => (a.contratsJoueurs[j.id]?.fin ?? Infinity) <= m.saison + 1);
}

/** Une prolongation est-elle déjà acceptée par le joueur (il ne manque que la signature du club) ? */
export function prolongationsAcceptees(m: Manager): Manager['negociations'] {
  return m.negociations.filter((n) => n.etat === 'accord' && (n.nature === 'prolongation' || n.nature === 'revalorisation'));
}

/** La dernière semaine du calendrier : plus aucun match n'y est programmé, tout ce qui reste est en retard. */
export function estSemaineDeCloture(numero: number): boolean {
  return numero >= SEMAINES_PAR_SAISON && semaineDuCalendrier(numero).type !== 'phaseFinale';
}

const message = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur));

/**
 * L'affiche du week-end, sans jamais lever. ⚠️ Un tableau de phase finale dont un résultat enregistré ne correspond plus
 * à ses clubs lève exprès (`bracketProgressif.ts`) : c'est un vrai problème de structure, mais il ne doit ni faire
 * tomber l'écran, ni retenir la semaine. On le rend ici comme une erreur lisible, et l'affiche vaut « aucune ».
 */
export function afficheSure(m: Manager): { affiche: AfficheComplete | null; erreur?: string } {
  try { return { affiche: afficheDuClub(m) }; } catch (erreur) { return { affiche: null, erreur: message(erreur) }; }
}

/** Les matchs de phase finale de la division de l'entraîneur (tournoi final ou tableau de la poule). */
function tableauDeLaDivision(m: Manager): { matchs: MatchElimination[]; champion: string | null } {
  const tournoi = tournoiDeFinDAnnee(m.division, m.saison, nomDivision(m.division), m.club);
  const phase = tournoi ?? phaseFinale(m.division, m.saison, m.club);
  return { matchs: phase.matchs, champion: phase.champion };
}

/**
 * TOUT CE QUE LA CLÔTURE REGARDE, dans l'ordre où elle le traite.
 *
 * `effectif` : le groupe de la saison en cours (par défaut, relu dans le monde). La fonction ne lève jamais : une lecture
 * qui échoue devient un verrou `erreur`.
 */
export function diagnostiquerCloture(m: Manager, effectif?: Coequipier[]): VerrouCloture[] {
  const verrous: VerrouCloture[] = [];
  const ajouter = (code: CodeVerrou, gravite: GraviteVerrou, details: string[], nombre = details.length) => {
    if (nombre > 0) verrous.push({ code, gravite, nombre, details });
  };
  const lire = <T,>(etape: string, calcul: () => T, repli: T): T => {
    try { return calcul(); } catch (erreur) { ajouter('erreur', 'info', [`${etape} : ${message(erreur)}`]); return repli; }
  };
  if (!m.club) return verrous;
  const cloture = estSemaineDeCloture(m.semaine);

  // 1. Le contrat de l'entraîneur. Sans offre du conseil, la clôture en fait naître une : jamais de cul-de-sac.
  if ((m.contrat?.saisons ?? 0) <= 0) {
    ajouter('contratEntraineur', 'bloquant', [m.conseil?.offre ? `offre de ${m.conseil.offre.duree} saison(s) à accepter ou refuser` : 'aucune offre : le conseil en proposera une']);
  }

  // 2. L'affiche de la semaine. À la date de clôture, un match encore dû est forcément en retard : il est joué d'office.
  const { affiche, erreur } = afficheSure(m);
  if (erreur) ajouter('erreur', 'info', [`affiche : ${erreur}`]);
  if (affiche && !m.resultats[affiche.cle]) {
    ajouter(cloture ? 'matchEnRetard' : 'matchEnAttente', cloture ? 'auto' : 'bloquant', [`${affiche.match.domicile} - ${affiche.match.exterieur} (${affiche.cle})`]);
  }

  // 3. La phase finale de la division : les matchs des autres clubs d'une date passée, et le titre.
  const tableau = lire('phase finale', () => tableauDeLaDivision(m), { matchs: [], champion: null });
  const enRetard = tableau.matchs.filter((x) => x.status !== 'completed' && x.semaine <= m.semaine
    && x.domicile !== m.club && x.exterieur !== m.club);
  ajouter('playoffsEnRetard', 'auto', enRetard.map((x) => `${x.libelle} [${x.status}]`));
  if (cloture && tableau.matchs.length && !tableau.champion) {
    ajouter('titreNonDecerne', 'info', [`${nomDivision(m.division)} : la finale n'a pas de vainqueur`]);
  }

  // 4. Les contrats des joueurs, les prolongations acceptées, ce qui reste ouvert sur le marché et dans le vestiaire.
  const groupe = effectif ?? lire('effectif', () => effectifDuClub(m.club, m.saison), []);
  const avancee = lire('carrière', () => assurerEtatCarriereAvancee(m, groupe), m.avancee);
  const acceptees = prolongationsAcceptees(m);
  ajouter('prolongationsAcceptees', 'auto', acceptees.map((n) => n.joueur.nom));
  const prolonges = new Set(acceptees.filter((n) => n.nature === 'prolongation').map((n) => n.joueur.id));
  ajouter('contratsJoueurs', 'auto', contratsExpirants(m, groupe, avancee).filter((j) => !prolonges.has(j.id)).map((j) => j.nom));
  ajouter('negociations', 'auto', [
    ...m.negociations.filter((n) => n.etat === 'ouverte' || (n.etat === 'accord' && !acceptees.includes(n))).map((n) => n.joueur.nom),
    ...m.negociationsClubs.filter((n) => n.etat === 'ouverte' || n.etat === 'accord').map((n) => `${n.cible.nom} (${n.club})`),
  ]);
  ajouter('approches', 'auto', (avancee?.approches ?? []).filter((x) => ['ouverte', 'negociation', 'accord'].includes(x.etat)).map((x) => `${x.nom} (${x.club})`));
  ajouter('ventes', 'auto', m.ventes.map((v) => v.joueurId));
  ajouter('demandes', 'auto', m.demandes.filter((d) => d.etat === 'ouverte').map((d) => d.nom));
  if (m.decision) ajouter('decision', 'auto', [m.decision.id]);

  // 5. Le monde : les clubs arrivés dans le jeu après la création de la partie.
  const absents = clubsAbsentsDuMonde(m.avancee);
  ajouter('mondeIncomplet', 'auto', absents.slice(0, 6).concat(absents.length > 6 ? [`… ${absents.length - 6} autres`] : []), absents.length);

  return verrous;
}

/** Y a-t-il quelque chose qui demande l'entraîneur avant que la semaine (ou la saison) puisse avancer ? */
export function verrousBloquants(verrous: VerrouCloture[]): VerrouCloture[] {
  return verrous.filter((v) => v.gravite === 'bloquant');
}

/**
 * La liste telle qu'on la lit dans le Labo et dans la console :
 *
 *   Season close blockers:
 *   - 2 expired player contracts [auto]
 *   - 1 pending playoff match [blocking]
 *
 * ⚠️ EN ANGLAIS ET SANS TRADUCTION, EXPRÈS : c'est une sortie de diagnostic (elle se copie dans un rapport de bug, se
 * cherche dans un journal), pas un texte de l'interface. L'écran, lui, passe par les clés `cloture.*`.
 */
const LIBELLES_DIAGNOSTIC: Record<CodeVerrou, [string, string]> = {
  contratEntraineur: ['expired manager contract', 'expired manager contract'],
  matchEnAttente: ['match waiting to be played', 'matches waiting to be played'],
  matchEnRetard: ['overdue club match', 'overdue club matches'],
  playoffsEnRetard: ['pending playoff match', 'pending playoff matches'],
  titreNonDecerne: ['unfinished competition', 'unfinished competitions'],
  contratsJoueurs: ['expired player contract', 'expired player contracts'],
  prolongationsAcceptees: ['accepted extension to apply', 'accepted extensions to apply'],
  negociations: ['open negotiation', 'open negotiations'],
  approches: ['pending transfer approach', 'pending transfer approaches'],
  ventes: ['player still listed for sale', 'players still listed for sale'],
  demandes: ['unanswered player request', 'unanswered player requests'],
  decision: ['pending board decision', 'pending board decisions'],
  mondeIncomplet: ['club missing from the saved world', 'clubs missing from the saved world'],
  erreur: ['structural error', 'structural errors'],
};
const GRAVITE_DIAGNOSTIC: Record<GraviteVerrou, string> = { bloquant: 'blocking', auto: 'auto-resolved', info: 'info' };

export function texteDiagnostic(verrous: VerrouCloture[], incidents: IncidentCloture[] = []): string {
  const lignes = ['Season close blockers:'];
  if (!verrous.length && !incidents.length) lignes.push('- none');
  for (const v of verrous) {
    lignes.push(`- ${v.nombre} ${LIBELLES_DIAGNOSTIC[v.code][v.nombre > 1 ? 1 : 0]} [${GRAVITE_DIAGNOSTIC[v.gravite]}]`
      + (v.details.length ? ` — ${v.details.slice(0, 4).join(' · ')}${v.details.length > 4 ? ' …' : ''}` : ''));
  }
  for (const i of incidents) lignes.push(`- step "${i.etape}" failed and was skipped — ${i.message}`);
  return lignes.join('\n');
}

// ── La trace de la dernière clôture, sur cet appareil ───────────────────────
// Même principe que le fil de la fin de match (`finMatch.ts`) : une sauvegarde bloquée ne laisse aucune trace ailleurs.

const CLE_TRACE = 'destiny-rugby:cloture-saison';

export interface TraceCloture {
  le: string;
  saison: number;
  club: string;
  /** `close` : la saison est passée ; `retenue` : un verrou bloquant l'a arrêtée ; `erreur` : la clôture a levé. */
  issue: 'close' | 'retenue' | 'erreur';
  texte: string;
}

export function tracerCloture(trace: Omit<TraceCloture, 'le'>): void {
  try {
    globalThis.localStorage?.setItem(CLE_TRACE, JSON.stringify({ ...trace, le: new Date().toISOString() }));
  } catch { /* stockage plein ou absent : la trace est un confort */ }
}

export function derniereTraceCloture(): TraceCloture | null {
  try {
    const brut = globalThis.localStorage?.getItem(CLE_TRACE);
    return brut ? JSON.parse(brut) as TraceCloture : null;
  } catch { return null; }
}
