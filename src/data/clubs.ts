// Base de données des clubs et championnats — saison 2025-2026.
//
// • Top 14 / Pro D2 / Nationale et TOUS les championnats du monde couverts par
//   la base réelle viennent du fichier GÉNÉRÉ `mondeReel.ts` (effectifs réels,
//   classements de la saison passée, logos officiels).
// • Nationale 2 / Fédérale 1-2-3 restent des listes FFR saisies à la main :
//   la base ne descend pas jusque-là. Leurs blasons sont générés (initiales +
//   couleurs), les autres affichent leur vrai logo.

import type { Club, Competition } from '../types';
import { COMPETITIONS_REELLES } from './mondeReel';
import { CLUBS_REGIONAUX, LOGO_AMATEUR } from './amateurs';
import { COMPETITIONS_NOUVELLES } from './nouvellesLigues';
import { CODE_PAR_NATION } from './nations';

export type { Club, Competition };

// Palette de couleurs « rugby » pour les blasons générés.
const PALETTE = [
  '#c1121f', '#0a2a6b', '#0a7a3b', '#f2c200', '#5a2d82',
  '#7a1020', '#0a5a5a', '#d96a00', '#000000', '#1a6bb5',
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function couleurs(nom: string): { c1: string; c2: string } {
  const h = hash(nom);
  const i = h % PALETTE.length;
  let j = (h >>> 4) % PALETTE.length; // >>> : décalage non signé (sinon index négatif)
  if (j === i) j = (j + 3) % PALETTE.length;
  return { c1: PALETTE[i], c2: PALETTE[j] };
}

function club(nom: string, ville?: string): Club {
  const { c1, c2 } = couleurs(nom);
  // Depuis le pack de logos amateurs, la Nationale 2 → Régionale 3 a elle aussi
  // ses vrais écussons ; le blason généré ne sert plus que de repli.
  const logo = LOGO_AMATEUR[nom];
  return { nom, ville, c1, c2, ...(logo ? { logo } : {}) };
}

// Mots gardés en MAJUSCULES lors du reformatage des noms officiels FFR.
const ACRONYMES = new Set([
  'XV', 'AS', 'RC', 'US', 'SC', 'SA', 'SO', 'CA', 'CO', 'CS', 'FC', 'ES', 'RO',
  'UA', 'UC', 'OL', 'ASV', 'USO', 'USON', 'USEP', 'SCUF', 'SMUC', 'TOEC',
  'TOAC', 'FCT', 'ACBB', 'JA', 'BSE', 'ROC', 'ACLR',
]);
const MINUSCULES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'sur', 'en', 'et', 'aux', 'd', 'l']);

function reformater(officiel: string): string {
  return officiel
    .split(' ')
    .map((mot, i) => {
      if (mot.length <= 1) return mot.toUpperCase();
      if (ACRONYMES.has(mot.toUpperCase())) return mot.toUpperCase();
      const bas = mot.toLowerCase();
      if (i > 0 && MINUSCULES.has(bas)) return bas;
      return bas.charAt(0).toUpperCase() + bas.slice(1);
    })
    .join(' ');
}

// Parse un bloc « NOM OFFICIEL|Nom court » (une entrée par ligne).
function parser(bloc: string): Club[] {
  return bloc
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [officiel, court] = l.split('|');
      return club(reformater(officiel.trim()), court?.trim());
    });
}

