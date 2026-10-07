// 🏉 LES AVANTS JOUENT (Correctif 23) — le geste du joueur dans la mêlée, le maul, la touche et le ruck.
//
// Demande : « Il faut que jouer un pilier soit aussi intéressant que jouer un centre, mais avec des mécaniques complètement
// différentes. Pas juste regarder une animation : une mécanique répétée mais simple — timing, appuis — et le joueur doit
// synchroniser ses efforts avec son pack. »
//
// ═══ LE PRINCIPE ═════════════════════════════════════════════════════════════
//
// Quand le joueur est dans un pack (mêlée, maul) ou joue un rôle de touche (sauteur, lifteur) ou de ruck (gratteur), le moteur
// pose une PARTITION de temps (\`PackHumain.temps\`) : des instants où l'effort du pack est le plus fort. Le joueur appuie en
// mesure ; chaque appui reçoit une qualité (0 raté, 1 correct, 2 parfait) ; un temps non joué compte pour raté. La justesse
// récente (\`score\`, de 0 à 1) devient ce que le joueur ajoute — ou retire — au rapport de force : \`bonusDuPack\` (mêlée),
// \`bonusMaul\` (maul), \`timingTouche\` (saut, lift), \`timing\` du duel du ruck (grattage).
//
// ⚠️ LES STATISTIQUES RESTENT MAÎTRESSES : la fenêtre de justesse est plus large pour un spécialiste (gratteur, sauteur), le bonus
// d'un geste parfait est proportionnel à sa puissance, et un joueur épuisé pousse moins fort. Le timing départage, il ne remplace pas.
//
// ⚠️ DERRIÈRE \`conqueteLisible\` (IA de niveau 4) : sans lui, le pion du joueur est conduit par l'IA dans tous ces moments, comme avant.
import type { EtatMatch } from './etat.js';
import type { Pion } from './entites.js';
import type { PackHumain, PosteGeste, RolePack } from './direct.js';
import { CADENCE_TOUCHE, REGLAGES_CONQUETE, conqueteLisible } from './conquete.js';
import { profilDe } from './ia/postes.js';
import { distance2 } from './terrain.js';
import { REGLAGES_DIRECT, peutGratter } from './direct.js';

/** Le métier d'un numéro d'avant, ou `null` pour un trois-quarts. */
export function rolePackDe(numero: number): RolePack | null {
  if (numero === 1 || numero === 3) return 'pilier';
  if (numero === 2) return 'talonneur';
  if (numero === 4 || numero === 5) return 'deuxieme';
  if (numero === 6 || numero === 7) return 'troisieme';
  if (numero === 8) return 'huit';
  return null;
}

/** La moyenne glissante de justesse : chaque temps joué pèse 40 %. */
const POIDS_TEMPS = 0.4;

/** Largeur des fenêtres de justesse pour ce joueur : le spécialiste est plus tolérant, l'épuisé un peu moins. */
export function largeurDeFenetre(p: Pion, type: PackHumain['type']): number {
  const profil = profilDe(p);
  const metier = type === 'ruck' ? profil.gratte / 12 : type === 'touche' ? profil.saute / 8 : profil.soutienRuck / 18;
  return 1 + Math.min(0.45, Math.max(0, metier)) + (p.endurance - 60) / 400;
}

interface Contexte {
  type: PackHumain['type'];
  cle: string;
  poste: PosteGeste;
  /** Instants des temps déjà fixés pour ce contexte, quand ils ne se génèrent pas à la périodicité. */
  fixes?: number[];
  premier: number;
  periode: number;
  /** Les temps continuent d'être posés devant le joueur. */
  continu: boolean;
}

/** Un identifiant de temps de saut : l'instant (s) où le joueur doit lever ou sauter, compté depuis maintenant. */
function tempsDuSaut(e: EtatMatch): number | null {
  const c = e.conquete;
  if (!c || c.type !== 'touche' || c.rapide || c.issue) return null;
  const total = e.dureeArret ?? 6.5;
  let dans = e.minuteur - total * (1 - 0.35);
  // Niveau 5 : le début de la formation passe en accéléré (`CADENCE_TOUCHE`) — le saut arrive d'autant plus tôt.
  if ((e.ia ?? 1) >= 5) dans -= Math.max(0, e.minuteur - total * (1 - CADENCE_TOUCHE.jusqua)) * (1 - 1 / CADENCE_TOUCHE.facteur);
  return dans > 0.4 ? e.sim + dans : null;
}

