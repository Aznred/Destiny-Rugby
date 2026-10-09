# Base FFR 2026_10_FFR_FULL

470 742 profils ont été classifiés et importés dans les tables privées de la base de production. Les personnes sources, les joueurs validés et les exemplaires de cartes restent séparés. Les fichiers sources et snapshots sont dans `.ffr/`, exclus de Git et du répertoire public.

## Décisions de classement

| Utilisation | Nombre |
| --- | ---: |
| Seniors masculins | 136 921 |
| Seniors féminines | 39 839 |
| Sources jeunesse | 131 426 |
| Statut à vérifier | 162 556 |

La première validation automatique retient 180 seniors masculins. 45 seniors féminines remplissent les critères sportifs, mais restent **PENDING** jusqu'à validation par Kiri. Les 401 609 profils signalés par rapprochement de nom restent des candidats au contrôle : un nom identique ne prouve pas une identité unique. Ils ne sont pas fusionnés automatiquement et ne produisent pas de nouvelles cartes tant que cette ambiguïté subsiste.

Une carte nouvelle exige un statut senior, une saison récente, au moins trois matchs, un club, une compétition reconnue, une confiance d'identité ≥ 0,85, une confiance de poste ≥ 0,65 et une confiance globale ≥ 0,65. Le GEN combine le niveau de compétition avec les apparitions, titularisations, performances disponibles, poste et force du club. Les données absentes restent absentes. Les Espoirs restent à vérifier lorsqu'aucune preuve explicite de statut senior n'est disponible.

## Protection de la jeunesse

13 641 références historiques ont été identifiées pour retrait. Les fichiers publics d'effectifs conservent des emplacements vides : les indices des autres joueurs ne changent pas. 13 920 entrées d'effectif ont ainsi été retirées, certaines références étant présentes dans plusieurs clubs. Les portraits concernés ont été archivés dans `.ffr/` puis retirés du répertoire public. Les données publiques de formation contiennent uniquement des agrégats masculins de cohortes d'au moins cinq personnes.

La migration conserve les anciennes références primaires, anonymise les récits et instantanés, annule les ventes et échanges, répare les compositions courantes et enregistrées, et attribue une carte fictive de GEN/POT équivalents au propriétaire. La collection solo conserve le nombre d'exemplaires en remplaçant chaque référence retirée par une carte senior de même famille, au GEN équivalent ou supérieur. Aucune monnaie premium n'est créditée.

Chaque sauvegarde de ligue est prise avant l'écriture par comparaison de version. La collection solo utilise une transaction comprenant snapshot, conversion et log. Une nouvelle exécution n'attribue pas de seconde compensation. Pendant le déploiement, une sauvegarde complète ne peut pas effacer une collection encore en attente de compensation ; les deltas conservent ces exemplaires en base. Les anciennes sauvegardes ne peuvent pas réintroduire les clés retirées. Les files durables du marché rendent les Ovas effectivement réservés, sans double remboursement. Une vente déjà partiellement soldée bloque l'application automatique afin de rapprocher les deux ligues avant restitution.

L'audit de production initial a trouvé 934 cartes de jeunes dans 34 ligues, 369 utilisées en composition, 3 annonces locales, 2 annonces communes et des exemplaires dans 65 collections solo. Les nombres évoluent avec l'activité des joueurs : consulter `migration-plan.json` pour la simulation la plus récente et `migration-result.json` après application. Le socle historique `cartes` a été vérifié vide.

**Compensations appliquées en production le 8 octobre 2026** : 935 cartes fictives dans 34 ligues et 523 029 exemplaires convertis dans 70 collections solo. L'audit après application constate zéro carte jeunesse active, possédée, en composition, en vente ou en échange. Les anciennes références sont conservées ; aucun GEN de compensation solo n'est inférieur au GEN retiré. Les totaux consolidés sont dans `compensations-verification.json`, le rapport après migration dans `production-audit-after.json`.

