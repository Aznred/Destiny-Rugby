// BANC D'ESSAI DU CONTRÔLE DU JOUEUR ET DE LA DISCIPLINE — sans navigateur.
//
//  1. les actions proposées suivent VRAIMENT la phase (on ne gratte pas en
//     attaque, on ne passe pas sans ballon) ;
//  2. chaque geste CHANGE quelque chose de mesurable (plaquages, grattages,
//     ballons touchés, offloads) — sinon la barre n'est qu'un décor ;
//  3. ⚠️ LE CŒUR DE LA DEMANDE : les bagarres partent facilement en amateur et
//     presque jamais en professionnel, où la sanction est en revanche lourde ;
//  4. les cartons sont plus fréquents en amateur ;
//  5. le score reste CELUI DE LA LIGUE, contrôle ou pas — c'est la règle qui ne
//     doit jamais casser, sinon le classement ment ;
//  6. rien ne se bloque : une bagarre sans interface se dénoue toute seule.
//
//   npx vite-node scripts/verifControle.ts

import { creerMatch, avancer, ordonner, type EtatMatch } from '../src/lib/moteur/moteur';
import {
  actionsDisponibles, demanderAction, piloterDirection, receveurCote,
} from '../src/lib/moteur/controle';
import type { ActionJoueur, NiveauMatch, OrdreBagarre } from '../src/lib/moteur/etat';
import { jouerRencontre } from '../src/lib/championnat';
import { effectifDuClub } from '../src/lib/effectif';

const A = 'Stade Toulousain';
const B = 'Stade Rochelais';
const effA = effectifDuClub(A, 1);
const effB = effectifDuClub(B, 1);

const AVATAR = {
  club: A,
  nom: effA[10].nom,
  poste: 'troisieme_aile_g' as const,
  attributs: { vitesse: 82, passe: 70, plaquage: 84, jeuAuPied: 55, vision: 74, force: 82, mental: 70, endurance: 84 },
  titulaire: true,
};

interface Options {
  niveau?: NiveauMatch;
  controle?: boolean;
  /** L'action tentée à chaque occasion où elle est proposée. */
  action?: ActionJoueur;
  /** L'ordre donné dès qu'une bagarre éclate. */
  ordre?: OrdreBagarre;
}

function jouer(cle: string, o: Options = {}): EtatMatch {
  const m = jouerRencontre(A, B, 1, cle, null);
  const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle, AVATAR, {
    niveau: o.niveau ?? 'pro',
    controle: o.controle ?? false,
  });
  let garde = 0;
  // ⚠️ ON AVANCE PAR PETITS PAS (0,4 s) et on clique entre deux : c'est ce que
  // fait un joueur devant son écran. À 8 secondes par appel — le pas de la
  // simulation de fond — on ne verrait jamais les fenêtres où l'action est
  // disponible, et le banc d'essai mesurerait le vide.
  while (!e.fini && garde++ < 30_000) {
    avancer(e, 0.4);
    if (e.bagarre && !e.bagarre.ordre) ordonner(e, o.ordre ?? 'reculer');
    if (o.action && !e.intention && actionsDisponibles(e).some((a) => a.id === o.action)) {
      demanderAction(e, o.action);
    }
  }
  return e;
}

