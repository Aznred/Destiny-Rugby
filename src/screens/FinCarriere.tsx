import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { texteFinCarriere } from '../data/finCarriereLocalisee';
import type { MotifFinCarriere } from '../types';

const ICONES: Record<MotifFinCarriere, string> = {
  retraiteChoisie: '🌅',
  ageLimite: '🏛️',
  blessure: '🩺',
  radiation: '🚫',
  deces: '🕯️',
  sansClub: '📵',
  autre: '🏉',
};

export function FinCarriere() {
  const fin = useGame((s) => s.finCarriere);
  const pantheon = useGame((s) => s.pantheon);
  const continuer = useGame((s) => s.continuerFinCarriere);
  const legende = fin ? pantheon.find((l) => l.id === fin.legendeId) : undefined;

  // Une sauvegarde très ancienne ou incomplète ne doit jamais laisser un
  // écran vide : dans ce seul cas, on rejoint simplement le Hall.
  useEffect(() => {
    if (!fin || !legende) continuer();
  }, [fin, legende, continuer]);

  if (!fin || !legende) return null;
  const texte = texteFinCarriere(fin, legende);

  return (
    <motion.section
      className="fin-carriere"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      aria-labelledby="fin-carriere-titre"
    >
      <div className="fin-carriere-carte carte">
        <div className="fin-carriere-icone" aria-hidden="true">{ICONES[fin.motif]}</div>
        <div className="eyebrow">{texte.eyebrow}</div>
        <h1 id="fin-carriere-titre">{texte.titre}</h1>
        <p className="fin-carriere-raison">{texte.raison}</p>

        {fin.detail && (
          <div className="fin-carriere-detail">
            <b>{texte.detailLabel}</b>
            <p>{fin.detail}</p>
          </div>
        )}

        <div className="fin-carriere-nom">{legende.nom}</div>
        <div className="fin-carriere-stats" aria-label={legende.nom}>
          {texte.stats.map((stat) => (
            <div key={stat.label}>
              <span aria-hidden="true">{stat.emoji}</span>
              <b>{stat.valeur.toLocaleString()}</b>
              <small>{stat.label}</small>
            </div>
          ))}
        </div>

        <p className="fin-carriere-sauvee">✓ {texte.sauvegardee}</p>
        <button type="button" className="btn primaire fin-carriere-continuer" onClick={continuer}>
          {texte.bouton} →
        </button>
      </div>
    </motion.section>
  );
}
