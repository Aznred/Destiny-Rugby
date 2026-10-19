import { vignettePackPublicitaire } from '../lib/presentationPacks';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from './Icone';
import { PieceOvas } from './PieceOvas';
import { useModalDialog } from '../lib/useModalDialog';
import { chargerBoutiqueCompte } from '../lib/carriereEnLigneClient';
import { attendreBoutiqueSoloEnregistree, recevoirOvasPublicitaires } from '../lib/synchronisationBoutiqueCompte';
import { RewardedAdsService, appelerPublicites, chargerPublicites, claimRewardedAdReward, publicitesModifiees, sessionOuverte, type CosmetiquePubRecu, type SessionNavigateurPub } from '../lib/rewardedAdsService';
import { etatDeLOffre, type ChancePackPub, type ContextePub, type RecompensePub, type VuePublicites } from '../lib/publicitesRecompensees';
import { RoulettePacksPub } from './RoulettePacksPub';
import './PublicitesRecompensees.css';

/**
 * LES OFFRES PUBLICITAIRES (Correctifs 35 et 42).
 *
 * Quatre usages, un seul déroulé : clic volontaire → publicité complète → reçu signé validé par le serveur → récompense.
 * ⚠️ L'ÉCRAN N'ACCORDE RIEN. Il affiche ce que le serveur a compté (\`VuePublicites\`) : ce qu'il reste aujourd'hui, le
 * pack tiré, la progression d'un cosmétique. Fermer la page après la vidéo ne fait rien perdre — la vue suivante rend
 * la récompense en attente (\`enAttente\`, \`aVerifier\`).
 */
interface OptionsOffre {
  contexte: ContextePub;
  ligue?: string;
  /** COSMETIC : l'article que la publicité fait avancer. */
  article?: string;
  /** Un pack a été gagné et le joueur veut l'ouvrir. */
  onPack?: (rewardSessionId: string, pack: NonNullable<RecompensePub['pack']>) => Promise<void>;
  /** Un cosmétique a avancé (ou vient d'être débloqué). */
  onCosmetique?: (etat: CosmetiquePubRecu) => void;
}

const avecPack = (contexte: ContextePub) => contexte === 'DAILY_PACK' || contexte === 'SHOP_PREMIUM_PACK';
const NOMS: Record<ContextePub, string> = { SHOP_OVAS: 'Ovas gratuits', DAILY_PACK: 'Pack Pub', SHOP_PREMIUM_PACK: 'Pack Premium gratuit', COSMETIC: 'Déblocage gratuit par publicité' };

/**
 * Le déroulé commun : préparer la session, jouer la vidéo, réclamer, reprendre ce qui attend.
 * Rend l'état à afficher et les fenêtres (lecteur, probabilités, roulette) à poser telles quelles.
 */
