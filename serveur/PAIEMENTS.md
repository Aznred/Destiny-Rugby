# Vendre des Ovas — le chemin le plus court avec Stripe

Objectif : qu'un joueur puisse acheter un pack d'Ovas (`PACKS`, `src/data/boutique.ts`)
et que son solde monte réellement, sans qu'on puisse tricher.

**Compte 2 à 3 heures** pour la version qui marche, plus le délai de validation
du compte Stripe (quelques jours, une fois vos documents envoyés).

---

## ⚠️ La seule règle qui compte

**Le navigateur ne crédite JAMAIS les Ovas.** Il ouvre une page de paiement,
c'est tout. Le crédit vient d'un **webhook Stripe → votre serveur → la base**.

C'est exactement le raisonnement du classement mondial : le serveur recalcule le
score au lieu de croire celui qu'on lui envoie. Ici, il croit **Stripe**, jamais
le client. Un `coins += 550` posé côté navigateur après un `return_url`, c'est
une ligne à changer dans la console du navigateur pour se donner l'inventaire
entier.

---

## ⚠️ Ce qui bloque aujourd'hui, et qu'il faut régler d'abord

Le jeu n'a **aucun compte utilisateur** : la sauvegarde vit dans le
`localStorage` du navigateur (clé `destin-ovalie`). Conséquence directe :

> **Sans identité, un achat ne peut pas être rattaché à quelqu'un.**
> Le joueur vide son cache, change de téléphone — ses Ovas payés disparaissent,
> et vous devez rembourser.

Vendre quelque chose qui peut s'évaporer, c'est se garantir des litiges et des
rétrofacturations (Stripe les facture 15 € pièce, en plus du remboursement).

**Il faut donc une identité avant de vendre.** Trois options, de la plus légère
à la plus lourde :

| Option | Effort | Ce que ça donne |
|---|---|---|
| **Lien magique par e-mail** (recommandé) | ~1 jour | Le joueur entre son e-mail, reçoit un lien, et sa sauvegarde est rattachée. Pas de mot de passe à gérer. |
| Connexion Google | ~1 jour | Plus rapide pour lui, une dépendance de plus pour vous. |
| Code de restauration | ~2 h | Un code à recopier. Gratuit, mais il le perdra. |

Le lien magique se code en une table (`joueur_id`, `email`, `jeton`, `expire_le`)
et une fonction Vercel qui envoie l'e-mail — Resend a un palier gratuit
largement suffisant.

---

## Le montage, étape par étape

### 1. Le compte Stripe

