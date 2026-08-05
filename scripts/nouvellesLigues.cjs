// LA TABLE DES NOUVELLES COMPÉTITIONS
//
// C'est ICI — et nulle part ailleurs — qu'on ajoute, renomme ou re-calibre une
// ligue venue de `new league/`. Le générateur (`genNouvellesLigues.cjs`) ne fait
// que lire cette table.
//
// • `dossier`   : le dossier de logos, dans `new league/`.
// • `base`      : le dossier RACINE qui contient `dossier` (défaut : `new league`).
//                 Les compétitions livrées plus tard ont leur propre dossier —
//                 `2 new leagues/` pour la Bundesliga et la Currie Cup.
// • `src`       : [pays, nom_ligue] tels qu'écrits dans flashscore_rugby_data.json.
//                 `null` = pas de classement fourni (on répartit les notes à plat,
//                 ou on suit l'ordre de `equipes` s'il est donné).
// • `equipes`   : [nom du fichier de logo, nom dans le jeu], DANS L'ORDRE de la
//                 hiérarchie. À n'utiliser que quand `src` est `null` : les noms
//                 de fichiers ne sont pas des noms de clubs (« Heidelberger »,
//                 « Hanovre 78 »), et l'ordre alphabétique n'est pas un classement.
// • `prefixeLogo` : préfixe des fichiers copiés vers `public/logos/`. ⚠️ SANS LUI,
//                 « Bulls.png » de la Currie Cup ÉCRASE le logo des Vodacom Bulls
//                 de l'URC (même slug) — pareil pour Sharks, Lions, Cheetahs et
//                 Stormers. Cinq écussons perdus en silence.
// • `poolLocal` : pool de noms des joueurs du pays, si différent de `nation`
//                 (clé de `scripts/nomsPays.cjs`). Sert à donner à un championnat
//                 son propre vivier sans toucher au pool d'export partagé.
// • `niveau`    : 0-10, l'échelle du jeu (1 = Top 14, 3 = Nationale, 7 = Fédérale 3,
//                 10 = Régionale 3). Il pilote l'audience sur L'Ovale, le salaire
//                 et la note par défaut d'un club.
// • `echelle`   : [note du dernier, note du premier]. C'est la fourchette dans
//                 laquelle le classement réel est étalé.
// • `nation`    : le pays des joueurs générés (clé de `scripts/nomsPays.cjs`).
// • `etrangers` : part d'étrangers dans les effectifs (0 à 1). Un championnat
//                 riche recrute beaucoup, un championnat de développement presque pas.

