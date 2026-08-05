# CLAUDE.md — Destiny Rugby 🏉

Guide d'architecture et de conventions pour travailler sur ce projet.
**Lis-le avant toute évolution**, et **tiens-le à jour** avec le `README.md` à
chaque changement notable.

## Le projet en une phrase

RPG de **carrière de rugby** solo : le joueur écrit ses actions en français, un
**Maître du Jeu IA (Groq)** juge le résultat et fait évoluer les statistiques.
Inspiré des jeux type *Destin Eleven*, décliné pour l'ovalie.

## Préférences de travail (imposées par l'utilisateur)

- **UI et code en français** (noms de variables, commentaires, textes).
- Front **« pas IA »** = soigné, artisanal, belles animations, thème cohérent
  (stade nocturne / cuir / pelouse / dorures). **Jamais** un rendu générique.
- **Tester dans le navigateur** après chaque changement (aperçu `localhost:5173`,
  desktop **ET** mobile), pas seulement compiler.
- **Responsive obligatoire.**
- Tenir **`CLAUDE.md`** et **`README.md`** à jour à chaque évolution.
- **Clé API Groq** : deux voies. (A) fournie par le site via `VITE_GROQ_KEY`
  dans `.env.local` (⚠️ visible côté client, consomme le quota du propriétaire) ;
  (B) saisie par le joueur dans ⚙️ (localStorage). La clé effective =
  `groqKey || CLE_ENV`. Ne **jamais** committer `.env.local` (déjà gitignoré).

## Stack

Vite 8 · React 19 · TypeScript · Zustand (+ persist) · Framer Motion ·
Three.js (@react-three/fiber + @react-three/drei) · API Groq (compatible OpenAI).

## Architecture

