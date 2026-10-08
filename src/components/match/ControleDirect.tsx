// LE HUD DU CONTRÔLE DIRECT — ce que le joueur voit et touche pendant qu'il conduit son pion.
//
// Demande (Correctif 16) : « sur mobile, un joystick à gauche, des boutons contextuels à droite, des
// gestes de balayage pour les passes et les coups de pied ; sur PC, aucun bouton, juste le clavier ;
// à la manette, les bons symboles. » Un seul composant, trois habillages, et UN SEUL vocabulaire :
// chaque doigt, touche ou bouton de manette devient une `Intention` (voir `lib/controleDirect/pilotage.ts`).
//
// ⚠️ IL NE DÉCIDE D'AUCUNE RÈGLE. Un bouton « passe » dépose `{ type: 'passe' }` dans la file du pilote ;
// c'est le moteur qui sait si elle est jouable, à qui elle part, ce qu'elle risque. Ce fichier ne sait que
// montrer ce que la situation PERMET (`snap.possible`) et traduire un geste de pouce en intention.
//
// ⚠️ LES BOUTONS NE BOUGENT PAS QUAND UN AUTRE DISPARAÎT. Chaque geste a sa place dans l'arc — la
// roue de passe au creux du pouce, le sprint juste à côté — et l'ordre des autres ne dépend que du
// poste (un pilier a le raffut sous le pouce, un ailier le crochet). Un bouton qui change de place
// parce que la situation change, c'est un bouton qu'on rate.
//
// ⚠️ LES ÉLÉMENTS TACTILES SE MESURENT AU PIXEL : le joystick flottant, le glissé de coup de pied et le
// balayage se calculent depuis les événements du pointeur, SANS passer par l'état de React (soixante
// événements par seconde). Seul le cliché du pilote (`useSyncExternalStore`) réveille le rendu.
//
// ⚠️ SUR PC, RIEN À TOUCHER : les zones tactiles existent (un portable à écran tactile doit pouvoir passer
// au pouce), mais elles ignorent la souris et ne couvrent que le bas de l'image.

import {
  useCallback, useEffect, useRef, useState, useSyncExternalStore,
  type CSSProperties, type MutableRefObject, type PointerEvent as EvPointeur, type ReactNode, type RefObject,
} from 'react';
import { Icone, type NomIcone } from '../Icone';
import { t } from '../../lib/i18n';
import {
  SEUIL_MAINTIEN, intentionPiedTactile, type FamillePoste, type Intention, type PilotageDirect, type SnapPilotage,
} from '../../lib/controleDirect/pilotage';
import { ecrirePreferencesControle, lirePreferencesControle, usePreferencesControle, type PreferencesControle } from '../../lib/controleDirect/prefs';
import {
  DEFINITIONS_TOUCHES, libelleDeTouche, type ActionClavier, type TouchesDirectes,
} from '../../lib/controleDirect/touches';
import { LIBELLES_MANETTE, type NomBouton, type TypeManette } from '../../lib/controleDirect/manette';
import { Responsabilites } from './Responsabilites';
import './ControleDirect.css';

// ---------------------------------------------------------------------------
// OUTILS
// ---------------------------------------------------------------------------

const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Dépose une intention dans la file du pilote : c'est lui qui la lit à l'image suivante. */
function pousser(pilotage: PilotageDirect, intention: Intention): void {
  pilotage.tactile.file.push(intention);
  pilotage.tactile.actif = performance.now();
}

/** Les trois origines du sprint tactile : le bord du joystick, le bouton tenu, le bouton verrouillé. */
interface EtatSprint { bord: boolean; bouton: boolean; verrou: boolean }

function majSprint(pilotage: PilotageDirect, s: EtatSprint): void {
  pilotage.tactile.sprint = s.bord || s.bouton || s.verrou;
  pilotage.tactile.actif = performance.now();
}

/** Un appui bref sur un gros bouton : la pastille s'allume, une vibration confirme. */
function allumer(el: HTMLElement | null, valeur = '1'): void { if (el) el.dataset.presse = valeur; }
function eteindre(el: HTMLElement | null): void { if (el) delete el.dataset.presse; }

// ---------------------------------------------------------------------------
// LE COMPOSANT
// ---------------------------------------------------------------------------

