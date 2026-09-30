import type { PointCombinaison } from './combinaisons';

export interface VueCombinaison { zoom: number; centre: PointCombinaison }
export interface CadreCombinaison { x: number; y: number; largeur: number; hauteur: number }
export interface GesteNavigation {
  vue: VueCombinaison;
  milieu: PointCombinaison;
  ecart: number;
  ancre: PointCombinaison;
}

const borner = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Les limites correspondent au terrain jouable, quelle que soit la vue choisie. */
export function bornerVueCombinaison(vue: VueCombinaison, largeurBase: number): VueCombinaison {
  const zoom = borner(vue.zoom, 1, 3); const largeur = largeurBase / zoom; const hauteur = largeur * .7;
  return { zoom, centre: { x: borner(vue.centre.x, largeur / 2, 100 - largeur / 2), y: borner(vue.centre.y, hauteur / 2, 70 - hauteur / 2) } };
}

function pixelsParMetre(vue: VueCombinaison, largeurBase: number, cadre: CadreCombinaison) {
  const largeur = largeurBase / vue.zoom;
  // Même viewBox que le SVG : marges gauche/droite 3 m, haut 5 m et bas 3 m.
  return Math.min(cadre.largeur / (largeur + 6), cadre.hauteur / (largeur * .7 + 8));
}

function contact(pointeurs: PointCombinaison[]) {
  const [a, b = a] = pointeurs;
  return { milieu: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ecart: b === a ? 0 : Math.hypot(b.x - a.x, b.y - a.y) };
}

export function commencerNavigation(vue: VueCombinaison, pointeurs: PointCombinaison[], largeurBase: number, cadre: CadreCombinaison): GesteNavigation {
  const { milieu, ecart } = contact(pointeurs); const bornee = bornerVueCombinaison(vue, largeurBase);
  const echelle = pixelsParMetre(bornee, largeurBase, cadre);
  return { vue: bornee, milieu, ecart, ancre: {
    x: bornee.centre.x + (milieu.x - cadre.x - cadre.largeur / 2) / echelle,
    y: bornee.centre.y - 1 + (milieu.y - cadre.y - cadre.hauteur / 2) / echelle,
  } };
}

/** Un doigt déplace la carte ; deux doigts gardent le point pincé sous leur milieu. */
export function poursuivreNavigation(geste: GesteNavigation, pointeurs: PointCombinaison[], largeurBase: number, cadre: CadreCombinaison): VueCombinaison {
  const { milieu, ecart } = contact(pointeurs);
  const zoom = borner(geste.ecart > 0 && ecart > 0 ? geste.vue.zoom * ecart / geste.ecart : geste.vue.zoom, 1, 3);
  const echelle = pixelsParMetre({ ...geste.vue, zoom }, largeurBase, cadre);
  return bornerVueCombinaison({ zoom, centre: {
    x: geste.ancre.x - (milieu.x - cadre.x - cadre.largeur / 2) / echelle,
    y: geste.ancre.y + 1 - (milieu.y - cadre.y - cadre.hauteur / 2) / echelle,
  } }, largeurBase);
}
