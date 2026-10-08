// UN JOUEUR INDISPONIBLE NE RÂLE PAS DE NE PAS AVOIR JOUÉ — Correctif 33.
//
// Trois saisons parallèles, mêmes résultats (des nuls : seul le temps de jeu fait bouger la satisfaction) :
//   blessé   — le joueur passe huit matchs à l'infirmerie ;
//   écarté   — il est apte, et l'entraîneur ne l'aligne jamais ;
//   aligné   — il joue tout.
// Le blessé ne doit rien reprocher à personne ; l'écarté, lui, garde tous ses griefs (la règle ne les efface pas).
//
// Lancer : npm run verify:blesses
import { useGame } from '../src/store/useGame';
import { effectifDuClub } from '../src/lib/effectif';
import type { Coequipier } from '../src/lib/effectif';
import {
  apresResultatCarriereAvancee, avancerSemaineCarriereAvancee, indisponiblesCarriereAvancee,
  type DossierMedical, type EtatCarriereAvancee, type PromesseJoueur,
} from '../src/lib/carriereAvancee';
import { demandeAGenerer } from '../src/lib/vestiaireManager';
import { horsDEtatDeJouer, matchsEmpeches, MATCHS_AVANT_DE_SE_PLAINDRE, tempsDeJeuReclamable } from '../src/lib/tempsDeJeuManager';
import { forceDuGroupe } from '../src/lib/recrutementManager';
import type { Manager, ResultatMatchManager } from '../src/types';

