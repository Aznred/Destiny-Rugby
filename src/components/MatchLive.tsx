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
//    qui DÉFILAIT HORIZONTALEMENT, deux cents pixels sous l'action : il fallait
//    quitter le jeu des yeux, chercher le bon bouton, et le faire défiler.
//    → Le HUD est POSÉ SUR LE TERRAIN : joystick flottant sous le pouce gauche,
//      un gros bouton d'action contextuel sous le pouce droit, trois boutons
//      secondaires en arc. Rien à chercher, rien à faire défiler.
//
// 4. **LE RESTE MANGEAIT L'ÉCRAN.** Notice des commandes, champ de consigne,
//    fil de commentaire, six boutons de vitesse : sur 375 px, le terrain finissait
//    en bandeau de 200 px sous une pile de panneaux.
//    → Tout ce qui n'est pas le jeu part dans un tiroir (📜 fil, 📣 consigne,
//      🕹️ commandes). Sur grand écran, le fil revient en colonne de droite.
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
  activerControle, appliquerConsigne, avancer, bilan, creerMatch, DT, ordonner,
  type EtatMatch,
} from '../lib/moteur/moteur';
import {
  ACTION_PAR_ID, actionPrincipale, actionsDisponibles, demanderAction, piloterDirection,
  receveurPour, type DefinitionAction,
} from '../lib/moteur/controle';
import {
  BOUTON_PAR_ACTION, COMMANDES_REGLABLES, LecteurEntrees, libelleDeCode,
  liaisonsEffectives,
} from '../lib/moteur/manette';
import { ORDRES } from '../lib/moteur/bagarre';
import { ajouterCommentaire, type ActionJoueur, type Commentaire, type NiveauMatch, type TypeCommentaire } from '../lib/moteur/etat';
import { competitionEffective } from '../lib/divisions';
import { LARGEUR, LONGUEUR, borner, type Vec } from '../lib/moteur/terrain';
import { Camera, COUVERTURE, angleDeVue, type Cadrage, type Vue } from '../lib/moteur/camera';
import {
  facteurTempo, momentDuJoueur, TEMPOS, TENUE, type Moment, type Tempo,
} from '../lib/moteur/moments';
import {
  DELAI_DECISION, REJEU, decisionPour, type Decision,
} from '../lib/moteur/decisions';
import { estTitulaire } from '../lib/moteur/saison';
import { CONSIGNE_NEUTRE, lireConsigneIA, lireConsigneLocale } from '../lib/moteur/consignes';
import { iaDisponible } from '../lib/groq';
import type { Pion } from '../lib/moteur/entites';
import { detailNote, noterMatch, statsPourLaNote } from '../lib/moteur/apresMatch';
import { graine, type MatchChampionnat } from '../lib/championnat';
import { effectifDuClub } from '../lib/effectif';
import { effectifNational } from '../lib/international';
import { nomNation } from '../lib/nations';
import { clubParNom } from '../data/clubs';
import { useGame } from '../store/useGame';
import { Blason, LogoEquipe } from './Blason';
import { PelouseMemo } from './match/Pelouse';
import { FeuilleMatch } from './match/FeuilleMatch';
import type { Joueur } from '../types';
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

