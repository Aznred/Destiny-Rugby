# Notifications téléphone et nouveau direct

Le direct garde le moteur de rugby et ses 80 minutes réelles (hors décisions).
Le direct affiche maintenant un terrain 2D avec les positions du serveur, des pions numérotés et le ballon. Vue complète et suivi du ballon sont disponibles. Les moments forts affichent le commentaire et le score historiques pendant que le terrain reste en direct. Les MP4 ne sont plus utilisés ; les actions historiques ne sont pas des replays animés.

## Mise en service

1. Appliquer `serveur/schema-push.sql` à la même base Neon que la carrière :
   `node scripts/appliquerSchema.mjs serveur/schema-push.sql`.
2. Générer une seule paire VAPID avec `npx web-push generate-vapid-keys` et conserver
   la clé privée dans les secrets de l'hébergeur. Configurer WEB_PUSH_PUBLIC_KEY,
   WEB_PUSH_PRIVATE_KEY et WEB_PUSH_SUBJECT (mailto:adresse-du-responsable ou URL
   HTTPS publique). Ne jamais utiliser de préfixe VITE_ pour ces secrets.
3. Déployer sur Vercel. La fonction api/matchs.ts consomme le topic
   destiny-matchs déclaré dans vercel.json via Vercel Queues. L'authentification
   est assurée par le SDK et l'identité Vercel du projet. Aucun VPS nécessaire.
   Une rencontre future est planifiée avec un délai ; un match en cours se
   réveille toutes les 5 à 10 secondes. La chaîne se termine quand il n'y a plus
   de rencontre à suivre. Les doublons de livraison sont tolérés.
4. Conserver CRON_SECRET pour le cron quotidien de rattrapage déjà présent.
   Une activation des alertes ou une action dans une ligue lance sa programmation.
   Le cron quotidien seul ne fournit pas le direct. Aucun changement de formule
   Vercel n'est effectué ; surveiller l'usage Queues et Functions du projet.
5. Sur iPhone iOS 16.4+, ajouter le site à l'écran d'accueil depuis Safari,
   ouvrir cette icône, se connecter puis activer les alertes dans Calendrier.
   Sur Android compatible, ouvrir le jeu en HTTPS et autoriser les notifications.
6. Utiliser « Envoyer une notification de test ». Verrouiller ensuite le téléphone
   pendant un match de test. Vérifier un essai, une transformation, une pénalité,
   un carton, la fin du match et le clic qui ouvre la bonne rencontre.

Le test réel sur téléphone et le déploiement exigent les accès à l'hébergement
et un téléphone autorisant les alertes. Une compilation locale ne valide pas
la livraison par Apple/Google. Le système, le réseau et le mode Concentration
peuvent retarder la réception. Une décision expirée n'est plus envoyée.

Les abonnements sont limités au club du compte connecté, par ligue et appareil.
Le serveur vérifie la session, l'appartenance, les origines et les services push
acceptés. Les adresses push ne doivent jamais être journalisées. Les livraisons
sont dédupliquées par événement/appareil et compte en base ; les erreurs réseau
sont retentées au prochain passage pendant la durée de validité de l'alerte
(2 minutes). Une livraison confirmée par le service n'est pas une garantie que
le téléphone l'a affichée. Les abonnements expirés 404/410 sont supprimés.

Maintenance quotidienne : supprimer les reçus de carriere_push_envois âgés de
plus de sept jours. Les notifications ne stockent pas les mots de passe et le
service worker ne met pas les réponses privées de l'API en cache.

## Vérification et assets

`npm run verify:direct-push` teste les événements, les scores, les abonnements,
les autorisations et la déduplication sans envoyer d'alerte à des utilisateurs.
`npm run verify:carriere` vérifie le moteur partagé et ses décisions.
`npm run build` compile le jeu. `npm run videos:moments` régénère les clips
manquants et l'affiche ; les clips présents sont conservés.

Le catalogue ne contient pas encore les 100 à 300 vidéos détaillées envisagées.
Ces 27 reconstitutions stylisées constituent la première bibliothèque utilisable.
Le moteur actuel ne produit pas d'événement blessure explicite dans les matchs
online ; le canal l'accepte dès que le moteur en expose un. Aucun texte ne
fabrique une blessure, un joueur ou un score absent de la simulation.

Références officielles consultées le 9 septembre 2026 :
- https://vercel.com/docs/queues/sdk (livraison Node, délai et idempotence)
- https://vercel.com/docs/queues/pricing (quotas, facturation et rétention)
- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

Le script horloge:matchs reste facultatif pour un environnement local ou un
hébergeur autre que Vercel. Ne pas lancer deux horloges en production.

## Résultats de validation de cette version

- Compilation Vite et vérification TypeScript de l'API Node réussies.
- Tests direct/push réussis : destinataires, scores, délais, déduplication,
  reprises, abonnements expirés, autorisations, activation et désactivation.
- Lecture MP4, retour au direct et interruption par décision vérifiés dans le
  navigateur ; largeur mobile de 380 px sans débordement horizontal.
- La suite générale carrière signale deux échecs dans les packs (iles/star) et
  les arrondis (1234 → 1200). Les modules de catalogue et d'économie concernés
  n'ont pas été modifiés par cette refonte. Ces deux contrôles restent à traiter.
- Ni déploiement Vercel, ni migration de la base de production, ni envoi réel
  sur téléphone n'ont été exécutés dans cette intervention.
