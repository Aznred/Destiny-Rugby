import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { t } from '../lib/i18n';
import { Icone } from './Icone';

// Liste déroulante maison : un <select> natif ne peut afficher ni drapeau ni
// style personnalisé (le menu est rendu par l'OS). Celui-ci suit le thème du
// jeu, accepte une vignette (drapeau/emoji), des groupes et une recherche.
//
// ⚠️ LE MENU EST POSÉ DANS UN PORTAIL, ET CE N'EST PAS UN DÉTAIL. Il vivait en
// `position:absolute` sous son déclencheur : il suffisait alors d'UN ancêtre en
// `overflow:hidden` ou `overflow-y:auto` pour le rogner. Le bureau de
// l'entraîneur en est plein — les panneaux à hauteur bornée, `.carte`, les
// cartes de dossiers — si bien qu'une liste ouverte près du bas d'un panneau
// n'affichait que ses deux premières options, sans le moindre message. En
// `position:fixed` dans `document.body`, plus aucun conteneur ne peut le
// couper ; en contrepartie il faut le repositionner à la main (voir `placer`).

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

/** Où poser le menu, en coordonnées de fenêtre. */
interface Position {
  gauche: number;
  largeur: number;
  /** Renseigné quand le menu s'ouvre vers le bas. */
  haut?: number;
  /** Renseigné quand il se retourne vers le haut, faute de place. */
  bas?: number;
  /** La hauteur disponible : le menu ne dépasse jamais l'écran. */
  hauteurMax: number;
}

/** L'air qu'on laisse entre le menu et le bord de la fenêtre. */
const MARGE_ECRAN = 12;
/** En dessous, l'ouverture vers le bas n'a plus de sens : on retourne. */
const PLACE_MINIMALE = 180;
/**
 * Un menu n'est jamais plus étroit que ça, même sous un déclencheur minuscule.
 *
 * ⚠️ CE NOMBRE REMPLACE DEUX RÈGLES CSS AD HOC (`.manager-roles-visuels
 * .sel-menu { min-width: 260px }` et son équivalent pour les tactiques) : les
 * déclencheurs de composition font 130 px de large et leurs options portent une
 * note, un poste et une explication. Elles ne pouvaient de toute façon plus
 * s'appliquer une fois le menu sorti dans un portail.
 */
const LARGEUR_MINIMALE = 232;

