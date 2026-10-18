# Règlements des carrières solo

Références consultées le 18 octobre 2026 :

- **Accession dans le socle 2025/26 du jeu** : [livret FFR de Fédérale 2, p. 9](https://api.www.ffr.fr/wp-content/uploads/2025/08/2025-2026_federale-2_livret-de-la-competition.pdf), les huit qualifiés en quarts montent en Fédérale 1 ; [livret FFR de Fédérale 1, p. 7](https://api.www.ffr.fr/wp-content/uploads/2025/08/2025-2026_federale-1_livret-de-la-competition.pdf), les quatre qualifiés en demies montent en Nationale 2. Le classement de poule ne donne aucune montée directe dans ces deux divisions. Un barragiste peut monter ; un premier éliminé avant le tour requis reste dans sa division. Les résultats enregistrés font autorité, sans simulation à la consultation. Le jeu garde ses tours à match unique : les aller-retour prévus par ces livrets ne sont pas encore reproduits.

- [FFR, compétitions fédérales 2026/27](https://api.www.ffr.fr/wp-content/uploads/2026/07/presentation-des-competitions-federales-2026-2027-1.pdf) : Nationale 2, deux premiers directement en quarts ; Fédérale 1, en huitièmes ; Fédérale 2, en seizièmes. Dans ces trois divisions, les places 3 à 6 passent par des barrages. En Fédérale 3, les trois premiers vont directement en trente-deuxièmes, les 4e et 5e disputent un barrage.
- [EPCR, Challenge Cup 2026/27](https://embed-rech-01.dialog.cm/epcr/docs/epcr_challenge_cup_tournament_guide_202627) : les quatre reversés de Champions Cup occupent les rangs 9 à 12 et se déplacent en huitièmes. En quarts et demies, le meilleur rang initial reçoit ; les croisements restent ceux du tableau initial.
- [RFU / PREM / PWR, annonce du 27 février 2026](https://www.thepwr.com/news/rugby-unites-behind-transformational-new-vision) : absence de promotion et relégation automatiques de PREM à partir de 2026/27. Les admissions administratives ne constituent pas une montée sportive simulée.

Le vivier du jeu garde ses clubs et ses poules. Les formats régionaux restent adaptés aux tailles des poules du jeu : six candidats à partir de douze clubs (deux directs et quatre barragistes), quatre directs de huit à onze, deux en dessous. Ce barème n'est pas présenté comme le règlement de chaque ligue régionale. Il ne met pas en œuvre les futures réformes de composition des divisions annoncées pour 2027/28.

Les tableaux incomplets conservent chaque qualifié : exemptions des meilleures têtes de série, sans suppression pour arrondir à une puissance de deux. Les anciens tableaux déjà commencés restent lisibles avec leurs vrais résultats. La saison d'arrivée d'un promu est persistée ; une ancienne sauvegarde ne la reconstitue qu'à partir d'une montée explicite dans son historique ou son journal.

Contrôles : `npm run verify:retours-reglements`, `npm run verify:correctif36`, `npm run verify:tournoi-final`, `node scripts/verifierRetoursNavigateur.cjs`. L'aperçu local ne lit aucune sauvegarde utilisateur.
