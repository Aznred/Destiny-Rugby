// LE STOCKAGE DE L'APPAREIL EST PLEIN — on le dit, et on donne le moyen d'en sortir
//
// Une écriture refusée par le navigateur n'arrête plus le jeu (`lib/persistanceNavigation.ts`) : la partie continue en
// mémoire. Mais elle n'est plus ENREGISTRÉE, et ça ne peut pas rester muet — fermer l'onglet perdrait tout ce qui a
// été joué depuis. Ce bandeau n'apparaît que dans ce cas, et s'efface de lui-même dès qu'une écriture repasse.
//
// ⚠️ Le remède est à un toucher : la liste des parties, où l'on en supprime une ancienne. À sa fermeture on redemande
// une écriture tout de suite (`useGame.setState({})` : `persist` réécrit, rien ne change dans le jeu).

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EVENEMENT_STOCKAGE, stockagePlein } from '../lib/persistanceNavigation';
import { useModalDialog } from '../lib/useModalDialog';
import { useGame } from '../store/useGame';
import { t } from '../lib/i18n';
import { Icone } from './Icone';
import { Sauvegardes } from './Sauvegardes';

function FenetreParties({ onFermer }: { onFermer: () => void }) {
  const { overlayRef, dialogRef } = useModalDialog(onFermer);
  return (
    <div className="overlay sv-overlay" ref={overlayRef} onClick={onFermer}>
      <div className="sv-modale" ref={dialogRef} role="dialog" aria-modal="true" aria-label={t('sv.titre')} tabIndex={-1}
        onClick={(event) => event.stopPropagation()}>
        <Sauvegardes onFermer={onFermer} />
      </div>
    </div>
  );
}

export function AlerteStockage() {
  const [plein, setPlein] = useState(stockagePlein);
  const [parties, setParties] = useState(false);
  useEffect(() => {
    const suivre = (evenement: Event) => setPlein((evenement as CustomEvent<{ plein: boolean }>).detail.plein);
    window.addEventListener(EVENEMENT_STOCKAGE, suivre);
    return () => window.removeEventListener(EVENEMENT_STOCKAGE, suivre);
  }, []);
  if (!plein && !parties) return null;
  return createPortal(
    <>
      {plein && !parties && (
        <div className="alerte-stockage" role="alert">
          <Icone nom="alerte" taille={20} />
          <p><b>{t('stockage.plein.titre')}</b>{t('stockage.plein.texte')}</p>
          <button type="button" className="btn fantome petit" onClick={() => setParties(true)}>
            <Icone nom="disquette" taille={15} /> {t('stockage.plein.bouton')}
          </button>
        </div>
      )}
      {parties && <FenetreParties onFermer={() => { setParties(false); useGame.setState({}); }} />}
    </>,
    document.body,
  );
}
