import { tn, t } from '../lib/i18n';
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
    <summary>{t("ui.977486d12822", { v0: 2025 + edition })}</summary>
    <p>{t("ui.4fc5b31cf2de", { v0: cycle.automatiques.join(', ') })}</p>
    <p>{t("ui.3da9933e3db3")}</p>
    {cycle.regions.map((r) => <p key={r.competition.id}><b>{tn("ui.c5afadfbfbda", r.places, { v0: r.competition.nom.replace('Qualifications Mondial · ', ''), v1: r.places })}</b><br />
      {jouee(r.competition.id, r.competition.journees) ? r.qualifies.join(', ') : t("ui.8122791d7b66")}</p>)}
    <p><b>{t("ui.513baec929f2")}</b><br />{jouee('repechageMondial',3)
      ? t("ui.77fa525147bc") + cycle.vainqueurRepechage : t("ui.22666cf1ac96")}</p>
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
        : s.type === 'coupe' || s.type === 'phaseFinale' ? t("ui.8b851ce2a16d") : t("ui.43d81e2853df")}</span>,
      selections: programmeInternational(s.numero, joueur.saison),
    };
  });
  const situation = situationInternationale(joueur);
  const motifs = { arrive: 'Date atteinte.', question: 'Une décision attend ta réponse dans la carrière.',
    saison: 'Nouvelle saison commencée.', contrat: 'Ton contrat demande une décision.', fin: 'Carrière terminée.' };
  return <dialog ref={dialogue} className="calendrier-mondial-dialog" aria-labelledby="titre-calendrier-mondial" onCancel={onFermer}>
    <div className="manager-cal-commandes manager-cal-principal">
      <div className="comp-tete"><h2 id="titre-calendrier-mondial">{t("ui.e19bb3be835f", { v0: 2025 + joueur.saison, v1: 2026 + joueur.saison })}</h2>
        <button autoFocus className="btn fantome" onClick={onFermer}>{t("ov.fermer")}</button></div>
      <p className="manager-cal-present">{t("ui.83e4186bebf6", { v0: libelleDate(semaine(numero)), v1: joueur.club })}</p>
      <FriseCalendrier saison={joueur.saison} numero={numero} selection={destination}
        onSelection={(n) => setChoix({ saison: joueur.saison, numero: n })} etapes={etapes} actions={<>
          <button className="btn primaire" disabled={destination <= numero} onClick={() => setBilan(avancer(destination))}>
            {destination <= numero ? t("ui.d7a079a9a62f") : t("ui.c2ae6be294dd", { v0: dateCible })} <Icone nom="fleche-droite" taille={16} /></button>
          <small>{t("ui.37660d91ca87")}</small>
        </>} />
      {bilan && <p role="status">{t("ui.55a2d6dd5ddc", { v0: bilan.semaines, v1: motifs[bilan.arret] })}</p>}
      {situation.annonce && <p><b>{situation.camp ? t("compo.badge.international") : t("ui.6e0e01d6c13c")} · {situation.annonce.nation}</b><br />{t("ui.059f611af840", { v0: situation.annonce.nom, v1: libelleDate(semaine(situation.annonce.debut)), v2: libelleDate(semaine(situation.annonce.fin)) })}</p>}
    </div>
    <QualificationsMondial saison={joueur.saison} numero={numero} />
  </dialog>;
}
