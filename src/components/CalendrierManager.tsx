import { useMemo, useState } from 'react';
import { CALENDRIER, libelleDate, libelleSemaine, SEMAINES_PAR_SAISON, semaine } from '../data/calendrier';
import { afficheDuClub, affichesChampionnatDuClub, libelleAfficheManager } from '../lib/matchLive';
import { nbQualifies } from '../lib/phaseFinale';
import { pouleDe, estJourneeDe } from '../lib/championnat';
import { divisionAuDessus, nomDivision } from '../lib/promotion';
import { useGame } from '../store/useGame';
import { Icone } from './Icone';
import './CalendrierManager.css';
import { programmeInternational } from '../data/calendrierMondial';
import { QualificationsMondial } from './CalendrierMondial';
import { FriseCalendrier } from './FriseCalendrier';
import type { EtapeCalendrier } from './FriseCalendrier';

export function CalendrierManager({ onMatch }: { onMatch: () => void }) {
  const manager = useGame((s) => s.manager)!;
  const avancer = useGame((s) => s.avancerJusquaManager);
  const repondre = useGame((s) => s.repondreDecisionManager);
  const [choix, setChoix] = useState({ saison: manager.saison, numero: manager.semaine + 1 });
  const [deleguer, setDeleguer] = useState(true);
  const [bilan, setBilan] = useState<ReturnType<typeof avancer> | null>(null);
  const selection = choix.saison === manager.saison ? choix.numero : manager.semaine + 1;
  const setCible = (numero: number) => setChoix({ saison: manager.saison, numero });
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
    const championnat = estJourneeDe(manager.division, date);
    const affiche = championnat || date.numero === manager.semaine || pouleEurope
      ? afficheDuClub({ ...manager, semaine: date.numero }) : null;
    const affiches = championnat
      ? affichesChampionnatDuClub({ ...manager, semaine: date.numero }) : affiche ? [affiche] : [];
    return { date, resultats, affiche, affiches };
  }), [manager]);
  const etapes: EtapeCalendrier[] = lignes.map(({ date, resultats, affiche, affiches }) => {
    const future = date.numero > manager.semaine;
    const titre = affiches.length > 1 ? `${manager.divisionNom} · Journées ${affiches.map((a) => a.journee).join(' / ')}`
      : date.type === 'phaseFinale' ? libelleSemaine(date, manager.saison)
      : affiche ? libelleAfficheManager(affiche, manager.divisionNom) : libelleSemaine(date, manager.saison);
    const adversaire = affiche ? (affiche.match.domicile === manager.club ? affiche.match.exterieur : affiche.match.domicile) : null;
    return {
      numero: date.numero, type: affiche?.nature === 'championnat' ? 'championnat' : date.type,
      titre, repere: date.numero === SEMAINES_PAR_SAISON ? 'Clôture' : date.type === 'phaseFinale' ? libelleSemaine(date, manager.saison)
        : affiche?.nature === 'championnat' ? `Championnat · J${affiches.map((a) => a.journee).join(' / ')}`
        : date.type === 'coupe' ? 'Coupe d’Europe' : date.type === 'treve' ? 'Préparation' : 'Championnat',
      resume: resultats.length ? resultats.map((r) => `${r.scorePour} – ${r.scoreContre} · ${r.adversaire}`).join(' / ')
        : adversaire ?? (date.type === 'coupe' || date.type === 'phaseFinale' ? 'Selon qualification' : 'Vie du club'),
      selections: programmeInternational(date.numero, manager.saison),
      contenu: <>
        {resultats.map((r) => <span className="manager-cal-score" key={r.cle}><b>{r.scorePour} – {r.scoreContre}</b> {r.adversaire}</span>)}
        {affiches.filter((a) => !manager.resultats[a.cle]).map((a) => <span key={a.cle}>{a.match.domicile === manager.club ? 'Domicile' : 'Extérieur'} · {a.match.domicile === manager.club ? a.match.exterieur : a.match.domicile}</span>)}
        {!affiche && !resultats.length && <span>{date.type === 'phaseFinale' || date.type === 'coupe'
          ? (future ? 'Selon qualification · adversaire à confirmer' : 'Pas de match du club') : 'Repos, préparation et vie du club'}</span>}
      </>,
    };
  });
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
    <div className="carte manager-cal-commandes manager-cal-principal">
      <div className="comp-tete"><div><b><Icone nom="calendrier" taille={19} /> Calendrier · saison {manager.saison}</b>
        <small>Aujourd’hui : {libelleDate(semaine(manager.semaine))} · semaine {manager.semaine}/{SEMAINES_PAR_SAISON}</small></div>
        {aJouer && <button className="btn primaire" onClick={onMatch}>Coacher le match</button>}
      </div>
      <FriseCalendrier saison={manager.saison} numero={manager.semaine} selection={selection} onSelection={setCible} etapes={etapes} actions={<>
        <label className="manager-cal-delegation"><input type="checkbox" checked={deleguer} onChange={(e) => setDeleguer(e.target.checked)} />
          Confier les matchs au staff</label>
        <div className="manager-cal-boutons">
          <button className="btn primaire" disabled={selection <= manager.semaine} onClick={() => lancer()}>
            {selection <= manager.semaine ? 'Choisis une date à venir' : `Avancer jusqu’à ${dateCible}`} <Icone nom="fleche-droite" taille={16} /></button>
          <button className="btn fantome" onClick={() => lancer(true)}>Prochain rendez-vous</button>
        </div>
        <small>{deleguer ? 'Matchs simulés, résultats conservés.' : 'Arrêt avant chaque match à coacher.'} Les décisions restent à résoudre.</small>
      </>} />
      {bilan && <p className="manager-avance-bilan" role="status">{bilan.semaines} semaine{bilan.semaines > 1 ? 's' : ''} avancée{bilan.semaines > 1 ? 's' : ''} · {motifs[bilan.arret]}</p>}
      {manager.decision && <div className="manager-cal-decision"><b>{manager.decision.titre}</b><p>{manager.decision.texte}</p>
        {manager.decision.choix.map((c) => <button className="btn fantome" key={c.id} onClick={() => repondre(manager.decision!.id, c.id)}>{c.label}</button>)}
      </div>}
    </div>
    <p className="manager-cal-reglement"><Icone nom="trophee" taille={16} /> Playoffs en juin · {qualifies} qualifiés par poule.
      {auDessus ? ` Le vainqueur monte en ${nomDivision(auDessus)} ; le finaliste joue le barrage d’accès.` : ' Le vainqueur de la finale remporte le titre.'}</p>
    <QualificationsMondial saison={manager.saison} numero={manager.semaine} />
    {!!manager.avancee?.convocations.length && <details className="carte manager-cal-commandes"><summary>Convocations et rassemblements · {manager.avancee.convocations.length} joueurs</summary>
      {manager.avancee.convocations.map((c) => <p key={c.id}>{c.nom} · {c.nation} · {c.competition}<br />
        Du {libelleDate(semaine(c.debut))} au {libelleDate(semaine(c.fin))} · {manager.semaine < c.debut ? 'Départ à venir' : 'Indisponible pour le club'}</p>)}
    </details>}
  </section>;
}
