// LE MATCH EN DIRECT — le moteur (lib/moteur/) rendu à l'écran.
//
// L'écran ne raconte pas un score : il AFFICHE trente pions qui jouent
// vraiment. Les pods se forment, la ligne défensive monte, le second rideau
// couvre le fond, le ballon voyage jusqu'à l'aile.
//
// ⚠️ TROIS CHOIX QUI FONT LA FLUIDITÉ
// 1. AUCUNE TRANSITION CSS sur les pions. L'ancien rendu posait une transition
//    de 0,55 s sur `transform` : chaque position affichée avait une demi-seconde
//    de retard sur la simulation, et le mouvement « caoutchoutait ». Le moteur
//    tourne à 60 images par seconde, il n'a besoin d'aucune aide.
// 2. INTERPOLATION EXACTE. La simulation avance par pas fixes de 0,15 s, le
//    rendu à 60 Hz : sans rien, les pions avanceraient par saccades de 7 Hz. On
//    affiche donc `position + vitesse × reliquat` — le reliquat étant le temps
//    déjà écoulé mais pas encore simulé. C'est exact, ça ne coûte rien, et ça
//    ne retarde rien.
// 3. LE TERRAIN EST DESSINÉ UNE FOIS (`useMemo`) et le fil de commentaire n'est
//    reconstruit que lorsqu'une ligne s'ajoute. Seuls les 30 pions et le ballon
//    sont recalculés à chaque image.
//
// ⚠️ `createPortal(document.body)` obligatoire : le `backdrop-filter` des
// `.carte` crée un bloc conteneur qui piège les `position: fixed`.

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  appliquerConsigne, avancer, bilan, creerMatch, DT, type EtatMatch,
} from '../lib/moteur/moteur';
import type { Commentaire, TypeCommentaire } from '../lib/moteur/etat';
import { LARGEUR, LONGUEUR, LIGNE_A, LIGNE_B, MILIEU, M22_A, M22_B, AXE } from '../lib/moteur/terrain';
import { estTitulaire } from '../lib/moteur/saison';
import { CONSIGNE_NEUTRE, lireConsigneGroq, lireConsigneLocale } from '../lib/moteur/consignes';
import type { Pion } from '../lib/moteur/entites';
import {
  detailNote, noterMatch, type StatsMatchJoueur,
} from '../lib/moteur/apresMatch';
import { graine, type MatchChampionnat } from '../lib/championnat';
import { effectifDuClub } from '../lib/effectif';
import { effectifNational } from '../lib/international';
import { nomNation } from './Drapeau';
import { clubParNom } from '../data/clubs';
import { POSTE_PAR_ID } from '../data/rugby';
import { CLE_ENV } from '../lib/groq';
import { useGame } from '../store/useGame';
import { Blason, LogoEquipe } from './Blason';
import type { Joueur } from '../types';
import { t } from '../lib/i18n';

// ---------------------------------------------------------------------------
// LA FEUILLE DE MATCH — TOUT CE QUE LE MOTEUR COMPTE
// ---------------------------------------------------------------------------
// ⚠️ Retour de jeu : « en match on a pas accès à tous les stats ». Le moteur
// tient VINGT-TROIS compteurs par joueur (`StatsMatch`, moteur/entites.ts) et la
// feuille n'en montrait que cinq — mètres, plaquages, essais, passes, minutes.
// Autant dire que le match d'un avant était invisible : ni mêlée, ni touche, ni
// pick and go, ni grattage.
//
// ⚠️ ET ON NE FAIT PAS UN TABLEAU DE VINGT-TROIS COLONNES. Sur un téléphone de
// 375 px, c'est illisible, et sur ordinateur ça ne se lit pas mieux. On range
// par FAMILLE — comme les classements de l'écran Résultats — et on bascule d'un
// clic. Chaque colonne dit à quoi elle correspond au survol.
interface ColonneFeuille {
  cle: string;
  entete: string;
  titre: string;
  valeur: (s: import('../lib/moteur/entites').StatsMatch) => number;
}

