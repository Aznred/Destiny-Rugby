import { useEffect, useRef, useState } from 'react';

async function api(ligue: string, corps?: object) {
  const r = await fetch(`/api/carriere?push=1&ligue=${encodeURIComponent(ligue)}`, {
    method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache:'no-store',
    headers: corps ? { 'Content-Type':'application/json' } : undefined,
    body: corps ? JSON.stringify({action:'push',ligue,...corps}) : undefined, signal:AbortSignal.timeout(15000),
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.erreur || 'Impossible de joindre le service de notifications.');
  return v;
}
export function NotificationsMatch({ ligue }: {ligue:string}) {
  const support = typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && window.isSecureContext;
  const [actif,setActif] = useState(false);
  const [pret,setPret] = useState(false);
  const [occupe,setOccupe] = useState(false);
  const [message,setMessage] = useState('');
  const [erreur,setErreur] = useState('');
  const config = useRef<{cle:string; worker:ServiceWorkerRegistration} | null>(null);
  useEffect(() => {
    let vivant = true;
    setPret(false); setActif(false); setErreur(''); config.current = null;
    if (!support) return;
    void (async () => {
      const [c] = await Promise.all([api(ligue),navigator.serviceWorker.register('/sw.js',{scope:'/'})]);
      if (!c.disponible) throw new Error('Les alertes téléphone attendent la mise en service par le serveur.');
      const worker = await navigator.serviceWorker.ready;
      const abonnement = await worker.pushManager.getSubscription();
      const etat = abonnement ? await api(ligue,{operation:'etat',abonnement:abonnement.toJSON()}) : {actif:false};
      if (vivant) { config.current = {cle:c.clePublique,worker}; setActif(etat.actif && Notification.permission === 'granted'); setPret(true); }
    })().catch(e => { if (vivant) setErreur(e.message); });
    return () => { vivant = false; };
  },[ligue,support]);
  const basculer = async () => {
    const c = config.current;
    if (!c || occupe) return;
    setOccupe(true); setErreur(''); setMessage('');
    // L'appel à la permission reste directement dans le geste utilisateur (iOS).
    const permission = actif ? Promise.resolve(Notification.permission) : Notification.requestPermission();
    try {
      const accord = await permission;
      if (!actif && accord !== 'granted') throw new Error(accord === 'denied' ? 'Notifications bloquées. Autorise Destiny Rugby dans les réglages du téléphone ou du navigateur.' : 'Autorisation non accordée. Tu peux réessayer.');
      let abonnement = await c.worker.pushManager.getSubscription();
      if (actif) {
        if (abonnement) await api(ligue,{operation:'supprimer',endpoint:abonnement.endpoint});
        setActif(false); return;
      }
      const cle = Uint8Array.from(atob(c.cle.replace(/-/g,'+').replace(/_/g,'/')),v=>v.charCodeAt(0));
      abonnement ??= await c.worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:cle});
      await api(ligue,{operation:'activer',abonnement:abonnement.toJSON()});
      setActif(true); setMessage('Alertes activées pour les matchs de ton club.');
    } catch (e) { setErreur(e instanceof Error ? e.message : 'Activation impossible. Réessaie.'); }
    finally { setOccupe(false); }
  };
  const tester = async () => {
    setOccupe(true); setErreur(''); setMessage('');
    try {
      const abonnement = await config.current?.worker.pushManager.getSubscription();
      if (!abonnement) throw new Error('Réactive les notifications de cet appareil.');
      await api(ligue,{operation:'tester',abonnement:abonnement.toJSON()});
      setMessage('Test envoyé. Vérifie le centre de notifications du téléphone.');
    } catch(e) { setErreur(e instanceof Error ? e.message : 'Échec du test.'); }
    finally { setOccupe(false); }
  };
  return <section className="cel-panneau cel-notifications-telephone">
    <div className="cel-titre-ligne"><h2>Ton match, même écran verrouillé</h2>
      <button className="btn" disabled={!pret || occupe} onClick={() => void basculer()} aria-pressed={actif}>{occupe ? 'Patiente…' : actif ? 'Désactiver les alertes' : 'Activer les notifications'}</button></div>
    <p className="cel-note">Essais, transformations, pénalités, cartons, décisions et résultat : les moments importants de ton club dans les notifications du téléphone.</p>
    <p className="cel-note">Sur iPhone (iOS 16.4 ou plus), ajoute Destiny Rugby à l’écran d’accueil depuis le menu Partager de Safari, puis ouvre le jeu avec cette icône pour activer les alertes.</p>
    {!support && <p role="status">Ouvre le jeu installé sur l’écran d’accueil, ou utilise un navigateur compatible avec les notifications.</p>}
    {erreur && <p className="cel-erreur" role="alert">{erreur}</p>}
    {message && <p role="status">{message}</p>}
    {actif && <button className="btn fantome" disabled={occupe} onClick={() => void tester()}>Envoyer une notification de test</button>}
  </section>;
}
