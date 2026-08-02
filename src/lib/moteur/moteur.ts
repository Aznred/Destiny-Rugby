import { graine } from '../championnat';
import type { Coequipier } from '../effectif';
import type { PosteId } from '../../types';
import { POSTE_PAR_ID } from '../../data/rugby';
import { creerPion, deplacer, ORDRE_MAILLOTS, type AttributsPion, type Pion } from './entites';
import { choisirSysteme, placer, type ConsigneJoueur, type Contexte, type SystemeDefensif } from './tactique';
import { LARGEUR, LIGNE_A, LIGNE_B, MILIEU, borner, dansLes22, dansSonCamp, distance, enTouche, ligneAdverse, sens, type Cote, type Vec } from './terrain';
import { placementCoupEnvoi, placementMelee, placementRuck, placementTouche } from './phasesArretees';

export type Phase = 'coupEnvoi' | 'jeuCourant' | 'ruck' | 'melee' | 'touche' | 'maul' | 'coupDePied' | 'tirAuBut' | 'apresEssai' | 'miTemps' | 'fini';

export interface Commentaire { minute: number; texte: string; type: 'essai' | 'but' | 'butRate' | 'plaquage' | 'ruck' | 'melee' | 'touche' | 'maul' | 'pied' | 'penalite' | 'carton' | 'remplacement' | 'jalon' | 'jeu'; cote: Cote | null; points: number; scoreA: number; scoreB: number; moi?: boolean; }

export interface EtatMatch {
  clubA: string; clubB: string; t: number; minute: number; periode: 1 | 2; sirene: boolean; phase: Phase; minuteur: number;
  pions: Pion[]; ballon: Vec; porteur: Pion | null; possession: Cote; systeme: SystemeDefensif; scoreA: number; scoreB: number;
  resteA: number; resteB: number; cibleA: number; cibleB: number; phasesDeJeu: number; prochaineDecision: number; perceeEnCours: boolean;
  vol: Vol | null; placementFige: Record<string, Vec> | null; tir: { buteur: Pion; distance: number; valeur: number } | null;
  commentaires: Commentaire[]; consigne?: ConsigneJoueur; fini: boolean; rng: () => number; prochainEssaiEn?: Cote; remplacementsA: number; remplacementsB: number;
}

export interface Vol {
  de: Vec; vers: Vec; duree: number; ecoule: number; type: 'passe' | 'pied';
  intention: '50/22' | 'occupation' | 'chandelle' | 'drop' | 'penaltouche' | 'passe' | 'transversale' | 'grubber';
  auteur: Pion; receveur?: Pion;
}

const DT = 0.2; const DUREE_PERIODE = 40 * 60; const RAYON_PLAQUAGE = 1.4;

export function creerMatch(clubA: string, clubB: string, effectifA: Coequipier[], effectifB: Coequipier[], scoreCibleA: number, scoreCibleB: number, cle: string, avatar?: { club: string; nom: string; poste: PosteId; attributs: AttributsPion; titulaire?: boolean }): EtatMatch {
  const rng = graine('moteur#' + cle); const pions: Pion[] = [];
  const monter = (eff: Coequipier[], cote: Cote, club: string) => {
    const dispo = [...eff].sort((a, b) => b.note - a.note); const pris = new Set<Coequipier>(); const titulaires: Coequipier[] = [];
    for (const poste of ORDRE_MAILLOTS) { const choisi = dispo.find((c) => !pris.has(c) && c.poste === poste) ?? dispo.find((c) => !pris.has(c) && POSTE_PAR_ID[c.poste]?.famille === POSTE_PAR_ID[poste]?.famille) ?? dispo.find((c) => !pris.has(c)); if (!choisi) break; pris.add(choisi); titulaires.push({ ...choisi, poste }); }
    const banc = dispo.filter((c) => !pris.has(c)).slice(0, 8); const liste = [...titulaires, ...banc];
    if (avatar && avatar.club === club) { const place = ORDRE_MAILLOTS.indexOf(avatar.poste); const index = avatar.titulaire === false ? 15 + Math.max(0, Math.min(7, place >= 0 ? place % 8 : 3)) : (place >= 0 ? place : 9); if (liste[index]) liste[index] = { ...liste[index], nom: avatar.nom, poste: avatar.poste }; }
    liste.forEach((c, i) => { const moi = !!avatar && avatar.club === club && c.nom === avatar.nom; pions.push(creerPion(c, i, cote, moi, moi ? avatar!.attributs : undefined)); });
  };
  monter(effectifA, 'A', clubA); monter(effectifB, 'B', clubB);
  const etat: EtatMatch = {
    clubA, clubB, t: 0, minute: 0, periode: 1, sirene: false, phase: 'coupEnvoi', minuteur: 2, pions, ballon: { x: MILIEU, y: LARGEUR / 2 }, porteur: null, possession: rng() < 0.5 ? 'A' : 'B', systeme: 'blitz',
    scoreA: 0, scoreB: 0, resteA: scoreCibleA, resteB: scoreCibleB, cibleA: scoreCibleA, cibleB: scoreCibleB, phasesDeJeu: 0, prochaineDecision: 1, perceeEnCours: false, vol: null, placementFige: null, tir: null, commentaires: [], fini: false, rng, remplacementsA: 0, remplacementsB: 0,
  };
  placerPourCoupEnvoi(etat, true); dire(etat, 'jalon', null, `Coup d’envoi ! ${clubA} reçoit ${clubB}.`); return etat;
}