function useOffrePublicitaire({ contexte, ligue, article, onPack, onCosmetique }: OptionsOffre) {
  const [vue,setVue] = useState<VuePublicites | null>(null), [erreur,setErreur] = useState(''), [message,setMessage] = useState('');
  const [occupe,setOccupe] = useState(false), [session,setSession] = useState<SessionNavigateurPub | null>(null);
  const [recompense,setRecompense] = useState<RecompensePub | null>(null), [verification,setVerification] = useState<string | null>(null);
  const [probabilites,setProbabilites] = useState(false);
  const audioRoulette = useRef<AudioContext | null>(null);
  const amorcerSon = () => {
    if(!avecPack(contexte) || typeof AudioContext==='undefined') return;
    try { if(!audioRoulette.current || audioRoulette.current.state==='closed') audioRoulette.current=new AudioContext(); void audioRoulette.current.resume().catch(()=>{}); } catch { /* Le son reste facultatif. */ }
  };
  const vivant = useRef(true), bloque = useRef(false), abort = useRef<AbortController | null>(null);
  // La session préparée mais pas encore lancée : si l'offre disparaît (autre onglet de la Boutique, autre écran), on la ferme.
  const preparee = useRef<string | null>(null);
  const fermerPreparee = () => {
    const id = preparee.current; preparee.current = null;
    if (!id) return Promise.resolve();
    sessionOuverte(null);
    return appelerPublicites({operation:'evenement',rewardSessionId:id,evenement:'CLOSED'}).catch(() => {});
  };
  const charger = useCallback(async () => {
    try { const d = await chargerPublicites(ligue); if (vivant.current) { setVue(d); setErreur(''); } }
    catch (e) { if (vivant.current) setErreur((e as Error).message); }
  },[ligue]);
  useEffect(() => {
    vivant.current = true; void charger();
    let derniere = Date.now();
    const reveil = () => { if (document.visibilityState === 'visible' && Date.now()-derniere > 60000) { derniere=Date.now(); void charger(); } };
    document.addEventListener('visibilitychange',reveil);
    // Une autre offre du même écran a regardé une publicité : les plafonds affichés ici ont pu bouger.
    const autre = () => { void charger(); };
    window.addEventListener('destiny:publicites',autre);
    return () => { vivant.current=false; void fermerPreparee().then(publicitesModifiees); abort.current?.abort(); void audioRoulette.current?.close().catch(()=>{}); document.removeEventListener('visibilitychange',reveil); window.removeEventListener('destiny:publicites',autre); };
  },[charger]);
  const recevoir = async (id: string) => {
    setVerification(id); // La reprise reste possible si la confirmation réseau échoue.
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
    } else if (r.contexte === 'COSMETIC') {
      if (r.cosmetique) {
        onCosmetique?.(r.cosmetique);
        setMessage(r.cosmetique.debloque ? 'Débloqué ! L’objet est dans ta Personnalisation.' : `Publicité comptée : ${r.cosmetique.progres} / ${r.cosmetique.requis}`);
      }
    } else setRecompense(r);
    publicitesModifiees();
  };
  const preparer = async () => {
    if (bloque.current) return; bloque.current=true; setOccupe(true); setErreur(''); setMessage('');
    let creee: SessionNavigateurPub | undefined;
    try {
      if (!vue) return;
      if (contexte === 'SHOP_OVAS' || contexte === 'COSMETIC') await attendreBoutiqueSoloEnregistree();
      await RewardedAdsService.initialize(vue.config);
      creee = await appelerPublicites<SessionNavigateurPub>({ operation:'commencer',contexte,ligue,...(article ? { article } : {}) });
      preparee.current = creee.rewardSessionId; sessionOuverte(creee.rewardSessionId);
      if (vivant.current) setSession(creee);
      else void fermerPreparee();
    } catch (e) {
      if (vivant.current) setErreur((e as Error).message);
    } finally { bloque.current=false; if (vivant.current) setOccupe(false); }
  };
  const lancer = async () => {
    if (!session || bloque.current) return;
    amorcerSon();
    bloque.current=true; setOccupe(true);
    // Lancée, elle appartient au lecteur : c'est lui qui dira au serveur comment elle s'est terminée.
    preparee.current = null;
    try {
      const terminee = await RewardedAdsService.showRewardedAd(contexte,session);
      if (!vivant.current) return;
      setSession(null);
      if (terminee) await recevoir(session.rewardSessionId);
      else { void audioRoulette.current?.close().catch(()=>{}); setMessage('Publicité non terminée ou indisponible. Aucune récompense accordée.'); publicitesModifiees(); }
    } catch (e) { if (vivant.current) setErreur((e as Error).message); }
    finally { bloque.current=false; if (vivant.current) setOccupe(false); }
  };
  const fermer = () => {
    if (!session) return;
    if (occupe) RewardedAdsService.cancel(session.rewardSessionId);
    else void fermerPreparee().then(() => { publicitesModifiees(); });
    setSession(null);
  };
  const reprendre = async (id: string) => {
    if (bloque.current) return; amorcerSon(); bloque.current=true; setOccupe(true);
    try { await recevoir(id); } catch (e) { setErreur((e as Error).message); }
    finally { bloque.current=false; if (vivant.current) setOccupe(false); }
  };
  const etat = etatDeLOffre(vue, contexte, article);
  // Ce qui attend ce compte pour CET usage (et cet article) : une vidéo terminée à confirmer, une récompense à recevoir.
  const concerne = (r: RecompensePub) => r.contexte === contexte && (contexte !== 'COSMETIC' || r.article === article);
  const aVerifier = (vue?.aVerifier ?? []).filter(r => concerne(r) && r.rewardSessionId !== verification);
  const enAttente = (vue?.enAttente ?? []).filter(concerne);
  const fenetres: ReactNode = <>
    {session && <LecteurPublicite session={session} lecture={occupe} lancer={() => void lancer()} fermer={fermer} />}
    {probabilites && vue && <ProbabilitesPublicite chances={etat.chances} fermer={() => setProbabilites(false)} />}
    {recompense?.pack && vue && <RoulettePacksPub audioInitial={audioRoulette.current} recompense={recompense} chances={etat.chances} onFermer={() => setRecompense(null)}
      onOuvrir={async () => { await onPack?.(recompense.rewardSessionId,recompense.pack!); setRecompense(null); await charger(); }} />}
  </>;
  return { vue, etat, erreur, message, occupe, session, verification, aVerifier, enAttente, fenetres,
    preparer: () => void preparer(), reprendre: (id: string) => void reprendre(id), voirProbabilites: () => setProbabilites(true), recharger: charger };
}

