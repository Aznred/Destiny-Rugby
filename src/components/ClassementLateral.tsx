// LE CLASSEMENT, TOUJOURS SOUS LES YEUX
//
// Demande explicite : pas de bouton à cliquer pour voir où en est son club —
// le classement du championnat vit en permanence sur le côté de l'écran de
// carrière, et se met à jour journée après journée.

import { useMemo } from 'react';
import { LogoCompet } from './LogoCompet';
import { useGame, bonusClubDuJoueur } from '../store/useGame';
import { championnatEnDirect, journeesALaSemaine, nombreJournees } from '../lib/championnat';
import { phaseFinale } from '../lib/phaseFinale';
import { COMPETITIONS, clubParNom } from '../data/clubs';
import { Blason } from './Blason';
import { semaine } from '../data/calendrier';
import type { Joueur } from '../types';

export function ClassementLateral({ joueur }: { joueur: Joueur }) {
  const setEcran = useGame((s) => s.setEcran);
  const rythme = useGame((s) => s.rythme);
  const division = joueur.division;

  const vue = useMemo(() => {
    if (!division) return null;
    const total = nombreJournees(division, joueur.club);
    const bonus = bonusClubDuJoueur(joueur);
    // En « saison rapide » il n'y a pas de semaine : on affiche la saison
    // écoulée, la seule vraiment jouée. En « journée par journée », le
    // championnat en cours, arrêté à la dernière journée disputée.
    const rapide = rythme === 'saison';
    const saison = rapide ? Math.max(1, joueur.saison - 1) : joueur.saison;
    // ⚠️ Les divisions amateurs jouent AUSSI les week-ends de coupe d'Europe et
    // de Tournoi : `journeesALaSemaine` connaît le calendrier de chaque étage.
    const jouees = rapide && joueur.saison > 1
      ? total
      : journeesALaSemaine(division, joueur.semaine ?? 1, total);
    const etat = championnatEnDirect(division, saison, joueur.club, jouees, bonus);
    // La phase finale n'a de sens qu'une fois la saison régulière bouclée.
    const phase = jouees >= total ? phaseFinale(division, saison, joueur.club, bonus) : null;
    return { etat, total, jouees, phase, saison, rapide };
  }, [division, joueur, rythme]);

  if (!division || !vue) return null;
  const competition = COMPETITIONS.find((c) => c.id === division);
  const { etat, total, jouees, phase, saison, rapide } = vue;
  const dernieres = etat.journees[etat.journees.length - 1] ?? [];
  const notre = dernieres.find((m) => m.domicile === joueur.club || m.exterieur === joueur.club);
  const sem = semaine(joueur.semaine ?? 1);

  return (
    <aside
      className="carte classement-lateral"
      onClick={() => setEcran('tableau')}
      title="Voir tous les résultats, journée par journée"
    >
      <div className="cl-lat-tete">
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <LogoCompet id={competition?.id} emoji={competition?.emoji} taille={18} /> Classement
          </div>
          <b>{competition?.nom ?? 'Championnat'}</b>
        </div>
        <span className="cl-lat-journee" title={rapide ? `Saison ${saison}` : undefined}>
          {rapide ? `S${saison}` : `J${Math.min(jouees, total)}`}
          <em>{rapide ? '' : `/${total}`}</em>
        </span>
      </div>

      <div className="cl-lat-grille">
        {etat.classement.map((l) => {
          const club = clubParNom(l.club);
          const moi = l.club === joueur.club;
          return (
            <div key={l.club} className="cl-lat-ligne" data-moi={moi ? 'oui' : undefined}>
              <span className="cl-lat-pos" data-tete={l.position <= 6 ? 'oui' : undefined}>
                {l.position}
              </span>
              {club ? <Blason club={club} taille={16} /> : <span />}
              <span className="cl-lat-nom">{l.club}</span>
              <span className="cl-lat-j">{l.joues}</span>
              <span className="cl-lat-pts">{l.points}</span>
            </div>
          );
        })}
      </div>

      {phase ? (
        <div className="cl-lat-pied">
          <div className="eyebrow" style={{ marginBottom: '0.3rem' }}>🔥 Phase finale</div>
          {phase.matchs.map((m) => (
            <div
              key={m.libelle}
              className="cl-lat-affiche"
              data-moi={m.domicile === joueur.club || m.exterieur === joueur.club ? 'oui' : undefined}
            >
              <span>{m.domicile}</span>
              <b>{m.scoreD}-{m.scoreE}</b>
              <span>{m.exterieur}</span>
            </div>
          ))}
        </div>
      ) : notre ? (
        <div className="cl-lat-pied">
          <div className="eyebrow" style={{ marginBottom: '0.3rem' }}>Dernier match</div>
          <div className="cl-lat-affiche" data-moi="oui">
            <span>{notre.domicile}</span>
            <b>{notre.scoreD}-{notre.scoreE}</b>
            <span>{notre.exterieur}</span>
          </div>
          <div className="cl-lat-note">{sem.libelle}</div>
        </div>
      ) : (
        <div className="cl-lat-pied">
          <div className="cl-lat-note">{sem.libelle}</div>
        </div>
      )}
    </aside>
  );
}
