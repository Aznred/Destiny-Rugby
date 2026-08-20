// TRAITS DE CARACTÈRE
//
// Deux traits choisis à la création, pour la vie. Ils ne sont pas décoratifs :
// chacun est lu à un endroit précis du moteur (progression, blessures, notes de
// match, cartons, marché). Un trait donne toujours quelque chose ET coûte
// quelque chose — sinon ce serait un bonus déguisé.

import { t } from '../lib/i18n';

export interface Trait {
  id: string;
  nom: string;
  emoji: string;
  desc: string;
  // Effets, tous optionnels (1 = neutre pour les multiplicateurs).
  progression?: number; // × sur les points d'attributs gagnés chaque saison
  risqueBlessure?: number; // × sur le risque de blessure par match
  graviteBlessure?: number; // × sur la durée d'indisponibilité
  noteMatch?: number; // + sur la note de chaque match
  noteGrosMatch?: number; // + sur les matchs à enjeu (coupe, phase finale, sélection)
  cartons?: number; // × sur le risque de carton
  formeParSemaine?: number; // + de forme récupérée chaque semaine
  moralParSemaine?: number;
  offres?: number; // × sur le nombre d'offres reçues au mercato
  leadership?: number; // + pour décrocher le brassard de capitaine
  vestiaire?: number; // + d'affinités dans le groupe
  /**
   * Prix en Ovas. Absent = disponible d'entrée.
   *
   * ⚠️ ON N'ACHÈTE PAS DE LA PUISSANCE, ON ACHÈTE DU CHOIX. C'est la seule
   * façon d'ajouter des traits payants sans casser la règle du projet (« ce
   * qui s'achète est cosmétique ») ni l'étalonnage de difficulté :
   *
   *   • MAX_TRAITS reste à DEUX. Un joueur qui a tout débloqué n'en porte
   *     pas un de plus qu'un joueur qui n'a rien acheté.
   *   • Chaque trait payant a un COÛT réel, comme les gratuits. Aucun n'est
   *     strictement meilleur qu'un trait de base — scripts/verifTraits.ts le
   *     mesure et échoue sinon.
   *
   * Ce qu'on achète, c'est une façon de jouer de plus : un archétype, pas un
   * bonus. Un joueur qui n'achète rien garde douze combinaisons viables.
   */
  prix?: number;
}

