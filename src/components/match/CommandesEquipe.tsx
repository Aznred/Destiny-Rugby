import { useState } from 'react';
import type { PilotageDirect, SnapPilotage, Intention } from '../../lib/controleDirect/pilotage';
import { t } from '../../lib/i18n';
import { type OptionNeuf, type OrdreEquipe } from '../../lib/moteur/equipeSolo';
import { libelleDeTouche } from '../../lib/controleDirect/touches';
import { lirePreferencesControle } from '../../lib/controleDirect/prefs';
import { ACTIONS_SORTIE_NEUF, GESTES_SORTIE_NEUF, NOMS_MANETTE_NEUF } from '../../lib/controleDirect/sortiesNeuf';
import { LIBELLES_MANETTE } from '../../lib/controleDirect/manette';

const OPTIONS_NEUF: OptionNeuf[]=['dix','gauche','droite','pick','box','depart'];
const ORDRES_EQUIPE: OrdreEquipe[]=['large','serre','cellules','pick','pied','occupation','rapide','lent'];
export function CommandesEquipe({ pilotage, snap }: {pilotage:PilotageDirect;snap:SnapPilotage}) {
  const [ouvert,setOuvert]=useState<'tactique'|'pied'|null>(null);
  const eq=snap.equipe;
  if (!eq || snap.pause) return null;
  const touches=lirePreferencesControle().touches;
  const modificateur=libelleDeTouche(touches.action[0]);
  const envoyer=(i:Intention)=> {pilotage.tactile.file.push(i); /* Un clic souris conserve les indications clavier. */ };
  return <div className="ce-hud" data-ruck={eq.sortie?'oui':undefined}>
    <div className="ce-joueur"><span className="ce-numero">{eq.numero}</span><b>{eq.nom}</b>
      <button type="button" disabled={eq.sortie||!!snap.pack||!!snap.resp.panneau} onClick={()=>envoyer({type:'changerJoueur'})} title={t('ce.changerAide')}>
        {t('ce.changer')} <kbd>{snap.appareil==='manette'?'L3':snap.appareil==='clavier'?libelleDeTouche(lirePreferencesControle().touches.changerJoueur[0]):'↔'}</kbd>
      </button>
    </div>
    {eq.sortie && !snap.resp.panneau && !ouvert && <div className="ce-sortie"><span>{t('ce.sortie')}</span>
      <small>{t(snap.appareil==='tactile'?'ce.balayagesAide':snap.appareil==='manette'?'ce.combinaisonsManette':'ce.combinaisonsClavier',{touche:modificateur})}</small><div>
      {OPTIONS_NEUF.map(o=><div key={o} className="ce-combinaison" data-disponible={eq.options.includes(o)?'oui':'non'}>
        <kbd>{snap.appareil==='tactile'?GESTES_SORTIE_NEUF[o]:snap.appareil==='manette'?`${LIBELLES_MANETTE[snap.manette].lt} + ${LIBELLES_MANETTE[snap.manette][NOMS_MANETTE_NEUF[o]]}`:`${modificateur} + ${libelleDeTouche(touches[ACTIONS_SORTIE_NEUF[o]][0])}`}</kbd><span>{t(`ce.option.${o}`)}</span>
      </div>)}
    </div></div>}
    <div className="ce-raccourcis">
      {!snap.attaque && snap.possible.plaquage && <button onClick={()=>envoyer({type:'plaquageOffensif'})}>{t('ce.plaquageOffensif')}</button>}
      {!snap.attaque && snap.possible.contreRuck && <button onClick={()=>envoyer({type:'contreRuck'})}>{t('ce.contreRuck')}</button>}
      <button aria-expanded={ouvert==='tactique'} onClick={()=>setOuvert(o=>o==='tactique'?null:'tactique')}>{t('ce.consigne')}{eq.ordre?` · ${t(`ce.ordre.${eq.ordre}`)}`:''}</button>
      {snap.porte && snap.libre && <button aria-expanded={ouvert==='pied'} onClick={()=>setOuvert(o=>o==='pied'?null:'pied')}>{eq.pied?t(`ce.pied.${eq.pied}`):t('ce.pied')}{snap.appareil==='manette'?' · R3':snap.appareil==='clavier'?` · ${libelleDeTouche(lirePreferencesControle().touches.typePied[0])}`:''}</button>}
    </div>
    {ouvert==='tactique'&&<div className="ce-options">{ORDRES_EQUIPE.map(ordre=><button key={ordre} aria-pressed={eq.ordre===ordre} onClick={()=>{envoyer({type:'ordreEquipe',ordre});setOuvert(null);}}>{t(`ce.ordre.${ordre}`)}</button>)}</div>}
    {ouvert==='pied'&&snap.porte&&<div className="ce-options">{(['rasant','parDessus','chandelle','transversale','degagement'] as const).map(intention=><button key={intention} onClick={()=>{envoyer({type:'piedPrecis',intention});setOuvert(null);}}>{t(`ce.pied.${intention}`)}</button>)}<button onClick={()=>{envoyer({type:'drop',auto:true,x:0,y:1});setOuvert(null);}}>{t('cd.act.drop')}</button></div>}
  </div>;
}
