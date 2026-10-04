import { locale, tn, t } from '../lib/i18n';
import { statistiquesCarte } from '../lib/ligue/statistiquesCarte';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { SourceCarte } from '../lib/ligue/catalogueCarriere';
import type { PackCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import type { PosteId } from '../types';
import { nomPoste, POSTES, POSTE_PAR_ID } from '../data/rugby';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import './AtelierKiri.css';

interface Atelier { revision:number; rotationPacks:boolean; packs:PackCarriere[]; joueurs:SourceCarte[]; total:number; championnats:string[]; nations:string[]; clubs:{nom:string;championnat:string}[] }
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
      const retour=await requete(q,{action:'atelier',operation,revision:(operation==='pack'?revisionPack:revisionJoueur)??donnees.revision,...(operation==='pack'?{pack}:{sourceId:joueur?.sourceId,joueur:{note:joueur?.note,potentiel:joueur?.potentiel,photo:joueur?.photo,nation:joueur?.nation,clubReel:joueur?.clubReel,poste:joueur?.poste,postesSecondaires:joueur?.postesSecondaires??[]}})});
      if(operation==='pack')setRevisionPack(retour.revision);else setRevisionJoueur(retour.revision);
      setDonnees(d=>d?{...d,revision:retour.revision}:d);setActualisation(n=>n+1);
      setMessage(t("ui.615a7b4e50c5"));
    }catch(e){setErreur((e as Error).message);}finally{setOccupe(false);}
  };
  const supprimerPack=async()=>{
    if(!donnees||!pack.id.startsWith('kiri-')||!donnees.packs.some(p=>p.id===pack.id))return;
    if(!window.confirm(`Supprimer définitivement « ${pack.nom} » de l’Atelier ?`))return;
    setOccupe(true);setErreur('');setMessage('');
    try {
      const retour=await requete(q,{action:'atelier',operation:'supprimerPack',revision:revisionPack??donnees.revision,packId:pack.id});
      setRevisionPack(retour.revision);setDonnees(d=>d?{...d,revision:retour.revision}:d);setPack(nouveauPack());setActualisation(n=>n+1);
      setMessage(t("ui.be3ab10ccfff"));
    }catch(e){setErreur((e as Error).message);}finally{setOccupe(false);}
  };
  const reglerRotation=async(active:boolean)=>{
    if(!donnees)return;setOccupe(true);setErreur('');setMessage('');
    try {
      const retour=await requete(q,{action:'atelier',operation:'rotationPacks',revision:donnees.revision,active});
      setDonnees(d=>d?{...d,revision:retour.revision,rotationPacks:active}:d);
      setRevisionPack(retour.revision);setRevisionJoueur(retour.revision);
      setMessage(active?'Rotation spéciale activée dans les boutiques des ligues.':'Rotation coupée : seules les pochettes Bronze, Argent et Or restent visibles.');
      setActualisation(n=>n+1);
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
      setJoueur(j=>j?{...j,photo:url}:j);setMessage(t("ui.64a204832804"));
    }catch(e){setErreur((e as Error).message);}finally{setOccupe(false);}
  };
  const soumettre=(operation:'pack'|'joueur')=>(e:FormEvent)=>{e.preventDefault();void sauver(operation);};
  const total=Object.values(pack.probabilites).reduce((a,b)=>a+b,0);
  const rarete=(note:number):RareteCarriere=>note>=88?'star':note>=80?'elite':note>=65?'or':note>=50?'argent':'bronze';
  return <section className="atelier-kiri">
    <header className="ak-entete"><div><div className="eyebrow">{t("ui.78b19b3c259c")}</div><h2>{t("ui.7147dd99cb24")}</h2><p>{t("ui.74e78178b0bf")}</p></div><span className="ak-badge">{t("ui.e7440dd384f1")}</span></header>
    <nav className="ak-onglets" aria-label="Atelier Kiri"><button className={onglet==='packs'?'actif':''} onClick={()=>setOnglet('packs')}>{t("ui.3af52d03d2ca")}</button><button className={onglet==='joueurs'?'actif':''} onClick={()=>setOnglet('joueurs')}>{t("ui.44fb4db9dbb5")}</button></nav>
    {erreur&&<p role="alert" className="ak-erreur">{erreur} <button onClick={()=>setActualisation(n=>n+1)}>{t("ui.f3d8437a7b93")}</button></p>}{message&&<p role="status" className="ak-succes">{message}</p>}
    {donnees&&onglet==='packs'&&<section className={`ak-rotation ${donnees.rotationPacks?'active':''}`}><div><span>{t("ui.57ed50e159d9")}</span><b>{donnees.rotationPacks?t("ui.1945949b7c2b"):t("ui.3ebba2a0ea4f")}</b><small>{donnees.rotationPacks?t("ui.c59684a701b9"):t("ui.78f2f2f35de3")}</small></div><button type="button" disabled={occupe} aria-pressed={donnees.rotationPacks} onClick={()=>void reglerRotation(!donnees.rotationPacks)}><i />{donnees.rotationPacks?t("ui.8cdfd792187a"):t("ui.6babefbed0af")}</button></section>}
    {!donnees?<p>{t("ui.109826adfba2")}</p>:onglet==='packs'?<div className="ak-grille"><aside className="ak-liste"><button className="btn principal" disabled={occupe} onClick={()=>{setPack(nouveauPack());setRevisionPack(donnees.revision);setMessage('');}}>{t("ui.96850919656c")}</button>{donnees.packs.map(p=><button key={p.id} disabled={occupe} className={pack.id===p.id?'selectionne':''} onClick={()=>{setPack(structuredClone(p));setRevisionPack(donnees.revision);setMessage('');}}><b>{p.nom}</b><small>{t("ui.d524fdd9e585", { v0: p.cartes, v1: p.prix.toLocaleString(locale()) })}</small></button>)}</aside>
      <form onSubmit={soumettre('pack')}><fieldset disabled={occupe}><legend>{t("ui.4fb3fffd4dc9")}</legend><label>{t("mgr.creation.nom")}<input required maxLength={60} value={pack.nom} onChange={e=>setPack({...pack,nom:e.target.value})}/></label><label>{t("ui.526e0087cc3f")}<textarea maxLength={180} value={pack.promesse??''} onChange={e=>setPack({...pack,promesse:e.target.value})}/></label><div className="ak-champs"><label>{t("ui.835188baacf3")}<input required type="number" min={1} max={1000000} value={pack.prix} onChange={e=>setPack({...pack,prix:Number(e.target.value)})}/></label><label>{t("ui.d2298b895a6a")}<input required type="number" min={1} max={12} value={pack.cartes} onChange={e=>setPack({...pack,cartes:Number(e.target.value)})}/></label></div>
      <h3>{t("ui.0704ab1079a9")}</h3><div className="ak-poids">{RARETES.map(r=><label key={r}>{r}<input required type="number" min={0} max={100} step="0.01" value={pack.probabilites[r]} onChange={e=>setPack({...pack,probabilites:{...pack.probabilites,[r]:Number(e.target.value)}})}/></label>)}</div><p className={Math.abs(total-100)>.001?'ak-erreur':'ak-note'}>{t("ui.9dcd04df9f8d", { v0: Number(total.toFixed(2)) })}</p>
      <label>{t("ui.5a690cf74c41")}<select value={pack.garantie??''} onChange={e=>setPack({...pack,garantie:(e.target.value||undefined) as RareteCarriere|undefined})}><option value="">{t("ui.ff561b510519")}</option>{RARETES.map(r=><option key={r}>{r}</option>)}</select></label>
      <div className="ak-champs"><label>{t("ui.3b2df1589fb9")}<select value={pack.filtre?.categorie??''} onChange={e=>setPack({...pack,filtre:{...pack.filtre,categorie:(e.target.value||undefined) as 'avant'|'arriere'|undefined}})}><option value="">{t("online.squad.allPositions")}</option><option value="avant">{t("ml.tv.avants")}</option><option value="arriere">{t("ml.tv.arrieres")}</option></select></label><label>{t("pj.championnat")}<select value={pack.filtre?.championnats?.length===1?pack.filtre.championnats[0]:pack.filtre?.championnats?.length?'__multiple':''} onChange={e=>setPack({...pack,filtre:{...pack.filtre,championnats:e.target.value?[e.target.value]:undefined}})}><option value="">{t("ui.f8ef16c2fc53")}</option>{(pack.filtre?.championnats?.length??0)>1&&<option value="__multiple">{t("ui.9b03b09586d4", { v0: pack.filtre!.championnats!.length })}</option>}{donnees.championnats.map(c=><option key={c}>{c}</option>)}</select></label></div>
      <label>{t("ui.1eacb202b33f")}<select value={pack.filtre?.nations?.length===1?pack.filtre.nations[0]:pack.filtre?.nations?.length?'__multiple':''} onChange={e=>setPack({...pack,filtre:{...pack.filtre,nations:e.target.value&&e.target.value!=='__multiple'?[e.target.value]:e.target.value==='__multiple'?pack.filtre?.nations:undefined}})}><option value="">{t("ui.ff526e985c7f")}</option>{(pack.filtre?.nations?.length??0)>1&&<option value="__multiple">{t("ui.9b03b09586d4", { v0: pack.filtre!.nations!.length })}</option>}{donnees.nations.map(n=><option key={n}>{n}</option>)}</select></label>
      {pack.filtre&&Object.keys(pack.filtre).length>0&&<p className="ak-note">{t("ui.9ee19e7f66ce", { v0: [pack.filtre.categorie, ...(pack.filtre.championnats??[]), ...(pack.filtre.pays??[]), ...(pack.filtre.nations??[]), ...(pack.filtre.familles??[]).map(f=>f.replaceAll('_',' ')), pack.filtre.ageMin?`À partir de ${pack.filtre.ageMin} ans`:null, pack.filtre.ageMax?`Jusqu’à ${pack.filtre.ageMax} ans`:null, pack.filtre.horsFrance?'Hors France':null].filter(Boolean).join(' · ')||t("ui.8e13e13375fb") })}<button type="button" onClick={()=>setPack({...pack,filtre:undefined})}>{t("ui.a31cee3ae5ce")}</button></p>}
      <div className="ak-resume"><b>{pack.nom}</b><span>{t("ui.d524fdd9e585", { v0: pack.cartes, v1: pack.prix.toLocaleString(locale()) })}</span><p>{pack.promesse}</p></div><div className="ak-actions-pack"><button className="btn principal" disabled={Math.abs(total-100)>.001}>{occupe?t("ui.0f02d9ec0f50"):t("ui.74c852de3450")}</button>{pack.id.startsWith('kiri-')&&donnees.packs.some(p=>p.id===pack.id)&&<button type="button" className="btn ak-supprimer" disabled={occupe} onClick={()=>void supprimerPack()}>{t("ui.6c4b39b83a5c")}</button>}</div><p className="ak-note">{t("ui.468615ee5443")}</p></fieldset></form></div>:<>
      <label className="ak-recherche">{t("ui.36f8e71b4f47")}<input type="search" value={q} placeholder={t("ui.dcb3a6a0fdf5")} onChange={e=>setQ(e.target.value)}/></label><p className="ak-note">{t("ui.c8501ca4a37a", { v0: donnees.total.toLocaleString(locale()) })}</p>
      <div className="ak-grille">
        <aside className="ak-liste">
          {donnees.joueurs.map((j) => (
            <button
              key={j.sourceId}
              disabled={occupe}
              className={joueur?.sourceId === j.sourceId ? 'selectionne' : ''}
              onClick={() => {
                setJoueur(structuredClone(j));
                setRevisionJoueur(donnees.revision);
                setMessage('');
              }}
            >
              <b>
                {j.nom} <em>{j.note}</em>
              </b>
              <small>
                N° {POSTE_PAR_ID[j.poste]?.numero ?? ''} · {nomPoste(j.poste)} · {j.clubReel}
                {j.postesSecondaires && j.postesSecondaires.length > 0 && (
                  <> · 2e : {j.postesSecondaires.map((p) => POSTE_PAR_ID[p]?.numero ?? p).join('/')}</>
                )}
              </small>
            </button>
          ))}
          {!donnees.joueurs.length && <p>{t("ui.e440317ef1a6")}</p>}
        </aside>
        {joueur ? (
          <form onSubmit={soumettre('joueur')}>
            <fieldset disabled={occupe}>
              <legend>{joueur.nom}</legend>
              <div className="ak-joueur">
                <div>
                  <div className="ak-champs">
                    <label>{t("ui.8324e40d692a")}<input
                        required
                        type="number"
                        min={20}
                        max={99}
                        value={joueur.note}
                        onChange={(e) => {
                          const note = Number(e.target.value);
                          setJoueur({ ...joueur, note, potentiel: Math.max(note, joueur.potentiel) });
                        }}
                      />
                    </label>
                    <label>{t("mgr.inst.col.potentiel")}<input
                        required
                        type="number"
                        min={joueur.note}
                        max={99}
                        value={joueur.potentiel}
                        onChange={(e) => setJoueur({ ...joueur, potentiel: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <div className="ak-champs">
                    <label>{t("ui.a4ac14435ca0")}<select
                        required
                        value={joueur.nation}
                        onChange={(e) => setJoueur({ ...joueur, nation: e.target.value })}
                      >
                        {donnees.nations.map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label>{t("ui.4dc29fb88eb5")}<select
                        required
                        value={joueur.clubReel}
                        onChange={(e) => {
                          const club = donnees.clubs.find((c) => c.nom === e.target.value);
                          setJoueur({
                            ...joueur,
                            clubReel: e.target.value,
                            championnat: club?.championnat ?? joueur.championnat,
                          });
                        }}
                      >
                        {donnees.clubs.map((c) => (
                          <option key={c.nom} value={c.nom}>
                            {c.nom} · {c.championnat}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>{t("ui.5906bb89c85f")}<select
                      value={joueur.poste}
                      onChange={(e) => {
                        const p = e.target.value as PosteId;
                        const sec = (joueur.postesSecondaires ?? []).filter((s) => s !== p);
                        setJoueur({
                          ...joueur,
                          poste: p,
                          famille: POSTE_PAR_ID[p]?.famille ?? joueur.famille,
                          postesSecondaires: sec,
                        });
                      }}
                    >
                      {POSTES.map((p) => (
                        <option key={p.id} value={p.id}>
                          N° {p.numero} · {p.nom} ({p.categorie})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="ak-postes-secondaires">
                    <div className="ak-postes-titre">
                      <label>{t("ui.26f82ff790ff", { v0: ' ' })}<em>{tn("ui.03720f6760c8", (joueur.postesSecondaires ?? []).length, { v0: (joueur.postesSecondaires ?? []).length })}</em>
                      </label>
                      {(joueur.postesSecondaires ?? []).length > 0 && (
                        <button
                          type="button"
                          className="ak-btn-texte"
                          onClick={() => setJoueur({ ...joueur, postesSecondaires: [] })}
                        >{t("online.squad.uncheckAll")}</button>
                      )}
                    </div>
                    <small className="ak-note-sec">{t("ui.5cf20b795fb2")}</small>
                    <div className="ak-chips-postes">
                      {POSTES.filter((p) => p.id !== joueur.poste).map((p) => {
                        const actif = (joueur.postesSecondaires ?? []).includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`ak-chip-poste ${actif ? 'actif' : ''}`}
                            title={actif ? t("ui.1a3f66b664f1", { v0: p.nom }) : t("ui.0af82643d2e1", { v0: p.nom })}
                            onClick={() => {
                              const actuels = joueur.postesSecondaires ?? [];
                              const nouveaux = actif
                                ? actuels.filter((id) => id !== p.id)
                                : [...actuels, p.id];
                              setJoueur({ ...joueur, postesSecondaires: nouveaux });
                            }}
                          >
                            <b>{p.numero}</b>
                            <span>{p.nom}</span>
                            {actif && <i className="ak-check">✓</i>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="ak-champs">
                    <label>{t("ov.importerPhoto")}<input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => void photo(e.target.files?.[0])}
                      />
                    </label>
                    <label>{t("ui.768ab98ad39c")}<input
                        value={joueur.photo?.startsWith('data:') ? '' : (joueur.photo ?? '')}
                        placeholder={joueur.photo?.startsWith('data:') ? t("ui.af84ec9533ad") : t("ui.ab04e20ed4f2")}
                        onChange={(e) => setJoueur({ ...joueur, photo: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
                <div className="ak-apercu">
                  <CarteJoueurEnLigne
                    key={`${joueur.sourceId}:${joueur.photo}:${joueur.clubReel}:${joueur.poste}:${(joueur.postesSecondaires ?? []).join(',')}`}
                    carte={{
                      ...joueur,
                      statistiques: statistiquesCarte(joueur.note, joueur.famille, joueur.sourceId),
                      rarete: rarete(joueur.note),
                      id: 'apercu-admin',
                      proprietaire: null,
                      fatigue: 0,
                      matchs: 0,
                      essais: 0,
                      clubs: [],
                    }}
                  />
                  <small>{t("ui.19e5f0b52e8e")}</small>
                </div>
              </div>
              <button className="btn principal">
                {occupe ? t("ui.0f02d9ec0f50") : t("ui.ceeb68ba84c6")}
              </button>
            </fieldset>
          </form>
        ) : (
          <div className="ak-vide">{t("ui.e7931514058e")}</div>
        )}
      </div>
    </>}
  </section>;
}
