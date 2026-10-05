// LES PHRASES DE LA RETRANSMISSION — deux voix, deux langues
//
// Le COMMENTATEUR raconte l'action, vite ; le CONSULTANT l'explique, posément.
// Chaque catégorie a ses variantes, tirées d'un sac qui se vide avant de se
// remplir : on n'entend pas deux fois la même phrase tant que les autres n'ont
// pas servi.
//
// Variables : {nom} le joueur, {autre} un second joueur, {club} son équipe,
// {adv} l'équipe d'en face, {n} un nombre, {score} le score, {min} la minute.
//
// ⚠️ Ces textes sont LUS À VOIX HAUTE : phrases courtes, pas de symbole, les
// nombres en chiffres (la synthèse les prononce), jamais d'abréviation.

export type Voix = 'commentateur' | 'consultant';
export type LangueRetransmission = 'fr' | 'en';

type Banque = Record<string, { commentateur?: string[]; consultant?: string[] }>;

const FR: Banque = {
  coupEnvoi: {
    commentateur: [
      'C’est parti ! Coup d’envoi donné par {club}.',
      'Et c’est parti pour 80 minutes entre {club} et {adv} !',
      'Le ballon est en l’air, le match est lancé !',
      'Coup d’envoi ! {club} engage, {adv} reçoit.',
      'On y est, mesdames et messieurs, ça commence !',
      'Top départ ! Premier ballon pour {adv}.',
    ],
    consultant: [
      'Les dix premières minutes vont nous dire beaucoup sur les intentions des deux équipes.',
      'Regardez bien qui gagne la première collision, ça donne souvent le ton.',
      'Il faudra être patient, les deux défenses sont fraîches.',
      'Le premier objectif, c’est de sortir proprement de son camp.',
    ],
  },
  repriseSeconde: {
    commentateur: [
      'C’est reparti pour la seconde période ! {score}.',
      'Les équipes ont changé de côté, on repart ! {score}.',
      'Deuxième mi-temps, 40 minutes pour faire la différence.',
      'Coup d’envoi de la seconde période, {club} engage.',
    ],
    consultant: [
      'Le vent a changé de camp, ça va compter dans le jeu au pied.',
      'C’est maintenant que les bancs vont peser.',
      'Celui qui marque le premier dans cette mi-temps prend un vrai ascendant.',
    ],
  },
  passeLongue: {
    commentateur: [
      'Longue passe de {nom} pour {autre} !',
      '{nom} saute un joueur et trouve {autre} au large.',
      'Ça écarte vite ! {nom} pour {autre}.',
      'Quelle passe de {nom}, {autre} a du champ !',
      '{nom} envoie le ballon sur l’extérieur, {autre} est servi.',
      'Le jeu s’ouvre, {nom} cherche {autre}.',
    ],
    consultant: [
      'Une passe comme ça, ça fait gagner deux défenseurs d’un coup.',
      'Le ballon va toujours plus vite que les hommes, c’est exactement ça.',
      'Il a vu que la défense était resserrée, il a joué au large tout de suite.',
    ],
  },
  offload: {
    commentateur: [
      'Passe après contact de {nom} ! {autre} continue.',
      '{nom} fait vivre le ballon, {autre} est lancé !',
      'Quel geste de {nom}, il libère les bras et donne !',
      'Ça ne meurt pas ! {nom} pour {autre} dans le contact.',
      'Offload ! {nom} garde le ballon vivant.',
    ],
    consultant: [
      'Quand on arrive à passer après contact, la défense n’a pas le temps de se replacer.',
      'Il a gagné son duel juste assez pour libérer les bras, c’est du très beau travail.',
      'C’est ce genre de geste qui fait exploser un rideau défensif.',
    ],
  },
  cellule: {
    commentateur: [
      'Les avants de {club} viennent percuter près du regroupement.',
      '{nom} prend le ballon lancé, avec ses soutiens collés à lui.',
      'Cellule d’avants pour {club}, {nom} au contact.',
      'Ça travaille devant, {nom} avance avec le ballon.',
      '{nom} en pointe, deux coéquipiers à l’épaule.',
    ],
    consultant: [
      'Regardez comme il arrive lancé, c’est ça qui fait gagner la ligne d’avantage.',
      'Ce travail des avants, ça fixe la défense au milieu et ça ouvre les extérieurs.',
      'Deux soutiens à l’épaule, le ballon sortira vite.',
      'Ils usent la défense, patiemment. Ça paiera plus tard.',
    ],
  },
  surnombre: {
    commentateur: [
      'Il y a un coup à jouer ! {nom} fixe et donne à {autre} !',
      'Surnombre pour {club} ! {nom} attire le défenseur, {autre} est seul !',
      '{nom} prend son temps, fixe… et sert {autre} au dernier moment !',
      'Deux contre un ! {nom} joue juste, {autre} a le ballon !',
      'Magnifique fixation de {nom}, la passe est parfaite pour {autre} !',
      '{nom} aspire son vis-à-vis et libère {autre} !',
    ],
    consultant: [
      'Il a attendu que le défenseur s’engage pour donner. Une demi-seconde plus tôt, la défense glissait.',
      'C’est l’école de rugby : je fixe, je donne. Et c’est toujours aussi efficace.',
      'Le défenseur devait choisir, et quel que soit son choix, il avait tort.',
      'Regardez le receveur, il garde sa largeur. S’il se rapproche, il n’y a plus de surnombre.',
    ],
  },
  feinte: {
    commentateur: [
      'Feinte de passe de {nom} ! Il garde et il passe !',
      '{nom} arme la passe… et repart à l’intérieur !',
      'Oh la feinte ! {nom} a mis son défenseur dans le vent !',
      'Tout le monde attendait la passe, {nom} a gardé le ballon !',
      '{nom} regarde son ailier et s’engouffre !',
    ],
    consultant: [
      'Le défenseur avait anticipé la passe, il était déjà parti sur le receveur.',
      'Il a lu les épaules du défenseur. Dès qu’elles tournent, la porte est ouverte.',
      'C’est l’intelligence de jeu : la passe était la bonne option jusqu’à ce que le défenseur la couvre.',
    ],
  },
  intervalle: {
    commentateur: [
      '{nom} voit le trou et il y va !',
      'Il y a un intervalle ! {nom} s’y engouffre !',
      '{nom} change d’appui et prend l’espace !',
      'Ça s’ouvre devant {nom}, il accélère !',
      '{nom} a vu la brèche, il attaque la ligne !',
      'Le rideau s’écarte, {nom} en profite !',
    ],
    consultant: [
      'Deux défenseurs trop écartés, et il l’a vu tout de suite.',
      'Ce n’était pas le jeu annoncé. Il a levé la tête, il a vu l’espace, il l’a pris.',
      'C’est une lecture de très haut niveau, la passe était prévue mais le trou était là.',
    ],
  },
  percee: {
    commentateur: [
      'Franchissement de {nom} ! Il est passé !',
      '{nom} a cassé la ligne ! Il est dans le dos de la défense !',
      'Ça passe ! {nom} est lancé plein champ !',
      'Quelle percée de {nom} ! La défense est prise !',
      '{nom} s’échappe ! Qui va le reprendre ?',
      'Il y a le feu ! {nom} a traversé le rideau !',
      '{nom} a mis les cannes, il est parti !',
    ],
    consultant: [
      'Maintenant il lui faut du soutien, tout seul il n’ira pas au bout.',
      'La défense était montée trop vite, elle a laissé un espace dans son dos.',
      'Regardez les soutiens qui arrivent à hauteur, c’est là que ça se joue.',
    ],
  },
  perceeStat: {
    commentateur: [
      '{n}ᵉ franchissement pour {nom} aujourd’hui !',
      'Encore lui ! {nom} franchit pour la {n}ᵉ fois dans ce match !',
      '{nom} est intenable, c’est déjà sa {n}ᵉ percée !',
    ],
    consultant: [
      'Quand un joueur franchit {n} fois dans un match, c’est que la défense n’a pas trouvé la solution.',
      'Il est dans un grand jour, ses coéquipiers doivent le chercher.',
    ],
  },
  plaquage: {
    commentateur: [
      '{nom} est repris par {autre}.',
      'Plaquage de {autre}, {nom} est au sol.',
      '{autre} ne laisse pas passer {nom}.',
      '{nom} stoppé net par {autre}.',
      'Bien défendu par {autre}, {nom} n’avance plus.',
      '{autre} au plaquage, le ballon reste pour {club}.',
    ],
    consultant: [
      'Bon plaquage aux jambes, c’est la technique qui compte, pas la force.',
      'La défense tient bien sa ligne, il n’y a pas d’espace pour l’instant.',
    ],
  },
  plaquageDominant: {
    commentateur: [
      'Énorme plaquage de {autre} ! {nom} recule !',
      'Quel tampon de {autre} ! {nom} a été renvoyé d’où il venait !',
      'Ça secoue ! {autre} a découpé {nom} !',
      'Plaquage offensif de {autre}, la défense reprend l’initiative !',
      '{autre} a mis tout le monde d’accord sur ce plaquage !',
    ],
    consultant: [
      'Un plaquage comme ça, ça change le rapport de force. Toute l’équipe se sent plus forte.',
      'Il est monté vite, il l’a pris avant qu’il ait de la vitesse. Parfait.',
      'Le ballon va sortir lentement, la défense a tout le temps de se replacer.',
    ],
  },
  plaquageStat: {
    commentateur: [
      '{n}ᵉ plaquage pour {nom}, et il n’en a pas manqué un seul.',
      '{nom} est partout en défense, déjà {n} plaquages.',
    ],
    consultant: [
      '{n} plaquages sans en rater un, c’est un match de patron.',
    ],
  },
  ruckRapide: {
    commentateur: [
      'Ballon rapide pour {club} !',
      'Ça sort tout de suite, la défense n’est pas replacée !',
      'Libération express, {club} peut enchaîner !',
      'Le ballon est déjà ressorti, ça va très vite !',
    ],
    consultant: [
      'Trois secondes de ruck en moins, c’est trois défenseurs en retard.',
      'Les soutiens sont arrivés avant les défenseurs, c’est ça un ballon rapide.',
      'C’est le moment d’attaquer, la défense recule encore.',
    ],
  },
  grattage: {
    commentateur: [
      'Ballon gratté par {nom} ! {club} récupère !',
      'Contre-ruck ! {nom} a volé le ballon !',
      '{nom} est sur le ballon, il ne le lâche pas ! Turnover !',
      'Quel travail au sol de {nom} ! Possession retournée !',
      'Le ballon change de camp ! {nom} a gratté !',
    ],
    consultant: [
      'Le porteur était isolé, le soutien est arrivé une seconde trop tard.',
      'Il est resté sur ses appuis, les mains sur le ballon. Impossible à déblayer.',
      'Un ballon récupéré comme ça, c’est la meilleure munition : la défense adverse n’est pas en place.',
    ],
  },
  grattageStat: {
    commentateur: [
      'Encore un grattage de {nom}, c’est son {n}ᵉ aujourd’hui !',
      '{nom} fait énormément de mal au sol, {n} ballons volés !',
    ],
    consultant: [
      'Il faut que les soutiens arrivent plus vite, sinon il va continuer à se régaler.',
    ],
  },
  interception: {
    commentateur: [
      'Interception de {nom} ! Il a lu la passe !',
      'Oh là là ! {nom} coupe la trajectoire et s’en va !',
      'Ballon intercepté par {nom} !',
      '{nom} a jailli ! Interception !',
    ],
    consultant: [
      'La passe était téléphonée, il l’a vue partir.',
      'C’est le risque quand on joue large devant une défense qui monte.',
    ],
  },
  melee: {
    commentateur: [
      'Mêlée pour {club}.',
      'Les deux packs se mettent en place, introduction {club}.',
      'On repart sur une mêlée, ballon {club}.',
      'Mêlée ordonnée, les huit de devant entrent en scène.',
      'Flexion, liez, jeu ! Mêlée {club}.',
    ],
    consultant: [
      'Une bonne plateforme pour lancer du jeu, tous les trois-quarts sont en face à face.',
      'Regardez la première ligne, c’est là que tout se joue.',
      'Sur mêlée, le numéro 8 a plusieurs options : partir lui-même ou laisser faire son demi.',
    ],
  },
  meleeGagnee: {
    commentateur: [
      'Le pack de {club} avance ! La mêlée est gagnée !',
      'Quelle poussée de {club} !',
      '{club} domine cette mêlée, le ballon sort proprement.',
    ],
    consultant: [
      'Quand la mêlée avance, toute la troisième ligne adverse est fixée.',
      'C’est un vrai avantage psychologique, les piliers d’en face vont y penser.',
    ],
  },
  touche: {
    commentateur: [
      'Touche pour {club}.',
      'Lancer {club}, l’alignement se forme.',
      'On va jouer une touche, ballon {club}.',
      'Remise en jeu en touche pour {club}.',
    ],
    consultant: [
      'À cette distance de la ligne, on peut s’attendre à un maul.',
      'Ils vont chercher le fond de l’alignement pour lancer leurs trois-quarts.',
      'Le contre adverse est bien placé, il faudra un lancer précis.',
    ],
  },
  toucheRapide: {
    commentateur: [
      '{nom} joue vite la touche ! Personne n’était replacé !',
      'Touche rapide de {nom}, ça repart tout de suite !',
      '{nom} ne perd pas de temps, remise en jeu rapide !',
    ],
    consultant: [
      'Très bonne lecture : l’alignement n’était pas formé, il avait le droit de jouer.',
      'C’est ce qui fait la différence, ne jamais laisser la défense souffler.',
    ],
  },
  maul: {
    commentateur: [
      'Le maul de {club} se forme et avance !',
      'Ça pousse derrière le ballon porté de {club} !',
      'Maul pour {club}, la défense recule !',
      'Les avants de {club} s’organisent, le maul progresse.',
    ],
    consultant: [
      'Difficile à défendre sans faire de faute, surtout aussi près de la ligne.',
      'Le ballon est bien caché au fond, la défense ne peut que subir.',
      'Si l’arbitre voit un écroulement, ce sera pénalité, peut-être plus.',
    ],
  },
  chandelle: {
    commentateur: [
      'Chandelle de {nom} ! Qui sera dessous ?',
      '{nom} monte un ballon très haut !',
      'Coup de pied haut de {nom}, la chasse est lancée !',
      'Ballon dans les nuages, signé {nom} !',
    ],
    consultant: [
      'Tout dépend de la poursuite, un ballon haut sans chasseur c’est un ballon rendu.',
      'Avec ce vent, la réception ne sera pas simple.',
    ],
  },
  degagement: {
    commentateur: [
      '{nom} dégage son camp.',
      'Long coup de pied de {nom}, {club} respire.',
      '{nom} trouve une bonne longueur.',
      'Dégagement de {nom}, le danger est écarté.',
      '{nom} envoie le ballon loin devant.',
    ],
    consultant: [
      'On ne joue pas dans ses 22 mètres, il a pris la bonne décision.',
      'Bon coup de pied, mais il faut que la ligne monte ensemble derrière.',
    ],
  },
  occupation: {
    commentateur: [
      '{nom} occupe au pied.',
      'Jeu au pied d’occupation de {nom}.',
      '{nom} renvoie la pression dans le camp adverse.',
      '{nom} cherche de l’espace dans le fond du terrain.',
    ],
    consultant: [
      'C’est une bataille de terrain, le premier qui fait une erreur le paiera.',
      'Il a vu l’arrière monté, il joue dans son dos.',
    ],
  },
  rasant: {
    commentateur: [
      'Petit coup de pied rasant de {nom} !',
      '{nom} glisse le ballon derrière la défense !',
      'Rasant de {nom} dans le dos du rideau !',
    ],
    consultant: [
      'La défense montait à plat, il n’y avait personne derrière.',
      'C’est un ballon piège, le rebond peut partir n’importe où.',
    ],
  },
  parDessus: {
    commentateur: [
      'Petit par-dessus de {nom} !',
      '{nom} lobe la défense !',
      'Coup de pied par-dessus de {nom}, il se le suit !',
    ],
    consultant: [
      'Quand la défense monte en pointe, c’est la bonne arme.',
    ],
  },
  passeAuPied: {
    commentateur: [
      'Passe au pied de {nom} vers l’aile !',
      '{nom} cherche son ailier au pied !',
      'Transversale de {nom} !',
    ],
    consultant: [
      'L’ailier adverse était monté, il a laissé son couloir libre.',
      'C’est un geste de grande classe quand c’est bien dosé.',
    ],
  },
  essai: {
    commentateur: [
      'ESSAI ! Essai de {nom} pour {club} !',
      'Il y est ! {nom} aplatit ! Essai {club} !',
      'ESSAI ! {nom} vient conclure le mouvement !',
      'Et c’est l’essai ! {nom} marque pour {club} !',
      'Essai magnifique de {club}, signé {nom} !',
      '{nom} plonge dans l’en-but ! Essai !',
      'Ça y est ! {nom} envoie {club} au paradis !',
      'Dans l’en-but ! {nom} ! Essai pour {club} !',
    ],
    consultant: [
      'Tout est parti de la conquête, et derrière chacun a fait son travail.',
      'La défense a fini par craquer, il y avait trop de temps de jeu à défendre.',
      'Regardez le travail du soutien, sans lui il n’y a pas d’essai.',
      'C’est un essai construit, patiemment, phase après phase.',
      'Quelle finition. Il n’a pas tremblé.',
    ],
  },
  essaiStatSaison: {
    commentateur: [
      'C’est déjà son {n}ᵉ essai sous les couleurs de {club} cette saison !',
      '{n}ᵉ essai de la saison pour {nom} !',
      '{nom}, {n} essais en {m} matchs, quel rendement !',
    ],
    consultant: [
      'Les chiffres ne mentent pas : {n} essais en {m} matchs, c’est un finisseur.',
      'Il est dans la forme de sa vie, tout ce qu’il touche finit dans l’en-but.',
    ],
  },
  essaiDouble: {
    commentateur: [
      'Le doublé pour {nom} ! Deuxième essai aujourd’hui !',
      'Encore lui ! {nom} marque son {n}ᵉ essai du match !',
    ],
    consultant: [
      'Quand un joueur est en confiance comme ça, il faut lui donner tous les ballons.',
    ],
  },
  transformationReussie: {
    commentateur: [
      'La transformation est réussie par {nom}. {score}.',
      '{nom} ajoute les deux points. {score}.',
      'C’est entre les poteaux ! {score}.',
      'Transformation de {nom}, c’est bon. {score}.',
      '{nom} ne tremble pas, deux points de plus. {score}.',
    ],
    consultant: [
      'De cet angle, ce n’était pas donné. Belle frappe.',
      'Deux points qui pèseront à la fin.',
    ],
  },
  transformationManquee: {
    commentateur: [
      'La transformation passe à côté. {score}.',
      '{nom} manque la transformation. {score}.',
      'Ça ne passe pas pour {nom}. On reste à {score}.',
      'Le ballon fuit les poteaux, pas de transformation.',
    ],
    consultant: [
      'L’angle était très fermé, et le vent n’a pas aidé.',
      'Deux points laissés en route, espérons que ça ne compte pas à la fin.',
    ],
  },
  poteau: {
    commentateur: [
      'Sur le poteau ! Le ballon de {nom} a touché le montant !',
      'Le poteau ! Incroyable !',
      'Oh, le montant ! La frappe de {nom} heurte le poteau !',
    ],
    consultant: [
      'À dix centimètres près… c’est cruel, le jeu au pied.',
    ],
  },
  penaliteSifflee: {
    commentateur: [
      'Pénalité pour {club}. {motif}.',
      'L’arbitre siffle : {motif}. Pénalité {club}.',
      'Faute de {adv}, {motif}. Pénalité.',
      'Coup de sifflet, pénalité en faveur de {club}.',
      '{motif}, dit l’arbitre. {club} a le choix.',
    ],
    consultant: [
      'C’est une faute évitable, sous pression on prend de mauvaises décisions.',
      'L’arbitre avait prévenu, il ne pouvait pas laisser passer.',
      'Trois points ou la touche ? Ça dépend du score et de la confiance du pack.',
      'La discipline, c’est ce qui fait gagner ou perdre ce genre de match.',
    ],
  },
  penaliteReussie: {
    commentateur: [
      'Trois points pour {club} ! {nom} passe la pénalité. {score}.',
      'C’est dedans ! {nom} fait fructifier la pénalité. {score}.',
      '{nom} enquille, trois points. {score}.',
      'La pénalité est passée par {nom}. {score}.',
    ],
    consultant: [
      'Il faut prendre les points quand ils se présentent, c’est ce qu’ils ont fait.',
      'Le tableau d’affichage avance, c’est toujours ça de pris.',
    ],
  },
  penaliteManquee: {
    commentateur: [
      '{nom} manque la pénalité. On reste à {score}.',
      'À côté ! La tentative de {nom} ne passe pas.',
      'Pas de points pour {club}, la pénalité est manquée.',
    ],
    consultant: [
      'La distance était limite, il fallait tout frapper parfaitement.',
      'Il a un peu forcé sa frappe, le ballon est parti dès le pied.',
    ],
  },
  drop: {
    commentateur: [
      'Drop tenté par {nom} !',
      '{nom} s’installe pour le drop… il frappe !',
      'Il tente le drop ! {nom} !',
    ],
    consultant: [
      'Dans l’axe, à cette distance, c’est la bonne idée.',
      'La défense ne cédait pas, il a pris ce qu’il y avait à prendre.',
    ],
  },
  dropReussi: {
    commentateur: [
      'DROP ! Il est passé ! Trois points de {nom} ! {score}.',
      'Le drop de {nom} passe entre les poteaux ! {score}.',
    ],
    consultant: [
      'Un geste de sang-froid. Peu de joueurs osent encore le tenter.',
    ],
  },
  cartonJaune: {
    commentateur: [
      'Carton jaune pour {nom} ! {adv} va jouer à 14 pendant dix minutes.',
      'L’arbitre sort le jaune, {nom} file au banc.',
      'Dix minutes dehors pour {nom}.',
    ],
    consultant: [
      'Dix minutes à quatorze, ça coûte en moyenne sept points. Il va falloir serrer les dents.',
      'L’équipe doit se réorganiser tout de suite, surtout en défense.',
      'C’était la faute de trop, l’arbitre avait prévenu le capitaine.',
    ],
  },
  cartonRouge: {
    commentateur: [
      'Carton rouge ! {nom} est exclu définitivement !',
      'C’est rouge pour {nom} ! Le match bascule !',
    ],
    consultant: [
      'Il n’y a rien à dire, le contact à la tête est sanctionné comme ça aujourd’hui.',
      'À quatorze jusqu’à la fin, il va falloir un match héroïque.',
    ],
  },
  enAvant: {
    commentateur: [
      'En-avant de {nom}.',
      'Le ballon échappe à {nom}, en-avant.',
      'Maladresse de {nom}, mêlée pour {adv}.',
      '{nom} ne contrôle pas le ballon. En-avant.',
    ],
    consultant: [
      'Dommage, l’action était bien lancée.',
      'Avec la pression défensive, les mains deviennent moins sûres.',
    ],
  },
  remplacement: {
    commentateur: [
      'Changement pour {club} : {nom} entre en jeu.',
      '{nom} fait son entrée pour {club}.',
      'Du sang neuf pour {club} avec {nom}.',
    ],
    consultant: [
      'Un joueur frais à ce moment du match, ça peut tout changer.',
      'Le banc va faire la différence dans les vingt dernières minutes.',
    ],
  },
  tmo: {
    commentateur: [
      'L’arbitre fait appel à la vidéo.',
      'On va revoir les images, l’arbitre veut vérifier.',
      'Arbitrage vidéo ! Le stade retient son souffle.',
    ],
    consultant: [
      'Il veut être sûr de l’aplatissage, on va voir ça au ralenti.',
      'Ce sera une question de centimètres.',
    ],
  },
  grosImpact: {
    commentateur: [
      'Oh le choc ! Ça a tapé très fort !',
      'Quel impact ! Tout le stade l’a entendu !',
    ],
    consultant: [
      'C’est la dimension physique de ce sport, il faut aimer ça.',
    ],
  },
  miTemps: {
    commentateur: [
      'C’est la mi-temps ! {score}.',
      'Les joueurs rentrent aux vestiaires sur le score de {score}.',
      'Mi-temps sifflée. {score} à la pause.',
    ],
    consultant: [
      'Il reste 40 minutes et rien n’est joué.',
      '{club} a eu {n} pour cent de possession dans cette première période, ça se voit au score.',
      'Les entraîneurs ont dix minutes pour corriger ce qui ne va pas.',
    ],
  },
  finDeMatch: {
    commentateur: [
      'C’est terminé ! Victoire de {club}, {score} !',
      'Coup de sifflet final ! {club} s’impose {score} !',
      'C’est fini ! {score}, {club} l’emporte !',
    ],
    consultant: [
      'Une victoire méritée, ils ont été plus précis dans les moments importants.',
      'Le match s’est joué sur la discipline et la conquête.',
      'Quel match. Les deux équipes peuvent être fières.',
    ],
  },
  matchNul: {
    commentateur: ['C’est terminé sur un match nul ! {score}.', 'Égalité parfaite au coup de sifflet final, {score}.'],
    consultant: ['Personne ne méritait de perdre, mais personne n’a su tuer le match.'],
  },
  finSerree: {
    commentateur: [
      'Il reste {n} minutes et il n’y a que {m} points d’écart !',
      'Quelle fin de match ! {score}, tout peut encore arriver !',
    ],
    consultant: [
      'Maintenant, c’est dans la tête. Le premier qui fait une faute perd le match.',
      'Trois points suffisent, attention au drop ou à la pénalité.',
    ],
  },
  analyse: {
    consultant: [
      '{club} a {n} pour cent de possession sur les dix dernières minutes, {adv} ne voit plus le ballon.',
      'On voit que {club} cherche systématiquement les extérieurs depuis le début.',
      'Le jeu au pied de {adv} met {club} sous pression, ils sont obligés de relancer de loin.',
      'La défense de {adv} monte très vite, il y a peut-être de la place dans son dos.',
      'C’est un match très engagé, les organismes vont souffrir en fin de rencontre.',
      'La conquête de {club} est propre aujourd’hui, c’est la base de tout.',
    ],
  },
  confrontations: {
    consultant: [
      '{club} a remporté ses {n} dernières rencontres face à {adv}, il y a un ascendant psychologique.',
      'Rappelons que {club} reste sur {n} victoires de suite contre cet adversaire.',
    ],
  },
  serie: {
    consultant: [
      '{club} est sur une série de {n} victoires, la confiance est là.',
      '{n} victoires d’affilée pour {club}, ils jouent libérés.',
    ],
  },
  relance: {
    commentateur: [
      'Et tu ne crois pas si bien dire !',
      'Exactement, et ça continue !',
      'On le voit tout de suite sur cette action !',
    ],
  },

  // ── L'HUMOUR DE LA CABINE ─────────────────────────────────────────────────
  // Deux catégories qui se déclenchent sur un geste précis (le gros plaquage,
  // le défenseur envoyé sur les fesses), puis des variantes « Blague » : une
  // catégorie ordinaire en a une, et la retransmission la tire une fois sur
  // cinq environ (`PART_DES_BLAGUES`, retransmission.ts). Jamais sur un carton
  // rouge, une blessure ou un essai refusé : on rit du jeu, pas de la douleur.
  plaquageCaramel: {
    commentateur: [
      'Oh le caramel ! {autre} vient de servir un énorme caramel à {nom} !',
      'Un gros, gros caramel de {autre} ! {nom} va s’en souvenir jusqu’à lundi !',
      'Attention, livraison de caramel : {autre} a déposé {nom} au sol, avec le ruban et tout !',
      '{autre} sort la grosse artillerie ! Quel caramel sur {nom} !',
      'Ça, ce n’est pas un plaquage, c’est un déménagement ! {autre} a déménagé {nom} !',
      'Le caramel de la semaine est signé {autre} ! {nom} a tout pris !',
      '{nom} voulait passer, {autre} a décidé que non. Et il l’a fait savoir !',
      'Vous avez entendu le bruit ? Même la tribune a fait « aïe » ! {autre} sur {nom} !',
      '{autre} a mis le paquet ! {nom} a senti passer la facture !',
      'Pas de pitié ! Caramel de {autre} sur {nom} !',
      'Quel impact ! {nom} s’est retrouvé en marche arrière, option turbo !',
    ],
    consultant: [
      'Celui-là, on le repasse au ralenti à la troisième mi-temps.',
      'Il aura des courbatures dans des endroits qu’il ne connaissait pas.',
      'Ça, c’est le genre de plaquage qui se raconte encore aux petits-enfants.',
      'Pour le kiné, le dimanche soir s’annonce long.',
      'Techniquement, c’est parfait : épaule, hanche, et on emmène le client avec.',
      'Il a pris le temps de bien viser. Et de ne pas rater.',
      'Quand on se fait plaquer comme ça, on a le droit de rester deux secondes pour regarder le ciel.',
      'C’est dans ces moments-là qu’on comprend pourquoi les mamans ne veulent pas qu’on joue au rugby.',
    ],
  },
  fessesParTerre: {
    commentateur: [
      'Et {autre} se retrouve sur les fesses ! {nom} est passé comme dans du beurre !',
      '{autre} s’est assis sur les fesses ! Il cherche encore où est parti le ballon !',
      'Direction les fesses par terre pour {autre} ! {nom} lui a fait le coup du tapis volant !',
      '{nom} a laissé {autre} sur son postérieur ! Quel pas de côté !',
      'Siège de {autre} au milieu du terrain ! Il va falloir un coussin !',
      '{autre} fait une pause assise ! {nom} file, le ballon avec !',
      'Oh, {autre} est parti s’asseoir ! {nom} l’a tout simplement planté là !',
      '{nom} met {autre} sur les fesses, et ça lui fait gagner dix mètres !',
      'Le pauvre {autre} a pris la pelouse par le séant ! {nom} est déjà loin !',
    ],
    consultant: [
      'Quand on se retrouve les fesses par terre, c’est que l’appui n’était pas le bon.',
      'Il est monté trop vite, il n’avait plus de jambes pour suivre le changement d’appui.',
      'Petit conseil : on plaque les jambes, pas l’air.',
      'Pas de mal, sauf pour la fierté. Et pour le short.',
      'Il y a des plaquages manqués, et il y a des plaquages manqués avec un siège de luxe.',
    ],
  },
  enAvantBlague: {
    commentateur: [
      'En-avant de {nom}. Il a dû croire que c’était du basket.',
      'Le ballon a glissé des mains de {nom}. Il avait peut-être mis de la crème solaire.',
      '{nom} voulait lui laisser de la place, à ce ballon. Il a trop bien réussi.',
      'Le ballon s’est évadé des mains de {nom} ! En-avant !',
    ],
    consultant: [
      'On a connu des paires de mains plus sûres.',
      'Le ballon est ovale, ça n’aide pas. Mais c’est le même pour tout le monde.',
    ],
  },
  meleeBlague: {
    commentateur: [
      'Mêlée ! Seize messieurs vont se faire un gros câlin.',
      'Les huit de devant s’apprêtent à une séance de poussée collective.',
      'Une mêlée, c’est la seule réunion où tout le monde pousse dans la même direction. Enfin presque.',
    ],
    consultant: [
      'Ne vous fiez pas à l’ambiance : sous la mêlée, personne ne rigole.',
      'Ce qui se passe en première ligne reste en première ligne.',
    ],
  },
  toucheBlague: {
    commentateur: [
      'Touche ! L’art de lancer un ballon droit à un homme qu’on soulève.',
      'Le lanceur doit viser juste, et sans se pencher : le sauteur ne rentre pas dans l’ascenseur.',
    ],
    consultant: [
      'Il suffit de lancer droit. C’est facile quand on le dit comme ça.',
    ],
  },
  grattageBlague: {
    commentateur: [
      '{nom} a mis la main dans le pot de confiture, et personne n’a rien vu !',
      '{nom} a fait les poches du porteur ! C’est du vol, mais du vol autorisé !',
      'Le ballon a changé de propriétaire, sans facture ! Bravo {nom} !',
    ],
    consultant: [
      'Il a un sens de la propriété remarquable. Surtout celle des autres.',
    ],
  },
  penaliteManqueeBlague: {
    commentateur: [
      'La pénalité de {nom} part chercher la lune. Elle n’est pas passée.',
      '{nom} visait les poteaux, le ballon visait la tribune. Le ballon a gagné.',
      'Le ballon est parti en vacances, il ne reviendra pas par les poteaux.',
    ],
    consultant: [
      'La tribune applaudit, par politesse.',
      'Il y a des jours où les poteaux sont plus étroits que d’autres.',
    ],
  },
  transformationManqueeBlague: {
    commentateur: [
      'La transformation de {nom} s’est trompée d’adresse.',
      '{nom} a transformé… la balle en souvenir.',
    ],
    consultant: [
      'Deux points au tapis. Heureusement, ils ne se perdent pas, ils se retrouvent au classement.',
    ],
  },
  essaiBlague: {
    commentateur: [
      'ESSAI ! {nom} a posé le ballon comme on pose un œuf !',
      'Ça y est ! {nom} aplatit, et la défense regardait ailleurs !',
      'ESSAI de {nom} ! Il a pris la route la plus courte : tout droit !',
    ],
    consultant: [
      'La défense avait laissé un mètre. Il en a pris dix.',
      'Tout le monde avait vu l’essai, sauf les défenseurs.',
      'Au rugby, on dit qu’un essai se mérite. Celui-là, il se méritait surtout par la défense.',
    ],
  },
  cartonJauneBlague: {
    commentateur: [
      'Dix minutes de réflexion pour {nom}. Il pourra lire un bon livre.',
      '{nom} part au banc : l’occasion de prendre un peu de repos, aux frais de l’équipe.',
    ],
    consultant: [
      'Le banc est confortable, paraît-il. Surtout pour les autres.',
    ],
  },
  rasantBlague: {
    commentateur: [
      'Un petit rasant de {nom}, au ras des pâquerettes !',
      'Le ballon fait de la luge sur la pelouse !',
    ],
  },
  chandelleBlague: {
    commentateur: [
      'Chandelle de {nom} ! Le ballon est monté voir s’il y avait quelqu’un là-haut !',
      'Un ballon si haut qu’il a le temps de saluer le ciel !',
    ],
    consultant: [
      'Pendant qu’il redescend, le receveur a le temps de réciter une prière.',
    ],
  },
  miTempsBlague: {
    commentateur: [
      'Mi-temps ! Le temps d’aller chercher une merguez !',
      'Les joueurs rentrent au vestiaire : orange, discours et petits reproches.',
    ],
    consultant: [
      'Dans le vestiaire, l’entraîneur va casser des chaises. Pas les siennes, bien sûr.',
    ],
  },
  remplacementBlague: {
    commentateur: [
      '{nom} entre en jeu, frais comme un gardon.',
      '{nom} arrive des vestiaires : lui, il a eu le temps de s’étirer.',
    ],
  },
  maulBlague: {
    commentateur: [
      'Le maul avance ! Une grosse boule de muscles en marche, personne n’ose se mettre devant !',
      'Une avalanche de maillots, et au milieu, un ballon qui n’en demande pas tant !',
    ],
  },
  tmoBlague: {
    commentateur: [
      'La vidéo ! Le moment où l’on découvre si l’arbitre a de bons yeux.',
    ],
    consultant: [
      'Les ralentis, c’est comme les photos de vacances : on y voit tout ce qu’on ne voulait pas voir.',
    ],
  },
  perceeBlague: {
    commentateur: [
      '{nom} est parti ! On dirait qu’il a entendu la sonnerie de la cantine !',
      '{nom} a mis le turbo ! Il y a un rendez-vous derrière la ligne !',
    ],
  },
  surnombreBlague: {
    consultant: [
      'Deux contre un : même moi, j’aurais fini par marquer.',
    ],
  },
  plaquageBlague: {
    commentateur: [
      '{autre} est allé chercher {nom} aux chevilles, avec une grande politesse.',
      'Plaquage de {autre}, {nom} est invité à s’allonger.',
    ],
  },
  finDeMatchBlague: {
    consultant: [
      'Et maintenant, la vraie bataille commence : la troisième mi-temps.',
    ],
  },
};