function dire(e: EtatMatch, type: Commentaire['type'], cote: Cote | null, texte: string, points = 0, moi = false): void { e.commentaires.push({ minute: Math.floor(e.t / 60), texte, type, cote, points, scoreA: e.scoreA, scoreB: e.scoreB, moi }); }
function surLeTerrain(e: EtatMatch, cote: Cote): Pion[] { return e.pions.filter((p) => p.cote === cote && p.surLeTerrain); }
function nomClub(e: EtatMatch, cote: Cote): string { return cote === 'A' ? e.clubA : e.clubB; }
function adverse(cote: Cote): Cote { return cote === 'A' ? 'B' : 'A'; }

function placerPourCoupEnvoi(e: EtatMatch, instantane = false): void { e.ballon = { x: MILIEU, y: LARGEUR / 2 }; e.placementFige = placementCoupEnvoi(e.pions, MILIEU, e.possession); if (instantane) for (const p of e.pions) { const c = e.placementFige[p.id]; if (c) { p.pos = { ...c }; p.cible = { ...c }; } } }

export function avancer(e: EtatMatch, secondesDeJeu: number): void { if (e.fini) return; let reste = secondesDeJeu; while (reste > 0 && !e.fini) { const pas = Math.min(DT, reste); tick(e, pas); reste -= pas; } }

function tick(e: EtatMatch, dt: number): void {
  const jeuVivant = e.phase !== 'apresEssai' && e.phase !== 'tirAuBut' && e.phase !== 'miTemps';
  if (jeuVivant) e.t += dt; e.minute = Math.floor(e.t / 60);
  const finPeriode = e.periode * DUREE_PERIODE;
  if (e.sirene && e.t > finPeriode + 180) return clorePeriode(e);
  if (!e.sirene && e.t >= finPeriode) { e.sirene = true; dire(e, 'jalon', null, e.periode === 1 ? '🔔 La sirène retentit. On joue jusqu’à la sortie du ballon.' : '🔔 Sirène ! Le temps est écoulé — ballon mort et c’est terminé.'); }
  if (jeuVivant) for (const p of e.pions) if (p.surLeTerrain) p.minutesJouees += dt / 60;
  if (jeuVivant && e.minute >= 45) gererRemplacements(e);

  const ctx: Contexte = { ballon: e.ballon, possession: e.possession, systeme: e.systeme, porteur: e.porteur ? e.porteur.pos : null, consigne: e.consigne, perceeEnCours: e.perceeEnCours };
  if (e.placementFige) { for (const p of e.pions) { const cible = e.placementFige[p.id]; if (cible) p.cible = cible; } } else placer(e.pions, ctx);

  if (e.vol) { e.vol.ecoule += dt; const k = Math.min(1, e.vol.ecoule / e.vol.duree); e.ballon = { x: e.vol.de.x + (e.vol.vers.x - e.vol.de.x) * k, y: e.vol.de.y + (e.vol.vers.y - e.vol.de.y) * k }; }
  for (const p of e.pions) { if (!p.surLeTerrain) continue; p.recuperation = Math.max(0, p.recuperation - dt); if (p === e.porteur) continue; deplacer(p, dt); }

  e.minuteur -= dt;
  switch (e.phase) {
    case 'coupEnvoi': return phaseCoupEnvoi(e); case 'jeuCourant': return phaseJeuCourant(e, dt); case 'ruck': return phaseRuck(e); case 'melee': return phaseMelee(e); case 'touche': return phaseTouche(e); case 'maul': return phaseMaul(e, dt); case 'coupDePied': return phaseCoupDePied(e); case 'tirAuBut': return phaseTirAuBut(e); case 'apresEssai': return phaseApresEssai(e); case 'miTemps': return phaseMiTemps(e); default: return;
  }
}

function phaseCoupEnvoi(e: EtatMatch): void {
  if (e.minuteur > 0) return; const campQuiEngage = e.possession; const s = sens(campQuiEngage);
  const buteur = surLeTerrain(e, campQuiEngage).find((p) => p.numero === 10) ?? choisirPorteur(e, campQuiEngage);
  const arrivee = { x: e.ballon.x + s * (30 + e.rng() * 15), y: borner(e.ballon.y + (e.rng() * 24 - 12), 10, LARGEUR - 10) };
  const defenseurs = surLeTerrain(e, adverse(campQuiEngage)); const receveur = plusProche(arrivee, defenseurs) ?? defenseurs[0];
  e.vol = { de: { ...e.ballon }, vers: arrivee, duree: 2.8, ecoule: 0, type: 'passe', intention: 'passe', auteur: buteur, receveur: receveur };
  e.porteur = null; e.phase = 'jeuCourant'; e.phasesDeJeu = 0; buteur.stats.coupsDePied += 1;
  dire(e, 'pied', campQuiEngage, `${buteur.nom} donne le coup d'envoi long et haut !`, 0, buteur.moi);
}

