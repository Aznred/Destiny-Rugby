// LE CORRECTIF 40, MESURÉ — le coup de pied en une seule action (niveau 8), et la fiche des joueuses.
//
//   « un input = une seule action de kick = une seule animation = un seul événement de contact = départ immédiat et
//     synchronisé du ballon »
//
// Ce banc joue des coups de pied construits (à l'arrêt, au trot, en plein sprint, à reculons, sous un plaqueur) et des
// matchs entiers, et vérifie ce qui ne doit plus jamais arriver : un armé relancé, un botteur qui revient sur ses pas, un
// instant de contact qui bouge, deux coups de pied pour deux appuis rapprochés. Il vérifie aussi que le niveau 7 fait
// encore ce qu'il faisait (le correctif est derrière le niveau 8), et que chaque carte de joueuse trouve son portrait,
// son écusson et le logo de sa ligue par le même chemin que les cartes de joueurs.
//
// L'image (clip calé sur le contact, ballon qui part du pied) se vérifie à côté, sans affichage :
//   node verifier_frappes.mjs        (depuis ../analyse-rn26)
//
// Lancer : npm run verify:correctif40
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { avancer, DT } from '../src/lib/moteur/moteur';
import type { EtatMatch } from '../src/lib/moteur/etat';
import type { Pion } from '../src/lib/moteur/entites';
import { commanderDirect, demanderDirect, type DemandeDirecte } from '../src/lib/moteur/direct';
import { AMORCE_EN_PAS, contactDeFrappe, frappeFranche, gesteDeFrappe, pasDOrientation, planDeFrappe } from '../src/lib/moteur/frappe';
import { AXE, adverse, sens } from '../src/lib/moteur/terrain';
import { creerMatchDEmpreinte } from './outilsEmpreinte';
import { situationDeFrappe, sonderUneFrappe } from './outilsFrappes40';
import { IA_MATCH_DE_CARRIERE } from '../src/lib/moteur/ia/reglages';
import { catalogueMondialCarriere } from '../src/lib/ligue/catalogueCarriere';
import { fournirPoolFfr } from '../src/lib/ligue/eligibiliteJoueurs';
import { CHAMPIONNATS_FEMININS_PAR_NOM, logoChampionnat } from '../src/lib/logoChampionnat';
import { CHAMPIONNATS_FEMININS } from '../src/data/mondeFeminin.generated';
import { LOGO_COMPETITION } from '../src/data/logosCompetitions';
import { blasonCarteFeminine } from '../src/lib/useBlasonCarte';
import { SILHOUETTE_JOUEUR, SILHOUETTE_JOUEUSE, imageDe, portraitsDe } from '../src/lib/imageJoueur';

let ok = 0;
const verifier = (condition: unknown, message: string) => { assert.ok(condition, message); ok++; };
const GESTES = new Set(['grubber', 'chip', 'punt', 'box_kick', 'drop', 'restart']);
const gestesDeFrappe = (e: EtatMatch, id: string) => (e.gestes ?? []).filter((g) => g.joueurId === id && GESTES.has(g.clip));
const pres = (a: number, b: number) => Math.abs(a - b) < 1e-6;

function poser(p: Pion, x: number, y: number, vx = 0, vy = 0): void {
  p.pos = { x, y }; p.cible = { x, y }; p.vitesse = { x: vx, y: vy };
  p.corps = undefined; p.battu = 0; p.sanction = 0; p.surLeTerrain = true; p.role = 'ligne';
}
/** Le joueur conduit, ballon en main au milieu du terrain, lancé à `vitesse` m/s vers l'avant (négative : à reculons). */
function porteur(k: number, vitesse: number, x = 12): { e: EtatMatch; h: Pion; s: number } {
  const { e, h } = situationDeFrappe(k);
  const s = sens(h.cote);
  poser(h, 61 - s * x, AXE, s * vitesse, 0);
  e.porteur = h; e.possession = h.cote; e.ballon = { ...h.pos };
  e.origine = { x: h.pos.x - s * 3, y: h.pos.y }; e.ligneAvantage = h.pos.x;
  // Un pas, pour que le moteur écrive ce que le joueur peut jouer ; puis l'allure voulue, exactement.
  commanderDirect(e, 0, 0, false); avancer(e, DT);
  h.vitesse = { x: s * vitesse, y: 0 };
  return { e, h, s };
}

