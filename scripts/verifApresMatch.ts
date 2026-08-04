// Vérifie la boucle « je joue mon match → mes stats bougent → la semaine passe ».
//   1. la note de match récompense la performance, poste par poste ;
//   2. un gros match rapporte un point d'attribut, borné par le budget ;
//   3. aucun double comptage quand `semaineSuivante` suit un match regardé.

import { useGame } from '../src/store/useGame';
import { noterMatch, retourDeMatch, BUDGET_MATCHS_PAR_SAISON } from '../src/lib/moteur/apresMatch';
import type { Joueur } from '../src/types';

console.log('=== 1. LA NOTE DE MATCH ===');
{
  const cas: [string, Parameters<typeof noterMatch>[0], Parameters<typeof noterMatch>[1]][] = [
    ['ailier, 2 essais, 120 m', 'ailier_droit', { essais: 2, plaquages: 4, plaquagesManques: 0, passes: 3, metres: 120, grattages: 0, butsTentes: 0, butsReussis: 0, cartons: 0, minutes: 80 }],
    ['ailier, rien du tout', 'ailier_droit', { essais: 0, plaquages: 1, plaquagesManques: 3, passes: 1, metres: 12, grattages: 0, butsTentes: 0, butsReussis: 0, cartons: 0, minutes: 80 }],
    ['3e ligne, 18 plaquages, 3 grattages', 'troisieme_aile_d', { essais: 0, plaquages: 18, plaquagesManques: 1, passes: 2, metres: 35, grattages: 3, butsTentes: 0, butsReussis: 0, cartons: 0, minutes: 80 }],
    ['ouvreur, 5/5 au pied', 'demi_ouverture', { essais: 0, plaquages: 6, plaquagesManques: 1, passes: 45, metres: 30, grattages: 0, butsTentes: 5, butsReussis: 5, cartons: 0, minutes: 80 }],
    ['pilier, carton jaune', 'pilier_gauche', { essais: 0, plaquages: 6, plaquagesManques: 2, passes: 0, metres: 8, grattages: 0, butsTentes: 0, butsReussis: 0, cartons: 1, minutes: 60 }],
    ['entré 12 minutes', 'premier_centre', { essais: 0, plaquages: 2, plaquagesManques: 0, passes: 3, metres: 10, grattages: 0, butsTentes: 0, butsReussis: 0, cartons: 0, minutes: 12 }],
  ];
  for (const [nom, poste, s] of cas) {
    console.log(`  ${nom.padEnd(36)} → ${noterMatch(poste, s).toFixed(1)}/10`);
  }
}

console.log('\n=== 2. LE POINT D’ATTRIBUT, ET SON BUDGET ===');
{
  const base = {
    nom: 'Léo Fabre', poste: 'ailier_droit', age: 21, saison: 1, semaine: 3,
    potentiel: 85, attributs: { vitesse: 60, force: 55, endurance: 60, plaquage: 50, passe: 55, jeuAuPied: 40, vision: 55, mental: 58 },
  } as unknown as Joueur;
  const gros = { essais: 2, plaquages: 5, plaquagesManques: 0, passes: 4, metres: 130, grattages: 0, butsTentes: 0, butsReussis: 0, cartons: 0, minutes: 80 };
  const nul = { essais: 0, plaquages: 0, plaquagesManques: 4, passes: 1, metres: 5, grattages: 0, butsTentes: 0, butsReussis: 0, cartons: 1, minutes: 80 };

  let gains = 0;
  for (let i = 0; i < 200; i++) if (retourDeMatch(base, gros, 5, Math.random).attribut) gains++;
  console.log(`  gros match à 21 ans : ${gains}/200 rapportent un point (attribut visé : ${retourDeMatch(base, gros, 5, () => 0).attribut})`);

  let gainsNuls = 0;
  for (let i = 0; i < 200; i++) if (retourDeMatch(base, nul, 5, Math.random).attribut) gainsNuls++;
  console.log(`  match raté : ${gainsNuls}/200 (doit être 0)`);

  const vieux = { ...base, age: 34 };
  let gainsVieux = 0;
  for (let i = 0; i < 200; i++) if (retourDeMatch(vieux, gros, 5, Math.random).attribut) gainsVieux++;
  console.log(`  à 34 ans : ${gainsVieux}/200 (doit être 0)`);

  const sansBudget = retourDeMatch(base, gros, 0, () => 0).attribut;
  console.log(`  budget épuisé : ${sansBudget ?? 'aucun gain'} (budget saison = ${BUDGET_MATCHS_PAR_SAISON})`);

  const auPlafond = { ...base, potentiel: 60 };
  let gainsPlafond = 0;
  for (let i = 0; i < 200; i++) if (retourDeMatch(auPlafond, gros, 5, Math.random).attribut) gainsPlafond++;
  console.log(`  attribut déjà au potentiel : ${gainsPlafond}/200 (doit être 0)`);

  const r = retourDeMatch(base, gros, 5, () => 0.99);
  console.log(`  deltas d’un gros match : ${JSON.stringify(r.deltas)}`);
  const rn = retourDeMatch(base, nul, 5, () => 0.99);
  console.log(`  deltas d’un match raté : ${JSON.stringify(rn.deltas)}`);
}

console.log('\n=== 3. PAS DE DOUBLE COMPTAGE ===');
{
  const st = useGame.getState();
  st.creerJoueur({
    nom: 'Léo Fabre', poste: 'ailier_droit', nation: 'France', age: 21,
    club: 'Stade Toulousain', division: 'top14', traits: ['professionnel', 'leader'],
  } as never);
  useGame.setState({ rythme: 'semaine' });
  const avant = useGame.getState().joueur!;
  console.log(`  départ : ${avant.saisonEnCours?.matchs ?? 0} match, générale ${Math.round(Object.values(avant.attributs).reduce((a, b) => a + b, 0) / 8)}`);

  useGame.getState().enregistrerMatchVecu({
    essais: 2, plaquages: 5, plaquagesManques: 0, passes: 4, metres: 130,
    grattages: 0, butsTentes: 0, butsReussis: 0, cartons: 0, minutes: 80,
  });
  const apresMatch = useGame.getState().joueur!;
  console.log(`  après le match vécu : ${apresMatch.saisonEnCours?.matchs} match · ${apresMatch.saisonEnCours?.essais} essais · note ${apresMatch.saisonEnCours?.notes.join(', ')}`);

  useGame.getState().semaineSuivante();
  const apresSemaine = useGame.getState().joueur!;
  console.log(`  après « semaine suivante » : ${apresSemaine.saisonEnCours?.matchs} match · ${apresSemaine.saisonEnCours?.essais} essais · ${apresSemaine.saisonEnCours?.notes.length} note(s)`);
  const ok = apresSemaine.saisonEnCours?.matchs === 1 && apresSemaine.saisonEnCours?.notes.length === 1;
  console.log(`  pas de doublon : ${ok ? '✅' : '❌'}`);
  console.log(`  semaine : ${avant.semaine} → ${apresSemaine.semaine}`);
  const feuille = useGame.getState().journal.filter((x) => x.titre?.includes('Feuille de match'));
  console.log(`  entrée de journal : ${feuille.length ? '« ' + feuille[0].titre + ' » ✅' : '❌ absente'}`);
  if (feuille.length) console.log(`    ${feuille[0].texte}`);
}
