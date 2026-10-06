import { LIENS_SORTANTS_AUTORISES } from '../lib/cible';
import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { texteTraduit, t } from '../lib/i18n';
// ⚠️ PAS DE `lazy` ICI. Le tutoriel doit être là au premier rendu de l'accueil :
// il existe pour retenir quelqu'un qui hésite à rester, une seconde d'attente
// le viderait de son sens. Il ne monte ni canvas ni modèle 3D — c'est du texte.
import { chantierVisible } from '../lib/modeDev';
import { Sauvegardes } from '../components/Sauvegardes';
import { Icone } from '../components/Icone';
import { EcussonClub } from '../components/EcussonClub';
import { PieceOvas } from '../components/PieceOvas';
import { useModalDialog } from '../lib/useModalDialog';

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

function FenetreParties({ onFermer }: { onFermer: () => void }) {
  const { overlayRef, dialogRef } = useModalDialog(onFermer);

  return createPortal(
    <div className="overlay sv-overlay" ref={overlayRef} onClick={onFermer}>
      <div
        className="sv-modale"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('sv.titre')}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <Sauvegardes onFermer={onFermer} />
      </div>
    </div>,
    document.body,
  );
}

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
      {interfacePC ? <section className="accueil-hub">
        <motion.header custom={0} variants={apparait} initial="hidden" animate="show" className="accueil-hub-tete">
          <div><span className="eyebrow">{t('accueil.eyebrow')}</span><h1>{t("ui.3990dc966295")}<em>{t("ml.terrain")}</em></h1></div>
          <p>{t('accueil.chapo')}</p>
        </motion.header>

        <div className="accueil-modes" aria-label={t("ui.4e7eb38b54fe")}>
          <motion.button custom={1} variants={apparait} initial="hidden" animate="show" type="button" className="accueil-mode accueil-mode-online" onClick={() => setEcran('carriereEnLigne')}>
            <span className="accueil-online-montage" aria-hidden="true">
              <span className="accueil-online-terrain"><i /><i /><i /></span>
              <span className="accueil-online-club domicile"><EcussonClub logo="/logos/toulouse.png" taille={58} /></span>
              <span className="accueil-online-score"><i>{t('ui.directCourt')}</i><b>17 <em>–</em> 14</b><small>63′</small></span>
              <span className="accueil-online-club exterieur"><EcussonClub logo="/logos/bordeaux.png" taille={58} /></span>
              <span className="accueil-online-public"><i /><i /><i /><i /><i /></span>
            </span>
            <span className="accueil-mode-numero">01</span>
            <span className="accueil-mode-icone"><Icone nom="equipe" taille={31} /></span>
            <span className="accueil-online-enseigne" aria-hidden="true">{t("online.title")}</span>
            <span className="accueil-mode-contenu"><span className="accueil-mode-surtitre">{t("ui.07b0fc1ff5b8")}</span><strong>{t("online.title")}</strong><small>{t("ui.e7e1885be618")}</small></span>
            <span className="accueil-mode-fleche"><Icone nom="fleche-droite" taille={22} /></span>
          </motion.button>

          <div className="accueil-modes-droite">
            <motion.button custom={2} variants={apparait} initial="hidden" animate="show" type="button" className="accueil-mode accueil-mode-carriere" onClick={() => setEcran(destinationCarriere)}>
              <span className="accueil-mode-visuel" aria-hidden="true"><Suspense fallback={<span className="hero-canvas-skel" />}><Hero3D skinId={skinActif} /></Suspense></span>
              <span className="accueil-mode-numero">02</span>
              <span className="accueil-mode-contenu"><span className="accueil-mode-surtitre">{t("ui.791af388c7f3")}</span><strong>{titreCarriere}</strong><small>{detailCarriere}</small><span className="accueil-mode-badges"><i>{t("ml.joueur")}</i><i>{t("cr.modeEntraineur")}</i><i>{t("ui.43b5ebe0a46e")}</i></span></span>
              <span className="accueil-mode-fleche"><Icone nom="fleche-droite" taille={20} /></span>
            </motion.button>

            <div className="accueil-modes-compacts">
              <motion.button custom={3} variants={apparait} initial="hidden" animate="show" type="button" className="accueil-mode accueil-mode-boutique" onClick={() => setEcran('boutique')}>
                <span className="accueil-boutique-montage" aria-hidden="true"><PieceOvas taille={54} /><PieceOvas taille={38} /><PieceOvas taille={28} /></span>
                <span className="accueil-mode-numero">03</span>
                <span className="accueil-mode-icone"><Icone nom="boutique" taille={27} /></span>
                <span className="accueil-mode-contenu"><span className="accueil-mode-surtitre">{t("bo.titre")}</span><strong>{t("ui.249f85b35ca5")}</strong><small>{t("ui.94e5627a1ac0")}</small></span>
                <span className="accueil-mode-fleche"><Icone nom="fleche-droite" taille={18} /></span>
              </motion.button>
              <motion.button custom={4} variants={apparait} initial="hidden" animate="show" type="button" className="accueil-mode accueil-mode-collection" onClick={() => setEcran('collectionSolo')}>
                <span className="accueil-packs-eventail" aria-hidden="true"><Suspense fallback={null}><PacksEventailAccueil /></Suspense></span>
                <span className="accueil-mode-numero">04</span>
                <span className="accueil-mode-icone"><Icone nom="cadeau" taille={27} /></span>
                <span className="accueil-mode-contenu"><span className="accueil-mode-surtitre">{t("ui.be2da8643671")}</span><strong>{t("solo.status")}</strong><small>{t("ui.d44e175de687")}</small></span>
                <span className="accueil-mode-fleche"><Icone nom="fleche-droite" taille={18} /></span>
              </motion.button>
              <motion.button custom={5} variants={apparait} initial="hidden" animate="show" type="button" className="accueil-mode accueil-mode-parties" onClick={() => setPartiesOuvertes((v) => !v)} aria-expanded={partiesOuvertes}>
                <span className="accueil-saves-montage" aria-hidden="true">
                  <span className="accueil-save-carte save-arriere"><Icone nom="equipe" taille={15} /><span><small>{t("ui.7799a276ccda")}</small><b>{t("ui.895fbf3cb144")}</b></span><EcussonClub logo="/logos/bayonne.png" taille={27} /></span>
                  <span className="accueil-save-carte save-milieu"><Icone nom="entraineur" taille={15} /><span><small>{t("ui.f3f369bdba22")}</small><b>{managerActif?.nom ?? t("ui.9aceaef88ff5")}</b></span><EcussonClub logo="/logos/bordeaux.png" taille={27} /></span>
                  <span className="accueil-save-carte save-devant"><Icone nom="joueur" taille={15} /><span><small>{t("ui.54365b371014", { v0: joueur?.saison ?? '—' })}</small><b>{joueur?.nom ?? t("sv.nouvelle")}</b></span><EcussonClub logo="/logos/toulouse.png" taille={27} /></span>
                </span>
                <span className="accueil-mode-numero">05</span>
                <span className="accueil-mode-icone"><Icone nom="disquette" taille={27} /></span>
                <span className="accueil-mode-contenu"><span className="accueil-mode-surtitre">{t("ui.45ed18718f8b")}</span><strong>{t('sv.mesParties')}</strong><small>{t("ui.46a1d3dbcde6")}</small></span>
                <span className="accueil-mode-fleche"><Icone nom="fleche-droite" taille={18} /></span>
              </motion.button>
            </div>
          </div>
        </div>

        <motion.div custom={6} variants={apparait} initial="hidden" animate="show" className="accueil-hub-pied">
          <span><b>15</b>{t("ui.7853a94e30b2")}</span><span><b>∞</b>{t("ui.442cbf6549f5")}</span><span><b>15</b>{t("nego.saisons")}</span>
          {joueur && <button type="button" onClick={() => setEcran('profil')}><Icone nom="profil" taille={16} /> {t('accueil.voirProfil')}</button>}
          {managerActif && <button type="button" onClick={() => setEcran('tableau')}><Icone nom="resultats" taille={16} />{t("ui.82a16c0c1ce1")}</button>}
        </motion.div>
      </section> : <section className="hero">
        <div className="hero-texte">
          <div className="eyebrow">{t('accueil.eyebrow')}</div>
          <h1>{t('accueil.titre1')} <span className="surligne">{t('accueil.titre2')}</span> {t('accueil.titre3')}</h1>
          <p className="accroche">{t('accueil.chapo')}</p>
          <div className="cta-groupe">
            <button className="btn primaire grand" onClick={() => setEcran('carriereEnLigne')}><Icone nom="equipe" taille={19} />{t("online.title")}</button>
            {joueur && <button className="btn fantome grand" onClick={() => setEcran('profil')}>{t('accueil.voirProfil')}</button>}
            {managerActif && <button className="btn fantome grand" onClick={() => setEcran('tableau')}>{t('accueil.voirProfil')}</button>}
          </div>
          <div className="accueil-modes-secondaires">
            <button className="btn fantome accueil-en-ligne" onClick={() => setEcran(destinationCarriere)}><Icone nom="joueur" taille={19} />{t("ui.5b4019626c8d", { v0: titreCarriere })}</button>
            <button className="btn fantome accueil-en-ligne" onClick={() => setEcran('collectionSolo')}><Icone nom="cadeau" taille={19} />{t("ui.3ca32e49765f")}</button>
            <button className="btn fantome accueil-en-ligne" onClick={() => setEcran('boutique')}><Icone nom="boutique" taille={19} />{t("ui.572a4cfbd1c3")}</button>
          </div>
          <div className="stats-bandeau"><div className="stat"><b>15</b><span>{t('accueil.postes')}</span></div><div className="stat"><b>∞</b><span>{t('accueil.scenarios')}</span></div><div className="stat"><b>15</b><span>{t('accueil.saisons')}</span></div></div>
          <button type="button" className="btn fantome accueil-parties" onClick={() => setPartiesOuvertes((v) => !v)} aria-expanded={partiesOuvertes}><Icone nom="disquette" taille={17} /> {t('sv.mesParties')}</button>
        </div>
        <div className="hero-canvas"><Suspense fallback={<div className="hero-canvas-skel" />}><Hero3D skinId={skinActif} /></Suspense></div>
      </section>}

      <div style={{ margin: '16px 0', textAlign: 'center' }}>
        <a className="btn fantome" href="/rn26/index.html"><Icone nom="stade" taille={18} />{t("ui.686f615696b4")}</a>
      </div>
      {partiesOuvertes && <FenetreParties onFermer={() => setPartiesOuvertes(false)} />}

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
              <b>{t(texteTraduit(p.titre))}</b>
              <span className="lecture-desc">{t(p.desc)}</span>
            </motion.a>
          ))}
        </div>
      </section>
      )}
    </>
  );
}
