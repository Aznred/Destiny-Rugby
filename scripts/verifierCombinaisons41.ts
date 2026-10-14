// BANC — CORRECTIF 41, points 1 à 32 : l'atelier de combinaisons, le cahier vivant, le marché, l'IA communautaire.
//
//   Atelier      — ordres rapides (l'exemple de la demande), bibliothèque d'exemples, emplacements, zone des dix mètres.
//   Essai        — même moteur qu'un match de ligue, quatre niveaux de défense, chronologie mesurée.
//   Cahier vivant— options conditionnelles lues par le moteur des règles 11, ignorées avant ; touche enrichie ; mémoire
//                  tactique ; bilan de chaque combinaison ; rien ne bouge pour un cahier d'avant.
//   Marché       — texte, empreinte, copies, quotas, versions, notes, signalements, statistiques, score, emplacements.
//   Serveur      — le vrai gestionnaire HTTP : marché ouvert, modération réservée, publication, ajout, et un match joué jusqu'au bout qui
//                  crédite le club et le marché une seule fois.
//   IA           — identité, niveau, échantillon minimum, méta qui évolue.
//
//   npm run verify:combinaisons41

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi';
import { stockageFichier } from '../serveur/carriereFichier';
import { creerMarcheCombinaisons, marcheCombinaisonsMemoire, RefusMarche } from '../serveur/marcheCombinaisons';
import {
  candidatesCombinaison, choisirCombinaison, combinaisonsValides, creerCombinaison, EMPLACEMENTS, emplacementsOccupes, erreursVariante, etapesCombinaison,
  MAX_OPTIONS, optionsValides, porteursParEtape, rangerEnTrop, situationDuPlan, type Combinaison, type VarianteCombinaison,
} from '../src/lib/ligue/combinaisons';
import { donnerOrdre, finDeSequence, ordresPossibles, type OrdreCombinaison } from '../src/lib/ligue/ordresCombinaisons';
import { EXEMPLES_COMBINAISONS, exempleCombinaison } from '../src/lib/ligue/exemplesCombinaisons';
import { chronologieCombinaison, creerEssaiCombinaison, jouerEssaiCombinaison, NIVEAUX_DEFENSE, SYSTEMES_DEFENSE } from '../src/lib/ligue/essaiCombinaisons';
import { iaDesRegles, optionsMoteurDesRegles, REGLES_MATCH_EN_LIGNE } from '../src/lib/ligue/matchCarriere';
import {
  ajouterAuCahier, ajouterStats, appliquerRemontee, cahierCommunautaire, creerFiche, difficulteDuPlan, ECHANTILLON_MINIMUM, empreintePlan, indicateurs, lirePublication,
  metaDepuisFiches, mettreAJour, modererFiche, noterFiche, nouvelleVersion, PUBLICATIONS_PAR_COMPTE, PUBLICATIONS_PAR_JOUR, refusNouvellePublication, remonteeDuMatch,
  resumeDeFiche, scoreCommunautaire, signalerFiche, STATS_VIDES, statsDUnBilan, texteRefuse, typeDuPlan, VERSIONS_GARDEES, versionsDisponibles,
  type FichePubliee, type MetaCombinaison, type StatsCombinaison,
} from '../src/lib/ligue/marcheCombinaisons';
import { memoireTactique, valeurDeLIssue } from '../src/lib/moteur/lectureCombinaison';
import { avancer, creerMatch, DT, installerSituationCombinaison } from '../src/lib/moteur/moteur';
import { ORDRE_MAILLOTS } from '../src/lib/moteur/entites';
import { LIGNE_A } from '../src/lib/moteur/terrain';
import { cahierDuClubIA } from '../src/lib/iaCommunautaire';
import { TEXTES_MARCHE41 } from '../src/data/textesMarche41';

let controles = 0;
const egal = (a: unknown, b: unknown, message: string) => { assert.deepEqual(a, b, message); controles++; };
const ok = (a: unknown, message: string) => { assert.ok(a, message); controles++; };
const titre = (texte: string) => console.log(`\n── ${texte}`);
const rapide = process.argv.includes('--rapide');

// ═══ 1. LES ORDRES RAPIDES ═══════════════════════════════════════════════════════════════════════════════════════════
titre('Ordres rapides');
{
  const c: Combinaison = { ...creerCombinaison('exemple', 'ruck'), nom: 'Exemple de la demande' };
  let v: VarianteCombinaison = { ...c.variantes[0], actions: [], placements: [] };
  const ordre = (numero: number, o: OrdreCombinaison) => { const r = donnerOrdre(c, v, numero, o); if (!r.refus) v = r.variante; return r; };
  egal(ordresPossibles(c, v, 9).includes('course'), true, 'le 9 a le ballon : il peut courir, fixer, taper');
  ok(!ordresPossibles(c, v, 9).includes('recevoir'), 'on ne se passe pas le ballon à soi-même');
  // « Ruck au centre → cellule à gauche → le 12 en leurre → le 10 reçoit derrière → le 13 attaque l'intervalle → l'ailier reste large. »
  ok(!ordre(4, 'cellule').refus, 'cellule autour du 4');
  egal(finDeSequence(c, v).porteur, 4, 'le ballon est dans la cellule');
  egal(v.actions.filter((a) => a.type === 'leurre').length, 2, 'deux avants encadrent le porteur de la cellule');
  ok(ordresPossibles(c, v, 10).includes('derriere'), 'un arrière peut recevoir derrière la cellule');
  ok(!ordre(10, 'derriere').refus, 'le 10 reçoit dans le dos de la cellule');
  ok(!ordre(12, 'leurre').refus, 'le 12 part en leurre');
  ok(!ordre(13, 'recevoir').refus && !ordre(13, 'course').refus, 'le 13 reçoit et attaque');
  ok(!ordre(14, 'large').refus, 'l’ailier reste large');
  egal(erreursVariante(c.phase, v), [], 'le cahier obtenu est valide');
  egal(combinaisonsValides([{ ...c, variantes: [v] }])[0].variantes[0].actions.length, v.actions.length, 'le serveur le garde tel quel');
  ok(v.placements.some((p) => p.numero === 14), 'rester large a placé l’ailier dans son couloir');
  ok(v.placements.some((p) => p.numero === 10), 'derrière la cellule : le 10 est placé en profondeur');
  egal(etapesCombinaison(v.actions).length, 4, 'quatre temps : cellule, 10, 13, course');
  egal(ordre(9, 'pied').refus, 'pasPorteur', 'un joueur sans ballon ne tape pas');
  egal(ordre(13, 'recevoir').refus, 'porteur', 'le porteur ne reçoit pas');
  egal(ordre(12, 'cellule').refus, 'pasAvant', 'une cellule se forme autour d’un avant');
  const avant = v.actions.length;
  ok(!ordre(12, 'annuler').refus && v.actions.length === avant - 1, 'retirer ses ordres enlève le leurre du 12, rien d’autre');
  ok(!ordre(13, 'annuler').refus && finDeSequence(c, v).porteur === 10, 'retirer la passe du 13 rend le ballon au 10');
  ok(!ordre(10, 'pied').refus && finDeSequence(c, v).pied, 'le 10 tape');
  egal(ordresPossibles(c, v, 12), [], 'après un coup de pied, plus d’ordre : le ballon est disputé');
  egal(ordre(12, 'recevoir').refus, 'apresPied', 'et un ordre forcé est refusé');
  // Un ordre n'est jamais appliqué à moitié.
  let plein: VarianteCombinaison = { ...c.variantes[0], actions: [], placements: [] };
  let refusPlein = 0;
  for (let i = 0; i < 14; i++) { const r = donnerOrdre(c, plein, i % 2 ? 12 : 10, 'recevoir'); if (r.refus) refusPlein++; else plein = r.variante; }
  ok(refusPlein > 0 && etapesCombinaison(plein.actions).length <= 10 && !erreursVariante('ruck', plein).length, 'au-delà de dix étapes l’ordre est refusé, le cahier reste valide');
}

