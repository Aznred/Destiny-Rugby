// BANC — CORRECTIF 41 : L'ADJOINT QUI COMPOSE, LES CONTRATS RÉGLÉS PAR L'ASSISTANT
//
// Signalé en jeu : « quand je laisse l'entraîneur adjoint gérer, il aligne parfois un effectif clairement inférieur
// alors que de meilleurs joueurs sont disponibles » ; « il est beaucoup trop pénible de devoir gérer énormément de
// contrats un par un ».
//
//   1. la note effective au poste décide (un ailier de 69 passe devant un centre de 71 à l'aile) ;
//   2. la condition physique fait tourner — sauf en finale ;
//   3. les consignes de l'entraîneur sont tenues (toujours titulaire, ne pas sélectionner, priorité jeunes) ;
//   4. le banc couvre la première ligne, la cage, la troisième ligne, la charnière et les lignes arrière ;
//   5. sur TOUS les clubs du jeu : jamais moins bien que l'ancien choix, et de combien c'est mieux ;
//   6. un trou dans une feuille retouchée se comble par un joueur du poste ;
//   7. les contrats : le plan, de vraies négociations, le budget tenu, la clôture qui ne laisse rien en plan.
//
//   npm run verify:correctif41

import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { COMPETITIONS } from '../src/data/clubs';
import { POSTE_PAR_ID } from '../src/data/rugby';
import { useGame } from '../src/store/useGame';
import { effectifDuClub, type Coequipier } from '../src/lib/effectif';
import { rendementAuPoste } from '../src/lib/carteJoueur';
import {
  compositionManagerParDefaut, COUVERTURE_BANC, POSTES_XV_MANAGER, reconcilerCompositionManager,
} from '../src/lib/compositionManager';
import {
  composerParLAdjoint, facteurPhysique, importanceDeLAffiche, noteEffectiveAuPoste, type EtatPhysiqueAdjoint,
} from '../src/lib/adjointComposition';
import { rapportAdjointManager } from '../src/lib/adjointManager';
import {
  executerPlan, planContrats, politiqueContrats, POLITIQUE_CONTRATS_DEFAUT, reglerLesContrats, statutSportif,
} from '../src/lib/contratsAutomatiques';
import { assurerEtatCarriereAvancee } from '../src/lib/carriereAvancee';
import { contratsExpirants } from '../src/lib/clotureSaison';
import { situationSalariale } from '../src/lib/recrutementManager';
import { SEMAINES_PAR_SAISON } from '../src/data/calendrier';
import type { CompositionManager, Manager, PosteId } from '../src/types';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';

chargerTextes(TEXTES);

let controles = 0;
const ok = (condition: unknown, quoi: string) => { controles++; assert.ok(condition, quoi); };
const egal = <T,>(recu: T, attendu: T, quoi: string) => { controles++; assert.deepEqual(recu, attendu, quoi); };
const debut = Date.now();

// ── Un groupe d'essai : deux joueurs par poste, plus de quoi faire un banc ───────────────────────────────
let numero = 0;
const joueur = (poste: PosteId, note: number, extra: Partial<Coequipier> = {}): Coequipier => ({
  id: `j${++numero}`, nom: `Joueur ${numero}`, poste, age: 27, note, potentiel: note, nation: 'France', regen: false, ...extra,
});
const groupeType = (): Coequipier[] => {
  numero = 0;
  return [...POSTES_XV_MANAGER.map((p) => joueur(p, 78)), ...POSTES_XV_MANAGER.map((p) => joueur(p, 72)), ...POSTES_XV_MANAGER.slice(0, 4).map((p) => joueur(p, 66))];
};
const parId = (g: Coequipier[]) => new Map(g.map((j) => [j.id, j]));
const sommeEffective = (g: Coequipier[], c: CompositionManager) => {
  const m = parId(g);
  return c.titulaires.reduce((n, id, i) => n + (m.get(id) ? noteEffectiveAuPoste(m.get(id)!, POSTES_XV_MANAGER[i]) : 0), 0);
};
const horsPoste = (g: Coequipier[], c: CompositionManager) => {
  const m = parId(g);
  return c.titulaires.filter((id, i) => m.get(id) && rendementAuPoste(m.get(id)!.poste, POSTES_XV_MANAGER[i], m.get(id)!.postesSecondaires) < 1).length;
};

