// LE MATCH EN DIRECT — le moteur (lib/moteur/) rendu à l'écran, et JOUABLE.
//
// ═══ CE QUI A ÉTÉ REFAIT, ET POURQUOI ════════════════════════════════════════
//
// Retour de jeu, mot pour mot : « le système de jeu durant les matchs est
// injouable et pas fun, et il faut que ça marche sur téléphone ». Le moteur
// n'était pas en cause — il simule trente pions sept fois par seconde et son
// étalonnage tient. C'était TOUT CE QUI SE TROUVE ENTRE LE MOTEUR ET LE POUCE.
// Quatre défauts, et chacun suffisait à lui seul :
//
// 1. **AUCUNE CAMÉRA.** L'écran affichait les 122 × 70 m d'un seul tenant. Sur
//    un téléphone de 375 px, un joueur fait 3 pixels : on ne trouve pas son
//    propre pion, on ne voit pas qui arrive, on ne sait pas à qui on passe.
//    → `lib/moteur/camera.ts` : une caméra qui suit, cadre à 46 m quand c'est à
//      toi, et PIVOTE D'UN QUART DE TOUR en portrait pour qu'on attaque vers le
//      haut de l'écran. On attaque toujours dans le même sens, camp A ou B.
//
// 2. **LE JEU TOURNAIT À CINQ FOIS LA VITESSE RÉELLE PENDANT QU'ON PILOTAIT.**
//    L'ancienne vitesse « ×1 » valait `facteur: 5`. Un plaquage à contrer
//    durait deux dixièmes de seconde à l'écran. Ce n'était pas exigeant,
//    c'était impossible.
//    → `lib/moteur/moments.ts` : le match file à ×9 tant qu'il ne se passe rien
//      pour toi, et retombe en TEMPS RÉEL dès qu'un ballon arrive sur toi ou
//      qu'un porteur te fonce dessus. Un match complet tient en cinq ou six
//      minutes de manette, et on ne rate aucune de ses propres actions.
//
// 3. **LES COMMANDES ÉTAIENT SOUS LE TERRAIN.** Une barre de vignettes de 58 px
//    qui DÉFILAIT HORIZONTALEMENT, deux cents pixels sous l'action.
//    → Puis un HUD posé sur le terrain : joystick flottant, gros bouton
//      contextuel, boutons secondaires en arc. → PUIS PLUS RIEN DU TOUT, voir
//      juste en dessous.
//
// 4. **LE RESTE MANGEAIT L'ÉCRAN.** Notice des commandes, champ de consigne,
//    fil de commentaire, six boutons de vitesse : sur 375 px, le terrain finissait
//    en bandeau de 200 px sous une pile de panneaux.
//    → Tout ce qui n'est pas le jeu part dans un tiroir (📜 fil, 📣 consigne,
//      🕹️ commandes). Sur grand écran, le fil revient en colonne de droite.
//
// ═══ ⚠️ ON NE BOUGE PLUS SON JOUEUR — ON NE FAIT QUE CHOISIR ═════════════════
//
// Demande, mot pour mot : « je veux que tu modifies juste pour que dans les
// matchs on puisse faire que les choix, pas bouger le joueur, et qu'on voie
// vraiment notre joueur effectuer le choix ».
//
// C'est un changement de genre, pas un réglage. Ce qui a été retiré :
// le joystick tactile, le gros bouton contextuel, les trois secondaires, le
// bouton 💢, les touches du clavier, les boutons de souris, la manette, et
// l'écran de réglage des touches qui allait avec (`lib/moteur/manette.ts`,
// `components/ReglageTouches.tsx`, `EtatMatch.direction`, `EtatMatch.sprint`,
// `piloterDirection` et le tempo « 🎯 Moments » — tous supprimés).
//
// ⚠️ ET UNE LIGNE DU MOTEUR AVEC, SANS QUOI RIEN NE MARCHE. Tant qu'on pilotait,
// `moteur.ts` SE TAISAIT quand le pion du joueur portait le ballon : ni passe
// automatique, ni coup de pied, puisqu'un bouton allait décider. Ce cas
// particulier a été supprimé lui aussi ; sinon le pion garderait le ballon
// jusqu'au plaquage à chaque possession, quatre-vingts fois par match.
//
// ⚠️ CE QUI RESTE, ET QUI SUFFIT : LA CARTE DE DÉCISION (`moteur/decisions.ts`).
// Le match file à seize fois la vitesse réelle, se FIGE sur un carrefour, pose
// deux à quatre options et dix secondes. On choisit ; `demanderAction` arme
// l'intention ; le moteur la joue.
//
// ⚠️ ET ON REGARDE SON JOUEUR LA JOUER — c'est la seconde moitié de la demande.
// Trois choses, ensemble, et aucune n'est décorative :
//   1. LE RALENTI (`REJEU`, 3,2 s réelles) : le jeu repart à deux fois la
//      vitesse réelle au lieu de seize.
//   2. LA CAMÉRA SE COLLE AU PION, à cadrage rapproché et à 100 % sur lui — pas
//      sur un compromis avec le ballon. Pendant ces trois secondes, l'écran ne
//      montre que lui.
//   3. L'ÉTIQUETTE DU GESTE flotte au-dessus de sa tête (`.ml-geste`) : on lit
//      « 💥 Plaquer » sur le pion pendant qu'il charge. Sans elle, un ralenti
//      sur un pion parmi trente ne dit pas ce qu'on est en train de regarder.
//
// ⚠️ TROIS CHOIX TECHNIQUES QUI FONT LA FLUIDITÉ, ET QUI N'ONT PAS BOUGÉ
// 1. AUCUNE TRANSITION CSS sur les pions : le moteur tourne à 60 images par
//    seconde, une transition ne ferait qu'ajouter du retard.
// 2. INTERPOLATION EXACTE : la simulation avance par pas fixes de 0,15 s, le
//    rendu à 60 Hz. On affiche `position + vitesse × reliquat`.
// 3. LE TERRAIN EST DESSINÉ UNE FOIS (`PelouseMemo`) ; seuls les trente pions,
//    le ballon et le HUD sont recalculés à chaque image.
//
// ⚠️ `createPortal(document.body)` obligatoire : le `backdrop-filter` des
// `.carte` crée un bloc conteneur qui piège les `position: fixed`.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  activerControle, appliquerConsigne, appliquerTactiqueEquipe, avancer, bilan, creerMatch,
  demanderRemplacement, DT, ordonner,
  resoudreChoix, type EtatMatch,
} from '../lib/moteur/moteur';
import { ACTION_PAR_ID } from '../lib/moteur/controle';
import { ORDRES } from '../lib/moteur/bagarre';
import { ajouterCommentaire, type ActionJoueur, type Commentaire, type NiveauMatch, type TypeCommentaire } from '../lib/moteur/etat';
import { competitionEffective } from '../lib/divisions';
import { LARGEUR, LONGUEUR, borner, type Vec } from '../lib/moteur/terrain';
import { Camera, COUVERTURE, angleDeVue, type Cadrage, type Vue } from '../lib/moteur/camera';
import {
  facteurTempo, momentDuJoueur, TEMPOS, TENUE, type Moment, type Tempo,
} from '../lib/moteur/moments';
import {
  DELAI_DECISION, REJEU, REPOS_DECISION, decisionPour, delaiDeCarte,
  type Decision, type OptionDecision,
} from '../lib/moteur/decisions';
import { elanDe } from '../lib/moteur/elan';
import { estTitulaire } from '../lib/moteur/saison';
import { CONSIGNE_NEUTRE, lireConsigneIA, lireConsigneLocale } from '../lib/moteur/consignes';
import { iaDisponible } from '../lib/groq';
import type { Pion, StatsMatch } from '../lib/moteur/entites';
import { detailNote, noterMatch, statsPourLaNote } from '../lib/moteur/apresMatch';
import { graine, scorePossible, type MatchChampionnat } from '../lib/championnat';
import { effectifDuClub } from '../lib/effectif';
import { effectifNational } from '../lib/international';
import { nomNation } from '../lib/nations';
import { clubParNom } from '../data/clubs';
import { useGame } from '../store/useGame';
import { Blason, LogoEquipe } from './Blason';
import { PelouseMemo } from './match/Pelouse';
import { FeuilleMatch } from './match/FeuilleMatch';
import type { CompositionManager, Joueur, TactiqueManager } from '../types';
import {
  compositionManagerParDefaut, feuilleDepuisComposition, noteCompositionManager,
  reconcilerCompositionManager,
} from '../lib/compositionManager';
import { t } from '../lib/i18n';
import { useModalDialog } from '../lib/useModalDialog';

function couleursDe(nom: string): [string, string] {
  const club = clubParNom(nom);
  if (club) return [club.c1, club.c2];
  const rng = graine('coul#' + nom);
  return [`hsl(${Math.floor(rng() * 360)} 62% 42%)`, '#ffffff'];
}

const EMOJI: Record<TypeCommentaire, string> = {
  essai: '🏉', but: '🎯', butRate: '❌', plaquage: '💥', franchissement: '⚡',
  ruck: '🔒', melee: '🌀', touche: '🙌', maul: '🚂', pied: '🦶', penalite: '⚖️',
  carton: '🟨', remplacement: '🔄', jalon: '🔔', jeu: '•',
};

const CLE_PHASE: Record<string, string> = {
  coupEnvoi: 'ml.phase.coupEnvoi', renvoi22: 'ml.phase.renvoi22', ruck: 'ml.phase.ruck',
  melee: 'ml.phase.melee', touche: 'ml.phase.touche', maul: 'ml.phase.maul',
  ballonEnLAir: 'ml.phase.ballonEnLAir', tirAuBut: 'ml.phase.tirAuBut',
  transformation: 'ml.phase.transformation', penalite: 'ml.phase.penalite',
  apresEssai: 'ml.phase.apresEssai', miTemps: 'ml.phase.miTemps',
};

const CLE_SYSTEME: Record<string, string> = {
  blitz: 'ml.systeme.blitz', glissee: 'ml.systeme.glissee', repli: 'ml.systeme.repli',
};

// ---------------------------------------------------------------------------
// LE FIL DE COMMENTAIRE — reconstruit seulement quand une ligne s'ajoute
// ---------------------------------------------------------------------------
// ⚠️ `n` est indispensable : `lignes` est le MÊME tableau muté par le moteur,
// donc sa référence ne change jamais et `memo` ne verrait aucune différence.
const Fil = memo(function Fil({ lignes }: { lignes: Commentaire[]; n: number }) {
  return (
    <>
      {lignes.map((c, i) => (
        <div
          key={i}
          className={`ml-action${c.points > 0 ? ' marque' : ''}${c.type === 'jalon' ? ' jalon' : ''}`}
          data-moi={c.moi ? 'oui' : undefined}
        >
          <span className="ml-minute">{c.minute}′</span>
          <span className="ml-emoji">{EMOJI[c.type] ?? '•'}</span>
          <span className="ml-texte">{c.texte}</span>
          {c.points > 0 && <b className="ml-points">+{c.points}</b>}
        </div>
      ))}
    </>
  );
});

/**
 * Professionnel ou amateur ?
 *
 * ⚠️ LA COUPURE EST À LA NATIONALE 2 (niveau 4), et elle n'est pas cosmétique :
 * c'est elle qui dit si une provocation part en bagarre une fois sur trois ou
 * une fois sur vingt-cinq, et si un coup de poing coûte trois dimanches ou une
 * demi-saison. Au-dessus — Top 14, Pro D2, Nationale et tous les championnats
 * étrangers (niveau 0) — on est en professionnel.
 */
function niveauDuMatch(joueur: Joueur | null | undefined, selection?: boolean): NiveauMatch {
  if (!joueur || selection) return 'pro';
  const niveau = competitionEffective(joueur.club, joueur.division)?.niveau ?? 0;
  return niveau >= 4 ? 'amateur' : 'pro';
}

/** Écran large : le fil peut vivre en colonne plutôt que dans le tiroir. */
function useLarge(): boolean {
  const [large, setLarge] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 980px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 980px)');
    const ecouter = () => setLarge(mq.matches);
    mq.addEventListener('change', ecouter);
    return () => mq.removeEventListener('change', ecouter);
  }, []);
  return large;
}

