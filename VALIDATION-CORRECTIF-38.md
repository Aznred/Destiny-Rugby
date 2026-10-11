# Correctif 38 — classement des carrières

La route active est `api/classement.ts` (Vercel/Neon). `serveur/classement.ts` est l'ancienne référence Supabase. Le barème `scoreDeLaFiche` reste partagé ; l'ancien `verifierFiche` est conservé pour comparer les règles et les anciens tests.

## Règles et visibilité

| Condition | Traitement |
|---|---|
| Peu ou aucun match, carrière récente, valeur de marché élevée, série de victoires | Aucun motif de rejet ; ces deux dernières données ne sont pas dans la fiche reçue |
| Version ancienne, âge initial absent, données partielles | Provisoire visible, prochaine synchronisation réexamine le dossier |
| Plus de 50 matchs/saison | +15, visible tant que le calendrier n'est pas impossible |
| Note supérieure à 40 + 6 × saisons | +20, aucune exclusion sur cette seule règle |
| Plus de 5 essais/match | +20 ; une très bonne saison reste visible |
| Plus de 12 sélections/saison, parcours de clubs inhabituel | +10 chacun |
| Progression de +3 saisons ou +15 GEN en moins de 10 minutes entre envois | +20, sans accusation de triche |
| Longue carrière dépassant les anciennes bornes | +30, à vérifier |
| Types invalides, valeurs négatives, GEN >100, champs démesurés | Blocage fort explicite |
| Plus de 100 matchs/saison, 15 essais/match ou 30 sélections/saison | Blocage fort lorsque les deux faits comparés sont présents |
| Trophée inconnu, même trophée plus souvent que de saisons connues, montées impossibles | Blocage fort |
| Score actuel complet différent du score recalculé | Blocage fort ; le serveur publie toujours son calcul |

Le risque cumule les règles et est plafonné à 100 : 0–29 `ELIGIBLE`, 30–59 `LIMITED`, 60–100 `PENDING_VALIDATION`. Une donnée absente place aussi le dossier en attente. Seule une incohérence forte ou un refus Kiri produit `REJECTED`. Les trois premiers statuts restent visibles ; les récompenses compétitives sont autorisées uniquement pour `ELIGIBLE`. Aucun nouveau versement de récompense n'est ajouté ici.

Les relations ne sont jamais testées avec une valeur de remplacement provenant d'un champ absent. Un âge de début déduit d'une ancienne projection ne constitue pas une preuve de triche. Le plafond technique de 1 000 000 dépasse les performances atteignables avec les faits bornés et remplace l'ancien plafond trop restrictif du schéma.

Les preuves d'intégrité, de joueur inexistant ou de récompense déjà attribuée ne peuvent venir que d'un contexte serveur. La carrière solo actuelle n'envoie pas de signature cryptographique : ce correctif n'invente pas une preuve d'origine ni un checksum authentifié. Les champs client prétendant fournir ces preuves ne donnent aucun droit.

## Synchronisation et Labo

L'état reçu du serveur est conservé dans le jeu ; une évaluation locale seule n'annonce plus une publication réussie. La carrière entraîneur, y compris une reconversion, est envoyée. Les carrières volontaires hors classement et le mode libre restent exclus. Les dossiers en attente sont réessayés après la cadence habituelle, même sans augmentation du score. Une ouverture du classement et le bouton Synchroniser peuvent relancer l'envoi.

Le Labo Kiri affiche careerId, userId lorsqu'un compte authentifié existe, statut, risque, règles, date et dernière synchronisation ; filtres ELIGIBLE, LIMITED, PENDING, REJECTED et HIGH_RISK. Valider, refuser et réinitialiser sont vérifiés dans `/api/carriere` et dans le service sur l'identifiant de connexion `kiri`. Un pseudo « kiri » ne donne aucun droit. Une incohérence forte ne peut pas être approuvée manuellement.

Les décisions sont liées à l'empreinte des faits et à une révision. Un envoi identique conserve la décision ; de nouveaux faits permettent une nouvelle vérification. Les écritures concurrentes utilisent une comparaison de révision. Chaque décision et synchronisation produit un journal atomique. La clé d'écriture et la fiche brute ne sont jamais publiées. Le classement garde son modèle existant : le meilleur record par installation ; les careerId identifient les dossiers de validation de ces lignes, pas des sauvegardes complètes. Une nouvelle tentative de score inférieur ne masque pas un précédent record valide.

Aucune validation n'écrit dans les sauvegardes, les ligues ni les récompenses du joueur. La limite de débit reste 18 envois/heure et 120/jour par empreinte réseau salée ; les erreurs de réseau et de débit sont affichées et réessayables.

## Audit réel du 11 octobre 2026

La base connectée contenait 1 304 lignes, avec un schéma ancien : absence d'identifiant public et de clé privée de ligne. Cela faisait encore confluer les homonymes. La migration `serveur/schema-classement-validation.sql` a été vérifiée dans une transaction annulée, puis appliquée atomiquement. Les 1 304 lignes et leurs scores ont été conservés ; les sauvegardes n'ont pas été touchées.

Les 1 304 dossiers ont ensuite été revalidés : **1 304 visibles provisoirement, 0 rejeté**. Tous manquent des champs de version/âge initial que l'ancienne table ne conservait pas ; 80 n'ont que leur score et 205 doivent rapprocher leur score de leur fiche. Un cas de durée longue est marqué pour contrôle. Ces lacunes ne font plus disparaître les lignes. Le rapport agrégé, sans noms ni clés, est `VALIDATION-CLASSEMENT-38.json`.

Ce sont des lignes déjà présentes : **ce nombre n'est pas un nombre de carrières récupérées après refus**. Les anciens refus n'étaient pas enregistrés, donc leur nombre et leurs principales causes historiques sont inconnus. Le nouveau journal les rend mesurables, et le prochain envoi des clients avec le correctif réévalue automatiquement les carrières écartées auparavant.

## Vérifications

- 111 contrôles des règles, décisions, révisions, persistance et autorisations backend.
- 15 contrôles de la route publique : score recalculé, provisionalité, refus expliqué, journal, pagination, rang par catégorie, compatibilité v3 et débit.
- Migration/SQL réels : conservation de toutes les lignes, révision concurrente périmée refusée et journal atomique ; banc intégralement annulé.
- Navigateur : synchronisation, approbation et réinitialisation, filtre HIGH_RISK ; affichage desktop et téléphone 390 × 844, sans débordement horizontal. Captures `scripts/correctif38-desktop.jpg` et `scripts/correctif38-mobile.jpg`.
- Traductions : 9 808 clés vérifiées sur les sept langues. Correctif 37 : 126 contrôles toujours réussis.

La migration et l'audit ont été exécutés. Le code et l'interface doivent encore être déployés pour rendre ces nouveaux comportements disponibles sur le site public.
