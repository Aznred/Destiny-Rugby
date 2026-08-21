// BANC D'ESSAI DE CE QUI REND LE MATCH JOUABLE — sans navigateur.
//
// Retour de jeu : « le système de jeu durant les matchs est injouable et pas
// fun, et il faut que ça marche sur téléphone ». La réponse tient en deux
// modules purs, et ce sont EXACTEMENT ceux que ce script mesure :
//
//  1. LA CAMÉRA (`moteur/camera.ts`) — elle doit rapprocher assez pour qu'un
//     joueur soit visible au doigt, ne jamais montrer de vide autour du
//     terrain, et surtout garder l'IMAGE ET LA COMMANDE ACCORDÉES : si la
//     matrice qui dessine et celle qui lit le joystick divergent d'un signe,
//     « pousse vers le haut » envoie le pion vers son propre en-but. C'est
//     invisible à la relecture et évident manette en main.
//
//  2. LES MOMENTS (`moteur/moments.ts`) — le match ne doit ralentir QUE
//     lorsqu'une action concerne le joueur, et il doit ralentir à chaque fois.
//     Trop souvent, le match n'avance plus ; pas assez, on rate ses propres
//     ballons. On mesure donc la proportion de temps ralenti sur un vrai match
//     simulé, et le nombre de moments par match.
//
//  3. LES DÉCISIONS (`moteur/decisions.ts`) — le mode demandé ensuite : « on a
//     un moment, dix secondes pour choisir une action, et ça la simule ». Ce
//     qui se mesure ici, c'est le NOMBRE de cartes (une par phase, c'est un
//     menu ; trois par match, c'est un film) et le fait que chaque option
//     proposée soit réellement jouable à cet instant-là.
//
//  4. LES EN-AVANTS — « on peut faire des en-avants sans répercussion ». On
//     compte ceux d'un match entier, et on vérifie qu'un ballon lâché coûte
//     TOUJOURS la possession.
//
//   npx vite-node scripts/verifMatchJouable.ts

import { avancer, creerMatch, type EtatMatch } from '../src/lib/moteur/moteur';
import {
  Camera, COUVERTURE, angleDeVue, construireVue, type Angle, type Cadrage,
} from '../src/lib/moteur/camera';
import { facteurTempo, momentDuJoueur, TEMPOS, TENUE } from '../src/lib/moteur/moments';
import {
  DELAI_DECISION, REJEU, REPOS_DECISION, decisionPour,
} from '../src/lib/moteur/decisions';
import { actionsDisponibles } from '../src/lib/moteur/controle';
import { LARGEUR, LONGUEUR, type Vec } from '../src/lib/moteur/terrain';
import { effectifDuClub } from '../src/lib/effectif';

