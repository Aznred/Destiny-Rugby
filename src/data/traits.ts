// TRAITS DE CARACTÈRE
//
// Deux traits choisis à la création, pour la vie. Ils ne sont pas décoratifs :
// chacun est lu à un endroit précis du moteur (progression, blessures, notes de
// match, cartons, marché). Un trait donne toujours quelque chose ET coûte
// quelque chose — sinon ce serait un bonus déguisé.

import { langueCourante } from '../lib/i18n';

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
    desc: 'On t’écoute avant même que tu parles. Le brassard te tend les bras, et le groupe vit avec toi.',
    leadership: 5, vestiaire: 2, moralParSemaine: 1,
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
];

export const TRAIT_PAR_ID: Record<string, Trait> = Object.fromEntries(
  TRAITS.map((t) => [t.id, t]),
);

const TRAITS_ANGLAIS: Record<string, { nom: string; desc: string }> = {
  professionnel: { nom: 'Professional', desc: 'Impeccable habits and first into the gym. You develop faster and recover better — without the wild streak.' },
  sang_chaud: { nom: 'Hot-headed', desc: 'You play on instinct and never back down. Big nights suit you; referees, less so.' },
  fetard: { nom: 'Party animal', desc: 'Third halves are compulsory. The squad loves you; the fitness coach much less.' },
  peur_du_choc: { nom: 'Risk-averse', desc: 'You protect your body, sometimes at the cost of impact. Fewer injuries, fewer highlights.' },
  guerrier: { nom: 'Warrior', desc: 'You would play on one leg. The crowd loves it; your medical record does not.' },
  clutch: { nom: 'Big-game player', desc: 'The bigger the match, the hotter you run. In league play, you can coast.' },
  leader: { nom: 'Natural leader', desc: 'People listen before you even speak. The captaincy is within reach and the group follows you.' },
  fragile: { nom: 'Injury-prone', desc: 'Your body takes punishment badly. In return, you have developed a game-reading others lack.' },
  ambitieux: { nom: 'Ambitious', desc: 'Your agent has you on speed dial. Clubs watch you — yours is a little wary.' },
  fidele: { nom: 'One-club loyal', desc: 'One club, one story. You are at home there, but the market looks at you less often.' },
  travailleur: { nom: 'Hard worker', desc: 'Last to leave the training field. You may never be a genius, but you never stop improving.' },
  charismatique: { nom: 'Charismatic', desc: 'Media and sponsors love you. The squad is still waiting to see it on the pitch.' },
};

/** Libellés d'interface : les identifiants et les effets restent inchangés. */
export function nomTrait(id: string): string {
  const trait = TRAIT_PAR_ID[id];
  return langueCourante() === 'en' ? TRAITS_ANGLAIS[id]?.nom ?? trait?.nom ?? id : trait?.nom ?? id;
}

export function descriptionTrait(id: string): string {
  const trait = TRAIT_PAR_ID[id];
  return langueCourante() === 'en' ? TRAITS_ANGLAIS[id]?.desc ?? trait?.desc ?? '' : trait?.desc ?? '';
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

export const MAX_TRAITS = 2;
