import type { Traduction } from '../lib/i18n.js';

// LES TEXTES DU TUTORIEL GUIDÉ — l'interface de la bulle et l'introduction générale (Correctif 18).
//
// ⚠️ SEPT LANGUES POUR CHAQUE CLÉ, ET LES MÊMES VARIABLES PARTOUT (`npm run verify:traductions`).
// ⚠️ LES CLÉS D'ÉTAPE SONT CONSTRUITES À L'EXÉCUTION : `tg.<parcours>.<étape>.x` (la phrase) et `.t` (le titre, quand l'étape
//    en a un). Elles s'écrivent TOUTES dans les fichiers `textesTutoriel*.ts`, jamais ailleurs.
// ⚠️ UNE PHRASE PAR BULLE. Une bulle qui demande de lire trois lignes est une bulle qu'on ferme.

const tr = (fr: string, en: string, es: string, it: string, de: string, pt: string, ja: string): Traduction => (
  { fr, en, es, it, de, pt, ja }
);

export const TEXTES_TUTORIEL_GENERAL: Record<string, Traduction> = {
  // ═══ L'INTERFACE DE LA BULLE ═══════════════════════════════════════════════
  'tg.ui.passer': tr('Passer', 'Skip', 'Omitir', 'Salta', 'Überspringen', 'Saltar', 'スキップ'),
  'tg.ui.suivant': tr('Suivant', 'Next', 'Siguiente', 'Avanti', 'Weiter', 'Seguinte', '次へ'),
  'tg.ui.retour': tr('Retour', 'Back', 'Atrás', 'Indietro', 'Zurück', 'Voltar', '戻る'),
  'tg.ui.terminer': tr('Terminer', 'Finish', 'Terminar', 'Fine', 'Fertig', 'Concluir', '完了'),
  'tg.ui.ok': tr('Compris', 'Got it', 'Entendido', 'Capito', 'Verstanden', 'Entendi', 'OK'),
  'tg.ui.plusTard': tr('Plus tard', 'Later', 'Más tarde', 'Più tardi', 'Später', 'Mais tarde', 'あとで'),
  'tg.ui.commencer': tr('C’est parti', 'Let’s go', '¡Vamos!', 'Andiamo', 'Los geht’s', 'Vamos lá', 'はじめる'),
  'tg.ui.clic': tr('Touche l’élément en surbrillance pour continuer.', 'Tap the highlighted item to continue.', 'Toca el elemento resaltado para continuar.', 'Tocca l’elemento evidenziato per continuare.', 'Tippe auf das markierte Element, um fortzufahren.', 'Toca no elemento destacado para continuar.', '光っている部分をタップして続けましょう。'),
  'tg.ui.action': tr('Fais l’action demandée pour continuer.', 'Do what’s asked to continue.', 'Haz lo que se pide para continuar.', 'Fai ciò che è richiesto per continuare.', 'Führe die Aktion aus, um fortzufahren.', 'Faz o que é pedido para continuar.', '案内された操作をして続けましょう。'),
  'tg.ui.etape': tr('Étape {n} sur {total}', 'Step {n} of {total}', 'Paso {n} de {total}', 'Passo {n} di {total}', 'Schritt {n} von {total}', 'Passo {n} de {total}', '{total}ステップ中{n}'),
  'tg.ui.desactiver': tr('Ne plus afficher les tutoriels', 'Stop showing tutorials', 'No mostrar más tutoriales', 'Non mostrare più i tutorial', 'Keine Tutorials mehr anzeigen', 'Deixar de mostrar tutoriais', 'チュートリアルを表示しない'),

  // ═══ L'INTRODUCTION GÉNÉRALE ═══════════════════════════════════════════════
  'tg.general.intro.bienvenue.t': tr('Bienvenue sur Destiny Rugby', 'Welcome to Destiny Rugby', 'Bienvenido a Destiny Rugby', 'Benvenuto in Destiny Rugby', 'Willkommen bei Destiny Rugby', 'Bem-vindo ao Destiny Rugby', 'Destiny Rugbyへようこそ'),
  'tg.general.intro.bienvenue.x': tr('Trois façons de vivre le rugby. Deux minutes, sur les vrais écrans du jeu : on te montre, tu fais.', 'Three ways to live rugby. Two minutes, on the game’s real screens: we show you, you do it.', 'Tres formas de vivir el rugby. Dos minutos, en las pantallas reales del juego: te enseñamos y tú lo haces.', 'Tre modi di vivere il rugby. Due minuti, sulle schermate vere del gioco: ti mostriamo, tu fai.', 'Drei Arten, Rugby zu erleben. Zwei Minuten auf den echten Bildschirmen des Spiels: Wir zeigen es dir, du machst es.', 'Três formas de viver o rugby. Dois minutos, nos ecrãs reais do jogo: nós mostramos, tu fazes.', 'ラグビーの楽しみ方は3つ。実際の画面で2分だけ、見せるので、やってみてください。'),
  'tg.general.intro.modes.t': tr('Par où veux-tu commencer ?', 'Where do you want to start?', '¿Por dónde quieres empezar?', 'Da dove vuoi cominciare?', 'Womit möchtest du beginnen?', 'Por onde queres começar?', 'どこから始めますか？'),
  'tg.general.intro.modes.x': tr('Chaque mode a son propre guide, qui t’accompagne pas à pas quand tu y entres.', 'Each mode has its own guide, which walks you through it step by step.', 'Cada modo tiene su propia guía, que te acompaña paso a paso.', 'Ogni modalità ha la sua guida, che ti accompagna passo dopo passo.', 'Jeder Modus hat seine eigene Anleitung, die dich Schritt für Schritt begleitet.', 'Cada modo tem o seu guia, que te acompanha passo a passo.', 'モードごとに専用のガイドがあり、一歩ずつご案内します。'),
  'tg.general.choix.ligue.t': tr('Ligue en ligne', 'Online league', 'Liga en línea', 'Lega online', 'Online-Liga', 'Liga online', 'オンラインリーグ'),
  'tg.general.choix.ligue.x': tr('Rejoins ou crée une ligue entre amis : packs, composition, marché et matchs de 80 minutes en temps réel.', 'Join or create a league with friends: packs, line-ups, market and real-time 80-minute matches.', 'Únete o crea una liga con amigos: sobres, alineación, mercado y partidos de 80 minutos en tiempo real.', 'Entra o crea una lega con gli amici: pacchetti, formazione, mercato e partite da 80 minuti in tempo reale.', 'Tritt einer Liga bei oder gründe eine mit Freunden: Packs, Aufstellung, Markt und 80-Minuten-Spiele in Echtzeit.', 'Junta-te ou cria uma liga com amigos: packs, equipa, mercado e jogos de 80 minutos em tempo real.', '友だちとリーグに参加・作成。パック、編成、移籍市場、リアルタイムの80分マッチ。'),
  'tg.general.choix.joueur.t': tr('Carrière Joueur', 'Player career', 'Carrera de jugador', 'Carriera da giocatore', 'Spielerkarriere', 'Carreira de jogador', '選手キャリア'),
  'tg.general.choix.joueur.x': tr('Crée ton joueur, gagne ta place de titulaire et conduis-le toi-même sur le terrain, match après match.', 'Create your player, earn a starting spot and take control on the pitch, match after match.', 'Crea a tu jugador, gánate un puesto de titular y conduce tú mismo en el campo, partido a partido.', 'Crea il tuo giocatore, conquista un posto da titolare e guidalo tu stesso in campo, partita dopo partita.', 'Erschaffe deinen Spieler, erkämpfe dir einen Stammplatz und steuere ihn selbst auf dem Platz, Spiel für Spiel.', 'Cria o teu jogador, conquista um lugar de titular e conduz tu mesmo em campo, jogo após jogo.', '選手を作り、先発の座をつかみ、試合ごとに自分の手でピッチを駆け回ろう。'),
  'tg.general.choix.coach.t': tr('Carrière Entraîneur', 'Coach career', 'Carrera de entrenador', 'Carriera da allenatore', 'Trainerkarriere', 'Carreira de treinador', '監督キャリア'),
  'tg.general.choix.coach.x': tr('Dirige un club : effectif, tactique, finances, entraînement et décisions pendant le match.', 'Run a club: squad, tactics, finances, training and in-match decisions.', 'Dirige un club: plantilla, táctica, finanzas, entrenamiento y decisiones durante el partido.', 'Guida un club: rosa, tattica, finanze, allenamento e decisioni durante la partita.', 'Leite einen Verein: Kader, Taktik, Finanzen, Training und Entscheidungen im Spiel.', 'Dirige um clube: plantel, tática, finanças, treino e decisões durante o jogo.', 'クラブを率いる。選手層、戦術、財務、トレーニング、試合中の判断。'),
  // ═══ LA SECTION « TUTORIELS » DES RÉGLAGES ═════════════════════════════════
  'tg.reg.titre': tr('Tutoriels', 'Tutorials', 'Tutoriales', 'Tutorial', 'Tutorials', 'Tutoriais', 'チュートリアル'),
  'tg.reg.aide': tr('Rejoue un guide à tout moment : il repart du début, sur le vrai écran.', 'Replay a guide any time: it starts over from the beginning, on the real screen.', 'Repite una guía cuando quieras: empieza desde el principio, en la pantalla real.', 'Rigioca una guida quando vuoi: riparte dall’inizio, sulla schermata vera.', 'Spiele eine Anleitung jederzeit erneut ab: Sie beginnt von vorn, auf dem echten Bildschirm.', 'Repete um guia quando quiseres: recomeça do início, no ecrã real.', 'ガイドはいつでもやり直せます。実際の画面で最初から始まります。'),
  'tg.reg.desactiver': tr('Désactiver les tutoriels', 'Turn tutorials off', 'Desactivar los tutoriales', 'Disattiva i tutorial', 'Tutorials ausschalten', 'Desativar os tutoriais', 'チュートリアルをオフにする'),
  'tg.reg.desactiverAide': tr('Plus aucune bulle d’aide, y compris pendant les matchs. Ce que tu as déjà vu reste vu : en les réactivant, rien ne se rejoue.', 'No more help bubbles, matches included. What you’ve already seen stays seen: turning them back on replays nothing.', 'Ni una burbuja de ayuda más, tampoco en los partidos. Lo que ya viste sigue visto: al reactivarlos no se repite nada.', 'Niente più fumetti di aiuto, nemmeno durante le partite. Ciò che hai già visto resta visto: riattivandoli non si rigioca nulla.', 'Keine Hilfeblasen mehr, auch nicht in Spielen. Was du schon gesehen hast, bleibt gesehen: Beim Wiedereinschalten wird nichts wiederholt.', 'Nenhum balão de ajuda, nem durante os jogos. O que já viste fica visto: ao reativá-los, nada se repete.', 'ヘルプの吹き出しは試合中も含めて表示されません。すでに見た内容は既読のままで、再びオンにしても繰り返されません。'),
  'tg.reg.general': tr('Introduction générale', 'General introduction', 'Introducción general', 'Introduzione generale', 'Allgemeine Einführung', 'Introdução geral', '全体の紹介'),
  'tg.reg.ligue': tr('Ligue en ligne', 'Online league', 'Liga en línea', 'Lega online', 'Online-Liga', 'Liga online', 'オンラインリーグ'),
  'tg.reg.joueur': tr('Carrière Joueur', 'Player career', 'Carrera de jugador', 'Carriera da giocatore', 'Spielerkarriere', 'Carreira de jogador', '選手キャリア'),
  'tg.reg.entraineur': tr('Carrière Entraîneur', 'Coach career', 'Carrera de entrenador', 'Carriera da allenatore', 'Trainerkarriere', 'Carreira de treinador', '監督キャリア'),
  'tg.reg.match': tr('Tutoriel de match', 'Match tutorial', 'Tutorial de partido', 'Tutorial della partita', 'Spiel-Tutorial', 'Tutorial de jogo', '試合のチュートリアル'),
  'tg.reg.matchRelance': tr('C’est noté : les cartes d’explication du match reviendront à ta prochaine rencontre.', 'Noted: the match explanation cards will be back at your next match.', 'Anotado: las cartas explicativas del partido volverán en tu próximo encuentro.', 'Fatto: le carte di spiegazione della partita torneranno alla prossima gara.', 'Notiert: Die Erklärkarten des Spiels kommen bei deinem nächsten Spiel wieder.', 'Anotado: os cartões explicativos do jogo voltam no teu próximo jogo.', '了解しました。試合の解説カードは次の試合で再び表示されます。'),
};
