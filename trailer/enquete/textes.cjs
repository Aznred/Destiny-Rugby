// Le texte de la pub « L'homme qui a disparu devant 80 000 témoins », une réplique par scène.
// `fort` : les mots mis en couleur dans les sous-titres. Les nombres sont écrits comme on veut les LIRE à l'écran
// (« 21 h 04 », « 80 000 ») ; l'aligneur sait les rapprocher de la voix, qui les dit en toutes lettres.
module.exports = {
  fichier: 'DESTINY_RUGBY_DISPARITION',
  // Le plan de la pub : les plans 3D des scènes 1 à 3 (parts de leur durée) ; la scène 4 — la chute — est le vrai jeu
  // (l'essai) ; la scène 5 montre le pack puis la composition avant le carton (secondes).
  plan: {
    decoupe: {
      1: [[0.52, 'ecrans'], [0.48, 'disparition']],
      2: [[0.52, 'suspects'], [0.48, 'tableau']],
      3: [[0.44, 'indices'], [0.56, 'craie']],
    },
    chute: 'essai',
    scene5: [['pack', 0.95], ['compo', 0.85]],
    silence: 1.5,          // le cœur qui bat sur les contours à la craie
    retardChute: 1.15,     // la caméra de surveillance dézoome, puis la voix reprend
    apresChute: 1.15,      // l'essai tombe juste après le nom du joueur, le stade a le temps d'exploser
  },
  fr: {
    accroche: 'JOUE GRATUITEMENT',
    heure: '21:04', date: '12/10',
    repliques: [
      { texte: 'Le 12 octobre, à 21 h 04, un homme a disparu sous les yeux de 80 000 témoins.', fort: ['disparu', '80 000', 'témoins'] },
      { texte: "Quinze suspects. Tous présents sur les lieux. Aucun n'a réussi à l'arrêter.", fort: ['quinze', 'suspects', 'aucun', "l'arrêter"] },
      { texte: "Les enquêteurs n'ont retrouvé qu'une seule chose : l'arme du crime... un crochet.", fort: ["l'arme", 'crime', 'crochet'] },
      { texte: "Attendez... un crochet intérieur ?! C'était juste Antoine Dupont !", fort: ['crochet', 'intérieur', 'antoine', 'dupont'] },
      { texte: 'Destiny Rugby. Gratuit sur destiny-rugby.fr.', fort: ['Destiny', 'Rugby', 'Gratuit', 'destiny-rugby.fr'] },
    ],
  },
  en: {
    accroche: 'PLAY FOR FREE',
    heure: '9:04 PM', date: 'OCT 12',
    repliques: [
      { texte: 'On October 12th, at 9:04 PM, a man vanished in front of 80,000 witnesses.', fort: ['vanished', '80,000', 'witnesses'] },
      { texte: '15 suspects. All of them at the scene. Not one of them could stop him.', fort: ['15', 'suspects', 'not', 'one', 'stop'] },
      { texte: 'Investigators recovered a single clue: he had sold them something... a dummy.', fort: ['single', 'clue', 'dummy'] },
      { texte: "Wait... he sold them a dummy?! That's just Cheslin Kolbe!", fort: ['dummy', 'cheslin', 'kolbe'] },
      { texte: 'Destiny Rugby. Play free at destiny-rugby.fr.', fort: ['Destiny', 'Rugby', 'free', 'destiny-rugby.fr'] },
    ],
  },
};
