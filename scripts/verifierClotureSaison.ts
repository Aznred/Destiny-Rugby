// BANC — LA CLÔTURE D'UNE SAISON D'ENTRAÎNEUR NE RESTE PLUS EN PLAN (Correctif 39)
//
// Signalé en jeu : « on arrive à la fin de saison mais le bouton permettant de conclure reste bloqué ».
//
// Ce banc rejoue les blocages un par un, par les SEULES actions que l'écran appelle (`semaineManager`,
// `negocierContratManager`, `enregistrerResultatManager`…), et vérifie que chacun se règle ou se dit :
//
//   1. une partie plus ancienne que le dernier import de clubs (monde incomplet) ;
//   2. un entraîneur en poste, contrat à zéro, sans offre du conseil ;
//   3. un match à jouer en semaine ordinaire : il retient la semaine, et le diagnostic le dit ;
//   4. des contrats de joueurs oubliés, une prolongation acceptée mais pas signée, une négociation ouverte ;
//   5. un match de phase finale d'une date passée, encore dû à la date de clôture ;
//   6. une étape annexe qui lève (l'académie) : la saison se clôt, l'incident est gardé ;
//   7. un tableau de phase finale incohérent : ni l'écran ni la clôture ne tombent ;
//   8. une erreur que rien ne rattrape : la fiche ne bouge pas, les registres non plus, et l'erreur est lisible.
//
//   npm run verify:cloture-saison        (~4 min : cinq clôtures complètes de la pyramide)

import { strict as assert } from 'node:assert';
import { COMPETITIONS } from '../src/data/clubs';
import { CALENDRIER, SEMAINES_PAR_SAISON } from '../src/data/calendrier';
import { useGame } from '../src/store/useGame';
import { afficheDuClub } from '../src/lib/matchLive';
import {
  afficheSure, contratsExpirants, diagnostiquerCloture, estSemaineDeCloture, texteDiagnostic, verrousBloquants,
} from '../src/lib/clotureSaison';
import { clubsAbsentsDuMonde } from '../src/lib/carriereAvancee';
import { effectifDuClub } from '../src/lib/effectif';
import { enregistrerResultatJoue } from '../src/lib/championnat';
import { phaseFinale } from '../src/lib/phaseFinale';
import { tournoiDeFinDAnnee } from '../src/lib/tournoi';
import { nomDivision, oublierResultats } from '../src/lib/promotion';
import { clubsDeDivision, divisionEffective } from '../src/lib/divisions';
import type { Manager } from '../src/types';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';

// Le dictionnaire n'est chargé que par `main.tsx` : on le pose ici pour lire le journal tel que le joueur le lit.
chargerTextes(TEXTES);

let controles = 0;
const ok = (condition: unknown, quoi: string) => { controles++; assert.ok(condition, quoi); };
const egal = <T,>(recu: T, attendu: T, quoi: string) => { controles++; assert.deepEqual(recu, attendu, quoi); };

const etat = () => useGame.getState();
const manager = () => etat().manager!;
const retoucher = (fn: (m: Manager) => Manager) => useGame.setState({ manager: fn(manager()) });
const creer = (club: string) => etat().creerManager({ nom: 'Banc clôture', club, nation: 'France', age: 40 });
const codes = (m = manager()) => diagnostiquerCloture(m).map((v) => `${v.code}:${v.gravite}`);
const debut = Date.now();
const chrono = () => `${((Date.now() - debut) / 1000).toFixed(0)} s`;

// ═══ 1 à 3 — TOP 14 : monde incomplet, contrat du coach, match en semaine ordinaire ═══════════════════════
creer('Stade Toulousain');
ok(!estSemaineDeCloture(1) && estSemaineDeCloture(SEMAINES_PAR_SAISON), 'la date de clôture est la dernière semaine du calendrier');
egal(diagnostiquerCloture(manager()).filter((v) => v.gravite === 'bloquant'), [], 'une partie neuve n’a aucun verrou bloquant');

// 3. Un match attend en semaine de championnat : la semaine ne passe pas, et le diagnostic dit pourquoi.
const premiereJournee = CALENDRIER.find((s) => s.type === 'championnat')!.numero;
retoucher((m) => ({ ...m, semaine: premiereJournee }));
ok(afficheDuClub(manager()) && !manager().resultats[afficheDuClub(manager())!.cle], 'une affiche attend la première journée');
etat().semaineManager();
egal(manager().semaine, premiereJournee, 'un match non joué retient toujours la semaine');
ok(codes().includes('matchEnAttente:bloquant'), 'le diagnostic annonce le match en attente comme bloquant');
ok(texteDiagnostic(diagnostiquerCloture(manager())).startsWith('Season close blockers:'), 'la sortie de diagnostic garde son en-tête');
ok(/1 match waiting to be played \[blocking\]/.test(texteDiagnostic(diagnostiquerCloture(manager()))), 'elle compte le match en attente');

