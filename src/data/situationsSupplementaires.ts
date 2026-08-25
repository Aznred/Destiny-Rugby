// 100 situations supplémentaires de vie de rugbyman.
//
// Elles restent volontairement hors des matchs : ici on choisit comment vivre
// avec le vestiaire, l'argent, les médias, le corps et la carrière. Chaque
// réponse modifie réellement la sauvegarde via les mêmes `IssueSituation` que
// la base historique.

import type { Joueur, StatVariable } from '../types';
import type { IssueSituation, Situation } from './situations';

type Cat = Situation['categorie'];
type Deltas = Partial<Record<StatVariable, number>>;

const issue = (
  texte: string, recit: string, deltas: Deltas, ovas: number,
  extras: Omit<IssueSituation, 'recit' | 'deltas' | 'ovas'> = {},
): Situation['choix'][number] => ({ texte, issue: { recit, deltas, ovas, ...extras } });

const scene = (
  id: string, emoji: string, categorie: Cat, titre: string, situation: string,
  choix: Situation['choix'], quand?: (j: Joueur) => boolean, poids = 1,
): Situation => ({ id, emoji, categorie, titre, situation, choix, ...(quand ? { quand } : {}), poids });

const pro = (j: Joueur) => ['top14', 'prod2', 'nationale'].includes(j.division ?? '');