function choisirPorteur(e: EtatMatch, cote: Cote): Pion { const liste = surLeTerrain(e, cote); return liste.find((p) => p.numero === 10) ?? liste.find((p) => p.numero === 9) ?? liste[0]; }
function donnerBallon(e: EtatMatch, p: Pion): void { e.placementFige = null; e.porteur = p; e.possession = p.cote; e.ballon = { ...p.pos }; p.stats.courses += 1; e.prochaineDecision = 0.3 + e.rng() * 0.3; e.systeme = choisirSysteme(e.ballon, adverse(p.cote), e.minute, ecart(e, adverse(p.cote))); }
function ecart(e: EtatMatch, cote: Cote): number { return cote === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA; }

function phaseJeuCourant(e: EtatMatch, dt: number): void {
  if (e.vol && e.vol.type === 'passe') {
    if (e.vol.ecoule < e.vol.duree) return;
    const receveur = e.vol.receveur; e.vol = null;
    if (receveur && receveur.surLeTerrain) {
      const libre = e.perceeEnCours; e.perceeEnCours = false; donnerBallon(e, receveur);
      e.prochaineDecision = libre ? 1.5 : 0.4 + e.rng() * 0.4; return;
    }
    return formerRuck(e, e.ballon);
  }

  const porteur = e.porteur; if (!porteur) { formerRuck(e, e.ballon); return; }
  const s = sens(porteur.cote); const defenseurs = surLeTerrain(e, adverse(porteur.cote));
  const menace = plusProche(porteur.pos, defenseurs); const pression = menace ? distance(porteur.pos, menace.pos) : 99;

  // 🧠 Le joueur fonce tout droit et accélère !
  let viseeY = porteur.pos.y; if (menace && pression < 8) viseeY += menace.pos.y > porteur.pos.y ? -5 : 5;
  porteur.cible = { x: porteur.pos.x + s * 15, y: borner(viseeY, 2, LARGEUR - 2) };
  const parcouru = deplacer(porteur, dt); porteur.stats.metres += parcouru; e.ballon = { ...porteur.pos };

  const ligne = ligneAdverse(porteur.cote); if (porteur.cote === 'A' ? porteur.pos.x >= ligne : porteur.pos.x <= ligne) return conclureEssai(e, porteur);
  if (enTouche(porteur.pos)) { dire(e, 'touche', porteur.cote, `${porteur.nom} poussé en touche.`, 0, porteur.moi); return arretDeJeu(e, 'touche', adverse(porteur.cote), porteur.pos); }
  for (const d of defenseurs) { if (porteur.recuperation > 0) break; if (d.recuperation > 0) continue; if (distance(d.pos, porteur.pos) > RAYON_PLAQUAGE) continue; return resoudrePlaquage(e, porteur, d); }

  e.prochaineDecision -= dt; if (e.prochaineDecision > 0) return;
  e.prochaineDecision = 0.8;
  const decision = deciderAvecLeBallon(e, porteur, pression);
  if (decision === 'pied') return taperAuPied(e, porteur);
  if (decision === 'passe') return passerLeBallon(e, porteur, pression);
}

function plusProche(p: Vec, liste: Pion[]): Pion | null { let meilleur: Pion | null = null; let d = Infinity; for (const q of liste) { const dd = distance(p, q.pos); if (dd < d) { d = dd; meilleur = q; } } return meilleur; }
type Decision = 'porter' | 'passe' | 'pied';

function deciderAvecLeBallon(e: EtatMatch, p: Pion, pression: number): Decision {
  const distLigne = Math.abs(ligneAdverse(p.cote) - p.pos.x);
  if (distLigne < 15 && pression > 8) return 'porter';
  const r = e.rng(); const mene = ecart(e, p.cote) < 0; if (e.sirene && !mene) return 'pied';
  const minutesRestantes = 80 - e.minute;

  if (estDansSes22(p) && r < 0.25) return 'pied';
  if (p.numero === 9 && e.phasesDeJeu >= 3 && r < 0.15) return 'pied';
  if ((p.numero === 10 || p.numero === 15) && p.pied > 60) {
    if (dansSonCamp(p.pos, p.cote) && e.phasesDeJeu >= 2 && arriereGardeMontee(e, adverse(p.cote)) && r < 0.10) return 'pied';
    if (!dansSonCamp(p.pos, p.cote) && distLigne < 35 && r < 0.15) return 'pied';
  }
  if (minutesRestantes <= 5 && ecart(e, p.cote) > 7) return 'porter';

  // 🧠 FIXER ET DONNER : S'il y a de l'espace on COURS, sinon on LÂCHE LA BALLE.
  if (pression > 8) return 'porter';
  if (p.avant) return e.rng() < 0.25 ? 'passe' : 'porter';
  else return e.rng() < 0.80 ? 'passe' : 'porter';
}

function estDansSes22(p: Pion): boolean { return p.cote === 'A' ? p.pos.x < LIGNE_A + 22 : p.pos.x > LIGNE_B - 22; }
function arriereGardeMontee(e: EtatMatch, defenseur: Cote): boolean { const fond = surLeTerrain(e, defenseur).filter((p) => p.numero === 11 || p.numero === 14); return fond.every((p) => Math.abs(p.pos.x - e.ballon.x) < 26); }

