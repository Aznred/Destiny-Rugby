import { Suspense, lazy, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { SKINS, PACKS } from '../data/boutique';
import { t } from '../lib/i18n';

const Apercu3D = lazy(() =>
  import('../components/Hero3D').then((m) => ({ default: m.Hero3D })),
);
// ⚠️ Une vignette par article, chargée à la demande comme le grand aperçu : la
// boutique est déjà un écran paresseux, on ne veut pas que ses cinq petits
// canvas partent dans le chunk principal.
const Vignette = lazy(() =>
  import('../components/VignetteBallon').then((m) => ({ default: m.VignetteBallon })),
);

export function Boutique() {
  const coins = useGame((s) => s.coins);
  const inventaire = useGame((s) => s.inventaire);
  const skinActif = useGame((s) => s.skinActif);
  const acheterSkin = useGame((s) => s.acheterSkin);
  const choisirSkin = useGame((s) => s.choisirSkin);
  const [apercu, setApercu] = useState(skinActif);
  const [flash, setFlash] = useState<string | null>(null);

  const message = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(null), 2200);
  };

  return (
    <motion.section
      className="boutique"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="tete-boutique">
        <div>
          <div className="eyebrow">{t('bo.titre')}</div>
          <h1>{t('bo.chapo')}</h1>
        </div>
        <div className="solde">🪙 <b>{coins}</b> Ovas</div>
      </div>

      {flash && <div className="flash-boutique">{flash}</div>}

      {/* Aperçu 3D du skin sélectionné */}
      <div className="carte apercu-skin">
        <div className="apercu-canvas">
          <Suspense fallback={<div className="hero-canvas-skel" />}>
            <Apercu3D skinId={apercu} />
          </Suspense>
        </div>
        <div className="apercu-info">
          <div className="eyebrow">{t('bo.apercu')}</div>
          <h2>{SKINS.find((s) => s.id === apercu)?.nom}</h2>
          <p style={{ color: 'var(--craie-dim)' }}>
            {t('bo.apercuAide')}
          </p>
          {inventaire.includes(apercu) ? (
            skinActif === apercu ? (
              <span className="badge-cle ok">✓ {t('bo.equipe')}</span>
            ) : (
              <button className="btn primaire" onClick={() => { choisirSkin(apercu); message(t('bo.equipeMsg')); }}>
                {t('bo.equiper')}
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="eyebrow section-titre">{t('bo.ballons')}</div>
      <div className="grille-boutique">
        {SKINS.map((s) => {
          const possede = inventaire.includes(s.id);
          const equipe = skinActif === s.id;
          return (
            <div
              key={s.id}
              className={`carte article ${apercu === s.id ? 'vu' : ''}`}
              onMouseEnter={() => setApercu(s.id)}
              onClick={() => setApercu(s.id)}
            >
              {/* Le VRAI ballon, en 3D, qui tourne — plus une pastille de couleur. */}
              <Suspense fallback={
                <div className="pastille-couleur" style={{ background: `linear-gradient(135deg, ${s.corps}, ${s.bande})` }} />
              }>
                <Vignette skinId={s.id} />
              </Suspense>
              <div className="article-nom">{s.nom}</div>
              {equipe ? (
                <span className="badge-cle ok">{t('bo.equipe')}</span>
              ) : possede ? (
                <button className="btn fantome petit" onClick={(e) => { e.stopPropagation(); choisirSkin(s.id); message(t('bo.equipeMsg')); }}>
                  {t('bo.equiper')}
                </button>
              ) : (
                <button
                  className="btn primaire petit"
                  disabled={coins < s.prix}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (acheterSkin(s.id)) message(`${s.nom} débloqué et équipé !`);
                    else message(t('bo.pasAssez'));
                  }}
                >
                  🪙 {s.prix}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ⚠️ LES BOOSTS ONT ÉTÉ RETIRÉS (demande explicite). Acheter +2 à tous
          les attributs contredisait frontalement la difficulté du jeu, calibrée
          au dixième de point dans `lib/progression.ts` : on ne monte pas sa
          générale à la caisse. La boutique ne vend plus que du cosmétique. */}

      <div className="eyebrow section-titre">{t('bo.recharges')}</div>
      <p style={{ color: 'var(--brume)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
        {t('bo.demoAide')}
      </p>
      <div className="grille-boutique">
        {PACKS.map((p) => (
          <div key={p.id} className="carte article pack">
            <div className="pack-ovas">🪙 {p.ovas}</div>
            {p.bonus && <div className="pack-bonus">{p.bonus}</div>}
            <button className="btn fantome petit" disabled title="Paiement non disponible dans la démo">
              {p.prix}
            </button>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
