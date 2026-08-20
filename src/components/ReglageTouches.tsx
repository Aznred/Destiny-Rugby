// ⌨️ LES TOUCHES DU MATCH, RÉASSIGNABLES
//
// Demande explicite : « les touches pour plaquer etc. ne sont pas bonnes […] et
// qu'on puisse modifier ces touches dans les paramètres ».
//
// ═══ TROIS CHOIX QUI FONT TOUT ═══════════════════════════════════════════════
//
// 1. **ON CAPTURE LA TOUCHE PHYSIQUE, ON AFFICHE LA TOUCHE ÉCRITE.** `ev.code`
//    (`KeyQ`) est ce qui sert à jouer : il désigne l'emplacement, donc il vaut
//    pour tous les claviers. `ev.key` (« a ») est ce qu'on montre : lui seul
//    connaît la disposition du joueur. Ne garder que le premier donnerait un
//    écran de réglages illisible en AZERTY ; ne garder que le second casserait
//    le jeu au premier clavier QWERTY.
// 2. **LA SOURIS EST UNE TOUCHE COMME UNE AUTRE.** Clic gauche et clic droit
//    s'assignent dans la même liste, avec les mêmes règles — c'est la demande
//    (« clic droit ou gauche pour plaquer, tirer au pied »), et ça évite un
//    second écran pour deux boutons.
// 3. **UNE TOUCHE NE SERT QU'UNE FOIS.** Le store libère l'ancienne liaison
//    avant de poser la nouvelle : sans ça, un même clic déclenchait deux
//    actions et l'une des deux gagnait au hasard de l'ordre de la table.
//
// ⚠️ ÉCHAP ANNULE, SUPPR REMET PAR DÉFAUT. Les deux seules touches qu'on ne peut
// pas assigner — sans elles, une capture ratée enfermerait le joueur dans un
// bouton qui attend éternellement.

import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store/useGame';
import {
  COMMANDES_REGLABLES, LIAISONS_DEFAUT, libelleDeCode,
  type Assignation, type Commande,
} from '../lib/moteur/manette';
import { t } from '../lib/i18n';

export function ReglageTouches() {
  const touchesMatch = useGame((s) => s.touchesMatch);
  const setToucheMatch = useGame((s) => s.setToucheMatch);
  const reinitialiser = useGame((s) => s.reinitialiserTouchesMatch);
  /** La commande en cours de capture, ou `null`. */
  const [capture, setCapture] = useState<Commande | null>(null);
  const captureRef = useRef<Commande | null>(null);
  captureRef.current = capture;

  useEffect(() => {
    if (!capture) return;

    const poser = (a: Assignation | null) => {
      const c = captureRef.current;
      if (!c) return;
      setToucheMatch(c, a);
      setCapture(null);
    };

    const clavier = (ev: KeyboardEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.key === 'Escape') { setCapture(null); return; }
      if (ev.key === 'Delete' || ev.key === 'Backspace') { poser(null); return; }
      // ⚠️ `ev.key` peut valoir « Shift », « Control », « ArrowUp »… Pour une
      // touche imprimable il vaut le caractère ; sinon on retombe sur la
      // traduction du code, qui reste juste pour les modificateurs.
      const brut = ev.key.length === 1 ? ev.key.toUpperCase() : libelleDeCode(ev.code);
      poser({ code: ev.code, libelle: brut });
    };
    const souris = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      poser({ code: `Mouse${ev.button}`, libelle: libelleDeCode(`Mouse${ev.button}`) });
    };
    const menu = (ev: MouseEvent) => ev.preventDefault();

    // `capture: true` : on passe AVANT les gestionnaires de la page, sinon la
    // barre d'espace ferait défiler la modale pendant qu'on l'assigne.
    window.addEventListener('keydown', clavier, true);
    window.addEventListener('mousedown', souris, true);
    window.addEventListener('contextmenu', menu, true);
    return () => {
      window.removeEventListener('keydown', clavier, true);
      window.removeEventListener('mousedown', souris, true);
      window.removeEventListener('contextmenu', menu, true);
    };
  }, [capture, setToucheMatch]);

  const assignation = (c: Commande): Assignation => touchesMatch[c] ?? LIAISONS_DEFAUT[c];
  const modifiee = (c: Commande) => !!touchesMatch[c]
    && touchesMatch[c]?.code !== LIAISONS_DEFAUT[c].code;

  return (
    <details className="reglage-touches">
      <summary>🎮 {t('reg.touches')}</summary>
      <p className="aide">{t('reg.touchesAide')}</p>
      <div className="touches-liste">
        {COMMANDES_REGLABLES.map(({ cle, cleI18n }) => {
          const a = assignation(cle);
          const enCours = capture === cle;
          return (
            <div className="touche-ligne" key={cle} data-modifiee={modifiee(cle) ? 'oui' : undefined}>
              <span className="touche-nom">{t(cleI18n)}</span>
              <button
                type="button"
                className={`touche-cible${enCours ? ' capture' : ''}`}
                aria-label={t('reg.touchesAssigner', { commande: t(cleI18n) })}
                onClick={() => setCapture(enCours ? null : cle)}
              >
                {enCours
                  ? t('reg.touchesEcoute')
                  : a.code
                    ? <kbd>{a.libelle || libelleDeCode(a.code)}</kbd>
                    : <span className="touche-vide">-</span>}
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn fantome" onClick={reinitialiser}>
        ↩️ {t('reg.touchesDefaut')}
      </button>
    </details>
  );
}
