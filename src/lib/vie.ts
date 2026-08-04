// LA VIE DU RÉSEAU — AU RYTHME DE LA SAISON
//
// ⚠️ PREMIÈRE VERSION, ABANDONNÉE : un « battement » toutes les 8 secondes
// faisait apparaître un post au hasard pendant qu'on lisait. Résultat : le fil
// partait dans tous les sens, les mêmes trois phrases revenaient en boucle, et
// un club annonçait sa compo cinq fois dans la même minute. Incohérent.
//
// DÉSORMAIS : le fil est daté. Chaque SEMAINE de jeu produit sa fournée de
// publications, et cette fournée est DÉTERMINISTE (graine = saison + semaine).
// Rouvrir L'Ovale ne réécrit rien ; jouer une semaine de plus fait descendre
// une nouvelle salve, avec la bonne date et le bon contexte — journée de
// championnat, week-end de Coupe d'Europe, Tournoi, phase finale ou mercato.
//
// LES COMPTES SONT DÉBRIDÉS : selon la relation que tu entretiens avec eux, ils
// te soutiennent, te chambrent ou t'allument franchement. Si tu insultes
// quelqu'un, il ne tend pas l'autre joue — il répond, et la relation s'effondre.
// Seule limite tenue : pas d'insulte discriminatoire (racisme, homophobie…),
// on reste dans la vanne de vestiaire et le clash sportif.

import type { CompteSuivi, Joueur, PostSocial } from '../types';
import { libelleDate, semaine, type Semaine } from '../data/calendrier';
import { graine } from './championnat';
import { competitionDuClub } from '../data/clubs';
import { audienceDe, statsDePost, statsDepuisVues } from './social';

// Relation avec un compte : −100 (ennemi juré) à +100 (ami proche).
export const RELATION_NEUTRE = 0;

export function humeur(relation: number): 'ami' | 'cordial' | 'neutre' | 'froid' | 'ennemi' {
  if (relation >= 50) return 'ami';
  if (relation >= 15) return 'cordial';
  if (relation > -15) return 'neutre';
  if (relation > -50) return 'froid';
  return 'ennemi';
}

// Ce que le joueur vient d'écrire : agressif, chaleureux, ou entre les deux.
const AGRESSIF = /\b(nul|nuls|merde|conn?ard|conn?asse|encul|batard|bâtard|ferme|ta gueule|tg|salope|abruti|débile|debile|clown|clochard|bouffon|dégage|degage|pourri|tocard|guignol|honte|ridicule)\w*/i;
const CHALEUREUX = /\b(merci|bravo|respect|felicitation|félicitation|content|hâte|hate|fier|force|courage|super|génial|genial|top|frère|frere|bisous|✊|💪|🤝|❤️|👏)/i;

export function tonDuMessage(texte: string): 'agressif' | 'chaleureux' | 'neutre' {
  if (AGRESSIF.test(texte)) return 'agressif';
  if (CHALEUREUX.test(texte)) return 'chaleureux';
  return 'neutre';
}

// Comment un message fait bouger la relation.
export function effetSurRelation(texte: string, relation: number): number {
  const ton = tonDuMessage(texte);
  if (ton === 'agressif') return Math.max(-100, relation - 25);
  if (ton === 'chaleureux') return Math.min(100, relation + 8);
  return Math.min(100, relation + 2); // parler, c'est déjà tisser un lien
}

// --- RÉPONSES HORS LIGNE, SELON L'HUMEUR ----------------------------------
const RIPOSTES = [
  'Répète-moi ça en face samedi, on verra si t’as la même voix. 😐',
  'Tu me parles comme ça alors que t’as fait quoi cette saison, exactement ?',
  'Ok. Noté. On se retrouve sur le terrain, tranquille.',
  'Franchement ? Va t’entraîner au lieu d’écrire des messages.',
  'Mec, t’es en train de te griller tout seul, et devant tout le monde.',
];
const FROIDES = [
  'Je préfère qu’on en reste là.',
  'Ouais. Bref.',
  'On n’a pas grand-chose à se dire je crois.',
];
const CORDIALES = [
  'Ça marche, on se capte à l’entraînement. 👊',
  'Toujours un plaisir. Bon courage pour le week-end.',
  'Merci pour le message, ça fait plaisir.',
];
const AMICALES = [
  'Toujours là frérot 🤝 Tu sais que je te suis.',
  'Ahah t’es un grand malade. On mange ensemble cette semaine ?',
  'Je t’ai dit, je te suis les yeux fermés. On va tout casser.',
];

