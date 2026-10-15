import { useEffect, useState } from 'react';
import type { RetraitCarte } from '../lib/ligue/atelierCatalogue';
import './CartesNormales.css';

interface Carte { sourceId: string; nom: string; club: string; note: number; type: string; variantes: number }
interface Vue { revision: number; total: number; cartes: Carte[]; retraits: RetraitCarte[] }
async function appeler(q: string, corps?: unknown): Promise<Vue> {
  const r = await fetch(`/api/carriere?atelier=1&section=retraitsCartes&q=${encodeURIComponent(q)}`, {
    method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: corps ? { 'Content-Type': 'application/json' } : undefined, body: corps ? JSON.stringify(corps) : undefined,
  });
  const d = await r.json(); if (!r.ok) throw new Error(d.erreur ?? 'Opération impossible.'); return d;
}
export function LaboRetraitsCartes() {
  const [q, setQ] = useState(''), [vue, setVue] = useState<Vue>();
  const [selection, setSelection] = useState<{ carte: Carte; revision: number }>();
  const [motif, setMotif] = useState(''), [confirme, setConfirme] = useState(false);
  const [occupe, setOccupe] = useState(false), [erreur, setErreur] = useState(''), [message, setMessage] = useState('');
  useEffect(() => { let actif = true; void appeler('').then(d => { if (actif) setVue(d); }).catch(e => { if (actif) setErreur(e.message); }); return () => { actif = false; }; }, []);
  async function rechercher() {
    setOccupe(true); setErreur(''); setSelection(undefined);
    try { setVue(await appeler(q)); } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  }
  async function retirer() {
    if (!selection || !confirme || !motif.trim() || occupe) return;
    setOccupe(true); setErreur(''); setMessage('');
    try {
      await appeler(q, { action: 'atelier', operation: 'retirerCarte', revision: selection.revision,
        sourceId: selection.carte.sourceId, confirmation: selection.carte.sourceId, motif: motif.trim() });
      setMessage(`${selection.carte.nom} : retrait enregistré.`); setSelection(undefined); setMotif(''); setConfirme(false);
      setVue(await appeler(q));
    } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  }
  async function reintegrer(sourceId: string, nom: string) {
    if (!vue || occupe) return;
    if (!window.confirm(`Réintégrer « ${nom} » au jeu ?`)) return;
    setOccupe(true); setErreur(''); setMessage('');
    try {
      await appeler(q, { action: 'atelier', operation: 'reintegrerCarte', revision: vue.revision, sourceId });
      setMessage(`${nom} : carte réintégrée au jeu.`);
      setVue(await appeler(q));
    } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  }
  return <section className="cn-labo">
    <h2>Retirer une carte</h2>
    <p>Recherche une carte normale ou spéciale par nom ou club. Le retrait s’applique au catalogue, aux packs et au marché après synchronisation.</p>
    <form className="cn-recherche" onSubmit={e => { e.preventDefault(); void rechercher(); }}>
      <label>Nom du joueur ou club<input maxLength={100} value={q} disabled={occupe} onChange={e => setQ(e.target.value)} /></label>
      <button className="btn" disabled={occupe || !q.trim()}>Rechercher</button>
    </form>
    {vue && <p>{vue.total} carte(s) trouvée(s){vue.total > 60 ? ' · 60 affichées, précise la recherche.' : '.'}</p>}
    <div className="cn-resultats">{vue?.cartes.map(c => <button type="button" key={c.sourceId} disabled={occupe}
      aria-pressed={selection?.carte.sourceId === c.sourceId} onClick={() => { setSelection({ carte: c, revision: vue.revision }); setConfirme(false); setMotif(''); setMessage(''); }}>
      <b>{c.nom}</b><small>{c.club} · {c.type} · {c.note} GEN</small></button>)}</div>
    {selection && <form onSubmit={e => { e.preventDefault(); void retirer(); }}>
      <h3>Retirer {selection.carte.nom}</h3><p>{selection.carte.club} · {selection.carte.type} · {selection.carte.note} GEN</p>
      <p>Cette carte ne sera plus disponible dans les packs ni sur le marché. Les exemplaires possédés en ligue seront remplacés par une carte fictive équivalente lors de l’actualisation.</p>
      {!!selection.carte.variantes && <p>Ses {selection.carte.variantes} variante(s) spéciale(s) rattachée(s) seront également retirées.</p>}
      <p>Ce bouton retire la carte ; il ne supprime pas tous les portraits et toutes les mentions de la personne dans les carrières solo déjà sauvegardées.</p>
      <label>Motif du retrait<textarea required maxLength={500} value={motif} disabled={occupe} onChange={e => setMotif(e.target.value)} /></label>
      <label><input type="checkbox" checked={confirme} disabled={occupe} onChange={e => setConfirme(e.target.checked)} /> Je confirme le retrait de cette carte.</label>
      <div className="cn-actions"><button className="btn ak-supprimer" disabled={occupe || !confirme || !motif.trim()}>{occupe ? 'Retrait en cours…' : 'Retirer du jeu'}</button>
      <button className="btn fantome" type="button" disabled={occupe} onClick={() => setSelection(undefined)}>Annuler</button></div>
    </form>}
    {erreur && <p role="alert" className="ak-erreur">{erreur} Relance la recherche pour actualiser la liste.</p>}
    {message && <p role="status" className="ak-succes">{message}</p>}
    <h3>Historique des retraits</h3>
    {!vue ? <p>Chargement…</p> : !vue.retraits.length ? <p>Aucune carte retirée depuis cet outil.</p> : <ul>{vue.retraits.map(r => <li key={r.sourceId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.5rem 0', borderBottom: '1px solid var(--bordure, #294236)' }}><div><b>{r.nom}</b> · {r.club} · {r.type}<p style={{ margin: '0.25rem 0 0', opacity: 0.8 }}>{r.motif} · {new Date(r.retireLe).toLocaleDateString('fr-FR')}</p></div><button type="button" className="btn fantome" disabled={occupe} onClick={() => void reintegrer(r.sourceId, r.nom)}>Réintégrer</button></li>)}</ul>}
  </section>;
}
