# Pub « Et si un objet de 800 km fonçait vers la Terre ? »

Une fausse simulation scientifique de trente secondes, en 9:16, qui devient une publicité pour Destiny Rugby dans ses
cinq dernières secondes : l'« astéroïde » est un ballon de rugby, « quelqu'un a frappé un peu trop fort », et le ballon
géant devient le ballon d'une vraie transformation du jeu.

## Ce qui est livré (`livrables/`)

| Fichier | Contenu |
| --- | --- |
| `DESTINY_RUGBY_CATASTROPHE_FR.mp4` / `_EN.mp4` | Les deux vidéos, 1080 × 1920, 30 images par seconde, son AAC 48 kHz |
| `DESTINY_RUGBY_CATASTROPHE_FR.srt` / `_EN.srt` | Les sous-titres, calés sur la voix |
| `destiny_rugby_voice_fr.wav` / `_en.wav` | La voix ElevenLabs seule (WAV 48 kHz mono) |
| `bande-son-sans-voix-fr.wav` / `-en.wav` | Musique et bruitages sans la voix |
| `apercu-leger/…-leger.mp4` | Copies de 21 Mo, pour la lecture à distance (limite de 30 Mo) — à ne pas publier |

L'image filmée avant encodage (`rendus/image-fr.mp4`, ≈ 260 Mo, presque sans perte) sert d'original si un autre encodage est voulu.

## Comment c'est fait

- **L'animation est de la vraie 3D**, dessinée par three.js dans `pub.html` (scènes dans `scene/`) : la Terre, le ballon,
  la ville, la vague, les tours et le laboratoire sont des maillages animés, pas des images fixes zoomées. Chaque plan est
  une fonction du temps : la page dessine l'instant qu'on lui demande, `filmer.cjs` la photographie image par image
  (Chrome piloté, carte NVIDIA), avec un flou de mouvement calculé sur dix sous-images.
- **Le même ballon du début à la fin** (`scene/ballon.js`) : recouvert d'une croûte de roche dans la scène 1, filmé de
  tout près dans la scène 3 (grain en nid d'abeilles, couture, points de fil), dévoilé dans la scène 4.
- **Le gameplay de la scène 5 est réel** (`gameplay.cjs` → `rushes/`) : une transformation réussie d'un vrai match du
  moteur 3D (`/rn26/index.html?banc=1`, caméras « au bord du terrain » puis « réalisation TV »), une vraie ouverture de
  pack Top 14 et le vrai écran de composition, capturés en français et en anglais. `montage.json` dit quelles images.
- **La voix** vient d'ElevenLabs. Une prise déposée dans `voix/fr.mp3` ou `voix/en.mp3` est transcrite (Scribe) et
  recollée lettre à lettre sur le texte (`aligner.cjs`) : chaque mot a son instant. `chronologie.cjs` en déduit la durée
  de chaque scène et les sous-titres — **le montage se cale sur la voix**, pas l'inverse.
- **La bande-son** (`son.cjs`) est synthétisée : grondements, impacts, vague, débris, montée, cœur qui bat, arrêt de
  bande, musique. Seuls le stade et le pack de la scène 5 sont les sons du jeu (`public/rn26/sons`).

## Un outillage pour plusieurs pubs

Ce dossier porte aussi les outils communs ; une autre pub (`../enquete/`) n'apporte que ses décors, son texte, sa
partition et son montage.

| Commun (ici) | Propre à chaque pub |
| --- | --- |
| `lecteur.js` — chaîne d'image, chronologie, sous-titres, carton final | `pub.js`, `scene/` — les décors et le cadrage du vrai jeu |
| `aligner.cjs`, `chronologie.cjs` — la voix, ses mots, les scènes | `textes.cjs` — les répliques et le plan (`plan.decoupe`, `plan.scene5`) |
| `instruments.cjs` — tous les sons synthétisés et le mixage | `son.cjs` — la partition |
| `filmer.cjs`, `monter.cjs`, `produire.cjs`, `apercu.cjs`, `cdp.cjs` | `montage.json`, `gameplay.cjs` — quelles images du jeu |

La variable `PUB` dit sur quelle pub travaillent les outils communs : `PUB=enquete node trailer/catastrophe/apercu.cjs fr plans`.

## Refaire une vidéo

Le jeu doit tourner en développement (par défaut `http://localhost:5199` — la configuration « destiny-rugby-5199 » de `.claude/launch.json` —, sinon `DESTINY_URL`).

```bash
node trailer/catastrophe/produire.cjs          # les deux langues, de la voix à la vidéo montée
node trailer/catastrophe/produire.cjs en       # une seule
```

- **Changer de voix** : remplacer `voix/fr.mp3` (ou `en.mp3`) puis relancer `produire.cjs`. Le script du texte, avec ses
  balises d'expression, est dans `voix/SCRIPT-ELEVENLABS.md`. Ne pas changer les mots : les sous-titres en dépendent.
  `voix/en-edmund.mp3` est la seconde prise anglaise reçue (voix « Edmund ») : la copier sur `voix/en.mp3` pour l'essayer.
- **Générer la voix par l'API** : `node trailer/catastrophe/voix.cjs fr` (clé `ELEVENLABS_API_KEY` dans `.env.local`).
  Un compte gratuit n'a droit qu'aux voix intégrées par l'API.
- **Regarder un plan** : `node trailer/catastrophe/apercu.cjs fr plans` (une image par plan, `apercus/planche.jpg`) ou
  ouvrir `/trailer/catastrophe/pub.html?langue=fr` dans le navigateur (lecture en boucle).
- **Le texte** des deux langues est dans `textes.cjs` ; le découpage des scènes en plans dans `chronologie.cjs`.

## Limites à connaître

- C'est de la 3D temps réel rendue hors ligne, pas un film d'effets spéciaux : la Terre est procédurale (continents
  tracés à la main, aucune image satellite), les passants et les immeubles sont volontairement simples.
- Les rushes (`rushes/`), les rendus intermédiaires (`rendus/`, `son/`, `apercus/`) et les prises reçues (`voix/recues/`)
  se régénèrent ou se redéposent : inutile de les versionner.
