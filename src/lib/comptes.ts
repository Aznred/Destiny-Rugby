// L'ANNUAIRE DE L'OVALE
//
// Tout le monde a un compte : chaque club (avec son écusson), chaque
// championnat (avec son logo), chaque joueur des effectifs (les tiens comme
// ceux d'en face), plus la presse et les supporters. C'est cet annuaire qui
// alimente la RECHERCHE, les PROFILS et l'activité automatique du réseau.
//
// Rien n'est stocké : tout est DÉTERMINISTE (nom du club, nom du joueur), donc
// deux ouvertures de l'écran donnent exactement les mêmes comptes.

import type { CompteSuivi, Joueur } from '../types';
import { COMPETITIONS, competitionDuClub } from '../data/clubs';
import { COUPES_EUROPE } from '../data/mondeReel';
import { effectifDuClub } from './effectif';
import { nomPoste } from '../data/rugby';
import { langueCourante, t } from './i18n';
import { COMPTES } from '../data/social';
import { graine } from './championnat';
import { avatarPourCompte, comptesLambda } from './avatars';

// Bannières possibles — choisies de façon déterministe. ⚠️ Elles étaient six :
// une bannière sur six comptes était identique à la précédente. Vingt motifs,
// dont des dégradés à trois arrêts et des trames, plus la bannière AUX COULEURS
// DU CLUB pour les clubs et leurs joueurs (voir `banniereDuClub`).
export const BANNIERES = [
  'linear-gradient(135deg,#0c2418,#237a44)',
  'linear-gradient(135deg,#1a1305,#e8b23a)',
  'linear-gradient(135deg,#0a1a2b,#1d9bf0)',
  'linear-gradient(135deg,#2b0a0a,#c1121f)',
  'linear-gradient(135deg,#160b2b,#7a3ff5)',
  'linear-gradient(135deg,#0b2b28,#00ba7c)',
  'linear-gradient(160deg,#04121c,#0d5c6b,#9ae6b4)',
  'linear-gradient(160deg,#1c0407,#7a1027,#f2a25c)',
  'linear-gradient(200deg,#101418,#2c3e50,#95a5a6)',
  'linear-gradient(135deg,#0d1b0f,#3f7a1e,#d9e64a)',
  'linear-gradient(135deg,#1b0f22,#54276f,#e0a6ff)',
  'linear-gradient(120deg,#00131f,#00527a,#7fd4ff)',
  'linear-gradient(120deg,#241a05,#8a6a12,#ffd97a)',
  'linear-gradient(135deg,#0a0a0a,#333333,#8c8c8c)',
  'linear-gradient(135deg,#12261f,#1f6f52,#7be2b8)',
  'linear-gradient(135deg,#2a1206,#a5490d,#ffb266)',
  'repeating-linear-gradient(45deg,#0c2418,#0c2418 12px,#123324 12px,#123324 24px)',
  'repeating-linear-gradient(-45deg,#1a0d1f,#1a0d1f 10px,#2a1533 10px,#2a1533 20px)',
  'radial-gradient(circle at 30% 20%,#1d9bf0,#0a1a2b 70%)',
  'radial-gradient(circle at 70% 30%,#e8b23a,#1a1305 70%)',
];

export function banniereDe(cle: string): string {
  const rng = graine('banniere#' + cle);
  return BANNIERES[Math.floor(rng() * BANNIERES.length)];
}

// La bannière AUX COULEURS DU CLUB : un compte de club ou de joueur porte les
// couleurs de son maillot, comme sur un vrai réseau.
export function banniereDuClub(nom: string): string {
  const club = competitionDuClub(nom)?.clubs.find((c) => c.nom === nom) as
    { c1?: string; c2?: string } | undefined;
  if (!club?.c1) return banniereDe(nom);
  const rng = graine('bcl#' + nom);
  const angle = 110 + Math.floor(rng() * 90);
  return `linear-gradient(${angle}deg, #0a0f0c, ${club.c1}, ${club.c2 ?? club.c1})`;
}

