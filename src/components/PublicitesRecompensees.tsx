import { vignettePackPublicitaire } from '../lib/presentationPacks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from './Icone';
import { PieceOvas } from './PieceOvas';
import { useModalDialog } from '../lib/useModalDialog';
import { chargerBoutiqueCompte } from '../lib/carriereEnLigneClient';
import { attendreBoutiqueSoloEnregistree, recevoirOvasPublicitaires } from '../lib/synchronisationBoutiqueCompte';
import { RewardedAdsService, appelerPublicites, chargerPublicites, claimRewardedAdReward, type SessionNavigateurPub } from '../lib/rewardedAdsService';
import type { ContextePub, RecompensePub, VuePublicites } from '../lib/publicitesRecompensees';
import { RoulettePacksPub } from './RoulettePacksPub';
import './PublicitesRecompensees.css';

export function OffrePublicitaire({ contexte, ligue, onPack, disabled = false }: {
  contexte: ContextePub; ligue?: string; onPack?: (rewardSessionId: string, pack: NonNullable<RecompensePub['pack']>) => Promise<void>;
  disabled?: boolean;
}) {
  const [vue,setVue] = useState<VuePublicites | null>(null), [erreur,setErreur] = useState(''), [message,setMessage] = useState('');
  const [occupe,setOccupe] = useState(false), [session,setSession] = useState<SessionNavigateurPub | null>(null);
  const [recompense,setRecompense] = useState<RecompensePub | null>(null), [verification,setVerification] = useState<string | null>(null);
  const [probabilites,setProbabilites] = useState(false);
  const audioRoulette = useRef<AudioContext | null>(null);
  const amorcerSon = () => {
    if(contexte!=='DAILY_PACK' || typeof AudioContext==='undefined') return;
    try { if(!audioRoulette.current || audioRoulette.current.state==='closed') audioRoulette.current=new AudioContext(); void audioRoulette.current.resume().catch(()=>{}); } catch { /* Le son reste facultatif. */ }
  };
  const vivant = useRef(true), bloque = useRef(false), abort = useRef<AbortController | null>(null);
  const charger = useCallback(async () => {
    try { const d = await chargerPublicites(ligue); if (vivant.current) { setVue(d); setErreur(''); } }
    catch (e) { if (vivant.current) setErreur((e as Error).message); }
  },[ligue]);
  useEffect(() => {
    vivant.current = true; void charger();
    let derniere = Date.now();
    const reveil = () => { if (document.visibilityState === 'visible' && Date.now()-derniere > 60000) { derniere=Date.now(); void charger(); } };
    document.addEventListener('visibilitychange',reveil);
    return () => { vivant.current=false; abort.current?.abort(); void audioRoulette.current?.close().catch(()=>{}); document.removeEventListener('visibilitychange',reveil); };
  },[charger]);
  const recevoir = async (id: string) => {
    abort.current?.abort(); const controle = new AbortController(); abort.current = controle;
    const r = await claimRewardedAdReward(id,controle.signal);
    if (!vivant.current || controle.signal.aborted) return;
    if (!r) { setVerification(id); setMessage('La vidéo est terminée. La confirmation de la récompense est en cours.'); return; }
    setVerification(null);
    if (r.contexte === 'SHOP_OVAS') {
      await attendreBoutiqueSoloEnregistree();
      const coffre = await chargerBoutiqueCompte();
      if (coffre.boutique) recevoirOvasPublicitaires(coffre.boutique.ovas,coffre.boutique.achatsOvas ?? 0);
      setMessage(`+ ${r.montant} Ovas reçus`);
    } else setRecompense(r);
    await charger();
  };
  const preparer = async () => {
    if (bloque.current) return; bloque.current=true; setOccupe(true); setErreur(''); setMessage('');
    let creee: SessionNavigateurPub | undefined;
    try {
      if (!vue) return;
      if (contexte === 'SHOP_OVAS') await attendreBoutiqueSoloEnregistree();
      await RewardedAdsService.initialize(vue.config);
      creee = await appelerPublicites<SessionNavigateurPub>({ operation:'commencer',contexte,ligue });
      if (vivant.current) setSession(creee);
      else void appelerPublicites({operation:'evenement',rewardSessionId:creee.rewardSessionId,evenement:'CLOSED'}).catch(() => {});
    } catch (e) {
      if (vivant.current) setErreur((e as Error).message);
    } finally { bloque.current=false; if (vivant.current) setOccupe(false); }
  };
  const lancer = async () => {
    if (!session || bloque.current) return;
    amorcerSon();
    bloque.current=true; setOccupe(true);
    try {
      const terminee = await RewardedAdsService.showRewardedAd(contexte,session);
      if (!vivant.current) return;
      setSession(null);
      if (terminee) await recevoir(session.rewardSessionId);
      else { void audioRoulette.current?.close().catch(()=>{}); setMessage('Publicité non terminée ou indisponible. Aucune récompense accordée.'); await charger(); }
    } catch (e) { if (vivant.current) setErreur((e as Error).message); }
    finally { bloque.current=false; if (vivant.current) setOccupe(false); }
  };
  const fermer = () => {
    if (!session) return;
    if (occupe) RewardedAdsService.cancel();
    else void appelerPublicites({operation:'evenement',rewardSessionId:session.rewardSessionId,evenement:'CLOSED'}).then(charger).catch(() => {});
    setSession(null);
  };
  const ovas = contexte === 'SHOP_OVAS', restantes = vue ? ovas ? vue.ovasRestantes : vue.packsRestants : 0;
  const active = vue && vue.disponible && (ovas ? vue.config.ovasEnabled : vue.config.packsEnabled) && (ovas || vue.chances.length > 0);
  const reprendre = async (id: string) => {
    if (bloque.current) return; amorcerSon(); bloque.current=true; setOccupe(true);
    try { await recevoir(id); } catch (e) { setErreur((e as Error).message); }
    finally { bloque.current=false; if (vivant.current) setOccupe(false); }
  };
  return <section className="offre-pub" aria-label={ovas ? 'Ovas gratuits' : 'Pack Pub'}>
    <div className="offre-pub-sceau"><Icone nom={ovas ? 'video' : 'cadeau'} taille={27} /></div>
    <div className="offre-pub-texte"><span className="eyebrow">{ovas ? 'Ovas gratuits' : 'Pack Pub'}</span>
      <h3>{ovas ? <><PieceOvas taille={22} /> + {vue?.config.rewardedAdOvasAmount ?? '…'} Ovas</> : 'Regardez une pub et tentez votre chance'}</h3>
      <p>{ovas ? 'Une courte publicité, uniquement si vous le souhaitez.' : 'Récompense garantie : 1 pack'}</p>
      {vue && <small>{restantes} / {ovas ? vue.config.ovasDailyLimit : vue.config.packsDailyLimit} disponibles aujourd’hui{restantes === 0 ? ' — Revenez demain' : ''}</small>}
      {!ovas && vue && vue.chances.length > 0 && <button type="button" className="pub-probabilites" onClick={() => setProbabilites(true)}>Voir les probabilités</button>}
    </div>
    <button className="btn primaire" type="button" disabled={disabled || occupe || !active || restantes === 0 || Boolean(session)} onClick={() => void preparer()}>
      <Icone nom="video" taille={18} />{occupe ? 'Préparation…' : 'Regarder une pub'}
    </button>
    {vue?.raison && <p className="offre-pub-message">{vue.raison}</p>}
    {erreur && <p className="offre-pub-message" role="alert">{erreur}</p>}
    {message && <p className="offre-pub-message" role="status">{message}</p>}
    {verification && <button className="btn fantome" disabled={occupe} onClick={() => void reprendre(verification)}>Vérifier ma récompense</button>}
    {vue?.enAttente.filter(r => r.contexte === contexte).map(r => <div key={r.rewardSessionId} className="pub-reprise">
      <span>{ovas ? 'Vous avez des Ovas à recevoir.' : `Vous avez un Pack Pub non ouvert : ${r.pack?.nom}.`}</span>
      <button className="btn fantome" disabled={disabled || occupe} onClick={() => void reprendre(r.rewardSessionId)}>{ovas ? 'Recevoir mes Ovas' : 'Récupérer mon pack'}</button>
    </div>)}
    {session && <LecteurPublicite session={session} lecture={occupe} lancer={() => void lancer()} fermer={fermer} />}
    {probabilites && vue && <ProbabilitesPublicite vue={vue} fermer={() => setProbabilites(false)} />}
    {recompense?.pack && vue && <RoulettePacksPub audioInitial={audioRoulette.current} recompense={recompense} chances={vue.chances} onFermer={() => setRecompense(null)}
      onOuvrir={async () => { await onPack?.(recompense.rewardSessionId,recompense.pack!); setRecompense(null); await charger(); }} />}
  </section>;
}
function LecteurPublicite({ session, lecture, lancer, fermer }: { session: SessionNavigateurPub; lecture: boolean; lancer: () => void; fermer: () => void }) {
  const {overlayRef,dialogRef} = useModalDialog(fermer);
  useEffect(() => () => { RewardedAdsService.cancel(); },[]);
  return createPortal(<div className="pub-overlay" ref={overlayRef}>
    <div className="pub-dialogue pub-lecteur" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pub-titre">
      <button className="pub-fermer" aria-label="Fermer la publicité" onClick={fermer}><Icone nom="croix" taille={20} /></button>
      <span className="eyebrow">Publicité récompensée</span><h2 id="pub-titre">Regardez une courte publicité</h2>
      <p>Récompense : {session.contexte === 'SHOP_OVAS' ? `+ ${session.montant} Ovas` : '1 pack garanti'}</p>
      <div id="applixir-ad-container" className={lecture ? 'pub-video active' : 'pub-video'} />
      {!lecture && <button className="btn primaire" onClick={lancer}><Icone nom="video" taille={18} /> Lancer la vidéo</button>}
      {lecture && <small>La récompense est validée après le visionnage complet.</small>}
    </div>
  </div>,document.body);
}
function ProbabilitesPublicite({ vue,fermer }: { vue: VuePublicites; fermer: () => void }) {
  const {overlayRef,dialogRef} = useModalDialog(fermer);
  return createPortal(<div className="pub-overlay" ref={overlayRef}><div className="pub-dialogue" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pub-probas-titre">
    <button className="pub-fermer" aria-label="Fermer les probabilités" onClick={fermer}><Icone nom="croix" taille={20} /></button>
    <span className="eyebrow">Un pack garanti</span><h2 id="pub-probas-titre">Les packs possibles</h2>
    <p>Chaque publicité terminée et validée rapporte un pack. Les chances sont calculées depuis les poids du Labo.</p>
    <ul className="pub-probas">{vue.chances.map(c => <li key={c.pack.id}><span className="pub-probas-pack"><img src={vignettePackPublicitaire(c.pack)} width={36} height={48} alt="" loading="lazy" /><span>{c.pack.nom}</span></span><b>{c.chance.toLocaleString('fr-FR',{maximumFractionDigits:4})} %</b></li>)}</ul>
  </div></div>,document.body);
}
export function CarteOvasGratuits() { return <OffrePublicitaire contexte="SHOP_OVAS" />; }
