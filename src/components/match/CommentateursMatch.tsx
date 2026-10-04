import { useEffect, useRef, useState } from 'react';
import { actionPrioritaire, creerChoixCommentaireAudio, creerSuiviCommentaires, familleCommentaireAudio, type ActionCommentee, type FamilleCommentaireAudio } from '../../lib/commentateursMatch';
import { Icone } from '../Icone';
import './CommentateursMatch.css';

export function CommentateursMatch({ lignes, seconde, pause = false }: {
  lignes: readonly ActionCommentee[]; seconde: number; pause?: boolean;
}) {
  const [actif, setActif] = useState(false);
  const [erreur, setErreur] = useState('');
  const [cache, setCache] = useState(() => document.hidden);
  const suivi = useRef(creerSuiviCommentaires());
  const choisir = useRef(creerChoixCommentaireAudio());
  const audio = useRef<HTMLAudioElement>(null);
  const lecture = useRef(0);
  const actuel = useRef({ lignes, seconde });
  actuel.current = { lignes, seconde };

  const couper = () => {
    lecture.current++;
    const lecteur = audio.current;
    if (!lecteur) return;
    lecteur.pause();
    lecteur.removeAttribute('src');
    lecteur.load();
  };
  useEffect(() => {
    const lecteur = audio.current;
    const visibilite = () => { setCache(document.hidden); if (document.hidden) couper(); };
    document.addEventListener('visibilitychange', visibilite);
    return () => {
      document.removeEventListener('visibilitychange', visibilite);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- compteur d'annulation, pas une référence au DOM
      lecture.current++;
      lecteur?.pause();
      lecteur?.removeAttribute('src');
      lecteur?.load();
    };
  }, []);

  const jouer = (famille: FamilleCommentaireAudio) => {
    const lecteur = audio.current;
    if (!lecteur) return;
    couper();
    const numero = lecture.current;
    lecteur.src = choisir.current(famille);
    lecteur.volume = .9;
    void lecteur.play().catch(() => {
      if (lecture.current !== numero) return;
      setErreur('La voix est indisponible. Réessaie en activant les commentateurs.');
      setActif(false);
    });
  };

  useEffect(() => {
    const action = suivi.current(lignes, seconde, actif && !pause && !cache, performance.now());
    if (!actif || pause || cache) { if (audio.current?.hasAttribute('src')) couper(); return; }
    const famille = action && familleCommentaireAudio(action);
    if (action && famille && (audio.current?.paused || actionPrioritaire(action))) jouer(famille);
    // Le moteur solo enrichit le tableau en place : sa longueur fait partie des dépendances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lignes, lignes.length, seconde, actif, pause, cache]);

  const basculer = () => {
    if (actif) { couper(); setActif(false); return; }
    setErreur('');
    suivi.current = creerSuiviCommentaires();
    suivi.current(actuel.current.lignes, actuel.current.seconde, false, performance.now());
    setActif(true);
    // Une première phrase directement sur le clic autorise la lecture sur mobile.
    if (!pause && !cache) jouer(seconde < 30 ? 'PreKickOffFirstHalf' : 'FillerCrowd');
  };
  const titre = erreur || (actif ? 'Couper les commentateurs' : 'Activer les commentateurs (voix originales en anglais)');
  return <>
    <audio ref={audio} preload="none" hidden aria-hidden="true" />
    <button type="button" className={`commentateurs-match${actif ? ' actif' : ''}`}
      aria-label={titre} aria-pressed={actif} title={titre} onClick={basculer}>
      <Icone nom={actif ? 'son' : 'son-coupe'} taille={15} /><span>{erreur ? 'Voix indisponible' : 'Commentateurs · EN'}</span>
    </button>
  </>;
}
