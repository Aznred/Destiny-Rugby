# LIGUES.md — la Carrière en ligne, le troisième mode

> **État : le mode est jouable de bout en bout.** Compte, ligue privée, code
> d'invitation, trente licenciés de Régionale 3 au départ, championnat, matchs en direct avec
> décisions du manager, packs, marché, enchères, échanges, coupes maison,
> objectifs, palmarès, écusson de club. Serveur + écran + banc (**144 contrôles**,
> `npm run verify:carriere`). **Ce qui manque encore : la base Neon déployée**
> (le schéma est écrit, il n'est pas appliqué) — en local, tout tourne sur un
> stockage fichier.
>
> ⚠️ **Il reste aussi une dette de doublon**, décrite tout en bas : neuf modules
> du premier lot ne servent plus qu'à leur propre banc de mesure.

---

## Le mode en une phrase

Deux à vingt potes créent une ligue privée, chacun son club, un championnat de
plusieurs semaines à un ou deux matchs par semaine, une monnaie (**l'OVA**), des
packs tirés du vivier mondial réel, un marché et des échanges entre eux, des
coupes inventées par le commissaire, et une histoire qui traverse les saisons.

Ce n'est **pas** un clone de FUT posé sur du rugby. Le moment mémorable visé
n'est pas « j'ai packé un 90 », c'est :

> « J'ai packé ce 74 à la première saison, personne n'en voulait, il a joué six
> saisons chez moi, Hugo m'a proposé 90 000 OVA pour lui, j'ai refusé, et il
> nous a fait gagner la finale. »

Tout ce qui suit est au service de cette phrase.

---

## ⚠️ Les quatre invariants

Ils ne se négocient pas. Chacun a une raison, et chacun a un endroit unique dans
le code où il est tenu.

### 1. Le serveur est la source de vérité

En solo, le navigateur détient l'état et c'est très bien : personne ne triche
contre soi-même. Une ligue entre potes, c'est l'inverse — un solde d'OVA, la
propriété d'une carte et un résultat de match **engagent quelqu'un d'autre**.

Donc : **le client demande une action, il ne déclare jamais un état.**

```
✗  « j'ai 100 000 OVA »          → le serveur ne lit pas ça
✓  « je veux ouvrir un pack »    → le serveur lit le solde EN BASE, débite,
                                   tire, attribue, journalise — en UNE écriture
```

Ça se vérifie à l'œil dans `screens/CarriereEnLigne.tsx` : **le composant n'a
pas un seul `useState` qui contienne un OVA, une carte ou un score.** Tout ce
qu'il affiche vient de `vueCarriere`.

### 2. Un joueur n'existe qu'une fois par ligue

Si Dupont appartient à Colin RFC, personne d'autre ne peut l'avoir. C'est ce qui
transforme une carte en sujet de conversation : pour l'obtenir, il faut aller
parler à Colin. Tenu dans `ouvrirPack` (`carriere.ts`) : le tirage exclut tous
les `sourceId` déjà possédés **dans cette ligue**. Il reste évidemment
disponible dans toutes les autres.

### 3. Rien ne traverse d'une ligue à l'autre

Ni les OVA, ni les cartes. **Pas de portefeuille global** : sinon un vétéran de
500 heures arrive dans la ligue de ses potes avec un trésor et l'économie est
morte au premier jour. Le compte est global (identifiant, pseudo) ; tout le
reste appartient à la ligue.

### 4. Aucun OVA ne s'achète en argent réel

« Tu les gagnes uniquement en jouant. » Ça vaut pour les détours : pas de pack
payant, pas de double-gains vendu, pas de pub récompensée. La monétisation du
jeu reste cosmétique (`MONETISATION.md`) et s'arrête à la porte de la ligue.

> ⚠️ **Piège de vocabulaire.** Le jeu a DÉJÀ une monnaie appelée « Ovas »
> (`joueur.ovas`, la Boutique, les skins). Ce sont **deux monnaies sans aucun
> pont**, dans aucun sens, jamais. Dans le code : `ovas` (minuscule, pluriel) =
> la boutique solo ; `ova` = le solde d'un club dans une ligue.

---

## Les pièces, et qui fait quoi

| Fichier | Rôle |
|---|---|
| `src/lib/ligue/typesCarriere.ts` | Le vocabulaire : ligue, club, carte, vente, échange, objectif, commande. |
| `src/lib/ligue/catalogueCarriere.ts` | **Le vivier mondial** : 78 083 joueurs réels, la dotation de 30 licenciés de Régionale 3, les sept packs, les 1 353 écussons. |
| `src/lib/ligue/carriere.ts` | **Toutes les règles.** Création, adhésion, saison, calendrier, packs, marché, enchères, échanges, objectifs, coupes, classement, récompenses. |
| `src/lib/ligue/matchCarriere.ts` | **Le match**, du coup d'envoi à la feuille : stratégies, horloge, décisions en direct, remplacements. |
| `serveur/carriereApi.ts` | HTTP : comptes `scrypt`, sessions, limitation de débit, protection d'origine, idempotence. |
| `serveur/carriereStockage.ts` | Neon : une ligne versionnée par ligue, écriture par comparaison-et-échange. |
| `serveur/carriereFichier.ts` | Le même contrat, sur un fichier JSON — **développement uniquement**. |
| `api/carriere.ts` | La fonction serverless Vercel. |
| `vite.config.ts` | Le pont de développement : `/api/carriere` branché sur le stockage fichier. |
| `src/lib/carriereEnLigneClient.ts` | Le client : sept fonctions, aucune règle. |
| `src/screens/CarriereEnLigne.tsx` | L'écran : sept onglets + le direct. |

Banc : **`npm run verify:carriere`** — 144 contrôles, sans navigateur ni base.
Compter environ **une minute** : il joue près de deux cents matchs complets.

---

## ⚠️ Les trois décisions de conception qui commandent tout

### 1. Le vivier ne se matérialise jamais

Le catalogue mondial compte **78 083 joueurs** — tous les effectifs réels du
jeu, du Top 14 à la Régionale 3, plus les seize championnats étrangers — soit
**26,6 Mo de JSON**. La première version en donnait une copie à chaque ligue.

C'était intenable : une ligue est **une ligne de jsonb relue et réécrite à
chaque action**, et il y en a une toutes les deux secondes pendant un direct.
26 Mo par lecture.

Une carte n'existe donc **qu'à partir du moment où elle est distribuée**. Ce qui
reste libre se déduit : le catalogue est déterministe et identique partout, et
l'unicité par ligue se lit dans les `sourceId` déjà possédés. Mesuré : une ligue
de six clubs après une saison complète pèse **583 Ko**.

La pyramide du vivier, telle qu'elle sort des données réelles :

| bande | notes | joueurs |
|---|---|---|
| Bronze | 30-49 | 67 514 |
| Argent | 50-64 | 6 415 |
| Or | 65-79 | 3 712 |
| Élite | 80-87 | 416 |
| **Star** | **88+** | **26** |

Vingt-six joueurs à 88 et plus **dans tout le jeu**. En packer un est un
événement, et l'unicité par ligue fait le reste : celui qui l'a, tout le monde
le sait.

### 2. On ne stocke pas un match, on stocke de quoi le rejouer

`EtatMatch` (le moteur) porte 46 pions avec leurs positions, leurs vecteurs
vitesse, leurs statistiques — et un `rng` qui est une **fermeture**. Rien de
tout ça ne traverse un `JSON.stringify`.

Ce qui est persisté tient en quatre choses : la **graine**, les **deux feuilles
gelées au coup d'envoi**, le **journal des ordres** (chacun daté à la minute de
jeu où il a pris effet) et l'**horloge**. `rejouer()` reconstruit l'état exact à
n'importe quelle minute.

Conséquence directe, et c'est la promesse du mode : **deux managers qui
regardent la même rencontre voient rigoureusement le même match.** Ce n'est pas
une synchronisation, c'est la même fonction pure appelée deux fois. Mesuré : un
match suivi minute par minute donne le même score, le même fil et les mêmes
minutes qu'un match joué d'un bloc.

> ⚠️ **Corollaire dur** : un ordre n'existe que s'il est au journal, avec sa
> minute. Muter l'état rejoué sans l'y écrire donne un match qui se contredit au
> rechargement suivant.

> ⚠️ **Et le pas de rejoue ne s'optimise pas.** Il est à 0,6 seconde, pour deux
> raisons. La phase « pénalité » ne dure que 2,5 secondes à l'écran : un pas
> plus large la traverserait sans jamais pouvoir s'y arrêter, et la décision du
> manager n'existerait pas. Et surtout, un pas plus large dépasse la minute
> demandée de plus loin — la rejoue s'arrêterait à la 30ᵉ 42 au lieu de la
> 30ᵉ 03, donc à un autre tick, donc **avant ou après un ordre daté de la 30ᵉ**.
> Il n'y a d'ailleurs rien à y gagner : mesuré, un match complet prend **267 ms
> à pas de 8 s contre 285 ms à 0,6 s**. Le coût est celui des ticks du moteur,
> pas celui des appels.

### 3. Les scores ne partent pas en vrille

« Il ne faut surtout pas que la multiplication des actions provoque des scores
absurdes du type 200-150. »

Le moteur du jeu a ce garde-fou depuis l'origine : il reçoit un **score cible**
par équipe, en tire un plan (tant d'essais transformés, tant d'essais secs, tant
de pénalités) et refuse l'essai qui ferait dépasser ce plan — le ballon est tenu
dans l'en-but, renvoi aux 22, ce qui est une vraie règle du rugby.

La cible vient de la **force des deux feuilles**, avec exactement la formule du
championnat solo (`jouerRencontre`), avantage du terrain compris. Ce qui change
en ligne, c'est `scoreSurTerrain` : le reliquat du plan n'est **pas soldé** au
coup de sifflet final. Le score affiché est celui qui a réellement été marqué.

**Mesuré sur 120 rencontres entre deux effectifs Bronze à 35 GEN :**

| | valeur |
|---|---|
| score moyen d'une équipe | **19,9** |
| médiane | 20 |
| **maximum observé** | **35** |
| essais par équipe | 2,75 |
| pénalités passées par équipe | 0,87 |
| durée de rejoue d'un match complet | 279 ms |

---

## L'horloge, la présence et les décisions

**Une minute de rugby vaut une minute de vraie vie.** Un match occupe donc
quatre-vingts minutes réelles : on ouvre l'onglet, on regarde une phase, on part
faire autre chose, on revient à la 63ᵉ. C'est ce qui donne son prix à une
décision — elle se pose une fois, à l'instant où elle se pose.

**Et le match se regarde à la vitesse réelle**, pas au ralenti. Voir la section
suivante : c'est le chantier qui a demandé le plus de mesures.

**La présence est déclarée, pas devinée.** L'écran du direct envoie un battement
toutes les 12 secondes ; le serveur ne propose une décision qu'à un manager dont
il a des nouvelles depuis moins de 45 s. Sans ça, un match lancé puis abandonné
resterait figé sur une pénalité que personne ne tranchera jamais.

Quand une pénalité tombe **dans les 50 mètres adverses** devant un manager
présent, **le chrono s'arrête** (le gel est compté à part et ne se relâche
jamais) et l'écran demande : prendre les trois points, chercher la touche, jouer
vite, ou demander la mêlée. Le pourcentage annoncé est celui que le moteur jouera
réellement — c'est la même fonction (`probabilitePenalite`), pas une estimation
d'écran. Sans réponse en 20 secondes, **l'IA tranche selon les consignes
enregistrées**, et la situation passe avant la consigne : « toujours les points »
à la 79ᵉ en étant mené de cinq ne se joue pas, il faut un essai.

