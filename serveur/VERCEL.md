# Déployer le classement mondial sur Vercel

Guide complet, de zéro à un classement en ligne qui marche. **Compte 20 minutes**
la première fois. Tout est gratuit dans les quotas de départ.

Le jeu est déjà déployé sur Vercel (il utilise `@vercel/analytics`) : on ajoute
juste une **base de données** et une **fonction serveur** au projet existant.

---

## Ce qu'on met en place, en une image

```
   navigateur (le jeu)              Vercel                          Postgres
┌──────────────────────┐   POST   ┌────────────────────────┐      ┌──────────────┐
│ FicheCarriere        │   ───→   │ api/classement.ts      │      │ id, cle      │
│ cle, saisons, note,  │          │ 1. débit (6/h, 40/j)   │  →   │ pseudo, score│
│ matchs, essais,      │          │ 2. verifierFiche()     │      │ la fiche :   │
│ titres, clubs…       │          │ 3. score = RECALCULÉ   │      │ saisons, note│
│                      │   ←───   │ 4. écriture du score   │      │ titres, clubs│
│  ← fiches des autres │          │    ET de la fiche      │      │ maj_le       │
└──────────────────────┘   GET    └────────────────────────┘      └──────────────┘
```

**La base garde le score ET la fiche affichable** (schéma v2). La v1 ne
stockait que `pseudo` + `score` : c’était la contrainte de départ, et elle
interdisait d’afficher le profil des autres joueurs. Depuis, la base conserve
les faits **affichables** — saisons, matchs, essais, sélections, note,
réputation, armoire à trophées et clubs traversés — ceux-là mêmes qui servent
au recalcul du score.

⚠️ **La sécurité ne change pas d’un pouce** : ce qui protège le classement,
c’est que le serveur **RECALCULE** le score au lieu de croire celui qu’on lui
envoie. Stocker davantage n’ouvre aucune brèche — chaque champ est borné par
`verifierFiche()` avant d’arriver en base.

> 📌 **Base déjà en ligne en v1 ?** Il y a un seul `ALTER TABLE` à jouer, une
> fois : voir **[`MIGRATION-FICHES.md`](MIGRATION-FICHES.md)**. Tant qu’il ne
> l’est pas, le serveur le détecte et retombe proprement sur « score seul » —
> rien ne casse, mais les fiches restent vides.

---

## Les fichiers concernés

| Fichier | Rôle |
|---|---|
| `api/classement.ts` | **La fonction serveur.** À la racine du projet, à côté de `src/` — c'est la convention Vercel. `GET` rend le top 100, `POST` reçoit une carrière. |
| `serveur/schema-vercel.sql` | Les deux tables, à coller une fois dans la console SQL. |
| `serveur/MIGRATION-FICHES.md` | **Passer une base v1 en v2** pour afficher armoires, clubs et stats des autres joueurs. |
| `src/lib/classementMondial.ts` | **Le barème, partagé.** La fonction l'importe, elle ne le recopie pas. |
| `src/lib/classementEnLigne.ts` | Le côté navigateur : `envoyerAuClassement()` et `lireClassementMondial()`. |
| `serveur/classement.ts` + `serveur/schema.sql` | L'ancienne version **Supabase**. Gardée pour référence — si tu déploies sur Vercel, tu n'en as pas besoin. |

⚠️ **`api/` n'entre pas dans le bundle du navigateur.** Vite ne part que
d'`index.html` : ce dossier lui est invisible. C'est Vercel qui le ramasse au
déploiement et en fait une fonction serverless.

---

## Étape 1 — Créer la base

