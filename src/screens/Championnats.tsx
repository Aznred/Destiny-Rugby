import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

import { useGame } from '../store/useGame';
import { COMPETITIONS_MASCULINES } from '../data/clubs';
import { COUPES_EUROPE } from '../data/mondeReel';
import { SELECTIONS_SENIOR, SELECTIONS_U20, type Selection } from '../data/selections';
import { Drapeau } from '../components/Drapeau';
import { aDrapeau, nomNationTraduit } from '../lib/nations';
import { LogoCompet } from '../components/LogoCompet';
import { NOTE_CLUB_REEL, NOTE_CLUB_NOUVEAU } from '../data/sourcesDuMonde';
import { competitionsFeminines, noteClubFeminin } from '../lib/mondeFeminin';
import { noteAmateur } from '../lib/effectif';
import { Blason, LogoEquipe } from '../components/Blason';
import { FicheClub } from '../components/FicheClub';
import type { Club, Competition } from '../types';
import { t, tn } from '../lib/i18n';

import { Icone } from '../components/Icone';
type Zone = 'France' | 'Monde' | 'Feminin' | 'Nations';

// La note affichée sur la carte d'un club : celle de la base d'origine, sinon
// celle des nouvelles ligues, sinon celle qu'on tire pour lui.
function noteAffichee(nom: string, niveau: number, feminin = false): number {
  if (feminin) {
    return noteClubFeminin(nom) ?? 70;
  }
  return NOTE_CLUB_REEL[nom] ?? NOTE_CLUB_NOUVEAU[nom] ?? noteAmateur(nom, niveau);
}

