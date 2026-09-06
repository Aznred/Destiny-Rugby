// LA TACTIQUE — c'est ici que le rugby se joue.
//
// Deux structures, écrites comme un entraîneur les dessine au tableau.
//
// ═══ EN ATTAQUE : les pods 2-2-3-1 ═══════════════════════════════════════════
// Les huit avants ne courent pas derrière le ballon : ils sont répartis en
// BLOCS (« pods ») étagés sur la largeur — deux au ras côté fermé, deux au ras
// côté ouvert, trois au premier temps à vingt mètres, un au large. Derrière eux,
// la ligne de trois-quarts est étagée en oblique : le 10 à dix mètres de
// profondeur, le 12 en dehors, le 13 encore plus loin, l'ailier au bord de la
// touche et l'arrière prêt à s'intercaler. Chaque phase choisit son bloc : on
// percute au ras pour attirer la défense, puis on écarte à l'aile dans l'espace
// libéré.
//
// ═══ EN DÉFENSE : ligne + second rideau ══════════════════════════════════════
// PREMIER RIDEAU : douze joueurs à plat, espacés de quatre mètres, qui montent
// ENSEMBLE — en blitz (montée agressive dans les épaules) ou en défense glissée
// (on pousse l'attaque vers la touche). La ligne a sa propre inertie : elle part
// de la ligne de hors-jeu au ruck et avance à sa vitesse propre.
// SECOND RIDEAU : l'arrière au fond, l'ailier du côté fermé qui décroche en
// pendule, et le demi de mêlée en sentinelle derrière la ligne. C'est EUX qui
// couvrent le jeu au pied — sans ce rideau, la moindre chandelle valait un essai.

import type { Pion } from './entites.js';
import { PHASES_ARRETEES, type EtatMatch, type SystemeDefensif } from './etat.js';
import {
  AXE, LARGEUR, LIGNE_A, LIGNE_B, adverse, borner, coteOuvert, distance, distance2,
  ligneDefendue, melanger, metresAvantLaLigne, sens, type Cote, type Vec,
} from './terrain.js';

// ---------------------------------------------------------------------------
// Utilitaires partagés
// ---------------------------------------------------------------------------

export function surLeTerrain(e: EtatMatch, cote: Cote): Pion[] {
  const sortie: Pion[] = [];
  for (const p of e.pions) if (p.cote === cote && p.surLeTerrain) sortie.push(p);
  return sortie;
}

export function numero(liste: Pion[], n: number): Pion | undefined {
  for (const p of liste) if (p.numero === n) return p;
  return undefined;
}

export function plusProche(cible: Vec, liste: Pion[]): Pion | null {
  let meilleur: Pion | null = null;
  let d = Infinity;
  for (const p of liste) {
    const dd = distance2(cible, p.pos);
    if (dd < d) { d = dd; meilleur = p; }
  }
  return meilleur;
}

const MARGE = 3.2; // on ne colle jamais un joueur à la ligne de touche
function bornerY(y: number): number { return borner(y, MARGE, LARGEUR - MARGE); }

// ⚠️ ON NE SE PLACE JAMAIS DANS SON PROPRE EN-BUT.
// Les cibles n'étaient bornées QUE sur la largeur : un ouvreur à dix-sept mètres
// de profondeur, alors que son équipe joue à huit mètres de sa propre ligne, se
// voyait assigner une position DERRIÈRE la ligne d'essai. Mesuré avant
// correction : 8,7 % des cibles et 7,6 % des positions étaient dans un en-but,
// en plein jeu courant. Sur un terrain de rugby on se replace au maximum sur sa
// ligne : la structure se comprime, elle ne sort pas du terrain.
const MARGE_X = 1.5;
export function bornerX(x: number): number {
  return borner(x, LIGNE_A + MARGE_X, LIGNE_B - MARGE_X);
}

