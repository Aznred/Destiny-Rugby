// LES TEXTES DE L'INTERFACE, EN SEPT LANGUES
//
// ⚠️ LE FRANÇAIS EST LA SOURCE. Le type `Traduction` impose `fr` et rend les
// autres langues facultatives : une clé peut donc vivre ici avec seulement sa
// version française, et les six autres retomberont dessus — jamais de trou à
// l'écran. C'est ce qui permet d'ajouter un écran sans traduire sept langues
// dans la même respiration.
//
// ⚠️ CE QUI N'EST PAS ICI, ET POURQUOI. Le récit du Maître du Jeu, les
// situations, les tweets, les messages privés et les commentaires de match sont
// ÉCRITS À L'EXÉCUTION par Groq. On ne les traduit pas : on demande au modèle
// d'écrire directement dans la langue du joueur (`consigneDeLangue`,
// lib/i18n.ts). C'est plus juste — un tweet traduit sonne toujours faux — et
// ça ne coûte pas un octet de plus dans le bundle.
//
// Convention des clés : `zone.element`. Un suffixe `.pluriel` fournit la forme
// plurielle utilisée par `tn()`.

import type { Traduction } from '../lib/i18n';
import { TEXTES_ECRANS } from './textesEcrans';
import { TEXTES_CONTENU } from './textesContenu';