/** Déflexion maximale du joystick, en PIXELS d'écran. */
const RAYON_STICK = 46;
/** Au-delà de cette fraction de déflexion, on sprinte. */
const SEUIL_SPRINT = 0.86;

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
  match, saison, cle, titre, onFermer, onTermine, joueur, selection,
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
  onTermine?: () => void;
  joueur?: Joueur | null;
}) {
  const iaActivee = useGame((s) => s.iaActivee);
  const tutoMatchVu = useGame((s) => s.tutoMatchVu);
  const touchesMatch = useGame((s) => s.touchesMatch);
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
    moteur.current = creerMatch(
      match.domicile, match.exterieur,
      effectif(match.domicile), effectif(match.exterieur),
      match.scoreD, match.scoreE, cle,
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
      { niveau: niveauDuMatch(joueur, selection), controle: true },
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
  // ⚠️ ON DÉMARRE EN « DÉCISIONS » DÈS QU'ON PILOTE, et c'est la demande :
  // « plus en mode on a un moment, 10 secondes pour choisir une action ». Le
  // mode manette (« Moments ») reste à un bouton d'ici, pour qui le préfère.
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
  const [tiroir, setTiroir] = useState<null | 'fil' | 'consigne' | 'commandes'>(null);
  const [disciplineOuverte, setDisciplineOuverte] = useState(false);
  const [consigneTexte, setConsigneTexte] = useState('');
  const [envoiConsigne, setEnvoiConsigne] = useState(false);

  const filRef = useRef<HTMLDivElement>(null);
  const dernierTemps = useRef<number>(0);
  // Les commandes vivent dans une ref : elles sont lues soixante fois par
  // seconde et ne doivent JAMAIS provoquer de rendu par elles-mêmes.
  const lecteur = useRef(new LecteurEntrees(touchesMatch));
  // La table des touches en vigueur, pour l'affichage des raccourcis.
  const liaisons = useMemo(() => liaisonsEffectives(touchesMatch), [touchesMatch]);
  const manetteVue = useRef(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  /** Les dimensions du terrain à l'écran, tenues par un ResizeObserver. */
  const boite = useRef({ largeur: 1, hauteur: 1 });
  const camera = useRef(new Camera());
  const vueRef = useRef<Vue | null>(null);
  /** Le joystick : origine et déflexion courante, en PIXELS d'écran. */
  const pouce = useRef<{ id: number; ox: number; oy: number; dx: number; dy: number } | null>(null);
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

  const jouerDecision = useCallback((action: ActionJoueur) => {
    demanderAction(e, action);
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

      // ── 🎮 LES COMMANDES SONT LUES À CHAQUE IMAGE ─────────────────────────
      // ⚠️ AVANT le test de pause, et c'est voulu : la manette doit pouvoir
      // répondre au panneau de bagarre, qui s'affiche justement en pause.
      const entrees = lecteur.current.lire();
      if (entrees.manette && !manetteVue.current) {
        manetteVue.current = true;
        redessiner((n) => n + 1);
      }
      if (e.bagarre) {
        // Losange de la manette : A/✕, B/○, X/□, Y/△ = les quatre ordres.
        if (entrees.ordre !== null && !e.bagarre.ordre) {
          ordonner(e, ORDRES[entrees.ordre].id);
          setEnPause(false);
        }
      } else if (e.controle && !enPause && !decisionRef.current) {
        // ⚠️ LA DIRECTION EST LUE EN REPÈRE D'ÉCRAN, PUIS TRADUITE EN REPÈRE DE
        // TERRAIN. Sans ça, « pousse vers le haut » enverrait le pion vers la
        // touche gauche dès que la caméra pivote en portrait, ou vers son
        // propre en-but quand on joue pour le camp B. C'est la même matrice
        // que celle qui dessine : l'image et la commande ne peuvent pas se
        // désaccorder.
        const v = vueRef.current;
        const d = v ? v.directionMonde(entrees.dx, entrees.dy) : { dx: entrees.dx, dy: entrees.dy };
        piloterDirection(e, d.dx, d.dy, entrees.sprint);
        for (const action of entrees.appuis) demanderAction(e, action);
        // ⚠️ LA SOURIS NE FAIT JAMAIS RIEN DU TOUT. Clic gauche plaque et clic
        // droit tape ; mais on ne plaque pas quand on porte le ballon, et un
        // clic sans effet passe pour un bug. Si le geste assigné n'est pas
        // jouable à cet instant, on joue l'action contextuelle à la place —
        // celle que la barre d'espace aurait jouée.
        for (const action of entrees.souris) {
          if (demanderAction(e, action)) continue;
          const repli = actionPrincipale(e);
          if (repli) demanderAction(e, repli);
        }
        if (entrees.principale) {
          const choisie = actionPrincipale(e);
          if (choisie) demanderAction(e, choisie);
        }
      }

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
        // Entre le ballon et son joueur, plus près de soi quand c'est à soi de
        // jouer : on doit voir ce qu'on fait, et voir venir ce qui arrive.
        const poids = enMoment ? 0.5 : 0.38;
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
        piloterDirection(e, 0, 0, false);
        chrono.current -= dtReel;
        if (chrono.current <= 0) {
          // ⚠️ NE PAS CHOISIR EST UN CHOIX, et il se dit. Le moteur reprend son
          // rugby automatique, comme pour les vingt-neuf autres : ce n'est pas
          // une punition, c'est ce qui arrive quand on reste spectateur.
          if (moi) ajouterCommentaire(e, 'jeu', moi.cote, t('ml.dec.hesite', { nom: moi.nom }), 0, true);
          fermerDecision(false);
        }
        redessiner((n) => n + 1);
        return;
      }
      if (tempo === 'decisions' && enJeu && !enPause) {
        const carte = decisionPour(e, moi, e.sim - derniereDecision.current);
        if (carte) {
          derniereDecision.current = e.sim;
          chrono.current = DELAI_DECISION;
          decisionRef.current = carte;
          setDecision(carte);
          redessiner((n) => n + 1);
          return;
        }
      }

      // ⚠️ ON LÂCHE LE PION EN PAUSE. Sans ça, la dernière direction reste
      // posée : on met la pause, on va lire le fil, et le joueur repart en
      // courant vers la touche dès la reprise sans qu'on ait rien touché.
      if (enPause) { piloterDirection(e, 0, 0, false); redessiner((n) => n + 1); return; }

      avancer(e, dtReel * facteurTempo(tempo, enMoment));
      redessiner((n) => n + 1);
    };
    brut = requestAnimationFrame(image);
    return () => { actif = false; cancelAnimationFrame(brut); };
  }, [enPause, tempo, enJeu, e, fermerDecision]);

  // ⚠️ LES CHIFFRES CHOISISSENT SUR LA CARTE, et rien d'autre. Pendant qu'elle
  // est ouverte la manette est coupée (voir la boucle) : sans ce raccourci, il
  // n'y aurait plus que la souris, et une carte à dix secondes se joue au
  // clavier. On lit `ev.code` et pas `ev.key` : en AZERTY la rangée des chiffres
  // rend « & é " ' ( » sans Maj.
  useEffect(() => {
    if (!decision) return;
    const auClavier = (ev: KeyboardEvent) => {
      const n = Number((/^Digit([1-9])$/.exec(ev.code) ?? [])[1]);
      const choix = decision.options[n - 1];
      if (!choix) return;
      ev.preventDefault();
      jouerDecision(choix.action);
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [decision, jouerDecision]);

  // Le mode commande le contrôle du moteur : une seule vérité, pas deux.
  useEffect(() => { activerControle(e, mode === 'jouer'); }, [mode, e]);

  // ⚠️ UNE TOUCHE RÉASSIGNÉE PREND EFFET IMMÉDIATEMENT, même match ouvert : le
  // lecteur relit la table et oublie ce qui était enfoncé. Sans cet oubli, une
  // direction restée en mémoire sur l'ANCIENNE touche ferait courir le pion
  // tout seul vers la touche, sans plus aucun moyen de l'arrêter.
  useEffect(() => { lecteur.current.definirLiaisons(touchesMatch); }, [touchesMatch]);

  useEffect(() => {
    filRef.current?.scrollTo({ top: filRef.current.scrollHeight });
  }, [e.commentaires.length]);

  useEffect(() => {
    const lu = lecteur.current;
    const clavier = (ev: KeyboardEvent) => {
      const saisie = (ev.target as HTMLElement)?.tagName === 'INPUT';
      if (ev.key === 'Escape') { onFermer(); return; }
      if (saisie) return;
      // ⚠️ LA BARRE D'ESPACE NE MET PLUS EN PAUSE : ELLE JOUE. C'est la touche
      // d'action de tous les jeux de sport, et la laisser sur la pause serait
      // le plus sûr moyen de faire une passe en croyant s'arrêter.
      if (lu.auClavier(ev)) {
        ev.preventDefault();
        redessiner((n) => n + 1);
        return;
      }
      // Les chiffres 1-9 doublent la barre d'actions affichée. ⚠️ Lus sur
      // `ev.code` (`Digit1`) : en AZERTY la rangée des chiffres rend « & é " »
      // sans Maj.
      if (ev.code.startsWith('Digit')) {
        const rang = Number(ev.code.slice(5)) - 1;
        const action = actionsDisponibles(e)[rang];
        if (action) {
          ev.preventDefault();
          demanderAction(e, action.id);
          redessiner((n) => n + 1);
        }
      }
    };
    const relacher = (ev: KeyboardEvent) => lu.relacher(ev);
    // ⚠️ On oublie TOUT quand la fenêtre perd le focus : une touche enfoncée
    // au moment où l'on change d'onglet ne reçoit jamais son `keyup`, et le
    // joueur retrouve un pion qui court tout seul vers la touche.
    const perdreFocus = () => lu.toutRelacher();
    window.addEventListener('keydown', clavier);
    window.addEventListener('keyup', relacher);
    window.addEventListener('blur', perdreFocus);
    return () => {
      window.removeEventListener('keydown', clavier);
      window.removeEventListener('keyup', relacher);
      window.removeEventListener('blur', perdreFocus);
      lu.toutRelacher();
    };
  }, [onFermer, e]);

  // ⚠️ UNE BAGARRE MET LA PAUSE, ET C'EST INDISPENSABLE. Le moteur attend un
  // ordre pour la résoudre : laisser le match défiler pendant qu'on lit quatre
  // boutons reviendrait à choisir au hasard. La reprise est faite par le bouton
  // d'ordre lui-même — sinon le jeu resterait figé sur une phase que seul un
  // tick peut refermer.
  const bagarre = e.bagarre;
  useEffect(() => {
    if (bagarre) setEnPause(true);
  }, [bagarre]);

  // --- LE JOYSTICK TACTILE --------------------------------------------------
  // ⚠️ IL FLOTTE SOUS LE POUCE, dans la moitié gauche du terrain. Le premier
  // contact devient le centre, la direction est le vecteur jusqu'au doigt.
  // C'est le schéma de tous les jeux d'action sur téléphone, et il ne coûte pas
  // un pixel d'interface — alors qu'une croix directionnelle fixe mangerait le
  // terrain, qui fait déjà toute la largeur.
  //
  // ⚠️ LA MOITIÉ DROITE EST RÉSERVÉE AUX BOUTONS. Laisser le joystick partir de
  // n'importe où mettait les deux pouces en concurrence : on visait le gros
  // bouton d'action, on ratait de dix pixels, et le pion partait en courant.
  //
  // ⚠️ LE SPRINT EST DANS LE STICK, pas sur un bouton : pousser à fond (86 % de
  // la déflexion) sprinte. Un bouton de sprint de plus, c'est un troisième
  // doigt qu'on n'a pas.
  //
  // ⚠️ `touch-action: none` sur la scène (App.css) est indispensable : sans lui,
  // glisser le doigt fait défiler la page et le joystick ne reçoit qu'un seul
  // événement.
  const enPixels = (ev: React.PointerEvent): { x: number; y: number } | null => {
    const r = sceneRef.current?.getBoundingClientRect();
    if (!r || !r.width) return null;
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  const poserPouce = (ev: React.PointerEvent) => {
    if (!e.controle || e.fini || e.bagarre || !jePeuxJouer) return;
    // ⚠️ UN BOUTON DE SOURIS ASSIGNÉ JOUE SA COMMANDE ET NE POSE PAS LE
    // JOYSTICK. Sans ce partage, un clic droit pour taper au pied démarrait
    // aussi une course : le pion partait dans la direction du curseur pendant
    // que le ballon s'envolait. Le doigt (`pointerType` tactile) garde le
    // joystick, la souris garde ses boutons.
    if (ev.pointerType === 'mouse') {
      if (lecteur.current.aLaSouris(ev.button)) {
        ev.preventDefault();
        redessiner((n) => n + 1);
        return;
      }
      // Un bouton non assigné ne pilote pas non plus : on ne court pas à la
      // souris, on court au clavier.
      if (ev.button !== 0) return;
    }
    const p = enPixels(ev);
    if (!p) return;
    if (p.x > boite.current.largeur * 0.55) return; // la droite, c'est les boutons
    sceneRef.current?.setPointerCapture(ev.pointerId);
    pouce.current = { id: ev.pointerId, ox: p.x, oy: p.y, dx: 0, dy: 0 };
    lecteur.current.tactile = { dx: 0, dy: 0, sprint: false };
    if (!tutoMatchVu) setTutoMatchVu(true);
  };
  const bougerPouce = (ev: React.PointerEvent) => {
    const j = pouce.current;
    if (!j || j.id !== ev.pointerId) return;
    const p = enPixels(ev);
    if (!p) return;
    j.dx = p.x - j.ox;
    j.dy = p.y - j.oy;
    const norme = Math.hypot(j.dx, j.dy);
    const ratio = Math.min(1, norme / RAYON_STICK);
    lecteur.current.tactile = norme < 1
      ? { dx: 0, dy: 0, sprint: false }
      : { dx: (j.dx / norme) * ratio, dy: (j.dy / norme) * ratio, sprint: ratio > SEUIL_SPRINT };
  };
  const leverPouce = (ev: React.PointerEvent) => {
    if (pouce.current && pouce.current.id !== ev.pointerId) return;
    pouce.current = null;
    lecteur.current.tactile = null;
  };

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

  const jouerAction = (id: DefinitionAction['id']) => {
    demanderAction(e, id);
    vibrer(12);
    if (!tutoMatchVu) setTutoMatchVu(true);
    redessiner((n) => n + 1);
  };

  const [couleurA] = couleursDe(e.clubA);
  const [couleurB] = couleursDe(e.clubB);
  const clubA = clubParNom(e.clubA);
  const clubB = clubParNom(e.clubB);

  // --- CE QUI EST JOUABLE MAINTENANT ---------------------------------------
  // ⚠️ ON NE MONTRE PAS TREIZE BOUTONS. Un gros bouton contextuel (« ce qu'il
  // faut faire »), trois secondaires pour qui veut choisir, et la discipline
  // derrière son propre bouton — parce qu'un « frapper » touché par erreur à la
  // place d'un « passer », c'est une saison de suspension.
  const actions = enJeu && jePeuxJouer && !e.fini ? actionsDisponibles(e) : [];
  const idPrincipale = actions.length ? actionPrincipale(e) : null;
  const defPrincipale = idPrincipale ? ACTION_PAR_ID.get(idPrincipale) : undefined;
  const secondaires = actions
    .filter((a) => a.id !== idPrincipale && a.famille !== 'discipline')
    .slice(0, 3);
  const disciplinaires = actions.filter((a) => a.famille === 'discipline');
  // À qui part la passe : on l'écrit sur le bouton ET on le montre sur le
  // terrain. Une passe dont on ne sait pas où elle va n'est pas une décision.
  const receveur = idPrincipale === 'passe' && monPion ? receveurPour(e, monPion) : undefined;
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
    onTermine?.();
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

        <div className="ml-corps">
          <div className="ml-colonne">
            {e.fini && stats ? (
              <FeuilleMatch e={e} stats={stats} maNote={maNote} />
            ) : (
              /* ═══ LA SCÈNE — terrain plein cadre, HUD posé dessus ═══════ */
              <div
                className="ml-scene"
                ref={sceneRef}
                onPointerDown={poserPouce}
                onPointerMove={bougerPouce}
                onPointerUp={leverPouce}
                onPointerCancel={leverPouce}
                /* Sans ça, le clic droit assigné au coup de pied ouvrirait le
                   menu du navigateur par-dessus le match. */
                onContextMenu={(ev) => ev.preventDefault()}
              >
                <svg
                  className="ml-terrain"
                  viewBox={vue?.viewBox ?? `0 0 ${LONGUEUR} ${LARGEUR}`}
                  preserveAspectRatio="xMidYMid slice"
                  aria-label={t('ml.terrain')}
                >
                  <g transform={vue?.transform}>
                    {pelouse}
                    {/* La cible de la passe : un cercle qui dit « c'est lui ». */}
                    {receveur && (
                      <g className="ml-cible-passe">
                        <line x1={monPion!.pos.x} y1={monPion!.pos.y} x2={receveur.pos.x} y2={receveur.pos.y} />
                        <circle cx={receveur.pos.x} cy={receveur.pos.y} r={rayon * 2} />
                      </g>
                    )}
                    {cibleDefense && (
                      <circle className="ml-cible-plaquage" cx={cibleDefense.pos.x} cy={cibleDefense.pos.y}
                        r={rayon * 2.2} />
                    )}
                    {surLeTerrain.filter((p) => p.cote === 'B').map(pion)}
                    {surLeTerrain.filter((p) => p.cote === 'A').map(pion)}
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
                      ⚠️ UNE BARRE, PLUS UN POURCENTAGE. Le sprint se paie en
                      endurance (`piloterMonJoueur`) et c'est la ressource qui
                      décide de la fin de match — mais « 🫁 62 % » perdu au
                      milieu de trois autres pastilles ne se lit pas en pleine
                      course. Une jauge se lit du coin de l'œil, et elle vire au
                      rouge avant qu'on soit à plat. */}
                  {monPion && jePeuxJouer && (
                    <div
                      className="ml-souffle"
                      data-sprint={e.sprint ? 'oui' : undefined}
                      data-bas={monPion.endurance < 30 ? 'oui' : undefined}
                      title={t('ml.enduranceAide')}
                    >
                      <b>🫁</b>
                      <span><span style={{ width: `${Math.max(0, Math.min(100, monPion.endurance))}%` }} /></span>
                      {e.sprint && <em>{t('ml.sprintEnCours')}</em>}
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

                  {/* Le fil réduit à sa dernière ligne : on garde le
                      commentaire sans lui donner un tiers de l'écran. */}
                  {derniere && (
                    <button type="button" className="ml-ticker" onClick={() => setTiroir('fil')}>
                      <span className="ml-minute">{derniere.minute}′</span>
                      <span className="ml-emoji">{EMOJI[derniere.type] ?? '•'}</span>
                      <span className="ml-texte">{derniere.texte}</span>
                    </button>
                  )}

                  {/* ---------- LE JOYSTICK ---------- */}
                  {enJeu && jePeuxJouer && (
                    <div
                      className={`ml-stick${pouce.current ? ' actif' : ''}`}
                      style={pouce.current
                        ? { left: pouce.current.ox, top: pouce.current.oy }
                        : undefined}
                    >
                      <span className="ml-stick-base" />
                      <span
                        className="ml-stick-tete"
                        style={pouce.current ? teteStick(pouce.current) : undefined}
                      />
                    </div>
                  )}

                  {/* ---------- LES ACTIONS ---------- */}
                  {enJeu && (
                    <div className="ml-cluster">
                      {!jePeuxJouer && (
                        <span className="ml-attente">
                          {monPion && monPion.sanction > 0 ? `🟨 ${t('ml.sanctionne')}` : `🪑 ${t('ml.surLeBanc')}`}
                        </span>
                      )}
                      {jePeuxJouer && (
                        <>
                          {disciplineOuverte && disciplinaires.length > 0 && (
                            <div className="ml-discipline">
                              {disciplinaires.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  className="ml-act fam-discipline"
                                  title={t(a.aide)}
                                  onPointerDown={(ev) => { ev.stopPropagation(); jouerAction(a.id); }}
                                >
                                  <b>{a.emoji}</b><span>{t(a.cle)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="ml-secondaires">
                            {secondaires.map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                className={`ml-act fam-${a.famille}${e.intention?.type === a.id ? ' actif' : ''}`}
                                title={t(a.aide)}
                                onPointerDown={(ev) => { ev.stopPropagation(); jouerAction(a.id); }}
                              >
                                <b>{a.emoji}</b>
                                <span>{t(a.cle)}</span>
                                <i>{liaisons[a.id]?.libelle}</i>
                              </button>
                            ))}
                          </div>
                          <div className="ml-principal-rangee">
                            {disciplinaires.length > 0 && (
                              <button
                                type="button"
                                className={`ml-chauffe${disciplineOuverte ? ' actif' : ''}`}
                                title={t('ml.discipline.aide')}
                                aria-label={t('ml.discipline.titre')}
                                onPointerDown={(ev) => { ev.stopPropagation(); setDisciplineOuverte((v) => !v); }}
                              >
                                💢
                                <span className="ml-tension" title={t('ml.tensionAide')}>
                                  <span style={{ width: `${Math.round(e.tension)}%` }} />
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="ml-principal"
                              disabled={!defPrincipale}
                              title={defPrincipale ? t(defPrincipale.aide) : undefined}
                              onPointerDown={(ev) => {
                                ev.stopPropagation();
                                if (idPrincipale) jouerAction(idPrincipale);
                              }}
                            >
                              {defPrincipale ? (
                                <>
                                  <b>{defPrincipale.emoji}</b>
                                  <span>
                                    {t(defPrincipale.cle)}
                                    {receveur && <em> #{receveur.numero}</em>}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <b>⏳</b>
                                  <span>{Object.keys(e.recharges).length ? t('ml.recharge') : t('ml.actionsAttente')}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ---------- LA PREMIÈRE FOIS ---------- */}
                  {montrerTuto && (
                    <div className="ml-tuto" onPointerDown={() => setTutoMatchVu(true)}>
                      <div className="ml-tuto-carte">
                        <b>🎮 {t('ml.tuto.titre')}</b>
                        <p>👈 {t('ml.tuto.stick')}</p>
                        <p>👉 {t('ml.tuto.bouton')}</p>
                        <p>🎯 {t('ml.tuto.moments')}</p>
                        <button type="button" className="btn vert"
                          onPointerDown={(ev) => { ev.stopPropagation(); setTutoMatchVu(true); }}>
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
                            onPointerDown={(ev) => { ev.stopPropagation(); ordonner(e, o.id); setEnPause(false); }}
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

                  {/* ---------- ⏸️ DIX SECONDES POUR CHOISIR ----------
                      Le match est FIGÉ tant que cette carte est là : le chrono
                      du match ne tourne pas, les pions ne bougent pas. On lit,
                      on choisit, et le moteur joue la suite au ralenti. */}
                  {decision && !e.bagarre && (
                    <div className="ml-decision" role="alertdialog" aria-label={t('ml.dec.titre')}>
                      <div className="ml-dec-chrono">
                        <span style={{ width: `${Math.max(0, chrono.current / DELAI_DECISION) * 100}%` }} />
                      </div>
                      <b className="ml-dec-situation">{decision.emoji} {t(decision.cle)}</b>
                      <div className="ml-dec-options">
                        {decision.options.map((o, i) => (
                          <button
                            key={o.action}
                            type="button"
                            className="ml-dec-option"
                            onPointerDown={(ev) => { ev.stopPropagation(); jouerDecision(o.action); }}
                          >
                            <span className="ml-dec-touche">{i + 1}</span>
                            <b>{o.emoji} {t(o.cle)}</b>
                            <span className="ml-dec-aide">{t(o.aide)}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="ml-dec-option laisser"
                          onPointerDown={(ev) => { ev.stopPropagation(); fermerDecision(false); }}
                        >
                          <b>⏭️ {t('ml.dec.laisser')}</b>
                          <span className="ml-dec-aide">{t('ml.dec.laisserAide')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {enPause && !decision && !e.bagarre && (
                    <button type="button" className="ml-voile-pause" onPointerDown={() => setEnPause(false)}>
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
                    setTempo(suivant === 'jouer' ? 'moments' : 'suivre');
                  }}
                >
                  {enJeu ? `🎮 ${t('ml.mode.jouer')}` : `👁️ ${t('ml.mode.regarder')}`}
                </button>
              )}
              {!e.fini && (
                <div className="ml-tempos">
                  {TEMPOS.filter((v) => v.id !== 'moments' || !!monPion).map((v) => (
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
                onClick={() => setTiroir((v) => (v ? null : (large ? 'commandes' : 'fil')))}
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
              {monPion && <Coaching {...{ consigneTexte, setConsigneTexte, envoiConsigne, envoyerConsigne, e }} />}
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
                ['commandes', '🕹️', 'ml.commandes.titre'],
              ] as const)
                .filter(([id]) => (id !== 'consigne' || !!monPion) && (id !== 'fil' || !large))
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
            {tiroir === 'commandes' && (
              <div className="ml-tiroir-corps">
                <div className="ml-commandes-liste">
                  <span>👆 {t('ml.commandes.tactile')}</span>
                  <span>👆 {t('ml.commandes.sprintTactile')}</span>
                  <span>
                    <kbd>{liaisons.haut.libelle}</kbd><kbd>{liaisons.gauche.libelle}</kbd>
                    <kbd>{liaisons.bas.libelle}</kbd><kbd>{liaisons.droite.libelle}</kbd>
                    {' · '}<kbd>◀▲▼▶</kbd> · 🕹️ {t('ml.commandes.deplacer')}
                  </span>
                  <span><kbd>{liaisons.sprint.libelle}</kbd> · <kbd>RT</kbd> : {t('ml.commandes.sprint')}</span>
                  <span><kbd>{liaisons.principale.libelle}</kbd> · <kbd>A / ✕</kbd> : {t('ml.commandes.principale')}</span>
                  {manetteVue.current && <span>🎮 {t('ml.manetteDetectee')}</span>}
                  {/* ⚠️ LA NOTICE SE CONSTRUIT DEPUIS LA TABLE RÉGLABLE, pas
                      depuis celle de la manette : sinon une action jouable au
                      clavier mais non mappée sur un bouton n'apparaîtrait nulle
                      part — c'est ce qui est arrivé à « Plaquer », l'action la
                      plus utile du jeu, absente de l'écran d'aide. Et comme
                      elle lit les liaisons EFFECTIVES, elle suit les touches
                      que le joueur s'est choisies dans les réglages. */}
                  {COMMANDES_REGLABLES.map(({ cle }) => {
                    const def = ACTION_PAR_ID.get(cle as never);
                    if (!def) return null;
                    const a = liaisons[cle];
                    const bouton = BOUTON_PAR_ACTION.get(def.id);
                    return (
                      <span key={cle}>
                        <kbd>{a?.code ? (a.libelle || libelleDeCode(a.code)) : '-'}</kbd>
                        {bouton && <> · <kbd>{bouton}</kbd></>} : {def.emoji} {t(def.cle)}
                      </span>
                    );
                  })}
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

/** La tête du joystick, bornée au rayon de déflexion. */
function teteStick(j: { dx: number; dy: number }): React.CSSProperties {
  const norme = Math.hypot(j.dx, j.dy) || 1;
  const k = Math.min(1, norme / RAYON_STICK);
  return {
    transform: `translate(${(j.dx / norme) * k * RAYON_STICK}px, ${(j.dy / norme) * k * RAYON_STICK}px)`,
  };
}