// ⚠️ RÉPARTIR PLUTÔT QUE RABOTER — c'est ce qui supprime le « nuage ».
// Chaque cible en largeur passait par `bornerY`, qui RABOTE : dès que le ballon
// approchait d'une touche, cinq ou six joueurs se voyaient assigner exactement
// la même valeur (3,2 m ou 66,8 m). À l'écran, ça donnait une ligne de pions
// empilés le long du bord, et un paquet au milieu du reste. Mesuré : un tas de
// 9 joueurs dans un cercle de 8 m sur 34 % des cibles, jusqu'à 23 d'un coup.
//
// Ici, on garde l'ORDRE voulu et on impose un écart minimal entre voisins, en
// repliant vers l'intérieur ce qui déborde. L'écart se resserre tout seul quand
// il y a trop de monde pour la largeur disponible : personne n'est jamais
// superposé, et la ligne reste dans le bon ordre.
function repartirY(pions: Pion[], ecartMin: number): void {
  const n = pions.length;
  if (n < 2) {
    if (n === 1) pions[0].cible.y = bornerY(pions[0].cible.y);
    return;
  }
  const bas = MARGE;
  const haut = LARGEUR - MARGE;
  const ecart = Math.min(ecartMin, (haut - bas) / (n - 1));
  // On travaille sur l'ordre RÉEL des cibles : deux joueurs qui se croisent sont
  // remis dans l'ordre, ce qui évite les rideaux « noués ».
  const ordre = [...pions].sort((a, b) => a.cible.y - b.cible.y);
  const y = ordre.map((p) => borner(p.cible.y, bas, haut));
  for (let i = 1; i < n; i++) if (y[i] < y[i - 1] + ecart) y[i] = y[i - 1] + ecart;
  if (y[n - 1] > haut) {
    y[n - 1] = haut;
    for (let i = n - 2; i >= 0; i--) if (y[i] > y[i + 1] - ecart) y[i] = y[i + 1] - ecart;
  }
  for (let i = 0; i < n; i++) ordre[i].cible.y = borner(y[i], bas, haut);
}

// ---------------------------------------------------------------------------
// L'ATTAQUE
// ---------------------------------------------------------------------------

// Profondeur (en mètres derrière la ligne d'avantage) de chaque poste de la
// ligne de trois-quarts. Ce sont les distances réelles d'une attaque lancée.
const PROFONDEUR: Record<number, number> = {
  9: 1.2, 10: 9.5, 12: 11.5, 13: 12.5, 11: 13, 14: 13, 15: 17,
};

