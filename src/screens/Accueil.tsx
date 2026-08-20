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

/**
 * Les pages de contenu du site, en HTML statique.
 * ⚠️ La liste est recopiée ici À LA MAIN, et c'est assumé : `scripts/genPages.cjs`
 * tourne à la construction (Node, CommonJS) et le jeu à l'exécution (navigateur,
 * ESM). Les faire partager un module obligerait à embarquer tout le texte des
 * quatre pages dans le bundle — plusieurs dizaines de kilo-octets pour afficher
 * quatre liens.
 */
const PAGES_CONTENU = [
  { slug: 'guide', ico: '📘', titre: 'accueil.lien.guide', desc: 'accueil.lien.guideDesc' },
  { slug: 'pyramide', ico: '🏟️', titre: 'accueil.lien.pyramide', desc: 'accueil.lien.pyramideDesc' },
  { slug: 'moteur', ico: '⚙️', titre: 'accueil.lien.moteur', desc: 'accueil.lien.moteurDesc' },
  { slug: 'journal', ico: '📝', titre: 'accueil.lien.journal', desc: 'accueil.lien.journalDesc' },
];

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

      {/* ⚠️ DE VRAIS LIENS, PAS DES BOUTONS. Ces quatre pages sont du HTML
          statique servi depuis `public/` (voir `scripts/genPages.cjs`) : elles
          existent à leur propre adresse, elles se lisent sans JavaScript, et
          elles portent le contenu éditorial du site. Un `<a href>` est donc
          indispensable — un `onClick` ne crée aucun lien pour un moteur de
          recherche, et c'est précisément l'absence de pages indexables qui a
          fait bloquer le compte AdSense. */}
      <section className="section lecture">
        <h2>{t('accueil.lecture')}</h2>
        <p className="lecture-chapo">{t('accueil.lectureChapo')}</p>
        <div className="lecture-liens">
          {PAGES_CONTENU.map((p) => (
            <a className="carte lecture-lien" key={p.slug} href={`/${p.slug}/`}>
              <span className="ico">{p.ico}</span>
              <b>{t(p.titre)}</b>
              <span className="lecture-desc">{t(p.desc)}</span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
