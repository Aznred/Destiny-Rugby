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

import type { CompteSuivi, Joueur, PostSocial } from '../types';
import {
  AMBIANCE, COMPTES, MOTS_INTERDITS, REPONSES_NEGATIVES, REPONSES_POSITIVES,
  TON_PAR_ID, type Compte, type TypeCompte,
} from '../data/social';
import { graine } from './championnat';
import { libelleDate, semaine } from '../data/calendrier';
import { effetsTraits } from '../data/traits';
import { nomDivision } from './promotion';
import { POSTE_PAR_ID } from '../data/rugby';
import { COMPETITIONS } from '../data/clubs';
import { effectifDuClub } from './effectif';
import { nomNation } from '../components/Drapeau';
import { avatarPourCompte } from './avatars';

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

export const AUDIENCE_PAR_TYPE: Record<string, number> = {
  selection: 320_000, competition: 240_000, media: 120_000, club: 70_000,
  journaliste: 45_000, joueur: 18_000, hater: 1_600, fan: 900,
};

export function audienceDe(type: string | undefined, abonnes?: number): number {
  if (abonnes && abonnes > 0) return abonnes;
  return AUDIENCE_PAR_TYPE[type ?? 'fan'] ?? 3000;
}

export interface StatsPost { vues: number; likes: number; reposts: number }

