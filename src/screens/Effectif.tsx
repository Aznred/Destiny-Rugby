import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGame, noteGlobale } from '../store/useGame';
import { effectifDuClub, noteDuClub, forceEffectif, estEspoir, estDeclinant } from '../lib/effectif';
import { EFFECTIFS_REELS } from '../data/effectifsReels';
import { POSTES } from '../data/rugby';
import { competitionDuClub, clubParNom } from '../data/clubs';
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
  const division = competitionDuClub(joueur.club);
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
        ← Retour à la carrière
      </button>

      <div className="carte effectif-tete">
        {clubData && <Blason club={clubData} taille={56} />}
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <LogoCompet id={division?.id} taille={18} /> {division?.nom ?? 'Division inconnue'} · Saison {joueur.saison}
          </div>
          <h1>{joueur.club}</h1>
          <p style={{ color: 'var(--craie-dim)', fontSize: '0.9rem' }}>
            Note du club <b style={{ color: 'var(--or)' }}>{noteClub}</b> · effectif
            noté <b style={{ color: 'var(--or)' }}>{Math.round(forceEffectif(joueur.club, joueur.saison))}</b> ·{' '}
            {lignes.length} joueurs
            {reel && ' · effectif réel 2025-26'}
          </p>
          <p style={{ color: 'var(--craie-dim)', fontSize: '0.82rem' }}>
            Les espoirs <span className="j-tendance monte">↗</span> progressent vers
            leur potentiel jusqu'à 27 ans, les anciens <span className="j-tendance descend">↘</span>{' '}
            déclinent, et les retraités laissent place à des « regens » 🌱.
            C'est la note moyenne de l'effectif qui décide du classement du club.
          </p>
        </div>
      </div>

      {parPoste.map(({ poste, joueurs }) => (
        <div key={poste.id} className="carte bloc-poste">
          <div className="poste-titre">
            <b>{poste.nom}</b>
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
                {'moi' in l && l.moi && <em> — toi</em>}
                {l.regen && <span title="Jeune regen"> 🌱</span>}
                {/* Trajectoire : espoir en progression, ou cadre sur le déclin. */}
                {!('moi' in l) && estEspoir(l) && (
                  <span className="j-tendance monte" title={`Espoir — peut atteindre ${l.potentiel}`}>
                    ↗ {l.potentiel}
                  </span>
                )}
                {!('moi' in l) && !estEspoir(l) && estDeclinant(l) && (
                  <span className="j-tendance descend" title="En fin de carrière : sa note baisse chaque saison">
                    ↘
                  </span>
                )}
              </span>
              <span className="j-age">{l.age} ans</span>
            </div>
          ))}
        </div>
      ))}
    </motion.section>
  );
}