function structurerAttaque(e: EtatMatch, liste: Pion[], cote: Cote): void {
  const s = sens(cote);
  const ouvert = e.ouvert;
  const porteur = e.porteur && e.porteur.cote === cote ? e.porteur : null;
  // La ligne d'avantage : le porteur s'il y en a un, sinon le ballon. Elle donne
  // la PROFONDEUR.
  const ancre: Vec = porteur ? porteur.pos : e.ballon;
  // ⚠️ LA LARGEUR, elle, est ancrée au POINT DE DÉPART DE LA PHASE. Un pod
  // d'avants ne traverse pas le terrain derrière le ballon : il est posé au
  // lancement et il tient sa position. Sans ça, les huit avants suivaient le
  // porteur d'un bord à l'autre et les trente joueurs finissaient en paquet
  // (mesuré : 11 joueurs en moyenne dans un cercle de 8 m, jusqu'à 23).
  const largeur = e.origine ? e.origine.y : ancre.y;
  const lancement = e.lancement;

  // ── Qui est déjà dans la chaîne de passes ? Ceux-là courent une ligne de
  // soutien autour du porteur, pas une position de structure.
  const rangDansChaine = new Map<Pion, number>();
  if (lancement && porteur) {
    for (let i = lancement.index + 1; i < lancement.chaine.length; i++) {
      rangDansChaine.set(lancement.chaine[i], i - lancement.index);
    }
  }

  const avants: Pion[] = [];
  const arrieres: Pion[] = [];
  for (const p of liste) {
    if (p === porteur) continue;
    (p.avant ? avants : arrieres).push(p);
  }

  // ── LES PODS D'AVANTS ────────────────────────────────────────────────────
  // Les plus proches du ballon percutent au ras, les autres s'étagent au large.
  avants.sort((a, b) => distance2(ancre, a.pos) - distance2(ancre, b.pos));
  // 2 au ras côté fermé · 2 au ras côté ouvert · 3 au premier temps · 1 au large
  // ⚠️ Les pods sont ÉCARTÉS. Un bloc à six mètres du ruck, ça fait un tas :
  // avec les cinq joueurs du regroupement, les deux gardiens adverses et le 9,
  // on comptait onze joueurs dans un cercle de huit mètres. Le premier bloc est
  // donc à dix mètres, le deuxième à vingt-deux, le troisième au large.
  const GABARIT: { dy: number; dx: number; role: Pion['role'] }[] = [
    { dy: 10, dx: 2.4, role: 'podRas' },
    { dy: 14, dx: 3.0, role: 'podRas' },
    { dy: -10, dx: 2.4, role: 'aileFerme' },
    { dy: -15, dx: 3.4, role: 'aileFerme' },
    { dy: 22, dx: 4.6, role: 'podMilieu' },
    { dy: 26, dx: 5.2, role: 'podMilieu' },
    { dy: 30, dx: 5.8, role: 'podMilieu' },
    { dy: 38, dx: 6.6, role: 'podLarge' },
  ];
  // Les avants qui tiennent une position de structure (les autres courent une
  // ligne de soutien) : on les répartit ENSEMBLE sur la largeur, pour que deux
  // pods ne se retrouvent jamais au même endroit quand le ballon est près d'une
  // touche.
  const podsStructures: Pion[] = [];
  for (let i = 0; i < avants.length; i++) {
    const p = avants[i];
    const r = rangDansChaine.get(p);
    if (r != null) { ligneDeSoutien(p, ancre, s, ouvert, r); continue; }
    const g = GABARIT[i] ?? GABARIT[GABARIT.length - 1];
    p.role = g.role;
    p.cible = {
      x: bornerX(ancre.x - s * g.dx),
      y: largeur + ouvert * g.dy,
    };
    podsStructures.push(p);
  }
  repartirY(podsStructures, 6);

  // ── LA LIGNE DE TROIS-QUARTS ─────────────────────────────────────────────
  const largeOuvert = ouvert === 1 ? LARGEUR - largeur : largeur; // espace jusqu'à la touche ouverte
  const compression = borner(largeOuvert / 42, 0.45, 1); // ballon près de la touche = ligne resserrée
  const quinzeIntercale = !!lancement && (lancement.type === 'large' || lancement.type === 'saute');

  const ligneTroisQuarts: Pion[] = [];
  for (const p of arrieres) {
    const r = rangDansChaine.get(p);
    if (r != null) { ligneDeSoutien(p, ancre, s, ouvert, r); continue; }

    const prof = PROFONDEUR[p.numero] ?? 12;
    let dy: number;
    switch (p.numero) {
      case 9:
        p.role = 'demi';
        p.cible = { x: bornerX(ancre.x - s * 1.4), y: bornerY(ancre.y - ouvert * 1.6) };
        continue;
      case 10: p.role = 'ouvreur'; dy = 11 * compression; break;
      case 12: p.role = 'ligne'; dy = 22 * compression; break;
      case 13: p.role = 'ligne'; dy = 32 * compression; break;
      case 15:
        // L'arrière s'intercale dans la ligne quand on écarte, sinon il reste
        // en soutien de profondeur (et prêt à relancer un coup de pied).
        p.role = quinzeIntercale ? 'ligne' : 'arriere';
        dy = quinzeIntercale ? 40 * compression : -4;
        break;
      default: {
        // Les ailiers : celui du côté ouvert au bord de la touche, celui du
        // côté fermé en soutien arrière (il couvre aussi le contre).
        const sonBord = p.numero === 11 ? 0 : LARGEUR;
        const ouvertBord = ouvert === 1 ? LARGEUR : 0;
        if (sonBord === ouvertBord) {
          p.role = 'ligne';
          p.cible = { x: bornerX(ancre.x - s * prof), y: bornerY(ouvertBord + (ouvert === 1 ? -6 : 6)) };
        } else {
          p.role = 'aileFerme';
          p.cible = { x: bornerX(ancre.x - s * (prof + 6)), y: bornerY(sonBord + (sonBord === 0 ? 9 : -9)) };
        }
        continue;
      }
    }
    // ⚠️ Largeur ancrée au point de départ de la phase, profondeur au porteur :
    // la ligne de trois-quarts MONTE avec le ballon sans se recoller dessus.
    p.cible = { x: bornerX(ancre.x - s * prof), y: largeur + ouvert * dy };
    ligneTroisQuarts.push(p);
  }
  // La ligne de trois-quarts s'étage vraiment : cinq mètres au minimum entre
  // deux joueurs, même quand le ballon sort d'un ruck collé à la touche.
  repartirY(ligneTroisQuarts, 5);
}