/**
 * 🎬 LE PLAN QUI SUIT UN CHOIX.
 *
 * ⚠️ IL PORTE LE RÉSULTAT, PAS SEULEMENT LE GESTE, et c'est tout le sujet du
 * retour de jeu « on clique mais pas l'impression que ça marche vraiment ».
 * Le geste seul dit ce qu'on a demandé ; le `resultat` dit ce que le moteur en
 * a fait — et c'est la phrase qu'il écrit de toute façon dans le fil, sortie du
 * fil pour être posée en grand au milieu de l'écran.
 */
interface Rejeu {
  /**
   * Secondes RÉELLES restantes au BANDEAU.
   *
   * ⚠️ CE N'EST PAS LA MÊME HORLOGE QUE LE PLAN DE CAMÉRA, et les séparer est
   * ce qui corrige « on clique mais pas l'impression que ça marche ». Un
   * crochet n'est pas joué à l'instant du clic : il ARME une intention, que le
   * moteur dépense au premier contact — qui peut venir quatre secondes plus
   * tard, ou jamais si personne ne monte. Le bandeau s'éteignait au bout des
   * 3,2 s du plan, c'est-à-dire souvent AVANT le geste qu'il annonçait. Il
   * tient maintenant tant que l'intention est armée, puis le temps de lire ce
   * qu'elle a donné.
   */
  restant: number;
  /**
   * Secondes RÉELLES restantes au PLAN DE CAMÉRA (gros plan + étiquette sur le
   * pion). Court, lui : c'est une durée de plan de télévision.
   */
  plan: number;
  /** Garde-fou : au-delà, on cesse d'attendre un geste qui ne viendra pas. */
  patience: number;
  /** Le geste choisi, tant que le plan tourne. */
  action: ActionJoueur | null;
  /** L'index du fil au moment du clic : tout ce qui suit est la conséquence. */
  depuis: number;
  /** La première ligne que le moteur a écrite sur MON joueur depuis. */
  resultat: Commentaire | null;
  /** La chance annoncée sur le bouton qu'on vient de toucher. */
  chance: number;
  /**
   * ⚠️ LE VERDICT — ET IL RESTE `null` TANT QUE LE DÉ N'EST PAS TOMBÉ.
   *
   * C'est la moitié écran du champ `Issue.joue`, et l'oublier ici annulait tout
   * le travail fait dans le moteur : sur une carte de RÉCEPTION (la majorité des
   * cartes), le ballon n'est pas encore dans les mains, le geste reste ARMÉ, et
   * `resoudreChoix` rend `reussi: false` faute de mieux. La bulle affichait donc
   * un ❌ rouge sur un crochet qui n'avait pas encore eu lieu — mesuré en jeu,
   * seize fois de suite. Un échec annoncé avant l'action, c'est pire que pas de
   * retour du tout.
   *
   * Tant qu'il est `null`, la bulle dit « ▶️ armé ». Le verdict arrive soit du
   * duel joué sur-le-champ, soit de la percée que le moteur signale au contact
   * (`e.perceeJoueur`), soit de la phrase que le moteur écrit sur le joueur.
   */
  verdict: { reussi: boolean; texte: string } | null;
  /**
   * ⚠️ LA FEUILLE DE MON JOUEUR AU MOMENT DU CLIC, ET C'EST ELLE QUI SAUVE
   * L'AFFAIRE. Le commentaire ne vient PAS toujours : le moteur n'écrit une
   * ligne que sur les évènements qui font une histoire, et « réclamer », «
   * soutenir » ou un crochet qui passe sans plaqueur n'en produisent aucune.
   * On resterait alors sur « ton joueur exécute… » et le retour de jeu serait
   * intact : « on clique mais pas l'impression que ça marche ».
   *
   * Les statistiques, elles, bougent presque toujours — et ce sont EXACTEMENT
   * celles qui font la note de fin de match. « +1 plaquage » est une preuve,
   * pas une animation.
   */
  avant: StatsMatch | null;
}

/**
 * Les gestes qui méritent un GROS PLAN — ceux qui se jouent au contact.
 *
 * ⚠️ TOUT LE RESTE SE LIT EN UNE SECONDE : une passe qui part, un coup de pied
 * qui s’envole. Leur donner les mêmes 3,2 secondes de ralenti coûtait trois
 * minutes par match depuis qu’une carte s’ouvre à chaque ballon.
 */
const CONTACTS = new Set<ActionJoueur>([
  'plaquage', 'monter', 'crochet', 'raffut', 'percussion', 'offload', 'grattage', 'chenille',
]);

/** La durée du plan quand il n’y a rien de spectaculaire à regarder. */
const REJEU_COURT = 1.5;

/** Une vibration courte, si le téléphone en a une. Silencieuse partout ailleurs. */
function vibrer(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Certains navigateurs exposent l'API et la refusent : ce n'est pas une erreur.
  }
}

