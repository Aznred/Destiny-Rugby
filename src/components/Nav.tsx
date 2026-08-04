import { useGame } from '../store/useGame';
import { t } from '../lib/i18n';
import { clubParNom } from '../data/clubs';
import { Blason } from './Blason';
import type { Ecran } from '../types';

interface NavProps {
  onReglages: () => void;
}

export function Nav({ onReglages }: NavProps) {
  const ecran = useGame((s) => s.ecran);
  const setEcran = useGame((s) => s.setEcran);
  const joueur = useGame((s) => s.joueur);
  // Pastille de notifications non lues sur l'onglet L'Ovale.
  const nonLues = useGame((s) => (s.notifsSocial ?? []).filter((n) => !n.lue).length);

  // L'onglet Carrière porte l'écusson du club où l'on évolue.
  const clubData = joueur ? clubParNom(joueur.club) : undefined;

  const lien = (cible: Ecran, label: string, icone?: React.ReactNode) => (
    <button className={ecran === cible ? 'actif' : ''} onClick={() => setEcran(cible)}>
      {icone}
      {label}
    </button>
  );

  return (
    <nav className="nav">
      <button
        className="marque"
        onClick={() => setEcran('accueil')}
        style={{ background: 'none', border: 'none' }}
      >
        <span className="balle">🏉</span>
        <span className="mot">
          Destiny <b>Rugby</b>
        </span>
      </button>
      <div className="liens">
        {lien('accueil', t('nav.accueil'))}
        {joueur
          ? lien(
              'carriere',
              t('nav.carriere'),
              clubData ? (
                <span className="nav-logo" title={joueur.club}>
                  <Blason club={clubData} taille={20} />
                </span>
              ) : undefined,
            )
          : lien('creation', t('nav.creer'))}
        {joueur && lien('profil', t('nav.profil'))}
        {joueur && (
          <button
            className={ecran === 'social' ? 'actif' : ''}
            onClick={() => setEcran('social')}
            title={t('nav.ovale')}
          >
            <span className="nav-x">𝕏</span>
            L’Ovale
            {nonLues > 0 && <i className="nav-badge">{nonLues > 9 ? '9+' : nonLues}</i>}
          </button>
        )}
        {lien('championnats', t('nav.clubs'))}
        {lien('classement', t('nav.classement'))}
        {lien('pantheon', t('nav.hall'))}
        {lien('boutique', t('nav.boutique'))}
        <button onClick={onReglages} title={t('nav.reglages')}>⚙️</button>
      </div>
    </nav>
  );
}