let echecs = 0;
function ligne(nom: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(46)} ${valeur}`);
}

const A = 'Stade Toulousain';
const B = 'Stade Rochelais';
const AVATAR = {
  club: A,
  nom: 'Pilote Essai',
  poste: 'demi_ouverture' as const,
  attributs: { vitesse: 78, passe: 82, plaquage: 70, jeuAuPied: 80, vision: 82, force: 68, mental: 74, endurance: 80 },
  titulaire: true,
};

function nouveauMatch(cle: string): EtatMatch {
  return creerMatch(
    A, B, effectifDuClub(A, 1), effectifDuClub(B, 1), 24, 19, cle, AVATAR,
    { niveau: 'pro', controle: true },
  );
}

// ═══ 1. LA CAMÉRA CADRE DANS LE TERRAIN ═════════════════════════════════════
console.log('=== 1. LA CAMÉRA NE MONTRE JAMAIS DE VIDE ===');
{
  // Les quatre coins et le centre, sur trois formes d'écran : téléphone
  // debout, téléphone couché, ordinateur.
  const ecrans: { nom: string; ratio: number; portrait: boolean }[] = [
    { nom: 'téléphone debout (375×600)', ratio: 375 / 600, portrait: true },
    { nom: 'téléphone couché (740×340)', ratio: 740 / 340, portrait: false },
    { nom: 'ordinateur (840×660)', ratio: 840 / 660, portrait: false },
  ];
  const coins: Vec[] = [
    { x: 0, y: 0 }, { x: LONGUEUR, y: 0 }, { x: 0, y: LARGEUR },
    { x: LONGUEUR, y: LARGEUR }, { x: LONGUEUR / 2, y: LARGEUR / 2 },
  ];
  for (const ecran of ecrans) {
    let pire = 0;
    for (const cadrage of ['suivi', 'proche'] as Cadrage[]) {
      for (const cote of ['A', 'B'] as const) {
        const angle = angleDeVue(cote, ecran.portrait);
        for (const c of coins) {
          const cam = new Camera();
          cam.couper(c, cadrage);
          // Vingt images pour laisser le lissage se poser sur sa cible.
          let vue = cam.suivre(c, cadrage, ecran.ratio, angle, 0.016);
          for (let i = 0; i < 40; i++) vue = cam.suivre(c, cadrage, ecran.ratio, angle, 0.016);
          const { cx, cy, w, h } = vue.cadre;
          // Le débordement hors du terrain, en mètres.
          pire = Math.max(pire,
            (cx - w / 2 < -0.01 ? -(cx - w / 2) : 0),
            (cx + w / 2 > LONGUEUR + 0.01 ? cx + w / 2 - LONGUEUR : 0),
            (cy - h / 2 < -0.01 ? -(cy - h / 2) : 0),
            (cy + h / 2 > LARGEUR + 0.01 ? cy + h / 2 - LARGEUR : 0));
        }
      }
    }
    ligne(ecran.nom, `débordement max ${pire.toFixed(2)} m`, pire < 0.02);
  }
}

// ═══ 2. UN JOUEUR EST VISIBLE AU DOIGT ══════════════════════════════════════
console.log('\n=== 2. UN PION FAIT UNE TAILLE DE DOIGT — ET PAS PLUS ===');
{
  // Le rendu dessine les pions à leur TAILLE RÉELLE (0,86 m de rayon), avec un
  // plancher de 3,6 px de rayon pour qu'ils ne disparaissent jamais (voir
  // `MatchLive`). On vérifie les deux bouts de la règle :
  //
  //  • en vue rapprochée, au moins 14 px de diamètre — en dessous, on ne vise
  //    plus rien au pouce et on ne distingue plus un maillot d'un autre ;
  //  • ⚠️ EN VUE LARGE, PAS PLUS DE 14 px. Retour de jeu : « je trouve les pions
  //    beaucoup trop gros sur le terrain quand on met en regarder ». La
  //    première version les grossissait avec le dézoom et trente pions de 19 px
  //    se chevauchaient sur un terrain entier : on ne lisait plus ni les lignes,
  //    ni les intervalles — exactement ce qu'on vient regarder.
  const largeurEcran = 375;
  for (const cadrage of ['large', 'suivi', 'proche'] as Cadrage[]) {
    const angle: Angle = -90; // téléphone debout : la longueur court en hauteur
    const cam = new Camera();
    const cible = { x: LONGUEUR / 2, y: LARGEUR / 2 };
    cam.couper(cible, cadrage);
    const vue = cam.suivre(cible, cadrage, 375 / 600, angle, 0.016);
    // Combien de pixels vaut un mètre en travers de l'écran.
    const pxParMetre = largeurEcran / vue.W;
    const rayonM = Math.max(0.86, 3.6 / pxParMetre);
    const diametre = rayonM * 2 * pxParMetre;
    ligne(`cadrage « ${cadrage} » (${COUVERTURE[cadrage]} m)`,
      `${diametre.toFixed(1)} px de diamètre`,
      cadrage === 'large' ? diametre >= 7 && diametre <= 14 : diametre >= 14);
  }
}

// ═══ 3. L'IMAGE ET LA COMMANDE SONT ACCORDÉES ═══════════════════════════════
console.log('\n=== 3. ⚠️ POUSSER VERS L’AVANT VA VERS L’EN-BUT ADVERSE ===');
{
  // C'est LE test qui compte, et l'invariant tient en une phrase : POUSSER VERS
  // LE BORD « AVANT » DE L'ÉCRAN FAIT AVANCER LE PION VERS LA LIGNE QU'IL
  // ATTAQUE — quel que soit le camp incarné, écran couché ou debout.
  //
  // ⚠️ « Avant » n'est pas la même chose dans les deux orientations, et c'est
  // exactement ce qui rend l'erreur facile à écrire : couché, le terrain court
  // en largeur donc l'avant est la DROITE ; debout, il court en hauteur donc
  // l'avant est le HAUT. Un seul signe de travers et « pousse devant » renvoie
  // le joueur dans son propre en-but.
  for (const portrait of [false, true]) {
    for (const cote of ['A', 'B'] as const) {
      const angle = angleDeVue(cote, portrait);
      const vue = construireVue({ cx: LONGUEUR / 2, cy: LARGEUR / 2, w: 46, h: 30 }, angle);
      // Le geste « vers l'avant » : droite (dx = +1) couché, haut (dy = −1) debout.
      const d = portrait ? vue.directionMonde(0, -1) : vue.directionMonde(1, 0);
      // Le camp A attaque vers les X croissants, le camp B vers les décroissants.
      const attendu = cote === 'A' ? 1 : -1;
      ligne(`${portrait ? 'debout · haut ' : 'couché · droite'} · camp ${cote} · pivot ${angle}°`,
        `Δx = ${d.dx.toFixed(2)} · Δy = ${d.dy.toFixed(2)}`,
        Math.sign(d.dx) === attendu && Math.abs(d.dx) > 0.99 && Math.abs(d.dy) < 0.01);
    }
  }
  // Et le geste latéral doit rester latéral : pousser sur le côté ne doit
  // jamais faire gagner ou perdre de terrain.
  for (const portrait of [false, true]) {
    const angle = angleDeVue('A', portrait);
    const vue = construireVue({ cx: LONGUEUR / 2, cy: LARGEUR / 2, w: 46, h: 30 }, angle);
    const d = portrait ? vue.directionMonde(1, 0) : vue.directionMonde(0, -1);
    ligne(`${portrait ? 'debout ' : 'couché '} · le côté reste le côté`,
      `Δx = ${d.dx.toFixed(2)} · Δy = ${d.dy.toFixed(2)}`,
      Math.abs(d.dx) < 0.01 && Math.abs(d.dy) > 0.99);
  }
  // Et le trajet écran → terrain → écran doit revenir au point de départ :
  // c'est ce qui garantit que le doigt tombe sur ce qu'on lui montre.
  let pire = 0;
  for (const angle of [0, 90, 180, -90] as Angle[]) {
    const vue = construireVue({ cx: 61, cy: 35, w: 46, h: 30 }, angle);
    for (const p of [{ x: 3, y: 4 }, { x: 40, y: 20 }, { x: 12.5, y: 27.8 }]) {
      const retour = vue.versEcran(vue.versMonde(p));
      pire = Math.max(pire, Math.hypot(retour.x - p.x, retour.y - p.y));
    }
  }
  ligne('écran → terrain → écran revient au point', `écart max ${pire.toExponential(1)} m`, pire < 1e-9);
}

// ═══ 4. LA CAMÉRA COUPE AU LIEU DE TRAVERSER LE TERRAIN ═════════════════════
console.log('\n=== 4. UN DÉGAGEMENT NE FAIT PAS VOYAGER LA CAMÉRA ===');
{
  const cam = new Camera();
  const depart = { x: 20, y: 35 };
  cam.couper(depart, 'suivi');
  cam.suivre(depart, 'suivi', 1.4, 0, 0.016);
  // Le ballon part à l'autre bout : une seule image doit suffire à y être.
  const arrivee = { x: 100, y: 35 };
  const vue = cam.suivre(arrivee, 'suivi', 1.4, 0, 0.016);
  const reste = Math.abs(vue.cadre.cx - Math.min(arrivee.x, LONGUEUR - vue.cadre.w / 2));
  ligne('saut de 80 m rattrapé en une image', `${reste.toFixed(2)} m de retard`, reste < 0.5);

  // Un déplacement normal, lui, doit être LISSÉ — sinon la caméra tremble à
  // chaque pas de simulation.
  const cam2 = new Camera();
  cam2.couper({ x: 60, y: 35 }, 'proche');
  cam2.suivre({ x: 60, y: 35 }, 'proche', 1.4, 0, 0.016);
  const v2 = cam2.suivre({ x: 66, y: 35 }, 'proche', 1.4, 0, 0.016);
  const avance = v2.cadre.cx - 60;
  ligne('un pas de 6 m est lissé, pas suivi sec', `${avance.toFixed(2)} m sur 6 m`, avance > 0 && avance < 2);
}

// ═══ 5. LES MOMENTS TOMBENT AU BON RYTHME ═══════════════════════════════════
console.log('\n=== 5. ⚠️ LE MATCH RALENTIT QUAND C’EST À TOI, ET PAS AVANT ===');
{
  const N = 6;
  let totalMoments = 0;
  let partRalentie = 0;
  let dureeMoyenne = 0;
  let momentsSansBallon = 0;
  let momentsAvecBallon = 0;

  for (let m = 0; m < N; m++) {
    const e = nouveauMatch(`jouable#${m}`);
    const moi = e.pions.find((p) => p.moi)!;
    let pas = 0;
    let ralenti = 0;
    let moments = 0;
    let tenue = 0;
    let dedans = false;
    let sommeDurees = 0;
    let dureeCourante = 0;

    // On simule par pas de 0,15 s de jeu (le pas du moteur) et on relit l'état
    // comme le ferait l'écran, image par image.
    // ⚠️ ON COMPTE CE QUE LE JOUEUR PERÇOIT, PAS LES TICKS. Le ralenti TIENT
    // `TENUE` secondes après la fin du moment (voir `moments.ts`) : deux
    // déclenchements séparés d'une demi-seconde forment UN seul ralenti à
    // l'écran. Les compter séparément gonflait le total d'un facteur dix et
    // rendait la mesure inutilisable.
    while (!e.fini && pas < 40000) {
      avancer(e, 0.15);
      pas++;
      const mt = momentDuJoueur(e, moi);
      if (mt) {
        if (tenue === 0) {
          moments++;
          dureeCourante = 0;
          if (mt.type === 'ballon' || mt.type === 'reception') momentsAvecBallon++;
          else momentsSansBallon++;
        }
        dedans = true;
        tenue = TENUE;
      }
      if (tenue > 0) { dureeCourante += 0.15; ralenti++; }
      if (!mt) {
        tenue = Math.max(0, tenue - 0.15);
        if (tenue === 0 && dedans) { sommeDurees += dureeCourante; dedans = false; }
      }
    }
    totalMoments += moments;
    partRalentie += ralenti / Math.max(1, pas);
    dureeMoyenne += moments ? sommeDurees / moments : 0;
  }

  const moyMoments = totalMoments / N;
  const moyPart = (partRalentie / N) * 100;
  const moyDuree = dureeMoyenne / N;

  console.log(`  ${'moments par match'.padEnd(46)} ${moyMoments.toFixed(1)}`);
  console.log(`  ${'dont ballon en main ou à recevoir'.padEnd(46)} ${momentsAvecBallon} vs ${momentsSansBallon} sans`);

  // ⚠️ LES BORNES SONT DES BORNES DE PLAISIR, PAS DE CORRECTION.
  //
  // ⚠️ ET C'EST LA PART DE TEMPS RALENTIE QUI COMPTE, PAS LE NOMBRE DE MOMENTS.
  // Un ouvreur est impliqué très souvent — le moteur produit deux cents
  // regroupements par match — donc compter les moments dit surtout à quel point
  // le match est haché, pas s'il est jouable. Ce qui décide, c'est la fraction
  // du match passée en temps réel : c'est elle qui fixe la durée manette en
  // main, et c'est elle qu'on tient. Le plafond sur le nombre ne reste ici que
  // comme garde-fou contre un déclenchement en boucle.
  ligne('assez de moments pour jouer (≥ 20)', `${moyMoments.toFixed(1)}/match`, moyMoments >= 20);
  ligne('pas de déclenchement en boucle (≤ 250)', `${moyMoments.toFixed(1)}/match`, moyMoments <= 250);
  // Le temps de jeu ralenti décide de la durée réelle d'un match manette en
  // main : à 100 % on jouerait 35 minutes, à 0 % on ne jouerait rien.
  ligne('part du match jouée au ralenti (12-35 %)', `${moyPart.toFixed(0)} %`, moyPart >= 12 && moyPart <= 35);
  // Un moment doit durer assez pour qu'on ait le temps de décider ET d'agir.
  ligne('un moment dure assez pour agir (≥ 0,8 s)', `${moyDuree.toFixed(1)} s`, moyDuree >= 0.8);
  ligne('le joueur touche vraiment le ballon', `${momentsAvecBallon} moments ballon`, momentsAvecBallon > 0);
}

