# Mettre la Carrière en ligne en production

> Le mode tourne déjà **entièrement en local** : `npm run dev` branche
> `/api/carriere` sur un fichier JSON (`node_modules/.destiny/carriere.json`).
> Ce document ne sert qu'à passer de ce fichier à une vraie base, pour que tes
> potes puissent jouer depuis chez eux.
>
> Il faut compter **vingt minutes**, et il n'y a rien à installer.

---

## Ce qui change entre le local et la production

| | En local (`npm run dev`) | En production (Vercel) |
|---|---|---|
| Le point d'entrée | `vite.config.ts` monte un greffon | `api/carriere.ts`, fonction serverless |
| Le stockage | `serveur/carriereFichier.ts` (un JSON) | `serveur/carriereStockage.ts` (Neon) |
| Les règles | `src/lib/ligue/` | **les mêmes fichiers**, au caractère près |

C'est tout. **Le gestionnaire, la validation, la comparaison de version et
l'idempotence sont partagés** : ce qui marche en local marche déployé, et un
bug de règle se reproduit sans base.

---

## Étape 1 — La base

Si tu as déjà suivi [`VERCEL.md`](VERCEL.md) pour le classement mondial, la base
existe et `DATABASE_URL` est déjà posée : **saute à l'étape 2.**