export const TRAITS: Trait[] = [
  {
    id: 'professionnel', nom: 'Professionnel', emoji: '🧊',
    desc: 'Hygiène irréprochable, premier au réveil musculaire. Tu progresses plus vite et tu récupères mieux — mais tu n’as pas le grain de folie.',
    progression: 1.2, formeParSemaine: 2, noteGrosMatch: -0.2,
  },
  {
    id: 'sang_chaud', nom: 'Sang chaud', emoji: '🔥',
    desc: 'Tu joues à l’instinct et tu ne recules jamais. Les grands soirs sont pour toi, l’arbitre un peu moins.',
    noteGrosMatch: 0.6, cartons: 2.4, vestiaire: -1,
  },
  {
    id: 'fetard', nom: 'Fêtard', emoji: '🍻',
    desc: 'Troisième mi-temps obligatoire. Le vestiaire t’adore, ton préparateur physique beaucoup moins.',
    moralParSemaine: 2, formeParSemaine: -2, progression: 0.9, vestiaire: 2,
  },
  {
    id: 'peur_du_choc', nom: 'Peur de se faire mal', emoji: '🙈',
    desc: 'Tu protèges ton corps, parfois au détriment de l’impact. Tu te blesses beaucoup moins, tu marques les esprits beaucoup moins aussi.',
    risqueBlessure: 0.55, noteMatch: -0.35,
  },
  {
    id: 'guerrier', nom: 'Guerrier', emoji: '⚔️',
    desc: 'Tu joues sur une jambe s’il le faut. Le public t’adore ; ton dossier médical s’épaissit.',
    noteMatch: 0.3, risqueBlessure: 1.5, graviteBlessure: 1.2, leadership: 2,
  },
  {
    id: 'clutch', nom: 'Homme des grands soirs', emoji: '🎯',
    desc: 'Plus le match est gros, plus tu montes en température. En championnat, tu ronronnes.',
    noteGrosMatch: 0.9, noteMatch: -0.15,
  },
  {
    id: 'leader', nom: 'Leader naturel', emoji: '🧭',
    // ⚠️ IL N'AVAIT AUCUNE CONTREPARTIE, et c'était le seul du lot. Le fichier
    // pose pourtant la règle en tête : « un trait donne toujours quelque chose
    // ET coûte quelque chose — sinon ce serait un bonus déguisé ». Repéré par
    // `scripts/verifTraits.ts`, qui refuse désormais un trait sans coût.
    // Le prix choisi colle à la fiction : on passe son temps sur les autres.
    desc: 'On t’écoute avant même que tu parles. Le brassard te tend les bras — mais tu passes plus de temps à porter le groupe qu’à travailler pour toi.',
    leadership: 5, vestiaire: 2, moralParSemaine: 1, progression: 0.94,
  },
  {
    id: 'fragile', nom: 'Constitution fragile', emoji: '🩹',
    desc: 'Ton corps encaisse mal. En échange, tu as développé une lecture du jeu que les autres n’ont pas.',
    risqueBlessure: 1.6, graviteBlessure: 1.3, progression: 1.15,
  },
  {
    id: 'ambitieux', nom: 'Ambitieux', emoji: '📈',
    desc: 'Ton agent a ton numéro en favori. Les clubs te suivent — le tien s’en méfie un peu.',
    offres: 1.6, vestiaire: -1, moralParSemaine: -1,
  },
  {
    id: 'fidele', nom: 'Fidèle au maillot', emoji: '💚',
    desc: 'Un club, une histoire. Tu es chez toi, et ça se voit sur le terrain — le marché s’intéresse moins à toi.',
    noteMatch: 0.25, moralParSemaine: 1, offres: 0.6,
  },
  {
    id: 'travailleur', nom: 'Bourreau de travail', emoji: '🛠️',
    desc: 'Le dernier à quitter le terrain d’entraînement. Tu ne seras jamais un génie, mais tu ne cesses jamais de progresser.',
    progression: 1.25, noteGrosMatch: -0.15, formeParSemaine: -1,
  },
  {
    id: 'charismatique', nom: 'Charismatique', emoji: '✨',
    desc: 'Les médias t’adorent, les sponsors aussi. Le vestiaire, lui, attend de voir sur le pré.',
    offres: 1.2, leadership: 3, vestiaire: 1, progression: 0.95,
  },

  // ═══ LES ARCHÉTYPES À DÉBLOQUER ═════════════════════════════════════════
  // ⚠️ ILS NE SONT PAS PLUS FORTS, ILS SONT PLUS TRANCHÉS. Chacun pousse un
  // curseur beaucoup plus loin que les douze de base — dans les DEUX sens. Le
  // « Roc » est presque increvable et ne progresse quasiment plus ; la « Tête
  // brûlée » gagne les grands soirs et passe son temps au vestiaire. Ce sont
  // des paris, pas des améliorations.
  //
  // ⚠️ LE PRIX SUIT L'ÉCONOMIE MESURÉE, PAS L'ENVIE. Une belle carrière rapporte
  // ~550 Ovas (scripts/verifEconomie.ts) : à 90-190 Ovas pièce, on en débloque
  // trois ou quatre par carrière, et il en reste toujours à découvrir. Les
  // monter ferait de la boutique un mur, les baisser les rendrait gratuits.
  {
    id: 'roc', nom: 'Roc', emoji: '🪨', prix: 140,
    desc: 'Ton corps ne casse pas. Il ne change pas beaucoup non plus : ce que tu es à vingt ans, tu le seras encore à trente.',
    risqueBlessure: 0.5, graviteBlessure: 0.7, progression: 0.85,
  },
  {
    id: 'cerveau', nom: 'Cerveau du jeu', emoji: '🧠', prix: 170,
    desc: 'Tu lis une attaque trois temps à l’avance. Encore faut-il aller au contact pour en profiter — et ton corps le paie.',
    noteMatch: 0.45, risqueBlessure: 1.3, formeParSemaine: -1,
  },
  {
    id: 'discipline', nom: 'Discipliné', emoji: '🎖️', prix: 110,
    desc: 'Tu ne franchis jamais la ligne. Y compris celle qu’il faut parfois franchir pour gagner un match.',
    cartons: 0.35, noteGrosMatch: -0.35,
  },
  {
    id: 'chouchou', nom: 'Chouchou du public', emoji: '📣', prix: 150,
    desc: 'La tribune scande ton nom et ton agent ne dort plus. Le vestiaire, lui, trouve que ça fait beaucoup.',
    offres: 1.35, moralParSemaine: 2, vestiaire: -2,
  },
  {
    id: 'tete_brulee', nom: 'Tête brûlée', emoji: '💣', prix: 160,
    desc: 'Les soirs de finale, tu es injouable. Les autres soirs, tu joues avec le feu — et l’arbitre a un carnet.',
    noteGrosMatch: 1.1, cartons: 2.8, moralParSemaine: -1,
  },
  {
    id: 'cadre', nom: 'Cadre du vestiaire', emoji: '🤝', prix: 130,
    desc: 'Tu es le pilier du groupe, celui qu’on écoute au tableau. Personne à l’extérieur n’imagine que tu partiras un jour.',
    vestiaire: 3, leadership: 4, offres: 0.7,
  },
  {
    id: 'precoce', nom: 'Précoce', emoji: '🌱', prix: 190,
    desc: 'Tu apprends deux fois plus vite que les autres. Ton corps, lui, suit à son rythme et récupère mal.',
    progression: 1.35, formeParSemaine: -2, noteMatch: -0.2,
  },
  {
    id: 'vieux_lion', nom: 'Vieux lion', emoji: '🦁', prix: 120,
    desc: 'Tu as tout vu, et ça se sent dans les moments qui comptent. Apprendre quelque chose de neuf, en revanche…',
    noteGrosMatch: 0.55, leadership: 3, progression: 0.82,
  },
  {
    id: 'electron', nom: 'Électron libre', emoji: '⚡', prix: 150,
    desc: 'Tu vas où le vent te porte, et le marché adore ça. Le groupe beaucoup moins, le brassard encore moins.',
    offres: 1.5, vestiaire: -2, leadership: -3,
  },
  {
    id: 'muraille', nom: 'Muraille', emoji: '🧱', prix: 160,
    desc: 'Rien ne passe. Ta défense fait mal — parfois d’un demi-mètre trop haut, et l’arbitre le voit.',
    noteMatch: 0.4, cartons: 1.7,
  },
  {
    id: 'zen', nom: 'Zen', emoji: '🧘', prix: 90,
    desc: 'Rien ne t’atteint : ni la défaite, ni la provocation. Ni tout à fait l’enjeu d’une finale, d’ailleurs.',
    moralParSemaine: 3, cartons: 0.6, noteGrosMatch: -0.45,
  },
  {
    id: 'increvable', nom: 'Increvable', emoji: '🫁', prix: 130,
    desc: 'Tu enchaînes les matchs sans jamais tirer la langue. Tu t’entraînes moins dur, aussi — tu n’en as jamais eu besoin.',
    formeParSemaine: 4, progression: 0.88,
  },
];

