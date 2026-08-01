# Feuille de route — Destiny Rugby 🏉

Toutes les idées de `idee jeu rugby.txt`, **ordonnées pour être faites dans
l'ordre le plus efficace** : chaque lot s'appuie sur le précédent et évite de
retoucher deux fois le même code. L'ordre suit trois règles.

1. **Les fondations d'abord.** Le calendrier, les blessures et les statistiques
   détaillées sont utilisés par presque tout le reste (sélections nationales,
   récompenses, réseaux sociaux, interviews). Les coder après coup obligerait à
   réécrire la boucle de saison.
2. **Regrouper ce qui touche au même fichier.** Traits de caractère, agents,
   mentorat et reconversion vivent tous dans `types.ts` + `store/useGame.ts` :
   un seul passage plutôt que quatre.
3. **Ce qui dépend de Groq en dernier dans chaque lot.** Le jeu doit rester
   entièrement jouable sans clé : on écrit d'abord la mécanique, puis on branche
   l'IA par-dessus.

Légende : 🟢 rapide (une passe) · 🟡 moyen · 🔴 gros chantier (réécriture de la
boucle de jeu).

---

## Lot 0 — Déjà fait ✅

- Blasons officiels à la place des icônes génériques (onglet Carrière + avatar).
- 655 clubs français sur 10 divisions, 12 086 licenciés réels, 715 logos.
- Évolution dynamique des attributs et du potentiel selon la note de saison.
- Contrats, offres, panneau « Choix de carrière », carrière à l'étranger.
- Mercato réel + mercato simulé des clubs IA.
- **Optimisation** : chunk principal 618 Ko → **137 Ko gzip** (voir plus bas),
  et rendu de l'atlas / de la cérémonie 3D allégé (Firefox).
- **MJ sévère et increvable** : plafonds côté code, budget de progression par
  saison, détection des tentatives de triche (lot 6, partie « réalisme »).
- **Départ à l'étranger** : les 20 championnats sont proposés à la création
  (lot 9, partie « nouvelles ligues jouables »).

> Prochaine étape : **lot 6** — la couche Groq (situations unifiées, moments
> décisifs, interviews, négociation de contrat). Lots 1 à 5 faits.

---

## Lot 1 — Le socle de la simulation ✅ (fait)

> **À faire en premier** : tout le reste s'y accroche.

1. **Calendrier réel** (`src/data/calendrier.ts`) — jour / mois / année, dates
   officielles des compétitions (championnat, coupes d'Europe, fenêtres
   internationales). C'est la colonne vertébrale : sans lui, ni journée par
   journée, ni sélections aux bonnes dates, ni mercato daté.
2. **Deux rythmes de jeu** : « journée par journée » (une situation par semaine,
   stats mises à jour chaque semaine) et « saison rapide » (3 situations, 3
   points d'étape). Le choix se fait à la création et se change dans ⚙️.
3. **Blocage de la progression** : les boutons « semaine / saison suivante »
   restent désactivés tant que les actions de la journée ne sont pas faites.
4. **Montées et descentes** : les divisions deviennent dynamiques d'une saison à
   l'autre (le classement décide, `NOTE_CLUB_REEL` n'est plus qu'un point de
   départ). Nécessite de persister la composition des divisions dans le store.

## Lot 2 — Statistiques et postes ✅ (fait, sauf stats PNJ affichées)

5. **Postes numérotés 1 à 15** (au lieu de 9 familles) : `PosteId` devient
   `1..15`, avec les libellés officiels. À faire **avant** les stats détaillées,
   sinon il faudra recalibrer deux fois les attentes par poste.
6. **Statistiques détaillées** : points marqués, % de réussite au pied,
   plaquages réussis / manqués, grattages, passes décisives, cartons.
7. **Stats des PNJ** : chaque joueur du monde génère ses propres statistiques à
   partir de sa note et de son poste — indispensable pour le classement des
   buteurs, les récompenses et les sélections.
8. **Récompenses logiques** : « Joueur de l'année » calculé sur les stats et les
   titres, plus meilleur marqueur / meilleur réalisateur.

## Lot 3 — Corps, âge et fin de carrière ✅ (fait)

9. **Blessures dynamiques** : mineure / fin de saison / fin de carrière, avec
   une probabilité liée à la forme, au moral et à la charge de matchs.
10. **Retraite encadrée** : libre à partir de 33 ans, forcée à 40.
11. **Mentorat** après 30 ans : ralentit la baisse physique, booste le moral.
12. **Reconversion** à la retraite (entraîneur, consultant, patron de bar),
    orientée par les traits.

