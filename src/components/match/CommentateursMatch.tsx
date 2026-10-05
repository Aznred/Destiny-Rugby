import { useEffect, useRef, useState } from 'react';
import { actionPrioritaire, creerChoixCommentaireAudio, creerSuiviCommentaires, familleCommentaireAudio, type ActionCommentee, type FamilleCommentaireAudio } from '../../lib/commentateursMatch';
import { creerRetransmission, type EtatRetransmission, type Replique } from '../../lib/commentaires/retransmission';
import { creerLecteurVoix, langueDeRetransmission, type LecteurVoix } from '../../lib/commentaires/voix';
import { langueCourante } from '../../lib/i18n';
import type { ContexteStatsTV } from '../../lib/statsTV';
import { Icone } from '../Icone';
import './CommentateursMatch.css';

/**
 * LES COMMENTATEURS DU MATCH. Trois réglages, retenus d'un match à l'autre :
 *
 *  - coupés ;
 *  - la RETRANSMISSION : un commentateur et un consultant qui regardent le
 *    match (`lib/commentaires/`), nomment les joueurs et se répondent, dits par
 *    la synthèse vocale de l'appareil — en français, ou en anglais pour les
 *    autres langues du jeu. Demande `etat` : l'état du match affiché ;
 *  - les voix d'origine en anglais (clips par famille d'événement), comme avant.
 */
type Mode = 'coupe' | 'retransmission' | 'origine';
const CLE = 'destiny-rugby:commentateurs';
const modeRetenu = (): Mode => {
  try { const m = localStorage.getItem(CLE); return m === 'retransmission' || m === 'origine' ? m : 'coupe'; } catch { return 'coupe'; }
};

