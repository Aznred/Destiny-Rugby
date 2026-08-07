// Trophées gagnables en fin de saison. Chaque trophée a un modèle 3D
// (public/m3d/*.glb, compressé Draco) affiché en animation quand on le remporte.

import { COMPETITIONS_NATIONS_NOUVELLES } from './nouvellesLigues.js';

export interface Trophee {
  id: string;
  nom: string;
  modele: string;
  couleur: string; // teinte de l'aura dans la modale
  desc: string;
  ovas: number; // récompense (économie dure : reste modeste)
  /**
   * ⚠️ N'À RENSEIGNER QUE POUR LES BOUCLIERS QUI N'EN ONT PAS LA FORME.
   * L'armoire à trophées reconnaît un bouclier à sa boîte englobante (plat et
   * large, `estBouclier()` dans `lib/armoire.ts`) : elle l'adosse au meuble au
   * lieu de le poser sur une tablette. Le Brennus, le trophée de Pro D2 et la
   * coupe russe sont livrés AVEC leur socle — mesurés, ils sont aussi épais
   * qu'une coupe — d'où cette déclaration.
   */
  forme?: 'bouclier';
  /**
   * ⚠️ UNE DISTINCTION PERSONNELLE, PAS UN TITRE D'ÉQUIPE. Absent = collectif
   * (un championnat, une coupe, un tournoi gagné AVEC un club ou une sélection).
   *
   * Ce champ commande deux choses, et c'est le seul endroit où on en décide :
   *   1. **L'ARMOIRE** (demande explicite) — « les trophées individuels dans
   *      l'armoire et les trophées collectifs à côté, plus gros ». Les
   *      distinctions vont en vitrine, les titres se dressent au sol autour du
   *      meuble (`lib/armoire.ts`).
   *   2. **COMMENT ON LES GAGNE** — un titre collectif se joue (`phaseFinale`,
   *      `coupe`), une distinction se MÉRITE : elle est décernée sur la note de
   *      saison, les statistiques et le palmarès de l'année (`lib/honneurs.ts`).
   */
  individuel?: true;
}

/** Vrai pour une distinction personnelle, faux pour un titre d'équipe. */
export function estIndividuel(t: Trophee | undefined): boolean {
  return t?.individuel === true;
}