function passerLeBallon(e: EtatMatch, p: Pion, pression: number): void {
  const partenaires = surLeTerrain(e, p.cote).filter((q) => q !== p); const s = sens(p.cote);
  const distMax = p.avant ? 12 : 30;

  const valides = partenaires.filter((q) => {
    const profondeur = (q.pos.x - p.pos.x) * s; const ecartLateral = Math.abs(q.pos.y - p.pos.y);
    // Tolérance 1.5m en avant (course lancée), interdit plus de 3.5m en arrière
    return profondeur <= 1.5 && profondeur >= -(3.5 + ecartLateral * 0.3) && distance(q.pos, p.pos) < distMax;
  });
  if (!valides.length) return;

  let receveur: Pion | undefined;

  if (p.numero === 9) {
    if (e.rng() < 0.4) {
      const avants = valides.filter((q) => q.avant);
      receveur = avants.length > 0 ? avants[Math.floor(e.rng() * Math.min(3, avants.length))] : valides.find((q) => q.numero === 10);
    } else receveur = valides.find((q) => q.numero === 10) ?? valides.find((q) => !q.avant);
  } else if (!p.avant) {
    const ordreLigne = [10, 12, 13, 11, 14]; const monIndex = ordreLigne.indexOf(p.numero);
    if (monIndex >= 0) {
      const numCible = ordreLigne[monIndex + 1];
      if (numCible) { const potentiel = valides.find(q => q.numero === numCible); if (potentiel && distance(p.pos, potentiel.pos) > 2) receveur = potentiel; }
      if (!receveur) { const numSaute = ordreLigne[monIndex + 2]; if (numSaute) receveur = valides.find(q => q.numero === numSaute); }
    }
  }
  receveur ??= valides.sort((a, b) => distance(p.pos, b.pos) - distance(p.pos, a.pos))[0]; // fallback : le plus loin
  if (!receveur) return;

  p.stats.passes += 1;
  const difficulte = 0.012 + Math.max(0, 4 - pression) * 0.012 + distance(p.pos, receveur.pos) / 900;
  if (e.rng() < difficulte * (1 - p.passe / 260)) {
    p.stats.passes -= 1; p.stats.passesRatees += 1;
    dire(e, 'jeu', p.cote, `En-avant de ${p.nom} !`, 0, p.moi); return arretDeJeu(e, 'melee', adverse(p.cote), p.pos);
  }

  const pres = Math.abs(ligneAdverse(p.cote) - p.pos.x) < 30;
  const engages = surLeTerrain(e, adverse(p.cote)).filter((d) => distance(d.pos, p.pos) < 6).sort((a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos)).slice(0, 2);
  for (const d of engages) d.recuperation = pres ? 2.2 : 1.4;

  const marqueurs = surLeTerrain(e, adverse(p.cote)); const garde = plusProche(receveur.pos, marqueurs.filter((d) => d.recuperation <= 0));
  const espace = garde ? distance(receveur.pos, garde.pos) : 99;

  const d = distance(p.pos, receveur.pos); e.porteur = null;
  e.vol = { de: { ...p.pos }, vers: { ...receveur.pos }, duree: Math.max(0.3, d / 16), ecoule: 0, type: 'passe', intention: 'passe', auteur: p, receveur };
  e.perceeEnCours = espace > 11;
  if (espace > 11) {
    dire(e, 'jeu', p.cote, `${p.nom} trouve ${receveur.nom} dans l’intervalle !`, 0, p.moi || receveur.moi);
    for (const d of marqueurs) { if (d.numero === 15) continue; if (distance(d.pos, receveur.pos) < 16) d.recuperation = Math.max(d.recuperation, 2.6); }
  }
}

