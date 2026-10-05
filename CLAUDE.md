# CLAUDE.md — Destiny Rugby 🏉

**Guide de travail. Lis-le avant toute évolution, tiens-le à jour avec le
`README.md`.** Il décrit le jeu **tel qu'il est aujourd'hui** — pas comment il
y est arrivé.

> 📜 L'histoire détaillée (10 000 lignes : chaque lot, chaque retour de jeu,
> chaque mesure et chaque piège rencontré en chemin) vit dans **`JOURNAL.md`**.
> Va l'y chercher quand tu veux savoir *pourquoi* une règle existe — les
> réponses y sont, avec les chiffres. Ne l'alimente que pour un chantier
> vraiment instructif.

---

## Le projet en une phrase

RPG de **rugby** en français, jouable dans le navigateur. **Trois modes** : on
incarne **un joueur** de ses débuts au sommet, on prend **un banc d'entraîneur**
et on fait monter son club — les deux en solo — ou on rejoint une **Carrière en
ligne**, une ligue privée entre potes qui dure des semaines. Un **Maître du Jeu
servi par Groq** juge les actions écrites et fait évoluer les statistiques.

En ligne : **destiny-rugby.fr** (Vercel).

---

## ⚠️ Préférences de travail (imposées par l'utilisateur)

Ce ne sont pas des suggestions. Elles ont toutes été demandées explicitement.

- **UI et code en français** — variables, commentaires, textes.
- **Front « pas IA »** : soigné, artisanal, animé, thème cohérent (stade
  nocturne / cuir / pelouse / dorures). Jamais un rendu générique. Voir
  « ÇA FAIT TROP IA » dans `JOURNAL.md` pour les six réflexes qui trahissent
  une interface générée.
- **Pas d'emoji dans l'interface.** Les pictogrammes passent par
  `components/Icone.tsx` (tracés sur grille de 24, en `currentColor`). Un emoji
  est dessiné par Apple ou Microsoft, pas par nous, et ne s'aligne pas sur une
  ligne de texte.
- **Tester dans le navigateur** après chaque changement — desktop **ET**
  mobile. Compiler ne suffit pas.
- **Responsive dans les deux sens.** Le CSS n'a longtemps eu que des
  `max-width` : un écran de 1 920 px héritait de la densité écrite pour un
  téléphone. Les paliers actuels sont **560 / 700 / 760 / 1120 / 1121+**.
- **L'IA passe par Groq** (`VITE_GROQ_KEY`). La clé du site est visible côté
  client : c'est assumé, personne n'a rien à saisir. WebLLM, son Worker et ses
  900 Mo de téléchargement ont été supprimés.
- **⚠️ UN QUOTA ÉPUISÉ NE S'AFFICHE JAMAIS.** Le jeu bascule en silence sur son
  contenu pré-écrit et repart sur l'IA dès qu'elle se libère. Jamais de
  « quota exceeded », de « réessaie » ni de bannière d'erreur — voir
  `lib/groq.ts` et `messageErreurIA`.
- **Le jeu reste ENTIER sans IA** : situations et scénarios pré-écrits, et un
  barème local (`jugementLocal`) pour trancher une réponse écrite.
- **Monétisation cosmétique uniquement.** Ovas, boutique, skins. Rien qui
  vende de la performance.

---

## Stack

Vite 8 · React 19 · TypeScript · Zustand (+ persist, **migration v27**) ·
Framer Motion · Three.js (`@react-three/fiber` + `@react-three/drei`) ·
Groq (API distante) · Neon (Postgres serverless) · déployé sur Vercel.

## Commandes

```bash
npm run dev      # aperçu localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run preview  # aperçu du build
```

Régénération des données réelles :

```bash
node scripts/genMonde.cjs        # → src/data/mondeReel.ts + effectifsReels.ts
node scripts/genAmateurs.cjs     # → src/data/amateurs.ts + mercato.ts
node scripts/copierLogos.cjs     # sources/logos/clubs/** → public/logos/
node scripts/copierTrophees.cjs  # modèles bruts → public/m3d/ (Draco, textures 1024)
```

⚠️ **Les modèles 3D bruts ne sont plus dans le dépôt.** Les `.glb` livrés
(~90 Mo pièce, 3,7 Go) vivent dans `../destiny-rugby-assets-bruts/` — voir son
`LISEZ-MOI.md`. `copierTrophees.cjs` les cherche là, puis dans `$DESTINY_ASSETS`,
puis à la racine. Le jeu ne lit que `public/m3d/` (**85 `.glb`, 114 Mo**).

---

## Architecture

### Le socle

| Fichier | Rôle |
|---|---|
| `src/types.ts` | Types du domaine (`Joueur`, `Manager`, `Attributs`, `ReponseMJ`, `Ecran`…). 1 100 lignes. |
| `src/store/useGame.ts` | **Le store Zustand persistant** — 7 900 lignes. Carrière joueur ET manager, saisons, transferts, trophées, Ovas, réglages, migrations. |
| `src/App.css` | Styles et responsive — 7 900 lignes. |
| `src/index.css` | Design system : variables CSS (couleurs, polices, rayons), reset, fond. |

### Écrans (`src/screens/`)

