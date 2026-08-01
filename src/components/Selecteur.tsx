import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Liste déroulante maison : un <select> natif ne peut afficher ni drapeau ni
// style personnalisé (le menu est rendu par l'OS). Celui-ci suit le thème du
// jeu, accepte une vignette (drapeau/emoji), des groupes et une recherche.

export interface OptionSelecteur {
  valeur: string;
  label: string;
  sous?: string; // ligne secondaire (ville…)
  vignette?: React.ReactNode; // drapeau SVG, emoji, blason…
  groupe?: string;
}

interface Props {
  id?: string;
  options: OptionSelecteur[];
  valeur: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
  /** Affiche un champ de recherche (auto au-delà de 10 options). */
  recherche?: boolean;
}

export function Selecteur({
  id,
  options,
  valeur,
  onChange,
  placeholder = 'Choisir…',
  recherche,
}: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [filtre, setFiltre] = useState('');
  const [survol, setSurvol] = useState(0);
  const racine = useRef<HTMLDivElement>(null);
  const champRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  // On ne fait défiler la liste que pour le clavier : sinon le simple survol
  // de la souris à l'ouverture ferait sauter la liste sous le curseur.
  const parClavier = useRef(false);
  const autoId = useId();
  const listeId = id ?? autoId;

  const avecRecherche = recherche ?? options.length > 10;
  const selection = options.find((o) => o.valeur === valeur);

  const filtrees = useMemo(() => {
    if (!filtre.trim()) return options;
    const q = filtre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    return options.filter((o) =>
      `${o.label} ${o.sous ?? ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .includes(q),
    );
  }, [options, filtre]);

  // Fermeture au clic extérieur
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (racine.current && !racine.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    };
    document.addEventListener('mousedown', dehors);
    return () => document.removeEventListener('mousedown', dehors);
  }, [ouvert]);

  // À l'ouverture : focus recherche + curseur sur la sélection courante
  useEffect(() => {
    if (!ouvert) {
      setFiltre('');
      return;
    }
    const i = filtrees.findIndex((o) => o.valeur === valeur);
    setSurvol(i >= 0 ? i : 0);
    if (avecRecherche) champRef.current?.focus();
    // Positionne la liste sur la sélection courante à l'ouverture
    requestAnimationFrame(() => {
      const el = listeRef.current?.querySelector<HTMLElement>(`[data-i="${i >= 0 ? i : 0}"]`);
      el?.scrollIntoView({ block: 'center' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  // Garde l'option visible pendant la navigation au clavier
  useEffect(() => {
    if (!ouvert || !parClavier.current || !listeRef.current) return;
    parClavier.current = false;
    const el = listeRef.current.querySelector<HTMLElement>(`[data-i="${survol}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [survol, ouvert]);

  const choisir = (v: string) => {
    onChange(v);
    setOuvert(false);
  };

  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOuvert(false);
      return;
    }
    if (!ouvert && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOuvert(true);
      return;
    }
    if (!ouvert) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      parClavier.current = true;
      setSurvol((i) => Math.min(filtrees.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      parClavier.current = true;
      setSurvol((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtrees[survol];
      if (o) choisir(o.valeur);
    }
  };

  // Insère les entêtes de groupe dans la liste rendue
  const rendu: React.ReactNode[] = [];
  let groupeCourant: string | undefined;
  filtrees.forEach((o, i) => {
    if (o.groupe && o.groupe !== groupeCourant) {
      groupeCourant = o.groupe;
      rendu.push(
        <div className="sel-groupe" key={`g-${o.groupe}`}>
          {o.groupe}
        </div>,
      );
    }
    rendu.push(
      <button
        type="button"
        key={o.valeur}
        data-i={i}
        className={`sel-option ${o.valeur === valeur ? 'choisie' : ''} ${i === survol ? 'survol' : ''}`}
        onClick={() => choisir(o.valeur)}
        onMouseEnter={() => setSurvol(i)}
      >
        {o.vignette && <span className="sel-vignette">{o.vignette}</span>}
        <span className="sel-textes">
          <span className="sel-label">{o.label}</span>
          {o.sous && <span className="sel-sous">{o.sous}</span>}
        </span>
        {o.valeur === valeur && <span className="sel-check">✓</span>}
      </button>,
    );
  });

  return (
    <div className="selecteur" ref={racine}>
      <button
        type="button"
        id={listeId}
        className={`sel-declencheur ${ouvert ? 'ouvert' : ''}`}
        onClick={() => setOuvert((o) => !o)}
        onKeyDown={clavier}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
      >
        {selection?.vignette && <span className="sel-vignette">{selection.vignette}</span>}
        <span className="sel-textes">
          <span className="sel-label">{selection?.label ?? placeholder}</span>
          {selection?.sous && <span className="sel-sous">{selection.sous}</span>}
        </span>
        <span className="sel-chevron" aria-hidden>▾</span>
      </button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            className="sel-menu"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {avecRecherche && (
              <div className="sel-recherche">
                <input
                  ref={champRef}
                  type="text"
                  value={filtre}
                  placeholder="Rechercher…"
                  onChange={(e) => {
                    setFiltre(e.target.value);
                    setSurvol(0);
                  }}
                  onKeyDown={clavier}
                  spellCheck={false}
                />
              </div>
            )}
            <div className="sel-liste" ref={listeRef}>
              {rendu.length ? rendu : <div className="sel-vide">Aucun résultat</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
