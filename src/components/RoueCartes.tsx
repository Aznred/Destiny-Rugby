// LA ROUE DES CARTES DU MARCHÉ — le présentoir de la boutique, avec des cartes.
//
// ⚠️ ELLE NE RÉAGISSAIT PAS COMME CELLE DES PACKS, ET C'ÉTAIT LE RETOUR DE JEU.
// Deux défauts, tous les deux visibles dès la première seconde :
//
//  1. LE GESTE N'ARRIVAIT QU'À LA FIN. `onPointerMove` se contentait de mesurer
//     la distance parcourue ; rien ne bougeait tant que le doigt n'était pas
//     relâché, et la roue sautait alors d'un cran sec. Le présentoir des packs,
//     lui, SUIT la main image par image et se cale ensuite en douceur. On reprend
//     donc sa mécanique : une position continue, une cible, un amortissement
//     exponentiel (`1 - exp(-dt·9)`), et le geste écrit dans la cible.
//  2. LES CARTES SE CHEVAUCHAIENT. Les places étaient posées tous les 45°
//     (`slot·π/4`) sur un demi-tour : la 3ᵉ à gauche revenait exactement sur la
//     1ʳᵉ à droite (sin 135° = sin 45°), d'où l'empilement au premier plan. Les
//     places sont maintenant réparties sur un TOUR ENTIER, comme les pochettes
//     de la boutique : ce qui est derrière est derrière, et rien ne se superpose.
//
// ⚠️ LA ROTATION LIBRE S'ARRÊTE DÈS QU'ON TOUCHE À LA ROUE. La boutique peut
// tourner sans fin, c'est une vitrine ; ici on CHOISIT une carte, et le panneau
// de vente s'ouvre juste en dessous. Une roue qui continue de dériver pendant
// qu'on lit la fiche déplacerait la carte qu'on vient de désigner.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CarteCarriere } from '../lib/ligue/typesCarriere';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import './RoueCartes.css';

const modulo = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Sept places sur le cercle : le découpage exact du présentoir de packs.
 *
 * ⚠️ NEUF PLACES MONTRENT PLUS DE CARTES, ET C'EST PIRE. Essayé : cinq joueurs
 * de face au lieu de trois, mais une carte est deux fois plus large qu'une
 * pochette de pack — à 40° d'écart, sur une scène de 800 px, les voisines se
 * recouvraient d'un tiers. Sept places laissent le trio de tête respirer, et
 * les deux suivantes passent DERRIÈRE le plan, où le recouvrement se lit comme
 * de la profondeur.
 */
const PLACES = 7;
/** L'écart au plus large, en pixels, ramené à la largeur réelle de la scène. */
const RAYON = 340;
/**
 * De combien la carte de tête AVANCE vers l'œil — jamais de combien les autres
 * reculent.
 *
 * ⚠️ UN `translateZ` NÉGATIF REND LA CARTE INCLIQUABLE. La scène porte
 * `transform-style: preserve-3d` : une carte posée derrière son plan (z < 0)
 * est dessinée SOUS le fond de la scène, et le test de survol suit le dessin —
 * `elementFromPoint` ne renvoyait plus que la carte centrale, les six autres
 * étaient décoratives. Le relief se fabrique donc en avançant celle de devant
 * (z de 0 à +130), et l'ordre d'empilement se déduit tout seul de la
 * profondeur, `z-index` étant ignoré dans un contexte 3D.
 */
const PROFONDEUR = 130;
/** Les pixels de glissement qui valent une place. */
const GLISSE = 150;
/** Au-delà, le geste est un glissement et non un clic sur une carte. */
const SEUIL = 6;

interface Mouvement {
  position: number;
  cible: number;
  glisse: boolean;
  calme: boolean;
  touchee: boolean;
}

export function RoueCartes({ cartes, onChoisir, selection, selections, titre, vide = 'Aucun joueur ne correspond à ta recherche.' }: {
  cartes: CarteCarriere[]; onChoisir: (id: string) => void; selection?: string; selections?: string[]; titre: string; vide?: string;
}) {
  // Une nouvelle recherche remet la roue sur son premier résultat.
  return <Roue key={cartes.map((c) => c.id).join('|')} cartes={cartes} onChoisir={onChoisir} selection={selection} selections={selections} titre={titre} vide={vide} />;
}

