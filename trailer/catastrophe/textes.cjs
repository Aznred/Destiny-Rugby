// Le texte de la pub, une réplique par scène. `fort` : les mots mis en couleur dans les sous-titres.
// `dit` (facultatif) : ce qu'on envoie à la synthèse quand l'écriture et la diction diffèrent.
module.exports = {
  // Le nom des fichiers livrés, et le plan de la pub : comment chaque scène se partage entre ses plans (parts de sa
  // durée), et ce que la scène 5 montre du vrai jeu avant le carton (secondes).
  fichier: 'DESTINY_RUGBY_CATASTROPHE',
  plan: {
    decoupe: {
      1: [[0.44, 'approche'], [0.27, 'entree'], [0.29, 'foule']],
      2: [[0.27, 'tsunami'], [0.25, 'effondrement'], [0.24, 'faille'], [0.24, 'onde']],
      3: [[0.33, 'surface'], [0.27, 'labo'], [0.40, 'macro']],
      4: [[0.30, 'devoile'], [0.52, 'heros'], [0.18, 'ruee']],
    },
    scene5: [['tir', 1.45], ['pack', 0.75], ['compo', 0.7]],
  },
  fr: {
    voix: { id: 'ecxPjiGTvAfpGEams6ec', nom: 'Paul K — French Ad & Trailer Voice' },
    secours: [{ id: 'bIHbv24MWmeRgasZH58o', nom: 'Will' }, { id: 'CwhRBWXzGAHq8TQ4Fs17', nom: 'Roger' }],
    accroche: 'JOUE GRATUITEMENT',
    repliques: [
      { texte: 'Que se passerait-il si un objet de huit cents kilomètres de diamètre fonçait droit vers la Terre ?', fort: ['huit', 'cents', 'kilomètres', 'Terre'] },
      { texte: 'Son impact provoquerait des tsunamis gigantesques, des séismes, et peut-être même la fin de notre civilisation.', fort: ['tsunamis', 'gigantesques', 'séismes', 'fin', 'civilisation'] },
      { texte: "Mais les scientifiques découvriraient alors quelque chose d'absolument impossible...", fort: ['impossible'] },
      { texte: "Attendez... C'est un ballon de rugby ?! Quelqu'un a frappé un peu trop fort !", fort: ['ballon', 'rugby', 'trop', 'fort'] },
      { texte: 'Destiny Rugby. Gratuit sur destiny-rugby.fr.', fort: ['Destiny', 'Rugby', 'Gratuit', 'destiny-rugby.fr'] },
    ],
  },
  en: {
    voix: { id: 'nPczCjzI2devNBz1zQrb', nom: 'Brian - Deep, Resonant and Comforting' },
    secours: [{ id: 'TX3LPaxmHKxFdv7VOQHJ', nom: 'Liam' }, { id: 'pNInz6obpgDQGcFmaJgB', nom: 'Adam' }],
    accroche: 'PLAY FOR FREE',
    repliques: [
      { texte: 'What would happen if an eight-hundred-kilometer-wide object headed straight for Earth?', fort: ['eight-hundred-kilometer-wide', 'Earth'] },
      { texte: 'Its impact could unleash gigantic tsunamis, violent earthquakes, and perhaps even the end of civilization.', fort: ['gigantic', 'tsunamis', 'earthquakes', 'end', 'civilization'] },
      { texte: 'But scientists would discover something that should be completely impossible...', fort: ['impossible'] },
      { texte: 'Wait... Is that a rugby ball?! Someone kicked it way too hard!', fort: ['rugby', 'ball', 'way', 'too', 'hard'] },
      { texte: 'Destiny Rugby. Play free at destiny-rugby.fr.', fort: ['Destiny', 'Rugby', 'free', 'destiny-rugby.fr'] },
    ],
  },
};