/** Les deux lifteurs d'un sauteur : les deux coéquipiers de l'alignement qui l'entourent, comme la scène les montre. */
function lifteursDe(e: EtatMatch, sauteur: Pion): Pion[] {
  return e.pions.filter((p) => p.cote === sauteur.cote && p !== sauteur && p.role === 'alignement' && p.surLeTerrain && p.sanction <= 0)
    .sort((a, b) => distance2(a.pos, sauteur.pos) - distance2(b.pos, sauteur.pos)).slice(0, 2);
}

function contexteDe(e: EtatMatch, moi: Pion): Contexte | null {
  if (!moi.surLeTerrain || moi.sanction > 0 || moi.corps) return null;
  const poste = rolePackDe(moi.numero);
  // ── Mêlée ──────────────────────────────────────────────────────────────
  const m = e.phase === 'melee' ? e.conquete?.melee : undefined;
  if (m?.dyn && moi.role === 'melee' && poste) {
    if (m.etape === 'placement' || m.etape === 'liaison') return null;
    if (m.etape === 'poussee' || m.etape === 'sortie') {
      return { type: 'melee', cle: `melee:${m.debut}`, poste, premier: m.etapeDepuis + 0.5, periode: REGLAGES_CONQUETE.periodeMelee, continu: m.etape === 'poussee' && !m.penalite };
    }
    // Impact, introduction : le talonneur de l'équipe qui introduit a UN temps — le coup de talon quand le ballon entre.
    if (poste === 'talonneur' && moi.cote === m.introducteur && m.etape === 'introduction') {
      return { type: 'melee', cle: `melee:${m.debut}`, poste, premier: m.etapeDepuis + 0.7, periode: 99, continu: false, fixes: [m.etapeDepuis + 0.7] };
    }
    return { type: 'melee', cle: `melee:${m.debut}`, poste, premier: 1e9, periode: 99, continu: false, fixes: [] };
  }
  // ── Maul ───────────────────────────────────────────────────────────────
  if (e.phase === 'maul' && moi.role === 'maul' && poste) {
    const debut = e.maul?.debut ?? Math.floor(e.t / 40) * 40;
    return { type: 'maul', cle: `maul:${debut}`, poste, premier: debut + 1.1, periode: REGLAGES_CONQUETE.periodeMaul, continu: true };
  }
  // ── Ruck : la fenêtre du grattage — le défenseur à portée du ballon a un instant pour s'y jeter au bon moment ──
  // Niveau 5 : la fenêtre ne s'ouvre que si le grattage est réglementairement possible — pas parce qu'un ruck existe quelque part.
  if (e.phase === 'ruck' && e.ruck && !e.ruck.duel && moi.cote !== e.ruck.attaque
    && ((e.ia ?? 1) >= 5 ? peutGratter(e, moi) : distance2(moi.pos, e.ballon) <= (REGLAGES_DIRECT.porteeRuck + 1.5) ** 2) && e.minuteur > 0.5) {
    return { type: 'ruck', cle: `ruck:${e.compteurs.rucks}`, poste: 'gratteur', premier: e.sim + 1.0, periode: 99, continu: false };
  }
  // ── Touche : le saut et le lift ────────────────────────────────────────
  if (e.phase === 'touche' && e.conquete && !e.conquete.rapide && !e.conquete.issue && !e.conquete.horsAlignement && moi.role === 'alignement') {
    const cible = e.pions.find((p) => p.id === e.conquete!.cibleId);
    const clef = `touche:${e.compteurs.touches}:${e.conquete.cibleId}`;
    // Le temps est posé UNE FOIS, quand la formation s'est mise en route ; il reste ensuite jusqu'à son jugement.
    const pose = e.direct?.pack?.cle === clef ? e.direct.pack.temps[0]?.t : undefined;
    const demarree = 1 - e.minuteur / (e.dureeArret ?? 6.5) > 0.001;
    const t = pose ?? (demarree ? tempsDuSaut(e) : null);
    if (t !== null && cible) {
      if (moi.id === cible.id) return { type: 'touche', cle: clef, poste: 'sauteur', premier: t, periode: 99, continu: false, fixes: [t] };
      if (lifteursDe(e, cible).some((p) => p.id === moi.id)) return { type: 'touche', cle: clef, poste: 'lifteur', premier: t, periode: 99, continu: false, fixes: [t] };
      // Le sauteur d'en face, et ses lifteurs : ils jouent le contre.
      if (moi.cote !== cible.cote) {
        const adversaires = e.pions.filter((p) => p.cote === moi.cote && p.role === 'alignement' && p.surLeTerrain && p.sanction <= 0)
          .sort((a, b) => Math.abs(a.pos.y - cible.pos.y) - Math.abs(b.pos.y - cible.pos.y));
        const sauteurContre = adversaires[0];
        if (sauteurContre?.id === moi.id) return { type: 'touche', cle: clef, poste: 'sauteur', premier: t, periode: 99, continu: false, fixes: [t] };
        if (sauteurContre && lifteursDe(e, sauteurContre).some((p) => p.id === moi.id)) return { type: 'touche', cle: clef, poste: 'lifteur', premier: t, periode: 99, continu: false, fixes: [t] };
      }
    }
  }
  return null;
}