La conversion solo travaille entièrement sous verrou SQL : elle prend le snapshot du coffre courant, regroupe les exemplaires par carte de remplacement, incrémente la révision et écrit le journal dans la même transaction. Elle ne dépend pas d'une pause entre deux sauvegardes utilisateur et ne réécrit pas les autres champs du coffre. La recherche de compensation trie une seule fois les cartes seniors, puis cherche par famille et GEN ; elle conserve le choix déterministe utilisé lors de la première application. Les annulations d'échanges de ligue rendent les Ovas réservés et libèrent aussi les cartes adultes qui accompagnaient la carte retirée.

## Formation

7 433 agrégats club/genre sont conservés en base privée. La note de formation utilise volume, niveau des équipes, apparitions et surclassements lorsqu'ils sont renseignés. Elle influence le nombre de jeunes, leur GEN initial, leur potentiel et les probabilités de pépite. Les distributions de postes observés sont lissées pour conserver tous les postes du rugby. Noms, photos et identifiants des personnes sources ne sont jamais recopiés dans les regens.

Les courbes de progression par poste utilisent le moteur existant. Les potentiels réels de l'académie restent cachés ; les estimations du recrutement dépendent du staff. Les promotions nouvelles conservent également une fourchette estimée.

## Vivier privé de carrière — Correctif 34

La source utilisée est `C:\Users\Utilisateur\Desktop\rpg strat\Objectif Ffr\exports\joueurs.json` : 470 742 identités source uniques, avec l'empreinte SHA-256 `93087b60389b059212a0e459845a73e0966cf8780f42d1ce32d0cc296d845d5f`. Le snapshot local `2026_10_FFR_CAREER34_V2` contient **792 profils masculins identifiés et utilisables**, dont 52 sources jeunesse et 740 Espoirs ; chacun possède un club et un poste observé. **Les 792 âges sont estimés à partir des catégories ou de leurs bornes, aucun n'est un âge exact connu**. Les profils sans poste observé, sans club, sans âge exploitable ou de genre inconnu restent exclus du vivier jouable. L'identifiant canonique `ffr_<licence>` est partagé entre jeune et senior ; les homonymes ne sont jamais fusionnés par leur nom. Les clubs reconnus utilisent le nom canonique du jeu, avec conservation du libellé et de la saison réellement observés.

Les identités restent dans `.ffr/`, puis dans le snapshot IndexedDB de chaque carrière ; elles ne sont pas intégrées aux fichiers publics, aux photos ni au catalogue de cartes. `src/data/versionJeunesFfr.generated.ts` expose seulement la version, la date de référence du 8 octobre 2026 et le nombre de profils. La création de carrière épingle cette version avant le chargement authentifié de `/api/carriere?jeunesCarriere=1` (pages de 500, maximum 2 000, curseur et version obligatoirement conservés entre les pages, réponse `private, no-store`). Une sauvegarde reprend son snapshot et sa propre simulation ; un nouvel import ne remplace jamais sa timeline. L'accès direct aux fichiers `.ffr/` est également refusé par le serveur de développement Vite, tandis que la lecture SQLite par Node reste disponible.

Un nouvel import local se prépare avec `node --loader ./scripts/chargeurTypeScript.mjs scripts/importFfrFull.mjs "../Objectif Ffr/exports/joueurs.json" <nouvelle_version> --prive-seulement --activer-carriere-locale` ; `--date-reference=YYYY-MM-DD` précise une nouvelle date réelle. Une reprise refuse toute modification de l'entrée ou de sa date. `scripts/preparerJeunesCarriereFfr.mjs <version_source> <nouvelle_version> --activer-carriere-locale` permet aussi de dériver un nouveau snapshot sans réécrire la version source. L'activation locale remplace les métadonnées publiques et le pointeur privé par des écritures atomiques de fichiers. Le schéma additif `youth_career_sources` et l'envoi privé par `scripts/publierDonneesFfr.mjs` sont préparés, avec vérification du nombre de profils avant activation ; **ils n'ont pas été exécutés pour le Correctif 34 en production, et aucun déploiement de ce correctif n'a été effectué**. Validation locale : `node --loader ./scripts/chargeurTypeScript.mjs scripts/verifierPipelineJeunesFfr.ts --import` (identité jeune/senior, confidentialité, pagination complète, version figée et installation sans import historique).

## Cartes femmes publiques et validation interne