// ---------- FRANCE — divisions non couvertes par la base réelle ----------
const NATIONALE2: Club[] = [
  club('CS Vienne Rugby', 'Vienne'),
  club('RC Orléans', 'Orléans'),
  club('AS Fleurantine', 'Fleurance'),
  club('AS Mâconnaise', 'Mâcon'),
  club('Avenir Valencien', "Valence d'Agen"),
  club('CS Annonay', 'Annonay'),
  club('CM Floirac', 'Floirac'),
  club('Peyrehorade Sports Rugby', 'Peyrehorade'),
  club('RC Aubenas Vals', 'Aubenas'),
  club('Rugby Club Auch', 'Auch'),
  club('RC Nîmois', 'Nîmes'),
  club('RC Savoie Rumilly', 'Rumilly'),
  club('RC Tricastin', 'Tricastin'),
  club('SA Mauléonais', 'Mauléon'),
  club('SC Graulhet', 'Graulhet'),
  club('Saint-Jean-de-Luz Olympique', 'Saint-Jean-de-Luz'),
  club('Servette RC de Genève', 'Genève'),
  club('Saint-Médard-en-Jalles RC', 'Saint-Médard-en-Jalles'),
  club('Stade Langonnais', 'Langon'),
  club('Stade Métropolitain', 'Stade Métropolitain'),
  club('Stade Nantais', 'Nantes'),
  club('US Salles', 'Salles'),
  club('US Seynoise', 'La Seyne-sur-Mer'),
  club('US Tyrosse', 'Tyrosse'),
  club('Union Drancy Saint-Denis 93', 'Drancy'),
  club('US Marmandaise', 'Marmande'),
];

const FEDERALE1 = parser(`
4 CANTONS BASTIDES HAUT AGENAIS PERIGORD|4 Cantons
A S LAYRACAISE|Layrac
A S MONACO|Monaco
A S PONT LONG|Pont-Long
A S SOUSTONS|Soustons
ANGLET OLYMPIQUE|Anglet
AS BIEVRE ST GEOIRS RUGBY CLUB|Bièvre Saint-Geoirs
AVENIR SPORTIF DE BEDARRIDES CHATEAUNEUF DU PAPE|Bédarrides
AVIRON GRUISSANAIS|Gruissan
BEAUVAIS XV R C|Beauvais
BLAGNAC SPORTING CLUB RUGBY|Blagnac
C A SARLADAIS PERIGORD NOIR|Sarlat
C O BERRE XV|Berre-l'Étang
C S NUITON|Nuits-Saint-Georges
CAHORS RUGBY ST CADURCIEN|Cahors
CERCLE AMICAL LANNEMEZANAIS|Lannemezan
CERET SPORTIF|Céret
F C LOURDES RUGBY|Lourdes
F C OLORON|Oloron
GRENADE SPORTS|Grenade
PARIS UNIVERSITE CLUB|Paris UC
R C AUXERROIS|Auxerre
R C CHATEAURENARD|Châteaurenard
R O CASTELNAUDARY|Castelnaudary
RUGBY CLUB DE COURBEVOIE|Courbevoie
RUGBY CLUB MEDITERRANEE PALAVAS|Palavas
RUGBY OLYMPIQUE AGATHOIS|Agde
S C MAZAMET|Mazamet
S C ROYANNAIS|Royan
SAINT GIRONS SPORTING CLUB|Saint-Girons
SOR AGOUT XV|Sor Agout
SPORTING CLUB LEUCATE CORBIERES MEDITERRANEE XV|Leucate
SPORTING CLUB TULLE CORREZE|Tulle
STADE BAGNERAIS|Bagnères-de-Bigorre
TOEC TOAC FCT RUGBY|Toulouse TT FCT
U ATH GUJAN MESTRAS|Gujan-Mestras
U S A LIMOGES|Limoges
U S ANNECY|Annecy
U S ISSOIRIENNE|Issoire
U S L ISLOISE RUGBY|L'Isle-Jourdain
U S MONTMELIANAISE|Montmélian
U S NAFARROA|Nafarroa
U S ST SULPICIENNE|Saint-Sulpice-sur-Lèze
U S TOURS|Tours
UNION ATHLETIQUE GAILLACOISE RUGBY|Gaillac
UNION BARBEZIEUX JONZAC|Barbezieux-Jonzac
XV CORSAIRE SAINT MALO RUGBY|Saint-Malo
XV DU COUDON|XV du Coudon
`);

