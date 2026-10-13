import { useEffect, useState } from 'react';
import { appelCartes, carteNormaleVide, validerCarteNormale, saisieDepuisSource } from '../lib/cartesNormales';
import type { DemandeCarte, SaisieCarteNormale } from '../lib/cartesNormales';
import type { SourceCarte } from '../lib/ligue/catalogueCarriere';
import { FormulaireCarteNormale } from './FormulaireCarteNormale';

export function DemandesCartes() {
  const [ouverte, setOuverte] = useState(false), [type,setType] = useState<'creation'|'correction'>('creation');
  const [carte,setCarte] = useState<SaisieCarteNormale>(carteNormaleVide), [sourceId,setSourceId] = useState<string>();
  const [q,setQ] = useState(''), [sources,setSources] = useState<SourceCarte[]>([]), [demandes,setDemandes] = useState<DemandeCarte[]>([]);
  const [message,setMessage] = useState(''), [erreur,setErreur] = useState(''), [succes,setSucces] = useState(''), [occupe,setOccupe] = useState(false);
  useEffect(() => {
    if (!ouverte) return;
    let actif = true;
    void appelCartes<{demandes:DemandeCarte[]}>().then(d => { if (actif) setDemandes(d.demandes); }).catch(e => { if (actif) setErreur(e.message); });
    return () => { actif = false; };
  },[ouverte]);
  const chercher = async () => {
    setOccupe(true); setErreur('');
    try { setSources((await appelCartes<{cartes:SourceCarte[]}>(undefined,`&q=${encodeURIComponent(q)}`)).cartes); }
    catch(e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };
  return <details className="reg-section cn-demandes" onToggle={e => setOuverte(e.currentTarget.open)}>
    <summary>Créer ou corriger une carte</summary>
    <p>Renseigne la carte souhaitée. Elle sera examinée dans le Labo avant toute publication.</p>
    <div className="cn-actions"><button type="button" aria-pressed={type==='creation'} onClick={() => {setType('creation');setSourceId(undefined);setCarte(carteNormaleVide());}}>Demander une création</button>
      <button type="button" aria-pressed={type==='correction'} onClick={() => {setType('correction');setSourceId(undefined);}}>Corriger une carte</button></div>
    {type==='correction' && <div className="cn-recherche"><label>Rechercher la carte<input value={q} onChange={e => setQ(e.target.value)} placeholder="Prénom ou nom" /></label>
      <button type="button" disabled={occupe || !q.trim()} onClick={() => void chercher()}>Rechercher</button>
      <div className="cn-resultats">{sources.map(s => <button type="button" key={s.sourceId} aria-pressed={sourceId===s.sourceId} onClick={() => {setSourceId(s.sourceId);setCarte(saisieDepuisSource(s));}}><b>{s.nom}</b><small>{s.clubReel} · {s.note} GEN · {s.age} ans</small></button>)}</div>
      {sourceId && <p>Carte sélectionnée : {carte.nom}</p>}</div>}
    <form onSubmit={e => {
      e.preventDefault(); setOccupe(true); setErreur(''); setSucces('');
      void (async () => {
        if (type==='correction' && !sourceId) throw new Error('Sélectionne la carte à corriger.');
        const d = await appelCartes<{demandes:DemandeCarte[]}>({action:'demandesCartes',operation:'soumettre',type,sourceId,carte:validerCarteNormale(carte),message});
        setDemandes(d.demandes); setSucces('Demande envoyée. Tu retrouveras la décision ici.');
      })().catch(e => setErreur((e as Error).message)).finally(() => setOccupe(false));
    }}>
      <FormulaireCarteNormale carte={carte} changer={setCarte} occupe={occupe} onPreparation={setOccupe} />
      <label>Informations complémentaires<textarea maxLength={500} value={message} onChange={e => setMessage(e.target.value)} /></label>
      <button className="btn primaire" disabled={occupe || (type==='correction' && !sourceId)}>Envoyer la demande</button>
    </form>
    {erreur && <p role="alert">{erreur}</p>}{succes && <p role="status">{succes}</p>}
    <h4>Mes demandes</h4>{demandes.length ? demandes.map(d => <article key={d.id}><b>{d.carte.nom}</b><span>{d.type==='creation'?'Création':'Correction'} · {d.statut==='attente'?'En attente':d.statut==='acceptee'?'Validée':'Refusée'}</span>{d.reponse && <p>{d.reponse}</p>}</article>) : <p>Aucune demande pour le moment.</p>}
  </details>;
}
