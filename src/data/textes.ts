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

export const TEXTES: Record<string, Traduction> = {
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

  // --- BOUTIQUE / HALL / CLASSEMENT ---------------------------------------
  'bo.titre': { fr: 'Boutique', en: 'Shop', es: 'Tienda', it: 'Negozio', de: 'Shop', pt: 'Loja', ja: 'ショップ' },
  'bo.acheter': { fr: 'Acheter', en: 'Buy', es: 'Comprar', it: 'Acquista', de: 'Kaufen', pt: 'Comprar', ja: '購入' },
  'bo.equipe': { fr: 'Équipé', en: 'Equipped', es: 'Equipado', it: 'Equipaggiato', de: 'Ausgerüstet', pt: 'Equipado', ja: '装備中' },
  'bo.choisir': { fr: 'Choisir', en: 'Select', es: 'Elegir', it: 'Scegli', de: 'Wählen', pt: 'Escolher', ja: '選択' },
  'hall.titre': { fr: 'Panthéon', en: 'Hall of Fame', es: 'Panteón', it: 'Pantheon', de: 'Ruhmeshalle', pt: 'Panteão', ja: '殿堂' },
  'clst.titre': { fr: 'Classement des légendes', en: 'Legends leaderboard', es: 'Clasificación de leyendas', it: 'Classifica delle leggende', de: 'Rangliste der Legenden', pt: 'Classificação das lendas', ja: 'レジェンド ランキング' },

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
};