// La ligne de soutien d'un receveur : en dehors et légèrement en retrait du
// porteur, comme une ligne de trois-quarts qui monte ensemble.
function ligneDeSoutien(p: Pion, ancre: Vec, s: number, ouvert: number, rang: number): void {
  p.role = 'ligne';
  p.cible = {
    x: bornerX(ancre.x - s * (1.6 + rang * 1.5)),
    y: bornerY(ancre.y + ouvert * (rang * 8.5)),
  };
}

// ---------------------------------------------------------------------------
// LA DÉFENSE
// ---------------------------------------------------------------------------

function structurerDefense(e: EtatMatch, liste: Pion[], cote: Cote): void {
  const sa = sens(adverse(cote));   // sens de progression de l'ATTAQUE
  const ouvert = e.ouvert;
  const porteur = e.porteur;
  const ancre: Vec = porteur ? porteur.pos : e.ballon;
  const systeme = e.systeme;

  const dispo = liste.filter((p) => p.sanction <= 0);
  if (!dispo.length) return;

  // ── LE SECOND RIDEAU (couverture du jeu au pied) ─────────────────────────
  // Profondeur adaptée à la menace : très bas quand l'attaque est loin (le
  // coup de pied est probable), remonté quand elle arrive près de la ligne.
  const distLigne = metresAvantLaLigne(ancre, adverse(cote));
  const profondeurFond = distLigne > 55 ? 30 : distLigne > 30 ? 24 : distLigne > 18 ? 17 : 11;

  const arriere = numero(dispo, 15);
  const ailierFerme = ouvert === 1 ? numero(dispo, 11) : numero(dispo, 14);
  const sentinelle = numero(dispo, 9);

  const rideau2 = new Set<Pion>();
  if (arriere) {
    arriere.role = 'rideau2';
    arriere.cible = {
      x: bornerX(ancre.x + sa * profondeurFond),
      y: bornerY(melanger(ancre.y, AXE, 0.55)),
    };
    rideau2.add(arriere);
  }
  if (ailierFerme) {
    ailierFerme.role = 'rideau2';
    const sonBord = ailierFerme.numero === 11 ? 0 : LARGEUR;
    ailierFerme.cible = {
      x: bornerX(ancre.x + sa * profondeurFond * 0.72),
      y: bornerY(sonBord + (sonBord === 0 ? 13 : -13)),
    };
    rideau2.add(ailierFerme);
  }
  if (sentinelle) {
    // La sentinelle garde le couloir du ruck : chandelle, rasant, percée du 9.
    sentinelle.role = 'sentinelle';
    sentinelle.cible = {
      x: bornerX(ancre.x + sa * 8.5),
      y: bornerY(ancre.y - ouvert * 4),
    };
    rideau2.add(sentinelle);
  }

  // ── LE PREMIER RIDEAU ────────────────────────────────────────────────────
  const ligne = dispo.filter((p) => !rideau2.has(p));
  if (!ligne.length) return;

  const espaceOuvert = ouvert === 1 ? LARGEUR - ancre.y : ancre.y;
  const espaceFerme = LARGEUR - espaceOuvert;

  // Répartition entre le côté fermé (peu de monde, mais jamais zéro) et le
  // côté ouvert (le gros du rideau).
  let nFerme = Math.round((ligne.length * espaceFerme) / LARGEUR / 1.7);
  nFerme = borner(nFerme, 1, 3);
  const nOuvert = Math.max(1, ligne.length - nFerme);

  // Les cibles, du côté fermé vers le large, dans l'ordre.
  const cibles: number[] = [];
  for (let i = nFerme - 1; i >= 0; i--) cibles.push(ancre.y - ouvert * (3.4 + i * 5.2));
  const largeurUtile = Math.max(10, espaceOuvert - 7);
  const pas = Math.min(5.4, largeurUtile / Math.max(1, nOuvert - 0.5));
  for (let i = 0; i < nOuvert; i++) cibles.push(ancre.y + ouvert * (3.4 + i * pas));

  // La glissée décale tout le rideau vers la touche : c'est ce qui étouffe
  // l'attaque au large en la poussant dehors.
  const glisse = systeme === 'glissee' ? 3.4 : systeme === 'repli' ? 1.2 : 0;

  // On apparie défenseurs et cibles PAR ORDRE de largeur : sans ça les
  // défenseurs se croisent et le rideau se noue.
  const ordre = [...ligne].sort((a, b) => (a.pos.y - b.pos.y) * ouvert);
  for (let i = 0; i < ordre.length; i++) {
    const p = ordre[i];
    p.role = 'rideau1';
    const rang = Math.abs(i - (nFerme - 0.5));
    // Parapluie : en blitz les extérieurs montent plus vite, en glissée ils
    // restent légèrement en retrait pour ne pas se faire prendre à l'intérieur.
    const forme = systeme === 'blitz' ? -sa * rang * 0.32
      : systeme === 'glissee' ? sa * rang * 0.42
      : sa * rang * 0.2;
    p.cible = {
      x: bornerX(e.ligneDef + forme),
      y: (cibles[i] ?? ancre.y) + ouvert * glisse,
    };
  }
  // ⚠️ LE RIDEAU EST ÉTALÉ, PAS RABOTÉ. Quand le ballon sort à trois mètres de
  // la touche, la moitié des cibles calculées ci-dessus tombent hors du terrain :
  // `bornerY` les ramenait TOUTES sur la même valeur et douze défenseurs se
  // superposaient au bord. On garde l'ordre et on impose 4,2 m entre voisins —
  // l'écart se resserre tout seul si la largeur ne suffit pas.
  repartirY(ordre, 4.2);

  // ── LES CHASSEURS ────────────────────────────────────────────────────────
  // ⚠️ DEUX défenseurs seulement montent sur le porteur, et ils sortent du
  // PREMIER RIDEAU uniquement. Tous les autres tiennent leur place dans la
  // ligne : c'est ça, une défense de rugby.
  if (!porteur || porteur.cote === cote) return;
  const candidats = ligne.filter((p) => p.battu <= 0);
  candidats.sort((a, b) => distance2(a.pos, porteur.pos) - distance2(b.pos, porteur.pos));
  const chasseurs = candidats.filter((p) => (p.pos.x - porteur.pos.x) * sa >= -1.5).slice(0, 3);
  // ⚠️ LE PREMIER CHASSEUR VISE LE PORTEUR, PAS À CÔTÉ. Testé : décaler ces
  // trois-là d'un mètre six suffisait à faire chuter les plaquages réussis de
  // 250 à 190 et grimper les percées de 20 à 28 — le rayon de plaquage n'est
  // que de 1,35 m. Seul le second rideau, plus loin, prend un angle.
  for (const p of chasseurs) { p.cible = poursuite(p, porteur); p.role = 'chasseur'; }

  // ⚠️⚠️ LE SECOND RIDEAU NE BOUGE QUE SI LA LIGNE EST VRAIMENT FRANCHIE.
  // C'est LA règle qui fait qu'un match ressemble à du rugby : quinze joueurs
  // ne courent pas après le ballon. Tant que le premier rideau tient, l'arrière
  // et l'ailier fermé RESTENT au fond pour couvrir le jeu au pied, et la
  // sentinelle garde le couloir du ruck. Sans cette condition, toute la défense
  // se lançait sur le 9 dès la sortie du ruck.
  // ⚠️ On lit la percée sur les POSITIONS RÉELLES, pas sur `e.ligneDef` : cette
  // dernière est bornée au porteur, donc elle ne « décroche » jamais et la
  // couverture arrière ne se serait jamais déclenchée.
  let depasses = 0;
  for (const p of ligne) if ((p.pos.x - porteur.pos.x) * sa < -0.5) depasses++;
  const perce = depasses >= Math.ceil(ligne.length * 0.55);
  if (!perce) return;

  // Ligne franchie : la couverture arrière prend le relais, et les défenseurs
  // les plus proches font demi-tour pour rattraper le porteur. Les autres
  // gardent leur poste — on ne vide jamais complètement le fond du terrain.
  // ⚠️ NE PAS RÉDUIRE LE NOMBRE DE POURSUIVANTS. Testé : ramener le second
  // rideau à deux joueurs et les renforts à deux faisait passer les percées de
  // 20 à 29 par match (cible ≤ 25), les coups de pied de 51 à 65 et les rucks
  // de 173 à 129 — la couverture ne rattrapait plus rien et le match se
  // délitait. Le « nuage » ne venait pas de là : il venait du rabotage des
  // cibles en largeur (`repartirY`, plus haut).
  // On se contente donc d'ÉVENTER la poursuite : chacun prend un angle un peu
  // différent au lieu de viser le même point au mètre près.
  for (const p of rideau2) {
    if (p.battu > 0) continue;
    if (p === sentinelle && distance2(p.pos, porteur.pos) > 900) continue;
    p.cible = poursuite(p, porteur);
    p.role = 'chasseur';
  }
  const renforts = ligne
    .filter((q) => q.battu <= 0 && !chasseurs.includes(q) && distance2(q.pos, porteur.pos) < 625)
    .sort((a, b) => distance2(a.pos, porteur.pos) - distance2(b.pos, porteur.pos))
    .slice(0, 4);
  for (const p of renforts) { p.cible = poursuite(p, porteur); p.role = 'chasseur'; }
}