const monPion = (e: EtatMatch) => e.pions.find((p) => p.moi)!;
const N = 12;
let echecs = 0;
function ligne(nom: string, valeur: string | number, ok: boolean): void {
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(46)} ${valeur}`);
  if (!ok) echecs++;
}

// ---------------------------------------------------------------------------
console.log('=== 1. LES ACTIONS SUIVENT LA PHASE ===');
{
  const e = creerMatch(A, B, effA, effB, 20, 15, 'ctx#1', AVATAR, { controle: true });
  const vues = new Map<string, Set<string>>();
  let garde = 0;
  while (!e.fini && garde++ < 30_000) {
    avancer(e, 0.4);
    if (e.bagarre && !e.bagarre.ordre) ordonner(e, 'reculer');
    const cle = e.porteur === monPion(e) ? 'ballon'
      : e.possession === monPion(e).cote ? 'attaque' : 'defense';
    const set = vues.get(cle) ?? new Set<string>();
    for (const a of actionsDisponibles(e)) set.add(a.id);
    vues.set(cle, set);
  }
  const ballon = vues.get('ballon') ?? new Set();
  const attaque = vues.get('attaque') ?? new Set();
  const defense = vues.get('defense') ?? new Set();
  ligne('ballon en main → passer et taper', [...ballon].filter((x) => x === 'passe' || x === 'pied').length, ballon.has('pied'));
  ligne('ballon en main → jamais « gratter »', ballon.has('grattage') ? 'proposé' : 'absent', !ballon.has('grattage'));
  ligne('attaque sans ballon → réclamer / soutenir', [...attaque].join(' '), attaque.has('appel') && attaque.has('soutien'));
  ligne('attaque sans ballon → jamais « plaquer »', attaque.has('plaquage') ? 'proposé' : 'absent', !attaque.has('plaquage'));
  ligne('défense → plaquer, monter, gratter', [...defense].filter((x) => x === 'plaquage' || x === 'monter' || x === 'grattage').length, defense.has('plaquage') && defense.has('grattage'));
  ligne('défense → jamais « passer »', defense.has('passe') ? 'proposé' : 'absent', !defense.has('passe'));
  ligne('la discipline est toujours à portée', defense.has('provoquer') || attaque.has('provoquer') ? 'oui' : 'non', defense.has('provoquer') || attaque.has('provoquer'));
}

// ---------------------------------------------------------------------------
console.log('\n=== 2. CHAQUE GESTE CHANGE QUELQUE CHOSE ===');
{
  const moyenne = (o: Options, f: (e: EtatMatch) => number) => {
    let total = 0;
    for (let i = 0; i < N; i++) total += f(jouer(`geste#${i}`, o));
    return total / N;
  };
  const plaquagesAuto = moyenne({}, (e) => monPion(e).stats.plaquages);
  const plaquagesPilote = moyenne({ controle: true, action: 'plaquage' }, (e) => monPion(e).stats.plaquages);
  ligne('plaquages : auto → piloté', `${plaquagesAuto.toFixed(1)} → ${plaquagesPilote.toFixed(1)}`, plaquagesPilote > plaquagesAuto);

  const grattagesAuto = moyenne({}, (e) => monPion(e).stats.grattages);
  const grattagesPilote = moyenne({ controle: true, action: 'grattage' }, (e) => monPion(e).stats.grattages);
  ligne('ballons grattés : auto → piloté', `${grattagesAuto.toFixed(1)} → ${grattagesPilote.toFixed(1)}`, grattagesPilote > grattagesAuto);
  // ⚠️ ET ÇA DOIT RESTER DU RUGBY. Un gratteur de très haut niveau tourne à
  // trois ou quatre ballons volés par match ; huit, c'est déjà une performance
  // historique. Au-delà, ce n'est plus un joueur, c'est un aspirateur.
  ligne('…sans dépasser le plausible (< 9 par match)', grattagesPilote.toFixed(1), grattagesPilote < 9);

  const coursesAuto = moyenne({}, (e) => monPion(e).stats.courses);
  const coursesAppel = moyenne({ controle: true, action: 'appel' }, (e) => monPion(e).stats.courses);
  ligne('ballons portés : auto → « réclamer »', `${coursesAuto.toFixed(1)} → ${coursesAppel.toFixed(1)}`, coursesAppel > coursesAuto);
  // Les gros porteurs de balle du rugby professionnel tournent à 20-25 ballons
  // par match. C'est le plafond d'un joueur qui passe son match à réclamer.
  ligne('…sans confisquer le ballon (< 30 par match)', coursesAppel.toFixed(1), coursesAppel < 30);

  const enduranceAuto = moyenne({}, (e) => monPion(e).endurance);
  const enduranceSprint = moyenne({ controle: true, action: 'sprint' }, (e) => monPion(e).endurance);
  ligne('le sprint coûte VRAIMENT de l’endurance', `${enduranceAuto.toFixed(0)} → ${enduranceSprint.toFixed(0)}`, enduranceSprint < enduranceAuto);

  // ⚠️ LE CROCHET ET LE RAFFUT N'ÉTAIENT MESURÉS NULLE PART, et c'est
  // exactement là que le retour de jeu a porté : « raffut, crochet qui marchent
  // vraiment ». Leur effet existait (`resoudrePlaquage` ajoute de l'évitement
  // et de la puissance à la résistance du porteur) mais personne ne le
  // surveillait — on pouvait donc le raboter sans que rien ne le signale.
  //
  // Ce qui se mesure ici, c'est le FRANCHISSEMENT : un crochet réussi, c'est un
  // plaqueur qui plaque dans le vide. On compare au même joueur qui ne
  // crocheterait pas — un test absolu ne voudrait rien dire, le nombre de
  // ballons portés variant d'un match à l'autre.
  const franchAuto = moyenne({ controle: true }, (e) => monPion(e).stats.franchissements);
  const franchCrochet = moyenne({ controle: true, action: 'crochet' }, (e) => monPion(e).stats.franchissements);
  const franchRaffut = moyenne({ controle: true, action: 'raffut' }, (e) => monPion(e).stats.franchissements);
  ligne('le crochet fait vraiment franchir',
    `${franchAuto.toFixed(1)} → ${franchCrochet.toFixed(1)}`, franchCrochet > franchAuto);
  ligne('le raffut aussi',
    `${franchAuto.toFixed(1)} → ${franchRaffut.toFixed(1)}`, franchRaffut > franchAuto);
  // ⚠️ ET ILS NE DOIVENT PAS RENDRE IMPLAQUABLE. Un ailier qui franchit vingt
  // fois par match, ce n'est plus du rugby — le taux de plaquage réussi du
  // rugby professionnel est de ~88 %, et le moteur est calé dessus.
  ligne('…sans rendre imprenable (< 12 par match)',
    `${Math.max(franchCrochet, franchRaffut).toFixed(1)}`,
    Math.max(franchCrochet, franchRaffut) < 12);
}

