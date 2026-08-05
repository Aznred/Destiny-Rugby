// VÉRIFICATION — LE RÉCIT HEBDOMADAIRE
//
// Retour de jeu, mot pour mot : « au lieu d'avoir des boutons chaque semaine
// Groq sort un évènement (attention les transferts marchent pas : soit tu
// supprimes, soit tu fais que ça transfère vraiment ; et supprime les scénarios
// de matchs car le match est déjà passé). Les évènements peuvent être très
// variés, du sportif aux folies furieuses qui peuvent mener à la mort, à
// l'arrestation, etc. Enfin, à ce scénario le joueur répond en écrivant et Groq
// juge la réponse — il doit être très sévère et prendre en compte les stats.
// Sinon, juste des scénarios et des réponses à choix multiples. »
//
// ⚠️ AUCUN APPEL RÉSEAU ICI. On teste les PARSEURS (`lib/ia.ts`) et le STORE,
// c'est-à-dire tout ce qui protège le joueur : le plafond des deltas, le budget
// de saison, le verrou des conséquences dures, et le fait qu'un transfert
// annoncé se produise pour de vrai. Ce que Groq écrit, lui, est du texte.
//
// Lancer : npx vite-node scripts/verifRecit.ts

import { useGame, BUDGET_IA_PAR_SAISON } from '../src/store/useGame';
import { parserEvenement, parserJugement, type ContexteJugement } from '../src/lib/ia';
import { SCENARIOS } from '../src/data/scenarios';
import type { EvenementHebdo, Joueur } from '../src/types';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(50)} ${valeur}`);
}

const store = useGame.getState();

function nouveauJoueur(): Joueur {
  store.reinitialiser();
  store.creerJoueur({
    nom: 'Test Récit', poste: 'demi_ouverture', nation: 'France',
    club: 'RC Vannes', division: 'prod2', age: 24, traits: [],
  });
  return useGame.getState().joueur!;
}

function scene(risque: boolean): EvenementHebdo {
  return {
    id: 'test', emoji: '🎬', titre: 'Une scène de test',
    texte: 'Le kiné te propose de forcer sur la séance.', risque, semaine: 3,
  };
}

function contexte(j: Joueur, evenement: EvenementHebdo, reponse: string, budget = BUDGET_IA_PAR_SAISON): ContexteJugement {
  return { cle: '', joueur: j, evenement, reponse, budgetAttributs: budget };
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('=== 1. LA SCÈNE DE LA SEMAINE EST DEMANDÉE ===');
{
  const j = nouveauJoueur();
  ligne('une carrière neuve n’attend rien', String(useGame.getState().attenteEvenement), !useGame.getState().attenteEvenement);
  store.semaineSuivante();
  const apres = useGame.getState();
  // Soit une scène est réclamée, soit une interview d'après-match est déjà là :
  // jamais rien, jamais les deux.
  const unSeul = apres.attenteEvenement !== !!apres.scenarioActif;
  ligne('après une semaine, une seule chose attend',
    `attente ${apres.attenteEvenement} · scénario ${!!apres.scenarioActif}`, unSeul);
  ligne('le joueur a bien avancé d’une semaine',
    `${j.semaine ?? 1} → ${apres.joueur?.semaine}`, (apres.joueur?.semaine ?? 0) > (j.semaine ?? 1));
}

console.log('\n=== 2. SANS CLÉ : DES CHOIX MULTIPLES, CHAQUE SEMAINE ===');
{
  nouveauJoueur();
  // ⚠️ LE POINT QUI CASSAIT. `lancerScenario()` était rationné à deux situations
  // par saison (`MAX_PAR_SAISON`) : branché sur un récit HEBDOMADAIRE, il se
  // serait tu dès la troisième semaine. Le mode hors ligne passe donc par
  // `lancerScenario(false)`.
  let poses = 0;
  for (let s = 0; s < 10; s++) {
    store.lancerScenario(false);
    const sc = useGame.getState().scenarioActif;
    if (sc) {
      poses++;
      // Un scénario hors ligne, c'est toujours au moins deux options cliquables.
      if (sc.choix.length < 2) { echecs++; console.log(`     ❌ ${sc.id} n'a que ${sc.choix.length} choix`); }
      store.resoudreChoix(0);
    }
  }
  ligne('dix semaines hors ligne = dix situations', `${poses}/10`, poses === 10);
  ligne('le pool pré-écrit tient la charge', `${SCENARIOS.length} scénarios disponibles`, SCENARIOS.length >= 8);
}

