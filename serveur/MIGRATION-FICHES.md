# Afficher les fiches dans le classement mondial — migration de la base

**Objectif :** qu'en touchant une ligne du classement mondial, on voie la fiche
de l'autre joueur — son **armoire à trophées**, ses **clubs traversés**, ses
**stats** (matchs, essais, sélections, réputation, note) et son **nombre de
saisons**.

---

## ⚠️ À lire avant de commencer : le code est déjà prêt

**Il n'y a rien à programmer.** Tout le chemin existe déjà et est déployé :

| Étage | Fichier | État |
|---|---|---|
| Le jeu construit la fiche | `src/lib/classementMondial.ts` → `FicheCarriere` | ✅ porte `titres`, `clubs`, `saisons`, `matchs`, `essais`, `selections`, `note`, `reputation`, `age`, `poste`, `nation` |
| Le navigateur l'envoie | `src/lib/classementEnLigne.ts` | ✅ |
| Le serveur la vérifie, recalcule le score et l'écrit | `api/classement.ts` | ✅ |
| Le serveur la relit | `api/classement.ts` (`GET`) | ✅ |
| L'écran l'affiche | `src/screens/Classement.tsx` → `PanneauFiche` | ✅ armoire, clubs avec écussons, pastilles de stats |

**Ce qui manque est UNIQUEMENT dans la base de données en ligne** : les colonnes
n'y existent pas encore. Le serveur le détecte (code Postgres `42703`), retombe
sur « score seul » et continue à fonctionner — c'est pour ça que rien n'a l'air
cassé, et c'est aussi pour ça que rien ne s'affiche.

> **En une phrase :** il y a **deux blocs SQL à jouer**, une fois chacun :
> celui de l'**étape 2** (les fiches affichables) et celui de l'**étape 2 bis**
> (une ligne par joueur, plus par pseudo). Ils sont indépendants ; jouer les
> deux d'affilée est le cas normal.

---

## Étape 1 — Savoir où tu en es

### La méthode rapide (aucun outil)

Ouvre dans un navigateur :

```
https://TON-SITE.vercel.app/api/classement
```

Regarde la première ligne du JSON :

- tu vois `"nom"`, `"titres"`, `"clubs"` → **la base est déjà en v2**, tu n'as
  rien à faire, saute à l'[étape 4](#étape-4--vérifier-en-jeu) ;
- tu ne vois que `"pseudo"`, `"score"`, `"maj_le"` → **la base est en v1**,
  continue.

### La méthode sûre (console SQL)

Vercel → ton projet → **Storage** → ta base → **Query** (ou le SQL Editor de
Neon). Colle :

```sql
select column_name
from information_schema.columns
where table_name = 'classement'
order by ordinal_position;
```

Si tu ne vois que `pseudo`, `score`, `cree_le`, `maj_le` → tu es en v1.

### Au passage : les logs le disent aussi

Vercel → **Logs** → filtre `classement`. En v1 tu trouveras :

```
[classement] schéma v1 détecté : migration v2 non jouée, lecture réduite au score
```

---

## Étape 2 — La migration

Dans la **même console SQL**, colle ce bloc **tel quel** et exécute :

```sql
alter table classement
  add column if not exists nom        text,
  add column if not exists poste      text,
  add column if not exists nation     text,
  add column if not exists age        integer,
  add column if not exists saisons    integer,
  add column if not exists note       integer,
  add column if not exists reputation integer,
  add column if not exists matchs     integer,
  add column if not exists essais     integer,
  add column if not exists selections integer,
  add column if not exists titres     jsonb,
  add column if not exists clubs      jsonb;
```

### Pourquoi c'est sans risque

- **`add column if not exists`** : rejouer le bloc deux fois ne fait rien de
  plus. Tu peux le relancer sans crainte.
- **Toutes les colonnes sont nullables.** Les lignes déjà en base restent
  valides et continuent de s'afficher — avec leur seul score, et la mention
  « 🕰️ fiche d'avant » dans le panneau.
- **Aucune donnée n'est touchée.** Un `ALTER TABLE ... ADD COLUMN` avec valeur
  par défaut nulle est instantané sur Postgres, même sur une grosse table : il
  n'y a pas de réécriture.
