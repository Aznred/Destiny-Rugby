// LA PÉNALTOUCHE GARDE SON LANCER, REBONDS COMPRIS — Correctif 33.
//
// Signalé en jeu : une pénalité tapée vers la touche, retombée dans le champ puis sortie après un ou plusieurs
// rebonds, donnait le lancer à l'équipe SANCTIONNÉE. Le moteur décidait du lancer d'après la trajectoire (ballon
// « trouvé » en l'air ou non) au lieu de la pénalité.
//
// Ce banc tient :
//   1. sur des situations construites : un rebond, plusieurs rebonds, sortie directe d'une pénaltouche « manquée »,
//      ballon effleuré par un adversaire (le lancer reste), touché par un partenaire (il tombe), et un coup de pied
//      ORDINAIRE qui sort après rebond (touche à l'adversaire, comme avant) ;
//   2. sur des matchs entiers où toutes les pénalités sont jouées en touche : aucune touche rendue à l'adversaire
//      tant que le botteur est le dernier de son camp à avoir joué le ballon ;
//   3. que l'ancien moteur (`reglesPenaltouche: 'historique'`, les matchs de ligue d'avant les règles 8) rejoue
//      exactement comme avant — c'est lui qui montre combien de lancers étaient perdus.
//
// Lancer : npm run verify:penaltouche -- 12
import { avancer, creerMatch, type OptionsMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { IA_MATCH_DE_CARRIERE } from '../src/lib/moteur/ia/reglages';
import type { BallonLibre, EtatMatch } from '../src/lib/moteur/etat';
import type { Pion } from '../src/lib/moteur/entites';
import type { Cote } from '../src/lib/moteur/terrain';
import { empreinte, jouerPourEmpreinte, resumerMatch, creerMatchDEmpreinte } from './outilsEmpreinte';

const N = Number(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 12);
let controles = 0, echecs = 0;
function dire(ok: boolean, quoi: string, detail = '') {
  controles++;
  if (!ok) echecs++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${quoi}${detail ? ` — ${detail}` : ''}`);
}
const titre = (t: string) => console.log(`\n${t}`);
const LARGEUR = 70;
const OPTIONS: OptionsMatch = { niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia: IA_MATCH_DE_CARRIERE, vent: null };
const neuf = (cle: string, plus: Partial<OptionsMatch> = {}) =>
  creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1), effectifDuClub('RC Toulon', 1), 24, 20, cle, undefined, { ...OPTIONS, ...plus });

// ── 1. Situations construites ───────────────────────────────────────────────
/** Éloigne tout le monde du ballon : personne ne peut le jouer avant qu'il sorte. */
function vider(e: EtatMatch, loin = 8) {
  for (const p of e.pions) {
    p.pos = { x: loin + (p.cote === 'A' ? 0 : 3), y: 35 + (p.numero - 8) * 1.2 };
    p.cible = { ...p.pos }; p.vitesse = { x: 0, y: 0 };
  }
}
function poserBallonLibre(e: EtatMatch, depuis: { x: number; y: number }, vitesse: { x: number; y: number }, auteur: Pion, plus: Partial<BallonLibre> = {}) {
  e.porteur = null; e.vol = null; e.ruck = null; e.conquete = null; e.aplatissage = null; e.placement = null;
  e.phase = 'ballonLibre'; e.minuteur = 10;
  e.ballon = { ...depuis };
  e.ballonLibre = { vitesse: { ...vitesse }, hauteur: 0.3, vitesseVerticale: 2.4, orientation: 0, vitesseRotation: 0, dernierRebondSim: -10,
    depuis: { x: depuis.x - 30, y: 35 }, intention: 'occupation', auteurCote: auteur.cote, auteur, age: 0, rebonds: 0, ...plus };
}
/** Laisse rouler le ballon jusqu'au prochain coup de sifflet ; rend la phase, le camp servi et le nombre de rebonds vus. */
function laisserRouler(e: EtatMatch): { phase: string; pour: Cote; rebonds: number } {
  let rebonds = 0;
  for (let i = 0; i < 400 && e.phase === 'ballonLibre'; i++) {
    rebonds = Math.max(rebonds, e.ballonLibre?.rebonds ?? 0);
    avancer(e, 0.15);
  }
  return { phase: e.phase, pour: e.possession, rebonds };
}
const titulaire = (e: EtatMatch, cote: Cote, numero: number) => e.pions.find(p => p.cote === cote && p.numero === numero && p.surLeTerrain)!;

titre('1. Situations construites');
{
  const e = neuf('pt-un-rebond'); vider(e);
  poserBallonLibre(e, { x: 62, y: 3.4 }, { x: 2, y: -3.2 }, titulaire(e, 'A', 10), { dePenalite: true });
  const r = laisserRouler(e);
  dire(r.phase === 'touche' && r.pour === 'A' && r.rebonds >= 1, 'retombée dans le champ, sortie après un rebond : lancer au botteur', `${r.phase} pour ${r.pour}, ${r.rebonds} rebond(s)`);
}
{
  const e = neuf('pt-plusieurs'); vider(e);
  poserBallonLibre(e, { x: 70, y: 9 }, { x: 2.4, y: -6.5 }, titulaire(e, 'A', 10), { dePenalite: true, hauteur: 0.7, vitesseVerticale: 4.8 });
  const r = laisserRouler(e);
  dire(r.phase === 'touche' && r.pour === 'A' && r.rebonds >= 1, 'chute haute, puis sortie : lancer au botteur', `${r.phase} pour ${r.pour}, ${r.rebonds} rebond(s)`);
}
{
  const e = neuf('pt-cote-b'); vider(e);
  poserBallonLibre(e, { x: 68, y: LARGEUR - 3.4 }, { x: -2, y: 3.2 }, titulaire(e, 'B', 10), { dePenalite: true });
  const r = laisserRouler(e);
  dire(r.phase === 'touche' && r.pour === 'B', 'même règle pour l\'autre camp et l\'autre ligne de touche', `${r.phase} pour ${r.pour}`);
}
{
  const e = neuf('pt-ordinaire'); vider(e);
  poserBallonLibre(e, { x: 62, y: 3.4 }, { x: 2, y: -3.2 }, titulaire(e, 'A', 10));
  const r = laisserRouler(e);
  dire(r.phase === 'touche' && r.pour === 'B', 'un coup de pied ORDINAIRE qui sort après rebond : touche à l\'adversaire, comme avant', `${r.phase} pour ${r.pour}`);
}
{
  // Un adversaire au ballon dès le premier pas : il le repousse (prise manquée), le ballon sort — le lancer reste acquis.
  const e = neuf('pt-adversaire'); vider(e);
  const adversaire = titulaire(e, 'B', 11);
  adversaire.pos = { x: 62.2, y: 0.8 }; adversaire.cible = { ...adversaire.pos };
  poserBallonLibre(e, { x: 62, y: 1.2 }, { x: 0.5, y: -5 }, titulaire(e, 'A', 10), { dePenalite: true, hauteur: 0, vitesseVerticale: 0 });
  const r = laisserRouler(e);
  dire(r.phase === 'touche' && r.pour === 'A', 'effleuré par un adversaire avant de sortir : le lancer reste au botteur', `${r.phase} pour ${r.pour}`);
}
{
  // Un partenaire du botteur le touche et l'échappe en touche : ce n'est plus le coup de pied de pénalité qui sort.
  const e = neuf('pt-partenaire'); vider(e);
  const partenaire = titulaire(e, 'A', 14);
  partenaire.pos = { x: 62.2, y: 0.8 }; partenaire.cible = { ...partenaire.pos };
  poserBallonLibre(e, { x: 62, y: 1.2 }, { x: 0.5, y: -5 }, titulaire(e, 'A', 10), { dePenalite: true, hauteur: 0, vitesseVerticale: 0 });
  const r = laisserRouler(e);
  dire(r.phase === 'touche' && r.pour === 'B', 'touché par un partenaire du botteur puis sorti : touche à l\'adversaire', `${r.phase} pour ${r.pour}`);
}
{
  // Le vol lui-même : la pénaltouche « manquée » (elle vole comme une occupation) que le vent pousse dehors.
  const e = neuf('pt-vol-dehors'); vider(e);
  const botteur = titulaire(e, 'A', 10);
  e.porteur = null; e.ruck = null; e.conquete = null; e.placement = null; e.ballonLibre = null;
  e.vol = { de: { x: 40, y: 30 }, vers: { x: 66, y: -1 }, duree: 2.2, ecoule: 2.2, hauteur: 0.5, type: 'pied', intention: 'occupation', auteur: botteur, receveur: null, dePenalite: true };
  e.ballon = { x: 66, y: -1 }; e.phase = 'ballonEnLAir'; e.minuteur = 0.5;
  avancer(e, 0.15);
  dire((e.phase as string) === 'touche' && e.possession === 'A' && Math.abs(e.ballon.x - 65.2) < 6, 'pénaltouche « manquée » sortie directement : lancer au botteur, là où le ballon est sorti',
    `${e.phase} pour ${e.possession} à x=${e.ballon.x.toFixed(1)} (coup de pied tapé à x=40)`);
}
{
  // Le même vol, retombé dans le champ sans personne : le ballon libre hérite du drapeau.
  const e = neuf('pt-vol-champ'); vider(e);
  const botteur = titulaire(e, 'A', 10);
  e.porteur = null; e.ruck = null; e.conquete = null; e.placement = null; e.ballonLibre = null;
  e.vol = { de: { x: 40, y: 30 }, vers: { x: 64, y: 3 }, duree: 2.2, ecoule: 2.2, hauteur: 0.5, type: 'pied', intention: 'occupation', auteur: botteur, receveur: null, dePenalite: true };
  e.ballon = { x: 64, y: 3 }; e.phase = 'ballonEnLAir'; e.minuteur = 0.5;
  avancer(e, 0.15);
  const herite = (e.phase as string) === 'ballonLibre' && (e.ballonLibre as BallonLibre | null)?.dePenalite === true;
  const r = laisserRouler(e);
  dire(herite && r.phase === 'touche' && r.pour === 'A', 'retombée dans le champ : le ballon libre garde la mémoire de la pénalité jusqu\'à la touche', `${r.phase} pour ${r.pour}, ${r.rebonds} rebond(s)`);
}

// ── 2. Des matchs entiers ───────────────────────────────────────────────────
interface Bilan { tapees: number; directes: number; apresRebonds: number; rebondsMax: number; rendues: number; renduesApresPartenaire: number; captees: number; autres: number }
const PAIRES: [string, string][] = [['Stade Toulousain', 'RC Toulon'], ['Stade Rochelais', 'Racing 92'], ['Union Bordeaux-Bègles', 'ASM Clermont'], ['Castres Olympique', 'Section Paloise']];
/**
 * Joue un match et suit CHAQUE pénalité tapée vers la touche, de la frappe au coup de sifflet suivant.
 *   carriere — dix minutes d'écran, toutes les pénalités forcées en touche ;
 *   ligue    — quatre-vingts minutes réelles, les décisions du moteur (c'est là que le défaut a été signalé).
 */
function jouer(k: number, mode: 'carriere' | 'ligue', plus: Partial<OptionsMatch>): { bilan: Bilan; e: EtatMatch } {
  const [a, b] = mode === 'ligue' ? PAIRES[0] : PAIRES[k % PAIRES.length];
  const e = creerMatch(a, b, effectifDuClub(a, 1), effectifDuClub(b, 1), 24, 20, mode === 'ligue' ? `sonde-pt-${k}` : `penaltouche-${k}`, undefined,
    mode === 'ligue'
      ? { tempsReel: true, scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia: 6, ...plus }
      : { niveau: 'pro', scoreSurTerrain: true, cadenceDetaillee: true, placementJoue: true, ia: IA_MATCH_DE_CARRIERE, ...plus });
  if (mode === 'carriere') e.carriereDixMinutes = true;
  const bilan: Bilan = { tapees: 0, directes: 0, apresRebonds: 0, rebondsMax: 0, rendues: 0, renduesApresPartenaire: 0, captees: 0, autres: 0 };
  let penalite: { pour: Cote; x: number; y: number } | null = null;
  let suivi: { cote: Cote; etape: 'vol' | 'libre'; vol: unknown; rebonds: number; partenaire: boolean } | null = null;
  e.apresPas = (m) => {
    if (m.phase === 'penalite' && m.penalite) {
      if (mode === 'carriere' && !m.choixPenalite) m.choixPenalite = 'touche';
      penalite = { pour: m.penalite.pour, x: m.penalite.lieu.x, y: m.penalite.lieu.y };
      return;
    }
    const v = m.vol;
    // Le coup de pied de la pénalité : trouvé (« penaltouche »), ou manqué — il part alors de la marque comme une occupation.
    if (!suivi && penalite && m.phase === 'ballonEnLAir' && v?.type === 'pied' && v.auteur.cote === penalite.pour
      && (v.intention === 'penaltouche' || v.dePenalite || (v.intention === 'occupation' && Math.hypot(v.de.x - penalite.x, v.de.y - penalite.y) < 0.05))) {
      suivi = { cote: penalite.pour, etape: 'vol', vol: v, rebonds: 0, partenaire: false }; penalite = null; bilan.tapees++;
      return;
    }
    if (penalite && !m.piedPrepare && m.phase !== 'ballonEnLAir') penalite = null; // pénalité jouée autrement (tir, mêlée, jeu rapide)
    if (!suivi) return;
    if (suivi.etape === 'vol' && m.vol === suivi.vol) return;
    if (m.phase === 'ballonLibre' && m.ballonLibre) {
      suivi.etape = 'libre';
      suivi.rebonds = Math.max(suivi.rebonds, m.ballonLibre.rebonds);
      // En règles nouvelles, le drapeau tombe quand un partenaire du botteur a touché le ballon.
      if (!plus.reglesPenaltouche && !m.ballonLibre.dePenalite) suivi.partenaire = true;
      return;
    }
    const s = suivi; suivi = null;
    if (m.phase === 'touche') {
      if (m.possession === s.cote) { if (s.etape === 'vol') bilan.directes++; else { bilan.apresRebonds++; bilan.rebondsMax = Math.max(bilan.rebondsMax, s.rebonds); } }
      else if (s.partenaire) bilan.renduesApresPartenaire++;
      else bilan.rendues++;
    } else if (s.etape === 'vol' && (m.phase === 'jeuCourant' || m.phase === 'ruck')) bilan.captees++;
    else bilan.autres++;
  };
  let garde = 0;
  while (!e.fini && garde++ < 400000) avancer(e, 0.6);
  return { bilan, e };
}
const somme = (liste: Bilan[]) => liste.reduce((t, b) => ({
  tapees: t.tapees + b.tapees, directes: t.directes + b.directes, apresRebonds: t.apresRebonds + b.apresRebonds, rebondsMax: Math.max(t.rebondsMax, b.rebondsMax),
  rendues: t.rendues + b.rendues, renduesApresPartenaire: t.renduesApresPartenaire + b.renduesApresPartenaire, captees: t.captees + b.captees, autres: t.autres + b.autres,
}), { tapees: 0, directes: 0, apresRebonds: 0, rebondsMax: 0, rendues: 0, renduesApresPartenaire: 0, captees: 0, autres: 0 });
const ligne = (b: Bilan) => `${b.tapees} tapées · ${b.directes} trouvées directement · ${b.apresRebonds} retombées dans le champ, sorties ensuite et GARDÉES · ${b.rendues} RENDUES à l'équipe sanctionnée · ${b.renduesApresPartenaire} rendues après une touche d'un partenaire · ${b.captees} captées dans le champ · ${b.autres} autres`;

titre(`2. ${N} matchs de carrière (dix minutes), toutes les pénalités jouées en touche`);
{
  const nouveaux = Array.from({ length: N }, (_, k) => jouer(k, 'carriere', {}));
  const apres = somme(nouveaux.map(m => m.bilan));
  console.log(`  ${ligne(apres)}`);
  dire(apres.tapees >= N * 3, 'assez de pénaltouches pour mesurer', `${apres.tapees}`);
  dire(apres.rendues === 0, 'AUCUNE pénaltouche sortie en touche n\'est rendue à l\'équipe sanctionnée', `${apres.rendues}`);
  dire(nouveaux.every(m => m.e.fini), 'tous les matchs vont à leur terme');
}

const LIGUE = Math.max(3, Math.ceil(N / 3));
titre(`2 bis. ${LIGUE} matchs de ligue en temps réel (quatre-vingts minutes), décisions du moteur — avant et après`);
{
  const avant = Array.from({ length: LIGUE }, (_, k) => jouer(k, 'ligue', { reglesPenaltouche: 'historique' }));
  const nouveaux = Array.from({ length: LIGUE }, (_, k) => jouer(k, 'ligue', {}));
  const jadis = somme(avant.map(m => m.bilan)), apres = somme(nouveaux.map(m => m.bilan));
  console.log(`  avant : ${ligne(jadis)}`);
  console.log(`  après : ${ligne(apres)}`);
  dire(jadis.rendues > 0, 'l\'ancien moteur rendait des pénaltouches à l\'équipe sanctionnée : le défaut signalé se retrouve', `${jadis.rendues} sur ${jadis.tapees}`);
  dire(apres.rendues === 0, 'AUCUNE n\'est plus rendue, rebonds compris', `${apres.rendues} sur ${apres.tapees}`);
  dire(apres.apresRebonds > 0, 'des pénaltouches retombent dans le champ, sortent ensuite, et le lancer est gardé', `${apres.apresRebonds}`);
  dire(nouveaux.every(m => m.e.fini) && avant.every(m => m.e.fini), 'tous les matchs vont à leur terme');
}

// ── 3. L'ancien moteur rejoue à l'identique ─────────────────────────────────
titre('3. Rejoue : les matchs d\'avant gardent leur moteur');
{
  const rejoue = (k: number, plus: Partial<OptionsMatch>) => {
    const e = creerMatchDEmpreinte(k, plus);
    let garde = 0;
    while (!e.fini && garde++ < 200000) avancer(e, 0.6);
    return empreinte(resumerMatch(e));
  };
  const historiques = [0, 1, 2].map(k => rejoue(k, { reglesPenaltouche: 'historique' }));
  // Les empreintes du moteur relevées AVANT le correctif (IA 6, `npm run mesure:empreinte -- 6`).
  const reference = ['a641f92c', '00e3c2d4', 'be6e0b6d'];
  dire(Number(process.env.IA_EMPREINTE ?? IA_MATCH_DE_CARRIERE) !== 6 || historiques.join() === reference.join(),
    '`reglesPenaltouche: historique` rejoue le moteur d\'avant, au caractère près', historiques.join(' '));
  const deuxFois = [0, 1].map(k => [empreinte(resumerMatch(jouerPourEmpreinte(k))), empreinte(resumerMatch(jouerPourEmpreinte(k)))]);
  dire(deuxFois.every(([a, b]) => a === b), 'le nouveau moteur est déterministe (deux rejoues identiques)', deuxFois.map(d => d[0]).join(' '));
}

console.log(`\n${controles - echecs}/${controles} contrôles${echecs ? ` — ${echecs} ÉCHEC(S)` : ''}`);
if (echecs) process.exit(1);
