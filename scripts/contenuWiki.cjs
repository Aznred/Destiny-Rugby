// État du guide au 9 octobre 2026. Les annonces sans date de sortie restent en bêta.
const DATE = '2026-10-09';
const image = (nom, alt, legende, prioritaire = false) => ({ image: `/images/wiki/${nom}.webp`, alt, legende, prioritaire, largeur: nom === 'match' ? 966 : 1600, hauteur: nom === 'match' ? 553 : 1000 });
const COLLECTION = {
  slug: 'wiki/collection', court: 'Collection & packs', classe: 'page-wiki', modifiee: DATE,
  titre: 'Collection, packs et cartes spéciales',
  description: 'Packs gratuits et en Ovas, raretés, cartes spéciales, échanges et différences entre la collection du compte et une ligue.',
  chapo: 'Une belle carte donne envie de bâtir autour d’elle. Avant d’ouvrir un pack, vérifie sa collection, son prix et les joueurs qu’il peut réellement contenir.',
  suite: ['wiki/ligue-en-ligne', 'wiki/carriere-joueur', 'mises-a-jour'],
  blocs: [
    image('collection', 'Écran de collection et packs de Destiny Rugby', 'La collection du compte : packs, progression et cartes trouvées dans le jeu.', true),
    { h2: 'Deux collections, deux progressions', id: 'collections' },
    'La **collection du compte** accompagne tes carrières solo. Ses cartes, ses doublons et ses Ovas sont communs à ces carrières. La **collection d’une ligue** appartient à ton club dans cette ligue : ses cartes et son solde restent dans cet univers.',
    { encadre: 'Une carte trouvée en solo ne renforce pas ton équipe en ligne. Chaque ligue conserve ses propres cartes et ses propres Ovas.' },
    { h2: 'Choisir un pack', id: 'packs' },
    'En collection solo, Bronze, Argent et Or sont gratuits. D’autres packs demandent des Ovas et peuvent cibler un championnat, une nation ou un événement. En ligue, regarde le prix et les probabilités affichés avant chaque ouverture.',
    { liste: ['Lis le **nombre de cartes** et l’éventuelle rareté garantie.', 'Vérifie les **probabilités** : une garantie ne promet pas un joueur précis.', 'Un pack d’événement apparaît uniquement lorsque cet événement et ses cartes sont disponibles.', 'En ligne, un joueur déjà possédé dans la ligue ne peut pas être distribué une seconde fois.'] },
    { h2: 'Lire une carte', id: 'carte' },
    { tableau: [['Information', 'À quoi elle sert'], ['GEN', 'Situer le niveau général ; compare aussi les qualités utiles au poste.'], ['Poste principal et postes secondaires', 'Composer le XV en limitant les malus de placement.'], ['Bronze, Argent, Or, Élite, Mythique', 'Reconnaître la rareté. Une carte plus rare ne remplace pas un effectif équilibré.'], ['Club et nation', 'Comprendre l’identité de la carte et les associations du collectif.'], ['Fatigue et disponibilité en ligue', 'Préparer la prochaine rencontre et organiser les remplacements.']] },
    { h2: 'ICONS et événements', id: 'speciales' },
    'Les **ICONS** représentent des légendes retraitées. Les cartes d’événement possèdent leur identité et leur période de disponibilité. Une carte spéciale doit être publiée et illustrée pour être proposée : un nom dans un catalogue ne garantit pas sa présence dans un pack.',
    'Consulte la collection et la boutique du jeu pour connaître les cartes actuellement ouvertes. Les probabilités, dates et prix affichés dans le jeu priment sur une ancienne capture du wiki.',
    { h2: 'Échanges et marché', id: 'echanges' },
    'Le solo propose des échanges de collection. En ligue, tu peux négocier sur le marché, participer aux enchères ou proposer un échange. Lis les cartes demandées et les Ovas engagés avant de confirmer ; une carte réservée dans une opération ne peut pas être utilisée dans une seconde transaction.',
    { h2: 'Commencer une carrière avec une carte', id: 'carriere' },
    'Le choix d’un joueur existant crée une carrière à partir de son profil. Sa progression ne modifie pas la carte de collection. Cette carrière reste **hors classement**, y compris lorsqu’elle atteint la retraite : elle commence avec un niveau différent d’un joueur créé de zéro.',
  ],
};
const MISES_A_JOUR = {
  slug: 'mises-a-jour', court: 'Mises à jour', classe: 'page-maj', modifiee: DATE, sansSommaire: true,
  titre: 'Le journal des mises à jour',
  description: 'Nouveautés de Destiny Rugby, améliorations, correctifs et fonctionnalités en préparation : les changements utiles aux joueurs.',
  chapo: 'Les nouveautés à découvrir, les problèmes corrigés et les chantiers à suivre. Chaque note explique ce qui change dans ta partie.',
  suite: ['wiki', 'wiki/collection', 'wiki/ligue-en-ligne'],
  blocs: [
    { h2: 'Dernière mise à jour du wiki', id: 'derniere' },
    { maj: { date: DATE, titre: 'Un guide qui ressemble au jeu', statut: 'Disponible', groupes: [
      { type: 'Nouveautés', points: ['Un guide dédié à la collection, aux packs et aux cartes spéciales.', 'Un journal de mises à jour et correctifs remplace le journal de développement.'] },
      { type: 'Améliorations', points: ['Navigation par sujet, recherche dans les guides et sommaire des articles.', 'Captures de l’interface et des matchs pour illustrer les modes de jeu.', 'Lecture adaptée au téléphone et accès direct aux conseils utiles.'] },
      { type: 'Corrections du guide', points: ['Départ en ligue : trente vrais licenciés de Régionale 3.', 'Collection du compte, rareté Mythique et carrière avec un joueur existant expliquées.', 'Commandes de vitesse, sortie de match et score réel du match remis à jour.'] },
    ] } },
    { h2: 'Évolutions récentes du jeu', id: 'recentes' },
    'Ces notes résument les évolutions présentes dans le jeu. Elles sont regroupées par sujet ; elles ne constituent pas une annonce de sortie datée.',
    { maj: { titre: 'Carrière de joueuse', statut: 'Dans le jeu', groupes: [
      { type: 'Nouveautés', points: ['Choix Joueur ou Joueuse à la création d’une carrière solo, avec création libre ou incarnation d’une joueuse réelle.', 'Onze championnats féminins et 84 clubs, dont les deux divisions de l’All-Ireland League.', 'Farah Palmer Cup : les douze provinces réunies dans une seule ligue dans le jeu.'] },
      { type: 'Améliorations', points: ['Écussons des clubs et logos des onze championnats dans les listes et les matchs.', 'Portraits officiels de la Coupe du monde 2025 pour compléter les fiches connues.', 'Apparence et modèles féminins en création et en match.'] },
      { type: 'Correctifs', points: ['Les clubs homonymes utilisent les notes et effectifs du monde choisi.', 'La reprise de carrière conserve le bon monde après un passage par la ligue en ligne.', 'L’écusson du Racing 92 reprend le fichier officiel déjà utilisé par l’équipe masculine.'] },
    ] } },
    { maj: { titre: 'Matchs et fin de rencontre', statut: 'Dans le jeu', groupes: [
      { type: 'Nouveautés', points: ['Matchs en 3D avec une vue du dessus disponible en alternative.', 'Vitesse de suivi ×1, ×2, ×3 ou ×10 en carrière ; simulation de la fin depuis la fenêtre de sortie.', 'Prolongations selon le règlement de la compétition et transformation après la sirène.'] },
      { type: 'Correctifs', points: ['La fin de match et les altercations disposent d’une sortie bornée pour éviter une rencontre figée.', 'Le score joué en carrière joueur est reporté dans le championnat.', 'Les remplacements tiennent compte des postes et se déclenchent à un arrêt de jeu.'] },
    ] } },
    { maj: { titre: 'Carrières et collection', statut: 'Dans le jeu', groupes: [
      { type: 'Nouveautés', points: ['Départ possible avec un joueur existant, dans une carrière hors classement.', 'Collection du compte, échanges de cartes et packs thématiques.', 'Cartes ICONS et événements saisonniers, selon publication et disponibilité dans la boutique.'] },
      { type: 'Améliorations', points: ['Contrôle direct du joueur, responsabilités de capitaine, buteur et lanceur.', 'Tutoriels guidés et réglages pour retrouver les explications à son rythme.', 'Onglets et commandes de match adaptés aux petits écrans.'] },
    ] } },
    { maj: { titre: 'Ligue en ligne', statut: 'Dans le jeu', groupes: [
      { type: 'Améliorations', points: ['Lecture synchronisée du direct : score, chrono et actions suivent le match montré.', 'Marché commun des divisions publiques et propositions d’échange.', 'Feuilles de match, collectif, fatigue et tactique pour préparer les rencontres.'] },
    ] } },
    { h2: 'En préparation et en bêta', id: 'a-venir' },
    'Ces chantiers sont encore réservés aux essais. Aucune date d’ouverture publique n’est annoncée ici.',
    { maj: { titre: 'Les chantiers à suivre', statut: 'Bêta privée', groupes: [
      { type: 'En test', points: ['Cahier de combinaisons : placements, passes, courses simultanées et opposition d’entraînement. Accès actuellement réservé aux essais privés.', 'Ligues féminines et mixtes en ligne : essais privés indépendants du choix Joueuse en carrière solo.', 'Cartes de créateurs : famille prévue dans le catalogue, désactivée par défaut. Les cartes doivent être publiées avant d’apparaître.'] },
    ] } },
    { encadre: 'Un problème pendant une partie ? Indique le mode, l’écran, ton appareil et les étapes qui reproduisent le souci via la [page Contact](/contact/). Ne communique jamais ton mot de passe.' },
  ],
};

