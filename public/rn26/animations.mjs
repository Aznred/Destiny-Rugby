// LA BIBLIOTHÈQUE D'ANIMATIONS DU MATCH (Correctif 30).
//
// Le moteur LIT chaque situation et écrit une VARIANTE dans l'état (`src/lib/moteur/animations.ts`) ; ce module dit quels
// clips la racontent. Rien n'est choisi ici : à une variante correspond une suite, toujours la même — deux écrans qui
// lisent le même état montrent la même image, en carrière comme dans le direct d'une ligue.
//
// ⚠️ MODULE DE DONNÉES : aucun import (ni three, ni la scène). Le banc `verifierAnimations30.ts` le charge sous Node pour
// vérifier que chaque variante du moteur a sa suite, et que chaque clip cité existe dans le catalogue.
//
// Une SUITE est une liste de temps `[clip, durée jouée, départ dans le clip, cadence]`, enchaînés depuis le début du geste ;
// le dernier temps est tenu. La scène fond d'un clip au suivant (0,16 s) : jamais de coupure.
// `c` : d'où vient le plaqueur, vu du porteur — −1 à sa gauche, 1 à sa droite, 0 de face, 2 dans son dos.

const cote = c => (c === -1 ? 'left' : c === 1 ? 'right' : c === 2 ? 'behind' : 'front');
const lateral = c => (c === 1 ? 'right' : 'left');
/** Au sol après un plaquage debout : il présente le ballon, puis reste couché. */
export const AU_SOL = [['standing_tackled_put_out', .75], ['standing_tackled_hold', 99]];
const FAUCHE = { front: .47, left: .53, right: .67, behind: .67 };
const POSE = { front: .6, left: .93, right: .8, behind: .93 };
/** Fauché aux jambes : la chute dépend du côté, la présentation du ballon aussi. */
const fauche = c => { const d = cote(c); return [['dive_tackled_' + d, FAUCHE[d]], ['dive_tackled_' + d + '_put_out', POSE[d]], ['dive_tackled_' + d + '_hold', 99]]; };
/** Fauché, il roule sur le ballon pour le protéger avant de le présenter. */
const faucheProtege = c => { const d = cote(c); return [['dive_tackled_' + d, FAUCHE[d]], ['dive_tackled_' + d + '_shield_ball', .67], ['dive_tackled_' + d + '_shield_ball_put_out', 1], ['dive_tackled_' + d + '_shield_ball_hold', 99]]; };
/** Fauché devant la ligne : il tend le bras vers elle. Le plaquage l'a arrêté — le ballon n'y arrive pas. */
const faucheTendu = c => { const d = cote(c); return [['dive_tackled_' + d, FAUCHE[d]], ['dive_tackled_' + d + '_hold_try_reach_' + (d === 'left' ? 'left' : 'right'), 99]]; };
const PLONGEON = [['dive_tackle_pre', .2, .12], ['dive_tackle_success', 1.67], ['dive_tackle_success_hold', .5]];
const SAISIE = [['standing_tackle_front_grab', .3], ['standing_tackle_success_going_down', 1.15, .1, 1.6]];
const SAISI = [['standing_tackled_front_grabbed', .3], ['standing_tackled_going_down', 1, .1, 1.47], ...AU_SOL];