const FEDERALE2 = parser(`
A AMICALE S SARCELLES|Sarcelles
A S MERIGNAC RUGBY|Mérignac
ANTONY METRO 92|Antony
ASV LAVAUR|Lavaur
AVENIR CASTANEEN|Castanet
AVIGNON LE PONTET RUGBY|Avignon/Le Pontet
BOUCAU TARNOS STADE|Boucau
BOURGES XV|Bourges
C A CASTELSARRASINOIS|Castelsarrasin
C A LORMONT HAUTS DE GARONNE|Lormont
C A ST RAPHAEL FREJUS|Saint-Raphaël/Fréjus
C R ILLKIRCH GRAFFENSTADEN|Illkirch
C S CLICHY|Clichy
C S M GENNEVILLOIS|Gennevilliers
C S NONTRONNAIS|Nontron
C S VILLEFRANCHE SUR SAONE|Villefranche-sur-Saône
CERCLE SPORTIF LEDONIEN|Lons-le-Saunier
COQ LEGUEVINOIS|Léguevin
CORBIERES XV|Corbières XV
EMAK HOR RUGBY ARCANGUES / BASSUSSARRY|Emak Hor
ENTENTE ARAMITS ASASP|Aramits
ETOILE SPORTIVE GIMONTOISE|Gimont
EVREUX A C RUGBY|Évreux
F C SAN CLAUDIEN|Saint-Claude
F C VILLEFRANCHE DE LAURAGAIS|Villefranche-de-Lauragais
F C Y RUGBY|La Roche-sur-Yon
G S FIGEACOIS|Figeac
GAN OLYMPIQUE|Gan
HASPARREN A C|Hasparren
JEUNESSE OLYMPIQUE PRADEENNE CONFLENT CANIGOU|Prades
LEVEZOU SEGALA AVEYRON XV|Levézou Ségala
LOMBEZ SAMATAN CLUB|Lombez
M LAFFITTE ST GERMAIN POISSY|Maisons-Laffitte SG
OURSBELILLE BORDERES RUGBY CLUB|Oursbelille
PLAISIR RUGBY CLUB|Plaisir
R C AMIENOIS|Amiens
R C ARPAJON VEINAZES|Arpajon Veinazès
R C PARIS 15|Paris XV
R C RILLIEUX|Rillieux
R C ROUBAIX|Roubaix
R C SABLAIS|Les Sables-d'Olonne
R C VERSAILLES|Versailles
R C VICHY|Vichy
R C VINCENNES|Vincennes
R OL GRASSE|Grasse
RACING CLUB DE LA SAUDRUNE|La Saudrune
RC CLERMONT COURNON D AUVERGNE|Clermont-Cournon
RION MORCENX CLUB RUGBY|Rion-Morcenx
RODEZ RUGBY|Rodez
RUGBY CLUB ANDREZIEUX BOUTHEON|Andrézieux-Bouthéon
RUGBY CLUB AUBAGNAIS|Aubagne
RUGBY CLUB DU PAYS DE MEAUX|Pays de Meaux
RUGBY CLUB LES ANGLES GARD RHODANIEN|Les Angles
RUGBY CLUB MONTESSON CHATOU|Montesson-Chatou
RUGBY CLUB RIOMOIS|Riom
RUGBY PAYS SAINT JEANNAIS|Saint-Jean
RUGBY TANGO CHALONNAIS|Chalon-sur-Saône
S C LE RHEU|Le Rheu
S C RIEUMOIS|Rieumes
S C U F|SCUF Paris
S M U C|Marseille SMUC
S O MILLAVOIS|Millau
SAINT PRIEST RUGBY|Saint-Priest
SALANQUE COTE RADIEUSE XV|Salanque
SERVIAN BOUJAN RUGBY|Servian-Boujan
SG C DECAZEVILLOIS|Decazeville
ST BEAUMONTOIS LOMAGNE RUGBY|Beaumont-de-Lomagne
STADE BELVESOIS|Belvès
STADE BORDELAIS|Stade Bordelais
STADE CAENNAIS RUGBY CLUB|Caen
STADE NAVARRAIS|Navarrenx
STADE OLYMPIQUE VOIRON|Voiron
STADE PISCENOIS|Pézenas
STADE UNION CAVAILLONNAIS|Cavaillon
U A SAVERDUNOISE|Saverdun
U A VERNOISE VERGT|Vergt
U MONTILIEN S DROME PROVENCAL|Montélimar
U S ARGELESIENNE|Argelès-Gazost
U S BAZADAISE|Bazas
U S CANTON D'ALBAN|Canton d'Alban
U S CASTILLONNAISE|Castillon
U S CAUSSADAISE|Caussade
U S COARRAZE NAY|Coarraze-Nay
U S MEYZIEU|Meyzieu
U S MORLANAISE RUGBY|Morlaàs
U S MOUGUERRE|Mouguerre
U S MUGRONNAISE|Mugron
U S RIS ORANGIS|Ris-Orangis
U S VINAY|Vinay
UNION SPORTIVE CASTELJALOUX|Casteljaloux
UNION SPORTIVE NANTUA HAUT BUGEY RUGBY|Nantua Haut-Bugey
US BERGERACOISE VALLEE DORDOGNE|Bergerac
US QUILLAN LIMOUX HAUTE VALLEE DE L'AUDE|Quillan-Limoux
USEP GER SERON BEDEIL|Ger-Séron
XV DE LA DOMBES|XV de la Dombes
`);

