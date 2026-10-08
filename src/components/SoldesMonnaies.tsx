// LES SOLDES : « Ovas : 24 850 », et « Crédits : 1 200 » seulement pour qui en a encore (ils ne s'achètent plus : le jeu ne vend
// plus rien contre de l'argent réel). Chacun a SON icône (pièce dorée ronde / jeton octogonal bleu).
import { useGame } from '../store/useGame';
import { nombre, t } from '../lib/i18n';
import { PieceOvas } from './PieceOvas';
import { PieceCredits } from './PieceCredits';

export function SoldesMonnaies({ className = '' }: { className?: string }) {
  const ovas = useGame((s) => s.coins);
  const credits = useGame((s) => s.credits);
  return (
    <div className={`soldes-monnaies ${className}`} role="group" aria-label={t('mo.vosSoldes')}>
      <span className="solde-monnaie ovas" title={t('mo.ovasAide')}><PieceOvas taille={24} /><span>Ovas :</span><b>{nombre(ovas)}</b></span>
      {credits > 0 && <span className="solde-monnaie credits" title={t('mo.creditsAide')}><PieceCredits taille={26} variante="boutique" /><span>{t('mo.credits')} :</span><b>{nombre(credits)}</b></span>}
    </div>
  );
}
