# AppLixir — publicités récompensées

Le SDK v6.1 est centralisé dans RewardedAdsService. Préparer une session ne lance aucune annonce : un second clic volontaire ouvre le lecteur. Les sons du jeu sont suspendus pendant l'annonce puis repris. Le statut IMA `start` est suivi, comme son alias `started`. Le lecteur reste présent jusqu'à `thankYouModalClosed` / `adSkippedNoReward` (repli de cinq secondes) ; le nettoyage est différé après la pile du SDK afin de laisser ses envois de reçu et de télémétrie se terminer. Les rejets asynchrones de l'ouverture libèrent la tentative ; le chargement du script peut être retenté après un échec. Une complétion navigateur n'accorde aucun gain.

## Configuration

La clé publique de test se règle dans Kiri Labo → Publicités. APPLIXIR_API_KEY peut la remplacer côté serveur ; APPLIXIR_TEST_API_KEY choisit une clé de test dédiée. Le serveur lit APPLIXIR_CALLBACK_SECRET, une valeur secrète sans le préfixe de variable. La garder dans .env.local et dans les variables serveur Vercel des environnements utilisés. Elle n'est jamais exposée au Labo ni au navigateur. APPLIXIR_GAME_ID est facultatif.

Dans AppLixir → Callbacks → Destiny Rugby, l'override est configuré sur https://www.destiny-rugby.fr/api/carriere?applixirCallback=1, mode MD5 and TID. Le 12 octobre 2026, l'adresse sans www a été remplacée dans le tableau de bord : elle renvoyait une redirection 308. Après autorisation explicite, le webhook global a également été enregistré avec cette URL, ce mode et le même secret ; sa persistance a été vérifiée après rechargement du tableau de bord. Les limites globales existantes sont conservées : une minute entre callbacks, une violation, maximum daily rewards à 1. Le jeu transmet un userId unique par session publicitaire et applique séparément son plafond par compte. Le secret partagé correspond au serveur public, sans modification du secret. Le site est encore Under Review et sa clé est Test, confirmés dans le tableau de bord le 12 octobre. Les previews et le développement restent en TEST ; LIVE nécessite le choix du Labo, VERCEL_ENV=production et APPLIXIR_LIVE_APPROVED=true après l'approbation du fournisseur. Le sélecteur du Labo ne transforme pas une clé Test en clé Live : le fournisseur décide de l'inventaire à partir de sa clé. Le Labo explique le maintien effectif en Test ; les annonces de test sont exclues des rapports AppLixir.

La migration additive schema-publicites.sql a été appliquée à Neon le 11 octobre 2026. Elle ajoute pub_comptes, pub_sessions, pub_transactions et pub_ecrire. npm run base:appliquer inclut cette migration. Le code est déployé sur le domaine public et le secret serveur a été vérifié le 12 octobre : une requête sans signature est refusée et une requête signée pour un UUID inexistant atteint bien le contrôle de session. Ces contrôles ne simulent aucun visionnage et n'accordent aucune récompense.

## Droits et tirage

Chaque annonce utilise une session UUID privée, signée comme userId, valable quinze minutes. Le serveur vérifie MD5(gameApiKey + gameId + userId + tid + secret), la clé de session, la signature en temps constant, l'état et l'expiration. customData n'est pas une autorité. Un TID ne peut être consommé par deux sessions. NO_FILL, CLOSED et FAILED libèrent la tentative sans gain. Un reçu signé retardé peut corriger cet état local avant expiration, avec contrôle atomique du plafond journalier ; il corrige aussi les compteurs d'échec. Une vidéo sans reçu signé reste sans gain. WATCHED conserve seulement la complétion locale : les sessions à vérifier réapparaissent après rechargement, sans autoriser de crédit client.

Le compte possède une seule tentative active, deux Packs Pub maximum par jour, toutes ligues et tous appareils confondus. Le jour change à minuit Europe/Paris. Ovas et limites se règlent dans le Labo. Les écritures utilisent une révision et une transaction SQL atomique pour le reçu, le TID et le crédit. Le registre des Ovas empêche une vieille sauvegarde de retirer le gain.

Le vivier mixte des récompenses inclut les pochettes masculines et féminines. Les doublons interdits, le stock, les publications, les événements actifs et leurs dates sont vérifiés avant la vidéo. Les pochettes génériques de variantes ont été retirées ; Bronze, Argent, Or et Élite gardent leur pochette de base. Mythique garantit une Mythique. ICON et Créateurs sont exclus de la roulette. Le pack privé Kiri reste privé. Les poids automatiques donnent Bronze 25 %, Argent 20 %, Or 10 % lorsque ces trois packs sont disponibles ; les autres partagent 45 %, avec un poids inverse à la valeur. Le Labo peut remplacer chaque poids ; un champ vide remet le défaut et zéro exclut le pack.