export function statsDepuisVues(vues: number, rng: () => number): StatsPost {
  const v = Math.max(12, Math.round(vues));
  const likes = Math.round(v * (0.025 + rng() * 0.04));
  return { vues: v, likes, reposts: Math.round(likes * (0.08 + rng() * 0.16)) };
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
  gainAbonnes: number;
  deltas: { reputation: number; moral: number; argent: number };
  coach: number;
  fans: number;
  sanction?: { titre: string; texte: string; amende: number };
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

  // Réponses : entre 3 et 5, choisies parmi des comptes distincts.
  const nb = 3 + Math.floor(rng() * 3);
  const dispo = [...COMPTES];
  const reponses: PostSocial[] = [];
  for (let i = 0; i < nb && dispo.length; i++) {
    const compte = dispo.splice(Math.floor(rng() * dispo.length), 1)[0];
    const hostile =
      compte.type === 'hater' ? rng() < 0.85 : compte.type === 'fan' ? rng() < hostiles * 0.7 : rng() < hostiles;
    const pool = hostile ? REPONSES_NEGATIVES[compte.type] : REPONSES_POSITIVES[compte.type];
    if (!pool?.length) continue;
    reponses.push({
      id: `${idPost}-r${i}`,
      auteur: compte.nom,
      pseudo: compte.pseudo,
      avatar: avatarPourCompte(compte.nom, compte.type === 'coequipier' ? 'joueur' : compte.type),
      certifie: compte.certifie,
      texte: remplacer(piocher(pool, rng), j),
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

  const retombees: Retombees = {
    post,
    gainAbonnes,
    deltas: {
      reputation: ton.deltas.reputation ?? 0,
      moral: ton.deltas.moral ?? 0,
      argent: 0,
    },
    coach: ton.coach,
    fans: ton.fans,
  };

  if (derape) {
    // Le club convoque. L'amende suit le salaire : elle doit piquer à tous
    // les étages de la pyramide.
    const amende = Math.max(150, Math.round((j.contrat?.salaire ?? 12_000) * 0.06));
    retombees.sanction = {
      titre: '⚠️ Convoqué par le club',
      texte: grossier
        ? `Ton message a fait le tour du championnat avant midi. ${j.club} publie un communiqué, te met à l’amende de ${amende.toLocaleString('fr-FR')} € et te rappelle « ce que représente le maillot ».`
        : `Le service com’ de ${j.club} n’a pas apprécié. Amende interne de ${amende.toLocaleString('fr-FR')} €, et une discussion très fraîche avec le staff.`,
      amende,
    };
    retombees.deltas.argent = -amende;
    retombees.deltas.moral -= 6;
    retombees.coach -= 12;
    retombees.deltas.reputation -= 2;
  }

  return retombees;
}

// --- TIMELINE D'AMBIANCE ---------------------------------------------------
// Des posts qui ne viennent pas du joueur, générés à partir de sa situation.
// Déterministes (graine = saison + semaine) : la timeline est stable tant que
// la semaine ne change pas, et se renouvelle à chaque semaine jouée.

export function feedAmbiance(j: Joueur, combien = 8): PostSocial[] {
  const posts: PostSocial[] = [];
  const numero = j.semaine ?? 1;
  for (let k = 0; k < combien; k++) {
    // Une graine par semaine passée : on remonte le temps pour remplir la
    // timeline avec les semaines précédentes.
    const sem = Math.max(1, numero - k);
    const rng = graine(`ambiance#${j.saison}#${sem}#${k}#${j.club}`);
    const modele = piocher(AMBIANCE, rng);
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
    { categorie: `${division} · Tendance`, sujet: `#${j.club.replace(/[^A-Za-zÀ-ÿ0-9]/g, '')}`, volume: `${compact(2000 + Math.floor(rng() * 60_000))} posts` },
    { categorie: 'Rugby · Tendance', sujet: `#${sem.type === 'international' ? 'XVdeFrance' : sem.type === 'coupe' ? 'ChampionsCup' : 'JourneeDeChampionnat'}`, volume: `${compact(8000 + Math.floor(rng() * 200_000))} posts` },
    { categorie: 'Mercato', sujet: '#Mercato', volume: `${compact(4000 + Math.floor(rng() * 40_000))} posts` },
    { categorie: 'Tendance en France', sujet: '#ArbitrageVideo', volume: `${compact(1000 + Math.floor(rng() * 25_000))} posts` },
    { categorie: 'Sport · Tendance', sujet: `#${nomNation(j.nation).replace(/[^A-Za-zÀ-ÿ]/g, '')}`, volume: `${compact(900 + Math.floor(rng() * 18_000))} posts` },
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

// --- COMPTES À SUIVRE, SANS IA --------------------------------------------
// Le repli hors ligne de `comptesGroq` : de VRAIS comptes, construits à partir
// du monde du jeu — tes coéquipiers, les clubs de ton championnat, la presse.
export function suggestionsLocales(j: Joueur, deja: CompteSuivi[]): CompteSuivi[] {
  const connus = new Set(deja.map((c) => c.pseudo));
  const rng = graine(`comptes#${j.saison}#${j.club}#${j.semaine ?? 1}`);
  const sortie: CompteSuivi[] = [];

  const ajouter = (c: CompteSuivi) => {
    if (!connus.has(c.pseudo) && !sortie.some((x) => x.pseudo === c.pseudo)) sortie.push(c);
  };

  // Trois coéquipiers, dont les cadres du groupe.
  const groupe = [...effectifDuClub(j.club, j.saison)].sort((a, b) => b.note - a.note);
  for (const co of groupe.slice(0, 8).sort(() => rng() - 0.5).slice(0, 3)) {
    ajouter({
      pseudo: pseudoDe(co.nom).replace(/_\d+$/, ''),
      nom: co.nom,
      avatar: avatarPourCompte(co.nom, 'joueur'),
      type: 'joueur',
      club: j.club,
      bio: `${POSTE_PAR_ID[co.poste].nom} de ${j.club}. ${co.age} ans.`,
      certifie: co.note >= 78,
      abonnes: Math.round(600 + co.note * co.note * 3),
    });
  }

  // Deux clubs du championnat : le sien et un rival.
  const division = COMPETITIONS.find((c) => c.id === j.division);
  const clubs = [j.club, ...(division?.clubs ?? []).map((c) => c.nom).filter((n) => n !== j.club)];
  for (const nom of [clubs[0], clubs[1 + Math.floor(rng() * Math.max(1, clubs.length - 1))]]) {
    if (!nom) continue;
    ajouter({
      pseudo: pseudoDe(nom).replace(/_\d+$/, '') + '_officiel',
      nom,
      avatar: `club:${nom}`,
      type: 'club',
      club: nom,
      bio: `Compte officiel · ${division?.nom ?? 'Championnat'}`,
      certifie: true,
      abonnes: Math.round(20_000 + rng() * 300_000),
    });
  }

  // Un journaliste et un média.
  for (const c of COMPTES.filter((c) => c.type === 'journaliste' || c.type === 'media').slice(0, 6)) {
    ajouter({
      pseudo: c.pseudo, nom: c.nom, avatar: c.avatar, type: c.type as CompteSuivi['type'],
      bio: 'Suit le championnat au quotidien.', certifie: c.certifie, abonnes: Math.round(30_000 + rng() * 150_000),
    });
    if (sortie.length >= 6) break;
  }
  return sortie.slice(0, 6);
}