/** La carte d'une offre : Ovas de la Boutique, Pack Pub d'une ligue, pack Premium de la Boutique. */
export function OffrePublicitaire({ contexte, ligue, onPack, disabled = false, titre, sousTitre }: OptionsOffre & {
  disabled?: boolean; titre?: string; sousTitre?: string;
}) {
  const o = useOffrePublicitaire({ contexte, ligue, onPack });
  const { vue, etat } = o;
  const ovas = contexte === 'SHOP_OVAS', premium = contexte === 'SHOP_PREMIUM_PACK';
  // Un usage que le Labo a fermé ne laisse pas de carte vide dans la Boutique.
  if (premium && vue && !vue.config.premiumEnabled) return null;
  const epuise = vue && etat.restantes === 0;
  return <section className={`offre-pub${premium ? ' offre-pub-premium' : ''}`} aria-label={NOMS[contexte]}>
    <div className="offre-pub-sceau"><Icone nom={ovas ? 'video' : premium ? 'etoile' : 'cadeau'} taille={27} /></div>
    <div className="offre-pub-texte"><span className="eyebrow">{NOMS[contexte]}</span>
      <h3>{titre ?? (ovas ? <><PieceOvas taille={22} /> + {vue?.config.rewardedAdOvasAmount ?? '…'} Ovas</>
        : premium ? 'Regarde une publicité pour gagner un pack Premium' : 'Regardez une pub et tentez votre chance')}</h3>
      <p>{sousTitre ?? (ovas ? 'Une courte publicité, uniquement si vous le souhaitez.' : 'Récompense garantie : 1 pack')}</p>
      {vue && <small>{etat.restantes} / {etat.limite} {premium ? 'restantes' : 'disponibles'} aujourd’hui{epuise ? ' — Revenez demain' : ''}</small>}
      {avecPack(contexte) && etat.chances.length > 0 && <button type="button" className="pub-probabilites" onClick={o.voirProbabilites}>Voir les probabilités</button>}
    </div>
    <button className="btn primaire" type="button" disabled={disabled || o.occupe || !etat.active || etat.restantes === 0 || Boolean(o.session)} onClick={o.preparer}>
      <Icone nom="video" taille={18} />{o.occupe ? 'Préparation…' : 'Regarder une pub'}
    </button>
    {vue?.raison && <p className="offre-pub-message">{vue.raison}</p>}
    {o.erreur && <p className="offre-pub-message" role="alert">{o.erreur}</p>}
    {o.message && <p className="offre-pub-message" role="status">{o.message}</p>}
    {o.verification && <button className="btn fantome" disabled={o.occupe} onClick={() => o.reprendre(o.verification!)}>Vérifier ma récompense</button>}
    {o.aVerifier.map(r => <div key={r.rewardSessionId} className="pub-reprise">
      <span>Votre vidéo est terminée. La confirmation de la récompense est en attente.</span>
      <button className="btn fantome" disabled={disabled || o.occupe} onClick={() => o.reprendre(r.rewardSessionId)}>Vérifier ma récompense</button>
    </div>)}
    {o.enAttente.map(r => <div key={r.rewardSessionId} className="pub-reprise">
      <span>{ovas ? 'Vous avez des Ovas à recevoir.' : `Tu as une récompense publicitaire non ouverte : ${r.pack?.nom ?? 'un pack'}.`}</span>
      <button className="btn fantome" disabled={disabled || o.occupe} onClick={() => o.reprendre(r.rewardSessionId)}>{ovas ? 'Recevoir mes Ovas' : 'Récupérer mon pack'}</button>
    </div>)}
    {o.fenetres}
  </section>;
}