// Un club ou un championnat ne répond pas comme un joueur chambré : il reste
// institutionnel, même quand on l'insulte. C'est plus glaçant, d'ailleurs.
const INSTITUTIONNELLES = [
  'Votre message a été transmis au service juridique du club. Bonne journée.',
  'Nous vous invitons à relire la charte de bonne conduite des licenciés.',
  'Ce type de message est archivé. Nous en resterons là.',
];

export function reponseLocale(compte: CompteSuivi, relation: number, texteRecu: string): string {
  const rng = graine(`dm#${compte.pseudo}#${texteRecu}`);
  const ton = tonDuMessage(texteRecu);
  const h = humeur(relation);
  const institution = compte.type === 'club' || compte.type === 'competition';
  if (institution && (ton === 'agressif' || h === 'ennemi')) {
    return INSTITUTIONNELLES[Math.floor(rng() * INSTITUTIONNELLES.length)];
  }
  if (ton === 'agressif' || h === 'ennemi') return RIPOSTES[Math.floor(rng() * RIPOSTES.length)];
  if (h === 'froid') return FROIDES[Math.floor(rng() * FROIDES.length)];
  if (h === 'ami') return AMICALES[Math.floor(rng() * AMICALES.length)];
  if (compte.type === 'club' || compte.type === 'competition') {
    return 'Message bien reçu. Le service communication revient vers toi rapidement.';
  }
  return CORDIALES[Math.floor(rng() * CORDIALES.length)];
}

// --- LES GABARITS ----------------------------------------------------------
//
// ⚠️ « C'est toujours les mêmes tweets » : le pool tenait en 4 phrases par type.
// Deux leviers pour en finir :
//   1. beaucoup plus de gabarits ;
//   2. surtout, une syntaxe d'ALTERNATIVE — `{ce soir|demain|dimanche}` — tirée
//      à la graine. Un gabarit à trois alternatives de trois choix, c'est 27
//      phrases. Le pool tient sur un écran et ne se répète jamais.
//
// Variables : {club} {division} {moi} {adverse} {jour}.

function developper(gabarit: string, rng: () => number): string {
  return gabarit.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, contenu: string) => {
    const choix = contenu.split('|');
    return choix[Math.floor(rng() * choix.length)];
  });
}

const CLUB = [
  '📋 {La compo|Le XV de départ|Le groupe} pour {ce week-end|dimanche|samedi} est en ligne. {Trois|Deux|Quatre} changements dans le pack.',
  '🎟️ Billetterie ouverte pour {la réception de {adverse}|le prochain match à domicile}. {Ça va être chaud bouillant.|On compte sur vous.|Guichets fermés en approche.}',
  '💬 Le coach : « {On sait ce qu’on a mal fait|On a manqué de discipline|Il nous a manqué vingt minutes}. On {corrige|travaille} ça cette semaine. »',
  '🏋️ {Séance de musculation|Réveil musculaire|Opposition} ce matin, groupe {au complet|amputé de trois joueurs}. Objectif {dimanche|le week-end}.',
  '❤️ Merci aux {12 000|9 400|15 200} personnes présentes. Vous êtes notre 16e homme.',
  '🩺 Point médical : {une entorse|une commotion|une lésion aux ischios} pour un de nos joueurs. {Absence estimée à trois semaines.|Il sera réévalué jeudi.}',
  '✍️ {Prolongation|Bonne nouvelle} — un de nos {jeunes|cadres} {prolonge|reste} {deux|trois} saisons de plus. {Formé au club.|Il ne voulait pas partir.}',
  '🚌 Départ pour {le déplacement|l’extérieur} {ce matin|à l’aube}. {Longue route, gros défi.|On y va pour gagner.}',
  '🏉 {Fin de match|Coup de sifflet final} à {adverse}. {On prend le point de bonus.|Rien à ramener.|On s’accroche jusqu’au bout.}',
  '📣 Le président : « {Le club est serein|On assume nos choix|Les résultats viendront}. {Le projet est à trois ans.|Il faut de la patience.} »',
];