export function ControleDirect({ pilotage, surReprendre, suspendu = false }: {
  pilotage: PilotageDirect; surReprendre: () => void;
  /**
   * L'écran pose sa propre question par-dessus (une bagarre attend un ordre) : le HUD se tait — ni commandes, ni
   * panneau de pause. Sans cela la pause que la bagarre déclenche ouvrait la liste des commandes PAR-DESSUS les ordres.
   */
  suspendu?: boolean;
}) {
  const snap = useSyncExternalStore(pilotage.abonner, pilotage.lire, pilotage.lire);
  const prefs = usePreferencesControle();
  const racine = useRef<HTMLDivElement>(null);
  const sprint = useRef<EtatSprint>({ bord: false, bouton: false, verrou: false });

  // La souris, facultative : on retient où elle pointe, dans le repère de la scène.
  useEffect(() => {
    if (!prefs.souris) { pilotage.souris = null; return; }
    const suivre = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') return;
      const r = racine.current?.getBoundingClientRect();
      if (!r) return;
      pilotage.souris = { x: ev.clientX - r.left, y: ev.clientY - r.top, t: performance.now(), h: r.height };
    };
    window.addEventListener('pointermove', suivre, { passive: true });
    return () => { window.removeEventListener('pointermove', suivre); pilotage.souris = null; };
  }, [pilotage, prefs.souris]);

  // Le sprint verrouillé s'éteint avec le souffle : le moteur ne le tiendrait plus, le bouton ne doit pas mentir.
  const essouffle = snap.reserve ? snap.reserve.essouffle : snap.endurance <= 2;
  useEffect(() => {
    if (essouffle && sprint.current.verrou) { sprint.current.verrou = false; majSprint(pilotage, sprint.current); }
  }, [essouffle, pilotage]);

  // Hors du jeu (banc, carton, fin de match), plus rien de tactile ne reste « tenu ».
  const enJeu = snap.phase === 'actif';
  useEffect(() => {
    if (enJeu) return;
    sprint.current = { bord: false, bouton: false, verrou: false };
    pilotage.tactile.stick = { x: 0, y: 0 };
    pilotage.tactile.sprint = false;
    pilotage.tactile.pied = null;
    pilotage.tactile.file.length = 0;
  }, [enJeu, pilotage]);

  if (snap.phase === 'attente') return null;

  const tactile = snap.appareil === 'tactile';
  /** Le jeu attend la réponse du joueur : les commandes de jeu s'éteignent. */
  const occupe = snap.resp.panneau !== null || suspendu;
  const pauseAffichee = snap.pause && snap.phase === 'actif' && !suspendu;
  const style = { '--cd-taille': prefs.tailleHud, '--cd-opa': prefs.opaciteHud } as CSSProperties;
  return (
    <div
      ref={racine}
      className="cd"
      data-visible={snap.visible ? 'oui' : 'non'}
      data-appareil={snap.appareil}
      data-joy={prefs.positionJoystick === 'droite' ? 'droite' : undefined}
      data-act={prefs.positionActions === 'gauche' ? 'gauche' : undefined}
      data-pause={snap.pause ? 'oui' : undefined}
      data-modale={pauseAffichee || snap.tuto?.carte || snap.resp.tuto ? 'oui' : undefined}
      style={style}
    >
      {snap.visible && <Souffle valeur={snap.endurance} sprint={snap.reserve} />}
      {snap.visible && <Situation snap={snap} />}
      {snap.visible && snap.libre && <Toast snap={snap} />}

      {/* Les zones tactiles : toujours posées (un portable tactile doit pouvoir passer au pouce), muettes pour la souris. */}
      {/* ⚠️ QUAND LE JEU ATTEND UNE RÉPONSE (capitaine, tir, engagement, touche), le joueur ne conduit plus : ni joystick, ni commandes. */}
      <Joystick pilotage={pilotage} prefs={prefs} sprint={sprint} actif={enJeu && !snap.pause && !occupe} />
      <Gestes pilotage={pilotage} actif={enJeu && !snap.pause && snap.libre && !occupe} />
      {/* La caméra à 360° (Correctif 23) : le haut de l'écran au doigt, la souris partout où rien ne se clique. */}
      <ZoneCamera pilotage={pilotage} actif={enJeu && !snap.pause && !occupe} sensibilite={prefs.sensibiliteCamera} />
      <OrbiteSouris pilotage={pilotage} actif={enJeu && !snap.pause && !occupe} sensibilite={prefs.sensibiliteCamera} racine={racine} sansGauche={prefs.souris} />

      {snap.visible && tactile && !snap.pause && !occupe && !snap.pack && (
        <Commandes pilotage={pilotage} snap={snap} sprint={sprint} />
      )}
      {/* Le ballon hors du cadre (Correctif 33) : une flèche au bord de l'écran dit où le chercher, et qui le porte. */}
      {snap.visible && enJeu && !snap.pause && !occupe && <RepereBallon pilotage={pilotage} />}
      {/* Le geste dans un pack (Correctif 23) : mêlée, maul, saut, lift, grattage — une piste de temps et un gros bouton. */}
      {snap.visible && enJeu && !snap.pause && !occupe && snap.pack && <Rythme pilotage={pilotage} snap={snap} tactile={tactile} />}
      {/* Les responsabilités : les panneaux de décision, de tir, d'engagement et de touche — et leurs cartes d'explication. */}
      {snap.visible && enJeu && !snap.pause && <Responsabilites pilotage={pilotage} snap={snap} prefs={prefs} />}
      {/* L'étape « déplace-toi » du tutoriel : un anneau pulse là où le pouce doit se poser. */}
      {snap.visible && tactile && !snap.pause && snap.tuto?.visible && snap.tuto.etape === 'deplacer' && (
        <div className="cd-guide-stick" aria-hidden />
      )}
      {snap.visible && !tactile && prefs.indications && !snap.pause && !occupe && (
        <Indications snap={snap} touches={prefs.touches} />
      )}

      {snap.visible && tactile && snap.aPoste && (
        <button
          type="button"
          className="cd-aide"
          aria-pressed={snap.aide}
          aria-label={t('cd.touche.aide')}
          title={t('cd.touche.aide')}
          onClick={(ev) => {
            pilotage.tactile.file.push({ type: 'aide' });
            pilotage.tactile.actif = performance.now();
            ev.currentTarget.blur();
          }}
        >
          <Icone nom="viseur" taille={18} />
        </button>
      )}

      {snap.tuto && <Tuto pilotage={pilotage} snap={snap} touches={prefs.touches} />}
      {snap.ctx && !snap.tuto && !snap.pause && (
        <div className="cd-tuto cd-tuto-ctx" role="status" key={snap.ctx.id} data-tuto="cd-contexte">
          <b>{t(`${snap.ctx.cle}.titre`)}</b>
          <p>{t(`${snap.ctx.cle}.texte`)}</p>
        </div>
      )}
      {pauseAffichee && (
        <PanneauPause snap={snap} touches={prefs.touches} surReprendre={surReprendre} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LE BALLON HORS DU CADRE
// ---------------------------------------------------------------------------

/**
 * « On sait toujours où se situe le porteur du ballon » (Correctif 33). La caméra assistée garde le ballon dans le cadre ;
 * quand il en sort quand même — le joueur a tourné la vue, la caméra est en mode libre, un coup de pied part dans son dos —
 * une flèche au bord de l'écran pointe vers lui, à la couleur de celui qui le porte (or : un coéquipier ; rouge : un
 * adversaire ; blanc : personne), avec son nom.
 *
 * ⚠️ ÉCRITE DANS LE DOM À CHAQUE IMAGE, comme la piste des temps d'un pack : elle suit la caméra, que React ne voit pas bouger.
 */
function RepereBallon({ pilotage }: { pilotage: PilotageDirect }) {
  const pastille = useRef<HTMLDivElement>(null);
  const fleche = useRef<HTMLSpanElement>(null);
  const nom = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let id = 0;
    const boucle = () => {
      const el = pastille.current, r = pilotage.repereBallon;
      const cadre = el?.parentElement;
      if (el && cadre) {
        if (!r) el.dataset.visible = 'non';
        else {
          // Le point du bord visé : on part du centre et on s'arrête avant le score (haut) et les commandes (bas).
          const demiL = Math.max(40, cadre.clientWidth / 2 - 54), demiH = Math.max(40, cadre.clientHeight / 2 - 104);
          const k = Math.min(demiL / Math.max(0.001, Math.abs(r.dx)), demiH / Math.max(0.001, Math.abs(r.dy)));
          el.style.transform = `translate(${cadre.clientWidth / 2 + r.dx * k}px, ${cadre.clientHeight / 2 + r.dy * k}px) translate(-50%, -50%)`;
          el.dataset.visible = 'oui';
          el.dataset.camp = r.camp;
          // Le chevron pointe vers le bas au repos.
          if (fleche.current) fleche.current.style.transform = `rotate(${Math.atan2(r.dy, r.dx) - Math.PI / 2}rad)`;
          if (nom.current && nom.current.textContent !== (r.nom ?? '')) nom.current.textContent = r.nom ?? '';
        }
      }
      id = requestAnimationFrame(boucle);
    };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
  }, [pilotage]);
  return (
    <div ref={pastille} className="cd-ballon" data-visible="non" aria-hidden>
      <span ref={fleche} className="cd-ballon-fleche"><Icone nom="chevron" taille={15} /></span>
      <Icone nom="ballon" taille={15} />
      <span ref={nom} className="cd-ballon-nom" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// LE SOUFFLE ET LES PASTILLES
// ---------------------------------------------------------------------------

/** L'endurance : une jauge qui se lit du coin de l'œil, et qui vire à l'orange avant qu'on soit à plat. */
function Souffle({ valeur, sprint }: { valeur: number; sprint: SnapPilotage['reserve'] }) {
  // Deux réserves : l'endurance générale (fine, lente) et la barre de sprint (franche, qui se vide et se recharge).
  if (sprint) {
    // ⚠️ LA BARRE DIT SON NIVEAU PAR SA COULEUR (Correctif 25). Verte au-dessus de 60 %, elle vire à l'ambre puis au rouge
    // sous 30 % — en dégradé continu, pas par paliers : on lit la tendance sans regarder le chiffre. Elle se mesure à ce
    // qu'on PEUT encore sprinter (son plafond du moment), pas à cent : un joueur fatigué dont la réserve est pleine reste
    // au vert, et c'est le repère du plafond, plus à gauche, qui dit la fatigue du match.
    const plafond = Math.max(1, borner(sprint.max, 0, 100));
    const niveau = borner(sprint.valeur / plafond, 0, 1);
    const teinte = Math.round(borner((niveau - 0.14) / 0.5, 0, 1) * 132);
    const palier = sprint.essouffle || niveau < 0.3 ? 'alerte' : niveau < 0.6 ? 'moyen' : 'bon';
    return (
      <div className="cd-souffle" data-deux="oui" data-palier={palier} data-essouffle={sprint.essouffle ? 'oui' : undefined}
        style={{ ['--cd-teinte' as string]: String(teinte) }}
        title={`${t('cd.sprint')} ${sprint.valeur} % · ${t('cd.souffle.plafond')} ${Math.round(plafond)} % · ${t('cd.souffle')} ${valeur} %`}
        aria-label={`${t('cd.sprint')} ${sprint.valeur} %, ${t('cd.souffle.plafond')} ${Math.round(plafond)} %, ${t('cd.souffle')} ${valeur} %`}>
        <Icone nom="eclair" taille={15} />
        <span className="cd-souffle-barres">
          <span className="cd-souffle-sprint" style={{ ['--cd-max' as string]: `${plafond}%` }}>
            <i style={{ width: `${borner(sprint.valeur, 0, 100)}%` }} />
            {plafond < 97 && <b className="cd-souffle-plafond" aria-hidden />}
          </span>
          <span className="cd-souffle-fond" title={t('cd.souffle')}><i style={{ width: `${borner(valeur, 0, 100)}%` }} /></span>
        </span>
        <span className="cd-souffle-chiffre" aria-hidden>{Math.round(sprint.valeur)}</span>
      </div>
    );
  }
  return (
    <div className="cd-souffle" data-bas={valeur < 30 ? 'oui' : undefined} title={t('cd.souffle')} aria-label={`${t('cd.souffle')} ${valeur} %`}>
      <Icone nom="batterie" taille={14} />
      <span><i style={{ width: `${borner(valeur, 0, 100)}%` }} /></span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LE RYTHME : le geste du joueur dans un pack (Correctif 23)
// ---------------------------------------------------------------------------

/** Secondes visibles devant le repère : un temps met ce délai à traverser la piste. */
const HORIZON_RYTHME = 1.7;
const COULEURS_Q = ['#ff6b57', '#ffd257', '#7ee08f'];

/**
 * LA PISTE DE TEMPS. Les temps du pack arrivent de la droite vers un repère ; on appuie quand ils le touchent. Un appui juste
 * pousse le pack, un temps manqué le fait traîner. Un seul bouton pour trois appareils : la barre d'espace, A, ou le doigt.
 * ⚠️ Le HUD ne juge rien : il dessine ce que le moteur a décidé (`snap.pack`), et fait avancer les temps entre deux clichés.
 */
function Rythme({ pilotage, snap, tactile }: { pilotage: PilotageDirect; snap: SnapPilotage; tactile: boolean }) {
  const p = snap.pack!;
  const piste = useRef<HTMLDivElement>(null);
  const boutonRef = useRef<HTMLButtonElement>(null);
  /**
   * ⚠️ LA BOUCLE D'AFFICHAGE LIT ICI, PAS DANS L'ÉTAT DE REACT (Correctif 24). La piste était redessinée par React à chaque
   * image et datée par un cliché pris dix fois par seconde sur une horloge à pas de 0,15 s : elle tressautait, et le
   * verdict d'un appui attendait le pas suivant du moteur puis le cliché d'après — un quart de seconde. Désormais :
   *   · la position des temps est écrite directement dans le DOM, à chaque image, depuis l'heure exacte du moteur ;
   *   · la cadence du match (pause, ×2…) se mesure entre deux clichés, les temps avancent donc comme dans le moteur ;
   *   · l'appui est jugé ICI, tout de suite, avec les fenêtres du joueur — le moteur confirmera, il lit le même instant.
   */
  const vif = useRef({ p, cadence: 1, locaux: new Map<number, 0 | 1 | 2>() });
  const precedent = useRef<{ sim: number; recuA: number } | null>(null);
  if (precedent.current && p.recuA !== precedent.current.recuA) {
    const reel = (p.recuA - precedent.current.recuA) / 1000;
    if (reel > 0.03) vif.current.cadence = borner((p.sim - precedent.current.sim) / reel, 0, 12);
  }
  if (!precedent.current || p.recuA !== precedent.current.recuA) precedent.current = { sim: p.sim, recuA: p.recuA };
  vif.current.p = p;
  /** Un temps garde son identité d'un cliché à l'autre par son instant dans le moteur. */
  const cleDe = (dans: number, ref: SnapPilotage['pack'] & object) => Math.round((ref.sim + dans) * 12);
  const [verdict, setVerdict] = useState<{ q: 0 | 1 | 2; n: number } | null>(null);

  useEffect(() => {
    let id = 0;
    const boucle = () => {
      const { p: courant, cadence } = vif.current;
      const ecoule = ((performance.now() - courant.recuA) / 1000) * cadence;
      const noeuds = piste.current?.querySelectorAll<HTMLElement>('.cd-rythme-temps');
      noeuds?.forEach((noeud, i) => {
        const b = courant.temps[i];
        const dans = b ? b.dans - ecoule : 99;
        const visible = !!b && dans <= HORIZON_RYTHME && dans >= -0.5;
        noeud.style.visibility = visible ? 'visible' : 'hidden';
        if (visible) noeud.style.left = `${14 + (dans / HORIZON_RYTHME) * 86}%`;
      });
      id = requestAnimationFrame(boucle);
    };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
  }, []);

  const touche = p.type === 'touche';
  const appuyer = () => {
    const { p: courant, cadence, locaux } = vif.current;
    const ecoule = ((performance.now() - courant.recuA) / 1000) * cadence;
    // Le temps encore à jouer le plus proche de l'instant de l'appui.
    let ecart = Infinity, cle = -1;
    for (const b of courant.temps) {
      const k = cleDe(b.dans, courant);
      if (b.q !== null || locaux.has(k)) continue;
      const d = Math.abs(b.dans - ecoule);
      if (d < ecart) { ecart = d; cle = k; }
    }
    const q: 0 | 1 | 2 = cle < 0 ? 0 : ecart <= courant.fenetres.parfait ? 2 : ecart <= courant.fenetres.correct ? 1 : 0;
    // Hors temps, le moteur ne « consomme » pas le temps suivant (sauf au ruck, où le premier appui engage) : nous non plus.
    if (cle >= 0 && (q > 0 || courant.type === 'ruck')) { locaux.set(cle, q); if (locaux.size > 24) locaux.delete(locaux.keys().next().value!); }
    setVerdict({ q, n: performance.now() });
    const b = boutonRef.current;
    if (b) { b.dataset.frappe = String(q); window.setTimeout(() => { if (b.dataset.frappe === String(q)) delete b.dataset.frappe; }, 140); }
    pousser(pilotage, { type: 'action' });
    pilotage.vibrer(q === 2 ? 24 : 12);
  };
  const cle = `${p.type}${touche ? '.' + p.poste : ''}`;
  const bouton = p.type === 'ruck' ? t('cd.pack.bouton.ruck') : touche ? t(`cd.pack.bouton.${p.poste === 'lifteur' ? 'lifteur' : 'sauteur'}`) : t('cd.pack.bouton');
  const titre = p.type === 'melee' && p.poste === 'talonneur' ? t('cd.pack.titre.talonne') : t(`cd.pack.titre.${cle}`);
  const sorties = p.sorties;
  // L'explication reste jusqu'à ce que le joueur ait joué deux temps de ce geste, puis elle ne revient plus (mémoire de l'appareil).
  const aideVue = lirePreferencesControle().tutosContext.includes(`pack.${p.type}`);
  const jouesNb = p.temps.filter((b) => b.q !== null).length;
  useEffect(() => {
    if (!aideVue && jouesNb >= 2) ecrirePreferencesControle({ tutosContext: [...lirePreferencesControle().tutosContext, `pack.${p.type}`].slice(-16) });
  }, [aideVue, jouesNb, p.type]);
  // Le verdict du joueur d'abord (immédiat) ; celui du moteur ne sert plus qu'aux temps laissés passer.
  const local = verdict && performance.now() - verdict.n < 1000 ? verdict : null;
  const moteur = !local && p.derniere && p.derniere.depuis < 1.1 ? p.derniere : null;
  const montre = local ? { q: local.q, cle: `l${local.n}` } : moteur ? { q: moteur.q, cle: `m${Math.round((p.sim - moteur.depuis) * 10)}` } : null;
  return (
    <div className="cd-rythme" data-type={p.type} role="group" aria-label={titre}>
      <div className="cd-rythme-titre"><b>{titre}</b>
        {!touche && p.type !== 'ruck' && <span className="cd-rythme-synchro" title={t('cd.pack.synchro')}><i style={{ width: `${Math.round(p.score * 100)}%` }} /></span>}
      </div>
      {!aideVue && <p className="cd-rythme-aide">{t(`cd.pack.aide.${p.type}`)}</p>}
      <div className="cd-rythme-piste" ref={piste}>
        <span className="cd-rythme-repere" />
        {p.temps.map((b, i) => {
          const q = b.q ?? vif.current.locaux.get(cleDe(b.dans, p)) ?? null;
          return <i key={i} className="cd-rythme-temps" data-q={q ?? undefined} style={{ visibility: 'hidden', ...(q !== null ? { background: COULEURS_Q[q] } : {}) }} />;
        })}
        {montre && <em key={montre.cle} className="cd-rythme-verdict" style={{ color: COULEURS_Q[montre.q] }}>{t(`cd.pack.q.${montre.q}`)}</em>}
      </div>
      <div className="cd-rythme-actions">
        <button type="button" className="cd-rythme-bouton" ref={boutonRef} onPointerDown={(ev) => { ev.preventDefault(); appuyer(); }}>
          {tactile ? bouton : <>{bouton} <kbd className="cd-touche">{libelleDeTouche(lirePreferencesControle().touches.action[0])}</kbd></>}
        </button>
        {sorties.map((s) => (
          <button key={s} type="button" className="cd-rythme-sortie" data-actif={p.sortie === s ? 'oui' : undefined}
            onPointerDown={(ev) => { ev.preventDefault(); pousser(pilotage, s === 'ramasser' ? { type: 'raffut' } : { type: 'passe', cote: 1, longue: false }); }}>
            {t(p.type === 'maul' && s === 'ramasser' ? 'cd.pack.sortie.maul' : `cd.pack.sortie.${s}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Pourquoi on ne conduit pas à cet instant, ou ce qui cloche (hors jeu, hors poste), ou l'appel en cours. */
function Situation({ snap }: { snap: SnapPilotage }) {
  const pastilles: { cle: string; ton: 'info' | 'alerte' | 'ok'; icone?: NomIcone }[] = [];
  if (!snap.libre && snap.raison && snap.raison !== 'banc') pastilles.push({ cle: `cd.raison.${snap.raison}`, ton: 'info' });
  if (snap.libre && snap.horsJeu) pastilles.push({ cle: 'cd.horsJeu', ton: 'alerte', icone: 'alerte' });
  if (snap.libre && snap.horsPoste && !snap.porte && !snap.horsJeu) pastilles.push({ cle: 'cd.horsPoste', ton: 'alerte', icone: 'viseur' });
  if (snap.libre && snap.appelActif) pastilles.push({ cle: 'cd.appelActif', ton: 'ok', icone: 'appel' });
  if (snap.indication) pastilles.push({ cle: `cd.ind.${snap.indication.cle}`, ton: snap.indication.pour ? 'ok' : 'alerte' });
  if (!pastilles.length) return null;
  return (
    <div className="cd-situation" role="status">
      {pastilles.map((p) => (
        <span key={p.cle} data-ton={p.ton}>
          {p.icone && <Icone nom={p.icone} taille={14} />}
          {t(p.cle)}
        </span>
      ))}
    </div>
  );
}

/** Une phrase brève quand un geste n'a pas pu se jouer : jamais un mur de texte, jamais un code. */
function Toast({ snap }: { snap: SnapPilotage }) {
  if (!snap.toast) return null;
  return <div className="cd-toast" key={snap.toast.n} role="status">{t(snap.toast.cle)}</div>;
}

// ---------------------------------------------------------------------------
// LE JOYSTICK — flottant sous le pouce, ou fixe ; un doigt poussé au bord sprinte
// ---------------------------------------------------------------------------

function Joystick({ pilotage, prefs, sprint, actif }: {
  pilotage: PilotageDirect;
  prefs: PreferencesControle;
  sprint: MutableRefObject<EtatSprint>;
  actif: boolean;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const tete = useRef<HTMLDivElement>(null);
  const doigt = useRef<{ id: number; cx: number; cy: number } | null>(null);

  const relacher = useCallback(() => {
    doigt.current = null;
    pilotage.tactile.stick = { x: 0, y: 0 };
    sprint.current.bord = false;
    sprint.current.verrou = false;
    majSprint(pilotage, sprint.current);
    if (tete.current) tete.current.style.transform = '';
    if (base.current) { delete base.current.dataset.actif; delete base.current.dataset.sprint; }
  }, [pilotage, sprint]);

  // Si la zone disparaît ou se désactive en plein geste, on relâche.
  useEffect(() => { if (!actif && doigt.current) relacher(); }, [actif, relacher]);

  const bouger = (ev: EvPointeur<HTMLDivElement>) => {
    const d = doigt.current;
    const b = base.current;
    if (!d || !b || ev.pointerId !== d.id) return;
    const R = b.offsetWidth / 2;
    const dx = ev.clientX - d.cx, dy = ev.clientY - d.cy;
    const dist = Math.hypot(dx, dy);
    const k = dist > R ? R / dist : 1;
    if (tete.current) tete.current.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    // Zone morte, puis une montée linéaire : un demi-stick est une demi-vitesse.
    const n = Math.min(1, dist / R);
    const MORTE = 0.14;
    let sx = 0, sy = 0;
    if (n > MORTE && dist > 0) {
      const m = (n - MORTE) / (1 - MORTE);
      sx = (dx / dist) * m;
      sy = -(dy / dist) * m;
    }
    pilotage.tactile.stick = { x: sx, y: sy };
    // Un doigt poussé AU-DELÀ de l'anneau sprinte (avec une hystérésis : on ne tremble pas autour du seuil).
    if (prefs.sprintAuBord) {
      const brut = dist / R;
      if (brut > 1.22) sprint.current.bord = true;
      else if (brut < 1.06) sprint.current.bord = false;
      if (sprint.current.bord) b.dataset.sprint = '1'; else delete b.dataset.sprint;
    }
    majSprint(pilotage, sprint.current);
  };

  const poser = (ev: EvPointeur<HTMLDivElement>) => {
    if (ev.pointerType === 'mouse' || doigt.current || !actif) return;
    const z = zone.current, b = base.current;
    if (!z || !b) return;
    const r = z.getBoundingClientRect();
    const R = b.offsetWidth / 2;
    let cx: number, cy: number;
    if (prefs.joystick === 'fixe') {
      const br = b.getBoundingClientRect();
      cx = br.left + br.width / 2;
      cy = br.top + br.height / 2;
      // Un joystick fixe ne répond que près de sa base : le reste de l'écran n'est pas à lui.
      if (Math.hypot(ev.clientX - cx, ev.clientY - cy) > R * 2) return;
    } else {
      cx = borner(ev.clientX, r.left + R + 6, r.right - R - 6);
      cy = borner(ev.clientY, r.top + R + 6, r.bottom - R - 6);
      b.style.left = `${cx - r.left}px`;
      b.style.top = `${cy - r.top}px`;
    }
    doigt.current = { id: ev.pointerId, cx, cy };
    try { z.setPointerCapture(ev.pointerId); } catch { /* le pointeur a déjà disparu */ }
    b.dataset.actif = '1';
    pilotage.tactile.actif = performance.now();
    bouger(ev);
  };

  const finir = (ev: EvPointeur<HTMLDivElement>) => {
    if (doigt.current && ev.pointerId === doigt.current.id) relacher();
  };

  return (
    <div
      ref={zone}
      className="cd-zone-stick"
      data-fixe={prefs.joystick === 'fixe' ? 'oui' : undefined}
      onPointerDown={poser}
      onPointerMove={bouger}
      onPointerUp={finir}
      onPointerCancel={finir}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <div ref={base} className="cd-stick-base" aria-hidden>
        <div className="cd-stick-anneau" />
        <div ref={tete} className="cd-stick-tete" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LE BALAYAGE — le ballon en main, un coup de pouce à gauche ou à droite donne la passe
// ---------------------------------------------------------------------------

/** Radians de rotation par pixel parcouru : un glissé de la largeur d'un téléphone fait un demi-tour. */
const RAD_PAR_PIXEL = 0.0085;

/**
 * LA ZONE DE CAMÉRA TACTILE (Correctif 23) : le tiers haut de l'écran. Un doigt qui y glisse tourne la caméra autour du joueur — ni passe,
 * ni course : les balayages de passe vivent plus bas, et le joystick dans le coin. Glisser vers la droite tourne la vue vers la droite.
 */
function ZoneCamera({ pilotage, actif, sensibilite }: { pilotage: PilotageDirect; actif: boolean; sensibilite: number }) {
  const doigt = useRef<{ id: number; x: number } | null>(null);
  const poser = (ev: EvPointeur<HTMLDivElement>) => {
    if (ev.pointerType === 'mouse' || doigt.current || !actif) return;
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur disparu */ }
    doigt.current = { id: ev.pointerId, x: ev.clientX };
    pilotage.tactile.actif = performance.now();
  };
  const bouger = (ev: EvPointeur<HTMLDivElement>) => {
    const d = doigt.current;
    if (!d || ev.pointerId !== d.id) return;
    pilotage.orbiter((ev.clientX - d.x) * RAD_PAR_PIXEL * sensibilite);
    d.x = ev.clientX;
  };
  const finir = (ev: EvPointeur<HTMLDivElement>) => { if (doigt.current?.id === ev.pointerId) doigt.current = null; };
  return (
    <div className="cd-zone-camera" onPointerDown={poser} onPointerMove={bouger} onPointerUp={finir} onPointerCancel={finir} onContextMenu={(ev) => ev.preventDefault()} />
  );
}

/**
 * LA SOURIS TOURNE LA CAMÉRA (Correctif 23) : un glissé, bouton droit (ou gauche quand la souris ne vise pas le pied), partout où il n'y a
 * pas de bouton. Les clics sur le HUD, la barre de pause ou les cartes ne tournent rien.
 */
function OrbiteSouris({ pilotage, actif, sensibilite, racine, sansGauche }: { pilotage: PilotageDirect; actif: boolean; sensibilite: number; racine: RefObject<HTMLDivElement | null>; sansGauche: boolean }) {
  useEffect(() => {
    if (!actif) return;
    let x: number | null = null, id = -1;
    const bas = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') return;
      const cible = ev.target as HTMLElement | null;
      if (!cible || !racine.current?.parentElement?.contains(cible)) return;
      if (cible.closest('button, a, input, select, textarea, [role="dialog"], .cd-bouton, .cd-resp, .tuto-bulle')) return;
      if (ev.button === 0 && sansGauche) return;
      if (ev.button !== 0 && ev.button !== 2) return;
      x = ev.clientX; id = ev.pointerId;
    };
    const bouge = (ev: PointerEvent) => {
      if (x === null || ev.pointerId !== id) return;
      pilotage.orbiter((ev.clientX - x) * RAD_PAR_PIXEL * sensibilite);
      x = ev.clientX;
    };
    const haut = (ev: PointerEvent) => { if (ev.pointerId === id) x = null; };
    const menu = (ev: MouseEvent) => { if (racine.current?.parentElement?.contains(ev.target as Node)) ev.preventDefault(); };
    window.addEventListener('pointerdown', bas);
    window.addEventListener('pointermove', bouge, { passive: true });
    window.addEventListener('pointerup', haut);
    window.addEventListener('pointercancel', haut);
    window.addEventListener('contextmenu', menu);
    return () => {
      window.removeEventListener('pointerdown', bas); window.removeEventListener('pointermove', bouge); window.removeEventListener('pointerup', haut);
      window.removeEventListener('pointercancel', haut); window.removeEventListener('contextmenu', menu);
    };
  }, [pilotage, actif, sensibilite, racine, sansGauche]);
  return null;
}

function Gestes({ pilotage, actif }: { pilotage: PilotageDirect; actif: boolean }) {
  const zone = useRef<HTMLDivElement>(null);
  const geste = useRef<{ id: number; x0: number; y0: number; t0: number; xp: number; tp: number; vmax: number } | null>(null);

  const poser = (ev: EvPointeur<HTMLDivElement>) => {
    if (ev.pointerType === 'mouse' || geste.current || !actif) return;
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur disparu */ }
    const t0 = performance.now();
    geste.current = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, t0, xp: ev.clientX, tp: t0, vmax: 0 };
    pilotage.tactile.actif = t0;
  };
  const bouger = (ev: EvPointeur<HTMLDivElement>) => {
    const g = geste.current;
    if (!g || ev.pointerId !== g.id) return;
    const maintenant = performance.now();
    const dt = maintenant - g.tp;
    // La vitesse se mesure sur une fenêtre courte : un balayage est un coup de pouce, pas une moyenne.
    if (dt >= 16) {
      g.vmax = Math.max(g.vmax, Math.abs(ev.clientX - g.xp) / dt);
      g.xp = ev.clientX;
      g.tp = maintenant;
    }
  };
  const finir = (ev: EvPointeur<HTMLDivElement>) => {
    const g = geste.current;
    if (!g || ev.pointerId !== g.id) return;
    geste.current = null;
    if (ev.type === 'pointercancel' || !actif) return;
    const dx = ev.clientX - g.x0, dy = ev.clientY - g.y0;
    // Une passe est un coup de pouce nettement horizontal, assez long, et le joueur a le ballon.
    if (Math.abs(dx) < 46 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    if (!pilotage.lire().porte) return;
    const echelle = (zone.current?.offsetWidth ?? 400) / 400;
    // Long et vif : passe sautée ; court ou lent : passe courte.
    const longue = Math.abs(dx) > 168 * echelle || g.vmax > 2.1;
    pousser(pilotage, { type: 'passe', cote: dx > 0 ? 1 : -1, longue });
  };

  return (
    <div
      ref={zone}
      className="cd-zone-gestes"
      onPointerDown={poser}
      onPointerMove={bouger}
      onPointerUp={finir}
      onPointerCancel={finir}
      onContextMenu={(ev) => ev.preventDefault()}
    />
  );
}

// ---------------------------------------------------------------------------
// LES COMMANDES TACTILES — un arc de boutons autour du pouce droit
// ---------------------------------------------------------------------------

/** Un emplacement de l'arc : décalage depuis le coin (px de référence) et diamètre. */
interface Place { x: number; y: number; s: number }

/** Le gros bouton au creux du pouce. */
const PLACE_P: Place = { x: 0, y: 0, s: 100 };

/**
 * Les autres places, sur deux arcs autour du gros bouton. Calculées une fois : centre = (50 + R cos θ, 50 + R sin θ)
 * depuis le coin bas-droit, puis décalage par le demi-diamètre. L'arc intérieur porte le sprint puis les deux gestes
 * les plus probables, l'arc extérieur les deux autres.
 */
function placeSurArc(R: number, degres: number, s: number): Place {
  const a = (degres * Math.PI) / 180;
  const cx = 50 + R * Math.cos(a), cy = 50 + R * Math.sin(a);
  return { x: Math.round(cx - s / 2), y: Math.round(cy - s / 2), s };
}
const PLACE_SPRINT = placeSurArc(104, 4, 62);
const PLACES_INTERIEURES = [placeSurArc(104, 46, 62), placeSurArc(104, 88, 62)];
const PLACES_EXTERIEURES = [placeSurArc(184, 16, 54), placeSurArc(184, 44, 54), placeSurArc(184, 72, 54)];

type IdBouton = 'raffut' | 'crochet' | 'pied' | 'feinte' | 'gratter' | 'appel' | 'drop';

/** Ce qui entoure la roue de passe, du plus probable au moins probable, selon le poste. */
const SATELLITES_BALLON: Record<FamillePoste, IdBouton[]> = {
  avant: ['raffut', 'crochet', 'pied', 'drop'],
  demi: ['pied', 'raffut', 'crochet', 'feinte', 'drop'],
  ouvreur: ['pied', 'drop', 'feinte', 'crochet', 'raffut'],
  centre: ['crochet', 'raffut', 'pied', 'drop'],
  ailier: ['crochet', 'raffut', 'pied', 'drop'],
  arriere: ['pied', 'drop', 'crochet', 'raffut'],
};

function Commandes({ pilotage, snap, sprint }: {
  pilotage: PilotageDirect;
  snap: SnapPilotage;
  sprint: MutableRefObject<EtatSprint>;
}) {
  const p = snap.possible;
  // HUD contextuel (Correctif 20) : deux à quatre boutons, les passes se font par balayage.
  const simple = usePreferencesControle().hudSimple;
  const guide = snap.tuto && !snap.tuto.carte && snap.tuto.visible ? snap.tuto.etape : null;
  const enRecharge = (a: keyof SnapPilotage['possible']) => snap.recharge.includes(a);
  const libre = snap.libre;
  // Le temps que le joueur entre, les commandes sont déjà là, éteintes : le HUD apparaît AVANT la main.
  if (snap.phase === 'entree') {
    return (
      <div className="cd-commandes" data-apercu="oui" aria-hidden>
        <BoutonRond place={PLACE_SPRINT} icone="sprint" libelle={t('cd.act.sprint')} eteint onPress={() => undefined} />
        <BoutonRond place={PLACE_P} icone="appel" libelle={t('cd.act.appel')} grand eteint onPress={() => undefined} />
      </div>
    );
  }

  // ── Ce qui est demandé, dans l'ordre des places ────────────────────────────
  let principal: ReactNode = null;
  const satellites: { id: IdBouton; noeud: (place: Place) => ReactNode }[] = [];
  const contact = snap.contactImminent;

  if (libre && snap.porte) {
    // ⚠️ AVEC LE BALLON, EN HUD SIMPLE : CONTACT (raffut, percussion, protection du ballon), PIED et ESQUIVE ; la passe se fait
    // d'un balayage gauche/droite (un balayage pendant un contact arme l'offload). Le drop n'apparaît que s'il est jouable.
    if (!simple && p.passe) principal = <RoueDePasse pilotage={pilotage} offload={contact} guide={guide === 'passe'} eteinte={enRecharge('passe')} />;
    const offre: Record<IdBouton, boolean> = {
      raffut: p.raffut, crochet: p.crochet, pied: p.coupDePied, feinte: p.feinte, gratter: false, appel: false, drop: p.drop,
    };
    const ordre: IdBouton[] = simple ? ['raffut', 'pied', 'crochet', 'drop'] : SATELLITES_BALLON[snap.famille];
    for (const id of ordre) {
      if (!offre[id]) continue;
      satellites.push({ id, noeud: (place) => rendreSatellite(id, place) });
    }
    // Sans passe possible (ballon au sol, vol en cours) : le plus probable des gestes prend la place d'honneur.
    if (!principal && satellites.length) {
      const premier = satellites.shift()!;
      principal = premier.noeud(PLACE_P);
    }
  } else if (libre) {
    const aucune = !p.plaquage && !p.grattage && !p.engager;
    const icone: NomIcone = p.plaquage ? 'plaquage' : p.grattage ? 'grattage' : p.engager ? 'soutien' : 'appel';
    const cle = p.plaquage ? 'cd.act.plaquer' : p.grattage ? 'cd.act.gratter' : p.engager ? 'cd.act.nettoyer' : 'cd.act.appel';
    if (!aucune || p.appel) {
      principal = (
        <BoutonRond
          place={PLACE_P} icone={icone} libelle={t(cle)} grand
          guide={(guide === 'plaquer' && p.plaquage) || (guide === 'gratter' && p.grattage && !p.plaquage)}
          eteint={aucune ? enRecharge('appel') : p.plaquage ? enRecharge('plaquage') : p.grattage ? enRecharge('grattage') : false}
          allume={snap.arme === 'plaquage' && p.plaquage}
          onPress={() => pousser(pilotage, aucune ? { type: 'appel' } : { type: 'action' })}
        />
      );
    }
    if (!aucune && p.appel) satellites.push({ id: 'appel', noeud: (place) => rendreSatellite('appel', place) });
    if (p.plaquage && (p.grattage || p.engager)) satellites.push({ id: 'gratter', noeud: (place) => rendreSatellite('gratter', place) });
  }

  function rendreSatellite(id: IdBouton, place: Place): ReactNode {
    switch (id) {
      case 'pied':
        return <BoutonPied key={id} pilotage={pilotage} place={place} eteint={enRecharge('coupDePied')} />;
      case 'raffut':
        return (
          <BoutonRond
            key={id} place={place} icone="raffut"
            libelle={t(simple ? 'cd.act.contact' : snap.famille === 'avant' ? 'cd.act.percussion' : 'cd.act.raffut')}
            guide={guide === 'raffut'} eteint={enRecharge('raffut')} allume={snap.arme === 'raffut'}
            onPress={() => pousser(pilotage, { type: 'raffut' })}
          />
        );
      case 'crochet':
        return (
          <BoutonRond
            key={id} place={place} icone="crochet" libelle={t(simple ? 'cd.act.esquive' : 'cd.act.crochet')}
            guide={guide === 'crochet'} eteint={enRecharge('crochet')} allume={snap.arme === 'crochet'}
            onPress={() => pousser(pilotage, { type: 'crochet', cote: 0 })}
          />
        );
      case 'drop':
        return (
          <BoutonRond
            key={id} place={place} icone="drop" libelle={t('cd.act.drop')} eteint={enRecharge('drop')}
            onPress={() => pousser(pilotage, { type: 'drop', auto: true, x: 0, y: 1 })}
          />
        );
      case 'feinte':
        return (
          <BoutonRond
            key={id} place={place} icone="feinte" libelle={t('cd.act.feinte')} eteint={enRecharge('feinte')}
            onPress={() => pousser(pilotage, { type: 'feinte', cote: 0 })}
          />
        );
      case 'gratter':
        return (
          <BoutonRond
            key={id} place={place} icone={p.grattage ? 'grattage' : 'soutien'} guide={guide === 'gratter'}
            libelle={t(p.grattage ? 'cd.act.gratter' : 'cd.act.nettoyer')}
            eteint={p.grattage ? enRecharge('grattage') : false}
            onPress={() => pousser(pilotage, { type: 'gratter' })}
          />
        );
      case 'appel':
        return (
          <BoutonRond
            key={id} place={place} icone="appel" libelle={t('cd.act.appel')} guide={guide === 'appel'}
            eteint={enRecharge('appel')} allume={snap.appelActif}
            onPress={() => pousser(pilotage, { type: 'appel' })}
          />
        );
    }
  }

  // Les places : intérieur, puis extérieur. Le sprint garde SA place quoi qu'il arrive.
  const places = [...PLACES_INTERIEURES, ...PLACES_EXTERIEURES];
  return (
    <div className="cd-commandes" data-simple={simple ? 'oui' : undefined}>
      {simple && libre && snap.porte && p.passe && <div className="cd-hint-swipe" aria-hidden><Icone nom="passe-gauche" taille={16} /> {t('cd.hint.swipe')} <Icone nom="passe-droite" taille={16} /></div>}
      {libre && (
        <BoutonSprint pilotage={pilotage} place={PLACE_SPRINT} sprint={sprint} guide={guide === 'sprint'} allume={snap.sprint} />
      )}
      {principal}
      {satellites.slice(0, places.length).map((s, i) => s.noeud(places[i]))}
    </div>
  );
}

/** Un emplacement de l'arc, en variables CSS : le CSS multiplie par l'échelle choisie dans les réglages. */
function styleDePlace(place: Place): CSSProperties {
  return { '--x': place.x, '--y': place.y, '--s': place.s } as CSSProperties;
}

// ── Un bouton rond, une pression : raffut, crochet, plaquer, appel… ──────────
function BoutonRond({ place, icone, libelle, grand, guide, eteint, allume, onPress }: {
  place: Place;
  icone: NomIcone;
  libelle: string;
  grand?: boolean;
  guide?: boolean;
  eteint?: boolean;
  allume?: boolean;
  onPress: () => void;
}) {
  const el = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={el}
      type="button"
      className="cd-bouton"
      data-grand={grand ? 'oui' : undefined}
      data-guide={guide ? 'oui' : undefined}
      data-eteint={eteint ? 'oui' : undefined}
      data-allume={allume ? 'oui' : undefined}
      style={styleDePlace(place)}
      aria-label={libelle}
      onPointerDown={(ev) => {
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        allumer(el.current);
        onPress();
      }}
      onPointerUp={() => eteindre(el.current)}
      onPointerCancel={() => eteindre(el.current)}
      onPointerLeave={() => eteindre(el.current)}
      onClick={(ev) => ev.currentTarget.blur()}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <Icone nom={icone} taille={grand ? 34 : 26} />
      <span>{libelle}</span>
    </button>
  );
}

// ── Le sprint : tenu, ou — d'un tapotement — verrouillé jusqu'à ce qu'on lâche le joystick ──
function BoutonSprint({ pilotage, place, sprint, guide, allume }: {
  pilotage: PilotageDirect;
  place: Place;
  sprint: MutableRefObject<EtatSprint>;
  guide: boolean;
  allume: boolean;
}) {
  const el = useRef<HTMLButtonElement>(null);
  const appui = useRef<{ id: number; t0: number } | null>(null);
  const lever = () => {
    const a = appui.current;
    if (!a) return;
    appui.current = null;
    sprint.current.bouton = false;
    // Un appui plus bref que 220 ms verrouille (ou déverrouille) : on sprinte alors sans tenir le doigt dessus.
    if (performance.now() - a.t0 < 220) sprint.current.verrou = !sprint.current.verrou;
    majSprint(pilotage, sprint.current);
    eteindre(el.current);
  };
  return (
    <button
      ref={el}
      type="button"
      className="cd-bouton"
      data-guide={guide ? 'oui' : undefined}
      data-allume={allume ? 'oui' : undefined}
      style={styleDePlace(place)}
      aria-label={t('cd.act.sprint')}
      onPointerDown={(ev) => {
        if (appui.current || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
        try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur disparu */ }
        appui.current = { id: ev.pointerId, t0: performance.now() };
        sprint.current.bouton = true;
        majSprint(pilotage, sprint.current);
        allumer(el.current);
      }}
      onPointerUp={(ev) => { if (appui.current?.id === ev.pointerId) lever(); }}
      onPointerCancel={(ev) => {
        if (appui.current?.id !== ev.pointerId) return;
        appui.current = null;
        sprint.current.bouton = false;
        majSprint(pilotage, sprint.current);
        eteindre(el.current);
      }}
      onClick={(ev) => ev.currentTarget.blur()}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <Icone nom="sprint" taille={26} />
      <span>{t('cd.act.sprint')}</span>
    </button>
  );
}

// ── La roue de passe : deux moitiés, gauche et droite ; tapotée, courte ; tenue, sautée ──
function RoueDePasse({ pilotage, offload, guide, eteinte }: {
  pilotage: PilotageDirect;
  offload: boolean;
  guide: boolean;
  eteinte: boolean;
}) {
  const el = useRef<HTMLButtonElement>(null);
  const tenu = useRef<{ id: number; cote: -1 | 1; fait: boolean; minuteur: number } | null>(null);

  useEffect(() => () => { if (tenu.current) window.clearTimeout(tenu.current.minuteur); }, []);

  const lever = (ev: EvPointeur<HTMLButtonElement>) => {
    const a = tenu.current;
    if (!a || a.id !== ev.pointerId) return;
    window.clearTimeout(a.minuteur);
    tenu.current = null;
    if (!a.fait && ev.type !== 'pointercancel') pousser(pilotage, { type: 'passe', cote: a.cote, longue: false });
    if (el.current) { delete el.current.dataset.presse; delete el.current.dataset.longue; }
  };

  return (
    <button
      ref={el}
      type="button"
      className="cd-bouton cd-roue"
      data-offload={offload ? 'oui' : undefined}
      data-guide={guide ? 'oui' : undefined}
      data-eteint={eteinte ? 'oui' : undefined}
      style={styleDePlace(PLACE_P)}
      aria-label={t(offload ? 'cd.act.offload' : 'cd.act.passe')}
      onPointerDown={(ev) => {
        if (tenu.current || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
        const b = ev.currentTarget.getBoundingClientRect();
        const cote: -1 | 1 = ev.clientX < b.left + b.width / 2 ? -1 : 1;
        try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur disparu */ }
        const minuteur = window.setTimeout(() => {
          const a = tenu.current;
          if (!a || a.fait) return;
          a.fait = true;
          pousser(pilotage, { type: 'passe', cote: a.cote, longue: true });
          if (el.current) el.current.dataset.longue = '1';
        }, SEUIL_MAINTIEN * 1000);
        tenu.current = { id: ev.pointerId, cote, fait: false, minuteur };
        allumer(el.current, cote < 0 ? 'g' : 'd');
      }}
      onPointerUp={lever}
      onPointerCancel={lever}
      onClick={(ev) => ev.currentTarget.blur()}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <span className="cd-roue-moitie g"><Icone nom="passe-gauche" taille={30} /></span>
      <span className="cd-roue-moitie d"><Icone nom="passe-droite" taille={30} /></span>
      <span className="cd-roue-legende">{t(offload ? 'cd.act.offload' : 'cd.act.passe')}</span>
    </button>
  );
}

// ── Le coup de pied : un tapotement laisse la situation choisir ; un glissé donne direction et puissance ──
function BoutonPied({ pilotage, place, eteint }: { pilotage: PilotageDirect; place: Place; eteint: boolean }) {
  const el = useRef<HTMLButtonElement>(null);
  const fil = useRef<HTMLDivElement>(null);
  const tete = useRef<HTMLDivElement>(null);
  const etat = useRef<{ id: number; x0: number; y0: number; ex0: number; ey0: number; t0: number; xp: number; yp: number; tp: number; vif: number; u: number } | null>(null);

  const fermer = (envoyer: boolean) => {
    const a = etat.current;
    if (!a) return;
    etat.current = null;
    const p = pilotage.tactile.pied;
    pilotage.tactile.pied = null;
    if (envoyer && p) pousser(pilotage, intentionPiedTactile(p, performance.now()));
    eteindre(el.current);
    if (fil.current) delete fil.current.dataset.actif;
    if (tete.current) delete tete.current.dataset.actif;
  };

  return (
    <>
      <button
        ref={el}
        type="button"
        className="cd-bouton"
        data-eteint={eteint ? 'oui' : undefined}
        style={styleDePlace(place)}
        aria-label={t('cd.act.pied')}
        onPointerDown={(ev) => {
          if (etat.current || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
          const b = ev.currentTarget.getBoundingClientRect();
          // Le fil de visée est posé dans le MÊME conteneur que le bouton (l'arc, un cadre de taille nulle collé au
          // coin) : ses coordonnées se comptent depuis ce cadre, pas depuis l'écran.
          const racine = (ev.currentTarget.offsetParent as HTMLElement | null)?.getBoundingClientRect();
          try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* pointeur disparu */ }
          const t0 = performance.now();
          // `u` : l'échelle du bouton en pixels, pour que la longueur d'un glissé vaille la même puissance partout.
          const u = b.width / 62;
          etat.current = {
            id: ev.pointerId, x0: ev.clientX, y0: ev.clientY,
            ex0: b.left + b.width / 2 - (racine?.left ?? 0), ey0: b.top + b.height / 2 - (racine?.top ?? 0),
            t0, xp: ev.clientX, yp: ev.clientY, tp: t0, vif: 0, u,
          };
          pilotage.tactile.pied = { depuis: t0, dx: 0, dy: 0, vif: 0 };
          pilotage.tactile.actif = t0;
          allumer(el.current);
        }}
        onPointerMove={(ev) => {
          const a = etat.current;
          if (!a || ev.pointerId !== a.id) return;
          const maintenant = performance.now();
          const dt = maintenant - a.tp;
          if (dt >= 16) {
            a.vif = Math.max(a.vif, borner((Math.hypot(ev.clientX - a.xp, ev.clientY - a.yp) / dt - 0.5) / 1.5, 0, 1));
            a.xp = ev.clientX; a.yp = ev.clientY; a.tp = maintenant;
          }
          const dx = (ev.clientX - a.x0) / a.u, dy = (ev.clientY - a.y0) / a.u;
          pilotage.tactile.pied = { depuis: a.t0, dx, dy, vif: a.vif };
          pilotage.tactile.actif = maintenant;
          // Le fil part du bouton et suit le doigt : on voit la direction et la longueur.
          const px = ev.clientX - a.x0, py = ev.clientY - a.y0;
          const L = Math.hypot(px, py);
          if (fil.current && tete.current) {
            if (L > 12) {
              fil.current.dataset.actif = '1'; tete.current.dataset.actif = '1';
              fil.current.style.left = `${a.ex0}px`; fil.current.style.top = `${a.ey0}px`;
              fil.current.style.width = `${L}px`;
              fil.current.style.transform = `rotate(${Math.atan2(py, px)}rad)`;
              tete.current.style.left = `${a.ex0 + px}px`; tete.current.style.top = `${a.ey0 + py}px`;
            } else { delete fil.current.dataset.actif; delete tete.current.dataset.actif; }
          }
        }}
        onPointerUp={(ev) => { if (etat.current?.id === ev.pointerId) fermer(true); }}
        onPointerCancel={(ev) => { if (etat.current?.id === ev.pointerId) fermer(false); }}
        onClick={(ev) => ev.currentTarget.blur()}
        onContextMenu={(ev) => ev.preventDefault()}
      >
        <Icone nom="pied" taille={26} />
        <span>{t('cd.act.pied')}</span>
      </button>
      <div ref={fil} className="cd-visee-fil" aria-hidden />
      <div ref={tete} className="cd-visee-tete" aria-hidden />
    </>
  );
}

// ---------------------------------------------------------------------------
// LES INDICATIONS — clavier ou manette : rien à toucher, juste de quoi se rappeler
// ---------------------------------------------------------------------------

function PuceTouche({ codes, max = 2 }: { codes: string[]; max?: number }) {
  // Maj gauche et Maj droite portent le même nom : une seule puce.
  const noms = [...new Set(codes.slice(0, max).map(libelleDeTouche))];
  return <>{noms.map((nom) => <kbd key={nom} className="cd-touche">{nom}</kbd>)}</>;
}

/** Un symbole de manette : les quatre formes d'une PlayStation, les lettres colorées d'une Xbox. */
function Glyphe({ bouton, type }: { bouton: NomBouton; type: TypeManette }) {
  const libelle = LIBELLES_MANETTE[type][bouton];
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
  return <span className="cd-pastille-manette" data-b={bouton}>{libelle}</span>;
}

/**
 * `cleManette` : à la manette, A donne la passe du côté où le stick pousse (à défaut, du côté ouvert du jeu) et X de
 * l'autre — ce n'est PAS « gauche » et « droite » : la légende le dit.
 */
interface LigneAide { icone: NomIcone; cle: string; cleManette?: string; touche: ActionClavier | null; bouton: NomBouton[] | null }

/** Ce que la situation permet, avec la touche et le bouton qui le déclenchent. */
function lignesDAide(snap: SnapPilotage): LigneAide[] {
  const p = snap.possible;
  const L: LigneAide[] = [];
  if (!snap.libre) return L;
  if (snap.porte) {
    if (p.passe) {
      L.push({ icone: 'passe-gauche', cle: snap.contactImminent ? 'cd.act.offload' : 'cd.act.passeGauche', cleManette: snap.contactImminent ? 'cd.act.offload' : 'cd.act.passeAutre', touche: 'passeGauche', bouton: ['x'] });
      L.push({ icone: 'passe-droite', cle: snap.contactImminent ? 'cd.act.offload' : 'cd.act.passeDroite', cleManette: snap.contactImminent ? 'cd.act.offload' : 'cd.act.passeStick', touche: 'passeDroite', bouton: ['a'] });
    }
    if (p.coupDePied) L.push({ icone: 'pied', cle: 'cd.act.pied', touche: 'coupDePied', bouton: ['b'] });
    if (p.raffut) L.push({ icone: 'raffut', cle: snap.famille === 'avant' ? 'cd.act.percussion' : 'cd.act.raffut', touche: 'raffut', bouton: ['rb'] });
    if (p.crochet) L.push({ icone: 'crochet', cle: 'cd.act.crochet', touche: 'crochet', bouton: ['lb'] });
    if (p.feinte) L.push({ icone: 'feinte', cle: 'cd.act.feinte', touche: null, bouton: ['y'] });
    if (p.drop) L.push({ icone: 'drop', cle: 'cd.act.drop', touche: 'drop', bouton: ['lb', 'b'] });
  } else {
    if (p.plaquage) L.push({ icone: 'plaquage', cle: 'cd.act.plaquer', touche: 'action', bouton: ['a'] });
    if (p.grattage) L.push({ icone: 'grattage', cle: 'cd.act.gratter', touche: p.plaquage ? 'gratter' : 'action', bouton: p.plaquage ? ['x'] : ['a'] });
    else if (p.engager) L.push({ icone: 'soutien', cle: 'cd.act.nettoyer', touche: p.plaquage ? 'gratter' : 'action', bouton: p.plaquage ? ['x'] : ['a'] });
    if (p.appel) L.push({ icone: 'appel', cle: 'cd.act.appel', touche: 'appel', bouton: ['y'] });
  }
  return L;
}

function Indications({ snap, touches }: { snap: SnapPilotage; touches: TouchesDirectes }) {
  const manette = snap.appareil === 'manette';
  const lignes = lignesDAide(snap);
  if (!snap.libre) return null;
  return (
    <div className="cd-indications" data-appareil={snap.appareil} aria-hidden>
      <span className="cd-indic cd-indic-bouger">
        {manette
          ? <span className="cd-pastille-manette" data-b="stick">L</span>
          : <PuceTouche max={4} codes={[touches.haut[0], touches.gauche[0], touches.bas[0], touches.droite[0]]} />}
        {t('cd.act.deplacer')}
      </span>
      <span className="cd-indic">
        {manette
          ? <Glyphe bouton="rt" type={snap.manette} />
          : <PuceTouche codes={touches.sprint.slice(0, 1)} />}
        {t('cd.act.sprint')}
      </span>
      {lignes.map((l) => (
        <span key={l.cle + (l.touche ?? l.bouton?.[0])} className="cd-indic">
          {manette
            ? (l.bouton ? l.bouton.map((b, i) => <span key={b}>{i > 0 && '+'}<Glyphe bouton={b} type={snap.manette} /></span>) : null)
            : (l.touche ? <PuceTouche codes={touches[l.touche].slice(0, 1)} /> : null)}
          {t(manette && l.cleManette ? l.cleManette : l.cle)}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LE TUTORIEL — court, contextuel, passable
// ---------------------------------------------------------------------------

function Tuto({ pilotage, snap, touches }: { pilotage: PilotageDirect; snap: SnapPilotage; touches: TouchesDirectes }) {
  const tuto = snap.tuto;
  if (!tuto || !tuto.visible || snap.pause) return null;
  const variante = snap.appareil;
  const libelles = (codes: string[]) => codes.slice(0, 1).map(libelleDeTouche).join('');
  const vars = {
    deplacer: [touches.haut[0], touches.gauche[0], touches.bas[0], touches.droite[0]].map(libelleDeTouche).join(' '),
    sprint: variante === 'manette' ? LIBELLES_MANETTE[snap.manette].rt : libelles(touches.sprint),
    appel: variante === 'manette' ? glypheTexte(snap.manette, 'y') : libelles(touches.appel),
    passeG: variante === 'manette' ? glypheTexte(snap.manette, 'x') : libelles(touches.passeGauche),
    passeD: variante === 'manette' ? glypheTexte(snap.manette, 'a') : libelles(touches.passeDroite),
    pied: variante === 'manette' ? glypheTexte(snap.manette, 'b') : libelles(touches.coupDePied),
    raffut: variante === 'manette' ? LIBELLES_MANETTE[snap.manette].rb : libelles(touches.raffut),
    crochet: variante === 'manette' ? LIBELLES_MANETTE[snap.manette].lb : libelles(touches.crochet),
    action: variante === 'manette' ? glypheTexte(snap.manette, 'a') : libelles(touches.action),
  };

  if (tuto.carte) {
    return (
      <div className="cd-tuto-voile" role="dialog" aria-modal="true" aria-label={t('cd.tuto.intro.titre')}>
        <div className="cd-tuto-carte">
          <b className="cd-tuto-titre"><Icone nom="sifflet" taille={18} /> {t('cd.tuto.intro.titre')}</b>
          <p>{t('cd.tuto.intro.texte')}</p>
          <ul>
            <li><Icone nom="joueur" taille={15} /> {t('cd.tuto.intro.l1')}</li>
            <li><Icone nom="appel" taille={15} /> {t('cd.tuto.intro.l2')}</li>
            <li><Icone nom="ballon" taille={15} /> {t('cd.tuto.intro.l3')}</li>
          </ul>
          <div className="cd-tuto-actions">
            <button type="button" className="btn vert" autoFocus onClick={() => pilotage.tuto?.continuer()}>
              {t('cd.tuto.continuer')}
            </button>
            <button type="button" className="cd-tuto-passer" onClick={() => pilotage.tuto?.passer()}>
              {t('cd.tuto.passer')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cd-tuto" data-valide={tuto.valide ? 'oui' : undefined} role="status" key={tuto.etape} data-tuto="cd-etape">
      <span className="cd-tuto-etape">{t('cd.tuto.etape', { n: tuto.numero, total: tuto.total })}</span>
      {tuto.valide ? (
        <b className="cd-tuto-bravo"><Icone nom="check" taille={18} /> {t('cd.tuto.bravo')}</b>
      ) : (
        <>
          <b>{t(`${tuto.cle}.titre`)}</b>
          <p>{t(`${tuto.cle}.${variante}`, vars)}</p>
        </>
      )}
      {!tuto.valide && (
        <button type="button" className="cd-tuto-passer" onClick={() => pilotage.tuto?.passer()}>
          {t('cd.tuto.passer')}
        </button>
      )}
    </div>
  );
}

/** Le symbole d'un bouton, en texte, pour les phrases du tutoriel (les formes PlayStation y deviennent des mots). */
function glypheTexte(type: TypeManette, bouton: NomBouton): string {
  const l = LIBELLES_MANETTE[type][bouton];
  const formes: Record<string, string> = { croix: '✕', rond: '○', carre: '□', triangle: '△' };
  return formes[l] ?? l;
}

// ---------------------------------------------------------------------------
// LA PAUSE — le match est figé, et on y relit ses commandes
// ---------------------------------------------------------------------------

function PanneauPause({ snap, touches, surReprendre }: { snap: SnapPilotage; touches: TouchesDirectes; surReprendre: () => void }) {
  return (
    <div className="cd-pause" role="dialog" aria-modal="true" aria-label={t('cd.pause.titre')}>
      <div className="cd-pause-carte">
        {/* Le bouton est EN HAUT, à côté du titre : sur un téléphone en paysage la liste défile, il ne doit pas
            partir avec elle. */}
        <div className="cd-pause-tete">
          <b className="cd-pause-titre">{t('cd.pause.titre')}</b>
          <button type="button" className="btn vert" autoFocus onClick={surReprendre}>
            <Icone nom="fleche-droite" taille={16} /> {t('ml.reprendre')}
          </button>
        </div>
        <ListeCommandes appareil={snap.appareil} manette={snap.manette} touches={touches} />
      </div>
    </div>
  );
}

/** La liste des commandes de l'appareil du moment. Servie aussi par le tiroir « Commandes » du match. */
export function ListeCommandes({ appareil, manette, touches }: { appareil: SnapPilotage['appareil']; manette: TypeManette; touches: TouchesDirectes }) {
  if (appareil === 'tactile') {
    return (
      <ul className="cd-liste">
        <li><Icone nom="joueur" taille={16} /><span>{t('cd.geste.stick')}</span></li>
        <li><Icone nom="passe-droite" taille={16} /><span>{t('cd.geste.passe')}</span></li>
        <li><Icone nom="sprint" taille={16} /><span>{t('cd.geste.passeLongue')}</span></li>
        <li><Icone nom="pied" taille={16} /><span>{t('cd.geste.pied')}</span></li>
        <li><Icone nom="appel" taille={16} /><span>{t('cd.geste.appel')}</span></li>
      </ul>
    );
  }
  if (appareil === 'manette') {
    const lignes: [NomBouton, string][] = [
      ['rt', 'cd.touche.sprint'], ['a', 'cd.pad.a'], ['x', 'cd.pad.x'], ['b', 'cd.touche.coupDePied'],
      ['y', 'cd.pad.y'], ['rb', 'cd.touche.raffut'], ['lb', 'cd.touche.crochet'], ['start', 'cd.touche.pause'],
    ];
    return (
      <ul className="cd-liste" data-appareil="manette">
        <li><span className="cd-pastille-manette" data-b="stick">L</span><span>{t('cd.pad.stick')}</span></li>
        <li><span className="cd-pastille-manette" data-b="stick">R</span><span>{t('cd.pad.stickDroit')}</span></li>
        {lignes.map(([b, cle]) => (
          <li key={b}><Glyphe bouton={b} type={manette} /><span>{t(cle)}</span></li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="cd-liste" data-appareil="clavier">
      <li>
        <span className="cd-cles"><PuceTouche max={4} codes={[touches.haut[0], touches.gauche[0], touches.bas[0], touches.droite[0]]} /></span>
        <span>{t('cd.act.deplacer')}</span>
      </li>
      {DEFINITIONS_TOUCHES.filter((d) => d.id !== 'haut' && d.id !== 'bas' && d.id !== 'gauche' && d.id !== 'droite').map((d) => (
        <li key={d.id}>
          <span className="cd-cles">
            <PuceTouche codes={touches[d.id]} />
            {d.id === 'pause' && <kbd className="cd-touche">{libelleDeTouche('Escape')}</kbd>}
          </span>
          <span>{t(d.cle)}</span>
        </li>
      ))}
    </ul>
  );
}
