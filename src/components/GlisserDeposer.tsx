// ═══════════════════════════════════════════════════════════════════════════
// LE GLISSER-DÉPOSER DES CARTES DE COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════
// Demande explicite : « quand on veut drag and drop les cartes de la compo que
// ça soit une animation stylée, pas moche ».
//
// ⚠️ POURQUOI ON A QUITTÉ L'API HTML5 `draggable`. Elle avait trois défauts que
// AUCUN réglage ne corrige :
//
//   1. **Elle n'existe pas au doigt.** `dragstart` n'est jamais émis par un
//      écran tactile. Sur téléphone, la moitié de l'écran de composition ne
//      répondait tout simplement pas — il restait le clic-puis-clic, que rien
//      n'annonçait. Le projet impose un test mobile : c'était un demi-écran.
//   2. **Le fantôme est une capture figée**, prise par le navigateur au premier
//      pixel de mouvement. Il ne tourne pas, ne s'incline pas, ne rattrape pas
//      le curseur — et Chrome, Firefox et Safari n'en donnent ni la même
//      opacité ni le même décalage. On ne peut pas dessiner dedans.
//   3. **Aucune trajectoire au dépôt.** La carte disparaît, l'état change ;
//      rien ne relie le geste au résultat.
//
// Ici, tout est fait à la main sur les **événements pointeur** — les mêmes pour
// la souris, le stylet et le doigt. La carte soulevée est un CLONE réel du
// nœud, posé sur `document.body` (⚠️ obligatoire : le `backdrop-filter` des
// `.carte` crée un bloc conteneur qui piégerait un `position:fixed`), animé en
// impératif dans une boucle `requestAnimationFrame`. Aucun rendu React par
// image : React n'apprend que ce qui change vraiment — la carte prise et la
// case survolée.
//
// ⚠️ AU DOIGT, LE GESTE COMMENCE PAR UN APPUI MAINTENU (180 ms). Sans ce délai,
// il est impossible de distinguer « je prends cette carte » de « je fais défiler
// la liste des remplaçants » : le premier pixel de mouvement appartient aux
// deux gestes. Tant que le délai court, on n'empêche rien ; si le doigt bouge
// avant la fin, c'est un défilement et on abandonne. Une fois le geste ouvert,
// on bloque le défilement (écouteur `touchmove` non passif).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Ce qu'une case de dépôt déclare dans le DOM, via `data-depot`. */
export type CleDepot = string;

interface Prise {
  joueurId: string;
  /** La case d'où part la carte, si elle en occupait une. */
  origine: CleDepot | null;
  pointerId: number;
  tactile: boolean;
  source: HTMLElement;
  /** Position du pointeur au premier contact. */
  x0: number;
  y0: number;
  /** Décalage entre le pointeur et le coin haut-gauche de la carte. */
  decalageX: number;
  decalageY: number;
  largeur: number;
  hauteur: number;
}

/** Distance (px) au-delà de laquelle un mouvement souris devient un glissé. */
const SEUIL_SOURIS = 6;
/** Tolérance (px) pendant l'appui maintenu : au-delà, c'est un défilement. */
const TOLERANCE_APPUI = 9;
/** Durée (ms) de l'appui maintenu qui ouvre le geste au doigt. */
const DELAI_APPUI = 180;
/** Raideur du rattrapage : 1 = collé au pointeur, 0,22 = il traîne un peu. */
const RATTRAPAGE = 0.26;
/** Degrés d'inclinaison au maximum, proportionnels à la vitesse horizontale. */
const INCLINAISON_MAX = 11;

