import type { Manager } from '../types';
import type { Coequipier } from '../lib/effectif';
import type { EtatCarriereAvancee, DecisionMedicale } from '../lib/carriereAvancee';
import { bilanMedical, CENTRES_MEDICAUX, centreMedical, niveauMedical, STATUTS_MEDICAUX, autorisationMedicale, dateMedicale } from '../lib/infirmerieManager';
import { locale, nombre, t, tn } from '../lib/i18n';
import { nomPoste } from '../data/rugby';
import { Icone } from './Icone';
import './InfirmerieManager.css';

export function InfirmerieManager({ manager, effectif, avancee, decider, ameliorer }: {
  manager: Manager; effectif: Coequipier[]; avancee: EtatCarriereAvancee;
  decider: (id: string, choix: Exclude<DecisionMedicale, 'attente'>) => void; ameliorer: () => void;
}) {
  const niveau = niveauMedical(manager), centre = centreMedical(manager), suivant = CENTRES_MEDICAUX[niveau];
  const joueurs = new Map(effectif.map(j => [j.id, j]));
  const dossiers = avancee.medical.filter(d => d.phase !== 'clos' && joueurs.has(d.joueurId));
  const date = (d: Date) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return <div className="infirmerie27">
    <section className="carte centre-medical27">
      <div><div className="eyebrow">{t('staff.med.title')} · {t('staff.med.level', { n: niveau })}</div><h2><Icone nom="soin" taille={22} /> {centre.nom}</h2>
        <p>{t('staff.med.care')}</p>
        <div className="medical27-chiffres"><span>{t('staff.med.recovery')} <b>+{Math.round((centre.vitesse - 1) * 100)} %</b></span><span>{t('staff.med.prevention')} <b>+{Math.round(centre.prevention * 100)} %</b></span><span>{t('staff.med.reinjury')} <b>−{Math.round(centre.reductionRechute * 100)} %</b></span><span>{t('staff.med.returnAccuracy')} <b>± {centre.precision} {tn('staff.med.day', centre.precision)}</b></span></div>
      </div>
      <div><b>{t('staff.med.budget', { amount: nombre(manager.budgetStructure) })}</b>{suivant ? <><p>{t('staff.med.levelNext', { n: niveau + 1, name: suivant.nom })}</p><button className="btn principal" disabled={manager.budgetStructure < suivant.prix} onClick={ameliorer}>{t('staff.med.upgrade', { amount: nombre(suivant.prix) })}</button>{manager.budgetStructure < suivant.prix && <small>{t('staff.med.insufficient')}</small>}</> : <p>{t('staff.med.maxLevel')}</p>}</div>
    </section>
    <section className="medical27-dossiers" aria-label={t('staff.med.injuredPlayers')}>
      <h3>{dossiers.length} {t(dossiers.length === 1 ? 'staff.med.playerTracked' : 'staff.med.playersTracked')}</h3>
      {!dossiers.length && <p className="carte">{t('staff.med.allFit')}</p>}
      {dossiers.map(d => {
        const j = joueurs.get(d.joueurId)!, bilan = bilanMedical(d, manager), droit = autorisationMedicale(d);
        const reprisePossible = ['collective', 'risque'].includes(bilan.statut) && (!d.protocoleCommotion || bilan.statut === 'risque');
        return <article className={`carte dossier27 ${bilan.statut}`} key={d.id}>
          <header>{j.photo ? <img src={j.photo} alt={j.nom} loading="lazy" /> : <span className="portrait27"><Icone nom="profil" taille={32} /></span>}<div><h3>{j.nom}</h3><small>{nomPoste(j.poste)}</small><h4>{d.type}{d.rechute && ' · rechute'}</h4></div><b className="statut27">{STATUTS_MEDICAUX[bilan.statut]}</b></header>
          <dl><div><dt>{t('staff.med.severity')}</dt><dd>{t(d.gravite === 'grave' ? 'staff.med.severe' : d.gravite === 'moyenne' ? 'staff.med.moderate' : 'staff.med.mild')}</dd></div><div><dt>{t('staff.med.injuryDate')}</dt><dd>{date(bilan.dateBlessure)}</dd></div><div><dt>{t('staff.med.estimatedAbsence')}</dt><dd>{bilan.absence ? tn('staff.med.daysToReturn', bilan.absence, { n: bilan.absence }) : t('staff.med.returning')}</dd></div><div><dt>{t('staff.med.estimatedReturn')}</dt><dd>{date(bilan.retour)} · ± {bilan.precision} {tn('staff.med.day', bilan.precision)}</dd></div><div><dt>{t('staff.med.medicalFitness')}</dt><dd>{bilan.aptitude} %</dd></div><div><dt>{t('staff.med.conditionRhythm')}</dt><dd>{d.condition ?? 60} % / {d.rythme ?? 50} %</dd></div><div><dt>{t('staff.med.riskIfSelected')}</dt><dd>{bilan.risqueLibelle} · {bilan.risque} %</dd></div><div><dt>{t('staff.med.recommendedMinutes')}</dt><dd>{bilan.minutes ? tn('staff.med.maximumMinute', bilan.minutes, { n: bilan.minutes }) : t('staff.med.noMatchRecommended')}</dd></div></dl>
          <label className="recuperation27">{t('staff.med.recovery')} <b>{d.guerison ?? 0} %</b><progress value={d.guerison ?? 0} max={100} /></label>
          {d.protocoleCommotion && <p>{t('staff.med.concussionProtocol')}</p>}
          {reprisePossible ? <><p>{t('staff.med.riskWarning')}</p><div className="medical27-actions"><button aria-pressed={droit === 'aucune'} onClick={() => decider(d.id, 'repos')}>{t('staff.med.restOnly')}</button><button aria-pressed={droit === 'banc'} onClick={() => decider(d.id, 'reprise20')}>{t('staff.med.benchOnly')}</button><button aria-pressed={droit === 'titulaire'} onClick={() => decider(d.id, 'retourDirect')}>{t('staff.med.allowStarter')}</button></div></> : <p>{t('staff.med.followUp')}</p>}
        </article>;
      })}
    </section>
    <section className="carte historique27"><h3>{t('staff.med.history')}</h3><p>{t('staff.med.historyHelp')}</p>
      {effectif.filter(j => avancee.profilsMedicaux[j.id]?.historique.length).map(j => <details key={j.id}><summary>{j.nom} · {tn('staff.med.injuryCount', avancee.profilsMedicaux[j.id].historique.length, { n: avancee.profilsMedicaux[j.id].historique.length })}</summary><ul>{avancee.profilsMedicaux[j.id].historique.slice().reverse().map((h, i) => <li key={i}>{h.type} — {dateMedicale(h.saison, h.semaine).getUTCFullYear()} — {h.jours === undefined ? t('staff.med.durationUnknown') : `${h.jours} ${tn('staff.med.day', h.jours)}`}{h.rechute && ` · ${t('staff.med.reinjury')}`}</li>)}</ul></details>)}
      {!effectif.some(j => avancee.profilsMedicaux[j.id]?.historique.length) && <p>{t('staff.med.noHistory')}</p>}
    </section>
  </div>;
}
