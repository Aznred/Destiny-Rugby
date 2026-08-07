// PASSER LA SAISON NE DOIT RIEN ESCAMOTER
//
// Trois choses restaient figées quand la saison n'était pas jouée semaine après
// semaine (mode « saison rapide », ou passage direct à la trêve) :
//   1. la blessure gardait son compte de semaines — on repartait blessé pour la
//      même durée, saison après saison ;
//   2. la forme ne remontait que de +10 ;
//   3. les séances d'entraînement hebdomadaires n'étaient jamais jouées.
//
// Et l'audience du joueur (`abonnes`) ne bougeait qu'en publiant : signer au
// Stade Toulousain ne changeait rien.

import { useGame, noteGlobale, AGE_RETRAITE_FORCEE } from '../src/store/useGame';
import { abonnesCible } from '../src/lib/comptes';
import type { Joueur } from '../src/types';

const creer = (extra: Partial<Joueur> = {}) => {
  useGame.getState().reinitialiser();
  useGame.getState().creerJoueur({
    nom: 'Hugo Philibert', poste: 'troisieme_aile_d', nation: 'France', age: 22,
    club: 'Stade Toulousain', division: 'top14', traits: ['professionnel', 'leader'],
  } as never);
  useGame.setState((s) => ({ joueur: { ...s.joueur!, ...extra } as Joueur }));
  return useGame.getState().joueur!;
};

console.log('=== 1. LA BLESSURE SE SOIGNE PENDANT LA SAISON PASSÉE ===');
{
  const avant = creer({
    blessure: { nom: 'Entorse du genou', gravite: 'moyenne', semaines: 6 } as never,
    forme: 38,
  });
  console.log(`  avant : ${avant.blessure?.nom} — ${avant.blessure?.semaines} semaines · forme ${avant.forme}`);
  useGame.getState().saisonSuivante();
  const apres = useGame.getState().joueur!;
  console.log(`  après : ${apres.blessure ? `${apres.blessure.nom} — ${apres.blessure.semaines} sem.` : 'apte ✅'} · forme ${apres.forme}`);
  console.log(`  ${!apres.blessure ? '✅' : '❌'} guérison · ${apres.forme >= 80 ? '✅' : '❌'} forme récupérée (≥ 80)`);
}

console.log('\n=== 2. UNE BLESSURE PLUS LONGUE QUE LA SAISON RESTE ===');
{
  creer({ blessure: { nom: 'Rupture des ligaments', gravite: 'grave', semaines: 60 } as never });
  useGame.getState().saisonSuivante();
  const apres = useGame.getState().joueur!;
  console.log(`  reste : ${apres.blessure?.semaines} semaines ${apres.blessure && apres.blessure.semaines > 0 ? '✅' : '❌'}`);
}

console.log('\n=== 3. LES SÉANCES DE LA SAISON SONT JOUÉES ===');
{
  const avant = creer({ entrainementFocus: 'plaquage', potentiel: 88 });
  const depart = avant.attributs.plaquage;
  useGame.getState().saisonSuivante();
  const apres = useGame.getState().joueur!;
  const entree = useGame.getState().journal.find((e) => e.titre?.includes('saison de travail'));
  console.log(`  plaquage : ${depart} → ${apres.attributs.plaquage}`);
  console.log(`  ${entree ? `✅ « ${entree.titre} »` : '❌ aucune séance simulée'}`);
}

console.log('\n=== 4. SANS SECTEUR CHOISI, RIEN NE TOMBE DU CIEL ===');
{
  const avant = creer({ entrainementFocus: undefined, potentiel: 88 });
  const depart = { ...avant.attributs };
  useGame.getState().saisonSuivante();
  const entree = useGame.getState().journal.find((e) => e.titre?.includes('saison de travail'));
  console.log(`  ${entree ? '❌ séance fantôme' : '✅ aucune séance'} (départ plaquage ${depart.plaquage})`);
}

console.log('\n=== 5. L’AUDIENCE SUIT LE NIVEAU ET LE CLUB ===');
{
  const j = creer({ reputation: 70, abonnes: 400, potentiel: 90 });
  const cibleToulouse = abonnesCible(j.nom, 'Stade Toulousain', noteGlobale(j), j.reputation);
  const cibleR3 = abonnesCible(j.nom, 'Stade Bagnérais', noteGlobale(j), j.reputation);
  console.log(`  cible au Stade Toulousain (Top 14) : ${cibleToulouse.toLocaleString('fr-FR')}`);
  console.log(`  cible en division amateur         : ${cibleR3.toLocaleString('fr-FR')}`);
  console.log(`  ${cibleToulouse > cibleR3 ? '✅' : '❌'} l'étage du club pèse sur l'audience`);

  let abonnes = j.abonnes ?? 0;
  const suite: number[] = [abonnes];
  for (let n = 0; n < 5; n++) {
    useGame.getState().saisonSuivante();
    abonnes = useGame.getState().joueur!.abonnes ?? 0;
    suite.push(abonnes);
  }
  console.log(`  abonnés saison par saison : ${suite.map((v) => v.toLocaleString('fr-FR')).join(' → ')}`);
  console.log(`  ${suite[suite.length - 1] > suite[0] ? '✅' : '❌'} l'audience grandit avec la carrière`);
}

console.log('\n=== 6. LA LIMITE D’ÂGE EST VRAIMENT APPLIQUÉE ===');
{
  creer({ age: AGE_RETRAITE_FORCEE - 1 });
  useGame.getState().saisonSuivante();
  const apres = useGame.getState().joueur;
  const pantheon = useGame.getState().pantheon;
  console.log(`  à ${AGE_RETRAITE_FORCEE} ans : ${apres ? '❌ toujours en activité' : '✅ carrière close'}`);
  console.log(`  entrée au Panthéon : ${pantheon.length ? '✅' : '❌'}`);
}
