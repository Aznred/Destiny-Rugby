# Paiements Stripe — environnement de test

La boutique utilise Stripe Checkout pour ses recharges : 100 Ovas à 0,99 €, 550 à 4,99 € et 1 200 à 9,99 €. Les prix et les quantités sont déterminés par le serveur. Aucun paiement réel n’est accepté par cette version.

## Configuration de l’hébergement

Ajouter les variables sensibles côté serveur (jamais avec le préfixe VITE_) :

- `STRIPE_SECRET_KEY` : clé restreinte `rk_test_…` du compte de test Destiny Rugby, autorisée à créer des sessions Checkout ; une clé secrète de test fonctionne également.
- `STRIPE_WEBHOOK_SECRET` : secret de signature `whsec_…` fourni par le point de terminaison Stripe.
- `APP_URL` : origine HTTPS du jeu, sans chemin, par exemple `https://destiny-rugby.fr` si c’est le domaine utilisé.
- `DATABASE_URL` : connexion existante à la base du jeu.

La connexion Stripe de Codex ne transmet pas de clé API à l’application. Ne pas envoyer ces secrets dans une conversation ou les enregistrer dans Git.

Déployer les nouveaux fichiers, puis configurer dans Stripe **en mode test** le point de terminaison `APP_URL/api/stripe-webhook` pour :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copier son secret de signature dans la variable serveur correspondante et redéployer pour prendre en compte les variables.

## Base de données

Le schéma `serveur/schema-paiements.sql` crée la table `achats_stripe`. Il a été appliqué le 26 septembre 2026 sur la base configurée dans le projet. Pour une autre base :

```sh
node scripts/appliquerSchema.mjs serveur/schema-paiements.sql
```

Le crédit et l’enregistrement du reçu sont atomiques. La session Stripe est unique : un événement répété ne double pas le solde. Le compteur `achatsOvas` évite qu’une sauvegarde locale antérieure au paiement efface les Ovas achetés. Le crédit concerne la boutique du compte, pas les portefeuilles distincts des ligues privées.

## Vérification

```sh
npm run verify:paiements
npm run build
```

Le test automatisé local vérifie les signatures, les paiements différés, les notifications répétées, le refus des montants incorrects et les sauvegardes concurrentes au crédit. Il ne simule pas une transaction complète sur Stripe.

Une fois l’hébergement configuré, se connecter dans le jeu, ouvrir la boutique, acheter une recharge avec une carte de test Stripe et vérifier son crédit après confirmation du webhook. Une annulation ne crédite rien. Le retour navigateur seul ne crédite rien non plus.

Pour tester en local, charger les variables serveur au lancement de Vite et transférer les événements Stripe avec `stripe listen --forward-to localhost:5173/api/stripe-webhook`. Utiliser le secret affiché par cette commande pour `STRIPE_WEBHOOK_SECRET`. Le serveur local emploie sa propre base fichier de développement.
