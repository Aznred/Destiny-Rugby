// VÉRIFICATION — LE MARCHÉ DES TRANSFERTS
//
// Deux retours de jeu :
//   1. « si trop de générale, plus aucun club ne veut le joueur » — le plancher
//      de recrutement était ABSOLU (16 points sous la cote). Au-delà de 98 de
//      cote, le meilleur étage du jeu (note 82 dans `NOTE_PAR_NIVEAU`) passait
//      sous ce plancher et TOUTES les compétitions étaient écartées : zéro offre.
//   2. « si on est sans contrat on reste dans le club » — la saison suivante se
//      jouait quand même, salaire compris.
//
// Lancer : npx vite-node scripts/verifMarche.ts

import type { Joueur } from '../src/types';
import { genererOffres, cote } from '../src/lib/offres';

function joueurDe(niveau: number, reputation: number, club = 'Stade Toulousain', division = 'top14'): Joueur {
  return {
    nom: 'Test Joueur', poste: 'demi_ouverture', nation: 'France', club, division,
    age: 26,
    attributs: {
      vitesse: niveau, force: niveau, endurance: niveau, plaquage: niveau,
      passe: niveau, jeuAuPied: niveau, vision: niveau, mental: niveau,
    },
    forme: 80, moral: 80, reputation, argent: 0, saison: 6,
    matchsJoues: 120, essais: 30, titres: [], noteSaison: 8.5,
    contrat: { club, division, saisons: 0, salaire: 200000 },
  };
}

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(52)} ${valeur}`);
}

console.log('=== 1. LE MARCHÉ RESTE OUVERT À TOUS LES NIVEAUX ===');
for (const [niveau, rep] of [[35, 20], [55, 45], [70, 60], [85, 80], [95, 95], [99, 100]] as const) {
  const j = joueurDe(niveau, rep);
  // Cinq tirages : la génération est aléatoire, on veut savoir si le MARCHÉ
  // existe, pas si un tirage précis a mordu.
  let total = 0;
  let meilleur = 0;
  for (let i = 0; i < 5; i++) {
    const offres = genererOffres(j, { saison: 6, maximum: 4 });
    total += offres.length;
    for (const o of offres) meilleur = Math.max(meilleur, o.noteClub);
  }
  ligne(
    `générale ${niveau}, réputation ${rep} (cote ${cote(j).toFixed(0)})`,
    `${total} offres sur 5 tirages · meilleur club noté ${meilleur || '—'}`,
    total > 0,
  );
}

console.log('\n=== 2. UN JOUEUR DE FÉDÉRALE RESTE À SON ÉTAGE ===');
{
  const j = joueurDe(40, 25, 'US Tyrosse', 'nationale2');
  const offres = genererOffres(j, { saison: 4, maximum: 6 });
  const trop = offres.filter((o) => o.noteClub > cote(j) + 6);
  ligne('aucune offre très au-dessus de sa cote',
    `${offres.length} offres, ${trop.length} hors de portée`, trop.length === 0);
}

console.log('\n=== 3. UNE STAR NE SIGNE PAS EN RÉGIONALE ===');
{
  const j = joueurDe(95, 95);
  const offres = genererOffres(j, { saison: 8, maximum: 6 });
  const bas = offres.filter((o) => o.noteClub < 60);
  ligne('aucune offre d’un club noté sous 60',
    `${offres.length} offres, ${bas.length} sous 60`, bas.length === 0 && offres.length > 0);
}

console.log('\n=== 4. FIN DE CONTRAT : ON NE RESTE PAS AU CLUB ===');
{
  const { useGame } = await import('../src/store/useGame');
  useGame.getState().creerJoueur({
    nom: 'Léo Fabre', poste: 'ailier_gauche', nation: 'France',
    club: 'Stade Toulousain', division: 'top14', age: 24, traits: [],
  });
  // On force un contrat arrivé à son terme.
  const j0 = useGame.getState().joueur!;
  useGame.setState({
    joueur: { ...j0, contrat: { ...j0.contrat!, saisons: 0 } },
    offres: [],
    offresOuvertes: false,
  });
  const saisonAvant = useGame.getState().joueur!.saison;
  useGame.getState().saisonSuivante();
  const apres = useGame.getState();
  ligne('la saison ne démarre pas sans contrat',
    `saison ${saisonAvant} → ${apres.joueur?.saison ?? '—'}`,
    apres.joueur?.saison === saisonAvant);
  ligne('le panneau « Choix de carrière » s’ouvre',
    `${apres.offres.length} offre(s), ouvert : ${apres.offresOuvertes}`,
    apres.offresOuvertes && apres.offres.length > 0);

  // On signe, la saison doit repartir.
  useGame.getState().signerOffre(apres.offres[0].id);
  useGame.getState().saisonSuivante();
  const fin = useGame.getState();
  ligne('après signature, la saison repart',
    `saison ${fin.joueur?.saison}`, (fin.joueur?.saison ?? 0) > saisonAvant);
}

console.log(echecs === 0 ? '\n✅ Le marché fonctionne à tous les étages.' : `\n❌ ${echecs} contrôle(s) en échec.`);
