# Destiny Rugby 🏉

**Le RPG de carrière de rugby où une IA joue le Maître du Jeu.**

Incarne un rugbyman de ses débuts jusqu'au sommet. Tu **écris tes actions** en
langage naturel (entraînement, match, contrat, médias, vie perso…), et le
**Maître du Jeu IA (Groq)** juge le résultat de façon réaliste : il raconte ce
qui se passe et fait **monter ou chuter tes statistiques** en conséquence. Rien
n'est scripté — chaque partie est unique.

Inspiré des jeux de carrière type *Destin Eleven*, mais pour l'**ovalie**.

---

## ✨ Fonctionnalités

- **Maître du Jeu IA** via l'API **Groq** (gratuite). Il juge chaque décision
  selon les attributs, la forme, le moral, la réputation et le contexte, puis
  renvoie un récit + des variations de stats structurées. Il est **sévère** :
  par défaut une action ne change presque rien, l'échec est fréquent, et on ne
  progresse jamais en le demandant — les gains passent par un plafond côté code
  (+2 max par action, 4 points d'attributs par saison, plus rien après 36 ans) que
  ni le joueur ni l'IA ne peuvent contourner.
- **Création de joueur** : nom, âge, **202 nations** (groupées par continent,
  avec leur vrai drapeau), championnat et club de départ (France ou étranger),
  les **15 postes** numérotés 1 à 15, et **2 traits de caractère** à choisir
  parmi 12 — ils te suivront toute ta carrière. Tu démarres avec une générale
  de **30 à 40** : tout est à construire. Les listes
  déroulantes sont des composants maison (drapeaux, blasons, recherche
  instantanée, navigation clavier) au thème du jeu.
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
- **Marché des transferts** (✈️) : un vrai panneau **« Choix de carrière »**.
  Ton contrat a une durée et un salaire ; en fin de contrat — ou après une
  grosse saison — les clubs se positionnent. Chaque offre affiche l'écusson, la
  division, la note du club, le salaire, la prime à la signature et la durée.
  Les propositions dépendent de ta **cote** (générale + réputation + note de la
  saison) et du niveau des clubs : personne ne recrute très en dessous de son
  niveau, et un club ne fait pas rêver un joueur bien au-dessus du sien. Tu peux
  aussi **demander ton transfert** en cours de contrat — le vestiaire n'aimera
  pas (−6 de moral).
- **Carrière à l'étranger** 🌍 : à partir d'une certaine notoriété, la
  Premiership, l'URC, le Super Rugby, la League One japonaise ou la MLR viennent
  te chercher — avec leur **titre national à gagner** et, pour la Premiership et
  l'URC, la coupe d'Europe.
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
  **écrire en message privé** : Groq répond à leur place, dans leur rôle.
  Tu publies ce que tu veux (5 tons, du plus humble au clash) — et si tu
  dérapes, ton club te convoque et te met à l'amende.
  ⚠️ **Les annonces sont réelles** : quand un compte annonce un transfert, le
  joueur change vraiment de club dans le jeu (mais personne ne peut te
  transférer par un tweet : pour toi, ça reste une offre à accepter).
  Le même écran regroupe tes **notifications**, tes **succès** (28, qui
  rapportent des Ovas et traversent tes carrières) et les **3 défis de la
  semaine**. Sans clé Groq, un repli hors ligne prend le relais.
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
- **Hero 3D immersif** : poteaux de rugby en toile de fond + ballon France Rugby
  flottant (modèles `.glb` compressés Draco).
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
  | Meilleur joueur de l'année | Au sommet mondial, après une saison titrée |

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
  reçoit ses commentaires (écrits par l'IA quand une clé est là).
- **Tutoriel intégré** pour obtenir/mettre sa clé Groq (dans ⚙️).
- **Ballon 3D** : modèle `.glb` (France Rugby) **compressé Draco (0,45 Mo)**,
  sinon ballon texturé codé (recolorable par les skins).
- **Monnaie « Ovas » (🪙)** volontairement **rare** : ~1-5 par action/saison.
  Le solde n'est visible **que dans la Boutique** — chaque skin se mérite.
- **Boutique** : skins de ballon 3D (dont **France Rugby**) et boosts d'attributs
  achetables en Ovas. Le skin choisi s'affiche partout.
- **Hall des Légendes** (🏛️) : chaque carrière menée à la retraite est
  immortalisée avec son parcours et son score.
- **Classement mondial** (🏆) : ta carrière face à des légendes (score global :
  niveau, réputation, longévité, titres, essais).
- **Profil / palmarès** : note globale, faits marquants, titres.
- **Ballon 3D texturé** codé en Three.js (façon Gilbert France Rugby : coq,
  swooshes, coutures) — chargé à la demande.
- **100 % responsive** (mobile → desktop), thème « stade nocturne » soigné.
- **Sauvegarde locale** automatique (localStorage).

## 🌍 Le monde du jeu s'agrandit — 18 championnats de plus

Aux 20 compétitions déjà présentes s'ajoutent **18 championnats et coupes** et
**13 compétitions de sélections**, tirés du dossier `new league/` :

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

## 🔍 Référencement et vitesse

- **Balises complètes** : Open Graph, Twitter Card, canonique, JSON-LD
  `VideoGame`, et une **image de partage 1200×630** générée sans dépendance
  (`node scripts/genOgImage.cjs`). Plus `robots.txt`, `sitemap.xml` et un
  manifeste web pour l'installation sur mobile.
- **Premier chargement allégé** : la feuille de style passe de **503 à 112 Ko**
  (les 250 drapeaux ne sont plus recopiés dedans en base 64), et sept écrans
  plus le moteur de match ne sont téléchargés qu'au moment où l'on s'en sert.

## 💸 Consommation de l'IA divisée par trois

Une semaine de jeu coûtait **trois appels** à Groq (le fil, puis deux salves de
commentaires) : elle en coûte **un seul**, commentaires compris. Les comptes à
suivre ne passent plus par l'IA du tout — ils viennent de l'annuaire du jeu.
Le compteur exact (appels, tokens envoyés, tokens reçus) s'affiche dans ⚙️.

## 🌐 Sept langues, une ambiance au choix, et le téléphone d'abord

- **Français, anglais, espagnol, italien, allemand, portugais, japonais.** La
  langue du navigateur est détectée toute seule. Et ce n'est pas qu'un habillage :
  le Maître du Jeu, les situations, les tweets et les messages privés sont ÉCRITS
  dans ta langue, pas traduits après coup.
- **Trois ambiances** — Pelouse, Nuit, Grenat. La couleur du stade change, les
  dorures et le cuir restent.
- **Jouable au pouce** : l'action principale reste en bas de l'écran en
  permanence, la navigation défile d'un doigt, le match passe en plein écran et
  rien ne déborde. Vérifié à 375 × 812.

## 🔑 Clé API Groq (pour le Maître du Jeu)

Le jeu est jouable sans clé (création, navigation, évènements aléatoires), mais
le **MJ IA** a besoin d'une clé Groq. Deux options :

### Option A — Clé fournie par le site (les joueurs n'ont rien à saisir)

1. Copie `.env.example` en **`.env.local`**.
2. Renseigne `VITE_GROQ_KEY=gsk_...` (ta clé depuis
   [console.groq.com/keys](https://console.groq.com/keys)).
3. Relance `npm run dev`. Le MJ marche pour tout le monde, sans manip.

> ⚠️ **Sécurité** : une clé mise en `.env.local` est incluse dans le build
> **côté client**, donc **visible par n'importe quel visiteur** et elle consomme
> **ton** quota Groq. À réserver à une démo ou à un usage restreint. Pour une
> mise en ligne publique, préfère l'option B (ou un backend proxy — voir plus
> bas) afin de ne pas exposer ta clé.

### Option B — Chaque joueur met sa propre clé

Clique sur **⚙️**, colle ta clé (`gsk_...`), enregistre. Elle est stockée
**uniquement dans ton navigateur** (localStorage). C'est l'option qui **passe à
l'échelle** : chaque joueur utilise son propre quota gratuit.

> Les deux options coexistent : si une clé de site est présente, une clé perso
> saisie dans ⚙️ la remplace pour ce joueur.

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
- **Groq API** (compatible OpenAI) pour le Maître du Jeu

## 📁 Structure

```
src/
  types.ts              # types du domaine
  data/rugby.ts         # postes, nations, clubs, libellés
  data/evenements.ts    # pool d'évènements aléatoires (sans IA)
  data/scenarios.ts     # scénarios à choix (jouables sans clé)
  data/boutique.ts      # skins de ballon, boosts, packs d'Ovas
  data/legendes.ts      # légendes fictives peuplant le classement
  data/clubs.ts         # assemblage des compétitions : réelles (générées) + amateurs FR
  data/mondeReel.ts     # GÉNÉRÉ : 143 clubs (nom, ville, logo), coupes, sélections + classements
  data/effectifsReels.ts # GÉNÉRÉ : 6 306 joueurs réels 25-26 + note générale des clubs
  lib/groq.ts           # appel API Groq + prompt système + parsing JSON + clé env
  lib/effectif.ts       # effectif réel ou généré, progression/déclin, force d'effectif
scripts/
  genMonde.cjs          # génère mondeReel.ts + effectifsReels.ts depuis les JSON fournis
  ligues.cjs            # table des championnats : nom de club dans le jeu, ville, échelle
  vedettes.cjs          # notes calibrées à la main des internationaux identifiés
  genAmateurs.cjs       # génère amateurs.ts + mercato.ts (clubs régionaux, 12 086 licenciés, mercato)
  verif.ts              # banc d'essai hors navigateur : npx vite-node scripts/verif.ts
  copierLogos.cjs       # logos_equipes/**.png → public/logos/*.png (à plat, dédoublonnés)
  store/useGame.ts      # store Zustand (joueur, journal, Ovas, panthéon, scénarios, offres…)
  lib/progression.ts    # note de saison + évolution des attributs et du potentiel
  lib/offres.ts         # génération des offres de contrat (France et étranger)
  lib/mercato.ts        # décodage du mercato réel
  components/           # Nav, Reglages, Jauge, PanneauJoueur, Offres, Hero3D, BallonRugby, ModeleBallon, Blason, FicheClub
  screens/              # Accueil, Creation, Carriere, Profil, Boutique, Pantheon, Classement, Championnats, Effectif
  data/trophees.ts      # trophées + conditions d'attribution + modèles 3D
  index.css / App.css   # design system (thème stade) + styles composants
public/ballon.glb       # ballon France Rugby, compressé Draco (453 Ko)
public/m3d/*.glb        # poteaux, 16 trophées, skins de ballon (26 Mo au total)
public/logos/*.png      # 715 logos de clubs et de sélections (5,5 Mo)
```

### Régénérer les données réelles

Les données viennent de trois sources déposées à la racine :
`base_rugby_finale.json` (9 388 lignes joueur/compétition),
`tous_les_classements.json` (25 classements) et `logos_equipes/`.

```bash
node scripts/copierLogos.cjs   # logos → public/logos/
node scripts/genMonde.cjs      # → src/data/mondeReel.ts + src/data/effectifsReels.ts
```

> Les modèles sont compressés avec
> `npx @gltf-transform/cli optimize <src> <dst> --compress draco --texture-compress webp --texture-size 1024`
> (typiquement 20 Mo → 1 Mo). Les originaux restent dans `textures 3d/`.

Voir [`CLAUDE.md`](CLAUDE.md) pour les détails d'architecture et les conventions.

## 🗺️ Idées d'évolution

👉 La liste complète et **ordonnée** des évolutions prévues (9 lots, des
fondations vers le confort) est dans **[ROADMAP.md](ROADMAP.md)**.

- **Classement multijoueur en ligne** : nécessite un **backend** (ex. Supabase
  ou Firebase) pour synchroniser les carrières entre joueurs. Aujourd'hui le
  classement est **local** (tes carrières + des légendes pré-générées).
- **Proxy backend pour Groq** : petit serveur qui garde la clé côté serveur et
  applique un quota par joueur — permet une mise en ligne publique sans exposer
  la clé ni saturer le quota.
- **Coupes nationales et phases finales détaillées** : le titre se joue encore
  sur un tirage pondéré par le classement, pas sur une demi-finale et une finale
  disputées match par match.
- Matchs simulés tour par tour avec adversaires générés.
- Sélection en équipe nationale et coupes (Tournoi, Coupe du monde).
- Logo FFR officiel en PNG sur le ballon (aujourd'hui : coq tracé en code).

---

Fait avec 🏉 — thème artisanal, front soigné, sans rendu générique.