const FEDERALE3 = parser(`
A ATH NOGAROLIENNE|Nogaro
A C B B BOULOGNE BILLANCOURT|Boulogne-Billancourt
A S AMPUIS COTE ROTIE|Ampuis Côte-Rôtie
A S BAYONNAISE|AS Bayonne
A S FORGERON COMMENTRYENS|Commentry
A S OLONZAC MINERVOIS|Olonzac
A S ST MARCEL ISLE D'ABEAU|Saint-Marcel
A S TOURNEFEUILLE|Tournefeuille
ASSOCIATION COTE LANDES RUGBY|Côte Landes
AVENIR ATURIN|Aire-sur-Adour
AVENIR BIZANOS|Bizanos
AVENIR MOISSAGAIS|Moissac
BALMA OLYMPIQUE RUGBY CLUB|Balma
BASSIN DE CRUSSOL RUGBY|Bassin de Crussol
C A PONTARLIER|Pontarlier
C ATH ORSAY RUGBY CLUB|Orsay
C O LE PUY RUGBY|Le Puy-en-Velay
C O MULTISPORT BAGNEUX RUGBY|Bagneux
C R ANCIZES COMPS|Les Ancizes
C S BEAUNOIS|Beaune
C'CHARTRES RUGBY|Chartres
CAPBRETON HOSSEGOR RUGBY|Capbreton-Hossegor
CLAMART RUGBY 92|Clamart
CLERMONT U C AUBIERE RUGBY|Clermont UC Aubière
CLUB ATHLETIQUE BEDARIEUX GRAND ORB RUGBY|Bédarieux
CLUB OL CREUSOT BOURGOGNE|Le Creusot
CLUB OVALIE PONT DU CASSE|Pont-du-Casse
COQUELICOTS MONTECHOIS RUGBY|Montech
E S ARUDYENNE|Arudy
ENT CHATEAUNEUF ST MARCEL XV|Châteauneuf Saint-Marcel
ENT LA VALLEE DU GIROU|Vallée du Girou
ENT RUGBY MIELAN MIRANDE RABASTENS|Miélan-Mirande
ENTENTE R C C S BRETIGNY|Brétigny
ENTENTE VAULNAVEYS VIZILLE|Vaulnaveys/Vizille
ENTENTE VENDRES LESPIGNAN SAUVIAN XV|Vendres
ET SP ST SATURNIN LES AVIGNON|Saint-Saturnin
ETOILE SPORTIVE CATALANE|ES Catalane
F C AIX LES BAINS|Aix-les-Bains
F C TOURNON TAIN|Tournon-sur-Rhône
GRAND DOLE RUGBY|Grand Dole
GRETZ TOURNAN OZOIR RUGBY CENTRE 77|Tournan-en-Brie
HAVRE A C|Le Havre
INTHALATZ LARRESSORE|Larressore
J A ISLE RUGBY|JA Isle
JEUNESSE SPORTIVE ILLIBERIENNE / LATOUR / THEZA|Elne
LEOGNAN RUGBY|Léognan
LILLE RUGBY CLUB - IRIS 1924|Lille RC
MAGNOAC F C|Magnoac
MARSEILLE RUGBY MEDITERRANEE|Marseille RM
NANCY SEICHAMPS RUGBY|Nancy-Seichamps
OL OSSALOIS LARUNS|Laruns
OVALIE CLUB MONTLUCON|Montluçon
PARIS XO RUGBY|Paris XO
PAYS D'AURAY RUGBY CLUB|Pays d'Auray
PESSAC RUGBY|Pessac
PLOUZANE A C|Plouzané
R C BELLEVILLOIS|Belleville-en-Beaujolais
R C BON ENCONTRE BOE|Bon-Encontre
R C CONCARNOIS|Concarneau
R C DE LA VALLEE DU GAPEAU|Vallée du Gapeau
R C DIGNOIS|Digne-les-Bains
R C GRADIGNAN|Gradignan
R C GUERETOIS CREUSE|Guéret
R C ISSOUDUN|Issoudun
R C LUCCIANA|Lucciana
R C MANS|Le Mans
R C METZ MOSELLE|Metz
R C MONTCEAU BOURGOGNE|Montceau
R C MOTTERAIN|La Motte-Servolex
R C MUSSIDANAIS|Mussidan
R C ORLEANS LA SOURCE|Orléans La Source
R C PONT A MOUSSON|Pont-à-Mousson
R C QUIMPEROIS|Quimper
R C SEYSSINOIS|Seyssins
R C ST FLOUR|Saint-Flour
R C ST SEBASTIEN BSE GOULAINE|Saint-Sébastien
R C TEILLOIS|Le Teil
R C TRIGNACAIS|Trignac
R C VIRIAT|Viriat
R C YVETOTAIS|Yvetot
R O C GIFFOIS|Gif-sur-Yvette
RACING CLUB DE L AGGLOMERATION CERGY PONTOISE|Cergy-Pontoise
RACING CLUB SALVETAT PLAISANCE|La Salvetat-Plaisance
RACING CLUB ST CERNIN|Saint-Cernin
RIVESALTES BAIXAS ESPIRA AGLY XV|Rivesaltes
RUGBY AULNAY CLUB|Aulnay
RUGBY CLUB ARRAS|Arras
RUGBY CLUB BASSIN D ARCACHON|Arcachon
RUGBY CLUB BRETENOUX BIARS VAYRAC|Bretenoux
RUGBY CLUB BUGUOIS|Le Bugue
RUGBY CLUB DRAGUIGNAN|Draguignan
RUGBY CLUB DU LOUHANNAIS|Louhans
RUGBY CLUB HAGUENAU|Haguenau
RUGBY CLUB JACOU MONTPELLIER NORD|Jacou
RUGBY CLUB PUILBOREAU|Puilboreau
RUGBY CLUB SETE|Sète
RUGBY CLUB SUCY|Sucy-en-Brie
RUGBY CLUB VALLONS DE LA TOUR|Vallons de la Tour
RUGBY CLUB VILLENEUVE XV|Villeneuve-sur-Lot
RUGBY EPERNAY CHAMPAGNE|Épernay
RUGBY MELUN COMBS SENART 77|Melun
RUGBY SANCERROIS|Saint-Satur
RUGBY UNION DUNKERQUE LITTORAL|Dunkerque
RUGBY UNION PAYS DE LORIENT|Lorient
S A HAGETMAUTIEN|Hagetmau
S A PARTHENAISIEN|Parthenay
S A ROCHEFORT RUGBY|Rochefort
S A ST SEVERIN|Saint-Sever
S C BERNAY|Bernay
S C CHINONAIS|Chinon
S C SALONAIS|Salon-de-Provence
S C SURGERIEN|Surgères
S C TARARE|Tarare
SAINT NAZAIRE OVALIE|Saint-Nazaire
SAINT SAVIN SPORTIF|Saint-Savin
SCO RUGBY ANGERS|Angers
SPORT ATLH CLUB CLISSONNAIS|Clisson
SPORTING CLUB APPAMEEN|Pamiers
ST CERE RUGBY|Saint-Céré
ST JUERY ARTHES OL RUGBY|Saint-Juéry
ST MARCELLIN SPORT|Saint-Marcellin
ST PAUL SPORTS RUGBY|Saint-Paul-lès-Dax
STADE BLAYAIS RUGBY HT GIRONDE|Blaye
STADE DIJONNAIS|Dijon
STADE FOYEN|Sainte-Foy-la-Grande
STADE HENDAYAIS|Hendaye
STADE MONTCHANINOIS BOURGOGNE|Montchanin
STADE POITEVIN RUGBY|Poitiers
STADE PONTELLOIS|Pontault-Combault
STRASBOURG ALSACE RUGBY|Strasbourg
U A MIMIZANNAISE|Mimizan
U A TULLINS FURES|Tullins-Fures
U A VICOISE|Vic-Fezensac
U S ARGENTACOISE|Argentat
U S BEAUREPAIROISE|Beaurepaire
U S BELLEGARDE COUPY|Bellegarde
U S JOSBAIG|Josbaig
U S L'ISLOISE|L'Isle-en-Dodon
U S LALINDE|Lalinde
U S NERACAISE|Nérac
U S O MASSIF CENTRAL|USO Massif Central
U S PITHIVERIENNE|Pithiviers
U S RENAGE RIVES|Renage
U S SAINTES RUGBY|Saintes
U S ST PALAISIENNE|Saint-Palais
U S TARASCON XV|Tarascon
U S THUIRINOISE|Thuir
U S VALREASSIENNE RUGBY|Valréas
U S VENDOMOISE|Vendôme
UNION CAZERES LE FOUSSERET XV|Cazères
UNION SAINT ASTIER NEUVIC|Saint-Astier
UNION SPORTIVE DES COTEAUX POUYASTRUC|Pouyastruc
UNION SPORTIVE JUILLAC OBJAT|Juillac-Objat
UNION SPORTIVE VALLEE DU LOT 47|Vallée du Lot
UNION SPORTIVE VEORE XV|US Véore
UNION SPORTIVE VICQUOISE XV|Vic-en-Bigorre
XV ERDRE|XV de l'Erdre
`);

