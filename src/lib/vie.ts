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
const AGRESSIF = /(?:\b(nul|nuls|merde|conn?ard|conn?asse|encul|batard|bâtard|ferme|ta gueule|tg|salope|abruti|débile|debile|clown|clochard|bouffon|dégage|degage|pourri|tocard|guignol|honte|ridicule|idiot|moron|trash|useless|asshole|fuck|shit|payaso|basura|inútil|pagliaccio|scarso|stronzo|nutzlos|arschloch|palhaço|otário)\w*|馬鹿|バカ|アホ|黙れ|クソ|雑魚)/i;
const CHALEUREUX = /\b(merci|bravo|respect|felicitation|félicitation|content|hâte|hate|fier|force|courage|super|génial|genial|top|frère|frere|bisous|✊|💪|🤝|❤️|👏)/i;

export function tonDuMessage(texte: string): 'agressif' | 'chaleureux' | 'neutre' {
  if (AGRESSIF.test(texte)) return 'agressif';
  if (CHALEUREUX.test(texte)) return 'chaleureux';
  return 'neutre';
}

// Comment un message fait bouger la relation.
export function effetSurRelation(texte: string, relation: number): number {
  const ton = tonDuMessage(texte);
  if (ton === 'agressif') return Math.max(-100, relation - 32);
  if (ton === 'chaleureux') return Math.min(100, relation + 8);
  return Math.min(100, relation + 2); // parler, c'est déjà tisser un lien
}

// --- RÉPONSES HORS LIGNE, SELON L'HUMEUR ----------------------------------
const RIPOSTES = [
  'Ferme-la un peu : ton palmarès tient dans une bio X.',
  'Tu me parles comme ça alors que t’as fait quoi cette saison, exactement ?',
  'Va t’entraîner, bouffon. Tes posts ont plus de rythme que ton rugby.',
  'Tu te grilles tout seul et tu crois encore avoir gagné la discussion. Quel clown.',
  'T’as vraiment écrit ça avec ton bilan ? La honte.',
  'Continue, champion. Chaque message explique un peu mieux pourquoi tu chauffes le banc.',
  'Tu ne m’atteins pas, tu rappelles juste à tout le monde que t’es nul.',
  'Y’a des joueurs qui bossent, et y’a toi qui fais du bruit.',
  'Capture faite. Ton club va adorer, abruti.',
  'Compare nos palmarès avant d’ouvrir ta bouche, ça t’évitera le ridicule.',
  'T’es hors sujet, hors niveau et bientôt hors du groupe.',
  'Tu parles comme une star avec les stats d’un remplaçant.',
  'Même ta meilleure punchline est plus faible que ton dernier match.',
  'Le terrain te donne tort chaque week-end, ça devrait suffire.',
  'Garde cette énergie pour gagner une place, clown.',
  'Tu veux du respect ? Commence par arrêter de jouer comme un fantôme.',
];
const FROIDES = [
  'Je préfère qu’on en reste là.',
  'Ouais. Bref.',
  'On n’a pas grand-chose à se dire je crois.',
  'Écoute, j’ai une semaine chargée. On verra plus tard.',
  'Reçu.',
  'Je vais pas m’étendre.',
  'D’accord. Bonne journée.',
  'Franchement, je vois pas où tu veux en venir.',
];
const CORDIALES = [
  'Ça marche, on se capte à l’entraînement. 👊',
  'Toujours un plaisir. Bon courage pour le week-end.',
  'Merci pour le message, ça fait plaisir.',
  'Sympa d’avoir pris le temps d’écrire, vraiment.',
  'On se croise dimanche ? Passe me voir après le match.',
  'Ça va, et toi ? La reprise se passe bien ?',
  'Nickel. Je note et je te tiens au courant. 👍',
  'C’est gentil. Ce genre de message, ça aide plus qu’on croit.',
  'Bien reçu, merci. On en reparle vite.',
];
const AMICALES = [
  'Toujours là frérot 🤝 Tu sais que je te suis.',
  'Ahah t’es un grand malade. On mange ensemble cette semaine ?',
  'Je t’ai dit, je te suis les yeux fermés. On va tout casser.',
  'Mon gars 😂 Tu me fais toujours rire, change rien.',
  'Franchement heureux pour toi. Sincèrement. ❤️',
  'On se fait une séance vidéo ensemble ? J’ai deux trois trucs à te montrer.',
  'Je t’ai vu dimanche, énorme. Continue comme ça. 💪',
  'Tu passes à la maison ce week-end ? Ma femme fait à manger.',
  'Rappelle-moi quand t’as cinq minutes, faut que je te raconte un truc. 😂',
];

