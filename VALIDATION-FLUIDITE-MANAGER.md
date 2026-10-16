# Fluidité de la carrière entraîneur — 16 octobre 2026

Les clics étaient retardés par des calculs synchrones. Les objectifs de tous les bancs, même invisibles,
coûtaient environ 17 secondes à chaque rendu. Les poules géographiques étaient reconstruites et les contrats
comparés nom par nom dans chaque club, puis de nouveau pour chaque nationalité lors des convocations.

## Correctifs

- Calcul des bancs uniquement lorsque leur liste est visible ; options mémorisées.
- Poules réutilisées tant que la composition des divisions et les coordonnées ne changent pas ; copies pour les appelants.
- Index des contrats actifs par saison et identité ; règles de correspondance et expiration conservées.
- Un parcours partagé des clubs pour les groupes internationaux à construire ; seuls les groupes de 34 restent en mémoire.
- Registre des jeunes réinstallé uniquement lorsque son monde change.
- Aperçu du bureau limité aux rencontres connues, sans projection des qualifications futures.
- Hooks du bureau indépendants de l'absence d'une carrière active.

## Vérifications

- `npm run build` : réussi ; avertissement habituel de taille des fichiers générés.
- `npm run lint` : réussi, aucun échec ; avertissements sur les dépendances de hooks et certains scripts.
- `scripts/verifierFluiditeManager.ts` : réussi. Poules isolées, promotions, coordonnées, rendez-vous, caches,
  expiration et correspondance des contrats ; sélections calculées ensemble identiques aux calculs isolés,
  y compris les U20.
- `scripts/verifierEffectifManager.ts` : réussi, effectif complet conservé et indisponibles écartés de la feuille.
- Navigateur : bureau, composition, Direction, calendrier et passages de semaine ; aucune erreur console observée.
  Format ordinateur et viewport mobile 390 × 844, sans sauvegarde réelle.
- Mesures locales : premier rendu du bureau 55–74 ms ; premier passage de semaine 821–1 009 ms, suivant 64–69 ms ;
  calendrier mobile 66 ms ; composition mobile 226 ms. Mesures de développement sur cet ordinateur,
  pas un téléphone physique ni une garantie sur toute sauvegarde.

## Échecs déjà présents, reproduits sur les sources avant correctif

Un chargeur temporaire a relu les huit modules modifiés depuis `HEAD`, sans changer les fichiers de travail.

- `verifSelection.ts` : mêmes 18 contrôles en échec avant/après ; le scénario attend notamment des semaines
  de type `international`, absentes du calendrier actuel.
- `verifierContratsManager.ts` : le dernier scénario attend un départ automatique. Avec les sources antérieures,
  l'assistant renouvelle déjà le contrat jusqu'à la saison 5 et conserve le joueur.
- `verifierSaisonManager.ts` : les étapes de calendrier, coupes, promotions, trophées, barrage, rechargement et
  relégation passent ; le scénario final attend un jeune local sans charger de snapshot. Sur les sources
  antérieures, ce même jeune est également absent.

Ces scénarios historiques restent inchangés. Les outils temporaires de comparaison ont été supprimés.