export const TROPHEES: Record<string, Trophee> = {
  brennus: {
    id: 'brennus',
    nom: 'Bouclier de Brennus',
    modele: '/m3d/brennus.glb',
    couleur: '#e8b23a',
    desc: 'Champion de France — Top 14. Le Graal du rugby français.',
    ovas: 12,
    forme: 'bouclier',
  },
  prod2: {
    id: 'prod2',
    nom: 'Trophée Pro D2',
    modele: '/m3d/prod2.glb',
    couleur: '#c0c8d0',
    desc: 'Champion de Pro D2 : la montée dans l’élite se joue ici.',
    ovas: 8,
    // Mesuré : 1,67 × 1,90 × 0,60 — le socle le rend trop épais pour que
    // `estBouclier()` le reconnaisse, mais c'en est un, et il s'adosse.
    forme: 'bouclier',
  },
  nationale: {
    id: 'nationale',
    nom: 'Bouclier de Nationale',
    modele: '/m3d/nationale.glb',
    couleur: '#b3653a',
    desc: 'Champion de Nationale. Le tremplin vers le monde pro.',
    ovas: 6,
    forme: 'bouclier',
  },
  nationale2: {
    id: 'nationale2',
    nom: 'Bouclier de Nationale 2',
    modele: '/m3d/nationale.glb',
    couleur: '#a8703f',
    desc: 'Champion de Nationale 2. La dernière marche avant le monde pro.',
    ovas: 5,
    forme: 'bouclier',
  },
  federale: {
    id: 'federale',
    nom: 'Bouclier de Fédérale',
    modele: '/m3d/nationale.glb',
    couleur: '#9a6b45',
    desc: 'Champion de Fédérale : le vrai rugby de clocher, et un titre qui compte.',
    ovas: 4,
    forme: 'bouclier',
  },
  regionale: {
    id: 'regionale',
    nom: 'Bouclier de Régionale',
    modele: '/m3d/nationale.glb',
    couleur: '#8d7350',
    desc: 'Champion de Régionale. Le bouclier du dimanche après-midi — on s’en souvient toute une vie.',
    ovas: 3,
    forme: 'bouclier',
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
  // --- LES HONNEURS INDIVIDUELS ----------------------------------------------
  // ⚠️ Jusqu'ici, UNE SEULE distinction personnelle existait (meilleur joueur du
  // monde), et elle tombait sur un tirage au sort conditionné au seul niveau
  // général. Toute une saison pouvait se jouer sans qu'aucun honneur ne
  // récompense la PERFORMANCE. Les sept trophées ci-dessous s'y emploient : ils
  // se méritent sur la note de saison, les statistiques et le palmarès de
  // l'année (`lib/honneurs.ts`), jamais sur un coup de dé.
  //
  // ⚠️ ILS NE SE GAGNENT QUE LÀ OÙ ILS EXISTENT. Un championnat amateur n'élit
  // pas de joueur de l'année : `MEILLEUR_JOUEUR_PAR_DIVISION` ne couvre que les
  // cinq championnats qui le font vraiment. C'est volontaire — la rareté est ce
  // qui donne sa valeur à une distinction.
  meilleurJoueur: {
    id: 'meilleurJoueur',
    // ⚠️ NE PAS RENOMMER : `palmaresDepuisLibelles()` (store) reconstruit le
    // palmarès des vieilles sauvegardes en rapprochant le libellé du NOM.
    nom: 'Meilleur joueur de l’année',
    modele: '/m3d/meilleur-joueur.glb',
    couleur: '#f4cd63',
    desc: 'Élu meilleur joueur du monde. Personne ne t’a surpassé cette saison.',
    ovas: 20,
    individuel: true,
  },
  meilleurTop14: {
    id: 'meilleurTop14',
    nom: 'Meilleur joueur du Top 14',
    modele: '/m3d/meilleurTop14.glb',
    couleur: '#e8b23a',
    desc: 'Élu meilleur joueur de la saison de Top 14 par tes pairs et par la presse.',
    ovas: 11,
    individuel: true,
  },
  meilleurPremiership: {
    id: 'meilleurPremiership',
    nom: 'Meilleur joueur de la Premiership',
    modele: '/m3d/meilleurPremiership.glb',
    couleur: '#8e6bd6',
    desc: 'Joueur de la saison en Angleterre. Toute la Premiership a regardé dans ta direction.',
    ovas: 10,
    individuel: true,
  },
  meilleurUrc: {
    id: 'meilleurUrc',
    nom: 'Meilleur joueur de l’URC',
    modele: '/m3d/meilleurUrc.glb',
    couleur: '#3ad1c0',
    desc: 'Joueur de la saison de l’United Rugby Championship — quatre pays, une seule référence : toi.',
    ovas: 10,
    individuel: true,
  },
  // ⚠️ UN SEUL TROPHÉE POUR LES DEUX COMPÉTITIONS NÉO-ZÉLANDAISES, ET C'EST
  // FIDÈLE : la distinction de joueur de l'année est décernée par la fédération
  // néo-zélandaise, sur l'ensemble de la saison — Super Rugby ET NPC.
  meilleurNZ: {
    id: 'meilleurNZ',
    nom: 'Meilleur joueur de Nouvelle-Zélande',
    modele: '/m3d/meilleurNZ.glb',
    couleur: '#1f1f1f',
    desc: 'Joueur néo-zélandais de l’année. Au pays des All Blacks, cette ligne-là vaut toutes les autres.',
    ovas: 10,
    individuel: true,
  },
  meilleurChampionsCup: {
    id: 'meilleurChampionsCup',
    nom: 'Meilleur joueur de la Champions Cup',
    modele: '/m3d/meilleurChampionsCup.glb',
    couleur: '#3fa9f5',
    desc: 'Homme fort de la campagne européenne. Six matchs pour marquer l’Europe, et tu les as tous marqués.',
    ovas: 13,
    individuel: true,
  },
  meilleurSixNations: {
    id: 'meilleurSixNations',
    nom: 'Meilleur joueur du Tournoi',
    modele: '/m3d/meilleurSixNations.glb',
    couleur: '#d4a017',
    desc: 'Joueur du Tournoi des 6 Nations. Cinq week-ends de février, et un nom qui revient dans toutes les bouches.',
    ovas: 14,
    individuel: true,
  },
  hommeDuMatchMonde: {
    id: 'hommeDuMatchMonde',
    nom: 'Homme du match — finale de Coupe du monde',
    modele: '/m3d/hommeDuMatchMonde.glb',
    couleur: '#f4cd63',
    desc: 'Meilleur joueur de la finale de la Coupe du monde. Une soirée que le rugby entier a regardée, et c’est toi qu’il a vu.',
    ovas: 18,
    individuel: true,
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
    forme: 'bouclier',
  },

  // --- Les championnats et coupes de sources/modeles/trophees/ ----------------
  // ⚠️ Jusqu'ici, les 18 championnats ajoutés par `data/nouvellesLigues.ts` ne
  // décernaient RIEN : on pouvait signer à Batumi, y être champion, et repartir
  // les mains vides. Chacun a désormais son trophée, avec son modèle 3D.
  // Le montant en Ovas suit le `niveau` de la compétition — l'économie reste
  // dure (voir CLAUDE.md), un titre finlandais ne vaut pas un Brennus.
  currieCup: {
    id: 'currieCup',
    nom: 'Currie Cup',
    modele: '/m3d/currieCup.glb',
    couleur: '#0a7a3b',
    desc: 'La plus vieille coupe du rugby sud-africain. Les unions se la disputent depuis 1892 — et cette année, elle est à toi.',
    ovas: 9,
  },
  italie: {
    id: 'italie',
    nom: 'Scudetto',
    modele: '/m3d/italie.glb',
    couleur: '#0a2a6b',
    desc: 'Champion d’Italie. Le Scudetto se coud sur le maillot, et il ne se rend pas sans se battre.',
    ovas: 6,
  },
  argentine: {
    id: 'argentine',
    nom: 'Top 12 argentin',
    modele: '/m3d/argentine.glb',
    couleur: '#74acdf',
    desc: 'Champion d’Argentine, au pays des Pumas : le vivier le plus rude de l’hémisphère sud.',
    ovas: 6,
  },
  ecosseSuper: {
    id: 'ecosseSuper',
    nom: 'Super Series',
    modele: '/m3d/ecosseSuper.glb',
    couleur: '#2b4a8b',
    desc: 'Le titre écossais, arraché sous la pluie et devant deux mille personnes qui n’ont pas bougé.',
    ovas: 6,
  },
  espagne: {
    id: 'espagne',
    nom: 'División de Honor',
    modele: '/m3d/espagne.glb',
    couleur: '#c8102e',
    desc: 'Champion d’Espagne. Les Leones montent, et tu montes avec eux.',
    ovas: 6,
  },
  georgie: {
    id: 'georgie',
    nom: 'Didi 10',
    modele: '/m3d/georgie.glb',
    couleur: '#b02a2a',
    desc: 'Champion de Géorgie : un pays où la mêlée est une affaire d’honneur, et où tu viens de la gagner.',
    ovas: 6,
  },
  irlandeAIL: {
    id: 'irlandeAIL',
    nom: 'All-Ireland League',
    modele: '/m3d/irlandeAIL.glb',
    couleur: '#0a7a3b',
    desc: 'Le championnat des clubs irlandais, celui où tout commence. Ton nom rejoint la plaque du club-house.',
    ovas: 6,
  },
  gallesSRC: {
    id: 'gallesSRC',
    nom: 'Super Rygbi Cymru',
    modele: '/m3d/gallesSRC.glb',
    couleur: '#c1121f',
    desc: 'Le sommet du rugby de club gallois. Toute une vallée a chanté pour toi.',
    ovas: 6,
  },
  gallesPrem: {
    id: 'gallesPrem',
    nom: 'Welsh Premiership',
    modele: '/m3d/gallesPrem.glb',
    couleur: '#7a1020',
    desc: 'Champion du deuxième étage gallois : la marche qui mène à la Super Rygbi Cymru.',
    ovas: 5,
  },
  gallesChall: {
    id: 'gallesChall',
    nom: 'Welsh Challenge Cup',
    modele: '/m3d/gallesChall.glb',
    couleur: '#3f8f5f',
    desc: 'La coupe du Pays de Galles : un tableau sec, des terrains impossibles, et une finale à Cardiff.',
    ovas: 5,
  },
  nzHeartland: {
    id: 'nzHeartland',
    nom: 'Meads Cup',
    modele: '/m3d/nzHeartland.glb',
    couleur: '#1f1f1f',
    desc: 'Le trophée du Heartland Championship, la Nouvelle-Zélande rurale. Colin Meads a donné son nom à la coupe ; toi, tu l’as levée.',
    ovas: 5,
  },
  portugal: {
    id: 'portugal',
    nom: 'Campeonato Nacional de Honra',
    modele: '/m3d/portugal.glb',
    couleur: '#0a7a3b',
    desc: 'Champion du Portugal, la nation qui monte. Os Lobos t’ont dans un coin de la tête.',
    ovas: 5,
  },
  roumanie: {
    id: 'roumanie',
    nom: 'Liga Națională',
    modele: '/m3d/roumanie.glb',
    couleur: '#f2c200',
    desc: 'Champion de Roumanie, au pays des Chênes : un rugby de devants, et un titre qui se prend au corps.',
    ovas: 5,
  },
  russie: {
    id: 'russie',
    nom: 'Premier League russe',
    modele: '/m3d/russie.glb',
    couleur: '#5a2d82',
    desc: 'Champion de Russie. Des déplacements interminables, des hivers durs, et une coupe au bout.',
    ovas: 5,
    // Même cas que le Pro D2 : un bouclier sur un socle épais (1,48 × 1,90 × 0,91).
    forme: 'bouclier',
  },
  paysBas: {
    id: 'paysBas',
    nom: 'Ereklasse',
    modele: '/m3d/paysBas.glb',
    couleur: '#d96a00',
    desc: 'Champion des Pays-Bas. Le rugby néerlandais est confidentiel — ceux qui le suivent connaissent ton nom.',
    ovas: 4,
  },
  pologne: {
    id: 'pologne',
    nom: 'Ekstraliga',
    modele: '/m3d/pologne.glb',
    couleur: '#c8102e',
    desc: 'Champion de Pologne, dans un championnat que personne n’attendait — et qui t’a pris deux saisons.',
    ovas: 4,
  },
  bundesliga: {
    id: 'bundesliga',
    nom: 'Rugby-Bundesliga',
    modele: '/m3d/bundesliga.glb',
    couleur: '#d9a441',
    desc: 'Champion d’Allemagne. Tout le rugby du pays tient dans un quartier de Heidelberg, et tu y as gagné.',
    ovas: 4,
  },
  tcheque: {
    id: 'tcheque',
    nom: 'Extraliga',
    modele: '/m3d/tcheque.glb',
    couleur: '#1a4b8c',
    desc: 'Champion de Tchéquie. Un titre de l’ombre, gagné dans le froid, devant les fidèles.',
    ovas: 3,
  },
  finlande: {
    id: 'finlande',
    nom: 'SM-sarja',
    modele: '/m3d/finlande.glb',
    couleur: '#5b9bd5',
    desc: 'Champion de Finlande : la saison la plus courte du monde, et la seule où l’on déneige le terrain avant de jouer.',
    ovas: 3,
  },
  // ⚠️ MODÈLE RÉUTILISÉ, ASSUMÉ. Aucun `.glb` n'a été livré pour la coupe de la
  // deuxième division anglaise ; elle emprunte celui de la Premiership Rugby
  // Cup, dont elle est le pendant d'un étage en dessous. Même principe que le
  // bouclier de Nationale, partagé par les quatre étages amateurs.
  engChampCup: {
    id: 'engChampCup',
    nom: 'Championship Cup',
    modele: '/m3d/prem-cup.glb',
    couleur: '#7f9ab5',
    desc: 'La coupe de la deuxième division anglaise : peu de monde en tribunes, beaucoup de jeunes affamés sur le terrain.',
    ovas: 5,
  },

  // --- Sélections ------------------------------------------------------------
  recEurope: {
    id: 'recEurope',
    nom: 'Rugby Europe Championship',
    modele: '/m3d/recEurope.glb',
    couleur: '#1a5fb4',
    desc: 'Le « Tournoi des 6 Nations B » : Géorgie, Portugal, Roumanie, Espagne… Le titre des nations qui frappent à la porte du Tournoi.',
    ovas: 10,
  },
  americasChamp: {
    id: 'americasChamp',
    nom: 'Americas Rugby Championship',
    modele: '/m3d/americasChamp.glb',
    couleur: '#2f72c4',
    desc: 'Champion des Amériques après avoir affronté les meilleures sélections du continent.',
    ovas: 8,
  },
  oceaniaCup: {
    id: 'oceaniaCup',
    nom: 'Oceania Cup',
    modele: '/m3d/oceaniaCup.glb',
    couleur: '#22a6a1',
    desc: 'Vainqueur du championnat des nations émergentes d’Océanie.',
    ovas: 5,
  },
  recTrophyConference: {
    id: 'recTrophyConference',
    nom: 'Rugby Europe Trophy / Conference',
    modele: '/m3d/recTrophyConference.glb',
    couleur: '#587fc2',
    desc: 'Vainqueur de ton niveau européen et promu vers l’échelon supérieur.',
    ovas: 5,
  },
  rugbyChampionship: {
    id: 'rugbyChampionship',
    nom: 'The Rugby Championship',
    modele: '/m3d/rugbyChampionship.glb',
    couleur: '#e0ad35',
    desc: 'Champion de l’hémisphère sud face aux Springboks, All Blacks, Wallabies et Pumas.',
    ovas: 15,
  },
  nationsCup: {
    id: 'nationsCup',
    nom: 'World Rugby Nations Cup',
    modele: '/m3d/nationsCup.glb',
    couleur: '#4b8ac6',
    desc: 'Vainqueur de la Nations Cup, tournoi international des nations en développement.',
    ovas: 8,
  },
  pacificChallenge: {
    id: 'pacificChallenge',
    nom: 'World Rugby Pacific Challenge',
    modele: '/m3d/pacificChallenge.glb',
    couleur: '#26a68b',
    desc: 'Vainqueur du Pacific Challenge au terme d’une campagne insulaire intense.',
    ovas: 7,
  },
  mondialU20: {
    id: 'mondialU20',
    nom: 'Championnat du monde U20',
    modele: '/m3d/mondialU20.glb',
    couleur: '#71b9e6',
    desc: 'Champion du monde des moins de 20 ans, premier grand titre d’une carrière en devenir.',
    ovas: 10,
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
  // Les étages amateurs : même bouclier, un nom par division.
  nationale2: 'nationale2',
  fed1: 'federale',
  fed2: 'federale',
  fed3: 'federale',
  reg1: 'regionale',
  reg2: 'regionale',
  reg3: 'regionale',
  premiership: 'premiership',
  championship: 'championship',
  urc: 'urc',
  super: 'super',
  npc: 'npc',
  japon1: 'japon',
  japon2: 'japon',
  japon3: 'japon',
  mlr: 'mlr',
  // Les 20 compétitions de `data/nouvellesLigues.ts`. Elles sont dans
  // `COMPETITIONS` comme les autres, `genererOffres()` y envoie donc de vraies
  // offres dès 55 de notoriété : on peut y signer, y être champion — et
  // désormais y gagner quelque chose. L'id de trophée = l'id de compétition.
  currieCup: 'currieCup',
  bundesliga: 'bundesliga',
  italie: 'italie',
  argentine: 'argentine',
  ecosseSuper: 'ecosseSuper',
  espagne: 'espagne',
  georgie: 'georgie',
  irlandeAIL: 'irlandeAIL',
  gallesSRC: 'gallesSRC',
  gallesPrem: 'gallesPrem',
  gallesChall: 'gallesChall',
  engChampCup: 'engChampCup',
  nzHeartland: 'nzHeartland',
  portugal: 'portugal',
  roumanie: 'roumanie',
  russie: 'russie',
  paysBas: 'paysBas',
  pologne: 'pologne',
  tcheque: 'tcheque',
  finlande: 'finlande',
};

// Trophée d'une coupe (COUPES_EUROPE de data/mondeReel.ts).
export const TROPHEE_PAR_COUPE: Record<string, string> = {
  championsCup: 'champions',
  challengeCup: 'challenge',
  premCup: 'premCup',
};

/**
 * Trophée d'une compétition de SÉLECTIONS (`lib/international.ts`).
 *
 * ⚠️ C'EST CETTE TABLE QUI A MANQUÉ PENDANT LONGTEMPS, et c'est ce qui a produit
 * le bug signalé en jeu : « j'ai fait le Grand Chelem avec l'équipe de France et
 * je n'ai pas eu les 6 Nations ». Le Tournoi était RÉELLEMENT joué journée par
 * journée (on en voyait le classement dans l'écran Résultats), mais le titre,
 * lui, était TIRÉ AU SORT à partir de la note du joueur — les deux n'avaient
 * aucun rapport. Désormais `resoudreTrophees` lit le vrai vainqueur du vrai
 * classement, et cette table dit quel trophée lui correspond.
 *
 * Toutes les compétitions n'ont pas de modèle 3D : celles qui n'en ont pas
 * n'apparaissent pas ici, et ne décernent donc rien. Pour en ajouter une, il
 * faut d'abord son `.glb` dans `public/m3d/` et son entrée dans `TROPHEES`.
 */
export const TROPHEE_PAR_INTERNATIONAL: Record<string, string> = {
  sixNations: 'sixNations',
  rugbyChampionship: 'rugbyChampionship',
  mondialU20: 'mondialU20',
  recEurope: 'recEurope',
  oceaniaCup: 'oceaniaCup',
  recTrophy: 'recTrophyConference',
  recConference: 'recTrophyConference',
  americasChamp: 'americasChamp',
  nationsCupM: 'nationsCup',
  pacificChallenge: 'pacificChallenge',
  trcMonde: 'rugbyChampionship',
  coupeDuMonde: 'monde',
};

// ---------------------------------------------------------------------------
// LES DISTINCTIONS INDIVIDUELLES, ET OÙ ELLES SE DÉCERNENT
// ---------------------------------------------------------------------------
// ⚠️ VOLONTAIREMENT COURTES. Cinq championnats sur trente-trois élisent un
// joueur de l'année, parce que c'est le cas dans la réalité : personne ne
// décerne d'Oscar en Fédérale 3, ni en Ekstraliga polonaise. Un honneur qui
// tomberait partout ne serait plus un honneur, et ferait exploser le compteur
// de titres du classement mondial (voir `LIMITES` dans `lib/classementMondial.ts`).

/** Championnat (id de compétition) → sa distinction de meilleur joueur de la saison. */
export const MEILLEUR_JOUEUR_PAR_DIVISION: Record<string, string> = {
  top14: 'meilleurTop14',
  premiership: 'meilleurPremiership',
  urc: 'meilleurUrc',
  // Les deux compétitions néo-zélandaises partagent LA distinction du pays.
  super: 'meilleurNZ',
  npc: 'meilleurNZ',
};

/**
 * Distinctions attachées à une campagne (coupe d'Europe, tournoi, Coupe du
 * monde) plutôt qu'à un championnat. Elles ont chacune leur condition d'accès,
 * écrite dans `lib/honneurs.ts` — être engagé en Champions Cup, être sélectionné
 * pour le Tournoi, avoir disputé (et gagné) la finale du monde.
 */
export const HONNEUR_CHAMPIONS_CUP = 'meilleurChampionsCup';
export const HONNEUR_TOURNOI = 'meilleurSixNations';
export const HONNEUR_FINALE_MONDE = 'hommeDuMatchMonde';
export const HONNEUR_MONDIAL = 'meilleurJoueur';

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

// Nations disputant le Rugby Europe Championship — le « Tournoi des 6 Nations B »
// (Portugal, Géorgie, Espagne, Roumanie, Belgique, Allemagne, Suisse, Pays-Bas).
// ⚠️ LA LISTE EST DÉRIVÉE, PAS RECOPIÉE : c'est la même compétition que celle
// jouée journée par journée dans l'écran Résultats (`COMPETITIONS_NATIONS_NOUVELLES`).
// La recopier, c'est se garantir un jour deux vérités différentes.
// Ces nations sont disjointes des six du Tournoi : un joueur n'est jamais
// éligible aux deux.
export const NATIONS_REC: string[] =
  COMPETITIONS_NATIONS_NOUVELLES.find((c) => c.id === 'recEurope')?.equipes.map((e) => e.nom) ?? [];