⚠️ **LES 50 MÈTRES NE SONT PAS UN DÉTAIL DE CONFORT.** Un match siffle **24,1
pénalités** ; ne réveiller le manager que dans la zone où le choix existe en
laisse **6,7 par équipe**, soit une toutes les douze minutes. Au-delà, « je prends
les points ? » n'est pas une question, c'est une faute de goût — et chaque appel
gèle le chronomètre vingt secondes.

⚠️ **ET LES DEUX MANAGERS SONT ÉCOUTÉS.** La rejoue ne s'arrêtait que sur les
pénalités d'UN camp — le premier trouvé présent, donc toujours le club à
domicile dès qu'il regardait. Le visiteur ne se voyait proposer **aucune**
décision de tout le match. Mesuré par le banc : domicile 5, extérieur 4.

---

## ⚠️ Le direct : un vrai match, à la vitesse d'un vrai match

Retour de jeu, mot pour mot : « **c'est lent, les joueurs sont mal placés, prends
le même moteur que sur le mode carrière solo** », puis « je veux un vrai match
comme si on regardait un match qui se jouait en temps réel, comme dans la vraie
vie — une mêlée prend une trentaine de secondes ».

C'était bien le même moteur. Quatre défauts se cumulaient, et chacun suffisait.

### 1. Le match avançait par bonds d'une minute

`EtatMatch.minute` est un **entier** (`Math.floor(t / 60)`). Tant que la rejoue
s'arrêtait dessus, demander « le match à la 30ᵉ 03 » le poussait en réalité
jusqu'à la 31ᵉ pile — puis plus rien pendant cinquante-sept secondes réelles. Le
terrain était **une photo qui se téléportait une fois par minute** : le ballon
passait de la ligne des 55 m à celle des 35 m sans qu'on ait rien vu.

La rejoue vise donc `e.t / 60`, les minutes au centième. **Et le résultat d'un
match n'en bouge pas** : jouer d'un bloc, c'est pousser jusqu'à la 80ᵉ, et
`e.minute < 80` comme `e.t / 60 < 80` s'arrêtent au même tick.