// Course de poursuite : on vise DEVANT le porteur, pas sur lui — sinon les
// défenseurs courent éternellement dans son dos.
//
// ⚠️ ON VISE LE PORTEUR, PAS À CÔTÉ. Tentative écartée : décaler chaque
// poursuivant de deux mètres pour « éventer » le paquet. Le rayon de plaquage
// est de 1,35 m — le décalage transformait chaque poursuite en course
// parallèle. Mesuré : plaquages réussis 259 → 190, percées 21 → 29, rucks
// 179 → 129, coups de pied 51 → 65. Tout le moteur en dépend.
function poursuite(p: Pion, porteur: Pion): Vec {
  const d = distance(p.pos, porteur.pos);
  const anticipation = borner(d / Math.max(4, p.vitesseMax), 0, 1.6);
  return {
    // ⚠️ Pas de borne en X ici : rattraper un porteur qui plonge dans l'en-but
    // fait partie du jeu. C'est le SEUL cas où l'on suit le ballon au-delà de la
    // ligne d'essai.
    x: porteur.pos.x + porteur.vitesse.x * anticipation,
    y: bornerY(porteur.pos.y + porteur.vitesse.y * anticipation),
  };
}

// ---------------------------------------------------------------------------
// Placement complet
// ---------------------------------------------------------------------------