Au callback, le pack est choisi côté serveur et son contenu réservé avant réponse. Fermer la roulette ou recharger ne retire pas le droit ; la reprise propose le pack réservé. L'ouverture utilise un reçu stable lié à la session et remet exactement ces cartes une fois. Le contenu réservé reste privé dans les vues de ligue. La roulette de 5,8 secondes, les étincelles et le second élan ne modifient ni le tirage ni les chances. Les WebP réutilisent les vraies textures des GLB.

## Vérification

npm run verify:publicites contrôle notamment l'authentification, le quota interligues, les callbacks falsifiés/rejoués, les crédits concurrents, la reprise, les chances et le nettoyage du SDK. npm run verify:publicites-sql contrôle les verrous et reçus sur Neon ; les écritures d'essai sont annulées par rollback. Le Labo cumule les distributions réellement obtenues et les probabilités de chaque tirage, même quand les poids changent.

/scripts/apercuPublicites.html est un banc Vite de simulation : il affiche aussi un inventaire spécial simulé comme publié pour examiner toutes les textures, sans publier de cartes ni créditer de compte réel. Le mode simulé peut vérifier complete, no-fill, skipped et error avec les événements de fin de lecteur du SDK v6.1. L'audit initial du 12 octobre a trouvé 44 tentatives conservées et aucun reçu signé. Après correction de l'URL et enregistrement du webhook global, un nouveau visionnage sur le site public a émis start, les trois quartiles, complete à 10 h 17 min 44 s (Europe/Paris), puis allAdsCompleted. La base conserve bien started=true et videoTerminee=true, mais aucun reçu signé accepté : le solde reste à 19 Ovas et l'interface propose la vérification. La réception réelle de la récompense reste donc non validée. Voir DIAGNOSTIC-PUBLICITES-2026-10-12.md pour le constat à transmettre au fournisseur.

## Trois usages de plus (Correctif 42, 13 octobre 2026)

Le registre du compte (`pub_comptes.donnees`) tient désormais quatre contextes : `SHOP_OVAS`, `DAILY_PACK` (ligue),
`SHOP_PREMIUM_PACK` (Boutique, cinq par jour) et `COSMETIC` (un article, son propre plafond par jour). La fenêtre « pas
assez d'Ovas » d'une ligue ouvre une session `DAILY_PACK` : elle partage le plafond du Pack Pub, il n'existe pas de second
compteur. Le pack Premium est tiré au reçu signé et rendu une seule fois par `ouvrirPremium` (la Collection solo tire ses
cartes dans le navigateur). La progression d'un cosmétique vit dans `RegistrePublicites.cosmetiques` ; au dernier pas,
l'article est ajouté à `achatsEquipements` du coffre (`octroyerCosmetique`), et la livraison est retentée à chaque lecture
de la vue tant qu'elle n'a pas abouti.

**Aucune migration.** Le registre est du JSON ; la livraison est une mise à jour de `compte_boutique` ; les statistiques
par usage (`stats.contextes`, clés à plat « LEAGUE.completed ») se somment comme `distribution`. ⚠️ Ces deux requêtes n'ont
pas été essayées sur la vraie base. En cas d'échec de la livraison, le déblocage reste acquis dans le registre et l'écran
l'applique à la lecture de la vue.

Réglages (Labo → Publicités, opération `publicites`) : `leagueFallbackEnabled`, `premiumEnabled`,
`premiumDailyLimit` (0 à 5), `premiumPacks` (poids par pack ; vide = automatique), `cosmeticsEnabled`,
`cosmetiques[article] = { actif, requis (1 à 20), limiteJour (1 à 10) }`. Un Labo d'avant qui n'envoie pas ces champs
garde les valeurs du jeu.

Banc : `npm run verify:correctif42` (97 contrôles). Aperçu simulé : `/scripts/apercuCorrectif42.html`.

## Le reçu qui n'arrivait pas (12 octobre 2026, seconde passe)

Signalé en jeu : « on ne récupère pas la récompense quand on regarde la vidéo en entier ». Le navigateur voit bien la vidéo finie (`videoTerminee`), mais la récompense n'est créditée que sur le reçu SIGNÉ qu'AppLixir envoie à notre serveur — et aucun n'a jamais été accepté.

