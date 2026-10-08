import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CarteCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import { creerSonsPacks } from '../lib/sonsPacks';
import { PALIERS_PACK, rangPack } from '../lib/presentationPacks';
import { t } from '../lib/i18n';
import { signaler } from '../lib/tutoriel/guide';
import './OuverturePack.css';

// ⚠️ CE `lazy` N'EST PLUS LE PREMIER À DEMANDER LE MODULE. `Pack3D` tire
// Three.js et son décodeur : son import dynamique s'ajoutait au temps du
// serveur, l'un après l'autre, pile au moment où l'écran devait bouger. Il est
// maintenant réchauffé dès l'entrée en boutique par `lib/prechargementPacks.ts`
// — quand on arrive ici, le morceau est déjà là.
const Pack3D = lazy(() => import('./Pack3D'));

const COULEURS = ['#d59a64', '#d7e6f2', '#ffd15b', '#54e4ff', '#ff4057'];
export default function OuverturePack({ cartes, pack, modele, garantie, apparenceInitiale, onFermer, rendreCarte }: {
  /**
   * ⚠️ `null` VEUT DIRE « LE SERVEUR N'A PAS ENCORE RÉPONDU », et c'est un état
   * normal, pas une erreur. La pochette s'affiche AVANT que les cartes soient
   * connues : sans ça, le clic restait sans effet pendant tout l'aller-retour —
   * une seconde et demie sur un téléphone en 5G, plus au réveil de la fonction
   * serverless — et le jeu paraissait figé. La pochette attend ensuite que le
   * joueur l'ouvre ; les cartes rejoignent l'écran quand le serveur les a tirées.
   */
  cartes: CarteCarriere[] | null; pack: string; modele?: string; garantie?: RareteCarriere;
  apparenceInitiale?: RareteCarriere; onFermer: () => void; rendreCarte: (carte: CarteCarriere) => ReactNode;
}) {
  const pret = cartes !== null;
  // L'écran final reprend la lecture d'un pack de football : la tête d'affiche
  // est à gauche, puis toutes les autres cartes se rangent par niveau. Pour
  // conserver le suspense, la cascade les retourne dans l'autre sens et finit
  // donc toujours par la meilleure.
  const ordre = useMemo(() => cartes ? [...cartes].sort((a,b) => rangPack(b)-rangPack(a) || b.note-a.note) : [], [cartes]);
  // Les skins dédiés gardent leur visuel. Les pochettes génériques partent de
  // leur couleur en boutique, puis le joueur révèle chaque palier du tirage.
  const rangInitial = Math.max(0, PALIERS_PACK.indexOf(apparenceInitiale ?? garantie ?? 'bronze'));
  const [rang, setRang] = useState(rangInitial);
  const meilleurRang = Math.min(PALIERS_PACK.length - 1, cartes?.reduce((meilleur, carte) => Math.max(meilleur, rangPack(carte)), rangInitial) ?? rangInitial);
  const prochainPalier = !modele && pret && rang < meilleurRang;
  const attenteTirage = !modele && !pret;
  // Le libellé ne doit pas annoncer une amélioration avant de toucher le pack.
  const libelleAction = attenteTirage ? t('online.pack.waitCards') : t('online.pack.openNow');
  const [phase, setPhase] = useState<'attente'|'charge'|'evolution'|'ouverture'|'cartes'>('attente');
  const [animationFinie, setAnimationFinie] = useState(false);
  const [revelees, setRevelees] = useState(0);
  const [carteActive, setCarteActive] = useState(0);
  const [instant, setInstant] = useState(false);
  const [muet, setMuet] = useState(false);
  const [calme, setCalme] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sons = useMemo(creerSonsPacks, []);
  const dialogue = useRef<HTMLDivElement>(null);
  const principale = useRef<HTMLButtonElement>(null);
  const cartesRefs = useRef<(HTMLDivElement | null)[]>([]);
  const toutes = pret && revelees >= ordre.length;
  const rarete = PALIERS_PACK[rang];
  // La famille de la meilleure carte spéciale colore l'éclat d'ouverture.
  // ⚠️ SEULEMENT À L'OUVERTURE : avant, la pochette ne dit que son palier, sinon
  // la lueur orange trahirait la Halloween avant même qu'on touche le pack.
  const speciale = ordre.find(c => c.speciale)?.speciale?.type;
  const eclatSpecial = speciale && (phase === 'ouverture' || phase === 'cartes') ? ` speciale-${speciale === 'influencer' ? 'influencer' : speciale === 'halloween' ? 'halloween' : 'icon'}` : '';
  // La première carte spéciale tirée a droit à son explication (file du tutoriel : jamais par-dessus un autre).
  useEffect(() => { if (speciale) signaler('context.carteSpeciale'); }, [speciale]);
  useEffect(() => {
    const precedent = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialogue.current?.focus();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changer = () => setCalme(media.matches); media.addEventListener('change', changer);
    return () => { document.body.style.overflow = overflow; precedent?.focus(); sons.detruire(); media.removeEventListener('change', changer); };
  }, [sons]);
  useEffect(() => {
    if (phase !== 'charge' && phase !== 'evolution') return;
    const timer = window.setTimeout(() => {
      if (phase === 'charge') { setRang(valeur => Math.min(valeur + 1, PALIERS_PACK.length - 1)); setPhase('evolution'); }
      else setPhase('attente');
    }, calme ? 80 : phase === 'charge' ? 440 : 660);
    return () => clearTimeout(timer);
  }, [phase, calme]);
  useEffect(() => {
    if (phase !== 'ouverture' || animationFinie) return;
    const timer = window.setTimeout(() => setAnimationFinie(true), calme ? 250 : 1600);
    return () => clearTimeout(timer);
  }, [phase, calme, animationFinie]);
  useEffect(() => {
    if (phase !== 'cartes' || toutes) return;
    const timer = window.setTimeout(() => {
      const index = ordre.length - 1 - revelees;
      sons.carte(rangPack(ordre[index]));
      setRevelees(n => n+1);
    }, calme ? 100 : revelees === ordre.length-1 ? 1250 : 720);
    return () => clearTimeout(timer);
  }, [phase, calme, sons, revelees, toutes, ordre]);
  useEffect(() => {
    // La carte qui vient de se retourner passe devant les autres. Comme la
    // révélation remonte du fond du pack vers la tête d'affiche, la meilleure
    // finit naturellement sélectionnée.
    if (phase !== 'cartes' || revelees <= 0) return;

    const index = Math.max(0, ordre.length - revelees);
    setCarteActive(index);

    // Sur téléphone, on suit automatiquement la carte en cours de révélation.
    // Le petit délai laisse React rendre la carte retournée avant de la centrer.
    if (window.matchMedia('(max-width: 600px)').matches) {
      const timer = window.setTimeout(() => {
        cartesRefs.current[index]?.scrollIntoView({
          behavior: calme ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }, calme ? 0 : 80);

      return () => window.clearTimeout(timer);
    }
  }, [phase, revelees, ordre.length, calme]);

  useEffect(() => {
    if (pret && animationFinie) setPhase('cartes');
  }, [pret, animationFinie]);
  useEffect(() => { principale.current?.focus(); }, [phase, pret]);
  function avancerPack() {
    if (phase !== 'attente') return;
    if (attenteTirage) return;
    sons.activer();
    if (prochainPalier) { sons.palier(rang + 1); setPhase('charge'); return; }
    sons.ouvrir(rang);
    setPhase('ouverture');
  }
  function passer() {
    if (!pret) return;
    setInstant(true); sons.arreter(); setPhase('cartes'); setRevelees(ordre.length);
  }
  function selectionnerCarte(index: number, focus = false) {
    const debut = Math.max(0, ordre.length - revelees);
    const cible = Math.max(debut, Math.min(ordre.length - 1, index));
    setCarteActive(cible);
    if (focus) window.requestAnimationFrame(() => {
      cartesRefs.current[cible]?.focus();
      cartesRefs.current[cible]?.scrollIntoView({ behavior: calme ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    });
  }
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') { sons.couper(!muet); setMuet(!muet); }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (phase === 'cartes' && toutes) onFermer();
        else if (pret && phase === 'ouverture') { setInstant(true); sons.arreter(); setPhase('cartes'); setRevelees(ordre.length); }
      }
    };
    window.addEventListener('keydown', clavier);
    if (!dialogue.current?.contains(document.activeElement)) (principale.current ?? dialogue.current)?.focus();
    return () => window.removeEventListener('keydown', clavier);
  }, [phase, toutes, ordre.length, onFermer, muet, sons, pret]);
  return createPortal(<div ref={dialogue} tabIndex={-1} className={`pack-show phase-${phase} palier-${rarete}${eclatSpecial}${calme ? ' calme' : ''}${instant ? ' instant' : ''}`} style={{ '--pack-color': eclatSpecial ? (speciale === 'halloween' ? '#ff8a1c' : '#e8c46a') : COULEURS[rang] } as CSSProperties} role="dialog" aria-modal="true" aria-labelledby="pack-show-title" onKeyDown={e => {
    if (e.key === 'Tab') { const elements = Array.from(dialogue.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') ?? []); const premier = elements[0], dernier = elements[elements.length-1]; if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier?.focus(); } else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier?.focus(); } }
  }}><main className="pack-show-main cel-panneau">
    <div className="pack-show-heading"><p className="eyebrow">{t("ui.4dfd1ccc8b22", { v0: pack, v1: cartes ? ` · ${t('online.shop.cards',{n:cartes.length})}` : '' })}</p><h2 id="pack-show-title" key={phase} aria-live="polite">{phase === 'cartes' ? t('online.pack.recruits') : pack}</h2></div>
    {phase !== 'cartes' ? <><div className="pack-show-stage">
      <div className="pack-show-beams" aria-hidden="true"/><div className="pack-show-orbit" aria-hidden="true"/>
      <div className="pack-show-particles" key={rang} aria-hidden="true">{Array.from({length:28}, (_,i) => <i key={i} style={{'--x':`${i*37%100}%`, '--delay':`${i%9*-.35}s`, '--duration':`${2+i%4}s`, '--drift':`${(i%2?1:-1)*(20+i*3)}px`} as CSSProperties}/>)}</div>
      <div className="pack-show-model"><Suspense fallback={null}><Pack3D rarete={rarete} rareteSuivante={prochainPalier ? PALIERS_PACK[rang + 1] : undefined} modele={modele} ouvert={phase === 'ouverture'} calme={calme} transition={phase}/></Suspense></div>
      {phase === 'attente' && <button ref={principale} type="button" className="pack-show-touch" data-tuto="pack-ouvrir" onClick={avancerPack} disabled={attenteTirage} aria-label={libelleAction} />}
      {(phase === 'charge' || phase === 'evolution') && <div className="pack-show-upgrade" aria-hidden="true"><i/><i/><span/></div>}
      {phase === 'ouverture' && <div className="pack-show-flash" aria-hidden="true"/>}
    </div><p className="pack-show-hint" aria-live="polite">{phase === 'attente' ? attenteTirage ? t('online.pack.waitCards') : t('online.pack.openHint') : phase === 'charge' || phase === 'evolution' ? t('online.pack.upgrading') : t('online.shop.opening')}</p></> : <div className="pack-show-results" data-tuto="pack-cartes" role="list" aria-label={t('online.pack.obtainedCards')} style={{ '--pack-count': ordre.length } as CSSProperties}>{ordre.map((carte,i) => {
      const visible = i >= ordre.length - revelees;
      const meilleure = i === 0;
      const active = i === carteActive;
      return <div ref={element => { cartesRefs.current[i] = element; }} key={carte.id} role="listitem" aria-label={visible ? t("ui.fe37aca21b70", { v0: carte.nom, v1: carte.note }) : undefined} tabIndex={visible && active ? 0 : -1} className={`pack-show-card ${visible?'visible':''} ${meilleure?'meilleure':''} ${active?'active':''}`} style={{ '--slot': i, zIndex: active ? ordre.length + 2 : ordre.length - i } as CSSProperties} onPointerEnter={() => visible && setCarteActive(i)} onPointerDown={() => visible && setCarteActive(i)} onFocus={() => visible && setCarteActive(i)} onKeyDown={e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          const debut = Math.max(0, ordre.length - revelees);
          const suivant = e.key === 'Home' ? debut : e.key === 'End' ? ordre.length - 1 : i + (e.key === 'ArrowLeft' ? -1 : 1);
          selectionnerCarte(suivant, true);
        }
      }}>
        {meilleure && visible && <span className="pack-show-best">{t('online.pack.best')}</span>}
        <div className="pack-show-flipper"><div className="pack-show-cardback" aria-hidden="true"><span className="pack-back-border"/><small>{t("ui.f173c39dab2b")}</small><b>{t("ui.40c30a28814a")}</b><span>{t("ui.f02addd67834")}</span><i>✦</i></div><div className="pack-show-front" aria-hidden={!visible}>{visible && rendreCarte(carte)}</div></div>
      </div>;
    })}</div>}
    {phase === 'cartes' && <footer className="pack-show-footer"><button ref={principale} className="btn primaire" data-tuto="pack-suite" onClick={toutes ? onFermer : passer}>{toutes ? t('online.pack.clubhouse') : t('online.pack.reveal')}</button></footer>}
    <span className="pack-show-sr" aria-live="polite">{muet?t('online.pack.soundMuted'):t('online.pack.soundActive')}</span>
  </main></div>, document.body);
}
