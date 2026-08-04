import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Attributs,
  Ecran,
  EntreeJournal,
  Joueur,
  LegendeSauvegardee,
  BilanEnCours,
  OffreContrat,
  Blessure,
  Rythme,
  StatsDetaillees,
  PosteId,
  ReponseMJ,
  StatVariable,
  PostSocial,
  NotifSocial,
  SuccesDebloques,
  CompteSuivi,
  MessageDM,
  TransfertAnnonce,
  ProfilSocial,
} from '../types';
import {
  publierPost, pseudoDe, feedAmbiance, suggestionsLocales,
  estCertifie, statsDepuisVues, LIMITE_CARACTERES, vieillirPost,
} from '../lib/social';
import { filGroq, reponsesGroq, comptesGroq, messageGroq } from '../lib/groqSocial';
import { annuaire, bassinSocial } from '../lib/comptes';
import { cumuler, estTitulaire, simulerJournee, type LigneReelle } from '../lib/moteur/saison';
import { matchDeLaSemaine } from '../lib/matchLive';
import {
  filDeLaSemaine, messageSpontane, effetSurRelation, reponseLocale, tonDuMessage, reactionsPour,
} from '../lib/vie';
import { evaluerSucces, defisDeLaSemaine, cleSemaine } from '../lib/succes';
import { DEFI_PAR_ID, SUCCES_PAR_ID, type EvenementDefi } from '../data/succes';
import { POSTE_PAR_ID, migrerPoste, ATTRIBUTS_LABELS } from '../data/rugby';
import { retourDeMatch, BUDGET_MATCHS_PAR_SAISON } from '../lib/moteur/apresMatch';
import { MODELE_DEFAUT, plafonnerDeltas, ressembleATriche, CLE_ENV } from '../lib/groq';
import { EVENEMENTS } from '../data/evenements';
import { SKIN_PAR_ID, BOOSTS, CIBLES_COACH } from '../data/boutique';
import { LEGENDES_FICTIVES } from '../data/legendes';
import type { Scenario } from '../data/scenarios';
import { COMPETITIONS, divisionDuClub, competitionDuClub, clubParNom } from '../data/clubs';
import { forceEffectif, forceMoyenneDivision, noteDuClub, setTransfertsSociaux } from '../lib/effectif';
import { evoluer } from '../lib/progression';
import { genererOffres, offreProlongation, cote } from '../lib/offres';
import {
  TROPHEES,
  TROPHEE_PAR_DIVISION,
  COUPE_EUROPE_PAR_DIVISION,
  NATIONS_6N,
} from '../data/trophees';
import { nomNation } from '../components/Drapeau';
import { semaine, libelleDate, type Semaine } from '../data/calendrier';
import { convocation } from '../lib/selection';
import {
  resoudrePyramide, nomDivision, resoudreToutesDivisions, oublierResultats,
} from '../lib/promotion';
import { setMouvementsClubs } from '../lib/divisions';
import { phaseFinale, type MatchFinal, type PhaseFinale } from '../lib/phaseFinale';
import {
  championnatEnDirect, journeesApres, nombreJournees, graine,
  estAmateur, weekEndsJoues, totalWeekEnds, poulesDe, indexPoule,
} from '../lib/championnat';
import { risqueDeBlessure, tirerBlessure, messageBlessure, deltasBlessure } from '../lib/blessures';
import { effetsTraits, MAX_TRAITS } from '../data/traits';
import { nouerRelations, bonusVestiaire, meriteLeBrassard } from '../lib/vestiaire';
import { momentAleatoire, interviewAleatoire, scenarioDuPool } from '../lib/ia';
import { agentDe } from '../data/agents';

// Essais marqués par match, par poste : un ailier finit, un pilier non.
const ESSAIS_PAR_MATCH: Record<PosteId, number> = {
  pilier_gauche: 0.05, talonneur: 0.09, pilier_droit: 0.05,
  deuxieme_ligne_g: 0.08, deuxieme_ligne_d: 0.08,
  troisieme_aile_g: 0.13, troisieme_aile_d: 0.13, numero_8: 0.18,
  demi_melee: 0.16, demi_ouverture: 0.12,
  ailier_gauche: 0.42, premier_centre: 0.2, deuxieme_centre: 0.26, ailier_droit: 0.42,
  arriere: 0.3,
};

const ATTRS_KEYS: (keyof Attributs)[] = [
  'vitesse', 'force', 'endurance', 'plaquage',
  'passe', 'jeuAuPied', 'vision', 'mental',
];

function attributsDeBase(poste: PosteId): Attributs {
  const cles = POSTE_PAR_ID[poste].cles;
  const base = {} as Attributs;
  for (const k of ATTRS_KEYS) {
    let v = 26 + Math.floor(Math.random() * 11);
    if (cles.includes(k)) v += 6 + Math.floor(Math.random() * 5);
    base[k] = Math.min(60, v);
  }
  return base;
}