// Un club ou un championnat ne répond pas comme un joueur chambré : il reste
// institutionnel, même quand on l'insulte. C'est plus glaçant, d'ailleurs.
const INSTITUTIONNELLES = [
  'Votre message a été transmis au service juridique du club. Bonne journée.',
  'Nous vous invitons à relire la charte de bonne conduite des licenciés.',
  'Ce type de message est archivé. Nous en resterons là.',
  'Le club rappelle que la parole des joueurs engage l’institution.',
  'Votre demande a bien été enregistrée sous la référence CL-2481.',
  'Nous ne donnerons pas suite à ce message.',
  'La commission de discipline a été informée. Cordialement.',
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
  '✍️ {Prolongation|Bonne nouvelle}, un de nos {jeunes|cadres} {prolonge|reste} {deux|trois} saisons de plus. {Formé au club.|Il ne voulait pas partir.}',
  '🚌 Départ pour {le déplacement|l’extérieur} {ce matin|à l’aube}. {Longue route, gros défi.|On y va pour gagner.}',
  '🏉 {Fin de match|Coup de sifflet final} à {adverse}. {On prend le point de bonus.|Rien à ramener.|On s’accroche jusqu’au bout.}',
  '📣 Le président : « {Le club est serein|On assume nos choix|Les résultats viendront}. {Le projet est à trois ans.|Il faut de la patience.} »',
  '🎂 {Joyeux anniversaire|Bon anniversaire} à {l’un des nôtres|un cadre du groupe} ! {Toute la famille du club te souhaite le meilleur.|Belle journée à toi.}',
  '🏫 {Nos éducateurs|L’école de rugby} étaient {dans les écoles|au collège} {cette semaine|hier}. {200 gamins initiés.|La relève est là.}',
  '🛠️ {Travaux|Réfection} {en tribune|sur la pelouse} cette semaine. {Merci de votre patience.|Tout sera prêt pour dimanche.}',
  '🥇 {Trois|Deux|Quatre} de nos joueurs {retenus|convoqués} {en sélection|avec les jeunes}. {Fierté.|Bravo à eux.}',
  '📺 {Le match|La rencontre} sera {diffusée|retransmise} {sur la chaîne du club|en direct}. {À {15h|18h05}.|Coup d’envoi à 14h30.}',
  '🤝 {Nouveau partenaire|Signature} {au club|dans la famille}. {Bienvenue à eux.|Un soutien de plus.}',
  '😔 {Défaite|Revers} {qui fait mal|difficile à avaler}. {On se reverra.|On travaille dès lundi.}',
  '🔥 {QUELLE|SUPERBE} {VICTOIRE|SOIRÉE} ! {Merci à tous.|Le stade a poussé jusqu’au bout.} 💚',
  '📷 {Les coulisses|L’envers du décor} du {vestiaire|match} sont {en ligne|à découvrir}.',
  '🧵 {Retour|Zoom} sur {la semaine|l’entraînement} : {mêlée, touche, et beaucoup de vidéo.|beaucoup de conquête.}',
  '⚕️ {Bonne nouvelle|Bon retour} : {un cadre|un titulaire} {reprend la course|est de retour à l’entraînement}.',
  '🚑 {Mauvaise|Triste} nouvelle : {opération réussie|intervention} {pour l’un des nôtres|hier}. {Bon rétablissement.|On est avec toi.}',
  '👏 {Merci|Bravo} aux {bénévoles|volontaires} {du week-end|de tous les dimanches}. {Sans eux, rien n’existe.|Le club, c’est eux.}',
  '🏉 {Nos féminines|L’équipe féminine} {s’imposent|l’emportent} {dimanche|ce week-end}. {Bravo à elles !|Quelle performance.}',
  '📊 {Chiffres|Statistiques} du match : {88 % de plaquages réussis|12 turnovers gagnés|6 essais inscrits}. {On regarde devant.|On corrige le reste.}',
  '🎙️ {Réaction|Interview} d’après-match {à écouter|en ligne} : « {On a manqué de patience|Le résultat compte, le contenu aussi} ».',
  '⚖️ {Commission de discipline|Décision} : {un de nos joueurs suspendu|appel déposé}. {Le club prend acte.|Nous ne commenterons pas.}',
  '🗺️ {Déplacement|Voyage} des supporters {organisé|en bus} {dimanche|le week-end prochain}. {Inscriptions au club-house.|Il reste des places.}',
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
  '{Réveil|Debout} à {5h30|6h}, {glace|bain froid}, {route|kiné}, {séance|muscu}. {La vie de rêve qu’on imagine. 😴|On adore vraiment.}',
  '{Les jeunes|Les nouveaux} du groupe {sont impressionnants|poussent fort}. {Ça pique en interne.|Tant mieux, ça tire tout le monde.}',
  'Petite pensée pour {ma famille|mes parents} qui {font 400 bornes|traversent la France} {chaque week-end|pour me voir jouer}. ❤️',
  'On a {revu la vidéo|analysé} {trois fois|en boucle}. {Y’a du boulot.|On sait quoi faire.}',
  '{Le troisième|Le deuxième} {mi-temps|repas} {du dimanche|d’après-match}, {c’est sacré|personne n’y touche}. 🍽️',
  'Je {lis tout|vois tout} {ce qui se dit|ce que vous écrivez}. {Vraiment tout.|Même les trucs pas sympas.} 👀',
  '{Objectif|But} de la semaine : {ne pas rater un plaquage|gagner mes duels}. {Simple.|Basique.}',
  '{Mon kiné|Le doc} me déteste, {je crois|j’en suis sûr}. 😅',
  'Quand {le stade|la tribune} {chante|pousse} {comme ça|à ce point}, {t’as plus mal nulle part|tu cours deux fois plus vite}.',
  '{Grosse|Dure} semaine de {reprise|préparation}. {Les cuisses parlent.|Je marche en canard.} 🦆',
  '{Fier|Heureux} de {porter ce maillot|représenter ce club}. {Vraiment.|Ça n’a pas de prix.}',
  'On m’a dit {que j’étais trop petit|que je n’y arriverais pas} {à 16 ans|au centre de formation}. {Bref.|Voilà.} 😌',
  '{Le rugby|Ce sport} c’est {des hauts et des bas|jamais linéaire}. {Là, c’est un bas.|Là, on savoure.}',
  '{Deux heures|Une heure} de {touches|passes} {en plus|après la séance} {avec le talonneur|avec l’ouvreur}. {Ça paiera.|On verra dimanche.}',
  '{Repos|Off} {aujourd’hui|ce lundi}. {Canapé, série, rien.|Je bouge pas.} 🛋️',
  '{Bienvenue|Bon courage} {au petit nouveau|aux recrues}, {le vestiaire est chaud|on va bien s’occuper de lui}. 😈',
  '{Anniversaire|Fête} {d’un coéquipier|dans le groupe} : {gâteau|chants} {imposés|obligatoires}. {Tradition.|On ne discute pas.} 🎂',
  'Les {gars|potes} qui {m’écrivent|me soutiennent} {depuis le début|depuis la Fédérale}, {je les oublie pas|vous êtes là}. 🤝',
  '{Le plus dur|Le vrai boulot} c’est {la semaine|entre les matchs}, {pas dimanche|pas devant les caméras}.',
  '{Franchement|Sincèrement} {merci|respect} aux {arbitres|éducateurs} {amateurs|bénévoles}. {Sans eux, rien.|On oublie trop souvent.}',
  '{Je crois|J’ai l’impression} qu’on {tient quelque chose|construit un truc} {cette année|dans ce groupe}.',
  '{Trois|Deux} {semaines|matchs} sans {marquer|toucher un ballon}, {ça travaille la tête|c’est long}. {On reste sur le boulot.|Ça va revenir.}',
];