// ---------------------------------------------------------------------------
// ⚠️ LA NOTORIÉTÉ SUIT LA DIVISION, ET SEULEMENT ELLE
// ---------------------------------------------------------------------------
// Un club de Régionale 3 affichait jusqu'à 400 000 abonnés, autant que le Stade
// Toulousain, et un supporter anonyme 200 000. Demande explicite : « les clubs
// de régionale, fédérale ou nationale ne sont pas connus — 500 abonnés max en
// régionale, 3 000 en fédérale, 20 000 en nationale ».
//
// La table est indexée par le NIVEAU de la compétition (0 = élite mondiale,
// 1 = Top 14, 3 = Nationale, 5-7 = Fédérales, 8-10 = Régionales).
const ABONNES_CLUB: Record<number, [number, number]> = {
  0: [40_000, 600_000], 1: [60_000, 900_000], 2: [15_000, 90_000],
  3: [4_000, 20_000], 4: [1_200, 7_000], 5: [600, 3_000],
  6: [400, 2_000], 7: [250, 1_400], 8: [120, 700],
  9: [80, 550], 10: [60, 500],
};

// Un joueur ne dépasse jamais l'audience de son club — sauf les stars, qui la
// débordent largement. Facteur appliqué à l'audience du club.
function fourchette(niveau: number): [number, number] {
  return ABONNES_CLUB[Math.max(0, Math.min(10, niveau))] ?? ABONNES_CLUB[10];
}

export function niveauDuClub(nom: string): number {
  return competitionDuClub(nom)?.niveau ?? 8;
}

export function abonnesClub(nom: string): number {
  const [bas, haut] = fourchette(niveauDuClub(nom));
  const rng = graine('abonnesclub#' + nom);
  // Racine du tirage : la plupart des clubs sont près du bas de la fourchette,
  // quelques-uns tirent vers le haut. C'est la vraie forme d'une audience.
  return Math.round(bas + (haut - bas) * Math.pow(rng(), 1.7));
}

// L'audience d'un JOUEUR : sa note pèse, mais son étage pèse plus. Un pilier de
// Fédérale 2 noté 55 n'a pas 3 000 abonnés — il en a deux cents.
export function abonnesJoueur(nom: string, club: string, note: number): number {
  const [bas, haut] = fourchette(niveauDuClub(club));
  const rng = graine('abonnes#' + nom);
  // ⚠️ La courbe est TRÈS raide : seules les stars débordent l'audience de leur
  // club. Un joueur noté 60 au Stade Toulousain n'a pas 150 000 abonnés — il en
  // a quelques milliers. C'est l'exposant qui fait ça.
  const part = Math.min(1.4, Math.pow(Math.max(0, note - 25) / 62, 5.5)) * (0.5 + rng());
  const base = (bas + (haut - bas) * 0.45) * part;
  return Math.round(Math.max(30, base));
}

// ---------------------------------------------------------------------------
// L'AUDIENCE DU JOUEUR INCARNÉ
// ---------------------------------------------------------------------------
// ⚠️ Demande explicite : « les abonnements de notre joueur doivent augmenter en
// fonction du niveau et de la popularité du club où il va ». Son compteur ne
// bougeait QUE lorsqu'il publiait : on pouvait signer au Stade Toulousain et
// rester à 300 abonnés, ou descendre en Régionale 3 en en gardant 80 000.
//
// `abonnesCible` donne l'audience que MÉRITE le joueur — celle qu'aurait un
// joueur réel de son niveau, dans ce club-là (donc dans ce championnat-là),
// pondérée par sa réputation. Le store fait converger le compteur vers elle :
// vite à la hausse (on gagne des abonnés en signant à Toulouse), lentement à la
// baisse (une audience acquise ne s'évapore pas en une saison).
// ⚠️ Ce n'est PAS `abonnesJoueur` : la courbe de celui-ci est volontairement
// très raide (exposant 5,5) pour que les 6 306 joueurs réels restent anonymes
// — mais elle est plancherée à 30, si bien qu'un joueur incarné débutant en
// Top 14 et le même en Régionale 3 affichaient exactement le même chiffre, et
// que rien ne bougeait jamais. Ici, l'AUDIENCE DU CLUB (donc son étage) est le
// socle, et le niveau puis la réputation en prennent une part croissante.
export function abonnesCible(nom: string, club: string, note: number, reputation: number): number {
  const [bas, haut] = fourchette(niveauDuClub(club));
  const audienceClub = bas + (haut - bas) * 0.45;
  const niveau = Math.max(0, Math.min(1, (note - 25) / 60));
  const renom = Math.max(0, Math.min(1, (reputation ?? 0) / 100));
  // 0,4 % de l'audience du club pour un joueur du groupe, jusqu'à ~80 % pour
  // une star internationale : la hiérarchie tient à tous les étages.
  const part = 0.004 + Math.pow(niveau, 3.2) * 0.55 + Math.pow(renom, 3) * 0.25;
  const rng = graine('abonnesmoi#' + nom);
  return Math.round(Math.max(25, audienceClub * part * (0.8 + rng() * 0.4)));
}