// ═══ LES VINGT-DEUX PLAQUAGES ═══════════════════════════════════════════════
// `repli` : le type du moteur d'origine (voir PLAQUAGES dans destiny.mjs) joué tant que la banque « contact » n'est pas arrivée.
// `releve` : le clip du plaqueur qui se relève (défaut : standing_tackled_get_up) ; `debout` : sa suite le laisse déjà debout.
export const PLAQUAGES30 = {
  jambes: { repli: 'jambes', releve: 'dive_tackle_success_get_up', plaqueur: () => PLONGEON, plaque: fauche },
  'jambes-cote': { repli: 'jambes', releve: 'dive_tackle_success_get_up',
    plaqueur: () => [['dive_tackle_pre', .24, .1], ['dive_tackle_success', 1.5, .1, 1.05], ['dive_tackle_success_hold', .5]], plaque: c => faucheProtege(c === 0 ? -1 : c) },
  // Fauché net à pleine vitesse : le porteur part en roulé-boulé, le plaqueur a tout juste eu les chevilles.
  fauche: { repli: 'jambes', releve: 'dive_tackle_success_get_up',
    plaqueur: () => [['dive_tackle_pre', .16, .2], ['dive_tackle_success', 1.3, 0, 1.28], ['dive_tackle_success_hold', .6]],
    plaque: () => [['tap_tackled_fall', 1, 0, 1.13], ...AU_SOL] },
  chevilles: { repli: 'poursuite',
    plaqueur: () => [['tap_tackle_pre', .37], ['tap_tackle_fall', .4], ['tap_tackle_hold', 1.2]], plaque: () => [['tap_tackled_fall', 1.13], ...AU_SOL] },
  'in-extremis': { repli: 'jambes', releve: 'dive_tackle_success_get_up',
    plaqueur: () => [['dive_tackle_pre', .22, .1], ['dive_tackle_success', 1.67], ['dive_tackle_success_hold', .9]], plaque: faucheTendu },
  bassin: { repli: 'haut', plaqueur: () => SAISIE, plaque: () => SAISI },
  // Le troisième ligne frais : il plaque, roule, et il est déjà sur ses appuis au-dessus du ballon.
  'bassin-roule': { repli: 'haut', debout: true,
    plaqueur: () => [['standing_tackle_front_grab', .25], ['standing_tackle_success_going_down', .9, .15, 2], ['standing_tackle_down_to_jackal', 1.13], ['idle_bend_over', 99]],
    plaque: () => SAISI },
  // Épaule contre épaule : les deux encaissent, le porteur met un genou à terre avant de tomber.
  epaules: { repli: 'haut',
    plaqueur: () => [['dangerous_tackle_smash_pre', .14, .22], ['bumped_hit', .45, .05], ['standing_tackle_success_going_down', 1.05, .25, 1.6]],
    plaque: () => [['bumped_hit', .5, .05], ['tackled_onto_knees_struggle_only', .83], ['standing_tackled_going_down', .8, .5, 1.3], ...AU_SOL] },
  protege: { repli: 'haut', plaqueur: () => SAISIE,
    plaque: () => [['standing_tackled_front_grabbed', .3], ['standing_tackled_shield_ball_going_down', 1.3, .1, 1.13], ['standing_tackled_shield_ball_put_out', .7], ['standing_tackled_shield_ball_hold', 99]] },
  // À deux : le premier aux jambes, le second en haut qui enferme le ballon.
  'a-deux': { repli: 'jambes', releve: 'dive_tackle_success_get_up', plaqueur: () => PLONGEON,
    second: () => [['standing_tackle_front_grab', .35], ['standing_tackle_front_struggle', .7], ['standing_tackle_success_going_down', .9, .2, 1.9], ['standing_tackle_success_get_up', 1.4, .9, 1.3]],
    plaque: () => [['standing_tackled_front_grabbed', .35], ['standing_tackled_front_struggle', .5], ['standing_tackled_going_down', .95, .1, 1.55], ...AU_SOL] },
  haut: { repli: 'haut',
    plaqueur: () => [['standing_tackle_front_grab', .3], ['standing_tackle_front_struggle', .45], ['standing_tackle_success_going_down', .95, .15, 1.9]],
    plaque: () => [['standing_tackled_front_grabbed', .3], ['standing_tackled_front_struggle', .45], ['standing_tackled_going_down', .95, .1, 1.55], ...AU_SOL] },
  'sur-le-dos': { repli: 'haut',
    plaqueur: () => [['standing_tackle_front_grab', .3], ['standing_tackle_front_struggle', .5], ['standing_tackle_success_going_down', .95, .15, 1.9]],
    plaque: () => [['standing_tackled_front_grabbed', .3], ['standing_tackled_going_down', .75, .2, 1.7], ['tackled_onto_back_struggle_only', 1.53], ...AU_SOL] },
  cote: { repli: 'cote',
    plaqueur: () => [['standing_tackle_front_grab', .25], ['standing_tackle_success_going_down', 1.05, 0, 1.87]],
    plaque: c => [['tackled_' + lateral(c) + '_struggle', .55], ['standing_tackled_going_down', .85, .2, 1.6], ...AU_SOL] },
  'cote-roule': { repli: 'cote', releve: 'dive_tackle_success_get_up',
    plaqueur: () => [['standing_tackle_front_grab', .2], ['dive_tackle_success', 1.4, .25], ['dive_tackle_success_hold', .5]], plaque: c => fauche(c === 0 || c === 2 ? -1 : c) },
  // Le défenseur n'a que ses bras : il glisse le long du porteur et le fait tomber par les chevilles.
  glisse: { repli: 'cote',
    plaqueur: () => [['standing_tackle_front_grab', .3], ['standing_tackle_fail_going_down', .8, 0, 1.3], ['tap_tackle_fall', .4], ['tap_tackle_hold', 1]],
    plaque: c => [['tackled_' + lateral(c) + '_struggle', .9], ['tap_tackled_fall', 1, .1], ...AU_SOL] },
  dos: { repli: 'arriere',
    plaqueur: () => [['standing_tackle_behind_grab', .33], ['standing_tackle_behind_struggle', .5], ['standing_tackle_success_going_down', .9, .2, 1.9]],
    plaque: () => [['standing_tackled_behind_grabbed', .23], ['standing_tackled_behind_struggle', .6], ['standing_tackled_going_down', .9, .15, 1.55], ...AU_SOL] },
  'dos-plonge': { repli: 'arriere', releve: 'dive_tackle_success_get_up',
    plaqueur: () => [['dive_tackle_pre', .25, .1], ['dive_tackle_success', 1.67], ['dive_tackle_success_hold', .5]], plaque: () => fauche(2) },
  offensif: { repli: 'dominant',
    plaqueur: () => [['dangerous_tackle_smash_pre', .16, .2], ['dangerous_tackle_smash_success', 1.37], ['standing_tackle_success_hold', .4]],
    plaque: c => [['dangerous_tackled_smash_' + (c === 2 ? 'behind' : 'front') + '_going_down', 1.5], ...AU_SOL] },
  'offensif-cote': { repli: 'dominant',
    plaqueur: () => [['dangerous_tackle_smash_pre', .16, .2], ['dangerous_tackle_smash_success', 1.37], ['standing_tackle_success_hold', .4]],
    plaque: c => [['dangerous_tackled_smash_' + lateral(c) + '_going_down', 1.5], ...AU_SOL] },
  debout: { repli: 'debout',
    plaqueur: () => [['choke_tackle_grab_hold', .7], ['choke_tackle_struggle', .85], ['standing_tackle_success_going_down', .9, .2, 1.9]],
    plaque: () => [['choke_tackle_grabbed_hold', .7], ['choke_tackled_struggle', .85], ['standing_tackled_going_down', .9, .15, 1.55], ...AU_SOL] },
  // Soulevé du sol, tenu, emmené deux pas en arrière — puis posé : le ballon ne sortira pas vite.
  'debout-porte': { repli: 'debout',
    plaqueur: () => [['choke_tackle_grab_hold', .6], ['choke_tackle_lift_hold', .82], ['choke_tackle_lift_walk', 1.2], ['standing_tackle_success_going_down', .9, .2, 1.9]],
    plaque: () => [['choke_tackle_grabbed_hold', .6], ['choke_tackled_struggle_walk', 2], ['standing_tackled_going_down', .9, .15, 1.55], ...AU_SOL] },
  'gagne-metres': { repli: 'accroche',
    plaqueur: () => [['standing_tackle_front_grab', .2], ['standing_tackle_behind_struggle', .6], ['standing_tackle_success_going_down', .95, .15, 1.9]],
    plaque: c => [['tackled_' + lateral(c) + '_struggle', .8], ['standing_tackled_going_down', .95, .1, 1.55], ...AU_SOL] },
};

