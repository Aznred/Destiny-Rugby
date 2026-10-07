import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Club } from '../types';
import type { RivaliteHistorique } from '../lib/localisationClub';
import './InfirmerieManager.css';

type Fiche = Club & { alertes: string[] };
type Vue = { revision: number; clubs: Fiche[]; rivalites: RivaliteHistorique[] };
const champs = ['ville', 'stade', 'adresseStade', 'latitude', 'longitude', 'departement', 'departementNum', 'region', 'pays', 'codePostal', 'sourceLocalisation', 'sourceCoordonnees', 'latitudeVille', 'longitudeVille'] as const;
const libelles: Record<(typeof champs)[number], string> = { ville: 'Ville réelle', stade: 'Stade', adresseStade: 'Adresse du stade', latitude: 'Latitude', longitude: 'Longitude', departement: 'Département', departementNum: 'N° département', region: 'Région', pays: 'Pays', codePostal: 'Code postal', sourceLocalisation: 'Source officielle (URL)', sourceCoordonnees: 'Source des coordonnées (URL)', latitudeVille: 'Latitude de référence de la ville', longitudeVille: 'Longitude de référence de la ville' };
async function requete(corps?: unknown): Promise<Vue> {
  const r = await fetch('/api/carriere?atelier=1&section=clubs', { method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: corps ? { 'Content-Type': 'application/json' } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  const d = await r.json(); if (!r.ok) throw Error(d.erreur ?? 'Enregistrement impossible.'); return d;
}
export function LaboDonneesClubs() {
  const [vue, setVue] = useState<Vue>(), [q, setQ] = useState(''), [suspects, setSuspects] = useState(true);
  const [edition, setEdition] = useState<Fiche>(), [brouillon, setBrouillon] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState(''), [message, setMessage] = useState(''), [occupe, setOccupe] = useState(false);
  const [clubA, setClubA] = useState(''), [clubB, setClubB] = useState(''), [source, setSource] = useState('');
  const charger = async () => { try { setVue(await requete()); setErreur(''); } catch (e) { setErreur((e as Error).message); } };
  useEffect(() => { void charger(); }, []);
  const liste = useMemo(() => {
    const cle = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return (vue?.clubs ?? []).filter(c => (!suspects || c.alertes.length > 0 || c.statutGeographique !== 'verifie') && cle(`${c.nom} ${c.ville} ${c.region}`).includes(cle(q)));
  }, [vue, suspects, q]);
  const ouvrir = (c: Fiche) => { setEdition(c); setMessage(''); setBrouillon(Object.fromEntries([...champs.map(k => [k, String(c[k] ?? '')]), ['precisionLieu', c.precisionLieu ?? 'fallback'], ['statutGeographique', c.statutGeographique ?? 'nonVerifie']])); };
  const sauver = async (corps: Record<string, unknown>) => {
    if (!vue) return; setOccupe(true); setErreur(''); setMessage('');
    try { await requete({ action: 'atelier', revision: vue.revision, ...corps }); setVue(await requete()); setEdition(undefined); setMessage('Données enregistrées. Les carrières les récupèrent avec le catalogue.'); }
    catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };
  const soumettre = (e: FormEvent) => {
    e.preventDefault(); if (!edition) return;
    const localisation: Record<string, unknown> = { ...brouillon };
    for (const k of ['latitude', 'longitude', 'latitudeVille', 'longitudeVille']) localisation[k] = brouillon[k]?.trim() ? Number(brouillon[k]) : undefined;
    void sauver({ operation: 'localisationClub', club: edition.nom, localisation });
  };
  return <div className="club-data27">
    <header><h2>Données clubs</h2><p>Communes, stades et provenance des coordonnées. Les localisations incertaines restent à valider.</p></header>
    {erreur && <p role="alert">{erreur} <button disabled={occupe} onClick={() => void charger()}>Recharger</button></p>}{message && <p role="status">{message}</p>}
    {!vue ? <p>Chargement des clubs…</p> : <>
      <div><label>Rechercher un club<input type="search" value={q} onChange={e => setQ(e.target.value)} /></label><label><span><input type="checkbox" checked={suspects} onChange={e => setSuspects(e.target.checked)} /> Cas suspects ou non vérifiés seulement</span></label><p>{liste.length} clubs affichés sur {vue.clubs.length} · {vue.clubs.filter(c => c.statutGeographique === 'verifie').length} vérifiés</p></div>
      {!liste.length && <p>Aucun club avec ces filtres. Décochez « Cas suspects » pour inclure les clubs déjà vérifiés.</p>}
      {edition && <section className="carte"><h3>Corriger {edition.nom}</h3><p className="suspect27">{edition.alertes.join(' · ')}</p><form onSubmit={soumettre}>
        {champs.map(k => <label key={k}>{libelles[k]}<input value={brouillon[k] ?? ''} type={k.includes('latitude') || k.includes('longitude') ? 'number' : k.startsWith('source') ? 'url' : 'text'} step="any" min={k.includes('latitude') ? -90 : k.includes('longitude') ? -180 : undefined} max={k.includes('latitude') ? 90 : k.includes('longitude') ? 180 : undefined} onChange={e => setBrouillon(d => ({ ...d, [k]: e.target.value }))} /></label>)}
        <label>Précision<select value={brouillon.precisionLieu} onChange={e => setBrouillon(d => ({ ...d, precisionLieu: e.target.value }))}><option value="stade">Stade</option><option value="siege">Siège sportif</option><option value="commune">Commune</option><option value="fallback">Fallback à confirmer</option></select></label>
        <label>Statut<select value={brouillon.statutGeographique} onChange={e => setBrouillon(d => ({ ...d, statutGeographique: e.target.value }))}><option value="nonVerifie">Non vérifié</option><option value="verifie">Vérifié</option></select></label><button className="btn principal" disabled={occupe}>Enregistrer la correction</button><button type="button" className="btn fantome" onClick={() => setEdition(undefined)}>Fermer</button>
      </form></section>}
      <div className="table-scroll27"><table><thead><tr>{['Club', 'Ville', 'Stade', 'Latitude', 'Longitude', 'Région / pays', 'Source', 'Statut / alertes', ''].map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{liste.slice(0, 100).map(c => <tr key={c.nom}><td>{c.nom}</td><td>{c.ville ?? 'À renseigner'}</td><td>{c.stade ?? 'À confirmer'}</td><td>{c.latitude ?? '—'}</td><td>{c.longitude ?? '—'}</td><td>{c.region ?? c.ligue} · {c.pays}</td><td>{c.sourceLocalisation ? <a href={c.sourceLocalisation} target="_blank" rel="noreferrer">Consulter</a> : 'Fallback'}</td><td><b>{c.statutGeographique === 'verifie' ? 'Vérifié' : 'Non vérifié'}</b><p className="suspect27">{c.alertes.join(' · ')}</p></td><td><button disabled={occupe} onClick={() => ouvrir(c)}>Corriger</button></td></tr>)}</tbody></table>{liste.length > 100 && <p>100 résultats affichés. Affinez la recherche pour retrouver les autres clubs.</p>}</div>
      <section className="carte"><h3>Rivalités historiques</h3><p>Une rivalité documentée peut exister indépendamment de la distance entre les stades.</p><form onSubmit={e => { e.preventDefault(); void sauver({ operation: 'rivaliteHistorique', clubA, clubB, source }); }}>{[clubA, clubB].map((club, i) => <label key={i}>Club {i + 1}<select required value={club} onChange={e => (i ? setClubB : setClubA)(e.target.value)}><option value="">Choisir un club</option>{vue.clubs.map(c => <option key={c.nom}>{c.nom}</option>)}</select></label>)}<label>Source historique<input required type="url" value={source} onChange={e => setSource(e.target.value)} /></label><button className="btn principal" disabled={occupe || !clubA || !clubB || clubA === clubB}>Enregistrer la rivalité</button></form>
        {vue.rivalites.map(r => <p key={`${r.clubA}|${r.clubB}`}>{r.clubA} — {r.clubB} · <a href={r.source} target="_blank" rel="noreferrer">Source</a> <button disabled={occupe} onClick={() => void sauver({ operation: 'rivaliteHistorique', ...r, supprimer: true })}>Retirer</button></p>)}
      </section>
    </>}
  </div>;
}
