import type { LegendeSauvegardee } from '../types';
import { migrerPoste } from './rugby';

// Légendes pré-générées pour peupler le classement (le vrai multijoueur en ligne
// nécessitera un backend — voir CLAUDE.md). Marquées `fictif: true`.
export const LEGENDES_FICTIVES: LegendeSauvegardee[] = [
  {
    id: 'l1', nom: 'Marius Valen', poste: migrerPoste('demi_ouverture'), nation: '🇫🇷 France',
    age: 34, saisons: 15, note: 91, reputation: 98, matchsJoues: 214, essais: 62,
    titres: ['Bouclier de Brennus ×3', 'Coupe du monde', 'Tournoi ×4'], score: 3420, fictif: true,
  },
  {
    id: 'l2', nom: 'Koa Tavita', poste: migrerPoste('centre'), nation: '🇳🇿 Nouvelle-Zélande',
    age: 33, saisons: 14, note: 90, reputation: 95, matchsJoues: 198, essais: 88,
    titres: ['Super Rugby ×4', 'Coupe du monde'], score: 3255, fictif: true,
  },
  {
    id: 'l3', nom: 'Sipho Ndlovu', poste: migrerPoste('troisieme_ligne'), nation: '🇿🇦 Afrique du Sud',
    age: 32, saisons: 13, note: 89, reputation: 93, matchsJoues: 187, essais: 41,
    titres: ['Coupe du monde ×2', 'Currie Cup'], score: 3110, fictif: true,
  },
  {
    id: 'l4', nom: 'Liam O’Rourke', poste: migrerPoste('demi_melee'), nation: '🇮🇪 Irlande',
    age: 31, saisons: 12, note: 88, reputation: 90, matchsJoues: 176, essais: 53,
    titres: ['Grand Chelem', 'Champions Cup ×2'], score: 2980, fictif: true,
  },
  {
    id: 'l5', nom: 'Tomás Herrera', poste: migrerPoste('arriere'), nation: '🇦🇷 Argentine',
    age: 30, saisons: 11, note: 86, reputation: 87, matchsJoues: 158, essais: 47,
    titres: ['Bronze mondial'], score: 2740, fictif: true,
  },
  {
    id: 'l6', nom: 'Jack Whitmore', poste: migrerPoste('deuxieme_ligne'), nation: '🏴 Angleterre',
    age: 33, saisons: 13, note: 85, reputation: 84, matchsJoues: 190, essais: 22,
    titres: ['Premiership ×2', 'Tournoi'], score: 2610, fictif: true,
  },
  {
    id: 'l7', nom: 'Eroni Rokoua', poste: migrerPoste('ailier'), nation: '🇫🇯 Fidji',
    age: 28, saisons: 9, note: 84, reputation: 82, matchsJoues: 121, essais: 79,
    titres: ['Médaille d’or olympique (7s)'], score: 2480, fictif: true,
  },
  {
    id: 'l8', nom: 'Giorgi Beridze', poste: migrerPoste('pilier'), nation: '🇬🇪 Géorgie',
    age: 31, saisons: 11, note: 82, reputation: 78, matchsJoues: 164, essais: 9,
    titres: ['Rugby Europe ×5'], score: 2260, fictif: true,
  },
  {
    id: 'l9', nom: 'Dylan Craig', poste: migrerPoste('talonneur'), nation: '🏴 Écosse',
    age: 29, saisons: 9, note: 80, reputation: 74, matchsJoues: 132, essais: 18,
    titres: ['Coupe d’Europe'], score: 2050, fictif: true,
  },
  {
    id: 'l10', nom: 'Rhys Morgan', poste: migrerPoste('centre'), nation: '🏴 Pays de Galles',
    age: 27, saisons: 8, note: 78, reputation: 70, matchsJoues: 108, essais: 31,
    titres: ['Tournoi'], score: 1880, fictif: true,
  },
];
