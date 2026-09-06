# Ouverture des packs de ligue

L’animation présente exclusivement les cartes renvoyées par le serveur. Elle démarre en bronze, monte d’un seul palier à chaque clic sur le modèle jusqu’au maximum réellement obtenu, puis s’ouvre au clic suivant, puis révèle les cartes par rareté et note croissantes. La rareté technique `star` porte le nom visible « Mythique » et la couleur rouge.

- Modèles : `public/m3d/packs/`, environ 20 000 triangles par modèle et textures JPEG 1K. Les fichiers originaux dans `../pack/` restent intacts.
- Le fichier original « pack  mythique ouvert.glb » est identique au bronze fermé. Sa version optimisée utilise la géométrie bronze ouverte avec une finition rouge.
- Chaque montée dure 1,1 seconde : rotation de préparation (440 ms), changement de modèle, retour avec rebond et onde lumineuse (660 ms). Les transformations restent dans la scène 3D pour préserver le centrage du Canvas.
- Les effets audio sont synthétisés localement après interaction : rouleaux mécaniques, clochettes métalliques, carillon majeur et pluie de pièces. Un compresseur limite les crêtes et un écho stéréo léger donne du relief. La touche M permet de les couper. Les préférences de mouvement réduit sont respectées.
- La fenêtre reprend les couleurs du thème et les panneaux du jeu. Seul le pack est cliquable avant la révélation ; aucun bouton extérieur ne pilote la progression.
- Échap passe à toutes les cartes, puis ferme le résultat ; Tab reste dans la fenêtre. Une panne WebGL ou un modèle indisponible ne bloque pas l’accès aux cartes.
- Les achats rapprochés sont verrouillés pendant la requête. Les nouvelles transactions sont identifiées par leur identifiant et filtrées sur le club du joueur.

## Aperçu local

Démarrer Vite, puis ouvrir `/scripts/apercuPacks.html`. Les paramètres `rang=0` à `rang=4` et `cartes=1` à `cartes=8` permettent d’essayer les différents cas. Cet aperçu utilise des données fictives, ne contacte pas le serveur de ligue et n’est pas inclus dans le build de production.

## Vérification

Avec Vite sur le port 5173 :

```sh
node scripts/verifierOuverturePacks.cjs <chemin-du-module-playwright> [chemin-du-navigateur]
```

Vérifie chaque rareté finale, le départ bronze, l’absence de cartes révélées avant l’ouverture, le son, la révélation complète, Échap, le focus, huit cartes sur mobile et une ouverture sans modèles disponibles.

Pour régénérer les modèles depuis les originaux :

```sh
node scripts/optimiserPacks.mjs <chemin-du-module-sharp>
```


## Cartes et Collection

Le composant `CarteJoueurEnLigne` dessine un cadre SVG en écusson avec une palette unique par rareté, partagé par l’effectif, les packs, le marché et la Collection. Il utilise les portraits disponibles et un pictogramme de remplacement en cas de photo absente.

L’onglet Collection interroge `GET /api/carriere?ligue=…&collection=1`, réservé aux membres de la ligue. Il renvoie 24 joueurs par page, avec recherche, rareté, poste, disponibilité, club propriétaire et tri. Le catalogue ne part pas dans les sondages ordinaires de la ligue.

« Packé par » provient de la première transaction d’attribution, indépendamment du propriétaire actuel. Les dotations initiales et les origines inconnues sont indiquées séparément. Les données privées des comptes et les montants des transactions ne sont pas renvoyés.

Vérification du catalogue, des filtres, des transferts et des permissions : `npm run verify:collection`.

## Boutique et composition

La boutique utilise un carrousel tactile avec flèches, clavier et sélection directe. La garantie du pack détermine sa couleur en boutique et au début de l’ouverture, bornée par la meilleure récompense réelle. Aucun faux pack n’est affiché pendant le chargement 3D. Les cartes utilisent deux faces et un retournement CSS avec prise en charge des animations réduites.

Le portrait de repli est `/photos/alexandre_langlois.webp`. Le banc et les réserves sont limités à 104 px. Le bouton « Assembler la meilleure équipe » calcule une affectation globale des 23 places par note et adéquation au poste, avec priorité au XV, exclusion des blessés et première ligne spécialisée. La feuille obtenue peut être ajustée puis enregistrée. `scripts/verifierMeilleureComposition.ts` couvre les contraintes et les rôles.

### Présentoir circulaire 3D

La boutique utilise désormais `BoutiquePacks3D` : une seule scène WebGL, sept modèles visibles au maximum, catalogue parcouru en boucle, rotation douce et glissement horizontal. Le double-clic (ou deux pressions sur Entrée) achète le pack visé après une courte animation. Un glissement annule le clic et un verrou empêche les achats multiples. Les prix et probabilités restent visibles ; les garanties déterminent toujours la couleur. Aperçu local sans dépense : `scripts/apercuBoutiquePacks.html`. Vérification : `node scripts/verifierBoutiquePacks.cjs <module playwright> <exécutable Chrome>`.