function borne(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

export function noteGlobale(j: Pick<Joueur, 'attributs'>): number {
  const vals = Object.values(j.attributs);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function scoreCarriere(j: Joueur): number {
  return Math.round(
    noteGlobale(j) * 12 +
      j.reputation * 3 +
      j.saison * 20 +
      j.titres.length * 120 +
      j.essais * 6 +
      j.matchsJoues * 2,
  );
}

// APPORT DU JOUEUR AU CHAMPIONNAT DE SON CLUB.
// ⚠️ Il doit être CONSTANT sur toute la saison, sinon le classement affiché en
// direct ne correspondrait plus au classement final (c'est ce qui faisait que
// les montées et descentes semblaient sorties de nulle part). On le calcule
// donc à partir de la note de la saison PRÉCÉDENTE, connue dès la 1ʳᵉ journée :
// un joueur qui sort d'un grand exercice tire son club vers le haut toute
// l'année. Sa saison en cours, elle, pèse sur sa progression et sa note.
export function bonusClubDuJoueur(j: Joueur | null | undefined): number {
  return j?.apportClub ?? 0;
}

// Ce que tu pèses sur les résultats de ton club, FIGÉ pour toute la saison :
// ta saison précédente (est-ce qu'on peut compter sur toi ?) et ton niveau face
// à ton groupe (es-tu au-dessus du lot ?). Recalculé à chaque intersaison et à
// chaque signature — jamais pendant la saison, sinon le classement affiché en
// direct bougerait sous les yeux du joueur.
export function calculerApportClub(j: Joueur): number {
  const perso = noteGlobale(j) * 0.7 + j.reputation * 0.3;
  const groupe = forceEffectif(j.club, j.saison);
  const forme = Math.max(-3, Math.min(3, ((j.noteSaison ?? 5.5) - 5.5) * 1.2));
  const niveau = Math.max(-2.5, Math.min(4.5, (perso - groupe) * 0.16));
  return Math.round((forme + niveau) * 100) / 100;
}

let compteur = 0;
function idUnique(): string {
  compteur += 1;
  return `e${compteur}-${compteur * 7 + 13}`;
}

export interface CreationInput {
  nom: string;
  poste: PosteId;
  nation: string;
  club: string;
  division: string;
  age: number;
  traits?: string[];
}

// Points d'attributs qu'on peut au maximum gagner via le MJ sur une saison.
// Le gros de la progression doit venir du TERRAIN (lib/progression.ts), pas du
// dialogue avec l'IA — sinon il suffirait d'enchaîner les actions.
export const BUDGET_IA_PAR_SAISON = 4;

// Fin de carrière : libre à partir de 33 ans, imposée à 40.
export const AGE_RETRAITE_LIBRE = 33;
export const AGE_RETRAITE_FORCEE = 40;

// Les reconversions proposées quand on raccroche. La plus crédible dépend de
// ce qu'a été la carrière (palmarès, réputation, mental).
export const RECONVERSIONS = [
  { id: 'entraineur', emoji: '📋', nom: 'Entraîneur', desc: 'Tu passes tes diplômes et reprends un groupe. Le terrain, autrement.' },
  { id: 'consultant', emoji: '🎙️', nom: 'Consultant TV', desc: 'Costume, plateau et analyses du dimanche soir. Ta voix compte encore.' },
  { id: 'agent', emoji: '🤝', nom: 'Agent de joueurs', desc: 'Tu connais les coulisses par cœur : tu défends désormais les jeunes.' },
  { id: 'bar', emoji: '🍺', nom: 'Patron de bar', desc: 'Le troisième mi-temps à vie, au comptoir du club, à raconter les anciens.' },
  { id: 'formateur', emoji: '🧑‍🏫', nom: 'Directeur de centre de formation', desc: 'Tu formes ceux qui te remplaceront. La plus belle des transmissions.' },
];

// Ce que renvoie une négociation de contrat (lot 6) : l'écran s'en sert pour
// faire raconter la scène par l'IA quand une clé est disponible.
export interface ResultatNegociation {
  issue: 'succes' | 'partiel' | 'echec';
  salaire: number;
  club: string;
  agent: string;
}

// Nombre max d'évènements 🎲 et de situations 📖 par saison.
export const MAX_PAR_SAISON = 2;

// Économie volontairement DURE : les Ovas se méritent. Les valeurs "ovas" des
// données (évènements/scénarios) sont fortement réduites à l'encaissement.
function gainOvas(base: number): number {
  return Math.max(1, Math.floor(base / 8));
}

// Comparaison de noms tolérante (accents, casse, ponctuation).
function normaliserNom(nom: string): string {
  return nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

// Nouvelles publications en tête du fil, sans doublon, taille bornée.
function fusionner(nouveaux: PostSocial[], existants: PostSocial[]): PostSocial[] {
  const vus = new Set(existants.map((p) => `${p.pseudo}|${p.texte}`));
  const inedits = nouveaux.filter((p) => !vus.has(`${p.pseudo}|${p.texte}`));
  return [...inedits, ...existants].slice(0, 80);
}

interface GameState {
  ecran: Ecran;
  joueur: Joueur | null;
  journal: EntreeJournal[];
  coins: number;
  inventaire: string[];
  skinActif: string;
  pantheon: LegendeSauvegardee[];
  scenarioActif: Scenario | null;
  compteurs: { evenements: number; situations: number; gainsIA: number; gainsMatchs?: number };
  tropheesEnAttente: string[]; // file des trophées à afficher en 3D
  offres: OffreContrat[]; // propositions de contrat en attente de réponse
  offresOuvertes: boolean; // panneau « Choix de carrière » affiché
  rythme: Rythme; // « semaine » = calendrier réel, « saison » = simulation rapide
  mouvementsClubs: Record<string, string>; // club → division après montées/descentes
  // Lot 7 — réseau social « L'Ovale », succès et défis
  posts: PostSocial[]; // fil : publications du joueur ET du monde (récentes en tête)
  filSemaine: string; // « saison#semaine » de la dernière fournée générée
  notifsSocial: NotifSocial[];
  comptesSuivis: CompteSuivi[];
  suggestionsComptes: CompteSuivi[];
  conversations: Record<string, MessageDM[]>; // pseudo → fil de messages
  transfertsSociaux: TransfertAnnonce[]; // annonces appliquées au monde du jeu
  relationsSociales: Record<string, number>; // pseudo → relation (−100..100)
  succesDebloques: SuccesDebloques; // id → saison où il est tombé
  defis: { cle: string; faits: string[] }; // défis de la semaine en cours
  groqKey: string;
  modele: string;
  tenorKey: string; // clé Tenor (facultative) pour les GIFs dans les posts
  // navigation & réglages
  setEcran: (e: Ecran) => void;
  setGroqKey: (k: string) => void;
  setModele: (m: string) => void;
  setTenorKey: (k: string) => void;
  // carrière
  creerJoueur: (input: CreationInput) => void;
  ajouterEntree: (e: Omit<EntreeJournal, 'id' | 'saison'>) => void;
  appliquerReponse: (r: ReponseMJ, actionJoueur: string) => void;
  saisonSuivante: () => void;
  semaineSuivante: () => void;
  setRythme: (r: Rythme) => void;
  entrainer: (attribut: keyof Attributs) => void;
  evenementAleatoire: () => void;
  lancerScenario: () => void;
  // Lot 6 — boucle unifiée : une situation posée, d'où qu'elle vienne (pool ou IA)
  poserSituation: (sc: Scenario, compter?: boolean) => void;
  resoudreChoix: (index: number) => void;
  // Lot 6 — agent et négociation de contrat
  choisirAgent: (id: string) => void;
  negocierOffre: (id: string) => ResultatNegociation | null;
  prendreRetraite: (reconversion?: string) => void;
  fermerTrophee: () => void;
  reinitialiser: () => void;
  // marché des transferts
  ouvrirOffres: () => void;
  fermerOffres: () => void;
  signerOffre: (id: string) => void;
  demanderTransfert: () => void;
  // fin de carrière
  prendreMentorat: () => void;
  // lot 7 — réseau social, succès et défis
  publier: (texte: string, ton: string, media?: PostSocial['media']) => Promise<void>;
  // L'Ovale piloté par l'IA : le fil, les comptes suivis, les messages privés
  rafraichirFil: () => Promise<void>;
  chargerSuggestions: () => Promise<void>;
  suivreCompte: (c: CompteSuivi) => void;
  nePlusSuivre: (pseudo: string) => void;
  envoyerMessage: (pseudo: string, texte: string) => Promise<void>;
  appliquerAnnonce: (post: PostSocial) => void;
  // Le fil suit le CALENDRIER : une fournée de publications par semaine jouée.
  vivreSemaineSociale: () => void;
  repondreAuPost: (id: string, texte: string) => Promise<void>;
  reposter: (id: string) => void;
  majProfilSocial: (p: ProfilSocial) => void;
  chargementSocial: boolean;
  erreurSocial: string | null;
  aimerPost: (id: string) => void;
  marquerNotifsLues: () => void;
  verifierSucces: () => void;
  signalerDefi: (evenement: EvenementDefi) => void;
  // Les VRAIES statistiques du match regardé en direct, versées dans la saison.
  enregistrerMatchVecu: (stats: {
    essais: number; plaquages: number; plaquagesManques: number;
    passes: number; metres: number; grattages: number;
    butsTentes: number; butsReussis: number; cartons: number; minutes: number;
  }) => void;
  matchRegarde: string; // « saison#semaine » du dernier match suivi en direct
  // ⚠️ LES VRAIES STATISTIQUES DE LA POULE. Le moteur rejoue en fond TOUTES les
  // affiches de la journée (sans rendu) : le classement des joueurs n'est plus
  // une estimation, ce sont les chiffres des matchs réellement simulés.
  // Clé : « division#saison » → « club|nom » → cumul.
  statsReelles: Record<string, Record<string, LigneReelle>>;
  journeesReelles: Record<string, number>;
  simulerStatsJournee: () => void;
  // boutique
  acheterSkin: (id: string) => boolean;
  choisirSkin: (id: string) => void;
  acheterBoost: (id: string) => boolean;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ecran: 'accueil',
      joueur: null,
      journal: [],
      coins: 0,
      inventaire: ['classique'],
      skinActif: 'classique',
      pantheon: [],
      scenarioActif: null,
      compteurs: { evenements: 0, situations: 0, gainsIA: 0, gainsMatchs: 0 },
      tropheesEnAttente: [],
      offres: [],
      offresOuvertes: false,
      rythme: 'semaine',
      mouvementsClubs: {},
      posts: [],
      filSemaine: '',
      matchRegarde: '',
      statsReelles: {},
      journeesReelles: {},
      notifsSocial: [],
      comptesSuivis: [],
      suggestionsComptes: [],
      conversations: {},
      transfertsSociaux: [],
      relationsSociales: {},
      chargementSocial: false,
      erreurSocial: null,
      succesDebloques: {},
      defis: { cle: '', faits: [] },
      groqKey: '',
      tenorKey: '',
      modele: MODELE_DEFAUT,

      setEcran: (ecran) => set({ ecran }),
      setGroqKey: (groqKey) => set({ groqKey }),
      setModele: (modele) => set({ modele }),
      setTenorKey: (tenorKey) => set({ tenorKey }),

      creerJoueur: (input) => {
        const attributs = attributsDeBase(input.poste);
        const gen = noteGlobale({ attributs });
        const salaireDepart = Math.max(0, Math.round(noteDuClub(input.club) * 60));
        const joueur: Joueur = {
          nom: input.nom.trim() || 'Anonyme',
          poste: input.poste,
          traits: (input.traits ?? []).slice(0, MAX_TRAITS),
          nation: input.nation,
          club: input.club,
          division: input.division,
          age: input.age,
          attributs,
          forme: 70,
          moral: 75,
          reputation: 20,
          argent: 1500,
          saison: 1,
          matchsJoues: 0,
          essais: 0,
          titres: [],
          // Potentiel de départ : d'autant plus haut qu'on démarre jeune, avec
          // une QUEUE LONGUE — le tirage au carré fait que la plupart des
          // joueurs plafonnent honnêtement et qu'un sur cent naît avec le talent
          // d'un international. Il bouge ensuite au gré des saisons.
          potentiel: Math.min(
            96,
            gen + 18 + Math.floor(Math.random() ** 1.5 * 44) + Math.max(0, 24 - input.age),
          ),
          contrat: {
            club: input.club,
            division: input.division,
            saisons: 2 + Math.floor(Math.random() * 2),
            salaire: salaireDepart,
          },
          // L'Ovale : on démarre avec une poignée d'abonnés — la famille, les
          // copains du club, deux ou trois supporters curieux.
          pseudo: pseudoDe(input.nom.trim() || 'Anonyme'),
          abonnes: 120 + Math.floor(Math.random() * 300),
        };
        // Nouvelle carrière = pyramide remise à son état d'origine, et plus
        // aucun transfert annoncé sur L'Ovale ne traîne.
        setMouvementsClubs({});
        setTransfertsSociaux([]);
        set({
          joueur,
          ecran: 'carriere',
          scenarioActif: null,
          mouvementsClubs: {},
          compteurs: { evenements: 0, situations: 0, gainsIA: 0, gainsMatchs: 0 },
          // Nouvelle carrière : timeline et défis repartent de zéro. Les SUCCÈS,
          // eux, sont un palmarès de joueur — ils traversent les carrières (et
          // ne peuvent donc pas être refarmés pour des Ovas).
          posts: [],
          filSemaine: '',
          notifsSocial: [],
          comptesSuivis: [],
          suggestionsComptes: [],
          conversations: {},
          transfertsSociaux: [],
          relationsSociales: {},
          defis: { cle: '', faits: [] },
          journal: [
            {
              id: idUnique(),
              saison: 1,
              role: 'systeme',
              titre: 'Début de carrière',
              texte: `${joueur.nom}, ${POSTE_PAR_ID[joueur.poste].nom.toLowerCase()} de ${joueur.club}. Le premier chapitre de ta légende commence. Que veux-tu faire ?`,
            },
          ],
        });
      },

      ajouterEntree: (e) => {
        const saison = get().joueur?.saison ?? 1;
        set((s) => ({ journal: [...s.journal, { ...e, id: idUnique(), saison }] }));
      },

      appliquerReponse: (r, actionJoueur) => {
        const { joueur, compteurs } = get();
        if (!joueur) return;

        // ⚖️ Le MJ propose, le jeu dispose : ses deltas passent par un plafond
        // que rien ne peut contourner (voir lib/groq.ts). Le budget de
        // progression par saison empêche de « farmer » l'IA.
        const { deltas, attributsGagnes, recadre } = plafonnerDeltas(r.deltas ?? {}, {
          budgetAttributs: Math.max(0, BUDGET_IA_PAR_SAISON - compteurs.gainsIA),
          age: joueur.age,
          salaire: joueur.contrat?.salaire ?? 0,
          suspect: ressembleATriche(actionJoueur),
        });
        const j = appliquerDeltas(joueur, deltas);

        const entrees: EntreeJournal[] = [
          { id: idUnique(), saison: j.saison, role: 'joueur', texte: actionJoueur },
          {
            id: idUnique(),
            saison: j.saison,
            role: 'mj',
            titre: r.evenement,
            texte: r.recit,
            deltas,
            evenement: r.evenement,
          },
        ];
        if (recadre) {
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'systeme',
            titre: '⚖️ Réalisme',
            texte:
              'Le récit est joué, mais les gains ont été ramenés à ce qu’une carrière réelle permet. ' +
              'On ne progresse pas en le demandant : entraîne-toi, joue, et laisse les saisons faire.',
          });
        }

        set((s) => ({
          joueur: j,
          coins: s.coins + 1,
          compteurs: { ...s.compteurs, gainsIA: s.compteurs.gainsIA + attributsGagnes },
          journal: [...s.journal, ...entrees],
        }));
      },

      saisonSuivante: () => {
        const { joueur, compteurs, journal } = get();
        if (!joueur) return;
        // Matchs et essais DE LA SAISON écoulée : le temps de jeu dépend du
        // niveau du joueur face à son groupe, les essais de son poste et de sa
        // finition. Ces deux chiffres pèsent ensuite sur le résultat du club.
        const forceGroupe = forceEffectif(joueur.club, joueur.saison);
        const perso = noteGlobale(joueur) * 0.7 + joueur.reputation * 0.3;

        // En mode « journée par journée », la saison a VRAIMENT été jouée :
        // on reprend les matchs, essais et notes accumulés semaine après
        // semaine. En mode rapide, on les simule d'un bloc.
        const vecu = joueur.saisonEnCours;
        const titularisation = Math.max(0.15, Math.min(1, 0.5 + (perso - forceGroupe) / 20));
        const matchsSaison = vecu ? vecu.matchs : Math.round((6 + Math.random() * 16) * titularisation);
        const essaisSaison = vecu
          ? vecu.essais
          : Math.round(
              matchsSaison * ESSAIS_PAR_MATCH[joueur.poste] * (0.5 + noteGlobale(joueur) / 100) * (0.5 + Math.random()),
            );
        const noteMatchs = vecu?.notes.length
          ? vecu.notes.reduce((a, b) => a + b, 0) / vecu.notes.length
          : undefined;

        let j: Joueur = {
          ...joueur,
          division: joueur.division ?? divisionDuClub(joueur.club)?.id ?? 'fed3',
          saison: joueur.saison + 1,
          age: joueur.age + 1,
          matchsJoues: joueur.matchsJoues + matchsSaison,
          essais: joueur.essais + essaisSaison,
          forme: borne(joueur.forme + 10),
          semaine: 1,
          saisonEnCours: undefined,
          selections: (joueur.selections ?? 0) + (vecu?.capes ?? 0),
          stats: vecu ? additionnerStats(joueur.stats ?? STATS_VIDES, vecu.stats) : joueur.stats,
        };

        const entrees: EntreeJournal[] = [];
        let gain = 3;

        // ---- Saison passée sans rien faire ? Le destin joue à ta place. ----
        const rienFait =
          compteurs.evenements === 0 &&
          compteurs.situations === 0 &&
          !journal.some((e) => e.saison === joueur.saison && e.role === 'joueur');
        if (rienFait) {
          const evt = EVENEMENTS[Math.floor(Math.random() * EVENEMENTS.length)];
          j = appliquerDeltas(j, evt.deltas);
          gain += gainOvas(evt.ovas);
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'mj',
            titre: `${evt.emoji} ${evt.titre}`,
            texte: `Pendant que tu laissais filer la saison, la vie a décidé pour toi : ${evt.recit}`,
            deltas: evt.deltas,
            evenement: evt.titre,
          });
        }

        // ---- FIN DE SAISON DE TOUTE LA PYRAMIDE ----
        // Un seul calcul, déterministe, qui sert à TOUT : classement final,
        // phase finale (barrages → demies → finale), match d'accès, montées et
        // descentes. Plus aucune de ces briques n'est tirée au sort dans son coin.
        const divisionJouee = joueur.division ?? divisionDuClub(joueur.club)?.id ?? 'fed3';
        const pyramide = resoudrePyramide(
          divisionJouee, joueur.saison, joueur.club, bonusClubDuJoueur(joueur),
        );

        // ---- Bilan sportif : classement du club puis titres remportés ----
        const bilan = resoudreTrophees(j, joueur.saison, matchsSaison, essaisSaison, pyramide.phase);

        // ---- ÉVOLUTION : la saison jouée fait progresser (ou régresser) ----
        const evolution = evoluer(
          { ...joueur, noteSaison: joueur.noteSaison },
          { matchs: matchsSaison, essais: essaisSaison, forceGroupe, rang: bilan.rang, noteMatchs },
        );
        j = appliquerDeltas(j, evolution.deltas);
        j = {
          ...j,
          noteSaison: evolution.noteSaison,
          potentiel: Math.max(
            noteGlobale(j),
            Math.min(99, (joueur.potentiel ?? noteGlobale(joueur) + 12) + evolution.gainPotentiel),
          ),
        };
        const bougees = Object.entries(evolution.deltas).filter(([, v]) => v !== 0);
        entrees.push({
          id: idUnique(),
          saison: joueur.saison,
          role: 'systeme',
          titre: `📈 Évolution — note de saison ${evolution.noteSaison.toFixed(1)}/10`,
          texte:
            `${evolution.resume} ` +
            (bougees.length
              ? `Générale : ${noteGlobale(joueur)} → ${noteGlobale(j)} (potentiel ${j.potentiel}).`
              : 'Tes attributs ne bougent pas cette saison.'),
          deltas: evolution.deltas,
        });
        const gagnes = bilan.trophees;
        entrees.push({
          id: idUnique(),
          saison: joueur.saison,
          role: 'systeme',
          titre: `Bilan de la saison ${joueur.saison}`,
          texte:
            `${joueur.club} termine ${bilan.rang}${bilan.rang === 1 ? 'er' : 'e'} de ${bilan.divisionNom} ` +
            `(effectif noté ${Math.round(bilan.forceEffectif)}). ` +
            `Ta saison : ${matchsSaison} match${matchsSaison > 1 ? 's' : ''}, ` +
            `${essaisSaison} essai${essaisSaison > 1 ? 's' : ''} — ` +
            (vecu ? `${vecu.stats.points} pts, ${vecu.stats.plaquages} plaquages${vecu.stats.butsTentes ? `, ${vecu.stats.butsReussis}/${vecu.stats.butsTentes} au pied` : ''}${vecu.stats.grattages ? `, ${vecu.stats.grattages} grattages` : ''}. ` : '') +
            (bilan.apport >= 0.6
              ? 'tu as tiré ton équipe vers le haut.'
              : bilan.apport <= -0.6
                ? "tu as pesé sur l'équipe."
                : "dans la moyenne de l'effectif."),
        });

        // ---- PHASE FINALE : le bracket, match par match ----
        const bracket = pyramide.phase.matchs;
        if (bracket.length) {
          const lesNotres = bracket.filter((m) => m.domicile === joueur.club || m.exterieur === joueur.club);
          const finale = bracket.find((m) => m.tour === 'finale')!;
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: bilan.champion ? 'mj' : 'systeme',
            titre: `🔥 Phase finale de ${bilan.divisionNom}`,
            texte:
              (bilan.qualifie
                ? `${joueur.club} disputait la phase finale. ` +
                  (lesNotres.length
                    ? lesNotres
                        .map((m) => `${m.libelle.split(':')[0].trim()} : ${m.domicile} ${m.scoreD}-${m.scoreE} ${m.exterieur}.`)
                        .join(' ')
                    : '')
                : `${joueur.club} n'était pas qualifié pour la phase finale. `) +
              ` Le titre revient à ${finale.vainqueur}, vainqueur ${Math.max(finale.scoreD, finale.scoreE)}-${Math.min(finale.scoreD, finale.scoreE)} de ${finale.perdant} en finale.` +
              (bilan.champion ? ' 🏆 Et ce champion, c’est TOI.' : ''),
          });
        }
        for (const id of gagnes) {
          const t = TROPHEES[id];
          j = { ...j, titres: [...j.titres, `${t.nom} (S${joueur.saison})`] };
          gain += t.ovas;
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'mj',
            titre: `🏆 ${t.nom}`,
            texte: `${t.desc} Tu soulèves le trophée devant ton public !`,
            deltas: { reputation: 6, moral: 10 },
          });
          j = appliquerDeltas(j, { reputation: 6, moral: 10 });
        }

        entrees.push({
          id: idUnique(),
          saison: j.saison,
          role: 'systeme',
          titre: `Saison ${j.saison}`,
          texte:
            `Nouvelle saison. Tu as ${j.age} ans. L'intersaison t'a régénéré. ` +
            (j.age >= AGE_RETRAITE_FORCEE
              ? 'Le corps ne suit plus : c’est ta dernière ligne droite, il est temps de raccrocher.'
              : j.age >= AGE_RETRAITE_LIBRE
                ? 'À ton âge, chaque saison est un sursis — tu peux raccrocher quand tu le sens.'
                : 'Quels sont tes objectifs ?'),
        });

        // ---- VESTIAIRE : nouveaux liens, et le brassard éventuellement ----
        const liens = nouerRelations(j, joueur.saison);
        if (liens.length) {
          j = { ...j, relations: [...(j.relations ?? []), ...liens] };
          const amis = liens.filter((r) => r.type === 'ami');
          const rivaux = liens.filter((r) => r.type === 'nemesis');
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: '🤝 Vestiaire',
            texte:
              (amis.length
                ? `Tu t'es lié d'amitié avec ${amis.map((r) => r.nom).join(' et ')}. On se comprend sans se parler, et ça se voit sur le terrain. `
                : '') +
              (rivaux.length
                ? `En revanche, ça ne passe pas du tout avec ${rivaux[0].nom} : deux fortes têtes, un seul vestiaire.`
                : ''),
          });
        }

        const devientCapitaine = !j.capitaine && meriteLeBrassard(j, forceGroupe);
        if (devientCapitaine) {
          j = appliquerDeltas({ ...j, capitaine: true }, { moral: 12, reputation: 4 });
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'mj',
            titre: '©️ Le brassard est pour toi',
            texte: `Le staff a tranché : tu seras le capitaine de ${j.club} la saison prochaine. Le groupe t'écoute — à toi de le tirer vers le haut.`,
            deltas: { moral: 12, reputation: 4 },
          });
        }

        // ---- Contrat : salaire encaissé (moins la commission de l'agent) ----
        const contrat = j.contrat ?? {
          club: j.club,
          division: j.division ?? 'fed3',
          saisons: 1,
          salaire: Math.round(noteDuClub(j.club) * 60),
        };
        const agent = agentDe(j.agent);
        const commission = Math.round(contrat.salaire * agent.commission);
        j = {
          ...j,
          argent: j.argent + contrat.salaire - commission,
          contrat: { ...contrat, saisons: Math.max(0, contrat.saisons - 1) },
        };
        if (commission > 0) {
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'systeme',
            titre: `${agent.emoji} Commission d’agent`,
            texte: `${agent.nom} prélève ${Math.round(agent.commission * 100)} % de ton salaire, soit ${commission.toLocaleString('fr-FR')} €. C'est le prix du carnet d'adresses.`,
            deltas: { argent: -commission },
          });
        }

        // ---- LOT 6 : ce que le staff et le public retiennent de la saison ----
        // La confiance du coach se rejoue chaque été (nouveau projet, nouvelles
        // hiérarchies) ; la popularité, elle, tire la réputation dans son sens.
        const popularite = j.popularite ?? 50;
        const derive = Math.round((popularite - 50) / 12);
        j = {
          ...j,
          confianceCoach: borne(Math.round(((j.confianceCoach ?? 50) + 50) / 2 + (evolution.noteSaison - 5.5) * 3)),
          popularite: borne(Math.round(popularite + (popularite - 50) * -0.2 + (evolution.noteSaison - 5.5) * 2)),
          reputation: borne(j.reputation + derive),
        };
        // Un agent tapageur finit par déclencher une histoire.
        if (agent.drame > 0 && Math.random() < agent.drame) {
          const degats = { reputation: -6, moral: -8 };
          j = appliquerDeltas(j, degats);
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'mj',
            titre: '📰 Ton agent fait parler de lui',
            texte: `${agent.nom} a lâché dans la presse que tu « méritais mieux que ce club ». Tu n'étais pas au courant. Le vestiaire, lui, a lu l'article.`,
            deltas: degats,
          });
        }

        // ---- MERCATO : fin de contrat, ou clubs séduits par ta saison ----
        const finDeContrat = (j.contrat?.saisons ?? 0) <= 0;
        const belleSaison = evolution.noteSaison >= 7;
        let offres: OffreContrat[] = [];
        if (finDeContrat || belleSaison || Math.random() < 0.25) {
          offres = genererOffres(j, { saison: j.saison, maximum: finDeContrat ? 4 : 2 });
          if (finDeContrat) {
            const prolongation = offreProlongation(j, competitionDuClub(j.club), j.saison);
            if (prolongation) offres = [prolongation, ...offres];
          }
        }
        if (offres.length) {
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'mj',
            titre: finDeContrat ? '📝 Fin de contrat' : '✈️ Le marché s’agite',
            texte: finDeContrat
              ? `Ton contrat à ${j.club} arrive à son terme. ${offres.length} proposition${offres.length > 1 ? 's' : ''} sur la table : ouvre le panneau « Choix de carrière » pour trancher.`
              : `Ta saison a fait du bruit : ${offres.length} club${offres.length > 1 ? 's te font' : ' te fait'} les yeux doux. À toi de voir.`,
          });
        }

        // ---- MONTÉES ET DESCENTES DE TOUTE LA PYRAMIDE ----
        // ⚠️ Avant, seules la division du joueur et ses deux voisines bougeaient :
        // un club de Fédérale 2 y restait à vie. On résout désormais les DIX
        // étages français, tournois de fin d'année des divisions à poules
        // compris (lib/tournoi.ts). Les mouvements de la division du joueur
        // (match d'accès inclus) passent devant : c'est sa saison à lui.
        const complete = resoudreToutesDivisions(joueur.saison);
        const mouvements = [
          ...pyramide.mouvements,
          ...complete.mouvements.filter(
            (m) => !pyramide.mouvements.some((p) => p.club === m.club),
          ),
        ];
        // ⚠️ On enregistre les mouvements ET on les publie à lib/divisions.ts :
        // sans ça, la division du club promu ne changeait nulle part et le
        // championnat de la saison suivante était identique au précédent.
        const majMouvements = { ...get().mouvementsClubs };
        for (const m of mouvements) majMouvements[m.club] = m.vers;
        setMouvementsClubs(majMouvements);
        oublierResultats(); // la pyramide a changé : les résultats mémoïsés sont périmés

        if (complete.tournois.length) {
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: '🏆 Tournois de fin d’année',
            texte: complete.tournois
              .map((t) => `${t.nom} : ${t.champion}.`)
              .join(' '),
          });
        }

        if (mouvements.length) {
          const siennes = pyramide.recits;
          const ailleurs = mouvements.filter((m) => m.club !== joueur.club).length;
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: '🔀 Montées, descentes et match d’accès',
            texte: `${siennes.join(' ')} Au total, ${ailleurs} club${ailleurs > 1 ? 's changent' : ' change'} de division dans toute la pyramide française.`,
          });
          // Le joueur suit son club s'il monte ou s'il descend.
          const sien = mouvements.find((m) => m.club === joueur.club);
          if (sien) {
            j = {
              ...j,
              division: sien.vers,
              contrat: j.contrat ? { ...j.contrat, division: sien.vers } : j.contrat,
            };
            const parAcces = sien.motif === 'acces';
            entrees.push({
              id: idUnique(),
              saison: j.saison,
              role: 'mj',
              titre: sien.sens === 'montee' ? '⬆️ Ton club monte !' : '⬇️ Ton club descend',
              texte: sien.sens === 'montee'
                ? `${joueur.club} accède à la ${nomDivision(sien.vers)}${parAcces ? ' au terme du match d’accès' : ' en tant que champion'}. Une marche de plus, et un niveau de jeu qui va piquer.`
                : `${joueur.club} est relégué en ${nomDivision(sien.vers)}${parAcces ? ' après avoir perdu le match d’accès' : ''}. À toi de voir si tu suis le club ou si tu cherches mieux ailleurs.`,
              deltas: sien.sens === 'montee' ? { moral: 10, reputation: 3 } : { moral: -10 },
            });
            j = appliquerDeltas(j, sien.sens === 'montee' ? { moral: 10, reputation: 3 } : { moral: -10 });
          }
        }

        // Ce que tu pèseras sur ton club la saison qui s'ouvre, figé maintenant.
        j = { ...j, apportClub: calculerApportClub(j) };

        set((s) => ({
          joueur: j,
          coins: s.coins + gain,
          compteurs: { evenements: 0, situations: 0, gainsIA: 0, gainsMatchs: 0 },
          tropheesEnAttente: [...s.tropheesEnAttente, ...gagnes],
          offres,
          offresOuvertes: offres.length > 0,
          mouvementsClubs: majMouvements,
          journal: [...s.journal, ...entrees],
        }));
        get().verifierSucces();
      },

      fermerTrophee: () =>
        set((s) => ({ tropheesEnAttente: s.tropheesEnAttente.slice(1) })),

      setRythme: (rythme) => set({ rythme }),

      // ---- ENTRAÎNEMENT DE LA SEMAINE ----
      // Une séance ciblée par semaine : c'est le seul levier direct du joueur
      // sur ses stats. Le gain dépend de l'âge, de la marge au potentiel et de
      // la fraîcheur — et il coûte de la forme.
      entrainer: (attribut) => {
        const joueur = get().joueur;
        if (!joueur) return;
        const numero = joueur.semaine ?? 1;
        if (joueur.entrainementSemaine === numero) return; // déjà travaillé
        if (joueur.blessure && joueur.blessure.semaines > 0) return;

        const gen = noteGlobale(joueur);
        const potentiel = joueur.potentiel ?? gen + 10;
        const marge = Math.max(0, potentiel - joueur.attributs[attribut]);
        const facteurAge = joueur.age <= 23 ? 1.4 : joueur.age <= 27 ? 1 : joueur.age <= 31 ? 0.65 : 0.35;
        const fraicheur = Math.max(0.3, joueur.forme / 100);
        // Espérance ~0,6 point : il faut plusieurs séances pour gagner 1 point.
        const chance = Math.min(0.95, (0.25 + marge / 45) * facteurAge * fraicheur);
        const gagne = Math.random() < chance ? 1 + (Math.random() < 0.12 ? 1 : 0) : 0;

        const j = appliquerDeltas(
          { ...joueur, entrainementSemaine: numero },
          { [attribut]: gagne, forme: -4, moral: gagne ? 2 : -1 } as Partial<Record<StatVariable, number>>,
        );
        set((st) => ({
          joueur: j,
          journal: [
            ...st.journal,
            {
              id: idUnique(),
              saison: j.saison,
              role: 'systeme',
              titre: gagne
                ? `💪 Séance réussie — +${gagne} ${ATTRIBUTS_LABELS[attribut]}`
                : '💪 Séance d’entraînement',
              texte: gagne
                ? `Tu as passé la semaine à travailler ton ${ATTRIBUTS_LABELS[attribut].toLowerCase()}. Le staff a vu la différence.`
                : `Semaine de travail sur ton ${ATTRIBUTS_LABELS[attribut].toLowerCase()} : rien de visible pour l'instant, mais rien ne se perd.`,
              deltas: { [attribut]: gagne, forme: -4 },
            },
          ],
        }));
        get().signalerDefi('entrainement');
      },

      // ---- MODE JOURNÉE PAR JOURNÉE ----
      // Une semaine du calendrier réel : un match de championnat, une affiche
      // de coupe d'Europe, une fenêtre internationale ou une trêve. À la
      // dernière semaine, la saison se clôt d'elle-même.
      semaineSuivante: () => {
        const { joueur } = get();
        if (!joueur) return;
        const numero = joueur.semaine ?? 1;
        const sem = semaine(numero);

        // Dernière semaine : on referme la saison (bilan, trophées, mercato).
        if (sem.type === 'treve') {
          get().saisonSuivante();
          return;
        }

        const resultat = jouerSemaine(joueur, sem);
        // ⚠️ Si le match vient d'être suivi en direct, `enregistrerMatchVecu` a
        // DÉJÀ payé la forme, le moral et la réputation à partir de la vraie
        // performance. On n'applique pas une seconde fois ceux de l'estimation.
        const matchDejaVecu = resultat.aJoue
          && get().matchRegarde === `${joueur.saison}#${numero}`;
        let j = appliquerDeltas(joueur, matchDejaVecu ? {} : resultat.deltas);

        // Suivi de l'infirmerie : on décompte, ou on encaisse une nouvelle blessure.
        if (resultat.soinBlessure && j.blessure) {
          const reste = j.blessure.semaines - 1;
          j = { ...j, blessure: reste > 0 ? { ...j.blessure, semaines: reste } : null };
        } else if (resultat.blessure) {
          j = appliquerDeltas({ ...j, blessure: resultat.blessure }, deltasBlessure(resultat.blessure));
        }
        const vecu: BilanEnCours = joueur.saisonEnCours ?? {
          matchs: 0, titularisations: 0, essais: 0, notes: [], capes: 0, stats: STATS_VIDES,
        };
        // ⚠️ Si le match a été REGARDÉ en direct, TOUT est déjà comptabilisé
        // par `enregistrerMatchVecu` : le match, les essais, la note et les
        // statistiques viennent du moteur — les vraies. On ne les simule pas
        // une seconde fois par-dessus, sinon le joueur compterait double.
        j = {
          ...j,
          semaine: numero + 1,
          saisonEnCours: {
            matchs: vecu.matchs + (resultat.aJoue && !matchDejaVecu ? 1 : 0),
            titularisations: vecu.titularisations + (resultat.titulaire ? 1 : 0),
            essais: vecu.essais + (matchDejaVecu ? 0 : resultat.essais),
            notes: resultat.note != null && !matchDejaVecu ? [...vecu.notes, resultat.note] : vecu.notes,
            capes: vecu.capes + (resultat.cape ? 1 : 0),
            stats: resultat.stats && !matchDejaVecu
              ? additionnerStats(vecu.stats, resultat.stats)
              : vecu.stats,
          },
        };

        // ---- LOT 6 : le match n'est pas fini quand la sirène sonne ----
        // Un moment décisif (le choix de la 80ᵉ) ou le micro d'après-match.
        // Rien d'obligatoire : ça ne tombe que de temps en temps, et jamais
        // deux choses à la fois.
        let suite: Scenario | null = null;
        if (!get().scenarioActif) {
          if (resultat.aJoue && Math.random() < 0.22) {
            suite = momentAleatoire(j);
          } else if (resultat.aJoue && resultat.note != null && Math.random() < 0.3) {
            if (resultat.note >= 7.8) suite = interviewAleatoire('exploit');
            else if (resultat.note <= 4.5) suite = interviewAleatoire('defaite');
          } else if (!resultat.aJoue && sem.type === 'championnat' && Math.random() < 0.12) {
            suite = interviewAleatoire('banc');
          }
        }

        set((s) => ({
          joueur: j,
          scenarioActif: suite ?? s.scenarioActif,
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: j.saison,
              role: 'systeme',
              titre: `${resultat.emoji} ${libelleDate(sem)} — ${resultat.titre}`,
              texte: resultat.texte,
              deltas: resultat.deltas,
            },
            ...(suite
              ? [{
                  id: idUnique(),
                  saison: j.saison,
                  role: 'mj' as const,
                  titre: `${suite.emoji} ${suite.titre}`,
                  texte: suite.situation,
                }]
              : []),
          ],
        }));

        // ---- LOT 7 : défis de la semaine et succès ----
        // ⚠️ On signale AVANT que la semaine ne change vraiment de numéro dans
        // l'esprit du joueur : `signalerDefi` lit `j.semaine`, déjà incrémenté,
        // donc on repasse par la semaine qui vient d'être jouée.
        const enJeu = { ...j, semaine: numero };
        set({ joueur: enJeu });
        if (resultat.aJoue) get().signalerDefi('match');
        if (resultat.essais > 0) get().signalerDefi('essai');
        if ((resultat.note ?? 0) >= 7) get().signalerDefi('note7');
        if ((resultat.note ?? 0) >= 8) get().signalerDefi('note8');
        if (resultat.victoire) get().signalerDefi('victoire');
        if ((resultat.stats?.plaquages ?? 0) >= 8) get().signalerDefi('plaquages');
        if ((resultat.stats?.butsReussis ?? 0) > 0) get().signalerDefi('transformation');
        set({ joueur: j });
        // ---- LA JOURNÉE EST REJOUÉE EN FOND ----
        // C'est ici que les statistiques individuelles de toute la poule sont
        // produites, juste après le match du joueur.
        get().simulerStatsJournee();

        // ---- L'OVALE SUIT LE CALENDRIER ----
        // Une semaine jouée = une nouvelle fournée de publications, datée.
        get().vivreSemaineSociale();
        get().verifierSucces();
      },

      // ---- Marché des transferts ----
      ouvrirOffres: () => set({ offresOuvertes: true }),
      fermerOffres: () => set({ offresOuvertes: false }),

      signerOffre: (id) => {
        const { joueur, offres } = get();
        const offre = offres.find((o) => o.id === id);
        if (!joueur || !offre) return;
        const reste = offre.club === joueur.club;
        const arrive: Joueur = {
          ...joueur,
          club: offre.club,
          division: offre.division,
          capitaine: reste ? joueur.capitaine : false,
          // Nouveau club = nouveau staff : la confiance se regagne de zéro.
          confianceCoach: reste ? joueur.confianceCoach : 50,
          argent: joueur.argent + offre.prime,
          moral: borne(joueur.moral + (reste ? 6 : 10)),
          reputation: borne(joueur.reputation + (offre.etranger ? 6 : reste ? 2 : 4)),
          contrat: {
            club: offre.club,
            division: offre.division,
            saisons: offre.saisons,
            salaire: offre.salaire,
          },
        };
        // Nouveau club, nouveau groupe : ce que tu y pèses se recalcule.
        const j: Joueur = { ...arrive, apportClub: calculerApportClub(arrive) };
        set((s) => ({
          joueur: j,
          offres: [],
          offresOuvertes: false,
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: j.saison,
              role: 'systeme',
              titre: reste ? `✍️ Prolongation à ${offre.club}` : `✍️ Signature à ${offre.club}`,
              texte: reste
                ? `Tu prolonges de ${offre.saisons} saison${offre.saisons > 1 ? 's' : ''} à ${offre.club} (${offre.divisionNom}) pour ${offre.salaire.toLocaleString('fr-FR')} € par saison.`
                : `${offre.club} (${offre.divisionNom}${offre.etranger ? `, ${offre.pays}` : ''}) t'engage pour ${offre.saisons} saison${offre.saisons > 1 ? 's' : ''} : ${offre.salaire.toLocaleString('fr-FR')} € par saison et ${offre.prime.toLocaleString('fr-FR')} € à la signature.${offre.etranger ? ' Direction l’étranger — nouvelle langue, nouveau rugby.' : ''}`,
            },
          ],
        }));
        get().verifierSucces();
      },

      // Passé 30 ans, transmettre ralentit la chute : le corps s'entretient et
      // le vestiaire vous garde une place (voir lib/progression.ts).
      prendreMentorat: () => {
        const joueur = get().joueur;
        if (!joueur || joueur.age < 30 || joueur.mentorat) return;
        set((st) => ({
          joueur: { ...joueur, mentorat: true, moral: borne(joueur.moral + 8) },
          journal: [
            ...st.journal,
            {
              id: idUnique(),
              saison: joueur.saison,
              role: 'systeme',
              titre: '🧑‍🏫 Mentor',
              texte: 'Tu prends un jeune du centre de formation sous ton aile. Les séances vidéo remplacent les fins de soirée : ton corps te dit merci, et le vestiaire te regarde autrement.',
            },
          ],
        }));
      },

      demanderTransfert: () => {
        const joueur = get().joueur;
        if (!joueur) return;
        const offres = genererOffres(joueur, { saison: joueur.saison, maximum: 3, demande: true });
        // Réclamer son départ en plein contrat coûte au vestiaire.
        const j = appliquerDeltas(joueur, { moral: -6, reputation: -2 });
        set((s) => ({
          joueur: j,
          offres,
          offresOuvertes: true,
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: j.saison,
              role: 'systeme',
              titre: '📣 Demande de transfert',
              texte: offres.length
                ? `Ton agent a fait passer le message. ${offres.length} club${offres.length > 1 ? 's' : ''} se ${offres.length > 1 ? 'positionnent' : 'positionne'} — le vestiaire, lui, apprécie moyennement.`
                : "Ton agent a fait le tour du marché : personne ne se positionne à ton niveau pour l'instant. Le vestiaire, lui, a entendu parler de ta demande.",
            },
          ],
        }));
      },

      evenementAleatoire: () => {
        const { joueur, compteurs } = get();
        if (!joueur || compteurs.evenements >= MAX_PAR_SAISON) return;
        const evt = EVENEMENTS[Math.floor(Math.random() * EVENEMENTS.length)];
        const j = appliquerDeltas(joueur, evt.deltas);
        set((s) => ({
          joueur: j,
          coins: s.coins + gainOvas(evt.ovas),
          compteurs: { ...s.compteurs, evenements: s.compteurs.evenements + 1 },
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: j.saison,
              role: 'mj',
              titre: `${evt.emoji} ${evt.titre}`,
              texte: evt.recit,
              deltas: evt.deltas,
              evenement: evt.titre,
            },
          ],
        }));
      },

      lancerScenario: () => {
        const { joueur, scenarioActif, compteurs } = get();
        if (!joueur || scenarioActif || compteurs.situations >= MAX_PAR_SAISON) return;
        get().poserSituation(scenarioDuPool());
      },

      // Boucle unifiée du lot 6 : le jeu pose UNE situation à choix. Elle vient
      // du pool pré-écrit, d'un moment décisif, d'une interview ou de Groq —
      // à partir d'ici, c'est exactement la même chose.
      poserSituation: (sc, compter = true) => {
        const { joueur, scenarioActif } = get();
        if (!joueur || scenarioActif) return;
        set((s) => ({
          scenarioActif: sc,
          compteurs: compter
            ? { ...s.compteurs, situations: s.compteurs.situations + 1 }
            : s.compteurs,
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: joueur.saison,
              role: 'mj',
              titre: `${sc.emoji} ${sc.titre}`,
              texte: sc.situation,
            },
          ],
        }));
      },

      // ---- AGENT (lot 6) : il prélève sa commission, mais ouvre les portes ----
      choisirAgent: (id) => {
        const joueur = get().joueur;
        if (!joueur) return;
        const agent = agentDe(id);
        if (joueur.agent === agent.id) return;
        set((s) => ({
          joueur: { ...joueur, agent: agent.id || undefined },
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: joueur.saison,
              role: 'systeme',
              titre: `${agent.emoji} ${agent.nom}`,
              texte: agent.id
                ? `${agent.desc} Commission : ${Math.round(agent.commission * 100)} % de ton salaire.`
                : 'Tu te sépares de ton agent : désormais, tu négocies seul.',
            },
          ],
        }));
      },

      // ---- NÉGOCIATION (lot 6) ----
      // La mécanique est côté code (l'IA ne fait que raconter, cf. lib/ia.ts) :
      // ta cote, ta réputation et ton agent décident. On ne négocie qu'une fois
      // par offre, et un club peut se braquer et tout retirer.
      negocierOffre: (id) => {
        const { joueur, offres } = get();
        const offre = offres.find((o) => o.id === id);
        if (!joueur || !offre || offre.negociee) return null;
        const agent = agentDe(joueur.agent);
        const marge = cote(joueur) - offre.noteClub; // au-dessus du club = du poids
        const chance = Math.max(0.1, Math.min(0.9, 0.42 + marge / 22 + (agent.salaire - 1) * 1.4));
        const tirage = Math.random();
        const rupture = 0.1 + Math.max(0, -marge) / 40; // se braquer coûte plus cher que céder

        let issue: 'succes' | 'partiel' | 'echec';
        let salaire = offre.salaire;
        let prime = offre.prime;
        if (tirage < chance) {
          issue = 'succes';
          salaire = Math.round((offre.salaire * (1.12 + (agent.salaire - 1))) / 100) * 100;
          prime = Math.round((offre.prime * 1.25) / 100) * 100;
        } else if (tirage < 1 - rupture) {
          issue = 'partiel';
          salaire = Math.round((offre.salaire * 1.04) / 100) * 100;
        } else {
          issue = 'echec';
        }

        const texte =
          (issue === 'succes'
            ? `${agent.nom} pose ses arguments sur la table et ne lâche rien. ${offre.club} finit par monter à ${salaire.toLocaleString('fr-FR')} € par saison.`
            : issue === 'partiel'
              ? `Le club ne bouge presque pas : ${salaire.toLocaleString('fr-FR')} € par saison, à prendre ou à laisser. C'est déjà ça.`
              : `Le directeur sportif se lève au bout de dix minutes : « On avait fait un effort. » L'offre de ${offre.club} est retirée.`);

        set((s) => ({
          offres:
            issue === 'echec'
              ? s.offres.filter((o) => o.id !== id)
              : s.offres.map((o) => (o.id === id ? { ...o, salaire, prime, negociee: true } : o)),
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: joueur.saison,
              role: 'mj',
              titre: `💼 Négociation — ${offre.club}`,
              texte,
            },
          ],
        }));
        return { issue, salaire, club: offre.club, agent: agent.nom };
      },

      resoudreChoix: (index) => {
        const { joueur, scenarioActif } = get();
        if (!joueur || !scenarioActif) return;
        const choix = scenarioActif.choix[index];
        if (!choix) return;
        let j = appliquerDeltas(joueur, choix.issue.deltas);
        // Changement de club éventuel (offre de transfert acceptée)
        if (choix.issue.transfert) {
          j = { ...j, club: choix.issue.transfert.club, division: choix.issue.transfert.division };
        }
        // Interviews (lot 6) : ce que tu dis change ce que le staff et le
        // public pensent de toi — et ces deux jauges-là ont des dents.
        if (choix.issue.coach != null || choix.issue.fans != null) {
          j = {
            ...j,
            confianceCoach: borne((j.confianceCoach ?? 50) + (choix.issue.coach ?? 0)),
            popularite: borne((j.popularite ?? 50) + (choix.issue.fans ?? 0)),
          };
        }
        set((s) => ({
          joueur: j,
          scenarioActif: null,
          coins: s.coins + gainOvas(choix.issue.ovas),
          journal: [
            ...s.journal,
            { id: idUnique(), saison: j.saison, role: 'joueur', texte: choix.texte },
            {
              id: idUnique(),
              saison: j.saison,
              role: 'mj',
              texte: choix.issue.recit,
              deltas: choix.issue.deltas,
            },
          ],
        }));
        get().signalerDefi('situation');
        get().verifierSucces();
      },

      prendreRetraite: (reconversion?: string) => {
        const joueur = get().joueur;
        if (!joueur) return;
        const legende: LegendeSauvegardee = {
          id: idUnique(),
          nom: joueur.nom,
          poste: joueur.poste,
          nation: joueur.nation,
          age: joueur.age,
          saisons: joueur.saison,
          note: noteGlobale(joueur),
          reputation: joueur.reputation,
          matchsJoues: joueur.matchsJoues,
          essais: joueur.essais,
          titres: joueur.titres,
          score: scoreCarriere(joueur),
          reconversion,
        };
        setMouvementsClubs({});
        set((s) => ({
          pantheon: [...s.pantheon, legende],
          // Le succès « Entrer au Hall » se décerne ici : juste après, il n'y a
          // plus de joueur, donc plus rien à évaluer.
          coins: s.coins + Math.round(legende.score / 150)
            + (s.succesDebloques.legende == null ? SUCCES_PAR_ID.legende.ovas : 0),
          succesDebloques: s.succesDebloques.legende == null
            ? { ...s.succesDebloques, legende: joueur.saison }
            : s.succesDebloques,
          posts: [],
          filSemaine: '',
          notifsSocial: [],
          defis: { cle: '', faits: [] },
          joueur: null,
          mouvementsClubs: {},
          journal: [],
          scenarioActif: null,
          tropheesEnAttente: [],
          offres: [],
          offresOuvertes: false,
          ecran: 'pantheon',
        }));
      },

      reinitialiser: () => {
        setMouvementsClubs({});
        set({
          joueur: null,
          journal: [],
          scenarioActif: null,
          tropheesEnAttente: [],
          offres: [],
          offresOuvertes: false,
          mouvementsClubs: {},
          compteurs: { evenements: 0, situations: 0, gainsIA: 0, gainsMatchs: 0 },
          posts: [],
          filSemaine: '',
          notifsSocial: [],
          comptesSuivis: [],
          suggestionsComptes: [],
          conversations: {},
          transfertsSociaux: [],
          relationsSociales: {},
          defis: { cle: '', faits: [] },
          ecran: 'accueil',
        });
      },

      // ---- LOT 7 : L'OVALE (réseau social) ----
      // Publier engage : la portée dépend de la notoriété, le ton décide de
      // l'accueil, et le club veille. Tout est calculé dans `lib/social.ts`.
      publier: async (texte, ton, media) => {
        const { joueur } = get();
        if (!joueur) return;
        const propre = texte.trim().slice(0, 280);
        if (!propre) return;

        const r = publierPost(joueur, propre, ton, idUnique());
        if (media?.url) r.post.media = media;

        // Avec une clé, ce sont de VRAIS commentaires, écrits par l'IA pour ce
        // post précis. Sans clé, on garde les réponses du pool (le jeu doit
        // rester jouable hors ligne).
        const cle = get().groqKey || CLE_ENV;
        if (cle) {
          try {
            set({ chargementSocial: true, erreurSocial: null });
            const reponses = await reponsesGroq(
              { joueur, cle, modele: get().modele, suivis: get().comptesSuivis },
              propre, ton, 4,
            );
            if (reponses.length) r.post.reponses = reponses;
          } catch (e) {
            set({ erreurSocial: (e as Error).message });
          } finally {
            set({ chargementSocial: false });
          }
        }
        const j = appliquerDeltas(
          {
            ...joueur,
            abonnes: Math.max(0, (joueur.abonnes ?? 0) + r.gainAbonnes),
            popularite: borne((joueur.popularite ?? 50) + r.fans),
            confianceCoach: borne((joueur.confianceCoach ?? 50) + r.coach),
            pseudo: joueur.pseudo ?? pseudoDe(joueur.nom),
          },
          r.deltas,
        );

        const notifs: NotifSocial[] = [
          {
            id: idUnique(),
            emoji: '📈',
            titre: `+${r.gainAbonnes.toLocaleString('fr-FR')} abonnés`,
            texte: `Ta publication a été vue ${r.post.vues.toLocaleString('fr-FR')} fois.`,
            saison: j.saison,
          },
          ...(r.post.reponses ?? []).slice(0, 3).map((rep) => ({
            id: idUnique(),
            emoji: rep.hostile ? '💬' : '❤️',
            titre: `@${rep.pseudo} a répondu`,
            texte: rep.texte,
            saison: j.saison,
          })),
        ];

        set((s) => ({
          joueur: j,
          posts: [r.post, ...s.posts].slice(0, 60),
          notifsSocial: [...notifs, ...s.notifsSocial].slice(0, 40),
          journal: r.sanction
            ? [
                ...s.journal,
                {
                  id: idUnique(),
                  saison: j.saison,
                  role: 'systeme' as const,
                  titre: r.sanction.titre,
                  texte: r.sanction.texte,
                  deltas: { argent: -r.sanction.amende, moral: -6 },
                },
              ]
            : s.journal,
        }));
        get().signalerDefi('post');
        get().verifierSucces();
      },

      // ---- LE FIL DU MONDE, ÉCRIT PAR L'IA ----
      // Clubs, joueurs, journalistes et supporters publient. Sans clé, on
      // retombe sur la timeline d'ambiance pré-écrite.
      rafraichirFil: async () => {
        const { joueur, comptesSuivis, modele } = get();
        if (!joueur) return;
        const cle = get().groqKey || CLE_ENV;
        if (!cle) {
          const secours = feedAmbiance(joueur, 6);
          set((s) => ({ posts: fusionner(secours, s.posts) }));
          return;
        }

        set({ chargementSocial: true, erreurSocial: null });
        try {
          // De quoi parle-t-on cette semaine ? Des dernières entrées du journal.
          const sujets = get().journal
            .slice(-6)
            .map((e) => e.titre ?? e.texte.slice(0, 60))
            .filter(Boolean) as string[];
          const posts = await filGroq({ joueur, cle, modele, suivis: comptesSuivis }, sujets, 6);
          // DES COMMENTAIRES ÉCRITS SOUS CHAQUE TWEET, pas seulement sous les
          // tiens. On sert d'abord les réactions locales (immédiates, jamais
          // vides), puis l'IA remplace celles des deux posts les plus lus —
          // deux appels par semaine, pas un par publication.
          const bassinReac = bassinSocial(joueur, comptesSuivis);
          for (const p of posts) {
            if (!p.reponses?.length) p.reponses = reactionsPour(p, bassinReac, 2);
          }
          set((s) => ({ posts: fusionner(posts, s.posts) }));
          // Les annonces ne sont pas que du texte : on les applique au monde.
          for (const p of posts) get().appliquerAnnonce(p);

          const vedettes = [...posts].sort((a, b) => b.vues - a.vues).slice(0, 2);
          await Promise.all(vedettes.map(async (p) => {
            try {
              const reps = await reponsesGroq(
                { joueur, cle, modele, suivis: comptesSuivis }, p.texte, p.type ?? 'club', 3,
              );
              if (reps.length) {
                set((s) => ({
                  posts: s.posts.map((x) => (x.id === p.id ? { ...x, reponses: reps } : x)),
                }));
              }
            } catch {
              // On garde les réactions locales : le fil n'est jamais vide.
            }
          }));
        } catch (e) {
          set({ erreurSocial: (e as Error).message });
        } finally {
          set({ chargementSocial: false });
        }
      },

      // ---- UNE ANNONCE DEVIENT UN FAIT ----
      // Un transfert annoncé sur L'Ovale se produit vraiment : le joueur change
      // d'effectif. S'il concerne le joueur humain, ça ne s'impose pas — ça
      // devient une OFFRE, qu'il reste libre de refuser.
      appliquerAnnonce: (post) => {
        const a = post.action;
        const joueur = get().joueur;
        if (!a || !joueur || a.type !== 'transfert') return;
        if (!a.joueur || !a.de || !a.vers || a.de === a.vers) return;
        // Les clubs doivent exister, sinon l'IA a inventé.
        if (!clubParNom(a.de) || !clubParNom(a.vers)) return;
        // Le joueur humain ne se fait pas transférer par un tweet.
        if (normaliserNom(a.joueur) === normaliserNom(joueur.nom)) return;
        if (get().transfertsSociaux.some(
          (t) => normaliserNom(t.nom) === normaliserNom(a.joueur!) && t.saison === joueur.saison,
        )) return;

        const transfert: TransfertAnnonce = {
          nom: a.joueur, de: a.de, vers: a.vers, saison: joueur.saison,
          poste: a.poste, age: a.age, note: a.note,
        };
        const liste = [...get().transfertsSociaux, transfert];
        setTransfertsSociaux(liste);
        set((s) => ({
          transfertsSociaux: liste,
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: joueur.saison,
              role: 'systeme' as const,
              titre: '🔁 Mercato — c’est officiel',
              texte: `${a.joueur} quitte ${a.de} pour ${a.vers}. Le transfert est acté : tu le verras dans les effectifs.`,
            },
          ],
        }));
      },

      // ---- LE FIL SUIT LE CALENDRIER ----
      //
      // ⚠️ Il y avait avant un « battement » toutes les 8 secondes qui faisait
      // tomber un post au hasard pendant qu'on lisait : fil incohérent, mêmes
      // phrases en boucle, dates absurdes. Désormais une SEMAINE JOUÉE = une
      // fournée de publications, datée de cette semaine, déterministe
      // (lib/vie.ts). Appelé par `semaineSuivante`, et par l'écran L'Ovale à
      // l'ouverture pour rattraper les semaines déjà passées.
      vivreSemaineSociale: () => {
        const { joueur, comptesSuivis, relationsSociales, conversations } = get();
        if (!joueur) return;
        const sem = joueur.semaine ?? 1;
        const cle = `${joueur.saison}#${sem}`;
        if (get().filSemaine === cle) return; // déjà générée

        // 1. La fournée de la semaine. ⚠️ Le bassin est ÉQUILIBRÉ (clubs,
        // joueurs, presse, supporters) : prendre les 80 premiers comptes de
        // l'annuaire ne donnait que des championnats et des clubs.
        const bassin = bassinSocial(joueur, comptesSuivis);
        const fournee = filDeLaSemaine(joueur, bassin, sem, 8);
        // ⚠️ LES POSTS DÉJÀ EN LIGNE CONTINUENT DE TOURNER. Un tweet ne meurt
        // pas le jour où il est publié : ses vues, ses likes et ses reposts
        // montent encore les semaines suivantes, de moins en moins vite
        // (`vieillirPost`), jusqu'à s'éteindre au bout de six semaines.
        set((s) => ({
          posts: fusionner(
            fournee,
            s.posts.map((p) =>
              p.saison === joueur.saison
                ? { ...p, ...vieillirPost(p, sem - p.semaine) }
                : p,
            ),
          ),
          filSemaine: cle,
        }));

        // 2. Une fois sur trois, un compte suivi t'écrit dans la semaine.
        if (comptesSuivis.length) {
          const rng = graine(`dm#${cle}#${joueur.club}`);
          if (rng() < 0.34) {
            const compte = comptesSuivis[Math.floor(rng() * comptesSuivis.length)];
            const relation = relationsSociales[compte.pseudo] ?? 0;
            const fil = conversations[compte.pseudo] ?? [];
            // On n'enchaîne pas deux messages sans réponse du joueur.
            if (fil[fil.length - 1]?.de !== 'lui') {
              const texte = messageSpontane(relation, `${compte.pseudo}#${cle}`);
              set((s) => ({
                conversations: {
                  ...s.conversations,
                  [compte.pseudo]: [
                    ...(s.conversations[compte.pseudo] ?? []),
                    { id: idUnique(), pseudo: compte.pseudo, de: 'lui' as const, texte, saison: joueur.saison },
                  ],
                },
                notifsSocial: [
                  {
                    id: idUnique(),
                    emoji: '✉️',
                    titre: `@${compte.pseudo} t’a envoyé un message`,
                    texte,
                    saison: joueur.saison,
                  },
                  ...s.notifsSocial,
                ].slice(0, 40),
              }));
            }
          }
        }
      },

      // ---- RÉPONDRE SOUS UN POST ----
      // Commenter n'est pas publier : ça ne touche ni l'audience ni le club.
      // En revanche l'auteur du post RÉPOND — l'IA si une clé est là, sinon
      // les ripostes locales, avec le ton dicté par la relation.
      repondreAuPost: async (id, texte) => {
        const { joueur, posts } = get();
        const propre = texte.trim().slice(0, LIMITE_CARACTERES);
        if (!joueur || !propre) return;
        const cible = posts.find((p) => p.id === id);
        if (!cible) return;

        const sem = semaine(joueur.semaine ?? 1);
        const rng = graine(`rep#${id}#${propre}`);
        const mienne: PostSocial = {
          id: idUnique(),
          auteur: joueur.profilSocial?.nomAffiche ?? joueur.nom,
          pseudo: joueur.pseudo ?? pseudoDe(joueur.nom),
          avatar: 'moi',
          certifie: estCertifie(joueur),
          texte: propre,
          saison: joueur.saison,
          semaine: joueur.semaine ?? 1,
          date: libelleDate(sem),
          moi: true,
          ...statsDepuisVues(cible.vues * (0.03 + rng() * 0.12), rng),
        };
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id ? { ...p, reponses: [...(p.reponses ?? []), mienne] } : p,
          ),
        }));

        // L'auteur du post te répond. Le ton de ton commentaire compte : il fait
        // bouger la relation, exactement comme un message privé.
        if (cible.moi) return; // on ne se répond pas à soi-même
        const avant = get().relationsSociales[cible.pseudo] ?? 0;
        const apres = effetSurRelation(propre, avant);
        set((s) => ({ relationsSociales: { ...s.relationsSociales, [cible.pseudo]: apres } }));

        const compte: CompteSuivi = annuaire(joueur).find((c) => c.pseudo === cible.pseudo) ?? {
          pseudo: cible.pseudo, nom: cible.auteur, avatar: cible.avatar,
          type: (cible.type as CompteSuivi['type']) ?? 'fan', abonnes: 2000,
        };
        const cleIA = get().groqKey || CLE_ENV;
        let reponse = '';
        if (cleIA) {
          set({ chargementSocial: true, erreurSocial: null });
          try {
            reponse = await messageGroq(
              { joueur, cle: cleIA, modele: get().modele, suivis: get().comptesSuivis },
              compte,
              [{ id: 'ctx', pseudo: cible.pseudo, de: 'lui', texte: cible.texte, saison: joueur.saison }],
              propre, apres,
            );
          } catch (e) {
            set({ erreurSocial: (e as Error).message });
          } finally {
            set({ chargementSocial: false });
          }
        }
        if (!reponse) reponse = reponseLocale(compte, apres, propre);

        const rng2 = graine(`riposte#${id}#${propre}`);
        const sienne: PostSocial = {
          id: idUnique(),
          auteur: cible.auteur,
          pseudo: cible.pseudo,
          avatar: cible.avatar,
          certifie: cible.certifie,
          type: cible.type,
          texte: reponse,
          hostile: tonDuMessage(propre) === 'agressif',
          saison: joueur.saison,
          semaine: joueur.semaine ?? 1,
          date: libelleDate(sem),
          ...statsDepuisVues(cible.vues * (0.05 + rng2() * 0.2), rng2),
        };
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id ? { ...p, reponses: [...(p.reponses ?? []), sienne] } : p,
          ),
          notifsSocial: [
            {
              id: idUnique(), emoji: '💬',
              titre: `@${cible.pseudo} a répondu à ton commentaire`,
              texte: reponse, saison: joueur.saison,
            },
            ...s.notifsSocial,
          ].slice(0, 40),
        }));
        get().signalerDefi('post');
      },

      // ---- REPOSTER ----
      // Un repost apparaît sur TON profil, avec la mention de qui l'a écrit à
      // l'origine, et fait gagner un peu de portée à l'auteur.
      reposter: (id) =>
        set((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== id) return p;
            const actif = !p.repostee;
            return {
              ...p,
              repostee: actif,
              reposts: Math.max(0, p.reposts + (actif ? 1 : -1)),
              vues: Math.max(p.vues, p.vues + (actif ? Math.round(p.vues * 0.04) : 0)),
            };
          }),
        })),

      // ---- PROFIL PERSONNALISABLE ----
      majProfilSocial: (profil) =>
        set((s) => (s.joueur
          ? {
              joueur: {
                ...s.joueur,
                pseudo: profil.pseudo?.trim() ? profil.pseudo.replace(/[^A-Za-z0-9_]/g, '').slice(0, 20) : s.joueur.pseudo,
                profilSocial: { ...s.joueur.profilSocial, ...profil },
              },
            }
          : s)),

      // ---- COMPTES À SUIVRE ----
      chargerSuggestions: async () => {
        const { joueur, comptesSuivis, modele } = get();
        if (!joueur) return;
        const cle = get().groqKey || CLE_ENV;
        if (!cle) {
          set({ suggestionsComptes: suggestionsLocales(joueur, comptesSuivis) });
          return;
        }
        set({ chargementSocial: true, erreurSocial: null });
        try {
          const comptes = await comptesGroq({ joueur, cle, modele, suivis: comptesSuivis }, 6);
          const connus = new Set(comptesSuivis.map((c) => c.pseudo));
          set({ suggestionsComptes: comptes.filter((c) => !connus.has(c.pseudo)) });
        } catch (e) {
          set({
            erreurSocial: (e as Error).message,
            suggestionsComptes: suggestionsLocales(joueur, comptesSuivis),
          });
        } finally {
          set({ chargementSocial: false });
        }
      },

      suivreCompte: (c) =>
        set((s) => (
          s.comptesSuivis.some((x) => x.pseudo === c.pseudo)
            ? s
            : {
                comptesSuivis: [...s.comptesSuivis, c],
                suggestionsComptes: s.suggestionsComptes.filter((x) => x.pseudo !== c.pseudo),
              }
        )),

      nePlusSuivre: (pseudo) =>
        set((s) => ({ comptesSuivis: s.comptesSuivis.filter((c) => c.pseudo !== pseudo) })),

      // ---- MESSAGES PRIVÉS ----
      // Groq répond à la place du compte, en gardant son caractère.
      envoyerMessage: async (pseudo, texte) => {
        const { joueur, comptesSuivis, conversations, modele, relationsSociales } = get();
        // On peut écrire à n'importe quel compte du monde, pas seulement aux
        // comptes suivis (on ouvre une conversation depuis un profil).
        const compte = comptesSuivis.find((c) => c.pseudo === pseudo)
          ?? (joueur ? annuaire(joueur).find((c) => c.pseudo === pseudo) : undefined);
        if (!joueur || !compte || !texte.trim()) return;

        const mien: MessageDM = {
          id: idUnique(), pseudo, de: 'moi', texte: texte.trim().slice(0, 400), saison: joueur.saison,
        };
        const fil = [...(conversations[pseudo] ?? []), mien];
        // CE QUE TU DIS COMPTE : le ton du message fait bouger la relation, et
        // c'est cette relation qui décide de la réponse (chaleureuse ou cinglante).
        const avant = relationsSociales[pseudo] ?? 0;
        const apres = effetSurRelation(mien.texte, avant);
        set({
          conversations: { ...conversations, [pseudo]: fil },
          relationsSociales: { ...relationsSociales, [pseudo]: apres },
        });

        const cle = get().groqKey || CLE_ENV;
        let reponse = '';
        if (cle) {
          set({ chargementSocial: true, erreurSocial: null });
          try {
            reponse = await messageGroq(
              { joueur, cle, modele, suivis: comptesSuivis }, compte, fil, mien.texte, apres,
            );
          } catch (e) {
            set({ erreurSocial: (e as Error).message });
          } finally {
            set({ chargementSocial: false });
          }
        }
        if (!reponse) reponse = reponseLocale(compte, apres, mien.texte);
        set((s) => ({
          conversations: {
            ...s.conversations,
            [pseudo]: [
              ...(s.conversations[pseudo] ?? []),
              { id: idUnique(), pseudo, de: 'lui' as const, texte: reponse, saison: joueur.saison },
            ],
          },
        }));
      },

      aimerPost: (id) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? { ...p, aime: !p.aime, likes: p.likes + (p.aime ? -1 : 1) }
              : {
                  ...p,
                  reponses: p.reponses?.map((r) =>
                    r.id === id ? { ...r, aime: !r.aime, likes: r.likes + (r.aime ? -1 : 1) } : r,
                  ),
                },
          ),
        })),

      marquerNotifsLues: () =>
        set((s) => ({ notifsSocial: s.notifsSocial.map((n) => ({ ...n, lue: true })) })),

      // ---- SUCCÈS ----
      // Appelé après chaque action qui fait bouger la carrière. Un succès ne
      // tombe qu'une fois, et rapporte ses Ovas au moment où il tombe.
      verifierSucces: () => {
        const { joueur, posts, pantheon, succesDebloques } = get();
        if (!joueur) return;
        const nouveaux = evaluerSucces(
          { joueur, posts, abonnes: joueur.abonnes ?? 0, pantheon },
          succesDebloques,
        );
        if (!nouveaux.length) return;
        const gain = nouveaux.reduce((a, s) => a + s.ovas, 0);
        set((s) => ({
          coins: s.coins + gain,
          succesDebloques: {
            ...s.succesDebloques,
            ...Object.fromEntries(nouveaux.map((n) => [n.id, joueur.saison])),
          },
          notifsSocial: [
            ...nouveaux.map((n) => ({
              id: idUnique(),
              emoji: n.emoji,
              titre: `Succès débloqué — ${n.nom}`,
              texte: n.desc,
              saison: joueur.saison,
            })),
            ...s.notifsSocial,
          ].slice(0, 40),
          journal: [
            ...s.journal,
            ...nouveaux.map((n) => ({
              id: idUnique(),
              saison: joueur.saison,
              role: 'systeme' as const,
              titre: `${n.emoji} Succès — ${n.nom}`,
              texte: n.desc,
            })),
          ],
        }));
      },

      // ---- DÉFIS DE LA SEMAINE ----
      // Le store SIGNALE ce qui vient de se passer ; si un défi de la semaine
      // correspond et n'est pas encore coché, il est validé.
      // ---- LES VRAIES STATS DU MATCH REGARDÉ ----
      // Quand on suit son match en direct, ce n'est plus une estimation : le
      // moteur a compté chaque plaquage, chaque passe, chaque mètre. On les
      // verse dans la saison, et `jouerSemaine` saura ne pas les simuler une
      // deuxième fois (`matchRegarde`).
      enregistrerMatchVecu: (s) => {
        const { joueur, compteurs } = get();
        if (!joueur) return;
        const cle = `${joueur.saison}#${joueur.semaine ?? 1}`;
        if (get().matchRegarde === cle) return; // déjà comptabilisé
        const vecu = joueur.saisonEnCours ?? {
          matchs: 0, titularisations: 0, essais: 0, notes: [], capes: 0, stats: STATS_VIDES,
        };

        // ⚠️ LA PERFORMANCE PAIE TOUT DE SUITE (demande explicite). La note du
        // match fait bouger la forme, le moral, la réputation et la confiance
        // du staff — et, si le match a été gros, un point d'attribut. Le budget
        // de saison (`BUDGET_MATCHS_PAR_SAISON`) empêche d'en faire une machine
        // à progresser : voir `lib/moteur/apresMatch.ts`.
        const budget = Math.max(0, BUDGET_MATCHS_PAR_SAISON - (compteurs.gainsMatchs ?? 0));
        const retour = retourDeMatch(joueur, s, budget, Math.random);

        let j = appliquerDeltas(joueur, retour.deltas);
        j = {
          ...j,
          confianceCoach: Math.max(0, Math.min(100,
            (j.confianceCoach ?? 50) + Math.round((retour.note - 6) * 1.6))),
          saisonEnCours: {
            ...vecu,
            matchs: vecu.matchs + 1,
            essais: vecu.essais + s.essais,
            notes: [...vecu.notes, retour.note],
            stats: additionnerStats(vecu.stats, {
              points: s.essais * 5 + s.butsReussis * 2,
              butsTentes: s.butsTentes,
              butsReussis: s.butsReussis,
              plaquages: s.plaquages,
              plaquagesManques: s.plaquagesManques,
              grattages: s.grattages,
              passesDecisives: 0,
              cartonsJaunes: s.cartons,
              cartonsRouges: 0,
            }),
          },
        };
        if (retour.attribut) {
          j = {
            ...j,
            attributs: {
              ...j.attributs,
              [retour.attribut]: Math.min(99, (j.attributs?.[retour.attribut] ?? 50) + 1),
            },
          };
        }

        const gagne = retour.attribut
          ? ` **+1 ${ATTRIBUTS_LABELS[retour.attribut]}** — le staff a vu ce qu'il voulait voir.`
          : '';
        set((st) => ({
          matchRegarde: cle,
          joueur: j,
          compteurs: {
            ...st.compteurs,
            gainsMatchs: (st.compteurs.gainsMatchs ?? 0) + (retour.attribut ? 1 : 0),
          },
          journal: [...st.journal, {
            id: idUnique(),
            saison: j.saison,
            role: 'systeme' as const,
            titre: `📋 Feuille de match — ${retour.note}/10`,
            texte: `${retour.texte} ${s.minutes}′ jouées · ${s.plaquages} plaquage${s.plaquages > 1 ? 's' : ''} · `
              + `${Math.round(s.metres)} m portés · ${s.essais} essai${s.essais > 1 ? 's' : ''}.${gagne}`,
            deltas: retour.deltas,
          }],
        }));
        if (s.essais > 0) get().signalerDefi('essai');
        if (s.plaquages >= 8) get().signalerDefi('plaquages');
        if (s.butsReussis > 0) get().signalerDefi('transformation');
        get().signalerDefi('match');
      },

      // ---- SIMULATION DE FOND DE LA JOURNÉE ----
      // Toutes les affiches de la poule sont rejouées par le MÊME moteur que le
      // match qu'on regarde, mais sans aucun rendu. Comme la graine est celle du
      // championnat, le match suivi en direct et celui rejoué ici sont
      // rigoureusement identiques : rien n'est compté deux fois.
      simulerStatsJournee: () => {
        const joueur = get().joueur;
        const division = joueur?.division;
        if (!joueur || !division) return;
        const affiche = matchDeLaSemaine(joueur, bonusClubDuJoueur(joueur));
        if (!affiche) return; // pas de journée cette semaine
        const cle = `${division}#${joueur.saison}`;
        const dejaFaites = get().journeesReelles[cle] ?? 0;
        if (dejaFaites >= affiche.journee) return; // journée déjà simulée

        const poules = poulesDe(division);
        const numeroPoule = poules.length > 1
          ? Math.max(0, indexPoule(division, joueur.club)) : undefined;
        const lignes = simulerJournee(
          division, joueur.saison, affiche.journee, joueur.club,
          bonusClubDuJoueur(joueur), numeroPoule,
          {
            club: joueur.club, nom: joueur.nom, poste: joueur.poste,
            attributs: joueur.attributs,
            // Même décision que dans le direct : le match rejoué est le même.
            titulaire: estTitulaire(joueur, affiche.cle),
          },
        );
        set((s) => ({
          // On ne garde QUE la division et la saison en cours : accumuler tout
          // l'historique ferait exploser le quota du localStorage.
          statsReelles: { [cle]: cumuler(s.statsReelles[cle] ?? {}, lignes) },
          journeesReelles: { [cle]: affiche.journee },
        }));
      },

      signalerDefi: (evenement) => {
        const { joueur, defis } = get();
        if (!joueur) return;
        const cle = cleSemaine(joueur.saison, joueur.semaine ?? 1);
        const actifs = defisDeLaSemaine(joueur.saison, joueur.semaine ?? 1);
        const courant = defis.cle === cle ? defis : { cle, faits: [] };
        if (courant.faits.includes(evenement)) return;
        if (!actifs.some((d) => d.id === evenement)) {
          // Rien à valider, mais on garde la semaine courante en mémoire.
          if (defis.cle !== cle) set({ defis: courant });
          return;
        }
        const defi = DEFI_PAR_ID[evenement];
        set((s) => ({
          defis: { cle, faits: [...courant.faits, evenement] },
          coins: s.coins + (defi?.ovas ?? 1),
          notifsSocial: [
            {
              id: idUnique(),
              emoji: defi?.emoji ?? '🎯',
              titre: 'Défi de la semaine relevé',
              texte: defi?.texte ?? '',
              saison: joueur.saison,
            },
            ...s.notifsSocial,
          ].slice(0, 40),
        }));
      },

      acheterSkin: (id) => {
        const { coins, inventaire } = get();
        const skin = SKIN_PAR_ID[id];
        if (!skin || inventaire.includes(id) || coins < skin.prix) return false;
        set({
          coins: coins - skin.prix,
          inventaire: [...inventaire, id],
          skinActif: id,
        });
        return true;
      },

      choisirSkin: (id) => {
        if (get().inventaire.includes(id)) set({ skinActif: id });
      },

      acheterBoost: (id) => {
        const joueur = get().joueur;
        const boost = BOOSTS.find((b) => b.id === id);
        if (!joueur || !boost || get().coins < boost.prix) return false;
        let j: Joueur = { ...joueur, attributs: { ...joueur.attributs } };
        if (boost.effet.attributs) {
          for (const k of ATTRS_KEYS) j.attributs[k] = borne(j.attributs[k] + boost.effet.attributs);
        }
        if (boost.id === 'mental') {
          for (const k of CIBLES_COACH) j.attributs[k] = borne(j.attributs[k] + 5);
        }
        if (boost.effet.forme != null) j.forme = borne(boost.effet.forme);
        if (boost.effet.moral != null) j.moral = borne(j.moral + boost.effet.moral);
        set((s) => ({
          coins: s.coins - boost.prix,
          joueur: j,
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: j.saison,
              role: 'systeme',
              titre: `${boost.emoji} ${boost.nom}`,
              texte: `Boutique : ${boost.desc}`,
            },
          ],
        }));
        return true;
      },
    }),
    {
      name: 'destin-ovalie',
      version: 3,
      // Sauvegardes d'avant les 15 postes : le poste stocké est une famille
      // (« pilier »), on lui attribue un numéro de maillot.
      // ⚠️ Version 3 : on RÉPARE aussi les données abîmées (poste inconnu,
      // nation vide, champs manquants). Une seule légende mal formée suffisait
      // à laisser le Hall et le Classement sur un écran blanc.
      migrate: (etat: unknown, version: number) => {
        const s = etat as {
          joueur?: Joueur | null;
          pantheon?: LegendeSauvegardee[];
          posts?: PostSocial[];
          filSemaine?: string;
          matchRegarde?: string;
          statsReelles?: Record<string, Record<string, LigneReelle>>;
          journeesReelles?: Record<string, number>;
          notifsSocial?: NotifSocial[];
          succesDebloques?: SuccesDebloques;
          defis?: { cle: string; faits: string[] };
          comptesSuivis?: CompteSuivi[];
          conversations?: Record<string, MessageDM[]>;
          transfertsSociaux?: TransfertAnnonce[];
          relationsSociales?: Record<string, number>;
        };
        if (!s) return s;
        if (version < 2 && s.joueur) {
          s.joueur = { ...s.joueur, poste: migrerPoste(s.joueur.poste as string) };
        }
        if (s.joueur) {
          s.joueur = {
            ...s.joueur,
            poste: migrerPoste(s.joueur.poste as string),
            nation: s.joueur.nation ?? 'France',
            titres: s.joueur.titres ?? [],
          };
        }
        s.pantheon = (s.pantheon ?? []).map((l) => ({
          ...l,
          poste: migrerPoste(l.poste as string),
          nation: l.nation ?? '',
          titres: l.titres ?? [],
          score: Number.isFinite(l.score) ? l.score : 0,
          note: Number.isFinite(l.note) ? l.note : 0,
        }));
        // Lot 7 : champs qui n'existaient pas avant.
        s.posts ??= [];
        s.filSemaine ??= '';
        s.matchRegarde ??= '';
        s.statsReelles ??= {};
        s.journeesReelles ??= {};
        s.notifsSocial ??= [];
        s.comptesSuivis ??= [];
        s.conversations ??= {};
        s.transfertsSociaux ??= [];
        s.relationsSociales ??= {};
        s.succesDebloques ??= {};
        s.defis ??= { cle: '', faits: [] };
        return s;
      },
      // La pyramide (qui joue dans quelle division) vit dans un registre de
      // module : au retour d'une sauvegarde, il faut la lui rendre.
      onRehydrateStorage: () => (etat) => {
        setMouvementsClubs(etat?.mouvementsClubs ?? {});
        setTransfertsSociaux(etat?.transfertsSociaux ?? []);
      },
      partialize: (s) => ({
        joueur: s.joueur,
        journal: s.journal,
        coins: s.coins,
        inventaire: s.inventaire,
        skinActif: s.skinActif,
        pantheon: s.pantheon,
        scenarioActif: s.scenarioActif,
        compteurs: s.compteurs,
        tropheesEnAttente: s.tropheesEnAttente,
        offres: s.offres,
        offresOuvertes: s.offresOuvertes,
        rythme: s.rythme,
        mouvementsClubs: s.mouvementsClubs,
        posts: s.posts,
        filSemaine: s.filSemaine,
        matchRegarde: s.matchRegarde,
        statsReelles: s.statsReelles,
        journeesReelles: s.journeesReelles,
        notifsSocial: s.notifsSocial,
        comptesSuivis: s.comptesSuivis,
        conversations: s.conversations,
        transfertsSociaux: s.transfertsSociaux,
        relationsSociales: s.relationsSociales,
        succesDebloques: s.succesDebloques,
        defis: s.defis,
        groqKey: s.groqKey,
        tenorKey: s.tenorKey,
        modele: s.modele,
      }),
    },
  ),
);