export function Selecteur({
  id,
  options,
  valeur,
  onChange,
  placeholder,
  recherche,
}: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [filtre, setFiltre] = useState('');
  const [survol, setSurvol] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const racine = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

  /**
   * Aligne le menu sur son déclencheur, en coordonnées de fenêtre.
   *
   * ⚠️ IL S'OUVRE VERS LE HAUT QUAND LE BAS MANQUE. Une liste déclenchée dans
   * le dernier tiers de l'écran sortait par le bas : on voyait le début du menu
   * et il fallait faire défiler la PAGE pour lire le reste, ce qui refermait
   * souvent la liste au passage.
   */
  const placer = useCallback(() => {
    const el = racine.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const sousLeChamp = window.innerHeight - r.bottom - MARGE_ECRAN;
    const auDessus = r.top - MARGE_ECRAN;
    // On ne se retourne que si le bas est vraiment trop court ET que le haut
    // fait mieux : sinon deux ouvertures voisines partiraient dans deux sens.
    const retourner = sousLeChamp < PLACE_MINIMALE && auDessus > sousLeChamp;

    // Assez large pour être lisible, jamais plus large que l'écran, et recalé
    // vers l'intérieur s'il sortait par la droite ou par la gauche.
    const largeur = Math.min(
      Math.max(r.width, LARGEUR_MINIMALE),
      window.innerWidth - MARGE_ECRAN * 2,
    );
    const gauche = Math.min(
      Math.max(MARGE_ECRAN, r.left),
      window.innerWidth - largeur - MARGE_ECRAN,
    );

    setPosition({
      gauche,
      largeur,
      ...(retourner
        ? { bas: window.innerHeight - r.top + 6 }
        : { haut: r.bottom + 6 }),
      hauteurMax: Math.max(PLACE_MINIMALE, retourner ? auDessus : sousLeChamp),
    });
  }, []);

  useLayoutEffect(() => {
    if (ouvert) placer();
  }, [ouvert, placer]);

  // Le menu est en `position:fixed` : il ne suit donc PAS son déclencheur quand
  // la page ou un panneau défile. On le recale, et `capture` est indispensable
  // — le défilement d'un conteneur interne ne remonte pas jusqu'à `window`.
  useEffect(() => {
    if (!ouvert) return;
    const recaler = () => placer();
    window.addEventListener('scroll', recaler, true);
    window.addEventListener('resize', recaler);
    return () => {
      window.removeEventListener('scroll', recaler, true);
      window.removeEventListener('resize', recaler);
    };
  }, [ouvert, placer]);

  // Fermeture au clic extérieur. Le menu vivant hors de `racine`, il faut le
  // tester lui aussi, sinon choisir une option refermerait avant le clic.
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      const cible = e.target as Node;
      if (racine.current?.contains(cible)) return;
      if (menuRef.current?.contains(cible)) return;
      setOuvert(false);
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
    } else if (e.key === 'Home') {
      e.preventDefault();
      parClavier.current = true;
      setSurvol(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      parClavier.current = true;
      setSurvol(filtrees.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtrees[survol];
      if (o) choisir(o.valeur);
    } else if (e.key === 'Tab') {
      setOuvert(false);
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
        role="option"
        aria-selected={o.valeur === valeur}
        className={`sel-option ${o.valeur === valeur ? 'choisie' : ''} ${i === survol ? 'survol' : ''}`}
        onClick={() => choisir(o.valeur)}
        onMouseEnter={() => setSurvol(i)}
      >
        {o.vignette && <span className="sel-vignette">{o.vignette}</span>}
        <span className="sel-textes">
          <span className="sel-label">{o.label}</span>
          {o.sous && <span className="sel-sous">{o.sous}</span>}
        </span>
        {o.valeur === valeur && <span className="sel-check"><Icone nom="check" taille={13} /></span>}
      </button>,
    );
  });

  const menu = position && (
    <motion.div
      // `AnimatePresence` identifie ses enfants par leur clé.
      key="sel-menu"
      ref={menuRef}
      className={`sel-menu ${position.bas !== undefined ? 'vers-haut' : ''}`}
      role="listbox"
      style={{
        left: position.gauche,
        width: position.largeur,
        ...(position.bas !== undefined
          ? { bottom: position.bas }
          : { top: position.haut }),
      }}
      initial={{ opacity: 0, y: position.bas !== undefined ? 6 : -6, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: position.bas !== undefined ? 6 : -6, scale: 0.985 }}
      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {avecRecherche && (
        <div className="sel-recherche">
          <Icone nom="loupe" taille={15} />
          <input
            ref={champRef}
            type="text"
            value={filtre}
            placeholder={t('sel.rechercher')}
            onChange={(e) => {
              setFiltre(e.target.value);
              setSurvol(0);
            }}
            onKeyDown={clavier}
            spellCheck={false}
          />
        </div>
      )}
      <div
        className="sel-liste"
        ref={listeRef}
        // La hauteur suit la place réellement disponible, moins le champ de
        // recherche : c'est ce qui garantit qu'aucun menu ne sort de l'écran.
        style={{ maxHeight: Math.min(320, position.hauteurMax - (avecRecherche ? 58 : 8)) }}
      >
        {rendu.length ? rendu : <div className="sel-vide">{t('sel.aucun')}</div>}
      </div>
    </motion.div>
  );  return (
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
          <span className="sel-label">{selection?.label ?? placeholder ?? t('sel.choisir')}</span>
          {selection?.sous && <span className="sel-sous">{selection.sous}</span>}
        </span>
        <span className="sel-chevron" aria-hidden><Icone nom="chevron" taille={15} /></span>
      </button>

      {createPortal(<AnimatePresence>{ouvert && menu}</AnimatePresence>, document.body)}
    </div>
  );
}