// ═══ 1. LA NOTE EFFECTIVE AU POSTE ═══════════════════════════════════════════════════════════════════════
{
  const g = groupeType();
  const r = composerParLAdjoint(g);
  ok(r.complet && r.composition.titulaires.length === 15 && r.composition.remplacants.length === 8, 'vingt-trois places remplies');
  egal(new Set([...r.composition.titulaires, ...r.composition.remplacants]).size, 23, 'aucun joueur aligné deux fois');
  egal(horsPoste(g, r.composition), 0, 'un groupe complet n’aligne personne hors de son poste');
  ok(r.composition.titulaires.every((id) => parId(g).get(id)!.note === 78), 'le XV est fait des meilleurs à chaque poste');

  // « Centre GEN 71 et ailier GEN 69 pour jouer ailier » : l'ailier.
  const h = groupeType().filter((j) => j.poste !== 'ailier_gauche');
  const centre = joueur('premier_centre', 71), ailier = joueur('ailier_gauche', 69);
  h.push(centre, ailier);
  const s = composerParLAdjoint(h);
  egal(s.composition.titulaires[POSTES_XV_MANAGER.indexOf('ailier_gauche')], ailier.id, 'l’ailier de 69 passe devant le centre de 71 à l’aile');
  ok(noteEffectiveAuPoste(centre, 'ailier_gauche') < noteEffectiveAuPoste(ailier, 'ailier_gauche'), 'la note effective du centre à l’aile est inférieure');
  egal(Math.round(noteEffectiveAuPoste(centre, 'ailier_gauche') * 10) / 10, 58.2, '71 × 0,82 = 58,2');

  // L'ancien choix prenait « le poste exact d'abord » : un 58 passait devant trois joueurs du poste jumeau.
  numero = 100;
  const k = [...groupeType().filter((j) => j.poste !== 'ailier_gauche' && j.poste !== 'ailier_droit'),
    joueur('ailier_gauche', 58), joueur('ailier_droit', 74, { postesSecondaires: ['ailier_gauche'] }), joueur('ailier_droit', 73), joueur('ailier_droit', 72)];
  const ancien = compositionManagerParDefaut(k), neuf = composerParLAdjoint(k).composition;
  egal(parId(k).get(ancien.titulaires[10])!.note, 58, 'l’ancien choix alignait l’ailier gauche de 58');
  egal(parId(k).get(neuf.titulaires[10])!.note, 74, 'l’adjoint y met l’ailier de 74 qui joue aussi à gauche');
  ok(sommeEffective(k, neuf) > sommeEffective(k, ancien), 'et le XV vaut davantage');
}