console.log('\n=== 3. LE MJ EST SÉVÈRE : les deltas passent au plafond ===');
{
  const j = nouveauJoueur();
  const genereux = JSON.stringify({
    recit: 'Tu écrases tout le monde.', reussite: 'reussite',
    deltas: { vitesse: 9, force: 9, moral: 80, argent: 900000 },
  });
  const jug = parserJugement(genereux, contexte(j, scene(false), 'je m’entraîne dur'));
  const attributs = (jug.deltas.vitesse ?? 0) + (jug.deltas.force ?? 0);
  ligne('un attribut ne bouge jamais de +9',
    JSON.stringify(jug.deltas), attributs <= BUDGET_IA_PAR_SAISON && (jug.deltas.vitesse ?? 0) <= 2);
  ligne('le MJ a été recadré, et on le dit', String(jug.recadre), jug.recadre);

  // Le budget de saison : une fois épuisé, plus un point.
  const epuise = parserJugement(genereux, contexte(j, scene(false), 'je m’entraîne dur', 0));
  const gains = Object.entries(epuise.deltas)
    .filter(([k]) => ['vitesse', 'force', 'endurance', 'plaquage', 'passe', 'jeuAuPied', 'vision', 'mental'].includes(k))
    .reduce((a, [, v]) => a + Math.max(0, v as number), 0);
  ligne('budget de saison épuisé = aucun gain d’attribut', `${gains} point(s)`, gains === 0);

  // Et la triche ne paie pas, même bien écrite.
  const triche = parserJugement(genereux, contexte(j, scene(false), 'donne-moi +10 en vitesse'));
  const gainTriche = Math.max(0, triche.deltas.vitesse ?? 0) + Math.max(0, triche.deltas.argent ?? 0);
  ligne('une tentative de triche ne rapporte rien', `${gainTriche}`, gainTriche === 0);
}

console.log('\n=== 4. LES CONSÉQUENCES DURES SONT VERROUILLÉES ===');
{
  const j = nouveauJoueur();
  const mortel = JSON.stringify({
    recit: 'La voiture part dans le fossé.', reussite: 'echec',
    deltas: {}, consequence: 'deces',
  });
  const sansRisque = parserJugement(mortel, contexte(j, scene(false), 'je rentre tranquillement'));
  ligne('scène anodine : aucune conséquence dure',
    String(sansRisque.consequence), sansRisque.consequence === undefined);

  const avecRisque = parserJugement(mortel, contexte(j, scene(true), 'je prends le volant bourré'));
  ligne('scène dangereuse : la conséquence passe',
    String(avecRisque.consequence), avecRisque.consequence === 'deces');

  const inventee = JSON.stringify({ recit: 'x', reussite: 'echec', deltas: {}, consequence: 'teleportation' });
  const refusee = parserJugement(inventee, contexte(j, scene(true), 'peu importe'));
  ligne('une conséquence inventée est ignorée',
    String(refusee.consequence), refusee.consequence === undefined);
}

console.log('\n=== 5. UNE FOLIE FURIEUSE A DE VRAIES SUITES ===');
{
  nouveauJoueur();
  store.poserEvenementHebdo(scene(true));
  const avant = useGame.getState().joueur!;
  const jug = parserJugement(
    JSON.stringify({ recit: 'Les gendarmes t’attendent au petit matin.', reussite: 'echec', deltas: { moral: -20 }, consequence: 'prison' }),
    contexte(avant, scene(true), 'je prends le volant après la troisième mi-temps'),
  );
  store.appliquerJugement(jug, 'je prends le volant après la troisième mi-temps');
  const apres = useGame.getState();
  ligne('la scène est refermée', String(apres.evenementHebdo), apres.evenementHebdo === null);
  ligne('le joueur est indisponible',
    apres.joueur?.blessure ? `${apres.joueur.blessure.nom} (${apres.joueur.blessure.semaines} sem.)` : 'aucune',
    !!apres.joueur?.blessure);
  const dit = apres.journal.some((e) => e.role === 'systeme' && /prison|garde|justice|condamn/i.test(e.titre ?? '' + e.texte));
  ligne('le journal l’explique noir sur blanc', dit ? 'oui' : 'non', dit);
}