const CLUBS = [
  {
    id: 'engChampCup', nom: 'Championship Cup', pays: 'Angleterre', emoji: '🏆',
    dossier: 'Logos Rugby-Angleterre - Championship Cup', src: ['Angleterre', 'Championship Cup'],
    niveau: 2, echelle: [53, 65], nation: 'Angleterre', etrangers: 0.28, coupe: true,
  },
  {
    id: 'argentine', nom: 'Top 12 argentin', pays: 'Argentine', emoji: '🇦🇷',
    dossier: 'Logos Rugby-Argentine - Top 14', src: ['Argentine', 'Top 14'],
    niveau: 3, echelle: [50, 62], nation: 'Argentine', etrangers: 0.06,
  },
  {
    id: 'ecosseSuper', nom: 'Super Series', pays: 'Écosse', emoji: '🏴',
    dossier: 'Logos Rugby-Ecosse - Super Series', src: ['Ecosse', 'Super Series'],
    niveau: 3, echelle: [50, 61], nation: 'Écosse', etrangers: 0.14,
  },
  {
    id: 'espagne', nom: 'División de Honor', pays: 'Espagne', emoji: '🇪🇸',
    dossier: 'Logos Rugby-Espagne - Division de Honor', src: ['Espagne', 'Division de Honor'],
    niveau: 3, echelle: [48, 60], nation: 'Espagne', etrangers: 0.30,
  },
  {
    id: 'finlande', nom: 'SM-sarja', pays: 'Finlande', emoji: '🇫🇮',
    dossier: 'Logos Rugby-Finlande - SM-sarja', src: ['Finlande', 'SM-sarja'],
    niveau: 8, echelle: [30, 41], nation: 'Finlande', etrangers: 0.22,
  },
  {
    id: 'georgie', nom: 'Didi 10', pays: 'Géorgie', emoji: '🇬🇪',
    dossier: 'Logos Rugby-Géorgie - Didi 10', src: ['Géorgie', 'Didi 10'],
    niveau: 3, echelle: [47, 59], nation: 'Géorgie', etrangers: 0.05,
  },
  {
    id: 'irlandeAIL', nom: 'All-Ireland League', pays: 'Irlande', emoji: '🇮🇪',
    dossier: 'Logos Rugby-Irlande - All Ireland League', src: ['Irlande', 'All Ireland League'],
    niveau: 3, echelle: [47, 58], nation: 'Irlande', etrangers: 0.12,
  },
  {
    id: 'italie', nom: 'Serie A Elite', pays: 'Italie', emoji: '🇮🇹',
    dossier: 'Logos Rugby-Italie - Serie A Elite', src: ['Italie', 'Serie A Elite'],
    niveau: 3, echelle: [48, 60], nation: 'Italie', etrangers: 0.32,
  },
  {
    id: 'nzHeartland', nom: 'Heartland Championship', pays: 'Nouvelle-Zélande', emoji: '🇳🇿',
    dossier: 'Logos Rugby-Nouvelle-Zélande - Heartland Championships',
    src: ['Nouvelle-Zélande', 'Heartland Championships'],
    niveau: 4, echelle: [45, 56], nation: 'Nouvelle-Zélande', etrangers: 0.10,
  },
  {
    id: 'paysBas', nom: 'Ereklasse', pays: 'Pays-Bas', emoji: '🇳🇱',
    dossier: 'Logos Rugby-Pays-Bas - Ereklasse', src: ['Pays-Bas', 'Ereklasse'],
    niveau: 6, echelle: [35, 47], nation: 'Pays-Bas', etrangers: 0.24,
  },
  {
    id: 'gallesPrem', nom: 'Welsh Premiership', pays: 'Pays de Galles', emoji: '🏴',
    dossier: 'Logos Rugby-Pays de Galles - Premiership', src: ['Pays de Galles', 'Premiership'],
    niveau: 3, echelle: [46, 57], nation: 'Pays de Galles', etrangers: 0.10,
  },
  {
    id: 'gallesSRC', nom: 'Super Rygbi Cymru', pays: 'Pays de Galles', emoji: '🏴',
    dossier: 'Logos Rugby-Pays de Galles - Super Rygbi Cymru',
    src: ['Pays de Galles', 'Super Rygbi Cymru'],
    niveau: 3, echelle: [47, 58], nation: 'Pays de Galles', etrangers: 0.12,
  },
  {
    id: 'gallesChall', nom: 'Welsh Challenge Cup', pays: 'Pays de Galles', emoji: '🏆',
    dossier: 'Logos Rugby-Pays de Galles - Challenge Cup', src: ['Pays de Galles', 'Challenge Cup'],
    niveau: 4, echelle: [42, 53], nation: 'Pays de Galles', etrangers: 0.08, coupe: true,
  },
  {
    id: 'pologne', nom: 'Ekstraliga', pays: 'Pologne', emoji: '🇵🇱',
    dossier: 'Logos Rugby-Pologne - Ekstraliga', src: ['Pologne', 'Ekstraliga'],
    niveau: 6, echelle: [36, 48], nation: 'Pologne', etrangers: 0.20,
  },
  {
    id: 'portugal', nom: 'Campeonato Nacional de Honra', pays: 'Portugal', emoji: '🇵🇹',
    dossier: 'Portugal - CN Honra', src: null,
    niveau: 4, echelle: [43, 55], nation: 'Portugal', etrangers: 0.18,
  },
  {
    id: 'tcheque', nom: 'Extraliga', pays: 'République tchèque', emoji: '🇨🇿',
    dossier: 'Logos Rugby-République Tchèque - Extraliga', src: ['République Tchèque', 'Extraliga'],
    niveau: 7, echelle: [33, 44], nation: 'République tchèque', etrangers: 0.18,
  },
  {
    id: 'roumanie', nom: 'Liga Națională', pays: 'Roumanie', emoji: '🇷🇴',
    dossier: 'Logos Rugby-Roumanie - Liga Nationala', src: ['Roumanie', 'Liga Nationala'],
    niveau: 4, echelle: [45, 57], nation: 'Roumanie', etrangers: 0.14,
  },
  {
    id: 'russie', nom: 'Premier League russe', pays: 'Russie', emoji: '🇷🇺',
    dossier: 'Logos Rugby-Russie - Premier League', src: ['Russie', 'Premier League'],
    niveau: 4, echelle: [44, 56], nation: 'Russie', etrangers: 0.22,
  },

  // --- Livrées à part, dans « 2 new leagues/ » --------------------------------
  // Aucun classement n'accompagne ces deux-là (le JSON fourni est vide) : leur
  // hiérarchie est donc DÉCLARÉE ici, dans l'ordre de `equipes`.
  {
    id: 'bundesliga', nom: 'Rugby-Bundesliga', pays: 'Allemagne', emoji: '🇩🇪',
    base: '2 new leagues', dossier: '1 Bundesliga', src: null,
    niveau: 6, echelle: [34, 47], nation: 'Allemagne', etrangers: 0.34,
    // Le rugby allemand tient sur Heidelberg : quatre des dix clubs y sont, et
    // les deux premiers (RG Heidelberg et le HRK) se partagent les titres.
    equipes: [
      ['Heidelberg', 'RG Heidelberg'],
      ['Heidelberger', 'Heidelberger RK'],
      ['Neuenheim', 'SC Neuenheim'],
      ['Handschuhsheim', 'TSV Handschuhsheim'],
      ['Frankfurt', 'SC Frankfurt 1880'],
      ['Luxemburg', 'RC Luxembourg'],
      ['Hanovre 78', 'DSV 78 Hannover'],
      ['Berliner', 'Berliner RC'],
      ['Munchen', 'StuSta München'],
      ['Germania List', 'SV Germania List'],
    ],
  },
  {
    id: 'currieCup', nom: 'Currie Cup', pays: 'Afrique du Sud', emoji: '🇿🇦',
    base: '2 new leagues', dossier: 'Currie Cup', src: null, prefixeLogo: 'currie',
    niveau: 2, echelle: [57, 69], nation: 'Afrique du Sud', etrangers: 0.13,
    poolLocal: 'Afrique du Sud (mixte)',
    // ⚠️ CE NE SONT PAS LES FRANCHISES DE L'URC. La Currie Cup se joue avec les
    // UNIONS, sous leur nom propre : les Vodacom Bulls de l'URC deviennent les
    // Blue Bulls, les Emirates Lions les Golden Lions, la Western Province les
    // Stormers XXIII. Des noms distincts, donc aucune collision d'effectif.
    // ⚠️ Idem pour Bloemfontein, et la règle avait été appliquée À L'ENVERS :
    // l'union s'appelle « Free State Cheetahs » et c'est ELLE qui joue la Currie
    // Cup ; la franchise « Toyota Cheetahs » dispute les coupes d'Europe et est
    // déclarée dans `scripts/ligues.cjs`.
    equipes: [
      ['Bulls', 'Blue Bulls'],
      ['Sharks', 'Sharks XV'],
      ['Lions', 'Golden Lions'],
      ['Stormers XXIII', 'Stormers XXIII'],
      ['Cheetahs', 'Free State Cheetahs'],
      ['Pumas', 'Airlink Pumas'],
      ['Griquas', 'Griquas'],
      ['Boland Cavaliers', 'Boland Cavaliers'],
    ],
  },
];

