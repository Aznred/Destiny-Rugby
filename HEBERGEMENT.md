# Héberger Destiny Rugby sur Vercel

Le jeu est un site **statique** (Vite + React) : pas de serveur, pas de base de
données, tout vit dans le navigateur. Vercel est donc adapté et gratuit.

## 1. Mettre le projet sur GitHub

Le dossier n'est pas encore un dépôt Git. Dans le dossier du projet :

```bash
git init && git add -A && git commit -m "Destiny Rugby"
```

Crée ensuite un dépôt **privé** sur github.com, puis :

```bash
git remote add origin https://github.com/TON-COMPTE/destiny-rugby.git && git push -u origin main
```

## 2. Importer dans Vercel

1. Va sur **vercel.com**, connecte-toi avec GitHub.
2. **Add New… → Project**, choisis le dépôt.
3. Vercel détecte Vite tout seul. Vérifie simplement :
   - **Framework Preset** : `Vite`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. **Deploy**. Au bout d'une minute tu as une URL en `.vercel.app`.

Chaque `git push` redéploie automatiquement.

## 3. L'IA locale

Aucune clé ni variable d'environnement n'est nécessaire. Sur un appareil
compatible, WebLLM commence automatiquement à télécharger le modèle quantifié
en arrière-plan après l'ouverture du jeu, puis le conserve dans le cache du
navigateur. **⚙️ Réglages** permet de le désactiver ou de l'effacer. Les générations sont
effectuées sur son appareil avec WebGPU, dans un Worker.

Le modèle ne fait donc pas partie du déploiement Vercel. Prévoir environ 900 Mo
au premier téléchargement. Si le navigateur ou la carte graphique est
incompatible, le jeu utilise automatiquement ses scènes et réponses pré-écrites.

## 4. Points d'attention pour ce projet

- **`public/photos/` pèse 117 Mo** (1 574 portraits). C'est sous la limite de
  Vercel mais ça allonge le déploiement. Si ça coince, deux options : réduire
  les images, ou ne garder que le Top 14.
- **Les modèles 3D et les logos** (`public/m3d/`, `public/logos/`) partent avec
  le reste, rien à faire.
- **Le décodeur Draco** des `.glb` est chargé depuis un CDN Google : il faut une
  connexion pour la cérémonie de trophée. Le reste du jeu fonctionne hors ligne.
- **Les sauvegardes sont locales** (localStorage) : elles restent sur le
  navigateur de chaque joueur, elles ne sont pas partagées et ne survivent pas à
  un changement d'appareil.
- **Les textes confiés à l'IA restent sur l'appareil.** Les seules ressources
  externes sont les poids publics du modèle au premier chargement, Wikimedia
  Commons pour certaines images et randomuser.me pour les avatars génériques.
