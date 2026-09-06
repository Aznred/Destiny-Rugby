// INTERVIEWS D'APRÈS-MATCH (lot 6, point 21)
//
// Le micro se tend après un très bon ou un très mauvais match. Ce que tu dis
// n'est pas neutre : le coach écoute (confiance du staff) et les supporters
// aussi (popularité). Les deux jauges existent vraiment — la confiance du coach
// pèse sur ton temps de jeu, la popularité sur ta réputation et le marché.

import type { StatVariable } from '../types.js';

export interface TonInterview {
  texte: string;
  recit: string;
  deltas: Partial<Record<StatVariable, number>>;
  coach: number; // effet sur la confiance du staff (-15 … +15)
  fans: number; // effet sur la popularité
}

export interface Interview {
  id: string;
  emoji: string;
  titre: string;
  question: string;
  contexte: 'exploit' | 'defaite' | 'banc';
  tons: TonInterview[];
}

export const INTERVIEWS: Interview[] = [
  {
    id: 'exploit',
    emoji: '🎙️',
    titre: 'Le micro après ton match',
    contexte: 'exploit',
    question: "« Vous avez été le grand bonhomme de cette rencontre. Comment vous expliquez ça ? »",
    tons: [
      {
        texte: 'Renvoyer le mérite au collectif.',
        recit: 'Tu parles des avants, du travail de la semaine, du staff. Rien sur toi. Le vestiaire apprécie, le coach hoche la tête.',
        deltas: { moral: 4 }, coach: 10, fans: 3,
      },
      {
        texte: 'Assumer : « J’ai bossé pour ça. »',
        recit: 'Tu revendiques ton match sans arrogance. Les journalistes adorent la punchline, elle tourne en boucle le soir même.',
        deltas: { reputation: 5, moral: 5 }, coach: 0, fans: 10,
      },
      {
        texte: 'Tacler le coach qui te laissait sur le banc.',
        recit: 'Tu glisses une pique sur ton temps de jeu. Le clip fait le tour des réseaux. Le staff, lui, ne rit pas du tout.',
        deltas: { reputation: 7, moral: 2 }, coach: -16, fans: 12,
      },
    ],
  },
  {
    id: 'defaite',
    emoji: '🎙️',
    titre: 'Face aux micros après la défaite',
    contexte: 'defaite',
    question: "« Troisième défaite de rang, et une prestation très en dedans. Un mot ? »",
    tons: [
      {
        texte: 'Prendre ses responsabilités.',
        recit: 'Tu dis que tu es passé à côté, que le groupe mérite mieux, que tu bosserai. Sobre. Le staff retient l’honnêteté.',
        deltas: { moral: -2 }, coach: 8, fans: 4,
      },
      {
        texte: 'Pointer l’arbitrage.',
        recit: 'Tu évoques « des décisions à sens unique ». La fédération n’aime pas, ton club non plus, mais les supporters te trouvent enfin un défenseur.',
        deltas: { reputation: -3, moral: 2, argent: -400 }, coach: -8, fans: 8,
      },
      {
        texte: 'Botter en touche, langue de bois.',
        recit: 'Tu enchaînes les formules toutes faites. Personne n’est fâché, personne n’est marqué. L’interview est oubliée en dix minutes.',
        deltas: {}, coach: 1, fans: -3,
      },
    ],
  },
  {
    id: 'banc',
    emoji: '🎙️',
    titre: 'Une question qui pique',
    contexte: 'banc',
    question: "« Vous n'entrez plus qu'en fin de match. Comment vivez-vous cette situation ? »",
    tons: [
      {
        texte: 'Rester loyal : « Le coach a ses raisons. »',
        recit: 'Tu défends le staff en public. Le message remonte, et on te regarde comme un joueur de vestiaire.',
        deltas: { moral: -3 }, coach: 12, fans: -2,
      },
      {
        texte: 'Dire franchement que tu veux jouer.',
        recit: 'Tu revendiques ta place sans agresser personne. Le coach apprécie moyennement, les supporters te soutiennent.',
        deltas: { moral: 4 }, coach: -5, fans: 7,
      },
      {
        texte: 'Annoncer que tu regardes ailleurs.',
        recit: 'Tu lâches que « tout est possible cet été ». Ton agent grimace, ton club aussi. Les recruteurs, eux, prennent note.',
        deltas: { reputation: 4, moral: 3 }, coach: -14, fans: 0,
      },
    ],
  },
];

export function interviewPour(contexte: Interview['contexte']): Interview {
  const pool = INTERVIEWS.filter((i) => i.contexte === contexte);
  return pool[Math.floor(Math.random() * pool.length)] ?? INTERVIEWS[0];
}