// ---------- FRANCE — divisions régionales (données fournies) ----------
// Les clubs de Régionale 1-2-3 viennent du fichier généré `amateurs.ts` : on
// n'a que leur nom et leur logo, la ville n'est pas dans la source.
function regionale(id: string): Club[] {
  return (CLUBS_REGIONAUX[id] ?? []).map((c) => {
    const { c1, c2 } = couleurs(c.nom);
    return { nom: c.nom, c1, c2, ...(c.logo ? { logo: c.logo } : {}) };
  });
}

// Divisions amateurs françaises : la base pro ne descend pas sous la Nationale,
// mais les effectifs et les logos amateurs couvrent tout jusqu'à la Régionale 3.
const AMATEURS: Competition[] = [
  { id: 'nationale2', nom: 'Nationale 2', pays: 'France', drapeaux: ['fr'], emoji: '🎖️', niveau: 4, zone: 'France', clubs: NATIONALE2 },
  { id: 'fed1', nom: 'Fédérale 1', pays: 'France', drapeaux: ['fr'], emoji: '🏉', niveau: 5, zone: 'France', clubs: FEDERALE1 },
  { id: 'fed2', nom: 'Fédérale 2', pays: 'France', drapeaux: ['fr'], emoji: '🏉', niveau: 6, zone: 'France', clubs: FEDERALE2 },
  { id: 'fed3', nom: 'Fédérale 3', pays: 'France', drapeaux: ['fr'], emoji: '🏉', niveau: 7, zone: 'France', clubs: FEDERALE3 },
  { id: 'reg1', nom: 'Régionale 1', pays: 'France', drapeaux: ['fr'], emoji: '🥉', niveau: 8, zone: 'France', clubs: regionale('reg1'), note: 'Le premier échelon régional : le vrai rugby du dimanche.' },
  { id: 'reg2', nom: 'Régionale 2', pays: 'France', drapeaux: ['fr'], emoji: '🥉', niveau: 9, zone: 'France', clubs: regionale('reg2') },
  { id: 'reg3', nom: 'Régionale 3', pays: 'France', drapeaux: ['fr'], emoji: '🥉', niveau: 10, zone: 'France', clubs: regionale('reg3'), note: 'Tout en bas de la pyramide — c\'est ici que naissent les légendes.' },
];