const VUES_FEUILLE: { id: string; nom: string; emoji: string; colonnes: ColonneFeuille[] }[] = [
  {
    id: 'general', nom: 'Général', emoji: '📋',
    colonnes: [
      { cle: 'metres', entete: 'm', titre: 'Mètres gagnés ballon en main', valeur: (s) => s.metres },
      { cle: 'plaquages', entete: 'plq', titre: 'Plaquages réussis', valeur: (s) => s.plaquages },
      { cle: 'essais', entete: 'ess', titre: 'Essais', valeur: (s) => s.essais },
      { cle: 'passes', entete: 'pas', titre: 'Passes', valeur: (s) => s.passes },
    ],
  },
  {
    id: 'attaque', nom: 'Attaque', emoji: '⚡',
    colonnes: [
      { cle: 'courses', entete: 'crs', titre: 'Ballons portés', valeur: (s) => s.courses },
      { cle: 'franchissements', entete: 'frn', titre: 'Franchissements / défenseurs battus', valeur: (s) => s.franchissements },
      { cle: 'offloads', entete: 'off', titre: 'Offloads (passe après contact)', valeur: (s) => s.offloads },
      { cle: 'passesDecisives', entete: 'p.d', titre: 'Passes décisives', valeur: (s) => s.passesDecisives },
      { cle: 'passesRatees', entete: 'en-av', titre: 'En-avant et passes ratées', valeur: (s) => s.passesRatees },
    ],
  },
  {
    id: 'defense', nom: 'Défense', emoji: '🛡️',
    colonnes: [
      { cle: 'plaquages', entete: 'plq', titre: 'Plaquages réussis', valeur: (s) => s.plaquages },
      { cle: 'plaquagesManques', entete: 'mqs', titre: 'Plaquages manqués', valeur: (s) => s.plaquagesManques },
      { cle: 'grattages', entete: 'grt', titre: 'Ballons grattés au sol', valeur: (s) => s.grattages },
      { cle: 'rucksNettoyes', entete: 'rck', titre: 'Rucks nettoyés', valeur: (s) => s.rucksNettoyes },
    ],
  },
  {
    id: 'conquete', nom: 'Conquête', emoji: '🌀',
    colonnes: [
      { cle: 'melees', entete: 'mêl', titre: 'Mêlées gagnées par son pack', valeur: (s) => s.melees },
      { cle: 'touchesGagnees', entete: 'tch', titre: 'Touches captées', valeur: (s) => s.touchesGagnees },
      { cle: 'pickAndGo', entete: 'p&g', titre: 'Pick and go (ballons portés au ras)', valeur: (s) => s.pickAndGo },
    ],
  },
  {
    id: 'pied', nom: 'Pied', emoji: '🦵',
    colonnes: [
      { cle: 'coupsDePied', entete: 'cdp', titre: 'Coups de pied', valeur: (s) => s.coupsDePied },
      { cle: 'metresAuPied', entete: 'm/p', titre: 'Mètres au pied', valeur: (s) => s.metresAuPied },
      { cle: 'cinquanteVingtDeux', entete: '50/22', titre: '50/22 réussis', valeur: (s) => s.cinquanteVingtDeux },
      { cle: 'buts', entete: 'buts', titre: 'Tirs au but réussis', valeur: (s) => s.butsReussis },
      { cle: 'butsTentes', entete: 'tent', titre: 'Tirs au but tentés', valeur: (s) => s.butsTentes },
    ],
  },
  {
    id: 'discipline', nom: 'Discipline', emoji: '🟨',
    colonnes: [
      { cle: 'cartonsJaunes', entete: '🟨', titre: 'Cartons jaunes', valeur: (s) => s.cartonsJaunes },
      { cle: 'cartonsRouges', entete: '🟥', titre: 'Cartons rouges', valeur: (s) => s.cartonsRouges },
      { cle: 'plaquagesManques', entete: 'mqs', titre: 'Plaquages manqués', valeur: (s) => s.plaquagesManques },
      { cle: 'distance', entete: 'km', titre: 'Distance parcourue (km)', valeur: (s) => s.distanceParcourue / 1000 },
    ],
  },
];

/**
 * La feuille du joueur incarné, au format attendu par le barème.
 *
 * ⚠️ UNE SEULE EXTRACTION, DEUX USAGES : ce qui part dans la saison
 * (`enregistrerMatchVecu`) et ce qui s'affiche en détail de note. Deux copies,
 * et le détail montré finirait par ne plus correspondre à la note calculée.
 */