| Fichier | Rôle |
|---|---|
| `src/types.ts` | Types du domaine (`Joueur`, `Attributs`, `ReponseMJ`, `EntreeJournal`, `Ecran`…). |
| `src/data/rugby.ts` | Données statiques : `POSTES` (**15 postes numérotés 1-15**, chacun avec sa `famille` — les données réelles ne donnent que la famille ; `posteDepuisFamille()` attribue un numéro déterministe, `migrerPoste()` répare les vieilles sauvegardes), `NATIONS_PAR_ZONE` (**202 nations**, dérivées de `data/nations.ts`) + `NATIONS` (à plat), `ATTRIBUTS_LABELS`. |
| `src/data/evenements.ts` | Pool d'`EVENEMENTS` aléatoires (récit + deltas + Ovas), jouables **sans IA**. |
| `src/data/scenarios.ts` | `SCENARIOS` à **choix** (situation + options + issues, `transfert?` en option) — cœur du mode **sans clé**. |
| `src/data/clubs.ts` | **Assemblage** des compétitions : les 3 divisions pro françaises + les 13 championnats du monde viennent du fichier généré `mondeReel.ts` ; **Nationale 2 (26), Fédérale 1 (48), 2 (95), 3 (157)** restent saisies ici (blocs `NOM OFFICIEL\|Nom court` parsés) ; **Régionale 1 (63), 2 (60), 3 (62)** viennent du fichier généré `amateurs.ts`. Soit **655 clubs français sur 10 divisions**. `club()` accroche au passage le vrai logo amateur (`LOGO_AMATEUR`). `divisionDuClub()` (France), `competitionDuClub()` (monde compris), `clubParNom()`, `NOTE_PAR_NIVEAU` (niveaux **0-10**), couleurs auto par hash (⚠️ `>>>` non signé). |
| `src/data/mondeReel.ts` | ⚠️ **GÉNÉRÉ**. `COMPETITIONS_REELLES` (16 championnats, **143 clubs** avec nom, ville, **logo officiel**, couleurs de repli), `COUPES_EUROPE` (Champions/Challenge/Prem. Rugby Cup : clubs engagés), `COMPETITIONS_NATIONS` (10 compétitions de sélections **avec leur classement**), `LOGO_PAR_EQUIPE`. Les classements de CLUBS ne sont pas exportés : ils ne servent qu'au calcul des notes, dans le générateur. |
| `src/data/effectifsReels.ts` | ⚠️ **GÉNÉRÉ**. `NOTE_CLUB_REEL` (note générale des 143 clubs) + `EFFECTIFS_REELS` (**6 306 joueurs réels** 25-26 : nom, poste, nation, âge, note, **potentiel**). Encodage **compact** (`nom\|poste\|âge\|note\|potentiel\|nation`, index pour poste et nation) : en objets littéraux le fichier ferait 700 Ko dans le bundle, ici 230 Ko. |
| `scripts/genMonde.cjs` | **Le** générateur. Lit `base_rugby_finale.json` + `tous_les_classements.json`, calcule les notes de club et de joueur, écrit les deux fichiers ci-dessus. Signale en console tout écart (équipe inconnue, logo manquant, vedette sans joueur). **Relancer** : `node scripts/genMonde.cjs`. |
| `scripts/ligues.cjs` | Table des championnats : `srcLigue` (nom dans les JSON), `echelle` `[note du dernier, note du premier]`, et pour chaque club `[nom court des données, nom dans le jeu, ville, note imposée?]`. **C'est ici** qu'on ajoute/renomme un club ou une division. |
| `scripts/vedettes.cjs` | Notes calibrées à la main (~450 internationaux). `ALIAS` réconcilie les anciennes orthographes LNR (« Grégory ALLDRITT ») avec celles de la base (« Greg ALLDRITT »). |
| `scripts/copierLogos.cjs` | `logos_equipes/**/<club>.png` → `public/logos/<slug>.png`, **récursif** (les logos amateurs sont rangés sur deux niveaux), à plat et dédoublonné, accents retirés du nom de fichier. **715 logos**, 5,5 Mo. |
| `scripts/genAmateurs.cjs` | ⚙️ Générateur du **monde amateur** : lit `liste club regionaux/`, `transfert + joueur nat2, fed et reg/` et le pack de logos, rapproche les noms des clubs du jeu (clé normalisée + repli par inclusion + `ALIAS_CLUB`), écrit `src/data/amateurs.ts` et `src/data/mercato.ts`. Signale les clubs sans effectif/logo et les équipes non rattachées. **Relancer** : `node scripts/genAmateurs.cjs`. |
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
| `src/data/trophees.ts` | `TROPHEES` (**16** : 8 France/international + 8 championnats du monde) + `TROPHEE_PAR_DIVISION` (clé = id de compétition), `TROPHEE_PAR_COUPE`, `COUPE_EUROPE_PAR_DIVISION`, `NATIONS_6N`. Chaque trophée pointe un `.glb` de `public/m3d/`. ⚠️ Les trophées du monde (Premiership, RFU Championship, Prem. Rugby Cup, URC, Super Rugby, NPC, League One, MLR) sont **en place mais pas encore décernés** : la carrière reste française. |
| `src/data/selections.ts` | Dérive de `COMPETITIONS_NATIONS` la liste dédoublonnée des **sélections** : `SELECTIONS_SENIOR` (une équipe par pays : les A/XV/Barbarians/Māori sont écartés par `RESERVES`) et `SELECTIONS_U20` (nom, logo, nation de base pour le drapeau, compétitions disputées). Alimente l'onglet 🏳️ Sélections. |
| `src/components/TropheeGagne.tsx` | Cérémonie : modale + Canvas R3F, modèle recentré/normalisé **en rotation continue**, Sparkles, aura colorée. |
| `src/components/Confirmation.tsx` | Modale de confirmation maison. ⚠️ **Ne jamais utiliser `window.confirm()`** (bloqué/inconstant) et **toujours passer par `createPortal(document.body)`** : le `backdrop-filter` des `.carte` crée un bloc conteneur qui piège les `position: fixed`. |
| `src/data/legendes.ts` | `LEGENDES_FICTIVES` qui peuplent le classement (marquées `fictif`). |
| `src/lib/groq.ts` | Appel `fetch` à Groq, **prompt système** du MJ (sévère, anti-triche), parsing du JSON, nettoyage des deltas, **`CLE_ENV`** (clé fournie par le site via `VITE_GROQ_KEY`). ⚠️ **`plafonnerDeltas()` et `ressembleATriche()`** sont le vrai garde-fou : le prompt seul finit toujours par se laisser convaincre. |
| `src/store/useGame.ts` | Store Zustand persistant : `joueur`, `journal`, `coins` (Ovas), `inventaire`/`skinActif`, `pantheon`, réglages, navigation, **offres de contrat**, et logique (`creerJoueur`, `appliquerReponse`, `saisonSuivante`, `evenementAleatoire`, `prendreRetraite`, `ouvrirOffres`/`signerOffre`/`demanderTransfert`, `acheterSkin`/`choisirSkin`/`acheterBoost`). Exporte aussi `scoreCarriere`, `noteGlobale`, `classementComplet`. |
| `src/components/` | `Nav` (+ badge Ovas), `Reglages` (+ tutoriel clé), `Jauge`, `PanneauJoueur` (badge **GÉN**, logo+club·division, 👥 Mon équipe, retraite), `Hero3D` (si `skin.glb` → `ModeleBallon`, sinon `BallonRugby`), `ModeleBallon` (`useGLTF(url, true)` = **Draco**). |
| `src/screens/` | `Accueil`, `Creation` (division+club réels), `Carriere` (MJ + 📖/🎲 **limités à `MAX_PAR_SAISON`=2**), `Profil`, `Boutique`, `Pantheon`, `Classement`, `Championnats` (3 onglets France/Monde/Sélections ; clic sur un club → `FicheClub` ; l'onglet Sélections liste les **équipes** — séniors puis U20 — et non les compétitions), `Effectif` (coéquipiers). |
| `src/index.css` | Design system : variables CSS (couleurs, polices, rayons), reset, fond. |
| `src/App.css` | Styles des composants et écrans + **media queries responsive** (900px / 560px). |

### Boucle de jeu (cœur)

1. Le joueur tape une action dans `Carriere.tsx` (ou clique une suggestion).
2. `demanderAuMJ()` (`lib/groq.ts`) envoie : prompt système + fiche joueur +
   historique (8 derniers messages) + action → Groq (`response_format:
   json_object`).
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

Régénération des données réelles (sources à la racine : `base_rugby_finale.json`,
`tous_les_classements.json`, `logos_equipes/`) :

```bash
node scripts/copierLogos.cjs   # logos_equipes/** → public/logos/ (récursif, 715 fichiers)
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
  saison. `semaineSuivante()` (store) joue UNE semaine ; le rythme se choisit
  dans ⚙️ (`rythme: 'semaine' | 'saison'`). En mode semaine, le bilan de fin de
  saison utilise les stats RÉELLEMENT accumulées (`Joueur.saisonEnCours`), pas
  une simulation.
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
- **Traits de caractère** (`src/data/traits.ts`, 12 traits, 2 au choix) : chaque
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


## L'Ovale piloté par l'IA (dernier ajout)

Tout le réseau social est désormais **écrit par Groq** et **entièrement
interactif**. Il n'y a plus une seule phrase toute prête proposée au joueur :
la zone de rédaction est vide, on écrit ce qu'on veut.

| Fichier | Rôle |
|---|---|
| `src/lib/groqSocial.ts` | Les quatre appels IA : `filGroq()` (publications des clubs, joueurs, presse et supporters, avec leurs pseudos), `reponsesGroq()` (les commentaires sous TES posts), `comptesGroq()` (comptes à suivre), `messageGroq()` (l'IA répond **à la place** de ton interlocuteur en message privé). Le contexte envoyé contient ton club, ton championnat, tes coéquipiers réels et tes rivaux : l'IA ne peut pas inventer un club. |
| `src/lib/social.ts` | Le repli **hors ligne** de chacun (règle du projet : le jeu reste jouable sans clé), dont `suggestionsLocales()` qui fabrique de vrais comptes à partir de l'effectif et des clubs de la division. |
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
| `logo league/` | Les images fournies (24 fichiers, à la racine du projet). |
| `scripts/copierLogosCompetitions.cjs` | Copie `logo league/*` vers `public/logos-competitions/<id>.<ext>`, **nommés par l'id de compétition** (plus rien à deviner à l'exécution), puis génère la table. La constante `CORRESPONDANCE` en tête du script est le SEUL endroit à modifier pour ajouter ou changer un logo. Relancer : `node scripts/copierLogosCompetitions.cjs`. |
| `src/data/logosCompetitions.ts` | ⚠️ **GÉNÉRÉ**. `LOGO_COMPETITION` : id de compétition → chemin public. |
| `src/components/LogoCompet.tsx` | `<LogoCompet id="top14" emoji="🏉" taille={26} />` — le logo sur une pastille claire (les images sont sur fond blanc : sans pastille, un logo sombre disparaîtrait sur le thème nocturne), avec **repli sur l'emoji** quand aucune image n'est fournie. |

**Couverture : 26 compétitions sur 33** (`npx vite-node scripts/verifLogosCompet.ts`).
Restent en emoji faute d'image : Autumn Nations Series, Nations Championship,
Nations Cup, Rugby Europe Championship, The Rugby Championship U20, Test-matchs
et « Autres clubs européens ». Pour les ajouter : déposer le fichier dans
`logo league/`, ajouter sa ligne dans `CORRESPONDANCE`, relancer le script.


## L'Ovale vivant : annuaire, recherche, profils, relations

| Fichier | Rôle |
|---|---|
| `src/lib/comptes.ts` | **L'annuaire** : tout le monde a un compte — les **21 compétitions** (avatar = leur logo, `compet:<id>`), les **143 clubs** (avatar = leur écusson, `club:<nom>`), les **joueurs des effectifs** (les tiens et ceux des rivaux), la presse et les supporters. **336 comptes** pour une carrière en Top 14, tous déterministes (rien à sauvegarder). Fournit aussi `chercherComptes()` et `chercherPosts()` — la **recherche** trouve un club par sa ville (« toulouse » → Stade Toulousain), un joueur par son nom, un championnat, ou un mot dans les publications. |
| `src/lib/vie.ts` | **La vie du réseau sans bouton « actualiser »** : `postSpontane()` (un compte publie), `messageSpontane()` (quelqu'un t'écrit), et surtout les **relations** — `tonDuMessage()` détecte l'agressivité, `effetSurRelation()` la sanctionne (−25 par insulte, +8 par message chaleureux), `humeur()` traduit le score en état (ami → conflit ouvert) et `reponseLocale()` fait **riposter** le compte. |
| `src/screens/Social.tsx` | Sept vues : Accueil, Explorer/Recherche, Messages, Notifications, **Mon profil** (éditable), **profil d'un compte**, Succès. Chaque nom et chaque avatar est **cliquable**. |

**Le fil bouge tout seul** : `battementSocial()` (store) est appelé toutes les
**8 secondes** tant que l'écran est ouvert — un compte publie, et une fois sur
cinq quelqu'un t'envoie un message privé. Avec une clé Groq, `rafraichirFil()`
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
    dans ⚙️ (`tenorKey`, rangée comme la clé Groq). Sans elle, la recherche
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

- **Bundle** : découpé (`vite.config.ts`, `manualChunks`) — **137 Ko gzip au premier rendu**, puis `three` (261 Ko gzip, à la demande), `donnees-monde` (85 Ko) et `donnees-amateurs` (133 Ko) en parallèle. `Hero3D` est bien
  lazy-loadé depuis `Accueil.tsx`, mais **Three.js finit quand même dans le
  chunk principal** parce que `TropheeGagne` (R3F) est importé en dur dans
  `App.tsx` — le lazy-loader serait le prochain gain facile. Les données réelles
  pèsent ~275 Ko de source (~90 Ko gzip) : c'est le prix des 6 306 joueurs.
- Pas encore de matchs joués un par un : la saison est résumée en un bilan
  (classement + matchs + essais simulés). `titres` n'est alimenté que par
  `resoudreTrophees()` — le MJ ne peut toujours pas le faire évoluer.
- `saisonSuivante()` régénère la forme (+10), vieillit le joueur, simule ses
  matchs et ses essais de la saison, puis résout le bilan sportif.
  `prendreRetraite()` fige la carrière dans `pantheon`.
- **Classement « multijoueur » = local** pour l'instant (`classementComplet` =
  légendes fictives + panthéon + carrière en cours). Le vrai online demande un
  **backend** (Supabase/Firebase). De même, exposer la clé Groq en public
  demanderait un **proxy backend** avec quota par joueur.
- **Offres de transfert** : générées dans `saisonSuivante()` (`genererOffre` —
  seuils `SEUILS_OFFRE` par division cible, 6 cibles, proba 70 %). Le choix
  « signer » porte `issue.transfert` → `resoudreChoix` change `joueur.club/division`.
  Pas encore de **relégation** ni d'offres étrangères (Monde) — pistes futures.
- **Économie d'Ovas VOLONTAIREMENT DURE** (demande utilisateur) : départ 0,
  action IA +1, saison +3, évènements/scénarios via `gainOvas()` (= base/8,
  min 1), retraite score/150. Le solde n'apparaît **que dans la Boutique**
  (pas de badge nav, pas de « +X 🪙 » dans le journal ni sur les boutons).
  Ne pas ré-augmenter les gains ni réafficher les coins in-game sans demande.
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
  en Nationale.** Les classements de `tous_les_classements.json` sont donc ceux
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
- **Fond du hero** : `ModeleStade` affiche désormais `public/m3d/poteaux.glb`
  (le stade a été retiré à la demande de l'utilisateur). Fallback : poteaux codés.
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
  plusieurs dossiers de `logos_equipes/` mais l'image est identique.

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
jamais la produire deux fois. Avec une clé Groq, `rafraichirFil()` vient
enrichir la même fournée — une fois par semaine, plus toutes les 90 s.

| Fichier | Ce qui change |
|---|---|
| `src/lib/vie.ts` | Gabarits par type de compte **avec alternatives** : `{ce soir\|demain\|dimanche}` est tiré à la graine. Un gabarit à trois alternatives de trois choix, c'est 27 phrases — le pool tient sur un écran et ne se répète quasiment jamais (mesuré : 40 textes distincts sur 48). ⚠️ Les variables (`{club}`, `{adverse}`…) sont substituées **avant** les alternatives, sinon un `{adverse}` niché cassait la reconnaissance et le gabarit brut s'affichait tel quel. Un pool `CONTEXTE` par type de semaine colle le fil au calendrier (journée, Coupe d'Europe, Tournoi, phase finale, mercato). Les clubs et les championnats répondent **en institutionnel** même quand on les insulte (`INSTITUTIONNELLES`). |
| `src/lib/social.ts` | **`statsDePost` / `statsDepuisVues` / `audienceDe`** : tous les compteurs passent par là, **en cascade** (audience → vues → likes → reposts). Avant, chaque source tirait ses chiffres dans son coin — un compte de supporter affichait 40 000 vues, et il arrivait qu'un post ait plus de reposts que de likes. Vérifié : 0 incohérence sur 40 publications. |
| `src/store/useGame.ts` | `repondreAuPost(id, texte)` — **commenter** : ta réponse s'ajoute sous le post, l'auteur **riposte** (Groq s'il y a une clé, sinon `reponseLocale`), et le ton de ton commentaire **fait bouger la relation** exactement comme un message privé. `reposter(id)` — le repost apparaît **sur ton profil** et donne un peu de portée à l'auteur. |
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
n'échoue jamais. `filGroq` résout les mots-clés de l'IA en parallèle après avoir
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
- Avec une clé Groq, `rafraichirFil()` fait écrire les commentaires des **deux
  publications les plus lues** par l'IA (`reponsesGroq`) — deux appels par
  semaine, pas un par tweet. Les réactions locales restent en dessous si l'appel
  échoue.
- ⚠️ **Les images sont RARES** (demande explicite) : le prompt le dit, mais
  surtout `filGroq` plafonne à **une image par salve**, et seulement pour un
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
| `moteur/consignes.ts` | Le coaching en direct (mots-clés, puis Groq si une clé est là). |
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

- `FORCE_NATION` (32 nations) donne la hiérarchie ; `jouerTestMatch()` en tire
  un score, avec `scorePossible` — **0 score impossible sur toutes les journées**.
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
- Avec une clé Groq, c'est le MJ qui écrit la situation ; sans clé, on pioche
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
- **`comptesGroq` a été supprimé** : l'IA inventait des comptes AVEC leur nombre
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

## ⚠️ ÉCONOMIE DE TOKENS GROQ (demande explicite)

| | avant | maintenant |
|---|---|---|
| appels par semaine de jeu | **3** (fil + 2 salves de commentaires) | **1** (les commentaires sont dans la même réponse) |
| comptes à suivre | 1 appel IA | **0** — l'annuaire du jeu |
| `REGLES` (envoyé à chaque appel) | ~350 tokens | ~150 |
| décor du monde | 12 coéquipiers détaillés + 10 rivaux, **à chaque appel** | `decorCourt` (1 ligne) partout sauf pour le fil |
| `maxTokens` fil / réponses / message privé | 1300 / 900 / 400 | 1100 / 480 / 220 |
| historique du MJ | 8 messages entiers | 6, tronqués à 600 caractères |
| fiche du joueur | 9 lignes | 4, palmarès borné aux 3 derniers titres |

**La consommation est mesurée** : `consoGroq()` (lib/groq.ts) cumule l'`usage`
exact renvoyé par l'API, et ⚙️ Réglages l'affiche (appels, tokens envoyés,
tokens reçus, remise à zéro). On ne peut pas économiser ce qu'on ne mesure pas.

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

Source : le dossier **`new league/`** (flashscore_rugby_data.json + un dossier
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
à l'exécution** par Groq — le récit du Maître du Jeu, les situations, les tweets,
les messages privés, le coaching en direct. On ne les traduit donc pas : on
demande au modèle d'écrire DIRECTEMENT dans la langue du joueur.

`consigneDeLangue()` est ajoutée en tête de **chaque** prompt (`lib/groq.ts`,
`lib/ia.ts`, `lib/groqSocial.ts`, `lib/moteur/consignes.ts`). Elle est rédigée en
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

**Écrit dans la langue du joueur par l'IA** (avec une clé Groq) : tout le récit,
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

- **Les écussons de sélections** viennent du dossier `bonne selection/`
  (`node scripts/copierLogosSelections.cjs`). Les anciens pesaient 150 à 1 200
  octets — de simples vignettes ; les nouveaux, 3 à 12 Ko, sont les vrais
  écussons. ⚠️ `LogoEquipe` perd son `loading="lazy"` : même leçon que pour les
  avatars de L'Ovale, sur des vignettes de 40 px dans un conteneur en
  `content-visibility: auto`, le chargement ne se déclenche jamais. Vérifié en
  jeu : 41 écussons sur 41 affichés.
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
node scripts/copierLogosSelections.cjs        # « bonne selection/ » → public/logos/
```