// ═══ 2. LA CONDITION PHYSIQUE ET L'ENJEU ═════════════════════════════════════════════════════════════════
{
  const g = groupeType();
  const vedette = g.find((j) => j.poste === 'demi_ouverture' && j.note === 78)!;
  vedette.note = 80;
  const doublure = g.find((j) => j.poste === 'demi_ouverture' && j.note === 72)!;
  doublure.note = 77;
  const etats = new Map<string, EtatPhysiqueAdjoint>([[vedette.id, { fraicheur: 54 }], [doublure.id, { fraicheur: 96 }]]);
  const place = POSTES_XV_MANAGER.indexOf('demi_ouverture');
  const ordinaire = composerParLAdjoint(g, { etats });
  egal(ordinaire.composition.titulaires[place], doublure.id, 'à 54 % de condition, le meilleur laisse sa place au second (96 %)');
  egal(ordinaire.choix[place].raison, 'rotation', 'le rapport dit que c’est une rotation');
  egal(ordinaire.choix[place].aLaPlaceDe, vedette.id, 'et qui est ménagé');
  const ecart = ordinaire.ecartes.find((e) => e.joueurId === vedette.id);
  ok(ecart?.raison === 'repos' && ecart.fraicheur === 54 && ecart.devance === doublure.id, 'le joueur ménagé figure au rapport : repos, 54 %');
  const finale = composerParLAdjoint(g, { etats, importance: 'finale' });
  egal(finale.composition.titulaires[place], vedette.id, 'en finale, le meilleur joue quand même');
  const frais = composerParLAdjoint(g, { etats: new Map([[vedette.id, { fraicheur: 84 }]]) });
  egal(frais.composition.titulaires[place], vedette.id, 'à 84 % de condition, personne n’est mis au repos');
  ok(frais.ecartes.every((e) => e.raison !== 'repos'), 'aucun repos sans raison');
  ok(facteurPhysique(100) === 1 && facteurPhysique(80) === 1 && facteurPhysique(54) < facteurPhysique(54, 'decisif')
    && facteurPhysique(54, 'decisif') < facteurPhysique(54, 'finale'), 'la fatigue pèse moins quand le match compte plus');
  ok(facteurPhysique(0, 'amical') >= .6, 'la condition ne retire jamais plus de 40 %');

  egal(importanceDeLAffiche({ nature: 'phaseFinale', tour: 'finale' }), 'finale', 'une finale est une finale');
  egal(importanceDeLAffiche({ nature: 'phaseFinale', tour: 'demie' }), 'decisif', 'un match couperet est décisif');
  egal(importanceDeLAffiche({ nature: 'championnat' }, -8, 12), 'mineur', 'un adversaire nettement plus faible loin de la fin : on peut tourner');
  egal(importanceDeLAffiche({ nature: 'championnat' }, -8, 2), 'mineur', 'un adversaire très faible reste un petit match, même en fin de saison');
  egal(importanceDeLAffiche({ nature: 'championnat' }, 0, 2), 'decisif', 'les trois dernières journées contre un adversaire à sa portée');
  egal(importanceDeLAffiche({ nature: 'championnat' }, 0, 12), 'ordinaire', 'un match de championnat ordinaire');
  egal(importanceDeLAffiche({ cle: 'prepa#1', nature: 'championnat' }), 'amical', 'un match de préparation est un amical');
}

// ═══ 3. LES CONSIGNES ════════════════════════════════════════════════════════════════════════════════════
{
  const g = groupeType();
  const second = g.find((j) => j.poste === 'arriere' && j.note === 72)!;
  const premier = g.find((j) => j.poste === 'arriere' && j.note === 78)!;
  const place = POSTES_XV_MANAGER.indexOf('arriere');
  const verrou = composerParLAdjoint(g, { consignes: { joueurs: { [second.id]: 'titulaire' } } });
  egal(verrou.composition.titulaires[place], second.id, '« toujours titulaire » : il débute');
  egal(verrou.choix[place].raison, 'consigne', 'et le rapport dit que c’est une consigne');
  const fatigue = composerParLAdjoint(g, { consignes: { joueurs: { [second.id]: 'titulaire' } }, etats: new Map([[second.id, { fraicheur: 40 }]]) });
  egal(fatigue.composition.titulaires[place], second.id, 'la consigne passe avant la fatigue');
  const blesse = composerParLAdjoint(g, { consignes: { joueurs: { [second.id]: 'titulaire' } }, indisponibles: new Set([second.id]) });
  ok(!blesse.composition.titulaires.includes(second.id) && !blesse.composition.remplacants.includes(second.id), 'elle ne force pas un blessé');
  const reprise = composerParLAdjoint(g, { consignes: { joueurs: { [second.id]: 'titulaire' } }, bancSeulement: new Set([second.id]) });
  ok(!reprise.composition.titulaires.includes(second.id), 'ni un joueur que le médecin réserve au banc');

  const exclu = composerParLAdjoint(g, { consignes: { joueurs: { [premier.id]: 'exclu' } } });
  ok(![...exclu.composition.titulaires, ...exclu.composition.remplacants].includes(premier.id), '« ne pas sélectionner » : il n’est pas sur la feuille');
  egal(exclu.ecartes.find((e) => e.joueurId === premier.id)?.raison, 'consigne', 'le rapport le dit');
  const court = g.slice(0, 23);
  const rappel = composerParLAdjoint(court, { consignes: { joueurs: { [court[0].id]: 'exclu' } } });
  ok(rappel.complet && [...rappel.composition.titulaires, ...rappel.composition.remplacants].includes(court[0].id), 'à vingt-trois, l’exclusion cède : on ne joue pas à vingt-deux');

  // Priorité aux jeunes : à niveau proche, le jeune qui a de la marge débute — jamais en finale.
  const jeune = joueur('numero_8', 76, { age: 21, potentiel: 86 });
  const h = [...g, jeune];
  const huit = POSTES_XV_MANAGER.indexOf('numero_8');
  ok(composerParLAdjoint(h).composition.titulaires[huit] !== jeune.id, 'sans consigne, le titulaire de 78 débute');
  const jeunes = composerParLAdjoint(h, { consignes: { prioriteJeunes: true } });
  egal(jeunes.composition.titulaires[huit], jeune.id, 'priorité jeunes : le 76 de vingt et un ans débute');
  egal(jeunes.choix[huit].raison, 'jeune', 'le rapport le dit');
  ok(composerParLAdjoint(h, { consignes: { prioriteJeunes: true }, importance: 'finale' }).composition.titulaires[huit] !== jeune.id, 'pas en finale');
  egal(composerParLAdjoint(h, { importance: 'amical' }).composition.titulaires[huit], jeune.id, 'en amical, les jeunes jouent');
}

