# AGENTS.md — Destiny Rugby 🏉

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
- **Rien ne se vend contre de l'argent réel.** Stripe a été retiré ; tout
  s'achète en Ovas gagnés en jouant.

---

## Stack

Vite 8 · React 19 · TypeScript · Zustand (+ persist, **migration v36**) ·
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

### Effectif retiré du Relecq-Kerhuon — 20 octobre 2026

`data/effectifsRetires.json` exclut l’effectif réel du Relecq-Kerhuon, avec ses variantes de nom, sans retirer le club,
son blason ou ses compétitions. Les deux générateurs d’amateurs respectent cette liste. Les lectures FFR,
portraits, catalogues reçus et cartes éligibles la contrôlent également, y compris après rechargement d’un cache.
Le solo génère son groupe fictif jouable habituel de 26 joueurs. La migration des cartes retirées remplace les
anciennes cartes possédées par des cartes fictives équivalentes et recale les compositions une seule fois.
Ces compensations de formation restent autorisées. Contrôles : `verify:retrait-effectif`, `verify:retrait-effectif:navigateur`
et `scripts/verifDonneesFfr.ts` ; aperçu `/scripts/apercuRetraitEffectif.html` sur 5188, sans compte distant.

### Packs saisonniers publicitaires et doublons de composition — 20 octobre 2026

`packPublicitaireDeLigue` ramène les récompenses Halloween et Octobre Rose à trois cartes après les réglages du Labo.
Le filtre de stock utilise ce volume ; les poids de roulette, garanties et probabilités des cartes restent ceux du pack.
La Collection solo et sa roulette Premium conservent leur volume. Le contenu déjà réservé reste un droit figé.
`doublonDeComposition` compare l'identité du joueur sur les 23 maillots, cartes ordinaires et spéciales comprises.
Le serveur refuse les feuilles et modèles invalides et réconcilie les anciennes feuilles avant le prochain coup d'envoi,
en conservant les cartes possédées ; un exemplaire blessé n'écarte pas sa copie saine. L'interface contrôle les placements
et le chargement d'un modèle, tout en permettant de remplacer la carte d'une personne par une autre de ses versions.
L'assemblage automatique affecte des personnes aux postes puis choisit leurs variantes, sans doublon entre XV et banc.
Bancs : `verify:packs-doublons-ligue` (API locale, reçus simulés signés), `verify:doublons-ligue:navigateur` sur 5188,
`verify:publicites` et `verify:meilleure-composition`. Aucun compte distant modifié par ces recettes.

### Repos au vestiaire — 19 octobre 2026

Les nouveaux matchs appliquent `recuperationMiTemps` une seule fois à l'entrée dans la pause de 40 minutes :
15 points d'endurance, plafonnés à 100, et la réserve de sprint rechargée à son plafond recalculé.
Le chronomètre arrêté ne permettait aucun repos via `dtHorloge`. Cartons, blessures et remplacements
restent en place ; les pauses courtes de prolongation ne donnent pas le bonus du vestiaire.
`REGLES_MATCH_EN_LIGNE = 13` active ce repos ; les rencontres déjà ouvertes en règles 1–12 gardent
leur rejoue. Une ancienne sauvegarde moteur sans ce drapeau conserve aussi son comportement.
Banc : `verify:recuperation-mi-temps` ; recette ordinateur/mobile : `verify:recuperation-mi-temps:navigateur`,
avec `/scripts/apercuRecuperationMiTemps.html` sur 5188 (moteur réel, aucune écriture de compte).

### Effectif de ligue et défilement mobile — 19 octobre 2026

`Effectif` monte au maximum douze cartes par page, sur ordinateur comme sur téléphone.
Les douze emplacements réutilisent leurs composants et identifiants SVG entre les pages ; la sélection
reste portée par les identifiants des cartes, et `usePortrait` réinitialise les échecs au changement de joueur.
Les identifiants sélectionnés restent indépendants de la page, du tri et du filtre ; « Tout cocher »
porte sur tout le résultat filtré et conserve la limite de 100, les favoris exclus, la feuille protégée
et le plancher de 26 disponibles. Le tri/filtre revient en première page ; une vente recale la page restante.
Les cartes, coches, favoris et la barre fixe de cet écran évitent les filtres d'ombre et de flou.
Recette isolée sans compte distant : `/scripts/apercuEffectifMobile.html?nombre=500` sur 5188.
`verify:effectif-mobile:navigateur` parcourt les 500 cartes sur ordinateur et au format mobile,
vérifie sélection, tri, filtre, annulation, ventes via la règle réelle et protections. Chromium mobile
ne remplace pas une validation sur iPhone/Safari. Profils et captures temporaires nettoyés en fin de test.

### Champions, sirène et sortie des publicités — 19 octobre 2026

`phasesFinalesJouees.ts` reprend les anciens nuls couperets sans issue : il inscrit uniquement le vainqueur désigné,
conserve le score, puis laisse le tableau aller jusqu'au champion. Un match humain sans résultat reste à jouer.
Les montées acquises par qualification restent indépendantes du titre. Banc : `verify:champions-bloques`.
Les nouveaux matchs utilisent `reglesSirene: 'ballonMort'` : franchir 40/80 minutes ou dépasser un budget de temps
ne coupe plus un ballon vivant. Touche, en-avant, maul coffré et autres ballons morts clôturent la période ; la pénalité,
sa pénaltouche et la transformation due se jouent. Règles de ligue 12 ; les directs déjà ouverts conservent leur version.
Bancs : `verify:sirene-ballon-mort`, `verify:duree-match`, `verify:reglements`.
`useModalDialog` isole depuis le portail au premier plan et Échap ferme uniquement celui-ci ; les fermetures dans le
désordre rendent le fond utilisable. `OuverturePack` partage ce verrou : restaurer son propre ancien `overflow` après
la roulette laissait le défilement bloqué. Son portail passe devant la roulette et le test utilise le vrai composant.
Le lecteur publicitaire s'annule par identifiant de session, son nettoyage et le
son de roulette peuvent échouer sans bloquer l'offre ; les requêtes publicitaires expirent après 15 s sans crédit local.
Recettes : `verify:publicites`, `verify:modales`, `verify:blocages:navigateur` (aperçu simulé sur 5188).
Une vraie annonce AppLixir et son reçu signé restent à vérifier avec le fournisseur.

### Publicités des cartes

`scripts/creerPublicitesCartes.cjs` produit la campagne FR/EN de 25 s en 1080 × 1920 à 60 images/s,
dans `trailer/cartes-tiktok-2026-10-18/`. `scripts/campagneCartes/` sépare structure commune,
captures, montage et composition musicale originale ; `apercuCampagneCartes.tsx` utilise les composants et le
catalogue réels, en mode mixte adulte. Les lectures de demandes sont simulées et tous les POST refusés.
Les corrections sont des propositions à vérifier. Le formulaire conserve ses vrais libellés, y compris en anglais.
Les exports sont sans voix off, avec sous-titres, textes et repères à doubler. Aucun crédit ElevenLabs n'est consommé.
Les profils, images intermédiaires et polices de travail restent temporaires et sont supprimés dans un `finally`.
Contrôle média et lecture sur ordinateur/mobile : `node scripts/verifierPublicitesCartes.cjs` (aperçu sur 5188).

### Fluidité des contrôles partagés

`Selecteur.tsx` ne traduit et ne prépare les listes complètes que si elles sont ouvertes : fermé, seul le choix
actuel est traduit. Toutes les options restent accessibles, avec groupes, recherche sans accents et clavier ;
la langue et les options invalident les préparations. Les index de recherche ne vivent que pour cette liste.
`i18n.ts` réutilise un `Intl.NumberFormat` et un `Intl.PluralRules` par langue, sans mémoriser les valeurs affichées.
Le rapport d'adjoint du bureau est mémorisé selon manager, état avancé, effectif, affiche et onglet.
Bancs : `npm run verify:optimisation`, `npm run verify:optimisation:navigateur` ; aperçus sans sauvegarde
`/scripts/apercuOptimisation.html` et `/scripts/apercuFluiditeManager.html`. Les profils et captures du nouveau
banc sont temporaires, supprimés après fermeture ; `DESTINY_GARDER_CAPTURES=1` les conserve pour inspection.

### Accession des Fédérales en carrière solo

Le socle 2025/26 garde huit montées Fédérale 2 → Fédérale 1 (qualification en quarts) et quatre Fédérale 1 →
Nationale 2 (qualification en demies), ainsi que deux montées Nationale 2 → Nationale (les deux finalistes).
`competitionRules.ts` déclare `promotionImpact: 'qualification'` et
`tourAccession`, sans place automatique au classement. `accessionFederale.ts` lit les résultats établis : le vainqueur
du tour précédent est qualifié même si les autres rencontres de son tour ne sont pas finies ; perdre ensuite ne
retire pas l'accession. `promotion.ts` partage ce calcul entre les deux carrières et équilibre les échanges.
Le motif `phaseFinale` ne doit pas être raconté comme un titre de champion. Les anciens tableaux restent intacts,
sans ajout de clubs fictifs ni réécriture des saisons terminées. Les tours restent à match unique.
`RegleAccession` explique le seuil dans le bureau, le calendrier et l'écran des classements. Les Régionales gardent
leurs places par poule. Bancs : `verify:accession-federale`, `verify:montees`, `verify:accession-federale:navigateur`.

### Pyramide publique et classement mondial

- `lib/ligue/pyramidePublique.ts` distingue niveau D1–D10 et numéro de poule. Sans `publique.poule`, l’ancien
  `division` est un indice global : 1 → D1/P1, 2–3 → D2/P1–2, 512+ → D10. Ne jamais déplacer ni recréer les
  clubs/matchs d’une saison en cours pour migrer ses étiquettes.
- `serveur/eloPublic.ts` rejoue chronologiquement les résultats enregistrés, départ 1 500 et K=32, sans prime
  arbitraire de niveau. `publique.eloDepart` et `empreinteElo` rendent le calcul reproductible et idempotent ;
  seul `club.eloPublic` suit le club au cycle suivant. Ces bases internes ne sont pas envoyées dans la vue.
- `serveur/divisionsPubliques.ts` planifie à partir de résumés sans cartes : D1 unique de 16, quatre remplacements
  par les quatre qualifiés de D2 ; autres niveaux limités à 2^(d−1) poules sauf D10. Résultats sportifs avant Elo,
  champions exceptionnels éligibles à +2/+3 (10 matchs minimum, ≥85 % gagnés et différence moyenne ≥14 ; +3 si
  ≥90 % et Elo ≥ moyenne de poule +200), sous réserve de capacité. La D1 reste accessible par D2 uniquement.
- `serveur/pyramideStockage.ts` fournit les index Elo, les plans mensuels immuables et les baux d’inscription,
  en SQL et en local. Les lectures du portail cherchent un seul compte/une poule libre, sans rapatrier tous les
  comptes ni états. `pyramidePublique.ts` clôt et matérialise par lots de quatre ; ne jamais remplacer un plan
  partiellement réalisé, supprimer les sources, ou accepter une mutation d’un ancien cycle après son plan figé.
- L’inscription publique se fait avant ouverture de session, pour mot de passe et Google, et au portail pour
  les anciens comptes. Bail par compte contre les doubles inscriptions, bail de cycle contre une adhésion pendant
  le gel du plan. Les homonymes reçoivent un nom de club disponible. `attenteProchainCycle` empêche les nouveaux
  groupes de repousser indéfiniment l’échéance mensuelle ; les calendriers existants restent intacts.
- `components/LigueMondiale.tsx` explique les capacités et montées et charge 50 lignes Elo à la demande. Le
  classement public ne renvoie pas les identifiants de comptes. Contrôles : `scripts/verifierPyramidePublique.ts`,
  `scripts/apercuLigueMondiale.html` sur ordinateur et mobile. Le banc SQL vérifie des requêtes simulées, pas une
  connexion Neon de production. Les ajouts de tables sont idempotents et ne réinitialisent aucun état de ligue.
  `scripts/verifierPyramideDbIntegration.ts` vérifie séparément la vraie base configurée : préparation des tables/index,
  lectures réelles et écritures temporaires annulées par savepoint. Ne modifie aucun compte ou état de ligue existant.

### Wiki et mises à jour

Les pages publiques sont générées par `scripts/genPages.cjs`, depuis
`contenuPages.cjs`, `contenuAdditionnel.cjs` et `contenuWiki.cjs` (actualisation
du guide). Ne pas modifier directement le HTML de `public/`. Le wiki utilise
uniquement des captures réelles du jeu en `public/images/wiki/*.webp`, jamais
d’illustrations IA. `public/contenu.css` porte l’interface ; `public/wiki.js`
ajoute la recherche, sans empêcher la lecture sans JavaScript. `/mises-a-jour/`
remplace le journal de développement public ; `/journal/` conserve une redirection.
Les notes distinguent disponible, évolutions récentes et bêta privée ; aucune
date de sortie future ne s’invente. `JOURNAL.md` reste la documentation interne.
Captures : `node scripts/capturerWiki.cjs` ; contrôle desktop/mobile : ajouter
`--verifier`. Aperçus : `scripts/apercuWiki.html` (sans partie persistée).
Le plugin `pagesDuWiki` sert les chemins publics du wiki aussi en développement.

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

Le cahier de combinaisons est **ouvert à tous les comptes connectés depuis le 14 octobre 2026** (bêta privée du compte
authentifié `kiri` auparavant ; `CAHIER_COMBINAISONS_OUVERT` à `false` dans `serveur/carriereApi.ts` la rend).
⚠️ Depuis le Correctif 41 il se teste en 3D sur le moteur du match, se dessine par ordres, porte des options
conditionnelles (règles 11) et s'échange sur un marché : voir « L'atelier de combinaisons, le cahier vivant, le marché et
l'IA communautaire ». Ce qui suit décrit l'atelier 2D et l'exécution du cahier, toujours en place.
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
reste exécuté par le serveur en mode configuré, pour tout compte qui a le cahier.
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
Influenceurs (`influencer`, Correctif 32) : famille désactivée par défaut, sans graine nominative,
design violet/rouge LIVE, rang de révélation 5 (Spécial ; ICON est au rang 6). GEN 60–99,
`display_name` / identité réelle, rareté, stats, description, niveau, club et nation facultatifs.
Labo → Cartes spéciales → Influenceurs ; brouillon à la création. `allowedPackIds` absent =
tous les packs éligibles, vide = aucun ; poids nul exclu. Pack Créateurs 200 Ovas / dix cartes /
une garantie, absent si aucun candidat. Taux ordinaire par défaut 0,25 × Mythique. Permissions
`market_allowed` / `trade_allowed` revérifiées lors des échanges et à l’acceptation. Sans club,
`sansClub` = nation / neutre / creator ; les valeurs vides restent vides. Le catalogue public
masque les cartes inactives ou pas encore sorties ; les exemplaires du compte authentifié
restent disponibles. Banc : `npm run verify:influenceurs`.
ICONS (100 retraités, toute l'année) et Halloween 2026 (23 cartes, 5 oct. → 30 nov.,
pack dédié). Définitions et événements dans `CatalogueAdmin.speciales` (diff de la
graine, même révision que l'Atelier) ; images dans `carriere_cartes_speciales_images`,
servies par `/api/carriere?imageSpeciale=<id>&v=<n>` (privées tant que jamais publiées).
⚠️ **Rien ne sort sans image ni publication** (`statutCarteSpeciale`) ; une ligue sans
`cartesSpeciales` ne consomme AUCUN tirage de plus (`preparerTirageSpecial` → null).
Chance par carte plafonnée : ICONS = 0,1 × Mythique, chaque famille Spécial ≤ 0,25 × Mythique ; la carte garantie
d'un pack les tire au prorata des bandes autorisées (`tirerSpeciale`, option `base`).
⚠️ **Le pack Halloween se vend dans la boutique de packs spéciaux de la Collection
solo, PAS en ligue** (`packsEvenementSolo`, prix en Ovas du compte, pochette 3D
`MODELES_PACKS_EVENEMENT`) ; `completerPacks` retire tout pack d'événement d'une ligue.
Ses cartes sortent aussi des packs ordinaires des ligues qui les autorisent, et des
packs solo, gratuits compris. Le catalogue solo reçoit les seules cartes
publiées (`specialesPubliques`, avec `/api/carriere?catalogueSolo=1`), ajoutées en FIN
de tableau et hors des bandes de rareté. `cartesSpeciales.ts` reste LÉGER (le store
l'importe via `collectionSolo.ts`) ; la graine et la fusion avec le Labo sont dans
`catalogueSpecial.ts`, `rareteCarriere`/`carteDansPack` dans `raretesCartes.ts`.
`collectif` est un PLANCHER (Halloween, Octobre Rose et ICONS : 10) ; une ICON titulaire DONNE aussi +1 de collectif à
chacun de ses coéquipiers du XV, jusqu’à +2 quel que soit le nombre d’ICONS (`DON_ICON`, `DON_ICONS_MAX` dans
`collectifCarriere.ts`, jamais au-delà de 10). La carte compte normalement pour ses
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

### Gestion physique

`lib/formeCarriere.ts` porte les niveaux **Facile / Moyen / Difficile**. Le choix est proposé dans les créations
joueur (nouveau ou existant) et entraîneur, puis dans Paramètres (`ChoixDifficulteCarriere`). Il est persisté dans
le store et copié sur le joueur/manager ; une sauvegarde sans niveau utilise Moyen. Changer le niveau conserve
forme, profils médicaux et blessures. Les notes de base, la progression et les adversaires gardent leur barème.

Pour 80 minutes au rythme normal : coût de condition **10 / 18 / 24**, récupération hebdomadaire de base
**12 / 10 / 8**. L'entraîneur paie les minutes réelles, prolongation comprise, avec le rythme tactique ;
un banc inutilisé ne paie rien. La charge d'entraînement et le repos modulent la récupération. La condition affichée
est celle du rapport de l'adjoint, des pénalités de performance du match joué et de l'avance déléguée ; elle initialise
aussi l'endurance de tous les joueurs du groupe, pas seulement ceux ayant un dossier médical ouvert.
La carrière joueur partage le coût par minute entre match regardé et estimé ; l'effort précède la récupération
de la semaine, sans double débit d'un match déjà regardé. Âge, endurance et traits modulent le retour au repos.

En ligue privée/publique : **24 points de fatigue pour 80 minutes**, récupération quotidienne selon la cadence.
`horaires.ts` est l'unique barème, réexporté par `carriere.ts`. `avancerInterne` parcourt les rencontres par date
et intercale la récupération avant/après leurs feuilles gelées, puis jusqu'à l'heure courante. L'ancre quotidienne
ne recule jamais lors d'un rattrapage. Une feuille existante prime sur la composition actuelle, y compris pour un
joueur à zéro minute. Les matchs et blessures enregistrés ne sont pas réinitialisés.
Contrôles : `npm run verify:forme-carriere`, `scripts/verifierFormeNavigateur.cjs`,
`scripts/verifierRecuperationPassiveEtFiltres.ts`, `npm run verify:correctif41`.

### Joueur

1. On tape une action en français dans `Carriere.tsx` (ou on clique une suggestion).
2. `demanderAuMJ()` transmet à Groq : prompt système + fiche joueur + historique
   + action. Sortie JSON stricte.
3. `appliquerReponse()` applique les deltas et écrit deux entrées au journal.

La clôture accepte un tableau progressif dont la finale n'est pas encore construite :
le bilan ne raconte que les matchs terminés et un champion établi, puis applique le pré-accord à l'intersaison.
`verify:cloture-joueur` couvre Gaillac en saison 4 avec un accord à Valence Romans.
Sur mobile et tablette, les réponses restent au-dessus des barres fixes, même en paysage ;
« Réponds d'abord » ramène au récit et place le focus sur le choix ou le champ de réponse, sans avancer la semaine.

**Deltas autorisés** : `vitesse, force, endurance, plaquage, passe, jeuAuPied,
vision, mental` (±3) · `forme, moral, reputation` (0-100, ±20) · `argent`.
Toute clé inconnue est ignorée par `nettoyerDeltas()`.

**Deux départs** (Correctif 19) : « Créer mon joueur » (`creerJoueur`, classé) ou
« Jouer avec un joueur existant » (`creerJoueurExistant(carte)`, **hors classement**).
La logique pure est dans `lib/carriereExistante.ts` (sélection, filtres, fiche de départ,
`estCarriereClassee`), l'écran dans `components/SelectionJoueurExistant.tsx`, chargé à la demande.

- ⚠️ **LA CARTE EST UN POINT DE DÉPART, JAMAIS UN LIEN.** `joueurDepuisCarte` copie tout ; `Joueur.origine`
  ne garde qu'un instantané. La carte du catalogue (qui sert aux packs, aux ligues et à la collection) ne bouge
  pas d'un point quand la carrière progresse — le banc gèle la carte en profondeur avant de l'utiliser.
- ⚠️ **HORS CLASSEMENT POUR TOUJOURS.** `rankedCareer: false` est posé à la création ; aucune action du store
  ne le réécrit. **`estCarriereClassee(joueur)` est LE prédicat** et lit aussi `origine` : un drapeau remis à `true`
  à la main ne suffit pas. Il ferme : `publierAuClassement` (toutes les publications passent par là, `force`
  n'y change rien), `classementComplet` (classement local), le Panthéon (`LegendeSauvegardee.horsClassement` :
  gardée, badge, sans rang), `Manager.horsClassement` (un entraîneur issu de cette carrière), le bonus de retraite
  (`score − scoreDeDepart`, sinon créer une superstar et raccrocher rapporterait plus qu'une carrière entière).
  Une sauvegarde d'avant le Correctif 19 n'a ni l'un ni l'autre : elle est classée. ⚠️ La carrière solo vit dans
  le navigateur : le drapeau est modifiable à la main, comme tout le reste — le serveur ne peut pas le savoir.
- ⚠️ **LE JOUEUR INCARNÉ N'EXISTE PAS DEUX FOIS.** Le monde contient déjà Antoine DUPONT : sans précaution, deux
  Dupont sur la feuille, deux dans l'écran Effectif, et un club qui compte deux fois son demi de mêlée (effectif +
  apport du joueur). `lib/joueurIncarne.ts` tient le nom (registre de module, comme `setTransfertsSociaux`) ;
  `effectifDuClub`, `meilleursDuPays` et `effectifNational` l'écartent, leurs mémoires l'ont dans leur clé
  (`versionJoueurIncarne`). Le store le renseigne à la création, au rechargement (`onRehydrateStorage`), le retire
  à la retraite, à `reinitialiser` et à `creerManager`. L'apport au club est calculé dès la première saison.
- Les huit attributs viennent des notes de la carte (VIT, PAS, JDP, DEF, PHY ou MEL, RCK, END) et du profil de poste
  du moteur (`attributsDe`) pour le reste, puis la moyenne est recalée **exactement** sur la GEN (`recalerSurLaNote`).
- Seuls les joueurs **actifs** sont proposés : les cartes spéciales sont écartées (une légende n'a pas de club,
  une Halloween double un joueur listé). `OptionsSelection.legendes` ouvre les ICONS retraités ; rien ne l'expose.
- `.env.banc-classement` et `scripts/_envClassement.ts` : en développement `classementEnLigne.ts` n'appelle rien
  sans `VITE_CLASSEMENT_URL`, et `import.meta.env` est figé au lancement de vite-node — un banc qui compte les
  envois se lance donc par `vite-node -m banc-classement`. Banc : `npm run verify:carriere-existante`.

### Manager

On prend un banc (`CreationManager`), on compose, on recrute, on fait monter le
club. Le bureau a 13 onglets : Club, Composition, Trésorerie, Calendrier, Marché
mondial, L'Ovale, Formation, Recruteurs, Entraînement, Direction, Vestiaire,
Monde, Histoire.

**Invariants du mode manager** (détail dans `JOURNAL.md`) :

- **Ne préparer les bancs et leurs objectifs que si leur liste est visible.** Leur calcul caché bloquait chaque
  rendu pendant environ 17 s. `poulesDe` mémorise les regroupements par composition de division et sources de
  coordonnées, et rend des copies. Les contrats actifs sont indexés par identité ; `effectifsNationaux` partage
  un seul parcours des clubs entre les convocations du même calcul, sans conserver le grand vivier.
  Le registre des jeunes ne se réinstalle que si `mondeJeunes` change. `prochainesAffichesManager` ne projette pas
  les futures qualifications. Banc : `scripts/verifierFluiditeManager.ts` ; aperçu :
  `/scripts/apercuFluiditeManager.html`. Mesures locales ordinateur/mobile : bureau 55–74 ms, première semaine
  0,8–1 s, suivante 64–69 ms. Ce ne sont pas des mesures sur un téléphone physique.

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

**La vitesse d'un match de carrière** (Correctif 19, `lib/moteur/moments.ts`) : cinq tempos — `decisions`
(cartes, toujours à vitesse réelle) et `x1`, `x2`, `x3`, `x10` (⚠️ **×10 a remplacé ×4**, sur demande). ⚠️ **UN TEMPO N'EST PAS UN AUTRE MOTEUR** : c'est le
nombre de secondes simulées par seconde réelle (`allureDuTempo`), et le moteur joue à pas fixe (`DT`). Changer de
vitesse en plein jeu ne remet rien à zéro et ne change rien au résultat. Mesuré (`npm run verify:vitesse-match`) :
un match dure 15,5 min à ×1, 7,8 à ×2, 5,2 à ×3, 1,6 à ×10 ; rejoué avec un tempo ET une cadence d'images tirés au
hasard à chaque image (de 5 à 120 Hz), il finit avec le même score, les mêmes statistiques, le même fil et la même
suite de phases. `MatchLive` lit le tempo dans une **ref** (`tempoRef`) : la boucle ne se relance pas au changement.
⚠️ **ON NE CONDUIT PAS À ×10** : le pilote prend la main → `tempoALaPriseDeMain` rend `decisions` (et `allure` vaut 1
dès que `pilote.phase !== 'attente'`) ; la présentation d'avant-match se passe dès qu'on accélère ; les
commentateurs se taisent à ×3 et ×10. Les anciens noms (« Suivre », « Accéléré », « Fin ») et leurs facteurs
×7/×26/×600, que personne ne lisait plus, sont supprimés. ⚠️ En 3D logicielle (SwiftShader, 2,5 images par
seconde), `dtReel` est borné à 0,2 s et les vitesses plafonnent : mesurées en vue de haut, elles valent
exactement ×1, ×2, ×3, ×10 (10,01 mesuré) ; la 3D sur GPU réel n'a pas pu être chronométrée ici.
⚠️ **Plafond de pas par image** (`secondesAAvancer`, `PAS_MAXIMAL_PAR_IMAGE` = 1 s) : à ×10 sur un écran lent,
une image de 0,2 s ferait avancer le match de 2 s — la scène n'interpole qu'un pas de 1,2 s, les joueurs se
téléporteraient. À très basse cadence, ×10 ralentit au lieu de sauter ; la scène reçoit la vitesse RÉELLEMENT jouée.

**Se faire remplacer / simuler la fin** (`lib/moteur/sortie.ts`, bouton rond à gauche de la croix de `MatchLive`,
`FenetreSortie`) : ⚠️ *se faire remplacer* = `demanderRemplacement` du joueur incarné, exécuté **au prochain arrêt de
jeu** (jamais en pleine course), par le remplaçant de **son poste** (à défaut sa famille, à défaut sa catégorie —
`remplacantPour`, le même appariement que le moteur) ; la fenêtre dit POURQUOI c'est impossible (sur le banc, déjà
remplacé, exclu, plus de remplaçant, déjà demandé). Le joueur passe en « regarder » à ×1 : c'est là qu'on accélère
jusqu'à ×10. ⚠️ *Simuler* = `simulerPendant` : le MÊME moteur à pas fixe, par lots de 3 s sous un budget de 25 ms par
image (la page reste vivante, le match entier passe en une à deux secondes) ; la scène n'est pas redessinée (un
rendu 3D logiciel coûte 400 ms contre 12 de calcul), un voile affiche la minute, les blessures du manager restent
tirées minute par minute (`verifierBlessuresManager`). Le résultat est **identique** à celui du match regardé à ×1
(banc). ⚠️ La fenêtre vit DANS le match, pas dans un second portail : deux `useModalDialog` empilés reçoivent chacun
Échap, et celui du match le fermait en entier — `echapper` ferme d'abord la fenêtre de sortie.