// ---------------------------------------------------------------------------
console.log('\n=== 3. ⚠️ AMATEUR / PRO : LA DEMANDE, MESURÉE ===');
let bagarresPro = 0;
let bagarresAmateur = 0;
{
  const provoquer = (niveau: NiveauMatch) => {
    let bagarres = 0;
    let rouges = 0;
    let semaines = 0;
    let suspendus = 0;
    for (let i = 0; i < N; i++) {
      const e = jouer(`prov#${niveau}#${i}`, { niveau, controle: true, action: 'provoquer', ordre: 'tous' });
      bagarres += e.discipline.bagarres;
      rouges += e.discipline.rouges;
      if (e.discipline.citation) { suspendus++; semaines += e.discipline.citation.semaines; }
    }
    return {
      bagarres: bagarres / N,
      rouges: rouges / N,
      suspendus,
      semaines: suspendus ? semaines / suspendus : 0,
    };
  };
  const pro = provoquer('pro');
  const amateur = provoquer('amateur');
  bagarresPro = pro.bagarres;
  bagarresAmateur = amateur.bagarres;

  console.log(`  ${'bagarres par match'.padEnd(46)} amateur ${amateur.bagarres.toFixed(2)} · pro ${pro.bagarres.toFixed(2)}`);
  console.log(`  ${'cartons rouges du joueur par match'.padEnd(46)} amateur ${amateur.rouges.toFixed(2)} · pro ${pro.rouges.toFixed(2)}`);
  console.log(`  ${'matchs suivis d’une suspension'.padEnd(46)} amateur ${amateur.suspendus}/${N} · pro ${pro.suspendus}/${N}`);

  // ⚠️ CE TEST EST CELUI DU PILOTE QUI CHAMBRE TOUT LE MATCH — une douzaine de
  // provocations, le maximum que la recharge autorise. Un joueur normal en
  // lâche deux ou trois : à ce rythme-là, l'amateur voit une échauffourée un
  // match sur deux et le professionnel une par saison.
  ligne('ça part beaucoup plus vite en amateur', `${amateur.bagarres.toFixed(2)} vs ${pro.bagarres.toFixed(2)}`, amateur.bagarres > pro.bagarres * 2.5);
  ligne('en pro, ça reste rare même en chambrant', pro.bagarres.toFixed(2), pro.bagarres < 1);
  ligne('et ça ne dégénère jamais en foire', amateur.bagarres.toFixed(2), amateur.bagarres <= 3);
  // Se faire entraîner dans une bagarre qu'on n'a pas commencée, ce n'est pas
  // un rouge : c'est un jaune. La sanction lourde, c'est pour celui qui frappe
  // (section 4).
  ligne('être provoqué ne vaut pas la commission', `${amateur.suspendus + pro.suspendus} suspension(s)`, amateur.suspendus + pro.suspendus <= 2);
}

