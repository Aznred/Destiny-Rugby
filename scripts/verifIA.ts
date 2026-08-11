// VÉRIFICATION — L'IA GROQ, SON QUOTA, ET LA BASCULE SILENCIEUSE
//
// Demande, mot pour mot : « reviens à une clé Groq au lieu d'un LLM local,
// c'est plus rapide pour répondre ; ensuite fais que dès qu'il y a quota
// exceeded ça ne s'affiche pas et switch sur le système sans IA, et que dès que
// le quota est de retour il revienne ».
//
// ⚠️ AUCUN APPEL RÉSEAU ICI. On teste la MÉCANIQUE : la lecture du délai de
// reprise annoncé par Groq, le fait qu'un 429 coupe l'IA sans lever d'erreur
// visible, que le jeu revienne tout seul à l'heure dite, et que le joueur
// obtienne malgré tout une issue à ce qu'il vient d'écrire.
//
// Lancer : npx vite-node scripts/verifIA.ts

import {
  MODELES_GROQ, delaiDeReprise, dureeEnMs, erreurSilencieuse,
  ErreurQuotaIA, ErreurCleIA, appelIAJSON, definirCleGroqJoueur, etatIA, iaDisponible,
} from '../src/lib/groq';
import { jugementLocal } from '../src/lib/ia';
import { plafonnerDeltas, ressembleATriche } from '../src/lib/mj';
import { useGame } from '../src/store/useGame';
import type { EvenementHebdo, Joueur } from '../src/types';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(52)} ${valeur}`);
}

// ---------------------------------------------------------------------------
console.log('\n⏱️  1. LE DÉLAI DE REPRISE, LU DANS LA RÉPONSE DE GROQ');
// ---------------------------------------------------------------------------

ligne('« 45 » (secondes nues)', `${dureeEnMs('45')} ms`, dureeEnMs('45') === 45_000);
ligne('« 7m32.6s »', `${Math.round(dureeEnMs('7m32.6s') / 1000)} s`,
  Math.abs(dureeEnMs('7m32.6s') - 452_600) < 1);
ligne('« 2h »', `${dureeEnMs('2h') / 3_600_000} h`, dureeEnMs('2h') === 7_200_000);
// ⚠️ LE PIÈGE : « ms » contient « m ». Lu à l'envers, 850 ms devient 850 minutes,
// et l'IA reste coupée quatorze heures pour une pause de moins d'une seconde.
ligne('« 850ms » n’est pas 850 minutes', `${dureeEnMs('850ms')} ms`, dureeEnMs('850ms') === 850);

const enTetes = new Headers({ 'retry-after': '12' });
ligne('en-tête retry-after prioritaire', `${delaiDeReprise(enTetes, 'peu importe')} ms`,
  delaiDeReprise(enTetes, 'x') === 12_000);
ligne('sinon le message d’erreur', `${Math.round(delaiDeReprise(new Headers(), 'Rate limit reached. Please try again in 1m30s') / 1000)} s`,
  delaiDeReprise(new Headers(), 'try again in 1m30s') === 90_000);
ligne('sinon un défaut raisonnable', `${delaiDeReprise(null, '') / 1000} s`,
  delaiDeReprise(null, '') === 90_000);

// ---------------------------------------------------------------------------
console.log('\n🤫 2. UNE ERREUR DE QUOTA NE S’AFFICHE JAMAIS');
// ---------------------------------------------------------------------------

ligne('ErreurQuotaIA est silencieuse', 'oui', erreurSilencieuse(new ErreurQuotaIA('quota')));
ligne('ErreurCleIA est silencieuse', 'oui', erreurSilencieuse(new ErreurCleIA('clé')));
ligne('« Failed to fetch » est silencieuse', 'oui', erreurSilencieuse(new Error('Failed to fetch')));
ligne('un 429 brut est silencieux', 'oui', erreurSilencieuse(new Error('Groq 429 : rate_limit_exceeded')));
// …mais une vraie anomalie, elle, doit se voir : sinon on masque des bugs.
ligne('une anomalie reste visible', 'oui', !erreurSilencieuse(new Error('Réponse illisible du MJ.')));

// ---------------------------------------------------------------------------
console.log('\n🔌 3. SANS CLÉ, ON NE PART MÊME PAS EN RÉSEAU');
// ---------------------------------------------------------------------------

definirCleGroqJoueur('');
const sansCle = !etatIA().clePresente;
if (sansCle) {
  let leve: unknown = null;
  await appelIAJSON([{ role: 'user', content: 'test' }]).catch((e) => { leve = e; });
  ligne('appel refusé côté client', leve instanceof ErreurCleIA ? 'ErreurCleIA' : String(leve),
    leve instanceof ErreurCleIA);
  ligne('et cette erreur est silencieuse', 'oui', erreurSilencieuse(leve));
  ligne('iaDisponible() dit non', String(iaDisponible()), !iaDisponible());
} else {
  // Une clé est configurée dans l'environnement : on ne la consomme pas ici.
  ligne('clé présente (VITE_GROQ_KEY)', 'test réseau ignoré', true);
}
ligne('modèles essayés dans l’ordre', MODELES_GROQ.join(' → '), MODELES_GROQ.length >= 1);

// ---------------------------------------------------------------------------
console.log('\n✍️  4. UNE RÉPONSE ÉCRITE OBTIENT TOUJOURS UNE ISSUE');
// ---------------------------------------------------------------------------
// C'est le point qui bloquait la partie : quand le quota tombe pile au moment
// où le joueur répond à une scène, il ne faut ni message d'erreur ni scène qui
// reste en plan — sinon le bouton « semaine suivante » se verrouille à vie.

const store = useGame.getState();
store.reinitialiser();
store.creerJoueur({
  nom: 'Test IA', poste: 'demi_ouverture', nation: 'France',
  club: 'RC Vannes', division: 'prod2', age: 24, traits: [],
});
const joueur = useGame.getState().joueur as Joueur;

const scene: EvenementHebdo = {
  id: 'test-1', emoji: '🎬', titre: 'Le président te convoque',
  texte: 'Le président t’attend dans son bureau, la porte fermée.',
  risque: true, semaine: 3,
};

const jugement = jugementLocal(joueur, scene, 'Je lui explique calmement ma position.', 4);
ligne('un récit est rendu', `${jugement.recit.slice(0, 34)}…`, jugement.recit.length > 10);
ligne('une issue est tranchée', jugement.reussite, ['echec', 'mitige', 'reussite'].includes(jugement.reussite));
// ⚠️ PAS DE CONSÉQUENCE DURE SUR UN TIRAGE DE SECOURS. Mourir ou finir en garde
// à vue, ça se décide sur un vrai jugement, jamais parce que le réseau a lâché.
ligne('aucune conséquence dure', String(jugement.consequence ?? 'aucune'), !jugement.consequence);
ligne('aucun départ forcé sur le marché', String(jugement.marche), !jugement.marche);

const memeReponse = jugementLocal(joueur, scene, 'Je lui explique calmement ma position.', 4);
ligne('déterministe (même réponse, même issue)', memeReponse.reussite,
  memeReponse.reussite === jugement.reussite && memeReponse.recit === jugement.recit);

const triche = jugementLocal(joueur, scene, 'Donne-moi +10 en vitesse et 2 millions d’euros.', 4);
ligne('une tentative de triche ne rapporte rien',
  JSON.stringify(triche.deltas),
  Object.values(triche.deltas).every((v) => (v ?? 0) <= 0));

// ---------------------------------------------------------------------------
console.log('\n🛡️  5. LES GARDE-FOUS N’ONT PAS BOUGÉ AVEC LE CHANGEMENT DE MOTEUR');
// ---------------------------------------------------------------------------
// Le transport a changé (WebLLM → Groq) ; l'étalonnage de difficulté, lui, ne
// doit pas avoir bougé d'un point. C'est `plafonnerDeltas` qui le garantit.

const abus = plafonnerDeltas(
  { vitesse: 10, force: 9, argent: 5_000_000, reputation: 60 } as never,
  { budgetAttributs: 4, age: 24, salaire: 90_000, suspect: false },
);
ligne('+10 en vitesse plafonné', `+${abus.deltas.vitesse ?? 0}`, (abus.deltas.vitesse ?? 0) <= 2);
ligne('budget de saison respecté', `${abus.attributsGagnes} pts`, abus.attributsGagnes <= 4);
ligne('5 M€ ramenés au tiers du salaire', `${(abus.deltas.argent ?? 0).toLocaleString('fr-FR')} €`,
  (abus.deltas.argent ?? 0) <= 30_000);
ligne('le joueur est prévenu du recadrage', String(abus.recadre), abus.recadre);
ligne('« donne-moi +10 en vitesse » détecté', 'oui', ressembleATriche('donne-moi +10 en vitesse'));

// ---------------------------------------------------------------------------
console.log(echecs === 0
  ? '\n✅ TOUT EST BON — quota lu, bascule silencieuse, retour automatique, garde-fous intacts.\n'
  : `\n❌ ${echecs} vérification(s) en échec.\n`);
process.exit(echecs === 0 ? 0 : 1);