### 2. Le serveur répondait « rien n'a changé » pendant tout le match

L'échéance d'une ligue est « la plus petite date future trouvée dans l'état »
(`echeanceCarriere.ts`). Une rencontre **en cours** ne porte aucune date : sa
clôture est derrière nous, et ce qui doit se produire, c'est le prochain instant,
tout le temps. L'échéance retenue était donc la rencontre suivante — un jour plus
tard. Résultat : chaque sondage recevait `{inchange:true}` **sans que le serveur
ne lise l'état, donc sans faire avancer le match**. Le terrain n'avançait plus
que sur le battement de présence, toutes les douze secondes.

Tant qu'une rencontre est en cours, l'échéance est donc **maintenant**.

⚠️ **ET ÇA NE RÉÉCRIT PAS LA LIGUE POUR AUTANT.** Un direct fait bouger
l'horloge, le score, le fil et les statistiques à chaque sondage : les 300 à
400 Ko de l'état repartaient vers la base deux mille quatre cents fois par
rencontre. Or ces six champs **ne sont pas de l'information** — ils se
reconstruisent de la graine, des feuilles gelées et du journal. `empreinteEcriture`
les retire de la comparaison : une lecture rend l'état AVANCÉ sans l'écrire, et
seul un vrai changement (un ordre au journal, une décision en attente, le gel du
chrono, la sirène) déclenche une écriture.

### 3. Plus de la moitié du match était au ralenti

Le moteur **compresse** les phases arrêtées à l'image : la mêlée se met en place
en sept secondes, le chronomètre en avale cinquante. C'est le bon choix pour la
carrière solo, qui traverse un match en cinq minutes de manette. Étirées sur les
cinquante secondes réelles de la Carrière en ligne, ces sept secondes donnent des
joueurs qui **marchent au ralenti**. Mesuré :

| | |
|---|---|
| animation d'un match complet | **42,7 min** pour 80 min d'horloge |
| dont phases arrêtées | **9,7 min** d'animation pour **47,6 min** d'horloge |
| étirement moyen des arrêts | **×4,9** |

`EtatMatch.tempsReel` supprime l'étirement : une seconde de jeu, une seconde à
l'écran. Une mêlée dure ce que dure une mêlée. Le prix est le nombre de ticks —
4 800 secondes simulées au lieu de 2 560, soit **566 ms** pour rejouer un match
complet au lieu de 428 — et il ne se paie qu'au démarrage à froid : en direct, la
rejoue repart du cache et n'avance que de deux secondes à la fois.

⚠️ **LES SCORES NE BOUGENT PAS.** Le budget d'horloge de chaque arrêt est
inchangé, donc la structure du match aussi : mesuré sur 120 rencontres, score
moyen **20,7** (contre 20,8), **2,74** essais par équipe, maximum **36**.

### 4. Une formation figée devient une photo

Le placement d'une phase arrêtée est calculé une fois puis tenu. À la vitesse
réelle, les huit avants arrivent en sept secondes et **restent immobiles
quarante secondes**. `animerArret` joue donc les arrêts en plusieurs temps :

- **la mêlée** — les deux packs se présentent face à face, se lient à 45 %, puis
  le plus fort pousse ;
- **la touche** — l'alignement, d'abord espacé et en retrait, se resserre à
  mesure que le lanceur se prépare ;
- **le tir au but** — le buteur recule de sept mètres, prend son temps, s'élance.

⚠️ **ET PERSONNE NE SE TÉLÉPORTE PLUS.** `installerPlacement` replace d'office
un joueur à plus de 26 mètres de sa marque, parce que la carrière solo ne lui
laisse que sept secondes à l'écran. Regardée à la vitesse réelle, la même
téléportation se voit — c'est une bonne part du « les joueurs sont mal placés ».
En temps réel, le seuil est infini : une mêlée dure cinquante secondes, il y a
tout le temps d'y courir.

### Ce que l'écran en fait : on interpole, on n'extrapole pas

Le serveur envoie trente positions **et leurs vecteurs vitesse** toutes les deux
secondes (`TerrainDirect`) ; `components/match/TerrainEnDirect.tsx` en fait
soixante images par seconde, avec la vraie pelouse et la caméra du match de
carrière (`moteur/camera.ts`, pivot d'un quart de tour en portrait).

Première version : on prolongeait `position + vitesse × temps` jusqu'au relevé
suivant. **C'est faux, et ça se voit.** Un joueur ne court pas deux secondes en
ligne droite ; à neuf mètres par seconde, deux secondes de prédiction sont
dix-huit mètres d'erreur possible.

Le match se rend donc avec **un relevé de retard** (2,4 s), en interpolant entre
les deux relevés qui encadrent l'instant — non pas par un `lerp` (une droite
entre deux points distants de deux secondes coupe les courbes et fait patiner les
appuis) mais par une **spline d'Hermite** dont les tangentes sont les vecteurs
vitesse des deux bouts. La trajectoire passe exactement par les deux positions
vraies et repart dans la bonne direction. Le retard ne se voit pas : il n'y a
rien à côté pour le comparer.

⚠️ **LE TEMPS SIMULÉ VIENT DE L'HORLOGE DU MATCH, PAS DE LA MONTRE.** Une
décision de pénalité gèle le chrono du serveur : les deux relevés portent alors
la même minute, les tangentes s'annulent, et le terrain s'immobilise exactement
comme le jeu.

⚠️ **ET LES DEUX SECONDES SONT RÉSERVÉES À CELUI QUI REGARDE.** Sonder à 2 s pour
tous les membres de la ligue, c'était 2 400 lectures complètes de l'état par
rencontre et par onglet ouvert. Le match avance de toute façon à chaque lecture,
d'où qu'elle vienne : un direct sans spectateur ne se bloque pas, il coûte cinq
fois moins cher.

**Aucune absence ne bloque la ligue.** À la fermeture de la fenêtre d'une
journée, les rencontres non jouées se jouent toutes seules avec les compositions
et les consignes enregistrées — même moteur, mêmes règles, `origine: 'absence'`.
Un direct lancé puis abandonné se termine aussi tout seul.

---

## L'économie

**Ce qu'un match rapporte** (le barème de la demande, au point près) :

