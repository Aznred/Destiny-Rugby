import { texteTraduit, t } from '../lib/i18n';
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from './Icone';
import { useModalDialog } from '../lib/useModalDialog';
import { alignementCombinaison, erreursVariante, etapesCombinaison, lancerApresBloc, origineApercu, receptionTouche, toucheValide, type ActionCombinaison, type Combinaison, type PointCombinaison, type VarianteCombinaison } from '../lib/ligue/combinaisons';
import { dureeApercu, imageApercu, imageDebutEtape, positionsApercu } from '../lib/ligue/apercuCombinaisons';
import { imageOppositionCombinaison, simulerOppositionCombinaison } from '../lib/ligue/oppositionCombinaisons';
import type { Coequipier } from '../lib/effectif';
import type { SystemeDefensif } from '../lib/moteur/etat';
import { terrainSimulationCombinaison } from '../lib/ligue/simulationCombinaisons';
import { maillotDeSecours, type MaillotMatch } from '../lib/moteur/apparenceMatch';
import { SpriteRugbymanMemo } from './match/SpriteRugbyman';
import { bornerVueCombinaison, commencerNavigation, poursuivreNavigation, type GesteNavigation, type VueCombinaison } from '../lib/ligue/navigationCombinaisons';
import { joueursEngagesCombinaison } from '../lib/ligue/placementsCombinaisons';

const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function TerrainAgrandi({ children, fermer }: { children: ReactNode; fermer: () => void }) {
  const { overlayRef, dialogRef } = useModalDialog(fermer);
  return createPortal(<div ref={overlayRef} className="ec-fond-agrandi">
    <div ref={dialogRef} className="ec ec-agrandi" role="dialog" aria-modal="true" aria-label={t("ui.4ffd3f8f24ce")} tabIndex={-1}>{children}</div>
  </div>, document.body);
}

