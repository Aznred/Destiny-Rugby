import { LIENS_SORTANTS_AUTORISES } from '../lib/cible';
import { lazy, Suspense, useEffect, useState } from 'react';
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
const PacksEventailAccueil = lazy(() =>
  import('../components/PacksEventailAccueil').then((m) => ({ default: m.PacksEventailAccueil })),
);

/**
 * Les pages de contenu du site, en HTML statique.
 * ⚠️ La liste est recopiée ici À LA MAIN, et c'est assumé : `scripts/genPages.cjs`
 * tourne à la construction (Node, CommonJS) et le jeu à l'exécution (navigateur,
 * ESM). Les faire partager un module obligerait à embarquer tout le texte des
 * les pages dans le bundle — plusieurs dizaines de kilo-octets pour afficher
 * quelques liens.
 */
const PAGES_CONTENU = [
  { slug: 'wiki', ico: 'livre' as const, titre: 'accueil.lien.wiki', desc: 'accueil.lien.wikiDesc' },
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
// qui MÈNE À DU CONTENU — des pages en HTML complet, lisibles sans
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
  const [interfacePC, setInterfacePC] = useState(() => window.matchMedia('(min-width: 901px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)');
    const changer = () => setInterfacePC(media.matches);
    media.addEventListener('change', changer);
    return () => media.removeEventListener('change', changer);
  }, []);
  const destinationCarriere = joueur ? 'carriere' : managerActif ? 'manager' : 'creation';
  const titreCarriere = joueur
    ? t('accueil.reprendre')
    : managerActif ? 'Reprendre mon banc' : (managerVisible ? t('accueil.commencerChoix') : t('accueil.commencer'));
  const detailCarriere = joueur
    ? `${joueur.nom} · poursuis ta légende`
    : managerActif ? `${managerActif.nom} · retrouve ton vestiaire` : 'Joueur ou entraîneur · bâtis ta carrière sur 15 saisons';

  return (
    <>
      {/* Il décide lui-même s'il doit s'ouvrir : jamais si une carrière existe,
          jamais deux fois (`tutoVu`, persisté). */}
      <Tutoriel />
      {interfacePC ? <section className="accueil-hub">
        <motion.header custom={0} variants={apparait} initial="hidden" animate="show" className="accueil-hub-tete">
          <div><span className="eyebrow">{t('accueil.eyebrow')}</span><h1>Choisis ton <em>terrain</em></h1></div>
          <p>{t('accueil.chapo')}</p>
        </motion.header>

        <div className="accueil-modes" aria-label="Modes de jeu">
          <motion.button custom={1} variants={apparait} initial="hidden" animate="show" type="button" className="accueil-mode accueil-mode-carriere" onClick={() => setEcran(destinationCarriere)}>
            <div className="accueil-mode-visuel" aria-hidden="true">
              <Suspense fallback={<div className="hero-canvas-skel" />}><Hero3D skinId={skinActif} /></Suspense>
            </div>
            <span className="accueil-mode-numero">01</span>
            <span className="accueil-mode-contenu">
              <span className="accueil-mode-surtitre">Carrière solo</span>
              <strong>{titreCarriere}</strong>
              <small>{detailCarriere}</small>
              <span className="accueil-mode-badges"><i>Joueur</i><i>Entraîneur</i><i>15 saisons</i></span>
            </span>
            <span className="accueil-mode-fleche"><Icone nom="fleche-droite" taille={22} /></span>
          </motion.button>

          <div className="accueil-modes-droite">
            <motion.button custom={2} variants={apparait} initial="hidden" animate="show" type="button" className="accueil-mode accueil-mode-online" onClick={() => setEcran('carriereEnLigne')}>
              <img className="accueil-mode-illustration" src="/images/menu/carriere-en-ligne.webp" alt="" decoding="async" />
              <span className="accueil-mode-numero">02</span>
              <span className="accueil-mode-icone"><Icone nom="equipe" taille={31} /></span>
              <span className="accueil-mode-contenu"><span className="accueil-mode-surtitre">Multijoueur</span><strong>Carrière en ligne</strong><small>Crée ta ligue privée, invite tes amis et vis les matchs en direct.</small></span>
              <span className="accueil-mode-fleche"><Icone nom="fleche-droite" taille={20} /></span>
            </motion.button>

            <div className="accueil-modes-compacts">
              <motion.button custom={3} variants={apparait} initial="hidden" animate="show" type="button" className="accueil-mode accueil-mode-collection" onClick={() => setEcran('collectionSolo')}>
                <span className="accueil-packs-eventail" aria-hidden="true"><Suspense fallback={null}><PacksEventailAccueil /></Suspense></span>
                <span className="accueil-mode-numero">03</span>
                <span className="accueil-mode-icone"><Icone nom="cadeau" taille={27} /></span>
                <span className="accueil-mode-contenu"><span className="accueil-mode-surtitre">Club house</span><strong>Collection</strong><small>Packs, cartes et doublons.</small></span>
                <span className="accueil-mode-fleche"><Icone nom="fleche-droite" taille={18} /></span>
              </motion.button>
              <motion.button custom={4} variants={apparait} initial="hidden" animate="show" type="button" className="accueil-mode accueil-mode-parties" onClick={() => setPartiesOuvertes((v) => !v)} aria-expanded={partiesOuvertes}>
                <img className="accueil-mode-illustration" src="/images/menu/sauvegardes.webp" alt="" decoding="async" />
                <span className="accueil-mode-numero">04</span>
                <span className="accueil-mode-icone"><Icone nom="disquette" taille={27} /></span>
                <span className="accueil-mode-contenu"><span className="accueil-mode-surtitre">Profils</span><strong>{t('sv.mesParties')}</strong><small>Retrouve ou change de sauvegarde.</small></span>
                <span className="accueil-mode-fleche"><Icone nom="fleche-droite" taille={18} /></span>
              </motion.button>
            </div>
          </div>
        </div>

        <motion.div custom={5} variants={apparait} initial="hidden" animate="show" className="accueil-hub-pied">
          <span><b>15</b> postes</span><span><b>∞</b> scénarios</span><span><b>15</b> saisons</span>
          {joueur && <button type="button" onClick={() => setEcran('profil')}><Icone nom="profil" taille={16} /> {t('accueil.voirProfil')}</button>}
          {managerActif && <button type="button" onClick={() => setEcran('tableau')}><Icone nom="resultats" taille={16} /> Tableau du club</button>}
        </motion.div>
      </section> : <section className="hero">
        <div className="hero-texte">
          <div className="eyebrow">{t('accueil.eyebrow')}</div>
          <h1>{t('accueil.titre1')} <span className="surligne">{t('accueil.titre2')}</span> {t('accueil.titre3')}</h1>
          <p className="accroche">{t('accueil.chapo')}</p>
          <div className="cta-groupe">
            <button className="btn primaire grand" onClick={() => setEcran(destinationCarriere)}>{titreCarriere}</button>
            {joueur && <button className="btn fantome grand" onClick={() => setEcran('profil')}>{t('accueil.voirProfil')}</button>}
            {managerActif && <button className="btn fantome grand" onClick={() => setEcran('tableau')}>{t('accueil.voirProfil')}</button>}
          </div>
          <div className="accueil-modes-secondaires">
            <button className="btn fantome accueil-en-ligne" onClick={() => setEcran('carriereEnLigne')}><Icone nom="equipe" taille={19} /> Carrière en ligne · Ma ligue privée</button>
            <button className="btn fantome accueil-en-ligne" onClick={() => setEcran('collectionSolo')}><Icone nom="cadeau" taille={19} /> Collection · Packs et doublons</button>
          </div>
          <div className="stats-bandeau"><div className="stat"><b>15</b><span>{t('accueil.postes')}</span></div><div className="stat"><b>∞</b><span>{t('accueil.scenarios')}</span></div><div className="stat"><b>15</b><span>{t('accueil.saisons')}</span></div></div>
          <button type="button" className="btn fantome accueil-parties" onClick={() => setPartiesOuvertes((v) => !v)} aria-expanded={partiesOuvertes}><Icone nom="disquette" taille={17} /> {t('sv.mesParties')}</button>
        </div>
        <div className="hero-canvas"><Suspense fallback={<div className="hero-canvas-skel" />}><Hero3D skinId={skinActif} /></Suspense></div>
      </section>}

      {partiesOuvertes && (
        <section className="section accueil-sauvegardes">
          <Sauvegardes onFermer={() => setPartiesOuvertes(false)} />
        </section>
      )}

      {/* ⚠️ DE VRAIS LIENS, PAS DES BOUTONS. Ces pages sont du HTML
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