// Un pas vers la cible. `part` = vitesse de rattrapage (0 à 1). La descente est
// trois fois plus lente que la montée.
export function rapprocherAbonnes(
  actuel: number, cible: number, part: number,
): number {
  const vitesse = cible >= actuel ? part : part / 3;
  return Math.max(0, Math.round(actuel + (cible - actuel) * vitesse));
}

// Identifiant @ propre et stable pour un nom donné.
export function pseudoStable(nom: string, suffixe = ''): string {
  const base = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 22);
  return (base || 'compte') + suffixe;
}

// ⚠️ PLUS DE BIO IDENTIQUE POUR TOUT LE MONDE. Chaque joueur avait « poste ·
// club · âge » et chaque supporter « Supporter. » : sur un réseau calqué sur X,
// ça se voit immédiatement. Les bios sont désormais tirées d'un pool, à la
// graine du nom — donc uniques, variées et stables.
const BIOS_JOUEUR = [
  'bio.joueur.0', 'bio.joueur.1', 'bio.joueur.2', 'bio.joueur.3', 'bio.joueur.4',
  'bio.joueur.5', 'bio.joueur.6', 'bio.joueur.7', 'bio.joueur.8', 'bio.joueur.9',
];

const BIOS_SUPPORTER = [
  'bio.supporter.0', 'bio.supporter.1', 'bio.supporter.2', 'bio.supporter.3', 'bio.supporter.4',
  'bio.supporter.5', 'bio.supporter.6', 'bio.supporter.7', 'bio.supporter.8', 'bio.supporter.9',
];

const BIOS_HATER = [
  'bio.hater.0', 'bio.hater.1', 'bio.hater.2',
  'bio.hater.3', 'bio.hater.4', 'bio.hater.5',
];

const TRIBUNES = ['Nord', 'Sud', 'Est', 'Ouest', 'Présidentielle', 'Populaire'];

function bioDe(pool: string[], cle: string, vars: Record<string, string | number>): string {
  const rng = graine('bio#' + cle);
  let texte = t(pool[Math.floor(rng() * pool.length)], vars);
  for (const k of Object.keys(vars)) texte = texte.split(`{${k}}`).join(String(vars[k]));
  return texte;
}

function compteJoueur(nom: string, club: string, poste: string, note: number, age: number): CompteSuivi {
  return {
    pseudo: pseudoStable(nom),
    nom,
    // ⚠️ Plus d'emoji : une vraie photo, stable pour ce nom (lib/avatars.ts).
    avatar: avatarPourCompte(nom, 'joueur'),
    type: 'joueur',
    club,
    bio: bioDe(BIOS_JOUEUR, nom, { poste: poste.toLowerCase(), club, age }),
    // ⚠️ La certification suit la NOTORIÉTÉ, pas seulement la note : un très
    // bon joueur de Fédérale n'est pas certifié sur X.
    certifie: note >= 78 && niveauDuClub(club) <= 2,
    abonnes: abonnesJoueur(nom, club, note),
    // Le joueur porte les couleurs de son club.
    banniere: banniereDuClub(club),
  };
}

function compteClub(nom: string): CompteSuivi {
  const comp = competitionDuClub(nom);
  // La VILLE entre dans la bio : c'est ce qui permet de trouver le Stade
  // Toulousain en cherchant « Toulouse ».
  const ville = comp?.clubs.find((c) => c.nom === nom)?.ville;
  const niveau = niveauDuClub(nom);
  return {
    pseudo: pseudoStable(nom, '_officiel'),
    nom,
    avatar: `club:${nom}`,
    type: 'club',
    club: nom,
    bio: `${t('bio.clubOfficiel', { club: nom })}${ville ? ` · ${ville}` : ''}. ${comp?.nom ?? ''}`,
    // Un club amateur n'a pas de coche bleue.
    certifie: niveau <= 3,
    abonnes: abonnesClub(nom),
    banniere: banniereDuClub(nom),
  };
}

