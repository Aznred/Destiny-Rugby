import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store/useGame';
import { t } from '../lib/i18n';
import { chantierVisible } from '../lib/modeDev';
import { clubParNom } from '../data/clubs';
import { Blason } from './Blason';
import { useModalDialog } from '../lib/useModalDialog';
import type { Ecran } from '../types';

interface NavProps {
  onReglages: () => void;
}

interface MenuMobileProps {
  ecran: Ecran;
  joueurPresent: boolean;
  onFermer: () => void;
  onNaviguer: (ecran: Ecran) => void;
  onReglages: () => void;
}

function MenuMobile({ ecran, joueurPresent, onFermer, onNaviguer, onReglages }: MenuMobileProps) {
  const { overlayRef, dialogRef } = useModalDialog(onFermer);
  const entree = (cible: Ecran, icone: string, label: string) => (
    <button
      type="button"
      className={ecran === cible ? 'actif' : ''}
      onClick={() => onNaviguer(cible)}
      aria-current={ecran === cible ? 'page' : undefined}
    >
      <span aria-hidden="true">{icone}</span>
      <b>{label}</b>
    </button>
  );

  return createPortal(
    <div ref={overlayRef} className="nav-mobile-fond" onClick={onFermer}>
      <div
        ref={dialogRef}
        className="nav-mobile-menu carte"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-mobile-menu-titre"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="nav-mobile-menu-tete">
          <h2 id="nav-mobile-menu-titre">{t('nav.menu')}</h2>
          <button type="button" className="nav-mobile-fermer" onClick={onFermer} aria-label={t('nav.fermerMenu')}>
            ✕
          </button>
        </div>
        <div className="nav-mobile-menu-grille">
          {joueurPresent && entree('profil', '👤', t('nav.profil'))}
          {entree('championnats', '🏟️', t('nav.clubs'))}
          {entree('classement', '🏆', t('nav.classement'))}
          {entree('pantheon', '⭐', t('nav.hall'))}
          {entree('boutique', '🛍️', t('nav.boutique'))}
          <button type="button" onClick={() => { onFermer(); onReglages(); }}>
            <span aria-hidden="true">⚙️</span>
            <b>{t('nav.reglages')}</b>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Nav({ onReglages }: NavProps) {
  const ecran = useGame((s) => s.ecran);
  const setEcran = useGame((s) => s.setEcran);
  const joueur = useGame((s) => s.joueur);
  const manager = useGame((s) => s.manager);
  const managerActif = chantierVisible('manager') ? manager : null;
  const nonLues = useGame((s) => (s.notifsSocial ?? []).filter((n) => !n.lue).length);
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);

  const clubData = joueur ? clubParNom(joueur.club) : managerActif?.club ? clubParNom(managerActif.club) : undefined;
  const carriereActive = !!joueur || !!managerActif;
  const naviguer = (cible: Ecran) => {
    setMenuMobileOuvert(false);
    setEcran(cible);
  };

  const lien = (cible: Ecran, label: string, icone?: React.ReactNode) => (
    <button
      type="button"
      className={ecran === cible ? 'actif' : ''}
      onClick={() => naviguer(cible)}
      aria-current={ecran === cible ? 'page' : undefined}
    >
      {icone}
      {label}
    </button>
  );

  const lienMobile = (cible: Ecran, label: string, icone: string, badge?: number) => (
    <button
      type="button"
      className={ecran === cible ? 'actif' : ''}
      onClick={() => naviguer(cible)}
      aria-current={ecran === cible ? 'page' : undefined}
      aria-label={label}
    >
      <span className="nav-mobile-icone" aria-hidden="true">{icone}</span>
      <span className="nav-mobile-label">{label}</span>
      {!!badge && <i className="nav-badge">{badge > 9 ? '9+' : badge}</i>}
    </button>
  );

  const ecransMenu: Ecran[] = carriereActive
    ? ['championnats', 'classement', 'pantheon', 'boutique']
    : ['pantheon', 'boutique'];
  const menuActif = menuMobileOuvert || ecransMenu.includes(ecran);

  return (
    <>
      <header className="nav">
        <button
          type="button"
          className="marque"
          onClick={() => naviguer('accueil')}
          aria-label={t('nav.accueil')}
        >
          <span className="balle" aria-hidden="true">🏉</span>
          <span className="mot">
            Destiny <b>Rugby</b>
          </span>
        </button>

        <nav className="liens nav-bureau" aria-label={t('nav.navigation')}>
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
            : managerActif
              ? lien(
                  'manager', t('mgr.bureau'),
                  clubData ? <span className="nav-logo" title={managerActif.club}><Blason club={clubData} taille={20} /></span> : undefined,
                )
              : lien('creation', t('nav.creer'))}
          {joueur && lien('profil', t('nav.profil'))}
          {carriereActive && (
            <button
              type="button"
              className={ecran === 'social' ? 'actif' : ''}
              onClick={() => naviguer('social')}
              title={t('nav.ovale')}
              aria-current={ecran === 'social' ? 'page' : undefined}
            >
              <span className="nav-x" aria-hidden="true">𝕏</span>
              L’Ovale
              {nonLues > 0 && <i className="nav-badge">{nonLues > 9 ? '9+' : nonLues}</i>}
            </button>
          )}
          {lien('championnats', t('nav.clubs'))}
          {lien('classement', t('nav.classement'))}
          {lien('pantheon', t('nav.hall'))}
          {lien('boutique', t('nav.boutique'))}
          <button type="button" onClick={onReglages} title={t('nav.reglages')} aria-label={t('nav.reglages')}>⚙️</button>
        </nav>

        <button
          type="button"
          className="nav-reglages-mobile"
          onClick={onReglages}
          aria-label={t('nav.reglages')}
        >
          ⚙️
        </button>
      </header>

      <nav className="nav-mobile" aria-label={t('nav.navigation')}>
        {lienMobile('accueil', t('nav.accueil'), '⌂')}
        {lienMobile(joueur ? 'carriere' : managerActif ? 'manager' : 'creation', joueur ? t('nav.carriere') : managerActif ? t('mgr.bureau') : t('nav.creer'), '🏉')}
        {carriereActive
          ? lienMobile('social', 'L’Ovale', '𝕏', nonLues)
          : lienMobile('championnats', t('nav.clubs'), '🏟️')}
        {joueur
          ? lienMobile('profil', t('nav.profil'), '👤')
          : managerActif
            ? lienMobile('tableau', t('mgr.resultatsMonde'), '📊')
            : lienMobile('classement', t('nav.classement'), '🏆')}
        <button
          type="button"
          className={menuActif ? 'actif' : ''}
          onClick={() => setMenuMobileOuvert(true)}
          aria-expanded={menuMobileOuvert}
          aria-haspopup="dialog"
          aria-label={t('nav.plus')}
        >
          <span className="nav-mobile-icone" aria-hidden="true">•••</span>
          <span className="nav-mobile-label">{t('nav.plus')}</span>
        </button>
      </nav>

      {menuMobileOuvert && (
        <MenuMobile
          ecran={ecran}
          joueurPresent={!!joueur}
          onFermer={() => setMenuMobileOuvert(false)}
          onNaviguer={naviguer}
          onReglages={onReglages}
        />
      )}
    </>
  );
}