export function Championnats() {
  const [zone, setZone] = useState<Zone>('France');
  // Club dont on affiche l'effectif (clic sur une carte).
  const [fiche, setFiche] = useState<{ club: Club; competition: string; feminin?: boolean } | null>(null);
  // L'effectif est celui de la saison en cours si une carrière tourne.
  const saison = useGame((s) => s.joueur?.saison ?? s.manager?.saison ?? 1);

  const [recherche, setRecherche] = useState('');
  const [filtreFeminin, setFiltreFeminin] = useState<'toutes' | 'france' | 'monde'>('toutes');

  const compsFeminines = useMemo(() => competitionsFeminines(), []);
  const compsMasculinesZone = useMemo(() => COMPETITIONS_MASCULINES.filter((c) => c.zone === zone), [zone]);

  const filtrerComps = (liste: Competition[]) => {
    const q = recherche.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return liste;
    return liste
      .map((c) => {
        const matchComp =
          c.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
          c.pays.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
        const matchingClubs = c.clubs.filter((k) =>
          k.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
        );
        if (matchComp) return c;
        if (matchingClubs.length > 0) return { ...c, clubs: matchingClubs };
        return null;
      })
      .filter((c): c is Competition => c !== null);
  };

  const compsMasculinesAffichees = useMemo(() => {
    if (zone !== 'France' && zone !== 'Monde') return [];
    return filtrerComps(compsMasculinesZone);
  }, [zone, compsMasculinesZone, recherche]);

  const coupesEuropeAffichees = useMemo(() => {
    if (zone !== 'Monde') return [];
    const q = recherche.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return COUPES_EUROPE;
    return COUPES_EUROPE.map((c) => {
      const matchComp =
        c.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
        c.pays.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
      const matchingClubs = c.clubs.filter((k) =>
        k.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
      );
      if (matchComp) return c;
      if (matchingClubs.length > 0) return { ...c, clubs: matchingClubs };
      return null;
    }).filter((c): c is (typeof COUPES_EUROPE)[number] => c !== null);
  }, [zone, recherche]);

  const compsFemininesAffichees = useMemo(() => {
    if (zone !== 'Feminin') return [];
    let liste = compsFeminines;
    if (filtreFeminin === 'france') {
      liste = liste.filter((c) => c.pays.toLowerCase() === 'france' || c.zone === 'France');
    } else if (filtreFeminin === 'monde') {
      liste = liste.filter((c) => c.pays.toLowerCase() !== 'france' && c.zone !== 'France');
    }
    return filtrerComps(liste);
  }, [zone, compsFeminines, filtreFeminin, recherche]);

  const selectionsAffichees = useMemo(() => {
    if (zone !== 'Nations') return { seniors: [], u20: [] };
    const q = recherche.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return { seniors: SELECTIONS_SENIOR, u20: SELECTIONS_U20 };
    const matchSel = (s: Selection) =>
      s.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
      s.nation.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
    return {
      seniors: SELECTIONS_SENIOR.filter(matchSel),
      u20: SELECTIONS_U20.filter(matchSel),
    };
  }, [zone, recherche]);

  const totalClubsAffiches = useMemo(() => {
    if (zone === 'France' || zone === 'Monde') {
      const nClubs = compsMasculinesAffichees.reduce((acc, c) => acc + c.clubs.length, 0);
      const nCoupes = zone === 'Monde' ? coupesEuropeAffichees.reduce((acc, c) => acc + c.clubs.length, 0) : 0;
      return nClubs + nCoupes;
    }
    if (zone === 'Feminin') {
      return compsFemininesAffichees.reduce((acc, c) => acc + c.clubs.length, 0);
    }
    return selectionsAffichees.seniors.length + selectionsAffichees.u20.length;
  }, [zone, compsMasculinesAffichees, coupesEuropeAffichees, compsFemininesAffichees, selectionsAffichees]);

  const aDesResultats = totalClubsAffiches > 0;

  return (
    <motion.section
      className="championnats"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="eyebrow">{t('ch.eyebrow')}</div>
      <h1><Icone nom="monde" taille={26} /> {t('ch.titre')}</h1>
      <p style={{ color: 'var(--craie-dim)', maxWidth: '64ch', margin: '0.6rem 0 1.2rem' }}>
        {t('ch.chapo')}
      </p>

      {/* Onglets principaux 2x2 sur mobile, 4 en ligne sur desktop */}
      <div className="championnats-onglets">
        <button className={zone === 'France' ? 'actif' : ''} onClick={() => setZone('France')}>
          <span className="fi fi-fr" style={{ borderRadius: '2px', fontSize: '0.85rem' }} />
          <span>{t('ch.france')}</span>
        </button>
        <button className={zone === 'Monde' ? 'actif' : ''} onClick={() => setZone('Monde')}>
          <Icone nom="monde" taille={16} />
          <span>{t('ch.monde')}</span>
        </button>
        <button className={zone === 'Feminin' ? 'actif' : ''} onClick={() => setZone('Feminin')}>
          <Icone nom="etoile" taille={16} />
          <span>{t('ch.feminin') || 'Féminin'}</span>
        </button>
        <button className={zone === 'Nations' ? 'actif' : ''} onClick={() => setZone('Nations')}>
          <Icone nom="drapeau" taille={16} />
          <span>{t('ch.selections')}</span>
        </button>
      </div>

      {/* Barre d'outils : recherche & filtres intégrés */}
      <div className="ch-barre-outils">
        <div className="ch-recherche-champ">
          <Icone nom="loupe" taille={18} className="ch-loupe-icone" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={
              zone === 'Feminin'
                ? (t('ch.rechercherClub') || 'Rechercher un club, un championnat, un pays...')
                : (t('ch.rechercherClubGlobal') || 'Rechercher un club ou un pays...')
            }
            aria-label="Rechercher"
          />
          {recherche && (
            <button
              type="button"
              className="ch-recherche-clear"
              onClick={() => setRecherche('')}
              title={t('ch.resetRecherche') || 'Effacer'}
              aria-label="Effacer la recherche"
            >
              <Icone nom="croix" taille={14} />
            </button>
          )}
        </div>

        {zone === 'Feminin' && (
          <div className="ch-filtres-chips">
            <button
              type="button"
              className={`ch-chip ${filtreFeminin === 'toutes' ? 'actif' : ''}`}
              onClick={() => setFiltreFeminin('toutes')}
            >
              <span>{t('ch.toutes') || 'Toutes'}</span>
              <span className="ch-chip-badge">{compsFeminines.length}</span>
            </button>
            <button
              type="button"
              className={`ch-chip ${filtreFeminin === 'france' ? 'actif' : ''}`}
              onClick={() => setFiltreFeminin('france')}
            >
              <span className="fi fi-fr" style={{ borderRadius: '2px', fontSize: '0.8rem' }} />
              <span>{t('ch.france')}</span>
              <span className="ch-chip-badge">
                {compsFeminines.filter((c) => c.pays.toLowerCase() === 'france' || c.zone === 'France').length}
              </span>
            </button>
            <button
              type="button"
              className={`ch-chip ${filtreFeminin === 'monde' ? 'actif' : ''}`}
              onClick={() => setFiltreFeminin('monde')}
            >
              <Icone nom="monde" taille={14} />
              <span>{t('ch.international') || 'International'}</span>
              <span className="ch-chip-badge">
                {compsFeminines.filter((c) => c.pays.toLowerCase() !== 'france' && c.zone !== 'France').length}
              </span>
            </button>
          </div>
        )}

        {recherche.trim() && (
          <div className="ch-recherche-resume">
            <span>
              {totalClubsAffiches > 0
                ? `${totalClubsAffiches} club${totalClubsAffiches > 1 ? 's' : ''} trouvé${totalClubsAffiches > 1 ? 's' : ''}`
                : (t('ch.aucunResultat') || 'Aucun résultat')}
            </span>
            <button type="button" className="ch-lien-reset" onClick={() => setRecherche('')}>
              {t('ch.resetRecherche') || 'Effacer la recherche'}
            </button>
          </div>
        )}
      </div>

      {/* Contenu selon la zone */}
      {!aDesResultats ? (
        <div className="carte ch-aucun-resultat">
          <Icone nom="loupe" taille={36} />
          <h3>{t('ch.aucunResultat') || 'Aucun club trouvé'}</h3>
          <p>{t('ch.aucunResultatAide') || 'Essaie avec un autre nom de club ou réinitialise la recherche.'}</p>
          <button
            type="button"
            className="btn fantome petit"
            onClick={() => {
              setRecherche('');
              setFiltreFeminin('toutes');
            }}
          >
            {t('ch.resetRecherche') || 'Effacer la recherche'}
          </button>
        </div>
      ) : (
        <>
          {(zone === 'France' || zone === 'Monde') &&
            compsMasculinesAffichees.map((comp) => (
              <BlocCompetition
                key={comp.id}
                id={comp.id}
                nom={comp.nom}
                pays={comp.pays}
                drapeaux={comp.drapeaux}
                clubs={comp.clubs}
                note={comp.note}
                niveau={comp.niveau}
                onClub={(club) => setFiche({ club, competition: comp.nom })}
              />
            ))}

          {zone === 'Monde' &&
            coupesEuropeAffichees.map((coupe) => (
              <BlocCompetition
                key={coupe.id}
                id={coupe.id}
                nom={coupe.nom}
                pays={coupe.pays}
                drapeaux={coupe.drapeaux}
                clubs={coupe.clubs}
                note={coupe.desc}
                niveau={0}
                onClub={(club) => setFiche({ club, competition: coupe.nom })}
              />
            ))}

          {zone === 'Feminin' &&
            compsFemininesAffichees.map((comp) => (
              <BlocCompetition
                key={comp.id}
                id={comp.id}
                nom={comp.nom}
                pays={comp.pays}
                drapeaux={comp.drapeaux}
                clubs={comp.clubs}
                note={comp.note}
                niveau={comp.niveau}
                feminin={true}
                onClub={(club) => setFiche({ club, competition: comp.nom, feminin: true })}
              />
            ))}

          {zone === 'Nations' && (
            <>
              {selectionsAffichees.seniors.length > 0 && (
                <BlocSelections
                  titre={t('ch.seniors')}
                  emoji="drapeau"
                  note={t('ch.noteSeniors')}
                  selections={selectionsAffichees.seniors}
                />
              )}
              {selectionsAffichees.u20.length > 0 && (
                <BlocSelections
                  titre={t('ch.u20')}
                  emoji="pousse"
                  note={t('ch.noteU20')}
                  selections={selectionsAffichees.u20}
                />
              )}
            </>
          )}
        </>
      )}

      {fiche && (
        <FicheClub
          club={fiche.club}
          competition={fiche.competition}
          saison={saison}
          feminin={fiche.feminin}
          onFermer={() => setFiche(null)}
        />
      )}
    </motion.section>
  );
}

