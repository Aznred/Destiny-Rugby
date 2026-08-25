# Destiny Rugby 🏉

**Le RPG de carrière de rugby où une IA joue le Maître du Jeu.**

Incarne un rugbyman de ses débuts jusqu'au sommet. Tu **écris tes actions** en
langage naturel (entraînement, match, contrat, médias, vie perso…), et le
**Maître du Jeu** juge le résultat de façon réaliste : il raconte ce qui se
passe et fait **monter ou chuter tes statistiques** en conséquence. Tu n'as ni
clé à saisir ni modèle à télécharger : le jeu apporte la sienne.

Inspiré des jeux de carrière type *Destin Eleven*, mais pour l'**ovalie**.

---

## ✨ Fonctionnalités

- **Une scène par semaine, écrite pour toi.** Il n'y a plus de bouton à cliquer
  pour « vivre quelque chose » : chaque semaine de calendrier, le Maître du Jeu
  pose une situation — un test physique, un président qui traîne à payer, un
  journaliste, un ami d'enfance, une soirée qui dérape, des clés de voiture qu'on
  te tend à 23 h. **Tu réponds en écrivant ce que tu fais**, et il juge. Environ
  une scène sur cinq est réellement dangereuse : là, et seulement là, ça peut
  finir en suspension, en garde à vue, à l'hôpital — ou pire.
  *Si l'IA est désactivée ou son quota épuisé, le jeu reste entier : la même
  scène arrive chaque semaine, avec des réponses à choix multiples.*
- **Maître du Jeu servi par Groq**, avec la clé du site : rien à installer,
  rien à télécharger, rien à saisir, et une réponse en une fraction de seconde.
  **Quand le quota est atteint, le jeu ne le dit pas** — il bascule sur ses
  situations pré-écrites et repasse sur l'IA tout seul dès qu'elle revient. Il
  juge chaque décision
  selon les attributs, la forme, le moral, la réputation et le contexte, puis
  renvoie un récit + des variations de stats structurées. Il est **sévère** :
  par défaut une action ne change presque rien, l'échec est fréquent, et on ne
  progresse jamais en le demandant — les gains passent par un plafond côté code
  (+2 max par action, 4 points d'attributs par saison, plus rien après 36 ans) que
  ni le joueur ni l'IA ne peuvent contourner. Il ne peut pas non plus te faire
  changer de club dans son récit : quand tu dis que tu veux partir, c'est le
  **vrai marché** qui s'ouvre, et rien ne bouge tant que tu n'as pas signé.
- **Création de joueur** : nom (**laissé vide, il est tiré dans le style de ta nationalité** — « Sergo Shvangiradze » en Géorgie, « Afonso Madeira » au Portugal), **âge de 16 à 30 ans** (réglable au clavier ou au pouce, − / +), **202 nations** (groupées par continent,
  avec leur vrai drapeau), championnat et club de départ (France ou étranger),
  les **15 postes** numérotés 1 à 15, et **2 traits de caractère** à choisir
  parmi **24** — ils te suivront toute ta carrière. Douze sont là d'entrée ;
  les **douze archétypes** restants se débloquent en Ovas dans la boutique et
  restent acquis pour toutes tes carrières suivantes. ⚠️ **On y achète du
  choix, pas de la puissance** : on en porte toujours deux, et chacun coûte
  autant qu'il rapporte (le « Roc » ne se blesse presque jamais et ne progresse
  quasiment plus ; la « Tête brûlée » gagne les finales et collectionne les
  cartons). Tu démarres avec une générale
  de **30 à 40** : tout est à construire. Les listes
  déroulantes sont des composants maison (drapeaux, blasons, recherche
  instantanée, navigation clavier) au thème du jeu.
- **Guide de carrière** (🎓) : une pastille discrète accompagne les premières
  semaines, de la fiche au premier match jusqu’au premier transfert. Elle ne
  force rien : les étapes se cochent toutes seules quand tu fais les choses, et
  le chapitre sur les transferts est lisible dès le premier jour.
- **Progression vivante** : 8 attributs (vitesse, force, endurance, plaquage,
  passe, jeu au pied, vision, mental) + forme, moral, réputation, argent.
  Chaque saison reçoit une **note sur 10** (temps de jeu, essais rapportés à ton
  poste, niveau face à ton groupe, forme, résultat du club) et **c'est elle qui
  fait bouger tes stats** : une saison pleine à 20 ans fait exploser la générale,
  une saison sur le banc la fait stagner, et après 31 ans le déclin s'installe.
  Ton **potentiel** n'est pas gravé non plus : une saison énorme relève ton
  plafond, une saison ratée le rabote.

  Étalonné sur 100 carrières de 12 saisons (départ Nationale 2 à 18 ans) :
  générale finale **médiane 58**, un quart des carrières plafonnent à 45 en
  Fédérale, **une sur huit atteint 80** (le niveau international) et **une sur
  trente dépasse 85**. Le talent seul ne suffit pas : sans temps de jeu, un
  joueur au potentiel de 95 finit à 63.
- **Jouable sans clé IA** : « 📖 Vivre une situation » (scénarios à **choix**
  avec conséquences) et « 🎲 Évènement aléatoire » (blessure, recruteur, essai,
  polémique, sponsor…) — bonus/malus et gain d'Ovas, **sans appel API**.
  Limités à **2 de chaque par saison** pour garder l'équilibre.
- **Clubs & Championnats** (🌍) : **l'atlas de l'ovalie**, en trois onglets.
  - 🇫🇷 **France** — la pyramide complète sur **10 divisions**, du sommet au
    dimanche après-midi : Top 14 (14) · Pro D2 (16) · Nationale (14) ·
    Nationale 2 (26) · Fédérale 1 (48) · Fédérale 2 (95) · Fédérale 3 (157) ·
    Régionale 1 (63) · Régionale 2 (60) · Régionale 3 (62). **655 clubs.**
  - 🌐 **Monde** — Premiership, RFU Championship, URC, Super Rugby Pacific,
    NPC, Japan Rugby League One D1/D2/D3, MLR, plus les **coupes d'Europe**
    (Champions Cup, Challenge Cup) et la Premiership Rugby Cup.
  - 🏳️ **Sélections** — l'annuaire des équipes nationales, pas des
    compétitions : **toutes les sélections séniors** (une seule par pays : ni
    équipes A, ni XV, ni Barbarians) puis **toutes les sélections U20**, avec
    leur logo, leur drapeau et le nombre de compétitions qu'elles disputent.

  **Presque tous les clubs** affichent leur **vrai logo** (715 écussons, du
  Stade Toulousain au RC Champagnole) et leur note générale — et **un clic sur
  un club ouvre son effectif complet**, poste par poste. Choix du **club et de
  la division de départ** à la création : on peut commencer sa carrière en
  Régionale 3 comme au Stade Toulousain — ou **à l'étranger** : les 20
  championnats (Premiership, URC, Super Rugby, League One, MLR…) sont proposés
  à la création, groupés par pays.
- **Marché des transferts** (✈️) : les clubs te contactent par message privé sur
  **L'Ovale**. Tu négocies salaire, prime, durée et temps de jeu ; un club peut
  contre-proposer ou se braquer. Un accord signé n'est appliqué qu'à
  **l'intersaison**. Tu peux aussi demander à ton agent de sonder le marché — le
  vestiaire n'aimera pas (−6 de moral). Le marché se souvient désormais des deux
  dernières saisons et privilégie de nouveaux interlocuteurs ; une star reçoit
  aussi des projets de clubs moyens qui veulent en faire leur tête d'affiche.
- **Carrière à l'étranger** 🌍 : l'accès dépend du niveau de la ligue. Un joueur
  amateur peut rejoindre un petit championnat étranger de sa force, tandis que
  la Premiership, l'URC, le Super Rugby, la League One japonaise ou la MLR
  demandent une vraie notoriété. Tous leurs clubs sont trouvables et joignables
  dans l'annuaire de **L'Ovale**.
- **Le monde bouge sans toi** : chaque intersaison, les clubs recrutent et
  laissent filer des joueurs. La saison 2 applique le **vrai mercato estival**
  (3 224 mouvements réels, Top 14 → Nationale 2) ; ensuite, chaque division
  organise ses propres échanges. Tes coéquipiers ne sont jamais les mêmes deux
  saisons de suite.
- **Résultats en direct** (📊) : ton championnat se joue vraiment, journée par
  journée — tous les résultats équipe contre équipe, le classement au barème
  rugby (4/2/0 + bonus offensif et défensif), et ton club surligné. C'est ce
  classement qui décide du titre, des coupes d'Europe et des descentes. Tu peux
  aussi **consulter n'importe quel autre championnat** (les 20 sont là) et les
  **coupes d'Europe**, jouées elles aussi pour de vrai : poules, puis quarts,
  demies et finale affichés sous forme d'**arbre**. Pendant une semaine
  européenne, c'est ta coupe qui s'ouvre en premier si ton club y est engagé.
- **L'Ovale** (𝕏) : le réseau social du jeu, dans une interface calquée sur X —
  et **entièrement écrit par l'IA**. Les clubs, les joueurs, les journalistes et
  les supporters publient (avec leurs propres pseudos), les commentaires sous
  tes posts sont générés pour CE post, tu peux **suivre** qui tu veux et leur
  **écrire en message privé** : l'IA locale répond à leur place, dans leur rôle.
  Tu publies ce que tu veux (5 tons, du plus humble au clash) — et si tu
  dérapes, ton club te convoque et te met à l'amende.
  ⚠️ **Les annonces sont réelles** : quand un compte annonce un transfert, le
  joueur change vraiment de club dans le jeu (mais personne ne peut te
  transférer par un tweet : pour toi, ça reste une offre à accepter).
  Le même écran regroupe tes **notifications**, tes **succès** (**68**, dont 18
  secrets — ils rapportent des Ovas et traversent tes carrières) et les **3 défis
  de la semaine**. Sans IA locale, un repli pré-écrit prend le relais.
- **Séance d'entraînement hebdomadaire** (💪) : chaque semaine, tu choisis un
  secteur à travailler. Ça coûte 4 de forme, ça ne réussit pas à tous les coups,
  et ça ne dépasse jamais ton potentiel — mais sur une carrière, ça change tout.