// 2. Contrat du coach à zéro, AUCUNE offre : le clic pose l'offre de secours, l'accepter rend la main.
retoucher((m) => ({ ...m, semaine: 1, contrat: { saisons: 0, salaire: m.contrat!.salaire }, conseil: undefined }));
ok(codes().includes('contratEntraineur:bloquant'), 'un contrat à zéro est un verrou bloquant');
etat().semaineManager();
egal(manager().semaine, 1, 'sans contrat, la semaine ne passe pas');
ok(manager().conseil?.offre && manager().conseil!.offre!.saison === manager().saison && manager().conseil!.offre!.club === manager().club,
  'le conseil a posé une offre valable pour cette saison');
egal(etat().assurerOffreDuConseil(), false, 'l’offre n’est pas posée deux fois');
etat().negocierContratManager();
egal(manager().contrat?.saisons, 1, 'accepter l’offre de secours rend une saison de contrat');
etat().semaineManager();
egal(manager().semaine, 2, 'et le temps repart');
// Une offre datée d'une autre saison ne se signe pas : elle est remplacée.
retoucher((m) => ({ ...m, contrat: { saisons: 0, salaire: m.contrat!.salaire }, conseil: { ...m.conseil!, offre: { club: m.club, saison: m.saison + 3, duree: 2, salaire: 1, budgetBonus: 0 } } }));
egal(etat().assurerOffreDuConseil(), true, 'une offre d’une autre saison est remplacée par une offre signable');
etat().negocierContratManager();
ok((manager().contrat?.saisons ?? 0) > 0, 'l’offre remplacée se signe');
// L'avance rapide s'arrête sur le contrat et pose l'offre elle aussi.
retoucher((m) => ({ ...m, contrat: { saisons: 0, salaire: m.contrat!.salaire }, conseil: undefined }));
egal(etat().avancerJusquaManager(SEMAINES_PAR_SAISON).arret, 'contrat', 'l’avance rapide s’arrête sur le contrat');
ok(manager().conseil?.offre, 'et l’offre est sur la table');
etat().negocierContratManager();

// 1. Le monde incomplet : deux clubs sans fiche, un entraîneur disparu. L'ancienne clôture levait ici.
const connus = Object.keys(manager().avancee!.clubsMonde);
retoucher((m) => {
  const avancee = structuredClone(m.avancee!);
  delete avancee.clubsMonde[connus[40]];
  delete avancee.clubsMonde[connus[900]];
  delete avancee.entraineursIA[avancee.clubsMonde[connus[41]].entraineurId];
  return { ...m, semaine: SEMAINES_PAR_SAISON, avancee };
});
egal(clubsAbsentsDuMonde(manager().avancee).sort(), [connus[40], connus[41], connus[900]].sort(), 'les clubs sans fiche ou sans entraîneur sont repérés');
ok(codes().includes('mondeIncomplet:auto'), 'le diagnostic les annonce comme réglés d’office');
egal(verrousBloquants(diagnostiquerCloture(manager())), [], 'un monde incomplet ne bloque rien');
etat().semaineManager();
egal([manager().saison, manager().semaine], [2, 1], 'la saison se clôt avec un monde incomplet');
egal(clubsAbsentsDuMonde(manager().avancee), [], 'et le monde de la partie est complété');
egal(manager().derniereCloture?.incidents, [], 'sans aucune étape en repli');
ok(manager().derniereCloture?.resolutions.some((r) => r.code === 'mondeIncomplet' && r.nombre === 3), 'le bilan de clôture garde la trace de la réparation');
egal(etat().clotureRetenue, null, 'rien n’est retenu');
console.log(`✓ monde incomplet, contrat de l’entraîneur sans offre, match en semaine ordinaire (${controles} contrôles, ${chrono()})`);

// ═══ 4 à 6 — RÉGIONALE 3 : contrats oubliés, match de phase finale en retard, étape qui lève ══════════════
// Un club que la simulation qualifie pour le tournoi final : à la date de clôture, ses matchs du tableau n'ont
// jamais été joués (c'est exactement « un match de playoff resté scheduled »).
const qualifie = tournoiDeFinDAnnee('reg3', 1, nomDivision('reg3'))!.qualifies[0].club;
creer(qualifie);
oublierResultats();
const groupe = effectifDuClub(qualifie, 1);
const expirants = contratsExpirants(manager(), groupe);
ok(expirants.length >= 3, `des contrats s’arrêtent à la fin de la saison (${expirants.length})`);
const [garde, accepte, ouvert, ...partants] = expirants;

