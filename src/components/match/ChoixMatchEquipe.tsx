import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '../../lib/useModalDialog';
import { t } from '../../lib/i18n';
import { REGLAGES_EQUIPE, type ReglagesEquipe } from '../../lib/moteur/equipeSolo';
import { Selecteur } from '../Selecteur';
import { Icone } from '../Icone';
import './ControleDirect.css';

export function ChoixMatchEquipe({ surChoisir, surFermer }: {
  surChoisir: (mode: 'equipe' | 'coach', reglages: ReglagesEquipe) => void; surFermer: () => void;
}) {
  const [reglages, setReglages] = useState({ ...REGLAGES_EQUIPE });
  const { overlayRef, dialogRef } = useModalDialog(surFermer);
  return createPortal(<div className="overlay" ref={overlayRef} onClick={surFermer}>
    <div className="carte modale ce-avant-match" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="ce-choix-titre" tabIndex={-1} onClick={e=>e.stopPropagation()}>
      <h2 id="ce-choix-titre">{t('ce.choixTitre')}</h2>
      <p className="aide">{t('ce.choixAide')}</p>
      <div className="ce-modes">
        <button className="btn primaire" onClick={()=>surChoisir('equipe',reglages)}><Icone nom="manette" taille={24}/><b>{t('ce.jouer')}</b><span>{t('ce.jouerAide')}</span></button>
        <button className="btn fantome" onClick={()=>surChoisir('coach',reglages)}><Icone nom="sifflet" taille={24}/><b>{t('ce.regarder')}</b><span>{t('ce.regarderAide')}</span></button>
      </div>
      <div className="ce-reglages">
        {(['melees','touches','rucks'] as const).map(cle=><div key={cle}><label>{t(`ce.${cle}`)}</label><Selecteur valeur={reglages[cle]} options={[
          {valeur:'manuel',label:t('ce.manuel')},{valeur:cle==='rucks'?'assiste':'auto',label:t(cle==='rucks'?'ce.assiste':'ce.auto')}
        ]} onChange={v=>setReglages(r=>({...r,[cle]:v}))}/></div>)}
      </div>
      <p className="aide ce-reperes">{t('ce.commandesAide')}</p>
      <div className="rangee-fin"><button className="btn fantome" onClick={surFermer}>{t('gen.annuler')}</button></div>
    </div>
  </div>,document.body);
}