## Lot 4 — Identité du joueur ✅ (fait)

13. **198 nations** à la création (aujourd'hui ~60).
14. **Générale de départ 30-40** (aujourd'hui ~46) — à recalibrer **avec** le
    lot 3, sinon la progression paraît cassée.
15. **Traits de caractère** (Sang chaud, Fêtard, Professionnel, Peur de se faire
    mal…) : bonus/malus permanents, et ils conditionnent les lots 5 à 8.

## Lot 5 — Le vestiaire vivant ✅ (fait)

16. **Affinités et némésis** avec les PNJ, nourries par les événements.
17. **Rôle de capitaine** : brassard → options de boost collectif.
18. **Sélections nationales automatiques** : chaque nation convoque ses
    meilleurs joueurs par poste, aux dates du calendrier (lot 1).

## Lot 6 — L'IA au service de l'immersion 🟡

> Tout reste jouable sans clé : chaque brique a son pendant pré-écrit.

19. **Boucle d'événements unifiée** : 1 situation par itération, générée par
    Groq si la clé est là, tirée du pool sinon.
20. **Moments décisifs** en match (choix à la 80ᵉ).
21. **Interviews d'après-match** (confiance du coach et des fans).
22. **Négociation de contrat via l'IA** + **choix d'agent** (commission,
    accès aux grandes ligues, risque de drame).

## Lot 7 — Réseaux sociaux et méta-jeu ✅ (fait)

23. **Twitter interne** : poster, réponses générées (fans, journalistes,
    haters), impact sur réputation et abonnés, **sanctions en cas de dérapage**.
24. **Succès et défis quotidiens** avec récompenses en Ovas.

## Lot 8 — Économie et lifestyle 🟢

25. **Sponsors et dépenses** : caisson hyperbare (moins de blessures), biens de
    luxe (notoriété ↗, risque de dérapage ↗).
26. **Boutique** : nouveaux skins de ballon, icônes, équipements
    (`crampons.glb` et `maillot.glb` sont déjà compressés et attendent).

## Lot 9 — Contenu et images 🟢

27. **Nouvelles ligues et nouvelles données** (le générateur est prêt : une
    entrée dans `scripts/ligues.cjs` suffit).
28. **Banque d'images d'événements** affichées selon la situation rencontrée
    (images libres de droit à fournir).

---

## Optimisation — état des lieux

**Mesuré, pas supposé.** Le calcul n'est pas le problème : construire un
effectif prend **1 ms**, la moyenne d'une division **3 à 7 ms**, et recalculer
les 654 clubs du monde entier **25 ms**. Un Web Worker pour ça coûterait plus
cher en complexité (sérialisation, asynchronisme dans le store) qu'il ne
rapporterait. **Le vrai poids était le bundle** — c'est lui qui a été traité :

| | Avant | Après |
|---|---|---|
| JS au premier rendu | 618 Ko gzip | **137 Ko gzip** |
| Three.js | dans le chunk principal | chunk séparé, chargé à la demande |
| Données réelles | dans le chunk principal | 2 chunks parallèles, cache séparé |

Comment : `TropheeGagne` passe en `lazy()` (il tirait tout Three.js), et
`vite.config.ts` sort les données générées et la 3D dans leurs propres chunks.

**Si ça devient lourd plus tard**, dans l'ordre de rentabilité :

1. **Mémoire** : `cacheBrut`, `cacheForce` et `cacheReference` (`lib/effectif.ts`)
   grossissent sans limite. Une carrière de 20 saisons × 655 clubs finirait par
   peser — les plafonner en LRU.
2. **Chargement à la demande des effectifs** : `EFFECTIFS_AMATEURS` (230 Ko) et
   `MERCATO_REEL` (103 Ko) ne servent qu'à l'écran 👥 et au mercato. Les passer
   en `import()` dynamique demande de rendre `effectifDuClub` asynchrone —
   faisable, mais à faire **avant** le lot 1 si on y touche, pas après.
3. **Web Worker** — seulement si le lot 1 (simulation journée par journée avec
   tous les matchs de toutes les divisions) fait vraiment monter le calcul.
   C'est le seul scénario où le multi-thread se justifierait : un worker
   `simulation.worker.ts` qui joue une journée complète et renvoie les
   résultats, pendant que l'UI reste fluide.
4. **Virtualisation des listes** : la Fédérale 3 affiche 157 cartes de club et
   certains effectifs 113 joueurs. Au-delà, n'afficher que le visible.
