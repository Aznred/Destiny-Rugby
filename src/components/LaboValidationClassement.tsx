import { useEffect, useState } from 'react';
import { Selecteur } from './Selecteur';
import { BadgeValidationClassement } from './ValidationClassement';
import { locale, t } from '../lib/i18n';
import type { ValidationClassement } from '../lib/validationClassement';
interface Dossier {
  careerId:string;userId:string|null;pseudo:string;validation:ValidationClassement;revision:number;date:string;derniereSynchronisation:string;
  decision?:{action:string;auteur:string;motif:string;date:string};
}
export interface VueValidation { dossiers: Dossier[]; total: number; page: number; parPage: number; bilan: { total:number;normalementEligibles:number;visibles:number;rejetes:number;causes:[string,number][] } }
async function requete(filtre: string, page: number, corps?: unknown): Promise<VueValidation> {
  const reponse = await fetch(`/api/carriere?classementValidation=1&filtre=${encodeURIComponent(filtre)}&page=${page}`, {
    method: corps ? 'POST' : 'GET', credentials:'same-origin', cache:'no-store',
    headers:corps?{'Content-Type':'application/json'}:undefined, body:corps?JSON.stringify({action:'classementValidation',...corps as object}):undefined,
  });
  const donnees = await reponse.json(); if(!reponse.ok)throw new Error(donnees.erreur ?? 'Validation indisponible.'); return donnees;
}
export function LaboValidationClassement({ charger = requete }: { charger?: typeof requete }) {
  const [filtre,setFiltre]=useState('ALL'),[page,setPage]=useState(1),[vue,setVue]=useState<VueValidation|null>(null);
  const [erreur,setErreur]=useState(''),[occupe,setOccupe]=useState(false),[revision,setRevision]=useState(0),[message,setMessage]=useState('');
  const [motifs,setMotifs]=useState<Record<string,string>>({});
  useEffect(()=>{let actif=true;setErreur('');void charger(filtre,page).then(v=>{if(actif)setVue(v);}).catch(e=>{if(actif)setErreur(e.message);});return()=>{actif=false;};},[charger,filtre,page,revision]);
  const agir=async(d:Dossier,operation:string)=>{setOccupe(true);setErreur('');setMessage('');try{
    await charger(filtre,page,{operation,careerId:d.careerId,revision:d.revision,motif:motifs[d.careerId] ?? ''});
    setRevision(n=>n+1);setMessage('Vérification mise à jour.');
  }catch(e){setErreur((e as Error).message);}finally{setOccupe(false);}};
  const revalider=async()=>{setOccupe(true);setErreur('');let numero=1;let traites=0;try{
    for(;;){const retour=await charger('ALL',numero,{operation:'revalider',page:numero}) as unknown as {traites:number;suite:boolean};
      traites+=retour.traites;setMessage(`${traites} carrière(s) revérifiée(s).`);if(!retour.suite)break;numero++;}
    setRevision(n=>n+1);
  }catch(e){setErreur((e as Error).message);}finally{setOccupe(false);}};
  const date=(valeur:string)=>new Date(valeur).toLocaleString(locale());
  return <section className="cv-labo">
    <header><div><div className="eyebrow">Labo Kiri</div><h3>{t('cl38.labo')}</h3><p>Les sauvegardes de carrière restent intactes.</p></div>
      <div className="cv-actions"><button className="btn fantome" disabled={occupe} onClick={()=>setRevision(n=>n+1)}>{t('cl38.actualiser')}</button>
        <button className="btn primaire" disabled={occupe} onClick={()=>void revalider()}>{t('cl38.revalider')}</button></div></header>
    {erreur&&<p role="alert">{erreur}</p>}{message&&<p role="status">{message}</p>}
    {vue&&<><div className="cv-bilan"><span><b>{vue.bilan.normalementEligibles}</b> normalement éligibles</span><span><b>{vue.bilan.visibles}</b> visibles</span><span><b>{vue.bilan.rejetes}</b> rejetées</span></div>
      <details><summary>Principales règles déclenchées</summary><ul>{vue.bilan.causes.map(([id,n])=><li key={id}>{id} · {n}</li>)}</ul></details></>}
    <label>{t('cl38.filtre')}<Selecteur valeur={filtre} onChange={v=>{setFiltre(v);setPage(1);}} options={[
      {valeur:'ALL',label:'Toutes'},{valeur:'ELIGIBLE',label:'ELIGIBLE'},{valeur:'LIMITED',label:'LIMITED'},
      {valeur:'PENDING',label:'PENDING'},{valeur:'REJECTED',label:'REJECTED'},{valeur:'HIGH_RISK',label:'HIGH_RISK'}]} /></label>
    {vue?.dossiers.length===0&&<p>{t('cl38.vide')}</p>}
    {vue?.dossiers.map(d=><article className="cv-dossier" key={d.careerId}><h4>{d.pseudo} <BadgeValidationClassement validation={d.validation} /></h4>
      <div className="cv-identites"><span>userId : {d.userId ?? 'Sans compte · installation anonyme'}</span><span>careerId : {d.careerId}</span>
        <span>{t('cl38.risque',{score:d.validation.riskScore})}</span><span>Date : {date(d.date)}</span><span>Dernière synchronisation : {date(d.derniereSynchronisation)}</span></div>
      <ul>{d.validation.regles.map(r=><li key={r.id}><b>{r.id}</b> +{r.points} · {r.detail}{r.bloquante?' · blocage fort':''}</li>)}</ul>
      {d.decision&&<p>Décision Kiri : {d.decision.action} · {d.decision.motif}</p>}
      <input aria-label={`Motif pour ${d.pseudo}`} maxLength={300} placeholder="Motif de la décision" value={motifs[d.careerId] ?? ''} onChange={e=>setMotifs(m=>({...m,[d.careerId]:e.target.value}))} />
      <div className="cv-actions"><button className="btn primaire" disabled={occupe||d.validation.horsClassement||d.validation.regles.some(r=>r.bloquante && r.id!=='decision_kiri')} onClick={()=>void agir(d,'valider')}>{t('cl38.valider')}</button>
        <button className="btn fantome" disabled={occupe} onClick={()=>void agir(d,'refuser')}>{t('cl38.refuser')}</button>
        <button className="btn fantome" disabled={occupe} onClick={()=>void agir(d,'reinitialiser')}>{t('cl38.reinitialiser')}</button></div></article>)}
    {vue&&vue.total>50&&<div className="cv-actions"><button className="btn fantome" disabled={page<=1||occupe} onClick={()=>setPage(p=>p-1)}>Précédent</button><span>{page} / {Math.ceil(vue.total/50)}</span><button className="btn fantome" disabled={page*50>=vue.total||occupe} onClick={()=>setPage(p=>p+1)}>Suivant</button></div>}
  </section>;
}