Depuis le 9 octobre 2026, les joueuses réelles seniors du monde féminin généré sont communes à la collection et aux
ligues mixtes ou féminines. Les joueuses fictives qui complètent les effectifs solo restent hors de ce catalogue.
Les packs par championnat ayant des joueuses réelles sont disponibles dans la collection et les ligues privées.
Les divisions publiques sont mixtes et conservent uniquement les packs Bronze, Argent et Or, où les cartes femmes
peuvent sortir. Le marché commun et les échanges de collection acceptent les cartes femmes ; les clubs solo
homonymes conservent des effectifs distincts par genre. Les 45 profils FFR encore en attente ne sont pas approuvés
automatiquement par cette publication.

`player_feature_access` accorde `feature_womens_rugby` uniquement à l'identifiant immuable du compte Kiri, avec le rôle
`INTERNAL_TESTER`, pour la validation interne dans Base joueurs. Aucun pseudo envoyé par le navigateur ne confère cet
accès. Les ligues féminines et mixtes sont ouvertes à tous les comptes ; les ligues privées masculines gardent leur réglage.

Kiri dispose de **Labo → Base joueurs**, avec recherche serveur paginée (20 profils par page, maximum 50), filtres, édition, approbation/rejet et prévisualisation de carte. Une résolution d'homonymie exige une preuve écrite conservée dans le journal de validation. Les identités/photos jeunesse restent masquées même dans cette interface.

La ligue féminine utilise le même moteur pour packs, composition, échanges, matchs et classement. Elle exige 30 joueuses
seniors couvrant toutes les familles de postes. Le catalogue public féminin apporte les joueuses déjà présentes dans
les données de carrière ; les sources privées FFR ne le complètent qu'après approbation. Aucun poste n'est inventé
pour contourner un manque.

Club, nation et compétition ont des identifiants indépendants du genre. `calculateChemistry` fonctionne pour hommes,
femmes et compositions mixtes. Les nouvelles ligues privées sont mixtes par défaut ; leur créateur peut régler le pool.

## Exécution et contrôles

1. Préparer une **nouvelle version**, jamais écraser une version existante : `npm run data:ffr-full -- ../Objectif\ Ffr/exports/joueurs.json 2026_10_FFR_FULL`.
2. Auditer la base et sauvegarder le rapport : `npm run audit:ffr-production`.
3. Appliquer le schéma additif : `node scripts/appliquerSchema.mjs serveur/schema-ffr.sql --sans-confirmation`.
4. Charger les sources privées : `node --loader ./scripts/chargeurTypeScript.mjs scripts/publierDonneesFfr.mjs 2026_10_FFR_FULL --appliquer`.
5. Retirer les identités du paquet public : `node --loader ./scripts/chargeurTypeScript.mjs scripts/retirerIdentitesJeunesFfr.mjs`.
6. Déployer le code de protection, puis simuler : `node --loader ./scripts/chargeurTypeScript.mjs scripts/migrerJeunesseFfr.mjs`.
7. Appliquer la migration : même commande avec `--appliquer`. Elle refuse de modifier les sauvegardes tant que le serveur de production n'annonce pas cette version FFR.
8. Vérifier les sources et autorisations : `node --loader ./scripts/chargeurTypeScript.mjs scripts/verifierFfrProduction.mjs`.
9. Auditer après migration sans écraser le rapport initial : `npm run audit:ffr-production -- 2026_10_FFR_FULL --apres`, puis relancer la simulation pour contrôler l'idempotence.

Les snapshots privés `player_migration_snapshots` permettent une restauration ciblée avec comparaison de version ; une restauration doit conserver les écritures intervenues depuis la migration. Les anciens IDs des cartes seniors ne sont pas remplacés à l'import. Les GEN, postes et photos déjà validés sont conservés lorsqu'un rapprochement source ancien catalogue est univoque.

Validation : compilation TypeScript, build, banc FFR (API réelle, autorisations, packs féminins, migration idempotente, compensations solo, collectif mixte), collection, formation, marché commun et administration Kiri. Interface vérifiée sur ordinateur et mobile avec des profils fictifs. Vérification SQL en production : 470 742 sources, 131 426 profils jeunesse, un seul accès Kiri, 180 hommes approuvés, 45 femmes en attente et recherche paginée sans identité jeunesse.