1. Créez le compte sur [dashboard.stripe.com](https://dashboard.stripe.com).
2. Restez en **mode test** tout le développement — les cartes de test sont
   fournies (`4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC).
3. Récupérez vos deux clés dans *Développeurs → Clés API* :
   - `pk_test_…` : publiable, elle peut vivre dans le bundle.
   - `sk_test_…` : **secrète**, elle ne doit JAMAIS quitter le serveur.

### 2. Les produits

Dans *Catalogue de produits*, créez un produit par pack, avec un prix unique :

| Produit | Prix | À noter |
|---|---|---|
| 100 Ovas | 0,99 € | `price_…` |
| 550 Ovas | 4,99 € | `price_…` |
| 1 200 Ovas | 9,99 € | `price_…` |

Reportez chaque identifiant `price_…` dans `src/data/boutique.ts`, à côté du
pack correspondant. ⚠️ **Le nombre d'Ovas ne doit pas voyager depuis le
navigateur** : le serveur le retrouvera à partir du `price_…`, sinon il suffit
de modifier la requête pour s'offrir 100 000 Ovas à 0,99 €.

### 3. Les variables d'environnement Vercel

*Settings → Environment Variables*, puis **redéployez** (elles ne sont lues qu'au
déploiement) :

```
STRIPE_SECRET_KEY      sk_test_…
STRIPE_WEBHOOK_SECRET  whsec_…        (fourni à l'étape 5)
DATABASE_URL           déjà présente pour le classement
```

### 4. La fonction qui ouvre le paiement — `api/paiement.ts`

Elle ne fait qu'une chose : créer une session Stripe Checkout et renvoyer son
URL. Le navigateur y redirige le joueur.

```ts
// api/paiement.ts — squelette
import Stripe from 'stripe';

const PACKS: Record<string, { price: string; ovas: number }> = {
  p1: { price: 'price_…', ovas: 100 },
  p2: { price: 'price_…', ovas: 550 },
  p3: { price: 'price_…', ovas: 1200 },
};

export default async function handler(req, res) {
  const { packId, joueurId } = req.body;      // joueurId vient de la session
  const pack = PACKS[packId];
  if (!pack || !joueurId) return res.status(400).json({ erreur: 'Requête invalide' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: pack.price, quantity: 1 }],
    // ⚠️ C'EST CE CHAMP QUI RELIE LE PAIEMENT AU JOUEUR. Sans lui, le webhook
    // saura qu'on a payé mais pas QUI : l'argent rentre, les Ovas nulle part.
    client_reference_id: joueurId,
    metadata: { packId },
    success_url: 'https://destiny-rugby.fr/?achat=ok',
    cancel_url: 'https://destiny-rugby.fr/?achat=annule',
  });
  res.status(200).json({ url: session.url });
}
```

### 5. Le webhook — `api/stripe-webhook.ts`

**C'est ici, et nulle part ailleurs, que les Ovas sont crédités.**

```ts
export const config = { api: { bodyParser: false } };  // ⚠️ indispensable

export default async function handler(req, res) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const brut = await corpsBrut(req);          // le corps NON parsé
  let evenement;
  try {
    // ⚠️ SANS CETTE VÉRIFICATION, N'IMPORTE QUI PEUT APPELER VOTRE WEBHOOK
    // et s'offrir des Ovas avec un simple `curl`. La signature prouve que
    // l'appel vient bien de Stripe.
    evenement = stripe.webhooks.constructEvent(
      brut, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return res.status(400).send('Signature invalide');
  }

  if (evenement.type === 'checkout.session.completed') {
    const s = evenement.data.object;
    const pack = PACKS[s.metadata.packId];
    // ⚠️ IDEMPOTENT : Stripe REJOUE ses webhooks (nouvelle tentative en cas de
    // timeout, doublons possibles). Sans clé unique sur l'identifiant de
    // session, un même achat crédite deux ou trois fois.
    await sql`
      insert into achats (session_stripe, joueur_id, ovas)
      values (${s.id}, ${s.client_reference_id}, ${pack.ovas})
      on conflict (session_stripe) do nothing
    `;
    await sql`
      update joueurs set coins = coins + ${pack.ovas}
      where id = ${s.client_reference_id}
        and exists (select 1 from achats where session_stripe = ${s.id})
    `;
  }
  res.status(200).json({ recu: true });
}
```

Puis, dans *Développeurs → Webhooks*, ajoutez l'endpoint
`https://destiny-rugby.fr/api/stripe-webhook`, événement
`checkout.session.completed`. Stripe vous donne le `whsec_…` à mettre dans les
variables d'environnement.

En local : `stripe listen --forward-to localhost:3000/api/stripe-webhook`.

### 6. La table

```sql
create table if not exists achats (
  -- La clé primaire EST l'identifiant de session Stripe : c'est ce qui rend
  -- le crédit idempotent, côté base, donc sans course possible.
  session_stripe text primary key,
  joueur_id      text not null,
  ovas           integer not null check (ovas > 0),
  cree_le        timestamptz not null default now()
);
create index if not exists achats_joueur_idx on achats (joueur_id, cree_le desc);
```

### 7. Le bouton, côté jeu

Dans `src/screens/Boutique.tsx`, le bouton d'un pack appelle `api/paiement`
puis redirige :

```ts
const r = await fetch('/api/paiement', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ packId: pack.id, joueurId }),
});
const { url } = await r.json();
window.location.href = url;   // Stripe Checkout prend la main
```

Au retour (`?achat=ok`), **ne créditez rien** : rafraîchissez simplement le solde
depuis le serveur. Le webhook a déjà fait le travail — et il arrive parfois
avant le retour du joueur, parfois quelques secondes après.

---

## Ce que ça coûte

| | |
|---|---|
| Stripe, par transaction | **1,5 % + 0,25 €** (cartes européennes) |
| Sur un pack à 0,99 € | il vous reste **0,73 €** — 26 % partent en frais |
| Sur un pack à 9,99 € | il vous reste **9,59 €** — 4 % |
| Abonnement mensuel | aucun |
| Litige (rétrofacturation) | **15 €**, en plus du remboursement |

⚠️ **Le pack à 0,99 € est mauvais pour vous.** Le frais fixe de 0,25 € l'écrase.
Si vous gardez un premier palier, mettez-le plutôt à 2,99 €, ou acceptez qu'il
serve d'appel sans rapporter.

---

## Les obligations que Stripe ne gère pas à votre place

Elles ne sont pas optionnelles, et un contrôle les demande.

1. **TVA.** Un bien numérique vendu à un particulier de l'UE est taxé **au taux
   du pays de l'acheteur**. Gérer ça à la main est un cauchemar :
   **activez Stripe Tax** (0,5 % par transaction taxée), il calcule et collecte.
   Vous restez responsable de la déclaration — le guichet unique OSS existe pour
   ça.
2. **Statut.** Encaisser régulièrement demande une structure. En France, une
   micro-entreprise suffit pour commencer.
3. **Conditions générales de vente** et **droit de rétractation**. Pour un
   contenu numérique livré immédiatement, la rétractation de 14 jours peut être
   écartée — mais **uniquement** si le joueur y renonce explicitement, par une
   case à cocher, avant l'achat. Sans cette case, il peut se faire rembourser
   quatorze jours durant, Ovas dépensés compris.
4. **Mineurs.** Votre public en compte. Un achat par un mineur sans accord
   parental est annulable. Une phrase claire avant paiement, et une limite de
   dépense, réduisent le risque.

---

## Et l'alternative, honnêtement

Si tout ce qui précède vous semble lourd pour vendre des ballons de rugby
cosmétiques : **c'est parce que ça l'est**. Vendre en direct veut dire assumer
comptabilité, TVA, litiges et support.

Deux raccourcis existent :

- **Ko-fi / Buy Me a Coffee** — du don, pas de la vente. Zéro obligation de TVA
  de votre côté, mise en place en dix minutes. Vous ne pouvez pas promettre
  d'Ovas en échange (ce serait une vente), mais rien n'interdit de remercier
  publiquement vos soutiens.
- **Une boutique hébergée** (Lemon Squeezy, Paddle) — ils sont **marchand de
  référence** : ils encaissent, déclarent la TVA du monde entier et gèrent les
  litiges à votre place. Ils prennent environ 5 % + 0,50 €, soit nettement plus
  que Stripe — mais ils font tout le travail listé ci-dessus.

**Mon conseil pour un premier pas : Lemon Squeezy.** Plus cher par transaction,
mais il supprime les points 1 à 3 de la liste des obligations, et il vous fait
gagner plusieurs jours. Vous basculerez sur Stripe le jour où le volume rendra
les 5 % coûteux.

⚠️ **Dans tous les cas, l'identité du joueur reste le préalable.** Aucun
prestataire ne peut créditer un compte qui n'existe pas.
