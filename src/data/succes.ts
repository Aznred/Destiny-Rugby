// SUCCÈS ET DÉFIS (lot 7, point 24)
//
// Deux échelles de temps :
//
//   • les SUCCÈS jalonnent la carrière (premier match, premier titre, cent
//     matchs, international, millionnaire…). Ils tombent une fois, rapportent
//     des Ovas et racontent le chemin parcouru.
//   • les DÉFIS DE LA SEMAINE sont trois objectifs tirés au sort chaque semaine
//     de jeu (marquer un essai, s'entraîner, tenir une note de 7…). Ils
//     poussent à jouer la semaine plutôt qu'à cliquer « saison suivante ».
//
// ⚠️ Les récompenses restent VOLONTAIREMENT modestes : l'économie d'Ovas est
// dure (voir CLAUDE.md). Un succès = 2 à 20 Ovas, un défi = 1 à 3.

import type { Joueur, PostSocial, LegendeSauvegardee } from '../types';

export interface ContexteSucces {
  joueur: Joueur;
  posts: PostSocial[];
  abonnes: number;
  pantheon: LegendeSauvegardee[];
}

export interface Succes {
  id: string;
  emoji: string;
  nom: string;
  desc: string;
  ovas: number;
  secret?: boolean; // affiché « ??? » tant qu'il n'est pas débloqué
  atteint: (c: ContexteSucces) => boolean;
}

