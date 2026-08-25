import { LANGUES, definirLangue } from '../src/lib/i18n';
import { texteFinCarriere } from '../src/data/finCarriereLocalisee';
import type { FinCarriere, LegendeSauvegardee, MotifFinCarriere } from '../src/types';
import { useGame } from '../src/store/useGame';

function verifier(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const legende: LegendeSauvegardee = {
  id: 'test-fin', nom: 'Camille Test', poste: 'ailier_droit', nation: 'France',
  age: 35, saisons: 17, note: 82, reputation: 88, matchsJoues: 284,
  essais: 97, titres: ['Bouclier'], score: 12_345,
};
const motifs: MotifFinCarriere[] = [
  'retraiteChoisie', 'ageLimite', 'blessure', 'radiation', 'deces', 'sansClub', 'autre',
];

for (const { id: langue } of LANGUES) {
  definirLangue(langue);
  for (const motif of motifs) {
    const fin: FinCarriere = { legendeId: legende.id, motif, destination: 'pantheon' };
    const texte = texteFinCarriere(fin, legende);
    verifier(texte.titre.trim(), `${langue}/${motif} : titre absent.`);
    verifier(texte.raison.trim().length > 30, `${langue}/${motif} : explication trop courte.`);
    verifier(texte.bouton.trim(), `${langue}/${motif} : bouton absent.`);
    verifier(texte.stats.length === 6, `${langue}/${motif} : bilan incomplet.`);
  }
}
definirLangue('fr');

// Vérification du trajet réel : on fige la carrière, l'épilogue bloque le Hall,
// puis le bouton autorise seulement ensuite l'entrée au Panthéon.
useGame.getState().creerJoueur({
  nom: 'Camille Test', poste: 'ailier_droit', nation: 'France',
  club: 'Champagnole', division: 'reg1', age: 34,
});
useGame.setState({ publierAuClassement: () => {} });
useGame.getState().prendreRetraite(undefined, 'blessure', 'Rupture définitive du ligament croisé.');

let etat = useGame.getState();
verifier(etat.joueur === null, 'La carrière terminée est encore active.');
verifier(etat.ecran === 'finCarriere', 'Le Hall s’ouvre avant l’explication.');
verifier(etat.finCarriere?.motif === 'blessure', 'La cause exacte n’est pas conservée.');
verifier(etat.pantheon.some((l) => l.id === etat.finCarriere?.legendeId), 'La carrière n’est pas sauvegardée.');

etat.setEcran('pantheon');
verifier(useGame.getState().ecran === 'finCarriere', 'La navigation permet de contourner l’épilogue.');

useGame.getState().continuerFinCarriere();
etat = useGame.getState();
verifier(etat.ecran === 'pantheon', 'Le bouton ne mène pas au Hall.');
verifier(etat.finCarriere === null, 'L’épilogue reste bloqué après lecture.');

console.log('OK — 7 causes, 7 langues, bilan et passage obligatoire avant le Hall vérifiés.');