// ═══ 2. LA BIBLIOTHÈQUE, LES EMPLACEMENTS, LA ZONE DES DIX MÈTRES ════════════════════════════════════════════════════
titre('Bibliothèque d’exemples, emplacements, zone des dix mètres');
{
  ok(EXEMPLES_COMBINAISONS.length >= 20, `${EXEMPLES_COMBINAISONS.length} exemples`);
  for (const situation of ['ruck', 'melee', 'touche', 'ligne10'] as const) ok(EXEMPLES_COMBINAISONS.some((x) => x.situation === situation), `des exemples pour « ${situation} »`);
  const plans = EXEMPLES_COMBINAISONS.map((x) => exempleCombinaison(x.id, `ex-${x.id}`, x.id));
  for (const [i, x] of EXEMPLES_COMBINAISONS.entries()) {
    const plan = plans[i];
    ok(plan && !erreursVariante(plan.phase, plan.variantes[0]).length, `« ${x.id} » se construit et se valide`);
    egal(situationDuPlan(plan!), x.situation, `« ${x.id} » est rangé dans sa situation`);
    egal(combinaisonsValides([plan])[0].variantes[0], plan!.variantes[0], `« ${x.id} » passe la validation du serveur sans perdre un geste`);
    ok(TEXTES_MARCHE41[`cb.ex.${x.id}`], `« ${x.id} » a son nom dans les sept langues`);
  }
  egal(exempleCombinaison('inconnu', 'x', 'x'), null, 'un exemple inconnu ne rend rien');
  const parId = (id: string) => plans[EXEMPLES_COMBINAISONS.findIndex((x) => x.id === id)]!;
  ok(parId('touche-double').variantes[0].touche?.doubleFeinte && parId('touche-bloc').variantes[0].touche?.glissement && parId('touche-maul').variantes[0].touche?.maul, 'la touche enrichie est dans les exemples');
  egal(parId('melee-8').variantes[0].depart, 8, 'départ du 8 : le 8 sort le ballon');
  egal(parId('ruck-lecture').variantes[0].options?.length, 2, 'un exemple porte des options de jeu');
  egal(parId('ligne-pick').zone, 'ligne10', 'les exemples des dix mètres visent leur zone');

  // Emplacements.
  egal(Object.values(EMPLACEMENTS).reduce((a, b) => a + b, 0), 12, 'la somme des emplacements est la taille du cahier');
  const rucks = Array.from({ length: 6 }, (_, i) => ({ ...creerCombinaison(`r${i}`, 'ruck'), nom: `Ruck ${i}` }));
  const occupation = emplacementsOccupes(rucks);
  egal([occupation.occupes.ruck, occupation.enTrop], [4, ['r4', 'r5']], 'quatre rucks actifs, les deux derniers sont en trop');
  const ranges = rangerEnTrop(rucks);
  egal(ranges.map((p) => p.active), [true, true, true, true, false, false], 'ranger ne supprime rien : il désactive ce qui dépasse');
  ok(rangerEnTrop(ranges) === ranges, 'un cahier dans ses emplacements n’est pas touché');
  egal(emplacementsOccupes([...rucks.slice(0, 4), { ...rucks[4], zone: 'ligne10' }]).enTrop, [], 'un ruck des dix mètres occupe un autre emplacement');

  // La zone des dix mètres ne change rien pour un cahier qui n'en a pas.
  const ancienChoix = (liste: Combinaison[], phase: Combinaison['phase'], x: number, y: number) => {
    const zone = x <= 22 ? 'nos22' : x >= 78 ? 'leurs22' : 'milieu';
    const couloir = y < 70 / 3 ? 'gauche' : y > 140 / 3 ? 'droite' : 'centre';
    return liste.filter((p) => p.active && p.phase === phase && (p.zone === 'toutes' || p.zone === zone) && (p.couloir === 'tous' || p.couloir === couloir))
      .sort((a, b) => Number(b.zone !== 'toutes') + Number(b.couloir !== 'tous') - Number(a.zone !== 'toutes') - Number(a.couloir !== 'tous'))[0];
  };
  const cahier: Combinaison[] = [
    { ...creerCombinaison('a', 'ruck') }, { ...creerCombinaison('b', 'ruck'), zone: 'leurs22' }, { ...creerCombinaison('c', 'ruck'), couloir: 'gauche' },
    { ...creerCombinaison('d', 'ruck'), zone: 'leurs22', couloir: 'droite' }, { ...creerCombinaison('e', 'melee'), zone: 'nos22' }, { ...creerCombinaison('f', 'touche'), active: false },
  ];
  let memes = 0;
  for (let x = 0; x <= 100; x += 2.5) for (let y = 1; y < 70; y += 4) for (const phase of ['ruck', 'melee', 'touche'] as const) {
    if (choisirCombinaison(cahier, phase, x, y)?.id === ancienChoix(cahier, phase, x, y)?.id) memes++;
    else assert.fail(`le choix a changé pour ${phase} en ${x};${y}`);
  }
  ok(memes > 2000, `sans plan « dix mètres », ${memes} situations choisissent exactement comme avant`);
  const avecLigne = [...cahier, { ...creerCombinaison('l', 'ruck'), zone: 'ligne10' as const }];
  egal(choisirCombinaison(avecLigne, 'ruck', 93, 35)?.id, 'l', 'à sept mètres de la ligne, le plan des dix mètres passe devant celui des 22');
  egal(choisirCombinaison(avecLigne, 'ruck', 86, 35)?.id, 'b', 'à quatorze mètres, c’est encore le plan des 22');
  egal(candidatesCombinaison([...cahier, { ...creerCombinaison('a2', 'ruck') }], 'ruck', 50, 35).map((p) => p.id), ['a', 'a2'], 'les plans aussi précis sont tous candidats');
}

// ═══ 3. LE CAHIER D'AVANT NE BOUGE PAS ═══════════════════════════════════════════════════════════════════════════════
titre('Un cahier d’avant garde sa forme et son jeu');
{
  for (const phase of ['ruck', 'melee', 'touche'] as const) {
    const ancien = JSON.parse(JSON.stringify(creerCombinaison(`ancien-${phase}`, phase)));
    const valide = combinaisonsValides([ancien])[0];
    egal(Object.keys(valide).sort(), ['active', 'couloir', 'id', 'nom', 'phase', 'variantes', 'zone'], `${phase} : aucune clé de plus sur le plan`);
    ok(!('options' in valide.variantes[0]), `${phase} : pas d’options ajoutées`);
    if (phase === 'touche') egal(Object.keys(valide.variantes[0].touche!).sort(), ['alignes', 'distance', 'feinte'], 'la touche garde ses trois réglages');
    egal(JSON.stringify(combinaisonsValides([valide])), JSON.stringify([valide]), `${phase} : la validation est stable`);
  }
  egal([REGLES_MATCH_EN_LIGNE, iaDesRegles(11), iaDesRegles(10)], [11, 8, 8], 'règles 11 : même IA que les règles 10');
  ok((optionsMoteurDesRegles(11) as { cahierVivant?: boolean }).cahierVivant === true && !('cahierVivant' in optionsMoteurDesRegles(10)), 'le cahier vivant commence aux règles 11');

  // Le moteur des règles 10 ignore les options : même match avec ou sans.
  const jouer = (regles: number, avecOptions: boolean) => {
    const equipe = (prefixe: string) => ORDRE_MAILLOTS.map((poste, i) => ({ id: `${prefixe}-${i}`, nom: `${prefixe} ${i + 1}`, poste, age: 26, note: 70, potentiel: 70, nation: 'France', regen: false }));
    const a = equipe('A'), b = equipe('B');
    const e = creerMatch('A', 'B', a, b, 0, 0, 'banc-regles', undefined, { ...optionsMoteurDesRegles(regles), compositionA: a, compositionB: b });
    const plan = exempleCombinaison('ruck-lecture', 'p', 'p')!;
    if (!avecOptions) delete plan.variantes[0].options;
    e.plansCombinaisons = { A: [plan], B: [structuredClone(plan)] };
    installerSituationCombinaison(e, 'ruck', { x: LIGNE_A + 50, y: 35 });
    for (let i = 0; i < 240 / DT; i++) avancer(e, DT);
    return { empreinte: JSON.stringify([e.scoreA, e.scoreB, e.sim, e.pions.map((p) => [Math.round(p.pos.x * 100), Math.round(p.pos.y * 100), p.stats.passes, p.stats.plaquages])]), bilans: e.bilansCombinaisons ?? [], vivant: !!e.cahierVivant };
  };
  const dixSans = jouer(10, false), dixAvec = jouer(10, true);
  egal(dixAvec.empreinte, dixSans.empreinte, 'règles 10 : un cahier avec options se joue exactement comme sans');
  egal([dixAvec.vivant, dixAvec.bilans.length], [false, 0], 'règles 10 : ni cahier vivant, ni bilan');
  const onze = jouer(11, true);
  ok(onze.vivant && onze.bilans.length > 0, `règles 11 : ${onze.bilans.length} combinaisons suivies en quatre minutes`);
  egal(jouer(11, true).empreinte, onze.empreinte, 'règles 11 : deux rejoues identiques');
  ok(onze.bilans.every((b) => ['essai', 'franchissement', 'conserve', 'pied', 'perdu', 'penalitePour', 'penaliteContre'].includes(b.issue) && Number.isFinite(b.metres)), 'chaque bilan a une issue et des mètres');
}

