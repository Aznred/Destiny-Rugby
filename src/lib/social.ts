// MÉCANIQUE DU RÉSEAU SOCIAL (lot 7, point 23)
//
// Publier n'est pas gratuit. Chaque message est lu par trois publics qui ne
// veulent pas la même chose :
//
//   • les supporters et les curieux → abonnés, popularité ;
//   • les journalistes → réputation, et la reprise médiatique ;
//   • le staff → confiance du coach, et parfois la convocation dans le bureau.
//
// Le nombre de réponses hostiles dépend du TON employé, de la popularité et de
// la saison en cours : un joueur qui gagne encaisse mieux qu'un joueur qui perd.
// Tout est déterministe à partir d'une graine (id du post) : rouvrir la
// timeline ne rejoue pas les réactions.

import type { CompteSuivi, Joueur, PostSocial } from '../types.js';
import {
  AMBIANCE, COMPTES, MOTS_INTERDITS, REPONSES_NEGATIVES, REPONSES_POSITIVES,
  TON_PAR_ID, type Compte, type TypeCompte,
} from '../data/social.js';
import {
  ambiancesSocialesTraduites, reponsesSocialesTraduites, sanctionEmbrouilleSociale,
} from '../data/socialLocalise.js';
import {
  evaluerEmbrouilleSociale, type SanctionSociale,
} from './disciplineSociale.js';
import { graine } from './championnat.js';
import { libelleDate, semaine } from '../data/calendrier.js';
import { effetsTraits } from '../data/traits.js';
import { nomDivision } from './promotion.js';
import { POSTE_PAR_ID } from '../data/rugby.js';
import { nomNation, nomNationTraduit } from './nations.js';
import { avatarPourCompte } from './avatars.js';
import { annuaire } from './comptes.js';
import { t } from './i18n.js';

export const LIMITE_CARACTERES = 280;

// Pseudo par défaut : prénom.nom sans accent, en minuscules.
export function pseudoDe(nom: string): string {
  const base = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return (base || 'joueur') + '_' + (10 + (nom.length * 7) % 89);
}

// Le joueur est certifié à partir d'un certain niveau de notoriété.
export function estCertifie(j: Joueur): boolean {
  return (j.reputation ?? 0) >= 55 || (j.abonnes ?? 0) >= 50_000;
}

function remplacer(texte: string, j: Joueur): string {
  return texte
    .replace(/\{joueur\}/g, j.nom)
    .replace(/\{club\}/g, j.club)
    .replace(/\{division\}/g, nomDivision(j.division ?? ''))
    .replace(/\{poste\}/g, POSTE_PAR_ID[j.poste].nom.toLowerCase())
    .replace(/\{nation\}/g, nomNation(j.nation));
}

function piocher<T>(liste: T[], rng: () => number): T {
  return liste[Math.floor(rng() * liste.length)];
}

function comptesDe(type: TypeCompte): Compte[] {
  return COMPTES.filter((c) => c.type === type);
}

// Formatage à la X : 12,4 k · 1,2 M
export function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace('.', ',').replace(',0', '') + ' k';
  return String(n);
}

// --- DES COMPTEURS QUI SE TIENNENT ----------------------------------------
//
// ⚠️ Chaque source de publications tirait ses chiffres dans son coin : on
// voyait un compte de supporter à 40 000 vues, plus de reposts que de likes,
// ou un club officiel moins lu qu'un anonyme. Tout passe désormais par ici, en
// CASCADE : audience → vues → likes → reposts. Chaque étage est un pourcentage
// de celui du dessus, donc l'ordre de grandeur est toujours crédible.

// ⚠️ Repli seulement : un compte a normalement ses propres abonnés, calculés
// selon SA DIVISION (lib/comptes.ts). Ces valeurs ne servent qu'aux comptes
// inventés par l'IA, qui n'ont pas de fiche.
export const AUDIENCE_PAR_TYPE: Record<string, number> = {
  selection: 320_000, competition: 90_000, media: 120_000, club: 25_000,
  journaliste: 20_000, joueur: 4_000, hater: 900, fan: 500,
};