- **Note Générale** (badge doré GÉN) visible sur le panneau joueur.
- **Mon équipe** (👥) : l'effectif complet de ton club, avec postes, âges, notes
  et **nationalités en vrais drapeaux SVG**.
  - **6 306 joueurs réels de la saison 2025-26**, dans **143 clubs** : tout le
    Top 14, la Pro D2, la Nationale, la Premiership, le Championship, l'URC, le
    Super Rugby, le NPC, les trois divisions japonaises et la MLR. Dupont,
    Bielle-Biarrey, Alldritt, Itoje, Doris, Savea, Kolbe, Etzebeth, Marx…
  - Dans les divisions **amateurs** (Nationale 2 → Régionale 3), ce sont aussi
    de **vrais licenciés** : **12 086 joueurs** de 384 clubs, avec leur nom et
    leur poste. La source ne donne ni âge ni note : ils sont tirés au sort de
    façon déterministe autour du niveau de la division.
  - Dans les deux cas ils **vieillissent** chaque saison et les retraités sont
    remplacés par de jeunes **regens** 🌱 — qui empruntent leur nom et leur
    nationalité à l'effectif du club : un espoir de Kintetsu s'appelle Tanaka,
    un espoir des Bulls s'appelle Van Heerden.
- **Progression et déclin.** Chaque joueur a un **potentiel** : la note qu'il
  atteindra à son pic, vers 27 ans. Les espoirs progressent saison après saison
  (affichés « ↗ 84 »), les trentenaires déclinent (« ↘ »). Deux jeunes de même
  note n'ont pas la même marge : certains explosent, d'autres stagnent.
- **Notes calculées sur les vrais chiffres.** La note d'un **club** vient de son
  **classement de la saison passée** (rang + points et différence par match),
  ramené à l'échelle du championnat qu'il disputait alors : Toulouse 85,
  Montpellier 83, Paris 82… ; Glasgow 84 en URC, les Hurricanes 84 en Super
  Rugby. Les montées et descentes tombent donc juste : Vannes, champion de
  Pro D2 (72), débarque **dernier du Top 14** ; Montauban, relégué (67), arrive
  **premier de Pro D2**.
  La note d'un **joueur** vient de son **temps de jeu réel** rapporté à celui des
  cadres de son club, de ses essais et de ses points au pied, de sa nation et de
  son âge — et les ~450 internationaux identifiés ont une note calibrée à la
  main. Son **potentiel** dépend de son âge et de la place qu'il tient déjà.
- **Les résultats dépendent vraiment de l'équipe.** Le classement du club en fin
  de saison vient de la **note moyenne de ses 23 meilleurs joueurs cette
  saison-là**, comparée au niveau moyen de la division. Un effectif qui vieillit
  fait chuter le club ; une génération qui éclot le fait remonter. Ta propre
  saison (temps de jeu, essais, forme, moral) ne fait qu'infléchir le résultat —
  et tes matchs et essais sont désormais **simulés chaque saison** selon ton
  niveau face à ton groupe et ton poste.
- **Hero 3D immersif** : **ton** rugbyman, en entier et de la tête aux crampons,
  habillé de ce que tu lui as acheté au vestiaire, avec un sac de plaquage posé
  à ses pieds. Tant qu'aucune carrière n'est commencée, c'est le ballon France
  Rugby qui pose (modèles `.glb` compressés Draco).
- **Cérémonies de trophées** 🏆 : chaque titre remporté déclenche une **modale
  avec le vrai trophée en 3D qui tourne sur lui-même**, particules et aura
  colorée. Titres gagnables chaque saison, selon ton niveau et ta division :
  | Trophée | Condition |
  |---|---|
  | Bouclier de Brennus | Champion Top 14 (phase finale = top 6) |
  | Trophée Pro D2 / Bouclier de Nationale | Champion de sa division |
  | Champions Cup | Top 14, club classé dans les **8 premiers** |
  | Challenge Cup | Top 14, club classé dans les **6 derniers** |
  | Tournoi des 6 Nations | Sélectionné avec une nation du Tournoi |
  | Coupe du monde | Tous les 4 ans, si sélectionné |

- **Les honneurs individuels** 🥇 : huit distinctions personnelles, qui ne se
  jouent pas — elles se **méritent**. Elles sont décernées sur **ta note de
  saison** (les deux tiers de la cote), **tes statistiques comparées à ce qu'on
  attend de ton poste**, et **le palmarès de ton année**. Aucun tirage au sort :
  la même saison rejouée donne toujours le même verdict.
  | Distinction | Où, et à quelles conditions |
  |---|---|
  | Meilleur joueur du Top 14 | Top 14 |
  | Meilleur joueur de la Premiership | Gallagher Premiership |
  | Meilleur joueur de l'URC | United Rugby Championship |
  | Meilleur joueur de Nouvelle-Zélande | Super Rugby Pacific **ou** Bunnings NPC |
  | Meilleur joueur de la Champions Cup | Il faut disputer l'épreuve (top 8) |
  | Meilleur joueur du Tournoi | Il faut être sélectionné |
  | Homme du match — finale de Coupe du monde | Il faut avoir gagné la finale |
  | Meilleur joueur de l'année | Le sommet : une saison énorme **et** un titre |

  ⚠️ **Seuls cinq championnats élisent un joueur de l'année**, parce que c'est le
  cas dans la réalité : on ne décerne pas d'Oscar en Fédérale 3. Mesuré sur
  60 carrières de 14 saisons partant de Nationale 2 : **5 carrières sur 60** en
  décrochent au moins une, soit 0,13 par carrière. C'est un objectif, pas un dû.

  Les **8 trophées des championnats du monde** (Gallagher Premiership, RFU
  Championship, Premiership Rugby Cup, URC, Super Rugby Pacific, Bunnings NPC,
  Japan Rugby League One, Major League Rugby) sont **modélisés et branchés** au
  catalogue — et **désormais décernés** : signer à l'étranger permet de jouer le
  titre de son championnat, avec la vraie taille de poule (Premiership 10,
  URC 16…). La Premiership et l'URC donnent aussi accès aux coupes d'Europe.

  Chaque fin de saison affiche d'abord le **classement de ton club** dans sa
  poule (déduit de ton niveau face à celui de ta division) — c'est lui qui
  détermine la coupe d'Europe disputée et l'accès à la phase finale.
- **L'Ovale au rythme de la saison** : le réseau social ne clignote plus toutes
  les 8 secondes — **chaque semaine jouée apporte sa fournée de publications**,
  datée, cohérente avec ce qui se passe (journée de championnat, Coupe d'Europe,
  Tournoi, phase finale, mercato). On **commente** sous un post (l'auteur
  riposte, et ça change ta relation avec lui) et on **reposte** (ça apparaît sur
  ton profil). Les compteurs vues / likes / reposts se tiennent enfin.
  Les images viennent de **Wikimedia Commons** (libre, sans clé), les GIFs de
  **Tenor** si tu ajoutes une clé gratuite dans ⚙️, et si le réseau ne répond
  pas une vignette dessinée en local prend le relais.
- **Ton profil ne change qu'après validation** : nom, @, bio, photo et bannière
  se règlent dans un brouillon avec un **aperçu « non enregistré »**, plus les
  boutons Annuler / Enregistrer.
- **Le calendrier est cliquable** : depuis la carrière, il ouvre les **44
  semaines de la saison** et **toutes les affiches de l'année**, jouées comme à
  venir — le programme de la dernière journée est consultable dès le mois d'août.
- **Vraies montées et descentes sur les 10 étages français** (plus seulement ta
  division) : ~40 clubs changent de division chaque saison.
- **Poules et tournoi de fin d'année** : les grandes divisions amateurs sont
  découpées en poules de 12, et le champion sort d'un **tournoi façon coupe de
  France** entre les meilleurs de chaque poule.
- **Pas de trêve en bas de la pyramide** : de la Nationale 2 à la Régionale 3,
  on joue **aussi** les week-ends de Coupe d'Europe et de Tournoi des 6 Nations.
- **Le match de la semaine se joue sous tes yeux** : un terrain aux proportions
  réelles vu du dessus (en-buts, 22 m, 10 m en pointillés, poteaux), 15 pions
  par équipe aux couleurs du club, le ballon qui circule, le score et le chrono
  qui tournent et le commentaire qui descend — 80 minutes, en pause ou en ×4.
  Le placement suit le rugby : les avants au regroupement, le 9 à la sortie du
  ruck, les trois-quarts étalés, et en face une vraie **ligne défensive**. Le
  résultat est le vrai : regarder le match ou passer la semaine donne exactement
  le même score.
- **🎮 Tu joues ton joueur, pas seulement ton club.** Pendant le match, une barre
  d'actions suit la phase : ballon en main, tu **sprintes**, tu **crochètes**, tu
  **raffutes**, tu **passes** ou tu **tapes** ; sans ballon, tu **réclames** la
  balle ou tu **suis le porteur** ; en défense, tu **plaques**, tu **montes** ou
  tu **grattes** au sol. Raccourcis 1 à 9 au clavier, boutons au pouce sur
  téléphone. Chaque geste coûte de l'endurance et se paie quand il rate : un
  plaquage lancé et manqué laisse un trou, un grattage mal placé donne une
  pénalité. Tu changes **comment** on marque, jamais **combien** : le score reste
  celui du championnat.
