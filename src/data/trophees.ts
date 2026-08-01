// Trophées gagnables en fin de saison. Chaque trophée a un modèle 3D
// (public/m3d/*.glb, compressé Draco) affiché en animation quand on le remporte.

export interface Trophee {
  id: string;
  nom: string;
  modele: string;
  couleur: string; // teinte de l'aura dans la modale
  desc: string;
  ovas: number; // récompense (économie dure : reste modeste)
}

export const TROPHEES: Record<string, Trophee> = {
  brennus: {
    id: 'brennus',
    nom: 'Bouclier de Brennus',
    modele: '/m3d/brennus.glb',
    couleur: '#e8b23a',
    desc: 'Champion de France — Top 14. Le Graal du rugby français.',
    ovas: 12,
  },
  prod2: {
    id: 'prod2',
    nom: 'Trophée Pro D2',
    modele: '/m3d/prod2.glb',
    couleur: '#c0c8d0',
    desc: 'Champion de Pro D2 : la montée dans l’élite se joue ici.',
    ovas: 8,
  },
  nationale: {
    id: 'nationale',
    nom: 'Bouclier de Nationale',
    modele: '/m3d/nationale.glb',
    couleur: '#b3653a',
    desc: 'Champion de Nationale. Le tremplin vers le monde pro.',
    ovas: 6,
  },
  champions: {
    id: 'champions',
    nom: 'Champions Cup',
    modele: '/m3d/champions.glb',
    couleur: '#3fa9f5',
    desc: 'Le sommet européen des clubs, réservé aux 8 premiers du Top 14. L’Europe est à toi.',
    ovas: 14,
  },
  challenge: {
    id: 'challenge',
    nom: 'Challenge Cup',
    modele: '/m3d/challenge.glb',
    couleur: '#48c47a',
    desc: 'La deuxième coupe d’Europe, disputée par les 6 derniers du Top 14.',
    ovas: 9,
  },
  sixNations: {
    id: 'sixNations',
    nom: 'Tournoi des 6 Nations',
    modele: '/m3d/six-nations.glb',
    couleur: '#e8b23a',
    desc: 'Vainqueur du Tournoi avec ta sélection nationale.',
    ovas: 15,
  },
  monde: {
    id: 'monde',
    nom: 'Coupe du monde',
    modele: '/m3d/monde.glb',
    couleur: '#f4cd63',
    desc: 'Champion du monde. Ton nom entre dans l’histoire.',
    ovas: 30,
  },
  meilleurJoueur: {
    id: 'meilleurJoueur',
    nom: 'Meilleur joueur de l’année',
    modele: '/m3d/meilleur-joueur.glb',
    couleur: '#f4cd63',
    desc: 'Élu meilleur joueur du monde. Personne ne t’a surpassé.',
    ovas: 20,
  },

  // --- Championnats du monde -------------------------------------------------
  premiership: {
    id: 'premiership',
    nom: 'Gallagher Premiership',
    modele: '/m3d/premiership.glb',
    couleur: '#8e6bd6',
    desc: 'Champion d’Angleterre. Twickenham s’est levé pour toi.',
    ovas: 12,
  },
  championship: {
    id: 'championship',
    nom: 'RFU Championship',
    modele: '/m3d/championship.glb',
    couleur: '#7f9ab5',
    desc: 'Champion de la deuxième division anglaise : la Premiership t’attend.',
    ovas: 8,
  },
  premCup: {
    id: 'premCup',
    nom: 'Premiership Rugby Cup',
    modele: '/m3d/prem-cup.glb',
    couleur: '#d65b8e',
    desc: 'La coupe anglaise, terrain de jeu des jeunes pousses et des revanchards.',
    ovas: 7,
  },
  urc: {
    id: 'urc',
    nom: 'United Rugby Championship',
    modele: '/m3d/urc.glb',
    couleur: '#3ad1c0',
    desc: 'Champion de l’URC — quatre pays, une seule couronne.',
    ovas: 12,
  },
  super: {
    id: 'super',
    nom: 'Super Rugby Pacific',
    modele: '/m3d/super.glb',
    couleur: '#4d8ef7',
    desc: 'Le titre le plus rapide du monde, arraché dans l’hémisphère sud.',
    ovas: 12,
  },
  npc: {
    id: 'npc',
    nom: 'Bunnings NPC',
    modele: '/m3d/npc.glb',
    couleur: '#c8553d',
    desc: 'Le championnat des provinces néo-zélandaises, pépinière des All Blacks.',
    ovas: 9,
  },
  japon: {
    id: 'japon',
    nom: 'Japan Rugby League One',
    modele: '/m3d/japon.glb',
    couleur: '#e05a6b',
    desc: 'Champion du Japon. Le rugby nippon a trouvé sa star.',
    ovas: 10,
  },
  mlr: {
    id: 'mlr',
    nom: 'Major League Rugby',
    modele: '/m3d/mlr.glb',
    couleur: '#3f7fd6',
    desc: 'Le bouclier américain. Tu as conquis le Nouveau Monde.',
    ovas: 9,
  },
};

// Trophée national décerné selon la division du club. Les clés sont les ids de
// compétition (data/clubs.ts) : la carrière est française pour l'instant, mais
// les championnats du monde ont désormais leur trophée, prêts à servir dès que
// l'étranger deviendra jouable.
export const TROPHEE_PAR_DIVISION: Record<string, string> = {
  top14: 'brennus',
  prod2: 'prod2',
  nationale: 'nationale',
  premiership: 'premiership',
  championship: 'championship',
  urc: 'urc',
  super: 'super',
  npc: 'npc',
  japon1: 'japon',
  japon2: 'japon',
  japon3: 'japon',
  mlr: 'mlr',
};

// Trophée d'une coupe (COUPES_EUROPE de data/mondeReel.ts).
export const TROPHEE_PAR_COUPE: Record<string, string> = {
  championsCup: 'champions',
  challengeCup: 'challenge',
  premCup: 'premCup',
};

// Championnats qui donnent accès aux coupes d'Europe : les 8 premiers jouent
// la Champions Cup, les autres la Challenge Cup (voir le store). Le Top 14, la
// Premiership et l'URC y envoient leurs clubs — pas les divisions inférieures.
export const COUPE_EUROPE_PAR_DIVISION: Record<string, boolean> = {
  top14: true,
  premiership: true,
  urc: true,
};

// Nations disputant le Tournoi des 6 Nations.
export const NATIONS_6N = [
  'France', 'Angleterre', 'Écosse', 'Pays de Galles', 'Irlande', 'Italie',
];