// ═══ LES TREIZE PLAQUAGES MANQUÉS ═══════════════════════════════════════════
// La suite se compte depuis l'instant du contact ; `debout` : le défenseur ne tombe pas (le moteur ne l'a pas fait tomber).
// `repli` : la suite de `common` jouée en attendant la banque.
const REPLI_MANQUE = [['standing_tackle_fail_going_down', 1.2, 0, 1.19], ['standing_tackle_fail_get_up', 1.1, 1.1, 1.36]];
export const MANQUES = {
  // Parti trop tôt : il plonge là où le porteur n'est déjà plus.
  'plonge-tot': [['dive_tackle_pre', .25, .1], ['dive_tackle_fail', 1], ['dive_tackle_fail_hold', .25], ['dive_tackle_fail_get_up', 1, .3, 2.2]],
  // Le porteur est reparti dans son dos : il se relève en se retournant.
  'passe-derriere': [['dive_tackle_pre', .2, .12], ['dive_tackle_fail', .9, .05, 1.05], ['dive_tackle_fail_get_up_rotneg50', 1.2, .2, 2]],
  // Pris à contre-pied : l'appui lâche, il tombe du mauvais côté.
  'contre-pied': [['running_change_direction', .45, .2], ['tackler_standing_fail_going_down_immediately', .93], ['standing_tackle_fail_get_up', 1, .4, 2.2]],
  'glisse-cote': [['standing_tackle_fail_going_down', 1.1, 0, 1.3], ['standing_tackle_fail_hold', .2], ['standing_tackle_fail_get_up', 1, .42, 2.18]],
  // Il n'accroche qu'une jambe : le porteur trébuche (voir TREBUCHE) et repart.
  'une-jambe': [['tap_tackle_pre', .37], ['tap_tackle_fall', .4], ['tap_tackle_hold', .5], ['dive_tackle_fail_get_up_rot20', 1.1, .3, 2.1]],
  // Battu à la course : il se jette dans le dos du porteur, les mains dans le vide.
  depasse: [['tap_tackle_pre', .37], ['dive_tackle_fail', .9, .1], ['dive_tackle_fail_hold', .3], ['dive_tackle_fail_get_up', .9, .35, 2.4]],
  // À bout de forces : il tombe à genoux, et se relève aussitôt.
  'a-genoux': [['standing_tackle_front_grab', .3], ['tackled_onto_knees_struggle_only', .83], ['tackled_onto_knees_stand_up_only', 1.3, 0, 1.25]],
  // Grosse percussion : il part à la renverse.
  percute: [['charged_through', 1.5], ['standing_tackled_get_up', .9, 1.3, 1.6]],
  // Raffut : assis sur les fesses.
  assis: [['bumped_hit', 1.03], ['bumped_hold', .5], ['standing_tackled_get_up', .87, 1.3, 1.6]],
  // Il rebondit sur le porteur, perd l'équilibre, se rattrape trop tard.
  rebondit: [['bumped_hit', .8, .05], ['standing_tackle_fail_going_down', .6, .5, 1.2], ['standing_tackle_fail_get_up', .8, .6, 2.4]],
  // Debout, battu : planté sur le mauvais appui ; un bras tendu qui n'accroche rien ; repoussé par la main du porteur.
  plante: [['running_change_direction', 1, .25]],
  bras: [['standing_tackle_front_grab', .38], ['jog_change_direction', .72, .35]],
  raffute: [['fended_hit', 1, .05]],
};
export const MANQUES_DEBOUT = new Set(['plante', 'bras', 'raffute']);
export const REPLIS_MANQUE = { debout: [['running_change_direction', 1, .25]], sol: REPLI_MANQUE };
/** Le porteur dont on n'a accroché qu'une jambe : il trébuche sans tomber. */
export const TREBUCHE = { left: 'tap_tackled_avoid_01', right: 'tap_tackled_avoid_02', duree: 1.1 };