const JOURNALISTE = [
  '🔴 Info : {Réunion au sommet|Discussion tendue|Point d’étape} ce soir entre la direction de {club} et son staff. {Rien n’a filtré.|Ambiance décrite comme lourde.}',
  'Selon nos informations, {plusieurs clubs|deux clubs|un club} de {division} se penchent sur un joueur de {club}.',
  '{Ambiance lourde|Séance écourtée|Tension palpable} à l’entraînement de {club} {ce matin|hier}. À suivre.',
  'On me dit que le vestiaire n’a pas apprécié {la sortie médiatique|le communiqué} de la semaine.',
  '📌 Ce que j’entends sur {club} : {le staff sera jugé sur les six prochains matchs|la cellule recrutement est déjà au travail}.',
  '{Confirmé|On peut le dire} : {club} a bien pris {contact|des renseignements} pour un {pilier|ouvreur|ailier}. Dossier {loin d’être bouclé|bien avancé}.',
  'Personne n’en parle mais {moi} fait {une saison très solide|des choses intéressantes} en {division}. {Ça se saura.|À suivre de près.}',
  '🧵 {Enquête|Dossier} : {les finances|le modèle économique} de {club} : {ce qu’on sait|les chiffres que j’ai pu consulter}.',
  'On me confirme {deux départs|un départ majeur} à {club} {en fin de saison|cet été}. {Noms à venir.|Rien d’officiel pour l’instant.}',
  '{Le staff|Le manager} de {club} {sera fixé|jouera son avenir} {après la trêve|sur les cinq prochains matchs}.',
  '{Petite|Grosse} info : {un international|un joueur libre} {s’est entraîné|a visité les installations} à {club} {cette semaine|hier}.',
  'Ce que {personne ne dit|j’entends} sur {division} : {les budgets s’envolent|l’écart se creuse}. {Ça va casser.|Un jour ou l’autre.}',
  '🎙️ Mon {entretien|portrait} avec {moi} {est en ligne|paraît demain}. {Un joueur qui parle vrai.|Il ne s’est rien interdit.}',
  '{Rumeur|Bruit} de couloir : {un dossier chaud|une piste} entre {club} et un club de {division}. {Prudence.|À confirmer.}',
  '{Ce week-end|Dimanche}, {le match à ne pas rater|l’affiche} : {club} reçoit {adverse}. {J’y serai.|Je vous raconterai.}',
  '{Formation|Centre de formation} : {club} {sort|a sorti} {trois|quatre} joueurs {du cru|du club} cette saison. {C’est rare.|Ça mérite d’être dit.}',
  '{Discipline|Commission} : {un dossier|deux dossiers} {en cours|à l’étude} du côté de {club}. {Décision jeudi.|On saura vite.}',
  '{Attention|À noter} : {la billetterie|le guichet} de {club} {est déjà à sec|part très vite}. {Le club revit.|Ça faisait longtemps.}',
];