function taperAuPied(e: EtatMatch, p: Pion): void {
  const s = sens(p.cote); p.stats.coupsDePied += 1;
  let intention: Vol['intention'] = 'occupation'; let arrivee: Vec; let duree = 2.4;
  const distLigne = Math.abs(ligneAdverse(p.cote) - p.pos.x);

  if (p.numero === 10 && dansLes22(p.pos, adverse(p.cote)) && e.phasesDeJeu >= 5 && e.rng() < 0.3) {
    intention = 'drop'; const reussi = e.rng() < 0.32 + p.pied / 300; p.stats.butsTentes += 1;
    if (reussi) { p.stats.butsReussis += 1; marquer(e, p.cote, 3); dire(e, 'but', p.cote, `DROP de ${p.nom} !`, 3, p.moi); return arretDeJeu(e, 'coupEnvoi', adverse(p.cote), { x: MILIEU, y: LARGEUR / 2 }); }
    dire(e, 'butRate', p.cote, `Drop raté de ${p.nom}.`, 0, p.moi); return arretDeJeu(e, 'coupEnvoi', adverse(p.cote), { x: MILIEU, y: LARGEUR / 2 });
  }
  else if (!dansSonCamp(p.pos, p.cote) && distLigne < 35 && e.rng() < 0.4) {
    intention = 'grubber'; arrivee = { x: borner(p.pos.x + s * 15, LIGNE_A + 2, LIGNE_B - 2), y: borner(p.pos.y + (e.rng() * 16 - 8), 5, LARGEUR - 5) }; duree = 1.4;
  }
  else if (p.numero === 10 && e.phasesDeJeu >= 2 && p.pied > 65 && e.rng() < 0.25) {
    intention = 'transversale'; const ailiers = surLeTerrain(e, p.cote).filter(q => q.numero === 11 || q.numero === 14);
    const ailier = ailiers.sort((a, b) => Math.abs(b.pos.y - p.pos.y) - Math.abs(a.pos.y - p.pos.y))[0] ?? p;
    arrivee = { x: borner(p.pos.x + s * 22, LIGNE_A + 5, LIGNE_B - 5), y: ailier.pos.y }; duree = 2.5;
  }
  else if (p.numero === 9 && e.phasesDeJeu >= 3) {
    intention = 'chandelle'; arrivee = { x: p.pos.x + s * 22, y: borner(p.pos.y + (e.rng() * 16 - 8), 4, LARGEUR - 4) }; duree = 3.6;
  }
  else if (dansSonCamp(p.pos, p.cote) && arriereGardeMontee(e, adverse(p.cote)) && p.pied > 62) {
    intention = '50/22'; const cibleX = p.cote === 'A' ? LIGNE_B - 12 : LIGNE_A + 12; arrivee = { x: cibleX, y: p.pos.y < LARGEUR / 2 ? 1 : LARGEUR - 1 }; duree = 3;
  } else { arrivee = { x: borner(p.pos.x + s * (34 + p.pied / 3), LIGNE_A - 4, LIGNE_B + 4), y: p.pos.y < LARGEUR / 2 ? -1 : LARGEUR + 1 }; duree = 3.2; }

  e.vol = { de: { ...p.pos }, vers: arrivee, duree, ecoule: 0, type: 'pied', intention, auteur: p };
  e.porteur = null; e.phase = 'coupDePied'; e.minuteur = duree;
  if (intention === 'transversale') dire(e, 'pied', p.cote, `🪄 ${p.nom} tente une transversale !`, 0, p.moi);
  else if (intention === 'grubber') dire(e, 'pied', p.cote, `⚡ ${p.nom} glisse un coup de pied rasant...`, 0, p.moi);
  else dire(e, 'pied', p.cote, `${p.nom} tape au pied.`, 0, p.moi);
}

function phaseCoupDePied(e: EtatMatch): void {
  const v = e.vol; if (!v) { formerRuck(e, e.ballon); return; } if (v.ecoule < v.duree) return;
  const auteur = v.auteur; const camp = auteur.cote; e.vol = null;

  if (v.intention === '50/22') {
    if (e.rng() < 0.34 + auteur.pied / 260 + auteur.vision / 400) { dire(e, 'pied', camp, `🎯 50/22 RÉUSSI !`, 0, auteur.moi); return arretDeJeu(e, 'touche', camp, e.ballon); }
    return arretDeJeu(e, 'melee', adverse(camp), { x: e.ballon.x, y: LARGEUR / 2 });
  }
  if (v.intention === 'grubber') {
    const mien = e.pions.filter((p) => p.surLeTerrain && distance(p.pos, e.ballon) < 10 && p.cote === camp);
    if (mien.length > 0 && e.rng() < 0.55) { dire(e, 'pied', camp, `🔥 Magnifique ! ${mien[0].nom} récupère le ballon !`, 0, mien[0].moi); donnerBallon(e, mien[0]); e.phase = 'jeuCourant'; e.phasesDeJeu = 0; return; }
    return formerRuck(e, e.ballon);
  }
  if (v.intention === 'transversale') {
    const mien = e.pions.filter((p) => p.surLeTerrain && distance(p.pos, e.ballon) < 14 && p.cote === camp);
    if (mien.length > 0 && e.rng() < 0.65) { dire(e, 'pied', camp, `🏉 Transversale captée !`, 0, mien[0].moi); donnerBallon(e, mien[0]); e.phase = 'jeuCourant'; e.phasesDeJeu = 0; return; }
    return formerRuck(e, e.ballon);
  }
  if (v.intention === 'chandelle') {
    const mien = e.pions.filter((p) => p.surLeTerrain && distance(p.pos, e.ballon) < 14 && p.cote === camp);
    if (mien.length > 0 && e.rng() < 0.42) { donnerBallon(e, mien[0]); e.phase = 'jeuCourant'; e.phasesDeJeu = 0; return; }
    return formerRuck(e, e.ballon);
  }
  return arretDeJeu(e, 'touche', v.intention === 'penaltouche' ? camp : adverse(camp), e.ballon);
}

