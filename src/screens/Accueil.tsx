import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';

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

const FEATURES = [
  {
    ico: '🧠',
    titre: 'Un MJ qui juge vraiment',
    texte:
      "Le Maître du Jeu (IA Groq) évalue chacune de tes décisions selon tes stats, ta forme et le contexte. Rien n'est scripté.",
  },
  {
    ico: '📈',
    titre: 'Une progression vivante',
    texte:
      'Entraîne-toi, joue les matchs, gère ta vie : chaque action fait monter ou chuter tes attributs. Tu écris ta trajectoire.',
  },
  {
    ico: '🏆',
    titre: 'Ta légende sur 15 ans',
    texte:
      'Des espoirs au Tournoi, de la Fédérale au Top 14 : négocie tes contrats, gère la pression et vise les titres.',
  },
];

export function Accueil() {
  const setEcran = useGame((s) => s.setEcran);
  const joueur = useGame((s) => s.joueur);
  const skinActif = useGame((s) => s.skinActif);

  return (
    <>
      <section className="hero">
        <div className="hero-texte">
          <motion.div custom={0} variants={apparait} initial="hidden" animate="show" className="eyebrow">
            RPG de carrière • Rugby
          </motion.div>
          <motion.h1 custom={1} variants={apparait} initial="hidden" animate="show">
            Deviens une <span className="surligne">légende</span> du rugby
          </motion.h1>
          <motion.p custom={2} variants={apparait} initial="hidden" animate="show" className="accroche">
            Incarne un rugbyman de ses débuts jusqu'au sommet. Parle au Maître du
            Jeu, décris tes choix, et laisse l'IA juger le destin de ta carrière —
            match après match, saison après saison.
          </motion.p>
          <motion.div custom={3} variants={apparait} initial="hidden" animate="show" className="cta-groupe">
            {joueur ? (
              <>
                <button className="btn primaire grand" onClick={() => setEcran('carriere')}>
                  Reprendre ma carrière →
                </button>
                <button className="btn fantome grand" onClick={() => setEcran('profil')}>
                  Voir mon profil
                </button>
              </>
            ) : (
              <button className="btn primaire grand" onClick={() => setEcran('creation')}>
                Commencer ma carrière →
              </button>
            )}
          </motion.div>
          <motion.div custom={4} variants={apparait} initial="hidden" animate="show" className="stats-bandeau">
            <div className="stat"><b>15</b><span>postes jouables</span></div>
            <div className="stat"><b>∞</b><span>scénarios IA</span></div>
            <div className="stat"><b>15</b><span>saisons à écrire</span></div>
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
            <h3>{f.titre}</h3>
            <p>{f.texte}</p>
          </motion.div>
        ))}
      </section>
    </>
  );
}