console.log(`— Niveau du jeu : ${IA_MATCH_DE_CARRIERE} —`);
verifier(IA_MATCH_DE_CARRIERE >= 8, 'les matchs de carrière jouent le coup de pied en une seule action');
verifier(frappeFranche({ ia: 8 }) && !frappeFranche({ ia: 7 }) && !frappeFranche({}), 'le niveau 8, et lui seul, l\'active');
verifier(pres(DT, 0.15), 'le pas du moteur est celui que les amorces supposent');

console.log('— Un geste par coup de pied, une amorce par geste —');
{
  verifier(gesteDeFrappe('rasant', 10, 8) === 'rasant' && gesteDeFrappe('parDessus', 12, 5) === 'parDessus' && gesteDeFrappe('drop', 10, 0) === 'drop', 'rasant, par-dessus et drop ont leur geste');
  verifier(gesteDeFrappe('degagement', 15, 6) === 'course' && gesteDeFrappe('chandelle', 10, 3) === 'course' && gesteDeFrappe('transversale', 10, 7) === 'course', 'les autres se tapent dans la course');
  verifier(gesteDeFrappe('chandelle', 9, 0.5, true) === 'boite' && gesteDeFrappe('chandelle', 9, 0.5, false) === 'course' && gesteDeFrappe('chandelle', 9, 6, true) === 'course',
    'la boîte : le 9, à la sortie d\'un regroupement, presque à l\'arrêt');
  verifier(AMORCE_EN_PAS.rasant <= AMORCE_EN_PAS.course && AMORCE_EN_PAS.parDessus <= AMORCE_EN_PAS.course && AMORCE_EN_PAS.course < AMORCE_EN_PAS.drop && AMORCE_EN_PAS.course < AMORCE_EN_PAS.boite,
    'rasant et par-dessus les plus vifs, drop et boîte les plus longs');
  verifier(Object.values(AMORCE_EN_PAS).every((n) => n >= 1 && n <= 3), 'aucune amorce ne dépasse trois pas (0,45 s)');
  verifier(pasDOrientation({ x: 6, y: 0 }, { x: 0, y: 0 }, { x: 30, y: 4 }, 1) === 0, 'il tape devant lui : pas de correction d\'orientation');
  verifier(pasDOrientation({ x: -6, y: 0 }, { x: 0, y: 0 }, { x: 30, y: 0 }, 1) === 1, 'il court à reculons : un pas pour se tourner, pas plus');
  verifier(pasDOrientation({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: -30, y: 0 }, -1) === 0, 'à l\'arrêt il fait face au jeu');
  const plan = planDeFrappe('rasant', 10, { x: 7, y: 0 }, { x: 0, y: 0 }, { x: 20, y: 0 }, 1, 100, DT);
  verifier(pres(plan.armeA, 100) && pres(plan.contactA, 100 + DT), 'un rasant demandé au pas t est armé à t et tapé un pas plus tard');
}

console.log('— Demande → contact, à toutes les allures —');
{
  const types: [string, DemandeDirecte, number][] = [
    ['rasant', { action: 'coupDePied', intentionPied: 'rasant' }, AMORCE_EN_PAS.rasant],
    ['par-dessus', { action: 'coupDePied', intentionPied: 'parDessus' }, AMORCE_EN_PAS.parDessus],
    ['chandelle', { action: 'coupDePied', intentionPied: 'chandelle' }, AMORCE_EN_PAS.course],
    ['dégagement', { action: 'coupDePied', intentionPied: 'degagement' }, AMORCE_EN_PAS.course],
    ['visé', { action: 'coupDePied', visee: { x: 1, y: 0, puissance: 0.9, vif: 0.4 } }, AMORCE_EN_PAS.course],
    ['drop', { action: 'drop', auto: true }, AMORCE_EN_PAS.drop],
  ];
  for (const [nom, demande, pas] of types) for (const v of [0, 4, 8]) for (let k = 0; k < 4; k++) {
    const d = { ...demande, ...(demande.visee ? { visee: { ...demande.visee, x: 1 } } : {}) };
    const r = sonderUneFrappe(k, v, d);
    verifier(r.demandeContact !== null, `${nom} à ${v} m/s : le ballon part`);
    verifier(r.armes === 1, `${nom} à ${v} m/s : un seul armé (${r.armes})`);
    verifier(r.remises === 0, `${nom} à ${v} m/s : l'armé n'est jamais remis à zéro`);
    // La demande attend le pas suivant (0,15 s), puis l'amorce du geste.
    verifier(pres(r.demandeContact!, (1 + pas) * DT), `${nom} à ${v} m/s : contact ${((1 + pas) * DT).toFixed(2)} s après la demande (${r.demandeContact!.toFixed(2)})`);
    verifier(r.ecartDepart < 0.01, `${nom} à ${v} m/s : le ballon part de là où il est`);
    verifier(r.recul < 0.05, `${nom} à ${v} m/s : il ne revient jamais sur ses pas (${r.recul.toFixed(2)} m à rebours)`);
    if (v > 0) verifier(r.deplacement > 0.5, `${nom} à ${v} m/s : il tape sur sa course (${r.deplacement.toFixed(1)} m)`);
  }
}