// ---------------------------------------------------------------------------
console.log('\n=== 4. FRAPPER : LE GESTE QUI COÛTE ===');
{
  const frapper = (niveau: NiveauMatch, ordre: OrdreBagarre) => {
    let rouges = 0;
    let cites = 0;
    let semaines = 0;
    let blesses = 0;
    for (let i = 0; i < N; i++) {
      const e = jouer(`frap#${niveau}#${ordre}#${i}`, { niveau, controle: true, action: 'frapper', ordre });
      rouges += e.discipline.rouges;
      if (e.discipline.citation) { cites++; semaines += e.discipline.citation.semaines; }
      if (e.discipline.blessure) blesses++;
    }
    return { rouges: rouges / N, cites, semaines: cites ? semaines / cites : 0, blesses };
  };
  const pro = frapper('pro', 'tous');
  const amateur = frapper('amateur', 'tous');
  const proCalme = frapper('pro', 'calmer');

  console.log(`  ${'rouges par match (coup de poing)'.padEnd(46)} amateur ${amateur.rouges.toFixed(2)} · pro ${pro.rouges.toFixed(2)}`);
  console.log(`  ${'blessures ramassées dans la bagarre'.padEnd(46)} amateur ${amateur.blesses}/${N} · pro ${pro.blesses}/${N}`);
  console.log(`  ${'durée moyenne de la suspension'.padEnd(46)} amateur ${amateur.semaines.toFixed(1)} sem. · pro ${pro.semaines.toFixed(1)} sem.`);
  ligne('frapper mène presque toujours à la citation', `${pro.cites}/${N} en pro`, pro.cites >= N * 0.6);
  // ⚠️ LE CŒUR DE LA DEMANDE : « presque jamais en pro, mais de grosses
  // sanctions ». Trois dimanches en Fédérale, une demi-saison en Top 14.
  ligne('la sanction pro est BIEN plus lourde', `${pro.semaines.toFixed(1)} vs ${amateur.semaines.toFixed(1)} sem.`, pro.semaines > amateur.semaines * 1.8);
  ligne('une saison peut y passer (pro ≥ 12 sem.)', `${pro.semaines.toFixed(1)} sem.`, pro.semaines >= 12);
  ligne('en amateur, on revient vite (≤ 8 sem.)', `${amateur.semaines.toFixed(1)} sem.`, amateur.semaines <= 8);
  ligne('« on se calme » réduit vraiment la note', `${proCalme.rouges.toFixed(2)} vs ${pro.rouges.toFixed(2)} rouges`, proCalme.rouges <= pro.rouges);
}

// ---------------------------------------------------------------------------
console.log('\n=== 5. LES CARTONS SONT PLUS FRÉQUENTS EN AMATEUR ===');
{
  const cartons = (niveau: NiveauMatch) => {
    let total = 0;
    for (let i = 0; i < N; i++) {
      const e = jouer(`cart#${niveau}#${i}`, { niveau });
      total += e.pions.reduce((s, p) => s + p.stats.cartonsJaunes + p.stats.cartonsRouges, 0);
    }
    return total / N;
  };
  const pro = cartons('pro');
  const amateur = cartons('amateur');
  console.log(`  ${'cartons par match (toutes causes)'.padEnd(46)} amateur ${amateur.toFixed(2)} · pro ${pro.toFixed(2)}`);
  ligne('l’arbitre amateur sort plus la carte', `${amateur.toFixed(2)} vs ${pro.toFixed(2)}`, amateur > pro);
  ligne('sans dériver dans le grotesque (< 5/match)', amateur.toFixed(2), amateur < 5);
}