const EN: Banque = {
  coupEnvoi: {
    commentateur: ['And we are under way! {club} kick off.', 'Here we go, 80 minutes between {club} and {adv}!', 'The ball is in the air, the match has begun!', 'Kick-off! {adv} to receive.'],
    consultant: ['The first ten minutes will tell us a lot about both game plans.', 'Watch who wins the first collision, it often sets the tone.', 'Patience will be key, both defences are fresh.'],
  },
  repriseSeconde: {
    commentateur: ['Back under way for the second half! {score}.', 'The teams have changed ends, and off we go again!', 'Second half, forty minutes to settle it.'],
    consultant: ['The wind has changed sides, that will matter in the kicking game.', 'This is where the benches start to count.'],
  },
  passeLongue: {
    commentateur: ['Long pass from {nom} to {autre}!', '{nom} goes wide, {autre} has room!', 'Quick hands! {nom} finds {autre}.', 'What a pass from {nom}!'],
    consultant: ['A pass like that takes two defenders out of the game.', 'The ball always travels faster than the man.'],
  },
  offload: {
    commentateur: ['Offload from {nom}! {autre} carries on.', '{nom} keeps it alive, {autre} is away!', 'What a pass out of the tackle from {nom}!'],
    consultant: ['When you offload like that, the defence has no time to reset.', 'He won the collision just enough to free his arms.'],
  },
  cellule: {
    commentateur: ['The {club} forwards carry close to the ruck.', '{nom} takes it at pace with support on each shoulder.', 'Pod of forwards for {club}, {nom} into contact.'],
    consultant: ['Look at the speed he hits the line with, that is how you win the gain line.', 'This forward work ties in the defence and opens the edges.', 'Two supporters on his shoulder, the ball will come quickly.'],
  },
  surnombre: {
    commentateur: ['There is an overlap! {nom} draws and passes to {autre}!', 'Two on one! {nom} plays it perfectly, {autre} has it!', '{nom} holds the defender… and releases {autre} at the last second!', 'Lovely draw and pass from {nom}!'],
    consultant: ['He waited until the defender committed. Half a second earlier and the defence drifts.', 'Draw and pass, the oldest skill in the book, and still the best.', 'The defender had to choose, and either choice was wrong.'],
  },
  feinte: {
    commentateur: ['Dummy from {nom}! He keeps it and he is through!', '{nom} shapes to pass… and goes himself!', 'What a dummy! {nom} sends his man the wrong way!'],
    consultant: ['The defender had already gone for the receiver.', 'He read the defender’s shoulders. The moment they turn, the door opens.'],
  },
  intervalle: {
    commentateur: ['{nom} spots the gap and goes!', 'There is a hole! {nom} is into it!', 'It opens up for {nom}, he accelerates!', '{nom} has seen the space, he attacks the line!'],
    consultant: ['Two defenders too far apart, and he saw it straight away.', 'That was not the called play. He looked up, saw the space, and took it.'],
  },
  percee: {
    commentateur: ['Line break from {nom}! He is through!', '{nom} has broken the line!', 'He is away! {nom} in open field!', 'What a break from {nom}!', '{nom} is gone! Who is going to catch him?'],
    consultant: ['Now he needs support, he will not go all the way alone.', 'The defence rushed up and left space in behind.'],
  },
  perceeStat: {
    commentateur: ['Line break number {n} for {nom} today!', 'Him again! {nom} breaks the line for the {n}th time!'],
    consultant: ['When one player breaks the line {n} times, the defence has not found the answer.'],
  },
  plaquage: {
    commentateur: ['{nom} is brought down by {autre}.', 'Tackle by {autre}, {nom} goes to ground.', '{autre} stops {nom} in his tracks.', 'Well defended by {autre}.'],
    consultant: ['Good low tackle, technique over power.', 'The defensive line is holding, there is no space yet.'],
  },
  plaquageDominant: {
    commentateur: ['Huge tackle from {autre}! {nom} is driven back!', 'What a hit from {autre}!', 'Dominant tackle by {autre}, the defence takes control!'],
    consultant: ['A tackle like that changes the momentum. The whole team feels stronger.', 'He came up fast and hit him before he had any speed.'],
  },
  plaquageStat: {
    commentateur: ['Tackle number {n} for {nom}, and he has not missed one.', '{nom} is everywhere in defence, {n} tackles already.'],
    consultant: ['{n} tackles without a miss, that is a captain’s performance.'],
  },
  ruckRapide: {
    commentateur: ['Quick ball for {club}!', 'It is out in a flash, the defence is not set!', 'Lightning quick ruck, {club} can go again!'],
    consultant: ['Three seconds faster at the ruck means three defenders out of position.', 'This is the moment to attack, the defence is still retreating.'],
  },
  grattage: {
    commentateur: ['Turnover! {nom} has stolen it!', '{nom} is over the ball and he will not let go!', 'What work on the ground from {nom}! Possession overturned!'],
    consultant: ['The carrier was isolated, the support arrived a second too late.', 'Turnover ball is the best ball, the opposition defence is not in place.'],
  },
  grattageStat: {
    commentateur: ['Another turnover for {nom}, his {n}th today!', '{nom} is causing chaos at the breakdown, {n} steals!'],
    consultant: ['The support has to get there quicker or he will keep feasting.'],
  },
  interception: {
    commentateur: ['Intercepted by {nom}! He read the pass!', '{nom} picks it off and he is away!'],
    consultant: ['The pass was telegraphed, he saw it coming.'],
  },
  melee: {
    commentateur: ['Scrum to {club}.', 'The two packs set up, {club} put-in.', 'Crouch, bind, set! {club} scrum.'],
    consultant: ['A good platform to attack from, every back has a man opposite.', 'Watch the front row, that is where it is decided.'],
  },
  meleeGagnee: {
    commentateur: ['The {club} pack is marching forward!', 'What a shove from {club}!'],
    consultant: ['When the scrum goes forward, the opposition back row is tied in.'],
  },
  touche: {
    commentateur: ['Lineout to {club}.', '{club} throw, the lineout forms.', 'We will have a lineout, {club} ball.'],
    consultant: ['This close to the line, expect a maul.', 'They will look for the tail to launch the backs.'],
  },
  toucheRapide: {
    commentateur: ['{nom} takes it quickly! Nobody was back!', 'Quick throw from {nom}, away they go!'],
    consultant: ['Great awareness, the lineout had not formed so he was allowed to play.'],
  },
  maul: {
    commentateur: ['The {club} maul is set and moving!', 'They are driving it! {club} maul!', 'The {club} forwards get organised, the maul rumbles on.'],
    consultant: ['So hard to defend without giving away a penalty, especially this close.', 'The ball is safely at the back, the defence can only hang on.'],
  },
  chandelle: {
    commentateur: ['Up and under from {nom}! Who is underneath it?', '{nom} sends it high!', 'High ball from {nom}, the chase is on!'],
    consultant: ['It all depends on the chase.', 'With this wind, the catch will not be easy.'],
  },
  degagement: {
    commentateur: ['{nom} clears.', 'Long kick from {nom}, {club} can breathe.', '{nom} finds good distance.'],
    consultant: ['You do not play in your own 22, right decision.'],
  },
  occupation: {
    commentateur: ['{nom} kicks for territory.', '{nom} puts the pressure back on the opposition.'],
    consultant: ['It is a battle for territory, the first mistake will be punished.'],
  },
  rasant: {
    commentateur: ['Grubber from {nom}!', '{nom} slides it in behind the defence!'],
    consultant: ['The defence was flat, nobody was covering in behind.'],
  },
  parDessus: {
    commentateur: ['Little chip over the top from {nom}!', '{nom} lifts it over the defence!'],
    consultant: ['When the defence rushes up, that is the right weapon.'],
  },
  passeAuPied: {
    commentateur: ['Cross-kick from {nom} towards the wing!', '{nom} looks for his winger with the boot!'],
    consultant: ['The opposite winger had come up and left his channel open.'],
  },
  essai: {
    commentateur: ['TRY! {nom} scores for {club}!', 'He is over! {nom}! Try {club}!', 'TRY! {nom} finishes it off!', 'What a try from {club}, {nom} with the finish!', '{nom} dives over! Try!', 'Over the line! {nom}! Try for {club}!'],
    consultant: ['It all started from the set piece, and everyone did their job.', 'The defence finally cracked, there were too many phases to defend.', 'Look at the support play, without it there is no try.', 'What a finish. Ice cold.'],
  },
  essaiStatSaison: {
    commentateur: ['That is try number {n} for {club} this season!', '{nom}, {n} tries in {m} matches, what a strike rate!'],
    consultant: ['The numbers do not lie: {n} tries in {m} matches, he is a finisher.'],
  },
  essaiDouble: {
    commentateur: ['A second for {nom}! Two tries today!', 'Him again! {nom} with try number {n} of the match!'],
    consultant: ['When a player is that confident, give him every ball.'],
  },
  transformationReussie: {
    commentateur: ['The conversion is good from {nom}. {score}.', '{nom} adds the extras. {score}.', 'Straight between the posts! {score}.'],
    consultant: ['From that angle, nothing was guaranteed. Lovely strike.'],
  },
  transformationManquee: {
    commentateur: ['The conversion drifts wide. {score}.', '{nom} misses the conversion. {score}.'],
    consultant: ['A tight angle, and the wind did not help.'],
  },
  poteau: {
    commentateur: ['Off the post! {nom} has hit the upright!', 'The post! Unbelievable!'],
    consultant: ['Inches… kicking can be cruel.'],
  },
  penaliteSifflee: {
    commentateur: ['Penalty to {club}.', 'The referee blows, penalty {club}.', 'Infringement from {adv}, penalty.'],
    consultant: ['That was avoidable, under pressure you make poor decisions.', 'Three points or the corner? It depends on the scoreboard.', 'Discipline wins or loses this kind of match.'],
  },
  penaliteReussie: {
    commentateur: ['Three points for {club}! {nom} slots the penalty. {score}.', 'It is good! {score}.', '{nom} knocks it over, three points. {score}.'],
    consultant: ['Take the points when they are on offer, and they did.'],
  },
  penaliteManquee: {
    commentateur: ['{nom} misses the penalty. Still {score}.', 'Wide! The attempt from {nom} does not go over.'],
    consultant: ['The distance was on the limit, he needed a perfect strike.'],
  },
  drop: {
    commentateur: ['Drop goal attempt from {nom}!', '{nom} sits in the pocket… he strikes!'],
    consultant: ['In front of the posts at that range, it is the right call.'],
  },
  dropReussi: {
    commentateur: ['DROP GOAL! It is over! Three points from {nom}! {score}.'],
    consultant: ['Nerves of steel. Few players still dare to try it.'],
  },
  cartonJaune: {
    commentateur: ['Yellow card for {nom}! {adv} down to 14 for ten minutes.', 'The referee reaches for yellow, {nom} heads to the bin.'],
    consultant: ['Ten minutes with fourteen costs seven points on average. Time to dig in.', 'That was one offence too many, the referee had warned the captain.'],
  },
  cartonRouge: {
    commentateur: ['Red card! {nom} is sent off!', 'It is red for {nom}! The match turns!'],
    consultant: ['Nothing to argue about, head contact is punished that way today.'],
  },
  enAvant: {
    commentateur: ['Knock-on by {nom}.', 'It slips away from {nom}, knock-on.', '{nom} cannot hold it. Scrum to {adv}.'],
    consultant: ['A shame, the move was well set up.'],
  },
  remplacement: {
    commentateur: ['Change for {club}: {nom} comes on.', '{nom} enters the fray for {club}.'],
    consultant: ['Fresh legs at this stage can change everything.'],
  },
  tmo: {
    commentateur: ['The referee goes upstairs.', 'We are going to have another look at this.'],
    consultant: ['He wants to be sure of the grounding, let us see it in slow motion.'],
  },
  grosImpact: { commentateur: ['Oh, what a collision!', 'What a hit! The whole stadium heard that!'], consultant: ['That is the physical side of this sport.'] },
  miTemps: {
    commentateur: ['That is half-time! {score}.', 'The players head for the changing rooms at {score}.'],
    consultant: ['Forty minutes left and nothing is decided.', 'The coaches have ten minutes to fix what is not working.'],
  },
  finDeMatch: {
    commentateur: ['It is all over! {club} win, {score}!', 'Full time! {club} take it {score}!'],
    consultant: ['A deserved win, they were sharper in the big moments.', 'What a match. Both teams can be proud.'],
  },
  matchNul: { commentateur: ['It ends all square! {score}.'], consultant: ['Nobody deserved to lose, but nobody could finish it.'] },
  finSerree: {
    commentateur: ['{n} minutes to go and only {m} points in it!', 'What a finish! {score}, anything can happen!'],
    consultant: ['Now it is all in the head. The first team to give away a penalty loses.'],
  },
  analyse: {
    consultant: ['{club} have had {n} percent of the ball in the last ten minutes, {adv} cannot get hold of it.', 'This is a very physical contest, legs will tire late on.', 'The {club} set piece is clean today, that is the foundation of everything.'],
  },
  confrontations: { consultant: ['{club} have won their last {n} meetings with {adv}, there is a psychological edge.'] },
  serie: { consultant: ['{club} are on a run of {n} wins, the confidence is there.'] },
  relance: { commentateur: ['You could not have put it better!', 'Exactly, and here they come again!'] },

  // ── Banter in the box (see the French block for how it is triggered) ──────
  plaquageCaramel: {
    commentateur: [
      'Oh, what a cracker! {autre} has absolutely flattened {nom}!',
      'Huge hit from {autre}! {nom} will feel that on Monday!',
      'Delivery for {nom}, courtesy of {autre}, with a ribbon on top!',
      'That is not a tackle, that is a house move! {autre} has relocated {nom}!',
      'Did you hear that? Even the stand said ouch! {autre} on {nom}!',
      '{nom} wanted to come through, {autre} said no, and he said it loudly!',
    ],
    consultant: [
      'We will be watching that one again in the third half.',
      'He will have aches in places he did not know he had.',
      'Technically perfect: shoulder, hip, and take the customer with you.',
      'The physio has a long Sunday ahead.',
    ],
  },
  fessesParTerre: {
    commentateur: [
      'And {autre} ends up on his backside! {nom} went through like butter!',
      '{autre} has sat down! He is still looking for where the ball went!',
      'Down on the seat of his shorts goes {autre}! {nom} with the magic carpet!',
      '{nom} leaves {autre} sitting on the turf! What a sidestep!',
      '{autre} takes a seat in the middle of the field! {nom} is gone!',
    ],
    consultant: [
      'When you end up on your backside, the footwork was not right.',
      'He came up too fast and had no legs left for the change of step.',
      'Nothing hurt but the pride. And the shorts.',
    ],
  },
  enAvantBlague: {
    commentateur: ['Knock-on by {nom}. He must have thought it was basketball.', 'The ball slipped from {nom}’s hands. Too much sun cream, perhaps.'],
    consultant: ['We have seen safer pairs of hands.'],
  },
  meleeBlague: {
    commentateur: ['Scrum! Sixteen gentlemen about to have a big hug.', 'A scrum is the only meeting where everyone pushes in the same direction. Almost.'],
    consultant: ['Do not be fooled by the mood, nobody is laughing under a scrum.'],
  },
  toucheBlague: {
    commentateur: ['Lineout! The art of throwing a ball straight to a man being lifted.'],
    consultant: ['You just throw it straight. Easy when you put it like that.'],
  },
  grattageBlague: {
    commentateur: ['{nom} has had his hand in the biscuit tin and nobody saw!', '{nom} has picked the carrier’s pocket! Legal, but still theft!'],
    consultant: ['A remarkable sense of ownership. Especially of other people’s property.'],
  },
  penaliteManqueeBlague: {
    commentateur: ['{nom}’s penalty goes looking for the moon. It did not find the posts.', '{nom} aimed at the posts, the ball aimed at the stand. The ball won.'],
    consultant: ['The stand applauds, out of politeness.'],
  },
  transformationManqueeBlague: {
    commentateur: ['{nom}’s conversion has written the wrong address.'],
    consultant: ['Two points on the floor, but they will turn up in the table at the end.'],
  },
  essaiBlague: {
    commentateur: ['TRY! {nom} has placed the ball down like a boiled egg!', 'There it is! {nom} grounds it while the defence looked the other way!'],
    consultant: ['The defence left a yard. He took ten.', 'Everybody saw the try coming, except the defenders.'],
  },
  cartonJauneBlague: {
    commentateur: ['Ten minutes to think it over for {nom}. Time for a good book.'],
    consultant: ['The bin is comfortable, apparently. Mostly for everybody else.'],
  },
  rasantBlague: { commentateur: ['A little grubber from {nom}, along the daisies!', 'The ball is going sledging on the turf!'] },
  chandelleBlague: {
    commentateur: ['Up and under from {nom}! The ball has gone to see if anyone is home up there!'],
    consultant: ['While it comes down, the receiver has time to say a prayer.'],
  },
  miTempsBlague: {
    commentateur: ['Half-time! Time to queue for a burger!'],
    consultant: ['In the changing room the coach will break some chairs. Not his own, obviously.'],
  },
  remplacementBlague: { commentateur: ['{nom} comes on, fresh as a daisy.', '{nom} arrives from the bench: he had time to stretch, at least.'] },
  maulBlague: { commentateur: ['The maul is rolling! A big ball of muscle and nobody wants to stand in front of it!'] },
  tmoBlague: {
    commentateur: ['Video referee! The moment we find out if the whistle-blower has good eyes.'],
    consultant: ['Slow motion is like holiday photos: you see everything you did not want to see.'],
  },
  perceeBlague: { commentateur: ['{nom} is off! It sounds like he heard the dinner bell!'] },
  surnombreBlague: { consultant: ['Two against one: even I would have scored that.'] },
  plaquageBlague: { commentateur: ['{autre} goes for {nom} around the ankles, very politely.'] },
  finDeMatchBlague: { consultant: ['And now the real battle begins: the third half.'] },
};

