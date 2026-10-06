// LA COUCHE DU TUTORIEL GUIDÉ (Correctif 18) — le voile, l'anneau, la bulle.
//
// Montée UNE FOIS (App.tsx), elle lit `lib/tutoriel/guide.ts` : le moteur décide, ce composant dessine. Aucun écran du jeu ne
// l'importe : il leur suffit de porter un `data-tuto="…"`.
//
// ═══ CE QUI A ÉTÉ TRANCHÉ ═══════════════════════════════════════════════════
//
// 1. ⚠️ LE VOILE EST FAIT DE QUATRE PANNEAUX AUTOUR D'UN TROU, pas d'un masque SVG. Le trou n'est PAS un élément : un clic dans
//    le trou atteint donc la vraie cible, sans aucun relais — c'est ce qui rend le « clic imposé » honnête (le vrai bouton réagit).
//    Pour une étape `info`, un cache transparent bouche le trou : on regarde, on ne touche pas.
// 2. ⚠️ LA BULLE NE RECOUVRE JAMAIS CE QU'ELLE EXPLIQUE (`placement.ts`, testé sur vingt tailles d'écran) : flottante près de la
//    cible sur grand écran, feuille en haut ou en bas sur téléphone, et défilement de la page si la cible est dans la zone de la feuille.
// 3. ⚠️ LES MESURES SE RELÈVENT À CHAQUE IMAGE (rAF) ET AU SECOURS À 200 MS : l'anneau suit un défilement, une rotation, un
//    redimensionnement, une animation d'onglet. Le secours existe parce qu'un onglet masqué ne tire plus `requestAnimationFrame`.
// 4. ⚠️ UNE CIBLE QUI N'EST PAS (ENCORE) À L'ÉCRAN NE DESSINE RIEN : ni voile, ni bulle. Le moteur saute l'étape si elle n'arrive pas.
// 5. ⚠️ « SOUPLE » : un parcours contextuel (carton, blessure…) n'assombrit rien et ne bloque rien — une bulle en bas, un bouton OK.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';
import { Icone } from '../Icone';
import { AnimationTuto } from './AnimationTuto';
import * as guide from '../../lib/tutoriel/guide';
import {
  ancre, avancer, etapeCourante, indexPrecedent, passer, passesDAffilee, reculer, surveiller, terminer, useGuide,
  reconnaitreLesAnciens, type EtatGuide,
} from '../../lib/tutoriel/guide';
import * as memoire from '../../lib/tutoriel/memoire';
import { desactiverLesTutoriels, usePreferencesTutoriel } from '../../lib/tutoriel/memoire';
import { boiteDeLaCible, MARGE, MARGE_ANNEAU, placerLaBulle, type Boite, type Placement, type Vue } from '../../lib/tutoriel/placement';
import { parcoursInstalles } from '../../lib/tutoriel/parcours';
import type { EtapeTuto } from '../../lib/tutoriel/types';
import './GuideTutoriel.css';

interface Mesures { nom: string | undefined; rect: Boite | null; rayon: number; vue: Vue }

function mesurerLaVue(): Vue {
  const vv = window.visualViewport;
  return { w: Math.round(vv?.width ?? window.innerWidth), h: Math.round(vv?.height ?? window.innerHeight) };
}

/** Rayon d'angle de la cible en pixels : `12px` tel quel, `50 %` ramené à la moitié de la plus petite dimension. */
function rayonDe(el: HTMLElement, r: DOMRect): number {
  const brut = getComputedStyle(el).borderTopLeftRadius;
  const n = parseFloat(brut);
  if (!Number.isFinite(n)) return 12;
  return brut.endsWith('%') ? (n / 100) * Math.min(r.width, r.height) : n;
}

function mesurer(nomCible: string | undefined): Mesures {
  const el = nomCible ? ancre(nomCible) : null;
  const r = el ? el.getBoundingClientRect() : null;
  return { nom: nomCible, rect: r && el ? { x: r.left, y: r.top, w: r.width, h: r.height } : null, rayon: r && el ? rayonDe(el, r) : 12, vue: mesurerLaVue() };
}