export function placerEquipes(e: EtatMatch): void {
  const attaque = surLeTerrain(e, e.possession);
  const defense = surLeTerrain(e, adverse(e.possession));
  structurerAttaque(e, attaque, e.possession);
  structurerDefense(e, defense, adverse(e.possession));
  appliquerConsignePerso(e);
  // L'ENGAGEMENT : on ne sprinte que près du ballon. Un ailier à l'opposé se
  // replace en trottinant, comme dans un vrai match.
  // ⚠️ Pendant un arrêt de jeu, TOUT LE MONDE court se replacer à pleine
  // vitesse : sinon les joueurs loin du ballon (donc à demi-effort) n'avaient
  // pas le temps de rejoindre leur place au coup d'envoi ou en touche.
  const arret = PHASES_ARRETEES.has(e.phase);
  for (const p of e.pions) {
    if (!p.surLeTerrain) continue;
    // ⚠️ FILET DE SÉCURITÉ : aucune structure ne demande à un joueur de se
    // placer derrière sa propre ligne d'essai. Seul un chasseur lancé sur le
    // porteur y va — parce que le porteur y va.
    if (p.role !== 'chasseur') p.cible.x = bornerX(p.cible.x);
    // ⚠️ UN JOUEUR HORS-JEU LÈVE LE PIED, IL NE SE FIGE PAS — et la nuance a
    //    été MESURÉE. Première version : cible = sa propre position, effort
    //    0,25. Avec une cinquantaine de coups de pied par match et le paquet
    //    d’avants systématiquement devant son ouvreur, c’étaient huit joueurs
    //    plantés à chaque dégagement — l’étalonnage du moteur a bougé aussitôt
    //    (grattages 6,8 → 9,3 par match, hors cible, et le raffut a cessé de
    //    faire franchir). Il ralentit donc simplement : il ne chasse plus, il
    //    n’arrête pas de jouer au rugby.
    // ⚠️ ET SEULEMENT PENDANT LE VOL DU BALLON. Le drapeau ne s’éteint qu’à la
    //    reprise du jeu ; l’appliquer après la réception ferait trottiner un
    //    paquet d’avants pendant tout le temps de jeu suivant, alors que le
    //    hors-jeu ne concerne que la chasse. Mesuré sans cette borne :
    //    grattages 6,8 → 9,3 par match (hors cible) et le raffut cessait de
    //    faire franchir.
    if (p.horsJeu && e.phase === 'ballonEnLAir') {
      p.cible.x = p.pos.x;
      p.cible.y = p.pos.y;
      p.effort = 0.2;
      continue;
    }
    if (arret || p.role === 'chasseur') { p.effort = 1; continue; }
    const d2 = distance2(p.pos, e.ballon);
    p.effort = d2 < 400 ? 1 : d2 < 1600 ? 0.76 : 0.5;
    const rythme = e.tactiques[p.cote]?.rythme;
    p.effort *= rythme === 'intense' ? 1.08 : rythme === 'gestion' ? 0.92 : 1;
  }
  if (e.porteur) e.porteur.effort = 1;
  separer(e, arret);
}

