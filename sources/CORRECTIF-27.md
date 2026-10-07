# Correctif 27 — Carrière Entraîneur

Implémentation et vérifications du 7 octobre 2026.

## Ce qui change

- **Infirmerie dédiée** : portrait, nature et gravité de la blessure, date, absence estimée en jours, retour avec marge de précision, récupération, aptitude, condition, rythme, risque de rechute et minutes conseillées.
- **Sept états médicaux** : indisponible, soins, rééducation, reprise individuelle, reprise collective, apte avec risque, totalement apte. Les soins avancent automatiquement avec le calendrier, même dans les anciennes sauvegardes laissées en attente.
- **Reprise choisie** : repos, banc seulement ou autorisation de titularisation. Les compositions respectent ces décisions. Les commotions gardent leur protocole. Le risque dépend des minutes réellement jouées ; un remplaçant inutilisé ne rechute pas.
- **Centre médical de cinq niveaux**, payé sur le budget des structures et conservé par club. La vitesse progresse de 0 à 20 %, soit au maximum environ 17 % d’absence en moins ; les longues blessures restent longues. Prévention jusqu’à 16 %, diminution relative du risque de rechute jusqu’à 20 %, précision du retour de ±10 à ±2 jours.
- **Historique médical permanent**, y compris lors des changements de saison et de club. L’influence des blessures passées sur la fragilité est bornée.
- **Contrat réel du coach** : durée restante, évaluation du conseil et renouvellement uniquement après une offre à l’échéance. Un clic ne peut plus ajouter des saisons ni encaisser plusieurs fois un supplément de budget. Un départ puis un retour immédiat au même club ne permet pas de contourner cette règle.
- **Conseil** : résultats récents, classement, objectifs adaptés, progression du club, finances et moral. Huit matchs d’observation au minimum avant avertissement, puis cinq matchs pour obtenir deux victoires. Non-renouvellement et licenciement permettent de chercher un nouveau banc.
- **Vestiaire simplifié** : ambiance, capitaine, vice-capitaine, cadres, mécontents, conflits importants et discussions motivées par une situation réelle.
- **Derbys géographiques** : local jusqu’à 30 km, régional jusqu’à 150 km dans la même région et le même pays. Rivalités historiques configurables avec une source. Distances en cache, recalculées après correction des coordonnées. Effets modérés sur l’affluence, la pression et les médias ; aucun bonus artificiel aux notes des joueurs.
- **Labo / Données clubs** : recherche, sources, statut, alertes, corrections et rivalités. Les écritures sont réservées aux administrateurs, validées et protégées contre les modifications concurrentes. Elles sont publiées dans le catalogue utilisé par les carrières.

## Localisations : couverture et limites

Le catalogue contient **1 331 clubs**. L’enrichissement rattache **1 023 fiches FFR** à leur source et rapproche **31 adresses de stades** des informations officielles et de la Base Adresse Nationale : les 30 clubs français professionnels du catalogue et le Stade Métropolitain à Villeurbanne.

Les points BAN peuvent correspondre à une adresse ou au centre d’une voie ; ce ne sont pas des relevés GPS du terrain. Leur URL est conservée pour inspection. Les autres localisations ne sont pas certifiées automatiquement : le Labo conserve **1 300 fiches non vérifiées**, notamment les communes dont le stade reste à confirmer et les clubs étrangers sans adresse sportive validée. Les données absentes ou obtenues uniquement par fallback ne servent pas à fabriquer une distance de derby.

Servette est rattaché à Grand-Lancy, en Suisse ; son site officiel indique plusieurs terrains seniors, donc le terrain principal reste à valider.

Sources : [LNR Top 14](https://top14.lnr.fr/), [LNR Pro D2](https://prod2.lnr.fr/), [Base Adresse Nationale](https://adresse.data.gouv.fr/), [stades du Stade Métropolitain](https://www.stade-metropolitain.fr/page/3283394-nos-stades), [adresse du CA Brive](https://cabrive-association.com/lassociation/contact/), [RC Narbonne](https://www.rcnm.com/), [terrains du Servette RC](https://www.servetterc.ch/stades). Les URL propres à chaque club et les requêtes de géocodage sont conservées dans `sources/data/localisations-clubs.json`.

## Vérifications

- `verifierCorrectif27.ts` : **11 scénarios validés**, couvrant récupération, composition, commotions, minutes réelles, historique, centres, contrat, conseil, Coupe, distances et validation des données.
- `verifierDonneesClubsLabo.ts` : **validé**, accès, coordonnées, sources, révisions, persistance après redémarrage, publication solo et rivalités.
- Contrôles existants validés : saison manager, carrière avancée, carrière profonde, trésorerie/objectifs, distances/transferts, blessures/feuille et meilleure équipe.
- TypeScript et compilation de production : **validés**. La compilation conserve l’avertissement sur la taille de certains fichiers générés.
- Analyse des nouveaux modules et scripts : **validée**, aucun signalement.
- Aperçu visuel : infirmerie, amélioration payante, vestiaire, direction et formulaire du Labo ; contrôles à 390 et 1 280 pixels. Débordement mobile des listes du Labo corrigé. Les blessures de l’aperçu sont des données fictives de test.

**Contrôle général encore en échec** : `verifSanteContrats.ts`, assertion mercato « une stratégie mixte conclut la plupart du temps » : 10 accords sur 13 approches, sous le seuil de 80 %. Les autres contrôles de cette suite passent. Ce résultat reste signalé ; les règles du mercato n’ont pas été modifiées pour satisfaire ce seuil.

Pour rejouer les vérifications ciblées : `npm run verify:correctif27`. Pour importer de nouveau les adresses : `npm run data:localisations -- --reprendre`.