// ═══ LES DOUZE CROCHETS ═════════════════════════════════════════════════════
// `vers` : le côté de l'appui (left/right), `contre` : l'autre. Chaque entrée rend ce que joue le porteur à l'instant t :
//   { clip, time }                    tout le corps (l'appui se voit dans les jambes)
//   { upper, time, poids }            le buste seul, les jambes gardent leur course
//   raise / sway                      centre de gravité (négatif : plus bas), buste qui se penche (radians)
//   fin                               durée du geste
const cloche = (t, centre, largeur) => Math.exp(-(((t - centre) / largeur) ** 2));
export const CROCHETS = {
  interieur: (t, vers) => ({ clip: 'dodge_' + vers, time: .15 + t * 1.05, fin: .95 }),
  // Vers l'espace : l'appui est plus ample et le buste s'ouvre vers l'extérieur.
  exterieur: (t, vers) => ({ clip: 'dodge_' + vers, time: .12 + t * 1.12, sway: (vers === 'left' ? 1 : -1) * .14 * cloche(t, .35, .25), fin: .9 }),
  // Un faux pas d'un côté, puis le vrai appui.
  double: (t, vers, contre) => ({ clip: 'dodge_' + (t < .28 ? contre : vers), time: .15 + t * 1.05, fin: .95 }),
  // Le défenseur est déjà là : un seul petit appui, sec.
  'appui-court': (t, vers) => ({ clip: 'dodge_' + vers, time: .32 + t * 1.5, fin: .58 }),
  // Presque arrêté : seules les épaules partent d'un côté.
  'feinte-corps': (t, vers) => ({ upper: 'dodge_' + vers, time: .2 + t, poids: Math.min(1, t / .1) * Math.max(0, Math.min(1, (.9 - t) / .25)), sway: (vers === 'left' ? 1 : -1) * .2 * cloche(t, .3, .2), fin: .9 }),
  // Les épaules annoncent l'extérieur, les jambes repartent à l'intérieur.
  'faux-exterieur': (t, vers, contre) => (t < .3
    ? { upper: 'dodge_' + contre, time: .22 + t, poids: Math.min(1, t / .08), sway: (contre === 'left' ? 1 : -1) * .26 * cloche(t, .18, .14), fin: 1.15 }
    : { clip: 'dodge_' + vers, time: .18 + (t - .3) * 1.1, fin: 1.15 }),
  // Il freine net, laisse passer le défenseur, et repart.
  'arret-relance': t => (t < .45 ? { clip: 'running_change_direction', time: .3 + t * .9, fin: 1.1 } : { clip: 'idle_to_sprint', time: (t - .45) * 1.15, raise: -.1, fin: 1.1 }),
  // Très bas, très vite : un changement d'appui à pleine vitesse.
  explosif: (t, vers) => ({ clip: 'dodge_' + vers, time: .2 + t * 1.6, raise: -.14 * cloche(t, .22, .2), fin: .6 }),
  // Centres et avants : un seul appui, lourd, les épaules basses, sans rien perdre de la course.
  lourd: (t, vers) => ({ clip: 'dodge_' + vers, time: .15 + t * .82, raise: -.2 * cloche(t, .45, .35), fin: 1.1 }),
  // Lancé : le bassin tourne, les épaules restent dans l'axe.
  bassin: (t, vers) => ({ clip: vers === 'left' ? 'tap_tackled_avoid_01' : 'tap_tackled_avoid_02', time: .12 + t * 1.1, fin: 1 }),
  // L'appui, puis il se couche en avant pour accélérer.
  accelere: (t, vers) => (t < .55 ? { clip: 'dodge_' + vers, time: .15 + t * 1.25, fin: 1.05 } : { raise: -.22 * cloche(t, .78, .22), fin: 1.05 }),
  // Raté : l'appui est amorcé, le défenseur est resté devant — le plaquage le coupe.
  rate: (t, vers) => ({ clip: 'dodge_' + vers, time: .15 + t * 1.05, fin: .42 }),
  // Variante du moteur d'origine.
  feinte: (t, vers) => ({ upper: 'dodge_' + vers, time: .2 + t, poids: Math.min(1, t / .1) * Math.max(0, Math.min(1, (.9 - t) / .25)), fin: .9 }),
};

// ═══ RAFFUTS ET PERCUSSIONS ═════════════════════════════════════════════════
// `haut` : le clip du buste (`cote` → handoff_left/right selon le côté du défenseur) ; `main` : où la main va se poser sur le
// défenseur (os visé, par cinématique inverse) ; `rentre` : secondes pendant lesquelles il rentre d'abord le ballon à deux mains.
export const RAFFUTS = {
  'bras-tendu': { haut: 'cote', main: 'CC_Base_Spine02', poids: 1, fin: 1.1 },
  poitrine: { haut: 'fend', depart: .12, main: 'CC_Base_Spine02', poids: 1, fin: 1.2 },
  epaule: { haut: 'cote', main: 'epaule', poids: 1, fin: 1 },
  'main-epaule': { haut: 'cote', main: 'epaule', poids: .75, penche: .18, fin: .9 },
  'protege-repousse': { haut: 'cote', main: 'CC_Base_Spine02', poids: 1, rentre: .32, fin: 1.2 },
  'en-course': { haut: null, main: 'CC_Base_Spine02', poids: .9, fin: .7 },
  // Les deux gestes du moteur d'origine.
  torse: { haut: 'fend', depart: .12, main: null, fin: 1.2 },
};
export const PERCUSSIONS = {
  // Le centre puissant : épaule en avant, il veut passer à travers.
  traverse: { haut: 'bump', depart: .1, raise: -.22, fin: 1.1 },
  // Le troisième ligne lancé : très bas, ballon protégé, les jambes continuent de pousser.
  lance: { haut: 'drive_with_ball', boucle: true, raise: -.3, fin: 1.1 },
  // Le pilier sur un plus léger : il ne se baisse même pas.
  pilier: { haut: 'bump', depart: .1, raise: -.1, fin: 1.2 },
  // Quelques centimètres : il s'arc-boute et pousse.
  centimetres: { haut: 'drive_with_ball', boucle: true, raise: -.26, fin: .9 },
  // Stoppé net : le buste part en arrière sous le choc.
  stoppe: { haut: 'bumped_hit', depart: .05, raise: .06, fin: .7 },
  casse: { haut: 'standing_tackled_breakaway', depart: 0, raise: 0, fin: .9 },
  percussion: { haut: 'bump', depart: .1, raise: -.2, fin: 1.1 },
};