// ═══ 4. LES OPTIONS ══════════════════════════════════════════════════════════════════════════════════════════════════
titre('Options et conditions');
{
  const c = creerCombinaison('opt', 'ruck');
  const v = c.variantes[0];
  egal(porteursParEtape('ruck', v), [9, 10, 12, 13, 13], 'qui tient le ballon à chaque étape');
  const lues = optionsValides([
    { etape: 1, condition: 'monteeRapide', reponse: { type: 'pied', intention: 'rasant' } },
    { etape: 1, condition: 'monteeRapide', reponse: { type: 'garder' } },                    // doublon
    { etape: 1, condition: 'receveurMarque', reponse: { type: 'passe', destinataire: 10 } },   // passe au porteur
    { etape: 9, condition: 'surnombre', reponse: { type: 'garder' } },                         // étape inexistante
    { etape: 2, condition: 'inventee', reponse: { type: 'garder' } },
    { etape: 2, condition: 'surnombre', reponse: { type: 'pied', intention: 'laser' } },
    { etape: 2, condition: 'joueurLibre', reponse: { type: 'passe', destinataire: 14 } },
    'pas un objet',
  ], 'ruck', v);
  egal(lues, [{ etape: 1, condition: 'monteeRapide', reponse: { type: 'pied', intention: 'rasant' } }, { etape: 2, condition: 'joueurLibre', reponse: { type: 'passe', destinataire: 14 } }],
    'seules les options cohérentes sont gardées');
  egal(optionsValides(Array.from({ length: 30 }, (_, i) => ({ etape: i % 4, condition: ['monteeRapide', 'surnombre', 'ailierMonte', 'joueurLibre', 'receveurMarque', 'intervalleInterieur', 'intervalleExterieur'][i % 7], reponse: { type: 'garder' } })), 'ruck', v).length, MAX_OPTIONS, 'six options au plus');
  const appels: VarianteCombinaison = { ...v, actions: [{ type: 'leurre', numero: 12, destination: { x: 5, y: 5 } }, { type: 'passe', destinataire: 10 }] };
  egal(optionsValides([{ etape: 0, condition: 'surnombre', reponse: { type: 'garder' } }], 'ruck', appels), [], 'pas d’option sur une étape d’appels seuls');

  // Sur le moteur : chaque condition est parfois vraie, jamais toujours, et la réponse est jouée.
  const essais = rapide ? 8 : 16;
  const mesures: Record<string, number> = {};
  for (const condition of ['monteeRapide', 'receveurMarque', 'intervalleInterieur', 'ailierMonte', 'joueurLibre'] as const) {
    let jouees = 0, parties = 0;
    for (const systeme of SYSTEMES_DEFENSE) for (let n = 0; n < essais; n++) {
      const plan: VarianteCombinaison = { ...v, options: [{ etape: 1, condition, reponse: condition === 'joueurLibre' ? { type: 'passe', destinataire: 13 } : condition === 'monteeRapide' ? { type: 'pied', intention: 'rasant' } : { type: 'garder' } }] };
      const { bilan } = jouerEssaiCombinaison(creerEssaiCombinaison(c, plan, {}, { niveau: 'normale', systeme, essai: n })!);
      if (bilan.depart !== null) parties++;
      if (bilan.option === condition) jouees++;
    }
    mesures[condition] = jouees / Math.max(1, parties);
    ok(jouees > 0 && jouees < parties, `« ${condition} » : jouée ${jouees} fois sur ${parties} — ni jamais, ni toujours`);
  }
  console.log('   ', Object.entries(mesures).map(([k, n]) => `${k} ${Math.round(n * 100)} %`).join(' · '));
  // La montée de l'ailier distingue une défense qui monte d'une défense qui se replie.
  const part = (systeme: typeof SYSTEMES_DEFENSE[number]) => {
    let n = 0;
    for (let i = 0; i < essais; i++) if (jouerEssaiCombinaison(creerEssaiCombinaison(c, { ...v, options: [{ etape: 1, condition: 'ailierMonte', reponse: { type: 'garder' } }] }, {}, { niveau: 'normale', systeme, essai: i })!).bilan.option) n++;
    return n;
  };
  const blitz = part('blitz'), repli = part('repli');
  ok(blitz > repli, `l’ailier est lu « monté » ${blitz} fois contre une défense qui monte, ${repli} fois contre un repli`);
  // La réponse est vraiment jouée : un coup de pied de plus, et la combinaison s'arrête là.
  const pied = { ...v, options: [{ etape: 1, condition: 'ailierMonte' as const, reponse: { type: 'pied' as const, intention: 'transversale' as const } }] };
  let tapes = 0;
  for (let i = 0; i < essais; i++) {
    const essai = creerEssaiCombinaison(c, pied, {}, { niveau: 'normale', systeme: 'blitz', essai: i })!;
    const { bilan } = jouerEssaiCombinaison(essai);
    if (bilan.option && essai.e.pions.find((p) => p.cote === 'A' && p.numero === 10)!.stats.coupsDePied > 0) tapes++;
  }
  ok(tapes > 0, `la réponse « jeu au pied » est tapée par le 10 (${tapes} fois)`);
}

