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

## Formation

7 433 agrégats club/genre sont conservés en base privée. La note de formation utilise volume, niveau des équipes, apparitions et surclassements lorsqu'ils sont renseignés. Elle influence le nombre de jeunes, leur GEN initial, leur potentiel et les probabilités de pépite. Les distributions de postes observés sont lissées pour conserver tous les postes du rugby. Noms, photos et identifiants des personnes sources ne sont jamais recopiés dans les regens.

Les courbes de progression par poste utilisent le moteur existant. Les potentiels réels de l'académie restent cachés ; les estimations du recrutement dépendent du staff. Les promotions nouvelles conservent également une fourchette estimée.

## Bêta féminine

`player_feature_access` accorde `feature_womens_rugby` uniquement à l'identifiant immuable du compte Kiri, avec le rôle `INTERNAL_TESTER`. Aucun pseudo envoyé par le navigateur ne confère cet accès. Toutes les lectures, commandes et adhésions à une ligue féminine vérifient ce droit côté serveur, avant même une réponse conditionnelle 304. Les packs, recherches et marchés ordinaires restent masculins.

Kiri dispose de **Labo → Base joueurs**, avec recherche serveur paginée (20 profils par page, maximum 50), filtres, édition, approbation/rejet et prévisualisation de carte. Une résolution d'homonymie exige une preuve écrite conservée dans le journal de validation. Les identités/photos jeunesse restent masquées même dans cette interface.

La ligue féminine utilise le même moteur pour packs, composition, échanges, matchs et classement. Elle exige 30 joueuses approuvées couvrant toutes les familles de postes. Le premier lot de 45 profils éligibles ne comporte pas de talonneuse : la validation d'autres profils est nécessaire avant une ligue jouable. Aucun poste n'est inventé pour contourner ce manque. Aucune carrière féminine n'est ajoutée.

Club, nation et compétition ont des identifiants indépendants du genre. `calculateChemistry` fonctionne pour hommes, femmes et compositions mixtes. Le pool mixte est préparé, mais sa création publique reste fermée.

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
