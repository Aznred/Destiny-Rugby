# Sources du projet

Ce dossier contient uniquement les fichiers bruts utilisés par les générateurs.
Les fichiers réellement servis par le jeu restent dans `public/` et les tables
TypeScript générées dans `src/data/`.

## Organisation

- `data/` : joueurs, classements, clubs régionaux et effectifs amateurs.
- `competitions/ligues/` : lot principal des championnats et sélections.
- `competitions/ligues-complementaires/` : Bundesliga et Currie Cup.
- `logos/clubs/` : écussons des clubs.
- `logos/competitions/` : logos des championnats et coupes.
- `logos/selections/principaux/` : 39 écussons historiques prioritaires.
- `logos/selections/catalogue/` : 101 images contrôlées ; 77 sont reliées au
  jeu et 24 variantes spécialisées (féminines, rugby à 7, anciens logos…) sont
  conservées pour de futurs usages.
- `modeles/originaux/` : modèles 3D historiques bruts.
- `modeles/armoire/` : modèle brut de l’armoire.
- `modeles/trophees/` : modèles bruts rangés par famille.

Le dossier historique `photos_joueurs/` a été supprimé : ses 1 574 fichiers
étaient identiques à ceux de `public/photos/`. Ce dernier est maintenant la
source canonique de `scripts/copierPhotosJoueurs.cjs`.

Les livraisons doivent être validées par leurs scripts avant copie. Une première
copie du lot de sélections était corrompue ; elle a été remplacée par le
catalogue complet contrôlé. `Bok_Logo.svg`, strictement identique au logo de
l’Afrique du Sud déjà présent, a été supprimé.
