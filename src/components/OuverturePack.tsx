import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CarteCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import { creerSonsPacks } from '../lib/sonsPacks';
import { nomRaretePack, PALIERS_PACK, rangPack } from '../lib/presentationPacks';
import { t } from '../lib/i18n';
import './OuverturePack.css';

// ⚠️ CE `lazy` N'EST PLUS LE PREMIER À DEMANDER LE MODULE. `Pack3D` tire
// Three.js et son décodeur : son import dynamique s'ajoutait au temps du
// serveur, l'un après l'autre, pile au moment où l'écran devait bouger. Il est
// maintenant réchauffé dès l'entrée en boutique par `lib/prechargementPacks.ts`
// — quand on arrive ici, le morceau est déjà là.
const Pack3D = lazy(() => import('./Pack3D'));

const COULEURS = ['#d59a64', '#d7e6f2', '#ffd15b', '#54e4ff', '#ff4057'];
export default function OuverturePack({ cartes, pack, garantie, onFermer, rendreCarte }: {
  /**
   * ⚠️ `null` VEUT DIRE « LE SERVEUR N'A PAS ENCORE RÉPONDU », et c'est un état
   * normal, pas une erreur. La pochette s'affiche AVANT que les cartes soient
   * connues : sans ça, le clic restait sans effet pendant tout l'aller-retour —
   * une seconde et demie sur un téléphone en 5G, plus au réveil de la fonction
   * serverless — et le jeu paraissait figé. Le manager touche la pochette
   * pendant ce temps ; les cartes arrivent avant qu'il ait fini son geste.
   */
  cartes: CarteCarriere[] | null; pack: string; garantie?: RareteCarriere; onFermer: () => void; rendreCarte: (carte: CarteCarriere) => ReactNode;
}) {
  const pret = cartes !== null;
  const ordre = useMemo(() => cartes ? [...cartes].sort((a,b) => rangPack(a)-rangPack(b) || a.note-b.note) : [], [cartes]);
  const plancher = Math.max(0, PALIERS_PACK.indexOf(garantie ?? 'bronze'));
  // Tant que les cartes ne sont pas là, le sommet EST le plancher : la pochette
  // s'affiche à la couleur promise, et la montée en palier attend de savoir.
  const maximum = cartes ? Math.max(plancher, ...cartes.map(rangPack)) : plancher;
  const [rang, setRang] = useState(plancher);
  const [phase, setPhase] = useState<'attente'|'charge'|'evolution'|'ouverture'|'cartes'>('attente');
  const [revelees, setRevelees] = useState(0);
  const [impatient, setImpatient] = useState(false);
  const [instant, setInstant] = useState(false);
  const [muet, setMuet] = useState(false);
  const [calme, setCalme] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sons = useMemo(creerSonsPacks, []);
  const dialogue = useRef<HTMLDivElement>(null);
  const principale = useRef<HTMLButtonElement>(null);
  const verrou = useRef(false);
  const toutes = pret && revelees >= ordre.length;
  const rarete = PALIERS_PACK[rang];
  useEffect(() => {
    const precedent = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; principale.current?.focus();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changer = () => setCalme(media.matches); media.addEventListener('change', changer);
    return () => { document.body.style.overflow = overflow; precedent?.focus(); sons.detruire(); media.removeEventListener('change', changer); };
  }, [sons]);
  useEffect(() => {
    let timer: number | undefined;
    if (phase === 'charge') timer = window.setTimeout(() => { setRang(n => n+1); setPhase('evolution'); }, calme ? 120 : 440);
    if (phase === 'evolution') timer = window.setTimeout(() => { verrou.current = false; setPhase('attente'); }, calme ? 120 : 660);
    if (phase === 'ouverture') timer = window.setTimeout(() => setPhase('cartes'), calme ? 250 : 1600);
    if (phase === 'cartes' && !toutes) timer = window.setTimeout(() => { sons.carte(rangPack(ordre[revelees])); setRevelees(n => n+1); }, calme ? 100 : revelees === ordre.length-1 ? 1250 : 850);
    return () => clearTimeout(timer);
  }, [phase, calme, sons, revelees, toutes, ordre]);

  /**
   * ⚠️ LE GESTE EST MÉMORISÉ, IL N'EST PAS PERDU. Si le manager touche la
   * pochette avant que le serveur ait répondu, on ne refuse pas le clic et on
   * n'affiche pas d'attente : on retient l'intention et on la rejoue dès que
   * les cartes arrivent. Refuser aurait obligé à toucher deux fois, sans
   * jamais dire pourquoi la première n'avait rien fait.
   */
  const demarrer = useRef<() => void>(() => {});
  demarrer.current = () => {
    verrou.current = true;
    if (rang < maximum) { sons.palier(rang+1); setPhase('charge'); }
    else { sons.ouvrir(rang); setPhase('ouverture'); }
  };
  useEffect(() => {
    if (pret && impatient && phase === 'attente' && !verrou.current) { setImpatient(false); demarrer.current(); }
  }, [pret, impatient, phase]);

  function action() {
    if (verrou.current || phase !== 'attente') return;
    sons.activer();
    if (!pret) { setImpatient(true); return; }
    demarrer.current();
  }
  function passer() {
    if (!pret) { setImpatient(true); return; }
    setInstant(true); sons.arreter(); setRang(maximum); setPhase('cartes'); setRevelees(ordre.length);
  }
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') { sons.couper(!muet); setMuet(!muet); }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (phase === 'cartes' && toutes) onFermer();
        else if (!pret) setImpatient(true);
        else { setInstant(true); sons.arreter(); setRang(maximum); setPhase('cartes'); setRevelees(ordre.length); }
      }
    };
    window.addEventListener('keydown', clavier);
    if (!dialogue.current?.contains(document.activeElement)) principale.current?.focus();
    return () => window.removeEventListener('keydown', clavier);
  }, [phase, toutes, maximum, ordre.length, onFermer, muet, sons, pret]);
  const conseil = phase === 'ouverture' ? t('online.shop.opening')
    : phase === 'charge' ? 'Ça monte…'
      : phase === 'evolution' ? nomRaretePack(rarete)+' !'
        : impatient ? t('online.shop.opening') : t('online.pack.touch');
  return createPortal(<div ref={dialogue} className={`pack-show phase-${phase} palier-${rarete}${calme ? ' calme' : ''}${instant ? ' instant' : ''}`} style={{ '--pack-color': COULEURS[rang] } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby="pack-show-title" onKeyDown={e => {
    if (e.key === 'Tab') { const elements = Array.from(dialogue.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []); const premier = elements[0], dernier = elements[elements.length-1]; if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier?.focus(); } else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier?.focus(); } }
  }}><main className="pack-show-main cel-panneau">
    <div className="pack-show-heading"><p className="eyebrow">Pack {pack}{cartes ? ` · ${t('online.shop.cards',{n:cartes.length})}` : ''}</p><h2 id="pack-show-title" key={`${phase}-${rang}`} aria-live="polite">{phase === 'cartes' ? t('online.pack.recruits') : nomRaretePack(rarete)}</h2></div>
    {phase !== 'cartes' ? <><div className="pack-show-stage">
      <div className="pack-show-beams" aria-hidden="true"/><div className="pack-show-orbit" aria-hidden="true"/>
      <div className="pack-show-particles" key={rang} aria-hidden="true">{Array.from({length:28}, (_,i) => <i key={i} style={{'--x':`${i*37%100}%`, '--delay':`${i%9*-.35}s`, '--duration':`${2+i%4}s`, '--drift':`${(i%2?1:-1)*(20+i*3)}px`} as CSSProperties}/>)}</div>
      <div className="pack-show-model"><Suspense fallback={null}><Pack3D rarete={rarete} ouvert={phase === 'ouverture'} calme={calme} transition={phase}/></Suspense></div>
      <button ref={principale} className="pack-show-touch" aria-label={`Pack ${nomRaretePack(rarete)} — ${t('online.pack.touch')}`} aria-disabled={phase !== 'attente'} onClick={action}/>
      {(phase === 'charge' || phase === 'evolution') && <div className="pack-show-upgrade" key={phase} aria-hidden="true"><i/><i/><span/></div>}
      {phase === 'ouverture' && <div className="pack-show-flash" aria-hidden="true"/>}
    </div><p className="pack-show-hint" aria-live="polite">{conseil}</p></> : <div className="pack-show-results">{ordre.map((carte,i) => <div key={carte.id} className={`pack-show-card ${i<revelees?'visible':''} ${i===ordre.length-1?'meilleure':''}`}>
      {i === ordre.length-1 && i < revelees && <span className="pack-show-best">{t('online.pack.best')}</span>}
      <div className="pack-show-flipper"><div className="pack-show-cardback" aria-hidden="true"><span className="pack-back-border"/><small>DESTINY</small><b>DR</b><span>RUGBY</span><i>✦</i></div><div className="pack-show-front" aria-hidden={i>=revelees}>{i<revelees && rendreCarte(carte)}</div></div>
    </div>)}</div>}
    {phase === 'cartes' && <footer className="pack-show-footer"><button ref={principale} className="btn primaire" onClick={toutes?onFermer:passer}>{toutes?t('online.pack.clubhouse'):t('online.pack.reveal')}</button></footer>}
    <span className="pack-show-sr" aria-live="polite">{muet?'Son désactivé':'Son activé'}. M pour changer le son. Échap pour passer.</span>
  </main></div>, document.body);
}
