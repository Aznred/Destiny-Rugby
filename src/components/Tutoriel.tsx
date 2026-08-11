// LE TUTORIEL D'ACCUEIL — cinq écrans pour ne pas perdre un visiteur
//
// ⚠️ Demande explicite : « fais un tuto pour les nouveaux joueurs pour baisser
// le bounce rate ». Le problème qu'il traite est précis : quelqu'un arrive sur
// une page qui dit « Deviens une légende du rugby », ne sait pas s'il va gérer
// un club, jouer des matchs ou lire du texte — et repart. Le tutoriel répond à
// LA question qui décide de tout : « qu'est-ce que je vais faire, exactement ? »
//
// ═══ TROIS RÈGLES, ET ELLES VONT DANS LE MÊME SENS ═══════════════════════════
//
//  1. **IL NE S'OUVRE QU'UNE FOIS, ET SEULEMENT POUR UN NOUVEAU.** Pas de
//     carrière en cours, jamais vu (`tutoVu`, persisté). Un tutoriel qui revient
//     à chaque visite fait fuir précisément les gens qu'il devait retenir.
//  2. **ON PEUT PARTIR À TOUT MOMENT.** Échap, le fond, la croix, « Passer » :
//     quatre sorties. Une modale dont on ne peut pas sortir, c'est un rebond
//     garanti — et c'est la même règle que pour les pubs (`lib/pub.ts`).
//  3. **IL FINIT SUR UN BOUTON, PAS SUR UN RÉSUMÉ.** La dernière carte ouvre la
//     création de carrière. Un tutoriel qui se referme sur la page d'où l'on
//     vient n'a rien fait avancer.
//
// ⚠️ ET IL NE BLOQUE PAS LE PREMIER RENDU. Il est monté par `Accueil`, qui est
// déjà l'écran affiché : pas de chargement supplémentaire, pas de `lazy`, pas
// de canvas. Ajouter une seconde d'attente à la page d'accueil pour expliquer
// qu'il ne faut pas partir serait un contresens.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { t } from '../lib/i18n';

/** Les étapes, dans l'ordre. Chaque clé est résolue par `t()`. */
const ETAPES = [
  { emoji: '🏉', titre: 'tuto.e1.titre', texte: 'tuto.e1.texte' },
  { emoji: '👤', titre: 'tuto.e2.titre', texte: 'tuto.e2.texte' },
  { emoji: '📅', titre: 'tuto.e3.titre', texte: 'tuto.e3.texte' },
  { emoji: '✍️', titre: 'tuto.e4.titre', texte: 'tuto.e4.texte' },
  { emoji: '🏆', titre: 'tuto.e5.titre', texte: 'tuto.e5.texte' },
] as const;

export function Tutoriel() {
  const joueur = useGame((s) => s.joueur);
  const tutoVu = useGame((s) => s.tutoVu);
  const setTutoVu = useGame((s) => s.setTutoVu);
  const setEcran = useGame((s) => s.setEcran);
  // ⚠️ L'ouverture est décidée UNE FOIS, au montage. Sans ça, cliquer
  // « Commencer » marquerait `tutoVu` et démonterait la modale en plein vol.
  const [ouvert, setOuvert] = useState(() => !joueur && !tutoVu);
  const [etape, setEtape] = useState(0);

  const fermer = (): void => { setTutoVu(true); setOuvert(false); };

  useEffect(() => {
    if (!ouvert) return;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer();
      if (e.key === 'ArrowRight') setEtape((n) => Math.min(ETAPES.length - 1, n + 1));
      if (e.key === 'ArrowLeft') setEtape((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  if (!ouvert) return null;
  const derniere = etape === ETAPES.length - 1;
  const e = ETAPES[etape];

  return createPortal(
    // ⚠️ `createPortal(document.body)` obligatoire : le `backdrop-filter` des
    // `.carte` crée un bloc conteneur qui piège les `position: fixed`.
    <div className="overlay" onClick={fermer} role="presentation">
      <motion.div
        className="carte modale modale-tuto"
        role="dialog"
        aria-modal="true"
        aria-label={t('tuto.titre')}
        onClick={(ev) => ev.stopPropagation()}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <button type="button" className="tuto-fermer" onClick={fermer} aria-label={t('tuto.passer')}>✕</button>

        <div className="eyebrow">{t('tuto.titre')}</div>
        <div className="tuto-emoji" aria-hidden="true">{e.emoji}</div>
        <h2>{t(e.titre)}</h2>
        <p className="tuto-texte">{t(e.texte)}</p>

        {/* La pastille de progression : on doit voir que c'est COURT. */}
        <div className="tuto-points" aria-hidden="true">
          {ETAPES.map((_, i) => (
            <span key={i} className={i === etape ? 'actif' : i < etape ? 'fait' : ''} />
          ))}
        </div>

        <div className="tuto-actions">
          <button type="button" className="btn fantome petit" onClick={fermer}>
            {t('tuto.passer')}
          </button>
          {etape > 0 && (
            <button type="button" className="btn fantome petit" onClick={() => setEtape(etape - 1)}>
              {t('tuto.retour')}
            </button>
          )}
          {derniere ? (
            <button
              type="button"
              className="btn primaire"
              onClick={() => { setTutoVu(true); setOuvert(false); setEcran('creation'); }}
            >
              {t('tuto.creer')}
            </button>
          ) : (
            <button type="button" className="btn primaire" onClick={() => setEtape(etape + 1)}>
              {t('tuto.suivant')}
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
