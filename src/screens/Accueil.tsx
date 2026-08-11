import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { t } from '../lib/i18n';
// ⚠️ PAS DE `lazy` ICI. Le tutoriel doit être là au premier rendu de l'accueil :
// il existe pour retenir quelqu'un qui hésite à rester, une seconde d'attente
// le viderait de son sens. Il ne monte ni canvas ni modèle 3D — c'est du texte.
import { Tutoriel } from '../components/Tutoriel';

// La 3D (Three.js) est lourde : on la charge à la demande pour un premier
// affichage immédiat du texte, puis la scène apparaît en fondu.
const Hero3D = lazy(() =>
  import('../components/Hero3D').then((m) => ({ default: m.Hero3D })),
);

const apparait = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.1, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
  }),
};

// ⚠️ Les trois arguments de la page d'accueil sont des CLÉS de traduction, pas
// du texte : ils sont résolus au rendu par `t()`, donc ils changent de langue
// avec le reste. La page d'accueil était le premier écran vu par un joueur
// étranger, et elle restait entièrement en français.
const FEATURES = [
  { ico: '🧠', titre: 'acc.f1.titre', texte: 'acc.f1.texte' },
  { ico: '📈', titre: 'acc.f2.titre', texte: 'acc.f2.texte' },
  { ico: '🏆', titre: 'acc.f3.titre', texte: 'acc.f3.texte' },
];

export function Accueil() {
  const setEcran = useGame((s) => s.setEcran);
  const joueur = useGame((s) => s.joueur);
  const skinActif = useGame((s) => s.skinActif);

  return (
    <>
      {/* Il décide lui-même s'il doit s'ouvrir : jamais si une carrière existe,
          jamais deux fois (`tutoVu`, persisté). */}
      <Tutoriel />
      <section className="hero">
        <div className="hero-texte">
          <motion.div custom={0} variants={apparait} initial="hidden" animate="show" className="eyebrow">
            {t('accueil.eyebrow')}
          </motion.div>
          <motion.h1 custom={1} variants={apparait} initial="hidden" animate="show">
            {t('accueil.titre1')} <span className="surligne">{t('accueil.titre2')}</span> {t('accueil.titre3')}
          </motion.h1>
          <motion.p custom={2} variants={apparait} initial="hidden" animate="show" className="accroche">
            {t('accueil.chapo')}
          </motion.p>
          <motion.div custom={3} variants={apparait} initial="hidden" animate="show" className="cta-groupe">
            {joueur ? (
              <>
                <button className="btn primaire grand" onClick={() => setEcran('carriere')}>
                  {t('accueil.reprendre')}
                </button>
                <button className="btn fantome grand" onClick={() => setEcran('profil')}>
                  {t('accueil.voirProfil')}
                </button>
              </>
            ) : (
              <button className="btn primaire grand" onClick={() => setEcran('creation')}>
                {t('accueil.commencer')}
              </button>
            )}
          </motion.div>
          <motion.div custom={4} variants={apparait} initial="hidden" animate="show" className="stats-bandeau">
            <div className="stat"><b>15</b><span>{t('accueil.postes')}</span></div>
            <div className="stat"><b>∞</b><span>{t('accueil.scenarios')}</span></div>
            <div className="stat"><b>15</b><span>{t('accueil.saisons')}</span></div>
          </motion.div>
        </div>

        <div className="hero-canvas">
          <Suspense fallback={<div className="hero-canvas-skel" />}>
            <Hero3D skinId={skinActif} />
          </Suspense>
        </div>
      </section>

      <section className="section features">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.titre}
            className="carte feature"
            custom={i}
            variants={apparait}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            <div className="ico">{f.ico}</div>
            <h3>{t(f.titre)}</h3>
            <p>{t(f.texte)}</p>
          </motion.div>
        ))}
      </section>
    </>
  );
}