// ---------- LE RESTE DU MONDE (dossier « new league ») ----------
// 18 championnats et coupes de plus — Espagne, Italie, Géorgie, Irlande,
// Écosse, Galles, Pologne, Roumanie, Russie, Argentine, Portugal, Pays-Bas,
// Tchéquie, Finlande, Nouvelle-Zélande. Les clubs, leur hiérarchie et leurs
// écussons sont RÉELS ; leurs effectifs sont générés (les données ne
// fournissent aucun joueur) — voir `src/data/nouvellesLigues.ts`.
// ⚠️ LE DRAPEAU DU PAYS, À CÔTÉ DU NOM (retour de jeu : « manque les drapeaux
// sur les nouvelles ligues à côté des pays »). Les 18 championnats ajoutés
// arrivaient avec `drapeaux: []` : l'atlas affichait « Didi 10 — Géorgie » sans
// le moindre drapeau, là où le Top 14 en avait un. Le code vient de
// `data/nations.ts` — la même table que `<Drapeau>`, donc les nations
// britanniques ont bien leur drapeau propre (`gb-sct`, `gb-wls`, `gb-eng`).
function drapeauDuPays(pays: string): string[] {
  const code = CODE_PAR_NATION[pays];
  return code ? [code] : [];
}

const NOUVELLES: Competition[] = COMPETITIONS_NOUVELLES.map((c) => ({
  id: c.id,
  nom: c.nom,
  pays: c.pays,
  drapeaux: drapeauDuPays(c.pays),
  emoji: c.emoji,
  niveau: c.niveau,
  zone: 'Monde',
  clubs: c.clubs.map((cl) => ({
    nom: cl.nom,
    c1: cl.c1,
    c2: cl.c2,
    ...(cl.logo ? { logo: cl.logo } : {}),
  })),
}));