const MEDIA = [
  '📊 {division} : {le classement|les chiffres} après cette journée. {Ça se resserre sérieusement.|Le haut de tableau se dessine.}',
  '🎥 {Le résumé|Les temps forts} de la journée : {un essai qui va tourner en boucle|une fin de match irrespirable}.',
  '🚨 Le marché des transferts s’emballe. {Trois|Deux|Quatre} dossiers pourraient tomber {cette semaine|d’ici dimanche}.',
  '⭐ Notre équipe type de la journée. {Un joueur de {club} y figure.|Trois clubs sur-représentés.}',
  '💰 {Enquête|Dossier}, combien pèsent vraiment les budgets de {division} ? {Les écarts font peur.|Du simple au quintuple.}',
  '🎙️ Interview à lire : « {On sous-estime le niveau de la {division}|Le rugby amateur tient le pays debout} ».',
  '📈 {Les chiffres|Le bilan} de la journée : {5,4 essais par match|43 points de moyenne}. {Le rugby n’a jamais été aussi ouvert.|On marque de partout.}',
  '🏥 {Le point blessures|Infirmerie} de {division} : {douze|neuf} joueurs {absents|sur le flanc} {ce week-end|cette semaine}.',
  '🔍 {Zoom|Analyse} : {pourquoi la touche|comment la mêlée} {décide|fait basculer} {tant de matchs|les fins de rencontre}.',
  '🎬 {À revoir|Rediffusion} : {l’essai de la journée|le geste du week-end}. {On ne s’en lasse pas.|Chef-d’œuvre.}',
  '📚 {Portrait|Rencontre} : {le joueur dont tout le monde parle|celui qu’on n’attendait pas}, {à lire ici|dans nos colonnes}.',
  '🧢 {Les jeunes|La nouvelle génération} de {division} : {les dix noms à retenir|notre sélection}.',
  '⚖️ {Arbitrage|Règlement} : {ce qui change|les nouvelles consignes} {cette saison|à partir de janvier}.',
  '🗓️ {Calendrier|Programme} : {la trêve|la reprise} {tombe le {week-end du 20|premier week-end de janvier}|dans quinze jours}.',
  '🌍 {Coupes d’Europe|International} : {les clubs français|nos représentants} {ont rendez-vous|jouent gros} {ce week-end|dès vendredi}.',
  '💬 {La phrase|Le mot} de la semaine : « {On ne gagne pas avec du talent seulement|Le rugby ne pardonne rien} ».',
];

const COMPETITION = [
  '🏆 Le programme complet de {la prochaine journée|la semaine} est disponible.',
  '⭐ Équipe type de la journée : découvrez les 15 joueurs retenus.',
  '📈 {Affluence record|Audience en hausse} ce week-end. {Le rugby n’a jamais autant attiré.|Merci à tous.}',
  '⚖️ Décisions de la commission de discipline : {deux|trois} matchs de suspension prononcés.',
  '🗓️ {Calendrier|Programmation}, les horaires de la prochaine journée viennent d’être publiés.',
  '🎫 {Affluence|Fréquentation} : {plus de 200 000|180 000} spectateurs {ce week-end|sur la journée}. {Record battu.|Merci à tous.}',
  '🏆 {Le trophée|La coupe} {sera exposé|part en tournée} {dans les clubs amateurs|à la rencontre des écoles de rugby}.',
  '👶 {Journée|Opération} {école de rugby|jeunes} {ce week-end|dimanche} : {entrée gratuite pour les moins de 12 ans|les licenciés entrent libres}.',
  '📋 {Désignations|Arbitres} de la prochaine journée {publiées|en ligne}.',
  '💚 {Fair-play|Respect} : {le geste|l’attitude} de la journée {à revoir ici|est à saluer}.',
  '🔁 {Modification|Report} : {un match est décalé|une rencontre change d’horaire}. {Détails en ligne.|Merci de votre compréhension.}',
];

