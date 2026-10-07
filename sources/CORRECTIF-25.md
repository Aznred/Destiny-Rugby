# Correctif 25 — état livré et mesures

Les changements couvrent les visages, le sprint, le jeu au pied contestable, le Labo, le tutoriel public et la réduction des calculs et transferts inutiles.

## Visages et gameplay

- Barbes ajustées automatiquement au nez, à la mâchoire et au type de tête ; pattes des barbes complètes prolongées vers les oreilles. Après les retours visuels : recul final de 8 mm pour la tête arrière et 10 mm pour l'avant. Cheveux relevés de 1 cm. Moustaches maintenues devant les facettes des lèvres, accessoires attachés à l'os de la tête.
- Barre de réserve de sprint colorée, plafond de fatigue et endurance générale séparés.
- Préparation dès l'input : rasant 180 ms, petit par-dessus 240 ms, dégagement 320 ms, box kick 420 ms, drop 500 ms. Un plaquage avant frappe annule le kick et son animation ; contact à la frappe, trajectoire perturbée et charge-down restent possibles. L'arcade est également contestable.
- Le tutoriel présente la Ligue Publique et conduit à son inscription, puis aux packs/composition. Les ligues privées sont présentées ensuite.

## Statistiques

Le Labo réservé à l'administrateur offre Global, Collection solo, Carrière joueur, Entraîneur, Hors classement, Rétention et Profileur. Les périodes sont aujourd'hui, 7 jours, 30 jours et depuis le début.

Les identités aléatoires représentent des **appareils**, pas des comptes ou des personnes uniques. Les instantanés de carrière ont leur propre identité, adoptent les anciennes sauvegardes sans recompter une création, et suivent matchs, saisons et temps cumulé. La durée de vie est la période observée entre début et dernière activité. L'abandon est **estimé** à la fermeture ou après 30 jours sans activité ; la durée exacte des carrières antérieures au suivi n'est pas récupérable.

La Collection solo n'a pas de matchs ni d'équipe sauvegardée : le GEN et les joueurs du meilleur XV sont **calculés** à partir de l'inventaire, par familles de postes. Aucun GEN n'est produit pour un XV incomplet. Les acquisitions sont des variations positives de l'inventaire ; les rares sont les cartes Élite/Star réellement possédées du dernier relevé (60 au maximum par collection). Le temps des onglets masqués et de l'inactivité n'est pas ajouté ; les visites de moins de 15 secondes et les changements de mode sont couverts.

Les relevés sont bornés et anonymes. La lecture publique des statistiques est refusée ; le Labo ne reçoit que les agrégats. Les envois ordinaires sont espacés de dix minutes, avec un dernier envoi à la fermeture ; des compteurs saturés peuvent déclencher une vidange anticipée. Les nouveaux matchs du club en ligue sont également comptés après adoption de l'historique ; les références de ligue et de club restent locales. Un échec de relevé n'empêche jamais de jouer.

## Optimisation et mesure

Les joueurs partagent leur squelette et soudent les pièces qui ont le même rendu. L'élagage évite leur dessin hors champ ; les poses et IK du regard sont évités hors de l'action et simplifiés à distance, avec conservation des indices de fondu. Le stade conserve le public déjà regroupé dans ses meshes et son élagage par morceau ; ses matrices sont figées. Les équipements se chargent au besoin, le cache des stades est borné, les profils appareil et la cadence adaptative visent 60 ou 30 FPS.

Le rejet des collisions lointaines utilise une grille spatiale et un test exact sur les axes. Le banc compare 10 800 positions entre les deux calculs, sans différence. Sur 30 corps mobiles dispersés, 10 passages alternés de 1 800 pas, avec deux passages de chauffe exclus : médiane **0,6314 → 0,4522 ms par pas** sur l'ordinateur local. Reproduction : `node scripts/mesurerPhysique25.mjs`.

Comparaison locale du 7 octobre 2026, stade de campagne, cadre 960 × 480, même match/caméra/définition, 60 images de chauffe et 240 mesurées par passage (`/scripts/apercuPerformances25.html`) :

| Mesure | Optimisations joueurs désactivées | Activées |
|---|---:|---:|
| FPS observés | 66,9 | 76,3 |
| CPU scène moyen | 12,66 ms | 10,07 ms |
| GPU moyen | 6,43 ms | 4,42 ms |
| Appels de dessin, dernière image | 395 | 267 |
| Triangles, dernière image | 260 010 | 233 286 |
| Tas JavaScript observé | 146 Mo | 135 Mo |

Ces chiffres ne constituent pas une garantie pour un téléphone : cadence navigateur, chargement, cache et ramasse-miettes affectent FPS et mémoire. Le banc est fourni pour répéter la comparaison sur le même matériel. Le Profileur conserve douze séances annotables et filtrables, avec CPU scène, GPU si pris en charge, mémoire si exposée, API/poids/latence/erreurs ; une mesure non exposée reste indisponible.

## Réseau

Les commandes de ligue renvoient un delta versionné, avec retour à une vue complète si la base client est décalée. Le pack est validé et servi en une transaction de commande. Sur le banc de 16 clubs : réponse d'ouverture **394 Ko → 8,4 Ko**, ou **39,9 Ko → 1,7 Ko** après compression. Les quatorze commandes testées reconstruisent la même vue que le serveur ; le catalogue statique est conservé et versionné, les assets des packs préchargés.

## Vérifications et mise en ligne

- `npm run verify:correctif25` : agrégation/validation, snapshots, GEN/rares, suivi des visites et de minuit, kicks carrière/arcade, physique exacte, API administrative et deltas.
- `verify:controle-direct` : 52 contrôles ; `verify:responsabilites` : 1 455 ; `verify:tutoriel` : 30 837 ; `verify:collection-solo` : 78 187 cartes vérifiées ; `verify:pied` passé.
- Aperçus navigateur : Labo desktop/mobile sans débordement global, moustache et barbe longue sur deux têtes, scène 3D et mesure GPU.
- Compilation et analyse statique passées (avertissements existants de gros bundles et de lint). `verify:animations-match` échoue sur le maintien des receveurs dans leur camp, également avec le moteur de HEAD ; ce problème préexistant est séparé du correctif.

La migration `npm run base:appliquer` ajoute `usage_jours`, `usage_compteurs`, `usage_carrieres`. Les anciennes données restent lisibles. La migration et les requêtes Neon n'ont pas été exécutées sur la base distante pendant ce travail. La recette sur de vrais appareils iOS/Android reste nécessaire avant de conclure à la stabilité sur tout matériel faible.
