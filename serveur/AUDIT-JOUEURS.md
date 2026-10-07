# Audit des données joueurs — 7 octobre 2026 (Correctif 24, points 16 à 19)

**Rien n'a été migré.** Ce document dit ce que l'audit a trouvé, ce qui a été corrigé dans le code, et ce qui reste à décider.
Le script qui l'a produit ne modifie rien : `npm run audit:joueurs` (voir « Refaire l'audit »).

## Ce qui a été comparé

| Référence | Ce qu'elle vaut |
|---|---|
| Le catalogue tel que le jeu le construisait le **28 septembre** (commit `248c125~1`), le **2 octobre** (`b0135eb`) et le **5 octobre** (`eb9db66~1`), comparé à celui d'aujourd'hui | C'est ce que les ligues contenaient à ces dates : une carte distribuée est une copie du catalogue du moment. |
| Les cartes distribuées dans la base locale du 28 septembre (`node_modules/.destiny/carriere.avant-apercu-codex.json`, 3 ligues, 353 joueurs) | Une vraie base de ligue d'avant les imports. |
| **La base de production** | **Pas lue** : il faut `DATABASE_URL` et ta décision (`--neon`, lecture seule, voir plus bas). |

## Ce que l'audit a trouvé

**Aucun identifiant n'a disparu** (78 084 joueurs le 28 septembre, tous présents aujourd'hui parmi 78 187) et **aucun portrait n'a été perdu dans le catalogue** (aucun joueur « avait un portrait, n'en a plus » ; 18 ont un autre fichier, détouré). Les postes, en revanche, ont beaucoup bougé, pour trois raisons très différentes.

### 1. Les licenciés amateurs : des postes inventés remplacés par des postes réels (36 292 joueurs)

Jusqu'au 30 septembre, l'export FFR ne donnait que des noms : le poste d'un licencié était tiré de son **rang dans la liste de son club**. Depuis l'import du 1ᵉʳ octobre, chaque licencié porte les numéros qu'il a réellement portés (`Anthony GAILLARD|3|8,4,5|1556385` : numéro 8, deuxième ligne en second). 36 292 licenciés ont donc changé de famille de poste — dans la base locale du 28 septembre, 186 joueurs distribués sur 353.

Ce n'est pas une donnée correcte qui a été écrasée : l'ancien poste était arbitraire, le nouveau vient des feuilles de match. **Mais c'est bien ce qu'un manager a vu** : la moitié de son effectif de départ a changé de poste du jour au lendemain. Rien n'est à restaurer ici ; à l'avenir, un import de cette ampleur doit se photographier avant et s'annoncer.

### 2. Des professionnels qui héritaient du poste d'un homonyme amateur (18 joueurs) — corrigé

`profilJoueurFfr(nom, club)` cherchait le joueur dans son club FFR ; quand le club n'était pas une structure FFR (tout le Top 14, la Pro D2, l'étranger), il cherchait **le nom seul dans toute la France amateur**, et s'il n'y trouvait qu'un licencié de ce nom, le professionnel prenait son poste et, à défaut de portrait, sa photo. Arthur Retière (UBB) était devenu deuxième ligne — un Arthur Retière joue deuxième ligne à Clisson ; Clément Vergé (Stade Toulousain), pilier.

Corrigé dans `src/lib/joueursFfr.ts` : un club demandé et inconnu ne rend plus rien. Ces 18 joueurs retrouvent le poste de leur effectif professionnel.

### 3. Des identifiants qui ont changé de titulaire (80 joueurs) — cartes protégées, décision à prendre

L'identifiant d'un joueur est son nom (`reel:arthur thomas`). Deux personnes du même nom n'en font qu'une, et c'est **la mieux notée** qui donne son club, son poste et son portrait. Chaque import de professionnels (Nationale, Championship, MLR, NPC) a donc pu prendre l'identifiant d'un licencié amateur : le 28 septembre `reel:arthur thomas` était un arrière de FC Y Rugby, aujourd'hui c'est un deuxième ligne de Cambridge. 80 identifiants sont dans ce cas (annexe B) — et **1 698 identifiants** sont aujourd'hui portés par des joueurs de plusieurs clubs, dont 301 mêlent un professionnel et un amateur.