export function audienceDe(type: string | undefined, abonnes?: number): number {
  if (abonnes && abonnes > 0) return abonnes;
  return AUDIENCE_PAR_TYPE[type ?? 'fan'] ?? 3000;
}

export interface StatsPost { vues: number; likes: number; reposts: number }

export function statsDepuisVues(vues: number, rng: () => number): StatsPost {
  const v = Math.max(12, Math.round(vues));
  // ⚠️ La cascade est BORNÉE : un like suppose une vue, un repost suppose un
  // like. Sans ces bornes, un petit compte pouvait afficher plus de likes que
  // de vues — c'est le genre d'incohérence qui saute aux yeux sur un fil.
  const likes = Math.min(Math.round(v * 0.34), Math.round(v * (0.025 + rng() * 0.04)));
  const reposts = Math.min(likes, Math.round(likes * (0.08 + rng() * 0.16)));
  return { vues: v, likes: Math.max(0, likes), reposts: Math.max(0, reposts) };
}

// UN POST NE MEURT PAS LE JOUR OÙ IL EST PUBLIÉ. Les compteurs continuent de
// monter les semaines suivantes, de moins en moins vite : la moitié du gain la
// première semaine, un quart la deuxième, etc. Au bout d'un mois et demi, le
// post est mort et n'attire plus personne. Déterministe (graine = id du post +
// âge), donc rejouer la même semaine ne gonfle jamais deux fois les chiffres.
export const AGE_MORT = 6; // semaines

export function vieillirPost(
  p: StatsPost & { id: string }, ageEnSemaines: number,
): StatsPost {
  if (ageEnSemaines <= 0 || ageEnSemaines > AGE_MORT) return p;
  const rng = graine(`vieillir#${p.id}#${ageEnSemaines}`);
  // Décroissance géométrique : 2^-age, plus un peu de hasard.
  const facteur = Math.pow(0.5, ageEnSemaines) * (0.6 + rng() * 0.8);
  const vues = Math.round(p.vues * (1 + facteur));
  // Les likes suivent, mais un vieux post se like moins qu'il ne se lit.
  const likes = Math.round(p.likes + (vues - p.vues) * (0.015 + rng() * 0.03));
  const reposts = Math.round(p.reposts + (likes - p.likes) * (0.06 + rng() * 0.14));
  return { vues, likes: Math.max(p.likes, likes), reposts: Math.max(p.reposts, reposts) };
}

export function statsDePost(abonnes: number, rng: () => number, viralite = 1): StatsPost {
  const audience = Math.max(60, abonnes);
  // Un post touche 15 à 60 % de ses abonnés, plus une part de reprise
  // (hashtags, citations) : c'est là que naissent les gros scores.
  return statsDepuisVues(audience * (0.15 + rng() * 0.45) * viralite + 40 + rng() * 260, rng);
}

// --- PUBLIER ---------------------------------------------------------------

export interface Retombees {
  post: PostSocial;
  gainAbonnes: number; // NET : il peut être négatif après un dérapage
  desabonnes: number; // combien de comptes t'ont lâché à cause de ce post
  deltas: { reputation: number; moral: number; argent: number };
  coach: number;
  fans: number;
  sanction?: SanctionSociale & { titre: string; texte: string };
}

