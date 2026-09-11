# Transferts de la carrière — 11 septembre 2026

Mise à jour : voir [CAPACITE-1200-LIGUES.md](CAPACITE-1200-LIGUES.md) pour les
mesures du second passage et la cible de 20 000 commandes/jour/ligue.
Les 500 Go/mois ne sont pas garantis par les corrections présentes.

Diagnostic en lecture seule sur la base configurée : huit ligues, dont une
ligue active de 4 264 734 octets JSON PostgreSQL. Son journal représentait
3 509 761 octets. 2 049 commandes enregistrées sur les 24 dernières heures.
Ce sont des observations à un instant donné, pas une attribution exhaustive
des octets facturés : les statistiques SQL par requête ne sont pas installées.

## Correction

Les colonnes `transfert_version`, `transfert_manifest`, `catalogue_revision`
et la table `carriere_transfert_blocs` sont additives. Le moteur conserve son
état complet et tous ses reçus ; aucun historique n'est supprimé.

Les tableaux sont découpés en pages adaptées (1 club/rencontre, 8 cartes,
16 transactions, 32 autres éléments), compressées et stockées avec leur SHA-256.
Le serveur lit seulement les différences d'empreintes et les pages absentes de
son cache dans une même photographie SQL. Il vérifie les hashes.
Le cache des pages est limité à 48 Mio logiques et celui des ligues à 32 Mio
logiques (les objets JavaScript ont une surcharge mémoire supplémentaire).
Les pages inchangées ne sont pas réécrites ; les pages obsolètes sont retirées.

CAS, état, pages et reçu utilisent une seule instruction/transaction SQL.
Si une écriture concurrente remplace une page entre les lectures, le lecteur
revient à une lecture atomique de `donnees`. Un ancien serveur invalide le
manifeste lorsqu'il écrit : le nouveau code relit alors l'état canonique.
Le jeu reste compatible avant la migration et pendant le déploiement.

Les sondages sans changement utilisent aussi la révision du catalogue en
colonne : ils fonctionnent dès le démarrage d'une instance. La collection
réutilise le cache cohérent de ligue. Les recherches d'appartenance utilisent
l'opérateur de contenance correspondant à l'index GIN existant.

## Mesures et limites

Initialisation réelle du premier passage (pages de 128) : 4 028 403 octets de JSON compact contre 720 283 octets
pour manifeste + pages compressées de la grande ligue, soit 82,1 % de moins.
L'écart avec le chiffre PostgreSQL vient des espaces de sa représentation texte.
Ces volumes représentent les corps logiques mesurés, pas une nouvelle mesure
du tableau de facturation Neon ni les en-têtes du protocole.

Premier test synthétique avec les pages de 128 : 1 617 886 octets JSON,
109 653 octets compressés ; ajouter une transaction et modifier le solde/la
version change trois pages représentant 773 octets. Le manifeste s'ajoute à
chaque lecture de version modifiée. Un nouveau serveur doit lire les pages
initiales ; un serveur chaud réutilise son historique.

**Cette correction réduit surtout les transferts sortants.** L'état canonique
JSONB est encore réécrit à chaque vraie commande, pour conserver la compatibilité
avec les serveurs actuels. Le CPU, le WAL et l'historique de restauration ne
deviennent pas nuls. Garantir 1 000 ligues actives exige encore un test de charge
représentatif et, pour borner les écritures du journal, son extraction du document
canonique avec adaptation des statistiques et de la provenance des cartes.
La compression PostgreSQL sur disque ne suffit pas à réduire les transferts :
[documentation Neon](https://neon.com/docs/introduction/network-transfer).

## Mise en service et vérification

1. Appliquer `serveur/schema-transfert.sql`, puis `serveur/schema-transfert-delta.sql` avec `scripts/appliquerSchema.mjs`.
2. Exécuter `npm run base:transfert` pour préparer les ligues existantes. Une
   ligue modifiée pendant cette étape est ignorée sans écraser ses changements.
3. Déployer le serveur modifié : la migration seule n'active pas les nouveaux
   chemins de lecture sur les anciennes instances.
4. Exécuter `verify:db-transfert` et `verify:db-transfert:integration`.
   Le second crée uniquement sa ligue temporaire, puis la supprime dans `finally`.
5. Contrôler les transferts quotidiens après déploiement à activité comparable.

Le test d'intégration vérifie l'aller-retour exact, l'isolation des objets du
cache, les recherches par code, l'idempotence, deux écritures concurrentes,
un ancien écrivain et une page absente. En retour arrière, redéployer l'ancien
code : les colonnes et pages additives peuvent rester en place sans perte de partie.
