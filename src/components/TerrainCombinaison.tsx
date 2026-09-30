import { useEffect, useId, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from './Icone';
import { useModalDialog } from '../lib/useModalDialog';
import { alignementCombinaison, lancerApresBloc, origineApercu, receptionTouche, toucheValide, type ActionCombinaison, type Combinaison, type PointCombinaison, type VarianteCombinaison } from '../lib/ligue/combinaisons';
import { imageApercu, positionsApercu } from '../lib/ligue/apercuCombinaisons';
import { terrainSimulationCombinaison } from '../lib/ligue/simulationCombinaisons';
import { maillotDeSecours, type MaillotMatch } from '../lib/moteur/apparenceMatch';
import { SpriteRugbymanMemo } from './match/SpriteRugbyman';
import { bornerVueCombinaison, commencerNavigation, poursuivreNavigation, type GesteNavigation, type VueCombinaison } from '../lib/ligue/navigationCombinaisons';
import { joueursEngagesCombinaison } from '../lib/ligue/placementsCombinaisons';

const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function TerrainAgrandi({ children, fermer }: { children: ReactNode; fermer: () => void }) {
  const { overlayRef, dialogRef } = useModalDialog(fermer);
  return createPortal(<div ref={overlayRef} className="ec-fond-agrandi">
    <div ref={dialogRef} className="ec ec-agrandi" role="dialog" aria-modal="true" aria-label="Terrain agrandi de la combinaison" tabIndex={-1}>{children}</div>
  </div>, document.body);
}

export function TerrainCombinaison({ combinaison: c, variante: v, joueurs, maillot, joueur, actionIndex, bloque, selectionner, placer, modifierAction, modifierVariante }: {
  combinaison: Combinaison;
  variante: VarianteCombinaison;
  joueurs: Record<number, string>;
  maillot?: MaillotMatch;
  joueur: number | null;
  actionIndex: number | null;
  bloque: boolean;
  selectionner: (numero: number | null, placementLibre?: boolean) => void;
  placer: (numero: number, point: PointCombinaison) => void;
  modifierAction: (action: ActionCombinaison) => void;
  modifierVariante: (variante: VarianteCombinaison) => void;
}) {
  const [agrandi, setAgrandi] = useState(false);
  const [temps, setTemps] = useState<number | null>(null);
  const [lecture, setLecture] = useState(false);
  const [vitesse, setVitesse] = useState(1);
  const [tracesVisibles, setTracesVisibles] = useState(true);
  const [vue, setVue] = useState<'terrain' | 'combinaison' | 'touche'>('terrain');
  const [zoom, setZoom] = useState(1);
  const [decalage, setDecalage] = useState({ x: 0, y: 0 });
  const [apresConquete, setApresConquete] = useState(false);
  const contacts = useRef(new Map<number, PointCombinaison>());
  const geste = useRef<{ numero: number | null; placement: boolean; decalageJoueur: PointCombinaison; debut: PointCombinaison; glisse: boolean; multiple: boolean; navigation: GesteNavigation } | null>(null);
  const [fantome, setFantome] = useState<{ numero: number; point: PointCombinaison } | null>(null);
  const vueCourante = useRef<VueCombinaison>({ zoom: 1, centre: { x: 50, y: 35 } });
  const boutonTerrain = useRef<HTMLButtonElement>(null);
  const terrainRef = useRef<SVGSVGElement>(null);
  const [tailleTerrain, setTailleTerrain] = useState({ largeur: 700, hauteur: 490 });
  const marqueur = useId().replace(/:/g, '');
  const origine = origineApercu(c);
  const initiales = positionsApercu(c, v, !apresConquete);
  const image = useMemo(() => {
    const resultat = imageApercu(c, v, temps);
    const positions = positionsApercu(c, v);
    const porteur = c.phase === 'touche' ? v.sauteur : v.depart;
    const depart = temps === null && apresConquete
      ? { ...resultat, positions, ballon: positions[porteur], porteur } : resultat;
    return fantome && temps === null ? { ...depart, positions: { ...depart.positions, [fantome.numero]: fantome.point }, ballon: depart.porteur === fantome.numero ? fantome.point : depart.ballon } : depart;
  }, [c, v, temps, apresConquete, fantome]);
  const positions = image.positions;
  const ballon = image.ballon;
  const simulation = useMemo(() => terrainSimulationCombinaison(c, v, image, temps, joueurs, apresConquete), [c, v, image, temps, joueurs, apresConquete]);
  const tenue = useMemo(() => maillot ?? maillotDeSecours('#b9473d', 'atelier'), [maillot]);
  const traces = image.traces;
  const touche = toucheValide(v.touche);
  const lancerLong = lancerApresBloc(v);
  const reception = receptionTouche(origine, v);
  const formation = alignementCombinaison(v);
  const lifteurs = lancerLong ? [] : formation.filter(p => p.numero !== v.sauteur).sort((a, b) => Math.abs(a.distance - touche.distance) - Math.abs(b.distance - touche.distance)).slice(0, 2);
  const action = actionIndex === null ? undefined : v.actions[actionIndex];
  const destination = action?.type === 'course' || action?.type === 'leurre';
  const etape = temps === null ? -1 : Math.min(Math.floor(temps), traces.length - 1);
  const engages = useMemo(() => joueursEngagesCombinaison(c, v), [c, v]);
  const verrouilles = temps === null && !apresConquete ? engages : [];
  const joueurVerrouille = joueur !== null && verrouilles.includes(joueur);
  const navigationLibre = joueur === null && actionIndex === null || temps !== null || bloque;

  useEffect(() => {
    if (!lecture) return;
    let precedent = performance.now();
    const timer = window.setInterval(() => {
      const maintenant = performance.now(); const delta = Math.min((maintenant - precedent) / 1000, .12) * vitesse;
      precedent = maintenant; setTemps(t => Math.min((t ?? 0) + delta, traces.length));
    }, 40);
    return () => window.clearInterval(timer);
  }, [lecture, traces.length, vitesse]);
  useEffect(() => { if (temps !== null && temps >= traces.length) setLecture(false); }, [temps, traces.length]);
  useEffect(() => { setTemps(null); setLecture(false); }, [v, actionIndex, c.phase, c.zone, c.couloir]);
  useEffect(() => { setApresConquete(false); }, [c.phase, c.zone, c.couloir]);
  useEffect(() => { if (joueurVerrouille) selectionner(null, true); }, [joueurVerrouille, selectionner]);
  useEffect(() => { contacts.current.clear(); geste.current = null; setFantome(null); }, [agrandi, c.id, c.phase, c.zone, c.couloir, vue]);
  useEffect(() => {
    const svg = terrainRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => {
      const r = svg.getBoundingClientRect(); setTailleTerrain({ largeur: r.width, hauteur: r.height });
    });
    observer.observe(svg); return () => observer.disconnect();
  }, [agrandi]);

  const points = traces.flatMap(t => [t.de, t.vers]);
  const minX = Math.min(origine.x, ...points.map(p => p.x));
  const maxX = Math.max(origine.x, ...points.map(p => p.x));
  const minY = Math.min(origine.y, ...points.map(p => p.y));
  const maxY = Math.max(origine.y, ...points.map(p => p.y));
  const largeurBase = vue === 'terrain' ? 100 : vue === 'touche' ? 40 : borner(Math.max(maxX - minX + 12, (maxY - minY + 12) / .7), 40, 100);
  const largeur = largeurBase / zoom;
  const hauteur = largeur * .7;
  const centre = vue === 'terrain' ? { x: 50, y: 35 } : vue === 'touche' ? { x: origine.x, y: c.couloir === 'droite' ? 60 : 10 }
    : { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const coin = { x: borner(centre.x + decalage.x - largeur / 2, 0, 100 - largeur), y: borner(centre.y + decalage.y - hauteur / 2, 0, 70 - hauteur) };
  vueCourante.current = { zoom, centre: { x: coin.x + largeur / 2, y: coin.y + hauteur / 2 } };
  const pixelsParMetre = Math.min(tailleTerrain.largeur / (largeur + 6), tailleTerrain.hauteur / (hauteur + 8));
  const hauteurJoueur = borner(40 / (pixelsParMetre || 1), 4.2, 9);
  const choisirVue = (valeur: typeof vue) => { setVue(valeur); setZoom(1); setDecalage({ x: 0, y: 0 }); };
  const appliquerVue = (prochaine: VueCombinaison) => {
    const bornee = bornerVueCombinaison(prochaine, largeurBase);
    vueCourante.current = bornee;
    setZoom(bornee.zoom); setDecalage({ x: bornee.centre.x - centre.x, y: bornee.centre.y - centre.y });
  };
  const changerZoom = (valeur: number) => appliquerVue({ ...vueCourante.current, zoom: valeur });
  const cadreTerrain = (svg: SVGSVGElement) => {
    const r = svg.getBoundingClientRect(); return { x: r.left, y: r.top, largeur: r.width, hauteur: r.height };
  };
  const pointDuClic = (e: PointerEvent<SVGSVGElement>) => {
    const point = e.currentTarget.createSVGPoint(); point.x = e.clientX; point.y = e.clientY;
    const matrice = e.currentTarget.getScreenCTM();
    const p = matrice ? point.matrixTransform(matrice.inverse()) : origine;
    return { x: Math.round(borner(p.x, .7, 99.3) * 10) / 10, y: Math.round(borner(p.y, .7, 69.3) * 10) / 10 };
  };
  const placerSurTerrain = (numero: number, p: PointCombinaison) => {
    if (verrouilles.includes(numero)) return;
    if (c.phase === 'touche' && numero === 2) return;
    if (c.phase === 'touche' && numero === v.sauteur) {
      const distance = Math.round(borner(c.couloir === 'droite' ? 70 - p.y : p.y, v.sauteur > 8 ? 15.5 : 5, 25) * 10) / 10;
      if (distance > 15) setApresConquete(true);
      modifierVariante({ ...v, touche: { ...touche, distance } });
      return;
    }
    setApresConquete(true);
    placer(numero, p);
  };
  const toucherTerrain = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const point = { x: e.clientX, y: e.clientY };
    contacts.current.set(e.pointerId, point); e.currentTarget.setPointerCapture(e.pointerId);
    const navigation = commencerNavigation(vueCourante.current, [...contacts.current.values()], largeurBase, cadreTerrain(e.currentTarget));
    if (contacts.current.size > 1 && geste.current) {
      geste.current = { ...geste.current, placement: false, glisse: true, multiple: true, navigation };
      setFantome(null); return;
    }
    const numero = Number((e.target as Element).closest('[data-numero]')?.getAttribute('data-numero')) || null;
    const p = pointDuClic(e);
    const decalageJoueur = numero === null ? { x: 0, y: 0 } : { x: positions[numero].x - p.x, y: positions[numero].y - p.y };
    geste.current = { numero, placement: !navigationLibre && numero !== null && !verrouilles.includes(numero) && action?.type !== 'passe', decalageJoueur, debut: point, glisse: false, multiple: false, navigation };
  };
  const bougerTerrain = (e: PointerEvent<SVGSVGElement>) => {
    const g = geste.current;
    if (!g || !contacts.current.has(e.pointerId)) return;
    e.preventDefault(); contacts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!g.glisse && Math.hypot(e.clientX - g.debut.x, e.clientY - g.debut.y) < 8) return;
    g.glisse = true;
    if (g.placement && !g.multiple && g.numero !== null) {
      const p = pointDuClic(e);
      setFantome({ numero: g.numero, point: { x: borner(p.x + g.decalageJoueur.x, .7, 99.3), y: borner(p.y + g.decalageJoueur.y, .7, 69.3) } });
    }
    else appliquerVue(poursuivreNavigation(g.navigation, [...contacts.current.values()], largeurBase, cadreTerrain(e.currentTarget)));
  };
  const finirTerrain = (e: PointerEvent<SVGSVGElement>, annule = false) => {
    const g = geste.current;
    if (!g || !contacts.current.has(e.pointerId)) return;
    contacts.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (contacts.current.size) {
      geste.current = { ...g, placement: false, glisse: true, multiple: true,
        navigation: commencerNavigation(vueCourante.current, [...contacts.current.values()], largeurBase, cadreTerrain(e.currentTarget)) };
      setFantome(null); return;
    }
    geste.current = null; setFantome(null);
    if (annule || g.multiple || bloque || temps !== null) return;
    if (g.glisse) {
      // Le placement n'est enregistré qu'au relâchement : un second doigt
      // peut donc reprendre la navigation sans modifier le cahier.
      if (g.placement && g.numero !== null) {
        const p = pointDuClic(e);
        selectionner(g.numero); placerSurTerrain(g.numero, { x: borner(p.x + g.decalageJoueur.x, .7, 99.3), y: borner(p.y + g.decalageJoueur.y, .7, 69.3) });
      }
      return;
    }
    if (g.numero !== null) {
      if (verrouilles.includes(g.numero)) return;
      selectionner(joueur === g.numero && actionIndex === null ? null : g.numero);
      if (action?.type === 'passe') modifierAction({ type: 'passe', destinataire: g.numero });
    } else if (!navigationLibre) {
      const p = pointDuClic(e);
      if (destination && action) modifierAction({ ...action, destination: { x: borner(p.x - origine.x, -35, 35), y: p.y - origine.y } });
      else if (joueur !== null) placerSurTerrain(joueur, p);
    }
  };
  const numeros = (valeur: number, changer: (n: number) => void, filtre = (_n: number) => true) => <select value={valeur} onChange={e => changer(Number(e.target.value))}>{Array.from({ length: 15 }, (_, i) => i + 1).filter(filtre).map(n => <option key={n} value={n}>N° {n}{joueurs[n] ? ` · ${joueurs[n]}` : ''}</option>)}</select>;
  const montrerEtape = (t: number) => { setLecture(false); setTemps(borner(t, 0, traces.length)); };
  const fermerTerrain = () => { setAgrandi(false); window.requestAnimationFrame(() => boutonTerrain.current?.focus()); };

  const contenu = <>
    <div className="ec-terrain-entete"><div><b>{agrandi ? c.nom : 'Terrain de création'}</b><span>{v.nom} · Attaque vers la droite</span></div>
      <button ref={boutonTerrain} className="btn" onClick={() => { if (agrandi) fermerTerrain(); else { if (vue === 'terrain' && zoom === 1) choisirVue(c.phase === 'touche' ? 'touche' : 'combinaison'); setAgrandi(true); } }}><Icone nom={agrandi ? 'croix' : 'plein-ecran'} taille={16} />{agrandi ? 'Fermer le terrain agrandi' : 'Agrandir le terrain'}</button>
    </div>
    <div className="ec-visualiseur">
      <div className="ec-visualiseur-principal">
        <div className="ec-vues">
          <div className="ec-segments" role="group" aria-label="Vue du terrain">
            <button className="btn fantome" aria-pressed={vue === 'terrain'} onClick={() => choisirVue('terrain')}>Terrain entier</button>
            <button className="btn fantome" aria-pressed={vue === 'combinaison'} onClick={() => choisirVue('combinaison')}>La combinaison</button>
            {c.phase === 'touche' && <button className="btn fantome" aria-pressed={vue === 'touche'} onClick={() => choisirVue('touche')}>Le lancer</button>}
          </div>
          <div className="ec-zoom"><button className="btn fantome ec-bouton-icone" disabled={zoom <= 1} aria-label="Dézoomer le terrain" onClick={() => changerZoom(zoom - .5)}><Icone nom="moins" taille={16} /></button><span>{Math.round(zoom * 100)} %</span><button className="btn fantome ec-bouton-icone" disabled={zoom >= 3} aria-label="Zoomer le terrain" onClick={() => changerZoom(zoom + .5)}><Icone nom="ajouter" taille={16} /></button></div>
        </div>
        <div className="ec-navigation"><button className="btn fantome" aria-pressed={navigationLibre} onClick={() => selectionner(null, true)}><Icone nom="plein-ecran" taille={15} />Naviguer</button><span>{navigationLibre ? temps !== null ? 'Navigation pendant l’animation' : bloque ? 'Navigation du terrain' : 'Aucun joueur sélectionné' : actionIndex !== null ? `Modifier l’action ${actionIndex + 1}` : `N° ${joueur} sélectionné`}</span><button className="btn fantome ec-recentrer" onClick={() => choisirVue(vue)}><Icone nom="cible" taille={15} />Recentrer</button></div>
        <div className="ec-moment-touche" role="group" aria-label="Moment du placement"><button className="btn fantome" aria-pressed={!apresConquete} onClick={() => { setApresConquete(false); setTemps(null); setLecture(false); }}>{c.phase === 'touche' ? 'Au lancer' : c.phase === 'melee' ? 'À la mêlée' : 'Au ruck'}</button><button className="btn fantome" aria-pressed={apresConquete} onClick={() => { setApresConquete(true); setTemps(null); setLecture(false); }}>{c.phase === 'touche' ? 'Après réception' : 'Après sortie'}</button></div>
        {verrouilles.length > 0 && <p className="ec-joueurs-lies">{c.phase === 'melee' ? 'Pack lié' : 'Joueurs liés au ruck'} : {verrouilles.map(n => `n° ${n}`).join(', ')}. Choisis « Après sortie » pour préparer leurs déplacements.</p>}
        <div className="ec-cadre-terrain">
          <svg ref={terrainRef} className={`ec-terrain ${navigationLibre ? 'ec-navigation-libre' : 'ec-placement-actif'} ${temps !== null ? 'ec-relecture' : ''}`} viewBox={`${coin.x - 3} ${coin.y - 5} ${largeur + 6} ${hauteur + 8}`} aria-label="Terrain 2D de création de combinaisons" tabIndex={0} aria-describedby={`${marqueur}-aide`} onPointerDown={toucherTerrain}
            onPointerMove={bougerTerrain} onPointerUp={e => finirTerrain(e)} onPointerCancel={e => finirTerrain(e, true)} onLostPointerCapture={e => finirTerrain(e, true)} onKeyDown={e => {
              if (e.key === 'Escape' && !navigationLibre) { e.stopPropagation(); selectionner(null, true); }
              const directions: Record<string, PointCombinaison> = { ArrowLeft: { x: -8, y: 0 }, ArrowRight: { x: 8, y: 0 }, ArrowUp: { x: 0, y: -6 }, ArrowDown: { x: 0, y: 6 } };
              const d = directions[e.key];
              if (d) { e.preventDefault(); appliquerVue({ ...vueCourante.current, centre: { x: vueCourante.current.centre.x + d.x, y: vueCourante.current.centre.y + d.y } }); }
              if (e.key === '+' || e.key === '=' || e.key === '-') { e.preventDefault(); changerZoom(zoom + (e.key === '-' ? -.5 : .5)); }
            }}>
            <defs><marker id={`${marqueur}-fleche`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
            <rect width="100" height="70" fill="#1c513e" />{Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 10} width="5" height="70" fill="#fff" opacity=".025" />)}
            {c.zone !== 'toutes' && <rect x={c.zone === 'nos22' ? 0 : c.zone === 'leurs22' ? 78 : 22} width={c.zone === 'milieu' ? 56 : 22} height="70" fill="#e2bd71" opacity=".1" />}
            <g stroke="#ffffff" strokeWidth=".22" opacity=".45" fill="none"><rect x=".5" y=".5" width="99" height="69" />{[5, 22, 40, 50, 60, 78, 95].map(x => <path key={x} d={`M${x} 0 V70`} strokeDasharray={[5, 40, 60, 95].includes(x) ? '1 1' : undefined} />)}<path d="M0 5 H100 M0 15 H100 M0 55 H100 M0 65 H100" strokeDasharray="1 1" /></g>
            <g fill="#fff" opacity=".55" fontSize="2" textAnchor="middle"><text x="22" y="3">22</text><text x="50" y="3">50</text><text x="78" y="3">22</text></g>
            {c.phase === 'touche' && <g className="ec-reperes-touche"><rect x={origine.x - 2} y={c.couloir === 'droite' ? 55 : 5} width="4" height="10" fill="#e5bf7225" />
              <circle cx={reception.x} cy={reception.y} r="1.2" fill="none" stroke="#83e4ca" strokeWidth=".2" />
              <text x={origine.x + 3} y={c.couloir === 'droite' ? 65 : 5} fontSize="1.6" fill="#d0e6d5">5 m</text><text x={origine.x + 3} y={c.couloir === 'droite' ? 55 : 15} fontSize="1.6" fill="#d0e6d5">15 m</text>
            </g>}
            {tracesVisibles && traces.map((trace, i) => <g key={i} opacity={temps !== null ? etape === i ? 1 : .3 : actionIndex === null || trace.indexAction === actionIndex || !trace.action ? .95 : .3}>
              <path d={`M${trace.de.x} ${trace.de.y} L${trace.vers.x} ${trace.vers.y}`} fill="none" stroke={!trace.action ? '#83e4ca' : trace.action.type === 'passe' ? '#f1d491' : trace.action.type === 'pied' ? '#b4befa' : '#9cddbf'} strokeWidth=".45" strokeDasharray={!trace.action || trace.action.type === 'passe' || trace.action.type === 'pied' ? '1.4 1.1' : undefined} markerEnd={`url(#${marqueur}-fleche)`} />
              <text x={(trace.de.x + trace.vers.x) / 2 + 1.5} y={(trace.de.y + trace.vers.y) / 2 - 1} fontSize="1.7" fill="#fff">{trace.indexAction === undefined ? trace.acteur === 2 ? 'L' : 'F' : trace.indexAction + 1}</text>
            </g>)}
            {[...simulation.pions].sort((a, b) => a.y - b.y || a.numero - b.numero).map(pion => {
              const n = pion.numero; const p = positions[n];
              const lie = verrouilles.includes(n);
              return <g key={n} data-numero={n} role="button" aria-disabled={lie || bloque || temps !== null} aria-pressed={joueur === n && !navigationLibre && !lie} tabIndex={lie || bloque || temps !== null ? -1 : 0} aria-label={lie ? `Numéro ${n} lié ${c.phase === 'melee' ? 'à la mêlée' : 'au ruck'}` : `Sélectionner le numéro ${n}${joueurs[n] ? `, ${joueurs[n]}` : ''}`} onKeyDown={e => {
              if (lie || bloque || temps !== null) return;
              if (e.key === 'Escape') { if (!navigationLibre) { e.stopPropagation(); selectionner(null, true); } return; }
              e.stopPropagation();
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectionner(joueur === n && actionIndex === null ? null : n); if (action?.type === 'passe') modifierAction({ type: 'passe', destinataire: n }); }
              const directions: Record<string, PointCombinaison> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
              const direction = directions[e.key]; if (direction) { e.preventDefault(); selectionner(n, true); placerSurTerrain(n, { x: p.x + direction.x, y: p.y + direction.y }); }
            }}><title>{joueurs[n] ?? `N° ${n}`}{c.phase === 'touche' && n === 2 ? ' · Lanceur' : c.phase === 'touche' && n === v.sauteur ? lancerLong ? ' · Receveur' : ' · Sauteur' : ''}</title>
              <ellipse className="ec-selection-joueur" cx={p.x} cy={p.y + .15} rx={hauteurJoueur * .23} ry={hauteurJoueur * .1} fill={n === joueur && !navigationLibre ? '#e6c17e50' : '#091b1760'} stroke={n === joueur && !navigationLibre ? '#f1d491' : 'none'} strokeWidth=".18" />
              <SpriteRugbymanMemo pion={pion} position={p} terrain={simulation} maillot={tenue} porteur={image.porteur === n} positionPorteur={image.porteur === null ? undefined : positions[image.porteur]} hauteurMetres={hauteurJoueur} temps={temps ?? 0} compact={tailleTerrain.largeur < 700} />
              <g className="ec-badge-joueur" transform={`translate(${p.x + hauteurJoueur * .26} ${p.y - hauteurJoueur * .18}) scale(${hauteurJoueur / 3.8})`}><rect x="-.7" y="-.7" width="1.4" height="1.4" rx=".35" fill={n === joueur && !navigationLibre ? '#e6c17e' : '#132d25'} stroke={lifteurs.some(l => l.numero === n) && c.phase === 'touche' ? '#83e4ca' : '#bdcabd'} strokeWidth=".12" /><text textAnchor="middle" dominantBaseline="central" fontSize=".95" fontWeight="700" fill={n === joueur && !navigationLibre ? '#193c2c' : '#fff'}>{n}</text></g>
              <rect className="ec-cible-joueur" x={p.x - hauteurJoueur * .35} y={p.y - hauteurJoueur * .78} width={hauteurJoueur * .9} height={hauteurJoueur} rx=".5" fill="transparent" />
            </g>; })}
            {image.porteur === null && <g className="ec-ballon-vol" pointerEvents="none"><ellipse cx={ballon.x} cy={ballon.y} rx=".65" ry=".3" fill="#08161050" /><ellipse cx={ballon.x} cy={ballon.y - image.hauteurBallon * .8 - .6} rx=".65" ry=".4" fill="#faf3dc" stroke="#a78b51" strokeWidth=".15" /></g>}
          </svg>
        </div>
        {(zoom > 1 || vue !== 'terrain') && <div className="ec-deplacement" role="group" aria-label="Déplacer la vue"><span>Déplacer la vue</span>{([['Gauche', -8, 0, 'gauche'], ['Droite', 8, 0, 'droite'], ['Haut', 0, -6, 'haut'], ['Bas', 0, 6, 'bas']] as const).map(([nom, x, y, direction]) => <button key={nom} className="btn fantome ec-bouton-icone" aria-label={`Vue vers ${nom.toLowerCase()}`} onClick={() => appliquerVue({ ...vueCourante.current, centre: { x: vueCourante.current.centre.x + x, y: vueCourante.current.centre.y + y } })}><Icone nom="fleche-droite" taille={15} className={`ec-fleche-${direction}`} /></button>)}</div>}
        <div className="ec-lecture">
          <div className="ec-commandes-lecture"><button className="btn primaire ec-visualiser" disabled={!traces.length || bloque} onClick={() => { if (lecture) setLecture(false); else { if (temps === null || temps >= traces.length) setTemps(0); setLecture(true); } }}><Icone nom={lecture ? 'pause' : 'lecture'} taille={17} />{lecture ? 'Pause' : temps !== null && temps > 0 && temps < traces.length ? 'Reprendre' : 'Visualiser'}</button>
            <div className="ec-transport" role="group" aria-label="Parcourir l’animation">
              <button className="btn fantome ec-bouton-icone" disabled={!traces.length || bloque} aria-label="Rejouer la combinaison" title="Rejouer" onClick={() => { montrerEtape(0); setLecture(true); }}><Icone nom="repost" taille={16} /></button>
              <button className="btn fantome ec-bouton-icone" disabled={temps === null || temps <= 0} aria-label="Étape précédente" title="Étape précédente" onClick={() => montrerEtape(Math.max(0, Math.ceil(temps ?? 0) - 1))}><Icone nom="fleche-droite" taille={16} className="ec-fleche-gauche" /></button>
              <button className="btn fantome ec-bouton-icone" disabled={!traces.length || temps !== null && temps >= traces.length} aria-label="Étape suivante" title="Étape suivante" onClick={() => montrerEtape(Math.floor(temps ?? 0) + 1)}><Icone nom="fleche-droite" taille={16} /></button>
            </div>
            <label className="ec-vitesse">Vitesse<select value={vitesse} onChange={e => setVitesse(Number(e.target.value))}><option value=".5">× 0,5</option><option value="1">× 1</option><option value="1.5">× 1,5</option></select></label>
            <button className="btn fantome ec-retour-edition" disabled={temps === null} onClick={() => { setLecture(false); setTemps(null); }}><Icone nom="formation" taille={15} />Revenir à l’édition</button>
          </div>
          <label className="ec-progression"><span>Progression de la combinaison <span>{temps === null ? 'Prêt à jouer' : `${Math.min(Math.floor(temps) + 1, traces.length)} / ${traces.length}`}</span></span><input type="range" min="0" max={traces.length} step=".05" value={temps ?? 0} disabled={!traces.length} onChange={e => montrerEtape(Number(e.target.value))} /></label>
          <div className="ec-infos-lecture"><p className="ec-etape" aria-live="off">{temps === null ? apresConquete ? 'Placement pour ton enchaînement' : 'Positions de base du match' : temps >= traces.length ? 'Fin de la combinaison' : traces[etape]?.libelle}</p><button className="btn fantome ec-traces" aria-pressed={tracesVisibles} onClick={() => setTracesVisibles(t => !t)}><Icone nom="oeil" taille={15} />Tracés</button></div>
        </div>
        <div className="ec-legende"><span className="lancer">Lancer</span><span className="passe">Passe</span><span className="course">Course / appel</span><span className="pied">Jeu au pied</span></div>
        <p id={`${marqueur}-aide`} className="ec-aide">{navigationLibre ? `Glisse un doigt pour déplacer la carte, pince avec deux doigts pour zoomer.${temps !== null ? ' Reviens à l’édition pour sélectionner un joueur.' : bloque ? '' : ' Appuie sur un joueur pour le sélectionner.'}` : destination ? 'Appuie sur le terrain pour choisir la destination. Glisse le fond pour déplacer la carte.' : action?.type === 'passe' ? 'Appuie sur le joueur qui doit recevoir cette passe. Glisse pour déplacer la carte.' : 'Glisse un joueur pour le placer, ou appuie sur le terrain. Glisse le fond pour déplacer la carte ; pince avec deux doigts pour zoomer.'}</p>
      </div>
      <aside className="ec-visualiseur-reglages">
        {c.phase === 'melee' && <fieldset disabled={bloque || temps !== null} className="ec-sortie-melee"><legend>Sortie de mêlée</legend>
          <label>Départ du ballon<select value={v.depart} onChange={e => modifierVariante({ ...v, depart: Number(e.target.value) })}><option value={9}>Sortie du n° 9{joueurs[9] ? ` · ${joueurs[9]}` : ''}</option><option value={8}>Départ du n° 8{joueurs[8] ? ` · ${joueurs[8]}` : ''}</option></select></label>
          <p className="ec-info">{v.depart === 8 ? 'Le n° 8 ramasse à l’arrière de la mêlée. Choisis ensuite sa course ou sa passe dans l’enchaînement.' : 'Le n° 9 sort le ballon et lance l’enchaînement.'}</p>
        </fieldset>}
        {c.phase === 'touche' && <fieldset disabled={bloque} className="ec-touche"><legend>Préparer le lancer</legend><p>Le n° 2 lance depuis la touche.</p>
          <label>{lancerLong ? 'Receveur du lancer' : 'Sauteur'}{numeros(v.sauteur, sauteur => modifierVariante({ ...v, sauteur }), n => n !== 2 && (lancerLong || n <= 8))}</label>
          <label>Joueurs dans l’alignement<select value={touche.alignes} onChange={e => modifierVariante({ ...v, touche: { ...touche, alignes: Number(e.target.value) as 4 | 5 | 7 } })}><option value="4">4 joueurs</option><option value="5">5 joueurs</option><option value="7">7 joueurs</option></select></label>
          <label>Zone du lancer<select value={lancerLong ? 'apres' : touche.distance <= 7 ? 'court' : touche.distance >= 11 ? 'fond' : 'milieu'} onChange={e => modifierVariante({ ...v, sauteur: e.target.value !== 'apres' && v.sauteur > 8 ? 4 : v.sauteur, touche: { ...touche, distance: e.target.value === 'apres' ? 18 : e.target.value === 'court' ? 6 : e.target.value === 'fond' ? 13 : 9 } })}><option value="court">Premier bloc · court</option><option value="milieu">Deuxième bloc · milieu</option><option value="fond">Troisième bloc · fond</option><option value="apres">Après le troisième bloc</option></select></label>
          <label>Distance du lancer (m)<input type="number" min="5" max="25" step=".5" value={touche.distance} onChange={e => {
            const distance = borner(Number(e.target.value) || 5, 5, 25);
            modifierVariante({ ...v, sauteur: distance <= 15 && v.sauteur > 8 ? 4 : v.sauteur, touche: { ...touche, distance } });
          }} /></label>
          <label className="ec-case"><input type="checkbox" checked={touche.feinte} onChange={e => modifierVariante({ ...v, touche: { ...touche, feinte: e.target.checked } })} />Feinte au premier bloc</label>
          <p className="ec-info">{lancerLong ? `Le n° ${v.sauteur} part après le lancer et reçoit à ${touche.distance} m, au-delà de l’alignement, sans lift.` : `Lifteurs : ${lifteurs.map(p => `n° ${p.numero}`).join(' et ')}. Le sauteur reçoit à ${touche.distance} m de la touche.`} Ton enchaînement démarre à la réception.</p>
        </fieldset>}
        <fieldset disabled={bloque || temps !== null} className="ec-placement"><legend>Placer un joueur</legend><label>Joueur à placer<select value={joueur ?? ''} onChange={e => selectionner(e.target.value ? Number(e.target.value) : null, true)}><option value="">Aucun · navigation</option>{Array.from({ length: 15 }, (_, i) => i + 1).map(n => <option key={n} value={n} disabled={verrouilles.includes(n)}>N° {n}{joueurs[n] ? ` · ${joueurs[n]}` : ''}{verrouilles.includes(n) ? ' · Lié' : ''}</option>)}</select></label>
          <label>Profondeur (m)<input type="number" disabled={joueur === null || joueurVerrouille || c.phase === 'touche' && (joueur === 2 || joueur === v.sauteur)} min="-35" max="35" step=".5" value={joueur === null ? '' : Math.round((initiales[joueur].x - origine.x) * 10) / 10} onChange={e => { if (joueur !== null) placerSurTerrain(joueur, { ...initiales[joueur], x: origine.x + Number(e.target.value) }); }} /></label>
          <label>Largeur (m)<input type="number" disabled={joueur === null || joueurVerrouille || c.phase === 'touche' && joueur === 2} min="-65" max="65" step=".5" value={joueur === null ? '' : Math.round((initiales[joueur].y - origine.y) * 10) / 10} onChange={e => { if (joueur !== null) placerSurTerrain(joueur, { ...initiales[joueur], y: origine.y + Number(e.target.value) }); }} /></label>
          <p className="ec-info">{joueur === null ? 'Choisis un joueur pour modifier son placement. « Naviguer » désélectionne les joueurs et les actions.' : c.phase === 'touche' && joueur === 2 ? 'Le lanceur reste sur la touche.' : c.phase === 'touche' && joueur === v.sauteur ? 'Choisis la réception avec la distance du lancer, puis ajoute une course pour déplacer le receveur.' : 'Les positions de départ suivent celles des matchs. Tes déplacements s’appliquent à la sortie de la conquête.'}</p>
          <button className="btn fantome" disabled={!v.placements.length} onClick={() => { modifierVariante({ ...v, placements: [] }); setApresConquete(false); setTemps(null); setLecture(false); }}><Icone nom="formation" taille={15} />Reprendre les positions du match</button>
        </fieldset>
        {agrandi && <div className="ec-etapes"><h3>Voir chaque geste</h3>{traces.map((trace, i) => <button className={`ec-plan ${etape === i ? 'selectionne' : ''}`} key={i} onClick={() => {
          montrerEtape(i + .5);
          if (window.matchMedia('(max-width: 760px)').matches) terrainRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
        }}>{trace.libelle}</button>)}</div>}
      </aside>
    </div>
  </>;
  return agrandi ? <><div className="ec-terrain-ouvert">Le terrain est ouvert en grand.<button className="btn" onClick={fermerTerrain}>Revenir au cahier</button></div><TerrainAgrandi fermer={fermerTerrain}>{contenu}</TerrainAgrandi></> : <div className="ec-visualisation">{contenu}</div>;
}
