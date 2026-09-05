-- ═══════════════════════════════════════════════════════════════════════════
-- LES COMPTES ET LES LIGUES PRIVÉES — schéma Postgres (Neon / Vercel)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- À coller UNE FOIS dans la console SQL de la base, après `schema-vercel.sql`
-- (le classement mondial). Les deux cohabitent dans la même base : rien ici ne
-- touche à la table `classement`.
--
-- ⚠️ CE FICHIER EST LA CONTREPARTIE DE `src/lib/ligue/`. Les règles du jeu
-- vivent là-bas, en TypeScript, partagées mot pour mot entre le navigateur et
-- les fonctions serverless. Ici, on ne range que des FAITS — et on met dans la
-- base tout ce qu'elle sait défendre mieux que du code : unicité, intégrité
-- référentielle, bornes. Une contrainte SQL tient même le jour où une fonction
-- serverless est déployée à moitié.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ LE PRINCIPE QUI COMMANDE TOUT LE RESTE
-- ═══════════════════════════════════════════════════════════════════════════
-- En solo, le navigateur est la source de vérité et c'est très bien : personne
-- ne triche contre soi-même. Une ligue entre potes, c'est l'inverse — un solde
-- d'OVA, la propriété d'une carte et le résultat d'un match engagent QUELQU'UN
-- D'AUTRE.
--
-- Donc, sans exception : **le client demande une action, il ne déclare jamais
-- un état.** « Je veux ouvrir un pack », pas « j'ai 100 000 OVA ». Le serveur
-- lit le solde EN BASE, débite, tire dans le vivier, attribue, journalise —
-- le tout dans UNE transaction. Soit tout passe, soit rien ne passe.
--
-- C'est le même raisonnement que pour le classement mondial (« le serveur
-- RECALCULE le score au lieu de croire celui qu'on lui envoie »), poussé à une
-- économie entière.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ PAS DE ROW LEVEL SECURITY, ET C'EST VOLONTAIRE
-- ═══════════════════════════════════════════════════════════════════════════
-- Même raison que `schema-vercel.sql` : la chaîne de connexion vit dans les
-- variables d'environnement de la fonction Vercel. Le navigateur n'a JAMAIS
-- accès à la base — il parle à `api/`, qui parle à la base. Il n'y a donc pas
-- de client anonyme à qui interdire quoi que ce soit ; la surface est plus
-- petite, il y a moins à verrouiller.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. LES COMPTES
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists comptes (
  -- ⚠️ L'IDENTITÉ TECHNIQUE, OPAQUE ET IMMUABLE. Ni le pseudo ni le courriel ne
  -- servent de clé : les deux se changent. Le classement mondial a déjà payé
  -- cette leçon (voir la migration v3 de `schema-vercel.sql`, où deux joueurs
  -- homonymes se partageaient une ligne et où le moins bien classé n'écrivait
  -- jamais rien, sans erreur ni message).
  id            uuid primary key default gen_random_uuid(),

  -- Le courriel sert à se reconnecter et à rien d'autre. Rangé en minuscules,
  -- unique. ⚠️ IL NE SORT JAMAIS D'UNE RÉPONSE D'API : ni dans un profil, ni
  -- dans une liste de membres, ni dans une recherche d'ami. On s'ajoute par
  -- étiquette (`Colin#4821`), jamais par adresse.
  courriel      text unique check (courriel = lower(courriel) and position('@' in courriel) > 1),

  -- ⚠️ EMPREINTE, PAS MOT DE PASSE. `scrypt` (node:crypto, aucune dépendance à
  -- installer), sel par compte, rangés ensemble sous la forme
  -- `scrypt$N$r$p$<sel base64>$<empreinte base64>`. Les paramètres sont DANS la
  -- chaîne pour qu'on puisse les durcir plus tard sans invalider les comptes
  -- existants : on relit ceux de la ligne, on vérifie, et on ré-empreinte à la
  -- volée si les paramètres ont changé.
  empreinte     text,

  -- Identités externes (« Continuer avec Google / Apple »). NULL tant que le
  -- compte est un couple courriel + mot de passe.
  -- ⚠️ UN COMPTE PEUT N'AVOIR QUE ÇA : `empreinte` est alors NULL, et c'est
  -- légitime. La contrainte plus bas exige seulement qu'il reste UN moyen de se
  -- connecter — sinon on crée des comptes auxquels personne ne peut revenir.
  fournisseur   text check (fournisseur in ('google', 'apple')),
  sujet_externe text,

  -- Ce qui s'affiche. Modifiable, JAMAIS unique : deux Colin, c'est normal.
  pseudo        text not null check (length(pseudo) between 2 and 20),
  region        text check (region in ('europe', 'ameriques', 'afrique', 'asie', 'oceanie')),
  langue        text check (length(langue) = 2),

  cree_le       timestamptz not null default now(),
  vu_le         timestamptz not null default now(),

  constraint compte_connectable check (empreinte is not null or sujet_externe is not null)
);

