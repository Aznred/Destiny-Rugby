// LES NOMS DE JOUEURS, PAYS PAR PAYS
//
// Les nouvelles ligues (Géorgie, Pologne, Finlande, Roumanie…) n'ont pas
// d'effectif dans les données : il faut les peupler. Un effectif crédible
// commence par des NOMS crédibles — un club de Didi 10 s'appelle Batumi, ses
// joueurs s'appellent Giorgi Chkhaidze, pas Léo Etcheverry.
//
// ⚠️ Chaque pays a son pool. Et parce qu'aucun championnat n'est monoculturel
// (demande explicite : « mets quelques internationaux aussi pour la mixité »),
// le générateur tire une part d'ÉTRANGERS dans les pools des autres pays — avec
// une préférence pour les nations qui exportent vraiment des joueurs (Fidji,
// Tonga, Samoa, Argentine, Afrique du Sud, Nouvelle-Zélande, Géorgie).

const NOMS = {
  France: {
    prenoms: ['Antoine', 'Baptiste', 'Clément', 'Théo', 'Maxime', 'Julien', 'Romain', 'Lucas', 'Hugo', 'Mathieu', 'Pierre', 'Nicolas', 'Yann', 'Grégoire'],
    noms: ['Dupont', 'Lefèvre', 'Marchand', 'Barrière', 'Cazaux', 'Etcheverry', 'Lascombes', 'Verdier', 'Bonnefoy', 'Deniaud', 'Sarrat', 'Pouzet', 'Lamothe', 'Vergne', 'Castagnet', 'Bourdin'],
  },
  Angleterre: {
    prenoms: ['Harry', 'Jack', 'Oliver', 'George', 'Charlie', 'Thomas', 'Alfie', 'Freddie', 'Sam', 'Ben', 'Will', 'Joe'],
    noms: ['Smith', 'Taylor', 'Wilson', 'Hughes', 'Baxter', 'Whitmore', 'Ashworth', 'Radcliffe', 'Ellery', 'Pemberton', 'Hartley', 'Rowntree', 'Stapleton', 'Ackroyd'],
  },
  Écosse: {
    prenoms: ['Callum', 'Rory', 'Angus', 'Fraser', 'Hamish', 'Struan', 'Ewan', 'Duncan', 'Blair', 'Innes', 'Murray', 'Lachlan'],
    noms: ['MacGregor', 'Fergusson', 'Cunningham', 'Ritchie', 'Kinnaird', 'Douglas', 'Lamont', 'Sutherland', 'Menzies', 'Bannerman', 'Strachan', 'Lindsay', 'Ogilvie', 'Cairney'],
  },
  'Pays de Galles': {
    prenoms: ['Rhys', 'Dafydd', 'Gareth', 'Osian', 'Ioan', 'Owain', 'Cerian', 'Morgan', 'Huw', 'Iestyn', 'Tomos', 'Geraint'],
    noms: ['Llewellyn', 'Prichard', 'Vaughan', 'Meredith', 'Bevan', 'Pugh', 'Cadwaladr', 'Gwilym', 'Maddocks', 'Trefor', 'Hopkin', 'Rhydderch', 'Emlyn', 'Caradog'],
  },
  Irlande: {
    prenoms: ['Cian', 'Oisín', 'Fionn', 'Darragh', 'Eoin', 'Conor', 'Ruairí', 'Tadhg', 'Ciarán', 'Seán', 'Diarmuid', 'Cormac'],
    noms: ['O’Sullivan', 'McCarthy', 'Fitzgerald', 'Doherty', 'Kavanagh', 'O’Rourke', 'Gallagher', 'Brennan', 'Malone', 'Sheridan', 'Cassidy', 'Hegarty', 'Delaney', 'Mulligan'],
  },
  Italie: {
    prenoms: ['Lorenzo', 'Matteo', 'Alessandro', 'Federico', 'Riccardo', 'Tommaso', 'Andrea', 'Nicolò', 'Marco', 'Giacomo', 'Davide', 'Pietro'],
    noms: ['Ferrari', 'Bellini', 'Zanetti', 'Moretti', 'Sartori', 'Lombardi', 'Fabbri', 'Guarnieri', 'Bortolussi', 'Cannone', 'Vaccari', 'Riccioni', 'Menoncello', 'Trevisan'],
  },
  Espagne: {
    prenoms: ['Javier', 'Álvaro', 'Sergio', 'Iker', 'Mateo', 'Diego', 'Pablo', 'Gonzalo', 'Manuel', 'Rubén', 'Íñigo', 'Adrián'],
    noms: ['García', 'Fernández', 'Domínguez', 'Zabala', 'Uriarte', 'Cabello', 'Bartolomé', 'Ordóñez', 'Villarreal', 'Aguirre', 'Vicente', 'Bautista', 'Peñalver', 'Marín'],
  },
  Portugal: {
    prenoms: ['João', 'Tomás', 'Rodrigo', 'Duarte', 'Vasco', 'Manuel', 'Francisco', 'Diogo', 'Martim', 'Afonso', 'Gonçalo', 'Nuno'],
    noms: ['Silva', 'Appleton', 'Cardoso', 'Almeida', 'Bettencourt', 'Aguilar', 'Simões', 'Moreira', 'Costa', 'Sequeira', 'Pinto', 'Rebelo', 'Camacho', 'Fonseca'],
  },
  Géorgie: {
    prenoms: ['Giorgi', 'Levan', 'Nika', 'Beka', 'Luka', 'Vakhtang', 'Irakli', 'Davit', 'Sandro', 'Tornike', 'Guram', 'Mikheil'],
    noms: ['Gorgadze', 'Chkhaidze', 'Kvirikashvili', 'Tsutskiridze', 'Abashidze', 'Lomidze', 'Beridze', 'Kapanadze', 'Tabidze', 'Nemsadze', 'Jgenti', 'Aptsiauri', 'Melikidze', 'Zhgenti'],
  },
  Roumanie: {
    prenoms: ['Andrei', 'Mihai', 'Cristian', 'Vlad', 'Ionuț', 'Alexandru', 'Florin', 'Bogdan', 'Ștefan', 'Marius', 'Răzvan', 'Daniel'],
    noms: ['Popescu', 'Ionescu', 'Rădulescu', 'Constantin', 'Vlaicu', 'Ursache', 'Bălan', 'Mureșan', 'Coșerea', 'Iftimiciuc', 'Dumitru', 'Neagu', 'Stoica', 'Tănase'],
  },
  Russie: {
    prenoms: ['Ivan', 'Dmitri', 'Andrey', 'Nikita', 'Sergey', 'Maxim', 'Aleksey', 'Kirill', 'Roman', 'Artyom', 'Yegor', 'Vladislav'],
    noms: ['Ivanov', 'Sokolov', 'Kuznetsov', 'Morozov', 'Gaisin', 'Ostrikov', 'Yanyushkin', 'Sychev', 'Khrokin', 'Fedotko', 'Gerasimov', 'Zykov', 'Lyskov', 'Bulgakov'],
  },
  Pologne: {
    prenoms: ['Jakub', 'Bartosz', 'Kacper', 'Michał', 'Szymon', 'Mateusz', 'Wojciech', 'Piotr', 'Krzysztof', 'Adam', 'Tomasz', 'Paweł'],
    noms: ['Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Zieliński', 'Szymański', 'Dąbrowski', 'Lewandowski', 'Ostrowski', 'Malinowski', 'Baran', 'Sikora', 'Adamczyk'],
  },
  'République tchèque': {
    prenoms: ['Jakub', 'Tomáš', 'Ondřej', 'Vojtěch', 'Matěj', 'Adam', 'Filip', 'Lukáš', 'Petr', 'Martin', 'David', 'Jan'],
    noms: ['Novák', 'Svoboda', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Marek', 'Pospíšil', 'Král', 'Beneš', 'Vlček', 'Sedláček'],
  },
  Finlande: {
    prenoms: ['Eetu', 'Onni', 'Väinö', 'Aleksi', 'Mikael', 'Joonas', 'Elias', 'Otto', 'Leevi', 'Rasmus', 'Niilo', 'Toivo'],
    noms: ['Virtanen', 'Korhonen', 'Mäkinen', 'Nieminen', 'Hämäläinen', 'Laine', 'Heikkilä', 'Koskinen', 'Salminen', 'Rantanen', 'Lehtonen', 'Aalto', 'Jokinen', 'Väisänen'],
  },
  'Pays-Bas': {
    prenoms: ['Daan', 'Sem', 'Bram', 'Lucas', 'Sven', 'Jesse', 'Thijs', 'Ruben', 'Milan', 'Stijn', 'Joost', 'Bas'],
    noms: ['de Vries', 'van Dijk', 'Bakker', 'Janssen', 'Visser', 'Meijer', 'Kuiper', 'Hoekstra', 'van Leeuwen', 'Timmermans', 'Vermeulen', 'de Groot', 'Willemse', 'Brouwer'],
  },
  Argentine: {
    prenoms: ['Santiago', 'Juan', 'Facundo', 'Tomás', 'Agustín', 'Ignacio', 'Matías', 'Julián', 'Bautista', 'Franco', 'Lucio', 'Joaquín'],
    noms: ['Fernández', 'Gómez', 'Sánchez', 'Isa', 'Carreras', 'Mallía', 'Bertranou', 'Chocobares', 'Petti', 'Kremer', 'Molina', 'Boffelli', 'Cubelli', 'Delguy'],
  },
  'Nouvelle-Zélande': {
    prenoms: ['Tane', 'Kade', 'Josh', 'Ryan', 'Tyrel', 'Braydon', 'Cullen', 'Riley', 'Manaia', 'Hoskins', 'Ethan', 'Kaleb'],
    noms: ['Ngatai', 'Tuipulotu', 'Havili', 'Papali’i', 'Whitelock', 'Barrett', 'Kirifi', 'Taukei’aho', 'Reihana', 'Fainga’anuku', 'Sotutu', 'Perofeta', 'Rātima', 'Lienert-Brown'],
  },
  Australie: {
    prenoms: ['Jake', 'Lachlan', 'Harry', 'Angus', 'Tate', 'Fraser', 'Nick', 'Corey', 'Darcy', 'Hunter', 'Josh', 'Ben'],
    noms: ['Wilson', 'McReight', 'Gordon', 'Paisami', 'Daugunu', 'Nasser', 'Frost', 'Slipper', 'Bell', 'Kellaway', 'Ikitau', 'Tupou', 'Hooper', 'Petaia'],
  },
  'Afrique du Sud': {
    prenoms: ['Pieter', 'Johan', 'Ruan', 'Jaco', 'Wian', 'Stefan', 'Marnus', 'Hanro', 'Wilco', 'Dewald', 'Gerhard', 'Andre'],
    noms: ['van der Merwe', 'du Plessis', 'Botha', 'Kriel', 'Steenkamp', 'Venter', 'Nel', 'Coetzee', 'Louw', 'Snyman', 'Fourie', 'Jantjies', 'Mostert', 'Wiese'],
  },
  Fidji: {
    prenoms: ['Semi', 'Josua', 'Waisea', 'Api', 'Levani', 'Sireli', 'Vilimoni', 'Eroni', 'Peni', 'Mesake', 'Jiuta', 'Ratu'],
    noms: ['Radradra', 'Tuisova', 'Nayacalevu', 'Ratuniyarawa', 'Botia', 'Masiwini', 'Botitu', 'Mawi', 'Ravouvou', 'Doge', 'Wainiqolo', 'Tagitagivalu'],
  },
  Tonga: {
    prenoms: ['Sione', 'Vaea', 'Tevita', 'Malakai', 'Solomone', 'Sam', 'Otumaka', 'Paula', 'Fine', 'Ben', 'Hosea', 'Fetuli'],
    noms: ['Vailanu', 'Fifita', 'Kalamafoni', 'Halaifonua', 'Ma’afu', 'Tu’ipulotu', 'Lokotui', 'Fakatava', 'Latu', 'Havili', 'Tupou', 'Piutau'],
  },
  Samoa: {
    prenoms: ['Alapati', 'Theo', 'Fritz', 'Duncan', 'Danny', 'Michael', 'Tumua', 'Neria', 'Seilala', 'Ray', 'Jonathan', 'Sama'],
    noms: ['Leiua', 'McFarland', 'Lee-Lo', 'Paia’aua', 'Tusitala', 'Alaalatoa', 'Manu', 'Fotuali’i', 'Lam', 'Taefu', 'Matavao', 'Slade'],
  },
};

// Les nations qui exportent vraiment des joueurs vers les championnats
// européens et océaniens. Le poids est la fréquence relative.
const ETRANGERS = [
  ['Fidji', 4], ['Tonga', 3], ['Samoa', 3], ['Argentine', 4], ['Afrique du Sud', 5],
  ['Nouvelle-Zélande', 4], ['Australie', 3], ['Géorgie', 3], ['France', 3],
  ['Angleterre', 3], ['Roumanie', 2], ['Espagne', 2], ['Italie', 2],
  ['Pays de Galles', 2], ['Irlande', 2], ['Écosse', 2], ['Portugal', 1],
];

module.exports = { NOMS, ETRANGERS };
