// ═══════════════════════════════════════════════════════════════════════════
// OÙ SE TROUVENT LES CLUBS — et pourquoi un jeune de 16 ans ne signe pas loin
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « chaque région aurait un vivier de jeunes […] donc Toulouse,
// Castres, Colomiers, Montauban se battent pour les mêmes jeunes » et « un
// joueur de 16 ans ne va pas forcément faire 1h30 de route trois fois par
// semaine ».
//
// Les deux ont besoin de la même chose : une POSITION. Le jeu n'en avait
// aucune — `Club` porte un `ville?` pour 370 clubs sur 756, et rien d'autre.
//
// ⚠️ CE QUI EST EXACT ET CE QUI NE L'EST PAS, DIT FRANCHEMENT.
//
//   · Les 13 régions, leurs centres et leur POIDS RUGBY sont réels : la
//     répartition des licenciés FFR est massivement concentrée dans le
//     Sud-Ouest, et c'est elle qui fait qu'un vivier occitan sort plus de
//     joueurs qu'un vivier normand.
//   · `VILLES` porte les COORDONNÉES RÉELLES des villes de rugby
//     reconnaissables — tout le Top 14, la Pro D2, la Nationale, la
//     Nationale 2, la Fédérale 1 et l'essentiel des Fédérale 2. C'est là que
//     se joue la concurrence dont parle la demande, donc c'est là qu'il
//     fallait être juste au kilomètre près.
//   · **Les clubs de village non listés sont placés par TIRAGE**, pondéré par
//     le poids rugby de chaque région. La répartition d'ensemble est donc
//     correcte — dense dans le Sud-Ouest, clairsemée en Bretagne — mais un
//     club pris isolément peut être ailleurs qu'en vrai. On ne prétend pas le
//     contraire, et le jeu ne montre jamais « région » comme un fait : il
//     montre une DISTANCE, qui est ce dont la mécanique a besoin.
//
// ⚠️ ET LE TIRAGE EST DÉTERMINISTE (graine = nom du club). Un club ne
// déménage pas parce qu'on relance le jeu, et rien n'a besoin d'être
// sauvegardé — même règle que les effectifs et les championnats.

import { graine } from '../lib/championnat';
import { clubParNom } from './clubs';

export interface RegionRugby {
  id: string;
  nom: string;
  /** Centre approximatif de la région, en degrés. */
  lat: number;
  lon: number;
  /** Rayon d'étalement, en kilomètres : de quoi disperser les clubs dedans. */
  rayon: number;
  /**
   * Le POIDS RUGBY de la région — sa part de licenciés, pas sa population.
   * C'est lui qui décide combien de jeunes naissent ici chaque année.
   */
  poids: number;
  /**
   * La qualité MOYENNE d'un jeune du cru, en points de note. Une terre de
   * rugby ne produit pas seulement PLUS de joueurs : elle en produit de
   * meilleurs, parce qu'on y joue depuis l'école et que la concurrence locale
   * est plus rude.
   */
  qualite: number;
}

export const REGIONS: RegionRugby[] = [
  { id: 'occitanie', nom: 'Occitanie', lat: 43.75, lon: 2.20, rayon: 190, poids: 22, qualite: 4.0 },
  { id: 'nouvelleaquitaine', nom: 'Nouvelle-Aquitaine', lat: 45.10, lon: 0.15, rayon: 210, poids: 19, qualite: 3.6 },
  { id: 'auvergnerhonealpes', nom: 'Auvergne-Rhône-Alpes', lat: 45.50, lon: 4.60, rayon: 175, poids: 13, qualite: 1.6 },
  { id: 'iledefrance', nom: 'Île-de-France', lat: 48.80, lon: 2.40, rayon: 55, poids: 11, qualite: 1.0 },
  { id: 'paca', nom: "Provence-Alpes-Côte d'Azur", lat: 43.80, lon: 5.95, rayon: 130, poids: 8, qualite: 1.2 },
  { id: 'grandest', nom: 'Grand Est', lat: 48.65, lon: 5.60, rayon: 195, poids: 4, qualite: -1.4 },
  { id: 'paysdelaloire', nom: 'Pays de la Loire', lat: 47.50, lon: -0.80, rayon: 120, poids: 4, qualite: -0.8 },
  { id: 'bourgognefranchecomte', nom: 'Bourgogne-Franche-Comté', lat: 47.20, lon: 4.80, rayon: 155, poids: 3.5, qualite: -1.2 },
  { id: 'bretagne', nom: 'Bretagne', lat: 48.20, lon: -2.90, rayon: 130, poids: 3.5, qualite: -1.0 },
  { id: 'hautsdefrance', nom: 'Hauts-de-France', lat: 50.00, lon: 2.80, rayon: 145, poids: 3.5, qualite: -1.3 },
  { id: 'centrevaldeloire', nom: 'Centre-Val de Loire', lat: 47.50, lon: 1.70, rayon: 135, poids: 3, qualite: -1.0 },
  { id: 'normandie', nom: 'Normandie', lat: 49.10, lon: 0.10, rayon: 125, poids: 3, qualite: -1.1 },
  { id: 'corse', nom: 'Corse', lat: 42.15, lon: 9.10, rayon: 60, poids: 0.5, qualite: -2.0 },
];