function gen(j: Joueur): number {
  const v = Object.values(j.attributs);
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

export const SUCCES: Succes[] = [
  // --- Premiers pas ---
  {
    id: 'premier_match', emoji: '👟', nom: 'Baptême du feu', ovas: 2,
    desc: 'Disputer son premier match officiel.',
    atteint: (c) => c.joueur.matchsJoues >= 1,
  },
  {
    id: 'premier_essai', emoji: '🏉', nom: 'Premier aplatissage', ovas: 3,
    desc: 'Marquer son premier essai.',
    atteint: (c) => c.joueur.essais >= 1,
  },
  {
    id: 'cinquante_matchs', emoji: '🎖️', nom: 'Cinquante feuilles de match', ovas: 5,
    desc: 'Atteindre 50 matchs en carrière.',
    atteint: (c) => c.joueur.matchsJoues >= 50,
  },
  {
    id: 'cent_matchs', emoji: '💯', nom: 'Centurion', ovas: 10,
    desc: 'Atteindre 100 matchs en carrière.',
    atteint: (c) => c.joueur.matchsJoues >= 100,
  },
  {
    id: 'deux_cents_matchs', emoji: '🗿', nom: 'Meuble du vestiaire', ovas: 16,
    desc: 'Atteindre 200 matchs en carrière.',
    atteint: (c) => c.joueur.matchsJoues >= 200,
  },
  {
    id: 'cinquante_essais', emoji: '⚡', nom: 'Finisseur', ovas: 8,
    desc: 'Inscrire 50 essais en carrière.',
    atteint: (c) => c.joueur.essais >= 50,
  },
  // --- Niveau ---
  {
    id: 'general_60', emoji: '📈', nom: 'Joueur confirmé', ovas: 5,
    desc: 'Atteindre 60 de note générale.',
    atteint: (c) => gen(c.joueur) >= 60,
  },
  {
    id: 'general_75', emoji: '🌟', nom: 'Cadre du championnat', ovas: 10,
    desc: 'Atteindre 75 de note générale.',
    atteint: (c) => gen(c.joueur) >= 75,
  },
  {
    id: 'general_88', emoji: '👑', nom: 'Classe mondiale', ovas: 20,
    desc: 'Atteindre 88 de note générale.',
    atteint: (c) => gen(c.joueur) >= 88,
  },
  {
    id: 'saison_parfaite', emoji: '🔥', nom: 'Saison référence', ovas: 8,
    desc: 'Terminer une saison avec une note de 8,5 ou plus.',
    atteint: (c) => (c.joueur.noteSaison ?? 0) >= 8.5,
  },
  // --- Palmarès ---
  {
    id: 'premier_titre', emoji: '🏆', nom: 'Premier trophée', ovas: 8,
    desc: 'Remporter un titre.',
    atteint: (c) => c.joueur.titres.length >= 1,
  },
  {
    id: 'cinq_titres', emoji: '🏛️', nom: 'Armoire à trophées', ovas: 18,
    desc: 'Remporter 5 titres en carrière.',
    atteint: (c) => c.joueur.titres.length >= 5,
  },
  {
    id: 'top14', emoji: '🇫🇷', nom: 'L’élite', ovas: 12,
    desc: 'Évoluer en Top 14.',
    atteint: (c) => c.joueur.division === 'top14',
  },
  {
    id: 'international', emoji: '🎽', nom: 'Première cape', ovas: 12,
    desc: 'Honorer une sélection nationale.',
    atteint: (c) => (c.joueur.selections ?? 0) >= 1,
  },
  {
    id: 'cinquante_capes', emoji: '🦁', nom: 'Cinquante sélections', ovas: 20,
    desc: 'Atteindre 50 capes internationales.',
    atteint: (c) => (c.joueur.selections ?? 0) >= 50,
  },
  {
    id: 'capitaine', emoji: '🅲', nom: 'Le brassard', ovas: 8,
    desc: 'Devenir capitaine de son club.',
    atteint: (c) => !!c.joueur.capitaine,
  },
  // --- Vie de joueur ---
  {
    id: 'expatrie', emoji: '✈️', nom: 'Expatrié', ovas: 8,
    desc: 'Signer dans un championnat étranger.',
    atteint: (c) => !!c.joueur.division && !DIVISIONS_FRANCE.has(c.joueur.division),
  },
  {
    id: 'millionnaire', emoji: '💰', nom: 'Le contrat de sa vie', ovas: 10,
    desc: 'Posséder un million d’euros.',
    atteint: (c) => c.joueur.argent >= 1_000_000,
  },
  {
    id: 'mille_plaquages', emoji: '🛡️', nom: 'Mur porteur', ovas: 8,
    desc: 'Réussir 1 000 plaquages en carrière.',
    atteint: (c) => (c.joueur.stats?.plaquages ?? 0) >= 1000,
  },
  {
    id: 'cent_grattages', emoji: '🦅', nom: 'Rapace du ruck', ovas: 8,
    desc: 'Gratter 100 ballons en carrière.',
    atteint: (c) => (c.joueur.stats?.grattages ?? 0) >= 100,
  },
  {
    id: 'mentor', emoji: '🧑‍🏫', nom: 'Passeur de témoin', ovas: 5,
    desc: 'Prendre un jeune sous son aile.',
    atteint: (c) => !!c.joueur.mentorat,
  },
  {
    id: 'vestiaire', emoji: '🤝', nom: 'Âme du vestiaire', ovas: 6,
    desc: 'Compter 5 amis dans le vestiaire.',
    atteint: (c) => (c.joueur.relations ?? []).filter((r) => r.type === 'ami').length >= 5,
  },
  {
    id: 'legende', emoji: '🗿', nom: 'Entrer au Hall', ovas: 15,
    desc: 'Raccrocher les crampons et rejoindre le Hall des Légendes.',
    atteint: (c) => c.pantheon.some((l) => !l.fictif),
  },
  // --- Réseau social ---
  {
    id: 'premier_post', emoji: '📱', nom: 'Bienvenue sur L’Ovale', ovas: 2,
    desc: 'Publier son premier message.',
    atteint: (c) => c.posts.some((p) => p.moi),
  },
  {
    id: 'dix_mille', emoji: '📣', nom: 'Suivi', ovas: 5,
    desc: 'Dépasser 10 000 abonnés.',
    atteint: (c) => c.abonnes >= 10_000,
  },
  {
    id: 'cent_mille', emoji: '🚀', nom: 'Star des réseaux', ovas: 12,
    desc: 'Dépasser 100 000 abonnés.',
    atteint: (c) => c.abonnes >= 100_000,
  },
  {
    id: 'million_abonnes', emoji: '💫', nom: 'Phénomène', ovas: 20, secret: true,
    desc: 'Dépasser un million d’abonnés.',
    atteint: (c) => c.abonnes >= 1_000_000,
  },
  {
    id: 'clash', emoji: '🔥', nom: 'Ça a beaucoup tourné', ovas: 4, secret: true,
    desc: 'Publier un message qui te vaut une convocation du club.',
    atteint: (c) => c.posts.some((p) => p.moi && p.ton === 'clash'),
  },
  {
    id: 'viral', emoji: '📺', nom: 'Un million de vues', ovas: 8,
    desc: 'Publier un message dépassant le million de vues.',
    atteint: (c) => c.posts.some((p) => p.moi && p.vues >= 1_000_000),
  },

  // ═══ PALMARÈS — LES TROPHÉES, ET AVEC QUI ON LES A GAGNÉS ═══════════════
  // ⚠️ Demande explicite : « rajouter des achievements au niveau de gagner
  // certains trophées, faire des palmarès avec certains clubs etc. »
  // Ces succès-là lisent `Joueur.palmares` (types.ts), qui enregistre pour
  // chaque titre son trophée, sa saison ET son club — `titres` n'était qu'une
  // liste de libellés, on ne pouvait rien en tirer.
  {
    id: 'brennus', emoji: '🛡️', nom: 'Le Bouclier', ovas: 16,
    desc: 'Soulever le Bouclier de Brennus.',
    atteint: (c) => aGagne(c, 'brennus'),
  },
  {
    id: 'brennus_trois', emoji: '🏰', nom: 'Dynastie', ovas: 30, secret: true,
    desc: 'Remporter trois fois le Bouclier de Brennus.',
    atteint: (c) => combien(c, 'brennus') >= 3,
  },
  {
    id: 'champions_cup', emoji: '⭐', nom: 'Roi d’Europe', ovas: 18,
    desc: 'Remporter la Champions Cup.',
    atteint: (c) => aGagne(c, 'champions'),
  },
  {
    id: 'doublette_europe', emoji: '🌍', nom: 'Les deux coupes', ovas: 20,
    desc: 'Remporter la Champions Cup ET la Challenge Cup au cours de sa carrière.',
    atteint: (c) => aGagne(c, 'champions') && aGagne(c, 'challenge'),
  },
  {
    id: 'doublette_saison', emoji: '💫', nom: 'Le doublé', ovas: 26, secret: true,
    desc: 'Remporter le championnat ET une coupe d’Europe la même saison.',
    atteint: (c) => {
      const p = palmares(c);
      return p.some((t) => TITRES_NATIONAUX.has(t.trophee)
        && p.some((u) => u.saison === t.saison && TITRES_EUROPE.has(u.trophee)));
    },
  },
  {
    id: 'six_nations', emoji: '🎽', nom: 'Vainqueur du Tournoi', ovas: 20,
    desc: 'Remporter le Tournoi des 6 Nations avec ta sélection.',
    atteint: (c) => aGagne(c, 'sixNations'),
  },
  {
    id: 'coupe_du_monde', emoji: '🏆', nom: 'Champion du monde', ovas: 40, secret: true,
    desc: 'Soulever la Coupe du monde.',
    atteint: (c) => aGagne(c, 'monde'),
  },
  {
    id: 'meilleur_joueur', emoji: '🥇', nom: 'Meilleur joueur du monde', ovas: 35, secret: true,
    desc: 'Être élu meilleur joueur du monde.',
    atteint: (c) => aGagne(c, 'meilleurJoueur'),
  },
  {
    id: 'palmares_deux_clubs', emoji: '🧳', nom: 'Champion partout', ovas: 18,
    desc: 'Remporter un titre avec deux clubs différents.',
    atteint: (c) => clubsTitres(c).size >= 2,
  },
  {
    id: 'palmares_trois_clubs', emoji: '🗺️', nom: 'Mercenaire couronné', ovas: 28, secret: true,
    desc: 'Remporter un titre avec trois clubs différents.',
    atteint: (c) => clubsTitres(c).size >= 3,
  },
  {
    id: 'fidele_trois_titres', emoji: '❤️', nom: 'Homme d’un seul club', ovas: 24,
    desc: 'Remporter trois titres avec le MÊME club.',
    atteint: (c) => {
      const parClub = new Map<string, number>();
      for (const t of palmares(c)) if (t.club) parClub.set(t.club, (parClub.get(t.club) ?? 0) + 1);
      return [...parClub.values()].some((n) => n >= 3);
    },
  },
  {
    id: 'gravir_pyramide', emoji: '🪜', nom: 'De la Fédérale à l’élite', ovas: 30, secret: true,
    desc: 'Être champion d’au moins trois divisions françaises différentes.',
    atteint: (c) => {
      const etages = new Set(
        palmares(c).filter((t) => TITRES_FRANCE.has(t.trophee)).map((t) => t.trophee),
      );
      return etages.size >= 3;
    },
  },
  {
    id: 'dix_titres', emoji: '🏛️', nom: 'Collectionneur', ovas: 30,
    desc: 'Remporter 10 titres en carrière.',
    atteint: (c) => c.joueur.titres.length >= 10,
  },
  {
    id: 'titre_a_letranger', emoji: '🌐', nom: 'Champion hors de France', ovas: 20,
    desc: 'Être champion d’un championnat étranger.',
    atteint: (c) => palmares(c).some((t) => TITRES_MONDE.has(t.trophee)),
  },
  {
    id: 'trois_saisons_de_suite', emoji: '🔁', nom: 'Trois de suite', ovas: 26, secret: true,
    desc: 'Remporter un titre trois saisons consécutives.',
    atteint: (c) => {
      const saisons = [...new Set(palmares(c).map((t) => t.saison))].sort((a, b) => a - b);
      for (let i = 0; i + 2 < saisons.length; i++) {
        if (saisons[i + 1] === saisons[i] + 1 && saisons[i + 2] === saisons[i] + 2) return true;
      }
      return false;
    },
  },
];

// --- Aides de lecture du palmarès ------------------------------------------
function palmares(c: ContexteSucces) {
  return c.joueur.palmares ?? [];
}
function combien(c: ContexteSucces, trophee: string): number {
  return palmares(c).filter((t) => t.trophee === trophee).length;
}
function aGagne(c: ContexteSucces, trophee: string): boolean {
  return combien(c, trophee) > 0;
}
function clubsTitres(c: ContexteSucces): Set<string> {
  // Les titres INTERNATIONAUX (Tournoi, Coupe du monde, meilleur joueur) ne se
  // gagnent pas avec un club : ils ne comptent pas ici.
  return new Set(
    palmares(c)
      .filter((t) => t.club && !TITRES_INTERNATIONAUX.has(t.trophee))
      .map((t) => t.club),
  );
}

// Les familles de trophées (ids de `data/trophees.ts`).
const TITRES_FRANCE = new Set(['brennus', 'prod2', 'nationale', 'nationale2', 'federale', 'regionale']);
const TITRES_EUROPE = new Set(['champions', 'challenge', 'premCup']);
const TITRES_MONDE = new Set(['premiership', 'championship', 'urc', 'super', 'npc', 'japon', 'mlr']);
const TITRES_INTERNATIONAUX = new Set(['sixNations', 'monde', 'meilleurJoueur']);
const TITRES_NATIONAUX = new Set([...TITRES_FRANCE, ...TITRES_MONDE]);

// Divisions françaises : sert au succès « Expatrié ».
const DIVISIONS_FRANCE = new Set([
  'top14', 'prod2', 'nationale', 'nationale2',
  'fed1', 'fed2', 'fed3', 'reg1', 'reg2', 'reg3',
]);

export const SUCCES_PAR_ID: Record<string, Succes> = Object.fromEntries(
  SUCCES.map((s) => [s.id, s]),
);

// --- DÉFIS DE LA SEMAINE ---------------------------------------------------
// Chaque défi est validé par un ÉVÉNEMENT signalé par le store (le joueur a
// marqué, s'est entraîné, a publié…). Pas de condition à recalculer : la
// semaine coche, ou ne coche pas.

export type EvenementDefi =
  | 'match' | 'essai' | 'note7' | 'note8' | 'victoire' | 'entrainement'
  | 'post' | 'plaquages' | 'transformation' | 'cape' | 'situation';

export interface Defi {
  id: EvenementDefi;
  emoji: string;
  texte: string;
  ovas: number;
}

export const DEFIS: Defi[] = [
  { id: 'match', emoji: '👟', texte: 'Disputer un match cette semaine', ovas: 1 },
  { id: 'essai', emoji: '🏉', texte: 'Marquer un essai', ovas: 3 },
  { id: 'note7', emoji: '⭐', texte: 'Obtenir une note de 7 ou plus', ovas: 2 },
  { id: 'note8', emoji: '🌟', texte: 'Obtenir une note de 8 ou plus', ovas: 3 },
  { id: 'victoire', emoji: '✅', texte: 'Gagner avec ton club', ovas: 2 },
  { id: 'entrainement', emoji: '💪', texte: 'Faire ta séance d’entraînement', ovas: 1 },
  { id: 'post', emoji: '📱', texte: 'Publier sur L’Ovale', ovas: 1 },
  { id: 'plaquages', emoji: '🛡️', texte: 'Réussir 8 plaquages dans un match', ovas: 2 },
  { id: 'transformation', emoji: '🎯', texte: 'Réussir un tir au but', ovas: 2 },
  { id: 'situation', emoji: '🎬', texte: 'Vivre une situation de carrière', ovas: 1 },
];

export const DEFI_PAR_ID: Record<string, Defi> = Object.fromEntries(
  DEFIS.map((d) => [d.id, d]),
);
