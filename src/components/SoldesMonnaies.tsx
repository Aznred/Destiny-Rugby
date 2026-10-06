// LES DEUX SOLDES, TOUJOURS VISIBLES ENSEMBLE (Correctif 21) : « Ovas : 24 850 » et « Crédits : 1 200 », chacun avec SON icône
// (pièce dorée ronde / jeton octogonal bleu). Impossible de confondre les deux monnaies.
import { useGame } from '../store/useGame';
import { nombre, t } from '../lib/i18n';
import { PieceOvas } from './PieceOvas';
import { PieceCredits } from './PieceCredits';
import { BoutonAcheterCredits } from './ModalesMonnaie';

export function SoldesMonnaies({ recharge = true, className = '' }: { recharge?: boolean; className?: string }) {
  const ovas = useGame((s) => s.coins);
  const credits = useGame((s) => s.credits);
  return (
    <div className={`soldes-monnaies ${className}`} role="group" aria-label={t('mo.vosSoldes')}>
      <span className="solde-monnaie ovas" title={t('mo.ovasAide')}><PieceOvas taille={24} /><span>Ovas :</span><b>{nombre(ovas)}</b></span>
      <span className="solde-monnaie credits" title={t('mo.creditsAide')}><PieceCredits taille={26} variante="boutique" /><span>{t('mo.credits')} :</span><b>{nombre(credits)}</b></span>
      {recharge && <BoutonAcheterCredits />}
    </div>
  );
}
