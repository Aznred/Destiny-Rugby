import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { effectifDuClub, forceEffectif, noteDuClub, estEspoir, estDeclinant } from '../lib/effectif';
import { aEffectifReel } from '../data/effectifsReels';
import { generationDuClub, libelleGeneration } from '../lib/generations';
import { POSTES, nomPoste } from '../data/rugby';
import { t } from '../lib/i18n';
import { Blason } from './Blason';
import { Drapeau } from './Drapeau';
import type { Club } from '../types';
import { Icone } from './Icone';

// Fiche d'un club : son effectif complet, poste par poste. Ouverte au clic sur
// un club dans l'écran Championnats.
// ⚠️ Portal vers <body> : le backdrop-filter des `.carte` parentes crée un bloc
// conteneur qui piégerait la modale (voir Confirmation.tsx).
export function FicheClub({
  club,
  competition,
  saison,
  onFermer,
}: {
  club: Club;
  competition?: string;
  saison: number;
  onFermer: () => void;
}) {
  const effectif = useMemo(() => effectifDuClub(club.nom, saison), [club.nom, saison]);
  const noteClub = noteDuClub(club.nom);
  const force = Math.round(forceEffectif(club.nom, saison));
  const reel = aEffectifReel(club.nom);
  const gen = generationDuClub(club.nom, saison, noteDuClub(club.nom));
  const generation = libelleGeneration(gen);

  // Échap ferme la fiche.
  useEffect(() => {
    const onTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', onTouche);
    return () => window.removeEventListener('keydown', onTouche);
  }, [onFermer]);

  const parPoste = POSTES.map((p) => ({
    poste: p,
    joueurs: effectif.filter((j) => j.poste === p.id).sort((a, b) => b.note - a.note),
  })).filter((g) => g.joueurs.length > 0);

  return createPortal(
    <div className="overlay" onClick={onFermer}>
      <motion.div
        className="carte modale fiche-club"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="fiche-club-tete">
          <Blason club={club} taille={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">
              {competition ?? t('fc.club')}{club.ville ? ` · ${club.ville}` : ''} · {t('gen.saison')} {saison}
            </div>
            <h2>{club.nom}</h2>
            <p className="fiche-club-stats">
              {t('eff.noteClub')} <b>{noteClub}</b> · {t('eff.effectifNote')} <b>{force}</b> ·{' '}
              {effectif.length} {t('gen.joueurs')}{reel ? ` · ${t('fc.effectifReel')}` : ` · ${t('fc.effectifSimule')}`}
            </p>
            {/* ⚠️ LA GÉNÉRATION DU CLUB SE VOIT. Un effectif qui prend cinq
                points sans explication, c'est du bruit ; annoncé, c'est une
                histoire — et c'est ce qui rend un outsider crédible quand il
                vient chercher le Bouclier. */}
            {generation && (
              <p className={`pastille-generation${gen.doree ? ' doree' : ' creuse'}`}>
                {generation}
                <span>
                  {gen.doree
                    ? t('fc.generationDoree', { bonus: Math.round(gen.bonus) })
                    : t('fc.generationCreuse', { bonus: Math.round(gen.bonus) })}
                </span>
              </p>
            )}
          </div>
          <button className="btn fantome petit fiche-club-fermer" onClick={onFermer} aria-label={t('reg.fermer')}>
            <Icone nom="croix" taille={18} />
          </button>
        </div>

        <div className="fiche-club-corps">
          {parPoste.map(({ poste, joueurs }) => (
            <div key={poste.id} className="bloc-poste">
              <div className="poste-titre">
                <b>{nomPoste(poste.id)}</b>
                <span>{poste.numero}</span>
              </div>
              {joueurs.map((j) => (
                <div key={j.id} className="ligne-joueur">
                  <span
                    className="j-note"
                    data-niveau={j.note >= noteClub + 2 ? 'or' : j.note >= noteClub - 8 ? 'vert' : 'gris'}
                  >
                    {j.note}
                  </span>
                  <span className="j-drapeau"><Drapeau nation={j.nation} taille={0.95} /></span>
                  <span className="j-nom">
                    {j.nom}
                    {j.regen && <span title={t('eff.regen')}> <Icone nom="pousse" taille={13} /></span>}
                    {estEspoir(j) && (
                      <span className="j-tendance monte" title={t('eff.espoir', { n: j.potentiel })}>
                        ↗ {j.potentiel}
                      </span>
                    )}
                    {!estEspoir(j) && estDeclinant(j) && (
                      <span className="j-tendance descend" title={t('eff.declin')}>
                        ↘
                      </span>
                    )}
                  </span>
                  <span className="j-age">{j.age} {t('gen.ans')}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
