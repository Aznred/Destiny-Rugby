// LE HUD DES RESPONSABILITÉS — ce que le jeu demande au joueur quand il est capitaine, buteur, lanceur ou chargé de l'engagement
// (Correctif 17).
//
// Demande : « interface de décision après pénalité (poteaux / touche / mêlée / jouer rapidement), match en attente quelques secondes ;
// tir mobile au doigt, tir PC à la souris et à la molette, tir à la manette ; lanceur de touche : choix de combinaison puis lancer ;
// tutoriel progressif à la première occurrence de chaque responsabilité ».
//
// ⚠️ IL NE DÉCIDE D'AUCUNE RÈGLE. Un bouton dépose une demande dans la file du pilote (`pilotage.resp.demander`), un geste de pouce
// ou de souris dépose un évènement de pointeur : c'est le pilote qui les lit, dans la boucle de l'écran, et c'est le moteur qui
// dit ce qui en sort.
//
// ⚠️ UN SEUL VOCABULAIRE POUR TROIS APPAREILS : le même panneau, avec la touche, le symbole de la manette ou le geste du pouce
// dont l'appareil du moment a besoin. Rien ne se cache derrière une option : le panneau dit ce qu'il attend.
//
// ⚠️ LA VISÉE EST DESSINÉE SANS RÉVÉLER LE RÉSULTAT : le repère de visée, le vent, la distance, une marque de force utile (à couper
// dans les réglages). Jamais où le ballon tomberait, ni s'il passe.

import { useEffect, useRef, type ReactNode } from 'react';
import { Icone, type NomIcone } from '../Icone';
import { t } from '../../lib/i18n';
import type { PilotageDirect, SnapPilotage } from '../../lib/controleDirect/pilotage';
import type { SnapResp } from '../../lib/controleDirect/responsabilites';
import type { PreferencesControle } from '../../lib/controleDirect/prefs';
import { libelleDeTouche } from '../../lib/controleDirect/touches';
import { LIBELLES_MANETTE, type NomBouton, type TypeManette } from '../../lib/controleDirect/manette';
import type { ChoixPenalite, CombinaisonTouche } from '../../lib/moteur/responsabilites';
import './Responsabilites.css';

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// ---------------------------------------------------------------------------
// LES SYMBOLES D'APPAREIL : une touche, un bouton de manette
// ---------------------------------------------------------------------------

/** Un bouton de manette, avec les formes d'une PlayStation ou les lettres d'une Xbox. */
function Bouton({ b, type }: { b: NomBouton; type: TypeManette }) {
  const libelle = LIBELLES_MANETTE[type][b];
  if (type === 'playstation' && ['croix', 'rond', 'carre', 'triangle'].includes(libelle)) {
    return (
      <svg className="cd-glyphe" data-forme={libelle} viewBox="0 0 24 24" aria-label={libelle} role="img">
        {libelle === 'croix' && <path d="M7 7l10 10M17 7 7 17" />}
        {libelle === 'rond' && <circle cx="12" cy="12" r="5.6" />}
        {libelle === 'carre' && <rect x="6.6" y="6.6" width="10.8" height="10.8" rx="1" />}
        {libelle === 'triangle' && <path d="M12 6 18.4 17.2H5.6Z" />}
      </svg>
    );
  }
  return <span className="cd-pastille-manette" data-b={b}>{libelle}</span>;
}

/** L'aide courte du panneau, selon l'appareil : un trait de texte, jamais un manuel. */
function Aide({ cle, snap, prefs, vars }: { cle: string; snap: SnapPilotage; prefs: PreferencesControle; vars?: Record<string, string> }) {
  const a = snap.appareil;
  const touches = prefs.touches;
  const v = {
    action: libelleDeTouche(touches.action[0]),
    gauche: libelleDeTouche(touches.gauche[0]),
    droite: libelleDeTouche(touches.droite[0]),
    haut: libelleDeTouche(touches.haut[0]),
    bas: libelleDeTouche(touches.bas[0]),
    valider: LIBELLES_MANETTE[snap.manette].a,
    charge: snap.resp.modeManette === 'charge' ? LIBELLES_MANETTE[snap.manette].a : LIBELLES_MANETTE[snap.manette].rt,
    ...vars,
  };
  return <p className="rv-aide">{t(`${cle}.${a}`, v)}</p>;
}

