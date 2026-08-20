// AGENTS DE JOUEURS (lot 6, point 22)
//
// Un agent, ça se choisit — et ça se paie. Chacun tire le curseur ailleurs :
// le requin fait monter les salaires mais prend cher et attire les histoires,
// le fidèle protège la carrière sans jamais ouvrir les portes des grands clubs.
//
// Les effets sont LUS pour de vrai : `commission` ampute chaque salaire encaissé,
// `offres` multiplie le nombre de propositions, `ouverture` abaisse le seuil de
// notoriété qui donne accès à l'étranger, `salaire` pèse sur la négociation, et
// `drame` est le risque d'incident médiatique à l'intersaison.

import { t } from '../lib/i18n';

export interface Agent {
  id: string;
  emoji: string;
  nom: string;
  desc: string;
  commission: number; // part du salaire annuel prélevée (0.05 = 5 %)
  offres: number; // multiplicateur du nombre d'offres reçues
  ouverture: number; // notoriété en moins exigée pour l'étranger
  salaire: number; // multiplicateur obtenu en négociation
  drame: number; // probabilité d'un dérapage médiatique par saison
}

export const AGENTS: Agent[] = [
  {
    id: 'cousin',
    emoji: '👨‍🌾',
    nom: 'Ton cousin Régis',
    desc: 'Il fait ça « pour te rendre service », entre deux chantiers. Gratuit, mais son carnet d’adresses s’arrête au département.',
    commission: 0, offres: 0.8, ouverture: 0, salaire: 0.95, drame: 0.02,
  },
  {
    id: 'maison',
    emoji: '🤝',
    nom: 'Cabinet Lafont & Fils',
    desc: 'Une maison sérieuse, installée depuis trente ans. Elle ne fait pas de miracles, elle ne fait pas de bêtises non plus.',
    commission: 0.05, offres: 1.15, ouverture: 4, salaire: 1.05, drame: 0.05,
  },
  {
    id: 'requin',
    emoji: '🦈',
    nom: 'Marco « le requin » Vidal',
    desc: 'Il négocie comme il conduit : vite et sans clignotant. Les salaires explosent, les portes s’ouvrent, et les tabloïds adorent ses clients.',
    commission: 0.12, offres: 1.6, ouverture: 14, salaire: 1.22, drame: 0.22,
  },
  {
    id: 'international',
    emoji: '🌍',
    nom: 'Southern Cross Management',
    desc: 'Une agence anglo-saxonne branchée sur le Japon, l’Angleterre et le Sud. Chère, distante, mais elle te fait exister hors de France.',
    commission: 0.1, offres: 1.25, ouverture: 22, salaire: 1.12, drame: 0.08,
  },
];

export const AGENT_PAR_ID: Record<string, Agent> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a]),
);

// Agent par défaut : personne. On négocie soi-même, mal.
export const SANS_AGENT: Agent = {
  id: '', emoji: '🙅', nom: 'Sans agent',
  desc: 'Tu négocies seul, avec le contrat sur la table de la cuisine.',
  commission: 0, offres: 1, ouverture: 0, salaire: 0.92, drame: 0,
};

export function agentDe(id?: string): Agent {
  return (id && AGENT_PAR_ID[id]) || SANS_AGENT;
}

export function nomAgent(agent: Agent): string {
  return t(`agent.${agent.id || 'sans'}.nom`);
}

export function descriptionAgent(agent: Agent): string {
  return t(`agent.${agent.id || 'sans'}.desc`);
}

// ---------------------------------------------------------------------------
// UN AGENT, ÇA SE MÉRITE — ça ne se choisit pas dans une liste
// ---------------------------------------------------------------------------
// ⚠️ Demande explicite : « l'agent, on peut pas vraiment le choisir, ça dépend
// de nos performances ». On cochait un nom parmi quatre, dès la première
// semaine, gratuitement : le requin qui fait exploser les salaires était
// accessible à un joueur de Régionale 3. Chaque agent a désormais SA BARRE.
//
// Le joueur peut quand même DÉMARCHER (décision de l'utilisateur : « la 1, mais
// tu peux aussi démarcher ») — l'agent refuse simplement s'il n'est pas au
// niveau, et ça coûte un peu de moral.
export const SEUIL_AGENT: Record<string, number> = {
  // Le cousin ne demande rien à personne : c'est le premier, et il est là dès
  // qu'on met un pied dans un vestiaire.
  cousin: 0,
  maison: 52,
  international: 68,
  requin: 74,
};

/** Ce qu'un agent regarde : le niveau du joueur ET sa notoriété. */
export function niveauPourAgent(cote: number, reputation: number): number {
  return cote * 0.75 + reputation * 0.25;
}

/** Les agents qui accepteraient de te représenter, du plus prestigieux au moins. */
export function agentsAccessibles(niveau: number): Agent[] {
  return AGENTS
    .filter((a) => niveau >= (SEUIL_AGENT[a.id] ?? 99))
    .sort((a, b) => (SEUIL_AGENT[b.id] ?? 0) - (SEUIL_AGENT[a.id] ?? 0));
}
