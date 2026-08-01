import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { POSTE_PAR_ID, migrerPoste } from '../data/rugby';
import { Drapeau, nomNation } from '../components/Drapeau';

export function Pantheon() {
  const pantheon = useGame((s) => s.pantheon);
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);

  const legendes = [...pantheon].sort((a, b) => b.score - a.score);

  return (
    <motion.section
      className="pantheon"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="eyebrow">Hall des Légendes</div>
      <h1 className="titre-pantheon">🏛️ Le Panthéon de l'Ovalie</h1>
      <p style={{ color: 'var(--craie-dim)', maxWidth: '62ch', margin: '0.6rem 0 2rem' }}>
        Chaque carrière que tu mènes à la retraite s'inscrit ici pour l'éternité,
        avec son parcours et son score. Vise le sommet du classement mondial.
      </p>

      {legendes.length === 0 ? (
        <div className="carte vide-pantheon">
          <div style={{ fontSize: '2.4rem' }}>🏉</div>
          <h2>Aucune légende… pour l'instant</h2>
          <p style={{ color: 'var(--craie-dim)' }}>
            Termine une carrière (bouton « Prendre sa retraite ») pour l'immortaliser ici.
          </p>
          {joueur ? (
            <button className="btn primaire" onClick={() => setEcran('carriere')}>
              Reprendre ma carrière →
            </button>
          ) : (
            <button className="btn primaire" onClick={() => setEcran('creation')}>
              Commencer une carrière →
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
                  {POSTE_PAR_ID[migrerPoste(l.poste)].nom} · <Drapeau nation={l.nation} taille={0.75} /> {nomNation(l.nation)} · {l.saisons} saisons
                </div>
                <div className="legende-stats">
                  <span>Note <b>{l.note}</b></span>
                  <span>🎯 <b>{l.essais}</b></span>
                  <span>🏉 <b>{l.matchsJoues}</b></span>
                  <span>⭐ <b>{l.reputation}</b></span>
                </div>
                {(l.titres ?? []).length > 0 && (
                  <div className="legende-titres">
                    {(l.titres ?? []).map((t, j) => (
                      <span key={j} className="medaille">🏆 {t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="legende-score">
                <b>{(l.score ?? 0).toLocaleString('fr-FR')}</b>
                <span>points</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <button className="btn fantome" onClick={() => setEcran('classement')}>
          Voir le classement mondial →
        </button>
      </div>
    </motion.section>
  );
}
