# Objectif 500 Go/mois : état mesuré et prochaine étape

Le 11 septembre 2026, la cible a été précisée à **jusqu'à 20 000 commandes
par jour et par ligue**, pour plus de 1 000 ligues. Le scénario de dimensionnement
retenu est 1 200 ligues, 30 jours, chacune au maximum toute la période.

Cela représente 720 millions de commandes par mois. Les 500 Go décimaux laissent
694 octets par commande **avant les consultations, les matchs et les redémarrages**.
À 1 000 ligues exactement : 600 millions de commandes et 833 octets par commande.

## Mesure réelle d'un petit scénario, extrapolation mensuelle

Le script `scripts/mesurerCapaciteDb.ts` crée un compte et une ligue temporaires
à 4 clubs, avec 10 000 transactions historiques. Il exécute 12 ouvertures de
packs via le véritable gestionnaire API et le pilote Neon, puis supprime ses
données. Aucun compte ni aucune partie des joueurs n'est modifié.

Il compte les corps HTTP réellement reçus du pilote, enveloppes de réponse SQL
incluses, hors en-têtes HTTP/TLS et éventuelle compression de transport. C'est
une mesure du protocole reçue par le client, **pas la facturation Neon**, et ce
n'est **pas un test de débit ou de latence avec 1 200 ligues simultanées**.
Résultats détaillés : [mesure-capacite-db.json](mesure-capacite-db.json).

| Opération | Octets moyens reçus de Neon |
| --- | ---: |
| Commande, serveur et ligue déjà en cache | 660 |
| Consultation après modification depuis une autre instance déjà chargée | 7 243 |
| Sondage avec version inchangée | 390 |
| Démarrage d'une nouvelle instance | 602 978 |

À 1 200 ligues × 20 000 commandes × 30 jours :

- Commandes chaudes seules : **475,2 Go**.
- Commandes et une consultation depuis une autre instance après chacune :
  **5 690,2 Go**.
- Ces deux projections excluent le trafic supplémentaire des autres écrans,
  sessions, matchs, réveils, redémarrages et la croissance du journal.

Le deuxième scénario est un scénario explicite de sensibilité, pas une
prévision du nombre réel de lecteurs. Il suffit toutefois à montrer que le
plafond de 500 Go n'est pas garanti. Même le scénario chaud laisse trop peu
de marge à 1 200 ligues. Les résultats d'un historique de 10 000 transactions
ne peuvent pas être extrapolés comme un coût fixe de démarrage après un mois
à plusieurs centaines de milliers de transactions par ligue.

## Corrections livrées au second passage

- Lecture du delta en une seule photographie SQL ; pas de mélange de versions.
- Empreintes et pages inchangées exclues de la réponse.
- Description des tableaux par nombre de pages : ajouter une carte ne renvoie
  plus la liste de toutes les pages du journal.
- Pages plus petites pour les ressources souvent modifiées ; compression
  évitée pour les pages dont l'empreinte n'a pas changé.
- Vérification des reçus et de la version regroupée. Membres inchangés non
  retransmis si la version est celle du cache validé.
- Sondage inchangé rendu par une réponse scalaire, avec contrôle d'appartenance.
- Réservations du limiteur par lots de 4, sous verrou SQL partagé. Le plafond
  global n'augmente pas. Une instance arrêtée peut perdre ses autorisations
  inutilisées : elle peut donc limiter plus tôt, jamais autoriser trop d'actions.
- L'empreinte de mot de passe n'est plus lue pour vérifier une session.

Les migrations sont additives. Le premier serveur publié reste compatible
pendant le déploiement du second. L'ancien état JSONB et les reçus sont conservés.

## Architecture à mettre en place pour la cible intensive

c
[Mesure et réduction du transfert Neon](https://neon.com/docs/introduction/network-transfer).