// ---- Palmarès : quels titres le joueur remporte-t-il cette saison ? ----
// On simule d'abord le CLASSEMENT du club dans sa poule (1 à 14). Il découle
// de l'écart entre la FORCE DE L'EFFECTIF cette saison-là (moyenne pondérée
// des 23 meilleurs joueurs, qui évolue avec les progressions, les déclins et
// les regens) et le niveau moyen de la division. La saison personnelle du
// joueur ne fait que l'infléchir.
// Ce classement conditionne ensuite les titres et la coupe d'Europe jouée :
// en Top 14, les 8 premiers vont en Champions Cup, les 6 derniers en Challenge.
// Taille de la poule où le club joue : le vrai nombre de clubs quand la
// compétition est courte (Premiership 10, Top 14, URC 16…), 12 par défaut pour
// les divisions amateurs, qui sont découpées en poules régionales.
function taillePoule(division: { clubs: unknown[] } | undefined): number {
  const n = division?.clubs.length ?? 14;
  return n >= 6 && n <= 20 ? n : 12;
}

function rangDuClub(force: number, reference: number, taille: number): number {
  const ecart = force - reference;
  // 1,2 point d'écart de moyenne d'effectif ≈ 1 place au classement.
  const base = taille / 2 + 0.5 - ecart * 1.2;
  const rang = Math.round(base + (Math.random() * 5 - 2.5));
  return Math.max(1, Math.min(taille, rang));
}

