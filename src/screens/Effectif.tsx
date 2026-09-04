import {Fragment, useEffect, useMemo, useState} from 'react';
import { motion } from 'framer-motion';
import { useGame, noteGlobale } from '../store/useGame';
import { effectifDuClub, noteDuClub, forceEffectif, estEspoir, estDeclinant } from '../lib/effectif';
import { blessuresParJoueur } from '../lib/carriereAvancee';
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

import { Icone } from '../components/Icone';
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
  const manager = useGame((s) => s.manager);
  // ⚠️ LES BLESSURES ÉTAIENT INVISIBLES. Le dossier médical existe depuis le
  //    lot « carrière avancée » — gravité, type, semaines d’absence — et la
  //    composition écarte déjà les indisponibles. Mais RIEN ne le montrait :
  //    on découvrait qu’un joueur manquait en cherchant pourquoi la feuille
  //    avait changé. Retour de jeu : « on ne sait pas trop quel joueur a des
  //    blessures ».
  const blessures = useMemo(
    () => blessuresParJoueur(manager?.avancee?.medical),
    [manager?.avancee?.medical],
  );
  const semaineManager = manager?.semaine ?? -1;
  const selectionsActives = useMemo(
    () => new Map((manager?.avancee?.convocations ?? [])
      .filter((convocation) => semaineManager >= convocation.debut && semaineManager <= convocation.fin)
      .map((convocation) => [convocation.joueurId, convocation])),
    [manager?.avancee?.convocations, semaineManager],
  );
  const [blessureOuverte, setBlessureOuverte] = useState<string | null>(null);
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
    () => {
      const carriere = joueur ?? manager;
      return carriere?.club ? effectifDuClub(carriere.club, carriere.saison) : [];
    },
    [joueur, manager],
  );
  const internationaux = useMemo(
    () => (joueur && selection ? effectifNational(selection.equipe, joueur.saison) : []),
    [joueur, selection],
  );

  if (!joueur && !manager) return null;
  const carriere = joueur ?? manager!;
  const enSelection = onglet === 'selection' && !!selection;
  const division = competitionEffective(carriere.club, carriere.division);
  const clubData = clubParNom(carriere.club);
  const maNote = joueur ? noteGlobale(joueur) : 0;
  const reel = carriere.club in EFFECTIFS_REELS;
  const noteClub = noteDuClub(carriere.club);
  const reference = enSelection
    ? Math.round(forceDuGroupe(internationaux))
    : noteClub;

  // Fusionne le joueur incarné dans la liste, à son poste.
  // ⚠️ `effectifNational` CONTIENT DÉJÀ le joueur incarné quand il est du
  //    niveau : c’est le même vivier. On ne l’ajoute donc que côté club,
  //    sinon il apparaîtrait deux fois dans son groupe national.
  const groupe = enSelection ? internationaux : coequipiers;
  const dejaDedans = !!joueur && enSelection && groupe.some((c) => c.nom === joueur.nom);
  const lignes = [
    ...groupe,
    ...(joueur ? [{
      id: 'moi',
      nom: joueur.nom,
      poste: joueur.poste,
      age: joueur.age,
      note: maNote,
      potentiel: maNote,
      nation: joueur.nation,
      regen: false,
      moi: true,
    }] : []),
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
      <button className="btn fantome" onClick={() => setEcran(joueur ? 'carriere' : 'manager')} style={{ marginBottom: '1rem' }}>
        {joueur ? t('gen.retourCarriere') : t('mgr.retourBureau')}
      </button>

      {/* ⚠️ DEUX GROUPES, DEUX ONGLETS. Demande explicite : « qu’on puisse
          voir l’effectif de notre sélection aussi ». L’onglet n’apparaît que
          si le joueur est RÉELLEMENT international : proposer « Ma sélection »
          à un joueur de Fédérale 3 ouvrirait un groupe dont il ne fait pas
          partie, et le laisserait croire qu’il y a sa place. */}
      {joueur && selection && (
        <div className="onglets-classement">
          <button
            type="button"
            className={`chip-comp${onglet === 'club' ? ' actif' : ''}`}
            onClick={() => setOnglet('club')}
          >
            {clubData && <Blason club={clubData} taille={18} />} {carriere.club}
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
              ? <><Icone nom="drapeau" taille={15} /> {selection!.u20 ? t('eff.groupeU20') : t('eff.groupeNational')} · {t('gen.saison')} {carriere.saison}</>
              : <><LogoCompet id={division?.id} taille={18} /> {division?.nom ?? t('eff.divisionInconnue')} · {t('gen.saison')} {carriere.saison}</>}
          </div>
          <h1>{enSelection ? selection!.equipe : carriere.club}</h1>
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
                <b style={{ color: 'var(--or)' }}>{Math.round(forceEffectif(carriere.club, carriere.saison))}</b> ·{' '}
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
            <Fragment key={l.id}>
            <div className={`ligne-joueur ${'moi' in l && l.moi ? 'moi' : ''}`}>
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
                {l.regen && <span title={t('eff.regen')}> <Icone nom="pousse" taille={13} /></span>}
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
              {(() => {
                const convocation = selectionsActives.get(l.id);
                if (!convocation) return null;
                return (
                  <span
                    className="j-selection"
                    title={`${t('compo.badge.international')} · ${convocation.nation} · ${convocation.competition}`}
                  >
                    <Icone nom="drapeau" taille={13} />
                    <em>{t('compo.badge.international')}</em>
                  </span>
                );
              })()}
              {(() => {
                const b = blessures.get(l.id);
                if (!b) return null;
                // Trois gravités, trois couleurs, et la durée en clair : c’est ce
                // qu’on veut lire d’un coup d’œil sur une liste de trente noms.
                return (
                  <button
                    type="button"
                    className={`j-blessure ${b.gravite}`}
                    onClick={() => setBlessureOuverte(blessureOuverte === l.id ? null : l.id)}
                    title={`${b.type} · ${b.semaines} ${b.semaines > 1 ? 'semaines' : 'semaine'}`}
                    aria-expanded={blessureOuverte === l.id}
                  >
                    <Icone nom="soin" taille={13} />
                    <em>{b.semaines} sem.</em>
                  </button>
                );
              })()}
              <span className="j-age">{l.age} {t('gen.ans')}</span>
            </div>
            {blessureOuverte === l.id && blessures.get(l.id) && (() => {
              const b = blessures.get(l.id)!;
              const mots: Record<string, string> = {
                legere: 'Blessure légère', moyenne: 'Blessure moyenne', grave: 'Grosse blessure',
              };
              const decisions: Record<string, string> = {
                attente: 'Le staff attend ta décision',
                repos: 'Mis au repos',
                traitement: 'Sous traitement — il peut jouer diminué',
                forcer: 'Aligné malgré la blessure',
              };
              return (
                <div className={`j-blessure-detail ${b.gravite}`} role="status">
                  <b><Icone nom="soin" taille={14} /> {mots[b.gravite] ?? b.gravite} · {b.type}</b>
                  <span>
                    Indisponible {b.semaines} {b.semaines > 1 ? 'semaines' : 'semaine'}
                    {b.douleur > 0 && ` · douleur ${b.douleur}/10`}
                  </span>
                  <em>{decisions[b.decision] ?? b.decision}</em>
                </div>
              );
            })()}
            </Fragment>
          ))}
        </div>
      ))}
    </motion.section>
  );
}
