import { useId } from 'react';
import { useGame } from '../store/useGame';
import { DIFFICULTES_CARRIERE } from '../lib/formeCarriere';
import { t } from '../lib/i18n';
import './ChoixDifficulteCarriere.css';

export function ChoixDifficulteCarriere() {
  const id = useId();
  const niveau = useGame(s => s.difficulteCarriere);
  const choisir = useGame(s => s.setDifficulteCarriere);
  return <fieldset className="champ choix-difficulte-carriere" aria-describedby={`${id}-aide`}>
    <legend>{t('forme.difficulte.titre')}</legend>
    <div className="difficulte-carriere-options">
      {DIFFICULTES_CARRIERE.map(n => <label key={n} className={n === niveau ? 'actif' : ''}>
        <input type="radio" name={id} value={n} checked={n === niveau} onChange={() => choisir(n)} />
        <b>{t(`forme.difficulte.${n}`)}</b><span>{t(`forme.difficulte.${n}.aide`)}</span>
      </label>)}
    </div>
    <p className="aide" id={`${id}-aide`}>{t('forme.difficulte.aide')}</p>
  </fieldset>;
}
