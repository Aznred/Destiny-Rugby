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
// ⚠️ LA VISÉE EST DESSINÉE SANS RÉVÉLER LE RÉSULTAT : le vent, la distance, une marque de force utile (à couper dans les
// réglages). Jamais où le ballon tomberait, ni s'il passe.
//
// ⚠️ UN TIR, C'EST UN GESTE — PAS UN TABLEAU DE BORD (Correctif 39). Demande : « supprimer les grosses jauges et interfaces qui
// cassent l'immersion ; le terrain et l'animation doivent rester au centre ». Transformation, pénalité et coup d'envoi n'ont
// plus ni poteaux dessinés, ni terrain vu d'en haut, ni jauges, ni bouton « Frapper » : on pose le doigt (ou on clique), on
// glisse vers là où l'on vise, on relâche. Il reste une pastille en bas de l'image — ce qu'on tape, la distance, le vent, le
// temps qu'il reste — et, le temps du geste, un trait fin pour la force. La touche garde sa carte : on y CHOISIT une annonce.

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

/** Le nom d'un bouton dans une phrase : la lettre d'une Xbox, la forme d'une PlayStation (□, pas le mot « carre »). */
const FORMES_PLAYSTATION: Record<string, string> = { croix: '✕', rond: '○', carre: '□', triangle: '△' };
function nomDuBouton(type: TypeManette, b: NomBouton): string {
  const libelle = LIBELLES_MANETTE[type][b];
  return FORMES_PLAYSTATION[libelle] ?? libelle;
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
    valider: nomDuBouton(snap.manette, 'a'),
    charge: nomDuBouton(snap.manette, 'x'),
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
      {r.panneau === 'tir' && !r.tuto && <RepereDeTir snap={snap} prefs={prefs} />}
      {r.panneau === 'engagement' && !r.tuto && <RepereDEngagement snap={snap} prefs={prefs} />}
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
// LE GESTE : poser, glisser, relâcher — un seul calque, sous les repères
// ---------------------------------------------------------------------------

/** Balayage de référence pour une force pleine (voir `REGLAGES_VISEE.longueurPleine`), sur un cadre de 390 px. */
const LONGUEUR_PLEINE = 190;

/**
 * ⚠️ LA SOURIS ET LE DOIGT TRACENT LE MÊME BALAYAGE. Bouton tenu ou doigt posé, on glisse, on relâche : le pilote reçoit les
 * mêmes évènements (`bas`, `bouge`, `haut`) et les lit par la même loi. Le fil qu'on voit part de là où le geste a commencé ;
 * l'anneau à son bout se remplit avec la longueur — c'est toute l'indication de force.
 */
function ZoneVisee({ pilotage }: { pilotage: PilotageDirect }) {
  const zone = useRef<HTMLDivElement>(null);
  const fil = useRef<HTMLDivElement>(null);
  const tete = useRef<HTMLDivElement>(null);
  const geste = useRef<{ id: number; x0: number; y0: number } | null>(null);

  const envoyer = (ev: { clientX: number; clientY: number; pointerType?: string }, type: 'bas' | 'bouge' | 'haut' | 'annule') => {
    const z = zone.current;
    if (!z) return;
    const r = z.getBoundingClientRect();
    pilotage.resp.pointeur({
      type, x: ev.clientX - r.left, y: ev.clientY - r.top, w: r.width, h: r.height,
      pointeur: ev.pointerType === 'mouse' ? 'souris' : 'doigt',
    });
  };
  const cacherFil = () => { if (fil.current) delete fil.current.dataset.actif; if (tete.current) delete tete.current.dataset.actif; };
  const finir = (ev: { clientX: number; clientY: number; pointerType?: string; pointerId: number }, type: 'haut' | 'annule') => {
    const g = geste.current;
    if (!g || ev.pointerId !== g.id) return;
    geste.current = null;
    envoyer(ev, type);
    cacherFil();
  };

  return (
    <>
      <div
        ref={zone}
        className="rv-zone"
        onPointerDown={(ev) => {
          // Un seul geste à la fois ; à la souris, seul le bouton principal trace.
          if (geste.current || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
          try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur disparu */ }
          const r = ev.currentTarget.getBoundingClientRect();
          geste.current = { id: ev.pointerId, x0: ev.clientX - r.left, y0: ev.clientY - r.top };
          envoyer(ev, 'bas');
          if (ev.pointerType !== 'mouse') pilotage.tactile.actif = performance.now();
        }}
        onPointerMove={(ev) => {
          const g = geste.current;
          if (!g || ev.pointerId !== g.id) return;
          envoyer(ev, 'bouge');
          const r = ev.currentTarget.getBoundingClientRect();
          const px = ev.clientX - r.left - g.x0, py = ev.clientY - r.top - g.y0, L = Math.hypot(px, py);
          if (!fil.current || !tete.current) return;
          if (L <= 10) { cacherFil(); return; }
          fil.current.dataset.actif = '1'; tete.current.dataset.actif = '1';
          fil.current.style.left = `${g.x0}px`; fil.current.style.top = `${g.y0}px`;
          fil.current.style.width = `${L}px`; fil.current.style.transform = `rotate(${Math.atan2(py, px)}rad)`;
          tete.current.style.left = `${g.x0 + px}px`; tete.current.style.top = `${g.y0 + py}px`;
          // La même échelle que le pilote : un geste de même longueur donne la même force sur tout écran.
          const echelle = borner(r.width, 320, 520) / 390;
          tete.current.style.setProperty('--rv-p', String(borner(L / (LONGUEUR_PLEINE * echelle), 0, 1)));
        }}
        onPointerUp={(ev) => finir(ev, 'haut')}
        onPointerCancel={(ev) => finir(ev, 'annule')}
        onLostPointerCapture={(ev) => finir(ev, 'annule')}
        onContextMenu={(ev) => ev.preventDefault()}
      />
      <div ref={fil} className="rv-fil" aria-hidden />
      <div ref={tete} className="rv-fil-tete" aria-hidden />
    </>
  );
}

// ---------------------------------------------------------------------------
// LES JAUGES DE LA TOUCHE : la force, le geste (les tirs n'en ont plus)
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
// L'EN-TÊTE DE LA TOUCHE : le titre, la situation, le chrono
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
// LE TIR ET LE COUP D'ENVOI : une pastille, un trait — le terrain reste au centre
// ---------------------------------------------------------------------------

/** Le vent, vu par le buteur : « vers le haut » = vers les poteaux, « à droite » = vers la droite de l'écran. */
function Vent({ dos, travers, sens }: { dos: number; travers: number; sens: 1 | -1 }) {
  const vent = Math.hypot(dos, travers);
  const angle = Math.atan2(travers * sens, dos) * 180 / Math.PI;
  return (
    <span className="rv-vent" title={t('rv.tir.vent', { v: vent.toFixed(0) })}>
      <span className="rv-vent-fleche" style={{ transform: `rotate(${angle}deg)`, opacity: vent < 0.8 ? 0.28 : 1 }} aria-hidden>
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 20V5M6.5 10.5 12 5l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <b>{vent < 0.8 ? t('rv.tir.ventNul') : t('rv.tir.vent', { v: vent.toFixed(0) })}</b>
    </span>
  );
}

/**
 * Le trait de force : il n'apparaît que le temps où la force se dose (un balayage en cours, le bouton tenu, les flèches).
 * `utile` : la force qui suffit juste à passer la barre — un cran fin, à couper dans les réglages.
 */
function TraitDeForce({ p, utile }: { p: number; utile?: number }) {
  return (
    <span className="rv-trait" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(borner(p, 0, 1) * 100)} aria-label={t('rv.force')}>
      <i style={{ transform: `scaleX(${borner(p, 0, 1)})` }} />
      {utile !== undefined && utile > 0 && utile <= 1 && <u style={{ left: `${utile * 100}%` }} aria-hidden />}
    </span>
  );
}