// ═══ 5. L'ESSAI SUR LE MOTEUR ET LA TOUCHE ENRICHIE ══════════════════════════════════════════════════════════════════
titre('Essai sur le moteur, chronologie, touche enrichie');
{
  for (const phase of ['ruck', 'melee', 'touche'] as const) {
    const c = creerCombinaison(`essai-${phase}`, phase);
    const chrono = chronologieCombinaison(c, c.variantes[0]);
    ok(chrono.lignes.length === c.variantes[0].actions.length && chrono.lignes.every((l) => Number.isFinite(l.t)), `${phase} : une ligne de chronologie par geste`);
    ok(chrono.lignes.every((l, i) => i === 0 || l.t >= chrono.lignes[i - 1].t), `${phase} : les temps ne reculent jamais`);
    ok(chrono.lignes.filter((l) => l.action.type === 'passe' && l.mesure).every((l) => l.recu === undefined || l.recu > l.t), `${phase} : une passe est reçue après avoir été donnée`);
    for (const niveau of NIVEAUX_DEFENSE) {
      const { bilan } = jouerEssaiCombinaison(creerEssaiCombinaison(c, c.variantes[0], {}, { niveau, systeme: 'glissee', essai: 1 })!);
      ok(bilan.issue !== 'enCours' && bilan.issue !== 'invalide' && Number.isFinite(bilan.metres), `${phase} contre « ${niveau} » : ${bilan.issue}, ${bilan.metres} m`);
    }
  }
  const sansDefense = creerCombinaison('libre', 'ruck');
  let metres = 0;
  for (let i = 0; i < 6; i++) metres += jouerEssaiCombinaison(creerEssaiCombinaison(sansDefense, sansDefense.variantes[0], {}, { niveau: 'aucune', systeme: 'glissee', essai: i })!).bilan.metres;
  ok(metres / 6 > 20, `sans défense, la combinaison va au bout (${Math.round(metres / 6)} m en moyenne)`);
  egal(creerEssaiCombinaison(sansDefense, { ...sansDefense.variantes[0], actions: [] }, {}), null, 'une combinaison vide ne se teste pas');
  const a = jouerEssaiCombinaison(creerEssaiCombinaison(sansDefense, sansDefense.variantes[0], {}, { niveau: 'forte', systeme: 'blitz', essai: 4 })!).bilan;
  const b = jouerEssaiCombinaison(creerEssaiCombinaison(sansDefense, sansDefense.variantes[0], {}, { niveau: 'forte', systeme: 'blitz', essai: 4 })!).bilan;
  egal(a, b, 'le même essai se rejoue à l’identique');

  // La touche du cahier vivant.
  const touche = (id: string) => exempleCombinaison(id, id, id)!;
  const double = creerEssaiCombinaison(touche('touche-double'), touche('touche-double').variantes[0], {}, { niveau: 'normale', systeme: 'glissee', essai: 0 })!;
  egal(double.e.conquete?.feintes?.length, 2, 'double faux saut : deux blocs montent pour de faux');
  ok(!double.e.conquete!.feintes!.includes(double.e.conquete!.cibleId!), 'le vrai sauteur n’est pas un des deux');
  const bloc = creerEssaiCombinaison(touche('touche-bloc'), touche('touche-bloc').variantes[0], {}, { niveau: 'normale', systeme: 'glissee', essai: 0 })!;
  ok(bloc.e.conquete?.glissement && bloc.e.conquete.glissement.de.y !== bloc.e.conquete.glissement.vers.y, 'changement de bloc : le sauteur attend ailleurs que sa place');
  const simple = creerEssaiCombinaison(touche('touche-devant'), touche('touche-devant').variantes[0], {}, { niveau: 'normale', systeme: 'glissee', essai: 0 })!;
  ok(!simple.e.conquete?.glissement && !simple.e.conquete?.feintes, 'une touche simple n’hérite d’aucune feinte');
  let mauls = 0, reprises = 0, gagnees = 0;
  for (let i = 0; i < (rapide ? 6 : 12); i++) {
    const essai = creerEssaiCombinaison(touche('touche-maul'), touche('touche-maul').variantes[0], {}, { niveau: 'faible', systeme: 'glissee', essai: i })!;
    let maul = false, reprise = false, garde = 500;
    while (garde-- > 0 && essai.avancer()) {
      if (essai.e.phase === 'maul') maul = true;
      if (maul && essai.e.combinaisonEnCours && essai.e.combinaisonEnCours.index >= 1) reprise = true;
    }
    if (essai.bilan().issue !== 'conquetePerdue') gagnees++;
    mauls += Number(maul); reprises += Number(reprise);
  }
  ok(mauls > 0 && mauls === gagnees, `touche gagnée : le maul se forme (${mauls} sur ${gagnees})`);
  ok(reprises >= mauls - 1 && reprises > 0, `à la sortie du maul la combinaison reprend au geste du 9 (${reprises} sur ${mauls})`);
}

// ═══ 6. LA MÉMOIRE TACTIQUE ══════════════════════════════════════════════════════════════════════════════════════════
titre('Mémoire tactique');
{
  const plans = ['a', 'b', 'c'].map((id) => creerCombinaison(id, 'ruck'));
  egal(memoireTactique(undefined, plans)?.id, 'a', 'sans mémoire : le premier du cahier');
  egal(memoireTactique({ a: { jouees: 1, reussies: 1 } }, plans)?.id, 'b', 'un plan pas encore essayé a sa chance');
  egal(memoireTactique({ a: { jouees: 3, reussies: 3 }, b: { jouees: 3, reussies: 0 }, c: { jouees: 3, reussies: 1 } }, plans)?.id, 'a', 'celui qui marche est rejoué');
  egal(memoireTactique({ a: { jouees: 5, reussies: 0 }, b: { jouees: 2, reussies: 1.5 }, c: { jouees: 2, reussies: 0.5 } }, plans)?.id, 'b', 'celui que l’adversaire contre laisse sa place');
  egal(memoireTactique({}, []), undefined, 'aucun candidat : rien');
  egal([valeurDeLIssue('essai', 30), valeurDeLIssue('conserve', 6), valeurDeLIssue('conserve', -3), valeurDeLIssue('perdu', 12)], [1, 0.5, 0, 0], 'ce que vaut une issue');
}