// ---------------------------------------------------------------------------
// LE COMPOSANT
// ---------------------------------------------------------------------------

const ICONES_CHOIX: Record<ChoixPenalite, NomIcone> = { points: 'poteaux', touche: 'touche', melee: 'melee', rapide: 'eclair' };
const ICONES_TOUCHE: Record<CombinaisonTouche, NomIcone> = {
  avant: 'touche', milieu: 'touche', fond: 'touche', maul: 'pousse', leurreAvant: 'feinte', leurreMilieu: 'feinte', sortieRapide: 'eclair',
};

export function Responsabilites({ pilotage, snap, prefs }: { pilotage: PilotageDirect; snap: SnapPilotage; prefs: PreferencesControle }) {
  const r = snap.resp;
  return (
    <div className="rv" data-appareil={snap.appareil} data-panneau={r.panneau ?? undefined}>
      {r.zone && <ZoneVisee pilotage={pilotage} />}
      {r.panneau === 'penalite' && !r.tuto && <PanneauPenalite pilotage={pilotage} snap={snap} prefs={prefs} />}
      {r.panneau === 'tir' && !r.tuto && <PanneauTir pilotage={pilotage} snap={snap} prefs={prefs} />}
      {r.panneau === 'engagement' && !r.tuto && <PanneauEngagement pilotage={pilotage} snap={snap} prefs={prefs} />}
      {r.panneau === 'touche' && !r.tuto && <PanneauTouche pilotage={pilotage} snap={snap} prefs={prefs} />}
      {r.retour && <div className="rv-retour" key={r.retour.n} role="status">{t(r.retour.cle)}</div>}
      {r.derniere && <Bandeau resp={r} />}
      {r.conseil && !r.tuto && (
        <div className="rv-conseil" role="status" key={r.conseil}>
          <Icone nom="drop" taille={18} />
          <span>{t(`rv.conseil.${r.conseil}.${snap.appareil}`, { touche: libelleDeTouche(prefs.touches.drop[0]), bouton: `${LIBELLES_MANETTE[snap.manette].lb} + ${LIBELLES_MANETTE[snap.manette].b}` })}</span>
        </div>
      )}
      {r.tuto && <CarteTuto pilotage={pilotage} snap={snap} prefs={prefs} />}
    </div>
  );
}