const JOUEUR = [
  '{Grosse séance|Belle séance|Séance costaud} {ce matin|aujourd’hui}, les {jambes|cannes|cuisses} ont pris cher. 💪',
  'Y’a des semaines où tu te lèves et t’as juste envie de {rentrer dans quelqu’un|jouer}. {Aujourd’hui c’est ça.|C’est exactement ça.}',
  'On va pas se mentir, on a été {mauvais|à côté|indigents} {dimanche|samedi}. Faut {assumer et bosser|se remettre en question}.',
  'Le kiné m’a dit « ça va passer ». Ça fait {trois|deux|cinq} semaines que ça passe pas. 😅',
  'Quand j’entends certains parler de nous {dans les médias|sur les réseaux}… on note tout. 📝',
  'Mon coéquipier m’a mis {un cadre en touche|un raté à la mêlée}, je lui parle plus {de la semaine|jusqu’à dimanche}.',
  '{Vidéo|Analyse} ce matin. Se revoir rater {un plaquage|une passe} en boucle, {y’a pas mieux pour l’ego|c’est un plaisir}. 🙃',
  'Merci pour {tous les messages|le soutien}. {Vous êtes des dingues.|Ça compte plus que vous croyez.} 🙏',
  'Objectif {dimanche|du week-end} : {le point de bonus|gagner, point}. {Rien d’autre.|On parle après.}',
  'On me demande souvent {si je suis prêt|ce que je vise}. Réponse : {je bosse, c’est tout|regardez dimanche}.',
];

const JOURNALISTE = [
  '🔴 Info — {Réunion au sommet|Discussion tendue|Point d’étape} ce soir entre la direction de {club} et son staff. {Rien n’a filtré.|Ambiance décrite comme lourde.}',
  'Selon nos informations, {plusieurs clubs|deux clubs|un club} de {division} se penchent sur un joueur de {club}.',
  '{Ambiance lourde|Séance écourtée|Tension palpable} à l’entraînement de {club} {ce matin|hier}. À suivre.',
  'On me dit que le vestiaire n’a pas apprécié {la sortie médiatique|le communiqué} de la semaine.',
  '📌 Ce que j’entends sur {club} : {le staff sera jugé sur les six prochains matchs|la cellule recrutement est déjà au travail}.',
  '{Confirmé|On peut le dire} : {club} a bien pris {contact|des renseignements} pour un {pilier|ouvreur|ailier}. Dossier {loin d’être bouclé|bien avancé}.',
  'Personne n’en parle mais {moi} fait {une saison très solide|des choses intéressantes} en {division}. {Ça se saura.|À suivre de près.}',
];

const MEDIA = [
  '📊 {division} — {le classement|les chiffres} après cette journée. {Ça se resserre sérieusement.|Le haut de tableau se dessine.}',
  '🎥 {Le résumé|Les temps forts} de la journée : {un essai qui va tourner en boucle|une fin de match irrespirable}.',
  '🚨 Le marché des transferts s’emballe. {Trois|Deux|Quatre} dossiers pourraient tomber {cette semaine|d’ici dimanche}.',
  '⭐ Notre équipe type de la journée. {Un joueur de {club} y figure.|Trois clubs sur-représentés.}',
  '💰 {Enquête|Dossier} — combien pèsent vraiment les budgets de {division} ? {Les écarts font peur.|Du simple au quintuple.}',
  '🎙️ Interview à lire : « {On sous-estime le niveau de la {division}|Le rugby amateur tient le pays debout} ».',
];

const COMPETITION = [
  '🏆 Le programme complet de {la prochaine journée|la semaine} est disponible.',
  '⭐ Équipe type de la journée : découvrez les 15 joueurs retenus.',
  '📈 {Affluence record|Audience en hausse} ce week-end. {Le rugby n’a jamais autant attiré.|Merci à tous.}',
  '⚖️ Décisions de la commission de discipline : {deux|trois} matchs de suspension prononcés.',
  '🗓️ {Calendrier|Programmation} — les horaires de la prochaine journée viennent d’être publiés.',
];

