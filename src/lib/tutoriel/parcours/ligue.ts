// LES PARCOURS DE LA LIGUE EN LIGNE (Correctif 18) — compte, portail, club, packs, composition, marché, calendrier, direct.
//
// ⚠️ DE PETITES SECTIONS, CHACUNE QUI SE DÉCLENCHE TOUTE SEULE QUAND ON ARRIVE SUR SON ÉCRAN (jamais un grand tunnel). L'ordre naturel est
//    compte → portail → club → packs → composition, puis marché, calendrier et direct : chaque section finit sur un geste qui mène à la
//    suivante (ouvrir l'onglet Packs, puis Composition…).
// ⚠️ ON OUVRE UN VRAI PACK, GRATUIT, avec le vrai geste (déchirer, retourner les cartes) : c'est le vrai pack que le serveur attribue, pas une
//    démonstration. Rien n'est jamais simulé dans le tutoriel.
// ⚠️ LE MARCHÉ, LES ÉCHANGES ET LES OVAS NE S'EXPLIQUENT QU'APRÈS L'ÉQUIPE ET LES PACKS : sans cartes à vendre ni à composer, ils n'ont aucun sens.
// ⚠️ LA DÉCISION SUR PÉNALITÉ A UN CHRONO (20 s) : son tutoriel est « souple », sans voile ni blocage, il ne vole pas une seconde au joueur.

import { dejaVu, marquerVu } from '../memoire';
import { acteDepuisLEtape, ancrePresente, rejeuDemande } from '../guide';
import { cliquerLeSelecteur, ecranEst, remonter, stable } from '../aides';
import type { ParcoursTuto } from '../types';

const surLigue = (): boolean => ecranEst('carriereEnLigne');

/** Texte saisi dans le champ d'une ancre (`<label data-tuto><input/></label>`). */
const saisie = (ancre: string): string => {
  const champ = document.querySelector<HTMLInputElement>(`[data-tuto="${ancre}"] input`);
  return champ?.value.trim() ?? '';
};

const modaleDePackOuverte = (): boolean => document.querySelector('.pack-show') !== null;