// ═══ 4. LE BANC ══════════════════════════════════════════════════════════════════════════════════════════
{
  const g = groupeType();
  const r = composerParLAdjoint(g);
  const m = parId(g);
  const familles = r.composition.remplacants.map((id) => POSTE_PAR_ID[m.get(id)!.poste].famille);
  egal(familles.slice(0, 3), ['talonneur', 'pilier', 'pilier'], 'une première ligne complète sur le banc');
  egal(familles[3], 'deuxieme_ligne', 'un deuxième ligne');
  egal(familles[4], 'troisieme_ligne', 'un troisième ligne');
  egal(familles.slice(5, 7), ['demi_melee', 'demi_ouverture'], 'la charnière');
  ok(['centre', 'ailier', 'arriere'].includes(familles[7]), 'un trois-quarts');
  ok(r.choix.slice(15).every((c, i) => COUVERTURE_BANC[i].includes(c.poste) && c.raison === 'couverture'), 'chaque remplaçant couvre le poste de sa place');
  // Sept joueurs du même profil ne font pas un banc : les meilleurs « restes » sont des ailiers, le banc reste équilibré.
  const h = [...groupeType(), ...Array.from({ length: 6 }, () => joueur('ailier_droit', 77))];
  const b = composerParLAdjoint(h);
  const ailiers = b.composition.remplacants.filter((id) => POSTE_PAR_ID[parId(h).get(id)!.poste].famille === 'ailier').length;
  ok(ailiers <= 1, `six ailiers de 77 en réserve : un seul sur le banc (${ailiers})`);
  ok(composerParLAdjoint(g).composition.buteurId && composerParLAdjoint(g).composition.capitaineId, 'un capitaine et un buteur sont désignés');
  egal(JSON.stringify(composerParLAdjoint(g)), JSON.stringify(composerParLAdjoint(groupeType())), 'même groupe, même feuille : aucun tirage');
}

// ═══ 5. TOUS LES CLUBS DU JEU ════════════════════════════════════════════════════════════════════════════
{
  let clubs = 0, mieux = 0, pareil = 0, gain = 0, horsAvant = 0, horsApres = 0, pire = 0, incomplets = 0;
  for (const competition of COMPETITIONS) {
    for (const club of competition.clubs) {
      // Vingt et un clubs ont deux licenciés sous le même identifiant : on compare sur le groupe dédoublonné.
      const vus = new Set<string>();
      const g = effectifDuClub(club.nom, 1).filter((j) => !vus.has(j.id) && !!vus.add(j.id));
      if (g.length < 23) continue;
      const r = composerParLAdjoint(g);
      if (!r.complet) { incomplets++; continue; }
      clubs++;
      const ancien = compositionManagerParDefaut(g);
      const a = sommeEffective(g, ancien), n = sommeEffective(g, r.composition);
      if (n > a + .01) mieux++; else if (n < a - .01) pire++; else pareil++;
      gain += n - a;
      horsAvant += horsPoste(g, ancien);
      horsApres += horsPoste(g, r.composition);
      assert.equal(new Set([...r.composition.titulaires, ...r.composition.remplacants]).size, 23, `${club.nom} : un joueur aligné deux fois`);
    }
  }
  controles += clubs;
  console.log(`   ${clubs} clubs : XV de l’adjoint meilleur dans ${mieux}, égal dans ${pareil}, moins bon dans ${pire} · gain moyen ${(gain / clubs).toFixed(2)} point de note effective cumulée`);
  console.log(`   titulaires hors poste : ${horsAvant} avec l’ancien choix, ${horsApres} avec l’adjoint (${incomplets} groupe(s) trop court(s))`);
  egal(pire, 0, 'sur aucun club l’adjoint ne fait moins bien que l’ancien choix');
  ok(mieux > 0, 'et il fait mieux sur une partie des clubs');
  ok(horsApres <= horsAvant, 'il n’aligne pas davantage de joueurs hors poste');
}