// ═══ LE RUCK ════════════════════════════════════════════════════════════════
// Le gratteur, depuis le contact : `t` = { appui, lutte, fin } (les durées écrites par le moteur dans `ruck.duel.temps`).
export const GRATTAGES = {
  rapide: t => [['jackal_engage', t.appui, 0, .57 / t.appui], ['jackal_struggle', t.lutte, .2], ['jackal_success_standup', 99]],
  conteste: t => [['jackal_engage', t.appui], ['jackal_struggle', t.lutte * .55], ['jackal_struggle', t.lutte * .45, .35], ['jackal_success_standup', 99]],
  // Il tient malgré le déblayage : la lutte dure, jusqu'au coup de sifflet.
  penalite: t => [['jackal_engage', t.appui], ['jackal_struggle', t.lutte * .5], ['jackal_struggle', t.lutte * .5, .3], ['jackal_struggle', 99, .5, .4]],
  // Nettoyé : il est arraché du ballon et part à la renverse.
  perdu: t => [['jackal_engage', t.appui], ['jackal_struggle', t.lutte], ['jackal_cleared_out', 1.2], ['standing_tackled_get_up', 99, 1.6, 1.3]],
  // Trop tard : il plonge sur un ruck formé, sans tenir sur ses appuis.
  tardif: t => [['jackal_engage', t.appui, 0, .57 / t.appui], ['jackaller_not_supporting_own_weight', t.lutte, .25], ['jackaller_not_supporting_own_weight_standup', 99]],
};
export const REPLI_GRATTAGE = [['pick_up_ball', .6], ['idle_bend_over', 99]];
/** Le soutien qui vient déloger le gratteur : il arrive lancé, épaule basse (« deloge »), ou bute sur lui (« bute »). */
export const DELOGEURS = {
  deloge: [['jackal_clear_out', 1.2], ['ruck_struggle_middle_front', 99, 0, .5]],
  bute: [['ruck_engage_middle_front', 1.1, 0, 1.3], ['ruck_struggle_middle_front_second', 99, 0, .9]],
};
// Les huit déblayages : ce que joue le nettoyeur, ce que joue celui qu'il nettoie. `cote` : left/right selon l'angle d'arrivée.
export const DEBLAYAGES = {
  'epaule-basse': { nettoyeur: () => [['ruck_engage_middle_front', 1.1, 0, 1.3], ['ruck_struggle_middle_front', 99, 0, .8]], cible: () => [['ruck_struggle_middle_front', 99, .2, .9]], raise: -.22 },
  'poussee-droite': { nettoyeur: () => [['ruck_engage_middle', 1.25], ['ruck_struggle_middle_front', 99, 0, .6]], cible: () => [['ruck_struggle_middle_front_second', 99, 0, .8]] },
  cote: { nettoyeur: c => [['ruck_engage_' + c, 1.25], ['ruck_struggle_' + c, 99, 0, .7]], cible: c => [['ruck_struggle_' + (c === 'left' ? 'right' : 'left'), 99, 0, .8]] },
  'a-deux': { nettoyeur: () => [['ruck_engage_middle_front_second', 1.2, 0, 1.2], ['ruck_struggle_middle_front_second', 99]], cible: c => [['ruck_struggle_middle_front', .7], ['ruck_disengage_' + c, .67], ['walking_backward', 99, 0, 1]] },
  // Il tient : le nettoyeur s'épuise dessus, lui reste haut et ne recule pas.
  resiste: { nettoyeur: () => [['ruck_engage_middle', 1.1], ['ruck_struggle_middle_front', 99, 0, 1.1]], cible: () => [['ruck_struggle_middle_front_second', 99, 0, .5]], raiseCible: .12 },
  repousse: { nettoyeur: () => [['ruck_engage_middle_front', 1.1, 0, 1.3], ['ruck_struggle_middle_front', 99]], cible: () => [['ruck_struggle_middle_front', .45], ['ruck_disengage_middle_front_second', .67], ['walking_backward', 99]] },
  // Déséquilibré : le moteur le fait tomber — la chute est jouée par le corps au sol.
  desequilibre: { nettoyeur: () => [['ruck_engage_middle_front', 1, 0, 1.45], ['ruck_struggle_middle_front', 99]], cible: () => [['jackal_cleared_out', 1.2]] },
  accroche: { nettoyeur: () => [['ruck_engage_right', 1.3, 0, 1.1], ['ruck_struggle_right', 99, 0, .6]], cible: () => [['ruck_struggle_left', 99, 0, .6]] },
};
export const REPLI_DEBLAYAGE = { nettoyeur: [['ruck_engage_middle', 99]], cible: [['ruck_struggle_middle_front', 99]] };
/** Le contre-ruck : seul, à deux, ou en groupe — cadence de la poussée, hauteur du buste, écart entre les contreurs. */
export const CONTRE_RUCKS = {
  un: { cadence: 1.2, raise: .18, entree: 'ruck_engage_middle_front' },
  deux: { cadence: 1.5, raise: .25, entree: 'ruck_engage_middle' },
  collectif: { cadence: 1.7, raise: .3, entree: 'ruck_engage_middle_front_second' },
};