export const PARCOURS_LIGUE: ParcoursTuto[] = [
  // ── Le compte : la porte d'entrée ────────────────────────────────────────
  {
    id: 'league.connexion',
    famille: 'league',
    priorite: 10,
    declencheur: () => surLigue() && ancrePresente('cel-connexion'),
    valide: () => surLigue() && ancrePresente('cel-connexion'),
    etapes: [
      { id: 'promesse', cible: 'cel-promesse', titre: true, icone: 'equipe', cote: 'bas' },
      {
        id: 'compte', type: 'action', cible: 'cel-auth', icone: 'profil', anim: 'clic', cote: 'gauche',
        jusqua: () => ancrePresente('cel-portail'),
      },
    ],
  },

  // ── Le portail : rejoindre ou créer, réglage de la ligue en petites étapes ──
  {
    id: 'league.portail',
    famille: 'league',
    priorite: 12,
    declencheur: () => {
      if (!surLigue()) return false;
      // Qui a déjà une ligue connaît le portail : on ne le lui explique pas, et on s'en souvient — sauf s'il a demandé à rejouer le guide.
      if (ancrePresente('cel-ligues-existantes') && !rejeuDemande('league')) { marquerVu('league.portail'); return false; }
      return ancrePresente('cel-portail');
    },
    valide: () => surLigue() && ancrePresente('cel-portail'),
    etapes: [
      { id: 'bienvenue', type: 'carte', titre: true, icone: 'equipe', avant: remonter },
      { id: 'public', cible: 'cel-public', icone: 'monde', cote: 'gauche', patience: 700 },
      { id: 'bascules', cible: 'cel-bascules', icone: 'lien', cote: 'bas' },
      {
        id: 'nomLigue', type: 'action', cible: 'cel-nom-ligue', icone: 'trophee', cote: 'bas', patience: 700,
        jusqua: stable(() => saisie('cel-nom-ligue').length >= 3, 1300),
      },
      {
        id: 'nomClub', type: 'action', cible: 'cel-nom-club', icone: 'stade', cote: 'bas', patience: 700,
        jusqua: stable(() => saisie('cel-nom-club').length >= 3, 1300),
      },
      { id: 'embleme', cible: 'cel-embleme', icone: 'medaille', cote: 'bas', patience: 700 },
      { id: 'participants', cible: 'cel-rythme-clubs', titre: true, icone: 'calendrier', cote: 'bas', patience: 700 },
      { id: 'ovas', cible: 'cel-ovas-depart', icone: 'ova', cote: 'bas', patience: 700 },
      { id: 'packsGratuits', cible: 'cel-packs-gratuits', icone: 'cadeau', cote: 'bas', patience: 700 },
      { id: 'packs', cible: 'cel-options-packs', icone: 'boutique', cote: 'haut', patience: 700 },
      { id: 'playoffs', cible: 'cel-playoffs', titre: true, icone: 'trophee', cote: 'haut', patience: 700 },
      { id: 'creer', type: 'clic', cible: 'cel-creer-ligue', icone: 'ballon', anim: 'clic', cote: 'haut', patience: 700 },
    ],
  },

  // ── Le club : le tour du bureau, puis l'onglet Packs ─────────────────────
  {
    id: 'league.club',
    famille: 'league',
    priorite: 20,
    declencheur: () => surLigue() && ancrePresente('cel-bureau'),
    valide: () => surLigue() && ancrePresente('cel-bureau'),
    etapes: [
      { id: 'bienvenue', type: 'carte', titre: true, icone: 'stade', avant: remonter },
      { id: 'entete', cible: 'cel-entete', icone: 'stade', cote: 'bas' },
      { id: 'onglets', cible: 'cel-onglets', icone: 'journal', cote: 'bas' },
      { id: 'vestiaire', cible: 'cel-vestiaire', titre: true, icone: 'maillot', cote: 'gauche' },
      { id: 'collectif', cible: 'cel-collectif', titre: true, icone: 'equipe', cote: 'bas' },
      { id: 'raretes', cible: 'cel-raretes', titre: true, icone: 'etoile', cote: 'bas' },
      { id: 'rendezvous', cible: 'cel-rendezvous', icone: 'calendrier', cote: 'bas' },
      { id: 'classement', cible: 'cel-classement', icone: 'resultats', cote: 'haut' },
      { id: 'packs', type: 'clic', cible: 'cel-onglet-packs', titre: true, icone: 'cadeau', anim: 'clic', cote: 'bas' },
    ],
  },

  // ── Les packs : un vrai pack gratuit, ouvert pour de vrai ────────────────
  {
    id: 'league.packs',
    famille: 'league',
    priorite: 22,
    declencheur: () => surLigue() && ancrePresente('cel-packs-quotidiens'),
    valide: () => surLigue() && (ancrePresente('cel-packs-quotidiens') || modaleDePackOuverte()),
    etapes: [
      { id: 'gratuits', cible: 'cel-packs-quotidiens', titre: true, icone: 'cadeau', cote: 'bas' },
      // Un pack gratuit s'il y en a (le premier lot tombe au coup d'envoi de la saison) ; sinon le Bronze, le moins cher, acheté avec les Ovas.
      {
        id: 'ouvrir', type: 'clic', cible: 'cel-pack-gratuit', titre: true, icone: 'cadeau', anim: 'clic', cote: 'bas',
        ignorerSi: () => !ancrePresente('cel-pack-gratuit'),
      },
      {
        id: 'acheter', type: 'action', cible: 'cel-boutique-packs', titre: true, icone: 'boutique', anim: 'glisse', cote: 'haut',
        ignorerSi: modaleDePackOuverte, jusqua: modaleDePackOuverte,
      },
      // ⚠️ LE PACK PEUT MONTER EN GAMME (Argent → Or) ET DEMANDER UN SECOND GESTE : l'étape dure jusqu'aux cartes, et se tait pendant les
      // animations (la cible disparaît, `facultative: false` la fait attendre) — le voile ne gâche pas le spectacle.
      {
        id: 'dechirer', type: 'action', cible: 'pack-ouvrir', icone: 'cadeau', anim: 'clic', cote: 'haut', facultative: false,
        jusqua: () => ancrePresente('pack-cartes') || !modaleDePackOuverte(),
      },
      { id: 'cartes', cible: 'pack-cartes', titre: true, icone: 'etoile', anim: 'retourne', cote: 'haut', patience: 12000 },
      {
        id: 'suite', type: 'action', cible: 'pack-suite', icone: 'check', cote: 'haut', patience: 5000,
        jusqua: () => !modaleDePackOuverte(),
      },
      { id: 'composition', type: 'clic', cible: 'cel-onglet-composition', titre: true, icone: 'equipe', anim: 'clic', cote: 'bas' },
    ],
  },

  // ── La composition : le même terrain que l'entraîneur, ses mêmes gestes ──
  {
    id: 'league.composition',
    famille: 'league',
    priorite: 24,
    declencheur: () => surLigue() && ancrePresente('cel-composition') && ancrePresente('compo-terrain'),
    valide: () => surLigue() && ancrePresente('cel-composition'),
    etapes: [
      { id: 'bienvenue', type: 'carte', titre: true, icone: 'equipe', avant: remonter },
      { id: 'terrain', cible: 'compo-terrain', titre: true, icone: 'equipe', cote: 'bas' },
      { id: 'carte', cible: 'compo-carte', icone: 'coeur', cote: 'droite', patience: 900 },
      { id: 'collectif', cible: 'cel-collectif-compo', titre: true, icone: 'equipe', cote: 'bas', patience: 900 },
      {
        id: 'selection', type: 'action', cible: 'compo-banc', titre: true, icone: 'joueur', anim: 'clic', cote: 'haut',
        jusqua: () => acteDepuisLEtape('compo.selection') || acteDepuisLEtape('compo.place'),
      },
      {
        id: 'placer', type: 'action', cible: 'compo-terrain', icone: 'equipe', anim: 'glisser', cote: 'bas',
        jusqua: () => acteDepuisLEtape('compo.place'),
      },
      { id: 'banc', cible: 'compo-banc', titre: true, icone: 'banc', cote: 'haut' },
      { id: 'assembler', cible: 'cel-assembler', icone: 'eclair', cote: 'bas', patience: 900 },
      { id: 'enregistrer', cible: 'cel-compo-enregistrer', titre: true, icone: 'disquette', cote: 'bas', patience: 900 },
      { id: 'consignes', cible: 'cel-consignes', icone: 'sifflet', cote: 'haut', patience: 900 },
    ],
  },

  // ── Le marché, les échanges, les Ovas : seulement après l'équipe et les packs ──
  {
    id: 'league.marche',
    famille: 'league',
    priorite: 30,
    declencheur: () => surLigue() && ancrePresente('cel-marche-onglets')
      && dejaVu('league.packs') && dejaVu('league.composition'),
    valide: () => surLigue() && ancrePresente('cel-marche-onglets'),
    etapes: [
      { id: 'bienvenue', type: 'carte', titre: true, icone: 'marche', avant: remonter },
      { id: 'onglets', cible: 'cel-marche-onglets', icone: 'marche', cote: 'bas' },
      { id: 'filtres', cible: 'cel-marche-filtres', icone: 'loupe', cote: 'bas' },
      {
        id: 'echanges', cible: 'cel-echange-formulaire', titre: true, icone: 'repost', cote: 'haut', patience: 1500,
        // Le troisième bouton de la barre secondaire : « Échanges ».
        avant: () => cliquerLeSelecteur('[data-tuto="cel-marche-onglets"] button:nth-child(3)'),
      },
      { id: 'ovas', cible: 'cel-ovas', titre: true, icone: 'ova', cote: 'bas' },
    ],
  },

  // ── Le calendrier : un match dure 80 minutes de vraie vie ────────────────
  {
    id: 'league.calendrier',
    famille: 'league',
    priorite: 32,
    declencheur: () => surLigue() && ancrePresente('cel-prochain'),
    valide: () => surLigue() && ancrePresente('cel-prochain'),
    etapes: [
      { id: 'prochain', cible: 'cel-prochain', titre: true, icone: 'chrono', cote: 'bas' },
      { id: 'agenda', cible: 'cel-agenda', icone: 'calendrier', cote: 'haut', patience: 800 },
    ],
  },

  // ── Le direct ────────────────────────────────────────────────────────────
  {
    id: 'league.direct',
    famille: 'league',
    priorite: 35,
    declencheur: () => surLigue() && ancrePresente('cel-direct'),
    valide: () => surLigue() && ancrePresente('cel-direct'),
    etapes: [
      { id: 'tableau', cible: 'cel-tableau-bord', titre: true, icone: 'chrono', cote: 'bas' },
      { id: 'onglets', cible: 'cel-direct-onglets', icone: 'journal', cote: 'bas' },
    ],
  },

  // ── La décision sur pénalité : un message SOUPLE, le chrono tourne ───────
  {
    id: 'league.decision',
    famille: 'league',
    priorite: 5,
    souple: true,
    declencheur: () => surLigue() && ancrePresente('cel-decision'),
    valide: () => surLigue() && ancrePresente('cel-decision'),
    etapes: [{ id: 'decision', titre: true, icone: 'cible' }],
  },
];
