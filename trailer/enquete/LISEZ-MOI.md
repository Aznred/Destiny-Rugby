# Pub « L'homme qui a disparu devant 80 000 témoins »

Un faux documentaire criminel de trente secondes, en 9:16. Un homme disparaît d'une image de vidéosurveillance, quinze
suspects n'ont pas su l'arrêter, les enquêteurs ne retrouvent qu'une arme : « un crochet ». La chute : la caméra dézoome,
c'est un stade, et l'on revoit l'action — « c'était juste Antoine Dupont » (en anglais : « he sold them a dummy… that's
just Cheslin Kolbe »).

## Ce qui est livré (`livrables/`)

| Fichier | Contenu |
| --- | --- |
| `DESTINY_RUGBY_DISPARITION_FR.mp4` / `_EN.mp4` | Les deux vidéos, 1080 × 1920, 30 images par seconde, son AAC 48 kHz |
| `DESTINY_RUGBY_DISPARITION_FR.srt` / `_EN.srt` | Les sous-titres, calés sur la voix |
| `destiny_rugby_voice_fr.wav` / `_en.wav` | La voix ElevenLabs seule (WAV 48 kHz mono) |
| `bande-son-sans-voix-fr.wav` / `-en.wav` | Musique et bruitages sans la voix |

## Comment c'est fait

L'outillage est celui de la première pub (`../catastrophe/` : lecteur, alignement de la voix, chronologie, mixage, tournage
image par image, montage — voir son `LISEZ-MOI.md`). Ce dossier n'apporte que ce qui est propre à celle-ci :

- **`scene/enquete.js`** — quatre décors en vraie 3D : la salle des écrans (la silhouette s'efface à l'instant où la voix dit
  « disparu »), l'alignement des quinze suspects (numérotés de 1 à 15 et bâtis comme une équipe), le tableau d'indices (un
  terrain de 100 m sur 70, quinze croix, un trajet en zigzag), la pelouse de la police scientifique (cavaliers numérotés,
  trois contours à la craie, des traces de crampons qui passent entre eux).
- **`gameplay.cjs`** — la chute est du vrai jeu. Le script joue de vrais matchs du moteur 3D (`/rn26/index.html?banc=1`)
  jusqu'à trouver un essai du joueur voulu, puis rejoue le même match et le photographie. On ne fait que donner aux quinze
  joueurs les noms de la feuille de match et, à la vedette, des appuis et une vitesse à la mesure de sa carte (l'aperçu
  donne les mêmes notes à tout le monde) ; pour Kolbe, l'équipe reçoit en plus la consigne de jouer au large.
  Rien n'est écrit d'avance : `montage.json` garde la graine du match et l'image de l'essai.
- **L'étiquette du porteur** (« DUPONT », « KOLBE »), que le jeu affiche trois secondes sous le joueur qui reçoit le
  ballon, est masquée au tournage (`SANS_NOM=1`) : elle donnerait le nom avant la voix. Le nom arrive par la voix, puis
  par la carte du pack qui suit.
- **`son.cjs`** — la partition : nappe grave, horloge, ronflement des écrans, obturateurs, cœur, bande qui cale, puis le
  stade (sons du jeu) et la musique de la chute.
- **`plateau.tsx`** — la vraie ouverture d'un pack Springboks, pour la version anglaise (Kolbe en meilleure carte).

## Refaire une vidéo

Le jeu doit tourner en développement (`http://localhost:5199`, configuration « destiny-rugby-5199 » de `.claude/launch.json`).

```bash
node trailer/enquete/produire.cjs          # les deux langues
node trailer/enquete/produire.cjs en       # une seule
```

Changer de voix : remplacer `voix/fr.mp3` ou `voix/en.mp3`, puis relancer. Le texte est dans `textes.cjs` ; ne pas
changer les mots sans changer la voix : les sous-titres en dépendent.
