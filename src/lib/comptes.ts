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
import { POSTE_PAR_ID } from '../data/rugby';
import { COMPTES } from '../data/social';
import { graine } from './championnat';
import { avatarPourCompte, comptesLambda } from './avatars';

// Bannières possibles (dégradés) — choisies de façon déterministe.
export const BANNIERES = [
  'linear-gradient(135deg,#0c2418,#237a44)',
  'linear-gradient(135deg,#1a1305,#e8b23a)',
  'linear-gradient(135deg,#0a1a2b,#1d9bf0)',
  'linear-gradient(135deg,#2b0a0a,#c1121f)',
  'linear-gradient(135deg,#160b2b,#7a3ff5)',
  'linear-gradient(135deg,#0b2b28,#00ba7c)',
];

export function banniereDe(cle: string): string {
  const rng = graine('banniere#' + cle);
  return BANNIERES[Math.floor(rng() * BANNIERES.length)];
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

function compteJoueur(nom: string, club: string, poste: string, note: number, age: number): CompteSuivi {
  const rng = graine('abonnes#' + nom);
  return {
    pseudo: pseudoStable(nom),
    nom,
    // ⚠️ Plus d'emoji : une vraie photo, stable pour ce nom (lib/avatars.ts).
    avatar: avatarPourCompte(nom, 'joueur'),
    type: 'joueur',
    club,
    bio: `${poste} · ${club} · ${age} ans`,
    certifie: note >= 78,
    abonnes: Math.round(300 + note * note * (1 + rng())),
    banniere: banniereDe(nom),
  };
}

function compteClub(nom: string): CompteSuivi {
  const comp = competitionDuClub(nom);
  const rng = graine('abonnesclub#' + nom);
  // La VILLE entre dans la bio : c'est ce qui permet de trouver le Stade
  // Toulousain en cherchant « Toulouse ».
  const ville = comp?.clubs.find((c) => c.nom === nom)?.ville;
  return {
    pseudo: pseudoStable(nom, '_officiel'),
    nom,
    avatar: `club:${nom}`,
    type: 'club',
    club: nom,
    bio: `Compte officiel du ${nom}${ville ? ` · ${ville}` : ''}. ${comp?.nom ?? ''}`,
    certifie: true,
    abonnes: Math.round(8000 + rng() * 400_000),
    banniere: banniereDe(nom),
  };
}

function compteCompetition(id: string, nom: string, desc: string): CompteSuivi {
  const rng = graine('abonnescomp#' + id);
  return {
    pseudo: pseudoStable(nom),
    nom,
    avatar: `compet:${id}`,
    type: 'competition',
    bio: desc,
    certifie: true,
    abonnes: Math.round(50_000 + rng() * 900_000),
    banniere: banniereDe(id),
  };
}

// L'annuaire complet, mémoïsé par saison + club du joueur (l'effectif change).
const cache = new Map<string, CompteSuivi[]>();

export function annuaire(j: Joueur): CompteSuivi[] {
  const cle = `${j.club}#${j.saison}#${j.division}`;
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
  for (const c of COMPETITIONS) ajouter(compteCompetition(c.id, c.nom, `Compte officiel · ${c.pays}`));
  for (const c of COUPES_EUROPE) ajouter(compteCompetition(c.id, c.nom, c.desc));

  // 2. Les clubs du championnat du joueur, puis les autres clubs français.
  const sienne = COMPETITIONS.find((c) => c.id === j.division);
  for (const club of sienne?.clubs ?? []) ajouter(compteClub(club.nom));
  for (const comp of COMPETITIONS.filter((c) => c.id !== j.division && c.niveau <= 3)) {
    for (const club of comp.clubs) ajouter(compteClub(club.nom));
  }

  // 3. Les joueurs : ses coéquipiers d'abord, puis ceux des clubs rivaux.
  for (const co of effectifDuClub(j.club, j.saison)) {
    ajouter(compteJoueur(co.nom, j.club, POSTE_PAR_ID[co.poste].nom, co.note, co.age));
  }
  for (const club of (sienne?.clubs ?? []).slice(0, 14)) {
    if (club.nom === j.club) continue;
    for (const co of effectifDuClub(club.nom, j.saison).slice(0, 8)) {
      ajouter(compteJoueur(co.nom, club.nom, POSTE_PAR_ID[co.poste].nom, co.note, co.age));
    }
  }

  // 4. La presse et les supporters (pool pré-écrit).
  for (const c of COMPTES) {
    const type = (c.type === 'coequipier' ? 'joueur' : c.type) as CompteSuivi['type'];
    ajouter({
      pseudo: c.pseudo,
      nom: c.nom,
      avatar: avatarPourCompte(c.nom, type),
      type,
      bio: c.type === 'journaliste' ? 'Journaliste rugby.' : c.type === 'media' ? 'Média rugby.' : 'Supporter.',
      certifie: c.certifie,
      abonnes: Math.round(2000 + graine('ab#' + c.pseudo)() * 200_000),
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
        bio: l.bio,
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