/** La force se dose-t-elle en ce moment ? Au balayage, seulement pendant le geste ; au clavier et à la manette, tout le temps. */
function doseEnCours(snap: SnapPilotage): boolean {
  const v = snap.resp.visee;
  return !!v && (v.arme || v.source === 'clavier' || v.source === 'manette' || snap.appareil === 'manette');
}

function RepereDeTir({ snap, prefs }: { snap: SnapPilotage; prefs: PreferencesControle }) {
  const r = snap.resp, a = r.tir, v = r.visee;
  if (!a || !v) return null;
  const titre = t(a.valeur === 2 ? 'rv.tir.transformation' : 'rv.tir.penalite');
  return (
    <section className="rv-repere" aria-label={titre}>
      <div className="rv-repere-ligne">
        <b><Icone nom="poteaux" taille={15} /> {titre}</b>
        <span className="rv-repere-info">{t('rv.tir.distance', { distance: a.distance })}{a.aide ? ` · ${t('rv.tir.chance', { chance: a.chance })}` : ''}</span>
        <Vent dos={a.ventDos} travers={a.ventTravers} sens={r.sens} />
        <Chrono reste={r.reste} delai={r.delai} />
      </div>
      {doseEnCours(snap) ? <TraitDeForce p={v.p} utile={a.aide ? a.utile : undefined} /> : <Aide cle="rv.tir.aide" snap={snap} prefs={prefs} />}
    </section>
  );
}

