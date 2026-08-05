// Table des championnats couverts par la base réelle (base_rugby_finale.json
// + tous_les_classements.json). C'est LA source de vérité pour :
//   • le nom du club dans le jeu (les fichiers de données utilisent des noms
//     courts : « Toulouse », « Bath »…) ;
//   • sa ville et son logo (public/logos/<slug>.png, slug dérivé du nom court) ;
//   • l'échelle de notes de la division (note du meilleur / du dernier club).
// `srcLigue` = nom exact de la ligue dans les JSON.
// `echelle`  = [note du dernier, note du premier] du championnat.

const LIGUES = [
  {
    id: 'top14', nom: 'Top 14', pays: 'France', drapeaux: ['fr'], emoji: '🥇',
    niveau: 1, zone: 'France', srcLigue: 'Top 14', echelle: [67, 86],
    clubs: [
      ['Toulouse', 'Stade Toulousain', 'Toulouse'],
      ['Bordeaux', 'Union Bordeaux Bègles', 'Bordeaux'],
      ['La Rochelle', 'Stade Rochelais', 'La Rochelle'],
      ['Paris', 'Stade Français Paris', 'Paris'],
      ['Racing 92', 'Racing 92', 'Nanterre'],
      ['Toulon', 'RC Toulon', 'Toulon'],
      ['Castres', 'Castres Olympique', 'Castres'],
      ['Clermont', 'ASM Clermont Auvergne', 'Clermont-Ferrand'],
      ['Pau', 'Section Paloise', 'Pau'],
      ['Perpignan', 'USA Perpignan', 'Perpignan'],
      ['Lyon', 'Lyon OU', 'Lyon'],
      ['Montpellier', 'Montpellier HR', 'Montpellier'],
      ['Bayonne', 'Aviron Bayonnais', 'Bayonne'],
      ['Vannes', 'RC Vannes', 'Vannes'],
    ],
  },
  {
    id: 'prod2', nom: 'Pro D2', pays: 'France', drapeaux: ['fr'], emoji: '🥈',
    niveau: 2, zone: 'France', srcLigue: 'Pro D2', echelle: [58, 72],
    clubs: [
      ['Montauban', 'US Montauban', 'Montauban'],
      ['Colomiers', 'US Colomiers', 'Colomiers'],
      ['Aix', 'Provence Rugby', 'Aix-en-Provence'],
      ['Oyonnax', 'US Oyonnax', 'Oyonnax'],
      ['Valence Romans', 'Valence Romans Drôme Rugby', 'Valence/Romans'],
      ['Brive', 'CA Brive', 'Brive-la-Gaillarde'],
      ['Agen', 'SU Agen', 'Agen'],
      ['Grenoble', 'FC Grenoble', 'Grenoble'],
      ['Soyaux-Angoulême', 'Soyaux Angoulême XV', 'Angoulême'],
      ['Biarritz', 'Biarritz Olympique', 'Biarritz'],
      ['Dax', 'US Dax', 'Dax'],
      ['Béziers', 'AS Béziers Hérault', 'Béziers'],
      ['Nevers', 'USON Nevers', 'Nevers'],
      ['Aurillac', 'Stade Aurillacois', 'Aurillac'],
      ['Nice', 'Stade Niçois', 'Nice'],
      ['Narbonne', 'RC Narbonne', 'Narbonne'],
    ],
  },
  {
    id: 'nationale', nom: 'Nationale', pays: 'France', drapeaux: ['fr'], emoji: '🥉',
    niveau: 3, zone: 'France', srcLigue: 'Nationale', echelle: [51, 63],
    clubs: [
      ['Albi', 'SC Albi', 'Albi'],
      ['Mont-de-Marsan', 'Stade Montois', 'Mont-de-Marsan'],
      ['Chambéry', 'SO Chambérien Rugby', 'Chambéry'],
      ['Carcassonne', 'US Carcassonnaise', 'Carcassonne'],
      ['Massy', 'RC Massy Essonne', 'Massy'],
      ['Périgueux', 'CA Périgourdin', 'Périgueux'],
      ['Suresnes', 'RC Suresnes Hauts-de-Seine', 'Suresnes'],
      ['Bourgoin', 'CS Bourgoin-Jallieu', 'Bourgoin-Jallieu'],
      ['Bourg-en-Bresse', 'US Bressane', 'Bourg-en-Bresse'],
      ['Rennes', 'Rennes Étudiants Club', 'Rennes'],
      ['Rouen', 'Rouen Normandie Rugby', 'Rouen'],
      ['Marcq-en-Baroeul', 'Olympique Marcquois Rugby', 'Marcq-en-Barœul'],
      ['Niort', 'Niort Rugby Club', 'Niort'],
      ['Tarbes', 'Stado Tarbes Pyrénées Rugby', 'Tarbes'],
    ],
  },
  {
    id: 'premiership', nom: 'Gallagher Premiership', pays: 'Angleterre',
    drapeaux: ['gb-eng'], emoji: '🌍', niveau: 0, zone: 'Monde',
    srcLigue: 'Premiership', echelle: [67, 84],
    clubs: [
      ['Northampton', 'Northampton Saints', 'Northampton'],
      ['Bath', 'Bath Rugby', 'Bath'],
      ['Leicester', 'Leicester Tigers', 'Leicester'],
      ['Exeter', 'Exeter Chiefs', 'Exeter'],
      ['Saracens', 'Saracens', 'Londres'],
      ['Bristol', 'Bristol Bears', 'Bristol'],
      ['Sale', 'Sale Sharks', 'Manchester'],
      ['Gloucester', 'Gloucester Rugby', 'Gloucester'],
      ['Harlequins', 'Harlequins', 'Londres'],
      ['Newcastle', 'Newcastle Red Bulls', 'Newcastle'],
    ],
  },
  {
    id: 'championship', nom: 'RFU Championship', pays: 'Angleterre',
    drapeaux: ['gb-eng'], emoji: '🌍', niveau: 0, zone: 'Monde',
    srcLigue: 'Champ Rugby', echelle: [54, 66],
    clubs: [
      ['Ealing Trailfinders', 'Ealing Trailfinders', 'Londres'],
      ['Bedford', 'Bedford Blues', 'Bedford'],
      ['Coventry', 'Coventry', 'Coventry'],
      ['Worcester', 'Worcester Warriors', 'Worcester'],
      ['Chinnor', 'Chinnor', 'Chinnor'],
      ['Hartpury RFC', 'Hartpury', 'Gloucester'],
      ['Cornish Pirates', 'Cornish Pirates', 'Penzance'],
      ['Nottingham', 'Nottingham', 'Nottingham'],
      ['Doncaster', 'Doncaster Knights', 'Doncaster'],
      ['Ampthill', 'Ampthill', 'Ampthill'],
      ['Caldy', 'Caldy', 'Wirral'],
      ['Richmond', 'Richmond', 'Londres'],
      ['London Scottish', 'London Scottish', 'Londres'],
      ['Cambridge', 'Cambridge', 'Cambridge'],
    ],
  },
  {
    id: 'urc', nom: 'United Rugby Championship', pays: 'IRL/GAL/ÉCO/ITA/RSA',
    drapeaux: ['ie', 'gb-wls', 'gb-sct', 'it', 'za'], emoji: '🌍', niveau: 0,
    zone: 'Monde', srcLigue: 'URC', echelle: [66, 85],
    clubs: [
      ['Glasgow', 'Glasgow Warriors', 'Glasgow'],
      ['Stormers', 'DHL Stormers', 'Le Cap'],
      ['Leinster', 'Leinster', 'Dublin'],
      ['Bulls', 'Vodacom Bulls', 'Pretoria'],
      ['Lions', 'Emirates Lions', 'Johannesburg'],
      ['Munster', 'Munster', 'Limerick'],
      ['Cardiff', 'Cardiff Rugby', 'Cardiff'],
      ['Ulster', 'Ulster', 'Belfast'],
      ['Connacht', 'Connacht', 'Galway'],
      ['Sharks', 'Hollywoodbets Sharks', 'Durban'],
      ['Ospreys', 'Ospreys', 'Swansea'],
      ['Edimbourg', 'Édimbourg Rugby', 'Édimbourg'],
      ['Trévise', 'Benetton Trévise', 'Trévise'],
      ['Scarlets', 'Scarlets', 'Llanelli'],
      ['Dragons', 'Dragons RFC', 'Newport'],
      ['Zebre', 'Zebre Parme', 'Parme'],
    ],
  },
  {
    id: 'super', nom: 'Super Rugby Pacific', pays: 'Pacifique',
    drapeaux: ['nz', 'au', 'fj'], emoji: '🌏', niveau: 0, zone: 'Monde',
    srcLigue: 'Super Rugby', echelle: [67, 84],
    clubs: [
      ['Hurricanes', 'Hurricanes', 'Wellington'],
      ['Chiefs', 'Chiefs', 'Hamilton'],
      ['Blues', 'Blues', 'Auckland'],
      ['Crusaders', 'Crusaders', 'Christchurch'],
      ['Brumbies', 'ACT Brumbies', 'Canberra'],
      ['Reds', 'Queensland Reds', 'Brisbane'],
      ['Waratahs', 'NSW Waratahs', 'Sydney'],
      ['Western Force', 'Western Force', 'Perth'],
      ['Highlanders', 'Highlanders', 'Dunedin'],
      ['Fijian Drua', 'Fijian Drua', 'Lautoka'],
      ['Moana Pasifika', 'Moana Pasifika', 'Auckland'],
    ],
  },
  {
    id: 'npc', nom: 'Bunnings NPC', pays: 'Nouvelle-Zélande', drapeaux: ['nz'],
    emoji: '🌏', niveau: 0, zone: 'Monde', srcLigue: 'NPC', echelle: [60, 71],
    clubs: [
      ['Waikato', 'Waikato', 'Hamilton'],
      ['Bay of Plenty', 'Bay of Plenty', 'Tauranga'],
      ['Auckland', 'Auckland', 'Auckland'],
      ['Canterbury', 'Canterbury', 'Christchurch'],
      ['Counties Manukau', 'Counties Manukau', 'Pukekohe'],
      ["Hawke's Bay", "Hawke's Bay", 'Napier'],
      ['Manawatu', 'Manawatū', 'Palmerston North'],
      ['North Harbour', 'North Harbour', 'Albany'],
      ['Northland', 'Northland', 'Whangārei'],
      ['Otago', 'Otago', 'Dunedin'],
      ['Southland', 'Southland', 'Invercargill'],
      ['Taranaki', 'Taranaki', 'New Plymouth'],
      ['Tasman', 'Tasman', 'Nelson'],
      ['Wellington', 'Wellington', 'Wellington'],
    ],
  },
  {
    id: 'japon1', nom: 'Japan Rugby League One — D1', pays: 'Japon',
    drapeaux: ['jp'], emoji: '🌏', niveau: 0, zone: 'Monde',
    srcLigue: 'League One D1', echelle: [64, 80],
    clubs: [
      ['Kobelco Steelers', 'Kobelco Kobe Steelers', 'Kobe'],
      ['Wild Knights', 'Saitama Wild Knights', 'Kumagaya'],
      ['Kubota Spears', 'Kubota Spears', 'Funabashi'],
      ['Tokyo Sungoliath', 'Tokyo Sungoliath', 'Fuchū'],
      ['BlackRams Tokyo', 'BlackRams Tokyo', 'Tokyo'],
      ['Brave Lupus', 'Toshiba Brave Lupus', 'Fuchū'],
      ['Toyota Verblitz', 'Toyota Verblitz', 'Toyota'],
      ['Shizuoka Blue Revs', 'Shizuoka Blue Revs', 'Shizuoka'],
      ['Canon Eagles', 'Yokohama Canon Eagles', 'Yokohama'],
      ['Mie Honda Heat', 'Mie Honda Heat', 'Suzuka'],
      ['Sagamihara', 'Sagamihara Dynaboars', 'Sagamihara'],
      ['Urayasu', 'Urayasu D-Rocks', 'Urayasu'],
    ],
  },
  {
    id: 'japon2', nom: 'Japan Rugby League One — D2', pays: 'Japon',
    drapeaux: ['jp'], emoji: '🌏', niveau: 0, zone: 'Monde',
    srcLigue: 'League One D2', echelle: [55, 65],
    clubs: [
      ['Toyota Industries Shuttles', 'Toyota Industries Shuttles', 'Kariya'],
      ['Kintetsu Liners', 'Kintetsu Liners', 'Osaka'],
      ['Shimizu Blue Sharks', 'Shimizu Blue Sharks', 'Tokyo'],
      ['Green Rockets Tokatsu', 'Green Rockets Tokatsu', 'Kashiwa'],
      ['Red Hurricanes', 'Red Hurricanes Osaka', 'Osaka'],
      ['Kyuden Voltex', 'Kyuden Voltex', 'Fukuoka'],
      ['Kamaishi', 'Kamaishi Seawaves', 'Kamaishi'],
      ['Hino Red Dolphins', 'Hino Red Dolphins', 'Hino'],
    ],
  },
  {
    id: 'japon3', nom: 'Japan Rugby League One — D3', pays: 'Japon',
    drapeaux: ['jp'], emoji: '🌏', niveau: 0, zone: 'Monde',
    srcLigue: 'League One D3', echelle: [47, 57],
    clubs: [
      ['Hiroshima', 'Hiroshima Dragonflies', 'Hiroshima'],
      ['Sayama Rugguts', 'Sayama Rugguts', 'Sayama'],
      ['Kurita Water Gush', 'Kurita Water Gush', 'Akishima'],
      ['LeRIRO Fukuoka', 'LeRIRO Fukuoka', 'Fukuoka'],
      ['Chugoku Red Regulions', 'Chugoku Red Regulions', 'Kure'],
      ['Yakult Levins Toda', 'Yakult Levins Toda', 'Toda'],
    ],
  },
  {
    id: 'mlr', nom: 'Major League Rugby', pays: 'États-Unis', drapeaux: ['us'],
    emoji: '🌎', niveau: 0, zone: 'Monde', srcLigue: 'MLR', echelle: [54, 66],
    clubs: [
      ['Chicago Hounds', 'Chicago Hounds', 'Chicago'],
      ['California Legion', 'California Legion', 'San Diego'],
      ['Seattle', 'Seattle Seawolves', 'Seattle'],
      ['Old Glory DC', 'Old Glory DC', 'Washington'],
      ['New England', 'New England Free Jacks', 'Boston'],
      ['Anthem RC', 'Anthem Rugby Carolina', 'Charlotte'],
    ],
  },
  {
    // Deux invités de Challenge Cup qui n'ont pas de championnat dans la base.
    id: 'invitesEurope', nom: 'Autres clubs européens', pays: 'Géorgie / Afrique du Sud',
    drapeaux: ['ge', 'za'], emoji: '🌍', niveau: 0, zone: 'Monde',
    srcLigue: null, echelle: [62, 66],
    note: 'Engagés en Challenge Cup sans championnat renseigné dans la base.',
    // 4e valeur = note imposée (ces deux clubs n'ont pas de classement).
    // ⚠️ « TOYOTA CHEETAHS », PAS « FREE STATE CHEETAHS ». Les deux existent
    // vraiment et ne sont PAS la même équipe : la FRANCHISE professionnelle
    // (Toyota Cheetahs) dispute les coupes d'Europe — c'est elle qu'on trouve
    // ici, avec son effectif réel — tandis que l'UNION (Free State Cheetahs)
    // joue la Currie Cup, où elle est déclarée dans `nouvellesLigues.cjs`. Les
    // deux noms étaient inversés : le club de coupe d'Europe portait le nom de
    // l'équipe de Currie Cup, et réciproquement.
    clubs: [
      ['Black Lion', 'Black Lion', 'Tbilissi', 63],
      ['Cheetahs', 'Toyota Cheetahs', 'Bloemfontein', 66],
    ],
  },
];