function resoudrePlaquage(e: EtatMatch, porteur: Pion, defenseur: Pion): void {
  const force = defenseur.plaquage * (0.7 + defenseur.endurance / 330); const resistance = porteur.evitement * 0.6 + porteur.puissance * 0.4;
  if (e.rng() >= 0.93 + (force - resistance) / 320) { defenseur.stats.plaquagesManques += 1; defenseur.pos.x -= sens(porteur.cote) * 4; defenseur.recuperation = 4; porteur.recuperation = 1.2; return; }
  defenseur.stats.plaquages += 1; porteur.stats.courses += 0;
  if (e.rng() < 0.016) {
    dire(e, 'penalite', porteur.cote, `Pénalité ! Plaquage haut.`, 0, defenseur.moi);
    if (e.rng() < 0.07) defenseur.surLeTerrain = false;
    return gererPenalite(e, porteur.cote, { ...porteur.pos });
  }
  if (e.rng() < 0.08) {
    const soutiens = surLeTerrain(e, porteur.cote).filter(q => q !== porteur && (q.pos.x - porteur.pos.x) * sens(porteur.cote) <= 1.0 && distance(q.pos, porteur.pos) < 10);
    if (soutiens.length > 0) {
      const receveur = soutiens.sort((a, b) => distance(porteur.pos, a.pos) - distance(porteur.pos, b.pos))[0];
      dire(e, 'jeu', porteur.cote, `🪄 Offload de ${porteur.nom} !`, 0, porteur.moi || receveur.moi);
      e.vol = { de: { ...porteur.pos }, vers: { ...receveur.pos }, duree: 0.4, ecoule: 0, type: 'passe', intention: 'passe', auteur: porteur, receveur }; e.porteur = null; return;
    }
  }
  formerRuck(e, { ...porteur.pos });
}

function formerRuck(e: EtatMatch, lieu: Vec): void {
  e.ballon = { ...lieu }; e.porteur = null; e.phase = 'ruck';
  e.minuteur = 3 + e.rng() * 3; e.phasesDeJeu += 1; e.vol = null;
  e.placementFige = placementRuck(e.pions, e.ballon, e.possession);
}

function phaseRuck(e: EtatMatch): void {
  if (e.minuteur > 0) return;
  if (e.rng() < 0.08) {
    const pourAttaque = e.rng() < 0.5; const equipeBeneficiaire = pourAttaque ? e.possession : adverse(e.possession);
    dire(e, 'penalite', equipeBeneficiaire, pourAttaque ? `Pénalité ! Plaqueur au sol.` : `Pénalité ! Ballon gardé.`, 0); return gererPenalite(e, equipeBeneficiaire, e.ballon);
  }
  const proches = e.pions.filter((p) => p.surLeTerrain && p.avant).sort((a, b) => distance(a.pos, e.ballon) - distance(b.pos, e.ballon)).slice(0, 6);
  const gratteur = proches.filter((p) => p.cote !== e.possession).find((p) => p.numero === 7 || p.numero === 6 || p.numero === 2);
  if (gratteur && e.rng() < 0.15 + gratteur.plaquage / 500) {
    gratteur.stats.grattages += 1; dire(e, 'ruck', gratteur.cote, `🪝 Contest ! Ballon récupéré !`, 0, gratteur.moi);
    e.possession = gratteur.cote; e.phasesDeJeu = 0;
  }
  for (const p of proches.filter((q) => q.cote === e.possession)) p.stats.rucksNettoyes += 1;

  const neuf = surLeTerrain(e, e.possession).find((p) => p.numero === 9) ?? choisirPorteur(e, e.possession);
  for (const d of surLeTerrain(e, adverse(e.possession))) if (distance(d.pos, e.ballon) < 11) d.recuperation = Math.max(d.recuperation, 1.3);
  donnerBallon(e, neuf); e.prochaineDecision = 0.25; e.phase = 'jeuCourant'; finDeBallonMort();
}

function arretDeJeu(e: EtatMatch, quoi: Phase | 'coupEnvoi', pour: Cote, lieu: Vec): void {
  if (e.sirene) return clorePeriode(e);
  e.possession = pour; e.phasesDeJeu = 0; e.porteur = null; e.ballon = { ...lieu };
  if (quoi === 'coupEnvoi') { e.ballon = { x: MILIEU, y: LARGEUR / 2 }; e.phase = 'coupEnvoi'; e.minuteur = 12; placerPourCoupEnvoi(e); return; }
  e.phase = quoi as Phase; e.vol = null; e.minuteur = quoi === 'touche' ? 30 : 45;
  if (quoi === 'touche') { e.ballon.y = e.ballon.y < LARGEUR / 2 ? 0.5 : LARGEUR - 0.5; e.placementFige = placementTouche(e.pions, e.ballon, pour, e.rng() < 0.35 ? 4 : 6); }
  else if (quoi === 'melee') { e.placementFige = placementMelee(e.pions, e.ballon, pour); }
}

function finDeBallonMort(): void {}

