import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store/useGame';
import { CALENDRIER, semaine, libelleDate, libelleSemaine, SEMAINES_PAR_SAISON } from '../data/calendrier';
import { programmeInternational, datesCompetitionInternationale } from '../data/calendrierMondial';
import { cycleQualification } from '../lib/qualificationsMondial';
import { situationInternationale } from '../lib/rassemblements';
import { afficheDuClub } from '../lib/matchLive';
import { estJourneeDe } from '../lib/championnat';
import { FriseCalendrier } from './FriseCalendrier';
import type { EtapeCalendrier } from './FriseCalendrier';
import { Icone } from './Icone';
import './CalendrierManager.css';

export function QualificationsMondial({ saison, numero }: { saison: number; numero: number }) {
  const edition = saison < 2 ? 2 : saison + (2 - saison % 4 + 4) % 4;
  const cycle = cycleQualification(edition);
  const anneeQualif = edition - 1;
  const jouee = (id: string, total: number) => saison > anneeQualif || (saison === anneeQualif
    && numero > (datesCompetitionInternationale(id, 'tournoi', total, anneeQualif).at(-1) ?? SEMAINES_PAR_SAISON));
  return <details className="carte manager-cal-commandes">
    <summary>Qualifications · Mondial {2025 + edition} · 24 nations</summary>
    <p>12 places automatiques : {cycle.automatiques.join(', ')}.</p>
    <p>Dans le jeu : 11 places régionales et 1 place au repêchage. Les deux premiers de chaque poule du Mondial précédent conservent leur place.</p>
    {cycle.regions.map((r) => <p key={r.competition.id}><b>{r.competition.nom.replace('Qualifications Mondial · ', '')} · {r.places} place{r.places > 1 ? 's' : ''}</b><br />
      {jouee(r.competition.id, r.competition.journees) ? r.qualifies.join(', ') : 'Qualifications en cours ou à venir · résultats au fil du calendrier'}</p>)}
    <p><b>Repêchage final · quatre nations · mai</b><br />{jouee('repechageMondial',3)
      ? 'Qualifié : ' + cycle.vainqueurRepechage : 'Une dernière place se joue sur trois journées.'}</p>
  </details>;
}

export function CalendrierMondial({ onFermer }: { onFermer: () => void }) {
  const joueur = useGame((s) => s.joueur)!;
  const avancer = useGame((s) => s.avancerJusqua);
  const [choix, setChoix] = useState({ saison: joueur.saison, numero: (joueur.semaine ?? 1) + 1 });
  const [bilan, setBilan] = useState<ReturnType<typeof avancer> | null>(null);
  const dialogue = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialogue.current!;
    d.showModal();
    return () => d.close();
  }, []);
  const numero = joueur.semaine ?? 1;
  const destination = choix.saison === joueur.saison ? choix.numero : numero + 1;
  const dateCible = destination > SEMAINES_PAR_SAISON ? 'la saison suivante' : libelleDate(semaine(destination));
  const etapes: EtapeCalendrier[] = CALENDRIER.map((s) => {
    const championnat = estJourneeDe(joueur.division ?? 'fed3', s);
    const affiche = championnat || s.numero === numero ? afficheDuClub({
      club: joueur.club, division: joueur.division ?? 'fed3', saison: joueur.saison, semaine: s.numero }) : null;
    const repere = s.numero === SEMAINES_PAR_SAISON ? 'Clôture' : championnat ? (affiche ? 'Championnat · J' + affiche.journee : 'Repos')
      : s.type === 'coupe' ? 'Coupe d’Europe' : s.type === 'treve' ? 'Préparation' : libelleSemaine(s, joueur.saison);
    return {
      numero: s.numero, type: championnat ? 'championnat' : s.type, repere,
      resume: affiche ? (affiche.match.domicile === joueur.club ? affiche.match.exterieur : affiche.match.domicile)
        : s.type === 'coupe' || s.type === 'phaseFinale' ? 'Selon qualification' : 'Vie du club',
      titre: championnat ? repere : libelleSemaine(s, joueur.saison),
      contenu: <span>{affiche ? `${affiche.match.domicile} – ${affiche.match.exterieur}`
        : s.type === 'coupe' || s.type === 'phaseFinale' ? 'Selon qualification · adversaire à confirmer' : 'Repos, préparation et vie du club'}</span>,
      selections: programmeInternational(s.numero, joueur.saison),
    };
  });
  const situation = situationInternationale(joueur);
  const motifs = { arrive: 'Date atteinte.', question: 'Une décision attend ta réponse dans la carrière.',
    saison: 'Nouvelle saison commencée.', contrat: 'Ton contrat demande une décision.', fin: 'Carrière terminée.' };
  return <dialog ref={dialogue} className="calendrier-mondial-dialog" aria-labelledby="titre-calendrier-mondial" onCancel={onFermer}>
    <div className="manager-cal-commandes manager-cal-principal">
      <div className="comp-tete"><h2 id="titre-calendrier-mondial">Calendrier mondial · {2025 + joueur.saison}–{2026 + joueur.saison}</h2>
        <button autoFocus className="btn fantome" onClick={onFermer}>Fermer</button></div>
      <p className="manager-cal-present">Aujourd’hui : {libelleDate(semaine(numero))} · {joueur.club}</p>
      <FriseCalendrier saison={joueur.saison} numero={numero} selection={destination}
        onSelection={(n) => setChoix({ saison: joueur.saison, numero: n })} etapes={etapes} actions={<>
          <button className="btn primaire" disabled={destination <= numero} onClick={() => setBilan(avancer(destination))}>
            {destination <= numero ? 'Choisis une date à venir' : `Avancer jusqu’à ${dateCible}`} <Icone nom="fleche-droite" taille={16} /></button>
          <small>Rencontres simulées, statistiques conservées. Arrêt sur une décision ou un contrat à régler.</small>
        </>} />
      {bilan && <p role="status">{bilan.semaines} semaine(s) avancée(s). {motifs[bilan.arret]}</p>}
      {situation.annonce && <p><b>{situation.camp ? 'En sélection' : 'Convocation annoncée'} · {situation.annonce.nation}</b><br />
        {situation.annonce.nom} · groupe de 34 · du {libelleDate(semaine(situation.annonce.debut))} au {libelleDate(semaine(situation.annonce.fin))}.</p>}
    </div>
    <QualificationsMondial saison={joueur.saison} numero={numero} />
  </dialog>;
}
