import { motion } from 'framer-motion';
import { useGame, classementComplet } from '../store/useGame';
import { POSTE_PAR_ID, migrerPoste } from '../data/rugby';
import { Drapeau, nomNation } from '../components/Drapeau';

export function Classement() {
  const pantheon = useGame((s) => s.pantheon);
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);

  const liste = classementComplet(pantheon, joueur);

  return (
    <motion.section
      className="classement"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="eyebrow">Classement mondial</div>
      <h1>🏆 Les plus grandes carrières</h1>
      <p style={{ color: 'var(--craie-dim)', maxWidth: '64ch', margin: '0.6rem 0 1.4rem' }}>
        Ta carrière est classée face aux légendes de l'ovalie selon un score global
        (niveau, réputation, longévité, titres, essais). Fais grimper ta carrière en
        cours et immortalise-la via le Hall.
        <br />
        <span style={{ color: 'var(--brume)', fontSize: '0.85rem' }}>
          ℹ️ Classement local pour l'instant. Le vrai classement multijoueur en ligne
          arrivera avec un backend (synchronisation entre joueurs).
        </span>
      </p>

      <div className="carte tableau-classement">
        <div className="ligne-classement entete">
          <span className="c-rang">#</span>
          <span className="c-joueur">Joueur</span>
          <span className="c-note">Note</span>
          <span className="c-saisons">Saisons</span>
          <span className="c-score">Score</span>
        </div>
        {liste.map((l, i) => (
          <div
            key={l.id}
            className={`ligne-classement ${l.joueur ? 'moi' : ''} ${l.enCours ? 'en-cours' : ''}`}
          >
            <span className="c-rang">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            <span className="c-joueur">
              <span className="c-emoji">
                {POSTE_PAR_ID[migrerPoste(l.poste)].categorie === 'Avant' ? '🛡️' : '⚡'}
              </span>
              <span>
                <b>{l.nom}</b>
                <small style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {POSTE_PAR_ID[migrerPoste(l.poste)].nom} · <Drapeau nation={l.nation} taille={0.72} /> {nomNation(l.nation)}
                </small>
              </span>
            </span>
            <span className="c-note">{l.note}</span>
            <span className="c-saisons">{l.saisons}</span>
            <span className="c-score">{(l.score ?? 0).toLocaleString('fr-FR')}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginTop: '2rem' }}>
        {joueur ? (
          <button className="btn primaire" onClick={() => setEcran('carriere')}>
            Faire grimper ma carrière →
          </button>
        ) : (
          <button className="btn primaire" onClick={() => setEcran('creation')}>
            Commencer une carrière →
          </button>
        )}
        <button className="btn fantome" onClick={() => setEcran('pantheon')}>
          Hall des Légendes
        </button>
      </div>
    </motion.section>
  );
}
