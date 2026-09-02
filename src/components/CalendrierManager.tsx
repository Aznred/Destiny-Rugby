import { useMemo, useState } from 'react';
import { CALENDRIER, libelleDate, libelleSemaine, SEMAINES_PAR_SAISON, semaine } from '../data/calendrier';
import { afficheDuClub, affichesChampionnatDuClub, libelleAfficheManager } from '../lib/matchLive';
import { nbQualifies } from '../lib/phaseFinale';
import { pouleDe } from '../lib/championnat';
import { divisionAuDessus, nomDivision } from '../lib/promotion';
import { useGame } from '../store/useGame';
import { Icone } from './Icone';
import './CalendrierManager.css';

export function CalendrierManager({ onMatch }: { onMatch: () => void }) {
  const manager = useGame((s) => s.manager)!;
  const avancer = useGame((s) => s.avancerJusquaManager);
  const repondre = useGame((s) => s.repondreDecisionManager);
  const [cible, setCible] = useState(manager.semaine + 1);
  const [deleguer, setDeleguer] = useState(true);
  const [bilan, setBilan] = useState<ReturnType<typeof avancer> | null>(null);
  const selection = Math.min(SEMAINES_PAR_SAISON + 1, Math.max(manager.semaine + 1, cible));
  const dateCible = selection > SEMAINES_PAR_SAISON ? 'la saison suivante' : libelleDate(semaine(selection));
  const prochaine = afficheDuClub(manager);
  const aJouer = prochaine && !manager.resultats[prochaine.cle];
  const auDessus = divisionAuDessus(manager.division);
  const qualifies = nbQualifies(pouleDe(manager.division, manager.club).length);
  const lignes = useMemo(() => CALENDRIER.map((date) => {
    const resultats = Object.values(manager.resultats).filter((r) => r.saison === manager.saison
      && r.club === manager.club && r.semaine === date.numero);
    // Ne pas révéler une qualification ni un adversaire à élimination directe
    // avant d'avoir joué les tours précédents.
    const pouleEurope = date.type === 'coupe' && CALENDRIER.slice(0, date.numero).filter((s) => s.type === 'coupe').length <= 4;
    const affiche = date.type === 'championnat' || date.numero === manager.semaine || pouleEurope
      ? afficheDuClub({ ...manager, semaine: date.numero }) : null;
    const affiches = date.type === 'championnat'
      ? affichesChampionnatDuClub({ ...manager, semaine: date.numero }) : affiche ? [affiche] : [];
    return { date, resultats, affiche, affiches };
  }), [manager]);
  const motifs = {
    arrive: 'Date atteinte.', match: 'Un match attend ton coaching.',
    decision: 'Réponds à la décision du club pour continuer.',
    saison: 'Saison clôturée : le nouveau calendrier est prêt.', sansBanc: 'Signe un nouveau banc pour continuer.',
  };
  const lancer = (prochainRendezVous = false) => {
    const r = avancer(prochainRendezVous ? SEMAINES_PAR_SAISON : selection, prochainRendezVous ? false : deleguer);
    setBilan(r);
  };
  return <section className="manager-calendrier">
    <div className="carte manager-cal-commandes">
      <div className="comp-tete"><div><b><Icone nom="calendrier" taille={19} /> Calendrier · saison {manager.saison}</b>
        <small>Aujourd’hui : {libelleDate(semaine(manager.semaine))} · semaine {manager.semaine}/{SEMAINES_PAR_SAISON}</small></div>
        {aJouer && <button className="btn primaire" onClick={onMatch}>Coacher le match</button>}
      </div>
      <p>Les {qualifies} premiers de ta poule disputent les playoffs en juin.
        {auDessus ? ` Le vainqueur monte en ${nomDivision(auDessus)} ; le finaliste joue un barrage d’accès.` : ' Le vainqueur de la finale remporte le titre.'}</p>
      <div className="manager-cal-avance">
        <label>Date cible<select aria-label="Date cible" value={selection} onChange={(e) => setCible(Number(e.target.value))}>
          {CALENDRIER.filter((s) => s.numero > manager.semaine).map((s) =>
            <option key={s.numero} value={s.numero}>{libelleDate(s)} · {libelleSemaine(s, manager.saison)}</option>)}
          <option value={SEMAINES_PAR_SAISON + 1}>Clore la saison et commencer la suivante</option>
        </select></label>
        <label className="manager-cal-delegation"><input type="checkbox" checked={deleguer} onChange={(e) => setDeleguer(e.target.checked)} />
          Confier les matchs au staff pendant l’avance</label>
        <div className="manager-cal-boutons">
          <button className="btn primaire" onClick={() => lancer()}>Avancer jusqu’à {dateCible}</button>
          <button className="btn fantome" onClick={() => lancer(true)}>Prochain rendez-vous</button>
        </div>
      </div>
      <small>Les matchs avant la date choisie sont simulés et leurs résultats conservés. Décoche l’option pour t’arrêter avant chaque match. Une décision du club reste à résoudre.</small>
      {bilan && <p className="manager-avance-bilan" role="status">{bilan.semaines} semaine{bilan.semaines > 1 ? 's' : ''} avancée{bilan.semaines > 1 ? 's' : ''} · {motifs[bilan.arret]}</p>}
      {manager.decision && <div className="manager-cal-decision"><b>{manager.decision.titre}</b><p>{manager.decision.texte}</p>
        {manager.decision.choix.map((c) => <button className="btn fantome" key={c.id} onClick={() => repondre(manager.decision!.id, c.id)}>{c.label}</button>)}
      </div>}
    </div>
    <div className="manager-cal-grille" aria-label="Programme de la saison">
      {lignes.map(({ date, resultats, affiche, affiches }) => {
        const actuelle = date.numero === manager.semaine;
        const future = date.numero > manager.semaine;
        return <button type="button" key={date.numero} disabled={!future && !actuelle}
          className={`carte manager-cal-date ${date.type}${actuelle ? ' actuelle' : ''}${future && selection === date.numero ? ' choisie' : ''}`}
          aria-current={actuelle ? 'date' : undefined}
          onClick={() => actuelle && aJouer ? onMatch() : future && setCible(date.numero)}>
          <span className="manager-cal-date-tete"><b>{libelleDate(date)}</b><small>{actuelle ? 'AUJOURD’HUI' : `S${date.numero}`}</small></span>
          <strong>{affiches.length > 1 ? `${manager.divisionNom} · Journées ${affiches.map((a) => a.journee).join(' / ')}`
            : date.type === 'phaseFinale' ? libelleSemaine(date, manager.saison) : affiche ? libelleAfficheManager(affiche, manager.divisionNom) : libelleSemaine(date, manager.saison)}</strong>
          {resultats.map((r) => <span className="manager-cal-score" key={r.cle}><b>{r.scorePour} – {r.scoreContre}</b> {r.adversaire}</span>)}
          {affiches.filter((a) => !manager.resultats[a.cle]).map((a) => <span key={a.cle}>{a.match.domicile === manager.club ? 'Domicile' : 'Extérieur'} · {a.match.domicile === manager.club ? a.match.exterieur : a.match.domicile}</span>)}
          {!affiche && !resultats.length && <span>{date.type === 'phaseFinale' || date.type === 'coupe'
            ? (future ? 'Selon qualification · adversaire à confirmer' : 'Pas de match du club') : 'Repos, préparation et vie du club'}</span>}
        </button>;
      })}
    </div>
  </section>;
}