function statsPourLaNote(p: Pion): StatsMatchJoueur {
  return {
    essais: p.stats.essais,
    plaquages: p.stats.plaquages,
    plaquagesManques: p.stats.plaquagesManques,
    passes: p.stats.passes,
    metres: Math.round(p.stats.metres),
    grattages: p.stats.grattages,
    butsTentes: p.stats.butsTentes,
    butsReussis: p.stats.butsReussis,
    cartons: p.stats.cartonsJaunes + p.stats.cartonsRouges,
    minutes: Math.min(80, Math.round(p.minutes)),
    // ⚠️ TOUTE LA FEUILLE REMONTE, pas seulement ce qui se voit. C'est ce qui
    // permet à la note de juger un avant sur son vrai travail (mêlée, touche,
    // ballons portés au ras) et pas sur ses essais.
    passesDecisives: p.stats.passesDecisives,
    offloads: p.stats.offloads,
    franchissements: p.stats.franchissements,
    turnovers: p.stats.passesRatees,
    melees: p.stats.melees,
    touchesGagnees: p.stats.touchesGagnees,
    pickAndGo: p.stats.pickAndGo,
    cinquanteVingtDeux: p.stats.cinquanteVingtDeux,
    cartonsRouges: p.stats.cartonsRouges,
  };
}

// ⚠️ L'ÉCHELLE DE TEMPS EST DOUBLE, et c'est ce qui rend le direct regardable.
//
// L'ACTION se joue à ×5 : on suit les courses sans que ça saute. Mais un match
// ne contient que ~35 minutes de ballon vivant — le reste, ce sont des mêlées
// qui se forment et des transformations. Le moteur fait donc défiler l'horloge
// beaucoup plus vite pendant les arrêts de jeu (une mêlée : 5 secondes à
// l'écran, 50 secondes au chrono). Résultat : ~7 minutes réelles pour 80
// minutes de rugby, dont presque tout en ballon vivant.
const VITESSES = [
  { label: '×1', facteur: 5 },
  { label: '×2', facteur: 10 },
  { label: '×4', facteur: 20 },
  { label: '⏭️', facteur: 600 },
];

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

const LIBELLE_PHASE: Record<string, string> = {
  coupEnvoi: 'coup d’envoi', renvoi22: 'renvoi aux 22', ruck: 'ruck',
  melee: 'mêlée', touche: 'touche', maul: 'ballon porté',
  ballonEnLAir: 'ballon en l’air', tirAuBut: 'tir au but',
  transformation: 'transformation', penalite: 'pénalité',
  apresEssai: 'après l’essai', miTemps: 'mi-temps',
};

const LIBELLE_SYSTEME: Record<string, string> = {
  blitz: 'défense montante', glissee: 'défense glissée', repli: 'repli, couverture du pied',
};