/**
 * Relève la cible et la vue à chaque image — l'anneau suit tout. Ne redessine que si quelque chose a bougé.
 * ⚠️ AU CHANGEMENT D'ÉTAPE, L'ANCIENNE MESURE NE SERT PLUS : on mesure tout de suite, dans le rendu. Sinon la bulle se placerait
 * une image durant par rapport à l'élément de l'étape précédente (et le voile clignoterait).
 */
function useMesures(nomCible: string | undefined): Mesures {
  const [mesuree, setM] = useState<Mesures>(() => mesurer(nomCible));
  const m = mesuree.nom === nomCible ? mesuree : mesurer(nomCible);
  useEffect(() => {
    let raf = 0;
    let prec = '';
    const relever = (): void => {
      const suivante = mesurer(nomCible);
      const r = suivante.rect;
      const vue = suivante.vue;
      const cle = r ? `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)},${Math.round(r.h)}|${vue.w}x${vue.h}` : `-|${vue.w}x${vue.h}`;
      if (cle === prec) return;
      prec = cle;
      setM(suivante);
    };
    const boucle = (): void => { relever(); raf = requestAnimationFrame(boucle); };
    boucle();
    const secours = window.setInterval(relever, 200);
    return () => { cancelAnimationFrame(raf); window.clearInterval(secours); };
  }, [nomCible]);
  return m;
}

/** Mesure la bulle : `ResizeObserver` plutôt qu'un effet synchrone — la taille change quand le texte change de langue. */
function useTaille(
  ext: React.RefObject<HTMLDivElement | null>,
  corps: React.RefObject<HTMLDivElement | null>,
  seq: number,
): Vue | null {
  const [taille, setTaille] = useState<Vue | null>(null);
  useLayoutEffect(() => {
    const el = ext.current;
    const interieur = corps.current;
    if (!el || !interieur) return undefined;
    const lire = (): void => {
      // La hauteur NATURELLE du corps (sa part défilante comprise) : la bulle est bornée par la vue, pas par son contenu.
      const w = el.offsetWidth;
      const h = interieur.scrollHeight + 2;
      setTaille((p) => (p && p.w === w && p.h === h ? p : { w, h }));
    };
    const obs = new ResizeObserver(lire);
    obs.observe(el);
    obs.observe(interieur);
    return () => obs.disconnect();
  }, [ext, corps, seq]);
  return taille;
}

function typeDe(e: EtapeTuto): NonNullable<EtapeTuto['type']> {
  return e.type ?? (e.cible ? 'info' : 'carte');
}

/** Les quatre panneaux du voile autour du trou (coordonnées de la vue). */
function Voile({ boite, bloque }: { boite: Boite | null; bloque: boolean }) {
  if (!boite) return <div className="gt-voile gt-voile-plein" />;
  const x2 = boite.x + boite.w;
  const y2 = boite.y + boite.h;
  return (
    <>
      <div className="gt-voile" style={{ top: 0, left: 0, right: 0, height: boite.y }} />
      <div className="gt-voile" style={{ top: y2, left: 0, right: 0, bottom: 0 }} />
      <div className="gt-voile" style={{ top: boite.y, left: 0, width: boite.x, height: boite.h }} />
      <div className="gt-voile" style={{ top: boite.y, left: x2, right: 0, height: boite.h }} />
      {bloque && <div className="gt-cache" style={{ top: boite.y, left: boite.x, width: boite.w, height: boite.h }} />}
    </>
  );
}