export function region(id: string): RegionRugby {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

/**
 * LES VILLES DE RUGBY, AVEC LEURS VRAIES COORDONNÉES.
 *
 * ⚠️ UNE RÉGION NE SUFFIT PAS, ET LA PREMIÈRE VERSION L'A PROUVÉ. Elle plaçait
 * chaque club reconnu au hasard DANS sa région : Toulouse et Colomiers, qui
 * sont à dix kilomètres l'un de l'autre, ressortaient à **129 km**, et Paris
 * et Nanterre à 95. La demande décrit précisément l'inverse — « Toulouse,
 * Castres, Colomiers, Montauban se battent pour les mêmes jeunes » — et un
 * réseau de détection « 50 km autour du club » n'aurait jamais attrapé la
 * banlieue de sa propre ville.
 *
 * Les villes qui portent la mécanique ont donc leur latitude et leur longitude
 * réelles : tout le Top 14, la Pro D2, la Nationale, la Nationale 2 et la
 * Fédérale 1, plus les villes de rugby reconnaissables des étages du dessous.
 *
 * ⚠️ LA RECHERCHE ACCEPTE UNE INCLUSION, et les clés sont essayées de la plus
 * LONGUE à la plus courte : sinon « saint-jean-de-luz » serait attrapé par
 * « saint-jean » et un club basque se retrouverait dans le Tarn.
 */
type Lieu = [number, number, string];

const VILLES: Record<string, Lieu> = {
  // ── Top 14 ───────────────────────────────────────────────────────────────
  toulouse: [43.60, 1.44, 'occitanie'],
  bordeaux: [44.84, -0.58, 'nouvelleaquitaine'],
  'la rochelle': [46.16, -1.15, 'nouvelleaquitaine'],
  paris: [48.86, 2.35, 'iledefrance'],
  nanterre: [48.89, 2.21, 'iledefrance'],
  toulon: [43.12, 5.93, 'paca'],
  castres: [43.61, 2.24, 'occitanie'],
  'clermont-ferrand': [45.78, 3.08, 'auvergnerhonealpes'],
  pau: [43.30, -0.37, 'nouvelleaquitaine'],
  perpignan: [42.70, 2.90, 'occitanie'],
  lyon: [45.76, 4.84, 'auvergnerhonealpes'],
  montpellier: [43.61, 3.88, 'occitanie'],
  bayonne: [43.49, -1.48, 'nouvelleaquitaine'],
  vannes: [47.66, -2.76, 'bretagne'],
  // ── Pro D2 ───────────────────────────────────────────────────────────────
  montauban: [44.02, 1.35, 'occitanie'],
  colomiers: [43.61, 1.33, 'occitanie'],
  'aix-en-provence': [43.53, 5.45, 'paca'],
  oyonnax: [46.26, 5.66, 'auvergnerhonealpes'],
  'valence romans': [44.93, 4.89, 'auvergnerhonealpes'],
  'brive-la-gaillarde': [45.16, 1.53, 'nouvelleaquitaine'],
  agen: [44.20, 0.62, 'nouvelleaquitaine'],
  grenoble: [45.19, 5.72, 'auvergnerhonealpes'],
  angouleme: [45.65, 0.16, 'nouvelleaquitaine'],
  biarritz: [43.48, -1.56, 'nouvelleaquitaine'],
  dax: [43.71, -1.05, 'nouvelleaquitaine'],
  beziers: [43.34, 3.22, 'occitanie'],
  nevers: [46.99, 3.16, 'bourgognefranchecomte'],
  aurillac: [44.93, 2.44, 'auvergnerhonealpes'],
  nice: [43.70, 7.27, 'paca'],
  narbonne: [43.18, 3.00, 'occitanie'],
  // ── Nationale ────────────────────────────────────────────────────────────
  albi: [43.93, 2.15, 'occitanie'],
  'mont-de-marsan': [43.89, -0.50, 'nouvelleaquitaine'],
  chambery: [45.56, 5.92, 'auvergnerhonealpes'],
  carcassonne: [43.21, 2.35, 'occitanie'],
  massy: [48.73, 2.28, 'iledefrance'],
  perigueux: [45.18, 0.72, 'nouvelleaquitaine'],
  suresnes: [48.87, 2.23, 'iledefrance'],
  'bourgoin-jallieu': [45.59, 5.27, 'auvergnerhonealpes'],
  'bourg-en-bresse': [46.21, 5.23, 'auvergnerhonealpes'],
  rennes: [48.11, -1.68, 'bretagne'],
  rouen: [49.44, 1.10, 'normandie'],
  'marcq-en-baroeul': [50.67, 3.10, 'hautsdefrance'],
  niort: [46.32, -0.46, 'nouvelleaquitaine'],
  tarbes: [43.23, 0.07, 'occitanie'],
  // ── Nationale 2 ──────────────────────────────────────────────────────────
  vienne: [45.52, 4.87, 'auvergnerhonealpes'],
  orleans: [47.90, 1.90, 'centrevaldeloire'],
  fleurance: [43.85, 0.66, 'occitanie'],
  macon: [46.31, 4.83, 'bourgognefranchecomte'],
  'valence d agen': [44.11, 0.89, 'occitanie'],
  annonay: [45.24, 4.67, 'auvergnerhonealpes'],
  floirac: [44.83, -0.52, 'nouvelleaquitaine'],
  peyrehorade: [43.55, -1.11, 'nouvelleaquitaine'],
  aubenas: [44.62, 4.39, 'auvergnerhonealpes'],
  auch: [43.65, 0.59, 'occitanie'],
  nimes: [43.84, 4.36, 'occitanie'],
  rumilly: [45.87, 5.94, 'auvergnerhonealpes'],
  tricastin: [44.35, 4.72, 'auvergnerhonealpes'],
  mauleon: [43.22, -0.88, 'nouvelleaquitaine'],
  graulhet: [43.76, 1.99, 'occitanie'],
  'saint-jean-de-luz': [43.39, -1.66, 'nouvelleaquitaine'],
  geneve: [46.20, 6.14, 'auvergnerhonealpes'],
  'saint-medard-en-jalles': [44.89, -0.72, 'nouvelleaquitaine'],
  langon: [44.55, -0.25, 'nouvelleaquitaine'],
  'stade metropolitain': [48.90, 2.30, 'iledefrance'],
  nantes: [47.22, -1.55, 'paysdelaloire'],
  salles: [44.55, -0.87, 'nouvelleaquitaine'],
  'la seyne-sur-mer': [43.10, 5.88, 'paca'],
  tyrosse: [43.66, -1.34, 'nouvelleaquitaine'],
  drancy: [48.93, 2.45, 'iledefrance'],
  marmande: [44.50, 0.17, 'nouvelleaquitaine'],
  // ── Fédérale 1 ───────────────────────────────────────────────────────────
  layrac: [44.14, 0.65, 'nouvelleaquitaine'],
  monaco: [43.73, 7.42, 'paca'],
  'pont-long': [43.35, -0.38, 'nouvelleaquitaine'],
  soustons: [43.75, -1.33, 'nouvelleaquitaine'],
  anglet: [43.48, -1.51, 'nouvelleaquitaine'],
  'bievre saint-geoirs': [45.34, 5.30, 'auvergnerhonealpes'],
  bedarrides: [44.04, 4.89, 'paca'],
  gruissan: [43.11, 3.09, 'occitanie'],
  beauvais: [49.43, 2.08, 'hautsdefrance'],
  blagnac: [43.64, 1.39, 'occitanie'],
  sarlat: [44.89, 1.22, 'nouvelleaquitaine'],
  "berre-l etang": [43.48, 5.17, 'paca'],
  'nuits-saint-georges': [47.13, 4.95, 'bourgognefranchecomte'],
  cahors: [44.45, 1.44, 'occitanie'],
  lannemezan: [43.12, 0.38, 'occitanie'],
  ceret: [42.49, 2.75, 'occitanie'],
  lourdes: [43.10, -0.05, 'occitanie'],
  oloron: [43.19, -0.61, 'nouvelleaquitaine'],
  grenade: [43.77, 1.29, 'occitanie'],
  'paris uc': [48.85, 2.34, 'iledefrance'],
  auxerre: [47.80, 3.57, 'bourgognefranchecomte'],
  chateaurenard: [43.88, 4.85, 'paca'],
  castelnaudary: [43.32, 1.95, 'occitanie'],
  courbevoie: [48.90, 2.25, 'iledefrance'],
  palavas: [43.53, 3.93, 'occitanie'],
  agde: [43.31, 3.48, 'occitanie'],
  mazamet: [43.49, 2.38, 'occitanie'],
  royan: [45.63, -1.03, 'nouvelleaquitaine'],
  'saint-girons': [42.98, 1.15, 'occitanie'],
  'sor agout': [43.55, 2.10, 'occitanie'],
  leucate: [42.91, 3.03, 'occitanie'],
  tulle: [45.27, 1.77, 'nouvelleaquitaine'],
  'bagneres-de-bigorre': [43.06, 0.15, 'occitanie'],
  'gujan-mestras': [44.63, -1.07, 'nouvelleaquitaine'],
  limoges: [45.83, 1.26, 'nouvelleaquitaine'],
  annecy: [45.90, 6.13, 'auvergnerhonealpes'],
  issoire: [45.54, 3.25, 'auvergnerhonealpes'],
  "l isle-jourdain": [43.61, 1.08, 'occitanie'],
  montmelian: [45.50, 6.05, 'auvergnerhonealpes'],
  nafarroa: [43.36, -1.31, 'nouvelleaquitaine'],
  'saint-sulpice-sur-leze': [43.33, 1.30, 'occitanie'],
  tours: [47.39, 0.69, 'centrevaldeloire'],
  gaillac: [43.90, 1.90, 'occitanie'],
  'barbezieux-jonzac': [45.47, -0.15, 'nouvelleaquitaine'],
  'saint-malo': [48.65, -2.03, 'bretagne'],
  'xv du coudon': [43.15, 6.02, 'paca'],
  // ── Fédérale 2 et villes de rugby des étages du dessous ──────────────────
  sarcelles: [48.99, 2.38, 'iledefrance'],
  merignac: [44.84, -0.65, 'nouvelleaquitaine'],
  antony: [48.75, 2.30, 'iledefrance'],
  lavaur: [43.70, 1.82, 'occitanie'],
  castanet: [43.51, 1.50, 'occitanie'],
  'avignon le pontet': [43.95, 4.86, 'paca'],
  avignon: [43.95, 4.81, 'paca'],
  boucau: [43.53, -1.44, 'nouvelleaquitaine'],
  bourges: [47.08, 2.40, 'centrevaldeloire'],
  castelsarrasin: [44.04, 1.11, 'occitanie'],
  lormont: [44.88, -0.52, 'nouvelleaquitaine'],
  'saint-raphael frejus': [43.43, 6.77, 'paca'],
  illkirch: [48.53, 7.72, 'grandest'],
  clichy: [48.90, 2.31, 'iledefrance'],
  gennevilliers: [48.93, 2.30, 'iledefrance'],
  nontron: [45.53, 0.66, 'nouvelleaquitaine'],
  'villefranche-sur-saone': [45.99, 4.72, 'auvergnerhonealpes'],
  'lons-le-saunier': [46.67, 5.55, 'bourgognefranchecomte'],
  leguevin: [43.60, 1.23, 'occitanie'],
  'corbieres xv': [43.05, 2.70, 'occitanie'],
  'emak hor': [43.48, -1.50, 'nouvelleaquitaine'],
  aramits: [43.12, -0.72, 'nouvelleaquitaine'],
  gimont: [43.63, 0.88, 'occitanie'],
  evreux: [49.02, 1.15, 'normandie'],
  'saint-claude': [46.39, 5.86, 'bourgognefranchecomte'],
  'villefranche-de-lauragais': [43.40, 1.71, 'occitanie'],
  'la roche-sur-yon': [46.67, -1.43, 'paysdelaloire'],
  figeac: [44.61, 2.03, 'occitanie'],
  gan: [43.22, -0.38, 'nouvelleaquitaine'],
  hasparren: [43.38, -1.30, 'nouvelleaquitaine'],
  prades: [42.62, 2.42, 'occitanie'],
  'levezou segala': [44.10, 2.60, 'occitanie'],
  lombez: [43.47, 0.90, 'occitanie'],
  'maisons-laffitte': [48.95, 2.14, 'iledefrance'],
  oursbelille: [43.28, 0.03, 'occitanie'],
  plaisir: [48.82, 1.95, 'iledefrance'],
  amiens: [49.89, 2.30, 'hautsdefrance'],
  'arpajon veinazes': [44.79, 2.44, 'auvergnerhonealpes'],
  'paris xv': [48.84, 2.29, 'iledefrance'],
  rillieux: [45.82, 4.90, 'auvergnerhonealpes'],
  roubaix: [50.69, 3.17, 'hautsdefrance'],
  "les sables-d olonne": [46.50, -1.78, 'paysdelaloire'],
  versailles: [48.80, 2.13, 'iledefrance'],
  vichy: [46.13, 3.42, 'auvergnerhonealpes'],
  vincennes: [48.85, 2.44, 'iledefrance'],
  grasse: [43.66, 6.92, 'paca'],
  'la saudrune': [43.53, 1.35, 'occitanie'],
  'clermont-cournon': [45.74, 3.20, 'auvergnerhonealpes'],
  'rion-morcenx': [44.03, -0.90, 'nouvelleaquitaine'],
  rodez: [44.35, 2.57, 'occitanie'],
  'andrezieux-boutheon': [45.53, 4.25, 'auvergnerhonealpes'],
  aubagne: [43.29, 5.57, 'paca'],
  'pays de meaux': [48.96, 2.89, 'iledefrance'],
  'les angles': [43.95, 4.75, 'paca'],
  'montesson-chatou': [48.90, 2.13, 'iledefrance'],
  riom: [45.89, 3.11, 'auvergnerhonealpes'],
  'chalon-sur-saone': [46.78, 4.85, 'bourgognefranchecomte'],
  'le rheu': [48.10, -1.79, 'bretagne'],
  rieumes: [43.41, 1.11, 'occitanie'],
  'scuf paris': [48.83, 2.32, 'iledefrance'],
  'marseille smuc': [43.28, 5.40, 'paca'],
  marseille: [43.30, 5.37, 'paca'],
  millau: [44.10, 3.08, 'occitanie'],
  'saint-priest': [45.70, 4.94, 'auvergnerhonealpes'],
  salanque: [42.76, 2.97, 'occitanie'],
  'servian-boujan': [43.42, 3.30, 'occitanie'],
  decazeville: [44.56, 2.25, 'occitanie'],
  'beaumont-de-lomagne': [43.88, 0.99, 'occitanie'],
  belves: [44.78, 1.01, 'nouvelleaquitaine'],
  'stade bordelais': [44.86, -0.60, 'nouvelleaquitaine'],
  caen: [49.18, -0.37, 'normandie'],
  navarrenx: [43.32, -0.75, 'nouvelleaquitaine'],
  voiron: [45.36, 5.59, 'auvergnerhonealpes'],
  pezenas: [43.46, 3.42, 'occitanie'],
  cavaillon: [43.84, 5.04, 'paca'],
  saverdun: [43.23, 1.58, 'occitanie'],
  vergt: [45.03, 0.71, 'nouvelleaquitaine'],
  montelimar: [44.56, 4.75, 'auvergnerhonealpes'],
  'argeles-gazost': [43.00, -0.10, 'occitanie'],
  bazas: [44.43, -0.21, 'nouvelleaquitaine'],
  'canton d alban': [43.89, 2.46, 'occitanie'],
  castillon: [44.85, -0.03, 'nouvelleaquitaine'],
  caussade: [44.16, 1.53, 'occitanie'],
  'coarraze-nay': [43.16, -0.26, 'nouvelleaquitaine'],
  meyzieu: [45.77, 5.00, 'auvergnerhonealpes'],
  morlaas: [43.34, -0.25, 'nouvelleaquitaine'],
  mouguerre: [43.47, -1.42, 'nouvelleaquitaine'],
  mugron: [43.75, -0.75, 'nouvelleaquitaine'],
  'ris-orangis': [48.65, 2.41, 'iledefrance'],
  vinay: [45.21, 5.41, 'auvergnerhonealpes'],
  casteljaloux: [44.32, 0.09, 'nouvelleaquitaine'],
  'nantua haut-bugey': [46.15, 5.61, 'auvergnerhonealpes'],
  bergerac: [44.85, 0.48, 'nouvelleaquitaine'],
  'quillan-limoux': [43.06, 2.19, 'occitanie'],
  'ger-seron': [43.32, -0.15, 'nouvelleaquitaine'],
  'xv de la dombes': [45.99, 5.02, 'auvergnerhonealpes'],
  // ── Autres villes de rugby, pour les étages régionaux ────────────────────
  champagnole: [46.75, 5.91, 'bourgognefranchecomte'],
  saintes: [45.75, -0.63, 'nouvelleaquitaine'],
  'cergy pontoise': [49.04, 2.06, 'iledefrance'],
  'st genis laval': [45.70, 4.79, 'auvergnerhonealpes'],
  'bassoues lupiac': [43.62, 0.20, 'occitanie'],
  pierrefeucain: [42.85, 2.85, 'occitanie'],
  'fleury les aubrais': [47.93, 1.93, 'centrevaldeloire'],
  'rhone sporti': [45.75, 4.85, 'auvergnerhonealpes'],
  marseillais: [43.30, 5.37, 'paca'],
  parentis: [44.35, -1.08, 'nouvelleaquitaine'],
  chartreuse: [45.35, 5.85, 'auvergnerhonealpes'],
  orsay: [48.70, 2.19, 'iledefrance'],
  teillois: [47.35, -1.30, 'paysdelaloire'],
  sablais: [46.50, -1.78, 'paysdelaloire'],
  loudun: [47.01, 0.08, 'nouvelleaquitaine'],
  cognac: [45.70, -0.33, 'nouvelleaquitaine'],
  orthez: [43.49, -0.77, 'nouvelleaquitaine'],
  hagetmau: [43.66, -0.59, 'nouvelleaquitaine'],
  poitiers: [46.58, 0.34, 'nouvelleaquitaine'],
  libourne: [44.91, -0.24, 'nouvelleaquitaine'],
  ustaritz: [43.40, -1.46, 'nouvelleaquitaine'],
  hendaye: [43.37, -1.77, 'nouvelleaquitaine'],
  'saint-junien': [45.89, 0.90, 'nouvelleaquitaine'],
  gueret: [46.17, 1.87, 'nouvelleaquitaine'],
  muret: [43.46, 1.33, 'occitanie'],
  'saint-gaudens': [43.11, 0.72, 'occitanie'],
  'saint-orens': [43.55, 1.53, 'occitanie'],
  cugnaux: [43.54, 1.34, 'occitanie'],
  lezignan: [43.20, 2.76, 'occitanie'],
  sete: [43.40, 3.70, 'occitanie'],
  lunel: [43.68, 4.14, 'occitanie'],
  mende: [44.52, 3.50, 'occitanie'],
  ales: [44.13, 4.08, 'occitanie'],
  'villeneuve-sur-lot': [44.41, 0.70, 'nouvelleaquitaine'],
  moissac: [44.10, 1.09, 'occitanie'],
  condom: [43.96, 0.37, 'occitanie'],
  mirande: [43.51, 0.41, 'occitanie'],
  'vic-en-bigorre': [43.39, 0.05, 'occitanie'],
  'saint-affrique': [43.95, 2.88, 'occitanie'],
  gourdon: [44.74, 1.38, 'occitanie'],
  souillac: [44.90, 1.48, 'occitanie'],
  revel: [43.46, 2.01, 'occitanie'],
  carmaux: [44.05, 2.15, 'occitanie'],
  lacaune: [43.71, 2.69, 'occitanie'],
  'saint-etienne': [45.44, 4.39, 'auvergnerhonealpes'],
  'la voulte': [44.80, 4.78, 'auvergnerhonealpes'],
  privas: [44.74, 4.60, 'auvergnerhonealpes'],
  'le puy': [45.04, 3.89, 'auvergnerhonealpes'],
  moulins: [46.57, 3.33, 'auvergnerhonealpes'],
  montlucon: [46.34, 2.60, 'auvergnerhonealpes'],
  thiers: [45.86, 3.55, 'auvergnerhonealpes'],
  'saint-denis': [48.94, 2.36, 'iledefrance'],
  bobigny: [48.91, 2.44, 'iledefrance'],
  creteil: [48.79, 2.46, 'iledefrance'],
  rueil: [48.88, 2.18, 'iledefrance'],
  colombes: [48.92, 2.25, 'iledefrance'],
  melun: [48.54, 2.66, 'iledefrance'],
  etampes: [48.43, 2.16, 'iledefrance'],
  rambouillet: [48.64, 1.83, 'iledefrance'],
  cannes: [43.55, 7.02, 'paca'],
  antibes: [43.58, 7.13, 'paca'],
  hyeres: [43.12, 6.13, 'paca'],
  draguignan: [43.54, 6.47, 'paca'],
  gap: [44.56, 6.08, 'paca'],
  'salon-de-provence': [43.64, 5.10, 'paca'],
  arles: [43.68, 4.63, 'paca'],
  orange: [44.14, 4.81, 'paca'],
  carpentras: [44.06, 5.05, 'paca'],
  manosque: [43.83, 5.79, 'paca'],
  brest: [48.39, -4.49, 'bretagne'],
  quimper: [47.996, -4.10, 'bretagne'],
  lorient: [47.75, -3.37, 'bretagne'],
  'saint-brieuc': [48.51, -2.77, 'bretagne'],
  angers: [47.47, -0.55, 'paysdelaloire'],
  'le mans': [48.00, 0.20, 'paysdelaloire'],
  laval: [48.07, -0.77, 'paysdelaloire'],
  cholet: [47.06, -0.88, 'paysdelaloire'],
  'saint-nazaire': [47.27, -2.21, 'paysdelaloire'],
  'le havre': [49.49, 0.11, 'normandie'],
  cherbourg: [49.64, -1.62, 'normandie'],
  alencon: [48.43, 0.09, 'normandie'],
  dieppe: [49.92, 1.08, 'normandie'],
  lisieux: [49.15, 0.23, 'normandie'],
  blois: [47.59, 1.33, 'centrevaldeloire'],
  chartres: [48.44, 1.49, 'centrevaldeloire'],
  chateauroux: [46.81, 1.69, 'centrevaldeloire'],
  vierzon: [47.22, 2.07, 'centrevaldeloire'],
  dreux: [48.74, 1.37, 'centrevaldeloire'],
  strasbourg: [48.58, 7.75, 'grandest'],
  metz: [49.12, 6.18, 'grandest'],
  nancy: [48.69, 6.18, 'grandest'],
  reims: [49.26, 4.03, 'grandest'],
  mulhouse: [47.75, 7.34, 'grandest'],
  colmar: [48.08, 7.36, 'grandest'],
  troyes: [48.30, 4.08, 'grandest'],
  epinal: [48.17, 6.45, 'grandest'],
  lille: [50.63, 3.06, 'hautsdefrance'],
  arras: [50.29, 2.78, 'hautsdefrance'],
  dunkerque: [51.03, 2.38, 'hautsdefrance'],
  compiegne: [49.42, 2.83, 'hautsdefrance'],
  soissons: [49.38, 3.32, 'hautsdefrance'],
  valenciennes: [50.36, 3.52, 'hautsdefrance'],
  dijon: [47.32, 5.04, 'bourgognefranchecomte'],
  besancon: [47.24, 6.02, 'bourgognefranchecomte'],
  belfort: [47.64, 6.86, 'bourgognefranchecomte'],
  sens: [48.20, 3.28, 'bourgognefranchecomte'],
  bastia: [42.70, 9.45, 'corse'],
  ajaccio: [41.93, 8.74, 'corse'],
};

/** Les clés, de la plus longue à la plus courte — voir l'avertissement ci-dessus. */
const CLES_TRIEES = Object.keys(VILLES).sort((a, b) => b.length - a.length);

export function cleLieu(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface PositionClub {
  region: string;
  lat: number;
  lon: number;
  /** Vrai si la ville a été reconnue, faux si la région a été tirée. */
  place: boolean;
}

const cache = new Map<string, PositionClub>();

/**
 * OÙ EST CE CLUB ?
 *
 * Deux chemins, et ils ne se valent pas :
 *
 *   1. **la ville est reconnue** → on rend ses VRAIES coordonnées, et un club
 *      voisin est vraiment voisin. C'est ce qui fait exister « Toulouse,
 *      Castres, Colomiers et Montauban se battent pour les mêmes jeunes » ;
 *   2. **elle ne l'est pas** (un club de village) → on tire une région,
 *      pondérée par son poids rugby, et on disperse dedans. La carte
 *      d'ensemble reste juste — dense au sud de la Garonne, clairsemée en
 *      Bretagne — même quand un village précis est mal placé.
 *
 * ⚠️ ON DISPERSE LE TIRAGE, JAMAIS LA VILLE RECONNUE. La première version
 * dispersait les deux, « pour que deux clubs ne soient pas au même point » :
 * Toulouse et Colomiers, dix kilomètres en vrai, ressortaient alors à 129 km,
 * et Paris à Nanterre à 95. Un réseau de détection « 50 km autour du club »
 * n'attrapait même pas la banlieue de sa propre ville, et l'exemple de la
 * demande devenait impossible.
 *
 * ⚠️ ET LA DISPERSION SE FAIT EN RACINE CARRÉE du tirage : la surface d'une
 * couronne croît avec le rayon, si bien qu'un tirage linéaire agglutinerait
 * tout le monde au centre de la région.
 */
export function positionDuClub(nomDuClub: string): PositionClub {
  const memo = cache.get(nomDuClub);
  if (memo) return memo;

  // ⚠️ ON RÉSOUT LA VILLE ICI, ET NULLE PART AILLEURS. Les appelants passaient
  // tantôt le NOM du club, tantôt sa VILLE — et les deux ne donnent pas le même
  // lieu : « Stade Toulousain » ne contient pas la chaîne « toulouse », donc le
  // club le plus important du jeu était placé PAR TIRAGE pendant que le même
  // club, appelé avec « Toulouse », tombait sur la place du Capitole. Mesuré :
  // un jeune « à moins de 60 km de Toulouse » jouait en réalité près de La
  // Rochelle. Un point d'entrée unique, qui prend toujours le nom du club, rend
  // ce désaccord impossible.
  const fiche = clubParNom(nomDuClub);
  const cle = cleLieu(fiche?.ville ?? nomDuClub);
  const villeReconnue = CLES_TRIEES.find((k) => cle.includes(k));
  let pos: PositionClub;

  if (villeReconnue) {
    const [lat, lon, idRegion] = VILLES[villeReconnue];
    pos = { region: idRegion, lat, lon, place: true };
  } else {
    const rng = graine(`geo#${nomDuClub}`);
    const total = REGIONS.reduce((s, r) => s + r.poids, 0);
    let tir = rng() * total;
    let idRegion = REGIONS[REGIONS.length - 1].id;
    for (const r of REGIONS) {
      tir -= r.poids;
      if (tir <= 0) { idRegion = r.id; break; }
    }
    const r = region(idRegion);
    const angle = rng() * Math.PI * 2;
    const rayon = Math.sqrt(rng()) * r.rayon;
    pos = {
      region: r.id,
      lat: r.lat + (rayon * Math.cos(angle)) / 111,
      lon: r.lon + (rayon * Math.sin(angle)) / (111 * Math.cos((r.lat * Math.PI) / 180)),
      place: false,
    };
  }
  cache.set(nomDuClub, pos);
  return pos;
}

/** Distance à vol d'oiseau, en kilomètres (formule de haversine). */
export function distanceKm(a: PositionClub, b: PositionClub): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}
