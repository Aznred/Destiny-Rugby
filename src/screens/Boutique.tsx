import { Suspense, lazy, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { SKINS, BOOSTS, PACKS } from '../data/boutique';

const Apercu3D = lazy(() =>
  import('../components/Hero3D').then((m) => ({ default: m.Hero3D })),
);

export function Boutique() {
  const coins = useGame((s) => s.coins);
  const inventaire = useGame((s) => s.inventaire);
  const skinActif = useGame((s) => s.skinActif);
  const joueur = useGame((s) => s.joueur);
  const acheterSkin = useGame((s) => s.acheterSkin);
  const choisirSkin = useGame((s) => s.choisirSkin);
  const acheterBoost = useGame((s) => s.acheterBoost);
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
          <div className="eyebrow">Boutique</div>
          <h1>Personnalise ta légende</h1>
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
          <div className="eyebrow">Aperçu</div>
          <h2>{SKINS.find((s) => s.id === apercu)?.nom}</h2>
          <p style={{ color: 'var(--craie-dim)' }}>
            Le skin choisi s'affiche partout dans le jeu (accueil & boutique).
          </p>
          {inventaire.includes(apercu) ? (
            skinActif === apercu ? (
              <span className="badge-cle ok">✓ Équipé</span>
            ) : (
              <button className="btn primaire" onClick={() => { choisirSkin(apercu); message('Skin équipé !'); }}>
                Équiper
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="eyebrow section-titre">Ballons</div>
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
              <div className="pastille-couleur" style={{ background: `linear-gradient(135deg, ${s.corps}, ${s.bande})` }} />
              <div className="article-nom">{s.nom}</div>
              {equipe ? (
                <span className="badge-cle ok">Équipé</span>
              ) : possede ? (
                <button className="btn fantome petit" onClick={(e) => { e.stopPropagation(); choisirSkin(s.id); message('Skin équipé !'); }}>
                  Équiper
                </button>
              ) : (
                <button
                  className="btn primaire petit"
                  disabled={coins < s.prix}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (acheterSkin(s.id)) message(`${s.nom} débloqué et équipé !`);
                    else message('Pas assez d’Ovas.');
                  }}
                >
                  🪙 {s.prix}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="eyebrow section-titre">Boosts (nécessitent une carrière en cours)</div>
      <div className="grille-boutique">
        {BOOSTS.map((b) => (
          <div key={b.id} className="carte article boost">
            <div className="boost-emoji">{b.emoji}</div>
            <div className="article-nom">{b.nom}</div>
            <p className="boost-desc">{b.desc}</p>
            <button
              className="btn vert petit"
              disabled={!joueur || coins < b.prix}
              onClick={() => {
                if (acheterBoost(b.id)) message(`${b.nom} appliqué !`);
                else message(joueur ? 'Pas assez d’Ovas.' : 'Commence une carrière d’abord.');
              }}
            >
              🪙 {b.prix}
            </button>
          </div>
        ))}
      </div>

      <div className="eyebrow section-titre">Recharges d’Ovas</div>
      <p style={{ color: 'var(--brume)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
        Le paiement réel n'est pas activé (démo). Les Ovas sont <b>rares</b> :
        elles se gagnent petit à petit en jouant — actions, situations, saisons,
        et carrières menées au bout. Chaque achat se mérite&nbsp;!
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