// Apport personnel du joueur au résultat collectif, en « places » de
// classement : son niveau par rapport au groupe, sa saison (matchs, essais) et
// son état de forme.
function apportDuJoueur(j: Joueur, forceClub: number, matchsSaison: number, essaisSaison: number): number {
  const perso = noteGlobale(j) * 0.7 + j.reputation * 0.3;
  const titulaire = Math.min(1, matchsSaison / 18); // 18 matchs ≈ saison pleine
  return (
    (perso - forceClub) * 0.12 * titulaire +
    essaisSaison * 0.25 +
    (j.forme - 70) * 0.02 +
    (j.moral - 70) * 0.01
  );
}

export interface BilanSaison {
  rang: number;
  divisionNom: string;
  trophees: string[];
  forceEffectif: number;
  apport: number;
  champion: boolean; // le club du joueur a gagné la finale
  finaliste: boolean; // battu en finale — il jouera le match d'accès
  qualifie: boolean; // a disputé la phase finale
}

function resoudreTrophees(
  j: Joueur,
  saisonEcoulee: number,
  matchsSaison: number,
  essaisSaison: number,
  phase: PhaseFinale,
): BilanSaison {
  const trophees: string[] = [];
  const divisionId = j.division ?? divisionDuClub(j.club)?.id ?? 'fed3';
  // Toutes les compétitions, France ET monde : on peut désormais signer à
  // l'étranger, et on y joue le vrai titre national du championnat.
  const division = COMPETITIONS.find((d) => d.id === divisionId);
  const taille = taillePoule(division);

  // Force de l'effectif tel qu'il était pendant la saison écoulée, comparée au
  // niveau moyen de la division la même saison.
  const force = forceEffectif(j.club, saisonEcoulee);
  const reference = forceMoyenneDivision(divisionId, saisonEcoulee);
  const apport = apportDuJoueur(j, force, matchsSaison, essaisSaison);
  // Le rang vient du VRAI championnat, joué journée après journée
  // (lib/championnat.ts) ; la vieille estimation ne sert plus que de repli.
  const rang =
    phase.classement.find((l) => l.club === j.club)?.position ??
    Math.max(1, Math.min(taille, rangDuClub(force, reference, taille) - Math.round(apport)));
  const tire = (chance: number) => Math.random() < Math.max(0, Math.min(0.6, chance));

  // ---- TITRE NATIONAL : plus aucun tirage au sort ----
  // Le champion est celui qui a gagné LA FINALE (lib/phaseFinale.ts), après
  // barrages et demi-finales réellement disputés.
  const tropheeNational = TROPHEE_PAR_DIVISION[divisionId];
  const champion = phase.champion === j.club;
  const finaliste = phase.finaliste === j.club;
  const qualifie = phase.qualifies.includes(j.club);
  if (tropheeNational && champion) trophees.push(tropheeNational);

  // Coupe d'Europe — réservée au Top 14, selon le classement :
  // 8 premiers → Champions Cup ; 6 derniers → Challenge Cup.
  if (COUPE_EUROPE_PAR_DIVISION[divisionId]) {
    if (rang <= 8) {
      if (tire((9 - rang) / 48)) trophees.push('champions');
    } else if (tire((15 - rang) / 40)) {
      trophees.push('challenge');
    }
  }

  // Les honneurs INDIVIDUELS dépendent du joueur, pas de son club : c'est son
  // niveau personnel (générale + réputation) qui compte.
  const perso = noteGlobale(j) * 0.7 + j.reputation * 0.3;

  // Sélection nationale : Tournoi des 6 Nations (si la nation le dispute)
  // Il faut d'abord ÊTRE SÉLECTIONNÉ : seuls les tout meilleurs le sont, et
  // gagner le Tournoi derrière relève encore de l'exception.
  const nation = nomNation(j.nation);
  if (NATIONS_6N.includes(nation) && perso >= 78 && tire((perso - 78) / 220)) {
    trophees.push('sixNations');
  }

  // Coupe du monde tous les 4 ans : le sommet absolu d'une carrière.
  if (saisonEcoulee % 4 === 0 && perso >= 82 && tire((perso - 82) / 240)) {
    trophees.push('monde');
  }

  // Meilleur joueur du monde : au sommet, et seulement si la saison fut titrée
  if (perso >= 88 && trophees.length > 0 && tire((perso - 88) / 140)) {
    trophees.push('meilleurJoueur');
  }

  return {
    rang,
    divisionNom: division?.nom ?? 'sa division',
    trophees,
    forceEffectif: force,
    apport,
    champion,
    finaliste,
    qualifie,
  };
}

