import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGame, noteGlobale } from '../store/useGame';
import { effectifDuClub, noteDuClub, forceEffectif, estEspoir, estDeclinant } from '../lib/effectif';
import { EFFECTIFS_REELS } from '../data/effectifsReels';
import { POSTES, nomPoste } from '../data/rugby';
import { t } from '../lib/i18n';
import { clubParNom } from '../data/clubs';
import { competitionEffective } from '../lib/divisions';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { Drapeau } from '../components/Drapeau';

export function Effectif() {
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);

  const coequipiers = useMemo(
    () => (joueur ? effectifDuClub(joueur.club, joueur.saison) : []),
    [joueur],
  );

  if (!joueur) return null;
  const division = competitionEffective(joueur.club, joueur.division);
  const clubData = clubParNom(joueur.club);
  const maNote = noteGlobale(joueur);
  const reel = joueur.club in EFFECTIFS_REELS;
  const noteClub = noteDuClub(joueur.club);

  // Fusionne le joueur incarné dans la liste, à son poste.
  const lignes = [
    ...coequipiers,
    {
      id: 'moi',
      nom: joueur.nom,
      poste: joueur.poste,
      age: joueur.age,
      note: maNote,
      potentiel: maNote,
      nation: joueur.nation,
      regen: false,
      moi: true,
    },
  ];

  const parPoste = POSTES.map((p) => ({
    poste: p,
    joueurs: lignes
      .filter((l) => l.poste === p.id)
      .sort((a, b) => b.note - a.note),
  }));

  return (
    <motion.section
      className="effectif"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <button className="btn fantome" onClick={() => setEcran('carriere')} style={{ marginBottom: '1rem' }}>
        {t('gen.retourCarriere')}
      </button>

      <div className="carte effectif-tete">
        {clubData && <Blason club={clubData} taille={56} />}
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <LogoCompet id={division?.id} taille={18} /> {division?.nom ?? t('eff.divisionInconnue')} · {t('gen.saison')} {joueur.saison}
          </div>
          <h1>{joueur.club}</h1>
          <p style={{ color: 'var(--craie-dim)', fontSize: '0.9rem' }}>
            {t('eff.noteClub')} <b style={{ color: 'var(--or)' }}>{noteClub}</b> · {t('eff.effectifNote')}{' '}
            <b style={{ color: 'var(--or)' }}>{Math.round(forceEffectif(joueur.club, joueur.saison))}</b> ·{' '}
            {lignes.length} {t('gen.joueurs')}
            {reel && ` · ${t('eff.effectifReel')}`}
          </p>
          <p style={{ color: 'var(--craie-dim)', fontSize: '0.82rem' }}>
            {t('eff.legende')}
          </p>
        </div>
      </div>

      {parPoste.map(({ poste, joueurs }) => (
        <div key={poste.id} className="carte bloc-poste">
          <div className="poste-titre">
            <b>{nomPoste(poste.id)}</b>
            <span>{poste.numero}</span>
          </div>
          {joueurs.map((l) => (
            <div key={l.id} className={`ligne-joueur ${'moi' in l && l.moi ? 'moi' : ''}`}>
              {/* Seuils relatifs au niveau du club : « or » = cadre, « gris » = espoir. */}
              <span className="j-note" data-niveau={l.note >= noteClub + 2 ? 'or' : l.note >= noteClub - 8 ? 'vert' : 'gris'}>
                {l.note}
              </span>
              <span className="j-drapeau">
                <Drapeau nation={l.nation} taille={0.95} />
              </span>
              <span className="j-nom">
                {l.nom}
                {'moi' in l && l.moi && <em> {t('eff.toi')}</em>}
                {l.regen && <span title={t('eff.regen')}> 🌱</span>}
                {/* Trajectoire : espoir en progression, ou cadre sur le déclin. */}
                {!('moi' in l) && estEspoir(l) && (
                  <span className="j-tendance monte" title={t('eff.espoir', { n: l.potentiel })}>
                    ↗ {l.potentiel}
                  </span>
                )}
                {!('moi' in l) && !estEspoir(l) && estDeclinant(l) && (
                  <span className="j-tendance descend" title={t('eff.declin')}>
                    ↘
                  </span>
                )}
              </span>
              <span className="j-age">{l.age} {t('gen.ans')}</span>
            </div>
          ))}
        </div>
      ))}
    </motion.section>
  );
}