function phaseTouche(e: EtatMatch): void {
  if (e.minuteur > 0) return; const cote = e.possession; const avants = surLeTerrain(e, cote).filter((p) => p.avant);
  const reduite = e.rng() < 0.35; const fond = e.rng() < 0.4;
  const sauteur = avants.find((p) => p.numero === (fond ? 5 : 4)) ?? avants[0] ?? choisirPorteur(e, cote);
  if (e.rng() >= (fond ? 0.78 : 0.9)) { e.possession = adverse(cote); donnerBallon(e, choisirPorteur(e, e.possession)); e.phase = 'jeuCourant'; return; }

  if (Math.abs(ligneAdverse(cote) - e.ballon.x) < 9 && !reduite) {
    e.phase = 'maul'; e.minuteur = 6; const lanceur = surLeTerrain(e, cote).find((p) => p.numero === 2) || choisirPorteur(e, cote);
    e.vol = { de: { ...lanceur.pos }, vers: { ...sauteur.pos }, duree: 1.5, ecoule: 0, type: 'passe', intention: 'passe', auteur: lanceur, receveur: sauteur }; e.porteur = null; return;
  }
  const lanceur = surLeTerrain(e, cote).find((p) => p.numero === 2) || choisirPorteur(e, cote);
  e.vol = { de: { ...lanceur.pos }, vers: { ...sauteur.pos }, duree: 1.5, ecoule: 0, type: 'passe', intention: 'passe', auteur: lanceur, receveur: sauteur }; e.porteur = null; e.phase = 'jeuCourant'; e.phasesDeJeu = 0;
}

function phaseMaul(e: EtatMatch, dt: number): void {
  const cote = e.possession; const s = sens(cote);
  const avants = surLeTerrain(e, cote).filter((p) => p.avant); const advAvants = surLeTerrain(e, adverse(cote)).filter((p) => p.avant);
  const poussee = (avants.length ? avants.reduce((a, b) => a + b.puissance, 0) / avants.length : 50) - (advAvants.length ? advAvants.reduce((a, b) => a + b.puissance, 0) / advAvants.length : 50);
  e.ballon.x += s * borner(0.7 + poussee / 60, 0.15, 1.4) * dt;
  for (const p of avants) p.cible = { x: e.ballon.x - s * 1.2, y: e.ballon.y + (p.numero - 4) * 1.3 };
  for (const p of advAvants) p.cible = { x: e.ballon.x + s * 1.2, y: e.ballon.y + (p.numero - 4) * 1.3 };
  if (cote === 'A' ? e.ballon.x >= ligneAdverse(cote) : e.ballon.x <= ligneAdverse(cote)) {
    const marqueur = avants.find((p) => p.numero === 2) ?? avants[0] ?? choisirPorteur(e, cote);
    marqueur.pos = { ...e.ballon }; return conclureEssai(e, marqueur, 'au terme du ballon porté');
  }
  if (e.minuteur <= 0) formerRuck(e, e.ballon);
}

function phaseMelee(e: EtatMatch): void {
  if (e.minuteur > 0) return; const cote = e.possession;
  const mien = surLeTerrain(e, cote).filter((p) => p.avant); const adv = surLeTerrain(e, adverse(cote)).filter((p) => p.avant);
  const dom = (mien.length ? mien.reduce((a, b) => a + b.puissance, 0) / mien.length : 50) - (adv.length ? adv.reduce((a, b) => a + b.puissance, 0) / adv.length : 50);
  if (dom < -8 && e.rng() < 0.4) return gererPenalite(e, adverse(cote), { ...e.ballon });
  const huit = mien.find((p) => p.numero === 8);
  if (huit && dom > 4 && e.rng() < 0.45) { donnerBallon(e, huit); e.phase = 'jeuCourant'; e.phasesDeJeu = 0; return; }
  donnerBallon(e, choisirPorteur(e, cote)); e.phase = 'jeuCourant'; e.phasesDeJeu = 0;
}

function gererPenalite(e: EtatMatch, pour: Cote, lieu: Vec): void {
  const monEcart = ecart(e, pour); const restantes = 80 - e.minute; const dist = Math.abs(ligneAdverse(pour) - lieu.x);
  if (((dist < 42 && restantes <= 12 && monEcart < 0 && monEcart >= -3) || (dist < 42 && restantes <= 12 && monEcart >= 0 && monEcart <= 2) || (dist < 30 && e.rng() < 0.55) || (dist < 42 && e.rng() < 0.3)) && !(restantes <= 15 && monEcart <= -4)) {
    const buteur = choisirButeur(e, pour); e.phase = 'tirAuBut'; e.minuteur = 55; e.ballon = { ...lieu }; e.tir = { buteur, distance: dist, valeur: 3 }; return;
  }
  arretDeJeu(e, 'touche', pour, { x: pour === 'A' ? Math.min(LIGNE_B - 5, lieu.x + 30) : Math.max(LIGNE_A + 5, lieu.x - 30), y: lieu.y < LARGEUR / 2 ? 0.5 : LARGEUR - 0.5 });
}

function choisirButeur(e: EtatMatch, cote: Cote): Pion { const liste = surLeTerrain(e, cote); return [...liste].sort((a, b) => b.pied - a.pied)[0] ?? liste[0]; }

function phaseTirAuBut(e: EtatMatch): void {
  if (e.minuteur > 0) return; const tir = e.tir; e.tir = null;
  if (!tir) return arretDeJeu(e, 'coupEnvoi', e.possession, e.ballon);
  const { buteur, distance: d, valeur } = tir; buteur.stats.butsTentes += 1;
  if (e.rng() < borner(0.95 - d / 70 + buteur.pied / 320, 0.35, 0.96)) { buteur.stats.butsReussis += 1; marquer(e, buteur.cote, valeur); dire(e, 'but', buteur.cote, `But de ${buteur.nom} !`, valeur, buteur.moi); }
  if (e.sirene) return clorePeriode(e); arretDeJeu(e, 'coupEnvoi', adverse(buteur.cote), { x: MILIEU, y: LARGEUR / 2 });
}