// L'ancien système d'offre unique (montée d'une division française) est
// remplacé par le vrai marché des transferts : voir src/lib/offres.ts.

// ---------------------------------------------------------------------------
// STATISTIQUES DÉTAILLÉES
// Un match ne se résume pas à « joué / essai marqué » : on compte les points,
// les tirs au but, les plaquages (réussis ET manqués), les grattages, les
// passes décisives et les cartons. Le volume dépend du poste et du niveau.
// ---------------------------------------------------------------------------
export const STATS_VIDES: StatsDetaillees = {
  points: 0, butsTentes: 0, butsReussis: 0, plaquages: 0, plaquagesManques: 0,
  grattages: 0, passesDecisives: 0, cartonsJaunes: 0, cartonsRouges: 0,
};

export function additionnerStats(a: StatsDetaillees, b: StatsDetaillees): StatsDetaillees {
  return {
    points: a.points + b.points,
    butsTentes: a.butsTentes + b.butsTentes,
    butsReussis: a.butsReussis + b.butsReussis,
    plaquages: a.plaquages + b.plaquages,
    plaquagesManques: a.plaquagesManques + b.plaquagesManques,
    grattages: a.grattages + b.grattages,
    passesDecisives: a.passesDecisives + b.passesDecisives,
    cartonsJaunes: a.cartonsJaunes + b.cartonsJaunes,
    cartonsRouges: a.cartonsRouges + b.cartonsRouges,
  };
}