create unique index if not exists comptes_externe_idx
  on comptes (fournisseur, sujet_externe) where sujet_externe is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. LES SESSIONS
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ ON NE RANGE QUE L'EMPREINTE DU JETON, jamais le jeton. Une base qui fuite
-- ne doit pas livrer des sessions utilisables : c'est exactement le même
-- raisonnement que pour un mot de passe. Le jeton est tiré au hasard
-- (`randomBytes(32)`), rendu une seule fois au navigateur, et ce qui reste ici
-- est un SHA-256 — suffisant, parce qu'un jeton de 256 bits n'a pas besoin
-- d'être ralenti comme un mot de passe humain.

create table if not exists sessions (
  empreinte  text primary key,
  compte     uuid not null references comptes(id) on delete cascade,
  cree_le    timestamptz not null default now(),
  vu_le      timestamptz not null default now(),
  expire_le  timestamptz not null,
  -- Pour que le joueur puisse fermer une session ouverte ailleurs. Jamais l'IP.
  appareil   text
);
create index if not exists sessions_compte_idx on sessions (compte);
-- Purge à planifier (Vercel Cron, pg_cron, ou à la main) :
--   delete from sessions where expire_le < now();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. LES LIGUES
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists ligues (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null check (length(nom) between 3 and 32),
  -- Le code d'invitation, `TLS-8F4K2`. Unique : c'est lui qu'on colle dans
  -- Discord, et deux ligues qui le partagent, c'est un joueur qui atterrit
  -- chez des inconnus.
  code         text not null unique check (code ~ '^[A-Z]{3}-[A-Z0-9]{5}$'),
  commissaire  uuid not null references comptes(id) on delete restrict,

  -- ⚠️ LES RÉGLAGES EN `jsonb`, MAIS ASSAINIS AVANT L'ÉCRITURE. Le serveur
  -- passe par `reglagesAssainis()` (src/lib/ligue/reglages.ts), qui recompose
  -- l'objet champ par champ : un `JSON.parse` accepte les clés inconnues, et
  -- rangées ici elles reviendraient un jour à la lecture. Les deux bornes qui
  -- comptent vraiment sont doublées en SQL ci-dessous.
  reglages     jsonb not null,
  nb_clubs     smallint not null check (nb_clubs between 4 and 20),

  etat         text not null default 'salon'
                 check (etat in ('salon', 'draft', 'saison', 'intersaison', 'archivee')),
  saison       smallint not null default 1 check (saison >= 1),

  -- La graine du monde : le vivier et la dotation en découlent à l'identique.
  -- ⚠️ Elle ne sert QU'À LA CRÉATION. Ensuite, la table `cartes` est la vérité
  -- (voir l'avertissement en tête de `src/lib/ligue/vivier.ts`) : une
  -- régénération des données réelles ne peut donc pas déplacer une ligue en
  -- cours.
  graine       text not null,
  debut        date not null,
  cree_le      timestamptz not null default now()
);
create index if not exists ligues_commissaire_idx on ligues (commissaire);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. LES MEMBRES ET LEURS CLUBS
-- ═══════════════════════════════════════════════════════════════════════════
-- Un membre EST un club : séparer les deux tables n'apporterait qu'une jointure
-- de plus, puisqu'on ne peut pas avoir deux clubs dans la même ligue.

create table if not exists membres (
  id         uuid primary key default gen_random_uuid(),
  ligue      uuid not null references ligues(id) on delete cascade,
  compte     uuid not null references comptes(id) on delete cascade,

  -- Le pseudo AU MOMENT où il a rejoint, recopié depuis le compte. On le
  -- recopie plutôt que de le lire par jointure pour que l'histoire de la ligue
  -- reste lisible : « 2029 — Lucas RC » ne doit pas se réécrire tout seul le
  -- jour où Lucas change de pseudo.
  pseudo     text not null check (length(pseudo) between 2 and 20),
  club       text not null check (length(club) between 2 and 28),
  -- Clé de comparaison (voir `cleNom`) : minuscules, sans accent ni ponctuation.
  -- ⚠️ C'est ELLE qui porte l'unicité, pas `club` : « Colin RFC » et
  -- « colin  rfc » sont indistinguables à l'écran, et personne ne saurait plus
  -- à qui il envoie une offre.
  club_cle   text not null,
  couleur_a  text not null default '#0c2418' check (couleur_a ~ '^#[0-9a-fA-F]{6}$'),
  couleur_b  text not null default '#e8b23a' check (couleur_b ~ '^#[0-9a-fA-F]{6}$'),

  -- ⚠️ LE SOLDE VIT ICI, PAS DANS LE COMPTE. « Surtout pas de portefeuille OVA
  -- global » : quelqu'un qui a joué 500 heures dans une vieille ligue
  -- détruirait l'économie de la nouvelle en arrivant. Et jamais négatif — la
  -- base refuse ce que le code aurait laissé passer.
  ova        bigint not null default 0 check (ova >= 0),

  rejoint_le timestamptz not null default now(),

  unique (ligue, compte),
  unique (ligue, club_cle)
);
create index if not exists membres_ligue_idx on membres (ligue);
create index if not exists membres_compte_idx on membres (compte);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. LES CARTES — LE CŒUR DU MODE
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ « DANS UNE LIGUE DONNÉE, UN JOUEUR NE PEUT EXISTER QU'UNE SEULE FOIS. »
-- C'est la promesse qui fait toute l'économie : si Dupont appartient à Colin
-- RFC, personne d'autre ne peut l'avoir, donc il faut aller négocier avec
-- Colin. Une ligne = une carte = un exemplaire, et l'unicité est tenue par
-- l'index `(ligue, nom)` : même si une transaction bâclée essayait d'en créer
-- un second, la base refuserait.

create table if not exists cartes (
  id           uuid primary key default gen_random_uuid(),
  ligue        uuid not null references ligues(id) on delete cascade,
  -- Le numéro lisible dans la ligue (`c0042`), rendu par `identifiantCarte`.
  reference    text not null,

  nom          text not null,
  poste        text not null,
  nation       text not null,
  age          smallint not null check (age between 15 and 45),
  note         smallint not null check (note between 1 and 100),
  potentiel    smallint not null check (potentiel between 1 and 100),

  -- NULL = la carte dort dans le vivier. C'est là que puisent les packs.
  proprietaire uuid references membres(id) on delete set null,
  -- Engagée dans une offre ou une enchère. Sans ce verrou, on vend le même
  -- joueur à trois personnes en même temps : il suffit d'ouvrir trois onglets.
  verrouillee  boolean not null default false,

  unique (ligue, reference),
  unique (ligue, nom)
);
create index if not exists cartes_ligue_proprietaire_idx on cartes (ligue, proprietaire);
-- Le vivier libre est LA requête chaude (chaque ouverture de pack la fait).
create index if not exists cartes_vivier_idx
  on cartes (ligue, note) where proprietaire is null and not verrouillee;

-- L'histoire d'une carte : ce qui la rend irremplaçable au bout de six saisons.
create table if not exists cartes_histoire (
  carte      uuid not null references cartes(id) on delete cascade,
  saison     smallint not null,
  club       uuid references membres(id) on delete set null,
  matchs     integer not null default 0,
  essais     integer not null default 0,
  -- Ids de trophées et de distinctions (`data/trophees.ts`).
  titres     jsonb not null default '[]'::jsonb,
  primary key (carte, saison)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. LE CALENDRIER ET LES RÉSULTATS
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists rencontres (
  id         uuid primary key default gen_random_uuid(),
  ligue      uuid not null references ligues(id) on delete cascade,
  saison     smallint not null,
  -- NULL = match de championnat ; sinon, la coupe maison à laquelle il
  -- appartient.
  competition uuid,
  journee    smallint not null,

  domicile   uuid not null references membres(id) on delete cascade,
  exterieur  uuid not null references membres(id) on delete cascade,

  -- ⚠️ UNE JOURNÉE EST UNE FENÊTRE, PAS UNE HEURE. « Je ne forcerais pas une
  -- heure précise » : les deux managers s'arrangent, l'un lance le match, et
  -- ce qui compte est la DATE LIMITE. Les deux bornes sont en UTC — une ligue
  -- peut réunir un Toulousain et un Québécois, et « dimanche 23 h 59 » n'a pas
  -- la même signification pour les deux.
  ouvre_le   timestamptz not null,
  ferme_le   timestamptz not null,

  points_d   smallint,
  points_e   smallint,
  essais_d   smallint,
  essais_e   smallint,
  origine    text check (origine in ('joue', 'simule', 'forfait', 'commissaire')),
  joue_le    timestamptz,

  check (domicile <> exterieur),
  check (ferme_le > ouvre_le),
  -- Un résultat est complet ou absent : jamais un score sans son origine.
  check ((points_d is null) = (origine is null))
);
create index if not exists rencontres_ligue_idx on rencontres (ligue, saison, journee);
create index if not exists rencontres_enretard_idx
  on rencontres (ligue, ferme_le) where origine is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. LE MARCHÉ
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists offres (
  id             uuid primary key default gen_random_uuid(),
  ligue          uuid not null references ligues(id) on delete cascade,
  emetteur       uuid not null references membres(id) on delete cascade,
  destinataire   uuid not null references membres(id) on delete cascade,

  cartes_donnees   uuid[] not null default '{}',
  ova_donnes       bigint not null default 0 check (ova_donnes >= 0),
  cartes_demandees uuid[] not null default '{}',
  ova_demandes     bigint not null default 0 check (ova_demandes >= 0),
  message          text check (length(message) <= 280),

  -- Le bilan d'équité au moment de l'envoi, calculé par `peserEchange`.
  -- ⚠️ ON LE RANGE MÊME EN LIGUE « LIBRE », où il n'empêche rien. Une ligue
  -- libre n'est pas une ligue aveugle : quand quelqu'un s'étonne en mars que
  -- Hugo aligne quatre joueurs à 85, l'historique doit pouvoir raconter d'où
  -- ils viennent.
  ecart          numeric(4, 3),
  verdict        text check (verdict in ('equilibre', 'discutable', 'aberrant')),

  etat           text not null default 'envoyee'
                   check (etat in ('envoyee', 'acceptee', 'refusee', 'expiree', 'attenteCommissaire')),
  repond_a       uuid references offres(id) on delete set null,
  creee_le       timestamptz not null default now(),
  expire_le      timestamptz not null,

  check (emetteur <> destinataire),
  -- Une offre vide n'est pas « équilibrée », c'est un formulaire non rempli.
  check (cardinality(cartes_donnees) + cardinality(cartes_demandees) > 0)
);
create index if not exists offres_destinataire_idx on offres (destinataire, etat);
create index if not exists offres_ligue_idx on offres (ligue, etat);

create table if not exists ventes (
  id            uuid primary key default gen_random_uuid(),
  ligue         uuid not null references ligues(id) on delete cascade,
  carte         uuid not null references cartes(id) on delete cascade,
  vendeur       uuid not null references membres(id) on delete cascade,
  type          text not null check (type in ('directe', 'enchere')),
  prix          bigint not null check (prix > 0),
  meilleure     bigint check (meilleure > 0),
  encherisseur  uuid references membres(id) on delete set null,
  -- ⚠️ REPOUSSÉE PAR LES OFFRES DE DERNIÈRE MINUTE (`clotureApresOffre`). Sans
  -- ça, l'enchère revient à un concours de réflexes à 23 h 59, et celui qui
  -- gagne n'est plus celui qui veut le plus le joueur.
  ferme_le      timestamptz not null,
  etat          text not null default 'ouverte'
                  check (etat in ('ouverte', 'vendue', 'retiree', 'infructueuse')),
  creee_le      timestamptz not null default now(),

  check (meilleure is null or encherisseur is not null)
);
-- ⚠️ UNE SEULE VENTE OUVERTE PAR CARTE. Deux enchères simultanées sur le même
-- joueur, ce sont deux acheteurs qui paient et un seul qui reçoit.
create unique index if not exists ventes_carte_ouverte_idx
  on ventes (carte) where etat = 'ouverte';
create index if not exists ventes_ligue_idx on ventes (ligue, etat, ferme_le);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. LE JOURNAL
-- ═══════════════════════════════════════════════════════════════════════════
-- On garde TOUT : achat de pack, récompense de match, enchère, vente, échange,
-- ajustement du commissaire. Ça sert deux fois — à démêler une dispute (« je te
-- jure que je t'ai envoyé 12 000 »), et à raconter la ligue.
--
-- ⚠️ CETTE TABLE EST ÉCRITE DANS LA MÊME TRANSACTION que le mouvement qu'elle
-- décrit. Journaliser après coup, c'est se retrouver avec des soldes qui ne
-- s'expliquent pas le jour où une écriture échoue entre les deux.

create table if not exists transactions (
  id           bigint generated by default as identity primary key,
  ligue        uuid not null references ligues(id) on delete cascade,
  nature       text not null check (nature in (
                 'dotation', 'pack', 'echange', 'vente', 'enchere',
                 'recompenseMatch', 'recompenseCompetition', 'recompenseObjectif',
                 'ajustementCommissaire')),
  club         uuid not null references membres(id) on delete cascade,
  contrepartie uuid references membres(id) on delete set null,
  -- Positif = encaissé, négatif = payé.
  ova          bigint not null default 0,
  cartes_in    uuid[] not null default '{}',
  cartes_out   uuid[] not null default '{}',
  libelle      text not null,
  fait_le      timestamptz not null default now()
);
create index if not exists transactions_ligue_idx on transactions (ligue, fait_le desc);
create index if not exists transactions_club_idx on transactions (club, fait_le desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. LES COMPÉTITIONS MAISON ET L'HISTOIRE
-- ═══════════════════════════════════════════════════════════════════════════
-- « Le commissaire peut créer une compétition à n'importe quel moment. » C'est
-- ce qui fabrique les traditions d'un groupe : la Christmas Cup, la Coupe de
-- Printemps, la Colin's Champions Cup. Et le trophée reste dans l'histoire.

create table if not exists competitions (
  id           uuid primary key default gen_random_uuid(),
  ligue        uuid not null references ligues(id) on delete cascade,
  nom          text not null check (length(nom) between 2 and 40),
  trophee      text not null check (length(trophee) between 2 and 40),
  couleur_a    text not null default '#1a1305' check (couleur_a ~ '^#[0-9a-fA-F]{6}$'),
  couleur_b    text not null default '#e8b23a' check (couleur_b ~ '^#[0-9a-fA-F]{6}$'),
  format       text not null check (format in ('championnat', 'eliminationDirecte', 'poulesPuisKO')),
  participants uuid[] not null,
  -- Peut valoir 0 : « une compétition sans récompense économique, uniquement
  -- pour le prestige ».
  dotation     bigint not null default 0 check (dotation >= 0),
  saison       smallint not null,
  etat         text not null default 'aVenir' check (etat in ('aVenir', 'enCours', 'terminee')),
  vainqueur    uuid references membres(id) on delete set null,
  cree_le      timestamptz not null default now()
);
create index if not exists competitions_ligue_idx on competitions (ligue, saison);

-- Le palmarès figé, saison par saison. ⚠️ AVEC LES NOMS RECOPIÉS, pas des
-- références : « 2028 — Colin RFC » doit rester lisible même si Colin quitte
-- la ligue, change de nom de club, ou supprime son compte. C'est l'histoire du
-- groupe, elle ne se réécrit pas.
create table if not exists palmares (
  ligue       uuid not null references ligues(id) on delete cascade,
  saison      smallint not null,
  competition text not null,
  vainqueur   text not null,
  finaliste   text,
  primary key (ligue, saison, competition)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. LES AMIS
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ UNE SEULE LIGNE PAR PAIRE, avec `a < b` garanti par la contrainte. Deux
-- lignes symétriques, c'est fatalement un jour une amitié qui n'existe que dans
-- un sens — et un écran qui affiche deux choses différentes selon qui regarde.

create table if not exists amities (
  a          uuid not null references comptes(id) on delete cascade,
  b          uuid not null references comptes(id) on delete cascade,
  -- Qui a demandé : c'est à l'AUTRE d'accepter.
  demandeur  uuid not null references comptes(id) on delete cascade,
  etat       text not null default 'demandee' check (etat in ('demandee', 'acceptee', 'bloquee')),
  cree_le    timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. LE GARDE-FOU DE DÉBIT
-- ═══════════════════════════════════════════════════════════════════════════
-- Même principe que la table `envois` du classement : on ne garde qu'un HACHÉ
-- de l'identifiant d'appareil, jamais l'IP en clair.
--
-- ⚠️ ET COMME POUR LE CLASSEMENT, IL FAUT LE REDIRE : **le débit n'est pas ce
-- qui protège l'économie.** Ce qui la protège, c'est que le serveur lit le
-- solde en base et l'écrit dans la même transaction que la carte. Le débit ne
-- sert qu'à empêcher qu'on martèle la base pour rien — et à rendre inutile
-- l'ouverture de mille packs à la seconde en espérant une condition de course.

create table if not exists actions_ligue (
  appareil  text not null,
  action    text not null,
  fait_le   timestamptz not null default now()
);
create index if not exists actions_ligue_idx on actions_ligue (appareil, action, fait_le desc);
-- Purge quotidienne :
--   delete from actions_ligue where fait_le < now() - interval '2 days';

-- ═══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION APRÈS COLLAGE
-- ═══════════════════════════════════════════════════════════════════════════
--   select table_name from information_schema.tables
--    where table_schema = 'public'
--      and table_name in ('comptes','sessions','ligues','membres','cartes',
--                         'cartes_histoire','rencontres','offres','ventes',
--                         'transactions','competitions','palmares','amities',
--                         'actions_ligue')
--    order by table_name;
--   -- 14 lignes attendues.