Mesuré sur le site public, par des requêtes GET non signées et sans effet :

| Forme de la requête | Réponse |
|---|---|
| `/api/carriere?applixirCallback=1&gameApiKey=…` | 403 « Signature AppLixir invalide » : le callback est reconnu |
| `/api/carriere?applixirCallback=1?gameApiKey=…` | **401 « Connectez-vous pour retrouver vos ligues. »** : le callback n'est PAS reconnu |
| même requête sans `www` | 308 |
| POST | 415 |

L'adresse enregistrée chez AppLixir contient déjà un « ? ». Si le fournisseur y colle ses paramètres avec un second « ? » — ce que font beaucoup de webhooks —, la requête prend la deuxième forme et tombait sur l'authentification ordinaire. ⚠️ C'est une hypothèse forte, PAS une preuve : nous n'avons ni les journaux de livraison d'AppLixir ni ceux de Vercel.

Ce que le serveur fait désormais (`parametresCallbackAppLixir`, `serveur/publicitesRecompensees.ts`) :

- il reconnaît le callback AVANT la protection d'origine, en GET comme en POST (corps JSON ou formulaire) ;
- il relit des paramètres collés avec un second « ? » ;
- il répond aussi sur une adresse sans « ? » : `https://www.destiny-rugby.fr/api/applixir` (réécriture de `vercel.json`) ;
- il accepte une signature en majuscules ;
- il journalise chaque reçu (`[applixir] callback accepté` / `refusé`, avec la forme et la raison — jamais le secret ni la signature) et note un refus sur la session visée (`SessionPub.callback`, `stats.callbacksRefuses`).

La signature, l'unicité du TID, l'expiration, le plafond et la propriété de la session sont inchangés : un reçu mal signé reste refusé quelle que soit sa forme.

**Labo → Publicités → « Reçus AppLixir refusés »** tranche entre les deux pannes possibles : si des vidéos sont regardées en entier et que le compteur reste à zéro, le reçu n'arrive pas jusqu'au serveur (adresse de callback, ou callbacks inactifs sur une clé Test / Under Review) ; s'il monte, la raison affichée dit quoi corriger (secret, clé d'API, identifiant de jeu, session expirée).

À faire après déploiement, dans l'ordre : regarder une vidéo en entier ; lire le Labo et les journaux Vercel (`[applixir]`) ; si rien n'arrive, enregistrer l'adresse sans « ? » chez AppLixir et recommencer ; si rien n'arrive encore, pointer provisoirement le callback sur une adresse d'inspection pour voir ce qu'AppLixir envoie vraiment, puis écrire au support (message prêt dans `DIAGNOSTIC-PUBLICITES-2026-10-12.md`).

Banc : `npm run verify:publicites` (94 contrôles, dont les quatre formes du reçu, le journal sans secret et la protection d'origine des autres routes). ⚠️ Non essayé : la réécriture `/api/applixir` en production, la lecture SQL des refus sur Neon (à la moindre erreur le Labo affiche « Journal indisponible » et rien d'autre ne change).

## Une publicité abandonnée ne bloque plus la journée (15 octobre 2026)

Signalé : « on regarde une pub et on ne la valide pas, ou on change de pub : plus de pub jusqu'au lendemain ». Trois défauts se cumulaient :

- une session préparée mais jamais lancée occupait le plafond du jour pendant ses quinze minutes : avec deux publicités par jour (ou une pour un cosmétique), l'écran affichait « 0 / 2 — Revenez demain » ;
- toute nouvelle publicité était refusée (« déjà en cours ») tant qu'une session restait ouverte, y compris une session que l'écran n'avait pas pu fermer (onglet fermé, application quittée, autre offre ouverte) ;
- l'écran relisait ses compteurs AVANT que le serveur ait enregistré la fermeture, et restait sur le faux « Revenez demain ».

Désormais : seule une vidéo réellement commencée (`started`, ou terminée en attente de reçu) réserve sa place ; une nouvelle publicité ferme celles qu'on a laissées en plan (jamais une vidéo terminée qui attend son reçu) ; la fin d'une publicité est enregistrée avant la relecture des compteurs ; une session ouverte est fermée quand l'offre disparaît de l'écran ou quand la page part (`sendBeacon`). Le plafond ne craint rien : chaque reçu signé reste recompté contre les récompenses du jour. Banc : `npm run verify:publicites`.