// ⚠️ ON NE SE MARCHE PAS DESSUS. Deux joueurs peuvent viser des cibles proches,
// se croiser, ou converger sur le même ballon : sans force de séparation ils
// finissent superposés et l'écran donne des « paquets » de pions. Chaque paire
// à moins de 1,8 m est écartée d'un demi-écart — c'est invisible à l'œil, mais
// ça suffit à garder un terrain lisible. Le ruck, la mêlée, la touche et le
// maul en sont exemptés : là, on est censé être au contact.
// ⚠️ 1,8 m ne suffisait pas : à cette distance, trente pions de 0,86 m de rayon
// tiennent encore dans un mouchoir de poche, et l'écran affichait un « nuage ».
// 2,6 m, en DEUX passes (une seule laisse les chaînes de trois joueurs
// enchevêtrées), donne un terrain lisible sans dénaturer le placement.
const SERRE = 2.6;
function separer(e: EtatMatch, arret: boolean): void {
  const libres: Pion[] = [];
  for (const p of e.pions) {
    if (!p.surLeTerrain || p.sanction > 0) continue;
    if (p.role === 'ruck' || p.role === 'melee' || p.role === 'alignement' || p.role === 'maul') continue;
    if (arret && (e.phase === 'melee' || e.phase === 'touche')) continue;
    libres.push(p);
  }
  for (let passe = 0; passe < 2; passe++) {
    for (let i = 0; i < libres.length; i++) {
      const a = libres[i];
      for (let j = i + 1; j < libres.length; j++) {
        const b = libres[j];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= SERRE * SERRE) continue;
        const d = Math.sqrt(d2) || 0.001;
        const pousse = (SERRE - d) * 0.5;
        const ux = dx / d; const uy = dy / d;
        a.pos.x -= ux * pousse; a.pos.y -= uy * pousse;
        b.pos.x += ux * pousse; b.pos.y += uy * pousse;
        a.pos.y = bornerY(a.pos.y); b.pos.y = bornerY(b.pos.y);
      }
    }
  }
}

