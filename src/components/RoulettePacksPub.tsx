import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '../lib/useModalDialog';
import { apparencePack, vignettePackPublicitaire } from '../lib/presentationPacks';
import { choisirPackPub, type ChancePackPub, type RecompensePub } from '../lib/publicitesRecompensees';
import { Icone } from './Icone';
import './PublicitesRecompensees.css';

const CIBLE = 40, LARGEUR = 146;
export function RoulettePacksPub({ recompense,chances,onOuvrir,onFermer,audioInitial }: {
  audioInitial?: AudioContext | null; recompense: RecompensePub; chances: ChancePackPub[]; onOuvrir: () => Promise<void>; onFermer: () => void;
}) {
  const {overlayRef,dialogRef} = useModalDialog(onFermer);
  const piste = useRef<HTMLDivElement>(null), fenetre = useRef<HTMLDivElement>(null);
  const [terminee,setTerminee] = useState(false), [occupe,setOccupe] = useState(false), [erreur,setErreur] = useState('');
  const [son,setSon] = useState(Boolean(audioInitial)), audio = useRef<AudioContext | null>(audioInitial ?? null);
  const gagnant = recompense.pack!;
  const pochettes = useMemo(() => Array.from({length:48},(_,i) => i === CIBLE || !chances.length ? gagnant : choisirPackPub(chances,Math.random())),[gagnant,chances]);
  const rarete = apparencePack(gagnant);
  useEffect(() => {
    let frame = 0, debut: number | undefined, precedente = -1, fin = false, position = 2;
    const centrer = () => {
      if (piste.current && fenetre.current) piste.current.style.transform=`translate3d(${fenetre.current.clientWidth/2 - (position+.5)*LARGEUR}px,0,0)`;
    };
    const taille = new ResizeObserver(centrer);
    if (fenetre.current) taille.observe(fenetre.current);
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duree = reduit ? 200 : 5800;
    const courbe = (t: number) => 10*t*t - 20*t**3 + 15*t**4 - 4*t**5;
    const bruit = (important = false) => {
      const ctx = audio.current; if (!ctx || ctx.state !== 'running') return;
      const osc = ctx.createOscillator(), volume = ctx.createGain();
      osc.type='triangle'; osc.frequency.value=important ? 660 : 1800;
      volume.gain.setValueAtTime(important ? .08 : .022,ctx.currentTime);
      volume.gain.exponentialRampToValueAtTime(.001,ctx.currentTime + (important ? .35 : .035));
      osc.connect(volume); volume.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+(important ? .4 : .04));
      osc.onended=() => { osc.disconnect(); volume.disconnect(); };
    };
    const avancer = (instant: number) => {
      debut ??= instant;
      const t = Math.min(1,(instant-debut)/duree);
      // ⚠️ UNE SEULE DÉCÉLÉRATION, JUSQU'AU PACK QUE LE SERVEUR A TIRÉ (Correctif 42). L'animation marquait un faux arrêt,
      // repère allumé, sur une pochette prise au hasard six cases avant la bonne, puis repartait : quand cette case
      // était un pack rare, c'était un « presque jackpot » fabriqué. Les pochettes qui défilent restent tirées aux vraies
      // chances ; plus aucune n'est mise en avant à la place de celle qui a été gagnée.
      const progression = courbe(t);
      position = 2 + (CIBLE-2)*progression;
      centrer();
      const pas = Math.floor(position);
      if (pas !== precedente) { precedente=pas; bruit(); }
      if (t < 1) frame=requestAnimationFrame(avancer);
      else if (!fin) { fin=true; bruit(true); setTerminee(true); }
    };
    frame=requestAnimationFrame(avancer);
    return () => { cancelAnimationFrame(frame); taille.disconnect(); };
  },[]);
  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current=null; },[]);
  const basculerSon = () => {
    if (son && audio.current?.state !== 'closed') { void audio.current?.suspend().catch(() => {}); setSon(false); }
    else { if (!audio.current || audio.current.state === 'closed') audio.current = new AudioContext(); void audio.current.resume().catch(() => {}); setSon(true); }
  };
  return createPortal(<div className="pub-overlay pub-roulette-overlay" ref={overlayRef}>
    <div className={`pub-dialogue pub-roulette ${terminee ? 'gagnee' : ''} rarete-${rarete}`} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="roulette-titre">
      <button className="pub-fermer" aria-label="Fermer la roulette, le pack reste disponible" onClick={onFermer}><Icone nom="croix" taille={20} /></button>
      <span className="eyebrow">Pack Pub · votre récompense</span><h2 id="roulette-titre">{terminee ? gagnant.nom : 'Le pack arrive…'}</h2>
      <p>{terminee ? 'Votre pack est réservé. Ouvrez-le quand vous le souhaitez.' : 'Une publicité. Un pack garanti.'}</p>
      <div className="pub-roulette-fenetre" ref={fenetre} aria-hidden="true">
        <div className="pub-roulette-piste" ref={piste}>{pochettes.map((p,i) => <div key={i} className={`pub-pochette-cellule rarete-${apparencePack(p)}`}>
          <div className="pub-pochette"><img src={vignettePackPublicitaire(p)} width={120} height={160} alt="" decoding="async" /><b>{p.nom}</b></div>
        </div>)}</div><div className="pub-roulette-repere" /><div className="pub-roulette-eclat" />
      </div>
      {terminee && <div className="pub-etincelles" aria-hidden="true">{Array.from({length:26},(_,i)=><i key={i} style={{'--angle':(i*137.5)+'deg','--distance':(75+(i*23)%210)+'px','--retard':(i%5)*35+'ms'} as CSSProperties} />)}</div>}
      <div className="pub-roulette-actions"><button className="btn fantome" aria-pressed={son} onClick={basculerSon}>{son ? 'Couper le son' : 'Activer le son'}</button>
        <button className="btn primaire" disabled={!terminee || occupe} onClick={() => {
          setOccupe(true); setErreur(''); void onOuvrir().catch(e => setErreur((e as Error).message)).finally(() => setOccupe(false));
        }}>{occupe ? 'Ouverture…' : 'Ouvrir le pack'} <Icone nom="fleche-droite" taille={18} /></button></div>
      {erreur && <p role="alert">{erreur}</p>}
      <span className="pub-roulette-annonce" role="status">{terminee ? `Pack gagné : ${gagnant.nom}` : ''}</span>
    </div>
  </div>,document.body);
}
