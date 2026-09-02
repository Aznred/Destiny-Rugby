// LE GUIDE DE CARRIÈRE — une pastille, un panneau, aucune main mise sur le jeu
//
// ⚠️ Retour de joueurs : « au début on ne comprend pas trop comment ça marche,
// les transferts notamment ». Le tutoriel d'accueil explique le JEU avant de
// créer un joueur ; il ne dit pas où cliquer une fois qu'on y est.
//
// ⚠️ CE N'EST PAS UN TUTORIEL SCRIPTÉ, et c'est un choix. Rien n'est bloqué,
// rien n'est forcé, aucun ordre n'est imposé : chaque étape est un prédicat sur
// l'état de la partie (`data/guide.ts`) et se coche toute seule quand la chose
// est faite, que le joueur soit passé par le guide ou non. Un tutoriel qui prend
// la main casse exactement ce qu'il prétend apprendre.
//
// ⚠️ LA PASTILLE VIT DANS UN PORTAL. Le `backdrop-filter` des `.carte` crée un
// bloc conteneur qui piège les `position: fixed` — la même leçon que
// `Confirmation`, `FicheClub` et la barre d'action mobile.

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { t } from '../lib/i18n';
import {
  CHAPITRES, ETAPES_GUIDE, avancement, etapeCourante, type ContexteGuide,
} from '../data/guide';
import { Icone } from './Icone';

export function Guide() {
  const joueur = useGame((s) => s.joueur);
  const ecran = useGame((s) => s.ecran);
  const ecransVus = useGame((s) => s.ecransVus);
  const approches = useGame((s) => s.approches);
  const evenementsVus = useGame((s) => s.evenementsVus);
  const guideFerme = useGame((s) => s.guideFerme);
  const fermerGuide = useGame((s) => s.fermerGuide);
  const setEcran = useGame((s) => s.setEcran);
  const [ouvert, setOuvert] = useState(false);

  const contexte: ContexteGuide = useMemo(() => ({
    joueur,
    ecransVus,
    approches: approches.length,
    scenesVues: evenementsVus.length,
  }), [joueur, ecransVus, approches, evenementsVus]);

  const courante = etapeCourante(contexte);
  const { faites, total } = avancement(contexte);

  useEffect(() => {
    if (!ouvert) return;
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [ouvert]);

  // ⚠️ PAS DE GUIDE SANS CARRIÈRE, ni pendant la création. Il répond à « je
  // clique où maintenant ? » : avant d'avoir un joueur, la question ne se pose
  // pas, et l'accueil a déjà son tutoriel.
  if (!joueur || guideFerme || ecran === 'accueil' || ecran === 'creation') return null;

  return createPortal(
    <>
      {!ouvert && (
        <motion.button
          type="button"
          className="guide-pastille"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setOuvert(true)}
          aria-label={t('guide.ouvrir')}
        >
          <span className="guide-jauge"><Icone nom="formation" taille={14} /> {faites}/{total}</span>
          {/* ⚠️ L'ÉTAPE EN COURS EST ÉCRITE SUR LA PASTILLE, pas cachée derrière
              un clic : sinon il faut déjà savoir qu'on a besoin d'aide pour
              aller la chercher. Elle passe en icône seule sous 560 px. */}
          {courante && <span className="guide-etape">{courante.emoji} {t(`guide.${courante.id}.titre`)}</span>}
        </motion.button>
      )}

      <AnimatePresence>
        {ouvert && (
          <motion.div
            className="guide-fond"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOuvert(false)}
          >
            <motion.section
              className="guide-panneau"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="guide-tete">
                <div>
                  <div className="eyebrow">{t('guide.titre')}</div>
                  <h2>{t('guide.chapo')}</h2>
                </div>
                <button
                  type="button"
                  className="guide-fermer"
                  onClick={() => setOuvert(false)}
                  aria-label={t('clst.fermer')}
                >
                  <Icone nom="croix" taille={17} />
                </button>
              </header>

              <div className="guide-progression">
                <div className="guide-barre"><span style={{ width: `${(faites / total) * 100}%` }} /></div>
                <b>{faites}/{total}</b>
              </div>

              {CHAPITRES.map((ch) => (
                <div className="guide-chapitre" key={ch.id}>
                  <div className="guide-chapitre-titre">{ch.emoji} {t(`guide.ch.${ch.id}`)}</div>
                  {ETAPES_GUIDE.filter((e) => e.chapitre === ch.id).map((e) => {
                    const ok = e.fait(contexte);
                    const active = courante?.id === e.id;
                    return (
                      <div
                        key={e.id}
                        className={`guide-etape-ligne${ok ? ' faite' : ''}${active ? ' active' : ''}`}
                      >
                        <span className="guide-coche">{ok ? <Icone nom="check" taille={14} /> : e.emoji}</span>
                        <div>
                          <b>{t(`guide.${e.id}.titre`)}</b>
                          {/* ⚠️ LE TEXTE EST TOUJOURS LISIBLE, même sur une étape
                              qui ne se cochera que dans deux saisons. Le
                              chapitre des transferts n'existe que pour ça. */}
                          <p>{t(`guide.${e.id}.texte`)}</p>
                          {!ok && e.ecran && e.ecran !== ecran && (
                            <button
                              type="button"
                              className="btn fantome petit"
                              onClick={() => { setEcran(e.ecran!); setOuvert(false); }}
                            >
                              {t('guide.yAller')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              <footer className="guide-pied">
                <button type="button" className="btn fantome petit" onClick={fermerGuide}>
                  {t('guide.masquer')}
                </button>
                <span className="guide-note">{t('guide.note')}</span>
              </footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