// ═══ 7. LE MARCHÉ : LES RÈGLES ═══════════════════════════════════════════════════════════════════════════════════════
titre('Marché : texte, empreinte, publication');
const plan = (id = 'ruck-cellule') => exempleCombinaison(id, 'local', 'Mon plan')!;
const stats = (plus: Partial<StatsCombinaison>): StatsCombinaison => ({ ...STATS_VIDES, ...plus });
{
  egal([texteRefuse('Cellule contre le rideau'), texteRefuse('Le conquérant'), texteRefuse('Constance')], [null, null, null], '« contre », « conquérant » : pas d’injure cachée dans un mot');
  egal([texteRefuse('gros c0nnard'), texteRefuse('PUTE'), texteRefuse('c o n n a r d')], ['offensant', 'offensant', 'offensant'], 'injures, chiffres-lettres et lettres espacées');
  egal([texteRefuse('va sur www.site.com'), texteRefuse('https://x.y'), texteRefuse('aaaaaaaaaa')], ['lien', 'lien', 'spam'], 'liens et répétitions');
  const lu = lirePublication({ plan: plan(), nom: '  Cellule   et 13  ', description: 'Derrière la cellule.', type: 'inconnu', difficulte: 9 });
  ok('saisie' in lu && lu.saisie.nom === 'Cellule et 13' && lu.saisie.plan.id === 'publication' && lu.saisie.plan.active && !lu.saisie.plan.origine, 'la saisie est nettoyée, le plan publié n’a plus d’identité de cahier');
  ok('saisie' in lu && lu.saisie.type === typeDuPlan(plan()) && lu.saisie.difficulte === difficulteDuPlan(plan()), 'type et difficulté inconnus : ceux que le plan montre');
  egal([lirePublication({ plan: plan(), nom: 'ab' }), lirePublication({ plan: { phase: 'ruck' }, nom: 'Valide' }), lirePublication({ plan: plan(), nom: 'Merde alors' })].map((r) => 'refus' in r && r.refus), ['nom', 'plan', 'offensant'], 'nom trop court, plan invalide, nom offensant');
  egal(lirePublication({ plan: plan(), nom: 'Valide', description: 'viens sur discord.gg/x' }), { refus: 'lien' }, 'la description passe aussi le filtre');

  egal([typeDuPlan(plan('ruck-cellule')), typeDuPlan(plan('melee-pied')), typeDuPlan(plan('melee-8')), typeDuPlan(plan('touche-maul')), typeDuPlan(plan('touche-milieu'))], ['avants', 'pied', 'avants', 'avants', 'large'], 'le type se lit sur les gestes');
  ok(difficulteDuPlan(plan('melee-8')) === 1 && difficulteDuPlan(plan('ruck-cellule')) >= 2, 'la difficulté suit la richesse du plan');

  const e1 = empreintePlan(plan());
  egal(empreintePlan({ ...plan(), nom: 'Autre nom', id: 'x', zone: 'leurs22', couloir: 'gauche', active: false }), e1, 'renommer ou déplacer un plan ne le rend pas nouveau');
  const retouche = plan(); retouche.variantes[0].actions = retouche.variantes[0].actions.slice(0, -1);
  ok(empreintePlan(retouche) !== e1, 'un geste de moins : une autre combinaison');
  const decale = plan(); const geste = decale.variantes[0].actions.find((a) => a.type === 'leurre')!; if (geste.type === 'leurre') geste.destination = { x: geste.destination.x + 0.2, y: geste.destination.y };
  egal(empreintePlan(decale), e1, 'vingt centimètres d’écart ne font pas une nouvelle combinaison');
}
titre('Marché : copies, quotas, versions, notes, signalements');
const T0 = Date.UTC(2026, 9, 14, 12);
const saisie = (id: string, nom = `Plan ${id}`) => { const r = lirePublication({ plan: plan(id), nom, description: 'Description.' }); if (!('saisie' in r)) throw new Error('saisie'); return r.saisie; };
{
  const fiche = creerFiche('f-1', 'auteur', 'Auteur', saisie('ruck-cellule'), T0);
  egal([fiche.etat, fiche.versions.length, fiche.situation], ['publiee', 1, 'ruck'], 'publiée tout de suite : la validation est automatique');
  egal(refusNouvellePublication([fiche], 'autre', saisie('ruck-cellule', 'Copie renommée'), T0), 'copie', 'copie identique d’un autre auteur : refusée');
  egal(refusNouvellePublication([fiche], 'auteur', saisie('ruck-cellule'), T0), 'dejaPubliee', 'la sienne, deux fois : refusée');
  egal(refusNouvellePublication([fiche], 'autre', saisie('ruck-pick'), T0), null, 'une autre combinaison passe');
  egal(refusNouvellePublication([{ ...fiche, etat: 'retiree' }], 'autre', saisie('ruck-cellule'), T0), null, 'une fiche retirée ne bloque plus son dessin');
  const jour = EXEMPLES_COMBINAISONS.slice(0, PUBLICATIONS_PAR_JOUR).map((x, i) => creerFiche(`j-${i}`, 'bavard', 'Bavard', saisie(x.id), T0 - 3_600_000));
  egal(refusNouvellePublication(jour, 'bavard', saisie('ligne-pick'), T0), 'quotaJour', 'trois publications par jour au plus');
  egal(refusNouvellePublication(jour, 'bavard', saisie('ligne-pick'), T0 + 86_400_000), null, 'le lendemain, c’est rouvert');
  egal(refusNouvellePublication(jour.map((f) => ({ ...f, etat: 'retiree' as const })), 'bavard', saisie('ligne-pick'), T0), 'quotaJour', 'publier puis retirer en boucle reste limité');
  const beaucoup = EXEMPLES_COMBINAISONS.slice(0, PUBLICATIONS_PAR_COMPTE).map((x, i) => creerFiche(`q-${i}`, 'prolixe', 'Prolixe', saisie(x.id), T0 - (i + 2) * 86_400_000));
  egal(refusNouvellePublication(beaucoup, 'prolixe', saisie('ligne-maul'), T0), 'quota', 'douze publications au plus par compte');

  // Versions.
  egal(nouvelleVersion(fiche, 'autre', [fiche], saisie('ruck-pick'), T0), { refus: 'interdit' }, 'seul l’auteur publie une version');
  egal(nouvelleVersion(fiche, 'auteur', [fiche], saisie('ruck-cellule'), T0), { refus: 'inchange' }, 'rien n’a changé : pas de version');
  const autreFiche = creerFiche('f-2', 'autre', 'Autre', saisie('ruck-pick'), T0);
  egal(nouvelleVersion(fiche, 'auteur', [fiche, autreFiche], saisie('ruck-pick'), T0), { refus: 'copie' }, 'une version ne peut pas copier la combinaison d’un autre');
  let versionnee = fiche;
  for (const [i, id] of ['ruck-large', 'ruck-lecture', 'melee-8', 'melee-rapide', 'melee-ferme', 'touche-avant'].entries()) {
    const r = nouvelleVersion(versionnee, 'auteur', [versionnee], { ...saisie(id), note: `retouche ${i + 2}` }, T0 + (i + 1) * 1000);
    if (!('fiche' in r)) throw new Error('version');
    versionnee = r.fiche;
  }
  egal([versionnee.versions.length, versionnee.versions.at(-1)!.numero, versionnee.versions[0].numero], [VERSIONS_GARDEES, 7, 3], 'les cinq dernières versions sont gardées, numérotées sans trou');
  egal(versionnee.versions.at(-1)!.note, 'retouche 7', 'chaque version dit ce qui change');

  // Notes et signalements.
  egal(noterFiche(fiche, 'auteur', 5), null, 'on ne note pas sa propre combinaison');
  egal([noterFiche(fiche, 'x', 0), noterFiche(fiche, 'x', 6), noterFiche(fiche, 'x', 2.5)], [null, null, null], 'une note va de 1 à 5, entière');
  let notee = noterFiche(noterFiche(fiche, 'x', 5)!, 'y', 2)!;
  notee = noterFiche(notee, 'x', 4)!;
  egal([resumeDeFiche(notee).note, resumeDeFiche(notee).votes, resumeDeFiche(notee, 'x').maNote], [3, 2, 4], 'une note par compte, la dernière remplace');
  let signalee = fiche;
  for (const compte of ['a', 'b']) signalee = signalerFiche(signalee, compte, 'nom')!;
  egal(signalee.etat, 'publiee', 'deux signalements : encore visible');
  signalee = signalerFiche(signalerFiche(signalee, 'a', 'spam')!, 'c', 'copie')!;
  egal([signalee.etat, Object.keys(signalee.signalements).length], ['attente', 3], 'trois comptes différents : en attente de modération');
  egal(signalerFiche(fiche, 'auteur', 'nom'), null, 'on ne se signale pas soi-même');
  egal([modererFiche(signalee, 'retablir', 'x', false), modererFiche(signalee, 'retirer', 'x', false)], [null, null], 'un compte ordinaire ne modère pas');
  egal([modererFiche(signalee, 'retablir', 'kiri', true)!.etat, Object.keys(modererFiche(signalee, 'retablir', 'kiri', true)!.signalements).length], ['publiee', 0], 'le modérateur rétablit, les signalements sont effacés');
  egal(modererFiche(fiche, 'retirer', 'auteur', false)!.etat, 'retiree', 'l’auteur retire sa combinaison');
  const vue = resumeDeFiche(notee, 'x');
  ok(!('auteur' in vue) && !('notes' in vue) && !('telecharges' in vue), 'la liste ne montre aucun identifiant de compte');
}
titre('Marché : statistiques de match, score, cahier');
{
  egal(statsDUnBilan({ issue: 'essai', metres: 80, battus: 9 }), stats({ utilisations: 1, metres: 40, battus: 6, essais: 1 }), 'une échappée est bornée : elle ne fait pas la moyenne');
  const bilans = [
    { cote: 'A' as const, id: 'p1', variante: 'v', publication: 'pub-aaaaaa', version: 2, debut: 10, metres: 12, passes: 3, battus: 1, issue: 'franchissement' as const },
    { cote: 'A' as const, id: 'p1', variante: 'v', publication: 'pub-aaaaaa', version: 2, debut: 90, metres: -2, passes: 2, battus: 0, issue: 'perdu' as const },
    { cote: 'B' as const, id: 'p9', variante: 'v', publication: 'pub-aaaaaa', version: 1, debut: 40, metres: 5, passes: 2, battus: 0, issue: 'conserve' as const },
    { cote: 'A' as const, id: 'perso', variante: 'v', debut: 50, metres: 30, passes: 4, battus: 2, issue: 'essai' as const },
  ];
  const remontee = remonteeDuMatch('ligue:match-1', bilans)!;
  egal(remontee.lignes.map((l) => [l.version, l.stats.utilisations, l.stats.matchs]), [[2, 2, 1], [1, 1, 1]], 'par publication et par version ; un plan personnel ne remonte pas');
  egal(remonteeDuMatch('m', [bilans[3]]), null, 'aucun plan du marché : rien à remonter');
  let fiche = creerFiche('pub-aaaaaa', 'auteur', 'Auteur', saisie('ruck-cellule'), T0);
  fiche = { ...fiche, versions: [...fiche.versions, { ...fiche.versions[0], numero: 2 }] };
  const creditee = appliquerRemontee(fiche, remontee)!;
  egal([creditee.stats.utilisations, creditee.stats.matchs, creditee.stats.metres, creditee.versions[1].stats.utilisations, creditee.versions[0].stats.utilisations], [3, 1, 15, 2, 1], 'les statistiques rejoignent la fiche et chaque version');
  egal(appliquerRemontee(creditee, remontee), null, 'le même match ne compte pas deux fois');
  egal(appliquerRemontee(fiche, { match: 'm2', lignes: [{ publication: 'autre', version: 1, stats: stats({ utilisations: 1 }) }] }), null, 'une remontée qui ne la concerne pas ne change rien');

  // Le score : des matchs, pas des téléchargements.
  const base = stats({ utilisations: 60, matchs: 8, metres: 300, franchissements: 12, essais: 3, conserves: 35, pertes: 6, penalitesContre: 2, penalitesPour: 2 });
  egal(scoreCommunautaire(stats({ utilisations: ECHANTILLON_MINIMUM - 1, matchs: 9, essais: 20, metres: 500 })), null, 'sous l’échantillon minimum : pas de score');
  egal(scoreCommunautaire(stats({ utilisations: 90, matchs: 2, essais: 20, metres: 500 })), null, 'deux matchs ne suffisent pas, quel que soit le volume');
  const s0 = scoreCommunautaire(base)!;
  ok(s0 > 50 && s0 < 100, `une bonne combinaison : ${s0}`);
  ok(scoreCommunautaire({ ...base, essais: 9 })! > s0, 'plus d’essais : meilleur score');
  ok(scoreCommunautaire({ ...base, pertes: 20 })! < s0, 'plus de ballons perdus : moins bon');
  ok(scoreCommunautaire({ ...base, penalitesContre: 12 })! < s0, 'plus de pénalités concédées : moins bon');
  ok(scoreCommunautaire({ ...base, metres: 60 })! < s0, 'moins de mètres : moins bon');
  const peu = stats({ utilisations: 25, matchs: 3, metres: 250, franchissements: 10, essais: 3, conserves: 10 });
  const beaucoup = stats({ utilisations: 250, matchs: 30, metres: 2500, franchissements: 100, essais: 30, conserves: 100 });
  ok(scoreCommunautaire(peu)! < scoreCommunautaire(beaucoup)!, 'à résultats égaux, le volume éloigne de la moyenne');
  const populaire = { ...creerFiche('p', 'a', 'A', saisie('ruck-pick'), T0), telecharges: Array.from({ length: 900 }, (_, i) => `c${i}`), notes: Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`n${i}`, 5])) };
  egal(resumeDeFiche(populaire).score, null, 'neuf cents ajouts et trois cents cinq étoiles ne font pas un score');
  egal(metaDepuisFiches([populaire]).length, 0, 'et la méta l’ignore tant qu’elle n’a pas joué');
  const i = indicateurs(base);
  ok(Math.abs(i.conservation - (12 + 3 + 35 + 2) / 60) < 1e-9 && Math.abs(i.reussite - 17 / 60) < 1e-9, 'conservation et réussite sont deux indicateurs distincts');
  egal(ajouterStats(base, base).utilisations, 120, 'les compteurs s’additionnent');

  // Du marché au cahier.
  const detail = { id: 'pub-aaaaaa', version: 2, plan: saisie('ruck-cellule').plan, nom: 'Cellule du marché' };
  const cahier = Array.from({ length: 4 }, (_, n) => ({ ...creerCombinaison(`r${n}`, 'ruck'), nom: `Ruck ${n}` }));
  const ajoute = ajouterAuCahier(cahier.slice(0, 2), detail, 'nouveau')!;
  egal([ajoute.length, ajoute[2].active, ajoute[2].origine, ajoute[2].id], [3, true, { publication: 'pub-aaaaaa', version: 2 }, 'nouveau'], 'emplacement libre : ajoutée active, avec son origine');
  egal(ajouterAuCahier(cahier, detail, 'n')!.at(-1)!.active, false, 'emplacements pleins : elle arrive rangée');
  const remplace = ajouterAuCahier(cahier, detail, 'n', 'r1')!;
  egal([remplace.find((p) => p.id === 'r1')!.active, remplace.at(-1)!.active, remplace.length], [false, true, 5], 'à la place d’une autre : celle-ci est rangée, pas supprimée');
  egal(ajouterAuCahier(Array.from({ length: 12 }, (_, n) => creerCombinaison(`x${n}`, 'melee')), detail, 'n'), null, 'cahier plein : refus');
  const copie = { ...ajoute[2], zone: 'leurs22' as const, couloir: 'gauche' as const, active: false, nom: 'Renommée' };
  const maj = mettreAJour(copie, { ...detail, version: 3, plan: saisie('ruck-pick').plan });
  egal([maj.id, maj.nom, maj.zone, maj.couloir, maj.active, maj.origine?.version, maj.variantes[0].depart], ['nouveau', 'Renommée', 'leurs22', 'gauche', false, 3, 8], 'mise à jour : le dessin change, la place et les réglages restent');
  egal(versionsDisponibles([ajoute[2], cahier[0]], [{ id: 'pub-aaaaaa', version: 4, etat: 'publiee' }]), { nouveau: 4 }, 'nouvelle version disponible');
  egal(versionsDisponibles([ajoute[2]], [{ id: 'pub-aaaaaa', version: 4, etat: 'retiree' }]), {}, 'une publication retirée ne propose rien');
  egal(versionsDisponibles([ajoute[2]], [{ id: 'pub-aaaaaa', version: 2, etat: 'publiee' }]), {}, 'à jour : rien');
}

