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
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay)
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute('aria-hidden'),
      }));

    for (const { element } of autres) {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    }

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
      for (const { element, inert, ariaHidden } of autres) {
        element.inert = inert;
        if (ariaHidden == null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      }
      precedent?.focus();
    };
  }, []);

  return { overlayRef, dialogRef };
}
