# 💶 Gagner de l'argent avec Destiny Rugby

Ce document répond à une demande précise : « donne des idées pour pouvoir faire
de l'argent avec le jeu ». Il dit **ce qui est déjà branché**, **ce qu'il reste
à faire pour encaisser**, et **ce qu'il ne faut surtout pas faire** — parce que
la première façon de perdre de l'argent avec un jeu gratuit, c'est de faire
partir les joueurs.

---

## ⚠️ La règle qui commande tout le reste

> **Rien de ce qui se vend ne doit toucher à la difficulté.**

L'étalonnage du jeu est mesuré au dixième de point
(`npx vite-node scripts/verifDifficulte.ts` : médiane ~58-63 de générale,
une carrière sur dix dépasse 80). Les boosts « +2 à tous les attributs » ont
déjà été supprimés une fois pour cette raison. Tout ce qui se vend — ou se
gagne en regardant une pub — reste **cosmétique** : ballons, crampons,
maillots, accessoires. Les Ovas n'achètent que ça.

C'est aussi ce qui protège la seule chose qui a de la valeur ici : un
classement mondial crédible. Un jeu où l'on achète sa générale n'a plus de
classement, donc plus de raison de revenir.

---

## 1. Ce qui est branché aujourd'hui

| Source | État | Où |
|---|---|---|
| **Bannière publicitaire** | code prêt, **identifiant de régie à fournir** | `lib/pub.ts`, `components/Pub.tsx` |
| **Pub récompensée** (8 Ovas, 3/jour) | **jouable**, avec un encart maison en attendant une régie | Boutique → « Gagner des Ovas » |
| **Consentement RGPD** | fait (rien ne se charge avant un « oui ») | `BandeauConsentementPub` |
| **Packs d'Ovas** (0,99 € / 4,99 € / 9,99 €) | **vitrine seulement**, paiement non branché | `data/boutique.ts` → `PACKS` |
| **Boutique cosmétique** | 5 ballons + 16 articles de vestiaire | Boutique |

### Brancher la bannière (30 minutes, hors validation)

