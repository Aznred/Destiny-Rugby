import { useState } from 'react';
import { motion } from 'framer-motion';

import { useGame } from '../store/useGame';
import { COMPETITIONS } from '../data/clubs';
import { COUPES_EUROPE } from '../data/mondeReel';
import { SELECTIONS_SENIOR, SELECTIONS_U20, type Selection } from '../data/selections';
import { Drapeau, aDrapeau, nomNationTraduit } from '../components/Drapeau';
import { LogoCompet } from '../components/LogoCompet';
import { NOTE_CLUB_REEL } from '../data/effectifsReels';
import { NOTE_CLUB_NOUVEAU } from '../data/nouvellesLigues';
import { noteAmateur } from '../lib/effectif';
import { Blason, LogoEquipe } from '../components/Blason';
import { FicheClub } from '../components/FicheClub';
import type { Club } from '../types';
import { t, tn } from '../lib/i18n';

type Zone = 'France' | 'Monde' | 'Nations';

// La note affichée sur la carte d'un club : celle de la base d'origine, sinon
// celle des nouvelles ligues, sinon celle qu'on tire pour lui.
//
// ⚠️ LES CLUBS AMATEURS EN ONT UNE MAINTENANT (retour de jeu : « les clubs de
// Nationale 2 à Régionale 3 n'ont pas leur générale marquée »). Elle n'était pas
// affichée parce qu'elle n'existait pas : tous les clubs d'un étage partageaient
// la note de leur division. `noteAmateur()` (lib/effectif.ts) la tire désormais
// du nom du club, de façon déterministe, et c'est LA MÊME qui sert à composer
// son effectif — la note affichée et l'équipe qu'on voit dans la fiche disent
// donc la même chose.
function noteAffichee(nom: string, niveau: number): number {
  return NOTE_CLUB_REEL[nom] ?? NOTE_CLUB_NOUVEAU[nom] ?? noteAmateur(nom, niveau);
}

export function Championnats() {
  const [zone, setZone] = useState<Zone>('France');
  // Club dont on affiche l'effectif (clic sur une carte).
  const [fiche, setFiche] = useState<{ club: Club; competition: string } | null>(null);
  // L'effectif est celui de la saison en cours si une carrière tourne.
  const saison = useGame((s) => s.joueur?.saison ?? 1);
  const comps = COMPETITIONS.filter((c) => c.zone === zone);

  return (
    <motion.section
      className="championnats"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="eyebrow">{t('ch.eyebrow')}</div>
      <h1>🌍 {t('ch.titre')}</h1>
      <p style={{ color: 'var(--craie-dim)', maxWidth: '64ch', margin: '0.6rem 0 1.2rem' }}>
        {t('ch.chapo')}
      </p>

      <div className="onglets">
        <button className={zone === 'France' ? 'actif' : ''} onClick={() => setZone('France')}>
          🇫🇷 {t('ch.france')}
        </button>
        <button className={zone === 'Monde' ? 'actif' : ''} onClick={() => setZone('Monde')}>
          🌐 {t('ch.monde')}
        </button>
        <button className={zone === 'Nations' ? 'actif' : ''} onClick={() => setZone('Nations')}>
          🏳️ {t('ch.selections')}
        </button>
      </div>

      {zone !== 'Nations' &&
        comps.map((comp) => (
          <BlocCompetition
            key={comp.id}
            id={comp.id}
            nom={comp.nom}
            emoji={comp.emoji}
            pays={comp.pays}
            drapeaux={comp.drapeaux}
            clubs={comp.clubs}
            note={comp.note}
            niveau={comp.niveau}
            onClub={(club) => setFiche({ club, competition: comp.nom })}
          />
        ))}

      {zone === 'Monde' &&
        COUPES_EUROPE.map((coupe) => (
          <BlocCompetition
            key={coupe.id}
            id={coupe.id}
            nom={coupe.nom}
            emoji={coupe.emoji}
            pays={coupe.pays}
            drapeaux={coupe.drapeaux}
            clubs={coupe.clubs}
            note={coupe.desc}
            // Une coupe d'Europe n'a pas d'étage propre : ses clubs viennent tous
            // de championnats notés, la valeur de repli ne sert donc jamais.
            niveau={0}
            onClub={(club) => setFiche({ club, competition: coupe.nom })}
          />
        ))}

      {zone === 'Nations' && (
        <>
          <BlocSelections
            titre={t('ch.seniors')}
            emoji="🏳️"
            note={t('ch.noteSeniors')}
            selections={SELECTIONS_SENIOR}
          />
          <BlocSelections
            titre={t('ch.u20')}
            emoji="🌱"
            note={t('ch.noteU20')}
            selections={SELECTIONS_U20}
          />
        </>
      )}

      {fiche && (
        <FicheClub
          club={fiche.club}
          competition={fiche.competition}
          saison={saison}
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
  id, nom, emoji, pays, drapeaux, clubs, note, niveau, onClub,
}: {
  id: string;
  nom: string;
  emoji: string;
  pays: string;
  drapeaux: string[];
  clubs: Club[];
  note?: string;
  /** Étage de la compétition (0 = Top 14, 10 = Régionale 3) : c'est autour de
   *  lui que se tire la note d'un club amateur. */
  niveau: number;
  onClub: (club: Club) => void;
}) {
  return (
    <div className="carte bloc-competition">
      <div className="comp-tete">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <LogoCompet id={id} emoji={emoji} taille={30} titre={nom} />
          <b>{nom}</b>
          <span className="comp-pays" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            {drapeaux.map((d) => (
              <span key={d} className={`fi fi-${d}`} style={{ borderRadius: '2px' }} />
            ))}
            {nomNationTraduit(pays)}
          </span>
        </div>
        <span className="comp-count">{clubs.length} {t('gen.clubs')}</span>
      </div>
      {note && <div className="comp-note">ℹ️ {note}</div>}

      <div className="grille-clubs">
        {clubs.map((club) => (
          <button
            key={`${id}-${club.nom}`}
            type="button"
            className="club-carte"
            onClick={() => onClub(club)}
            title={`${t('ch.voirEffectif')} — ${club.nom}`}
          >
            <Blason club={club} taille={40} />
            <div style={{ minWidth: 0 }}>
              <div className="club-nom">{club.nom}</div>
              {club.ville && <div className="club-ville">{club.ville}</div>}
            </div>
            {/* ⚠️ LA NOTE DES CLUBS DES NOUVELLES LIGUES MANQUAIT (retour de
                jeu). L'atlas ne lisait que `NOTE_CLUB_REEL` — les 143 clubs de
                la base d'origine. Les 183 clubs des 18 championnats ajoutés ont
                leur propre table, `NOTE_CLUB_NOUVEAU`, calculée sur leur vrai
                classement : la Didi 10 et la Serie A Elite s'affichaient donc
                sans aucune note. */}
            <span className="club-note" title={t('ch.noteClub')}>
              {noteAffichee(club.nom, niveau)}
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