function BlocSelections({
  titre, emoji, note, selections,
}: {
  titre: string;
  emoji: string;
  note: string;
  selections: Selection[];
}) {
  return (
    <div className="carte bloc-competition">
      <div className="comp-tete">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span className="comp-emoji">{emoji}</span>
          <b>{titre}</b>
        </div>
        <span className="comp-count">{selections.length} {t('ch.selections')}</span>
      </div>
      <div className="comp-note">ℹ️ {note}</div>

      <div className="grille-clubs">
        {selections.map((sel) => (
          <div key={sel.nom} className="club-carte carte-selection">
            <LogoEquipe nom={sel.nom} logo={sel.logo} taille={40} />
            <div style={{ minWidth: 0 }}>
              <div className="club-nom">{nomSelectionTraduit(sel.nom, sel.nation)}</div>
              <div className="club-ville">
                {tn('ch.competitions', sel.competitions.length, { n: sel.competitions.length })}
              </div>
            </div>
            {aDrapeau(sel.nation) && <Drapeau nation={sel.nation} taille={1.15} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function BlocCompetition({
  id, nom, pays, drapeaux, clubs, note, niveau, feminin = false, onClub,
}: {
  id: string;
  nom: string;
  pays: string;
  drapeaux: string[];
  clubs: Club[];
  note?: string;
  /** Étage de la compétition (0 = Top 14, 10 = Régionale 3) : c'est autour de
   *  lui que se tire la note d'un club amateur. */
  niveau: number;
  feminin?: boolean;
  onClub: (club: Club) => void;
}) {
  return (
    <div className="carte bloc-competition">
      <div className="comp-tete">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <LogoCompet id={id} taille={30} titre={nom} />
          <b>{nom}</b>
          <span className="comp-pays" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            {drapeaux.map((d) => (
              <span key={d} className={`fi fi-${d}`} style={{ borderRadius: '2px' }} />
            ))}
            {nomNationTraduit(pays)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {note && <span className="comp-badge-note">{note}</span>}
          <span className="comp-count">{clubs.length} {t('gen.clubs')}</span>
        </div>
      </div>

      <div className="grille-clubs">
        {clubs.map((club) => (
          <button
            key={`${id}-${club.nom}`}
            type="button"
            className="club-carte"
            onClick={() => onClub(club)}
            title={`${t('ch.voirEffectif')} - ${club.nom}`}
          >
            <Blason club={club} taille={40} />
            <div style={{ minWidth: 0 }}>
              <div className="club-nom">{club.nom}</div>
              {club.ville && <div className="club-ville">{club.ville}{club.departementNum ? ` (${club.departementNum})` : ''}</div>}
            </div>
            <span className="club-note" title={t('ch.noteClub')}>
              {noteAffichee(club.nom, niveau, feminin)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function nomSelectionTraduit(nom: string, nation: string): string {
  return /\bU20\b/.test(nom) ? `${nomNationTraduit(nation)} U20` : nomNationTraduit(nation);
}