function actualiserPages(pages) {
  for (const p of pages) {
    if (p.legal) continue;
    p.modifiee = DATE;
    p.classe = p.classe || 'page-guide';
    p.suite = p.suite?.map(s => s === 'journal' ? 'mises-a-jour' : s);
    p.imageSociale = '/images/wiki/match.webp';
    p.blocs = p.blocs.map(b => {
      if (typeof b !== 'string') return b;
      return b.replace(/trente joueurs Bronze/g, 'trente licenciés de Régionale 3')
        .replace(/trente cartes Bronze/g, 'trente licenciés de Régionale 3')
        .replace(/Élite et Star/g, 'Élite et Mythique')
        .replace('La collection solo gratuite est volontairement séparée. Elle reste sur ton appareil et n’ajoute aucune carte ni monnaie dans une ligue en ligne.', 'La collection du compte est partagée entre tes carrières solo. Elle n’ajoute aucune carte ni monnaie dans une ligue en ligne.')
        .replace('Les packs gratuits de la collection solo sont illimités et hors ligne.', 'La collection solo propose des packs Bronze, Argent et Or gratuits, ainsi que des packs en Ovas.');
    });
  }
  const accueil = pages.find(p => p.slug === 'wiki');
  accueil.titre = 'Le guide du terrain';
  accueil.imageSociale = '/images/wiki/match.webp';
  accueil.chapo = 'Ta première saison, ton prochain XV, le pack que tu hésites à ouvrir. Retrouve les règles et les bons réflexes pour avancer dans Destiny Rugby.';
  accueil.blocs = [
    { accueilWiki: true },
    { h2: 'Choisis ton parcours', id: 'parcours' },
    { cartesWiki: [
      { href: '/wiki/carriere-joueur/', image: '/images/wiki/carriere-joueur.webp', surtitre: '01 / Carrière solo', titre: 'Incarne un joueur', texte: 'Gagne ta place, vis les matchs et choisis les clubs qui feront ta carrière.', action: 'Le guide joueur' },
      { href: '/wiki/carriere-entraineur/', image: '/images/wiki/carriere-entraineur.webp', surtitre: '02 / Carrière solo', titre: 'Prends le banc', texte: 'Construis ton XV, gère le vestiaire et porte le projet de tout un club.', action: 'Le guide entraîneur' },
      { href: '/wiki/ligue-en-ligne/', image: '/images/wiki/ligue-en-ligne.webp', surtitre: '03 / Multijoueur', titre: 'Rejoins la ligue', texte: 'Bâtis ton club, négocie tes cartes et affronte tes amis dans la même saison.', action: 'Le guide en ligne' },
    ] },
    { h2: 'Une question pendant la partie ?', id: 'guides' },
    { rechercheWiki: true },
    { h2: 'Les nouvelles du jeu', id: 'actualites' },
    { encadre: 'Le wiki fait peau neuve le **9 octobre 2026**. Découvre les nouveautés, les correctifs récents et les bêtas en cours dans le [journal des mises à jour](/mises-a-jour/).' },
  ];
  const visuels = {
    'wiki/carriere-joueur': image('carriere-joueur', 'Écran de carrière joueur : fiche, semaine et prochaines décisions', 'Capture du jeu · La semaine du joueur et les informations à consulter avant d’avancer.', true),
    'wiki/carriere-entraineur': image('carriere-entraineur', 'Bureau du manager de Destiny Rugby', 'Capture du jeu · Le bureau rassemble le groupe, le calendrier et la situation du club.', true),
    'wiki/ligue-en-ligne': image('ligue-en-ligne', 'Composition du XV et banc dans la ligue en ligne', 'Capture du jeu · Quinze titulaires et huit remplaçants : prépare aussi la couverture des postes.', true),
  };
  for (const [slug, visuel] of Object.entries(visuels)) {
    const p = pages.find(p => p.slug === slug);
    p.blocs = p.blocs.map(b => b?.image ? visuel : b);
    p.imageSociale = visuel.image;
  }
  const joueur = pages.find(p => p.slug === 'wiki/carriere-joueur');
  const position = joueur.blocs.findIndex(b => b.h2 && b.id === 'ecran-carriere');
  joueur.blocs.splice(position, 0, { h3: 'Joueur ou joueuse' }, 'Choisis **Joueur** ou **Joueuse** avant de créer ton personnage. La carrière féminine comprend onze championnats et 84 clubs ; tu peux aussi incarner une joueuse réelle. Changer de monde conserve tes parties : reprendre une carrière retrouve son championnat et son effectif.', 'Les effectifs sont complétés par des joueuses générées lorsque les sources publiques ne suffisent pas. Une joueuse réelle dont le poste précis est inconnu porte la mention **poste estimé**. Les notes restent des estimations du jeu ; un portrait absent reste une silhouette.');
  joueur.blocs.splice(position, 0, { h3: 'Ou reprendre un joueur existant' }, 'Depuis le choix de carrière, tu peux aussi incarner un joueur existant. Son profil sert de point de départ sans modifier sa carte de collection. Cette carrière est **hors classement**, même après la retraite.');
  const match = joueur.blocs.findIndex(b => b.h2 && b.id === 'progression-joueur');
  joueur.blocs.splice(match, 0, { h3: 'Contrôle direct, vitesse et sortie' }, 'Le contrôle direct permet de déplacer ton joueur et de demander ses gestes en 3D. Les cartes de décision restent une autre manière de jouer. Retrouve les commandes et les aides dans les réglages du contrôle.', 'Pour regarder la rencontre, choisis **×1, ×2, ×3 ou ×10**. Prendre la main ramène le jeu au rythme des décisions. La fenêtre de sortie permet de demander un remplacement au prochain arrêt, ou de simuler la fin ; le score et les statistiques viennent du même match.', image('match', 'Match de Destiny Rugby dans sa présentation 3D', 'Capture du jeu · Le score, le chrono et les actions suivent le terrain.'));
  const ligue = pages.find(p => p.slug === 'wiki/ligue-en-ligne');
  ligue.blocs = ligue.blocs.map(b => b.h2 && b.id === 'depart' ? { ...b, h2: '2. Le départ : trente licenciés de Régionale 3' } : b.encadre?.includes('Elle reste sur ton appareil') ? { encadre: 'La collection du compte est commune aux carrières solo. Les cartes et les Ovas d’une ligue restent propres à cette ligue.' } : b);
  ligue.blocs.splice(ligue.blocs.findIndex(b => b.h2 && b.id === 'conseils'), 0, { h2: 'Ligues publiques et outils en bêta', id: 'public-et-beta' }, 'Tu peux aussi rejoindre les divisions publiques proposées dans le jeu. Leur marché commun permet des échanges entre clubs de cet espace ; une ligue privée conserve son univers indépendant.', { encadre: 'Le cahier de combinaisons et les essais des ligues féminines ou mixtes **en ligne** restent en bêta privée. Le choix Joueuse est disponible en carrière solo. Consulte les [mises à jour](/mises-a-jour/#a-venir) pour suivre les essais en ligne.' });
  const moteur = pages.find(p => p.slug === 'moteur');
  moteur.titre = 'Comprendre et suivre un match';
  moteur.description = 'Vues 3D et 2D, contrôle du joueur, tactique, vitesse et statistiques : comprendre le match de Destiny Rugby.';
  moteur.chapo = 'Observe les espaces, choisis tes gestes et prépare ton banc. Le match se joue sur le terrain : le résultat et les statistiques suivent les actions réellement disputées.';
  moteur.blocs = [
    image('match', 'Match en 3D avec les équipes et le tableau de score', 'Capture du jeu · La présentation du match en trois dimensions.', true),
    { h2: 'Choisir sa vue', id: 'vues' }, 'La **3D** montre le stade, les joueurs et les gestes. La **vue du dessus** donne une lecture globale du placement. Tu peux choisir la présentation disponible depuis les commandes de la scène ; le jeu garde une solution de repli si la 3D ne peut pas être chargée.',
    { h2: 'Joueur : prendre la main', id: 'controle' }, 'Tu pilotes ton rugbyman, avec des intentions comme passer, plaquer, raffuter ou jouer au pied. Un geste exige la bonne distance et le bon moment. La fatigue, le poste, les attributs et l’opposition influencent son résultat.', 'Les cartes de décision présentent les choix possibles et leurs chances de réussite. Les responsabilités de capitaine, buteur, lanceur ou engagement peuvent ouvrir des commandes spécifiques. Consulte les réglages et les tutoriels pour les retrouver.',
    { h2: 'Manager : agir depuis le banc', id: 'banc' }, 'La composition et les consignes orientent le comportement de l’équipe. En cours de rencontre, observe l’occupation, les ballons perdus, la fatigue et les joueurs déjà remplacés avant de modifier le plan. Un changement de joueur prend effet à un arrêt de jeu.',
    { h2: 'Vitesse et fin du match', id: 'vitesse' }, { tableau: [['Commande en carrière', 'Effet'], ['Décisions / prise de main', 'Prendre le temps de jouer les actions qui concernent ton joueur.'], ['×1, ×2, ×3, ×10', 'Suivre le même match à une vitesse différente.'], ['Se faire remplacer', 'Demander une sortie au prochain arrêt, si un remplaçant adapté est disponible.'], ['Simuler la fin', 'Terminer la rencontre avec le même moteur et retrouver son bilan.']] }, 'En ligue en ligne, le direct suit le calendrier partagé et le rythme de la rencontre. Les accélérations de la carrière solo ne changent pas la vitesse de la ligue.',
    { h2: 'Score, statistiques et classement', id: 'score' }, 'Le résultat joué alimente le championnat. La feuille conserve les passes, mètres, plaquages, essais, conquêtes et fautes ; ces faits alimentent les bilans de saison. Le score n’est pas un récit indépendant du terrain.', 'Dans un direct en ligne, le chrono, le score et les commentaires suivent les actions montrées. La rencontre peut être suivie sur plusieurs appareils ; chaque manager regarde le même match.',
    { h2: 'Après la sirène', id: 'sirene' }, 'Une action engagée peut aller à son terme. Une transformation après un essai reste jouée après la sirène. Les prolongations et les départages dépendent du règlement de la compétition : regarde la fiche de celle-ci avant un match couperet.',
    { encadre: 'Un joueur fatigué, un spécialiste absent ou un banc déséquilibré peut changer la rencontre. Prépare les vingt-trois postes avant de te concentrer sur la meilleure note du XV.' },
  ];
  const guide = pages.find(p => p.slug === 'guide');
  guide.titre = 'Bien commencer dans Destiny Rugby';
  guide.description = 'Choisir son mode, préparer sa première semaine, suivre un match et retrouver sa progression : le guide express de Destiny Rugby.';
  guide.chapo = 'Commence par choisir ce que tu veux vivre : la carrière d’un joueur, le projet d’un club ou une saison partagée avec tes amis.';
  guide.suite = ['wiki/carriere-joueur', 'wiki/carriere-entraineur', 'wiki/ligue-en-ligne', 'wiki/collection'];
  guide.blocs = [
    { h2: 'Choisis ton mode', id: 'mode' },
    { tableau: [['Tu veux…', 'Choisis…'], ['Incarner un rugbyman et vivre sa carrière', '[Carrière joueur](/wiki/carriere-joueur/)'], ['Composer, recruter et gérer tout un club', '[Carrière entraîneur](/wiki/carriere-entraineur/)'], ['Affronter tes amis dans une saison commune', '[Ligue en ligne](/wiki/ligue-en-ligne/)'], ['Ouvrir des packs et compléter tes cartes', '[Collection du compte](/wiki/collection/)']] },
    { h2: 'Avant la première semaine', id: 'creation' },
    'En carrière joueur, choisis le poste que tu aimes jouer et un club où tu peux gagner du temps de jeu. Les deux traits disponibles sur ton compte possèdent chacun une contrepartie. Avec un joueur existant, la carrière démarre de son profil et reste hors classement.',
    'En carrière entraîneur, regarde le niveau du groupe, les objectifs de la direction et les moyens du club. En ligne, crée un compte puis rejoins une ligue par invitation ou un espace public proposé par le jeu.',
    { h2: 'Les trois réflexes de chaque semaine', id: 'semaine' },
    { liste: ['Lis le **calendrier** avant d’avancer : match, préparation ou récupération.', 'Vérifie la **forme et les absences** ; en manager, contrôle aussi les titulaires et le banc.', 'Traite les **décisions et messages** : une offre ou une demande du club peut attendre ta réponse.'] },
    { h2: 'Le premier match', id: 'match' },
    image('match', 'Match en 3D de Destiny Rugby', 'Capture du jeu · Suivre le terrain et le score pendant la rencontre.'),
    'Tu peux regarder la rencontre ou prendre la main sur ton joueur. Le manager agit sur le plan et les remplacements. La vue 3D et la vue du dessus donnent deux lectures du même terrain.',
    'En carrière solo, les commandes de suivi proposent ×1, ×2, ×3 et ×10. Pour sortir d’une rencontre en cours, utilise la fenêtre de sortie : remplacement quand il est possible, ou simulation de la fin.',
    { h2: 'Conserve une progression cohérente', id: 'progression' },
    'La carrière solo conserve sa partie sur l’appareil. Le compte permet la synchronisation des éléments qu’il prend en charge ; les ligues ont leur sauvegarde partagée. Consulte les réglages de sauvegarde avant de changer d’appareil ou d’effacer les données du navigateur.',
    { encadre: 'La collection du compte et celle d’une ligue sont deux progressions différentes. Le pack ouvert en solo ne donne pas ses cartes à ton club en ligne.' },
    { h2: 'Quand tu hésites', id: 'aide' },
    'Retrouve les aides et tutoriels depuis les réglages du jeu. Le [wiki](/wiki/#guides) permet de chercher un sujet précis, et les [mises à jour](/mises-a-jour/) distinguent les nouveautés disponibles des bêtas encore en préparation.',
  ];
  const pyramide = pages.find(p => p.slug === 'pyramide');
  pyramide.description = 'Divisions françaises, poules, montées et phases finales : choisir son niveau et comprendre le parcours d’un club dans Destiny Rugby.';
  pyramide.chapo = 'De la Régionale 3 au Top 14, chaque niveau change la concurrence, les moyens du club et les enjeux de la saison. Choisis un endroit où ton joueur ou ton équipe peut grandir.';
  const tableauDivisions = pyramide.blocs.find(b => b.tableau);
  pyramide.blocs = [
    { h2: 'Les dix divisions françaises', id: 'etages' },
    tableauDivisions,
    { h2: 'Choisir son niveau', id: 'niveau' },
    'Pour un joueur, la concurrence au poste compte autant que le nom du club. Un départ plus bas peut offrir les minutes nécessaires à la progression. Pour un entraîneur, les premiers bancs dépendent de son prestige ; les objectifs doivent se lire à la lumière des moyens du club.',
    { h2: 'Poules et phases finales', id: 'finales' },
    'Les grands championnats amateurs sont répartis en poules. Être premier de sa poule ne signifie pas automatiquement remporter le titre national : les qualifiés disputent un tournoi final. Consulte le calendrier et le tableau pour distinguer phase régulière, qualification et finale.',
    'Les prolongations et les départages suivent le règlement de la compétition. Une finale, un barrage d’accès et une rencontre de championnat ne se lisent pas avec les mêmes enjeux.',
    { h2: 'Monter, descendre, rebondir', id: 'mouvements' },
    'Les montées et descentes sont résolues à l’intersaison. Le classement, les phases finales et les règles de chaque division déterminent les places concernées. Les autres clubs évoluent eux aussi : l’adversaire de cette année peut jouer un étage plus haut la suivante.',
    { h2: 'Effectifs et données', id: 'donnees' },
    'Le jeu combine des clubs et des joueurs réels avec des profils complétés pour la simulation. Une note ou un potentiel de jeu n’est pas une évaluation officielle du joueur réel. Les effectifs de ta carrière peuvent ensuite changer au fil des contrats, transferts et saisons.',
    { h2: 'Au-delà de la France', id: 'monde' },
    'L’atlas des clubs permet de consulter les championnats étrangers. En carrière joueur, le départ se fait dans un club français ; les offres et les transferts peuvent ensuite ouvrir une destination à l’étranger. Les sélections ajoutent leur calendrier aux rencontres du club.',
    { encadre: 'Le rugby féminin et les ligues mixtes sont encore en validation privée. Leur présence dans les essais ne signifie pas que tous les modes du jeu les proposent déjà.' },
  ];
  return [...pages, COLLECTION, MISES_A_JOUR];
}
module.exports = { actualiserPages };
