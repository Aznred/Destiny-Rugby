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
    slug: 'wiki',
    court: 'Wiki',
    classe: 'page-wiki',
    sansSommaire: true,
    titre: 'Wiki Destiny Rugby : deux carrières, deux façons de vivre le rugby',
    description: 'Le centre d’aide illustré de Destiny Rugby : guides complets de la carrière joueur et de la carrière entraîneur, mécaniques, écrans et conseils.',
    chapo: 'Entre sur le terrain comme **joueur**, ou dirige tout un club comme **entraîneur**. Ce wiki explique les deux boucles de jeu écran par écran, ce que chaque décision change réellement, et les erreurs à éviter pendant une longue carrière.',
    suite: ['wiki/carriere-joueur', 'wiki/carriere-entraineur', 'guide', 'moteur'],
    blocs: [
      { h2: 'Choisis ton parcours', id: 'parcours' },
      'Les deux carrières partagent le même monde, le même calendrier et le même moteur de match. Ce qui change, c’est ton pouvoir : un joueur ne décide que pour lui-même ; un entraîneur porte les résultats, les contrats et l’avenir du club entier.',
      { cartesWiki: [
        {
          href: '/wiki/carriere-joueur/',
          image: '/images/wiki/carriere-joueur.png',
          surtitre: 'De 16 à 44 ans',
          titre: 'Carrière joueur',
          texte: 'Crée ton rugbyman, gagne ta place, progresse, négocie tes contrats et construis un palmarès jusqu’à la retraite.',
          action: 'Ouvrir le guide joueur',
        },
        {
          href: '/wiki/carriere-entraineur/',
          image: '/images/wiki/carriere-entraineur.png',
          surtitre: 'Du premier banc au sommet',
          titre: 'Carrière entraîneur',
          texte: 'Compose ton XV, entraîne, recrute, gère le vestiaire et réponds aux objectifs de la direction saison après saison.',
          action: 'Ouvrir le guide entraîneur',
        },
      ] },

      { h2: 'Les différences essentielles', id: 'differences' },
      { tableau: [
        ['Sujet', 'Carrière joueur', 'Carrière entraîneur'],
        ['Point de vue', 'Un seul rugbyman', 'Un club entier et éventuellement une sélection'],
        ['Départ', '16 à 30 ans, club français au choix', '20 à 60 ans, premier banc selon le prestige'],
        ['Match', 'Décisions de ton joueur pendant le direct', 'Composition, plan de jeu, banc et consignes en direct'],
        ['Progression', 'Attributs, potentiel, forme, moral, réputation', 'Prestige, profil tactique, confiance et réputation internationale'],
        ['Marché', 'Les clubs et agents te contactent', 'Tu observes, négocies et finances les recrues'],
        ['Échec possible', 'Banc, blessure, suspension, carrière écourtée', 'Promesse rompue, budget raté, vestiaire perdu, licenciement'],
        ['Trace laissée', 'Statistiques, titres et distinctions', 'Trophées, records, identité de jeu et histoire du club'],
      ] },

      { h2: 'Comment utiliser ce wiki', id: 'utiliser' },
      { parcours: [
        { titre: 'Commencer', texte: 'Lis d’abord la création et les choix qui ne pourront plus être modifiés.' },
        { titre: 'Comprendre', texte: 'Repère la boucle d’une semaine avant d’avancer la première saison.' },
        { titre: 'Décider', texte: 'Consulte les sections match, progression ou marché quand une décision arrive.' },
        { titre: 'Construire', texte: 'Reviens aux conseils de long terme avant l’intersaison et les changements de club.' },
      ] },
      { encadre: 'La carrière entraîneur est encore masquée dans la version publique pendant sa stabilisation. En développement elle est ouverte automatiquement ; sur une version de test, ajoute `?dev=1` à l’adresse. Le wiki la documente entièrement pour préparer sa sortie.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'wiki/carriere-joueur',
    court: 'Carrière joueur',
    classe: 'page-wiki',
    imageSociale: '/images/wiki/carriere-joueur.png',
    titre: 'Carrière joueur : de la première licence à la légende',
    description: 'Wiki illustré de la carrière joueur dans Destiny Rugby : création, semaines, matchs, progression, mercato, sélections, blessures et retraite.',
    chapo: 'Tu incarnes **un seul rugbyman**. Ta place dans le XV, ton niveau, tes contrats et ta réputation se gagnent semaine après semaine. Ce guide suit tout le parcours, de la création du joueur jusqu’au Hall des Légendes.',
    suite: ['wiki', 'wiki/carriere-entraineur', 'guide', 'moteur', 'pyramide'],
    blocs: [
      {
        image: '/images/wiki/carriere-joueur.png',
        alt: 'Un jeune rugbyman quitte le tunnel des vestiaires et regarde le terrain éclairé qui l’attend.',
        legende: 'La carrière joueur commence modestement : une place dans le groupe, une semaine après l’autre, puis peut mener jusqu’aux plus grands stades.',
        prioritaire: true,
      },

      { h2: 'La boucle complète en un regard', id: 'boucle' },
      { parcours: [
        { titre: 'Créer', texte: 'Poste, nation, club, âge et deux traits façonnent le départ.' },
        { titre: 'Vivre la semaine', texte: 'Entraînement, match, récupération et événement hors terrain.' },
        { titre: 'Faire sa saison', texte: 'Le temps de jeu et les statistiques produisent une vraie note de saison.' },
        { titre: 'Choisir la suite', texte: 'Prolonger, signer ailleurs, viser une sélection ou préparer la retraite.' },
      ] },
      'Une saison dure **44 semaines**, d’août à juin. Toutes les dates intermédiaires sont jouées, même quand tu avances directement jusqu’à un rendez-vous plus lointain : le championnat, la fatigue, les blessures et les statistiques ne sont jamais sautés.',

      { h2: '1. Créer son joueur', id: 'creation-joueur' },
      'Tu peux commencer entre **16 et 30 ans**. Commencer jeune donne plus de saisons pour atteindre le potentiel ; commencer plus tard crée une carrière courte, déjà sous pression. Le choix de la nation ouvre ensuite les sélections U20 puis seniors quand ton niveau le permet.',
      { h3: 'Le poste définit ce que le jeu attend de toi' },
      'Les quinze postes sont jouables. La note de match n’emploie pas le même barème pour tout le monde : un pilier est récompensé pour la mêlée, le travail au ras et les plaquages ; un demi d’ouverture pour la distribution et le pied ; un ailier pour les mètres, les franchissements et les essais. Choisis le métier que tu veux exercer, pas seulement les attributs les plus élevés au départ.',
      { tableau: [
        ['Famille', 'Postes', 'Ce qui pèse particulièrement'],
        ['Première ligne', '1, 2, 3', 'Mêlée, touches du talonneur, ballons portés, plaquages'],
        ['Deuxième / troisième ligne', '4 à 8', 'Conquête, activité défensive, mètres au contact, grattages'],
        ['Charnière', '9, 10', 'Passes, animation, occupation, jeu au pied et décisions'],
        ['Centres', '12, 13', 'Franchissements, défense, création et continuité'],
        ['Triangle arrière', '11, 14, 15', 'Mètres, essais, réceptions, relances et couverture au pied'],
      ] },
      { h3: 'Le club fixe la difficulté immédiate' },
      'Les **655 clubs français** et les dix divisions, de la Régionale 3 au Top 14, sont disponibles au départ. Dans un petit club, tu joues davantage mais les infrastructures et la visibilité sont modestes. Dans un grand club, la concurrence à ton poste peut te garder hors du groupe. La force de l’effectif, pas le prestige du nom, décide de ton temps de jeu.',
      { h3: 'Deux traits, pour toute la carrière' },
      'Tu choisis deux traits de caractère parmi douze. Chaque avantage possède une contrepartie : **Guerrier** aide la note et le capitanat mais augmente le risque et la gravité des blessures ; **Bourreau de travail** accélère la progression mais coûte dans les grands rendez-vous ; **Ambitieux** attire davantage d’offres mais fragilise le moral et le vestiaire. Ils ne pourront pas être remplacés ensuite.',
      { encadre: 'Bon réflexe : ouvre l’effectif dès la création. Compare ta note aux joueurs du même poste. C’est la façon la plus sûre de savoir si tu seras titulaire, remplaçant ou hors groupe.' },

      { h2: '2. Lire l’écran Carrière', id: 'ecran-carriere' },
      'Le bureau du joueur rassemble quatre informations qu’il faut lire ensemble : **ta fiche** indique forme, moral et état physique ; **le calendrier** montre le prochain rendez-vous ; **le journal** garde les conséquences de tes choix ; **le classement latéral** situe ton club sans quitter la semaine en cours.',
      { liste: [
        '**Carrière** : avancer, répondre au Maître du Jeu et suivre la semaine.',
        '**Profil** : consulter les statistiques, le palmarès, les faits marquants et la note globale.',
        '**Mon équipe** : comprendre la concurrence dans ton club ou ta sélection.',
        '**Résultats** : lire les championnats, coupes, classements individuels et rencontres internationales.',
        '**𝕏 L’Ovale** : suivre l’actualité, les réactions et surtout les messages privés des clubs et agents.',
      ] },

      { h2: '3. Jouer une semaine', id: 'semaine-joueur' },
      'Chaque semaine peut combiner un match, une séance d’entraînement, une scène de vie et la récupération. Certaines semaines n’ont pas de match, mais elles font quand même évoluer l’état du joueur et du monde.',
      { h3: 'L’entraînement est une orientation continue' },
      'Tu choisis un secteur de travail, puis il reste actif jusqu’à ce que tu le changes. La progression dépend de l’âge, du potentiel, de la formation du club et du trait de travail. Se disperser en changeant à chaque semaine est rarement utile : renforce d’abord les attributs clés de ton poste, puis corrige un point faible précis.',
      { h3: 'La forme et le moral ne sont pas des décorations' },
      'La forme revient vers une base qui dépend de l’endurance et de l’âge. Le moral, la confiance du staff, une blessure ou une suspension peuvent peser sur la sélection et la performance. Après 28 ans, la récupération de base descend progressivement ; après 31 ans, le déclin des attributs commence à compter dans le bilan de saison.',
      { h3: 'La vie hors du terrain a de vraies conséquences' },
      'Vestiaire, médias, argent, proches, soirées et discipline produisent des choix ou des réponses libres. Le jugement peut faire bouger moral, réputation, argent et relations. Une décision grave peut mener à une suspension, une rupture de contrat, une perte définitive de potentiel ou une fin de carrière. Le jeu reste jouable sans service d’intelligence artificielle : chaque situation possède un scénario et un barème local.',

      { h2: '4. Le match : décider au bon moment', id: 'match-joueur' },
      'Le moteur joue les trente rugbymen sur un terrain aux dimensions réelles. Tu ne diriges pas toute l’équipe : le direct ralentit quand ton joueur doit prendre une décision. Chaque carte annonce la **chance exacte de réussite**, ce que la réussite apporte et ce que l’échec risque de coûter.',
      { liste: [
        '**En attaque** : passer, conserver, crocheter, raffuter, jouer après contact, taper ou tenter un geste lié au poste.',
        '**En défense** : plaquer, gratter, monter, couvrir ou contenir selon la situation.',
        '**Après une percée** : une seconde décision peut s’enchaîner immédiatement ; le combo s’arrête après deux maillons.',
        '**Si tu ne choisis rien** : le moteur poursuit le match normalement. Ton absence de clic ne bloque pas les vingt-neuf autres joueurs.',
      ] },
      'La feuille de match conserve **23 familles de statistiques par joueur** : essais, mètres, franchissements, passes décisives, plaquages, grattages, mêlées, touches, jeu au pied, discipline et bien d’autres. La note finale vient de ces faits et du rôle de ton poste, pas d’un récit estimé.',
      { encadre: 'Un pourcentage élevé n’est pas toujours le meilleur choix. À 74 minutes, une pénalité de sécurité peut valoir plus qu’un geste spectaculaire à 82 %, surtout si ta forme est basse.' },

      { h2: '5. Gagner sa place et progresser', id: 'progression-joueur' },
      'Le temps de jeu compare ton niveau aux concurrents du même poste. Être dans un club plus fort n’accélère pas automatiquement une carrière : passer une saison hors du groupe produit peu de statistiques et dégrade le bilan. À l’inverse, être un cadre dans une division inférieure peut construire une saison notée très haut.',
      'À l’intersaison, la note de saison assemble temps de jeu, statistiques attendues pour le poste, niveau face au groupe, forme, moral et rang du club. Elle distribue ensuite la progression vers les attributs clés, fait bouger le potentiel et alimente la cote sur le marché. Les jeunes bénéficient de la formation ; les joueurs en fin de carrière doivent compenser le déclin par la performance et le choix du bon niveau.',

      { h2: '6. Contrats, agents et transferts', id: 'mercato-joueur' },
      'Il n’existe pas de grand panneau magique d’offres. Tout passe par les messages privés de **𝕏 L’Ovale**. Un badge signale qu’un club ou un agent t’a écrit. Un club ne démarche en principe qu’un joueur à qui il reste au plus un an de contrat : avec un contrat initial de deux ou trois ans, le premier mercato peut donc tarder.',
      { parcours: [
        { titre: 'Approche', texte: 'Le club ouvre une conversation privée et présente son projet.' },
        { titre: 'Négociation', texte: 'Salaire, prime, durée et temps de jeu garanti consomment sa patience.' },
        { titre: 'Préaccord', texte: 'La signature est enregistrée, mais tu restes dans ton club actuel.' },
        { titre: 'Intersaison', texte: 'Le transfert devient effectif après le dernier match et les titres.' },
      ] },
      'Le plafond du club reste caché. Accepter vite sécurise l’offre ; insister peut améliorer les conditions ou rompre entièrement le dossier. Les clubs ne sautent normalement pas deux étages, sauf pour les très jeunes espoirs. Ta nation, le pays où tu joues, la réputation, l’âge et l’agent modifient aussi les destinations possibles.',

      { h2: '7. Sélections, titres et réputation', id: 'selection-joueur' },
      'Les groupes nationaux réunissent les meilleurs joueurs disponibles du pays, tous clubs confondus. Une convocation dépend du poste, du niveau et de la concurrence réelle. Les U20 ouvrent une première porte aux jeunes ; les sélections seniors et leurs compétitions deviennent ensuite un second calendrier.',
      'Titres de club, compétitions internationales et **distinctions individuelles** sont séparés. Les honneurs individuels comparent ta saison, tes statistiques de poste, le rang du club, les grands matchs et la réputation à un rival qui change chaque année. Les trophées gagnés rejoignent l’armoire 3D et la carrière conserve chaque saison dans son palmarès.',

      { h2: '8. Blessures, discipline et fin de carrière', id: 'fin-joueur' },
      'Une blessure peut réduire la forme, éloigner du groupe ou modifier définitivement vitesse et potentiel. Une suspension se règle après le match devant la commission : les sanctions professionnelles sont plus lourdes qu’en amateur. Si blessure et suspension se chevauchent, seule la plus longue absence commande la date de retour.',
      'Le déclin commence à **31 ans** et s’accélère après 34. La retraite est forcée au plus tard à 44 ans, mais tu peux raccrocher avant depuis l’écran Carrière. La fiche finale rejoint le Hall des Légendes avec les statistiques, titres, distinctions, faits marquants et un score comparable aux autres carrières. Une reconversion peut ensuite ouvrir la carrière entraîneur avec un prestige de départ calculé sur ce que le joueur a réellement accompli.',

      { h2: 'Les cinq réflexes qui évitent une saison perdue', id: 'conseils-joueur' },
      { liste: [
        '**Regarde la concurrence avant de signer.** Une division plus haute ne vaut rien si trois meilleurs joueurs ferment ton poste.',
        '**Garde de la forme pour les grandes semaines.** Coupe d’Europe, sélection et phase finale peuvent se suivre.',
        '**Lis les messages privés.** Les agents, prolongations et offres n’arrivent nulle part ailleurs.',
        '**Juge une offre sur le rôle, pas seulement le salaire.** Le temps de jeu nourrit toute la progression suivante.',
        '**Prépare la sortie.** Après 31 ans, une baisse de niveau ou un retour dans une division plus faible peut prolonger la carrière et le palmarès.',
      ] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'wiki/carriere-entraineur',
    court: 'Carrière entraîneur',
    classe: 'page-wiki',
    imageSociale: '/images/wiki/carriere-entraineur.png',
    titre: 'Carrière entraîneur : bâtir un club, gagner et durer',
    description: 'Wiki illustré du mode entraîneur de Destiny Rugby : prestige, direction, composition, tactiques, recrutement, vestiaire, staff et histoire du club.',
    chapo: 'Tu ne joues plus un homme : tu réponds de **tout le club**. Choisir les vingt-trois, protéger un blessé, tenir une promesse, recruter dans le budget et gagner le dimanche composent une seule carrière.',
    suite: ['wiki', 'wiki/carriere-joueur', 'moteur', 'pyramide', 'journal'],
    blocs: [
      {
        image: '/images/wiki/carriere-entraineur.png',
        alt: 'Un entraîneur de rugby déplace les pions de son tableau tactique au bord d’un terrain sous la pluie.',
        legende: 'Le prestige ouvre les portes, mais ce sont les objectifs, le vestiaire et les résultats qui permettent de rester sur le banc.',
        prioritaire: true,
      },
      { encadre: 'État actuel : ce mode est complet mais encore masqué au public pendant sa stabilisation. Il est visible automatiquement en développement et via `?dev=1` sur une version de test.' },

      { h2: 'La boucle complète en un regard', id: 'boucle-entraineur' },
      { parcours: [
        { titre: 'Préparer', texte: 'Effectif, responsabilités, entraînement, médical et objectifs.' },
        { titre: 'Composer', texte: 'Quinze titulaires, huit remplaçants, capitaine, buteur et plan.' },
        { titre: 'Coacher', texte: 'Consignes, rythme et changements jusqu’à la sirène.' },
        { titre: 'Construire', texte: 'Bilan, recrutement, contrats, prestige et prochain projet.' },
      ] },
      'La carrière entraîneur utilise le même monde que la carrière joueur, mais à l’échelle d’un club. Les résultats coachés remplacent les scores théoriques dans le calendrier et le classement. Les transferts changent réellement les effectifs et la force des équipes. Le monde conserve donc les conséquences de tes saisons.',

      { h2: '1. Commencer sa carrière', id: 'creation-entraineur' },
      'Un entraîneur peut commencer entre **20 et 60 ans** et poursuit au plus tard jusqu’à 80 ans. Trois portes existent : la carrière classique, la reconversion d’un ancien joueur et le mode libre.',
      { tableau: [
        ['Départ', 'Prestige initial', 'Règle'],
        ['Carrière classique', '6', 'Premiers bancs en Régionale ; carrière classée'],
        ['Reconversion joueur', '12 à 48', 'Selon le niveau, la longévité et le palmarès du joueur ; carrière mixte classée'],
        ['Mode libre', 'Accès direct au club choisi', 'Aucune place au classement mondial'],
      ] },
      'Un grand joueur ne devient pas automatiquement un entraîneur d’élite. Même la meilleure reconversion plafonne à 48 de prestige : assez pour recevoir des projets solides, pas pour s’installer directement sur le banc d’un géant. La partie doit encore raconter une ascension.',
      { h3: 'Le prestige est ta clé d’accès' },
      'Le prestige va de 0 à 100 et fixe les clubs prêts à étudier ta candidature. À 6, quelques dizaines de clubs régionaux sont ouverts ; à 40, une grande partie du monde jusqu’à la Fédérale 1 devient accessible ; à 60, les projets de Nationale entrent dans la course ; à 100, les **855 clubs des 33 compétitions** peuvent appeler.',

      { h2: '2. Le bureau de l’entraîneur', id: 'bureau-entraineur' },
      'Le bureau est un poste de travail, pas une page de statistiques. Il rassemble le prochain match, les objectifs, la confiance, les budgets, les nouvelles du club et l’accès aux décisions. Les autres vues répondent chacune à une question précise.',
      { tableau: [
        ['Espace', 'À quoi il sert'],
        ['Bureau', 'Voir l’urgence de la semaine, la confiance, le prestige, les budgets et le prochain match'],
        ['Composition', 'Construire la feuille 1 à 23, choisir capitaine, buteur et remplaçants'],
        ['Match', 'Lancer la rencontre et modifier les consignes en direct'],
        ['Marché', 'Chercher des joueurs dans tous les championnats et ouvrir un dossier'],
        ['Négociations', 'Suivre patience, conditions, indemnité et marge budgétaire'],
        ['Direction', 'Lire les objectifs pondérés et la confiance du président'],
        ['Vestiaire', 'Gérer hiérarchie, satisfaction, promesses, leadership et capitaines'],
        ['Monde', 'Suivre les autres entraîneurs, sélections, événements et mouvements'],
        ['Histoire', 'Relire champions, records, derbys, chronologie et figures du club'],
      ] },

      { h2: '3. Une semaine ne se saute pas', id: 'semaine-entraineur' },
      'Chaque semaine peut présenter une décision stable, tirée à partir du club, de la saison et de la date. Stabilité, ambition sportive et prudence financière n’ont pas les mêmes effets. Tant que la décision n’est pas résolue, le calendrier refuse d’avancer. Une semaine de match reste également verrouillée jusqu’à la sirène.',
      { liste: [
        '**Avant le match** : vérifier disponibilités, fatigue, sélectionnés et feuille 1 à 23.',
        '**Pendant le match** : adapter rythme, défense, occupation, stratégie de pénalité et banc.',
        '**Après le match** : lire le score réel, les blessures, la réaction du vestiaire et les objectifs concernés.',
        '**Sans match** : traiter direction, recrutement, entraînement, contrat ou scène de club avant la date suivante.',
      ] },

      { h2: '4. Direction, confiance et licenciement', id: 'direction' },
      'La direction ne juge jamais le rang brut. Elle compare le résultat aux moyens et à plusieurs objectifs pondérés : sportif, finances, formation, recrutement et identité. Finir huitième avec le budget du dernier peut être une réussite ; finir troisième avec le meilleur effectif peut être un échec.',
      'La **confiance du président** et celle des **supporters** sont séparées. Le président regarde le projet et les engagements ; les publics traditionnels, passionnés, familiaux ou occasionnels ne réagissent pas aux mêmes décisions. Sous 18 de confiance du board, le licenciement devient la conclusion de la saison. Tu conserves ton prestige et peux rebondir ailleurs.',
      { encadre: 'Lis les pondérations avant de recruter. Si la formation et les finances valent plus que le classement, une recrue chère de 31 ans peut faire gagner trois matchs et perdre le verdict de saison.' },

      { h2: '5. Composer le XV', id: 'composition' },
      'La feuille contient **15 titulaires et 8 remplaçants**. Le squad builder place les cartes sur un terrain vertical et affiche les attributs utiles au poste, l’adéquation, la cohésion du secteur et l’état médical. Un joueur choisi deux fois est échangé, jamais dupliqué.',
      { liste: [
        '**Poste naturel** : une grosse note générale ne compense pas toujours une mauvaise adéquation.',
        '**Cohésion** : les relations et l’habitude de jouer ensemble renforcent les secteurs.',
        '**État médical** : disponible ne signifie pas sans risque ; forcer peut transformer une douleur en longue absence.',
        '**Capitanat** : capitaine, vice-capitaine et troisième capitaine forment une hiérarchie persistante.',
        '**Buteur** : il est choisi séparément du capitaine et doit réellement posséder le pied nécessaire.',
      ] },
      'Retirer le brassard à une figure locale peut toucher le joueur, le groupe et les supporters. À l’inverse, choisir uniquement le plus célèbre sans tenir compte du leadership pénalise le terrain. Le bon capitaine est une décision sportive et humaine.',

      { h2: '6. Construire et modifier le plan de jeu', id: 'tactique' },
      'Le plan initial commande réellement le moteur. Il règle le jeu avec ballon — équilibré, avants, large ou occupation —, la défense — blitz, glissée ou repli —, le rythme, les choix sur pénalité et l’heure prévue du banc.',
      { tableau: [
        ['Réglage', 'Effet principal', 'Risque'],
        ['Avants', 'Plus de jeu près des rucks et de puissance', 'Prévisible, fatigue du paquet'],
        ['Large', 'Davantage de chaînes de passes et d’espace', 'Turnovers et défense exposée'],
        ['Occupation', 'Plus de pression territoriale au pied', 'Rendre la possession'],
        ['Rythme élevé', 'Actions plus rapides et pression accrue', 'Fatigue et lucidité en fin de match'],
        ['Blitz', 'Montée agressive et pression sur les lanceurs', 'Intervalle derrière la ligne'],
        ['Glissée / repli', 'Protège l’extérieur et la profondeur', 'Laisse du temps au porteur'],
      ] },
      'Toutes les consignes restent modifiables pendant les 80 minutes. Un changement manuel part au prochain arrêt de jeu ; le banc automatique suit le timing prévu. Les plans joués construisent aussi ton identité de coach — jeu au large, occupation, possession, rythme, défense agressive et conquête — qui influence ensuite la compatibilité avec les clubs.',

      { h2: '7. Recruter sans aveugler le club', id: 'recrutement' },
      'Le marché mondial part des joueurs réellement présents dans les effectifs. Les inconnus apparaissent avec des fourchettes : l’observation, le niveau du recruteur, l’âge et la connaissance du pays resserrent le rapport. Une réputation ou une belle carte ne remplace pas le scouting.',
      { parcours: [
        { titre: 'Observer', texte: 'Le recruteur réduit l’incertitude sur note, potentiel et adaptation.' },
        { titre: 'Contacter', texte: 'La conversation privée s’ouvre sur 𝕏 L’Ovale.' },
        { titre: 'Négocier', texte: 'Salaire, prime, durée et rôle affrontent patience et ambition cachée.' },
        { titre: 'Signer', texte: 'Indemnité, prime et salaire sont contrôlés avant le transfert réel.' },
      ] },
      'Deux enveloppes ne doivent pas être confondues : le **budget transferts** paie l’indemnité et la prime ; le **budget salarial** absorbe le salaire annuel. Un accord verbal peut donc échouer au contrôle final si l’une des marges manque. Après signature, le joueur quitte vraiment son ancien club, rejoint ton effectif et change la force utilisée par les futurs résultats.',
      { h3: 'Le joueur choisit aussi' },
      'Les relations, la langue, le pays, les compatriotes, le temps d’adaptation et une ambition cachée entrent dans la décision. Une meilleure offre financière peut être refusée si le rôle, le niveau du championnat ou le projet contredit les attentes du joueur. Les agents conservent leur mémoire des négociations précédentes.',

      { h2: '8. Vestiaire, promesses et médical', id: 'vestiaire' },
      'Le vestiaire possède une hiérarchie, des personnalités et une satisfaction individuelle. Une discussion propose plusieurs réponses ; une parole engageante devient une **promesse datée** que le jeu vérifie. Les leaders diffusent leur soutien ou leur mécontentement, si bien qu’un conflit individuel peut devenir collectif.',
      'Le médical sépare douleur, disponibilité et risque. Repos, traitement ou joueur forcé changent la feuille et la probabilité d’aggravation. Les internationaux quittent aussi le groupe pendant les fenêtres de sélection : une composition valide en championnat peut ne plus l’être la semaine suivante.',

      { h2: '9. Déléguer sans abandonner', id: 'delegation' },
      'Neuf responsabilités peuvent rester entre tes mains ou être confiées au staff : recrutement, contrats, renouvellements, prêts, jeunes, staff, entraînements, compositions et amicaux. La délégation agit réellement ; son résultat dépend des compétences persistantes du directeur sportif et des personnes en poste.',
      'Déléguer sert à fixer ton style de partie. Garde la composition et le match si tu veux vivre chaque samedi ; conserve recrutement et contrats si tu préfères bâtir l’effectif ; délègue les amicaux ou certains renouvellements pour accélérer. Vérifie régulièrement le journal de délégation : une décision cohérente pour le staff peut contredire ton projet.',

      { h2: '10. Un monde qui poursuit sa propre carrière', id: 'monde' },
      'Les autres clubs ont leurs entraîneurs, contrats et confiances. Ils licencient, prolongent et recrutent pendant toute la sauvegarde. Les champions, finalistes, montées, relégations, records et changements de président restent dans l’histoire. Les joueurs vieillissent, prennent leur retraite puis peuvent devenir entraîneur, formateur, préparateur, recruteur ou directeur sportif.',
      'À réputation suffisante, une sélection nationale peut proposer un second banc. La réputation internationale est distincte de celle en club, et les tournées comme les tournois se coachent dans le même moteur. Gérer deux calendriers augmente le prestige, mais aussi les absences et les décisions à enchaîner.',

      { h2: '11. Fin de saison, changement de banc et héritage', id: 'fin-entraineur' },
      'Le verdict de saison fait bouger confiance et prestige, applique les objectifs, renouvelle une partie des budgets et ouvre le marché des entraîneurs. Tu peux recevoir des offres, postuler, négocier une prolongation, démissionner ou accepter un autre banc. L’ADN du club et ton profil tactique comptent dans les candidatures, pas seulement le score.',
      'La carrière s’achève au plus tard après 80 ans. Elle rejoint alors le Hall avec les trophées, succès, clubs entraînés, sélections, records et score. Une carrière issue d’un ancien joueur cumule les deux versants dans la catégorie **Joueur + entraîneur** du classement mondial.',

      { h2: 'Plan conseillé pour la première saison', id: 'premiere-saison' },
      { liste: [
        '**Semaine 1 : audite l’effectif.** Deux options crédibles par poste et un buteur fiable passent avant un grand nom supplémentaire.',
        '**Lis les objectifs pondérés.** Ils définissent la vraie condition de réussite de la saison.',
        '**Choisis peu de changements tactiques.** Un plan stable permet de comprendre pourquoi une rencontre bascule.',
        '**Observe avant d’acheter.** Garde une réserve pour les blessures et la fenêtre suivante.',
        '**Promets rarement, tiens toujours.** Une promesse évite un conflit immédiat mais crée une échéance mesurée.',
        '**Délègue par blocs cohérents.** Contrats et renouvellements vont bien ensemble ; composition et match aussi.',
        '**Juge le projet sur deux saisons.** Formation, cohésion et identité demandent plus de temps qu’un classement de septembre.',
      ] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    slug: 'guide',
    court: 'Guide express',
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