console.log('— L\'action : un numéro, des instants qui ne bougent plus —');
{
  const { e, h, s } = porteur(0, 7);
  const frappesAvant = e.frappes ?? 0, coups = h.stats.coupsDePied;
  demanderDirect(e, { action: 'coupDePied', intentionPied: 'degagement' });
  const annonce = e.direct!.frappeAnnoncee;
  verifier(!!annonce && annonce.auteurId === h.id, 'la demande est ANNONCÉE à l\'image même de l\'appui, avant le pas du moteur');
  verifier(!e.piedPrepare, 'mais le moteur n\'a encore rien joué');
  commanderDirect(e, s, 0, true); avancer(e, DT);
  const a = e.piedPrepare!;
  verifier(!!a && a.auteurId === h.id && a.id === frappesAvant + 1, 'au pas suivant l\'action existe, avec son numéro');
  verifier(a.etat === 'arme' && a.geste === 'course', 'elle est armée, geste « course »');
  verifier(pres(a.contactA!, annonce!.contactA) && pres(a.armeA!, annonce!.armeA) && a.geste === annonce!.geste, 'aux instants et au geste que l\'annonce avait écrits');
  verifier(!e.direct!.frappeAnnoncee, 'l\'annonce est effacée : le moteur a pris le relais');
  verifier(gestesDeFrappe(e, h.id).length === 1, 'un geste de frappe, pas deux');
  const contactA = a.contactA!, arrivee = { ...a.arrivee };
  // Pendant l'amorce : le joueur s'agite sur son stick, redemande un coup de pied, un drop… rien ne bouge.
  let pas = 0;
  while (e.piedPrepare && pas++ < 10) {
    demanderDirect(e, { action: 'coupDePied', intentionPied: 'rasant' });
    demanderDirect(e, { action: 'drop', auto: true });
    verifier(e.direct!.file.length === 0, 'un second appui pendant le geste n\'entre même pas dans la file');
    commanderDirect(e, -s, 1, false);
    avancer(e, DT);
    if (e.piedPrepare) {
      verifier(e.piedPrepare.id === a.id && pres(e.piedPrepare.contactA!, contactA), 'même action, même instant de contact');
      verifier(pres(e.piedPrepare.arrivee.x, arrivee.x) && pres(e.piedPrepare.arrivee.y, arrivee.y), 'la visée est verrouillée');
    }
  }
  verifier(e.vol?.type === 'pied' && e.vol.auteur === h, 'le ballon part');
  verifier(pres(e.sim, contactA), 'exactement à l\'instant de contact écrit à la demande');
  verifier(e.frappeFaite?.id === a.id && pres(e.frappeFaite.contactA, contactA) && e.frappeFaite.auteurId === h.id, 'le contact est inscrit (frappeFaite)');
  verifier((e.frappes ?? 0) === frappesAvant + 1 && h.stats.coupsDePied === coups + 1, 'une action, un coup de pied compté');
  verifier(gestesDeFrappe(e, h.id).length === 1, 'toujours un seul geste de frappe');
  verifier(e.direct!.tenuJusqua >= contactA + 0.29, 'le suivi du geste : il ne repart pas dans la même image');
}