function Roue({ cartes, onChoisir, selection, selections, titre, vide }: Parameters<typeof RoueCartes>[0]) {
  const n = cartes.length;
  const visibles = Math.min(PLACES, n);
  const [centre, setCentre] = useState(0);
  const centreRef = useRef(0);
  const scene = useRef<HTMLDivElement>(null);
  const noeuds = useRef<(HTMLButtonElement | null)[]>([]);
  const rayon = useRef(RAYON);
  const mouvement = useRef<Mouvement>({ position: 0, cible: 0, glisse: false, touchee: false, calme: false });
  const geste = useRef({ x: 0, depart: 0, distance: 0 });
  const ignorer = useRef(0);

  // Le rendu des cartes ne dépend que de la place ENTIÈRE au centre ; le reste
  // du mouvement est continu et s'écrit directement dans les transformations.
  const placer = useCallback(() => {
    const m = mouvement.current;
    const decalage = Math.floor(visibles / 2);
    for (const [i, noeud] of noeuds.current.entries()) {
      if (!noeud) continue;
      const angle = (centreRef.current + i - decalage - m.position) * Math.PI * 2 / PLACES;
      const devant = (Math.cos(angle) + 1) / 2;
      noeud.style.transform = `translate3d(calc(-50% + ${(Math.sin(angle) * rayon.current).toFixed(1)}px), 0, ${(devant * PROFONDEUR).toFixed(1)}px)`
        + ` rotateY(${(-angle * 22).toFixed(1)}deg) scale(${(0.74 + devant * 0.26).toFixed(3)})`;
      noeud.style.opacity = (0.3 + devant * 0.7).toFixed(2);
    }
  }, [visibles]);

  useLayoutEffect(() => { placer(); }, [placer, centre]);

  // ⚠️ LE RAYON ET LA LARGEUR DES CARTES SE MESURENT, ILS NE SE DÉCLARENT PAS.
  // Les transformations sont écrites en JavaScript : une règle `@media` ne peut
  // plus les rattraper. Et les deux vont ensemble — sept places sur un cercle
  // n'entrent dans 375 px que si la carte rétrécit avec la scène. La géométrie
  // impose `largeur ≥ 3,1 × carte` pour que les voisines ne se recouvrent pas ;
  // en dessous, on rétrécit la carte plutôt que d'empiler.
  useEffect(() => {
    const mesurer = () => {
      const largeur = scene.current?.clientWidth ?? 0;
      rayon.current = Math.min(RAYON, largeur * 0.4);
      scene.current?.style.setProperty('--rc-carte', `${Math.min(190, Math.round(largeur / 3.1))}px`);
      placer();
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    if (scene.current) observateur.observe(scene.current);
    return () => observateur.disconnect();
  }, [placer]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const calmer = () => { mouvement.current.calme = media.matches; };
    calmer();
    media.addEventListener('change', calmer);
    let image = 0;
    let precedent = performance.now();
    const animer = (maintenant: number) => {
      const m = mouvement.current;
      const dt = Math.min((maintenant - precedent) / 1000, 0.05);
      precedent = maintenant;
      // La dérive d'accueil : elle montre que la roue tourne, puis s'efface.
      // En dessous de trois cartes il n'y a pas de roue à montrer — la seule
      // carte du marché partirait tourner derrière elle-même.
      if (n > 2 && !m.glisse && !m.calme && !m.touchee) m.cible += dt * 0.16;
      m.position += (m.cible - m.position) * (1 - Math.exp(-dt * 9));
      placer();
      const prochain = Math.round(m.position);
      if (prochain !== centreRef.current) { centreRef.current = prochain; setCentre(prochain); }
      image = requestAnimationFrame(animer);
    };
    image = requestAnimationFrame(animer);
    return () => { cancelAnimationFrame(image); media.removeEventListener('change', calmer); };
  }, [placer, n]);

  const tourner = (pas: number) => {
    const m = mouvement.current;
    m.touchee = true;
    m.cible = Math.round(m.cible) + pas;
  };

  if (!n) return <div className="rc-vide"><h3>{titre}</h3><p>{vide}</p></div>;

  const affiche = modulo(centre, n);
  const decalage = Math.floor(visibles / 2);
  return <section className="rc" aria-label={titre}>
    <header><h3>{titre}</h3><span>{affiche + 1} / {n} joueurs</span></header>
    <div
      className="rc-scene" ref={scene} tabIndex={0} role="group"
      aria-label="Roue de cartes. Flèches pour tourner, Entrée pour choisir."
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); tourner(e.key === 'ArrowRight' ? 1 : -1); }
        if (e.key === 'Enter') { e.preventDefault(); mouvement.current.touchee = true; onChoisir(cartes[affiche].id); }
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const m = mouvement.current;
        m.glisse = true;
        m.touchee = true;
        // On repart de la position VUE, pas de la cible : sinon la roue saute
        // en avant au moment où on la saisit en plein amortissement.
        m.cible = m.position;
        geste.current = { x: e.clientX, depart: m.position, distance: 0 };
      }}
      onPointerMove={(e) => {
        const m = mouvement.current;
        if (!m.glisse) return;
        const dx = e.clientX - geste.current.x;
        geste.current.distance = Math.max(geste.current.distance, Math.abs(dx));
        if (Math.abs(dx) > SEUIL) e.currentTarget.setPointerCapture(e.pointerId);
        m.cible = geste.current.depart - dx / GLISSE;
      }}
      onPointerUp={(e) => {
        const m = mouvement.current;
        m.glisse = false;
        // On se cale sur la place la plus proche : une carte de marché se
        // regarde de face, elle ne s'arrête pas en biais.
        m.cible = Math.round(m.cible);
        if (geste.current.distance > SEUIL) ignorer.current = performance.now() + 300;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        mouvement.current.glisse = false;
        mouvement.current.cible = Math.round(mouvement.current.cible);
        ignorer.current = performance.now() + 300;
      }}
    >
      <div className="rc-anneau" />
      {Array.from({ length: visibles }, (_, i) => {
        const place = centre + i - decalage;
        const carte = cartes[modulo(place, n)];
        const choisie = selections ? selections.includes(carte.id) : selection === carte.id;
        return <button
          type="button" key={carte.id} ref={(noeud) => { noeuds.current[i] = noeud; }}
          className={`rc-carte${choisie ? ' choisie' : ''}`}
          aria-label={`${choisie && selections ? 'Retirer' : 'Choisir'} ${carte.nom}, ${carte.note} GEN`} aria-pressed={choisie}
          onClick={() => {
            if (performance.now() < ignorer.current) return;
            mouvement.current.touchee = true;
            mouvement.current.cible = place;
            onChoisir(carte.id);
          }}
        ><CarteJoueurEnLigne carte={carte} /></button>;
      })}
    </div>
    <footer>
      <button type="button" disabled={n < 2} aria-label="Joueur précédent" onClick={() => tourner(-1)}>←</button>
      <span>Glisse pour tourner · Clique sur une carte</span>
      <button type="button" disabled={n < 2} aria-label="Joueur suivant" onClick={() => tourner(1)}>→</button>
    </footer>
  </section>;
}