// Toutes les compétitions : les trois divisions professionnelles françaises et
// les championnats du monde viennent de la base réelle, le reste est saisi ici.
export const COMPETITIONS: Competition[] = [
  ...COMPETITIONS_REELLES.filter((c) => c.zone === 'France'),
  ...AMATEURS,
  ...COMPETITIONS_REELLES.filter((c) => c.zone === 'Monde'),
  ...NOUVELLES,
];

// Divisions françaises, de l'élite (indice 0) vers le bas de la pyramide.
export const DIVISIONS_FRANCE = COMPETITIONS.filter((c) => c.zone === 'France');
export const CLUBS_FRANCE_PAR_DIVISION = DIVISIONS_FRANCE;

// Retrouve la division française d'un club (par nom exact).
export function divisionDuClub(nomClub: string): Competition | undefined {
  return DIVISIONS_FRANCE.find((d) => d.clubs.some((c) => c.nom === nomClub));
}

// Idem, mais sans se limiter à la France (les clubs du monde ont eux aussi un
// effectif réel : Leinster, les Crusaders, Kubota…).
export function competitionDuClub(nomClub: string): Competition | undefined {
  return COMPETITIONS.find((d) => d.clubs.some((c) => c.nom === nomClub));
}

// Fiche d'un club (nom, ville, logo, couleurs), toutes compétitions confondues.
export function clubParNom(nomClub: string): Club | undefined {
  for (const comp of COMPETITIONS) {
    const trouve = comp.clubs.find((c) => c.nom === nomClub);
    if (trouve) return trouve;
  }
  return undefined;
}

// Niveau de jeu moyen d'une division (note générale des joueurs générés).
export const NOTE_PAR_NIVEAU: Record<number, number> = {
  0: 82, 1: 80, 2: 72, 3: 64, 4: 58, 5: 53, 6: 47, 7: 42,
  8: 38, 9: 34, 10: 30,
};