function RepereDEngagement({ snap, prefs }: { snap: SnapPilotage; prefs: PreferencesControle }) {
  const r = snap.resp, e = r.engagement, v = r.visee;
  if (!e || !v) return null;
  const hauteur = e.hauteur < 0.34 ? 'tendu' : e.hauteur < 0.75 ? 'moyen' : 'chandelle';
  const dose = doseEnCours(snap);
  return (
    <section className="rv-repere" aria-label={t('rv.eng.titre')}>
      <div className="rv-repere-ligne">
        <b><Icone nom="engagement" taille={15} /> {t('rv.eng.titre')}</b>
        {/* Ce que le geste dessine, pendant qu'on le fait : la longueur visée et la hauteur du ballon. */}
        {dose && <span className="rv-repere-info">{t('rv.eng.distance', { distance: e.distance })} · {t(`rv.eng.h.${hauteur}`)}</span>}
        <Chrono reste={r.reste} delai={r.delai} />
      </div>
      {dose ? <TraitDeForce p={v.p} /> : <Aide cle="rv.eng.aide" snap={snap} prefs={prefs} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// LA TOUCHE : l'annonce, puis le lancer — une seule carte, en bas
// ---------------------------------------------------------------------------

function PanneauTouche({ pilotage, snap, prefs }: { pilotage: PilotageDirect; snap: SnapPilotage; prefs: PreferencesControle }) {
  const r = snap.resp, d = r.touche, v = r.visee;
  if (!d || d.lance) return null;
  const manette = snap.appareil === 'manette';
  const tous: CombinaisonTouche[] = ['avant', 'milieu', 'fond', 'maul', 'leurreAvant', 'leurreMilieu', 'sortieRapide'];
  const choix = d.choix ?? d.annoncee;
  return (
    <>
    {/* Les trois groupes de sauteurs, sur la pelouse : on touche celui où l'on veut envoyer le ballon. */}
    {d.cibles.map((c) => (
      <button
        key={c.choix} type="button" className="rv-cible" data-actif={choix === c.choix ? 'oui' : undefined}
        style={{ left: c.x, top: c.y }} disabled={!d.combinaisons.includes(c.choix)}
        onClick={() => pilotage.resp.demander({ t: 'combinaison', choix: c.choix })}
        aria-label={t(`rv.touche.${c.choix}`)}
      >
        {t(`rv.touche.${c.choix}`)}
      </button>
    ))}
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
    </>
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
    valider: nomDuBouton(snap.manette, 'a'),
    charge: nomDuBouton(snap.manette, 'x'),
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