- **Aucune interruption.** Le serveur essaie d'abord la requête complète et
  retombe sur la version courte en cas d'erreur : pendant la seconde que dure la
  migration, le classement répond toujours.

### Ce que chaque colonne porte

| Colonne | Contenu | D'où ça vient |
|---|---|---|
| `nom` | Le nom du personnage (≠ `pseudo`, choisi pour le classement) | `Joueur.nom` |
| `poste`, `nation`, `age` | L'identité affichée en tête de fiche | `Joueur` |
| `saisons`, `note`, `reputation` | Les pastilles de la fiche | `Joueur` |
| `matchs`, `essais`, `selections` | Les stats de carrière | `Joueur` |
| `titres` | **jsonb** — un tableau d'**ids de trophées** (`["brennus","champions_cup",…]`), pas des libellés | `data/trophees.ts` |
| `clubs` | **jsonb** — les clubs portés, **dans l'ordre** | `Joueur.clubs` |

> ⚠️ **`titres` stocke des IDS, pas du texte.** C'est ce qui rend l'armoire
> traduisible dans les 7 langues et affichable avec le bon modèle 3D : l'écran
> fait `TROPHEES[id].nom`. Si tu y mets un jour des libellés, le panneau
> retombera sur `titreTraduit()` et tu perdras l'accord avec `data/trophees.ts`.

---

## Étape 2 bis — la v3 : deux joueurs peuvent porter le même pseudo

**Le bug, signalé en jeu :** « si on a le même pseudo qu'un joueur dans le
classement, notre classement apparaît pas ». Il était exact, et il était grave.