// ═══ 6. LE TEMPO RAMÈNE LE MATCH À UNE DURÉE HUMAINE ════════════════════════
console.log('\n=== 6. UN MATCH TIENT DANS UNE SESSION ===');
{
  // Combien de secondes RÉELLES pour jouer un match complet, tempo par tempo.
  const e = nouveauMatch('duree#1');
  const moi = e.pions.find((p) => p.moi)!;
  let simTotal = 0;
  let simRalentie = 0;
  let tenue = 0;
  let pas = 0;
  while (!e.fini && pas < 40000) {
    avancer(e, 0.15);
    pas++;
    simTotal += 0.15;
    if (momentDuJoueur(e, moi)) tenue = TENUE;
    else tenue = Math.max(0, tenue - 0.15);
    if (tenue > 0) simRalentie += 0.15;
  }
  const simRapide = simTotal - simRalentie;
  for (const tempo of TEMPOS) {
    const reel = simRalentie / facteurTempo(tempo.id, true) + simRapide / facteurTempo(tempo.id, false);
    const minutes = reel / 60;
    console.log(`  ${`tempo « ${tempo.id} »`.padEnd(46)} ${minutes.toFixed(1)} min de manette`);
    if (tempo.id === 'moments') {
      // ⚠️ C'EST LE CHIFFRE QUI DÉCIDE SI LE JEU EST « FUN ». Trop court, on
      // n'a rien joué ; trop long, on ne rejouera pas la semaine prochaine.
      ligne('un match complet en 3 à 15 minutes', `${minutes.toFixed(1)} min`, minutes >= 3 && minutes <= 15);
    }
  }
  ligne('le match va bien au bout', `${pas} pas · ${e.scoreA}-${e.scoreB}`, e.fini);
}

