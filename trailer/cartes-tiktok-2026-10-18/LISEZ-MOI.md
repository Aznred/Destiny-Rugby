# Ta carte existe peut-être déjà

Deux publicités TikTok / Reels de **25 secondes**, **1080 × 1920**, **60 images/s**.
Les exports comprennent une composition musicale originale, les bruitages du jeu et des sous-titres animés.
**Aucune voix off n'est intégrée**, conformément au choix de préparer les vidéos et les pistes à doubler.

- `Destiny-Rugby-Ta-Carte-FR-25s.mp4` : version française.
- `Destiny-Rugby-Ta-Carte-EN-25s.mp4` : version anglaise.
- `Voix-fr-a-doubler.txt` et `Voix-en-a-doubler.txt` : textes demandés, découpés par séquence.
- `Reperes-voix-*.csv` : points d'entrée et de sortie pour le doublage. Le hook demande une diction rapide.
- `Sous-titres-*.srt` : texte et repères correspondants. Ces repères sont un calage de montage ; sans voix enregistrée, ils ne constituent pas un alignement vocal mesuré.
- `Musique-et-effets-25s.wav` : bande-son des vidéos.
- `Fond-pour-doublage-25s.wav` : même bande-son à niveau réduit pour ajouter la voix.
- `Apercu-*.jpg`, `Plans-*.jpg` : couvertures et vues du montage.
- `montage.json` : structure commune et caractéristiques de l'export.

## Ce qui est montré

Les cartes sont celles de `CarteJoueurEnLigne`, avec les vraies notes, portraits, clubs et blasons du catalogue du jeu.
La version française montre Antoine Dupont, Gabrielle Vernier, Adrian Mitu,
Aboubacar Yamba et Anthony Rodrigues. La version anglaise montre Marcus Smith, Ellie Kildunne,
Ben Murphy, Aaron Wainwright et Anthony Rodrigues. Les rendus supplémentaires de Thomas Ramos et Cheslin Kolbe
restent dans les sources pour une autre coupe du montage.
Le profil de Régionale 3 présenté dans la version anglaise appartient à un club français ; aucune division amateur anglaise n'est inventée.

Les pochettes utilisent les vrais GLB Top 14 et Premiership. Le terrain, les joueurs et l'animation d'essai
sont capturés dans le banc 3D du jeu. L'accueil en ligne est conservé dans `sources/site-en-ligne.png`.

Le chemin de correction emploie les composants réels `Nav`, `Reglages`, `DemandesCartes`,
`CompleteTaCarte` et `FormulaireCarteNormale`, en lecture locale avec le catalogue réel.
Les réponses des listes sont simulées afin de ne créer ni compte ni demande. Tout POST est refusé par le plateau.
Le formulaire conserve les libellés français présents dans le jeu, y compris dans la publicité anglaise.
L'habillage anglais autour des captures traduit les explications, sans remplacer les boutons du jeu.
Les deux montages précisent que les propositions sont **soumises à vérification avant publication**.

## Refaire les exports

Lancer l'aperçu du projet sur `127.0.0.1:5188`, puis :

```text
node scripts/creerPublicitesCartes.cjs --capturer
node scripts/creerPublicitesCartes.cjs --monter
node scripts/verifierPublicitesCartes.cjs
```

`--capturer --parcours` ne reprend que les cartes et les formulaires. Les captures utiles et petits clips sources
sont conservés pour réexporter ; les images intermédiaires, polices de travail et profils Chromium sont temporaires,
puis supprimés dans un `finally`. Aucun secret ni clé API n'est livré. Aucun crédit ElevenLabs n'a été consommé.