Sinon, sur [vercel.com](https://vercel.com) → ton projet → onglet **Storage** :

1. **Create Database** → **Neon**, région `Europe (Frankfurt)` pour des joueurs
   en France.
2. **Connect** la base au projet.

Vercel ajoute alors `DATABASE_URL` aux variables d'environnement. C'est la seule
dont la Carrière en ligne a besoin pour fonctionner.

---

## Étape 2 — Les tables, dans cet ordre

### ⚠️ D'abord : SUR QUELLE BASE ?

Un projet Vercel peut avoir **plusieurs bases connectées**, et l'application
n'en lit qu'une seule : celle que désigne la variable `DATABASE_URL`. Créer les
tables dans l'autre est un piège parfait — la console dit « success », et le
site répond quand même *« La base de la Carrière en ligne n'est pas encore
initialisée »*, parce qu'il regarde ailleurs.

**Le test qui tranche, en une requête.** Dans **Storage → la base → Query** :

```sql
select count(*) from classement;
```

- La requête **répond un nombre > 0** → c'est la base historique du jeu, celle
  que `DATABASE_URL` désigne. **C'est là qu'il faut passer les schémas.**
- La requête **échoue** (`relation "classement" does not exist`) → cette base
  n'est pas celle du site. Change de base dans le sélecteur.

Le repère vaut parce que le classement mondial tourne depuis longtemps :
`api/classement.ts` et `api/carriere.ts` lisent **le même**
`process.env.DATABASE_URL`. Là où il y a des scores, il y a la bonne base.

Une fois la bonne base identifiée, **déconnecte les autres du projet** (Storage
→ la base de trop → **Disconnect from project**) : tant qu'elles sont
connectées, un redéploiement peut réécrire `DATABASE_URL` et tout basculer sur
la mauvaise sans prévenir.

### Les fichiers, dans l'ordre

1. [`schema-vercel.sql`](schema-vercel.sql) — le classement mondial. Déjà passé
   si tu as suivi [`VERCEL.md`](VERCEL.md).
2. [`schema-ligues.sql`](schema-ligues.sql) — il crée `comptes` et `sessions`.
3. [`schema-carriere.sql`](schema-carriere.sql) — il **ajoute une colonne à
   `comptes`**, dont l’identité Google, et crée les trois tables du mode.

Pour afficher « Continuer avec Google », crée dans Google Cloud un client OAuth
de type **Application Web**, autorise les origines du site et de développement,
puis ajoute son identifiant aux variables Vercel sous `GOOGLE_CLIENT_ID`. Le
même identifiant sert côté navigateur et à la vérification du billet côté
serveur ; aucun secret Google n’est nécessaire.

> ⚠️ **L'ORDRE N'EST PAS UNE PRÉCAUTION, C'EST UNE DÉPENDANCE.**
> `schema-carriere.sql` commence par `alter table comptes add column …` : passé
> avant `schema-ligues.sql`, il échoue parce que la table `comptes` n'existe pas
> encore. Les trois fichiers sont écrits en `if not exists` — on peut donc les
> rejouer sans rien casser si on s'est trompé.

### Comment les exécuter

⚠️ **Coller un fichier entier dans la console SQL de Vercel ne marche pas.**
Elle répond :

```
cannot insert multiple commands into a prepared statement
```

Ce n'est pas un défaut du fichier : le pilote HTTP de Neon passe par des
*prepared statements*, qui n'acceptent **qu'une instruction à la fois**. Or
`schema-ligues.sql` en contient 31 et `schema-carriere.sql` 6.

**La bonne méthode — depuis ta machine, en une commande.** Récupère la chaîne de
connexion (Storage → la base → **`.env.local`** ou *Connection string*), mets-la
dans un fichier `.env` à la racine du dépôt — il est déjà ignoré par git :

```
DATABASE_URL=postgres://…
```

puis :

```bash
npm run base:appliquer
```

`scripts/appliquerSchema.mjs` fait ce que ferait `psql` : il découpe les deux
fichiers en instructions (en respectant les commentaires et les chaînes) et les
envoie **une par une**, dans l'ordre. Avant d'écrire quoi que ce soit il affiche
l'hôte visé, les tables déjà présentes et le nombre de lignes de `classement` —
le test de la bonne base est donc refait pour toi — puis il demande
confirmation. À la première erreur il s'arrête en montrant l'instruction fautive.

**Les deux solutions de repli**, si tu préfères ne rien lancer en local :

- **La console de Neon** (`console.neon.tech` → ton projet → *SQL Editor*)
  accepte, elle, un script multi-instructions : on peut y coller les fichiers
  entiers. C'est la même base que celle vue depuis Vercel.
- **À la main dans la console Vercel** : exécuter les instructions une par une,
  en coupant à chaque `;` de fin de ligne. 37 copier-coller au total.

Vérifie ensuite que tout est là :

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by 1;
```

Tu dois voir au moins : `carriere_commandes`, `carriere_debits`,
`carriere_ligues`, `classement`, `comptes`, `envois`, `sessions`.

---

## Étape 3 — Le secret de l'horloge

Dans **Settings → Environment Variables**, ajoute :

| Nom | Valeur | Environnements |
|---|---|---|
| `CRON_SECRET` | une longue chaîne aléatoire, gardée pour toi | Production |

Génère-la comme tu veux, par exemple :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

⚠️ **Sans ce secret, le point d'entrée de l'horloge refuse tout le monde** — y
compris Vercel. C'est voulu : `/api/carriere?horloge=1` fait avancer toutes les
ligues actives, et laisser ça ouvert reviendrait à donner à n'importe qui le
pouvoir de jouer les matchs des autres. Vercel envoie automatiquement
`Authorization: Bearer $CRON_SECRET` sur ses appels de cron, et le code vérifie
exactement cet en-tête.

---

## Étape 4 — Déployer

```bash
git push
```

Vercel construit et met en ligne. **Redéploie si tu as ajouté des variables
d'environnement après le dernier déploiement** : elles ne sont lues qu'au
démarrage de la fonction.

`vercel.json` déclare déjà le cron :

```json
{ "crons": [ { "path": "/api/carriere?horloge=1", "schedule": "0 4 * * *" } ] }
```

> ⚠️ **CE CRON N'EST PAS CE QUI FAIT AVANCER LES MATCHS, et c'est important de
> le savoir avant de payer pour un plan.** Une ligue avance à **chaque lecture**
> — dès que quelqu'un ouvre l'écran, `avancerCarriere` joue les rencontres dont
> la fenêtre s'est fermée, verse les Ovas, clôt les enchères. Le cron ne sert
> que si **personne** n'ouvre le jeu pendant des jours : il rattrape le retard
> tout seul. Un passage par nuit suffit donc largement, et c'est exactement ce
> que le plan Hobby autorise (une exécution par jour). Sur un plan Pro, tu peux
> descendre à `0 * * * *` (toutes les heures) si tu veux que les résultats
> tombent sans que personne ne se connecte.

---

## Étape 5 — Vérifier

1. Ouvre `https://ton-domaine/api/carriere` **sans être connecté**.
   Réponse attendue :

   ```json
   {"erreur":"Connectez-vous pour retrouver vos ligues."}
   ```

   ⚠️ Si tu lis `La Carrière en ligne attend la configuration de son serveur.`,
   c'est que `DATABASE_URL` n'est pas visible par la fonction : reconnecte la
   base au projet et **redéploie**.

2. Ouvre `https://ton-domaine/api/carriere?emblemes=1` : tu dois recevoir un gros
   JSON avec `groupes`, `competitions` et `trophees`. C'est le meilleur test de
   bout en bout — il prouve que la fonction démarre et que les données du jeu
   sont bien embarquées.

3. Dans le jeu : **En ligne** → crée un compte → crée une ligue → l'écran doit
   afficher ton club avec ses trente licenciés de Régionale 3.

4. Vérifie l'horloge à la main :

   ```bash
   curl -H "Authorization: Bearer TON_CRON_SECRET" \
     "https://ton-domaine/api/carriere?horloge=1"
   ```

   Réponse attendue : `{"liguesActualisees":0}` (0 tant qu'aucune saison n'est
   lancée). Sans l'en-tête, tu dois recevoir un `401`.

---

## Ce qu'il faut savoir avant d'ouvrir aux copains

**Le démarrage à froid coûte 1,1 seconde.** Mesuré : 774 ms pour charger les
modules, 357 ms pour construire le catalogue de 78 083 joueurs. Ça n'arrive
qu'à la première requête après une période d'inactivité — ensuite l'instance
reste chaude et répond en quelques millisecondes. La première ouverture de la
journée paraîtra donc un peu lente, et c'est normal.

**La fonction embarque 3,7 Mo de données** (les effectifs réels, les amateurs,
les clubs, les trophées). C'est très en dessous de la limite de Vercel, il n'y
a rien à faire.

**Un match en direct sonde toutes les deux secondes.** Deux managers qui
regardent la même rencontre, c'est une lecture par seconde pendant cinq minutes.
Sur le plan Hobby de Vercel c'est confortable pour une ligue entre potes ; si
tu ouvres à dix ligues qui jouent en même temps, surveille le nombre
d'invocations.

**Le relais d'écussons appelle un serveur tiers.** Les 599 logos de Fédérale et
de Régionale passent par `/api/carriere?ecusson=…`, qui va les chercher chez la
FFR. C'est mis en cache une semaine côté navigateur, et seulement pour les
écussons réellement affichés. Si tu vois ces appels peser, le levier est de
télécharger ces 599 logos une bonne fois dans `public/logos/`.

**Rien n'est chiffré côté client, et la base est la vérité.** Les mots de passe
sont hachés en `scrypt` avec un sel par compte ; les jetons de session ne sont
stockés qu'en empreinte SHA-256. Le cookie est `HttpOnly`, `SameSite=Lax`, et
`Secure` dès que la requête arrive en HTTPS.

---

## Si quelque chose ne va pas

| Ce que tu vois | Ce que c'est | Quoi faire |
|---|---|---|
| `La Carrière en ligne attend la configuration de son serveur.` | `DATABASE_URL` absente de la fonction | Storage → Connect Project, puis **redéployer** |
| `relation "comptes" does not exist` | `schema-carriere.sql` passé avant `schema-ligues.sql` | Rejouer les deux dans l'ordre — ils sont en `if not exists` |
| `Le serveur de carrière est indisponible.` | Une erreur qui n'est **pas** une règle du jeu (SQL, réseau) | Regarder les logs de la fonction dans Vercel. ⚠️ Le détail n'est jamais renvoyé au joueur, par choix |
| `401` sur `?horloge=1` avec le bon secret | `CRON_SECRET` posée après le dernier déploiement | Redéployer |
| Les matchs n'avancent pas | Personne n'ouvre le jeu **et** le cron n'a pas encore tourné | Normal. Ouvre l'écran : tout se rattrape à la lecture |

---

## Et après

Le mode est complet côté jeu. Ce qui reste sur la feuille de route vit dans
[`LIGUES.md`](LIGUES.md) : le vieillissement des cartes entre les saisons, les
récompenses individuelles, le draft, et la dette des neuf modules du premier lot
qui ne servent plus qu'à leur propre banc de mesure.
