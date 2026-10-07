import type { Manager } from '../types';
import type { Coequipier } from '../lib/effectif';
import type { EtatCarriereAvancee, ReponseDiscussion } from '../lib/carriereAvancee';
import { Selecteur } from './Selecteur';
import { t } from '../lib/i18n';
import './InfirmerieManager.css';

export function VestiaireManagerSimple({ manager, effectif, avancee, capitaines, repondre, demande }: {
  manager: Manager; effectif: Coequipier[]; avancee: EtatCarriereAvancee;
  capitaines: (a: string, b: string, c: string) => void;
  repondre: (id: string, r: ReponseDiscussion) => void;
  demande: (id: string, accepter: boolean) => void;
}) {
  const presents = new Set(effectif.map(j => j.id));
  const profils = Object.values(avancee.vestiaire).filter(p => presents.has(p.joueurId));
  const moral = profils.length ? Math.round(profils.reduce((n, p) => n + p.moral, 0) / profils.length) : 0;
  const leaders = avancee.profonde.capitaines;
  const capitaine = leaders.capitaineId || manager.composition.capitaineId;
  const vice = leaders.viceCapitaineId;
  const mecontents = profils.filter(p => p.satisfaction < 47);
  const discussions = avancee.discussions.filter(d => d.etat === 'ouverte' && presents.has(d.joueurId));
  const demandes = manager.demandes.filter(d => d.etat === 'ouverte' && presents.has(d.joueurId) && !discussions.some(x => x.joueurId === d.joueurId));
  const problemes = avancee.profonde.relations.filter(r => ['rivalite', 'conflit'].includes(r.type) && r.intensite >= 70 && presents.has(r.joueurA) && presents.has(r.joueurB));
  const options = [{ valeur: '', label: t('staff.dressing.undesignated') }, ...effectif.map(j => ({ valeur: j.id, label: j.nom }))];
  const motifs: Record<string, string> = { tempsDeJeu: t('staff.dressing.playTime'), contrat: t('staff.dressing.contract'), depart: t('staff.dressing.departure'), role: t('staff.dressing.role'), resultats: t('staff.dressing.results'), pret: t('staff.dressing.loan') };
  const humeur = moral >= 75 ? t('staff.dressing.veryGood') : moral >= 60 ? t('staff.dressing.good') : moral >= 45 ? t('staff.dressing.mixed') : t('staff.dressing.tense');
  const cadres = profils.filter(p => ['leader', 'influent'].includes(p.rang) && ![capitaine, vice].includes(p.joueurId)).slice(0, 2).map(p => p.nom).join(', ') || t('staff.dressing.noSeniorPlayers');
  return <div className="vestiaire27">
    <section className="carte resume27"><div><small>{t('staff.dressing.mood')}</small><h2>{humeur}</h2></div><div><small>{t('staff.dressing.averageMorale')}</small><p><b>{moral} %</b></p></div></section>
    <section className="carte"><h3>{t('staff.dressing.leaders')}</h3><div className="leaders27"><label>{t('staff.dressing.captain')}<Selecteur options={options.filter(o => !o.valeur || o.valeur !== vice)} valeur={capitaine} onChange={id => capitaines(id, vice, leaders.troisiemeCapitaineId)} recherche /></label><label>{t('staff.dressing.viceCaptain')}<Selecteur options={options.filter(o => !o.valeur || o.valeur !== capitaine)} valeur={vice} onChange={id => capitaines(capitaine, id, leaders.troisiemeCapitaineId)} recherche /></label></div><p>{t('staff.dressing.seniorPlayers', { names: cadres })}</p></section>
    <section className="carte"><h3>{t('staff.dressing.unhappy')}</h3>{mecontents.length ? <ul>{mecontents.map(p => { const d = discussions.find(d => d.joueurId === p.joueurId) ?? demandes.find(d => d.joueurId === p.joueurId); return <li key={p.joueurId}><b>{p.nom}</b> — {d ? motifs[d.type] : t('staff.dressing.lowMorale')}</li>; })}</ul> : <p>{t('staff.dressing.noUnhappy')}</p>}</section>
    <section className="carte"><h3>{t('staff.dressing.importantIssues')}</h3>{problemes.length ? <ul>{problemes.map(r => <li key={r.id}>{t('staff.dressing.conflict', { a: effectif.find(j => j.id === r.joueurA)?.nom ?? '', b: effectif.find(j => j.id === r.joueurB)?.nom ?? '' })}</li>)}</ul> : <p>{t('staff.dressing.noConflict')}</p>}{avancee.promesses.filter(p => p.etat === 'active' && presents.has(p.joueurId)).map(p => <p key={p.id}>{t('staff.dressing.promise', { name: p.nom, progress: p.progression, target: p.objectif, week: p.echeance })}</p>)}</section>
    {(discussions.length > 0 || demandes.length > 0) && <section className="carte"><h3>{t('staff.dressing.importantTalks')}</h3>{discussions.map(d => <article className="discussion-joueur" key={d.id}><b>{d.nom} — {motifs[d.type]}</b><p>{d.texte}</p><div><button onClick={() => repondre(d.id, 'promettre')}>{t('staff.dressing.promiseAction')}</button><button onClick={() => repondre(d.id, 'merite')}>{t('staff.dressing.explainChoices')}</button><button onClick={() => repondre(d.id, 'aucunePromesse')}>{t('staff.dressing.noPromise')}</button></div></article>)}{demandes.map(d => <article className="discussion-joueur" key={d.id}><b>{d.nom} — {motifs[d.type]}</b><div><button onClick={() => demande(d.id, true)}>{t('staff.dressing.accept')}</button><button onClick={() => demande(d.id, false)}>{t('staff.dressing.explainRefusal')}</button></div></article>)}</section>}
  </div>;
}
