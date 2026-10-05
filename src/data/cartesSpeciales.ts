// LES CARTES SPÉCIALES DE DÉPART — ICONS et Halloween 2026
//
// ⚠️ CE FICHIER N'EST QU'UNE GRAINE. Ce que le jeu utilise vraiment, c'est la
// fusion de ces lignes avec les réglages du Labo (`CatalogueAdmin.speciales`,
// en base) : GEN, COL, nation, club, poids, dates, image et publication s'y
// modifient sans toucher au code. Une carte ajoutée dans le Labo vit
// uniquement là-bas.
//
// ⚠️ ET AUCUNE CARTE N'EST PUBLIÉE ICI. Toutes partent en « image manquante » :
// une carte spéciale ne sort jamais d'un pack, n'apparaît jamais dans la
// collection et ne se voit jamais sur le marché tant que son image n'a pas été
// ajoutée PUIS sa publication activée dans le Labo.
//
// Le poste s'écrit comme sur une feuille de match : « 7 », « 11/14 » (le
// premier numéro est le poste principal, les suivants les postes secondaires).

/** [nom, numéros, nation, GEN] */
export type LigneIcon = readonly [string, string, string, number];

export const ICONS_DEPART: readonly LigneIcon[] = [
  // ── Très top tier — 96 à 97 ───────────────────────────────────────────────
  ['Richie McCaw', '7', 'Nouvelle-Zélande', 97],
  ['Dan Carter', '10', 'Nouvelle-Zélande', 97],
  ['Jonah Lomu', '11', 'Nouvelle-Zélande', 97],
  ['Gareth Edwards', '9', 'Pays de Galles', 97],
  ['Jonny Wilkinson', '10', 'Angleterre', 96],
  ['Brian O\'Driscoll', '13', 'Irlande', 96],
  ['Serge Blanco', '15', 'France', 96],
  ['John Eales', '5', 'Australie', 96],
  ['Philippe Sella', '13', 'France', 96],
  ['Joost van der Westhuizen', '9', 'Afrique du Sud', 96],
  // ── Élite — 94 à 95 ───────────────────────────────────────────────────────
  ['David Campese', '11/14', 'Australie', 95],
  ['Martin Johnson', '5', 'Angleterre', 95],
  ['Bryan Habana', '11', 'Afrique du Sud', 95],
  ['Sean Fitzpatrick', '2', 'Nouvelle-Zélande', 95],
  ['Thierry Dusautoir', '7', 'France', 95],
  ['Christian Cullen', '15', 'Nouvelle-Zélande', 95],
  ['Victor Matfield', '5', 'Afrique du Sud', 95],
  ['Fourie du Preez', '9', 'Afrique du Sud', 95],
  ['George Gregan', '9', 'Australie', 95],
  ['Stephen Larkham', '10', 'Australie', 95],
  ['Michael Lynagh', '10', 'Australie', 95],
  ['Kieran Read', '8', 'Nouvelle-Zélande', 95],
  ['Paul O\'Connell', '5', 'Irlande', 94],
  ['Sergio Parisse', '8', 'Italie', 94],
  ['Conrad Smith', '13', 'Nouvelle-Zélande', 94],
  ['Alun Wyn Jones', '5', 'Pays de Galles', 94],
  ['Sam Warburton', '7', 'Pays de Galles', 94],
  ['Shane Williams', '11', 'Pays de Galles', 94],
  ['Barry John', '10', 'Pays de Galles', 94],
  ['JPR Williams', '15', 'Pays de Galles', 94],
  // ── Très fortes légendes — 92 à 93 ────────────────────────────────────────
  ['Os du Randt', '1', 'Afrique du Sud', 93],
  ['John Smit', '2', 'Afrique du Sud', 93],
  ['Schalk Burger', '7', 'Afrique du Sud', 93],
  ['Bakkies Botha', '4', 'Afrique du Sud', 93],
  ['Jean de Villiers', '12/13', 'Afrique du Sud', 93],
  ['Francois Pienaar', '6/7', 'Afrique du Sud', 92],
  ['Percy Montgomery', '15', 'Afrique du Sud', 92],
  ['Joel Stransky', '10', 'Afrique du Sud', 92],
  ['Jason Robinson', '11/15', 'Angleterre', 93],
  ['Lawrence Dallaglio', '8', 'Angleterre', 93],
  ['Richard Hill', '6', 'Angleterre', 92],
  ['Jason Leonard', '1/3', 'Angleterre', 92],
  ['Jeremy Guscott', '13', 'Angleterre', 92],
  ['Rory Underwood', '11', 'Angleterre', 92],
  ['Will Greenwood', '12', 'Angleterre', 92],
  ['Keith Wood', '2', 'Irlande', 93],
  ['Ronan O\'Gara', '10', 'Irlande', 93],
  ['Johnny Sexton', '10', 'Irlande', 94],
  ['Willie John McBride', '5', 'Irlande', 92],
  ['Hugo Porta', '10', 'Argentine', 93],
  // ── Très bonnes légendes — 90 à 91 ────────────────────────────────────────
  ['Agustín Pichot', '9', 'Argentine', 91],
  ['Felipe Contepomi', '10/12', 'Argentine', 91],
  ['Juan Martín Hernández', '10/15', 'Argentine', 91],
  ['Diego Dominguez', '10', 'Italie', 90],
  ['Gavin Hastings', '15', 'Écosse', 91],
  ['Andy Irvine', '15', 'Écosse', 90],
  ['Tim Horan', '12', 'Australie', 92],
  ['Nick Farr-Jones', '9', 'Australie', 91],
  ['Mark Ella', '10', 'Australie', 91],
  ['Toutai Kefu', '8', 'Australie', 90],
  ['George Smith', '7', 'Australie', 91],
  ['Zinzan Brooke', '8', 'Nouvelle-Zélande', 93],
  ['Andrew Mehrtens', '10', 'Nouvelle-Zélande', 91],
  ['Buck Shelford', '8', 'Nouvelle-Zélande', 90],
  ['Keven Mealamu', '2', 'Nouvelle-Zélande', 90],
  ['Fabien Pelous', '5', 'France', 92],
  ['Christophe Dominici', '11', 'France', 92],
  ['Frédéric Michalak', '9/10', 'France', 91],
  ['Abdelatif Benazzi', '4/8', 'France', 91],
  ['Fabien Galthié', '9', 'France', 93],
  // ── Pool complémentaire — 88 à 90 ─────────────────────────────────────────
  ['Olivier Magne', '8', 'France', 90],
  ['Raphaël Ibañez', '2', 'France', 90],
  ['Thomas Castaignède', '10/15', 'France', 90],
  ['Yannick Jauzion', '12', 'France', 90],
  ['Vincent Clerc', '11/14', 'France', 89],
  ['Imanol Harinordoquy', '8', 'France', 90],
  ['Dimitri Yachvili', '9', 'France', 89],
  ['Jean-Pierre Rives', '7', 'France', 91],
  ['Walter Spanghero', '8', 'France', 89],
  ['Gareth Thomas', '14/15', 'Pays de Galles', 90],
  ['Phil Bennett', '10', 'Pays de Galles', 90],
  ['Gethin Jenkins', '1', 'Pays de Galles', 90],
  ['Scott Gibbs', '12', 'Pays de Galles', 89],
  ['Neil Jenkins', '10', 'Pays de Galles', 89],
  ['Chester Williams', '11', 'Afrique du Sud', 89],
  ['Naas Botha', '10', 'Afrique du Sud', 89],
  ['Tana Umaga', '12/13', 'Nouvelle-Zélande', 91],
  ['Doug Howlett', '11/14', 'Nouvelle-Zélande', 89],
  ['Mils Muliaina', '15', 'Nouvelle-Zélande', 90],
  ['Carlos Spencer', '10', 'Nouvelle-Zélande', 89],
  // ── Pool complémentaire 2 — 87 à 89 ───────────────────────────────────────
  ['Brian Lima', '12/13', 'Samoa', 89],
  ['Diego Ormaechea', '8', 'Uruguay', 87],
  ['Mamuka Gorgodze', '8', 'Géorgie', 88],
  ['David Pocock', '7', 'Australie', 92],
  ['Nathan Sharpe', '5', 'Australie', 88],
  ['Drew Mitchell', '11/14', 'Australie', 88],
  ['Lote Tuqiri', '11/14', 'Australie', 88],
  ['Jerry Collins', '6', 'Nouvelle-Zélande', 91],
  ['Jerome Kaino', '6/8', 'Nouvelle-Zélande', 91],
  ['Ma\'a Nonu', '12', 'Nouvelle-Zélande', 92],
];