let controles = 0, echecs = 0;
function dire(ok: boolean, quoi: string, detail = '') {
  controles++;
  if (!ok) echecs++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${quoi}${detail ? ` — ${detail}` : ''}`);
}
const titre = (t: string) => console.log(`\n${t}`);

useGame.getState().reinitialiser();
useGame.getState().creerManager({ nom: 'Morgan Test', nation: 'France', club: 'Stade Toulousain' });
const depart = useGame.getState().manager!;
const effectif = effectifDuClub(depart.club, depart.saison);
const force = forceDuGroupe(depart.club, depart.saison);
// Le meilleur joueur du groupe en âge de réclamer sa place : s'il ne joue pas, c'est LUI qui vient se plaindre.
// Un titulaire ordinaire : assez bon pour avoir des arguments, pas assez pour être convoité par l'étage du dessus
// (une marque d'intérêt d'un autre club occuperait son unique message de la saison), et pas le capitaine.
const X = [...effectif].filter(j => j.age >= 25 && j.age <= 30 && j.id !== depart.composition.capitaineId
  && depart.composition.titulaires.includes(j.id) && j.note >= force - 2 && j.note <= force + 3 && j.potentiel - j.note < 8)
  .sort((a, b) => a.note - b.note)[0];
console.log(`Joueur suivi : ${X.nom} (${X.note}, ${X.age} ans) · force du groupe ${force}`);

const dossier = (semaines: number, plus: Partial<DossierMedical> = {}): DossierMedical => ({
  id: 'blessure-test', joueurId: X.id, nom: X.nom, type: 'Lésion ligamentaire du genou', gravite: 'grave', disponibilite: 0, douleur: 70,
  risqueAggravation: 30, semaines, decision: 'repos', penalitePerformance: 20, saison: depart.saison, semaine: 1, phase: 'guerison', zone: 'genou',
  origine: 'match', diagnosticDans: 0, guerison: 5, condition: 55, rythme: 40, risqueRechute: 20, joursRestants: semaines * 7, dureeInitiale: semaines * 7, ...plus,
});
const sansX = (m: Manager): Manager => ({ ...m, composition: { ...m.composition,
  titulaires: m.composition.titulaires.map(id => id === X.id ? remplacant(m) : id), remplacants: m.composition.remplacants.filter(id => id !== X.id && id !== remplacant(m)) } });
const remplacant = (m: Manager) => effectif.find(j => !m.composition.titulaires.includes(j.id) && !m.composition.remplacants.includes(j.id))!.id;
const avecX = (m: Manager): Manager => m.composition.titulaires.includes(X.id) ? m
  : { ...m, composition: { ...m.composition, titulaires: [X.id, ...m.composition.titulaires.slice(1)], remplacants: m.composition.remplacants.filter(id => id !== X.id) } };

/** Un match nul, joué comme le store le joue : feuilles de match, résultat, vestiaire, médical. Puis la semaine suivante. */
function jouer(depuis: Manager, groupe: Coequipier[]): Manager {
  // Le joueur suivi n'est jamais appelé en sélection ici : ses absences ne viennent que du scénario.
  const m: Manager = { ...depuis, avancee: { ...etat(depuis), convocations: etat(depuis).convocations.filter(c => c.joueurId !== X.id) } };
  const semaine = m.semaine;
  const absents = new Set(indisponiblesCarriereAvancee(m.avancee, semaine));
  const tempsDeJeu = { ...m.tempsDeJeu };
  const alignes = [...m.composition.titulaires, ...m.composition.remplacants].filter(id => id && !absents.has(id));
  for (const id of alignes) tempsDeJeu[id] = (tempsDeJeu[id] ?? 0) + 1;
  const resultat: ResultatMatchManager = { cle: `test#${m.saison}#${semaine}`, club: m.club, saison: m.saison, semaine, journee: semaine, domicile: true,
    adversaire: 'RC Toulon', scorePour: 20, scoreContre: 20, essaisPour: 2, essaisContre: 2, blessures: [],
    minutesJouees: Object.fromEntries(alignes.map(id => [id, m.composition.titulaires.includes(id) ? 80 : 20])) };
  const avec: Manager = { ...m, resultats: { ...m.resultats, [resultat.cle]: resultat }, tempsDeJeu };
  avec.avancee = apresResultatCarriereAvancee(avec, groupe, resultat).etat;
  const matchs = Object.values(avec.resultats).filter(r => r.saison === m.saison && r.club === m.club).length;
  const besoin = demandeAGenerer(avec, groupe, matchs);
  const suivant: Manager = besoin
    ? { ...avec, demandes: [...avec.demandes, { ...besoin, id: `demande-${besoin.joueurId}-${semaine}`, saison: m.saison, semaine, etat: 'ouverte' as const }] }
    : avec;
  suivant.avancee = avancerSemaineCarriereAvancee(suivant, groupe, semaine + 1);
  return { ...suivant, semaine: semaine + 1 };
}
const etat = (m: Manager) => m.avancee as EtatCarriereAvancee;
const satisfaction = (m: Manager) => etat(m).vestiaire[X.id]?.satisfaction ?? NaN;
const contrat = (m: Manager) => etat(m).contratsJoueurs[X.id]?.satisfaction ?? NaN;
// Un grief de temps de jeu, pas une marque d'intérêt d'un autre club (`ambition`, `offreRecue` : le marché, pas le banc).
const plaintes = (m: Manager) => ({
  demandes: m.demandes.filter(d => d.joueurId === X.id && d.raison !== 'ambition' && d.raison !== 'offreRecue').length,
  discussions: etat(m).discussions.filter(d => d.joueurId === X.id).length,
});
// Une blessure longue : il ne guérit pas pendant les huit matchs mesurés.
const blesser = (m: Manager): Manager => ({ ...m, avancee: { ...etat(m), medical: [...etat(m).medical.filter(d => d.joueurId !== X.id), dossier(30)] } });
const tenirBlesse = (m: Manager): Manager => ({ ...m, avancee: { ...etat(m), medical: etat(m).medical.map(d => d.joueurId === X.id ? { ...dossier(30), id: d.id } : d) } });

// Départ commun : cinq matchs où tout le monde joue normalement (personne n'a de grief avant le cinquième).
let commun = avecX({ ...depart, semaine: 2 });
for (let i = 0; i < 5; i++) commun = jouer(commun, effectif);
const base = { satisfaction: satisfaction(commun), contrat: contrat(commun) };

