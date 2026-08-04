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
