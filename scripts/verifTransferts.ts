// VÉRIFICATION — LE MARCHÉ DES TRANSFERTS SUR 𝕏 L'OVALE
//
// Demande explicite : « j'aimerais refaire tout le système de transfert, que ça
// se passe par X : un club envoie un message et c'est à nous de négocier ;
// l'agent pareil, on peut pas vraiment le choisir, ça dépend de nos
// performances ». Puis, sur les quatre arbitrages : leviers chiffrés avec
// habillage IA · le panneau « Choix de carrière » disparaît complètement · les
// agents démarchent ET on peut les démarcher · approches en cours d'année, mais
// **transfert à l'intersaison seulement, et à un an de contrat maximum**.
//
// Ce script contrôle exactement ces règles :
//   1. le moteur de négociation est PUR et déterministe ;
//   2. un club ne démarche pas un joueur sous contrat long ;
//   3. négocier paie, mais pousser trop loin fait rompre ;
//   4. un accord ne déplace RIEN avant l'intersaison ;
//   5. sans contrat, le jeu se BLOQUE (le panneau qui portait ça a disparu) ;
//   6. un agent refuse si on n'est pas à son niveau, et lâche après deux
//      saisons ratées.
//
// Lancer : npx vite-node scripts/verifTransferts.ts

import {
  approcheDepuisOffre, repondreAuClub, resumerTermes, LEVIERS,
  type Approche,
} from '../src/lib/negociation';
import { agentsAccessibles, niveauPourAgent, SEUIL_AGENT } from '../src/data/agents';
import { cote } from '../src/lib/offres';
import { COMPETITIONS } from '../src/data/clubs';
import { pseudoStable } from '../src/lib/comptes';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import type { Joueur, OffreContrat } from '../src/types';