/**
 * [nom, numéros, nation, GEN, rôle, identifiant du joueur actif dans le
 * catalogue mondial]. Le dernier champ n'existe que pour un joueur qui joue
 * encore : sa carte Halloween garde alors son club et son championnat, pour
 * compter normalement dans le collectif de ses coéquipiers.
 */
export type LigneHalloween = readonly [string, string, string, number, 'titulaire' | 'remplacant', string?];

/** La première équipe Halloween : un XV et son banc. D'autres lots s'ajoutent dans le Labo. */
export const HALLOWEEN_DEPART: readonly LigneHalloween[] = [
  ['Os du Randt', '1', 'Afrique du Sud', 88, 'titulaire'],
  ['Keith Wood', '2', 'Irlande', 88, 'titulaire'],
  ['Carl Hayman', '3', 'Nouvelle-Zélande', 87, 'titulaire'],
  ['Eben Etzebeth', '4', 'Afrique du Sud', 92, 'titulaire', 'reel:eben etzebeth'],
  ['Bakkies Botha', '5', 'Afrique du Sud', 91, 'titulaire'],
  ['Jerry Collins', '6', 'Nouvelle-Zélande', 91, 'titulaire'],
  ['Richie McCaw', '7', 'Nouvelle-Zélande', 92, 'titulaire'],
  ['Sébastien Chabal', '8', 'France', 90, 'titulaire'],
  ['Antoine Dupont', '9', 'France', 91, 'titulaire', 'reel:antoine dupont'],
  ['Jonny Wilkinson', '10', 'Angleterre', 90, 'titulaire'],
  ['Jonah Lomu', '11', 'Nouvelle-Zélande', 92, 'titulaire'],
  ['Ma\'a Nonu', '12', 'Nouvelle-Zélande', 90, 'titulaire'],
  ['Brian O\'Driscoll', '13', 'Irlande', 91, 'titulaire'],
  ['Bryan Habana', '14', 'Afrique du Sud', 90, 'titulaire'],
  ['Serge Blanco', '15', 'France', 89, 'titulaire'],
  ['Malcolm Marx', '2', 'Afrique du Sud', 88, 'remplacant', 'reel:malcolm marx'],
  ['Ox Nché', '1', 'Afrique du Sud', 87, 'remplacant', 'reel:ox nche'],
  ['Martin Castrogiovanni', '3', 'Italie', 86, 'remplacant'],
  ['Victor Matfield', '5', 'Afrique du Sud', 89, 'remplacant'],
  ['Schalk Burger', '7', 'Afrique du Sud', 89, 'remplacant'],
  ['Fabien Galthié', '9', 'France', 88, 'remplacant'],
  ['Dan Carter', '10', 'Nouvelle-Zélande', 91, 'remplacant'],
  ['Cheslin Kolbe', '14/15', 'Afrique du Sud', 89, 'remplacant', 'reel:cheslin kolbe'],
];