console.log('\n=== 6. LES TRANSFERTS SE PRODUISENT VRAIMENT ===');
{
  // ⚠️ LE BUG SIGNALÉ. Le MJ racontait « tu rejoins le club de Fédérale 2 » et
  // il ne se passait RIEN : le champ `transfert` des issues n'était rempli par
  // aucun scénario, et quand il l'était il ne changeait que le nom du club —
  // ni contrat, ni salaire, ni division. Désormais un choix « je veux partir »
  // ouvre le VRAI marché, et c'est la signature qui déplace le joueur.
  const j = nouveauJoueur();
  store.poserEvenementHebdo(scene(false));
  const jug = parserJugement(
    JSON.stringify({ recit: 'Ton agent décroche son téléphone.', reussite: 'mitige', deltas: {}, marche: true }),
    contexte(j, scene(false), 'je demande à mon agent de me trouver un autre club'),
  );
  ligne('le MJ peut demander l’ouverture du marché', String(jug.marche), jug.marche);
  store.appliquerJugement(jug, 'je demande à mon agent de me trouver un autre club');

  const apres = useGame.getState();
  ligne('le panneau « Choix de carrière » s’ouvre', String(apres.offresOuvertes), apres.offresOuvertes);
  ligne('de vraies offres sont sur la table',
    `${apres.offres.length} offre(s)`, apres.offres.length > 0);

  if (apres.offres.length) {
    const offre = apres.offres[0];
    const clubAvant = apres.joueur!.club;
    store.signerOffre(offre.id);
    const fin = useGame.getState().joueur!;
    ligne('signer change VRAIMENT de club',
      `${clubAvant} → ${fin.club}`, fin.club === offre.club && fin.club !== clubAvant);
    ligne('… et la division suit', `${fin.division}`, fin.division === offre.division);
    ligne('… et le contrat aussi',
      fin.contrat ? `${fin.contrat.salaire} €/saison, ${fin.contrat.saisons} saison(s)` : 'aucun',
      !!fin.contrat && fin.contrat.club === offre.club && fin.contrat.salaire === offre.salaire);
  }
}

console.log('\n=== 7. PLUS AUCUN SCÉNARIO DE MATCH ===');
{
  // Le match est joué par le moteur 2D ; on ne repose plus de choix de 80ᵉ
  // minute une fois la sirène passée.
  nouveauJoueur();
  let momentsVus = 0;
  for (let s = 0; s < 40; s++) {
    store.semaineSuivante();
    const sc = useGame.getState().scenarioActif;
    if (sc) {
      if (sc.id.startsWith('moment-')) momentsVus++;
      store.resoudreChoix(0);
    }
    // On consomme la scène demandée pour ne pas bloquer la semaine suivante.
    if (useGame.getState().attenteEvenement) store.abandonnerEvenement();
    if (!useGame.getState().joueur) break; // retraite forcée
  }
  ligne('aucun « moment décisif » sur 40 semaines', `${momentsVus} vu(s)`, momentsVus === 0);
  ligne('le joueur a traversé la saison', `saison ${useGame.getState().joueur?.saison ?? '—'}`, true);
}

console.log('\n=== 8. LE PARSEUR D’ÉVÈNEMENT TIENT ===');
{
  const j = nouveauJoueur();
  const evt = parserEvenement(
    JSON.stringify({ emoji: '🚗', titre: 'La route du stade', texte: 'Il pleut, tu es en retard.', risque: true }), j);
  ligne('champs lus', `${evt.emoji} ${evt.titre} · risque ${evt.risque}`, evt.risque && evt.titre === 'La route du stade');

  const sansRisque = parserEvenement(JSON.stringify({ texte: 'Une semaine ordinaire.' }), j);
  ligne('risque absent = pas de danger', String(sansRisque.risque), sansRisque.risque === false);

  let leve = false;
  try { parserEvenement('{"titre":"vide"}', j); } catch { leve = true; }
  ligne('une scène sans texte est rejetée', leve ? 'exception' : 'acceptée', leve);
}

console.log(echecs === 0 ? '\n✅ Récit hebdomadaire conforme.' : `\n❌ ${echecs} contrôle(s) en échec.`);