Certains sont la même personne montée d'un club amateur vers un effectif professionnel (Benito Masilevu, de Floirac à Rouen) ; d'autres sont deux personnes (Arthur Thomas). Rien dans les données ne permet de trancher automatiquement.

Or une carte déjà distribuée **suivait** le catalogue à chaque ouverture de la ligue (`actualiserCartesCatalogue`) : la carte du licencié devenait le professionnel. Corrigé dans `src/lib/ligue/carriere.ts` :

- une carte d'amateur ne suit plus un professionnel d'un **autre club** (sauf décision du Labo) : elle garde son nom, son poste, son club et son portrait ;
- un portrait ne s'efface plus : un import sans photo laisse celle que la carte portait.

⚠️ Les cartes déjà réécrites dans les ligues ouvertes depuis le 1ᵉʳ octobre le restent : seule la base de production dit lesquelles (`--neon`).

### 4. Dans le même club, le poste a changé (17 professionnels) — à vérifier à l'œil

Pour ces joueurs de Nationale, les numéros FFR de leur propre club contredisent le poste d'avant (annexe A). La source FFR est en général la bonne (ce sont leurs feuilles de match), mais c'est exactement le cas « ne pas considérer la dernière importation comme correcte » : à relire, et à corriger dans le Labo (une fiche du Labo fait autorité sur tout import).

### 5. Portraits

- 0 chemin cassé : les 6 101 portraits du catalogue existent sur le disque.
- 120 portraits servent à **deux identifiants** : un même joueur écrit de deux façons (Adam ABAKAR / Adam ABAKAR ABDOULAYE, Alovisio KOLIVAÏ / KOLIVAI DIT KAUVAETUPU — donc deux cartes pour une personne) ou un portrait attribué au voisin d'alphabet (Aidan CROSS / Aidan ROSS, Aled DAVIES / Alex DAVIES). La liste complète est dans le détail JSON que le script écrit à côté du rapport.

## L'identifiant stable (point 19)

L'identifiant ne dépend déjà ni du club, ni du championnat, ni du fichier image : un transfert garde la carte, son historique et son portrait. Sa faiblesse est l'inverse — il ne dépend QUE du nom, donc il confond les homonymes. `IDENTITES_JOUEURS_MONDIAUX` sait déjà donner un identifiant distinct à un homonyme déclaré (`nom|club`) ; il n'est rempli que pour les imports MLR, Championship et NPC.

**Proposition, non appliquée (elle change des identifiants, donc des tirages de packs) :** figer un registre « identifiant → club du titulaire au 28 septembre » à partir de la photographie, et donner un identifiant distinct à tout nouveau venu du même nom dans un autre club tant que l'ancien titulaire figure encore dans les sources. Le script fournit la liste ; la décision de l'appliquer te revient.

## Refaire l'audit

```bash
npm run audit:joueurs -- --exporter=photo.json                     # photographier le catalogue (à faire AVANT un import)
npm run audit:joueurs -- --reference=photo.json --rapport=audit.md  # comparer une photographie au catalogue courant
npm run audit:joueurs -- --ligues=node_modules/.destiny/carriere.json
npm run audit:joueurs -- --neon --rapport=audit-production.md       # la base de production, en lecture seule
```

`--neon` lit `DATABASE_URL` et ne rapatrie que sept champs par carte, regroupés par variante dans Postgres (quelques Mo, une fois — pas les états de ligue). Il montre les joueurs qui existent **sous plusieurs formes d'une ligue à l'autre** : c'est la trace exacte de ce qu'un import a réécrit dans les ligues actives et pas dans les dormantes.

## Annexe A — même club, autre famille de poste (17)

