import { t } from '../lib/i18n';
import type { ValidationClassement as Validation } from '../lib/validationClassement';
import './ValidationClassement.css';
export function BadgeValidationClassement({ validation }: { validation?: Validation | null }) {
  const statut = validation?.statut ?? 'PENDING_VALIDATION';
  return <span className={`cv-badge cv-${statut}`}>{t(statut === 'PENDING_VALIDATION' ? 'cl38.provisoire' : `cl38.${statut}`)}</span>;
}
export function EtatValidationClassement({ validation, erreur, synchroniser }: { validation: Validation; erreur?: string; synchroniser?: () => void }) {
  return <section className={`cv-etat cv-${validation.statut}`} aria-live="polite">
    <strong>{t(`cl38.${validation.statut}`)}</strong>
    {validation.statut !== 'ELIGIBLE' && <p>{t(validation.statut === 'REJECTED' ? 'cl38.refusAide' : 'cl38.attente')}</p>}
    {erreur && <p role="status">{erreur}</p>}
    {!validation.recompensesAutorisees && validation.statut !== 'REJECTED' && <small>{t('cl38.recompenses')}</small>}
    {validation.regles.length > 0 && <details><summary>{t('cl38.details')}</summary><p>{t('cl38.risque',{score:validation.riskScore})}</p>
      <ul>{validation.regles.map(r=><li key={r.id}>{r.detail}</li>)}</ul></details>}
    {synchroniser && <button type="button" className="btn fantome petit" onClick={synchroniser}>{t('cl38.synchroniser')}</button>}
  </section>;
}