// ═══ PASSES ET RÉCEPTIONS ═══════════════════════════════════════════════════
// Passe : `clip` (court/long), poids du buste, fenêtre du geste, inclinaison. Réception : clip du buste, départ, poids,
// hauteur visée par les mains, torsion du buste (vers l'arrière : ballon reçu derrière soi), second temps (ballon qui danse).
export const PASSES = {
  classique: { long: null, poids: 1, fin: .75 },
  vrillee: { long: true, poids: 1, fin: .95, suivi: .22 },
  courte: { long: false, poids: .62, fin: .5, avance: .12 },
  'avant-plaquage': { long: false, poids: 1, fin: .6, avance: .1, penche: -.2 },
};
export const RECEPTIONS = {
  poitrine: { clip: 'cote', poids: 1, hauteur: 1.15 },
  'bras-tendus': { clip: 'cote', poids: 1, hauteur: 1.35, tendus: .55, tot: .18 },
  haute: { clip: 'jumping_catch_success', depart: .25, poids: .9, hauteur: 2.1, tendus: .5 },
  derriere: { clip: 'cote', poids: 1, hauteur: 1.1, torsion: .42, tendus: .35 },
  difficile: { clip: 'catch_kick_arm_only', depart: .35, poids: .95, hauteur: 1.05, penche: -.15 },
  jonglee: { clip: 'jumping_catch_fail', depart: .1, poids: .8, hauteur: 1.25, second: .34 },
  course: { clip: 'cote', poids: .85, hauteur: 1.2, tot: .08 },
};
/** Le coup de pied dans le jeu : clip par intention et par style (posé, en course, pressé). */
export const FRAPPES30 = {
  presse: { rasant: 'kick_grubber_loose', defaut: 'kick_running', penche: .16 },
  'en-course': { defaut: 'kick_running' },
  renvoi22: '22_drop_out',
};
export const CONTRE = { bras: { clip: 'charge_down_long', depart: .55, cadence: 1.1 }, gene: { clip: 'charge_down_long', depart: .7, cadence: 1, haut: true } };

// ═══ ESSAIS, CÉLÉBRATIONS, DÉCEPTIONS ═══════════════════════════════════════
// `fin` : l'instant où le marqueur a fini de marquer (il se relève et célèbre ensuite) ; `biais` : il plonge de travers, vers le coin.
export const ESSAIS = {
  plongeon: { clip: 'try_dive', fin: 4.05 },
  puissance: { clip: 'dive_on_ball_try', fin: 3.7 },
  glissade: { clip: 'try_dive_quick', fin: 3.75 },
  calme: { clip: 'touchdown_quick', fin: 2.8 },
  poteaux: { clip: 'touchdown', fin: 3.4 },
  coin: { clip: 'try_dive', fin: 4.05, biais: .45 },
  melee: { clip: 'try_touchdown_quick', fin: 1.35 },
  maul: { clip: 'try_pushover_maul', fin: 4.05 },
  interception: { clip: 'try_dive_flamboyant', fin: 5.3 },
};
export const REPLI_ESSAI = { plonge: { clip: 'try_dive', fin: 4.05 }, pose: { clip: 'try_touchdown', fin: 1.9 } };
// Le marqueur, puis ceux qui viennent à lui. `leve` : il brandit le ballon (construit : le bras monte, le ballon avec).
export const CELEBRATIONS30 = {
  sobre: { marqueur: ['PlayerIdleSpotExcited02_003'], feteurs: ['FrontRowRightClap_001_celebrate'], rayon: 2.6 },
  accolade: { marqueur: ['PlayerCelebration01_002', 'celebration_c', 'PlayerCelebration03_001'], feteurs: ['BackRowCelebrate_001_celebrate', 'FrontRowRightClap_001_celebrate'], rayon: 3.4 },
  'ballon-leve': { marqueur: ['PlayerCelebration06_002', 'PlayerCelebration02_001'], feteurs: ['PlayerIdleSpotExcited01_002', 'BackRowCelebrate_002_celebrate', 'FrontRowLeft_001_celebrate'], rayon: 3.4, leve: true },
  collective: { marqueur: ['PlayerCelebration04_002', 'PlayerCelebration05_002', 'celebration_b'],
    feteurs: ['BackRowCelebrate_001_celebrate', 'BackRowCelebrate_002_celebrate', 'FrontRowLeft_001_celebrate', 'FrontRowRightClap_001_celebrate', 'PlayerIdleSpotExcited03_002', 'PlayerIdleSpotExcited04_002'], rayon: 4.2 },
  decisive: { marqueur: ['PlayerCelebration07_001', 'PlayerCelebration07_004', 'celebration_d'],
    feteurs: ['PlayerIdleSpotExcited05_001', 'PlayerIdleSpotExcited04_002', 'PlayerIdleSpotExcited03_002', 'PlayerIdleSpotExcited01_002', 'BackRowCelebrate_002_celebrate', 'FrontRowLeft_001_celebrate', 'PlayerConversionCelebration02_001'], rayon: 5.5, leve: true },
};
/** Ceux qui viennent d'encaisser : tête basse, mains sur les hanches — plus marqué quand l'essai fait mal. */
export const DECEPTIONS = ['PlayerIdleSpotDisappointed01_002', 'PlayerIdleSpotDisappointed03_001', 'PlayerIdleSpotDisappointed02_001', 'PlayerIdleSpotDisappointed04_006', 'dejected_05'];