// ---------------------------------------------------------------------------
console.log('\n=== 6. RIEN NE CASSE : SCORE, BLOCAGE, DÉTERMINISME ===');
{
  let ecarts = 0;
  for (let i = 0; i < N; i++) {
    const attendu = jouerRencontre(A, B, 1, `score#${i}`, null);
    const e = jouer(`score#${i}`, { niveau: 'amateur', controle: true, action: 'provoquer', ordre: 'tous' });
    if (e.scoreA !== attendu.scoreD || e.scoreB !== attendu.scoreE) ecarts++;
  }
  ligne('le score reste celui de la ligue', `${ecarts} écart(s) sur ${N}`, ecarts === 0);

  // ⚠️ SANS INTERFACE, PERSONNE NE DONNE D'ORDRE. Le garde-fou d'attente doit
  // dénouer la bagarre tout seul, sinon `avancer()` tournerait sans fin — et un
  // script de mesure, ou la simulation de fond, se figerait.
  const e = creerMatch(A, B, effA, effB, 20, 15, 'blocage#1', AVATAR, { niveau: 'amateur', controle: true });
  let garde = 0;
  let vueBagarre = false;
  while (!e.fini && garde++ < 30_000) {
    avancer(e, 0.4);
    if (e.bagarre) vueBagarre = true;      // on ne donne AUCUN ordre, exprès
    if (!e.intention && actionsDisponibles(e).some((a) => a.id === 'provoquer')) {
      demanderAction(e, 'provoquer');
    }
  }
  ligne('un match sans interface va au bout', `${e.fini ? 'terminé' : 'BLOQUÉ'} (${garde} pas)`, e.fini);
  ligne('et une bagarre s’y dénoue toute seule', vueBagarre ? 'bagarre vue et résolue' : 'aucune bagarre', e.fini);

  // Le contrôle ne doit pas casser le déterminisme du moteur : deux matchs
  // pilotés à l'identique donnent le même résultat.
  const a = jouer('det#1', { controle: true, action: 'plaquage' });
  const b = jouer('det#1', { controle: true, action: 'plaquage' });
  ligne('deux pilotages identiques → même match',
    `${a.scoreA}-${a.scoreB} / ${b.scoreA}-${b.scoreB}`,
    a.scoreA === b.scoreA && a.commentaires.length === b.commentaires.length);
}