// LE COACHING EN DIRECT : la consigne du joueur infléchit SON placement.
function appliquerConsignePerso(e: EtatMatch): void {
  const c = e.consigne;
  if (!c) return;
  const p = e.pions.find((q) => q.moi && q.surLeTerrain);
  if (!p || p === e.porteur) return;
  const s = sens(p.cote);
  p.cible = {
    x: p.cible.x + s * c.profondeur,
    y: bornerY(p.cible.y + c.largeur * e.ouvert),
  };
  if (c.agressivite > 0.65 && e.possession === p.cote) {
    p.cible = {
      x: melanger(p.cible.x, e.ballon.x - s * 2, 0.5),
      y: bornerY(melanger(p.cible.y, e.ballon.y, 0.5)),
    };
  }
}

// ---------------------------------------------------------------------------
// Le choix du système défensif
// ---------------------------------------------------------------------------

export function choisirSysteme(e: EtatMatch, defenseur: Cote): SystemeDefensif {
  const impose = e.tactiques[defenseur]?.defense;
  if (impose) return impose;
  const b = e.ballon;
  const attaquant = adverse(defenseur);
  // L'attaque sort de ses 22 : elle va taper. On se replie pour couvrir.
  if (metresAvantLaLigne(b, attaquant) > 78) return 'repli';
  // Chez soi, monter en blitz laisse un trou derrière : on glisse.
  if (Math.abs(b.x - ligneDefendue(defenseur)) < 24) return 'glissee';
  // Ballon près de la touche : on pousse dehors.
  if (Math.abs(b.y - AXE) > 19) return 'glissee';
  // Mené en fin de match : il faut récupérer le ballon, on monte.
  const ecart = defenseur === 'A' ? e.scoreA - e.scoreB : e.scoreB - e.scoreA;
  if (e.minute > 58 && ecart < 0) return 'blitz';
  return e.rng() < 0.62 ? 'blitz' : 'glissee';
}

// Vitesse de montée du rideau (m/s), selon le système, la fatigue — et le
// rythme de marque de l'attaque (`e.aide`) : une équipe qui court après son
// score trouve une défense un peu moins pressante. C'est le réglage invisible
// qui fait tomber le score juste sans jamais refuser un essai à l'écran.
export function vitesseMontee(e: EtatMatch, defenseur: Cote): number {
  const base = e.systeme === 'blitz' ? 4.4 : e.systeme === 'glissee' ? 3.0 : 1.7;
  const liste = surLeTerrain(e, defenseur);
  if (!liste.length) return base;
  let endurance = 0;
  for (const p of liste) endurance += p.endurance;
  endurance /= liste.length;
  const rythme = e.tactiques[defenseur]?.rythme;
  const multiplicateur = rythme === 'intense' ? 1.08 : rythme === 'gestion' ? 0.92 : 1;
  return base * multiplicateur * (0.72 + endurance / 360) * borner(1 - e.aide * 0.3, 0.7, 1.2);
}

// ---------------------------------------------------------------------------
// La lecture du terrain — c'est elle qui décide de la combinaison
// ---------------------------------------------------------------------------

// Surnombre au large : attaquants moins défenseurs au-delà du couloir du ballon.
// Positif = il y a un décalage à exploiter, on écarte.
export function surnombreAuLarge(e: EtatMatch): number {
  const ouvert = e.ouvert;
  const seuil = e.ballon.y + ouvert * 14;
  const auLarge = (p: Pion) => (p.pos.y - seuil) * ouvert > 0;
  let att = 0; let def = 0;
  for (const p of e.pions) {
    if (!p.surLeTerrain || p.sanction > 0 || !auLarge(p)) continue;
    if (p.cote === e.possession) att++; else def++;
  }
  return att - def;
}

// Le côté ouvert du prochain temps de jeu. On ne rechoisit pas à chaque tick :
// le côté est figé au lancement de la phase (sinon la structure clignote).
export function choisirCoteOuvert(e: EtatMatch): 1 | -1 {
  const naturel = coteOuvert(e.ballon);
  // Sur trois temps de jeu du même côté, on revient contre le grain une fois
  // sur trois : c'est le jeu de « renversement » du rugby moderne.
  if (e.phasesDepuisArret >= 2 && e.rng() < 0.3) return naturel === 1 ? -1 : 1;
  return naturel;
}