const ABONNES_COMPETITION: Record<number, [number, number]> = {
  0: [200_000, 1_400_000], 1: [300_000, 900_000], 2: [60_000, 200_000],
  3: [20_000, 60_000], 4: [6_000, 20_000], 5: [3_000, 12_000],
  6: [2_000, 8_000], 7: [1_500, 6_000], 8: [800, 3_000],
  9: [600, 2_200], 10: [400, 1_800],
};

function compteCompetition(id: string, nom: string, desc: string, niveau = 1): CompteSuivi {
  const rng = graine('abonnescomp#' + id);
  const [bas, haut] = ABONNES_COMPETITION[Math.max(0, Math.min(10, niveau))] ?? ABONNES_COMPETITION[10];
  return {
    pseudo: pseudoStable(nom),
    nom,
    avatar: `compet:${id}`,
    type: 'competition',
    bio: desc,
    certifie: niveau <= 3,
    abonnes: Math.round(bas + (haut - bas) * Math.pow(rng(), 1.4)),
    banniere: banniereDe(id),
  };
}

// L'annuaire complet, mémoïsé par saison + club du joueur (l'effectif change).
const cache = new Map<string, CompteSuivi[]>();

export function annuaire(j: Joueur): CompteSuivi[] {
  const cle = `${j.club}#${j.saison}#${j.division}#${langueCourante()}`;
  const enCache = cache.get(cle);
  if (enCache) return enCache;

  const liste: CompteSuivi[] = [];
  const vus = new Set<string>();
  const ajouter = (c: CompteSuivi) => {
    if (vus.has(c.pseudo)) return;
    vus.add(c.pseudo);
    liste.push(c);
  };

  // 1. Les championnats et les coupes.
  for (const c of COMPETITIONS) ajouter(compteCompetition(c.id, c.nom, `${t('bio.competitionOfficielle')} · ${c.pays}`, c.niveau));
  for (const c of COUPES_EUROPE) ajouter(compteCompetition(c.id, c.nom, `${t('bio.competitionOfficielle')} · ${c.pays}`, 1));

  // 2. Les clubs du championnat du joueur, puis les autres clubs français.
  const sienne = COMPETITIONS.find((c) => c.id === j.division);
  for (const club of sienne?.clubs ?? []) ajouter(compteClub(club.nom));
  for (const comp of COMPETITIONS.filter((c) => c.id !== j.division && c.niveau <= 3)) {
    for (const club of comp.clubs) ajouter(compteClub(club.nom));
  }

  // 3. Les joueurs : ses coéquipiers d'abord, puis ceux des clubs rivaux.
  for (const co of effectifDuClub(j.club, j.saison)) {
    ajouter(compteJoueur(co.nom, j.club, nomPoste(co.poste), co.note, co.age));
  }
  for (const club of (sienne?.clubs ?? []).slice(0, 14)) {
    if (club.nom === j.club) continue;
    for (const co of effectifDuClub(club.nom, j.saison).slice(0, 8)) {
      ajouter(compteJoueur(co.nom, club.nom, nomPoste(co.poste), co.note, co.age));
    }
  }

  // 4. La presse et les supporters (pool pré-écrit).
  // ⚠️ Un supporter anonyme affichait jusqu'à 200 000 abonnés, autant qu'un
  // média national. Chaque famille a maintenant sa propre fourchette.
  const ABONNES: Record<string, [number, number]> = {
    media: [40_000, 500_000], journaliste: [4_000, 90_000],
    joueur: [500, 20_000], hater: [60, 4_000], fan: [30, 2_500],
  };
  for (const c of COMPTES) {
    const type = (c.type === 'coequipier' ? 'joueur' : c.type) as CompteSuivi['type'];
    const [bas, haut] = ABONNES[type] ?? ABONNES.fan;
    const rng = graine('ab#' + c.pseudo);
    const bio = c.type === 'journaliste'
      ? bioDe(
        ['bio.journaliste.0', 'bio.journaliste.1', 'bio.journaliste.2', 'bio.journaliste.3'],
        c.pseudo, { annees: 5 + Math.floor(rng() * 20) })
      : c.type === 'media'
        ? t('bio.media')
        : c.type === 'hater'
          ? bioDe(BIOS_HATER, c.pseudo, {})
          : bioDe(BIOS_SUPPORTER, c.pseudo, {
            club: j.club,
            annees: 2 + Math.floor(rng() * 30),
            tribune: t(`bio.tribune.${TRIBUNES[Math.floor(rng() * TRIBUNES.length)]}`),
            place: 1 + Math.floor(rng() * 40),
          });
    ajouter({
      pseudo: c.pseudo,
      nom: c.nom,
      avatar: avatarPourCompte(c.nom, type),
      type,
      bio,
      certifie: c.certifie,
      abonnes: Math.round(bas + (haut - bas) * Math.pow(rng(), 1.8)),
      banniere: banniereDe(c.pseudo),
    });
  }

  // 5. LES GENS ORDINAIRES. Un réseau social, ce n'est pas que des clubs et
  // des journalistes : c'est surtout des Jean-Michel qui commentent depuis leur
  // canapé. Deux vagues : les supporters de son club, ceux d'un rival.
  const rival = (sienne?.clubs ?? []).map((c) => c.nom).find((n) => n !== j.club);
  for (const club of [j.club, ...(rival ? [rival] : [])]) {
    for (const l of comptesLambda(club, club === j.club ? 26 : 12)) {
      ajouter({
        pseudo: l.pseudo,
        nom: l.nom,
        avatar: l.avatar,
        type: l.hater ? 'hater' : 'fan',
        club,
        bio: l.hater
          ? bioDe(BIOS_HATER, l.pseudo, {})
          : bioDe(BIOS_SUPPORTER, l.pseudo, {
            club,
            annees: 2 + Math.floor(graine('bioannees#' + l.pseudo)() * 30),
            tribune: t(`bio.tribune.${TRIBUNES[Math.floor(graine('biotribune#' + l.pseudo)() * TRIBUNES.length)]}`),
            place: 1 + Math.floor(graine('bioplace#' + l.pseudo)() * 40),
          }),
        abonnes: l.abonnes,
        banniere: banniereDe(l.pseudo),
      });
    }
  }

  cache.set(cle, liste);
  return liste;
}

