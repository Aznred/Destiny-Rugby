import { useEffect, useState, type FormEvent } from 'react';
import type { PackCarriere } from '../lib/ligue/typesCarriere';
import { chancesPacksPub, type ConfigPublicites, type StatsPublicites } from '../lib/publicitesRecompensees';
import './PublicitesRecompensees.css';

interface DonneesLabo { revision: number; config: ConfigPublicites; modeEffectif: string; raisonMode?: string; callbackConfigure: boolean; packs: PackCarriere[]; statistiques: StatsPublicites;
  /** Les reçus AppLixir que le serveur a refusés — arrivés, donc, mais sans rien créditer. Absent si la lecture a échoué. */
  refus?: { total: number; derniers: { le: number; refus: string; videoTerminee: boolean }[] } | null }
// Pourquoi un reçu a été refusé, en clair. Les codes sont ceux de `RefusCallback` (serveur/publicitesRecompensees.ts).
const RAISONS_REFUS: Record<string, string> = {
  format: 'paramètres manquants ou illisibles', signature: 'signature fausse (secret ou ordre des champs)', session: 'session de publicité inconnue',
  cle: 'autre clé d’API que celle du jeu', jeu: 'autre identifiant de jeu', expiree: 'session expirée', plafond: 'plafond quotidien atteint',
};
async function appeler(corps?: unknown): Promise<DonneesLabo> {
  const r = await fetch('/api/carriere?atelier=1&section=publicites', { method: corps ? 'POST' : 'GET', credentials:'same-origin', cache:'no-store',
    headers: corps ? {'Content-Type':'application/json'} : undefined, body: corps ? JSON.stringify(corps) : undefined });
  const d = await r.json(); if (!r.ok) throw new Error(d.erreur ?? 'Le Labo est indisponible.'); return d;
}
export function LaboPublicites() {
  const [d,setD] = useState<DonneesLabo | null>(null), [config,setConfig] = useState<ConfigPublicites | null>(null);
  const [pack,setPack] = useState<PackCarriere | null>(null), [occupe,setOccupe] = useState(false), [erreur,setErreur] = useState(''), [message,setMessage] = useState('');
  const charger = async () => {
    const donnees = await appeler(); setD(donnees); setConfig(donnees.config); setPack(p => donnees.packs.find(a => a.id === p?.id) ?? donnees.packs[0] ?? null);
  };
  useEffect(() => { void charger().catch(e => setErreur((e as Error).message)); },[]);
  const sauver = async (ev: FormEvent, operation: 'publicites' | 'publicitesPack') => {
    ev.preventDefault(); if (!d) return; setOccupe(true); setErreur(''); setMessage('');
    try {
      await appeler({action:'atelier',operation,revision:d.revision,config,
        packId:pack?.id,options:pack && {published:pack.published ?? true,rewardedAdsEnabled:pack.rewardedAdsEnabled ?? false,
          rewardedAdWeight:pack.rewardedAdWeight ?? null,startsAt:pack.startsAt ?? '',endsAt:pack.endsAt ?? ''}});
      await charger(); setMessage('Réglages enregistrés. Les récompenses déjà gagnées restent réservées.');
    } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };
  if (!d || !config) return <section><h2>Publicités récompensées · AppLixir</h2><p role={erreur ? 'alert' : undefined}>{erreur || 'Chargement…'}</p></section>;
  const maj = (p: Partial<ConfigPublicites>) => setConfig({...config,...p});
  const packs = d.packs.map(p => p.id === pack?.id ? pack : p);
  const chances = chancesPacksPub(packs,Date.now());
  const stats = d.statistiques;
  return <section className="labo-publicites">
    <header><h2>Publicités récompensées · AppLixir</h2><p>Mode effectif : <b>{d.modeEffectif === 'TEST' ? 'Test' : 'Live'}</b> · Callback serveur : <b>{d.callbackConfigure ? 'configuré' : 'à configurer'}</b></p>
      {d.raisonMode && <p role="status" className="ak-note">{d.raisonMode}</p>}
      <p className="ak-note">Une clé marquée Test dans AppLixir reste une clé de test, même si Live est sélectionné ici. Les annonces de test sont exclues des rapports AppLixir.</p></header>
    {erreur && <p className="ak-erreur" role="alert">{erreur}</p>}{message && <p className="ak-succes" role="status">{message}</p>}
    <form onSubmit={e => void sauver(e,'publicites')}><fieldset disabled={occupe}><legend>AppLixir et récompenses</legend>
      <label><input type="checkbox" checked={config.enabled} onChange={e => maj({enabled:e.target.checked})} /> AppLixir activé</label>
      <label>Clé API publique<input required value={config.apiKey} onChange={e => maj({apiKey:e.target.value})} /></label>
      <div className="pub-modes" role="radiogroup" aria-label="Mode AppLixir">{(['TEST','LIVE'] as const).map(mode => <label key={mode}><input type="radio" name="modePub" checked={config.mode===mode} onChange={() => maj({mode})} />{mode==='TEST'?'Test mode':'Live mode'}</label>)}</div>
      <div className="ak-champs"><label><input type="checkbox" checked={config.ovasEnabled} onChange={e => maj({ovasEnabled:e.target.checked})} /> Ovas activés</label>
        <label>Ovas par publicité<input type="number" required min={1} max={10000} value={config.rewardedAdOvasAmount} onChange={e => maj({rewardedAdOvasAmount:Number(e.target.value)})} /></label>
        <label>Limite quotidienne Ovas<input type="number" required min={0} max={20} value={config.ovasDailyLimit} onChange={e => maj({ovasDailyLimit:Number(e.target.value)})} /></label>
        <label><input type="checkbox" checked={config.packsEnabled} onChange={e => maj({packsEnabled:e.target.checked})} /> Packs activés</label>
        <label>Limite quotidienne Packs Pub<input type="number" required min={0} max={2} value={config.packsDailyLimit} onChange={e => maj({packsDailyLimit:Number(e.target.value)})} /></label></div>
      <button className="btn primaire" type="submit">Enregistrer les récompenses</button>
    </fieldset></form>
    <div className="ak-grille"><aside className="ak-liste">{d.packs.map(p => <button key={p.id} className={pack?.id===p.id?'selectionne':''} onClick={() => setPack(p)} disabled={occupe}><b>{p.nom}</b><small>{p.rewardedAdsEnabled ? (p.rewardedAdWeight === undefined ? 'Poids automatique' : `Poids ${p.rewardedAdWeight}`) : 'Hors roulette'}</small></button>)}</aside>
      {pack && <form onSubmit={e => void sauver(e,'publicitesPack')}><fieldset disabled={occupe}><legend>{pack.nom} · roulette</legend>
        <label><input type="checkbox" checked={pack.published !== false} onChange={e => setPack({...pack,published:e.target.checked})} /> Publié</label>
        <label><input type="checkbox" checked={pack.rewardedAdsEnabled === true} onChange={e => setPack({...pack,rewardedAdsEnabled:e.target.checked})} /> Éligible à la roulette publicitaire</label>
        <label>Poids personnalisé<input type="number" min={0} max={1000000} step="any" placeholder="Automatique" value={pack.rewardedAdWeight ?? ''} onChange={e => setPack({...pack,rewardedAdWeight:e.target.value === '' ? undefined : Number(e.target.value)})} /></label>
        <label>Début<input type="datetime-local" value={dateLocale(pack.startsAt)} onChange={e => setPack({...pack,startsAt:e.target.value ? new Date(e.target.value).toISOString() : undefined})} /></label>
        <label>Fin<input type="datetime-local" value={dateLocale(pack.endsAt)} onChange={e => setPack({...pack,endsAt:e.target.value ? new Date(e.target.value).toISOString() : undefined})} /></label>
        <p>Chance actuelle dans le catalogue : <b>{(chances.find(c => c.pack.id===pack.id)?.chance ?? 0).toLocaleString('fr-FR',{maximumFractionDigits:4})} %</b></p>
        <p className="ak-note">Sans poids personnalisé, Bronze reçoit 25 %, Argent 20 %, Or 10 % et les autres packs se partagent 45 % selon leur valeur. Le jeu recalcule les chances sur les packs disponibles dans la ligue. Poids 0, pack non publié ou période terminée : exclu.</p>
        <button className="btn primaire" type="submit">Enregistrer ce pack</button>
      </fieldset></form>}
    </div>
    <section className="pub-statistiques"><h3>Statistiques AppLixir</h3><button className="btn fantome" disabled={occupe} onClick={() => void charger().catch(e => setErreur((e as Error).message))}>Actualiser</button>
      <dl>{([['Demandées',stats.requested],['Démarrées',stats.started],['Terminées et vérifiées',stats.completed],['Échecs / fermetures',stats.failed],['Sans annonce (no-fill)',stats.noFill],['Ovas attribués',stats.ovasRewarded],['Packs gagnés',stats.packsEarned],['Joueurs ayant terminé une pub',stats.joueurs]] as const).map(([nom,n]) => <div key={nom}><dt>{nom}</dt><dd>{n.toLocaleString('fr-FR')}</dd></div>)}</dl>
      <p>Taux de complétion : {stats.started ? (stats.completed/stats.started*100).toFixed(2) : '0'} % · Publicités terminées par joueur : {stats.joueurs ? (stats.completed/stats.joueurs).toFixed(2) : '0'}</p>
      <h3>Reçus AppLixir refusés</h3>
      {!d.refus ? <p className="ak-note">Journal indisponible sur ce stockage.</p> : d.refus.total === 0
        ? <p className="ak-note">Aucun. Si des vidéos sont regardées en entier sans récompense et que ce compteur reste à zéro, le reçu d’AppLixir n’arrive pas jusqu’au serveur : vérifier l’adresse de callback enregistrée chez AppLixir.</p>
        : <><p className="ak-note">{d.refus.total.toLocaleString('fr-FR')} reçu{d.refus.total > 1 ? 's' : ''} arrivé{d.refus.total > 1 ? 's' : ''} jusqu’au serveur sans rien créditer. Les plus récents :</p>
          <div className="pub-tableau-defile"><table><thead><tr><th>Date</th><th>Raison</th><th>Vidéo terminée côté joueur</th></tr></thead><tbody>{d.refus.derniers.map((r, i) => <tr key={`${r.le}-${i}`}><td>{new Date(r.le).toLocaleString('fr-FR')}</td><td>{RAISONS_REFUS[r.refus] ?? r.refus}</td><td>{r.videoTerminee ? 'oui' : 'non'}</td></tr>)}</tbody></table></div></>}
      <h3>Distribution des packs</h3><p className="ak-note">La théorie historique cumule les probabilités réellement proposées à chaque tirage, même après un changement de poids ou de ligue. Les écarts sur peu de tirages restent normaux.</p>
      <div className="pub-tableau-defile"><table><thead><tr><th>Pack</th><th>Théorique historique</th><th>Gagnés</th><th>Réel cumulé</th></tr></thead><tbody>{d.packs.map(p => <tr key={p.id}><td>{p.nom}</td><td>{(stats.packsEarned ? (stats.distributionAttendue?.[p.id] ?? 0)/stats.packsEarned*100 : 0).toFixed(2)} %</td><td>{stats.distribution[p.id] ?? 0}</td><td>{stats.packsEarned ? ((stats.distribution[p.id] ?? 0)/stats.packsEarned*100).toFixed(2) : '0'} %</td></tr>)}</tbody></table></div>
    </section>
  </section>;
}
function dateLocale(iso?: string): string {
  if (!iso) return ''; const d=new Date(iso); if (!Number.isFinite(d.getTime())) return '';
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