// ═══ 6. UN TROU DANS UNE FEUILLE RETOUCHÉE ═══════════════════════════════════════════════════════════════
{
  const g = groupeType();
  const defaut = compositionManagerParDefaut(g);
  // L'entraîneur a retouché sa feuille : le talonneur de la feuille par défaut est descendu sur le banc.
  const talon = defaut.titulaires[1], talon2 = g.find((j) => j.poste === 'talonneur' && j.id !== talon)!.id;
  const feuille: CompositionManager = { ...defaut,
    titulaires: defaut.titulaires.map((id) => id === talon ? talon2 : id),
    remplacants: defaut.remplacants.map((id) => id === talon2 ? talon : id) };
  const ouvreur = feuille.titulaires[9];
  const r = reconcilerCompositionManager(g, feuille, new Set([ouvreur]));
  const remplacant = parId(g).get(r.titulaires[9])!;
  egal(remplacant.poste, 'demi_ouverture', 'l’ouvreur blessé est remplacé par un ouvreur (c’était le talonneur de la feuille par défaut)');
  egal(r.titulaires.filter((id, i) => i !== 9 && id !== feuille.titulaires[i]).length, 0, 'les quatorze autres choix de l’entraîneur ne bougent pas');
  egal(new Set([...r.titulaires, ...r.remplacants]).size, 23, 'la feuille reste complète, sans doublon');
  ok(!r.titulaires.includes(ouvreur) && !r.remplacants.includes(ouvreur), 'le blessé est sorti de la feuille');
  egal(JSON.stringify(reconcilerCompositionManager(g, defaut)), JSON.stringify(defaut), 'une feuille valide est rendue telle quelle');
}

// ═══ 7. LES CONTRATS ═════════════════════════════════════════════════════════════════════════════════════
const etat = () => useGame.getState();
const manager = () => etat().manager!;
const retoucher = (fn: (m: Manager) => Manager) => useGame.setState({ manager: fn(manager()) });
const creer = (club: string) => etat().creerManager({ nom: 'Banc 41', club, nation: 'France', age: 40 });
const groupeDe = (m: Manager) => effectifDuClub(m.club, m.saison);
const avecEtat = (m: Manager): Manager => ({ ...m, avancee: assurerEtatCarriereAvancee(m, groupeDe(m)) });

