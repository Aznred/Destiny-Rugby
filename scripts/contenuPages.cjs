// LE CONTENU DES PAGES, le texte, et rien d'autre.
//
// ⚠️ SÉPARÉ DU GÉNÉRATEUR EXPRÈS. `genPages.cjs` s'occupe du HTML, du sommaire,
// des métadonnées et du plan du site ; ici, il n'y a que ce qu'on lit. On peut
// donc corriger une phrase sans toucher au rendu, et l'inverse.
//
// ⚠️ CHAQUE CHIFFRE SORT DU CODE OU D'UNE MESURE. « 655 clubs », « 44 semaines »,
// « 0,15 s de pas de simulation », « 88 % de plaquages réussis » : tout est
// vérifiable dans `src/data/`, `src/lib/moteur/` ou dans la sortie des scripts
// `scripts/verif*.ts`. Si un réglage change dans le jeu, il doit changer ici.
// Une page de contenu qui ment sur le produit qu'elle décrit est pire qu'une
// page vide.

const SITE = {
  nom: 'Destiny Rugby',
  origine: 'https://destiny-rugby.fr',
};

const PAGES = [
  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'guide',
    court: 'Guide',
    titre: 'Guide de Destiny Rugby : mener une carrière de rugbyman',
    description: 'Comment jouer : créer son joueur, traverser une saison de 44 semaines, jouer ses matchs, négocier ses contrats et raccrocher au bon moment.',
    chapo: 'Destiny Rugby est un jeu de rôle de carrière : tu incarnes **un seul rugbyman**, de son premier match en Régionale 3 jusqu\'à sa retraite. Pas de gestion d\'effectif, pas de budget à équilibrer, tu ne contrôles qu\'un homme, et tout le reste t\'arrive.',
    blocs: [
      { h2: 'Créer son joueur', id: 'creation' },
      'Trois choix engagent toute la carrière, et aucun n\'est réversible.',
      { h3: 'Le poste' },
      'Les quinze postes du rugby à XV sont jouables, numérotés comme sur une feuille de match. Le poste ne change pas seulement tes attributs de départ : il change **ce que le jeu attend de toi**. Un pilier est jugé sur sa mêlée, ses ballons portés au ras et ses plaquages ; un ailier sur ses essais, ses franchissements et ses mètres gagnés. La note de match compare toujours ta prestation à ce qu\'on attend de ton numéro, jamais à une moyenne générale, un talonneur qui domine sa touche et gratte quatre ballons sortira devant un ailier qui a couru sans jamais franchir.',
      { h3: 'Le club de départ' },
      'Tu commences où tu veux dans la pyramide française, des dix divisions couvertes par le jeu. Partir en Régionale 3 avec une générale de 32 est le mode « longue carrière » : tu as tout à construire, et chaque montée se mérite. Partir plus haut te met immédiatement en concurrence avec des joueurs meilleurs que toi, et le jeu note ta saison **par rapport à ton groupe**. Être le vingt-troisième homme d\'un club de Pro D2 rapporte moins qu\'être le patron d\'une équipe de Fédérale 1.',
      { h3: 'Les deux traits de caractère' },
      'Tu en choisis deux parmi douze, pour la vie. Ils ne sont pas décoratifs : chacun est lu à un endroit précis du moteur. **Guerrier** ajoute à ta note de match et t\'ouvre le brassard de capitaine, mais multiplie par 1,5 ton risque de blessure et par 1,2 sa gravité. **Bourreau de travail** accélère ta progression de 25 % et te coûte sur les grands matchs. **Ambitieux** multiplie par 1,6 le nombre d\'offres que tu reçois au mercato, au prix du vestiaire et du moral. Il n\'existe aucun trait sans contrepartie : ce serait un bonus déguisé.',
      { encadre: 'Ta générale de départ se situe entre 30 et 40. C\'est volontairement bas : la progression est le cœur du jeu, et la moitié des carrières plafonnent autour de 58. Atteindre 80 arrive à peu près une fois sur huit, et dépasser 85 une fois sur trente.' },

      { h2: 'La semaine, l\'unité de temps du jeu', id: 'semaine' },
      'Une saison fait **44 semaines**, d\'août à juin : 23 journées de championnat, 8 dates de coupe d\'Europe, 8 fenêtres internationales, 3 semaines de phase finale et la trêve. Chaque semaine, il se passe quatre choses.',
      { liste: [
        '**Un match, s\'il y en a un.** Tu le joues, ou tu le regardes se jouer.',
        '**Une séance d\'entraînement** sur le secteur que tu as choisi. Elle tourne en permanence : tu ne cliques pas chaque semaine, tu changes de secteur quand tu veux.',
        '**Une scène de vie.** Le Maître du Jeu te met dans une situation, le vestiaire, l\'argent, les médias, la nuit, et tu réponds en écrivant. Ta réponse est jugée, et elle a des conséquences.',
        '**La récupération.** Ta forme converge vers une condition de base qui dépend de ton endurance et de ton âge. Après 28 ans, cette base descend d\'un point et demi par année.',
      ] },
      '⚠️ Il n\'existe pas de bouton « simuler la saison ». Pour avancer vite, tu cliques une date dans le calendrier : toutes les semaines intermédiaires sont **réellement jouées**, match par match. Un raccourci qui saute les matchs sauterait aussi tes statistiques, et une carrière sans statistiques n\'est pas une carrière.',

      { h2: 'Les divisions amateurs jouent toute l\'année', id: 'amateur' },
      'De la Nationale 2 à la Régionale 3, il n\'y a ni coupe d\'Europe ni internationaux : le championnat continue pendant les fenêtres où le Top 14 s\'arrête. Un club de Fédérale 3 dispute donc **39 week-ends** dans la saison contre 23 pour un club professionnel. C\'est plus de matchs, plus de fatigue, et plus d\'occasions de se faire remarquer.',

      { h2: 'Le mercato se joue sur le réseau social', id: 'mercato' },
      'Il n\'y a pas d\'écran « offres de contrat ». Un club intéressé **t\'écrit un message privé** sur 𝕏 L\'Ovale, le réseau social du jeu, et c\'est à toi de négocier : salaire, prime à la signature, durée, temps de jeu garanti. Chaque levier coûte de la patience, et le club a un plafond caché que tu ne connais pas. Trop insister le fait rompre.',
      { liste: [
        'Sa première offre est volontairement **sous** ce qu\'il peut faire : sans ça, il n\'y aurait rien à négocier.',
        'Le **temps de jeu garanti** coûte deux tours de patience, un club déteste s\'engager sur une feuille de match, mais il vaut 68 de confiance du staff à l\'arrivée au lieu de 50.',
        'Un club ne saute pas deux étages : on ne passe pas de Fédérale 1 au Top 14. Avant 22 ans, il en saute trois, un club professionnel va vraiment chercher un espoir plus bas.',
        'Le transfert ne s\'applique qu\'**à l\'intersaison**, et tu finis ta saison là où tu l\'as commencée.',
      ] },
      'L\'agent, lui, ne se choisit pas dans une liste : il te démarche quand ta cote franchit sa barre. Le cousin est là dès le premier jour, l\'agence internationale à 68, le requin à 74. Et il te lâche après deux saisons ratées d\'affilée.',

      { h2: 'Ce qui peut mal tourner', id: 'consequences' },
      'Le jeu ne punit jamais sans cause, mais il punit vraiment. Une réponse imprudente à une scène dangereuse peut mener à une suspension, à une rupture de contrat, à un accident qui rabote définitivement ta vitesse et ton potentiel, ou à une fin de carrière. Sur le terrain, un carton rouge ou un coup de poing passent devant une commission de discipline après le match : trois à huit semaines en amateur, douze à trente-quatre en professionnel, une saison peut y passer.',
      { encadre: 'Une blessure et une suspension ne s\'additionnent pas : c\'est la plus longue des deux qui compte, l\'autre se soignant pendant.' },

      { h2: 'Raccrocher', id: 'retraite' },
      'La retraite est forcée à 44 ans, mais presque personne n\'y arrive. Le déclin commence à 31 ans et s\'accélère après 34 ; une blessure de fin de carrière peut tout arrêter d\'un coup. À la retraite, ta carrière entre au Hall des Légendes avec son palmarès, son armoire à trophées en 3D, et un score qui la compare à toutes les autres.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'pyramide',
    court: 'La pyramide',
    titre: 'La pyramide du rugby français, de la Régionale 3 au Top 14',
    description: 'Les dix divisions françaises du jeu, 655 clubs réels : ce que représente chaque étage, comment on monte, et pourquoi le bas de la pyramide n\'est pas un décor.',
    chapo: 'Destiny Rugby couvre **dix divisions françaises et 655 clubs réels**, du Top 14 à la Régionale 3. Ce n\'est pas une toile de fond : chaque étage a ses effectifs, son calendrier, son niveau de jeu et ses règles de discipline propres.',
    blocs: [
      { h2: 'Les dix étages', id: 'etages' },
      'Le nombre de clubs est celui de la réalité, pas un arrondi de confort.',
      { tableau: [
        ['Division', 'Clubs', 'Statut'],
        ['Top 14', '14', 'Professionnel'],
        ['Pro D2', '16', 'Professionnel'],
        ['Nationale', '16', 'Professionnel'],
        ['Nationale 2', '26', 'Semi-professionnel'],
        ['Fédérale 1', '48', 'Amateur'],
        ['Fédérale 2', '95', 'Amateur'],
        ['Fédérale 3', '157', 'Amateur'],
        ['Régionale 1', '63', 'Amateur'],
        ['Régionale 2', '60', 'Amateur'],
        ['Régionale 3', '62', 'Amateur'],
      ] },
      'À partir de la Fédérale 1, une division est trop grande pour un championnat unique : elle est découpée en **poules de douze**, comme dans la réalité. La Fédérale 3 en compte treize. Le champion n\'y est donc pas le premier d\'un classement, mais le vainqueur d\'un tournoi final : les premiers de chaque poule, complétés par les meilleurs deuxièmes, s\'affrontent en tableau sec jusqu\'à une finale sur terrain neutre.',

      { h2: 'La coupure professionnelle est à la Nationale 2', id: 'coupure' },
      'Ce n\'est pas une étiquette. Le niveau change **la discipline du match**, et l\'asymétrie est assumée.',
      { tableau: [
        ['', 'Amateur (Nationale 2 et en dessous)', 'Professionnel'],
        ['Bagarres par match', '3,0', '0,4'],
        ['Cartons par match', '2,75', '1,50'],
        ['Suspension après un coup de poing', '5,3 semaines', '20,6 semaines'],
        ['Gestes illégaux sifflés', '1,25 / match', '0,58 / match'],
      ] },
      'En Fédérale, ça part au quart de tour et l\'arbitre distribue les cartes, mais la commission fait dans la semaine et dans le pardon. En Top 14, personne ne relève une provocation ; celui qui craque joue sa saison. C\'est le même moteur, deux mondes.',

      { h2: 'Les clubs bougent vraiment', id: 'mouvements' },
      'Les dix étages sont résolus chaque intersaison, pas seulement celui du joueur : **une quarantaine de clubs changent de division par saison**. Un club de Fédérale 2 peut donc monter, redescendre, remonter, il ne reste pas figé à vie parce que le joueur n\'est pas là pour le regarder.',
      'Chaque division garde sa taille : autant de clubs entrent que de clubs sortent. C\'est vérifié automatiquement sur douze saisons simulées, parce qu\'un déséquilibre d\'une seule place, répété douze fois, transforme le Top 14 en Top 16.',

      { h2: 'La hiérarchie n\'est pas gravée', id: 'generations' },
      'Un club fort ne l\'est pas éternellement. Trois couches se superposent à la force de chaque effectif, toutes déterministes, tirées du nom du club :',
      { liste: [
        'Un **cycle ordinaire** de ±2,2 points, sur une période de sept à onze saisons.',
        'Une **génération dorée**, rare : jusqu\'à +8 points sur quatre à six saisons, en cloche. Elle arrive, elle culmine, elle s\'en va.',
        'Une **traversée du désert**, tout aussi rare : jusqu\'à -6.',
      ] },
      'Mesuré sur douze saisons : 6,1 % des couples club-saison sont en génération dorée, 4,4 % en traversée du désert, et **253 clubs sur 833 sont concernés**. Un club varie en médiane de 7,3 points sur douze ans. Conséquence concrète : sur vingt saisons de Top 14, **cinq clubs différents** sont champions, et six titres sur vingt échappent aux quatre meilleurs de départ.',
      { encadre: 'La génération dorée est volontairement tempérée pour les gros clubs. Sans ce frein, le Stade Toulousain, déjà premier à 86, montait à 92,8 et prenait onze titres sur vingt : la mécanique renforçait celui qui n\'en avait pas besoin. Le creux, lui, n\'est pas tempéré : un gros club doit pouvoir s\'effondrer.' },

      { h2: 'Ce qui est réel, et ce qui ne l\'est pas', id: 'donnees' },
      'La distinction mérite d\'être dite franchement.',
      { liste: [
        '**Réel** : les noms de clubs, leurs villes, leurs écussons, leur hiérarchie (calculée moitié sur le rang de la saison passée, moitié sur les points et la différence de points par match), et les effectifs de 143 clubs professionnels, soit 6 306 joueurs.',
        '**Réel aussi** : 12 086 licenciés amateurs, avec leur nom, leur poste et leur club.',
        '**Tiré** : l\'âge et la note des joueurs amateurs. Les sources n\'en donnent aucun. Ils sont calculés à partir du nom du club et du joueur, donc stables d\'une partie à l\'autre, autour du niveau de la division.',
        '**Tiré aussi** : les effectifs des dix-huit championnats étrangers ajoutés récemment : 5 070 joueurs, avec une part d\'étrangers propre à chaque ligue (6 % en Argentine, 32 % en Serie A Elite).',
      ] },
      'Les effectifs amateurs viennent de bases publiques qui mélangent les sections d\'un même club : on y croise donc des joueuses. C\'est la donnée telle qu\'elle existe.',

      { h2: 'Au-delà de la France', id: 'monde' },
      'Le jeu couvre **trente-trois compétitions de clubs** : Premiership, URC, Super Rugby, NPC, Japan League One, Major League Rugby, Currie Cup, et dix-huit championnats de plus, de la Géorgie au Portugal, et **treize compétitions de sélections**, du Tournoi des 6 Nations au Rugby Europe Championship.',
      'Ce dernier point compte plus qu\'il n\'y paraît : sans lui, un joueur portugais, roumain ou belge très bon n\'aurait jamais été aligné, parce que son équipe ne dispute ni le Tournoi ni la tournée d\'automne. Ces nations ont **cinq fenêtres internationales sur huit**, et un joueur à 78 de générale y est convoqué.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'moteur',
    court: 'Le moteur',
    titre: 'Comment un match de rugby est simulé, joueur par joueur',
    description: 'Trente joueurs, sept pas de simulation par seconde, en mètres réels : le fonctionnement du moteur de match de Destiny Rugby et son étalonnage chiffré.',
    chapo: 'Un match n\'est pas un score tiré au sort puis raconté. Trente joueurs se déplacent réellement sur un terrain de 122 × 70 mètres, la défense monte en ligne, les pods se forment, et le ballon voyage jusqu\'à l\'aile. Voici comment.',
    blocs: [
      { h2: 'Tout est en mètres', id: 'metres' },
      'Le moteur raisonne dans les dimensions réelles : 100 mètres de jeu, deux en-buts de 11 mètres, 70 mètres de large. C\'est ce qui permet d\'écrire les règles telles qu\'elles sont : « le 50/22 vise les 22 adverses », « la ligne de hors-jeu est au dernier pied », au lieu de les approximer en pixels. L\'affichage convertit en pixels ; jamais l\'inverse.',
      'Chaque joueur a une position, un **vecteur vitesse** et une accélération bornée. Il ne se téléporte pas vers sa cible : un ailier lancé décrit une courbe, un pilier met deux secondes à se mettre en route. La simulation avance par pas fixes de 0,15 seconde, soit près de sept fois par seconde de jeu.',

      { h2: 'Le lancement de jeu fait circuler le ballon', id: 'lancement' },
      'À chaque libération de ballon, une combinaison est choisie, et elle contient la **chaîne de passes** : 9 → 10 → 12 → 13 → ailier. C\'est elle qui fait voyager le ballon, et son absence était le défaut majeur de la première version du moteur, chaque porteur cherchait son voisin le plus proche, et la balle tournait sur trois mètres.',
      { tableau: [
        ['Combinaison', 'Chaîne', 'Part des phases'],
        ['Percussion d\'un avant au ras', '9 → avant', '≈ 39 %'],
        ['Bloc d\'avants au premier temps', '9 → 10 → avant', '≈ 20 %'],
        ['Un temps sur les centres', '9 → 10 → 12', '≈ 13 %'],
        ['Jusqu\'à l\'aile, ou passe sautée', '9 → 10 → 12 → 13 → ailier', '≈ 15 %'],
        ['Jeu au pied', '9 → botteur', '≈ 10 %'],
      ] },
      'Le percuteur tourne : parmi les quatre avants les plus proches et hors du ruck, c\'est celui qui a le moins porté qui part. Prendre « l\'avant le plus proche » revenait à toujours désigner les mêmes, et les piliers finissaient le match à zéro mètre.',

      { h2: 'La défense monte en deux rideaux', id: 'defense' },
      'Douze joueurs à plat, espacés d\'environ 4,5 mètres, appariés à leurs cibles **par ordre de largeur**, sans ça ils se croisent et le rideau se noue. Derrière, l\'arrière couvre le fond entre 11 et 30 mètres selon la menace, l\'ailier du côté fermé fait le pendule, et le demi de mêlée tient la sentinelle.',
      'Deux chasseurs, trois au maximum, montent sur le porteur. Tout le reste tient sa place. Le second rideau ne bouge que si la ligne est **vraiment** franchie, mesurée sur les positions réelles : sans cette règle, les quinze joueurs couraient après le ballon. Résultat mesuré : 1,4 défenseur à moins de six mètres du porteur, contre quinze avant correction.',
      'Trois systèmes s\'alternent selon la situation : **montante** (blitz, 4,4 m/s, parapluie vers l\'extérieur), **glissée** (tout le rideau décalé de 3,4 mètres vers la touche, on pousse dehors), **repli** (on couvre le jeu au pied).',

      { h2: 'Le score reste celui de la ligue', id: 'score' },
      'C\'est la contrainte qui structure tout le reste. Le score final vient du même calcul que pour les autres rencontres de la journée, c\'est lui qui alimente le classement, les montées et les coupes. On ne peut pas laisser le moteur inventer un 248-207.',
      'Il est donc décomposé à l\'avance en événements plausibles, essais transformés, essais secs, pénalités, puis le moteur joue librement en suivant un échéancier. Le réglage est **asymétrique** : une équipe en retard sur son plan trouve un peu d\'espace, une équipe en avance se heurte à un mur. À partir de la soixantième minute, l\'écart pèse deux fois plus lourd.',
      { encadre: 'Vérifié sur trente matchs : zéro écart entre le score du moteur et celui de la ligue. Le joueur change comment on marque, jamais combien.' },

      { h2: 'L\'étalonnage, en chiffres', id: 'etalonnage' },
      'Chaque valeur est mesurée automatiquement et comparée à la fourchette du rugby professionnel.',
      { tableau: [
        ['', 'Mesuré', 'Rugby professionnel'],
        ['Points par match', '42,8', '40 à 55'],
        ['Essais', '5,4', '4 à 8'],
        ['Plaquages réussis', '248', '180 à 280'],
        ['Passes', '446', '280 à 460'],
        ['Rucks', '149', '110 à 180'],
        ['Mêlées', '12', '8 à 18'],
        ['Touches', '34', '20 à 34'],
        ['Pénalités sifflées', '19,6', '14 à 26'],
        ['Coups de pied', '52', '35 à 60'],
        ['Cartons jaunes', '1,2', '0,8 à 3'],
      ] },
      'Le ballon circule : **44 joueurs sur 46 le touchent**, aucun maillot à zéro. Le demi de mêlée en porte 31 %, l\'ouvreur 21 %, les avants 20 % à eux huit, le trio arrière 11 %.',

      { h2: 'Prendre la main sur son joueur', id: 'controle' },
      'On peut piloter son propre pion. Pas au joystick sur les trente, seulement le sien, avec des **intentions de rugbyman** que le moteur joue avec ses propres règles : plaquer, gratter, crocheter, raffuter, réclamer le ballon, passer à gauche ou à droite, taper.',
      'Deux principes rendent ça jouable. D\'abord, une intention est **armée, pas instantanée** : « je plaque » ne veut rien dire quand le porteur est à quinze mètres, alors l\'ordre reste valable quelques secondes puis expire. Ensuite, chaque geste **coûte**, de l\'endurance à la demande, et un geste raté coûte plus qu\'il ne rapporte : un plaquage lancé et manqué laisse un trou de trois secondes.',
      'Chaque action porte aussi un temps de recharge. Sans lui, mesuré au banc d\'essai : un joueur qui réclame le ballon dès que possible finissait à **soixante ballons portés**, un troisième ligne en porte douze.',

      { h2: 'Le temps du match n\'est pas linéaire', id: 'temps' },
      'Un match contient environ 35 minutes de ballon vivant sur 80. L\'horloge défile donc beaucoup plus vite pendant les arrêts : une mêlée se met en place en cinq secondes à l\'écran et avale cinquante secondes au chronomètre.',
      'Quand on pilote, le jeu file à neuf fois la vitesse réelle tant qu\'il ne se passe rien pour toi, et **retombe en temps réel** dès qu\'un ballon arrive sur toi ou qu\'un porteur te fonce dessus. Mesuré : 24 % du match joué au ralenti, et un match complet en **onze minutes de manette**.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'journal',
    court: 'Journal',
    titre: 'Journal de développement : ce qui a été corrigé, et pourquoi',
    description: 'Les grands chantiers du jeu, les bugs trouvés en mesurant plutôt qu\'en regardant, et les décisions de conception qui ont été renversées.',
    chapo: 'Ce journal ne liste pas des fonctionnalités : il raconte des **erreurs mesurées**. La plupart des corrections décrites ici viennent d\'un chiffre qui ne collait pas, pas d\'un défaut visible à l\'écran.',
    blocs: [
      { h2: 'Le moteur de match a été réécrit de zéro', id: 'moteur' },
      'La première version produisait des scores de **248-207**, 64 essais par match, aucune mêlée ni touche, 530 tentatives de 50/22, et seuls quatre joueurs touchaient le ballon. Il n\'en reste rien.',
      'Ce qui l\'a remplacée tient en trois idées : un déplacement à inertie (chaque joueur a un vecteur vitesse), une chaîne de passes décidée à chaque libération de ballon, et une défense en deux rideaux qui ne se rue pas toute entière sur le porteur.',

      { h2: 'Le classement était réellement impossible à atteindre', id: 'difficulte' },
      'L\'étalonnage de la progression a été mesuré sur cent carrières de douze saisons. Le premier réglage donnait une générale médiane de 42 et un **maximum de 76** : personne n\'atteignait jamais 80, et il tombait 0,02 titre par carrière. Ce n\'était pas exigeant, c\'était fermé.',
      { tableau: [
        ['', 'Avant', 'Après'],
        ['Générale médiane', '42', '58 à 63'],
        ['90ᵉ centile', '-', '80'],
        ['Maximum', '76', '85 à 90'],
        ['Carrières ≥ 80', '0 / 100', '10 à 15 / 100'],
      ] },
      'Le levier corrigé ne profite qu\'aux joueurs qui ont **de la marge à rattraper** entre leur niveau et leur potentiel. Un joueur né sans potentiel ne perce toujours pas : il n\'a rien à combler.',

      { h2: 'La forme ne remontait jamais', id: 'forme' },
      'Signalé en jeu : « impossible de récupérer de la forme, à la moitié de la saison on est à zéro ». Le bilan d\'une semaine de match était **structurellement négatif**, environ -10 par semaine de match, contre +6 les week-ends sans match. Sur trente semaines de match, le joueur touchait le fond avant Noël et n\'en ressortait plus.',
      'La correction n\'est pas un bonus fixe : c\'est une **convergence** vers une condition de base qui dépend de l\'endurance et de l\'âge. Un bonus fixe a le défaut inverse, trop petit il ne change rien, trop grand tout le monde reste à 100 et la forme ne veut plus rien dire.',

      { h2: 'Un test au vert devant un écran cassé', id: 'armoire' },
      'L\'armoire à trophées en 3D affichait « aucun chevauchement » pendant que des trophées se superposaient à l\'écran. Trois causes se cumulaient, et aucune n\'était visible à la relecture : l\'échelle d\'une pièce ne regardait que sa hauteur (un bouclier mis à hauteur de buste fait deux fois la largeur de sa case), le décalage aléatoire était calculé en part de case plutôt qu\'en espace réellement libre, et **la rotation des pièces n\'était comptée nulle part**, une pièce pivotée de 30° occupe au sol jusqu\'à moitié plus de largeur.',
      { encadre: 'La leçon a été appliquée ailleurs : on ne mesure plus jamais un compteur en lisant le texte affiché. « Plaquage haut » figurait déjà comme habillage aléatoire de n\'importe quelle pénalité, le compter dans les phrases donnait 5,75 gestes illégaux par match au lieu de 1,25.' },

      { h2: 'Une règle de conception renversée', id: 'bagarres' },
      'Le système de bagarres posait au départ : « on ne déclenche jamais une bagarre au hasard, elle est toujours la suite d\'un geste du joueur ». Intention louable, résultat en jeu : **rien n\'arrivait jamais** si l\'on ne cliquait pas sur « chambrer », et l\'équipe adverse était un décor poli.',
      'Le match s\'échauffe maintenant tout seul, deux adversaires proches se cherchent, la température monte, et un plaquage haut peut échapper à n\'importe lequel des trente joueurs, d\'autant plus qu\'il est fatigué. Mais le principe de fond tient : une friction adverse ne coûte rien au joueur tant qu\'il n\'y répond pas. C\'est l\'autre qui prend la pénalité.',

      { h2: 'Les scripts de mesure eux-mêmes peuvent mentir', id: 'mesure' },
      'C\'est le piège le plus coûteux du projet, et il s\'est produit deux fois. Après la suppression du mode « saison rapide », les scripts d\'étalonnage enchaînaient des fins de saison sans jamais jouer les semaines : chaque saison se terminait avec zéro match et zéro essai, et la mesure annonçait une générale médiane de 40 là où le jeu réel en produisait 63.',
      'Un banc d\'essai faux est pire qu\'une absence de banc d\'essai : on corrige le jeu pour compenser un test cassé. La règle retenue : quand un chiffre surprend, on vérifie d\'abord l\'instrument.',

      { h2: 'Ce qui ne bouge jamais', id: 'invariants' },
      { liste: [
        '**Le score du match est celui de la ligue.** Vérifié à chaque modification du moteur.',
        '**Le déterminisme.** Deux parties identiques donnent le même match, à la minute près. Rien ne vit dans une variable de module : deux matchs simulés en parallèle se la partageraient.',
        '**Le jeu reste entier sans intelligence artificielle.** Situations, scénarios et jugement des réponses ont tous un équivalent écrit à l\'avance.',
        '**Ce qui s\'achète est cosmétique.** Aucun objet de la boutique ne touche à un attribut, à la forme ou au potentiel.',
      ] },
    ],
  },
];

module.exports = { PAGES, SITE };