// ═══ LES FAUTES, TELLES QUE LE JOUEUR LES COMMET ════════════════════════════
// ⚠️ `high_tackle`, `not_releasing_ball`, `not_rolling_away`, `collapsing_ruck_or_maul`, `not_releasing_player` ne sont PAS
// des gestes de joueur : ce sont les SIGNAUX DE L'ARBITRE de l'APK (debout, sur place, les bras seuls). Ils étaient joués par
// le fautif — un plaqueur immobile qui mimait le geste de l'arbitre. Chaque faute a maintenant le geste de celui qui la commet,
// et l'arbitre le signal qui lui correspond (ARBITRE, plus bas).
export const FAUTES30 = {
  // Monté trop haut : les bras se referment au niveau des épaules (cinématique inverse sur la victime).
  foul_high: { suite: c => [['standing_tackle_front_grab', .3], ['rip_tackle_' + (c === 1 ? 'right' : 'left'), 1], ['standing_tackle_front_struggle', 99, .3, .6]], brasHaut: true, vise: true },
  foul_late: { suite: () => [['dangerous_tackle_smash_pre', .16, .2], ['dangerous_tackle_smash_success', 1.37]], vise: true },
  foul_charge: { suite: () => [['dangerous_tackle_charge_pre', .3, .23], ['dangerous_tackle_charge_success', 1.23]], vise: true },
  foul_tip: { suite: () => [['dangerous_tackle_tip_grab', 1.83], ['dangerous_tackle_tip_hold', 99]], vise: true },
  foul_kick: { suite: () => [['kick_grubber', 1.27]], vise: true },
  // Le plaqué ne lâche pas : couché sur le ballon, il le garde contre lui.
  foul_holding_ball: { suite: () => [['standing_tackled_shield_ball_going_down', .5, 1], ['standing_tackled_shield_ball_hold', 99]] },
  // Le plaqueur reste couché dans le passage du ballon.
  foul_not_rolling: { suite: () => [['standing_tackle_success_going_down', .5, 1.4], ['standing_tackle_success_hold', 99]] },
  foul_off_feet: { suite: () => [['jackaller_not_supporting_own_weight', 1.33], ['jackaller_not_supporting_own_weight_standup', 99]] },
  foul_side_entry: { suite: () => [['ruck_engage_left', 1.47], ['ruck_struggle_left', 99, 0, .7]], travers: true },
  foul_collapse: { suite: () => [['maul_push_walk_collapse_forwards', 2.9]] },
  foul_scrum: { suite: () => [['maul_push_walk_collapse_forwards', 1.8, .4], ['standing_tackled_get_up', 99, 1.4, 1.2]] },
  // Obstruction : il se met en travers, épaule en opposition, sans jouer le ballon.
  foul_obstruction: { suite: () => [['bump', .9, .15], ['fended_hold', 99]], vise: true },
  foul_forwardpass: { suite: () => [['pass_forward', .83]] },
};
/** La victime d'un geste dangereux, selon le côté (`face`, `gauche`, `droite`, `dos`). Soulevée : saisie, en l'air, au sol. */
const ANGLE = { face: 'front', gauche: 'left', droite: 'right', dos: 'behind' };
const souleve = a => (a === 'front'
  ? [['dangerous_tackled_tip_grabbed', .57], ['dangerous_tackled_tip_in_air', 1.5], ['dangerous_tackled_tip_down', .57], ['standing_tackled_tipped_get_up', 99, 0, .7]]
  : [['dangerous_tackled_tip_' + a + '_grabbed', .57], ['dangerous_tackled_tip_' + a + '_in_air', 1.5], ['dangerous_tackled_tip_' + a + '_ground', .57], ['standing_tackled_tipped_get_up', 99, 0, .7]]);
export const VICTIMES = {
  reaction_tip: v => souleve(ANGLE[v] ?? 'front'),
  reaction_charge: v => [['dangerous_tackled_charge_' + (ANGLE[v] ?? 'front') + '_going_down', 1.5], ['standing_tackled_hold', 99]],
  reaction_high: v => [['dangerous_tackled_smash_' + (ANGLE[v] ?? 'front') + '_going_down', 1.5], ['standing_tackled_hold', 99]],
};

// ═══ L'ARBITRE ══════════════════════════════════════════════════════════════
// À chaque décision son signal (`signalArbitre` du moteur → clip de l'APK). `plein` : tout le corps ; sinon le buste seul,
// par-dessus sa course. `construit` : le geste n'existe pas dans l'APK, la scène le fabrique (bras et buste).
export const ARBITRE = {
  penalite: { clip: 'penalty' },
  'plaquage-haut': { clip: 'high_tackle', apres: 'penalty' },
  'ballon-garde': { clip: 'not_releasing_ball', apres: 'penalty' },
  'pas-roule': { clip: 'not_rolling_away', apres: 'penalty' },
  tenu: { clip: 'not_releasing_player', apres: 'penalty' },
  ecroulement: { clip: 'collapsing_ruck_or_maul', apres: 'penalty' },
  'hors-appuis': { clip: 'not_supporting_own_weight', apres: 'penalty', cadence: 1.6 },
  'hors-jeu': { clip: 'indicate_offside_low', apres: 'penalty' },
  'en-avant': { clip: 'knock_on' },
  'passe-en-avant': { clip: 'forward_pass' },
  melee: { clip: 'forming_a_scrum' },
  'maul-injouable': { clip: 'unplayable_maul' },
  essai: { clip: 'try' },
  renvoi: { clip: 'penalty' },
  touche: { clip: null },
  tmo: { construit: 'ecran' },
  separation: { construit: 'separer' },
  rappel: { clip: 'RefereeCallOverPlayer01_001', plein: true },
  'carton-jaune': { clip: 'RefereeCard01_002', plein: true },
  'carton-rouge': { clip: 'RefereeCard01_002', plein: true },
};

