# Paiements Stripe

⚠️ **Depuis le Correctif 21, l'argent réel n'achète plus d'Ovas : il achète des CRÉDITS**, la monnaie premium. Les Ovas se gagnent en jouant (matchs, objectifs, saisons, événements). La boutique utilise Stripe Checkout pour six recharges de Crédits : 100 à 0,99 €, 600 à 4,99 €, 1 400 à 9,99 €, 4 000 à 24,99 €, 9 000 à 49,99 € et 20 000 à 99,99 € (les identifiants `p1`…`p6` n'ont pas changé).

Un rayon séparé propose quatre bundles : Vestiaire à 4,99 €, Archétypes à 9,99 €, Club à 19,99 € et Légende à 49,99 €. Ils contiennent des cosmétiques, des traits ou les deux, ainsi qu'un complément de Crédits (200, 500, 1 000, 3 000). Les prix, les quantités et les objets débloqués sont déterminés par le serveur.

Aucun achat ne part sans le clic du joueur : le bouton « Payer … » de la fenêtre de recharge (`components/ModalesMonnaie.tsx`) suit une confirmation qui montre la somme en euros, puis Stripe est lui-même la dernière confirmation. Un solde insuffisant n'ouvre jamais de paiement tout seul.

La colonne historique `achats_stripe.ovas` garde le montant crédité (des Ovas avant le Correctif 21, des Crédits ensuite) : elle ne sert qu'à l'idempotence d'une session, aucune migration n'est nécessaire. Le coffre du compte porte `credits` et `achatsCredits` (même mécanique que `ovas`/`achatsOvas`) ; un ancien paiement dont les métadonnées parlent d'Ovas est refusé.

Les sessions de test désactivent explicitement **Managed Payments**. En production, il est activé et le serveur exige `STRIPE_PRODUCT_TAX_CODE` : ce code doit être choisi par l’éditeur selon le produit réellement vendu, jamais deviné dans le code.

## Configuration de l’hébergement

Ajouter les variables sensibles côté serveur (jamais avec le préfixe VITE_) :

- `STRIPE_MODE` : `test` pour les essais, `live` pour les paiements réels.
- `STRIPE_SECRET_KEY` : clé restreinte `rk_test_…` ou `rk_live_…` du même mode, autorisée à créer des sessions Checkout. Une clé secrète équivalente fonctionne, mais une clé restreinte est préférable.
- `STRIPE_WEBHOOK_SECRET` : secret de signature `whsec_…` fourni par le point de terminaison Stripe.
- `APP_URL` : origine HTTPS du jeu, sans chemin, par exemple `https://destiny-rugby.fr` si c’est le domaine utilisé.
- `STRIPE_PRODUCT_TAX_CODE` : code `txcd_…` du produit, obligatoire en mode `live` avec Managed Payments.
- `DATABASE_URL` : connexion existante à la base du jeu.

La connexion Stripe de Codex ne transmet pas de clé API à l’application. Ne pas envoyer ces secrets dans une conversation ou les enregistrer dans Git.

Déployer les nouveaux fichiers, puis configurer dans Stripe un point de terminaison **pour chaque mode** vers `APP_URL/api/stripe-webhook` pour :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copier le secret de signature du point de terminaison du mode actif dans `STRIPE_WEBHOOK_SECRET`, puis redéployer pour prendre en compte les variables. Le secret de test et le secret live sont différents.

## Base de données

Le schéma `serveur/schema-paiements.sql` crée la table `achats_stripe`. Il a été appliqué le 26 septembre 2026 sur la base configurée dans le projet. Pour une autre base :

```sh
node scripts/appliquerSchema.mjs serveur/schema-paiements.sql
```

Le crédit et l’enregistrement du reçu sont atomiques. La session Stripe est unique : un événement répété ne double ni le solde, ni les objets du bundle. Les compteurs d’achats évitent qu’une sauvegarde locale antérieure au paiement efface les Crédits, cosmétiques ou traits achetés. Le crédit concerne la boutique du compte, pas les portefeuilles distincts des ligues privées.

## Vérification

```sh
npm run verify:paiements
npm run build
```

Le test automatisé local vérifie les signatures, les paiements différés, les notifications répétées, le refus des montants incorrects et les sauvegardes concurrentes au crédit. Il ne simule pas une transaction complète sur Stripe.

Une fois l’hébergement configuré, se connecter dans le jeu, ouvrir la boutique, acheter une recharge avec une carte de test Stripe et vérifier son crédit après confirmation du webhook. Une annulation ne crédite rien. Le retour navigateur seul ne crédite rien non plus.

Pour tester en local, charger les variables serveur au lancement de Vite et transférer les événements Stripe avec `stripe listen --forward-to localhost:5173/api/stripe-webhook`. Utiliser le secret affiché par cette commande pour `STRIPE_WEBHOOK_SECRET`. Le serveur local emploie sa propre base fichier de développement.