export const TRAIT_PAR_ID: Record<string, Trait> = Object.fromEntries(
  TRAITS.map((t) => [t.id, t]),
);

/** Libellés d'interface : les identifiants et les effets restent inchangés. */
export function nomTrait(id: string): string {
  const trait = TRAIT_PAR_ID[id];
  const traduit = t(`trait.${id}.nom`);
  return traduit === `trait.${id}.nom` ? trait?.nom ?? id : traduit;
}

export function descriptionTrait(id: string): string {
  const trait = TRAIT_PAR_ID[id];
  const traduit = t(`trait.${id}.desc`);
  return traduit === `trait.${id}.desc` ? trait?.desc ?? '' : traduit;
}

// Cumul des effets des traits d'un joueur : les multiplicateurs se multiplient,
// les bonus s'additionnent.
export function effetsTraits(ids: string[] | undefined) {
  const base = {
    progression: 1, risqueBlessure: 1, graviteBlessure: 1, cartons: 1, offres: 1,
    noteMatch: 0, noteGrosMatch: 0, formeParSemaine: 0, moralParSemaine: 0,
    leadership: 0, vestiaire: 0,
  };
  for (const id of ids ?? []) {
    const t = TRAIT_PAR_ID[id];
    if (!t) continue;
    base.progression *= t.progression ?? 1;
    base.risqueBlessure *= t.risqueBlessure ?? 1;
    base.graviteBlessure *= t.graviteBlessure ?? 1;
    base.cartons *= t.cartons ?? 1;
    base.offres *= t.offres ?? 1;
    base.noteMatch += t.noteMatch ?? 0;
    base.noteGrosMatch += t.noteGrosMatch ?? 0;
    base.formeParSemaine += t.formeParSemaine ?? 0;
    base.moralParSemaine += t.moralParSemaine ?? 0;
    base.leadership += t.leadership ?? 0;
    base.vestiaire += t.vestiaire ?? 0;
  }
  return base;
}