// Le buteur du match : ouvreur d'abord, sinon arrière ou centre.
const BUTEURS: PosteId[] = ['demi_ouverture', 'arriere', 'deuxieme_centre'];

// Plaquages attendus sur 80 minutes, par poste.
const PLAQUAGES_80: Record<PosteId, number> = {
  pilier_gauche: 9, talonneur: 10, pilier_droit: 9,
  deuxieme_ligne_g: 11, deuxieme_ligne_d: 11,
  troisieme_aile_g: 14, troisieme_aile_d: 15, numero_8: 12,
  demi_melee: 6, demi_ouverture: 6,
  ailier_gauche: 5, premier_centre: 10, deuxieme_centre: 9, ailier_droit: 5,
  arriere: 6,
};

function statsDuMatch(
  poste: PosteId, minutes: number, essais: number, note: number,
  jeuAuPied: number, plaquage: number, vision: number, estButeur: boolean,
  facteurCartons = 1,
): StatsDetaillees {
  const part = minutes / 80;
  const qualite = (note - 5.5) / 10; // -0,35 … +0,45
  const alea = () => Math.random();

  const plaquagesTentes = Math.round(PLAQUAGES_80[poste] * part * (0.7 + alea() * 0.6));
  const tauxReussite = Math.min(0.97, 0.72 + plaquage / 400 + qualite * 0.2);
  const plaquages = Math.round(plaquagesTentes * tauxReussite);

  let butsTentes = 0;
  let butsReussis = 0;
  if (estButeur) {
    butsTentes = Math.round((2 + alea() * 5) * part);
    // Un très bon buteur tourne autour de 75-80 % de réussite, pas 90 %.
    const adresse = Math.min(0.9, 0.38 + jeuAuPied / 300 + qualite * 0.2);
    for (let n = 0; n < butsTentes; n++) if (alea() < adresse) butsReussis += 1;
  }

  const grattages = Math.random() < (poste === 'troisieme_aile_d' ? 0.7 : poste === 'troisieme_aile_g' ? 0.5 : 0.15) * part
    ? 1 + (alea() < 0.25 ? 1 : 0) : 0;
  const passesDecisives = Math.random() < (0.1 + vision / 500 + qualite * 0.2) * part * 2 ? 1 : 0;
  const cartonsJaunes = Math.random() < 0.05 * part * facteurCartons ? 1 : 0;
  const cartonsRouges = cartonsJaunes && Math.random() < 0.08 ? 1 : 0;

  return {
    points: essais * 5 + butsReussis * 2, // transformations et pénalités confondues
    butsTentes, butsReussis,
    plaquages, plaquagesManques: plaquagesTentes - plaquages,
    grattages, passesDecisives, cartonsJaunes, cartonsRouges,
  };
}

