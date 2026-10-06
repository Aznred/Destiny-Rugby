import { useEffect, useRef } from 'react';

let modalesOuvertes = 0;
let ancienDebordement = '';

const SELECTEUR_FOCUS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// ⚠️ L'ISOLEMENT SE COMPTE, IL NE SE RESTAURE PAS DEPUIS UN INSTANTANÉ.
// Chaque modale gardait l'état d'avant de chaque élément du body et le remettait à
// sa fermeture. Deux modales fermées dans le désordre (la fenêtre du match, puis
// une carte ouverte par-dessus) rendaient alors à #root l'état « inert » capturé
// par la seconde : toute l'application restait morte au toucher, sans erreur.
// Ici l'état d'origine est pris à la PREMIÈRE prise et rendu à la dernière.
const prises = new Map<HTMLElement, { n: number; inert: boolean; ariaHidden: string | null }>();

export function isoler(element: HTMLElement) {
  const prise = prises.get(element);
  if (prise) { prise.n++; return; }
  prises.set(element, { n: 1, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') });
  element.inert = true;
  element.setAttribute('aria-hidden', 'true');
}

export function rendre(element: HTMLElement) {
  const prise = prises.get(element);
  if (!prise || --prise.n > 0) return;
  prises.delete(element);
  element.inert = prise.inert;
  if (prise.ariaHidden == null) element.removeAttribute('aria-hidden');
  else element.setAttribute('aria-hidden', prise.ariaHidden);
}

/**
 * Filet de sécurité : plus aucune modale ouverte, mais quelque chose reste inerte
 * (rotation d'écran, démontage brutal). Rend la main à toute l'application.
 */
export function libererArrierePlan() {
  if (modalesOuvertes > 0 || typeof document === 'undefined') return;
  for (const element of [...prises.keys()]) { prises.delete(element); element.inert = false; element.removeAttribute('aria-hidden'); }
  for (const element of document.body.children) {
    if (element instanceof HTMLElement && element.inert && !element.dataset.inertVoulu) { element.inert = false; element.removeAttribute('aria-hidden'); }
  }
  document.body.style.overflow = ancienDebordement;
}

/** Isole l'arrière-plan, place le focus et le retient dans une modale portal. */
export function useModalDialog(onFermer: () => void) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fermerRef = useRef(onFermer);
  fermerRef.current = onFermer;

  useEffect(() => {
    const overlay = overlayRef.current;
    const dialogue = dialogRef.current;
    if (!overlay || !dialogue) return;
    if (modalesOuvertes++ === 0) { ancienDebordement = document.body.style.overflow; document.body.style.overflow = 'hidden'; }

    const precedent = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const autres = [...document.body.children]
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay);
    for (const element of autres) isoler(element);

    const focusables = () => [...dialogue.querySelectorAll<HTMLElement>(SELECTEUR_FOCUS)]
      .filter((element) => !element.hidden && element.getClientRects().length > 0);
    (focusables()[0] ?? dialogue).focus();

    const clavier = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        fermerRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusables();
      if (!elements.length) {
        event.preventDefault();
        dialogue.focus();
        return;
      }
      const premier = elements[0];
      const dernier = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === premier) {
        event.preventDefault();
        dernier.focus();
      } else if (!event.shiftKey && document.activeElement === dernier) {
        event.preventDefault();
        premier.focus();
      }
    };
    document.addEventListener('keydown', clavier, true);

    return () => {
      document.removeEventListener('keydown', clavier, true);
      if (--modalesOuvertes === 0) document.body.style.overflow = ancienDebordement;
      for (const element of autres) rendre(element);
      precedent?.focus();
    };
  }, []);

  return { overlayRef, dialogRef };
}