function Bulle({ g, e, m }: { g: EtatGuide; e: EtapeTuto; m: Mesures }) {
  const p = g.parcours!;
  const type = typeDe(e);
  const cle = e.cle ?? `tg.${p.id}.${e.id}`;
  const anim = typeof e.anim === 'function' ? e.anim() : e.anim;
  const ref = useRef<HTMLDivElement | null>(null);
  const corpsRef = useRef<HTMLDivElement | null>(null);
  const taille = useTaille(ref, corpsRef, g.seq);
  const precedent = indexPrecedent();
  const total = p.etapes.length;
  const compact = m.vue.h < 430;
  const dernier = g.index === total - 1;
  const clicOuAction = type === 'clic' || type === 'action';

  // ⚠️ « SERRÉ » : une bulle qui recouvre encore sa cible (cible énorme) perd son animation et son icône pour tenir en deux lignes —
  // et le reste pour toute l'étape (sinon elle oscillerait entre grande et petite à chaque mesure).
  const [serre, setSerre] = useState(false);
  const placement: Placement | null = useMemo(() => {
    if (!taille || p.souple) return null;
    return placerLaBulle(e.cible ? m.rect : null, taille, m.vue, e.cote);
  }, [taille, p.souple, m.rect, m.vue, e.cible, e.cote]);
  const chevauche = placement?.chevauche ?? false;
  useEffect(() => { if (chevauche) setSerre(true); }, [chevauche]);

  // La cible est dans la zone de la feuille : on fait défiler la page, une fois par étape, pour la dégager.
  const corrige = useRef(-1);
  useEffect(() => {
    if (!placement || !placement.chevauche || !m.rect || corrige.current === g.seq) return;
    corrige.current = g.seq;
    const libreDebut = placement.enHaut ? placement.y + placement.h + MARGE : MARGE;
    const libreFin = placement.enHaut ? m.vue.h - MARGE : placement.y - MARGE;
    const delta = m.rect.y + m.rect.h / 2 - (libreDebut + libreFin) / 2;
    if (Math.abs(delta) > 6) window.scrollBy({ top: delta, behavior: 'smooth' });
  }, [placement, m.rect, m.vue.h, g.seq]);

  // Focus sur le bouton principal d'une carte ou d'une info, pour le clavier — sans faire défiler.
  const boutonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!clicOuAction && placement) boutonRef.current?.focus({ preventScroll: true });
  }, [clicOuAction, placement === null, g.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  const style: React.CSSProperties = {};
  if (placement) {
    if (placement.mode === 'feuille') {
      style.left = placement.x; style.width = placement.w; style.maxHeight = placement.h;
      if (placement.enHaut) style.top = `calc(${placement.y}px + env(safe-area-inset-top, 0px))`;
      else style.bottom = `calc(${m.vue.h - placement.y - placement.h}px + env(safe-area-inset-bottom, 0px))`;
    } else {
      style.left = placement.x; style.top = placement.y; style.width = placement.w; style.maxHeight = placement.h;
    }
  }
  const classe = p.souple ? 'gt-bulle gt-souple' : `gt-bulle gt-${placement?.mode ?? 'mesure'}${clicOuAction ? ' gt-attente' : ''}${serre ? ' gt-serre' : ''}`;

  return (
    <div
      ref={ref}
      className={classe}
      style={style}
      role="dialog"
      aria-label={t(e.titre ? `${cle}.t` : `${cle}.x`)}
      aria-live="polite"
      data-etape={e.id}
    >
      {placement?.bord && (
        <span className="gt-fleche" data-bord={placement.bord}
          style={placement.bord === 'haut' || placement.bord === 'bas' ? { left: placement.fleche } : { top: placement.fleche }} />
      )}
      <button type="button" className="gt-fermer" onClick={passer} aria-label={t('tg.ui.passer')}>
        <Icone nom="croix" taille={15} />
      </button>

      <div className="gt-corps" ref={corpsRef}>
      <div className="gt-tete">
        {e.icone && <span className="gt-icone" aria-hidden="true"><Icone nom={e.icone} taille={20} /></span>}
        <div className="gt-textes">
          {e.titre && <h3 className="gt-titre">{t(`${cle}.t`)}</h3>}
          <p className="gt-texte">{t(`${cle}.x`)}</p>
        </div>
      </div>

      {anim && !compact && !serre && <div className="gt-anim"><AnimationTuto nom={anim} /></div>}

      {e.choix && (
        <div className="gt-choix">
          {e.choix.map((c) => (
            <button key={c.id} type="button" className="gt-choix-carte" data-choix={c.id}
              onClick={() => { terminer(); c.choisir(); }}>
              <span className="gt-choix-icone" aria-hidden="true"><Icone nom={c.icone} taille={26} /></span>
              <span className="gt-choix-textes">
                <b>{t(c.titre)}</b>
                <small>{t(c.texte)}</small>
              </span>
              <Icone nom="fleche-droite" taille={18} className="gt-choix-fleche" />
            </button>
          ))}
        </div>
      )}

      {clicOuAction && (
        <p className="gt-consigne">
          <span className="gt-consigne-point" aria-hidden="true" />
          {t(e.consigne ?? (type === 'clic' ? 'tg.ui.clic' : 'tg.ui.action'))}
        </p>
      )}

      <div className="gt-pied">
        {total > 1 && <>
          <span className="gt-progression" aria-label={t('tg.ui.etape', { n: String(g.index + 1), total: String(total) })}>
            <i style={{ width: `${((g.index + 1) / total) * 100}%` }} />
          </span>
          <span className="gt-compte" aria-hidden="true">{g.index + 1}/{total}</span>
        </>}
        <div className="gt-boutons">
          {!e.choix && !p.souple && <button type="button" className="gt-btn gt-btn-lien" onClick={passer}>{t('tg.ui.passer')}</button>}
          {e.choix && <button type="button" className="gt-btn gt-btn-lien" onClick={passer}>{t('tg.ui.plusTard')}</button>}
          {precedent !== null && !clicOuAction && (
            <button type="button" className="gt-btn gt-btn-fantome" onClick={reculer}>{t('tg.ui.retour')}</button>
          )}
          {!clicOuAction && !e.choix && (
            <button ref={boutonRef} type="button" className="gt-btn gt-btn-principal" onClick={avancer}>
              {t(e.bouton ?? (p.souple ? 'tg.ui.ok' : dernier ? 'tg.ui.terminer' : 'tg.ui.suivant'))}
            </button>
          )}
        </div>
      </div>

      {(g.index === 0 && !p.souple || passesDAffilee() >= 2) && (
        <button type="button" className="gt-desactiver" onClick={() => { desactiverLesTutoriels(true); }}>
          {t('tg.ui.desactiver')}
        </button>
      )}
      </div>
    </div>
  );
}

