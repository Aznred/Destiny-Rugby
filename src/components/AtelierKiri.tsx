import { statistiquesCarte } from '../lib/ligue/statistiquesCarte';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { SourceCarte } from '../lib/ligue/catalogueCarriere';
import type { PackCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import './AtelierKiri.css';

interface Atelier { revision:number; packs:PackCarriere[]; joueurs:SourceCarte[]; total:number; championnats:string[]; nations:string[] }
const RARETES:RareteCarriere[]=['bronze','argent','or','elite','star'];
const nouveauPack=():PackCarriere=>({id:`kiri-${crypto.randomUUID().slice(0,8)}`,nom:'Mon nouveau pack',prix:1000,cartes:3,promesse:'',probabilites:{bronze:50,argent:35,or:14,elite:.9,star:.1},famille:'general'});
async function requete(q:string,corps?:unknown,signal?:AbortSignal) {
  const r=await fetch(`/api/carriere?atelier=1&q=${encodeURIComponent(q)}`,{method:corps?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:corps?{'Content-Type':'application/json'}:undefined,body:corps?JSON.stringify(corps):undefined,signal});
  const d=await r.json(); if(!r.ok)throw new Error(d.erreur??'Enregistrement impossible.'); return d;
}
export function AtelierKiri() {
  const [donnees,setDonnees]=useState<Atelier|null>(null),[q,setQ]=useState(''),[erreur,setErreur]=useState(''),[message,setMessage]=useState('');
  const [onglet,setOnglet]=useState<'packs'|'joueurs'>('packs'),[pack,setPack]=useState<PackCarriere>(nouveauPack),[joueur,setJoueur]=useState<SourceCarte|null>(null);
  const [revisionPack,setRevisionPack]=useState<number|null>(null),[revisionJoueur,setRevisionJoueur]=useState<number|null>(null);
  const [occupe,setOccupe]=useState(false),[actualisation,setActualisation]=useState(0);
  useEffect(()=>{
    const abort=new AbortController();
    const timer=setTimeout(()=>{void requete(q,undefined,abort.signal).then((d:Atelier)=>{setDonnees(d);setRevisionPack(r=>r??d.revision);setErreur('');}).catch((e:Error)=>{if(!abort.signal.aborted)setErreur(e.message);});},250);
    return()=>{clearTimeout(timer);abort.abort();};
  },[q,actualisation]);
  const sauver=async(operation:'pack'|'joueur')=>{
    if(!donnees)return;setOccupe(true);setErreur('');setMessage('');
    try {
      const retour=await requete(q,{action:'atelier',operation,revision:(operation==='pack'?revisionPack:revisionJoueur)??donnees.revision,...(operation==='pack'?{pack}:{sourceId:joueur?.sourceId,joueur:{note:joueur?.note,potentiel:joueur?.potentiel,photo:joueur?.photo,nation:joueur?.nation}})});
      if(operation==='pack')setRevisionPack(retour.revision);else setRevisionJoueur(retour.revision);
      setDonnees(d=>d?{...d,revision:retour.revision}:d);setActualisation(n=>n+1);
      setMessage('Enregistré pour toutes les ligues. Les changements apparaissent à leur prochaine actualisation.');
    }catch(e){setErreur((e as Error).message);}finally{setOccupe(false);}
  };
  const supprimerPack=async()=>{
    if(!donnees||!pack.id.startsWith('kiri-')||!donnees.packs.some(p=>p.id===pack.id))return;
    if(!window.confirm(`Supprimer définitivement « ${pack.nom} » de l’Atelier ?`))return;
    setOccupe(true);setErreur('');setMessage('');
    try {
      const retour=await requete(q,{action:'atelier',operation:'supprimerPack',revision:revisionPack??donnees.revision,packId:pack.id});
      setRevisionPack(retour.revision);setDonnees(d=>d?{...d,revision:retour.revision}:d);setPack(nouveauPack());setActualisation(n=>n+1);
      setMessage('Pack supprimé de l’Atelier et du catalogue des prochaines ligues.');
    }catch(e){setErreur((e as Error).message);}finally{setOccupe(false);}
  };
  const photo=async(fichier:File|undefined)=>{
    if(!fichier||!joueur)return;setErreur('');setOccupe(true);
    try {
      if(!['image/png','image/jpeg','image/webp'].includes(fichier.type)||fichier.size>10000000)throw new Error('Choisis une photo PNG, JPEG ou WebP de moins de 10 Mo.');
      const bitmap=await createImageBitmap(fichier),canvas=document.createElement('canvas');
      const ratio=Math.min(1,320/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
      canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const url=canvas.toDataURL('image/webp',.8);if(url.length>90000)throw new Error('Cette image reste trop lourde. Choisis une photo plus simple.');
      setJoueur(j=>j?{...j,photo:url}:j);setMessage('Photo prête dans l’aperçu. Enregistre le joueur pour la publier.');
    }catch(e){setErreur((e as Error).message);}finally{setOccupe(false);}
  };
  const soumettre=(operation:'pack'|'joueur')=>(e:FormEvent)=>{e.preventDefault();void sauver(operation);};
  const total=Object.values(pack.probabilites).reduce((a,b)=>a+b,0);
  const rarete=(note:number):RareteCarriere=>note>=88?'star':note>=80?'elite':note>=65?'or':note>=50?'argent':'bronze';
  return <section className="atelier-kiri">
    <header className="ak-entete"><div><div className="eyebrow">Administration · Kiri uniquement</div><h2>Atelier des packs & joueurs</h2><p>Un catalogue commun à toutes les ligues. Les matchs déjà commencés gardent leurs effectifs.</p></div><span className="ak-badge">GLOBAL</span></header>
    <nav className="ak-onglets" aria-label="Atelier Kiri"><button className={onglet==='packs'?'actif':''} onClick={()=>setOnglet('packs')}>Créer et modifier les packs</button><button className={onglet==='joueurs'?'actif':''} onClick={()=>setOnglet('joueurs')}>Joueurs · GEN & photos</button></nav>
    {erreur&&<p role="alert" className="ak-erreur">{erreur} <button onClick={()=>setActualisation(n=>n+1)}>Recharger l’atelier</button></p>}{message&&<p role="status" className="ak-succes">{message}</p>}
    {!donnees?<p>Chargement du catalogue…</p>:onglet==='packs'?<div className="ak-grille"><aside className="ak-liste"><button className="btn principal" disabled={occupe} onClick={()=>{setPack(nouveauPack());setRevisionPack(donnees.revision);setMessage('');}}>+ Créer un pack</button>{donnees.packs.map(p=><button key={p.id} disabled={occupe} className={pack.id===p.id?'selectionne':''} onClick={()=>{setPack(structuredClone(p));setRevisionPack(donnees.revision);setMessage('');}}><b>{p.nom}</b><small>{p.cartes} cartes · {p.prix.toLocaleString('fr-FR')} OVA</small></button>)}</aside>
      <form onSubmit={soumettre('pack')}><fieldset disabled={occupe}><legend>Réglages du pack</legend><label>Nom<input required maxLength={60} value={pack.nom} onChange={e=>setPack({...pack,nom:e.target.value})}/></label><label>Description<textarea maxLength={180} value={pack.promesse??''} onChange={e=>setPack({...pack,promesse:e.target.value})}/></label><div className="ak-champs"><label>Prix en OVA<input required type="number" min={1} max={1000000} value={pack.prix} onChange={e=>setPack({...pack,prix:Number(e.target.value)})}/></label><label>Nombre de cartes<input required type="number" min={1} max={12} value={pack.cartes} onChange={e=>setPack({...pack,cartes:Number(e.target.value)})}/></label></div>
      <h3>Probabilités de rareté</h3><div className="ak-poids">{RARETES.map(r=><label key={r}>{r}<input required type="number" min={0} max={100} step="0.01" value={pack.probabilites[r]} onChange={e=>setPack({...pack,probabilites:{...pack.probabilites,[r]:Number(e.target.value)}})}/></label>)}</div><p className={Math.abs(total-100)>.001?'ak-erreur':'ak-note'}>Total : {Number(total.toFixed(2))} % / 100 %</p>
      <label>Carte garantie au minimum<select value={pack.garantie??''} onChange={e=>setPack({...pack,garantie:(e.target.value||undefined) as RareteCarriere|undefined})}><option value="">Aucune garantie</option>{RARETES.map(r=><option key={r}>{r}</option>)}</select></label>
      <div className="ak-champs"><label>Joueurs éligibles<select value={pack.filtre?.categorie??''} onChange={e=>setPack({...pack,filtre:{...pack.filtre,categorie:(e.target.value||undefined) as 'avant'|'arriere'|undefined}})}><option value="">Tous les postes</option><option value="avant">Avants</option><option value="arriere">Arrières</option></select></label><label>Championnat<select value={pack.filtre?.championnats?.length===1?pack.filtre.championnats[0]:pack.filtre?.championnats?.length?'__multiple':''} onChange={e=>setPack({...pack,filtre:{...pack.filtre,championnats:e.target.value?[e.target.value]:undefined}})}><option value="">Tous les championnats</option>{(pack.filtre?.championnats?.length??0)>1&&<option value="__multiple">Sélection existante ({pack.filtre!.championnats!.length})</option>}{donnees.championnats.map(c=><option key={c}>{c}</option>)}</select></label></div>
      <label>Nation des joueurs<select value={pack.filtre?.nations?.length===1?pack.filtre.nations[0]:pack.filtre?.nations?.length?'__multiple':''} onChange={e=>setPack({...pack,filtre:{...pack.filtre,nations:e.target.value&&e.target.value!=='__multiple'?[e.target.value]:e.target.value==='__multiple'?pack.filtre?.nations:undefined}})}><option value="">Toutes les nations</option>{(pack.filtre?.nations?.length??0)>1&&<option value="__multiple">Sélection existante ({pack.filtre!.nations!.length})</option>}{donnees.nations.map(n=><option key={n}>{n}</option>)}</select></label>
      {pack.filtre&&Object.keys(pack.filtre).length>0&&<p className="ak-note">Filtres : {[pack.filtre.categorie, ...(pack.filtre.championnats??[]), ...(pack.filtre.pays??[]), ...(pack.filtre.nations??[]), ...(pack.filtre.familles??[]).map(f=>f.replaceAll('_',' ')), pack.filtre.ageMin?`À partir de ${pack.filtre.ageMin} ans`:null, pack.filtre.ageMax?`Jusqu’à ${pack.filtre.ageMax} ans`:null, pack.filtre.horsFrance?'Hors France':null].filter(Boolean).join(' · ')||'Tous les joueurs'} <button type="button" onClick={()=>setPack({...pack,filtre:undefined})}>Retirer les filtres</button></p>}
      <div className="ak-resume"><b>{pack.nom}</b><span>{pack.cartes} cartes · {pack.prix.toLocaleString('fr-FR')} OVA</span><p>{pack.promesse}</p></div><div className="ak-actions-pack"><button className="btn principal" disabled={Math.abs(total-100)>.001}>{occupe?'Enregistrement…':'Enregistrer pour toutes les ligues'}</button>{pack.id.startsWith('kiri-')&&donnees.packs.some(p=>p.id===pack.id)&&<button type="button" className="btn ak-supprimer" disabled={occupe} onClick={()=>void supprimerPack()}>Supprimer ce pack</button>}</div><p className="ak-note">Les nouveaux packs Kiri restent dans la liste de l’Atelier jusqu’à leur suppression.</p></fieldset></form></div>:<>
      <label className="ak-recherche">Rechercher un joueur ou un club<input type="search" value={q} placeholder="Nom du joueur, club…" onChange={e=>setQ(e.target.value)}/></label><p className="ak-note">{donnees.total.toLocaleString('fr-FR')} résultats · 40 affichés maximum, précise la recherche.</p>
      <div className="ak-grille"><aside className="ak-liste">{donnees.joueurs.map(j=><button key={j.sourceId} disabled={occupe} className={joueur?.sourceId===j.sourceId?'selectionne':''} onClick={()=>{setJoueur(structuredClone(j));setRevisionJoueur(donnees.revision);setMessage('');}}><b>{j.nom} <em>{j.note}</em></b><small>{j.clubReel} · {j.championnat}</small></button>)}{!donnees.joueurs.length&&<p>Aucun joueur trouvé.</p>}</aside>{joueur?<form onSubmit={soumettre('joueur')}><fieldset disabled={occupe}><legend>{joueur.nom}</legend><div className="ak-joueur"><div><label>GEN du joueur<input required type="number" min={20} max={99} value={joueur.note} onChange={e=>{const note=Number(e.target.value);setJoueur({...joueur,note,potentiel:Math.max(note,joueur.potentiel)});}}/></label><label>Potentiel<input required type="number" min={joueur.note} max={99} value={joueur.potentiel} onChange={e=>setJoueur({...joueur,potentiel:Number(e.target.value)})}/></label><label>Nation du joueur<select required value={joueur.nation} onChange={e=>setJoueur({...joueur,nation:e.target.value})}>{donnees.nations.map(n=><option key={n}>{n}</option>)}</select></label><label>Importer une photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void photo(e.target.files?.[0])}/></label><label>Ou adresse HTTPS de la photo<input value={joueur.photo?.startsWith('data:')?'':joueur.photo??''} placeholder={joueur.photo?.startsWith('data:')?'Photo importée':'https://…'} onChange={e=>setJoueur({...joueur,photo:e.target.value})}/></label></div><div className="ak-apercu"><CarteJoueurEnLigne key={`${joueur.sourceId}:${joueur.photo}`} carte={{...joueur,statistiques:statistiquesCarte(joueur.note,joueur.famille,joueur.sourceId),rarete:rarete(joueur.note),id:'apercu-admin',proprietaire:null,fatigue:0,matchs:0,essais:0,clubs:[]}}/><small>Aperçu · nation et rareté mises à jour</small></div></div><button className="btn principal">{occupe?'Enregistrement…':'Enregistrer ce joueur dans toutes les ligues'}</button></fieldset></form>:<div className="ak-vide">Sélectionne un joueur pour modifier sa carte.</div>}</div>
    </>}
  </section>;
}