const FAN = [
  'Franchement {club} cette saison, c’est {un scandale|une catastrophe|du grand n’importe quoi}. On mérite mieux. 😤',
  'J’ai payé {25|30|18} balles pour voir ça. {Je veux mon argent.|Plus jamais.}',
  'ALLEZ {club} 💚 On lâche rien, {jamais|jusqu’au bout}.',
  'Le mec qui critique depuis son canapé et qui a jamais mis un plaquage de sa vie. 🤡',
  '{Arbitrage|L’arbitre} encore {scandaleux|à sens unique} aujourd’hui. {On nous vole.|Ça devient insupportable.}',
  'Mon fils de {6|8|10} ans a demandé le maillot de {moi} pour Noël. {Voilà où on en est.|Fierté.} 🥹',
  'Sérieusement, {qui a validé cette compo|à quoi joue le staff} ? {Je comprends pas.|Expliquez-moi.}',
  '{45|38|52} ans d’abonnement et {jamais vu ça|toujours là}. {On mourra en {club}.|C’est plus fort que moi.}',
  '{Debout à 5h|Parti à l’aube} pour {600|450} bornes {aller-retour|de route}. {Et je recommencerai.|Aucun regret.} 🚗',
  'Ma femme {ne comprend pas|dit que c’est une maladie}. {Elle a raison.|Elle n’a pas tort.} 😅',
  'Le {pâté|casse-croûte} de la buvette {vaut le déplacement|à lui seul}. {Je le dis.|Vérité.} 🥖',
  '{L’ambiance|Le stade} {était incroyable|a poussé} {hier|dimanche}. {Merci les gars.|Frissons.} 🔊',
  '{Faut arrêter|On peut arrêter} de {taper sur les jeunes|critiquer les jeunes}. {Ils font ce qu’ils peuvent.|Ils ont 19 ans.}',
  '{Quand j’étais gamin|Dans les années 90}, {on jouait sur un terrain en pente|le vestiaire c’était une cabane}. {Bon souvenir.|Vraie époque.}',
  'Mon {grand-père|père} m’a {emmené ici|abonné} {en 1987|à 6 ans}. {Voilà.|Tout est dit.} ❤️',
  '{J’ai crié|On a hurlé} {tout le match|pendant 80 minutes}, {plus de voix|extinction de voix} {ce matin|au boulot}. 🗣️',
  'Ils {peuvent perdre|peuvent tout perdre}, {je serai là|je viendrai quand même}. {Toujours.|C’est comme ça.}',
  '{Sincèrement|Franchement}, {qui parie sur nous|personne ne nous attend} ? {Tant mieux.|C’est notre force.}',
  '{Le maillot extérieur|La nouvelle tunique} {est splendide|est une horreur}. {Je le prends.|Je passe mon tour.} 👕',
  '{Trois|Deux} générations {dans la même tribune|dans la voiture} {ce dimanche|hier}. {C’est ça, le rugby.|Voilà pourquoi on vient.}',
  '{Ma fille|Mon fils} vient de {prendre sa licence|s’inscrire à l’école de rugby}. {Fier.|Le début d’une longue histoire.} 🥹',
];

const HATER = [
  'Objectivement, {moi} n’a pas le niveau. {On peut le dire calmement.|Point.}',
  'Le rugby c’était mieux avant, et {club} en est la preuve vivante.',
  'Vous allez voir qu’ils vont encore {perdre|se saborder}. Comme d’habitude.',
  '{moi} qui fait des stories à la salle mais qui est {sur le banc|en tribune} le dimanche. 😂',
  'On m’explique pourquoi {moi} est {titulaire|dans le groupe} ? {Je pose la question.|Non parce que là…}',
  '{Les chiffres|Les statistiques} de {moi} {sont truquées|ne veulent rien dire}, {regardez les minutes|regardez le contexte}.',
  'Moi {j’analyse|je regarde} {froidement|objectivement} : {c’est faible|ça ne tient pas}. {Désolé.|C’est comme ça.}',
  '{Encore|Toujours} {un joueur surcoté|de la surcote} {en {division}|dans ce championnat}.',
  '{Vous verrez|Rappelez-vous de moi} {dans six mois|en fin de saison}. {Je note tout.|J’aurai raison.}',
  'Le {niveau|championnat} {baisse|s’effondre} {chaque année|d’année en année}, {et personne ne le dit|silence général}.',
  '{Le vrai problème|Ce que personne ne veut voir}, c’est {le manque de travail|l’absence d’exigence}. {Point.|Fin du débat.}',
  '{Bravo|Chapeau} pour {la story à la salle|la photo de muscu}. {Et sur le terrain ?|Et dimanche ?} 🙃',
  'On m’a bloqué {pour avoir dit la vérité|parce que je dérange}. {Ça en dit long.|Continuez.}',
  '{J’ai joué|Je jouais} {en Fédérale|au niveau régional}, {donc je sais de quoi je parle|donc si, j’ai le droit}.',
  '{Zéro|Aucun} {leader|patron} dans cette équipe. {Voilà le fond du problème.|C’est tout.}',
];