const MATCHS = 12;
titre(`1. ${MATCHS} matchs : blessé, écarté, aligné`);
let blesse = blesser(sansX(commun)), ecarte = sansX(commun), aligne = avecX(commun);
let plainteDuBlesse = false, horsDEtat = true;
for (let i = 0; i < MATCHS; i++) {
  blesse = tenirBlesse(blesse);
  horsDEtat &&= horsDEtatDeJouer(etat(blesse), X.id, blesse.semaine) && indisponiblesCarriereAvancee(etat(blesse), blesse.semaine).includes(X.id);
  blesse = jouer(blesse, effectif); ecarte = jouer(ecarte, effectif); aligne = jouer(aligne, effectif);
  const p = plaintes(blesse);
  if (p.demandes || p.discussions) plainteDuBlesse = true;
}
dire(horsDEtat, `le blessé est bien hors d'état de jouer pendant les ${MATCHS} matchs`);
dire(!plainteDuBlesse, 'AUCUNE plainte du blessé pendant sa blessure (ni message, ni discussion)', JSON.stringify(plaintes(blesse)));
dire(matchsEmpeches(etat(blesse), X.id, blesse.saison) === MATCHS, `ses ${MATCHS} matchs manqués sont comptés comme empêchés`, `${matchsEmpeches(etat(blesse), X.id, blesse.saison)}`);
{
  const r = tempsDeJeuReclamable(blesse, X.id, 5 + MATCHS);
  dire(r.ouverts === 5 && r.joues === 5 && r.part === 1, 'son temps de jeu réclamable : cinq matchs à sa portée, cinq joués', `${r.joues}/${r.ouverts}`);
  const e = tempsDeJeuReclamable(ecarte, X.id, 5 + MATCHS);
  dire(e.ouverts === 5 + MATCHS && e.joues === 5, `l'écarté, lui, avait ${5 + MATCHS} matchs à sa portée et n'en a joué que cinq`, `${e.joues}/${e.ouverts}`);
}
{
  const p = plaintes(ecarte);
  dire(p.demandes + p.discussions > 0, 'l\'écarté vient se plaindre : la règle n\'efface pas un vrai grief', JSON.stringify(p));
}
dire(plaintes(aligne).demandes === 0 && plaintes(aligne).discussions === 0, 'l\'aligné ne réclame rien');

// Ce que UN match de plus fait à la satisfaction, les trois partant du même point (60) : le vestiaire puis le contrat.
// ⚠️ Mesuré sur un seul match, parce qu'à Toulouse la vague des leaders satisfaits ramène tout le monde à 100 en quelques
// journées de nuls : c'est l'écart ENTRE les trois qui dit ce que vaut le temps de jeu.
{
  const a60 = (m: Manager): Manager => ({ ...m, avancee: { ...etat(m),
    vestiaire: { ...etat(m).vestiaire, [X.id]: { ...etat(m).vestiaire[X.id], satisfaction: 60 } },
    contratsJoueurs: { ...etat(m).contratsJoueurs, [X.id]: { ...etat(m).contratsJoueurs[X.id], satisfaction: 60 } } } });
  const b = jouer(tenirBlesse(a60(blesse)), effectif), e = jouer(a60(ecarte), effectif), al = jouer(a60(aligne), effectif);
  console.log(`  un match de plus, tous à 60 — vestiaire : blessé ${satisfaction(b).toFixed(1)} · écarté ${satisfaction(e).toFixed(1)} · aligné ${satisfaction(al).toFixed(1)}`);
  console.log(`                              contrat   : blessé ${contrat(b).toFixed(1)} · écarté ${contrat(e).toFixed(1)} · aligné ${contrat(al).toFixed(1)}`);
  dire(satisfaction(b) >= 60, 'le blessé ne perd pas de satisfaction pour un match qu\'il ne pouvait pas jouer', `60 → ${satisfaction(b).toFixed(1)}`);
  dire(satisfaction(e) <= satisfaction(b) - 2, 'l\'écarté en perd par rapport à lui : son grief est entier', `${satisfaction(e).toFixed(1)} contre ${satisfaction(b).toFixed(1)}`);
  dire(satisfaction(al) >= satisfaction(b), 'l\'aligné en gagne au moins autant que le blessé', `${satisfaction(al).toFixed(1)}`);
  dire(contrat(b) >= 60, 'le contrat du blessé ne se dégrade pas', `60 → ${contrat(b).toFixed(1)}`);
}
// Le contrat, depuis le début de saison : blessé dès la première journée contre jamais aligné (aucune feuille de match).
{
  let b = blesser(sansX({ ...depart, semaine: 2 })), e = sansX({ ...depart, semaine: 2 });
  const debut = contrat(b);
  for (let i = 0; i < 6; i++) { b = tenirBlesse(b); b = jouer(b, effectif); e = jouer(e, effectif); }
  console.log(`  contrat, six semaines sans une feuille de match : départ ${debut.toFixed(1)} · blessé ${contrat(b).toFixed(1)} · jamais aligné ${contrat(e).toFixed(1)}`);
  dire(contrat(b) >= debut - 1, 'blessé dès la première journée : son contrat ne se dégrade pas', `${debut.toFixed(1)} → ${contrat(b).toFixed(1)}`);
  dire(contrat(e) < contrat(b) - 3, 'jamais aligné alors qu\'il est apte : le sien se dégrade', `${contrat(e).toFixed(1)} contre ${contrat(b).toFixed(1)}`);
}