function EtapeGuide({ g }: { g: EtatGuide }) {
  const p = g.parcours!;
  const e = p.etapes[g.index];
  const type = typeDe(e);
  const m = useMesures(e.cible);

  // Amener la cible à l'écran, une fois par étape (et dès qu'elle existe) — et de nouveau quand l'écran change de forme : un téléphone qu'on
  // tourne remet la cible hors de la fenêtre.
  const defile = useRef('');
  const trouvee = m.rect !== null;
  useEffect(() => {
    if (!e.cible || !trouvee) return;
    const cle = `${g.seq}:${m.vue.w}x${m.vue.h}`;
    if (defile.current === cle) return;
    defile.current = cle;
    const el = ancre(e.cible);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = m.vue.h;
    if (r.top < 64 || r.bottom > vh - 64) el.scrollIntoView({ block: r.height > vh * 0.6 ? 'start' : 'center', behavior: 'smooth' });
  }, [e.cible, trouvee, g.seq, m.vue.w, m.vue.h]);

  // Le clavier : Échap passe le parcours ; Entrée et → avancent sur une carte ou une info ; ← revient.
  useEffect(() => {
    const touche = (ev: KeyboardEvent): void => {
      const c = etapeCourante();
      if (!c) return;
      // ⚠️ Échap passe le parcours SEUL : sans `stopImmediatePropagation`, la modale qu'on est en train d'expliquer se refermerait avec lui.
      if (ev.key === 'Escape') { ev.stopImmediatePropagation(); ev.preventDefault(); passer(); return; }
      const lecture = typeDe(c) === 'info' || typeDe(c) === 'carte';
      if (!lecture || c.choix) return;
      const actif = document.activeElement;
      const saisie = actif instanceof HTMLElement && (actif.tagName === 'INPUT' || actif.tagName === 'TEXTAREA' || actif.isContentEditable);
      if (saisie) return;
      if (ev.key === 'ArrowRight') { ev.preventDefault(); avancer(); }
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); reculer(); }
    };
    window.addEventListener('keydown', touche, true);
    return () => window.removeEventListener('keydown', touche, true);
  }, []);

  const cibleAttendue = Boolean(e.cible) && !trouvee;
  if (cibleAttendue) return null;
  // Une étape sans objet ne se montre pas, même pour l'image qui précède sa franchise.
  let sansObjet = false;
  try { sansObjet = e.ignorerSi?.() ?? false; } catch { sansObjet = false; }
  if (sansObjet) return null;

  const boite = e.cible && m.rect ? boiteDeLaCible(m.rect, m.vue) : null;
  const rayon = m.rayon + MARGE_ANNEAU * 0.6;

  return (
    <div className={`gt-racine${p.souple ? ' gt-racine-souple' : ''}`} data-type={type}>
      {!p.souple && <Voile boite={boite} bloque={type === 'info'} />}
      {boite && (
        <div className={`gt-anneau${type === 'clic' || type === 'action' ? ' gt-anneau-vif' : ''}`}
          style={{ left: boite.x, top: boite.y, width: boite.w, height: boite.h, borderRadius: rayon }} />
      )}
      {boite && type === 'clic' && (
        <span className="gt-tap" aria-hidden="true"
          // Une petite cible (un bouton) : le doigt se pose sur son coin bas-droit, pour ne pas cacher son libellé.
          style={boite.w < 150 || boite.h < 70
            ? { left: Math.min(boite.x + boite.w * 0.78, m.vue.w - 24), top: Math.min(boite.y + boite.h * 0.9, m.vue.h - 24) }
            : { left: Math.min(Math.max(boite.x + boite.w / 2, 24), m.vue.w - 24), top: Math.min(Math.max(boite.y + boite.h * 0.58, 24), m.vue.h - 24) }}>
          <i /><i /><b />
        </span>
      )}
      <Bulle key={g.seq} g={g} e={e} m={m} />
    </div>
  );
}

