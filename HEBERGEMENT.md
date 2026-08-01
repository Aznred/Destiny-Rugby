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

## 3. La clé Groq

⚠️ **Ne mets pas la clé dans le dépôt.** Dans Vercel :
**Settings → Environment Variables**, ajoute :

- **Name** : `VITE_GROQ_KEY`
- **Value** : ta clé Groq
- **Environments** : Production, Preview, Development

Puis redéploie (**Deployments → … → Redeploy**).

⚠️ **À savoir** : une variable `VITE_*` est embarquée dans le JavaScript envoyé
au navigateur. **N'importe quel visiteur peut la lire** et consommer ton quota.
Trois options :

- **laisser vide** : chaque joueur saisit sa propre clé dans ⚙️ (le jeu reste
  entièrement jouable sans clé) ;
- **mettre la tienne** en acceptant le risque, sur un site peu diffusé ;
- **passer par un proxy** (une Vercel Function qui garde la clé côté serveur et
  applique un quota) — c'est la seule solution propre pour un site public, et
  elle reste à écrire.

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
- **Aucune donnée n'est envoyée nulle part**, sauf les appels à Groq (le MJ et
  L'Ovale), à Wikimedia Commons (les images des posts) et à randomuser.me (les
  avatars génériques).
