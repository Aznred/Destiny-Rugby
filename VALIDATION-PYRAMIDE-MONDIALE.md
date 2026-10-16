# Ligue mondiale — validation locale

Les états de ligue existants n’ont pas été modifiés pour ces contrôles. Le 16 octobre 2026, les tables et index
ont été installés et vérifiés sur la base Neon configurée avant déploiement : 26 poules et 402 équipes dans le
cycle actuel. Les écritures d’essai ont été annulées par savepoint ; aucune écriture dans les comptes, clubs,
calendriers, résultats ou soldes existants. Une charge réelle de 100 000 connexions n’a pas été testée.

## Comportement vérifié

- 1 000 équipes : 63 poules, dernier niveau D6. 10 000 : 625 poules, D10. 100 000 : 6 250 poules, D10.
  Unicité des comptes, limites par division, maximum de seize équipes par poule et une seule poule incomplète.
  Calcul local du reclassement de 100 000 équipes : environ 0,3 à 0,6 seconde selon les contrôles en parallèle.
- D1 : douze maintenus et quatre qualifiés des deux poules de D2, lorsque les saisons sont jouées. Aucun accès
  direct depuis D3 ou plus bas. Cas d’un champion exceptionnel promu de D6 à D3.
- Conversion d’une ancienne poule 3 en D2/P2 sans changer son ID, son code, ses joueurs, ses compositions,
  ses soldes, ses compétitions ou ses scores. Relecture d’un ancien score, Elo 1 516 / 1 484, calcul idempotent.
- Inscription automatique par mot de passe et Google, récupération d’un compte ancien sans poule, inscriptions
  concurrentes du même compte sans doublon, homonymes autorisés avec des noms de clubs distincts.
- Renouvellement par lots de quatre poules et reprise après interruption simulée après commit : même plan,
  aucune équipe ni carte perdue, aucune modification des poules sources. Conservation de l’Elo au cycle suivant.
- Classement paginé, identité de compte non exposée, index SQL et sélection de lots bornés vérifiés par requêtes
  simulées. L’index Elo ne se réécrit que lorsqu’un résultat, un nom ou une inscription change ; les états et films de toutes les
  équipes ne sont jamais chargés pour afficher le classement.
- Interface vérifiée dans le navigateur en 1 440 × 1 000 et 390 × 844 : règlement, dix capacités, classement,
  pagination et absence de débordement horizontal. Aperçu à données fictives : `/scripts/apercuLigueMondiale.html`.

## Commandes

`node --loader ./scripts/chargeurTests36.mjs scripts/verifierPyramidePublique.ts`

`node --loader ./scripts/chargeurTests36.mjs scripts/verifierEchangesEtDivisions.ts`

`node --env-file=.env --loader ./scripts/chargeurTests36.mjs scripts/verifierPyramideDbIntegration.ts` : tables/index
idempotents, lectures réelles, synchronisation, baux et plans testés dans une transaction annulée, puis absence
de toutes les lignes d’essai confirmée. N’exécute ni inscription ni renouvellement des ligues réelles.

`npm run build` et `npm run lint`.

Les bancs historiques `verifierReglements.ts` et `verifierComplement29.ts` s’arrêtent dans leurs scénarios de
simulation (match d’accès Top 14 / recherche d’une rencontre naturelle avec prolongation), avant leurs contrôles
de ligue publique. Les nouvelles zones de montée et descente sont vérifiées dans `verifierPyramidePublique.ts`.