titre('2. Le retour de blessure');
{
  // Guéri, mais l'entraîneur le laisse au repos : pas de grief avant cinq matchs à sa portée.
  let retour: Manager = { ...blesse, avancee: { ...etat(blesse), medical: etat(blesse).medical.map(d => d.joueurId === X.id ? { ...d, phase: 'clos' as const, semaines: 0 } : d) } };
  const avantRetour = plaintes(retour);
  let tropTot = false;
  for (let i = 0; i < MATCHS_AVANT_DE_SE_PLAINDRE - 1; i++) {
    retour = jouer(retour, effectif);
    const p = plaintes(retour);
    if (p.demandes > avantRetour.demandes || p.discussions > avantRetour.discussions) tropTot = true;
  }
  const r = tempsDeJeuReclamable(retour, X.id, 5 + MATCHS + MATCHS_AVANT_DE_SE_PLAINDRE - 1);
  dire(!tropTot, `revenu depuis ${MATCHS_AVANT_DE_SE_PLAINDRE - 1} matchs sans jouer : il laisse encore sa chance à l'entraîneur`, `${r.joues}/${r.ouverts} matchs à sa portée`);
  // Un seul message par journée dans tout le vestiaire, et les remplaçants mieux notés passent avant lui : on attend son tour.
  let attente = 0;
  while (attente < 24 && plaintes(retour).demandes + plaintes(retour).discussions === 0) { retour = jouer(retour, effectif); attente++; }
  const p = plaintes(retour);
  dire(p.demandes + p.discussions > 0, 'apte et toujours écarté : cette fois il finit par réclamer', `après ${attente} matchs de plus — ${JSON.stringify(p)}`);
}

titre('3. La convalescence et la sélection');
{
  // En reprise (autorisé à vingt minutes) et laissé au repos : sélectionnable, mais empêché.
  let reprise: Manager = { ...sansX(commun), avancee: { ...etat(commun), medical: [dossier(2, { phase: 'reprise', decision: 'reprise20', guerison: 100 })] } };
  const selectionnable = !indisponiblesCarriereAvancee(etat(reprise), reprise.semaine).includes(X.id);
  const avant = matchsEmpeches(etat(reprise), X.id, reprise.saison);
  const hors = horsDEtatDeJouer(etat(reprise), X.id, reprise.semaine);
  const satAvant = satisfaction(reprise);
  reprise = { ...reprise, avancee: apresResultatCarriereAvancee({ ...reprise, resultats: { ...reprise.resultats, r: { cle: 'r', club: reprise.club, saison: reprise.saison, semaine: reprise.semaine, journee: 9, domicile: true, adversaire: 'RC Toulon', scorePour: 20, scoreContre: 20, essaisPour: 2, essaisContre: 2, blessures: [], minutesJouees: {} } } }, effectif,
    { cle: 'r', club: reprise.club, saison: reprise.saison, semaine: reprise.semaine, journee: 9, domicile: true, adversaire: 'RC Toulon', scorePour: 20, scoreContre: 20, essaisPour: 2, essaisContre: 2, blessures: [], minutesJouees: {} }).etat };
  dire(hors, 'en reprise : il ne réclame rien tant que son dossier est ouvert', selectionnable ? 'sélectionnable' : 'pas encore sélectionnable');
  dire(matchsEmpeches(etat(reprise), X.id, reprise.saison) === avant + 1, 'laissé au repos pendant sa reprise : le match est compté comme empêché');
  dire(satisfaction(reprise) >= satAvant - 1.5, 'et sa satisfaction ne bouge pas pour autant', `${satAvant.toFixed(1)} → ${satisfaction(reprise).toFixed(1)}`);
}
{
  const convoque: Manager = { ...commun, avancee: { ...etat(commun), convocations: [{ id: 'c', joueurId: X.id, nom: X.nom, nation: 'France', debut: commun.semaine, fin: commun.semaine + 3, competition: 'Tournée', titularisations: 0, essais: 0, points: 0 } as EtatCarriereAvancee['convocations'][number]] } };
  dire(horsDEtatDeJouer(etat(convoque), X.id, convoque.semaine) && !horsDEtatDeJouer(etat(convoque), X.id, convoque.semaine + 4), 'en sélection : hors d\'état de jouer pour son club, jusqu\'à son retour');
  dire(demandeAGenerer({ ...convoque, tempsDeJeu: { ...convoque.tempsDeJeu, [X.id]: 0 } }, effectif, 12)?.joueurId !== X.id, 'il ne se plaint pas de son temps de jeu pendant qu\'il est en sélection');
}

