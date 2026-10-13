import { useEffect, useState } from 'react';
import { appelCartes, carteNormaleVide, validerCarteNormale, saisieDepuisSource } from '../lib/cartesNormales';
import type { DemandeCarte, SaisieCarteNormale } from '../lib/cartesNormales';
import type { SourceCarte } from '../lib/ligue/catalogueCarriere';
import { FormulaireCarteNormale } from './FormulaireCarteNormale';

interface Vue { demandes: DemandeCarte[]; cartes: SourceCarte[]; revisionCatalogue: number }
export function LaboCartesNormales({ demandesSeulement = false }: { demandesSeulement?: boolean }) {
  const [vue,setVue] = useState<Vue>(), [selection,setSelection] = useState<DemandeCarte>();
  const [carte,setCarte] = useState<SaisieCarteNormale>(carteNormaleVide), [sourceId,setSourceId] = useState<string>();
  const [q,setQ] = useState(''), [reponse,setReponse] = useState(''), [erreur,setErreur] = useState(''), [message,setMessage] = useState('');
  const [occupe,setOccupe] = useState(false), [pret,setPret] = useState(!demandesSeulement);
  const charger = async () => { const d = await appelCartes<Vue>(undefined,`&q=${encodeURIComponent(q)}`); setVue(d); };
  useEffect(() => { void appelCartes<Vue>().then(setVue).catch(e => setErreur(e.message)); },[]);
  const choisirDemande = async (id: string) => {
    setOccupe(true);setErreur('');setMessage('');
    try { const {demande} = await appelCartes<{demande:DemandeCarte}>(undefined,`&id=${encodeURIComponent(id)}`); setSelection(demande);setCarte(demande.carte);setReponse(demande.reponse??'');setPret(true); }
    catch(e) {setErreur((e as Error).message);} finally {setOccupe(false);}
  };
  const agir = async (operation: 'modifier'|'approuver'|'refuser'|'creer') => {
    if (!vue) return; setOccupe(true);setErreur('');setMessage('');
    try {
      if (operation==='creer') {
        const r = await fetch('/api/carriere?atelier=1', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'atelier',operation:'carteNormale',revision:vue.revisionCatalogue,sourceId:sourceId??`normale-${crypto.randomUUID()}`,carte:validerCarteNormale(carte)})});
        const d = await r.json();if(!r.ok)throw new Error(d.erreur);
        setMessage(sourceId?'Carte modifiée dans le catalogue.':'Carte normale créée dans le catalogue.');setSourceId(undefined);setCarte(carteNormaleVide());
      } else {
        if (!selection) return;
        await appelCartes({action:'demandesCartes',operation,id:selection.id,revision:selection.revision,revisionCatalogue:vue.revisionCatalogue,
          ...(operation==='refuser'?{reponse}:{carte:validerCarteNormale(carte)})});
        setMessage(operation==='approuver'?'Carte validée et publiée.':operation==='refuser'?'Demande refusée.':'Proposition modifiée.');
        if (operation==='modifier') {
          const {demande} = await appelCartes<{demande:DemandeCarte}>(undefined,`&id=${selection.id}`);setSelection(demande);setCarte(demande.carte);
        } else {setSelection(undefined);setPret(false);}
      }
      await charger();
    } catch(e) {setErreur((e as Error).message);} finally {setOccupe(false);}
  };
  return <section className="cn-labo"><h2>{demandesSeulement?'Demandes de cartes':'Cartes normales'}</h2>
    <p>{demandesSeulement?'Examine les informations proposées, modifie la carte si nécessaire, puis valide ou refuse.':'Crée une carte ordinaire ou corrige une carte existante. La rareté et les statistiques suivent son général.'}</p>
    {!demandesSeulement && <><button className="btn primaire" type="button" disabled={occupe} onClick={() => {setCarte(carteNormaleVide());setSourceId(undefined);setSelection(undefined);setPret(true);}}>Nouvelle carte normale</button>
      <div className="cn-recherche"><label>Rechercher une carte<input value={q} onChange={e => setQ(e.target.value)} /></label><button type="button" disabled={occupe} onClick={() => void charger().catch(e => setErreur(e.message))}>Rechercher</button>
        <div className="cn-resultats">{vue?.cartes.map(s => <button type="button" key={s.sourceId} onClick={() => {setCarte(saisieDepuisSource(s));setSourceId(s.sourceId);setSelection(undefined);setPret(true);}}><b>{s.nom}</b><small>{s.clubReel} · {s.note} GEN</small></button>)}</div></div></>}
    {demandesSeulement && <div className="cn-resultats">{vue?.demandes.map(d => <button type="button" key={d.id} aria-pressed={selection?.id===d.id} disabled={occupe} onClick={() => void choisirDemande(d.id)}><b>{d.carte.nom}</b><small>{d.pseudo} · {d.type==='creation'?'Création':'Correction'} · {d.statut==='attente'?'En attente':d.statut==='acceptee'?'Validée':'Refusée'}</small></button>)}{vue && !vue.demandes.length && <p>Aucune demande.</p>}</div>}
    {pret && <form onSubmit={e => {e.preventDefault();void agir(selection?'approuver':'creer');}}>
      {selection && <p>{selection.message || 'Aucune information complémentaire.'}</p>}
      <FormulaireCarteNormale carte={carte} changer={setCarte} occupe={occupe || (!!selection && selection.statut!=='attente')} onPreparation={setOccupe} />
      {!selection ? <button className="btn primaire" disabled={occupe}>Enregistrer la carte normale</button> : selection.statut==='attente' && <>
        <label>Motif du refus<textarea maxLength={500} value={reponse} onChange={e => setReponse(e.target.value)} /></label>
        <div className="cn-actions"><button className="btn primaire" disabled={occupe}>Valider et publier la carte</button>
          <button type="button" className="btn fantome" disabled={occupe} onClick={() => void agir('modifier')}>Enregistrer les modifications</button>
          <button type="button" className="btn fantome" disabled={occupe} onClick={() => void agir('refuser')}>Refuser la carte</button></div>
      </>}
    </form>}
    {erreur && <p className="ak-erreur" role="alert">{erreur}</p>}{message && <p className="ak-succes" role="status">{message}</p>}
  </section>;
}
