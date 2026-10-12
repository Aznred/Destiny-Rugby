# Récompenses AppLixir : constat du 12 octobre 2026

Message prêt à copier au support AppLixir. Aucun message n'a été envoyé.

Objet : Destiny Rugby — vidéo de test terminée, aucun reçu S2S accepté

Bonjour,

Nous intégrons AppLixir v6.1.0 sur https://www.destiny-rugby.fr/. Le site Destiny Rugby est encore Under Review, avec la clé Test `05e5427c-b82d-48da-be2e-dd43ed3658f9`.

Le webhook global et l'override du site sont maintenant configurés en MD5 and TID sur `https://www.destiny-rugby.fr/api/carriere?applixirCallback=1`, avec le même secret que notre serveur. L'URL directe évite la redirection 308 de notre domaine sans www. La configuration globale persiste après rechargement du tableau de bord. Ses limites existantes sont conservées ; chaque publicité reçoit un userId UUID distinct.

Après ce réglage, un visionnage sur le domaine public a émis les événements du SDK suivants le 12 octobre : start à 10:17:23, firstQuartile, midpoint, thirdQuartile, complete à 10:17:44, puis allAdsCompleted (heures Europe/Paris). Le lecteur a été conservé jusqu'à sa fermeture normale. Aucun message d'erreur de remise du reçu n'a été observé dans la console.

Notre serveur a bien enregistré le démarrage et la complétion locale, mais aucun reçu signé n'a été accepté. Le solde reste inchangé. L'endpoint refuse correctement une requête sans signature ; un contrôle signé portant sur un UUID inexistant atteint le contrôle de session, sans créditer de récompense.

Pouvez-vous vérifier la remise de `/api/v1/callbacks` et du webhook S2S pour cette clé, confirmer que ces callbacks sont actifs en mode Test / Under Review, et préciser les paramètres et le statut HTTP de vos dernières tentatives de livraison ? Nous n'envoyons pas le secret partagé dans ce message.

Merci.

Références : [callbacks officiels](https://support.applixir.com/applixir-integration/integration-for-html5-sites-apps/step-4-setting-up-local-callback-360053188774), [FAQ : le trafic Test est exclu des rapports](https://support.applixir.com/frequently-asked-questions).

## Seconde passe du 12 octobre : la forme de la requête

Mesuré depuis l'extérieur, sans signature : notre adresse de callback suivie de `&gameApiKey=…` répond 403 (signature refusée, donc callback reconnu) ; suivie de `?gameApiKey=…` — un second « ? » — elle répondait 401, comme une requête ordinaire sans session. Si AppLixir construit sa requête en ajoutant « ? » puis ses paramètres à l'adresse enregistrée, aucun reçu ne pouvait être reconnu. Le serveur accepte maintenant les deux formes, une adresse sans « ? » (`/api/applixir`), le POST, et note chaque refus (Labo → Publicités). Question à ajouter au message ci-dessus : « Comment vos serveurs ajoutent-ils leurs paramètres à une adresse de callback qui contient déjà une query string ? »