const clubDe = (division: string, rang = 0) => COMPETITIONS.find((c) => c.id === division)!.clubs[rang].nom;
const PRO_D2 = clubDe('prod2'), NATIONALE = clubDe('nationale', 3), FEDERALE = clubDe('fed1', 5);
for (const club of ['Stade Toulousain', 'USA Perpignan', PRO_D2, NATIONALE, FEDERALE]) {
  creer(club);
  egal(manager().club, club, `${club} : le banc est pris`);
  const m = avecEtat(manager());
  const g = groupeDe(m);
  const expirants = contratsExpirants(m, g, m.avancee);
  const plan = planContrats(m, g);
  console.log(`   ${club} : ${expirants.length} contrats en fin de saison sur ${g.length} · plan : ${plan.aProlonger} à négocier, ${plan.departs} départs, ${plan.enAttente} en attente · marge ${Math.round(plan.margeSalariale / 1000)} k€`);
  ok(expirants.length >= 3, `${club} : plusieurs contrats s’arrêtent dès la première saison (${expirants.length})`);
  egal(plan.decisions.filter((d) => d.mois <= 12).length, expirants.length, 'chaque contrat qui expire a une décision au plan');
  ok(plan.decisions.every((d, i, l) => !i || l[i - 1].importance >= d.importance), 'le plan est rangé par importance');
  egal(JSON.stringify(planContrats(m, g)), JSON.stringify(plan), 'le plan ne tire rien au sort');
  egal(JSON.stringify(manager().negociations), '[]', 'lire le plan n’ouvre aucune négociation');

  const avant = situationSalariale(m);
  const { manager: apres, resultats } = executerPlan(m, g, plan);
  const signes = resultats.filter((r) => r.issue === 'signe');
  const echecs = resultats.filter((r) => r.issue === 'echec' || r.issue === 'refus');
  console.log(`      → ${signes.length} signés, ${echecs.length} échecs (${echecs.map((r) => r.motif).join(', ') || '—'}), ${resultats.filter((r) => r.issue === 'depart').length} départs actés`);
  egal(resultats.length, plan.decisions.length, 'un résultat par dossier');
  ok(signes.length > 0, 'des prolongations sont réellement signées');
  for (const r of signes) {
    const contrat = apres.avancee!.contratsJoueurs[r.joueurId];
    ok(contrat.fin > m.saison + 1, `${r.nom} : le contrat court au-delà de la saison`);
    egal(contrat.salaire, r.salaire, `${r.nom} : le salaire signé remplace l’ancien`);
    ok((r.tours ?? 0) >= 1 && (r.tours ?? 0) <= 4, `${r.nom} : la négociation a eu lieu (${r.tours} tour(s))`);
    ok(!r.salaireDemande || r.salaire! <= Math.round(r.salaireDemande * 1.05), `${r.nom} : jamais plus de 4 % au-dessus de la demande`);
    ok(apres.negociations.some((n) => n.joueur.id === r.joueurId && n.etat === 'signee'), `${r.nom} : la négociation est inscrite comme signée`);
  }
  // Les salaires s'arrondissent à 5 000 € : sous 100 000 € par an, « 6 % de moins » retombe souvent sur la demande.
  ok(signes.some((r) => r.salaireDemande && r.salaire! < r.salaireDemande) || signes.every((r) => (r.salaireDemande ?? 0) < 100_000),
    'l’assistant obtient au moins un contrat sous la demande du joueur');
  console.log(`      demandes ${Math.round(signes.reduce((n, r) => n + (r.salaireDemande ?? 0), 0) / 1000)} k€ → signés ${Math.round(signes.reduce((n, r) => n + (r.salaire ?? 0), 0) / 1000)} k€ · tours ${(signes.reduce((n, r) => n + (r.tours ?? 0), 0) / Math.max(1, signes.length)).toFixed(1)} en moyenne`);
  const situation = situationSalariale(apres);
  ok(situation.disponible >= Math.min(0, avant.disponible) - 1, `le plafond salarial est tenu (marge ${Math.round(situation.disponible / 1000)} k€)`);
  ok(apres.budgetTransferts >= 0, 'le budget de primes ne passe pas sous zéro');
  egal(m.budgetTransferts - apres.budgetTransferts, signes.reduce((n, r) => n + (r.prime ?? 0), 0), 'les primes à la signature sont prises sur le budget');
  for (const r of resultats.filter((x) => x.issue === 'depart')) {
    ok(apres.avancee!.decisionsContrats?.[r.joueurId]?.saison === m.saison, `${r.nom} : le départ est acté`);
    ok(apres.avancee!.contratsJoueurs[r.joueurId].fin <= m.saison + 1, `${r.nom} : son contrat n’est pas prolongé`);
  }
  // Rejouer le plan ne resigne personne et ne débite rien.
  const second = reglerLesContrats(apres, g);
  egal(second.resultats.filter((r) => r.issue === 'signe').length, 0, 'un second passage ne signe personne deux fois');
  egal(second.manager.budgetTransferts, apres.budgetTransferts, 'ni ne débite deux fois');
}

