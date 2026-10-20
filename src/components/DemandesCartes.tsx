import { useEffect, useState } from 'react';
import { appelCartes, carteNormaleVide, validerCarteNormale, saisieDepuisSource } from '../lib/cartesNormales';
import type { DemandeCarte, SaisieCarteNormale } from '../lib/cartesNormales';
import type { SourceCarte } from '../lib/ligue/catalogueCarriere';
import { FormulaireCarteNormale } from './FormulaireCarteNormale';
import { useGame } from '../store/useGame';
import { t, texteTraduit } from '../lib/i18n';

export function DemandesCartes() {
  const [ouverte, setOuverte] = useState(false), [type,setType] = useState<'creation'|'correction'>('creation');
  const [carte,setCarte] = useState<SaisieCarteNormale>(carteNormaleVide), [sourceId,setSourceId] = useState<string>();
  const [q,setQ] = useState(''), [sources,setSources] = useState<SourceCarte[]>([]), [demandes,setDemandes] = useState<DemandeCarte[]>([]);
  const [message,setMessage] = useState(''), [erreur,setErreur] = useState(''), [succes,setSucces] = useState(''), [occupe,setOccupe] = useState(false);
  const [droitsCertifies, setDroitsCertifies] = useState(false);
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
    <summary>{t('contributionCarte.menu')}</summary>
    <p>{t('contributionCarte.menuAide')}</p>
    <div style={{marginBottom:'1rem'}}>
      <button type="button" className="btn primaire" onClick={() => { useGame.getState().setEcran('contribuer'); }}>
        {t('contributionCarte.ouvrir')}
      </button>
    </div>
    <div className="cn-actions"><button type="button" aria-pressed={type==='creation'} onClick={() => {setType('creation');setSourceId(undefined);setCarte(carteNormaleVide());}}>{t('contributionCarte.creerDemande')}</button>
      <button type="button" aria-pressed={type==='correction'} onClick={() => {setType('correction');setSourceId(undefined);}}>{t('contributionCarte.corriger')}</button></div>
    {type==='correction' && <div className="cn-recherche"><label>{t('contributionCarte.rechercherCarte')}<input value={q} onChange={e => setQ(e.target.value)} placeholder={t('contributionCarte.rechercheNom')} /></label>
      <button type="button" disabled={occupe || !q.trim()} onClick={() => void chercher()}>{t('contributionCarte.rechercher')}</button>
      <div className="cn-resultats">{sources.map(s => <button type="button" key={s.sourceId} aria-pressed={sourceId===s.sourceId} onClick={() => {setSourceId(s.sourceId);setCarte(saisieDepuisSource(s));}}><b>{s.nom}</b><small>{t('contributionCarte.resultat',{club:s.clubReel,note:s.note,age:s.age})}</small></button>)}</div>
      {sourceId && <p>{t('contributionCarte.selection',{nom:carte.nom})}</p>}</div>}
    <form onSubmit={e => {
      e.preventDefault(); setOccupe(true); setErreur(''); setSucces('');
      void (async () => {
        if (type==='correction' && !sourceId) throw new Error('Sélectionne une carte à corriger.');
        if (!droitsCertifies) throw new Error("Tu dois certifier avoir les droits d'utilisation de l'image postée ou des images postées.");
        const d = await appelCartes<{demandes:DemandeCarte[]}>({action:'demandesCartes',operation:'soumettre',type,sourceId,carte:validerCarteNormale(carte),message,droitsCertifies:true});
        setDemandes(d.demandes); setSucces('Demande envoyée. Tu retrouveras la décision ici.');
      })().catch(e => setErreur((e as Error).message)).finally(() => setOccupe(false));
    }}>
      <FormulaireCarteNormale carte={carte} changer={setCarte} occupe={occupe} onPreparation={setOccupe} />
      <label>{t('contributionCarte.complement')}<textarea maxLength={500} value={message} onChange={e => setMessage(e.target.value)} /></label>
      <label className="cn-droits">
        <input type="checkbox" required checked={droitsCertifies} onChange={e => setDroitsCertifies(e.target.checked)} />
        <span>{t('contributionCarte.droits')}</span>
      </label>
      <button className="btn primaire" disabled={occupe || (type==='correction' && !sourceId) || !droitsCertifies}>{t('contributionCarte.envoyer')}</button>
    </form>
    {erreur && <p role="alert">{texteTraduit(erreur)}</p>}{succes && <p role="status">{texteTraduit(succes)}</p>}
    <h4>{t('contributionCarte.demandes')}</h4>{demandes.length ? demandes.map(d => <article key={d.id}><b>{d.carte.nom}</b><span>{t(`contributionCarte.${d.type}`)} · {t(`contributionCarte.${d.statut}`)}</span>{d.reponse && <p>{d.reponse}</p>}</article>) : <p>{t('contributionCarte.aucuneDemande')}</p>}
  </details>;
}