console.log('— Deux appuis dans le même pas : une seule action —');
{
  const { e, h, s } = porteur(1, 5);
  const avant = e.frappes ?? 0, coups = h.stats.coupsDePied;
  demanderDirect(e, { action: 'coupDePied', intentionPied: 'rasant' });
  demanderDirect(e, { action: 'coupDePied', intentionPied: 'degagement' });
  demanderDirect(e, { action: 'drop', auto: true });
  verifier(e.direct!.file.filter((d) => d.action === 'coupDePied' || d.action === 'drop').length === 1, 'la file ne garde qu\'une demande de coup de pied');
  commanderDirect(e, s, 0, false); avancer(e, DT);
  verifier((e.frappes ?? 0) === avant + 1 && e.piedPrepare?.geste === 'rasant', 'c\'est la première qui est jouée');
  for (let i = 0; i < 6 && !e.vol; i++) avancer(e, DT);
  verifier(h.stats.coupsDePied === coups + 1 && gestesDeFrappe(e, h.id).length === 1, 'un coup de pied, un geste');
}

console.log('— À reculons : il se tourne d\'abord, puis arme, une fois —');
{
  const { e, h, s } = porteur(2, -5);
  demanderDirect(e, { action: 'coupDePied', intentionPied: 'degagement' });
  commanderDirect(e, -s, 0, false); avancer(e, DT);
  const a = e.piedPrepare!;
  verifier(!!a && a.etat === 'demande' && a.pretDepuis === undefined, 'la demande est prise, l\'armé attend qu\'il se soit tourné');
  verifier(pres(a.armeA!, e.sim + DT) && pres(a.contactA!, a.armeA! + AMORCE_EN_PAS.course * DT), 'un pas d\'orientation, puis l\'amorce du geste');
  verifier(gestesDeFrappe(e, h.id).length === 0, 'aucun geste de frappe pendant qu\'il se tourne');
  avancer(e, DT);
  verifier(e.piedPrepare?.etat === 'arme' && gestesDeFrappe(e, h.id).length === 1, 'puis il arme — une fois');
  const contactA = a.contactA!;
  for (let i = 0; i < 6 && !e.vol; i++) avancer(e, DT);
  verifier(e.vol?.auteur === h && pres(e.sim, contactA), 'et tape à l\'instant prévu');
  verifier(gestesDeFrappe(e, h.id).length === 1, 'un seul geste au total');
}

console.log('— Plaqué pendant l\'amorce : le geste est abandonné, jamais rejoué —');
{
  let abandonnes = 0, poursuivis = 0;
  for (let k = 0; k < 24; k++) {
    const { e, h, s } = porteur(k, 0, 12 + (k % 5));
    // Un dégagement : son amorce laisse deux pas au défenseur.
    demanderDirect(e, { action: 'coupDePied', intentionPied: 'degagement' });
    avancer(e, DT);
    const a = e.piedPrepare;
    if (!a) continue;
    const id = a.id!, contactA = a.contactA!;
    const d = e.pions.find((q) => q.cote === adverse(h.cote) && q.surLeTerrain)!;
    poser(d, h.pos.x + s * 0.4, h.pos.y, -s * 3, 0); d.role = 'rideau1';
    let relances = 0;
    for (let i = 0; i < 8 && !e.vol; i++) {
      avancer(e, DT);
      if (e.piedPrepare && e.piedPrepare.id !== id) relances++;
      if (!e.piedPrepare && !e.vol) break;
    }
    verifier(relances === 0, 'aucune nouvelle action ne remplace celle qu\'on vient d\'interrompre');
    verifier(gestesDeFrappe(e, h.id).length <= 1, 'jamais deux gestes de frappe');
    if (e.vol?.type === 'pied' && e.vol.auteur === h) {
      // Le plaquage a été manqué : la MÊME action a continué, au même instant de contact.
      poursuivis++;
      verifier(e.frappeFaite?.id === id && pres(e.frappeFaite.contactA, contactA), 'plaquage manqué : même action, même contact');
    } else {
      abandonnes++;
      verifier(e.frappeFaite?.id !== id, 'plaqué avant le contact : le ballon n\'est pas parti');
      verifier(gestesDeFrappe(e, h.id).length === 0, 'et le geste de frappe est retiré');
    }
  }
  verifier(abandonnes > 0, `le botteur reste plaquable avant le contact (${abandonnes} abandonnés, ${poursuivis} poursuivis)`);
}