`Accueil` · `Creation` / `CreationManager` · `Carriere` (le MJ) · `Manager`
(le bureau, 13 onglets) · `CarriereEnLigne` (la ligue entre potes, 7 onglets +
le direct) · `Profil` · `Effectif` · `Championnats` · `Classement` · `Tableau` ·
`Social` (L'Ovale) · `Boutique` · `Pantheon` · `FinCarriere`.

### Données réelles (`src/data/`)

⚠️ **`mondeReel.ts`, `effectifsReels.ts`, `amateurs.ts` et `mercato.ts` sont
GÉNÉRÉS.** Ne jamais les éditer à la main.

| Ce qu'on a | Chiffres |
|---|---|
| Clubs français | **655 sur 10 divisions** (Top 14 → Régionale 3) |
| Championnats du monde | **16**, 143 clubs avec logo officiel |
| Effectifs pros réels | **6 306 joueurs** (saison 25-26) sur 143 clubs |
| Effectifs amateurs réels | **12 086 joueurs**, 384 clubs |
| Mercato réel | **3 224 mouvements**, 83 clubs |
| Sélections | **114 nations classées** + U20, 13 compétitions |
| Trophées | **54** (46 titres d'équipe + 8 distinctions), chacun avec son `.glb` |
| Succès | **78** joueur + **20** manager |
| Langues | **7** (fr, en, es, it, de, pt, **ja**) |

**Traductions** : `textesInterface.ts` complète les libellés et données fixes ;
`textesInterfaceCorrections.ts` garde la priorité après fusion. `npm run
verify:traductions` vérifie les sept langues, les variables et les clés appelées.
`texteTraduit()` localise les données canoniques sans les modifier ; pour un
récit préécrit dans le journal, `texteTraduitExact()` reconnaît uniquement une
phrase connue. Le texte libre du joueur et les noms propres restent intacts.
L'affichage mobile de la carrière joueur est ajusté dans `screens/Carriere.css`.

**Pour corriger un club, une division ou une note** : tout se passe dans
`scripts/ligues.cjs` (déclarer la ligue, son `srcLigue`, son `echelle`, ses
clubs) et `scripts/vedettes.cjs` (~450 internationaux notés à la main), puis
on relance `genMonde.cjs`. **Viser zéro avertissement en console.**

### Bibliothèque (`src/lib/`) — 81 modules purs

Les règles du jeu vivent ici, **sans store ni DOM**, pour être mesurables sans
navigateur. Les plus structurants :

- **Progression** — `progression.ts` (note de saison → points d'attributs),
  `effectif.ts` (`effectifDuClub`, `noteALAge`, `forceEffectif`).
- **Marché** — `offres.ts` (côté joueur), `recrutementManager.ts` (côté
  entraîneur, **et c'est lui qui détient `budgetsDuClub`**), `negociation.ts`,
  `vestiaireManager.ts` (vendre), `approchesClubs.ts` (**se faire acheter**).
- **Monde** — `divisions.ts` (le registre des montées/descentes), `championnat.ts`,
  `coupe.ts`, `phaseFinale.ts`, `promotion.ts`, `calendrier`/`mondial`.
- **Manager** — `manager.ts`, `carriereAvancee.ts` (couche 1 : monde, vestiaire,
  médical, agents), `carriereProfonde.ts` (couche 2 : délégation, culture,
  relations), `installations.ts`, `formationManager.ts`, `compositionManager.ts`.
- **Match** — `moteur/` + `matchLive.ts`.
- **IA** — `groq.ts`, `mj.ts`, `ia.ts`, `iaSociale.ts`.
- **Économie** — `economie.ts` (`financesDuClub` : **la** formule), `stade.ts`,
  `supporters.ts`, `financesClub.ts`.

### `src/lib/ligue/` — la Carrière en ligne

Le cahier de combinaisons est une **bêta privée du compte authentifié `kiri`**.
`combinaisons.ts` valide les plans, sélectionne les situations (phase, zone,
côté) et tire les variantes pondérées. `components/EditeurCombinaisons.tsx`
offre un bac à sable 2D : placements, passes par numéro, courses, leurres et
jeu au pied. `TerrainCombinaison.tsx` ouvre un terrain agrandi (portal et
`useModalDialog`), avec zoom, déplacement de la vue, pause, ralenti et lecture
par étape. Ses commandes sont regroupées, avec pictogrammes `Icone` et cibles
tactiles. `ligue/apercuCombinaisons.ts` calcule le tracé, les mouvements et la
possession du ballon, y compris le lancer du n° 2. `simulationCombinaisons.ts`
adapte ces images à `TerrainDirect` et aux gestes du `SpriteRugbymanMemo` des
matchs : lancer, saut, lift, passe, réception, course et pied. Le club fournit
son maillot tiré de l’écusson. Les tracés peuvent être masqués ; la pose et le
ballon restent pilotés par la progression, même en pause.
L'enchaînement est regroupé par étapes : `ActionCombinaison.simultanee` rattache
un geste au groupe précédent, les anciens cahiers gardant une étape par action.
`etapesCombinaison` partage ce découpage entre validation, tracé et moteur.
Limites : dix étapes, 80 gestes ; un seul geste du ballon et un ordre par joueur
dans chaque groupe. Le bouton « Ajouter un déplacement simultané » ajoute les
appels ; déplacer/supprimer une étape ou son premier geste conserve les frontières
des autres groupes. Les destinations se dessinent aussi sur le terrain.
`imageDebutEtape` fournit une pose fixe au début de l’étape choisie, après tous
les gestes précédents et le lancer en touche, avec la possession correspondante.
L’étape sélectionnée reste distincte de l’action : changer de geste ou naviguer
conserve cette avancée. Le sélecteur de préparation, ses flèches et les titres
des étapes montrent cette pose ; ajouter une étape prépare directement sa suite.
L’édition d’une destination part de cette position ; les placements initiaux
restent accessibles avec « Placement initial ». La lecture démarre à l’étape
préparée et « Rejouer » reprend toute la combinaison. Les coordonnées enregistrées
restent relatives à la conquête, sans changement du cahier ni du moteur serveur.
Les appels démarrent avant le déplacement du premier tick et continuent pendant
le vol d'une passe ; la prochaine étape attend sa réception. Le receveur conserve
la priorité pour rejoindre le ballon. La durée du tracé dépend des étapes et du
lancer, pas du nombre de gestes simultanés (`dureeApercu`).
`ligue/oppositionCombinaisons.ts` crée un exercice local en 15 contre 15, avec le
XV de la composition et une défense de niveau 65 (glissée, blitz ou repli).
`installerSituationCombinaison` installe mêlée/touche/ruck avec les formations
réelles ; `avancer` résout conquête et contacts, `extraireTerrain` fournit les
gestes et les états du direct. Les coordonnées sont traduites vers le terrain
100 × 70 m de l'atelier. La lecture interpolée, pause et retour en arrière sont
déterministes ; « Nouvel essai » change la graine. Arrêt au premier plaquage,
perte, faute, essai ou après 45 secondes, avec bilan passes/plaquages/mètres.
Cet exercice n'écrit aucun score ni état dans la ligue. Le cahier enregistré
reste exécuté par le serveur en mode configuré, uniquement pour la bêta Kiri.
La sauvegarde de stratégie du club synchronise aussi son cahier dans les matchs
en cours via `actualiserCahierMatchEnLigne` : un ordre daté ne modifie que les deux
champs du cahier, conserve les consignes du banc et n’ajoute aucune présence.
Les stratégies du coup d’envoi restent gelées ; `strategieA` reconstruit les
changements depuis le journal, sans appliquer un nouveau cahier dans le passé.
Le cache mémorise le nombre d’ordres réellement appliqués : une reprise depuis
un instant antérieur rejoue aussi les ordres encore à venir.
Une consigne qui ne change pas le cahier conserve la conquête déjà préparée.
`combinaisonSituation` vérifie la situation et les variantes disponibles sans
tirage ; une sortie de ruck programmée prime sur la chenille automatique, même
si celle-ci avait commencé avant l’activation. La conquête et les contacts
continuent d’être disputés. Le premier plan créé active le mode configuré ;
l’éditeur signale clairement le jeu automatique et propose « Enregistrer et
activer ». `DirectCinema` indique l’état réel du cahier de mon camp et le nom du
plan en cours. Aperçu local complet : `/scripts/apercuCombinaisonsMatch.html`.
`CarriereEnLigne` charge l'éditeur avec `lazy`/`Suspense` à l'ouverture du cahier,
sans imposer le moteur d'entraînement à la navigation courante de la ligue.
La navigation est active par défaut (`joueur: null`). « Naviguer » et
« Aucun · navigation » effacent la sélection du joueur et de l'action. Un tap
sélectionne/désélectionne ; un glissement du fond déplace la carte. Deux
pointeurs zooment autour de leur milieu, même pendant la relecture ou avec un
joueur sélectionné. `navigationCombinaisons.ts` calcule la caméra bornée et
l'ancre du pincement avec les marges et le cadrage du SVG. Les captures
pointeur suivent le geste hors du terrain ; lever un doigt reprend la
navigation sans saut. Un joueur glissé a un placement fantôme local, enregistré
au relâchement seulement ; le second doigt ou l'annulation l'abandonne.
« Recentrer », zoom et flèches restent disponibles au clavier.
`placementsCombinaisons.ts` reprend `placementMelee`, `placementRuck`,
`placementTouche` et `structurerAttaque` du moteur : mêlée en 3-4-1 avec le 9
au tunnel, trois avants au ruck et le 9 à sa sortie, pods et ligne arrière.
`joueursEngagesCombinaison` reprend leurs rôles dans cette formation : les huit
avants en mêlée et les trois nettoyeurs au ruck ne peuvent être sélectionnés
ni déplacés avant la sortie, au toucher, au clavier ou dans la liste. Glisser
sur eux continue de déplacer la carte. « Après sortie » libère leurs placements.
Le panneau « Sortie de mêlée », aussi présent sur le terrain agrandi, choisit
explicitement sortie du n° 9 ou départ du n° 8. Le premier porteur est partagé
par les tracés, la validation du cahier et la reprise réelle du moteur.
L'éditeur distingue avant/après conquête ; déplacer un joueur ouvre la vue de
sortie. Le bouton « Reprendre les positions du match » efface les placements
personnalisés. `placementsPersonnalises` reconnaît seulement le gabarit exact
des anciens exemples pour lui rendre les nouvelles bases, sans effacer les
placements modifiés par le coach.
Chaque variante de touche peut choisir 4/5/7 alignés, le sauteur, une réception
entre 5 et 15 m et une feinte au premier bloc. Après le troisième bloc, le
lancer peut viser jusqu'à 25 m et choisir un avant, le 9 ou un arrière. Les
alignés restent entre 5 et 15 m avant le lancer ; le receveur part après le
lâcher, sans lift, et la réception attend sa course réelle avant l'enchaînement.
`ConqueteAnimee.horsAlignement/reception` pilote sa course et le ballon en vol
dans le direct ; la réception utilise passe/vision. `alignementCombinaison` partage
la formation entre aperçu et `phasesArretees.ts` ; `preparerCombinaison`
l'installe réellement en match. Les placements de sortie restent relatifs à
la conquête, même lorsque le ballon est reçu au fond de l'alignement.
Les anciens cahiers sans champ `touche` reçoivent des valeurs par défaut.
Le cahier vit dans `StrategieEnLigne` (`modeCombinaisons`,
`combinaisons`) et dans les feuilles gelées des matchs, sans migration SQL.
`moteur/combinaisons.ts` pilote les cibles ; `moteur.ts` exécute les gestes
avec les contacts et les erreurs ordinaires. La conquête reste disputée :
une touche ou mêlée perdue annule le lancement préparé. Sans situation
correspondante ou joueur disponible, le moteur reprend son jeu habituel.
`carriereApi.ts` transmet l’autorisation vérifiée à `agirCarriere` ; jamais
depuis un pseudo ou un drapeau envoyé par le client. Le cahier adverse reste
privé dans la vue de ligue. Banc : `npm run verify:combinaisons`.

**Cartes spéciales** (`ligue/cartesSpeciales.ts`, graine `data/cartesSpeciales.ts`) :
ICONS (100 retraités, toute l'année) et Halloween 2026 (23 cartes, 5 oct. → 30 nov.,
pack dédié). Définitions et événements dans `CatalogueAdmin.speciales` (diff de la
graine, même révision que l'Atelier) ; images dans `carriere_cartes_speciales_images`,
servies par `/api/carriere?imageSpeciale=<id>&v=<n>` (privées tant que jamais publiées).
⚠️ **Rien ne sort sans image ni publication** (`statutCarteSpeciale`) ; une ligue sans
`cartesSpeciales` ne consomme AUCUN tirage de plus (`preparerTirageSpecial` → null).
Chance par carte : ICONS ≈ Mythique, Halloween = √(Élite × Mythique) ; la carte garantie
d'un pack les tire au prorata des bandes autorisées (`tirerSpeciale`, option `base`).
⚠️ **Le pack Halloween se vend dans la boutique de packs spéciaux de la Collection
solo, PAS en ligue** (`packsEvenementSolo`, prix en Ovas du compte, pochette 3D
`MODELES_PACKS_EVENEMENT`) ; `completerPacks` retire tout pack d'événement d'une ligue.
Ses cartes sortent aussi des packs ordinaires des ligues qui les autorisent, et des
packs solo payants (jamais des gratuits). Le catalogue solo reçoit les seules cartes
publiées (`specialesPubliques`, avec `/api/carriere?catalogueSolo=1`), ajoutées en FIN
de tableau et hors des bandes de rareté. `cartesSpeciales.ts` reste LÉGER (le store
l'importe via `collectionSolo.ts`) ; la graine et la fusion avec le Labo sont dans
`catalogueSpecial.ts`, `rareteCarriere`/`carteDansPack` dans `raretesCartes.ts`.
`collectif` est un PLANCHER (Halloween 10) ; la carte compte normalement pour ses
coéquipiers. Deux cartes du même joueur (`identiteJoueur`) ne vont pas sur une feuille.
Labo : `serveur/atelierSpeciales.ts`, `components/LaboCartesSpeciales.tsx`. Imports
joueurs : `ligue/importsJoueurs.ts` (nom + naissance, nom + club, fiche source unique,
sinon douteux), ajouts dans `CatalogueAdmin.ajouts` (sourceId `import:…`), lot
`serveur/lotImportJoueurs.ts` (`npx vite-node scripts/genLotImportJoueurs.ts`).
Banc : `npm run verify:cartes-speciales`.

`OuverturePack.tsx` ne montre aucun bouton d’amélioration ni indication du
prochain palier avant le clic. Le bouton transparent sur la pochette porte le
libellé neutre « Ouvrir le pack » et reçoit le focus au clavier. Les montées
restent révélées au toucher ; le bouton du bas apparaît à la révélation des
cartes. Aperçu local : `/scripts/apercuPacks.html`.

**Ces fichiers tournent des deux côtés** — navigateur ET fonctions serverless —
comme `classementMondial.ts` : aucun import du store, aucun DOM, aucune horloge
implicite (`Date.now()` se passe en paramètre), aucun texte affichable.

Quatre modules portent le mode :

| Module | Ce qu'il détient |
|---|---|
| `typesCarriere.ts` | Le vocabulaire : ligue, club, carte, vente, échange, objectif, commande. |
| `catalogueCarriere.ts` | **Le vivier mondial** (78 083 joueurs réels), la dotation de 30 licenciés de Régionale 3, les 7 packs, les 1 353 écussons. |
| `carriere.ts` | **Toutes les règles** : saison, calendrier, packs, marché, enchères, échanges, objectifs, coupes, classement, récompenses. |
| `matchCarriere.ts` | **Le match** : stratégies, horloge continue, décisions en direct, remplacements, terrain rejouable, feuille. |

Le créateur d'une ligue peut changer sa cadence de 1 à 7 matchs par semaine.
La replanification porte sur toutes les rencontres futures, coupes comprises,
et la récupération physique suit cette cadence sans modifier les matchs joués.
Dès qu'une affiche d'une journée a commencé, toute cette journée est figée :
le changement de rythme ne recale que les journées encore entièrement vierges.

Le compte serveur `kiri` reçoit automatiquement un **Laboratoire Kiri** privé :
quatre clubs, une saison active et une console pour lancer un match tout de
suite, avancer son horloge, le terminer, soigner les effectifs, créditer des
Ovas et remettre le bac à sable à zéro. Ces commandes sont refusées côté
serveur à tous les autres comptes et le laboratoire n'entame pas le plafond de
vingt ligues ordinaires. Banc : `npm run verify:laboratoire`.

« Comptes & ligues » est réservé à l’identifiant serveur `kiri`. Le répertoire
affiche et recherche les identifiants de connexion, distincts des pseudos et
des UUID techniques. Les stockages fichier et Neon exposent explicitement le
champ `identifiant` dans `AdministrationCarriere`, sans empreintes ni sessions.
Les vues ordinaires de compte restent limitées à leurs champs publics.
`AdministrationKiri` utilise par défaut le chargeur API ; l’aperçu local
`/scripts/apercuAdministration.html` injecte uniquement des comptes fictifs.
Banc : `npm run verify:administration-kiri`.

⚠️ **Neuf autres modules du dossier ne servent plus qu'à leur propre banc**
(`types`, `rarete`, `identite`, `reglages`, `vivier`, `dotation`, `valeur`,
`packs`, `ova`, `index`). C'est le socle du premier lot, construit sur un autre
modèle de vivier ; seuls `aleatoire.ts` et `calendrier.ts` en sont encore
utilisés. `npm run verify:ligue` mesure donc du code que le jeu n'exécute
jamais — **dette à trancher, décrite dans `serveur/LIGUES.md`.**

Détail complet, chiffres mesurés et invariants : **`serveur/LIGUES.md`**.
Banc du mode : `npm run verify:carriere` (208 contrôles, ~3 min).

---

## Les deux carrières

### Joueur

1. On tape une action en français dans `Carriere.tsx` (ou on clique une suggestion).
2. `demanderAuMJ()` transmet à Groq : prompt système + fiche joueur + historique
   + action. Sortie JSON stricte.
3. `appliquerReponse()` applique les deltas et écrit deux entrées au journal.

**Deltas autorisés** : `vitesse, force, endurance, plaquage, passe, jeuAuPied,
vision, mental` (±3) · `forme, moral, reputation` (0-100, ±20) · `argent`.
Toute clé inconnue est ignorée par `nettoyerDeltas()`.

### Manager

On prend un banc (`CreationManager`), on compose, on recrute, on fait monter le
club. Le bureau a 13 onglets : Club, Composition, Trésorerie, Calendrier, Marché
mondial, L'Ovale, Formation, Recruteurs, Entraînement, Direction, Vestiaire,
Monde, Histoire.

**Invariants du mode manager** (détail dans `JOURNAL.md`) :

- **Ne pas régénérer le monde au rendu.** Les 833 clubs ne s'initialisent qu'à
  la création ou à la migration.
- **Une absence doit atteindre le moteur ET les statistiques.** Un convoqué ou
  un blessé ne joue pas et ne marque pas.
- **Le scouting ne montre jamais la valeur exacte** avant le niveau complet.
  `rapportConnaissance` seul décide de ce que l'écran affiche.
- **Déléguer doit changer quelque chose** — jamais un texte décoratif.
- **Direction et supporters ne partagent pas une jauge.**
- **Aucun trophée ne se déduit du rang brut** : le championnat lit
  `phaseFinale(...).champion`, chaque coupe lit son vainqueur final.
- **Le marché a un critère SPORTIF**, pas seulement contractuel : plafond de
  niveau (force du groupe + 4 + âge + libre + prestige/10) et saut d'étage
  (2 en pro, +2 en amateur, +1 avant 23 ans). Mesuré : un Régionale 3 atteint
  27 cibles sur 360, un Top 14 les 360.
- **`EFFECTIF_MINIMUM = 26`** (`compositionManager.ts`) — on ne peut pas vendre
  tout son effectif ; le plancher compte les ventes en cours.

---

## Le moteur de match

Réécrit de zéro, à **pas fixe**, dans `src/lib/moteur/`. Le joueur ne déplace
pas son avatar : **il choisit**, et regarde le geste se jouer. Un choix est un
duel avec pourcentage annoncé. Les vraies statistiques du match alimentent la
saison — rien n'est estimé.

La ligne arrière conserve ses couloirs pendant les combinaisons. Une passe
automatique exige un receveur derrière le porteur ; pendant le vol, sa cible
reste le point d'arrivée. Si le joueur n'y est pas, le ballon devient libre au
sol. Sur engagement ou autre jeu au pied, les receveurs courent vers la chute
dès que le ballon est en l'air, même si le placement arrêté était figé.
En défense, la sentinelle du ruck doit être un joueur encore debout ; les
voisins du passeur conservent leur glissée et l'arrière ferme le couloir menacé.

Les autres rencontres de la poule sont rejouées sans rendu, dans une **file
sérialisée** : une avance calendrier ne peut pas écraser un cumul concurrent.

### Le match en trois dimensions

Les matchs de carrière (`MatchLive`) et le direct d'une ligue en ligne
(`TerrainEnDirect`, dans `DirectCinema`) s'affichent en trois dimensions :
stade, joueurs, coiffures et animations récupérés, mis en scène par
`public/rn26/` (sources du lecteur : `../analyse-rn26/apercu/match/`). Le
terrain vu de haut reste disponible — bouton 2D/3D de la scène, préférence
retenue dans `localStorage`, et repli automatique si WebGL ou un fichier manque.

⚠️ **LA SCÈNE NE DÉCIDE DE RIEN.** Elle LIT un état de match et le met en
images ; décisions, cartons, remplacements, consignes et scores restent ceux du
moteur. `lib/match3D.ts` la charge à la demande et lui remet les fonctions
pures du moteur (`positionVol`, `geometrieMelee`, `porteurPourAffichage`), pour
que l'affichage lise exactement la version du moteur qui joue.

- **Elle n'est pas dans le bundle.** Ses modules (three compris) sont servis
  tels quels depuis `public/rn26/`. ⚠️ Un fichier de `public/` ne s'importe pas
  depuis le code empaqueté (Vite réécrit l'`import()` et refuse de le servir) :
  `match3D.ts` pose une balise `<script type="module" src="/rn26/chargeur.js">`,
  qui dépose la scène sur `globalThis.__destinyRugbyScene3D`.
- **`components/match/Terrain3D.tsx` ne fait que monter la scène.** C'est
  l'écran hôte qui la nourrit, dans SA boucle : `scene.retenir(dt)` puis
  `avancer(e, dt)` puis `scene.image(dt, { vitesse, fige })`. Une seconde
  boucle se désaccorderait de la première. React ne redessine plus trente pions :
  dix rendus par seconde suffisent au score et aux bandeaux.
- **Carrière** : la scène lit `e`, l'état vivant du moteur. La vue est choisie
  AVANT le coup d'envoi parce qu'elle règle `cadenceDetaillee` (voir plus bas).
- **Ligue en ligne — LE FILM DU MATCH** (`lib/ligue/filmDirect.ts`).
  ⚠️ **L'ÉCRAN NE DEVINE PLUS RIEN, IL REJOUE.** Il recevait une photo du
  terrain toutes les deux secondes et inventait le reste (trajectoires tirées
  entre deux positions, porteur deviné, mêlée découpée d'après sa progression) :
  de là les retours en arrière — il prolongeait une course que la photo suivante
  contredisait —, les plaquages à distance et les phases jouées avant que les
  joueurs y soient.
  - **Serveur** : une caméra (`filmer`) observe chaque pas du moteur rejoué en
    mémoire (0,15 s) et garde les douze dernières secondes. Au sondage, l'écran
    annonce le dernier pas qu'il connaît (`&film=<n>`) et ne reçoit que la
    suite, sous forme de DIFFÉRENCES : déplacements en centimètres, et les seuls
    champs de l'état qui ont changé. Un ruck, une passe, un coup de sifflet sont
    donc des événements datés au pas près. **Rien n'est écrit en base, le nombre
    de requêtes ne change pas**, et la réponse pèse 4,6 Ko au lieu de 8,4
    (1,4 Ko compressés contre 2,2).
  - **Client** : `LecteurFilm` range les pas et les rejoue avec trois à quatre
    secondes de retard. Sa lecture ne recule jamais et ne dépasse jamais la
    dernière image reçue ; un envoi en retard se rattrape par la VITESSE (−12 %
    à +15 %), jamais par un saut. Il règle son retard sur le CREUX de son
    tampon, pas sur sa moyenne. L'état rejoué a la forme de celui du moteur :
    la scène 3D le lit comme un match de carrière (`brancher(etat, { direct:
    false })`), le terrain vu de haut passe par `extraireTerrain`.
  - **Score, chrono, fil et décision** suivent l'instant MONTRÉ (`AfficheDirect`),
    pas celui du serveur : sinon l'essai s'annonce avant qu'on ne le voie.
  - ⚠️ **L'IDENTITÉ DES OBJETS VOYAGE AVEC EUX.** La scène reconnaît un nouveau
    ruck ou une nouvelle passe à ce que l'OBJET a changé. Chaque objet filmé
    porte donc une marque de génération (`#`) : inchangée, l'écran met à jour
    le sien ; changée, il en crée un neuf. La recréer à chaque pas relancerait
    le sifflet et l'animation du ruck six fois par seconde.
  - ⚠️ **`e.apresPas` N'OBSERVE QUE.** Ce crochet du moteur ne modifie rien,
    sinon deux rejoues du même match divergent.
  - ⚠️ **LE CLIENT NE REÇOIT TOUJOURS NI LA GRAINE NI LE PLAN ADVERSE.** Faire
    tourner le moteur dans le navigateur aurait livré la suite du match ; le
    film ne donne que le passé.
  - Un écran d'avant (sans `film=`) reçoit toujours le relevé. L'ancien chemin
    (`interpolationDirect`, `etat3DDepuisDirect`) ne sert plus qu'à l'atelier
    et au laboratoire.
  - Bancs : `npm run verify:film-direct` (5 500 pas rejoués identiques au
    moteur, réponses lentes, coupure, rechargement), `npm run verify:direct-3d`
    (ce que la scène montre : plaquages au contact, phases qui attendent).
    Aperçu local : `/scripts/apercu-direct-3d.html` (`?latence=900`,
    `?regles=1`, `?releve=1`, `?pilote=1` pour un onglet caché).
- ⚠️ **LES RÈGLES D'UN MATCH DE LIGUE SONT GELÉES AU COUP D'ENVOI**
  (`EtatMatchEnLigne.regles`). Absent ou 1 : le moteur d'origine. 2 : cadence
  détaillée, `placementJoue` et défense resserrée. **3 (les matchs créés
  aujourd'hui) : les règles 2 plus l'IA par poste** (`iaDesRegles`), étalonnée
  pour quatre-vingts minutes réelles, avec le vent, les drops, les reprises
  d'en-but et le changement de côté. Un match en cours au moment
  d'une mise en ligne garde donc son moteur — et son score. Remettre
  `REGLES_MATCH_EN_LIGNE` à 1 suffit à revenir en arrière pour les suivants.
  ⚠️ Toute retouche du moteur détaillé change la rejoue des matchs en règles 2
  DÉJÀ COMMENCÉS : la passer sous une règle 3, ou la mettre en ligne quand aucun
  match ne se joue.
- **Habillage** (`habillage.js`) : tenues repeintes pixel par pixel depuis
  l'atlas d'origine aux couleurs du club (motifs uni, cerceaux, rayures,
  épaules, bande, diagonale), écusson cousu sur la poitrine, numéro dans le dos ;
  `departagerTenues` fait jouer le visiteur en tenue extérieure quand les deux
  couleurs se confondent. Panneaux aux annonceurs inventés de Destiny Rugby
  (dont `@destiny.rugby2`), poteaux blancs, protections à la couleur et à
  l'écusson du club qui reçoit, six tribunes sur huit aux couleurs du club à
  domicile. Un écusson distant passe par le relais (`ecussonPourToile`) : dessiné
  tel quel, il salirait la toile.
- **Le stade dépend du niveau de celui qui reçoit** (`lib/stade3D.ts`, option
  `stade` de la scène) : terrain de campagne en Régionale, stade de village en
  Fédérale, stade moyen en Nationale, grande enceinte en Pro D2, enceinte
  internationale pour le Top 14, les premières divisions étrangères et les
  sélections. En carrière c'est la division RÉELLE du club (montées comprises) ;
  en ligue, la moyenne des quinze meilleures cartes de celui qui reçoit. Les
  décors `public/rn26/decor/stade-club-*.glb` sortent des scènes de club de
  l'APK (`../analyse-rn26/exporter_stades.py`, qui lit les maillages Unity à la
  main, compression comprise) ; ils portent les MÊMES noms de matériaux que le
  Stade de France, donc public, réclames et abords s'habillent sans cas
  particulier. Chaque décor n'est téléchargé que s'il sert, et un décor absent
  retombe sur l'enceinte internationale. Aperçu : `/rn26/index.html?stade=campagne`.
- ⚠️ **AUCUNE MARQUE DE L'ÉDITEUR D'ORIGINE NE RESTE À L'IMAGE.** Le maillot
  (zone `MARQUES` de `habillage.js`, trop courte : le nom restait lisible sur
  chaque poitrine), le ballon (`creerBallon`), le panneau bleu du stade
  (`nettoyerStade`), la banderole des abords et les réclames portent Destiny
  Rugby, le TikTok du jeu ou des annonceurs inventés. Tout nouveau décor se
  relit texture par texture avant d'être livré.
- **Coiffures et barbes** : ce sont des cartes de mèches découpées par
  transparence. ⚠️ Exportées sans leur masque, les vingt-trois coupes
  ressemblaient toutes à un bloc de cheveux longs. `exporter_masques_coiffures.py`
  tire le masque du canal alpha des « supportmaps » d'origine, `exporter_coiffures.mjs`
  l'embarque avec les UV, et les familles (`COIFFURES` dans `corps.js`) sont
  rangées d'après ce qu'on VOIT une fois le masque appliqué (`mesurer_coiffures.py`).
- **Casques et crampons** : ceux de la boutique (`public/m3d/`), allégés par
  `alleger_equipement.mjs` (de 150 000 sommets à un millier, couleur cuite aux
  sommets quand la texture ne survit pas à la simplification). Un à trois
  casques par équipe, surtout des avants ou un ailier (`porteCasque`) ; un
  joueur sur deux garde les crampons d'origine.
  ⚠️ Le casque se règle sur la TÊTE (largeur du crâne, sommet affleurant) : posé à
  une taille fixe, il flottait six centimètres au-dessus.
  ⚠️ Et il regarde du même côté que le visage : les modèles allégés ont le visage
  vers −Z, la tête du joueur vers +Z — posés tels quels, les cinq casques étaient
  devant-derrière. `scene.js` les retourne d'un demi-tour.
- **Le ballon du match est celui équipé en boutique** (`skinActif` → option
  `ballon` de la scène) : les cinq skins sont allégés par le même script
  (`decor/equipement/ballon-<skin>.glb`) et prennent la place du ballon de la
  scène, à la même taille et sur le même axe. En ligne, chacun voit le sien.
  Aperçu : `/rn26/index.html?ballon=tricolore`.
- **Apparence** : `apparenceJoueurMatch(nom, poste)` — peau, cheveux, coupe et
  barbe lus sur le portrait de la carte (`apparencesMatch.generated.ts`), tirés
  du nom sinon. Un champ manquant n'est jamais « chauve » par défaut.
- **Nom du porteur** dans une flamme sous ses appuis ; il disparaît dès que
  personne ne tient le ballon.
- **Attentes vivantes** : pendant un arrêt de jeu, chaque joueur immobile
  enchaîne ses propres gestes (appuis, mains sur les hanches, bras croisés,
  quelques pas), pris en cours de route et tirés joueur par joueur, et regarde
  le buteur, les poteaux, le ballon ou un coéquipier.
- ⚠️ **Chaque scène clone le décor et les matériaux qu'elle repeint.** Le stade
  chargé est partagé par la session ; repeint en place, une scène détruite
  (React monte deux fois en développement) rendait à l'autre ses panneaux d'origine.

#### La présentation télévisée

Tout ce qui entoure le match à l'image. ⚠️ **Rien ici ne décide, et rien n'est
imposé** : son, ralentis et avant-match se coupent d'un bouton, le choix est
retenu (`preferencesTele`, `destiny-rugby:tele` et `destiny-rugby:son`), et
accélérer le match passe l'avant-match.

- **Son** (`public/rn26/sons.js`, 40 clips de l'APK copiés par
  `node exporter_sons.mjs` depuis `../analyse-rn26`, 3 Mo, chargés seulement si
  le son est ouvert). Il ÉCOUTE l'état du match : un lit de foule à trois
  boucles mélangées selon la tension (ballon près de la ligne, percée), les
  réactions du stade — qui est celui du club qui reçoit : essai, tir, carton et
  pénalité ne font pas le même bruit selon le camp —, et le terrain (sifflet,
  chocs, efforts, « flexion, liez, jeu »). L'APK n'a aucun bruit de frappe :
  elles sont synthétisées, une variante par type de coup de pied.
- **Caméras** (`television.js`, `Camera3D`) : `tv` est le défaut — la
  réalisation choisit ses plans (dos du buteur, puis derrière les poteaux quand
  le ballon part ; en-but à moins de neuf mètres de la ligne ; ras de la pelouse
  en mêlée ; vue aérienne sur un engagement ou un long coup de pied ; plan serré
  sur le marqueur ; la touche sur un remplacement). On passe d'un point de vue à
  l'autre par une COUPE ; un plan tient au moins 2,5 s. Les sept plans restent
  choisissables à la main.
- ⚠️ **UN RALENTI REJOUE DES IMAGES, PAS LA SIMULATION.** La scène garde 9,5 s
  de ce qu'elle a affiché (positions et os des trente corps, ballon — 8 Mo, 3 Mo
  sur téléphone) et les rejoue en contre-champ, interpolées, derrière un volet.
  Le moteur continue dessous ; une carte de décision, une reprise du jeu ou un
  appui coupent le ralenti. Déclenché après un essai, et par l'écran pendant
  l'arbitrage vidéo (`scene.revoir`). Aucun effet sur le serveur des ligues :
  la bande est locale.
- **Remplacements** : instantanés pour le moteur, mis en scène par
  `DestinyMatch.scenographie` — le sortant regagne son banc à pied (lentement
  s'il est blessé), l'entrant arrive en courant ; ce ne sont que des positions
  AFFICHÉES. `BandeauRemplacements` montre les portraits et groupe un banc entier.
- **Avant-match** (`MatchLive`, `AvantMatch`) : l'affiche, puis les deux
  compositions par lignes pendant que les équipes sortent du tunnel
  (`scene.entrer(k)`). ⚠️ Le moteur ATTEND : rien n'est joué tant qu'il dure.
  ⚠️ Il se décide À L'OUVERTURE DU MATCH, pas au branchement de la scène 3D :
  décidé là-bas, on ne voyait les compositions qu'en carrière d'entraîneur. Vu
  de haut, la présentation passe aussi. En ligne le match n'attend personne :
  `DirectCinema` joue la présentation sur sa propre horloge, pour qui ouvre le
  direct dans le premier quart d'heure, le jeu continuant derrière.
- **Habillage TV** (`components/match/HabillageTV.tsx`, `lib/habillageTV.ts`,
  aperçu `/scripts/apercuHabillageTV.html`, banc `npm run verify:habillage-tv`) :
  score incrusté en haut à gauche aux couleurs et au logo de la ligue (logo
  recadré dans un carré), onglet des essais au-dessus de chaque équipe, carton
  rouge penché avec le nombre d'exclus, compte à rebours des jaunes dessous,
  chrono rouge et corne (`sons.js`) dans le temps additionnel, compositions par
  lignes avec le portrait de la carte (sans photo : la silhouette grise des
  cartes), bandeaux de carton avec motif, de coup d'envoi et de seconde période.
  Textes : clés `tv.*`, sept langues. ⚠️ Dans le direct de ligue, l'image ne
  porte QUE cet habillage : les étiquettes de phase, de scénario et de sifflet
  sont masquées (`.dc-ecran` dans `DirectCinema.css`).
  Possession, commentaire d'action et étiquettes de phase ne s'affichent plus,
  ni en carrière ni en ligne (le fil et les statistiques gardent leurs onglets) ;
  une pénalité, un en-avant ou une passe en avant s'annoncent par le MÊME bandeau
  qu'un carton (`BandeauSiffletTV`, nourri par `e.sifflet`).
- **Décision de pénalité en ligne** : le panneau se pose SUR l'image
  (`panneauDecision` de `DirectCinema`), donc visible en plein écran, et les
  joueurs se replacent pendant le choix. ⚠️ `patienter(e)` (moteur) ne fait que
  des déplacements — ni tirage, ni horloge, ni phase — et le nombre de pas joués
  est inscrit au journal avec la décision (`EvenementMatchEnLigne.attente`) :
  une rejoue à froid en refait exactement autant. Un moteur gardé en mémoire qui
  aurait attendu plus que le journal est remonté de zéro.
- **Mi-temps et fin de match** : `PanneauMiTemps` (possession, essais, mètres,
  franchissements, passes, plaquages) et `HommeDuMatch` en tête de la feuille.
- **Cartons** à côté du nom de l'équipe, avec les minutes restantes.
- ⚠️ **TESTER UN MATCH SANS LE FINIR.** Un match mené à son terme débloque un
  succès et crédite un Ova, synchronisés avec le coffre du compte : restaurer
  la sauvegarde ne suffit plus.

⚠️ **`cadenceDetaillee` EST UNE OPTION DE `creerMatch`, PAS UN SECOND MOTEUR.**
Vue de haut, une mêlée expédiée en six secondes se lit ; à hauteur d'homme les
corps n'ont le temps ni de se lier ni de pousser. Les matchs de carrière joués
en 3D et l'aperçu de l'accueil la demandent ; le serveur des ligues, non.

- **Mêlée par étapes** (`conquete.melee`, ~11,5 s) : placement → liaison → impact →
  introduction → poussée → sortie. ⚠️ Le duel est tranché **à l'introduction**
  (`deciderMeleeDetaillee`), pas à la fin : la mêlée qu'on regarde avancer,
  reculer, tourner, s'écrouler ou se relever EST le résultat. `geometrieMelee`
  est une fonction pure du temps, lue par le moteur ET par l'affichage.
- **Passes à vitesse de terrain** (`dureePasseDetaillee` : ~9 m/s courte, jusqu'à
  18 m/s longue). ⚠️ **Une passe lente change le rapport de force** : la viser le
  long de la vitesse du receveur et laisser le rideau monter pendant tout le
  vol faisait PERDRE 1,4 m par temps de jeu. Le ballon est visé DEVANT le
  receveur, et les deux défenseurs ne se jettent que dans les 0,4 dernière seconde.
- **Rucks** : ⚠️ **un soutien doit pouvoir S'ARRÊTER à sa place.** Avec la seule
  inertie de course il dépassait le regroupement de trois à treize mètres avant
  de revenir (`deplacer(p, dt, vif)` suit donc sa distance de freinage). Les
  soutiens choisis sont ceux qui peuvent arriver, pas les plus proches à
  l'instant du plaquage. La scène ne lie un joueur qu'ARRIVÉ, puis l'ancre.
  Le ballon n'est joué que par un joueur présent au ruck (2,6 m) : le 9 s'il
  est là, sinon le joueur debout le plus proche, qui écarte ou repart au ras
  (**pick and go**).
- **Cellules d'avants** (`e.cellule`) : deux avants s'accrochent au porteur,
  le trio pousse encore une seconde au contact (`lancerPoussee`) et aspire
  deux défenseurs.
- **Après l'essai** (`tir.etape`) : célébration, puis le buteur rejoint le
  ballon, le ramasse, le porte, le pose, recule, se concentre et s'élance. Il
  n'est JAMAIS posé d'un coup sur le tee.
- En match de dix minutes, un arrêt consomme son temps de jeu prévu réparti
  sur sa durée d'écran (`facteurArretDetaille`), pas huit fois cette durée.
- **Identité et structures d'attaque** (`styleDuClub`, `structureAvancee`,
  `majStructure`) : équilibre, avants, large, pied ou leurres. Le côté du
  prochain temps de jeu est décidé DÈS LE PLAQUAGE (`coteDeLaPhaseSuivante`),
  et trois avants libres forment un bloc à cinq mètres du ruck pendant qu'il se
  joue (`preparerBloc`). Écran d'avants (le ballon passe dans leur dos pour
  l'ouvreur), croisée, redoublée. Les leurres courent AVANT la passe, et chaque
  défenseur placé devant eux mord ou non selon sa `vision` (`fixerLaDefense`) :
  la défense ne sait pas d'avance qui recevra.
- ⚠️ **LA LIGNE REÇOIT LANCÉE** (`lancerLaLigne`). Servi à l'arrêt à sa
  profondeur de placement, un receveur rendait quatre mètres par passe. Les
  deux prochains receveurs partent avant le ballon, en gardant la profondeur
  que demande la LONGUEUR de la passe (ce que leur course couvre pendant le
  vol) ; le relayeur lâche quand cette course les amène à sa hauteur.
- ⚠️ **UNE PASSE SE VISE LÀ OÙ LE RECEVEUR SERA** (`menerLeReceveur`, passe ET
  offload). Trois erreurs faisaient tomber une passe sur six dans le vide : la
  durée du vol était calculée pour une autre distance que celle du tir ; un
  receveur lancé vers son camp était supposé s'arrêter net ; rien ne bornait la
  course demandée. Et pendant le vol, un receveur déjà sur le point visait
  trois mètres plus loin. Mesuré : 16,3 % de passes sans receveur → moins de 4 %.
- **Mêlée** : le 9 introduit puis passe DERRIÈRE son 8. Départ du 8 petit
  côté, grand côté ou dans l'axe (`Lancement.couloir`), seul ou avec le 9 dans
  sa roue. ⚠️ Ce départ était décidé mais jamais joué : le ballon était donné
  au 8 sans ouvrir le jeu courant, et la mêlée était tranchée une SECONDE fois
  à l'image suivante. Toute sortie de phase arrêtée passe par `reprendreJeu`.
- **Touche** : la sortie s'annonce avec la combinaison (`conquete.sortie`),
  parce qu'elle se prépare — déviation du haut du saut pour le 9, peel d'un
  avant qui contourne l'alignement PENDANT le saut, descente classique, ou
  maul selon le style. Devant, lancer sûr et ballon lent ; au fond, lancer
  risqué. ⚠️ À forces égales le duel rendait une touche sur trois à
  l'adversaire : l'équipe qui lance garde l'avantage de l'annonce (16 lancers
  proprement gagnés sur 39 → 21 sur 28).
- **Fautes visibles** : chaque motif sifflé a son geste (`GESTES_DE_FAUTE`,
  joué par `siffler`), avec une `variante` quand un même clip sert deux
  situations. Coup de poing et bousculade n'existent pas dans les animations
  récupérées : la scène les construit. Un plaquage manqué laisse le défenseur
  2,3 s au sol (variante « manque »).
- ⚠️ **UN EXCLU NE DISPARAÎT PLUS.** Il écoute l'arbitre le temps du carton, puis
  quitte la pelouse en marchant : au bord de la touche devant son banc pour dix
  minutes (il rentrera de là en courant), vers le tunnel pour un rouge. Avec
  l'IA par poste, le moteur le fait rentrer de ce même point.
- **Gestes de l'IA par poste** : touche rapide (ramassage, armé à deux mains,
  remise en jeu), faux saut désigné, maul simulé, capitaine appelé par
  l'arbitre sont des clips de l'APK ; le par-dessus, le bras levé de celui qui
  réclame le ballon, le bras tendu du 9 qui annonce son côté et les mains
  levées du joueur sifflé hors-jeu n'y existent pas : la scène les construit
  (`construire`). Tableau complet : `../analyse-rn26/SIMULATION.md`.

- ⚠️ **UN CONTACT SE LIT AVANT DE SE JOUER** (`moteur/duels.ts`, fonctions pures,
  sans tirage). Angle d'arrivée, vitesse de fermeture, rapport de force
  (technique, puissance, poids) décident du plaquage : aux jambes, à la taille,
  haut, de côté, par-derrière, cuillère en poursuite, **dominant** (le porteur
  recule, le ruck se forme en retrait), porteur **tenu debout**, ou porteur qui
  emmène son plaqueur. Le type est écrit dans `e.ruck.plaquage` et dans la
  `variante` des gestes ; la scène joue la suite de clips correspondante.
  ⚠️ Un « énorme tampon » sur cinq était TIRÉ AU SORT, entre deux joueurs
  parfois à l'arrêt, et un raffut asseyait le défenseur quatre fois sur dix quel
  que soit le gabarit. Il faut maintenant de la vitesse ET l'ascendant : 2,3 gros
  impacts par match (un contact sur vingt). Banc : `node verifier_duels.mjs`.
- **Duels gagnés par le porteur** (`duelGagne`) : crochet intérieur, extérieur,
  double appui ou feinte de corps — défenseur simplement éliminé ou pris à
  contre-pied ; raffut à l'épaule ou au torse, percussion épaule en avant —
  défenseur repoussé debout, déséquilibré ou assis. Le porteur ne s'arrête
  jamais : il garde sa course et peut enchaîner.
- **Offloads, chistera, passe au contact** : la chance d'un offload dépend des
  mains du porteur, du plaquage subi (bras libres ou non), d'un soutien LANCÉ
  et du nombre de défenseurs ; il peut se perdre (en-avant, ballon au sol, passe
  mal assurée) et les deux hommes vont au sol après le geste. ⚠️ Réglé une
  première fois trop haut (dix par match au lieu de cinq), le jeu ne passait
  plus par le sol : 3,8 essais par match. La passe au contact n'est pas un
  tirage : c'est une passe donnée avec le défenseur sur soi, qui finit son geste
  sur un homme sans ballon. Chistera : rare, réservée aux bonnes mains.
- **Orientation** : on ne court plus à reculons (au-delà de 1,9 m/s on se
  retourne, la tête seule suit le ballon) ; un botteur se tourne vers sa cible à
  l'armé ; un receveur ouvre le buste vers le ballon pendant le vol puis le
  referme sur sa course ; un avant arrive à la mêlée déjà tourné vers elle ;
  un geste de ruck ne se joue plus en courant. Mesuré : 3,0 % d'images où le
  corps tournait le dos à sa course → 0,6 %.

- ⚠️ **LE PLACEMENT SE JOUE** (`placementJoue` : ligue en règles 2, carrière en
  3D, aperçu). Le moteur INSTALLAIT d'un coup mêlées et touches, posait le
  botteur au centre et tranchait sur minuterie : 2 800 joueurs déplacés d'un
  pas par match, que la scène maquillait en les faisant courir et en retenant
  la phase — ce qu'un direct en ligne ne peut pas faire. Désormais chacun court
  à sa marque (4,8 m/s, 6,2 de loin) et la phase ATTEND (`retenirLePlacement`,
  24 s au plus) : mêlée à l'étape « placement », alignement pas encore
  resserré, renvoi pas encore tapé. Zéro joueur déplacé d'un coup.
  Trois pièges trouvés en chemin : une cellule restée « en poussée » après un
  coup de sifflet plantait ses deux avants jusqu'à la sirène ; le balayage des
  contacts ramenait à leur départ deux adversaires dont les trajets se
  coupaient (sept touches sur trente-trois n'arrivaient jamais à se former) ;
  `separer` et la résolution des contacts expulsaient de trois à quatre mètres
  les joueurs d'un regroupement qui se défait — leur poussée est bornée par pas.
- **Le lanceur va chercher le ballon** (`conduireLanceur`) : il rejoint
  l'endroit où il est sorti, le ramasse (`pick_up_ball`), puis lance les deux
  pieds HORS du terrain. La touche ne part pas sans ballon en main.
- **Chercher la touche est un résultat, plus une certitude** (`viserLaTouche`) :
  la qualité de la frappe (pied, fatigue, défenseur qui monte) décide ; le gain
  est ce qu'il reste de la longueur une fois la largeur traversée (de 13 à
  55 m) ; touches manquées, ballons qui restent en jeu, coups de pied contrés.
  ⚠️ Même « forcée », une frappe attend son armé : sinon le ballon part avant
  que le corps se soit tourné (un coup de pied sur vingt-cinq dans le dos).
- **L'attaque se range par COULOIRS** (`structurerEnCouloirs`). Les places
  étaient des décalages depuis le ballon, rabotés sur la ligne de touche : six
  avants et la ligne empilés dans le couloir (cinq places ou plus près d'une
  touche 9,3 % du temps → 4 %). Deux cellules de trois dans la largeur
  DISPONIBLE, gardées le temps de la phase, la deuxième vague derrière, les
  ailiers sur leur ligne (7,3 m → 5,1 m), l'arrière en profondeur ; resserré
  près de la ligne, reculé dans ses 22. L'équipe se range autour du point de
  départ de la phase et n'accompagne le ballon que d'un tiers.
- **La ligne d'avantage** (`e.avantage`, de −3 à 3) : un ruck formé au-delà de
  la ligne de départ de la phase est une collision gagnée — ballon plus rapide,
  défense plus longue à remonter ; en deçà, l'inverse. Un avant vise
  l'intervalle ou l'épaule du plus léger (`ligneDeCourse`), et la pointe du
  bloc s'élance avant la sortie du ballon (34 % de réceptions à l'arrêt → 8 %).
  Bancs : `npm run verify:structure`, `npm run verify:pied`.

⚠️ **TOUT CE QUI PRÉCÈDE NE VAUT QU'EN CADENCE DÉTAILLÉE, ET LE JEU Y EST PLUS
OUVERT.** Sur les mêmes graines : 2,3 essais et 17 points par match de dix
minutes, contre 1,1 et 9 en cadence normale (percées 3,0 contre 1,6). Un
match de carrière regardé en 3D marque donc plus qu'un match vu de haut, et
plus que les rencontres rejouées sans rendu — à savoir avant de comparer des
statistiques de saison. Le serveur des ligues joue la cadence normale : sa 3D
montre le jeu du serveur, sans ces structures. Les y activer demanderait une
passe d'équilibrage côté serveur.

#### L'IA par poste (`EtatMatch.ia` = 2, `src/lib/moteur/ia/`)

« Qui je suis → où je suis → ce que mon poste doit faire → ce que fait mon
équipe → ce que fait la défense → où en est le match. » Les matchs de carrière
(3D et vue de haut) et l'aperçu la demandent (`IA_MATCH_DE_CARRIERE`, dans
`ia/reglages.ts` : la remettre à 1 rend le moteur d'origine).

⚠️ **TOUT EST DERRIÈRE `iaParPoste(e)`, ET LE NIVEAU EST FIGÉ À LA CRÉATION DU
MATCH.** Sans lui, le moteur rejoue exactement comme avant (vérifié : mêmes
scores et mêmes statistiques sur les graines de référence, `verify:film-direct`
identique). **La ligue en ligne la reçoit par ses règles 3** (voir plus haut) :
un match de quatre-vingts minutes réelles contient 260 regroupements contre 34
en dix minutes, donc les mêmes situations s'y présentent huit fois plus
souvent. Ce qu'elles valent y est ramené à sa mesure par les réglages
`*Reel` de `ia/reglages.ts` (avantage du porteur, retards, élan du soutien,
ballons volés, jeu au pied choisi, cartons), qui ne jouent QUE hors match
condensé. Mesuré sur 72 matchs (`npm run mesure:rugby -- 72 ligue 2`),
règles 2 → règles 3 : **essais 4,7 → 7,1**, points 42,8 → 55,6, pénalités
sifflées 31,7 → 26,5, ballons rendus 65,6 → 38,6, jaunes 1,2 → 1,3, rouges
0,04 → 0,13, drops tentés 0 → 0,56. ⚠️ Les essais ne redescendent pas plus bas par ces réglages (essayé :
défense resserrée jusqu'à 5 plaquages manqués par match, soutien réduit) :
c'est la conservation du ballon qui les porte. Remettre
`REGLES_MATCH_EN_LIGNE` à 2 rend l'ancien jeu aux matchs suivants.

- **Lire avant de décider** (`ia/lecture.ts`, fonctions pures, aucun tirage).
  `lireLaDefense` compte, couloir par couloir (ras, milieu, large, petit
  côté), ceux qui peuvent attaquer et ceux qui peuvent VRAIMENT défendre : un
  défenseur au sol, lié au regroupement, battu ou pas encore replié ne ferme
  rien (`defenseurPresent`). Elle donne aussi les gardes du ruck, le plus
  grand intervalle, la couverture du fond et la place derrière le rideau.
  `situer` donne la zone et la POSTURE : `prudent` dans ses 22, `gestion`
  devant en fin de match, `troisPoints` à portée d'une pénalité ou d'un drop,
  `urgence` quand il faut un essai.
- **Le 9 choisit son jeu** (`ia/jeu.ts` → `choisirLeJeu`). Seize options —
  pick and go, départ du 9, cellule, relais entre avants, seconde cellule
  servie par le 10, écran, ouvreur, large, sautée, arrière intercalé, croisée,
  redoublée, petit côté, coup de pied du 9, occupation, drop — chacune avec un
  POIDS : zone × identité de l'équipe (ou consigne du manager) × lecture ×
  vitesse du ballon × posture. Un seul tirage, au prorata.
- **Le 10 relit en recevant** (`relireLeJeu`, une fois par ballon) : rideau
  qui monte et dos vide → petit par-dessus ou rasant ; ailier adverse monté →
  passe au pied ; premier soutien marqué → sautée ; intervalle devant lui → il
  le prend ; rien d'ouvert dans son camp → occupation. Le 12 et le 15 relisent
  de même quand ils jouent à sa place. Un ballon capté au fond du terrain passe
  par `choisirLaRelance` (relance, réponse au pied, ou reconstruction).
- **Chaque numéro a un métier** (`ia/postes.ts`) : place dans la structure
  (première ligne près du ruck, deuxième ligne et 8 dans la seconde cellule,
  flankers au bord), goût du ballon, priorité au regroupement, au grattage, au
  soutien d'une percée, au saut en touche. ⚠️ Ce sont des préférences : un
  pilier isolé au large y défend ; il ne va plus s'y ranger de lui-même. Un
  trois-quarts plaqué loin du pack est protégé par celui qui est à côté (seuls
  les avants pouvaient nettoyer : tout ruck au large sortait lent).
- ⚠️ **LES ESSAIS VIENNENT DES SITUATIONS, PAS D'UN TIRAGE.**
  - **Ruck rapide → défense en retard** (`poserLesRetards`) : ceux qui
    étaient au sol ou liés manquent au rideau, et la ligne se reforme avec les
    présents (`structurerDefense`) — plus courte sur l'extérieur. Un « ruck
    éclair » (collision gagnée, soutiens à l'épaule) sort avant que le plaqueur
    se relève ; ⚠️ le ballon attend qu'un joueur soit dessus, sinon il était
    donné à sept mètres.
  - **Le même plaquage ne vaut pas partout** (`avantageDuPorteur`) : porteur
    lancé, défenseur qui recule ou pris de travers, duel de vitesse contre un
    avant, défenseur en retard ; à l'inverse deux défenseurs sur le même homme.
    Face à un rideau en place et un receveur arrêté, rien ne change.
  - **Soutien de la percée** (`soutenirLaPercee`, `soutienLibre`) : trois
    joueurs viennent à hauteur ; le porteur fixe le dernier défenseur et donne
    quand celui-ci est ENGAGÉ (à 3,8 m, pas à 6,5 : il glissait sur le receveur).
  - **La défense se trompe** : montée solitaire sur un blitz
    (`deciderLaMontee`), leurre mordu, interception tentée et manquée.
  - Le ballon bien soutenu ne se perd pas : deux soutiens arrivés divisent par
    2,5 la chance de grattage (un ruck sur cinq changeait de camp).
- **Jeu au pied** : par-dessus (`parDessus`, nouvelle intention), rasant visé
  dans l'espace le plus vide, passe au pied dans la course de l'ailier, 50/22
  sur rebond (`BallonLibre.depuis`). Le drop n'est plus un tirage : il se
  tente quand trois points changent le match (posture `troisPoints`). ⚠️ Un
  tir au but vole avec l'intention `drop` : le banc les compte à part
  (`tirAuBut`), sinon on lit quatre « drops » par match. ⚠️ Le coup de pied annoncé part dès
  que le botteur a le ballon, et un avant qui sort le ballon à la place du 9
  écarte comme lui : un dégagement sur trois finissait en ruck dans ses 22.
- **Touches** (`annoncerLaTouche`) : l'annonce se choisit selon la zone et le
  style — devant ou milieu + maul près de la ligne adverse, fond + déviation au
  milieu du terrain, lancer sûr dans ses 22, faux saut devant ou au fond
  (`conquete.leurreId`), maul simulé, peel, lancer long pour le 12. Le maul
  s'annonce (`sortie: 'maul'`), il ne se tire plus après coup. **Touche jouée
  vite** (`conquete.rapide`) : après un coup de pied, si un joueur atteint le
  ballon avant qu'un adversaire soit revenu et qu'un partenaire se propose à
  plus de cinq mètres ; si l'adversaire revient, l'alignement se forme.
- **L'arbitre a une mémoire** (`ia/arbitrage.ts`, `e.arbitrage`) : chaque
  pénalité est notée (horloge, zone, famille). Deux fautes dans sa zone ou de
  la même famille en un quart d'heure (trois en temps réel) → il appelle le
  capitaine ; la suivante vaut jaune (« fautes répétées »). Trois degrés par
  faute (`graviteDeLaFaute`) : simple, jaune, rouge. Fautes de situation au
  ruck selon la `tentation` de la défense (devant sa ligne, ballon rapide) :
  plaqueur qui ne se relève pas, mains dans le ruck, hors-jeu, soutien qui
  plonge ; et celles du jeu : obstruction du leurre, plaquage sans ballon,
  en-avant volontaire, plaquage dangereux à la tête. **Pénalités selon le
  score** : à trois points près on tire, à plus on va en touche, devant on
  prend les points.
- **Règle ajoutée** : plaqué dans son propre en-but → renvoi si le ballon y est
  venu d'un coup de pied adverse, mêlée à cinq mètres sinon (le ruck était
  ramené sur la ligne, le plaqué restait neuf mètres derrière).
- ⚠️ **LE MATCH CONDENSÉ** (`condense(e)`, `carriereDixMinutes`). Dix minutes
  d'écran ne contiennent qu'un quart des temps de jeu d'un vrai match (34 rucks
  contre 195). Ce qui se compte PAR MATCH y est ramené à l'échelle de
  l'horloge : la fatigue (`fatigueCondensee` — les titulaires finissaient à 96
  de fraîcheur, ils sont à 76 à l'heure de jeu, comme en 80 minutes), les
  fautes de situation (`fautesCondense`), le poids des situations favorables
  au porteur (`condense`), et l'occupation au pied hors de ses 22.
- **Tous les réglages sont dans `ia/reglages.ts`** (`REGLAGES_IA`), et se
  mesurent avant d'être touchés.

Mesuré sur 120 matchs de carrière 3D (`npm run mesure:rugby -- 120 carriere3d 2`),
moteur d'origine → IA par poste : **essais 2,9 → 4,4 par match**, points
21,2 → 31,9 (médiane 20 → 31), matchs sans essai 10 → 2 sur 120, pénalités
sifflées 4,7 → 7,3, **cartons jaunes 0,19 → 0,90** (dont 0,43 pour fautes
répétées), **rouges 0 → 0,07** (9 matchs sur 120), ballons perdus au sol
7,8 → 3,3, essais des ailiers 0,15 → 0,68, passes au pied 0 → 1,0, rasants
0,03 → 0,7, par-dessus 0 → 0,3, touches rapides 0,5, durée 14,3 → 15,8 min.
Vue de haut (cadence normale) : essais 1,8 → 2,6. ⚠️ Les essais viennent encore
surtout tôt dans la possession (81 % en première main ou après un ou deux
rucks) : les longues séquences restent le point faible. `horlogeCondensee`
(8 par défaut) allonge le ballon vivant si l'on veut davantage de jeu — à 7,
4,6 essais et 16,8 min ; ce n'est pas activé.

#### Vent, tirs, drops, côtés, en-but (Correctif 12 — IA par poste seulement)

Tout ce qui suit est derrière `iaParPoste(e)` : carrière, aperçu, ligue en
règles 3. Les matchs de ligue en règles 1 et 2 rejouent comme avant.

- **Le vent** (`moteur/vent.ts`) : direction, force (0 à 12 m/s) et graine des
  rafales, fixées au coup d'envoi — trois champs à plat de l'état
  (`ventDirection`, `ventForce`, `ventGraine`). ⚠️ Tirés d'un tirage À PART
  (`graine('vent#' + clé)`) : le poser ne décale aucun tirage du match. Tout le
  reste s'en déduit par des fonctions pures : en ligne, le serveur n'envoie rien
  de plus (ils voyagent dans les scalaires du film) et deux écrans voient le
  même vent. Il pèse dans la chance d'un tir (`malusDuVent` : 8 m/s de travers
  coûtent onze points) et déplace tout coup de pied (`lancerVol`, le seul
  entonnoir) : le botteur corrige le vent MOYEN selon son pied, la rafale et ce
  qu'il a mal lu font le reste. Un rasant y échappe, une chandelle s'y offre.
- **La courbe se voit** : `Vol.derive` (la poussée du vent, qui grandit comme
  le carré du temps) et `Vol.ricochet` (poteau) sont lus par `positionVol`,
  donc par le moteur, la scène et le film d'un même geste.
- **Chaque tir a sa manière** (`viseeTirVariee`) : temps de vol de 1,5 à 3 s
  (sommet de 3 à 11 m) selon le buteur, la distance et le vent de face ; réussi
  au milieu ou à vingt centimètres du montant ; raté de peu, très large, trop
  court, sous la barre ; **poteau rentrant ou sortant**. Le résultat reste
  décidé AVANT : la trajectoire le montre. Banc : `npm run verify:tirs`
  (20 000 tirs variés + matchs avec vent).
- **Le drop** se décide (`ia/jeu.ts`) : trois points qui changent le match,
  avant la pause, défense qui ne cède pas après plusieurs temps de jeu devant
  les 22, se mettre à l'abri en fin de match ; dans l'axe surtout. Il peut être
  **contré**, **mal frappé**, trop court, à côté. ⚠️ Un drop manqué n'est un
  renvoi aux 22 que s'il meurt dans l'en-but : sinon le ballon reste en jeu.
- **Changement de côté** (`cotesInverses`, à la reprise). ⚠️ LE STADE TOURNE,
  PAS LE MATCH : le moteur garde son repère (A attaque vers les x croissants) ;
  le vent y souffle donc dans l'autre sens, et la scène fait faire un demi-tour
  au DÉCOR en calculant sa caméra dans le repère du stade (`inv` dans
  `renderCamera`). Rien de ce qui est relatif au jeu (courses, gestes) n'a à le
  savoir ; bancs, tunnel et touche d'attente d'un exclu sont des lieux du stade
  (`scenographie`, et le retour de prison dans le moteur). ⚠️ La vue de haut
  (2D) ne retourne pas encore le terrain.
- **Reprises d'en-but** (`reprendreApresEnBut`) : qui y a envoyé le ballon ?
  L'attaque (coup de pied, ballon tenu) et la défense le rend mort → **renvoi
  d'en-but**, de la ligne d'essai (`ligneRenvoi`) ; la défense elle-même →
  **mêlée à cinq mètres** pour l'attaque ; tir ou drop manqué mort en-but →
  renvoi aux 22 ; coup d'envoi en ballon mort → mêlée au point du coup de pied.
- **Touche rapide** : lanceur les deux pieds HORS du terrain, partenaire à
  hauteur ou derrière et à plus de cinq mètres ; sinon l'alignement se forme.
  Jouée quand la défense n'est pas revenue et que le partenaire a du champ ;
  rarement près de la ligne adverse pour une équipe d'avants (elle veut son maul).
- **Les cellules partent du ruck** (`placerBloc`) : la pointe s'élance le
  temps qu'il lui faut pour arriver LANCÉE quand le ballon sort, et ne ralentit
  plus une fois qu'il est sorti ; trois profondeurs (courte, standard, profonde).
- **La chenille tient jusqu'à la frappe** (`chenilleTenue`) : le regroupement
  n'est défait qu'au départ du ballon ; la poursuite part à ce moment-là.
- **Deux garde-fous trouvés au banc** : personne ne dépasse 10,9 m/s (les
  efforts se multipliaient jusqu'à 12,7) ; un ballon gratté est joué par le
  voleur s'il est debout dessus, sinon il reste au sol et se ramasse (il était
  donné à l'ouvreur cinq mètres plus loin).
- **Habillage** (`lib/statsTV.ts`, `HabillageTV`) : bandeau du marqueur
  (portrait, poste, numéro et une statistique — « 8 essais en 16 matchs pour
  Toulouse » quand la saison est connue, « 2ᵉ essai aujourd'hui » sinon),
  bulles d'information pendant le jeu (plaquages, ballons grattés, mètres,
  possession des dix dernières minutes, confrontations, séries), pastille du
  vent devant un tir (flèche vue par le buteur). ⚠️ AUCUNE REQUÊTE : tout sort
  de l'état affiché et d'un `ContexteStatsTV` préparé une fois (saison du
  joueur en carrière ; cartes et résultats de la ligue déjà chargés en ligne).
  En ligne, les bulles par joueur du match en cours manquent encore : le film
  ne transporte pas les statistiques individuelles.

Mesuré sur 96 matchs de carrière 3D après ce correctif : 33 points et 4,7
essais par match, 0,66 jaune, 0,04 rouge, 5,9 pénalités, 0,08 drop tenté.
⚠️ `node verifier_destiny.mjs` échoue encore sur un contrôle (un avant au sol
glisse de 2,2 m en une image, à 206 s d'une des trois graines) ; et
`verify:direct-3d` échoue en règles 2 sur les touches (il passe avec `--ia=2`).

#### Le porteur regarde devant lui (Correctif 14 — IA de niveau 3)

`lectureLocale(e)` (`ia` ≥ 3) : matchs de carrière (`IA_MATCH_DE_CARRIERE` = 3),
aperçu, et ligue en **règles 4** (`iaDesRegles`). ⚠️ Les règles 3 sont en
production depuis le 05/10/2026 : rien de ce qui suit ne touche un match de
niveau 2, qui rejoue comme avant.

- **`ia/vision.ts`** (pur, sans tirage) : `regarderDevant` lance trois rayons
  (gauche, axe, droite) et mesure le meilleur INTERVALLE du rideau — largeur une
  fois retiré ce que chaque défenseur referme, profondeur, couverture derrière,
  et s'il est atteignable sans courir en travers ; `lireLeSurnombre` compte, d'un
  côté du porteur, les partenaires qui peuvent vraiment recevoir et les
  défenseurs qui peuvent encore jouer (2 contre 1, 3 contre 2) ;
  `niveauDeLecture` (vision + poste) dit ce que vaut le regard d'un joueur.
- **`deciderALaVue`** (`moteur.ts`, à chaque pas, avant la passe prévue) :
  - *surnombre* → le porteur FIXE (il court sur l'épaule intérieure de son
    défenseur) et ne donne qu'au dernier moment — à 2,2 m plus ce que la vitesse
    de fermeture demande ; le défenseur fixé reste hors jeu 0,7 s ;
  - le défenseur a fait un **choix** au moment où il comprend qu'il est seul
    (`e.duel`) : monter, glisser sur le soutien (surtout près de la touche),
    hésiter une demi-seconde, ou couper la passe ; `conduireLeSurnombre` le lui
    fait jouer, et garde les soutiens à 6,5 m au moins du porteur, un peu en retrait ;
  - s'il est parti sur le soutien et que le porteur l'a VU (`lectureDeLaFeinte`),
    **feinte de passe** (geste `dummy_pass`, construit par la scène) et il repart
    intérieur ; un lecteur moyen donne quand même, au risque de l'interception ;
  - sinon *intervalle* : percée (espace + vitesse + appuis ou puissance −
    couverture) contre passe prévue (champ du receveur + qualité du passeur −
    ligne de passe coupée) ; le plan n'est abandonné que si la percée vaut
    nettement mieux (`margeDuPlan`).
  - ⚠️ Un tirage PAR BALLON REÇU (`e.regard`), pas par pas : sinon le joueur
    change d'avis six fois par seconde. Et il lui faut un temps de lecture,
    d'autant plus long que sa vision est faible.
- **Chaque joueur a ses armes** (`gesteAutomatique`) : crochet, raffut ou sprint
  sont notés contre CE défenseur (appuis, puissance, poids, pointe de vitesse).
- **Après les poteaux** : le point de chute d'un tir suit la portée du buteur
  (de 2,5 à 34 m derrière la ligne, écart type 8 m), puis le ballon rebondit
  (`Vol.rebond`, dans le même vol : ni second coup de pied ni second bruit).
- Réglages : bloc « lecture locale » de `ia/reglages.ts`, avec leurs valeurs
  `*Reel` pour la ligue. Mesuré (96 matchs de carrière, 48 de ligue) : essais
  4,4 par match en carrière (4,7 au niveau 2), 6,8 en ligue (7,1 en règles 3) ;
  10 surnombres joués, 6 intervalles pris et 2 à 3 feintes par match de carrière.
  `mesurerJeux.ts 48 3` : un surnombre finit en essai une fois sur dix, une
  feinte réussie beaucoup plus — c'est elle qu'il faut surveiller.

#### Les commentateurs (`lib/commentaires/`)

Le bouton des commentateurs a trois positions : coupés, **retransmission**,
voix d'origine en anglais (les clips d'avant, inchangés).

- `retransmission.ts` REGARDE l'état du match affiché (carrière : l'état
  vivant ; ligue : l'état rejoué du film, remonté par `AfficheDirect.etat`) et
  sait donc qui a fait quoi : vols, regroupements, ballons grattés, percées,
  conquêtes, tirs (poteau compris), sifflets et cartons, remplacements, fins de
  période. Il produit des `Replique` (voix, texte, priorité).
- Deux voix : le **commentateur** décrit, le **consultant** explique et enchaîne
  parfois (jamais deux fois en moins de neuf secondes), parle seul pendant les
  temps calmes (possession des dix dernières minutes, confrontations, séries).
- Il connaît les joueurs : « 3ᵉ franchissement pour X aujourd'hui », « encore un
  grattage de Y », « 7ᵉ essai de la saison » (`ContexteStatsTV` — aucune requête).
- `phrases.ts` : 73 catégories, 408 phrases en français et 268 en anglais (six à huit par voix dans les grandes catégories — pas encore « plusieurs dizaines »). **L'humour de la cabine** : deux catégories à déclencheur — `plaquageCaramel` (plaquage dominant, six fois sur dix) et `fessesParTerre` (le geste « assis » du défenseur qui perd son duel) — et des variantes « Blague » (`xxxBlague`) tirées une fois sur cinq (`PART_DES_BLAGUES`), jamais sur un carton rouge ni une blessure,
  tirées de sacs qui se vident avant de se remplir. Les autres langues du jeu
  entendent l'anglais.
- `voix.ts` : synthèse vocale de l'appareil (`speechSynthesis`), deux voix
  différentes quand la langue en a deux, sinon deux hauteurs. ⚠️ C'est une
  INTERFACE (`LecteurVoix`) : des voix de studio ou un service en ligne se
  brancheront là. La qualité dépend aujourd'hui de l'appareil ; le sous-titre
  reste quand il n'y a pas de voix.

#### Téléphone : sortie de match, iOS, mémoire

- **Sortir d'un match** (`lib/pleinEcran.ts`, `quitter` dans `MatchLive`) :
  « Terminer » ne fait plus tout à la fois. La scène 3D se démonte d'abord, puis
  l'orientation est rendue, le plein écran quitté, et l'on ATTEND que l'écran
  soit revenu debout avant de changer de page. Un second appui ne fait rien.
- **Mode léger de la scène** (`leger`, téléphones et tablettes) : chargement
  l'un après l'autre, textures du stade ramenées à 1 024 px (elles pèsent
  quatre fois moins), matériaux sans éclairage physique, un seul stade gardé
  en mémoire et rendu à la fin du match, définition 1 sur iOS. La pelouse a un
  vert rayé de secours si sa texture n'a pas pu être lue. Un contexte WebGL
  repris par le système rend la main à l'hôte (`surPerte`), qui revient au
  terrain vu de haut. ⚠️ RIEN DE CELA N'A PU ÊTRE ESSAYÉ SUR UN iPhone.
- **Carrière joueur** (`Carriere.css`, `ResumeMobile`) : sous 700 px la page
  ne défile plus. Un résumé (note, nom, poste, club, statut, trois jauges,
  prochain match, statistiques), les onglets, puis la vue choisie qui défile en
  elle-même ; les pistes d'action tiennent sur une rangée glissante.

Des corrections valent pour **tous** les écrans, parce que ce sont des règles :

- ⚠️ **LE BALLON PASSE OÙ LE SCORE LE DIT** (`viseeTir`, `moteur/trajectoire.ts`).
  Le moteur décidait du résultat d'un tir puis visait un point de chute derrière
  les poteaux : depuis un tee excentré, la droite qui y mène coupait la ligne de
  but jusqu'à six mètres à côté — points comptés, ballon vu dehors. On vise
  maintenant la TRAVERSÉE du plan des poteaux : entre les deux et au-dessus de
  la barre si le tir est réussi ; à gauche, à droite ou trop court sinon. Drops
  compris (un drop « réussi » arrivait sous la barre). Banc : `npm run verify:tirs`
  (20 000 tirs tirés au hasard, puis matchs entiers dans les deux cadences).
- **L'origine d'un coup de pied est une COPIE.** `lancerVol` recevait `auteur.pos`,
  que `deplacer` modifie en place : l'origine du vol suivait le botteur.
- **La touche se joue où le ballon COUPE la ligne** (`pointDeSortie`).
- **Le relayeur** (`designerRelayeur`, `regroupements.ts`) : demi de mêlée plaqué,
  au sol, exclu ou trop loin → le joueur disponible le mieux placé sort le
  ballon. **Pas de chenille sans le vrai 9.**
- **Le receveur d'un lancer long** n'est plus bloqué par les contacts de l'alignement.

Reconstruire : `node scripts/construireMoteur3D.mjs` recompile la passerelle de
l'aperçu et réinstalle le lecteur ; `node installer_apercu.mjs` (depuis
`../analyse-rn26`) réinstalle le lecteur seul. Bancs du lecteur, depuis
`../analyse-rn26` : `node verifier_poses.mjs`, `node verifier_realisme.mjs`,
`node verifier_destiny.mjs` (trois matchs complets, puis un en cadence normale),
`node verifier_duels.mjs` (chaque lecture du contact trouve son animation).
Détail et limites : `../analyse-rn26/SIMULATION.md`.

---

### Le contrôle direct du joueur (Correctif 16 — carrière solo, 3D)

En carrière, le joueur CONDUIT son pion dès qu'il est sur le terrain (les vingt-neuf autres gardent l'IA par poste).
⚠️ C'est le renversement de « on ne bouge plus son joueur » : les cartes de décision restent le mode « cartes » des
Réglages et le repli sans 3D. Séquence : banc → caméra télé → remplacement animé (la scène l'annonce par
`entreeEnCours`) → glissé de caméra derrière le joueur → HUD → main au moteur (`activerDirect`).

- **Trois couches.** `lib/moteur/direct.ts` (le moteur obéit : `e.direct`, commandes en repère TERRAIN, demandes en file,
  `VueDirecte` recalculée à chaque pas, appel du ballon, plaquage manuel à portée, offload armé au contact, compensation
  défensive) ; `lib/controleDirect/` (le PILOTE : clavier, manette, pouce → `Intention`, prise et remise de la main,
  tutoriel, préférences d'appareil dans `localStorage` `destiny-rugby:controle`) ; `components/match/ControleDirect.tsx`
  (le HUD) et `ReglagesControleDirect.tsx` (touches remappables, taille/opacité/gaucher…). `MatchLive` n'en porte que le
  branchement : `pilotage.surImage` AVANT tout retour anticipé de la boucle, cartes tues quand `pilote.voulu`, gel pour la
  pause et la carte d'accueil, tempo ramené à ×1 à l'entrée.
- ⚠️ **Éteint, le moteur rejoue à l'identique** : `npm run mesure:empreinte -- 6` (empreinte globale `94f2ae2e` au commit
  `d29eb36` — elle change dès que les effectifs changent : comparer toujours avec le moteur d'origine du MÊME commit).
  Banc : `npm run verify:controle-direct` (51 contrôles : course, passes, plaquage, pied, appel 98 %/0 %/0 %, matchs entiers, note).
- ⚠️ **Les touches sont des CODES PHYSIQUES** (`KeyW`) : ZQSD (AZERTY) et WASD (QWERTY) sont les mêmes touches ; l'affichage lit la
  lettre gravée (`libelleDeTouche`). Défauts : Maj sprint, Q/E passes (A/E sur AZERTY), V pied (pas Ctrl : Ctrl+W ferme l'onglet),
  F raffut, C crochet, Espace action, R réclamer, G gratter, H aide au placement, P pause. **Échap n'est pas réassignable** : un
  seul écouteur, celui de `useModalDialog` (pause quand on conduit, sortie sinon) ; le pilote l'ignore.
- **Le HUD tactile** : joystick flottant (au-delà de l'anneau : sprint), roue de passe (tapée : courte ; tenue 0,26 s : sautée),
  satellites rangés par poste, glissé sur « Pied » (direction et puissance), balayage = passe. Sur PC, aucun bouton : des
  indications de touches ; à la manette, les symboles Xbox/PlayStation. Chaque geste devient une `Intention` ; le moteur seul
  décide si elle est jouable. La note de match gagne des lignes bornées (`detailNote`, seulement après 90 s de jeu conduit).
- **Tester dans le navigateur** : `/scripts/apercuControleDirect.html?role=banc|titulaire&pilote=1&tuto=0|1&langue=fr` (ou
  `&vue=reglages`). ⚠️ Un panneau de navigateur CACHÉ ne tire plus `requestAnimationFrame` : sans `pilote=1` le match reste figé
  et les captures sont périmées (en prendre une seconde). En développement, `globalThis.__matchLive` donne `{ e, pilotage, scene }`.
- **Pas fait (à reprendre)** : orbite de caméra à la souris (la souris ne vise que le coup de pied) ; vérification fine de
  l'engagement du joueur au ruck (`engagerAuRuck` : à 3-6 m le pion prend `role: 'ruck'` sans figurer dans l'organisation) ;
  essai sur un vrai téléphone, une vraie manette et iOS ; README.md et `../analyse-rn26/SIMULATION.md` ; build complet.

## ⚠️ Équilibrage : ce qui ne se retouche pas sans mesurer

### Difficulté

Étalonné sur 100 carrières de 12 saisons (départ Nationale 2, 18 ans) :
médiane **58**, 90ᵉ centile **80**, maximum **88**, **13 carrières sur 100**
atteignent 80, **3 sur 100** dépassent 85. Le quart inférieur plafonne en
Fédérale.

Le levier est le **talent brut** dans `progression.ts` (marge générale ↔
potentiel). Il est **sélectif** : il ne profite qu'aux joueurs qui ont de la
marge. Un joueur né sans potentiel ne perce toujours pas.

### Anti-triche

`plafonnerDeltas()` fait autorité sur tout ce que propose l'IA : **+2
d'attribut maximum par action**, **budget de 4 points par saison**, rien après
33 ans, argent plafonné au tiers du salaire annuel. `ressembleATriche()` garde
le récit mais ne rapporte rien, avec une entrée « ⚖️ Réalisme ».

Le gros de la progression vient du **terrain**, jamais du dialogue avec l'IA.

### Économie d'Ovas — volontairement dure

Départ 0 · action IA +1 · saison +3 · retraite score/150. Le solde n'apparaît
**que dans la Boutique** : pas de badge de navigation, pas de « +X » dans le
journal. Ne pas ré-augmenter les gains sans demande.

### Économie des clubs

`financesDuClub` (`lib/economie.ts`) est **la seule** formule. Elle sort trois
enveloppes : transferts, salariale, structure.

⚠️ **L'enveloppe structure n'a qu'un seul point d'accès :
`budgetsDuClub(club, saison).structure`** (`lib/recrutementManager.ts`).
L'écran comme le store lisent celui-là. Un raccourci `budgetStructure(force,
niveau)` a existé dans `installations.ts` : l'écran l'appelait, le store
appelait `budgetsDuClub`, et **5 étages sur 8 divergeaient** — en Nationale,
125 000 € affichés contre 315 000 € facturés, donc un bouton « Améliorer » qui
s'allumait et un clic sans effet. **Ne pas rouvrir ce raccourci.**
Banc : `npm run verify:enveloppe`.

L'enveloppe structure **se banque intégralement** d'une saison à l'autre.
Les prix sont fixes : **40 000 / 250 000 / 1 200 000 / 5 000 000 €** par
palier et par structure. `coutAmelioration(niveau)` ne prend aucun budget.

**Trésorerie** remplace Match dans les onglets ; Calendrier et Club gardent
l'accès aux rencontres. `situationSalariale` fait autorité pour le plafond,
la masse engagée et la marge. Le plafond ne se débite jamais à la signature.
Le salaire signé remplace le barème de la recrue jusqu'à la fin du contrat.
`tresorerieManager.ts` partage les reports entre l'écran et la clôture :
28 % du recrutement restant, 20 % de la marge salariale libre, 100 % des structures.

Les objectifs sont mesurés par `objectifsManager.ts`, à l'écran et au bilan.
Le store renouvelle les priorités **après** la division, le budget et l'effectif
de la saison suivante. Le dernier bilan reste dans `dernierBilanObjectifs`.
Bancs : `verify:tresorerie`, `verify:structures`, `verify:enveloppe`.

La santé longue vit dans `EtatCarriereAvancee` : `profilsMedicaux` conserve
fragilités, historique, commotions et séquelles ; `medical` conserve les
épisodes et leurs phases suspicion → diagnostic → guérison → reprise. Ne pas
ramener la disponibilité médicale à `semaines > 0` : la guérison à 100 % ne
rend pas la condition ni le rythme. `chargeEntrainement` alimente le risque par
activité et par poste. Le protocole commotion refuse le retour forcé.

**La disponibilité se COMPTE, elle ne se reconstitue pas.**
`ProfilMedicalJoueur.disponibilites` porte une ligne par saison (matchs
possibles, disponibles, titularisations, semaines et jours d'absence),
incrémentée dans `traiterMedicalApresMatch` et dans l'avance hebdomadaire.
La relire après coup à partir des dossiers médicaux donnerait un chiffre faux :
une absence pour sélection, un dossier clos ou une arrivée en cours de saison
n'ont pas la même base. `disponibiliteJoueur(profil, saison, n)` agrège.

Les contrats de l'effectif vivent dans `contratsJoueurs`. Une signature interne
doit passer par `ouvrirRenegociationJoueur` puis `signerRenegociationJoueur` ;
elle remplace le salaire courant dans `situationSalariale`. Les négociations
externes conservent l'ordre club vendeur → joueur et portent les bonus et la
part à la revente dans `RecrueManager.accordClub`.

`moisRestantsContrat` / `palierContrat` sont **la seule** définition des paliers
de fin de contrat (serein / discussions 18 / réflexion 12 / danger 6 / libre) :
l'écran, la pression du marché et l'appétit des prétendants lisent celles-là.
`ContratJoueurAvance.attachement` (0-100) n'est pas la satisfaction — c'est le
lien construit avec CE club (ancienneté, formation, matchs, brassard, titres,
personnalité). Il tempère la demande salariale et décide de la réaction à un
refus. Ne pas le confondre avec la motivation `attachement`, qui n'est qu'une
préférence déclarée.

`lib/approchesClubs.ts` porte les **approches reçues** : un club vient chercher
un joueur qu'on n'a PAS mis en vente. C'est l'inverse de `NegociationClubManager`
— ici l'acheteur monte vers un **plafond caché** borné par son enveloppe réelle
(`budgetsDuClub`), et son besoin, ses alternatives et son urgence sont lus dans
son effectif, jamais tirés au sort. Les fenêtres (`FENETRES_APPROCHE`) ne
s'ouvrent qu'à partir de la 16ᵉ semaine, l'avance rapide s'arrête dessus
(`arret: 'approche'`), et une approche expire au bout de 4 semaines **ou au
changement de saison** — sans quoi un dossier oublié bloquerait le marché pour
toute la carrière. Refuser coûte toujours quelque chose : `reactionAuRefus`
décide entre « il comprend » et une demande de départ officielle.

Banc : `npm run verify:sante-contrats` (30 contrôles, dont la mesure « une
stratégie mixte conclut 16/17, la gourmandise pure 9/17 »).

---

## ⚠️ Pièges structurels

- **`createPortal(document.body)` est obligatoire** pour toute modale. Le
  `backdrop-filter` des `.carte` crée un bloc conteneur qui piège les
  `position: fixed`. Et **jamais `window.confirm()`** — utiliser
  `components/Confirmation.tsx`.
- **Jamais de `<select>` natif.** Son menu est rendu par l'OS : ni drapeau, ni
  style. Utiliser `components/Selecteur.tsx`.
- **`overflow:hidden` annule la taille minimale automatique d'un élément.**
  Dans une grille à hauteur bornée, ses rangées `auto` n'ont plus de plancher
  et s'écrasent au lieu de défiler. C'était le bug de l'écran Recruteurs :
  8 dossiers de 439 px rendus dans des rangées de 112 px, `scrollHeight ===
  clientHeight` (donc pas de barre de défilement non plus) et les boutons
  d'action hors du cadre. **Un conteneur de défilement en grille veut
  `align-content:start` et `grid-auto-rows:min-content`.**
- **Performances Firefox** : `backdrop-filter: none` sur `.bloc-competition` et
  `.overlay-trophee` — le flou recalculé sur toute la hauteur était LA cause
  des ralentissements. `content-visibility: auto` pour l'atlas des 655 cartes.
- **L'ordre des tirages `rng()` de `effectifDuClub` est figé** (prénom, nom,
  âge, retraite, talent, nation). Le changer casse le « peek » de `cumulDebut`.
- **`setMouvementsClubs` doit être écrit dans l'état**, pas seulement dans le
  registre de `divisions.ts` : celui-ci vit en mémoire et disparaît au
  rechargement. Sans ça, un club promu redescend au premier F5.
- **Les trophées et l'histoire se calculent AVANT `setMouvementsClubs`.**
- **`Trophee.individuel` est LE champ qui range un trophée** : il commande sa
  place dans l'armoire ET la façon dont on le gagne.
- **Draco** : `useGLTF(url, true)` charge le décodeur depuis un CDN Google.
- **UN ONGLET OUVERT AVANT UN DÉPLOIEMENT RÉCLAME DES MORCEAUX QUI N'EXISTENT
  PLUS.** Signalé en jeu : « Failed to fetch dynamically imported module :
  /assets/Hero3D-hyV7P-g2.js ». Les écrans sont chargés à la demande et chaque
  morceau porte l'empreinte de son contenu dans son nom ; un nouveau build les
  renomme tous. La page ouverte tient encore l'ANCIENNE liste, celle que son
  `index.html` lui a donnée — et elle ne s'en aperçoit qu'au moment d'aller
  chercher un morceau qu'elle n'a pas encore. **Revenir à l'accueil n'y change
  rien** : la liste est la même. Seul un rechargement relit `index.html`
  (`max-age=0, must-revalidate`) et récupère la nouvelle.
  `lib/moduleObsolete.ts` reconnaît l'erreur (trois formulations selon le
  navigateur, il n'existe pas de code) et recharge — depuis `Garde`
  (`componentDidCatch`), depuis `main.tsx` avant même que React existe, et sur
  les rejets non rattrapés des préchargements.
  ⚠️ **UNE SEULE FOIS PAR RÉPIT (30 s).** Si le fichier est réellement absent du
  déploiement, recharger à chaque erreur enferme le joueur dans une boucle où il
  ne peut même plus lire le message. Mesuré dans le navigateur : première erreur
  → `navigation.type === 'reload'`, seconde erreur dans le répit → la page reste
  et l'écran d'erreur s'affiche.
- **RIEN NE DÉFEND `public/`, IL FAUT DONC LE MESURER.** Le 7 septembre 2026,
  un commit de 3 117 fichiers appelé « fix » (`906590a`) a emporté **439
  binaires** au passage : **71 `.glb`**, `og.png`, `ads.txt`, 106 logos sources.
  Ni le build (Vite ne LIT pas `public/`, il le recopie), ni le typage (une URL
  est une chaîne), ni le lint n'ont bronché. La panne s'est vue **en
  production**, sur un téléphone, en ouvrant un trophée : « Could not load
  /m3d/six-nations.glb : responded with 404 ». Tout a été repris de `906590a~1`
  (`git checkout 906590a~1 -- <chemins>`), octet pour octet.
  ⚠️ **Un binaire absent ne se regénère pas, il se retrouve** : les `.glb`
  bruts ne sont plus dans le dépôt, `copierTrophees.cjs` n'aurait rien eu à
  recompresser. Le réflexe est `git log --all --diff-filter=D --name-only --
  public/<chemin>`. Garde : `npm run verify:assets` relit les 6 212 chemins
  écrits en dur dans `src/` et `index.html` — commentaires retirés, sinon il
  réclamait le retour d'une silhouette supprimée exprès.
- **UN PORTRAIT SE RAPATRIE, IL NE SE POINTE PAS.** `rugby_players.json`
  (Japan League One D1/D2/D3, Super Rugby Pacific) ne donne que des URL
  distantes : `npm run data:photos-monde` les télécharge, les redimensionne à
  600 px et les range dans `public/photos/monde/` (1 830 portraits, 72 Mo).
  Le jeu doit rester entier hors ligne — c'est la règle qui a fait supprimer
  `randomuser.me`. Puis `node scripts/detourerPhotos.cjs` retire le fond de
  studio : il part des BORDS, suit le dégradé du mur, s'arrête au premier
  contour, et **ne réécrit rien quand il n'est pas sûr**. Son seuil doux
  (34) ne se remonte pas : à 62, il entrait par une joue claire et laissait un
  trou dans le visage.
  ⚠️ **ET LE VRAI DANGER EST DE TROUER LE JOUEUR, PAS D'EN LAISSER.** Signalé en
  jeu (« beaucoup ne sont pas détourées, Ioane par exemple ») : forcer les
  récalcitrantes en a détruit une sur deux. Rieko Ioane, bras levés sur fond
  blanc, est ressorti troué — la propagation était entrée par le blanc du
  lettrage « Bank of Ireland » ; Eddie Swart, maillot BLANC des Sharks, en trim
  gris sur un torse transparent. **Aucun garde-fou ne les voyait** : fond
  uniforme, haut du cadre nettoyé, part retirée entre 3 % et 92 %. Le critère qui
  les sépare est **OÙ le fond est parti** — sur chaque ligne, entre le premier et
  le dernier pixel du joueur, un détourage propre ne retire que **0 à 3,2 %**
  (mesuré sur Osborne, Smith, Aki, Kolisi, Clarkson) quand les deux abîmés
  montent à **29 %** et **44 %**. `PART_INTERIEURE_MAXIMALE = 0.12` tranche entre
  les deux groupes et laisse passer les bras écartés.
- **UNE PHOTO DE JOUEUR N'EST PAS FORCÉMENT UN JOUEUR.** Le site source rend une
  silhouette grise « portrait indisponible » : elle a été aspirée 181 fois sous
  181 noms, indexée comme un vrai portrait, et gagnait donc contre le vrai
  visage rangé ailleurs. Elle se reconnaît à son empreinte md5, jamais à son
  nom. Un seul exemplaire subsiste, `public/photos/silhouette.webp`, qui sert de
  repli aux cartes. Ménage : `node scripts/nettoyerPhotos.cjs` puis
  `node scripts/copierPhotosJoueurs.cjs`. Banc : `npm run verify:photos`.
- **Les noms de fichiers de portraits ne concordent pas avec la base** (nom
  composé tronqué, lettre accentuée mangée, apostrophe recollée) :
  `lib/avatars.ts` essaie sept écritures, chacune refusée si elle désigne deux
  portraits. **Ne pas rouvrir la piste du nom de famille SEUL** — mesuré, elle
  rattrapait 5 joueurs du Top 14 et en trompait 14.
- **Un `translateZ` négatif rend un élément incliquable** sous
  `transform-style: preserve-3d` : il est dessiné derrière le fond de son
  parent, et le test de survol suit le dessin. C'était le cas des cartes
  latérales de `RoueCartes.tsx` — le relief se fabrique en avançant la carte de
  devant, jamais en reculant les autres.

---

## Bancs de mesure

**89 scripts** dans `scripts/verif*.ts`, à lancer sans navigateur. Les
principaux sont déclarés dans `package.json` :

```bash
npm run verify:carriere           # la Carrière en ligne (208 contrôles, ~3 min)
npm run verify:ligue              # ⚠️ le socle du 1er lot — plus branché au jeu
npm run verify:enveloppe          # une seule définition de l'enveloppe structure
npm run verify:saison-manager     # avance libre, coupes, playoffs, promotions
npm run verify:calendrier-mondial # le calendrier des sélections
npm run verify:carriere-avancee   # 13 contrôles + poids de l'état
npm run verify:carriere-profonde  # 24 contrôles
npm run verify:formation-manager
npm run verify:distances-transferts
npm run verify:photos             # portraits des cartes : liens morts, silhouettes, Top 14
npm run verify:assets             # tout chemin /m3d /logos /photos écrit en dur existe vraiment
npm run verify:triche             # 40 tentatives de triche, toutes refusées
npm run verify:cartes-speciales   # ICONS, Halloween, Labo, imports (292 contrôles, ~2 min)

npx vite-node scripts/verif.ts    # banc général : divisions, effectifs, 8 saisons
```

Le rugby que produit le moteur (essais, pénalités, cartons, mêlées, touches,
turnovers, jeu au pied par type, cassures, offloads, qui porte et qui marque) :

```bash
npm run mesure:rugby -- 120 carriere3d 2      # matchs, modes (carriere3d, carriere2d, fond, ligue), niveau d'IA
npm run mesure:rugby -- 72 ligue 2            # la ligue en règles 3 (temps réel) ; --resserrement=1.2 pour essayer
npm run mesure:conso-direct -- 10 --minutes=80   # ce qu'un direct coûte : SQL, octets, calcul (10,50,100,300 --minutes=4)
npm run verify:ecriture-direct                # écritures du direct, présence par sondage, parties lentes
npm run mesure:rugby -- 72 carriere3d 2 --reglages=condense:1.5,retardRapide:2.4   # essayer un réglage
npx vite-node scripts/mesurerJeux.ts 96 2     # ce que rapporte chaque jeu, d'où partent les essais
```

⚠️ **Aucun réglage de `ia/reglages.ts` ne se touche sans ces deux relevés**,
avant et après. Il faut au moins 72 matchs : l'écart type est de deux essais
par match, douze matchs ne distinguent rien.

⚠️ **`verifDifficulte.ts` et `verifHonneurs.ts` mesurent des saisons sans
match** — ne pas s'en servir pour retoucher la difficulté tant qu'ils n'ont pas
été réparés.

---

## Checklist avant de livrer

1. `npm run build` (0 erreur TS) et `npm run lint` (propre).
2. **Test navigateur desktop + mobile** sur le parcours touché.
3. Le banc de mesure de la zone concernée.
4. Mise à jour de `README.md` et de ce fichier si le comportement change.

---

## Chantiers en cours / dette

- **LA CARRIÈRE EN LIGNE — en production, il reste `CRON_SECRET`.**
  2 à 20 potes, ligue privée, **30 vrais licenciés de Régionale 3** au départ,
  **inscriptions ouvertes jusqu'à la première journée** (l'arrivant entre dans le
  championnat en cours et le calendrier est retiré au sort avec lui),
  écusson d’un vrai club (choisi À L’INSCRIPTION, jamais modifiable ensuite),
  logo et trophée de championnat, phase finale en option,
  championnat, **matchs en direct à la vitesse réelle** (80 minutes de vraie
  vie, terrain animé à 60 images par seconde par interpolation bornée : les
  passes manquées entre deux relevés sont reconstruites, le ballon ne change
  jamais de porteur à mi-image et les tangentes ne font plus boucler les joueurs,
  couche `scenarioDirect.ts` séparée du moteur — type de lancement, zone,
  couloir, intensité et cadrage automatique, sans séquence vidéo —,
  contacts physiques selon le gabarit et séparation des trajectoires,
  chutes couplées au plaquage, rebonds ovales avec hauteur et rotation partagées
  entre les rendus solo et direct ; banc `scripts/verifierContactsEtRebonds.ts`,
  décision de pénalité dans les 50 mètres adverses, consignes et remplacements
  qui atteignent le moteur), packs, marché, enchères, échanges, coupes maison,
  objectifs, palmarès. Serveur (`serveur/carriereApi.ts` + `api/carriere.ts`),
  écran (`screens/CarriereEnLigne.tsx`) et banc (`npm run verify:carriere`,
  208 contrôles, plus `npm run verify:fluidite-direct`). Les 19 tables sont posées sur la base Neon du site (mesuré le
  6 septembre 2026 : inscription en production → HTTP 200). Marche à suivre
  complète dans `serveur/MISE-EN-LIGNE.md`.

  **Transferts bornés** : relevé direct toutes les 2 s, interpolation avec
  2,4 s de tampon ; ligue toutes les 20 s puis 60 s après six vues identiques,
  salon public toutes les 15 s. Pas de sondage ni de présence en arrière-plan ;
  présence toutes les 25 s, aucune requête concurrente et reprise espacée après
  erreur. Réveil durable toutes les 60 s, entretenu par la file et les changements
  persistés, jamais par un simple GET sans changement. La collection et les échanges
  partagent leur catalogue à 60 s ; sauvegardes du coffre regroupées, comparaison
  avant écriture et réception d'un trade sans POST en retour. Après le chargement
  initial, le coffre envoie des **deltas** : seuls les cartes, compteurs et champs
  modifiés traversent le réseau. UPDATE atomique dans Neon, accusé compact,
  révision d'échange préservée ; pause entre envois et reprise espacée après erreur.
  Les anciens clients gardent la sauvegarde complète : un onglet déjà ouvert doit
  être rechargé pour recevoir le nouveau code. Les POST annoncent leur action
  dans l'URL ; les envois de plus de 100 Ko sont journalisés sans données de compte.
  La base filtre les propositions avant transfert. Bancs :
  `scripts/verifierSynchronisationCompte.ts`, `scripts/verifierTransfertBoutique.ts` ;
  aperçu desktop/mobile `scripts/apercuTraficCollection.html` et diagnostic en
  lecture seule `scripts/diagnostiquerTraficBoutique.mjs`.

  ⚠️ **CE QU'UN DIRECT DEMANDE À LA BASE (Correctif 11).** Mesuré par
  `npm run mesure:conso-direct` (le vrai gestionnaire HTTP devant une base en
  mémoire qui compte chaque requête SQL, heure simulée), pour UN match de 80
  minutes regardé par ses deux managers : **16 680 requêtes → 1 959**
  (SELECT 15 833 → 1 545, UPDATE 438 → 73, INSERT 409 → 341), écritures de
  l'état entier 113 → 41, octets envoyés aux écrans 253 Mo → 49 Mo (33 → 10
  compressés). À 50, 100 et 300 matchs simultanés sur une instance : 1 045
  requêtes par match et par tranche de 4 minutes → 96 ; à 300, le calcul passe
  de 30 ms à 2,7 ms par requête HTTP. Ce qui coûtait :
  1. **Trois SELECT par sondage et par écran** (révision du catalogue, en-tête,
     présences). La révision n'est relue que toutes les 30 s (`avecAtelier`,
     et tout de suite si une ligue en montre une plus récente :
     `exigerCatalogue`) ; l'en-tête et les présences arrivent ENSEMBLE
     (`sondageDirect`), une fois toutes les 3 s et par LIGUE — un écran de plus
     ne coûte rien.
  2. **Le gel d'une décision réécrivait la ligue à chaque tick** (`gelDerive`) :
     66 écritures de l'état entier par match. Le gel se recalcule de l'heure.
  3. **Le battement de présence** (un POST toutes les 25 s, quatre requêtes
     SQL) : le sondage du direct vaut présence (`noterPresenceDirecte`, un
     rappel en base toutes les 30 s) ; l'écran ne l'envoie plus quand le
     serveur l'acquitte (`presence: true`).
  4. **32 ligues en cache, c'était la falaise** : au-delà, chaque sondage
     relisait l'état ENTIER (18 Mo par match en 4 minutes à 50 ligues). 384
     ligues et 160 Mio ; cache des moteurs 96 → 256 Mio (à 300 matchs regardés
     ils en sortaient et chaque sondage rejouait son match du coup d'envoi).
  5. **Le fil et les temps forts repartaient entiers toutes les 2 s** (33 Ko en
     fin de match) : l'écran annonce ses repères (`&r=`), le serveur ne renvoie
     que ce qui a changé, et pour le fil les seules lignes nouvelles
     (`allegerDirect`, `completerMatch`). Un écran d'avant reçoit tout.
  6. Deux sérialisations de la ligue par tick pour savoir s'il fallait écrire
     (`memeEtatDurable` les remplace, sans rien sérialiser), une troisième pour
     la peser, et `vu_le` réécrit chaque minute (dix minutes suffisent).
  ⚠️ Le nombre de requêtes n'avait PAS changé avec le film 3D : le « deux fois
  plus » ne se retrouve pas en base ; le calcul des règles 2 coûte environ 20 %
  de plus que celui des règles 1. Banc de non-régression :
  `npm run verify:ecriture-direct`. ⚠️ La requête groupée n'a pas pu être
  essayée sur la vraie base : à la moindre erreur l'instance revient aux deux
  lectures séparées (`sondageGroupeIndisponible`).

  ⚠️ **`DATABASE_URL` NE DÉSIGNE QU'UNE BASE, ET UN PROJET PEUT EN AVOIR
  PLUSIEURS.** Le piège a coûté une soirée : les tables créées dans la base
  fraîchement ajoutée, le site — qui lit l'autre — répondant toujours « base
  non initialisée ». Le repère qui tranche est `select count(*) from
  classement` : `api/classement.ts` et `api/carriere.ts` lisent le MÊME
  `process.env.DATABASE_URL`, donc là où il y a des scores, il y a la bonne
  base. Ici c'est `ep-wispy-wildflower-…` (`classement` : 444 lignes).

  ⚠️ **La console SQL de Vercel refuse un script à plusieurs instructions**
  (« cannot insert multiple commands into a prepared statement » : le pilote
  HTTP de Neon passe par des prepared statements). `npm run base:appliquer`
  découpe les schémas et les envoie une par une, après avoir montré la base
  visée. La console de Neon, elle, accepte les scripts entiers.

  En local, `vite.config.ts` branche le même gestionnaire sur un
  fichier JSON, donc le mode se teste entièrement sans base.

  ⚠️ **CE MODE SE PAIE AU TRANSFERT, PAS AU CALCUL.** Le quota Neon (5 Go/mois)
  a été épuisé en huit jours — **6,1 Go**, la base refusant ensuite jusqu'au
  `select 1` (HTTP 402). Aucun bug : l'écran sonde toutes les 10 s (2 s en
  direct), et **chaque sondage relisait ET réécrivait l'état complet** de la
  ligue — 300 à 400 Ko à huit clubs. `avancerCarriere` incrémente `version` à
  CHAQUE appel, même sans rien à faire : une simple lecture renvoyait donc tout
  l'état vers la base. Un onglet ouvert = ~100 Mo/h ; l'écran « Mes ligues »
  faisait pire, `select *` sur TOUTES les ligues du compte pour en afficher sept
  champs. Quatre corrections, mesurées à 15 sondages sur 60 s : **1 réponse
  complète (57 Ko) et 14 à 17 octets.**
  1. `appliquer` **n'écrit plus un état identique** (comparaison JSON, version
     neutralisée) — et la version cesse donc de bouger toute seule, ce qui rend
     le reste possible. ⚠️ La comparaison passe par `empreinteEcriture`, qui
     **retire du calcul l'horloge, le score, le fil et les statistiques d'un
     match en cours** : ces six champs se reconstruisent de la graine et du
     journal, et sans ce retrait un direct réécrivait la ligue entière toutes
     les deux secondes pendant quatre-vingts minutes. La lecture rend l'état
     AVANCÉ (sinon le match ne bouge plus) mais garde la version STOCKÉE.
  2. **Lecture conditionnelle** : le client annonce sa version (`&v=`), le
     serveur lit `version, comptes, echeance` (quelques octets) et répond
     `{inchange:true}` sans toucher au jsonb. Sans `v`, comportement d'avant.
  3. `ligues(compte)` **projette en SQL** (`jsonb_array_elements`) au lieu de
     rapatrier les états ; `nombreLigues` compte au lieu de lister.
  4. L'écran **ne sonde plus quand l'onglet est caché** et passe à 30 s après
     une minute sans changement. Le direct (2 s) et l'approche d'un match
     (10 s) ne bougent pas.
  ⚠️ **UNE MIGRATION ET UN DÉPLOIEMENT NE SONT JAMAIS SIMULTANÉS**, et ça s'est
  payé cash : le code qui écrit `echeance` est parti en production avant
  l'`alter table`. Toutes les écritures de la carrière échouaient (`42703`), et
  l'écran annonçait « la base n'est pas encore initialisée » **alors que les
  ligues s'affichaient juste au-dessus**. Toute requête qui touche une colonne
  récente passe donc par `sansColonne()` dans `carriereStockage.ts` : on tente la
  version complète, et sur `42703` on retombe sur celle d'avant. Le jeu perd
  l'optimisation, jamais la partie — même cascade que `api/classement.ts` entre
  ses schémas v3/v2/v1. **Écrire le repli AVANT de déployer, pas après.**
  ⚠️ **L'ÉCHÉANCE EST LA PIÈCE QUI PEUT FIGER LA LIGUE**
  (`lib/ligue/echeanceCarriere.ts`). Répondre « inchangé » saute
  `avancerInterne` : si l'échéance était trop LOINTAINE, un match ne partirait
  plus. Elle est donc calculée **bêtement exprès** — la plus petite date future
  trouvée N'IMPORTE OÙ dans l'état, plus le prochain minuit (les packs
  quotidiens ne dépendent d'aucune date écrite). Énumérer les échéances une par
  une serait un catalogue à tenir : le jour où quelqu'un ajoute une règle datée
  en l'oubliant, la ligue se fige. Ici, au pire, on relit trop tôt.
  Banc : `verify:carriere`, section 14. Colonne : `carriere_ligues.echeance`
  (migration additive dans `serveur/schema-carriere.sql`).

  Les comptes peuvent aussi passer par **Google Identity Services** : le
  navigateur ne transmet au serveur que le billet d’identité, vérifié avec
  `google-auth-library` et `GOOGLE_CLIENT_ID`, puis reçoit le même cookie
  HttpOnly que la connexion classique. Les salons partent automatiquement à
  48 h dès qu’ils ont deux clubs. Le créateur peut supprimer sa ligue ; le cron
  quotidien supprime celles dont aucun membre n’a été vu depuis quatorze jours.
  Le même cookie donne accès à `compte_boutique`, coffre JSON validé qui
  synchronise les Ovas solo, la collection et les achats cosmétiques. Il ne
  contient jamais les Ovas ni les cartes d’une ligue.

  ⚠️ **LE COLLECTIF A UNE SEULE FORMULE**, dans `lib/ligue/collectifCarriere.ts` :
  l'écran de composition et `lancerRencontre` appellent la MÊME fonction. Deux
  formules donneraient un jour deux vérités — un manager qui compose pour 78 et
  une équipe qui entre sur le terrain avec autre chose. **On compte des GROUPES,
  pas des paires** : un joueur regarde combien de titulaires il retrouve pour
  chaque affinité (club réel, nation, championnat), garde la MEILLEURE des
  trois, et les paliers font le reste — club 2 → 5, 3 → 8, **4 → 10**, nation et
  championnat 4 → 4, 6 → 6, 8 → 8, 11 → 10. Mesuré : même club 100, même nation
  (quinze clubs différents) 100, même championnat 100, rien en commun 11, et
  quatre joueurs d’un même club posés dans ce XV dépareillé valent 10 sur 10
  chacun. **Deux pesées ratées avant celle-là** : la première donnait 72/100 à
  la dotation de départ et 88 à un XV construit (échelle plate) ; la seconde,
  qui pesait l’unité quatre fois plus, tombait à 43 pour la dotation et 1 pour
  un XV dépareillé — refusée en jeu, « trop sévère ».
  ⚠️ **LE BANC N’EST PAS DANS `parCarte`**, et une absence n’est PAS un zéro :
  zéro point vaut −1 de note. `lancerRencontre` teste donc la présence de
  l’entrée avant d’appeler `bonusCollectif`, sans quoi un remplaçant entrerait
  à la 60ᵉ minute avec une note rabotée pour n’avoir pas été aligné.

  ⚠️ **ET IL SE JOUE AUSSI ENTRE ÉQUIPIERS, PAS SEULEMENT DANS LES NOTES.**
  Demande : « il faut que le collectif compte dans l’influence du jeu aussi sur
  les erreurs entre équipiers ». Le total d’équipe part donc entier au moteur
  (`EtatMatch.cohesion`, gelé avec la feuille) et `erreurDeLiaison` en fait ce
  qu’une note ne peut pas dire : une passe qui part devant, un ballon lâché à la
  réception, un offload donné dans le vide. **Rien d’autre** — la vitesse, le
  plaquage et le pied d’un joueur ne doivent rien à ses voisins. Amplitude
  ±30 % sur des risques qui valent quelques pour cent ; mesuré à 12 matchs par
  palier : **23,2 en-avants à 0 de collectif, 18,7 à 50, 14,8 à 100**, et un
  match SANS collectif joue exactement comme à 50 — la carrière solo ne bouge
  pas d’un tick. Le mode distribue des cartes au hasard : on ne punit pas un
  manager pour ce que les packs lui ont donné.

  ⚠️ **LE FAVORI N'EST PAS UN VERROU.** `carte.favori` (commande `favori`, côté
  serveur) n'interdit AUCUNE vente : il retire seulement la carte de
  « Tout cocher » dans l'effectif — le geste qui en sélectionne cinquante d'un
  coup et où personne ne relit la liste. En faire un verrou créerait une
  deuxième règle de départ à côté de `verifierHorsFeuille`, et les deux
  finiraient par diverger. Il **tombe au transfert** (`transferer`) : c'est la
  marque d'UN manager sur SON effectif, pas une propriété de la carte. Banc :
  `verify:carriere`, section 13.

  ⚠️ **UN JOUEUR SUR LA FEUILLE DE MATCH NE PART PAS.** `verifierHorsFeuille`
  refuse la vente, la vente rapide et l'échange d'un titulaire ou d'un
  remplaçant, à la proposition pour ses propres cartes et à l'acceptation pour
  celles d'en face. `ajusterComposition` ne rattrape que les départs SUBIS
  (blessure, carte achetée, enchère perdue). La vente rapide accepte un lot
  (`venteRapideGroupee`) : le plancher d'effectif se vérifie sur TOUS les
  sortants d'un coup, jamais carte par carte.

  ⚠️ **CE QUI PROTÈGE DU TRICHEUR, ET CE QUI N'Y SERT À RIEN.** Tout ce que le
  navigateur envoie est fabricable à la main : la seule question est ce que le
  SERVEUR accepte. Ce qui protège tient en trois lignes — le serveur RECALCULE
  (score du classement, résultat d'un match rejoué depuis sa graine), il BORNE
  (`entier()` plafonne à 1 000 000, `verifierFiche` croise chaque champ avec
  les autres) et il VÉRIFIE LA PROPRIÉTÉ (une carte, un objectif, un pack
  quotidien appartiennent à un club). Le débit et l'obscurité ne protègent
  rien. **`npm run verify:triche` tient quarante tentatives de triche fermées**
  — s'en donner des Ovas, s'ouvrir des packs, jouer à la place d'un autre,
  rembobiner l'horloge, faire sortir la graine des tirages.

  ⚠️ **UNE CLÉ D’ÉCRITURE NE SE DÉDUIT JAMAIS D’UNE DONNÉE PUBLIQUE.** Le
  classement mondial identifiait sa ligne par `v1:<pseudo>` quand le client
  n'envoyait pas de clé : il suffisait de poster une fiche valide au nom d'un
  autre pour réécrire SA ligne. Le repli est maintenant l'empreinte salée de
  l'appareil, qui ne sort jamais du serveur (`api/classement.ts`).

  ⚠️ **DEUX RISQUES RESTENT OUVERTS, ET C’EST ASSUMÉ.** Une ligue entre potes
  ne peut pas empêcher qu'on s'y inscrive deux fois pour se transférer ses
  propres cartes — c’est une ligue privée, on choisit ses amis. Et la carrière
  SOLO vit dans le navigateur : elle est modifiable, par construction. Elle ne
  donne rien à personne d’autre — le classement mondial recalcule tout ce
  qu’elle prétend.

  Les quatre invariants, en une ligne chacun — ils commandent tout le reste :
  1. **Le serveur est la source de vérité.** Le client DEMANDE une action, il ne
     DÉCLARE jamais un état. Ça se vérifie à l'œil : l'écran n'a pas un seul
     `useState` qui contienne un OVA, une carte ou un score.
  2. **Un joueur n'existe qu'une fois par ligue** — le tirage de pack exclut
     tous les `sourceId` déjà possédés dans CETTE ligue.
  3. **Rien ne traverse d'une ligue à l'autre**, ni Ovas ni carte. Pas de
     portefeuille global.
  4. **Aucun Ovas ne s'achète en argent réel.** ⚠️ Et les **Ovas** d'une ligue
     (`club.ovas`) ne sont PAS les **Ovas** de la Boutique solo (`joueur.ovas`).
     Depuis le renommage demandé, elles portent le MÊME nom et ne se distinguent
     plus que par leur porteur : redoubler d'attention dans tout code qui
     toucherait aux deux. Deux monnaies, aucun pont, jamais.

  **Trois choses qui ne se retouchent pas sans relire `serveur/LIGUES.md` :**
  - **Le vivier ne se matérialise jamais.** 78 083 joueurs, 26,6 Mo de JSON ; une
    ligue est une ligne de jsonb réécrite toutes les deux secondes en direct.
    Une carte n'existe qu'une fois DISTRIBUÉE ; le reste se déduit.
  - **Un match n'est pas stocké, il est rejoué** depuis sa graine, ses deux
    feuilles gelées et le journal des ordres. C'est ce qui fait que deux
    managers voient rigoureusement le même match. ⚠️ Le pas de rejoue reste à
    **0,6 seconde** : un pas plus large rate la phase « pénalité » (2,5 s) et
    surtout dépasse la minute demandée, donc applique un ordre au mauvais tick.
    Il n'y a rien à y gagner — mesuré 267 ms à 8 s contre 285 ms à 0,6 s.
  - **Presque la moitié des écussons du jeu ont un fond blanc opaque** (mesuré :
    46 sur 108). Un filtre CSS ne peut pas l’enlever sans trouer les blancs
    INTÉRIEURS ; le détourage part des bords (`components/EcussonClub.tsx`).
    Les 599 écussons distants (API FFR, pas de CORS) passent par un relais
    serveur à LISTE BLANCHE FERMÉE — jamais un proxy ouvert.
  - **Les archives s'élaguent.** Le détail (fil + feuille de match, 15 Ko) n'est
    gardé que pour les **vingt dernières** rencontres ; les statistiques
    individuelles sont créditées aux cartes avant l'élagage.

- **Le mode entraîneur est public** : création directe et reconversion sont
  ouvertes en production. `lib/modeDev.ts` conserve le garde central pour de
  futurs modules réellement inachevés.
- **La carrière joueur reste française** à la création ; l'étranger s'atteint
  ensuite par le marché. Les championnats du monde sont surtout du contenu
  consultable pour la carrière joueur.
- **Le classement en ligne** dépend d'une fonction serverless Vercel
  (`api/classement.ts`) + Neon. Sans serveur, il rend une liste vide **sans
  lever d'erreur** — le classement local continue. Déploiement :
  `serveur/VERCEL.md`.
- **Bundle** : `useGame` 115 Ko gzip, textes 155 Ko, fournisseur Three.js
  263 Ko (partagé et paresseux). Le build signale des morceaux > 1 000 Ko.
- **Paiements** : voir `serveur/PAIEMENTS.md` (achat réel d'Ovas non branché).