// ---------------------------------------------------------------------------
// UNE SEMAINE DE LA SAISON (mode journée par journée)
// ---------------------------------------------------------------------------
interface ResultatSemaine {
  emoji: string;
  titre: string;
  texte: string;
  deltas: Partial<Record<StatVariable, number>>;
  aJoue: boolean;
  titulaire: boolean;
  essais: number;
  note?: number; // note du match, sur 10
  blessure?: Blessure | null;
  cape?: boolean;
  soinBlessure?: boolean; // semaine passée à l'infirmerie
  stats?: StatsDetaillees;
  victoire?: boolean; // le club du joueur a gagné ce week-end
}

// Le joueur dispute-t-il ce match, et comment ? Tout part de son niveau face
// à celui de son groupe : un joueur au-dessus est titulaire, un joueur en
// dessous gratte des fins de match, un joueur très en dessous reste en tribune.
function jouerMatch(j: Joueur, intensite: number): ResultatSemaine {
  const forceGroupe = forceEffectif(j.club, j.saison);
  const perso = noteGlobale(j) * 0.7 + j.reputation * 0.3;
  const ecart = perso - forceGroupe - (intensite - 1) * 6; // une affiche européenne est plus relevée
  // La confiance du staff (lot 6 : interviews, attitude) pèse pour ±0,25 sur la
  // titularisation : à niveau égal, c'est elle qui fait la différence.
  const confiance = ((j.confianceCoach ?? 50) - 50) / 200;
  const chanceTitulaire = Math.max(0.05, Math.min(0.95, 0.5 + ecart / 16 + confiance));
  const tirage = Math.random();
  const titulaire = tirage < chanceTitulaire;
  const remplacant = !titulaire && tirage < chanceTitulaire + 0.3;

  if (!titulaire && !remplacant) {
    return {
      emoji: '👕', titre: 'Sur la feuille de match… ou pas',
      texte: `Tu n'es pas retenu dans le groupe. Tu regardes tes coéquipiers depuis les tribunes, et tu ravales ta frustration.`,
      deltas: { moral: -3, forme: 3 },
      aJoue: false, titulaire: false, essais: 0,
    };
  }

  const minutes = titulaire ? 55 + Math.floor(Math.random() * 26) : 12 + Math.floor(Math.random() * 24);
  const essais = Math.random() < ESSAIS_PAR_MATCH[j.poste] * (minutes / 80) * (0.6 + noteGlobale(j) / 100) * 1.6
    ? 1 + (Math.random() < 0.12 ? 1 : 0)
    : 0;

  // Note du match : niveau relatif, temps de jeu, essais, forme, et une bonne
  // part d'aléa — c'est un match de rugby, pas une feuille de calcul.
  const note = Math.round(
    Math.max(2, Math.min(10,
      5.6 + ecart * 0.1 + (minutes - 50) * 0.012 + essais * 1.2
      + (j.forme - 70) * 0.012 + (Math.random() * 3 - 1.5)
      + effetsTraits(j.traits).noteMatch
      + bonusVestiaire(j, j.saison)
      + (j.capitaine ? 0.25 : 0)
      + (intensite > 1.2 ? effetsTraits(j.traits).noteGrosMatch : 0),
    )) * 10,
  ) / 10;

  const fatigue = -Math.round(minutes / 12);
  const deltas: Partial<Record<StatVariable, number>> = {
    forme: fatigue,
    moral: note >= 7 ? 4 : note >= 5 ? 1 : -3,
  };
  if (note >= 8) deltas.reputation = 2;
  if (essais >= 2) deltas.reputation = (deltas.reputation ?? 0) + 1;

  const estButeur = BUTEURS.includes(j.poste) && (j.poste === 'demi_ouverture' || Math.random() < 0.3);
  const stats = statsDuMatch(
    j.poste, minutes, essais, note,
    j.attributs.jeuAuPied, j.attributs.plaquage, j.attributs.vision, estButeur,
    effetsTraits(j.traits).cartons,
  );

  // Le corps peut lâcher : le risque monte avec les minutes, la fatigue et l'âge.
  const tr = effetsTraits(j.traits);
  const blessureBrute = Math.random() < risqueDeBlessure(j, minutes, intensite) * tr.risqueBlessure
    ? tirerBlessure()
    : null;
  const blessure = blessureBrute
    ? { ...blessureBrute, semaines: Math.max(1, Math.round(blessureBrute.semaines * tr.graviteBlessure)) }
    : null;

  const recit = titulaire
    ? `Titulaire, tu joues ${minutes} minutes.`
    : `Tu entres en jeu et disputes ${minutes} minutes.`;
  const finition = essais > 0 ? ` Tu marques ${essais === 1 ? 'un essai' : `${essais} essais`} !` : '';
  const bobo = blessure ? ` 🚑 ${messageBlessure(blessure)}` : '';
  const details = ` (${stats.plaquages} plaquages${stats.butsTentes ? `, ${stats.butsReussis}/${stats.butsTentes} au pied` : ''}${stats.grattages ? `, ${stats.grattages} grattage` : ''}${stats.cartonsJaunes ? ', carton jaune 🟨' : ''})`;
  const jugement = note >= 8
    ? ' La presse te désigne homme du match.'
    : note >= 6.5 ? ' Une prestation sérieuse.'
      : note >= 5 ? ' Sans éclat, mais tu tiens ton rang.'
        : ' Tu passes complètement à côté.';

  return {
    emoji: essais > 0 ? '🎯' : '🏉',
    titre: `Match — note ${note}/10`,
    texte: `${recit}${finition}${jugement}${details}${bobo}`,
    deltas,
    aJoue: true,
    titulaire,
    essais,
    note,
    stats,
    blessure,
  };
}

