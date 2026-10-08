import { useEffect, useState } from 'react';
import type { PageSources } from '../../serveur/ffr/stockage';
import { POSTES, POSTE_PAR_ID } from '../data/rugby';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { rareteCarriere, statistiquesCarte } from '../lib/ligue/catalogueCarriere';
import type { CarteCarriere } from '../lib/ligue/typesCarriere';
import './LaboBaseJoueurs.css';
const FILTERS=[['','Tous'],['seniors','Seniors'],['youth','Jeunes'],['regens','Regens'],['low','Fiabilité faible'],['duplicates','Doublons'],['position','Sans poste'],['club','Sans club'],['overall','Sans GEN'],['review','À vérifier']] as const;
const UTILISATIONS:Record<string,string>={MALE_SENIOR_CARD:'Senior masculin',FEMALE_SENIOR_CARD:'Senior féminine',YOUTH_REGEN_SOURCE:'Vivier de formation',IGNORE:'Exclu',NEEDS_REVIEW:'Statut à vérifier'};
const STATUTS:Record<string,string>={ACTIVE_CARD:'Éligible',DATABASE_ONLY:'Base privée',LOW_CONFIDENCE:'Fiabilité faible',APPROVED:'Approuvé',REJECTED:'Rejeté',PENDING:'À vérifier'};
const RAISONS:Record<string,string>={NO_RECENT_MATCH_EVIDENCE:'Pas de saison récente',MISSING_POSITION:'Poste manquant',MISSING_CLUB:'Club manquant',UNKNOWN_COMPETITION_LEVEL:'Niveau de compétition à vérifier',LOW_IDENTITY_CONFIDENCE:'Identité insuffisamment confirmée',UNKNOWN_GENDER:'Genre inconnu',INSUFFICIENT_MATCHES:'Trop peu de matchs',ESPOIR_REQUIRES_SENIOR_EVIDENCE:'Statut senior à confirmer pour cet Espoir'};
type Profile=PageSources['joueurs'][number];
export function LaboBaseJoueurs(){
  const [q,setQ]=useState(''),[gender,setGender]=useState(''),[filter,setFilter]=useState('');
  const [after,setAfter]=useState(''),[history,setHistory]=useState<string[]>([]),[page,setPage]=useState<PageSources|null>(null);
  const [selected,setSelected]=useState<Profile|null>(null),[edit,setEdit]=useState<Record<string,unknown>>({});
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[report,setReport]=useState<unknown>(null);
  useEffect(()=>{setAfter('');setHistory([]);setSelected(null);},[q,gender,filter]);
  useEffect(()=>{
    const abort=new AbortController();
    const timer=setTimeout(()=>{
      const params=new URLSearchParams({baseJoueurs:'1',q,gender,filter,after,limit:'20'});
      void fetch(`/api/carriere?${params}`,{credentials:'same-origin',cache:'no-store',signal:abort.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.erreur);return data as PageSources;})
        .then(p=>{setPage(p);setError('');}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
    },250);return()=>{clearTimeout(timer);abort.abort();};
  },[q,gender,filter,after,revision]);
  const choose=(p:Profile)=>{setSelected(p);setEdit({position:p.primary_position??'',club:p.club??'',competition:p.competition??'',overall:p.overall,potential:p.potential,photo:p.photo??''});};
  const decide=async(decision:'APPROVE'|'REJECT'|'EDIT')=>{
    if(!selected)return;setBusy(true);setError('');
    try{
      const fields=Object.fromEntries(Object.entries(edit).filter(([,v])=>v!==null&&v!==''));
      const response=await fetch('/api/carriere?baseJoueurs=1',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'baseJoueurs',id:selected.id,revision:selected.revision,decision,...(decision==='EDIT'?{edit:fields}:{})})});
      const data=await response.json();if(!response.ok)throw new Error(data.erreur);setSelected(null);setRevision(v=>v+1);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  let preview:CarteCarriere|null=null;
  if(selected?.senior_status==='senior'&&edit.position&&POSTE_PAR_ID[String(edit.position) as CarteCarriere['poste']]&&Number(edit.overall)>0){
    const poste=String(edit.position) as CarteCarriere['poste'],famille=POSTE_PAR_ID[poste].famille,note=Number(edit.overall);
    preview={id:'preview',sourceId:selected.id,nom:selected.name,poste,famille,postesSecondaires:selected.secondary_positions,note,potentiel:Number(edit.potential??note),age:selected.age??25,
      nation:selected.countryId==='FR'?'France':selected.countryId,clubReel:String(edit.club??''),championnat:String(edit.competition??''),pays:selected.countryId,
      photo:typeof edit.photo==='string'?edit.photo:undefined,origine:'ffr',rarete:rareteCarriere(note),statistiques:statistiquesCarte(note,famille,selected.id),
      proprietaire:null,fatigue:0,matchs:0,essais:0,clubs:[],gender:selected.gender==='female'?'female':'male'};
  }
  return <section className="ffr-labo"><header><h2>Base joueurs</h2><p>Sources FFR privées, viviers fictifs et cartes seniors. Les féminines approuvées restent dans la bêta interne.</p><small>{page?.version??'Import non préparé'}</small></header>
    <div className="ffr-filters"><input aria-label="Rechercher un profil" placeholder="Début du nom ou identifiant source" value={q} onChange={e=>setQ(e.target.value)}/>
      <select aria-label="Genre" value={gender} onChange={e=>setGender(e.target.value)}><option value="">Hommes et femmes</option><option value="male">Hommes</option><option value="female">Femmes</option></select>
      <select aria-label="Filtre de qualité" value={filter} onChange={e=>setFilter(e.target.value)}>{FILTERS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
      <button onClick={()=>{setGender('female');setFilter('review');}}>Femmes → À vérifier</button>
      <button onClick={()=>{void fetch('/api/carriere?baseJoueurs=1&rapport=1',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(setReport).catch(e=>setError(e.message));}}>Rapport d’import</button>
    </div>{error&&<p role="alert">{error}</p>}{!!report&&<details open><summary>Rapport</summary><pre>{JSON.stringify(report,null,2)}</pre></details>}
    <div className="ffr-grid"><div><div className="ffr-table"><table><thead><tr><th>Profil</th><th>Club / compétition</th><th>Utilisation</th><th>GEN / POT</th><th>Fiabilité</th></tr></thead><tbody>
      {page?.joueurs.map(p=><tr key={p.id}><td><button onClick={()=>choose(p)}>{p.name}</button><small>{p.age_category} · {p.gender==='female'?'Femme':p.gender==='male'?'Homme':'Inconnu'}</small></td><td>{p.club??'Sans club'}<small>{p.competition??'Sans compétition'}</small></td><td>{UTILISATIONS[p.usage]}<small>{STATUTS[p.card_status]} · {STATUTS[p.review]}{p.duplicate?' · Doublon':''}</small></td><td>{p.overall??'—'} / {p.potential??'—'}</td><td>{Math.round(p.data_confidence*100)} %</td></tr>)}
    </tbody></table></div><div className="ffr-pager"><button disabled={!history.length} onClick={()=>{setAfter(history.at(-1)!);setHistory(h=>h.slice(0,-1));}}>Précédent</button><span>{page?.joueurs.length??0} profils sur cette page</span><button disabled={!page?.next} onClick={()=>{setHistory(h=>[...h,after]);setAfter(page!.next!);}}>Suivant</button></div></div>
    {selected&&<aside><h3>{selected.name}</h3><p>{selected.reasons.map(r=>RAISONS[r]??r).join(' · ')||'Critères sportifs satisfaits'}</p>{selected.age===null&&<p>Âge réel inconnu.</p>}
      {selected.usage==='YOUTH_REGEN_SOURCE'?<p>Cette source alimente uniquement les statistiques de formation. Son identité et sa photo ne sont pas utilisées dans les regens.</p>:<fieldset disabled={busy}>
        <label>Poste<select value={String(edit.position??'')} onChange={e=>setEdit(v=>({...v,position:e.target.value}))}><option value="">À vérifier</option>{POSTES.map(p=><option key={p.id} value={p.id}>{p.nom}</option>)}</select></label>
        {(['club','competition','photo'] as const).map(key=><label key={key}>{key==='club'?'Club':key==='photo'?'Photo autorisée':'Compétition'}<input value={String(edit[key]??'')} onChange={e=>setEdit(v=>({...v,[key]:e.target.value}))}/></label>)}
        {(['overall','potential'] as const).map(key=><label key={key}>{key==='overall'?'GEN':'POT'}<input type="number" min={1} max={99} value={edit[key]===null?'':String(edit[key]??'')} onChange={e=>setEdit(v=>({...v,[key]:e.target.value?Number(e.target.value):null}))}/></label>)}
        {selected.duplicate&&<label><input type="checkbox" checked={edit.duplicateResolution==='DISTINCT'} onChange={e=>setEdit(v=>({...v,duplicateResolution:e.target.checked?'DISTINCT':undefined}))}/>Identité distincte vérifiée</label>}
        {edit.duplicateResolution==='DISTINCT'&&<label>Preuves<input minLength={12} value={String(edit.duplicateEvidence??'')} onChange={e=>setEdit(v=>({...v,duplicateEvidence:e.target.value}))}/></label>}
        <button onClick={()=>void decide('EDIT')}>Enregistrer</button><button disabled={selected.card_status!=='ACTIVE_CARD'||selected.duplicate} onClick={()=>void decide('APPROVE')}>Approuver</button><button onClick={()=>void decide('REJECT')}>Rejeter</button>
      </fieldset>}{preview&&<div className="ffr-preview"><CarteJoueurEnLigne carte={preview}/><p>GEN {preview.note} · POT {preview.potentiel} · COL : club et nation · {preview.rarete}</p><small>Prévisualisation interne. Enregistrez vos modifications avant l’approbation.</small></div>}</aside>}
    </div></section>;
}