// ---------------------------------------------------------------------------
console.log('\n=== 7. 🕹️ LE PILOTAGE DIRECT ===');
{
  // ⚠️ LE TEST QUI COMPTE : quand je pousse à gauche, mon pion va à gauche.
  // Tout le reste du fichier vérifie des probabilités ; celui-ci vérifie qu'on
  // JOUE. Sans lui, on pourrait casser le pilotage sans qu'aucun chiffre ne
  // bouge, puisque le moteur continuerait de placer le pion tout seul.
  const cap = (dx: number, dy: number) => {
    const e = creerMatch(A, B, effA, effB, 20, 15, 'pilote#1', AVATAR, { controle: true });
    let garde = 0;
    while (!e.fini && garde++ < 200) {
      avancer(e, 0.15);
      if (monPion(e).surLeTerrain) break;
    }
    const p = monPion(e);
    const depart = { x: p.pos.x, y: p.pos.y };
    for (let i = 0; i < 60; i++) {
      piloterDirection(e, dx, dy, false);
      avancer(e, 0.15);
    }
    return { dx: p.pos.x - depart.x, dy: p.pos.y - depart.y, endurance: p.endurance };
  };
  const versLeHaut = cap(0, -1);
  const versLaDroite = cap(1, 0);
  ligne('pousser vers le haut monte le pion', `Δy = ${versLeHaut.dy.toFixed(1)} m`, versLeHaut.dy < -6);
  ligne('pousser à droite le déplace à droite', `Δx = ${versLaDroite.dx.toFixed(1)} m`, versLaDroite.dx > 6);

  // Le sprint : plus loin, mais plus cher.
  const e1 = creerMatch(A, B, effA, effB, 20, 15, 'pilote#2', AVATAR, { controle: true });
  const e2 = creerMatch(A, B, effA, effB, 20, 15, 'pilote#2', AVATAR, { controle: true });
  const courir = (e: EtatMatch, sprint: boolean) => {
    let garde = 0;
    while (!e.fini && garde++ < 200) { avancer(e, 0.15); if (monPion(e).surLeTerrain) break; }
    const p = monPion(e);
    const depart = p.pos.x;
    for (let i = 0; i < 80; i++) { piloterDirection(e, 1, 0, sprint); avancer(e, 0.15); }
    return { metres: Math.abs(p.pos.x - depart), endurance: p.endurance };
  };
  const tranquille = courir(e1, false);
  const lance = courir(e2, true);
  ligne('le sprint va plus loin', `${tranquille.metres.toFixed(1)} → ${lance.metres.toFixed(1)} m`, lance.metres > tranquille.metres);
  ligne('et il coûte plus d’endurance', `${tranquille.endurance.toFixed(0)} → ${lance.endurance.toFixed(0)}`, lance.endurance < tranquille.endurance);

  // ⚠️ UNE RECHARGE PAR ACTION. Chambrer (45 s) ne doit pas rendre la PASSE
  // indisponible : c'était le défaut de la première version, et sur un jeu qui
  // se pilote en direct il est rédhibitoire.
  const e3 = creerMatch(A, B, effA, effB, 20, 15, 'pilote#3', AVATAR, { controle: true });
  let garde = 0;
  let chambre = false;
  while (!e3.fini && garde++ < 4000) {
    avancer(e3, 0.2);
    if (!chambre && actionsDisponibles(e3).some((a) => a.id === 'provoquer')) {
      demanderAction(e3, 'provoquer');
      chambre = true;
    }
    if (chambre && !e3.bagarre) break;
  }
  ligne('chambrer ne bloque que « chambrer »',
    `recharges : ${Object.keys(e3.recharges).join(', ') || 'aucune'}`,
    chambre && (e3.recharges.provoquer ?? 0) > 0 && !(e3.recharges.passe ?? 0));
}