// ---------------------------------------------------------------------------
export function MatchLive({
  match, saison, cle, titre, onFermer, onTermine, joueur, selection, manager,
}: {
  match: MatchChampionnat;
  saison: number;
  cle: string;
  titre: string;
  /** Match de sélection : les « clubs » sont des nations, et leurs effectifs
   *  sont les meilleurs joueurs réels du pays (lib/international.ts). */
  selection?: boolean;
  onFermer: () => void;
  /** Appelé UNE FOIS à la sirène : c'est ce qui autorise le passage à la
   *  semaine suivante quand on referme la fenêtre. */
  onTermine?: (resultat: {
    scoreA: number; scoreB: number; essaisA: number; essaisB: number;
  }) => void;
  joueur?: Joueur | null;
  manager?: {
    club: string;
    composition: CompositionManager;
    tactique: TactiqueManager;
    onTactique: (tactique: TactiqueManager) => void;
  };
}) {
  const iaActivee = useGame((s) => s.iaActivee);
  const tutoMatchVu = useGame((s) => s.tutoMatchVu);
  const setTutoMatchVu = useGame((s) => s.setTutoMatchVu);
  const enregistrerMatchVecu = useGame((s) => s.enregistrerMatchVecu);
  const appliquerSanctionMatch = useGame((s) => s.appliquerSanctionMatch);
  const { overlayRef, dialogRef } = useModalDialog(onFermer);
  const large = useLarge();

  // Le moteur vit dans une ref : c'est un objet muté sept fois par seconde de
  // jeu, le passer par l'état de React ferait des centaines de rendus.
  const moteur = useRef<EtatMatch>(null as unknown as EtatMatch);
  if (!moteur.current) {
    const effectif = (equipe: string) =>
      (selection ? effectifNational(equipe, saison) : effectifDuClub(equipe, saison));
    // En sélection, « son club » est sa NATION.
    const monEquipe = joueur ? (selection ? nomNation(joueur.nation) : joueur.club) : '';
    const effectifA = effectif(match.domicile);
    const effectifB = effectif(match.exterieur);
    const coteManager = manager?.club === match.domicile ? 'A'
      : manager?.club === match.exterieur ? 'B' : null;
    const effectifManager = coteManager === 'A' ? effectifA : coteManager === 'B' ? effectifB : null;
    const compoManager = manager && effectifManager
      ? reconcilerCompositionManager(effectifManager, manager.composition) : null;
    const feuilleManager = compoManager && effectifManager
      ? feuilleDepuisComposition(effectifManager, compoManager) : undefined;
    // Une composition moins forte que le meilleur XV disponible dégrade le
    // potentiel de marque. Choisir les cadres au bon poste n'est donc pas un
    // écran cosmétique ; le score de référence transmis au moteur bouge.
    const deltaCompo = compoManager && effectifManager
      ? Math.round((noteCompositionManager(effectifManager, compoManager)
        - noteCompositionManager(effectifManager, compositionManagerParDefaut(effectifManager))) * 1.25)
      : 0;
    const scoreA = scorePossible(match.scoreD + (coteManager === 'A' ? deltaCompo : 0));
    const scoreB = scorePossible(match.scoreE + (coteManager === 'B' ? deltaCompo : 0));
    moteur.current = creerMatch(
      match.domicile, match.exterieur,
      effectifA, effectifB,
      scoreA, scoreB, cle,
      joueur && (monEquipe === match.domicile || monEquipe === match.exterieur)
        ? {
            club: monEquipe, nom: joueur.nom, poste: joueur.poste,
            attributs: joueur.attributs,
            // Titulaire ou remplaçant ? La confiance du staff et le niveau
            // décident, comme pour le reste du jeu. Déterministe. ⚠️ En
            // sélection, on est toujours titulaire : on n'y est appelé que si
            // on est au niveau.
            titulaire: selection ? true : estTitulaire(joueur, cle),
          }
        : undefined,
      // ⚠️ LE NIVEAU DÉCIDE DE TOUTE LA DISCIPLINE : cartons plus fréquents et
      // bagarres faciles en amateur, arbitrage feutré mais commission
      // impitoyable chez les professionnels (voir `moteur/bagarre.ts`).
      {
        niveau: niveauDuMatch(joueur, selection), controle: true,
        ...(coteManager === 'A' && feuilleManager && compoManager && manager ? {
          compositionA: feuilleManager, tactiqueA: manager.tactique,
          capitaineAId: compoManager.capitaineId, buteurAId: compoManager.buteurId,
        } : {}),
        ...(coteManager === 'B' && feuilleManager && compoManager && manager ? {
          compositionB: feuilleManager, tactiqueB: manager.tactique,
          capitaineBId: compoManager.capitaineId, buteurBId: compoManager.buteurId,
        } : {}),
      },
    );
  }
  const e = moteur.current;
  const monPion = e.pions.find((p) => p.moi);

  const [, redessiner] = useState(0);
  const [enPause, setEnPause] = useState(false);
  // ⚠️ « JOUER » OU « REGARDER » EST LE PREMIER CHOIX DE L'ÉCRAN, et il
  // commande tout le reste : la caméra, le tempo, et la présence du HUD. On
  // démarre en JOUER dès qu'on a un pion — c'est le match du joueur, pas une
  // rediffusion.
  const [mode, setMode] = useState<'jouer' | 'regarder'>(monPion ? 'jouer' : 'regarder');
  // ⚠️ « DÉCISIONS » N'EST PLUS UN TEMPO PARMI D'AUTRES QUAND ON JOUE : C'EST
  // LE JEU. « On ne fait que les choix » — les autres tempos ne servent plus
  // qu'à regarder (⏩ accélérer, ⏭️ aller à la fin), et les quitter revient à
  // renoncer à jouer, ce que dit déjà le bouton 👁️ Je regarde.
  const [tempo, setTempo] = useState<Tempo>(monPion ? 'decisions' : 'suivre');
  /**
   * La carte de décision ouverte, s'il y en a une. Le match est FIGÉ tant
   * qu'elle est là : c'est tout l'intérêt.
   */
  const [decision, setDecision] = useState<Decision | null>(null);
  /** Le compte à rebours, en secondes RÉELLES. Une ref : il change 60 fois/s. */
  const chrono = useRef(DELAI_DECISION);
  /** `e.sim` au moment de la dernière carte : c'est lui qui espace les cartes. */
  const derniereDecision = useRef(0);
  // ⚠️ LA BOUCLE LIT UNE REF, PAS L'ÉTAT. Elle ne se réabonne pas à chaque
  // ouverture de carte : sans ça, ouvrir une carte relance `useEffect`, ce qui
  // remet `dernierTemps` à zéro et fait sauter le match d'un cran.
  const decisionRef = useRef<Decision | null>(null);
  decisionRef.current = decision;
  const [tiroir, setTiroir] = useState<null | 'fil' | 'consigne' | 'tactique' | 'commandes'>(null);
  const [consigneTexte, setConsigneTexte] = useState('');
  const [envoiConsigne, setEnvoiConsigne] = useState(false);
  const coteManager = manager?.club === e.clubA ? 'A' : manager?.club === e.clubB ? 'B' : null;
  const changerTactiqueManager = useCallback((partiel: Partial<TactiqueManager>) => {
    if (!manager || !coteManager || e.fini) return;
    const suivante = { ...manager.tactique, ...partiel };
    appliquerTactiqueEquipe(e, coteManager, suivante);
    manager.onTactique(suivante);
    redessiner((n) => n + 1);
  }, [manager, coteManager, e]);

  /**
   * ⚠️ CE QU’UN GESTE PASSÉ VIENT DE RAPPORTER, et qu’on afficherait sinon
   * une heure plus tard sur la feuille de match.
   *
   * Retour de jeu : « nos actions n’ont aucun impact dans le jeu […] une
   * passe peut arriver à une passe décisive ». La statistique existait, mais
   * quarante secondes séparent la passe de l’essai qu’elle amène : le fil a
   * défilé, la carte est refermée, et personne ne fait le lien. Le moteur
   * pousse la retombée dans `e.echos`, l’écran la vide et l’affiche.
   *
   * ⚠️ EN SECONDES RÉELLES, comme le plan de caméra : c’est une durée de
   * lecture, elle ne doit pas s’allonger parce que le jeu passe au ralenti.
   */
  const echoCourant = useRef<{ texte: string; restant: number } | null>(null);
  const filRef = useRef<HTMLDivElement>(null);
  const dernierTemps = useRef<number>(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  /** Les dimensions du terrain à l'écran, tenues par un ResizeObserver. */
  const boite = useRef({ largeur: 1, hauteur: 1 });
  const camera = useRef(new Camera());
  /**
   * ⚠️ LA TAILLE RÉELLE DE LA BULLE DU VERDICT, EN PIXELS.
   *
   * Elle est bornée au cadre pour ne jamais sortir de la scène — et cette borne
   * ne peut pas se calculer avec des marges fixes. Mesuré en jeu : sur un
   * téléphone de 375 px la bulle fait jusqu'à 315 px de large (~84 % de
   * l'écran), soit 158 px de demi-largeur pour une marge codée à 96. Résultat :
   * **13 relevés sur 13 hors cadre** — la moitié du verdict passait sous le
   * bord, exactement sur l'appareil où il compte le plus.
   *
   * ⚠️ ET C'EST UN ~ResizeObserver~, PAS UNE LECTURE PAR IMAGE. La bulle change
   * de taille quand son texte change (« armé » → la phrase du moteur) ; lire
   * ~offsetWidth~ à chaque image forcerait un recalcul de mise en page soixante
   * fois par seconde, ce qui est précisément ce qu'on évite pour la scène.
   */
  const tailleBulle = useRef({ l: 180, h: 62 });
  const roBulle = useRef<ResizeObserver | null>(null);
  const mesurerBulle = useCallback((n: HTMLDivElement | null) => {
    roBulle.current?.disconnect();
    roBulle.current = null;
    if (!n) return;
    const lire = () => { tailleBulle.current = { l: n.offsetWidth, h: n.offsetHeight }; };
    lire();
    const ro = new ResizeObserver(lire);
    ro.observe(n);
    roBulle.current = ro;
  }, []);
  const vueRef = useRef<Vue | null>(null);
  /**
   * 🎬 LE RALENTI QUI SUIT UN CHOIX — c'est la moitié « et qu'on voie vraiment
   * notre joueur effectuer le choix » de la demande.
   *
   * `restant` : secondes RÉELLES qu'il reste à ce plan. Tant qu'il tourne, la
   * caméra se colle au pion (cadrage rapproché, 100 % sur lui) et son geste
   * s'écrit au-dessus de sa tête.
   *
   * ⚠️ UNE REF, PAS UN ÉTAT : il est décrémenté à chaque image, et la boucle
   * redessine déjà. Le passer par `useState` ferait soixante rendus par seconde
   * de plus pour la même image.
   */
  const rejeu = useRef<Rejeu>({
    restant: 0, plan: 0, patience: 0, action: null, chance: 0, depuis: 0,
    resultat: null, verdict: null, avant: null,
  });
  /**
   * ⚠️ L'ENCHAÎNEMENT. Demande : « il peut y avoir des combos sur l'action — tu
   * perces, tu peux tenter un autre truc sur le défenseur ».
   *
   * Quand `resoudreChoix` rend `combo: true` (le vis-à-vis est au sol, je suis
   * debout, ballon en main), on rouvre une carte IMMÉDIATEMENT, sans attendre le
   * repos de 95 secondes simulées qui espace les carrefours ordinaires.
   *
   * ⚠️ ET ON COMPTE LES MAILLONS. Sans plafond, un joueur en forme enchaînerait
   * crochet sur crochet jusqu'à l'en-but et le match deviendrait un jeu de
   * cartes. Trois gestes d'affilée, c'est déjà une action d'anthologie.
   */
  const combo = useRef({ attendu: false, chaine: 0 });
  /**
   * Le numéro de la carte en cours. Sert de `key` au compte à rebours : c'est
   * lui qui relance l'animation CSS à chaque nouvelle carte, puisque React
   * réutilise sinon le même nœud et que l'animation ne repart pas toute seule.
   */
  const noCarte = useRef(0);
  /**
   * ⚠️ LE TUTORIEL FIGE LE MATCH, LUI AUSSI. Il ne le faisait pas : un joueur
   * qui découvrait le jeu lisait trois lignes pendant que le match défilait à
   * seize fois la vitesse réelle derrière le voile. La boucle le lit dans une
   * ref pour ne pas se réabonner (même raison que `decisionRef`).
   */
  const tutoRef = useRef(false);
  /**
   * Le moment en cours, avec sa tenue (voir `moments.ts`).
   *
   * ⚠️ DEUX CHAMPS, ET PAS UN SEUL. `actuel` est le moment VRAI de cette image :
   * c'est lui qu'affiche la bannière, sinon on lit encore « le ballon est à
   * toi » deux secondes après l'avoir donné. `tenue` fait durer le RALENTI
   * au-delà du moment, pour qu'on voie le résultat de son geste au lieu que la
   * vitesse reparte dans la même seconde.
   */
  const momentRef = useRef<{ actuel: Moment | null; tenue: number }>({ actuel: null, tenue: 0 });

  // Les valeurs lues pendant le rendu : posées par la boucle, lues juste après.
  const vue = vueRef.current;
  const moment = momentRef.current.actuel;

  const enJeu = mode === 'jouer' && !!monPion;
  // ⚠️ « J'AI UN PION » ET « JE PEUX JOUER » NE SONT PAS LA MÊME CHOSE : sur le
  // banc ou sous carton, le pion existe toujours (il porte ses statistiques et
  // ses minutes) mais il n'est pas sur le pré.
  const jePeuxJouer = !!monPion && monPion.surLeTerrain && monPion.sanction <= 0;

  // --- LA TAILLE DU TERRAIN À L'ÉCRAN ---------------------------------------
  // ⚠️ Par ResizeObserver, PAS par `getBoundingClientRect()` à chaque image :
  // lire la géométrie soixante fois par seconde force un recalcul de mise en
  // page à chaque fois, et c'est exactement ce qui fait tomber un téléphone de
  // 60 à 40 images par seconde.
  useEffect(() => {
    const noeud = sceneRef.current;
    if (!noeud) return;
    const mesurer = () => {
      const r = noeud.getBoundingClientRect();
      boite.current = { largeur: Math.max(1, r.width), hauteur: Math.max(1, r.height) };
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(noeud);
    return () => ro.disconnect();
  }, []);

  /**
   * Refermer la carte, avec ou sans geste.
   *
   * ⚠️ ON REJOUE AU RALENTI APRÈS LE CHOIX. Sans ça, on choisit « je plaque »,
   * le jeu repart à seize fois la vitesse réelle et trois images plus tard on
   * est au regroupement suivant sans avoir rien vu. Un choix dont on ne voit
   * pas le résultat n'apprend rien et ne procure rien : on force donc quelques
   * secondes de ralenti, exactement comme sur un moment.
   */
  const fermerDecision = useCallback((joue: boolean) => {
    decisionRef.current = null;
    setDecision(null);
    momentRef.current.tenue = joue ? REJEU : TENUE;
  }, []);

  /**
   * Le choix est fait : on l'arme, et ON LE REGARDE SE JOUER.
   *
   * ⚠️ `demanderAction` EST LE SEUL CHEMIN, et il rend `false` si l'action n'est
   * plus jouable — un plaquage armé sur un porteur qui vient de donner, par
   * exemple. Dans ce cas on ne lance PAS de ralenti : trois secondes de gros
   * plan sur un pion qui ne fait rien, c'est pire que pas de ralenti du tout.
   */
  const jouerDecision = useCallback((option: OptionDecision) => {
    const moi = e.pions.find((q) => q.moi);
    if (!moi) return;
    const avant = { ...moi.stats };
    const depuis = e.commentaires.length;
    // ⚠️ ICI, LE GESTE EST JOUÉ — PAS ARMÉ. C'est toute la demande : « que ça
    // s'applique vraiment, plaquage réussi ça plaque direct, plaquage raté le
    // mec perce ». `resoudreChoix` tire UNE fois, avec la chance exacte écrite
    // sur le bouton qu'on vient de toucher, et applique l'issue sur-le-champ.
    const issue = resoudreChoix(e, moi, option.action);
    // ⚠️ LE PLAN DURE CE QU’IL Y A À VOIR. Trois secondes de gros plan après
    // CHAQUE passe, soixante fois par match, c’est trois minutes de ralenti sur
    // des gestes qui n’en demandent pas. Un contact, si : on veut voir le
    // plaquage, le crochet, la percussion. Le reste se lit en une seconde.
    const duree = CONTACTS.has(option.action) ? REJEU : REJEU_COURT;
    rejeu.current = {
      restant: duree,
      plan: duree,
      // ⚠️ Le geste est résolu : il n'y a plus rien à attendre. La patience ne
      // sert qu'aux gestes restés armés faute de vis-à-vis (un crochet demandé
      // avant d'avoir le ballon), que `resoudreChoix` signale en ne changeant
      // rien d'autre que l'intention.
      patience: 12,
      action: option.action,
      chance: option.chance,
      depuis,
      resultat: null,
      // ⚠️ PAS DE VERDICT SI LE DÉ N'A PAS ÉTÉ LANCÉ. Voir `Issue.joue`.
      verdict: issue.joue ? { reussi: issue.reussi, texte: issue.texte } : null,
      avant,
    };
    // Deux vibrations pour une réussite, une seule sinon : on sait ce qui s'est
    // passé avant même d'avoir lu.
    vibrer(issue.reussi ? 26 : 12);
    // ⚠️ L'ENCHAÎNEMENT N'EST PLUS DÉCIDÉ ICI : `e.perceeJoueur` est le seul
    // signal, et la boucle le consomme (voir plus bas). Un duel tranché
    // sur-le-champ lève déjà le drapeau ; un geste armé le lèvera au contact.
    // Ce qu'on fait ici, c'est seulement CLORE la chaîne quand rien n'a percé.
    if (!issue.combo) combo.current = { attendu: false, chaine: 0 };
    fermerDecision(true);
  }, [e, fermerDecision]);

  // --- LA BOUCLE DE RENDU ---------------------------------------------------
  useEffect(() => {
    let brut = 0;
    let actif = true;
    const image = (ms: number) => {
      if (!actif) return;
      brut = requestAnimationFrame(image);
      const precedent = dernierTemps.current || ms;
      dernierTemps.current = ms;
      const dtReel = Math.min(0.2, (ms - precedent) / 1000);

      const moi = e.pions.find((p) => p.moi);
      const { largeur, hauteur } = boite.current;
      const ratio = largeur / hauteur;
      const angle = angleDeVue(moi?.cote ?? 'A', hauteur > largeur);

      // ── 🎬 LE PLAN SUR MON JOUEUR, ET CE QU'IL A DONNÉ ───────────────────
      // ⚠️ EN SECONDES RÉELLES, PAS SIMULÉES : c'est une durée de PLAN, elle ne
      // doit pas s'allonger parce que le jeu tourne au ralenti — ce serait le
      // serpent qui se mord la queue, puisque c'est justement lui qui ralentit.
      const rj = rejeu.current;
      // ⚠️ ON RETIENT L'ÉTAT D'AVANT pour savoir s'il faut un rendu. Les états
      // figés (carte, pause, tuto) sortent de la boucle SANS redessiner —
      // c'est le correctif qui libère le fil principal sur téléphone. Mais si
      // le plan sur mon joueur s'éteint pile pendant l'un d'eux, le bandeau
      // resterait affiché jusqu'à la reprise.
      // ── 🎁 LES RETOMBÉES : ce qu’un geste passé vient de rapporter ──────
      // ⚠️ UNE SEULE À LA FOIS, ET DANS L’ORDRE. Deux essais coup sur coup
      // sont impossibles, mais une passe décisive et un ballon volé peuvent
      // tomber sur le même essai : les empiler les rendrait illisibles.
      const ec = echoCourant.current;
      if (ec) {
        ec.restant -= dtReel;
        if (ec.restant <= 0) echoCourant.current = null;
      }
      if (!echoCourant.current && e.echos.length) {
        const r = e.echos.shift()!;
        echoCourant.current = { texte: t(r.cle, { nom: r.nom, cible: r.cible }), restant: 4.5 };
      }

      const gesteAvant = rj.action;
      if (rj.plan > 0) rj.plan = Math.max(0, rj.plan - dtReel);

      // ── ⚡ L'ENCHAÎNEMENT ─────────────────────────────────────────────────
      // ⚠️ LE MOTEUR SIGNALE LA PERCÉE, L'ÉCRAN LA CONSOMME. Le drapeau est posé
      // au fond de `resoudrePlaquage`, ce qui couvre les DEUX chemins : le duel
      // tranché sur-le-champ, et le geste resté armé qui trouve son contact deux
      // secondes plus tard — le cas le plus fréquent, puisque la carte tombe
      // souvent avant que le ballon arrive.
      if (e.perceeJoueur) {
        e.perceeJoueur = false;
        // Le geste armé vient d'aboutir : on peut enfin trancher son verdict.
        if (rj.action && !rj.verdict) {
          rj.verdict = { reussi: true, texte: '' };
          rj.plan = Math.max(rj.plan, REJEU);
        }
        if (combo.current.chaine < 2) {
          combo.current = { attendu: true, chaine: combo.current.chaine + 1 };
        }
      }
      if (rj.restant > 0) {
        rj.patience = Math.max(0, rj.patience - dtReel);
        // ⚠️ TANT QUE L'INTENTION EST ARMÉE, LE BANDEAU RESTE. C'est là toute
        // la différence : il annonce un geste qui n'a pas encore eu lieu, et
        // il doit être encore là quand il a lieu. Le moteur consomme
        // l'intention (`consommerIntention`) au moment exact où il la joue ;
        // ce test suit donc le geste, pas un minuteur arbitraire.
        const armeeEncore = !!e.intention && e.intention.type === rj.action;
        if (armeeEncore && !rj.resultat && rj.patience > 0) rj.restant = Math.max(rj.restant, 0.5);
        // ⚠️ ON GUETTE CE QUE LE MOTEUR ÉCRIT SUR MOI, et c'est ça, « le
        // résultat de l'action ». On ne l'invente pas et on ne le devine pas :
        // c'est la phrase que le fil aurait affichée de toute façon, sortie du
        // fil pour être posée en grand. `moi` est déjà porté par le
        // commentaire (`dire(…, p.moi)`), donc rien à recalculer.
        // ⚠️ ON GUETTE ENCORE, MÊME AVEC UN VERDICT : un plaquage réussi peut
        // être suivi d'un grattage, d'une pénalité, d'un essai. Le verdict dit
        // l'issue du DUEL, le commentaire dit la suite de l'ACTION.
        if (!rj.resultat) {
          for (let i = rj.depuis; i < e.commentaires.length; i++) {
            const c = e.commentaires[i];
            if (!c.moi) continue;
            if (rj.verdict && c.texte === rj.verdict.texte) continue;
            rj.resultat = c;
            // ⚠️ ET ON PROLONGE LE PLAN POUR QU'ON AIT LE TEMPS DE LIRE. Un
            // essai qui s'affiche trois dixièmes de seconde avant que la
            // caméra reparte, c'est exactement le « on ne voit pas ce que ça a
            // fait » qu'on essaie de corriger.
            rj.restant = Math.max(rj.restant, c.points > 0 ? 3.4 : 2.4);
            break;
          }
        }
        rj.restant = Math.max(0, rj.restant - dtReel);
        if (rj.restant === 0) { rj.action = null; rj.resultat = null; rj.verdict = null; }
      }
      const planAChange = rj.action !== gesteAvant || (rj.restant > 0 && !!rj.resultat);

      // ── ⏱️ EST-CE MON MOMENT ? ────────────────────────────────────────────
      const m = enJeu ? momentDuJoueur(e, moi) : null;
      const suivi = momentRef.current;
      // Nouveau moment : une vibration courte pour dire « c'est à toi »,
      // parce qu'un ralenti qu'on n'a pas vu venir ne sert à rien.
      if (m && (!suivi.actuel || suivi.actuel.type !== m.type)) vibrer(18);
      suivi.actuel = m;
      if (m) suivi.tenue = TENUE;
      else if (suivi.tenue > 0) suivi.tenue = Math.max(0, suivi.tenue - dtReel);
      const enMoment = suivi.tenue > 0;

      // ── 🎥 LA CAMÉRA ──────────────────────────────────────────────────────
      const ballon = positionBallon(e);
      let cadrage: Cadrage = 'large';
      let cible: Vec = ballon;
      if (enJeu && moi && moi.surLeTerrain && moi.sanction <= 0) {
        cadrage = enMoment ? 'proche' : 'suivi';
        // ⚠️ PENDANT LE RALENTI QUI SUIT UN CHOIX, LA CAMÉRA NE REGARDE QUE LUI.
        // Le reste du temps on cadre un compromis entre le ballon et son pion,
        // et c'est la bonne lecture — on doit voir venir ce qui arrive. Mais
        // trois secondes après « je plaque », le sujet du plan N'EST PAS le
        // ballon : c'est le joueur qui va au contact. À 0,5 de pondération, un
        // plaquage à douze mètres du ballon se jouait au bord du cadre, et la
        // demande « qu'on voie vraiment notre joueur effectuer le choix »
        // restait lettre morte.
        const poids = rejeu.current.plan > 0 ? 1 : enMoment ? 0.5 : 0.38;
        cible = {
          x: ballon.x + (moi.pos.x - ballon.x) * poids,
          y: ballon.y + (moi.pos.y - ballon.y) * poids,
        };
        // ⚠️ ET SON PION RESTE DANS LE CADRE, quoi qu'il arrive. Sans cette
        // borne, un dégagement de soixante mètres emmène la caméra sur le
        // ballon et le joueur se retrouve à piloter un pion invisible.
        const marge = Math.max(8, COUVERTURE[cadrage] / 2 - 7);
        cible = {
          x: borner(cible.x, moi.pos.x - marge, moi.pos.x + marge),
          y: borner(cible.y, moi.pos.y - marge, moi.pos.y + marge),
        };
      }
      vueRef.current = camera.current.suivre(cible, cadrage, ratio, angle, dtReel);

      // Match terminé : on arrête la boucle, plus rien ne bouge.
      if (e.fini) { redessiner((n) => n + 1); actif = false; cancelAnimationFrame(brut); return; }

      // ── ⏸️ LA CARTE DE DÉCISION ──────────────────────────────────────────
      // ⚠️ LE MATCH EST FIGÉ TANT QU'ELLE EST OUVERTE, et le compte à rebours
      // tourne en temps RÉEL. C'est la demande : « un moment, dix secondes pour
      // choisir une action, et ça la simule ». Rien n'avance : ni le chrono du
      // match, ni les pions, ni le moteur. On ne perd donc pas une action à
      // rester devant sa carte.
      if (decisionRef.current) {
        chrono.current -= dtReel;
        if (chrono.current <= 0) {
          // ⚠️ NE PAS CHOISIR EST UN CHOIX, et il se dit. Le moteur reprend son
          // rugby automatique, comme pour les vingt-neuf autres : ce n'est pas
          // une punition, c'est ce qui arrive quand on reste spectateur.
          if (moi) ajouterCommentaire(e, 'jeu', moi.cote, t('ml.dec.hesite', { nom: moi.nom }), 0, true);
          fermerDecision(false);
        }
        // ⚠️ ON NE REDESSINE PAS, ET C'EST UN CORRECTIF, PAS UNE OPTIMISATION.
        // On appelait `redessiner` ici à CHAQUE IMAGE, pendant les dix secondes
        // où le match est figé et où pas un pion ne bouge — soixante
        // réconciliations React par seconde, trente pions à chaque fois, pour
        // animer une barre de progression. Sur un téléphone, ça sature le fil
        // principal et les taps ne passent plus : c'est la moitié invisible de
        // « les boutons de choix ne fonctionnent pas ». La barre est désormais
        // une animation CSS (voir `.ml-dec-chrono`), et l'ouverture comme la
        // fermeture de la carte déclenchent déjà leur propre rendu.
        if (planAChange) redessiner((n) => n + 1);
        return;
      }
      if (tempo === 'decisions' && enJeu && !enPause && !tutoRef.current) {
        // ⚠️ UN ENCHAÎNEMENT NE PASSE PAS PAR LE REPOS. On vient de percer : la
        // carte suivante doit tomber TOUT DE SUITE, sinon « tu peux tenter un
        // autre truc sur le défenseur » n'arrive jamais — 95 secondes simulées
        // séparent deux carrefours ordinaires. On lui donne aussi moins de
        // temps : on est au cœur de l'action, pas devant un choix de plan.
        const enchaine = combo.current.attendu;
        const repos = enchaine ? REPOS_DECISION : e.sim - derniereDecision.current;
        const carte = decisionPour(e, moi, repos);
        if (carte) {
          combo.current.attendu = false;
          derniereDecision.current = e.sim;
          const ouverte = { ...carte, enchaine };
          chrono.current = delaiDeCarte(ouverte);
          noCarte.current += 1;
          decisionRef.current = ouverte;
          setDecision(ouverte);
          return;
        }
        // L'enchaînement n'a rien trouvé à proposer (tout est en recharge) :
        // on le laisse tomber plutôt que de le tenir en attente.
        if (enchaine) combo.current = { attendu: false, chaine: 0 };
      }

      // ⚠️ MÊME RÈGLE POUR LA PAUSE ET LE TUTORIEL : rien ne bouge, donc on ne
      // redessine pas. Et le tutoriel ARRÊTE le match, ce qu'il ne faisait pas
      // — on lisait trois lignes pendant que le jeu défilait à seize fois la
      // vitesse réelle derrière le voile.
      if (enPause || tutoRef.current) {
        if (planAChange) redessiner((n) => n + 1);
        return;
      }

      avancer(e, dtReel * facteurTempo(tempo, enMoment));
      redessiner((n) => n + 1);
    };
    brut = requestAnimationFrame(image);
    return () => { actif = false; cancelAnimationFrame(brut); };
  }, [enPause, tempo, enJeu, e, fermerDecision]);

  // ⚠️ LES CHIFFRES CHOISISSENT SUR LA CARTE — c'est le SEUL clavier du match,
  // maintenant qu'on ne pilote plus rien. Une carte à dix secondes se joue à la
  // main gauche sans quitter le terrain des yeux, et le chiffre est écrit sur
  // chaque option. On lit `ev.code` et pas `ev.key` : en AZERTY la rangée des
  // chiffres rend « & é " ' ( » sans Maj.
  useEffect(() => {
    if (!decision) return;
    const auClavier = (ev: KeyboardEvent) => {
      const n = Number((/^Digit([1-9])$/.exec(ev.code) ?? [])[1]);
      const choix = decision.options[n - 1];
      if (!choix) return;
      ev.preventDefault();
      jouerDecision(choix);
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [decision, jouerDecision]);

  // Le mode commande le contrôle du moteur : une seule vérité, pas deux.
  useEffect(() => { activerControle(e, mode === 'jouer'); }, [mode, e]);

  useEffect(() => {
    filRef.current?.scrollTo({ top: filRef.current.scrollHeight });
  }, [e.commentaires.length]);

  // ⚠️ IL N'Y A PLUS QU'UNE TOUCHE HORS CARTE, ET C'EST ÉCHAP. Tout le reste
  // — les quatre directions, le sprint maintenu, la barre d'espace « fais ce
  // qu'il faut faire », les gestes assignables, les boutons de souris — a été
  // retiré avec le pilotage. On ne relâche donc plus rien au `blur` : plus
  // aucun état de touche ne survit à un changement d'onglet, puisqu'il n'y en a
  // plus.
  useEffect(() => {
    const clavier = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onFermer();
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [onFermer]);

  // ⚠️ UNE BAGARRE MET LA PAUSE, ET C'EST INDISPENSABLE. Le moteur attend un
  // ordre pour la résoudre : laisser le match défiler pendant qu'on lit quatre
  // boutons reviendrait à choisir au hasard. La reprise est faite par le bouton
  // d'ordre lui-même — sinon le jeu resterait figé sur une phase que seul un
  // tick peut refermer.
  const bagarre = e.bagarre;
  useEffect(() => {
    if (bagarre) setEnPause(true);
  }, [bagarre]);

  // --- LE COACHING EN DIRECT ------------------------------------------------
  const envoyerConsigne = async () => {
    const texte = consigneTexte.trim();
    if (!texte) return;
    setConsigneTexte('');
    setEnvoiConsigne(true);
    appliquerConsigne(e, lireConsigneLocale(texte));
    if (iaActivee && iaDisponible()) {
      try {
        const fine = await lireConsigneIA(texte,
          `${e.clubA} ${e.scoreA} - ${e.scoreB} ${e.clubB}, ${e.minute}e minute.`);
        appliquerConsigne(e, fine);
      } catch {
        // On garde la lecture locale : le coaching marche toujours hors ligne.
      }
    }
    setEnvoiConsigne(false);
  };

  const [couleurA] = couleursDe(e.clubA);
  const [couleurB] = couleursDe(e.clubB);
  const clubA = clubParNom(e.clubA);
  const clubB = clubParNom(e.clubB);

  // --- 🎬 CE QUE MON JOUEUR EST EN TRAIN DE FAIRE ---------------------------
  // ⚠️ C'EST LA MOITIÉ « QU'ON VOIE VRAIMENT NOTRE JOUEUR EFFECTUER LE CHOIX »
  // DE LA DEMANDE. Il n'y a plus un seul bouton d'action à l'écran ; ce qu'il
  // reste à montrer, ce n'est plus ce qu'on PEUT faire, c'est ce qu'on VIENT DE
  // décider — au-dessus de la tête du pion, pendant que le ralenti le joue.
  //
  // ⚠️ ON LIT `rejeu` ET PAS `e.intention`, et la différence compte : une
  // intention est consommée dès que le moteur la joue (souvent au premier tick),
  // alors que l'étiquette doit tenir les trois secondes du plan. Un « 💥 Plaquer »
  // qui disparaît un dixième de seconde après le clic ne se lit pas.
  // De MON point de vue : +1 mon équipe est portée, −1 elle subit.
  const elanMoi = monPion ? elanDe(e, monPion.cote) : e.elan;
  const echo = echoCourant.current;
  const geste = rejeu.current.action ? ACTION_PAR_ID.get(rejeu.current.action) : undefined;
  const resultat = rejeu.current.resultat;
  // Ce que le geste a VRAIMENT ajouté à sa feuille depuis le clic.
  const acquis = geste && monPion ? ecartsDeFeuille(rejeu.current.avant, monPion.stats) : [];
  const verdict = rejeu.current.verdict;
  // Sur qui il va aller : le cercle sur le porteur adverse dit à qui s'adresse
  // un plaquage ou un grattage. C'est une aide de LECTURE, pas une commande.
  const cibleDefense = enJeu && jePeuxJouer && monPion && e.possession !== monPion.cote
    ? e.porteur : null;

  // La feuille de match n'est calculée qu'une fois, à la sirène.
  const bilanRef = useRef<ReturnType<typeof bilan> | null>(null);
  if (e.fini && !bilanRef.current) bilanRef.current = bilan(e);
  const stats = bilanRef.current;

  // Le détail de MA note. Calculé à partir de la même feuille que celle qui
  // part dans la saison — donc rigoureusement la note qui compte.
  const maNote = useMemo(() => {
    if (!e.fini || !monPion) return null;
    const s = statsPourLaNote(monPion);
    return { note: noterMatch(monPion.poste, s), detail: detailNote(monPion.poste, s) };
  }, [e.fini, monPion]);

  // ⚠️ À LA SIRÈNE, LES VRAIES STATS DE TON JOUEUR PARTENT DANS LA SAISON.
  // Elles alimentent le classement des joueurs (écran Résultats) : ce ne sont
  // plus des chiffres estimés, ce sont ceux du match qu'on vient de jouer.
  const dejaEnregistre = useRef(false);
  useEffect(() => {
    if (!e.fini || dejaEnregistre.current) return;
    dejaEnregistre.current = true;
    onTermine?.({ scoreA: e.scoreA, scoreB: e.scoreB, essaisA: e.essaisA, essaisB: e.essaisB });
    if (!monPion) return;
    // ⚠️ Le RÉSULTAT part avec les statistiques : c'est ce qui permet à la
    // feuille de match d'être la seule entrée du journal pour ce week-end.
    const chezMoi = monPion.cote === 'A';
    enregistrerMatchVecu(
      statsPourLaNote(monPion),
      {
        adversaire: chezMoi ? e.clubB : e.clubA,
        scorePour: chezMoi ? e.scoreA : e.scoreB,
        scoreContre: chezMoi ? e.scoreB : e.scoreA,
        domicile: chezMoi,
        // « Top 14 · 22 novembre · journée 7 » → « 22 novembre · journée 7 » :
        // le nom de la compétition est déjà partout ailleurs dans le journal.
        libelle: titre.split('·').slice(1).map((m) => m.trim()).filter(Boolean).join(' · ')
          || t('ml.feuilleMatch'),
      },
    );
    // ⚠️ ET LA DISCIPLINE PART AVEC, JUSTE APRÈS. C'est le seul chemin par
    // lequel un carton rouge ou un coup de poing devient une suspension.
    // L'ordre compte — `enregistrerMatchVecu` peut poser une blessure de match,
    // et la suspension doit passer par-dessus.
    appliquerSanctionMatch({
      citation: e.discipline.citation,
      blessure: e.discipline.blessure,
      jaunes: e.discipline.jaunes,
      rouges: e.discipline.rouges,
    });
  }, [e.fini, e, monPion, enregistrerMatchVecu, appliquerSanctionMatch, onTermine, titre]);

  // --- LE RENDU DES PIONS ---------------------------------------------------
  // ⚠️ Interpolation exacte : le moteur avance par pas de 0,15 s, l'écran à
  // 60 Hz. On affiche la position à l'instant réel, `pos + vitesse × reliquat`.
  // ⚠️ Borné à un pas de simulation : en ⏭️ le reliquat peut valoir plusieurs
  // secondes de jeu non consommées, et projeter les pions hors du terrain.
  const r = Math.min(DT, Math.max(0, e.reliquat));
  const surLeTerrain = e.pions.filter((p) => p.surLeTerrain && p.sanction <= 0);

  // ⚠️ LES PIONS SONT À LEUR TAILLE RÉELLE (0,86 m de rayon), avec un simple
  // PLANCHER EN PIXELS pour qu'ils ne disparaissent jamais.
  //
  // ⚠️ LA PREMIÈRE VERSION LES GROSSISSAIT AVEC LE DÉZOOM (`portée × 0,016`),
  // et c'était une erreur visible dès qu'on passait en « Je regarde » : en vue
  // large, trente pions de 19 px sur un terrain entier se chevauchent, on ne
  // lit plus ni les lignes, ni les espaces, ni les intervalles — c'est-à-dire
  // exactement ce qu'on est venu regarder. À taille réelle, la vue large montre
  // la FORME DU JEU et la vue rapprochée reste tactile toute seule (26 px de
  // diamètre sur un téléphone), sans qu'on ait à corriger quoi que ce soit.
  //
  // ⚠️ ET LE PLANCHER SE COMPTE EN PIXELS, PAS EN MÈTRES : c'est le seul repère
  // qui vaille, puisque le nombre de pixels par mètre change avec le cadrage,
  // l'orientation ET la taille de l'écran.
  const pxParMetre = vue ? boite.current.largeur / vue.W : 4;
  const rayon = Math.max(0.86, 3.6 / pxParMetre);
  const tailleTexte = Math.max(rayon * 1.16, 7.6 / pxParMetre);
  // ⚠️ LE NUMÉRO EST TOUJOURS LÀ, MÊME EN VUE LARGE. Il avait été masqué sous
  // 7 px, au motif qu'il « salissait » le pion — retour de jeu immédiat :
  // « quand on regarde les joueurs on n'a pas les numéros, on les a seulement
  // quand on joue ». Sans numéro, un match qu'on regarde n'est plus qu'un
  // nuage de points : on ne suit personne, on ne reconnaît pas son club, on ne
  // sait pas qui vient de marquer. Le texte a donc son propre PLANCHER en
  // pixels, indépendant du disque : il déborde très légèrement en vue large, et
  // le liseré noir (`paintOrder: stroke`) le garde lisible sur le maillot.
  // ⚠️ ET LE CONTOUR NE DESCEND JAMAIS SOUS UN PIXEL ET DEMI. Sans numéro, le
  // liseré clair (camp A) ou sombre (camp B) devient le SEUL moyen de séparer
  // deux équipes aux couleurs voisines — et à 0,8 px il ne se voyait plus.
  const trait = Math.max(rayon * 0.18, 1.5 / pxParMetre);

  // ⚠️ OÙ EST MON PION À L'ÉCRAN, EN PIXELS. C'est là que se pose la bulle du
  // verdict. `versEcran` rend des unités de viewBox ; `pxParMetre` les convertit
  // — et le rapport est exact, parce que la caméra construit son cadre avec le
  // ratio du conteneur (le `slice` du SVG ne rogne donc rien).
  const perso = (() => {
    if (!vue || !monPion || !surLeTerrain.includes(monPion)) return null;
    const q = vue.versEcran({
      x: monPion.pos.x + monPion.vitesse.x * r,
      y: monPion.pos.y + monPion.vitesse.y * r,
    });
    return { x: q.x * pxParMetre, y: q.y * pxParMetre };
  })();

  const pion = (p: Pion) => {
    const x = p.pos.x + p.vitesse.x * r;
    const y = p.pos.y + p.vitesse.y * r;
    const porte = e.porteur === p;
    return (
      <g key={p.id} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
        {p.moi && <circle r={rayon * 2.1} className="ml-aura" />}
        <ellipse cx={rayon * 0.14} cy={rayon * 0.35} rx={rayon} ry={rayon * 0.7} fill="rgba(0,0,0,.35)" />
        <circle
          r={rayon}
          fill={p.cote === 'A' ? couleurA : couleurB}
          stroke={p.moi ? '#ffd45e' : porte ? '#fff6d8' : p.cote === 'A' ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.55)'}
          strokeWidth={p.moi || porte ? Math.max(rayon * 0.34, trait * 1.8) : trait}
        />
        {/* ⚠️ Les numéros reçoivent la rotation INVERSE de la caméra : sans ça
            ils se lisent de travers dès que le terrain pivote en portrait. */}
        <text
          transform={vue?.redresser}
          y={tailleTexte * 0.36} textAnchor="middle" fontSize={tailleTexte} fill="#fff" fontWeight="700"
          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.6)', strokeWidth: tailleTexte * 0.26 }}
        >
          {p.numero}
        </text>
        {/* Le chevron : c'est LUI qui répond à « où est mon joueur ». */}
        {p.moi && (
          <g transform={vue?.redresser}>
            <path
              className="ml-chevron"
              d={`M ${-rayon * 0.9} ${-rayon * 2.7} L ${rayon * 0.9} ${-rayon * 2.7} L 0 ${-rayon * 1.5} Z`}
            />
            {/* ⚠️ L'ÉTIQUETTE DU GESTE ÉTAIT ICI, EN SVG. Elle est devenue une
                BULLE HTML posée aux coordonnées écran du pion (.ml-perso, plus
                bas) : le verdict d'un duel est une PHRASE — « Crochet de Baille !
                Bertin plaque dans le vide. » — et une phrase, ça se met en forme
                avec une pastille, un retour à la ligne et une largeur maximale.
                Le SVG ne sait rien faire de tout ça sans qu'on le recode. */}
          </g>
        )}
      </g>
    );
  };

  // Le ballon : porté, en vol, ou au sol. En vol on l'agrandit et on garde son
  // ombre au sol — c'est ce qui donne la sensation de hauteur.
  const ballon = positionBallonInterpolee(e, r);
  const possession = e.compteurs.tempsA + e.compteurs.tempsB > 0
    ? Math.round((e.compteurs.tempsA / (e.compteurs.tempsA + e.compteurs.tempsB)) * 100)
    : 50;
  const derniere = e.commentaires[e.commentaires.length - 1];

  // La flèche de bord quand le ballon sort du cadre : sans elle, on perd le
  // ballon de vue dès qu'un dégagement part à l'opposé.
  const flecheBallon = (() => {
    if (!vue || !enJeu) return null;
    const p = vue.versEcran(ballon);
    const dedans = p.x > 1 && p.x < vue.W - 1 && p.y > 1 && p.y < vue.H - 1;
    if (dedans) return null;
    const bx = borner(p.x, 2.5, vue.W - 2.5);
    const by = borner(p.y, 2.5, vue.H - 2.5);
    const angle = (Math.atan2(p.y - by, p.x - bx) * 180) / Math.PI;
    return { bx, by, angle };
  })();

  const pelouse = useMemo(() => <PelouseMemo />, []);
  const montrerTuto = enJeu && jePeuxJouer && !tutoMatchVu && !e.fini;
  // ⚠️ LA BOUCLE LE LIT DANS UNE REF, comme la carte de décision : la poser en
  // dépendance de `useEffect` relancerait la boucle et remettrait `dernierTemps`
  // à zéro, ce qui fait sauter le match d'un cran à chaque bascule.
  tutoRef.current = montrerTuto;

  return createPortal(
    <div ref={overlayRef} className="overlay-match" onClick={(ev) => { if (ev.target === ev.currentTarget) onFermer(); }}>
      <motion.div
        ref={dialogRef}
        className="match-live"
        data-mode={mode}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* ═══ L'EN-TÊTE — score, minute, et rien d'autre ═══════════════════ */}
        <header className="ml-tete">
          <div className="ml-equipe">
            {clubA ? <Blason club={clubA} taille={26} /> : <LogoEquipe nom={e.clubA} taille={26} />}
            <b>{e.clubA}</b>
          </div>
          <div className="ml-score">
            <span>{e.scoreA}</span>
            <i>{e.minute}′{e.sirene && <em className="ml-sirene"> +</em>}</i>
            <span>{e.scoreB}</span>
          </div>
          <div className="ml-equipe droite">
            <b>{e.clubB}</b>
            {clubB ? <Blason club={clubB} taille={26} /> : <LogoEquipe nom={e.clubB} taille={26} />}
          </div>
          <button className="ml-fermer" onClick={onFermer} title={t('ml.fermerAide')}>✕</button>
        </header>
        <div className="ml-progression" title={titre}>
          <span style={{ width: `${Math.min(100, (e.t / 4800) * 100)}%` }} />
        </div>

        {/* ═══ LA DYNAMIQUE ════════════════════════════════════════════════
            Retour de jeu : « un turnover relance la dynamique de l’équipe ».
            ⚠️ CE N’EST PAS UN DÉCOR : `e.elan` entre dans `probaPlaquage` et
            `probaGrattage`, donc dans le pourcentage écrit sur chaque carte.
            Après un ballon volé, « Plaquer 88 % » devient « Plaquer 94 % » —
            on voit la jauge bouger ET le chiffre avec.
            ⚠️ ELLE PART DU MILIEU, dans les deux sens : un élan est un rapport
            de force, pas une réserve qui se remplit. Une barre qui pousse à
            droite quand c’est nous, à gauche quand c’est eux, se lit sans
            légende. */}
        <div className="ml-elan" title={t(`ml.elan`)} aria-hidden>
          <span
            className="ml-elan-jauge"
            data-pour={elanMoi > 0.02 ? `nous` : elanMoi < -0.02 ? `eux` : undefined}
            style={{
              left: `${50 + Math.min(0, elanMoi) * 50}%`,
              width: `${Math.abs(elanMoi) * 50}%`,
            }}
          />
        </div>

        <div className="ml-corps">
          <div className="ml-colonne">
            {e.fini && stats ? (
              <FeuilleMatch e={e} stats={stats} maNote={maNote} />
            ) : (
              /* ═══ LA SCÈNE — terrain plein cadre, HUD posé dessus ═══════
                 ⚠️ ELLE N'ÉCOUTE PLUS AUCUN GESTE. Elle portait le joystick
                 flottant (`onPointerDown` posait son centre sous le pouce) et
                 bloquait le menu contextuel pour le clic droit du coup de pied.
                 On ne pilote plus : c'est une image, et on regarde. */
              <div className="ml-scene" ref={sceneRef}>
                <svg
                  className="ml-terrain"
                  viewBox={vue?.viewBox ?? `0 0 ${LONGUEUR} ${LARGEUR}`}
                  preserveAspectRatio="xMidYMid slice"
                  aria-label={t('ml.terrain')}
                >
                  <g transform={vue?.transform}>
                    {pelouse}
                    {cibleDefense && (
                      <circle className="ml-cible-plaquage" cx={cibleDefense.pos.x} cy={cibleDefense.pos.y}
                        r={rayon * 2.2} />
                    )}
                    {/* ---------- LES TRENTE PIONS, ET MOI PAR-DESSUS ----------
                        ⚠️ MON PION EST DESSINÉ EN DERNIER, TOUJOURS. Les deux
                        camps se dessinaient l'un après l'autre : celui qui
                        passait en premier finissait SOUS l'autre, et un joueur
                        du camp B disparaissait derrière un adversaire à chaque
                        contact — c'est-à-dire précisément quand il se passe
                        quelque chose pour lui. Mesuré à l'écran, mon numéro 10
                        se retrouvait caché sous le 8 d'en face au moment du
                        ruck. Avec l'étiquette de geste posée sur sa tête, le
                        défaut devenait rédhibitoire : le seul moment où l'on
                        DOIT le voir est aussi le seul où il était masqué. */}
                    {surLeTerrain.filter((p) => p.cote === 'B' && !p.moi).map(pion)}
                    {surLeTerrain.filter((p) => p.cote === 'A' && !p.moi).map(pion)}
                    {monPion && surLeTerrain.includes(monPion) && pion(monPion)}
                    {ballon.h > 0.02 && (
                      <ellipse cx={ballon.x} cy={ballon.y} rx={rayon * 0.8} ry={rayon * 0.5} fill="rgba(0,0,0,.3)" />
                    )}
                    <ellipse
                      className="ml-ballon"
                      cx={ballon.x}
                      cy={ballon.y - ballon.h * 2.2}
                      rx={rayon * 0.95 + ballon.h * 0.35}
                      ry={rayon * 0.66 + ballon.h * 0.25}
                      fill="#f4e3c0" stroke="#3a2410" strokeWidth={rayon * 0.3}
                    />
                    {/* ---------- 💬 CE QU'ILS SE DISENT ----------
                        ⚠️ Demande explicite : « en mode chambrage, petites
                        bulles avec les joueurs qui disent quelque chose ». Le
                        fil raconte le match à la troisième personne ; la bulle
                        se passe À L'ENDROIT où ça se joue. C'est la différence
                        entre lire « le ton monte » et VOIR deux pions se
                        chercher avant que ça parte.
                        ⚠️ Elles sont dessinées EN DERNIER, donc au-dessus des
                        pions, et redressées comme les numéros. */}
                    {e.bulles.map((b, i) => (
                      <g
                        key={`${b.pion.id}-${i}`}
                        className="ml-bulle"
                        transform={`translate(${b.pion.pos.x.toFixed(2)} ${b.pion.pos.y.toFixed(2)})`}
                        opacity={Math.min(1, b.restant * 2.5)}
                      >
                        <g transform={vue?.redresser}>
                          <text
                            y={-rayon * 3.4}
                            textAnchor="middle"
                            fontSize={tailleTexte * 0.92}
                            className="ml-bulle-texte"
                          >
                            {b.texte}
                          </text>
                        </g>
                      </g>
                    ))}
                  </g>
                  {/* La flèche de bord vit hors du groupe pivoté : elle est
                      posée en coordonnées d'écran, comme le HUD. */}
                  {flecheBallon && (
                    <g className="ml-fleche-ballon"
                      transform={`translate(${flecheBallon.bx} ${flecheBallon.by}) rotate(${flecheBallon.angle})`}>
                      <path d="M 0 -1.6 L 3 0 L 0 1.6 Z" />
                    </g>
                  )}
                </svg>

                {/* ---------- LE HUD ---------- */}
                <div className="ml-hud">
                  <div className="ml-hud-haut">
                    <span className="ml-tag" style={{ borderColor: e.possession === 'A' ? couleurA : couleurB }}>
                      🏉 {e.possession === 'A' ? e.clubA : e.clubB} · {possession}%
                    </span>
                    {e.phase !== 'jeuCourant' && (
                      <span className="ml-tag">{CLE_PHASE[e.phase] ? t(CLE_PHASE[e.phase]) : e.phase}</span>
                    )}
                    {!enJeu && <span className="ml-tag">🛡️ {t(CLE_SYSTEME[e.systeme] ?? `ml.systeme.${e.systeme}`)}</span>}
                  </div>

                  {/* ---------- LE SOUFFLE ----------
                      ⚠️ UNE BARRE, PLUS UN POURCENTAGE. L'endurance décide de
                      la fin de match — mais « 🫁 62 % » perdu au milieu de
                      trois autres pastilles ne se lit pas. Une jauge se lit du
                      coin de l'œil, et elle vire au rouge avant qu'on soit à
                      plat.
                      ⚠️ ELLE SERT ENCORE, MÊME SANS MANETTE : c'est elle qui
                      dit POURQUOI « 🏃 Relancer » n'est pas gratuit sur une
                      carte de décision à la 70e minute. */}
                  {monPion && jePeuxJouer && (
                    <div
                      className="ml-souffle"
                      data-bas={monPion.endurance < 30 ? 'oui' : undefined}
                      title={t('ml.enduranceAide')}
                    >
                      <b>🫁</b>
                      <span><span style={{ width: `${Math.max(0, Math.min(100, monPion.endurance))}%` }} /></span>
                    </div>
                  )}

                  {/* La bannière du moment : elle dit POURQUOI ça vient de
                      ralentir. Un ralenti sans explication passe pour une
                      saccade. */}
                  {moment && (
                    <div className="ml-banniere" key={moment.type}>
                      <b>{moment.emoji} {t(moment.cle)}</b>
                    </div>
                  )}

                  {/* ---------- CE QUE TON GESTE A FINI PAR RAPPORTER ------
                      ⚠️ IL VIT AU-DESSUS DE LA BULLE DU VERDICT, PAS DEDANS.
                      La bulle raconte le geste qu’on vient de choisir ; celui-ci
                      raconte un geste d’il y a quarante secondes. Les mêler
                      ferait croire que la passe décisive vient du plaquage
                      qu’on est en train de jouer. */}
                  {echo && (
                    <div className="ml-retombee" role="status">
                      <b>🎁 {echo.texte}</b>
                    </div>
                  )}

                  {/* Le fil réduit à sa dernière ligne : on garde le
                      commentaire sans lui donner un tiers de l'écran. */}
                  {derniere && (
                    <button type="button" className="ml-ticker" onClick={() => setTiroir('fil')}>
                      <span className="ml-minute">{derniere.minute}′</span>
                      <span className="ml-emoji">{EMOJI[derniere.type] ?? '•'}</span>
                      <span className="ml-texte">{derniere.texte}</span>
                    </button>
                  )}

                  {/* ---------- 🪑 QUAND ON NE PEUT PAS JOUER ----------
                      ⚠️ IL Y AVAIT ICI TOUT LE HUD DE PILOTAGE : le joystick
                      flottant, le gros bouton contextuel, les trois secondaires
                      en arc, le bouton 💢 et son tiroir de discipline. Rien de
                      tout ça n'existe plus (« on ne fait que les choix »).
                      Ce qui reste, c'est la seule chose que le joueur DOIT
                      savoir en permanence : s'il est sur le pré ou non — sinon
                      un match sans aucune carte passe pour un match cassé,
                      alors qu'on est simplement remplaçant. */}
                  {enJeu && !jePeuxJouer && (
                    <div className="ml-cluster">
                      <span className="ml-attente">
                        {monPion && monPion.sanction > 0 ? `🟨 ${t('ml.sanctionne')}` : `🪑 ${t('ml.surLeBanc')}`}
                      </span>
                    </div>
                  )}

                  {/* ---------- LA PREMIÈRE FOIS ---------- */}
                  {montrerTuto && (
                    <div className="ml-tuto" onClick={() => setTutoMatchVu(true)}>
                      <div className="ml-tuto-carte">
                        <b>⏸️ {t('ml.tuto.titre')}</b>
                        <p>🏉 {t('ml.tuto.file')}</p>
                        <p>⏱️ {t('ml.tuto.carte')}</p>
                        <p>🎬 {t('ml.tuto.ralenti')}</p>
                        <button type="button" className="btn vert"
                          onClick={(ev) => { ev.stopPropagation(); setTutoMatchVu(true); }}>
                          {t('ml.tuto.compris')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ---------- ÇA A DÉGÉNÉRÉ : L'ORDRE QUE TU DONNES ----------
                      Le moteur reste EN ATTENTE tant qu'aucun ordre n'est
                      donné : chaque bouton dit ce qu'il coûte, parce qu'une
                      sanction qu'on n'a pas vue venir n'apprend rien. */}
                  {e.bagarre && (
                    <div className="ml-bagarre" role="alertdialog" aria-label={t('ml.bagarre.titre')}>
                      <b>💢 {t('ml.bagarre.titre')}</b>
                      <p>{t('ml.bagarre.texte', { nom: e.bagarre.adversaire.nom })}</p>
                      <div className="ml-ordres">
                        {ORDRES.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            className="ml-ordre"
                            onClick={() => { ordonner(e, o.id); setEnPause(false); }}
                          >
                            <b>{o.emoji} {t(o.cle)}</b>
                            <span>{t(o.aide)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ---------- 📣 CE QUE L'ARBITRE VIENT DE SIFFLER ----------
                      ⚠️ ELLE EXISTE PARCE QU'UNE SANCTION INVISIBLE N'EN EST
                      PAS UNE. Retour de jeu : « on peut faire des en-avants
                      sans répercussion ». La mêlée était bien accordée à
                      l'adversaire — c'est mesuré — mais ça passait dans une
                      ligne du fil, réduite à une seule au-dessus du terrain, et
                      défilant à seize fois la vitesse réelle. */}
                  {e.sifflet && !decision && !e.bagarre && (
                    <div className={`ml-sifflet${e.sifflet.maFaute ? ' faute' : ''}`} role="status">
                      <b>{t(e.sifflet.cle)}</b>
                      <span>
                        {t('ml.sifflet.pour', { club: e.sifflet.club })}
                        {e.sifflet.maFaute ? ` · ${t('ml.sifflet.maFaute')}` : ''}
                      </span>
                    </div>
                  )}

                  {/* ---------- 🎬 CE QUE MON CHOIX A DONNÉ, SUR MON JOUEUR ----------
                      ⚠️ DEMANDE EXPLICITE : « fais que ces phrases elles soient
                      au-dessus de soi ». Elles vivaient au milieu de l'écran, à
                      l'endroit où on ne regarde justement pas : on suit son pion.
                      La bulle est posée aux coordonnées écran du pion, en pixels,
                      et bornée au cadre — un joueur plaqué en bord de touche doit
                      pouvoir lire son verdict comme les autres.

                      ⚠️ TROIS LIGNES, ET CHACUNE RÉPOND À UNE QUESTION :
                      1. « mon clic est passé ? »   → ▶️ le geste, dès le clic
                      2. « ça a marché ? »          → ✅/❌ et le % qu'on avait
                      3. « ça a donné quoi ? »      → la phrase du moteur, puis
                                                      ce que ça a mis sur la feuille */}
                  {geste && perso && !e.bagarre && (
                    <div
                      className="ml-perso"
                      role="status"
                      title={t('ml.dec.gains')}
                      data-reussi={verdict ? (verdict.reussi ? 'oui' : 'non') : undefined}
                      data-marque={resultat && resultat.points > 0 ? 'oui' : undefined}
                      ref={mesurerBulle}
                      style={{
                        // La bulle est ancrée par son bas-centre (translate en
                        // CSS) : la marge horizontale vaut donc sa DEMI-largeur,
                        // et la marge haute sa hauteur PLUS le décalage de 18 px.
                        left: `${borner(
                          perso.x,
                          tailleBulle.current.l / 2 + 4,
                          Math.max(tailleBulle.current.l / 2 + 4, boite.current.largeur - tailleBulle.current.l / 2 - 4),
                        )}px`,
                        top: `${borner(
                          perso.y,
                          tailleBulle.current.h + 22,
                          Math.max(tailleBulle.current.h + 22, boite.current.hauteur - 6),
                        )}px`,
                      }}
                    >
                      <b className="ml-perso-geste">
                        {verdict ? (verdict.reussi ? '✅' : '❌') : '▶️'} {geste.emoji} {t(geste.cle)}
                        <em>{Math.round(rejeu.current.chance * 100)} %</em>
                      </b>
                      {/* ⚠️ LA PHRASE DU MOTEUR PASSE DEVANT CELLE DU DUEL : elle
                          raconte la SUITE (l'essai, la pénalité, le ruck), le
                          verdict ne disait que l'issue du contact. Et tant que
                          rien n'est tranché, on n'écrit pas de phrase du tout —
                          « il joue son geste » ne renseigne personne. */}
                      {(resultat || verdict?.texte) && (
                        <span className="ml-perso-phrase">
                          {resultat
                            ? `${EMOJI[resultat.type] ?? '•'} ${resultat.texte}`
                            : verdict?.texte}
                        </span>
                      )}
                      <span className="ml-perso-gains">
                        {resultat && resultat.points > 0 ? `+${resultat.points} · ` : ''}
                        {acquis.length ? acquis.join(' · ') : t('ml.dec.execute')}
                      </span>
                    </div>
                  )}

                  {/* ---------- ⏸️ DIX SECONDES POUR CHOISIR ----------
                      Le match est FIGÉ tant que cette carte est là : le chrono
                      du match ne tourne pas, les pions ne bougent pas. On lit,
                      on choisit, et le moteur joue la suite au ralenti. */}
                  {decision && !e.bagarre && (
                    <div
                      className="ml-decision"
                      role="alertdialog"
                      aria-label={t('ml.dec.titre')}
                      data-enchaine={decision.enchaine ? 'oui' : undefined}
                    >
                      {/* ⚠️ LA BARRE EST ANIMÉE PAR LE CSS, PAS PAR LA BOUCLE.
                          Elle était une largeur reposée à chaque image : dix
                          secondes de rendus React à soixante par seconde,
                          pendant que le jeu est FIGÉ. Le `key` est
                          indispensable — sans lui React réutilise le même nœud
                          d'une carte à l'autre et l'animation ne repart pas. */}
                      <div className="ml-dec-chrono">
                        <span
                          key={noCarte.current}
                          style={{ animationDuration: `${delaiDeCarte(decision)}s` }}
                        />
                      </div>
                      <b className="ml-dec-situation">
                        {/* ⚠️ UN ENCHAÎNEMENT SE DIT, sinon on croit à un bug :
                            deux cartes coup sur coup, sans le repos habituel,
                            ça ressemble à une répétition. */}
                        {decision.enchaine
                          ? `⚡ ${t('ml.dec.enchaine')}`
                          : `${decision.emoji} ${t(decision.cle)}`}
                      </b>
                      <div className="ml-dec-options">
                        {decision.options.map((o, i) => (
                          <button
                            key={o.action}
                            type="button"
                            className="ml-dec-option"
                            data-sur={o.chance >= 0.72 ? 'oui' : undefined}
                            data-pari={o.chance <= 0.42 ? 'oui' : undefined}
                            onClick={() => jouerDecision(o)}
                          >
                            <span className="ml-dec-touche">{i + 1}</span>
                            <b>
                              {o.emoji} {t(o.cle)}
                              {/* ⚠️ LE POURCENTAGE EST CELUI QUI SERA TIRÉ, pas une
                                  estimation d'ambiance : il vient de `enjeuDe`, que
                                  `resoudreChoix` rappelle juste avant de lancer le
                                  dé. Arrondi à l'entier — annoncer « 71,4 % » sur un
                                  coup de dé unique serait une fausse précision. */}
                              <em className="ml-dec-chance">{Math.round(o.chance * 100)} %</em>
                            </b>
                            {/* Les deux faces du pari, une ligne chacune. Un
                                pourcentage seul ne dit pas s'il faut le prendre. */}
                            <span className="ml-dec-gain">✅ {t(o.gain)}</span>
                            <span className="ml-dec-risque">⚠️ {t(o.risque)}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="ml-dec-option laisser"
                          onClick={() => fermerDecision(false)}
                        >
                          <b>⏭️ {t('ml.dec.laisser')}</b>
                          <span className="ml-dec-aide">{t('ml.dec.laisserAide')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {enPause && !decision && !e.bagarre && (
                    <button type="button" className="ml-voile-pause" onClick={() => setEnPause(false)}>
                      <b>▶️ {t('ml.reprendre')}</b>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ═══ LA BARRE DU BAS — mode, tempo, tiroir ═══════════════════ */}
            <div className="ml-barre">
              {monPion && !e.fini && (
                <button
                  type="button"
                  className={`ml-mode${enJeu ? ' actif' : ''}`}
                  title={t('ml.controleAide')}
                  onClick={() => {
                    const suivant = mode === 'jouer' ? 'regarder' : 'jouer';
                    setMode(suivant);
                    setTempo(suivant === 'jouer' ? 'decisions' : 'suivre');
                  }}
                >
                  {enJeu ? `🎮 ${t('ml.mode.jouer')}` : `👁️ ${t('ml.mode.regarder')}`}
                </button>
              )}
              {!e.fini && (
                <div className="ml-tempos">
                  {TEMPOS.filter((v) => v.id !== 'decisions' || !!monPion).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`ml-tempo${tempo === v.id ? ' actif' : ''}`}
                      title={t(v.aide)}
                      aria-label={t(v.cle)}
                      onClick={() => setTempo(v.id)}
                    >
                      <b>{v.emoji}</b><span>{t(v.cle)}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`ml-tempo${enPause ? ' actif' : ''}`}
                    aria-label={enPause ? t('ml.reprendre') : t('ml.pause')}
                    title={enPause ? t('ml.reprendre') : t('ml.pause')}
                    onClick={() => setEnPause((p) => !p)}
                  >
                    <b>{enPause ? '▶️' : '⏸️'}</b><span>{enPause ? t('ml.reprendre') : t('ml.pause')}</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                className="ml-tiroir-bouton"
                aria-label={t('ml.plus')}
                onClick={() => setTiroir((v) => (v ? null : (manager ? 'tactique' : large ? 'commandes' : 'fil')))}
              >
                ⋯
              </button>
              {e.fini && <button className="btn vert" onClick={onFermer}>{t('ml.terminer')}</button>}
            </div>
          </div>

          {/* ═══ LA COLONNE DE DROITE — seulement sur grand écran ═════════ */}
          {large && !e.fini && (
            <aside className="ml-cote">
              <div className="ml-fil" ref={filRef}>
                <Fil lignes={e.commentaires} n={e.commentaires.length} />
              </div>
              {manager && coteManager
                ? <CoachingManager tactique={manager.tactique} onChange={changerTactiqueManager} e={e} cote={coteManager} />
                : monPion && <Coaching {...{ consigneTexte, setConsigneTexte, envoiConsigne, envoyerConsigne, e }} />}
            </aside>
          )}
        </div>

        {/* ═══ LE TIROIR — tout ce qui n'est pas le jeu ════════════════════ */}
        {tiroir && (
          <div className="ml-tiroir" role="dialog" aria-label={t('ml.plus')}>
            <div className="ml-tiroir-onglets">
              {([
                ['fil', '📜', 'ml.onglet.fil'],
                ['consigne', '📣', 'ml.onglet.consigne'],
                ['tactique', '🧠', 'mgr.tactique'],
                ['commandes', '❓', 'ml.commandes.titre'],
              ] as const)
                .filter(([id]) => (id !== 'consigne' || !!monPion)
                  && (id !== 'tactique' || !!manager)
                  && (id !== 'fil' || !large))
                .map(([id, emoji, cleOnglet]) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip-cat${tiroir === id ? ' actif' : ''}`}
                    onClick={() => setTiroir(id)}
                  >
                    {emoji} {t(cleOnglet)}
                  </button>
                ))}
              <button type="button" className="ml-tiroir-fermer" onClick={() => setTiroir(null)}>✕</button>
            </div>

            {tiroir === 'fil' && (
              <div className="ml-fil" ref={large ? undefined : filRef}>
                <Fil lignes={e.commentaires} n={e.commentaires.length} />
              </div>
            )}
            {tiroir === 'consigne' && monPion && (
              <div className="ml-tiroir-corps">
                <p className="ml-tiroir-note">{t('ml.consigneAide')}</p>
                <Coaching {...{ consigneTexte, setConsigneTexte, envoiConsigne, envoyerConsigne, e }} />
              </div>
            )}
            {tiroir === 'tactique' && manager && coteManager && (
              <div className="ml-tiroir-corps">
                <CoachingManager tactique={manager.tactique} onChange={changerTactiqueManager} e={e} cote={coteManager} />
              </div>
            )}
            {tiroir === 'commandes' && (
              <div className="ml-tiroir-corps">
                {/* ⚠️ C'ÉTAIT LA NOTICE DES TOUCHES : quatre directions, sprint,
                    action principale, et la table des gestes assignables lue
                    depuis `liaisonsEffectives`. Il n'y a plus une seule touche à
                    documenter — ce tiroir explique donc la MÉCANIQUE, ce qui
                    est la seule question qui reste : « qu'est-ce que je suis
                    censé faire ? ». */}
                <div className="ml-commandes-liste">
                  <span>🏉 {t('ml.commandes.file')}</span>
                  <span>⏸️ {t('ml.commandes.carte')}</span>
                  <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> : {t('ml.commandes.chiffres')}</span>
                  <span>⏭️ {t('ml.commandes.laisser')}</span>
                  <span>🎬 {t('ml.commandes.ralenti')}</span>
                  <span>📣 {t('ml.commandes.consigne')}</span>
                  <span>💢 {t('ml.commandes.bagarre')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}

const OPTIONS_TACTIQUES = {
  attaque: [
    ['equilibre', '⚖️ Équilibré'], ['avants', '🧱 Jeu d’avants'],
    ['large', '↔️ Jouer au large'], ['occupation', '🦶 Occupation'],
  ],
  defense: [
    ['blitz', '⚡ Blitz'], ['glissee', '↔️ Glissée'], ['repli', '🛡️ Repli'],
  ],
  rythme: [
    ['gestion', '🧊 Gérer'], ['normal', '▶️ Normal'], ['intense', '🔥 Intense'],
  ],
  penalites: [
    ['mixte', '🧠 Selon le terrain'], ['points', '🎯 Prendre les points'], ['touche', '🚩 Chercher la touche'],
  ],
  remplacements: [
    ['precoces', '⏱️ Précoces'], ['standard', '🔄 Standards'], ['tardifs', '⌛ Tardifs'],
  ],
} as const;

function CoachingManager({
  tactique, onChange, e, cote,
}: {
  tactique: TactiqueManager;
  onChange: (partiel: Partial<TactiqueManager>) => void;
  e: EtatMatch;
  cote: 'A' | 'B';
}) {
  const terrain = e.pions.filter((p) => p.cote === cote && p.surLeTerrain && p.numero <= 15);
  const banc = e.pions.filter((p) => p.cote === cote && !p.surLeTerrain && p.minutes === 0);
  const [sortant, setSortant] = useState('');
  const [entrant, setEntrant] = useState('');
  const sortantActif = terrain.some((p) => p.sourceId === sortant) ? sortant : terrain[0]?.sourceId ?? '';
  const entrantActif = banc.some((p) => p.sourceId === entrant) ? entrant : banc[0]?.sourceId ?? '';
  const demande = e.remplacementsDemandes[cote];
  return (
    <div className="ml-coaching-manager">
      <div className="ml-coaching-manager-tete">
        <b>🧠 Banc tactique</b>
        <span>Les changements s’appliquent à la prochaine action.</span>
      </div>
      {(Object.keys(OPTIONS_TACTIQUES) as (keyof typeof OPTIONS_TACTIQUES)[]).map((cle) => (
        <fieldset key={cle}>
          <legend>{cle === 'attaque' ? 'Avec le ballon' : cle === 'defense' ? 'Sans le ballon'
            : cle === 'rythme' ? 'Rythme' : cle === 'penalites' ? 'Pénalités' : 'Banc'}</legend>
          <div>
            {OPTIONS_TACTIQUES[cle].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tactique[cle] === id ? 'actif' : ''}
                aria-pressed={tactique[cle] === id}
                onClick={() => onChange({ [cle]: id } as Partial<TactiqueManager>)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset className="ml-changement-manuel">
        <legend>Changement manuel</legend>
        {banc.length ? (
          <div>
            <label><span>Sortir</span><select value={sortantActif} onChange={(ev) => setSortant(ev.target.value)}>{terrain.map((p) => <option key={p.sourceId} value={p.sourceId}>n° {p.numero} · {p.nom} · {Math.round(p.endurance)} %</option>)}</select></label>
            <label><span>Faire entrer</span><select value={entrantActif} onChange={(ev) => setEntrant(ev.target.value)}>{banc.map((p) => <option key={p.sourceId} value={p.sourceId}>n° {p.numero} · {p.nom}</option>)}</select></label>
            <button type="button" disabled={!sortantActif || !entrantActif || !!demande} onClick={() => demanderRemplacement(e, cote, entrantActif, sortantActif)}>{demande ? '⏳ Prévu au prochain arrêt' : '🔄 Programmer le changement'}</button>
          </div>
        ) : <span className="ml-banc-vide">Les huit remplaçants sont entrés.</span>}
      </fieldset>
    </div>
  );
}

/** Le champ de consigne au coach, partagé par la colonne et le tiroir. */
function Coaching({
  consigneTexte, setConsigneTexte, envoiConsigne, envoyerConsigne, e,
}: {
  consigneTexte: string;
  setConsigneTexte: (v: string) => void;
  envoiConsigne: boolean;
  envoyerConsigne: () => Promise<void>;
  e: EtatMatch;
}) {
  return (
    <div className="ml-coaching">
      <input
        value={consigneTexte}
        placeholder={t('ml.consigne')}
        onChange={(ev) => setConsigneTexte(ev.target.value)}
        onKeyDown={(ev) => { if (ev.key === 'Enter') void envoyerConsigne(); }}
        maxLength={120}
      />
      <button className="x-poster" disabled={!consigneTexte.trim() || envoiConsigne}
        onClick={() => void envoyerConsigne()}>
        {envoiConsigne ? '…' : `📣 ${t('ml.transmettre')}`}
      </button>
      {e.consigne && e.consigne !== CONSIGNE_NEUTRE && (
        <span className="ml-consigne">{e.consigne.libelle}</span>
      )}
    </div>
  );
}

/**
 * Ce que le geste a ajouté à la feuille du joueur, en libellés courts.
 *
 * ⚠️ ON NE LISTE QUE CE QUI A BOUGÉ, et on s'arrête à trois : le bandeau doit
 * se lire d'un coup d'œil pendant que le jeu tourne au ralenti, pas se
 * dépouiller. L'ordre est celui du RÉCIT — ce qui vient d'arriver de plus
 * marquant d'abord (essai, franchissement), les mètres en dernier.
 *
 * ⚠️ ET LES MÈTRES SONT ARRONDIS À L'ENTIER : « +3,7 m » donne l'impression
 * d'une mesure de laboratoire, « +4 m » d'une action de rugby.
 */
/**
 * ⚠️ « PLAQUAGE ×2 », PAS « 2 PLAQUAGES », et ce n'est pas de la coquetterie :
 * la seconde forme demande un singulier ET un pluriel dans les sept langues —
 * le français accorde, l'allemand décline, le japonais ignore le pluriel. Le
 * nom au singulier suivi du compte traverse tout, et se lit mieux sur un
 * bandeau de trois secondes : le nom saute aux yeux, le chiffre suit.
 *
 * ⚠️ ET L'EMOJI SEUL NE SUFFISAIT PAS. Première version : « ➡️ · 🏃 ». Mesuré
 * à l'écran, et illisible — personne ne devine « une passe et un ballon
 * porté ». Un HUD peut être compact, il ne peut pas être un rébus.
 */
const GAINS: [keyof StatsMatch, string, string][] = [
  ['essais', '\u{1F3C9}', 'ml.gain.essai'],
  ['grattages', '\u{1FA9D}', 'ml.gain.grattage'],
  ['franchissements', '⚡', 'ml.gain.franchissement'],
  ['plaquages', '\u{1F4A5}', 'ml.gain.plaquage'],
  ['offloads', '\u{1F91D}', 'ml.gain.offload'],
  ['passes', '➡️', 'ml.gain.passe'],
  ['courses', '\u{1F3C3}', 'ml.gain.course'],
  ['coupsDePied', '\u{1F9B6}', 'ml.gain.pied'],
  ['rucksNettoyes', '\u{1F512}', 'ml.gain.ruck'],
  ['plaquagesManques', '\u{1F573}️', 'ml.gain.plaquageManque'],
  ['passesRatees', '❌', 'ml.gain.enAvant'],
];

function ecartsDeFeuille(avant: StatsMatch | null, apres: StatsMatch): string[] {
  if (!avant) return [];
  const sortie: string[] = [];
  for (const [cle, emoji, cle2] of GAINS) {
    const d = (apres[cle] as number) - (avant[cle] as number);
    if (d > 0 && sortie.length < 3) {
      const nom = `${emoji} ${t(cle2)}`;
      sortie.push(d > 1 ? `${nom} ×${d}` : nom);
    }
  }
  const m = Math.round(apres.metres - avant.metres);
  if (m > 0 && sortie.length < 3) sortie.push(`📏 +${m} m`);
  return sortie;
}

/** Position brute du ballon (sans interpolation) : ce que vise la caméra. */
function positionBallon(e: EtatMatch): Vec {
  if (e.porteur) return e.porteur.pos;
  if (e.vol) {
    const k = Math.min(1, e.vol.ecoule / e.vol.duree);
    return {
      x: e.vol.de.x + (e.vol.vers.x - e.vol.de.x) * k,
      y: e.vol.de.y + (e.vol.vers.y - e.vol.de.y) * k,
    };
  }
  return e.ballon;
}

/** Position affichée du ballon, interpolée entre deux pas de simulation. */
function positionBallonInterpolee(e: EtatMatch, r: number): { x: number; y: number; h: number } {
  if (e.porteur) {
    return { x: e.porteur.pos.x + e.porteur.vitesse.x * r, y: e.porteur.pos.y + e.porteur.vitesse.y * r, h: 0 };
  }
  if (e.vol) {
    const k = Math.min(1, (e.vol.ecoule + r) / e.vol.duree);
    return {
      x: e.vol.de.x + (e.vol.vers.x - e.vol.de.x) * k,
      y: e.vol.de.y + (e.vol.vers.y - e.vol.de.y) * k,
      h: e.vol.hauteur * Math.sin(Math.PI * k),
    };
  }
  return { x: e.ballon.x, y: e.ballon.y, h: 0 };
}