const FAN = [
  'Franchement {club} cette saison, c’est {un scandale|une catastrophe|du grand n’importe quoi}. On mérite mieux. 😤',
  'J’ai payé {25|30|18} balles pour voir ça. {Je veux mon argent.|Plus jamais.}',
  'ALLEZ {club} 💚 On lâche rien, {jamais|jusqu’au bout}.',
  'Le mec qui critique depuis son canapé et qui a jamais mis un plaquage de sa vie. 🤡',
  '{Arbitrage|L’arbitre} encore {scandaleux|à sens unique} aujourd’hui. {On nous vole.|Ça devient insupportable.}',
  'Mon fils de {6|8|10} ans a demandé le maillot de {moi} pour Noël. {Voilà où on en est.|Fierté.} 🥹',
  'Sérieusement, {qui a validé cette compo|à quoi joue le staff} ? {Je comprends pas.|Expliquez-moi.}',
];

const HATER = [
  'Objectivement, {moi} n’a pas le niveau. {On peut le dire calmement.|Point.}',
  'Le rugby c’était mieux avant, et {club} en est la preuve vivante.',
  'Vous allez voir qu’ils vont encore {perdre|se saborder}. Comme d’habitude.',
  '{moi} qui fait des stories à la salle mais qui est {sur le banc|en tribune} le dimanche. 😂',
  'On m’explique pourquoi {moi} est {titulaire|dans le groupe} ? {Je pose la question.|Non parce que là…}',
];

const SELECTION = [
  '🏳️ Le groupe pour {la prochaine échéance|la tournée} sera annoncé {jeudi|en fin de semaine}.',
  '💬 Le sélectionneur : « {La porte est ouverte à tout le monde|On regarde tous les championnats}. »',
];

const POOLS: Record<string, string[]> = {
  club: CLUB, joueur: JOUEUR, journaliste: JOURNALISTE, media: MEDIA,
  competition: COMPETITION, fan: FAN, hater: HATER, selection: SELECTION,
};

// Ce dont on parle CETTE semaine-là : le fil colle au calendrier.
const CONTEXTE: Record<string, string[]> = {
  championnat: [
    '📅 Journée de {division} ce week-end. {Beaucoup de monde attend {club} au tournant.|Grosse affiche pour {club}.}',
    'On joue {dimanche|samedi}. {Pas le droit à l’erreur.|Match capital.|Faut aller chercher les points.}',
    '🌧️ {Terrain lourd|Pelouse grasse|Vent de face} annoncé. {Ça va être un match de gros.|Les buteurs vont souffrir.}',
    '📻 {Avant-match|Coup d’envoi} à {15h|14h30|18h05}. {On y sera.|Rendez-vous en tribune.}',
    'Le {classement|tableau} après cette journée va faire {du bruit|des dégâts}. {Personne n’est à l’abri.|Tout se resserre.}',
  ],
  coupe: [
    '⭐ Semaine de {Coupe d’Europe|coupe}. {Une autre intensité, un autre monde.|C’est là qu’on voit les vrais.}',
    'Pendant que certains jouent l’Europe, {nous on bosse|d’autres bossent} dans l’ombre. 😉',
    '✈️ {Déplacement européen|Voyage} cette semaine. {Trois heures d’avion pour 80 minutes.|Le genre de semaine qu’on n’oublie pas.}',
    '🎤 « {L’Europe, c’est un autre rugby|On y va sans complexe} » — {le capitaine|le staff} avant le coup d’envoi.',
  ],
  international: [
    '🏳️ {Fenêtre internationale|Tournoi} — {les clubs perdent leurs internationaux|le championnat s’arrête pour certains}.',
    'Ceux qui restent au club {bossent double|ont une carte à jouer}. {C’est maintenant.|Vraiment.}',
    '📺 Tout le monde devant {la télé|l’écran} {samedi|dimanche}. {On oublie les clubs deux heures.|Fierté nationale.}',
    'Le groupe est {tombé|annoncé}. {Des surprises, comme toujours.|Quelques absents notables.}',
  ],
  phaseFinale: [
    '🔥 {Phase finale|Match couperet}. {Tout se joue sur 80 minutes.|Une saison entière dans un match.}',
    'On a bossé onze mois pour {ce moment|ce match}. {Pas de regrets.|On y va.}',
    '🎟️ {Stade plein|Guichets fermés} {samedi|dimanche}. {L’ambiance va être folle.|On va tout donner.}',
    '😰 {La pression|Le stress} monte depuis {trois jours|lundi}. {Vivement le coup d’envoi.|On n’a plus qu’une envie : jouer.}',
  ],
  treve: [
    '🔁 Mercato ouvert. {Ça bouge dans tous les sens.|Les rumeurs partent.}',
    'Intersaison : {reprise dans trois semaines|repos mérité}. {Le corps en avait besoin.|On revient plus fort.}',
    '📝 {Bilan de la saison|Le compte est fait} : {des regrets, mais des bases|beaucoup de positif|il va falloir tout revoir}.',
    '👋 {Merci à ceux qui partent|Départs officialisés}. {Le rugby, c’est aussi ça.|Bonne route à eux.}',
  ],
};