// ---------------------------------------------------------------------------
// 8. 🗯️ LE MATCH S'ÉCHAUFFE TOUT SEUL — frictions, gestes illégaux, bulles
// ---------------------------------------------------------------------------
// ⚠️ CE BLOC MESURE UN RENVERSEMENT DE RÈGLE. La première version posait : « on
// ne déclenche jamais une bagarre au hasard, elle est toujours la suite d'un
// geste du joueur ». Conséquence en jeu : rien n'arrivait JAMAIS si l'on ne
// cliquait pas sur « chambrer », et l'équipe d'en face était un décor poli.
// Retour de jeu : « refais les bagarres pour que l'équipe d'en face puisse la
// lancer, et que ça vienne plutôt d'actions illégales — plaquage haut,
// chambrage — qui s'activent toutes seules ».
//
// Ce qu'on vérifie, et qui n'est PAS négociable :
//   • le match s'échauffe sans que le joueur ne clique sur rien ;
//   • une altercation peut naître du camp d'en face ;
//   • les gestes illégaux existent, mais restent RARES — un plaquage haut
//     toutes les dix minutes ferait un match de boxe ;
//   • et le score de la ligue ne bouge toujours pas d'un point.
console.log('\n=== 8. 🗯️ LE MATCH S’ÉCHAUFFE TOUT SEUL ===');
{
  /** Un match joué SANS que le joueur ne demande quoi que ce soit. */
  function passif(cle: string, niveau: NiveauMatch) {
    const m = jouerRencontre(A, B, 1, cle, null);
    const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle, AVATAR,
      { niveau, controle: true });
    let bulles = 0;
    // ⚠️ ON COMPTE LES OBJETS, PAS LES ÉTATS. Une bulle vit ~2,8 s simulées,
    // soit sept passages de boucle : la compter à chaque tour donnait
    // « 162 répliques par match » pour une vingtaine de phrases réellement
    // prononcées. L'identité de l'objet est le seul repère juste.
    const vues = new Set<object>();
    let tensionMax = 0;
    let garde = 0;
    while (!e.fini && garde++ < 30_000) {
      avancer(e, 0.4);
      for (const b of e.bulles) vues.add(b);
      if (e.bulles.length) bulles = Math.max(bulles, e.bulles.length);
      tensionMax = Math.max(tensionMax, e.tension);
      // On ne donne QUE l'ordre de reculer : le joueur ne provoque rien.
      if (e.bagarre && !e.bagarre.ordre) ordonner(e, 'reculer');
    }
    return { e, bullesSimultanees: bulles, repliques: vues.size, tensionMax, score: [m.scoreD, m.scoreE] as const };
  }

  let repliques = 0;
  let tension = 0;
  let bagarresSubies = 0;
  let ecarts = 0;
  let pireSimultane = 0;
  for (let i = 0; i < N; i++) {
    const r = passif('friction#' + i, i % 2 ? 'amateur' : 'pro');
    repliques += r.repliques;
    tension = Math.max(tension, r.tensionMax);
    bagarresSubies += r.e.discipline.bagarres;
    pireSimultane = Math.max(pireSimultane, r.bullesSimultanees);
    if (r.e.scoreA !== r.score[0] || r.e.scoreB !== r.score[1]) ecarts++;
  }

  console.log(`  ${'répliques entendues par match'.padEnd(46)} ${(repliques / N).toFixed(1)}`);
  console.log(`  ${'altercations subies par match'.padEnd(46)} ${(bagarresSubies / N).toFixed(2)}`);

  // ⚠️ LE JOUEUR N'A RIEN DEMANDÉ dans ces douze matchs : tout ce qui suit
  // vient du moteur seul.
  ligne('le match se parle sans qu’on clique', `${(repliques / N).toFixed(1)} répliques/match`, repliques > 0);
  ligne('la température monte toute seule', `pic ${Math.round(tension)}/100`, tension > 15);
  ligne('l’équipe d’en face peut allumer la mèche', `${bagarresSubies} sur ${N} matchs`, bagarresSubies > 0);
  // Une BD, ce n'est pas un match : au-delà de quatre bulles l'écran devient
  // illisible (BULLES_MAX dans bagarre.ts).
  ligne('jamais plus de 4 bulles à l’écran', `${pireSimultane}`, pireSimultane <= 4);
  // ⚠️ LA RÈGLE QUI NE PLIE PAS.
  ligne('le score reste celui de la ligue', `${ecarts} écart(s) sur ${N}`, ecarts === 0);
}