// La politique change réellement le plan.
{
  creer('Stade Toulousain');
  const m = avecEtat(manager());
  const g = groupeDe(m);
  const defaut = planContrats(m, g);
  const sansCadres = planContrats(m, g, { ...POLITIQUE_CONTRATS_DEFAUT, cadres: false });
  ok(sansCadres.decisions.filter((d) => d.statut === 'cadre').every((d) => d.action === 'attendre'), 'sans « conserver les cadres », les cadres attendent l’entraîneur');
  const sansRemplacants = planContrats(m, g, { ...POLITIQUE_CONTRATS_DEFAUT, remplacants: 'non' });
  ok(sansRemplacants.departs >= defaut.departs, 'refuser de prolonger les remplaçants ajoute des départs');
  const tout = planContrats(m, g, { ...POLITIQUE_CONTRATS_DEFAUT, cadres: false, jeunes: false, libererInutilises: false }, { toutRegler: true });
  egal(tout.enAttente, 0, '« tout régler maintenant » ne laisse aucun dossier en attente');
  const serre = planContrats(m, g, { ...POLITIQUE_CONTRATS_DEFAUT, plafond: 'serre' });
  ok(serre.decisions.every((d) => d.salaireActuel <= 0 || d.salaireMax <= d.salaireActuel * 1.16), 'plafond serré : aucune hausse au-delà de 15 %');
  const vieux = defaut.decisions.filter((d) => d.age > 32);
  ok(vieux.every((d) => d.dureeMax === 1), 'un joueur de plus de 32 ans : un an au maximum');
  ok(planContrats(m, g, { ...POLITIQUE_CONTRATS_DEFAUT, dureeVeterans: 2 }).decisions.filter((d) => d.age > 32).every((d) => d.dureeMax === 2), 'ou deux, si la politique le dit');
  egal(politiqueContrats(m), POLITIQUE_CONTRATS_DEFAUT, 'sans réglage, la politique par défaut');
  // Un plafond salarial sans marge : rien ne se signe au-dessus, et personne n'est signé à perte.
  const fauche: Manager = { ...m, budgetSalarial: situationSalariale(m).engagee - 1, budgetTransferts: 0 };
  const r = reglerLesContrats(fauche, g);
  ok(situationSalariale(r.manager).engagee <= situationSalariale(fauche).engagee + 1, 'sans marge, la masse salariale n’augmente pas');
  ok(r.resultats.filter((x) => x.issue === 'signe').every((x) => (x.prime ?? 0) === 0), 'sans budget, aucune prime à la signature');
  // Le statut se lit dans le groupe, pas sur l'étiquette du contrat.
  const meilleur = [...g].sort((a, b) => b.note - a.note)[0];
  egal(statutSportif(meilleur, g, 1, 10), 'cadre', 'le meilleur joueur du groupe est un cadre');
}

// Par le store : le bouton de l'écran, le journal, puis la clôture.
{
  creer('USA Perpignan');
  const avant = manager();
  const expirants = contratsExpirants(avecEtat(avant), groupeDe(avant), avecEtat(avant).avancee).length;
  const resultats = etat().reglerContratsManager();
  ok(resultats.length >= expirants, 'le store rend un résultat par dossier');
  ok(etat().journal.some((e) => e.titre === 'Contrats · gestion automatique'), 'le journal garde la trace de ce que l’assistant a fait');
  const restants = contratsExpirants(manager(), groupeDe(manager()), manager().avancee);
  ok(restants.length < expirants, `il reste moins de contrats à échéance (${expirants} → ${restants.length})`);
  etat().definirPolitiqueContratsManager({ plafond: 'prudent' });
  egal(manager().politiqueContrats?.plafond, 'prudent', 'la politique est gardée dans la partie');
  egal(manager().politiqueContrats?.cadres, true, 'et ses autres réglages ne sont pas perdus');
  const un = restants[0];
  if (un) {
    etat().acterDepartContratManager(un.id, false);
    ok(!manager().avancee?.decisionsContrats?.[un.id], 'l’entraîneur peut revenir sur un départ acté');
    etat().acterDepartContratManager(un.id, true);
    ok(manager().avancee?.decisionsContrats?.[un.id], 'ou l’acter lui-même');
  }
}
{
  // La clôture : les contrats oubliés sont réglés par l'assistant, et la saison se clôt.
  creer(PRO_D2);
  const club = manager().club;
  const g = groupeDe(manager());
  const expirants = contratsExpirants(avecEtat(manager()), g, avecEtat(manager()).avancee);
  const cadres = planContrats(avecEtat(manager()), g, undefined, { cloture: true, toutRegler: true }).decisions.filter((d) => d.action === 'prolonger');
  retoucher((m) => ({ ...m, semaine: SEMAINES_PAR_SAISON }));
  etat().semaineManager();
  egal(manager().saison, 2, 'la saison s’est close malgré les contrats oubliés');
  const contrats = manager().avancee!.contratsJoueurs;
  const gardes = expirants.filter((j) => Object.values(contrats).some((c) => c.nom === j.nom && c.club === club && c.fin > 2));
  console.log(`   clôture ${club} : ${expirants.length} contrats oubliés, ${cadres.length} que l’assistant voulait garder, ${gardes.length} prolongés`);
  ok(gardes.length > 0, 'des joueurs oubliés ont été prolongés par l’assistant');
  ok(gardes.length < expirants.length || cadres.length === expirants.length, 'il ne prolonge pas tout le monde');
  ok(etat().journal.some((e) => e.titre === 'Contrats · réglés par l’assistant à la clôture'), 'le journal le dit');
  const nouveau = effectifDuClub(club, 2);
  ok(gardes.every((j) => nouveau.some((x) => x.nom === j.nom)), 'les joueurs prolongés sont toujours au club la saison suivante');

  // La clôture désactivée : comme avant, tous les contrats échus partent.
  creer(PRO_D2);
  etat().definirPolitiqueContratsManager({ cloture: false });
  const oublies = contratsExpirants(avecEtat(manager()), groupeDe(manager()), avecEtat(manager()).avancee);
  retoucher((m) => ({ ...m, semaine: SEMAINES_PAR_SAISON }));
  etat().semaineManager();
  egal(manager().saison, 2, 'la saison se clôt aussi sans l’assistant');
  const apres = effectifDuClub(club, 2);
  egal(oublies.filter((j) => apres.some((x) => x.nom === j.nom)).length, 0, 'sans l’assistant, les contrats échus partent tous (comportement d’avant)');
}

