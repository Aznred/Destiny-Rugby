import { useId } from 'react';
import { useGame } from '../store/useGame';
import { DUREES_MI_TEMPS_SOLO } from '../lib/dureeMatchSolo';
import { t } from '../lib/i18n';
import './ChoixDureeMatch.css';

/** Le même choix à la création et dans les réglages de la carrière. */
export function ChoixDureeMatch() {
  const id = useId();
  const duree = useGame(s => s.dureeMiTempsSolo);
  const choisir = useGame(s => s.setDureeMiTempsSolo);
  return (
    <fieldset className="champ choix-duree-match" aria-describedby={`${id}-aide ${id}-total`}>
      <legend>{t('match.duree.titre')}</legend>
      <div className="choix-duree-match-options">
        {DUREES_MI_TEMPS_SOLO.map(minutes => (
          <label key={minutes} className={duree === minutes ? 'actif' : ''}>
            <input type="radio" name={id} value={minutes} checked={duree === minutes}
              onChange={() => choisir(minutes)} />
            <span>{t('match.duree.minutes', { n: minutes })}</span>
          </label>
        ))}
      </div>
      <p className="choix-duree-match-total" id={`${id}-total`} aria-live="polite">
        {t('match.duree.total', { n: duree * 2 })}
      </p>
      <p className="aide" id={`${id}-aide`}>{t('match.duree.aide')}</p>
      <p className="aide">{t('match.duree.prochains')}</p>
    </fieldset>
  );
}