// ---------------------------------------------------------------------------
// LES COMPÉTITIONS DE SÉLECTIONS
// ---------------------------------------------------------------------------
// `force` : la note d'équipe de la meilleure nation engagée. Les autres sont
// étalées vers le bas selon le classement fourni. `fenetre` dit à quel moment
// de la saison la compétition se joue (voir data/calendrier.ts).
const NATIONS = [
  {
    id: 'oceaniaCup', nom: 'Oceania Cup', emoji: '🏝️',
    dossier: 'Logos Rugby-Australie & Océanie - Oceania Cup',
    src: ['Australie & Océanie', 'Oceania Cup'], force: [52, 62], fenetre: 'automne',
  },
  {
    id: 'recEurope', nom: 'Rugby Europe Championship', emoji: '🇪🇺',
    dossier: "Logos Rugby-Europe - Championnat d'Europe de rugby",
    src: ['Europe', "Championnat d'Europe de rugby"], force: [60, 78], fenetre: 'tournoi',
  },
  {
    id: 'recTrophy', nom: 'Rugby Europe Trophy', emoji: '🥈',
    dossier: 'Logos Rugby-Europe - Rugby Europe Trophy',
    src: ['Europe', 'Rugby Europe Trophy'], force: [50, 62], fenetre: 'tournoi',
  },
  {
    id: 'recConference', nom: 'Rugby Europe Conference', emoji: '🥉',
    dossier: 'Logos Rugby-Europe - Rugby Europe Conference',
    src: ['Europe', 'Rugby Europe Conference'], force: [38, 55], fenetre: 'tournoi',
  },
  {
    id: 'americasChamp', nom: 'Americas Championship', emoji: '🌎',
    dossier: 'Logos Rugby-Monde - Americas Championship',
    src: ['Monde', 'Americas Championship'], force: [58, 72], fenetre: 'automne',
  },
  {
    id: 'americasPacific', nom: 'Americas Pacific Challenge', emoji: '🌊',
    dossier: 'Logos Rugby-Monde - Americas Pacific Challenge',
    src: ['Monde', 'Americas Pacific Challenge'], force: [55, 68], fenetre: 'automne',
  },
  {
    id: 'autumnCup', nom: 'Autumn Nations Cup', emoji: '🍂',
    dossier: 'Logos Rugby-Monde - Autumn Nations Cup',
    src: ['Monde', 'Autumn Nations Cup'], force: [76, 90], fenetre: 'automne',
  },
  {
    id: 'tbilisiCup', nom: 'IRB Tbilisi Cup', emoji: '🏛️',
    dossier: 'Logos Rugby-Monde - IRB Tbilisi Cup',
    src: ['Monde', 'IRB Tbilisi Cup'], force: [58, 72], fenetre: 'automne',
  },
  {
    id: 'nationsCupM', nom: 'Nations Cup', emoji: '🏅',
    dossier: 'Logos Rugby-Monde - Nations Cup',
    src: ['Monde', 'Nations Cup'], force: [60, 74], fenetre: 'automne',
  },
  {
    id: 'pacificChallenge', nom: 'Pacific Challenge', emoji: '🌴',
    dossier: 'Logos Rugby-Monde - Pacific Challenge',
    src: ['Monde', 'Pacific Challenge'], force: [56, 70], fenetre: 'automne',
  },
  {
    id: 'trcMonde', nom: 'The Rugby Championship', emoji: '🌏',
    dossier: 'Logos Rugby-Monde - Rugby Championship',
    src: ['Monde', 'Rugby Championship'], force: [85, 92], fenetre: 'tournoi',
  },
  {
    id: 'trcU20Monde', nom: 'The Rugby Championship U20', emoji: '🌏',
    dossier: 'Logos Rugby-Monde - Rugby Championship U20',
    src: ['Monde', 'Rugby Championship U20'], force: [70, 80], fenetre: 'tournoi',
  },
  {
    id: 'u20Trophy', nom: 'World Rugby U20 Trophy', emoji: '🎓',
    dossier: 'Logos Rugby-Monde - U20 Trophy',
    src: ['Monde', 'U20 Trophy'], force: [52, 66], fenetre: 'tournoi',
  },
];

module.exports = { CLUBS, NATIONS };