export function TerrainCombinaison({ combinaison: c, variante: v, joueurs, effectif, maillot, joueur, actionIndex, etapeIndex, choisirEtape, bloque, selectionner, placer, modifierAction, modifierVariante }: {
  combinaison: Combinaison;
  variante: VarianteCombinaison;
  joueurs: Record<number, string>;
  effectif?: Coequipier[];
  maillot?: MaillotMatch;
  joueur: number | null;
  actionIndex: number | null;
  etapeIndex: number | null;
  choisirEtape: (index: number | null) => void;
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
  const [modeSimulation, setModeSimulation] = useState<'trace' | 'opposition'>('trace');
  const [defense, setDefense] = useState<SystemeDefensif>('glissee');
  const [numeroEssai, setNumeroEssai] = useState(0);
  const avecOpposition = modeSimulation === 'opposition';
  const essai = useMemo(() => avecOpposition ? simulerOppositionCombinaison(c, v, joueurs, defense, numeroEssai, effectif) : undefined, [avecOpposition, c, v, joueurs, defense, numeroEssai, effectif]);
  const opposition = essai ? imageOppositionCombinaison(essai, temps ?? 0) : undefined;
  const contacts = useRef(new Map<number, PointCombinaison>());
  const geste = useRef<{ numero: number | null; placement: boolean; decalageJoueur: PointCombinaison; debut: PointCombinaison; glisse: boolean; multiple: boolean; navigation: GesteNavigation } | null>(null);
  const [fantome, setFantome] = useState<{ numero: number; point: PointCombinaison } | null>(null);
  const vueCourante = useRef<VueCombinaison>({ zoom: 1, centre: { x: 50, y: 35 } });
  const boutonTerrain = useRef<HTMLButtonElement>(null);
  const terrainRef = useRef<SVGSVGElement>(null);
  const [tailleTerrain, setTailleTerrain] = useState({ largeur: 700, hauteur: 490 });
  const marqueur = useId().replace(/:/g, '');
  const origine = origineApercu(c);
  const destinationDepuis = (p: PointCombinaison) => ({ x: Math.round(borner(p.x - origine.x, -35, 35) * 10) / 10, y: Math.round(borner(p.y - origine.y, -65, 65) * 10) / 10 });
  const initiales = positionsApercu(c, v, !apresConquete);
  const etapes = etapesCombinaison(v.actions);
  const preparation = useMemo(() => etapeIndex === null ? undefined : imageDebutEtape(c, v, etapeIndex), [c, v, etapeIndex]);
  const image = useMemo(() => {
    const resultat = imageApercu(c, v, temps);
    const positions = positionsApercu(c, v);
    const porteur = c.phase === 'touche' ? v.sauteur : v.depart;
    const depart = temps === null && preparation ? preparation : temps === null && apresConquete
      ? { ...resultat, positions, ballon: positions[porteur], porteur } : resultat;
    return fantome && temps === null ? { ...depart, positions: { ...depart.positions, [fantome.numero]: fantome.point }, ballon: depart.porteur === fantome.numero ? fantome.point : depart.ballon } : depart;
  }, [c, v, temps, apresConquete, fantome, preparation]);
  const positions = image.positions;
  const apercu = useMemo(() => terrainSimulationCombinaison(c, v, image, temps, joueurs, apresConquete || !!preparation), [c, v, image, temps, joueurs, apresConquete, preparation]);
  const simulation = opposition?.terrain ?? apercu;
  const ballon = simulation.ballon;
  const tenue = useMemo(() => maillot ?? maillotDeSecours('#b9473d', 'atelier'), [maillot]);
  const tenueAdverse = useMemo(() => maillotDeSecours('#3889cb', 'opposition'), []);
  const traces = image.traces;
  const duree = avecOpposition ? essai?.duree ?? 0 : dureeApercu(traces);
  const valide = !erreursVariante(c.phase, v).length;
  const touche = toucheValide(v.touche);
  const lancerLong = lancerApresBloc(v);
  const reception = receptionTouche(origine, v);
  const formation = alignementCombinaison(v);
  const lifteurs = lancerLong ? [] : formation.filter(p => p.numero !== v.sauteur).sort((a, b) => Math.abs(a.distance - touche.distance) - Math.abs(b.distance - touche.distance)).slice(0, 2);
  const action = actionIndex === null ? undefined : v.actions[actionIndex];
  const destination = action?.type === 'course' || action?.type === 'leurre';
  const etape = temps === null ? -1 : Math.min(Math.floor(temps), dureeApercu(traces) - 1);
  const engages = useMemo(() => joueursEngagesCombinaison(c, v), [c, v]);
  const verrouilles = temps === null && !apresConquete && !preparation ? engages : [];
  const joueurVerrouille = joueur !== null && verrouilles.includes(joueur);
  const navigationLibre = actionIndex === null && (joueur === null || !!preparation) || temps !== null || bloque || avecOpposition;

  useEffect(() => {
    if (!lecture) return;
    let precedent = performance.now();
    const timer = window.setInterval(() => {
      const maintenant = performance.now(); const delta = Math.min((maintenant - precedent) / 1000, .12) * vitesse;
      precedent = maintenant; setTemps(t => Math.min((t ?? 0) + delta, duree));
    }, 40);
    return () => window.clearInterval(timer);
  }, [lecture, duree, vitesse]);
  useEffect(() => { if (temps !== null && temps >= duree) setLecture(false); }, [temps, duree]);
  useEffect(() => { setTemps(null); setLecture(false); setModeSimulation('trace'); }, [v, actionIndex, etapeIndex, c.phase, c.zone, c.couloir]);
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
    if (preparation) return;
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
    geste.current = { numero, placement: !navigationLibre && numero !== null && !verrouilles.includes(numero) && (!preparation || destination) && action?.type !== 'passe' && (action?.type !== 'course' || numero === traces.find(t => t.indexAction === actionIndex)?.acteur), decalageJoueur, debut: point, glisse: false, multiple: false, navigation };
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
    if (annule || g.multiple || bloque || temps !== null || avecOpposition) return;
    if (g.glisse) {
      // Le placement n'est enregistré qu'au relâchement : un second doigt
      // peut donc reprendre la navigation sans modifier le cahier.
      if (g.placement && g.numero !== null) {
        const p = pointDuClic(e);
        const cible = { x: borner(p.x + g.decalageJoueur.x, .7, 99.3), y: borner(p.y + g.decalageJoueur.y, .7, 69.3) };
        selectionner(g.numero);
        if (destination && action) modifierAction({ ...action, ...(action.type === 'leurre' ? { numero: g.numero } : {}), destination: destinationDepuis(cible) });
        else placerSurTerrain(g.numero, cible);
      }
      return;
    }
    if (g.numero !== null) {
      if (verrouilles.includes(g.numero)) return;
      selectionner(joueur === g.numero && actionIndex === null ? null : g.numero);
      if (action?.type === 'passe') modifierAction({ ...action, destinataire: g.numero });
      if (action?.type === 'leurre') modifierAction({ ...action, numero: g.numero });
    } else if (!navigationLibre) {
      const p = pointDuClic(e);
      if (destination && action) modifierAction({ ...action, destination: destinationDepuis(p) });
      else if (joueur !== null) placerSurTerrain(joueur, p);
    }
  };
  const numeros = (valeur: number, changer: (n: number) => void, filtre = (_n: number) => true) => <select value={valeur} onChange={e => changer(Number(e.target.value))}>{Array.from({ length: 15 }, (_, i) => i + 1).filter(filtre).map(n => <option key={n} value={n}>N° {n}{joueurs[n] ? ` · ${joueurs[n]}` : ''}</option>)}</select>;
  const montrerEtape = (t: number) => { setLecture(false); setTemps(borner(t, 0, duree)); };
  const choisirSimulation = (mode: typeof modeSimulation) => { setModeSimulation(mode); setLecture(false); setTemps(mode === 'opposition' ? 0 : null); };
  const preparerEtape = (index: number | null) => { choisirEtape(index); setTemps(null); setLecture(false); setModeSimulation('trace'); };
  const fermerTerrain = () => { setAgrandi(false); window.requestAnimationFrame(() => boutonTerrain.current?.focus()); };

  const contenu = <>
    <div className="ec-terrain-entete"><div><b>{agrandi ? c.nom : t("ui.0108f00ce0ed")}</b><span>{t("ui.23dfa117f427", { v0: v.nom })}</span></div>
      <button ref={boutonTerrain} className="btn" onClick={() => { if (agrandi) fermerTerrain(); else { if (vue === 'terrain' && zoom === 1) choisirVue(c.phase === 'touche' ? 'touche' : 'combinaison'); setAgrandi(true); } }}><Icone nom={agrandi ? 'croix' : 'plein-ecran'} taille={16} />{agrandi ? t("ui.8d8914932dda") : t("ui.63075bb761d6")}</button>
    </div>
    <div className="ec-visualiseur">
      <div className="ec-visualiseur-principal">
        <div className="ec-choix-simulation">
          <div className="ec-segments" role="group" aria-label={t("ui.c1917c49a0d3")}><button className="btn fantome" aria-pressed={!avecOpposition} onClick={() => choisirSimulation('trace')}>{t("ui.66acd33da691")}</button><button className="btn fantome" aria-pressed={avecOpposition} disabled={!valide || bloque} onClick={() => choisirSimulation('opposition')}>{t("ui.f4faf74d0662")}</button></div>
          {avecOpposition && <><label>{t("online.tactics.defense")}<select value={defense} onChange={e => { setDefense(e.target.value as SystemeDefensif); setTemps(0); setLecture(false); }}><option value="glissee">{t("ui.251224409043")}</option><option value="blitz">{t("ui.ca6744f733d5")}</option><option value="repli">{t("ui.eb10d4e63d04")}</option></select></label><button className="btn fantome" onClick={() => { setNumeroEssai(n => n + 1); setTemps(0); setLecture(false); }}>{t("ui.67c22889ec8a")}</button></>}
        </div>
        {avecOpposition && <p className="ec-info">{t("ui.4ada688364c7")}</p>}
        <div className="ec-vues">
          <div className="ec-segments" role="group" aria-label={t("ui.e4fb2be1e8c9")}>
            <button className="btn fantome" aria-pressed={vue === 'terrain'} onClick={() => choisirVue('terrain')}>{t("ui.63986f6ac919")}</button>
            <button className="btn fantome" aria-pressed={vue === 'combinaison'} onClick={() => choisirVue('combinaison')}>{t("ui.944f94f673b5")}</button>
            {c.phase === 'touche' && <button className="btn fantome" aria-pressed={vue === 'touche'} onClick={() => choisirVue('touche')}>{t("ui.f4c20b8a9d1b")}</button>}
          </div>
          <div className="ec-zoom"><button className="btn fantome ec-bouton-icone" disabled={zoom <= 1} aria-label={t("ui.f229beefb884")} onClick={() => changerZoom(zoom - .5)}><Icone nom="moins" taille={16} /></button><span>{Math.round(zoom * 100)} %</span><button className="btn fantome ec-bouton-icone" disabled={zoom >= 3} aria-label={t("ui.57ac5a408b68")} onClick={() => changerZoom(zoom + .5)}><Icone nom="ajouter" taille={16} /></button></div>
        </div>
        <div className="ec-navigation"><button className="btn fantome" aria-pressed={navigationLibre} onClick={() => { if (temps === null && !avecOpposition) selectionner(null, true); }}><Icone nom="plein-ecran" taille={15} />{t("ui.cb03095bb936")}</button><span>{navigationLibre ? temps !== null ? t("ui.070b3843d0ea") : bloque ? t("ui.249f283d0b72") : t("ui.9237e508f5b4") : actionIndex !== null ? t("ui.908d2ec10aba", { v0: actionIndex + 1 }) : t("ui.c35eae6b9129", { v0: joueur })}</span><button className="btn fantome ec-recentrer" onClick={() => choisirVue(vue)}><Icone nom="cible" taille={15} />{t("ui.2b36f681d502")}</button></div>
        {!avecOpposition && <>
          <div className="ec-preparation" role="group" aria-label={t("ui.c7f2d6b6baa0")}><label>{t("ui.0b598e11fcb9")}<select value={preparation ? etapeIndex! : ''} onChange={e => preparerEtape(e.target.value === '' ? null : Number(e.target.value))}><option value="">{t("ui.80bf20bb42c8")}</option>{etapes.map((_, i) => <option key={i} value={i}>{t("ui.2fb6877b2d56", { v0: i + 1, v1: i ? t("ui.01eb7165d730", { v0: i }) : t("ui.5cb4cf85cfd3") })}</option>)}</select></label><div className="ec-transport"><button className="btn fantome ec-bouton-icone" disabled={!preparation || etapeIndex === 0} aria-label={t("ui.cee0624ded4d")} onClick={() => preparerEtape((etapeIndex ?? 0) - 1)}><Icone nom="fleche-droite" taille={16} className="ec-fleche-gauche" /></button><button className="btn fantome ec-bouton-icone" disabled={!etapes.length || etapeIndex !== null && etapeIndex >= etapes.length - 1} aria-label={t("ui.8875b89189d0")} onClick={() => preparerEtape(etapeIndex === null ? 0 : etapeIndex + 1)}><Icone nom="fleche-droite" taille={16} /></button></div>{preparation && <button className="btn fantome" onClick={() => preparerEtape(null)}>{t("ui.80bf20bb42c8")}</button>}</div>
          <div className="ec-moment-touche" role="group" aria-label={t("ui.219b2f7ea053")}><button className="btn fantome" aria-pressed={!preparation && !apresConquete} onClick={() => { preparerEtape(null); setApresConquete(false); }}>{c.phase === 'touche' ? t("ui.a5ad28ecadcf") : c.phase === 'melee' ? t("ui.6274c3c69ec1") : t("ui.c995c494d4a2")}</button><button className="btn fantome" aria-pressed={!preparation && apresConquete} onClick={() => { preparerEtape(null); setApresConquete(true); }}>{c.phase === 'touche' ? t("ui.f02e5194c259") : t("ui.de1d2cec3a8a")}</button></div>
        </>}
        {!avecOpposition && verrouilles.length > 0 && <p className="ec-joueurs-lies">{t("ui.9e77fccff124", { v0: c.phase === 'melee' ? t("ui.064f7e4b77b9") : t("ui.ab50a92f6887"), v1: verrouilles.map(n => `n° ${n}`).join(', ') })}</p>}
        <div className="ec-cadre-terrain">
          <svg ref={terrainRef} className={`ec-terrain ${navigationLibre ? 'ec-navigation-libre' : 'ec-placement-actif'} ${temps !== null ? 'ec-relecture' : ''}`} viewBox={`${coin.x - 3} ${coin.y - 5} ${largeur + 6} ${hauteur + 8}`} aria-label={t("ui.918422c798fe")} tabIndex={0} aria-describedby={`${marqueur}-aide`} onPointerDown={toucherTerrain}
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
            {tracesVisibles && !avecOpposition && traces.map((trace, i) => <g key={i} opacity={temps !== null ? etape === trace.debut ? 1 : .3 : actionIndex !== null ? trace.indexAction === actionIndex ? .95 : .3 : preparation ? trace.debut === preparation.debut ? .95 : .3 : .95}>
              <path d={`M${trace.de.x} ${trace.de.y} L${trace.vers.x} ${trace.vers.y}`} fill="none" stroke={!trace.action ? '#83e4ca' : trace.action.type === 'passe' ? '#f1d491' : trace.action.type === 'pied' ? '#b4befa' : '#9cddbf'} strokeWidth=".45" strokeDasharray={!trace.action || trace.action.type === 'passe' || trace.action.type === 'pied' ? '1.4 1.1' : undefined} markerEnd={`url(#${marqueur}-fleche)`} />
              <text x={(trace.de.x + trace.vers.x) / 2 + 1.5} y={(trace.de.y + trace.vers.y) / 2 - 1} fontSize="1.7" fill="#fff">{trace.indexAction === undefined ? trace.acteur === 2 ? 'L' : 'F' : trace.debut + 1 - (c.phase === 'touche' ? 1 + (touche.feinte ? 1 : 0) : 0)}</text>
            </g>)}
            {[...simulation.pions].sort((a, b) => a.y - b.y || a.numero - b.numero).map(pion => {
              const n = pion.numero; const p = pion;
              const adverse = pion.cote === 'exterieur';
              const lie = verrouilles.includes(n) && !adverse;
              return <g key={pion.id} data-numero={adverse ? undefined : n} data-cote={pion.cote} role={adverse ? 'img' : 'button'} aria-disabled={adverse ? undefined : lie || bloque || temps !== null || avecOpposition} aria-pressed={adverse ? undefined : joueur === n && !navigationLibre && !lie} tabIndex={lie || bloque || temps !== null || avecOpposition || adverse ? -1 : 0} aria-label={adverse ? t("ui.28a2ffccf92f", { v0: n }) : lie ? t("ui.8dbe5190bb8e", { v0: n, v1: c.phase === 'melee' ? t("ui.92a6578156a3") : t("ui.711a3afd79f4") }) : t("ui.b4f5d5a28a0a", { v0: n, v1: joueurs[n] ? `, ${joueurs[n]}` : '' })} onKeyDown={e => {
              if (lie || bloque || temps !== null || avecOpposition || adverse) return;
              if (e.key === 'Escape') { if (!navigationLibre) { e.stopPropagation(); selectionner(null, true); } return; }
              e.stopPropagation();
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectionner(joueur === n && actionIndex === null ? null : n); if (action?.type === 'passe') modifierAction({ ...action, destinataire: n }); if (action?.type === 'leurre') modifierAction({ ...action, numero: n }); }
              const directions: Record<string, PointCombinaison> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
              const direction = directions[e.key]; if (direction) {
                e.preventDefault();
                if (preparation) {
                  if (destination && action && (action.type === 'leurre' ? action.numero === n : traces.find(t => t.indexAction === actionIndex)?.acteur === n)) {
                    modifierAction({ ...action, destination: { x: borner(action.destination.x + direction.x, -35, 35), y: borner(action.destination.y + direction.y, -65, 65) } });
                  } else appliquerVue({ ...vueCourante.current, centre: { x: vueCourante.current.centre.x + direction.x, y: vueCourante.current.centre.y + direction.y } });
                } else { selectionner(n, true); placerSurTerrain(n, { x: p.x + direction.x, y: p.y + direction.y }); }
              }
            }}><title>{adverse ? t("ui.2a7a1ac524b6", { v0: n }) : joueurs[n] ?? `N° ${n}`}{!adverse && c.phase === 'touche' && n === 2 ? t("ui.3f6cf7fd0c34") : !adverse && c.phase === 'touche' && n === v.sauteur ? lancerLong ? t("ui.5affd663e7ea") : t("ui.aaffd17c57b4") : ''}</title>
              <ellipse className="ec-selection-joueur" cx={p.x} cy={p.y + .15} rx={hauteurJoueur * .23} ry={hauteurJoueur * .1} fill={n === joueur && !navigationLibre ? '#e6c17e50' : '#091b1760'} stroke={n === joueur && !navigationLibre ? '#f1d491' : 'none'} strokeWidth=".18" />
              <SpriteRugbymanMemo pion={pion} position={p} terrain={simulation} maillot={adverse ? tenueAdverse : tenue} porteur={simulation.porteurId === pion.id} positionPorteur={simulation.pions.find(p => p.id === simulation.porteurId)} hauteurMetres={hauteurJoueur} temps={temps ?? 0} compact={tailleTerrain.largeur < 700} />
              <g className="ec-badge-joueur" transform={`translate(${p.x + hauteurJoueur * .26} ${p.y - hauteurJoueur * .18}) scale(${hauteurJoueur / 3.8})`}><rect x="-.7" y="-.7" width="1.4" height="1.4" rx=".35" fill={n === joueur && !navigationLibre ? '#e6c17e' : '#132d25'} stroke={lifteurs.some(l => l.numero === n) && c.phase === 'touche' ? '#83e4ca' : '#bdcabd'} strokeWidth=".12" /><text textAnchor="middle" dominantBaseline="central" fontSize=".95" fontWeight="700" fill={n === joueur && !navigationLibre ? '#193c2c' : '#fff'}>{n}</text></g>
              <rect className="ec-cible-joueur" x={p.x - hauteurJoueur * .35} y={p.y - hauteurJoueur * .78} width={hauteurJoueur * .9} height={hauteurJoueur} rx=".5" fill="transparent" />
            </g>; })}
            {!simulation.porteurId && <g className="ec-ballon-vol" pointerEvents="none"><ellipse cx={ballon.x} cy={ballon.y} rx=".65" ry=".3" fill="#08161050" /><ellipse cx={ballon.x} cy={ballon.y - (ballon.hauteur ?? image.hauteurBallon) * .8 - .6} rx=".65" ry=".4" fill="#faf3dc" stroke="#a78b51" strokeWidth=".15" /></g>}
          </svg>
        </div>
        {(zoom > 1 || vue !== 'terrain') && <div className="ec-deplacement" role="group" aria-label={t("ui.5041bd61ff37")}><span>{t("ui.5041bd61ff37")}</span>{([['Gauche', -8, 0, 'gauche'], ['Droite', 8, 0, 'droite'], ['Haut', 0, -6, 'haut'], ['Bas', 0, 6, 'bas']] as const).map(([nom, x, y, direction]) => <button key={nom} className="btn fantome ec-bouton-icone" aria-label={t("ui.ecc4a36e124e", { v0: nom.toLowerCase() })} onClick={() => appliquerVue({ ...vueCourante.current, centre: { x: vueCourante.current.centre.x + x, y: vueCourante.current.centre.y + y } })}><Icone nom="fleche-droite" taille={15} className={`ec-fleche-${direction}`} /></button>)}</div>}
        <div className="ec-lecture">
          <div className="ec-commandes-lecture"><button className="btn primaire ec-visualiser" disabled={!duree || !valide || bloque} onClick={() => { if (lecture) setLecture(false); else { if (temps === null || temps >= duree) setTemps(!avecOpposition && preparation ? preparation.debut : 0); setLecture(true); } }}><Icone nom={lecture ? 'pause' : 'lecture'} taille={17} />{lecture ? t("ml.pause") : temps !== null && temps > 0 && temps < duree ? t("ml.reprendre") : avecOpposition ? t("ui.9e7cd9cb5a63") : t("ui.e7a19420f94c")}</button>
            <div className="ec-transport" role="group" aria-label={t("ui.ff7d0cfe6815")}>
              <button className="btn fantome ec-bouton-icone" disabled={!duree || !valide || bloque} aria-label={t("ui.dd5729c9e26b")} title={t("ui.2481f3a3de09")} onClick={() => { montrerEtape(0); setLecture(true); }}><Icone nom="repost" taille={16} /></button>
              <button className="btn fantome ec-bouton-icone" disabled={temps === null || temps <= 0} aria-label={t("ui.41dd23bf2f5e")} title={t("ui.41dd23bf2f5e")} onClick={() => montrerEtape(Math.max(0, Math.ceil(temps ?? 0) - 1))}><Icone nom="fleche-droite" taille={16} className="ec-fleche-gauche" /></button>
              <button className="btn fantome ec-bouton-icone" disabled={!duree || temps !== null && temps >= duree} aria-label={t("ui.efeeeca918cd")} title={t("ui.efeeeca918cd")} onClick={() => montrerEtape(Math.floor(temps ?? 0) + 1)}><Icone nom="fleche-droite" taille={16} /></button>
            </div>
            <label className="ec-vitesse">{t("attr.vitesse")}<select value={vitesse} onChange={e => setVitesse(Number(e.target.value))}><option value=".5">× 0,5</option><option value="1">× 1</option><option value="1.5">× 1,5</option></select></label>
            <button className="btn fantome ec-retour-edition" disabled={temps === null && !avecOpposition} onClick={() => choisirSimulation('trace')}><Icone nom="formation" taille={15} />{t("ui.d68fa6e99a32")}</button>
          </div>
          <label className="ec-progression"><span>{t("ui.ca35e3f1c9dc", { v0: avecOpposition ? t("ui.42822f081693") : t("ui.e6991be5c24f") })}<span>{temps === null ? preparation ? t("ui.ab0ad1eddece", { v0: etapeIndex! + 1 }) : t("ui.1891a14c9bbf") : avecOpposition ? `${(temps ?? 0).toFixed(1)} / ${duree.toFixed(1)} s` : `${Math.min(Math.floor(temps) + 1, duree)} / ${duree}`}</span></span><input type="range" min="0" max={duree} step=".05" value={temps ?? preparation?.debut ?? 0} disabled={!duree || !valide} onChange={e => montrerEtape(Number(e.target.value))} /></label>
          <div className="ec-infos-lecture"><p className="ec-etape" aria-live="off">{avecOpposition ? temps !== null && temps >= duree ? essai?.resultat : texteTraduit(opposition?.libelle) : temps === null ? preparation ? etapeIndex ? t("ui.46c1539adb30", { v0: etapeIndex + 1, v1: etapeIndex }) : t("ui.2563e78009c3") : apresConquete ? t("ui.78e4f1acc81d") : t("ui.38c784220992") : temps >= duree ? t("ui.3d7317cfd73a") : traces.filter(t => t.debut === etape).map(t => texteTraduit(t.libelle)).join(' · ')}</p>{!avecOpposition && <button className="btn fantome ec-traces" aria-pressed={tracesVisibles} onClick={() => setTracesVisibles(t => !t)}><Icone nom="oeil" taille={15} />{t("ui.5bdf7c88c68c")}</button>}</div>
          {avecOpposition && opposition && <div className="ec-bilan-opposition"><span>{t("ui.71cee0e811ed", { v0: opposition.passes })}</span><span>{t("ui.5bf16199d653", { v0: opposition.plaquages })}</span><span>{t("ui.160a8c5cc8b5", { v0: opposition.metres })}</span></div>}
        </div>
        <div className="ec-legende">{avecOpposition ? <><span className="attaque">{t("compo.tonXV")}</span><span className="defense">{t("ui.112700ecb029")}</span></> : <><span className="lancer">{t("ui.f5ecbe3719cf")}</span><span className="passe">{t("attr.passe")}</span><span className="course">{t("ui.45fbf655ee78")}</span><span className="pied">{t("attr.jeuAuPied")}</span></>}</div>
        <p id={`${marqueur}-aide`} className="ec-aide">{navigationLibre ? t("ui.166e8989a439", { v0: temps !== null ? t("ui.20f5c657cbfe") : bloque ? '' : preparation ? t("ui.2a8548d2f5fd") : t("ui.30e1071f6442") }) : destination ? t("ui.c85a272489ff") : action?.type === 'passe' ? t("ui.bfbcb941ddbb") : preparation ? t("ui.ff120b119f29") : t("ui.ee305055c495")}</p>
      </div>
      <aside className="ec-visualiseur-reglages">
        {c.phase === 'melee' && <fieldset disabled={bloque || temps !== null || avecOpposition} className="ec-sortie-melee"><legend>{t("ui.5afa663a9736")}</legend>
          <label>{t("ui.07548f84451e")}<select value={v.depart} onChange={e => modifierVariante({ ...v, depart: Number(e.target.value) })}><option value={9}>{t("ui.d6aa32079465", { v0: joueurs[9] ? ` · ${joueurs[9]}` : '' })}</option><option value={8}>{t("ui.216303ba0703", { v0: joueurs[8] ? ` · ${joueurs[8]}` : '' })}</option></select></label>
          <p className="ec-info">{v.depart === 8 ? t("ui.de9537f9b3ac") : t("ui.99f1469c2534")}</p>
        </fieldset>}
        {c.phase === 'touche' && <fieldset disabled={bloque || temps !== null || avecOpposition} className="ec-touche"><legend>{t("ui.79c37c62b583")}</legend><p>{t("ui.8dae219ef746")}</p>
          <label>{lancerLong ? t("ui.d9f9fde1b88b") : t("ui.43e35f74804a")}{numeros(v.sauteur, sauteur => modifierVariante({ ...v, sauteur }), n => n !== 2 && (lancerLong || n <= 8))}</label>
          <label>{t("ui.a4149f8e1ff2")}<select value={touche.alignes} onChange={e => modifierVariante({ ...v, touche: { ...touche, alignes: Number(e.target.value) as 4 | 5 | 7 } })}><option value="4">{t("ui.c6fbc8b40a57")}</option><option value="5">{t("ui.f34c31793a2d")}</option><option value="7">{t("ui.f96c79706d37")}</option></select></label>
          <label>{t("ui.431122d5f466")}<select value={lancerLong ? 'apres' : touche.distance <= 7 ? 'court' : touche.distance >= 11 ? 'fond' : 'milieu'} onChange={e => modifierVariante({ ...v, sauteur: e.target.value !== 'apres' && v.sauteur > 8 ? 4 : v.sauteur, touche: { ...touche, distance: e.target.value === 'apres' ? 18 : e.target.value === 'court' ? 6 : e.target.value === 'fond' ? 13 : 9 } })}><option value="court">{t("ui.909007e89cb8")}</option><option value="milieu">{t("ui.0c7ef0c7e2ee")}</option><option value="fond">{t("ui.e294280935bf")}</option><option value="apres">{t("ui.206210712e0b")}</option></select></label>
          <label>{t("ui.bbf99a47992b")}<input type="number" min="5" max="25" step=".5" value={touche.distance} onChange={e => {
            const distance = borner(Number(e.target.value) || 5, 5, 25);
            modifierVariante({ ...v, sauteur: distance <= 15 && v.sauteur > 8 ? 4 : v.sauteur, touche: { ...touche, distance } });
          }} /></label>
          <label className="ec-case"><input type="checkbox" checked={touche.feinte} onChange={e => modifierVariante({ ...v, touche: { ...touche, feinte: e.target.checked } })} />{t("ui.ba42aae1dbd3")}</label>
          <p className="ec-info">{t("ui.d4ab90909b7b", { v0: lancerLong ? t("ui.44ad76fcc29f", { v0: v.sauteur, v1: touche.distance }) : t("ui.d00743cae2e8", { v0: lifteurs.map(p => `n° ${p.numero}`).join(' et '), v1: touche.distance }) })}</p>
        </fieldset>}
        {preparation && !avecOpposition ? <p className="ec-info ec-contexte-etape">{t("ui.785e94384d78", { v0: etapeIndex! + 1 })}</p> : <fieldset disabled={bloque || temps !== null || avecOpposition} className="ec-placement"><legend>{t("ui.4937d6631197")}</legend><label>{t("ui.54e8d3c2ca8c")}<select value={joueur ?? ''} onChange={e => selectionner(e.target.value ? Number(e.target.value) : null, true)}><option value="">{t("ui.1cdf95ab45ef")}</option>{Array.from({ length: 15 }, (_, i) => i + 1).map(n => <option key={n} value={n} disabled={verrouilles.includes(n)}>N° {n}{joueurs[n] ? ` · ${joueurs[n]}` : ''}{verrouilles.includes(n) ? t("ui.00ed01fa1607") : ''}</option>)}</select></label>
          <label>{t("ui.7da52a4570df")}<input type="number" disabled={joueur === null || joueurVerrouille || c.phase === 'touche' && (joueur === 2 || joueur === v.sauteur)} min="-35" max="35" step=".5" value={joueur === null ? '' : Math.round((initiales[joueur].x - origine.x) * 10) / 10} onChange={e => { if (joueur !== null) placerSurTerrain(joueur, { ...initiales[joueur], x: origine.x + Number(e.target.value) }); }} /></label>
          <label>{t("ui.99907dd0b2f5")}<input type="number" disabled={joueur === null || joueurVerrouille || c.phase === 'touche' && joueur === 2} min="-65" max="65" step=".5" value={joueur === null ? '' : Math.round((initiales[joueur].y - origine.y) * 10) / 10} onChange={e => { if (joueur !== null) placerSurTerrain(joueur, { ...initiales[joueur], y: origine.y + Number(e.target.value) }); }} /></label>
          <p className="ec-info">{joueur === null ? t("ui.70497c3eebad") : c.phase === 'touche' && joueur === 2 ? t("ui.444af9a698ab") : c.phase === 'touche' && joueur === v.sauteur ? t("ui.7ccab0fa5464") : t("ui.47727c9982dd")}</p>
          <button className="btn fantome" disabled={!v.placements.length} onClick={() => { modifierVariante({ ...v, placements: [] }); setApresConquete(false); setTemps(null); setLecture(false); }}><Icone nom="formation" taille={15} />{t("ui.28e61d5fa289")}</button>
        </fieldset>}
        {agrandi && !avecOpposition && <div className="ec-etapes"><h3>{t("ui.a4e49c021237")}</h3>{traces.map((trace, i) => <button className={`ec-plan ${etape === trace.debut ? 'selectionne' : ''}`} key={i} onClick={() => {
          montrerEtape(trace.debut + .5);
          if (window.matchMedia('(max-width: 760px)').matches) terrainRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
        }}>{texteTraduit(trace.libelle)}</button>)}</div>}
      </aside>
    </div>
  </>;
  return agrandi ? <><div className="ec-terrain-ouvert">{t("ui.0f62a3072f78")}<button className="btn" onClick={fermerTerrain}>{t("ui.cefbaa8282b1")}</button></div><TerrainAgrandi fermer={fermerTerrain}>{contenu}</TerrainAgrandi></> : <div className="ec-visualisation">{contenu}</div>;
}