titre('4. La promesse de temps de jeu');
{
  const promesse: PromesseJoueur = { id: 'p', joueurId: X.id, nom: X.nom, type: 'PLAYTIME_PROMISE', date: commun.semaine, echeance: commun.semaine + 3, objectif: 3, depart: commun.tempsDeJeu[X.id] ?? 0, progression: 0, etat: 'active' };
  let m = blesser(sansX({ ...commun, avancee: { ...etat(commun), promesses: [promesse] } }));
  const satAvant = satisfaction(m);
  for (let i = 0; i < 6; i++) { m = tenirBlesse(m); m = jouer(m, effectif); }
  const p = etat(m).promesses.find(x => x.id === 'p')!;
  dire(p.etat === 'active' && p.echeance > promesse.echeance, 'blessé avant l\'échéance : la promesse n\'est pas rompue, son échéance recule', `échéance ${promesse.echeance} → ${p.echeance}`);
  dire(satisfaction(m) >= satAvant - 2, 'et il ne tient pas rigueur d\'une promesse qu\'il ne pouvait pas voir tenue', `${satAvant.toFixed(1)} → ${satisfaction(m).toFixed(1)}`);
  // Apte et toujours écarté : cette fois la promesse se rompt.
  let apte: Manager = { ...m, avancee: { ...etat(m), medical: etat(m).medical.map(d => d.joueurId === X.id ? { ...d, phase: 'clos' as const, semaines: 0 } : d) } };
  for (let i = 0; i < 4; i++) apte = jouer(apte, effectif);
  dire(etat(apte).promesses.find(x => x.id === 'p')!.etat === 'rompue', 'guéri et toujours écarté : la promesse se rompt, comme avant');
}

titre('5. Les sauvegardes d\'avant');
{
  // Une ligne de disponibilité sans `empeches` : on relit les absences complètes déjà comptées.
  const ancien: Manager = { ...commun, tempsDeJeu: { ...commun.tempsDeJeu, [X.id]: 2 }, avancee: { ...etat(commun), profilsMedicaux: { ...etat(commun).profilsMedicaux,
    [X.id]: { ...etat(commun).profilsMedicaux[X.id], disponibilites: [{ saison: commun.saison, possibles: 12, disponibles: 4, titularisations: 2, semainesBlessees: 8, joursBlesse: 56 }] } } } };
  const r = tempsDeJeuReclamable(ancien, X.id, 12);
  dire(r.ouverts === 4 && r.joues === 2 && r.part === 0.5, 'huit absences d\'une ancienne sauvegarde : quatre matchs à sa portée, deux joués', `${r.joues}/${r.ouverts}`);
  dire(demandeAGenerer(ancien, effectif, 12)?.joueurId !== X.id, 'et il ne se plaint pas : moins de cinq matchs à sa portée');
  const sansProfil = tempsDeJeuReclamable({ tempsDeJeu: { a: 3 }, saison: 1, avancee: undefined }, 'a', 10);
  dire(sansProfil.ouverts === 10 && sansProfil.part === 0.3, 'sans dossier médical du tout : tous les matchs comptent, comme avant');
}

console.log(`\n${controles - echecs}/${controles} contrôles${echecs ? ` — ${echecs} ÉCHEC(S)` : ''}`);
if (echecs) process.exit(1);