function contexteDe(sem: Semaine): string[] {
  return CONTEXTE[sem.type] ?? CONTEXTE.championnat;
}

// --- LES RÉACTIONS SOUS UN POST -------------------------------------------
//
// Un tweet sans commentaire, ce n'est pas un réseau social. Chaque publication
// du monde reçoit désormais ses réponses — pas seulement les tiennes. Ici c'est
// le repli hors ligne ; avec une clé, `reponsesGroq` écrit du sur-mesure et
// vient les remplacer.

const REACTIONS_POUR = [
  '{Allez|Vamos} ! 💪 {On est derrière vous.|On lâche rien.}',
  '{Enfin|Ça fait plaisir} une bonne nouvelle. 🙌',
  'Franchement {respect|bravo}. {Continuez comme ça.|C’est ça qu’on veut voir.}',
  '{Présent|J’y serai} {dimanche|samedi} ! 🎟️',
  'Ça {sent bon|prend forme} cette saison. 🔥',
  '{Meilleur club du monde|Fier du maillot}, point. 💚',
];
const REACTIONS_CONTRE = [
  '{Mouais|Bof}. {On a déjà entendu ça.|Les paroles c’est bien, les résultats c’est mieux.}',
  '{Arrêtez|Stop} la {com|langue de bois}, {jouez d’abord|gagnez d’abord}. 🤡',
  'Et {le recrutement|la défense}, on en parle ou pas ?',
  '{Scandaleux|Honteux}. {J’ai payé pour voir ça.|Remboursez.}',
  'Le {staff|coach} {devrait dégager|est dépassé}, faut le dire.',
  '{Ratio|C’est non}.',
];
const REACTIONS_NEUTRES = [
  '{Quelqu’un sait|On sait} si c’est diffusé quelque part ?',
  'Bon courage à {tout le groupe|tout le monde}. 🤞',
  '{Info|Vu} ✍️',
  'Ça se joue à quelle heure {déjà|du coup} ?',
  'On verra bien {dimanche|sur le terrain}.',
];

export function reactionsPour(
  post: PostSocial, comptes: CompteSuivi[], combien: number,
): PostSocial[] {
  // ⚠️ Un club officiel ou un championnat ne commente pas « J’y serai dimanche
  // ! 🎟️ » sous le post d'un rival : sous les publications, ce sont des GENS
  // qui parlent. On écarte donc les comptes institutionnels du bassin.
  const gens = comptes.filter((c) => c.type !== 'club' && c.type !== 'competition' && c.type !== 'selection');
  if (!gens.length || combien <= 0) return [];
  const rng = graine('reac#' + post.id);
  const sortie: PostSocial[] = [];
  const vus = new Set<string>([post.pseudo]);
  for (let i = 0; i < combien; i++) {
    let c = gens[Math.floor(rng() * gens.length)];
    for (let essai = 0; essai < 5 && vus.has(c.pseudo); essai++) {
      c = gens[Math.floor(rng() * gens.length)];
    }
    if (vus.has(c.pseudo)) continue;
    vus.add(c.pseudo);
    // Un hater tape presque toujours, un supporter rarement.
    const hostile = c.type === 'hater' ? rng() < 0.8 : rng() < 0.25;
    const pool = hostile ? REACTIONS_CONTRE : rng() < 0.65 ? REACTIONS_POUR : REACTIONS_NEUTRES;
    // Deux fois la même phrase sous le même tweet, ça se voit tout de suite.
    let texte = developper(pool[Math.floor(rng() * pool.length)], rng);
    for (let essai = 0; essai < 6 && sortie.some((r) => r.texte === texte); essai++) {
      texte = developper(pool[Math.floor(rng() * pool.length)], rng);
    }
    if (sortie.some((r) => r.texte === texte)) continue;
    sortie.push({
      id: `${post.id}-r${i}`,
      auteur: c.nom,
      pseudo: c.pseudo,
      avatar: c.avatar,
      certifie: c.certifie,
      type: c.type,
      texte,
      hostile,
      saison: post.saison,
      semaine: post.semaine,
      date: post.date,
      ...statsDepuisVues(post.vues * (0.02 + rng() * 0.09), rng),
    });
  }
  return sortie;
}