console.log('— Le niveau 7 fait encore ce qu\'il faisait (le correctif est derrière le niveau 8) —');
{
  const e = creerMatchDEmpreinte(0, { ia: 7 });
  verifier(e.ia === 7 && !frappeFranche(e), 'un match de niveau 7 se crée encore');
  let garde = 0, actions = 0;
  while (!e.fini && garde++ < 3000) { avancer(e, DT); if (e.piedPrepare?.id !== undefined || e.frappeFaite) actions++; }
  verifier(actions === 0 && e.frappes === undefined, 'il n\'écrit ni numéro d\'action ni contact : son état est celui d\'avant');
}

console.log('— Des matchs entiers au niveau du jeu —');
{
  let actions = 0, partis = 0, franches = 0, pireFranche = 0;
  for (let k = 0; k < 4; k++) {
    const e = creerMatchDEmpreinte(k);
    let garde = 0, enCours: { id: number; debut: number; contactA?: number; auteurId: string } | null = null;
    const armes = new Map<number, Set<string>>();
    while (!e.fini && garde++ < 200000) {
      avancer(e, DT);
      const p = e.piedPrepare;
      if (p) {
        verifier(p.id !== undefined, 'tout coup de pied préparé est une action numérotée');
        if (!enCours || enCours.id !== p.id) {
          verifier(!enCours || p.id! > enCours.id, 'les numéros d\'action ne font que croître');
          enCours = { id: p.id!, debut: e.sim, contactA: p.contactA, auteurId: p.auteurId }; actions++;
          if (p.contactA !== undefined) franches++;
        }
        if (enCours.contactA !== undefined) verifier(pres(p.contactA!, enCours.contactA), 'l\'instant de contact d\'une action ne bouge pas');
        const vus = armes.get(p.id!) ?? new Set<string>();
        for (const g of gestesDeFrappe(e, p.auteurId)) if (g.debut >= enCours.debut - 1e-6) vus.add(g.id);
        armes.set(p.id!, vus);
        verifier(vus.size <= 1, `une action n'arme qu'une fois (action ${p.id} : ${vus.size})`);
        // L'estimation remise à la scène pour un ballon posé au sol (placement) : jamais dans le passé d'un armé.
        const prevu = contactDeFrappe(e, p, e.pions.find((q) => q.id === p.auteurId)!.numero, DT);
        if (p.pretDepuis !== undefined) verifier(prevu !== undefined && prevu >= p.pretDepuis, 'la scène reçoit un instant de contact pour tout coup de pied armé');
      } else if (enCours) {
        if (e.vol?.type === 'pied' && e.vol.auteur.id === enCours.auteurId) {
          partis++;
          if (enCours.contactA !== undefined) { verifier(pres(e.sim, enCours.contactA), 'une action franche part à son instant de contact'); pireFranche = Math.max(pireFranche, e.sim - enCours.debut); }
        }
        enCours = null;
      }
    }
    verifier(e.fini, `le match ${k} va à son terme`);
  }
  verifier(actions > 60 && partis > 50, `assez de coups de pied pour conclure (${actions} actions, ${partis} partis)`);
  verifier(franches > 20 && pireFranche <= 1.2, `un coup de pied tapé ballon en main part vite (${franches} actions, au pire ${pireFranche.toFixed(2)} s après la demande)`);
}

console.log('— Les clips de frappe sont prêts avant le coup d\'envoi —');
{
  const catalogue = JSON.parse(fs.readFileSync('public/rn26/motions/catalogue-match-poses.json', 'utf8')) as { name: string; banque: string }[];
  for (const nom of ['kick_running', 'kick_grubber', 'kick_box', 'kick_restart', 'kick_restart_fast']) {
    verifier(catalogue.find((c) => c.name === nom)?.banque === 'common', `${nom} est dans la banque attendue avant le coup d'envoi`);
  }
  const lecteur = fs.readFileSync('public/rn26/destiny.mjs', 'utf8');
  verifier(lecteur.includes('frappeDe(p,now,recent)') && lecteur.includes('contactDeFrappe'), 'le lecteur installé est celui du Correctif 40 (lecteur unique, contact du moteur)');
  verifier(!/setTimeout\([^)]*frappe/i.test(lecteur), 'aucune minuterie ne décide du départ du ballon');
  const scene = fs.readFileSync('public/rn26/scene.js', 'utf8');
  verifier(scene.includes('pointDeFrappe') && !scene.includes('collectif'), 'la scène installée fait partir le ballon du pied, et n\'a plus de caméra à part pour le contrôle d\'équipe');
}