/**
 * EN LIGUE, UN PACK QU'ON NE PEUT PAS PAYER PROPOSE LA PUBLICITÉ (Correctif 42).
 * ⚠️ C'EST LE MÊME COMPTEUR QUE LE « PACK PUB » : la fenêtre ouvre une session \`DAILY_PACK\`, comme la carte. Deux
 * récompenses de ligue par jour au total, quel que soit le chemin — et une fois épuisées, la fenêtre le dit au lieu de
 * proposer une publicité qui ne rapporterait rien.
 */
export function ManqueOvasLigue({ ligue, manque, pack, onPack, onFermer, onObtenir }: {
  ligue: string; manque: number; pack: string;
  onPack: OptionsOffre['onPack']; onFermer: () => void; onObtenir?: () => void;
}) {
  const o = useOffrePublicitaire({ contexte: 'DAILY_PACK', ligue, onPack: async (id, gagne) => { await onPack?.(id, gagne); onFermer(); } });
  const { overlayRef, dialogRef } = useModalDialog(onFermer);
  const { vue, etat } = o;
  const proposee = vue ? vue.config.leagueFallbackEnabled !== false && etat.active : false;
  const attente = o.enAttente[0];
  // Les fenêtres du déroulé (lecteur, roulette) restent HORS du voile : un clic dedans ne doit pas le refermer.
  return createPortal(<><div className="pub-overlay" ref={overlayRef} onClick={onFermer}>
    <div className="pub-dialogue pub-manque" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pub-manque-titre" onClick={e => e.stopPropagation()}>
      <button className="pub-fermer" aria-label="Fermer" onClick={onFermer}><Icone nom="croix" taille={20} /></button>
      <span className="eyebrow">{pack}</span>
      <h2 id="pub-manque-titre">Pas assez d’Ovas</h2>
      <p className="pub-manque-ecart"><PieceOvas taille={20} /> Il te manque <b>{manque.toLocaleString('fr-FR')}</b> Ovas pour ce pack.</p>
      {!vue && !o.erreur && <p>Un instant…</p>}
      {vue && proposee && etat.restantes > 0 && <>
        <p>Tu peux regarder une publicité pour tenter d’obtenir un pack gratuitement.</p>
        <button className="btn primaire pub-manque-action" type="button" disabled={o.occupe || Boolean(o.session)} onClick={o.preparer}>
          <Icone nom="video" taille={18} />{o.occupe ? 'Préparation…' : 'Regarder une pub et gagner un pack'}
        </button>
        <small>{etat.restantes} / {etat.limite} {etat.restantes > 1 ? 'récompenses publicitaires restantes' : 'récompense publicitaire restante'} aujourd’hui</small>
        {etat.chances.length > 0 && <button type="button" className="pub-probabilites" onClick={o.voirProbabilites}>Voir les probabilités</button>}
      </>}
      {vue && proposee && etat.restantes === 0 && <p className="pub-manque-epuise">
        Tes {etat.limite} récompenses publicitaires de Ligue ont déjà été utilisées aujourd’hui.
      </p>}
      {attente && <div className="pub-reprise">
        <span>Tu as une récompense publicitaire non ouverte : {attente.pack?.nom ?? 'un pack'}.</span>
        <button className="btn fantome" disabled={o.occupe} onClick={() => o.reprendre(attente.rewardSessionId)}>Récupérer mon pack</button>
      </div>}
      {o.verification && <button className="btn fantome" disabled={o.occupe} onClick={() => o.reprendre(o.verification!)}>Vérifier ma récompense</button>}
      {o.erreur && <p className="offre-pub-message" role="alert">{o.erreur}</p>}
      {o.message && <p className="offre-pub-message" role="status">{o.message}</p>}
      {onObtenir && <button className="btn fantome pub-manque-action" type="button" onClick={() => { onFermer(); onObtenir(); }}>
        <PieceOvas taille={18} /> Obtenir des Ovas
      </button>}
    </div>
  </div>{o.fenetres}</>,document.body);
}