/**
 * ⚠️ DEUX, ET ÇA NE BOUGE PAS. C'est ce nombre qui empêche les traits payants
 * d'être du pay-to-win : quelqu'un qui a tout débloqué en porte deux, comme
 * tout le monde. Le monter transformerait chaque achat en gain de puissance,
 * et il faudrait refaire tout l'étalonnage de difficulté.
 */
export const MAX_TRAITS = 2;

/** Les traits disponibles d'entrée, sans rien débloquer. */
export const TRAITS_DE_BASE = TRAITS.filter((tr) => tr.prix == null);

/** Ceux qui s'achètent en Ovas. */
export const TRAITS_A_DEBLOQUER = TRAITS.filter((tr) => tr.prix != null);

/** Ce trait est-il jouable par ce joueur ? */
export function traitDisponible(id: string, debloques: string[] | undefined): boolean {
  const trait = TRAIT_PAR_ID[id];
  if (!trait) return false;
  return trait.prix == null || (debloques ?? []).includes(id);
}

/**
 * Le « poids » d'un trait : la somme signée de ses effets, chacun ramené à une
 * échelle commune.
 *
 * ⚠️ CE N'EST PAS UNE MÉTRIQUE DE JEU, C'EST UN GARDE-FOU. Elle ne sert qu'à
 * `scripts/verifTraits.ts`, qui échoue si un trait payant pèse plus lourd que
 * le plus fort des traits gratuits — c'est-à-dire si l'on s'est mis, sans le
 * voir, à vendre de la puissance. Les coefficients sont grossiers et ils le
 * resteront : on compare des traits entre eux, on ne prédit pas une carrière.
 */
export function poidsTrait(tr: Trait): number {
  return (
    ((tr.progression ?? 1) - 1) * 40
    + (1 - (tr.risqueBlessure ?? 1)) * 12
    + (1 - (tr.graviteBlessure ?? 1)) * 6
    + (tr.noteMatch ?? 0) * 14
    + (tr.noteGrosMatch ?? 0) * 6
    + (1 - (tr.cartons ?? 1)) * 3
    + (tr.formeParSemaine ?? 0) * 1.4
    + (tr.moralParSemaine ?? 0) * 1
    + ((tr.offres ?? 1) - 1) * 6
    + (tr.leadership ?? 0) * 0.8
    + (tr.vestiaire ?? 0) * 1.2
  );
}
