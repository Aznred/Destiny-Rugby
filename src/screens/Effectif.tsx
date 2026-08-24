import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, noteGlobale } from '../store/useGame';
import { effectifDuClub, noteDuClub, forceEffectif, estEspoir, estDeclinant } from '../lib/effectif';
import { EFFECTIFS_REELS } from '../data/effectifsReels';
import { POSTES, nomPoste } from '../data/rugby';
import { t } from '../lib/i18n';
import { clubParNom } from '../data/clubs';
import { competitionEffective } from '../lib/divisions';
import { Blason, LogoEquipe } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { Drapeau } from '../components/Drapeau';
// ⚠️ Un XV national n’est pas un club : il se compose des MEILLEURS joueurs
// du pays, tous clubs confondus (`effectifNational`). C’est exactement le
// groupe que le moteur aligne quand on joue avec sa sélection — sinon
// l’écran montrerait un effectif et le match en alignerait un autre.
import { effectifNational } from '../lib/international';
import { maSelection } from '../lib/selection';

/**
 * La force d’un groupe : la moyenne pondérée de ses 23 meilleurs, XV de départ
 * ×1 et remplaçants ×0,5.
 *
 * ⚠️ MÊME FORMULE QUE `forceEffectif` POUR LES CLUBS, et il le faut : l’écran
 * affiche les deux nombres côte à côte quand on bascule d’un onglet à l’autre.
 * Deux barèmes différents feraient croire qu’un XV national vaut moins qu’un
 * club de Pro D2. `forceEffectif` ne s’applique pas ici — elle prend un NOM DE
 * CLUB et recompose l’effectif ; une sélection n’en est pas un.
 */
function forceDuGroupe(groupe: { note: number }[]): number {
  const notes = [...groupe].sort((a, b) => b.note - a.note).slice(0, 23);
  if (!notes.length) return 0;
  let somme = 0, poids = 0;
  notes.forEach((j, i) => { const p = i < 15 ? 1 : 0.5; somme += j.note * p; poids += p; });
  return somme / poids;
}

export function Effectif() {
  const joueur = useGame((s) => s.joueur);
  const setEcran = useGame((s) => s.setEcran);

  const viser = useGame((s) => s.ouvrirEffectifSur);
  const consommerVisee = useGame((s) => s.consommerViseeEffectif);

  /**
   * La sélection du joueur, si elle existe. Calculée même hors fenêtre
   * internationale : on a le droit de regarder son groupe national un
   * dimanche de championnat.
   */
  const selection = useMemo(() => (joueur ? maSelection(joueur) : null), [joueur]);

  const [onglet, setOnglet] = useState<'club' | 'selection'>('club');
  // ⚠️ L’ORDRE VENU DU PANNEAU EST CONSOMMÉ, PAS LU EN BOUCLE. Sans ça, on ne
  // pourrait plus jamais revenir à l’onglet club : chaque rendu le remettrait
  // sur la sélection.
  useEffect(() => {
    if (!viser) return;
    if (viser === 'selection' && selection) setOnglet('selection');
    else setOnglet('club');
    consommerVisee();
  }, [viser, selection, consommerVisee]);

  const coequipiers = useMemo(
    () => (joueur ? effectifDuClub(joueur.club, joueur.saison) : []),
    [joueur],
  );
  const internationaux = useMemo(
    () => (joueur && selection ? effectifNational(selection.equipe, joueur.saison) : []),
    [joueur, selection],
  );

  if (!joueur) return null;
  const enSelection = onglet === 'selection' && !!selection;
  const division = competitionEffective(joueur.club, joueur.division);
  const clubData = clubParNom(joueur.club);
  const maNote = noteGlobale(joueur);
  const reel = joueur.club in EFFECTIFS_REELS;
  const noteClub = noteDuClub(joueur.club);
  const reference = enSelection
    ? Math.round(forceDuGroupe(internationaux))
    : noteClub;

  // Fusionne le joueur incarné dans la liste, à son poste.
  // ⚠️ `effectifNational` CONTIENT DÉJÀ le joueur incarné quand il est du
  //    niveau : c’est le même vivier. On ne l’ajoute donc que côté club,
  //    sinon il apparaîtrait deux fois dans son groupe national.
  const groupe = enSelection ? internationaux : coequipiers;
  const dejaDedans = enSelection && groupe.some((c) => c.nom === joueur.nom);
  const lignes = [
    ...groupe,
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
  ].filter((l) => !(dejaDedans && 'moi' in l && l.moi));

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

      {/* ⚠️ DEUX GROUPES, DEUX ONGLETS. Demande explicite : « qu’on puisse
          voir l’effectif de notre sélection aussi ». L’onglet n’apparaît que
          si le joueur est RÉELLEMENT international : proposer « Ma sélection »
          à un joueur de Fédérale 3 ouvrirait un groupe dont il ne fait pas
          partie, et le laisserait croire qu’il y a sa place. */}
      {selection && (
        <div className="onglets-classement">
          <button
            type="button"
            className={`chip-comp${onglet === 'club' ? ' actif' : ''}`}
            onClick={() => setOnglet('club')}
          >
            {clubData && <Blason club={clubData} taille={18} />} {joueur.club}
          </button>
          <button
            type="button"
            className={`chip-comp${onglet === 'selection' ? ' actif' : ''}`}
            onClick={() => setOnglet('selection')}
          >
            <LogoEquipe nom={selection.equipe} taille={18} /> {selection.equipe}
          </button>
        </div>
      )}

      <div className="carte effectif-tete">
        {enSelection
          ? <LogoEquipe nom={selection!.equipe} taille={56} />
          : clubData && <Blason club={clubData} taille={56} />}
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {enSelection
              ? <>🏳️ {selection!.u20 ? t('eff.groupeU20') : t('eff.groupeNational')} · {t('gen.saison')} {joueur.saison}</>
              : <><LogoCompet id={division?.id} taille={18} /> {division?.nom ?? t('eff.divisionInconnue')} · {t('gen.saison')} {joueur.saison}</>}
          </div>
          <h1>{enSelection ? selection!.equipe : joueur.club}</h1>
          <p style={{ color: 'var(--craie-dim)', fontSize: '0.9rem' }}>
            {enSelection ? (
              <>
                {t('eff.effectifNote')}{' '}
                <b style={{ color: 'var(--or)' }}>{Math.round(forceDuGroupe(internationaux))}</b>
                {' · '}{lignes.length} {t('gen.joueurs')}
              </>
            ) : (
              <>
                {t('eff.noteClub')} <b style={{ color: 'var(--or)' }}>{noteClub}</b> · {t('eff.effectifNote')}{' '}
                <b style={{ color: 'var(--or)' }}>{Math.round(forceEffectif(joueur.club, joueur.saison))}</b> ·{' '}
                {lignes.length} {t('gen.joueurs')}
                {reel && ` · ${t('eff.effectifReel')}`}
              </>
            )}
          </p>
          <p style={{ color: 'var(--craie-dim)', fontSize: '0.82rem' }}>
            {enSelection ? t('eff.legendeSelection') : t('eff.legende')}
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
              {/* ⚠️ Le seuil est RELATIF au groupe affiché. Comparer un XV
                  national à la note d’un club de Fédérale peindrait les
                  trente joueurs en or, et l’indication ne dirait plus rien. */}
              <span className="j-note" data-niveau={l.note >= reference + 2 ? 'or' : l.note >= reference - 8 ? 'vert' : 'gris'}>
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
