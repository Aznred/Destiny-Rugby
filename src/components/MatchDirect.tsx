// 📺 LE MATCH EN FIL — la mécanique de match, refaite de zéro
//
// ═══ CE QUI A ÉTÉ DEMANDÉ ════════════════════════════════════════════════════
//
// « Refais la mécanique de match totalement, que ce soit super facile et fun à
// prendre en main sur n'importe quel appareil, super ludique. » Et, juste
// avant, le format voulu, décrit précisément : un fil généré par blocs de deux
// à quatre actions, chaque ligne en `[minute'] [emoji] [phrase courte]`, centré
// sur son joueur, qui s'ARRÊTE sur un moment décisif et attend la décision — un
// choix parmi ceux proposés, ou une consigne libre.
//
// ═══ CE QUI DISPARAÎT, ET POURQUOI ═══════════════════════════════════════════
//
// Le terrain en deux dimensions, la caméra, le joystick, les treize boutons
// d'action, les raccourcis clavier, la manette. Tout cela FONCTIONNE — c'est
// mesuré — mais tout cela demande d'apprendre à jouer avant de pouvoir jouer,
// et demande un écran, deux pouces et soixante images par seconde. Ce qui reste
// tient sur un téléphone de six ans : du texte, une barre, et de gros boutons.
//
// ⚠️ LE MOTEUR, LUI, NE CHANGE PAS D'UNE LIGNE. `lib/moteur/` reste la seule
// vérité : le score est toujours EXACTEMENT celui de la ligue, les statistiques
// qui partent dans la saison sont celles du match qu'on vient de jouer, la
// discipline et les blessures suivent le même chemin qu'avant. On a remplacé la
// surface, pas la simulation — et tout ce qui était mesuré le reste.
//
// ⚠️ `createPortal(document.body)` EST OBLIGATOIRE, ET CE N'EST PAS UN DÉTAIL.
// Le `backdrop-filter` des `.carte` crée un bloc conteneur : un `position: fixed`
// à l'intérieur ne se cale plus sur la fenêtre mais sur la carte. Sans portal,
// la modale de match se retrouvait DANS le panneau de carrière, écrasée sur
// 290 px, par-dessus la fiche du joueur — vu en jeu, capture à l'appui. C'est
// la même leçon que `Confirmation`, `FicheClub` et la barre d'action mobile, et
// elle est déjà écrite trois fois dans CLAUDE.md : il fallait la relire.
//
// ⚠️ ET `useModalDialog` EN DÉPEND AUSSI : il rend `inert` tous les enfants de
// `<body>` SAUF l'overlay. Si l'overlay n'est pas un enfant direct de `<body>`,
// il n'en épargne aucun — la modale se neutralise elle-même.

// ⚠️ ET ON N'AVANCE PLUS À L'IMAGE, MAIS À L'ÉVÈNEMENT (voir `moteur/fil.ts`).
// Une horloge remplace `requestAnimationFrame` : plus d'interpolation, plus de
// `ResizeObserver`, plus de matrice de caméra. C'est ce qui rend l'écran
// identique partout — y compris dans un onglet en arrière-plan, où le
// navigateur ne déclenche plus une seule image.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  appliquerConsigne, bilan, creerMatch, ordonner, type EtatMatch,
} from '../lib/moteur/moteur';
import { ORDRES } from '../lib/moteur/bagarre';
import { demanderAction } from '../lib/moteur/controle';
import {
  DELAI_DECISION, decisionPour, type Decision,
} from '../lib/moteur/decisions';
import { avanceeDuBallon, filComplet, jouerUnBloc, type LigneFil } from '../lib/moteur/fil';
import { detailNote, noterMatch, statsPourLaNote } from '../lib/moteur/apresMatch';
import { CONSIGNE_NEUTRE, lireConsigneIA, lireConsigneLocale } from '../lib/moteur/consignes';
import { estTitulaire } from '../lib/moteur/saison';
import type { NiveauMatch } from '../lib/moteur/etat';
import { iaDisponible } from '../lib/groq';
import { competitionEffective } from '../lib/divisions';
import { effectifDuClub } from '../lib/effectif';
import { effectifNational } from '../lib/international';
import { nomNation } from '../lib/nations';
import { clubParNom } from '../data/clubs';
import type { MatchChampionnat } from '../lib/championnat';
import type { Joueur } from '../types';
import { useGame } from '../store/useGame';
import { Blason, LogoEquipe } from './Blason';
import { FeuilleMatch } from './match/FeuilleMatch';
import { t } from '../lib/i18n';
import { useModalDialog } from '../lib/useModalDialog';