// Coupes d'Europe : pas de championnat propre, les clubs viennent des ligues
// ci-dessus. On ne s'en sert que pour l'affichage (classement de poule).
const COUPES = [
  {
    id: 'championsCup', nom: 'Investec Champions Cup', pays: 'Europe',
    drapeaux: ['eu'], emoji: '⭐', srcLigue: 'Champions Cup',
    desc: "L'élite européenne : 24 clubs, une seule coupe aux grandes oreilles.",
  },
  {
    id: 'challengeCup', nom: 'EPCR Challenge Cup', pays: 'Europe',
    drapeaux: ['eu'], emoji: '🌟', srcLigue: 'Challenge Cup',
    desc: 'La deuxième coupe européenne, tremplin vers la Champions Cup.',
  },
  {
    id: 'premCup', nom: 'Premiership Rugby Cup', pays: 'Angleterre',
    drapeaux: ['gb-eng'], emoji: '🏆', srcLigue: 'Prem. Rugby Cup',
    desc: 'La coupe anglaise, terrain de jeu des jeunes des académies.',
  },
];

// Compétitions internationales (classements uniquement — pas d'effectifs).
const INTERNATIONALES = [
  { id: 'sixNations', nom: 'Tournoi des 6 Nations', emoji: '🏆', srcLigue: '6 Nations', desc: 'Le tournoi le plus vieux du monde, six nations, cinq week-ends.' },
  { id: 'nationsChampionship', nom: 'Nations Championship', emoji: '🌐', srcLigue: 'Nations Championship', desc: 'Le nouveau championnat mondial des nations.' },
  { id: 'autumn', nom: 'Autumn Nations Series', emoji: '🍂', srcLigue: 'Autumn Nations Series', desc: "La tournée d'automne : l'hémisphère sud débarque en Europe." },
  { id: 'testMatchs', nom: 'Test-matchs', emoji: '⚔️', srcLigue: 'Test Matchs', desc: 'Tous les autres matchs internationaux de la saison.' },
  { id: 'nationsCup', nom: 'Nations Cup', emoji: '🥉', srcLigue: 'Nations Cup', desc: 'La compétition des nations en développement.' },
  { id: 'rec', nom: 'Rugby Europe Championship', emoji: '🇪🇺', srcLigue: 'REC', desc: "Le « 6 Nations B » : le championnat d'Europe des nations." },
  { id: 'qualifCdm', nom: 'Qualifications Coupe du monde 2027', emoji: '🎟️', srcLigue: 'Qualification CDM 2027', desc: 'La course aux derniers billets pour l’Australie.' },
  { id: 'sixNationsU20', nom: '6 Nations U20', emoji: '🌱', srcLigue: '6 Nations U20', desc: 'Le tournoi des espoirs européens.' },
  { id: 'mondialU20', nom: 'Championnat du monde U20', emoji: '🌍', srcLigue: 'Mondial U20', desc: 'Le rendez-vous mondial des moins de 20 ans.' },
  { id: 'trcU20', nom: 'The Rugby Championship U20', emoji: '🌏', srcLigue: 'TRC U20', desc: "Le tournoi U20 de l'hémisphère sud." },
];

module.exports = { LIGUES, COUPES, INTERNATIONALES };