function nouveauPack(ctx: Contexte): PackHumain {
  return {
    type: ctx.type, poste: ctx.poste, debut: ctx.premier, periode: ctx.periode, cle: ctx.cle,
    temps: [], score: 0.5, appuis: [],
  };
}

/**
 * Un pas du geste du joueur : pose les temps, juge les appuis reçus, compte les temps manqués. À appeler à chaque tick.
 * ⚠️ N'écrit que dans \`e.direct.pack\` : rien du jeu n'en dépend tant que le joueur ne joue pas.
 */
export function majPack(e: EtatMatch): void {
  const d = e.direct;
  if (!d) return;
  const moi = d.actif && conqueteLisible(e) ? e.pions.find((p) => p.moi) : undefined;
  const ctx = moi ? contexteDe(e, moi) : null;
  // Un grattage minuté survit à la fin de sa fenêtre : la qualité du geste est lue au moment où le ruck se tranche.
  if (d.pack?.type === 'ruck' && d.pack.engage && e.phase === 'ruck' && e.ruck && !e.ruck.duel && moi) {
    jugerLesTemps(e, d.pack, moi);
    return;
  }
  if (!ctx || !moi || (ctx.type === 'ruck' && d.fermeRuck === e.compteurs.rucks)) { delete d.pack; return; }
  if (!d.pack || d.pack.cle !== ctx.cle) d.pack = nouveauPack(ctx);
  const pk = d.pack;
  pk.poste = ctx.poste;
  // Niveau 5 : lié depuis plus d'une seconde au maul de SON équipe, il peut en sortir — on n'est plus prisonnier de la structure.
  pk.libre = (e.ia ?? 1) >= 5 && ctx.type === 'maul' && moi.cote === e.possession && e.sim - (e.maul?.debut ?? e.sim) >= 1.2;
  // Les temps à venir : une partition fixée, ou des pas réguliers posés deux secondes et demie devant le joueur.
  if (ctx.type === 'ruck') {
    // Un seul temps, posé à l'ouverture de la fenêtre.
    if (!pk.temps.length) pk.temps.push({ t: ctx.premier });
  } else if (ctx.fixes) {
    for (const t of ctx.fixes) if (!pk.temps.some((b) => Math.abs(b.t - t) < 0.2)) pk.temps.push({ t });
  } else if (ctx.continu) {
    let dernier = pk.temps.length ? pk.temps[pk.temps.length - 1].t : ctx.premier - ctx.periode;
    while (dernier + ctx.periode < e.sim + 2.6) { dernier += ctx.periode; pk.temps.push({ t: dernier }); }
  }
  jugerLesTemps(e, pk, moi);
  // Une fenêtre de grattage laissée passer se referme et ne revient pas pour ce ruck.
  if (pk.type === 'ruck' && !pk.engage && pk.temps[0]?.q !== undefined && e.sim > pk.temps[0].t + 0.8) { d.fermeRuck = e.compteurs.rucks; delete d.pack; return; }
  // Les temps passés depuis longtemps sortent de la fenêtre.
  while (pk.temps.length > 8 && pk.temps[0].t < e.sim - 3.5) pk.temps.shift();
}