// ═══ LE POSTE ET LA FATIGUE ═════════════════════════════════════════════════
// Ce que le corps garde EN PLUS du geste : hauteur du centre de gravité à la course (négatif : plus bas), cadence des
// gestes de contact, attente par défaut. Discret — un pilier ne devient pas une caricature, il pèse seulement plus lourd.
export const PROFILS = {
  lourd: { raise: -.035, cadence: .92, attente: 'heavy_idle' },
  troisieme: { raise: -.015, cadence: 1, attente: 'heavy_idle' },
  demi: { raise: 0, cadence: 1.06, attente: 'light_idle' },
  centre: { raise: -.01, cadence: 1, attente: 'idle_alt_01' },
  arriere: { raise: .01, cadence: 1.05, attente: 'light_idle' },
};
/** Fatigue 0, 1, 2 : buste qui s'affaisse à la course, gestes moins vifs, relevés plus lents. Jamais « tout au ralenti ». */
export const FATIGUE = [{ raise: 0, cadence: 1, releve: 1 }, { raise: -.03, cadence: .96, releve: .9 }, { raise: -.075, cadence: .9, releve: .76 }];
/** Le profil d'un numéro : la même règle que `profilAnimation` du moteur (un remplaçant garde le numéro de son poste). */
export const profilDuNumero = n => (n >= 1 && n <= 5 ? 'lourd' : n >= 6 && n <= 8 ? 'troisieme' : n === 9 || n === 10 ? 'demi' : n === 12 || n === 13 ? 'centre' : 'arriere');

// ═══ LES BANQUES ════════════════════════════════════════════════════════════
export const BANQUES = ['common', 'contact', 'ruck', 'lineout', 'scrum', 'backs', 'forwards', 'fouls', 'celebrations'];
/** La banque dont une phase a besoin en plus de `common` (la même table que `banqueDeLaPhase` du moteur). */
export const BANQUE_DE_LA_PHASE = { ruck: 'ruck', maul: 'forwards', melee: 'scrum', touche: 'lineout', penalite: 'fouls', aplatissage: 'celebrations', apresEssai: 'celebrations', tmo: 'celebrations', transformation: 'celebrations', ballonEnLAir: 'backs', coupEnvoi: 'backs', renvoi22: 'backs', jeuCourant: 'contact', ballonLibre: 'contact' };
/** L'ordre dans lequel le reste arrive en tâche de fond, une fois le match affiché. */
export const ORDRE_DE_CHARGEMENT = ['contact', 'ruck', 'backs', 'scrum', 'lineout', 'forwards', 'fouls', 'celebrations'];

/** Tous les clips que la bibliothèque cite, pour le banc : chacun doit exister dans le catalogue. */
export function clipsDeLaBibliotheque() {
  const vus = new Set();
  const suite = s => { for (const x of s || []) if (Array.isArray(x) && typeof x[0] === 'string') vus.add(x[0]); };
  const T = { appui: .57, lutte: 1, fin: 1 };
  for (const p of Object.values(PLAQUAGES30)) { for (const c of [-1, 0, 1, 2]) { suite(p.plaqueur(c)); suite(p.plaque(c)); if (p.second) suite(p.second(c)); } if (p.releve) vus.add(p.releve); }
  for (const s of Object.values(MANQUES)) suite(s);
  suite(REPLIS_MANQUE.debout); suite(REPLIS_MANQUE.sol); vus.add(TREBUCHE.left); vus.add(TREBUCHE.right);
  for (const f of Object.values(CROCHETS)) for (const t of [0, .1, .29, .31, .5, .6, .9]) for (const [v, c] of [['left', 'right'], ['right', 'left']]) { const d = f(t, v, c); if (d.clip) vus.add(d.clip); if (d.upper) vus.add(d.upper); }
  for (const r of [...Object.values(RAFFUTS), ...Object.values(PERCUSSIONS)]) if (r.haut && r.haut !== 'cote') vus.add(r.haut);
  vus.add('handoff_left'); vus.add('handoff_right');
  for (const g of Object.values(GRATTAGES)) suite(g(T));
  suite(REPLI_GRATTAGE); for (const s of Object.values(DELOGEURS)) suite(s);
  for (const d of Object.values(DEBLAYAGES)) for (const c of ['left', 'right']) { suite(d.nettoyeur(c)); suite(d.cible(c)); }
  suite(REPLI_DEBLAYAGE.nettoyeur); suite(REPLI_DEBLAYAGE.cible);
  for (const c of Object.values(CONTRE_RUCKS)) vus.add(c.entree);
  for (const r of Object.values(RECEPTIONS)) if (r.clip !== 'cote') vus.add(r.clip);
  for (const f of Object.values(FRAPPES30)) { if (typeof f === 'string') vus.add(f); else for (const v of Object.values(f)) if (typeof v === 'string') vus.add(v); }
  for (const c of Object.values(CONTRE)) vus.add(c.clip);
  for (const e of [...Object.values(ESSAIS), ...Object.values(REPLI_ESSAI)]) vus.add(e.clip);
  for (const c of Object.values(CELEBRATIONS30)) { c.marqueur.forEach(n => vus.add(n)); c.feteurs.forEach(n => vus.add(n)); }
  DECEPTIONS.forEach(n => vus.add(n));
  for (const f of Object.values(FAUTES30)) for (const c of [-1, 1]) suite(f.suite(c));
  for (const v of Object.values(VICTIMES)) for (const a of ['face', 'gauche', 'droite', 'dos']) suite(v(a));
  for (const a of Object.values(ARBITRE)) { if (a.clip) vus.add(a.clip); if (a.apres) vus.add(a.apres); }
  for (const p of Object.values(PROFILS)) vus.add(p.attente);
  return [...vus];
}
