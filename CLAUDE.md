# CLAUDE.md — Destiny Rugby 🏉

Guide d'architecture et de conventions pour travailler sur ce projet.
**Lis-le avant toute évolution**, et **tiens-le à jour** avec le `README.md` à
chaque changement notable.

## Le projet en une phrase

RPG de **carrière de rugby** solo : le joueur écrit ses actions en français, un
**Maître du Jeu servi par Groq** juge le résultat et fait évoluer les statistiques.
Inspiré des jeux type *Destin Eleven*, décliné pour l'ovalie.

## Préférences de travail (imposées par l'utilisateur)

- **UI et code en français** (noms de variables, commentaires, textes).
- Front **« pas IA »** = soigné, artisanal, belles animations, thème cohérent
  (stade nocturne / cuir / pelouse / dorures). **Jamais** un rendu générique.
- **Tester dans le navigateur** après chaque changement (aperçu `localhost:5173`,
  desktop **ET** mobile), pas seulement compiler.
- **Responsive obligatoire.**
- Tenir **`CLAUDE.md`** et **`README.md`** à jour à chaque évolution.
- ⚠️ **L'IA PASSE PAR GROQ** (`VITE_GROQ_KEY`), plus par un modèle local.
  Demande explicite : « reviens à une clé Groq au lieu d'un LLM local, c'est
  plus rapide pour répondre ». WebLLM, son Worker, ses 900 Mo de téléchargement
  et sa dépendance `@mlc-ai/web-llm` ont été **supprimés**. La clé du site est
  visible côté client : c'est assumé, personne n'a rien à saisir.
- ⚠️ **UN QUOTA ÉPUISÉ NE S'AFFICHE JAMAIS** (demande explicite). Le jeu bascule
  en silence sur son contenu pré-écrit et repart sur l'IA tout seul dès qu'elle
  se libère. Ne jamais afficher « quota exceeded », « réessaie » ou une bannière
  d'erreur pour ce cas — voir `lib/groq.ts` et `messageErreurIA`.
- **Le jeu reste ENTIER sans IA** : situations et scénarios pré-écrits, et un
  barème local (`jugementLocal`) pour trancher une réponse écrite.

## Stack

Vite 8 · React 19 · TypeScript · Zustand (+ persist) · Framer Motion ·
Three.js (@react-three/fiber + @react-three/drei) · Groq (API distante).

## Architecture

| Fichier | Rôle |
|---|---|
| `src/types.ts` | Types du domaine (`Joueur`, `Attributs`, `ReponseMJ`, `EntreeJournal`, `Ecran`…). |
| `src/data/rugby.ts` | Données statiques : `POSTES` (**15 postes numérotés 1-15**, chacun avec sa `famille` — les données réelles ne donnent que la famille ; `posteDepuisFamille()` attribue un numéro déterministe, `migrerPoste()` répare les vieilles sauvegardes), `NATIONS_PAR_ZONE` (**202 nations**, dérivées de `data/nations.ts`) + `NATIONS` (à plat), `ATTRIBUTS_LABELS`. |
| `src/data/evenements.ts` | Pool d'`EVENEMENTS` aléatoires (récit + deltas + Ovas), jouables **sans IA**. |
| `src/data/scenarios.ts` | `SCENARIOS` à **choix** (situation + options + issues, `transfert?` en option) — cœur du repli **sans IA locale**. |
| `src/data/clubs.ts` | **Assemblage** des compétitions : les 3 divisions pro françaises + les 13 championnats du monde viennent du fichier généré `mondeReel.ts` ; **Nationale 2 (26), Fédérale 1 (48), 2 (95), 3 (157)** restent saisies ici (blocs `NOM OFFICIEL\|Nom court` parsés) ; **Régionale 1 (63), 2 (60), 3 (62)** viennent du fichier généré `amateurs.ts`. Soit **655 clubs français sur 10 divisions**. `club()` accroche au passage le vrai logo amateur (`LOGO_AMATEUR`). `divisionDuClub()` (France), `competitionDuClub()` (monde compris), `clubParNom()`, `NOTE_PAR_NIVEAU` (niveaux **0-10**), couleurs auto par hash (⚠️ `>>>` non signé). |
| `src/data/mondeReel.ts` | ⚠️ **GÉNÉRÉ**. `COMPETITIONS_REELLES` (16 championnats, **143 clubs** avec nom, ville, **logo officiel**, couleurs de repli), `COUPES_EUROPE` (Champions/Challenge/Prem. Rugby Cup : clubs engagés), `COMPETITIONS_NATIONS` (10 compétitions de sélections **avec leur classement**), `LOGO_PAR_EQUIPE`. Les classements de CLUBS ne sont pas exportés : ils ne servent qu'au calcul des notes, dans le générateur. |
| `src/data/classementWorldRugby.ts` | Les **114 notes initiales** des sélections masculines, sur l'échelle World Rugby 0–100, avec les noms français canoniques du jeu. `NOTE_NOUVEAU_MEMBRE = 30`. |
| `src/data/effectifsReels.ts` | ⚠️ **GÉNÉRÉ**. `NOTE_CLUB_REEL` (note générale des 143 clubs) + `EFFECTIFS_REELS` (**6 306 joueurs réels** 25-26 : nom, poste, nation, âge, note, **potentiel**). Encodage **compact** (`nom\|poste\|âge\|note\|potentiel\|nation`, index pour poste et nation) : en objets littéraux le fichier ferait 700 Ko dans le bundle, ici 230 Ko. |
| `scripts/genMonde.cjs` | **Le** générateur. Lit `sources/data/base_rugby_finale.json` + `sources/data/tous_les_classements.json`, calcule les notes de club et de joueur, écrit les deux fichiers ci-dessus. Signale en console tout écart (équipe inconnue, logo manquant, vedette sans joueur). **Relancer** : `node scripts/genMonde.cjs`. |
| `scripts/ligues.cjs` | Table des championnats : `srcLigue` (nom dans les JSON), `echelle` `[note du dernier, note du premier]`, et pour chaque club `[nom court des données, nom dans le jeu, ville, note imposée?]`. **C'est ici** qu'on ajoute/renomme un club ou une division. |
| `scripts/vedettes.cjs` | Notes calibrées à la main (~450 internationaux). `ALIAS` réconcilie les anciennes orthographes LNR (« Grégory ALLDRITT ») avec celles de la base (« Greg ALLDRITT »). |
| `scripts/copierLogos.cjs` | `sources/logos/clubs/**/<club>.png` → `public/logos/<slug>.png`, **récursif** (les logos amateurs sont rangés sur deux niveaux), à plat et dédoublonné, accents retirés du nom de fichier. **689 fichiers de base** ; les générateurs des nouvelles ligues et les sélections portent le total public à 957. |
| `scripts/genAmateurs.cjs` | ⚙️ Générateur du **monde amateur** : lit `sources/data/clubs-regionaux/`, `sources/data/effectifs-amateurs/` et le pack `sources/logos/clubs/`, rapproche les noms des clubs du jeu (clé normalisée + repli par inclusion + `ALIAS_CLUB`), écrit `src/data/amateurs.ts` et `src/data/mercato.ts`. Signale les clubs sans effectif/logo et les équipes non rattachées. **Relancer** : `node scripts/genAmateurs.cjs`. |
| `src/data/amateurs.ts` | ⚠️ **GÉNÉRÉ**. `CLUBS_REGIONAUX` (185 clubs R1-R3), `LOGO_AMATEUR` (494 clubs), `EFFECTIFS_AMATEURS` (**384 clubs, 12 086 joueurs réels** — encodage compact `nom|indice de poste`). Les données ne donnent **ni âge ni note** : ils sont tirés côté jeu, seed = club + nom. |
| `src/data/mercato.ts` | ⚠️ **GÉNÉRÉ**. `MERCATO_REEL` : le **mercato estival réel** de 83 clubs (Top 14 → Nationale 2), **3 224 mouvements** (arrivées / départs / prolongations), encodés `nom|poste|nation|âge|club lié`. Décodé par `src/lib/mercato.ts`. |
| `src/lib/effectif.ts` | `effectifDuClub(club, saison)` = effectif de base **+ mercato**. Base : **effectif réel pro** vieilli, sinon **effectif réel amateur** (`effectifAmateur`, âge/note tirés), sinon des coéquipiers **déterministes** (seed = club+slot+génération), retraite 33-37 ans → **regens**, **nationalités pondérées** (`PART_FRANCAIS`). Aussi : `noteALAge()` (**progression vers le potentiel jusqu'à 27 ans, puis déclin**), `estEspoir`/`estDeclinant`, `forceEffectif(club, saison)` et `forceMoyenneDivision(division, saison)` (tous deux mémoïsés). ⚠️ L'ordre des tirages `rng()` est figé (prénom, nom, âge, retraite, talent, nation) — ne pas le changer sans adapter le « peek » de `effectifDuClub`/`cumulDebut`. |
| `src/lib/mercato.ts` | Décode `MERCATO_REEL` (`mercatoReel(club)`). |
| `src/lib/progression.ts` | **Évolution dynamique** : `noterSaison()` note la saison sur 10 (temps de jeu, essais vs `ESSAIS_ATTENDUS` du poste, niveau face au groupe, forme/moral, rang du club), `evoluer()` en déduit les points d'attributs (× facteur d'âge, **bonus formation avant 23 ans**, déclin après 31), les répartit par la **méthode du plus fort reste** (pondérée par les attributs clés du poste) et fait bouger le **potentiel**. |
| `src/lib/offres.ts` | **Marché** : `cote(j)`, `genererOffres()` (clubs dont la note est dans la fenêtre `cote−16 … cote+5`, **étranger à partir de 55 de notoriété**), `offreProlongation()`, salaires par niveau (`SALAIRE_PAR_NIVEAU`). |
| `src/components/Offres.tsx` | Panneau **« Choix de carrière »** (portal) : contrat en cours, cartes d'offres (logo, division, note du club, salaire, prime, durée), signature. |
| `src/components/Drapeau.tsx` | Vrais drapeaux **SVG** (lib `flag-icons`, locale) — les emojis drapeaux ne s'affichent pas sous Windows. `CODES` vient de `data/nations.ts` (202 nations) + quelques entités des données réelles. `ALIAS` absorbe les orthographes des données (« Afrique du sud », « Pays-de-Galles »…). `nomNation()` retire l'emoji de tête (compat anciennes sauvegardes « 🇫🇷 France »). |
| `src/components/Blason.tsx` | Écusson d'un club : **vrai logo** (`club.logo`, un `<img>` sur pastille sombre) si la base en fournit un, sinon blason SVG généré (initiales + couleurs). `LogoEquipe` fait la même chose pour une équipe dont on n'a que le nom (sélections). |
| `src/components/FicheClub.tsx` | Modale « effectif du club », ouverte au **clic sur un club** dans Championnats. Affiche note du club, force d'effectif et tous les joueurs poste par poste, pour la **saison en cours** de la carrière. Échap ou clic hors modale ferment. ⚠️ `createPortal(document.body)` obligatoire (backdrop-filter des `.carte`). |
| `src/components/Selecteur.tsx` | **Liste déroulante maison** (un `<select>` natif ne peut ni afficher de drapeau ni être stylé : son menu est rendu par l'OS). Gère vignettes, groupes, recherche (auto > 10 options), clavier (↑↓/Entrée/Échap), clic extérieur. Utilisée dans `Creation` (nation, division, club). ⚠️ Le défilement auto ne s'applique qu'au clavier (`parClavier`) — sinon la liste saute sous le curseur à l'ouverture. |
| `src/data/boutique.ts` | `SKINS` de ballon (`glb?` = modèle 3D dédié), `BOOSTS`, `PACKS` d'Ovas (achat réel non branché). |
| `src/data/trophees.ts` | `TROPHEES` (**54** : 46 titres d'équipe + **8 distinctions individuelles**) + `TROPHEE_PAR_DIVISION`, `TROPHEE_PAR_COUPE`, `TROPHEE_PAR_INTERNATIONAL`, `COUPE_EUROPE_PAR_DIVISION`, `MEILLEUR_JOUEUR_PAR_DIVISION`, `NATIONS_6N`. Chaque trophée pointe un `.glb` de `public/m3d/`. ⚠️ **`Trophee.individuel` est LE champ qui range un trophée** : il commande sa place dans l'armoire ET la façon dont on le gagne (`lib/honneurs.ts` au lieu du terrain). |
| `api/classement.ts` | **La fonction serverless Vercel du classement mondial** (à la racine, à côté de `src/` : c'est la convention Vercel, et c'est ce qui lui permet d'importer le barème du jeu au lieu de le recopier). `GET` = top 100, `POST` = débit, `verifierFiche`, RECALCUL du score, écriture du seul score. Déploiement : `serveur/VERCEL.md`. |
| `src/lib/classementEnLigne.ts` | Le côté navigateur : `envoyerAuClassement()`, `lireClassementMondial()`. ⚠️ Sans serveur, il renvoie une liste vide **sans lever d'erreur** — le classement local continue. |
| `src/lib/classementWorldRugby.ts` | Formule pure du classement **des sélections** : domicile +3, écart borné à ±10, nul/victoire, marge >15 ×1,5, Coupe du monde ×2, échange à somme nulle et notes bornées 0–100. Ne pas confondre avec le classement en ligne des carrières. |
| `src/lib/honneurs.ts` | **Les distinctions individuelles.** `noterSaisonIndividuelle()` cote la saison sur ~100 (note de saison ×7, statistiques comparées au poste, palmarès de l'année, rang du club, notoriété, au prorata des matchs joués) et `decernerHonneurs()` la compare aux barres. **Pure, déterministe, aucun tirage au sort** : le seul aléa est la barre, qui bouge de ±3,5 par saison (le rival de l'année). Appelée par `saisonSuivante` APRÈS `evoluer()` — c'est le seul moment où la note de saison ET le palmarès existent tous les deux. |
| `src/lib/armoire.ts` | La disposition de l'armoire, **fonction pure** (testable sans GPU). `detecterEtageres()` lit les tablettes sur la géométrie du `.glb`, `disposerArmoire()` place tout d'un coup — **distinctions en vitrine, titres d'équipe au sol**, boucliers adossés au coin avant du meuble — et `cadrage()` calcule la caméra pour l'ordinateur comme pour le téléphone. |
| `src/data/selections.ts` | Dérive de `COMPETITIONS_NATIONS`, `COMPETITIONS_NATIONS_NOUVELLES` et du classement World Rugby la liste dédoublonnée des **sélections** : `SELECTIONS_SENIOR` (les **114 nations classées**, une équipe par pays ; A/B/C/XV/Barbarians/Māori écartés par `RESERVES`) et `SELECTIONS_U20` (nom, logo, nation de base pour le drapeau, compétitions disputées). Les équipes des nouvelles compétitions apparaissent donc aussi dans l'onglet 🏳️ Sélections. |
| `src/components/TropheeGagne.tsx` | Cérémonie : modale + Canvas R3F, modèle recentré/normalisé **en rotation continue**, Sparkles, aura colorée. |
| `src/components/Confirmation.tsx` | Modale de confirmation maison. ⚠️ **Ne jamais utiliser `window.confirm()`** (bloqué/inconstant) et **toujours passer par `createPortal(document.body)`** : le `backdrop-filter` des `.carte` crée un bloc conteneur qui piège les `position: fixed`. |
| `src/data/legendes.ts` | `LEGENDES_FICTIVES` qui peuplent le classement (marquées `fictif`). |
| `src/lib/iaLocale.ts` | Pilote le Worker WebLLM et le cache, sérialise les générations, contient le **prompt système** du MJ, le parsing JSON et les garde-fous. `App.tsx` déclenche son préchargement différé en arrière-plan. ⚠️ **`plafonnerDeltas()` et `ressembleATriche()`** restent la vraie autorité. |
| `src/lib/iaSociale.ts` | Publications, commentaires et messages privés générés sur l'appareil. Chaque fonction possède un repli dans `lib/social.ts`/`lib/vie.ts`. |
| `src/workers/iaLocale.worker.ts` | Worker dédié à l'inférence : le modèle ne doit jamais tourner sur le fil React. |
| `src/store/useGame.ts` | Store Zustand persistant : `joueur`, `journal`, `coins` (Ovas), `inventaire`/`skinActif`, `pantheon`, réglages, navigation, négociations de contrat et logique de carrière. Exporte aussi `scoreCarriere`, `noteGlobale`, `classementComplet`. |
| `src/components/` | `Nav` (+ badge Ovas), `Reglages` (activation, progression et suppression de l'IA locale), `Jauge`, `PanneauJoueur` (badge **GÉN**, logo+club·division, 👥 Mon équipe, retraite), `Hero3D` (le rugbyman + son décor au sol ; **`ApercuBallon`**, exporté du même fichier, est l'aperçu de la boutique — il ne monte QUE le ballon), `ModeleBallon` (`useGLTF(url, true)` = **Draco**). |
| `src/screens/` | `Accueil`, `Creation` (division+club réels), `Carriere` (MJ + 📖/🎲 **limités à `MAX_PAR_SAISON`=2**), `Profil`, `Boutique`, `Pantheon`, `Classement`, `Championnats` (3 onglets France/Monde/Sélections ; clic sur un club → `FicheClub` ; l'onglet Sélections liste les **équipes** — séniors puis U20 — et non les compétitions), `Effectif` (coéquipiers). |
| `src/index.css` | Design system : variables CSS (couleurs, polices, rayons), reset, fond. |
| `src/App.css` | Styles des composants et écrans + **media queries responsive** (900px / 560px). |

### Boucle de jeu (cœur)

1. Le joueur tape une action dans `Carriere.tsx` (ou clique une suggestion).
2. `demanderAuMJ()` (`lib/iaLocale.ts`) transmet au modèle local : prompt
   système + fiche joueur + historique récent + action. WebLLM impose
   `response_format: json_object`.
3. La réponse JSON est nettoyée en `ReponseMJ` (`recit`, `evenement`, `deltas`,
   `choix`).
4. `appliquerReponse()` (store) applique les deltas (attributs bornés 0-100,
   argent ≥ 0) et ajoute deux entrées au `journal` (action joueur + récit MJ).

### Format de sortie imposé au MJ

Le prompt force un JSON strict. Stats autorisées dans `deltas` uniquement :
`vitesse, force, endurance, plaquage, passe, jeuAuPied, vision, mental`
(attributs, ±3), `forme, moral, reputation` (0-100, ±20), `argent` (€, signé).
Toute clé inconnue est ignorée par `nettoyerDeltas()`.

## Conventions

- **Nommage FR** : `joueur`, `saison`, `demanderAuMJ`, `ecran`…
- Couleurs via variables CSS (`--pelouse-*`, `--cuir-*`, `--or-*`, `--craie`).
  Ne pas coder de couleurs en dur hors du design system.
- Polices : `Anton` (titres display), `Archivo` (titres forts), `Inter` (corps).
- Animations avec Framer Motion, transitions douces (`ease: [0.2,0.8,0.2,1]`).
- La 3D reste **codée en géométrie** (pas d'assets/HDR externes réseau, pour
  rester hors-ligne et « pas IA »).

## Commandes

```bash
npm run dev      # aperçu localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run preview  # aperçu du build
```

Régénération des données réelles (sources regroupées dans `sources/`) :

```bash
node scripts/copierLogos.cjs   # sources/logos/clubs/** → public/logos/ (récursif, 689 fichiers de base)
node scripts/genMonde.cjs      # → src/data/mondeReel.ts + src/data/effectifsReels.ts
node scripts/genAmateurs.cjs   # → src/data/amateurs.ts + src/data/mercato.ts
```

Vérification des mécaniques **sans navigateur** (divisions, effectifs amateurs,
mercato, progression sur 8 saisons, offres, carrière complète pilotée par le
store) :

```bash
npx vite-node scripts/verif.ts
```

## Difficulté & anti-triche (demande explicite de l'utilisateur)

- **Le jeu reste EXIGEANT, mais la porte du très haut niveau est ouverte.**
  ⚠️ Réétalonné à la demande explicite de l'utilisateur : « c'est trop dur
  d'avoir une générale au-dessus de 80, fais que ce soit un peu plus accessible,
  moins dur mais quand même réaliste ». L'ancien réglage était **hors d'atteinte** —
  mesuré : sur 100 carrières, générale médiane 42 et **maximum 76**, donc
  personne n'atteignait jamais 80, et 0,02 titre par carrière.
  Étalonnage actuel (`npx vite-node scripts/verifDifficulte.ts`, 100 carrières de
  12 saisons, départ Nationale 2 à 18 ans, générale de départ 30-40) :

  | | avant | maintenant |
  |---|---|---|
  | médiane | 42 | **58** |
  | 1er quartile | — | 45 |
  | 90ᵉ centile | — | 80 |
  | maximum | 76 | **88** |
  | carrières ≥ 80 | **0 / 100** | **13 / 100** |
  | carrières ≥ 85 | 0 / 100 | 3 / 100 |
  | titres par carrière | 0,02 | 0,26 |

  Lecture : **le quart inférieur plafonne toujours en Fédérale** (45), la moitié
  des carrières s'arrêtent au niveau semi-pro (58), **une sur huit atteint le
  niveau international** (80) et **une sur trente devient une star** (85+).
  Ne pas retoucher sans relancer la mesure.
- **Ce qui a bougé, et seulement ça** (`lib/progression.ts`) : le terme de
  **TALENT BRUT** — la marge entre la générale et le potentiel — passe de
  `marge/11` plafonné à 2,2 à `marge/4.5` plafonné à 5,5, et le rabot final de
  convergence de `0,7 × marge` à `0,88 × marge` (il étranglait les dernières
  marches : un joueur à 74 pour un potentiel de 88 ne gagnait plus rien).
  ⚠️ **C'est volontairement un levier SÉLECTIF** : il ne profite qu'aux joueurs
  qui ont de la marge à rattraper. Un joueur né sans potentiel ne perce toujours
  pas — il n'a rien à combler. Le plancher de formation, lui, n'a quasiment pas
  bougé (0,42 → 0,40) : c'est ce qui empêche la médiane de s'envoler.
- **Potentiel à queue longue** (`creerJoueur`) : `gen + 18 + rand^1,5 × 44` — la
  plupart des joueurs plafonnent, un sur cent naît international.
- **Le MJ propose, le jeu dispose.** `appliquerReponse` fait passer TOUS les
  deltas de l'IA par `plafonnerDeltas()` : +2 d'attribut maximum par action,
  **budget de 4 points d'attributs par saison** (`BUDGET_IA_PAR_SAISON`), rien
  après 33 ans, argent plafonné au tiers du salaire annuel. Une action détectée
  comme tentative de triche (`ressembleATriche`) garde le récit mais **ne
  rapporte rien**, et une entrée « ⚖️ Réalisme » l'explique au joueur.
- Le gros de la progression doit venir du **terrain** (`lib/progression.ts`),
  jamais du dialogue avec l'IA.

## Performances (⚠️ Firefox)

- `.bloc-competition` : `content-visibility: auto` + `contain-intrinsic-size`
  (l'atlas affiche 655 cartes) et **`backdrop-filter: none`** — le flou
  recalculé sur toute la hauteur de page était LA cause des ralentissements
  sous Firefox. Même chose sur `.overlay-trophee` (flouter la page derrière un
  canvas 3D à 60 fps).
- `.club-carte` : `contain: layout paint style`, images en `loading="lazy"` +
  `decoding="async"`.
- Cérémonie 3D : `dpr` plafonné à 1,5, anti-aliasing coupé, `ContactShadows`
  calculées une seule fois (`frames={1}`), particules retirées sur machine
  modeste (`modeAllege()` : ≤ 4 cœurs ou `prefers-reduced-motion`).

## Lot 1 & 2 de la feuille de route (faits)

- **Calendrier réel** (`src/data/calendrier.ts`) : 43 semaines d'août à juin —
  23 journées, 8 dates de coupe d'Europe, 8 fenêtres internationales (tournée
  d'automne, Tournoi), 3 semaines de phase finale, puis la trêve qui clôt la
  saison. `semaineSuivante()` (store) joue UNE semaine ; pour avancer plus vite,
  on choisit une date dans le calendrier et `avancerJusqua()` joue réellement
  chaque semaine intermédiaire. Le bilan de fin de saison utilise les stats
  RÉELLEMENT accumulées (`Joueur.saisonEnCours`), pas une simulation.
- **Sélection nationale** (`src/lib/selection.ts`) : palier de niveau par nation
  (France 84, Italie 75, Espagne 65, défaut 55) + zone de concurrence aléatoire.
  Les capes s'accumulent dans `Joueur.selections`.
- **Montées / descentes** (`src/lib/promotion.ts`) : résolues pour le
  championnat du joueur (1 ou 2 clubs selon la taille), mémorisées dans
  `mouvementsClubs` (club → division). ⚠️ Les listes de `COMPETITIONS` ne sont
  pas réécrites : seul le joueur suit vraiment son club.
- **15 postes** : `PosteId` = les numéros 1 à 15 ; `FamillePoste` = les 9
  familles des données générées (`posteDepuisFamille` attribue un numéro
  déterministe). Migration `version: 2` du store pour les vieilles sauvegardes.
- **Statistiques détaillées** : points, tirs au but tentés/réussis, plaquages
  réussis/manqués, grattages, passes décisives, cartons — calculés à chaque
  match (`statsDuMatch`), cumulés dans la saison puis la carrière, affichés dans
  le Profil. ⚠️ Ils n'existent qu'en mode « journée par journée ».

## Lots 4 & 5 (faits)

- **202 nations** (`src/data/nations.ts`, « Nom|code » par zone) : source unique
  pour la création ET pour `<Drapeau>`, qui en dérive sa table de codes.
- **Générale de départ 30-40** (`attributsDeBase`) : 26-36 par attribut, +6/+10
  sur les attributs clés du poste, plafond 60.
- **Traits de caractère** (`src/data/traits.ts`, **24 traits** — 12 gratuits
  et 12 à débloquer en Ovas —, **2 au choix**) : chaque
  trait est LU quelque part — `effetsTraits()` cumule multiplicateurs et bonus,
  branchés dans `progression` (vitesse de progression), `blessures` (risque et
  gravité), la note de match, les cartons, et `offres` (nombre de propositions).
- **Vestiaire** (`src/lib/vestiaire.ts`) : `nouerRelations()` chaque intersaison
  (amitiés selon l'âge et la sociabilité des traits, rivalités plus rares),
  `bonusVestiaire()` sur la note de match, `meriteLeBrassard()` pour le
  capitanat (niveau vs groupe + mental + réputation + âge + mentorat + traits,
  seuil 45). Le brassard se perd en changeant de club.
- **Sélection par poste** : `convocation()` compare désormais le joueur aux
  MEILLEURS joueurs réels de sa nation à sa famille de poste (2 places par
  poste) — un ouvreur à 80 n'est pas pris en France, il l'est en Italie.
- ⚠️ **Jeunes joueurs** : avant 23 ans, l'écart au groupe ne compte qu'à moitié
  dans la note de saison (`noterSaison`), et un plancher de progression
  s'applique jusqu'à 25 ans. Sans ça, un débutant à 35 de générale lâché en
  Nationale 2 ne rattrape jamais son retard.

## Championnat en direct & entraînement (dernier ajout)

- `src/lib/championnat.ts` : **vrai championnat joué**. `calendrier()` construit
  un aller-retour (méthode du carrousel), `championnatEnDirect()` simule toutes
  les affiches jusqu'à la journée en cours et tient le classement au **barème
  rugby** (4/2/0, bonus offensif à 3 essais d'écart, défensif à 7 points).
  Déterministe (graine `division#saison#journée`) : rien à sauvegarder.
  `pouleDe()` découpe les grandes divisions amateurs en poules de 12 et garantit
  que le club du joueur y figure (promu ou relégué compris).
- Le **rang de fin de saison** vient désormais de ce championnat (`rangFinal()`),
  plus d'une estimation. La saison du joueur (`apport`) pèse sur les matchs de
  SON club, et le résultat de la journée s'affiche dans le journal.
- Écran **📊 Classement en direct** (`src/screens/Tableau.tsx`, écran
  `'tableau'`) : classement complet + résultats équipe contre équipe, navigables
  journée par journée. Le club du joueur est surligné.
- **Entraînement hebdomadaire** (`entrainer(attribut)`) : une séance ciblée par
  semaine, −4 de forme, chance de gain `(0,25 + marge/45) × facteur d'âge ×
  fraîcheur`. Mesuré : un jeune qui s'entraîne chaque semaine passe de 35 à 50
  en 6 saisons (contre ~43 sans). Le potentiel reste le plafond.


## Lot 7 — L'Ovale (réseau social) & succès

- **`src/screens/Social.tsx`** (écran `'social'`, onglet 𝕏 de la nav) : interface
  **calquée sur X** — rail de navigation, timeline centrale, panneau de
  tendances, actions sous chaque post (réponse / repost / j'aime / vues).
  C'est le **seul écran qui sort du thème stade** : tout est scopé sous `.x-app`
  avec ses propres variables (fond noir, bleu #1d9bf0), pour ne rien
  contaminer ailleurs. Trois onglets : **Pour vous**, **Notifications**,
  **Succès**.
- **`src/data/social.ts`** : comptes (fans, journalistes, médias, haters), les
  **5 tons** de publication (humble, confiant, drôle, engagé, clash) avec leurs
  effets et leur **risque de dérapage**, les gabarits de réponses, la timeline
  d'ambiance, et la liste des mots qui déclenchent une sanction.
- **`src/lib/social.ts`** : `publierPost()` calcule portée, vues, abonnés
  gagnés, réponses (part hostile selon le ton et la popularité) et **sanction du
  club** (amende = 6 % du salaire, confiance du staff en baisse). Déterministe :
  rouvrir la timeline ne rejoue pas les réactions.
- **`src/data/succes.ts` + `src/lib/succes.ts`** : **28 succès** (premiers pas,
  niveau, palmarès, vie de joueur, réseaux) qui rapportent des Ovas, et
  **3 défis tirés par semaine de jeu** (marquer, s'entraîner, publier, tenir une
  note…). ⚠️ Les succès sont un palmarès de JOUEUR : ils traversent les
  carrières et ne peuvent donc pas être refarmés. Les défis sont validés par
  `signalerDefi()` depuis le store (match joué, essai, entraînement, publication).

## Fiabilité, carrière sans défilement, résultats en direct

- **`src/components/Garde.tsx`** : garde-fou React autour de chaque écran. Une
  donnée abîmée dans une vieille sauvegarde faisait planter le rendu — écran
  **blanc**, navigation comprise. Désormais l'écran fautif affiche un message et
  un retour à l'accueil. La sauvegarde passe en **`version: 3`** : postes
  inconnus réparés (`migrerPoste`), nations vides, `titres`/`score` manquants,
  et les champs du lot 7 ajoutés. `nomNation()` et `<Drapeau>` acceptent
  maintenant `undefined`.
- **Carrière sans défilement** (demande explicite) : le panneau de gauche passe
  en grilles denses — jauges sur 2 colonnes, attributs compacts, entraînement
  sur 4 colonnes — et six boutons pleine largeur deviennent une **barre
  d'actions** (`.pj-actions` : Équipe, Marché, Résultats, L'Ovale, Mentor,
  Retraite). Sous 700 px de hauteur, le défilement interne revient plutôt que
  d'écraser le texte.
- **`src/screens/Tableau.tsx`** (📊 Résultats en direct) : un **sélecteur de
  compétition** ouvre les 20 championnats ET les 3 coupes d'Europe ; la coupe
  s'ouvre d'office pendant une semaine européenne si le club y est engagé.
  Les phases éliminatoires s'affichent en **arbre** (`.arbre` : une colonne par
  tour, le vainqueur en clair, la finale dorée).
- **`src/lib/coupe.ts`** : les coupes d'Europe sont **vraiment jouées** —
  4 poules (2 pour une coupe courte) réparties en serpent sur la force
  d'effectif, **aller simple** (5 journées, le calendrier ne réserve que
  8 dates européennes), puis quarts → demies → **finale** sur terrain neutre.
  Déterministe, rien à sauvegarder. `championnat.ts` expose `jouerRencontre()`
  et `classer()`, `phaseFinale.ts` expose `duel()` : un seul moteur pour tout.
- Vérification sans navigateur : `npx vite-node scripts/verifEcrans.ts`
  (coupes, arbres, robustesse du Hall et du Classement).


## L'Ovale piloté par l'IA locale

Tout le réseau social peut être **écrit par le modèle local** et reste entièrement
interactif. Il n'y a plus une seule phrase toute prête proposée au joueur :
la zone de rédaction est vide, on écrit ce qu'on veut.

| Fichier | Rôle |
|---|---|
| `src/lib/iaSociale.ts` | `filIA()` (publications), `reponsesIA()` (commentaires) et `messageIA()` (messages privés). Le contexte contient le club, le championnat, les coéquipiers et les rivaux réels. |
| `src/lib/social.ts` | Le repli **pré-écrit** de chacun (règle du projet : le jeu reste jouable sans WebGPU), dont `suggestionsLocales()` qui fabrique de vrais comptes à partir de l'effectif et des clubs de la division. |
| `src/screens/Social.tsx` | Cinq onglets : **Accueil** (fil + rédaction + « ↻ Actualiser le fil »), **Explorer** (suivre / se désabonner), **Messages** (conversation avec chaque compte suivi), **Notifs**, **Succès**. |

### ⚠️ Une annonce a des conséquences réelles

`appliquerAnnonce()` (store) lit le champ `action` d'un post généré. Un
**transfert annoncé se produit vraiment** : le joueur disparaît de l'effectif de
son ancien club et apparaît dans le nouveau (`setTransfertsSociaux()` →
`appliquerTransfertsSociaux()` dans `lib/effectif.ts`, appliqué **dès la
saison 1**, après le mercato). Les garde-fous, eux, ne sont pas négociables :

- les deux clubs doivent EXISTER (`clubParNom`), sinon l'annonce est ignorée ;
- **le joueur humain ne peut pas être transféré par un tweet** — pour lui, ça
  passe par une offre de contrat, qu'il reste libre de refuser ;
- un même joueur n'est transféré qu'une fois par saison.

Les transferts sociaux sont **persistés** (`transfertsSociaux`) et rendus au
registre de module à la réhydratation, comme `mouvementsClubs`.

Vérification sans navigateur : `npx vite-node scripts/verifSocial.ts`
(publication, fil, abonnements, message privé, transfert réellement appliqué,
garde-fous).


## Logos officiels des compétitions

Plus d'emoji à côté du nom d'un championnat : c'est le **vrai logo** qui
s'affiche, partout — atlas Clubs, écran Résultats (titres, pastilles et
sélecteur), classement latéral, création de carrière, cartes d'offres, écran
Effectif et panneau joueur.

| Fichier | Rôle |
|---|---|
| `sources/logos/competitions/` | Les 24 images de compétitions fournies. |
| `scripts/copierLogosCompetitions.cjs` | Copie `sources/logos/competitions/*` vers `public/logos-competitions/<id>.<ext>`, **nommés par l'id de compétition** (plus rien à deviner à l'exécution), puis génère la table. La constante `CORRESPONDANCE` en tête du script est le SEUL endroit à modifier pour ajouter ou changer un logo. Relancer : `node scripts/copierLogosCompetitions.cjs`. |
| `src/data/logosCompetitions.ts` | ⚠️ **GÉNÉRÉ**. `LOGO_COMPETITION` : id de compétition → chemin public. |
| `src/components/LogoCompet.tsx` | `<LogoCompet id="top14" emoji="🏉" taille={26} />` — le logo sur une pastille claire (les images sont sur fond blanc : sans pastille, un logo sombre disparaîtrait sur le thème nocturne), avec **repli sur l'emoji** quand aucune image n'est fournie. |

**Couverture : 26 compétitions sur 33** (`npx vite-node scripts/verifLogosCompet.ts`).
Restent en emoji faute d'image : Autumn Nations Series, Nations Championship,
Nations Cup, Rugby Europe Championship, The Rugby Championship U20, Test-matchs
et « Autres clubs européens ». Pour les ajouter : déposer le fichier dans
`sources/logos/competitions/`, ajouter sa ligne dans `CORRESPONDANCE`, relancer le script.


## L'Ovale vivant : annuaire, recherche, profils, relations

| Fichier | Rôle |
|---|---|
| `src/lib/comptes.ts` | **L'annuaire** : tout le monde a un compte — les **21 compétitions** (avatar = leur logo, `compet:<id>`), les **143 clubs** (avatar = leur écusson, `club:<nom>`), les **joueurs des effectifs** (les tiens et ceux des rivaux), la presse et les supporters. **336 comptes** pour une carrière en Top 14, tous déterministes (rien à sauvegarder). Fournit aussi `chercherComptes()` et `chercherPosts()` — la **recherche** trouve un club par sa ville (« toulouse » → Stade Toulousain), un joueur par son nom, un championnat, ou un mot dans les publications. |
| `src/lib/vie.ts` | **La vie du réseau sans bouton « actualiser »** : `postSpontane()` (un compte publie), `messageSpontane()` (quelqu'un t'écrit), et surtout les **relations** — `tonDuMessage()` détecte l'agressivité, `effetSurRelation()` la sanctionne (−25 par insulte, +8 par message chaleureux), `humeur()` traduit le score en état (ami → conflit ouvert) et `reponseLocale()` fait **riposter** le compte. |
| `src/screens/Social.tsx` | Sept vues : Accueil, Explorer/Recherche, Messages, Notifications, **Mon profil** (éditable), **profil d'un compte**, Succès. Chaque nom et chaque avatar est **cliquable**. |

**Le fil bouge tout seul** : `battementSocial()` (store) est appelé toutes les
**8 secondes** tant que l'écran est ouvert — un compte publie, et une fois sur
cinq quelqu'un t'envoie un message privé. Avec l'IA locale, `rafraichirFil()`
vient en renfort toutes les **90 s** pour du contenu écrit sur mesure. Il n'y a
plus aucun bouton « actualiser ».

**Les comptes sont débridés** (demande explicite) : le prompt autorise
l'insulte, le mépris, la punchline et le règlement de comptes public, et impose
de **répondre** quand le joueur agresse. Seule limite tenue : rien de
discriminatoire (racisme, sexisme, homophobie…), pas de menace de violence
réelle, rien de sexuel. Hors ligne, `RIPOSTES` joue le même rôle.

**La relation est mémorisée** (`relationsSociales`, persistée) et envoyée à
l'IA à chaque message : un ami blague, un ennemi juré mord. Elle s'affiche sur
le profil et en tête de conversation.

**Profil personnalisable** : nom affiché, identifiant @, bio, photo (l'écusson
de ton club ou un emoji) et bannière — `majProfilSocial()`, stocké dans
`Joueur.profilSocial`.

Vérification sans navigateur : `npx vite-node scripts/verifSocial2.ts`
(annuaire, recherche, battement, relations et ripostes, profil).


## L'Ovale : profils, médias et mentions

- **Un profil s'ouvre TOUJOURS** : `compteDepuis()` (Social.tsx) cherche d'abord
  dans l'annuaire, sinon reconstruit le compte à partir de ses publications
  (comptes inventés par l'IA), sinon crée une fiche minimale. Auparavant, un
  compte hors annuaire donnait un écran vide.
- **`src/lib/images.ts`** — images et GIFs **sans base de données** :
  - par défaut **LoremFlickr** (banque libre, interrogeable par mots-clés, sans
    clé) : `imagePourRequete('rugby scrum stadium')` ;
  - **Tenor** pour de vrais GIFs animés, si le joueur colle une clé gratuite
    dans ⚙️ (`tenorKey`, facultative). Sans elle, la recherche
    renvoie des photos : le jeu ne casse jamais ;
  - `reduirePourAvatar()` recadre et compresse une image choisie sur le disque
    en **160×160 JPEG** — sans ça, une photo de 4 Mo ferait sauter le quota
    localStorage (~5 Mo pour toute la sauvegarde).
- **Publier avec un média** : bouton 🖼️/GIF dans la zone de rédaction, galerie
  de 8 résultats, aperçu retirable. `publier(texte, ton, media)`.
- **L'IA illustre ses posts** : le format JSON accepte un champ `image` (des
  mots-clés) qui devient une URL côté jeu — l'IA ne manipule jamais d'URL.
- **Mentions et hashtags cliquables** : `<TexteRiche>` découpe le texte, `@…`
  ouvre le profil, `#…` lance la recherche. La zone de rédaction propose une
  **auto-complétion** dès qu'on tape `@` (annuaire complet).
- **Photo de profil personnelle** : « 📁 Importer une photo » dans Mon profil,
  à côté des emojis et de l'écusson du club.

⚠️ **Bug corrigé** : consulter un autre championnat plaçait TON club dans son
classement (le Stade Toulousain apparaissait en Régionale 3). `pouleDe()`
n'ajoute plus le club du joueur quand l'ancre est vide, et `Tableau.tsx`
n'ancre sur ton club que dans TA division. Vérifié par
`npx vite-node scripts/verifEcrans.ts`.

## Feuille de route

Toutes les évolutions demandées sont ordonnées dans **`ROADMAP.md`** (9 lots,
des fondations vers le confort). Le lot 1 — calendrier réel, rythme journée par
journée, montées/descentes — conditionne presque tout le reste : le faire en
premier.

## Points d'attention / dette

- **Bundle** : dictionnaire, moteur, données réelles et scènes 3D sont séparés.
  Mesure Vite 8 : `index` 57 Ko gzip, `App` 14 Ko, `useGame` 115 Ko, textes
  155 Ko ; le fournisseur Three.js (263 Ko gzip) reste partagé et paresseux.
- Les matchs se jouent dans le moteur 2D à pas fixe et leurs vraies statistiques
  alimentent la saison. Les calculs complets des autres rencontres passent par
  une file sérialisée afin qu'une avance calendrier ne puisse pas écraser un
  cumul concurrent.
- `semaineSuivante()` joue une semaine ; `avancerJusqua()` répète cette même
  boucle jusqu'à la date choisie et s'arrête aux décisions du joueur.
- **Classement mondial** : la fonction Vercel recalcule chaque fiche et ne garde
  que le meilleur score. Le panthéon local et la carrière en cours restent
  visibles si le service est indisponible ; aucune légende fictive n'est
  présentée comme un vrai joueur.
- **Transferts** : les approches françaises et étrangères arrivent dans les
  messages privés de L'Ovale. Salaire, prime, durée et temps de jeu se négocient
  avant un pré-accord appliqué uniquement à l'intersaison.
- **Économie d'Ovas VOLONTAIREMENT DURE** (demande utilisateur) : départ 0,
  action IA +1, saison +3, évènements/scénarios via `gainOvas()` (= base/8,
  min 1), retraite score/150. Le solde n'apparaît **que dans la Boutique**
  (pas de badge nav, pas de « +X 🪙 » dans le journal ni sur les boutons).
  Ne pas ré-augmenter les gains ni réafficher les coins in-game sans demande.
  ⚠️ **RÉÉTALONNÉE — voir la section « L'économie d'Ovas, mesurée » plus bas.**
  Elle promettait « dure » et versait 4 000 à 5 000 Ovas par carrière.
- **Effectif** : pas persisté (déterministe / regénéré à la volée).
  - **143 clubs ont un effectif RÉEL** (6 306 joueurs, saison 25-26) : Top 14,
    Pro D2, Nationale, Premiership, RFU Championship, URC, Super Rugby, NPC,
    Japan League One D1/D2/D3, MLR + Black Lion et les Cheetahs. À la saison 1
    l'écran affiche l'effectif exact, sans regen (l'âge de retraite ne peut pas
    être < l'âge de 2025-26). Ensuite chaque joueur vieillit d'un an par saison,
    et les retraités laissent place à des regens générés (🌱).
  - **Divisions amateurs françaises** (Nationale 2, Fédérales) : généré
    (`genJoueur`).
  - **Identité des regens d'un club réel** : prénom et nom empruntés à
    l'effectif réel du club (et nationalité du « parrain »), sinon un espoir de
    Kintetsu s'appellerait « Léo Etcheverry ». Les clubs amateurs gardent le
    pool de noms français de `genJoueur`.
  - Les effectifs réels vont de 11 joueurs (Canterbury, NPC) à 69
    (Harlequins) : c'est la réalité de la base, `forceEffectif` s'en accommode
    (moyenne pondérée des 23 meilleurs, poids partiels si moins nombreux).
- **NOTE D'UN JOUEUR** (`scripts/genMonde.cjs`, fonction `noterClub`) :
  1. **temps de jeu** — ses minutes rapportées à la moyenne des 5 plus gros
     temps de jeu du club : `note = noteClub + (part − 0,85) × 24` ;
  2. **finition** — essais par 80 min comparés à `ESSAIS_PAR_MATCH[poste]` ;
  3. **buteur** — points au pied par 80 min (ouvreurs, arrières, centres) ;
  4. **nation** (0 à +2) et **âge** (−5 à +1), plus un bruit seedé ±0,8.
  - ⚠️ **Plafond** `min(noteClub + 5, haut de l'échelle + 1)` : sans stat de
    qualité individuelle, un joueur non identifié ne doit pas dépasser le niveau
    de son club. Les vraies stars passent par `scripts/vedettes.cjs` (~450 noms,
    eux-mêmes bridés à `noteClub + 14` — un ancien international descendu en
    Nationale y perd). **Ajouter un nom à `vedettes.cjs` est LA bonne façon de
    corriger une note.**
  - `Titularisations` et `Matchs Joués` de la base sont **incohérents** selon les
    championnats (208 % de titularisations, 13 matchs pour 2 079 minutes…) :
    seules les **minutes** sont exploitées.
  - ~200 joueurs (académies anglaises) n'ont pas d'âge : on leur en tire un
    (20-28) de façon déterministe plutôt que de les jeter.
- **NOTE D'UN CLUB** : `NOTE_CLUB_REEL`, moitié **rang** au classement de la
  saison passée, moitié **valeur** (points + 0,05 × différence, par match,
  centrée-réduite sur la division). Chaque championnat a son échelle
  (`echelle` dans `scripts/ligues.cjs`) : Top 14 67-86, URC 66-85, Pro D2 58-72,
  Nationale 51-63, League One D3 47-57… Les classements embryonnaires (NPC :
  1 match joué) n'utilisent que le rang.
  - ⚠️ La note est calculée sur l'échelle du championnat où le club a **joué**
    la saison passée, **pas** celle où il joue aujourd'hui. C'est ce qui donne
    une hiérarchie juste après les montées/descentes : Vannes, champion de
    Pro D2 (72), arrive **dernier du Top 14** ; Montauban, relégué du Top 14
    (67), arrive **premier de Pro D2** ; Nice (61) et Narbonne (60), promus de
    Nationale, ferment la Pro D2 ; Mont-de-Marsan (60) et Carcassonne (58),
    relégués, dominent la Nationale. Le générateur liste ces mouvements.
- **Composition des divisions** (`scripts/ligues.cjs`) — l'utilisateur a arbitré
  la saison en cours : **Vannes monte en Top 14, Montauban descend en Pro D2 ;
  Nice et Narbonne montent en Pro D2, Mont-de-Marsan et Carcassonne descendent
  en Nationale.** Les classements de `sources/data/tous_les_classements.json` sont donc ceux
  de la saison **précédente** — c'est normal qu'un club n'y figure pas dans la
  division où il est déclaré. Les autres corrections apportées par la base
  restent : Niort et Tarbes sont passés de Fédérale 3 à Nationale, Vienne et
  Orléans de Nationale à Nationale 2.
- **PROGRESSION / DÉCLIN** (`noteALAge`) : chaque joueur a un **potentiel** =
  sa note au pic (27 ans). Avant 27 il progresse linéairement vers ce
  potentiel ; après 31 ans il décline (de plus en plus vite passé 34). Le
  potentiel est tiré au sort à la génération (marge ≤ 16 points, d'autant plus
  grande que le joueur est jeune **et qu'il joue déjà** : un titulaire de 20 ans
  explose plus souvent qu'un remplaçant) : certains espoirs percent, d'autres
  stagnent. L'écran 👥 affiche « ↗ 84 » pour un espoir et « ↘ » pour un cadre
  sur le déclin.
  - ⚠️ Le déclin est compté **relativement à `ageRef`** (`declin(age) −
    declin(ageRef)`) : à la saison 1, un joueur de 34 ans doit afficher
    **exactement** la note de la base, et ne commencer à baisser qu'ensuite.
- **RÉSULTATS DU CLUB** : `rangDuClub()` ne lit plus une constante mais
  `forceEffectif(club, saison)` = **moyenne pondérée des 23 meilleurs joueurs**
  de la saison en cours (XV de départ ×1, remplaçants ×0,5). Elle est comparée
  à `forceMoyenneDivision()` (moyenne des 16 premiers clubs de la division,
  même saison). ~1,2 point d'écart ≈ 1 place. La saison du joueur ne fait que
  l'infléchir via `apportDuJoueur()` (niveau perso vs groupe × temps de jeu,
  essais, forme, moral) — donc un effectif qui vieillit fait vraiment chuter le
  club, et un centre de formation qui éclot le fait remonter.
- **Matchs et essais de la saison** sont maintenant **simulés** dans
  `saisonSuivante()` : le temps de jeu dépend de l'écart entre le joueur et son
  groupe (`titularisation`), les essais du poste (`ESSAIS_PAR_MATCH`) et de la
  générale. Ils alimentent `matchsJoues`/`essais` (qui n'évoluaient pas avant)
  et sont affichés dans le « Bilan de la saison ».
- Les **honneurs individuels** (6 Nations, Coupe du monde, meilleur joueur du
  monde) restent basés sur le niveau **personnel**, pas sur celui du club.
- Le **coq** du ballon codé est un tracé canvas approximatif (`ballonTexture.ts`) ;
  le skin principal utilise désormais le `.glb` fourni (compressé Draco).
- Draco : `useGLTF(url, true)` charge le décodeur depuis un CDN Google — OK en
  ligne, prévoir un décodeur local si besoin d'hors-ligne complet.
- **Fond du hero** : ⚠️ **PLUS DE POTEAUX** (demande explicite : « enlève les
  poteaux derrière le joueur »). `ModeleStade` et son repli en géométrie ont été
  SUPPRIMÉS ; `poteaux.glb` n'est plus téléchargé au chargement de l'accueil.
  À la place, `Hero3D` pose un **décor au sol** (`bouclier-plaquage.glb`, via
  `DecorSol`) à gauche du joueur, derrière son plan.
- **Palmarès** : `resoudreTrophees()` (store) est appelé dans `saisonSuivante()`
  pour la saison **écoulée**. Il simule d'abord `rangDuClub()` (1 à 14 dans une
  poule, à partir de l'écart entre `force = note*0.7 + reputation*0.3` et
  `NOTE_PAR_NIVEAU` de la division), affiché en journal (« Bilan de la saison »).
  Le rang conditionne tout : titre national si rang ≤ 6 ; en **Top 14**,
  rang ≤ 8 → **Champions Cup**, rang 9-14 → **Challenge Cup** (règle donnée par
  l'utilisateur — pas de coupe d'Europe hors Top 14). Coupe du monde tous les
  4 ans (`saison % 4 === 0`). Les trophées alimentent `tropheesEnAttente`.
- **File de trophées** : plusieurs titres peuvent tomber la même saison ;
  `TropheeGagne` affiche « 1 / 3 » et le bouton devient « Trophée suivant → ».
  Sans cet indicateur, l'utilisateur croyait que le bouton était cassé (le
  trophée suivant s'affichait aussitôt).
- **Saison « vide »** : si le joueur clique « Saison suivante » sans avoir joué
  d'action/situation/évènement, un évènement aléatoire est appliqué d'office
  (« la vie a décidé pour toi ») — évite de sauter les saisons sans conséquence.
- Modèles fournis mais **pas encore branchés** : `m3d/crampons.glb`,
  `m3d/maillot.glb` (prévus pour une future section « Équipement » en boutique).
- **Ajouter / corriger un championnat réel** : tout se passe dans
  `scripts/ligues.cjs` (déclarer la ligue, son `srcLigue`, son `echelle` et ses
  clubs `[nom court, nom jeu, ville]`), puis `node scripts/genMonde.cjs`. Le
  script **signale** les équipes de la base non déclarées et l'inverse, ainsi
  que les logos manquants — viser **zéro avertissement**.
- **La carrière reste FRANÇAISE.** `Creation` ne propose que
  `CLUBS_FRANCE_PAR_DIVISION`, `genererOffre` ne remonte que la pyramide
  française et `TROPHEE_PAR_DIVISION` ne connaît que top14/prod2/nationale. Les
  championnats du monde sont pour l'instant du **contenu consultable**
  (Championnats + effectifs + logos). Pour rendre l'étranger jouable il faut :
  des offres internationales, un trophée par championnat (donc un `.glb` de
  plus dans `public/m3d/`) et un classement de poule à la bonne taille.
- **Logos** : `public/logos/<slug>.png`, slug dérivé du **nom court des
  données** (minuscules, sans accent ni apostrophe, espaces → `_`, tirets
  conservés). Les 198 fichiers sont dédoublonnés : un même club apparaît dans
  plusieurs dossiers de `sources/logos/clubs/` mais l'image est identique.

## Mécaniques ajoutées (monde amateur & transferts)

- **ÉVOLUTION DYNAMIQUE** (`src/lib/progression.ts`) : chaque saison est notée
  sur 10 (`noterSaison`) et cette note pilote la progression. Repères :
  ~6 points d'attributs par point de progression, facteur d'âge (×1,5 avant
  21 ans, ×0,3 après 34), **bonus formation** avant 23 ans (un jeune ne régresse
  jamais parce qu'il est plus faible que ses aînés), déclin à partir de 32 ans.
  Le **potentiel** monte de +1/+2 après une saison ≥ 8,2 chez un ≤ 26 ans, et
  se rabote après une saison ratée. ⚠️ Sans le bonus formation, un débutant
  entrait dans une spirale descendante (testé : générale 46 → 30 en 8 saisons).
- **MERCATO** (`src/lib/mercato.ts` + `appliquerMercato` dans `effectif.ts`) :
  1. saison ≥ 2 : le **vrai mercato de l'été** s'applique aux 83 clubs couverts
     (les partants s'en vont, les recrues arrivent avec leur âge et leur nation) ;
  2. saison ≥ 3 : **échange circulaire déterministe** par division — le club i
     envoie 1 à 3 joueurs (jamais ses 5 meilleurs) au club i+k, k tiré de la
     graine `mercato#division#saison`. Calculé des deux côtés, il ne duplique
     personne et **ne demande aucune sauvegarde**. ⚠️ Simplification assumée : il
     part de l'effectif « de base » de la saison, pas en cascade sur les mercatos
     précédents (sinon il faudrait rejouer toutes les saisons à chaque affichage).
- **OFFRES / CONTRATS** : `Joueur.contrat` (club, division, saisons restantes,
  salaire). `saisonSuivante()` verse le salaire, décrémente le contrat, et
  génère des offres si le contrat expire, si la saison est ≥ 7/10, ou 25 % du
  temps. Le club actuel propose toujours une prolongation en fin de contrat.
  `demanderTransfert()` force une salve d'offres contre −6 de moral et −2 de
  réputation. **L'étranger** s'ouvre à partir de 55 de notoriété
  (réputation + note de saison × 3).
- **CARRIÈRE HORS DE FRANCE** : `resoudreTrophees()` travaille désormais sur
  `COMPETITIONS` (et plus `DIVISIONS_FRANCE`), avec une **taille de poule réelle**
  (Premiership 10, Top 14 14, URC 16 ; 12 par défaut pour les divisions amateurs,
  découpées en poules). Phase finale = les ~43 % premiers. Coupe d'Europe : Top 14,
  Premiership et URC (top 8 → Champions, sinon Challenge).
- **Données amateurs : ce qui est réel et ce qui ne l'est pas.** Nom, poste et
  club sont réels (12 086 joueurs) ; **l'âge et la note sont tirés** (seed = club
  + nom) autour du niveau de la division — la source n'en donne aucun. Les
  effectifs viennent de rugbyamateur.fr et **mélangent les sections d'un club**
  (on y croise donc des joueuses). Certains clubs comptent 100+ licenciés :
  `forceEffectif` ne retient que les 23 meilleurs, donc sans conséquence.

## Checklist avant de livrer une évolution

1. `npm run build` (0 erreur TS) et `npm run lint` (propre).
2. Test navigateur **desktop + mobile** (création → carrière → profil).
3. Mise à jour de `README.md` et `CLAUDE.md` si le comportement change.






## Le fil au rythme de la saison, commentaires et reposts

⚠️ **Le « battement » de 8 secondes est mort.** Un post tombait au hasard
pendant qu'on lisait : fil illisible, dates absurdes, mêmes phrases en boucle.
Désormais **une semaine jouée = une fournée de 8 publications**, datée de cette
semaine et **déterministe** (`filDeLaSemaine`, graine `saison#semaine`).
`vivreSemaineSociale()` (store) la génère, `filSemaine` sert de verrou pour ne
jamais la produire deux fois. Avec l'IA locale, `rafraichirFil()` vient
enrichir la même fournée — une fois par semaine, plus toutes les 90 s.

| Fichier | Ce qui change |
|---|---|
| `src/lib/vie.ts` | Gabarits par type de compte **avec alternatives** : `{ce soir\|demain\|dimanche}` est tiré à la graine. Un gabarit à trois alternatives de trois choix, c'est 27 phrases — le pool tient sur un écran et ne se répète quasiment jamais (mesuré : 40 textes distincts sur 48). ⚠️ Les variables (`{club}`, `{adverse}`…) sont substituées **avant** les alternatives, sinon un `{adverse}` niché cassait la reconnaissance et le gabarit brut s'affichait tel quel. Un pool `CONTEXTE` par type de semaine colle le fil au calendrier (journée, Coupe d'Europe, Tournoi, phase finale, mercato). Les clubs et les championnats répondent **en institutionnel** même quand on les insulte (`INSTITUTIONNELLES`). |
| `src/lib/social.ts` | **`statsDePost` / `statsDepuisVues` / `audienceDe`** : tous les compteurs passent par là, **en cascade** (audience → vues → likes → reposts). Avant, chaque source tirait ses chiffres dans son coin — un compte de supporter affichait 40 000 vues, et il arrivait qu'un post ait plus de reposts que de likes. Vérifié : 0 incohérence sur 40 publications. |
| `src/store/useGame.ts` | `repondreAuPost(id, texte)` — **commenter** : ta réponse s'ajoute sous le post, l'auteur **riposte** (IA locale si active, sinon `reponseLocale`), et le ton de ton commentaire **fait bouger la relation** exactement comme un message privé. `reposter(id)` — le repost apparaît **sur ton profil** et donne un peu de portée à l'auteur. |
| `src/screens/Social.tsx` | Zone de réponse sous chaque post, bouton repost actif (vert), compteur « N réponses » repliable. |

### Profil : rien n'est appliqué avant « Enregistrer »

Le formulaire travaille sur un **brouillon local**. Le profil affiché au-dessus
reste celui qui est enregistré ; le brouillon se voit dans un bloc **« Aperçu —
non enregistré »**. Boutons **Annuler** (retour au dernier état enregistré) et
**Enregistrer** (désactivé tant que rien n'a changé). Ouvrir l'édition repart
toujours de ce qui est enregistré.

## Images : Wikimedia Commons plutôt que LoremFlickr

`src/lib/images.ts` a changé de source. LoremFlickr répondait lentement,
tombait souvent et renvoyait une photo au hasard : d'où des images « qui
marchent pas bien ». Trois étages désormais :

1. **Wikimedia Commons** — l'API de recherche de Wikipédia, **sans clé**, avec
   CORS (`origin=*`), rapide et surtout **pertinente** (« rugby scrum » rend une
   vraie photo de mêlée). Source par défaut, pour le joueur comme pour l'IA.
2. **Tenor** pour les GIFs animés, si le joueur colle une clé gratuite dans ⚙️.
3. **`vignetteLocale()`** — une vignette SVG peinte à la main (dégradé +
   mots-clés) en `data:` URI, **sans une seule requête**. Le composant `<Media>`
   y bascule sur `onError` : plus jamais de carré gris cassé dans le fil.

⚠️ `imagePourRequete()` est devenue **asynchrone** (c'est une vraie recherche) et
n'échoue jamais. `filIA` résout les mots-clés de l'IA en parallèle après avoir
construit les posts.

## Le calendrier de l'année, cliquable

- **`affichesDeLaJournee()`** (championnat.ts) rend les affiches d'une journée
  **jouée ou à venir** : le calendrier existe en entier dès le coup d'envoi,
  seuls les scores attendent.
- **`<Frise>`** (Tableau.tsx) : les 44 semaines de la saison, cliquables, avec
  leur pictogramme, la date et le numéro de journée. La semaine en cours est
  soulignée en vert. Sous 700 px, elle défile dans son conteneur.
- Le bloc **calendrier du panneau de carrière est devenu un bouton** (« 🗓️ tout
  le calendrier → ») qui ouvre l'écran Résultats.
- Le bloc de résultats affiche « Résultats » ou **« Programme »** selon que la
  journée est jouée, et navigue sur **toute** la saison (1 → 22, 26, 30…), plus
  seulement jusqu'à la dernière journée disputée.

## Poules, tournoi de fin d'année, et toute la pyramide qui bouge

- **`poulesDe(divisionId)`** (championnat.ts) découpe une division en poules de
  12 (une poule résiduelle de 3 clubs ou moins est reversée dans la précédente).
  Régionale 3 : 5 poules ; Fédérale 1 : 4 ; Nationale 2 : 2. `pouleDe()` accepte
  un `numeroPoule` : l'écran Résultats propose **une puce par poule**, et le club
  du joueur n'est ancré que dans **sa** poule de **sa** division.
- **`src/lib/tournoi.ts`** — `tournoiDeFinDAnnee()` : dans une division à poules
  multiples, le champion n'est pas le premier d'un classement mais le vainqueur
  d'un **tournoi façon coupe de France**. Les premiers de chaque poule (les deux
  premiers s'il n'y a que 2-3 poules) sont complétés par les **meilleurs
  deuxièmes** jusqu'à la puissance de deux, puis c'est un tableau sec :
  seizièmes → … → demies → **finale sur terrain neutre**. Déterministe.
- **`resoudreToutesDivisions(saison)`** (promotion.ts) — ⚠️ **les dix étages
  français bougent maintenant**, plus seulement la division du joueur et ses
  deux voisines : un club de Fédérale 2 y restait à vie. Le nombre de places
  échangées entre deux étages suit le nombre de poules (1 à 3). Mesuré :
  **40 clubs changent de division par saison, en 415 ms**, tournois compris.
  Le résultat est mémoïsé par saison (`oublierResultats()` le purge quand la
  pyramide change).

## ⚠️ Pas de trêve en bas de la pyramide

Demande explicite : **de la Nationale 2 à la Régionale 3, on joue AUSSI les
week-ends de Coupe d'Europe et de Tournoi des 6 Nations**. Ces divisions n'ont
ni coupe européenne ni internationaux — leur championnat continue.

- `estAmateur()`, `typesJoues()`, `weekEndsJoues()`, `totalWeekEnds()` et
  `journeesALaSemaine()` (championnat.ts) donnent à chaque étage **son propre
  calendrier** : 23 week-ends pour le Top 14, **39 pour la Fédérale 3**.
- `jouerSemaine` (store) requalifie une semaine `coupe`/`international` en
  journée de championnat quand le joueur est dans une division amateur.
- Vérifié en jeu : un club de Régionale 3 dispute bien sa **J6 le 8 novembre**
  et sa **J7 le 22 novembre**, en pleine tournée d'automne.

Vérification sans navigateur : `npx vite-node scripts/verifLot8.ts`
(fil hebdomadaire et déterminisme, cohérence des compteurs, calendrier de
chaque étage, affiches à venir, poules et tournoi final, pyramide complète,
commentaires et reposts, repli des images).


## De vraies photos de profil, et des gens ordinaires

⚠️ **Tous les comptes de personnes portaient un emoji** (🏉, 🧣, 🎙️). Sur un
réseau calqué sur X ça se voit tout de suite : ça fait maquette. **`src/lib/avatars.ts`**
règle ça sans base de données et sans clé :

- `photoDe(nom)` construit une URL **`randomuser.me/api/portraits/...`** — des
  portraits libres à des adresses FIXES (`men/34.jpg`), donc aucune requête
  d'API : on choisit l'index de façon déterministe à partir du nom. Le même
  compte a toujours le même visage. `estFeminin()` regarde le prénom (les
  données amateurs mélangent les sections d'un club, on y croise des joueuses).
- `avatarPourCompte(nom, type)` arbitre : **club → son écusson**, **championnat
  → son logo**, **média → un monogramme**, **toute personne → une photo**.
- `avatarInitiales(nom)` est le repli : une pastille SVG avec les initiales sur
  un dégradé, générée en local. `<Photo>` y bascule sur `onError` — le fil n'a
  jamais de trou, même hors ligne.
- ⚠️ **Pas de `loading="lazy"` sur les avatars** : sur des vignettes de 42 px
  empilées dans un conteneur défilant, le navigateur ne déclenchait jamais le
  chargement et le fil restait plein de cases vides. Mesuré en jeu : 0/6 photos
  chargées avec, **6/6 sans**.
- `comptesLambda(club)` peuple L'Ovale de **Jean-Michel, Sylvie, Patrick…** —
  38 prénoms × 28 noms × 12 suffixes de pseudo, avec bio et photo. 26 supporters
  de ton club, 12 d'un rival, dont un sur cinq est là pour râler. Sur une
  carrière en Top 14 : **374 comptes, 0 emoji, 207 photos**.

⚠️ **`bassinSocial(joueur, suivis)`** (comptes.ts) : l'annuaire est rangé par
catégories, et les appelants en prenaient les 60 ou 80 premiers — c'est-à-dire
QUE des championnats et des clubs. D'où un fil où seules des institutions
publiaient, et des commentaires signés « Premiership Rugby Cup ». Le bassin est
désormais composé famille par famille (10 clubs, 3 compétitions, 30 joueurs,
8 journalistes, 4 médias, 30 supporters, 12 haters), les comptes suivis en tête.

## Des tweets qui vivent : compteurs qui montent, commentaires partout

- **`vieillirPost()`** (social.ts) : un post ne meurt pas le jour où il est
  publié. À chaque semaine jouée, ses vues, likes et reposts remontent, de moins
  en moins vite (décroissance en 2⁻ᵃᵍᵉ), jusqu'à s'éteindre au bout de **six
  semaines**. Mesuré en jeu : un post de la semaine 2 passe de **303 → 836 vues**
  et de **17 → 35 likes** en quatre semaines. Déterministe : rouvrir l'écran ne
  gonfle jamais deux fois les chiffres.
- **`reactionsPour()`** (vie.ts) : **chaque** publication du monde a ses
  commentaires, plus seulement les tiennes. Le nombre suit l'audience (4 sous un
  post de club, parfois aucun sous un anonyme), le ton dépend du compte (un hater
  tape 4 fois sur 5), et deux réponses identiques sous le même tweet sont
  écartées. ⚠️ Les comptes **institutionnels sont exclus** du bassin de
  commentaires : un club ne répond pas « J'y serai dimanche ! 🎟️ » sous le post
  d'un rival.
- Avec l'IA locale, `rafraichirFil()` reçoit les commentaires dans la même
  réponse que les publications (`filIA`) — un seul calcul par
  semaine, pas un par tweet. Les réactions locales restent en dessous si l'appel
  échoue.
- ⚠️ **Les images sont RARES** (demande explicite) : le prompt le dit, mais
  surtout `filIA` plafonne à **une image par salve**, et seulement pour un
  club, un média, un championnat ou un journaliste. Un supporter qui râle ne
  joint pas de photo.

## Le match de la semaine, joué en direct

Un bouton **« ▶️ Voir le match »** apparaît dans le panneau de carrière quand ton
club joue cette semaine. Il ouvre une modale qui **déroule les 80 minutes**.

⚠️ **Ces deux sections ont été refaites de zéro** — le récit décomposé à partir
du score, le placement « rugbistique » de la première version, les réglages de
plaquages et de rythme : tout est remplacé. Voir
**« ⚙️ LE MOTEUR DE MATCH — RÉÉCRIT DE ZÉRO »** plus bas, qui fait autorité.

Ce qui reste vrai et qui ne doit jamais bouger :

- **ON N'INVENTE AUCUN RÉSULTAT.** Le score vient de `jouerRencontre` comme
  partout ailleurs. Regarder le match ou passer la semaine donne exactement le
  même résultat.
- **`scorePossible()` (championnat.ts)** : on marque au rugby par 3, 5 ou 7
  points — **1, 2 et 4 sont impossibles**. Les scores sont rabattus sur la valeur
  atteignable la plus proche (1 → 0, 2 et 4 → 3).
- **`createPortal(document.body)` obligatoire** pour la modale : le
  `backdrop-filter` des `.carte` piège les `position: fixed`.
- **Le terrain garde ses proportions réelles** : `viewBox="0 0 122 70"` (100 m de
  jeu + 2 × 11 m d'en-but sur 70 m de large) et `preserveAspectRatio` par
  défaut. Côté CSS : `aspect-ratio: 122/70`, `max-width: calc(40vh * 122 / 70)`
  et `flex: 0 0 auto` — sans ce dernier, `.match-live` étant une colonne flex,
  le terrain se faisait écraser en hauteur par ses voisins.

## Classements individuels — toutes les ligues, toutes les catégories

**`src/lib/statsJoueurs.ts`** : jusqu'ici seul le joueur humain accumulait des
statistiques détaillées ; les 18 000 autres n'étaient que des noms. Impossible
de dire qui était meilleur marqueur, meilleur buteur ou meilleur gratteur.

- Un **profil par poste** (`PROFILS`) donne les repères par match : essais,
  plaquages, grattages, ballons concédés, passes décisives, part des tirs au but.
  Chiffres calés sur les moyennes du rugby professionnel.
- `statsDeSaison()` en tire la saison d'un joueur : temps de jeu selon son écart
  au groupe, puis essais, plaquages (et plaquages manqués), grattages, turnovers,
  passes décisives, tirs au but tentés/réussis et cartons.
- ⚠️ **ON PART DES MINUTES**, pas du nombre de matchs. Un club dispute
  15 × 80 = 1 200 minutes par rencontre ; réparties sur les 26 joueurs retenus,
  cela fait 57,7 % des minutes de la saison pour chacun. La première version
  partait des matchs et n'atteignait que 60 % de ce volume : le championnat ne
  comptait plus que **2,7 essais par match au lieu de 5**. Corrigé : **797 essais
  en Top 14 sur une saison, soit 4,4 par match**.
- ⚠️ Le **buteur** n'est pas tiré au hasard : sa probabilité suit son poste ET
  son temps de jeu, sinon on obtenait 38 buteurs pour 14 clubs. Désormais **22**,
  soit un titulaire et une doublure par équipe.
- ⚠️ **RIEN N'EST STOCKÉ.** Comme les effectifs et les championnats, tout est
  déterministe (graine = club + nom + saison) : rouvrir l'écran redonne les
  mêmes chiffres, et la sauvegarde ne grossit pas. Mémoïsé par compétition.
- Le **joueur humain fait exception** : `classementJoueurs()` substitue ses
  VRAIES statistiques accumulées (`saisonEnCours.stats`) à l'estimation faite
  pour lui — et il n'apparaît qu'une fois.

**Neuf catégories** dans l'écran 📊 Résultats, sous le classement de la
compétition (n'importe laquelle, poule par poule) : Essais, Points, **Buteurs**
(% de réussite, 10 tentatives minimum), Plaquages (nombre et taux), Grattages,
Turnovers, Passes décisives, Cartons, Temps de jeu.

Contrôle de bon sens automatisé : **10/10 des meilleurs marqueurs sont des
trois-quarts, 10/10 des meilleurs plaqueurs sont des avants**, les ouvreurs
dominent les buteurs et les troisièmes lignes les grattages.

Vérification sans navigateur : `npx vite-node scripts/verifStats.ts`
(statistiques dans 7 ligues, 0 incohérence sur 364 joueurs, tri de chaque
catégorie, poste attendu en tête, vrais chiffres du joueur humain sans doublon,
déterminisme).


## ⚙️ LE MOTEUR DE MATCH — RÉÉCRIT DE ZÉRO

⚠️ **Tout `src/lib/moteur/` a été refait**, ainsi que `components/MatchLive.tsx`.
L'ancien moteur produisait des scores de **248-207**, 64 essais par match, aucune
mêlée ni touche, 530 tentatives de 50/22, et seuls quatre joueurs touchaient le
ballon. Il n'en reste rien : ce qui suit décrit le moteur actuel.

L'ancien système « narratif » (`lib/matchLive.ts` : décomposer un score puis le
raconter minute par minute) a lui aussi disparu — ce fichier ne contient plus que
`matchDeLaSemaine()`, qui cherche l'affiche du week-end.

### Les fichiers

| Fichier | Rôle |
|---|---|
| `moteur/terrain.ts` | La géométrie, **en mètres réels** (122 × 70, en-buts de 11 m). Toutes les règles s'écrivent dedans ; l'affichage convertit en pixels, jamais l'inverse. Une **convention de signe unique** : « d mètres derrière, du point de vue de l'équipe X » = `ref − s × d`. |
| `moteur/entites.ts` | Le `Pion` : position, **vecteur vitesse**, cible, endurance, sanction, statistiques. ⚠️ Le déplacement est **à inertie** (accélération bornée) — c'est ce qui supprime les téléportations. Le champ `effort` fait trottiner ceux qui sont loin du ballon. |
| `moteur/etat.ts` | `EtatMatch` — la structure partagée, isolée pour éviter un cycle d'imports entre `moteur.ts` et `tactique.ts`. |
| `moteur/plan.ts` | `decomposer(score)` : le score visé de la ligue en **événements de rugby** plausibles (essais transformés, essais secs, pénalités). |
| `moteur/tactique.ts` | **Le placement.** Attaque en pods, défense en deux rideaux, choix du système, lecture du surnombre. |
| `moteur/phasesArretees.ts` | Mêlée 3-4-1, alignement perpendiculaire entre les 5 et les 15 m, ruck, coup d'envoi, tir au but, renvoi aux 22. Formations **figées à l'entrée dans la phase**. |
| `moteur/commentaire.ts` | Les pools de phrases (variables + alternatives `{a\|b\|c}`), tirées à la graine. |
| `moteur/moteur.ts` | La boucle, les phases, les décisions, le score. |
| `moteur/consignes.ts` | Le coaching en direct (mots-clés, puis IA locale si elle est active). |
| `moteur/saison.ts` | La simulation de fond, sans rendu. |
| `components/MatchLive.tsx` | Le rendu : terrain SVG, 30 pions, fil de commentaire, feuille de match. |

### ⚙️ CE QUI STRUCTURE LE JEU

**1. Le lancement de jeu (`Lancement`).** À chaque libération de ballon, une
combinaison est choisie, et elle contient la **CHAÎNE DE PASSES** (9 → 10 → 12 →
13 → ailier). C'est elle qui fait voyager le ballon.

| Combinaison | Chaîne | Part des phases |
|---|---|---|
| `ras` — percussion d'un avant | 9 → avant | ~39 % |
| `pod` — bloc d'avants au premier temps | 9 → 10 → avant | ~20 % |
| `large` (court) — un temps sur les centres | 9 → 10 → 12 | ~13 % |
| `large` / `saute` — jusqu'à l'aile | 9 → 10 → 12 → 13 → ailier | ~15 % |
| `pied` — occupation, dégagement, chandelle, 50/22 | 9 → botteur | ~10 % |
| `pickAndGo` — près de la ligne | 9 → avant | rare |

⚠️ **Le percuteur tourne** (`choisirPercuteur`) : parmi les QUATRE avants les
plus proches et hors du ruck, celui qui a le moins porté. Prendre « l'avant le
plus proche » revenait à toujours désigner les mêmes — les piliers finissaient le
match à 0 mètre et 0 ballon joué.

**2. La lecture du terrain.** Le choix dépend de critères de vrai demi
d'ouverture : ses 22 (on dégage à 74 %), son camp (occupation, 50/22 si les
ailiers adverses sont montés), les 22 adverses (on pilonne, ou on écarte s'il y a
surnombre), le **surnombre au large** (`surnombreAuLarge`), le nombre de temps de
jeu, le score et le chrono (garder le ballon quand on mène de plus de 7 à cinq
minutes de la fin).

**3. « Fixer et donner ».** ⚠️ **La décision de passer est évaluée à CHAQUE
TICK**, avant le plaquage. C'était LE bug du ballon qui n'allait jamais à l'aile :
la décision n'était reprise que toutes les 0,22 s, et entre 3 m et 1,35 m de
pression il ne s'écoule que 0,13 s — le porteur était plaqué avant d'avoir eu le
droit de passer.

### 🛡️ LA DÉFENSE : ligne + second rideau

- **Premier rideau** — douze joueurs à plat, espacés de ~4,5 m, appariés aux
  cibles **par ordre de largeur** (sans ça ils se croisent et le rideau se noue).
  La ligne a sa propre inertie : `e.ligneDef` part de la ligne de hors-jeu au
  ruck et avance à sa vitesse propre (blitz 4,4 m/s · glissée 3,0 · repli 1,7).
- **Second rideau** — l'**arrière** au fond (11 à 30 m selon la menace),
  l'**ailier du côté fermé** en pendule, et le **demi de mêlée en sentinelle**
  derrière la ligne. Ce sont eux qui couvrent le jeu au pied.
- **Deux chasseurs et trois maximum** montent sur le porteur. Tout le reste tient
  sa place. ⚠️ **Le second rideau ne bouge QUE si la ligne est vraiment
  franchie** (`perce`, lu sur les positions réelles : 55 % du rideau dépassé).
  Sans cette règle, les quinze joueurs couraient après le ballon.
  Mesuré : **1,4 défenseur à moins de 6 m du porteur** (au lieu de 15).
- Systèmes : **blitz** (montée agressive, parapluie vers l'extérieur),
  **glissée** (tout le rideau décalé de 3,4 m vers la touche, on pousse dehors),
  **repli** (l'attaque sort de ses 22, on couvre le pied).

### ⚠️ LE SCORE RESTE CELUI DE LA LIGUE

Le score final vient de `jouerRencontre` (lib/championnat.ts) : c'est lui qui
alimente le classement, les montées, les coupes et toute la saison. Le moteur
joue librement, mais on ne peut pas le laisser inventer un 248-207.

1. `plan.ts` décompose le score visé en essais transformés / essais secs /
   pénalités, avec des proportions réalistes (~6,6 points par essai, un essai sur
   cinq non transformé, **trois pénalités maximum** — au-delà, le moteur n'obtient
   pas assez de fautes à portée et les points finissaient soldés).
2. **`retard()` — l'échéancier.** À chaque instant on compare ce qui est marqué à
   ce qui devrait l'être. Le réglage est **ASYMÉTRIQUE** : une équipe en retard
   trouve un peu d'espace (jusqu'à −0,36 sur le taux de plaquage près de la
   ligne), une équipe en avance se heurte à un mur (jusqu'à 0,99 de réussite au
   plaquage). À partir de la 60ᵉ, l'écart pèse **deux fois plus lourd**.
3. **Un seul garde-fou dur** (`tenterEssai`) : on refuse un essai qui dépasserait
   le score, ou qui arriverait beaucoup trop tôt dans l'échéancier. Le ballon est
   alors « tenu dans l'en-but » → renvoi aux 22. C'est une vraie règle du rugby.
4. **`solderLesPoints()`** à la sirène, filet de sécurité : les points restants
   sont **joués et racontés**, jamais ajoutés en silence. Mesuré : **2,2 points
   soldés par match**.

Vérifié : **0 écart sur 30 matchs.**

### 📊 Étalonnage mesuré (`npx vite-node scripts/verifMoteur.ts`)

| | mesuré | rugby pro |
|---|---|---|
| points par match | 42,8 | 40 à 55 |
| essais | 5,4 | 4 à 8 |
| plaquages réussis | 242 | 180 à 280 |
| passes | 446 | 280 à 460 |
| rucks | 149 | 110 à 180 |
| mêlées | 12 | 8 à 18 |
| touches | 34 | 20 à 34 |
| pénalités sifflées | 19,5 | 14 à 26 |
| coups de pied | 53 | 35 à 60 |
| 50/22 tentés | 1,7 | 0 à 3 |
| % de réussite au pied | 70 % | 70 à 85 % |
| points soldés | 2,2 | < 4 |

**Le ballon circule** (le bug d'origine) — ballons portés par maillot :

```
 1: 2,2%  2: 2,2%  3: 2,2%  4: 2,3%  5: 4,5%  6: 2,0%  7: 2,1%  8: 2,1%
 9:31,4% 10:20,6% 11: 3,8% 12:10,6% 13: 6,6% 14: 4,0% 15: 3,4%
```

**44 joueurs sur 46 touchent le ballon**, aucun maillot à zéro, 11 % pour les
ailiers et l'arrière, 20 % pour les avants. Les essais du trio arrière : 17 %.

**Structure** : 57 m de largeur occupée par l'attaque, 54 m par la défense,
**2,8 défenseurs en second rideau**, **1,4 défenseur à moins de 6 m du porteur**,
platitude du premier rideau 2,8 m d'écart-type.

### 🎬 LA FLUIDITÉ (demande explicite : « c'était pas du tout fluide »)

Quatre causes, toutes traitées :

1. **Déplacement à inertie.** Chaque pion a un vecteur vitesse qu'il infléchit
   avec une accélération bornée. Un ailier lancé décrit une courbe, un pilier met
   deux secondes à se mettre en route.
2. **Aucune transition CSS sur les pions.** L'ancien rendu posait
   `transition: transform 0.55s` : l'affichage avait une demi-seconde de retard
   sur la simulation et « caoutchoutait ».
3. **Interpolation exacte.** La simulation avance par pas fixes de `DT = 0,15 s`,
   le rendu à 60 Hz : sans rien, les pions avanceraient par saccades de 7 Hz. On
   affiche `position + vitesse × reliquat`. ⚠️ Le reliquat est **borné à un pas**
   à l'affichage et **remis à zéro à la sirène** — en ⏭️ (facteur 600) il restait
   deux minutes de jeu non consommées et l'écran projetait les pions à deux cents
   mètres du terrain.
4. **Rendu optimisé.** Le terrain est dessiné une seule fois (`useMemo`), le fil
   de commentaire n'est reconstruit que lorsqu'une ligne s'ajoute (`memo`, avec
   une prop `n` — le tableau est muté, sa référence ne change jamais), et la
   boucle `requestAnimationFrame` s'arrête à la fin du match.

### ⏱️ L'échelle de temps est DOUBLE

L'action se joue à **×5**. Mais un match ne contient que ~35 minutes de ballon
vivant : le moteur fait donc défiler **l'horloge** beaucoup plus vite pendant les
arrêts de jeu (`ARRETS` dans `moteur.ts` : une mêlée se met en place en 5 secondes
à l'écran et avale 50 secondes au chrono ; une touche 4,5 s → 35 s ; une
transformation 5 s → 58 s). Résultat : **~7,6 minutes réelles pour 80 minutes de
rugby**, dont presque tout en ballon vivant.

### ⚠️ DÉTERMINISME — le point à ne jamais casser

`avancer(e, secondes)` **accumule le reliquat et ne fait QUE des pas de `DT`
exacts**. Le match suivi en direct (appels de 16 ms) et le même match rejoué en
fond (appels de 8 s) donnent donc rigoureusement le même résultat — vérifié :
même score ET même récit minute par minute. L'ancien moteur faisait des pas
partiels (`Math.min(DT, reste)`) : les deux auraient divergé.

Corollaire : **rien ne doit vivre dans une variable de module.** Le compteur de
replacement (`e.compteur`), le ballon en vol (`e.vol`) et le tir au but (`e.tir`)
sont tous dans l'état — deux matchs simulés en parallèle se seraient partagé le
même ballon.

### La feuille de match

`composer()` monte une vraie feuille : chaque maillot 1-15 va au meilleur joueur
disponible à ce poste (à défaut, même famille). Mesuré : **15/15 titulaires à
leur poste naturel**.

⚠️ **Le banc est un VRAI banc de rugby** : 5 avants + 3 arrières (16-23), à leur
poste. Prendre « les huit meilleurs restants » donnait un banc de trois-quarts, et
**un arrière entrait en pilier** — vu sur la feuille de match. Les remplacements
apparient le poste (exact, puis famille, puis catégorie), jamais « le premier du
banc ». Si l'avatar attend sur le banc à ce poste, c'est lui qui entre.

### Les mètres se comptent AU-DELÀ de la ligne d'avantage

⚠️ Comme dans les statistiques officielles. Un ouvreur qui reçoit dix mètres
derrière le ruck et court cinq mètres vers l'avant n'a pas gagné cinq mètres : il
n'a même pas atteint la ligne. Compter tout mouvement vers l'avant donnait
1 700 mètres par équipe, trois fois la réalité. `e.ligneAvantage` est posée à
chaque reprise de jeu.

### Ce que le moteur produit

- **Plaquages par collision** (rayon 1,35 m), taux de réussite ~89 %, plaquage à
  deux crédité, offload sur 5,5 % des plaquages, carton jaune sur 16 % des fautes
  près de sa ligne.
- **Conquête** : touche à 4, 5 ou 7 sauteurs (86 % gagnées), **maul** si la touche
  est à moins de 12 m de la ligne, mêlée avec **départ du 8** quand elle domine et
  pénalité quand elle recule.
- **Jeu au pied** : dégagement (trouve la touche 3 fois sur 4), occupation,
  chandelle du 9, **50/22** (uniquement si les ailiers adverses sont montés),
  rasant, transversale, **drop**.
- **Game management** : tir au but jusqu'à 52 m, pénaltouche quand il faut un
  essai, jeu rapide à la main, ballon gardé au ras quand on mène en fin de match.
- **Remplacements** : à partir de la 48ᵉ, **uniquement sur arrêt de jeu**,
  8 maximum, sur l'endurance. L'avatar n'est sorti qu'à partir de la 62ᵉ.
- **Cartons jaunes** : dix minutes d'horloge, le joueur revient tout seul.

### L'affichage

- Terrain aux proportions réelles (`viewBox="0 0 122 70"`), bandes de tonte,
  en-buts, 22, 10 m en pointillés, 5 m et 15 m, poteaux en H, halo de lumière.
- **La lecture du jeu est affichée** : possession, **combinaison en cours**
  (« écarter à l'aile », « occupation au pied », « bloc d'avants »), **système
  défensif** (« défense montante », « défense glissée », « repli »), numéro du
  temps de jeu. C'est ce qui rend la stratégie lisible.
- Barre de **possession** en tête, ballon avec ombre au sol et **hauteur** quand
  il est en l'air, porteur entouré, avatar en aura dorée.
- Feuille de match complète des deux équipes + résumé (essais, rucks, touches,
  mêlées, franchissements).
- Responsive vérifié : mobile 375 px → terrain 341 × 196, ratio 1,74 exact, aucun
  débordement horizontal.

Vérification sans navigateur : `npx vite-node scripts/verifMoteur.ts`
(score exact, chiffres du match, circulation du ballon, structure sur le terrain,
toutes les phases, déterminisme et performance, feuille de match).
**145 ms par match** — une journée de 8 affiches se rejoue en ~1,2 s.


## La simulation de fond : toute la poule rejouée, sans rendu

⚠️ **Les classements ne sont plus une estimation.** Jusqu'ici seul le match du
joueur passait par le moteur ; les 29 autres joueurs de la rencontre et les six
autres affiches de la poule n'existaient que dans le modèle statistique.

**`src/lib/moteur/saison.ts`** rejoue TOUTES les affiches de la journée avec le
même moteur, **sans une seule ligne d'affichage** : pas de `requestAnimationFrame`,
pas de SVG, la boucle poussée jusqu'à la sirène par pas de 8 secondes de jeu.
Déclenché par `simulerStatsJournee()` (store) au moment où l'on passe à la
semaine suivante.

⚠️ **MÊME GRAINE = MÊME MATCH.** La clé d'une rencontre est celle du championnat
(`division#saison#journée#domicile#extérieur`). Le match qu'on a regardé en
direct et celui rejoué en fond sont donc **rigoureusement identiques** : mêmes
essais, mêmes plaquages, mêmes minutes. Aucun double comptage possible, et la
feuille de match correspond exactement à ce qu'on a vu. La décision
**titulaire ou remplaçant** (`estTitulaire`) vit dans ce même fichier, partagée
par le direct et par le fond — sinon les deux auraient divergé.

- `statsReelles` (store, persisté) : clé `division#saison` → `club|nom` → cumul
  (minutes, essais, plaquages, passes, mètres, grattages, tirs au but, cartons).
  ⚠️ **Une seule division et une seule saison sont conservées** : accumuler tout
  l'historique ferait exploser le quota du localStorage. Mesuré : **87 Ko** pour
  295 joueurs sur 10 journées.
- `classementJoueurs()` bascule sur ces chiffres **dès qu'une journée a été
  rejouée**, pour TOUT LE MONDE. On ne mélange jamais les deux sources : ce
  serait comparer un match joué à vingt-cinq matchs devinés. L'en-tête du bloc
  affiche « matchs joués » ou « estimation ».
- ⚠️ **Garde-fou de performance** : on ne rejoue qu'**une poule** (8 affiches
  maximum, ~0,9 s), pas les treize poules d'une Fédérale 3 — le classement
  affiché est de toute façon celui d'une poule. Mesuré : **8 semaines en 7 s**.
- ⚠️ Les tirs soldés en fin de match réussissent toujours (ils doivent tomber
  pile sur la cible) : le classement des buteurs affichait donc du 32/32.
  `raterQuelquesTentatives()` ajoute des tentatives manquées fictives, sans
  points, pour rétablir un pourcentage crédible — mesuré : 97 %, 92 %, 90 %.

Exemple après 8 semaines de Top 14 : Kerr-Barlow 11 essais, Jauneau 103
plaquages, Vergnes-Taillefer 29 grattages, Hastoy 32/33 au pied — tous issus de
matchs réellement joués par le moteur.

## Le match paie : feuille de match, progression, et passage de semaine

Demande explicite : « fais que quand on termine voir le match ça passe à la
semaine suivante » et « que notre joueur augmente ses stats en fonction de sa
perf dans le match ».

- **`src/lib/moteur/apresMatch.ts`** — `noterMatch()` note la prestation sur 10
  en comparant ce qu'a fait le joueur à ce qu'on attend de SON POSTE
  (`ATTENDU` : plaquages, mètres, essais par 80 min), au prorata du temps de
  jeu. `retourDeMatch()` en tire la forme, le moral, la réputation, et **au plus
  un point d'attribut**, sur l'attribut que la performance a mis en avant.
  ⚠️ **Budget de 3 points par saison** (`BUDGET_MATCHS_PAR_SAISON`), rien après
  33 ans, jamais au-delà du potentiel. C'est calibré pour ne PAS déplacer
  l'étalonnage de difficulté (médiane 58) : ne pas l'augmenter sans relancer
  `scripts/verifDifficulte.ts`.
- **Le match remplace le bouton « Semaine suivante »** (`PanneauJoueur`) : quand
  il y a une affiche, on ne voit plus que « ▶️ Jouer le match ». `MatchLive`
  appelle `onTermine()` à la sirène, et refermer la fenêtre déclenche
  `semaineSuivante()`. Fermer en cours de match (Échap) ne fait rien passer.
- ⚠️ **Plus de récit contradictoire.** `semaineSuivante` n'ajoutait pas ses
  statistiques simulées quand le match avait été regardé, mais il ajoutait quand
  même SON RÉCIT — d'où « tu es resté sur le banc » juste à côté d'une feuille
  de match à 80 minutes. Désormais `matchDejaVecu` neutralise aussi le récit,
  les deltas, le compteur de matchs, les essais et la note.

Vérification : `npx vite-node scripts/verifApresMatch.ts` (note par poste,
budget d'attributs, plafonds d'âge et de potentiel, absence de double comptage).

### Correctifs du moteur suite aux retours en jeu

- ⚠️ **Les positions sont bornées SUR LES DEUX AXES.** Seule la largeur l'était :
  un porteur pouvait dériver derrière la ligne de ballon mort (mesuré : ballon à
  **x = −9** sur un terrain de 0 à 122), le ruck se formait là et les trente
  joueurs s'agglutinaient dans le coin. `formerRuck` borne aussi le regroupement
  dans l'aire de jeu.
- **Force de séparation** (`separer`, tactique.ts) : toute paire à moins de
  1,8 m est écartée, sauf au ruck, en mêlée, en touche et au maul. Joueurs
  superposés : **4,3 → 1,8** sur 30.
- **La largeur des pods est ancrée au POINT DE DÉPART de la phase** (`e.origine`),
  pas au porteur : un bloc d'avants ne traverse plus le terrain derrière le
  ballon. La profondeur, elle, suit le porteur.
- **Les formations de phase arrêtée sont atteintes** : durées visuelles portées à
  9 s (coup d'envoi, touche, après-essai) et 7 s (mêlée, renvoi), plein effort
  pendant les arrêts, et `installerPlacement()` replace directement ceux qui ont
  plus de 26 m à parcourir. Mesuré : **96 % des coups d'envoi et 90 % des touches
  avec tout le monde à moins de 4 m de sa place** (contre 11 % et 3 % avant).
- **Les avants touchent enfin le ballon** : `relais()` ajoute une passe au ras
  entre avants deux fois sur cinq, et un temps de jeu sur trois repart sans
  passer par le 9 (« pick and go »). Passes par équipe et par match : avants
  1 à 2,4 · 9 → 86 · 10 → 55 · centres → 30 · ailiers → 1 à 2.

## Sélections jouées, L'Ovale crédible, vie hors du terrain

Cinq chantiers demandés en bloc. Tout est vérifiable sans navigateur :
`npx vite-node scripts/verifInternational.ts`, `scripts/verifOvale.ts`,
`scripts/verifSituations.ts`.

### 1. Les compétitions de sélections se JOUENT (`src/lib/international.ts`)

⚠️ `COMPETITIONS_NATIONS` (mondeReel.ts) ne contenait qu'un **classement figé**
recopié de la saison réelle : pendant une fenêtre internationale, on ne voyait
ni affiche, ni résultat, ni évolution.

- `FORCE_NATION` reprend les **114 notes World Rugby fournies** ;
  `jouerTestMatch()` en tire un score, avec `scorePossible` — **0 score
  impossible sur toutes les journées**.
- `classementMondial(saison, semaine?)` part de ces notes et applique après
  chaque résultat la formule World Rugby : domicile +3, écart borné à ±10,
  marge >15 ×1,5, Coupe du monde ×2 sur terrain neutre, échange à somme nulle.
  Les U20 et équipes A/B/C/XV sont exclues. Une nation nouvellement admise
  commence à 30. Vérification : `scripts/verifClassementWorldRugby.ts`.
- Trois compétitions tournantes calées sur le calendrier : **6 Nations**
  (6 équipes, 5 journées, aller simple), **The Rugby Championship**, **tournée
  d'automne** (12 équipes, 3 journées). Une saison sur quatre, la **Coupe du
  monde** remplace la tournée (`estAnneeDeCoupeDuMonde`).
- `fenetreInternationale(semaine, saison)` dit quelle compétition et quelle
  journée se jouent — vérifié sur les 8 semaines internationales du calendrier.
- **`effectifNational(nation, saison)`** compose un XV national à partir des
  MEILLEURS joueurs réels du pays, tous clubs confondus (2 par poste, 30 au
  total, vieillis à la saison). Mesuré : France 86,5 de moyenne sur les 23,
  Italie 72,7. C'est ce qui permet de **jouer un match international avec le
  moteur 2D**, exactement comme un match de club.
- Écran 📊 Résultats : nouveau groupe **Sélections** dans le sélecteur, puce
  **« Ma sélection »**, classement + programme journée par journée, et la
  compétition s'ouvre d'office pendant une fenêtre internationale.
- Panneau de carrière : **« ▶️ Jouer avec ta sélection »** remplace le match de
  club quand on est convoqué (`MatchLive` reçoit `selection` et bascule sur les
  effectifs nationaux).

### 2. Les statistiques de fond couvrent coupes et sélections

`simulerJourneeCoupe()` et `simulerJourneeInternationale()` (moteur/saison.ts)
rejouent la journée avec le même moteur, sans rendu. `simulerStatsJournee()`
(store) aiguille selon le type de semaine. ⚠️ `statsReelles` et
`journeesReelles` **fusionnent** désormais les clés au lieu de les écraser : le
championnat, la coupe et la sélection cohabitent. Mesuré : 6 Nations J1 →
116 lignes en 0,7 s ; Champions Cup J1 → 363 lignes en 1,4 s.

### 3. L'Ovale : audience réaliste, profils uniques

⚠️ **Un club de Régionale 3 affichait jusqu'à 400 000 abonnés**, autant que le
Stade Toulousain, et un supporter anonyme 200 000. `ABONNES_CLUB` (comptes.ts)
indexe la fourchette sur le **niveau de la compétition** :

| | mesuré (médiane / max) |
|---|---|
| Top 14 | 305 k / 818 k |
| Pro D2 | 54 k / 85 k |
| Nationale | 11 k / 18 k |
| Fédérale 1 | 1,9 k / 3 k |
| Régionale 1 | 346 / 686 |
| Régionale 3 | 188 / 495 |

- `abonnesJoueur()` : courbe **très raide** (exposant 5,5) — seules les stars
  débordent l'audience de leur club. Toulouse noté 90 → 377 k ; noté 60 → 24 k ;
  Pro D2 noté 70 → 5,2 k.
- `statsDepuisVues()` **borne la cascade** : likes ≤ 34 % des vues, reposts ≤
  likes. Mesuré : **0 incohérence sur 400 publications**.
- **Bios tirées d'un pool par famille** (joueur, supporter, hater, journaliste)
  avec variables (`{tribune}`, `{annees}`, `{place}`) : 326 bios distinctes sur
  374 comptes, contre trois phrases recopiées avant.
- **20 motifs de bannière** au lieu de 6, plus `banniereDuClub()` : un club et
  ses joueurs portent **les couleurs du maillot**. 163 bannières distinctes.
- La **certification** suit la notoriété : un club amateur ou un très bon joueur
  de Fédérale n'a pas de coche bleue.
- **`invitationCoequipier()`** (vie.ts) : une semaine sur deux, quelqu'un du
  vestiaire écrit — barbecue, séance vidéo, padel, salle, visite à l'hôpital des
  enfants, belote au club-house. 12 gabarits × 6 moments = 37 messages distincts
  sur 60 tirages.

### 4. Le panneau central : entraînement permanent, situations contextuelles

- ⚠️ **On ne clique plus sur un secteur chaque semaine.** `entrainementFocus`
  (types.ts) est le secteur travaillé EN PERMANENCE : `choisirFocus()` le pose,
  `semaineSuivante()` déclenche la séance toute seule, et on en change quand on
  veut. Le bouton actif est surligné.
- **« 🎲 Évènement aléatoire » a disparu** : il faisait double emploi. Il ne
  reste que **« 📖 La vie hors du terrain »**.
- **`src/data/situations.ts`** — la grosse base : **30 situations, 85 choix**,
  réparties en 8 catégories (vestiaire, argent, médias, perso, corps, nuit,
  club, carrière). ⚠️ **Aucune ne parle du match en cours** : le match se joue
  dans le moteur.
- **Chaque situation est CONTEXTUELLE** (`quand`) : âge, forme, moral, division,
  argent, contrat, confiance du staff. Mesuré : un espoir de 19 ans en Fédérale 2
  voit 15 situations sur 30, un vétéran de 34 ans en voit 25 ; « le rituel du
  vestiaire » n'est jamais proposé à 35 ans, « le corps parle » jamais à 19 ans.
- `situationsVues` (store, persisté) évite les répétitions : **20 tirages
  successifs → 20 situations distinctes**.
- Avec l'IA locale, c'est le MJ qui écrit la situation ; sinon, on pioche
  dans la base. Même bouton, même rendu.

### 5. Les conséquences dures (`src/lib/consequences.ts`)

⚠️ **Une conséquence dure ne tombe JAMAIS par surprise** : elle est toujours la
suite d'un choix explicite du joueur. Le jeu ne punit pas au hasard.

| Conséquence | Effet |
|---|---|
| `suspension` | indisponible N semaines, réputation et confiance du staff en chute |
| `prison` | idem + salaire suspendu, popularité effondrée |
| `accident` | très longue indisponibilité, **vitesse et endurance perdues, potentiel raboté** |
| `finDeCarriere` | blessure `carriere` → retraite immédiate |
| `deces` | fin de carrière, hommage, entrée au Hall |
| `exclusionClub` | **contrat rompu**, plus de club ni de salaire |
| `relegationFinanciere` | le club est rétrogradé, salaires à −40 % |

Huit issues de la base y mènent : parier sur sa propre compétition, prendre un
produit non identifié, cacher une commotion, prendre le volant ivre, frapper
quelqu'un en boîte, alerter la fédération sur les comptes du club, hausser le
ton devant le président, braquer sec sous la pluie.

**Les tweets aussi.** `lireDerapage()` distingue trois familles et **seulement
trois** : propos discriminatoires → **rupture de contrat**, menaces →
**12 semaines de suspension**, apologie des produits interdits → **18 semaines**.
⚠️ Le clash, la punchline et le règlement de comptes restent autorisés : c'est
le ton du réseau voulu par le projet. Vérifié : « L'arbitre est une
catastrophe » ne déclenche rien, « sale race, retourne dans ton pays » rompt le
contrat.


## Correctifs de jeu (banc, double résumé, L'Ovale, saison passée)

### ⚠️ LE BANC PORTE ENFIN LES MAILLOTS 16 À 23

Deux bugs cumulés, visibles sur la feuille de match :

- **`creerPion` écrasait le poste du banc.** `ORDRE_MAILLOTS[index % 15]`
  renvoyait le remplaçant n°21 — un demi de mêlée choisi comme tel par
  `composer` — au poste de troisième ligne, et le n°23 au poste de **numéro 8**
  (« demi de mêlée en 8 »). Pire, `avant = index % 15 < 8` faisait des HUIT
  remplaçants des avants. Au-delà du quinze de départ, le poste est désormais
  celui que la composition a attribué (`entites.ts`).
- **`gererRemplacements` donnait à l'entrant le numéro du sortant.** Plus aucun
  maillot 16-23 n'apparaissait sur la feuille. Au rugby, le 18 qui remplace le 3
  reste le 18 : il prend sa PLACE, pas son numéro.
- **`BANC_TYPE` suit l'ordre conventionnel** : 16 talonneur, 17 et 18 piliers,
  19 deuxième ligne, 20 troisième ligne, 21 demi de mêlée, 22 ouvreur,
  23 trois-quarts. L'index + 16 EST le numéro de maillot.
- **Le banc entre vraiment** (`MINUTE_ENTREE`) : le seul critère était
  l'endurance, et dans un club aux gros moteurs (mesuré au Stade Toulousain)
  **aucun** remplaçant ne foulait le terrain. Les changements suivent maintenant
  l'HORLOGE — première ligne vers la 50ᵉ, gros de devant vers la 58ᵉ, lignes
  arrière dans le dernier quart d'heure — la fatigue ne faisant qu'avancer
  l'échéance de dix minutes. Mesuré : 16 remplacements par match (cible 10-16).

Vérification : `npx vite-node scripts/verifBanc.ts`.

### ⚠️ UN SEUL RÉSUMÉ DE MATCH PAR WEEK-END

Le journal affichait **deux résumés contradictoires** : une feuille de match à
32 minutes, suivie de « Tu n'es pas retenu dans le groupe ». `matchDejaVecu`
exigeait `resultat.aJoue`, or `jouerMatch` (l'estimation) tire sa titularisation
avec `Math.random()` tandis que le moteur utilise `estTitulaire` — les deux
divergeaient forcément.

- `matchDejaVecu` ne regarde plus que `matchRegarde` : dès que le match a été
  suivi en direct, l'estimation est **entièrement** neutralisée (récit, deltas,
  blessure, compteurs, défis, interviews d'après-match).
- Le RÉSULTAT part avec les statistiques (`enregistrerMatchVecu(stats, contexte)`) :
  l'entrée du journal devient « 📋 30 août · journée 1 — Victoire 34-11 contre
  RC Vannes · 5/10 ». Une seule entrée, et le score y figure.
- ⚠️ **Le tirage de blessure a déménagé** dans `enregistrerMatchVecu`, sur les
  MINUTES RÉELLEMENT jouées : sans ça, regarder ses matchs rendait invulnérable.

### Résumés de match plus positifs (demande explicite)

Quatre phrases couvraient toute l'échelle, et un 6,2/10 — une prestation tout à
fait correcte — s'affichait « Match sans relief ». Sept paliers désormais, trois
formulations chacun, et **le résumé cite ce qu'on a bien fait** (`faitMarquant` :
le doublé, le sans-faute au pied, les ballons grattés, l'abattage en défense).
⚠️ **La note ne bouge pas d'un dixième** : l'étalonnage de difficulté est intact.

### Limite d'âge 44 ans, potentiel jusqu'à 31 (demande explicite)

- `AGE_RETRAITE_FORCEE` passe de 40 à **44 ans**, et elle est **vraiment
  appliquée** : `saisonSuivante` raccroche d'office (le jeu se contentait
  d'afficher « dernière ligne droite » sans jamais arrêter la carrière).
- **On progresse vers son potentiel jusqu'à 31 ans** : le levier de TALENT BRUT
  (`progression.ts`) se coupait à 27 ; il court jusqu'à 31, dégressif après 28.
  `facteurAge` garde sa marche haute jusqu'à 28 ans. Le potentiel lui-même peut
  encore monter jusqu'à 29 ans (26 avant). Le déclin, lui, reste à 31 ans.
- Aligné partout : `apresMatch` (porte fermée à 36 ans, plus 33), `entrainer`
  (`gainDUneSeance`), et `plafonnerDeltas` du MJ (36 / 32, plus 33 / 30).
- ⚠️ **Réétalonné** (`npx vite-node scripts/verifDifficulte.ts`, 100 carrières) :
  médiane **58 → 63**, 90ᵉ centile 80, maximum 86, carrières ≥ 80 : 12/100
  (13 avant), ≥ 85 : 1/100. Le milieu de tableau monte, le sommet ne bouge pas.

### Passer la saison n'escamote plus rien

Trois choses restaient figées en mode « saison rapide » (ou en sautant à la trêve) :

| | avant | maintenant |
|---|---|---|
| blessure | gardait son compte de semaines, à vie | décomptée des semaines sautées, guérison annoncée |
| forme | +10 seulement | vraie préparation d'été (plancher 88, dégressif après 29 ans) |
| entraînement | **jamais joué** | les 43 séances rattrapées d'un bloc (`gainDUneSeance`) |

Mesuré : mode semaine 36 → 100 de plaquage sur 6 saisons, mode saison 32 → 100.
Vérification : `npx vite-node scripts/verifSaison.ts`.

### L'Ovale : un seul nombre d'abonnés, et une audience qui vit

- ⚠️ **`suggestionsLocales` fabriquait ses propres comptes** — pseudo calculé
  autrement (`pseudoDe` au lieu de `pseudoStable`), abonnés inventés sur place
  (« 20 000 à 320 000 » pour un club, quel que soit son étage). Explorer
  annonçait un chiffre, le profil du même compte en annonçait un autre — quand
  il s'ouvrait. Les suggestions viennent maintenant **de l'annuaire**.
- **La génération IA des comptes a été supprimée** : le modèle inventait des comptes AVEC leur nombre
  d'abonnés. L'annuaire en contient 374, gratuits, cohérents et déterministes.
- **`abonnesCible(nom, club, note, réputation)`** (comptes.ts) : l'audience que
  MÉRITE le joueur incarné, indexée sur l'audience de son club (donc son étage)
  puis sur son niveau et sa réputation. `rapprocherAbonnes` fait converger le
  compteur — 1,2 % par semaine, 22 % par saison, 45 % à la signature d'un
  contrat — **vite à la hausse, trois fois plus lentement à la baisse**.
  Mesuré : Top 14 débutant 5 900 · star 272 000 ; Nationale débutant 151 · star 6 950.

### Le classement latéral suit la compétition de la semaine

Il affichait TOUJOURS le championnat, même un week-end de Coupe d'Europe ou de
Tournoi : pendant huit semaines de la saison, le panneau montrait un classement
figé pendant qu'on jouait ailleurs. Désormais : semaine de coupe → la POULE
européenne du club ; fenêtre internationale → la compétition de SA sélection ;
le reste du temps → son championnat. Les divisions amateurs, qui jouent toute
l'année, ne changent pas.

### `LogoEquipe` va chercher l'écusson tout seul

Les appelants passaient `nom` sans `logo` et le composant rendait un carré vide :
**aucune icône dans les classements de sélections**. Il lit maintenant
`LOGO_PAR_EQUIPE` (plus les 86 sélections des nouvelles compétitions), et
retombe sur une pastille d'initiales plutôt que sur du vide.

## ⚠️ PERFORMANCE DE L'IA LOCALE

| | avant | maintenant |
|---|---|---|
| appels par semaine de jeu | **3** (fil + 2 salves de commentaires) | **1** (les commentaires sont dans la même réponse) |
| comptes à suivre | 1 appel IA | **0** — l'annuaire du jeu |
| `REGLES` (envoyé à chaque appel) | ~350 tokens | ~150 |
| décor du monde | 12 coéquipiers détaillés + 10 rivaux, **à chaque appel** | `decorCourt` (1 ligne) partout sauf pour le fil |
| `maxTokens` fil / réponses / message privé | 1300 / 900 / 400 | 1100 / 480 / 220 |
| historique du MJ | 8 messages entiers | 6, tronqués à 600 caractères |
| fiche du joueur | 9 lignes | 4, palmarès borné aux 3 derniers titres |

**L'activité est mesurée** : `activiteIALocale()` (`lib/iaLocale.ts`) cumule
les appels et tokens de la session. Il n'y a ni facture ni quota ; ces nombres
servent à surveiller le temps de calcul. `fileAppels` sérialise toutes les
générations, car WebLLM ne doit jamais en exécuter plusieurs en parallèle.

## SEO et premier chargement (destiny-rugby.fr)

- **`index.html`** : titre sans emoji (Google le retire de ses résultats),
  description réécrite, `canonical`, `robots`, **Open Graph et Twitter Card**
  complets, **JSON-LD `VideoGame`**, `preconnect`. Et un bloc **`<noscript>`**
  qui décrit le jeu : l'application est rendue par React, la page servie à un
  crawler qui n'exécute pas JavaScript était littéralement vide.
- **`public/robots.txt`** (les 117 Mo de `photos/` et les `.glb` sont exclus du
  budget de crawl), **`public/sitemap.xml`**, **`public/site.webmanifest`**.
- **`public/og.png`** — 1200×630, **généré** par `node scripts/genOgImage.cjs` :
  un encodeur PNG écrit avec `zlib` (aucune dépendance), pelouse nocturne,
  ballon de cuir liseré d'or, superéchantillonné ×3 pour l'anti-aliasing.
- ⚠️ **Les drapeaux ne sont plus inlinés** (`assetsInlineLimit: 0`) :
  `flag-icons` recopiait ses 250 SVG en `data:` URI dans la feuille de style —
  **503 Ko de CSS (102 Ko gzip) à analyser avant le premier pixel**. Mesuré
  après : **112 Ko (24 Ko gzip)**, les drapeaux étant devenus des fichiers
  chargés à la vue. ⚠️ L'import de `flag-icons` a déménagé dans `main.tsx` :
  rattaché à un écran paresseux, il laissait les drapeaux sans style sur
  l'écran de création.
- **Écrans chargés à la demande** : Boutique, Panthéon, Classement, Championnats,
  Effectif, Résultats, L'Ovale, plus `MatchLive`. Et **le moteur de match**
  (chunk `moteur`, 106 Ko) : `estTitulaire` a déménagé dans
  `moteur/titulaire.ts` et `simulerStatsJournee` fait un `import()` — le store
  étant chargé dès l'accueil, les 3 500 lignes du moteur partaient sinon dans
  le chunk principal.

## Le reste du monde : 18 championnats et 13 compétitions de sélections

Source : le dossier **`sources/competitions/ligues/`** (flashscore_rugby_data.json + un dossier
de logos par compétition).

| Fichier | Rôle |
|---|---|
| `scripts/nouvellesLigues.cjs` | **LA table** : id, nom, pays, dossier de logos, clé dans le JSON, `niveau` (0-10), `echelle` [note du dernier, note du premier], nation des joueurs, part d'étrangers. C'est ici — et nulle part ailleurs — qu'on ajoute ou recalibre une ligue. |
| `scripts/nomsPays.cjs` | Les pools de prénoms et de noms par pays (22 nations) et la table des nations qui exportent des joueurs. |
| `scripts/genNouvellesLigues.cjs` | Le générateur : copie les écussons, calcule la note de chaque club depuis son classement réel, **génère un effectif de 30 joueurs par club**, calcule la force de chaque sélection. **Relancer** : `node scripts/genNouvellesLigues.cjs`. |
| `src/data/nouvellesLigues.ts` | ⚠️ **GÉNÉRÉ**. 18 compétitions, **183 clubs**, **5 070 joueurs**, 13 compétitions de sélections, 86 équipes nationales. Encodage compact, comme `effectifsReels.ts`. |

**Ce qui est réel** : les clubs, leur hiérarchie (calculée moitié rang, moitié
valeur — points et différence de points par match de la vraie saison) et leurs
**247 écussons**. **Ce qui est généré** : les joueurs — les données ne
fournissent aucun effectif.

⚠️ **La mixité est voulue** (demande explicite) : chaque championnat tire ses
noms dans le pool de SON pays, plus une part d'étrangers propre à la ligue
(6 % en Argentine, 32 % en Serie A Elite). Mesuré : Batumi = 27 Géorgiens,
1 Argentin, 1 Français, 1 Australien ; El Salvador = 24 Espagnols et 6 étrangers
de 5 nations différentes.

Les 18 championnats : Championship Cup (Angleterre), Top 12 argentin, Super
Series (Écosse), División de Honor, SM-sarja (Finlande), Didi 10 (Géorgie),
All-Ireland League, Serie A Elite, Heartland Championship (NZ), Ereklasse
(Pays-Bas), Welsh Premiership, Super Rygbi Cymru, Welsh Challenge Cup,
Ekstraliga (Pologne), CN Honra (Portugal), Extraliga (Tchéquie), Liga Națională
(Roumanie), Premier League russe.

Les 13 compétitions de sélections : Oceania Cup, Rugby Europe Championship /
Trophy / Conference, Americas Championship, Americas Pacific Challenge, Autumn
Nations Cup, IRB Tbilisi Cup, Nations Cup, Pacific Challenge, The Rugby
Championship (et son U20), World Rugby U20 Trophy.

⚠️ **`forceNation` et la liste des compétitions sont MÉMOÏSÉES À LA DEMANDE**,
jamais construites en tête de module : une boucle exécutée à l'évaluation de
l'import laissait la constante dans sa zone morte au moindre cycle
(`ReferenceError` au démarrage, écran blanc). Les 32 nations calibrées à la
main gardent la priorité sur les forces calculées.


## Ambiance de couleur et confort sur téléphone

### Trois ambiances (demande explicite)

⚠️ **Tout le thème tient dans six variables.** Le design system entier est bâti
sur la rampe `--pelouse-*` (le fond, les cartes, les bordures, les jauges) : il
suffit de la redéfinir dans un bloc `:root[data-theme=…]` d'`index.css` pour
repeindre le site, sans toucher une seule règle ailleurs. **Pelouse** (défaut),
**Nuit** (bleu), **Grenat** (rouge). L'or, le cuir et la craie ne bougent pas —
ce sont eux qui donnent au jeu son identité « stade nocturne », quelle que soit
la couleur choisie.

- Le nom des variables reste `--pelouse-*` : ce sont des NIVEAUX de fond, pas
  une couleur, et les renommer casserait 2 900 lignes de CSS pour rien.
- `appliquerTheme()` (store) pose `data-theme` sur `<html>` et met à jour la
  balise `theme-color` : sans elle, la barre d'adresse du téléphone reste verte
  sur un thème rouge et la découpe se voit. Elle est **reposée à la
  réhydratation**, sinon le site repart en vert à chaque rechargement.
- Le choix se fait dans ⚙️ Réglages (« Ambiance »), et il est persisté.

### Téléphone d'abord (demande explicite)

Le jeu TENAIT sur mobile — rien ne débordait — mais il n'y était pas AGRÉABLE :
l'écran de carrière devient un long défilement (fiche du joueur, classement,
journal), et le bouton qui fait avancer le jeu se retrouvait à plusieurs écrans
du fil qu'on est en train de lire.

- **`.barre-jouer`** — une barre FIXE en bas de l'écran, sous 900 px, avec la
  semaine en cours et l'action principale (▶️ Jouer le match, ou Semaine
  suivante). ⚠️ Rendue par `createPortal(document.body)` : le `backdrop-filter`
  des `.carte` crée un bloc conteneur qui piège les `position: fixed`.
- **La navigation devient une bande qui défile** au lieu de passer sur deux
  rangées de boutons de 28 px de haut.
- **Rien à viser en dessous de 44 px** : barre d'actions du panneau à
  3 colonnes (56 px de haut), secteurs d'entraînement à 2 colonnes, suggestions
  et champs à 46 px. ⚠️ **16 px sur tous les champs de saisie** : en dessous,
  iOS zoome automatiquement à la mise au point et laisse la page décalée.
- **Le match en direct passe en plein écran** (`100dvh`, sans marge ni coin
  arrondi) : le terrain gagne 25 % de largeur. Son en-tête passe en flex — en
  grille, la croix de fermeture (absolue) gardait sa colonne et renvoyait
  l'équipe visiteuse à la ligne.
- **Encoches et barre de gestes** respectées (`env(safe-area-inset-*)`), et
  `background-attachment: scroll` sous 900 px : un fond fixe est recomposé à
  chaque image et saute avec la barre d'adresse iOS.
- **L'atlas des clubs passe à deux colonnes** (une seule sous 420 px), les
  classements masquent leurs colonnes secondaires, et les tableaux larges
  (poules de coupe, arbre de phase finale) défilent DANS leur conteneur plutôt
  que d'emporter la page entière de côté.

Vérifié à 375 × 812 : **aucun débordement horizontal**, barre d'action toujours
sous le pouce, match lisible en plein écran.

## Le jeu en sept langues

| Fichier | Rôle |
|---|---|
| `src/lib/i18n.ts` | Le socle, **sans aucune dépendance** (40 lignes ; i18next pèserait plus lourd que tous les textes réunis) : `t()`, `tn()`, la détection de la langue du navigateur, et **`consigneDeLangue()`**. |
| `src/data/textes.ts` | Le dictionnaire. Clés `zone.element`, **le français obligatoire** (le type l'impose), les six autres langues facultatives. |

Langues : **français, anglais, espagnol, italien, allemand, portugais, japonais**.
La langue du navigateur est détectée au premier lancement — un joueur italien qui
arrive sur destiny-rugby.fr n'a pas à chercher le sélecteur.

### ⚠️ CE QUI REND LE JEU RÉELLEMENT MULTILINGUE

Traduire les boutons ne sert à rien ici : **l'essentiel de ce qu'on lit est écrit
à l'exécution** par le modèle local — le récit du Maître du Jeu, les situations, les tweets,
les messages privés, le coaching en direct. On ne les traduit donc pas : on
demande au modèle d'écrire DIRECTEMENT dans la langue du joueur.

`consigneDeLangue()` est ajoutée en tête de **chaque** prompt (`lib/iaLocale.ts`,
`lib/ia.ts`, `lib/iaSociale.ts`, `lib/moteur/consignes.ts`). Elle est rédigée en
anglais — c'est la langue dans laquelle les modèles suivent le mieux une
instruction de langue, y compris pour produire du japonais — et elle protège
explicitement les noms propres : clubs, compétitions et joueurs ne se traduisent
jamais. **Elle est vide en français** : pas un token gaspillé pour le cas par
défaut.

### Les règles du socle

- **Le français est la source.** Une clé absente d'une langue retombe sur le
  français : jamais de trou à l'écran, jamais de `missing.translation.key`. On
  peut donc ajouter un écran sans traduire sept langues dans la même respiration.
- **La langue vit dans un module, pas dans React** : `t()` est appelée depuis des
  fonctions pures (libellés de postes, formatage) qui n'ont pas de hook. Le store
  la synchronise (`setLangue` → `definirLangue`), et la repose à la
  réhydratation.
- ⚠️ **Changer de langue redessine tout** : `App` s'abonne à `langue` et s'en
  sert comme `key` sur l'arbre. Un seul remontage, instantané — plutôt qu'un
  contexte à faire traverser les cent fichiers de l'interface.
- `document.documentElement.lang` suit la langue choisie : c'est ce que lisent
  les lecteurs d'écran et les moteurs de recherche.

### Couverture, honnêtement

**Traduit dans les sept langues** : la navigation, l'accueil, les réglages, le
panneau de carrière, le classement latéral, le match en direct, L'Ovale, la
boutique, le Hall, la création — soit l'ossature de l'interface.

**Écrit dans la langue du joueur par l'IA locale** (quand elle est active) : tout le récit,
les situations, les interviews, les tweets, les messages privés, le coaching.

**Encore en français** : le contenu HORS LIGNE pré-écrit (`data/situations.ts`,
`data/evenements.ts`, `data/scenarios.ts`, `data/moments.ts`, les pools de
commentaires de `moteur/commentaire.ts` et les gabarits de `lib/vie.ts`), soit
~1 500 phrases qui ne servent qu'en mode sans clé. C'est le prochain lot : ajouter
une clé et sa traduction dans `data/textes.ts` suffit, le socle est en place.


## Retours de jeu — la passe de correction (dernier lot)

Douze bugs et demandes signalés en jeu, traités d'un bloc. Chaque section dit
**ce qui n'allait pas**, **pourquoi**, et **comment le vérifier**.

### ⚠️ « Top 14 avec 16 équipes, Pro D2 à 14 » — LA FIN DE SAISON ÉTAIT CALCULÉE DEUX FOIS

C'est le bug le plus profond du lot. La fin de saison passait par **deux
chemins** qui ne donnaient pas le même résultat :

| | ancre | apport du joueur |
|---|---|---|
| `resoudrePyramide()` (division du joueur) | son club | **oui** (`bonusJoueur`) |
| `resoudreToutesDivisions()` (les 10 étages) | premier club du fichier | non |

Deux championnats différents → deux champions différents. Le store fusionnait
les deux listes en **dédoublonnant par nom de club** : quand les deux calculs ne
désignaient pas le même, **les deux montaient**. Le Top 14 gagnait un club par
saison, la Pro D2 en perdait un.

- **`phaseFinaleDe(division, saison)`** (`lib/promotion.ts`) est désormais LA
  source unique, mémoïsée, et elle connaît le contexte du joueur
  (`setContexteJoueur`, posé par `resoudrePyramide`). Tout le monde lit le même
  championnat.
- **`equilibrerMouvements()`** est la ceinture ET les bretelles : pour chaque
  division, autant de clubs doivent entrer que sortir, sinon le mouvement le
  moins prioritaire est annulé. Un cas limite futur ne pourra plus faire dériver
  la taille d'un étage.
- **La division AFFICHÉE** venait de `competitionDuClub()`, c'est-à-dire de la
  pyramide FIGÉE dans `data/clubs.ts` : un club promu restait affiché en Pro D2.
  `competitionEffective(club, divisionDeclaree)` (`lib/divisions.ts`) lit dans
  l'ordre la fiche du joueur, le registre des mouvements, puis les données.

Vérification : `npx vite-node scripts/verifPyramide.ts` — **douze saisons, dix
étages, aucune division ne change de taille**.

### ⚠️ LE PLACEMENT SUR LE TERRAIN — « les joueurs font un nuage »

Deux causes, mesurées avant/après (`scripts/verifPlacementPied.ts`) :

| | avant | après |
|---|---|---|
| cibles dans un en-but | 8,7 % | **0,3 %** |
| positions dans un en-but | 7,6 % | **0,7 %** |
| cibles à moins de 4 m d'une touche | 12,9 % | **7,0 %** |
| plus gros tas de cibles (rayon 8 m), moyenne | 9,7 | **6,9** |
| 95ᵉ centile | 17 | **10** |

1. **Les cibles en largeur étaient RABOTÉES.** `bornerY` ramène une valeur hors
   terrain sur la bordure : dès que le ballon approchait d'une touche, six
   joueurs recevaient exactement la même valeur (3,2 m ou 66,8 m) et
   s'empilaient. **`repartirY(pions, ecartMin)`** garde l'ordre voulu et impose
   un écart minimal entre voisins, en repliant vers l'intérieur — l'écart se
   resserre tout seul quand la largeur ne suffit pas. Appliqué aux pods
   d'avants (6 m), à la ligne de trois-quarts (5 m) et au premier rideau (4,2 m).
2. **Les cibles n'étaient bornées QUE sur la largeur.** Un ouvreur à 17 m de
   profondeur, alors que son équipe joue à 8 m de sa propre ligne, se voyait
   assigner une position DERRIÈRE sa ligne d'essai. **`bornerX`** l'interdit
   partout, sauf pour un chasseur lancé sur le porteur (rattraper un joueur qui
   plonge dans l'en-but, c'est le jeu).
3. La force de séparation passe de 1,8 à **2,6 m**, en deux passes.

⚠️ **DEUX PISTES TESTÉES ET ÉCARTÉES**, chiffres à l'appui — ne pas les
reproposer :

- **Décaler les poursuivants** pour « éventer » le paquet : le rayon de plaquage
  n'est que de 1,35 m, un décalage de 1,6 m transforme la poursuite en course
  parallèle. Mesuré : plaquages 259 → 190, percées 21 → 29, rucks 179 → 129.
- **Forcer le recalcul du placement à chaque reprise de jeu** (`e.compteur = 0`
  dans `reprendreJeu`) : la défense se remettait aussitôt sur sa ligne théorique
  — lue sur le 4ᵉ défenseur, donc parfois trente mètres en arrière — au lieu de
  rester au contact une demi-seconde de plus. Mesuré : coups de pied 51 → 65.
  L'étalonnage du moteur tient à ce demi-temps de retard.

### ⚠️ LE JEU AU PIED : moins de coups de pied, et les VRAIES règles de touche

- **Fréquence** : le dégagement de ses 22 passe de 74 % à **60 %** des phases,
  l'occupation depuis son camp de 20 % à **13 %**, le rasant de 5 % à 3,2 %.
  Résultat : **52 coups de pied par match** (57,6 avant, cible 35-60).
- **Portée réaliste** : `26 + pied/2,2` donnait 65 mètres à un bon buteur — un
  dégagement pris sur sa ligne des 22 finissait DANS les 22 adverses. C'est
  maintenant `24 + pied/3,2`, soit 40 à 55 m comme dans le rugby professionnel.
- **Les trois règles sont GÉOMÉTRIQUES**, plus déclaratives. Le moteur ne
  regardait que l'INTENTION du botteur : un dégagement d'occupation qui finissait
  en touche dans les 22 adverses rendait le ballon à l'adversaire, alors que
  c'est la définition même du 50/22.
  1. **50/22** — coup de pied parti de SON CAMP, sorti en touche DANS LES 22
     adverses → **touche pour l'équipe qui a botté** ;
  2. **direct en touche depuis l'extérieur de ses 22** → aucun gain de terrain,
     **touche à l'endroit du coup de pied**, pour l'adversaire ;
  3. **depuis ses 22** → le gain est acquis, touche là où le ballon est sorti.

Vérification : `npx vite-node scripts/verifPlacementPied.ts` et
`scripts/verifMoteur.ts` (tous les chiffres du moteur restent dans leur cible).

### L'Ovale : commentaires, reposts, posts qui restent, abonnés qui partent

- ⚠️ **Le plafond de commentaires était de QUATRE**, quel que soit le post : un
  tweet de club à 800 000 vues en récoltait autant qu'un post à 40 000. Le
  barème monte maintenant à **douze**, indexé sur les vues — et le pool de
  phrases a été multiplié par cinq (`lib/vie.ts`, `data/social.ts`) pour tenir
  la charge sans jamais se répéter : ~30 gabarits par famille, chacun à deux ou
  trois alternatives.
- ⚠️ **Reposter/dé-reposter gonflait les vues à l'infini** : `reposter()`
  ajoutait 4 % de vues à chaque activation et n'en retirait jamais
  (`Math.max`). Le bonus exact est mémorisé (`PostSocial.bonusRepost`) et repris
  au dé-repost. Vérifié : trois allers-retours, compteurs identiques.
- ⚠️ **Tes publications disparaissaient.** Le fil était tronqué aux 80 posts les
  plus récents, or chaque semaine y déverse 8 publications du monde : au bout de
  dix semaines — le temps d'un changement de club — tes tweets étaient poussés
  dehors. `limiterPosts()` sépare les deux fils : **les tiens (120) ne sont
  jamais évincés**, ceux du monde tournent (60). Les posts que tu as commentés
  ou repostés restent aussi.
- **On perd des abonnés quand on dit n'importe quoi** (demande explicite) :
  `publierPost` retourne désormais un gain NET. Trois causes cumulables — le
  dérapage qui fait convoquer par le club, les mots interdits, une timeline
  hostile — jusqu'à 22 % de l'audience. Un propos discriminatoire ou une menace
  (`lireDerapage`) vide **la moitié du compte** dans la journée. Et une **saison
  ratée** coûte jusqu'à 18 % des abonnés à l'intersaison (sous 5/10), 5 % de plus
  si le staff ne te fait plus confiance.

### Le marché : plus personne ne voulait du meilleur joueur du monde

Le plancher de recrutement était ABSOLU (« pas plus de 16 points sous la cote
du joueur »). À partir d'une cote de 98 — atteignable avec 99 de générale et
100 de réputation — le meilleur étage du jeu (`NOTE_PAR_NIVEAU[0] = 82`) tombait
sous ce plancher : la boucle jetait TOUTES les compétitions et **plus aucun club
ne faisait d'offre**. Le plancher est devenu RELATIF (`min(cote − 16,
meilleur club accessible − 8)`), en deux passes.

⚠️ **ON NE JOUE PLUS UNE SAISON SANS CONTRAT.** Le contrat tombait à zéro, des
offres arrivaient, et si on les ignorait la saison suivante se jouait comme si
de rien n'était — salaire compris. `saisonSuivante()` s'arrête maintenant net et
rouvre « Choix de carrière » ; si personne ne veut de toi, la carrière s'arrête.
⚠️ **Conséquence pour les scripts** : un test qui enchaîne des saisons doit
signer PUIS relancer (voir `scripts/verifDifficulte.ts`), sinon il compte des
saisons qui n'ont pas été jouées.

Vérification : `npx vite-node scripts/verifMarche.ts`.

### Les moins de 20 ans

- **Deux compétitions** dans `COMPETITIONS_INTERNATIONALES` : Tournoi des
  6 Nations U20 (fenêtre du Tournoi) et Championnat du monde U20 (fenêtre
  d'automne). Les équipes portent le suffixe `U20` — c'est la clé de
  `LOGO_PAR_EQUIPE` ET ce que `forceNation` reconnaît pour appliquer l'écart
  d'âge (**−15 points** sur la sélection A). ⚠️ L'équipe galloise s'appelle
  « Galles U20 » dans les données alors que les séniors sont « Pays de Galles » :
  `NOM_U20` / `NOM_SENIOR` font le pont.
- **`convocationU20()`** (`lib/selection.ts`) : éligible jusqu'à 20 ans, barre
  abaissée de 15 points par rapport aux séniors, et une concurrence comptée
  **uniquement parmi les joueurs de 20 ans ou moins du pays** (3 places par
  poste). À 21 ans la porte se ferme, définitivement.
- **`effectifNational('France U20', saison)`** puise dans le même vivier réel,
  borné à 20 ans. ⚠️ Les bases ne listent pas les académies : l'Irlande n'avait
  que douze joueurs de moins de 20 ans. On élargit donc l'âge source par paliers
  (20 → 23) en RAMENANT les joueurs à vingt ans (note recalculée à cet âge), puis
  on complète jusqu'à 23 avec des joueurs générés qui empruntent leurs nom et
  nationalité au vivier du pays. Une cape U20 ne compte **pas** dans
  `Joueur.selections`.
- Dans le panneau de carrière, « ▶️ Jouer avec les U20 » remplace le match de
  club quand on est appelé chez les jeunes et pas chez les A.

Vérification : `npx vite-node scripts/verifU20.ts`.

### Boutique, classement, réglages

- ⚠️ **Les boosts ont été supprimés.** Ils vendaient « +2 à tous les attributs »
  pour 80 Ovas : en contradiction directe avec l'étalonnage de difficulté. La
  boutique ne vend plus que du cosmétique. Ne pas les réintroduire sans relancer
  `scripts/verifDifficulte.ts`.
- **Les articles montrent le VRAI ballon en 3D** (`components/VignetteBallon.tsx`)
  et non plus une pastille de couleur : canvas sans décor, `dpr` plafonné à 1,5,
  repli sur la pastille en `modeAllege()` (≤ 4 cœurs ou `prefers-reduced-motion`).
- **Le classement part VIERGE** : `classementComplet` ne verse plus les
  `LEGENDES_FICTIVES`. Un dépliant explique, dans l'écran, comment le brancher
  sur un vrai backend (table `carrieres`, envoi à la retraite, lecture au
  chargement) **et les deux garde-fous indispensables** — recalculer le score
  côté serveur, limiter les envois par appareil.
- ⚠️ **La modale de réglages ne défilait pas.** Deux causes : `place-items:
  center` sur une grille dont l'élément dépasse la hauteur déborde des DEUX côtés
  (le haut de la modale passait hors fenêtre, hors d'atteinte), et ni l'overlay
  ni la modale n'avaient d'`overflow`. Corrigé par `align-items: safe center` +
  `max-height: 100dvh` + `overflow-y: auto`. La fiche de club, qui a déjà son
  ascenseur interne, passe en `overflow: hidden` pour ne pas en avoir deux.
  Vérifié en jeu : contenu 1 235 px dans 686 px de fenêtre, défilement complet,
  boutons Annuler/Enregistrer atteignables — desktop comme mobile.

### Écussons, drapeaux, notes de club et traductions

- **Les écussons de sélections** viennent de `sources/logos/selections/principaux/`
  et de `sources/logos/selections/catalogue/`
  (`node scripts/copierLogosSelections.cjs`). Les anciens pesaient 150 à 1 200
  octets — de simples vignettes ; les nouveaux, 3 à 12 Ko, sont les vrais
  écussons. ⚠️ `LogoEquipe` perd son `loading="lazy"` : même leçon que pour les
  avatars de L'Ovale, sur des vignettes de 40 px dans un conteneur en
  `content-visibility: auto`, le chargement ne se déclenche jamais. Vérifié en
  jeu : 39 écussons principaux et **77 entrées de catalogue** affichables. Les
  24 variantes restantes sont conservées pour les féminines, le rugby à 7 ou
  de futurs effectifs. Le générateur vérifie les signatures et refuse les pages
  HTML maquillées en images. ⚠️ `LOGO_SELECTION_PRINCIPALE` a toujours priorité
  sur `LOGO_SELECTION_CATALOGUE` dans `LogoEquipe` ; le catalogue est un repli,
  jamais un remplacement du lot principal.
- **Les drapeaux des 18 nouvelles ligues** : elles arrivaient avec
  `drapeaux: []`. Le code vient de `data/nations.ts`, la même table que
  `<Drapeau>` — donc `gb-sct`, `gb-wls` et `gb-eng` pour les nations
  britanniques. 28 championnats du monde sur 28 ont leur drapeau.
- **La note des clubs des nouvelles ligues** ne s'affichait pas : l'atlas ne
  lisait que `NOTE_CLUB_REEL` (les 143 clubs de la base d'origine). Les 183 clubs
  ajoutés ont leur propre table, `NOTE_CLUB_NOUVEAU`.
- **Les traductions** : le dictionnaire existait mais **seuls `Nav` et
  `Réglages` appelaient `t()`**. Sont désormais branchés : l'accueil (y compris
  ses trois arguments), le panneau de carrière, le classement latéral, le match
  en direct, la boutique, l'atlas, la création, le Hall, l'écran Résultats, le
  panneau d'offres et la navigation de L'Ovale. **160 clés, 100 % dans les sept
  langues.** Restent en français : `Profil`, `Effectif`, `Classement`, `Carrière`
  et les modales secondaires.

Vérification : `npx vite-node scripts/verifTraductions.ts` (clés inconnues,
couverture par langue, écrans encore non branchés).

### Palmarès et succès

`Joueur.titres` n'était qu'une liste de libellés (« Bouclier de Brennus (S4) ») :
impossible d'en tirer un succès du type « champion avec trois clubs différents ».
**`Joueur.palmares`** (`TitreGagne[]`) enregistre en plus l'id du trophée, la
saison ET **le club**. Quinze succès de palmarès s'appuient dessus : le Bouclier,
la dynastie (3 Brennus), les deux coupes d'Europe, le doublé championnat + Europe
la même saison, le Tournoi, la Coupe du monde, meilleur joueur du monde, champion
avec 2 puis 3 clubs, trois titres avec le même club, champion de trois divisions
françaises, dix titres, un titre à l'étranger, trois saisons de suite.
⚠️ Les vieilles sauvegardes voient leur palmarès **reconstruit depuis les
libellés** (`palmaresDepuisLibelles`) — mais sans le club, qui n'a jamais été
enregistré : les succès « avec N clubs » ne comptent que les titres à venir.

### Les scripts de vérification ajoutés

```bash
npx vite-node scripts/verifPyramide.ts        # tailles de divisions sur 12 saisons
npx vite-node scripts/verifPlacementPied.ts   # placement, en-buts, 50/22 et touches
npx vite-node scripts/verifMarche.ts          # offres à tous les niveaux, fin de contrat
npx vite-node scripts/verifU20.ts             # compétitions U20, écussons, drapeaux
npx vite-node scripts/verifTraductions.ts     # clés, couverture, écrans branchés
npx vite-node scripts/verifLogosSelections.ts # images valides + couverture World Rugby
node scripts/copierLogosSelections.cjs        # sources/logos/selections/ → public/
```


## 📖 LE RÉCIT HEBDOMADAIRE — la boucle de jeu a changé

⚠️ **C'est la modification la plus structurante depuis le moteur de match.**
Demande explicite : « au lieu d'avoir des boutons chaque semaine, l'IA sort un
évènement ; les évènements peuvent être très variés, du sportif aux folies
furieuses qui peuvent mener à la mort, à l'arrestation, etc. ; le joueur répond
en **écrivant** et l'IA juge la réponse — elle doit être **très sévère** et prendre
en compte les stats. Sinon, juste des scénarios et des réponses à choix
multiples. »

### La boucle

| Avant | Maintenant |
|---|---|
| un bouton « 📖 La vie hors du terrain », **2 fois par saison** | une scène **chaque semaine**, automatique |
| des choix multiples, toujours | on **écrit** sa réponse (IA locale) · choix multiples (repli pré-écrit) |
| un « moment décisif » de 80ᵉ minute posé **après** le coup de sifflet | supprimé |
| un transfert **raconté** qui n'arrivait jamais | le **vrai marché** s'ouvre, et signer déplace vraiment le joueur |

Trois états, **jamais deux à la fois** : `evenementHebdo` (une réponse écrite est
attendue), `scenarioActif` (un clic est attendu), ou rien (action libre).

| Fichier | Ce qui change |
|---|---|
| `src/lib/ia.ts` | **`genererEvenementHebdo()`** pose la scène (2-4 phrases, aucune option, un champ `risque`) et **`jugerReaction()`** tranche. Les prompts imposent la variété (sportif, club, médias, argent, vie perso, nuit et dérives, pur hasard) et la sévérité (l'échec est l'issue normale, `deltas: {}` la réponse la plus fréquente). |
| `src/store/useGame.ts` | `attenteEvenement` (un ordre donné à l'écran, **non persisté**), `evenementHebdo` et `evenementsVus` (persistés). `poserEvenementHebdo`, `appliquerJugement`, `abandonnerEvenement`. |
| `src/screens/Carriere.tsx` | La boucle. ⚠️ C'est l'**écran** qui fabrique la scène : l'inférence locale est asynchrone, le store est synchrone. Un verrou de ré-entrée (`fabrique`) empêche deux générations pour la même semaine. |
| `src/components/PanneauJoueur.tsx` | **On n'avance plus en laissant une question en plan** : « Semaine suivante » et « Fin de saison » sont bloqués tant qu'on n'a pas répondu. |

### ⚠️ CE QUI PROTÈGE LE JOUEUR

- **Les deltas repassent par `plafonnerDeltas`**, budget de saison compris
  (`BUDGET_IA_PAR_SAISON` = 4). Quarante-trois semaines de récit ne déplacent
  donc **pas** l'étalonnage de difficulté : mesuré après la bascule, médiane 63,
  90ᵉ centile 80, maximum 85, ≥ 80 : 10/100. Inchangé.
- **`ressembleATriche()` s'applique aussi ici** : « donne-moi +10 en vitesse »
  garde son récit et ne rapporte rien.
- **UNE CONSÉQUENCE DURE EXIGE UNE SCÈNE DANGEREUSE.** Le générateur marque
  environ une scène sur cinq `risque: true` ; `parserJugement` **refuse**
  `consequence` sur toutes les autres. Sans ce verrou, une réponse maladroite à
  « le kiné te propose un massage » pouvait finir à la morgue. Une valeur
  inventée (« teleportation ») est ignorée.
- **LE MJ NE CHANGE JAMAIS DE CLUB DANS SON RÉCIT.** Le prompt le lui interdit ;
  il peut seulement lever `marche: true`, ce qui ouvre le **vrai** panneau
  « Choix de carrière » (`demanderTransfert`). Le club, la division, le salaire
  et la durée ne bougent qu'à la **signature**.

### ⚠️ LES TRANSFERTS DE FAÇADE ONT DISPARU

`IssueChoix.transfert: { club, division }` a été **supprimé** au profit de
`marche?: boolean`. L'ancien champ écrivait le nom du nouveau club dans la fiche
sans toucher au contrat, au salaire ni à la division — et **aucun scénario ne le
remplissait**, si bien que « Offre d'un club plus huppé » racontait un départ qui
n'arrivait jamais. C'est le bug signalé : « les transferts marchent pas ».

### ⚠️ LES MOMENTS DÉCISIFS SONT SUPPRIMÉS

`data/moments.ts` et `data/textesMoments.ts` ont été **effacés**. Ils posaient un
choix de 80ᵉ minute (« mêlée à cinq mètres de ta ligne, que dis-tu au pack ? »)
**après** la sirène, alors que la feuille de match était déjà au journal, score
compris. Le match se joue dans le moteur 2D (`lib/moteur/`), et nulle part
ailleurs. L'**interview d'après-match**, elle, reste : elle arrive après le
match, c'est sa raison d'être — mais seulement quand aucune scène n'attend.

### ⚙️ CE QUE ÇA CALCULE, HONNÊTEMENT

La section « PERFORMANCE DE L'IA LOCALE » plus haut annonce **1 génération par semaine
de jeu** (le fil de L'Ovale). Le récit en ajoute **2** — la scène
(`maxTokens` 240) et son jugement (300). Soit **3 appels par semaine**,
~130 par saison. Il n'y a ni prix ni quota, mais le temps GPU reste mesuré :
`activiteIALocale()` le compte et ⚙️ Réglages l'affiche. Sans IA locale, le
jeu reste **entier** (choix multiples tirés de `data/scenarios.ts` et
`data/situations.ts`, sans rationnement — `lancerScenario(false)`).

Vérification sans navigateur : `npx vite-node scripts/verifRecit.ts`
(scène demandée chaque semaine, dix semaines hors ligne, plafonds et budget,
verrou des conséquences dures, transfert réellement appliqué, zéro moment
décisif sur 40 semaines).


## 🩹 Trois correctifs de données (mêmes retours de jeu)

### ⚠️ LES SÉLECTIONS DES PETITES NATIONS ÉTAIENT INATTEIGNABLES

« C'est dur d'atteindre des sélections pour des nations faibles alors qu'on est
très bon. » **La cause n'était pas le palier, c'était le calendrier.**
`convocation()` ouvrait grand la porte (palier par défaut 55, quasi aucune
concurrence dans les effectifs professionnels)… mais `fenetreDe()` retenait la
**PREMIÈRE** compétition de la fenêtre, toujours la même : le Tournoi des
6 Nations en février, la tournée d'automne en novembre. Un Belge, un Portugais ou
un Roumain n'y figure pas — il n'était donc **jamais** aligné, quel que soit son
niveau, alors que le Rugby Europe Championship se jouait sur la même fenêtre.

`fenetreInternationale(semaine, saison, equipe)` retient désormais en priorité la
compétition où **sa** sélection est engagée. Mesuré : Portugal, Roumanie,
Espagne, Belgique, Pays-Bas, Allemagne et Suisse ont **5 fenêtres sur 8** (Rugby
Europe Championship) et un joueur à 78 de générale y est **convoqué et aligné**.
Les grandes nations ne bougent pas : un joueur moyen reste dehors, une star est
prise. Vérification : `npx vite-node scripts/verifSelection.ts`.

⚠️ Les 3 fenêtres d'automne restent sans compétition pour ces nations : la
tournée d'automne est un plateau Nord/Sud fermé. C'est voulu, pas un oubli.

### ⚠️ LES CLUBS AMATEURS N'AVAIENT PAS DE NOTE

« Les clubs de Nationale 2 à Régionale 3 n'ont pas leur générale marquée dans la
section Clubs. » Elle n'y était pas parce qu'elle **n'existait pas** : tous les
clubs d'un étage partageaient `NOTE_PAR_NIVEAU`, donc l'afficher revenait à
répéter le niveau de la division sur les 157 cartes de la Fédérale 3.

**`noteAmateur(nomClub, niveau)`** (`lib/effectif.ts`) la tire du **nom du club**,
de façon déterministe — comme on tire déjà l'âge et la note de ses joueurs.
Étalement **±4**, loi **triangulaire** : la hiérarchie des étages ne se brouille
jamais, mais dans une poule on distingue enfin celui qui vise la montée de celui
qui lutte. ⚠️ **C'est la MÊME note qui compose l'effectif du club**
(`effectifAmateur`), donc la carte de l'atlas et la fiche du club disent la même
chose. Mesuré en jeu : Nationale 2 58-60, Fédérale 3 39-45, Régionale 3 29-32.

⚠️ **Étalonnage revérifié** : `verifDifficulte.ts` → médiane 63, max 85,
≥ 80 : 10/100 ; `verifPyramide.ts` → aucune division ne change de taille sur
12 saisons.

### ⚠️ LES DEUX CHEETAHS ÉTAIENT INVERSÉS

« Les Cheetahs sont dans la Currie Cup. » Bloemfontein a **deux** entités, et le
jeu leur avait donné le mauvais nom chacune :

| | Avant | Maintenant |
|---|---|---|
| Coupes d'Europe (effectif réel, note 66) | *Free State Cheetahs* | **Toyota Cheetahs** — la franchise |
| Currie Cup (effectif généré, note 62) | *Toyota Cheetahs* | **Free State Cheetahs** — l'union |

La Currie Cup se joue avec les **unions** sous leur nom propre (Blue Bulls,
Golden Lions, Sharks XV…) : la règle existait déjà dans `nouvellesLigues.cjs`,
elle était simplement appliquée à l'envers pour Bloemfontein. Corrigé dans les
deux tables sources (`scripts/ligues.cjs` et `scripts/nouvellesLigues.cjs`), puis
`node scripts/genMonde.cjs` et `node scripts/genNouvellesLigues.cjs`.

⚠️ **Bug de générateur corrigé au passage** : `genMonde.cjs` écrivait
`import type { PosteId }` alors qu'il émet des **familles** de poste
(« pilier », « deuxieme_ligne »…). `PosteId`, ce sont les quinze maillots
numérotés : le fichier généré ne compilait pas tant qu'on ne le rectifiait pas à
la main après chaque régénération. Il écrit maintenant `FamillePoste`.

### Les scripts de vérification ajoutés

```bash
npx vite-node scripts/verifRecit.ts       # récit hebdomadaire, plafonds, transferts réels
npx vite-node scripts/verifSelection.ts   # sélections atteignables, petites nations comprises
```


## 🗄️ L'ARMOIRE À TROPHÉES — les étagères sont MESURÉES, plus devinées

Retour de jeu : « les trophées font minuscules et certains sont entre deux
étagères ; j'aimerais que le bouclier de Brennus soit grand à côté de l'armoire
et certains boucliers contre l'armoire, posés ; le bouclier fait la taille d'un
buste de rugbyman, et les grosses coupes pareil ».

### ⚠️ LA GRILLE INVENTÉE ÉTAIT LE BUG

La première version découpait la boîte englobante du meuble en **4 × 4** et
espérait tomber juste. Le `.glb` fourni a **six** tablettes, à des hauteurs
irrégulières : une rangée sur deux flottait donc en l'air. Mesuré sur le modèle
réel (hauteur normalisée à 4) — la grille tombait sur 3,01 / 2,25 / 1,49 / 0,73,
les vraies tablettes sont à **3,04 / 2,51 / 2,00 / 1,47 / 1,00 / 0,59**. Une fois
sur deux, ça tombait juste ; l'autre fois, le trophée était en l'air.

**`detecterEtageres(geos, dims)`** (`lib/armoire.ts`) lit la géométrie : elle
accumule l'aire des faces **horizontales tournées vers le haut** par tranche de
hauteur, regroupe les tranches voisines, et ne garde que les surfaces qui
traversent le meuble. ⚠️ Le dessus du meuble est horizontal lui aussi : on
l'écarte parce qu'il n'a **rien au-dessus** — une étagère se définit par son
plafond (les faces tournées vers le **bas**), pas par une liste codée en dur.
Chaque tablette connaît donc sa hauteur libre, et c'est elle qui donne sa taille
au trophée (90 % du vide). Repli sur une grille régulière si un futur `.glb`
n'est pas lisible.

### Les pièces de prestige sont AU SOL, à hauteur de buste

Les tablettes font ~13 cm à l'échelle réelle : **tout** ce qu'on y pose est petit,
c'est mécanique. Les boucliers et les grandes coupes se dressent donc au sol,
à **34 % de la hauteur du meuble** (~70 cm : un buste), la pièce maîtresse à
39 %. Soit **1,55 contre 0,52** pour un trophée de vitrine — trois fois plus
imposant.

- **Qui sort** : `ovas ≥ OVAS_PIECE_MAJEURE` (12 — les Ovas sont la mesure de
  prestige du jeu, pas besoin d'une deuxième liste) **ou** un bouclier.
- **Qui est un bouclier** : la boîte englobante (`estBouclier`, plat et large)
  **ou** `forme: 'bouclier'` dans `data/trophees.ts`. ⚠️ Le Brennus est livré
  avec son socle — mesuré, il est aussi épais qu'une coupe : la géométrie seule
  ne le reconnaît pas, d'où la déclaration.
- **Où** : trois rangs par côté, le rang 0 collé au flanc. Les boucliers passent
  devant dans la file (`sort` stable) et s'inclinent de 0,15 rad : ce sont eux
  qu'on adosse au meuble.
- ⚠️ **LE SOL EST BORNÉ À SIX PIÈCES** (`MAX_SOL`). Une version intermédiaire
  sortait tout : sur un palmarès complet, douze pièces s'alignaient, la scène
  faisait **18 unités de large** et la caméra reculait si loin que le meuble
  devenait un timbre-poste. Au-delà de six, les pièces majeures restent en
  vitrine — et le pied de la modale dit déjà ce qui n'est pas montré.

### Le cadrage est calculé

**`cadrage(boites, dims, fov, rapport)`** place la caméra. ⚠️ **La profondeur
compte** : une pièce posée devant le meuble est plus PRÈS de la caméra, donc plus
large à l'écran. Ne cadrer que sur `x` la faisait sortir par les côtés. Chaque
pièce doit tenir **à sa distance** (`d − z`). Et le format du canvas aussi :
790 px de large sur ordinateur, 337 px sur téléphone — une distance figée
laissait les pièces du sol hors champ sur mobile. Mesuré : caméra à 8,07 sur
ordinateur, 11,76 sur téléphone, **0 pièce hors champ**.

### Le script de vérification décode vraiment la géométrie

⚠️ L'ancienne version se contentait des bornes `min`/`max` de l'accesseur
POSITION, lisibles dans le chunk JSON du GLB : de quoi mesurer une boîte, pas de
quoi trouver des étagères. `scripts/verifArmoire.ts` passe maintenant le maillage
au **décodeur Draco livré avec `three`** (aucune dépendance de plus). ⚠️ `three`
se déclare `"type": "module"`, si bien qu'un `require()` de
`draco_decoder.js` renvoie un espace de noms ESM **vide** : on lit le fichier et
on l'évalue nous-mêmes.

```bash
npx vite-node scripts/verifArmoire.ts   # 6 tablettes, rien ne flotte, rien ne déborde, cadrage mobile
```


## 🏆 SUCCÈS (68) ET CLASSEMENT MONDIAL INFALSIFIABLE

Demande explicite : « rajoute une vingtaine de succès, prépare le classement
mondial, et protège à fond pour que ce soit incassable à falsifier son score ;
dans la DB je veux retenir juste le score ».

### 24 succès de plus — 44 → **68**

`ContexteSucces` gagne deux champs optionnels (`coins`, `succesFaits`) : sans
eux, impossible de récompenser le magot ou la collection. Les nouveaux couvrent
ce qu'aucun succès ne lisait encore :

| Famille | Ce qu'ils lisent |
|---|---|
| **Le métier** (7) | `Joueur.stats` — 1 000 points, 80 % au pied sur 100 tentatives, 100 passes décisives, 2 000 plaquages, 100 matchs sans carton, carton rouge, 100 essais |
| **La durée** (4) | 38 ans, 15 saisons, blessure d'une saison, atteindre son potentiel |
| **La sélection** (3) | 100 capes, cape avant 21 ans, Rugby Europe Championship |
| **Le palmarès** (3) | titre dès la saison 1, champion de 3 championnats, les 3 coupes d'Europe |
| **Hors du terrain** (5) | 5 M€, 500 Ovas, popularité 90, confiance du staff 90, 3 inimitiés |
| **Méta** (2) | trois carrières au Hall, 50 succès débloqués |

⚠️ **Les succès de statistiques n'existent vraiment qu'en mode « journée par
journée »** : c'est le seul mode où `Joueur.stats` est réellement accumulé. `?? 0`
partout — une carrière jouée en mode rapide ne débloque rien, mais ne plante pas.
Mesuré : **0 plantage et 0 succès décerné** sur une carrière vierge.

### ⚠️ LE CLASSEMENT : la vérité avant l'architecture

Destiny Rugby tourne **entièrement dans le navigateur**. Le joueur possède la
machine qui calcule : il peut éditer son `localStorage`, modifier le bundle,
appeler l'API à la main. **Aucun code livré au navigateur ne peut garantir un
score**, et un secret embarqué dans le bundle se lit en vingt secondes.

La seule protection réelle : **le serveur ne fait jamais confiance au score
envoyé — il le RECALCULE.** D'où une architecture qui satisfait aussi « dans la
DB juste le score » :

```
   navigateur                    Edge Function                     base
┌──────────────────┐      ┌───────────────────────────┐     ┌────────────┐
│ FicheCarriere    │ POST │ 1. débit (18/h, 120/j)    │     │ pseudo     │
│ saisons, matchs, │  →   │ 2. verifierFiche()        │  →  │ score      │
│ essais, titres…  │      │ 3. score = scoreDeLaFiche │     │ cree_le    │
└──────────────────┘      │ 4. jette la fiche         │     └────────────┘
                          └───────────────────────────┘
```

La **requête** porte les faits (pour pouvoir recalculer), la **base** ne garde
que le score. La fiche est jetée aussitôt vérifiée.

| Fichier | Rôle |
|---|---|
| `src/lib/classementMondial.ts` | ⚠️ **AUCUNE DÉPENDANCE, AUCUN IMPORT DU STORE, AUCUN DOM** — il est fait pour tourner des DEUX côtés. `scoreDeLaFiche()` (le barème), `verifierFiche()` (le crible), `LIMITES`, `SCORE_MAX`, `ficheDepuisJoueur()`, et le sceau. Les imports de types disparaissent à la compilation : le fichier reste copiable tel quel côté serveur. |
| `serveur/classement.ts` | L'Edge Function Deno. Elle **importe** le barème du jeu — elle ne le recopie pas. |
| `serveur/schema.sql` | La table (`pseudo`, `score`, `cree_le`), RLS **sans policy d'insertion**, et `poser_score()` qui ne garde que le meilleur. |
| `serveur/README.md` | Le déploiement, et ce que ce dossier ne fait PAS. |

⚠️ **`scoreCarriere()` (store) DÉLÈGUE désormais à `scoreDeLaFiche()`.** C'était la
condition non négociable : deux exemplaires du barème, c'est un jour deux
vérités — un serveur qui refuse des scores légitimes, ou en accepte
d'impossibles. Le test `scoreCarriere() == scoreDeLaFiche()` verrouille ça.

### ⚠️ CE QUI ARRÊTE VRAIMENT UN TRICHEUR : la cohérence interne

Le plafond global (`SCORE_MAX` = **64 488**) ne sert presque à rien tout seul :
il autorise encore « 30 saisons, 1 500 matchs ». Ce qui coince, c'est que **chaque
chiffre est borné par les autres** :

| Règle | Pourquoi |
|---|---|
| `âge = âgeDébut + saisons − 1` | une saison de jeu = un an de vie, partout dans le moteur |
| âgeDébut 15-24, âge ≤ 44 | donc **30 saisons maximum**, pas 300 |
| ≤ 50 matchs / saison | le calendrier fait 44 semaines |
| ≤ 5 essais / match | un quadruplé est déjà exceptionnel |
| ≤ 4 titres / saison | championnat + Europe + Tournoi + titre individuel |
| ≤ 12 capes / saison | les fenêtres internationales |
| note ≤ `40 + 6 × saisons` | on démarre à 30-40 et on progresse d'environ 5/saison |
| chaque trophée doit **exister** | sinon on annonce 40 titres inventés × 120 points |
| score annoncé == score recalculé | le contrôle final |

Résultat : on ne peut plus « mettre un gros nombre ». Il faut fabriquer une
**carrière entière qui tient debout** — et à ce moment-là, autant la jouer.

⚠️ **Le cas subtil, celui qui compte** : 900 matchs passe sous le plafond absolu
(1 500) et n'est refusé QUE parce que 12 saisons ont été déclarées. C'est
exactement le genre d'attaque « cohérente en surface » qu'un simple plafond
laisse passer.

### Le sceau : de la DÉTECTION, pas de la sécurité

`sceller()` / `sceauValide()` posent une empreinte FNV-1a sur la sauvegarde.
⚠️ **La clé vit dans le bundle : quelqu'un de motivé la lira.** Ce n'est pas le
but. Le but est d'attraper le geste le plus courant de très loin — ouvrir
l'onglet Application, changer `essais: 12` en `essais: 9999`, recharger. La vraie
barrière reste `verifierFiche()`, côté serveur. Ne jamais présenter le sceau
comme une protection.

### Ce que le serveur ajoute (une fonction pure ne peut pas le voir)

Débit (1 envoi/h, 10/j par appareil — **haché**, jamais l'IP en clair), unicité
du pseudo, meilleur score conservé, écriture réservée à l'Edge Function, et
journalisation des refus : c'est là qu'on voit arriver les scripts.

### L'écran Classement montre tout

Un dépliant **« 🔐 Ma fiche d'envoi »** affiche en clair le JSON qui partirait et
le verdict qu'un serveur rendrait. Rien n'est caché : la protection ne repose pas
sur le secret du format, elle repose sur le recalcul. Vérifié à 375 px — le SQL
et le JSON défilent **dans leur bloc**, la page ne part jamais de côté.

Vérification sans navigateur : `npx vite-node scripts/verifClassement.ts`
— il **joue le tricheur** : score gonflé, score recalculé proprement sur des
chiffres gonflés, 300 saisons, carrière commencée à 4 ans, 900 matchs en
12 saisons, note 99 dès la première saison, trophées inventés, `NaN`, `Infinity`,
types injectés… Chaque attaque doit être refusée **avec un motif lisible**.

```bash
npx vite-node scripts/verifClassement.ts   # 68 succès + toutes les attaques du classement
```


## 🥇 LES HONNEURS INDIVIDUELS, ET L'ARMOIRE REPENSÉE

Trois demandes en bloc : « je t'ai mis des nouveaux trophées individuels, et des
trophées à corriger — celui de la Bundesliga et meilleur joueur au monde » ·
« les trophées individuels dans l'armoire et les trophées collectifs à côté, plus
gros ; mets les boucliers de Régionale, Fédérale, Nationale, Pro D et Russie plus
contre l'armoire, un peu penchés, tu sais, car là ils tiennent droit comme par
magie » · « mets en place les trophées individuels in game, qu'on puisse les
gagner, et que ça soit par rapport à notre note de saison, nos stats et notre
palmarès — ce qu'on a gagné dans l'année ».

### 1. Les modèles : deux corrections, sept nouveautés

`scripts/copierTrophees.cjs` accepte désormais **plusieurs dossiers sources**
(`LOTS`), et surtout **refait un modèle dès que sa source est plus récente que
la version embarquée**. Sans cette règle de date, une correction ne partait
jamais en production : le script sautait tout fichier déjà présent dans
`public/m3d/`, et rien ne le signalait.

| Livré | Devient | |
|---|---|---|
| `bon trophée bundes.glb` | `bundesliga.glb` | ♻ correction |
| `bestplayerintheworld.glb` | `meilleur-joueur.glb` | ♻ correction |
| `meilleurjoueurtop14.glb` | `meilleurTop14.glb` | nouveau |
| `premiershipbestplayer.glb` | `meilleurPremiership.glb` | nouveau |
| `urcbestplayer.glb` | `meilleurUrc.glb` | nouveau |
| `meilleurjoueurnouvellezelande.glb` | `meilleurNZ.glb` | nouveau |
| `championscup best player.glb` | `meilleurChampionsCup.glb` | nouveau |
| `meilleurjoueursixnations.glb` | `meilleurSixNations.glb` | nouveau |
| `manofthematchworldcup.glb` | `hommeDuMatchMonde.glb` | nouveau |

**320 Mo livrés → 11,5 Mo embarqués** (−96 %), tous sous le plafond de 2,2 Mo du
parc existant. Le pipeline n'a pas changé : Draco sur la géométrie, textures
ramenées à 1024², décimation **seulement** au-delà de 130 000 sommets (le modèle
du Top 14 en comptait 1 090 000, celui du Tournoi 1 052 000).

```bash
node scripts/copierTrophees.cjs        # ne refait que ce qui a changé
```

### 2. `Trophee.individuel` : un seul champ, deux conséquences

`data/trophees.ts` gagne un champ, et c'est le **seul endroit** où l'on décide
qu'un trophée est une distinction personnelle plutôt qu'un titre d'équipe. Il
commande **la place dans l'armoire** ET **la façon dont on le gagne**. Une
deuxième liste, quelque part, finirait par dire le contraire de la première.

⚠️ `OVAS_PIECE_MAJEURE` **a disparu**. Il servait à décider qui sortait du meuble
(« ≥ 12 Ovas ») : la répartition ne dépend plus du prestige mais de la NATURE du
trophée. Le laisser en place, c'était garder un critère mort qui semble encore
faire autorité.

⚠️ **`prod2` et `russie` déclarent `forme: 'bouclier'`.** Mesurés, ils sont trop
épais pour que `estBouclier()` les reconnaisse (Pro D2 : 1,67 × 1,90 × 0,60 ;
Russie : 1,48 × 1,90 × 0,91) — leur socle fausse la boîte englobante, exactement
comme celui du Brennus. Les quatre boucliers amateurs (Nationale, Nationale 2,
Fédérale, Régionale) partagent `nationale.glb`, que la géométrie reconnaît seule.

### 3. L'armoire : les distinctions dedans, les titres autour

| | avant | maintenant |
|---|---|---|
| critère de répartition | Ovas ≥ 12 **ou** bouclier | **individuel → vitrine · collectif → sol** |
| pièces au sol | 6 | **8** |
| hauteur d'une pièce au sol | 34 % du meuble (1,36) | **40 % (1,60 à 1,79)** |
| rapport sol / vitrine | 3,1 | **3,4** |
| inclinaison d'un bouclier | 0,15 rad (8,6°) | **0,30 rad (17°)** |
| point d'appui du bouclier | *aucun* | **la face avant du meuble** |

⚠️ **POURQUOI LES BOUCLIERS SEMBLAIENT TENIR PAR MAGIE.** Ils étaient bien
inclinés — mais posés à `z = 0,1 × la profondeur`, c'est-à-dire **à côté** du
meuble et non devant lui. Un bouclier basculé en arrière dans le vide ne
s'appuie sur rien, et l'œil le lit comme droit. Ils sont maintenant avancés de
`sin(θ) × hauteur` **devant la face avant** : le point le plus en arrière de la
pièce — son arête haute et arrière, `z − sin(θ)·h − cos(θ)·e/2` — tombe alors
**exactement** sur le plan du meuble. Vérifié au millionième par
`verifArmoire.ts`, sur les deux files.

⚠️ **L'AVANCÉE D'UN RANG AU SUIVANT N'EST PLUS FORFAITAIRE.** Un pas fixe
marchait tant que toutes les pièces se ressemblaient ; un bouclier incliné
occupe en profondeur son épaisseur **plus** le débord de son arête haute (près
d'un demi-mètre), et chevauchait la pièce d'après. On empile désormais les
emprises réelles, file par file.

⚠️ **ON S'ÉTALE EN PROFONDEUR, PAS EN LARGEUR**, et c'est un calcul, pas un
goût : un mètre de profondeur coûte un mètre de recul à la caméra, un mètre de
largeur en coûte 1,4 sur ordinateur et **2,5 sur téléphone** (le canvas y est
presque carré, 337 × 320).

Mesuré sur les vrais modèles (`npx vite-node scripts/verifArmoire.ts`) :

| | palmarès maximal (16 pièces) | palmarès de carrière (6 pièces) |
|---|---|---|
| scène | 7,59 de large | — |
| caméra ordinateur (714 × 344) | 10,37 | 8,68 · **le meuble occupe 60 % de la hauteur** |
| caméra téléphone (299 × 294) | 15,33 | 11,72 · **44 %** |
| pièces hors champ | 0 | 0 |

⚠️ **LES TAILLES DE CANVAS DU SCRIPT SONT MESURÉES DANS LE NAVIGATEUR**, plus
déduites du CSS. Les anciennes (790 × 420 et 337 × 320) venaient de la lecture
d'`App.css` ; relevées en jeu sur `.armoire-canvas`, elles font **714 × 344** à
1280 px et **299 × 294** sur un téléphone de 375 px. Le rapport passe de 1,053 à
1,017 sur mobile — et c'est lui qui commande le recul de la caméra. Cadrer sur un
canvas plus large que le vrai, c'est se croire au large et laisser des pièces
hors champ.

Le second cas est celui qui compte : personne n'atteint seize trophées
distincts. Le script le teste nommément, et exige que le meuble reste au-dessus
de 40 % de la hauteur de l'écran — en dessous, la vitrine n'est plus lisible.

⚠️ **UN PALMARÈS SANS DISTINCTION LAISSE LE MEUBLE VIDE**, et c'est voulu : les
titres se voient de loin, la vitrine se remplit à mesure qu'on est élu. Au-delà
de huit titres, le débordement revient garnir les tablettes.

### 4. `lib/honneurs.ts` — comment on devient meilleur joueur de quelque chose

⚠️ **CE QUI EXISTAIT NE MÉRITAIT PAS SON NOM.** Une seule distinction était
décernée, sur cette ligne :

```ts
if (perso >= 88 && trophees.length > 0 && tire((perso - 88) / 140))
```

Un seuil de niveau **général**, puis un tirage au sort. La saison n'entrait
nulle part : on pouvait passer l'année à 4/10, ne rien marquer, ne rien plaquer,
et décrocher le titre parce qu'on avait 90 de générale. Ici, c'est la **saison**
qu'on juge, pas la fiche du joueur — et **il n'y a plus aucun dé**.

La cote, sur ~100 :

| Entrée | Poids | D'où elle vient |
|---|---|---|
| **note de saison** | × 7 (21 à 68,6) | `noterSaison` — elle intègre déjà temps de jeu, finition, forme, écart au groupe |
| **statistiques** | 0 à 16 | comparées à `PROFILS[poste]` (`lib/statsJoueurs.ts`, la table des classements individuels) |
| **palmarès de l'année** | 0 à 14 | prestige en Ovas des titres collectifs de la saison, ÷ 2,2 |
| **résultat du club** | 0 à 6 | rang dans la poule |
| **notoriété** | 0 à 6 | réputation |
| **présence** | × 0,35 à 1 | prorata de matchs joués |

Repères mesurés : saison correcte (6,0/10, 5ᵉ) **47** · bonne saison (7,5/10, 3ᵉ)
**59** · grande saison (8,5/10, champion) **78** · saison historique (9,5/10,
doublé Brennus + Europe) **102**.

Barres : championnat **76** · Champions Cup **82** · Tournoi **84** · finale du
monde **80** · meilleur joueur du monde **94**. Le seul aléa est la barre
elle-même, qui bouge de ±3,5 d'une saison à l'autre — c'est le meilleur RIVAL de
l'année, et c'est **déterministe** (graine = compétition + saison).

⚠️ **LES BARRES ONT ÉTÉ DESCENDUES APRÈS MESURE.** Le premier réglage plaçait le
championnat à 82 : sur 560 saisons réellement jouées, **aucune** ne l'atteignait.
Une saison à 8,5/10 en étant champion de France, c'est déjà le sommet de ce que
le moteur produit. Une barre au-dessus de ce plafond, c'est un trophée qui
n'existe que dans les données — la même erreur que l'ancienne difficulté
(« 0 carrière sur 100 au-dessus de 80 »). On ne recommence pas.

⚠️ **LE PLANCHER DE 3 SUR LES ÉVÉNEMENTS RARES.** Sans lui, on divise par
l'attendu : un pilier gauche n'est attendu qu'à 1,1 essai sur la saison. En
marquer **un de plus** — un ballon poussé en mêlée — le faisait bondir de +82 %
et lui donnait 3,3 sur 4, mieux qu'un ailier auteur de 15 essais. On rapporte
donc l'écart au plus grand des deux, l'attendu ou ce plancher. Un avant reste élu
sur ses plaquages et ses grattages, c'est-à-dire sur son vrai match.

⚠️ **LE MODE « SAISON RAPIDE » NE FERME PLUS LA PORTE.** Les statistiques
détaillées n'existent qu'en jouant journée par journée. Le premier réglage
plafonnait alors la note de statistiques à la moitié — mesuré : **aucun** titre
de meilleur joueur en 560 saisons. On ESTIME désormais les axes manquants à
partir de la note de saison, qui les intègre déjà et ne favorise aucun poste.

⚠️ **PAS DE COURONNE MONDIALE DEPUIS LE BAS DE LA PYRAMIDE.** Bug attrapé à la
mesure : `noterSaison` est **relative au groupe**. Un joueur trop fort pour la
Fédérale 2 y obtient 9,8/10 sans effort — et décrochait le titre de meilleur
joueur du MONDE avec un bouclier de Fédérale. Il faut désormais jouer là où le
monde regarde : un championnat qui élit son joueur de l'année, la Champions Cup,
ou une sélection du Tournoi.

⚠️ **CINQ CHAMPIONNATS SUR TRENTE-TROIS ÉLISENT UN JOUEUR DE L'ANNÉE**
(`MEILLEUR_JOUEUR_PAR_DIVISION`) : Top 14, Premiership, URC, Super Rugby et NPC.
C'est le cas dans la réalité, et la rareté est ce qui donne sa valeur à une
distinction. Super Rugby et NPC partagent la **même** distinction : elle est
décernée par la fédération néo-zélandaise sur l'ensemble de la saison.

⚠️ **ELLES SE JUGENT APRÈS L'ÉVOLUTION, dans `saisonSuivante`**, et c'est
structurel : elles dépendent de la note de saison (que `evoluer()` ne calcule
qu'une fois le rang connu) ET du palmarès de l'année (que `resoudreTrophees`
vient de remplir). C'est le seul point du programme où les deux entrées
existent. Les calculer dans `resoudreTrophees` obligerait à noter la saison deux
fois, avec deux résultats possibles.

**Le joueur voit sa cote**, gagnée ou non : une entrée « 🗳️ Vote du meilleur
joueur — ta saison cotée N/100 » tombe au bilan dès qu'une distinction est en
jeu. Un système de récompense qu'on ne voit pas venir n'est pas un objectif.

**Mesuré en jeu** (60 carrières de 14 saisons, départ Nationale 2 à 18 ans — la
population de référence du projet) : **5 carrières sur 60** décrochent au moins
une distinction, **0,13 par carrière**. Cote médiane 23, 90ᵉ centile 65,
maximum 98 sur les saisons disputées dans une compétition qui élit.

### 5. Ce que ça change pour le classement mondial

`LIMITES.titresParSaison` passe de **4 à 9** — le compte est fait à la main et il
est serré : championnat national, coupe d'Europe, Tournoi, Coupe du monde (4
collectifs) et les 5 distinctions. Personne n'a jamais fait les neuf, mais rien
dans le moteur ne l'interdit, et une borne qui refuse une carrière légitime est
pire qu'une borne large.

⚠️ **UNE BORNE PLUS SERRÉE PREND LE RELAIS** : `verifierFiche` refuse désormais
qu'un **même trophée** apparaisse plus de `saisons` fois. On ne gagne pas deux
Boucliers de Brennus la même année. Cette règle attrape ce que l'ancien total
laissait passer — 80 Brennus en 12 saisons tenaient sous 108 — sans rien
interdire à une carrière réelle. `SCORE_MAX` passe de 64 488 à **82 488**, et la
carrière théorique maximale doit maintenant présenter des trophées **différents**.

### 6. Difficulté : remesurée

Deux tirages de 100 carrières après la bascule (`verifDifficulte.ts` tire avec
`Math.random()` : deux exécutions ne donnent jamais le même chiffre) — médiane
**59 et 61**, maximum **86 et 91**, carrières ≥ 80 : **6 et 12 sur 100**. La
référence documentée (médiane 63, ≥ 80 : 10/100) est dans cet intervalle :
l'étalonnage n'a pas bougé. C'est attendu — les honneurs ne touchent ni à la
progression ni au potentiel, ils ajoutent seulement 8 points de réputation quand
ils tombent, soit 0,13 fois par carrière.

### Les scripts

```bash
node scripts/copierTrophees.cjs           # compresse les modèles livrés (multi-lots, refait si la source a changé)
npx vite-node scripts/verifHonneurs.ts    # barème, équité entre postes, conditions, 60 carrières jouées
npx vite-node scripts/verifArmoire.ts     # distinctions en vitrine, titres au sol, boucliers adossés, cadrage
npx vite-node scripts/verifTrophees.ts    # 47 modèles présents, au poids, branchés, aucun lot oublié
npx vite-node scripts/verifClassement.ts  # le plafond ouvert et la nouvelle borne par trophée
```


## 🌍 LE CLASSEMENT EN LIGNE, SUR VERCEL

Demande : « fais-moi un README pour m'expliquer comment déployer la DB du
classement sur Vercel ». Le guide est **[`serveur/VERCEL.md`](serveur/VERCEL.md)**
— mais un guide qui décrit du code inexistant ne sert à rien : la fonction, le
schéma et le côté navigateur ont été écrits avec.

| Fichier | Rôle |
|---|---|
| `api/classement.ts` | **La fonction serverless.** `GET` rend le top 100, `POST` reçoit une carrière : débit → `verifierFiche` → RECALCUL du score → écriture du seul score → la fiche est jetée. |
| `serveur/schema-vercel.sql` | Les deux tables (`classement`, `envois`), sans RLS. |
| `src/lib/classementEnLigne.ts` | `envoyerAuClassement()` et `lireClassementMondial()`. |
| `serveur/VERCEL.md` | Le pas à pas : base Neon, tables, sel d'appareil, déploiement, vérification, erreurs fréquentes. |

⚠️ **`api/` EST À LA RACINE, À CÔTÉ DE `src/`**, et c'est ce qui permet
`import { verifierFiche } from '../src/lib/classementMondial'` : le serveur et le
jeu **partagent** le barème au lieu de le recopier. Vite ne part que
d'`index.html` : ce dossier lui est invisible et n'entre pas dans le bundle.

⚠️ **PAS DE ROW LEVEL SECURITY, contrairement à la version Supabase**, et ce
n'est pas un oubli. Sur Supabase, le navigateur parle directement à la base avec
une clé publique : il FAUT des politiques pour lui interdire d'écrire. Ici la
chaîne de connexion vit dans les variables d'environnement de la fonction — le
navigateur n'a aucun accès à la base. Moins de surface, moins à verrouiller.

⚠️ **`SCORE_MAX` est en dur dans le schéma** (`check (score <= 82500)`). Il a
changé avec les distinctions individuelles (64 488 → 82 488), puis quand
`noteMax` est passé de 99 à 100 (82 488 → **82 500**). À remettre à jour à
chaque retouche de `LIMITES`, sinon la base refuse des scores légitimes — c'est
écrit dans les deux fichiers SQL et dans le guide.

Le jeu reste **entier sans serveur** : `lireClassementMondial()` renvoie une
liste vide sans lever d'erreur, et le classement local continue de fonctionner.

Une dépendance ajoutée : `@neondatabase/serverless`, utilisée **uniquement** par
`api/`. Elle n'apparaît pas dans le bundle du navigateur.


## 🌐 TRADUIRE SANS TOUT TRADUIRE À LA MAIN

Demande : « au lieu de tout traduire en 7 langues, y'a pas une extension ou quoi
qui peut le faire automatiquement ? »

⚠️ **RÉPONSE HONNÊTE : IL N'Y A PAS D'EXTENSION À INSTALLER ICI**, et il ne faut
pas en chercher une. Les outils du marché — i18next-parser, Weblate, Crowdin,
Lokalise, l'extension VS Code « i18n Ally » — supposent tous des fichiers de
ressources séparés (`en.json`, `es.json`…). Ce projet range les sept langues
**côte à côte sur la même ligne** (`{ fr: …, en: …, es: … }`), ce qui est bien
plus lisible quand on écrit une clé, et incompatible avec eux. Les brancher
voudrait dire réécrire tout `data/textes*.ts`, ajouter une dépendance et un
compte en ligne payant — pour six cents chaînes.

La traduction automatique distante a été retirée avec l'ancien fournisseur d'IA. Chaque nouvelle clé
doit désormais être écrite dans les sept langues, puis vérifiée sans réseau :

```bash
npx vite-node scripts/verifTraductions.ts
```

`src/data/textesAuto.ts` reste une couche historique à priorité basse ; une
traduction humaine dans `textes.ts` ou les dictionnaires spécialisés gagne
toujours. Les variables comme `{n}` doivent être reproduites à l'identique dans
chaque langue, et les noms propres de clubs, compétitions et joueurs ne se
traduisent jamais.


## 📊 LA FEUILLE DE MATCH COMPLÈTE — plus une seule statistique estimée

Demande : « je veux que chaque joueur, y compris le nôtre, ait de vraies stats
pour le classement, pas des stats simulées ; pour les notes il faut prendre en
compte tout le jeu — pour les avants mêlée, touche gagnée, grattages, turnovers,
pick and go, essai, passe décisive, passe normale, minutes jouées, mètres
parcourus avec le ballon, cartons jaunes et rouges ; pour les arrières pareil +
coup de pied, 50/22 réussi, offload, et sans mêlée ni touche ni pick and go ».

### Ce que le moteur compte désormais, à l'événement

`StatsMatch` (moteur/entites.ts) passe de 16 à **23 compteurs**. Chacun est
incrémenté **là où l'action se produit**, jamais déduit après coup :

| Ajouté | Où c'est compté | Mesuré |
|---|---|---|
| `melees` | mêlée gagnée → **créditée aux huit avants** | 86,5/match |
| `touchesGagnees` | touche captée → **au sauteur** | 26,6/match |
| `pickAndGo` | ballon pris au ras (`donnerBallon`, avants seulement) | 26,2/match |
| `passesDecisives` | la passe qui précède l'essai | 4,5/match |
| `offloads` | passe APRÈS contact | 14,0/match |
| `cinquanteVingtDeux` | 50/22 **réussi**, sur la géométrie | 2,8/match |
| `cartonsJaunes` / `cartonsRouges` | séparés ; le rouge existe enfin | 1,4 · 2 rouges sur 25 matchs |

⚠️ **LA MÊLÉE VA AUX HUIT, LA TOUCHE AU SAUTEUR.** Une mêlée se gagne à huit ou
ne se gagne pas : la créditer au seul joueur qui ramasse donnerait un classement
composé uniquement de numéros 8, et un pilier n'existerait toujours nulle part.
La touche, elle, est une statistique individuelle (« lineouts won ») : elle
revient à celui qui capte, d'où les deuxièmes lignes en tête.

⚠️ **LE PICK AND GO SE COMPTE À LA PRISE DE BALLON**, pas au choix du lancement :
une combinaison peut être interrompue avant que l'avant ne parte. Et le filtre
« avant » n'est pas cosmétique — le 9 fait partie de la chaîne, mais quand il
sert le ballon au pied du ruck ce n'est pas lui qui pique et va.

⚠️ **`e.dernierPasseur` VIT DANS L'ÉTAT, pas dans une variable de module.** C'est
la règle de détermininisme du moteur : deux matchs simulés en parallèle se
partageraient la variable, et l'égalité entre le match regardé en direct et le
même match rejoué en fond — sur laquelle repose tout le système — tomberait. Il
est remis à `null` dès qu'un ruck, une phase arrêtée ou un coup de pied
s'intercale : l'essai qui suit n'est alors la conséquence de la passe de personne.

⚠️ **LE 50/22 EST COMPTÉ SUR LA GÉOMÉTRIE, PAS SUR L'INTENTION.** Un dégagement
d'occupation qui finit en touche dans les 22 adverses EST un 50/22 : c'est le
règlement, et c'est déjà ainsi que le moteur en tire la conséquence. Compter
l'intention aurait donné un classement où manque la moitié des vrais.

### ⚠️ LE CARTON N'EXISTAIT QUASIMENT PAS

Le moteur produisait **0,25 carton par match** là où la documentation en
annonçait 1,3 — et **aucun rouge, jamais**. La cause : `siffler()` ne tirait un
carton que si un fautif était NOMMÉ, or trois appels sur quatre n'en désignaient
aucun, dont celui du ruck, de loin le plus fréquent. Une pénalité a désormais
toujours un fautif : à défaut de coupable nommé, le joueur de l'équipe
sanctionnée le plus proche du ballon — au rugby, c'est presque toujours lui.
Mesuré après : **1,4 carton jaune par match** (cible 1 à 3), et un jaune sur
quatorze devient rouge, soit **0,08 rouge par match**, l'ordre de grandeur du
rugby professionnel. Un rouge, c'est le match terminé.

### Neuf classements de plus, et un filtre par famille de poste

L'écran 📊 Résultats passe de 9 à **18 catégories** : Essais, Points, Buteurs,
Plaquages, Grattages, Turnovers, **Mètres**, **Franchissements**, Passes déc.,
**Passes**, **Offloads**, **Mêlées**, **Touches**, **Pick and go**, **Coups de
pied**, **50/22**, Cartons, Temps de jeu.

⚠️ **`CATEGORIES[].famille` DÉCIDE QUI CONCOURT.** La mêlée, la touche et le pick
and go sont des classements d'AVANTS ; le jeu au pied et le 50/22, des
classements de trois-quarts. Sans ce filtre, un troisième ligne qui dégage une
fois se retrouvait au classement des botteurs, et le tableau ne voulait plus rien
dire. C'est la demande, littéralement : « pour les arrières, sans mêlée et touche
et pick and go ».

⚠️ **BUG CORRIGÉ AU PASSAGE** : `depuisLeMoteur()` renvoyait `l.passes` — le
TOTAL des passes — dans la colonne « passes décisives ». Le classement des
passeurs décisifs était donc un classement des demis de mêlée, avec 86 « passes
décisives » par match. Les deux sont maintenant distinctes, et le moteur compte
la vraie.

Contrôle de bon sens (`npx vite-node scripts/verifStats.ts`) : essais → ailier ·
plaquages → deuxième ligne · grattages → troisième ligne aile · passes → demi de
mêlée · offloads → centre · mêlées, touches et pick and go → avants · coups de
pied → ouvreur. **10/10 des meilleurs marqueurs sont des trois-quarts, 10/10 des
meilleurs plaqueurs sont des avants.**

### Le joueur humain n'est plus une exception

`StatsDetaillees` (types.ts) gagne dix champs **optionnels** — une vieille
sauvegarde ne les a pas et ne doit ni planter ni afficher `NaN`, d'où le `?? 0`
partout. `enregistrerMatchVecu` reçoit désormais la feuille COMPLÈTE
(`StatsMatchJoueur` partagé, au lieu d'une copie tronquée) : la mêlée, la touche,
les offloads et les passes décisives du joueur arrivent enfin jusqu'au store.

⚠️ Deux valeurs étaient écrites **en dur à zéro** dans le cumul :
`passesDecisives: 0` et `cartonsRouges: 0`. Le joueur finissait donc sa carrière
avec zéro passe décisive et zéro carton rouge, quoi qu'il ait fait — et deux
succès du jeu ne pouvaient pas se débloquer.

⚠️ **`statsReelles` EST PERSISTÉ**, et une sauvegarde d'avant ce lot contient des
lignes sans les nouveaux champs. `cumuler()` repart d'une ligne vide et écrase
avec ce qui existe : les anciens champs sont repris, les nouveaux démarrent à
zéro. Sans ça, `undefined + 1` donne `NaN`, et un `NaN` contamine tout un tri en
silence.

### La note de match juge enfin le match entier

`noterMatch()` ne regardait que plaquages, mètres, essais, grattages et tirs au
but. **Une première ligne qui domine la mêlée, gagne ses ballons au ras et offre
un essai obtenait exactement la même note qu'un pilier qui n'a rien fait.**

Sept termes ajoutés, **tous bornés** pour que le total ne s'envole pas : passe
décisive (+1,6 max), offloads au-dessus de l'attendu (+0,9), franchissements
(+1,0), ballons rendus (−1,5), mêlée (±0,9), touche (±0,9), pick and go (±0,7),
50/22 (+1,4), et un carton rouge à −4 au lieu de −1,4. La table `ATTENDU` porte
désormais la conquête, à zéro pour un trois-quarts : la ligne est donc
naturellement neutre pour lui, sans test de poste.


## 🔁 LE MARCHÉ DES TRANSFERTS — deux reproches, quatre causes

Demande : « c'est trop facile d'avoir de gros clubs et de gros salaires » et
« j'ai l'impression que c'est toujours les mêmes clubs qui proposent ».

### « C'est toujours les mêmes clubs »

Le tirage ne pondérait que **la proximité de niveau**. Comme la note d'un club ne
bouge presque pas d'une saison à l'autre, les mêmes cinq ou six noms revenaient à
chaque intersaison, pendant douze saisons. Deux ajouts :

1. **L'humeur de la saison.** `graine('marche#club#saison')` donne à chaque club
   un intérêt propre, stable pour l'année et différent la suivante. Un club
   scoute quelques joueurs par an, et pas les mêmes. Déterministe : rouvrir le
   panneau ne change rien (pas de save-scumming).
2. **Le besoin au poste** (`besoinAuPoste`). Un club qui possède déjà deux
   joueurs nettement meilleurs à ton poste ne recrute pas un troisième. C'est LA
   question qu'aucune version ne posait, et elle écarte des clubs **différents
   pour chaque poste et chaque saison**.

Mesuré sur douze intersaisons du même joueur : **22 à 24 clubs différents pour
48 offres**, le plus assidu revenant 4 fois. Et un ouvreur et un pilier de même
niveau ne reçoivent pas la même liste.

### « Trop facile d'avoir de gros clubs et de gros salaires »

3. **Le plafond dépend de l'ÂGE.** Il était fixe (« cote + 5 ») : un joueur de
   32 ans recevait des offres de clubs 5 points au-dessus de lui, exactement
   comme un espoir de 19 ans. Or un club ne paie au-dessus du niveau constaté que
   pour du POTENTIEL. La marge passe de **7 points avant 21 ans à 0,5 après 29**.
4. **On ne saute plus deux étages.** Un joueur de Fédérale 1 ne signe pas en
   Top 14 : il passe par la Nationale et la Pro D2. Les très jeunes font
   exception (trois étages avant 22 ans) — un club professionnel va vraiment
   chercher un espoir de 20 ans plus bas.
5. **La notoriété ne fait plus le niveau.** La cote est plafonnée à
   `générale + RENOM_MAX` (7). Un joueur moyen (générale 60) très connu
   (réputation 95) affichait 68,75 : de quoi intéresser le bas du Top 14 sans y
   avoir jamais joué.
6. **Le salaire tient compte de l'âge** : ×0,55 à 20 ans, plein tarif de 25 à 31,
   ×0,72 après 34. Et le multiplicateur d'écart passe de 2,2 à 1,8 — c'est un
   salaire, pas une prime de transfert. Mesuré à cote égale : **230 000 € à
   19 ans, 420 000 € à 27 ans, 305 000 € à 36 ans**.

⚠️ **LA PONDÉRATION 75/25 DE LA COTE EST CONSERVÉE, APRÈS MESURE.** Une version
intermédiaire faisait de la générale la base et de la réputation un simple
bonus : ça paraissait plus juste, et ça a fait sauter l'étalonnage de difficulté
(carrières ≥ 80 : 10/100 → **24/100**). La raison est une BOUCLE — dans ce jeu la
réputation traîne derrière la générale, si bien que le mélange 75/25 freinait la
cote des bons joueurs ; en le retirant, ils signaient plus haut, gagnaient plus
de titres, gagnaient donc de la réputation, et remontaient encore. Ne pas
« simplifier » cette ligne sans relancer `verifDifficulte.ts`.

### ⚠️ ET LE RÉALISME A RENDU LE JEU PLUS FACILE — compensé

Effet de bord mesuré, et il est instructif : en **empêchant les sauts de deux
étages**, on empêche aussi le joueur d'être parachuté dans un club trop fort pour
lui. Il reste donc AU NIVEAU DE SON GROUPE — ce que `noterSaison` récompense
(`perso − forceGroupe`). Résultat : carrières ≥ 80 passées de 10/100 à **23/100**,
≥ 85 de 2 à 12, maximum de 86 à **92**. La médiane, elle, n'avait pas bougé.

C'est donc la QUEUE qu'il fallait reprendre, et le **talent brut**
(`lib/progression.ts`) est précisément le levier qui n'agit que sur elle : il ne
profite qu'aux joueurs qui ont de la marge à rattraper. `marge/4,5` plafonné à
5,5 devient `marge/7,2` plafonné à 3,6.

Réétalonné sur **trois tirages de 100 carrières** (le script tire avec
`Math.random()` : deux exécutions ne donnent jamais le même chiffre) :

| | référence | après ce lot |
|---|---|---|
| médiane | 63 | **58 · 60 · 63** |
| 90ᵉ centile | 80 | 80 · 82 · 82 |
| maximum | 85 | 89 · 90 · 91 |
| carrières ≥ 80 | 10/100 | **10 · 15 · 12** |
| carrières ≥ 85 | 1-3/100 | **4 · 4 · 3** |

Le sommet reste un peu plus accessible qu'avant (max 90 contre 85) : c'est la
part de l'effet de réalisme qu'on garde volontairement — se développer au niveau
de son groupe DOIT payer, c'est ce qui rend une carrière lisible.

### 🩹 Régression retrouvée en passant : les écussons de sélections

`verifU20.ts` refusait les écussons nationaux : France 210 octets, Angleterre
291, Japon 383 — de simples vignettes, là où les bons fichiers font 4 à 12 Ko.
La cause : **`copierLogos.cjs` réécrase `copierLogosSelections.cjs`**.
`sources/logos/clubs/nations_championship/` contient `france.png` et `angleterre.png`,
et le balayage récursif du pack de clubs passe par-dessus les bons fichiers.
L'ordre est désormais écrit en tête du script, et il n'est pas négociable :

```bash
node scripts/copierLogos.cjs             # le pack complet des clubs
node scripts/copierLogosSelections.cjs   # PUIS les vrais écussons nationaux
```

### Les scripts

```bash
npx vite-node scripts/verifMoteur.ts      # + section 8 : chaque compteur ajouté est non nul, et au bon poste
npx vite-node scripts/verifStats.ts       # les 18 classements, le poste attendu en tête
npx vite-node scripts/verifMarche.ts      # + variété des clubs, saut d'étage, salaires par âge
npx vite-node scripts/verifDifficulte.ts  # ⚠️ à relancer après TOUTE retouche du marché ou de la progression
npx vite-node scripts/traduire.ts --verifier
npx vite-node scripts/verifU20.ts         # dont la taille des écussons de sélections
```


## 🏆 LES TITRES SUIVENT ENFIN LES COMPÉTITIONS JOUÉES

Trois bugs signalés en jeu d'un seul coup : « j'ai fait le Grand Chelem avec
l'équipe de France et j'ai pas eu les six nations », « pareil pas eu la Champions
Cup alors qu'on a gagné », « et pas eu meilleur joueur de l'année en ayant eu
Brennus, meilleur joueur Top 14, meilleur joueur six nations et meilleur joueur
Champions Cup ». **Les trois n'en font qu'un.**

### ⚠️ LE TITRE ÉTAIT TIRÉ AU SORT PENDANT QUE LA COMPÉTITION SE JOUAIT

`resoudreTrophees` (store) décernait le Tournoi et la coupe d'Europe sur un
`Math.random()` pondéré par la fiche du joueur :

```ts
if (selectionne6N && tire((perso - 78) / 220))   trophees.push('sixNations');
if (enChampionsCup && tire((9 - rang) / 48))     trophees.push('champions');
```

Or ces deux compétitions sont **réellement jouées** depuis longtemps —
`lib/international.ts` (5 journées, classement au barème rugby) et `lib/coupe.ts`
(4 poules, quarts, demies, finale) — et le joueur en suit les résultats toute la
saison dans l'écran 📊 Résultats et le classement latéral. **Deux vérités
parallèles qui ne se parlaient pas** : cinq victoires sur cinq pouvaient ne rien
rapporter, une quatrième place pouvait tout rafler.

| | avant | maintenant |
|---|---|---|
| Tournoi des 6 Nations | `tire((perso − 78) / 220)` | **1ᵉʳ du classement réel** |
| Rugby Europe Championship | `tire((perso − 66) / 200)` | idem, via `TROPHEE_PAR_INTERNATIONAL` |
| Coupe du monde | `saison % 4 === 0` + tirage | `estAnneeDeCoupeDuMonde` + 1ᵉʳ du classement |
| Champions / Challenge Cup | `tire((9 − rang) / 48)` | **vainqueur de la FINALE** (`coupeEnDirect`) |
| « mon club joue l'Europe ? » | `COUPE_EUROPE_PAR_DIVISION[division]` | `coupesDuClub(club)` — la liste des engagés |

- **`TROPHEE_PAR_INTERNATIONAL`** (`data/trophees.ts`) fait le lien compétition →
  trophée. Seules celles qui ont un modèle 3D y figurent : le Tournoi, le Rugby
  Europe Championship et la Coupe du monde. En ajouter une demande d'abord son
  `.glb` et son entrée dans `TROPHEES`.
- ⚠️ **`apport: null`, COMME L'ÉCRAN.** `vainqueurInternational()` appelle
  `internationalEnDirect(id, saison, journees, null)` — exactement l'appel de
  `Tableau.tsx` et de `ClassementLateral.tsx`. Passer un apport du joueur ici
  donnerait un autre classement que celui qu'il a sous les yeux, donc un
  champion qui n'est pas celui qu'il a vu gagner. C'est la forme exacte du bug
  d'origine, et c'est ce qu'il ne faut pas réintroduire.
- ⚠️ **ÊTRE SÉLECTIONNÉ SE PROUVE DE DEUX FAÇONS**, et il en faut deux : les
  **capes réellement jouées** (`saisonEnCours.capes`, la vérité du terrain) — qui
  n'existent qu'en mode « journée par journée » — et à défaut la **convocation au
  niveau**, tranchée sans hasard (`convocation(j, 0.5, saison)`). Sans le second
  chemin, choisir le rythme « saison » fermait la porte à tous les titres
  internationaux sans jamais le dire.
- ⚠️ **Le mot « coupe d'Europe » a UNE seule source désormais.** La semaine de
  coupe en mode rapide lisait encore `COUPE_EUROPE_PAR_DIVISION`, l'écran
  Résultats lisait `coupesDuClub` : deux réponses possibles à « mon club
  joue-t-il l'Europe ? », donc un titre fantôme en puissance.

### ⚠️ ET LA COURONNE MONDIALE ÉTAIT INATTEIGNABLE — MESURÉ

Le correctif ci-dessus ne suffisait pas. Mesuré sur la saison exactement
rapportée (Brennus + Champions Cup + Grand Chelem, 8,6/10, 24 matchs) :

| | cote | distinctions |
|---|---|---|
| avant (seul le Brennus comptait au palmarès) | **82,7** | Top 14, Champions Cup, Tournoi |
| après le correctif des titres | **91,2** | les mêmes — toujours pas la mondiale (barre 94) |
| après `BONUS_PAR_DISTINCTION` | **100,2** | **+ meilleur joueur du monde** |

On pouvait donc rafler **toutes** les distinctions de l'année et se voir refuser
celle qui les couronne. Ce n'est pas une barre haute, c'est une incohérence : le
titre mondial n'est pas un cinquième vote indépendant, il va dans la réalité à
celui qui a dominé la saison des votes. `decernerHonneurs` (lib/honneurs.ts) lit
donc, **pour ce seul test**, les distinctions déjà décernées : `+3` chacune.

⚠️ **CALIBRÉ POUR NE RIEN OUVRIR D'AUTRE.** Deux distinctions valent +6 : mesuré,
une saison à 7,8/10 avec le doublé championnat + Europe monte à 88,1, toujours
sous la barre. Il faut **trois** distinctions — championnat, Europe et Tournoi la
même année — pour franchir 94.

**Étalonnage revérifié** (les scripts tirent avec `Math.random()`, deux
exécutions ne donnent jamais le même chiffre) : `verifDifficulte.ts` → médiane
**65**, max 89, ≥ 80 : 11/100, ≥ 85 : 6/100 — dans l'intervalle documenté.
`verifHonneurs.ts` → **0,17 distinction par carrière de 14 saisons**, inchangé.

### 🌍 ET LE CLASSEMENT MONDIAL : « la table se remplit pas »

Diagnostic fait de bout en bout sur le site déployé — `GET /api/classement`
répond `{"classement":[]}`, un `POST` invalide répond bien `422` avec le motif
recalculé. **Le serveur, la base et le barème étaient bons. Rien n'envoyait.**

L'envoi était **entièrement manuel** et rangé dans un `<details>` replié, alors
que l'écran promet noir sur blanc « mène une carrière à son terme et elle y
entrera ». Et le tableau mondial n'était **rendu que s'il contenait au moins une
ligne** (`{mondial && mondial.length > 0 && …}`) : sans serveur, en panne, ou
simplement vide, l'écran n'affichait **rien du tout**, pas même un titre. Il n'y
avait littéralement pas de table à remplir.

- **`prendreRetraite` envoie la carrière** (`ficheDepuisJoueur`), sans attendre
  la réponse et sans jamais échouer : hors ligne, sans serveur ou quota atteint,
  la retraite reste instantanée. Le bouton manuel reste, pour une carrière en
  cours ou une deuxième tentative.
- **`lireClassementMondial()` renvoie un `EtatMondial`** (`hors-ligne` · `panne` ·
  `ok`) au lieu d'un tableau vide indistinct. L'écran affiche les quatre cas :
  chargement, pas de serveur (avec la commande `VITE_CLASSEMENT_URL=…`), serveur
  en panne, et « personne n'y figure encore ».
- **Le tableau mondial est un vrai tableau** (`.tableau-classement.mondial`,
  3 colonnes — la base ne garde que pseudo et score), la ligne du joueur
  surlignée. Vérifié 1280 px et 375 px : aucun débordement horizontal.
- **`LegendeSauvegardee.tropheeIds`** : le Hall mémorise les IDS des trophées.
  `ficheDepuisLegende` envoyait `titres.map(() => 'titre')` — un identifiant qui
  n'existe dans aucun `TROPHEES`, donc un refus **systématique** de toute
  carrière terminée (« trophée(s) inconnu(s) : titre »). Les vieilles sauvegardes
  sont rattrapées depuis les libellés.
- **`api/classement.ts`** : connexion Neon **paresseuse** (`neon('')` lève à
  l'import — une `DATABASE_URL` manquante faisait échouer le module et le message
  clair prévu n'était jamais atteint), et **un refus ne consomme plus le quota**
  (une fiche refusée n'écrit rien ; la compter enfermait le joueur honnête une
  heure avec pour seule explication « Trop d'envois »).

### Les scripts

```bash
npx vite-node scripts/verifTitres.ts      # aucun titre fantôme, aucun titre oublié, sur 48 saisons jouées
npx vite-node scripts/verifClassement.ts  # + section 9 : la retraite envoie vraiment, et la fiche est acceptée
npx vite-node scripts/verifHonneurs.ts    # la couronne mondiale est atteignable, et reste rare
npx vite-node scripts/verifDifficulte.ts  # ⚠️ l'étalonnage n'a pas bougé
```


## 🗓️ LA SAISON NE SE SIMULE PLUS — ELLE SE JOUE

Six retours de jeu en un bloc. Les trois premiers tenaient au même endroit : le
**mode « saison rapide »**, qui court-circuitait la boucle de jeu.

### ⚠️ LE MODE « SAISON PAR SAISON » A ÉTÉ SUPPRIMÉ

Demande explicite : « il faut pas qu'on puisse simuler la saison mais plus qu'on
puisse cliquer sur une date dans le calendrier et que ça nous y amène en simulant
tous les matchs ; car si on simule, nos stats marchent pas, on a toujours
2 matchs 0 essais ».

Le constat était exact et la cause nette : en mode rapide, `saisonSuivante`
n'utilisait aucun match joué. Il **tirait** l'année entière :

```ts
const matchsSaison = Math.round((6 + Math.random() * 16) * titularisation);
```

`titularisation` s'effondrant dès que le joueur était sous le niveau de son
groupe, le résultat tournait à 2 ou 3 matchs et zéro essai — quelle que soit la
saison, quelle que soit la performance. Ni forme, ni blessure, ni cape, ni
statistique détaillée : le mode de jeu décidait de la carrière.

| | avant | maintenant |
|---|---|---|
| choix du rythme (⚙️) | « journée par journée » / « saison par saison » | **retiré** — il n'y a qu'un rythme |
| bouton « ⏩ Fin de saison » | saute au bilan tiré au sort | **retiré**, remplacé par 🗓️ Calendrier |
| avancer vite | simuler l'année d'un bloc | **cliquer une date**, tout est joué |

- **`avancerJusqua(semaine)`** (store) rejoue `semaineSuivante()` autant de fois
  qu'il faut. Rien n'est estimé : matchs, statistiques, forme, blessures,
  sélections et classement en découlent comme si on avait cliqué à la main.
  Mesuré en jeu : **12 semaines en 75 ms**.
- ⚠️ **ON S'ARRÊTE À LA PREMIÈRE CHOSE QUI DEMANDE LE JOUEUR** — une scène du MJ,
  une offre de contrat, la fin de saison, la retraite. Enjamber ces moments-là,
  c'est exactement ce que faisait l'ancien mode rapide. `avancerJusqua` renvoie
  le motif d'arrêt, et l'écran le dit.
- ⚠️ **`avanceRapide` (non persisté) coupe la demande de scène hebdomadaire.**
  `semaineSuivante` lève `attenteEvenement`, que l'écran Carrière consomme en
  appelant l'IA : sans ce drapeau, un saut de quinze semaines faisait quinze
  appels et empilait quinze questions. Le drapeau est levé **une seule fois**, à
  l'arrivée.
- **La frise du calendrier (📊 Résultats) est une destination.** Une semaine
  passée se consulte ; une semaine à venir (`▶`, bordure verte pointillée) se
  JOUE, après une confirmation qui annonce combien de semaines partent.
- ⚠️ **`simulerStatsJournee` RATTRAPE les journées manquantes.** Elle est
  asynchrone : sur un saut, toutes ses invocations s'exécutaient après la boucle
  et lisaient donc la même semaine d'arrivée — une seule journée était rejouée,
  et `journeesReelles` sautait à J18 avec les statistiques d'UNE journée (le
  meilleur marqueur du championnat affichait 2 essais au mois de mars). Elle
  rejoue maintenant de la dernière journée connue jusqu'à la journée courante,
  **bornée à 6** (≈ 0,9 s la journée) — et elle **écrit dans la console** ce
  qu'elle a laissé de côté, parce qu'un plafond silencieux se lit « tout est
  couvert ».

### ⚠️ LA FORME NE REMONTAIT JAMAIS

« Impossible de récupérer de la forme, on en perd trop et à la moitié de la
saison on est à 0. » Le bilan d'une semaine de match était **structurellement
négatif**, et rien ne le compensait :

```
match regardé  −(3 + minutes/14) ≈ −9    ·    match estimé −(minutes/12) ≈ −6
séance de la semaine                 −4
─────────────────────────────────────────
                          −10 à −13 par semaine de match
```

Seuls les week-ends SANS match rendaient quelque chose (+6 à +8). Sur les
~30 semaines de match d'une saison de Top 14 : −300 contre +90. Le joueur
touchait le fond avant Noël et n'en ressortait plus — et comme la note de match
porte `(forme − 70) × 0,012`, il traînait un malus permanent.

**`recuperationHebdo(j)`** (store) applique, chaque semaine et **au même endroit
pour les deux chemins** (match regardé ou non), une **convergence** vers une
condition de base :

```ts
conditionDeBase = 72 + (endurance − 60) × 0,2 − max(0, âge − 28) × 1,5   (52…94)
récupération    = (cible − forme) × 0,45 + 4
```

⚠️ **CE N'EST PAS UN BONUS FIXE, ET C'EST LE POINT.** Un bonus fixe a le même
défaut que l'ancien système, à l'envers : trop petit il ne change rien, trop
grand tout le monde reste à 100 et la forme ne veut plus rien dire. La
convergence trouve son équilibre toute seule. Mesuré sur une saison complète :

| | forme min | max | fin |
|---|---|---|---|
| Top 14, 22 ans | 70 | 82 | 81 |
| Top 14, **34 ans** | **60** | 73 | 70 |
| Nationale 2, 24 ans (joue tout) | 65 | 82 | 73 |

Les bonus forfaitaires des semaines creuses ont été **réduits en conséquence**
(+7/+8 → +2/+3) : cumulés à la convergence, ils renvoyaient tout le monde à 100.

⚠️ **EFFET DE BORD MESURÉ ET COMPENSÉ.** Réparer la forme relève toutes les notes
de match, donc les notes de saison, donc la progression : les carrières ≥ 85
passaient de 3-4 sur 100 à **7-9**. Le **talent brut** (`lib/progression.ts`) est
le levier qui n'agit que sur cette queue — `marge/7,2` plafonné à 3,6 devient
`marge/8,6` plafonné à 3,0. Réétalonné sur trois tirages : médiane **57 · 60 ·
56**, max 88 · 88 · 90, ≥ 80 : **9 · 10 · 8**, ≥ 85 : **4 · 4 · 3**. Conforme à
la référence documentée.

### ⚠️ LE MATCH N'ÉTAIT PAS BLOQUÉ PAR UNE SCÈNE EN ATTENTE

« Si on a un événement en cours on peut jouer le match, le bouton est pas bloqué
aussi. » `disabled={aRepondre}` était posé sur « Semaine suivante » mais pas sur
« ▶️ Jouer le match » — or c'est LUI qui fait passer la semaine à la sirène. Il
suffisait donc d'avoir un match au programme pour enjamber la question du MJ.
Corrigé sur les deux surfaces : le bouton du panneau ET la barre fixe mobile.

### Les textes de l'IA sont plus courts (demande explicite)

| | avant | maintenant |
|---|---|---|
| récit du MJ (`iaLocale.ts`) | 2 à 5 phrases · 700 tokens | **2 phrases** · 360 |
| scène hebdomadaire (`ia.ts`) | 2 à 4 phrases · 420 | **2 phrases, 45 mots** · 240 |
| jugement de la réponse | 2 à 5 phrases · 520 | **2 phrases** · 300 |
| situation à choix | 2 à 4 phrases · 850 | **2 phrases** · 620 |
| interview | 2 à 4 phrases · 260 | **2 phrases** · 180 |
| post de L'Ovale | 280 caractères · 1100 | **180 caractères** · 900 |
| message privé | 1 à 3 phrases · 220 | **1 à 2 phrases** · 160 |

⚠️ Le prompt le DIT en plus de le borner : « on lit une réponse par semaine de
jeu ; un pavé à chaque fois, et le joueur arrête de lire ». Baisser `maxTokens`
seul produit des phrases coupées net, pas des phrases courtes.

## 🥇 LES GÉNÉRATIONS DORÉES — un championnat qui respire

« J'ai l'impression que c'est toujours le même calendrier des matchs et que les
équipes font toujours les mêmes générales, en mode ça sera toujours le Stade
premier ; fais qu'il puisse y avoir des générations dorées dans tous les clubs,
qu'on puisse gagner un Top 14 avec un outsider — mais que ça reste rare. »

**Les deux reproches étaient exacts, et mécaniques.**

### 1. Le calendrier était le même TOUS LES ANS

`calendrier(clubs)` déroulait un carrousel sur l'ordre du fichier de données, qui
ne bouge pas : la J1 opposait éternellement les deux mêmes clubs, et chaque club
recevait les mêmes adversaires aux mêmes dates, saison après saison. Le paramètre
`cle` mélange la liste (Fisher-Yates seedé) **avant** de dérouler le carrousel :
un tirage par saison, toujours déterministe.

⚠️ **LA CLÉ DOIT ÊTRE LA MÊME PARTOUT** : `division#saison`. Trois endroits
construisent la grille — le panneau de carrière (`matchDeLaSemaine`), l'écran
Résultats (`affichesDeLaJournee`) et le classement (`championnatEnDirect`). Deux
clés différentes, et le panneau annonce un adversaire que le tableau ne connaît
pas. Les coupes (`coupe#saison#poule`) et les sélections (`competition#saison`)
ont la leur.

### 2. La hiérarchie ne bougeait pas — `src/lib/generations.ts`

La force d'un club est la moyenne pondérée de ses 23 meilleurs joueurs, qui
vieillissent d'un an par saison : la hiérarchie de 2025-26 se reconduisait
presque à l'identique pendant douze ans. Le Stade Toulousain part à 86, personne
d'autre au-dessus de 80 : il finissait premier **toutes** les saisons.

Trois couches se superposent, **déterministes** (graine = nom du club) :

1. **le cycle ordinaire** (toujours actif) — sinusoïde ±2,2, période 7 à 11
   saisons, phase propre au club ;
2. **la génération dorée** (rare) — jusqu'à +8 sur 4 à 6 saisons, en cloche :
   elle arrive, elle culmine, elle s'en va ;
3. **la traversée du désert** (rare) — jusqu'à −6. Indispensable : sans elle, les
   gros clubs ne redescendent jamais et un outsider ne peut gagner qu'en étant
   meilleur dans l'absolu.

⚠️ **LA GÉNÉRATION DORÉE EST TEMPÉRÉE POUR LES GROS CLUBS**
(`(88 − noteBase) / 12`, plancher 0,3). Mesuré sans ce tempérament : Toulouse,
déjà premier à 86, montait à **92,8** et prenait **11 titres sur 20** — la
mécanique renforçait celui qui n'en avait pas besoin, à rebours de la demande. Le
CREUX, lui, n'est pas tempéré : un gros club doit pouvoir s'effondrer.

⚠️ **ON L'APPLIQUE À UN SEUL ENDROIT** — `effectifDuClub`, sur la note de CHAQUE
joueur. Tout en découle : force d'effectif, classement, montées, marché, feuille
de match, et l'écran 👥 qui montre bien des joueurs meilleurs. Poser le bonus sur
`forceEffectif` seul aurait donné un club qui joue comme 82 avec un effectif
affiché à 75 — deux vérités, et le joueur a raison de ne pas y croire.

**La fiche d'un club l'affiche** (`🥇 Génération dorée` / `📉 Traversée du
désert`) : un effectif qui prend cinq points sans explication, c'est du bruit ;
annoncé, c'est une histoire.

Mesuré (`npx vite-node scripts/verifGenerations.ts`) :

| | |
|---|---|
| calendrier | **12 tirages distincts sur 12 saisons**, déterministes |
| accord panneau / écran / classement | **0 écart sur 48 journées** |
| générations dorées | **6,1 %** des couples (club, saison) — cible 5 à 14 % |
| traversées du désert | 4,4 % |
| clubs concernés | **253 sur 833** en 12 saisons |
| variation d'un club sur 12 saisons | écart médian **7,3 points** |
| champions du Top 14 sur 20 saisons | **5 clubs différents**, le meilleur en prend 8 |
| titres hors du top 4 de départ | **6 sur 20** |

Et la pyramide tient : `verifPyramide.ts` → aucune division ne change de taille
sur 12 saisons.

### Les scripts

```bash
npx vite-node scripts/verifGenerations.ts  # calendrier tiré, générations rares, outsiders
npx vite-node scripts/verifDifficulte.ts   # à relancer après TOUTE retouche de la forme
npx vite-node scripts/verifSaison.ts       # forme, blessures et entraînement sur une saison
npx vite-node scripts/verifPyramide.ts     # les divisions gardent leur taille
```


## 📊 LES STATISTIQUES, ENFIN TOUTES VISIBLES ET COHÉRENTES

Trois retours de jeu qui tiennent ensemble : « le classement des stats joueurs
marche pas bien, des fois il perd des stats », « en match on a pas accès à tous
les stats », « notre joueur est jugé que sur plaquage, mètres parcourus et essai,
ce qui est dommage ».

### ⚠️ DEUX COMPTABILITÉS PARALLÈLES POUR LE MÊME JOUEUR

C'était ça, « il perd des stats ». Le joueur incarné était compté DEUX FOIS, à
deux endroits qui ne se parlaient pas :

| | alimenté par | lu par |
|---|---|---|
| `saisonEnCours` | match par match (moteur si regardé, estimation sinon) | panneau de carrière, profil, bilan de saison |
| `statsReelles` | la simulation de fond, journée par journée | les 18 classements de l'écran Résultats |

Tant qu'on regardait chaque match, les deux coïncidaient (même graine). Depuis
qu'on peut sauter des semaines, elles divergent : le panneau annonce 5 matchs, le
classement en montre 2. **Le joueur a raison — il perd des stats, et ce sont les
siennes.** `classementJoueurs` substitue désormais **toujours** ses vrais
chiffres accumulés ; la condition `!auMoteur` qui l'en empêchait a sauté. Une
carrière n'a qu'une seule vérité.

Deux corrections l'accompagnent :

- **Le rattrapage passe de 6 à 12 journées** (`simulerStatsJournee`) — depuis
  que l'avance par le calendrier est LE moyen d'aller vite, sauter dix journées
  est courant, et borner à 6 laissait des trous systématiques. Et **on rend la
  main entre deux journées** (`setTimeout(0)`) : douze journées d'affilée, c'est
  ~11 s de JavaScript synchrone — l'onglet se figeait au lieu de se remplir.
- **L'en-tête dit combien de journées ont VRAIMENT été rejouées** (« matchs
  joués · 6 journées sur 12 »). Il annonçait le nombre de journées disputées par
  le championnat : des chiffres de 6 journées présentés comme ceux de 12, c'est
  exactement ce qui donne l'impression que le classement perd des statistiques.

### La feuille de match montre les 23 compteurs, pas 5

Le moteur tient **vingt-trois** statistiques par joueur ; la feuille en affichait
cinq (mètres, plaquages, essais, passes, minutes). Le match d'un avant était donc
invisible : ni mêlée, ni touche, ni pick and go, ni grattage.

⚠️ **ET ON NE FAIT PAS UN TABLEAU DE VINGT-TROIS COLONNES.** Six vues, une par
famille — 📋 Général · ⚡ Attaque · 🛡️ Défense · 🌀 Conquête · 🦵 Pied ·
🟨 Discipline — et un clic pour basculer. Chaque en-tête dit au survol ce qu'elle
compte.

⚠️ **BUG ATTRAPÉ EN JEU** : avec cinq colonnes (vue « Pied »), les largeurs fixes
consommaient exactement la place et la colonne du nom tombait à **0 px** — une
feuille de match sans noms. `minmax(74px, 1fr)` la force à déborder, et le bloc
défile alors DANS son conteneur (`.ml-bilan-groupe`). Vérifié 1280 px et 375 px :
noms lisibles, page jamais de côté.

### Le barème de la note s'affiche

`noterMatch` juge sur **quinze** critères depuis longtemps (mêlée, touche, pick
and go, offloads, passes décisives, franchissements, ballons rendus, 50/22…).
Mais rien ne le montrait : le résumé ne citait que les essais, les plaquages et
les mètres. **Un barème qu'on ne voit pas est un barème qui n'existe pas pour le
joueur.**

⚠️ **`detailNote()` EST DÉSORMAIS LA SEULE IMPLÉMENTATION DU BARÈME** :
`noterMatch` ne fait qu'additionner ses lignes. Recopier le calcul pour
l'affichage aurait garanti qu'un jour la note montrée ne soit plus celle qui
compte. Vérifié : `verifApresMatch.ts` redonne exactement les mêmes notes.

Le dépliant « ⭐ Ma note — d'où elle vient » s'ouvre sous la feuille de match.
Relevé en jeu sur un talonneur : Base +5,8 · Temps de jeu +0,4 · Plaquages −0,1 ·
Mètres −0,5 · **Ballons grattés (4) +1,8** · **Passes décisives (1) +0,8** ·
Offloads −0,1 · **Mêlée −0,7** · Touches −0,1 · **Pick and go −0,4** → 7/10.

### Le mode d'emploi du classement a été retiré de l'écran

Demande explicite : « supprime la case dans le classement qui explique comment le
setup ». Le dépliant « 🌍 Rendre ce classement mondial — et impossible à truquer »
(schéma de table SQL, liste des bornes de `verifierFiche`, recommandations
serveur) était de la **documentation de développeur affichée à un joueur**. Elle
a sa place dans `serveur/VERCEL.md` et dans ce fichier — pas dans le jeu.
Le dépliant « 🔐 Ma fiche d'envoi », lui, reste : c'est ce que le joueur envoie,
et le voir en clair fait partie du contrat de confiance.


### L'envoi au classement est AUTOMATIQUE, et l'écran ne demande plus rien

Demande explicite : « la fiche d'envoi, il faut que ça s'envoie automatiquement ».

| | avant | maintenant |
|---|---|---|
| dépliant « 🔐 Ma fiche d'envoi » (JSON en clair) | affiché | **retiré** |
| bouton « 🌍 Envoyer ma carrière » | à cliquer | **retiré** |
| déclenchement | manuel | **fin de saison** + **retraite**, tout seul |
| ce qui reste à l'écran | un pli et un bouton | **une ligne d'état** sous le tableau |

- `saisonSuivante` et `prendreRetraite` appellent `envoyerAuClassement` sans
  attendre la réponse et sans jamais échouer : hors ligne, sans serveur, fiche
  refusée ou quota atteint, la saison se referme exactement pareil.
- ⚠️ **Renvoyer chaque année ne peut rien dégrader** : la base garde le MEILLEUR
  score (`on conflict … where excluded.score > classement.score`).
- ⚠️ **LE DÉBIT SERVEUR A ÉTÉ DESSERRÉ EN CONSÉQUENCE** : 1 envoi/heure était
  calibré pour un bouton cliqué à la main. Avec l'envoi automatique, une session
  normale en produit plusieurs par heure — le joueur honnête se prenait des 429
  et son meilleur score n'arrivait jamais. **18/heure et 120/jour** (triplé une
seconde fois : l'envoi part aussi à chaque semaine jouée) ; ça reste sans
  intérêt pour un script, puisque la vraie barrière n'est pas le débit mais le
  RECALCUL.

Vérifié : `VITE_CLASSEMENT_URL=… npx vite-node scripts/verifClassement.ts` →
3 saisons jouées + retraite = **4 requêtes**, scores 554 → 654 → 714 → 714,
la dernière étant bien celle de la retraite.


## ✈️ LE MARCHÉ DES TRANSFERTS SE JOUE SUR 𝕏 L'OVALE

Demande explicite : « j'aimerais refaire tout le système de transfert, que ça se
passe par X : un club envoie un message et c'est à nous de négocier ; l'agent
pareil, on peut pas vraiment le choisir, ça dépend de nos performances ».

Quatre arbitrages ont été tranchés avant d'écrire une ligne :

| Question | Décision |
|---|---|
| Qui décide du résultat d'une négociation | **Leviers chiffrés**, l'IA n'écrit que l'habillage |
| Le panneau « Choix de carrière » | **Il disparaît complètement** |
| L'agent | Il te **démarche** — et tu peux le démarcher aussi |
| Les fenêtres | Approches **en cours d'année**, transfert **à l'intersaison**, et seulement à **1 an de contrat maximum** |

### ⚠️ ON N'A PAS REFAIT LE MOTEUR DU MARCHÉ — ON A REFAIT LA SURFACE

`lib/offres.ts` décide toujours QUI s'intéresse à toi et à quel prix :
`cote()`, `besoinAuPoste()`, l'interdiction de sauter deux étages, le plafond qui
dépend de l'âge, les salaires par âge. Tout est calibré et protégé par
`verifMarche.ts` et `verifDifficulte.ts` — le toucher, c'est refaire l'étalonnage
de difficulté. Ce qui est neuf, c'est **la conversation** : ce qui se passe entre
le moment où un club se manifeste et celui où on signe.

### `src/lib/negociation.ts` — le moteur, pur et déterministe

- **Une approche** porte l'offre COURANTE, un **plafond caché**, et une
  **patience**. Le plafond est calculé une fois, à la naissance de l'approche
  (graine = club + saison + nom) : rouvrir la conversation ne redonne jamais une
  meilleure main, et le save-scumming ne sert à rien.
- ⚠️ **LE PREMIER MOT DU CLUB EST SOUS SON OFFRE JUSTE** (×0,86), sinon il n'y a
  rien à négocier. Bien négocier rend donc un peu plus que l'ancien panneau, mal
  négocier rend moins — c'est tout l'intérêt.
- **Quatre leviers** : 💰 salaire (+18 %) · ✍️ prime · 📅 durée · 🎽 temps de jeu
  garanti. Le dernier coûte **deux** tours de patience : un club déteste
  s'engager sur une feuille de match, et tous ne peuvent pas le promettre.
  Accordé, il vaut **68 de confiance du staff à l'arrivée** au lieu de 50 — ça se
  lit dès la première composition.
- **Trois verdicts** : le club accepte, contre-propose à mi-chemin, ou **se
  braque** quand la patience est épuisée. Mesuré : s'acharner sur le salaire fait
  rompre au 3ᵉ tour, jamais au 1ᵉʳ, et le plafond n'est **jamais** dépassé.
- ⚠️ **PURE : `repondreAuClub` ne mute pas son entrée.** Le store compare des
  références ; une négociation qui modifie l'approche en place ne redessinerait
  rien à l'écran.

### Ce qui se passe dans le store

- **`susciterApproches`** fait écrire des clubs. La règle du « un an de contrat
  maximum » vit ici.
- ⚠️ **UNE EXCEPTION, ET ELLE N'EST PAS UN CONTOURNEMENT** : un joueur dont la
  générale est **12 points sous la force de son effectif** est sur le départ,
  quel que soit son contrat. Mesuré sans elle : un espoir de 32 recruté par un
  club noté 58 y restait **douze saisons** — médiane de difficulté **58 → 32**, et
  **plus aucune carrière sur 100 ne dépassait 40**. C'est la mobilité qui permet
  à un jeune de trouver son niveau, d'y jouer, donc de progresser. Et c'est
  réaliste : un club qui ne fait pas jouer un joueur le prête ou le laisse
  partir. La règle du « un an max » vise les clubs qui DÉBAUCHENT un joueur qui
  réussit.
- **`accepterApproche`** pose un **pré-accord** (`Joueur.preAccord`) et ferme
  toutes les autres discussions : on a donné sa parole.
- ⚠️ **LE TRANSFERT S'APPLIQUE APRÈS LA RÉSOLUTION DE LA SAISON**, pas avant.
  Bug attrapé par `verifTitres.ts` : posé en tête de `saisonSuivante`, il
  changeait de club AVANT `resoudreTrophees` — le joueur remportait la Champions
  Cup avec son NOUVEAU club, qui ne l'avait pas gagnée, et le titre de l'ancien
  passait à la trappe. Mesuré : **5 titres oubliés sur 48 saisons**. On finit sa
  saison là où on l'a jouée.
- **Le contrat signé n'est pas entamé** par la saison qu'on vient de jouer : les
  N saisons commencent à la suivante.

### Le blocage de fin de contrat a changé de support

Le panneau portait le verrou « on ne joue pas une saison sans contrat ». Il a
disparu — le verrou est donc devenu un **état de la fiche** :

```ts
contratBloque(j) = (j.contrat?.saisons ?? 1) <= 0 && !j.preAccord
```

Lu par `semaineSuivante` (qui refuse d'avancer), `avancerJusqua` (qui s'arrête
avec le motif « contrat ») et `saisonSuivante` (qui ne démarre pas). ⚠️
`avancerJusqua` ne compte plus une semaine que `semaineSuivante` a refusée —
l'écran annonçait « 1 semaine jouée » sans que rien ne bouge.

### L'agent se mérite — et il peut te lâcher

- **`SEUIL_AGENT`** : le cousin dès le premier jour, le cabinet à 52, l'agence
  internationale à 68, le requin à **74**. On cochait un nom dans une liste dès
  la première semaine : le requin qui fait exploser les salaires était accessible
  à un joueur de Régionale 3.
- **Il te démarche** quand ta cote franchit sa barre (message privé sur L'Ovale),
  et **tu peux le démarcher** depuis sa conversation — il décline poliment si tu
  n'es pas au niveau, et ça coûte 4 de moral.
- **Il te lâche après DEUX saisons ratées** d'affilée (`derniereSaisonRatee`) —
  pas une : un agent ne part pas sur un accident.

### ⚠️ ET L'ÉTALONNAGE A DÛ ÊTRE REPRIS

La règle du « un an maximum » réduit fortement la MOBILITÉ : on ne change plus de
club qu'une fois tous les deux ou trois ans, là où on pouvait enchaîner les
montées chaque intersaison. Mesuré, c'est la **queue** qui en souffre — carrières
≥ 80 : 10/100 → **1 à 6**, la médiane ne bougeant pas. Le **talent brut**
(`lib/progression.ts`) est le levier qui n'agit que sur cette queue : rouvert de
`marge/8,6` plafonné à 3,0 vers `marge/7,4` plafonné à 3,5.

Réétalonné sur trois tirages de 100 carrières :

| | référence | après ce lot |
|---|---|---|
| médiane | 58-63 | **61 · 57 · 58** |
| maximum | 85-91 | 90 · 89 · 85 |
| carrières ≥ 80 | 10-15/100 | **16 · 10 · 5** |
| carrières ≥ 85 | 3-4/100 | 8 · 4 · 2 |

### 🩹 Deux bugs attrapés en jeu pendant le développement

- ⚠️ **LE PSEUDO DU CLUB DOIT ÊTRE CELUI DE L'ANNUAIRE**
  (`pseudoStable(club, '_officiel')`). Avec un `club:<nom>` inventé pour
  l'occasion, la messagerie ne retrouvait pas le compte et **la conversation
  n'apparaissait pas** : le club écrivait dans le vide.
- ⚠️ **UNE CONVERSATION NE DISPARAÎT PLUS FAUTE DE FICHE.** Un interlocuteur
  absent de l'annuaire était silencieusement `undefined`, puis retiré par
  `.filter(Boolean)` — le message existait, la conversation non. Même principe
  que `compteDepuis` pour les profils : on fabrique une fiche minimale.

### Le motif « signer puis relancer » est factorisé

`scripts/_saison.ts` — cinq scripts de mesure recopiaient la même boucle, et les
cinq se sont cassés le jour où le marché a changé de forme. ⚠️ Ce n'est pas un
détail de test : `saisonSuivante` s'ARRÊTE sans contrat, donc un script qui ne
signe pas compte des saisons jamais jouées et l'étalonnage devient faux sans
prévenir. Deux pièges mesurés et documentés dedans : accepter la PREMIÈRE
approche fait descendre les carrières (médiane 49 → 34), exiger qu'elle fasse
MONTER les bloque toutes (plus rien au-dessus de 40).

### Les scripts

```bash
npx vite-node scripts/verifTransferts.ts   # moteur pur, règles de fenêtre, pré-accord, blocage
npx vite-node scripts/verifMarche.ts       # le marché à tous les étages
npx vite-node scripts/verifTitres.ts       # le transfert n'efface plus les titres de l'ancien club
npx vite-node scripts/verifDifficulte.ts   # ⚠️ à relancer après TOUTE retouche du marché
```


## 🔌 L'IA REPASSE SUR GROQ — et le quota devient invisible

Demande, mot pour mot : « reviens à une clé Groq au lieu d'un LLM local, c'est
plus rapide pour répondre ; ensuite fais que dès qu'il y a quota exceeded ça ne
s'affiche pas et switch sur le système sans IA, et que dès que le quota est de
retour il revienne ».

### Ce qui a disparu

| | avant | maintenant |
|---|---|---|
| moteur | WebLLM (Llama 3.2 1B, WebGPU, Worker) | **Groq**, API distante |
| premier lancement | **~900 Mo** téléchargés en arrière-plan | rien |
| dépendance | `@mlc-ai/web-llm` | aucune (un `fetch`) |
| appareils exclus | tous ceux sans WebGPU | aucun |
| latence d'une scène | plusieurs secondes sur machine modeste | quelques centaines de ms |
| fichiers | `lib/iaLocale.ts`, `workers/iaLocale.worker.ts` | `lib/groq.ts` + `lib/mj.ts` |

`src/lib/iaLocale.ts` a été **coupé en deux** : le TRANSPORT (clé, quota, appel,
compteurs) dans `lib/groq.ts`, les PROMPTS et surtout les **garde-fous**
(`plafonnerDeltas`, `ressembleATriche`) dans `lib/mj.ts`. Ces derniers n'ont pas
bougé d'une ligne : le moteur a changé, l'étalonnage de difficulté non.

| Fichier | Rôle |
|---|---|
| `src/lib/groq.ts` | La clé (site + joueur), les **modèles en cascade**, l'appel, le quota, l'état observable, les compteurs de tokens. |
| `src/lib/mj.ts` | Le prompt système du MJ, le parsing, `plafonnerDeltas()`, `ressembleATriche()`, `messageErreurIA()`. |

### ⚠️ CE QUE LE JOUEUR NE DOIT JAMAIS VOIR

**Un quota atteint n'est pas une panne.** Trois mécanismes s'enchaînent :

1. **Trois modèles, dans l'ordre** (`MODELES_GROQ`). Chez Groq les limites sont
   comptées **par modèle** : quand le premier est épuisé, le suivant ne l'est
   presque jamais. On dégringole donc d'un cran avant de couper quoi que ce
   soit. ⚠️ **La cascade a changé de composition ET de doctrine** — voir
   « L'IA REPART SUR GPT-OSS » plus bas : les modèles Llama ont disparu du
   catalogue Groq, et on part désormais du **moins cher**.
2. **Le blocage est daté.** `delaiDeReprise()` lit l'en-tête `retry-after`, à
   défaut `x-ratelimit-reset-*`, à défaut le « try again in 7m32.6s » du corps
   d'erreur. ⚠️ `dureeEnMs()` lit **`ms` avant `m`** — sans ça, `850ms` devenait
   850 minutes et l'IA restait coupée quatorze heures.
3. **`iaDisponible()` est réévaluée à chaque appel**, jamais mise en cache.
   C'est ce qui fait que « ça revient tout seul » : à la seconde où le blocage
   expire, l'appel suivant repart sur Groq. Un réveil programmé
   (`programmerReveil`) prévient en plus les écrans abonnés.

Et côté affichage : **`messageErreurIA()` renvoie `null`** pour un quota, une
clé refusée ou une panne réseau. `erreurSocial` est mis à `null` dans les mêmes
cas. Il n'existe aucun chemin qui écrive « quota » à l'écran, sauf ⚙️ Réglages —
le seul endroit où l'état a le droit d'être visible, avec la reprise estimée.

### ⚠️ UNE RÉPONSE ÉCRITE OBTIENT TOUJOURS UNE ISSUE

C'est le piège de la bascule silencieuse, et il bloquait la partie : si le quota
tombe **pendant** que le joueur répond à une scène hebdomadaire, on ne peut ni
afficher une erreur (interdit), ni laisser la scène en plan — `evenementHebdo`
verrouille « semaine suivante ». `jugementLocal()` (`lib/ia.ts`) tranche alors
côté code : issue déterministe (graine = scène + réponse), pondérée par la forme,
le moral et le soin apporté à la réponse, petits deltas, `ressembleATriche`
appliqué. ⚠️ **Ni conséquence dure, ni départ sur le marché** : mourir ou finir
en garde à vue ne se décide pas parce que le réseau a lâché.

L'action LIBRE, elle, n'a pas d'issue possible sans MJ : la barre de saisie est
alors neutralisée avec une invite différente (`car.placeholderSansMJ`), et la
semaine se joue aux situations à choix. Pas de message d'erreur, pas de bouton
mort.

### La clé

- `VITE_GROQ_KEY` = **la clé du site**, injectée à la compilation, donc lisible
  par n'importe quel joueur. C'est un choix assumé (décision de l'utilisateur) :
  personne n'a rien à saisir.
- Un joueur peut coller **la sienne** dans ⚙️ Réglages (`groqKey`, persistée) :
  elle prend la priorité et lui rend l'IA même quand le site est à sec.
  ⚠️ Elle vit dans un module (`definirCleGroqJoueur`), comme la langue et le
  thème — `lib/groq.ts` ne peut pas importer le store sans créer un cycle.
- `VITE_GROQ_MODELE` surcharge la cascade de modèles sans toucher au code.

⚠️ **Sauvegarde `version: 9`** : `iaLocaleActivee` devient `iaActivee`, et
`modele` est réinitialisé — il pointait un fichier WebLLM
(« Llama-3.2-1B-Instruct-q4f16_1-MLC ») qui serait parti tel quel dans une
requête Groq.

Vérification sans réseau : `npx vite-node scripts/verifIA.ts`.

## 🗓️ L'HEURE DU JEU DANS LES MESSAGES DE L'OVALE

Retour de jeu : « sur X, dans les messages, fais que la date et l'heure soient
celles du calendrier in-game et pas la date actuelle ».

Les **publications** étaient déjà datées du calendrier (`date: libelleDate(sem)`).
Les **messages privés** et les **notifications**, non : ils affichaient
`creeLe`, c'est-à-dire `Date.now()`. On lisait donc « 10 août 17:04 » sous un
message reçu en pleine 12ᵉ journée — un mois de novembre dans le jeu.

- `MessageDM` et `NotifSocial` portent désormais **`semaine`** (la semaine de
  jeu). `creeLe` reste écrit, mais il ne sert plus qu'à **RANGER** les
  conversations dans l'ordre.
- **`horodatageJeu(semaine, graine)`** (`data/calendrier.ts`) rend « 12 oct. ·
  18:42 ». ⚠️ L'heure est **tirée d'une graine** (l'identifiant du message), pas
  de l'horloge : le même message garde la même heure à chaque ouverture, et deux
  messages de la même semaine ne s'affichent pas tous à la même minute.
- Une vieille sauvegarde n'a pas de `semaine` : l'horodatage est alors
  simplement omis, plutôt que d'inventer une date.

## 🚑 UNE BLESSURE DE FIN DE CARRIÈRE ARRÊTE ENFIN LA CARRIÈRE

Bug de gameplay, et le pire du lot : `tirerBlessure()` peut sortir une blessure
de gravité **`carriere`** (2 % des blessures, 99 semaines). Le journal annonçait
« les médecins sont unanimes : tu ne rejoueras plus, ta carrière s'arrête ici »…
et le jeu continuait. Le joueur se retrouvait avec **99 semaines d'infirmerie** :
aucun match (`matchAJouer` exclut les blessés), aucun entraînement (`entrainer`
refuse), la générale qui s'effondre saison après saison, et rien pour en sortir
avant deux ans de jeu.

La voie du Maître du Jeu était correcte depuis le début (`appliquerConsequence`
→ `finale: true` → retraite) ; c'est le tirage **du terrain** qui n'avait jamais
été branché. `raccrocherSurBlessure()` (store) l'est désormais, appelé par
`semaineSuivante` et par `enregistrerMatchVecu`, en toute fin de traitement :
la semaine se termine normalement, puis la carrière s'arrête et le joueur entre
au Hall.

## 👕 LE VESTIAIRE — 16 articles cosmétiques, et deux modèles enfin branchés

Demande : « rajoute des items dans la boutique que je modéliserai en 3D ».

`data/boutique.ts` gagne `EQUIPEMENTS` : **3 crampons, 3 maillots,
10 accessoires**, rangés par `CategorieEquipement`. Le store porte
`equipements` (possédés) et `equipementActif` (une pièce par catégorie), et la
tenue portée s'affiche en pastilles dans le panneau de carrière, à côté des
traits.

- ⚠️ **COSMÉTIQUE, ET RIEN D'AUTRE.** Aucun article ne touche à un attribut, à
  la forme, au moral ni au potentiel — c'est la règle qui a fait supprimer les
  boosts, et elle vaut ici. `scripts/verifDifficulte.ts` n'a pas à être relancé.
- ⚠️ **CHAQUE ARTICLE DÉCLARE DÉJÀ SON `.glb`, MÊME CEUX QUI N'EXISTENT PAS.**
  `ModeleObjet` teste la présence du fichier (HEAD) et retombe sur la pastille
  emoji. Déposer le modèle compressé dans `public/m3d/` suffit donc à le faire
  apparaître en 3D, **sans une ligne de code**. Fichiers attendus :
  `casque.glb`, `protege-dents.glb`, `bandeau.glb`, `mitaines.glb`,
  `chaussettes.glb`, `tee.glb`, `sac.glb`, `strapping.glb`,
  `bouclier-plaquage.glb`, `cuvette.glb`.
- `m3d/crampons.glb` et `m3d/maillot.glb` traînaient dans le dossier depuis des
  mois **sans être branchés nulle part** : ils le sont enfin, et une `teinte`
  par article donne trois coloris à partir d'un seul fichier.

### ⚠️ DEUX PIÈGES 3D, MESURÉS EN JEU

1. **LE NAVIGATEUR N'ACCORDE QU'UNE POIGNÉE DE CONTEXTES WebGL.** La boutique en
   consommait déjà six (cinq vignettes de ballon + le grand aperçu). Une
   vignette animée par article d'équipement, c'était vingt-deux : le navigateur
   ferme alors les plus anciens — « THREE.WebGLRenderer: Context Lost » en
   boucle — et **tout devient noir, ballons compris**. Monter le modèle
   seulement au survol ne suffit pas non plus : chaque entrée/sortie de souris
   crée et détruit un contexte, et le navigateur ne les rend pas assez vite.
   Solution retenue : les articles sont des **pastilles**, et pointer l'un
   d'eux change ce qu'affiche **le grand aperçu déjà existant**. Six contextes,
   quel que soit le nombre d'articles.
2. **`mesh.material` NE DOIT PAS DEVENIR UN TABLEAU.** Le code de teinte
   faisait `material.map(...)`, qui rend toujours un tableau — or three.js ne
   dessine un maillage à plusieurs matériaux qu'en suivant `geometry.groups`.
   Les modèles n'en ont aucun → **aucun appel de rendu, aucun message
   d'erreur**, un cadre vide alors que le modèle était chargé, cadré et éclairé.
   Et au passage : ces modèles arrivent en `metalness: 1, roughness: 1`. Un
   métal pur n'a pas de diffus, il ne rend que ce qu'il réfléchit — et sans
   carte d'environnement, il n'a rien à réfléchir : **noir sur noir**. On borne
   donc le métal à 0,25 et la rugosité à 0,45 minimum.

## 📺 LA PUBLICITÉ — d'abord une liste d'interdits

Demande : « mets la possibilité d'avoir des pubs sur le site ou qu'on puisse
visionner une pub pour avoir un bonus ou un cosmétique ; fais que les pubs ne
soient pas chiantes et ne nuisent pas au jeu ».

`src/lib/pub.ts` s'ouvre sur **sept règles**, et elles ne sont pas des
préférences — ce sont les conditions pour que la pub reste supportable :

1. **Aucune pub pendant le jeu** : ni sur l'écran de Carrière, ni pendant un
   match, ni sur 𝕏 L'Ovale (une pub sur un faux réseau social, on ne sait plus
   ce qui est du jeu). `ECRANS_AVEC_PUB` = Boutique, Hall, Classement, Clubs.
2. **Jamais d'interstitiel**, jamais de pop-up, jamais de vidéo lancée seule.
3. **Jamais de `position: fixed`** : le bloc vit dans le flux, en bas de page,
   hauteur bornée à 132 px.
4. Une seule par écran.
5. La pub récompensée est **toujours facultative** — rien ne se débloque
   uniquement par elle.
6. ⚠️ **Elle ne touche pas à la difficulté** : elle rapporte des **Ovas**, et
   les Ovas n'achètent que du cosmétique.
7. **Rien ne se charge sans consentement** (RGPD) : tant que le choix vaut
   « inconnu », aucun script de régie n'est injecté.

**Réglage de la récompense** : `OVAS_PAR_PUB = 8`, `PUBS_PAR_JOUR = 3`,
15 minutes entre deux. ⚠️ L'économie d'Ovas est dure par choix (départ à 0, une
action rapporte 1, une saison 3) : une pub à 50 Ovas viderait la boutique en une
soirée. Ne pas remonter sans y réfléchir.

**Côté régie, rien n'est câblé** : sans `VITE_PUB_CLIENT`, aucune bannière n'est
rendue et le jeu est strictement identique à avant. La pub récompensée, elle,
est **jouable dès maintenant** grâce à un encart maison avec compte à rebours —
le jour où un SDK arrive, il prend la place du contenu de la modale, et le
contrat ne change pas : `onTerminee()` seulement si la pub a été vue en entier.

Les pistes de revenus, les ordres de grandeur et ce qu'il ne faut pas faire :
**[`MONETISATION.md`](MONETISATION.md)**.

### Les scripts

```bash
npx vite-node scripts/verifIA.ts           # quota lu, bascule silencieuse, retour auto, garde-fous
npx vite-node scripts/verifTraductions.ts  # les nouvelles clés dans les 7 langues
npx vite-node scripts/verifDifficulte.ts   # ⚠️ inchangé : rien de vendu ne touche au terrain
```

## ⚠️ LES SCRIPTS DE MESURE NE MESURENT PLUS RIEN — À RÉPARER

Constaté en lançant la suite : **`verifHonneurs.ts` échoue, et `verifDifficulte.ts`
annonce des chiffres qui n'ont plus aucun rapport avec la documentation.**

| | référence documentée | ce que les scripts rendent aujourd'hui |
|---|---|---|
| générale médiane (100 carrières) | 58-63 | **40** |
| maximum | 85-91 | **56** |
| carrières ≥ 80 | 10-15/100 | **0/100** |
| carrières décrochant une distinction | 5/60 | **0/60** |

⚠️ **CE N'EST PAS UNE RÉGRESSION DU JEU — c'est la MESURE qui est cassée**, et
c'est vérifié : le même écart existe sur le commit `2606aa9`, avant toute
modification de ce lot.

**La cause.** `scripts/_saison.ts` enchaîne des `saisonSuivante()`. Or depuis la
suppression du mode « saison par saison » (voir plus haut), `saisonSuivante` ne
simule **plus aucun match** : c'est `semaineSuivante` qui remplit
`Joueur.saisonEnCours`. Une saison jouée par ces scripts se termine donc avec
**0 match, 0 essai, aucune note** — `noterSaison` la juge en conséquence, la
progression stagne et le potentiel se rabote d'un point par an. Mesuré sur une
carrière sondée : générale 35 → 44 en neuf saisons, puis déclin, avec un
potentiel de 96 jamais approché.

En jeu, rien de tout ça : la carrière se joue semaine par semaine (ou par
`avancerJusqua`, qui rejoue vraiment chaque semaine), `saisonEnCours` est
rempli, et la progression est normale — sondé à +12 de générale en trois
saisons.

**Ce qu'il faut faire** : réécrire `jouerUneSaison` pour boucler sur
`semaineSuivante()` (en résolvant les scènes et les approches) plutôt que
d'appeler `saisonSuivante()` directement. ⚠️ Le coût est réel — 100 carrières
× 14 saisons × 45 semaines, matchs simulés compris — il faudra sans doute
réduire l'échantillon ou couper la simulation de fond
(`simulerStatsJournee`) pendant la mesure. **Tant que ce n'est pas fait, aucun
chiffre de `verifDifficulte.ts` ni de `verifHonneurs.ts` ne doit servir à
retoucher l'étalonnage** : on corrigerait le jeu pour compenser un test faux.


## L'économie d'Ovas, mesurée (réétalonnage complet)

⚠️ **Demande explicite** : « rééquilibre toute la boutique sur les prix, il faut
que ce soit dur d'obtenir des cosmétiques ; si on fait une bonne carrière avec
les achievements on fait facile 4 000-5 000 Ovas, réduis pour que ce soit plus
autour des 500. »

Le diagnostic tient en une multiplication que personne n'avait faite : ce
n'était **aucune des valeurs affichées** qui était trop généreuse, c'était le
NOMBRE d'occasions.

| Robinet | Avant | Maintenant | Ce qui a changé |
|---|---|---|---|
| Défis de la semaine | ~3 000 | **120** | 3 défis × 43 semaines × 12 saisons, sans plafond → `PLAFOND_OVAS_DEFIS_PAR_SAISON = 10` |
| Actions au Maître du Jeu | ~500 | **48** | +1 Ova par scène, et la scène tombe CHAQUE semaine → `PLAFOND_OVAS_ACTIONS_PAR_SAISON = 4` |
| Succès | ~630 | **253** | les 68 valeurs de `data/succes.ts` divisées par 2,5 (cagnotte 1 060 → 421) |
| Trophées | ~90 | **45** | les 54 valeurs de `data/trophees.ts` divisées par 2 |
| Saisons, situations, retraite | ~85 | 83 | inchangé |
| **Total par belle carrière (12 saisons)** | **4 000-5 000** | **≈ 550** | |

- **Le plafond des défis est AFFICHÉ, pas subi** : l'onglet Succès de L'Ovale
  montre « 🪙 x / 10 Ovas versées par les défis cette saison », et un défi qui
  ne rapporte plus rien affiche « — » au lieu de « +2 🪙 ». Un défi reste
  toujours validé et notifié : c'est un objectif de semaine, pas une prime.
  Les deux compteurs vivent dans `compteurs` (store), remis à zéro à chaque
  intersaison — donc rien à migrer.
- **La pub a suivi** : `OVAS_PAR_PUB` 8 → **4**, `PUBS_PAR_JOUR` 3 → **2**.
  À 24 Ovas par jour, le robinet publicitaire versait une carrière entière en
  trois semaines sans jouer une minute.
- **L'échelle des prix** (`data/boutique.ts`) a trois marches qui veulent dire
  quelque chose face à ces ~550 Ovas : **entrée 60-90** (une carrière en paie
  cinq), **palier 120-260** (deux ou trois par carrière), **prestige 300-450**
  (une seule, et il faut la mériter). Tout acheter demande **~9 carrières**
  (~5 000 Ovas depuis le second lot de cosmétiques).
- **La mesure est un script** : `npx vite-node scripts/verifEconomie.ts`. Il
  additionne les robinets, affiche leur part, et **échoue** si le total sort de
  380-640 Ovas. À relancer après toute retouche d'un `ovas:` ou d'un prix.

## La boutique : ce qui a changé

- **L'aperçu des ballons remontre un ballon.** Le grand cadre appelait `Hero3D`,
  qui affiche le rugbyman dès qu'une carrière existe : on inspectait cinq
  ballons et on voyait toujours le même joueur. Il passe par **`ApercuBallon`**
  (exporté de `components/Hero3D.tsx`), qui ne monte que le ballon — et le fait
  tourner, comme les vignettes (c'est là qu'on inspecte un article).
- **Articles retirés** (demande explicite) : protège-dents, mitaines, tee de
  buteur et les **trois paires de chaussettes** — la catégorie `chaussettes`
  n'existe plus. Leurs `.glb` restent dans `public/m3d/`. `EQUIPEMENTS_RETIRES`
  sert à **nettoyer les sauvegardes** (store, version **10**) : un joueur qui
  portait des chaussettes dorées ne garde pas un emplacement occupé par un
  fantôme.
- **Second lot de modèles** (`new model boutique/`, 15 fichiers, 1,3 Go bruts) :
  ballon UBB (il **remplace** le Tricolore Away et garde son id `tricolore`,
  pour ne pas retirer l'article aux joueurs qui l'avaient acheté), 4 casques,
  2 paires de crampons, 8 maillots de club et de sélection. Compressés par le
  même pipeline que les trophées — `node scripts/copierTrophees.cjs`, dernier
  lot de `LOTS`. ⚠️ **Ils ne se teintent pas** : chacun porte sa texture peinte,
  une `teinte` repeindrait le motif. Ils sont donc déclarés sans.
- **4 cosmétiques s'obtiennent en regardant une pub** (demande explicite) :
  `casque-rose`, `crampons-graffiti`, `maillot-vannes`, `maillot-italie`. Ils
  portent `parPub: true`, `prix: 0`, et `acheterEquipement()` les REFUSE — sans
  ça, `coins < 0` étant toujours faux, un clic les aurait donnés gratuitement.
  `debloquerParPub()` (store) consomme un des passages quotidiens, comme la pub
  qui rapporte des Ovas : on ne débloque pas les quatre dans la même minute.
- **`public/ads.txt`** déclare Google comme seul vendeur autorisé
  (`google.com, pub-6166322317354663, DIRECT, f08c47fec0942fa0`). ⚠️ Il doit
  être servi **à la racine du domaine** (`/ads.txt`) — c'est pour ça qu'il vit
  dans `public/`, que Vite copie tel quel — et **par le domaine qui affiche les
  annonces** : sur un sous-domaine de préproduction, Google lit l'ads.txt du
  domaine racine. Sans lui, AdSense ne diffuse rien.
- **AdSense est branché** : l'identifiant `ca-pub-6166322317354663` est **en dur**
  dans `lib/pub.ts` (un `ca-pub-…` est public par construction — Google l'exige
  dans le `<script>` et dans `ads.txt`), la variable `VITE_PUB_CLIENT` ne sert
  plus qu'à pointer un autre compte. ⚠️ **Il manque encore `VITE_PUB_SLOT`** :
  un « slot » se crée bloc par bloc dans la console AdSense, personne ne peut le
  deviner. Tant qu'il est absent, aucune bannière n'est rendue et la pub
  récompensée joue son **encart maison** (compte à rebours du jeu) : la mécanique
  est jouable, mais elle ne rapporte rien. Avec le slot, une vraie annonce
  s'affiche dans la modale pendant le décompte.

## Le classement mondial montre enfin les autres joueurs

⚠️ **Demande explicite** : « dans le classement mondial, qu'on puisse voir les
stats des autres joueurs, leurs profils, armoires à trophées, clubs qu'ils ont
faits ». Elle **renverse** une décision antérieure — « dans la DB je veux
retenir juste le score » — dont `serveur/schema-vercel.sql` notait déjà la
conséquence : « on ne pourra pas, plus tard, afficher 12 saisons, 44 essais à
côté d'un score ». C'est exactement ce qu'il fallait faire.

- **La base garde la fiche** (schéma **v2**) : `nom, poste, nation, age, saisons,
  note, reputation, matchs, essais, selections, titres (jsonb), clubs (jsonb)`.
  Toutes NULLABLES — une ligne écrite par la v1 reste lisible et affiche
  franchement « seul son score est connu ». Le SQL de migration d'une base déjà
  en ligne est en tête de `serveur/schema-vercel.sql`.
- **La sécurité ne bouge pas d'un pouce** : ce qui protège le classement, c'est
  que le serveur RECALCULE le score (`scoreDeLaFiche`). Stocker davantage
  n'ouvre aucune brèche — chaque champ passe par `verifierFiche` avant d'être
  écrit.
- **`Joueur.clubs`** (nouveau) : tous les maillots portés, dans l'ordre.
  `palmares[].club` ne connaissait que les clubs où l'on a GAGNÉ. Alimenté à la
  création et dans `appliquerPreAccord` — le seul endroit où le club change.
  Une prolongation ne rallonge pas la liste.
- **`VERSION_BAREME` passe à 2** (le champ `clubs` entre dans la chaîne
  canonique, donc dans le sceau). Jeu et API étant déployés ensemble, le
  basculement est atomique.
- **`FicheAffichable`** (écran `Classement`) ramène les deux tableaux — le Hall
  local et le mondial — à une seule structure : il n'y a qu'un panneau de fiche
  à écrire, à styler et à traduire. Chaque ligne des DEUX tableaux s'ouvre.
- ⚠️ **La classe CSS s'appelle `.parcours-club`, pas `.fiche-club`** :
  `.fiche-club` existe déjà (la modale d'effectif, `width: 720px`), et la
  collision étirait chaque pastille sur toute la largeur de l'écran.
- Vérification : `npx vite-node scripts/verifClassement.ts` (section « 4 bis »
  pour les bornes des clubs).


## Correctifs du classement mondial (production)

Trois pannes remontées par les journaux Vercel, trois causes distinctes.

- **`column "nom" does not exist` (42703)** — le code v2 était déployé, la
  **migration SQL ne l'était pas** : le `GET` renvoyait 500 pour tout le monde,
  et le `POST` n'écrivait plus rien. Un déploiement de code ne doit pas pouvoir
  casser le classement parce qu'un `ALTER TABLE` traîne : `api/classement.ts`
  **retombe désormais sur les colonnes de la v1** (lecture ET écriture) quand
  Postgres répond 42703, en le journalisant. Le tableau s'affiche, les fiches
  détaillées apparaissent d'elles-mêmes une fois la migration passée.
- **`note hors bornes (100, attendu 0..99)`** — le serveur refusait de VRAIES
  carrières. `LIMITES.noteMax` valait 99, copié du plafond de `entrainer()`
  (`Math.min(99, …)`), alors que la note est la MOYENNE des 8 attributs et que
  le store les borne à **100** (`borne()`). Huit attributs à 100 = une générale
  de 100, légitimement. ⚠️ Corriger `noteMax` déplace `SCORE_MAX` :
  **82 488 → 82 500**, à répercuter dans les DEUX fichiers SQL (le `check` de la
  colonne `score`) sous peine de voir la base refuser ce que le jeu produit.
- **`version de barème inconnue (1)`** — un onglet resté ouvert sur l'ancien
  bundle. Se résorbe au rechargement, rien à corriger.

## Les écussons de sélection : le lot « nations »

⚠️ Demande explicite : « récupère les logos des nations manquants et applique-les
sur les sélections dont il manque l'image ; dans le classement mondial des
sélections, mets le logo des sélections, pas le drapeau ».

- **Troisième lot source** : `sources/logos/selections/nations/`, 167 écussons,
  **un fichier par pays, nommé dans la langue du jeu**. C'est ce qui le rend
  maintenable : il n'a AUCUNE table à tenir à la main (contrairement à
  `CATALOGUE`), la correspondance se fait sur le nom du fichier. Seules les
  orthographes divergentes passent par `ALIAS_NATIONS`.
- **Il est consulté EN DERNIER** (`LOGO_SELECTION_NATIONS`, après le logo fourni
  par l'appelant) : c'est un bouche-trou, il ne doit jamais passer devant un
  écusson officiel des deux autres lots.
- **Mesure** : `npx vite-node scripts/verifLogosSelections.ts` — les nations
  classées avec écusson passent de **73/114 à 110/114**. Les 4 restantes
  (Bermudes, Burkina Faso, Lesotho, Népal) ne sont dans aucun lot livré.
- **Le repli n'est plus des initiales, c'est le DRAPEAU** (demande explicite) —
  « BF » dans un classement ne dit rien à personne. ⚠️ **Et il est rond**
  (`.blason-drapeau`) : un drapeau nu est un rectangle, et au milieu d'une
  grille de 119 pastilles rondes il crevait l'alignement. Il est recadré dans le
  même disque que `.blason-logo`.
- **Le classement mondial des sélections** (`screens/Tableau.tsx`) affiche
  `<LogoEquipe>` et non plus `<Drapeau>` : un classement de rugby montre les
  emblèmes des fédérations — le trèfle, la rose, le coq — pas des drapeaux
  d'États. Mesuré à l'écran : **110 écussons, 4 drapeaux, 0 initiales.**

## Publicité : les deux fichiers à la racine

| Fichier | Ce que c'est | Ce qu'il fait vraiment |
|---|---|---|
| `public/ads.txt` | Texte inerte | Déclare Google seul vendeur autorisé. Sans lui, AdSense ne diffuse rien. |
| `public/sw.js` | **Service worker** | ⚠️ Fourni par une régie (Monetag, zone 11553232) sous l'intitulé « Verification ». **Ce n'est PAS un fichier de validation** : servi à `/sw.js` il a la portée RACINE du site, et son `importScripts` exécute du code distant modifiable à tout moment sans redéploiement. C'est le mécanisme des notifications push publicitaires. |

### Les boutons de récompense passent par Monetag

`LIEN_PUB_RECOMPENSEE` (`lib/pub.ts`) = `https://omg10.com/4/11553440`. Cliquer
« 🎬 Regarder » (Ovas) ou « 🎬 Débloquer » (cosmétique `parPub`) ouvre ce lien
dans un **nouvel onglet**, puis le compte à rebours du jeu se déroule dans la
modale ; au bout, la récompense tombe.

- ⚠️ **`ouvrirAnnonce()` est appelée DANS le gestionnaire de clic.** Un
  `window.open` différé est bloqué par tous les navigateurs — et une pop-up qui
  s'ouvre toute seule est exactement ce que la règle 2 de `lib/pub.ts` interdit.
  Si le bloqueur la refuse malgré tout, la modale affiche le lien à cliquer à la
  main plutôt qu'un décompte qui tourne devant rien.
- ⚠️ **`noopener,noreferrer` n'est pas décoratif** : sans `noopener`, la page de
  la régie garde une référence `window.opener` sur le jeu et peut le faire
  naviguer ailleurs (tabnabbing).
- ⚠️ **CE N'EST PAS UN VRAI FORMAT « REWARDED ».** Un direct link Monetag
  n'émet **aucun rappel** confirmant que le joueur a regardé quoi que ce soit :
  la récompense est versée au bout du compte à rebours, qu'il ait lu l'annonce
  ou refermé l'onglet aussitôt. C'est une limite du format — un vrai rewarded
  demande AdMob / Ad Manager et son SDK, qui remplacerait alors tout ce
  mécanisme. Le garde-fou reste le quota : `PUBS_PAR_JOUR = 2`, 15 min d'écart.
- Ordre d'affichage dans la modale : **1.** Monetag (l'annonce est dans l'autre
  onglet, rien à montrer ici) · **2.** AdSense si `VITE_PUB_SLOT` est
  renseigné · **3.** l'encart maison.

⚠️ **Le jeu n'enregistre AUCUN service worker** : rien dans `src/` n'appelle
`navigator.serviceWorker.register()`. Déposer `sw.js` ne l'active pas — c'est le
tag de la régie, s'il est un jour posé dans la page, qui l'enregistrera. Tant
qu'il ne l'est pas, le site se comporte exactement comme avant, ce qui permet de
valider le domaine sans rien changer au jeu.

⚠️ **Et ça entre en tension frontale avec les règles de `lib/pub.ts`** (« rien
ne se charge sans consentement », « jamais d'interstitiel ni de pop-up ») : une
notification push est exactement ce que ces règles écartent, et elle échappe au
bandeau de consentement du jeu puisque c'est la régie qui la déclenche. À
trancher avant d'ajouter le tag Monetag dans la page.


## 🔌 L'IA REPART SUR GPT-OSS — les modèles Llama ont disparu de Groq

Retour de jeu : « sur Groq le modèle Llama n'est plus dispo, seuls GPT et Qwen
le sont je crois — donc switch sur le plus économe ».

### ⚠️ CE N'ÉTAIT PAS UNE PANNE VISIBLE, ET C'EST LE PIRE CAS

`llama-3.3-70b-versatile` et `llama-3.1-8b-instant` ne figurent plus au
catalogue de production de Groq. Le premier appel répondait donc **404
`model_decommissioned`** — et comme la cascade sortait sur son `break` « panne
réseau », le second modèle (mort lui aussi) n'était même pas tenté. Résultat :
**toute l'IA du jeu était muette, en silence**, puisque par construction un
problème d'IA ne s'affiche jamais au joueur (règle du projet). Le jeu tournait
sur son contenu pré-écrit, et rien ne pouvait le signaler.

### La cascade, et pourquoi elle part du plus petit

| Ordre | Modèle | $ / M jetons (entrée / sortie) | Rôle |
|---|---|---|---|
| 1 | `openai/gpt-oss-20b` | **0,075 / 0,30** | le moins cher, production |
| 2 | `openai/gpt-oss-120b` | 0,15 / 0,60 | repli quand le quota du 20b est épuisé |
| 3 | `qwen/qwen3.6-27b` | ~0,29 / ~0,59 | dernier recours, catalogue *preview* |

⚠️ **C'EST UN CHANGEMENT DE DOCTRINE, PAS UN SIMPLE RENOMMAGE.** L'ancienne
cascade descendait du gros modèle vers le petit (« le meilleur d'abord »). On
fait l'inverse : la clé du site est partagée par TOUS les joueurs, et ce qu'on
demande au modèle est du JSON court et cadré dont `lib/mj.ts` reste de toute
façon l'autorité (`plafonnerDeltas`, `ressembleATriche`). Les limites Groq étant
comptées **par modèle**, la cascade reste par ailleurs la mécanique anti-quota.

### Les trois garde-fous ajoutés avec

1. **`ErreurModeleIA` + `modeleDisparu()`** — un 400/404 dont le corps parle de
   modèle (`model_not_found`, `model_decommissioned`…) met ce modèle au repos
   **douze heures** et **passe au suivant** au lieu de couper la cascade. C'est
   exactement le cas qui vient d'arriver : il ne peut plus tuer l'IA.
   `erreurSilencieuse()` la classe comme invisible, comme un quota.
2. **`reasoning_effort: 'low'`, et seulement pour gpt-oss.** Groq refuse (400)
   un paramètre inconnu : l'envoyer « au cas où » couperait le modèle qu'il est
   censé économiser. Il divise par deux les jetons de sortie facturés.
3. **Le budget de jetons a une marge (+260) et le `reasoning` sert de
   repêchage.** Chez un modèle qui raisonne, les jetons de réflexion sont
   décomptés de `max_tokens` : au plafond d'origine, le JSON se faisait couper
   net. Et si `content` revient vide, on rend le `reasoning` quand il contient
   une accolade — `lib/mj.ts` sait extraire un objet noyé dans du texte.

⚠️ **La sauvegarde répare le modèle mémorisé** : `s.modele` pointait un nom de
modèle Llama, et ⚙️ Réglages l'affichait encore. La migration le remplace dès
qu'il ne fait plus partie de `MODELES_GROQ` — pas de bump de version, c'est une
réparation idempotente.

`VITE_GROQ_MODELE` surcharge toujours la cascade sans toucher au code.
Vérification : `npx vite-node scripts/verifIA.ts`.


## 🎮 LE JOUEUR PREND LA MAIN — actions, provocations, bagarres

Demande explicite : « en match, j'aimerais qu'on puisse avoir l'option de
contrôler notre joueur comme dans un jeu — plaquage, sprint, passe, grattages,
etc. ; et qu'il puisse y avoir des bagarres si on insulte des joueurs, avec
l'option de pouvoir donner des ordres, avec répercussions : cartons plus souvent
en amateur et presque jamais en pro, qui suivent de grosses sanctions,
suspensions pour la saison, blessures, etc. »

| Fichier | Rôle |
|---|---|
| `lib/mondial.ts` | **La Coupe du monde** : 4 poules de 6 (2 journées), les 2 premiers croisés en quarts, puis demies et finale. Le vainqueur est celui de la FINALE. Déterministe (graine `mondial#saison`). |
| `moteur/elan.ts` | **La dynamique** — un nombre signé de −1 à +1, poussé par les turnovers, les percées et les essais, qui retombe de moitié en 40 s. Il entre dans `probaPlaquage` et `probaGrattage`, donc dans le pourcentage écrit sur chaque carte. Sans dépendance : `controle.ts` et `decisions.ts` le lisent sans connaître `moteur.ts`. |
| `moteur/controle.ts` | Les **25 actions**, leur disponibilité selon la phase, le coût en endurance, la recharge. Ne connaît pas `moteur.ts` — c'est l'inverse. |
| `moteur/bagarre.ts` | La **tension**, la provocation, le coup de poing, la bagarre, les cartons, les blessures, et la **commission d'après-match**. |
| `moteur/etat.ts` | `NiveauMatch`, `ActionJoueur`, `IntentionJoueur`, `Bagarre`, `DisciplineMatch`, et `ajouterCommentaire()` — mis en commun pour éviter le cycle `moteur ↔ bagarre`. |
| `moteur/moteur.ts` | Consomme l'intention là où elle se joue : contact, ruck, choix de combinaison, phase `bagarre`. |
| `components/MatchLive.tsx` | La barre d'actions contextuelle, la jauge de tension, le panneau d'ordres, la sanction d'après-match. |
| `store/useGame.ts` | `appliquerSanctionMatch()` — le seul chemin par lequel la discipline du terrain devient une conséquence de carrière. |

### ⚠️ CE QUI A ÉTÉ TRANCHÉ AVANT D'ÉCRIRE UNE LIGNE

1. **ON NE PILOTE PAS AU JOYSTICK.** Le moteur déplace trente pions à inertie
   sept fois par seconde ; poser deux flèches dessus donnerait un pion qui
   glisse à côté du rugby des vingt-neuf autres. Le joueur donne des
   **intentions de rugbyman**, le moteur les joue avec ses règles.
2. **UNE INTENTION EST ARMÉE, PAS INSTANTANÉE** — « je plaque » ne veut rien
   dire quand le porteur est à quinze mètres. Elle reste valable quelques
   secondes puis expire.
3. **UN SEUL ORDRE À LA FOIS** (`e.intention`) : on ne sprinte pas en grattant.
4. **ÇA COÛTE, ET ÇA RISQUE.** Endurance à la demande ; un plaquage lancé et
   manqué laisse un trou de trois secondes, un crochet raté rend le ballon une
   fois sur huit, un grattage mal placé donne une pénalité une fois sur cinq.

### Les vingt-cinq actions, par famille

| Famille | Actions | Quand |
|---|---|---|
| **Ballon en main** | 🏃 Sprint · ↩️ Crochet · 💪 Raffut · 🤝 Passer · 🦶 Taper | on est le porteur |
| **Ballon en main** | ⬅️ ➡️ Passe gauche / droite | on est le porteur, un partenaire de ce côté |
| **Gestes de poste** | 🎯 50/22 · ☂️ Chandelle | trois-quarts avec du pied |
| **Gestes de poste** | 🐛 Chenille | le numéro 9, au ruck de son camp |
| **Gestes de poste** | 🐂 Foncer | un avant, le ballon arrive |
| **Gestes de poste** | 🤲 Offload | le ballon arrive, un défenseur au contact |
| **Mener à la ligne** | 🕳️ Prendre l’espace | le ballon arrive, un trou ≥ 7 m près de soi |
| **Mener à la ligne** | 🪁 Par-dessus | ballon en main, un défenseur à moins de 13 m, hors de ses 22 |
| **Mener à la ligne** | 🤿 Plonger | ballon en main, à 12 m de la ligne d’essai |
| **Mener à la ligne** | 🦅 Intercepter | une passe en l’air POUR EUX, à 12 m |
| **Mener à la ligne** | 🐘 Contre-poussée | un avant, au ruck qu’on défend |
| **Attaque sans ballon** | 🙋 Réclamer · 🤸 Soutien | ballon vivant, son équipe l'a |
| **Défense** | 💥 Plaquer · ⬆️ Monter · 🪝 Gratter | ballon vivant, l'adversaire l'a |
| **Discipline** | 🗯️ Chambrer · 🥊 Frapper · ✋ Calmer | un adversaire à moins de 26 m |

⚠️ **LA BARRE NE MONTRE QUE CE QUI EST JOUABLE** — trois à cinq boutons, pas
vingt-cinq dont vingt-deux grisés : sur un téléphone de 375 px, une barre grise est
illisible et oblige à chercher ce qui est actif. Et **quand rien n'est jouable,
on dit POURQUOI** (sur le banc, sous carton, en recharge, phase morte) — vu en
jeu : le joueur démarrait remplaçant, la manette s'affichait, aucun bouton
n'apparaissait jamais et rien ne l'expliquait.

Raccourcis clavier **1 à 9**, lus sur `ev.code` (`Digit1`) et non `ev.key` : sur
un clavier AZERTY, la rangée des chiffres rend « & é " ' ( » sans Maj.

### ⚠️ LE TEMPS DE RECHARGE — ce que le banc d'essai a révélé

`scripts/verifControle.ts` joue un **pilote qui martèle le bouton** : c'est ce
que fera un vrai joueur. Sans recharge, la première version donnait :

| | sans recharge | avec |
|---|---|---|
| ballons portés (« Réclamer » en boucle) | **60** (un 3ᵉ ligne en porte 12) | 25 |
| ballons grattés | **14** | 8,6 |
| bagarres par match | **16** | 3 en amateur, 0,4 en pro |
| endurance à la sirène (sprint en boucle) | 14 | 17 |

Ce n'était pas un défaut de réglage mais de conception : un geste de rugby
demande de se replacer, de souffler, et de se faire oublier de l'arbitre.
Chaque action porte donc une `recharge` (2 s pour une passe, 15 s pour un
grattage, **45 s pour chambrer ou frapper**), toujours ≥ sa durée d'armement.
Deux garde-fous s'y ajoutent : réclamer le ballon exige d'être **à 25 m** et ne
marche qu'**une fois sur deux** (le 9 n'écoute pas toujours), et la riposte
adverse s'**amortit après chaque altercation** (`/(1 + 2n)`) — au rugby, la
première échauffourée change tout. Au-delà de **trois** altercations, plus rien
ne part : l'arbitre aurait vidé le terrain.

### ⚠️ AMATEUR / PRO : l'asymétrie demandée, mesurée

La coupure est à la **Nationale 2 (niveau 4)** : au-dessus — Top 14, Pro D2,
Nationale, championnats étrangers (niveau 0) et sélections — on est en
professionnel. `creerMatch(..., { niveau })`, **`pro` par défaut** : c'est ce
défaut qui garantit que la simulation de fond et les scripts de mesure gardent
l'étalonnage documenté.

| Mesuré (`verifControle.ts`, pilote qui chambre tout le match) | amateur | pro |
|---|---|---|
| bagarres par match | 3,0 | **0,4** |
| cartons par match (toutes causes) | 2,75 | 1,50 |
| suspension après un coup de poing | 5,3 semaines | **20,6 semaines** |

C'est la demande, littéralement : ça part au quart de tour en Fédérale et
l'arbitre distribue, mais la commission fait dans la semaine ; en Top 14
personne ne relève une provocation — et celui qui craque joue sa saison. Deux
réglages portent tout : `chanceDeRiposte()` (22 % contre 1,2 % à froid) et
`sanctionApresMatch()` (3-8 semaines contre 12-34).

### La bagarre : le jeu attend un ordre

La phase `bagarre` **ne fait rien** tant que `e.bagarre.ordre` est nul : l'écran
met la pause et pose la question. Quatre ordres, chacun annonçant son prix —
🥊 *On y va tous* (générale, cartons des deux côtés) · 🛡️ *Protéger* (risque
moyen) · ✋ *On se calme* (l'arbitre le voit, la sanction s'allège) · 🚶
*Reculer* (aucune sanction). Un **garde-fou d'attente** tranche tout seul au
bout de 90 s simulées : sans lui, un appel à `avancer()` hors interface
(simulation de fond, script de mesure) tournerait sans fin.

Le verdict tient en une note de **culpabilité** — origine de la bagarre, coup
porté, ordre donné — puis en une table de cartons qui dépend du niveau. Rien
n'est tiré au sort avant cette note : c'est ce qui rend la sanction lisible et
jamais arbitraire. En amateur, une générale envoie en plus un **troisième
larron** au vestiaire une fois sur deux — c'est le rugby du dimanche.

### Ce que le match laisse à la carrière

`bilan(e).discipline` porte l'ardoise du joueur ; `MatchLive` la passe à
**`appliquerSanctionMatch()`** juste après `enregistrerMatchVecu` :

- **carton rouge** → citation (pro 3-8 semaines, amateur 2-4) ;
- **coup de poing** → pro 12-34 semaines (la saison peut y passer), amateur 3-8 ;
- **coup non vu par l'arbitre** → la vidéo rattrape : cité 62 % du temps en pro,
  22 % en amateur. C'est ce qui empêche « frapper quand l'arbitre regarde
  ailleurs » d'être une stratégie ;
- **blessure de bagarre** (arcade, nez, main cassée, plancher orbitaire) ;
- un rouge sans citation coûte quand même 10 de confiance du staff.

⚠️ **ON NE CUMULE PAS DEUX INDISPONIBILITÉS.** `Joueur.blessure` est un champ
unique — il porte aussi bien un ligament croisé qu'une suspension. Main cassée
+ quinze semaines de suspension, ce n'est pas vingt et une semaines d'absence :
c'est la plus longue des deux, l'autre se soignant pendant.

### Ce qui n'a PAS bougé

- **Le score reste celui de la ligue** : vérifié, 0 écart sur 12 matchs pilotés.
  Le joueur change COMMENT on marque, jamais COMBIEN.
- **Le déterminisme du moteur** : deux pilotages identiques donnent le même
  match. Le contrôle vit dans l'état (`e.intention`, `e.recharge`, `e.tension`),
  jamais dans une variable de module.
- **L'étalonnage du moteur** : `verifMoteur.ts` inchangé (le niveau vaut `pro`
  par défaut, le contrôle est éteint hors interface).

```bash
npx vite-node scripts/verifControle.ts    # actions contextuelles, gestes qui pèsent, discipline amateur/pro
npx vite-node scripts/verifMoteur.ts      # l'étalonnage du moteur ne doit pas bouger
npx vite-node scripts/verifIA.ts          # la cascade de modèles Groq
npx vite-node scripts/verifTraductions.ts # les clés ajoutées, dans les 7 langues
```

---

## 🎮 LE MATCH SE JOUE ENFIN — caméra, moments, HUD sous le pouce

> ⚠️ **CE QUI SUIT DÉCRIT UN HUD QUI N'EXISTE PLUS.** Le joystick flottant,
> le gros bouton contextuel et les boutons secondaires ont été retirés :
> « dans les matchs on ne fait que les choix, pas bouger le joueur ». **La
> caméra et les moments, eux, sont toujours là et toujours vrais.** Ce qui a
> remplacé la manette est décrit dans « 🎯 ON NE BOUGE PLUS SON JOUEUR », en
> bas de ce fichier.

Retour de jeu, mot pour mot : **« refait le système de jeu durant les matchs car
actuellement c'est injouable et pas fun, de plus il faut que ça marche sur
téléphone »**.

### ⚠️ CE QUI N'ÉTAIT PAS EN CAUSE : LE MOTEUR

Première chose vérifiée, et il faut le dire d'emblée pour que personne n'aille
le « réparer » : `lib/moteur/` va bien. Trente pions, sept ticks par seconde,
étalonnage tenu (`verifMoteur.ts` inchangé, `verifControle.ts` inchangé). Le
problème était **entièrement entre le moteur et le pouce**. Quatre défauts, et
chacun suffisait à lui seul à rendre le match injouable.

#### 1. Il n'y avait AUCUNE CAMÉRA

L'écran affichait les 122 × 70 mètres du terrain d'un seul tenant, en gardant
les proportions réelles. Sur un téléphone de 375 px, un joueur mesure alors
**3 pixels**. On ne distingue pas son propre pion, on ne voit pas qui vient
plaquer, on ne sait pas à qui l'on passe. **Aucun réglage de bouton ne rattrape
ça** — c'est pour cela qu'il fallait commencer par là.

→ **`src/lib/moteur/camera.ts`** (nouveau). Trois décisions y sont écrites en
tête de fichier, et elles expliquent tout le reste :

- **Le cadrage se mesure en MÈTRES DE TERRAIN, pas en zoom.** « proche » ne veut
  pas dire « ×2,7 », ça veut dire « 46 mètres de longueur à l'écran ». C'est la
  seule définition qui donne la même lisibilité sur 375 px et sur 1 440 : le
  pion fait toujours la même fraction de l'écran, donc toujours la même taille
  au doigt. Les trois cadrages : `large` (122 m, spectateur), `suivi` (78 m),
  `proche` (46 m).
- **En portrait, le terrain PIVOTE D'UN QUART DE TOUR.** Un terrain fait 1,74
  fois plus long que large ; un téléphone tenu droit fait 2,2 fois plus haut que
  large. Poser l'un dans l'autre sans pivoter, c'est jeter les trois quarts de
  l'écran. On joue donc vers le haut. Le pivot est une **rotation propre** (0°,
  180°, ±90° — jamais un miroir) : seuls les numéros de maillot reçoivent la
  rotation inverse pour rester lisibles.
- **On attaque TOUJOURS dans le même sens.** Le moteur fait attaquer A vers les
  X croissants et B vers les décroissants ; l'écran tourne le monde de 180°
  quand on joue pour B. Le joueur pousse toujours son stick vers l'en-but
  adverse, match après match, sans jamais se demander de quel côté il joue.
  C'est ce qui rend le pilotage réflexe plutôt que réfléchi.

⚠️ **LA MÊME MATRICE DESSINE ET LIT LE JOYSTICK.** `Vue` expose `transform`,
`redresser`, `versEcran`, `versMonde` et `directionMonde` : le rendu utilise les
premiers, la commande le dernier. Deux implémentations, et le premier signe de
travers envoie le joueur dans son propre en-but sans que rien ne le montre à la
relecture. `verifMatchJouable.ts` teste les quatre orientations.

⚠️ **LA CAMÉRA COUPE AU LIEU DE VOYAGER** au-delà de 34 m de saut (dégagement,
mêlée à l'autre bout, reprise après essai). Une caméra qui traverse le terrain
en glissant fait perdre deux secondes de jeu à chaque coup de pied — et on rate
justement l'action qu'on suivait. Le rattrapage est exponentiel exact
(`1 − e^(−dt/τ)`, τ = 0,28 s) : un `lerp(a, b, 0.1)` par image aurait suivi deux
fois plus vite à 120 Hz qu'à 60.

#### 2. ⚠️ LE JEU TOURNAIT À CINQ FOIS LA VITESSE RÉELLE PENDANT QU'ON PILOTAIT

C'est le défaut le plus grave, et il était **invisible dans le code** : la
vitesse affichée « ×1 » valait `facteur: 5`. Une seconde de poignet pour cinq
secondes de rugby. Un plaquage à contrer durait **deux dixièmes de seconde** à
l'écran. Ce n'était pas exigeant, c'était impossible — on cliquait après coup,
toujours. **Le libellé mentait, et c'est ce mensonge qui faisait croire que le
pilotage était cassé alors qu'il était seulement cinq fois trop rapide.**

Mais on ne peut pas jouer 80 minutes en temps réel non plus : un match contient
~35 minutes de ballon vivant, et passer trente-cinq minutes à trottiner pour
vivre quatre minutes de rugby, c'est le second visage du « pas fun ».

→ **`src/lib/moteur/moments.ts`** (nouveau). **Le match défile, et il s'arrête
sur toi.** Le jeu file à ×9 tant qu'il ne se passe rien pour ton joueur, et
retombe en **TEMPS RÉEL** dès qu'un ballon arrive sur toi, qu'un porteur te fonce
dessus ou qu'un regroupement se forme à ta portée. C'est le mode « carrière
joueur » des jeux de sport : on ne vit que ses propres moments, mais on les vit
vraiment, à la bonne vitesse, avec le temps de décider.

Les quatre tempos disent désormais ce qu'ils **font**, pas un facteur qui mentait :

| Tempo | Sur ton moment | Le reste du temps |
| --- | --- | --- |
| ⏸️ Décisions (défaut en pilotage) | jeu FIGÉ, dix secondes pour choisir | ×16 |
| 🎯 Moments | ×1 — temps réel | ×13 |
| 👁️ Suivre (défaut en spectateur) | ×7 | ×7 |
| ⏩ Accéléré | ×26 | ×26 |
| ⏭️ Fin | ×600 | ×600 |

⚠️ **LE RALENTI TIENT 1,2 s APRÈS LA FIN DU MOMENT** (`TENUE`). Une passe reçue
et donnée en une seconde ferait clignoter la vitesse trois fois par phase, et le
joueur n'aurait jamais le temps de voir le résultat de son geste.

⚠️ **MAIS LA BANNIÈRE, ELLE, SUIT LE MOMENT VRAI.** Deux champs dans la ref, pas
un : `actuel` pour ce qu'on affiche, `tenue` pour le ralenti. Vu en jeu avec un
seul champ : on lisait encore « le ballon est à toi » deux secondes après l'avoir
donné.

##### ⚠️ ET LE RÉGLAGE A DÛ ÊTRE REPRIS DEUX FOIS — MESURÉ

Le premier jet déclenchait un moment dès que le porteur adverse était à 21 m.
`verifMatchJouable.ts` a relevé **47 % du match joué au ralenti**, soit **20
minutes** de manette pour un match. Un ralenti permanent n'est pas du ralenti,
c'est un jeu lent — et l'accélération entre les moments ne servait plus à rien.
Trois corrections, dans l'ordre où elles ont été mesurées :

1. Les portées ont été resserrées (défense 21 → **14 m**, ruck 13 → **9 m**,
   ballon libre 16 → **12 m**) et « je suis le prochain de la combinaison » ne
   regarde plus que **le prochain**, pas les deux suivants. → 37 %.
2. **Le porteur doit VENIR VERS TOI** (produit scalaire de sa vitesse avec le
   vecteur qui va vers toi). Sans ça, le jeu ralentissait pendant que le ballon
   s'éloignait à l'autre bout de la ligne.
3. ⚠️ **ET IL FAUT ÊTRE LE MIEUX PLACÉ DE SON CAMP** (`leMieuxPlace`). C'est la
   condition qui dit « c'est pour toi » : « à quatorze mètres du ballon » décrit
   la moitié d'une ligne défensive, alors qu'un plaquage, un grattage ou un
   ballon qui traîne, c'est **le plus proche** qui y va. → **24 %**, et 11,4
   minutes de manette.

#### 3. Les commandes vivaient SOUS le terrain, dans une barre qui défilait

Jusqu'à cinq vignettes de 58 px dans un conteneur à **défilement horizontal**,
deux cents pixels sous l'action. Il fallait quitter le jeu des yeux, chercher le
bon bouton, et le faire défiler.

→ **Le HUD est POSÉ SUR LE TERRAIN.**

- **Joystick flottant sous le pouce gauche.** Le premier contact devient le
  centre, la direction est le vecteur jusqu'au doigt. ⚠️ **Il ne part que de la
  moitié gauche** : laisser le joystick naître n'importe où mettait les deux
  pouces en concurrence — on visait le gros bouton, on ratait de dix pixels, et
  le pion partait en courant. Au repos il reste visible en bas à gauche (un
  joystick invisible est un joystick qu'on ne trouve pas), et il disparaît sur
  un écran à souris (`@media (hover: hover) and (pointer: fine)`).
- ⚠️ **LE SPRINT EST DANS LE STICK**, pas sur un bouton : pousser à 86 % de la
  déflexion sprinte. Sur téléphone on n'a que deux pouces ; un troisième bouton
  demanderait un doigt qu'on n'a pas, et ne serait jamais pressé.
- **Un disque de 88 px sous le pouce droit** : l'action évidente de la situation
  (`actionPrincipale`), écrite en clair — et quand c'est une passe, **avec le
  numéro du receveur**. Trois boutons secondaires en arc pour qui veut choisir.
- ⚠️ **LA DISCIPLINE EST DERRIÈRE SON PROPRE BOUTON 💢.** Un « frapper » touché
  à la place d'un « passer », c'est une demi-saison de suspension. La jauge de
  tension est dessus : un risque qu'on ne voit pas n'est pas un choix.
- **Sur le terrain** : chevron + aura sur son pion (« où est mon joueur »),
  cercle pointillé sur le receveur de la passe, réticule rouge sur le porteur à
  plaquer, flèche de bord quand le ballon sort du cadre. Une décision qu'on ne
  voit pas n'est pas une décision.

#### 4. Le reste mangeait l'écran

Notice dépliante, champ de consigne, fil de commentaire et six boutons de
vitesse : sur 375 px, le terrain finissait en bandeau de 200 px sous une pile de
panneaux.

→ Tout ce qui **ne sert pas à jouer** part dans un tiroir (📜 fil · 📣 consigne ·
🕹️ commandes), ouvert par `⋯` ou en touchant le bandeau de commentaire. Le fil
est réduit à sa **dernière ligne** en haut du terrain. Sur écran large
(≥ 980 px), il revient en colonne de droite — parce que là, il y a la place.

### La structure de l'écran

```
MatchLive.tsx              l'orchestrateur : moteur, boucle, caméra, HUD, tiroir
components/match/Pelouse.tsx      le terrain, dessiné UNE fois en mètres (memo)
components/match/FeuilleMatch.tsx la feuille des 23 compteurs, à la sirène
lib/moteur/camera.ts       cadrage, pivot, et les deux conversions écran ↔ terrain
lib/moteur/moments.ts      « c'est à toi » + les quatre tempos
```

⚠️ **`Pelouse` NE SAIT RIEN DU CADRAGE.** Elle pose un terrain de 122 × 70 à
l'origine, et c'est la caméra qui le place. C'est ce qui permet de la `memo`-ïser
une fois pour toutes alors que la vue bouge à chaque image.

⚠️ **LA TAILLE DE LA SCÈNE EST LUE PAR `ResizeObserver`, pas par
`getBoundingClientRect()` à chaque image.** Lire la géométrie soixante fois par
seconde force un recalcul de mise en page à chaque fois — c'est exactement ce qui
fait tomber un téléphone de 60 à 40 images par seconde.

⚠️ **`.match-live` A UNE HAUTEUR DÉTERMINÉE (`height`), PAS SEULEMENT UN
PLAFOND.** La scène est en `flex: 1` : sans hauteur fixée sur le conteneur, elle
se réduit à la hauteur de son contenu — c'est-à-dire zéro — et le terrain
disparaît. Vu en développement : le SVG passait en flux normal, prenait sa taille
du rapport du `viewBox`, faisait grandir la scène, ce qui changeait le rapport,
qui rallongeait le SVG… jusqu'à **5 500 px de haut**.

### Ce qui n'a PAS bougé

- **Le score reste celui de la ligue** — `verifControle.ts` : 0 écart sur 12
  matchs pilotés. Le joueur change COMMENT on marque, jamais COMBIEN.
- **Le déterminisme du moteur** : la caméra et les moments sont des **lectures
  pures** de l'état. Changer la vitesse d'affichage ne change pas le match,
  seulement le nombre de secondes réelles qu'il met à se jouer.
- **Les vingt-cinq actions, la tension, les bagarres et la commission de
  discipline** : intactes (`moteur/controle.ts`, `moteur/bagarre.ts`).
- **La feuille de match et le barème de la note** : le même code, déplacé dans
  son propre fichier.

### Ce que le store gagne

`tutoMatchVu` — la notice de la manette s'affiche **une fois** et se referme au
premier geste. ⚠️ Elle est séparée de `tutoVu` : celui-ci explique le JEU (« tu
es un joueur, pas un manager »), celle-là explique les COMMANDES. Quelqu'un qui a
passé l'accueil il y a trois saisons découvre quand même la manette à son premier
match piloté.

```bash
npx vite-node scripts/verifMatchJouable.ts # caméra, sens du stick, rythme des moments, durée réelle
npx vite-node scripts/verifControle.ts     # inchangé : actions, discipline, score de la ligue
npx vite-node scripts/verifMoteur.ts       # inchangé : l'étalonnage du moteur
npx vite-node scripts/verifTraductions.ts  # les 30 clés ajoutées, dans les 7 langues
```

---

## 🏆 LES FICHES DU CLASSEMENT MONDIAL — la base était le seul chaînon manquant

Demande : « fait moi un tuto pour modifier les db actuelles afin d'afficher les
armoires à trophées des joueurs dans le classement, leurs stats, clubs joués et
saisons ».

### ⚠️ PREMIER CONSTAT : IL N'Y AVAIT RIEN À PROGRAMMER

Toute la chaîne existait déjà et était déployée — `FicheCarriere` porte
`titres`, `clubs`, `saisons`, `matchs`, `essais`, `selections`, `note`,
`reputation` ; `api/classement.ts` les écrit et les relit ; `PanneauFiche`
(écran Classement) affiche l'armoire, le parcours en clubs avec écussons et les
pastilles de stats. **Seule la base en ligne était restée en v1** (`pseudo` +
`score`). Le serveur détecte le cas (code Postgres `42703`), retombe sur « score
seul » et continue de répondre : rien n'a l'air cassé, et rien ne s'affiche.

→ **`serveur/MIGRATION-FICHES.md`** (nouveau) : diagnostic, l'`ALTER TABLE`,
vérification, état de la voie Supabase, et la liste des **6 endroits à toucher**
pour ajouter un champ plus tard.

### ⚠️ ET UN PIÈGE RÉEL, TROUVÉ EN ÉCRIVANT LE TUTO

L'`ON CONFLICT` de `api/classement.ts` était gardé par
`where excluded.score > classement.score` — le score devait **progresser**.
Conséquence sur une base migrée : une ligne v1 (score seul, fiche vide)
appartenant à un joueur **déjà à son meilleur score** renvoyait exactement le
même score, la condition était fausse, et **sa fiche ne se remplissait jamais**.
Un joueur à la retraite n'aurait jamais eu d'armoire — c'est-à-dire précisément
ce que la demande veut afficher.

Passé à **`>=`** : à score égal la carrière est la même, donc la fiche est bonne
à prendre. `score = greatest(classement.score, excluded.score)` garantit qu'aucun
score ne peut reculer au passage.

### Deux documents qui mentaient

- `serveur/VERCEL.md` affichait encore « **La base ne contient que le score** »
  et un schéma avec « 4. la fiche est jetée ». Faux depuis la v2 du schéma.
- `serveur/schema.sql` (Supabase) est **resté en v1**, et ne le disait pas. Il
  est maintenant annoté : la voie Vercel a migré, celle-ci non, et c'est
  volontaire — maintenir deux serveurs pour un seul site déployé, c'est se
  garantir deux comportements différents un jour.

### Ce qui ne change pas

La sécurité ne tient pas à ce qu'on stocke, mais au fait que le serveur
**RECALCULE** le score (`scoreDeLaFiche`) au lieu de croire celui qu'on lui
envoie, et que `verifierFiche()` borne chaque champ avant l'écriture. On stocke
exactement ce qui servait déjà au recalcul, plus la liste des clubs — qui,
elle, n'entre PAS dans le barème : un classement ne se réordonne pas parce qu'on
affiche un écusson de plus.

```bash
npx vite-node scripts/verifClassement.ts   # joue le tricheur : chaque attaque doit être refusée
```

---

## 🎮 LES COMMANDES REFAITES, ET LE MATCH QUI S'ÉCHAUFFE TOUT SEUL

Retour de jeu, en un bloc : « quand on regarde les joueurs on n'a pas les
numéros, on les a seulement quand on joue » · « sur PC ou manette les touches
pour plaquer etc. ne sont pas bonnes, il faudrait A ou E pour la passe droite ou
gauche, clic droit ou gauche pour plaquer / tirer au pied, Maj pour sprinter avec
une barre d'endurance, raffut et crochet qui marchent vraiment, et qu'on puisse
modifier ces touches dans les paramètres » · « refais les bagarres pour que
l'équipe d'en face puisse la lancer, et que ça vienne plutôt d'actions illégales
type plaquage haut, chambrage, mais qui s'activent toutes seules ; en mode
chambrage, petites bulles avec les joueurs qui disent quelque chose ».

### ⚠️ 1. LES NUMÉROS AVAIENT ÉTÉ MASQUÉS — c'était une erreur du lot précédent

En réduisant la taille des pions, le numéro avait été masqué sous 7 px « parce
qu'il salissait le pion ». Conséquence immédiate en vue large : un match qu'on
regarde devient un nuage de points — on ne suit personne, on ne reconnaît pas son
club, on ne sait pas qui vient de marquer.

Le texte a donc son **propre plancher en pixels** (`7,6 / pxParMetre`),
indépendant du disque : il déborde très légèrement en vue large, et le liseré
noir (`paintOrder: stroke`, épaissi à 0,26) le garde lisible sur n'importe quel
maillot. **Trente numéros affichés en permanence, à tous les cadrages.**

Le contour des pions a un plancher lui aussi (**1,5 px**) : sans numéro, à 0,8 px,
le liseré clair (camp A) ou sombre (camp B) était le seul moyen de séparer deux
équipes aux couleurs voisines — et il ne se voyait plus.

### ⚠️ 2. LES TOUCHES — `moteur/manette.ts` réécrit autour d'une table réglable

| | avant | maintenant |
|---|---|---|
| passe | **un** bouton, le moteur choisit le receveur | **A** et **E** — passe gauche / passe droite |
| plaquer | `J` | **clic gauche** |
| taper au pied | `I` | **clic droit** |
| sprint | `Maj` (aucun retour visuel) | `Maj` + **barre de souffle** |
| réassignable | non | **oui**, ⚙️ Réglages, 20 commandes |

- **`Commande`** (haut/bas/gauche/droite + sprint + principale + les 15 actions)
  et **`LIAISONS_DEFAUT`** remplacent l'ancienne table `TOUCHES` figée.
  `Assignation = { code, libelle }` : le **code physique** sert à jouer, le
  **libellé** à afficher. ⚠️ Les deux sont stockés ensemble parce que `KeyQ`
  s'écrit « A » en AZERTY et « Q » en QWERTY, et **seul le navigateur du joueur
  sait laquelle** — on lit donc `ev.key` à la capture.
- ⚠️ **« A ET E » MARCHE DANS LES DEUX MONDES**, et ce n'est pas un hasard : les
  deux touches qui encadrent « avancer » portent les codes `KeyQ` et `KeyE`,
  soit **A / E** en AZERTY et **Q / E** en QWERTY. Dans les deux cas, les
  voisines immédiates du pouce gauche.
- ⚠️ **LES FLÈCHES NE SONT PAS RÉGLABLES ET MARCHENT TOUJOURS.** C'est le filet
  de sécurité : quelqu'un qui réassigne ses quatre directions sur des touches
  introuvables doit pouvoir bouger sans aller rouvrir les réglages avec un pion
  planté au milieu du pré.
- ⚠️ **UNE TOUCHE NE SERT QU'UNE FOIS.** Le store libère l'ancienne liaison avant
  de poser la nouvelle (`setToucheMatch`) — sans ça, un même clic déclenchait
  deux actions et l'une des deux gagnait au hasard de l'ordre de la table.
  Vérifié en jeu : assigner `R` au crochet vide la ligne du raffut (« — »).
- ⚠️ **LA SOURIS NE FAIT JAMAIS RIEN DU TOUT.** On ne plaque pas quand on porte
  le ballon, et un clic sans effet passe pour un bug : si le geste assigné n'est
  pas jouable, `MatchLive` joue l'**action contextuelle** à la place.
- ⚠️ **UN BOUTON DE SOURIS ASSIGNÉ NE POSE PAS LE JOYSTICK** (`pointerType ===
  'mouse'`). Sans ce partage, un clic droit pour taper démarrait aussi une
  course : le pion partait vers le curseur pendant que le ballon s'envolait. Le
  doigt garde le joystick, la souris garde ses boutons. Et `onContextMenu` est
  neutralisé, sinon le menu du navigateur s'ouvre par-dessus le match.
- **`components/ReglageTouches.tsx`** : 20 lignes, capture au clavier **ou à la
  souris**, Échap annule, Suppr remet par défaut, et un bouton « tout remettre ».
  ⚠️ **Seules les DIFFÉRENCES sont persistées** (`touchesMatch: Liaisons`) :
  figer les vingt liaisons dans chaque sauvegarde interdirait à jamais de
  corriger un défaut par défaut — ce qui est précisément ce qu'on vient de faire.
- ⚠️ **Une réassignation prend effet MATCH OUVERT**, et le lecteur oublie ce qui
  était enfoncé : une direction restée en mémoire sur l'ancienne touche ferait
  courir le pion tout seul, sans plus aucun moyen de l'arrêter.

### 3. La passe a un côté — `receveurCote(e, p, cote)`

⚠️ **LE CÔTÉ EST CELUI DE L'ÉCRAN, DONC RETOURNÉ POUR LE CAMP B.** Le camp A
attaque vers les X croissants : sa gauche d'écran est les Y décroissants ; pour
le camp B, la caméra tourne le monde de 180° (`moteur/camera.ts`) et tout
s'inverse. Un signe de travers, et « passe à gauche » envoie le ballon à droite
un match sur deux. Mesuré : **1 093 receveurs proposés, 1 093 du bon côté et
jamais en avant.**

`passe` (l'action contextuelle du gros bouton) n'a pas disparu : elle donne au
plus évident. Les deux nouvelles la **précisent**.

### 4. Le crochet et le raffut « marchent vraiment » — mesuré

Leur effet EXISTAIT (`resoudrePlaquage` ajoutait `evitement × 0,30` et
`puissance × 0,26` à la résistance du porteur) mais il était **invisible manette
en main** : un crochet faisait passer la chance de franchir de 10 % à 15 %, ce
qui ne se sent pas quand on n'en joue pas cent d'affilée. Et surtout, **personne
ne le surveillait** — aucun banc d'essai ne le mesurait, on pouvait donc le
raboter sans que rien ne le signale.

- Coefficients portés à **0,45** et **0,40**.
- ⚠️ **Fenêtre d'armement allongée de 2,6 à 3,4 s.** C'était l'autre moitié du
  problème : un crochet ne compte que s'il est encore armé **à l'instant du
  contact**. Armé trop tôt, il expirait avant le plaqueur — le joueur voyait son
  geste ne rien faire.
- Mesuré (`verifControle`, section 2) : franchissements **1,1 → 1,8** avec le
  crochet (+64 %), **1,1 → 1,4** avec le raffut. Borné à 12 par match : un ailier
  imprenable, ce n'est plus du rugby.

### 5. Le souffle est une barre, plus un pourcentage

`🫁 62 %` perdu au milieu de trois pastilles ne se lit pas en pleine course.
`.ml-souffle` est une jauge sous le bandeau du fil : verte, **rouge sous 30 %**,
et bordée d'or avec la mention `SPRINT` tant que la gâchette est tenue. Le sprint
se paie toujours autant (`piloterMonJoueur`), on le voit simplement venir.

### ⚠️ 6. LES BAGARRES : la règle n°1 d'origine a été RENVERSÉE, à la demande

La première version posait : « on ne déclenche **jamais** une bagarre au hasard,
elle est toujours la suite d'un geste du joueur ». Conséquence en jeu : **rien
n'arrivait jamais** si l'on ne cliquait pas sur « chambrer », et l'équipe d'en
face était un décor poli.

⚠️ **MAIS LE PRINCIPE DE FOND TIENT TOUJOURS** : on ne PUNIT jamais le joueur
sans cause. Une friction adverse ne lui coûte rien tant qu'il n'y répond pas —
c'est l'adversaire qui prend la pénalité et le carton. Il reste maître de ce qui
lui arrive : reculer, séparer, ou entrer dedans.

| Nouveauté | Ce que c'est |
|---|---|
| `frictions(e, dt)` | Toutes les 9 s simulées, deux adversaires proches **se cherchent**. Fréquence indexée sur la température ET le niveau. |
| `chambrer(e, auteur, cible)` | Deux bulles, de la tension, et parfois la suite. La cible répond selon sa **discipline**. |
| `irregularite(e, plaqueur)` | Un plaquage peut être **haut** (2/3) ou **en retard** (1/3). Probabilité indexée sur la FATIGUE, la tension et la discipline. |
| `apresGesteIllegal(...)` | La victime râle (bulle), la température bondit, et l'équipe lésée peut venir demander des comptes. |
| `e.bulles` / `vieillirBulles` | Les bulles vivent dans l'ÉTAT et vieillissent au rythme du MATCH — en accéléré elles passent vite, comme le reste. |
| `e.compteurs.irregularites` | Le compteur de match, pour que ça se mesure. |

- ⚠️ **UN GESTE ILLÉGAL N'EST PAS UNE ACTION DU JOUEUR**, et c'est la demande
  (« qui s'activent toutes seules »). Un bouton « plaquer haut » ferait de la
  faute un choix tactique ; au rugby, c'est un geste qui **échappe**, sous la
  fatigue et sous la tension. La probabilité suit donc les deux.
- ⚠️ **ÇA VAUT POUR LES TRENTE PIONS**, pas seulement pour le joueur : c'est ce
  qui permet à l'équipe d'en face d'allumer la mèche.
- ⚠️ **UNE FRICTION ENTRE DEUX PNJ NE DÉCLENCHE PAS DE BAGARRE.** Le moteur
  saurait la résoudre, mais l'écran ne sait poser la question qu'à une personne :
  mettre le jeu en pause pour une altercation qu'on ne peut pas arbitrer serait
  une interruption sans choix. Les frictions entre PNJ **chauffent** le match, et
  c'est tout — ce sont elles qui rendent la suivante possible.
- ⚠️ **`CHAMBRAGE` EST COURT ET SANS INSULTE**, et ce n'est pas de la pudeur :
  une bulle tient dans 120 px au-dessus d'un pion de 20 px, elle est lue en une
  seconde et demie, et le jeu est ouvert aux mineurs. Le chambrage de rugby
  marche très bien au premier degré. Dix répliques, **dans les sept langues**.

Mesuré (`verifControle`, sections 8 et 9), **le joueur ne cliquant sur rien** :

| | |
|---|---|
| répliques entendues par match | **24,2** |
| pic de température | 56 / 100 |
| altercations **subies** | 0,58 / match — **7 matchs sur 12** en ont vu une |
| bulles simultanées à l'écran | 2 (plafond 4) |
| gestes illégaux sifflés | **1,25 / match en amateur · 0,58 en pro** |
| écart au score de la ligue | **0 sur 12** |

⚠️ **LE PREMIER COMPTAGE ÉTAIT FAUX, DEUX FOIS**, et c'est instructif :
« plaquage haut » figure **déjà** dans `MOTIFS_PENALITE` comme l'un des sept
habillages tirés au sort pour n'importe quelle pénalité — compter les phrases
donnait 5,75 gestes par match au lieu de 1,25. Et compter les bulles à chaque
passage de boucle (elles vivent 2,8 s, soit sept tours) donnait « 162 répliques
par match » pour une vingtaine de phrases réellement prononcées. **On compte le
compteur du moteur et l'identité des objets, jamais le texte affiché.**

L'étalonnage du moteur, lui, n'a pas bougé : `verifMoteur` → 19,6 pénalités
(cible 14-26), 1,2 carton jaune (cible 0,8-3).

### Ce que le store gagne

`touchesMatch: Liaisons` — les différences avec la table par défaut, persistées.
`setToucheMatch(commande, assignation | null)` et `reinitialiserTouchesMatch()`.

```bash
npx vite-node scripts/verifControle.ts     # + sections 8, 9, 10 : frictions, gestes illégaux, passe directionnelle
npx vite-node scripts/verifMoteur.ts       # l'étalonnage ne bouge pas
npx vite-node scripts/verifMatchJouable.ts # caméra, sens du stick, rythme des moments
npx vite-node scripts/verifTraductions.ts  # les clés ajoutées, dans les 7 langues
```

---

## 🗂️ LA FICHE S'OUVRE SOUS LE JOUEUR, ET L'ARMOIRE NE SE SUPERPOSE PLUS

Deux retours en un : « les fiches joueurs dans le classement, ça serait bien
qu'elles s'affichent sous le joueur quand on clique, et qu'on puisse ouvrir
l'armoire à trophées du joueur » · « bug sur l'armoire, certains trophées se
superposent, ce qui n'est pas bon ».

### 1. La fiche est devenue un tiroir, pas un bas de page

`PanneauFiche` était rendu **après les deux tableaux**, tout en bas de l'écran.
Sur un classement de cent lignes, on touchait un nom et il ne se passait
visiblement rien : il fallait deviner qu'il fallait faire défiler.

⚠️ **ET LA PREMIÈRE VERSION LIVRÉE ÉTAIT « CROPÉE »** — retour de jeu, capture à
l'appui. Ce n'était pas un débordement : la fiche portait la classe `.carte`,
dont le rembourrage est neutralisé à l'intérieur de `.tableau-classement`
(`padding: 0.6rem` sur le conteneur, rien dedans). Mesuré à l'écran :
**`padding: 0px`**. Le titre collait au bord gauche et la dernière ligne au bord
inférieur — ce qui se lit exactement comme une image coupée. Elle ne se déguise
donc plus en carte : c'est un TIROIR, avec son propre rembourrage, son propre
fond et son liseré doré en tête.

⚠️ **LES PASTILLES SONT DEVENUES DES TUILES.** `Note 34`, `Saisons 1`,
`🏉 0 matchs`… mettaient le libellé et la valeur sur la même ligne, à la même
taille : on lisait sept étiquettes grises avant de trouver un chiffre. Une
carrière se juge d'un coup d'œil sur ses nombres, donc le NOMBRE d'abord et son
nom dessous — et le score, seule valeur qui classe, a seul droit à l'or.
Le parcours en clubs et le palmarès passent côte à côte sur grand écran :
en une colonne, la fiche d'un joueur à dix titres faisait défiler tout le
classement et on perdait la ligne qu'on venait d'ouvrir.

Mesuré après correction : padding réel de 17,6 × 19,2 px, six tuiles sur une
rangée à 1280 px, **trois sur 375 px**, croix de fermeture à 40 px, et aucun
débordement horizontal.


- L'état ne retient plus la fiche mais **la clé de la ligne** (`ligneOuverte`),
  préfixée par son tableau (`m:` mondial, `h:` Hall) — les deux tableaux
  partagent l'état, donc les clés ne doivent pas pouvoir se confondre.
- Chaque ligne est enveloppée dans un `<Fragment>` avec sa fiche : le tableau
  est une pile de blocs, pas un vrai `<table>`, donc l'insertion est directe.
- Retoucher la même ligne **referme** (`basculer`), et `aria-expanded` suit.
- La ligne dépliée garde un fond doré, et la bordure haute de la fiche la
  rattache à elle : sans ce repère, une fiche longue fait perdre de vue à qui
  elle appartient.

### 2. On ouvre l'armoire 3D de N'IMPORTE QUEL joueur

Le bouton **« 🗄️ Ouvrir son armoire en 3D »** monte le **même** composant que
depuis le Hall (`ArmoireTrophees`) — le palmarès d'un inconnu se regarde
exactement comme le sien.

- ⚠️ **`FicheAffichable` porte désormais `palmares: TitreGagne[]`, en plus de
  `titres`.** Ce n'est pas une redondance : l'armoire a besoin d'**IDS** de
  trophées (pour retrouver le `.glb` et la traduction), alors que `titres` peut
  contenir des **LIBELLÉS** quand la fiche vient du Hall. Convertir dans le
  composant d'affichage aurait dispersé la conversion à deux endroits.
- Côté Hall : `tropheeIds` d'abord, `palmaresDepuisLibelles` en repli — c'est le
  seul chemin qui rende son armoire à une légende d'avant ce champ.
- Côté mondial : la base ne stocke que les ids, **sans saison ni club**.
  L'armoire n'écrit donc plus « Saisons 0 » : la ligne disparaît quand l'année
  est inconnue.
- ⚠️ **Chargée en `lazy()`** : elle embarque three.js, ses modèles et le
  décodeur Draco. La mettre dans le chunk du classement ferait payer plusieurs
  centaines de kilo-octets à quelqu'un venu voir un tableau de scores.

### ⚠️ 3. LE BUG DE SUPERPOSITION — et pourquoi le banc d'essai ne le voyait pas

`verifArmoire.ts` affichait **« sol : emprises qui se recouvrent — aucune »**
pendant que l'écran montrait le contraire. C'est le pire cas possible pour un
banc d'essai, et il avait **trois** causes qui se cumulaient :

1. **L'ÉCHELLE NE REGARDAIT QUE LA HAUTEUR** (`buste / taille.y`). Un bouclier
   est large et plat : mis à hauteur de buste, il fait presque deux fois la
   largeur d'une case. La grille espaçait les **centres**, pas les pièces.
2. **LA SECOUSSE ÉTAIT UNE PART DE LA CASE**, pas du jeu réellement disponible :
   deux voisines déjà serrées se rapprochaient encore de 68 % d'une case.
3. **LA ROTATION SUR Y N'ÉTAIT COMPTÉE NULLE PART.** Une pièce pivotée de 30°
   occupe au sol `l·cos θ + p·sin θ` — jusqu'à moitié plus large. Le test
   mesurait `taille.x × taille.z`, c'est-à-dire la boîte **non tournée**.

Mesuré avec des boucliers de proportions réalistes (1,9 × 2,4 × 0,6) : **3
chevauchements sans compter la rotation, 6 en la comptant.**

**La grille a été remplacée par une mise en rangées qui part des pièces**, comme
la vitrine range ses tablettes : chacune reçoit sa stature, on calcule son
emprise au sol **une fois pivotée**, puis on remplit des rangées tant que la
largeur de zone tient. L'écart entre deux pièces est posé **en mètres**
(`ECART_SOL`), et la secousse est bornée par lui — à 0,34, deux voisines
secouées l'une vers l'autre gardent toujours un tiers de l'écart.

⚠️ **`ZONE_PROFONDEUR` A DISPARU**, et c'est la moitié du correctif. Elle
imposait une profondeur **fixe** découpée en autant de rangs qu'il fallait : les
cases rétrécissaient à mesure que le palmarès grandissait, pendant que les
pièces gardaient leur stature. La profondeur de la scène se déduit désormais des
pièces elles-mêmes.

Et **le test compte maintenant l'emprise pivotée** : sans cette correction-là, on
aurait corrigé à l'aveugle.

| | avant | après |
|---|---|---|
| chevauchements (boucliers réalistes) | **6** | **0** |
| largeur de la scène | 6,83 | **6,08** |
| le meuble occupe (téléphone 299 × 294) | 44 % | **51 %** |
| le meuble occupe (ordinateur 714 × 344) | 64 % | **67 %** |

Resserrer la scène était un effet de bord attendu : des pièces qui ne se
chevauchent plus tiennent moins de place qu'un empilement qui débordait.

```bash
npx vite-node scripts/verifArmoire.ts   # emprises PIVOTÉES, cadrage, cas limites
npx vite-node scripts/verifEcrans.ts    # robustesse du Hall et du Classement
```

---

## 📄 DES PAGES DE CONTENU — la réponse au blocage AdSense

AdSense a bloqué le compte : « Annonces Google diffusées sur des pages ou écrans
sans contenu d'éditeur ». Le diagnostic tenait en trois points, tous exacts.

### ⚠️ CE N'ÉTAIT PAS UN PROBLÈME DE RÉGLAGE, MAIS DE NATURE

1. **LE JEU N'A QU'UNE SEULE URL.** `setEcran` change un champ du store,
   l'adresse ne bouge jamais. Pour un moteur de recherche comme pour un
   examinateur, tout le site EST la page d'accueil.
2. **CETTE PAGE EST VIDE AU CHARGEMENT.** Tout est rendu par React ; un robot
   qui n'exécute pas le JS ne trouvait que le `<noscript>`, soit quatre phrases
   — la définition même du « contenu à faible valeur informative ».
3. **LES QUATRE ÉCRANS QUI PORTAIENT LES ANNONCES** (Boutique, Hall, Classement,
   Clubs) sont une boutique, deux tableaux de scores et un annuaire d'écussons.
   Le règlement nomme ce cas : « écrans qui servent aux alertes, à la NAVIGATION
   ou à d'autres fins comportementales ». Une annonce à côté d'un classement
   vide (« personne n'y figure encore ») est le cas d'école.

### ⚠️ UN ROUTEUR N'AURAIT RIEN RÉGLÉ

C'était le premier réflexe, et il était faux. Un routeur côté navigateur crée
des adresses, mais le serveur continue de renvoyer la même coquille vide : le
robot qui ne rend pas le JavaScript voit exactement ce qu'il voyait avant.

**Les pages sont donc du HTML COMPLET, généré à la construction**, avec leur
texte dans la source. Ni React, ni JavaScript, ni CSS externe nécessaires pour
les lire.

| Fichier | Rôle |
|---|---|
| `scripts/contenuPages.cjs` | **Le texte, et rien d'autre.** Séparé du rendu pour qu'on puisse corriger une phrase sans toucher au HTML. |
| `scripts/genPages.cjs` | Le rendu : HTML, métadonnées, JSON-LD, sommaire automatique, et **régénération du sitemap**. |
| `public/contenu.css` | Feuille autonome. ⚠️ Elle ne partage RIEN avec `src/App.css`, qui n'existe qu'une fois compilé par Vite. |
| `public/<slug>/index.html` | ⚠️ **GÉNÉRÉ.** Quatre pages : `/guide/`, `/pyramide/`, `/moteur/`, `/journal/`. |

```bash
node scripts/genPages.cjs                    # sans annonces
PUB_SLOT=1234567890 node scripts/genPages.cjs   # avec
```

⚠️ **SANS `PUB_SLOT`, AUCUN CODE PUBLICITAIRE N'EST GÉNÉRÉ** — pas même le script
AdSense. Un slot se crée bloc par bloc dans la console : tant qu'il n'existe pas,
une balise vide ne ferait qu'ajouter du bruit à une page qui n'a rien à afficher.

⚠️ **LE CONTENU DOIT RESTER VRAI.** Du remplissage tombe sous exactement la même
règle que le vide. Chaque chiffre cité (655 clubs, 44 semaines, 0,15 s de pas de
simulation, 248 plaquages par match…) sort du code ou d'un script `verif*.ts` —
s'il change dans le jeu, il faut le changer là aussi.

### Ce qui a bougé dans le jeu

- **`<Pub />` et `<BandeauConsentementPub />` ont disparu de `App.tsx`.** Le jeu
  ne porte plus une seule annonce, et c'est très bien : une bannière au milieu
  d'une décision de carrière est une pub qui nuit au jeu.
- **`sw.js` a été supprimé.** C'était un service worker Monetag qui chargeait du
  code distant depuis `3nbf4.com` à la racine du domaine — une porte ouverte aux
  notifications publicitaires, en contradiction frontale avec les règles écrites
  dans `lib/pub.ts` (« jamais de pop-up », « rien sans consentement ») et un
  risque supplémentaire pour l'examen AdSense.
- **L'accueil renvoie vers les quatre pages** par de VRAIS `<a href>`. Un
  `onClick` ne crée aucun lien pour un moteur de recherche.
- **Le `<noscript>` porte les mêmes liens** : c'est le seul chemin d'un robot
  sans JavaScript vers le contenu.

⚠️ **`/guide/` NE MARCHE PAS EN `npm run dev`** — le repli SPA de Vite intercepte
l'adresse. Il faut `/guide/index.html` en développement. **En production c'est
correct** : vérifié sur `npm run build` + `vite preview`, `dist/guide/index.html`
est bien servi à `/guide/`.

---

## 💳 VENDRE DES OVAS — voir `serveur/PAIEMENTS.md`

Guide complet Stripe : compte, produits, `api/paiement.ts`, webhook signé, table
idempotente, coûts réels et obligations (TVA, CGV, rétractation, mineurs).

⚠️ **DEUX POINTS À NE PAS CONTOURNER**, écrits en tête du guide :

1. **Le navigateur ne crédite jamais les Ovas.** Le crédit vient d'un webhook
   Stripe signé. Même raisonnement que le classement mondial : le serveur ne
   croit pas le client.
2. **Le jeu n'a aucun compte utilisateur** — la sauvegarde vit dans le
   `localStorage`. Sans identité, un achat ne peut être rattaché à personne :
   cache vidé, Ovas payés perdus, remboursement. **Il faut une identité avant de
   vendre** (lien magique par e-mail, ~1 jour).

---

## 🧬 LES TRAITS DE CARACTÈRE — deux effets sur onze étaient morts

Question posée : « les caractères, ils ont un impact ou quoi ? » Vérification
faite effet par effet, en comptant les lectures hors de `data/traits.ts` :

| Effet | Lu par |
|---|---|
| `progression` | `lib/progression.ts` |
| `risqueBlessure`, `graviteBlessure` | `useGame` (tirage de blessure de match) |
| `noteMatch`, `noteGrosMatch` | `useGame` (note de match) |
| `cartons` | `useGame` et `lib/social.ts` (dérapage public) |
| `offres` | `lib/offres.ts` |
| `leadership`, `vestiaire` | `lib/vestiaire.ts` |
| ~~`formeParSemaine`~~ | **PERSONNE** |
| ~~`moralParSemaine`~~ | **PERSONNE** |

⚠️ **Ils étaient cumulés par `effetsTraits()` et lus nulle part.** Six traits sur
douze annonçaient donc un effet inexistant : « Professionnel » promettait de
mieux récupérer sans rien récupérer, « Fêtard » promettait de le payer
physiquement sans rien payer, « Leader naturel », « Ambitieux », « Fidèle au
maillot » et « Bourreau de travail » de même sur le moral ou la forme.

Corrigé : `recuperationHebdo()` ajoute `formeParSemaine`, et la semaine applique
`moralParSemaine` au même endroit que la récupération physique.

⚠️ **L'effet sur l'étalonnage n'a pas pu être mesuré** : `verifDifficulte.ts` est
cassé depuis la suppression du mode « saison rapide » (voir plus haut, « LES
SCRIPTS DE MESURE NE MESURENT PLUS RIEN »). L'amplitude est bornée — ±2 de forme
par semaine pour deux traits sur douze — mais la forme pèse sur la note de match,
donc sur la progression. **À revérifier dès que le script de mesure est réparé.**

### Douze archétypes à débloquer — et pourquoi ce n’est pas du pay-to-win

Demande explicite : « corrige les caractères et traits, fais qu’il y ait plein
de nouveaux caractères qu’on peut acheter en Ovas ». `data/traits.ts` passe de
**12 à 24 traits**, dont douze portent un champ `prix`.

⚠️ **LA BOUTIQUE VEND DU CHOIX, PAS DE LA PUISSANCE**, et ce n’est pas une
formule : c’est mesurable, et c’est mesuré. Trois verrous, tous dans
`scripts/verifTraits.ts`, qui **échoue** si l’un saute :

1. **`MAX_TRAITS` reste à DEUX.** Quelqu’un qui a tout débloqué n’en porte pas
   un de plus que quelqu’un qui n’a rien acheté. Ce qu’on achète, ce sont des
   façons de jouer supplémentaires — pas des bonus cumulables.
2. **Aucun payant ne pèse plus lourd que le meilleur gratuit** (`poidsTrait`,
   la somme signée des effets ramenés à une échelle commune). Mesuré :
   max payant **8,4** contre **9,6** pour le meilleur gratuit.
3. **Et la meilleure PAIRE non plus.** C’est le test qui compte vraiment : deux
   traits raisonnables séparément peuvent se cumuler en une combinaison qui ne
   l’est pas. Mesuré : meilleure paire gratuite 17,3 · meilleure paire possible
   18,0, avec une tolérance de 15 % (19,9).

⚠️ **CHAQUE ARCHÉTYPE EST UN PARI, PAS UNE AMÉLIORATION.** Ils poussent un
curseur beaucoup plus loin que les douze de base — **dans les deux sens**. Le
« Roc » (risque de blessure ÷ 2) ne progresse quasiment plus ; le « Précoce »
apprend 35 % plus vite et récupère mal ; la « Tête brûlée » est injouable en
finale et prend **2,8 fois** plus de cartons ; le « Cadre du vestiaire » tient le
groupe mais n’intéresse plus le marché.

⚠️ **LE PRIX SUIT L’ÉCONOMIE MESURÉE, PAS L’ENVIE.** Une belle carrière rapporte
**549 Ovas** (`verifEconomie.ts`) : à **90-190 Ovas** pièce, on en débloque trois
ou quatre par carrière, et il en reste toujours à découvrir. Total des douze :
**1 700 Ovas**. `verifEconomie.ts` les compte désormais dans le catalogue — les
oublier revenait à annoncer « tout acheter : 10,7 carrières » en ignorant un
tiers de la dépense possible ; c’est **13,8 carrières**.

| Où | Ce qui a changé |
|---|---|
| `data/traits.ts` | `Trait.prix?`, 12 archétypes, `TRAITS_DE_BASE`, `TRAITS_A_DEBLOQUER`, `traitDisponible()`, `poidsTrait()` |
| `store/useGame.ts` | `traitsDebloques: string[]` (persisté) et `debloquerTrait(id)` |
| `screens/Boutique.tsx` | la section **« Les caractères »**, entre le vestiaire et les Ovas |
| `screens/Creation.tsx` | les archétypes fermés restent **visibles, grisés, avec leur prix** |
| `data/textesSupplementaires.ts` | 24 clés `trait.<id>.nom/.desc` + `trait.leader.desc` réécrite, dans les 7 langues |
| `scripts/verifTraits.ts` | le banc d’essai (5 sections) |

⚠️ **`traitsDebloques` VIT HORS DE LA FICHE DU JOUEUR.** Un archétype débloqué
appartient au COMPTE, pas à la carrière : on ne rachète pas ses caractères à
chaque fois qu’on raccroche. Migration idempotente (`s.traitsDebloques ??= []`),
pas de bump de version.

⚠️ **UN ARCHÉTYPE FERMÉ RESTE AFFICHÉ À LA CRÉATION**, grisé, liseré pointillé,
avec son prix en clair. Le masquer reviendrait à cacher la moitié du système à
qui n’a rien acheté : on ne peut pas vouloir un trait dont on ignore
l’existence. Et il **ne prend pas l’opacité 0,4** des autres boutons désactivés
(0,72) — à 40 %, le prix devient illisible, c’est-à-dire exactement
l’information qu’on voulait faire passer.

⚠️ **Bug attrapé en écrivant l’écran** : le paramètre de la boucle des traits
s’appelait `t` dans `Creation.tsx` — il **masquait la fonction de traduction**,
et l’étiquette de prix n’aurait pas pu être traduite. Renommé `tr`.

⚠️ **`leader` n’avait AUCUNE contrepartie** — repéré par le nouveau banc d’essai,
qui refuse un trait sans coût. Il gagne `progression: 0.94` : on passe son temps
sur les autres. Son texte français change donc, et avec lui ses sept traductions.

```bash
npx vite-node scripts/verifTraits.ts       # effets vivants, coût/gain, poids des paires, verrou d’achat
npx vite-node scripts/verifEconomie.ts     # les 1 700 Ovas d’archétypes entrent dans le catalogue
npx vite-node scripts/verifTraductions.ts  # les 30 clés ajoutées, dans les 7 langues
```

---

## 🩹 Trois retours de jeu : l’âge, l’accueil, la fiche du classement

### ⚠️ L’ÂGE ÉTAIT IMPOSSIBLE À CHANGER SUR TÉLÉPHONE

Retour : « sur téléphone on peut pas changer l’âge lors de la création du joueur,
16, 18 ou 30 ». **Le champ était cassé partout, mais il n’était INUTILISABLE que
sur téléphone**, et c’est ce qui explique que le bug ait survécu si longtemps.

La cause tient sur une ligne — le bornage était joué **à chaque frappe** :

```tsx
onChange={(e) => setAge(Math.max(16, Math.min(30, Number(e.target.value) || 18)))}
```

Taper « 25 » donne d’abord « 2 » → borné à **16** ; la seconde touche compose
alors « 165 » → borné à **30**. Vider le champ donne `Number('') === 0`, donc
`|| 18`. On ne pouvait atteindre que 16, 18 ou 30 — exactement les trois valeurs
signalées. Sur ordinateur les flèches du `type="number"` masquaient le problème ;
**un téléphone n’en affiche aucune**, il ne restait que le clavier, c’est-à-dire
rien.

Deux corrections, et il fallait les deux :

1. **On garde la SAISIE, pas le nombre.** `ageSaisi: string` ; l’âge est dérivé
   (`bornerAge(Number(ageSaisi) || AGE_DEFAUT)`) et le bornage ne s’applique qu’à
   la **sortie du champ**. Mesuré en jeu : « 25 » → 25 · « 99 » → 30 à la sortie ·
   champ vidé puis quitté → 18, jamais `NaN`.
2. **Deux touches − / + de 48 px** encadrent le champ (`.pas-a-pas`), au-dessus du
   minimum de 44 px que le projet s’impose. Le `−` se désactive à 16, le `+` à 30.
   ⚠️ Ce n’est pas de la décoration : sans flèches natives, un champ numérique de
   téléphone n’a **aucun** moyen de réglage en dehors du clavier.

Le champ passe en `type="text"` + `inputMode="numeric"` : on veut le pavé
numérique du téléphone, pas les flèches (absentes) ni la molette (dangereuse) du
`type="number"`. Une ligne d’aide annonce les bornes plutôt que de les faire
découvrir en butant dessus.

Vérifié de bout en bout : âge réglé à 24 → `joueur.age === 24` dans la
sauvegarde.

### « Comprendre le jeu » remplace les trois arguments de l’accueil

Demande : « comprendre le jeu, ça serait bien de l’avoir à la place du MJ qui
juge etc ». La section `features` (« Un MJ qui juge vraiment », « Une progression
vivante », « Ta légende sur 15 ans ») **a été retirée** ; la section
**« Comprendre le jeu »** — les quatre pages de contenu en HTML statique — prend
sa place, juste sous le hero.

⚠️ **C’est aussi le bon geste pour l’examen AdSense**, et c’est ce qui a fait
trancher sans hésiter : c’est la seule section de l’accueil qui **mène à du
contenu** (4 pages, ~3 355 mots, lisibles sans JavaScript). Trois promesses
marketing au-dessus d’elles, c’était repousser le contenu éditorial sous la ligne
de flottaison — exactement le reproche qui a valu le blocage.

Les clés `acc.f1…f3` **restent dans le dictionnaire** : elles ne coûtent rien et
serviront si l’on veut réintroduire un argumentaire ailleurs.

### La fiche du classement : juste la porte de l’armoire

Demande : « dans le classement, juste avoir le bouton ouvrir l’armoire à trophées
au lieu de mettre tous les titres ». La liste de médailles (`.bloc-titres`)
disparaît de `PanneauFiche`.

⚠️ **MAIS LE NOMBRE DE TITRES N’EST PAS PERDU** : il passe en **tuile**
(`clst.titres`), dans la rangée de chiffres. Sans ça, retirer la liste effaçait
l’information « combien » — le bouton ne dit que « il y en a ». Une carrière à dix
titres empilait dix étiquettes grises qui répétaient, en moins bien, ce que le
meuble en 3D montre d’un seul regard, et qui faisaient défiler tout le classement
— on perdait la ligne qu’on venait d’ouvrir.

`nomDuTitre()` et l’import `titreTraduit` ont été supprimés avec elle : ils ne
servaient plus qu’à ça. `.bloc-titres` et `.medaille` restent dans le CSS — le
Profil et le Panthéon les utilisent toujours.

### Un champ « Nom » vide donne un nom de son pays, plus « Anonyme »

Demande : « si le joueur ne met pas de nom, mets un nom aléatoire en fonction de
la nationalité ». `creerJoueur` retombait sur la chaîne `'Anonyme'`.

**`src/lib/nomsJoueurs.ts`** — `nomAleatoirePourNation(nation)`.

⚠️ **ON N’A ÉCRIT AUCUN POOL DE PRÉNOMS PAR PAYS**, et c’est le point de la
conception. Le jeu embarque déjà **11 916 joueurs étiquetés par nationalité** —
6 306 réels (`data/effectifsReels.ts`) et 5 610 générés pour les 18 championnats
ajoutés (`data/nouvellesLigues.ts`). Une table à côté, ce serait recopier à la
main ce qui est là, et se garantir qu’un jour les deux ne diront plus la même
chose. On recombine : le prénom de l’un, le nom de l’autre.

| Nation | Ce que ça donne |
|---|---|
| France | Pablo Jalibert · Cyril Vergé · Elyjah Flament |
| Géorgie | Davit Lagvilava · Sergo Goginava · Vakh Karkadze |
| Japon | Shunsuke Taniguchi · Mamoru Kitade · Shu Moriwaki |
| Portugal | Afonso Madeira · Diogo Aguilar · Francisco Moreira |
| Roumanie | Bogdan Ursache · Yanis Mitu · Răzvan Mureșan |

⚠️ **52 NATIONS SUR 202 ONT UN VIVIER**, et la création en propose 202. Le repli
est explicite, et il est assumé approximatif : la nation, puis **sa zone**
(`NATIONS_PAR_ZONE`), puis tout le monde. Un Népalais reçoit un nom d’Asie —
imparfait, mais un nom du bon continent se lit mieux qu’un « Léo Dupont » à
Katmandou.

⚠️ **LES DEUX BASES N’ÉCRIVENT PAS LES NOMS DE LA MÊME FAÇON**, et l’ignorer a
coûté un bug silencieux. Les joueurs RÉELS portent leur nom de famille en
capitales (« Cedate GOMES SA »), les joueurs GÉNÉRÉS sont en casse normale
(« Duarte Pinto »). La première version ne lisait que la casse : elle jetait
**les 5 610 joueurs générés** sans rien signaler. Mesuré avant correction — le
Portugal, dont presque tout le vivier est généré, tombait à **7 prénoms pour
325 joueurs**, et le tirage resservait « Raffaele » trois fois de suite. On lit
donc la casse quand il y a des capitales (seule façon fiable de placer
« DU PREEZ », « LE BOURGEOIS », « GOMES SA »), et **le dernier mot** sinon.

⚠️ **ARRÊT ANTICIPÉ À 40 PRÉNOMS** (`CIBLE`). Construire l’index complet des
11 916 joueurs pour tirer UN nom retiendrait des dizaines de milliers de chaînes
jusqu’à la fin de la session, pour un clic. On balaie les effectifs réels
d’abord — ils sont déjà décodés en objets, alors que `effectifNouveau` décode et
met en cache — puis on s’arrête dès qu’il y a de quoi ne pas se répéter.

⚠️ **UN PRÉNOM TOUT EN CAPITALES N’EST PAS UN BUG** : « JT », « AJ », « CJ » sont
de vrais prénoms de rugbymen sud-africains. Le banc d’essai ne contrôle donc la
casse que sur le DERNIER mot — il échouait sinon sur « JT Everitt », qui est
correct.

Le tirage se fait dans le store (`creerJoueur`), le seul endroit où un joueur est
créé. Il est volontairement **aléatoire, pas déterministe** : deux carrières
créées de suite dans le même pays ne doivent pas porter le même nom. Et l’écran
le DIT (`cr.nomVide`) — sinon un nom tiré à la validation passe pour un bug.

```bash
npx vite-node scripts/verifNoms.ts   # style par pays, 202 nations, particules, aléa
```

### 📄 État de la candidature AdSense

⚠️ **LE PROBLÈME DE CONTENU EST RÉGLÉ, MAIS IL RESTE UNE ÉTAPE AVANT DE DEMANDER
L’EXAMEN** : **aucun code AdSense n’est actuellement servi**. Ni `index.html`, ni
les quatre pages générées ne portent le script — `scripts/genPages.cjs` ne l’émet
que si la variable `PUB_SLOT` est renseignée, et `<Pub />` a été retiré du jeu.
Un examen lancé sur un site sans code AdSense se solde par « code introuvable ».

L’ordre à respecter :

1. créer un **bloc d’annonces** dans la console AdSense → il rend un identifiant
   de slot (10 chiffres) ;
2. `PUB_SLOT=<le slot> node scripts/genPages.cjs` puis `npm run build` ;
3. **déployer**, et vérifier en production que `/guide/`, `/pyramide/`,
   `/moteur/`, `/journal/`, `/ads.txt` et `/sitemap.xml` répondent bien ;
4. seulement alors, demander l’examen.

Ce qui est prêt : 4 pages de contenu (11 Ko chacune, ~3 355 mots), `ads.txt` à la
racine avec le bon `pub-…`, un `sitemap.xml` à 5 entrées, des `<a href>` réels
depuis l’accueil **et** depuis le `<noscript>`, et plus aucun service worker de
régie.

```bash
PUB_SLOT=1234567890 node scripts/genPages.cjs   # les pages AVEC le code AdSense
npx vite-node scripts/verifTraductions.ts       # 1 605 clés, 100 % dans les 7 langues
npx vite-node scripts/verifEcrans.ts            # robustesse du Hall et du Classement
```

---

## ✂️ PLUS UN SEUL TIRET CADRATIN DANS LE JEU

Demande : « enlève tous les tirets bizarres du jeu ». Les « — » ont été
remplacés partout où le JOUEUR les lit : **763 dans les chaînes**, 19 dans le
texte JSX, 41 dans les pages de contenu et la coquille HTML. Vérifié à
l’écran : `document.body.innerText` n’en contient plus aucun.

⚠️ **LES COMMENTAIRES DU CODE N’ONT PAS ÉTÉ TOUCHÉS**, et c’est délibéré : sur
les 1 707 tirets de `src/`, la grande majorité vit dans la documentation du
projet, que personne ne lit en jeu. Un `sed` global aurait réécrit tout le
raisonnement de ce fichier pour rien.

**`scripts/tirets.cjs`** fait le travail, et il reste dans le dépôt pour la
prochaine fois :

```bash
node scripts/tirets.cjs            # inventaire, rien n’est écrit
node scripts/tirets.cjs --ecrire   # applique
```

Il embarque un petit lexeur (code · commentaire · chaîne · gabarit) parce
qu’il n’y a pas d’autre façon de ne réécrire que le texte. Quatre règles, et
chacune vient d’un cas trouvé à la relecture du diff :

| Cas | Devient | Pourquoi |
|---|---|---|
| segment qui n’est QU’un tiret | `-` | `${a} – ${b}` est un score, pas une phrase. Avec une virgule, 34-11 devenait « 34, 11 ». |
| en début de ligne | rien | tiret décoratif de liste |
| devant une valeur | ` : ` | « À débloquer en boutique : 140 Ovas » |
| en fin de segment | ` : ` | il annonce l’interpolation qui suit : « Séance réussie : +5 de plaquage » |
| partout ailleurs | `, ` | il relie deux propositions |

⚠️ **DEUX LANGUES NE SE PONCTUENT PAS COMME LE FRANÇAIS**, et l’ignorer donnait
des résultats faux :

- en **allemand**, tous les noms communs portent une majuscule. La règle
  « majuscule à droite → deux-points » y tirait au hasard : « lass die KI über
  deine Karriere urteilen — Spiel für Spiel » devenait « … urteilen : Spiel für
  Spiel » au lieu d’une virgule ;
- en **japonais**, le tiret long s’écrit DOUBLE et SANS espaces (« 裁く——試合 »).
  Aucune règle à espaces ne l’attrapait et le repli en faisait « -- ». La
  ponctuation correcte est la virgule idéographique, « 、 ».

La langue se lit sur le code qui précède la chaîne (`de: '…'`, `ja: '…'`).
⚠️ Le segmenteur pousse le guillemet OUVRANT dans ce segment : sans l’accepter,
la détection ne matchait jamais et les sept langues passaient pour du français.

Un garde-fou compare chaque fichier réécrit à l’original **débarrassé des
tirets, de la ponctuation ajoutée et des espaces** : si un seul autre caractère
bouge, le fichier est laissé tel quel. C’est ce qui a signalé les trois
premières versions ratées du lexeur.

---

## 🎬 LE TRAILER VERTICAL — tourné EN JOUANT

Demande : « fais un trailer du jeu, joue vraiment au jeu, fais une démo pour
TikTok et Insta ». Le fichier : **`trailer/destiny-rugby-trailer.mp4`**,
1080 × 1920, 31 s, 3,3 Mo, H.264 yuv420p, sans son.

⚠️ **AUCUNE IMAGE N’EST MISE EN SCÈNE.** Un Chrome local est piloté
(`puppeteer-core`, aucun navigateur téléchargé) sur le serveur de dev : on crée
une carrière, on joue le match, et on photographie ce qui se passe. Le match du
trailer est un vrai match du moteur : Pierrefeucain 29-26 Loudun, quatre essais
partout, 211 rucks, note 10/10.

Trois obstacles, et chacun a changé le tournage :

1. **Partir en Top 14 mettait le joueur sur le BANC.** Un débutant noté 34 n’y
   est pas titulaire : beau terrain, aucune manette. On part donc de la
   Régionale 3, qui est de toute façon le vrai point de départ du jeu.
2. **`estTitulaire` est DÉTERMINISTE** (graine = club + nom + journée) : selon le
   nom, on commence ou pas. Le script fait donc une passe de **repérage sans
   photo** qui essaie des noms jusqu’à en trouver un qui débute, puis rejoue la
   carrière avec ce nom-là. Même graine, même moteur, même match.
3. **Une bagarre met le match en pause** et attend un ordre : le chrono restait
   bloqué à la 1ʳᵉ minute. C’est aussi l’une des plus belles séquences du jeu,
   donc on la photographie AVANT d’y répondre. Même chose pour le tiroir, qui
   met en pause sans se relancer tout seul quand on le referme.

Les cinq cartons-titres sont **rendus dans le navigateur**, avec Anton et la
palette du jeu : un `drawtext` d’ffmpeg aurait juré avec le reste.

⚠️ **PAS DE MUSIQUE.** Une piste sous licence n’a rien à faire dans un dépôt, et
TikTok comme Instagram veulent de toute façon qu’on choisisse le son dans leur
bibliothèque : c’est aussi ce qui pousse la vidéo. Le montage est cadencé pour
ça — coupes franches, 31 s, l’accroche dans les deux premières secondes.

Les scripts de tournage vivent dans le dossier de travail de la session, pas
dans le dépôt : ils dépendent de `puppeteer-core`, d’un Chrome local et du
serveur de dev, et n’ont pas leur place dans les dépendances du jeu.

### La deuxième version : humour noir, Top 14, joueur boosté

**`trailer/destiny-rugby-trailer-noir.mp4`** (1080 × 1920, 32 s). Stade
Toulousain, coup de poing à la 1ʳᵉ minute, 12 semaines de suspension, puis le
clash sur 𝕏 L’Ovale et ses réponses.

⚠️ **UNE SEULE CHOSE EST TRUQUÉE, ET ELLE EST DEMANDÉE** : le joueur est BOOSTÉ.
Ses attributs sont écrits à 93 dans la sauvegarde avant le coup d’envoi, pour
qu’il soit titulaire en Top 14. Le reste tourne normalement : le match finit
15-29, note 10/10, trois essais, 454 mètres, et la commission tombe pour de vrai.

⚠️ **CHAMBRER NE SERT À RIEN EN TOP 14**, et c’est le moteur qui le dit :
`chanceDeRiposte` vaut 1,2 % chez les pros contre 22 % en amateur. Quarante
chambrages, zéro bagarre. Pour la séquence, il faut FRAPPER (touche N) : quinze
échauffourées, un carton, et 12 semaines de suspension à l’arrivée. La mécanique
documentée se vérifie donc à la caméra.

⚠️ **ON NE MONTRE AUCUN JOUEUR RÉEL SUR 𝕏 L’OVALE.** L’annuaire donne un compte
aux joueurs réels de la division (Mauvaka, Aldegheri, Willis…) avec des posts
générés. En jeu c’est le décor ; dans un clip public, une capture se lit comme
une **fausse citation attribuée à quelqu’un de réel**. Les plans du fil sont donc
recadrés sur les comptes FICTIFS (supporters, haters, médias inventés) et sur le
post du joueur incarné. Les noms réels ne restent que là où ils sont factuels :
la feuille de match.

⚠️ **LA LIGNE DE L’HUMOUR EST CELLE DU PROJET**, pas une règle ajoutée : la
section L’Ovale autorise « l’insulte, le mépris, la punchline et le règlement de
comptes public » et interdit « rien de discriminatoire, pas de menace de violence
réelle, rien de sexuel ». Les cartons tapent sur le joueur incarné et sur le
sport, jamais sur une personne réelle ni sur un groupe.

---

## 🔢 LE CLASSEMENT INDIVIDUEL PRENAIT UNE JOURNÉE D’AVANCE

Deux retours de jeu, et c’étaient deux symptômes du même défaut : « on a plus
de matchs que le maximum possible » et « on voit les stats de la journée avant
de l’avoir jouée ».

### ⚠️ 1. UN NUMÉRO DE SEMAINE LU AU MAUVAIS MOMENT

`semaineSuivante` fait passer la fiche à `numero + 1` **avant** d’appeler
`simulerStatsJournee`, qui lisait `joueur.semaine` et demandait à
`matchDeLaSemaine` l’affiche de cette semaine-là. On rejouait donc
systématiquement la journée **N+1**, celle qui n’avait pas encore eu lieu : le
classement individuel avait une journée d’avance sur le championnat, en
permanence, et un titulaire affichait sept matchs quand six journées seulement
avaient été disputées.

La semaine est devenue un **paramètre** : `simulerStatsJournee(semaineJouee?)`.
Le repli sur la fiche ne sert plus qu’aux appels hors boucle de jeu. Les trois
autres lectures de la fonction (journée de coupe, fenêtre A, fenêtre U20)
avaient le même décalage et sont corrigées avec.

### ⚠️ 2. DES HOMONYMES DANS LE MÊME CLUB, ET UNE CLÉ DE CUMUL QUI LES FUSIONNE

Le banc d’essai a immédiatement attrapé un **second** bug, indépendant. Les
statistiques de fond sont cumulées sous `club|nom` : deux joueurs du même club
portant le même nom fusionnent en UNE ligne qui additionne leurs deux feuilles
de match. Mesuré en Régionale 3 : un « Leo BOGALHO » apparaissait **quatre**
fois dans le même effectif, donc 4 matchs et 320 minutes par journée.

C’est un défaut des DONNÉES, pas de la génération : les effectifs amateurs
viennent de listes de licenciés qui **mélangent les sections d’un club**, où la
même personne figure plusieurs fois (et où de vrais frères figurent aussi).

`distinguerLesHomonymes()` (`lib/effectif.ts`) suffixe les doublons en chiffres
romains : « Leo BOGALHO II ».

⚠️ **ON RENOMME, ON NE SUPPRIME PAS**, et le renommage arrive **après** le
tirage. Retirer les doublons changerait la taille du groupe, donc
`forceEffectif`, donc les classements et tout l’étalonnage ; et l’âge comme la
note sont semés sur le nom D’ORIGINE (`effectifAmateur`), qui ne bouge pas. Le
seul effet est l’étiquette, à l’écran et dans la clé de cumul. Vérifié :
`verifStats`, `verifMoteur`, `verifPyramide` et `verifGenerations` inchangés.

### Mesuré, avant / après

| | avant | après |
|---|---|---|
| journée rejouée à la semaine 9 | J6 pour 5 disputées | **J5 pour 5** |
| joueurs au-dessus du nombre de journées | 3 sur 261 (jusqu’à 20 matchs pour 5 journées) | **0 sur 277** |
| minutes maximales | 1 204′ pour 400′ possibles | **400′ pour 400′** |
| doublons dans une journée | 9 | **0** |

Relevé en jeu à la semaine 5 : le tableau affiche « 2 journée(s) disputée(s) »,
la colonne J du classement affiche 2, et l’en-tête des statistiques « matchs
joués · 2 journée(s) ». Les trois disent la même chose.

```bash
npx vite-node scripts/verifStatsJournees.ts   # la simulation ne devance plus le championnat
npx vite-node scripts/verifStats.ts           # les 18 classements, le poste attendu en tête
```

---

## 🎓 LE GUIDE DE CARRIÈRE — « on comprend pas comment ça marche au début »

Retour de joueurs, et il visait juste : « au début c'était pas trop
compréhensible, comment marchent les transferts etc. ». Le tutoriel d'accueil
(`components/Tutoriel.tsx`) répond à « qu'est-ce que je vais faire ? » AVANT de
créer un joueur. Il ne répond pas à « et maintenant, je clique où ? ».

| Fichier | Rôle |
|---|---|
| `src/data/guide.ts` | Les **12 étapes**, en 3 chapitres. Chacune est un PRÉDICAT sur l'état de la partie. |
| `src/components/Guide.tsx` | Une pastille en bas à droite, un panneau qui s'ouvre par-dessus. |
| `src/store/useGame.ts` | `ecransVus` (les écrans déjà ouverts) et `guideFerme`, persistés. |

### ⚠️ IL NE SCRIPTE RIEN, ET C'EST LE CHOIX STRUCTURANT

Aucun clic forcé, aucun écran bloqué, aucun ordre imposé. Une étape se coche
quand la chose est faite, que le joueur soit passé par le guide ou non. Un
tutoriel qui prend la main casse exactement ce qu'il prétend apprendre : se
débrouiller. Corollaire : le guide survit à n'importe quel ordre de jeu, et il
n'a pas d'état à lui en dehors de « fermé ou pas ».

### ⚠️ LE CHAPITRE DES TRANSFERTS NE PEUT PAS SE TERMINER EN UNE SAISON

Et c'est le jeu qui le veut : `susciterApproches` ne fait démarcher qu'un joueur
à **un an de contrat maximum**, or on démarre à deux ou trois ans. Le premier
transfert arrive donc vers la **saison 3**.

**C'est précisément ce qui rendait la mécanique incompréhensible** : personne ne
la voyait assez tôt pour la deviner. Le guide l'EXPLIQUE donc dès la première
semaine, les textes ne se déverrouillent pas, et il coche ses étapes le jour
venu. Les trois choses qu'un joueur ne pouvait pas deviner y sont écrites noir
sur blanc :

1. **un club n'écrit qu'à un an de la fin du contrat** ;
2. **il écrit en message privé sur 𝕏 L'Ovale**, et le badge bleu de l'onglet est
   la seule alerte : aucun panneau ne s'ouvre ;
3. **le transfert s'applique à l'intersaison**, pas à la signature.

### Les détails qui ont demandé une correction

⚠️ **`setEcran` N'EST PAS LE SEUL CHEMIN VERS UN ÉCRAN.** `creerJoueur` et la
retraite posent `ecran:` directement dans un `set()`. Résultat en jeu : l'étape
« lis ta fiche » restait décochée alors qu'on était justement sur l'écran de
carrière. Les deux alimentent maintenant `ecransVus` elles aussi.

⚠️ **LA PASTILLE PASSE AU-DESSUS DE LA BARRE D'ACTION MOBILE** (`.barre-jouer`,
fixe sous 900 px). Un guide qui recouvre « Jouer le match » serait le comble.
Mesuré à 375 px : pastille à 83 px du bas, 46 px de haut, aucun chevauchement.

⚠️ **L'ÉTAPE EN COURS EST ÉCRITE SUR LA PASTILLE**, pas cachée derrière un clic :
sinon il faut déjà savoir qu'on a besoin d'aide pour aller la chercher. Elle
redevient une icône seule sous 560 px.

⚠️ **UNE ÉTAPE FAITE S'EFFACE (opacité 0,5), ELLE NE DISPARAÎT PAS.** Voir la
liste de ce qu'on a déjà compris fait autant pour la confiance que la suivante.

### Le banc d'essai

⚠️ **`chargerTextes(TEXTES)` EST APPELÉ PAR `main.tsx`, PAS PAR `i18n.ts`.** Hors
du navigateur, `t()` rend la clé elle-même : le contrôle des textes serait passé
au vert sur du vide. Le banc charge donc le dictionnaire explicitement.

Ce qu'il vérifie, et qu'aucun autre ne pouvait : **chaque étape est réellement
atteignable**. On fabrique l'état qui la valide et on vérifie qu'elle bascule.
Une étape qu'aucun état ne coche bloquerait le guide pour toute la carrière.

```bash
npx vite-node scripts/verifGuide.ts        # 12 étapes atteignables, ordre, textes ×7 langues
npx vite-node scripts/verifTraductions.ts  # 33 clés ajoutées, 100 % dans les 7 langues
```

---

## 👥 DEUX JOUEURS, UN SEUL PSEUDO — le classement en perdait un

Retour de jeu : « si on a le même pseudo qu'un joueur dans le classement, notre
classement apparaît pas ». C'était exact, et la cause tenait en une ligne de
schéma.

### ⚠️ LE PSEUDO ÉTAIT LA CLÉ PRIMAIRE

`create table classement (pseudo text primary key, …)`. Deux joueurs qui
choisissent le même nom se partageaient donc **une seule ligne**, et l'écriture
est gardée par « le score ne recule pas » :

```sql
on conflict (pseudo) do update … where excluded.score >= classement.score
```

Celui des deux qui avait le score le plus bas **n'écrivait rien du tout**. Pas
d'erreur, pas de message : le serveur répondait `ok`, le jeu affichait « publiée
au classement », et la carrière n'y entrait jamais. Le pire genre de bug — celui
qui se présente comme un succès.

⚠️ **ET CE N'EST PAS UN CAS RARE** : le pseudo par défaut est le **nom du
joueur** (`ficheDepuisJoueur` → `j.pseudo ?? j.nom`). Deux « Antoine Dupont »
suffisent, et le jeu propose littéralement ce nom en exemple sous le champ.

### La correction : la ligne appartient à une INSTALLATION, pas à un nom

| | avant | maintenant |
|---|---|---|
| clé de la ligne | `pseudo` | **`cle`** — tirée au hasard une fois, rangée dans la sauvegarde |
| identifiant public | *aucun* | **`id`**, renvoyé par le `GET` |
| pseudo | clé primaire | un simple **libellé**, partageable |
| « ma » ligne à l'écran | `l.pseudo === monPseudo` | `l.id === rangMondialId` |

| Fichier | Ce qui change |
|---|---|
| `src/lib/classementMondial.ts` | `FicheCarriere.cle?` (facultative, bornée par `verifierFiche`, `LIMITES.cleMax = 40`) et `ficheDepuisJoueur(j, pseudo?, cle?)`. |
| `src/lib/classementEnLigne.ts` | `cleAleatoire()`, `LigneMondiale.id`, `ResultatEnvoi.id`. |
| `src/store/useGame.ts` | `cleClassement` (persistée, hors de la fiche du joueur) et `rangMondialId` (l'identifiant de MA ligne, retenu au dernier envoi réussi). |
| `api/classement.ts` | `on conflict (cle)`, `returning id`, et une **cascade de schémas** en lecture comme en écriture (v3 → v2 → v1). |
| `serveur/schema-vercel.sql` | Le SQL de la v3 et sa migration. |
| `serveur/MIGRATION-FICHES.md` | **Étape 2 bis**, avec ce que la migration ne répare pas. |

### ⚠️ POURQUOI DEUX COLONNES, ET PAS UNE

`cle` est le **droit d'écrire** sur la ligne : elle ne sort jamais du serveur.
`id` est **public**. Renvoyer la clé aurait suffi pour surligner « moi » et pour
donner une clé React unique — et aurait permis à n'importe qui de récrire la
fiche du premier du classement (pas son score, `greatest` s'y oppose, mais son
nom, ses clubs et son palmarès). Deux colonnes, deux rôles.

### ⚠️ CE QUE ÇA NE RÉPARE PAS, ET QU'IL FAUT DIRE

La clé vit dans la sauvegarde, parce que **le jeu n'a aucun compte utilisateur**
(voir `serveur/PAIEMENTS.md`, même constat). Trois conséquences assumées :

1. **deux appareils font deux lignes** ;
2. **une sauvegarde effacée repart sur une ligne neuve**, l'ancienne restant
   figée sur son dernier score ;
3. les lignes écrites **avant** la migration gardent leur identité héritée
   (`v1:<pseudo>`) et **ne sont pas supprimées** : leur propriétaire en ouvrira
   une nouvelle à son prochain envoi. Effacer une ligne parce qu'une autre porte
   le même pseudo, ce serait refaire le raisonnement qui a créé le bug.

### ⚠️ LA CLÉ EST FACULTATIVE, ET LE SERVEUR SAIT VIVRE SANS

- Une fiche **sans clé** (un onglet resté ouvert sur l'ancien bundle) retombe sur
  `v1:<pseudo>` : l'ancien comportement, bug compris, plutôt qu'un refus. Pas de
  bump de `VERSION_BAREME` — un bump aurait coupé le classement à ces joueurs
  jusqu'au rechargement, pour rien.
- Une **base non migrée** est détectée (code Postgres `42703`) : la lecture et
  l'écriture redescendent v3 → v2 → v1, en le journalisant. Rien ne casse, mais
  rien n'est corrigé non plus tant que l'`ALTER TABLE` n'est pas joué.
- La clé **n'entre pas dans la chaîne canonique** du sceau : ce n'est pas un fait
  de carrière, c'est une adresse. La même carrière envoyée depuis deux appareils
  doit produire la même empreinte.

### ⚠️ ET UN ACCENT GRAVE CASSAIT TOUT LE FICHIER `api/classement.ts`

Trouvé en passant, et c'est le plus grave du lot. Un commentaire SQL contenait
`` `greatest` `` **à l'intérieur d'un gabarit JavaScript** : l'accent grave ferme
le gabarit. Le fichier ne se **parsait plus** — donc `SyntaxError` à l'import,
donc **500 sur toutes les routes**, GET compris. C'était l'« erreur d'analyse
préexistante d'`api/classement.ts` » que `npm run lint` signalait et qu'on avait
classée comme un détail de linter : c'en était une, mais elle mettait le
classement mondial entier par terre. Les noms de fonctions SQL s'écrivent
désormais entre guillemets français dans ces commentaires-là, et `npm run lint`
est propre.

### Vérifié

`npx vite-node scripts/verifClassement.ts` gagne une **section 6 bis** (deux
carrières sous un même pseudo, les bornes de la clé, la compatibilité d'une fiche
sans clé, l'indépendance du sceau) et deux contrôles en section 9 (chaque envoi
porte la clé, et le jeu retient l'identifiant renvoyé).

En navigateur, contre un faux serveur qui sert deux carrières sous le pseudo
« Aznred » : **les deux lignes s'affichent**, chacune ouvre SA fiche, aucun
avertissement de clé React, et c'est bien la ligne dont l'`id` correspond qui est
surlignée — pas l'homonyme mieux classé. À 375 px : aucun débordement
horizontal, lignes à 84 px, fiche à 324 px.

⚠️ **CE QUI N'EST PAS TESTÉ AUTOMATIQUEMENT** : le SQL lui-même. Il n'y a pas de
Postgres dans la chaîne de vérification — l'`ON CONFLICT`, le `returning id` et
la cascade 42703 sont relus, pas exécutés. La vérification en production, c'est
l'étape 3 de `serveur/MIGRATION-FICHES.md`.

```bash
npx vite-node scripts/verifClassement.ts   # + section 6 bis : les homonymes
npx vite-node scripts/verifEcrans.ts       # robustesse du Hall et du Classement
```

---

## ⏸️ LE MODE « DÉCISIONS » — dix secondes pour choisir, le jeu joue la suite

Retour de jeu, mot pour mot : « améliore le gameplay, rends-le plus fun et plus
jouable, plus en mode on a un moment, 10 secondes pour choisir une action et ça
la simule », « le temps passe trop lentement, trop d'action en ce temps », et
« fixe les en-avants, on peut faire des en-avants sans répercussion ».

Trois reproches, trois causes distinctes. Aucune n'était dans le moteur.

### ⚠️ 1. LE MODE MANETTE DEMANDAIT DE RÉAGIR CENT DIX-NEUF FOIS PAR MATCH

`moments.ts` fait très bien ce pour quoi il a été écrit : ralentir dès qu'une
action concerne le joueur. Mesuré, ça tombe **114 fois par match**. C'est un jeu
de sport à la manette, et c'est réussi comme tel — mais ce jeu-ci est une
CARRIÈRE, et entre deux gestes il ne se passe rien pour soi tout en obligeant à
rester devant.

**`src/lib/moteur/decisions.ts`** répond exactement à la demande : le match file
tout seul, se **fige** sur un carrefour, ouvre une carte de deux à quatre
options avec un compte à rebours de **dix secondes réelles**, puis rejoue la
suite au ralenti pour qu'on VOIE ce que le choix a donné.

| | mode « Moments » | mode « Décisions » |
|---|---|---|
| sollicitations par match | 114 | **19** |
| ce qu'on fait | lire et réagir en temps réel | lire et choisir, jeu figé |
| durée d'un match | 11,6 min | **5,8 min** (2,9 de jeu · 1,9 de choix · 1,0 de rejeu) |
| par défaut | non | **oui, dès qu'on pilote** |

Les deux coexistent : un bouton les sépare, et « Moments » ne perd rien.

⚠️ **AUCUNE OPTION N'EST INVENTÉE.** Une carte ne propose que ce que
`controle.ts` déclare jouable à cet instant, et elle le joue par
`demanderAction` — le même chemin que la barre, le clavier et la manette. Une
seule surface d'appel, donc rien à re-régler quand une action change. Le banc
d'essai le vérifie option par option : **0 injouable sur 278**.

⚠️ **NE PAS CHOISIR EST UN CHOIX.** À zéro, la carte se ferme sans rien armer,
une ligne le dit (« … hésite une seconde de trop »), et le moteur joue son rugby
automatique — comme pour les vingt-neuf autres. Ce n'est pas une punition, c'est
ce qui arrive quand on reste spectateur, et c'est ce qui donne du prix au fait
de décider.

⚠️ **LE REPOS DE 95 SECONDES SIMULÉES EST LE RÉGLAGE CENTRAL.** Une carte à
chaque moment, ce serait 114 menus : vingt minutes de formulaire et plus une
seconde de rugby. Espacées, elles tombent sur **19 carrefours**, l'ordre de
grandeur des ballons qu'un joueur touche vraiment. Sous 10 par match on regarde
sans jouer, au-dessus de 35 on remplit un formulaire : le banc échoue aux deux
bouts.

⚠️ **LE REJEU DE 3,2 SECONDES N'EST PAS DU CONFORT.** Sans lui on choisit « je
plaque », le jeu repart à seize fois la vitesse réelle, et trois images plus
tard on est au regroupement suivant sans avoir rien vu. Un choix dont on ne voit
pas le résultat n'apprend rien et ne procure rien.

⚠️ **ET LE FICHIER NE MUTE RIEN**, comme `moments.ts`. Il lit l'état et propose ;
c'est l'écran qui arme le geste. Le déterminisme du moteur est intact, et le
compteur de repos vit dans l'écran — pas en variable de module, sinon deux
matchs joués en parallèle le partageraient.

### ⚠️ 2. ON PEUT S'ARMER AVANT DE RECEVOIR LE BALLON

Correction de fond attrapée en écrivant les cartes : `actionsDisponibles`
exigeait d'AVOIR le ballon pour proposer crochet, raffut ou sprint. Or un
crochet ne compte que s'il est encore armé **à l'instant du contact**, et entre
la réception et le plaqueur il ne reste qu'une fraction de seconde. Le geste
était donc quasi injouable — et sur une carte de réception, il n'y avait
carrément rien à proposer.

Les gestes de COURSE s'arment maintenant dès que le ballon vient sur soi (passe
en vol, ou joueur suivant de la combinaison). La passe et le coup de pied, non :
on ne donne pas un ballon qu'on n'a pas.

### ⚠️ 3. « LE TEMPS PASSE TROP LENTEMENT, TROP D'ACTION EN CE TEMPS »

Le reproche est exact et il est arithmétique : hors moment, le jeu tournait à
neuf fois la vitesse réelle, si bien qu'une mêlée qui avale cinquante secondes
d'horloge demandait encore cinq secondes de patience, et une possession de trois
minutes en coûtait vingt. On regardait le chrono ramper pendant que le jeu, lui,
débordait d'action.

| tempo | avant (moment / hors) | maintenant |
|---|---|---|
| ⏸️ Décisions | *n'existait pas* | **2 / 16** |
| 🎯 Moments | 1 / 9 | 1 / **13** |
| 👁️ Suivre | 5 / 5 | **7 / 7** |
| ⏩ Accéléré | 18 / 18 | **26 / 26** |
| ⏭️ Fin | 600 / 600 | inchangé |

⚠️ **ON N'A PAS TOUCHÉ À LA DENSITÉ DU JEU**, et il ne faut pas : 149 rucks,
242 plaquages et 5,4 essais par match, c'est le rugby réel, et
`scripts/verifMoteur.ts` le protège. Ce qui manquait, c'est de la vitesse
d'ÉCOULEMENT, pas moins de rugby. Les durées visuelles des phases arrêtées
(`ARRETS`) n'ont pas bougé non plus : ce sont elles qui laissent aux trente pions
le temps d'atteindre leur place en mêlée et en touche (mesuré : 96 % et 90 %).

### ⚠️ 4. LES EN-AVANTS — LA RÉPERCUSSION EXISTAIT, ELLE ÉTAIT INVISIBLE

Vérification faite avant de toucher quoi que ce soit : le moteur produisait déjà
**12 en-avants par match**, chacun donnant une mêlée à l'adversaire, donc une
perte de possession. Le reproche restait juste, pour trois raisons :

1. **ON NE LES VOYAIT PAS.** La sanction passait dans une ligne du fil de
   commentaire, réduit à sa DERNIÈRE ligne au-dessus du terrain, et défilant à
   neuf fois la vitesse réelle. Une sanction qu'on ne voit pas n'existe pas pour
   le joueur. `EtatMatch.sifflet` porte désormais la décision de l'arbitre, et
   l'écran l'affiche **en grand, au centre** : ce qui s'est passé, qui récupère
   le ballon, et en rouge si c'est toi le fautif.
2. **UNE PASSE REÇUE NE POUVAIT PAS ÊTRE LÂCHÉE.** `donnerBallon` donnait le
   ballon, point final. Or la faute de main la plus fréquente du rugby n'est pas
   la passe ratée, c'est la RÉCEPTION ratée : passe trop dure, dans le dos, ou
   prise avec un défenseur dans le nez. `receptionRatee()` la rend possible, et
   le risque DIT quelque chose du jeu — il monte avec la pression sur le
   receveur et la longueur de la passe, il descend avec ses mains et sa
   fraîcheur. **Un offload est trois fois plus risqué** : c'est le point
   d'équilibre du geste, qui offrait sinon un temps de jeu gratuit sans revers.
3. **LA PASSE EN AVANT N'EXISTAIT PAS DU TOUT.** `passerLeBallon` ramenait le
   point d'arrivée derrière le passeur dès que le receveur avait dérivé devant :
   la règle était « respectée », mais à l'écran le ballon partait vers un
   partenaire placé plus haut et l'arbitre ne disait rien. C'est littéralement
   « faire un en-avant sans répercussion ». Elle est désormais sifflée — rarement,
   et seulement au-delà d'un mètre quarante de dérive, sinon plus aucune envolée
   de trois-quarts ne passerait.

Un seul chemin les traite tous (`enAvant()`) : commentaire, statistique du
fautif, compteur du match, bannière, et mêlée pour l'adversaire. Trois copies
traînaient dans le fichier, avec pour seul point commun que **personne ne les
comptait** — et un évènement qu'on ne mesure pas est un évènement qu'on ne règle
pas.

| | avant | après |
|---|---|---|
| en-avants + passes en avant par match | 12,1 (non mesurés) | **13,2** (rugby pro : 12 à 18) |
| dont réceptions manquées | **0** | ~3 |
| dont passes en avant | **0** | ~1 |
| le fautif perd le ballon | oui | oui, **0 exception sur 6 matchs** |
| l'arbitre l'annonce à l'écran | non | **0 sans bannière** |

⚠️ **LE FAUTIF PERD LE BALLON, LA POSSESSION NE « CHANGE » PAS TOUJOURS**, et le
banc d'essai s'est trompé là-dessus avant d'être corrigé : un défenseur qui
lâche un ballon au sol rend la mêlée à l'équipe qui attaquait DÉJÀ. Le contrôle
compare donc au camp du fautif, jamais au camp qui avait le ballon.

⚠️ **L'ÉTALONNAGE DU MOTEUR N'A PAS BOUGÉ** : `verifMoteur.ts` reste dans toutes
ses cibles (42,6 points, 5,6 essais, 229 plaquages, 158 rucks, 15,4 mêlées,
20,6 pénalités) et le score reste **exactement celui de la ligue** — 0 écart sur
14 matchs. Un en-avant de plus, c'est une mêlée de plus, pas un point de plus.

### 🩹 Un banc d'essai qui répondait au hasard

`verifControle.ts` comparait les gestes illégaux amateur / pro sur **douze
matchs**, c'est-à-dire huit évènements contre neuf. Le contrôle « plus fréquent
en amateur » passait ou tombait au tirage sans que le réglage ait bougé d'un
pouce (base 0,016 contre 0,009 : le rapport est de 1,8). Porté à **quarante
matchs** : 0,72 contre 0,57, stable. Un test qui répond au hasard est pire qu'une
absence de test.

### L'écran

| Élément | Où |
|---|---|
| `.ml-decision` | la carte, posée **en bas** du terrain (52 % de hauteur maximum) |
| `.ml-dec-chrono` | le compte à rebours, une barre et pas un nombre — on la lit sans la lire |
| `.ml-dec-option` | 52 px de haut minimum, deux colonnes, raccourcis 1 à 4 au clavier |
| `.ml-sifflet` | la décision de l'arbitre, centrée à 11 % du haut, rouge si c'est ta faute |

⚠️ **LA CARTE NE COUVRE PAS LE TERRAIN**, et c'est ce qui commande sa taille : on
choisit EN REGARDANT le jeu — qui arrive, où sont les soutiens, à quelle distance
est la ligne. Une modale plein écran ferait choisir à l'aveugle. Mesuré :
**26 % de la hauteur sur ordinateur, 46 % sur téléphone**, toujours en bas.

⚠️ **LE HUD EST EN `display: block`**, donc `align-self` et `margin: auto` n'y
font rien. Mesuré en jeu avant correction : la bannière de sifflet s'étalait sur
**723 px** au lieu de tenir en son milieu. Les deux blocs sont posés en absolu,
comme `.ml-banniere` et `.ml-bagarre`.

⚠️ **PENDANT UNE CARTE, LA MANETTE EST COUPÉE.** Sinon la touche « 1 » armerait
à la fois l'option 1 de la carte et la première action de la barre. Les chiffres
choisissent sur la carte, et rien d'autre — lus sur `ev.code`, parce qu'en AZERTY
la rangée des chiffres rend « & é " ' ( » sans Maj.

### Les scripts

```bash
npx vite-node scripts/verifMatchJouable.ts  # + sections 7 et 8 : les cartes, les en-avants
npx vite-node scripts/verifMoteur.ts        # l'étalonnage du moteur ne bouge pas
npx vite-node scripts/verifControle.ts      # actions, discipline (40 matchs sur la discipline)
npx vite-node scripts/verifStats.ts         # les 18 classements individuels
npx vite-node scripts/verifTraductions.ts   # les 16 clés ajoutées, dans les 7 langues
```

---

## 📺 LE FIL DE MATCH : essayé, puis retiré

Demande, puis contre-demande, à deux messages d'intervalle. D'abord : « refais la
mécanique de match totalement, que ce soit super facile et fun à prendre en main
sur n'importe quel appareil », avec le format d'un live texte décrit
précisément — des blocs de deux à quatre actions, une ligne par évènement,
centrée sur son joueur. Puis, une fois livré : **« reprends le même système de
jeu et de simulation d'avant car maintenant c'est moche, mais en gardant le
système de moment comme maintenant »**.

Le fil a donc vécu deux tours. Ce qui suit dit ce qu'il en reste, parce que le
verdict est instructif et que la tentation reviendra.

### Ce qui a été supprimé

`components/MatchDirect.tsx`, `lib/moteur/fil.ts`, `scripts/verifFil.ts`, le bloc
CSS `.fd-*` et les cinq clés `fd.*` du dictionnaire. Git les garde ; rien n'en
dépend plus.

### ⚠️ CE QUI A ÉTÉ RETENU, ET QUI RESTE

- **Les cartes de décision** (`moteur/decisions.ts`) : c'est la partie que
  l'utilisateur a explicitement demandé de garder, et elle vivait DÉJÀ dans
  `MatchLive` avant le fil. Le tempo **⏸️ Décisions** reste le défaut dès qu'on
  pilote.
- **Les en-avants et la bannière de sifflet** (`EtatMatch.sifflet`) : c'est du
  moteur et de l'écran 2D, le fil n'y était pour rien.
- **`statsPourLaNote`** a définitivement déménagé de `MatchLive.tsx` vers
  `moteur/apresMatch.ts`. Une fonction de barème n'avait de toute façon rien à
  faire dans un composant de rendu, et elle y est mieux même sans second écran.
- **Le réglage des touches** est revenu dans ⚙️ Réglages… puis en est reparti
  pour de bon deux jours plus tard, avec la manette entière. Voir la section
  suivante.

### ⚠️ LA LEÇON, ET ELLE VAUT POUR LA PROCHAINE FOIS

Le fil répondait bien à ce qui était demandé — il était mesurable, léger, jouable
partout, et un match tenait en 3,6 minutes. Il a été refusé sur un seul mot :
**« c'est moche »**. Le terrain en deux dimensions, ses trente pions, ses lignes
et ses poteaux ne sont pas un détail d'habillage de ce jeu : ce sont eux qui
donnent l'impression de regarder du rugby. Remplacer une surface riche par du
texte, même bien réglé, se paie en présence.

À retenir avant de proposer une refonte de surface : **ce qui coûte cher à
l'écran est parfois exactement ce qui fait le jeu**. La bonne question n'était
pas « comment enlever le terrain », mais « comment garder le terrain en rendant
la décision plus simple » — ce que les cartes font déjà.

## 🎯 ON NE BOUGE PLUS SON JOUEUR — on ne fait que choisir, et on le regarde

Demande, mot pour mot : **« je veux que tu modifies juste pour que dans les
matchs on puisse faire que les choix, pas bouger le joueur, et qu'on voie
vraiment notre joueur effectuer le choix »**.

Deux phrases, deux moitiés, et la seconde est la plus exigeante : enlever la
manette est un travail de suppression, montrer le geste est un travail de mise
en scène.

### ⚠️ LA LIGNE DE MOTEUR SANS LAQUELLE RIEN NE MARCHE

C'est la seule chose vraiment délicate de tout le changement, et elle ne se voit
pas en lisant l'écran. Tant qu'il y avait des boutons, `moteur.ts` **se taisait**
dès que le pion du joueur portait le ballon :

```ts
const jePilote = porteur.moi && e.controle;
if (!jePilote && suivant && …) return passerLeBallon(…);  // pas de passe auto
if (plaqueur && porteur.battu <= 0) return resoudrePlaquage(…);
if (jePilote) return;                                     // pas de coup de pied
```

C'était juste : personne ne devait passer à la place du joueur qui allait
appuyer sur « passer ». **Retirer les boutons sans retirer ce cas particulier
aurait donné un pion qui garde le ballon jusqu'au plaquage à CHAQUE possession
— quatre-vingts fois par match, et jamais une passe.** Le cas particulier a donc
disparu avec les boutons ; le pion du joueur joue exactement comme les
vingt-neuf autres.

⚠️ **ET L'ORDRE DES BLOCS SUFFIT À GARANTIR QUE LE CHOIX PASSE DEVANT.**
L'intention armée par la carte est lue une trentaine de lignes PLUS HAUT, avant
la combinaison et avant le plaquage. Il n'y a donc rien à arbitrer : un choix
gagne toujours, ne pas choisir laisse le rugby automatique faire.

### Ce qui a été supprimé, en entier

| Fichier | Sort |
|---|---|
| `src/lib/moteur/manette.ts` | **supprimé** — `LecteurEntrees`, les liaisons, la manette, la souris, le tactile |
| `src/components/ReglageTouches.tsx` | **supprimé** — plus une seule touche à assigner |
| `EtatMatch.direction`, `EtatMatch.sprint` | **supprimés** de `etat.ts` et de `creerMatch` |
| `piloterDirection()` | **supprimée** de `controle.ts` |
| la branche « stick » de `piloterMonJoueur` | **supprimée** — la fonction ne lit plus que `e.intention` |
| la branche `pilote` de la course du porteur | **supprimée** — `ligneDeCourse` vaut pour les trente |
| le tempo `'moments'` | **supprimé** de `TEMPOS` et du type `Tempo` |
| `touchesMatch`, `setToucheMatch`, `reinitialiserTouchesMatch` | **retirés** du store |
| `.ml-stick`, `.ml-principal`, `.ml-secondaires`, `.ml-chauffe`, `.ml-act`, `.ml-tension` | **retirés** de `App.css` |
| 28 clés i18n (`cmd.*`, `reg.touches*`, `ml.commandes.deplacer`…) | **retirées** des sept langues |

⚠️ **`touchesMatch` RESTE DANS LES SAUVEGARDES EXISTANTES, ET C'EST VOULU.**
`partialize` ne le réécrit plus et plus rien ne le lit : il s'éteint tout seul au
prochain enregistrement. Le purger aurait demandé une migration versionnée pour
supprimer une clé que personne ne regarde.

### ⚠️ LE TEMPO « 🎯 MOMENTS » DEVAIT PARTIR AVEC, ET C'EST MOINS ÉVIDENT

Il existait pour donner le **temps de réagir** : temps réel dès qu'un ballon
arrivait sur soi. Sans commandes, il n'offrait plus qu'un ralenti pendant lequel
on ne peut rien faire, juste à côté d'un « ⏸️ Décisions » qui, lui, **fige**
vraiment le jeu et pose la question. Deux modes pour la même intention, dont un
impuissant : c'est le genre de reste qui fait passer un jeu pour bâclé.

### 🎬 « QU'ON VOIE VRAIMENT NOTRE JOUEUR EFFECTUER LE CHOIX »

Trois choses, ensemble. Aucune ne suffit seule, et aucune n'est décorative.

1. **LE RALENTI** (`REJEU` = 3,2 s réelles). Il existait déjà : le jeu repart à
   deux fois la vitesse réelle au lieu de seize.
2. **LA CAMÉRA SE COLLE AU PION** — c'est nouveau. Le reste du temps elle cadre
   un compromis entre le ballon et son joueur (pondération 0,5), et c'est la
   bonne lecture : on doit voir venir ce qui arrive. Mais trois secondes après
   « je plaque », **le sujet du plan n'est pas le ballon** : à 0,5, un plaquage
   à douze mètres du ballon se jouait au bord du cadre. Pendant le rejeu la
   pondération passe à **1** et le cadrage à `'proche'`.
3. **L'ÉTIQUETTE DU GESTE**, en or, au-dessus de sa tête (`.ml-geste`). On lit
   « 💥 Plaquer » **sur le pion** pendant qu'il charge.

⚠️ **L'ÉTIQUETTE LIT `rejeu`, PAS `e.intention`**, et la différence n'est pas un
détail : une intention est **consommée** dès que le moteur la joue, souvent au
premier tick. Un « 💥 Plaquer » qui s'éteint un dixième de seconde après le clic
ne se lit pas. `rejeu` tient les 3,2 s du plan, en secondes **réelles** — une
durée de plan ne doit pas s'allonger parce que le jeu ralentit, ce serait le
serpent qui se mord la queue.

### ⚠️ DEUX DÉFAUTS TROUVÉS EN JOUANT, PAS EN RELISANT

Les deux touchaient exactement la moitié « qu'on voie son joueur », et aucun
banc d'essai ne pouvait les attraper.

- **MON PION ÉTAIT DESSINÉ SOUS CEUX D'EN FACE.** Les deux camps se dessinaient
  l'un après l'autre (`cote === 'B'` puis `cote === 'A'`) : le camp B finissait
  systématiquement dessous. Mesuré à l'écran — mon numéro 10 caché sous le 8
  adverse **au moment du ruck**, c'est-à-dire précisément quand il se passe
  quelque chose pour lui. Mon pion est désormais dessiné **en dernier, toujours**.
- **L'ÉTIQUETTE SORTAIT DU CADRE EN BORD DE TOUCHE.** La caméra borne son cadre
  au terrain (elle ne montre jamais de vide) : un joueur collé à la ligne se
  retrouve au bord de l'écran, et tout ce qui est posé « au-dessus » de lui
  passe hors du `viewBox`. Mesuré : l'étiquette à 691 px dans une scène qui
  s'arrête à 680. Elle **bascule sous le pion** quand celui-ci est dans le haut
  du cadre — décidé sur la position **à l'écran** (`vue.versEcran`), donc après
  le pivot du portrait.

### La discipline n'a pas de bouton, elle a une carte

Chambrer, frapper et calmer vivaient derrière le 💢 du HUD. Sans repli, le
joueur ne pourrait plus **jamais** déclencher une bagarre — seulement les subir,
et toute la ligne « Ovale » du jeu deviendrait décorative. Ils sont donc proposés
sur les cartes de décision, **en dernière position et seulement au-dessus de
`TENDU` = 55 de température**. C'est exactement le rôle que la carte leur
donne : « la quatrième option est toujours celle qui sort du cadre ». Proposer
« frapper » à la 3e minute d'un match tranquille, ce serait le proposer
quatre-vingts fois, et la moitié des carrières finirait en commission.

### Ce que le banc d'essai mesure maintenant

`scripts/verifControle.ts`, section 7 — elle mesurait « je pousse à gauche, mon
pion va à gauche ». Elle mesure désormais **une égalité**, et c'est ce qui la
rend implacable :

> **un match « contrôlé » où l'on ne choisit JAMAIS rien est rigoureusement le
> même match que le même match regardé** — score, nombre de commentaires,
> nombre de rucks. 12/12.

Tout ce que `e.controle` change encore est gardé derrière un `e.intention` (trois
occurrences dans `moteur.ts`, allez les compter). Le jour où quelqu'un remet un
cas particulier pour le pion du joueur — **et c'est deux lignes, ça a vécu des
mois sous le nom `jePilote`** — cette égalité casse immédiatement, alors
qu'aucun autre chiffre du banc ne bougerait : le score vient de la ligue, les
bagarres se mesurent ailleurs. Une seconde ligne vérifie qu'il **donne** le
ballon : 1,8 passe pour 5,8 ballons portés par match.

### Deux seuils de banc ont bougé, et il faut savoir pourquoi

| Contrôle | Avant | Après | Raison |
|---|---|---|---|
| `verifMatchJouable` § 5 · part du match au ralenti | 12-35 % | **8-35 %** | Le pion **donne** le ballon maintenant : il le garde moins en main, donc moins de secondes de moment « ballon ». Mesuré 11,8 %. Et ce n'est plus cette mesure qui décide de la durée d'un match — c'est la § 7, qui la mesure directement (5,7 min : 2,9 de jeu, 1,8 de choix, 1,0 de rejeu). |
| `verifMatchJouable` § 8 · en-avant sans conséquence | 0 toléré | 0 **hors `miTemps` / `apresEssai`** | Un ballon lâché **sur la sirène** ne donne pas de mêlée : `phaseMiTemps` reprend la main et prépare le coup d'envoi de la seconde période. La règle EST appliquée, il n'y a simplement plus de match à jouer sur cette phase. Un cas sur six matchs. |

### Vérifié en jouant, desktop et téléphone

Match complet joué **uniquement aux cartes**, jusqu'à la sirène : 19-10, note
**7,2/10**, 6 plaquages, 32 m gagnés, 1 ballon gratté, 2/2 aux tirs au but. La
semaine avance à la fermeture. Sur téléphone (375 × 812) la carte s'ouvre en
grille 2 × 2 + « laisser faire », le terrain pivote, et il ne reste **aucun**
bouton posé sur la pelouse. Étiquette mesurée : 21 échantillons, **0 hors
cadre**, 100-116 px de large.

## 👆 « ON CLIQUE MAIS PAS L'IMPRESSION QUE ÇA MARCHE » — et sur téléphone, ça ne marchait vraiment pas

Retour de jeu, en un message, deux défauts :

> « tu peux faire en sorte que les actions qu'on choisit en match marchent
> vraiment, ou marque le résultat dans l'action, car on clique mais pas
> l'impression que ça marche vraiment. Aussi bug sur téléphone : les boutons
> de choix et de dire oui j'ai compris comment ça marche ne fonctionnent pas,
> on peut pas cliquer dessus. »

### ⚠️ LE BUG TACTILE N'ÉTAIT PAS UN BUG DE CLIC — C'ÉTAIT UN BUG DE DÉFILEMENT

Et il était **à moi**, posé deux jours plus tôt en retirant le joystick.

| | |
|---|---|
| la cause | `.ml-scene { touch-action: none }` |
| pourquoi elle existait | Le joystick flottant. Sans elle, glisser le doigt faisait défiler la page, le navigateur s'appropriait le geste après quelques pixels et le pion se figeait en pleine course. |
| pourquoi c'est devenu un bug | Le joystick a été supprimé, **pas la règle**. Et elle s'applique à TOUT ce qui vit dans la scène — donc à la carte de décision (`max-height: 52%; overflow-y: auto`) et au tutoriel. |
| ce que ça donnait | Sur un téléphone, la 4ᵉ option et « laisser faire » passaient sous le pli, et **le doigt ne pouvait pas faire défiler pour les atteindre**. Le tutoriel, lui, est `inset: 0` dans une scène en `overflow: hidden` : sur un écran couché (scène de 221 px pour un contenu de 268), « C'est parti » était purement et simplement **coupé**. |

⚠️ **LA LEÇON, ET ELLE EST GÉNÉRALE : une règle CSS posée pour une
fonctionnalité doit partir avec elle.** `touch-action: none` était juste tant
qu'on pilotait ; le jour où plus rien ne se pilote, elle ne protège plus rien
et casse tout le reste. Un commentaire disait même « est indispensable » —
il l'était, pour un joystick qui n'existait plus.

⚠️ **ET ELLE NE DOIT PAS REVENIR** telle quelle. S'il faut un jour rattraper un
geste sur la pelouse, elle se pose sur le `<svg>` du terrain, **pas** sur la
scène qui porte aussi tout le HUD.

### 🩹 Ce qui a été corrigé, et mesuré

| | Avant | Après |
|---|---|---|
| `.ml-scene` | `touch-action: none` | *(retiré)* — `auto` |
| `.ml-decision` | `max-height: 52%` | `62%`, `touch-action: pan-y`, `overscroll-behavior: contain` |
| `.ml-tuto` | pas de défilement | `overflow-y: auto`, `touch-action: pan-y`, carte en `margin: auto` |
| les cartes, le tuto, les ordres de bagarre, le voile de pause | `onPointerDown` | **`onClick`** |

⚠️ **`onPointerDown` AVAIT UN SENS QUAND ON PILOTAIT** — gagner les quelques
millisecondes du `click` comptait, manette en main. Il n'y a plus rien à
piloter, et `onClick` est le geste que le navigateur valide vraiment sur un
écran tactile : un doigt qui ripe de deux pixels ne doit pas perdre son choix.

Mesuré sur un vrai 375 × 812, carte ouverte : deux colonnes de 161 px, options
de 77 à 90 px de haut, **carte non défilante** (tout tient), et les **cinq**
options répondent à `elementFromPoint`. Tutoriel sur une scène de 221 px pour
268 px de contenu : il défile, et « C'est parti » se touche.

### ⚠️ LA MOITIÉ INVISIBLE : SOIXANTE RENDUS PAR SECONDE POUR NE RIEN MONTRER

La boucle appelait `redessiner` **à chaque image** dans trois états où **rien
ne bouge** :

- **carte de décision ouverte** — le match est figé, dix secondes durant, et on
  reconciliait trente pions soixante fois par seconde **pour animer une barre
  de progression** ;
- **pause** — même chose, sans limite de durée ;
- **tutoriel** — qui, en plus, ne figeait même pas le match : on lisait trois
  lignes pendant que le jeu défilait à seize fois la vitesse réelle derrière
  le voile.

Sur un téléphone, ça sature le fil principal, et un fil saturé avale les taps.
C'est la seconde cause de « on peut pas cliquer dessus », et celle qu'on ne
voit jamais sur un ordinateur de développement.

Corrigé : **aucun `redessiner` dans les états figés**. Le compte à rebours est
devenu une **animation CSS** (`@keyframes ml-dec-chrono`, durée posée en style
depuis `DELAI_DECISION` — une seule vérité), que le compositeur anime sans
réveiller React une seule fois. Le `key={noCarte.current}` est indispensable :
sans lui React réutilise le même nœud d'une carte à l'autre et l'animation ne
repart pas. Et le tutoriel arrête désormais le match.

⚠️ Un garde subsiste : si le plan sur mon joueur s'éteint **pendant** un état
figé, le bandeau resterait affiché jusqu'à la reprise. `planAChange` force
alors le seul rendu nécessaire.

### 🎬 « MARQUE LE RÉSULTAT DANS L'ACTION »

Le geste s'écrivait bien au-dessus du pion, mais **rien ne disait ce qu'il
avait produit**. Le bandeau `.ml-resultat` répond en deux temps :

1. **L'ACCUSÉ DE RÉCEPTION, à l'instant du clic** : « ▶️ ↩️ Crochet ». Il
   s'affiche **avant** la moindre simulation — c'est lui qui répond à « est-ce
   que mon clic a été pris ? », et à lui seul il règle la moitié du retour.
2. **LE VERDICT DU MOTEUR**, dès qu'il tombe : « 💥 Gaëtan Baille se lance sur
   Basile BENAZET ! ». On ne fabrique aucun texte — c'est la ligne que le fil
   aurait affichée de toute façon, sortie du fil pour être posée en grand.

⚠️ **DEUX HORLOGES, ET C'EST LE CŒUR DU CORRECTIF.** Un crochet **n'est pas
joué au clic** : il ARME une intention que le moteur dépense au premier
contact — qui peut venir quatre secondes plus tard, ou jamais si personne ne
monte. Le bandeau s'éteignait au bout des 3,2 s du plan de caméra,
c'est-à-dire **souvent avant le geste qu'il annonçait**. Désormais :

| | Durée | À quoi ça sert |
|---|---|---|
| `rejeu.plan` | `REJEU` = 3,2 s | Gros plan caméra + étiquette sur le pion. Une durée de plan de télévision. |
| `rejeu.restant` | tant que l'intention est armée, puis 2,4 s (3,4 s si ça a marqué) | Le bandeau. Il doit être encore là quand le geste a lieu. |
| `rejeu.patience` | 12 s réelles | Garde-fou. Hors ralenti le jeu tourne à ×16 : au-delà, le bandeau finirait par annoncer autre chose que ce qu'on a demandé. |

### ⚠️ ET QUAND LE MOTEUR N'ÉCRIT RIEN — LE CAS LE PLUS FRÉQUENT

Il n'écrit une ligne que sur les évènements qui font une histoire. « Réclamer »,
« soutenir », ou un crochet qui passe sans qu'aucun plaqueur ne monte n'en
produisent **aucune**. On serait resté sur « Ton joueur exécute… », et le
retour de jeu serait intact.

La seconde ligne du bandeau montre donc **ce que le geste a ajouté à la feuille
de match** : « ➡️ Passe · 🏃 Ballon porté », « 💥 Plaquage ×2 », « 📏 +7 m ».
Ce sont exactement les compteurs qui font la note à la sirène — « +1 Plaquage »
ici vaut « +0,4 » sur la note. **Une preuve, pas une animation.**

⚠️ **AU SINGULIER, LE NOMBRE DERRIÈRE : « Plaquage ×2 ».** « 2 plaquages »
demanderait une forme singulier ET une forme pluriel dans les sept langues —
le français accorde, l'allemand décline, le japonais ignore le pluriel. Onze
clés au lieu de vingt-deux, et ça se lit mieux sur un bandeau de trois
secondes : le nom saute aux yeux, le chiffre suit.

⚠️ **ET L'EMOJI SEUL NE SUFFISAIT PAS.** Première version : « ➡️ · 🏃 ».
Mesuré à l'écran, et illisible — personne ne devine « une passe et un ballon
porté ». Un HUD peut être compact, il ne peut pas être un rébus.

### ⚠️ CE QUE LE BANDEAU NE PROMET PAS

Il montre **la première ligne écrite sur mon joueur** après le clic, pas « la
conséquence causale du geste ». Sur une séquence longue, ça peut être une
transformation réussie plutôt que le crochet lui-même. C'est assumé : les deux
sont vrais, le bandeau ne dit jamais « grâce à ton choix », et filtrer par
causalité demanderait au moteur de tracer une origine par évènement — pour
cacher, la plupart du temps, un résultat que le joueur veut voir.

### Vérifié en jouant

Journal capté sur un match, taps tactiles simulés à la position réelle des
boutons :

```text
>>> TAP : ↩️ Crochet
▶️ ↩️ Crochet | Ton joueur exécute…
▶️ ↩️ Crochet | 🏃 Ballon porté
▶️ ↩️ Crochet | ➡️ Passe · 🏃 Ballon porté
>>> TAP : 💥 Plaquer
▶️ 💥 Plaquer | 💥 Plaquage
💥 Gaëtan Baille se lance sur Basile BENAZET ! | 💥 Plaquage ×2
```

⚠️ **UNE NOTE SUR LA VÉRIFICATION.** Les tours précédents avaient « validé » la
carte de décision au clavier et par `dispatchEvent` — deux chemins qui
**contournent le test de collision du navigateur**. Le bouton pouvait être
couvert ou hors cadre sans que rien ne le montre. Le seul contrôle qui vaut,
c'est `document.elementFromPoint()` au centre de chaque bouton : il répond ce
que le doigt aurait touché. À faire systématiquement avant de dire qu'une
surface tactile marche.

## 🎲 UN CHOIX EST UN DUEL — pourcentage annoncé, geste joué sur-le-champ, enchaînement

Retour de jeu, en un message :

> « fais que ces phrases elles soient au-dessus de soi, et avec un système de
> pourcentage de réussite et d'impact dans le jeu ; et aussi que ça s'applique
> vraiment — en mode plaquage réussi ça plaque direct, plaquage raté le mec
> perce, pareil pour les autres ; et il peut y avoir des combos sur l'action :
> tu perces, tu peux tenter un autre truc sur le défenseur. »

Quatre demandes, et la troisième est la seule qui touche au moteur.

### ⚠️ UN CHOIX N'ÉTAIT PAS UN GESTE — C'ÉTAIT UNE INTENTION

C'est la cause de tout le reste, et elle était invisible à la lecture de
l'écran. `demanderAction` posait un DRAPEAU (`e.intention`) que le moteur
dépensait plus tard, au prochain contact — qui pouvait venir quatre secondes
après, ou jamais. On choisissait « crochet » devant un défenseur, le porteur
donnait le ballon avant le contact, et le crochet expirait sans avoir existé.

| | Avant | Maintenant |
|---|---|---|
| ce que fait un clic | arme une intention | **`resoudreChoix` tire le dé et applique l'issue** |
| quand ça se joue | au prochain contact, ou jamais | **maintenant** |
| ce qu'on sait avant | rien | **le pourcentage exact**, écrit sur le bouton |
| ce qu'on sait après | une ligne dans un fil qui défile | **le verdict du moteur, au-dessus de son pion** |
| après une percée | rien | **une carte d’enchaînement, sans le repos de 95 s** |

### ⚠️ UNE SEULE FORMULE, DEUX LECTEURS

`probaPlaquage()` a été **sortie de `resoudrePlaquage`** pour être appelée
aussi par `enjeuDe`. Elle vivait au milieu du contact, ce qui allait très bien
tant que personne d'autre n'avait besoin de la connaître — mais depuis que la
carte AFFICHE un pourcentage, un second lecteur existe, et **une probabilité
recopiée est une probabilité qui ment un jour**. Le chiffre montré au joueur
et le tirage qui décide de son sort sortent littéralement de la même ligne.

⚠️ **ET LE DUEL N'EST TIRÉ QU'UNE FOIS.** `resoudrePlaquage` accepte un
paramètre `abouti` : quand `resoudreChoix` a déjà lancé le dé, il IMPOSE le
résultat au lieu de le retirer. Sans ça, le contact serait arbitré deux fois
et le pourcentage annoncé ne voudrait plus rien dire.

### Ce que chaque option met en jeu

`enjeuDe(e, p, action)` est **pure** — elle ne tire rien, ne mute rien — et
rend trois choses : la chance, ce que la réussite donne, ce que l'échec coûte.
Les deux dernières comptent autant que la première : **62 % de réussite, c’est
excellent pour un plaquage et suicidaire pour un geste qui, raté, offre une
mêlée dans ses vingt-deux.** Un pourcentage seul ne dit pas s’il faut le
prendre.

| Geste | Chance | Réussite | Échec |
|---|---|---|---|
| 💥 Plaquer | `probaPlaquage` | le porteur est au sol | **il perce**, et je reste au sol 3 s |
| ⬆️ Monter | `probaPlaquage` × 0,88 | plaqué avant la ligne d'avantage | un boulevard s'ouvre |
| ↩️ Crochet | `1 − probaPlaquage(crochet)` | **je perce → enchaînement** | plaqué, 13 % de ballon lâché |
| 💪 Raffut | `1 − probaPlaquage(raffut)` | **je perce → enchaînement** | stoppé net |
| 🏃 Sprint | `1 − probaPlaquage(sprint)` | je prends le large | rattrapé |
| 🪝 Gratter | ballon lent + plaquage / distance | turnover | 24 % de pénalité contre soi |
| ⬅️➡️ Passer | mains + pression + longueur | le ballon vit | **en-avant, mêlée pour eux** |
| 🦶 Taper | pied − pression | terrain gagné | **contré**, ballon perdu sur place |
| 🙋 Réclamer | vision + vitesse | **je m'insère dans la combinaison** | personne ne me voit |

⚠️ **LA DISCIPLINE NE PASSE PAS PAR LE DUEL.** Chambrer ou frapper ne se
résout pas en un tirage : ça met le feu, et `bagarre.ts` gère la suite. Pour
eux, `resoudreChoix` arme l'intention comme avant.

### ⚠️ LE PIÈGE QUE LE BANC D'ESSAI A ATTRAPÉ, ET QU'UN HUMAIN N'AURAIT PAS VU

Premier jet : la calibration globale tombait juste (63,3 % annoncés, 63,1 %
sortis) et **chaque tranche était fausse** :

```text
tranche 35-55 %   annoncé 46,3 %  ·  sorti 29,0 %
tranche 55-75 %   annoncé 65,2 %  ·  sorti 78,6 %
```

Un biais **par geste**, invisible en moyenne. La cause : sur une carte de
RÉCEPTION — **treize des dix-huit cartes d’un match** — le ballon n’est pas
encore dans les mains. Il n’y a rien à trancher, le geste reste ARMÉ pour le
contact qui vient… et `resoudreChoix` rendait quand même `reussi: true` sur
cette sortie anticipée. Les crochets de réception « réussissaient » tous, les
plaquages sans porteur « échouaient » tous.

**`Issue.joue`** dit désormais si le dé a été lancé. Le banc n'étalonne que
les duels tranchés, et l’écran n’affiche un verdict que dans ce cas.

### ⚠️ ET L’ÉCRAN AVAIT LE MÊME BUG, MESURÉ EN JOUANT

Le champ existait côté moteur, l'écran ne le lisait pas : la bulle affichait
un **❌ rouge sur un crochet qui n’avait pas encore eu lieu** — relevé seize
fois de suite dans le journal de jeu. Un échec annoncé avant l'action, c'est
pire que pas de retour du tout. Tant que `Issue.joue` est faux, la bulle dit
« ▶️ armé » et attend.

### ⚡ L’ENCHAÎNEMENT : un drapeau posé au fond du moteur

`EtatMatch.perceeJoueur` est levé **dans `resoudrePlaquage`**, à la ligne où
le plaqueur manque son homme. C’est le seul endroit où une percée existe — et
c’est ce qui fait que l’enchaînement marche par les **deux** chemins : le duel
tranché sur-le-champ, et le geste resté armé qui trouve son contact deux
secondes plus tard. Un drapeau posé depuis l'écran n'aurait jamais couvert le
second, qui est pourtant le plus fréquent.

L'écran le **consomme** (`e.perceeJoueur = false`), rouvre une carte sans
attendre le repos de 95 secondes simulées, avec **5 secondes** de réflexion au
lieu de 10 (`DELAI_COMBO`) — on est au cœur de l'action, pas devant un choix
de plan — et la carte le DIT (« ⚡ Tu as percé — enchaîne ! », liseré doré).

⚠️ **DEUX MAILLONS MAXIMUM.** Sans plafond, un joueur en forme enchaînerait
crochet sur crochet jusqu'à l'en-but et le match deviendrait un jeu de cartes.
Et la recharge des actions fait le reste du travail : un crochet qui vient
d'être joué n'est pas reproposé.

### 🎬 Le verdict est posé SUR le joueur

Demande : « fais que ces phrases elles soient au-dessus de soi ». Deux choses
ont disparu pour ça :

- **`.ml-resultat`**, un bandeau centré à 22 % de hauteur. Il disait la bonne
  chose au mauvais endroit : quand on suit son pion, on ne regarde pas le
  milieu de l'écran.
- **`.ml-geste`**, une étiquette SVG collée au pion. Bon endroit, mais elle ne
  savait afficher qu’un libellé — or un verdict de duel est une PHRASE, et une
  phrase demande une largeur maximale, un retour à la ligne et une pastille.

**`.ml-perso`** est une bulle HTML posée aux coordonnées écran du pion, avec
une pointe qui le désigne (il y a trente pions), et trois lignes qui répondent
chacune à une question : *mon clic est passé ?* (▶️ dès le clic) · *ça a
marché ?* (✅/❌ et le % qu’on avait) · *ça a donné quoi ?* (la phrase du
moteur, puis ce que ça a mis sur la feuille de match).

⚠️ **LE BORNAGE SE CALCULE SUR LA TAILLE MESURÉE DE LA BULLE, PAS SUR DES
MARGES FIXES.** Première version : marges de 96 px, alors que la bulle monte à
**315 px de large sur un écran de 375** (84 vw), soit 158 px de demi-largeur.
Mesuré en jeu sur téléphone : **13 relevés sur 13 hors cadre** — la moitié du
verdict passait sous le bord, exactement sur l'appareil où il compte le plus.
Un `ResizeObserver` sur la bulle donne sa taille réelle (elle change quand son
texte change) ; la lire par image forcerait un recalcul de mise en page
soixante fois par seconde, ce qu’on évite déjà pour la scène.

### Ce que le banc d’essai mesure

`scripts/verifDuels.ts` — 48 matchs joués **par le vrai chemin** (`decisionPour`
puis `resoudreChoix`), 799 gestes choisis dont **608 duels tranchés** :

| Contrôle | Résultat |
|---|---|
| annoncé vs sorti, par tranche | 3 % → 0 % · 44 % → 40 % · 67 % → 69 % · 87 % → 88 % |
| écart maximal | **1,0 σ** |
| sur l'ensemble | annoncé 67,1 % · sorti **67,1 %** |
| plaquage réussi → porteur stoppé | **57/57** |
| plaquage raté → il franchit | **3/3**, et le plaqueur reste au sol 3/3 |
| enchaînements | 18 sur 48 matchs (0,4/match), **jamais plus de 2 maillons** |
| score de la ligue | **0 écart sur 48** |

⚠️ **LA TOLÉRANCE SE CALCULE, ELLE NE SE DEVINE PAS.** Un seuil fixe est un
piège sur des lots de tailles inégales : huit points, c'est laxiste sur trois
cents tirages et intenable sur cinquante, où l'écart-type d'une proportion vaut
déjà sept points à lui seul. Chaque tranche est comparée à **deux écarts-types
de sa propre taille** — ce qui refuse un biais systématique et accepte le
hasard. Le premier réglage, à 8 points fixes, a échoué sur du bruit pur.

⚠️ **ET LE SCORE RESTE CELUI DE LA LIGUE.** Ces duels décident du COMMENT,
jamais du COMBIEN. Un joueur qui réussit tout ne gagne pas un match qu’il
devait perdre — il le vit autrement, et sa note de fin de match, elle, monte.

### Vérifié en jouant, desktop et téléphone

```text
[🏉 Le ballon est à toi]  >>> ⬅️ Passe gauche 77 %
   ✅ ⬅️ Passe gauche | 77 % | Baille donne proprement à Perenara. | ➡️ Passe

>>> 💥 Plaquer 92 %
   ✅ 💥 Plaquer | 92 % | Baille se lance sur Simon MALBRAND ! | 💥 Plaquage

>>> ↩️ Crochet 60 %                        (carte de réception : geste ARMÉ)
   ▶️ ↩️ Crochet | 60 % | Ton joueur exécute…
   ▶️ ↩️ Crochet | 60 % | • Le ballon échappe à Baille, en-avant. | ❌ En-avant
```

Sur 375 × 812 : carte en deux colonnes de 161 px, options de 89 à 104 px,
**non défilante**, les cinq répondent à `elementFromPoint`. Bulle du verdict :
**24 relevés, 0 hors cadre**. Et « ↩️ Crochet 6 % » en rouge face à un bon
défenseur — c'est exactement l'information « d'impact » demandée.

```bash
npx vite-node scripts/verifDuels.ts        # étalonnage des %, geste appliqué, enchaînements
npx vite-node scripts/verifMoteur.ts       # l’étalonnage du moteur ne bouge pas
npx vite-node scripts/verifControle.ts     # ne rien choisir = le match qu’on aurait regardé
npx vite-node scripts/verifMatchJouable.ts # caméra, carrefours, en-avants
npx vite-node scripts/verifTraductions.ts  # les 34 clés ajoutées, dans les 7 langues
```

## 🏆 LE CLASSEMENT REFUSAIT UN TIERS DES CARRIÈRES — une borne, et un envoi qui manquait

Retour de jeu : « réduis la sévérité pour être pris dans le classement, la
plupart de mes carrières légitimes ne sont pas retenues ; et aussi, si c'est la
première saison pas finie, c'est pas pris en compte ».

⚠️ **ON N’A RIEN « ASSOUPLI ».** La demande disait « réduis la sévérité », et
c'aurait été le pire réflexe : desserrer des bornes au jugé, c'est ouvrir la
porte aux tricheurs pour corriger un bug qu'on n'a pas cherché. On a mesuré
d'abord — en jouant de vraies carrières, semaine par semaine, et en soumettant
leur fiche à `verifierFiche` après chaque saison. Le verdict est sans appel :

```text
46 fiches soumises · 25 valides
Motifs de refus :  21 × ageDebut hors bornes

Marges des autres bornes (positif = dépassement) :
  matchs/saison le plus haut : 6,5   (borne 50)
  clubs − saisons            : 0     (borne +1)
  capes/saison               : 0,0   (borne 12)
  note au-dessus de noteApres: 0
```

**Un seul motif, et aucune autre borne même approchée.**

### ⚠️ LA CAUSE : DEUX FENÊTRES D’ÂGE QUI NE SE PARLAIENT PAS

| | |
|---|---|
| `screens/Creation.tsx` | on démarre de **16 à 30 ans** |
| `LIMITES.ageDebutMax` | le crible en refusait plus de **24** |

Toute carrière commencée à 25 ans ou plus était donc rejetée — et pas une fois :
**à vie**. `ficheDepuisJoueur` DÉDUIT `ageDebut` de l’âge et du nombre de
saisons (`j.age − saisons + 1`), une valeur qui ne bouge jamais. Le joueur ne
voyait rien non plus : le motif n'est affiché nulle part dans le jeu, l'envoi
est silencieux par construction.

⚠️ **`Creation` LIT DÉSORMAIS `LIMITES.ageDebutMax`.** C'est le seul moyen que
les deux ne puissent plus diverger. Le minimum, lui, reste volontairement **un
an plus bas** que celui de l'écran (15 contre 16) : le crible doit toujours
être au moins aussi permissif que le jeu, jamais l'inverse.

⚠️ **`SCORE_MAX` NE BOUGE PAS** (82 500) : il dépend de `SAISONS_MAX`, calculé
sur `ageDebutMin` — inchangé. **Aucune migration SQL** (le `check` de la
colonne `score` reste bon).

### ⚠️ ET LE BANC D’ESSAI NE POUVAIT PAS L’ATTRAPER

`verifClassement.ts` testait des fiches ÉCRITES À LA MAIN, toutes démarrées à
18 ans. Il vérifiait très bien qu'un tricheur est refusé, jamais qu'un joueur
honnête est accepté. La section **1 bis** rejoue donc les quinze âges de départ
que l'écran propose, sur trois durées de carrière chacun :

```text
✅ le crible couvre le minimum de l’écran (16 ans)      15 ≤ 16
✅ tous les âges de départ jouables sont acceptés       16 à 30 ans, 0 refus
✅ départ à 4 ans                    ageDebut hors bornes (4, attendu 15..30)
✅ départ à 40 ans                   ageDebut hors bornes (40, attendu 15..30)
```

⚠️ **ON NE TESTE PAS UNE BORNE, ON TESTE UNE COUVERTURE.** Le sens de la
comparaison est tout : plus permissif que l'écran est correct, plus strict est
un bug.

### 🗓️ LA CARRIÈRE EN COURS ENTRE AU CLASSEMENT

Second point du retour, et il était exact : l'envoi n'avait lieu qu'à la **fin
d'une saison** et à la **retraite**. Quelqu'un qui joue ses premières journées —
le moment où l'on a le plus envie de se voir quelque part — n'existait nulle
part.

`publierAuClassement(force?)` (store) est désormais appelée **à chaque semaine
jouée**, avec deux freins :

| Frein | Pourquoi |
|---|---|
| le score doit avoir **progressé** depuis le dernier envoi ACCEPTÉ | sinon on renverrait la même fiche chaque semaine |
| un plancher entre deux envois (**3 min 20 s**, soit 60 ÷ `PAR_HEURE`) | le serveur en accepte dix-huit par heure ; se faire jeter par son propre débit serait le comble |

La fin de saison et la retraite passent outre (`force`) : ce sont les deux
moments où la carrière DOIT être posée.

⚠️ **`dernierScoreEnvoye` N'EST ÉCRIT QUE SUR UN ENVOI ACCEPTÉ.** Le noter
avant la réponse enfermerait un joueur hors ligne : son premier envoi
échouerait, le frein se refermerait, et sa carrière n'entrerait jamais.

Vérifié contre un faux serveur, avec un joueur créé **à 27 ans** — un âge qui
était refusé jusqu’ici :

```text
créé : Vétéran, 27 ans, US Oyonnax
saison 1, semaine 13 · envois reçus : 1 · score 512 · ✅ accepté
40 semaines de plus (dans les 10 min) : 1 envoi (la fin de saison, forcée)
```


## 🏉 LA CHAMPIONS CUP REJOUAIT LE MÊME MATCH JUSQU’À LA FINALE

Retour de jeu : « bug avec la Champions Cup, les phases finales sont buguées, je
joue toujours contre la même équipe jusqu’à la finale avec le même score ».

### ⚠️ `EtatCoupe.bracket` CONTIENT TOUS LES TOURS, PAS LE DERNIER

C'est écrit dans son type (« huitièmes → quarts → demies → finale ») et
personne ne l'avait lu comme ça côté écran. `PanneauJoueur` faisait :

```ts
const matchFinal = etat.bracket.find((m) => m.domicile === club || m.exterieur === club);
```

Un `find` rend le **premier** — c’est-à-dire le match du **premier tour** que
le club a disputé. Toutes les semaines de coupe suivantes le lui refaisaient
jouer. Mesuré avant correction :

```text
date 5 · bracket=[barrage]                    Toulouse 35-9 Ulster
date 6 · bracket=[barrage+quart]              Toulouse 35-9 Ulster   ← identique
date 7 · bracket=[barrage+quart+demie]        Toulouse 35-9 Ulster   ← identique
date 8 · bracket=[…+finale]                   Toulouse 35-9 Ulster   ← identique
```

Après :

```text
date 5  barrage  Toulouse 35-9  Ulster
date 6  quart    Toulouse 29-17 Leinster
date 7  demie    Toulouse 18-13 Bordeaux Bègles
date 8  FINALE   Toulouse 23-10 La Rochelle
```

### ⚠️ « LE TOUR LE PLUS PROFOND » NE SUFFISAIT PAS — deux cas limites

Première correction tentée : prendre le match du tour le plus avancé du
tableau. Le banc d’essai a immédiatement montré que ça déplaçait le bug :

- **un club ÉLIMINÉ** rejouait indéfiniment sa défaite d'élimination ;
- **la Prem Rugby Cup**, dont le tableau s'épuise avant la dernière date de
  coupe du calendrier, faisait rejouer sa **finale** une semaine de plus
  (2 cas sur 6 saisons).

`EtatCoupe` porte donc **`ordreTourCourant`** : le rang du tour qui se joue
CETTE semaine-là. Il vaut 0 en phase de poules, et **dépasse le rang de la
finale quand la compétition est terminée** — dans les deux cas, aucun match ne
correspond, et c'est exactement ce qu'on veut dire.

| Fonction | Rôle |
|---|---|
| `ORDRE_TOUR` | exporté : trois écrans en avaient besoin, chacun avait sa copie |
| `matchDuTourCourant(etat, club)` | le match de CE club au tour de la semaine, ou rien |
| `matchsDuTourCourant(etat)` | tous les matchs du tour de la semaine |

### 🩹 Et deux bugs trouvés en le mesurant

- ⚠️ **LES STATISTIQUES DES TOURS PRÉCÉDENTS ÉTAIENT COMPTÉES PLUSIEURS FOIS.**
  `moteur/saison.ts` parcourait `etat.bracket` en entier à chaque semaine de
  coupe pour rejouer les matchs sans rendu — donc les quarts en même temps que
  les demies, puis en même temps que la finale. Et `verser` **accumule** : les
  chiffres de ces matchs entraient deux puis trois fois dans le classement
  individuel. Il ne rejoue plus que `matchsDuTourCourant`.
- ⚠️ **`duel()` N'APPLIQUAIT PAS `scorePossible`.** La règle « on marque par 3,
  5 ou 7 : 1, 2 et 4 sont impossibles » existe depuis longtemps et
  `jouerRencontre` la respecte — mais `duel`, qui décide de **tous** les matchs
  à élimination directe du jeu (coupes d’Europe, phases finales de championnat,
  tournoi amateur de fin d'année), ne l'appelait pas. Relevé à l'écran en
  mesurant le premier bug : **« La Rochelle 20-4 Munster »** en barrage de
  Champions Cup.

  ⚠️ **ET ON DÉPARTAGE APRÈS L’ARRONDI, PAS AVANT** : rabattre 4 sur 3 peut
  CRÉER une égalité (4-3 devient 3-3). Trancher en amont laisserait des matchs
  nuls dans un tableau à élimination directe, où quelqu’un doit sortir.

### Mesuré (`verifCoupesEurope.ts`, section 6)

| | |
|---|---|
| matchs à élimination directe examinés | **402** sur 6 saisons |
| scores impossibles (1, 2, 4) | **0** |
| matchs nuls dans un tableau | **0** |
| semaines où un club rejoue le même match | **0** |
| clubs éliminés à qui on propose encore un match | **0** |

```bash
npx vite-node scripts/verifCoupesEurope.ts  # section 6 : le tour avance, les scores sont du rugby
npx vite-node scripts/verifClassement.ts    # section 1 bis : tous les âges de départ passent
npx vite-node scripts/verifStatsJournees.ts # la simulation de fond ne double plus les tours
npx vite-node scripts/verifTitres.ts        # aucun titre fantôme, aucun titre oublié
```

## 🏉 UNE CARTE À CHAQUE BALLON, ET CINQ GESTES QUI VIENNENT DU POSTE

Demande, mot pour mot : « dès que notre joueur va ou touche le ballon, on a le
choix de l'action ; et rajoute-en de nouvelles en fonction du poste — un arrière
faire un 50/22, une 9 faire une chenille, chandelle pour dégager, foncer en
avant, faire un offload au dernier moment ; et il faut que les actions soient
vraiment effectuées, qu'on le voie visuellement, que ça ait un vrai impact ».

Trois demandes en une, et la troisième est la seule qui compte : un geste ajouté
au type, affiché sur la carte, et qui ne changerait rien à l'état du match,
personne ne le verrait jamais.

### 1. Le rythme : le repos n'est plus le même selon qu'on a le ballon

`decisions.ts` refusait d'ouvrir une carte moins de `REPOS_DECISION` (95 s de
jeu) après la précédente. C'est la bonne règle pour un **carrefour** — plaquer
ou monter, gratter ou pousser — et c'est absurde pour un ballon reçu : un
ouvreur en touche soixante par match, et on lui en donnait quatre.

| | avant | après |
|---|---|---|
| repos, ballon en main | 95 s | **`REPOS_BALLON` = 6 s** |
| repos, carrefour (défense, ruck) | 95 s | 95 s, inchangé |
| compte à rebours | `DELAI_DECISION` = 10 s | **6 s ballon** · 10 s carrefour · 5 s enchaînement |

⚠️ **SIX SECONDES, PARCE QU'IL Y EN A SOIXANTE.** Dix secondes de menu sur une
passe de routine, soixante fois, ce sont **six minutes de formulaire** : mesuré,
ça faisait passer le match de 5,7 à 12,4 minutes. Six secondes, c'est le temps
de LIRE quatre options, pas de calculer.

⚠️ **ET LES TROIS DÉLAIS N'ONT QU'UNE DÉFINITION**, `delaiDeCarte(d)`, parce que
deux lecteurs en ont besoin — l'écran qui arme le compte à rebours, et le banc
d'essai qui calcule la durée d'un match. Recopiée, la règle diverge, et le banc
se met à mesurer un jeu qui n'existe pas.

⚠️ **`Decision.balleEnMain` N'EST PAS `moment === 'reception'`.** Ce moment-là
couvre aussi « je suis le prochain de la combinaison », qui se présente à chaque
phase et ne se concrétise presque jamais : s'y fier donnait **61 cartes de
réception pour 3 ballons réellement joués**.

⚠️ **LE RALENTI SUIT LE GESTE, PAS LA CARTE.** 3,2 s de gros plan après *chaque*
passe, soixante fois, ce sont trois minutes de ralenti sur des gestes qui n'en
demandent pas. Seuls les gestes de `CONTACTS` (plaquage, crochet, raffut,
percussion, offload, grattage, chenille, monter) gardent `REJEU` ; le reste se
lit en `REJEU_COURT` = 1,5 s.

### 2. Le poste : le filtre est une donnée, pas un `if`

`DefinitionAction.pour?: (p: Pion) => boolean` s'ajoute au filtre de situation
déjà porté par le `switch` de `actionsDisponibles`. Les deux sont indépendants :
l'un dit **qui**, l'autre **quand**.

| geste | qui | quand | recharge |
|---|---|---|---|
| **50/22** | `BOTTEUR` : trois-quarts, `pied ≥ 50` | ballon à moi, dans mon camp | 40 s |
| **Chandelle** | `BOTTEUR` | ballon à moi | 14 s |
| **Chenille** | le **numéro 9**, et lui seul | ruck de mon camp | 26 s |
| **Foncer** | un avant | le ballon arrive | 8 s |
| **Offload** | tout le monde | le ballon arrive, un défenseur au contact | 12 s |

⚠️ **LA CHENILLE EST RÉSERVÉE AU NUMÉRO 9, PAS AU « MIEUX PLACÉ ».** Au ruck, le
mieux placé de son camp est presque toujours un avant qui pousse. Le ballon à la
sortie appartient au demi de mêlée ; personne d'autre ne se met là.

⚠️ **ET LE MOMENT DU 9 N'EXISTAIT PAS.** Tout ce qui suit dans `moments.ts` était
gardé derrière « je défends » : le demi de mêlée qui protège son propre
regroupement, ballon à ses pieds, n'avait **aucun moment, aucune carte, aucun
geste** — la situation la plus caractéristique de son poste. Un nouveau moment
`'ruck'` s'ouvre désormais aussi en attaque, et la liste des préférences de ruck
a dû s'élargir avec lui : avec la seule chenille, une carte de ruck offensive
n'aurait eu **qu'une** option, et `MIN_OPTIONS` l'aurait refusée en silence.

⚠️ **L'ORDRE DES PRÉFÉRENCES A ÉTÉ MESURÉ, PAS DEVINÉ.** Placés en tête, les
gestes de poste **évinçaient complètement la passe** — un ouvreur ne se voyait
plus proposer d'écarter. Les passes reviennent en premier, les gestes de poste
juste derrière.

### 3. L'exécution : `resoudreChoix` tranche sur-le-champ

Chaque geste rejoint les `DUELS` — donc un pourcentage annoncé, un dé tiré tout
de suite, une phrase, un effet.

| geste | réussi | raté |
|---|---|---|
| 50/22 | touche dans leurs 22, ballon à nous | le ballon reste en jeu, contre-attaque |
| Chandelle | terrain gagné, ballon à disputer | contré → mêlée pour eux |
| Chenille | `ballonLent`, possession assurée, dégagement tranquille | 45 % pénalité, sinon ballon perdu |
| Foncer | `pos.x` avance de `2,6 + puissance/45`, ballon conservé, ballon rapide | en-avant |
| Offload | le ballon part, le défenseur reste battu 0,6 s | en-avant, mêlée pour eux |

⚠️ **L'OFFLOAD A ÉTÉ ÉCRIT DEUX FOIS, ET LA PREMIÈRE NE FAISAIT RIEN.** Version
initiale : résoudre le plaquage, *puis* tenter la passe. Mais `resoudrePlaquage`
finit sur `formerRuck`, qui met `e.porteur` à `null` — la condition « je porte
encore » n'était donc **jamais** vraie. Le geste déclenchait un plaquage
ordinaire et rien d'autre. Vu dans le journal de jeu, et c'est la seule façon de
le voir : « ✅ Offload — *Maxime Retière joue son geste* », le texte de repli,
parce que le moteur n'avait rien eu à raconter. Le ballon part maintenant
**avant** que le plaquage ne se referme — ce qui est d'ailleurs la définition du
geste. « Au dernier moment » reste vrai : le défenseur est au contact (c'est la
condition d'entrée) et il reste sonné une demi-seconde.

### Mesuré

`scripts/verifDuels.ts` (section 3 bis) et `scripts/verifMatchJouable.ts`
(section 7, réécrite) :

| Contrôle | Résultat |
|---|---|
| annoncé vs sorti, écart maximal par tranche | **0,7 σ** (727 duels tranchés) |
| sur l'ensemble | annoncé 66,3 % · sorti **65,9 %** |
| cartes par ballon touché | **61 cartes pour 60,8 ballons** — jamais deux pour un |
| durée d'un match en décisions | **8,3 min** |
| arrière | 50/22 ×7 · chandelle ×8 · offload ×5 |
| demi de mêlée | chenille ×24 · chandelle ×68 · 50/22 ×45 |
| pilier | percussion ×26 |
| gestes proposés hors poste | **0** |
| gestes tranchés sans effet sur l'état | **0** |

⚠️ **« VRAIMENT EFFECTUÉ » NE SE PROUVE PAS AVEC UN BOOLÉEN DE RETOUR.** Le banc
photographie l'état du match — phase, possession, porteur, intention de vol,
position du ballon, nombre de commentaires, coups de pied, passes, mètres,
offloads — joue le geste, rephotographie, et exige que **quelque chose ait
bougé**. Un geste qui ne change rien est un bouton mort, et on ne le verrait pas
à la relecture.

⚠️ **ET LA BORNE DE CARTES EST RELATIVE, PLUS ABSOLUE.** La section 7 vérifiait
« pas plus de trente-cinq carrefours par match » ; c'était juste tant qu'une
carte était rare. Un plafond en valeur absolue ne veut plus rien dire quand un
ouvreur touche soixante ballons et un pilier dix : on compare désormais aux
ballons **réellement** touchés, comptés sur le front montant (le moteur tourne à
sept pas par seconde — sans ça on compterait sept fois la même possession).

### Vérifié en jouant, desktop et téléphone

```text
>>> [Passe gauche | Passe droite | Crochet | Offload]  → 🤲 Offload
   ✅ 🤲 Offload | 48 % | Offload de Maxime Retière pour Enzo Sallefranque !
                        | 🤝 Offload · ➡️ Passe
>>> [...]                                              → 🤲 Offload
   ❌ 🤲 Offload | 48 % | En-avant de Maxime Retière, mêlée pour Loudun.
                        | ❌ En-avant
```

Sur 375 × 812 : **20 relevés `elementFromPoint`, 0 bouton injoignable, 0 hors
écran**, la cinquième option (« Laisser faire ») comprise. Bulle du verdict de
300 à 315 px de large sur une scène de 363 : bornée à 5 → 338 px, **jamais
coupée**.

```bash
npx vite-node scripts/verifDuels.ts        # 3 bis : chaque poste reçoit ET joue ses gestes
npx vite-node scripts/verifMatchJouable.ts # 7 : une carte par ballon touché, et la durée
npx vite-node scripts/verifControle.ts     # ne rien choisir = le match qu'on aurait regardé
npx vite-node scripts/verifMoteur.ts       # l'étalonnage du moteur ne bouge pas
npx vite-node scripts/verifTraductions.ts  # les 20 clés ajoutées, dans les 7 langues
```

## 🌊 « NOS ACTIONS N'ONT AUCUN IMPACT » — l'élan, l'échappée, et cinq gestes qui mènent à la ligne

Retour de jeu, mot pour mot : « rajoute encore de nouvelles possibilités, et
c'est pas assez fun en mode nos actions n'ont aucun impact dans le jeu ; fais
que par exemple un raffut, un sprint ou un prendre-l'espace mène à un essai si
réussi, ou un turnover relance la dynamique de l'équipe, une passe peut arriver
à une passe décisive, etc. »

### ⚠️ LE DIAGNOSTIC : LE GESTE MARCHAIT, LA SUITE N'EXISTAIT PAS

Le tour précédent avait rendu les gestes réels — un dé tiré sur-le-champ, une
conséquence appliquée, une phrase. Et le reproche restait juste, parce qu'il ne
portait pas sur le geste mais sur **ce qui vient après**.

Battre son vis-à-vis rendait la main au rugby automatique : `ligneDeCourse`
cherchait le prochain intervalle, « fixer et donner » évaluait la passe à chaque
tick, et deux foulées plus loin le pion refaisait une passe de routine. Le duel
gagné ne menait donc **nulle part** — littéralement : il n'existait aucun chemin,
dans le moteur, entre « j'ai battu mon homme » et la ligne d'essai.

Trois chaînes manquaient. Elles sont écrites, et elles se mesurent.

### 1. L'ÉCHAPPÉE — le chemin qui va du duel gagné à l'en-but

`EtatMatch.echappee: { pion, restant }`. Tant qu'elle dure (**7 s simulées**,
soit une cinquantaine de mètres de course) :

| | hors échappée | en échappée |
|---|---|---|
| ligne de course | `ligneDeCourse` : fixer, chercher l'intervalle | **droit sur la ligne d'essai** |
| « fixer et donner » | passe automatique sous 3,7 m de pression | **suspendue** |
| `deciderAvecLeBallon` | peut taper en touche | **suspendu** |
| carte de décision | ballon / réception / défense / ruck | **`espace`**, avec ses propres options |

Elle s'ouvre par quatre chemins, et **`lancerEchappee` est le seul endroit qui
les couvre tous** : la percée choisie sur une carte, la percée subie par le
plaqueur (au fond de `resoudrePlaquage`, donc y compris pour un geste resté
armé), le chip repris, l'interception. Elle s'éteint toute seule, et dès que le
ballon quitte les mains — passé, tapé, ou perdu.

⚠️ **« MÈNE À UN ESSAI » NE VEUT PAS DIRE « DONNE UN ESSAI ».** Le score reste
celui de la ligue, et c'est la règle d'architecture la plus importante du
moteur : `tenterEssai` refuse un essai qui dépasserait le plan de marque, et le
ballon est alors tenu en-but. Ce qui a changé, c'est que **le chemin existe et
qu'il est emprunté**.

### 2. LA DYNAMIQUE — `src/lib/moteur/elan.ts`

Un seul nombre **signé**, de −1 (le camp B est dessus) à +1. Pas deux jauges :
l'élan est un rapport de force, ce que l'un prend l'autre le perd — deux
compteurs indépendants auraient laissé les deux équipes être portées en même
temps, ce qui ne veut rien dire sur un terrain de rugby.

| Évènement | Poussée |
|---|---|
| **ballon volé** (grattage, interception, contre-poussée) | **+0,50** |
| la ligne d'avantage franchie | +0,26 |
| essai | +0,42 |
| en-avant | −0,24 |
| pénalité concédée | −0,14 |

Demi-vie **40 secondes** simulées : une possession, deux au plus. Un ballon volé
à la 12ᵉ minute ne porte pas l'équipe jusqu'à la sirène.

⚠️ **ET CE N'EST PAS UNE DÉCORATION.** `bonusElan` entre dans `probaPlaquage` et
`probaGrattage` — les deux duels qui décident le contact et les turnovers. Donc
`enjeuDe` l'**affiche** et `resoudreChoix` le **tire** : c'est la même ligne.
Après un ballon volé, « 💥 Plaquer 88 % » devient « 💥 Plaquer 94 % ». Mesuré :
**10,8 points d'écart** sur le pourcentage annoncé entre une équipe portée et une
équipe dominée. Une jauge qui ne déplacerait aucun chiffre ne serait qu'une barre
de couleur.

⚠️ **POURQUOI UN FICHIER À PART, ET PAS TROIS LIGNES DANS `moteur.ts`.** Trois
lecteurs en ont besoin et ils ne peuvent pas s'importer entre eux : `moteur.ts`
pousse, `controle.ts` et `decisions.ts` lisent — et ces deux-là ne connaissent
pas `moteur.ts`, c'est l'inverse (entête de `controle.ts`). Un module sans
dépendance, comme `terrain.ts`, est le seul endroit où la règle peut vivre une
seule fois.

### 3. LES RETOMBÉES — « une passe peut arriver à une passe décisive »

`EtatMatch.echos`, une file que l'écran vide et affiche (`.ml-retombee`).

La statistique existait depuis longtemps (`stats.passesDecisives`, créditée dans
`tenterEssai`). Le problème n'était pas de la compter, c'était que **quarante
secondes séparent la passe de l'essai qu'elle amène** : le fil a défilé, la carte
est refermée, et personne ne fait le lien. Elle n'apparaissait qu'à la feuille de
match, une heure plus tard. C'est exactement ce qui donne le sentiment qu'un
geste ne sert à rien.

Deux retombées pour l'instant, et un chaînon pour la seconde
(`EtatMatch.dernierTurnover`) :

- **« Passe décisive : ton ballon a fini dans l'en-but par X ! »**
- **« Ton ballon volé a amené l'essai de X ! »** (dans les 40 s)

### Les cinq nouveaux gestes — 20 actions → 25

| geste | qui | quand | recharge | réussi | raté |
|---|---|---|---|---|---|
| 🕳️ **Prendre l'espace** | tous | le ballon arrive, **un trou ≥ 7 m près de soi** | 52 s | rideau battu, **échappée** | plaqué, ballon lent |
| 🪁 **Par-dessus** | trois-quarts, `pied ≥ 42` | ballon en main, un défenseur à moins de 13 m, hors de ses 22 | 46 s | on avance de `12 + pied/12` m, **échappée** | le ballon leur revient, contre-attaque |
| 🤿 **Plonger** | tous | ballon en main, **à 12 m de la ligne** | 10 s | `tenterEssai` | tenu, ou en-avant |
| 🦅 **Intercepter** | tous | une passe en l'air **pour eux**, à 12 m | 50 s | turnover + **échappée** | 2,8 s hors du jeu, trou béant |
| 🐘 **Contre-poussée** | un avant | ruck qu'on défend, à 8 m | 24 s | turnover, ballon rapide | on sort en retard, 28 % de pénalité |

⚠️ **RECHARGES TRÈS LONGUES, ET C'EST LEUR CONTREPARTIE.** Ce sont des paris, pas
des tactiques. Sans ça le banc d'essai relèverait dix percées par match là où le
rugby professionnel en compte deux à quatre pour QUINZE joueurs.

### ⚠️ Quatre défauts que seule la mesure pouvait attraper

Aucun ne se voit à la relecture. Tous ont été trouvés par le banc d'essai ou
dans le journal de jeu.

1. **`intervalle` mesurait le plus grand trou DU TERRAIN.** Un pilier au ras du
   ruck se voyait proposer « prendre l'espace » parce qu'il restait vingt mètres
   de libre à l'autre bout — bords de touche compris. Mesuré : **13,7 percées
   proposées par match et 56 % de réussite**. Elle mesure désormais le segment
   dans lequel on court **et ses deux voisins** : on se déporte d'une foulée, pas
   de vingt mètres. Et la chance se compte sur ce qui DÉPASSE l'écartement normal
   du rideau (~6 m), pas sur l'écart brut.
2. **LA CARTE DE L'ESPACE NE S'OUVRAIT JAMAIS** — zéro sur vingt matchs, alors
   que le test était écrit. Deux causes cumulées : il était posé **après**
   `if (e.porteur === p) return 'ballon'` dans `lireMoment`, or pendant une
   échappée on EST le porteur ; et le repos de 6 s des cartes de ballon venait
   d'être remis à zéro par la carte qui avait lancé la percée, alors que
   l'échappée n'en dure que 7. D'où `REPOS_ESPACE = 3`. **C'est la même erreur
   que le 9 à son propre ruck, au tour d'avant : un moment plus spécifique se lit
   toujours avant le moment général.**
3. **L'INTERCEPTION ÉTAIT INATTEIGNABLE.** Zéro proposée sur vingt matchs, pour
   une raison purement mécanique : pendant un vol il n'y a pas de porteur, donc
   pas de moment `defense`, donc pas de carte. Le geste était dans le type, dans
   la liste des préférences, dans le moteur — et personne ne pouvait le jouer.
4. **DEUX GESTES NE FAISAIENT RIEN DANS CERTAINS CAS.** Une contre-poussée ratée
   sans coup de sifflet (72 % du temps) ne changeait **rien** ; une percée ratée
   au bord du rideau, sans plaqueur à proximité, non plus. Deux boutons muets,
   attrapés par l'empreinte avant/après.

Et un cinquième, vu dans le journal de jeu : **la phrase contredisait le
verdict**. Un chip raté affichait « ❌ » au-dessus de « *Coup de pied rasant de
Maxime Retière derrière la défense !* » — parce que `phraseDepuis` rend le
PREMIER commentaire écrit sur mon joueur, et que `taperAuPied` parlait avant
nous. L'échec se raconte donc maintenant **avant** de taper.

### Mesuré

`scripts/verifDuels.ts`, section **3 ter** (20 matchs joués carte par carte, le
joueur choisissant systématiquement le geste qui doit mener quelque part) :

| Contrôle | Résultat |
|---|---|
| échappées ouvertes | **5,1/match** |
| cartes « tu es dans l'espace » | 2,5/match |
| essais du joueur | **5** |
| ballons volés qui poussent la dynamique | **19/19** |
| pic d'élan atteint | 0,65 |
| retombées annoncées au joueur | **6** |
| les cinq gestes proposés en jeu | **5/5** |
| … et tous joués | **5/5** |
| … et aucun sans effet sur l'état | **0** |
| la dynamique déplace le pourcentage annoncé | **10,8 pts** |

Et rien n'a bougé ailleurs : étalonnage des duels **1,6 σ** au pire (65,2 %
annoncés · 65,8 % sortis sur 722 duels tranchés), **0 écart sur 48 matchs** avec
le score de la ligue, `verifMoteur` dans toutes ses cibles (42,6 points,
5,6 essais, 223,9 plaquages, 18,3 percées), et le rythme des cartes inchangé —
62,5 cartes pour 61,3 ballons touchés, **8,4 min** par match.

⚠️ **`battu` FAIT PARTIE DE L'EMPREINTE DU BANC, et ce n'est pas une
complaisance** : une interception ratée ne change ni la phase, ni la possession,
ni le ballon — son unique conséquence est que le défenseur est **sorti du jeu**
près de trois secondes, et c'est la plus chère du lot.

### Vérifié en jouant

```text
>>> [Passe gauche | Passe droite | 🕳️ Prendre l’espace | Chandelle]  → 🕳️ 37 %
   ✅ 🕳️ Prendre l’espace | 37 % | Maxime Retière est dans l’espace,
                                   plus personne devant ! | ⚡ Défenseur battu
>>> ⚡ Tu as percé, enchaîne !  [🪁 Par-dessus | Passe gauche | Passe droite | 🤲 Offload]
```

La carte d'enchaînement porte bien les options de l'**espace** (plonger, chiper,
servir le soutien) et non celles d'un ballon ordinaire. La jauge de dynamique se
lit en tête d'écran, part du milieu dans les deux sens, et **retombe visiblement**
(relevé : 20 % → 9 % pour eux, puis 2 % pour nous).

Sur 375 × 812, rechargé à cette taille : **162 relevés `elementFromPoint`,
0 bouton injoignable, 0 élément hors écran** — les cinq options, la bulle du
verdict et la jauge comprises.

⚠️ **UNE NOTE SUR LA MESURE MOBILE, parce qu'elle a coûté un faux positif.**
Redimensionner la fenêtre du navigateur d'aperçu **ne déclenche pas** l'évènement
`change` de `matchMedia` : `useLarge` restait à `true`, la colonne de droite
occupait 313 px des 375, et la carte de décision tombait à 33 px de large. Rien à
corriger dans le jeu — sur un téléphone, la page se charge à la bonne taille et
une rotation notifie bien. **Il faut recharger la page après un
redimensionnement émulé avant de mesurer quoi que ce soit.**

```bash
npx vite-node scripts/verifDuels.ts        # 3 ter : le geste mène quelque part, l’élan se lit sur le bouton
npx vite-node scripts/verifMoteur.ts       # l’étalonnage du moteur ne bouge pas
npx vite-node scripts/verifMatchJouable.ts # le rythme des cartes et la durée d’un match
npx vite-node scripts/verifControle.ts     # ne rien choisir = le match qu’on aurait regardé
npx vite-node scripts/verifTraductions.ts  # les 45 clés ajoutées, dans les 7 langues
```

## 🌍 LA COUPE DU MONDE N'EXISTAIT PAS, ET LE CLASSEMENT MONDIAL SE CALCULAIT AILLEURS

Quatre retours de jeu en un message : « gros bug, il n'y a jamais de Coupe du
monde jouée ; ensuite c'est toujours les mêmes matchs pour la tournée d'été ; et
c'est le classement mondial qui doit bouger, pas un classement de toutes les
nations ; enfin, lorsque notre joueur est en fin de contrat, ouvre 𝕏 sur les
messages avec les propositions des autres clubs ou la prolongation ».

Quatre causes distinctes, et aucune n'était celle qu'on aurait devinée.

### 1. ⚠️ LA COUPE DU MONDE SE DÉCLENCHAIT BIEN — ELLE N'ÉTAIT PAS UN TOURNOI

Premier réflexe vérifié avant de toucher quoi que ce soit :
`fenetreInternationale` **rendait bien** `coupeDuMonde` aux saisons 4, 8 et 12,
sur les trois dates de la fenêtre d'automne. Le déclenchement n'a jamais été en
cause. Ce qui n'existait pas, c'est le tournoi.

`COUPE_DU_MONDE` était déclarée comme une compétition **ordinaire** : 24 nations,
4 journées, un classement au barème rugby. Trois conséquences, toutes visibles :

| | |
|---|---|
| **elle ne se terminait jamais** | 4 journées déclarées, **3 dates** au calendrier : la dernière n'était jamais jouée |
| **ni poule, ni quart, ni finale** | vingt-quatre nations tirées au carrousel dans un mini-championnat |
| **le titre allait au premier d'une ligue tronquée** | c'est-à-dire à qui avait eu les trois adversaires les plus tendres |

**`src/lib/mondial.ts`** en fait un vrai tournoi, sur les trois dates
disponibles :

- **S10 et S11 — les poules.** 4 poules de 6, chaque nation joue **deux** matchs
  contre deux adversaires différents. ⚠️ C'est exactement le format des coupes
  d'Europe depuis 2023-24 (« 4 matchs dans une poule de 6 », entête de
  `coupe.ts`) : le jeu sait déjà le lire, le classer et l'afficher.
- **S12 — le tableau final.** Les **deux premiers de chaque poule** (8),
  **croisés** (un premier ne rencontre pas un premier en quart), disputent
  quarts, demies et **finale**.
- **Le vainqueur est celui de la FINALE**, plus le premier d'un tableau :
  `EtatInternational.vainqueur` porte l'information et `resoudreTrophees` la lit.

⚠️ **LES TROIS TOURS DU TABLEAU TOMBENT LE MÊME WEEK-END, ET C'EST LE SEUL
COMPROMIS.** Le joueur ne dispute qu'un match par date de calendrier : il joue le
quart de finale de sa nation et voit le reste du tableau se dérouler.
L'alternative — étaler le tableau — demanderait de supprimer la tournée d'automne
**et** deux journées de championnat une saison sur quatre, donc de changer le
nombre de journées de la saison et tout l'étalonnage qui en dépend.

⚠️ **ET LE PREMIER TIRAGE DE POULE FAISAIT REJOUER UNE AFFICHE SUR TROIS.** Il
avait l'air juste : 1-6, 2-5, 3-4, puis 4-1, 5-2, 6-3. On croit avoir tout
décalé, mais **2-5 et 5-2 sont le même match** — le banc d'essai a relevé douze
doublons sur trois éditions. Une poule où deux nations se rencontrent deux fois
pendant qu'elles en ignorent trois autres n'est pas une poule. C'est la rotation
du carrousel qu'il fallait : la première fixe, les cinq autres qui tournent.

### 2. ⚠️ LA TOURNÉE D'ÉTÉ CHANGEAIT BIEN — ELLE NE VOULAIT RIEN DIRE

Mesuré avant de corriger : **six grilles distinctes sur six saisons**. Le tirage
n'était pas figé. Le problème était ailleurs, et il saute aux yeux dès qu'on lit
les affiches produites :

```text
S1  Biélorussie 0-81 France      S4  Russie 0-61 France
S3  États-Unis 0-43 France       S6  France 68-0 Zimbabwe
```

`calendrier()` déroulait un carrousel sur **trente-deux nations de tous niveaux
mélangées**. Trois étés de suite avec ce programme et on ne distingue plus une
tournée d'une autre : elles se ressemblent parce qu'**aucune ne ressemble à
quelque chose**.

En juillet, le Nord va chez le Sud. `grilleTourneeEte` apparie donc chaque nation
du Nord à un hôte tiré à la graine de la saison, **l'hôte recevant** — c'est le
sens même d'une tournée. Et les nations restantes sont **triées par force puis
appariées deux à deux** : une fédération ne programme pas un test qu'elle sait
perdu de cinquante points.

| | avant | après |
|---|---|---|
| la France en tournée | Biélorussie, Zimbabwe, Russie | **Argentine, Japon, Afrique du Sud, Chili** |
| affiches à l'envers (le Nord reçoit) | — | **0** |
| déroutes à 60 points et plus | 6 sur 128 | **0** |
| grilles distinctes sur 8 saisons | 8 | 8 |

### 3. ⚠️ LE CLASSEMENT MONDIAL SE CALCULAIT SUR D'AUTRES RÉSULTATS QUE CEUX AFFICHÉS

C'est le défaut le plus grave du lot, et il ne se voyait nulle part.

`appliquerCompetitionAuClassement` rejouait chaque match avec la graine
`` `rang#${id}#${saison}#…` `` alors que l'écran utilisait `` `${id}#${saison}#…` ``
tout court. **Deux graines, donc deux scores.** La France pouvait gagner 30-10 à
l'écran et perdre dans le calcul du rang — un classement qui bouge sans rapport
avec ce qu'on vient de jouer se lit exactement comme « le classement ne bouge
pas ».

**`matchsInternationaux(c, saison, jusqua, apport)`** est désormais la source
unique : l'écran, les affiches et le classement mondial lisent la même chose. Et
elle sait que la Coupe du monde n'est pas un championnat — ses matchs viennent de
`mondial.ts`, et son tableau ne peut pas être rejoué par `jouerTestMatch`, qui
rendrait des matchs nuls en phase à élimination directe.

**Le classement BOUGEAIT déjà**, d'ailleurs — mesuré, la France passe
4ᵉ → 3ᵉ → 5ᵉ → 2ᵉ sur huit saisons. Ce qui manquait, c'est qu'on le VOIE :

| | avant | après |
|---|---|---|
| visibilité | derrière un bouton replié | **affiché** |
| lignes | **114 nations**, l'annuaire des fédérations | **top 20 + ma nation**, le reste au clic |
| mouvement | aucun repère | **▲ / ▼** contre le rang du début de saison |

⚠️ **MA NATION RESTE AFFICHÉE MÊME 60ᵉ.** Sans elle, le classement ne parle pas
de la carrière en cours — et c'est précisément ce qui en faisait « un classement
de toutes les nations » plutôt que le sien.

### 4. LA FIN DE CONTRAT MÈNE ENFIN QUELQUE PART

Le mécanisme existait **entièrement** : `susciterApproches` fait écrire les clubs
depuis longtemps. Il était simplement invisible — les propositions arrivent en
**message privé sur un réseau social** qu'on n'a aucune raison d'ouvrir ce
jour-là, et le seul signal était une **pastille bleue** sur un onglet. Le journal
disait « ouvre tes messages » et laissait le joueur sur un écran où le bouton
refusait d'avancer sans dire où cliquer.

- **`ouvrirSocialSur`** (store, **non persisté** — c'est un ordre donné à
  l'écran, comme `attenteEvenement`) et `ouvrirMessagesOvale()`.
- **Quand le contrat expire et bloque la semaine, on EMMÈNE le joueur** sur 𝕏 →
  Messages. On ne lui dit plus d'y aller.
- **Une alerte pleine largeur** dans le panneau de carrière dès la dernière année
  de contrat : « ✍️ Dernière année de contrat — 3 clubs t'écrivent sur 𝕏
  L'Ovale → Ouvrir mes messages ». ⚠️ Un bouton, pas une pastille : une fin de
  contrat est le moment le plus décisif d'une carrière, elle ne se lit pas au
  milieu de sept compteurs de statistiques.

⚠️ **LE HOOK VIT AVANT LE PREMIER RETOUR ANTICIPÉ.** Posé après
`if (!joueur) return null`, il n'est pas appelé au même rang à chaque rendu :
React l'interdit, et `oxlint` l'a signalé immédiatement (`rules-of-hooks`).

### Mesuré (`scripts/verifInternational.ts`, sections 7 à 9)

| Contrôle | Résultat |
|---|---|
| poules | **4 × 6 nations**, deux matchs chacune |
| adversaires joués deux fois | **0** (12 avant correction) |
| tableau | quart ×4 · demie ×2 · **finale** |
| nuls à élimination directe · scores impossibles | **0 · 0** |
| un champion du monde par édition | **3/3** — Nouvelle-Zélande, Nouvelle-Zélande, Afrique du Sud |
| le vainqueur du jeu est celui de la finale | ✅ |
| tournée d'été : affiches à l'envers | **0** |
| … déroutes à 60 points | **0 sur 128** |
| … grilles distinctes | **8 sur 8 saisons** |
| le rang d'une nation change avec les saisons | **oui** (France 4 → 3 → 5 → 4 → 5) |
| un sans-faute monte, une bredouille descend | **2/2** |

⚠️ **UN CONTRÔLE DU BANC ÉTAIT FAUX, ET IL FAUT SAVOIR POURQUOI.** La première
version comparait le classement de la semaine 1 à celui de la semaine 40 en
attribuant l'écart au Tournoi — alors que la **tournée d'automne** tombe entre
les deux. Une nation qui gagnait cinq matchs en février après en avoir perdu
trois en novembre descendait, et le contrôle criait au bug (1/4). Et sa seconde
version était encore trop stricte : l'échange World Rugby est **pondéré par
l'écart de note**, donc battre beaucoup plus faible que soi ne rapporte presque
rien — une nation à quatre victoires et une défaite peut terminer à l'équilibre,
et c'est exact. On ne teste donc que les bilans qui ne se discutent pas : le
Grand Chelem et la bredouille.

### 🩹 Et un débordement horizontal, préexistant, trouvé en affichant les poules

Le Mondial affiche quatre poules, donc `.grille-poules` — et sur 375 px la page
partait à **483 px de large**. La règle mobile existait pourtant :
`.grille-poules { grid-template-columns: 1fr }`.

⚠️ **`1fr` VAUT `minmax(auto, 1fr)`**, et cet `auto` est le MIN-CONTENT de la
poule, c’est-à-dire les dix colonnes de son classement. La colonne se calculait
donc à **467 px** dans un conteneur de 345, le bloc suivait, et tout le document
avec. `minmax(0, 1fr)` autorise la colonne à se serrer ; le tableau défile alors
dans sa propre boîte, ce que `.classement-tableau` sait déjà faire.

⚠️ **CE N’EST PAS UN DÉFAUT DE CE LOT** : les poules des coupes d’Europe
utilisent la même grille et débordaient déjà. Elles sont corrigées avec.

### Vérifié en jouant

```text
Coupe du monde, saison 4
  Quarts   Afrique du Sud 28-9 Angleterre · Irlande 29-16 Australie
           Japon 31-13 Géorgie · Nouvelle-Zélande 34-10 Italie
  Demies   Afrique du Sud 29-23 Irlande · Japon 5-33 Nouvelle-Zélande
  FINALE   Afrique du Sud 19-23 Nouvelle-Zélande      🏆 Nouvelle-Zélande

Classement mondial (le même écran, juste après)
  1 · Nouvelle-Zélande · 97,03 · ▲ 1
  2 · Afrique du Sud   · 96,13 · ▼ 1
  5 · France 🫵        · 88,84 · ▼ 2
```

Le champion du monde monte d’un rang dans la foulée : le classement suit bien
les résultats qu’on vient de voir. La tournée d’été affiche « Espagne - France »,
« Afrique du Sud - Irlande », « Tonga - Angleterre », « Argentine - Écosse ».
Et l’alerte de fin de contrat ouvre 𝕏 **directement sur l’onglet Messages**,
vérifié à `elementFromPoint` : joignable sur ordinateur comme sur 375 × 812,
où la page ne déborde plus (`scrollWidth` 483 → **375**).

```bash
npx vite-node scripts/verifInternational.ts # 7 à 9 : Mondial, tournée d’été, classement mondial
npx vite-node scripts/verifTitres.ts        # le titre mondial va bien au vainqueur de la finale
npx vite-node scripts/verifSelection.ts     # les petites nations restent atteignables
npx vite-node scripts/verifClassementWorldRugby.ts # la formule World Rugby elle-même
```

---

## 🩹 CINQ RETOURS DE JEU — deux distinctions fantômes, un nom perdu, un Mondial invisible

### ⚠️ 1 et 2. « MEILLEUR JOUEUR DES 6 NATIONS EN ÉTANT SUD-AFRICAIN » — et « meilleur joueur de l'année en Nationale 2 »

Deux symptômes, **une seule cause** : `SaisonJugee.tournoi` était un **booléen**
là où il fallait un identifiant.

```ts
const selectionne6N = selectionne && !!sonTournoi;   // « il joue LA compétition de sa fenêtre de février »
tenter(HONNEUR_TOURNOI, BARRES.tournoi, 'tournoi', s.tournoi);   // → toujours `meilleurSixNations`
```

Or la fenêtre de février n'est pas le Tournoi pour tout le monde : un Springbok
y dispute **The Rugby Championship**, un Portugais le **Rugby Europe
Championship**. Le drapeau disait « il a joué un tournoi de sélections », et on
en déduisait le Tournoi des 6 Nations. Un booléen ne peut pas porter une
information à dix réponses possibles.

- **`HONNEUR_PAR_INTERNATIONAL`** (`data/trophees.ts`) remplace la constante
  `HONNEUR_TOURNOI` en dur. ⚠️ **Elle n'a qu'UNE entrée**, comme
  `MEILLEUR_JOUEUR_PAR_DIVISION` n'en a que cinq sur trente-trois championnats :
  une distinction n'existe dans le jeu que si elle a son `.glb` dans
  `public/m3d/`, et la rareté est ce qui lui donne sa valeur. Pour ouvrir le
  Rugby Championship, il faut d'abord livrer son modèle.
- `SaisonJugee.tournoi: boolean` devient **`tournoiId?: string`**, et
  `BilanSaison.selectionne6N` devient **`tournoiId`**.

**Et le second symptôme tombait par le même trou.** La couronne mondiale exige
de jouer « là où le monde regarde » — un championnat qui élit, la Champions Cup,
**ou une sélection**. Ce troisième chemin s'ouvrait donc pour un joueur de
Nationale 2 convoqué chez lui. Or `noterSaison` est **relative au groupe** : trop
fort pour son étage, on frôle le 10 sans effort (« j'avais 9,6 de moyenne »).

La vitrine mondiale demande maintenant **deux choses**, pas une : jouer là où le
monde regarde **ET** dans un club professionnel. `SaisonJugee.niveau` porte le
niveau de la compétition, et la coupure est celle du moteur de match
(`NIVEAU_PRO_MAX = 3` : au-dessus de la Nationale 2). Deux coupures différentes
pour la même question finiraient par se contredire.

### ⚠️ 3. « SI ON NE MET PAS DE NOM, ON N'APPARAÎT PAS DANS LE CLASSEMENT »

Il y apparaissait — **sous un identifiant technique que rien ne rattachait au
joueur**. Deux bugs sur la même ligne de `creerJoueur` :

```ts
nom: input.nom.trim() || nomAleatoirePourNation(input.nation),   // ✅ le nom est bien tiré
pseudo: pseudoDe(input.nom.trim() || 'Anonyme'),                 // ❌ calculé sur le champ VIDE
```

Le personnage s'appelait « Matis Page-Relo » à l'écran et **« @anonyme_59 »**
partout ailleurs. Le nom est désormais tiré **avant** tout le reste
(`nomChoisi`), et le pseudo 𝕏 en dérive.

⚠️ **ET LE CLASSEMENT MONDIAL AFFICHAIT LE HANDLE 𝕏, PAS LE NOM.** La chaîne de
`ficheDepuisJoueur` était `pseudo ?? j.pseudo ?? j.nom` — or `j.pseudo` est
l'identifiant de L'Ovale (`colin_gomez_12`). **Tout le monde** figurait au
classement sous un handle, pas seulement les carrières sans nom ; c'est juste
qu'« anonyme_59 » rend le défaut visible. Elle devient `pseudo || j.nom` : seul
un pseudo CHOISI exprès passe devant le nom du personnage.

### ⚠️ 4. « AUCUNE TRACE DE LA COUPE DU MONDE »

Elle se jouait bien (lot précédent) — mais **uniquement à l'intérieur du
sélecteur de compétition, une saison sur quatre, pendant trois semaines de
novembre**. Il fallait donc déjà savoir qu'elle avait lieu pour aller la
chercher : de l'extérieur, elle n'existait pas.

Une **carte permanente** s'ouvre en tête de l'écran 📊 Résultats, qu'elle se joue
ou non : la saison où elle tombe (« Saison 4, dans 3 saisons »), les dates, le
format, si **ta** sélection y est qualifiée, et les **quatre poules dépliables**.

⚠️ **ET LES POULES SONT LISIBLES DES ANNÉES À L'AVANCE**, parce que le tirage est
**déterministe** (graine `mondial#saison`). Ce n'est donc pas une promesse en
l'air : ce sont exactement les poules qui seront jouées. C'est ce qui donne un
horizon à une carrière de sélection. Relevé en jeu à la saison 1 pour l'édition
de la saison 4 : Poule A Afrique du Sud · Écosse · Géorgie · Espagne · Pays-Bas ·
Suisse — Poule B Angleterre · **France** · Japon · Uruguay · Namibie · Suède…

### 5. Le classement des nations repart REPLIÉ

Demande : « faut que le classement points des nations soit caché, en mode un
bouton pour le voir comme avant ». **C'est un retour en arrière assumé** : le lot
précédent l'avait ouvert d'office pour répondre à « le classement mondial doit
bouger ». C'était la mauvaise lecture — ce qui manquait, c'était de **voir** qu'il
bougeait, pas d'avoir vingt lignes de points en tête d'écran à chaque visite.

Trois états au lieu de deux : **fermé** (par défaut) → **top 20 + ma nation** →
**les 114**. La ligne « ta sélection est 4ᵉ mondiale, à 6,53 points du leader »
reste toujours affichée : c'est un fait sur la carrière en cours, pas un
annuaire.

### Ce qui a été vérifié

`verifHonneurs.ts` gagne les deux régressions sous test : quatre tournois qui ne
donnent AUCUN trophée du Tournoi (`rugbyChampionship`, `recEurope`,
`americasChamp`, `oceaniaCup`), et cinq étages amateurs qui ne donnent AUCUNE
couronne mondiale même avec 9,8/10 et une sélection — tout en la laissant
atteignable en Top 14.

⚠️ **DEUX ÉCHECS DE `verifHonneurs.ts` SONT ANTÉRIEURS À CE LOT**, vérifié en
remisant les fichiers (`git stash`) : « le palmarès de l'année déplace la cote »
(58,6 → 61,4 → 64,5 pour un seuil de +4 par titre) et la section 9 (0 distinction
sur 60 carrières), cette dernière étant le symptôme connu de
« LES SCRIPTS DE MESURE NE MESURENT PLUS RIEN » plus haut. Ils ne sont pas
corrigés ici.

---

## 🧑‍🏫 LE MODE MANAGER — couche 1 : qui entraîne quoi, et ce que ça devient

Demande : « prépare le mode manager du jeu, où on peut manager n'importe quel
club **avec de l'expérience** ; si on crée notre carrière manager on peut
commencer que dans des petits clubs puis évoluer dans de plus gros ; et si à la
fin de notre carrière joueur on peut devenir entraîneur, avec notre statut on
peut avoir de meilleurs clubs ; sinon mettre un mode cheat où on peut partir avec
n'importe quel club mais donc pas dans le classement mondial ».

Deux arbitrages tranchés avant d'écrire une ligne :

| Question | Réponse de l'utilisateur |
|---|---|
| Ce qu'on fait en tant que manager | **« Les deux, en couches »** : la gestion (objectifs, effectif, marché) ET le match coaché, livrés sur plusieurs tours |
| Le classement | **Plusieurs classements de catégories, plus un total** comprenant les trois familles |

**Ce tour livre la couche 1, et seulement elle** : la charpente d'accès. Composer
le XV, coacher le match et le marché des transferts viennent par-dessus. Les
poser d'abord évite le piège classique — écrire la semaine du manager, puis
découvrir qu'on ne sait pas dire si un débutant a le droit de prendre le Stade
Toulousain.

| Fichier | Rôle |
|---|---|
| `src/lib/manager.ts` | **Les règles, pures.** Prestige, `noteMaximale`, `clubsAccessibles`, `objectifDuBoard`, `verdictDeSaison`, `salaireManager`, `prestigeDepuisJoueur`. Aucune dépendance au store, aucun DOM : testable sans navigateur. |
| `src/screens/CreationManager.tsx` | Le mode (carrière ou libre), le nom, la nation, l'âge, le banc, et le contrat qu'on signe. |
| `src/screens/Manager.tsx` | La carrière : classement, objectif, prestige, confiance du board, semaine suivante, parcours, journal. |
| `src/store/useGame.ts` | `manager`, `creerManager`, `signerBanc`, `semaineManager`, `saisonManager`, `quitterBanc`, `reconversionManager`. |
| `scripts/verifManager.ts` | Le banc d'essai, 6 sections. |

### ⚠️ UNE SEULE JAUGE : LE PRESTIGE

On aurait pu séparer « expérience », « réputation » et « palmarès » : trois
nombres qui disent la même chose, qu'il faut équilibrer les uns contre les
autres, et dont deux finissent par ne servir à rien. Le prestige (0-100) les
résume, et il n'ouvre qu'une chose — **des clubs** :

```
noteMaximale(prestige) = 30 + prestige × 0,58        (+ MARGE_AMBITION = 2)
```

| prestige | clubs ouverts | étage le plus haut | meilleur club |
|---|---|---|---|
| 6 (départ) | **37** | Régionale 2 | Marseillais (35,5) |
| 20 | 252 | Fédérale 3 | Pouyastruc (43,6) |
| 40 | 631 | Fédérale 1 | Burgos (55,2) |
| 60 | 790 | Nationale | Highlanders (66,6) |
| 80 | 833 | Pro D2 | Leicester Tigers (78,4) |
| 100 | **855** (tout) | Premiership | Stade Toulousain (89,9) |

⚠️ **ON LIT LA FORCE RÉELLE DE L'EFFECTIF, PAS LA NOTE DE LA DIVISION.**
`NOTE_PAR_NIVEAU` dit ce que vaut un étage ; elle ne dit pas qu'un club de
Fédérale 1 en pleine génération dorée (`lib/generations.ts`) vaut mieux qu'un
promu de Nationale. Sans ça, « progresser vers de plus gros clubs » ne serait
qu'un changement de libellé.

⚠️ **LA CARRIÈRE DE MANAGER EST MONDIALE, contrairement à celle de joueur.** Le
balayage couvre les 855 clubs des 33 compétitions : à 60 de prestige, le meilleur
banc à portée est celui des **Highlanders**. C'est une conséquence de
`clubsAccessibles`, et elle est voulue — un entraîneur va où on l'appelle.

### ⚠️ DEUX DÉFAUTS DE CONCEPTION ATTRAPÉS PAR LE BANC D'ESSAI, DÈS SA PREMIÈRE EXÉCUTION

1. **LE PRESTIGE SATURAIT À 100 EN QUINZE SAISONS.** Premier réglage (place 1,6 ·
   titre 9 · montée 7 · saison 1,2) : tout le monde entraînable, le Stade
   Toulousain vers la dixième saison, et plus rien à jouer ensuite. Un mode dont
   la seule jauge sature à mi-carrière n'a plus de courbe. Chaque poussée a été
   divisée par ~1,8 — la même carrière finit maintenant à **64,3**, c'est-à-dire
   au niveau de la Nationale ou du bas de la Pro D2.
2. **UN ENTRAÎNEUR RUINÉ NE POUVAIT PLUS JAMAIS ENTRAÎNER.** Trois licenciements,
   prestige à 0, `noteMaximale(0)` vaut 30, et **plus aucun club du jeu ne passe
   sous ce plafond** : `clubsAccessibles` rendait une liste VIDE. Plus de banc,
   donc plus de saison, donc plus aucun moyen de remonter — la carrière était
   morte sans être terminée, et rien ne le disait. `PLANCHER_ACCES = 12` rend les
   douze clubs les plus faibles du monde : c'est-à-dire exactement là où le
   métier recommence.

### ⚠️ ET DEUX AUTRES ATTRAPÉS À L'ÉCRAN, QUE LE BANC NE POUVAIT PAS VOIR

3. **LE BOARD DEMANDAIT LA 40ᵉ PLACE D'UNE POULE DE DOUZE.** `objectifDuBoard`
   classait la DIVISION (Régionale 3 : 62 clubs) alors qu'on y joue dans une
   **poule** (`pouleDe`, 12 clubs) — la même que lisent `championnatEnDirect` et
   `rangFinal`. L'objectif était donc tenu d'avance et impossible à manquer.
   Mesuré après correction : **10ᵉ**, et une première saison finit 7ᵉ.
4. **UNE CARRIÈRE D'ENTRAÎNEUR DISPARAISSAIT AU RECHARGEMENT.** `manager`
   n'était pas dans `partialize` : un F5, et le banc, le prestige, le palmarès et
   tout l'historique repartaient à zéro sans un mot. `reconversionManager`, lui,
   n'est **pas** persisté — c'est un ordre donné à l'écran de création, pas un
   état de la partie (même règle que `attenteEvenement`).

### Le board juge sur l'ÉCART à son objectif, jamais sur le rang nu

`objectifDuBoard` = le rang que l'effectif mérite dans sa poule, **plus une place
de mou**. Finir huitième avec le budget du dernier est un exploit ; finir
troisième avec celui du premier est un échec. Sans cet écart, la seule stratégie
serait de prendre le meilleur club accessible et de ne plus bouger.

`verdictDeSaison` en tire le prestige ET la confiance du board — la seconde
réagissant **plus fort et plus vite** : un board se lasse en une saison, une
réputation se construit en dix. Sous `CONFIANCE_LICENCIEMENT = 18`, on est
remercié. Mesuré sur 15 saisons simulées :

| carrière | prestige final | force du club | licenciements |
|---|---|---|---|
| réussie (3 places devant l'objectif) | **64,3** | 35,5 → **69,1** (niveau 0) | 0 |
| moyenne (objectif tenu tout juste) | 16,5 | — | 0 |
| ratée (3 places derrière) | **0,0** | — | **5** |

### « Avec notre statut » : la reconversion

`RECONVERSIONS[0]` (« 📋 Entraîneur ») existait déjà à la retraite et ne menait
nulle part. `prendreRetraite('entraineur')` garde désormais la légende sous la
main (`reconversionManager`) et emmène à l'écran de création, qui en tire le
prestige de départ.

⚠️ **UN GRAND JOUEUR N'EST PAS UN GRAND ENTRAÎNEUR**, et le réglage le dit :
`PRESTIGE_ANCIEN_JOUEUR_MAX = 48`. Mesuré — carrière modeste **12** (Régionale 1),
solide **30** (Fédérale 2), légendaire **48** (Nationale 2). De quoi être accueilli
en Nationale, **jamais en Top 14**. Sans ce plafond, finir une belle carrière de
joueur donnerait le Stade Toulousain le lendemain, et le mode n'aurait plus de
courbe.

⚠️ **LA LÉGENDE PART QUAND MÊME AU HALL ET AU CLASSEMENT.** La reconversion n'est
pas une porte de sortie de la carrière de joueur : c'est une suite. Les deux
existent, et `joueur` passe à `null` comme à n'importe quelle retraite — les deux
champs pleins en même temps signifieraient deux carrières simultanées.

### ⚠️ LE MODE LIBRE N'ENTRE DANS AUCUN CLASSEMENT, ET LE VERROU EST DANS LE STORE

Demande : « un mode cheat où on peut partir avec n'importe quel club mais donc
pas dans le classement mondial ». `quitterBanc` n'appelle `publierAuClassement`
que si `!m.libre` — vérifié au banc : **0 envoi**.

⚠️ **LE VERROU N'EST PAS DANS `ficheDepuisManager`**, et c'est délibéré : une
fonction pure qui refuserait de produire une fiche selon un drapeau se
contournerait en retirant le drapeau. Le vrai verrou est de ne jamais envoyer.

⚠️ **ET LE CHOIX SE FAIT À LA CRÉATION, UNE FOIS.** `signerBanc` refuse un club
au-dessus de `noteMaximale + MARGE_AMBITION` : passer en mode libre en cours de
route reviendrait à jouer classé jusqu'au moment où l'on décide de ne plus l'être.

### Le classement à catégories

Quatre onglets sur l'écran 🏆 : **Total** · Joueurs · Entraîneurs · Joueur +
entraîneur.

⚠️ **« TOTAL » COMPARE VRAIMENT LES TROIS FAMILLES.** `scoreJoueur` et
`scoreManager` ont été calibrés l'un sur l'autre exprès — une grande carrière
vaut ~3 990 d'un côté, ~3 444 de l'autre. Sans cette calibration, le classement
total ne serait qu'un des deux, déguisé. Un « joueur + entraîneur » additionne
les deux versants (mesuré : 4 977 contre 2 343 pour un entraîneur pur).

⚠️ **LE FILTRE EST FAIT PAR LA BASE, ET IL LE FAUT.** Le classement est paginé
(50 lignes) : filtrer côté navigateur ne filtrerait que la page affichée, et
l'onglet « Entraîneurs » montrerait deux lignes sur cent en laissant croire qu'il
n'y a que deux entraîneurs au monde.

⚠️ **ET IL N'Y A AUCUNE COLONNE `categorie` À AJOUTER.** La catégorie se DÉDUIT de
deux colonnes qui existent depuis la v2 du schéma : `poste = 'entraineur'`
(`ficheDepuisManager`) et `matchs > 0` pour celui qui a d'abord joué. **Zéro
migration SQL**, donc zéro risque de rejouer « column "nom" does not exist », qui
avait rendu 500 à tout le monde en production. Une base restée en v1 n'a pas de
colonne `poste` : le serveur retombe alors sur la lecture non filtrée **et le
dit** (`filtreIgnore`), plutôt que de servir le classement total en le présentant
comme celui des entraîneurs.

⚠️ **CÔTÉ SERVEUR, LA CATÉGORIE RESTE DÉDUITE DE LA FICHE, PAS CRUE.**
`verifierFiche` la tire de la PRÉSENCE du versant `manager` et refuse une fiche
qui annonce autre chose. La déduction sur `poste` n'est qu'un affichage : un
client qui mentirait changerait sa colonne à l'écran, pas son score ni son rang.

### Ce que le crible du classement a dû apprendre

⚠️ **`ageDebut` NE VEUT PAS DIRE LA MÊME CHOSE SUR UN BANC.** Pour un joueur — et
pour un ancien joueur devenu entraîneur — c'est l'âge de ses débuts SUR LE
TERRAIN, donc 15 à 30. Pour quelqu'un qui n'a jamais joué, c'est l'âge de son
premier banc : `ficheDepuisManager` le déduit de l'âge et du nombre de saisons,
il vaut donc 35, 40, 45. **Sans `ageDebutManagerMin/Max` (20-60), aucune carrière
d'entraîneur pur n'entrait au classement, jamais, et rien à l'écran ne l'aurait
dit** — exactement le bug déjà payé une fois côté joueur (21 refus sur 21).

`SCORE_MAX` passe de **82 500 à 116 995** (le mode manager ajoute un second
barème, et une carrière « joueur + entraîneur » cumule les deux versants).
⚠️ **À répercuter dans les DEUX fichiers SQL** — c'est la quatrième fois qu'il
bouge, et les deux premières ont fait refuser par la base des scores que le jeu
produisait.

### Ce qui reste à faire

- **Couche 2** : la semaine du manager — composer le XV et le banc, l'entraînement
  du groupe, et coacher le match dans le moteur 2D existant.
- **Couche 3** : le marché des transferts, le budget, les contrats des joueurs.
- Les deux écrans du mode manager sont **en français uniquement**, comme `Profil`,
  `Effectif` et `Carrière` : le socle i18n est en place, il reste à brancher `t()`.

```bash
npx vite-node scripts/verifManager.ts     # accès gradué, 15 saisons, reconversion, mode libre, la boucle par le store
npx vite-node scripts/verifClassement.ts  # le plafond suit les deux barèmes
npx vite-node scripts/verifHonneurs.ts    # les deux distinctions fantômes sont sous test
npx vite-node scripts/verifTitres.ts      # aucun titre fantôme, aucun titre oublié
```

---

## 🏳️ LE MAILLOT DU WEEK-END — et deux poules sans nom d'équipe

Trois demandes et un bug, tous sur le même week-end de sélection : « je suis en
Coupe du monde et c'est marqué tournée d'automne » · « quand on est avec sa
sélection, mets le logo de la sélection au lieu du club » · « et qu'on puisse
voir l'effectif de notre sélection aussi » · « autre bug » (capture : les quatre
poules du Mondial, sans un seul nom d'équipe).

### ⚠️ 1. UNE SEMAINE NE SAIT PAS EN QUELLE ANNÉE ON EST

`libelleSemaine(s)` est une fonction du CALENDRIER, et le calendrier est le même
toutes les saisons : ses trois dates de novembre portent le libellé figé
« Tournée d'automne ». Or une saison sur quatre, la **Coupe du monde REMPLACE la
tournée** — `competitionsDeLaSaison` retire `autumn` cette année-là. L'écran
annonçait donc « Tournée d'automne » juste au-dessus d'un bouton
« 🌍 Coupe du monde · reçoit Fidji ».

`libelleSemaine(s, saison?)` prend désormais la saison. ⚠️ **Le paramètre est
FACULTATIF, et c'est ce qui permet de ne pas casser les appelants qui n'ont pas
de carrière sous la main** — la frise d'une compétition qu'on consulte, par
exemple. Les huit appels qui ont une saison la passent (panneau de carrière,
classement latéral, écran Résultats, L'Ovale, écran manager).

Contre-épreuve faite en jeu, et elle compte autant que le correctif : **saison 5
(pas d'année de Mondial) affiche toujours « 🍂 Tournée d'automne »**. Sans elle,
on aurait juste inversé le bug.

### ⚠️ 2. ON PORTAIT L'ÉCUSSON DE SON CLUB EN PLEINE COUPE DU MONDE

Le panneau affichait le blason du club même pendant une fenêtre
internationale — alors que le bouton juste en dessous propose « ▶️ Jouer avec ta
sélection ». Deux maillots contradictoires sur le même écran, et c'est le club
qui gagnait.

- L'avatar devient le **`LogoEquipe` de la sélection** dès qu'il y a un match
  international cette semaine-là.
- Une **pastille de sélection** s'ajoute (« 🇿🇦 Afrique du Sud · Coupe du monde »).
  ⚠️ **Elle s'AJOUTE, elle ne remplace pas celle du club** : on est sélectionné
  pour une semaine, on appartient à un club toute l'année, et c'est lui qui paie
  le salaire affiché deux lignes plus haut.

⚠️ **ON LE LIT SUR `inter`, PAS SUR `maSelection`.** `inter` dit qu'il y a
VRAIMENT un match international cette semaine ; `maSelection` dit seulement qu'on
est international. Un joueur convoqué toute l'année ne doit pas porter son
maillot national un dimanche de championnat.

### 3. L'effectif de la sélection

**`maSelection(joueur)`** (`lib/selection.ts`) devient la seule définition de
« ma sélection ». Le panneau, l'écran Effectif et le match posaient chacun la
question à leur façon — un jour l'un aurait affiché le maillot des A pendant que
l'autre montrait le groupe U20.

⚠️ **LE TIRAGE EST FIGÉ À 0,5**, pas laissé au hasard. `convocation` comporte une
zone de concurrence aléatoire : appelée deux fois dans le même rendu, elle rend
deux réponses différentes, et l'écusson clignoterait d'un rendu à l'autre. Ici on
ne décide pas d'une feuille de match, on répond à « de quelle sélection suis-je ? ».

L'écran Effectif gagne **deux onglets** — son club, sa sélection — et le bouton
« 👥 Équipe » du panneau ouvre le bon : la sélection pendant une fenêtre
internationale, le club le reste du temps. Relevé en jeu : « Afrique du Sud ·
Groupe national · Saison 4 · effectif noté 86 · 31 joueurs », le joueur incarné
dedans **une seule fois**.

⚠️ **L'ONGLET N'APPARAÎT QUE SI ON EST RÉELLEMENT INTERNATIONAL.** Le proposer à
un joueur de Fédérale 3 ouvrirait un groupe dont il ne fait pas partie, et le
laisserait croire qu'il y a sa place.

⚠️ **`effectifNational` CONTIENT DÉJÀ le joueur incarné** quand il est du niveau :
c'est le même vivier. On ne l'ajoute donc à la liste que côté club, sinon il
apparaîtrait deux fois dans son propre groupe national.

⚠️ **ET LE SEUIL DE COULEUR SUIT LE GROUPE AFFICHÉ.** Comparer un XV national à la
note d'un club de Fédérale peindrait les trente joueurs en or, et l'indication ne
dirait plus rien. La référence est la force du groupe montré, calculée avec la
**même formule** que `forceEffectif` (moyenne pondérée des 23 meilleurs, XV ×1 et
banc ×0,5) : deux barèmes différents feraient croire qu'un XV national vaut moins
qu'un club de Pro D2.

### ⚠️ 4. LES POULES DU MONDIAL N'AVAIENT AUCUN NOM D'ÉQUIPE

Capture à l'appui : quatre poules, six lignes chacune, rang et points — **et une
colonne vide à la place du nom**. L'en-tête « Club » avait disparu avec.

La cause est arithmétique. `.classement-ligne` déclare le nom en
`minmax(0, 1fr)` : il a donc **le droit de tomber à zéro**. Les neuf autres
cellules (rang, écusson, Pts, J, G, N, P, Diff, B) sont à largeur FIXE et
consomment ~325 px avec leurs gouttières, or une carte de poule n'en offre que
~320 quand trois tiennent sur une rangée. Le nom absorbait tout le déficit.

⚠️ **ET LA DIXIÈME COLONNE N'ÉTAIT MÊME PAS DÉCLARÉE.** `Tableau1` rend dix
cellules pour neuf colonnes définies : le bonus tombait dans une colonne
implicite `auto`, ce qui rendait la somme des largeurs dépendante du contenu.

Le nom garde donc un plancher (`minmax(88px, 1fr)`) dans le scope
`.grille-poules`, la dixième colonne est déclarée, et le tableau défile DANS sa
carte. **C'est exactement le correctif déjà appliqué à la feuille de match**,
pour exactement la même cause — et il s'applique aussi aux poules de coupe
d'Europe, qui partagent cette grille.

⚠️ **LE CORRECTIF EST SCOPÉ À `.grille-poules`**, vérifié : le classement de
championnat, qui n'y est pas, garde sa colonne de nom à 462 px et ne bouge pas
d'un pixel.

### Vérifié en jouant

Sauvegarde réelle — un ailier sud-africain de Northampton, saison 4 (année de
Mondial), semaine 11 :

```text
panneau     🏳️ Coupe du monde  (au lieu de « Tournée d’automne »)
avatar      /logos/afrique_du_sud.png · titre « Afrique du Sud »
pastilles   Afrique du Sud · Coupe du monde   ‖   Northampton Saints · Premiership
👥 Équipe   → onglet « Afrique du Sud » actif · 31 joueurs · effectif noté 86
poules      1 Afrique du Sud 🫵 5 1 1 0 0 +7 5 1   ← le nom est là, 88 px
saison 5    🍂 Tournée d’automne                    ← la contre-épreuve
```

À 375 px : quatre poules en une colonne, noms lisibles, **aucun débordement
horizontal**, et le tableau n'a même pas besoin de défiler (les colonnes
secondaires sont déjà masquées sur téléphone).

---

## 🌍 LA COUPE DU MONDE PASSE AU FORMAT 2027 — 24 nations, 6 poules de 4, huitièmes

Le format a été donné en détail, et c'est celui de la vraie édition 2027 :
24 équipes en **six poules de quatre** jouées en toutes rondes, les deux
premiers de chaque poule plus les **quatre meilleurs troisièmes**, puis
**huitièmes** → quarts → demies → **match pour la 3ᵉ place** → finale. Bonus
offensif à **quatre essais marqués**, bonus défensif à sept points. Égalité en
phase finale : prolongation, puis **tirs au but**.

⚠️ **`lib/mondial.ts` A ÉTÉ RÉÉCRIT, PAS AMENDÉ.** L'ancien format (4 poules de
6, deux matchs chacune, tableau à 8) n'a plus rien en commun avec celui-ci : ni
le tirage, ni la grille, ni le nombre de qualifiés, ni le barème. Ne pas
chercher à faire cohabiter les deux.

### Le tirage, et pourquoi il tombe juste

Quatre chapeaux de six selon le rang mondial, un par ligne de poule. Avec des
poules de quatre, chaque poule reçoit **exactement une nation de chaque
chapeau** — c'est le tirage réel d'une Coupe du monde, et il n'y a plus le
moindre reste à répartir.

⚠️ **ET LA QUALIFICATION EST HÉRITÉE.** Les trois premiers de chaque poule de
l'édition précédente sont qualifiés d'office : six poules, donc **dix-huit
places héritées**, les six dernières allant au classement mondial (le jeu n'a
pas de tournois continentaux, et en inventer six demanderait six calendriers).
Deux garde-fous, et il faut les deux : un **plancher** (avant la deuxième
édition il n'y a pas de Mondial antérieur à lire) et un **mémo par saison**,
sans lequel la saison 40 rejouerait neuf éditions dont chacune rejouerait les
huit précédentes.

### La compression du calendrier, et pourquoi elle porte sur les POULES

Le calendrier réserve **trois dates** à la fenêtre d'automne. Il faut y caser
trois tours de poule et cinq tours de tableau :

| date | ce qui se joue |
|---|---|
| S10 | 1ᵉʳ tour de poule |
| S11 | **2ᵉ et 3ᵉ tours de poule** |
| S12 | tout le tableau : huitièmes → quarts → demies → 3ᵉ place → finale |

⚠️ **ON COMPRIME LES POULES, PAS LE TABLEAU, ET C'EST UN CHOIX DE JEU.** Le
joueur ne dispute qu'un match par date. En étalant les poules sur les trois
dates il jouerait ses trois matchs de poule et **ne disputerait jamais un match
à élimination directe de Coupe du monde** — on lui retirerait le seul moment qui
compte. En comprimant, il joue deux matchs de poule en direct, son troisième se
résout en fond, et il dispute vraiment son huitième.

⚠️ **`toursDePouleApres()` EST LA SEULE DÉFINITION DE CETTE COMPRESSION**, et
`journeesParDate()` la seule façon de regrouper les matchs par date. Trois
lecteurs en ont besoin (l'état, l'affiche du joueur, l'écran Résultats) : trois
copies, et un jour l'écran annoncerait un match que le classement ne connaît pas.

### ⚠️ ET LE JOUEUR NE DISPUTAIT PAS LE MÊME TOURNOI QUE CELUI AFFICHÉ

Bug trouvé en vérifiant le nouveau format, **antérieur à ce lot**, et c'est le
plus grave des deux. `matchInternationalDuJoueur` passait par `grille()` — un
carrousel générique sur les 24 nations — au lieu de lire `lib/mondial.ts`. Le
match du joueur n'était donc ni son match de poule, ni son huitième : c'était
une affiche inventée, avec sa propre graine, donc son propre score. **L'écran
Résultats montrait un tournoi, le joueur en jouait un autre.**

C'est exactement la forme du bug déjà payé sur le classement mondial (`rang#…`
contre `…`). La Coupe du monde a désormais son chemin dédié, qui rend le match
tel quel : même graine, même score, même adversaire. Vérifié en jeu :

```text
semaine 10 → Coupe du monde J1 — Afrique du Sud 47-5 Fidji     (poule A, tour 1)
semaine 11 → Coupe du monde J2 — Afrique du Sud 51-0 Tonga     (poule A, tour 2)
semaine 12 → Coupe du monde J3 — Afrique du Sud 43-0 Portugal  (huitième)
```

### ⚠️ ET LES SCORES ÉTAIENT INVRAISEMBLABLES — l'écart de niveau ne saturait pas

Mesuré sur quatre éditions : **18 % des matchs à cinquante points d'écart ou
plus**, un maximum de 69, et des « Afrique du Sud 51-0 Fidji ». La cause est
arithmétique : `jouerTestMatch` appliquait `ecart × 1,15` **des deux côtés**,
soit 2,3 points de score par point de force. Correct pour un Tournoi (5 à 15
d'écart → 12 à 35 points, la réalité) ; absurde dès qu'on met le monde entier
dans la même poule — l'Afrique du Sud (94) contre le Zimbabwe (40), c'est 57
d'écart, donc **131 points** de marge théorique.

L'écart passe par un `tanh` plafonné à 22 : les petits écarts sont intacts (10
reste 9,5), les grands sont comprimés (57 devient 22).

| | avant | après |
|---|---|---|
| écart moyen | 31,4 | **27,3** |
| écart maximal | 69 | **59** |
| matchs à 50 points ou plus | 18 % | **6 %** |

⚠️ **C'EST UN CHANGEMENT AU-DELÀ DE CE QUI ÉTAIT DEMANDÉ**, et il touche TOUS les
résultats internationaux — donc le classement mondial, les titres, les
sélections. Il est fait parce que la refonte du format le rendait visible en
permanence, et les cinq bancs concernés ont été rejoués (`verifInternational`,
`verifClassementWorldRugby`, `verifTitres`, `verifSelection`, `verifU20`).

### Ce que le tableau a gagné

`TourFinal` accueille `huitieme` et `petiteFinale`. ⚠️ **Ils sont AJOUTÉS À LA
FIN de `ORDRE_TOUR`, jamais insérés** : ces valeurs sont porteuses pour les
coupes d'Europe (`ordreTourCourant` les compare directement au nombre de dates
de coupe jouées), et renuméroter `barrage`/`quart`/`demie`/`finale` décalerait
tout leur tableau d'un tour. L'ordre d'AFFICHAGE, lui, vit dans `ORDRE_TOURS`
(Tableau.tsx), où la petite finale se place juste avant la finale.

### Mesuré (`verifInternational.ts`, section 7)

| | |
|---|---|
| poules | **6 × 4**, toutes rondes, 3 matchs par nation |
| affiches rejouées deux fois | **0** |
| qualifiés | **16** à chaque édition (12 + 4 meilleurs troisièmes) |
| un repêché est bien 3ᵉ de sa poule | **0 anomalie** |
| tableau | 8 huitièmes + 4 quarts + 2 demies + finale + petite finale = **16 matchs** |
| matchs nuls à élimination directe · scores impossibles | **0 · 0** |
| un champion par édition | **3/3** |

Vérifié à l'écran (1280 px et 375 px) : six poules, colonnes
« Huitièmes · Quarts · Demi-finales · Match pour la 3ᵉ place · Finale »
(8 · 4 · 2 · 1 · 1), un champion affiché, et **aucun débordement horizontal**.

---

## 🚩 LE HORS-JEU SUR COUP DE PIED

Retour de jeu : « durant le jeu y'a pas de hors-jeu sur les coups de pied,
fixe-le ». C'était exact : un ailier placé trente mètres devant son ouvreur
récupérait le ballon sans que rien ne soit sifflé.

La règle est posée **dans `lancerVol`**, et c'est le point important : les huit
intentions de coup de pied (dégagement, occupation, chandelle, 50/22, rasant,
transversale, drop, renvoi) passent toutes par cet entonnoir. La poser dans
`deciderAvecLeBallon` aurait demandé huit copies, et il n'en aurait manqué
qu'une pour que le hors-jeu redevienne facultatif.

- **Au coup de pied**, tout partenaire situé devant le botteur est marqué
  (`Pion.horsJeu`).
- **Il ne peut pas gagner le ballon** : il est écarté des candidats à la
  réception.
- **Il est remis en jeu par le BOTTEUR**, pas par le temps qui passe : un
  chasseur parti trop tôt ne redevient pas loyal parce qu'il a patienté, mais
  parce que quelqu'un venu de derrière l'a dépassé. Un simple compte à rebours
  aurait donné une règle qui s'efface toute seule.
- **S'il est plus près du ballon que le chasseur loyal, c'est pénalité.**
- Toute reprise de jeu (`arret`, `reprendreJeu`) éteint le drapeau.

### ⚠️ ET LA PREMIÈRE VERSION A DÉPLACÉ L'ÉTALONNAGE DU MOTEUR

Elle figeait le joueur hors-jeu (cible = sa propre position, effort 0,25) et le
laissait figé tant que le drapeau tenait. Avec une cinquantaine de coups de pied
par match et le paquet d'avants systématiquement devant son ouvreur, c'étaient
huit joueurs plantés à chaque dégagement — **pendant tout le temps de jeu
suivant**. Mesuré aussitôt : grattages 6,8 → **9,3** par match (hors cible), et
le raffut a cessé de faire franchir.

L'arrêt est donc borné à `phase === 'ballonEnLAir'` : il ne chasse plus, il
n'arrête pas de jouer au rugby. Étalonnage revérifié — 42,6 points, 5,6 essais,
48,9 coups de pied, **20,7 pénalités** (cible 14 à 26), 155 rucks, 16,5 mêlées.

### 🩹 Un banc d'essai qui répondait au hasard

`verifControle.ts` comparait les franchissements avec et sans crochet sur
**douze matchs**, pour une statistique qui vaut ~1 par match : l'écart-type de la
moyenne dépassait l'effet mesuré. Relevé tel quel sur le MÊME code : « 0,9 →
0,7 » une fois, « 0,8 → 1,6 » la suivante. Porté à **quarante matchs** : 0,9 →
1,2 pour les deux gestes, stable. C'est la même leçon que les gestes illégaux
(section 9), et un test qui répond au hasard est pire qu'une absence de test —
il fait chercher une régression qui n'existe pas.

---

## 🔒 LE MODE ENTRAÎNEUR EST CACHÉ (chantier en cours)

Demande : « cache le mode entraîneur pour l'instant, il doit être accessible que
par moi le dev pour voir les bugs ».

**`src/lib/modeDev.ts`** — `chantierVisible('manager')`. Trois façons d'ouvrir :
en développement (`npm run dev`, toujours ouvert), `?dev=1` dans l'adresse (le
passage qu'on utilise une fois), et le `localStorage` qu'il pose (le passage qui
survit aux rechargements). `?dev=0` referme.

⚠️ **CE N'EST PAS UNE SÉCURITÉ, et il ne faut pas le présenter comme telle.**
Tout ce qui est livré au navigateur est lisible : la clé se trouve en vingt
secondes dans le bundle, comme la clé Groq du site. C'est un **interrupteur de
chantier** — il évite qu'un joueur tombe sur un mode inachevé, se demande
pourquoi il ne peut pas composer son XV, et le prenne pour un bug.

⚠️ **ET IL NE SUPPRIME RIEN.** Le mode est entier : store, écrans, banc d'essai,
classement à catégories, persistance. Seules ses deux PORTES sont fermées — le
bouton de l'accueil, et la reconversion « Entraîneur » à la retraite (qui
retombe au Hall, comme les quatre autres reconversions). Le jour où la couche 2
est prête, on retire `manager` de `CHANTIERS` et tout réapparaît sans rien
réécrire.

Vérifié dans le bundle de production : `import.meta.env.DEV` est compilé away,
le drapeau `ovalie-dev` est bien la seule porte.

---

## 🩹 Deux correctifs de plus

### La limite d'envoi au classement, triplée

Demande : « augmente la limite de requêtes par heure, c'est pas assez ».
**6/heure et 40/jour → 18/heure et 120/jour.**

⚠️ **ET LES DEUX CÔTÉS DOIVENT BOUGER ENSEMBLE.** Tripler le débit du serveur
seul n'aurait **rien** changé pour le joueur : c'est le jeu qui limitait la
cadence, avec son plancher de dix minutes entre deux envois automatiques —
calibré précisément sur les six envois par heure du serveur. Le plancher est
désormais **calculé** (`60 / ENVOIS_PAR_HEURE`, soit 3 min 20 s), pas écrit en
dur : les deux ne peuvent plus diverger sans qu'on le voie.

⚠️ **CE N'EST PAS UN AFFAIBLISSEMENT DE LA PROTECTION.** Le débit n'a jamais été
ce qui protège le classement — c'est le RECALCUL du score côté serveur. Un
script qui posterait cent fois par heure n'obtiendrait que des refus.

### Le renommage au classement n'atteignait pas la fiche

Retour de jeu : « si je me renomme dans le classement, mon nom n'est pas changé
quand j'affiche le profil ». La ligne affichait bien « Van der merve », la fiche
dépliée juste en dessous affichait toujours « Tiaan Leyds » — deux noms pour la
même carrière, à trois centimètres l'un de l'autre.

Le pseudo passe devant le nom du personnage dans la fiche. ⚠️ **Le nom du
personnage n'est pas perdu** : il s'affiche en sous-titre quand il diffère. Le
pseudo est ce qu'on choisit de montrer au monde, le nom est celui qu'on a porté
sur le terrain — les deux sont une information.

```bash
npx vite-node scripts/verifInternational.ts       # section 7 au format 2027
npx vite-node scripts/verifClassementWorldRugby.ts # l’écart saturé n’a rien cassé
npx vite-node scripts/verifMoteur.ts               # l’étalonnage tient malgré le hors-jeu
npx vite-node scripts/verifControle.ts             # franchissements mesurés sur 40 matchs
npx vite-node scripts/verifTitres.ts               # le titre mondial suit la finale
```


---

## 📈 GOOGLE TAG MANAGER, ET UN ÉCRAN QUI VAUT UNE PAGE VUE

Demande : poser le conteneur Google Tag Manager `GTM-KF48DSQ9` sur toutes les
pages du site, puis « ajouter un virtual pageview dans `setEcran()` ».

### Où la balise est posée, et pourquoi à deux endroits

| Fichier | Ce qu'il sert |
|---|---|
| `index.html` | Le jeu. La balise est **le plus haut possible dans le `<head>`**, le repli `<noscript>` juste après `<body>`. |
| `scripts/genPages.cjs` | Les **quatre pages de contenu**. On touche le GÉNÉRATEUR, jamais `public/<slug>/index.html` : ces fichiers sont réécrits à chaque `node scripts/genPages.cjs`, et une balise collée à la main dans le résultat disparaîtrait à la première régénération, sans un mot. |

⚠️ **CONTRAIREMENT À ADSENSE, GTM N'EST PAS CONDITIONNÉ À `PUB_SLOT`.**
`scriptAdsense()` et `encartPub()` ne rendent rien sans slot, parce qu'une balise
publicitaire vide n'a aucun intérêt. GTM n'affiche rien : c'est un conteneur de
mesure, et il a du sens précisément sur une page sans annonce — c'est là qu'on
veut savoir si quelqu'un lit.

⚠️ **`GTM-KF48DSQ9` EST EN DUR, comme le `ca-pub-…` d'AdSense.** Ces
identifiants sont publics par construction : Google exige qu'ils figurent en
clair dans la page. Il n'y a rien à mettre en variable d'environnement.

⚠️ **ET IL NE PEUT PAS EMPÊCHER LE JEU DE SE CHARGER** : le script est `async` et
sans dépendance. Bloqueur de publicité, réseau coupé, pays où
`googletagmanager.com` ne répond pas — la page se charge exactement pareil.
C'est la règle du projet : le jeu reste ENTIER quand un service tiers tombe.

### ⚠️ CE QUE GTM CHARGE NE SE DÉCIDE PAS DANS CE DÉPÔT

C'est sa force (on ajoute une balise sans redéployer) et c'est son risque. Le
projet a des règles écrites en tête de `src/lib/pub.ts` — « rien ne se charge
sans consentement », « jamais d'interstitiel ni de pop-up » — et c'est en leur
nom que le service worker Monetag a été supprimé de `public/`. **Le conteneur
peut déclencher n'importe quoi**, et ce n'importe quoi échappe au code du jeu.
Le consentement des balises qu'il déclenche se règle donc **dans l'interface de
GTM** (mode Consentement de Google), pas ici. Ce fichier ne peut pas le garantir
à la place de l'administrateur du conteneur.

### `src/lib/mesure.ts` — un écran vaut une page vue

⚠️ **LE JEU N'A QU'UNE SEULE URL.** `setEcran` change un champ du store,
l'adresse ne bouge jamais — c'est la raison d'être des quatre pages statiques
générées (voir « DES PAGES DE CONTENU », plus haut). Pour Google Analytics,
toute une session — accueil, création, carrière, match, classement, boutique —
compte donc **une seule page vue**, et il devient impossible de voir où les
joueurs décrochent.

⚠️ **ET UN ROUTEUR NE RÉGLERAIT PAS ÇA POUR CE QU'IL COÛTE**, question posée
explicitement (« passer à des pages séparées `/classement`, `/carriere` ? »). Les
écrans sont des VUES d'un état Zustand persisté, pas des documents
indépendants : leur donner de vraies adresses obligerait à gérer le bouton
« retour » du navigateur en pleine partie et à synchroniser l'URL avec l'état de
la carrière — pour un gain nul côté joueur. Un « virtual pageview » donne le
même entonnoir à l'analyse sans toucher à l'architecture.

⚠️ **ET CE N'EST PROBABLEMENT PAS LA CAUSE D'UN TAUX DE REBOND ÉLEVÉ.** GA4 ne
compte plus un rebond comme « une seule page vue » : une session est ENGAGÉE dès
10 secondes passées, une conversion, ou deux pages vues. **Le temps passé compte
sans changement d'URL** — quelqu'un qui joue cinq minutes sur `carriere` est déjà
une session engagée. Ce qui ferait vraiment rebondir, c'est un départ sous
10 secondes depuis l'accueil, ou un abandon à la création. C'est précisément ce
que les pages vues virtuelles permettent enfin de distinguer.

| | |
|---|---|
| `cheminDEcran(ecran)` | `/jeu/<ecran>`. ⚠️ **Le préfixe `/jeu/` n'est pas décoratif** : sans lui, l'écran `guide` entrerait en collision avec la VRAIE page `/guide/` générée par `scripts/genPages.cjs`, et les deux se cumuleraient dans le même rapport. |
| `pageVue(ecran)` | Pousse `virtual_pageview` dans `dataLayer`. Mémorise le dernier écran annoncé : sans cette mémoire, un remontage de React (changement de langue, réhydratation, `StrictMode` qui monte deux fois en développement) compterait deux pages vues. |
| `evenementMesure(nom, details)` | Un fait de parcours. ⚠️ **Jamais de donnée de joueur** — ni le nom du personnage, ni le club, ni le pseudo 𝕏 : ils ne répondent à aucune question qu'on se pose sur l'audience, et le jeu ne demande aucun consentement pour les partager. |

⚠️ **L'APPEL VIT DANS `App.tsx`, PAS DANS `setEcran`.** C'est le seul endroit qui
voit TOUS les changements d'écran : **six écritures du store posent `ecran:`
directement**, sans passer par `setEcran` (création de carrière, retraite,
ouverture de L'Ovale sur les messages, mode manager, panthéon, accueil). Les
patcher une par une aurait raté les six — exactement le défaut déjà payé par le
guide de carrière, dont les étapes restaient décochées parce que `ecransVus`
n'était alimenté que par `setEcran`.

⚠️ **ET RIEN NE PEUT CASSER LE JEU** : `dataLayer` n'existe pas si GTM est bloqué
ou si le code tourne hors navigateur (scripts `verif*.ts`). Chaque fonction sort
en silence. Aucun écran ne doit dépendre de la présence d'un mouchard.

Vérifié en jeu : `dataLayer` contient bien
`{"event":"virtual_pageview","page_path":"/jeu/accueil"}` au chargement, puis
`/jeu/classement` au clic sur l'onglet, et `google_tag_manager` expose la clé
`GTM-KF48DSQ9` — sur `index.html` comme sur `/guide/`.

## 📱 ACCESSIBILITÉ MOBILE — LE JEU AVANT LES MENUS

Demande : « rendre beaucoup plus accessible la version mobile, plus simple
d'utilisation, sans changer le jeu, pour baisser le bounce rate ».

- **Navigation mobile dédiée** (`components/Nav.tsx`) : sous 900 px, la longue
  file d'onglets horizontale disparaît. Une barre basse fixe expose Accueil,
  Carrière/Créer, L'Ovale, Profil et Plus. « Plus » ouvre un vrai dialogue
  accessible (focus enfermé, Échap, fond inert) pour Clubs, Classement, Hall,
  Boutique et Réglages. Sur ordinateur, la navigation historique ne change pas.
- **Carrière en trois vues** (`screens/Carriere.tsx`) : Récit est la vue
  initiale, Profil et Classement restent à un toucher. Les trois composants
  restent montés : aucune donnée ni mécanique ne bouge et la barre d'action en
  portail continue à fonctionner. Le bouton principal vit au-dessus de la barre
  basse, jamais dessous.
- **Accueil orienté conversion** : sur téléphone, le texte et le CTA passent
  AVANT `Hero3D`. La scène reste présente, mais ne retarde plus la compréhension
  ni le premier geste. Les boutons du groupe CTA prennent toute la largeur.
- **Socle d'accessibilité** : lien « aller au contenu », `aria-current`, journal
  `role=log`, erreurs annoncées, champ du MJ nommé, classement latéral activable
  au clavier, focus `:focus-visible`, cibles tactiles d'au moins 44 px et
  `viewport-fit=cover` pour que les `safe-area-inset-*` fonctionnent sur iPhone.
- **Aucun changement de jeu** : ni store, ni barème, ni calendrier, ni IA, ni
  données. La passe ne touche qu'à l'ordre visuel, la navigation et les
  attributs d'accessibilité.

Vérifications : TypeScript, oxlint, compilation de production et
`verifTraductions.ts` (1 762 clés, 100 % dans les sept langues).
