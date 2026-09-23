import { useState } from 'react';
import type { VueMatchEnLigne } from '../../lib/ligue/matchCarriere';
import { creerScenarioDirect } from '../../lib/ligue/scenarioDirect';
import TerrainEnDirect, { type CouleursDirect } from './TerrainEnDirect';
import { CadreTmoReplay } from './CadreTmoReplay';
import './DirectCinema.css';

const heure = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

const libelleMoment = (type: string, texte: string) =>
  type === 'essai' ? '🏉 ESSAI'
    : type === 'carton' ? (/rouge/i.test(texte) ? '🟥 CARTON ROUGE' : '🟨 CARTON JAUNE')
      : type === 'penalite' || type === 'faute' ? '⚖️ PÉNALITÉ'
        : type === 'but' ? '🎯 TIR RÉUSSI'
          : type === 'butRate' ? '❌ TIR MANQUÉ'
            : type === 'blessure' ? '🚑 BLESSURE'
              : type === 'remplacement' ? '🔄 REMPLACEMENT'
                : type === 'franchissement' ? '⚡ FRANCHISSEMENT'
                  : '⚡ ACTION IMPORTANTE';

export function DirectCinema({
  match: m,
  domicile,
  exterieur,
  couleurs,
  emblemes,
  modeDemo,
  pause,
  vitesseDemo,
}: {
  match: VueMatchEnLigne;
  domicile: string;
  exterieur: string;
  couleurs: CouleursDirect;
  emblemes?: { domicile?: string; exterieur?: string };
  modeDemo?: boolean;
  pause?: boolean;
  vitesseDemo?: number;
}) {
  const [selection, setSelection] = useState<string | null>(null);
  const moments = m.moments ?? [];
  const momentSelectionne = moments.find((v) => v.id === selection);
  const secondeCourante = (m.terrain?.horloge ?? m.horloge) * 60;
  const ligneDirect = [...(m.fil ?? [])]
    .reverse()
    .find((v) => !v.ordre && v.texte && (v.seconde ?? v.minute * 60) <= secondeCourante + 2);
  const dernierMoment = moments.at(-1);
  const ageMoment = dernierMoment ? secondeCourante - dernierMoment.seconde : Infinity;
  const momentVif = dernierMoment && ageMoment >= -2 && ageMoment <= 15 ? dernierMoment : undefined;
  const carton = m.terrain?.sifflet?.cle?.includes('cartonRouge') ? 'rouge'
    : m.terrain?.sifflet?.cle?.includes('cartonJaune') ? 'jaune'
    : momentVif?.type === 'carton' ? (/rouge/i.test(momentVif.texte) ? 'rouge' : 'jaune')
    : undefined;
  const scenario = m.terrain ? creerScenarioDirect(m.terrain) : undefined;
  const prep = m.terrain?.preparationTir;
  const commentaire =
    momentSelectionne?.texte ??
    momentVif?.texte ??
    ligneDirect?.texte ??
    (prep
      ? 'Concentration maximale du buteur face aux poteaux.'
      : scenario?.ballonLent
        ? 'La sortie est ralentie. La défense a le temps de se replacer.'
        : scenario?.intensite === 'forte'
          ? 'La défense recule, l’action peut basculer à tout instant.'
          : scenario?.intensite === 'active'
            ? 'Le ballon circule et l’attaque cherche l’intervalle.'
            : 'Les deux équipes se replacent et construisent la séquence suivante.');
  const bandeau = m.decision
    ? 'DÉCISION DU MANAGER'
    : momentSelectionne
      ? 'ACTION DU MATCH'
      : prep
        ? (prep.transformation ? 'TRANSFORMATION' : 'TIR AU BUT')
        : momentVif || scenario?.momentFort
          ? 'MOMENT FORT'
          : 'COMMENTAIRE EN DIRECT';

  const isTmo = Boolean((m.terrain?.phase === 'tmo' || m.terrain?.tmo?.actif) && m.terrain?.tmo);
  const alerteVif = Boolean(momentVif && ageMoment <= 6.5 && !isTmo);
  const alertePrep = Boolean(prep && !m.decision && (!momentVif || ageMoment > 6.5));
  const hasAlerte = Boolean(m.decision || alerteVif || alertePrep);

  return (
    <section className="dc" aria-label="Direct vidéo du match">
      <header className="dc-entete">
        <span>
          <i />
          {m.termine ? 'TERMINÉ' : 'EN DIRECT'} <b>MATCH ANIMÉ · 30 JOUEURS + ARBITRE</b>
        </span>
        <span>Terrain complet · animations rugby</span>
      </header>
      <div className="dc-score">
        <time>{heure(m.horloge * 60)}</time>
        <span style={{ borderColor: couleurs.domicile }}>{domicile}</span>
        <strong>
          {m.score.domicile} – {m.score.exterieur}
        </strong>
        <span style={{ borderColor: couleurs.exterieur }}>{exterieur}</span>
      </div>
      <div className={`dc-ecran ${isTmo ? 'dc-ecran-tmo' : ''} ${hasAlerte ? 'dc-ecran-alerte' : ''}`}>
        {m.terrain ? (
          <TerrainEnDirect
            key={m.id}
            terrain={m.terrain}
            nomDomicile={domicile}
            nomExterieur={exterieur}
            couleurs={couleurs}
            emblemes={emblemes}
            monCote={m.monCote}
            carton={carton}
            modeDemo={modeDemo}
            pause={pause}
            vitesseDemo={vitesseDemo}
          />
        ) : (
          <p className="dc-attente">
            {m.termine
              ? 'Match terminé. Retrouve toutes les actions ci-dessous.'
              : 'Les équipes prennent place…'}
          </p>
        )}
        {/* ---------- 📺 TMO : CADRE TÉLÉ REPLAY BROADCAST (L'ACTION RESTE VISIBLE AU CENTRE) ---------- */}
        {isTmo && m.terrain?.tmo && (
          <CadreTmoReplay
            action={m.terrain.tmo.action}
            decision={m.terrain.tmo.decision}
            explication={m.terrain.tmo.explication}
            cadreCamera={m.terrain.tmo.cadreCamera}
            horloge={heure(m.horloge * 60)}
          />
        )}

        {(m.decision || alerteVif) && (
          <div className={`dc-alerte-terrain dc-alerte-${m.decision ? 'penalite' : momentVif?.type}`} role="status">
            <b>{m.decision ? '⚖️ PÉNALITÉ · DÉCISION' : libelleMoment(momentVif!.type, momentVif!.texte)}</b>
            <span>
              {m.decision
                ? 'Choisis ton option ci-dessous'
                : momentVif!.texte}
            </span>
          </div>
        )}

        {alertePrep && (
          <div className="dc-alerte-terrain dc-alerte-penalite" role="status">
            <b>{prep?.transformation ? '🎯 TRANSFORMATION' : '🎯 TIR AU BUT'}</b>
            <span>Prise d’élan et concentration face aux poteaux…</span>
          </div>
        )}
      </div>
      <div className={`dc-commentaire ${momentVif || scenario?.momentFort ? 'fort' : ''}`} aria-live="polite">
        <span>
          {bandeau}
          {momentSelectionne
            ? ` · ${heure(momentSelectionne.seconde)} · ${momentSelectionne.score.domicile}–${momentSelectionne.score.exterieur}`
            : scenario
              ? ` · ${scenario.sequence}e phase`
              : ''}
        </span>
        <p>
          {m.decision
            ? 'Une pénalité à jouer : choisis ton option dans le panneau de décision.'
            : commentaire}
        </p>
        {selection && <button onClick={() => setSelection(null)}>Revenir au direct</button>}
      </div>
      <div className="dc-chiffres">
        {[
          ['Possession', `${m.stats.domicile.possession}%`, `${m.stats.exterieur.possession}%`],
          ['Mètres gagnés', m.stats.domicile.metres, m.stats.exterieur.metres],
          ['Plaquages', m.stats.domicile.plaquages, m.stats.exterieur.plaquages],
        ].map(([label, a, b]) => (
          <div key={label}>
            <span>{label}</span>
            <b>
              {a} <i>–</i> {b}
            </b>
          </div>
        ))}
      </div>
      <div className="dc-moments">
        <div className="dc-titre">
          <h3>Temps forts du match</h3>
          <span>{moments.length} actions</span>
        </div>
        <div className="dc-liste">
          {[...moments].reverse().map((v) => (
            <button key={v.id} aria-pressed={selection === v.id} onClick={() => setSelection(v.id)}>
              <time>{heure(v.seconde)}</time>
              <span>
                <b>
                  {v.cote === 'domicile' ? domicile : v.cote === 'exterieur' ? exterieur : 'Le match'}
                  {v.points ? ` · +${v.points} pts` : ''}
                </b>
                <small>{v.texte}</small>
              </span>
              <strong>
                {v.score.domicile}–{v.score.exterieur}
              </strong>
            </button>
          ))}
        </div>
        {!moments.length && <p className="dc-attente">Les actions importantes s’afficheront ici.</p>}
      </div>
    </section>
  );
}
