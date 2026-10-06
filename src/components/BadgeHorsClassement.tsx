import { t } from '../lib/i18n';

/**
 * LA PASTILLE « HORS CLASSEMENT » (Correctif 19) — discrète, jamais criarde, partout où l'on voit une carrière avec un
 * joueur existant : l'écran de carrière, le Panthéon, la confirmation du joueur choisi. Un seul composant, donc un seul
 * libellé et une seule infobulle : on sait toujours quel type de sauvegarde on joue.
 */
export function BadgeHorsClassement({ className = '' }: { className?: string }) {
  return (
    <span className={`badge-hors-classement ${className}`.trim()} title={t('car.horsClassement.aide')}>
      {t('car.horsClassement')}
    </span>
  );
}