export function CommentateursMatch({ lignes, seconde, pause = false, etat, contexte }: {
  lignes: readonly ActionCommentee[]; seconde: number; pause?: boolean;
  /** L'état du match tel qu'il est affiché : sans lui, seules les voix d'origine sont proposées. */
  etat?: EtatRetransmission | null;
  /** Ce que l'hôte sait de la saison (essais, confrontations, séries) : préparé une fois, jamais demandé pendant le match. */
  contexte?: ContexteStatsTV;
}) {
  // ⚠️ La voix ne démarre jamais seule : un navigateur refuse de parler sans un geste. Le réglage
  // retenu est donc PROPOSÉ (le bouton le montre), et le premier appui le lance.
  const [mode, setMode] = useState<Mode>('coupe');
  const [erreur, setErreur] = useState('');
  const [cache, setCache] = useState(() => document.hidden);
  const [parole, setParole] = useState<Replique | null>(null);
  const suivi = useRef(creerSuiviCommentaires());
  const choisir = useRef(creerChoixCommentaireAudio());
  const audio = useRef<HTMLAudioElement>(null);
  const lecture = useRef(0);
  const actuel = useRef({ lignes, seconde });
  actuel.current = { lignes, seconde };
  const langue = langueDeRetransmission(langueCourante());
  const observer = useRef<ReturnType<typeof creerRetransmission> | null>(null);
  const voix = useRef<LecteurVoix | null>(null);
  const horloge = useRef(0);
  const retransmissionPossible = !!etat;

  const couperClip = () => {
    lecture.current++;
    const lecteur = audio.current;
    if (!lecteur) return;
    lecteur.pause();
    lecteur.removeAttribute('src');
    lecteur.load();
  };
  useEffect(() => {
    const lecteur = audio.current;
    const visibilite = () => { setCache(document.hidden); if (document.hidden) { couperClip(); voix.current?.couper(); } };
    document.addEventListener('visibilitychange', visibilite);
    return () => {
      document.removeEventListener('visibilitychange', visibilite);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- compteur d'annulation, pas une référence au DOM
      lecture.current++;
      lecteur?.pause();
      lecteur?.removeAttribute('src');
      lecteur?.load();
      voix.current?.detruire(); voix.current = null;
    };
  }, []);

  const jouer = (famille: FamilleCommentaireAudio) => {
    const lecteur = audio.current;
    if (!lecteur) return;
    couperClip();
    const numero = lecture.current;
    lecteur.src = choisir.current(famille);
    lecteur.volume = .9;
    void lecteur.play().catch(() => {
      if (lecture.current !== numero) return;
      setErreur('La voix est indisponible. Réessaie en activant les commentateurs.');
      setMode('coupe');
    });
  };

  // ── Les voix d'origine : un clip par famille d'événement du journal ──────
  useEffect(() => {
    const actif = mode === 'origine';
    const action = suivi.current(lignes, seconde, actif && !pause && !cache, performance.now());
    if (!actif || pause || cache) { if (audio.current?.hasAttribute('src')) couperClip(); return; }
    const famille = action && familleCommentaireAudio(action);
    if (action && famille && (audio.current?.paused || actionPrioritaire(action))) jouer(famille);
    // Le moteur solo enrichit le tableau en place : sa longueur fait partie des dépendances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lignes, lignes.length, seconde, mode, pause, cache]);

  // ── La retransmission : elle regarde l'état du match à chaque rendu de l'hôte ──
  useEffect(() => {
    if (mode !== 'retransmission' || !retransmissionPossible || !observer.current || !voix.current) return;
    if (pause || cache) { voix.current.couper(); return; }
    // Une horloge d'écran : les répliques se périment en secondes réelles, pas en minutes de match.
    horloge.current = performance.now() / 1000;
    for (const replique of observer.current(etat!, horloge.current)) {
      voix.current.dire(replique, horloge.current);
    }
  });

  const basculer = () => {
    setErreur('');
    couperClip(); voix.current?.detruire(); voix.current = null; observer.current = null; setParole(null);
    const voulu: Mode = mode === 'coupe' ? (retransmissionPossible ? (modeRetenu() === 'origine' ? 'origine' : 'retransmission') : 'origine')
      : mode === 'retransmission' ? 'origine' : 'coupe';
    try { localStorage.setItem(CLE, voulu); } catch { /* stockage refusé : le réglage ne sera pas retenu */ }
    setMode(voulu);
    if (voulu === 'retransmission') {
      observer.current = creerRetransmission(langue, contexte);
      voix.current = creerLecteurVoix(langue, setParole);
      // Une première phrase sur le clic : c'est elle qui autorise la voix sur téléphone.
      voix.current.dire({ voix: 'commentateur', categorie: 'accueil', priorite: 3, t: performance.now() / 1000,
        texte: langue === 'fr' ? 'Bonjour à tous, et bienvenue pour suivre cette rencontre !' : 'Hello everyone, and welcome to this match!' }, performance.now() / 1000);
    } else if (voulu === 'origine') {
      suivi.current = creerSuiviCommentaires();
      suivi.current(actuel.current.lignes, actuel.current.seconde, false, performance.now());
      if (!pause && !cache) jouer(seconde < 30 ? 'PreKickOffFirstHalf' : 'FillerCrowd');
    }
  };
  const libelle = erreur ? 'Voix indisponible'
    : mode === 'retransmission' ? `Commentateurs · ${langue.toUpperCase()}` : mode === 'origine' ? 'Voix d’origine · EN' : 'Commentateurs';
  const titre = erreur || (mode === 'coupe' ? 'Activer les commentateurs'
    : mode === 'retransmission' ? 'Commentateur et consultant (voix de synthèse) — appuyer pour les voix d’origine'
      : 'Voix d’origine en anglais — appuyer pour couper');
  return <>
    <audio ref={audio} preload="none" hidden aria-hidden="true" />
    <button type="button" className={`commentateurs-match${mode !== 'coupe' ? ' actif' : ''}`}
      aria-label={titre} aria-pressed={mode !== 'coupe'} title={titre} onClick={basculer}>
      <Icone nom={mode !== 'coupe' ? 'son' : 'son-coupe'} taille={15} /><span>{libelle}</span>
    </button>
    {/* Le sous-titre : qui parle, et ce qu'il dit — seul témoin de la retransmission quand l'appareil n'a pas de voix. */}
    {mode === 'retransmission' && parole && <p className={`commentateurs-sous-titre ${parole.voix}`} aria-live="polite">
      <b>{parole.voix === 'commentateur' ? (langue === 'fr' ? 'Commentateur' : 'Commentator') : (langue === 'fr' ? 'Consultant' : 'Analyst')}</b>
      <span>{parole.texte}</span>
    </p>}
  </>;
}