/**
 * Le rythme du fil, en millisecondes entre deux blocs.
 *
 * ⚠️ C'EST LE RÉGLAGE QUI DÉCIDE SI LE MATCH EST AGRÉABLE. Trop rapide, on lit
 * en diagonale et le match passe sans qu'on l'ait vécu ; trop lent, on attend
 * devant son téléphone. Mesuré sur un match complet : ~45 blocs, donc ~1 min de
 * lecture au rythme normal, plus le temps des décisions.
 */
const RYTHME = { normal: 1150, rapide: 260 } as const;
type Vitesse = keyof typeof RYTHME;

/** Le niveau décide de toute la discipline (voir `moteur/bagarre.ts`). */
function niveauDuMatch(joueur: Joueur | null | undefined, selection?: boolean): NiveauMatch {
  if (!joueur || selection) return 'pro';
  const compet = competitionEffective(joueur.club, joueur.division);
  return (compet?.niveau ?? 6) >= 4 ? 'amateur' : 'pro';
}

/** Une vibration courte, si l'appareil en a une. Silencieuse partout ailleurs. */
function vibrer(ms: number): void {
  // ⚠️ PAS AVANT LE PREMIER GESTE DU JOUEUR. Chrome REFUSE la vibration tant
  // que la page n'a pas été touchée, et il l'écrit en erreur dans la console :
  // une erreur rouge pour un comportement parfaitement normal finit par masquer
  // les vraies. On demande donc d'abord si le geste a eu lieu.
  if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation?.hasBeenActive === false) return;
  try {
    (navigator as Navigator & { vibrate?: (m: number) => boolean }).vibrate?.(ms);
  } catch {
    // Certains navigateurs exposent l'API et la refusent : ce n'est pas une erreur.
  }
}