// ═══ 8. L'IA COMMUNAUTAIRE ═══════════════════════════════════════════════════════════════════════════════════════════
titre('IA communautaire');
{
  const eprouve = (utilisations: number, essais: number, pertes: number): StatsCombinaison => stats({ utilisations, matchs: 12, metres: utilisations * 6, franchissements: Math.round(utilisations * .2), essais, conserves: Math.round(utilisations * .5), pertes });
  const fiche = (id: string, exemple: string, s: StatsCombinaison): FichePubliee => ({ ...creerFiche(`meta-${id}`, 'a', 'A', saisie(exemple), T0), stats: s });
  const fiches = [
    fiche('cellule', 'ruck-cellule', eprouve(80, 4, 6)), fiche('pick', 'ruck-pick', eprouve(90, 2, 5)), fiche('large', 'ruck-large', eprouve(70, 5, 8)),
    fiche('lecture', 'ruck-lecture', eprouve(60, 3, 7)), fiche('m8', 'melee-8', eprouve(50, 2, 3)), fiche('mlarge', 'melee-large', eprouve(50, 3, 5)),
    fiche('mcroisee', 'melee-croisee', eprouve(40, 3, 6)), fiche('tmaul', 'touche-maul', eprouve(45, 3, 2)), fiche('tmilieu', 'touche-milieu', eprouve(45, 3, 5)),
    fiche('tdouble', 'touche-double', eprouve(40, 2, 4)), fiche('lpick', 'ligne-pick', eprouve(40, 6, 3)), fiche('lmaul', 'ligne-maul', eprouve(40, 7, 2)),
    fiche('peu', 'melee-ferme', eprouve(10, 5, 0)), { ...fiche('retiree', 'melee-rapide', eprouve(90, 9, 1)), etat: 'retiree' as const },
  ];
  const meta = metaDepuisFiches(fiches);
  egal(meta.length, 12, 'la méta : publiées, échantillon suffisant');
  ok(!meta.some((m) => m.id === 'meta-peu' || m.id === 'meta-retiree'), 'ni la peu jouée, ni la retirée');
  ok(meta.every((m, i) => i === 0 || m.score <= meta[i - 1].score), 'classée par score');
  const compter = (style: 'avants' | 'large' | 'leurres' | 'pied' | 'equilibre', niveau: number, source: readonly MetaCombinaison[] = meta) => {
    const types: Record<string, number> = {}, difficultes = [0, 0, 0, 0];
    for (let n = 0; n < 200; n++) for (const p of cahierCommunautaire(source, { style, niveau }, `club-${n}`)) {
      const m = source.find((x) => `meta:${x.id}` === p.id)!;
      types[m.type] = (types[m.type] ?? 0) + 1; difficultes[m.difficulte]++;
    }
    return { types, difficultes };
  };
  const avants = compter('avants', 72), large = compter('large', 72);
  ok(avants.types.avants > large.types.avants * 1.3, `une équipe d’avants prend plus de jeu d’avants (${avants.types.avants} contre ${large.types.avants})`);
  ok((large.types.large ?? 0) > (avants.types.large ?? 0) * 1.3, `une équipe joueuse prend plus de jeu au large (${large.types.large} contre ${avants.types.large ?? 0})`);
  const faible = compter('equilibre', 55), grosse = compter('equilibre', 85);
  ok(faible.difficultes[1] / (faible.difficultes[1] + faible.difficultes[2] + faible.difficultes[3]) > grosse.difficultes[1] / (grosse.difficultes[1] + grosse.difficultes[2] + grosse.difficultes[3]),
    'une équipe faible garde des combinaisons simples, une grosse équipe ose les plus riches');
  const un = cahierCommunautaire(meta, { style: 'avants', niveau: 72 }, 'Stade Test#1');
  egal(JSON.stringify(cahierCommunautaire(meta, { style: 'avants', niveau: 72 }, 'Stade Test#1')), JSON.stringify(un), 'même club, même saison : même cahier');
  ok(un.length > 0 && un.length <= 7 && un.every((p) => p.active && p.origine && p.id.startsWith('meta:')), 'un cahier court, lié au marché pour les statistiques');
  ok(new Set(un.map((p) => p.id)).size === un.length, 'jamais deux fois la même combinaison');
  egal(emplacementsOccupes(un).enTrop, [], 'dans ses emplacements');
  egal(combinaisonsValides(un).length, un.length, 'des plans valides');
  // La méta évolue : une combinaison qui s'effondre en match disparaît des cahiers.
  const avant = compter('equilibre', 72).types;
  const effondree = metaDepuisFiches(fiches.map((f) => (f.id === 'meta-large' ? { ...f, stats: eprouve(200, 0, 150) } : f)));
  const apres = (() => { let n = 0; for (let i = 0; i < 200; i++) n += cahierCommunautaire(effondree, { style: 'equilibre', niveau: 72 }, `club-${i}`).filter((p) => p.id === 'meta:meta-large').length; return n; })();
  const avantLarge = (() => { let n = 0; for (let i = 0; i < 200; i++) n += cahierCommunautaire(meta, { style: 'equilibre', niveau: 72 }, `club-${i}`).filter((p) => p.id === 'meta:meta-large').length; return n; })();
  ok(avantLarge > 0 && apres === 0, `la méta évolue : jouée par ${avantLarge} clubs sur 200, puis par aucun quand ses résultats s’effondrent`);
  ok(Object.keys(avant).length >= 2, 'plusieurs genres de jeu coexistent');
  egal(cahierDuClubIA('Stade Toulousain', [{ note: 80 }], 'top14#3', []), [], 'sans méta, un club ne reçoit aucun cahier');
  ok(cahierDuClubIA('Stade Toulousain', Array.from({ length: 15 }, () => ({ note: 80 })), 'top14#3', meta).length > 0, 'avec une méta, il en reçoit un');
}