export const TEXTES: Record<string, Traduction> = {
  // ⚠️ DEUX ANNEXES, UN SEUL DICTIONNAIRE. Les écrans bavards (Profil,
  // Effectif, Classement, Carrière) et le contenu hors ligne pré-écrit
  // (situations, évènements, commentaires de match) vivent dans leurs propres
  // fichiers : à eux deux, ils pèsent plus lourd que toute l'ossature de
  // l'interface, et les mêler ici rendrait le fichier illisible. Ils sont
  // fusionnés à plat, donc `t()` et `chargerTextes(TEXTES)` ne changent pas.
  // Placés EN PREMIER : une clé redéfinie plus bas dans ce fichier gagne.
  ...TEXTES_ECRANS,
  ...TEXTES_CONTENU,

  // --- NAVIGATION ---------------------------------------------------------
  'nav.accueil': { fr: 'Accueil', en: 'Home', es: 'Inicio', it: 'Home', de: 'Start', pt: 'Início', ja: 'ホーム' },
  'nav.creer': { fr: 'Créer', en: 'Create', es: 'Crear', it: 'Crea', de: 'Erstellen', pt: 'Criar', ja: '作成' },
  'nav.carriere': { fr: 'Carrière', en: 'Career', es: 'Carrera', it: 'Carriera', de: 'Karriere', pt: 'Carreira', ja: 'キャリア' },
  'nav.profil': { fr: 'Profil', en: 'Profile', es: 'Perfil', it: 'Profilo', de: 'Profil', pt: 'Perfil', ja: 'プロフィール' },
  'nav.clubs': { fr: 'Clubs', en: 'Clubs', es: 'Clubes', it: 'Club', de: 'Vereine', pt: 'Clubes', ja: 'クラブ' },
  'nav.classement': { fr: 'Classement', en: 'Leaderboard', es: 'Clasificación', it: 'Classifica', de: 'Rangliste', pt: 'Classificação', ja: 'ランキング' },
  'nav.hall': { fr: 'Hall', en: 'Hall of Fame', es: 'Salón', it: 'Hall of Fame', de: 'Ruhmeshalle', pt: 'Hall', ja: '殿堂' },
  'nav.boutique': { fr: 'Boutique', en: 'Shop', es: 'Tienda', it: 'Negozio', de: 'Shop', pt: 'Loja', ja: 'ショップ' },
  'nav.reglages': { fr: 'Réglages IA', en: 'AI settings', es: 'Ajustes de IA', it: 'Impostazioni IA', de: 'KI-Einstellungen', pt: 'Definições de IA', ja: 'AI設定' },
  'nav.ovale': { fr: 'L’Ovale — le réseau social', en: 'The Oval — the social network', es: 'El Oval — la red social', it: 'L’Ovale — il social network', de: 'The Oval — das soziale Netzwerk', pt: 'O Oval — a rede social', ja: 'オーバル — SNS' },

  // --- ACCUEIL ------------------------------------------------------------
  'accueil.eyebrow': { fr: 'RPG DE CARRIÈRE · RUGBY', en: 'RUGBY CAREER RPG', es: 'RPG DE CARRERA · RUGBY', it: 'GDR DI CARRIERA · RUGBY', de: 'RUGBY-KARRIERE-RPG', pt: 'RPG DE CARREIRA · RÂGBI', ja: 'ラグビー キャリアRPG' },
  'accueil.titre1': { fr: 'Deviens une', en: 'Become a', es: 'Conviértete en', it: 'Diventa una', de: 'Werde zur', pt: 'Torna-te uma', ja: 'ラグビーの' },
  'accueil.titre2': { fr: 'légende', en: 'legend', es: 'leyenda', it: 'leggenda', de: 'Legende', pt: 'lenda', ja: '伝説' },
  'accueil.titre3': { fr: 'du rugby', en: 'of rugby', es: 'del rugby', it: 'del rugby', de: 'des Rugby', pt: 'do râgbi', ja: 'になれ' },
  'accueil.chapo': {
    fr: 'Incarne un rugbyman de ses débuts jusqu’au sommet. Parle au Maître du Jeu, décris tes choix, et laisse l’IA juger le destin de ta carrière — match après match, saison après saison.',
    en: 'Play a rugby player from his first steps to the very top. Talk to the Game Master, describe your choices, and let the AI judge where your career goes — match after match, season after season.',
    es: 'Encarna a un jugador de rugby desde sus inicios hasta la cima. Habla con el Máster, describe tus decisiones y deja que la IA juzgue tu carrera — partido a partido, temporada a temporada.',
    it: 'Vesti i panni di un rugbista, dagli esordi alla vetta. Parla al Master, descrivi le tue scelte e lascia che l’IA giudichi la tua carriera — partita dopo partita, stagione dopo stagione.',
    de: 'Spiele einen Rugbyspieler von den Anfängen bis an die Spitze. Sprich mit dem Spielleiter, beschreibe deine Entscheidungen und lass die KI über deine Karriere urteilen — Spiel für Spiel, Saison für Saison.',
    pt: 'Encarna um jogador de râgbi desde a estreia até ao topo. Fala com o Mestre do Jogo, descreve as tuas escolhas e deixa a IA julgar a tua carreira — jogo após jogo, época após época.',
    ja: 'デビューから頂点まで、一人のラグビー選手を演じよう。ゲームマスターに語りかけ、選択を告げ、AIがキャリアの行方を裁く——試合ごと、シーズンごとに。',
  },
  'accueil.commencer': { fr: 'Commencer ma carrière →', en: 'Start my career →', es: 'Empezar mi carrera →', it: 'Inizia la carriera →', de: 'Karriere starten →', pt: 'Começar a carreira →', ja: 'キャリアを始める →' },
  'accueil.reprendre': { fr: 'Reprendre ma carrière →', en: 'Continue my career →', es: 'Continuar mi carrera →', it: 'Riprendi la carriera →', de: 'Karriere fortsetzen →', pt: 'Retomar a carreira →', ja: 'キャリアを再開 →' },
  'accueil.voirProfil': { fr: 'Voir mon profil', en: 'View my profile', es: 'Ver mi perfil', it: 'Vedi il profilo', de: 'Mein Profil', pt: 'Ver o meu perfil', ja: 'プロフィールを見る' },
  'accueil.postes': { fr: 'postes jouables', en: 'playable positions', es: 'posiciones jugables', it: 'ruoli giocabili', de: 'spielbare Positionen', pt: 'posições jogáveis', ja: 'ポジション' },
  'accueil.scenarios': { fr: 'scénarios IA', en: 'AI scenarios', es: 'escenarios de IA', it: 'scenari IA', de: 'KI-Szenarien', pt: 'cenários de IA', ja: 'AIシナリオ' },
  'accueil.saisons': { fr: 'saisons à écrire', en: 'seasons to write', es: 'temporadas por escribir', it: 'stagioni da scrivere', de: 'Saisons zu schreiben', pt: 'épocas por escrever', ja: '書くべきシーズン' },
  'acc.f1.titre': { fr: 'Un MJ qui juge vraiment', en: 'A Game Master that really judges', es: 'Un Máster que juzga de verdad', it: 'Un Master che giudica davvero', de: 'Ein Spielleiter, der wirklich urteilt', pt: 'Um Mestre que julga a sério', ja: '本当に裁くゲームマスター' },
  'acc.f1.texte': {
    fr: 'Le Maître du Jeu (IA Groq) évalue chacune de tes décisions selon tes stats, ta forme et le contexte. Rien n’est scripté.',
    en: 'The Game Master (Groq AI) weighs every decision against your stats, your fitness and the context. Nothing is scripted.',
    es: 'El Máster (IA Groq) evalúa cada decisión según tus estadísticas, tu forma y el contexto. Nada está guionizado.',
    it: 'Il Master (IA Groq) valuta ogni tua decisione in base a statistiche, forma e contesto. Niente è scriptato.',
    de: 'Der Spielleiter (Groq-KI) bewertet jede Entscheidung anhand deiner Werte, deiner Form und der Situation. Nichts ist vorgeschrieben.',
    pt: 'O Mestre do Jogo (IA Groq) avalia cada decisão com base nas tuas estatísticas, forma e contexto. Nada é guionizado.',
    ja: 'ゲームマスター（Groq AI）が、能力値・調子・状況を踏まえて一つひとつの判断を評価します。すべては即興です。',
  },
  'acc.f2.titre': { fr: 'Une progression vivante', en: 'A living progression', es: 'Una progresión viva', it: 'Una progressione viva', de: 'Eine lebendige Entwicklung', pt: 'Uma progressão viva', ja: '生きた成長' },
  'acc.f2.texte': {
    fr: 'Entraîne-toi, joue les matchs, gère ta vie : chaque action fait monter ou chuter tes attributs. Tu écris ta trajectoire.',
    en: 'Train, play the games, run your life: every action lifts or drops your attributes. You write your own path.',
    es: 'Entrena, juega los partidos, gestiona tu vida: cada acción sube o baja tus atributos. Tú escribes tu trayectoria.',
    it: 'Allenati, gioca le partite, gestisci la tua vita: ogni azione alza o abbassa i tuoi attributi. Scrivi tu il percorso.',
    de: 'Trainiere, spiele die Spiele, führe dein Leben: Jede Aktion hebt oder senkt deine Werte. Du schreibst deinen Weg.',
    pt: 'Treina, joga os jogos, gere a tua vida: cada ação sobe ou desce os teus atributos. Escreves o teu percurso.',
    ja: '練習し、試合に出て、人生を選ぶ。すべての行動が能力値を上下させます。道を描くのはあなたです。',
  },
  'acc.f3.titre': { fr: 'Ta légende sur 15 ans', en: 'Your legend over 15 years', es: 'Tu leyenda en 15 años', it: 'La tua leggenda in 15 anni', de: 'Deine Legende über 15 Jahre', pt: 'A tua lenda em 15 anos', ja: '15年の伝説' },
  'acc.f3.texte': {
    fr: 'Des espoirs au Tournoi, de la Fédérale au Top 14 : négocie tes contrats, gère la pression et vise les titres.',
    en: 'From the academy to the Six Nations, from the lower leagues to the Top 14: negotiate your contracts, handle the pressure, chase the titles.',
    es: 'De la cantera al Torneo, de la Fédérale al Top 14: negocia tus contratos, gestiona la presión y ve a por los títulos.',
    it: 'Dalle giovanili al Torneo, dalla Fédérale al Top 14: negozia i contratti, gestisci la pressione e punta ai titoli.',
    de: 'Von der Akademie zum Turnier, von der Fédérale in die Top 14: Verhandle deine Verträge, halte dem Druck stand, jage die Titel.',
    pt: 'Da formação ao Torneio, da Fédérale ao Top 14: negoceia contratos, gere a pressão e vai atrás dos títulos.',
    ja: 'アカデミーから代表へ、下部リーグからトップ14へ。契約を交渉し、重圧に耐え、タイトルを狙え。',
  },

  // --- CARRIÈRE : LE PANNEAU DU JOUEUR ------------------------------------
  'pj.forme': { fr: 'Forme', en: 'Fitness', es: 'Forma', it: 'Forma', de: 'Form', pt: 'Forma', ja: 'コンディション' },
  'pj.moral': { fr: 'Moral', en: 'Morale', es: 'Moral', it: 'Morale', de: 'Moral', pt: 'Moral', ja: '士気' },
  'pj.reputation': { fr: 'Réputation', en: 'Reputation', es: 'Reputación', it: 'Reputazione', de: 'Ruf', pt: 'Reputação', ja: '評判' },
  'pj.staff': { fr: 'Staff', en: 'Coach trust', es: 'Cuerpo técnico', it: 'Staff', de: 'Trainerstab', pt: 'Equipa técnica', ja: 'コーチ信頼' },
  'pj.popularite': { fr: 'Popularité', en: 'Popularity', es: 'Popularidad', it: 'Popolarità', de: 'Beliebtheit', pt: 'Popularidade', ja: '人気' },
  'pj.attributs': { fr: 'Attributs', en: 'Attributes', es: 'Atributos', it: 'Attributi', de: 'Attribute', pt: 'Atributos', ja: '能力値' },
  'pj.travailles': { fr: 'Ce que tu travailles', en: 'What you’re working on', es: 'En qué trabajas', it: 'Su cosa lavori', de: 'Woran du arbeitest', pt: 'No que trabalhas', ja: '強化中の項目' },
  'pj.choisirSecteur': { fr: 'choisis un secteur', en: 'pick an area', es: 'elige un área', it: 'scegli un settore', de: 'Bereich wählen', pt: 'escolhe uma área', ja: '項目を選択' },
  'pj.chaqueSemaine': { fr: 'chaque semaine', en: 'every week', es: 'cada semana', it: 'ogni settimana', de: 'jede Woche', pt: 'todas as semanas', ja: '毎週' },
  'pj.seanceFaite': { fr: 'séance faite', en: 'session done', es: 'sesión hecha', it: 'sessione fatta', de: 'Einheit erledigt', pt: 'sessão feita', ja: '練習済み' },
  'pj.infirmerie': { fr: 'à l’infirmerie', en: 'in the treatment room', es: 'en la enfermería', it: 'in infermeria', de: 'im Behandlungsraum', pt: 'na enfermaria', ja: '治療中' },
  'pj.jouerMatch': { fr: 'Jouer le match', en: 'Play the match', es: 'Jugar el partido', it: 'Gioca la partita', de: 'Spiel bestreiten', pt: 'Jogar o jogo', ja: '試合をプレー' },
  'pj.jouerSelection': { fr: 'Jouer avec ta sélection', en: 'Play for your country', es: 'Jugar con tu selección', it: 'Gioca con la nazionale', de: 'Für dein Land spielen', pt: 'Jogar pela seleção', ja: '代表でプレー' },
  'pj.jouerSelectionCourt': { fr: 'Jouer en sélection', en: 'Play for country', es: 'Jugar con la selección', it: 'Gioca in nazionale', de: 'Für dein Land', pt: 'Jogar pela seleção', ja: '代表でプレー' },
  'pj.semaineSuivante': { fr: 'Semaine suivante →', en: 'Next week →', es: 'Semana siguiente →', it: 'Settimana successiva →', de: 'Nächste Woche →', pt: 'Semana seguinte →', ja: '次の週へ →' },
  'pj.cloreSaison': { fr: 'Clore la saison →', en: 'End the season →', es: 'Cerrar la temporada →', it: 'Chiudi la stagione →', de: 'Saison abschließen →', pt: 'Encerrar a época →', ja: 'シーズンを終える →' },
  'pj.saisonSuivante': { fr: 'Saison suivante →', en: 'Next season →', es: 'Temporada siguiente →', it: 'Stagione successiva →', de: 'Nächste Saison →', pt: 'Época seguinte →', ja: '次のシーズンへ →' },
  'pj.finSaison': { fr: 'Fin de saison', en: 'Skip to season end', es: 'Fin de temporada', it: 'Fine stagione', de: 'Saisonende', pt: 'Fim de época', ja: 'シーズン終了まで' },
  'pj.equipe': { fr: 'Équipe', en: 'Squad', es: 'Plantilla', it: 'Rosa', de: 'Kader', pt: 'Plantel', ja: 'チーム' },
  'pj.marche': { fr: 'Marché', en: 'Transfers', es: 'Mercado', it: 'Mercato', de: 'Transfers', pt: 'Mercado', ja: '移籍市場' },
  'pj.resultats': { fr: 'Résultats', en: 'Fixtures', es: 'Resultados', it: 'Risultati', de: 'Ergebnisse', pt: 'Resultados', ja: '結果' },
  'pj.mentor': { fr: 'Mentor', en: 'Mentor', es: 'Mentor', it: 'Mentore', de: 'Mentor', pt: 'Mentor', ja: 'メンター' },
  'pj.retraite': { fr: 'Retraite', en: 'Retire', es: 'Retirada', it: 'Ritiro', de: 'Karriereende', pt: 'Retirada', ja: '引退' },
  'pj.semaine': { fr: 'Semaine {n} / {total}', en: 'Week {n} of {total}', es: 'Semana {n} / {total}', it: 'Settimana {n} / {total}', de: 'Woche {n} / {total}', pt: 'Semana {n} / {total}', ja: '第{n}週 / {total}' },
  'pj.calendrier': { fr: 'tout le calendrier →', en: 'full calendar →', es: 'calendario completo →', it: 'calendario completo →', de: 'ganzer Spielplan →', pt: 'calendário completo →', ja: 'カレンダー全体 →' },
  'pj.carriereTerminee': { fr: 'Carrière terminée', en: 'Career over', es: 'Carrera terminada', it: 'Carriera finita', de: 'Karriere beendet', pt: 'Carreira terminada', ja: '現役引退' },
  'pj.indisponible': { fr: 'Indisponible {n} semaine', en: 'Out for {n} week', es: 'Baja {n} semana', it: 'Fuori {n} settimana', de: '{n} Woche außer Gefecht', pt: 'De fora {n} semana', ja: '{n}週間離脱' },
  'pj.indisponible.pluriel': { fr: 'Indisponible {n} semaines', en: 'Out for {n} weeks', es: 'Baja {n} semanas', it: 'Fuori {n} settimane', de: '{n} Wochen außer Gefecht', pt: 'De fora {n} semanas', ja: '{n}週間離脱' },
  // Les moins de 20 ans : une sélection à part entière (lib/international.ts).
  'pj.jouerU20': { fr: 'Jouer avec les U20', en: 'Play for the U20s', es: 'Jugar con la sub-20', it: 'Gioca con l’Under 20', de: 'Für die U20 spielen', pt: 'Jogar pelos sub-20', ja: 'U20代表でプレー' },
  'pj.jouerU20Court': { fr: 'Jouer en U20', en: 'Play U20', es: 'Jugar sub-20', it: 'Gioca U20', de: 'U20 spielen', pt: 'Jogar sub-20', ja: 'U20でプレー' },
  'pj.capitaine': { fr: 'Capitaine', en: 'Captain', es: 'Capitán', it: 'Capitano', de: 'Kapitän', pt: 'Capitão', ja: 'キャプテン' },
  'pj.contrat': { fr: 'fin', en: 'ending', es: 'fin', it: 'fine', de: 'endet', pt: 'fim', ja: '満了' },

  // --- CLASSEMENT LATÉRAL -------------------------------------------------
  'cl.titre': { fr: 'Classement', en: 'Standings', es: 'Clasificación', it: 'Classifica', de: 'Tabelle', pt: 'Classificação', ja: '順位表' },
  'cl.dernierMatch': { fr: 'Dernier match', en: 'Last match', es: 'Último partido', it: 'Ultima partita', de: 'Letztes Spiel', pt: 'Último jogo', ja: '前節の試合' },
  'cl.phaseFinale': { fr: 'Phase finale', en: 'Play-offs', es: 'Fase final', it: 'Fase finale', de: 'Play-offs', pt: 'Fase final', ja: 'プレーオフ' },

  // --- RÉGLAGES -----------------------------------------------------------
  'reg.titre': { fr: 'Connexion à Groq', en: 'Connect to Groq', es: 'Conexión con Groq', it: 'Connessione a Groq', de: 'Verbindung zu Groq', pt: 'Ligação ao Groq', ja: 'Groqへの接続' },
  'reg.eyebrow': { fr: 'MOTEUR DU MAÎTRE DU JEU', en: 'GAME MASTER ENGINE', es: 'MOTOR DEL MÁSTER', it: 'MOTORE DEL MASTER', de: 'SPIELLEITER-ENGINE', pt: 'MOTOR DO MESTRE DO JOGO', ja: 'ゲームマスター エンジン' },
  'reg.modele': { fr: 'Modèle', en: 'Model', es: 'Modelo', it: 'Modello', de: 'Modell', pt: 'Modelo', ja: 'モデル' },
  'reg.langue': { fr: 'Langue', en: 'Language', es: 'Idioma', it: 'Lingua', de: 'Sprache', pt: 'Idioma', ja: '言語' },
  'reg.langueAide': {
    fr: 'L’interface change tout de suite. Le Maître du Jeu, les situations et L’Ovale écriront eux aussi dans cette langue.',
    en: 'The interface switches instantly. The Game Master, the life events and The Oval will write in this language too.',
    es: 'La interfaz cambia al instante. El Máster, las situaciones y El Oval también escribirán en este idioma.',
    it: 'L’interfaccia cambia subito. Anche il Master, le situazioni e L’Ovale scriveranno in questa lingua.',
    de: 'Die Oberfläche wechselt sofort. Auch der Spielleiter, die Ereignisse und The Oval schreiben dann in dieser Sprache.',
    pt: 'A interface muda de imediato. O Mestre do Jogo, as situações e O Oval também escreverão neste idioma.',
    ja: 'インターフェースは即座に切り替わります。ゲームマスター、イベント、オーバルもこの言語で書きます。',
  },
  'reg.ambiance': { fr: 'Ambiance', en: 'Colour theme', es: 'Ambiente', it: 'Atmosfera', de: 'Farbstimmung', pt: 'Ambiente', ja: 'カラーテーマ' },
  'reg.ambianceAide': {
    fr: 'La couleur du stade, rien de plus : les dorures, le cuir et la craie restent.',
    en: 'Just the colour of the stadium — the gold, the leather and the chalk stay put.',
    es: 'Solo el color del estadio: el dorado, el cuero y la tiza no cambian.',
    it: 'Solo il colore dello stadio: oro, cuoio e gesso restano.',
    de: 'Nur die Farbe des Stadions — Gold, Leder und Kreide bleiben.',
    pt: 'Apenas a cor do estádio: o dourado, o couro e o giz mantêm-se.',
    ja: 'スタジアムの色だけが変わります。金、革、白線はそのままです。',
  },
  'reg.pelouse': { fr: 'Pelouse', en: 'Turf', es: 'Césped', it: 'Prato', de: 'Rasen', pt: 'Relvado', ja: '芝' },
  'reg.nuit': { fr: 'Nuit', en: 'Night', es: 'Noche', it: 'Notte', de: 'Nacht', pt: 'Noite', ja: 'ナイト' },
  'reg.grenat': { fr: 'Grenat', en: 'Garnet', es: 'Granate', it: 'Granata', de: 'Granat', pt: 'Grená', ja: 'ガーネット' },
  'reg.rythme': { fr: 'Rythme de jeu', en: 'Game pace', es: 'Ritmo de juego', it: 'Ritmo di gioco', de: 'Spieltempo', pt: 'Ritmo de jogo', ja: 'プレーのペース' },
  'reg.journeeParJournee': { fr: 'Journée par journée', en: 'Round by round', es: 'Jornada a jornada', it: 'Giornata per giornata', de: 'Spieltag für Spieltag', pt: 'Jornada a jornada', ja: '節ごと' },
  'reg.saisonParSaison': { fr: 'Saison par saison', en: 'Season by season', es: 'Temporada a temporada', it: 'Stagione per stagione', de: 'Saison für Saison', pt: 'Época a época', ja: 'シーズンごと' },
  'reg.conso': { fr: 'Consommation Groq — cette session', en: 'Groq usage — this session', es: 'Consumo de Groq — esta sesión', it: 'Consumo Groq — questa sessione', de: 'Groq-Verbrauch — diese Sitzung', pt: 'Consumo Groq — esta sessão', ja: 'Groq使用量 — 今セッション' },
  'reg.appels': { fr: 'appel', en: 'call', es: 'llamada', it: 'chiamata', de: 'Aufruf', pt: 'chamada', ja: '回の呼び出し' },
  'reg.appels.pluriel': { fr: 'appels', en: 'calls', es: 'llamadas', it: 'chiamate', de: 'Aufrufe', pt: 'chamadas', ja: '回の呼び出し' },
  'reg.envoyes': { fr: 'tokens envoyés', en: 'tokens sent', es: 'tokens enviados', it: 'token inviati', de: 'Tokens gesendet', pt: 'tokens enviados', ja: '送信トークン' },
  'reg.recus': { fr: 'reçus', en: 'received', es: 'recibidos', it: 'ricevuti', de: 'empfangen', pt: 'recebidos', ja: '受信' },
  'reg.remiseAZero': { fr: 'Remettre à zéro', en: 'Reset', es: 'Poner a cero', it: 'Azzera', de: 'Zurücksetzen', pt: 'Repor a zero', ja: 'リセット' },
  'reg.fermer': { fr: 'Fermer', en: 'Close', es: 'Cerrar', it: 'Chiudi', de: 'Schließen', pt: 'Fechar', ja: '閉じる' },
  'reg.enregistrer': { fr: 'Enregistrer', en: 'Save', es: 'Guardar', it: 'Salva', de: 'Speichern', pt: 'Guardar', ja: '保存' },

  // --- MATCH EN DIRECT ----------------------------------------------------
  'ml.pause': { fr: 'Pause', en: 'Pause', es: 'Pausa', it: 'Pausa', de: 'Pause', pt: 'Pausa', ja: '一時停止' },
  'ml.reprendre': { fr: 'Reprendre', en: 'Resume', es: 'Reanudar', it: 'Riprendi', de: 'Fortsetzen', pt: 'Retomar', ja: '再開' },
  'ml.terminer': { fr: 'Terminer', en: 'Finish', es: 'Terminar', it: 'Termina', de: 'Beenden', pt: 'Terminar', ja: '終了' },
  'ml.joueur': { fr: 'Joueur', en: 'Player', es: 'Jugador', it: 'Giocatore', de: 'Spieler', pt: 'Jogador', ja: '選手' },
  'ml.essais': { fr: 'essais', en: 'tries', es: 'ensayos', it: 'mete', de: 'Versuche', pt: 'ensaios', ja: 'トライ' },
  'ml.rucks': { fr: 'rucks', en: 'rucks', es: 'rucks', it: 'ruck', de: 'Rucks', pt: 'rucks', ja: 'ラック' },
  'ml.touches': { fr: 'touches', en: 'line-outs', es: 'touches', it: 'touche', de: 'Gassen', pt: 'alinhamentos', ja: 'ラインアウト' },
  'ml.melees': { fr: 'mêlées', en: 'scrums', es: 'melés', it: 'mischie', de: 'Gedränge', pt: 'formações ordenadas', ja: 'スクラム' },
  'ml.percees': { fr: 'franchissements', en: 'line breaks', es: 'rupturas', it: 'sfondamenti', de: 'Durchbrüche', pt: 'quebras de linha', ja: 'ラインブレイク' },
  'ml.consigne': {
    fr: 'Consigne à ton joueur — « défends plus bas », « propose-toi au ras du ruck »…',
    en: 'Instruction to your player — “defend deeper”, “work close to the ruck”…',
    es: 'Instrucción a tu jugador — «defiende más atrás», «ofrécete junto al ruck»…',
    it: 'Istruzione al tuo giocatore — «difendi più basso», «proponiti vicino al ruck»…',
    de: 'Anweisung an deinen Spieler — „tiefer verteidigen“, „am Ruck anbieten“…',
    pt: 'Instrução ao teu jogador — «defende mais atrás», «oferece-te junto ao ruck»…',
    ja: '選手への指示 —「もっと深く守れ」「ラック際で受けろ」…',
  },
  'ml.transmettre': { fr: 'Transmettre', en: 'Send', es: 'Transmitir', it: 'Trasmetti', de: 'Übermitteln', pt: 'Transmitir', ja: '伝える' },

  // --- ÉTATS GÉNÉRAUX -----------------------------------------------------
  'gen.chargement': { fr: 'Chargement…', en: 'Loading…', es: 'Cargando…', it: 'Caricamento…', de: 'Wird geladen…', pt: 'A carregar…', ja: '読み込み中…' },
  'gen.retour': { fr: '← Retour', en: '← Back', es: '← Volver', it: '← Indietro', de: '← Zurück', pt: '← Voltar', ja: '← 戻る' },
  'gen.retourCarriere': { fr: '← Retour à la carrière', en: '← Back to career', es: '← Volver a la carrera', it: '← Torna alla carriera', de: '← Zurück zur Karriere', pt: '← Voltar à carreira', ja: '← キャリアに戻る' },
  'gen.oui': { fr: 'Oui', en: 'Yes', es: 'Sí', it: 'Sì', de: 'Ja', pt: 'Sim', ja: 'はい' },
  'gen.non': { fr: 'Non', en: 'No', es: 'No', it: 'No', de: 'Nein', pt: 'Não', ja: 'いいえ' },
  'gen.saison': { fr: 'Saison', en: 'Season', es: 'Temporada', it: 'Stagione', de: 'Saison', pt: 'Época', ja: 'シーズン' },
  'gen.ans': { fr: 'ans', en: 'years old', es: 'años', it: 'anni', de: 'Jahre', pt: 'anos', ja: '歳' },
  'gen.clubs': { fr: 'clubs', en: 'clubs', es: 'clubes', it: 'club', de: 'Vereine', pt: 'clubes', ja: 'クラブ' },
  'gen.joueurs': { fr: 'joueurs', en: 'players', es: 'jugadores', it: 'giocatori', de: 'Spieler', pt: 'jogadores', ja: '選手' },
  'gen.abonnes': { fr: 'abonnés', en: 'followers', es: 'seguidores', it: 'follower', de: 'Follower', pt: 'seguidores', ja: 'フォロワー' },
  'gen.suivre': { fr: 'Suivre', en: 'Follow', es: 'Seguir', it: 'Segui', de: 'Folgen', pt: 'Seguir', ja: 'フォロー' },
  'gen.abonne': { fr: 'Abonné', en: 'Following', es: 'Siguiendo', it: 'Segui già', de: 'Folgst du', pt: 'A seguir', ja: 'フォロー中' },

  // --- L'OVALE ------------------------------------------------------------
  'ov.pourVous': { fr: 'Pour vous', en: 'For you', es: 'Para ti', it: 'Per te', de: 'Für dich', pt: 'Para ti', ja: 'おすすめ' },
  'ov.explorer': { fr: 'Explorer', en: 'Explore', es: 'Explorar', it: 'Esplora', de: 'Entdecken', pt: 'Explorar', ja: '話題を検索' },
  'ov.messages': { fr: 'Messages', en: 'Messages', es: 'Mensajes', it: 'Messaggi', de: 'Nachrichten', pt: 'Mensagens', ja: 'メッセージ' },
  'ov.notifs': { fr: 'Notifs', en: 'Notifications', es: 'Notificaciones', it: 'Notifiche', de: 'Mitteilungen', pt: 'Notificações', ja: '通知' },
  'ov.succes': { fr: 'Succès', en: 'Achievements', es: 'Logros', it: 'Obiettivi', de: 'Erfolge', pt: 'Conquistas', ja: '実績' },
  'ov.quoiDeNeuf': { fr: 'Quoi de neuf ?', en: 'What’s happening?', es: '¿Qué está pasando?', it: 'Cosa succede?', de: 'Was gibt’s Neues?', pt: 'O que se passa?', ja: 'いまどうしてる？' },
  'ov.poster': { fr: 'Poster', en: 'Post', es: 'Publicar', it: 'Posta', de: 'Posten', pt: 'Publicar', ja: '投稿' },
  'ov.comptesASuivre': { fr: 'Comptes à suivre', en: 'Who to follow', es: 'A quién seguir', it: 'Chi seguire', de: 'Wem folgen', pt: 'Quem seguir', ja: 'おすすめユーザー' },
  'ov.rechercher': { fr: 'Rechercher…', en: 'Search…', es: 'Buscar…', it: 'Cerca…', de: 'Suchen…', pt: 'Pesquisar…', ja: '検索…' },
  'ov.filSemaine': { fr: 'Le fil se renouvelle à chaque semaine jouée.', en: 'The feed refreshes every week you play.', es: 'El muro se renueva cada semana jugada.', it: 'Il feed si rinnova a ogni settimana giocata.', de: 'Der Feed erneuert sich mit jeder gespielten Woche.', pt: 'O mural renova-se a cada semana jogada.', ja: 'フィードは1週プレーするごとに更新されます。' },
  'ov.filVide': { fr: 'Le fil se remplit…', en: 'The feed is filling up…', es: 'El muro se está llenando…', it: 'Il feed si sta riempiendo…', de: 'Der Feed füllt sich…', pt: 'O mural está a encher…', ja: 'フィードを読み込み中…' },

  // --- BOUTIQUE / HALL / CLASSEMENT ---------------------------------------
  'bo.titre': { fr: 'Boutique', en: 'Shop', es: 'Tienda', it: 'Negozio', de: 'Shop', pt: 'Loja', ja: 'ショップ' },
  'bo.acheter': { fr: 'Acheter', en: 'Buy', es: 'Comprar', it: 'Acquista', de: 'Kaufen', pt: 'Comprar', ja: '購入' },
  'bo.equipe': { fr: 'Équipé', en: 'Equipped', es: 'Equipado', it: 'Equipaggiato', de: 'Ausgerüstet', pt: 'Equipado', ja: '装備中' },
  'bo.choisir': { fr: 'Choisir', en: 'Select', es: 'Elegir', it: 'Scegli', de: 'Wählen', pt: 'Escolher', ja: '選択' },
  'bo.equiper': { fr: 'Équiper', en: 'Equip', es: 'Equipar', it: 'Equipaggia', de: 'Ausrüsten', pt: 'Equipar', ja: '装備する' },
  'bo.chapo': { fr: 'Personnalise ta légende', en: 'Make your legend yours', es: 'Personaliza tu leyenda', it: 'Personalizza la tua leggenda', de: 'Gestalte deine Legende', pt: 'Personaliza a tua lenda', ja: '自分だけの伝説を' },
  'bo.ballons': { fr: 'Ballons', en: 'Balls', es: 'Balones', it: 'Palloni', de: 'Bälle', pt: 'Bolas', ja: 'ボール' },
  'bo.apercu': { fr: 'Aperçu', en: 'Preview', es: 'Vista previa', it: 'Anteprima', de: 'Vorschau', pt: 'Pré-visualização', ja: 'プレビュー' },
  'bo.recharges': { fr: 'Recharges d’Ovas', en: 'Ova top-ups', es: 'Recargas de Ovas', it: 'Ricariche di Ovas', de: 'Ovas aufladen', pt: 'Recargas de Ovas', ja: 'オーヴァスの購入' },
  'bo.apercuAide': {
    fr: 'Le ballon choisi s’affiche partout dans le jeu (accueil et boutique).',
    en: 'The ball you pick shows up everywhere in the game (home screen and shop).',
    es: 'El balón elegido aparece en todo el juego (inicio y tienda).',
    it: 'Il pallone scelto compare ovunque nel gioco (home e negozio).',
    de: 'Der gewählte Ball erscheint überall im Spiel (Startseite und Shop).',
    pt: 'A bola escolhida aparece em todo o jogo (início e loja).',
    ja: '選んだボールはゲーム全体（ホームとショップ）に表示されます。',
  },
  'bo.demoAide': {
    fr: 'Le paiement réel n’est pas activé (démo). Les Ovas sont rares : elles se gagnent petit à petit en jouant. Chaque achat se mérite !',
    en: 'Real payment is not enabled (demo). Ovas are scarce: you earn them slowly by playing. Every purchase is earned!',
    es: 'El pago real no está activado (demo). Las Ovas son escasas: se ganan poco a poco jugando. ¡Cada compra se merece!',
    it: 'Il pagamento reale non è attivo (demo). Gli Ovas sono rari: si guadagnano poco a poco giocando. Ogni acquisto si merita!',
    de: 'Echte Zahlungen sind nicht aktiv (Demo). Ovas sind rar: Du verdienst sie langsam beim Spielen. Jeder Kauf ist verdient!',
    pt: 'O pagamento real não está ativo (demo). As Ovas são raras: ganham-se pouco a pouco a jogar. Cada compra merece-se!',
    ja: '実際の支払いは無効です（デモ）。オーヴァスは希少で、プレーして少しずつ貯まります。',
  },
  'bo.equipeMsg': { fr: 'Ballon équipé !', en: 'Ball equipped!', es: '¡Balón equipado!', it: 'Pallone equipaggiato!', de: 'Ball ausgerüstet!', pt: 'Bola equipada!', ja: 'ボールを装備しました！' },
  'bo.pasAssez': { fr: 'Pas assez d’Ovas.', en: 'Not enough Ovas.', es: 'No hay suficientes Ovas.', it: 'Ovas insufficienti.', de: 'Nicht genug Ovas.', pt: 'Ovas insuficientes.', ja: 'オーヴァスが足りません。' },
  'hall.titre': { fr: 'Panthéon', en: 'Hall of Fame', es: 'Panteón', it: 'Pantheon', de: 'Ruhmeshalle', pt: 'Panteão', ja: '殿堂' },
  'clst.titre': { fr: 'Classement des légendes', en: 'Legends leaderboard', es: 'Clasificación de leyendas', it: 'Classifica delle leggende', de: 'Rangliste der Legenden', pt: 'Classificação das lendas', ja: 'レジェンド ランキング' },

  // --- CLASSEMENT LATÉRAL (suite) -----------------------------------------
  'cl.voirTout': { fr: 'Voir tous les résultats, journée par journée', en: 'See every result, round by round', es: 'Ver todos los resultados, jornada a jornada', it: 'Vedi tutti i risultati, giornata per giornata', de: 'Alle Ergebnisse, Spieltag für Spieltag', pt: 'Ver todos os resultados, jornada a jornada', ja: '全結果を節ごとに見る' },

  // --- ATLAS DES CLUBS ET CHAMPIONNATS ------------------------------------
  'ch.eyebrow': { fr: 'CLUBS & CHAMPIONNATS', en: 'CLUBS & LEAGUES', es: 'CLUBES Y LIGAS', it: 'CLUB E CAMPIONATI', de: 'VEREINE & LIGEN', pt: 'CLUBES E LIGAS', ja: 'クラブとリーグ' },
  'ch.titre': { fr: 'L’atlas de l’ovalie', en: 'The rugby atlas', es: 'El atlas del rugby', it: 'L’atlante del rugby', de: 'Der Rugby-Atlas', pt: 'O atlas do râgbi', ja: 'ラグビー地図' },
  'ch.france': { fr: 'France', en: 'France', es: 'Francia', it: 'Francia', de: 'Frankreich', pt: 'França', ja: 'フランス' },
  'ch.monde': { fr: 'Monde', en: 'World', es: 'Mundo', it: 'Mondo', de: 'Welt', pt: 'Mundo', ja: '世界' },
  'ch.selections': { fr: 'Sélections', en: 'National teams', es: 'Selecciones', it: 'Nazionali', de: 'Nationalteams', pt: 'Seleções', ja: '代表' },
  'ch.seniors': { fr: 'Sélections séniors', en: 'Senior national teams', es: 'Selecciones absolutas', it: 'Nazionali maggiori', de: 'A-Nationalteams', pt: 'Seleções principais', ja: 'シニア代表' },
  'ch.u20': { fr: 'Sélections U20', en: 'U20 national teams', es: 'Selecciones sub-20', it: 'Nazionali Under 20', de: 'U20-Nationalteams', pt: 'Seleções sub-20', ja: 'U20代表' },
  'ch.chapo': {
    fr: 'La pyramide française du Top 14 à la Fédérale 3, les grands championnats du monde et les sélections nationales. Clique sur un club pour ouvrir son effectif complet.',
    en: 'The French pyramid from the Top 14 down to Fédérale 3, the world’s big leagues and the national teams. Click a club to open its full squad.',
    es: 'La pirámide francesa del Top 14 a la Fédérale 3, las grandes ligas del mundo y las selecciones. Haz clic en un club para ver su plantilla completa.',
    it: 'La piramide francese dal Top 14 alla Fédérale 3, i grandi campionati del mondo e le nazionali. Clicca su un club per aprirne la rosa completa.',
    de: 'Die französische Pyramide vom Top 14 bis zur Fédérale 3, die großen Ligen der Welt und die Nationalteams. Klicke auf einen Verein für seinen kompletten Kader.',
    pt: 'A pirâmide francesa do Top 14 à Fédérale 3, os grandes campeonatos do mundo e as seleções. Clica num clube para ver o plantel completo.',
    ja: 'トップ14からフェデラル3までのフランスのピラミッド、世界の主要リーグ、そして代表チーム。クラブをクリックすると全選手が見られます。',
  },
  'ch.noteSeniors': {
    fr: 'Les équipes nationales premières — une seule par pays : ni équipes A, ni XV, ni sélections d’invitation.',
    en: 'First national teams — one per country: no A sides, no XVs, no invitational teams.',
    es: 'Las selecciones absolutas — una por país: sin equipos A, ni XV, ni combinados de invitación.',
    it: 'Le nazionali maggiori — una per paese: niente squadre A, XV o selezioni a inviti.',
    de: 'Die A-Nationalteams — eines pro Land: keine A-Auswahlen, keine XV, keine Einladungsteams.',
    pt: 'As seleções principais — uma por país: sem equipas A, XV ou seleções de convite.',
    ja: '各国の第一代表チーム（Aチーム、XV、招待チームは除く）。',
  },
  'ch.noteU20': {
    fr: 'Les moins de 20 ans : la pépinière où se repèrent les futurs internationaux.',
    en: 'The under-20s: the nursery where tomorrow’s internationals are spotted.',
    es: 'Los sub-20: el vivero donde se detectan los futuros internacionales.',
    it: 'Gli Under 20: il vivaio dove si scoprono i futuri internazionali.',
    de: 'Die U20: das Nachwuchsbecken, in dem künftige Nationalspieler entdeckt werden.',
    pt: 'Os sub-20: o viveiro onde se descobrem os futuros internacionais.',
    ja: 'U20 ——未来の代表選手が見出される育成の場。',
  },
  'ch.competitions': { fr: 'compétition', en: 'competition', es: 'competición', it: 'competizione', de: 'Wettbewerb', pt: 'competição', ja: '大会' },
  'ch.competitions.pluriel': { fr: 'compétitions', en: 'competitions', es: 'competiciones', it: 'competizioni', de: 'Wettbewerbe', pt: 'competições', ja: '大会' },
  'ch.voirEffectif': { fr: 'Voir l’effectif', en: 'View the squad', es: 'Ver la plantilla', it: 'Vedi la rosa', de: 'Kader ansehen', pt: 'Ver o plantel', ja: '選手一覧を見る' },
  'ch.noteClub': { fr: 'Note générale du club', en: 'Club overall rating', es: 'Valoración global del club', it: 'Valutazione generale del club', de: 'Gesamtwertung des Vereins', pt: 'Avaliação geral do clube', ja: 'クラブ総合評価' },

  // --- CRÉATION -----------------------------------------------------------
  'cr.titre': { fr: 'Crée ton joueur', en: 'Create your player', es: 'Crea tu jugador', it: 'Crea il tuo giocatore', de: 'Erstelle deinen Spieler', pt: 'Cria o teu jogador', ja: '選手を作成' },
  'cr.nom': { fr: 'Nom du joueur', en: 'Player name', es: 'Nombre del jugador', it: 'Nome del giocatore', de: 'Spielername', pt: 'Nome do jogador', ja: '選手名' },
  'cr.age': { fr: 'Âge de départ', en: 'Starting age', es: 'Edad inicial', it: 'Età iniziale', de: 'Startalter', pt: 'Idade inicial', ja: '開始年齢' },
  'cr.nation': { fr: 'Nation', en: 'Nation', es: 'Nación', it: 'Nazione', de: 'Nation', pt: 'Nação', ja: '国籍' },
  'cr.championnat': { fr: 'Championnat de départ', en: 'Starting league', es: 'Liga inicial', it: 'Campionato iniziale', de: 'Startliga', pt: 'Liga inicial', ja: '開始リーグ' },
  'cr.club': { fr: 'Club de départ', en: 'Starting club', es: 'Club inicial', it: 'Club iniziale', de: 'Startverein', pt: 'Clube inicial', ja: '開始クラブ' },
  'cr.poste': { fr: 'Poste', en: 'Position', es: 'Posición', it: 'Ruolo', de: 'Position', pt: 'Posição', ja: 'ポジション' },
  'cr.traits': { fr: 'Traits de caractère', en: 'Character traits', es: 'Rasgos de carácter', it: 'Tratti caratteriali', de: 'Charakterzüge', pt: 'Traços de carácter', ja: '性格特性' },
  'cr.lancer': { fr: 'Lancer la carrière', en: 'Start the career', es: 'Comenzar la carrera', it: 'Avvia la carriera', de: 'Karriere starten', pt: 'Iniciar a carreira', ja: 'キャリアを開始' },
  'cr.eyebrow': { fr: 'NOUVELLE CARRIÈRE', en: 'NEW CAREER', es: 'NUEVA CARRERA', it: 'NUOVA CARRIERA', de: 'NEUE KARRIERE', pt: 'NOVA CARREIRA', ja: '新しいキャリア' },

  // --- HALL DES LÉGENDES ET RÉSULTATS -------------------------------------
  'hall.eyebrow': { fr: 'HALL DES LÉGENDES', en: 'HALL OF FAME', es: 'SALÓN DE LA FAMA', it: 'HALL OF FAME', de: 'RUHMESHALLE', pt: 'HALL DA FAMA', ja: '殿堂' },
  'hall.vide': { fr: 'Aucune légende… pour l’instant', en: 'No legends… yet', es: 'Ninguna leyenda… todavía', it: 'Nessuna leggenda… per ora', de: 'Noch keine Legenden', pt: 'Nenhuma lenda… para já', ja: 'まだ伝説はいません' },
  'tb.titre': { fr: 'Résultats en direct', en: 'Live results', es: 'Resultados en directo', it: 'Risultati in diretta', de: 'Live-Ergebnisse', pt: 'Resultados ao vivo', ja: 'ライブ結果' },

  // --- MARCHÉ DES TRANSFERTS ----------------------------------------------
  'of.eyebrow': { fr: 'MARCHÉ DES TRANSFERTS', en: 'TRANSFER MARKET', es: 'MERCADO DE FICHAJES', it: 'MERCATO', de: 'TRANSFERMARKT', pt: 'MERCADO DE TRANSFERÊNCIAS', ja: '移籍市場' },
  'of.titre': { fr: 'Choix de carrière', en: 'Career choices', es: 'Decisiones de carrera', it: 'Scelte di carriera', de: 'Karriereentscheidungen', pt: 'Escolhas de carreira', ja: 'キャリアの選択' },
  'of.agent': { fr: 'Ton agent', en: 'Your agent', es: 'Tu agente', it: 'Il tuo agente', de: 'Dein Berater', pt: 'O teu agente', ja: 'エージェント' },
  'of.tonClub': { fr: 'Ton club', en: 'Your club', es: 'Tu club', it: 'Il tuo club', de: 'Dein Verein', pt: 'O teu clube', ja: '所属クラブ' },
  'of.salaire': { fr: 'Salaire', en: 'Salary', es: 'Salario', it: 'Stipendio', de: 'Gehalt', pt: 'Salário', ja: '年俸' },
  'of.duree': { fr: 'Durée', en: 'Length', es: 'Duración', it: 'Durata', de: 'Laufzeit', pt: 'Duração', ja: '契約期間' },

  // --- ATTRIBUTS ------------------------------------------------------------
  // Lus par `labelAttribut()` (data/rugby.ts). `ATTRIBUTS_LABELS` reste la
  // source française : c'est elle que `lib/groq.ts` envoie au Maître du Jeu.
  'attr.vitesse': { fr: 'Vitesse', en: 'Pace', es: 'Velocidad', it: 'Velocità', de: 'Tempo', pt: 'Velocidade', ja: 'スピード' },
  'attr.force': { fr: 'Force', en: 'Strength', es: 'Fuerza', it: 'Forza', de: 'Kraft', pt: 'Força', ja: 'パワー' },
  'attr.endurance': { fr: 'Endurance', en: 'Stamina', es: 'Resistencia', it: 'Resistenza', de: 'Ausdauer', pt: 'Resistência', ja: 'スタミナ' },
  'attr.plaquage': { fr: 'Plaquage', en: 'Tackling', es: 'Placaje', it: 'Placcaggio', de: 'Tackling', pt: 'Placagem', ja: 'タックル' },
  'attr.passe': { fr: 'Passe', en: 'Passing', es: 'Pase', it: 'Passaggio', de: 'Passspiel', pt: 'Passe', ja: 'パス' },
  'attr.jeuAuPied': { fr: 'Jeu au pied', en: 'Kicking', es: 'Juego al pie', it: 'Gioco al piede', de: 'Kickspiel', pt: 'Jogo ao pé', ja: 'キック' },
  'attr.vision': { fr: 'Vision', en: 'Vision', es: 'Visión', it: 'Visione', de: 'Übersicht', pt: 'Visão', ja: '視野' },
  'attr.mental': { fr: 'Mental', en: 'Composure', es: 'Mentalidad', it: 'Mentalità', de: 'Nervenstärke', pt: 'Mentalidade', ja: 'メンタル' },
  'attr.forme': { fr: 'Forme', en: 'Fitness', es: 'Forma', it: 'Forma', de: 'Form', pt: 'Forma', ja: 'コンディション' },
  'attr.moral': { fr: 'Moral', en: 'Morale', es: 'Moral', it: 'Morale', de: 'Moral', pt: 'Moral', ja: '士気' },
  'attr.reputation': { fr: 'Réputation', en: 'Reputation', es: 'Reputación', it: 'Reputazione', de: 'Ruf', pt: 'Reputação', ja: '評判' },
  'attr.argent': { fr: 'Argent', en: 'Money', es: 'Dinero', it: 'Denaro', de: 'Geld', pt: 'Dinheiro', ja: '資金' },

  // --- LES 15 POSTES --------------------------------------------------------
  // Lus par `nomPoste()`. Les noms suivent l'usage de CHAQUE pays : un pilier
  // gauche est un « loosehead prop » en anglais et un « pilone sinistro » en
  // italien — traduire mot à mot donnerait un jeu qui sonne faux à un rugbyman.
  // ⚠️ `poste.cat.*` et NON `poste.avant`/`poste.arriere` : le poste n° 15
  // s'appelle lui aussi « arriere », et `nomPoste()` compose sa clé avec l'id du
  // poste. Sans ce préfixe, le n° 15 s'afficherait « Back » au lieu de « Fullback ».
  'poste.cat.avant': { fr: 'Avant', en: 'Forward', es: 'Delantero', it: 'Avanti', de: 'Stürmer', pt: 'Avançado', ja: 'フォワード' },
  'poste.cat.arriere': { fr: 'Arrière', en: 'Back', es: 'Trescuartos', it: 'Trequarti', de: 'Hintermannschaft', pt: 'Linha atrasada', ja: 'バックス' },
  'poste.pilier_gauche': { fr: 'Pilier gauche', en: 'Loosehead prop', es: 'Pilar izquierdo', it: 'Pilone sinistro', de: 'Linker Pfeiler', pt: 'Pilar esquerdo', ja: '左プロップ' },
  'poste.talonneur': { fr: 'Talonneur', en: 'Hooker', es: 'Talonador', it: 'Tallonatore', de: 'Hakler', pt: 'Talonador', ja: 'フッカー' },
  'poste.pilier_droit': { fr: 'Pilier droit', en: 'Tighthead prop', es: 'Pilar derecho', it: 'Pilone destro', de: 'Rechter Pfeiler', pt: 'Pilar direito', ja: '右プロップ' },
  'poste.deuxieme_ligne_g': { fr: 'Deuxième ligne (4)', en: 'Lock (4)', es: 'Segunda línea (4)', it: 'Seconda linea (4)', de: 'Zweite Reihe (4)', pt: 'Segunda linha (4)', ja: 'ロック（4番）' },
  'poste.deuxieme_ligne_d': { fr: 'Deuxième ligne (5)', en: 'Lock (5)', es: 'Segunda línea (5)', it: 'Seconda linea (5)', de: 'Zweite Reihe (5)', pt: 'Segunda linha (5)', ja: 'ロック（5番）' },
  'poste.troisieme_aile_g': { fr: 'Troisième ligne aile (6)', en: 'Blindside flanker (6)', es: 'Ala ciega (6)', it: 'Flanker cieco (6)', de: 'Blindside-Flügelstürmer (6)', pt: 'Asa fechada (6)', ja: 'ブラインドサイドFL（6番）' },
  'poste.troisieme_aile_d': { fr: 'Troisième ligne aile (7)', en: 'Openside flanker (7)', es: 'Ala abierta (7)', it: 'Flanker aperto (7)', de: 'Openside-Flügelstürmer (7)', pt: 'Asa aberta (7)', ja: 'オープンサイドFL（7番）' },
  'poste.numero_8': { fr: 'Numéro 8', en: 'Number 8', es: 'Número 8', it: 'Numero 8', de: 'Nummer 8', pt: 'Número 8', ja: 'ナンバーエイト' },
  'poste.demi_melee': { fr: 'Demi de mêlée', en: 'Scrum-half', es: 'Medio melé', it: 'Mediano di mischia', de: 'Gedrängehalb', pt: 'Médio de formação', ja: 'スクラムハーフ' },
  'poste.demi_ouverture': { fr: 'Demi d’ouverture', en: 'Fly-half', es: 'Apertura', it: 'Mediano d’apertura', de: 'Verbinder', pt: 'Médio de abertura', ja: 'スタンドオフ' },
  'poste.ailier_gauche': { fr: 'Ailier gauche', en: 'Left wing', es: 'Ala izquierda', it: 'Ala sinistra', de: 'Linker Flügel', pt: 'Ponta esquerda', ja: '左ウイング' },
  'poste.premier_centre': { fr: 'Premier centre', en: 'Inside centre', es: 'Primer centro', it: 'Primo centro', de: 'Innendreiviertel', pt: 'Primeiro centro', ja: 'インサイドセンター' },
  'poste.deuxieme_centre': { fr: 'Deuxième centre', en: 'Outside centre', es: 'Segundo centro', it: 'Secondo centro', de: 'Außendreiviertel', pt: 'Segundo centro', ja: 'アウトサイドセンター' },
  'poste.ailier_droit': { fr: 'Ailier droit', en: 'Right wing', es: 'Ala derecha', it: 'Ala destra', de: 'Rechter Flügel', pt: 'Ponta direita', ja: '右ウイング' },
  'poste.arriere': { fr: 'Arrière', en: 'Fullback', es: 'Zaguero', it: 'Estremo', de: 'Schlussmann', pt: 'Defesa', ja: 'フルバック' },

  // Les descriptions de poste (écran de création).
  'poste.pilier_gauche.desc': {
    fr: 'Le pilier « tête close ». Il encaisse toute la poussée adverse en mêlée.',
    en: 'The loosehead. He absorbs the whole opposition shove at scrum time.',
    es: 'El pilar de cabeza libre. Aguanta todo el empuje rival en la melé.',
    it: 'Il pilone «testa chiusa». Regge tutta la spinta avversaria in mischia.',
    de: 'Der Loosehead. Er fängt den gesamten gegnerischen Druck im Gedränge ab.',
    pt: 'O pilar de cabeça solta. Aguenta toda a pressão adversária na formação.',
    ja: 'ルースヘッド。スクラムで相手の押しをすべて受け止める。',
  },
  'poste.talonneur.desc': {
    fr: 'Cœur de la mêlée et lanceur en touche. Technique et gnaque.',
    en: 'The heart of the scrum and the lineout thrower. Craft and bite.',
    es: 'Corazón de la melé y lanzador en el line. Técnica y garra.',
    it: 'Cuore della mischia e lanciatore in touche. Tecnica e grinta.',
    de: 'Herz des Gedränges und Einwerfer in der Gasse. Technik und Biss.',
    pt: 'Coração da formação e lançador no alinhamento. Técnica e raça.',
    ja: 'スクラムの中心にしてラインアウトの投げ手。技術と気迫。',
  },
  'poste.pilier_droit.desc': {
    fr: 'Le pilier « tête libre ». Puissance brute et travail de l’ombre.',
    en: 'The tighthead. Raw power and work nobody sees.',
    es: 'El pilar de cabeza cerrada. Potencia bruta y trabajo de sombra.',
    it: 'Il pilone «testa libera». Potenza bruta e lavoro oscuro.',
    de: 'Der Tighthead. Rohe Kraft und Arbeit im Verborgenen.',
    pt: 'O pilar de cabeça presa. Potência bruta e trabalho de sombra.',
    ja: 'タイトヘッド。純粋な力と、誰も見ない仕事。',
  },
  'poste.deuxieme_ligne_g.desc': {
    fr: 'La tour. Domine les airs en touche, abat un travail colossal.',
    en: 'The tower. He owns the air at lineout time and does a colossal shift.',
    es: 'La torre. Domina el aire en el line y hace un trabajo colosal.',
    it: 'La torre. Domina l’aria in touche e macina un lavoro colossale.',
    de: 'Der Turm. Beherrscht die Luft in der Gasse, leistet enorme Arbeit.',
    pt: 'A torre. Domina o ar no alinhamento e faz um trabalho colossal.',
    ja: '塔。ラインアウトで空中を支配し、膨大な仕事量をこなす。',
  },
  'poste.deuxieme_ligne_d.desc': {
    fr: 'Sauteur en touche et moteur de la mêlée.',
    en: 'Lineout jumper and engine of the scrum.',
    es: 'Saltador en el line y motor de la melé.',
    it: 'Saltatore in touche e motore della mischia.',
    de: 'Springer in der Gasse und Motor des Gedränges.',
    pt: 'Saltador no alinhamento e motor da formação.',
    ja: 'ラインアウトのジャンパーにしてスクラムの原動力。',
  },
  'poste.troisieme_aile_g.desc': {
    fr: 'Le flanker. Premier sur le ballon, plaqueur infatigable.',
    en: 'The flanker. First to the ball, a tireless tackler.',
    es: 'El ala. Primero al balón, placador incansable.',
    it: 'Il flanker. Primo sul pallone, placcatore instancabile.',
    de: 'Der Flanker. Als Erster am Ball, unermüdlich im Tackling.',
    pt: 'O asa. Primeiro na bola, placador incansável.',
    ja: 'フランカー。誰より早くボールに絡み、倒れないタックラー。',
  },
  'poste.troisieme_aile_d.desc': {
    fr: 'Le gratteur. Il vit sur les ballons au sol.',
    en: 'The jackal. He lives off the ball on the ground.',
    es: 'El robador. Vive de los balones en el suelo.',
    it: 'Il predatore. Vive sui palloni a terra.',
    de: 'Der Jackal. Er lebt von den Bällen am Boden.',
    pt: 'O ladrão de bolas. Vive das bolas no chão.',
    ja: 'ジャッカル。地上のボールで生きる男。',
  },
  'poste.numero_8.desc': {
    fr: 'Le porteur de balle. Il lance le jeu en base de mêlée.',
    en: 'The ball carrier. He launches the play from the base of the scrum.',
    es: 'El portador. Lanza el juego desde la base de la melé.',
    it: 'Il portatore. Lancia il gioco alla base della mischia.',
    de: 'Der Ballträger. Er eröffnet das Spiel am Gedrängefuß.',
    pt: 'O portador de bola. Lança o jogo na base da formação.',
    ja: 'ボールキャリアー。スクラム基部から攻撃を始動する。',
  },
  'poste.demi_melee.desc': {
    fr: 'Le chef d’orchestre. Vitesse de passe et vision du jeu.',
    en: 'The conductor. Speed of pass and a reading of the game.',
    es: 'El director de orquesta. Velocidad de pase y visión de juego.',
    it: 'Il direttore d’orchestra. Velocità di passaggio e visione di gioco.',
    de: 'Der Dirigent. Schnelles Passspiel und Spielübersicht.',
    pt: 'O maestro. Velocidade de passe e visão de jogo.',
    ja: '司令塔。パスの速さと、試合を読む目。',
  },
  'poste.demi_ouverture.desc': {
    fr: 'Le stratège et le buteur. Il dicte le tempo.',
    en: 'The strategist and the goal-kicker. He sets the tempo.',
    es: 'El estratega y el pateador. Dicta el tempo.',
    it: 'Lo stratega e il calciatore. Detta il tempo.',
    de: 'Der Stratege und Kicker. Er gibt das Tempo vor.',
    pt: 'O estratega e o pontapeador. Dita o ritmo.',
    ja: '戦術家にしてキッカー。試合のテンポを決める。',
  },
  'poste.ailier_gauche.desc': {
    fr: 'La foudre. Vitesse pure et finition dans le coin.',
    en: 'Lightning. Pure speed and a finish in the corner.',
    es: 'El rayo. Velocidad pura y definición en el rincón.',
    it: 'Il fulmine. Velocità pura e finalizzazione in bandierina.',
    de: 'Der Blitz. Reines Tempo und der Abschluss in der Ecke.',
    pt: 'O relâmpago. Velocidade pura e finalização no canto.',
    ja: '稲妻。純粋なスピードと、コーナーでの仕留め。',
  },
  'poste.premier_centre.desc': {
    fr: 'Le percuteur. Il casse la ligne d’avantage.',
    en: 'The battering ram. He breaks the gain line.',
    es: 'El ariete. Rompe la línea de ventaja.',
    it: 'L’ariete. Spezza la linea del vantaggio.',
    de: 'Der Rammbock. Er durchbricht die Vorteilslinie.',
    pt: 'O aríete. Quebra a linha de vantagem.',
    ja: '突進役。ゲインラインを切り裂く。',
  },
  'poste.deuxieme_centre.desc': {
    fr: 'Le lanceur d’attaque. Prise d’intervalle et vitesse.',
    en: 'The attack starter. He finds the gap, and he has the legs.',
    es: 'El lanzador del ataque. Toma el hueco y corre.',
    it: 'Il lanciatore dell’attacco. Trova il varco e ha la gamba.',
    de: 'Der Angriffsauslöser. Er findet die Lücke und hat das Tempo.',
    pt: 'O lançador do ataque. Encontra o espaço e tem pernas.',
    ja: '攻撃の起点。ギャップを突き、走り切る。',
  },
  'poste.ailier_droit.desc': {
    fr: 'Le finisseur. Il vit pour l’essai.',
    en: 'The finisher. He lives for the try.',
    es: 'El finalizador. Vive para el ensayo.',
    it: 'Il finalizzatore. Vive per la meta.',
    de: 'Der Vollstrecker. Er lebt für den Versuch.',
    pt: 'O finalizador. Vive para o ensaio.',
    ja: 'フィニッシャー。トライのためだけに生きる。',
  },
  'poste.arriere.desc': {
    fr: 'Le dernier rempart. Jeu au pied, relance et courage sous les chandelles.',
    en: 'The last line. Kicking, counter-attack, and courage under the high ball.',
    es: 'El último bastión. Juego al pie, contraataque y valor bajo los bombeos.',
    it: 'L’ultimo baluardo. Gioco al piede, rilancio e coraggio sotto i palloni alti.',
    de: 'Das letzte Bollwerk. Kickspiel, Konter und Mut unter hohen Bällen.',
    pt: 'O último reduto. Jogo ao pé, contra-ataque e coragem sob as bolas altas.',
    ja: '最後の砦。キック、カウンター、そしてハイボールの下での勇気。',
  },

};