| | OVA |
|---|---|
| match terminé | 500 |
| victoire / nul / défaite | +750 / +350 / +100 |
| bonus offensif (3 essais d'écart) | +150 |
| bonus défensif (battu de 7 ou moins) | +100 |
| 4 essais dans le match | +150 |
| gagner sans encaisser d'essai | +200 |
| gagner à l'extérieur | +100 |
| marquer 30 points | +100 |

⚠️ **Le rapport victoire/défaite est le vrai réglage anti-boule-de-neige, pas le
montant.** Une grosse victoire rapporte 2 050 OVA, une défaite sèche 600 : deux
fois sur le cas courant. Doubler cet écart, et le premier de la ligue s'achète
l'effectif qui garantit qu'il restera premier.

**Mesuré sur une saison complète à six clubs (10 journées) :**

```
1. Colin RFC  30 pts    27 350 OVA   →  15 packs Premium
2. Club 3     25 pts    21 850 OVA
3. Club 4     23 pts    20 350 OVA
4. Club 5     22 pts    19 150 OVA
5. Club 2     22 pts    18 750 OVA
6. Club 6     17 pts    16 800 OVA   →   9 packs Premium
```

**Rapport premier / dernier : 1,63.** Le dernier finit la saison avec de quoi
jouer au marché — et c'est délibéré : un club à zéro ne peut plus rien acheter,
donc plus rien négocier, donc il décroche pour de bon, et une ligue qui perd un
manager en perd deux. La dotation de championnat suit la même idée : tout le
monde touche 2 000, le champion 10 000, et la marche décroît jusqu'au dernier.

**Les sept packs** (`catalogueCarriere.ts`, probabilités configurables côté
serveur) :

| pack | prix | Bronze | Argent | Or | Élite | Star |
|---|---|---|---|---|---|---|
| Bronze | 250 | 90 % | 9,5 % | 0,5 % | — | — |
| Standard | 700 | 48 % | 37 % | 14 % | 0,95 % | 0,05 % |
| Premium | 1 800 | 15 % | 40 % | 42 % | 2,8 % | 0,2 % |
| Avants / Arrières | 800 | 48 % | 37 % | 14 % | 0,95 % | 0,05 % |
| France | 800 | 48 % | 37 % | 14 % | 0,95 % | 0,05 % |
| International | 1 000 | 35 % | 44 % | 19,9 % | 1 % | 0,1 % |

Mesuré : **60 packs Premium** (108 000 OVA, soit quatre saisons de jeu) donnent
27 Bronze, 78 Argent, 66 Or, **9 Élite et 0 Star**, meilleure carte 86.
La progression visée par la demande — 35 GEN au départ, 70-80 en fin de saison
pour les meilleurs — passe par une quinzaine de packs Premium par saison, et par
le marché.

---

## Ce qui a été trouvé en mesurant, et gardé en mémoire

### Le pack Avants ne contenait personne

`carteDansPack` comparait `POSTE_PAR_ID[c.poste].categorie === 'avant'`. La
valeur réelle, dans `data/rugby.ts`, porte une **majuscule** : `'Avant'`. Le
pack Avants ne trouvait donc aucun joueur, et le pack Arrières renvoyait tout le
catalogue, piliers compris. Rien ne plantait — les deux packs marchaient, ils
donnaient juste n'importe quoi. Le banc le tient maintenant : les deux rayons
doivent se partager exactement le catalogue (1 823 + 1 889 = 3 712 en Or).

### Le débordement horizontal sur mobile

Sur un écran de 375 px, tout le jeu partait en défilement horizontal — y compris
sa barre de navigation. Le coupable : le classement est un tableau à cellules
`white-space: nowrap` posé dans un conteneur `overflow-x: auto`. Le conteneur
clippe bien, mais son **parent**, un item de grille à `min-width: auto`, prend
quand même la largeur minimale du contenu. Mesuré : panneau 399 px, document
410 px pour un écran de 375. C'est le piège déjà documenté du projet ; le
correctif est `min-width: 0` sur les items de grille concernés.

### Une ligue qui grossissait sans fin

Une rencontre archivée pèse **15 Ko** (le fil de commentaires, et surtout la
feuille de match : 46 lignes). Une saison à vingt clubs compte 380 rencontres,
soit **6,5 Mo de jsonb réécrits à chaque lecture**.

On garde donc le détail des **vingt dernières rencontres jouées** — celles dont
on parle encore — et on réduit les plus anciennes au score, aux essais et aux
statistiques d'équipe (1 Ko, quatorze fois plus léger). Rien de ce qui compte
n'est perdu : les statistiques individuelles sont **créditées aux cartes** au
moment de l'archivage (`carte.matchs`, `carte.essais`) et y restent pour toute
la carrière du joueur. Projection mesurée pour vingt clubs : **1 Mo**.

### Une erreur de règle qui s'affichait « serveur indisponible »

`carriereApi` distingue une règle du jeu (400, le message se lit à l'écran)
d'une panne (503, sans jamais exposer sa pile) en regardant le **nom** de
l'erreur. `carriere.ts` levait des `Error` nues : « il te manque 200 OVA »
remontait au joueur en « le serveur de carrière est indisponible ». D'où la
classe `ErreurCarriere`.

---

## La base

`serveur/schema-carriere.sql`, à appliquer **après** `schema-vercel.sql` puis
`schema-ligues.sql`, dans la même base Neon.

Trois tables suffisent, parce que **la ligue entière est un agrégat versionné** :

- `carriere_ligues` — une ligne par ligue, l'état complet en `jsonb`, une
  colonne `version`. Toute écriture est un **comparer-et-échanger** : deux
  achats simultanés ne peuvent pas se croiser, le perdant relit l'état et
  recalcule son action (huit tentatives).
- `carriere_commandes` — le reçu d'idempotence `(ligue, compte, requête)`, écrit
  **dans la même transaction** que l'état. C'est lui qui interdit qu'une requête
  rejouée rachète un pack ou verse deux fois les récompenses d'un match. ⚠️ **Ne
  jamais purger cette table pendant la vie d'une ligue.**
- `carriere_debits` — la limitation de débit.

Les comptes réutilisent la table `comptes` du socle, avec une colonne
`identifiant` et son index unique.

**En développement**, `vite.config.ts` branche le même gestionnaire sur
`serveur/carriereFichier.ts` (un JSON dans `node_modules/.destiny/`). Mêmes
règles, même validation, même comparaison de version : ce qui marche en local
marche déployé.

---

### Le vestiaire de départ est fait de vrais licenciés

Les trente joueurs du premier jour étaient générés : trente prénoms tirés dans
une liste de quinze, un club nommé « Centre de formation », des notes calées
pour tomber pile à 35. C'était propre et ça ne racontait rien — on ne s'attache
pas à un joueur qui n'existe pas.

Ils viennent maintenant de la **Régionale 3 réelle, entre 30 et 40** : 6 600
licenciés avec leur nom et leur club. Le premier XV d'une ligue, ce sont des
gens qui jouent vraiment le dimanche, et c'est le même vivier que les packs —
juste tout en bas.

L'équilibre est tenu par **l'échelle de notes, pas par le tirage** : chaque club
reçoit la même échelle de trente notes visées (moyenne 35), et pour chaque cran
on prend le licencié libre du bon poste dont la note en est la plus proche.
Mesuré sur vingt clubs : **35,00 de moyenne partout, zéro écart**, 600 licenciés
distincts. Et l'unicité par ligue commence là, pas au premier pack : deux amis
inscrits le même jour ne peuvent pas recevoir le même joueur.

> ⚠️ **Un bug de données trouvé en chemin, et il dépassait le mode en ligne.**
> Le dictionnaire qui donne sa note de base à chaque division amateur était
> indexé par `federale1`, `regionale3`… alors que `CLUBS_AMATEURS` s'appelle
> `fed1`, `reg3`. **Aucune clé ne tombait juste** sauf les deux Nationales :
> toute la pyramide française retombait sur le défaut 40 et sortait avec
> exactement la même distribution de notes (33 à 47), de la Fédérale 1 à la
> Régionale 3. Rien ne plantait ; il n'y avait simplement plus de pyramide.
> Corrigé, on retrouve Régionale 3 → 30-42, Régionale 2 → 32-46,
> Régionale 1 → 36-50.

### L'écusson du club

Un club en ligne peut porter les couleurs d'un **vrai club** : les 1 353
écussons de la base, du Stade Toulousain au club de Régionale 3 du coin,
groupés par championnat et cherchables par nom. Choisi à la création, changeable
ensuite depuis l'onglet « Le club ».

⚠️ **La liste ne part pas dans la vue de la ligue** : 117 Ko qui repartiraient
toutes les deux secondes pendant un direct. Elle se demande séparément
(`/api/carriere?emblemes=1`), une seule fois, au premier clic sur le sélecteur,
et se met en cache un jour. Le serveur refuse tout chemin qu'il ne connaît pas
(`emblemeValide`) : un client bricolé ne fait pas afficher l'image de son choix
aux autres membres de la ligue.

> 754 de ces écussons sont des fichiers de `public/logos/`, **599 sont des URL
> vers l'API de la FFR** — donc dépendantes d'un tiers. Choix assumé : ce sont
> justement les clubs de Fédérale et de Régionale, ceux dont on veut porter les
> couleurs. Le jeu les affiche déjà ainsi partout ailleurs, et une image
> manquante y est un carré vide, pas une panne.

### L'ouverture d'un pack est un moment, pas une liste

Trois cartes qui s'affichent d'un coup, c'est un résultat ; une pochette qu'on
déchire et des cartes qu'on retourne une par une, c'est ce dont on parle le soir
même. La séquence : la pochette respire au centre, on la déchire, puis les
cartes se retournent **de la moins bonne à la meilleure**, à 900 ms d'écart, et
les bandes Élite et Star déclenchent un éclat que les autres n'ont pas.

⚠️ **La lueur du fond annonce la rareté avant le nom** : le halo prend la
couleur de la meilleure carte du lot dès l'ouverture du voile. C'est ce qui fait
qu'on retient son souffle — une révélation qui n'annonce rien n'a pas de
suspense. Et le tirage, lui, est **déjà fait côté serveur** quand l'animation
commence : rien de ce qui se passe à l'écran ne décide de quoi que ce soit.

### Un piège du serveur de développement

Le greffon Vite mémorisait le gestionnaire d'API dans une variable de module.
`ssrLoadModule` rechargeait bien les fichiers modifiés, mais le gestionnaire
mémorisé continuait d'appeler **l'ancien module** : on modifiait
`carriereApi.ts`, le serveur de dev répondait comme avant, et on cherchait le
bug ailleurs. Seul le stockage se garde désormais entre deux requêtes ; le
gestionnaire est recréé à chaque fois — c'est une fermeture, ça ne coûte rien.

⚠️ **LE STOCKAGE, LUI, RESTE EN MÉMOIRE.** `stockage ??= stockageFichier(…)`
charge `node_modules/.destiny/carriere.json` à la PREMIÈRE requête et n'y
retouche plus. Réécrire ce fichier pendant que le serveur tourne ne sert donc à
rien : il faut le redémarrer. Le piège coûte dix minutes à chaque fois.

**Pour regarder un direct sans attendre une journée de championnat** :

```
npx vite-node scripts/_semerDirect.ts     # une ligue à deux clubs, coup d'envoi il y a 20 s
npm run dev                                # puis se connecter avec colin / motdepasse123
```

Le script écrit une ligue complète (saison lancée, première rencontre ouverte)
dans le stockage de développement. Redémarrer le serveur APRÈS l'avoir lancé.

Le compte dont l'identifiant serveur est exactement `kiri` n'a plus besoin de
ce semis pour tester les évolutions : l'ouverture de « Mes ligues » assure une
unique ligue **Laboratoire Kiri**. Elle contient trois adversaires automatiques,
un million d'Ovas et une console pour piloter les matchs et réinitialiser la
saison. Le serveur vérifie à la fois l'identité `kiri`, le marqueur du
laboratoire et sa propriété avant chaque commande spéciale.

---

### Le classement, la fiche d'un club, et les écussons partout

Le classement était un tableur : huit colonnes de chiffres, aucun repère
visuel, on lisait les noms un par un. Il porte maintenant **l'écusson et le
pseudo de chaque manager**, les points marqués et encaissés, les bonus, et la
**forme sur cinq matchs** — lue dans les rencontres, jamais reconstruite à
partir d'un cumul.

Chaque ligne s'ouvre sur la **fiche du club** : son effectif complet, son GEN
moyen, la note de son XV, ses six derniers résultats et son palmarès.

> ⚠️ **Aucun appel de plus au serveur.** `vueCarriere` envoie déjà toutes les
> cartes possédées de la ligue — le marché en a besoin. Voir l'effectif d'un
> adversaire ne demande donc rien, et ne montre que ce que le serveur a **déjà
> jugé public** : ni sa composition, ni ses consignes.

Sur une carte de joueur, le **blason de son club réel** est posé sur le
portrait, comme un écusson de maillot. La table nom → écusson arrive une seule
fois du serveur, avec celle du sélecteur : la stocker sur chaque carte
coûterait 60 Ko dans l'état d'une ligue à vingt clubs, pour une valeur qui se
déduit du nom du club.

### ⚠️ Le fond blanc des écussons

**Presque la moitié des écussons du jeu sont livrés avec un fond blanc opaque.**
Mesuré sur 108 logos de `public/logos/` tirés au hasard : 53 déjà détourés,
**46 avec un rectangle blanc**, 9 avec un fond coloré. Posés sur le vert nuit
du jeu, ces 46-là faisaient une vignette blanche au milieu de la page.

**Un filtre CSS ne peut pas faire ce travail, et c'est mesuré.** Un
`feColorMatrix` qui rend transparent ce qui est clair enlève bien le fond… et
troue tous les blancs INTÉRIEURS avec : le S blanc du Stade Toulousain
disparaît, les liserés deviennent des trous. Essayé sur six logos, inutilisable.

La seule façon correcte est de distinguer le fond du dessin, donc de partir des
**bords** : `components/EcussonClub.tsx` remplit depuis le cadre tant qu'il
rencontre du blanc et s'arrête au premier pixel coloré. Le blanc enfermé dans
l'écusson n'est jamais atteint. Une passe d'adoucissement rattrape ensuite
l'anticrénelage — sans elle, chaque écusson détouré garde un liseré blanc qui
se voit **encore plus** que le fond d'origine.

> ⚠️ **Les 599 écussons distants passent par un relais.** Les logos de Fédérale
> et de Régionale sont servis par l'API de la FFR, qui renvoie
> `Access-Control-Allow-Origin: https://monclubhouse.ffr.fr` : chargés
> directement, ils souillent le canvas et `getImageData` lève — donc pas de
> détourage, donc un rectangle blanc. Relayés par `/api/carriere?ecusson=…`, ils
> reviennent de NOTRE origine et redeviennent détourables comme les 754 autres.
>
> ⚠️ **Ce relais n'est PAS un proxy ouvert, et ne doit jamais le devenir.**
> `emblemeValide` est une liste blanche fermée, construite depuis les données du
> jeu : seule une URL qui y figure déjà est relayée, seulement en `https`, et
> seulement si la source répond bien une image de moins de 3 Mo. Sans ce
> contrôle, n'importe qui ferait de notre serveur un relais anonyme vers
> n'importe quelle adresse — y compris nos propres services internes. La réponse
> est mise en cache une semaine : ces écussons ne changent jamais.

### ⚠️ Le portrait d'une carte se pose en absolu

Les photos de joueurs **sortaient de leur carte** et passaient par-dessus le
nom. Le cadre du portrait est une grille dont la rangée est en `auto` : le
`height: 100%` de la photo s'y résout de façon **cyclique** (la rangée dépend du
contenu, le contenu dépend de la rangée), le navigateur l'ignore, et l'image
garde son rapport d'origine — mesuré, **60 × 90 dans un cadre de 62**.

`align-self: stretch` ne suffit pas : la cyclicité reste. En absolu (`position:
absolute; inset: 0`), le cadre de référence est le bloc positionné, et il fait
définitivement 62 × 62.

> C'est une régression introduite en ajoutant le blason du club sur le
> portrait : `overflow: visible` avait été posé pour laisser dépasser l'écusson,
> ce qui débridait aussi la photo. L'écusson est maintenant posé dans un cadre
> qui entoure le portrait, et le portrait garde son `overflow: hidden`.

### L'identité d'une compétition : logo, trophée, phase finale

À la création d'une ligue — et pour chaque coupe maison — le commissaire choisit :

- **le logo du championnat**, parmi les 60 logos de compétition du jeu ;
- **le trophée soulevé**, parmi les **46 trophées d'équipe** de l'armoire du
  mode solo (les 8 distinctions individuelles sont exclues : elles ne se
  soulèvent pas au bout d'un championnat) ;
- **une phase finale**, ou pas.

> ⚠️ **Un seul trophée est chargé à la fois, et c'est une contrainte de poids.**
> Les cinquante modèles de l'armoire pèsent **66,6 Mo** (1,36 Mo en médiane) :
> une grille qui en afficherait quarante-six ferait télécharger soixante
> mégaoctets pour choisir une coupe. La grille montre donc des pastilles
> (nom et teinte, aucun téléchargement), et seul le trophée **sélectionné** est
> rendu en image — par `lib/vignettes3d.ts`, le rendu hors écran en contexte
> WebGL unique que la Boutique utilise déjà pour le même problème.

**La phase finale ne rejoue pas la saison, elle la couronne.** Quand elle est
active et que la saison régulière est finie, deux journées s'ajoutent : les
demi-finales **1ᵉʳ contre 4ᵉ et 2ᵉ contre 3ᵉ**, chez le mieux classé, puis la
finale. À égalité, le mieux classé de la saison régulière passe — c'est
l'avantage qu'il a gagné en vingt journées.

> ⚠️ **Le classement régulier garde la main sur l'ARGENT, la finale décide du
> seul TROPHÉE.** Sans cette séparation, un quatrième qui gagne la finale
> toucherait aussi la dotation du premier, et vingt journées de championnat ne
> vaudraient plus rien.

Il faut **quatre clubs** pour une phase finale : à trois, une demi-finale à deux
n'a pas de sens, et le réglage est simplement ignoré plutôt que de produire un
tableau bancal.

---

### L'écusson se choisit une fois, et ne change plus

Il n'y a **aucune commande** pour changer l'écusson d'un club après coup : il se
choisit à l'inscription, et c'est tout. Dans une ligue entre potes, on reconnaît
le club de chacun à son écusson — le voir changer en cours de saison rend le
classement, les affiches et l'historique illisibles.

> ⚠️ **Un seul rendu d'écusson, partout.** Une première version affichait le
> logo par un `<img>` nu dans l'en-tête et le vestiaire, et par le composant
> détouré ailleurs : le même écusson avait donc son fond blanc à un endroit et
> pas à l'autre. `Ecusson` passe maintenant systématiquement par `EcussonClub`.

### La boutique de packs

Un pack se vend par ce qu'il PROMET, pas par son tableau de cotes. La première
version alignait cinq lignes de pourcentages sous une icône grise, sept tuiles
identiques : c'est un relevé, pas une vitrine. Trois choses la transforment, et
aucune n'est décorative :

1. **La pochette prend la couleur de sa meilleure bande réellement
   atteignable.** On reconnaît un Premium d'un Bronze de l'autre bout de la
   page, sans lire un mot.
2. **Les cotes deviennent une barre.** On voit d'un coup d'œil qu'un Premium est
   quatre fois plus doré qu'un Bronze. ⚠️ Les chiffres restent listés en
   dessous : c'est une économie, cacher ce qu'on achète serait malhonnête.
3. **Le pack phare est en devanture**, en grand. Une grille de sept tuiles
   identiques ne guide personne.

---

### On invite par un lien, pas par une dictée

Le code `DR-XXXXXXXXXX` existait déjà, mais il se dictait : l'ami devait ouvrir
le jeu, trouver la Carrière en ligne, cliquer « Rejoindre des amis » et recopier
dix caractères. Le lien fait tout ça à sa place :

```
https://destiny-rugby.fr/?ligue=DR-9F2A10C4B7
```

`lib/invitationLigue.ts` le fabrique depuis `origin + pathname` — jamais depuis
une adresse en dur, pour que le lien reste juste sur une préversion, sur
localhost et le jour d'un changement de domaine.

⚠️ **LE CODE DOIT SURVIVRE À L'INSCRIPTION.** Un lien d'invitation tombe presque
toujours sur quelqu'un qui n'a pas de compte : il va s'inscrire, peut-être
recharger, peut-être revenir dix minutes plus tard dans le même onglet. Or on
retire le paramètre de la barre d'adresse tout de suite — un rechargement ne
doit pas relancer une adhésion, et l'adresse ne doit pas traîner. D'où deux
mémoires : une variable de module pour la vie de la page, un `sessionStorage`
pour le rechargement. **Et l'URL n'est nettoyée que si le rangement a réussi** :
en navigation privée `sessionStorage` lève, et effacer le paramètre sans avoir
rien gardé perdrait l'invitation au premier F5.

Le parcours mesuré de bout en bout dans le navigateur : lien → écran de la
Carrière en ligne → « Crée ton compte » avec le mot d'accueil → formulaire
« Rejoindre » **code déjà rempli** → club créé, 1 000 Ovas, invitation oubliée.

⚠️ **UN LIEN SE CLIQUE DEUX FOIS.** On le range dans une boucle de messages, on
y revient le lendemain, on le rouvre depuis l'historique. La règle d'adhésion
répondait alors « Ce compte possède déjà un club dans cette ligue » — une erreur
pour quelqu'un qui voulait simplement entrer chez lui. Le serveur ouvre
désormais la ligue au membre déjà inscrit (`carriereApi.ts`, action `rejoindre`).

### ⚠️ Hors de son poste : autorisé, et payant

La règle serveur refusait tout croisement avant ↔ arrière sur la feuille de
match (`joueurCompatibleManager`). Elle contredisait trois choses à la fois :

- le **mode entraîneur solo**, qui laisse composer librement ;
- le **texte de l'écran**, qui promet « un joueur hors de son poste perd la
  cohérence collective » ;
- le **barème du jeu lui-même** — `adequationAuPoste` note ces placements
  « hors poste » à 82 %, pas « interdits ».

Et pour le joueur, ça donnait le pire des messages : il range ses recrues,
clique « Enregistrer la feuille », et le serveur jette TOUTE la feuille pour un
seul pion. C'est ce qui remontait sous la forme « ça n'enregistre pas la feuille
de match ».

La sanction est passée là où elle a un sens : **`feuilleGeleeEnLigne`**
(`matchCarriere.ts`) pèse la note de chaque joueur par son adéquation au moment
de geler la feuille. Une seule multiplication, et elle descend partout d'un
coup, parce que la feuille gelée est l'unique entrée du moteur : `forceFeuille`
en tire la puissance de l'équipe, `cibleDeScore` le score visé, chaque duel la
note du pion. Mesuré : une feuille rangée vaut **36,3** de force, les mêmes 23
joueurs empilés par note sans regarder le poste **30,1**.

⚠️ **SAUF LA PREMIÈRE LIGNE**, qui reste fermée aux non-spécialistes. Ce n'est
pas de l'équilibrage : une mêlée avec un ailier au pilier, c'est un arbitre qui
ordonne des mêlées simulées. Le règlement l'exige, le jeu aussi.

⚠️ **ET LE MODE SOLO, LUI, N'APPLIQUE TOUJOURS RIEN.** `facteurDePerformance`
n'y sert qu'à AFFICHER un « −18 % » que personne ne prélève. C'est une dette
connue, laissée en place : y toucher déplace l'équilibrage de la carrière
entraîneur, qui se mesure sur cent carrières de douze saisons.

### ⚠️ Une ligue en base est plus vieille que le code qui la relit

Le type dit `dotationOvas: number`, et TypeScript le garantit… pour les états
que ce code a écrits. Les lignes enregistrées **avant** l'arrivée du champ n'ont
rien à cet endroit, et le compilateur ne peut rien y voir : c'est du jsonb.

Mesuré sans filet : un ami qui rejoint une ligue créée la veille tombe sur
`undefined.toLocaleString()`, l'API rend « Demande invalide. » — un message qui
ne dit rien — et **la ligue devient impossible à rejoindre pour toujours**.

`reprendre(etat)` (`carriere.ts`) est désormais le seul point d'entrée d'un état
qui revient du stockage : il copie ET complète ce qui manque. Le remplissage est
écrit dans l'état retourné, donc la première commande venue le persiste et le
trou se referme de lui-même. **Tout champ ajouté au schéma passe par là.**

### ⚠️ Un refus doit se voir, même à mille pixels de là

La bannière d'erreur vit en haut de l'écran ; les boutons qui échouent sont au
milieu d'une longue page — le terrain de composition fait deux hauteurs d'écran
à lui seul. Sans recentrage, une commande refusée ne donnait rien à voir : on
clique, rien ne bouge, on en conclut que le jeu n'enregistre pas.
`CarriereEnLigne.tsx` fait défiler la bannière jusqu'au regard dès qu'elle
apparaît.

### Vingt-trois packs, en quatre rayons

Le VOLUME (Bronze, Standard, Premium, Or garanti, Grand pack, Élite garantie),
le POSTE (Avants, Arrières, Première ligne, Charnière, Troisième ligne,
Finisseurs), le MONDE (France, International, Top 14, Pro D2, Îles Britanniques,
Hémisphère Sud, Japon, Îles du Pacifique, Terroir) et l'ÂGE (Espoirs,
Confirmés). Un manager à qui il manque un talonneur ne doit pas avoir à ouvrir
des packs génériques en espérant tomber dessus.

Le filtre est passé d'un mot-clé à quatre valeurs à une **structure** :
catégorie, familles de poste, championnats, pays, nations, âge minimum et
maximum. Chaque champ est un ET, l'intérieur d'un champ est un OU.

⚠️ **La garantie est ce qui fait acheter, et elle se tient sur la DERNIÈRE
carte.** Forcer la bande dès le premier tirage ferait d'un « Or garanti » un
pack qui commence toujours par de l'Or puis retombe : on apprendrait en trois
ouvertures que seule la carte n°1 compte. En la gardant pour la fin, et
seulement si le tirage normal n'a rien donné, la promesse est tenue sans que la
séquence devienne prévisible. Mesuré sur 60 ouvertures : **60/60 tiennent la
promesse, et seulement 24 fois sur 60 la garantie a servi** — le reste du temps
le hasard avait déjà fait le travail.

> ⚠️ **Un pack ne doit pas annoncer une bande qu'il ne peut pas servir**, et le
> banc l'a attrapé : le pack Pro D2 annonçait de l'Élite alors que la Pro D2
> n'en compte **qu'un seul**, et le pack Terroir de l'Or alors que les six
> championnats amateurs n'en comptent **pas un**. Le seuil n'est pas le même
> pour toutes les bandes : la bande Star ne compte que 26 joueurs dans tout le
> jeu, donc en avoir un ou deux dans un pack thématique est normal — c'est même
> ce qui la rend précieuse.

⚠️ **Les packs sont copiés dans la ligue à sa création, et c'est voulu** : prix
et probabilités ne doivent pas changer sous les pieds des membres en pleine
saison. Mais sans rien, une ligue créée avant une mise à jour resterait
éternellement à sept packs. `completerPacks` ajoute donc les manquants et ne
rafraîchit, sur ceux qui existent, que la **présentation** (nom, promesse,
rayon, garantie annoncée). Le prix et les probabilités restent ceux de la ligue.

### Le calendrier, et les rappels

Un onglet dédié : le prochain match avec la date et l'heure d'ouverture de sa
fenêtre, le compte à rebours, l'agenda des huit prochains rendez-vous du club,
les six prochaines journées de toute la ligue, et les derniers résultats.

Le créateur peut modifier le rythme de **1 à 7 matchs par semaine** depuis le
bureau de la ligue. Le palier 7 correspond à **un match par jour**. Le serveur
reprogramme toutes les affiches futures du championnat et des coupes, mais ne
touche jamais à un résultat ni à un direct déjà lancé. La récupération de
fatigue augmente avec le rythme (22 à 40 points entre deux rencontres) et la
durée réelle des blessures est divisée par la cadence : accélérer une saison ne
condamne donc pas un joueur à manquer artificiellement sept fois plus de matchs.

> ⚠️ **Ce que les rappels sont, et ce qu'ils ne sont pas.** Ce sont des
> notifications de NAVIGATEUR, déclenchées par l'onglet ouvert : une journée qui
> s'ouvre, un match qui commence, le tien qui se termine. Elles ne réveillent
> pas un téléphone éteint — ça demanderait un service worker et un serveur de
> push, qui n'existent pas encore. **L'écran le dit**, plutôt que de laisser
> croire à une alerte qui n'arrivera jamais.
>
> ⚠️ Et ils se décident sur la DIFFÉRENCE entre deux vues, jamais sur l'état
> courant : sans ça, chaque sondage — il y en a un toutes les deux secondes
> pendant un direct — reposterait la même notification.

### La dotation de départ, et le nom de la monnaie

Le créateur choisit ce que chaque club reçoit en arrivant, de **0** (« tout se
gagne ») à **100 000 Ovas**. ⚠️ **Le plafond n'est pas décoratif** : c'est le
seul robinet d'Ovas que le créateur ouvre lui-même. Sans lui, il se donne dix
millions et le marché de la ligue n'existe plus. Une valeur hors bornes est
ramenée dans l'intervalle, pas refusée.

La monnaie s'appelle désormais **Ovas** partout — dans le code (`club.ovas`)
comme à l'écran.

> ⚠️ **Elle porte donc le même nom que la monnaie de la Boutique solo**
> (`joueur.ovas`). C'était justement ce qu'un choix antérieur voulait éviter.
> Le renommage a été demandé explicitement ; l'invariant, lui, ne bouge pas :
> **aucun pont entre les deux, dans aucun sens, jamais.** Elles se distinguent
> désormais par leur porteur — `joueur.ovas` pour la Boutique, `club.ovas` pour
> une ligue — et par rien d'autre. À surveiller lors de tout code qui toucherait
> aux deux.

Et elle a enfin sa **pièce** (`components/PieceOvas.tsx`) plutôt que deux
cercles au trait. ⚠️ Ce n'est pas une icône, et c'est pour ça qu'elle n'est pas
dans `Icone.tsx` : le jeu de pictogrammes suit une règle stricte (grille de 24,
`currentColor`, une épaisseur de trait) qui fait sa cohérence, et qui interdit
précisément la matière dont une pièce a besoin — un métal, une tranche, un
relief, une lumière.

---

## Ce qui reste à faire

### Déployer la base

**Marche à suivre complète : [`MISE-EN-LIGNE.md`](MISE-EN-LIGNE.md).**

En deux lignes : appliquer `schema-vercel.sql`, puis `schema-ligues.sql`, puis
`schema-carriere.sql` — ⚠️ **dans cet ordre**, le dernier ajoutant une colonne à
la table `comptes` créée par le deuxième — et poser `CRON_SECRET` pour l'horloge
(`/api/carriere?horloge=1`), déclarée dans `vercel.json`.

> ⚠️ **L'horloge n'est PAS ce qui fait avancer les matchs.** Une ligue avance à
> chaque LECTURE : dès que quelqu'un ouvre l'écran, les rencontres dont la
> fenêtre s'est fermée se jouent, les Ovas tombent, les enchères se closent. Le
> cron ne sert qu'au cas où personne n'ouvre le jeu pendant des jours. Un
> passage par nuit suffit donc — ce que le plan Hobby de Vercel autorise
> exactement (une exécution par jour).

Mesuré à froid : **1,1 s** de démarrage (774 ms de modules, 357 ms pour bâtir le
catalogue de 78 083 joueurs) et **3,7 Mo** de données embarquées dans la
fonction. Très en dessous des limites de Vercel ; la première ouverture de la
journée paraît un peu lente, ensuite l'instance reste chaude.

### ⚠️ La dette de doublon — neuf modules qui ne servent plus qu'à leur banc

Le premier lot avait posé un socle de règles (`types.ts`, `rarete.ts`,
`identite.ts`, `reglages.ts`, `vivier.ts`, `dotation.ts`, `valeur.ts`,
`packs.ts`, `ova.ts`, `index.ts`) avec son propre banc de 126 contrôles
(`npm run verify:ligue`) et son schéma à 14 tables (`schema-ligues.sql`).

La Carrière en ligne a été construite **à côté**, sur un vivier de 78 000
joueurs réels au lieu d'un stock de 40 cartes par club. Résultat : de ce socle,
**seuls `aleatoire.ts` et `calendrier.ts` sont encore utilisés** (le PRNG et le
tournoi toutes rondes). Les neuf autres compilent, sont mesurés, et ne sont
appelés par personne d'autre que `verifLigue.ts`.

Ce n'est pas neutre : `verify:ligue` affiche 126 contrôles verts sur du code que
le jeu n'exécute jamais, ce qui donne une fausse assurance. **Il faut trancher**
— soit supprimer les neuf modules, leur banc et `schema-ligues.sql`, soit
reprendre ce qu'ils savent faire (le garde-fou anti-cadeau de `valeur.ts` et les
paliers d'enchère sont les deux morceaux qui manqueraient le plus à la Carrière
en ligne). En attendant, ne pas les prendre pour la description du mode.

### Les lots suivants

- **La durée** — vieillissement, progression des jeunes, retraites, récompenses
  individuelles (MVP, meilleur marqueur, XV de la saison), palmarès pluriannuel.
  Les cartes portent déjà `matchs` et `essais` : la matière est là.
- **Le draft** en direct, en ouverture de ligue.
- **Les amis et les notifications** — « ton 10 est blessé pour notre finale ».
- **Google / Apple** : les colonnes existent (`fournisseur`, `sujet_externe`),
  le flux OAuth vient plus tard. Le mot de passe d'abord, il ne dépend de
  personne.

---

## Commandes

```bash
npm run verify:carriere   # 144 contrôles, sans navigateur ni base (~1 min)
npm run verify:ligue      # ⚠️ le socle du premier lot — voir la dette ci-dessus
npm run dev               # /api/carriere tourne sur un fichier JSON local
npm run build             # tsc -b && vite build
```