1. Ouvrir un compte **Google AdSense** avec le domaine `destiny-rugby.fr`
   (comptez quelques jours de validation : le site doit avoir du contenu réel —
   c'est le cas).
2. Créer une **unité d'annonce** « display, horizontal ».
3. Poser les deux valeurs dans `.env.local` (et dans les variables
   d'environnement Vercel) :

```bash
VITE_PUB_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_PUB_SLOT=1234567890
```

C'est tout : la bannière apparaît sur les quatre écrans autorisés, et le
bandeau de consentement se montre tout seul au premier passage.

### Brancher la vraie vidéo récompensée

AdSense ne propose pas de vidéo récompensée pour un site web classique — il
faut **Google Ad Manager** (« rewarded ads », gratuit, mais demande un compte
et un peu de configuration) ou une régie de jeux web (Adinplay, Playwire,
CrazyGames si le jeu y est publié).

Côté code, un seul endroit à changer : le composant `PubRecompensee`
(`components/Pub.tsx`). Il affiche aujourd'hui un encart maison avec un compte
à rebours ; il suffit d'appeler le SDK à la place et de conserver le contrat —
`onTerminee()` uniquement si la pub a été **regardée jusqu'au bout**.

---

## 2. Ce que ça peut rapporter, honnêtement

Les ordres de grandeur pour un jeu de niche francophone :

| | RPM (revenu pour 1 000 pages vues) | Pour 10 000 visites/mois |
|---|---|---|
| Bannière display FR | 2 à 6 € | **20 à 60 €/mois** |
| Pub récompensée | 8 à 25 € | **30 à 120 €/mois** (si un joueur sur trois en regarde) |
| Achats de cosmétiques | 1 à 3 % de payeurs, panier ~4 € | **40 à 120 €/mois** |

⚠️ **Ce n'est pas un salaire, et il ne faut pas le vendre comme tel.** À cette
échelle, la publicité paie l'hébergement, le nom de domaine et la clé Groq —
c'est déjà l'objectif réaliste. Les trois lignes deviennent intéressantes
seulement si l'audience passe un cap (100 000 visites/mois), et l'audience ne
vient pas de la monétisation : elle vient du jeu.

---

## 3. Les pistes, classées par rapport effort / revenu

### 🟢 À faire en premier (peu d'effort, effet réel)

1. **Brancher la bannière + la pub récompensée** (voir plus haut). Le code
   attend, il ne manque que les identifiants.
2. **Ko-fi / Buy Me a Coffee / Tipeee** — un lien « soutenir le jeu » dans les
   réglages et sur l'accueil. Sur un jeu de passionnés très typé (le rugby
   français amateur, 655 clubs réels), c'est souvent la source la plus rentable
   par heure de travail. Zéro intégration technique : un lien.
3. **Publier le jeu sur les portails de jeux web** (itch.io, CrazyGames,
   Poki). Ils apportent l'audience ET partagent leurs revenus publicitaires —
   c'est le levier le plus efficace quand on part de zéro visiteur. Attention :
   ils imposent souvent leur propre SDK de pub.

### 🟠 Ensuite (vrai travail, vrai revenu)

4. **Brancher le paiement des packs d'Ovas.** `PACKS` existe déjà en vitrine.
   Le plus simple pour un site statique : **Stripe Checkout** (lien de paiement
   hébergé par Stripe) + une petite fonction serverless qui crédite le compte.
   ⚠️ Cela suppose des **comptes joueurs** : aujourd'hui la sauvegarde vit dans
   le `localStorage`, donc un achat serait perdu en changeant de navigateur.
   C'est le vrai chantier derrière cette ligne, pas le paiement.
5. **Un « Pass Saison » cosmétique** (5 €/saison de jeu) : un maillot, une paire
   de crampons et un ballon exclusifs, plus un cadre doré au classement
   mondial. C'est le modèle qui convertit le mieux… **à condition** de ne rien
   contenir qui touche au terrain.
6. **Vendre les cosmétiques à l'unité** en argent réel, pas seulement en Ovas.

### 🔵 Plus tard (dépend de l'audience)

7. **Sponsoring / partenariat avec un club réel ou un équipementier.** Le jeu
   affiche 655 clubs français avec leurs vrais écussons : un club de Fédérale
   ou une marque de crampons a un intérêt évident à y avoir un maillot signé.
   Un seul partenariat vaut plusieurs mois de bannière.
8. **Boutique physique en impression à la demande** (maillots, écharpes au nom
   du jeu) via Printful/Teespring — zéro stock, marge faible, mais ça marche
   quand il existe une communauté.
9. **Version mobile empaquetée** (Capacitor) sur les stores : les régies
   mobiles paient 3 à 5 fois mieux que le web pour la vidéo récompensée.

### 🔴 À écarter — et pourquoi

- **Vendre de la puissance** (attributs, forme, potentiel, réduction du temps
  de blessure). Ça détruit l'étalonnage, le classement mondial et l'intérêt
  du jeu. C'est la ligne rouge du projet.
- **Interstitiels entre deux semaines de jeu.** C'est le format qui paie le
  mieux et celui qui fait fuir le plus vite. La boucle du jeu est déjà courte
  (une semaine = quelques clics) : une pub toutes les trois semaines de jeu
  rendrait la carrière insupportable.
- **Loot boxes / coffres aléatoires payants.** Encadré par la loi dans
  plusieurs pays européens, catastrophique en image, et incompatible avec un
  jeu qui vise les moins de 18 ans.
- **Revendre les données des joueurs.** Il n'y en a pas : tout est dans le
  navigateur. Autant que ça reste un argument.

---

## 4. Les préalables à ne pas oublier

Avant de monétiser un site français, trois choses coûtent une soirée et évitent
de gros ennuis :

1. **Mentions légales** (obligatoires) et **politique de confidentialité**
   (obligatoire dès qu'il y a de la pub ou une mesure d'audience).
2. **Bandeau de consentement conforme** : refuser doit être aussi simple
   qu'accepter. C'est le cas ici — deux boutons de même poids, et un refus
   respecté définitivement.
3. **CGU** si un jour il y a des comptes et des achats.

Et une remarque qui n'est pas juridique mais qui compte autant : le jeu utilise
les **noms, blasons et effectifs réels** de centaines de clubs. Tant que c'est
gratuit et non commercial, personne ne dira rien. **Le jour où le jeu rapporte
de l'argent, ce n'est plus la même conversation** — surtout pour les logos et
les noms de joueurs professionnels. Avant de brancher un paiement, prévoyez :
soit un accord (les clubs amateurs sont souvent ravis), soit des blasons
génériques et des noms altérés pour les joueurs sous contrat.