console.log('\n=== 7. ⏸️ LES CARTES DE DÉCISION TOMBENT SUR LES CARREFOURS ===');
{
  const N = 4;
  let cartes = 0;
  let optionsTotal = 0;
  let optionsHorsJeu = 0;
  let mini = 9;
  let maxi = 0;
  const parType: Record<string, number> = {};
  let simTotal = 0;

  for (let m = 0; m < N; m++) {
    const e = nouveauMatch(`decision#${m}`);
    const moi = e.pions.find((q) => q.moi)!;
    let derniere = 0;
    let pas = 0;
    while (!e.fini && pas < 40000) {
      avancer(e, 0.15);
      pas++;
      const carte = decisionPour(e, moi, e.sim - derniere);
      if (!carte) continue;
      derniere = e.sim;
      cartes++;
      parType[carte.moment] = (parType[carte.moment] ?? 0) + 1;
      optionsTotal += carte.options.length;
      mini = Math.min(mini, carte.options.length);
      maxi = Math.max(maxi, carte.options.length);
      // ⚠️ LE CONTRÔLE QUI COMPTE : une carte ne doit JAMAIS proposer un geste
      // que le moteur refusera. Un bouton qui ne fait rien, sur une carte à dix
      // secondes, se lit comme un jeu cassé — et on ne le verrait pas à la
      // relecture, puisque les deux listes viennent du même fichier.
      const jouables = new Set(actionsDisponibles(e).map((a) => a.id));
      for (const o of carte.options) if (!jouables.has(o.action)) optionsHorsJeu++;
    }
    simTotal += e.sim;
  }

  const moyCartes = cartes / N;
  console.log(`  ${'cartes par match'.padEnd(46)} ${moyCartes.toFixed(1)}`);
  console.log(`  ${'réparties par situation'.padEnd(46)} ${
    Object.entries(parType).map(([k, v]) => `${k} ${Math.round(v / N)}`).join(' · ')}`);

  // ⚠️ LES BORNES SONT DES BORNES DE PLAISIR. Sous dix cartes on regarde un
  // match sans y toucher ; au-dessus de trente-cinq on remplit un formulaire.
  ligne('assez de carrefours pour jouer (≥ 10)', `${moyCartes.toFixed(1)}/match`, moyCartes >= 10);
  ligne('pas un menu à chaque phase (≤ 35)', `${moyCartes.toFixed(1)}/match`, moyCartes <= 35);
  ligne('2 à 4 options par carte', `${mini} à ${maxi}, moyenne ${(optionsTotal / Math.max(1, cartes)).toFixed(1)}`,
    cartes > 0 && mini >= 2 && maxi <= 4);
  ligne('aucune option injouable', `${optionsHorsJeu} sur ${optionsTotal}`, optionsHorsJeu === 0);
  ligne('le repos entre deux cartes est respecté', `${REPOS_DECISION} s simulées`,
    moyCartes <= simTotal / N / REPOS_DECISION + 0.001);

  // ⚠️ LA VRAIE QUESTION : COMBIEN DE TEMPS ÇA PREND. Le match défile hors
  // décision, se fige pendant qu'on choisit (on compte six secondes de
  // réflexion sur les dix offertes), puis rejoue au ralenti.
  const rapide = (simTotal / N) / facteurTempo('decisions', false);
  const reflexion = moyCartes * 6;
  const rejeu = moyCartes * REJEU;
  const minutes = (rapide + reflexion + rejeu) / 60;
  console.log(`  ${'dont'.padEnd(46)} ${(rapide / 60).toFixed(1)} min de jeu · ${
    (reflexion / 60).toFixed(1)} min de choix · ${(rejeu / 60).toFixed(1)} min de rejeu`);
  ligne('un match en décisions tient en 3 à 12 min', `${minutes.toFixed(1)} min`,
    minutes >= 3 && minutes <= 12);
  ligne('dix secondes pour choisir', `${DELAI_DECISION} s`, DELAI_DECISION === 10);
}