// ---------------------------------------------------------------------------
// 9. ⚖️ LES GESTES ILLÉGAUX RESTENT RARES
// ---------------------------------------------------------------------------
console.log('\n=== 9. ⚖️ PLAQUAGE HAUT ET PLAQUAGE EN RETARD ===');
{
  function compter(niveau: NiveauMatch, cle: string): number {
    const m = jouerRencontre(A, B, 1, cle, null);
    const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle, AVATAR,
      { niveau, controle: false });
    let garde = 0;
    while (!e.fini && garde++ < 30_000) avancer(e, 2);
    // ⚠️ ON COMPTE LE COMPTEUR, PAS LE TEXTE. « plaquage haut » figure DÉJÀ
    // dans MOTIFS_PENALITE (commentaire.ts) comme l'un des sept motifs tirés au
    // hasard pour habiller n'importe quelle pénalité : compter les phrases
    // mélangeait ces habillages avec la vraie mécanique et donnait 5,75 gestes
    // par match là où le moteur n'en produit que deux.
    return e.compteurs.irregularites;
  }
  // ⚠️ CETTE SECTION-LÀ A BESOIN DE PLUS DE MATCHS QUE LES AUTRES, et ce n'est
  // pas un caprice : un geste illégal tombe moins d'une fois par match. Sur
  // douze matchs on comparait huit évènements à neuf, et le contrôle « plus
  // fréquent en amateur » passait ou tombait au tirage, sans que le réglage
  // ait bougé d'un pouce (base 0,016 contre 0,009 : le rapport est de 1,8).
  // Un test qui répond au hasard est pire qu'une absence de test.
  const N_DISCIPLINE = 40;
  let amateur = 0;
  let pro = 0;
  for (let i = 0; i < N_DISCIPLINE; i++) {
    amateur += compter('amateur', 'irr#a#' + i);
    pro += compter('pro', 'irr#p#' + i);
  }
  console.log(`  ${'gestes illégaux sifflés par match'.padEnd(46)} amateur ${(amateur / N_DISCIPLINE).toFixed(2)} · pro ${(pro / N_DISCIPLINE).toFixed(2)}`);
  // ⚠️ LES BORNES SONT CELLES DU RUGBY, PAS D'UN GOÛT. Le carton pour plaquage
  // haut est la sanction la plus fréquente du jeu moderne, mais on parle d'un
  // ou deux par match — pas d'un toutes les dix minutes.
  ligne('ça existe vraiment', `${(pro / N_DISCIPLINE).toFixed(2)}/match en pro`, pro > 0);
  ligne('et ça reste rare (≤ 4/match)', `${(amateur / N_DISCIPLINE).toFixed(2)}/match en amateur`, amateur / N_DISCIPLINE <= 4);
  ligne('plus fréquent en amateur', `${(amateur / N_DISCIPLINE).toFixed(2)} vs ${(pro / N_DISCIPLINE).toFixed(2)}`, amateur > pro);
}

// ---------------------------------------------------------------------------
// 10. ⬅️➡️ LA PASSE A UN CÔTÉ
// ---------------------------------------------------------------------------
// ⚠️ Retour de jeu : « en mode A ou E pour faire la passe droite ou gauche ».
// Le test qui compte n'est pas « la passe part » mais « elle part DU BON
// CÔTÉ » — et le côté est celui de l'ÉCRAN, donc retourné pour le camp B
// (voir `receveurCote`). Un signe de travers, et le ballon part à l'opposé un
// match sur deux.
console.log('\n=== 10. ⬅️➡️ LA PASSE À GAUCHE VA À GAUCHE ===');
{
  let testes = 0;
  let justes = 0;
  for (let i = 0; i < N; i++) {
    const cle = 'passe#' + i;
    const m = jouerRencontre(A, B, 1, cle, null);
    const e = creerMatch(A, B, effA, effB, m.scoreD, m.scoreE, cle, AVATAR,
      { niveau: 'pro', controle: true });
    let garde = 0;
    while (!e.fini && garde++ < 30_000) {
      avancer(e, 0.3);
      const moi = e.pions.find((q) => q.moi)!;
      if (e.porteur !== moi || !moi.surLeTerrain) continue;
      for (const cote of [-1, 1] as const) {
        const r = receveurCote(e, moi, cote);
        if (!r) continue;
        testes++;
        // Le camp A attaque vers les X croissants : sa gauche d'écran est les
        // Y décroissants. Pour le camp B, tout est retourné.
        const s = moi.cote === 'A' ? 1 : -1;
        const versY = cote * s;
        const bonCote = (r.pos.y - moi.pos.y) * versY > 0;
        const pasEnAvant = (r.pos.x - moi.pos.x) * s <= 0.6;
        if (bonCote && pasEnAvant) justes++;
      }
    }
  }
  console.log(`  ${'receveurs proposés'.padEnd(46)} ${testes}`);
  ligne('on trouve bien des receveurs des deux côtés', `${testes} cas`, testes > 20);
  ligne('toujours du bon côté ET jamais en avant', `${justes}/${testes}`, testes > 0 && justes === testes);
}
console.log(`\nbagarres/match — amateur ${bagarresAmateur.toFixed(2)} · pro ${bagarresPro.toFixed(2)}`);
console.log(echecs === 0
  ? '\n✅ TOUT EST BON — actions contextuelles, gestes qui pèsent, discipline asymétrique amateur/pro.'
  : `\n❌ ${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
