// VÉRIFICATION — LE MJ PILOTE LA CARRIÈRE
//
// Demande, mot pour mot : « je veux que Groq puisse gérer les actions de notre
// carrière en plus : virer du club, mort du joueur, blessure, suspension,
// prison, augmentation, prime de match, popularité donc nombre d'abonnés sur X
// etc. Et que sa personnalité soit clasheuse, un peu en mode si on est trop
// ambitieux avec notre niveau il nous remet en place. (Pour l'exclusion du
// club : toute action qui porte atteinte au club ou à son image, c'est
// l'exclusion — ou le bannissement du rugby.) »
//
// ⚠️ AUCUN APPEL RÉSEAU ICI. On teste ce qui protège le joueur, c'est-à-dire
// tout ce qui reste vrai quel que soit ce que répond le modèle : le verrou des
// conséquences (`consequenceAutorisee`), les plafonds d'argent et d'audience
// (`plafonnerDeltas`, `appliquerActionClub`) et les suites réelles dans le
// store (licenciement → marché ouvert → signature immédiate).
//
// Lancer : npx vite-node scripts/verifCarriereIA.ts

import { useGame, BUDGET_IA_PAR_SAISON, contratBloque } from '../src/store/useGame';
import { parserJugement, type ContexteJugement } from '../src/lib/ia';
import { plafonnerDeltas, niveauDuJoueur } from '../src/lib/mj';
import {
  appliquerActionClub, consequenceAutorisee, lireDerapage, niveauDeFaute,
} from '../src/lib/consequences';
import type { EvenementHebdo, Joueur } from '../src/types';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(54)} ${valeur}`);
}

const store = useGame.getState();

function nouveauJoueur(): Joueur {
  store.reinitialiser();
  store.creerJoueur({
    nom: 'Test Carrière', poste: 'demi_ouverture', nation: 'France',
    club: 'Provence Rugby', division: 'prod2', age: 25, traits: [],
  });
  return useGame.getState().joueur!;
}

function scene(risque: boolean): EvenementHebdo {
  return {
    id: 'test', emoji: '🎬', titre: 'Après la victoire',
    texte: 'Le président traverse le vestiaire pour te féliciter.', risque, semaine: 8,
  };
}

function contexte(
  j: Joueur, evenement: EvenementHebdo, reponse: string, budget = BUDGET_IA_PAR_SAISON,
): ContexteJugement {
  return { joueur: j, evenement, reponse, budgetAttributs: budget };
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('=== 1. LE NIVEAU EST DIT AU MJ (le carburant du clash) ===');
{
  const j = nouveauJoueur();
  const faible: Joueur = {
    ...j,
    attributs: {
      vitesse: 35, force: 35, endurance: 35, plaquage: 35,
      passe: 35, jeuAuPied: 35, vision: 35, mental: 35,
    },
  };
  const fort: Joueur = {
    ...j,
    attributs: {
      vitesse: 84, force: 84, endurance: 84, plaquage: 84,
      passe: 84, jeuAuPied: 84, vision: 84, mental: 84,
    },
  };
  ligne('un amateur est décrit comme tel', niveauDuJoueur(faible),
    /35\/100/.test(niveauDuJoueur(faible)) && /Fédérale|amateur/i.test(niveauDuJoueur(faible)));
  ligne('un international aussi', niveauDuJoueur(fort),
    /84\/100/.test(niveauDuJoueur(fort)) && /international/i.test(niveauDuJoueur(fort)));
}

console.log('\n=== 2. LE VERROU DES CONSÉQUENCES A DEUX CLÉS ===');
{
  // Clé n° 1, historique : la scène était dangereuse.
  ligne('scène dangereuse → tout est ouvert', 'deces',
    consequenceAutorisee('deces', true, null));
  // Clé n° 2, la demande : la réponse du joueur EST la faute.
  ligne('réponse anodine → rien ne passe', 'exclusionClub refusée',
    !consequenceAutorisee('exclusionClub', false, niveauDeFaute('je vais m’entraîner au plaquage')));

  const atteinte = niveauDeFaute('je traite le président de voleur devant les caméras');
  ligne('insulter le président = atteinte à l’image', String(atteinte), atteinte === 'image');
  ligne('… et ça autorise le licenciement', 'exclusionClub',
    consequenceAutorisee('exclusionClub', false, atteinte));
  ligne('… mais PAS la mort ni la prison', 'refusées',
    !consequenceAutorisee('deces', false, atteinte)
    && !consequenceAutorisee('prison', false, atteinte));

  const grave = niveauDeFaute('je vends le match contre 20 000 €');
  ligne('truquer un match = faute grave', String(grave), grave === 'grave');
  ligne('… et ça autorise la radiation à vie', 'banRugby',
    consequenceAutorisee('banRugby', false, grave));

  const criminel = niveauDeFaute('je prends le volant bourré pour rentrer');
  ligne('conduire ivre = faute pénale', String(criminel), criminel === 'criminel');
  ligne('… et ça autorise la prison', 'prison',
    consequenceAutorisee('prison', false, criminel));

  // Une blessure n'est pas une sanction : elle passe toujours, mais bornée.
  ligne('une blessure passe sans faute', 'blessure',
    consequenceAutorisee('blessure', false, null));
}

console.log('\n=== 3. UNE SEMAINE TRANQUILLE NE TUE PERSONNE ===');
{
  const j = nouveauJoueur();
  const mortel = JSON.stringify({
    recit: 'Tu ne te réveilles pas.', reussite: 'echec', deltas: {}, consequence: 'deces',
  });
  const refuse = parserJugement(mortel, contexte(j, scene(false), 'je remercie le président'));
  ligne('le MJ ne peut pas tuer sur une réponse polie',
    String(refuse.consequence), refuse.consequence === undefined);

  const longue = JSON.stringify({
    recit: 'Ton genou lâche.', reussite: 'echec', deltas: {},
    consequence: 'blessure', semaines: 38,
  });
  const bornee = parserJugement(longue, contexte(j, scene(false), 'je force sur la séance'));
  ligne('une blessure hors danger reste bornée à 10 semaines',
    `${bornee.semaines} semaine(s)`, (bornee.semaines ?? 99) <= 10);
  const libre = parserJugement(longue, contexte(j, scene(true), 'je force sur la séance'));
  ligne('… mais une scène dangereuse peut coûter la saison',
    `${libre.semaines} semaine(s)`, libre.semaines === 38);
}

console.log('\n=== 4. VIRÉ DU CLUB : ÇA ARRIVE VRAIMENT ===');
{
  const avant = nouveauJoueur();
  const clubDeDepart = avant.club;
  store.poserEvenementHebdo(scene(false));
  const reponse = 'je balance à la presse que le président vole le club et j’insulte le staff';
  const jug = parserJugement(
    JSON.stringify({
      recit: 'Le communiqué tombe à 18 h : le club te licencie.',
      titre: 'Le club rompt', reussite: 'echec', deltas: { moral: -15 },
      consequence: 'exclusionClub', motif: 'tes accusations publiques contre la direction',
    }),
    contexte(avant, scene(false), reponse),
  );
  ligne('le MJ obtient bien le licenciement',
    String(jug.consequence), jug.consequence === 'exclusionClub');

  store.appliquerJugement(jug, reponse);
  const apres = useGame.getState();
  const j = apres.joueur!;
  ligne('le contrat est à zéro',
    j.contrat ? `${j.contrat.saisons} saison(s), ${j.contrat.salaire} €` : 'aucun',
    (j.contrat?.saisons ?? 9) === 0 && (j.contrat?.salaire ?? 9) === 0);
  ligne('le jeu sait que le joueur est libre', String(contratBloque(j)), contratBloque(j));
  ligne('… donc le calendrier refuse d’avancer', `semaine ${j.semaine}`,
    (() => { const s = j.semaine; store.semaineSuivante(); return useGame.getState().joueur!.semaine === s; })());
  const ouvertes = apres.approches.filter((a) => a.etat === 'ouverte');
  ligne('le marché s’est ouvert dans la seconde', `${ouvertes.length} approche(s)`,
    ouvertes.length > 0);
  const dit = apres.journal.some((e) => /licenci|rompt|club/i.test(`${e.titre ?? ''} ${e.texte}`));
  ligne('le journal l’explique', dit ? 'oui' : 'non', dit);

  // ⚠️ LE POINT QUI FIGEAIT LA PARTIE. Un joueur sans club signe et joue tout
  // de suite : sans ça, le pré-accord attendait une intersaison qu'il ne
  // pouvait plus atteindre.
  if (ouvertes.length) {
    const app = ouvertes[0];
    store.accepterApproche(app.id);
    const fin = useGame.getState().joueur!;
    ligne('un joueur libre signe IMMÉDIATEMENT',
      `${clubDeDepart} → ${fin.club}`, fin.club === app.club && fin.club !== clubDeDepart);
    ligne('… et le calendrier repart', String(!contratBloque(fin)), !contratBloque(fin));
    const semaineAvant = fin.semaine;
    store.semaineSuivante();
    ligne('… concrètement, la semaine se joue',
      `${semaineAvant} → ${useGame.getState().joueur?.semaine}`,
      (useGame.getState().joueur?.semaine ?? 0) > (semaineAvant ?? 0));
  }
}

console.log('\n=== 5. BANNI DU RUGBY : LA CARRIÈRE S’ARRÊTE ===');
{
  const j = nouveauJoueur();
  store.poserEvenementHebdo(scene(true));
  const reponse = 'je parie sur mon match et je vends la rencontre';
  const jug = parserJugement(
    JSON.stringify({
      recit: 'La fédération publie ta radiation à vie.', titre: 'Radié',
      reussite: 'echec', deltas: {}, consequence: 'banRugby',
      motif: 'paris truqués sur tes propres matchs',
    }),
    contexte(j, scene(true), reponse),
  );
  ligne('la radiation est recevable', String(jug.consequence), jug.consequence === 'banRugby');
  store.appliquerJugement(jug, reponse);
  const apres = useGame.getState();
  ligne('la carrière est terminée', apres.joueur ? 'encore en cours' : 'terminée',
    apres.joueur === null);
  ligne('… et elle est entrée au panthéon', `${apres.pantheon.length} carrière(s)`,
    apres.pantheon.length > 0);
}

console.log('\n=== 6. AUGMENTATION & PRIME : LE CLUB PAIE, MAIS PAS N’IMPORTE QUOI ===');
{
  const base = nouveauJoueur();
  const j: Joueur = {
    ...base,
    contrat: { club: base.club, division: 'prod2', saisons: 2, salaire: 60_000 },
  };

  const folle = appliquerActionClub(j, 'augmentation', 5_000_000, 'Tu as tout gagné.')!;
  ligne('une augmentation est plafonnée à 35 % du salaire',
    `+${folle.montant} € (salaire ${folle.joueur.contrat!.salaire} €)`,
    folle.montant <= 21_000 && folle.joueur.contrat!.salaire <= 81_000);
  ligne('… et elle touche VRAIMENT le contrat',
    `${j.contrat!.salaire} → ${folle.joueur.contrat!.salaire}`,
    folle.joueur.contrat!.salaire > j.contrat!.salaire);

  const sansContrat = appliquerActionClub(
    { ...j, contrat: undefined }, 'augmentation', 20_000, 'x',
  );
  ligne('un joueur sans club n’est pas augmenté', String(sansContrat), sansContrat === null);

  const prime = appliquerActionClub(j, 'prime', 900_000, 'Homme du match.')!;
  ligne('une prime est plafonnée à 20 % du salaire', `${prime.montant} €`,
    prime.montant <= 12_000 && prime.joueur.argent === j.argent + prime.montant);

  const amateur = appliquerActionClub({ ...j, contrat: undefined }, 'prime', 900_000, 'x')!;
  ligne('un amateur touche une enveloppe, pas un jackpot', `${amateur.montant} €`,
    amateur.montant <= 400);

  const amende = appliquerActionClub(j, 'amende', 900_000, 'Retard répété.')!;
  ligne('une amende est plafonnée à 15 % du salaire', `${amende.montant} €`,
    amende.montant <= 9000 && amende.joueur.argent < j.argent);
}

console.log('\n=== 7. UNE SEULE AUGMENTATION PAR SAISON ===');
{
  const j = nouveauJoueur();
  const augmentation = JSON.stringify({
    recit: 'Le président sort son stylo.', titre: 'Revalorisé', reussite: 'reussite',
    deltas: {}, club: { type: 'augmentation', montant: 15000, motif: 'Six matchs de patron.' },
  });
  const salaireDepart = j.contrat?.salaire ?? 0;
  for (let i = 0; i < 4; i += 1) {
    const courant = useGame.getState().joueur!;
    store.poserEvenementHebdo(scene(false));
    store.appliquerJugement(
      parserJugement(augmentation, contexte(courant, scene(false), 'je demande une revalorisation')),
      'je demande une revalorisation',
    );
  }
  const fin = useGame.getState().joueur!;
  const compteurs = useGame.getState().compteurs;
  ligne('quatre demandes, une seule augmentation',
    `${compteurs.augmentations} accordée(s)`, compteurs.augmentations === 1);
  ligne('… le salaire n’a donc bougé qu’une fois',
    `${salaireDepart} → ${fin.contrat?.salaire}`,
    (fin.contrat?.salaire ?? 0) <= Math.round(salaireDepart * 1.35) + 100);
}

console.log('\n=== 8. POPULARITÉ ET ABONNÉS : LE MJ LES PILOTE, BORNÉS ===');
{
  const j = nouveauJoueur();
  const limites = {
    budgetAttributs: BUDGET_IA_PAR_SAISON, age: j.age, salaire: 60_000,
    abonnes: 10_000, suspect: false,
  };
  const explose = plafonnerDeltas(
    { popularite: 90, abonnes: 5_000_000, confianceCoach: 80 }, limites,
  );
  ligne('la popularité ne saute pas de 90 points',
    `${explose.deltas.popularite}`, (explose.deltas.popularite ?? 99) <= 10);
  ligne('les abonnés montent au plus de 40 %',
    `+${explose.deltas.abonnes}`, (explose.deltas.abonnes ?? 0) <= 4000);
  ligne('la confiance du staff est bornée aussi',
    `${explose.deltas.confianceCoach}`, (explose.deltas.confianceCoach ?? 99) <= 12);

  const debutant = plafonnerDeltas({ abonnes: 900_000 }, { ...limites, abonnes: 0 });
  ligne('un compte à zéro peut quand même démarrer',
    `+${debutant.deltas.abonnes}`, debutant.deltas.abonnes === 400);

  const chute = plafonnerDeltas({ abonnes: -900_000 }, limites);
  ligne('un scandale ne vide pas plus de 70 % du compte',
    `${chute.deltas.abonnes}`, chute.deltas.abonnes === -7000);

  const triche = plafonnerDeltas(
    { popularite: 10, abonnes: 3000 }, { ...limites, suspect: true },
  );
  ligne('les réclamer ne rapporte rien', JSON.stringify(triche.deltas),
    !triche.deltas.popularite && !triche.deltas.abonnes);

  // Et le store sait les appliquer (elles n'existaient pas dans `appliquerDeltas`).
  store.poserEvenementHebdo(scene(false));
  const jug = parserJugement(
    JSON.stringify({
      recit: 'Ta story tourne en boucle.', titre: 'Virale', reussite: 'reussite',
      deltas: { popularite: 6, abonnes: 2500, confianceCoach: -4 },
    }),
    contexte(j, scene(false), 'je poste une vidéo de mon essai'),
  );
  store.appliquerJugement(jug, 'je poste une vidéo de mon essai');
  const apres = useGame.getState().joueur!;
  ligne('le store applique la popularité',
    `${j.popularite ?? 50} → ${apres.popularite}`, (apres.popularite ?? 0) > (j.popularite ?? 50));
  ligne('… les abonnés',
    `${j.abonnes ?? 0} → ${apres.abonnes}`, (apres.abonnes ?? 0) > (j.abonnes ?? 0));
  ligne('… et la confiance du staff',
    `${j.confianceCoach ?? 50} → ${apres.confianceCoach}`,
    (apres.confianceCoach ?? 99) < (j.confianceCoach ?? 50));
}

console.log('\n=== 9. L’OVALE AUSSI : SALIR SON CLUB, C’EST LA PORTE ===');
{
  ligne('un clash ordinaire reste autorisé', String(lireDerapage('ce match était une honte, on a été nuls')),
    lireDerapage('ce match était une honte, on a été nuls') === null);
  const sale = lireDerapage('mon club est dirigé par des voleurs, je crache sur ce maillot');
  ligne('salir son club est détecté', String(sale), sale === 'atteinteClub');
  const raciste = lireDerapage('sale race, retourne dans ton pays');
  ligne('… sans jamais voler la place à un propos raciste', String(raciste),
    raciste === 'discrimination');
}

console.log(
  echecs === 0
    ? '\n✅ Le MJ pilote la carrière — et le code garde la main sur chaque levier.'
    : `\n❌ ${echecs} vérification(s) en échec.`,
);
process.exitCode = echecs === 0 ? 0 : 1;