// --- LA FOURNÉE DE LA SEMAINE ---------------------------------------------
//
// Déterministe : `filDeLaSemaine(j, comptes, 1, 12)` rendra toujours les mêmes
// 12 publications pour la semaine 1. C'est ce qui permet de recalculer le fil
// à l'affichage sans rien sauvegarder — et d'éviter les doublons.

export function filDeLaSemaine(
  j: Joueur,
  comptes: CompteSuivi[],
  numeroSemaine: number,
  combien = 8,
): PostSocial[] {
  if (!comptes.length) return [];
  const sem = semaine(numeroSemaine);
  const division = competitionDuClub(j.club);
  const posts: PostSocial[] = [];
  const dejaVus = new Set<string>();
  const dejaDits = new Set<string>();
  // Un club rival, pour que « {adverse} » veuille dire quelque chose.
  const rivaux = (division?.clubs ?? []).map((c) => c.nom).filter((n) => n !== j.club);

  for (let k = 0; k < combien; k++) {
    const rng = graine(`fil#${j.saison}#${numeroSemaine}#${k}#${j.club}`);
    // Un compte différent à chaque fois tant que c'est possible.
    let compte = comptes[Math.floor(rng() * comptes.length)];
    for (let essai = 0; essai < 6 && dejaVus.has(compte.pseudo); essai++) {
      compte = comptes[Math.floor(rng() * comptes.length)];
    }
    dejaVus.add(compte.pseudo);

    // Une publication sur quatre parle de l'actualité de la semaine.
    const pool = rng() < 0.25 ? contexteDe(sem) : POOLS[compte.type] ?? JOUEUR;
    // ⚠️ Le décalage par semaine fait TOURNER les gabarits : sans lui, un même
    // compte retombait sur la même phrase de saison en saison.
    const gabarit = pool[(Math.floor(rng() * pool.length) + numeroSemaine + k) % pool.length];
    // ⚠️ Les variables sont substituées AVANT les alternatives : un `{adverse}`
    // niché dans un `{a|b}` cassait sinon la reconnaissance de l'alternative,
    // et le gabarit brut se retrouvait affiché tel quel dans le fil.
    const remplir = (g: string) => developper(
      g
        .replace(/\{club\}/g, compte.club ?? j.club)
        .replace(/\{division\}/g, division?.nom ?? 'le championnat')
        .replace(/\{adverse\}/g, rivaux.length ? rivaux[Math.floor(rng() * rivaux.length)] : 'l’adversaire')
        .replace(/\{moi\}/g, j.nom),
      rng,
    );
    // Deux fois la même phrase dans la même fournée, ça se voit : on retire.
    let texte = remplir(gabarit);
    for (let essai = 0; essai < 5 && dejaDits.has(texte); essai++) {
      texte = remplir(pool[Math.floor(rng() * pool.length)]);
    }
    dejaDits.add(texte);

    const post: PostSocial = {
      id: `sem-${j.saison}-${numeroSemaine}-${k}`,
      auteur: compte.nom,
      pseudo: compte.pseudo,
      avatar: compte.avatar,
      certifie: compte.certifie,
      type: compte.type,
      texte,
      saison: j.saison,
      semaine: numeroSemaine,
      date: libelleDate(sem),
      ...statsDePost(audienceDe(compte.type, compte.abonnes), rng),
    };
    // Chaque publication a ses commentaires : plus le compte est suivi, plus il
    // y en a. Un post de club en récolte 4, un supporter anonyme parfois aucun.
    const nb = post.vues > 40_000 ? 4 : post.vues > 8000 ? 3 : post.vues > 1500 ? 2 : rng() < 0.5 ? 1 : 0;
    post.reponses = reactionsPour(post, comptes, nb);
    posts.push(post);
  }
  return posts;
}