// Une prolongation SIGNÉE : le joueur reste.
etat().ouvrirRenegociationJoueurManager(garde.id);
const negoGarde = manager().negociations.findLast((n) => n.joueur.id === garde.id)!;
if (negoGarde.etat === 'ouverte') { etat().accepterDemandesJoueurManager(negoGarde.id); etat().signerJoueurManager(negoGarde.id); }
const gardeSigne = manager().negociations.find((n) => n.id === negoGarde.id)?.etat === 'signee';
// Une prolongation ACCEPTÉE par le joueur, jamais signée : la clôture l'applique.
etat().ouvrirRenegociationJoueurManager(accepte.id);
const negoAcceptee = manager().negociations.findLast((n) => n.joueur.id === accepte.id)!;
if (negoAcceptee.etat === 'ouverte') etat().accepterDemandesJoueurManager(negoAcceptee.id);
const accordPret = manager().negociations.find((n) => n.id === negoAcceptee.id)?.etat === 'accord';
// Une négociation restée OUVERTE : l'offre expire, le joueur part.
etat().ouvrirRenegociationJoueurManager(ouvert.id);
const negoOuverte = manager().negociations.findLast((n) => n.joueur.id === ouvert.id)!;
ok(gardeSigne || negoGarde.refusProlongation, 'une prolongation se signe (ou le joueur la refuse d’emblée)');
ok(accordPret || negoAcceptee.refusProlongation, 'une prolongation peut rester à l’état « accord »');

// ⚠️ SANS L'ASSISTANT (Correctif 41). Par défaut, l'assistant sportif règle désormais à la clôture les contrats restés
// sans décision (`politiqueContrats.cloture`) : il reprendrait la négociation ouverte et prolongerait une partie des
// contrats oubliés — c'est ce que mesure `verify:correctif41`. Ce banc garde le chemin d'origine : rien n'est négocié
// d'office, l'offre expire et les contrats échus partent. Dans les deux cas, la saison se clôt.
etat().definirPolitiqueContratsManager({ cloture: false });

// 6. Une étape annexe qui lève : l'académie n'est pas lisible.
retoucher((m) => ({ ...m, semaine: SEMAINES_PAR_SAISON, academie: 12 as unknown as Manager['academie'] }));
const avant = diagnostiquerCloture(manager());
const enRetard = afficheSure(manager()).affiche;
ok(enRetard && enRetard.nature === 'phaseFinale' && !manager().resultats[enRetard.cle], 'à la date de clôture, un match du tournoi final est encore dû');
ok(avant.some((v) => v.code === 'matchEnRetard' && v.gravite === 'auto'), 'le diagnostic le classe « en retard », réglé d’office');
ok(avant.some((v) => v.code === 'contratsJoueurs' && v.gravite === 'auto' && v.nombre >= partants.length + 1), 'les contrats oubliés sont annoncés, jamais bloquants');
if (accordPret) ok(avant.some((v) => v.code === 'prolongationsAcceptees' && v.details.includes(accepte.nom)), 'la prolongation acceptée est annoncée comme appliquée');
egal(verrousBloquants(avant), [], 'rien de tout cela ne bloque');
ok(/expired player contracts? \[auto-resolved\]/.test(texteDiagnostic(avant)), 'la sortie de diagnostic compte les contrats expirés');

const tailles = new Map(COMPETITIONS.map((c) => [c.id, clubsDeDivision(c.id).length]));
etat().semaineManager();
egal([manager().saison, manager().semaine], [2, 1], 'la saison se clôt malgré le match en retard, les contrats oubliés et l’étape qui lève');
const cloture = manager().derniereCloture!;
ok(Object.keys(manager().resultats).some((cle) => cle.startsWith('tournoi#reg3#1#')), 'le match en retard a été joué par l’adjoint');
ok(cloture.incidents.some((i) => i.etape === 'académie'), 'l’étape en échec est gardée dans le bilan');
ok(etat().journal.some((j) => /Clôture de la saison/.test(j.titre) && /Étapes ignorées/.test(j.texte)), 'et dite dans le journal');
const apres = effectifDuClub(qualifie, 2);
const present = (id: string) => apres.some((j) => j.id === id);
if (gardeSigne) ok(present(garde.id), 'le joueur prolongé est toujours au club');
if (accordPret) {
  egal(manager().negociations.find((n) => n.id === negoAcceptee.id)?.etat, 'signee', 'la prolongation acceptée a été appliquée à la clôture');
  ok(present(accepte.id), 'et son joueur est toujours au club');
  ok(cloture.resolutions.some((r) => r.code === 'prolongationsAcceptees' && r.details.includes(accepte.nom)), 'le bilan le dit');
}
egal(manager().negociations.find((n) => n.id === negoOuverte.id)?.etat, 'rompue', 'la négociation restée ouverte est close');
ok(!present(ouvert.id), 'son joueur a quitté le club, libre');
for (const j of partants) ok(!present(j.id), `${j.nom}, contrat oublié, a quitté le club`);
ok(etat().transfertsSociaux.filter((x) => x.de === qualifie && x.vers === 'Sans club').length >= partants.length + 1, 'les départs sont inscrits au marché des joueurs libres');
ok(cloture.resolutions.some((r) => r.code === 'contratsJoueurs' && r.nombre >= partants.length + 1), 'le bilan compte les contrats arrivés à terme');
ok(apres.length >= 26, `le groupe est recomplété (${apres.length} joueurs)`);
for (const c of COMPETITIONS) egal(clubsDeDivision(c.id).length, tailles.get(c.id), `la division ${c.id} garde sa taille`);
console.log(`✓ contrats oubliés, prolongation acceptée, match de phase finale en retard, étape qui lève (${controles} contrôles, ${chrono()})`);