/** Le choix d'un capitaine IA : quelques secondes de bandeau (le fil du match le dit aussi). */
function Bandeau({ resp }: { resp: SnapResp }) {
  const d = resp.derniere!;
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const n = el.current;
    if (!n) return;
    n.dataset.visible = 'oui';
    const id = window.setTimeout(() => { n.dataset.visible = 'non'; }, 5200);
    return () => window.clearTimeout(id);
  }, [d.n]);
  return (
    <div ref={el} className="rv-bandeau" data-visible="oui" key={d.n} role="status">
      <Icone nom={ICONES_CHOIX[d.choix]} taille={16} />
      <span><b>{t('rv.bandeau.capitaine')}</b> {t(`rv.choix.${d.choix}`)} — {t(`rv.raison.${d.raison}`)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LE CHRONO : une barre qui se vide, jamais un compte à rebours criard
// ---------------------------------------------------------------------------

function Chrono({ reste, delai }: { reste: number | null; delai: number }) {
  if (reste === null) return <span className="rv-chrono rv-chrono-vide" aria-hidden />;
  const k = delai > 0 ? borner(reste / delai, 0, 1) : 0;
  return (
    <span className="rv-chrono" data-court={reste < 3 ? 'oui' : undefined} aria-label={t('rv.chrono', { s: Math.ceil(reste) })}>
      <i style={{ transform: `scaleX(${k})` }} />
      <b>{Math.ceil(reste)}</b>
    </span>
  );
}

// ---------------------------------------------------------------------------
// LA PÉNALITÉ : poteaux, touche, mêlée, jouer vite
// ---------------------------------------------------------------------------

function PanneauPenalite({ pilotage, snap, prefs }: { pilotage: PilotageDirect; snap: SnapPilotage; prefs: PreferencesControle }) {
  const r = snap.resp, p = r.penalite;
  if (!p) return null;
  const ordre: ChoixPenalite[] = ['points', 'touche', 'melee', 'rapide'];
  const boutons: NomBouton[] = ['a', 'b', 'x', 'y'];
  const manette = snap.appareil === 'manette';
  return (
    <section className="rv-carte rv-penalite" role="dialog" aria-label={t('rv.pen.titre')}>
      <header>
        <b><Icone nom="brassard" taille={16} /> {t('rv.pen.titre')}</b>
        <Chrono reste={r.reste} delai={r.delai} />
      </header>
      <p className="rv-sous">
        {t('rv.pen.situation', { distance: p.distance, angle: p.angle })}
        {' · '}
        {p.aPortee ? t('rv.pen.chance', { chance: p.chance }) : t('rv.pen.horsPortee')}
      </p>
      <div className="rv-choix">
        {ordre.map((c, i) => (
          <button
            key={c} type="button" className="rv-choix-bouton"
            data-conseil={p.suggestion?.choix === c ? 'oui' : undefined}
            data-grise={c === 'points' && !p.aPortee ? 'oui' : undefined}
            onClick={() => pilotage.resp.demander({ t: 'penalite', choix: c })}
          >
            <Icone nom={ICONES_CHOIX[c]} taille={26} />
            <span className="rv-choix-nom">{t(`rv.choix.${c}`)}</span>
            <span className="rv-choix-aide">{t(`rv.pen.hint.${c}`)}</span>
            <span className="rv-choix-cle">
              {manette ? <Bouton b={boutons[i]} type={snap.manette} /> : snap.appareil === 'clavier' ? <kbd className="cd-touche">{i + 1}</kbd> : null}
            </span>
          </button>
        ))}
      </div>
      {p.suggestion && (
        <p className="rv-conseil-capitaine">
          <Icone nom="entraineur" taille={14} />
          {t('rv.pen.conseil', { choix: t(`rv.choix.${p.suggestion.choix}`), raison: t(`rv.raison.${p.suggestion.raison}`) })}
        </p>
      )}
      <Aide cle="rv.pen.aide" snap={snap} prefs={prefs} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// LA ZONE DE VISÉE : la souris vise et dose, le doigt trace — un seul calque, sous les panneaux
// ---------------------------------------------------------------------------

function ZoneVisee({ pilotage }: { pilotage: PilotageDirect }) {
  const zone = useRef<HTMLDivElement>(null);
  const fil = useRef<HTMLDivElement>(null);
  const tete = useRef<HTMLDivElement>(null);
  const doigt = useRef<{ id: number; x0: number; y0: number } | null>(null);

  const envoyer = (ev: { clientX: number; clientY: number; pointerType?: string; button?: number }, type: 'bas' | 'bouge' | 'haut' | 'annule' | 'survol') => {
    const z = zone.current;
    if (!z) return;
    const r = z.getBoundingClientRect();
    pilotage.resp.pointeur({
      type, x: ev.clientX - r.left, y: ev.clientY - r.top, w: r.width, h: r.height,
      pointeur: ev.pointerType === 'mouse' ? 'souris' : 'doigt', principal: (ev.button ?? 0) === 0,
    });
  };

  // La molette doit pouvoir empêcher le défilement de la page : un écouteur natif, non passif.
  useEffect(() => {
    const z = zone.current;
    if (!z) return;
    const roue = (ev: WheelEvent) => {
      ev.preventDefault();
      const r = z.getBoundingClientRect();
      const crans = -Math.sign(ev.deltaY) * Math.max(1, Math.min(5, Math.round(Math.abs(ev.deltaY) / (ev.deltaMode === 1 ? 3 : 100))));
      pilotage.resp.pointeur({ type: 'molette', x: ev.clientX - r.left, y: ev.clientY - r.top, w: r.width, h: r.height, pointeur: 'souris', crans });
    };
    z.addEventListener('wheel', roue, { passive: false });
    return () => z.removeEventListener('wheel', roue);
  }, [pilotage]);

  const cacherFil = () => { if (fil.current) delete fil.current.dataset.actif; if (tete.current) delete tete.current.dataset.actif; };

  return (
    <>
      <div
        ref={zone}
        className="rv-zone"
        onPointerDown={(ev) => {
          if (ev.pointerType === 'mouse') { if (ev.button === 0) envoyer(ev, 'bas'); return; }
          if (doigt.current) return;
          try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur disparu */ }
          const r = ev.currentTarget.getBoundingClientRect();
          doigt.current = { id: ev.pointerId, x0: ev.clientX - r.left, y0: ev.clientY - r.top };
          envoyer(ev, 'bas');
          pilotage.tactile.actif = performance.now();
        }}
        onPointerMove={(ev) => {
          if (ev.pointerType === 'mouse') { envoyer(ev, 'survol'); return; }
          const d = doigt.current;
          if (!d || ev.pointerId !== d.id) return;
          envoyer(ev, 'bouge');
          // Le fil part de là où le doigt s'est posé et le suit : on voit la direction et la longueur du glissé.
          const r = ev.currentTarget.getBoundingClientRect();
          const px = ev.clientX - r.left - d.x0, py = ev.clientY - r.top - d.y0, L = Math.hypot(px, py);
          if (fil.current && tete.current) {
            if (L > 10) {
              fil.current.dataset.actif = '1'; tete.current.dataset.actif = '1';
              fil.current.style.left = `${d.x0}px`; fil.current.style.top = `${d.y0}px`;
              fil.current.style.width = `${L}px`; fil.current.style.transform = `rotate(${Math.atan2(py, px)}rad)`;
              tete.current.style.left = `${d.x0 + px}px`; tete.current.style.top = `${d.y0 + py}px`;
            } else cacherFil();
          }
        }}
        onPointerUp={(ev) => {
          const d = doigt.current;
          if (ev.pointerType === 'mouse' || !d || ev.pointerId !== d.id) return;
          doigt.current = null; envoyer(ev, 'haut'); cacherFil();
        }}
        onPointerCancel={(ev) => {
          const d = doigt.current;
          if (ev.pointerType === 'mouse' || !d || ev.pointerId !== d.id) return;
          doigt.current = null; envoyer(ev, 'annule'); cacherFil();
        }}
        onContextMenu={(ev) => ev.preventDefault()}
      />
      <div ref={fil} className="rv-fil" aria-hidden />
      <div ref={tete} className="rv-fil-tete" aria-hidden />
    </>
  );
}

// ---------------------------------------------------------------------------
// LES JAUGES : la force, le geste
// ---------------------------------------------------------------------------

function JaugeForce({ p, utile, aide, charge }: { p: number; utile?: number; aide: boolean; charge?: boolean }) {
  const v = borner(p, 0, 1);
  return (
    <div className="rv-force" data-charge={charge ? 'oui' : undefined} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={t('rv.force')}>
      <span className="rv-force-nom"><Icone nom="pied" taille={14} /> {t('rv.force')}</span>
      <span className="rv-force-piste">
        <i style={{ width: `${v * 100}%` }} />
        {aide && utile !== undefined && utile > 0 && utile <= 1 && <u style={{ left: `${utile * 100}%` }} aria-hidden />}
      </span>
      <b>{Math.round(v * 100)} %</b>
    </div>
  );
}

function JaugeGeste({ g }: { g: number }) {
  const net = g >= 0.85;
  return (
    <div className="rv-geste" data-net={net ? 'oui' : undefined} aria-label={t('rv.geste')}>
      <span>{t(net ? 'rv.geste.net' : 'rv.geste')}</span>
      <i><b style={{ width: `${borner(g, 0, 1) * 100}%` }} /></i>
    </div>
  );
}

// ---------------------------------------------------------------------------
// L'EN-TÊTE COMMUN : le titre, la situation, le chrono — dans la barre du bas, jamais sur le tableau de score
// ---------------------------------------------------------------------------

function Entete({ icone, titre, sous, reste, delai, children }: {
  icone: NomIcone; titre: string; sous?: string; reste: number | null; delai: number; children?: ReactNode;
}) {
  return (
    <header className="rv-entete">
      <b><Icone nom={icone} taille={16} /> {titre}</b>
      {sous && <span className="rv-sous">{sous}</span>}
      {children}
      <Chrono reste={reste} delai={delai} />
    </header>
  );
}

// ---------------------------------------------------------------------------
// LE TIR : le vent, la distance, les poteaux vus de face
// ---------------------------------------------------------------------------

/** La demi-largeur affichée du plan des poteaux (m) : la visée va de −COTE à +COTE. */
const COTE_AFFICHE = 7;

function PanneauTir({ pilotage, snap, prefs }: { pilotage: PilotageDirect; snap: SnapPilotage; prefs: PreferencesControle }) {
  const r = snap.resp, a = r.tir, v = r.visee;
  if (!a || !v) return null;
  const manette = snap.appareil === 'manette';
  const vent = Math.hypot(a.ventDos, a.ventTravers);
  // Le vent à l'écran : « vers le haut » = vers les poteaux (vent dans le dos), « à droite » = vers la droite de l'écran.
  const angle = Math.atan2(a.ventTravers * r.sens, a.ventDos) * 180 / Math.PI;
  const x = borner(v.x, -1, 1);
  const titre = t(a.valeur === 2 ? 'rv.tir.transformation' : 'rv.tir.penalite');
  return (
    <>
      {/* Les poteaux, vus de face : le repère de visée glisse le long de la barre. */}
      <div className="rv-poteaux" aria-hidden>
        <svg viewBox="0 0 200 124" width="100%" height="100%">
          <line className="rv-sol" x1="6" y1="112" x2="194" y2="112" />
          {/* Les montants : ±2,8 m sur une échelle de 92 px / 7 m. */}
          <line className="rv-montant" x1={100 - 2.8 * (92 / COTE_AFFICHE)} y1="22" x2={100 - 2.8 * (92 / COTE_AFFICHE)} y2="112" />
          <line className="rv-montant" x1={100 + 2.8 * (92 / COTE_AFFICHE)} y1="22" x2={100 + 2.8 * (92 / COTE_AFFICHE)} y2="112" />
          <line className="rv-barre" x1={100 - 2.8 * (92 / COTE_AFFICHE)} y1="72" x2={100 + 2.8 * (92 / COTE_AFFICHE)} y2="72" />
          <line className="rv-axe" x1="100" y1="76" x2="100" y2="112" />
          <g transform={`translate(${100 + x * 92} 52)`}>
            <circle className="rv-viseur" r="8.5" />
            <path className="rv-viseur-croix" d="M-13 0h7M6 0h7M0 -13v7M0 6v7" />
          </g>
          {Math.abs(v.effet) > 0.15 && (
            <path className="rv-effet" d={`M100 108Q${100 + x * 46 + v.effet * 26} 82 ${100 + x * 92} 60`} />
          )}
        </svg>
      </div>

      <section className="rv-barre-bas" aria-label={titre}>
        <Entete
          icone="poteaux" titre={titre} reste={r.reste} delai={r.delai}
          sous={a.aide ? `${t('rv.tir.distance', { distance: a.distance })} · ${t('rv.tir.chance', { chance: a.chance })}` : t('rv.tir.distance', { distance: a.distance })}
        >
          <span className="rv-vent" title={t('rv.tir.vent', { v: vent.toFixed(0) })}>
            <Icone nom="vent" taille={15} />
            <span className="rv-vent-fleche" style={{ transform: `rotate(${angle}deg)`, opacity: vent < 0.8 ? 0.28 : 1 }} aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 20V5M6.5 10.5 12 5l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <b>{vent < 0.8 ? t('rv.tir.ventNul') : t('rv.tir.vent', { v: vent.toFixed(0) })}</b>
          </span>
        </Entete>
        <JaugeForce p={v.p} utile={a.utile} aide={a.aide} charge={manette && v.arme} />
        <JaugeGeste g={v.geste} />
        <button type="button" className="btn vert rv-frapper" onClick={() => pilotage.resp.demander({ t: 'valider' })}>
          <Icone nom="pied" taille={18} /> {t('rv.tir.frapper')}
        </button>
        <Aide cle="rv.tir.aide" snap={snap} prefs={prefs} />
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// L'ENGAGEMENT : où tombe le coup d'envoi — vu d'en haut
// ---------------------------------------------------------------------------

function PanneauEngagement({ pilotage, snap, prefs }: { pilotage: PilotageDirect; snap: SnapPilotage; prefs: PreferencesControle }) {
  const r = snap.resp, e = r.engagement, v = r.visee;
  if (!e || !v) return null;
  const manette = snap.appareil === 'manette';
  const paliers: { h: number; cle: string }[] = [{ h: 0.2, cle: 'tendu' }, { h: 0.6, cle: 'moyen' }, { h: 1, cle: 'chandelle' }];
  const actuel = paliers.reduce((m, p) => (Math.abs(p.h - e.hauteur) < Math.abs(m.h - e.hauteur) ? p : m), paliers[0]);
  // Vue d'en haut : le demi-terrain adverse, 52 m de long sur 70 m de large.
  const W = 210, H = 150;
  const px = 10 + (v.x * 0.5 + 0.5) * (W - 20);
  const py = H - 12 - (e.distance / 52) * (H - 30);
  return (
    <>
      <div className="rv-terrain" aria-hidden>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          <rect className="rv-pelouse" x="4" y="4" width={W - 8} height={H - 8} rx="6" />
          <line className="rv-ligne" x1="4" y1={H - 12} x2={W - 4} y2={H - 12} />
          <line className="rv-ligne rv-ligne-fine" x1="4" y1={H - 12 - (10 / 52) * (H - 30)} x2={W - 4} y2={H - 12 - (10 / 52) * (H - 30)} />
          <line className="rv-ligne rv-ligne-fine" x1="4" y1={H - 12 - (40 / 52) * (H - 30)} x2={W - 4} y2={H - 12 - (40 / 52) * (H - 30)} />
          <circle className="rv-botteur" cx={W / 2} cy={H - 12} r="4" />
          <path className="rv-trajet" d={`M${W / 2} ${H - 14}Q${(W / 2 + px) / 2} ${(H + py) / 2 - 18 - e.hauteur * 20} ${px} ${py}`} />
          <g transform={`translate(${px} ${py})`}>
            <circle className="rv-viseur" r="8" />
            <path className="rv-viseur-croix" d="M-12 0h6M6 0h6M0 -12v6M0 6v6" />
          </g>
        </svg>
      </div>

      <section className="rv-barre-bas" aria-label={t('rv.eng.titre')}>
        <Entete
          icone="engagement" titre={t('rv.eng.titre')} reste={r.reste} delai={r.delai}
          sous={`${t('rv.eng.distance', { distance: e.distance })} · ${t(`rv.eng.h.${actuel.cle}`)}`}
        />
        <JaugeForce p={v.p} aide={false} charge={manette && v.arme} />
        <div className="rv-hauteurs" role="group" aria-label={t('rv.eng.hauteur')}>
          {paliers.map((p, i) => (
            <button key={p.cle} type="button" data-actif={p.cle === actuel.cle ? 'oui' : undefined} onClick={() => pilotage.resp.demander({ t: 'hauteur', h: p.h })}>
              {snap.appareil === 'clavier' && <kbd className="cd-touche">{i + 1}</kbd>}
              {t(`rv.eng.h.${p.cle}`)}
            </button>
          ))}
        </div>
        <button type="button" className="btn vert rv-frapper" onClick={() => pilotage.resp.demander({ t: 'valider' })}>
          <Icone nom="engagement" taille={18} /> {t('rv.eng.frapper')}
        </button>
        <Aide cle="rv.eng.aide" snap={snap} prefs={prefs} />
        {manette && <p className="rv-aide rv-aide-petit">{t('rv.eng.h.manette', { lb: LIBELLES_MANETTE[snap.manette].lb, rb: LIBELLES_MANETTE[snap.manette].rb })}</p>}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// LA TOUCHE : l'annonce, puis le lancer — une seule carte, en bas
// ---------------------------------------------------------------------------

function PanneauTouche({ pilotage, snap, prefs }: { pilotage: PilotageDirect; snap: SnapPilotage; prefs: PreferencesControle }) {
  const r = snap.resp, d = r.touche, v = r.visee;
  if (!d) return null;
  const manette = snap.appareil === 'manette';
  const tous: CombinaisonTouche[] = ['avant', 'milieu', 'fond', 'maul', 'leurreAvant', 'leurreMilieu', 'sortieRapide'];
  const choix = d.choix ?? d.annoncee;
  return (
    <section className="rv-carte rv-touche" role="dialog" aria-label={t('rv.tch.titre')}>
      <Entete icone="lanceur" titre={t(d.pret ? 'rv.tch.lancer' : 'rv.tch.annonce')} sous={d.pret ? undefined : t('rv.tch.attente')} reste={r.reste} delai={r.delai} />
      <div className="rv-combos" role="group" aria-label={t('rv.tch.titre')}>
        {tous.map((c, i) => {
          const dispo = d.combinaisons.includes(c);
          return (
            <button
              key={c} type="button" disabled={!dispo}
              data-actif={choix === c ? 'oui' : undefined} data-annoncee={d.annoncee === c && !d.choix ? 'oui' : undefined}
              onClick={() => pilotage.resp.demander({ t: 'combinaison', choix: c })}
            >
              <Icone nom={ICONES_TOUCHE[c]} taille={20} />
              <span>{t(`rv.touche.${c}`)}</span>
              {snap.appareil === 'clavier' && <kbd className="cd-touche">{i + 1}</kbd>}
            </button>
          );
        })}
      </div>
      {d.rapide && (
        <button
          type="button" className="rv-rapide" disabled={!d.rapide.possible} title={d.rapide.possible ? undefined : t('rv.tch.rapide.impossible')}
          onClick={() => pilotage.resp.demander({ t: 'rapide' })}
        >
          <Icone nom="eclair" taille={16} /> {t('rv.tch.rapide')}
          {snap.appareil === 'clavier' && <kbd className="cd-touche">T</kbd>}
          {manette && <Bouton b="y" type={snap.manette} />}
        </button>
      )}
      {manette && !d.pret && <p className="rv-aide rv-aide-petit">{t('rv.tch.manette.croix', { a: LIBELLES_MANETTE[snap.manette].a })}</p>}
      {d.pret && v && (
        <div className="rv-lancer">
          <JaugeForce p={v.p} aide={false} charge={manette && v.arme} />
          <JaugeGeste g={v.geste} />
          <button type="button" className="btn vert rv-frapper" onClick={() => pilotage.resp.demander({ t: 'valider' })}>
            <Icone nom="lanceur" taille={18} /> {t('rv.tch.lancer')}
          </button>
          <Aide cle="rv.tch.aide" snap={snap} prefs={prefs} />
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// LE TUTORIEL : une carte, la première fois — le match est figé derrière
// ---------------------------------------------------------------------------

function CarteTuto({ pilotage, snap, prefs }: { pilotage: PilotageDirect; snap: SnapPilotage; prefs: PreferencesControle }) {
  const id = snap.resp.tuto!;
  const icone: NomIcone = id === 'penalite' ? 'brassard' : id === 'tir' ? 'poteaux' : id === 'engagement' ? 'engagement' : id === 'touche' ? 'lanceur' : 'drop';
  const a = snap.appareil;
  const v = {
    action: libelleDeTouche(prefs.touches.action[0]),
    gauche: libelleDeTouche(prefs.touches.gauche[0]),
    droite: libelleDeTouche(prefs.touches.droite[0]),
    haut: libelleDeTouche(prefs.touches.haut[0]),
    bas: libelleDeTouche(prefs.touches.bas[0]),
    valider: LIBELLES_MANETTE[snap.manette].a,
    charge: snap.resp.modeManette === 'charge' ? LIBELLES_MANETTE[snap.manette].a : LIBELLES_MANETTE[snap.manette].rt,
    drop: libelleDeTouche(prefs.touches.drop[0]),
    lb: LIBELLES_MANETTE[snap.manette].lb,
    b: LIBELLES_MANETTE[snap.manette].b,
  };
  return (
    <div className="cd-tuto-voile rv-tuto" role="dialog" aria-modal="true" aria-label={t(`rv.tuto.${id}.titre`)}>
      <div className="cd-tuto-carte">
        <b className="cd-tuto-titre"><Icone nom={icone} taille={18} /> {t(`rv.tuto.${id}.titre`)}</b>
        <p>{t(`rv.tuto.${id}.texte`)}</p>
        <ul>
          <li><Icone nom={a === 'tactile' ? 'joueur' : a === 'manette' ? 'manette' : 'clavier'} taille={15} /> {t(`rv.tuto.${id}.${a}`, v)}</li>
          <li><Icone nom="chrono" taille={15} /> {t(`rv.tuto.${id}.chrono`)}</li>
        </ul>
        <div className="cd-tuto-actions">
          <button type="button" className="btn vert" autoFocus onClick={() => pilotage.resp.demander({ t: 'compris' })}>
            {t('rv.tuto.compris')}
          </button>
        </div>
      </div>
    </div>
  );
}