console.log('\n=== 8. ⚠️ UN EN-AVANT COÛTE TOUJOURS LA POSSESSION ===');
{
  const N = 6;
  let total = 0;
  let sansConsequence = 0;
  let sansSifflet = 0;

  for (let m = 0; m < N; m++) {
    const e = nouveauMatch(`enavant#${m}`);
    let pas = 0;
    let vus = 0;
    while (!e.fini && pas < 40000) {
      const avantCoup = e.compteurs.enAvants;
      avancer(e, 0.15);
      pas++;
      if (e.compteurs.enAvants > avantCoup) {
        vus = e.compteurs.enAvants;
        // ⚠️ ON COMPARE AU CAMP DU FAUTIF, PAS AU CAMP QUI AVAIT LE BALLON.
        // Un défenseur qui lâche un ballon au sol rend la mêlée à l'équipe qui
        // attaquait déjà : la possession ne CHANGE pas, et pourtant la règle
        // est bien appliquée. C'est le fautif qui doit perdre le ballon.
        const fautif = e.pions.find((q) => q.nom === e.sifflet?.fautif);
        if (fautif && e.possession === fautif.cote) sansConsequence++;
        if (!e.sifflet) sansSifflet++;
      }
    }
    total += vus;
  }

  const moy = total / N;
  console.log(`  ${'en-avants et passes en avant par match'.padEnd(46)} ${moy.toFixed(1)}`);
  // Le rugby professionnel compte 12 à 18 fautes de main par match, les deux
  // équipes réunies. En dessous, le ballon ne se perd jamais et le jeu n'a plus
  // d'accident ; au-dessus, on ne construit plus rien.
  ligne('autant qu\'en vrai (10 à 20 par match)', `${moy.toFixed(1)}`, moy >= 10 && moy <= 20);
  ligne('le fautif perd le ballon À CHAQUE FOIS', `${sansConsequence} sans conséquence`, sansConsequence === 0);
  ligne('et l\'arbitre l\'annonce à l\'écran', `${sansSifflet} sans bannière`, sansSifflet === 0);
}

console.log(echecs === 0
  ? '\n✅ TOUT EST BON — la caméra cadre juste, le stick pousse dans le bon sens, les carrefours tombent au bon moment, et un ballon lâché coûte toujours la possession.'
  : `\n❌ ${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