Le `pseudo` était la **clé primaire** de la table : deux joueurs qui choisissent
le même nom se partagent donc UNE ligne. Or l'écriture est gardée par « le score
ne recule pas » (`where excluded.score >= classement.score`, voir l'étape 3) :
celui des deux qui avait le score le plus bas **n'écrivait rien du tout**. Sans
erreur, sans message, le serveur répondant `ok`. Sa carrière n'entrait jamais au
classement, et rien à l'écran ne pouvait le lui expliquer.

> Et comme le pseudo par défaut est le **nom du joueur** (`ficheDepuisJoueur`),
> ce n'est pas un cas rare : deux « Antoine Dupont » suffisent.

```sql
alter table classement add column if not exists cle text;
alter table classement add column if not exists id bigint generated by default as identity;
update classement set cle = 'v1:' || pseudo where cle is null;
alter table classement alter column cle set not null;
alter table classement drop constraint if exists classement_pkey;
alter table classement add constraint classement_pkey primary key (id);
create unique index if not exists classement_cle_idx on classement (cle);
```

### Les deux colonnes, et pourquoi il en faut deux

| Colonne | Qui la voit | À quoi elle sert |
|---|---|---|
| `cle` | **personne**, elle ne sort jamais du serveur | L'identité de l'INSTALLATION qui envoie, tirée au hasard une fois et rangée dans la sauvegarde du joueur. C'est elle qui porte l'unicité : **c'est le droit d'écrire sur cette ligne.** |
| `id` | tout le monde, le `GET` le renvoie | L'identifiant public de la ligne. Il permet à l'écran d'afficher deux lignes de même pseudo sans les mélanger, et au joueur de reconnaître la sienne. |

⚠️ **NE JAMAIS RENVOYER `cle` DANS LE `GET`.** Qui la connaît peut écrire sur la
ligne : il ne pourrait pas en baisser le score (`greatest` s'y oppose), mais il
pourrait en remplacer le nom, les clubs et le palmarès par les siens. C'est la
seule raison pour laquelle `id` existe en plus.

### Ce que la migration ne répare PAS, et il faut le savoir

Les lignes déjà en base **n'ont pas de clé** : on leur donne leur identité
héritée (`v1:<pseudo>`) et **on n'en supprime aucune**. Conséquence, à dire
franchement : un joueur qui figurait au classement AVANT la migration ouvrira une
**nouvelle ligne** à son prochain envoi, et son ancienne restera à côté.

C'est un choix, pas un oubli. Effacer une ligne parce qu'une autre porte le même
pseudo, c'est exactement le raisonnement qui a créé le bug, et rien ne dit que
les deux appartiennent à la même personne. Le nettoyage, si on le veut, se fait à
la main et à la vue :

```sql
select id, cle, pseudo, score, maj_le from classement
where cle like 'v1:%' order by maj_le asc;
```

### Et le pseudo, alors ?

Il reste, mais il n'est plus qu'un **libellé** : deux lignes peuvent l'afficher.
C'est le comportement voulu. Le jeu n'a aucun compte utilisateur, donc aucun
moyen honnête de réserver un nom à quelqu'un.

### Deux conséquences assumées de « la clé vit dans la sauvegarde »

1. **Deux appareils font deux lignes.** Le même joueur sur son téléphone et sur
   son ordinateur apparaîtra deux fois.
2. **Une sauvegarde effacée repart sur une ligne neuve.** L'ancienne reste,
   figée sur son dernier score.

Les deux se règleront d'un coup le jour où le jeu aura des comptes : c'est la
même brique que celle décrite dans `serveur/PAIEMENTS.md`, et pour la même
raison.

---

## Étape 3 — Vérifier que la migration a pris

Rejoue la requête de l'étape 1 : les douze colonnes doivent apparaître.

Puis, dans le jeu, **termine une saison ou une carrière** (l'envoi est
automatique) et recharge l'écran Classement. Ta ligne doit maintenant s'ouvrir
sur une fiche complète.

### ⚠️ Le piège des lignes déjà en base — et pourquoi il est réglé

Les lignes écrites avant la migration ont un score mais **pas de fiche**. Elles
ne se remplissent qu'au prochain envoi de leur propriétaire.

Or l'écriture était gardée par `where excluded.score > classement.score` — le
score doit **progresser**. Conséquence : un joueur ayant déjà atteint son
meilleur score renvoyait exactement le même, la condition était fausse, et **sa
fiche restait vide pour toujours**. Un joueur à la retraite n'aurait jamais
d'armoire.

La condition est passée à **`>=`** dans `api/classement.ts` : à score égal, la
carrière est la même, donc la fiche est bonne à prendre. Un `greatest()` garantit
qu'aucun score ne peut reculer au passage.

**Il n'y a donc rien de plus à faire** : les fiches se remplissent d'elles-mêmes
au fil des envois. Si tu veux forcer, la seule option est de supprimer les
lignes concernées (elles reviendront au prochain envoi) :

```sql
-- ⚠️ DESTRUCTIF. À ne faire que si tu acceptes de perdre les scores des
-- joueurs qui ne rejoueront jamais : ces lignes-là ne reviendront pas.
-- delete from classement where saisons is null;
```

Je ne le recommande pas : laisser les fiches se remplir toutes seules ne coûte
rien et ne perd personne.

---

## Étape 4 — Vérifier en jeu

1. Écran **Classement** → tableau **mondial**.
2. Touche une ligne : le panneau `PanneauFiche` s'ouvre.
3. Tu dois voir, dans l'ordre : identité (poste · nation · âge), les pastilles
   (note, saisons, 🏉 matchs, 🎯 essais, 🎽 sélections, ⭐ réputation, score),
   le **parcours en clubs** avec les écussons, puis **🏆 l'armoire à trophées**.
4. Une ligne d'avant la migration affiche « 🕰️ fiche d'avant » et seulement son
   score : c'est normal, et voulu.

---

## Et la base Supabase (`schema.sql`) ?

`serveur/schema.sql` et `serveur/classement.ts` sont **l'ancienne version
Supabase**, gardée pour référence. Elle est restée en **v1 : score seul**, et
elle n'a pas été migrée.

**Si tu déploies sur Vercel — c'est le cas du site — tu peux l'ignorer.** Si tu
tiens à faire vivre la voie Supabase, il faudrait, dans cet ordre :

1. jouer le même `ALTER TABLE` sur la base Supabase ;
2. reprendre `poser_score()` pour qu'elle accepte les douze champs (aujourd'hui
   sa signature est `(p_pseudo text, p_score integer)`) ;
3. reprendre `serveur/classement.ts` (Deno) pour les envoyer et les relire, sur
   le modèle de `api/classement.ts`.

Ce n'est pas fait, et c'est assumé : deux serveurs à maintenir pour un seul site
déployé, c'est un jour deux comportements différents.

---

## Ajouter un champ plus tard : les 6 endroits à toucher

Si tu veux un jour montrer autre chose (les blessures, le meilleur championnat
atteint, les Ovas dépensés…), voici la liste complète — dans l'ordre, chaque
étape dépendant de la précédente.

1. **`src/lib/classementMondial.ts`** — ajouter le champ à `FicheCarriere`, et
   le borner dans `verifierFiche()`.
   ⚠️ **Ne le mets PAS dans `scoreDeLaFiche()`** sauf si tu veux vraiment
   changer le barème : un classement ne doit pas se réordonner parce qu'on
   affiche une information de plus. Si tu y touches quand même, `SCORE_MAX`
   change, et il faut mettre à jour la contrainte SQL `check (score <= 117000)`
   dans les deux schémas.
2. **`ficheDepuisJoueur()`** (même fichier) — le remplir depuis le `Joueur`.
3. **`serveur/schema-vercel.sql`** — la colonne dans le `create table` **et**
   dans le bloc de migration en tête de fichier.
4. **La base en ligne** — jouer l'`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
5. **`api/classement.ts`** — l'ajouter au `select` du `GET`, à l'`insert` et au
   `do update` du `POST`.
   ⚠️ **Laisse le repli `42703` en place** : c'est lui qui empêche un déploiement
   de code de casser la lecture pour tout le monde tant que l'`ALTER TABLE`
   n'est pas joué.
6. **`src/lib/classementEnLigne.ts`** (`LigneMondiale`) puis
   **`src/screens/Classement.tsx`** (`FicheAffichable`, `depuisLigneMondiale`,
   `PanneauFiche`) — et la clé i18n dans `src/data/textes*.ts`, **dans les 7
   langues** (`npx vite-node scripts/verifTraductions.ts` le vérifie).

Et à la fin :

```bash
npx vite-node scripts/verifClassement.ts   # joue le tricheur : chaque attaque doit être refusée
npx vite-node scripts/verifTraductions.ts  # les 7 langues
```

---

## Ce que la migration ne change PAS

- **La sécurité.** Ce qui protège le classement, c'est que le serveur
  **RECALCULE** le score (`scoreDeLaFiche`) au lieu de croire celui qu'on lui
  envoie, et que `verifierFiche()` borne chaque champ avant l'écriture. Stocker
  davantage n'ouvre aucune brèche : on stocke exactement ce qui servait déjà au
  recalcul, plus la liste des clubs.
- **La vie privée.** Rien de nominatif n'entre en base : le `pseudo` est choisi
  par le joueur, le `nom` est celui d'un personnage de fiction, et l'identifiant
  d'appareil reste un **haché salé** dans une table `envois` purgée à deux jours.
- **Le débit.** 18 envois par heure et 120 par jour et par appareil.
- **Le jeu hors ligne.** Sans `DATABASE_URL`, sans serveur, ou serveur en panne :
  l'écran affiche son état et le classement local continue de fonctionner. Le
  classement mondial est un bonus, jamais une dépendance.

---

## Si ça ne marche pas

| Symptôme | Cause | Correctif |
|---|---|---|
| Le tableau mondial est vide et dit « hors ligne » | `npm run dev` ne sait pas exécuter une fonction serverless | `vercel dev`, ou `VITE_CLASSEMENT_URL=https://ton-site.vercel.app/api/classement npm run dev` |
| 500 « Lecture impossible » | `DATABASE_URL` absente des variables d'environnement Vercel | Vercel → Settings → Environment Variables, puis **redéployer** |
| 500 « Écriture impossible » | `SEL_APPAREIL` absente, ou migration à moitié jouée | Vérifier les deux variables, rejouer l'`ALTER TABLE` |
| Les lignes s'affichent mais toutes en « 🕰️ fiche d'avant » | Migration jouée, mais personne n'a encore renvoyé sa carrière | Termine une saison en jeu : l'envoi est automatique |
| Ta ligne reste sans fiche alors que tu as renvoyé | Ancien `api/classement.ts` avec le `>` strict | Redéployer : la condition est passée à `>=` |
| 429 « Trop d'envois » | 6/h ou 40/j atteints | Attendre. Un refus de fiche, lui, ne consomme pas le quota. |
| Un score légitime est refusé | `SCORE_MAX` a changé sans que la contrainte SQL suive | `alter table classement drop constraint if exists classement_score_check;` puis la recréer avec la nouvelle borne (affichée par `verifClassement.ts`) |
