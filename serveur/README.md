# Le classement mondial — la partie serveur

Ce dossier contient tout ce qu'il faut pour brancher le classement en ligne.
Il n'est **pas** compilé avec le jeu : c'est du code Deno, déployé à part.

## Le principe, en une phrase

> Le navigateur envoie les **faits** d'une carrière, le serveur **recalcule** le
> score et n'écrit que lui.

```
   navigateur                    Edge Function                     base
┌──────────────────┐      ┌───────────────────────────┐     ┌────────────┐
│ FicheCarriere    │ POST │ 1. débit (1/h, 10/j)      │     │ pseudo     │
│ saisons, matchs, │  →   │ 2. verifierFiche()        │  →  │ score      │
│ essais, titres…  │      │ 3. score = scoreDeLaFiche │     │ cree_le    │
└──────────────────┘      │ 4. jette la fiche         │     └────────────┘
                          └───────────────────────────┘
```

**La base ne contient que le score** — c'est la contrainte de départ. La fiche
ne sert qu'à recalculer, puis elle disparaît.

## Pourquoi ça tient

Un jeu qui tourne entièrement dans le navigateur ne peut **rien** garantir tout
seul : le joueur possède la machine qui calcule, peut éditer son `localStorage`,
modifier le bundle, ou appeler l'API à la main. Un secret embarqué dans le
bundle n'est pas un secret.

La protection ne repose donc pas sur le secret, mais sur trois choses :

1. **Le serveur ne croit jamais le score.** Il le recalcule avec le même barème
   que le jeu (`src/lib/classementMondial.ts`, importé — pas recopié).
2. **La cohérence interne.** Chaque chiffre est borné par les *autres* : une
   saison = un an de vie, 50 matchs maximum par saison, 5 essais par match,
   4 titres par saison, une note atteignable en ce nombre de saisons, et chaque
   trophée doit **exister**. On ne peut plus « mettre un gros nombre » : il faut
   fabriquer une carrière entière qui tient debout — et à ce moment-là, autant
   la jouer.
3. **Le débit.** Une carrière crédible demande des heures. Un envoi par heure
   et dix par jour par appareil rendent le forçage sans intérêt.

Les attaques sont testées, une par une :

```bash
npx vite-node scripts/verifClassement.ts
```

## Déploiement (Supabase)

```bash
# 1. la base
psql "$DATABASE_URL" -f serveur/schema.sql

# 2. la fonction
supabase functions deploy classement --no-verify-jwt
supabase secrets set SEL_APPAREIL="$(openssl rand -hex 16)"
```

`--no-verify-jwt` est volontaire : le jeu n'a pas de comptes. Ce sont le débit et
la vérification de la fiche qui protègent, pas l'authentification.

⚠️ **La clé de service ne doit jamais entrer dans le bundle.** Le navigateur ne
parle qu'à l'Edge Function ; elle seule écrit. La table n'a d'ailleurs **aucune**
policy d'insertion : la clé `anon`, publique, ne peut rien écrire même si elle
essaie.

## Brancher le jeu dessus

Il ne manque que l'URL. Côté jeu, tout est prêt :

```ts
import { ficheDepuisJoueur } from './lib/classementMondial';

await fetch(`${import.meta.env.VITE_CLASSEMENT_URL}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(ficheDepuisJoueur(joueur, pseudo)),
});
```

À appeler dans `prendreRetraite()` (`src/store/useGame.ts`), juste après l'ajout
au panthéon : une requête par carrière. Et remplacer `classementComplet()` par
une lecture des 100 meilleurs scores dans `src/screens/Classement.tsx`.

## Ce que ce dossier ne fait pas

- **Pas d'anti-triche absolu.** Il n'en existe pas pour un jeu client. Le but est
  de rendre la triche plus coûteuse que le jeu, et de la rendre **visible** : les
  refus sont journalisés, c'est là qu'on voit arriver les scripts.
- **Pas d'historique.** La base ne garde que le score : on ne pourra pas
  recalculer un ancien classement si le barème change. C'est le prix d'une base
  minimale, et c'est assumé. Si un jour il faut recalculer, il faudra une
  colonne `fiche jsonb` — et donc renoncer à « juste le score ».