/**
 * ⚠️ LE CONTENEUR VIT DANS `document.body` ET NE DOIT JAMAIS ÊTRE INERTE. `useModalDialog` (composition plein écran, ouverture de
 * pack, réglages…) rend `inert` tout ce qui est dans `body` hors de sa modale : notre bulle ne répondrait plus au doigt, et notre voile
 * laisserait passer les clics. Un observateur remet l'attribut à zéro aussitôt qu'une modale le pose.
 */
function useConteneur(): HTMLElement {
  const [el] = useState(() => {
    const d = document.createElement('div');
    d.id = 'gt-portail';
    return d;
  });
  useEffect(() => {
    document.body.appendChild(el);
    const garde = (): void => {
      if (el.inert) el.inert = false;
      if (el.hasAttribute('aria-hidden')) el.removeAttribute('aria-hidden');
    };
    const obs = new MutationObserver(garde);
    obs.observe(el, { attributes: true, attributeFilter: ['inert', 'aria-hidden'] });
    garde();
    return () => { obs.disconnect(); el.remove(); };
  }, [el]);
  return el;
}

export function GuideTutoriel() {
  const g = useGuide();
  const prefs = usePreferencesTutoriel();
  const conteneur = useConteneur();
  useEffect(() => {
    parcoursInstalles();
    // Les essais en navigateur lisent le moteur par cette poignée : un `import()` direct donnerait une AUTRE instance du module.
    if (import.meta.env.DEV) (window as unknown as { __tutoriel: unknown }).__tutoriel = { guide, memoire };
    reconnaitreLesAnciens();
    return surveiller();
  }, []);
  if (!g.parcours || prefs.desactive) return null;
  return createPortal(<EtapeGuide key={g.parcours.id} g={g} />, conteneur);
}