function mouvementReduit(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export interface GlisserDeposer {
  /** L'identifiant du joueur actuellement soulevé, pour effacer sa carte. */
  idEnGlisse: string | null;
  /** La case survolée (`data-depot`), pour l'allumer. */
  cibleDepot: CleDepot | null;
  /** Vrai dès qu'une carte est en l'air : les cases valides s'annoncent. */
  enCours: boolean;
  /**
   * À étaler sur chaque carte prenable.
   * `origine` est la case qu'elle occupe (`null` pour la réserve).
   */
  poignee: (joueurId: string | undefined, origine: CleDepot | null) => {
    onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
    style?: React.CSSProperties;
  };
  /** Vrai si le dernier appui s'est terminé en glissé : le clic est à ignorer. */
  vientDeGlisser: () => boolean;
}

/**
 * @param surDepot  Appelé quand une carte est lâchée sur une case valide.
 *                  Reçoit la clé `data-depot` visée et le joueur déplacé.
 */
export function useGlisserDeposer(
  surDepot: (cible: CleDepot, joueurId: string) => void,
): GlisserDeposer {
  const [idEnGlisse, setIdEnGlisse] = useState<string | null>(null);
  const [cibleDepot, setCibleDepot] = useState<CleDepot | null>(null);

  // Tout l'état vivant du geste reste dans des refs : il change soixante fois
  // par seconde et ne doit provoquer aucun rendu.
  const prise = useRef<Prise | null>(null);
  const fantome = useRef<HTMLElement | null>(null);
  const pointeur = useRef({ x: 0, y: 0 });
  const rendu = useRef({ x: 0, y: 0, angle: 0 });
  const boucle = useRef(0);
  const minuterie = useRef(0);
  const ouvert = useRef(false);
  const glisseRecente = useRef(0);
  const surDepotRef = useRef(surDepot);
  surDepotRef.current = surDepot;

  /** Range le fantôme, les écouteurs et l'état. */
  const ranger = useCallback((animation?: { x: number; y: number; reussi: boolean }) => {
    if (boucle.current) cancelAnimationFrame(boucle.current);
    boucle.current = 0;
    window.clearTimeout(minuterie.current);

    const clone = fantome.current;
    fantome.current = null;
    prise.current = null;
    ouvert.current = false;
    document.body.classList.remove('ct-glisse-en-cours');
    setIdEnGlisse(null);
    setCibleDepot(null);

    if (!clone) return;
    if (!animation || mouvementReduit()) { clone.remove(); return; }

    // ⚠️ LA CARTE VA SE POSER, elle ne s'évapore pas. Le trajet final relie le
    // geste à son résultat : sur une case valide elle se range dedans, sinon
    // elle revient d'où elle vient. C'est le seul moment où l'on confie
    // l'animation au navigateur plutôt qu'à la boucle.
    clone.style.transition = animation.reussi
      ? 'transform .19s cubic-bezier(.2,.9,.3,1), opacity .19s ease-out'
      : 'transform .3s cubic-bezier(.34,1.56,.64,1), opacity .3s ease-out';
    clone.style.transform =
      `translate3d(${animation.x}px, ${animation.y}px, 0) rotate(0deg) scale(${animation.reussi ? 0.96 : 1})`;
    clone.style.opacity = '0';
    window.setTimeout(() => clone.remove(), animation.reussi ? 200 : 310);
  }, []);

  /** Fabrique le clone qui suivra le pointeur. */
  const souleverCarte = useCallback((p: Prise) => {
    const clone = p.source.cloneNode(true) as HTMLElement;
    clone.className = `${p.source.className} ct-fantome`;
    clone.removeAttribute('data-depot');
    clone.setAttribute('aria-hidden', 'true');
    clone.style.width = `${p.largeur}px`;
    clone.style.height = `${p.hauteur}px`;
    document.body.appendChild(clone);
    fantome.current = clone;

    const x = pointeur.current.x - p.decalageX;
    const y = pointeur.current.y - p.decalageY;
    rendu.current = { x, y, angle: 0 };
    clone.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    document.body.classList.add('ct-glisse-en-cours');
    ouvert.current = true;
    setIdEnGlisse(p.joueurId);

    if (mouvementReduit()) {
      const suivre = () => {
        const c = fantome.current;
        const q = prise.current;
        if (!c || !q) return;
        c.style.transform =
          `translate3d(${pointeur.current.x - q.decalageX}px, ${pointeur.current.y - q.decalageY}px, 0)`;
        boucle.current = requestAnimationFrame(suivre);
      };
      boucle.current = requestAnimationFrame(suivre);
      return;
    }

    // La boucle : la carte rattrape le pointeur avec un peu de retard, et
    // s'incline dans le sens de sa course. C'est ce retard qui lui donne du
    // poids — collée au curseur, elle ressemble à un calque, pas à un carton.
    const animer = () => {
      const c = fantome.current;
      const q = prise.current;
      if (!c || !q) return;
      const viseeX = pointeur.current.x - q.decalageX;
      const viseeY = pointeur.current.y - q.decalageY;
      const dx = viseeX - rendu.current.x;
      rendu.current.x += dx * RATTRAPAGE;
      rendu.current.y += (viseeY - rendu.current.y) * RATTRAPAGE;
      const vise = Math.max(-INCLINAISON_MAX, Math.min(INCLINAISON_MAX, dx * 0.55));
      rendu.current.angle += (vise - rendu.current.angle) * 0.18;
      c.style.transform = `translate3d(${rendu.current.x}px, ${rendu.current.y}px, 0)`
        + ` rotate(${rendu.current.angle.toFixed(2)}deg) scale(1.07)`;
      boucle.current = requestAnimationFrame(animer);
    };
    boucle.current = requestAnimationFrame(animer);
  }, []);

  /** La case sous le pointeur, s'il y en a une. */
  const depotSousPointeur = useCallback((): { cle: CleDepot; rect: DOMRect } | null => {
    const clone = fantome.current;
    if (clone) clone.style.visibility = 'hidden';
    const sous = document.elementFromPoint(pointeur.current.x, pointeur.current.y);
    if (clone) clone.style.visibility = '';
    const case_ = sous instanceof Element ? sous.closest<HTMLElement>('[data-depot]') : null;
    if (!case_) return null;
    return { cle: case_.dataset.depot!, rect: case_.getBoundingClientRect() };
  }, []);

  useEffect(() => {
    const deplacer = (e: PointerEvent) => {
      const p = prise.current;
      if (!p || e.pointerId !== p.pointerId) return;
      pointeur.current = { x: e.clientX, y: e.clientY };

      if (!ouvert.current) {
        const distance = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
        // Au doigt, bouger avant la fin de l'appui = défiler, pas déplacer.
        if (p.tactile) { if (distance > TOLERANCE_APPUI) ranger(); return; }
        if (distance < SEUIL_SOURIS) return;
        souleverCarte(p);
      }

      const cible = depotSousPointeur();
      setCibleDepot((actuelle) => {
        const suivante = cible && cible.cle !== p.origine ? cible.cle : null;
        return actuelle === suivante ? actuelle : suivante;
      });
    };

    const lacher = (e: PointerEvent) => {
      const p = prise.current;
      if (!p || e.pointerId !== p.pointerId) return;
      if (!ouvert.current) { ranger(); return; }

      glisseRecente.current = performance.now();
      const cible = depotSousPointeur();
      if (cible && cible.cle !== p.origine) {
        // La carte se range dans la case visée avant que l'état ne change.
        ranger({ x: cible.rect.left, y: cible.rect.top, reussi: true });
        surDepotRef.current(cible.cle, p.joueurId);
        return;
      }
      const retour = p.source.getBoundingClientRect();
      ranger({ x: retour.left, y: retour.top, reussi: false });
    };

    const annuler = (e: PointerEvent) => {
      if (prise.current && e.pointerId === prise.current.pointerId) ranger();
    };
    const echapper = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && prise.current) {
        const retour = prise.current.source.getBoundingClientRect();
        ranger({ x: retour.left, y: retour.top, reussi: false });
      }
    };
    // ⚠️ NON PASSIF, ET C'EST TOUT L'INTÉRÊT : c'est le seul écouteur qui peut
    // empêcher le défilement pendant qu'on déplace une carte au doigt.
    const bloquerDefilement = (e: TouchEvent) => {
      if (ouvert.current) e.preventDefault();
    };

    window.addEventListener('pointermove', deplacer);
    window.addEventListener('pointerup', lacher);
    window.addEventListener('pointercancel', annuler);
    window.addEventListener('keydown', echapper);
    window.addEventListener('touchmove', bloquerDefilement, { passive: false });
    return () => {
      window.removeEventListener('pointermove', deplacer);
      window.removeEventListener('pointerup', lacher);
      window.removeEventListener('pointercancel', annuler);
      window.removeEventListener('keydown', echapper);
      window.removeEventListener('touchmove', bloquerDefilement);
      ranger();
    };
  }, [depotSousPointeur, ranger, souleverCarte]);

  const poignee = useCallback((joueurId: string | undefined, origine: CleDepot | null) => {
    if (!joueurId) return {};
    return {
      style: { touchAction: 'pan-y' as const },
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        // Clic droit, clic molette, ou deuxième doigt : on ne s'en mêle pas.
        if (e.button !== 0 || prise.current) return;
        const source = e.currentTarget as HTMLElement;
        const rect = source.getBoundingClientRect();
        const tactile = e.pointerType !== 'mouse';
        pointeur.current = { x: e.clientX, y: e.clientY };
        prise.current = {
          joueurId, origine, pointerId: e.pointerId, tactile, source,
          x0: e.clientX, y0: e.clientY,
          decalageX: e.clientX - rect.left, decalageY: e.clientY - rect.top,
          largeur: rect.width, hauteur: rect.height,
        };
        if (tactile) {
          minuterie.current = window.setTimeout(() => {
            if (prise.current) souleverCarte(prise.current);
          }, DELAI_APPUI);
        }
      },
    };
  }, [souleverCarte]);

  const vientDeGlisser = useCallback(
    () => performance.now() - glisseRecente.current < 250,
    [],
  );

  return useMemo(
    () => ({ idEnGlisse, cibleDepot, enCours: idEnGlisse !== null, poignee, vientDeGlisser }),
    [idEnGlisse, cibleDepot, poignee, vientDeGlisser],
  );
}