export function comptePar(j: Joueur, pseudo: string): CompteSuivi | undefined {
  return annuaire(j).find((c) => c.pseudo === pseudo);
}

// LE BASSIN QUI ALIMENTE LE FIL
//
// ⚠️ L'annuaire est rangé par catégories : les 21 championnats, puis les 143
// clubs, puis les joueurs, puis la presse et les gens ordinaires. Les appelants
// en prenaient les 60 ou 80 premiers — c'est-à-dire QUE des institutions. D'où
// un fil où seuls des clubs publiaient, et des commentaires signés « Premiership
// Rugby Cup ». On compose donc un bassin ÉQUILIBRÉ, en piochant dans chaque
// famille, les comptes suivis en tête.
export function bassinSocial(j: Joueur, suivis: CompteSuivi[] = []): CompteSuivi[] {
  const monde = annuaire(j);
  const parType = (t: CompteSuivi['type'], n: number) =>
    monde.filter((c) => c.type === t).slice(0, n);

  const sortie: CompteSuivi[] = [];
  const vus = new Set<string>();
  const ajouter = (liste: CompteSuivi[]) => {
    for (const c of liste) {
      if (vus.has(c.pseudo)) continue;
      vus.add(c.pseudo);
      sortie.push(c);
    }
  };
  // Les comptes suivis comptent double : c'est eux qu'on veut lire.
  ajouter(suivis);
  ajouter(parType('club', 10));
  ajouter(parType('competition', 3));
  ajouter(parType('joueur', 30));
  ajouter(parType('journaliste', 8));
  ajouter(parType('media', 4));
  ajouter(parType('fan', 30));
  ajouter(parType('hater', 12));
  return sortie;
}

// --- RECHERCHE -------------------------------------------------------------
function sansAccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function chercherComptes(j: Joueur, requete: string, max = 12): CompteSuivi[] {
  const q = sansAccent(requete.trim().replace(/^@/, ''));
  if (!q) return [];
  return annuaire(j)
    .filter((c) => sansAccent(`${c.nom} ${c.pseudo} ${c.bio ?? ''}`).includes(q))
    // Les comptes les plus suivis d'abord : on cherche Toulouse, pas un cadet.
    .sort((a, b) => b.abonnes - a.abonnes)
    .slice(0, max);
}

export function chercherPosts<T extends { texte: string; auteur: string; pseudo: string }>(
  posts: T[], requete: string,
): T[] {
  const q = sansAccent(requete.trim().replace(/^#/, ''));
  if (!q) return [];
  return posts.filter((p) => sansAccent(`${p.texte} ${p.auteur} ${p.pseudo}`).includes(q));
}