function jouerSemaine(j: Joueur, sem: Semaine): ResultatSemaine {
  // À l'infirmerie : on récupère, une semaine à la fois.
  if (j.blessure && j.blessure.semaines > 0) {
    const reste = j.blessure.semaines - 1;
    return {
      emoji: '🚑',
      titre: `Infirmerie — ${j.blessure.nom}`,
      texte: reste > 0
        ? `Soins, kiné, salle. Encore ${reste} semaine${reste > 1 ? 's' : ''} avant de retoucher un ballon.`
        : 'Dernière séance de rééducation : tu es apte pour la semaine prochaine. Le retour va piquer.',
      deltas: { forme: reste > 0 ? 4 : 10, moral: reste > 0 ? -2 : 6 },
      aJoue: false, titulaire: false, essais: 0,
      soinBlessure: true,
    };
  }
  // ---- PAS DE TRÊVE EN BAS DE LA PYRAMIDE ----
  // Demande explicite : de la Nationale 2 à la Régionale 3, on joue AUSSI les
  // week-ends de Coupe d'Europe et de Tournoi des 6 Nations. Ces divisions-là
  // n'ont ni coupe européenne ni internationaux : leur championnat continue.
  const divisionDuJoueur = j.division ?? 'fed3';
  const semaineJouee: Semaine =
    estAmateur(divisionDuJoueur) && (sem.type === 'coupe' || sem.type === 'international')
      ? { ...sem, type: 'championnat', libelle: 'Journée de championnat' }
      : sem;

  switch (semaineJouee.type) {
    case 'championnat': {
      const affiche = afficheDuJour(j, weekEndsJoues(divisionDuJoueur, sem.numero) + 1);
      // Poule courte : il y a moins de journées que de week-ends au calendrier.
      // Ces week-ends-là, il n'y a tout simplement pas de match.
      if (!affiche) {
        return {
          emoji: '🏋️', titre: `${semaineJouee.libelle} — pas de match`,
          texte: 'Aucun adversaire au programme ce week-end : semaine complète à l’entraînement, et le corps respire.',
          deltas: { forme: 7, moral: 1 },
          aJoue: false, titulaire: false, essais: 0,
        };
      }
      const r = jouerMatch(j, 1);
      return {
        ...r,
        titre: `J${affiche.journee} — ${affiche.resume}`,
        texte: `${affiche.recit} ${r.texte}`,
        victoire: affiche.victoire,
      };
    }

    case 'coupe': {
      // Encore faut-il que le club dispute la coupe d'Europe.
      const division = j.division ?? 'fed3';
      if (!COUPE_EUROPE_PAR_DIVISION[division]) {
        return {
          emoji: '🛌', titre: semaineJouee.libelle,
          texte: 'Week-end sans match : ton club ne dispute pas la coupe d’Europe. Semaine d’entraînement et de récupération.',
          deltas: { forme: 8, moral: 1 },
          aJoue: false, titulaire: false, essais: 0,
        };
      }
      const r = jouerMatch(j, 1.6);
      return { ...r, titre: `${semaineJouee.libelle}${r.aJoue ? ` — note ${r.note}/10` : ''}` };
    }

    case 'international': {
      const conv = convocation(j);
      if (!conv.selectionne) {
        return {
          emoji: '📺', titre: `${semaineJouee.libelle} — pas convoqué`,
          texte: `Le groupe est annoncé sans toi (il faut ${Math.round(conv.exige)} de niveau international, tu es à ${Math.round(conv.niveau)}). Tu restes au club pour travailler.`,
          deltas: { forme: 6, moral: conv.marge > -4 ? -4 : -1 },
          aJoue: false, titulaire: false, essais: 0,
        };
      }
      const r = jouerMatch({ ...j, reputation: Math.max(0, j.reputation - 6) }, 2);
      return {
        ...r,
        emoji: '🏳️',
        titre: `${semaineJouee.libelle} — sélection nationale`,
        texte: `Tu es appelé en sélection ! ${r.texte}`,
        deltas: { ...r.deltas, reputation: (r.deltas.reputation ?? 0) + (r.aJoue ? 5 : 2), moral: (r.deltas.moral ?? 0) + 6 },
        cape: r.aJoue,
      };
    }

    case 'phaseFinale': {
      // On joue le VRAI bracket : barrages, demies, finale, puis match d'accès.
      const division = j.division ?? 'fed3';
      const bonus = bonusClubDuJoueur(j);
      const tour = semaineJouee.tourFinal ?? 'finale';
      const repos = (texte: string, emoji = '🏖️'): ResultatSemaine => ({
        emoji, titre: semaineJouee.libelle, texte,
        deltas: { forme: 10 },
        aJoue: false, titulaire: false, essais: 0,
      });

      let match: MatchFinal | null = null;
      if (tour === 'acces') {
        const py = resoudrePyramide(division, j.saison, j.club, bonus);
        match =
          [py.accesVersLeHaut, py.accesDepuisLeBas].find(
            (m): m is MatchFinal => !!m && (m.domicile === j.club || m.exterieur === j.club),
          ) ?? null;
        if (!match) return repos('Pas de match d’accès pour ton club : la saison est bel et bien finie. Vacances, puis mercato.');
      } else {
        const phase = phaseFinale(division, j.saison, j.club, bonus);
        if (!phase.qualifies.includes(j.club)) {
          return repos('Ta saison est terminée : le club n’est pas qualifié pour la phase finale. Place aux vacances et au mercato.');
        }
        match =
          phase.matchs.find(
            (m) => m.tour === tour && (m.domicile === j.club || m.exterieur === j.club),
          ) ?? null;
        if (!match) {
          // Qualifié mais pas de match ce week-end : soit exempt de barrages
          // (les deux premiers), soit déjà éliminé.
          const dejaJoue = phase.matchs.some(
            (m) => m.domicile === j.club || m.exterieur === j.club,
          );
          return repos(
            tour === 'barrage'
              ? 'Ton club a fini dans les deux premiers : il est exempt de barrages et attend son adversaire en demi-finale. Semaine de préparation.'
              : dejaJoue
                ? 'Ton club a été éliminé de la phase finale. Tu regardes la suite depuis le canapé, avec un goût amer.'
                : 'Pas de match cette semaine pour ton club.',
            '📺',
          );
        }
      }

      const chezNous = match.domicile === j.club;
      const nous = chezNous ? match.scoreD : match.scoreE;
      const eux = chezNous ? match.scoreE : match.scoreD;
      const adversaire = chezNous ? match.exterieur : match.domicile;
      const gagne = match.vainqueur === j.club;
      const r = jouerMatch(j, tour === 'finale' ? 2 : 1.8);
      const enjeu =
        tour === 'acces'
          ? gagne ? ' Ta place est assurée — quel soulagement.' : ' C’est la relégation. Un vestiaire en larmes.'
          : tour === 'finale'
            ? gagne ? ' VOUS ÊTES CHAMPIONS !' : ' Si près du Brennus, si loin.'
            : gagne ? ' Vous passez au tour suivant !' : ' L’aventure s’arrête là.';
      return {
        ...r,
        emoji: gagne ? '🔥' : '💔',
        titre: `${semaineJouee.libelle} — ${gagne ? 'Victoire' : 'Défaite'} ${nous}-${eux} contre ${adversaire}`,
        texte: `${chezNous ? 'À domicile' : 'En déplacement'} contre ${adversaire} : ${nous}-${eux}.${enjeu} ${r.texte}`,
        deltas: {
          ...r.deltas,
          moral: (r.deltas.moral ?? 0) + (gagne ? 8 : -8),
          reputation: (r.deltas.reputation ?? 0) + (gagne && tour === 'finale' ? 6 : gagne ? 2 : 0),
        },
      };
    }

    default:
      return {
        emoji: '🛌', titre: semaineJouee.libelle,
        texte: 'Semaine de repos.',
        deltas: { forme: 10 },
        aJoue: false, titulaire: false, essais: 0,
      };
  }
}

// L'affiche du jour dans le vrai championnat : adversaire et score final.
// ⚠️ Le calendrier compte 23 week-ends de championnat, le championnat lui-même
// 22 à 30 journées selon la taille de la poule : `journeesApres` fait la
// conversion (certains week-ends enchaînent deux journées).
function afficheDuJour(
  j: Joueur, weekEnd: number,
): { resume: string; recit: string; victoire: boolean; journee: number } | null {
  const division = j.division;
  if (!division) return null;
  const total = nombreJournees(division, j.club);
  const surCombien = totalWeekEnds(division);
  const fin = journeesApres(weekEnd, total, surCombien);
  const debut = journeesApres(weekEnd - 1, total, surCombien) + 1;
  if (fin < debut) return null; // week-end sans nouvelle journée (poule courte)
  const etat = championnatEnDirect(division, j.saison, j.club, fin, bonusClubDuJoueur(j));
  let match = null;
  let journee = fin;
  for (let idx = fin; idx >= debut && !match; idx--) {
    match = etat.journees[idx - 1]?.find((m) => m.domicile === j.club || m.exterieur === j.club) ?? null;
    if (match) journee = idx;
  }
  if (!match) return null;
  const domicile = match.domicile === j.club;
  const adversaire = domicile ? match.exterieur : match.domicile;
  const nous = domicile ? match.scoreD : match.scoreE;
  const eux = domicile ? match.scoreE : match.scoreD;
  const issue = nous > eux ? 'Victoire' : nous < eux ? 'Défaite' : 'Match nul';
  return {
    resume: `${issue} ${nous}-${eux} contre ${adversaire}`,
    recit: `${domicile ? 'À domicile' : 'En déplacement'} contre ${adversaire} : ${nous}-${eux}.`,
    victoire: nous > eux,
    journee,
  };
}

function appliquerDeltas(joueur: Joueur, deltas: Partial<Record<StatVariable, number>>): Joueur {
  const j: Joueur = { ...joueur, attributs: { ...joueur.attributs } };
  for (const [cle, val] of Object.entries(deltas) as [StatVariable, number][]) {
    if (ATTRS_KEYS.includes(cle as keyof Attributs)) {
      const k = cle as keyof Attributs;
      j.attributs[k] = borne(j.attributs[k] + val);
    } else if (cle === 'forme' || cle === 'moral' || cle === 'reputation') {
      j[cle] = borne(j[cle] + val);
    } else if (cle === 'argent') {
      j.argent = Math.max(0, j.argent + val);
    }
  }
  return j;
}

// Classement combiné : légendes fictives + panthéon du joueur + carrière en cours.
export function classementComplet(
  pantheon: LegendeSauvegardee[],
  joueur: Joueur | null,
): (LegendeSauvegardee & { enCours?: boolean; joueur?: boolean })[] {
  const liste: (LegendeSauvegardee & { enCours?: boolean; joueur?: boolean })[] = [
    ...LEGENDES_FICTIVES,
    ...pantheon.map((l) => ({ ...l, joueur: true })),
  ];
  if (joueur) {
    liste.push({
      id: 'en-cours',
      nom: `${joueur.nom} (en cours)`,
      poste: joueur.poste,
      nation: joueur.nation,
      age: joueur.age,
      saisons: joueur.saison,
      note: noteGlobale(joueur),
      reputation: joueur.reputation,
      matchsJoues: joueur.matchsJoues,
      essais: joueur.essais,
      titres: joueur.titres,
      score: scoreCarriere(joueur),
      enCours: true,
      joueur: true,
    });
  }
  return liste.sort((a, b) => b.score - a.score);
}
