// ============================================================================
// ROUTINES & RITUELS DES BUTEURS (PÉNALITÉS ET TRANSFORMATIONS)
// ============================================================================

export type CategorieRoutine = 'classique' | 'legendaire' | 'drole' | 'mystique';

export interface RoutineButeur {
  id: string;
  nom: string;
  emoji: string;
  categorie: CategorieRoutine;
  description: string;
  /** Identifiant du clip dans rugbyAnimations (sans préfixe rugby_) */
  clip: string;
  /** Distance de recul depuis le tee en mètres (ex : 5.5 à 11.5 m) */
  reculMetres: number;
  /** Décalage latéral par rapport à l'axe du tir (mètres, négatif = côté fermé) */
  decalageLateral: number;
  /** Commentaires diffusés en direct pendant l'installation au tee */
  commentaires: string[];
}

export const ROUTINES_BUTEUR: RoutineButeur[] = [
  {
    id: 'wilkinson',
    nom: 'La Prière de Jonny',
    emoji: '🧘‍♂️',
    categorie: 'legendaire',
    description: 'Buste fléchi, mains jointes devant la poitrine, coudes rentrés et concentration chirurgicale.',
    clip: 'routine_wilkinson',
    reculMetres: 7.5,
    decalageLateral: -2.2,
    commentaires: [
      '{nom} s’accroupit, joint les deux mains devant le buste et lance sa légendaire prière.',
      'Concentration chirurgicale pour {nom} qui adopte la posture mythique de Jonny Wilkinson.',
      '{nom} les mains unies face aux poteaux, le stade retient son souffle.',
    ],
  },
  {
    id: 'farrell',
    nom: 'Le Regard du Loup',
    emoji: '🐺',
    categorie: 'classique',
    description: 'Buste droit, tête pivotant alternativement de gauche à droite pour fixer les poteaux et le ballon.',
    clip: 'routine_farrell',
    reculMetres: 7.0,
    decalageLateral: 0,
    commentaires: [
      '{nom} fixe les perches puis le ballon dans un regard de braise façon Owen Farrell.',
      'Le regard noir de {nom} : les yeux scannent les montants avec une froideur absolue.',
      '{nom} balaie les perches du regard, la cible est verrouillée.',
    ],
  },
  {
    id: 'biggar_macarena',
    nom: 'La Macarena de Dan Biggar',
    emoji: '🕺',
    categorie: 'drole',
    description: 'Touche son épaule gauche, puis droite, tire sur son short, replace sa mèche et recommence.',
    clip: 'routine_biggar',
    reculMetres: 6.5,
    decalageLateral: -1.0,
    commentaires: [
      '{nom} lance sa fameuse « Macarena » : épaule, short, cheveux, tout y passe !',
      'Le rituel frénétique de {nom} régale le public : la Macarena est lancée.',
      'Épaule gauche, épaule droite, réajustement du short… le ballet de {nom} est au point.',
    ],
  },
  {
    id: 'crabe_cook',
    nom: 'Le Crabe de Rob Cook',
    emoji: '🦀',
    categorie: 'drole',
    description: 'Écartement des cuisses démesuré, buste baissé et bras ballants entre les genoux.',
    clip: 'routine_crabe',
    reculMetres: 5.5,
    decalageLateral: -0.5,
    commentaires: [
      '{nom} écarte les jambes au maximum et prend la position lunaire du crabe !',
      'Posture déroutante pour {nom} : accroupi en crabe, bras ballants entre les cuisses.',
      'Le style unique de {nom} fait sourire les supporters : la posture du crabe est de sortie.',
    ],
  },
  {
    id: 'chaman_vent',
    nom: 'L’Appel du Chaman',
    emoji: '🍃',
    categorie: 'mystique',
    description: 'S’accroupit, arrache quelques brins d’herbe, les lance en l’air et contemple le vent vers le ciel.',
    clip: 'routine_chaman',
    reculMetres: 8.0,
    decalageLateral: 1.2,
    commentaires: [
      '{nom} jette une pincée de pelouse en l’air et consulte les esprits du vent.',
      'Rituel chamanique pour {nom} : les brins d’herbe volent, Éole donne sa bénédiction.',
      '{nom} lève la main au ciel et étudie la moindre brise d’un œil mystique.',
    ],
  },
  {
    id: 'sniper',
    nom: 'Le Tireur d’Élite',
    emoji: '🎯',
    categorie: 'drole',
    description: 'Ferme un œil, pointe les doigts en forme de canon de pistolet vers la barre transversale.',
    clip: 'routine_sniper',
    reculMetres: 7.2,
    decalageLateral: -1.5,
    commentaires: [
      '{nom} ferme un œil et vise la transversale avec les doigts en pistolet : cible dans le mille !',
      'Mode sniper activé pour {nom} qui ajuste sa lunette imaginaire avant le tir.',
      '{nom} dégaine l’index droit pour aligner les perches avec une précision de tireur d’élite.',
    ],
  },
  {
    id: 'cyborg_robot',
    nom: 'Le Cyborg T-800',
    emoji: '🤖',
    categorie: 'drole',
    description: 'Mouvements robotiques saccadés à angle droit, calibrage automatique avant la frappe.',
    clip: 'routine_robot',
    reculMetres: 6.8,
    decalageLateral: 0,
    commentaires: [
      '{nom} passe en pilotage automatique : gestes robotiques et calcul balistique en cours.',
      'Bip boup ! {nom} calibre ses servomoteurs avant d’armer sa jambe bionique.',
      '{nom} pivote à 90 degrés avec la raideur d’un androïde programmé pour scorer.',
    ],
  },
  {
    id: 'flamant_rose',
    nom: 'Le Flamant Rose',
    emoji: '🦩',
    categorie: 'drole',
    description: 'Se tient en équilibre sur une seule jambe, pied posé contre le genou, bras déployés.',
    clip: 'routine_flamant',
    reculMetres: 6.2,
    decalageLateral: 0.8,
    commentaires: [
      '{nom} se dresse sur une seule jambe comme un flamant rose en pleine séance de yoga.',
      'Équilibre parfait : {nom} teste ses appuis sur un pied avec une grâce inattendue.',
      '{nom} s’étire sur une patte, aile déployée, avant de reposer son crampon d’appui.',
    ],
  },
  {
    id: 'moine_zen',
    nom: 'Le Moine Shaolin',
    emoji: '🧘',
    categorie: 'mystique',
    description: 'Paumes ouvertes vers le ciel, yeux mi-clos, respiration abdominale lente et paix totale.',
    clip: 'routine_zen',
    reculMetres: 7.5,
    decalageLateral: -0.5,
    commentaires: [
      '{nom} fait le vide total. Silence de cathédrale pour la méditation du maître.',
      '{nom} inspire la paix et expire la pression dans un souffle digne d’un temple Shaolin.',
      'Sérénité absolue : {nom} entre dans sa bulle intérieure, insensible aux sifflets.',
    ],
  },
  {
    id: 'souffle_ramos',
    nom: 'Le Souffle Glacial',
    emoji: '💨',
    categorie: 'classique',
    description: 'Mains sur les hanches, dos cambré, joue gonflée qui souffle longuement vers les poteaux.',
    clip: 'routine_respiration',
    reculMetres: 7.8,
    decalageLateral: -1.8,
    commentaires: [
      '{nom} gonfle les joues, souffle un grand coup et défie les poteaux du regard.',
      'Le souffle rituel de {nom} : les épaules redescendent, la trajectoire est déjà tracée.',
      '{nom} expire toute la tension d’un souffle puissant avant de déclencher sa course.',
    ],
  },
  {
    id: 'cowboy_duel',
    nom: 'Le Cowboy du Crépuscule',
    emoji: '🤠',
    categorie: 'drole',
    description: 'Mains qui flottent au niveau de la ceinture prêtes à dégainer, regard plissé face au soleil.',
    clip: 'routine_cowboy',
    reculMetres: 6.5,
    decalageLateral: -1.0,
    commentaires: [
      '{nom} prend la pose du cowboy face au saloon : les doigts frémissent au-dessus de la ceinture.',
      'Duel à midi pétante entre {nom} et la barre transversale : qui dégainera en premier ?',
      '{nom} ajuste son chapeau imaginaire, les mains prêtes à tirer plus vite que son ombre.',
    ],
  },
  {
    id: 'penseur_rodin',
    nom: 'Le Penseur de Rodin',
    emoji: '🗿',
    categorie: 'drole',
    description: 'Accroupi au ras du sol, coude sur le genou, menton posé sur le poing, immobile.',
    clip: 'routine_penseur',
    reculMetres: 5.8,
    decalageLateral: 0,
    commentaires: [
      '{nom} se fige dans la posture du Penseur de Rodin : silence, une œuvre d’art se prépare.',
      '{nom} médite accroupi au sol dans une immobilité spectaculaire.',
      'Statue vivante sur le pré : {nom} prend son temps et contemple son chef-d’œuvre à venir.',
    ],
  },
  {
    id: 'horloger_suisse',
    nom: 'L’Horloger Suisse',
    emoji: '⏱️',
    categorie: 'classique',
    description: 'Tape ses crampons l’un contre l’autre, remonte ses chaussettes au millimètre près.',
    clip: 'routine_horloger',
    reculMetres: 7.0,
    decalageLateral: -1.2,
    commentaires: [
      '{nom} tape ses crampons et réajuste ses chaussettes avec la minutie d’un horloger.',
      'Trois pas millimétrés, claquement sec des crampons : {nom} règle son balancier.',
      'La mécanique suisse de {nom} est en marche : tout est calibré à la seconde près.',
    ],
  },
  {
    id: 'taureau_furieux',
    nom: 'Le Taureau Furieux',
    emoji: '🐂',
    categorie: 'drole',
    description: 'Racle énergiquement la pelouse du crampon, tête basse dans les épaules, prêt à foncer.',
    clip: 'routine_taureau',
    reculMetres: 8.5,
    decalageLateral: 0,
    commentaires: [
      '{nom} racle l’herbe du crampon comme un taureau prêt à charger dans l’arène.',
      'Le regard noir, {nom} laboure le gazon : la charge s’annonce destructrice.',
      'Tête rentrée dans les épaules, {nom} piétine avec rage avant de foncer sur le tee.',
    ],
  },
  {
    id: 'danseur_etoile',
    nom: 'Le Danseur Étoile',
    emoji: '🩰',
    categorie: 'drole',
    description: 'Demi-pointes, mouvements arrondis et gracieux des bras, pas chassé tout en légèreté.',
    clip: 'routine_danseur',
    reculMetres: 6.4,
    decalageLateral: 1.5,
    commentaires: [
      '{nom} esquisse une demi-pointe tout en grâce : le ballet de la pénalité commence.',
      'Légèreté absolue pour {nom} qui se place comme un danseur de l’Opéra Garnier.',
      '{nom} enchaîne une arabesque aérienne avant de s’aligner face aux perches.',
    ],
  },
  {
    id: 'baffes_guerrier',
    nom: 'Les Baffes du Guerrier',
    emoji: '💥',
    categorie: 'classique',
    description: 'Deux grandes claques sonores sur les cuisses puis deux sur les joues pour monter en sève.',
    clip: 'routine_claques',
    reculMetres: 7.0,
    decalageLateral: -1.0,
    commentaires: [
      '{nom} s’envoie deux énormes baffes sur les joues pour réveiller le fauve !',
      'Clac ! Clac ! {nom} se fouette les cuisses pour faire monter la testostérone.',
      '{nom} se gifle le visage pour chasser le doute : le regard s’embrase instantanément.',
    ],
  },
  {
    id: 'grand_recul_steyn',
    nom: 'Le Missile des 15m',
    emoji: '🚀',
    categorie: 'legendaire',
    description: 'Recul interminable de 11.5 mètres (façon Frans Steyn) pour armer un coup de canon.',
    clip: 'routine_grand_recul',
    reculMetres: 11.5,
    decalageLateral: -2.5,
    commentaires: [
      '{nom} recule jusqu’au rond central ! C’est le grand recul façon Frans Steyn.',
      'Onze mètres d’élan pour {nom} : les perches tremblent déjà devant ce missile en approche.',
      '{nom} prend tout le champ nécessaire pour libérer la foudre de son coup de pied.',
    ],
  },
  {
    id: 'hypnotiseur',
    nom: 'L’Hypnotiseur',
    emoji: '🌀',
    categorie: 'mystique',
    description: 'Balancement pendulaire continu du buste de gauche à droite pour magnétiser le ballon.',
    clip: 'routine_hypnose',
    reculMetres: 7.0,
    decalageLateral: 0.5,
    commentaires: [
      '{nom} oscille d’un côté à l’autre comme un pendule pour hypnotiser le ballon.',
      'Le ballon semble magnétisé par les balancements lents et captivants de {nom}.',
      '{nom} berce la défense et les poteaux dans une transe hypnotique.',
    ],
  },
  {
    id: 'caresse_tee',
    nom: 'L’Amoureux du Tee',
    emoji: '🏉',
    categorie: 'classique',
    description: 'Replace le ballon trois fois au millimètre, caresse l’ogive avec une infinie tendresse.',
    clip: 'routine_caresse',
    reculMetres: 6.5,
    decalageLateral: -1.5,
    commentaires: [
      '{nom} dorlote son ballon au tee : la valve inclinée au dixième de degré près.',
      '{nom} bichonne son tee avec un soin maniaque avant de reculer à pas feutrés.',
      'Une petite caresse d’adieu sur le cuir et {nom} se replace avec confiance.',
    ],
  },
  {
    id: 'salut_ninja',
    nom: 'Le Salut Martial',
    emoji: '🥋',
    categorie: 'drole',
    description: 'Salut martial solennel poing contre paume face aux perches puis prise de garde défensive.',
    clip: 'routine_ninja',
    reculMetres: 7.2,
    decalageLateral: -0.8,
    commentaires: [
      '{nom} salue solennellement les poteaux poing dans la paume : respect et frappe létale.',
      'Posture d’arts martiaux pour {nom} : le ballon n’a aucune chance d’esquiver.',
      '{nom} s’incline respectueusement face à la barre transversale avant le coup décisif.',
    ],
  },
];