⚠️ **ON NE QUITTE PAS UN MATCH EN COURS** (`fermerOuSortir`, `MatchLive`) : la croix, Échap et le clic hors du match
ouvrent la fenêtre de sortie tant que le match n'est pas fini — fermer en plein match ne coûtait rien (la semaine
n'avance qu'à la sirène, le match restait à rejouer) : on pouvait le recommencer jusqu'à ce que ça tourne bien. Deux
exceptions qui ne rapportent rien : le match terminé (« Terminer »), et un match pas commencé (`e.sim < 0.5`, rien à
refaire). Pendant la simulation la croix est inactive.

⚠️ **LE SCORE RÉEL D'UN MATCH DE CLUB ENTRE DANS LE CHAMPIONNAT** (`enregistrerMatchVecu` +
`Joueur.resultatsClub`). Le championnat rejoue un score THÉORIQUE (`jouerRencontre`, graine = clé de la rencontre)
tant qu'aucun résultat n'est inscrit sous cette clé dans le registre des résultats joués : le manager et les
sélections l'alimentaient, pas la carrière joueur — on finissait à 10-10 et le classement affichait 21-15.
`MatchLive` passe maintenant la clé, l'équipe et les essais ; le store inscrit le résultat (départage de trois
points en match couperet, comme pour le manager), le persiste dans la fiche, le rend à la réhydratation et
`oublierResultats()` purge les fins de saison mémoïsées. ⚠️ **Les clés (`division#saison#journée#…`) sont celles de la
carrière suivante** : `creerJoueur`, `creerJoueurExistant`, `prendreRetraite`, `creerManager` et `reinitialiser`
effacent donc le registre. Banc : `npm run verify:resultat-match` (échoue sur l'ancien code). En développement,
`globalThis.__useGame` donne le store aux scripts de test.

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
  **Depuis : règles 4 = lecture locale (IA 3), règles 5 = jeu vivant (IA 5, Correctifs 24-25), règles 6 = transformation après la
  sirène et prolongations jouées (Correctif 29), règles 7 = jeu physique (IA 6, Correctif 30), règles 8 = pénaltouche qui garde son lancer
  (Correctif 33), règles 9 = essai qui garde son élan (IA 7, Correctif 39), règles 10 = coup de pied en une seule action (IA 8,
  Correctif 40), règles 11 = cahier vivant (même IA 8 : options d'une combinaison, touche enrichie, mémoire tactique,
  Correctif 41 — celles des matchs créés aujourd'hui).**
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
  (`nettoyerStade`), l'écran géant des stades de campagne et de village
  (`creerEcranGeant`, Correctif 31), la banderole des abords et les réclames
  portent Destiny Rugby, le TikTok du jeu ou des annonceurs inventés. Tout
  nouveau décor se relit texture par texture avant d'être livré : le banc
  `node verifier_marques_decors.cjs` (depuis `../analyse-rn26`) échoue sur une
  texture qu'il ne connaît pas, et sur une marque lue par un morceau que la
  scène ne repeint pas.
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
- **Fautes visibles** : ⚠️ voir le Correctif 30 — les clips employés ici étaient les SIGNAUX DE L'ARBITRE ; chaque faute a
  maintenant le geste du joueur, et l'arbitre le signal de sa décision. Chaque motif sifflé a son geste (`GESTES_DE_FAUTE`,
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
- `voix.ts` conserve la file, les priorités et l'interface `LecteurVoix`.
  Français : `CommentatorVoice.ts` utilise le service F5 local de
  `../test voice/serveur_voix_f5.py` via un Worker. La référence autorisée,
  sa transcription et le modèle français restent en mémoire dans ce service.
  CUDA si disponible, sinon CPU ; cette version demande Python sur l'ordinateur.
  Anglais : `speechSynthesis` existant. Voir `VOIX_LOCALE.md` et
  `npm run verify:voix`. Aucun entraînement ou événement de match dans le lecteur.

#### Téléphone : sortie de match, iOS, mémoire

- **Sortir d'un match** (`lib/pleinEcran.ts`, `quitter` dans `MatchLive`) :
  « Terminer » ne fait plus tout à la fois. La scène 3D se démonte d'abord, puis
  l'orientation est rendue, le plein écran quitté, et l'on ATTEND que l'écran
  soit revenu debout avant de changer de page. Un second appui ne fait rien.
- **Mode léger de la scène** (`leger`, téléphones et tablettes) : chargement
  l'un après l'autre, textures du stade ramenées à 1 024 px (elles pèsent
  quatre fois moins), matériaux sans éclairage physique, un seul stade gardé
  en mémoire et rendu à la fin du match. iOS garde toujours ce budget, y compris
  l'iPad identifié comme Mac tactile : définition au plus 1 et au plus 921 600
  pixels par toile, sans anticrénelage. La pelouse a un
  vert rayé de secours si sa texture n'a pas pu être lue. Un contexte WebGL
  repris par le système rend la main à l'hôte (`surPerte`), qui revient au
  terrain vu de haut. ⚠️ RIEN DE CELA N'A PU ÊTRE ESSAYÉ SUR UN iPhone.
- **Restitution de la mémoire** (`public/rn26/ressources.mjs`) : les ressources
  en cache sont protégées ; les ressources du match (matériaux, textures,
  géométries d'ombres/repères, squelettes) sont recensées et rendues une fois.
  Les images des textures locales sont aussi fermées ou leurs toiles réduites
  à 1 × 1. Une texture clonée partage son `Source` : on détache ce `Source`
  avant de le vider. Le cache du stade compte ses scènes utilisatrices : une
  sortie ne ferme pas les images d'un stade encore affiché ailleurs.
  Chaque match utilise ses propres objets de géométrie, matériau et texture,
  pour que leurs écouteurs de destruction ne retiennent pas un ancien
  renderer dans le cache. Les gros tableaux de sommets et images restent
  partagés, et les copies sont réutilisées entre les joueurs de la scène.
  Retouche du vendor : `WebGLRenderer.dispose()` rend aussi la LUT globale
  `DFG_LUT` (16 × 16), qui gardait les écouteurs des anciens renderers ; ses
  données CPU restent réutilisables. À conserver/revoir lors d'une mise à jour
  de `public/rn26/vendor/three/build/three.module.js`.
- **Transition iOS** : le contexte WebGL est perdu volontairement et la toile
  retirée dès le début du démontage ; le nettoyage CPU poursuit ses tranches.
  Scène, joueurs, arbitres et bandes de ralentis sont détachés immédiatement.
  Le test de disponibilité WebGL ne crée qu'un contexte, aussitôt rendu, pour
  toute la page. La navigation attend les destructions concurrentes et les
  références de diagnostic du match sont retirées au démontage.
- **Bancs de restitution** : `npm run verify:memoire-3d` (58 contrôles de
  ressources avec trente joueurs sur dix cycles + 19 contrôles de profil iOS,
  diagnostic WebGL et destruction concurrente), et
  `/scripts/apercuSortie3D.html?ios=1` (dix scènes WebGL, profil iOS simulé).
  Ce banc ne mesure pas les FPS et ne reproduit pas WebKit : validation sur
  iPhone/iPad encore nécessaire. Bilan : `sources/SORTIE-MATCH-IOS.md`.
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
`node verifier_duels.mjs` (chaque lecture du contact trouve son animation),
`node verifier_marques_decors.cjs` (aucune marque de l'éditeur d'origine n'est
lue par un morceau de décor que la scène ne repeint pas).
Détail et limites : `../analyse-rn26/SIMULATION.md`.

---

### Match jouable en Carrière Entraîneur (Correctif 37)

`ChoixMatchEquipe` précède les matchs de club et de sélection : Jouer / Regarder, avec Mêlées et Touches Manuel/Auto,
Rucks Manuel/Assisté. `MatchLive.manager.modeControle` active `moteur/equipeSolo.ts` ; aucun joueur de carrière n'est créé
et le résultat reste enregistré par le manager. Une carrière reconvertie ne reçoit pas les statistiques du dernier pion contrôlé.
La sélection suit porteur, receveur, rôles de capitaine/buteur/lanceur et sauteur après l'annonce du lancer. En défense,
elle conserve un joueur tant qu'un autre n'est pas nettement mieux placé. Tab/L3/bouton tactile changent avec la direction.
Les recharges appartiennent aux pions ; une passe ou un geste armé ne se transmet pas au changement.

`cellulesSolo` organise deux triangles de deux à trois avants disponibles, avec profondeur, soutien en retrait et un
ramasseur distinct. Les cibles changent, jamais les positions : les joueurs au sol ou engagés restent exclus. Les groupes
gardent leurs identités dans une phase, puis se recomposent au ruck suivant. Les dix derniers mètres raccourcissent les
cellules. Le 9 attend la commande humaine, puis sert un premier avant déjà lancé, derrière ses mains au départ de la passe.
Le pick and go rejoint et ramasse le ballon. Le mode observé choisit son côté selon largeur, défense, placement et 10.
Les combinaisons programmées et les suites automatiques de touche ne reprennent pas la main sur le camp humain.

Les sorties passent par `controleDirect/sortiesNeuf.ts` : Action tenue + passe gauche/droite, haut/bas, pied ou raffut
(Espace + A/E sur AZERTY, Q/E sur QWERTY, haut/bas, V/F par défaut) ; LT/L2 + X/Carré, B/Rond, Y/Triangle, A/Croix, RB/R1, RT/R2 à la manette.
Les touches remappées restent valables. Un balayage à droite du terrain choisit gauche/droite, 10 vers le haut, pick vers
le bas, pied en diagonale haut gauche, départ en diagonale haut droite. `CommandesEquipe` montre une légende contextuelle,
sans six boutons de sortie. Les gestes normaux reprennent après le ruck. Les huit consignes jouent sur les cibles et le tempo.
La caméra est celle de la Carrière Joueur (Correctif 40) : elle suit le joueur contrôlé et glisse au changement de joueur ; `equipe`
reste dans le menu, sans être imposée. Les QTE de conquête et les responsabilités réutilisent le pilote.
Sans activation solo, aucun état ni hasard supplémentaires : quatre empreintes de simulations restent identiques à HEAD.
Banc : `verify:correctif37` ; aperçu `/scripts/apercuCorrectif37.html?situation=ruck` et `&tactile=1` pour l'essai tactile.

### Playoffs et contrats solo (Correctif 36)

`bracketProgressif.ts` construit uniquement les tours dont les qualifiés sont établis, de 4 à 64 clubs. Les scores des
rencontres futures sont `null`, les statuts scheduled/in_progress/completed explicites ; tous les résultats d'un tour sont
requis avant le suivant. La lecture n'effectue aucun tirage. `phasesFinalesJouees.ts` inscrit les pairs à la commande de jeu
ou d'avancement, avec protection du match humain. Les dates réparties sur les semaines 46 à 51 ne chevauchent aucune journée
régulière ; les métadonnées de poule et les résultats persistés sont conservés. Le titre amateur vient du tournoi national.
`reparationPlayoffs.ts` et la migration v36 reconstruisent les qualifications et ramènent un survivant aux matchs manquants
sans retirer ses vrais résultats. `repair:correctif36` écrit une copie et un rapport, sans écraser la sauvegarde source.
Marché mondial → Contrats à renouveler ouvre la proposition de L'Ovale : durée, salaire, rôle et primes modifiables,
acceptation, contre-proposition ou refus selon le projet sportif et le temps de jeu. Les termes signés restent inscrits ;
à expiration, le joueur quitte effectivement l'effectif et rejoint les joueurs libres. Aucun renouvellement automatique
— sauf, depuis le Correctif 41, ce que l'assistant sportif négocie à la clôture pour les joueurs que la politique des contrats
veut garder (`politiqueContrats.cloture = false` rend ce comportement).
Bancs : `verify:correctif36`, `verify:tournoi-final` ; aperçu `/scripts/apercuCorrectif36.html`.

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
  `d29eb36`, `6aca6be7` depuis la correction des effectifs du Correctif 24 — elle change dès que les effectifs changent : comparer
  toujours avec le moteur d'origine du MÊME commit).
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
  essai sur un vrai téléphone, une vraie manette et iOS. (README.md et `../analyse-rn26/SIMULATION.md` : faits avec le Correctif 18.)

### Les responsabilités du joueur (Correctif 17 — carrière solo, 3D)

Le joueur ne fait pas que courir : capitaine, vice-capitaine, buteur (principal ou secondaire), engagement, drop, lanceur
de touche (principal ou secondaire). Rôles par `sourceId`, jamais par maillot : celui qui sort, se blesse ou prend un carton
ne le tient plus et la CHAÎNE DE REPLI prend le relais (vice, buteur secondaire, lanceur secondaire, puis le meilleur
disponible). Un remplaçant n'hérite de rien. Tout est derrière `e.responsabilites` (option `responsabilites` de `creerMatch`,
passée par `MatchLive` en 3D seulement) : absent, le moteur rejoue à l'identique (empreinte `94f2ae2e` vérifiée).

- **Moteur** : `moteur/responsabilites.ts` (rôles, attribution automatique, `pionDuRole`, `humainTientLe`, `decisionDuCapitaine`),
  `moteur/tirHumain.ts` (la géométrie d'un tir joué à la main et celle du coup d'envoi), branchements dans `moteur.ts`
  (`capitaineTranche`, `avancerTirDetaille` étape `vise`, `phaseCoupEnvoi`, `phaseTouche`, `dropDirect`, `verifierLAttente`).
  ⚠️ L'IA n'attribue JAMAIS au joueur un rôle qu'il n'a pas gagné (`exclu`), même meilleur pied du groupe.
- **Le capitaine IA ne tire jamais au hasard** (`decisionDuCapitaine`, banc : mené 20-18 à la 78ᵉ à 35 m → poteaux ; mené 24-18 à la
  75ᵉ → touche ; mêlée dominante près de la ligne → mêlée ; défense désorganisée au sifflet → jeu vite) et dit POURQUOI (`raison`,
  `rv.raison.*`, ligne du fil).
- **Quand le jeu attend le joueur** (`e.responsabilites.attente` : `penalite`, `tir`, `engagement`, `touche`) : l'horloge du match est
  arrêtée, la simulation continue, le chrono (10 s pénalité, 25 s tir, 20 s engagement, 22 s touche — compté depuis que
  l'alignement est formé) donne la main à l'IA au dépassement (`stats.chronosDepasses`). ⚠️ `verifierLAttente` lève une attente dont
  le joueur n'est plus titulaire (remplacé, carton, retour aux cartes) : sans elle l'horloge resterait arrêtée.
- **Le tir à la main** : `resoudreTirHumain` — visée (écart dans le plan des poteaux), force (une DISTANCE : `porteeMaximale`), effet,
  régularité du geste. ⚠️ MÊME ÉTALON QUE L'IA : la dispersion se déduit de `probabilitePenalite` (vent retiré) ; le vent est dans la
  COURBE (`derive`), pas dans la probabilité ; l'issue se lit sur la trajectoire (`tirPasseEntreLesPoteaux`), poteaux rentrant/sortant
  compris. Trop court : sous la barre ou retombé devant. Transformations et pénalités ; buteur secondaire par la chaîne.
- **Engagement** (`resoudreEngagement`) : longueur, côté, hauteur ; **touche** : annonce (7 combinaisons dont leurres, maul, sortie vite)
  qui change VRAIMENT l'animation de l'alignement (`conquete`), puis lancer (force dosée + régularité → `qualiteDuLancer`) ; **touche
  rapide** manuelle, légalité vérifiée À LA DEMANDE (`evaluerToucheRapide`, sans tirage) ; **drop manuel** (`ActionDirecte 'drop'`) joué avec
  la phase d'armé `kick_restart` du drop (jamais le clip de pénalité), contrable À LA FRAPPE (`contreurDuDrop`, géométrie).
- **Le pilote** (`lib/controleDirect/responsabilites.ts`, `visee.ts`) : un geste, trois appareils, une seule loi — souris (côté = position,
  molette = force, clic = frappe), clavier (flèches + Espace), manette (mode « direct » : stick gauche vise, stick droit dose, A frappe ; mode
  « charge » : on tient A), pouce (glissé : direction, longueur = force, courbure = effet, relâcher = frappe). La RÉGULARITÉ du geste se gagne
  partout pareil (calme avant la frappe ; netteté du tracé). Le HUD (`components/match/Responsabilites.tsx`) montre vent, distance, chance d'un
  tir bien visé et une marque de force utile — JAMAIS le résultat ; cartes d'explication à la première occurrence (le match est figé derrière).
  Touches ajoutées : drop `X` (LB + B à la manette, bouton Drop au pouce), chiffres 1 à 8 pour choisir, `T` touche rapide.
- **Carrière** (`lib/responsabilites.ts`) : `Joueur.responsabilites` évalué à chaque intersaison PAR RAPPORT AU GROUPE (cadre → vice → capitaine ;
  tee secondaire → principal ; engagement ; drop ; lanceur), PAR MARCHES et sans tirage, avec une ligne de journal par changement ; migration du
  store v30. Bloc compact « Rôles dans l'équipe » dans `PanneauJoueur` (seulement les rôles tenus). Manager : `CompositionManager` gagne six
  champs facultatifs (vice, buteur secondaire, engagement, droppeur, lanceurs), « Automatique » par défaut, lus par le match 3D du manager seulement.
- **Scène** (hors git, `../analyse-rn26/correctif_17_scene.cjs`) : l'étape `vise` est animée comme `pret` ; l'élan d'un tir à la main dure
  `RITUEL_TIR.elanHumain` = 2,25 s comme celui de l'IA (le clip de frappe est calé dessus). Reconstruire : `node scripts/construireMoteur3D.mjs`.
- **Tester** : `npm run verify:responsabilites` (1 450 contrôles : rôles et repli, capitaine IA, géométrie des tirs, attentes, touche, drop, matchs
  entiers conduits, visée) ; navigateur : `/scripts/apercuControleDirect.html?roles=capitaine,buteur,engagement,lanceur,droppeur&pilote=1&tuto=0`
  puis `__apercu.situation('penalite'|'touche'|'drop'|'engagement')` (`tutosResp=1` masque les cartes d'explication ; un
  `setInterval` qui force `attente.delai = 1e6` permet d'essayer à la main sans que le chrono tranche).

### Le tutoriel guidé (Correctif 18 — tous les modes)

Il remplace la modale d'accueil à cinq écrans (`Tutoriel.tsx` et le drapeau `tutoVu` ont disparu). Principe : **mettre en évidence → expliquer
en une phrase → faire faire l'action → passer à la suivante**, sur les VRAIS écrans (le voile assombrit tout sauf l'élément visé, le clic passe
à travers le trou : le vrai bouton réagit). Jamais une simulation : le pack ouvert est le vrai pack, la ligue créée est la vraie ligue.

- **Architecture** (`lib/tutoriel/` + `components/tutoriel/`) : `memoire.ts` (drapeaux `tutorial.<mode>.<section>` dans `localStorage`
  `destiny-rugby:tutoriel` — par appareil et par personne, PAS dans la sauvegarde ; `desactive` ne rend rien vu), `types.ts`
  (`ParcoursTuto` / `EtapeTuto`), `guide.ts` (le moteur : un seul parcours actif, une file, déclencheurs relus toutes les 200 ms,
  `signaler(id)` pour les événements, `noter(acte)` / `acteDepuisLEtape` pour les gestes que les écrans annoncent), `placement.ts` (où
  poser la bulle — fonction pure, testée), `parcours/{general,joueur,entraineur,ligue,contexte}.ts` (30 parcours), `aides.ts`,
  `intentions.ts`, `GuideTutoriel.tsx/.css` (voile à quatre panneaux, anneau, bulle, flèche), `AnimationTuto.tsx` (7 mini-démonstrations
  SVG : clic, glisse, molette, stick, glisser, retourne, défile), `ReglagesTutoriel.tsx` (rejouer × 5, désactiver). Textes :
  `data/textesTutoriel*.ts` (119 phrases × 7 langues), clés `tg.<parcours>.<étape>.x|.t`.
- **Les écrans ne connaissent QUE des ancres** : `data-tuto="cel-onglet-packs"`… Un parcours se déclenche quand son ancre apparaît (jamais de
  `useEffect` de tutoriel dans un composant). Ajouter un tutoriel = un `ParcoursTuto`, ses textes, ses `data-tuto` — rien d'autre à brancher.
  Ancres partagées : la composition (`compo-*` dans `CompositionTerrainManager`) sert le manager, la ligue en ligne et la collection solo.
- **Types d'étapes** : `carte` (centre), `info` (surbrillance + Suivant), `clic` (attend le clic sur la cible), `action` (attend `jusqua()`),
  `ignorerSi` (étape sans objet, franchie sans s'afficher), `facultative` (cible absente après `patience` : sautée), `souple` (parcours sans voile,
  en haut de l'écran : tutoriels contextuels et carton/carte spéciale/blessure), `figeLeMatch` (le match s'arrête pendant la lecture).
- **Parcours** : `general.intro` (3 grandes cartes) ; `player.depart` (Correctif 19 : les deux départs, « Créer mon joueur » / « Jouer avec un joueur existant » — pas de second tutoriel pour le second, tous les parcours suivants sont ceux de la carrière ordinaire) ; `league.{connexion,portail,club,packs,composition,marche,calendrier,direct,decision}` ;
  `player.{creation,carriere,premierMatch,role.<capitaine|vice|buteur|lanceur|engagement|droppeur>}` (un rôle ne s'explique que le jour où on le
  reçoit : `rolesDuJoueur`) ; `coach.{creation,club,composition,matchLive,premierMatch}` ; `context.{carton,carteSpeciale,blessure,infirmerie,marcheManager}`.
  Le marché de la ligue n'est expliqué qu'APRÈS l'équipe et les packs. Les anciens joueurs sont reconnus au premier lancement
  (`reconnaitreLesAnciens`) : visite et création marquées vues, mais PAS les rôles (nés avec le Correctif 17), ni la ligue.
- **Mobile** : en portrait (< 640 px) la bulle est une FEUILLE pleine largeur collée en haut ou en bas, du côté opposé à la cible ; en paysage de
  téléphone une bulle étroite posée à côté ; une cible plus grande que l'écran passe en bulle « serrée » (sans animation) et la page défile pour la
  dégager. `npm run verify:tutoriel` mesure 8 000 placements sur 20 tailles d'écran (jamais hors écran, jamais sur la cible sauf cible énorme).
- ⚠️ **Pièges** : (1) `useModalDialog` rend `inert` tout ce qui est dans `body` — le conteneur du guide est immunisé par un
  `MutationObserver` (sans lui, la bulle ne répond plus au doigt au-dessus d'une modale) ; (2) une ancre n'est « visible » que si aucune GRANDE
  couche fixe ne la recouvre (la composition s'ouvre en plein écran et masque les rôles — l'étape `retour` la referme) ; (3) Échap passe le guide
  SEUL (`stopImmediatePropagation` en capture) ; (4) `.sel-menu` passe à `z-index: 100001` tant que le guide est monté (choisir un capitaine pendant
  une étape) ; (5) un pack peut MONTER EN GAMME (Argent → Or) et demander un second geste : l'étape `dechirer` dure jusqu'aux cartes et se tait
  pendant les animations ; (6) avant le coup d'envoi de la saison il n'y a PAS de pack gratuit : l'étape propose d'acheter le Bronze avec les Ovas ;
  (7) une étape `action` ne doit pas se terminer à la troisième lettre tapée (`stable()`) ; (8) « Désactiver » éteint aussi les cartes du match
  (`tutorielsDesactives` lu par `pilotage.ts`, `controleDirect/responsabilites.ts`, `MatchLive`) ; (9) les scripts de tournage
  (`_trailer.cjs`, `_joueur.cjs`) coupent le guide : sa mémoire est HORS de la sauvegarde.
- **Tester** : `npm run verify:tutoriel` (30 700 contrôles : textes 7 langues et variables, chaque ancre existe dans le code, placements, mémoire,
  rôles et anciens). Navigateur : en développement `window.__tutoriel = { guide, memoire }` (⚠️ un `import()` direct donne une AUTRE instance du
  module après un rechargement à chaud : passer par cette poignée, et naviguer en cliquant l'interface plutôt qu'avec un `setEcran` importé).
  La carrière en ligne tourne en local (`serveur/carriereFichier.ts`) : un compte de test se crée par `identifierCarriere('inscription', …)`.
  Panneau navigateur caché : la première capture après un script est souvent périmée (en prendre une seconde).
- **Pas fait** : bulles non testées sur un vrai téléphone (iOS : clavier virtuel, `visualViewport`) ; la carrière en ligne en tant qu'invité d'une
  ligue d'amis n'a pas de parcours « rejoindre avec un code » (le formulaire de création est guidé, pas celui de l'invité) ; pas de tutoriel pour
  l'Ovale, la boutique ni la collection solo.

### La boutique, les deux monnaies et les maillots d'équipe (Correctif 21)

- ⚠️ **PLUS AUCUNE VENTE PAYANTE (8 octobre 2026, sur demande).** Stripe est retiré du site : `serveur/paiementsStripe.ts`, `api/stripe-webhook.ts`, les actions `paiementOvas` / `paiementEtat`, la dépendance `stripe`, le rayon « Crédits », les recharges et les bundles n'existent plus. Les Crédits ne s'obtiennent plus ; un solde déjà acquis reste dépensable et synchronisé, mais **plus aucun article ne l'exige** : `prixCredits()` et `prixValide` (mode `CREDITS`) rendent un prix AUSSI en Ovas (taux `OVAS_PAR_CREDIT`), et l'écran ne propose les Crédits qu'à qui en a encore (`devisesProposees`). La table `achats_stripe` reste en base, plus rien ne la lit. Ne pas rebrancher de paiement sans demande.
- **Deux monnaies** (`lib/monnaies.ts`) : **Ovas** = gameplay (matchs, objectifs, saisons, événements, pub quotidienne), qui ne s'achètent PLUS avec de l'argent réel ; **Crédits** = premium, la seule monnaie achetée (Stripe). Un prix déclare sa monnaie : `OVAS`, `CREDITS` ou `OVAS_OR_CREDITS` (`PrixArticle`) ; le prix en Crédits se déduit au taux `OVAS_PAR_CREDIT` = 5 (1 € = 100 Crédits, ≈ 505 Ovas avant le correctif). ⚠️ Les prix en Ovas n'ont PAS été multipliés : les gains d'Ovas n'ont pas bougé (« ne pas ré-augmenter les gains sans demande »), les exemples chiffrés de la demande (15 000 Ovas…) n'auraient aucun sens à l'échelle actuelle.
- **Une seule porte d'achat** (`lib/achatUi.ts`, `components/ModalesMonnaie.tsx`, montée dans `App`) : `demanderPaiement` conduit jusqu'à une monnaie suffisante — choix entre les deux, « Pas assez d'Ovas » (Utiliser des Crédits / Obtenir des Ovas), « Crédits insuffisants » (solde, prix, manque, Acheter des Crédits → recharge directe), CONFIRMATION de toute dépense de Crédits — et rend la monnaie à débiter. ⚠️ Un solde insuffisant n'achète rien et ne grise rien. Le jeton de Crédits (`PieceCredits`, 4 variantes ; fichiers `public/icons/credit_icon*.svg` par `scripts/genererIconeCredit.tsx`) est octogonal, acier et bleu-violet : il ne se confond jamais avec la pièce d'Ovas.
- **Inventaire cosmétique** : `equipements` / `inventaire` (identifiants possédés, déjà synchronisés au compte) + `cosmetiquesMeta` (date, source). `acheterCosmetique(id, devise)` rend la raison d'un refus (`solde` avec `manque`, `devise`, `possede`, `indisponible`) ; `octroyerCosmetique` offre une récompense (le titre d'équipe donne le kit « Champion en titre », `lib/recompensesCosmetiques.ts`). ⚠️ **Seul ce qui est possédé s'équipe** (`basculerEquipement`, et le serveur refuse un équipement non possédé). Crédits : `credits` + `achatsCredits` suivent EXACTEMENT la mécanique des Ovas (SQL Neon, fichier, delta, Stripe).
- **Boutique** (`screens/Boutique.tsx`) : Packs · Crédits · Maillots · Joueur. ⚠️ **Packs ouvre la roue d'origine** de la collection (`BoutiquePacks3D`, demandée) : elle a gagné deux prix sous chaque pochette, le choix de monnaie et les fenêtres d'insuffisance (`avantAchat`), pas un nouvel affichage. La boutique montre ce qui s'achète ; **Personnalisation** (`components/Personnalisation.tsx`, ouverte par `ouvrirPersonnalisation`) ce qui se possède : Joueur · Maillots (domicile/extérieur) · Ballon et décor · À débloquer (cadenas, prix, « Voir dans la boutique »).
- **Maillots = kits d'équipe** (`data/kitsBoutique.ts`) : `equipementActif.maillot` (domicile) et `maillotExt` habillent TOUTE l'équipe du joueur (`lib/personnalisationMatch.ts`, lu à l'entrée du match). ⚠️ **Le maillot reste le maillot du jeu** : mêmes maillage, rig et animations, seuls couleurs/motif/short/chaussettes (ou atlas fourni, `jerseyTexture`) changent via `habillage.js`. Les maillots, casques et crampons se voient sur LEUR modèle 3D (icônes rendues hors écran, comme avant) ; un bouton « Sur mon joueur » les essaie sur le joueur 3D (`creerApercuJoueur`). Si les couleurs se confondent, `departagerTenues` bascule le visiteur.
- **Labo → onglet Boutique** (`components/LaboBoutique.tsx`, `validerArticleLabo`) : nom, catégorie, prix par monnaie, rareté, dates, publié ON/OFF, kit (couleurs, motif, atlas). Les articles publiés arrivent avec le catalogue solo (`?catalogueSolo=1`, aucune requête de plus) ; les packs ont `monnaie` et `prixCredits` réglables.
- ⚠️ **Retirés à la demande** : stades de la boutique et événements (Halloween, Noël) de la boutique. Les sources du lecteur sont revenues à l'état d'avant (`analyse-rn26/sauvegarde-avant-correctif-21/` ; `correctif_21_kits.cjs` + `correctif_21_apercu.cjs` réappliquent seulement les kits).
- Bancs : `npm run verify:boutique` (82 contrôles), `verifierSynchronisationCompte.ts`. ⚠️ Le SQL Neon des Crédits n'a pas pu être essayé sur la vraie base (seul le stockage fichier l'est) : même recette que les Ovas, mais à vérifier en test Stripe avant la production.

### Le joueur, du HUD à l'apparence (Correctif 20 — carrière solo, 3D, mobile)

- **Barème par compétition** (`lib/bareme.ts`, confirmé par le Correctif 29 : Six Nations et poules de Coupe du monde donnent 4 / 2 / 0, bonus en plus, jamais à la place) : plus aucune règle globale « nul = 1 ». `BAREME_CLUBS` (4/2/0, bonus offensif à 3 essais d'écart, défensif à 7 points) et `BAREME_TOURNOI` (Six Nations, Rugby Championship, U20, **poules de Coupe du monde** : bonus offensif à 4 essais marqués). `pointsDuMatch` rend résultat + bonus SÉPARÉS — un nul vaut toujours 2, le bonus s'y ajoute. `classer(poule, journées, bareme)` (championnat, coupes, Six Nations, qualifications, Coupe du monde via `classerMondial`) et le classement de la ligue en ligne (`classementCompetition`, donc serveur compris) passent tous par là. Banc : `npm run verify:bareme`. Le barème 2 points existait déjà dans le code ; le travail a été de le centraliser et de le rendre déclaratif.
- **Sortie de match = machine à états** (`lib/sortieMatch.ts`, `lib/viewport.ts`) : entrées coupées → boucle arrêtée (pause + scène démontée) → plein écran quitté (confirmé par `fullscreenchange`) → orientation stable (la taille visible ne bouge plus 3 images, dans la bonne orientation ; l'application installée est attendue même sans plein écran) → dimensions relues (variables CSS `--app-largeur/--app-hauteur`, `data-orientation`, événement `resize`) → écouteurs recréés (`installerEcouteursApp`, idempotent) → entrées rendues → navigation. Un second « Continuer » ne fait rien. ⚠️ **Cause probable du gel « plus rien ne répond »** : `useModalDialog` restaurait un INSTANTANÉ de l'état `inert` ; deux modales fermées dans le désordre laissaient `#root` inerte. L'isolement se COMPTE maintenant (`isoler`/`rendre`, `libererArrierePlan` en filet). Banc : `npm run verify:modales`. ⚠️ **Non essayé sur un iPhone ni sur une PWA installée** : seulement le navigateur de bureau, en émulation tactile.
- **HUD contextuel** (`ControleDirect.tsx`, préférence `hudSimple`, défaut activé) : sans ballon Sprint + Réclamer (qui devient Plaquer puis Gratter) ; avec le ballon CONTACT (raffut/percussion), PIED, ESQUIVE (+ Drop s'il est jouable), et les passes par balayage gauche/droite (`Gestes`). Transparence plus forte (`--cd-opa` 0,5). Réglages : taille, opacité, position du joystick et des actions (deux axes indépendants, `data-joy`/`data-act` ; l'ancien « gaucher » est traduit), interface simplifiée, recul de caméra.
- **Caméra** (`correctif_20_camera.cjs`, hors git comme le reste du lecteur) : 11,8 m derrière (6,6 avant), regard 12 m + 0,7×vitesse devant, +12 % et champ +4° sur téléphone ; zoom dynamique glissant (balle proche −8 %, réception −6 %, percée +14 %, défense +10 %) ; `scene.reculCamera` (réglage 0,85–1,35).
- **Tutoriel** (`lib/controleDirect/tutoriel.ts`) : dix étapes validées par l'action (déplacement, sprint, placement sur l'anneau vert, réclamer, passe, crochet, raffut, pied, plaquer, gratter), rejouables par SECTION (Réglages → Tutoriels : commandes générales, attaque, défense, coups de pied, rôles spéciaux). `ExplicationsContextuelles` : offload, rôle au ruck, passe au pied, placement selon le poste — une fois, sans figer, jamais pendant le guide ; les rôles (lanceur, buteur, capitaine, drop) gardent leurs cartes du Correctif 17. Textes : `data/textesTutorielJoueur20.ts`.
- **Apparence** (`lib/apparenceJoueur.ts`, `Joueur.apparence`, `EditeurApparence`, `ApercuJoueur3D`) : teint (7), coupe (les 23 maillages de l'APK, par famille), couleur de cheveux, barbe (15) et sa couleur, morphologie (taille, poids, épaules, muscle, torse, bras, jambes) **bornée à ±12 %** (`morphoPourScene`) avec physique conseillé par poste. Étape « Apparence » à la création, **Personnalisation** dans la fenêtre « Ton joueur » du Profil (taille/poids/carrure figés après la création, `morphoFigee`). Aperçu 3D = `creerApercuJoueur` (`scene.js`) : le même code que le match (`habiller`, `appliquerMorpho`), reconstruit à chaque changement, tournable face/profil/dos.
- **Équipement réellement porté** : `equipementPourScene` traduit `equipementActif` en modèles ; le registre `definirSurchargeApparence` (`moteur/apparenceMatch.ts`, alimenté par `useSynchroApparenceJoueur` dans `App`) fait que `apparenceJoueurMatch(nom, poste)` — lu par le moteur, la scène, les sprites — rend casque, crampons, coupe, morphologie ET la taille/le poids qui font les collisions. Les modèles se chargent à la demande (`chargerEquipement`, cache de session) : uniquement ceux portés + deux casques et deux paires pour les adversaires. Banc visuel : `/scripts/apercuCreation.html?achats=1`, `/scripts/apercuProfil.html`.
- **Curseur Taille** : le cadrage du corps garde une hauteur de référence de 1,85 m pour rendre la croissance visible, pieds au même endroit. Le gros plan du visage continue de suivre la tête. Source rejouable : `../analyse-rn26/correctif_taille_apercu.cjs`, puis `installer_apercu.mjs`.
- **Physique et attributs de départ** (`lib/attributsCreation.ts`) : à la création seulement, taille, poids, musculature, épaules, torse, bras et jambes redistribuent force/vitesse/endurance/plaquage, au plus ±6 points par attribut. Le physique conseillé au poste est neutre ; somme des points, technique et mental conservés. Un tirage stable (`CreationInput.graineAttributs`) rend identiques les huit valeurs affichées dans l'onglet Physique et celles enregistrées par `creerJoueur`, y compris l'ajustement au club du monde féminin. Aucun recalcul des carrières existantes ni des cartes incarnées ; la morphologie reste figée après création. Banc : `npm run verify:physique-creation` (monde féminin : poser `globalThis.__DESTINY_MONDE = 'F'` avant l'import).
- ⚠️ **Le joueur du jeu ne reçoit ni casque ni bandeau tiré au sort** : s'il a un équipement (même vide), c'est ce qu'il porte.
- ⚠️ **Sources du lecteur hors git** : `analyse-rn26/correctif_20_scene.cjs` et `correctif_20_camera.cjs` (sauvegarde d'avant : `sauvegarde-avant-correctif-20/`), puis `node installer_apercu.mjs`.
- **Pas fait / à essayer** : un vrai iPhone et la PWA (le bug d'orientation) ; les crampons de la boutique paraissent clairs sur certains modèles (textures allégées) ; pas de tutoriel dédié pour la personnalisation.

### Les conquêtes lisibles, les avants et l'endurance (Correctif 23 — carrière solo, 3D)

Demande : « si la possession change, le joueur doit pouvoir comprendre pourquoi rien qu'en regardant la scène » (jamais
*possession A → variable → ballon chez le 9 de B*), un vrai gameplay pour les avants (mêlée, maul, touche, grattage), un plaquage
qu'on peut rater, de grosses percussions, une endurance enfin vivable et une caméra à 360°.
⚠️ **TOUT EST DERRIÈRE `EtatMatch.ia` ≥ 4** (`conqueteLisible(e)` dans `moteur/conquete.ts`). Depuis le Correctif 24 la carrière joue au niveau 5 (6 depuis le Correctif 30 : jeu physique)
(`IA_MATCH_DE_CARRIERE`) et la ligue en ligne aussi (règles 5, avec son film et son étalonnage en temps réel — voir la section des Correctifs 24
et 25). Empreinte du moteur à l'IA 3 : `IA_EMPREINTE=3 npx vite-node scripts/empreinteMoteur.ts 6` → `6aca6be7` (`94f2ae2e` avant la correction
des effectifs du Correctif 24 ; le moteur, lui, n'a pas bougé).

- **Principe : l'issue est DÉCIDÉE AVANT le geste qui la montre, puis APPLIQUÉE après.** Elle vit dans l'état (`conquete.issue`, `ruck.duel`,
  `melee.dyn`) ; la scène joue ce que l'état annonce ; la phase n'applique plus que ce que tout le monde a vu.
- **Endurance (`moteur/endurance.ts`)** : deux réserves par pion (`deuxReserves`). `endurance` = générale, qui descend lentement sur 80 minutes
  (`usureGenerale` 0,6 de l'ancienne loi, plus les efforts du jeu collectif : `coutLien` au ruck, en mêlée, au maul) ; `sprint` (0-100) se vide
  UNIQUEMENT en sprintant (6,3 points/s) et se recharge en ralentissant (5,2/s à l'arrêt, moins en courant, moins encore fatigué) ; `sprintMax`
  = 35 + 0,65 × endurance (≈ 85 à la 60ᵉ). Barre vide : `essoufle` jusqu'à 18. Mesuré (`npm run mesure:endurance -- 12 4 regionale`) : un
  titulaire de Régionale qui sprinte vers chaque ballon finit à 85 / 74 / 67 / 64 aux 20ᵉ / 40ᵉ / 60ᵉ / 78ᵉ (ancien moteur : 25 à la 20ᵉ, 3 à la
  40ᵉ). HUD : barre de sprint épaisse (hachurée au-delà du plafond) sur l'endurance fine (`snap.reserve`).
- **Plaquage dirigé** (`plongeonDirige(e)`, `plongeon()`) : plus de « missile ». Le bouton lance le joueur dans la direction de son stick (à défaut :
  de sa course, puis vers le porteur) pendant 0,72 s ; contact seulement si le porteur est sur la trajectoire (rayon 1,85 m) ; une aide légère
  redresse le cap vers le porteur s'il est déjà dans un cône de 0,5 rad (jamais 90°). Possible dès 7,5 m : **trop tôt, on tombe dans le vide**.
  Geste de scène `plongeon` (`dive_tackle_pre`).
- **Caméra à 360°** (hors git : `analyse-rn26/correctif_23_camera.cjs`) : `scene.orbiter(dYaw)` + `scene.modeCamera = 'assistee' | 'libre'`. Doigt = le
  tiers haut de l'écran (`ZoneCamera`), souris = glisser bouton droit (gauche si la souris ne vise pas le pied), clavier J/L (remappables), manette =
  stick droit (⚠️ le crochet « au coup sec du stick droit » est SUPPRIMÉ : LB le fait). Assistée : après 2,2 s sans geste elle revient doucement derrière
  la course (jamais quand on bat en retraite) ; dans les deux modes une aide douce tient le ballon dans le champ (passe qui arrive, ballon aérien,
  partenaire qui porte) sans jamais lutter contre un geste. Réglages : mode et vitesse.
- **Touche** (`moteur.ts` : `preparerLaTouche` → `trancherLaTouche` → `conclureLaTouche`) : l'issue (`IssueTouche` : gagnée, **perdue** — capté par-dessus,
  arraché des mains ou tapé vers son 9 —, **déviée**, courte, longue, pas droit) est tranchée à 42 % de la formation, AVANT le saut (0,48). Le sauteur
  d'en face est celui que la scène fait monter (`contreurId`) ; sur une touche perdue il a vraiment le ballon (`porteur = contreur`), et seulement
  ensuite le 9 le sert. Le talonneur incarné est lanceur par défaut. Quand c'est le joueur qui lance, le déroulé **s'arrête à 38 %** (`attendLeLancer`) :
  il annonce, il lance, puis on voit sauter. Trois pastilles « Devant / Milieu / Fond » sur les groupes de sauteurs (`scene.ecran`), un clic ou un
  toucher annonce. Le lancer dépend du lanceur (`qualiteDuLancer(…, lanceur, pression)` : passe, vision, fatigue, pression, distance) : même visé
  parfaitement, un lancer au fond peut finir court ou long. Sauteur ou lifteur incarné : un temps au signal (bonus ±7,5 sur le duel).
- **Ruck** (`lancerLeDuelDuRuck` / `appliquerLeDuelDuRuck`, `regroupements.ts` : `choregraphierLeDuel`) : un grattage ou un contre-ruck est une séquence
  (`ruck.duel`) : le défenseur arrive, se couche sur le ballon (`jackal_engage` → `jackal_struggle` → `jackal_success_standup`, ballon dans ses mains à
  la dernière étape via `porteurPourAffichage`), ou les défenseurs chargent (effort 1,2), percutent, et le groupe recule de `avancee` mètres (le ballon
  avec lui). Issues : turnover, attaque conserve, ballon instable, pénalité. Indication discrète `indicationJeu` (« Ballon gratté », « Touche perdue »…).
  Grattage du joueur : une fenêtre s'ouvre à portée du ballon (défense) ; son appui est le geste ET le timing (parfait +20, correct +12, raté +2 et
  pénalité probable).
- **Mêlée** (`PousseeMelee`, `pousserLaMelee`, `trancherLaMelee`, `essaiDeMelee`) : poussée continue, vitesse = 0,055 m/s par point de rapport de force
  (`duel0` + geste du joueur), position lue par le moteur ET la scène (`geometrieMelee`). Issue tranchée à 45 % de la poussée. Un pack qui domine à
  moins de 7 m de la ligne garde le ballon aux pieds du 8 et continue (jusqu'à 9 s) : si le ballon franchit la ligne, **essai de poussée**
  (`tenterEssai(…, 'maul')`, aucun essai à distance). Le 8 conduit peut ramasser et partir ou servir le 9, un flanker se détacher.
- **Geste du joueur dans un pack** (`moteur/pack.ts`, `PackHumain`, HUD `Rythme`) : une partition de temps (mêlée 0,85 s, maul 0,72 s, un temps pour
  le saut, un pour le grattage, un coup de talon pour le talonneur) ; chaque appui reçoit 0/1/2 ; `score` glissant → `apportDuGeste` (± bonus par poste :
  pilier 13, talonneur 11, 2ᵉ ligne 16, 3ᵉ ligne 9, 8 10, × puissance × souffle). Un temps non joué est raté ; un mauvais geste répété peut faire céder
  son propre pack. Fenêtres plus larges pour le spécialiste (`largeurDeFenetre`). **Le tap est jugé à l'instant du doigt** (`DemandeDirecte.tr` =
  `e.sim + reliquat`), pas à celui du pas de simulation suivant.
- **Maul** : le joueur ajoute ±20 points de puissance au pack (en défense il freine) ; un maul stoppé net par le pack d'en face finit en **mêlée pour la
  défense** (`indicationJeu.melee`) ; sorties « ramasser et partir » (8), « servir le 9 » (8, 2ᵉ ligne), « se détacher » (3ᵉ ligne).
- **Percussion** (`duels.ts`) : `issueRaffut(…, grosseFrappe)` et `probaPlaquage` donnent à un porteur nettement plus puissant, plus lourd et lancé davantage de
  chances de percer et de **mettre le défenseur sur les fesses** ; les centres costauds entrent à l'épaule. Rien d'automatique : la fatigue, le plaquage
  du défenseur et l'angle pèsent.
- **Scène** (hors git ; sauvegarde `analyse-rn26/sauvegarde-avant-correctif-23/`) : `correctif_23_camera.cjs`, `correctif_23_touche.cjs`, `correctif_23_ruck.cjs`,
  `correctif_23_plaquage.cjs`, puis `node scripts/construireMoteur3D.mjs` (rebuild + installation).
- **Bancs** : `npm run verify:conquete -- 12` (touche tranchée avant le saut et perdue pour de vrai, duels de ruck jamais instantanés, mêlée continue sans saut,
  essai de poussée provoqué, geste du joueur en mêlée/touche/ruck), `npm run mesure:endurance`. Banc visuel pas à pas :
  `/scripts/apercuConquete.html` (`__conquete.situation('touche'|'ruck'|'melee'|'maul')`, `.avancer(s)`, `.duel('gratte'|'contre', issue)`,
  `.issueTouche('perdue', variante)`, `.vue({x, y, dist, haut, angle})` pour cadrer). Les bancs C16 et C17 ont été adaptés : le plaquage lancé va « au
  contact » (plaqué ou manqué), et le lancer humain attend à 38 % de la formation.
- ⚠️ **Pièges** : la scène ne reçoit PAS les nouveaux états du direct en ligne (ligue) ; une session de test peut être dérangée par l'utilisateur qui joue dans le
  même panneau (des appuis « fantômes » dans `pack.appuis` viennent de lui) ; `__matchLive.scene` est une fonction ; la page `apercuControleDirect` garde la
  caméra en `tv` (mettre `sc.moi` et `sc.camera = 'joueur'`) ; le moteur 2D (`cadenceDetaillee` faux) tranche la touche à la fin, sans animation.
- **Pas fait / à essayer** : un vrai iPhone, une vraie manette, la PWA ; la ligue en ligne (règle 5 : film des nouveaux états) ; un tutoriel guidé
  dédié aux avants (seule une aide d'une ligne s'affiche aux deux premiers temps) ; des animations de saut propres au « contre » (le contre réutilise les clips
  de saut de l'APK) ; la stabilité/angle du pilier est résumée par le risque de faute, pas par un second axe.

### Matchs couperets, propositions de cartes et fin de match (Correctif 26)

**Règlements des carrières solo** : `competitionRules.ts` définit les places directes et barrages par poule : N2/F1/F2,
deux directs et places 3–6 en barrage ; F3, trois directs et places 4–5 en barrage. Le régional adapte le nombre
de candidats à la taille de la poule (6 à partir de 12 clubs, 4 de 8 à 11, sinon 2). `tournoi.ts` attend les vrais
barrages avant de construire le tableau principal ; jusqu'à 128 places, avec exemptions plutôt que suppression
de qualifiés. Un ancien tableau déjà commencé conserve son format cette saison. La PREM anglaise et le Championship
n'échangent plus automatiquement de clubs. Les reversés de Champions Cup sont classés 9–12 en Challenge Cup,
à l'extérieur en huitièmes, puis réception selon le rang initial. `arriveesClubs` est persisté ; le rechargement
ne reconstitue une ancienne arrivée que si l'historique ou le journal prouve la montée. Sources, limites régionales
et contrôles : `sources/REGLEMENTS-CARRIERES.md`, `npm run verify:retours-reglements`, `scripts/verifierRetoursNavigateur.cjs`.

**Réserve de composition** : `CompositionTerrainManager` ne monte les cartes du banc et de la réserve que pour
le groupe affiché. La réserve est paginée par douze, y compris dans la présentation classique ; les joueurs
restent tous accessibles et la sélection est conservée entre les pages. Aucun portrait n'est monté pour une
réserve masquée. `scripts/verifierReserveNavigateur.cjs` vérifie le vrai bureau entraîneur, une permutation,
les ouvertures répétées et un effectif de 223 joueurs (200 en réserve), sur ordinateur et mobile, sans sauvegarde.

**Matchs couperets** (`lib/matchLive.ts`, `lib/couperet.ts`, `lib/tournoi.ts`)

- ⚠️ **LE TOURNOI FINAL DES DIVISIONS À POULES N'ÉTAIT PROPOSÉ NULLE PART.** De la Nationale 2 à la Régionale 3 (sept
  divisions, de 2 à 22 poules), le champion sort d'un tableau sec entre les meilleurs de chaque poule : l'écran Résultats
  l'affichait, la fin de saison s'en servait, mais ni l'entraîneur ni le joueur ne pouvaient en disputer un match.
  `affichesDePhaseFinale(c)` propose le tour national de la division à sa date, sans phase locale supplémentaire.
  Les tailles 128/64/32/16/8/4/2 correspondent aux 64es/32es/16es/8es/quarts/demies/finale, semaines 45 à 51.
  Un barrage préalable peut occuper la semaine 44.
  `debutPlayoffsDivision` réserve ces dates dans le calendrier amateur ; toutes les journées régulières se répartissent
  sur les week-ends précédents, y compris les journées exemptes ou doubles, sans concurrence avec le premier tour.
  `bracketProgressif.ts` construit seulement le tour actuel : scores et qualifié restent `null` jusqu'au vrai résultat.
  Tous les matchs du tour doivent être terminés, avec exactement un vainqueur par rencontre, avant le suivant.
  Les phases classiques à six clubs conservent deux exemptions explicites de barrage ; l'accès se joue semaine 52.
- ⚠️ **UN SEUL MOTEUR, UNE SEULE AFFICHE.** Il n'y a pas de simulateur par compétition : toute affiche s'ouvre dans
  `MatchLive` (mêmes vitesses, même « simuler la fin »), et l'avance déléguée de l'entraîneur leur donne un résultat
  automatique. La carrière joueur passe par `afficheDuJoueur` — elle fabriquait ses propres clés (« phase#…#semaine »)
  que le tableau ne relisait pas : barrage gagné sur le terrain, éliminé par le tirage.
- ⚠️ **LA CLÉ D'UN MATCH DE TOURNOI EST `MatchElimination.cle`** (`tournoi#division#saison#taille#a#b`) :
  le tableau lit le score enregistré, sans appeler `duel`. `tournoiDeFinDAnnee` est mémoïsé (il calcule toutes les poules :
  de 40 à 700 ms selon l'étage, recalculé une fois par résultat inscrit) sur ses paramètres et `versionResultatsJoues()`.
- **Il faut un vainqueur** : `departager(cle, pour, contre)` (`lib/couperet.ts`) est LA définition du nul couperet — trois
  points de prolongation, tirés de la clé. Le store (joueur et entraîneur) et l'écran de fin la lisent : la feuille annonce
  « Égalité à la sirène : X l'emporte en prolongation, 20-17 » au lieu d'un 17-17 que le tableau ne retenait pas.
  ⚠️ Le moteur ne joue PAS de prolongation : c'est un départage, pas vingt minutes de plus.
- Carrière joueur : un second match couperet le même week-end se compte comme le premier (`autreCouperet` dans
  `enregistrerMatchVecu`) et la semaine ne tourne que quand `resteUnMatchCeWeekEnd` est faux.
- Les autres rencontres sont simulées par la commande `phasesFinalesJouees.ts` aux seules dates atteintes, et
  persistées dans `resultatsPhasesFinales`. Consulter l'écran ne lance aucune simulation de playoffs.
- Migration v36 : `reparationPlayoffs.ts` conserve les résultats réels, laisse en attente les tours orphelins et
  reprend au premier tour incomplet si le club est encore qualifié. Le réparateur JSON écrit une copie et un rapport :
  `npm run repair:correctif36 -- chemin/sauvegarde.json`. Il ne remplace jamais l'original.
- Contrats entraîneur : Marché mondial → Contrats à renouveler (échéance dans les douze mois). Propositions de durée,
  salaire, rôle et primes dans L'Ovale ; acceptation, contre-proposition ou refus sportif explicite. Une signature
  actualise les termes, l'échéance et la masse salariale et survit au rechargement. Un contrat expiré quitte réellement
  l'effectif à l'intersaison et apparaît libre sans indemnité ; aucun renouvellement automatique.
- Bancs : `npm run verify:correctif36`, `npm run verify:tournoi-final`, `npm run verify:saison-manager`.
  Repli local : `node --loader ./scripts/chargeurTests36.mjs scripts/verifierCorrectif36.ts`.
  Aperçu sans écriture de partie : `/scripts/apercuCorrectif36.html`.

**Propositions de cartes** (`components/EchangesCollectionSolo.tsx`, `lib/echangesSolo.ts`, `serveur/carriereApi.ts`)

- ⚠️ **UNE PROPOSITION DOIT SE VOIR DES DEUX CÔTÉS.** Le serveur l'enregistrait, mais celui qui l'envoyait n'en gardait
  aucune trace à l'écran (il renvoyait, « déjà proposé », la fonction semblait cassée) et celui qui la recevait devait la
  trouver sous son offre, dans une liste paginée par date. `suivi(compte)` rend, hors pagination, `recues` (mes offres
  avec propositions) et `envoyees` (les offres où la mienne attend) : sections « Propositions reçues » et « Mes
  propositions envoyées », en tête. Le destinataire d'une proposition est l'auteur de l'offre.
- ⚠️ **RIEN NE CHANGE DE MAIN AVANT L'ACCEPTATION.** Une offre séquestre ses cartes à la création ; une proposition n'en
  déplace aucune. Le même doublon ne se promet pas deux fois : `cartesEngagees` + `doublonsLibres`, vérifiés par le
  serveur (`verifierDoublonsLibres`) ET par l'écran. À l'acceptation, possession revérifiée et deux mouvements dans la
  même transaction ; une proposition dont l'auteur n'a plus les cartes est retirée (409) au lieu d'échouer à chaque appui.
- **Delta, pas rechargement** : chaque action répond `{ boutique, delta: { evenement, offreId, offre, suivi } }`
  (`tradeCreated`, `tradeProposed`, `tradeAccepted`, `tradeRefused`, `tradeCancelled`, `tradeWithdrawn`) ;
  `appliquerDeltaEchange` met à jour la page. La lecture annonce la révision de la collection (`&rev=`) : le serveur ne
  la renvoie que si la sienne est plus récente (échange conclu pendant l'absence).
- Nouvelle action `retirerPropositionSolo`. ⚠️ **AUCUNE MIGRATION** : `suivi`, `lire` et `retirer` ne lisent que les
  colonnes existantes de `collection_offres` et sont facultatives dans `StockageCarriere` (un échec rend `suivi: null`,
  l'écran déduit alors le suivi de la page). ⚠️ Leur SQL Neon n'a pas pu être essayé sur la vraie base.
- **Pas fait** : choisir un destinataire sans offre publique (il faudrait une colonne `destinataire`, donc une
  migration), contre-proposition, expiration.
- Banc : `npm run verify:propositions-collection` (83 contrôles : envoi, réception, refus, retrait, acceptation, double
  appui, tiers, et le nombre d'exemplaires de chaque carte constant à chaque étape).

**Fin de match** (`lib/finMatch.ts`, `lib/persistanceNavigation.ts`, `lib/match3D.ts`, `MatchLive`)

- ⚠️ **L'ÉCRAN DE FIN REMPLACE LA SCÈNE 3D** (`e.fini && stats ? <FeuilleMatch/> : <Terrain3D/>`) : React la démonte dans
  l'image du coup de sifflet. Détruite d'un bloc à ce moment-là (trente joueurs, textures du stade, contexte WebGL, son),
  avec en plus le résultat, les statistiques et la sanction écrits dans le store — c'était LA grosse image.
- ⚠️ **CHAQUE `set()` DU STORE RÉÉCRIT TOUTE LA SAUVEGARDE** (`persist` : `JSON.stringify` + `localStorage.setItem`,
  synchrones). `suspendreEcritures()` ne garde que la dernière photo et l'écrit à la reprise ; `ecrituresGroupees(fn)`
  pour un travail synchrone. Filets : écriture immédiate à `pagehide` / onglet caché, levée seule après 4 s, photo
  liée à son emplacement de sauvegarde.
- **Le pipeline** : sirène → résultat verrouillé (`final`, `maFeuille`) → écran de fin dessiné (`apresLEcran`) → scène
  rendue (`scenesRendues`) → `finaliserMatch(id, étapes)` : résultat, statistiques, sanction, une étape par tâche, une
  seule écriture de la sauvegarde → « Terminer » se déverrouille (« Finalisation du match… » entre-temps).
  « Terminer » → `sortirDuMatch` (plein écran, orientation, viewport) → fermeture → une image plus tard,
  `semaineSuivante()` en écritures groupées (`PanneauJoueur`).
- ⚠️ **UN MATCH N'EST FINALISÉ QU'UNE FOIS** : `finaliserMatch` tient un registre par identifiant de match OUVERT
  (`cle#saison#n°` — pas la clé seule : elle revient d'une carrière à l'autre) ; le store garde ses verrous
  (`resultats[cle]`, `matchRegarde`).
- **Scène par tranches** : `detruireScene(scene)` (`lib/match3D.ts`, appelée par `Terrain3D`) → `scene.detruireParEtapes()`
  (`public/rn26/scene.js`) : contexte rendu, toile retirée et son coupé tout de
  suite, puis ressources CPU par seize et stade rendu. `ressources.mjs` libère
  aussi les images des textures, les ombres et les squelettes, en protégeant les
  modèles partagés. `detruire()` peut terminer un nettoyage déjà commencé.
- **Les statistiques ne se recalculent pas à la fin** : le moteur les cumule par pion (`p.stats`), `bilan(e)` les lit.
- **Mesure** : jalons `match_end_detected`, `stats_finalize_start/end`, `db_save_start/end`, `scene_cleanup_start/end`,
  `navigation_start/end` (`performance.mark('fin-match:…')`) ; en développement `__finMatch.durees()`.
- Banc : `npm run verify:fin-match` (109 contrôles ; dix matchs de suite, une écriture par
  match, tas stable à 240 Mo, aucune minuterie restante). ⚠️ **La mémoire GRAPHIQUE et un vrai téléphone ne sont pas
  mesurés** (pas de WebGL sous Node, panneau navigateur sans GPU) : c'est le premier essai à faire sur iPhone/Android.

### Ligue synchronisée, marché commun, données joueurs, jeu vivant (Correctifs 24 et 25)

Principe demandé : « tout ce qui est visuel et interactif est immédiat côté client ; le serveur conserve uniquement l'autorité sur
les résultats importants », en RÉDUISANT réseau et base. ⚠️ Rien n'a été poussé ; une autre session modifiait la même copie pendant le chantier.

**1. Le direct d'une ligue : une simulation de référence, N spectateurs** (`lib/ligue/matchCarriere.ts`, `filmDirect.ts`).

- ⚠️ **LA MARGE D'AUTORITÉ** (`MARGE_AUTORITE` = 4,8 s). Chaque instance jouait son moteur jusqu'à « maintenant » : un ordre, une décision ou une
  présence écrits par une autre instance tombaient dans SON passé, et elle rejouait — de là les retours en arrière. Le moteur ne joue plus que
  jusqu'à `maintenant − marge` (`simCible`) ; un ordre est daté à l'heure réelle (`simOrdre`), donc toujours DEVANT tous les moteurs. Tout ce qui est
  joué est définitif. La présence d'un entraîneur est un événement du journal (`veille`), la décision en attente se DÉDUIT (`derivee`), et le délai
  d'une décision se compte en pas de simulation (`PAS_ATTENTE_MAX`) : deux instances prennent la même décision de l'adjoint au même pas.
- ⚠️ **UN MOTEUR NE RECULE PLUS.** Seuls cas où on le remonte du journal : un ordre daté derrière lui (base muette plus longtemps que la marge —
  compté dans `retards`), ou un moteur gardé plus de soixante secondes DEVANT l'heure demandée (`AVANCE_SUSPECTE` : une autre partie sous la même clé).
- **Film v2, la « chronologie »** (`ChronoDirect`) : par segment, des pistes par valeur (échantillons choisis + interpolation d'Hermite écrite avec
  + − × ÷ seulement, pour que serveur et client tombent d'accord), tolérance adaptative (5 cm près du ballon, 20 cm loin), événements numérotés
  (`eventId | matchTime | eventType | players | result | seed` : `ligneEvenement`), somme de contrôle annoncée par l'écran (`tl=<pas>.<somme>`).
  Une divergence se raccorde EN DOUCEUR (`rupture`, fondu sur huit pas, sur un événement repère) — jamais par un saut.
- **Coût mesuré** (`npm run mesure:conso-direct`, un match de dix minutes, deux instances, deux écrans) : sondages 600 → 400 (3 s au lieu de 2),
  octets vers les écrans 3 255 → 1 718 Ko (compressés 1 012 → 610, −40 %), requêtes SQL 452 → 341, écritures de l'état 7 → 5. L'image a 9,5 s de
  retard sur l'horloge du serveur (marge + tampon). Bancs : `npm run verify:chronologie` (plusieurs instances, routage au hasard, latence jusqu'à
  2,8 s : chaque écran identique à la rejoue de référence, 0 recul), `verify:film-direct`, `verify:ecriture-direct`.
- ⚠️ **MISE EN LIGNE : quand aucun match ne se joue.** Un match en cours garde ses règles, mais le modèle de temps change pour lui aussi (un à-coup).
- **Règles 5 = IA 5** (`REGLES_MATCH_EN_LIGNE`, `iaDesRegles`) : la ligue reçoit les conquêtes lisibles du Correctif 23 et le jeu vivant ci-dessous.
  ⚠️ **LA FATIGUE EN TEMPS RÉEL** : les deux réserves gardent 90 % de son allure à un joueur à plat (réglé pour dix minutes d'écran) ; sur
  quatre-vingts minutes réelles le jeu ne ralentissait plus jamais — 75 points par match contre 59. `allureReel` 0,58, `accelerationReel` 0,35,
  `usureReel` 1,5 et `percussionReel` 0,3 (`ia/reglages.ts`, posés sur les pions à la création). Mesuré sur 48 matchs : **57,6 points, 7,3 essais**
  (production, IA 3 : 59,2 et 7,6), 42 minutes de ballon vivant contre 37,6.
- **N'importe quel joueur à n'importe quel poste** : `verifierComposition` ne refuse plus rien ; le prix est sportif (`rendementAuPoste` dans
  `carteJoueur.ts` : 1, 0,82 même catégorie, 0,64 contre-emploi, 0,6 ou 0,5 en première ligne improvisée), affiché dans la composition.

**2. Les tenues et le tableau** (`lib/tenuesMatch.ts`, banc `npm run verify:tenues`). Le visiteur recevait du blanc d'office au tableau ; 450 clubs
sans couleurs saisies jouaient dans une teinte tirée de leur nom ; l'écusson se lisait à son pixel le plus vif. Désormais : couleurs saisies, sinon
lues sur l'écusson à sa SURFACE (fond exclu, noir et blanc admis, `analyserEcusson`) ; `departagerLesTenues` (distance perçue CIE Lab, seuil 34) fait
passer le visiteur en tenue alternative — sa couleur d'origine reste sur les parements — et **le terrain vu de haut, la scène 3D et le tableau lisent
ce même résultat** (`OptionsScene3D.tenuesDepartagees`). ⚠️ Un kit acheté en boutique ne se repeint jamais : c'est l'autre équipe qui change (`fige`).
⚠️ La scène peint ses tenues UNE fois : `Terrain3D` attend la lecture des écussons (`pret`, quatre secondes au plus). `siglesTV` : jamais deux sigles
identiques (« TOU » / « RCT »). Mesuré sur 51 302 couples de clubs : aucun couple confondu, 18,5 % de tenues alternatives.

**3. Le marché commun des divisions publiques** (`lib/ligue/marchePartage.ts`, `serveur/marcheCommun.ts`, `operationMarcheCarriere`).
Chaque division est une ligue, donc une ligne de base : aucune écriture ne couvre deux ligues. Les annonces de toutes les divisions d'un cycle vivent
dans UN document (`carriere_marches`, id `public:<cycle>`) écrit par comparaison de version — **c'est lui qui arbitre**. Un achat : réserver les Ovas
(ligue de l'acheteur) → RÉCLAMER l'annonce dans le document (le point atomique : de deux acheteurs un seul passe, l'autre est remboursé) → solder le
vendeur → livrer l'acheteur → l'annonce quitte le document. Chaque étape de ligue est rejouable sans effet, et le document note ce qui reste à
faire : n'importe quelle requête reprend un achat interrompu (`entretenir`, `reprendreLigue`). Enchères entre divisions (réserve, remboursement de
l'enchérisseur dépassé), annulation, expiration, cartes spéciales si la division de l'acheteur les autorise.
- ⚠️ **CE NE SONT PAS DES COMMANDES** : aucune opération n'est dans `agirCarriere`, un client ne peut ni se livrer ni se rembourser.
- ⚠️ **SANS LA TABLE, RIEN NE S'ARME** : `npm run base:appliquer` (schéma dans `serveur/schema-carriere.sql`). Sans elle, chaque division garde son
  marché ; les ligues privées ne changent jamais. ⚠️ Le SQL Neon n'a pas été essayé sur la vraie base (fichier local et banc seulement).
- ⚠️ Le marché d'un cycle se ferme avec lui : `creerDivisionPublique` déverrouille les cartes héritées et rend les Ovas réservés.
- Écran : `useMarchePartage` (15 s, « inchangé » en vingt octets) fond les annonces du document dans la liste de l'onglet Marché.
- Banc : `npm run verify:marche-commun` (154 contrôles : trois acheteurs simultanés, trois INSTANCES sur la même révision, coupures à chaque étape,
  aucun Ova ni carte créés ou perdus).

**4. Les réponses compactes** (`lib/ligue/deltaVue.ts`, banc `npm run verify:delta-vue`). Une commande de ligue répondait par la vue ENTIÈRE ;
l'écran annonce sa version (`v`, `delta: true`) et reçoit ce qui a changé. Ouvrir un pack dans une ligue de seize clubs : **394 Ko → 8,5 Ko**
(compressé 39,9 → 1,7). Écran d'avant, version décalée, requête rejouée : la vue entière, comme avant.

**4 bis. Ouvrir une ligue pendant ses matchs (points de reprise et vue légère).** Signalé en jeu : la ligue publique « longue à
s'ouvrir », et « serveur de carrière indisponible ». Mesuré le 7 octobre 2026 sur les vrais états : une instance FROIDE rejouait chaque
match en cours depuis le coup d'envoi avant de répondre — division 1, trois matchs, **45 s** pour une limite de 60 ; et la vue pesait
**1,7 Mo**, dont 1,2 de fil et de feuille des vingt dernières rencontres.
- **Points de reprise** (`serveur/reprisesMatch.ts`, table `carriere_reprises`, `pointDeReprise` / `reprendreMoteur` dans
  `matchCarriere.ts`). Toutes les cinq minutes de JEU, l'instance qui fait avancer un match dépose son moteur (v8 + gzip, ~20 Ko) ; une
  instance froide le reprend dans `lireLigue` et ne joue que la suite. Mesuré au banc : ouvrir à froid à la 67ᵉ minute, 1,4 s au lieu
  de 16,6. ⚠️ **CE N'EST PAS UNE SAUVEGARDE DU MATCH** : rejouer depuis la graine reste sa définition. Un point absent, illisible, d'un
  autre coup d'envoi, d'un autre DÉPLOIEMENT (`CODE_REPRISES` = le commit Vercel : la mémoire brute du moteur ne se relit que par le code
  qui l'a écrite) ou qui ne prolonge pas le journal est refusé, et le match est rejoué comme avant. Sans la table, pareil.
- ⚠️ **LE TIRAGE D'UN MATCH DE LIGUE EST `rngReprenable`**, la même suite que `graine()` de `aleatoire.ts`, mais dont l'état se retrouve
  par son NOMBRE de tirages (une fermeture ne se copie pas). L'état du moteur ne doit contenir AUCUNE autre fonction que `rng` et
  `apresPas` : une troisième ferait échouer la sérialisation (le point n'est alors pas déposé, le match est rejoué).
- Une instance ne redépose pas ce qu'une autre vient d'écrire (`simsReprises`, quelques octets) ; les points s'effacent à la sirène et,
  par le cron, après un jour.
- **Vue légère** (`leger=1` sur la lecture, `leger: true` sur une commande ; `VueMatchEnLigne.resume`, `resumeMatchEnLigne`) : un match
  TERMINÉ arrive en résumé (score, chrono, statistiques d'équipe) ; l'écran demande son détail à l'ouverture par `&direct=<match>`
  (`detailDemande` dans `CarriereEnLigne.tsx`) et `fusionnerVueLigue` le garde d'un sondage à l'autre. Division 1 : **1 730 → 401 Ko**
  (181 → 48 compressés). Un match en cours n'est jamais résumé ; un écran d'avant ne demande rien et reçoit tout.
- Bancs : `npm run verify:reprises-match` (133 contrôles : la vue d'une instance qui reprend est identique, octet pour octet, à celle
  d'une instance qui rejoue tout — à la 12ᵉ, 27ᵉ, 33ᵉ, 54ᵉ et 67ᵉ minute, avec consignes et décisions ; points invalides refusés),
  `npm run verify:vue-legere` (106 contrôles). La table est posée sur la base du site et ses quatre requêtes y ont
  été essayées (7 octobre 2026). ⚠️ Pas essayé dans un navigateur (panneau caché), ni en production avant déploiement ; ⚠️ le journal des
  transactions d'une ligue n'est toujours jamais élagué (7 606 lignes, 4,7 Mo dans la plus ancienne).

**5. Les données joueurs** (`npm run audit:joueurs`, rapport `serveur/AUDIT-JOUEURS.md`). ⚠️ `actualiserCartesCatalogue` réécrit les cartes déjà
distribuées à chaque ouverture de ligue : un import se propage donc partout. Trouvé : 36 292 licenciés passés d'un poste tiré de leur rang à leur
vrai numéro FFR (import du 1ᵉʳ octobre) ; 18 professionnels qui héritaient du poste d'un homonyme amateur (`profilJoueurFfr` cherchait le NOM SEUL
quand le club n'était pas une structure FFR — corrigé) ; 80 identifiants passés d'un amateur à un professionnel du même nom (`sourceId` =
`reel:<nom>`, le mieux noté gagne). Une carte d'amateur ne suit plus un professionnel d'un autre club, et un portrait ne s'efface plus.
⚠️ **L'empreinte du moteur a bougé avec ces effectifs** : IA 3 `6aca6be7` (au lieu de `94f2ae2e`), IA 4 `ae1c2767`, IA 5 `7630dda3` — vérifié que
le commit d'origine avec la SEULE correction des effectifs donne les mêmes valeurs aux niveaux 3 et 4 (le moteur n'a pas changé).
⚠️ Non fait : le registre d'identifiants pour séparer les homonymes (il change des identifiants), et la lecture de la base de production (`--neon`).

**6. Le jeu vivant (IA 5 : carrière 3D et ligue)** — `jeuVivant(e)` dans `moteur/conquete.ts`.
- **Sirène** : une pénaltouche ou une mêlée de pénalité se joue (`arret(…, dePenalite)`) ; **pénalité manquée** : le ballon reste vivant
  (`BallonLibre.deTir`), renvoi aux 22 seulement s'il meurt en-but.
- **Rythme** : mêlée (`MELEE_VIVE`), rituel du buteur en parallèle du replacement (`RITUEL_VIF`), touche (`CADENCE_TOUCHE`), placement retenu 12 s au plus.
- **Coups de pied** : armé par type (`FRAPPE_VIVE` : rasant 0,18 s … drop 0,50 s), dès le pas de la demande ; ⚠️ **on peut plaquer le botteur jusqu'à la frappe**, aussi en arcade (`plaqueurDuBotteur`), le geste
  s'interrompt, charge-down selon la distance.
- **Ruck** : le plaqué n'est plus téléporté (`ancrerLeRuck`, le regroupement se construit autour de lui) ; **grattage** seulement à portée et sur
  demande (`peutGratter`) ; **maul** : on peut en sortir (`PackHumain.libre`).
- **HUD** : les temps d'un pack se dessinent à 60 images par seconde et se jugent à l'instant du doigt (`Rythme`), barre de souffle colorée avec
  son plafond (`Souffle`).
- **Exclu** : il quitte la pelouse (banc pour un jaune, tunnel pour un rouge) et n'est plus dessiné. **Été** d'un joueur existant : tournée
  d'été contre trois hôtes différents, puis deux matchs de préparation avec son vrai club (`matchDePreparation`).
- ⚠️ **Corrigé au passage** : une touche dont le ballon finit au sol plantait le rendu à chaque image (`renderBall`, `correctif_24_ballon_sol.cjs`).
- Scène, hors git : `analyse-rn26/correctif_24_scene.cjs`, `_scene_tee.cjs`, `_tenues.cjs`, `_ballon_sol.cjs`, puis `node scripts/construireMoteur3D.mjs`.

**7. Le tutoriel de la ligue** (`tutoriel/parcours/ligue.ts`) : `league.portail` fait REJOINDRE la Ligue Publique (présenter, nommer son club,
écusson, le vrai bouton) ; `league.privees` dit une fois, à l'arrivée, qu'on peut créer ou rejoindre des ligues privées ; l'ancien pas-à-pas de
création (`league.creation`) ne se lance que si l'on pose le curseur dans « Nom de la ligue ». Essayé dans le navigateur, ordinateur et téléphone.

**8. Les statistiques d'utilisation** (`lib/usage/`, `components/LaboStatistiques.tsx`, banc `npm run verify:usage`, aperçu
`/scripts/apercuStatistiques.html`). Les modes solo vivent dans le navigateur : `usage/suivi.ts` (lancé depuis `main.tsx`, à part) REGARDE le
store sans s'y brancher — l'écran affiché donne le mode (`modeDeLEcran`), les changements de la carrière et de la collection donnent les
compteurs — et envoie un relevé anonyme (identifiant d'appareil tiré au hasard, secondes par mode, compteurs ; jamais un compte) toutes les
dix minutes de jeu et à la fermeture de l'onglet (`action=usage`, SANS authentification, tout borné par `validerEnvoi`, soixante relevés par
adresse et par dix minutes, jamais d'erreur visible). Tables `usage_jours`, `usage_compteurs` et `usage_carrieres` (`npm run base:appliquer`) ; le Labo (onglet
« Statistiques », Kiri seulement) ne lit que des sommes : Global, Collection solo, Carrière joueur (créé contre existant), Carrière
entraîneur, Hors classement (joueurs les plus incarnés), Rétention à 1, 7 et 30 jours selon le mode joué en premier.
⚠️ Une carrière ne se compte que si on la VOIT NAÎTRE (aucun match joué) : une sauvegarde rechargée n'en crée pas. Les instantanés anonymes suivent
le temps par carrière, les saisons, les matchs, les actives et l'abandon estimé (fermeture ou 30 jours sans activité). Le catalogue déjà chargé
par la Collection donne ses acquisitions, ses rares et son meilleur XV par postes ; un XV incomplet n'a pas de GEN. Le temps des visites courtes,
les changements de mode et minuit sont couverts par `verifierSuiviUsage.ts`. ⚠️ Le SQL Neon n'a pas été
essayé sur la vraie base (stockage local et banc seulement).

**9. Le catalogue en ligne se garde d'une visite à l'autre** (`catalogueSoloCommun.ts`, clé `destiny-rugby:catalogue-solo`) : il était versionné,
mais la révision tenue repartait de −1 à chaque chargement de page. Le préchargement de l'ouverture d'un pack existait déjà (`prechargementPacks.ts`).

**10. Le profileur** (`lib/profileur.ts`, `components/match/Profileur.tsx`, onglet « Profileur » du Labo ; scène :
`analyse-rn26/correctif_25_profileur.cjs` → `scene.mesures()`). Un réglage de CET appareil (`destiny-rugby:profileur`) : allumé, `Terrain3D` pose
un cartouche sur tout match en 3D — images par seconde, écart entre deux images et coût du dessin (moyenne, 95ᵉ centile, pire, sur 240 images),
appels de dessin, triangles, géométries, textures, toile, mémoire, requêtes du match — et chaque match de plus de dix secondes laisse un résumé
que le Labo aligne (douze séances, une note libre : « avant », « après »), avec filtres mobile/ordinateur/iOS/Android. Le coût CPU de la scène,
les mesures GPU asynchrones quand l'extension WebGL existe, la latence API et les erreurs réseau complètent ces séances. Éteint, il ne coûte rien. **Première mesure** (ordinateur de
développement, stade de campagne, 966 × 775) : 58 images par seconde, 17,4 ms entre deux images (95 % sous 27,8), 13,2 ms de dessin,
361 appels de dessin, 248 746 triangles, 272 textures, 201 Mo — point de départ historique. Le banc actuel `/scripts/apercuPerformances25.html`
compare les mêmes joueurs, stade, caméra et définition avec puis sans soudure/squelettes communs/élagage/animations économes : 395 → 267 appels,
12,66 → 10,07 ms CPU scène, 6,43 → 4,42 ms GPU (mesure locale du 7 octobre, pas une garantie pour tous les appareils).

**11. Les barbes et les moustaches** (`corps.js` : `fitBeard`, `REGLAGE_BARBE` ; `analyse-rn26/correctif_25_barbes.cjs` ; banc visuel
`/scripts/apercuBarbes.html?barbe=11&gros=1&hauteur=330`, les deux têtes de face et de profil). Elles tombaient en collerette autour du cou.
Mesuré sur les maillages : (1) elles ont été modelées pour une tête dont le nez est 2 cm plus bas et 1 cm moins en avant que celles du jeu
(la moustache de l'APK est à la hauteur de la BOUCHE des têtes du jeu), et pas du même écart sur les deux têtes ; (2) l'ajustement était
celui des cheveux — chaque sommet enfoui repoussé depuis le centre du CRÂNE, donc vers le bas pour un sommet de menton. `fitBeard` CALE la
barbe sur le nez de la tête qui la porte (aucune table par joueur, une troisième tête s'ajusterait seule ; `REGLAGE_BARBE` garde une
retouche fine par type de tête) puis ramène les sommets enfouis à la peau par lancer de rayon depuis un point situé derrière la bouche.
Regardé pour la moustache (01), un bouc (03), deux barbes courtes (06, 07) et deux longues (11, 15), sur les deux têtes. Ajustement final demandé :
recul de 8 mm sur l'arrière et 10 mm sur l'avant, pattes des barbes complètes vers le bord avant des oreilles, cheveux relevés de 1 cm.
Le relief des lèvres garde une épaisseur de 6 mm pour que la moustache ne traverse pas les facettes du visage.

**12. Première optimisation mesurée : les joueurs hors champ ne sont plus dessinés** (`analyse-rn26/correctif_25_elagage.cjs`, `elaguer`
dans `scene.js`, `mesures().elagues`). ⚠️ MESURÉ D'ABORD : 331 appels de dessin et 234 729 triangles QUELLE QUE SOIT LA CAMÉRA — rien n'était
élagué (les maillages animés portent `frustumCulled=false`). Chaque joueur est maintenant testé contre le champ de la caméra par une sphère
large (2,6 m), caché le temps de l'image, puis rendu visible. Cette première mesure porte sur le dessin ; la passe actuelle évite aussi
les poses de locomotion hors champ et loin du ballon, et restaure une pose complète au retour dans le champ ou lors d'une coupe.
Après : 6 à 10 joueurs écartés selon le plan, 299 à 338 appels, 205 000 à 232 000 triangles (−5 à −12 %). ⚠️ CE QUE CE PARAGRAPHE DISAIT ENSUITE ÉTAIT FAUX (« un joueur ne coûte que deux appels, le stade 270 ») : mesuré pièce par pièce, c'est l'inverse —
un joueur, c'est DIX maillages, 7 100 triangles et six squelettes ; les trente joueurs font ~300 des ~380 appels, le stade une cinquantaine
(three.js élague déjà ses morceaux un par un). Voir le paragraphe suivant.

**Passe d'optimisation (Correctif 25)** : squelettes communs et pièces compatibles soudées ; calcul des poses évité hors champ, doigts/yeux/mâchoire
et IK du regard allégés à distance (les indices des fondus restent ceux du squelette complet) ; matrices du stade statiques et cache borné
à un stade mobile/deux desktop ; équipements chargés selon besoin ; profils bas/moyen/haut et cadence 60/30 adaptative. La broadphase de
`placements.mjs` utilise une grille de proximité et un rejet exact sur les axes ; 10 800 positions comparées à l'ancien calcul sont identiques.
Le public du décor est déjà regroupé dans ses meshes : aucune population supprimée. Ne pas souder tout le stade au prix de perdre son élagage.
Validation matérielle iOS/Android et SQL de production encore nécessaires. Détails : `sources/CORRECTIF-25.md`.

⚠️ **`public/rn26/` EST PRODUIT, IL NE S'ÉDITE PAS.** Ses modules (`scene.js`, `corps.js`, `placements.mjs`, `proximite.mjs`…) sont écrits par
`node installer_apercu.mjs` (lancé aussi par `node scripts/construireMoteur3D.mjs`) à partir de `../analyse-rn26/apercu/match/`, HORS du dépôt.
Le 7 octobre, une session a retouché ces fichiers directement dans le jeu (économie d'animation, grille de proximité, barbes, mesure GPU) :
l'installation suivante aurait tout effacé. Ces retouches ont été reportées dans les sources à l'identique (vérifié : l'installateur
reproduit les fichiers installés à l'octet près), et l'installateur REFUSE désormais d'écraser un fichier modifié depuis sa dernière
installation : `node reporter_retouches_installees.cjs` (depuis `../analyse-rn26`) montre ce qui serait reporté, `--ecrire` le reporte.
Toute retouche du lecteur se fait dans `../analyse-rn26/apercu/match/` (par un `correctif_NN_*.cjs` rejouable), puis s'installe.

**Ce que la scène mesure, et ce que les mesures ont tranché** (`../analyse-rn26/correctif_25_{squelettes,stade,corps,cadence,mesure}.cjs`) :
- **Le banc** : `/rn26/index.html?stade=moyen&banc=1` puis `rn26.mesurer(8)` (ms par image, dont rendu ; appels et triangles sous les sept
  caméras) et `rn26.empreinte('wide')` (somme de l'image). `&sans=squelettes,soudure,elagage,cadence` coupe une optimisation.
  ⚠️ SANS `banc=1` DEUX CHARGEMENTS NE RENDENT PAS LA MÊME IMAGE (une image d'avance ou non selon que le panneau est visible), et les
  temps d'un chargement à l'autre varient de ±1,5 ms sur cette machine : un avant/après se mesure DANS LA MÊME PAGE
  (`scene.interne.unirSquelettes` / `souderLesPieces` appliqués à chaud).
- **Un squelette par joueur, pièces de même dessin soudées** (maillot + short + chaussettes ; corps + tête) : 10 maillages → 7 par joueur,
  192 squelettes → 33. Stade moyen, même page, mêmes images : télévision 336 → 242 appels, large 388 → 283 ; rendu 5,2 → 3,4 ms,
  image entière 7,4 → 5,2 ms (−30 %). Image identique (0 à 6 pixels sur 883 000 selon la caméra, arrondis de bord).
- **Le stade NE SE SOUDE PAS** : essayé par quart (388 → 378 appels, mais +15 % de triangles), par mailles de 40, 24 et 12 m (−5 appels au
  mieux). Il ne pèse qu'une cinquantaine d'appels à l'image ; seules ses matrices sont figées (`figerDecor`).
- **Ce qui ne coûte presque rien, donc qu'on n'a pas touché** : repasser sur toutes les matrices de la scène (2 485 nœuds) prend 0,28 ms ;
  le moteur de match, 2,4 ms par SECONDE simulée. Les modèles des joueurs sont déjà les « LOD2 » de l'APK : pas de second niveau de détail.
- **Cadence** (`mesures().cadence`, `pas`, `moyenneMatch`) : définition abaissée sous 45 images par seconde, puis 30 régulières (une image
  sur deux à 60 Hz, sur quatre à 120 Hz), retour à la pleine cadence seulement si une image coûte moins de 7 ms, avec une attente qui double
  à chaque échec (12 s → 2 min). Essayé avec un appareil simulé ; ⚠️ pas sur un vrai téléphone.
- **Labo → Statistiques → « Fluidité 3D »** : les compteurs `fluidite.<plateforme>.<tranche>` (un par match en 3D de plus de vingt secondes)
  par plateforme, avec le filtre Tous / Ordinateur / Mobile / iOS / Android, la part finie à 30 et la part à définition abaissée.
- ⚠️ `node verifier_destiny.mjs` (banc du lecteur) échoue sur « un joueur en posture de ruck doit être ancré » — aussi avec le
  `placements.mjs` d'avant la grille de proximité : cela vient du moteur (duels de ruck des Correctifs 23-24), pas de cette passe. À reprendre.
⚠️ Bancs qui échouent AUSSI sur le commit d'origine : `verify:animations-match` (receveurs de l'engagement, recontrôlé sur HEAD), `verify:laboratoire`
(les objectifs sont crédités une commande plus tard), `verify:triche` (une coupe aux récompenses démesurées est acceptée), onze contrôles de
`verify:carriere` (dotation, packs, durée de rejoue).

### Règlements de compétition, prolongations, transformation après la sirène, classement mobile (Correctif 29)

**Le règlement central** (`lib/competitionRules.ts`)

- ⚠️ **UNE ENTRÉE PAR COMPÉTITION, ET PLUS AUCUNE RÈGLE « DU BAS DE TABLEAU ».** `rulesFor(id)` rend le `CompetitionRules`
  d'une division ou d'une coupe : `standings` (`qualified`, `playoffs`, `promotion`, `directRelegation`,
  `accessMatchPositions` — comptées DEPUIS LE BAS, pour qu'une division à 12 ou 14 clubs se règle pareil),
  `poolQualification` (coupes : rangs qualifiés, rangs reversés et vers où), `knockout` (`allowDraw`, `extraTime`,
  `drawResolution`). Le module est une FEUILLE (aucun import du jeu) : le serveur le lit aussi.
- **Le même règlement partout** : `zones()` désigne les relégués (`phaseFinale`, `tournoi`), les montées
  (`promotion.ts`), les statuts du classement (`standingsStatuses`, `poolStatuses`), les divisions publiques
  (`serveur/divisionsPubliques.ts`, `onlineRules`). Ce qui est rouge à l'écran est ce qui descend.
- **Fédérale 1, 2, 3** : `directRelegation: 2, accessMatchPositions: []` — les deux derniers de chaque poule descendent
  sans jouer, autant de clubs montent de l'étage du dessous (champion, finaliste, puis classement : `pretendants`).
  Top 14, Pro D2, Nationale, Nationale 2, Régionale 1-2 gardent « le dernier descend, l'avant-dernier joue l'accès ».
  `PhaseFinale.relegues` / `barragistes` remplacent la lecture de `dernier` / `avantDernier` (gardés pour l'affichage).
- **Champions Cup** : `poolQualification { qualified: [1,2,3,4], transferred: { positions: [5], to: 'challengeCup',
  origin: 'CHAMPIONS_CUP_5TH' } }`. `EtatCoupe.qualifiedFrom` garde l'origine, `MatchFinal.qualifiedFrom` la porte dans
  le tableau ; les reversés sont têtes de série 13 à 16, donc à l'extérieur (jamais de tirage). `coupesDuClubALaDate`
  ajoute la Challenge Cup aux compétitions d'un cinquième (calendrier, écran Résultats, classement latéral, trophée de
  fin de saison). ⚠️ Le moteur reversait déjà le cinquième ; ce qui manquait, c'est l'affichage (« tête » à 2 places,
  aucun statut, la Challenge Cup absente de « mes compétitions ») et le trophée.

**Transformation après la sirène** (`moteur.ts`)

- ⚠️ **CAUSE** : le garde-fou « six minutes d'horloge après la sirène » appelait `clorePeriode` quelle que soit la
  phase. En match de dix minutes l'horloge court huit fois plus vite que l'écran : une longue séquence dans le rouge
  dépassait ce délai, et l'essai qui la concluait était suivi du coup de sifflet AVANT la transformation.
- `EtatMatch.transformationDue` (levé par `validerEssai`, baissé quand le tir est résolu) : `clorePeriode` refuse de
  siffler tant qu'il est levé pendant `aplatissage`, `tmo`, `transformation`, `tirAuBut` ou `penalite`
  (`coupDePiedDu`). Le garde-fou n'agit plus pendant ces phases (filet absolu : dix-huit minutes).
- ⚠️ Change la rejoue d'un match de ligue EN COURS uniquement s'il tombait sur ce cas : déployer hors match.

**Prolongations** (`lib/couperet.ts`, `moteur.ts`, `MatchLive`)

- `departageDuMatch(cle)` lit le règlement (`matchRules`) et le passe à `creerMatch` (`OptionsMatch.departage`). À
  égalité à la fin de la période 2, `clorePeriode` ouvre la période 3 puis 4 (2 × 10 minutes) sur LE MÊME état :
  fatigue, cartons, remplacements conservés ; `cotesInverses` alterne ; le chrono continue (80:00 → 100:00, libellé
  « Prolongation » dans `HabillageTV`). Si l'égalité persiste, `trancher` applique la procédure de la compétition
  (`essais`, puis `tirsAuBut`) et pose `e.issue` — le score ne bouge pas.
- L'écran inscrit l'issue (`inscrireIssueJouee`) avant l'enregistrement ; `departager` la rend au store. Un score
  resté à égalité est sauvegardé avec `vainqueurDesigne` (`MatchChampionnat`) / `vainqueur` (`ResultatMatchManager`),
  que `duel` lit AVANT le score : le vainqueur survit à un rechargement.
- **Non joué = départage abstrait** : un résultat automatique (avance déléguée, tableau simulé) garde ses trois points
  tirés de la clé ; `MatchFinal.prolongation` l'annonce (« a.p. ») dans l'arbre.
- **Pas fait** : la ligue en ligne garde sa prolongation CALCULÉE après coup (`resoudreEgaliteElimination`, jamais de
  nul) — la jouer dans le direct demande une nouvelle version de règles et un horaire de match variable ; les matchs à
  élimination de la Coupe du monde (carrière joueur en sélection) gardent leur départage à trois points.

**Classement** (`components/TableauClassement.tsx`, `lib/nomCourt.ts`)

- Un seul tableau pour l'écran Résultats (joueur et entraîneur) et la ligue en ligne. Sous 600 px DE TABLEAU
  (`ResizeObserver`, pas la largeur d'écran) : `# · équipe · MJ · diff · pts`, nom sur deux lignes (`nomCourt` puis
  troncature), toucher une ligne déplie V/N/D, bonus, points pour et contre. Aucun défilement horizontal.
- ⚠️ **L'ÉCRAN NE DÉCIDE JAMAIS D'UNE COULEUR PAR UNE POSITION** : chaque ligne reçoit son `StandingsStatus`. Couleurs
  `--zone-*` à la fin de `App.css` (rouge relégation, orange accès, vert qualification, bleu barrages, violet
  Challenge Cup), doublées d'un symbole (`PRESENTATION_STATUT`) et d'une légende. `ClassementLateral` lit les mêmes.
- Aperçu sans sauvegarde : `/scripts/apercuClassement.html`. Banc : `npm run verify:reglements` (~6 min : 40 matchs
  détaillés pour la sirène, 36 prolongations).

### Les animations contextuelles et le jeu physique (Correctif 30 — carrière 3D et ligue)

Demande : « on revoit trop souvent les mêmes crochets, plaquages, rucks et touches. Une vraie bibliothèque d'animations
contextuelles, choisies selon la vitesse, l'angle, la puissance, le poste, la fatigue et la situation. Aucun choix purement
aléatoire. La variété ne doit pas être cosmétique : chaque animation doit correspondre à ce qui vient réellement de se
produire dans la simulation. »

⚠️ **TOUT EST DERRIÈRE `EtatMatch.ia` ≥ 6** (`jeuPhysique(e)` dans `moteur/animations.ts`). Carrière : `IA_MATCH_DE_CARRIERE` = 6.
Ligue : **règles 7** (`REGLES_MATCH_EN_LIGNE`, `iaDesRegles` → 6) pour les matchs créés désormais ; un match en cours garde ses
règles. Vérifié : le niveau 5 rejoue à l'identique avec et sans le correctif (`IA_EMPREINTE=5 npx vite-node
scripts/empreinteMoteur.ts 6` → `7c3b3a4d` dans les deux cas ; niveau 6 : `90b6ea8a`).

- **Le principe : le moteur LIT, écrit une VARIANTE, la scène la joue.** `moteur/animations.ts` — fonctions PURES, sans tirage —
  prolonge `duels.ts` : du même contact (angle, vitesses, rapport de force et de poids, équilibre, fatigue, bras qui tient le
  ballon, ligne d'essai, second plaqueur : `lireContexte`), il tire le geste. La variante voyage DANS L'ÉTAT
  (`ruck.plaquage.variante`, la `variante` d'un geste, `ruck.duel.sequence`, `conquete.jeu`, `aplatissage.style`,
  `tir.celebration`) : la scène n'a qu'à la lire, et le film d'un direct n'a rien de plus à transporter (seuls `altercation`,
  le niveau `ia` et la fatigue de geste `f` par joueur ont été ajoutés aux photos). ⚠️ **LA VARIANTE NE DÉCIDE DE RIEN** : le TYPE
  de `lirePlaquage` commande toujours la physique ; la variante reste dans sa famille (un plaquage dominant ne joue jamais un
  porteur qui gagne des mètres, un défenseur resté debout n'est jamais couché — le banc le tient).
- **La bibliothèque** : 22 plaquages aboutis (dont à deux, in extremis devant la ligne, épaule contre épaule, soulevé-porté,
  ballon protégé, défenseur qui glisse), 13 manqués (plongé trop tôt, passé dans le dos, contre-pied, une jambe — le porteur
  trébuche —, battu à la course, à genoux, percuté, assis, rebondi, resté planté, bras tendu, raffûté), 12 crochets (dont le
  crochet RATÉ, posé par le moteur quand le défenseur est resté devant : `requalifierGeste`), 6 raffuts, 5 percussions,
  8 déblayages, 5 grattages, 3 contre-rucks, 9 passes, 7 réceptions, 9 essais, 5 célébrations, 26 combinaisons de touche.
- **Le grattage en cinq séquences** (`ruck.duel.sequence`, durées dans `duel.temps`) : `rapide` (porteur isolé AU PLAQUAGE :
  `ruck.isole`), `conteste` (les soutiens tentent de le déloger, il tient), `penalite` (« ballon gardé au sol » : il tient malgré
  le déblayage, puis l'arbitre siffle), `perdu` (délogé par le soutien — `choregraphierLeDuel` le repousse vraiment),
  `tardif` (ruck formé, il plonge quand même : pénalité). ⚠️ **`perdu` EST RARE EXPRÈS** : montré à chaque ballon ralenti, il
  ajoutait onze séquences et quarante secondes de ruck par match (30 points par match au lieu de 37). Il faut un flanker déjà sur
  le ballon (1,4 m) dans un ruck nettement dominé (`equilibre` > 16) : 3,7 par match (mesuré sur 216 matchs ; rapide 0,5, contesté 0,8, pénalité 1,2, tardif 0,6).
- **Déblayages** (`lireDeblayage`, dans `animerRegroupement`) : épaule basse, poussée droite, de côté, à deux, accroché ; en face on
  résiste (il recule moins, le nettoyeur est renvoyé), on est repoussé, ou déséquilibré (il tombe). La scène N'ANCRE PERSONNE
  pendant un déblayage : le recul décidé par le moteur se voit. **Contre-ruck** : mené par ceux qui sont vraiment là
  (`contreursPresents` : un, deux, ou le groupe) ; à la fin le premier ramasse le ballon gagné, ou tous sont refoulés.
- **Plaquage dangereux** (`plaquageDangereux`, `lirePlaquageDangereux`) : l'irrégularité est tirée comme avant (`irregularite`,
  avec un `facteur` quand le contact s'y prête : `risqueDeGesteDangereux`) ; ce qu'elle EST se lit sur le contact — joueur
  soulevé (il faut un net ascendant de force ET de poids : un ailier ne soulève pas un deuxième ligne), charge sans les bras,
  plaquage haut, en retard. La GRAVITÉ (1, 2, 3) vient du danger réel — maîtrise de la chute (technique, discipline, fatigue du
  plaqueur), violence de l'impact — et c'est elle que l'arbitre applique (`siffler(…, 'aucun' | 'jaune' | 'rouge')`), s'il l'a VU
  (`visibiliteFaute`). C'est une FAUTE, jamais un geste à rechercher.
- **Altercations** (`moteur/altercations.ts`, `EtatMatch.altercation`) : rares, brèves, non graphiques — personne ne frappe,
  personne ne se blesse. ⚠️ Elles ne naissent QU'À UN COUP DE SIFFLET (le jeu est déjà arrêté, la pénalité attend), et jamais du
  générateur du match : l'envie se MESURE (`envieDAltercation` : cause, température, gravité, fautes récentes, discipline) et se
  compare à un seuil lu sur un tirage À PART (`tirageAPart`, graine du vent + instant + joueurs). Causes : geste dangereux,
  rancune d'un gros plaquage (`e.grief`, 35 s), fautes répétées, match tendu. Trois niveaux (`niveauAltercation`) : on se pousse
  et on se parle ; on se saisit par les maillots et deux joueurs viennent séparer ; regroupement général, l'arbitre et ses juges
  de touche séparent. Le jeu sait qui l'a DÉCLENCHÉE (`declencheurId`) et c'est lui que l'arbitre sanctionne
  (`jugerAltercation`) : rappel, dix mètres pour ou contre la pénalité qui attendait, jaune, rouge. Au plus deux par match.
  ⚠️ Ne pas confondre avec `bagarre.ts`, qui raconte ce qui arrive au joueur INCARNÉ (chambrage, ordres, commission).
- **Touches** (`moteur/touches.ts`, `annoncerLeJeuDeTouche`) : 26 combinaisons au lieu de 11, un seul tirage au prorata —
  faux saut, DOUBLE faux saut (`conquete.feintes`), sauteur qui vient d'un autre bloc et n'entre à sa place qu'au dernier
  moment (`conquete.glissement`, il y COURT), changement de cible, maul dont le ballon ressort ou qu'on contourne
  (`maul.suite`), et les lancements annoncés pour la ligne (`conquete.suite` → `lancerLaSuiteDeTouche`, posé quand le 9 a le
  ballon, avec les structures du jeu courant) : 9 → 10, premier centre lancé derrière l'ouvreur en leurre, centre servi derrière
  un coureur, croisée, le 9 dans le couloir. Chaque feinte aide le duel aérien et complique le lancer. Contres :
  `IssueTouche.cause` — saut mal minuté (`lout_jump_miss`), ballon effleuré, ballon retombé entre les deux alignements.
- **Passes, réceptions, pied, essais** : la passe et sa réception se lisent sur le vol (`poserVol` : longueur, hauteur,
  pression, ballon qui arrive derrière la course) ; le coup de pied est posé, tapé en course ou arraché sous la pression ; un
  contre se VOIT (bras levés, le ballon repart des mains du contreur, plus haut, et le botteur encaisse le contact —
  `contactDuContre`) ; neuf façons de marquer (`choisirEssai` décide aussi s'il plonge ou s'il pose) ; la fête dépend du score
  et de la minute (`choisirCelebration` : d'un seul coéquipier à toute l'équipe), et ceux qui encaissent accusent le coup.
- ⚠️ **LES « GESTES DE FAUTE » ÉTAIENT LES SIGNAUX DE L'ARBITRE.** `high_tackle`, `not_releasing_ball`, `not_rolling_away`,
  `collapsing_ruck_or_maul`, `not_releasing_player`… sont, dans l'APK, des clips debout et sur place (vérifié sur leurs
  courbes) : les signaux officiels. Le joueur fautif les mimait. Désormais le fautif joue SON geste (`FAUTES30` de la scène ;
  `GESTES_DE_FAUTE_6` ajoute la mêlée fautive, la charge, le joueur soulevé) et l'arbitre le signal de SA décision
  (`signalArbitre(e)`, remis à la scène dans `outils` : pénalité, plaquage haut, ballon gardé, plaqueur non roulé, hors-jeu,
  hors de ses appuis, écroulement, en-avant, passe en avant, mêlée, maul injouable, essai, vidéo, cartons, rappel, séparation).
  ⚠️ PAS de geste « avantage » : le moteur ne joue pas la règle de l'avantage, l'arbitre ne l'annonce donc jamais.
- **Poste et fatigue** : `profilAnimation` (lourd, troisième ligne, demi, centre, arrière) et `niveauFatigue` (0, 1, 2 — endurance
  ET souffle du moment, écrit sur `Pion.fatigue` à chaque pas) entrent dans les choix (crochet lourd, percussion du pilier,
  troisième ligne qui plaque-roule-se relève, défenseur cuit qui glisse ou tombe à genoux) et dans la posture de la scène
  (buste plus bas, relevé plus lent) — sans rien mettre au ralenti.
- **Scène** (hors git : `../analyse-rn26/apercu/match/animations.mjs`, `correctif_30_{chaine,scene}.cjs`) : la table variante →
  suite de clips, les gestes construits par cinématique inverse (main du raffut POSÉE sur le défenseur, mains du gratteur sur
  le ballon, maillot agrippé, bras de celui qui sépare, ballon brandi, écran de la vidéo), les **banques** — 382 clips (267
  avant) en neuf fichiers par morphologie ; seul `common` (5,1 Mo au lieu de 10,5) est attendu avant le coup d'envoi, le reste
  arrive en tâche de fond ou quand sa phase commence, et une suite dont la banque manque joue son repli —, et les **niveaux de
  détail** (loin du ballon et de la caméra, la pose n'est recalculée qu'une image sur deux ou trois ; place et cap suivent
  toujours le moteur). Détail : `../analyse-rn26/SIMULATION.md`.
- **Mesuré** (`npm run mesure:rugby -- 216 carriere3d 5` puis `6`) : IA 5 → IA 6, 216 matchs chacun : 37,1 → 37,6 points, 5,2 → 5,3
  essais (dans le bruit : l'écart type est de deux essais), pénalités 6,4 → 6,2, jaunes 0,77 → 0,62, rouges 0,05 → 0,08, rucks
  36,8 → 35,3, durée 15,0 min des deux côtés. Ce qui est RARE (`npm run mesure:animations -- 216`) : un joueur soulevé tous les
  24 matchs, une charge sans les bras tous les 54, une altercation dans un match sur onze (niveau 1 : 12, niveau 2 : 8, niveau 3 :
  aucun, sur 216 matchs) — un sur quatre quand la température ne descend pas sous 30, plus d'un sur deux au-dessus de 55 (c'est
  là seulement qu'on voit le regroupement général : 0,15 par match).
- **Ligue en ligne (règles 7)** : le résultat reste celui de la simulation unique du serveur ; chaque écran reconstruit la même
  animation depuis l'état filmé — aucun trafic de plus qu'un champ (`altercation`), le niveau `ia` et la fatigue de geste. Mesuré
  en temps réel (`npm run mesure:rugby -- 36 ligue 5` puis `6`) : 66,8 → 62,9 points, 8,4 → 8,2 essais, 32,1 → 32,2 pénalités,
  2,25 jaunes des deux côtés, 0,25 → 0,33 rouge, 81,1 → 81,6 min (36 matchs : dans le bruit). `verify:film-direct` et
  `verify:chronologie` passent en règles 7. ⚠️ Mise en ligne quand aucun match ne se joue, comme toujours ; revenir en arrière =
  remettre `REGLES_MATCH_EN_LIGNE` à 6.
- **Bancs** : `npm run verify:animations -- 12` (sélecteurs purs et atteignables, familles, chaque variante a sa suite et chaque
  clip existe, matchs entiers contrôlés à chaque pas, deux rejoues identiques, variété : 65 séquences différentes après un match,
  143 après douze) ; `npm run mesure:animations` ; `scripts/sonderAnimations30.ts` (ce que valent les grandeurs lues, pour régler
  un seuil sur ce que le moteur produit vraiment).
- ⚠️ **Pièges** : (1) un match d'IA reste FROID (température 0 à 11) — tout seuil réglé « à 35 » ne se déclenche jamais, il faut
  mesurer ; (2) une passe ne monte jamais à plus de 1,1 m au-dessus des mains : une « réception haute » se règle sur 0,85 ;
  (3) à l'instant où le ruck se dénoue les soutiens sont toujours arrivés — « seul sur le ballon » se lit au plaquage ;
  (4) `public/rn26/` est PRODUIT : l'installateur écrasait la retouche du vendor three (LUT), il la repose maintenant lui-même.
- **Pas fait / pas vu** : la règle de l'avantage (donc son geste) ; la plupart des variantes n'ont pas été REGARDÉES une par une
  (cinq séquences vues à l'image, voir `SIMULATION.md`) ; rien n'a été essayé sur un téléphone (banques à la demande, niveaux de
  détail) ni dans un vrai direct de ligue (le film transporte l'état, vérifié au banc seulement) ; le joueur incarné n'a pas de
  commandes nouvelles (ses crochets et raffuts prennent les variantes, c'est tout) ; pas de tutoriel ; les commentateurs ne
  disent rien des altercations ; la vue de haut (2D) ne montre aucune de ces variantes.

### L'écran géant et les conteneurs des stades de club (Correctif 31 — décors 3D)

- **Ce qui restait à l'image** : l'écran géant derrière l'en-but — un en campagne (`stade-club-1.glb`), deux au village
  (`stade-club-2.glb`) ; maillage `STADIUM_NORTH_TV_02_SCREEN (1)`, matériau `screen` — lit la première case d'un atlas de
  512 px : quatre rangées « logo du jeu d'origine | TRY! / CONVERSION! / GOAL! / PENALTY! ». Aucun habillage ne connaissait
  ce matériau. Les stades moyen, grand et international n'ont pas d'écran.
- **Corrigé** (hors git : `../analyse-rn26/correctif_31_ecran_stade.cjs`, sauvegarde `sauvegarde-avant-correctif-31/`, puis
  `node installer_apercu.mjs`) : `creerEcranGeant` (`habillage.js`) repeint les HUIT cases — Destiny Rugby à gauche, le TikTok
  du jeu à droite — et `chargerStade` (`scene.js`) pose la toile (1 024 px, 512 en mode léger).
  ⚠️ **SI LA TOILE NE PEUT PAS ÊTRE PEINTE, L'ÉCRAN RESTE ÉTEINT** (texture retirée) : il ne retombe jamais sur l'image
  d'origine. Ses teintes sont plus claires que celles des panneaux : sous l'éclairage de la scène leur vert sombre sortait noir.
- **Trouvé en relisant les textures** : `creerAbords` posait l'atlas des abords tel quel sur sa toile de 2 048 px. Celui des
  stades de club n'en fait que 1 024 : il n'en couvrait qu'un quart, et les conteneurs (39 en campagne, 28 au village, 24 au
  stade moyen) affichaient glacières, mains et ballons étalés sur leurs flancs. L'atlas est maintenant étiré à sa toile.
- **La relecture se rejoue** : `node verifier_marques_decors.cjs` (depuis `../analyse-rn26` ; `--sortir <dossier>` écrit les
  textures pour les regarder). Dix-huit textures distinctes dans les cinq décors, six portent une marque : l'écran (repeint),
  les panneaux (repeints), les deux atlas des abords (protections de poteaux : repeintes ; banderole verticale et ballons du
  bord de touche : lus par aucun morceau), l'atlas du Stade de France (couloir des joueurs : repeint) et celui de sa verrière
  (adresse de l'éditeur : lue par aucun morceau).
  ⚠️ **UNE MARQUE PEUT DORMIR DANS UN ATLAS.** Le banc échoue le jour où un décor la lit, ou quand une texture lui est inconnue.
- **Vu à l'image** (toile envoyée à un petit serveur local, panneau navigateur caché) : l'écran de campagne de près et depuis
  le terrain, les deux écrans du village, le mode léger, les conteneurs avant et après, poteaux et protections, le couloir du
  Stade de France, les stades moyen et grand. Capture : `verification-c31-ecran-stade.jpg`.
- **Pas fait / pas vu** : rien n'a été regardé sur un téléphone ni dans un vrai match de carrière (la page d'aperçu ne charge
  pas la police Anton : le titre y sort en Arial Black ; essayé à part avec Anton). Les fichiers `.glb` livrés contiennent
  TOUJOURS les textures d'origine — elles sont repeintes au chargement, pas retirées des fichiers. Les silhouettes blanches du
  bord de touche des stades de club (ramasseurs, photographes) sont un défaut d'avant, pas une marque : `exporter_stades.py`
  donne un émissif à tout matériau dont le nom contient « light », donc à `surround_objects_vertexlit_2021_lightswitching`.
  La page d'aperçu `/rn26/index.html` écrit encore « RN26 » (pastille « MODÈLES RN26 », légende de sa capture).

### La sortie d'un match ne peut plus rester figée — stockage plein, bagarre, onglets qui défilent (Correctif 32)

Signalé le 8 octobre 2026 : « sur iPad et iPhone 15, au moment de revenir sur l'écran d'accueil de la carrière ça crashe,
on est figé et on doit relancer le jeu » ; « quand il y a une bagarre ça bloque le jeu, on ne peut cliquer sur aucun des
choix » ; « en carrière entraîneur on ne peut pas scroller dans Infirmerie et Vestiaire ».

⚠️ **AUCUN iPhone ICI, NI MOTEUR WEBKIT.** Les causes ci-dessous sont lues dans le code et mesurées dans Chromium (émulation
tactile). Elles expliquent un écran figé ; rien ne prouve qu'elles expliquent TOUT ce qui est vu sur l'appareil — d'où le
fil de la fin de match, qui dira où un iPhone s'arrête (voir plus bas).

**Bagarre** (`MatchLive`, `ControleDirect`, `.ml-hud .ml-bagarre`)

- ⚠️ **EN CONTRÔLE DIRECT, AUCUN ORDRE NE RECEVAIT LE DOIGT.** Le HUD du pilote (`.cd`, z-index 6) pose trois zones tactiles
  qui couvrent presque tout l'écran (joystick, balayages, caméra) et prennent le toucher MÊME éteintes ; le panneau de la
  bagarre, sans rang, passait dessous. Mesuré : `elementFromPoint` au centre de chacun des quatre ordres rendait
  `cd-zone-stick` ou `cd-zone-gestes`. Et la pause que la bagarre déclenche ouvrait le panneau « Pause » du pilote
  (z-index 40) par-dessus. Or `phaseBagarre` n'avance pas sans ordre : il fallait relancer le jeu.
- Le panneau passe au rang 45 ; `ControleDirect` reçoit `suspendu` (ni commandes ni panneau de pause tant que l'écran pose
  sa question) ; les ordres se donnent aussi au clavier, 1 à 4 (le chiffre n'est affiché que là où il y a un clavier).
- ⚠️ **TOUT CE QUI SE CLIQUE DANS `.ml-hud` PENDANT LE CONTRÔLE DIRECT DOIT AVOIR UN RANG AU-DESSUS DE `.cd`.**
- ⚠️ **ET LE MOTEUR NE TENAIT PAS LA BAGARRE** (`tenirLaBagarre`, `moteur/bagarre.ts`). `e.phase` valait « bagarre » à la
  déclaration, mais rien ne l'y maintenait : le contrôle direct continuait d'obéir (`piloterDirect` ne regardait pas
  `e.bagarre`, contrairement au contrôle par cartes), un coup de pied déjà armé partait (`e.piedPrepare`), une décision en
  attente pouvait tomber — la phase repartait AVEC la bagarre posée, `phaseBagarre` ne tournait plus, et l'ordre cliqué
  n'était jamais résolu : panneau affiché pour toujours. Reproduit dans le navigateur (bagarre posée, phase
  `ballonEnLAir`). Le pas du moteur ramène maintenant le match à la bagarre (au début du pas et avant de jouer la phase),
  annule le coup de pied armé, et personne ne conduit tant que l'ordre n'est pas donné. Sans joueur incarné il n'y a pas
  de bagarre : la ligue et l'empreinte du moteur ne bougent pas (`90b6ea8a` avant et après).
  Banc : `npm run verify:bagarre` (44 contrôles : chaque ordre, phase déplacée sous la bagarre, soixante pas de commandes
  en contrôle direct, garde-fou des 90 s, six matchs conduits au hasard — une bagarre posée est toujours la phase du match).

**Onglets du bureau d'entraîneur** (`App.css`, bloc `@media (min-width:1121px)`)

- Au-delà de 1 120 px (ordinateur, iPad en paysage) `.carriere-manager` est une colonne à hauteur FIXE et `overflow: hidden` ;
  seules les zones listées défilent. L'Infirmerie et le Vestiaire refaits (`.infirmerie27`, `.vestiaire27`) n'y étaient
  pas : leur contenu était coupé (mesuré : dernier bloc 184 px sous la fenêtre, aucun défilement). Ajoutés, avec
  `.manager-match-centre`. Dans le Marché, « Contrats de l'effectif » déplié mesurait 5 960 px dans une colonne de 793 et
  réduisait le marché à zéro : il prend au plus 55 % de la colonne et défile en lui-même.
- ⚠️ **TOUT NOUVEL ONGLET, ENFANT DIRECT DE `.carriere-manager`, DOIT ENTRER DANS CETTE LISTE.**

**Sortie de match** (`lib/sortieMatch.ts`, `lib/finMatch.ts`, `lib/pleinEcran.ts`, `lib/viewport.ts`, `MatchLive`)

- ⚠️ **SUR TÉLÉPHONE, « TERMINER » EST LA SEULE SORTIE DE L'ÉCRAN DE FIN** (ni Échap, ni bord de fenêtre où cliquer) : tout
  ce qui le retient fige le jeu. Deux attentes n'avaient aucune limite — la scène 3D (`scenesRendues`) et la reprise des
  écritures, qui LÈVE une erreur si le stockage refuse (voir plus bas) : la promesse de finalisation échouait, le bouton
  restait éteint pour toujours.
- `auPlus(attente, ms)` borne chaque attente et ne rejette jamais. La finalisation accorde `ATTENTE_SCENE_MAX` (2,5 s) à la
  scène et rattrape toute erreur de sauvegarde ; `MatchLive` déverrouille « Terminer » que la finalisation ait abouti ou
  non, et de toute façon huit secondes après la sirène. `sortirDuMatch` : la boucle obtient `DELAI_BOUCLE` (4 s), toute la
  préparation `DELAI_SORTIE` (7 s), puis **on navigue quoi qu'il arrive** ; `libererArrierePlan()` passe APRÈS le démontage
  du match (avant, c'était un filet sans effet : la fenêtre du match comptait encore comme ouverte).
- ⚠️ **ON N'ATTEND UN RETOUR DEBOUT QUE SI LE JEU A TOURNÉ L'ÉCRAN** (`verrouillerPaysage` → `paysageVerrouilleParLeJeu`). La
  sortie attendait « portrait » dès qu'un appareil tactile était tenu en paysage : 1,8 s d'écran mort après chaque match
  sur iPhone et iPad, où le navigateur ne verrouille jamais l'orientation. Mesuré en paysage tactile : la navigation
  partait 1 990 ms après l'appui, **143 ms** depuis. `image()` (viewport) a un filet de 120 ms : une image que le système
  ne dessine pas ne retient plus rien.

**Stockage plein** (`lib/persistanceNavigation.ts`, `lib/sauvegardes.ts`, `components/AlerteStockage.tsx`)

- ⚠️ **`localStorage.setItem` LÈVE UNE ERREUR QUAND LE SITE N'A PLUS DE PLACE, ET `persist` NE LA RATTRAPE PAS** : elle
  remontait dans le `set()` du store. Une carrière d'entraîneur pèse 600 000 à 900 000 caractères (mesuré sur deux vraies
  parties, dont 520 000 à 740 000 pour `manager.avancee`) : six emplacements pleins approchent le plafond de Chrome
  (environ 5 millions de caractères) et dépassent de loin celui de Safari.
- `ecrireSansFaillir` : rend d'abord ce qui se retélécharge (le catalogue gardé d'une visite à l'autre) et réessaie ;
  sinon le jeu CONTINUE en mémoire, `AlerteStockage` le dit (bandeau + liste des parties pour en supprimer une) et chaque
  écriture suivante réessaie — une écriture refusée n'est pas retenue comme « la dernière », l'ancienne sauvegarde n'est
  jamais tronquée. Un appareil où la place a manqué est noté (`destiny-rugby:stockage-serre`) : le catalogue ne s'y range
  plus tant qu'on n'a pas supprimé une partie.
- **`jsonEtroit`** : la partie, le compte et le catalogue sont écrits sans caractère au-delà de U+00FF (`\uXXXX`, que
  `JSON.parse` relit tel quel). Le moteur d'Apple tient une chaîne sur deux octets par caractère dès qu'elle en contient UN
  large, et Safari plafonne à 5 Mo d'OCTETS : la même carrière y pèserait 0,9 Mo au lieu de 1,8 (615 caractères larges sur
  899 717 dans la partie mesurée). ⚠️ **Déduit du code de WebKit, PAS mesuré sur un iPhone** : si Safari compte autrement,
  on n'y gagne rien et on n'y perd rien — vérifié sur une vraie sauvegarde, relue à l'identique après rechargement.

**Scène 3D** (hors git : `../analyse-rn26/correctif_32_sortie.cjs`, puis `node installer_apercu.mjs`)

- Chaque étape de `commencerLiberation` / `finirLiberation` tient seule (`tenter`) : une erreur ne retient plus le contexte
  graphique ni la toile. Les tranches se comptent en millisecondes de travail (6 ms par tâche), plus par seize ressources :
  libération 429 → 99 ms, attente avant la finalisation 411 → 45 ms.
- `creerApercuJoueur` (profil, création, personnalisation, boutique) ne rendait RIEN : chaque reconstruction laissait un
  maillot peint de 1 024 px (deux toiles de 4 Mo), des matériaux clonés et un squelette. L'ancien modèle est rendu quand
  le nouveau est prêt (`planLiberation` : les modèles en cache restent protégés), deux reconstructions croisées ne
  laissent plus deux joueurs dans la scène, et l'aperçu ne dessine plus hors de l'écran.

**Le fil de la fin de match** (`tracer`, `dernierFil`, `releverFilInterrompu` dans `lib/finMatch.ts`)

- Un téléphone figé ne laisse aucune trace. Chaque étape (jalons, étapes de la sortie, passage de semaine) est notée dans
  `localStorage` (`destiny-rugby:fin-match`) ; au lancement suivant, un fil resté ouvert part en compteur anonyme
  `sortie.<plateforme>.coupee-<dernière étape>` (famille `sortie`, `lib/usage/`), une sortie menée au bout en
  `sortie.<plateforme>.ok`, un refus du stockage en `.stockage`. **Labo → Statistiques → Fluidité 3D → « Fins de match »**
  les aligne par plateforme ; **Profileur → « Dernière fin de match sur cet appareil »** montre le fil en clair.
- ⚠️ Un fil arrêté sur `db_save_end` n'est pas un gel : le match était finalisé, le jeu a été fermé sur la feuille.

**Bancs** : `npm run verify:sortie-match` (85 contrôles : JSON étroit, stockage compté comme Safari, finalisation et sortie
bornées, fil) ; `npm run verify:bagarre` (44) ; `verify:fin-match` (111) ; `verify:memoire-3d`, `verify:modales`,
`verify:usage` inchangés.

**Mesuré au passage, PAS corrigé** : le catalogue mondial (78 083 cartes) est matérialisé au chargement de la page
(`catalogueBaseCarriere()` à l'import de `catalogueSoloCommun.ts`, puis au premier `effectifDuClub`) — une tâche de
**3,6 s** qui bloque le fil principal sur ordinateur, 58 Mo gardés ; plus de la moitié part dans la recherche des
portraits (`photoReelle`). Sur téléphone, c'est le plus gros gel du jeu, à chaque lancement.

**Pas fait / à dire** : rien n'a été essayé sur iPhone, iPad ni Safari ; la mémoire graphique n'est toujours pas mesurée ;
la sauvegarde reste dans `localStorage` (IndexedDB lèverait le plafond, mais rend la relecture asynchrone) ; `avancee`
pèse 80 % d'une partie d'entraîneur et n'a pas été allégé.

### Le coup de pied en une seule action, la caméra du contrôle d'équipe, la fiche des joueuses (Correctif 40)

Demande : « un input = une seule action de kick = une seule animation = un seul événement de contact = départ immédiat et
synchronisé du ballon » ; le contrôle complet de l'équipe (Carrière Entraîneur) avec la caméra de la Carrière Joueur ; les
cartes de joueuses avec leur image dans la fiche et le logo de leur ligue sous le club.

**Le coup de pied (IA de niveau 8 — `moteur/frappe.ts`, `frappeFranche(e)`)**

⚠️ **TOUT EST DERRIÈRE `EtatMatch.ia` ≥ 8.** Carrière : `IA_MATCH_DE_CARRIERE` = 8. Ligue : **règles 10** (`REGLES_MATCH_EN_LIGNE`,
`iaDesRegles` → 8) pour les matchs créés désormais ; un match en cours garde ses règles, revenir en arrière = remettre 9.
Empreintes vérifiées après le correctif : niveau 7 `6c96f0b0`, 6 `90b6ea8a`, 5 `7c3b3a4d`, 3 `6aca6be7` (inchangées) ; niveau 8 `ba4d9477`.

- ⚠️ **CE QUE LE MOTEUR FAISAIT** (mesuré, `npm run mesure:frappes` avec `IA_EMPREINTE=7`) : le botteur devait REVENIR où le coup
  de pied avait été demandé. À l'arrêt, 0,45 à 0,60 s entre la demande et le départ du ballon ; en course il dépassait ce point,
  l'armé était annulé, il freinait, revenait sur ses pas et l'armé repartait de zéro — **1,65 à 1,80 s, deux gestes de frappe,
  quatre à neuf mètres parcourus**. Même mal pour un ballon posé au sol : 23 armés pour 9 pénaltouches (le botteur arrivait
  lancé, était armé en passant, dépassait le ballon). Et un 9 encore « battu » à la sortie d'un ruck voyait sa boîte annulée
  puis redemandée à chaque pas (jusqu'à trois armés en 0,6 s).
- **Au niveau 8, un coup de pied est UNE ACTION** (`piedPrepare.id`, compteur `e.frappes`) :
  `demande ─(orientation : 0 ou 1 pas)→ armé ─(amorce)→ CONTACT ─(suivi 0,3 s)→ reprise`. `armeA` et `contactA` sont écrits à
  la demande (`planDeFrappe`, pure) et ne bougent plus ; `etat` passe de `demande` à `arme` une fois (`armerFranche`) ; au
  contact `e.frappeFaite = { id, auteurId, geste, contactA, finA }`. Le botteur ne revient nulle part : il tape de là où il
  est, sur sa course (`conduireLeBotteur` — il freine seulement pour un drop ou une boîte).
- **Une amorce par geste**, en PAS du moteur (`AMORCE_EN_PAS`) : rasant 1, par-dessus 1, course 2 (dégagement, occupation,
  chandelle, transversale), drop 3, boîte 3 (le 9, à la sortie d'un regroupement, presque à l'arrêt : `aLaSortieDuRuck`).
  Pénalité et transformation gardent leur rituel (`tir`). ⚠️ En pas, pas en secondes : le contact tombe sur un pas, et la
  scène — qui affiche le match un pas en retard — a un pas de plus pour dérouler son clip.
- **Plaquable avant le contact, pas après** : `plaqueurDuBotteur` abandonne le geste (jamais rejoué) ; si le plaquage est
  MANQUÉ, la même action continue au même instant de contact (`manques`). Au contact, le contre et la gêne se jugent sur qui
  est là (`contreurDuDrop`) : le tirage « contré » fait à la DEMANDE du coup de pied du joueur est supprimé au niveau 8, et
  le contre de la chenille (1 sur 12) n'est plus un ballon qui part tout seul — le 9 arme, le défenseur monte, le contre
  tombe au contact (`contrePar`).
- **Un ballon posé au sol** (pénaltouche, renvoi : le « placement ») : numéro d'action aussi, le botteur FREINE sur sa marque
  (`deplacer(…, vif)`), n'arme qu'une fois presque arrêté, et un armé ne se relance plus.
- **Une seule commande** (tous niveaux, côté joueur) : un second appui pendant qu'un coup de pied attend son pas ou se prépare
  n'entre pas dans la file (`demanderDirect`), et `executerDemande` refuse en silence — deux appuis dans le même pas
  remplaçaient le premier coup de pied, en comptaient deux et relançaient le geste.
- **L'annonce** (`e.direct.frappeAnnoncee`, solo) : à l'image même de l'appui, `demanderDirect` écrit le geste et les instants
  que le moteur écrira à son prochain pas. La scène part tout de suite ; `piedPrepare` prend le relais sans que rien ne redémarre.
- **Mesuré** (`npm run mesure:frappes`, niveau 8) : demande → contact 0,30 s (rasant, par-dessus), 0,45 s (dégagement,
  chandelle, visé), 0,60 s (drop), À TOUTES LES ALLURES, un armé, zéro mètre à rebours. Dans le navigateur (18 images par
  seconde, rendu logiciel) : appui → animation 46 à 97 ms, appui → contact affiché 340 ms pour un rasant en course, 586 ms
  pour un coup de pied d'occupation à l'arrêt.
- **Équilibre** (`npm run mesure:rugby -- 96 carriere3d 7` puis `8`) : 37,2 → 37,6 points, 5,3 → 5,3 essais, 6,3 → 6,3
  pénalités, coups de pied dans le jeu 13,3 → 13,8, drops tentés 0,06 → 0,16, durée 15,1 → 15,0 min. Ligue, 72 matchs :
  80,1 → 81,3 points, 10,9 → 11,1 essais, 77,5 → 80,2 coups de pied, 81,2 → 81,1 min.

**La scène** (hors git : `../analyse-rn26/correctif_40_frappes.cjs`, sauvegarde `sauvegarde-avant-correctif-40/`)

- ⚠️ **DEUX HORLOGES, ET UN SECOND LECTEUR.** Le clip de frappe était calé sur les délais d'avant le jeu vivant (0,70 / 0,84 /
  1,12 s) alors que le moteur frappe en 0,18 à 0,50 s depuis le Correctif 24 ; et la branche générique des gestes rejouait le
  clip EN ENTIER dès que l'armé était annulé. Mesuré sur 45 coups de pied (`node verifier_frappes.mjs`, lecteur et moteur
  d'avant) : clip à **0,31 s** de son image de contact quand le ballon part, **61 gestes rejoués, 59 joués dans le vide, 15
  ballons partis sans geste** (le 9 derrière sa chenille ne tapait pas : sa boucle d'attente durait jusqu'au bout).
- `DestinyMatch.frappeDe` est le SEUL lecteur d'un coup de pied : une action, un clip choisi une fois, une horloge de clip
  qui ne recule jamais, et l'image de contact (`FRAPPES[clip]`) posée sur l'instant de contact du moteur —
  `outils.contactDeFrappe` (remis par `lib/match3D.ts`), puis le départ réel du vol. ⚠️ `FRAPPES` a été RELUE SUR LES OS
  (`node mesurer_clips_frappe.mjs`) : le rasant arraché était noté à 0,36 s, son pied touche à 0,16 s.
- Le ballon descend des mains vers le point où le pied le prendra et ne rejoint son vol qu'à l'image du contact (un drop
  touche la pelouse et repart du pied) ; le bruit de la frappe attend la même image. Le 9 de la chenille joue enfin
  `extending_ruck_kick_box_from_feet`. Les clips de frappe sont dans la banque `common`, attendue avant le coup d'envoi.
- **Après** (six matchs, 148 coups de pied) : écart nul à l'image de contact pour les sept clips, 0 geste rejoué, 0 dans le
  vide, 0 ballon sans geste, 151 armés pour 151 actions.
- **Profileur** (`lib/controleDirect/latenceFrappe.ts`) : le pilote note l'appui, la scène le début du clip et le contact
  affiché (`scene.frappesAffichees()`), le cartouche affiche « Appui → animation » et « Animation → contact ».

**La caméra du contrôle d'équipe** (`pilotage.ts`, `../analyse-rn26/correctif_40_camera.cjs`)

- ⚠️ **IL N'Y A PLUS QU'UN CHEMIN.** `cameraJoueur` avait une branche `collectif` : lacet vissé au dos du joueur, `orbiter`
  jeté (ni doigt, ni souris, ni stick droit), aucune assistance vers le ballon, et la caméra reposée d'un coup à chaque
  changement de joueur. `cameraPour` imposait en plus le plan « joueur » quel que soit le choix. Tout cela est retiré :
  c'est la logique de la Carrière Joueur (suivi de la course, 360°, ballon gardé à l'image, reprise de l'assistance après
  2 s sans geste), et seul le joueur suivi change (`scene.moi`).
- **Changement de joueur** : la caméra garde son lacet et `glisser(.38)` fond l'ancien cadre dans le nouveau (place,
  orientation, recul). La focale ne dépend que de la forme de l'écran : rien à interpoler. Mesuré dans le navigateur : le
  nouveau joueur glisse à l'écran sur environ 0,4 s (1 280 × 720 et 812 × 375 tactile) ; douze gestes d'orbite tournent la vue.
- La caméra « équipe » reste dans le menu ; elle n'est plus imposée, ni le défaut.

**Les joueuses** (`lib/imageJoueur.ts`, `lib/logoChampionnat.ts`)

- ⚠️ **LA FICHE NE LISAIT PAS LE PORTRAIT DE LA CARTE.** La carte (`CarteJoueurEnLigne`) affichait `carte.photo` ; la fiche de
  composition recevait un joueur fabriqué SANS ce champ (`carteEnJoueur`, en ligue et en collection) et cherchait un visage
  par le NOM dans l'index des photos — celui des joueurs. Une joueuse n'y trouvait rien, ou le portrait d'un homonyme :
  mesuré, « Bethan LEWIS » y prenait celui d'Ethan Lewis.
- **Une seule source** : `portraitsDe` / `usePortrait` — « Mon image », puis le portrait porté par la carte, puis l'index
  (jamais pour une carte spéciale, jamais pour une joueuse hors du monde féminin), sinon la silhouette de son genre. Jamais
  un cadre vide ni une adresse « undefined ». La carte, la fiche et la composition la lisent ; `Coequipier.gender` et
  `photo` voyagent avec le joueur.
- ⚠️ **LES CHAMPIONNATS FÉMININS N'AVAIENT PAS DE LOGO, NULLE PART.** Leurs douze logos étaient livrés (`LOGO_COMPETITION`,
  `f-…`) mais `logoChampionnat` ne parcourait que `COMPETITIONS`, le monde masculin. Mesuré sur les 1 803 cartes de
  joueuses : aucune ne trouvait le logo de sa ligue. Le pont nom → identifiant (`CHAMPIONNATS_FEMININS_PAR_NOM`, recopié
  pour ne pas charger le monde féminin avec chaque carte ; le banc vérifie qu'il dit la même chose) les couvre toutes, à
  graphie près. L'écusson d'un club féminin se lit dans sa table aussi depuis la fiche (`useBlasonCarte(…, feminin)`).
- AC Bobigny 93 → Élite 1 Féminine : le rattachement existait ; seul le logo manquait.

**Bancs** : `npm run verify:correctif40` (13 148 contrôles : gestes et amorces, demande → contact à toutes les allures,
instants figés, double appui, orientation, plaquage pendant l'amorce, niveau 7 intact, matchs entiers, clips préchargés,
1 803 cartes de joueuses) ; `npm run mesure:frappes` ; `npx vite-node scripts/sonderFrappesIA40.ts` (les coups de pied de
l'IA, par sorte) ; depuis `../analyse-rn26` : `node verifier_frappes.mjs`, `node mesurer_clips_frappe.mjs`. Aperçu :
`/scripts/apercuCorrectif40.html` (fiches de 18 vraies joueuses ; `?vue=cartes`). Adaptés : `verify:responsabilites` (le
drop contré lit `contactA`), `verify:correctif37` (la caméra n'est plus imposée).

**En ligue, règles 10** : `verify:film-direct` (5 565 pas rejoués identiques au moteur), `verify:chronologie` et
`verify:reprises-match` (133 contrôles : l'état du moteur, ses nouveaux champs compris, se dépose et se reprend) passent.

⚠️ **Échecs qui ne viennent pas de ce correctif** (rejoués au niveau 7, sans son code) : `node verifier_duels.mjs` (« trop de gros
impacts » : 21 pour 128 au niveau 7, 27 pour 127 au niveau 8, seuil 14 %) ; `node verifier_destiny.mjs` (« posture de ruck
ancrée », déjà noté plus haut) ; `npm run verify:direct-3d` (« touches jouées avant que l'alignement soit formé » : 5 sur 13 au
niveau 7, 3 sur 14 au niveau 8, 3 sur 8 en règles 2 — il passe toujours avec `--ia=2`) ; `npm run verify:assets` (quatre
portraits détourés d'amateurs, dont le nom de fichier contient une espace).

**Pas fait / pas vu** : un drop, une boîte et le 9 de la chenille n'ont pas été REGARDÉS à l'image (leurs instants sont
mesurés ; seul un dégagement a été suivi pas à pas) ; aucun vrai téléphone, aucune manette, aucun direct de ligue réel (le
film transporte `piedPrepare` et `frappeFaite`, vérifié au banc) ; la vue de haut (2D) ne montre pas ces gestes ; le
marché et l'ouverture de pack passent par la carte (source unique) mais n'ont pas été ouverts à l'écran ; les 616 joueuses
sans portrait gardent la silhouette.

### L'adjoint qui compose, les contrats réglés par l'assistant (Correctif 41 — carrière entraîneur)

⚠️ La demande est arrivée en deux fois : d'abord la fin de son point 14 et ses points 15 à 46, puis ses points 1 à 32.
Cette section couvre les points 33 à 46 et le point 15 ; l'atelier de combinaisons, le marché et l'IA communautaire
(points 1 à 32) ont la section suivante.

**L'adjoint** (`lib/adjointComposition.ts`, `lib/adjointManager.ts`, `components/RapportAdjoint.tsx`)

- ⚠️ **CE QUE FAISAIT L'ANCIEN CHOIX** (`compositionManagerParDefaut`, toujours utilisé pour les clubs que personne ne dirige
  et par la ligue) : poste par poste, le mieux noté parmi ceux qui portent EXACTEMENT ce poste, quel que soit son niveau. Un
  ailier gauche de 58 passait devant trois ailiers droits de 72 ; ni condition physique, ni enjeu. Et une feuille retouchée
  par l'entraîneur voyait un blessé remplacé par le premier titulaire « par défaut » encore libre, sans regarder la place :
  l'ouvreur blessé pouvait être remplacé par un talonneur (`reconcilerCompositionManager`).
- **Une seule grandeur décide : la note effective au poste** (`noteEffectiveAuPoste`) = note − pénalité de soins + forme,
  × `rendementAuPoste` (le barème du jeu : 1 / 0,82 / 0,64 / 0,6 / 0,5) × `facteurPhysique` (rien au-dessus de 80 % de
  condition, 0,45 % par point en dessous, pesé par l'enjeu ; jamais moins de 0,6). Un centre de 71 à l'aile vaut 58,2 :
  l'ailier de 69 passe devant.
- **Les vingt-trois places sont attribuées ensemble** (affectation optimale, le XV pesant cent fois le banc), et le banc
  COUVRE (`COUVERTURE_BANC`, dans `compositionManager.ts`) : talonneur, deux piliers, cage, troisième ligne, 9, 10, un
  trois-quarts. Six ailiers de 77 en réserve ne donnent qu'un ailier sur le banc.
- **L'enjeu** (`importanceDeLAffiche`, `importanceDuMatchManager`) : `finale` (la fatigue ne pèse presque plus), `decisif`
  (match couperet, adversaire plus fort de 3 points, trois dernières journées contre un adversaire à sa portée),
  `ordinaire`, `mineur` (adversaire plus faible de 6 points : on ménage plus tôt), `amical` (clé `prepa#` : les jeunes
  jouent). ⚠️ Le mode entraîneur n'a pas d'affiche amicale : ce niveau existe dans la bibliothèque, pas dans une carrière.
- **Les consignes** (`Manager.consignesAdjoint`, facultatif, sans migration) : « toujours titulaire si disponible » passe
  avant la fatigue — mais ne force ni un blessé ni un joueur que le médecin réserve au banc ; « ne pas sélectionner » cède
  si le groupe tombe sous vingt-trois ; « priorité jeunes » préfère, à niveau proche, le jeune de 23 ans au plus qui a de
  la marge — jamais en finale.
- **Le rapport** (`RapportAdjoint`, sous la composition) : la raison de chaque place (meilleur niveau effectif, rotation
  « pour faire souffler X », jeune lancé, consigne, couverture du banc, dépannage hors poste) et ceux qu'on s'attendait à
  voir (repos avec leur condition, indisponible, consigne, devancé par Y). ⚠️ L'écran ne décide de rien : il affiche
  `rapportAdjointManager`, la fonction que lit la composition déléguée. C'est aussi le moyen de repérer une décision absurde.
- ⚠️ **LA CONDITION LUE EST CELLE QUE L'ÉCRAN AFFICHE** : `ProfilMedicalJoueur.condition`, réglée par les minutes,
  le niveau de gestion, l'intensité et le repos (`formeCarriere.ts`), puis posée sur chaque joueur de la composition
  (`etatsPhysiquesManager`). `fatigue` porte la charge médicale cumulée et reste distincte du rendement immédiat.
- **Branchements** : « Meilleure équipe » et le bouton du terrain appellent l'adjoint ; « Compositions » déléguée
  (`semaineManager`) refait la feuille chaque semaine pour l'affiche qui arrive ; la feuille d'un banc qu'on prend
  (`feuilleDeDepart`) est celle de l'adjoint. `meilleureCompositionManager` a disparu (un seul algorithme).
  `reconcilerCompositionManager` comble maintenant un trou par le meilleur AU POSTE (un remplaçant monte s'il est le mieux
  placé) — c'est aussi ce que lit la ligue en ligne quand un joueur aligné part.
- ⚠️ **LE MOTEUR DU MODE ENTRAÎNEUR NE FAIT PAS PAYER UN HORS-POSTE** (seule la ligue le fait, `feuilleGeleeEnLigne`) : la
  feuille donne au titulaire le poste de sa place et garde sa note. L'adjoint suit le barème que l'écran affiche ; le
  résultat d'un match n'en dépend pas encore.
- **Mesuré** (`npm run verify:correctif41`, les 1 187 clubs du jeu, saison 1) : le XV de l'adjoint vaut plus que l'ancien
  choix dans 1 044 clubs, autant dans 143, moins dans aucun (+5,4 points de note effective cumulée en moyenne) ; titulaires
  hors poste 626 → 463. ⚠️ Vingt et un clubs ont deux licenciés sous le même identifiant (« DE CLERCQ » / « DECLERCQ ») :
  défaut de données antérieur, l'adjoint n'en garde qu'un.

**Les contrats** (`lib/contratsAutomatiques.ts`, `components/GestionContrats.tsx`, Marché mondial → Contrats de l'effectif)

- Un groupe qu'on reprend a un contrat sur quatre qui s'arrête à la fin de la première saison (un sur deux après 31 ans,
  `contratJoueurInitial`) : 16 sur 45 à Toulouse, 30 sur 91 à Bourg-en-Bresse.
- ⚠️ **L'ASSISTANT NÉGOCIE POUR DE VRAI.** Chaque dossier passe par la négociation de L'Ovale (`ouvrirRenegociationJoueur`,
  `negocierAvecJoueur`, `signerRenegociationJoueur`) : exigences cachées, patience, refus de prolonger s'il veut partir,
  marge sous le plafond salarial, prime à la signature prise sur le budget. Trois offres sous la demande (90 %, 94 %, 98 %
  du salaire ; 60 %, 80 %, 100 % de la prime), puis la contre-proposition du joueur acceptée si elle tient dans la
  politique, sinon une dernière offre au plafond. Mesuré : Toulouse, 15 signés pour 3 320 k€ contre 3 495 k€ demandés,
  2,3 tours en moyenne. ⚠️ Les salaires s'arrondissent à 5 000 € : sous 100 000 € par an, il n'y a souvent rien à gagner.
- **Deux temps** : `planContrats` (qui garder, qui laisser partir, pourquoi — pure, sans effet : c'est ce que la fenêtre
  montre avant de valider) puis `executerPlan`, dans l'ordre d'importance (les cadres négocient avant que la marge soit
  entamée). ⚠️ Le plan affiché est celui qui sera exécuté.
- **Le statut sportif se lit dans le groupe** (`statutSportif`), pas sur l'étiquette du contrat : `cadre` (dans les
  titulaires de sa famille de poste), `jeune` (23 ans au plus, 4 points de marge), `remplacant` (doublure), `complement`
  (troisième choix de moins de 30 ans qui joue un peu), `inutilise` (au-delà, ou moins de 15 % de temps de jeu après six
  matchs — rapporté aux matchs qu'il POUVAIT jouer, `tempsDeJeuReclamable`).
- **La politique** (`Manager.politiqueContrats`, facultative) : conserver les cadres, prolonger les jeunes, les remplaçants
  (oui / si le salaire reste raisonnable / non), durée maximale après 32 ans (1 ou 2 ans), plafond (selon le budget /
  hausses mesurées / presque aucune hausse), laisser partir les inutilisés, régler à la clôture. « Tout régler
  maintenant » = le même plan, sans rien laisser « à l'entraîneur ».
- ⚠️ **L'ASSISTANT NE PROMET PAS UN STATUT DE CADRE** à un joueur qui n'est pas titulaire à son poste (signer « cadre »
  inscrit une promesse de temps de jeu) : la négociation échoue alors sur le statut.
- **Un départ acté** (`EtatCarriereAvancee.decisionsContrats`, facultatif) : le joueur ira au bout de son contrat ; la
  ligne le dit, l'alerte de fin de saison ne le réclame plus, une signature efface la décision, l'entraîneur peut revenir
  dessus.
- ⚠️ **À LA CLÔTURE, L'ASSISTANT RÈGLE CE QUI RESTE** (`saisonManager`, par défaut) : il prolonge ceux que la politique veut
  garder, les autres partent libres. C'EST UN CHANGEMENT par rapport aux Correctifs 36 et 39 (« aucun renouvellement
  automatique ») : `politiqueContrats.cloture = false` rend l'ancien comportement, et `verify:cloture-saison` teste ce
  chemin-là. Dans les deux cas la saison se clôt.
- Un contrat amateur (sans salaire, défraiement par match) ne peut pas atteindre le seuil d'accord sous la demande (le
  barème de la négociation ne compte pas ses primes de performance) : l'assistant y accepte la demande au quatrième tour.

**Le point 15, vérifié** : la défense ne lit pas le cahier adverse. Seule l'équipe en possession exécute une combinaison
(`moteur/combinaisons.ts`, `moteur.ts`) ; aucun module de `moteur/ia/` ne référence le plan préparé ou en cours. Le banc
le garde (contrôle statique).

**Bancs et aperçu** : `npm run verify:correctif41` (1 825 contrôles, ~90 s) ; `/scripts/apercuCorrectif41.html`
(`?club=prod2`, `&fatigue=1` pour voir une rotation, `&langue=en`). Textes : `data/textesCorrectif41.ts` (`adj.*`,
`ctr.*`, sept langues). Essayé dans le navigateur à 1 366 px et à 375 px.

**Pas fait** : le hors-poste ne pèse pas sur le match du mode entraîneur ; pas de tutoriel ; le journal de la gestion
automatique est en français seulement.

### L'atelier de combinaisons, le cahier vivant, le marché et l'IA communautaire (Correctif 41, points 1 à 32)

Demande : « le joueur imagine une combinaison → la dessine facilement → la voit en 3D → la teste contre une défense →
l'équipe → l'utilise en match → la publie → d'autres l'utilisent », et les clubs sans entraîneur finissent par jouer ce
qui marche vraiment. ⚠️ Depuis le 14 octobre 2026 le cahier ET le marché sont **ouverts à tous les comptes
connectés** (`CAHIER_COMBINAISONS_OUVERT`, `MARCHE_COMBINAISONS_OUVERT`, `serveur/carriereApi.ts`) ; l'écran lit
`featureFlags.combinaisons` dans le compte public, et le serveur passe `accesCahier(compte)` à `agirCarriere`. Les deux
vont ensemble : ouvrir l'un sans l'autre n'a pas de sens. Les remettre à `false` rend la bêta du compte `kiri`. La
modération (retirer, rétablir) reste au compte interne dans tous les cas.

**Tester en 3D, sur le vrai moteur** (`lib/ligue/essaiCombinaisons.ts`, `components/TestCombinaison3D.tsx`)

- ⚠️ **CE N'EST PAS UNE ANIMATION DE L'ÉDITEUR.** L'essai crée un match avec `optionsMoteurDesRegles()` — LA définition des
  options de moteur d'une rencontre de ligue, que `monter()` lit aussi —, installe la situation
  (`installerSituationCombinaison`), charge le cahier d'un seul plan et laisse jouer. La fenêtre monte `Terrain3D`, la
  scène des matchs, et lui branche cet `EtatMatch` : courses, passes, cellules, contacts et erreurs sont ceux d'une
  rencontre. ⚠️ L'exercice 2D « avec opposition » de l'atelier (`oppositionCombinaisons.ts`) monte toujours le moteur
  d'origine : c'est l'essai 3D qui fait foi.
- Défense : sans défense (la conquête reste disputée contre un pack très inférieur, puis les défenseurs quittent le
  terrain au départ de la combinaison), faible (−10), normale, forte (+10) ; système glissée, montée agressive, repli.
  « Passer la mise en place » avance en silence jusqu'à la sortie du ballon (une mêlée dure 9,6 s, une touche 18,75 s).
- **Chronologie** (`ChronologieCombinaison`) : personne ne saisit un temps. Elle est MESURÉE sur un essai sans défense
  (le tirage qui va le plus loin, sur six) : « 0,5 s le 9 passe au 10, reçu à 1,4 s ». Un geste que le moteur n'a pas
  atteint est marqué « estimé ».

**Dessiner par ordres** (`lib/ligue/ordresCombinaisons.ts`, `OrdresCombinaison`, niveau Simple / Avancé)

- On touche un joueur, on lui donne un ordre : recevoir, course, fixer, leurre, croisée, soutien, rester large, cellule,
  passe derrière la cellule, jeu au pied, retirer ses ordres. ⚠️ **UN ORDRE N'EST PAS UN NOUVEAU GESTE** : `donnerOrdre`
  le traduit dans les gestes du cahier (passe, course, appel, pied) en calculant départ, profondeur et ligne de course.
  Le résultat est un cahier ordinaire — retouchable en Avancé, validé par `combinaisonsValides`, joué par le même moteur.
  Un ordre n'est jamais appliqué à moitié (cahier plein ou invalide : refus, variante d'origine rendue).
- `ordresPossibles` ne montre que ce qui a un sens (le porteur court, fixe ou tape ; après un coup de pied, plus rien).
- ⚠️ En Simple, **toucher un joueur le SÉLECTIONNE** (`TerrainCombinaison`, prop `ordres`). Sans elle, toucher un joueur
  pendant qu'un appel est sélectionné lui réaffecte cet appel : on donnait un leurre au 12, on touchait le 13 pour lui
  parler, et c'est le 13 qui héritait du leurre.
- La palette est posée APRÈS le terrain et collée au bas de l'écran (`position: sticky; bottom`) : tant qu'on regarde le
  terrain elle reste sous le pouce. Le niveau (Simple par défaut) est un goût de l'appareil (`localStorage`).
- **Bibliothèque d'exemples** (`exemplesCombinaisons.ts`, 23 plans : 4 ruck, 7 mêlée, 9 touche, 3 dix mètres) : bâtis avec
  les mêmes ordres, donc avec les vraies positions du moteur. **Zone des 10 mètres** (`zone: 'ligne10'`, à dix mètres de
  la ligne adverse) : ⚠️ un cahier sans plan de cette zone choisit exactement comme avant (vérifié sur 2 214 situations).
- **Emplacements tactiques** (`EMPLACEMENTS` : ruck 4, mêlée 3, touche 3, dix mètres 2 — douze, la taille du cahier) :
  le nombre de plans ACTIFS par situation. Ce qui dépasse est rangé (inactif), jamais supprimé. ⚠️ `rangerEnTrop`
  s'applique à l'ENREGISTREMENT (écran et commande `strategie`), pas dans `strategieValide`, que les rejoues relisent.
  Il n'existe pas de situation « coup franc » dans le cahier.

**Le cahier vivant — règles 11** (`moteur/lectureCombinaison.ts`, `EtatMatch.cahierVivant`)

⚠️ **TOUT EST DERRIÈRE `cahierVivant`**, posé par `optionsMoteurDesRegles` à partir des règles 11 (`REGLES_MATCH_EN_LIGNE`
= 11 ; même IA 8 que les règles 10). Un match créé avant garde ses règles ; revenir en arrière = remettre 10. Vérifié :
empreinte du moteur au niveau 8 inchangée (`ba4d9477`), et en règles 10 un cahier QUI PORTE des options se joue à
l'identique du même cahier sans elles. ⚠️ À METTRE EN LIGNE QUAND AUCUN MATCH NE SE JOUE.

- **Options et conditions** (`VarianteCombinaison.options`, six au plus) : `{ etape, condition, reponse }`. Au moment où le
  porteur de l'étape doit jouer (une lecture par étape, 0,3 s de regard), la première condition vraie ET jouable
  l'emporte : il joue la réponse (passe à un autre, jeu au pied, ou « il garde et attaque »), et **la combinaison
  s'arrête là** — le jeu libre reprend. Sans option vraie : le geste du cahier, l'« option principale ».
- Sept conditions : la défense monte vite, le receveur prévu est marqué, intervalle intérieur / extérieur ouvert, le
  joueur visé est libre, l'ailier adverse est monté, surnombre à l'extérieur. ⚠️ **AUCUN TIRAGE** : ce sont des géométries
  lues sur l'état (intervalles et surnombre sont ceux que le porteur de l'IA lit déjà, `ia/vision.ts`).
  ⚠️ **LES SEUILS SONT ÉTALONNÉS SUR LE MOTEUR** (`scripts/etalonnerConditions.ts`) : quand un ouvreur doit donner, son
  vis-à-vis est à 3 à 5,5 m et presque à l'arrêt, le défenseur le plus proche de son centre à 8 à 11 m. Une première
  version réglée « à vue » donnait des conditions toujours vraies (ailier monté, joueur libre) ou jamais (receveur
  marqué). Mesuré (ruck, 9 → 10 → 12) : montée rapide 20 à 30 %, receveur marqué 7 à 30 %, intervalle intérieur 6 à 45 %,
  joueur libre 0 % contre une montée agressive et 90 % contre une glissée, ailier monté 100 % contre une montée et 0 %
  contre un repli. Le surnombre ne se voit pas en première main (0 %) : il vient après une cellule.
- ⚠️ **C'EST L'ATTAQUE QUI LIT** : aucun module de `moteur/ia/` ne référence le cahier (contrôle statique de
  `verify:correctif41`). La défense défend ce qu'elle voit.
- **Touche** (`ToucheCombinaison`) : `doubleFeinte` (deux blocs montent pour de faux), `glissement` (le sauteur vient
  d'un autre bloc), `maul` (le pack porte ; le ballon ressort pour le 9 et **la combinaison reprend au geste de celui qui
  le tient** — `demarrerCombinaison` raccorde). Ils posent `conquete.feintes` / `glissement` / `maul.suite`, que le duel
  aérien et la scène lisaient déjà. ⚠️ Trouvé au passage : l'annonce de l'IA pour la touche (faux saut, sauteur qui
  glisse) débordait sur le plan du club — elle est effacée quand le cahier vivant prépare la sienne.
- **Mémoire tactique** (`memoireTactique`) : parmi les plans AUSSI adaptés à la situation (`candidatesCombinaison`), celui
  qui marche est rejoué, celui que l'adversaire contre laisse sa place, un plan pas encore essayé a sa chance :
  `(réussies + 1) / (jouées + 2) + 0,6 / √(jouées + 1)`. Un calcul par conquête, rien par image, aucun tirage.
- **Bilan de chaque combinaison** (`suivreCombinaison`, `e.bilansCombinaisons`) : essai, franchissement, ballon conservé,
  coup de pied, perdu, pénalité pour ou contre, avec mètres, passes et défenseurs battus. ⚠️ N'OBSERVE QUE.
- Abandon : receveur absent, quatre secondes sans pouvoir donner, ou réponse « garder » — le plan s'efface, le jeu libre
  reprend (c'était déjà le cas ; les options en font un choix).

**Le marché** (`lib/ligue/marcheCombinaisons.ts`, `serveur/marcheCombinaisons.ts`, `components/MarcheCombinaisons.tsx`)

- Onglets « Mon cahier / Marché » dans l'atelier. **Publier** : nom, description, type (jeu d'avants, au large, leurres
  et croisées, jeu au pied, lancement simple — proposé par `typeDuPlan`), difficulté ; la situation vient du plan.
  **Fiche** : auteur, version, date, ajouts, note des entraîneurs, et les chiffres des MATCHS — utilisations, matchs,
  mètres par utilisation, franchissements, défenseurs battus, conservation, essais, ballons perdus, pénalités concédées.
  « Voir la combinaison » ouvre l'essai 3D sur le plan publié ; « Ajouter à mes tactiques » fait choisir l'emplacement
  (libre, à la place d'une autre qui est alors rangée, ou rangée sans l'activer).
- ⚠️ **LE SERVEUR FAIT AUTORITÉ ET LE NAVIGATEUR N'ENVOIE JAMAIS UNE STATISTIQUE.** Elles sortent du moteur : à la sirène,
  `clore` agrège les bilans par plan (`EtatMatchEnLigne.combinaisons`, privé), `crediterCombinaisons` en crédite le club
  (`ClubCarriere.statsCombinaisons`, privé comme le cahier) et pose ce qui vient du marché dans
  `remonteesCombinaisons` ; `appliquer` (serveur) le verse puis l'efface. Le marché refuse un match déjà compté
  (`matchsVus`) : une écriture de ligue rejouée ne compte rien deux fois.
- **Score d'efficacité** (`scoreCommunautaire`, 0 à 100) : mètres, franchissements, essais, pénalités obtenues, moins les
  ballons perdus et les pénalités concédées ; tiré vers 50 tant que le volume est faible. ⚠️ **NI LES AJOUTS NI LES
  ÉTOILES N'Y ENTRENT**, et il n'existe pas avant 25 utilisations sur 3 matchs (`ECHANTILLON_MINIMUM`).
- **Modération** : nom et description passent un filtre (mots comparés UN À UN après normalisation — « contre » ne
  contient pas d'injure —, liens, répétitions) ; `empreintePlan` (le DESSIN au mètre près, sans le nom ni la zone) refuse
  la copie identique d'un autre auteur et le doublon d'une des siennes ; douze publications par compte, trois par jour
  (retirées comprises). Validation automatique sinon. Un signalement par compte ; au troisième compte, la fiche passe
  « en attente » et quitte la liste jusqu'à la décision du compte interne (retirer / rétablir).
- **Versions** : cinq gardées, chacune avec ses statistiques et sa note de changement. ⚠️ **RIEN N'EST ÉCRASÉ** : la copie
  rangée dans un cahier reste celle qu'on a prise ; le marché dit « nouvelle version disponible » et `mettreAJour`
  garde la place, l'état, la zone et le côté du plan.
- **Stockage** : table `combinaisons_publiees` (une ligne par fiche, écrite par comparaison de `revision`). ⚠️ SANS LA
  TABLE le marché est fermé, pas cassé (`npm run base:appliquer`) : liste vide, publication refusée, et les matchs
  gardent ce qu'ils doivent au marché (quarante au plus) jusqu'à ce qu'elle existe. La liste est gardée en mémoire par
  instance ; une sonde de quelques octets dit s'il faut la relire.
- Routes : `GET ?marcheCombinaisons=1` (liste), `=<id>` (fiche), `POST action: 'marcheCombinaisons'` (`publier`,
  `ajouter`, `noter`, `signaler`, `retirer`, `retablir`), `GET ?metaCombinaisons=1` (public, dix minutes de cache).

**L'IA communautaire** (`cahierCommunautaire`, `lib/iaCommunautaire.ts`)

- La **méta** = les fiches publiées qui ont dépassé l'échantillon minimum, classées par score. Un club sans entraîneur
  reçoit au coup d'envoi un cahier court (la moitié des emplacements) tiré dedans : poids = (score / 50)² × ce que son
  style aime (une équipe d'avants prend cellules, mauls, départs de mêlée ; une équipe joueuse le large et les leurres)
  × ce que son niveau sait jouer (sous 62, des plans simples ; à partir de 78, les plus riches). La graine (club,
  saison) lui garde son identité ; ce sont les SCORES qui bougent — donc la méta.
- Carrières solo : `MatchLive` appelle `equiperLesClubsIA`. ⚠️ **JAMAIS LE CAMP DU JOUEUR** (celui qu'il conduit ou
  entraîne). ⚠️ **SANS MÉTA RIEN NE CHANGE** : ni cahier, ni cahier vivant. La méta est lue au repos
  (`chargerMetaCombinaisons`, `main.tsx`) et gardée six heures sur l'appareil.
- En ligue tous les clubs ont un entraîneur ; les clubs-robots du Laboratoire ne reçoivent pas encore ce cahier.

**Bancs et aperçu** : `npm run verify:combinaisons41` (329 contrôles, ~1 min ; `--rapide`) — dont le vrai gestionnaire
HTTP et un match du Laboratoire joué jusqu'à la sirène, qui crédite le club et le marché une seule fois.
`scripts/sonderCahierVivant.ts` (fréquence des conditions, chaque exemple joué), `scripts/etalonnerConditions.ts`,
`scripts/sonderOrdresCombinaisons.ts`, `scripts/sonderEssaiCombinaisons.ts`. Aperçu :
`/scripts/apercuCombinaisonsMatch.html` (le vrai service du marché sur un tableau en mémoire ; `?marche=vide`,
`?moderateur=1`, `?langue=en`). Textes : `data/textesCombinaisons41.ts`, `data/textesMarche41.ts` (sept langues).
Essayé dans le navigateur à 1 366 px et 375 px : ordres, options, bibliothèque, essai 3D avec option jouée, liste et
fiche du marché, ajout à un emplacement, note, signalement, publication et nouvelle version.

⚠️ `npm run verify:carriere` s'arrête sur une erreur d'avant ce chantier (`verifCarriere.ts` demande un pack « avants » que
le catalogue n'a plus) : il ne couvre donc ni la sauvegarde du cahier ni la fin d'un match. C'est `verify:combinaisons41` qui
les joue, par le vrai gestionnaire HTTP. `verify:laboratoire` échoue toujours sur les objectifs crédités une commande plus tard.

**Pas fait / à dire** : le SQL de `combinaisons_publiees` n'a pas été essayé sur la vraie base (tableau en mémoire et
banc seulement) ; la méta reste vide — et l'IA communautaire sans effet — tant qu'aucune combinaison publiée n'a joué
25 fois sur 3 matchs ; aucun cahier communautaire pour les robots du Laboratoire ;
pas de situation « coup franc » ; l'exercice 2D de l'atelier n'a pas les règles 11 ; pas de recherche d'auteur ni de
pagination (six cents fiches au plus) ; le filtre de noms est une courte liste, pas un service de modération ; les
sélecteurs natifs et quelques libellés français d'avant restent dans l'atelier ; rien n'a été essayé sur un vrai
téléphone ; pas de tutoriel.

### Les publicités récompensées étendues (Correctif 42)

Trois usages s'ajoutent aux Ovas de la Boutique, chacun avec SON plafond quotidien (minuit, heure de Paris), tenu par le
serveur dans le registre du compte (`pub_comptes`) — jamais dans `localStorage`. Le principe ne change pas : clic
volontaire → publicité complète → reçu signé → récompense.

- **Quatre contextes** (`ContextePub`, `lib/publicitesRecompensees.ts`) : `SHOP_OVAS`, `DAILY_PACK` (ligue),
  `SHOP_PREMIUM_PACK` (Boutique), `COSMETIC` (avec `article`). `plafond()` et `memeUsage()` (serveur) disent ce qui
  partage un compteur.
- ⚠️ **LA LIGUE N'A QU'UN COMPTEUR.** Un pack qu'on ne peut pas payer ouvre `ManqueOvasLigue` (« Pas assez d'Ovas — il te
  manque N ») : si une récompense reste, « Regarder une pub et gagner un pack — 1 / 2 restantes » ; sinon « Tes 2
  récompenses publicitaires de Ligue ont déjà été utilisées aujourd'hui ». La fenêtre ouvre la MÊME session `DAILY_PACK`
  que la carte « Pack Pub » : deux par jour au total, toutes ligues confondues. « Obtenir des Ovas » mène à l'onglet du
  club. Coupable dans le Labo (`leagueFallbackEnabled`).
- **Pack Premium gratuit** (Boutique et Collection) : cinq par jour, indépendants des deux de la ligue. La roulette
  (`chancesPacksPremium`) tire dans les packs publicitaires ; sans réglage, tous sauf Bronze et Argent, d'autant plus
  rares qu'ils sont chers ; dès qu'un poids est saisi dans le Labo, seuls les packs qui en ont un. Le serveur tire au reçu
  signé. ⚠️ **IL S'OUVRE UNE FOIS** (`ouvrirPremium`) : la Collection solo tire ses cartes dans le navigateur, comme tous
  ses packs ; le serveur rend donc le pack à l'instant où il le marque ouvert, et un second appel reçoit
  `ALREADY_CLAIMED`, sans pack. Gagné dans la Boutique, il s'ouvre dans la Collection (`lib/packPremiumPub.ts`).
- **Cosmétiques** : `ConfigPublicites.cosmetiques[article] = { actif, requis, limiteJour }`. Par défaut les quatre
  articles `parPub` de la boutique, fermés depuis le retrait des pubs maison : casque rose 1 publicité, crampons graffiti
  3, maillots Vannes et Italie 5. ⚠️ **LE SERVEUR SEUL COMPTE** (`RegistrePublicites.cosmetiques`) : chaque réclamation
  validée ajoute un pas ; au dernier, l'objet est acquis, définitivement et sans répétition, puis LIVRÉ au coffre du
  compte (`octroyerCosmetique` → `achatsEquipements`, que la synchronisation réunit toujours à l'inventaire). Une
  livraison manquée est retentée à chaque lecture de la vue. Le Labo peut ouvrir à la publicité un article qui a aussi un
  prix : les deux chemins s'affichent côte à côte (`DeblocageCosmetiqueParPub`).
- **La Boutique** : la carte « Pack Premium gratuit », le filtre « Récompenses Pub », la jauge « Regarder 3 pubs — 1 / 3 ».
- **Une seule lecture par écran** (`chargerPublicites`, quatre secondes ; `publicitesModifiees`) : six offres ne font plus
  six requêtes, et une publicité regardée dans une offre met à jour les autres.
- **Une publicité à la fois par compte**, tous usages confondus ; une récompense validée mais pas ouverte se retrouve à la
  reconnexion (`enAttente` : « Tu as une récompense publicitaire non ouverte »).
- ⚠️ **LA ROULETTE NE FEINT PLUS.** Elle marquait un faux arrêt, repère allumé, sur une pochette prise au hasard six cases
  avant la bonne : quand c'était un pack rare, c'était un « presque jackpot » fabriqué. Une seule décélération jusqu'au
  pack tiré par le serveur ; les pochettes qui défilent restent tirées aux vraies chances, consultables.
- **Labo → Publicités** : Ligue (repli quand il manque des Ovas), pack Premium (activation, limite 0 à 5, poids par pack
  avec la chance obtenue), cosmétiques (activation, publicités requises, limite par jour, recherche d'article), et les
  statistiques par usage (`StatsPublicites.contextes`, à plat : `LEAGUE.completed`, `PREMIUM.rewards`…) : demandées,
  démarrées, terminées, complétion, récompenses, valeur en Ovas, utilisateurs uniques. ⚠️ Le revenu par publicité n'est
  pas transmis au serveur par AppLixir : il se lit dans leur tableau de bord.
- **Aucune migration** : le registre est du JSON, la livraison d'un cosmétique une simple mise à jour de
  `compte_boutique`, les statistiques par usage une somme de la même forme que `distribution`.
- **Bancs et aperçu** : `npm run verify:correctif42` (97 contrôles : vrai gestionnaire HTTP, reçus signés, compteur de
  ligue partagé, cinq packs Premium, ouverture unique, reprise après redémarrage, progression et livraison d'un
  cosmétique, lendemain, Labo) ; `verify:publicites` inchangé (94). `/scripts/apercuCorrectif42.html` (simulé ;
  `?epuise=1`, `?vue=labo`). ⚠️ Un panneau de navigateur caché ne tire pas `requestAnimationFrame` : la roulette y reste
  sur « Le pack arrive… ».
- ⚠️ **Non essayé** : la mise à jour SQL du coffre et la somme SQL des statistiques sur la vraie base (stockage fichier et
  banc seulement) ; une vraie publicité AppLixir (le reçu signé réel n'était toujours pas confirmé le 12 octobre) ;
  les textes des offres publicitaires sont en français seulement, comme avant.

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

`setContratsEffectifManager` installe les contrats de la partie dans la projection
du monde, à la création, à chaque changement du manager et au rechargement.
Le mercato réel ou simulé ne retire plus un joueur sous contrat du club entraîné ;
son `profil` conserve son identité. Les ventes explicites et les départs libres
gardent priorité. Une prolongation couvre la saison en cours puis la durée signée ;
à échéance, une demande de hausse salariale ouvre une prolongation. Dans L’Ovale,
une demande de départ et la négociation de contrat restent visibles dans le même fil,
y compris après un refus. Banc : `verify:contrats-manager` ; aperçu sans sauvegarde :
`/scripts/apercuContratsManager.html`.

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

**91 scripts** dans `scripts/verif*.ts`, à lancer sans navigateur. Les
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
npm run verify:tutoriel           # le tutoriel guidé : textes, ancres, placement des bulles, mémoire (30 700 contrôles)
npm run verify:bareme             # barème par compétition : un nul vaut 2, bonus en plus (Correctif 20)
npm run verify:modales            # l'isolement de l'arrière-plan se compte (gel après un match, Correctif 20)
npm run verify:boutique           # monnaies, prix, achats, inventaire, kits, Labo, coffre, fenêtres d'achat (Correctif 21)
npm run verify:vitesse-match      # ×1 à ×10, remplacement et simulation : même match quelle que soit la vitesse (132 contrôles, ~75 s)
npm run verify:resultat-match     # le score joué entre au classement, persisté, rechargé, effacé (18 contrôles)
npm run verify:carriere-existante # joueur existant : hors classement, carte intacte, monde sans son double (101 contrôles)
npm run verify:chronologie        # le direct d'une ligue : plusieurs instances, un seul match, aucun recul (Correctif 24)
npm run verify:marche-commun      # marché commun des divisions publiques : achat atomique, coupures, Ovas et cartes conservés (154 contrôles)
npm run verify:tenues             # deux tenues qu'on ne confond pas, tableau lisible, écusson lu à sa surface (51 302 couples de clubs)
npm run verify:delta-vue          # réponse compacte d'une commande : la vue tenue par deltas est celle du serveur (55 contrôles)
npm run verify:reprises-match     # points de reprise : une instance froide reprend exactement le match qu'elle aurait rejoué (133 contrôles, ~4 min)
npm run verify:vue-legere         # vue légère : détail d'un match terminé à la demande, gardé d'un sondage à l'autre (106 contrôles, ~2 min)
npm run audit:joueurs             # audit des données joueurs, lecture seule : photographie, comparaison, ligues, base (voir serveur/AUDIT-JOUEURS.md)
npm run verify:usage              # statistiques d'utilisation : relevés bornés, sommes, rétention, lecture réservée à Kiri (65 contrôles)
npm run verify:tournoi-final      # tournoi final des divisions à poules jouable, clés du tableau, départage (97 contrôles, ~55 s)
npm run verify:animations -- 12   # bibliothèque d'animations contextuelles : sélecteurs purs, chaque variante a sa suite, matchs contrôlés à chaque pas (Correctif 30, ~5 min)
npm run mesure:animations -- 216  # ce que le jeu physique produit de rare : plaquages dangereux, altercations, grattages par séquence
npm run verify:fin-match          # finalisation par étapes, une écriture, scène par tranches, dix matchs de suite (111 contrôles)
npm run verify:sortie-match       # sortie de match bornée, stockage plein sans erreur, JSON étroit, fil de la fin de match (85 contrôles, ~12 s)
npm run verify:bagarre            # une bagarre attend son ordre, tient le match (contrôle direct compris) et se résout toujours (44 contrôles, ~45 s)
npm run verify:propositions-collection # propositions de cartes : reçues, envoyées, refus, retrait, aucune duplication (83 contrôles)

npm run verify:correctif41       # l'adjoint compose (note effective au poste, condition, enjeu, consignes, banc couvert) sur les 1 187 clubs ; contrats réglés par l'assistant, clôture comprise
npm run verify:correctif42       # publicités récompensées étendues : compteur de ligue partagé, cinq packs Premium ouverts une fois, cosmétiques comptés par le serveur (97 contrôles)
npm run verify:combinaisons41    # atelier (ordres, exemples, emplacements), cahier vivant (options, touche, mémoire), marché (HTTP, match joué), IA communautaire (329 contrôles, ~1 min)

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
- **Paiements** : il n'y en a plus (Stripe retiré, voir la section de la boutique).


## Packs et trophées féminins (9 octobre 2026)

Les boutiques n'affichent que les packs possédant une pochette dédiée, sauf Bronze, Argent, Or et Élite garantie
(`packPropose`, partagé serveur/client). Les anciens packs gratuits retirés sont convertis vers un pack disponible.
Les divisions publiques restent limitées aux trois packs ordinaires et activent les cartes spéciales publiées.
Paliers d'ouverture : Bronze → Argent → Or → Élite/bleue → Mythique → Spécial → ICON. Ne pas rabattre une ICON
sur Mythique ; `PalierPack` est distinct de `RareteCarriere`. Les taux anciens du Labo sont plafonnés pour préserver
cet ordre. Le Bronze officiel existant reçoit la faible chance Élite/Mythique nécessaire aux sept paliers.
Le pack Élite français réunit Élite 1 et 2 : pochette Élite 2 au départ, Élite 1 uniquement si le tirage en contient.
Octobre Rose : octobre uniquement, 150 Ovas, dix cartes dont au moins une de l'événement, collection solo comme
Halloween ; ses cartes peuvent aussi sortir des packs ordinaires en ligne. Rien ne sort avant publication et image.
La révision du catalogue solo porte `:packs-femmes-v2` pour rafraîchir les événements et taux déjà mis en cache.
Les 26 nouveaux modèles sont optimisés par `scripts/optimiserPacksFemmes.mjs` (ne pas copier les GLB bruts).
Le catalogue contient 1 803 joueuses seniors réelles ; compléments FER, IRFU et North Harbour documentés dans
`sources/competitions/feminines/effectifs-complementaires.json`, générés via `scripts/collecterEffectifsFemmes.py`
puis `scripts/genMondeFeminin.cjs`. Les notes restent estimées dans le jeu. Les 84 clubs ont leur écusson dans
`logosFeminins.generated.ts` (plus un alias Northland Kauri), produit par `scripts/copierLogosFeminins.cjs`.
FPC : `f-fpc` Premiership et `f-fpc2` Championship, six clubs par division, cinq journées sans retour,
quatre qualifiés, une promotion/relégation ; anciennes carrières réaffectées selon le club. Les douze titres et
le Mondial féminin utilisent les modèles fournis. JJ Stewart est enregistré dans le catalogue des trophées.
Bancs : `npm run verify:packs-femmes`, `verify:cartes-femmes`, `verify:monde-feminin`,
`verify:collection-solo`, `verify:cartes-speciales` ; `scripts/verifierPacksFemmesUI.cjs` pour les sept
paliers, les dix nouvelles pochettes et le passage conditionnel Élite 2 → Élite 1 sur ordinateur/mobile.

## Intégration FFR 2026_10_FFR_FULL

Les cartes des joueuses réelles seniors de `mondeFeminin.generated.ts` sont disponibles dans les ligues féminines,
mixtes et dans la collection. Les renforts `generee` restent réservés à la carrière solo. Les divisions publiques sont
mixtes, y compris celles existantes lors de leur prochaine actualisation, et proposent uniquement Bronze, Argent et Or
(`packsActifsLigue`) ; les cartes femmes entrent dans ces packs ordinaires. Les packs féminins dédiés restent en
collection et ligue privée. Le marché commun utilise explicitement le pool mixte. Le catalogue solo reçoit les sources FFR approuvées
des deux genres et ajoute les packs féminins ; les effectifs solo filtrent selon `MONDE_FEMININ` pour préserver les
clubs homonymes. La Base joueurs du Labo conserve son autorisation interne. Banc : `npm run verify:cartes-femmes`.

Base privée de 470 742 profils, retrait des identités jeunesse et agrégats de formation. La validation des sources FFR
reste réservée à Kiri par autorisation serveur ; les cartes femmes publiées sont accessibles à tous. Voir
[serveur/FFR-INTEGRATION.md](serveur/FFR-INTEGRATION.md) pour les seuils, snapshots, commandes et limites de validation.



### Marché mondial et vivier solo

Sur PC, les contrats de l’effectif et les joueurs du marché partagent une seule zone de défilement ; les contrats sont repliés au départ. Les instantanés privés `2026_10_FFR_CAREER34` et `2026_10_FFR_CAREER34_V2` sont disponibles en production avec 792 profils chacun. Une carrière charge sa version épinglée, avec une session de compte, puis conserve sa timeline locale. `scripts/publierVivierCarriereFfr.mjs <version>` audite le snapshot ; `--appliquer` publie ses seuls profils privés dans une transaction, sans remplacer le catalogue de cartes actif. Les fichiers sources restent hors du répertoire public.

### Publicités récompensées — AppLixir

La boutique propose des Ovas volontaires ; les ligues proposent deux Packs Pub par compte et par jour (minuit Europe/Paris). Depuis le Correctif 42 : la même récompense de ligue est proposée quand il manque des Ovas pour un pack (même compteur), cinq packs Premium par jour dans la Boutique, et des cosmétiques qui se débloquent en plusieurs publicités (voir la section du Correctif 42). Le callback signé MD5 + TID valide seul la récompense, dont la réclamation et l'ouverture sont idempotentes. Le webhook utilise directement `https://www.destiny-rugby.fr/api/carriere?applixirCallback=1`, sans redirection. Le SDK suit `start` et attend sa fin de lecteur avant le nettoyage ; les erreurs asynchrones libèrent la tentative. Un reçu signé retardé prime sur une fermeture locale avant expiration, avec quota atomique. Les complétions locales en attente sont récupérables après rechargement, sans crédit client. Le Labo explique le maintien en Test jusqu'à l'approbation AppLixir et l'activation serveur ; une clé Test ne produit pas de statistiques Live.

Le catalogue publicitaire utilise le vivier mixte, avec les pochettes dédiées masculines, les championnats féminins, Bronze, Argent, Or et Élite. Les variantes sans texture propre sont exclues. Mythique est une récompense distincte du pack privé Kiri ; ICON et Créateurs sont exclus de la roulette. Halloween et Octobre Rose suivent la publication, les dates et le stock des cartes. Les cartes spéciales respectent l'autorisation de la ligue. Par défaut : Bronze 25 %, Argent 20 %, Or 10 %, autres packs 45 % ; les poids personnalisés du Labo remplacent ces valeurs. Les rayons payants restent indépendants.

Les vignettes WebP sont rendues hors ligne depuis les GLB et leurs textures par `npm run data:vignettes-packs`, sans scènes 3D supplémentaires dans la roulette. L'animation conserve le résultat serveur : une seule décélération jusqu'au pack tiré, puis des étincelles (le faux arrêt d'avant, « second élan », a été retiré au Correctif 42) ; le mouvement réduit supprime ces effets.

Bancs : `npm run verify:publicites` (serveur et SDK), `npm run verify:publicites-sql` (transaction Neon, données d'essai annulées). Aperçu local : `/scripts/apercuPublicites.html`, exclusivement simulé. Configuration serveur et étapes de mise en ligne : [PUBLICITES-APPLIXIR.md](serveur/PUBLICITES-APPLIXIR.md). Le 12 octobre, l'override et le webhook global sont enregistrés en MD5 + TID ; le visionnage complet réel reste sans reçu signé accepté. [Diagnostic fournisseur](serveur/DIAGNOSTIC-PUBLICITES-2026-10-12.md).

### Validation du classement des carrières (Correctif 38)

`lib/validationClassement.ts` remplace le crible strict dans la route active `api/classement.ts` et l'écran Classement. Le risque cumule les anomalies : ELIGIBLE (<30), LIMITED (30–59), PENDING_VALIDATION (>=60 ou données manquantes), REJECTED (incohérence forte). Les trois premiers restent visibles ; les carrières volontairement hors classement restent exclues. Les seules preuves d'intégrité exploitables viennent du serveur. Aucune signature solo n'est prétendue existante.

`serveur/validationClassement.ts` conserve les dossiers et leur journal avec révisions concurrentes. Le Labo `LaboValidationClassement` est dans AtelierKiri : règles, risques, identifiants et dates, filtres et décisions. `/api/carriere` et le service autorisent les décisions uniquement à l'identifiant authentifié `kiri`. Un score inférieur nouvellement envoyé ne masque pas le record précédent de l'installation. Le store conserve le résultat réel de synchronisation et réessaie les cas en attente sans exiger une hausse du score.

### Cartes normales et propositions de cartes

« Complète ta carte » → Proposer un club absent du jeu utilise `EffectifClubPropose` : les 15 postes distincts du XV
et au moins 8 remplaçants sont obligatoires avant l’envoi (jusqu’à 30 joueurs). Le compteur distingue XV et banc.
`validerClubPropose` impose la même règle à la soumission et à l’approbation, et refuse les fiches invalides et doublons.
Le Labo peut encore enregistrer les corrections d’un ancien dossier partiel, mais doit le compléter avant publication.
Les cinq onglets publics, le formulaire partagé et le suivi des demandes utilisent `textesContributionCarte.ts`
dans les sept langues, dates et erreurs comprises ; noms, messages et valeurs saisies restent inchangés.
`catalogueAvecClubPropose` prépare toutes les
cartes et l’identité visuelle avant l’unique écriture atomique d’approbation. Une correspondance nom + club conserve
la carte existante ; les nouveaux identifiants sont stables. Aucun club incomplet ne peut être publié.
Le blason est partagé dans `CatalogueAdmin.clubs` et résolu par `useBlasonCarte`, sans remplacer `photo` ni recopier
le logo dans chaque portrait. Les listes retirent aussi les images imbriquées ; modifier/accepter conserve le club
complet dans le JSON de la demande (stockage fichier et SQL). La limite d’envoi est 3 Mo pour 30 portraits de 90 Ko.
Bancs : `verify:contribution-club`, `verify:complete-carte`, `verify:contribution:navigateur` et `verify:traductions`.
Aperçu `/scripts/apercuContributionClub.html?langue=en` (serveur local sur 5188). La recette navigateur parcourt les
cinq onglets dans les sept langues, puis saisit et soumet réellement les 23 fiches sur ordinateur et au format mobile.
SQL vérifié par requêtes simulées, pas sur la base de production ; profils et bases temporaires nettoyés en fin de test.

Labo → Cartes normales crée ou modifie une carte ordinaire via `CatalogueAdmin.ajouts`,
avec la même identité pour les corrections. GEN, potentiel, poste, âge senior,
genre, club, championnat, nation et portrait sont saisis dans `FormulaireCarteNormale`.
Club et championnat utilisent des listes recherchables des deux mondes, selon le
genre de la carte (`clubsCarteNormale.ts`). Choisir un club renseigne championnat
et pays ; choisir un championnat filtre les clubs et efface un club incompatible.
Les valeurs historiques hors registre restent affichées dans les corrections.
Réglages → Créer ou corriger une carte envoie une proposition privée ; seul Kiri
peut la modifier, la refuser avec un motif ou la valider dans Demandes de cartes.
`demandes_cartes` conserve les révisions et cinq places d'attente par compte.
L'approbation et la publication du catalogue sont atomiques (CTE SQL ou une écriture
locale). Les corrections manuelles restent prioritaires sur les sources FFR.
Les photos ne traversent pas les listes de demandes. Banc : `verify:cartes-normales` ;
aperçu sans publication : `/scripts/apercuCartesNormales.html`.
Le détail privé d’une correction fournit à Kiri la carte actuellement publiée,
retrouvée par `sourceId` dans le vivier mixte ; elle n’est pas ajoutée aux listes
ni au détail du proposant. Le Labo compare les deux cartes côte à côte avec les
seules informations modifiées, mises à jour pendant les retouches. La même
comparaison sert à l’édition directe ; une carte introuvable est signalée.
Il s’agit de la version publiée au chargement, pas d’un historique à la soumission.

Migration atomique : `npm run migrer:classement38`. Audit/revalidation : `npm run audit:classement38`, `npm run revalider:classement38`. Le 11 octobre 2026 : 1 304 lignes existantes conservées, revalidées et visibles provisoirement ; les anciennes projections ne stockaient pas l'âge initial/version, 80 ont seulement un score. Les anciens refus ne sont pas quantifiables puisqu'ils n'étaient pas enregistrés. Aucun changement de sauvegarde. Détails et limites : [VALIDATION-CORRECTIF-38.md](VALIDATION-CORRECTIF-38.md). Banc : `npm run verify:correctif38` ; aperçu desktop/mobile `/scripts/apercuCorrectif38.html`.


### Confort des matchs solo — 15 octobre 2026

Les carrières joueur et entraîneur proposent **3, 5, 6, 8, 10, 15, 20 ou 40 minutes
par mi-temps** (six par défaut), à la création et dans Paramètres. Ce temps de jeu
à ×1 exclut les pauses, mises en place et temps additionnel ; le chrono sportif
garde ses repères de 40 et 80 minutes. Le choix vit dans la sauvegarde de carrière
(`dureeMiTempsSolo`), est normalisé au chargement sans migration destructive et se
fige à l'ouverture de `MatchLive`. Les prolongations suivent la même échelle ;
les accélérations et la simulation restent disponibles. Les matchs en temps réel
et en ligne ne lisent pas ce réglage. Sans option, le moteur conserve sa cadence
historique. Le placement des touches, mêlées et renvois passe à ×2, sauf pendant
une responsabilité ou un duel de pack. Banc : `npm run verify:duree-match` ; recette
ordinateur/mobile : `node scripts/verifierDureeMatchNavigateur.cjs` (serveur local
5188, profil temporaire supprimé après fermeture).

La publicité verticale de présentation (28 s, 1080 × 1920) se régénère avec
`node scripts/creerPublicitePresentation.cjs` : vrai match 3D, écrans joueur et
entraîneur, capture réelle du wiki pour la ligue, textes intégrés et ambiance du
jeu. Exports et légende dans `trailer/presentation-2026-10-18/`. Les rushes et le
profil du navigateur sont temporaires et supprimés dans un `finally`.

Les pénaltouches humaines et sorties « box » ouvrent une cible sur un plan du
terrain, réglable à la souris, au doigt, au clavier ou au stick. Le moteur attend
la frappe ; la portée dépend du botteur, et la possession après pénaltouche
reste régie par les règles existantes. Les tirs au but, engagements et charges
de coups de pied suspendent également le jeu pendant la visée.

Réglages → Manette propose la réassignation des boutons, avec échange des
conflits, sauvegarde locale et réinitialisation ; les indications du HUD suivent
la disposition. Réglages → Mon image affiche un accès par e-mail au retrait,
même sans compte, en plus du formulaire connecté soumis à vérification.

Recette : scripts/verifierConfortMatch.ts, verify:vitesse-match,
verify:responsabilites, verify:penaltouche. L'aperçu du contrôle direct accepte
confort=penalite ou confort=box. Les manettes physiques restent à essayer sur
matériel réel ; le lecteur a été vérifié avec des entrées Gamepad simulées.

### Retraits explicites de personnes

`src/lib/retraitsPersonnes.ts` bloque les profils retirés par nom et identifiant source, indépendamment des imports générés. Les catalogues et portraits appliquent ce blocage ; les anciennes carrières sont anonymisées à la lecture et les ligues retirent les cartes avec le mécanisme de compensation existant. Les réponses de l’API de production anonymisent aussi les anciens récits. Les références de match et les scores restent stables. Les imports FFR et de portraits ne doivent pas réintroduire ces profils. Banc : `node --loader ./scripts/chargeurTests36.mjs scripts/verifierRetraitPersonne.ts`. Les archives privées et les appareils hors ligne ne sont pas effacés à distance.