/**
 * UN COSMÉTIQUE QUI SE DÉBLOQUE EN REGARDANT DES PUBLICITÉS : la jauge, et le bouton tant qu'il reste des pas à faire.
 * Une fois l'objet acquis, plus aucun bouton : il n'est pas répétable.
 */
export function DeblocageCosmetiqueParPub({ article, possede = false, onCosmetique }: {
  article: string; possede?: boolean; onCosmetique?: (etat: CosmetiquePubRecu) => void;
}) {
  // Le déblocage ne s'annonce qu'une fois : par la réclamation qui vient d'aboutir, ou par la vue (autre appareil, page fermée trop tôt).
  const dejaDit = useRef(false);
  const o = useOffrePublicitaire({ contexte: 'COSMETIC', article, onCosmetique: (recu) => { if (recu.debloque) dejaDit.current = true; onCosmetique?.(recu); } });
  const { vue, etat } = o;
  const progres = etat.progres;
  const du = Boolean(progres?.debloque && !possede);
  useEffect(() => {
    if (!du || dejaDit.current || !progres) return;
    dejaDit.current = true;
    onCosmetique?.({ id: article, ...progres });
  }, [du, progres, article, onCosmetique]);
  if (possede || progres?.debloque) return null;
  if (vue && (!vue.config.cosmeticsEnabled || !vue.config.cosmetiques?.[article]?.actif)) return null;
  const requis = progres?.requis ?? vue?.config.cosmetiques?.[article]?.requis ?? 1, fait = progres?.progres ?? 0;
  const attente = o.enAttente[0];
  return <div className="pub-cosmetique" onClick={e => e.stopPropagation()}>
    <div className="pub-cosmetique-jauge" role="progressbar" aria-valuemin={0} aria-valuemax={requis} aria-valuenow={fait}
      aria-label={`${fait} publicité${fait > 1 ? 's' : ''} sur ${requis}`}>
      {Array.from({ length: requis }, (_, i) => <i key={i} className={i < fait ? 'faite' : ''} />)}
    </div>
    <span className="pub-cosmetique-compte">{requis > 1 ? `Regarder ${requis} pubs` : 'Regarder 1 pub'} — <b>{fait} / {requis}</b></span>
    {attente ? <button type="button" className="btn fantome petit" disabled={o.occupe} onClick={() => o.reprendre(attente.rewardSessionId)}>Valider ma publicité</button>
      : <button type="button" className="btn primaire petit" disabled={o.occupe || !etat.active || etat.restantes === 0 || Boolean(o.session)} onClick={o.preparer}>
        <Icone nom="video" taille={14} /> {o.occupe ? 'Préparation…' : 'Regarder une pub'}
      </button>}
    {vue && etat.active && etat.restantes === 0 && <small>Reviens demain pour la suite.</small>}
    {vue && !vue.disponible && vue.raison && <small>{vue.raison}</small>}
    {o.verification && <button type="button" className="btn fantome petit" disabled={o.occupe} onClick={() => o.reprendre(o.verification!)}>Vérifier ma récompense</button>}
    {o.aVerifier.map(r => <button key={r.rewardSessionId} type="button" className="btn fantome petit" disabled={o.occupe} onClick={() => o.reprendre(r.rewardSessionId)}>Vérifier ma récompense</button>)}
    {o.erreur && <small role="alert">{o.erreur}</small>}
    {o.message && <small role="status">{o.message}</small>}
    {o.fenetres}
  </div>;
}