function marquer(e: EtatMatch, cote: Cote, points: number): void { if (cote === 'A') { e.scoreA += points; e.resteA -= points; } else { e.scoreB += points; e.resteB -= points; } }

function conclureEssai(e: EtatMatch, marqueur: Pion, precision = ''): void {
  const cote = marqueur.cote; marqueur.stats.essais += 1; marquer(e, cote, 5);
  dire(e, 'essai', cote, `ESSAI ! ${marqueur.nom} aplatit ${precision || 'en force'} !`, 5, marqueur.moi);
  const buteur = choisirButeur(e, cote); buteur.stats.butsTentes += 1;
  if (e.rng() < borner(0.92 - (Math.abs(marqueur.pos.y - LARGEUR / 2) / (LARGEUR / 2)) * 0.35 + buteur.pied / 400, 0.4, 0.97)) { buteur.stats.butsReussis += 1; marquer(e, cote, 2); dire(e, 'but', cote, `Transformation réussie.`, 2, buteur.moi); } else { dire(e, 'butRate', cote, `Transformation manquée.`, 0, buteur.moi); }
  e.phase = 'apresEssai'; e.minuteur = 70; e.possession = adverse(cote);
}

function phaseApresEssai(e: EtatMatch): void { if (e.minuteur <= 0) { if (e.sirene) clorePeriode(e); else arretDeJeu(e, 'coupEnvoi', e.possession, { x: MILIEU, y: LARGEUR / 2 }); } }

function clorePeriode(e: EtatMatch): void {
  if (e.periode === 1) { e.periode = 2; e.sirene = false; e.t = DUREE_PERIODE; e.phase = 'miTemps'; e.minuteur = 3; dire(e, 'jalon', null, `Mi-temps : ${e.scoreA} – ${e.scoreB}`); return; }
  e.phase = 'fini'; e.fini = true; dire(e, 'jalon', null, `Fin du match : ${e.scoreA} – ${e.scoreB}`);
}

function phaseMiTemps(e: EtatMatch): void { if (e.minuteur <= 0) { e.possession = 'A'; arretDeJeu(e, 'coupEnvoi', 'A', { x: MILIEU, y: LARGEUR / 2 }); } }

function gererRemplacements(e: EtatMatch): void {
  for (const cote of ['A', 'B'] as Cote[]) {
    if ((cote === 'A' ? e.remplacementsA : e.remplacementsB) >= 6) continue;
    const sur = surLeTerrain(e, cote); const fatigues = sur.filter((p) => p.endurance < (p.avant ? 34 : 26) && (!p.moi || e.minute >= 65)).sort((a, b) => a.endurance - b.endurance);
    const surLeBanc = e.pions.find((p) => p.cote === cote && p.moi && !p.surLeTerrain && p.minutesJouees === 0);
    const familleDe = (x: Pion) => POSTE_PAR_ID[x.poste]?.famille;
    const epuise = surLeBanc ? (fatigues.find((p) => p.poste === surLeBanc.poste) ?? fatigues.find((p) => familleDe(p) === familleDe(surLeBanc)) ?? fatigues.find((p) => p.avant === surLeBanc.avant) ?? fatigues[0]) : fatigues[0];
    if (!epuise) continue;
    const banc = e.pions.filter((p) => p.cote === cote && !p.surLeTerrain && p.minutesJouees === 0);
    const entrant = banc.find((p) => p.moi && p.avant === epuise.avant) ?? banc.find((p) => p.avant === epuise.avant) ?? banc.find((p) => p.moi) ?? banc[0];
    if (!entrant) continue;
    epuise.surLeTerrain = false; entrant.surLeTerrain = true; entrant.numero = epuise.numero; entrant.poste = epuise.poste; entrant.avant = epuise.avant; entrant.pos = { ...epuise.pos }; entrant.cible = { ...epuise.pos };
    if (cote === 'A') e.remplacementsA += 1; else e.remplacementsB += 1;
    dire(e, 'remplacement', cote, `🔄 ${entrant.nom} remplace ${epuise.nom}.`, 0, entrant.moi || epuise.moi);
  }
}

export function appliquerConsigne(e: EtatMatch, c: ConsigneJoueur | undefined): void { e.consigne = c; if (c) dire(e, 'jeu', null, `📣 Consigne : « ${c.libelle} »`); }
export interface BilanMatch { scoreA: number; scoreB: number; parJoueur: { nom: string; club: string; numero: number; stats: Pion['stats']; minutes: number }[]; }
export function bilan(e: EtatMatch): BilanMatch { return { scoreA: e.scoreA, scoreB: e.scoreB, parJoueur: e.pions.filter((p) => p.minutesJouees > 0).map((p) => ({ nom: p.nom, club: nomClub(e, p.cote), numero: p.numero, stats: p.stats, minutes: Math.round(p.minutesJouees) })) }; }
export function pionDuJoueur(etat: EtatMatch): Pion | undefined { return etat.pions.find((p) => p.moi); }