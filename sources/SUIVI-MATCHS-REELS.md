# Suivi des vrais matchs : faisabilité et budget

Étude du 18 octobre 2026. Demande : scores et actions des vrais matchs de rugby.
Cette fonctionnalité n'est pas encore intégrée. Aucun abonnement ni collecteur
de production n'a été activé.

## Une première version sans abonnement de données

Un collecteur peut lire une page publique ou son flux de données, convertir les
rencontres dans un format commun et alimenter un écran de résultats. Il faut
retenir des sources qui autorisent cette récupération **et** la republication.
La gratuité d'accès à une page ne suffit pas à établir ces autorisations.

Les sites officiels [Top 14](https://top14.lnr.fr/calendrier-et-resultats) et
[Pro D2](https://prod2.lnr.fr/calendrier-et-resultats) exposent calendriers et
résultats. Leur faisabilité technique ne vaut pas accord : leurs
[CGU, article 4](https://top14.lnr.fr/page/cgu) limitent la reproduction à un
usage personnel privé et encadrent les accès automatisés. Ils ne constituent
donc pas une source de collecte publique validée pour Destiny Rugby.

La FFR propose aussi un espace [Rugby Direct](https://monclubhouse.ffr.fr/rugby-direct).
Les anciens liens de compétitions redirigent vers Mon Club House. L'existence
de cet écran ne prouve ni une couverture exhaustive des matchs amateurs, ni la
disponibilité de leurs essais/cartons, ni une autorisation de réutilisation.
Ces points restent à vérifier avant de choisir cette source.

Deux autres sites ont été examinés à la demande :

- [Flashscore](https://www.flashscore.fr/rugby/) couvre notamment Top 14, Pro D2,
  compétitions européennes et internationales. Les
  [conditions publiées sur Flashscore.com, article 2.10](https://www.flashscore.com/terms-of-use/)
  soumettent explicitement le scraping et l'agrégation à leur consentement,
  sous réserve des exceptions prévues par la loi. Une page gratuite n'est donc
  pas un flux libre de republication confirmé.
- [Rugbyrama, CGU articles 3.1 et 11](https://www.rugbyrama.fr/page/conditions-generales-d-utilisation)
  interdit l'accès automatisé par scripts/robots et réserve la collecte de
  données à un accord préalable écrit. Sans cet accord, ce n'est pas une
  source gratuite validée pour cet espace public.

Techniquement, on peut développer un adaptateur pour ces sites ; leur affichage
et leurs protections peuvent changer, ce qui impose une maintenance. Le devis
ne peut pas présenter leur collecte comme un service gratuit, autorisé et fiable
déjà acquis. Il faudrait leur accord ou un flux fourni pour cet usage.

Aucune source gratuite autorisant un direct complet sur tous les championnats
n'a été confirmée durant cette étude. Pour commencer, viser quelques compétitions
et leurs scores ; ajouter les événements uniquement là où la source les fournit.

## Montage compatible avec le jeu actuel

- Un collecteur côté serveur, partagé entre les visiteurs, avec cache commun
  et verrou de rafraîchissement. Un appel sortant par visiteur multiplierait la
  charge et le coût. Une mémoire de fonction Vercel seule ne suffit pas à
  coordonner plusieurs instances.
- Cadence indicative de 60 à 120 secondes pendant les matchs, selon les limites
  acceptées par la source ; nettement moins hors match. Rafraîchissement à la
  demande possible pour éviter une tâche permanente.
- Identifiants de rencontres stables, score, statut, compétition et date du
  dernier relevé. Une page incomplète ou inaccessible ne remplace jamais le
  dernier score valide par zéro ; les corrections de résultats restent possibles.
- Source affichée et fraîcheur visible. Essais et cartons uniquement s'ils sont
  réellement disponibles ; ne pas fabriquer de chronologie à partir d'un score.
- Écran chargé à l'ouverture, indépendant des sauvegardes solo et des ligues du
  jeu, sans navigateur automatisé lancé chez chaque visiteur.

## Coût indicatif, hors développement et maintenance

| Solution | Données | Hébergement supplémentaire estimé |
| --- | --- | --- |
| Collecte autorisée, quelques compétitions, audience modérée | 0 € d'abonnement si la source l'autorise gratuitement | 0 à 20 €/mois avec cache et infrastructure existante |
| Fournisseur spécialisé avec direct | Selon offre et couverture ; exemple ci-dessous | Même principe de cache, coût selon trafic |

La fourchette d'hébergement est une estimation d'architecture, pas une facture
mesurée : l'abonnement Vercel actuel, le trafic, le nombre de pages collectées et
la nécessité éventuelle d'exécuter JavaScript côté collecte peuvent la changer.
Le tarif public [Vercel Pro](https://vercel.com/pricing) commence à 20 $/mois,
avec une facturation d'usage ; il ne faut pas compter un second abonnement si le
jeu en possède déjà un adapté.

Comme repère pour une alternative payante, [rugbyAPI Live](https://rugbyapi.com/pricing)
affiche 99 $/mois, avec rencontres du jour en direct et notifications de résultats.
Son tarif ne garantit pas à lui seul la couverture de tous les championnats ni
chaque action sur chaque rencontre. Les droits de publication, les limites et
la couverture effective se vérifient avant souscription.

Le coût propre d'un scraper est surtout son entretien lorsque le site change.
Un essai sur une compétition pendant un week-end réel permettrait de mesurer
le retard, les données absentes et la charge avant d'élargir le périmètre.