// ═══ 9. LE SERVEUR ═══════════════════════════════════════════════════════════════════════════════════════════════════
titre('Service du marché');
{
  const lignes: { fiche: FichePubliee; revision: number }[] = [];
  let maintenant = T0;
  const marche = creerMarcheCombinaisons(marcheCombinaisonsMemoire(lignes), () => maintenant);
  const refus = async (faire: () => Promise<unknown>) => { try { await faire(); return null; } catch (e) { return e instanceof RefusMarche ? e.raison : `autre:${(e as Error).message}`; } };
  const a = await marche.publier('compte-a', 'Alice', { plan: plan('ruck-cellule'), nom: 'Cellule d’Alice', description: 'Dans le dos de la cellule.' }, maintenant);
  egal([a.version, a.mienne, a.etat, a.telechargements], [1, true, 'publiee', 0], 'publiée par Alice');
  egal(await refus(() => marche.publier('compte-b', 'Bob', { plan: plan('ruck-cellule'), nom: 'La mienne' }, maintenant)), 'copie', 'Bob ne peut pas republier la même');
  egal(await refus(() => marche.publier('compte-b', 'Bob', { plan: plan('ruck-pick'), nom: 'x' }, maintenant)), 'nom', 'nom trop court');
  const b = await marche.publier('compte-b', 'Bob', { plan: plan('ruck-pick'), nom: 'Pick de Bob' }, maintenant);
  egal((await marche.liste('compte-b', false)).map((f) => [f.nom, f.mienne]).sort(), [['Cellule d’Alice', false], ['Pick de Bob', true]], 'chacun voit les deux, et sait laquelle est la sienne');
  egal((await marche.ajouter(a.id, 'compte-b'))!.telechargements, 1, 'Bob l’ajoute à ses tactiques');
  egal((await marche.ajouter(a.id, 'compte-b'))!.telechargements, 1, 'une fois par compte');
  egal((await marche.ajouter(a.id, 'compte-a'))!.telechargements, 1, 'l’auteur ne gonfle pas son compteur');
  egal(await marche.noter(a.id, 'compte-a', 5), null, 'Alice ne se note pas');
  egal((await marche.noter(a.id, 'compte-b', 4))!.maNote, 4, 'Bob note');
  maintenant += 1000;
  const v2 = await marche.publier('compte-a', 'Alice', { plan: plan('ruck-lecture'), nom: 'Cellule d’Alice', note: 'Le 10 lit la défense', publication: a.id }, maintenant);
  egal([v2.version, v2.versions.length, v2.versions[0].note], [2, 2, 'Le 10 lit la défense'], 'version 2, la première est gardée');
  egal(await refus(() => marche.publier('compte-b', 'Bob', { plan: plan('melee-8'), nom: 'Vol', publication: a.id }, maintenant)), 'interdit', 'Bob ne publie pas une version de la fiche d’Alice');
  egal(await refus(() => marche.publier('compte-a', 'Alice', { plan: plan('melee-8'), nom: 'Rien', publication: 'inconnue' }, maintenant)), 'introuvable', 'publication inconnue');
  // Deux écritures en même temps : la révision les départage, aucune n'est perdue.
  await Promise.all([marche.noter(b.id, 'compte-a', 5), marche.noter(b.id, 'compte-c', 3), marche.ajouter(b.id, 'compte-c')]);
  const apres = (await marche.detail(b.id, 'compte-c', false))!;
  egal([apres.votes, apres.note, apres.telechargements], [2, 4, 1], 'trois écritures simultanées sur la même fiche : toutes comptées');
  // Statistiques de match, une seule fois.
  const remontee = { match: 'ligue-1:match-7', lignes: [{ publication: a.id, version: 2, stats: stats({ utilisations: 9, matchs: 1, metres: 60, franchissements: 2, conserves: 5, pertes: 2 }) }] };
  ok(await marche.verser([remontee]), 'le match verse ses statistiques');
  ok(await marche.verser([remontee]), 'le reverser ne plante pas');
  egal((await marche.detail(a.id, 'compte-b', false))!.stats.utilisations, 9, 'et ne compte qu’une fois');
  ok(await marche.verser([{ match: 'm', lignes: [{ publication: '00000000-0000-4000-8000-000000000000', version: 1, stats: stats({ utilisations: 3 }) }] }]), 'une fiche disparue ne retient pas la file');
  // Signalements et modération.
  for (const compte of ['s1', 's2', 's3']) await marche.signaler(b.id, compte, 'spam');
  egal((await marche.liste('compte-a', false)).some((f) => f.id === b.id), false, 'trois signalements : elle quitte la liste');
  egal((await marche.liste('compte-b', false)).find((f) => f.id === b.id)?.etat, 'attente', 'son auteur la voit encore, en attente');
  egal((await marche.detail(b.id, 'kiri', true))!.signalements, 3, 'le modérateur voit les signalements');
  egal(await marche.detail(b.id, 'compte-a', false), null, 'un autre compte ne peut plus l’ouvrir');
  egal(await marche.moderer(b.id, 'retablir', 'compte-b', false), null, 'son auteur ne la rétablit pas lui-même');
  egal((await marche.moderer(b.id, 'retablir', 'kiri', true))!.etat, 'publiee', 'le modérateur la rétablit');
  egal((await marche.moderer(a.id, 'retirer', 'compte-a', false))!.etat, 'retiree', 'Alice retire la sienne');
  egal((await marche.liste('compte-b', false)).some((f) => f.id === a.id), false, 'retirée : hors de la liste');
  egal(await marche.meta(), [], 'aucune combinaison n’a encore assez joué pour entrer dans la méta');
  // Table absente : le marché est fermé, pas cassé.
  const ferme = creerMarcheCombinaisons({ empreinte: async () => null, toutes: async () => [], lire: async () => null, creer: async () => false, ecrire: async () => false });
  egal([await ferme.liste('x', false), await ferme.verser([remontee]), await ferme.meta()], [[], false, []], 'sans la table : liste vide, la file des matchs attend');
  egal(await refus(() => ferme.publier('x', 'X', { plan: plan('melee-8'), nom: 'Valide' }, T0)), 'introuvable', 'et la publication est refusée proprement');
}