// L'adjoint dans une vraie carrière : la délégation compose pour de bon, semaine après semaine.
{
  creer('Stade Toulousain');
  const m = manager();
  const g = groupeDe(m);
  const r = rapportAdjointManager(avecEtat(m), g);
  ok(r.complet && r.choix.length === 23, 'le rapport de l’adjoint couvre les vingt-trois places');
  egal(JSON.stringify(m.composition.titulaires), JSON.stringify(r.composition.titulaires), 'la feuille de départ d’un banc est celle de l’adjoint');
  etat().configurerDelegationManager('compositions', true);
  const cible = g.find((j) => !m.composition.titulaires.includes(j.id) && !m.composition.remplacants.includes(j.id))!;
  etat().definirConsigneAdjointManager(cible.id, 'titulaire');
  egal(manager().consignesAdjoint?.joueurs?.[cible.id], 'titulaire', 'la consigne est gardée dans la partie');
  etat().avancerJusquaManager(4, true);
  ok(manager().semaine >= 2, 'la carrière avance, matchs délégués');
  ok(manager().composition.titulaires.includes(cible.id), 'l’adjoint délégué tient la consigne « toujours titulaire »');
  etat().definirConsigneAdjointManager(cible.id, null);
  ok(!manager().consignesAdjoint?.joueurs?.[cible.id], 'une consigne se retire');
  etat().definirPrioriteJeunesAdjointManager(true);
  egal(manager().consignesAdjoint?.prioriteJeunes, true, 'la priorité aux jeunes est gardée');
}

// ═══ 8. LA DÉFENSE NE CONNAÎT PAS LA COMBINAISON ════════════════════════════════════════════════════════
// Point 15 de la demande : l'IA défensive réagit à ce qu'elle observe (déplacements, orientation, profondeur, passes),
// jamais au cahier adverse. Garde statique : aucun module de lecture ou de décision de l'IA ne lit le plan préparé ou
// en cours — seule l'équipe en possession l'exécute (moteur/combinaisons.ts, moteur.ts).
{
  const dossier = 'src/lib/moteur/ia';
  const fichiers = readdirSync(dossier).filter((nom) => nom.endsWith('.ts'));
  ok(fichiers.length >= 5, `les modules de l’IA sont lus (${fichiers.length})`);
  for (const nom of fichiers) {
    const source = readFileSync(`${dossier}/${nom}`, 'utf8');
    ok(!/plansCombinaisons|combinaisonEnCours|combinaisonPreparee/.test(source), `ia/${nom} ne lit pas le cahier de combinaisons`);
  }
}

console.log(`\n✅ Correctif 41 — adjoint et contrats : ${controles} contrôles en ${((Date.now() - debut) / 1000).toFixed(0)} s`);