console.log('— Les joueuses : portrait, écusson, logo de ligue, par le même chemin —');
{
  fournirPoolFfr(() => ({ pool: 'mixed', joueurs: [] }));
  const cartes = catalogueMondialCarriere();
  const joueuses = cartes.filter((c) => c.gender === 'female' && !c.speciale);
  verifier(joueuses.length > 1500, `le catalogue mixte contient les joueuses (${joueuses.length})`);
  // La table du pont nom → identifiant dit la même chose que le monde féminin, et chaque logo existe.
  verifier(Object.keys(CHAMPIONNATS_FEMININS_PAR_NOM).length === CHAMPIONNATS_FEMININS.length, 'autant de championnats dans le pont que dans le monde féminin');
  for (const c of CHAMPIONNATS_FEMININS) {
    verifier(CHAMPIONNATS_FEMININS_PAR_NOM[c.nom] === c.id, `${c.nom} est déclaré sous ${c.id}`);
    const logo = LOGO_COMPETITION[c.id];
    verifier(!!logo && fs.existsSync('public' + logo), `${c.id} a son logo, et le fichier existe`);
    verifier(logoChampionnat(c.nom) === logo, `${c.nom} trouve son logo par son nom`);
  }
  verifier(logoChampionnat('Elite 1 Feminine') === LOGO_COMPETITION['f-elite1'], 'une graphie sans accents le trouve aussi');
  verifier(logoChampionnat('Top 14') === LOGO_COMPETITION.top14 && logoChampionnat(undefined) === undefined && logoChampionnat('Championnat inconnu') === undefined, 'les championnats des joueurs ne changent pas ; un inconnu ne reçoit rien');
  let sansPortrait = 0;
  for (const c of joueuses) {
    verifier(!!c.championnat && !!logoChampionnat(c.championnat), `${c.nom} : le logo de sa ligue (${c.championnat})`);
    verifier(!!c.clubReel && !!blasonCarteFeminine(c.clubReel), `${c.nom} : l'écusson de son club (${c.clubReel})`);
    const image = imageDe(c), candidats = portraitsDe(c);
    verifier(typeof image === 'string' && image.length > 1 && !image.includes('undefined') && !image.includes('null'), `${c.nom} : une image affichable`);
    if (c.photo) {
      verifier(image === c.photo, `${c.nom} : la fiche lit le portrait porté par la carte`);
      if (c.photo.startsWith('/')) verifier(fs.existsSync('public' + decodeURI(c.photo)), `${c.nom} : son portrait existe (${c.photo})`);
    } else { sansPortrait++; verifier(image === SILHOUETTE_JOUEUSE, `${c.nom} : sans portrait, la silhouette d'une joueuse`); }
    verifier(candidats.every((x) => x === c.photo), `${c.nom} : jamais un visage pris dans l'index des joueurs`);
  }
  console.log(`   ${joueuses.length} joueuses, dont ${sansPortrait} sans portrait (silhouette)`);
  const joueur = cartes.find((c) => c.gender !== 'female' && !c.speciale && c.photo)!;
  verifier(imageDe(joueur) === joueur.photo || portraitsDe(joueur).includes(joueur.photo!), 'un joueur garde son portrait');
  verifier(imageDe({ nom: 'Joueur Sans Portrait Du Tout' }) === SILHOUETTE_JOUEUR, 'un joueur sans portrait : la silhouette');
  verifier(imageDe({ nom: 'Joueuse Sans Portrait', gender: 'female', photo: 'undefined' }) === SILHOUETTE_JOUEUSE, 'une adresse « undefined » n\'est jamais affichée');
  verifier(fs.existsSync('public' + SILHOUETTE_JOUEUR) && fs.existsSync('public' + SILHOUETTE_JOUEUSE), 'les deux silhouettes sont livrées');
  // Les deux conversions carte → joueur de composition transmettent le portrait et le genre.
  for (const f of ['src/screens/CarriereEnLigne.tsx', 'src/components/CompositionCollectionSolo.tsx']) {
    const source = fs.readFileSync(f, 'utf8'), i = source.indexOf('const carteEnJoueur');
    const corps = source.slice(i, source.indexOf('});', i));
    verifier(i > 0 && /photo: c\.photo/.test(corps) && /gender: c\.gender/.test(corps), `${f} : la composition reçoit le portrait et le genre de la carte`);
  }
}

console.log(`\n✅ Correctif 40 : ${ok} contrôles.`);
