// Régression : un tableau progressif sans finale bloquait silencieusement
// « Clore la saison », même avec un contrat et un pré-accord signés.
import assert from 'node:assert/strict';
import { useGame, STATS_VIDES, bonusClubDuJoueur } from '../src/store/useGame';
import { SEMAINES_PAR_SAISON } from '../src/data/calendrier';
import { divisionDuClub } from '../src/data/clubs';
import { resoudrePyramide } from '../src/lib/promotion';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { fenetresDeNation } from '../src/lib/rassemblements';
import { equipeU20 } from '../src/lib/international';

chargerTextes(TEXTES);
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const club = 'Union Athletique Gaillacoise Rugby';
const division = divisionDuClub(club)!.id;
const selection = fenetresDeNation(equipeU20('France'), 4, true)
  .find((c) => c.dates.some((n) => n >= 46 && n < SEMAINES_PAR_SAISON));
assert.ok(selection, 'La France U20 doit avoir une convocation pendant les playoffs.');
useGame.getState().creerJoueur({
  nom: 'Jules gounin', poste: 'deuxieme_centre', nation: 'France', club, division, age: 20,
});
useGame.setState((s) => ({
  publierAuClassement: () => {},
  joueur: {
    ...s.joueur!, saison: 4, semaine: SEMAINES_PAR_SAISON,
    attributs: { vitesse: 82, force: 82, endurance: 82, plaquage: 82, passe: 82, jeuAuPied: 82, vision: 82, mental: 82 },
    contrat: { club, division, saisons: 1, salaire: 10_000 },
    preAccord: {
      club: 'Valence Romans Drôme Rugby', division: 'prod2', divisionNom: 'Pro D2',
      saisons: 4, salaire: 133_300, prime: 32_938, saison: 4, prolongation: false, etranger: false,
    },
    saisonEnCours: { matchs: 27, titularisations: 27, essais: 28, notes: Array(27).fill(7.1), capes: 0, stats: { ...STATS_VIDES } },
    international: { rassemblements: [selection], matchs: {}, resultats: {} },
  },
  scenarioActif: null, evenementHebdo: null, attenteEvenement: false,
}));
const avant = useGame.getState().joueur!;
const phase = resoudrePyramide(division, avant.saison, club, bonusClubDuJoueur(avant)).phase;
assert.ok(phase.matchs.length > 0, 'Le cas doit avoir un tableau de playoffs.');
assert.ok(!phase.matchs.some((m) => m.tour === 'finale'), 'Le cas doit manquer de finale.');
assert.doesNotThrow(() => useGame.getState().saisonSuivante(), 'La finale absente doit permettre la clôture.');
const apres = useGame.getState().joueur!;
assert.equal(apres.saison, 5);
assert.equal(apres.semaine, 1);
assert.equal(apres.club, 'Valence Romans Drôme Rugby');
assert.equal(apres.contrat?.saisons, 4);
assert.equal(apres.contrat?.salaire, 133_300);
assert.equal(apres.preAccord, undefined, 'Le pré-accord devient un contrat effectif.');
assert.equal(apres.matchsJoues, avant.matchsJoues + 27);
assert.equal(apres.essais, avant.essais + 28);
assert.equal(apres.saisonEnCours, undefined, 'Le bilan de la nouvelle saison repart à zéro.');
const recits = useGame.getState().journal.filter((e) => e.titre?.includes('Phase finale'));
assert.ok(recits.length > 0);
assert.ok(recits.every((e) => !e.texte.includes('null-null') && !e.texte.includes('Le titre revient à')),
  'Une finale absente ne doit inventer ni score ni champion.');
console.log('Clôture joueur vérifiée : Gaillac S4 → Valence Romans S5, contrat et statistiques conservés.');