const BANQUES: Record<LangueRetransmission, Banque> = { fr: FR, en: EN };

/** Les sacs de phrases d'UNE retransmission : chacun se vide avant de se remplir. */
export function creerSacs(langue: LangueRetransmission, alea: () => number = Math.random) {
  const sacs = new Map<string, string[]>();
  return {
    langue,
    /** Une phrase de cette catégorie pour cette voix, ou `null` si la catégorie n'en a pas. */
    tirer(categorie: string, voix: Voix): string | null {
      const source = BANQUES[langue][categorie]?.[voix];
      if (!source?.length) return null;
      const cle = `${categorie}|${voix}`;
      let sac = sacs.get(cle);
      if (!sac?.length) { sac = [...source]; sacs.set(cle, sac); }
      return sac.splice(Math.floor(alea() * sac.length), 1)[0];
    },
  };
}

/** Remplit les variables d'une phrase ; une variable inconnue rend la phrase inutilisable (`null`). */
export function remplir(phrase: string, vars: Record<string, string | number | undefined>): string | null {
  let manque = false;
  const texte = phrase.replace(/\{(\w+)\}/g, (_, nom: string) => {
    const v = vars[nom];
    if (v === undefined || v === '') { manque = true; return ''; }
    return String(v);
  });
  return manque ? null : texte;
}

/** Nombre de phrases par langue, pour les bancs et la documentation. */
export function compterPhrases(langue: LangueRetransmission): { categories: number; phrases: number } {
  const b = BANQUES[langue];
  let phrases = 0;
  for (const c of Object.values(b)) phrases += (c.commentateur?.length ?? 0) + (c.consultant?.length ?? 0);
  return { categories: Object.keys(b).length, phrases };
}
