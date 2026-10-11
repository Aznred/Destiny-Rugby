# AppLixir — publicités récompensées

Le SDK v6.1 est centralisé dans RewardedAdsService. Préparer une session ne lance aucune annonce : un second clic volontaire ouvre le lecteur. Les sons du jeu sont suspendus pendant l'annonce puis repris ; le lecteur, les médias et les temporisations sont nettoyés. Une complétion navigateur n'accorde aucun gain.

## Configuration

La clé publique de test se règle dans Kiri Labo → Publicités. APPLIXIR_API_KEY peut la remplacer côté serveur ; APPLIXIR_TEST_API_KEY choisit une clé de test dédiée. Le serveur lit APPLIXIR_CALLBACK_SECRET, une valeur secrète sans le préfixe de variable. La garder dans .env.local et dans les variables serveur Vercel des environnements utilisés. Elle n'est jamais exposée au Labo ni au navigateur. APPLIXIR_GAME_ID est facultatif.

Dans AppLixir → Callbacks → Destiny Rugby, l'override est configuré sur https://destiny-rugby.fr/api/carriere?applixirCallback=1, mode MD5 and TID. Le secret partagé a été enregistré manuellement. Le site est encore Under Review et sa clé est Test au contrôle du 11 octobre 2026. Les previews et le développement restent en TEST ; LIVE nécessite le choix du Labo, VERCEL_ENV=production et APPLIXIR_LIVE_APPROVED=true après l'approbation du fournisseur.

La migration additive schema-publicites.sql a été appliquée à Neon le 11 octobre 2026. Elle ajoute pub_comptes, pub_sessions, pub_transactions et pub_ecrire. npm run base:appliquer inclut cette migration ; le callback ne sera opérationnel sur le domaine public qu'après déploiement du code et configuration du secret dans Vercel. Ce chantier local ne confirme pas ces deux dernières étapes.

## Droits et tirage

Chaque annonce utilise une session UUID privée, signée comme userId, valable quinze minutes. Le serveur vérifie MD5(gameApiKey + gameId + userId + tid + secret), la clé de session, la signature en temps constant, l'état et l'expiration. customData n'est pas une autorité. Un TID ne peut être consommé par deux sessions. NO_FILL, CLOSED et FAILED libèrent la tentative sans gain ; un callback tardif d'une tentative annulée est refusé.

Le compte possède une seule tentative active, deux Packs Pub maximum par jour, toutes ligues et tous appareils confondus. Le jour change à minuit Europe/Paris. Ovas et limites se règlent dans le Labo. Les écritures utilisent une révision et une transaction SQL atomique pour le reçu, le TID et le crédit. Le registre des Ovas empêche une vieille sauvegarde de retirer le gain.

Le vivier mixte des récompenses inclut les pochettes masculines et féminines. Les doublons interdits, le stock, les publications, les événements actifs et leurs dates sont vérifiés avant la vidéo. Les pochettes génériques de variantes ont été retirées ; Bronze, Argent, Or et Élite gardent leur pochette de base. Mythique garantit une Mythique. ICON et Créateurs sont exclus de la roulette. Le pack privé Kiri reste privé. Les poids automatiques donnent Bronze 25 %, Argent 20 %, Or 10 % lorsque ces trois packs sont disponibles ; les autres partagent 45 %, avec un poids inverse à la valeur. Le Labo peut remplacer chaque poids ; un champ vide remet le défaut et zéro exclut le pack.

Au callback, le pack est choisi côté serveur et son contenu réservé avant réponse. Fermer la roulette ou recharger ne retire pas le droit ; la reprise propose le pack réservé. L'ouverture utilise un reçu stable lié à la session et remet exactement ces cartes une fois. Le contenu réservé reste privé dans les vues de ligue. La roulette de 5,8 secondes, les étincelles et le second élan ne modifient ni le tirage ni les chances. Les WebP réutilisent les vraies textures des GLB.

## Vérification

npm run verify:publicites contrôle notamment l'authentification, le quota interligues, les callbacks falsifiés/rejoués, les crédits concurrents, la reprise, les chances et le nettoyage du SDK. npm run verify:publicites-sql contrôle les verrous et reçus sur Neon ; les écritures d'essai sont annulées par rollback. Le Labo cumule les distributions réellement obtenues et les probabilités de chaque tirage, même quand les poids changent.

/scripts/apercuPublicites.html est un banc Vite de simulation : il affiche aussi un inventaire spécial simulé comme publié pour examiner toutes les textures, sans publier de cartes ni créditer de compte réel. Le mode simulé peut vérifier complete, no-fill, skipped et error. Une vidéo réelle, son callback sur le domaine public et la réception dans le compte doivent encore être contrôlés après le déploiement.