titre('Le vrai gestionnaire HTTP : marché ouvert, modération réservée, match joué jusqu’au bout');
const dossier = mkdtempSync(join(tmpdir(), 'destiny-marche-'));
try {
  const db = stockageFichier(join(dossier, 'base.json'));
  const kiri = randomUUID(), autre = randomUUID();
  for (const [id, identifiant, pseudo] of [[kiri, 'kiri', 'Kiri'], [autre, 'visiteur', 'Visiteur']] as const) {
    await db.creerCompte({ id, identifiant, pseudo, empreinte: 'test' });
    await db.ouvrirSession(empreinteJeton(id), id, Date.now() + 3_600_000);
  }
  const api = creerGestionnaireCarriere(db);
  async function appel(jeton: string, url: string, body?: unknown) {
    let statut = 200; let donnees: any;
    const res = { status(n: number) { statut = n; return res; }, setHeader() {}, json(d: unknown) { donnees = d; } };
    await api.handler({ method: body ? 'POST' : 'GET', url, headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json', cookie: jeton ? `destiny_carriere=${jeton}` : '' }, body }, res);
    return { statut, donnees };
  }
  const marche = (jeton: string, corps: object) => appel(jeton, '/api/carriere?action=marcheCombinaisons', { action: 'marcheCombinaisons', ...corps });

  const compte = (await appel(autre, '/api/carriere')).donnees.compte;
  egal([compte.administrateur, compte.featureFlags.combinaisons], [false, true], 'un compte ordinaire reçoit le cahier, pas l’administration');
  egal((await appel(autre, '/api/carriere?marcheCombinaisons=1')).donnees.fiches, [], 'un compte ordinaire lit le marché');
  egal((await appel('', '/api/carriere?marcheCombinaisons=1')).statut, 401, 'sans compte : refusé');
  const meta = await appel('', '/api/carriere?metaCombinaisons=1');
  egal([meta.statut, meta.donnees.meta], [200, []], 'la méta est publique, et vide tant que rien n’a assez joué');
  egal((await appel(kiri, '/api/carriere?marcheCombinaisons=1')).donnees.fiches, [], 'le compte interne voit un marché vide');
  const refusNom = await marche(kiri, { operation: 'publier', plan: plan('ruck-cellule'), nom: 'Gros connard' });
  egal([refusNom.statut, refusNom.donnees.refus], [409, 'offensant'], 'un nom offensant est refusé, avec sa raison');
  const publie = await marche(kiri, { operation: 'publier', plan: plan('ruck-cellule'), nom: 'Cellule du banc', description: 'Le 13 dans le dos.' });
  egal([publie.statut, publie.donnees.detail.version, publie.donnees.detail.mienne], [200, 1, true], 'publication par HTTP');
  const idFiche = publie.donnees.detail.id as string;
  egal((await marche(kiri, { operation: 'publier', plan: plan('ruck-cellule'), nom: 'Encore' })).donnees.refus, 'dejaPubliee', 'la même, deux fois : refusée');
  egal((await appel(kiri, `/api/carriere?marcheCombinaisons=${idFiche}`)).donnees.detail.plan.variantes[0].actions.length, plan('ruck-cellule').variantes[0].actions.length, 'le détail rend le plan');
  const vueAutre = await appel(autre, `/api/carriere?marcheCombinaisons=${idFiche}`);
  egal([vueAutre.statut, vueAutre.donnees.detail.mienne], [200, false], 'un compte ordinaire ouvre la fiche d’un autre');
  const noteAutre = (await marche(autre, { operation: 'noter', id: idFiche, note: 4 })).donnees.detail;
  egal([noteAutre.votes, noteAutre.maNote], [1, 4], 'et la note');
  egal((await marche(autre, { operation: 'retablir', id: idFiche })).statut, 403, 'mais ne modère pas');
  egal((await marche(autre, { operation: 'retirer', id: idFiche })).statut, 409, 'ni ne retire la fiche d’un autre');
  egal((await appel(kiri, '/api/carriere?marcheCombinaisons=00000000-0000-4000-8000-000000000000')).statut, 404, 'fiche inconnue');
  egal((await marche(kiri, { operation: 'noter', id: idFiche, note: 5 })).statut, 409, 'on ne note pas la sienne');
  egal((await marche(kiri, { operation: 'inconnue', id: idFiche })).statut, 409, 'opération inconnue : refusée');
  egal((await marche(kiri, { operation: 'signaler', id: 'pas-un-id', motif: 'spam' })).statut, 400, 'identifiant invalide');

  // Un match du Laboratoire, joué jusqu'à la sirène avec ce plan dans le cahier.
  const ligues = await appel(kiri, '/api/carriere');
  const labo = ligues.donnees.ligues.find((l: any) => l.laboratoire);
  const vue = (await appel(kiri, `/api/carriere?ligue=${labo.id}`)).donnees;
  const monClub = vue.clubs.find((c: any) => c.id === vue.monClubId);
  const commander = (commande: unknown) => appel(kiri, '/api/carriere', { action: 'commande', ligue: labo.id, requeteId: randomUUID(), commande });
  const ajoutee = (await marche(kiri, { operation: 'ajouter', id: idFiche })).donnees.detail;
  const cahier = [...ajouterAuCahier([], ajoutee, 'plan-marche')!, { ...creerCombinaison('plan-perso', 'melee'), nom: 'Perso' },
    ...Array.from({ length: 5 }, (_, i) => ({ ...creerCombinaison(`ruck-${i}`, 'ruck'), nom: `Ruck ${i}`, couloir: 'gauche' as const }))];
  const sauve = await commander({ type: 'strategie', strategie: { ...monClub.strategie, modeCombinaisons: 'configure', combinaisons: cahier } });
  egal(sauve.statut, 200, 'le cahier est enregistré');
  const enregistre = sauve.donnees.clubs.find((c: any) => c.id === vue.monClubId).strategie.combinaisons as Combinaison[];
  egal(enregistre.filter((p) => p.active && p.phase === 'ruck').length, EMPLACEMENTS.ruck, 'le serveur range ce qui dépasse les emplacements');
  egal(enregistre.find((p) => p.id === 'plan-marche')?.origine, { publication: idFiche, version: 1 }, 'le plan garde son origine');
  const rencontre = vue.rencontres.find((r: any) => !r.resultat && (r.domicile === vue.monClubId || r.exterieur === vue.monClubId));
  egal((await commander({ type: 'laboratoireLancer', matchId: rencontre.id })).statut, 200, 'le match part');
  const fin = await commander({ type: 'laboratoireTerminer', matchId: rencontre.id });
  egal(fin.statut, 200, 'le match est joué jusqu’à la sirène');
  const apres = fin.donnees;
  const clubApres = apres.clubs.find((c: any) => c.id === vue.monClubId);
  const jouees = Object.entries(clubApres.statsCombinaisons ?? {}) as [string, StatsCombinaison][];
  ok(jouees.length > 0, `le club retrouve ses statistiques : ${jouees.map(([id, s]) => `${id} ×${s.utilisations}`).join(', ')}`);
  ok(jouees.every(([id, s]) => enregistre.some((p) => p.id === id) && s.utilisations > 0 && s.utilisations === s.essais + s.franchissements + s.conserves + s.pieds + s.pertes + s.penalitesPour + s.penalitesContre), 'chaque utilisation a une issue, pour des plans de son cahier');
  ok(!('remonteesCombinaisons' in apres), 'la file du marché n’est pas dans la vue');
  ok(apres.clubs.filter((c: any) => c.id !== vue.monClubId).every((c: any) => !('statsCombinaisons' in c) && !c.strategie), 'les statistiques et le cahier des autres clubs restent privés');
  ok(!JSON.stringify(apres.rencontres.find((r: any) => r.id === rencontre.id)).includes('"combinaisons"'), 'le match archivé ne montre pas le bilan des combinaisons');
  const detail = (await appel(kiri, `/api/carriere?marcheCombinaisons=${idFiche}`)).donnees.detail;
  const duMarche = clubApres.statsCombinaisons?.['plan-marche'] as StatsCombinaison | undefined;
  egal([detail.stats.utilisations, detail.stats.matchs], [duMarche?.utilisations ?? 0, duMarche ? 1 : 0], `le marché reçoit les statistiques du plan qui vient de lui (${duMarche?.utilisations ?? 0} utilisations)`);
  // Une autre commande sur la ligue ne reverse rien.
  await commander({ type: 'laboratoireSoigner' });
  egal((await appel(kiri, `/api/carriere?marcheCombinaisons=${idFiche}`)).donnees.detail.stats.utilisations, duMarche?.utilisations ?? 0, 'rien n’est compté deux fois');
} finally { rmSync(dossier, { recursive: true, force: true }); }

console.log(`\nCorrectif 41 — atelier, cahier vivant, marché, IA communautaire : ${controles} contrôles vérifiés.`);
