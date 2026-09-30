import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from './Icone';
import { useModalDialog } from '../lib/useModalDialog';
import { alignementCombinaison, origineApercu, toucheValide, type ActionCombinaison, type Combinaison, type PointCombinaison, type VarianteCombinaison } from '../lib/ligue/combinaisons';
import { imageApercu, positionsApercu } from '../lib/ligue/apercuCombinaisons';

const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function TerrainAgrandi({ children, fermer }: { children: ReactNode; fermer: () => void }) {
  const { overlayRef, dialogRef } = useModalDialog(fermer);
  return createPortal(<div ref={overlayRef} className="ec-fond-agrandi">
    <div ref={dialogRef} className="ec ec-agrandi" role="dialog" aria-modal="true" aria-label="Terrain agrandi de la combinaison" tabIndex={-1}>{children}</div>
  </div>, document.body);
}

export function TerrainCombinaison({ combinaison: c, variante: v, joueurs, joueur, actionIndex, bloque, selectionner, placer, modifierAction, modifierVariante }: {
  combinaison: Combinaison;
  variante: VarianteCombinaison;
  joueurs: Record<number, string>;
  joueur: number;
  actionIndex: number | null;
  bloque: boolean;
  selectionner: (numero: number, placementLibre?: boolean) => void;
  placer: (numero: number, point: PointCombinaison) => void;
  modifierAction: (action: ActionCombinaison) => void;
  modifierVariante: (variante: VarianteCombinaison) => void;
}) {
  const [agrandi, setAgrandi] = useState(false);
  const [temps, setTemps] = useState<number | null>(null);
  const [lecture, setLecture] = useState(false);
  const [vue, setVue] = useState<'terrain' | 'combinaison' | 'touche'>('terrain');
  const [zoom, setZoom] = useState(1);
  const [decalage, setDecalage] = useState({ x: 0, y: 0 });
  const [apresReception, setApresReception] = useState(false);
  const glisse = useRef<number | null>(null);
  const boutonTerrain = useRef<HTMLButtonElement>(null);
  const marqueur = useId().replace(/:/g, '');
  const origine = origineApercu(c);
  const initiales = positionsApercu(c, v);
  const image = imageApercu(c, v, temps);
  const positions = c.phase === 'touche' && temps === null && apresReception ? initiales : image.positions;
  const ballon = c.phase === 'touche' && temps === null && apresReception ? initiales[v.sauteur] : image.ballon;
  const traces = image.traces;
  const touche = toucheValide(v.touche);
  const formation = alignementCombinaison(v);
  const lifteurs = formation.filter(p => p.numero !== v.sauteur).sort((a, b) => Math.abs(a.distance - touche.distance) - Math.abs(b.distance - touche.distance)).slice(0, 2);
  const action = actionIndex === null ? undefined : v.actions[actionIndex];
  const destination = action?.type === 'course' || action?.type === 'leurre';
  const etape = temps === null ? -1 : Math.min(Math.floor(temps), traces.length - 1);

  useEffect(() => {
    if (!lecture) return;
    const timer = window.setInterval(() => setTemps(t => Math.min((t ?? 0) + .04, traces.length)), 40);
    return () => window.clearInterval(timer);
  }, [lecture, traces.length]);
  useEffect(() => { if (temps !== null && temps >= traces.length) setLecture(false); }, [temps, traces.length]);
  useEffect(() => { setTemps(null); setLecture(false); }, [v, actionIndex, c.phase, c.zone, c.couloir]);

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
  const choisirVue = (valeur: typeof vue) => { setVue(valeur); setZoom(1); setDecalage({ x: 0, y: 0 }); };
  const pointDuClic = (e: PointerEvent<SVGSVGElement>) => {
    const point = e.currentTarget.createSVGPoint(); point.x = e.clientX; point.y = e.clientY;
    const matrice = e.currentTarget.getScreenCTM();
    const p = matrice ? point.matrixTransform(matrice.inverse()) : origine;
    return { x: Math.round(borner(p.x, .7, 99.3) * 10) / 10, y: Math.round(borner(p.y, .7, 69.3) * 10) / 10 };
  };
  const placerSurTerrain = (numero: number, p: PointCombinaison) => {
    if (c.phase === 'touche' && numero === 2) return;
    if (c.phase === 'touche' && numero === v.sauteur) {
      modifierVariante({ ...v, touche: { ...touche, distance: Math.round(borner(c.couloir === 'droite' ? 70 - p.y : p.y, 5, 15) * 10) / 10 } });
      return;
    }
    if (c.phase === 'touche' && numero <= 8) setApresReception(true);
    placer(numero, p);
  };
  const toucherTerrain = (e: PointerEvent<SVGSVGElement>) => {
    if (bloque || temps !== null) return;
    const numero = Number((e.target as Element).closest('[data-numero]')?.getAttribute('data-numero'));
    if (numero) {
      selectionner(numero);
      if (action?.type === 'passe') { modifierAction({ type: 'passe', destinataire: numero }); return; }
      glisse.current = numero; e.currentTarget.setPointerCapture(e.pointerId);
    } else if (destination && action) {
      const p = pointDuClic(e);
      modifierAction({ ...action, destination: { x: borner(p.x - origine.x, -35, 35), y: p.y - origine.y } });
    } else placerSurTerrain(joueur, pointDuClic(e));
  };
  const numeros = (valeur: number, changer: (n: number) => void, filtre = (_n: number) => true) => <select value={valeur} onChange={e => changer(Number(e.target.value))}>{Array.from({ length: 15 }, (_, i) => i + 1).filter(filtre).map(n => <option key={n} value={n}>N° {n}{joueurs[n] ? ` · ${joueurs[n]}` : ''}</option>)}</select>;
  const montrerEtape = (t: number) => { setLecture(false); setTemps(borner(t, 0, traces.length)); };
  const fermerTerrain = () => { setAgrandi(false); window.requestAnimationFrame(() => boutonTerrain.current?.focus()); };

  const contenu = <>
    <div className="ec-terrain-entete"><div><b>{agrandi ? c.nom : 'Terrain de création'}</b><span>{v.nom} · Attaque vers la droite</span></div>
      <button ref={boutonTerrain} className="btn" onClick={() => { if (agrandi) fermerTerrain(); else { if (vue === 'terrain') choisirVue(c.phase === 'touche' ? 'touche' : 'combinaison'); setAgrandi(true); } }}><Icone nom={agrandi ? 'croix' : 'plein-ecran'} taille={16} />{agrandi ? 'Fermer le terrain agrandi' : 'Agrandir le terrain'}</button>
    </div>
    <div className="ec-visualiseur">
      <div className="ec-visualiseur-principal">
        <div className="ec-vues" role="group" aria-label="Vue du terrain">
          <button className={`btn ${vue === 'terrain' ? 'primaire' : 'fantome'}`} aria-pressed={vue === 'terrain'} onClick={() => choisirVue('terrain')}>Terrain entier</button>
          <button className={`btn ${vue === 'combinaison' ? 'primaire' : 'fantome'}`} aria-pressed={vue === 'combinaison'} onClick={() => choisirVue('combinaison')}>La combinaison</button>
          {c.phase === 'touche' && <button className={`btn ${vue === 'touche' ? 'primaire' : 'fantome'}`} aria-pressed={vue === 'touche'} onClick={() => choisirVue('touche')}>Le lancer</button>}
          <div className="ec-zoom"><button className="btn fantome" disabled={zoom <= 1} aria-label="Dézoomer le terrain" onClick={() => setZoom(z => Math.max(1, z - .5))}>−</button><span>{Math.round(zoom * 100)} %</span><button className="btn fantome" disabled={zoom >= 3} aria-label="Zoomer le terrain" onClick={() => setZoom(z => Math.min(3, z + .5))}>+</button></div>
        </div>
        {c.phase === 'touche' && <div className="ec-moment-touche" role="group" aria-label="Placement de la touche"><button className="btn fantome" aria-pressed={!apresReception} onClick={() => { setApresReception(false); setTemps(null); setLecture(false); }}>Au lancer</button><button className="btn fantome" aria-pressed={apresReception} onClick={() => { setApresReception(true); setTemps(null); setLecture(false); }}>Après réception</button></div>}
        <div className="ec-cadre-terrain">
          <svg className="ec-terrain" viewBox={`${coin.x} ${coin.y} ${largeur} ${hauteur}`} aria-label="Terrain 2D de création de combinaisons" onPointerDown={toucherTerrain}
            onPointerMove={e => { if (glisse.current && !bloque) placerSurTerrain(glisse.current, pointDuClic(e)); }}
            onPointerUp={e => { glisse.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { glisse.current = null; }}>
            <defs><marker id={`${marqueur}-fleche`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
            <rect width="100" height="70" fill="#1c513e" />{Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 10} width="5" height="70" fill="#fff" opacity=".025" />)}
            {c.zone !== 'toutes' && <rect x={c.zone === 'nos22' ? 0 : c.zone === 'leurs22' ? 78 : 22} width={c.zone === 'milieu' ? 56 : 22} height="70" fill="#e2bd71" opacity=".1" />}
            <g stroke="#ffffff" strokeWidth=".22" opacity=".45" fill="none"><rect x=".5" y=".5" width="99" height="69" />{[5, 22, 40, 50, 60, 78, 95].map(x => <path key={x} d={`M${x} 0 V70`} strokeDasharray={[5, 40, 60, 95].includes(x) ? '1 1' : undefined} />)}<path d="M0 5 H100 M0 15 H100 M0 55 H100 M0 65 H100" strokeDasharray="1 1" /></g>
            <g fill="#fff" opacity=".55" fontSize="2" textAnchor="middle"><text x="22" y="3">22</text><text x="50" y="3">50</text><text x="78" y="3">22</text></g>
            {c.phase === 'touche' && <g className="ec-reperes-touche"><rect x={origine.x - 2} y={c.couloir === 'droite' ? 55 : 5} width="4" height="10" fill="#e5bf7225" />
              <circle cx={positions[v.sauteur].x} cy={positions[v.sauteur].y} r="1.2" fill="none" stroke="#83e4ca" strokeWidth=".2" />
              <text x={origine.x + 3} y={c.couloir === 'droite' ? 65 : 5} fontSize="1.6" fill="#d0e6d5">5 m</text><text x={origine.x + 3} y={c.couloir === 'droite' ? 55 : 15} fontSize="1.6" fill="#d0e6d5">15 m</text>
            </g>}
            {traces.map((trace, i) => <g key={i} opacity={temps !== null ? etape === i ? 1 : .3 : actionIndex === null || trace.indexAction === actionIndex || !trace.action ? .95 : .3}>
              <path d={`M${trace.de.x} ${trace.de.y} L${trace.vers.x} ${trace.vers.y}`} fill="none" stroke={!trace.action ? '#83e4ca' : trace.action.type === 'passe' ? '#f1d491' : trace.action.type === 'pied' ? '#b4befa' : '#9cddbf'} strokeWidth=".45" strokeDasharray={!trace.action || trace.action.type === 'passe' || trace.action.type === 'pied' ? '1.4 1.1' : undefined} markerEnd={`url(#${marqueur}-fleche)`} />
              <text x={(trace.de.x + trace.vers.x) / 2 + 1.5} y={(trace.de.y + trace.vers.y) / 2 - 1} fontSize="1.7" fill="#fff">{trace.indexAction === undefined ? trace.acteur === 2 ? 'L' : 'F' : trace.indexAction + 1}</text>
            </g>)}
            {Object.entries(positions).map(([n, p]) => {
              const compact = c.phase === 'touche' && formation.some(f => f.numero === Number(n)) && (temps === null ? !apresReception : !traces[etape]?.action);
              return <g key={n} data-numero={n} transform={`translate(${p.x} ${p.y})`} role="button" tabIndex={bloque || temps !== null ? -1 : 0} aria-label={`Sélectionner le numéro ${n}${joueurs[Number(n)] ? `, ${joueurs[Number(n)]}` : ''}`} onKeyDown={e => {
              if (bloque || temps !== null) return;
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectionner(Number(n)); }
              const directions: Record<string, PointCombinaison> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
              const direction = directions[e.key]; if (direction) { e.preventDefault(); placerSurTerrain(Number(n), { x: p.x + direction.x, y: p.y + direction.y }); }
            }}><title>{joueurs[Number(n)] ?? `N° ${n}`}{c.phase === 'touche' && Number(n) === 2 ? ' · Lanceur' : c.phase === 'touche' && Number(n) === v.sauteur ? ' · Sauteur' : ''}</title>
              <circle r={compact ? .68 : 1.6} fill={Number(n) === joueur ? '#e6c17e' : '#132d25'} stroke={Number(n) === joueur ? '#fff0bc' : lifteurs.some(p => p.numero === Number(n)) && c.phase === 'touche' ? '#83e4ca' : '#bdcabd'} strokeWidth={compact ? .15 : .3} /><text textAnchor="middle" dominantBaseline="central" fontSize={compact ? 1.05 : 1.65} fontWeight="700" fill={Number(n) === joueur ? '#193c2c' : '#fff'}>{n}</text>
            </g>; })}
            <ellipse cx={ballon.x + 1.7} cy={ballon.y} rx="1" ry=".6" fill="#faf3dc" stroke="#a78b51" strokeWidth=".2" transform={`rotate(-30 ${ballon.x + 1.7} ${ballon.y})`} />
          </svg>
        </div>
        {(zoom > 1 || vue !== 'terrain') && <div className="ec-deplacement" role="group" aria-label="Déplacer la vue"><span>Déplacer la vue</span>{([['Gauche', -8, 0, '←'], ['Droite', 8, 0, '→'], ['Haut', 0, -6, '↑'], ['Bas', 0, 6, '↓']] as const).map(([nom, x, y, fleche]) => <button key={nom} className="btn fantome" aria-label={`Vue vers ${nom.toLowerCase()}`} onClick={() => setDecalage(d => ({ x: borner(centre.x + d.x + x, largeur / 2, 100 - largeur / 2) - centre.x, y: borner(centre.y + d.y + y, hauteur / 2, 70 - hauteur / 2) - centre.y }))}>{fleche}</button>)}</div>}
        <div className="ec-lecture">
          <div className="ec-commandes-lecture"><button className="btn primaire" disabled={!traces.length || bloque} onClick={() => { if (lecture) setLecture(false); else { if (temps === null || temps >= traces.length) setTemps(0); setLecture(true); } }}><Icone nom="video" taille={15} />{lecture ? 'Pause' : temps !== null && temps > 0 && temps < traces.length ? 'Reprendre' : 'Visualiser'}</button>
            <button className="btn fantome" disabled={!traces.length} onClick={() => { montrerEtape(0); setLecture(true); }}>Rejouer</button>
            <button className="btn fantome" disabled={temps === null || temps <= 0} aria-label="Étape précédente" onClick={() => montrerEtape(Math.max(0, Math.ceil(temps ?? 0) - 1))}>←</button>
            <button className="btn fantome" disabled={!traces.length || temps !== null && temps >= traces.length} aria-label="Étape suivante" onClick={() => montrerEtape(Math.floor(temps ?? 0) + 1)}>→</button>
            <button className="btn fantome" disabled={temps === null} onClick={() => { setLecture(false); setTemps(null); }}>Revenir à l’édition</button>
          </div>
          <label className="ec-progression">Progression du tracé<input type="range" min="0" max={traces.length} step=".05" value={temps ?? 0} disabled={!traces.length} onChange={e => montrerEtape(Number(e.target.value))} /></label>
          <p className="ec-etape" aria-live="off">{temps === null ? 'Placement de départ' : temps >= traces.length ? 'Fin de la combinaison' : traces[etape]?.libelle}</p>
        </div>
        <div className="ec-legende"><span className="lancer">Lancer</span><span className="passe">Passe</span><span className="course">Course / appel</span><span className="pied">Jeu au pied</span></div>
        <p className="ec-aide">{temps !== null ? 'Mets en pause ou avance étape par étape. Reviens à l’édition pour déplacer les joueurs.' : destination ? 'Clique sur le terrain pour choisir la destination de cette action.' : action?.type === 'passe' ? 'Clique sur le joueur qui doit recevoir cette passe.' : 'Glisse un joueur, ou sélectionne son numéro puis clique sur le terrain. Tu peux aussi utiliser les flèches du clavier.'}</p>
      </div>
      <aside className="ec-visualiseur-reglages">
        {c.phase === 'touche' && <fieldset disabled={bloque} className="ec-touche"><legend>Préparer le lancer</legend><p>Le n° 2 lance depuis la touche.</p>
          <label>Sauteur{numeros(v.sauteur, sauteur => modifierVariante({ ...v, sauteur }), n => n <= 8 && n !== 2)}</label>
          <label>Joueurs dans l’alignement<select value={touche.alignes} onChange={e => modifierVariante({ ...v, touche: { ...touche, alignes: Number(e.target.value) as 4 | 5 | 7 } })}><option value="4">4 joueurs</option><option value="5">5 joueurs</option><option value="7">7 joueurs</option></select></label>
          <label>Zone du lancer<select value={touche.distance <= 7 ? 'court' : touche.distance >= 11 ? 'fond' : 'milieu'} onChange={e => modifierVariante({ ...v, touche: { ...touche, distance: e.target.value === 'court' ? 6 : e.target.value === 'fond' ? 13 : 9 } })}><option value="court">Premier bloc · court</option><option value="milieu">Bloc du milieu</option><option value="fond">Fond de l’alignement · long</option></select></label>
          <label>Distance du lancer (m)<input type="number" min="5" max="15" step=".5" value={touche.distance} onChange={e => modifierVariante({ ...v, touche: { ...touche, distance: borner(Number(e.target.value) || 5, 5, 15) } })} /></label>
          <label className="ec-case"><input type="checkbox" checked={touche.feinte} onChange={e => modifierVariante({ ...v, touche: { ...touche, feinte: e.target.checked } })} />Feinte au premier bloc</label>
          <p className="ec-info">Lifteurs : {lifteurs.map(p => `n° ${p.numero}`).join(' et ')}. Le sauteur reçoit à {touche.distance} m de la touche, puis lance ton enchaînement.</p>
        </fieldset>}
        <fieldset disabled={bloque || temps !== null} className="ec-placement"><legend>Placer un joueur</legend><label>Joueur à placer{numeros(joueur, n => selectionner(n, true))}</label>
          <label>Profondeur (m)<input type="number" disabled={c.phase === 'touche' && (joueur === 2 || joueur === v.sauteur)} min="-35" max="35" step=".5" value={Math.round((initiales[joueur].x - origine.x) * 10) / 10} onChange={e => placerSurTerrain(joueur, { ...initiales[joueur], x: origine.x + Number(e.target.value) })} /></label>
          <label>Largeur (m)<input type="number" disabled={c.phase === 'touche' && joueur === 2} min="-65" max="65" step=".5" value={Math.round((initiales[joueur].y - origine.y) * 10) / 10} onChange={e => placerSurTerrain(joueur, { ...initiales[joueur], y: origine.y + Number(e.target.value) })} /></label>
          {c.phase === 'touche' && joueur <= 8 && <p className="ec-info">Pendant le lancer, les avants gardent leur alignement. {joueur === 2 ? 'Le lanceur reste sur la touche.' : joueur === v.sauteur ? 'Choisis la réception avec la distance du lancer ; une course déplace ensuite le sauteur.' : 'Ce placement s’applique après la réception.'}</p>}
        </fieldset>
        {agrandi && <div className="ec-etapes"><h3>Voir chaque geste</h3>{traces.map((trace, i) => <button className={`ec-plan ${etape === i ? 'selectionne' : ''}`} key={i} onClick={() => montrerEtape(i + .5)}>{trace.libelle}</button>)}</div>}
      </aside>
    </div>
  </>;
  return agrandi ? <><div className="ec-terrain-ouvert">Le terrain est ouvert en grand.<button className="btn" onClick={fermerTerrain}>Revenir au cahier</button></div><TerrainAgrandi fermer={fermerTerrain}>{contenu}</TerrainAgrandi></> : <div className="ec-visualisation">{contenu}</div>;
}
