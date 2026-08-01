import { useState } from 'react';
import { motion } from 'framer-motion';
import 'flag-icons/css/flag-icons.min.css';
import { useGame } from '../store/useGame';
import { COMPETITIONS } from '../data/clubs';
import { COUPES_EUROPE } from '../data/mondeReel';
import { SELECTIONS_SENIOR, SELECTIONS_U20, type Selection } from '../data/selections';
import { Drapeau, aDrapeau } from '../components/Drapeau';
import { LogoCompet } from '../components/LogoCompet';
import { NOTE_CLUB_REEL } from '../data/effectifsReels';
import { Blason, LogoEquipe } from '../components/Blason';
import { FicheClub } from '../components/FicheClub';
import type { Club } from '../types';

type Zone = 'France' | 'Monde' | 'Nations';

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
      <div className="eyebrow">Clubs & Championnats</div>
      <h1>🌍 L'atlas de l'ovalie</h1>
      <p style={{ color: 'var(--craie-dim)', maxWidth: '64ch', margin: '0.6rem 0 1.2rem' }}>
        La pyramide française du Top 14 à la Fédérale 3, les grands championnats
        du monde et les sélections nationales. <b>Clique sur un club</b> pour
        ouvrir son effectif complet.
      </p>

      <div className="onglets">
        <button className={zone === 'France' ? 'actif' : ''} onClick={() => setZone('France')}>
          🇫🇷 France
        </button>
        <button className={zone === 'Monde' ? 'actif' : ''} onClick={() => setZone('Monde')}>
          🌐 Monde
        </button>
        <button className={zone === 'Nations' ? 'actif' : ''} onClick={() => setZone('Nations')}>
          🏳️ Sélections
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
            onClub={(club) => setFiche({ club, competition: coupe.nom })}
          />
        ))}

      {zone === 'Nations' && (
        <>
          <BlocSelections
            titre="Sélections séniors"
            emoji="🏳️"
            note="Les équipes nationales premières — une seule par pays : ni équipes A, ni XV, ni sélections d'invitation."
            selections={SELECTIONS_SENIOR}
          />
          <BlocSelections
            titre="Sélections U20"
            emoji="🌱"
            note="Les moins de 20 ans : la pépinière où se repèrent les futurs internationaux."
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
        <span className="comp-count">{selections.length} sélections</span>
      </div>
      <div className="comp-note">ℹ️ {note}</div>

      <div className="grille-clubs">
        {selections.map((sel) => (
          <div key={sel.nom} className="club-carte carte-selection">
            <LogoEquipe nom={sel.nom} logo={sel.logo} taille={40} />
            <div style={{ minWidth: 0 }}>
              <div className="club-nom">{sel.nom}</div>
              <div className="club-ville">
                {sel.competitions.length} compétition{sel.competitions.length > 1 ? 's' : ''}
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
  id, nom, emoji, pays, drapeaux, clubs, note, onClub,
}: {
  id: string;
  nom: string;
  emoji: string;
  pays: string;
  drapeaux: string[];
  clubs: Club[];
  note?: string;
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
            {pays}
          </span>
        </div>
        <span className="comp-count">{clubs.length} clubs</span>
      </div>
      {note && <div className="comp-note">ℹ️ {note}</div>}

      <div className="grille-clubs">
        {clubs.map((club) => (
          <button
            key={`${id}-${club.nom}`}
            type="button"
            className="club-carte"
            onClick={() => onClub(club)}
            title={`Voir l'effectif de ${club.nom}`}
          >
            <Blason club={club} taille={40} />
            <div style={{ minWidth: 0 }}>
              <div className="club-nom">{club.nom}</div>
              {club.ville && <div className="club-ville">{club.ville}</div>}
            </div>
            {NOTE_CLUB_REEL[club.nom] !== undefined && (
              <span className="club-note" title="Note générale du club">
                {NOTE_CLUB_REEL[club.nom]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