export function publierPost(
  j: Joueur, texte: string, tonId: string, idPost: string,
): Retombees {
  const ton = TON_PAR_ID[tonId] ?? TON_PAR_ID.humble;
  const rng = graine(idPost + texte);
  const abonnes = j.abonnes ?? 0;
  const traits = effetsTraits(j.traits);
  const sem = semaine(j.semaine ?? 1);

  // Portée : la base du ton, amplifiée par l'audience déjà acquise et par le
  // niveau du joueur. Un inconnu de Fédérale ne fait pas 200 000 vues.
  const notoriete = (j.reputation + (j.popularite ?? 50)) / 2;
  const portee = (0.4 + notoriete / 70) * (1 + abonnes / 40_000);
  const gainAbonnes = Math.round(ton.abonnes * portee * (0.6 + rng() * 0.9));
  const { vues, likes, reposts } = statsDePost(abonnes + 400, rng, portee);

  // Dérapage : le ton donne le risque de base, les mots interdits le font
  // exploser, un tempérament de sang chaud n'aide pas.
  const grossier = MOTS_INTERDITS.test(texte);
  const risque = Math.min(0.95, ton.risque * (traits.cartons ?? 1) + (grossier ? 0.55 : 0));
  const derape = rng() < risque;

  const hostiles = Math.min(0.9, ton.ratio + (grossier ? 0.25 : 0) - (j.popularite ?? 50) / 400);

  // ⚠️ LE NOMBRE DE RÉPONSES SUIT L'AUDIENCE (bug signalé : « max 4 commentaires
  // sous les posts »). C'était 3 à 5, quel que soit le nombre de vues : une
  // star à 500 000 vues récoltait autant de réponses qu'un joueur de Fédérale.
  // On monte jusqu'à douze, ce que le pool élargi de `data/social.ts` peut
  // maintenant alimenter sans se répéter.
  const nb = Math.min(
    COMPTES.length,
    vues > 200_000 ? 10 + Math.floor(rng() * 3)
      : vues > 60_000 ? 8 + Math.floor(rng() * 3)
        : vues > 15_000 ? 6 + Math.floor(rng() * 3)
          : vues > 4000 ? 4 + Math.floor(rng() * 3)
            : 3 + Math.floor(rng() * 3),
  );
  const dispo = [...COMPTES];
  const reponses: PostSocial[] = [];
  const dejaDit = new Set<string>();
  for (let i = 0; i < nb && dispo.length; i++) {
    const compte = dispo.splice(Math.floor(rng() * dispo.length), 1)[0];
    const hostile =
      compte.type === 'hater' ? rng() < 0.85 : compte.type === 'fan' ? rng() < hostiles * 0.7 : rng() < hostiles;
    const pool = reponsesSocialesTraduites(hostile)
      ?? (hostile ? REPONSES_NEGATIVES[compte.type] : REPONSES_POSITIVES[compte.type]);
    if (!pool?.length) continue;
    // Deux fois la même phrase sous le même post, ça se voit tout de suite.
    let texte = remplacer(piocher(pool, rng), j);
    for (let essai = 0; essai < 6 && dejaDit.has(texte); essai++) {
      texte = remplacer(piocher(pool, rng), j);
    }
    if (dejaDit.has(texte)) continue;
    dejaDit.add(texte);
    reponses.push({
      id: `${idPost}-r${i}`,
      auteur: compte.nom,
      pseudo: compte.pseudo,
      avatar: avatarPourCompte(compte.nom, compte.type === 'coequipier' ? 'joueur' : compte.type),
      certifie: compte.certifie,
      texte,
      saison: j.saison,
      semaine: j.semaine ?? 1,
      date: libelleDate(sem),
      hostile,
      // Une réponse est lue par une fraction de ceux qui ont vu le post.
      ...statsDepuisVues(vues * (0.05 + rng() * 0.2), rng),
    });
  }

  const post: PostSocial = {
    id: idPost,
    auteur: j.nom,
    pseudo: j.pseudo ?? pseudoDe(j.nom),
    avatar: 'moi',
    certifie: estCertifie(j),
    texte: texte.trim(),
    saison: j.saison,
    semaine: j.semaine ?? 1,
    date: libelleDate(sem),
    moi: true,
    ton: ton.id,
    likes, reposts, vues,
    reponses,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ⚠️ ON PERD DES ABONNÉS QUAND ON DIT N'IMPORTE QUOI (demande explicite).
  // Publier ne faisait QUE gagner des abonnés, quel que soit le contenu : on
  // pouvait insulter la terre entière et voir son compte grossir. Trois causes
  // de désabonnement, cumulables :
  //   • le DÉRAPAGE (le club convoque) : une vraie hémorragie ;
  //   • les MOTS INTERDITS, même sans dérapage : ça se voit tout de suite ;
  //   • une TIMELINE HOSTILE (un ton clivant sur un joueur peu populaire) :
  //     l'érosion lente, celle qu'on ne remarque qu'à la fin de la saison.
  // La perte est proportionnelle à l'audience : plus on est suivi, plus on a à
  // perdre. Un débutant à 200 abonnés ne perd pas 20 000 personnes.
  const partPerdue =
    (derape ? 0.06 + rng() * 0.07 : 0)
    + (grossier ? 0.03 + rng() * 0.04 : 0)
    + Math.max(0, hostiles - 0.4) * 0.06;
  const desabonnes = Math.round(abonnes * Math.min(0.22, partPerdue));

  const retombees: Retombees = {
    post,
    gainAbonnes: gainAbonnes - desabonnes,
    desabonnes,
    deltas: {
      reputation: ton.deltas.reputation ?? 0,
      moral: ton.deltas.moral ?? 0,
      argent: 0,
    },
    coach: ton.coach,
    fans: ton.fans,
  };

  if (derape) {
    const sanction = evaluerEmbrouilleSociale(j, texte, {
      canal: 'publication', cle: idPost, tonClash: ton.id === 'clash',
    });
    if (sanction) {
      const traduit = sanctionEmbrouilleSociale(j, sanction);
      retombees.sanction = { ...sanction, ...traduit };
    }
  }

  return retombees;
}

// --- TIMELINE D'AMBIANCE ---------------------------------------------------
// Des posts qui ne viennent pas du joueur, générés à partir de sa situation.
// Déterministes (graine = saison + semaine) : la timeline est stable tant que
// la semaine ne change pas, et se renouvelle à chaque semaine jouée.

export function feedAmbiance(j: Joueur, combien = 8): PostSocial[] {
  const posts: PostSocial[] = [];
  const ambiances = ambiancesSocialesTraduites() ?? AMBIANCE;
  const numero = j.semaine ?? 1;
  for (let k = 0; k < combien; k++) {
    // Une graine par semaine passée : on remonte le temps pour remplir la
    // timeline avec les semaines précédentes.
    const sem = Math.max(1, numero - k);
    const rng = graine(`ambiance#${j.saison}#${sem}#${k}#${j.club}`);
    const modele = piocher(ambiances, rng);
    const compte = piocher(comptesDe(modele.type), rng) ?? COMPTES[0];
    posts.push({
      id: `amb-${j.saison}-${sem}-${k}`,
      auteur: compte.nom,
      pseudo: compte.pseudo,
      avatar: avatarPourCompte(compte.nom, compte.type === 'coequipier' ? 'joueur' : compte.type),
      certifie: compte.certifie,
      texte: remplacer(modele.texte, j),
      saison: j.saison,
      semaine: sem,
      date: libelleDate(semaine(sem)),
      type: modele.type,
      ...statsDePost(audienceDe(modele.type), rng),
    });
  }
  return posts;
}

// --- TENDANCES -------------------------------------------------------------
// Le panneau de droite, façon « Tendances pour vous ».

export interface Tendance {
  categorie: string;
  sujet: string;
  volume: string;
}

export function tendances(j: Joueur): Tendance[] {
  const rng = graine(`tendances#${j.saison}#${j.semaine ?? 1}#${j.club}`);
  const sem = semaine(j.semaine ?? 1);
  const division = nomDivision(j.division ?? '');
  const brut: Tendance[] = [
    { categorie: t('ov.tendanceDivision', { division }), sujet: `#${j.club.replace(/[^A-Za-zÀ-ÿ0-9]/g, '')}`, volume: t('ov.nombrePosts', { n: compact(2000 + Math.floor(rng() * 60_000)) }) },
    { categorie: t('ov.tendanceRugby'), sujet: `#${sem.type === 'international' ? 'XVdeFrance' : sem.type === 'coupe' ? 'ChampionsCup' : 'JourneeDeChampionnat'}`, volume: t('ov.nombrePosts', { n: compact(8000 + Math.floor(rng() * 200_000)) }) },
    { categorie: t('ov.tendanceMercato'), sujet: '#Mercato', volume: t('ov.nombrePosts', { n: compact(4000 + Math.floor(rng() * 40_000)) }) },
    { categorie: t('ov.tendanceFrance'), sujet: '#ArbitrageVideo', volume: t('ov.nombrePosts', { n: compact(1000 + Math.floor(rng() * 25_000)) }) },
    { categorie: t('ov.tendanceSport'), sujet: `#${nomNationTraduit(j.nation).replace(/[^A-Za-zÀ-ÿ]/g, '')}`, volume: t('ov.nombrePosts', { n: compact(900 + Math.floor(rng() * 18_000)) }) },
  ];
  return brut;
}

// Comptes suggérés (« Abonnements suggérés »).
export function suggestions(j: Joueur): Compte[] {
  const rng = graine(`suggestions#${j.saison}#${j.club}`);
  const pool = COMPTES.filter((c) => c.type !== 'hater');
  const choisis: Compte[] = [];
  const copie = [...pool];
  for (let i = 0; i < 3 && copie.length; i++) {
    choisis.push(copie.splice(Math.floor(rng() * copie.length), 1)[0]);
  }
  return choisis;
}

// --- COMPTES À SUIVRE ------------------------------------------------------
//
// ⚠️ UNE SEULE SOURCE DE VÉRITÉ : L'ANNUAIRE (`lib/comptes.ts`).
// Cette fonction fabriquait ses propres comptes — pseudo calculé autrement
// (`pseudoDe` au lieu de `pseudoStable`) et abonnés inventés sur place
// (`600 + note²×3` pour un joueur, « 20 000 à 320 000 » pour un club, quel que
// soit son étage). Résultat vu en jeu : Explorer annonçait un chiffre, et le
// profil du même compte en annonçait un autre — quand il s'ouvrait, car le
// pseudo ne correspondait à aucune fiche de l'annuaire.
// On pioche désormais DANS l'annuaire : mêmes pseudos, mêmes abonnés, mêmes
// bios, mêmes bannières que partout ailleurs.
export function suggestionsLocales(j: Joueur, deja: CompteSuivi[]): CompteSuivi[] {
  const connus = new Set(deja.map((c) => c.pseudo));
  const rng = graine(`comptes#${j.saison}#${j.club}#${j.semaine ?? 1}`);
  const monde = annuaire(j).filter((c) => !connus.has(c.pseudo));
  const sortie: CompteSuivi[] = [];
  const ajouter = (c?: CompteSuivi) => {
    if (c && !sortie.some((x) => x.pseudo === c.pseudo)) sortie.push(c);
  };
  // Un tirage stable dans une famille, pour ne pas proposer six fois le même.
  const piocherParmi = (liste: CompteSuivi[], combien: number) => {
    const copie = [...liste];
    for (let i = 0; i < combien && copie.length; i++) {
      ajouter(copie.splice(Math.floor(rng() * copie.length), 1)[0]);
    }
  };

  // Trois coéquipiers (les cadres du groupe passent devant : l'annuaire range
  // l'effectif du joueur en tête de la famille « joueur »).
  piocherParmi(monde.filter((c) => c.type === 'joueur' && c.club === j.club).slice(0, 10), 2);
  // Un joueur d'un club rival.
  piocherParmi(monde.filter((c) => c.type === 'joueur' && c.club !== j.club).slice(0, 20), 1);
  // Son club, puis un rival de son championnat.
  ajouter(monde.find((c) => c.type === 'club' && c.nom === j.club));
  piocherParmi(monde.filter((c) => c.type === 'club' && c.nom !== j.club).slice(0, 12), 1);
  // La presse.
  piocherParmi(monde.filter((c) => c.type === 'journaliste' || c.type === 'media'), 1);
  // Et un supporter, pour que le fil ne soit pas qu'institutionnel.
  piocherParmi(monde.filter((c) => c.type === 'fan').slice(0, 20), 1);

  return sortie.slice(0, 6);
}