export function MatchDirect({
  match, saison, cle, titre, onFermer, onTermine, joueur, selection,
}: {
  match: MatchChampionnat;
  saison: number;
  cle: string;
  titre: string;
  selection?: boolean;
  onFermer: () => void;
  /** Appelé UNE FOIS à la sirène : c'est ce qui autorise le passage à la semaine suivante. */
  onTermine?: () => void;
  joueur?: Joueur | null;
}) {
  const iaActivee = useGame((s) => s.iaActivee);
  const enregistrerMatchVecu = useGame((s) => s.enregistrerMatchVecu);
  const appliquerSanctionMatch = useGame((s) => s.appliquerSanctionMatch);
  const { overlayRef, dialogRef } = useModalDialog(onFermer);

  // Le moteur vit dans une ref : c'est un objet muté en continu, le passer par
  // l'état de React ferait des centaines de rendus pour rien.
  const moteur = useRef<EtatMatch>(null as unknown as EtatMatch);
  if (!moteur.current) {
    const effectif = (equipe: string) =>
      (selection ? effectifNational(equipe, saison) : effectifDuClub(equipe, saison));
    const monEquipe = joueur ? (selection ? nomNation(joueur.nation) : joueur.club) : '';
    moteur.current = creerMatch(
      match.domicile, match.exterieur,
      effectif(match.domicile), effectif(match.exterieur),
      match.scoreD, match.scoreE, cle,
      joueur && (monEquipe === match.domicile || monEquipe === match.exterieur)
        ? {
            club: monEquipe, nom: joueur.nom, poste: joueur.poste,
            attributs: joueur.attributs,
            titulaire: selection ? true : estTitulaire(joueur, cle),
          }
        : undefined,
      { niveau: niveauDuMatch(joueur, selection), controle: true },
    );
  }
  const e = moteur.current;
  const clubA = clubParNom(e.clubA);
  const clubB = clubParNom(e.clubB);
  const monPion = e.pions.find((p) => p.moi);

  const [lignes, setLignes] = useState<LigneFil[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [vitesse, setVitesse] = useState<Vitesse>('normal');
  const [enPause, setEnPause] = useState(false);
  const [consigne, setConsigne] = useState('');
  const [, redessiner] = useState(0);

  /** Le compte à rebours de la carte, en secondes réelles. */
  const [reste, setReste] = useState(DELAI_DECISION);
  /** `e.sim` au moment de la dernière carte : c'est lui qui les espace. */
  const derniereDecision = useRef(0);
  const filRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<Decision | null>(null);
  decisionRef.current = decision;

  const fini = e.fini;

  // ── LE COEUR : un bloc, une pause, un bloc ────────────────────────────────
  // ⚠️ UNE HORLOGE, PAS UNE BOUCLE D'IMAGES. C'est ce qui rend l'écran
  // identique sur tous les appareils : il n'y a rien à composer, rien à
  // interpoler, et un onglet en arrière-plan continue de jouer.
  useEffect(() => {
    if (fini || enPause || decision || e.bagarre) return undefined;
    const minuteur = setTimeout(() => {
      const resultat = jouerUnBloc(e, (etat) =>
        decisionPour(etat, etat.pions.find((p) => p.moi), etat.sim - derniereDecision.current) !== null);
      setLignes(filComplet(e));
      if (resultat.raison === 'decision') {
        const carte = decisionPour(e, monPion, e.sim - derniereDecision.current);
        if (carte) {
          derniereDecision.current = e.sim;
          setReste(DELAI_DECISION);
          setDecision(carte);
          vibrer(20);
        }
      }
      if (resultat.raison === 'bagarre') vibrer(30);
      redessiner((n) => n + 1);
    }, RYTHME[vitesse]);
    return () => clearTimeout(minuteur);
    // `lignes.length` est dans les dépendances : c'est lui qui relance le bloc
    // suivant une fois celui-ci affiché.
  }, [e, fini, enPause, decision, vitesse, lignes.length, monPion]);

  // ── LE COMPTE À REBOURS DE LA CARTE ───────────────────────────────────────
  // ⚠️ LE MATCH EST FIGÉ PENDANT CE TEMPS-LÀ : la boucle ci-dessus ne tourne
  // pas tant que `decision` est posée. On ne perd donc rien à réfléchir.
  useEffect(() => {
    if (!decision) return undefined;
    if (reste <= 0) {
      // ⚠️ NE PAS CHOISIR EST UN CHOIX, et il se dit. Le moteur reprend son
      // rugby automatique, comme pour les vingt-neuf autres joueurs.
      if (monPion) {
        e.commentaires.push({
          minute: Math.min(80, Math.floor(e.t / 60)),
          texte: t('ml.dec.hesite', { nom: monPion.nom }),
          type: 'jeu', cote: monPion.cote, points: 0,
          scoreA: e.scoreA, scoreB: e.scoreB, moi: true,
        });
        setLignes(filComplet(e));
      }
      setDecision(null);
      return undefined;
    }
    const minuteur = setTimeout(() => setReste((v) => v - 1), 1000);
    return () => clearTimeout(minuteur);
  }, [decision, reste, e, monPion]);

  // Le fil colle au bas : la dernière action est toujours celle qu'on lit.
  useEffect(() => {
    const el = filRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lignes.length, decision]);

  // ── À LA SIRÈNE : la feuille, la note, la saison, la discipline ───────────
  const bilanRef = useRef<ReturnType<typeof bilan> | null>(null);
  if (fini && !bilanRef.current) bilanRef.current = bilan(e);
  const stats = bilanRef.current;

  const maNote = useMemo(() => {
    if (!fini || !monPion) return null;
    const s = statsPourLaNote(monPion);
    return { note: noterMatch(monPion.poste, s), detail: detailNote(monPion.poste, s) };
  }, [fini, monPion]);

  // ⚠️ MÊME CHEMIN QUE L'ANCIEN ÉCRAN, AU MOT PRÈS. C'est ici que le match
  // devient une ligne de carrière : les vraies statistiques partent dans la
  // saison, puis la discipline part juste après. L'ordre compte —
  // `enregistrerMatchVecu` peut poser une blessure de match, et la suspension
  // doit passer par-dessus.
  const dejaEnregistre = useRef(false);
  useEffect(() => {
    if (!fini || dejaEnregistre.current) return;
    dejaEnregistre.current = true;
    onTermine?.();
    if (!monPion) return;
    const chezMoi = monPion.cote === 'A';
    enregistrerMatchVecu(statsPourLaNote(monPion), {
      adversaire: chezMoi ? e.clubB : e.clubA,
      scorePour: chezMoi ? e.scoreA : e.scoreB,
      scoreContre: chezMoi ? e.scoreB : e.scoreA,
      domicile: chezMoi,
      libelle: titre.split('·').slice(1).map((m) => m.trim()).filter(Boolean).join(' · ')
        || t('ml.feuilleMatch'),
    });
    appliquerSanctionMatch({
      citation: e.discipline.citation,
      blessure: e.discipline.blessure,
      jaunes: e.discipline.jaunes,
      rouges: e.discipline.rouges,
    });
  }, [fini, e, monPion, enregistrerMatchVecu, appliquerSanctionMatch, onTermine, titre]);

  // ── LES ACTIONS DU JOUEUR ─────────────────────────────────────────────────
  const jouerChoix = useCallback((action: Parameters<typeof demanderAction>[1]) => {
    demanderAction(e, action);
    setDecision(null);
    vibrer(12);
  }, [e]);

  /**
   * ⚠️ LA CONSIGNE LIBRE, C'EST LA DEMANDE « OU LAISSE-MOI TE DONNER UNE
   * CONSIGNE LIBRE ». Elle passe par le coaching qui existait déjà
   * (`moteur/consignes.ts`) : mots-clés d'abord, IA ensuite si elle est
   * disponible. Elle ne remplace pas le choix, elle s'ajoute — on peut donner
   * une consigne ET prendre une option.
   */
  const envoyerConsigne = useCallback(async () => {
    const texte = consigne.trim();
    if (!texte) return;
    setConsigne('');
    const locale = lireConsigneLocale(texte);
    appliquerConsigne(e, locale ?? CONSIGNE_NEUTRE);
    redessiner((n) => n + 1);
    if (!locale && iaActivee && iaDisponible()) {
      const lue = await lireConsigneIA(texte).catch(() => null);
      if (lue) { appliquerConsigne(e, lue); redessiner((n) => n + 1); }
    }
  }, [consigne, e, iaActivee]);

  // ── LE RENDU ──────────────────────────────────────────────────────────────
  const monCote = monPion?.cote ?? 'A';
  const avancee = avanceeDuBallon(e, monCote);
  const minute = Math.min(80, Math.floor(e.t / 60));
  const mesStats = monPion ? {
    minutes: Math.min(80, Math.round(monPion.minutes)),
    plaquages: monPion.stats.plaquages,
    essais: monPion.stats.essais,
    metres: Math.round(monPion.stats.metres),
    passes: monPion.stats.passes,
  } : null;
  const surLeBanc = !!monPion && !monPion.surLeTerrain;

  return createPortal(
    <div className="overlay-match" ref={overlayRef}>
      <motion.div
        className="fd"
        ref={dialogRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {/* ═══ LE BANDEAU : qui joue, où on en est ═══════════════════════ */}
        <header className="fd-tete">
          <div className="fd-equipe">
            {clubA ? <Blason club={clubA} taille={28} /> : <LogoEquipe nom={e.clubA} taille={28} />}
            <b>{e.clubA}</b>
          </div>
          <div className="fd-score">
            <span className="fd-points">{e.scoreA} - {e.scoreB}</span>
            <span className="fd-minute">{minute}′</span>
          </div>
          <div className="fd-equipe droite">
            <b>{e.clubB}</b>
            {clubB ? <Blason club={clubB} taille={28} /> : <LogoEquipe nom={e.clubB} taille={28} />}
          </div>
          <button type="button" className="fd-fermer" onClick={onFermer} aria-label={t('ml.fermer')}>✕</button>
        </header>

        <div className="fd-chrono"><span style={{ width: `${(minute / 80) * 100}%` }} /></div>

        {/* ═══ OÙ EST LE BALLON ═══════════════════════════════════════════
            ⚠️ LES MARQUAGES S'APPELLENT `fd-marque`, PAS `fd-ligne`. Les deux
            ont porté le même nom, et comme un marquage est en
            `position: absolute; top: 0; bottom: 0; width: 1px`, CHAQUE rangée
            du fil héritait de la règle : toutes empilées au même endroit, sur
            un pixel de large, illisibles. Vu en jeu, capture à l'appui.
            ⚠️ TOUTE LA PART « VISUELLE » DONT UN FIL A BESOIN. Un texte seul
            ne dit jamais si on défend sur sa ligne ou si on pilonne à cinq
            mètres, et c'est pourtant ce qui fait monter la tension. */}
        <div className="fd-terrain" aria-hidden="true">
          <span className="fd-enbut gauche" />
          <span className="fd-marque" style={{ left: '22%' }} />
          <span className="fd-marque milieu" style={{ left: '50%' }} />
          <span className="fd-marque" style={{ left: '78%' }} />
          <span className="fd-enbut droite" />
          <span className="fd-ballon" style={{ left: `${avancee * 100}%` }}>🏉</span>
        </div>

        {/* ═══ LE FIL ═════════════════════════════════════════════════════ */}
        <div className="fd-fil" ref={filRef} aria-live="polite">
          {lignes.map((l) => (
            <div key={l.cle} className={`fd-evt${l.moi ? ' moi' : ''}${l.fort ? ' fort' : ''}`}>
              <span className="fd-min">{l.minute}′</span>
              <span className="fd-emoji">{l.emoji}</span>
              <span className="fd-texte">
                {l.texte}
                {l.score && <b className="fd-chip">{l.score}</b>}
              </span>
            </div>
          ))}
          {!fini && !decision && !e.bagarre && (
            <div className="fd-attente"><span /><span /><span /></div>
          )}
        </div>

        {/* ═══ MA LIGNE DE STATS ══════════════════════════════════════════ */}
        {mesStats && !fini && (
          <div className="fd-moi">
            <b>{monPion?.numero}. {monPion?.nom}</b>
            {surLeBanc
              ? <span className="fd-banc">{t('fd.surLeBanc')}</span>
              : (
                <span className="fd-mesures">
                  <i>{mesStats.minutes}′</i>
                  <i>💥 {mesStats.plaquages}</i>
                  <i>🔥 {mesStats.essais}</i>
                  <i>📏 {mesStats.metres} m</i>
                </span>
              )}
          </div>
        )}

        {/* ═══ ÇA DÉGÉNÈRE : L'ORDRE QUE TU DONNES ════════════════════════ */}
        <AnimatePresence>
          {e.bagarre && !fini && (
            <motion.div
              className="fd-carte bagarre"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="alertdialog"
            >
              <b>💢 {t('ml.bagarre.titre')}</b>
              <p>{t('ml.bagarre.texte', { nom: e.bagarre.adversaire.nom })}</p>
              <div className="fd-options">
                {ORDRES.map((o) => (
                  <button
                    key={o.id} type="button" className="fd-option"
                    onClick={() => { ordonner(e, o.id); redessiner((n) => n + 1); }}
                  >
                    <b>{o.emoji} {t(o.cle)}</b>
                    <span>{t(o.aide)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ LA DÉCISION : DIX SECONDES, LE MATCH FIGÉ ══════════════════ */}
        <AnimatePresence>
          {decision && !e.bagarre && !fini && (
            <motion.div
              className="fd-carte"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="alertdialog" aria-label={t('ml.dec.titre')}
            >
              <div className="fd-jauge"><span style={{ width: `${(reste / DELAI_DECISION) * 100}%` }} /></div>
              <b className="fd-situation">{decision.emoji} {t(decision.cle)}</b>
              <div className="fd-options">
                {decision.options.map((o) => (
                  <button
                    key={o.action} type="button" className="fd-option"
                    onClick={() => jouerChoix(o.action)}
                  >
                    <b>{o.emoji} {t(o.cle)}</b>
                    <span>{t(o.aide)}</span>
                  </button>
                ))}
                <button type="button" className="fd-option laisser" onClick={() => setDecision(null)}>
                  <b>⏭️ {t('ml.dec.laisser')}</b>
                  <span>{t('ml.dec.laisserAide')}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ LA FEUILLE, À LA SIRÈNE ════════════════════════════════════ */}
        {fini && stats && (
          <div className="fd-fin">
            <FeuilleMatch e={e} stats={stats} maNote={maNote} />
          </div>
        )}

        {/* ═══ LA BARRE DU BAS ════════════════════════════════════════════ */}
        <div className="fd-barre">
          {!fini && (
            <>
              <input
                type="text"
                className="fd-consigne"
                value={consigne}
                placeholder={t('fd.consigne')}
                onChange={(ev) => setConsigne(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') void envoyerConsigne(); }}
              />
              <button type="button" className="btn fantome petit" onClick={() => void envoyerConsigne()}>
                📣
              </button>
              <button
                type="button"
                className={`btn fantome petit${enPause ? ' actif' : ''}`}
                onClick={() => setEnPause((v) => !v)}
              >
                {enPause ? '▶️' : '⏸️'}
              </button>
              <button
                type="button"
                className={`btn fantome petit${vitesse === 'rapide' ? ' actif' : ''}`}
                onClick={() => setVitesse((v) => (v === 'normal' ? 'rapide' : 'normal'))}
              >
                ⏩
              </button>
            </>
          )}
          {fini && (
            <button type="button" className="btn vert" onClick={onFermer}>{t('ml.terminer')}</button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