// ---------------------------------------------------------------------------
// LE TERRAIN — dessiné une seule fois
// ---------------------------------------------------------------------------
function Terrain() {
  return (
    <>
      <defs>
        <linearGradient id="ml-pelouse" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c5a37" />
          <stop offset="0.5" stopColor="#164a2c" />
          <stop offset="1" stopColor="#0f3a22" />
        </linearGradient>
        <radialGradient id="ml-lumiere" cx="0.5" cy="0.42" r="0.72">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
      </defs>
      <rect width={LONGUEUR} height={LARGEUR} fill="url(#ml-pelouse)" />
      {/* Bandes de tonte, dans le sens de la longueur */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x="0" y={(i * LARGEUR) / 10} width={LONGUEUR} height={LARGEUR / 10}
          fill={i % 2 ? 'rgba(255,255,255,.035)' : 'transparent'} />
      ))}
      {/* En-buts */}
      <rect x="0" y="0" width={LIGNE_A} height={LARGEUR} fill="rgba(0,0,0,.28)" />
      <rect x={LIGNE_B} y="0" width={LIGNE_A} height={LARGEUR} fill="rgba(0,0,0,.28)" />
      {/* Lignes pleines : essai, 22, médiane */}
      {[LIGNE_A, M22_A, MILIEU, M22_B, LIGNE_B].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2={LARGEUR}
          stroke="rgba(255,255,255,.58)" strokeWidth={x === MILIEU ? 0.5 : 0.4} />
      ))}
      {/* Les 10 mètres, en pointillés */}
      {[MILIEU - 10, MILIEU + 10].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2={LARGEUR} stroke="rgba(255,255,255,.32)"
          strokeWidth="0.3" strokeDasharray="1.6 2.4" />
      ))}
      {/* Pointillés des 5 m et 15 m */}
      {[5, 15, LARGEUR - 15, LARGEUR - 5].map((y) => (
        <line key={y} x1={LIGNE_A} y1={y} x2={LIGNE_B} y2={y} stroke="rgba(255,255,255,.15)"
          strokeWidth="0.22" strokeDasharray="1 4" />
      ))}
      <rect x="0.2" y="0.2" width={LONGUEUR - 0.4} height={LARGEUR - 0.4}
        fill="none" stroke="rgba(255,255,255,.42)" strokeWidth="0.35" />
      {/* Poteaux en H, sur la ligne d'en-but */}
      {[LIGNE_A, LIGNE_B].map((x) => (
        <g key={x} stroke="#f6f2e6" strokeWidth="0.55" fill="none">
          <line x1={x} y1={AXE - 2.8} x2={x} y2={AXE - 9.5} />
          <line x1={x} y1={AXE + 2.8} x2={x} y2={AXE + 9.5} />
          <line x1={x} y1={AXE - 2.8} x2={x} y2={AXE + 2.8} strokeWidth="0.75" />
        </g>
      ))}
      <rect width={LONGUEUR} height={LARGEUR} fill="url(#ml-lumiere)" pointerEvents="none" />
    </>
  );
}
const TerrainMemo = memo(Terrain);

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
  const groqKey = useGame((s) => s.groqKey);
  const modele = useGame((s) => s.modele);
  const enregistrerMatchVecu = useGame((s) => s.enregistrerMatchVecu);

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
    );
  }
  const e = moteur.current;

  const [, redessiner] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const [vitesse, setVitesse] = useState(0);
  const [consigneTexte, setConsigneTexte] = useState('');
  const [envoiConsigne, setEnvoiConsigne] = useState(false);
  const filRef = useRef<HTMLDivElement>(null);
  const dernierTemps = useRef<number>(0);

  // --- LA BOUCLE DE RENDU ---------------------------------------------------
  useEffect(() => {
    let brut = 0;
    let actif = true;
    const image = (ms: number) => {
      if (!actif) return;
      brut = requestAnimationFrame(image);
      const precedent = dernierTemps.current || ms;
      dernierTemps.current = ms;
      // Match terminé : on arrête la boucle, plus rien ne bouge.
      if (e.fini) { redessiner((n) => n + 1); actif = false; cancelAnimationFrame(brut); return; }
      if (enPause) { return; }
      // Le delta réel est plafonné : revenir sur l'onglet ne doit pas faire
      // avancer le match de trois minutes d'un coup.
      const dtReel = Math.min(0.2, (ms - precedent) / 1000);
      avancer(e, dtReel * VITESSES[vitesse].facteur);
      redessiner((n) => n + 1);
    };
    brut = requestAnimationFrame(image);
    return () => { actif = false; cancelAnimationFrame(brut); };
  }, [enPause, vitesse, e]);

  useEffect(() => {
    filRef.current?.scrollTo({ top: filRef.current.scrollHeight });
  }, [e.commentaires.length]);

  useEffect(() => {
    const clavier = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onFermer();
      if (ev.key === ' ' && (ev.target as HTMLElement)?.tagName !== 'INPUT') {
        ev.preventDefault();
        setEnPause((p) => !p);
      }
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [onFermer]);

  // --- LE COACHING EN DIRECT ------------------------------------------------
  const envoyerConsigne = async () => {
    const t = consigneTexte.trim();
    if (!t) return;
    setConsigneTexte('');
    setEnvoiConsigne(true);
    appliquerConsigne(e, lireConsigneLocale(t));
    const cleIA = groqKey || CLE_ENV;
    if (cleIA) {
      try {
        const fine = await lireConsigneGroq(t, cleIA, modele,
          `${e.clubA} ${e.scoreA} – ${e.scoreB} ${e.clubB}, ${e.minute}e minute.`);
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
  const monPion = e.pions.find((p) => p.moi);
  // Quelle famille de statistiques la feuille de match affiche (voir VUES_FEUILLE).
  const [vueFeuille, setVueFeuille] = useState<string>('general');
  const colonnes = (VUES_FEUILLE.find((v) => v.id === vueFeuille) ?? VUES_FEUILLE[0]).colonnes;
  // La grille suit le nombre de colonnes : numéro, nom, les stats, les minutes.
  // ⚠️ `minmax(74px, 1fr)` SUR LE NOM, PAS `1fr`. Mesuré en jeu : avec cinq
  // colonnes de statistiques (vue « Pied »), les largeurs fixes consommaient
  // exactement la place disponible et la colonne du nom tombait à **0 px** —
  // une feuille de match sans noms. Le plancher la force à déborder, et le bloc
  // défile alors horizontalement DANS son conteneur (`.ml-bilan-groupe`) :
  // c'est la règle du projet pour les tableaux larges, la page ne part jamais
  // de côté.
  const grilleColonnes = `26px minmax(74px, 1fr) ${colonnes.map(() => '38px').join(' ')} 38px`;
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
  // plus des chiffres estimés, ce sont ceux du match qu'on vient de regarder.
  const dejaEnregistre = useRef(false);
  useEffect(() => {
    if (!e.fini || dejaEnregistre.current) return;
    dejaEnregistre.current = true;
    onTermine?.();
    if (!monPion) return;
    // ⚠️ Le RÉSULTAT part avec les statistiques : c'est ce qui permet à la
    // feuille de match d'être la seule entrée du journal pour ce week-end
    // (`semaineSuivante` n'ajoute plus son récit simulé par-dessus).
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
          || 'Feuille de match',
      },
    );
  }, [e.fini, e, monPion, enregistrerMatchVecu, onTermine, titre]);

  // --- LE RENDU DES PIONS ---------------------------------------------------
  // ⚠️ Interpolation exacte : le moteur avance par pas de 0,15 s, l'écran à
  // 60 Hz. On affiche la position à l'instant réel, `pos + vitesse × reliquat`.
  // ⚠️ Borné à un pas de simulation : en ⏭️ le reliquat peut valoir plusieurs
  // secondes de jeu non consommées, et projeter les pions hors du terrain.
  const r = Math.min(DT, Math.max(0, e.reliquat));
  const surLeTerrain = e.pions.filter((p) => p.surLeTerrain && p.sanction <= 0);

  const pion = (p: Pion) => {
    const x = p.pos.x + p.vitesse.x * r;
    const y = p.pos.y + p.vitesse.y * r;
    const porte = e.porteur === p;
    return (
      <g key={p.id} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
        {p.moi && <circle r="1.75" className="ml-aura" />}
        <ellipse cx="0.12" cy="0.3" rx="0.85" ry="0.6" fill="rgba(0,0,0,.35)" />
        <circle
          r="0.86"
          fill={p.cote === 'A' ? couleurA : couleurB}
          stroke={p.moi ? '#ffd45e' : porte ? '#fff6d8' : p.cote === 'A' ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.55)'}
          strokeWidth={p.moi || porte ? 0.3 : 0.16}
        />
        <text y="0.33" textAnchor="middle" fontSize="1" fill="#fff" fontWeight="700"
          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.45)', strokeWidth: 0.22 }}>
          {p.numero}
        </text>
      </g>
    );
  };

  // Le ballon : porté, en vol, ou au sol. En vol on l'agrandit et on garde son
  // ombre au sol — c'est ce qui donne la sensation de hauteur.
  const vol = e.vol;
  const ballon = e.porteur
    ? { x: e.porteur.pos.x + e.porteur.vitesse.x * r, y: e.porteur.pos.y + e.porteur.vitesse.y * r, h: 0 }
    : vol
      ? (() => {
          const k = Math.min(1, (vol.ecoule + r) / vol.duree);
          return {
            x: vol.de.x + (vol.vers.x - vol.de.x) * k,
            y: vol.de.y + (vol.vers.y - vol.de.y) * k,
            h: vol.hauteur * Math.sin(Math.PI * k),
          };
        })()
      : { x: e.ballon.x, y: e.ballon.y, h: 0 };

  const possession = e.compteurs.tempsA + e.compteurs.tempsB > 0
    ? Math.round((e.compteurs.tempsA / (e.compteurs.tempsA + e.compteurs.tempsB)) * 100)
    : 50;

  const terrain = useMemo(() => <TerrainMemo />, []);

  return createPortal(
    <div className="overlay-match" onClick={(ev) => { if (ev.target === ev.currentTarget) onFermer(); }}>
      <motion.div
        className="match-live"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <header className="ml-tete">
          <div className="ml-equipe">
            {clubA ? <Blason club={clubA} taille={30} /> : <LogoEquipe nom={e.clubA} taille={30} />}
            <b>{e.clubA}</b>
          </div>
          <div className="ml-score">
            <span>{e.scoreA}</span>
            <i>
              {e.minute}′{e.sirene && <em className="ml-sirene"> +</em>}
            </i>
            <span>{e.scoreB}</span>
          </div>
          <div className="ml-equipe droite">
            <b>{e.clubB}</b>
            {clubB ? <Blason club={clubB} taille={30} /> : <LogoEquipe nom={e.clubB} taille={30} />}
          </div>
          <button className="ml-fermer" onClick={onFermer} title={t('ml.fermerAide')}>✕</button>
        </header>

        <div className="ml-sous-titre">
          {titre}
          {e.phase !== 'jeuCourant' && e.phase !== 'fini' && (
            <span className="ml-phase"> · {LIBELLE_PHASE[e.phase] ?? e.phase}</span>
          )}
        </div>

        {/* ---------- LA BARRE DE POSSESSION ---------- */}
        <div className="ml-possession" title={t('ml.possession')}>
          <span style={{ width: `${possession}%`, background: couleurA }} />
          <span style={{ width: `${100 - possession}%`, background: couleurB }} />
        </div>

        {/* ---------- LE TERRAIN, AUX PROPORTIONS RÉELLES ---------- */}
        <svg className="ml-terrain" viewBox={`0 0 ${LONGUEUR} ${LARGEUR}`} aria-label={t('ml.terrain')}>
          {terrain}
          {surLeTerrain.filter((p) => p.cote === 'B').map(pion)}
          {surLeTerrain.filter((p) => p.cote === 'A').map(pion)}
          {ballon.h > 0.02 && (
            <ellipse cx={ballon.x} cy={ballon.y} rx="0.7" ry="0.45" fill="rgba(0,0,0,.3)" />
          )}
          <ellipse
            className="ml-ballon"
            cx={ballon.x}
            cy={ballon.y - ballon.h * 2.2}
            rx={0.85 + ballon.h * 0.35}
            ry={0.58 + ballon.h * 0.25}
            fill="#f4e3c0" stroke="#3a2410" strokeWidth="0.26"
          />
        </svg>

        {/* ---------- LA LECTURE DU JEU ---------- */}
        {!e.fini && (
          <div className="ml-lecture">
            <span className="ml-tag" style={{ borderColor: e.possession === 'A' ? couleurA : couleurB }}>
              🏉 {e.possession === 'A' ? e.clubA : e.clubB}
            </span>
            {e.lancement && <span className="ml-tag">▶ {e.lancement.libelle}</span>}
            <span className="ml-tag">🛡️ {LIBELLE_SYSTEME[e.systeme]}</span>
            {e.phasesDepuisArret > 0 && <span className="ml-tag">{t('ml.temps', { n: e.phasesDepuisArret })}</span>}
          </div>
        )}

        {/* ---------- COMMANDES ---------- */}
        <div className="ml-commandes">
          <button className="btn fantome" onClick={() => setEnPause((p) => !p)} disabled={e.fini}>
            {enPause ? `▶️ ${t('ml.reprendre')}` : `⏸️ ${t('ml.pause')}`}
          </button>
          <div className="ml-vitesses">
            {VITESSES.map((v, i) => (
              <button
                key={v.label}
                className={`ml-vitesse${vitesse === i ? ' actif' : ''}`}
                onClick={() => setVitesse(i)}
                title={i === VITESSES.length - 1 ? t('ml.finAide') : t('ml.vitesseAide', { vitesse: v.label })}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="ml-progression">
            <span style={{ width: `${Math.min(100, (e.t / 4800) * 100)}%` }} />
          </div>
          {monPion && (
            <span className="ml-endurance" title={t('ml.enduranceAide')}>
              🫁 {Math.round(monPion.endurance)}%
            </span>
          )}
          {e.fini && <button className="btn vert" onClick={onFermer}>{t('ml.terminer')}</button>}
        </div>

        {/* ---------- COACHING EN DIRECT ---------- */}
        {monPion && !e.fini && (
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
        )}

        {/* ---------- COMMENTAIRE / FEUILLE DE MATCH ---------- */}
        {e.fini && stats ? (
          <div className="ml-fil">
            <div className="ml-resume">
              <span>🏉 {stats.essaisA} – {stats.essaisB} {t('ml.essais')}</span>
              <span>🔒 {e.compteurs.rucks} {t('ml.rucks')}</span>
              <span>🙌 {e.compteurs.touches} {t('ml.touches')}</span>
              <span>🌀 {e.compteurs.melees} {t('ml.melees')}</span>
              <span>⚡ {e.compteurs.percees} {t('ml.percees')}</span>
            </div>
            {/* ⚠️ TOUTES LES STATISTIQUES SONT ACCESSIBLES (retour de jeu : « en
                match on a pas accès à tous les stats »). Le moteur en compte
                VINGT-TROIS et la feuille n'en montrait que cinq — un pilier qui
                dominait la mêlée et gagnait ses touches lisait une ligne à
                « 12 m, 9 plaquages » et rien d'autre. Plutôt qu'un tableau de
                vingt-trois colonnes illisible sur téléphone, on range par
                FAMILLE et on bascule d'un clic. */}
            {/* ═══ MA NOTE, ET D'OÙ ELLE VIENT ═══════════════════════════
                ⚠️ Retour de jeu : « notre joueur est jugé que sur plaquage,
                mètres parcourus et essai, ce qui est dommage ». Le barème en
                regarde quinze depuis longtemps — mais rien ne le montrait, et
                le résumé ne citait que ces trois-là. Ici, chaque ligne du
                barème est affichée avec ce qu'elle a rapporté ou coûté ; c'est
                `detailNote` qui les produit, la fonction que `noterMatch`
                additionne, donc ce qu'on lit EST la note. */}
            {maNote && (
              <details className="ml-ma-note">
                <summary>
                  ⭐ Ma note — <b>{maNote.note}/10</b>
                  <span> · d’où elle vient</span>
                </summary>
                <div className="ml-note-detail">
                  {maNote.detail.map((l) => (
                    <div key={l.libelle} className="ml-note-ligne">
                      <span>{l.libelle}</span>
                      <b data-signe={l.points > 0 ? 'plus' : l.points < 0 ? 'moins' : undefined}>
                        {l.points > 0 ? '+' : ''}{Math.round(l.points * 10) / 10}
                      </b>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="cats-stats ml-vues">
              {VUES_FEUILLE.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`chip-cat${vueFeuille === v.id ? ' actif' : ''}`}
                  onClick={() => setVueFeuille(v.id)}
                >
                  {v.emoji} {v.nom}
                </button>
              ))}
            </div>
            {[e.clubA, e.clubB].map((club) => (
              <div key={club} className="ml-bilan-groupe">
                <div className="ml-bilan-tete">📋 {club}</div>
                <div
                  className="ml-bilan-entete"
                  style={{ gridTemplateColumns: grilleColonnes }}
                >
                  <span /><span>{t('ml.joueur')}</span>
                  {colonnes.map((c) => <span key={c.cle} title={c.titre}>{c.entete}</span>)}
                  <span>min</span>
                </div>
                {stats.parJoueur
                  .filter((j) => j.club === club)
                  .sort((a, b) => a.numero - b.numero)
                  .map((j) => (
                    <div
                      key={`${j.club}-${j.numero}-${j.nom}`}
                      className="ml-bilan-ligne"
                      style={{ gridTemplateColumns: grilleColonnes }}
                      data-moi={j.moi ? 'oui' : undefined}
                      /* Les maillots 16 à 23 sont le banc : on les distingue. */
                      data-banc={j.numero > 15 ? 'oui' : undefined}
                    >
                      <span className="ml-bilan-num" title={POSTE_PAR_ID[j.poste]?.nom}>{j.numero}</span>
                      <span className="ml-bilan-nom">{j.nom}</span>
                      {colonnes.map((c) => {
                        const v = c.valeur(j.stats);
                        return <span key={c.cle}>{v ? Math.round(v * 10) / 10 : '–'}</span>;
                      })}
                      <span>{j.minutes}′</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="ml-fil" ref={filRef}>
            <Fil lignes={e.commentaires} n={e.commentaires.length} />
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