// ═══ 7 — UN TABLEAU INCOHÉRENT ne fait tomber ni l'affiche ni la clôture ════════════════════════════════
creer('Stade Toulousain');
oublierResultats();
const barrage = phaseFinale('top14', 1, 'Stade Toulousain').matchs[0];
// Le résultat inscrit sous la clé du barrage ne correspond pas à ses deux clubs : le tableau lève exprès.
enregistrerResultatJoue(barrage.cle, { domicile: barrage.exterieur, exterieur: barrage.domicile, scoreD: 20, scoreE: 10, essaisD: 2, essaisE: 1 });
oublierResultats();
assert.throws(() => phaseFinale('top14', 1, 'Stade Toulousain'), /incohérent/);
controles++;
retoucher((m) => ({ ...m, semaine: CALENDRIER.find((s) => s.tourFinal === 'barrage')!.numero }));
const lecture = afficheSure(manager());
ok(lecture.affiche === null && /incohérent/.test(lecture.erreur ?? ''), 'l’affiche d’un tableau incohérent vaut « aucune », avec son erreur');
ok(diagnostiquerCloture(manager()).some((v) => v.code === 'erreur'), 'le diagnostic rend l’erreur de structure');
const semaineAvant = manager().semaine;
etat().semaineManager();
egal(manager().semaine, semaineAvant + 1, 'la semaine passe malgré le tableau incohérent');
retoucher((m) => ({ ...m, semaine: SEMAINES_PAR_SAISON }));
etat().semaineManager();
egal([manager().saison, manager().semaine], [2, 1], 'et la saison se clôt');
ok(manager().derniereCloture!.incidents.some((i) => /incohérent/.test(i.message)), 'l’incident porte le message du tableau');
egal(manager().division, 'top14', 'sans pyramide lisible, le club ne bouge pas de division');
egal(divisionEffective('Stade Toulousain', 'top14'), 'top14', 'ni dans le registre des divisions');
console.log(`✓ tableau de phase finale incohérent (${controles} contrôles, ${chrono()})`);

// ═══ 8 — UNE ERREUR QUE RIEN NE RATTRAPE : la fiche et les registres ne bougent pas ══════════════════════
creer('Stade Toulousain');
oublierResultats();
retoucher((m) => ({ ...m, semaine: SEMAINES_PAR_SAISON, installations: null as unknown as Manager['installations'] }));
const transfertsAvant = etat().transfertsSociaux.length;
const mouvementsAvant = JSON.stringify(etat().mouvementsClubs);
const silence = console.error;
console.error = () => { /* la clôture écrit son diagnostic dans la console : attendu ici */ };
etat().semaineManager();
console.error = silence;
egal([manager().saison, manager().semaine], [1, SEMAINES_PAR_SAISON], 'une erreur hors de tout repli laisse la saison où elle est');
ok(etat().clotureRetenue?.erreur, 'l’erreur est gardée pour l’écran');
ok(etat().clotureRetenue!.verrous.some((v) => v.code === 'erreur' && v.gravite === 'bloquant'), 'et rendue comme un verrou bloquant');
egal(etat().transfertsSociaux.length, transfertsAvant, 'aucun joueur n’est parti à moitié');
egal(JSON.stringify(etat().mouvementsClubs), mouvementsAvant, 'aucun club n’a changé de division à moitié');
egal(divisionEffective('Stade Toulousain', 'top14'), 'top14', 'le registre des divisions est rendu à la sauvegarde');
// La cause réparée, le même clic clôt la saison.
retoucher((m) => ({ ...m, installations: {} }));
etat().semaineManager();
egal([manager().saison, manager().semaine], [2, 1], 'la cause levée, la saison se clôt');
egal(etat().clotureRetenue, null, 'et plus rien n’est retenu');
console.log(`✓ erreur hors repli : rien n’est écrit à moitié (${controles} contrôles, ${chrono()})`);

console.log(`\n${controles} contrôles réussis.`);