const SELECTION = [
  '🏳️ Le groupe pour {la prochaine échéance|la tournée} sera annoncé {jeudi|en fin de semaine}.',
  '💬 Le sélectionneur : « {La porte est ouverte à tout le monde|On regarde tous les championnats}. »',
  '🏳️ {Rassemblement|Mise au vert} {lundi|dès dimanche soir} à {Marcoussis|au centre national}. {31 joueurs convoqués.|Groupe élargi.}',
  '🩺 {Forfait|Coup dur} : {un cadre|un titulaire} {déclare forfait|quitte le groupe}. {Il est remplacé.|Un jeune est appelé.}',
  '🎂 {Première|Première convocation} pour {un joueur de {division}|un espoir}. {Belle histoire.|Le travail paie.}',
  '📣 {Billetterie|Places} {ouvertes|en vente} pour {le prochain test|la tournée d’automne}.',
  '🏆 {Objectif affiché|Ambition} : {le Grand Chelem|le titre}. {On ne s’en cache pas.|Rien de moins.}',
  '💬 Le capitaine : « {Porter ce maillot ne se négocie pas|On joue pour ceux qui nous regardent}. »',
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
    '🎤 « {L’Europe, c’est un autre rugby|On y va sans complexe} » : {le capitaine|le staff} avant le coup d’envoi.',
  ],
  international: [
    '🏳️ {Fenêtre internationale|Tournoi} : {les clubs perdent leurs internationaux|le championnat s’arrête pour certains}.',
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
// le repli hors ligne ; avec l'IA locale, `reponsesIA` écrit du sur-mesure et
// vient les remplacer.

// ⚠️ LE POOL A ÉTÉ MULTIPLIÉ PAR CINQ (demande explicite : « rajoute une énorme
// base de texte »). Avec six gabarits par famille et jusqu'à douze commentaires
// sous un post, on lisait deux fois la même phrase à l'écran. Ici : une
// trentaine de gabarits par famille, chacun à deux ou trois alternatives — soit
// plusieurs centaines de phrases distinctes, et un fil qui ne se répète pas.
const REACTIONS_POUR = [
  '{Allez|Vamos} ! 💪 {On est derrière vous.|On lâche rien.}',
  '{Enfin|Ça fait plaisir} une bonne nouvelle. 🙌',
  'Franchement {respect|bravo}. {Continuez comme ça.|C’est ça qu’on veut voir.}',
  '{Présent|J’y serai} {dimanche|samedi} ! 🎟️',
  'Ça {sent bon|prend forme} cette saison. 🔥',
  '{Meilleur club du monde|Fier du maillot}, point. 💚',
  '{Voilà|Ça}, c’est du rugby. {Rien à ajouter.|Le reste, c’est du bruit.}',
  'Je {le dis depuis le début|l’avais dit} : {ce groupe a quelque chose|il y a un truc à faire cette année}.',
  'Mon {fils|neveu|filleul} va être {fou|content}. {Il ne parle que de ça.|Merci pour lui.}',
  '{Grosse|Belle} mentalité. {C’est ça qu’on veut voir.|Ça change tout.}',
  '{Chapeau|Bravo} pour {le boulot de l’ombre|tout ce qu’on ne voit pas}. 🙏',
  'On {en a bavé|a douté}, mais {on est toujours là|on ne lâche rien}. 💚',
  '{Abonnement repris|Place réservée} {sans hésiter|les yeux fermés}.',
  '{Le club|Ce club} mérite {mieux que ce qu’on lit|plus de respect}. Franchement.',
  '{Ambiance de folie|Stade en fusion} {dimanche|ce week-end}, je le sens. 🔊',
  'Ceux qui {râlaient|critiquaient} {le mois dernier|en septembre}, on vous entend plus. 😌',
  '{Bien joué|Beau geste}. {Ça se remarque.|On note.}',
  'Voilà pourquoi {j’aime ce sport|on aime ce club}. {Simple.|Point final.}',
  '{Merci|Un grand merci} pour {la fierté|les émotions}. {Vraiment.|Sincèrement.}',
  'Ça faisait {longtemps|des années} qu’on n’avait pas vu ça {ici|au club}.',
  '{Le plus dur|La suite} commence maintenant. {On y croit.|Un match à la fois.}',
  'Je {prends ma carte|renouvelle} {cette semaine|demain}. 🎫',
  '{Costaud|Solide}. {On construit.|Il y a une base.}',
  'La {tribune|buvette} va {chanter|trembler} {dimanche|samedi}. 🍺',
  'Franchement {ça fait plaisir|c’est mérité}, {après tout ce qu’on a pris|vu la saison}.',
  '{Génération|Groupe} {attachante|attachant}, {rien à dire|c’est tout}.',
  'Y’a {du cœur|de l’envie} là-dedans. {Ça se voit.|C’est le principal.}',
  '{On y croit|On y va} {tous ensemble|jusqu’au bout}. 🤝',
  '{Superbe|Excellente} nouvelle {pour le club|pour la région}. 👏',
  'Bon bah {plus qu’à|allez}, {on gagne dimanche|on confirme}. 😉',
];
const REACTIONS_CONTRE = [
  '{Mouais|Bof}. {On a déjà entendu ça.|Les paroles c’est bien, les résultats c’est mieux.}',
  '{Arrêtez|Stop} la {com|langue de bois}, {jouez d’abord|gagnez d’abord}. 🤡',
  'Et {le recrutement|la défense}, on en parle ou pas ?',
  '{Scandaleux|Honteux}. {J’ai payé pour voir ça.|Remboursez.}',
  'Le {staff|coach} {devrait dégager|est dépassé}, faut le dire.',
  '{Ratio|C’est non}.',
  '{Ça fait trois ans|Chaque année} qu’on nous {sort ça|raconte la même chose}.',
  '{Le budget|L’argent} part {où|dans quoi} exactement ? {Question sérieuse.|Je demande.}',
  'On {est derniers|galère} et {vous communiquez|on fait des stories}. {Bravo.|Génial.}',
  '{La touche|La mêlée|La défense} {est une catastrophe|ne tient pas} et {personne n’en parle|on regarde ailleurs}.',
  'Moi je {dis ça|note}, mais {le classement parle|les chiffres sont là}.',
  '{Franchement|Sérieusement}, {y’a plus d’ambition|on joue pour quoi} ?',
  '{Encore|Toujours} {des excuses|les mêmes discours}. {Ça suffit.|On s’en lasse.}',
  'Le {président|club} {ferait mieux de se taire|devrait s’expliquer}. {C’est mon avis.|Point.}',
  'Quand {on voit le prix des places|on paye 30 balles}, {c’est une insulte|c’est du vol}.',
  'Ils {sont où|font quoi} les {leaders|cadres} dans ces moments-là ?',
  '{Zéro|Aucune} {intensité|envie} {depuis septembre|depuis le début}. 🥱',
  'On me {parle de projet|dit patience} depuis {quatre|cinq} ans. {Le projet, c’est quoi ?|Concrètement ?}',
  '{Nul|Faible}, et {tout le monde le pense|personne n’ose le dire}.',
  '{Ça|Le niveau} baisse {chaque saison|d’année en année}, {faut le dire|assumons}.',
  'Le {marketing|service com} tourne mieux que {l’équipe|le pack}. 😂',
  'Vous {allez encore|allez sûrement} {perdre|craquer} {en fin de match|dans le money time}.',
  '{Vraiment|Sincèrement} {déçu|dégoûté}. {Je décroche.|J’arrête de suivre.}',
  '{Discours|Communiqué} de {façade|circonstance}. {Rien de neuf.|On connaît.}',
  'On {recrute mal|se trompe} depuis {trois ans|des années} et {ça se voit|voilà le résultat}.',
  '{Deux|Trois} matchs et {on parlera|on jugera}. {Pas avant.|D’ici là, silence.}',
  'Le pire c’est que {certains y croient encore|des gens likent}. 🤦',
  'Y’a {plus d’âme|zéro identité de jeu} dans cette équipe.',
  '{Bon courage|Bonne chance} aux {abonnés|supporters}, {vraiment|sincèrement}.',
  '{Aucun|Pas un} {cadre|leader} n’assume {publiquement|devant les caméras}.',
];
const REACTIONS_NEUTRES = [
  '{Quelqu’un sait|On sait} si c’est diffusé quelque part ?',
  'Bon courage à {tout le groupe|tout le monde}. 🤞',
  '{Info|Vu} ✍️',
  'Ça se joue à quelle heure {déjà|du coup} ?',
  'On verra bien {dimanche|sur le terrain}.',
  '{Quelqu’un|Y’a quelqu’un qui} y va {en voiture|en bus} ? {Je cherche une place.|Covoiturage ?}',
  '{Le groupe|La compo} est {sortie|annoncée} ?',
  'C’est {payant|gratuit} pour les {enfants|moins de 12 ans} ?',
  '{Rendez-vous|On se retrouve} {à la buvette|au club-house}. 🍻',
  'Il {pleut|fait froid} {là-bas|chez eux}, {prévoyez|couvrez-vous}. 🌧️',
  '{Objectivement|Franchement}, {ça se tient|c’est un match ouvert}.',
  '{Bonne|Belle} {question|remarque}, {j’attends la réponse|je me la posais aussi}.',
  '{On verra|À voir} {ce que ça donne|sur la durée}.',
  '{Quelqu’un|On} sait {qui arbitre|s’il y a l’arbitrage vidéo} ?',
  '{Noté|Enregistré}. {Merci.|Nickel.}',
  'Y’a {une billetterie en ligne|un guichet sur place} ?',
  '{Je m’attendais|On s’attendait} à {autre chose|plus}, mais {pourquoi pas|ok}.',
  '{Première fois|Je viens pour la première fois} {au stade|voir un match}, {des conseils|on se gare où} ?',
  '{Personne|Quelqu’un} ne parle {des jeunes|du centre de formation} ? {Ils cartonnent.|Ça vaut le coup d’œil.}',
  '{Match|Rencontre} à {ne pas rater|suivre}, {clairement|c’est sûr}.',
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

type IdentiteFil = Pick<Joueur, 'club' | 'saison' | 'nom'>;

export function filDeLaSemaine(
  j: IdentiteFil,
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
    // y en a.
    // ⚠️ LE PLAFOND ÉTAIT DE QUATRE, QUEL QUE SOIT LE POST (bug signalé en
    // jeu) : un tweet de club à 800 000 vues affichait autant de réponses qu'un
    // post à 40 000. Le barème monte maintenant jusqu'à douze, et le pool de
    // phrases a été multiplié pour tenir la charge sans se répéter.
    const nb = post.vues > 300_000 ? 12
      : post.vues > 120_000 ? 10
        : post.vues > 40_000 ? 8
          : post.vues > 15_000 ? 6
            : post.vues > 5000 ? 4
              : post.vues > 1500 ? 3
                : rng() < 0.6 ? 2 : 1;
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
    'Hé, t’as une minute ? J’ai un truc à te demander, rien de grave. 😅',
    'Je pensais à toi ce matin. Ça va, la tête ? On sait que c’est dur en ce moment.',
    'Mon frère, ma mère demande de tes nouvelles. Elle t’adore. 😂',
    'Dis, tu connais un bon kiné dans le coin ? Le mien me lâche.',
    'On se fait un padel jeudi ? J’ai réservé au cas où.',
    'J’ai vu ton nom dans le journal. Fier de toi, sincèrement.',
  ],
  cordial: [
    'Salut, ça va ? Bien remis du week-end ?',
    'Hey, on m’a parlé de toi en bien. Content de te suivre.',
    'Bonjour ! Petite question : c’est quoi ton programme de muscu en saison ?',
    'Salut, je voulais juste te dire que ton match de dimanche m’a marqué.',
    'Tu joues à quel poste exactement ? On m’a dit deux choses différentes. 😅',
    'Bon courage pour la fin de saison, ça se joue à pas grand-chose.',
  ],
  neutre: [
    'Salut, on ne se connaît pas vraiment mais je suis ton parcours. Bon courage.',
    'Bonjour, une petite question rapide : tu prolonges avec ton club ?',
    'Bonjour, je fais un travail sur les jeunes joueurs. Vous auriez cinq minutes ?',
    'Salut. Sans vouloir déranger : tu conseillerais quoi à un gamin de 16 ans ?',
    'Bonjour, mon fils est un grand fan. Un petit message le rendrait heureux.',
    'Salut, on a joué l’un contre l’autre en cadets je crois. Tu te souviens ?',
  ],
  froid: [
    'Bon. On va pas se mentir, y’a un froid. Tu comptes faire quelque chose ?',
    'Je vais être direct : ce que t’as dit, ça ne passe pas.',
    'On devrait peut-être se parler avant que ça parte plus loin.',
    'J’espère que t’assumes, parce que moi j’ai pas oublié.',
  ],
  ennemi: [
    'Continue de parler dans les médias, tu vas voir ce que ça donne dimanche.',
    'T’as toujours pas compris à qui tu parlais visiblement.',
    'On se croise bientôt. J’espère que tu seras aussi bavard.',
    'Tout le monde a vu ce que t’as écrit. Tout le monde.',
    'Sérieusement, tu te crois où ? Redescends.',
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
  'Karting {quand} avec les trois-quarts. Les avants sont pas invités. 😂',
  'Je passe chercher les nouveaux crampons {quand}, tu veux que je te prenne les tiens ?',
  'Séance piscine {quand} pour la récup. Ça fait un bien fou, viens.',
  'On monte voir le match des espoirs {quand}. Y’a deux gamins qui valent le coup.',
  'Repas des partenaires {quand}, le club cherche des joueurs pour représenter. T’es dispo ?',
  'Randonnée {quand} avec les familles. Ça décompresse, promis c’est pas une séance.',
  'Le club-house diffuse le match international {quand}. On se cale devant ?',
  'Je fais un barbecue de fin de bloc {quand}. Tu ramènes juste la salade.',
  'Séance touches {quand} avec le talonneur. Il a besoin d’un sauteur, ça te dit ?',
  'On va dédicacer des maillots à la boutique {quand}. Deux heures, pas plus.',
  'Petit foot en salle {quand}, interdit aux piliers (règle du club). 😄',
  'Je vais chez le coiffeur {quand}, celui qui coupe toute l’équipe. Je te cale un créneau ?',
  'Le coach des jeunes cherche un parrain pour les moins de 14 ans {quand}. J’ai pensé à toi.',
  'Concert au village {quand}. Faut sortir du rugby cinq minutes, viens.',
  'On répare la buvette {quand}, le club a besoin de bras. Une heure suffit.',
  'Session vidéo perso {quand} : j’ai monté tes vingt derniers ballons. Ça t’intéresse ?',
];

export const QUAND = [
  'lundi', 'mardi soir', 'mercredi', 'jeudi midi', 'ce week-end',
  'après l’entraînement', 'dimanche soir', 'vendredi', 'demain matin',
  'la semaine prochaine', 'ce soir', 'samedi midi',
];

// Un coéquipier t'écrit pour proposer quelque chose. Déterministe.
export function invitationCoequipier(cleUnique: string): string {
  const rng = graine('invit#' + cleUnique);
  const texte = INVITATIONS[Math.floor(rng() * INVITATIONS.length)];
  return texte.split('{quand}').join(QUAND[Math.floor(rng() * QUAND.length)]);
}