function LecteurPublicite({ session, lecture, lancer, fermer }: { session: SessionNavigateurPub; lecture: boolean; lancer: () => void; fermer: () => void }) {
  const {overlayRef,dialogRef} = useModalDialog(fermer);
  useEffect(() => () => { RewardedAdsService.cancel(session.rewardSessionId); },[session.rewardSessionId]);
  const gain = session.contexte === 'SHOP_OVAS' ? `+ ${session.montant} Ovas` : session.contexte === 'COSMETIC' ? '1 pas vers ton cosmétique'
    : session.contexte === 'SHOP_PREMIUM_PACK' ? '1 pack Premium garanti' : '1 pack garanti';
  return createPortal(<div className="pub-overlay" ref={overlayRef}>
    <div className="pub-dialogue pub-lecteur" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pub-titre">
      <button className="pub-fermer" aria-label="Fermer la publicité" onClick={fermer}><Icone nom="croix" taille={20} /></button>
      <span className="eyebrow">Publicité récompensée</span><h2 id="pub-titre">Regardez une courte publicité</h2>
      <p>Récompense : {gain}</p>
      {session.mode === 'TEST' && <small>Annonce de test</small>}
      <div id="applixir-ad-container" className={lecture ? 'pub-video active' : 'pub-video'} />
      {!lecture && <button className="btn primaire" onClick={lancer}><Icone nom="video" taille={18} /> Lancer la vidéo</button>}
      {lecture && <small>La récompense est validée après le visionnage complet.</small>}
    </div>
  </div>,document.body);
}
function ProbabilitesPublicite({ chances,fermer }: { chances: ChancePackPub[]; fermer: () => void }) {
  const {overlayRef,dialogRef} = useModalDialog(fermer);
  return createPortal(<div className="pub-overlay" ref={overlayRef}><div className="pub-dialogue" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pub-probas-titre">
    <button className="pub-fermer" aria-label="Fermer les probabilités" onClick={fermer}><Icone nom="croix" taille={20} /></button>
    <span className="eyebrow">Un pack garanti</span><h2 id="pub-probas-titre">Les packs possibles</h2>
    <p>Chaque publicité terminée et validée rapporte un pack. Le serveur tire selon ces chances, calculées depuis les poids du Labo ; la roulette montre son tirage, elle ne le décide pas.</p>
    <ul className="pub-probas">{chances.map(c => <li key={c.pack.id}><span className="pub-probas-pack"><img src={vignettePackPublicitaire(c.pack)} width={36} height={48} alt="" loading="lazy" /><span>{c.pack.nom}</span></span><b>{c.chance.toLocaleString('fr-FR',{maximumFractionDigits:4})} %</b></li>)}</ul>
  </div></div>,document.body);
}
export function CarteOvasGratuits() { return <OffrePublicitaire contexte="SHOP_OVAS" />; }