1. Ouvre ton projet sur [vercel.com](https://vercel.com) → onglet **Storage**.
2. **Create Database** → **Neon** (le Postgres serverless proposé par Vercel).
   Choisis la région la plus proche de tes joueurs (`Europe (Frankfurt)` par
   défaut pour la France).
3. **Connect** la base au projet Destiny Rugby.

Vercel ajoute alors tout seul la variable **`DATABASE_URL`** aux variables
d'environnement du projet. C'est exactement celle que `api/classement.ts` lit.

> **Autre hébergeur de base ?** N'importe quel Postgres joignable en HTTP
> convient (Neon direct, Supabase, Xata…). Il suffit de mettre sa chaîne de
> connexion dans `DATABASE_URL`. Le code ne dépend de rien d'autre.

---

## Étape 2 — Créer les tables

Dans Vercel → **Storage** → ta base → onglet **Query** (ou le SQL Editor de
Neon), colle **tout** le contenu de [`schema-vercel.sql`](schema-vercel.sql) et
exécute.

Tu dois obtenir deux tables :

- **`classement`** — `id` (clé primaire, PUBLIQUE, renvoyée par le `GET`),
  `cle` (unique, l'identité de l'installation qui envoie, **jamais
  renvoyée**), `pseudo` (un simple libellé : deux joueurs peuvent le partager),
  `score`, `cree_le`, `maj_le`, plus la fiche affichable ;
- **`envois`** — le haché d'appareil et l'horodatage, pour le débit.

Vérifie que ça a pris :

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by 1;
```

⚠️ **Le plafond de la colonne `score` est en dur dans le schéma** (`82500`). Il
vient de `SCORE_MAX` (`src/lib/classementMondial.ts`) : c'est la carrière
théorique maximale du jeu. Si tu retouches un jour `LIMITES`, **remets cette
valeur à jour**, sinon la base refusera des scores que le jeu produit
légitimement. `npx vite-node scripts/verifClassement.ts` affiche la valeur
courante en tête de sa section 5.

---

## Étape 3 — Ajouter le sel des appareils

Le débit repose sur un **haché** de l'IP — jamais l'IP en
clair. Sans sel, ce haché se retrouve par force brute en quelques secondes
(il n'y a que 4 milliards d'IPv4) : le haché ne protégerait plus rien.

Vercel → **Settings** → **Environment Variables** → **Add** :

| Nom | Valeur | Environnements |
|---|---|---|
| `SEL_APPAREIL` | une longue chaîne aléatoire, gardée pour toi | Production, Preview, Development |

Pour en générer une :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠️ **Ne la mets jamais dans le dépôt** et ne la préfixe **pas** par `VITE_` :
tout ce qui commence par `VITE_` est embarqué dans le bundle du navigateur,
donc public.

---

## Étape 4 — Déployer

```bash
git add api serveur src/lib/classementEnLigne.ts package.json
git commit -m "Classement mondial : fonction Vercel + base Postgres"
git push
```

Vercel redéploie tout seul. Dans les logs de build, tu dois voir la fonction
apparaître :

```
Serverless Functions
  api/classement.ts
```

Si elle n'apparaît pas, c'est que le dossier `api/` n'est pas à la racine du
**Root Directory** configuré dans Vercel (Settings → General → Root Directory).
Il doit pointer sur `Destiny Rugby`, le dossier qui contient `package.json`.

---

## Étape 5 — Vérifier

**La lecture**, depuis n'importe où :

```bash
curl https://TON-SITE.vercel.app/api/classement
```

→ `{"classement":[]}` au départ. C'est bon signe : la fonction tourne et la base
répond.

**L'envoi**, depuis le jeu : écran **🏆 Classement** → déplie
**« 🔐 Ma fiche d'envoi »** → bouton **« 🌍 Envoyer ma carrière au classement
mondial »**. Le message qui suit affiche le score **recalculé par le serveur**.

**Le refus**, pour vérifier que la protection est vivante :

```bash
curl -X POST https://TON-SITE.vercel.app/api/classement \
  -H "content-type: application/json" \
  -d '{"v":1,"pseudo":"triche","nom":"X","poste":"demi_melee","nation":"France","ageDebut":18,"age":29,"saisons":12,"note":99,"reputation":100,"matchs":210,"essais":44,"selections":21,"titres":[],"score":999999}'
```

→ `422` avec le motif exact (`note 99 après 12 saison(s) : maximum 99 | score
annoncé 999999, score recalculé …`). **C'est ça, la protection** : le serveur ne
croit pas le score, il le recalcule.

---

## Les erreurs les plus fréquentes

| Symptôme | Cause | Correctif |
|---|---|---|
| `{"erreur":"DATABASE_URL absente…"}` | La base n'est pas connectée au projet, ou le déploiement est antérieur à la connexion | Storage → Connect Project, puis **redéployer** (les variables ne sont lues qu'au démarrage) |
| `404` sur `/api/classement` | `api/` n'est pas sous le Root Directory | Settings → General → Root Directory = `Destiny Rugby` |
| `relation "classement" does not exist` | Étape 2 sautée | Rejouer `schema-vercel.sql` |
| `429` dès le premier envoi | Tu as déjà envoyé dans l'heure (le débit est par appareil) | Attendre, ou monter `PAR_HEURE` dans `api/classement.ts` pour tes essais |
| `new row violates check constraint` | `SCORE_MAX` a changé sans mise à jour du schéma | `alter table classement drop constraint classement_score_check;` puis la recréer avec la bonne valeur |
| Le tableau mondial reste vide dans le jeu | Personne n'a encore envoyé, ou la fonction répond en erreur | `curl` la route, puis regarde Vercel → Logs |

---

## Ce que le serveur ajoute, et qu'aucun code client ne peut faire

Le jeu tourne **entièrement dans le navigateur** : le joueur possède la machine
qui calcule, peut éditer son `localStorage`, modifier le bundle, ou appeler
l'API à la main. Aucun code livré au navigateur ne peut garantir un score.

Ce que la fonction apporte, et qui n'est possible que côté serveur :

1. **Le recalcul.** `verifierFiche()` refuse tout ce qui ne tient pas debout —
   âge et saisons incohérents, 900 matchs en 12 saisons, un trophée qui n'existe
   pas, un même trophée gagné deux fois dans la même saison — puis
   `scoreDeLaFiche()` recalcule. Le score annoncé n'est qu'une **comparaison**.
2. **Le débit.** 6 envois par heure et 40 par jour et par adresse réseau. Cette
   marge accepte les envois automatiques de plusieurs fins de saison dans une
   même session ; un client ne peut pas contourner le quota en modifiant son
   navigateur.
3. **Une ligne par installation** et la conservation du **meilleur** score,
   faites par la base (`on conflict (cle) … where excluded.score >=
   classement.score`) — donc sans course entre deux envois simultanés.
   ⚠️ **Ce n'est plus le PSEUDO qui porte l'unicité**, et c'était un bug :
   « si on a le même pseudo qu'un joueur dans le classement, notre classement
   apparaît pas ». Deux homonymes se partageaient une ligne, et celui qui avait
   le score le plus bas n'écrivait rien du tout — en silence. Voir
   `serveur/MIGRATION-FICHES.md`, étape 2 bis.
4. **La journalisation des refus.** Vercel → Logs : c'est là qu'on voit arriver
   les scripts, et nulle part ailleurs.

⚠️ **Le sceau (`sceller()` dans `classementMondial.ts`) n'est PAS une
protection.** Sa clé vit dans le bundle. Il sert à détecter le geste le plus
courant — ouvrir l'onglet Application, changer `essais: 12` en `essais: 9999`,
recharger. La vraie barrière, c'est l'étape 1 ci-dessus.

---

## Entretien

**Purger la table `envois`** (elle ne sert qu'au débit, deux jours suffisent).
Le plus simple sur Vercel est un cron. Crée `vercel.json` à la racine :

```json
{
  "crons": [{ "path": "/api/purge", "schedule": "0 4 * * *" }]
}
```

…et une petite fonction `api/purge.ts` qui exécute
`delete from envois where envoye_le < now() - interval '2 days'`.
Sans elle, la table grossit lentement — quelques milliers de lignes par an pour
un jeu confidentiel, donc ce n'est pas urgent.

**Changer le barème.** Si tu modifies `scoreDeLaFiche()` ou `LIMITES`, les
anciens scores en base ne sont **pas** recalculables : la base ne garde que le
score, les faits ont été jetés. C'est le prix, assumé, d'une base minimale. En
pratique : vide la table, ou accepte que les anciennes lignes suivent un ancien
barème.

---

## Et si tu préfères Supabase

Le dossier contient aussi `classement.ts` (Edge Function Deno) et `schema.sql`
(avec Row Level Security). La différence tient en une phrase : **sur Supabase, le
navigateur parle directement à la base** avec une clé publique, il faut donc des
politiques RLS pour lui interdire d'écrire. Sur Vercel, la chaîne de connexion
vit dans les variables d'environnement de la fonction : le navigateur n'a
strictement aucun accès à la base. Moins de surface, moins à verrouiller.
