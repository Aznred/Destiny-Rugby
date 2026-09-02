import { LIENS_SORTANTS_AUTORISES } from '../lib/cible';
import { lazy, Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { t } from '../lib/i18n';
// ⚠️ PAS DE `lazy` ICI. Le tutoriel doit être là au premier rendu de l'accueil :
// il existe pour retenir quelqu'un qui hésite à rester, une seconde d'attente
// le viderait de son sens. Il ne monte ni canvas ni modèle 3D — c'est du texte.
import { Tutoriel } from '../components/Tutoriel';
import { chantierVisible } from '../lib/modeDev';
import { Sauvegardes } from '../components/Sauvegardes';
import { Icone } from '../components/Icone';

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
  { slug: 'guide', ico: 'livre' as const, titre: 'accueil.lien.guide', desc: 'accueil.lien.guideDesc' },
  { slug: 'pyramide', ico: 'stade' as const, titre: 'accueil.lien.pyramide', desc: 'accueil.lien.pyramideDesc' },
  { slug: 'moteur', ico: 'reglages' as const, titre: 'accueil.lien.moteur', desc: 'accueil.lien.moteurDesc' },
  { slug: 'journal', ico: 'journal' as const, titre: 'accueil.lien.journal', desc: 'accueil.lien.journalDesc' },
];

const apparait = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.1, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
  }),
};

// ⚠️ LES TROIS ARGUMENTS MARKETING (« Un MJ qui juge vraiment », « Une
// progression vivante », « Ta légende sur 15 ans ») ONT ÉTÉ RETIRÉS, à la
// demande : « comprendre le jeu, ça serait bien de l'avoir à la place du MJ qui
// juge ». C'est le bon échange sous les deux angles. Pour le joueur, trois
// promesses valent moins qu'une porte d'entrée qui explique vraiment. Et pour
// l'examen AdSense, la section « Comprendre le jeu » est la seule de l'accueil
// qui MÈNE À DU CONTENU — quatre pages en HTML complet, lisibles sans
// JavaScript. La remonter, c'est mettre le contenu éditorial au-dessus de la
// ligne de flottaison plutôt que sous une pile d'arguments.
// Les clés `acc.f1…f3` restent dans le dictionnaire : elles ne coûtent rien et
// serviront si l'on veut réintroduire un argumentaire ailleurs.

export function Accueil() {
  const setEcran = useGame((s) => s.setEcran);
  const joueur = useGame((s) => s.joueur);
  const manager = useGame((s) => s.manager);
  const managerVisible = chantierVisible('manager');
  const managerActif = managerVisible ? manager : null;
  const skinActif = useGame((s) => s.skinActif);
  const [partiesOuvertes, setPartiesOuvertes] = useState(false);

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
            ) : managerActif ? (
              // ⚠️ UNE CARRIÈRE D’ENTRAÎNEUR OCCUPE LA MÊME PLACE QU’UNE
              //    CARRIÈRE DE JOUEUR, et jamais les deux en même temps :
              //    `creerManager` met `joueur` à null. Sans cette branche,
              //    l’accueil proposait « commencer » à quelqu’un qui a déjà
              //    un banc, et sa carrière devenait introuvable.
              <>
                <button className="btn primaire grand" onClick={() => setEcran('manager')}>
                  <Icone nom="entraineur" taille={20} /> Reprendre mon banc
                </button>
                <button className="btn fantome grand" onClick={() => setEcran('tableau')}>
                  {t('accueil.voirProfil')}
                </button>
              </>
            ) : (
              <>
                {/* ⚠️ LE CHOIX DU MODE A DÉMÉNAGÉ DANS L'ÉCRAN DE CRÉATION.
                    Deux boutons côte à côte sur l'accueil, ce n'était pas un
                    choix : c'était deux portes sans description, dont l'une
                    engageait quinze saisons d'un mode qu'on n'avait jamais vu.
                    « Commencer » ouvre maintenant une page qui POSE la
                    question et décrit les deux carrières (`screens/Creation`).

                    ⚠️ Et le chantier reste fermé côté joueur ordinaire : le
                    choix ne s'affiche que si `chantierVisible('manager')`,
                    exactement comme le bouton qu'il remplace. */}
                <button className="btn primaire grand" onClick={() => setEcran('creation')}>
                  {managerVisible ? t('accueil.commencerChoix') : t('accueil.commencer')}
                </button>
              </>
            )}
          </motion.div>
          <motion.div custom={4} variants={apparait} initial="hidden" animate="show" className="stats-bandeau">
            <div className="stat"><b>15</b><span>{t('accueil.postes')}</span></div>
            <div className="stat"><b>∞</b><span>{t('accueil.scenarios')}</span></div>
            <div className="stat"><b>15</b><span>{t('accueil.saisons')}</span></div>
          </motion.div>

          {/* ⚠️ LA PORTE DES PARTIES EST SUR L'ACCUEIL, ET NULLE PART AILLEURS.
              C'est le seul écran qu'on voit avant d'avoir une carrière, donc le
              seul endroit d'où l'on puisse en ouvrir une autre. La ranger dans
              ⚙️ Réglages l'aurait mise derrière la partie en cours — c'est-à-dire
              exactement là où on ne la cherche pas. */}
          <motion.button
            custom={5}
            variants={apparait}
            initial="hidden"
            animate="show"
            type="button"
            className="btn fantome accueil-parties"
            onClick={() => setPartiesOuvertes((v) => !v)}
            aria-expanded={partiesOuvertes}
          >
            <Icone nom="disquette" taille={17} /> {t('sv.mesParties')}
          </motion.button>
        </div>

        <div className="hero-canvas">
          <Suspense fallback={<div className="hero-canvas-skel" />}>
            <Hero3D skinId={skinActif} />
          </Suspense>
        </div>
      </section>

      {partiesOuvertes && (
        <section className="section accueil-sauvegardes">
          <Sauvegardes onFermer={() => setPartiesOuvertes(false)} />
        </section>
      )}

      {/* ⚠️ DE VRAIS LIENS, PAS DES BOUTONS. Ces quatre pages sont du HTML
          statique servi depuis `public/` (voir `scripts/genPages.cjs`) : elles
          existent à leur propre adresse, elles se lisent sans JavaScript, et
          elles portent le contenu éditorial du site. Un `<a href>` est donc
          indispensable — un `onClick` ne crée aucun lien pour un moteur de
          recherche, et c'est précisément l'absence de pages indexables qui a
          fait bloquer le compte AdSense. */}
      {/* ⚠️ RIEN DE TOUT ÇA SUR LE PORTAIL. « The game should not include
          cross-promotions for external or internal games/platforms » : dans une
          iframe, un clic ici REMPLACERAIT le jeu par un article, et l'équipe de
          QA refuse. Ces pages gardent tout leur sens sur destiny-rugby.fr, où
          elles portent le référencement — les deux cibles cohabitent. */}
      {LIENS_SORTANTS_AUTORISES && (
      <section className="section lecture">
        <h2>{t('accueil.lecture')}</h2>
        <p className="lecture-chapo">{t('accueil.lectureChapo')}</p>
        <div className="lecture-liens">
          {PAGES_CONTENU.map((p, i) => (
            <motion.a
              className="carte lecture-lien"
              key={p.slug}
              href={`/${p.slug}/`}
              custom={i}
              variants={apparait}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
            >
              <span className="ico"><Icone nom={p.ico} taille={26} /></span>
              <b>{t(p.titre)}</b>
              <span className="lecture-desc">{t(p.desc)}</span>
            </motion.a>
          ))}
        </div>
      </section>
      )}
    </>
  );
}