| Joueur | Club le 28/09 | Poste le 28/09 | Club aujourd'hui | Poste aujourd'hui |
|---|---|---|---|---|
| Adrien MALLET | CS Bourgoin-Jallieu | demi_melee | CS Bourgoin-Jallieu | pilier_gauche |
| Alexandre PEREZ | US Carcassonnaise | talonneur | US Carcassonnaise | demi_ouverture |
| Amona ARTAUD | RC Massy Essonne | arriere | RC Massy Essonne | ailier_gauche |
| Andrei MAHU | RC Massy Essonne | demi_ouverture | RC Massy Essonne | deuxieme_ligne_d |
| Dany ANTUNÈS | Olympique Marcquois Rugby | arriere | Olympique Marcquois Rugby | demi_melee |
| Dimitri DOUCET | US Bressane | deuxieme_centre | US Bressane | ailier_gauche |
| Gauthier LELONG | Rouen Normandie Rugby | pilier_gauche | Rouen Normandie Rugby | premier_centre |
| Guillaume CAZETTE | Rennes Étudiants Club | demi_melee | Rennes Étudiants Club | numero_8 |
| Joeli MATALAWERU | CA Périgourdin | numero_8 | CA Périgourdin | deuxieme_ligne_g |
| Lassana CAMARA | Rennes Étudiants Club | talonneur | Rennes Étudiants Club | troisieme_aile_d |
| Manolo LAFFOND | Rouen Normandie Rugby | troisieme_aile_g | Rouen Normandie Rugby | deuxieme_ligne_g |
| Martin BONNET | SO Chambérien Rugby | troisieme_aile_g | SO Chambérien Rugby | ailier_gauche |
| Martin CARRÉ | RC Massy Essonne | arriere | RC Massy Essonne | ailier_gauche |
| Oumar MANE | RC Suresnes Hauts-de-Seine | deuxieme_ligne_g | RC Suresnes Hauts-de-Seine | pilier_gauche |
| Thibault MOLÉANA | Olympique Marcquois Rugby | deuxieme_centre | Olympique Marcquois Rugby | ailier_droit |
| Victor PISANO | SC Albi | demi_ouverture | SC Albi | premier_centre |
| Wian VOSLOO | RC Suresnes Hauts-de-Seine | troisieme_aile_d | RC Suresnes Hauts-de-Seine | deuxieme_ligne_g |

## Annexe B — l'identifiant a changé de titulaire (80)