export const ROUTINES_PAR_ID = new Map<string, RoutineButeur>(
  ROUTINES_BUTEUR.map((r) => [r.id, r]),
);

/**
 * Signatures personnalisées pour les grands buteurs réels de l'histoire du rugby.
 */
const SIGNATURES_REELLES: Record<string, string> = {
  wilkinson: 'wilkinson',
  carter: 'wilkinson',
  farrell: 'farrell',
  sexton: 'farrell',
  biggar: 'biggar_macarena',
  ramos: 'souffle_ramos',
  parra: 'souffle_ramos',
  steyn: 'grand_recul_steyn',
  hogg: 'grand_recul_steyn',
  barrett: 'farrell',
  pollard: 'wilkinson',
  ntamack: 'moine_zen',
  jaminet: 'sniper',
  jalibert: 'souffle_ramos',
  carbonel: 'souffle_ramos',
  ford: 'farrell',
  hastings: 'farrell',
  cook: 'crabe_cook',
  russell: 'danseur_etoile',
};

function hashChaine(texte: string): number {
  let hash = 0;
  for (let i = 0; i < texte.length; i++) {
    hash = (hash << 5) - hash + texte.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Attribue une routine de façon stable et déterministe à un joueur.
 */
export function routineDuJoueur(joueur: {
  id?: string;
  sourceId?: string;
  nom: string;
  routineButeur?: string;
}): RoutineButeur {
  // 1. Choix explicite enregistré sur le joueur
  if (joueur.routineButeur && ROUTINES_PAR_ID.has(joueur.routineButeur)) {
    return ROUTINES_PAR_ID.get(joueur.routineButeur)!;
  }

  // 2. Détection de joueur réel de légende
  const nomMinuscule = (joueur.nom ?? '').toLowerCase();
  for (const [cle, idRoutine] of Object.entries(SIGNATURES_REELLES)) {
    if (nomMinuscule.includes(cle)) {
      const routine = ROUTINES_PAR_ID.get(idRoutine);
      if (routine) return routine;
    }
  }

  // 3. Attribution déterministe basée sur le hash du joueur
  const graine = joueur.sourceId || joueur.id || joueur.nom || 'buteur';
  const index = hashChaine(graine) % ROUTINES_BUTEUR.length;
  return ROUTINES_BUTEUR[index]!;
}

/**
 * Tire au sort une phrase de commentaire pour la routine du botteur.
 */
export function phraseRoutine(
  rng: () => number,
  routine: RoutineButeur,
  nomButeur: string,
): string {
  const choix = routine.commentaires[Math.floor(rng() * routine.commentaires.length)] ?? routine.commentaires[0]!;
  return choix.replace(/\{nom\}/g, nomButeur);
}