// Un compte t'écrit de lui-même : plus la relation est marquée (dans un sens
// comme dans l'autre), plus il a de raisons de le faire. Déclenché une fois par
// semaine jouée, jamais en pleine lecture.
const AMORCES: Record<string, string[]> = {
  ami: [
    'Salut ! Tu fais quoi cette semaine ? On se cale une séance vidéo ensemble ?',
    'Je viens de voir ton dernier match, t’étais énorme. Continue comme ça. 💪',
    'Franchement le vestiaire parle bien de toi en ce moment. Profite.',
  ],
  cordial: [
    'Salut, ça va ? Bien remis du week-end ?',
    'Hey, on m’a parlé de toi en bien. Content de te suivre.',
  ],
  neutre: [
    'Salut, on ne se connaît pas vraiment mais je suis ton parcours. Bon courage.',
    'Bonjour, une petite question rapide : tu prolonges avec ton club ?',
  ],
  froid: [
    'Bon. On va pas se mentir, y’a un froid. Tu comptes faire quelque chose ?',
  ],
  ennemi: [
    'Continue de parler dans les médias, tu vas voir ce que ça donne dimanche.',
    'T’as toujours pas compris à qui tu parlais visiblement.',
  ],
};

export function messageSpontane(relation: number, cleUnique: string): string {
  const rng = graine('amorce#' + cleUnique);
  const pool = AMORCES[humeur(relation)] ?? AMORCES.neutre;
  return pool[Math.floor(rng() * pool.length)];
}

// ---------------------------------------------------------------------------
// LES COÉQUIPIERS PROPOSENT DES CHOSES
// ---------------------------------------------------------------------------
// Demande explicite : « fais aussi que les coéquipiers ou autres joueurs
// peuvent envoyer des messages pour faire des activités ». Un vestiaire, ce
// n'est pas que des matchs — c'est un barbecue le lundi, une séance vidéo en
// plus, un padel le mardi, une virée à la salle avec le costaud du groupe.
export const INVITATIONS = [
  'Salut ! On fait un barbecue chez moi {quand}, tout le groupe vient. Tu passes ?',
  'Séance vidéo en plus {quand} avec le coach des lignes arrière. Je te réserve une place ?',
  'Padel {quand} avec deux ou trois gars du vestiaire. T’es chaud ?',
  'Je vais à la salle {quand}, séance haut du corps. Tu viens avec moi ?',
  'On se fait un restaurant {quand} avec les anciens. Tu manques jamais ça normalement.',
  'Le club organise une visite à l’hôpital des enfants {quand}. Ça fait du bien, viens.',
  'Tu veux qu’on bosse tes touches {quand} avant l’entraînement collectif ?',
  'Sortie vélo {quand} pour récupérer. Rythme tranquille, promis.',
  'Je passe voir le match des jeunes du club {quand}. Ils seraient contents de te voir.',
  'On mange ensemble {quand} ? J’ai deux ou trois trucs à te dire sur le jeu au pied.',
  'Le kiné a une place libre {quand}. Je te la laisse, t’en as plus besoin que moi.',
  'Petit tournoi de belote au club-house {quand}. Tu joues ou t’as peur ?',
];

export const QUAND = ['lundi', 'mardi soir', 'mercredi', 'jeudi midi', 'ce week-end', 'après l’entraînement'];

// Un coéquipier t'écrit pour proposer quelque chose. Déterministe.
export function invitationCoequipier(cleUnique: string): string {
  const rng = graine('invit#' + cleUnique);
  const texte = INVITATIONS[Math.floor(rng() * INVITATIONS.length)];
  return texte.split('{quand}').join(QUAND[Math.floor(rng() * QUAND.length)]);
}