/** Juge les appuis reçus, puis les temps dépassés sans appui. */
function jugerLesTemps(e: EtatMatch, pk: PackHumain, moi: Pion | undefined): void {
  const R = REGLAGES_CONQUETE;
  const largeur = moi ? largeurDeFenetre(moi, pk.type) : 1;
  const parfait = R.fenetreParfaite * largeur, correct = R.fenetreCorrecte * largeur;
  const noter = (b: { t: number; q?: 0 | 1 | 2 }, q: 0 | 1 | 2) => {
    b.q = q;
    pk.derniere = { t: e.sim, q };
    pk.score = pk.score * (1 - POIDS_TEMPS) + (q / 2) * POIDS_TEMPS;
  };
  for (const t of pk.appuis.splice(0)) {
    const proche = pk.temps.filter((b) => b.q === undefined).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    // Au ruck, le premier appui engage le joueur : trop tôt ou trop tard, il s'est jeté — mal.
    if (pk.type === 'ruck' && proche) noter(proche, Math.abs(proche.t - t) <= parfait ? 2 : Math.abs(proche.t - t) <= correct ? 1 : 0);
    else if (proche && Math.abs(proche.t - t) <= correct) noter(proche, Math.abs(proche.t - t) <= parfait ? 2 : 1);
    else {
      // Un appui hors temps : le pack ne l'attendait pas, il perd un peu de son élan.
      pk.score = Math.max(0, pk.score - 0.05);
      pk.derniere = { t: e.sim, q: 0 };
    }
  }
  for (const b of pk.temps) if (b.q === undefined && e.sim > b.t + correct) noter(b, 0);
}

/** Le joueur appuie (bouton, touche, doigt) : l'appui est jugé au prochain pas du moteur. Renvoie vrai s'il y avait un geste à faire. */
export function appuyerPack(e: EtatMatch, quand?: number): boolean {
  const pk = e.direct?.pack;
  if (!pk) return false;
  pk.appuis.push(quand ?? e.sim);
  return true;
}

/** Le joueur choisit sa sortie du pack (ramasser et partir, passer au 9, se détacher) : lue par la conclusion de la mêlée ou du maul. */
export function choisirSortieDuPack(e: EtatMatch, sortie: NonNullable<PackHumain['sortie']>): boolean {
  const pk = e.direct?.pack;
  if (!pk || !sortiesPossibles(pk).includes(sortie)) return false;
  pk.sortie = sortie;
  return true;
}

/** Ce que ce poste peut faire pour quitter le pack. */
export function sortiesPossibles(pk: Pick<PackHumain, 'type' | 'poste' | 'libre'>): NonNullable<PackHumain['sortie']>[] {
  if (pk.type !== 'melee' && pk.type !== 'maul') return [];
  if (pk.type === 'maul' && pk.libre) return ['ramasser', 'passer'];
  if (pk.poste === 'huit') return ['ramasser', 'passer'];
  if (pk.poste === 'troisieme') return ['detacher'];
  if (pk.type === 'maul' && (pk.poste === 'deuxieme' || pk.poste === 'talonneur')) return ['passer'];
  return [];
}

/**
 * Ce que le geste du joueur ajoute au rapport de force de son pack, de −bonus à +bonus.
 * ⚠️ Proportionnel à sa puissance et à son souffle : un pilier fort et frais pèse plus qu'un joueur fatigué.
 */
export function apportDuGeste(moi: Pion, pk: Pick<PackHumain, 'poste' | 'score'>): number {
  const B = REGLAGES_CONQUETE.bonusMelee[pk.poste] ?? 8;
  const forme = (0.7 + 0.3 * Math.min(1.3, Math.max(0.4, moi.puissance / 80))) * (0.75 + 0.25 * moi.endurance / 100);
  return (pk.score - 0.5) * 2 * B * forme;
}