| Joueur | Club le 28/09 | Poste le 28/09 | Club aujourd'hui | Poste aujourd'hui |
|---|---|---|---|---|
| Adrian FUGIT | CS Annonay | arriere | CS Bourgoin-Jallieu | ailier_droit |
| Alex PREIRA | R C Versailles | demi_ouverture | RC Massy Essonne | ailier_gauche |
| Alexandre FAU | R C Gueretois Creuse | premier_centre | Rennes Étudiants Club | talonneur |
| Alexis BOUTON | CS Vienne Rugby | pilier_gauche | Stade Niçois | ailier_gauche |
| Alexis FRANCOIS | Rugby Club du Louhannais | demi_ouverture | Rennes Étudiants Club | premier_centre |
| Andrew QUATTRIN | US Carcassonnaise | pilier_gauche | New England Free Jacks | talonneur |
| Antonin CHEVALLIER | R C Versailles | talonneur | RC Suresnes Hauts-de-Seine | arriere |
| Arthur THOMAS | FC Y Rugby | arriere | Cambridge | deuxieme_ligne_d |
| Baptiste CHALMANDRIER | Rugby Club de Courbevoie | demi_melee | RC Suresnes Hauts-de-Seine | ailier_droit |
| Benito MASILEVU | CM Floirac | talonneur | Rouen Normandie Rugby | ailier_gauche |
| Cedric YONKEU | Beauvais XV R C | ailier_gauche | Olympique Marcquois Rugby | troisieme_aile_g |
| Charif MANSOUR | Union Drancy Saint-Denis 93 | troisieme_aile_g | RC Massy Essonne | pilier_droit |
| Christopher BOSCH | R OL Grasse | arriere | CS Bourgoin-Jallieu | deuxieme_centre |
| Clement DOUMENC | US Carcassonnaise | demi_ouverture | AS Béziers Hérault | troisieme_aile_g |
| Clement JULLIEN | Stade Olympique Voiron | deuxieme_centre | US Bressane | talonneur |
| Clement UNIQUE | R C Roubaix | deuxieme_centre | Olympique Marcquois Rugby | ailier_gauche |
| Corentin ASTIER | U S Issoirienne | demi_melee | SO Chambérien Rugby | deuxieme_ligne_d |
| Corentin ROUGIER | R C Vichy | arriere | RC Suresnes Hauts-de-Seine | troisieme_aile_d |
| Cyril COUTURIER | US Salles | deuxieme_ligne_g | CA Périgourdin | premier_centre |
| Davit MTCHEDLIDZE | SC Albi | deuxieme_ligne_g | RC Toulon | pilier_droit |
| Dimitri CHAUVET | RC Tricastin | deuxieme_ligne_d | SC Albi | talonneur |
| Dino CASADEI | US Carcassonnaise | talonneur | US Dax | pilier_gauche |
| Dylan NOCETE | U S Montmelianaise | troisieme_aile_g | Olympique Marcquois Rugby | demi_melee |
| Eliot NAZET | Stade Nantais | deuxieme_ligne_d | Olympique Marcquois Rugby | talonneur |
| Esteban TALALUA | Sor Agout XV | ailier_gauche | SC Albi | pilier_droit |
| Florent CAMPEGGIA | AS Mâconnaise | demi_ouverture | Rouen Normandie Rugby | demi_melee |
| Gabriel LANTE | Anglet Olympique | deuxieme_centre | Rennes Étudiants Club | pilier_droit |
| Gilen QUEHEILLE | SA Mauléonais | arriere | SC Albi | demi_melee |
| Guillaume BOUCHE | Saint-Jean-de-Luz Olympique | deuxieme_centre | SO Chambérien Rugby | ailier_gauche |
| Henry TUILAGI | RC Nîmois | troisieme_aile_g | CA Périgourdin | premier_centre |
| Hugo DESGRANGE | Stade Nantais | pilier_droit | CS Bourgoin-Jallieu | ailier_gauche |
| Hugo DETRE | Union Drancy Saint-Denis 93 | troisieme_aile_g | Olympique Marcquois Rugby | premier_centre |
| Hugo LOPES | S C Mazamet | demi_melee | RC Massy Essonne | numero_8 |
| Johann GRUNDLINGH | Peyrehorade Sports Rugby | premier_centre | Rennes Étudiants Club | troisieme_aile_g |
| Jules EVEN | Stade Montois | demi_ouverture | Biarritz Olympique | premier_centre |
| Julien RUAUD | Servette RC de Genève | arriere | Rouen Normandie Rugby | troisieme_aile_d |
| Kalivati TAWAKE | Saint-Jean-de-Luz Olympique | troisieme_aile_g | CA Périgourdin | pilier_droit |
| Kamil BOUREGBA | CS Annonay | demi_melee | CS Bourgoin-Jallieu | troisieme_aile_d |
| Kevin CHAUDOUARD | Stade Olympique Voiron | demi_melee | CS Bourgoin-Jallieu | troisieme_aile_g |
| Kevin FABIEN | Rouen Normandie Rugby | demi_melee | CA Brive | deuxieme_centre |
| Lohan SABBIA | RC Suresnes Hauts-de-Seine | demi_melee | RC Toulon | demi_ouverture |
| Loic BARADEL | RC Savoie Rumilly | premier_centre | US Bressane | troisieme_aile_g |
| Loris TOLOT | Club Ovalie Pont du Casse | troisieme_aile_g | SU Agen | ailier_gauche |
| Louis CHANET | RC Orléans | premier_centre | Valence Romans Drôme Rugby | pilier_gauche |
| Louis DECAVEL | Cahors Rugby St Cadurcien | demi_melee | Olympique Marcquois Rugby | deuxieme_centre |
| Lucas DYCKE | Sporting Club Leucate Corbieres Mediterranee XV | deuxieme_ligne_g | CS Bourgoin-Jallieu | pilier_droit |
| Lucas OLLION | Servette RC de Genève | deuxieme_centre | Rennes Étudiants Club | demi_melee |
| Maewen SAO | U S Montmelianaise | arriere | SO Chambérien Rugby | deuxieme_centre |
| Matheo BESIN | US Salles | troisieme_aile_g | RC Suresnes Hauts-de-Seine | demi_ouverture |
| Matiss FOVET | Racing Club St Cernin | ailier_gauche | Stade Aurillacois | premier_centre |
| Maxime CALLIET | Rugby Club de Courbevoie | demi_melee | RC Suresnes Hauts-de-Seine | pilier_gauche |
| Mosa Ati MOALA | CS Vienne Rugby | pilier_gauche | Stade Aurillacois | deuxieme_ligne_d |
| Mosese MAWALU | Stade Olympique Voiron | pilier_gauche | Valence Romans Drôme Rugby | ailier_gauche |
| Nacani WAKAYA | Pedale Stade Tarusate | pilier_gauche | Stade Montois | deuxieme_centre |
| Nasoni NAQIRI | S C Mazamet | talonneur | SC Albi | deuxieme_centre |
| Nikita BEKOV | US Tyrosse | pilier_gauche | RC Suresnes Hauts-de-Seine | deuxieme_ligne_g |
| Noureddine AGSIB | Union Drancy Saint-Denis 93 | pilier_droit | RC Suresnes Hauts-de-Seine | troisieme_aile_g |
| Owen TUUGAHALA | XV Corsaire Saint Malo Rugby | demi_melee | Rennes Étudiants Club | troisieme_aile_d |
| Paulo TAFILI | Stade Montois | deuxieme_centre | US Oyonnax | pilier_droit |
| Quentin LALARME | Union Barbezieux Jonzac | pilier_gauche | Rennes Étudiants Club | demi_ouverture |
| Rachid BINA | Beauvais XV R C | demi_melee | Olympique Marcquois Rugby | troisieme_aile_d |
| Raphael VIEILLEDENT | TOEC TOAC FCT Rugby | demi_melee | CA Périgourdin | deuxieme_ligne_d |
| Rayan AMARA | RC Tricastin | talonneur | Rennes Étudiants Club | pilier_gauche |
| Robin GASCOU | CM Floirac | ailier_gauche | CS Bourgoin-Jallieu | deuxieme_ligne_d |
| Romain FAVARETTO | R C Versailles | demi_ouverture | CS Bourgoin-Jallieu | pilier_droit |
| Romain URUTY | SC Albi | deuxieme_ligne_d | AS Béziers Hérault | demi_ouverture |
| Sam SPRING | CA Périgourdin | arriere | Biarritz Olympique | deuxieme_centre |
| Senio TOLEAFOA | Stade Olympique Voiron | pilier_droit | SO Chambérien Rugby | deuxieme_ligne_g |
| Simon COWLEY | A S Monaco | talonneur | RC Massy Essonne | numero_8 |
| Tavite VEREDAMU | RC Nîmois | troisieme_aile_g | USA Perpignan | ailier_droit |
| Thibault CLAUZADE | Rugby Club Auch | arriere | RC Narbonne | troisieme_aile_d |
| Thibault DULUCQ | Saint-Jean-de-Luz Olympique | demi_ouverture | CA Périgourdin | demi_melee |
| Thomas DUCHENE | U S Issoirienne | deuxieme_centre | RC Vannes | pilier_droit |
| Thomas SIMONET | US Tyrosse | arriere | Olympique Marcquois Rugby | troisieme_aile_g |
| Thomas VIDAL | S C Mazamet | demi_melee | CA Périgourdin | pilier_droit |
| Timeo LABAT | Rennes Étudiants Club | pilier_droit | AS Béziers Hérault | arriere |
| Tom DARGELOS | Stade Langonnais | deuxieme_ligne_g | Stade Montois | troisieme_aile_g |
| Tom RAFFY | CA Périgourdin | pilier_gauche | CA Brive | demi_ouverture |
| Yohan FOURNIER | RC Aubenas Vals | troisieme_aile_g | RC Suresnes Hauts-de-Seine | ailier_gauche |
| Yvan DAVID | SO Chambérien Rugby | arriere | Oyonnax Rugby | demi_melee |