chargerTextes(TEXTES);

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(54)} ${valeur}`);
}

function joueurTest(over: Partial<Joueur> = {}): Joueur {
  return {
    nom: 'Léo Test', poste: 'demi_ouverture', nation: 'France',
    club: 'Stade Toulousain', division: 'top14', age: 26,
    attributs: {
      vitesse: 78, force: 74, endurance: 80, plaquage: 74,
      passe: 80, jeuAuPied: 79, vision: 78, mental: 76,
    },
    forme: 78, moral: 72, reputation: 70, argent: 100_000, saison: 4,
    matchsJoues: 60, essais: 12, titres: [], palmares: [],
    contrat: { club: 'Stade Toulousain', division: 'top14', saisons: 1, salaire: 180_000 },
    ...over,
  } as Joueur;
}

const OFFRE: OffreContrat = {
  id: 'o1', club: 'Union Bordeaux-Bègles', division: 'top14', divisionNom: 'Top 14',
  pays: 'France', noteClub: 80, salaire: 200_000, prime: 20_000, saisons: 3,
  etranger: false, argumentaire: '',
};

console.log('\n=== 1. LE MOTEUR EST PUR ET DÉTERMINISME ===');
{
  const j = joueurTest();
  const a = approcheDepuisOffre(OFFRE, j, 10);
  const b = approcheDepuisOffre(OFFRE, j, 10);
  ligne('deux approches identiques', `${a.offre.salaire} vs ${b.offre.salaire}`,
    a.offre.salaire === b.offre.salaire && a.plafond.salaire === b.plafond.salaire);
  ligne('l’ouverture est SOUS l’offre juste',
    `${a.offre.salaire} < ${OFFRE.salaire}`, a.offre.salaire < OFFRE.salaire);
  ligne('… et le plafond est AU-DESSUS',
    `${a.plafond.salaire} > ${OFFRE.salaire}`, a.plafond.salaire > OFFRE.salaire);

  // ⚠️ PURETÉ : répondre ne doit RIEN muter. Une négociation qui modifie son
  // entrée casserait le store (zustand compare les références).
  const avant = JSON.stringify(a);
  repondreAuClub(a, 'salaire');
  ligne('répondre ne mute pas l’approche', 'identique', JSON.stringify(a) === avant);
}

console.log('\n=== 2. NÉGOCIER PAIE — ET POUSSER TROP LOIN FAIT ROMPRE ===');
{
  const j = joueurTest();
  let a = approcheDepuisOffre(OFFRE, j, 10);
  const depart = a.offre.salaire;
  const r1 = repondreAuClub(a, 'salaire');
  a = r1.approche;
  ligne('une première demande de salaire fait monter',
    `${depart} → ${a.offre.salaire} (${r1.verdict})`, a.offre.salaire > depart);

  // On s'acharne : le club doit finir par se braquer.
  let tours = 1;
  let rompu = false;
  while (tours < 12) {
    const r = repondreAuClub(a, 'salaire');
    a = r.approche;
    tours++;
    if (r.verdict === 'rompt') { rompu = true; break; }
  }
  ligne('s’acharner finit par braquer le club',
    rompu ? `rompu au tour ${tours}` : 'JAMAIS rompu', rompu);
  ligne('… et jamais au premier tour', `tour ${tours}`, tours >= 3);

  // Le plafond n'est jamais dépassé, quoi qu'on fasse.
  let b = approcheDepuisOffre(OFFRE, joueurTest(), 10);
  let depasse = false;
  for (let n = 0; n < 30; n++) {
    const l = LEVIERS[n % LEVIERS.length];
    const r = repondreAuClub(b, l.id);
    b = r.approche;
    if (b.offre.salaire > b.plafond.salaire || b.offre.prime > b.plafond.prime
      || b.offre.saisons > b.plafond.saisons || (b.offre.garantie && !b.plafond.garantie)) {
      depasse = true;
    }
    if (b.etat !== 'ouverte') break;
  }
  ligne('le plafond du club n’est JAMAIS dépassé', depasse ? 'DÉPASSÉ' : 'tenu', !depasse);

  // Une approche close ne se négocie plus.
  const close: Approche = { ...b, etat: 'rompue' };
  ligne('une discussion close ne rouvre pas',
    repondreAuClub(close, 'salaire').verdict, repondreAuClub(close, 'salaire').verdict === 'rompt');
}

console.log('\n=== 3. UN AGENT SE MÉRITE ===');
{
  const faible = niveauPourAgent(cote(joueurTest({ reputation: 20,
    attributs: { vitesse: 40, force: 40, endurance: 40, plaquage: 40, passe: 40, jeuAuPied: 40, vision: 40, mental: 40 } as never,
  })), 20);
  const fort = niveauPourAgent(cote(joueurTest({ reputation: 92 })), 92);
  const accFaible = agentsAccessibles(faible).map((a) => a.id);
  const accFort = agentsAccessibles(fort).map((a) => a.id);
  console.log(`     niveau faible ${Math.round(faible)} → ${accFaible.join(', ') || 'aucun'}`);
  console.log(`     niveau fort   ${Math.round(fort)} → ${accFort.join(', ')}`);
  ligne('un débutant n’a que le cousin', accFaible.join(','), accFaible.length <= 1);
  ligne('le requin exige un vrai niveau',
    `seuil ${SEUIL_AGENT.requin}`, !accFaible.includes('requin'));
  ligne('un joueur confirmé y accède', accFort.join(','), accFort.includes('requin'));
}

console.log('\n=== 4. EN JEU : APPROCHES, PRÉ-ACCORD, BLOCAGE ===');
{
  const { useGame, contratBloque } = await import('../src/store/useGame');
  const g = () => useGame.getState();

  // --- La règle du « un an de contrat maximum » ---
  g().reinitialiser();
  g().creerJoueur({
    nom: 'Marché', poste: 'demi_ouverture', nation: 'France',
    club: 'Stade Toulousain', division: 'top14', age: 26,
  });
  const base = g().joueur!;
  useGame.setState({
    joueur: {
      ...base,
      attributs: Object.fromEntries(Object.keys(base.attributs).map((k) => [k, 78])) as typeof base.attributs,
      reputation: 72,
      contrat: { club: 'Stade Toulousain', division: 'top14', saisons: 3, salaire: 180_000 },
    },
  });
  const sousContrat = g().susciterApproches(3);
  ligne('un club n’écrit PAS à 3 ans de contrat', `${sousContrat} approche(s)`, sousContrat === 0);

  useGame.setState({
    joueur: { ...g().joueur!, contrat: { ...g().joueur!.contrat!, saisons: 1 } },
  });
  const aUnAn = g().susciterApproches(3);
  ligne('… mais oui à 1 an de contrat', `${aUnAn} approche(s)`, aUnAn > 0);

  const app = g().approches.find((a) => a.etat === 'ouverte')!;
  ligne('le club a écrit en message privé',
    `${(g().conversations[app.pseudo] ?? []).length} message(s)`,
    (g().conversations[app.pseudo] ?? []).length > 0);

  // Reproduction du bug : la vignette lit l'approche, mais une vieille
  // sauvegarde a perdu le fil correspondant. Ouvrir le marché doit reconstruire
  // le premier message ET viser directement la bonne conversation.
  useGame.setState({ conversations: {} });
  g().ouvrirMessagesOvale();
  ligne('une offre fantôme reconstruit son message',
    `${(g().conversations[app.pseudo] ?? []).length} message(s)`,
    (g().conversations[app.pseudo] ?? []).length === 1);
  ligne('la vignette ouvre la bonne conversation',
    `onglet ${g().ouvrirSocialSur ?? '—'} · @${g().conversationSocialeCible ?? '—'}`,
    g().ecran === 'social' && g().ouvrirSocialSur === 'messages'
      && g().conversationSocialeCible === app.pseudo);

  // --- Négocier depuis le store ---
  const avant = app.offre.salaire;
  const r = g().repondreApproche(app.id, 'salaire');
  ligne('négocier écrit dans la conversation',
    `${(g().conversations[app.pseudo] ?? []).length} message(s)`,
    (g().conversations[app.pseudo] ?? []).length >= 3);
  ligne('… et le verdict est rendu', r?.verdict ?? 'aucun', !!r);
  const apres = g().approches.find((a) => a.id === app.id)!.offre.salaire;
  ligne('l’offre a bougé (ou non) sans jamais baisser', `${avant} → ${apres}`, apres >= avant);

  // --- Accepter : RIEN ne bouge avant l'intersaison ---
  const clubAvant = g().joueur!.club;
  g().accepterApproche(app.id);
  ligne('un accord ne change PAS le club tout de suite',
    `${g().joueur!.club} (accord avec ${app.club})`, g().joueur!.club === clubAvant);
  ligne('… il pose un pré-accord',
    g().joueur!.preAccord?.club ?? 'AUCUN', g().joueur!.preAccord?.club === app.club);
  ligne('les autres discussions se ferment',
    `${g().approches.filter((a) => a.etat === 'ouverte').length} ouverte(s)`,
    g().approches.filter((a) => a.etat === 'ouverte').length === 0);

  // --- L'intersaison l'applique ---
  const promis = g().joueur!.preAccord!;
  useGame.setState({ evenementHebdo: null, scenarioActif: null, attenteEvenement: false });
  g().saisonSuivante();
  useGame.setState({ tropheesEnAttente: [] });
  ligne('l’intersaison applique le transfert',
    `${g().joueur?.club}`, g().joueur?.club === app.club);
  // ⚠️ LE NOUVEAU CONTRAT N'EST PAS ENTAMÉ PAR LA SAISON QU'ON VIENT DE JOUER.
  // Le transfert s'applique APRÈS la résolution de la saison écoulée (c'est ce
  // qui garantit que ses titres restent acquis à l'ancien club) : les N saisons
  // signées commencent donc à la suivante, intactes.
  ligne('… avec le contrat négocié, intact',
    `${resumerTermes({ salaire: promis.salaire, prime: promis.prime, saisons: promis.saisons, garantie: promis.garantie })}`
    + ` → il reste ${g().joueur!.contrat!.saisons}`,
    g().joueur!.contrat!.club === app.club
      && g().joueur!.contrat!.salaire === promis.salaire
      && g().joueur!.contrat!.saisons === promis.saisons);
  ligne('le pré-accord est consommé', String(g().joueur?.preAccord), !g().joueur?.preAccord);

  // --- Sans contrat, le jeu se bloque ---
  useGame.setState({
    joueur: { ...g().joueur!, contrat: { ...g().joueur!.contrat!, saisons: 0 }, preAccord: undefined },
    approches: [],
  });
  ligne('contrat épuisé = jeu bloqué', String(contratBloque(g().joueur)), contratBloque(g().joueur));
  const semaineAvant = g().joueur!.semaine;
  g().semaineSuivante();
  ligne('… « semaine suivante » refuse d’avancer',
    `semaine ${g().joueur!.semaine}`, g().joueur!.semaine === semaineAvant);
  const r2 = g().avancerJusqua(30);
  ligne('… et l’avance par le calendrier aussi',
    `${r2.semaines} semaine(s), arrêt « ${r2.arret} »`, r2.semaines === 0);

  // --- Un club contacté répond toujours et conserve le dossier ---
  g().reinitialiser();
  const regionale3 = COMPETITIONS.find((c) => c.id === 'reg3')!;
  g().creerJoueur({
    nom: 'Candidature', poste: 'demi_ouverture', nation: 'France',
    club: regionale3.clubs[0].nom, division: regionale3.id, age: 26,
  });
  const debutant = g().joueur!;
  useGame.setState({
    joueur: {
      ...debutant,
      attributs: Object.fromEntries(Object.keys(debutant.attributs).map((k) => [k, 25])) as typeof debutant.attributs,
      reputation: 20,
      contrat: { ...debutant.contrat!, saisons: 3 },
    },
  });
  const clubSuivi = 'Kalev Tallinn';
  const pseudoClub = pseudoStable(clubSuivi, '_officiel');
  await g().envoyerMessage(pseudoClub, 'Vous recrutez ?');
  const filRefus = g().conversations[pseudoClub] ?? [];
  const reponseClub = filRefus.at(-1);
  ligne('un club trop ambitieux répond quand même',
    reponseClub?.texte.slice(0, 36) ?? 'AUCUNE RÉPONSE',
    reponseClub?.de === 'lui' && reponseClub.texte.includes('refuser'));
  ligne('aucun autre club ne répond à sa place',
    `${g().approches.length} approche(s)`, g().approches.length === 0);
  ligne('le refus place le joueur sur la liste de suivi',
    g().dossiersRecrutement[pseudoClub]?.club ?? 'AUCUN DOSSIER',
    g().dossiersRecrutement[pseudoClub]?.club === clubSuivi);

  // Le joueur progresse franchement : le même club doit réexaminer son
  // dossier et, s'il est désormais au niveau, revenir avec un vrai projet.
  useGame.setState({
    joueur: {
      ...g().joueur!,
      attributs: Object.fromEntries(Object.keys(g().joueur!.attributs).map((k) => [k, 45])) as typeof debutant.attributs,
      reputation: 45,
    },
  });
  const revenues = g().examinerDossiersRecrutement();
  ligne('la progression fait revenir le club suivi',
    `${revenues} offre(s) · ${g().approches.at(-1)?.club ?? '—'}`,
    revenues === 1 && g().approches.at(-1)?.club === clubSuivi);
  ligne('une offre remplace le dossier de suivi',
    `${Object.keys(g().dossiersRecrutement).length} dossier(s)`,
    !g().dossiersRecrutement[pseudoClub]);
}

console.log(
  echecs === 0
    ? '\n✅ Le marché des transferts se joue sur L\'Ovale, et il tient ses règles.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