- **🥊 Et tu peux chercher la bagarre.** Chambre un adversaire et la température
  du match monte ; quelqu'un finit par craquer, et là **le jeu s'arrête et te
  demande un ordre** : on y va tous, protège-le, on se calme, ou je recule.
  ⚠️ **Ça ne se passe pas du tout pareil selon l'étage.** En Fédérale ça part au
  quart de tour et l'arbitre distribue les cartons — mais la commission fait dans
  la semaine et le pardon. En Top 14, personne ne relève une provocation ; celui
  qui craque prend un rouge, une convocation, la vidéo, et **peut y laisser sa
  saison** (jusqu'à 34 semaines). Sans compter la main cassée sur un casque.
- **Classements individuels dans toutes les ligues** : meilleurs marqueurs,
  meilleurs pointeurs, **% de réussite des buteurs**, plaquages (nombre et
  taux), grattages, turnovers, passes décisives, cartons, temps de jeu. Tous les
  joueurs de toutes les compétitions ont leurs statistiques ; toi, tu y figures
  avec tes vrais chiffres de la saison.
- **De vraies photos de profil sur L'Ovale** (plus un seul emoji) : les clubs
  portent leur écusson, les championnats leur logo, et tout le monde a son
  visage. Le réseau se peuple aussi de **gens ordinaires** — Jean-Michel,
  Sylvie, Patrick — qui commentent depuis leur canapé.
- **Les tweets vivent** : les vues, likes et reposts d'une publication continuent
  de monter les semaines suivantes, de moins en moins vite, et **chaque** post
  reçoit ses commentaires (écrits sur mesure quand l'IA locale est active).
- **IA dans les réglages** : téléchargement lancé automatiquement en
  arrière-plan au premier démarrage compatible, progression,
  activation/désactivation et suppression du modèle mis en cache.
- **Ballon 3D** : modèle `.glb` (France Rugby) **compressé Draco (0,45 Mo)**,
  sinon ballon texturé codé (recolorable par les skins).
- **Monnaie « Ovas » (🪙)** volontairement **rare** : ~1-5 par action/saison.
  Le solde n'est visible **que dans la Boutique** — chaque skin se mérite.
- **Boutique** : skins de ballon 3D (dont **France Rugby**) et packs d'Ovas de
  démonstration. Aucun bonus de performance ne s'achète ; le skin choisi
  s'affiche partout.
- **Hall des Légendes** (🏛️) : chaque carrière menée à la retraite est
  immortalisée avec son parcours et son score.
- **Classement mondial** (🏆) : ta carrière face à des légendes (score global :
  niveau, réputation, longévité, titres, essais).
- **Classement World Rugby des sélections** (🌍) : **114 nations** démarrent
  avec leur note réelle sur 100, puis échangent des points après chaque match
  international joué dans la carrière.
- **Profil / palmarès** : note globale, faits marquants, titres.
- **Ballon 3D texturé** codé en Three.js (façon Gilbert France Rugby : coq,
  swooshes, coutures) — chargé à la demande.
- **100 % responsive** (mobile → desktop), thème « stade nocturne » soigné.
- **Sauvegarde locale** automatique (localStorage).

## 🌍 Le monde du jeu s'agrandit — 18 championnats de plus

Aux 20 compétitions déjà présentes s'ajoutent **18 championnats et coupes** et
**13 compétitions de sélections**, tirés de `sources/competitions/ligues/` :

| | |
|---|---|
| Europe de l'Ouest | Serie A Elite (Italie), División de Honor (Espagne), CN Honra (Portugal), All-Ireland League, Super Series (Écosse), Welsh Premiership, Super Rygbi Cymru, Welsh Challenge Cup, Championship Cup (Angleterre), Ereklasse (Pays-Bas) |
| Europe de l'Est | Didi 10 (Géorgie), Liga Națională (Roumanie), Ekstraliga (Pologne), Extraliga (Tchéquie), Premier League (Russie), SM-sarja (Finlande) |
| Hors d'Europe | Top 12 argentin, Heartland Championship (Nouvelle-Zélande) |
| Sélections | Rugby Europe Championship / Trophy / Conference, Oceania Cup, Americas Championship, Americas Pacific Challenge, Autumn Nations Cup, IRB Tbilisi Cup, Nations Cup, Pacific Challenge, The Rugby Championship (+ U20), World Rugby U20 Trophy |

**183 clubs, 247 écussons officiels, 5 070 joueurs et 86 équipes nationales.**
Les clubs et leur hiérarchie sont **réels** (la note de chaque club est calculée
sur les points et la différence de points par match de la vraie saison) ; les
**joueurs sont générés**, avec des noms du pays et une part d'étrangers propre à
chaque championnat — un club géorgien aligne des Giorgi Chkhaidze, pas des Léo
Etcheverry, mais on y croise quand même un Argentin et un Australien.

Régénérer : `node scripts/genNouvellesLigues.cjs` (la table des ligues et leur
calibrage sont dans `scripts/nouvellesLigues.cjs`).

### Le classement World Rugby vit avec les résultats

`src/data/classementWorldRugby.ts` contient les **114 notes de départ**. Le jeu
n'utilise plus un Elo fictif autour de 1 000 points : il applique l'échange de
points World Rugby dans `src/lib/classementWorldRugby.ts`.

- l'équipe qui reçoit est considérée comme ayant **3 points de plus** ;
- une victoire attendue rapporte peu, un exploit rapporte davantage ;
- un nul transfère des points de la mieux notée vers la moins bien notée ;
- une marge supérieure à 15 points multiplie l'échange par **1,5** ;
- les matchs de Coupe du monde comptent **double** et sont à terrain neutre ;
- chaque point gagné est perdu par l'adversaire, et les notes restent entre
  **0 et 100**.

Le classement de l'écran Résultats est recalculé jusqu'à la semaine courante :
il évolue donc dès la fenêtre internationale suivante. Vérification :
`npx vite-node scripts/verifClassementWorldRugby.ts`.

## 🔍 Référencement et vitesse

- **Balises complètes** : Open Graph, Twitter Card, canonique, JSON-LD
  `VideoGame`, et une **image de partage 1200×630** générée sans dépendance
  (`node scripts/genOgImage.cjs`). Plus `robots.txt`, `sitemap.xml` et un
  manifeste web pour l'installation sur mobile.
- **Premier chargement allégé** : la feuille de style passe de **503 à 112 Ko**
  (les 250 drapeaux ne sont plus recopiés dedans en base 64), et sept écrans
  plus le moteur de match ne sont téléchargés qu'au moment où l'on s'en sert.

## 📈 Mesure d'audience : un écran vaut une page vue

Le conteneur **Google Tag Manager** (`GTM-KF48DSQ9`) est posé sur les cinq pages
du site : `index.html` pour le jeu, et `scripts/genPages.cjs` pour les quatre
pages de contenu — c'est le **générateur** qu'on modifie, jamais le HTML qu'il
écrit, sinon la balise disparaîtrait à la première régénération.

Le script est `async` et sans dépendance : bloqué par un bloqueur de publicité
ou par un réseau coupé, la page se charge exactement pareil.

⚠️ **Le jeu n'a qu'une seule URL.** Changer d'écran ne change pas l'adresse :
pour Google Analytics, toute une session — accueil, création, carrière, match,
classement — ne comptait qu'**une page vue**, et il était impossible de voir où
les joueurs décrochent. `src/lib/mesure.ts` pousse donc un `virtual_pageview`
(`/jeu/carriere`, `/jeu/classement`…) à chaque changement d'écran.

Un routeur aurait coûté beaucoup plus cher pour le même résultat : les écrans
sont des vues d'un état Zustand persisté, pas des documents indépendants — leur
donner de vraies adresses obligerait à gérer le bouton « retour » du navigateur
en pleine partie, pour un gain nul côté joueur.

L'appel vit dans `App.tsx` et non dans `setEcran`, parce que **six écritures du
store posent `ecran:` directement** sans passer par elle. Et rien n'est envoyé
sur le joueur lui-même : ni son nom, ni son club, ni son pseudo.

## ⚙️ Activité de l'IA locale, mesurée

L'Ovale a été ramené de **trois appels par semaine à un seul**, commentaires
compris, et les comptes à suivre ne passent plus par l'IA du tout — ils viennent
de l'annuaire du jeu.

Le **récit hebdomadaire** en ajoute deux : la scène, puis son jugement. Soit
**trois appels par semaine de jeu**, ~130 par saison. C'est le prix de la boucle
narrative. Les générations sont sérialisées pour ne jamais lancer plusieurs
calculs en même temps. Le compteur exact (appels, tokens d'entrée et de sortie)
s'affiche dans ⚙️ ; il n'est associé à aucun coût ni quota.

## 🌐 Sept langues, une ambiance au choix, et le téléphone d'abord

- **Français, anglais, espagnol, italien, allemand, portugais, japonais.** La
  langue est choisie automatiquement d'après le **pays de l'adresse IP** par la
  fonction Vercel `api/langue.ts` (sans stocker ni renvoyer l'IP). Le navigateur
  ne sert qu'à départager les pays multilingues — Canada, Suisse, Belgique… — ou
  de repli hors ligne. Un choix fait dans les réglages reste toujours prioritaire.
  Et ce n'est pas qu'un habillage : le Maître du Jeu, les situations, les tweets
  et les messages privés sont ÉCRITS dans ta langue, pas traduits après coup.
- **Trois ambiances** — Pelouse, Nuit, Grenat. La couleur du stade change, les
  dorures et le cuir restent.
- **Jouable au pouce** : cinq destinations stables vivent dans une barre basse,
  le reste tient dans un menu « Plus », et toutes les cibles principales font
  au moins 44 px. Plus besoin de faire défiler la navigation pour deviner ce
  qu'elle cache.
- **La carrière va droit au jeu** : le récit s'ouvre en premier ; Profil et
  Classement sont deux vues à un toucher au lieu de former une longue page. Le
  bouton qui joue le match ou passe la semaine reste au-dessus de la navigation.
- **L'accueil retient mieux** : le titre, l'explication et « Commencer » passent
  avant la scène 3D sur téléphone. Les encoches iPhone, la réduction des
  animations, le focus clavier et les lecteurs d'écran sont pris en compte.

## 🏆 Le classement mondial, et pourquoi on ne peut pas le truquer

Le tableau part **vierge** et ne contient que ce qui a vraiment été joué. Tout
est prêt pour le brancher en ligne — il ne manque que l'URL du serveur
(`serveur/`).

Le principe tient en une phrase : **le navigateur envoie les faits, et le
serveur recalcule le score au lieu de croire celui qu'on lui donne.** La base
garde ensuite les faits AFFICHABLES — saisons, matchs, essais, palmarès, clubs —
parce que le classement montre la fiche des autres joueurs.

Une ligne appartient à une **installation**, pas à un pseudo : deux joueurs
peuvent porter le même nom sans se marcher dessus (`serveur/MIGRATION-FICHES.md`,
étape 2 bis).

⚠️ **Disons-le franchement** : un jeu qui tourne entièrement dans le navigateur
ne peut rien garantir tout seul. Le joueur possède la machine qui calcule — il
peut éditer son `localStorage` ou appeler l'API à la main, et un secret embarqué
dans le bundle se lit en vingt secondes. La protection ne repose donc pas sur le
secret, mais sur le fait que le serveur **ne croit jamais le score reçu**.

Ce qui arrête réellement un tricheur, ce n'est pas le plafond global : c'est que
**chaque chiffre est borné par les autres**. Une saison de jeu = un an de vie
(donc 30 saisons maximum), 50 matchs par saison, 5 essais par match, 4 titres par
saison, une note atteignable en ce nombre de saisons, et chaque trophée doit
exister dans le jeu. On ne peut plus « mettre un gros nombre » : il faut
fabriquer une carrière entière qui tient debout — et à ce moment-là, autant la
jouer.

Chaque attaque est testée une par une (score gonflé, 300 saisons, carrière
commencée à 4 ans, 900 matchs en 12 saisons, trophées inventés, `NaN`…) :

```bash
npx vite-node scripts/verifClassement.ts
```

L'écran Classement affiche **en clair** la fiche qui partirait et le verdict que
le serveur rendrait : rien n'est caché, parce que rien n'a besoin de l'être.

## 🧠 Le Maître du Jeu tourne sur Groq — et le quota ne se voit pas

Le jeu embarque **sa propre clé** : aucun joueur n'a rien à saisir, rien à
télécharger, et la réponse arrive en quelques centaines de millisecondes.

⚠️ **Un quota atteint n'est pas une panne, et ça ne s'affiche nulle part.**
Quand Groq refuse (429), le jeu lit l'heure de reprise annoncée, bascule en
silence sur ses situations et réponses pré-écrites, et **repart sur l'IA tout
seul** à la seconde où elle se libère. Trois modèles sont essayés dans l'ordre —
`openai/gpt-oss-20b`, puis `openai/gpt-oss-120b`, puis `qwen/qwen3.6-27b` : les
limites étant comptées par modèle chez Groq, le suivant répond presque toujours
quand le premier est à sec. ⚠️ **On part du moins cher**, et non du plus gros :
la clé du site est partagée par tous les joueurs, et le petit modèle suffit
largement au JSON court et cadré qu'on lui demande. Le seul endroit qui montre cet état, c'est
**⚙️ Réglages** — modèle utilisé, quota, reprise estimée — et on peut y coller
**sa propre clé** pour avoir son quota à soi.

Configuration : `VITE_GROQ_KEY` dans `.env.local` (voir `.env.example`).
⚠️ Cette clé est **publique** — c'est le prix à payer pour que personne n'ait
rien à saisir, et c'est un choix assumé.

## 🎮 Le match se joue enfin — caméra, moments, et un pouce sur chaque bord

Retour de jeu : « le système de jeu durant les matchs est injouable et pas fun,
et il faut que ça marche sur téléphone ». Le moteur n'était pas en cause — il
simule trente joueurs sept fois par seconde et son étalonnage n'a pas bougé.
C'est tout ce qui se trouvait **entre le moteur et le pouce** qui a été refait.

| Ce qui n'allait pas | Ce que ça donnait | Ce qui le remplace |
| --- | --- | --- |
| Aucune caméra : les 122 × 70 m d'un seul tenant | Un joueur fait **3 px** sur un téléphone. On ne trouve pas son propre pion. | Une caméra qui suit et cadre **46 m** quand c'est à toi : le joueur fait 20 px. |
| La vitesse « ×1 » valait **cinq fois le temps réel** | Un plaquage à contrer durait deux dixièmes de seconde. On cliquait toujours après coup. | Le tempo **🎯 Moments** : ×9 quand il ne se passe rien pour toi, **temps réel** dès qu'une action te concerne. |
| Les boutons vivaient 200 px sous le terrain, dans une barre qui défilait | Il fallait quitter le jeu des yeux, chercher, et faire défiler. | Un **gros bouton contextuel** sous le pouce droit, trois secondaires, un joystick flottant sous le pouce gauche. |
| Notice, consigne, fil et six boutons de vitesse empilés sous le terrain | Le terrain tombait à un bandeau de 200 px. | Tout part dans un **tiroir** (📜 fil · 📣 consigne · 🕹️ commandes). Sur grand écran, le fil revient en colonne. |

**Le terrain pivote d'un quart de tour sur un téléphone tenu droit**, et l'on
attaque toujours vers le haut de l'écran — camp A ou camp B, match après match.
L'image et la commande partagent la même matrice : un pivot ne peut pas les
désaccorder, et `verifMatchJouable.ts` le vérifie dans les quatre orientations.

Mesuré (`npx vite-node scripts/verifMatchJouable.ts`) :

- **11,4 minutes** de manette pour un match complet en tempo « Moments » ;
- **24 %** du match joué en temps réel — le reste défile ;
- **168 moments** par match, d'une durée moyenne de **4,2 s** ;
- la caméra ne montre **jamais** de vide autour du terrain, sur les trois formes d'écran testées.

> ⚠️ Le score, lui, reste celui de la ligue : le joueur change **comment** on
> marque, jamais **combien**. `verifControle.ts` et `verifMoteur.ts` sont
> inchangés et passent toujours.

### Les commandes, et le match qui s'échauffe tout seul

Deuxième passe sur le même écran, après essai manette en main.

| | Avant | Maintenant |
| --- | --- | --- |
| Passer | **un** bouton, le moteur choisissait le receveur | **A** et **E** — passe à gauche, passe à droite |
| Plaquer | `J` | **clic gauche** |
| Taper au pied | `I` | **clic droit** |
| Sprinter | `Maj`, sans aucun retour visuel | `Maj` + une **barre de souffle** qui vire au rouge |
| Changer une touche | impossible | **⚙️ Réglages** — 20 commandes, clavier ou souris |
| Numéros de maillot | masqués en vue large | **toujours affichés**, à tous les cadrages |

**A et E marchent sur les deux claviers** : ce sont les codes `KeyQ` et `KeyE`,
soit A / E en AZERTY et Q / E en QWERTY — dans les deux cas, les voisines
immédiates de la touche « avancer ». Une touche ne peut servir qu'à une seule
action : en réassigner une libère l'ancienne.

**Le crochet et le raffut se sentent enfin.** Leur effet existait, mais il était
invisible : un crochet faisait passer la chance de franchir de 10 % à 15 %, et sa
fenêtre d'armement expirait souvent avant le contact. Mesuré aujourd'hui —
franchissements **1,1 → 1,8** avec le crochet, **1,1 → 1,4** avec le raffut.

**Les bagarres ne viennent plus d'un bouton.** Deux adversaires proches se
cherchent tout seuls (petites **bulles de dialogue** sur le terrain), la
température monte, et un **plaquage haut** ou **en retard** peut échapper à
n'importe lequel des trente joueurs — d'autant plus qu'il est fatigué et que le
match est chaud. C'est l'équipe d'en face qui peut venir te chercher, et pas
seulement l'inverse.

> ⚠️ **Mais on ne te punit toujours jamais sans cause** : une friction adverse ne
> te coûte rien tant que tu n'y réponds pas — c'est l'autre qui prend la pénalité
> et le carton. Tu restes libre de reculer, de séparer, ou d'y aller.

Mesuré sur douze matchs **sans que le joueur ne clique sur rien** : 24 répliques
entendues par match, 0,58 altercation subie (7 matchs sur 12 en voient une),
**1,25 geste illégal sifflé en amateur contre 0,58 en pro** — et toujours
**0 écart** au score de la ligue.

## 🚀 Démarrage

```bash
npm install
npm run dev      # http://localhost:5173
```

Autres scripts :

```bash
npm run build    # build de production (dist/)
npm run preview  # aperçu du build
npm run lint     # oxlint
```

## 🧱 Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Zustand** (état + persistance localStorage)
- **Framer Motion** (animations)
- **Three.js** via **@react-three/fiber** + **@react-three/drei** (3D)
- **Groq** (API OpenAI-compatible) pour le Maître du Jeu — voir `src/lib/groq.ts`

## 📁 Structure

```
src/
  types.ts              # types du domaine
  data/rugby.ts         # postes, nations, clubs, libellés
  data/evenements.ts    # pool d'évènements aléatoires (sans IA)
  data/scenarios.ts     # scénarios à choix (jouables sans clé)
  data/boutique.ts      # ballons, VESTIAIRE (crampons/maillots/accessoires) et packs d'Ovas
  data/legendes.ts      # légendes fictives peuplant le classement
  data/clubs.ts         # assemblage des compétitions : réelles (générées) + amateurs FR
  data/mondeReel.ts     # GÉNÉRÉ : 143 clubs (nom, ville, logo), coupes, sélections + classements
  data/effectifsReels.ts # GÉNÉRÉ : 6 306 joueurs réels 25-26 + note générale des clubs
  lib/groq.ts           # transport Groq : clé, cascade de modèles, quota, bascule silencieuse
  lib/moteur/controle.ts # les 25 actions du joueur en match : contexte, coût, recharge
  lib/moteur/camera.ts  # la caméra du direct : cadrage en mètres, quart de tour en portrait
  lib/moteur/moments.ts # « c'est à toi » : le match ralentit en temps réel sur tes actions
  components/match/     # la scène du direct : pelouse, feuille de match
  lib/moteur/bagarre.ts # tension, provocations, bagarres, cartons et commission de discipline
  lib/mj.ts             # prompt système du Maître du Jeu, parsing JSON et GARDE-FOUS
  lib/iaSociale.ts      # publications, commentaires et messages privés écrits par l'IA
  lib/pub.ts            # publicité : où elle a le droit d'être, et la pub récompensée
  lib/ia.ts             # la scène de la semaine + son jugement (sévère), situations, interviews
  lib/armoire.ts        # étagères mesurées sur le modèle 3D, titres au sol, boucliers adossés, cadrage
  lib/honneurs.ts       # les distinctions individuelles : note de saison + stats + palmarès de l'année
  lib/classementEnLigne.ts # envoi / lecture du classement mondial (sans serveur : le jeu continue)
api/classement.ts       # la fonction serverless Vercel — voir serveur/VERCEL.md
  lib/effectif.ts       # effectif réel ou généré, progression/déclin, force d'effectif, note des clubs
scripts/
  genMonde.cjs          # génère mondeReel.ts + effectifsReels.ts depuis les JSON fournis
  ligues.cjs            # table des championnats : nom de club dans le jeu, ville, échelle
  vedettes.cjs          # notes calibrées à la main des internationaux identifiés
  genAmateurs.cjs       # génère amateurs.ts + mercato.ts (clubs régionaux, 12 086 licenciés, mercato)
  verif.ts              # banc d'essai hors navigateur : npx vite-node scripts/verif.ts
  verifRecit.ts         # récit hebdomadaire : plafonds, conséquences dures, transferts réels
  verifSelection.ts     # sélections atteignables, petites nations comprises
  verifArmoire.ts       # armoire à trophées : étagères décodées du .glb, boucliers adossés, cadrage mobile
  verifHonneurs.ts      # honneurs individuels : barème, équité entre postes, 60 carrières jouées
  verifControle.ts      # contrôle du joueur : actions contextuelles, discipline amateur/pro, bagarres
  verifMatchJouable.ts  # caméra, sens du stick, rythme des moments, durée réelle d'un match
  verifMarche.ts        # marché : variété des clubs, saut d'étage interdit, salaires par âge
  verifClassement.ts    # joue le tricheur : chaque attaque du classement doit être refusée
  verifLogosSelections.ts # signatures des images et couverture du classement World Rugby
sources/                # matières premières rangées : data, logos, compétitions, modèles 3D
serveur/                # le classement en ligne (Deno, déployé à part — pas dans le bundle)
  classement.ts         # Edge Function : vérifie la fiche, RECALCULE le score, n'écrit que lui
  schema.sql            # table (pseudo, score, cree_le), RLS sans droit d'insertion
  README.md             # déploiement, et ce que la protection ne peut pas faire
  MIGRATION-FICHES.md   # passer la base en v2 : armoires, clubs et stats dans le classement
  copierLogos.cjs       # sources/logos/clubs/** → public/logos/ (à plat, dédoublonnés)
  store/useGame.ts      # store Zustand (joueur, journal, Ovas, panthéon, scénarios, offres…)
  lib/progression.ts    # note de saison + évolution des attributs et du potentiel
  lib/offres.ts         # génération des offres de contrat (France et étranger)
  lib/mercato.ts        # décodage du mercato réel
  components/           # Nav, Reglages, Jauge, PanneauJoueur, Offres, Hero3D, BallonRugby, ModeleBallon, Blason, FicheClub
  screens/              # Accueil, Creation, Carriere, Profil, Boutique, Pantheon, Classement, Championnats, Effectif
  data/trophees.ts      # trophées + conditions d'attribution + modèles 3D
  index.css / App.css   # design system (thème stade) + styles composants
public/ballon.glb       # ballon France Rugby, compressé Draco (453 Ko)
public/m3d/*.glb        # 54 trophées (dont 8 distinctions), le rugbyman, ses cosmétiques et les skins de ballon
new model boutique/     # les modèles bruts du 2ᵉ lot de cosmétiques (1,3 Go, hors dépôt) — voir scripts/copierTrophees.cjs
public/logos/*          # 957 logos de clubs et de sélections (4,2 Mo)
```

### Régénérer les données réelles

Les données brutes sont regroupées dans `sources/` :
`sources/data/base_rugby_finale.json` (9 388 lignes joueur/compétition),
`sources/data/tous_les_classements.json` (25 classements) et
`sources/logos/clubs/`.

```bash
node scripts/copierLogos.cjs   # logos → public/logos/
node scripts/genMonde.cjs      # → src/data/mondeReel.ts + src/data/effectifsReels.ts
```

> Les modèles sont compressés avec
> `npx @gltf-transform/cli optimize <src> <dst> --compress draco --texture-compress webp --texture-size 1024`
> (typiquement 20 Mo → 1 Mo). Les originaux restent dans `sources/modeles/`.

Voir [`CLAUDE.md`](CLAUDE.md) pour les détails d'architecture et les conventions.

## 🩹 Derniers correctifs (retours de jeu)

| Ce qui n'allait pas | Ce qui a changé |
|---|---|
| **La Coupe du monde n'était pas au bon format** | Passée au format **2027** : 24 nations, **6 poules de 4** en toutes rondes, les 2 premiers plus les **4 meilleurs troisièmes**, puis **huitièmes** → quarts → demies → **match pour la 3ᵉ place** → finale. Bonus offensif à 4 essais, prolongation puis tirs au but. Les 3 premiers de chaque poule de l'édition précédente sont qualifiés d'office. |
| **Le joueur ne disputait pas le même Mondial que celui affiché** | Trouvé en vérifiant le nouveau format : son match venait d'un carrousel générique, pas du tirage des poules. Deux tournois en parallèle, avec deux scores. Il lit maintenant le même état que l'écran. |
| **« Afrique du Sud 51-0 Fidji »** | L’écart de niveau était LINÉAIRE : 57 points de force donnaient 131 points de marge théorique. Il sature désormais. Matchs à 50 points d’écart : **18 % → 6 %**. |
| **« Y'a pas de hors-jeu sur les coups de pied »** | Il n'existait pas. Tout partenaire devant le botteur est maintenant hors-jeu : il ne peut pas gagner le ballon, il est remis en jeu quand le botteur le dépasse, et s'il est sur le ballon c'est pénalité. |
| Limite d’envoi au classement trop basse | **Triplée** : 18 par heure et 120 par jour. Et le plancher côté jeu suit — le tripler côté serveur seul n’aurait rien changé, c’était le jeu qui bridait. |
| **Se renommer au classement ne changeait pas la fiche** | La ligne affichait le nouveau nom, la fiche dépliée l’ancien. Le pseudo passe devant ; le nom du personnage reste en sous-titre. |
| **« Je suis en Coupe du monde et c'est marqué tournée d'automne »** | Le libellé vient du CALENDRIER, qui est le même toutes les saisons — or une saison sur quatre, le Mondial **remplace** la tournée. `libelleSemaine` prend maintenant la saison. Contre-épreuve faite : une saison sans Mondial dit toujours « Tournée d'automne ». |
| On portait l’écusson de son CLUB en pleine Coupe du monde | L’avatar du panneau devient **l’écusson de la sélection** dès qu’il y a un match international, et une pastille dit laquelle. Le club reste affiché à côté : c’est lui qui paie le salaire. |
| Impossible de voir son groupe national | L’écran Effectif a **deux onglets** — son club, sa sélection — et « 👥 Équipe » ouvre le bon selon la semaine. Le XV national est exactement celui que le moteur aligne : 31 joueurs, les meilleurs du pays tous clubs confondus. |
| **Les poules du Mondial n’affichaient aucun nom d’équipe** | Le nom était déclaré `minmax(0, 1fr)` — donc autorisé à disparaître — et les neuf autres colonnes, à largeur fixe, consommaient toute la carte de poule. Il garde un plancher, la dixième colonne est enfin déclarée, et le tableau défile dans sa carte. Les poules de coupe d’Europe en profitent aussi. |
| **« Meilleur joueur des 6 Nations en étant sud-africain »** | La condition était un **booléen** (« il joue la compétition de sa fenêtre de février ») et on en déduisait toujours le Tournoi. Or un Springbok y dispute le Rugby Championship. C'est désormais **l'id du tournoi réellement disputé** qui décide, et une seule compétition élit un meilleur joueur — celle qui a son modèle 3D. |
| **« Meilleur joueur de l'année en étant en Nationale 2 »** | Même trou : « être sélectionné » suffisait à ouvrir la couronne mondiale. Or la note de saison est **relative au groupe** — trop fort pour son étage, on frôle le 10 sans effort. Il faut maintenant jouer là où le monde regarde **ET** dans un club professionnel. |
| **« Sans nom à la création, on n'apparaît pas au classement »** | On y apparaissait, sous **« @anonyme_59 »** : le pseudo 𝕏 était calculé sur le champ VIDE, avant que le nom ne soit tiré. Et le classement mondial affichait ce handle plutôt que le nom du personnage — pour **tout le monde**, pas seulement les carrières sans nom. |
| **« Aucune trace de la Coupe du monde »** | Elle se jouait bien, mais uniquement dans le sélecteur de compétition, une saison sur quatre, trois semaines en novembre. Une **carte permanente** dit maintenant quand elle tombe, si ta sélection est qualifiée, et déplie ses **quatre poules** — lisibles des années à l'avance, le tirage étant déterministe. |
| Le classement des nations s'ouvrait d'office | Retour en arrière demandé : il repart **replié derrière un bouton**. Trois états — fermé, top 20 + ma nation, les 114. La ligne « ta sélection est 4ᵉ mondiale » reste, elle : c'est un fait sur la carrière, pas un annuaire. |
| **Les transferts se choisissaient dans un panneau, sans un mot** | **Refaits de bout en bout, sur 𝕏 L'Ovale.** Un club t'écrit en message privé, tu **négocies** (salaire · prime · durée · temps de jeu garanti) et il accepte, contre-propose ou **se braque**. Son plafond reste caché ; seule sa patience se voit. Le panneau « Choix de carrière » a **disparu**. |
| Un transfert tombait n'importe quand | Un club ne démarche qu'à **un an de contrat maximum** (sauf si tu ne joues pas — là, tu es sur le départ), les approches arrivent **en cours d'année**, et le transfert ne s'applique **qu'à l'intersaison**. |
| L'agent se cochait dans une liste, gratuitement | **Il se mérite** : chaque agent a sa barre (le requin exige 74 de niveau). Il te **démarche** quand tu franchis son palier, tu peux le démarcher aussi — et il te **lâche après deux saisons ratées**. |
| **« Le classement des stats perd des stats »** | Le joueur incarné était compté **deux fois** — `saisonEnCours` (panneau, profil) et `statsReelles` (classements) — et les deux divergeaient dès qu'on sautait des semaines. Ses vrais chiffres gagnent **toujours**. Le rattrapage des journées passe de 6 à 12, et l'en-tête dit combien ont **vraiment** été rejouées. |
| **« En match on a pas accès à tous les stats »** | Le moteur en compte **23**, la feuille en montrait **5**. Six vues — Général · Attaque · Défense · Conquête · Pied · Discipline. |
| **« On est jugé que sur plaquage, mètres et essai »** | Le barème en regardait déjà **quinze**, mais rien ne le montrait. Le dépliant **« ⭐ Ma note — d'où elle vient »** liste chaque ligne avec ce qu'elle a rapporté ou coûté. |
| Mode d'emploi du classement affiché en jeu | Retiré : c'était de la doc de développeur (schéma SQL, bornes) dans un écran de joueur. Elle vit dans [`serveur/VERCEL.md`](serveur/VERCEL.md). |
| **« Si on simule la saison, on a toujours 2 matchs 0 essai »** | Le mode « saison rapide » **tirait** l'année au sort au lieu de la jouer. Il est **supprimé**. On clique désormais une **date du calendrier** (📊 Résultats) et le jeu **joue** toutes les semaines qui séparent — matchs, stats, forme, blessures, sélections. Mesuré : 12 semaines en 75 ms. |
| **« Impossible de récupérer de la forme, à mi-saison on est à 0 »** | Le bilan d'une semaine de match était structurellement négatif (−10 à −13) et rien ne compensait. Une **récupération hebdomadaire** ramène le corps vers sa condition de base, d'autant plus vite qu'il en est loin. Mesuré sur une saison : 70-82 à 22 ans, **60-73 à 34 ans**. |
| **Le match jouable alors qu'une scène attend une réponse** | « Semaine suivante » était bloqué, pas « ▶️ Jouer le match » — or c'est lui qui fait passer la semaine. Bloqué sur les deux surfaces, panneau et barre mobile. |
| **« Toujours le même calendrier, et le Stade toujours premier »** | Le calendrier est **tiré chaque saison** (12 tirages distincts sur 12). Et les clubs ont des **générations dorées** (jusqu'à +8 sur 4-6 saisons) et des traversées du désert : **5 champions différents sur 20 saisons**, 6 titres hors du top 4 de départ. Rare (6,1 % des clubs à un instant donné) et affiché sur la fiche du club. |
| Textes de l'IA trop longs | Récits, scènes, jugements et messages ramenés à **2 phrases**, budgets de tokens baissés d'autant. |
| **Grand Chelem avec la France, pas de trophée des 6 Nations** | Le Tournoi était **joué pour de vrai** (classement à l'écran toute la saison) mais le titre était **tiré au sort** sur la note du joueur. On lit maintenant le **1ᵉʳ du classement**. Idem Rugby Europe Championship et Coupe du monde. |
| **Champions Cup gagnée, pas de trophée** | Même bug : le titre venait du rang en championnat (`tire((9 − rang) / 48)`), pas de la finale. C'est le **vainqueur de la finale** (`coupeEnDirect`) qui l'emporte, dans la coupe que le club **dispute vraiment**. |
| **Pas meilleur joueur de l'année malgré Brennus + 3 distinctions** | Mesuré : la saison cotait 82,7 (barre 94). Les deux correctifs ci-dessus la montent à 91,2 — toujours pas assez. Le titre mondial **lit désormais les distinctions déjà décernées** (+3 chacune) : 100,2. Il en faut **trois** pour franchir la barre. |
| **« Refais la mécanique de match totalement »** | Un **fil de match** en texte a remplacé le terrain 2D pendant deux tours, puis a été retiré : « reprends le même système d'avant, c'est moche ». Le terrain, la caméra et la manette sont revenus ; les **cartes de décision** à dix secondes, elles, restent — c'est la partie qui a plu. |
| **« Le jeu en match n'est pas assez fun ni jouable »** | Nouveau mode **⏸️ Décisions**, par défaut dès qu'on pilote : le match file tout seul, se **fige** sur un carrefour, et donne **dix secondes** pour choisir entre deux et quatre options — puis rejoue la suite au ralenti. **19 carrefours par match** au lieu de 114 réactions en temps réel, et un match en **5,8 min** au lieu de 11,6. |
| **« Le temps passe trop lentement, trop d'action en ce temps »** | Hors décision le jeu tourne à **×16** (contre ×9), et tous les tempos ont été accélérés. La densité du rugby, elle, ne bouge pas : 149 rucks et 242 plaquages par match, c'est le vrai. |
| **« On peut faire des en-avants sans répercussion »** | La mêlée était bien accordée à l'adversaire, mais **ça ne se voyait pas** : une ligne dans un fil défilant à neuf fois la vitesse réelle. L'arbitre affiche maintenant sa décision **en grand**. Et deux fautes manquaient : une **réception peut être lâchée** (la faute de main la plus banale du rugby n'existait pas) et la **passe en avant** est sifflée au lieu d'être rabotée en silence. |
| **« Même pseudo qu'un autre joueur → mon classement n'apparaît pas »** | Le `pseudo` était la **clé primaire** de la table : deux homonymes se partageaient une ligne, et l'écriture n'a lieu que si le score ne recule pas. Celui qui avait le score le plus bas **n'écrivait rien**, en silence, le serveur répondant « ok ». La ligne est désormais clé par une **identité d'installation**, et l'écran reconnaît la sienne à son identifiant, plus à son nom. |
| **« Dans les matchs, que les choix, pas bouger le joueur »** | La manette est **entièrement supprimée** — joystick, gros bouton, secondaires, clavier, souris, écran de réglage des touches. Il ne reste que les **cartes de décision**. Piège évité : le moteur ne passait jamais le ballon à la place du joueur qui pilotait ; sans retirer ce cas particulier, le pion aurait gardé le ballon jusqu'au plaquage à chaque possession. Mesuré : ne rien choisir donne **exactement** le match qu'on aurait regardé (12/12). |
| **« Qu'on voie vraiment notre joueur effectuer le choix »** | Après un choix, la caméra **se colle au pion** (pondération 1 au lieu de 0,5, cadrage rapproché) pendant les 3,2 s de ralenti, et le geste s'écrit **en or au-dessus de sa tête**. Deux défauts trouvés en jouant : son pion était dessiné **sous** ceux d'en face (caché sous un adversaire au ruck) et l'étiquette sortait du cadre en bord de touche. |
| **« Sur téléphone, les boutons de choix ne fonctionnent pas »** | Ce n'était pas le clic, **c'était le défilement**. `touch-action: none` avait été posé sur la scène pour le joystick, et n'était pas parti avec lui : la carte de décision et le tutoriel ne pouvaient plus défiler, et leurs boutons du bas étaient **hors d'atteinte**. Seconde cause, invisible sur ordinateur : la boucle redessinait trente pions **soixante fois par seconde** pendant que le jeu est figé, ce qui sature le fil principal d'un téléphone et avale les taps. |
| **« On clique mais pas l'impression que ça marche »** | Un bandeau confirme le choix **à l'instant du clic**, puis affiche le verdict que le moteur écrit lui-même (« Gaëtan Baille se lance sur… »). Et quand le moteur n'écrit rien — le cas le plus fréquent — il montre ce que le geste a **ajouté à la feuille de match** : « ➡️ Passe · 🏃 Ballon porté », « 💥 Plaquage ×2 ». Les compteurs qui font la note à la sirène. |
| **« Un pourcentage de réussite et d'impact »** | Chaque option de la carte affiche **la chance exacte qui sera tirée** (« 💥 Plaquer · 92 % »), en vert au-dessus de 72 %, en rouge sous 42 %, plus ce que la réussite donne et ce que l'échec coûte. Le chiffre ne peut pas mentir : `enjeuDe` et le tirage appellent **la même fonction**, celle que le moteur utilise déjà pour les vingt-neuf autres. Mesuré sur 608 duels : annoncé 67,1 %, sorti 67,1 %. |
| **« Que ça s'applique vraiment : plaquage réussi ça plaque direct, raté le mec perce »** | Un choix n'arme plus une intention que le moteur dépenserait plus tard — il **se joue sur-le-champ**. Mesuré : plaquage réussi → le porteur est stoppé **57/57**, raté → il franchit **3/3** et le plaqueur reste au sol. Piège attrapé par le banc d'essai : sur une carte de réception le ballon n'est pas encore là, le geste reste armé, et l'écran annonçait un **échec avant l'action**. |
| **« Des combos : tu perces, tu peux tenter autre chose »** | Une percée lève un drapeau **au fond du moteur** — donc l'enchaînement marche aussi bien pour un duel tranché tout de suite que pour un geste armé qui trouve son contact deux secondes plus tard. La carte suivante s'ouvre sans le repos habituel, avec 5 secondes au lieu de 10. Deux maillons maximum : sinon le match devient un jeu de cartes. |
| **« Ces phrases, au-dessus de soi »** | Le bandeau centré et l'étiquette SVG ont laissé place à une **bulle posée sur le pion**, avec une pointe qui le désigne (il y a trente joueurs à l'écran). Bug trouvé en jouant sur téléphone : bornée avec des marges fixes de 96 px alors qu'elle fait jusqu'à 315 px de large sur 375, elle sortait du cadre **13 fois sur 13**. Elle est désormais bornée sur sa taille mesurée. |
| **« La plupart de mes carrières légitimes ne sont pas retenues »**  | On n'a rien assoupli au jugé : on a **mesuré**. Quarante-six fiches de vraies carrières soumises au crible, **un seul motif de refus sur vingt et un** — l'écran de création laisse démarrer jusqu'à **30 ans**, le crible en refusait plus de **24**. Toute carrière de vétéran était donc rejetée **à vie**, en silence. `Creation` lit maintenant la borne depuis le crible : les deux ne peuvent plus diverger, et le banc d'essai rejoue les quinze âges de départ. |
| **« Si c'est la première saison pas finie, c'est pas pris en compte »** | Exact : l'envoi n'avait lieu qu'à la fin d'une saison et à la retraite. La carrière en cours est désormais publiée **à chaque semaine jouée**, avec deux freins — le score doit avoir progressé, et un plancher entre deux envois calculé sur le débit du serveur, qui en accepte dix-huit par heure. |
| **« Dès qu’on va ou touche le ballon, le choix de l’action »** | Le repos entre deux cartes valait 95 secondes de jeu pour tout le monde — la bonne règle pour un carrefour de défense, absurde pour un ballon reçu : un ouvreur en touche **soixante par match**, et on lui en donnait quatre. Ballon en main, c’est **6 secondes**, et le compte à rebours passe de 10 à 6 (dix secondes de menu soixante fois, ce sont six minutes de formulaire : mesuré). Mesuré après : **61 cartes pour 60,8 ballons touchés**, jamais deux pour un, et un match en 8,3 minutes. |
| **« Rajoute des actions selon le poste »** | Cinq gestes qui n’appartiennent qu’à ceux qui savent les faire : **50/22** et **chandelle** à un botteur de la ligne arrière, **chenille** au seul numéro 9, **foncer** à un avant, **offload** à tout le monde au contact. Ce qui manquait n’était pas le geste mais la **situation** : le 9 qui protège son propre ruck n’avait aucun moment dans le moteur — tout était gardé derrière « je défends ». Second piège mesuré : mis en tête des préférences, ces gestes **évinçaient complètement la passe**. |
| **« Que les actions soient vraiment effectuées, avec un vrai impact »** | Chaque geste tire son dé sur-le-champ et change l’état du match. Le banc d’essai **photographie l’état avant et après** — phase, possession, porteur, ballon, statistiques — et refuse tout geste qui ne bouge rien : **0 sur 900**. C’est ce contrôle qui a pris l’offload la main dans le sac : écrit « je plaque puis je donne », il ne donnait **jamais**, parce que le plaquage forme un ruck et vide les mains du porteur. Le ballon part maintenant avant que le plaquage ne se referme — c’est d’ailleurs la définition du geste. |
| **« Il n’y a jamais de Coupe du monde jouée »** | Elle SE DÉCLENCHAIT bien, une saison sur quatre. Ce qui n’existait pas, c’est le tournoi : vingt-quatre nations dans un mini-championnat de quatre journées dont la **dernière n’était jamais jouée** (le calendrier n’en réserve que trois), sans poule, sans quart, sans finale, et un « champion du monde » qui était le premier d’une ligue interrompue. C’est maintenant **4 poules de 6**, les deux premiers croisés en quarts, puis demies et **FINALE** — et le titre va à celui qui gagne la finale. Piège attrapé par le banc d’essai : le premier tirage de poule faisait **rejouer une affiche sur trois** (2-5 et 5-2 sont le même match). |
| **« C’est toujours les mêmes matchs pour la tournée d’été »** | Le tirage changeait bien — six grilles distinctes sur six saisons. Le défaut était qu’il ne voulait rien dire : trente-deux nations de tous niveaux dans un même chapeau, d’où « Biélorussie 0-81 France » et « France 68-0 Zimbabwe ». Trois étés comme ça et on ne distingue plus une tournée d’une autre. En juillet **le Nord va chez le Sud** : la France joue l’Argentine, le Japon, l’Afrique du Sud, le Chili. Mesuré : **0 affiche à l’envers, 0 déroute à soixante points** (contre 6 sur 128). |
| **« C’est le classement mondial qui doit bouger, pas un classement de toutes les nations »** | Deux choses. D’abord un vrai bug, invisible : le classement se calculait sur des matchs **rejoués avec une autre graine** que ceux affichés — la France pouvait gagner 30-10 à l’écran et perdre dans le calcul du rang. Une seule source désormais. Ensuite l’affichage : il est **visible** (plus derrière un bouton), montre le **top 20 et ta nation** au lieu des 114, et chaque ligne porte son **▲ / ▼** depuis le début de saison. |
| **« En fin de contrat, ouvre 𝕏 sur les messages »** | Les clubs écrivaient déjà — en message privé, sur un réseau social qu’on n’ouvre pas ce jour-là, avec pour seul signal une **pastille bleue** sur un onglet. Une alerte pleine largeur apparaît dès la dernière année (« ✍️ 3 clubs t’écrivent → Ouvrir mes messages »), et quand le contrat expiré bloque la semaine, **on emmène le joueur** sur la conversation au lieu de lui dire d’y aller. |
| **« Un raffut, un sprint ou un prendre-l’espace mène à un essai si réussi »** | Le geste marchait déjà ; ce qui n’existait pas, c’est **la suite**. Battre son homme rendait la main au rugby automatique — `ligneDeCourse` cherchait le prochain intervalle, « fixer et donner » repassait le ballon, et deux foulées plus loin le pion refaisait une passe de routine. Une **échappée** dure maintenant sept secondes : on court droit à la ligne, plus aucune passe automatique, plus aucun coup de pied, et une carte « 💨 tu es dans l’espace » demande comment conclure — plonger, chiper par-dessus le dernier défenseur, ou servir le soutien. Le score reste celui de la ligue : ce qui change, c’est que le chemin jusqu’à l’en-but existe. |
| **« Un turnover relance la dynamique de l’équipe »** | Une jauge d’**élan** en tête d’écran, un seul nombre signé qui part du milieu dans les deux sens — ce que l’un prend, l’autre le perd. Un ballon volé vaut +0,50, un en-avant −0,24, et tout retombe de moitié en quarante secondes. ⚠️ **Ce n’est pas un décor** : l’élan entre dans la formule du plaquage et du grattage, donc dans le pourcentage écrit sur chaque carte. Mesuré : **10,8 points d’écart** entre une équipe portée et une équipe dominée. On voit la barre bouger ET le chiffre avec. |
| **« Une passe peut arriver à une passe décisive »** | La statistique existait — mais quarante secondes séparent la passe de l’essai qu’elle amène, et elle n’apparaissait qu’à la feuille de match, une heure plus tard. Un bandeau doré le dit **à l’instant où ça tombe** : « 🎁 Passe décisive : ton ballon a fini dans l’en-but par X ! », et pareil pour un ballon volé qui amène l’essai. |
| **« Rajoute encore de nouvelles possibilités »** | Cinq gestes, et chacun ouvre ou conclut une échappée : **🕳️ Prendre l’espace** (il faut un vrai trou de sept mètres près de soi), **🪁 Par-dessus** (le chip et la course après), **🤿 Plonger** (à douze mètres de la ligne), **🦅 Intercepter** (une passe en l’air pour eux : le turnover le plus payant, et le plus cher quand on le rate), **🐘 Contre-poussée** (le paquet passe par-dessus le ballon au sol). Quatre défauts que seule la mesure pouvait attraper : la percée était offerte **13,7 fois par match** parce qu’on mesurait le plus grand trou du terrain au lieu de celui d’à côté ; la carte de l’espace ne s’ouvrait **jamais** ; l’interception n’était **jamais proposée** ; et deux gestes ratés ne changeaient strictement rien. |
| **« Les phases finales sont buguées, je joue toujours contre la même équipe »** | `EtatCoupe.bracket` contient **tous les tours déjà joués**, pas le dernier : l'écran y cherchait le match du club avec un `find` et retombait éternellement sur son premier tour. Toulouse rejouait « 35-9 contre Ulster » du barrage jusqu'à la finale. Deux bugs trouvés en le mesurant : les statistiques des tours précédents étaient **comptées plusieurs fois**, et `duel()` n'appliquait pas la règle des scores possibles — d'où un **« 20-4 »** en Champions Cup. |
| **« Voir tout le monde au classement, et mon rang en bas »** | Le classement mondial était plafonné à **100 lignes**. Il se parcourt maintenant **page par page** (50 par page, jusqu'à 20 000 rangs), **ma ligne reste épinglée en bas** quelle que soit la page — reconnue à son identifiant, pas à son nom — et le **pseudo se change sur place**. |
| **`api/classement.ts` ne se parsait pas** | Un accent grave dans un commentaire SQL fermait le gabarit JavaScript qui le portait : `SyntaxError` à l'import, donc **500 sur toutes les routes**. C'était l'« erreur de linter préexistante » qu'on traînait. |
| **Le classement mondial ne se remplissait pas** | Le serveur, la base et le barème étaient bons : **rien n'envoyait jamais**. La **retraite envoie la carrière**, et le tableau mondial s'affiche **toujours**, avec son état (chargement · pas de serveur · panne · encore vide). |
| Top 14 à 16 clubs, Pro D2 à 14 | La fin de saison était calculée **deux fois** avec des résultats différents, et les deux champions montaient. Source unique (`phaseFinaleDe`) + garde-fou d'équilibre. Vérifié sur 12 saisons. |
| Club promu encore affiché dans son ancienne division | Le panneau lisait la pyramide figée des données ; il lit maintenant la division **effective**. |
| « Les joueurs font un nuage, en bas du terrain » | Les cibles en largeur étaient **rabotées** sur la bordure : elles sont désormais **réparties** avec un écart minimal. Tas moyen 9,7 → 6,9 joueurs. |
| Joueurs qui reculent dans leur en-but | Les cibles n'étaient bornées que sur la largeur. 7,6 % → **0,7 %** des positions. |
| Trop de coups de pied | 57,6 → **52** par match, et une portée réaliste (40-55 m au lieu de 65). |
| Le 50/22 ne marchait pas | Les trois règles de touche sont maintenant **géométriques** : 50/22, touche directe hors des 22 (pas de gain de terrain), touche depuis ses 22. |
| Max 4 commentaires sous un post | Jusqu'à **12**, indexés sur les vues — avec cinq fois plus de phrases pour ne pas se répéter. |
| Republier / dé-republier gonflait les vues | Opération **réversible** : le bonus de vues est mémorisé et repris. |
| Posts perdus en changeant de club | Tes publications ne sont **plus jamais évincées** du fil. |
| On ne perdait jamais d'abonnés | Dérapages, propos interdits et **mauvaise saison** coûtent des abonnés — jusqu'à la moitié du compte. |
| Générale trop haute = plus aucune offre | Le plancher de recrutement est devenu **relatif** : le marché reste ouvert à 99 de générale. |
| On restait au club sans contrat | La saison **ne démarre plus** tant qu'on n'a pas signé. |
| Réglages : impossible de faire défiler | La modale a une hauteur maximale et un ascenseur ; l'overlay ne la coupe plus par le haut. |
| Boutique | **Boosts supprimés**, articles affichés avec le **vrai ballon 3D**. |
| Classement | **Vierge au départ**, avec la marche à suivre pour le brancher en ligne. |
| Logos de sélections faux | Les **39 écussons principaux sont toujours prioritaires** ; 77 écussons du catalogue servent uniquement de repli. Les signatures sont contrôlées et 24 variantes restent disponibles. |
| Pas de drapeau ni de note sur les nouvelles ligues | 28 championnats sur 28 ont leur drapeau, 183 clubs ont leur note. |
| Pas de compétitions U20 | **Tournoi des 6 Nations U20** et **Championnat du monde U20**, avec convocation des meilleurs joueurs U20 de chaque pays. |
| Traductions inachevées | 160 clés, 100 % dans les 7 langues, branchées sur tous les écrans principaux. |
| Pas de succès de palmarès | **15 succès** liés aux trophées et aux titres par club. |
| Un transfert annoncé n'arrivait jamais | Le champ `transfert` n'était rempli par **aucun** scénario, et quand il l'était il ne changeait que le nom du club — ni contrat, ni salaire, ni division. Un choix « je pars » ouvre maintenant le **vrai marché** ; c'est la signature qui déplace le joueur. |
| Un choix de 80ᵉ minute posé **après** le match | Les « moments décisifs » sont supprimés : le match se joue dans le moteur 2D, et nulle part ailleurs. |
| Sélection inatteignable avec une petite nation | Ce n'était pas le palier, c'était le **calendrier** : la fenêtre internationale retenait toujours le Tournoi ou la tournée d'automne, où ces nations ne figurent pas. Elle retient désormais la compétition **de ta sélection** (Rugby Europe Championship…). |
| Clubs de Nationale 2 à Régionale 3 sans note | Ils n'en avaient pas : tout un étage partageait la même. Chacun a maintenant **sa** note, tirée de son nom — et c'est elle qui compose son effectif. |
| Deux « Cheetahs » aux noms inversés | La franchise **Toyota Cheetahs** joue les coupes d'Europe, l'union **Free State Cheetahs** la Currie Cup. |
| Trophées minuscules, certains entre deux étagères | Les étagères sont **mesurées sur le modèle 3D** (elles sont six, pas quatre). Boucliers et grandes coupes se dressent **au sol**, à hauteur de buste. |
| Vitrine et sol mélangés | **Les distinctions individuelles vont dans l'armoire, les titres d'équipe au sol**, à 40 % de la hauteur du meuble — trois fois et demie une pièce de vitrine. |
| Les boucliers « tenaient droit comme par magie » | Ils étaient bien inclinés, mais posés **à côté** du meuble, dans le vide. Ils sont maintenant avancés de `sin(θ) × hauteur` devant la face avant : leur arête haute tombe **pile sur le meuble**. Et l'angle a doublé (8,6° → 17°). |
| Trophée allemand et « meilleur joueur du monde » : mauvais modèles | Remplacés par les modèles relivrés. Le pipeline refait un modèle dès que **sa source est plus récente que la version embarquée**. |
| Le Pro D2 et la coupe russe ne s'adossaient pas | Leur socle les rendait trop épais pour être reconnus comme boucliers : ils le déclarent maintenant, comme le Brennus. |
| Un seul trophée individuel, tiré au sort sur le niveau général | **Huit distinctions**, décernées sur la note de saison, les statistiques et le palmarès de l'année. Plus aucun dé. |
| Statistiques estimées, et incomplètes | Le moteur compte **23 lignes par joueur**, à l'événement : mêlées, touches gagnées, pick and go, offloads, passes décisives, 50/22 réussis, mètres, franchissements, cartons jaunes ET rouges. **18 classements** au lieu de 9. |
| Un pilier ne pouvait pas faire un grand match | La note de match ne regardait que plaquages, mètres, essais et tirs au but. Elle juge maintenant **la conquête et le jeu au ras** — le vrai travail d'un avant. |
| Les cartons n'existaient quasiment pas | 0,25 par match au lieu des 1,3 annoncés, et **aucun rouge**, jamais : trois pénalités sur quatre ne désignaient pas de fautif. Corrigé — **1,4 jaune et 0,08 rouge par match**. |
| Le classement des passeurs décisifs était un classement de demis de mêlée | Il affichait le TOTAL des passes (86 par match). Le moteur compte désormais **la vraie passe qui amène l'essai**. |
| « C'est toujours les mêmes clubs qui proposent » | Chaque club a son **humeur de la saison**, un **besoin à ton poste** et le marché mémorise les deux saisons précédentes. Mesuré : **23 clubs différents** pour 48 offres sur douze saisons, sans répétition lors d'une relance quand d'autres projets sont disponibles. |
| « Les petits championnats étrangers sont inaccessibles » | Tous leurs clubs ont désormais un compte dans l'annuaire de **L'Ovale**. Le seuil d'expatriation suit la force de la ligue : un joueur régional peut recevoir ou solliciter une offre étrangère de son niveau sans ouvrir artificiellement les championnats majeurs. |
| Vignette d'offre visible, mais aucun message dans L'Ovale | La vignette ouvre maintenant directement l'onglet Messages et la bonne conversation. Une sauvegarde qui contient une approche sans son fil est réparée automatiquement : le message initial du club est reconstruit sans modifier l'offre. |
| « Trop facile d'avoir de gros clubs et de gros salaires » | Le plafond dépend de l'**âge** (7 points de marge à 20 ans, 0,5 après 29), on ne **saute plus deux étages**, la notoriété est plafonnée à +7, et le salaire suit l'âge (260 k€ à 19 ans, 470 k€ à 27, 340 k€ à 36 dans le banc actuel). |
| Écussons de sélections redevenus des vignettes | `copierLogos.cjs` réécrasait `copierLogosSelections.cjs`. L'ordre des deux scripts est maintenant écrit noir sur blanc. |

Le détail de chaque correction — la cause, la mesure avant/après et le script de
vérification — est dans [`CLAUDE.md`](CLAUDE.md), sections
« Retours de jeu — la passe de correction », « LE RÉCIT HEBDOMADAIRE » et
« L'ARMOIRE À TROPHÉES ».


## 🧑‍🏫 Le mode manager — bureau, récit et recrutement

> ⚠️ **CACHÉ POUR L’INSTANT.** Le mode est entier et jouable, mais ses portes
> d’entrée restent fermées pendant la phase de stabilisation : composition et
> coaching sont maintenant jouables, mais on ne veut pas qu’un joueur tombe sur
> un chantier avant sa passe complète de test et le
> prenne pour un bug. Pour l’ouvrir : `?dev=1` dans l’adresse (voir
> `src/lib/modeDev.ts`).

On peut désormais mener une **carrière d’entraîneur**, à côté de la carrière de
joueur. Elle se lance depuis l’accueil (« 🧑‍🏫 Devenir entraîneur ») ou à la
retraite, en choisissant la reconversion « Entraîneur ».

### On commence en Régionale, et on se fait un nom

Une seule jauge ouvre les portes : le **prestige** (0-100). Il ne sert qu’à une
chose — décider quels clubs acceptent de te confier leur banc.

| Prestige | Clubs à portée | Étage le plus haut |
|---|---|---|
| 6 (départ) | 37 | Régionale 2 |
| 40 | 631 | Fédérale 1 |
| 60 | 790 | Nationale |
| 100 | 855 (tout) | Premiership |

À chaque fin de saison, le board juge — **sur l’écart à son objectif, jamais sur
le rang nu**. Finir huitième avec le budget du dernier est un exploit ; finir
troisième avec celui du premier est un échec. Le prestige et la confiance du
board bougent en conséquence, et sous 18 de confiance on est remercié.

Mesuré sur quinze saisons : une carrière réussie part d’un effectif noté 35 et
finit à **69**, sans jamais être licenciée ; une carrière ratée retombe à 0 de
prestige et se fait remercier **cinq fois**.

⚠️ **La carrière d’entraîneur est MONDIALE**, contrairement à celle de joueur :
les 855 clubs des 33 compétitions sont dans la balance. Un entraîneur va où on
l’appelle.

### Trois façons de commencer

| | Prestige de départ | Au classement mondial ? |
|---|---|---|
| **Carrière** | 6 — la Régionale, rien de plus | ✅ catégorie « entraîneur » |
| **Reconversion** (fin de carrière joueur) | 12 à **48** selon ce qu’a été la carrière | ✅ catégorie « joueur + entraîneur » |
| **Mode libre** | n’importe quel club, tout de suite | ❌ **jamais**, c’est le marché |

⚠️ **Un grand joueur n’est pas un grand entraîneur.** Le meilleur palmarès du
jeu plafonne à 48 de prestige : de quoi être accueilli en Nationale, jamais en
Top 14. Sans ce plafond, finir une belle carrière donnerait le Stade Toulousain
le lendemain, et il n’y aurait plus rien à jouer.

### Le classement mondial a maintenant quatre onglets

**Total** · Joueurs · Entraîneurs · Joueur + entraîneur. Le total compare
vraiment les trois familles : les deux barèmes ont été calibrés l’un sur
l’autre (une grande carrière vaut ~3 990 d’un côté, ~3 444 de l’autre).

### Un vrai bureau, une décision par semaine

Le manager reprend la boucle de la carrière joueur sans la copier : chaque
semaine ouvre une **scène de club à trois choix** (cadre mécontent, jeune à
lancer, pression du board, brassard, entraînement, presse). Le choix agit sur le
prestige, la confiance et les finances ; tant qu'il n'est pas tranché, on ne
saute pas à la semaine suivante. Le journal, le calendrier réel et le classement
de la poule restent les mêmes briques que dans la carrière joueur.

Le bureau se partage en cinq espaces : **Bureau**, **Composition**, **Match**,
**Marché mondial** et **Négociations**. Sur mobile, ils deviennent des onglets tactiles et le récit
reste la première chose affichée.

### Composer le XV et coacher réellement le match

- La feuille contient **15 titulaires et 8 remplaçants**, poste par poste. Les
  joueurs peuvent être échangés sans doublon ; le capitaine et le buteur sont
  désignés séparément et transmis au moteur.
- Le plan initial règle le jeu avec ballon (équilibré, avants, large,
  occupation), la défense (blitz, glissée, repli), le rythme, les pénalités et
  l'heure du banc. Tous ces ordres restent modifiables pendant les 80 minutes.
- Le banc permet aussi de programmer un **changement manuel** : il est effectué
  au prochain arrêt de jeu. Le rythme influe sur la vitesse et la fatigue, la
  défense sur la montée, l'attaque sur les combinaisons, le choix de pénalité
  sur les tirs/touches et le timing sur les remplacements automatiques.
- Le score produit à la sirène remplace le score théorique dans le calendrier,
  le classement et le verdict de fin de saison. Une semaine avec match ne peut
  plus être passée tant que la rencontre n'est pas terminée.

### Le marché mondial passe par 𝕏 L'Ovale

- Toutes les compétitions et tous leurs clubs sont consultables. Les candidats
  sont les joueurs qui existent réellement dans `effectifDuClub`, avec âge,
  poste, note, potentiel, nationalité, salaire et indemnité.
- Contacter un joueur ouvre sa conversation privée sur **L'Ovale**. On négocie
  salaire, prime, durée et rôle ; ses exigences restent cachées derrière sa
  patience, ou on peut accepter immédiatement ses demandes.
- Un accord ne suffit pas : le budget transferts et la marge salariale sont
  contrôlés avant la signature. Une fois signé, le joueur quitte vraiment son
  ancien club, rejoint l'effectif du manager et modifie la force utilisée par
  les résultats et les classements.
- L'écran **Résultats** est désormais commun aux deux carrières : tous les
  championnats, coupes, sélections et la Coupe du monde sont lisibles depuis le
  bureau. L'écran **Effectif** l'est aussi et montre immédiatement les recrues.

```bash
npx vite-node scripts/verifManager.ts        # carrière, calendrier, marché et saison
npx vite-node scripts/verifManagerMatch.ts   # composition, consignes, banc et résultat réel
npx vite-node scripts/verifSituations.ts     # 151 situations, impacts et non-répétition
```

## 🗺️ Idées d'évolution

👉 La liste complète et **ordonnée** des évolutions prévues (9 lots, des
fondations vers le confort) est dans **[ROADMAP.md](ROADMAP.md)**.

- ~~**Classement multijoueur en ligne**~~ — **fait, et prêt à déployer.** Le code
  est là : `api/classement.ts` (fonction serverless Vercel),
  `serveur/schema-vercel.sql` (les deux tables) et `src/lib/classementEnLigne.ts`
  (côté navigateur). Le pas à pas complet — base Neon, tables, sel d'appareil,
  déploiement, vérification et erreurs fréquentes — est dans
  **[`serveur/VERCEL.md`](serveur/VERCEL.md)**. **20 minutes**, gratuit dans les
  quotas de départ.
  Tant que rien n'est déployé, le classement reste **local et part vierge** : le
  jeu ne casse pas, **et l'écran le dit** — le tableau mondial affiche désormais
  son état (chargement · pas de serveur · serveur en panne · personne n'y figure
  encore) au lieu de disparaître. Une carrière y part **toute seule à la
  retraite** ; le bouton d'envoi reste là pour une carrière en cours. Le principe
  tient en une phrase — *le navigateur envoie les faits d'une carrière, le
  serveur RECALCULE le score et n'écrit que lui*.
- **Monétisation** : brancher la régie publicitaire et le paiement des packs
  d'Ovas — les pistes, les ordres de grandeur et les pièges sont dans
  [MONETISATION.md](MONETISATION.md).
- Matchs simulés tour par tour avec adversaires générés.
- Logo FFR officiel en PNG sur le ballon (aujourd'hui : coq tracé en code).

---

Fait avec 🏉 — thème artisanal, front soigné, sans rendu générique.