export const SITUATIONS_SUPPLEMENTAIRES: Situation[] = [
  // ═══════════════════════ VESTIAIRE (13) ═════════════════════════════════
  scene('chambre-tirage', '🛏️', 'vestiaire', 'La chambre tirée au sort',
    'En déplacement, le tirage des chambres te place avec le coéquipier le plus bavard du groupe, la veille d’un week-end déjà chargé.', [
      issue('Accepter et apprendre à le connaître.', 'La nuit est courte, mais vous vous découvrez un langage commun. Il te couvrira au prochain coup dur.', { moral: 6, endurance: -1 }, 3, { coach: 2 }),
      issue('Échanger discrètement avec un autre joueur.', 'Tu dors mieux. Le vestiaire apprend l’échange et te trouve un peu distant.', { forme: 4, moral: -3 }, 1, { coach: -1 }),
    ]),
  scene('navette-espoir', '🚐', 'vestiaire', 'La navette du jeune espoir',
    'Un jeune du centre n’a plus de transport après l’entraînement. Le détour te ferait perdre presque une heure.', [
      issue('Le raccompagner et parler rugby.', 'Le détour devient une séance de mentorat improvisée. Les jeunes parlent de toi avec respect.', { moral: 5, reputation: 2 }, 4, { coach: 4, fans: 2 }),
      issue('Lui commander un véhicule.', 'Tu règles le problème sans sacrifier ta récupération.', { argent: -35, forme: 2 }, 2, { coach: 1 }),
    ]),
  scene('playlist-vestiaire', '🎧', 'vestiaire', 'La guerre de la playlist',
    'Deux clans se disputent la musique d’avant entraînement. Le capitaine te tend le téléphone comme si tu devais arbitrer une finale.', [
      issue('Créer une playlist commune.', 'Tu alternes les styles et même les plus grincheux finissent par chanter.', { moral: 7, vision: 1 }, 3, { coach: 2 }),
      issue('Lancer ton morceau fétiche très fort.', 'Ton choix devient un running gag. La moitié adore, l’autre te le fera payer gentiment.', { moral: 4, reputation: 2 }, 3, { fans: 2 }),
    ]),
  scene('capitaine-absent', '🧭', 'vestiaire', 'Le capitaine est absent',
    'Le capitaine manque la réunion vidéo et le groupe attend que quelqu’un organise la parole avant l’arrivée du staff.', [
      issue('Prendre le tableau et distribuer les rôles.', 'La réunion avance proprement. Le staff découvre chez toi une vraie autorité calme.', { mental: 2, vision: 1, reputation: 2 }, 5, { coach: 7 }),
      issue('Laisser les anciens gérer.', 'Tu évites de marcher sur les plates-bandes. La réunion s’étire et personne ne tranche vraiment.', { moral: 1 }, 1, { coach: -2 }),
    ], (j) => j.age >= 24),
  scene('amende-fuite', '🧾', 'vestiaire', 'Le barème des amendes a fuité',
    'Une photo du tableau des retards circule en ligne. Ton nom apparaît deux fois et les supporters s’en amusent.', [
      issue('Payer et publier une réponse drôle.', 'Tu assumes sans te victimiser. La blague tourne en ta faveur.', { argent: -180, reputation: 3, popularite: 4 }, 4, { fans: 5, coach: 2 }),
      issue('Chercher qui a pris la photo.', 'Tu trouves le coupable, mais l’enquête crispe tout le groupe.', { mental: 1, moral: -6 }, 1, { coach: -3, fans: -2 }),
    ]),
  scene('coequipier-insomnie', '🌙', 'vestiaire', 'Le coéquipier qui ne dort plus',
    'Un titulaire t’avoue qu’il enchaîne les nuits blanches mais refuse d’en parler au médecin, de peur de perdre sa place.', [
      issue('L’accompagner vers le staff médical.', 'Il accepte enfin de se faire aider. Sa confiance vaut plus qu’un secret mal gardé.', { moral: 6, mental: 1 }, 4, { coach: 5 }),
      issue('Garder le secret et veiller sur lui.', 'Il apprécie ta loyauté, mais tu portes désormais une responsabilité qui te ronge.', { moral: -3, mental: -1 }, 2, { coach: -2 }),
    ]),
  scene('maillot-inverse', '👕', 'vestiaire', 'Les maillots inversés',
    'L’intendant a mélangé deux sacs et chacun reçoit la tenue d’un autre joueur pour la photo officielle.', [
      issue('Transformer l’erreur en photo décalée.', 'La photo devient culte et l’intendant respire enfin.', { moral: 8, popularite: 3 }, 3, { fans: 4, coach: 2 }),
      issue('Exiger que tout soit recommencé.', 'La photo est impeccable, mais le vestiaire te chambre sur ton sérieux.', { reputation: 1, moral: -2 }, 1, { coach: 1 }),
    ]),
  scene('traduction-recrue', '🗣️', 'vestiaire', 'La recrue ne comprend pas les codes',
    'Une recrue étrangère maîtrise mal la langue et acquiesce à des consignes qu’elle n’a visiblement pas comprises.', [
      issue('Lui servir de relais pendant un mois.', 'Tu apprends quelques mots de sa langue et le groupe gagne un joueur réellement intégré.', { vision: 2, mental: 1, moral: 5 }, 5, { coach: 6 }),
      issue('Prévenir simplement le staff.', 'Le club organise des cours. La solution est bonne, même si la recrue espérait davantage de proximité.', { reputation: 1 }, 2, { coach: 3 }),
    ]),
  scene('sifflet-perdu', '📯', 'vestiaire', 'Le sifflet du préparateur',
    'Le sifflet du préparateur physique disparaît juste avant une séance. Tous les regards convergent vers les joueurs.', [
      issue('Mener une fausse enquête théâtrale.', 'Le coupable se dénonce en riant et la séance démarre dans une ambiance parfaite.', { moral: 7, popularite: 1 }, 3, { coach: 2 }),
      issue('Donner ton propre sifflet de supporter.', 'Le préparateur apprécie le geste et garde le souvenir sur son bureau.', { reputation: 2, moral: 3 }, 3, { coach: 5 }),
    ]),
  scene('diner-centre', '🍲', 'vestiaire', 'Le dîner du centre de formation',
    'Les jeunes organisent un dîner avec un budget minuscule et demandent à un professionnel de venir raconter ses premiers échecs.', [
      issue('Venir tôt et rester jusqu’au rangement.', 'Ton récit sans filtre marque davantage que n’importe quel discours de motivation.', { moral: 6, reputation: 3, mental: 1 }, 5, { coach: 4, fans: 3 }),
      issue('Financer le repas sans venir.', 'Le buffet est superbe, mais les jeunes auraient préféré entendre ta voix.', { argent: -700, reputation: 2 }, 2, { fans: 2 }),
    ], (j) => pro(j)),
  scene('blague-kine', '🩹', 'vestiaire', 'La blague du kiné va trop loin',
    'Une plaisanterie visant le kiné circule dans le groupe privé. Elle est drôle, mais clairement humiliante.', [
      issue('Demander qu’on l’efface.', 'Quelques joueurs lèvent les yeux, puis reconnaissent que tu as posé la bonne limite.', { mental: 2, reputation: 2 }, 4, { coach: 5 }),
      issue('Ne rien dire.', 'La capture finit par arriver au kiné. Les soins deviennent soudain très silencieux.', { moral: -5, forme: -2 }, 0, { coach: -4 }),
    ]),
  scene('secret-retraite', '🤐', 'vestiaire', 'Le secret d’un ancien',
    'Un cadre t’annonce en privé qu’il arrêtera en juin. Il ne veut pas encore que le staff ou le groupe le sache.', [
      issue('Garder sa confiance.', 'Tu l’aides à profiter de ses derniers mois sans voler son annonce.', { mental: 2, moral: 4 }, 4, { coach: 1 }),
      issue('Prévenir le manager pour préparer la suite.', 'Le club anticipe, mais l’ancien ne te confiera plus rien.', { vision: 2, moral: -5 }, 2, { coach: 5 }),
    ], (j) => j.age >= 25),
  scene('rituel-multiculturel', '🕊️', 'vestiaire', 'Un rituel avant l’entraînement',
    'Plusieurs joueurs souhaitent un court moment de silence avant une date importante pour leurs familles. D’autres craignent une nouvelle obligation.', [
      issue('Proposer un moment libre et ouvert à tous.', 'Chacun peut participer ou non. Le geste rapproche le groupe sans l’enfermer.', { moral: 8, mental: 1 }, 4, { coach: 4 }),
      issue('Garder les habitudes inchangées.', 'La routine est préservée, mais une partie du vestiaire se sent peu entendue.', { moral: -3 }, 1, { coach: -1 }),
    ]),

  // ═══════════════════════ ARGENT (12) ════════════════════════════════════
  scene('sponsor-crypto', '🪙', 'argent', 'Le sponsor en cryptomonnaie',
    'Une jeune plateforme te propose une grosse somme pour une vidéo tournée ce soir, mais ses promesses de rendement semblent trop belles.', [
      issue('Refuser tant que le produit n’est pas audité.', 'Tu perds un chèque, pas ta crédibilité. Quelques semaines plus tard, le projet disparaît.', { reputation: 5, argent: -1200 }, 5, { fans: 4, coach: 2 }),
      issue('Accepter avec une mention de risque.', 'La vidéo paie très bien, puis les commentaires de supporters lésés arrivent.', { argent: 18000, reputation: -8, popularite: 3 }, 2, { fans: -9 }),
    ]),
  scene('droits-image', '📸', 'argent', 'Tes droits d’image',
    'Le club veut utiliser ton visage pendant trois ans, y compris après ton départ, contre une prime immédiate.', [
      issue('Négocier une durée limitée.', 'Tu obtiens un accord plus propre, moins lucratif mais respectueux de la suite.', { argent: 6500, mental: 2 }, 4, { coach: 1 }),
      issue('Signer sans ralentir le dossier.', 'La prime tombe dès demain et le club apprécie ta souplesse.', { argent: 12000, reputation: -1 }, 2, { coach: 4 }),
    ], (j) => pro(j)),
  scene('carte-collector', '🃏', 'argent', 'La carte collector introuvable',
    'Un intermédiaire te propose d’acheter cent cartes à ton effigie avant leur annonce officielle, persuadé que leur prix va exploser.', [
      issue('Refuser ce conflit d’intérêts.', 'Tu laisses les collectionneurs décider de la valeur sans manipuler le marché.', { reputation: 4, mental: 1 }, 4, { fans: 3 }),
      issue('Acheter le lot discrètement.', 'La cote monte un temps, puis la manœuvre est révélée par un vendeur.', { argent: 4500, reputation: -6 }, 1, { fans: -5 }),
    ]),
  scene('controle-fiscal', '🧮', 'argent', 'Le contrôle fiscal',
    'Une lettre officielle réclame plusieurs justificatifs sur tes primes et tes revenus publicitaires.', [
      issue('Tout confier à un expert indépendant.', 'Le dossier coûte cher mais ressort propre, sans mauvaise surprise.', { argent: -3200, mental: 2, moral: 2 }, 3),
      issue('Répondre seul pour économiser.', 'Tu passes des nuits sur les factures et rates un détail qui entraîne une pénalité.', { argent: -5200, forme: -4, mental: -1 }, 1),
    ], (j) => (j.argent ?? 0) > 10000),
  scene('pret-famille', '🤝', 'argent', 'Le prêt demandé par la famille',
    'Un proche te demande une somme importante pour sauver son commerce. Il promet de rembourser après l’été.', [
      issue('Prêter avec un contrat clair.', 'La discussion est inconfortable, mais chacun sait désormais ce qu’il doit.', { argent: -9000, mental: 2, moral: 3 }, 3),
      issue('Donner une somme plus petite sans retour.', 'Tu protèges la relation et aides sans mettre toute ta saison en danger.', { argent: -3500, moral: 6 }, 4),
    ]),
  scene('commerce-local', '🥖', 'argent', 'Le commerce près du stade',
    'Une petite boulangerie fréquentée par les supporters cherche des associés pour survivre aux travaux du quartier.', [
      issue('Investir une petite part.', 'Ton nom attire du monde et le commerce devient un lieu de rendez-vous les jours de match.', { argent: -5000, reputation: 3, popularite: 2 }, 4, { fans: 5 }),
      issue('Faire seulement une campagne de soutien.', 'La file s’allonge dès le lendemain. Ton portefeuille reste intact.', { reputation: 2, popularite: 4 }, 3, { fans: 4 }),
    ]),
  scene('cagnotte-supporters', '🎟️', 'argent', 'La cagnotte des supporters',
    'Des supporters veulent financer une banderole géante à ton nom. Le montant collecté dépasse largement le coût annoncé.', [
      issue('Demander que le surplus aille à l’école de rugby.', 'La banderole est superbe et les enfants reçoivent du matériel neuf.', { reputation: 5, popularite: 4 }, 5, { fans: 8, coach: 2 }),
      issue('Les laisser gérer leur argent.', 'La fête a lieu, mais les questions sur le surplus ne disparaissent pas.', { popularite: 2, reputation: -2 }, 1, { fans: -1 }),
    ]),
  scene('commission-agent', '💼', 'argent', 'La commission surprise',
    'Ton agent réclame une commission sur une prime qu’il n’a pas négociée. Le contrat est assez flou pour ouvrir un conflit.', [
      issue('Renégocier calmement l’accord.', 'Vous clarifiez les règles futures et partagez la prime cette fois-ci.', { argent: -1800, mental: 2 }, 3),
      issue('Refuser net et consulter ailleurs.', 'Tu gardes la somme mais la relation avec ton agent devient glaciale.', { argent: 3200, moral: -3 }, 2, { marche: true }),
    ]),
  scene('vente-encheres', '🔨', 'argent', 'Ton premier maillot aux enchères',
    'Une association te demande le maillot de tes débuts. Un collectionneur privé en offre pourtant une somme difficile à ignorer.', [
      issue('Donner le maillot à l’association.', 'L’enchère finance des mois d’activité et ton geste reste dans les mémoires.', { reputation: 6, argent: -2500 }, 5, { fans: 6 }),
      issue('Vendre au collectionneur et reverser la moitié.', 'Tu partages l’argent et conserves une partie de la valeur du souvenir.', { argent: 6000, reputation: 2 }, 3, { fans: 2 }),
    ]),
  scene('prime-crampons', '🥾', 'argent', 'La prime des crampons',
    'Un équipementier te propose une prime par apparition, à condition de porter un modèle encore raide et peu adapté à ton pied.', [
      issue('Exiger un modèle moulé pour toi.', 'La marque accepte après plusieurs essais. Le lancement prend du retard, pas ta santé.', { argent: 2500, forme: 2, mental: 1 }, 4),
      issue('Porter la paire dès cette semaine.', 'La prime tombe, avec des ampoules qui compliquent toutes les séances.', { argent: 7500, forme: -7, vitesse: -1 }, 1),
    ]),
  scene('colocation-jeune', '🏠', 'argent', 'La colocation du jeune pro',
    'Un jeune contrat ne trouve aucun logement abordable près du centre. Tu as une chambre libre pour quelques mois.', [
      issue('L’héberger contre une participation symbolique.', 'La maison devient un petit bout de vestiaire, parfois bruyant mais solidaire.', { argent: 900, moral: 7 }, 4, { coach: 5 }),
      issue('L’aider à trouver une garantie bancaire.', 'Tu lui ouvres une porte sans mélanger vie privée et travail.', { reputation: 2, mental: 1 }, 3, { coach: 3 }),
    ], (j) => j.age >= 25),
  scene('plan-retraite', '📈', 'argent', 'Le plan d’après-carrière',
    'Un conseiller te montre ce que deviendra ton épargne si ta carrière s’arrête demain. Le chiffre te réveille brutalement.', [
      issue('Bloquer une part de tes revenus.', 'Tu dépenses moins aujourd’hui, mais le futur cesse d’être une menace abstraite.', { argent: -4500, mental: 3, moral: 2 }, 4),
      issue('Miser sur un projet plus risqué.', 'Le rendement est séduisant et les variations te font consulter ton téléphone sans cesse.', { argent: 8000, mental: -2, forme: -2 }, 2),
    ], (j) => j.age >= 28),

  // ═══════════════════════ MÉDIAS (13) ════════════════════════════════════
  scene('micro-ouvert', '🎙️', 'medias', 'Le micro est resté ouvert',
    'Après une interview, ton micro capte une remarque moqueuse sur l’organisation. Le journaliste te prévient avant publication.', [
      issue('Assumer et reformuler publiquement.', 'Tu transformes la pique en critique constructive. Le club grince des dents mais le message passe.', { reputation: 4, mental: 1 }, 4, { coach: -2, fans: 4 }),
      issue('Demander que l’extrait soit coupé.', 'Le journaliste accepte. Une rumeur sur la phrase commence malgré tout à circuler.', { moral: -2 }, 1, { fans: -1 }),
    ]),
  scene('documentaire-vestiaire', '🎥', 'medias', 'Une caméra pendant six semaines',
    'Une plateforme veut suivre le club au quotidien. Ton contrat permet de refuser d’être filmé dans les espaces privés.', [
      issue('Participer avec des limites claires.', 'Le public découvre ton travail et non une caricature. La série devient populaire.', { popularite: 7, reputation: 3, mental: 1 }, 5, { fans: 6 }),
      issue('Refuser toute caméra.', 'Tu protèges ta bulle. Le montage parle peu de toi et le vestiaire respecte ta cohérence.', { moral: 4, popularite: -2 }, 2, { coach: 1 }),
    ], (j) => pro(j)),
  scene('fuite-tactique', '🕵️', 'medias', 'Le document tactique anonyme',
    'Un compte anonyme publie une photo d’un tableau interne. On te demande si tu reconnais l’angle de prise de vue.', [
      issue('Aider le club sans accuser personne.', 'Les accès sont sécurisés et personne n’est désigné sans preuve.', { vision: 2, reputation: 2 }, 3, { coach: 5 }),
      issue('Partager tes soupçons.', 'L’enquête avance vite, mais un innocent passe deux jours sous pression.', { mental: -1, moral: -4 }, 1, { coach: 2 }),
    ]),
  scene('deepfake-pub', '🤖', 'medias', 'La publicité qui n’est pas toi',
    'Une vidéo générée imite ta voix pour vendre des compléments douteux. Des milliers de personnes pensent que tu les recommandes.', [
      issue('Publier les preuves et engager une procédure.', 'Le faux est retiré et ton explication sensibilise beaucoup de jeunes supporters.', { reputation: 6, argent: -1200, popularite: 3 }, 5, { fans: 5 }),
      issue('Ignorer pour ne pas amplifier.', 'La vidéo s’essouffle, mais quelques supporters continuent de douter.', { reputation: -3, mental: -2 }, 1, { fans: -2 }),
    ]),
  scene('podcast-rival', '🎧', 'medias', 'L’invitation du rival',
    'Le capitaine du rival t’invite dans son podcast pour parler franchement de la rivalité et de vos clichés respectifs.', [
      issue('Accepter et jouer le jeu.', 'La discussion est piquante mais intelligente. Les deux camps découvrent un autre visage.', { popularite: 5, reputation: 3, mental: 1 }, 4, { fans: 3 }),
      issue('Décliner avec humour.', 'Ton message de refus fait sourire et entretient juste assez la rivalité.', { popularite: 2, moral: 2 }, 2, { fans: 2 }),
    ]),
  scene('direct-faute-frappe', '📱', 'medias', 'La faute de frappe en direct',
    'Une publication programmée transforme le nom de ton club en insulte à cause d’une correction automatique.', [
      issue('Supprimer et montrer la capture originale.', 'L’erreur devient un mème inoffensif que même le club reprend.', { popularite: 6, moral: 3 }, 3, { fans: 5, coach: 1 }),
      issue('Laisser ton équipe de communication répondre.', 'Le communiqué est propre, mais rend l’affaire plus sérieuse qu’elle ne l’était.', { reputation: 1, popularite: -1 }, 1, { coach: 2 }),
    ]),
  scene('boycott-presse', '📰', 'medias', 'Le vestiaire veut boycotter la presse',
    'Après un article jugé injuste, plusieurs cadres veulent que personne ne réponde aux médias pendant une semaine.', [
      issue('Proposer une réponse collective factuelle.', 'Vous corrigez les erreurs sans transformer le journaliste en ennemi.', { reputation: 4, mental: 1 }, 4, { coach: 4, fans: 3 }),
      issue('Suivre le boycott.', 'Le groupe apprécie ta loyauté, mais le silence laisse l’article imposer son récit.', { moral: 5, reputation: -3 }, 2, { coach: 1, fans: -2 }),
    ]),
  scene('question-enfant', '🧒', 'medias', 'La question sans filtre',
    'Pendant une émission scolaire, un enfant te demande pourquoi tu as été mauvais le week-end précédent.', [
      issue('Répondre honnêtement et simplement.', 'Tu expliques l’erreur, le travail et le droit de rater. L’extrait touche bien au-delà du rugby.', { reputation: 5, mental: 2, popularite: 4 }, 5, { fans: 6 }),
      issue('Répondre par une plaisanterie.', 'La salle rit et la séquence reste légère.', { moral: 4, popularite: 2 }, 2, { fans: 2 }),
    ]),
  scene('debat-statistiques', '📊', 'medias', 'La statistique qui te condamne',
    'Une émission affiche un classement où tu es dernier sur un indicateur isolé, sans mentionner ton rôle ni le contexte.', [
      issue('Répondre avec les données complètes.', 'Ton analyse calme démontre les limites du chiffre sans nier ta marge de progrès.', { vision: 2, reputation: 3, mental: 1 }, 4, { fans: 3 }),
      issue('Ne rien répondre et travailler.', 'Tu coupes le bruit, mais la statistique reste associée à ton nom quelque temps.', { forme: 3, reputation: -2 }, 2),
    ]),
  scene('danse-virale', '🕺', 'medias', 'La danse virale du vestiaire',
    'Une vidéo de ta célébration maladroite dépasse le million de vues. Une marque veut en faire un défi sponsorisé.', [
      issue('Accepter au profit d’une association.', 'Tu assumes le ridicule et transformes le buzz en collecte utile.', { popularite: 8, reputation: 3 }, 5, { fans: 7 }),
      issue('Laisser mourir la mode.', 'Le phénomène passe vite et ta tranquillité revient.', { moral: 3, popularite: -1 }, 1),
    ]),
  scene('journal-local', '🏘️', 'medias', 'Le journaliste de ton village',
    'Le petit journal de ta région demande une longue interview. Ton agenda ne laisse qu’un rare après-midi libre.', [
      issue('Lui consacrer l’après-midi.', 'L’article raconte les bénévoles et les terrains qui t’ont construit. Chez toi, on est fier.', { reputation: 5, moral: 6 }, 5, { fans: 5 }),
      issue('Envoyer des réponses écrites.', 'Le papier paraît tout de même, plus court et un peu impersonnel.', { reputation: 2, forme: 2 }, 2, { fans: 1 }),
    ]),
  scene('rehab-camera', '🦿', 'medias', 'Filmer la rééducation',
    'Une chaîne te propose de documenter ta rééducation au jour le jour, y compris les moments de doute.', [
      issue('Montrer le processus sans cacher les jours difficiles.', 'Les jeunes blessés se reconnaissent dans ton parcours et ton retour devient collectif.', { mental: 2, reputation: 5, popularite: 5 }, 5, { fans: 6 }),
      issue('Garder la rééducation privée.', 'Tu avances sans caméra et protèges ton énergie.', { forme: 5, moral: 3 }, 2),
    ], (j) => !!j.blessure),
  scene('vote-trophee', '🏆', 'medias', 'Le vote pour le trophée',
    'On te demande publiquement de choisir le meilleur joueur de la saison. Un coéquipier et un rival méritent tous les deux la récompense.', [
      issue('Voter pour le rival et expliquer pourquoi.', 'Ton honnêteté surprend et donne du poids à ton jugement.', { reputation: 6, mental: 2 }, 5, { coach: -1, fans: 3 }),
      issue('Soutenir ton coéquipier.', 'Le vestiaire apprécie ta fidélité, même si le débat extérieur se tend.', { moral: 6, reputation: 1 }, 3, { coach: 3 }),
    ], (j) => j.reputation >= 55),

  // ═══════════════════════ PERSO (13) ═════════════════════════════════════
  scene('distance-couple', '🗺️', 'perso', 'Deux villes, une seule semaine',
    'Ton couple vit désormais à plusieurs heures de route. Chaque jour libre devient un choix entre récupérer et voyager.', [
      issue('Bloquer un rythme de visites réaliste.', 'Le calendrier paraît froid, mais il rend vos moments ensemble plus sereins.', { moral: 6, mental: 2, forme: -1 }, 4),
      issue('Faire le trajet dès que possible.', 'Vous vous voyez davantage, au prix d’une fatigue qui finit par se sentir.', { moral: 8, forme: -6, endurance: -1 }, 2),
    ]),
  scene('mariage-fratrie', '💍', 'perso', 'Le mariage tombe le mauvais week-end',
    'Le mariage de ton frère ou de ta sœur a lieu à l’étranger, en pleine période de préparation.', [
      issue('Demander une autorisation exceptionnelle.', 'Le staff accepte. Tu reviens heureux, mais avec une séance de retard.', { moral: 10, forme: -3 }, 4, { coach: -2 }),
      issue('Rester avec le groupe.', 'Ta famille comprend sans vraiment cacher sa déception.', { forme: 4, moral: -7 }, 2, { coach: 5 }),
    ]),
  scene('chien-trouve', '🐕', 'perso', 'Le chien sous la pluie',
    'En rentrant tard, tu trouves un chien trempé sans collier près du stade.', [
      issue('L’emmener chez le vétérinaire de garde.', 'La puce permet de retrouver sa famille au milieu de la nuit.', { argent: -160, moral: 8, reputation: 2 }, 4, { fans: 3 }),
      issue('Prévenir une association et attendre avec lui.', 'Des bénévoles prennent le relais. Tu rentres tard mais rassuré.', { forme: -2, moral: 6 }, 3),
    ]),
  scene('voisin-travaux', '🔨', 'perso', 'Les travaux de six heures',
    'Ton voisin rénove son appartement dès l’aube, précisément pendant ta semaine de récupération.', [
      issue('Lui parler et convenir d’horaires.', 'Le compromis tient et vous évite une guerre de palier.', { forme: 4, mental: 1 }, 3),
      issue('Dormir quelques nuits à l’hôtel.', 'Le silence coûte cher, mais ton sommeil revient immédiatement.', { argent: -900, forme: 7 }, 2),
    ]),
  scene('retour-etudes', '📚', 'perso', 'Reprendre les études',
    'Une université propose un cursus aménagé pour sportifs. Deux soirées par semaine disparaîtraient de ton temps libre.', [
      issue('T’inscrire pour préparer l’après.', 'Les premières semaines sont denses, puis apprendre autre chose t’équilibre.', { vision: 2, mental: 3, forme: -2 }, 5),
      issue('Reporter à la prochaine saison.', 'Tu protèges ta routine sportive, mais le dossier reste dans un tiroir.', { forme: 3, moral: -1 }, 1),
    ], (j) => j.age >= 24),
  scene('ami-ancien', '📞', 'perso', 'L’ami qui ne parle jamais de rugby',
    'Un ami d’enfance te propose une journée loin du stade, sans photo, sans score et sans téléphone.', [
      issue('Couper complètement.', 'Tu redeviens toi-même pendant quelques heures et reviens l’esprit clair.', { moral: 9, mental: 2, popularite: -1 }, 4),
      issue('Décliner pour rester dans ta routine.', 'Ta semaine est parfaitement réglée, un peu trop peut-être.', { forme: 4, moral: -3 }, 1),
    ]),
  scene('aider-jeune-parent', '🍼', 'perso', 'Le coéquipier jeune parent',
    'Un coéquipier vient d’avoir un enfant et arrive épuisé. Sa famille est loin et il n’ose rien demander.', [
      issue('Organiser discrètement des repas avec le groupe.', 'Le vestiaire se relaie et le nouveau parent retrouve un peu d’air.', { moral: 7, reputation: 2 }, 4, { coach: 4 }),
      issue('Lui proposer ton aide directement.', 'Il accepte une soirée de répit et n’oublie pas le geste.', { moral: 6, forme: -2 }, 3, { coach: 2 }),
    ]),
  scene('allergie-diner', '🥜', 'perso', 'L’allergie au dîner officiel',
    'Au dîner du club, tu réalises qu’un plat contient un ingrédient dangereux pour un invité qui ne l’a pas remarqué.', [
      issue('Interrompre le service immédiatement.', 'Le chef remplace le plat et l’incident est évité, malgré quelques minutes de confusion.', { mental: 2, reputation: 3 }, 4, { coach: 3 }),
      issue('Prévenir seulement l’invité.', 'Il pose discrètement son assiette. Le service continue sans comprendre le risque.', { reputation: 1 }, 1),
    ]),
  scene('jardin-quartier', '🌱', 'perso', 'Le jardin derrière la tribune',
    'Des habitants transforment une friche derrière le stade en jardin partagé et cherchent des bras pour le premier week-end.', [
      issue('Venir planter avec eux.', 'La matinée fatigue les épaules mais te reconnecte au quartier.', { moral: 7, endurance: 1, forme: -2 }, 4, { fans: 5 }),
      issue('Financer les outils.', 'Les bénévoles peuvent démarrer sans attendre, même si tu restes un visage sur une affiche.', { argent: -850, reputation: 3 }, 3, { fans: 3 }),
    ]),
  scene('cours-langue', '🌍', 'perso', 'Comprendre le pays d’accueil',
    'Tu joues loin de ta langue maternelle et l’intendance propose un cours collectif très tôt le matin.', [
      issue('T’y tenir toute la saison.', 'Tu comprends enfin les blagues rapides et les nuances des réunions.', { vision: 2, mental: 2, moral: 5 }, 5, { coach: 4, fans: 3 }),
      issue('Apprendre seulement avec une application.', 'Tu progresses à ton rythme, mais évites encore les vraies conversations.', { mental: 1, forme: 2 }, 2),
    ]),
  scene('fan-insistant', '🚪', 'perso', 'Le supporter devant chez toi',
    'Le même supporter attend devant ton domicile depuis plusieurs jours pour obtenir une photo et connaître tes horaires.', [
      issue('Passer par le club et poser une limite officielle.', 'La sécurité intervient sans spectacle et ton adresse cesse de circuler.', { mental: 3, moral: 3 }, 4, { fans: -1, coach: 4 }),
      issue('Lui parler une fois pour le convaincre.', 'Il repart après la photo, mais publie malgré lui un indice sur ton domicile.', { popularite: 2, mental: -4 }, 1, { fans: 1 }),
    ]),
  scene('tournoi-jeu-video', '🎮', 'perso', 'La finale en ligne à minuit',
    'Ton équipe de jeu vidéo atteint une finale caritative, programmée à minuit la veille d’une séance légère.', [
      issue('Jouer la finale et couper juste après.', 'Vous gagnez une belle somme pour l’association. Le réveil pique un peu.', { moral: 7, forme: -3, popularite: 4 }, 4, { fans: 4 }),
      issue('Trouver un remplaçant.', 'La collecte continue sans toi et tu arrives frais à l’entraînement.', { forme: 5, moral: -1 }, 2, { coach: 2 }),
    ]),
  scene('lettre-futur', '✉️', 'perso', 'Une lettre à ton futur toi',
    'Le psychologue du club propose d’écrire une lettre à ouvrir à la fin de ta carrière, avec tes peurs et tes priorités actuelles.', [
      issue('Écrire sans te censurer.', 'Mettre les mots sur le papier calme une inquiétude que tu traînais depuis des mois.', { mental: 3, moral: 5 }, 5),
      issue('Garder l’exercice pour toi plus tard.', 'Tu emportes l’enveloppe vide. L’idée continue tout de même son chemin.', { mental: 1 }, 1),
    ]),

  // ═══════════════════════ CORPS (13) ═════════════════════════════════════
  scene('etude-sommeil', '🛌', 'corps', 'Le laboratoire du sommeil',
    'Le club propose une nuit bardée de capteurs pour comprendre pourquoi ta récupération plafonne.', [
      issue('Participer à l’étude.', 'Les données révèlent une mauvaise routine tardive facile à corriger.', { forme: 7, endurance: 1, mental: 1 }, 4, { coach: 3 }),
      issue('Refuser les capteurs.', 'Tu protèges ton intimité et testes seul une routine plus stricte.', { forme: 3, moral: 2 }, 2),
    ], (j) => j.forme < 75),
  scene('chambre-froide', '🧊', 'corps', 'La chambre froide expérimentale',
    'Le préparateur te propose un protocole de récupération par le froid encore peu utilisé au club.', [
      issue('Tester sous surveillance.', 'Le froid est brutal, mais tes jambes répondent mieux les jours suivants.', { forme: 6, endurance: 1 }, 3, { coach: 2 }),
      issue('Rester sur ta routine habituelle.', 'Tu connais ton corps et préfères la régularité à l’effet de mode.', { moral: 2, forme: 2 }, 1),
    ]),
  scene('dent-fissuree', '🦷', 'corps', 'La dent fêlée',
    'Une douleur légère à la mâchoire revient à chaque contact. Le dentiste peut intervenir maintenant ou après la prochaine coupure.', [
      issue('Soigner tout de suite.', 'Deux jours inconfortables évitent une infection et la douleur disparaît.', { forme: -2, mental: 2, argent: -350 }, 3),
      issue('Attendre la coupure.', 'Tu continues normalement, jusqu’à une nuit blanche provoquée par la douleur.', { forme: -7, mental: -2 }, 1),
    ]),
  scene('bilan-commotion', '🧠', 'corps', 'Le nouveau bilan neurologique',
    'Le médecin veut refaire tes tests de référence alors que tu te sens parfaitement bien. La séance remplacera un entraînement terrain.', [
      issue('Faire le bilan complet.', 'Les nouvelles valeurs donneront une comparaison fiable si un choc survient.', { mental: 3, forme: -1 }, 4, { coach: 4 }),
      issue('Reporter au mois prochain.', 'Tu gardes ta séance terrain mais le médecin note son désaccord.', { forme: 2, mental: -1 }, 1, { coach: -3 }),
    ]),
  scene('regime-experimental', '🥗', 'corps', 'Le menu sans repères',
    'Un nutritionniste propose un régime très différent, censé améliorer ta récupération en six semaines.', [
      issue('Tester avec des bilans réguliers.', 'Les premières journées sont étranges, puis ton énergie se stabilise.', { endurance: 2, forme: 4, moral: -1 }, 4),
      issue('Ne changer qu’un repas à la fois.', 'Les progrès sont plus lents, mais tu sais exactement ce qui te convient.', { endurance: 1, forme: 3, mental: 1 }, 3),
    ]),
  scene('cicatrice-tatouage', '🖋️', 'corps', 'Le tatouage sur la cicatrice',
    'Tu veux transformer une ancienne cicatrice en tatouage, mais le dermatologue conseille d’attendre encore une saison.', [
      issue('Écouter le médecin.', 'Le projet attendra. La peau, elle, finit correctement son travail.', { mental: 2, forme: 2 }, 2),
      issue('Choisir un dessin ailleurs.', 'Tu marques l’étape sans toucher à la zone fragile.', { moral: 5, reputation: 1 }, 3, { fans: 1 }),
    ]),
  scene('bracelet-recuperation', '⌚', 'corps', 'Le bracelet qui juge ton sommeil',
    'Ton nouvel outil de récupération affiche un score catastrophique alors que tu te sens en pleine forme.', [
      issue('Écouter le corps et noter les deux.', 'Tu utilises la donnée comme un indice, pas comme une sentence.', { mental: 3, vision: 1, forme: 2 }, 4),
      issue('Annuler la séance par prudence.', 'Tu récupères, mais commences à dépendre du chiffre au réveil.', { forme: 4, mental: -2 }, 1),
    ]),
  scene('yoga-avants', '🧘', 'corps', 'Le cours de mobilité',
    'Un professeur de yoga propose un atelier aux joueurs les plus raides. Le vestiaire promet déjà de filmer les positions impossibles.', [
      issue('Y aller et assumer.', 'Tu découvres des zones oubliées et les vidéos restent finalement dans le groupe.', { vitesse: 1, forme: 5, moral: 4 }, 4),
      issue('Faire une séance individuelle.', 'Le travail paie sans public, mais coûte un peu plus cher.', { argent: -180, vitesse: 1, forme: 4 }, 2),
    ]),
  scene('ampoule-pied', '🩴', 'corps', 'Une simple ampoule',
    'Une ampoule paraît bénigne, mais chaque changement d’appui la rouvre depuis trois jours.', [
      issue('Faire adapter les chaussures.', 'L’intendant modifie la paire et la plaie se referme enfin.', { forme: 5, vitesse: 1 }, 3, { coach: 2 }),
      issue('Serrer les dents.', 'Tu ne rates rien, mais compenses jusqu’à créer une douleur au mollet.', { mental: 1, forme: -6, vitesse: -1 }, 1),
    ]),
  scene('don-sang', '🩸', 'corps', 'La collecte du quartier',
    'Une collecte de sang utilise le stade. Tu peux donner, mais le médecin impose ensuite deux jours allégés.', [
      issue('Donner et accepter la récupération.', 'Ton geste motive d’autres joueurs et la collecte dépasse son objectif.', { forme: -3, reputation: 4, moral: 4 }, 4, { fans: 4, coach: 1 }),
      issue('Aider à l’accueil sans donner.', 'Tu restes disponible sportivement et rends tout de même la collecte visible.', { popularite: 3, reputation: 2 }, 2, { fans: 2 }),
    ]),
  scene('masque-altitude', '😷', 'corps', 'Le masque d’altitude à la mode',
    'Un influenceur sportif t’envoie un masque censé reproduire l’altitude pendant les séances quotidiennes.', [
      issue('Le faire évaluer par le préparateur.', 'Le club écarte les promesses absurdes mais conserve un exercice respiratoire utile.', { endurance: 1, vision: 1 }, 3, { coach: 3 }),
      issue('Le tester seul pour la vidéo.', 'La séquence attire des vues et te donne surtout un gros mal de tête.', { popularite: 4, forme: -5 }, 1, { fans: 2 }),
    ]),
  scene('lentilles-pluie', '👁️', 'corps', 'Voir net sous la pluie',
    'Un contrôle révèle que ta vision baisse légèrement la nuit et sous la pluie. Des lentilles adaptées peuvent corriger le problème.', [
      issue('Faire plusieurs essais encadrés.', 'Après quelques séances, tes prises d’information redeviennent nettes.', { vision: 2, jeuAuPied: 1, forme: 1 }, 4),
      issue('Continuer sans correction.', 'Tu t’habitues, mais doutes davantage sur les ballons hauts sombres.', { vision: -1, mental: -1 }, 1),
    ]),
  scene('tendon-alerte', '⚠️', 'corps', 'Le tendon murmure',
    'Une raideur inhabituelle apparaît chaque matin. L’imagerie ne montre rien de grave, seulement un avertissement.', [
      issue('Réduire la charge pendant dix jours.', 'La gêne disparaît et ton programme est rééquilibré avant la vraie blessure.', { forme: 5, force: -1, mental: 2 }, 4, { coach: 2 }),
      issue('Maintenir la charge complète.', 'Tu tiens plusieurs séances avant qu’une douleur vive n’arrête tout.', { forme: -10, endurance: -2 }, 0, { dur: { type: 'blessure', semaines: 3, motif: 'Tendinite aggravée à l’entraînement' } }),
    ]),

  // ═══════════════════════ NUIT (12) ══════════════════════════════════════
  scene('dernier-train', '🚉', 'nuit', 'Le dernier train est parti',
    'Une séance média se termine trop tard et le dernier train pour rentrer vient de fermer ses portes.', [
      issue('Dormir près de la gare.', 'La chambre est minuscule mais tu sauves presque toute ta nuit.', { argent: -140, forme: 3 }, 2),
      issue('Partager une longue voiture avec des supporters.', 'Le trajet devient une émission improvisée, amusante et épuisante.', { popularite: 4, forme: -5, moral: 3 }, 3, { fans: 5 }),
    ]),
  scene('alarme-hotel', '🚨', 'nuit', 'L’alarme à trois heures',
    'L’alarme incendie de l’hôtel vide tout le groupe sur le trottoir. Il s’agit d’une fausse alerte, mais personne ne se rendort.', [
      issue('Organiser une récupération calme au réveil.', 'Respiration, lumière basse et petit-déjeuner tardif limitent les dégâts.', { forme: -2, mental: 1 }, 3, { coach: 2 }),
      issue('Transformer l’attente en moment de groupe.', 'Vous riez sous les couvertures de survie. Les jambes sont lourdes, le moral pas du tout.', { forme: -5, moral: 8 }, 3),
    ]),
  scene('portefeuille-taxi', '👛', 'nuit', 'Le portefeuille sur la banquette',
    'Un portefeuille rempli de billets reste sur la banquette du taxi qui vient de te déposer.', [
      issue('Appeler immédiatement la centrale.', 'Le propriétaire le récupère avant même de bloquer ses cartes et raconte ton geste en ligne.', { reputation: 5, moral: 4 }, 4, { fans: 4 }),
      issue('Le remettre au poste le lendemain.', 'Tout est rendu, mais ta nuit et ta matinée disparaissent dans les démarches.', { forme: -3, reputation: 3 }, 2),
    ]),
  scene('dispute-rue', '🛑', 'nuit', 'La dispute devant le restaurant',
    'Deux inconnus se battent près de la sortie. L’un te reconnaît et t’appelle pour intervenir.', [
      issue('Garder tes distances et appeler de l’aide.', 'La sécurité sépare tout le monde. Tu refuses de devenir un troisième combattant.', { mental: 3, reputation: 2 }, 4),
      issue('T’interposer physiquement.', 'La dispute s’arrête, mais un coup perdu t’ouvre l’arcade.', { reputation: 3, forme: -8 }, 1, { dur: { type: 'blessure', semaines: 2, motif: 'Arcade ouverte lors d’une altercation nocturne' } }),
    ]),
  scene('karaoke-capitaine', '🎤', 'nuit', 'Le duo impossible',
    'Le capitaine te défie au karaoké devant tout le club. Le lendemain matin est libre, mais les téléphones sont déjà levés.', [
      issue('Monter sur scène.', 'Votre duo est faux, généreux et immédiatement légendaire.', { moral: 10, popularite: 4 }, 4, { fans: 3 }),
      issue('Filmer et encourager depuis la salle.', 'Tu conserves ta voix et produis la vidéo préférée du vestiaire.', { moral: 6, forme: 2 }, 2),
    ]),
  scene('orage-route', '⛈️', 'nuit', 'Bloqué par l’orage',
    'Un orage coupe la route du retour. La salle municipale ouvre pour les voyageurs coincés.', [
      issue('Dormir sur place avec tout le monde.', 'Tu aides à installer les lits de camp et découvres une solidarité inattendue.', { forme: -4, moral: 6, reputation: 2 }, 3, { fans: 3 }),
      issue('Chercher un hôtel loin du détour.', 'Tu trouves un vrai lit après deux heures de route supplémentaires.', { argent: -260, forme: -2 }, 1),
    ]),
  scene('musee-nocturne', '🖼️', 'nuit', 'Le musée après fermeture',
    'Un musée local propose au groupe une visite privée tardive de son exposition sur l’histoire populaire du club.', [
      issue('Y aller malgré l’heure.', 'Les récits des anciens donnent une profondeur nouvelle au maillot.', { moral: 7, reputation: 2, mental: 1 }, 4, { fans: 4 }),
      issue('Rentrer récupérer.', 'Tu protèges ton sommeil et regardes ensuite la visite filmée par le club.', { forme: 5 }, 1, { coach: 1 }),
    ]),
  scene('after-sans-alcool', '🥤', 'nuit', 'La fête sans alcool',
    'Tu veux rester à la soirée du groupe sans compromettre ta récupération. Certains insistent pour remplir ton verre.', [
      issue('Assumer un verre sans alcool toute la soirée.', 'Après deux blagues, plus personne ne s’en soucie et tu profites vraiment du groupe.', { moral: 6, forme: 3, mental: 2 }, 4, { coach: 2 }),
      issue('Partir tôt sans explication.', 'Ton sommeil est parfait, mais le groupe s’interroge sur ta disparition.', { forme: 7, moral: -2 }, 2),
    ]),
  scene('temoin-accident', '🚕', 'nuit', 'Le choc au carrefour',
    'Ton taxi est témoin d’un accident matériel. Personne n’est gravement blessé, mais la police a besoin de ton témoignage.', [
      issue('Rester jusqu’à la fin du constat.', 'Ton témoignage clarifie la collision. Tu rentres très tard, la conscience tranquille.', { forme: -5, reputation: 3, moral: 3 }, 3),
      issue('Laisser tes coordonnées et partir.', 'Tu seras rappelé plus tard et préserves une partie de ta nuit.', { forme: -1, mental: -1 }, 1),
    ]),
  scene('appel-minuit', '☎️', 'nuit', 'L’appel d’un ancien à minuit',
    'Un ancien coéquipier t’appelle sans prévenir. Sa voix laisse comprendre qu’il traverse une très mauvaise nuit.', [
      issue('Rester en ligne et prévenir un proche.', 'Il accepte de ne pas rester seul. La nuit est perdue, pas votre amitié.', { forme: -6, moral: 5, mental: 2 }, 5),
      issue('Le rappeler au matin.', 'Le message est raisonnable, mais tu ne trouves presque pas le sommeil malgré tout.', { forme: -3, moral: -4 }, 1),
    ]),
  scene('poker-hotel', '♠️', 'nuit', 'La table au fond du salon',
    'Une partie de poker improvisée commence à l’hôtel. Les mises augmentent et la bonne humeur devient plus tendue.', [
      issue('Fixer une petite limite et rester.', 'La règle calme la table et la partie redevient un jeu.', { argent: -80, moral: 5, mental: 1 }, 3),
      issue('Suivre les grosses mises.', 'Tu gagnes beaucoup cette fois, mais le goût du risque reste après la partie.', { argent: 2400, mental: -2, forme: -2 }, 1),
    ]),
  scene('bain-aube', '🌊', 'nuit', 'Le bain de mer à l’aube',
    'Après une fête près de la côte, quelques joueurs proposent un bain de mer alors que la nuit n’est pas tout à fait finie.', [
      issue('Rester sur la plage et surveiller.', 'Tu gardes les serviettes, comptes tout le monde et évites une idée encore plus mauvaise.', { mental: 2, moral: 4, forme: -2 }, 3, { coach: 1 }),
      issue('Plonger avec le groupe.', 'L’eau glacée vous réveille brutalement. Le souvenir est fort, le rhume aussi.', { moral: 9, forme: -8 }, 1, { dur: { type: 'blessure', semaines: 1, motif: 'Infection respiratoire après un bain nocturne' } }),
    ]),

  // ═══════════════════════ CLUB (12) ══════════════════════════════════════
  scene('fuite-plafond', '💧', 'club', 'Le plafond du centre fuit',
    'Une fuite d’eau menace la salle vidéo juste avant la réunion. Le personnel technique est déjà débordé.', [
      issue('Aider à déplacer le matériel.', 'Tout est sauvé et la séance commence dans une autre pièce, avec vingt minutes de retard.', { moral: 4, forme: -1, reputation: 2 }, 3, { coach: 3 }),
      issue('Préparer la réunion sur tablette ailleurs.', 'Le groupe travaille à l’heure et laisse les techniciens gérer sans foule.', { vision: 2, mental: 1 }, 3, { coach: 4 }),
    ]),
  scene('coach-academie', '🧑‍🏫', 'club', 'Remplacer l’éducateur',
    'L’éducateur des moins de douze ans est bloqué. Le club te demande d’improviser une séance de quarante-cinq minutes.', [
      issue('Construire trois ateliers simples.', 'Les enfants touchent beaucoup le ballon et tu découvres le plaisir de transmettre.', { vision: 2, moral: 7, reputation: 3 }, 5, { fans: 5, coach: 3 }),
      issue('Organiser un grand jeu libre.', 'La séance est joyeuse et chaotique, exactement comme les enfants l’espéraient.', { moral: 8, popularite: 2 }, 3, { fans: 4 }),
    ]),
  scene('pub-sponsor-club', '📺', 'club', 'Le slogan embarrassant',
    'Le sponsor principal veut te faire réciter un slogan maladroit dans une publicité obligatoire du club.', [
      issue('Proposer une version plus naturelle.', 'Le sponsor accepte et la publicité ressemble enfin à une vraie conversation.', { reputation: 3, popularite: 2 }, 3, { coach: 2 }),
      issue('Réciter exactement le texte.', 'Le tournage finit vite. L’extrait devient un petit objet de moquerie en ligne.', { popularite: 4, reputation: -2 }, 2, { coach: 4 }),
    ]),
  scene('mascotte-cheville', '🦁', 'club', 'La mascotte s’est blessée',
    'La personne sous le costume se tord la cheville avant une animation. On te propose de sauver la surprise incognito.', [
      issue('Enfiler le costume.', 'Tu transpires comme après une séance et les enfants n’apprennent ton identité qu’à la fin.', { forme: -3, moral: 8, popularite: 5 }, 4, { fans: 6 }),
      issue('Trouver un volontaire plus disponible.', 'Un membre du staff relève le défi et tu l’aides à préparer l’entrée.', { reputation: 2, moral: 3 }, 2, { coach: 2 }),
    ]),
  scene('bus-panne', '🚌', 'club', 'Le bus ne démarre plus',
    'Le bus du club tombe en panne au retour d’une action associative. Il faudra attendre deux heures ou répartir le groupe.', [
      issue('Rester ensemble et organiser le repas.', 'L’aire de repos devient un banquet improvisé. Personne n’est laissé seul.', { moral: 8, forme: -3 }, 3, { coach: 2 }),
      issue('Répartir les joueurs dans des voitures.', 'Tout le monde rentre plus vite grâce à une organisation précise.', { vision: 2, forme: 1 }, 3, { coach: 4 }),
    ]),
  scene('clinique-quartier', '🩺', 'club', 'La permanence du club',
    'Le club ouvre une permanence gratuite avec des soignants du quartier et cherche des joueurs pour accueillir les familles.', [
      issue('Tenir l’accueil toute la matinée.', 'Tu entends des histoires loin du sport professionnel et rends le lieu moins intimidant.', { reputation: 5, moral: 5 }, 5, { fans: 5 }),
      issue('Financer du matériel de prévention.', 'La permanence reçoit ce qui lui manquait et peut accueillir davantage de monde.', { argent: -1200, reputation: 3 }, 3, { fans: 3 }),
    ]),
  scene('siege-ancienne-tribune', '🪑', 'club', 'Le dernier siège de la tribune',
    'Avant la rénovation, un vieux supporter te demande de l’aider à sauver le siège où il venait avec son père.', [
      issue('Passer par le club pour le lui offrir.', 'Le siège est restauré, numéroté et remis officiellement au supporter.', { reputation: 5, moral: 5 }, 4, { fans: 7, coach: 2 }),
      issue('L’aider à le récupérer discrètement.', 'Le souvenir est sauvé, mais l’intendance cherche longtemps la pièce manquante.', { moral: 4, reputation: -1 }, 2, { coach: -2, fans: 3 }),
    ]),
  scene('menu-cantine', '🍽️', 'club', 'La cantine change de menu',
    'Le club veut réduire les coûts avec un menu unique. Plusieurs joueurs ont des besoins culturels ou alimentaires différents.', [
      issue('Porter une proposition avec plusieurs options.', 'La cuisine simplifie autrement et personne n’est forcé de choisir entre manger et s’intégrer.', { reputation: 3, moral: 6 }, 4, { coach: 3 }),
      issue('Laisser le staff trancher.', 'Le budget baisse, mais certains joueurs commencent à apporter leurs repas seuls.', { moral: -4, forme: 1 }, 1, { coach: 1 }),
    ]),
  scene('terrain-partage', '🏉', 'club', 'Deux équipes, un seul terrain',
    'Une erreur de planning donne le même créneau à ton équipe et à l’équipe féminine du club.', [
      issue('Partager le terrain et adapter la séance.', 'Les staffs improvisent des ateliers croisés et chacun apprend de l’autre.', { vision: 2, moral: 6, reputation: 3 }, 5, { coach: 4, fans: 4 }),
      issue('Demander la priorité contractuelle.', 'Ton équipe suit son programme, tandis que l’autre groupe part chercher un terrain.', { forme: 3, reputation: -4 }, 1, { coach: 2, fans: -5 }),
    ]),
  scene('analyste-desaccord', '💻', 'club', 'Le rapport de l’analyste',
    'L’analyste vidéo affirme que tes sensations sont trompeuses sur une habitude technique. Les images semblent lui donner raison.', [
      issue('Revoir les séquences avec lui.', 'Tu identifies un automatisme invisible et construis un exercice pour le corriger.', { vision: 2, passe: 1, mental: 1 }, 5, { coach: 4 }),
      issue('Faire confiance à ton instinct.', 'Tu gardes tes repères, mais le débat avec l’analyste reste ouvert.', { mental: 1, vision: -1 }, 1, { coach: -2 }),
    ]),
  scene('gala-board', '🥂', 'club', 'La table des dirigeants',
    'Au gala annuel, on te place entre deux dirigeants qui parlent déjà de la saison prochaine comme si l’effectif actuel était terminé.', [
      issue('Défendre le groupe avec diplomatie.', 'Le message est clair sans gâcher la soirée. Le vestiaire l’apprendra.', { reputation: 4, mental: 2, moral: 4 }, 4, { coach: -1 }),
      issue('Écouter pour comprendre leurs plans.', 'Tu repars avec des informations précieuses et un léger malaise.', { vision: 3, moral: -3 }, 3, { coach: 2, marche: true }),
    ], (j) => pro(j)),
  scene('expo-club', '🏛️', 'club', 'L’exposition des maillots oubliés',
    'Le club prépare une exposition historique, mais il manque les récits des équipes amateurs qui l’ont précédé.', [
      issue('Rencontrer les anciens et enregistrer leurs souvenirs.', 'Leurs voix deviennent le cœur de l’exposition, bien plus que les trophées.', { reputation: 5, moral: 6, vision: 1 }, 5, { fans: 6 }),
      issue('Prêter tes propres souvenirs récents.', 'L’exposition gagne une section moderne qui attire les plus jeunes.', { popularite: 4, reputation: 2 }, 3, { fans: 4 }),
    ]),

  // ═══════════════════════ CARRIÈRE (12) ══════════════════════════════════
  scene('clause-etranger', '🛂', 'carriere', 'La clause à l’étranger',
    'Un club étranger veut ajouter une option unilatérale : il pourrait te garder un an de plus sans renégocier ton salaire.', [
      issue('Refuser la clause et maintenir le contact.', 'Le club revient avec un contrat plus court et plus équilibré.', { mental: 3, reputation: 2 }, 4, { marche: true }),
      issue('Accepter pour sécuriser le départ.', 'L’aventure devient possible immédiatement, mais une partie de ton futur ne t’appartient plus.', { moral: 5, argent: 9000 }, 2, { marche: true }),
    ], (j) => j.age >= 23),
  scene('double-nationalite', '🛂', 'carriere', 'Deux pays te regardent',
    'Ton histoire familiale te rend éligible à une autre sélection. Les deux fédérations demandent une réponse rapide.', [
      issue('Prendre le temps de parler à ta famille.', 'Tu refuses de traiter l’identité comme un simple calcul sportif et clarifies ton choix.', { mental: 3, moral: 5, reputation: 3 }, 5),
      issue('Choisir le projet qui offre le plus de jeu.', 'La décision est rationnelle et ouvre une porte sportive réelle, au prix d’un débat public.', { reputation: 2, popularite: 4, moral: -2 }, 3, { fans: -1 }),
    ], (j) => j.reputation >= 45),
  scene('formation-leader', '🧭', 'carriere', 'Le stage de leadership',
    'Le club t’offre une place dans une formation de capitaine, avec des modules de prise de parole et de gestion de conflit.', [
      issue('Suivre le cursus complet.', 'Tu apprends surtout à faire parler les autres avant de donner ta solution.', { mental: 3, vision: 2, reputation: 2 }, 5, { coach: 6 }),
      issue('Choisir seulement les modules pratiques.', 'Tu gardes du temps pour le terrain et récupères quelques outils immédiatement utiles.', { mental: 1, forme: 2 }, 2, { coach: 2 }),
    ], (j) => j.age >= 25),
  scene('pret-six-mois', '🔁', 'carriere', 'Six mois pour jouer',
    'Ton club propose un prêt dans une division inférieure afin de retrouver du temps de jeu, sans garantie sur ton rôle au retour.', [
      issue('Accepter le prêt.', 'Tu redeviens central dans un projet et le plaisir du terrain revient.', { forme: 7, moral: 6, reputation: 1 }, 4, { coach: 2, marche: true }),
      issue('Rester pour gagner ta place.', 'Tu choisis la concurrence quotidienne et assumes des semaines plus incertaines.', { mental: 3, moral: -2 }, 3, { coach: 4 }),
    ], (j) => (j.confianceCoach ?? 50) < 55),
  scene('rugby-a-sept', '7️⃣', 'carriere', 'Une parenthèse à sept',
    'La fédération propose une courte préparation avec l’équipe de rugby à sept. Tu manquerais plusieurs semaines de club.', [
      issue('Tenter l’aventure.', 'Le rythme et les espaces transforment ta lecture du jeu, mais le retour au club demande un effort.', { vitesse: 2, endurance: 1, forme: -3 }, 5, { coach: -3 }),
      issue('Rester concentré sur le quinze.', 'Tu consolides ta place et évites de disperser ta saison.', { forme: 4, mental: 2 }, 2, { coach: 4 }),
    ], (j) => j.age <= 29 && pro(j)),
  scene('consultant-radio', '📻', 'carriere', 'Le casque du consultant',
    'Une radio te propose de commenter un match pendant une semaine sans compétition. Le club craint que tu juges publiquement des collègues.', [
      issue('Accepter avec une charte claire.', 'Tu analyses le jeu sans attaquer les personnes et découvres un possible métier futur.', { vision: 2, reputation: 3, popularite: 3 }, 4, { coach: 1 }),
      issue('Décliner pour cette saison.', 'La porte reste ouverte et le club apprécie ton attention au contexte.', { mental: 1, forme: 2 }, 2, { coach: 3 }),
    ], (j) => j.age >= 29),
  scene('agent-retraite', '📁', 'carriere', 'Ton agent passe la main',
    'Ton agent historique annonce sa retraite. Il propose de transmettre ton dossier à son associé ou de te laisser libre immédiatement.', [
      issue('Rencontrer l’associé avant de décider.', 'Tu testes la relation sans jeter les années de confiance accumulées.', { vision: 2, mental: 2 }, 3, { marche: true }),
      issue('Profiter de l’occasion pour changer.', 'Tu reprends le contrôle du marché, avec toute l’incertitude que cela implique.', { reputation: 1, moral: 2 }, 3, { marche: true }),
    ]),
  scene('succession-capitaine', '©️', 'carriere', 'Le brassard après l’ancien',
    'Le capitaine quittera le club et dit au staff que tu pourrais lui succéder. Une partie du groupe soutient un autre candidat.', [
      issue('Présenter ta manière de diriger au groupe.', 'Tu ne promets pas d’imiter l’ancien et invites l’autre candidat à partager les responsabilités.', { mental: 3, reputation: 4, moral: 4 }, 5, { coach: 6 }),
      issue('Refuser d’entrer en campagne.', 'Tu laisses le staff décider sur les actes. Certains y voient de l’humilité, d’autres un manque d’envie.', { mental: 2, reputation: 1 }, 2, { coach: 1 }),
    ], (j) => j.age >= 26 && (j.confianceCoach ?? 50) >= 60),
  scene('changer-poste', '🔀', 'carriere', 'Un poste différent pour durer',
    'Le staff pense que tes qualités peuvent mieux s’exprimer à un poste voisin, mais il faudra plusieurs mois d’apprentissage.', [
      issue('Accepter le chantier technique.', 'Tu redeviens débutant sur certains détails et gagnes une nouvelle lecture du terrain.', { vision: 2, mental: 2, passe: 1, forme: -2 }, 5, { coach: 6 }),
      issue('Défendre ton poste actuel.', 'Le staff respecte ta clarté et te demande de prouver que ton plafond est encore loin.', { mental: 2, forme: 3 }, 2, { coach: -1 }),
    ], (j) => j.age >= 27),
  scene('match-temoignage', '🎗️', 'carriere', 'Le match des anciens',
    'Ton premier club organise un match caritatif et souhaite te voir porter à nouveau ses couleurs pendant une soirée.', [
      issue('Revenir et jouer quelques minutes.', 'Le vieux maillot réveille des souvenirs et la recette dépasse toutes les attentes.', { moral: 9, reputation: 5, forme: -2 }, 5, { fans: 6 }),
      issue('Venir comme parrain sans jouer.', 'Tu protèges ton corps tout en donnant du poids à l’événement.', { moral: 6, reputation: 4, forme: 2 }, 4, { fans: 4 }),
    ], (j) => j.age >= 28),
  scene('premier-diplome-coach', '📋', 'carriere', 'Le premier diplôme d’entraîneur',
    'La fédération ouvre une formation compatible avec ta carrière. Les stages tomberont pendant certaines coupures.', [
      issue('Commencer maintenant.', 'Tu observes les séances autrement et découvres la difficulté de construire une consigne claire.', { vision: 3, mental: 2, forme: -2 }, 5, { coach: 5 }),
      issue('Attendre la retraite sportive.', 'Tu préserves tes coupures et gardes l’idée comme une vraie prochaine étape.', { forme: 4, moral: 2 }, 2),
    ], (j) => j.age >= 30),
  scene('prix-progression', '🌟', 'carriere', 'Le prix de la progression tardive',
    'Une association de joueurs veut te remettre un prix pour ta progression, alors que tu ne te considères pas encore arrivé.', [
      issue('Accepter en parlant de ceux qui t’ont aidé.', 'Le discours transforme une récompense individuelle en histoire collective.', { reputation: 6, moral: 6, popularite: 3 }, 5, { coach: 4, fans: 5 }),
      issue('Décliner pour rester concentré.', 'Le geste est compris, même si tu laisses passer un rare moment de reconnaissance.', { mental: 3, reputation: 1 }, 2),
    ], (j) => j.age >= 26 && j.reputation >= 50),
];
