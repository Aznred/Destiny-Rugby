import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { t, nombre } from '../lib/i18n';
import { useGame, palmaresDepuisLibelles } from '../store/useGame';
import { POSTE_PAR_ID, migrerPoste, nomPoste } from '../data/rugby';
import { Drapeau, nomNationTraduit } from '../components/Drapeau';
import type { TitreGagne } from '../types';
import { titreTraduit } from '../data/trophees';

// ⚠️ CHARGÉE À LA DEMANDE. L'armoire tire tout Three.js ET un modèle 3D par
// trophée : la mettre en import direct la ferait entrer dans le chunk du Hall,
// que l'on ouvre parfois juste pour lire un classement.
const ArmoireTrophees = lazy(() =>
  import('../components/ArmoireTrophees').then((m) => ({ default: m.ArmoireTrophees })),
);

// Ce qu'on ouvre dans l'armoire : un nom et un palmarès.
interface Vitrine {
  nom: string;
  palmares: TitreGagne[];
}

export function Pantheon() {
  const pantheon = useGame((s) => s.pantheon);
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);

  const legendes = [...pantheon].sort((a, b) => b.score - a.score);

  // ⚠️ DEUX SOURCES, ET C'EST NORMAL. La carrière en cours porte un palmarès
  // STRUCTURÉ (`Joueur.palmares` : id de trophée, saison, club). Les légendes
  // du Panthéon, elles, ne gardent que des libellés (« Bouclier de Brennus
  // (S4) ») — on les reconvertit en trophées à l'ouverture.
  const monPalmares = joueur
    ? (joueur.palmares ?? palmaresDepuisLibelles(joueur.titres ?? []))
    : [];

  return (
    <motion.section
      className="pantheon"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="eyebrow">{t('hall.eyebrow')}</div>
      <h1 className="titre-pantheon">🏛️ {t('hall.titrePantheon')}</h1>
      <p style={{ color: 'var(--craie-dim)', maxWidth: '62ch', margin: '0.6rem 0 1.4rem' }}>
        {t('hall.chapo')}
      </p>

      {/* L'armoire de la carrière EN COURS : le joueur veut voir SA vitrine
          avant celle des autres, même s'il n'a pas encore raccroché. */}
      {joueur && (
        <button
          className="btn primaire armoire-bouton"
          onClick={() => setVitrine({ nom: joueur.nom, palmares: monPalmares })}
        >
          {t('arm.ouvrir')}
          <em>{t('arm.maCarriere')} — {t('arm.total', { n: monPalmares.length, distincts: new Set(monPalmares.map((p) => p.trophee)).size })}</em>
        </button>
      )}

      {legendes.length === 0 ? (
        <div className="carte vide-pantheon">
          <div style={{ fontSize: '2.4rem' }}>🏉</div>
          <h2>{t('hall.vide')}</h2>
          <p style={{ color: 'var(--craie-dim)' }}>{t('hall.videAide')}</p>
          {joueur ? (
            <button className="btn primaire" onClick={() => setEcran('carriere')}>
              {t('accueil.reprendre')}
            </button>
          ) : (
            <button className="btn primaire" onClick={() => setEcran('creation')}>
              {t('clst.commencer')}
            </button>
          )}
        </div>
      ) : (
        <div className="grille-legendes">
          {legendes.map((l, i) => (
            <motion.div
              key={l.id}
              className="carte legende"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="legende-rang">#{i + 1}</div>
              <div className="legende-avatar">
                {POSTE_PAR_ID[migrerPoste(l.poste)].categorie === 'Avant' ? '🛡️' : '⚡'}
              </div>
              <div style={{ flex: 1 }}>
                <div className="legende-nom">{l.nom}</div>
                <div className="legende-sous" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {nomPoste(migrerPoste(l.poste))} · <Drapeau nation={l.nation} taille={0.75} /> {nomNationTraduit(l.nation)} · {l.saisons} {t('clst.saisons').toLowerCase()}
                </div>
                <div className="legende-stats">
                  <span>{t('clst.note')} <b>{l.note}</b></span>
                  <span>🎯 <b>{l.essais}</b></span>
                  <span>🏉 <b>{l.matchsJoues}</b></span>
                  <span>⭐ <b>{l.reputation}</b></span>
                </div>
                {(l.titres ?? []).length > 0 && (
                  <>
                    <div className="legende-titres">
                      {(l.titres ?? []).map((titre, j) => (
                        <span key={j} className="medaille">🏆 {titreTraduit(titre)}</span>
                      ))}
                    </div>
                    <button
                      className="btn fantome legende-armoire"
                      onClick={() => setVitrine({ nom: l.nom, palmares: palmaresDepuisLibelles(l.titres ?? []) })}
                    >
                      {t('arm.voir')}
                    </button>
                  </>
                )}
              </div>
              <div className="legende-score">
                <b>{nombre(l.score ?? 0)}</b>
                <span>{t('hall.points')}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <button className="btn fantome" onClick={() => setEcran('classement')}>
          {t('hall.versClassement')}
        </button>
      </div>

      <AnimatePresence>
        {vitrine && (
          <Suspense fallback={null}>
            <ArmoireTrophees
              nom={vitrine.nom}
              palmares={vitrine.palmares}
              onFermer={() => setVitrine(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
