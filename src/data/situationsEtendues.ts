// 500 situations de vie supplémentaires, entièrement disponibles dans les
// sept langues du jeu.
//
// Le catalogue reste compact grâce à une composition éditoriale contrôlée :
// 80 intrigues propres au rugby sont croisées avec 6 ou 7 complications
// cohérentes. Chaque combinaison possède un id, trois décisions, un récit et
// des impacts déterministes. Il ne s'agit donc pas de doublons ajoutés sous des
// noms différents, mais de 500 scènes réellement tirables par le moteur.

import type { Langue, Traduction } from '../lib/i18n';
import type { StatVariable } from '../types';
import type { IssueSituation, Situation } from './situations';

type Localise = Record<Langue, string>;
type Categorie = Situation['categorie'];
type Deltas = Partial<Record<StatVariable, number>>;

const L = (
  fr: string, en: string, es: string, it: string,
  de: string, pt: string, ja: string,
): Localise => ({ fr, en, es, it, de, pt, ja });

interface Sujet {
  id: string;
  titre: Localise;
  scene: Localise;
}

interface Relance {
  id: string;
  titre: Localise;
  texte: Localise;
}

interface Approche {
  choix: Localise;
  recit: Localise;
  deltas: Deltas;
  ovas: number;
  extras?: Omit<IssueSituation, 'recit' | 'deltas' | 'ovas'>;
  /** 1 = bénéfique, 0 = compromis, -1 = risqué. */
  orientation: 1 | 0 | -1;
}

interface Theme {
  categorie: Categorie;
  emoji: string;
  sujets: Sujet[];
  relances: string[];
  approches: Approche[];
  poids: number;
}

const sujet = (id: string, titre: Localise, scene: Localise): Sujet => ({ id, titre, scene });
const approche = (
  choix: Localise, recit: Localise, deltas: Deltas, ovas: number,
  orientation: 1 | 0 | -1,
  extras?: Omit<IssueSituation, 'recit' | 'deltas' | 'ovas'>,
): Approche => ({ choix, recit, deltas, ovas, orientation, ...(extras ? { extras } : {}) });

const RELANCES: Record<string, Relance> = Object.fromEntries(([
  {
    id: 'urgence',
    titre: L('avant ce soir', 'before tonight', 'antes de esta noche', 'entro stasera', 'noch heute', 'antes desta noite', '今夜まで'),
    texte: L(
      'Une réponse définitive est attendue avant ce soir.',
      'A final answer is expected before tonight.',
      'Esperan una respuesta definitiva antes de esta noche.',
      'Si aspettano una risposta definitiva entro stasera.',
      'Noch heute wird eine endgültige Antwort erwartet.',
      'É esperada uma resposta definitiva antes desta noite.',
      '今夜までに最終回答を求められている。',
    ),
  },
  {
    id: 'public',
    titre: L('déjà public', 'already public', 'ya es público', 'già pubblico', 'bereits öffentlich', 'já é público', 'すでに公に'),
    texte: L(
      'Une capture circule déjà sur les réseaux et chacun attend ta réaction.',
      'A screenshot is already circulating online and everyone is waiting for your reaction.',
      'Ya circula una captura en las redes y todos esperan tu reacción.',
      'Uno screenshot circola già online e tutti aspettano la tua reazione.',
      'Ein Screenshot kursiert bereits online, und alle warten auf deine Reaktion.',
      'Já circula uma captura nas redes e todos esperam a tua reação.',
      'スクリーンショットがSNSで拡散し、皆が君の反応を待っている。',
    ),
  },
  {
    id: 'conflit',
    titre: L('deux camps', 'two sides', 'dos bandos', 'due fazioni', 'zwei Lager', 'dois lados', '二つの陣営'),
    texte: L(
      'Deux camps opposés se forment et te demandent désormais de trancher.',
      'Two opposing sides have formed and now want you to decide.',
      'Se han formado dos bandos opuestos y ahora te piden que decidas.',
      'Si sono formate due fazioni opposte e ora chiedono a te di decidere.',
      'Zwei gegnerische Lager haben sich gebildet und verlangen nun deine Entscheidung.',
      'Formaram-se dois lados opostos e agora pedem-te que decidas.',
      '意見が真っ二つに割れ、君が決断を求められている。',
    ),
  },
  {
    id: 'moyens',
    titre: L('sans marge', 'no room to spare', 'sin margen', 'senza margine', 'ohne Spielraum', 'sem margem', '余裕なし'),
    texte: L(
      'Le temps et les moyens disponibles sont bien plus limités que prévu.',
      'The available time and resources are far more limited than expected.',
      'El tiempo y los medios disponibles son mucho más limitados de lo previsto.',
      'Il tempo e le risorse disponibili sono molto più limitati del previsto.',
      'Zeit und Mittel sind deutlich knapper als erwartet.',
      'O tempo e os meios disponíveis são muito mais limitados do que o previsto.',
      '使える時間も手段も、予想以上に限られている。',
    ),
  },
  {
    id: 'temoin',
    titre: L('sous les yeux d’un jeune', 'with a youngster watching', 'ante un joven', 'davanti a un giovane', 'vor den Augen eines Talents', 'com um jovem a observar', '若手が見ている'),
    texte: L(
      'Un jeune du centre observe ta réaction et prendra clairement exemple sur toi.',
      'An academy youngster is watching and will clearly follow your example.',
      'Un joven de la cantera observa tu reacción y está claro que seguirá tu ejemplo.',
      'Un giovane del vivaio osserva la tua reazione e prenderà chiaramente esempio da te.',
      'Ein Nachwuchsspieler beobachtet dich und wird sich eindeutig an dir orientieren.',
      'Um jovem da formação observa a tua reação e vai claramente seguir o teu exemplo.',
      'アカデミーの若手が反応を見つめ、君を手本にしようとしている。',
    ),
  },
  {
    id: 'passe',
    titre: L('un précédent revient', 'an old case returns', 'vuelve un precedente', 'torna un precedente', 'ein alter Fall kehrt zurück', 'um caso antigo regressa', '過去の一件が再燃'),
    texte: L(
      'Un épisode semblable, mal réglé la saison passée, refait soudain surface.',
      'A similar incident, badly handled last season, has suddenly resurfaced.',
      'De repente reaparece un episodio parecido que se gestionó mal la temporada pasada.',
      'Riaffiora all’improvviso un episodio simile, gestito male la scorsa stagione.',
      'Ein ähnlicher, in der vergangenen Saison schlecht gelöster Vorfall taucht wieder auf.',
      'Um episódio semelhante, mal resolvido na época passada, volta de repente.',
      '昨季うまく収められなかった似た問題が、突然また浮上した。',
    ),
  },
  {
    id: 'fuite',
    titre: L('menace de fuite', 'threat of a leak', 'amenaza de filtración', 'minaccia di fuga di notizie', 'drohendes Leak', 'ameaça de fuga', '情報流出の危機'),
    texte: L(
      'Un message anonyme menace de publier tout le dossier si personne ne bouge.',
      'An anonymous message threatens to publish the whole case unless someone acts.',
      'Un mensaje anónimo amenaza con publicar todo el caso si nadie actúa.',
      'Un messaggio anonimo minaccia di pubblicare tutto il dossier se nessuno agirà.',
      'Eine anonyme Nachricht droht, den gesamten Vorgang zu veröffentlichen, falls niemand handelt.',
      'Uma mensagem anónima ameaça publicar todo o caso se ninguém agir.',
      '匿名メッセージが、誰も動かなければ全情報を公開すると脅している。',
    ),
  },
  {
    id: 'compromis',
    titre: L('une porte entrouverte', 'a door left open', 'una puerta entreabierta', 'una porta socchiusa', 'eine offene Tür', 'uma porta entreaberta', '残された妥協案'),
    texte: L(
      'Le club propose un compromis imparfait, valable seulement pour cette semaine.',
      'The club offers an imperfect compromise that is only valid this week.',
      'El club propone un compromiso imperfecto que solo vale esta semana.',
      'Il club propone un compromesso imperfetto, valido solo questa settimana.',
      'Der Verein bietet einen unvollkommenen Kompromiss an, der nur diese Woche gilt.',
      'O clube propõe um compromisso imperfeito, válido apenas esta semana.',
      'クラブから、今週だけ有効な不完全な妥協案が示された。',
    ),
  },
] satisfies Relance[]).map((r) => [r.id, r]));

// Les quatre attitudes propres à chaque univers empêchent les choix génériques
// et portent l'équilibrage. Trois sont retenues par scène, en alternance.
const APPROCHES: Record<Categorie, Approche[]> = {
  vestiaire: [
    approche(
      L('Prendre la parole et assumer la décision.', 'Speak up and own the decision.', 'Tomar la palabra y asumir la decisión.', 'Prendere la parola e assumersi la decisione.', 'Das Wort ergreifen und die Entscheidung verantworten.', 'Tomar a palavra e assumir a decisão.', '声を上げ、決断の責任を負う。'),
      L('Tu poses une ligne claire. Tout le monde n’applaudit pas, mais le groupe sait enfin où il va.', 'You draw a clear line. Not everyone applauds, but the group finally knows where it is going.', 'Marcas una línea clara. No todos aplauden, pero el grupo por fin sabe adónde va.', 'Tracci una linea chiara. Non tutti applaudono, ma il gruppo finalmente sa dove andare.', 'Du ziehst eine klare Linie. Nicht alle applaudieren, aber die Gruppe kennt endlich die Richtung.', 'Traças uma linha clara. Nem todos aplaudem, mas o grupo sabe finalmente para onde vai.', '明確な一線を示した。全員が賛成ではないが、チームは進む方向を得た。'),
      { mental: 2, reputation: 2 }, 4, 1, { coach: 4 },
    ),
    approche(
      L('Écouter chacun avant de construire un accord.', 'Hear everyone out before building an agreement.', 'Escuchar a todos antes de construir un acuerdo.', 'Ascoltare tutti prima di costruire un accordo.', 'Alle anhören und dann eine Einigung aufbauen.', 'Ouvir todos antes de construir um acordo.', '全員の話を聞いてから合意を作る。'),
      L('La discussion prend du temps, mais une solution que personne ne subit finit par émerger.', 'The discussion takes time, but a solution nobody feels forced into eventually emerges.', 'La conversación lleva tiempo, pero acaba surgiendo una solución que nadie siente impuesta.', 'La discussione richiede tempo, ma alla fine emerge una soluzione che nessuno subisce.', 'Das Gespräch dauert, doch am Ende entsteht eine Lösung, die niemandem aufgezwungen wird.', 'A conversa demora, mas acaba por surgir uma solução que ninguém sente como imposta.', '時間はかかったが、誰にも押しつけにならない解決策が生まれた。'),
      { moral: 6, vision: 1 }, 5, 1, { coach: 2 },
    ),
    approche(
      L('Détendre l’atmosphère avec une idée inattendue.', 'Defuse the tension with an unexpected idea.', 'Rebajar la tensión con una idea inesperada.', 'Allentare la tensione con un’idea inattesa.', 'Die Spannung mit einer unerwarteten Idee lösen.', 'Aliviar a tensão com uma ideia inesperada.', '意外なアイデアで空気を和らげる。'),
      L('Ton idée surprend, puis rassemble. Le vestiaire transforme le problème en souvenir commun.', 'Your idea surprises everyone, then brings them together. The dressing room turns the problem into a shared memory.', 'Tu idea sorprende y después une. El vestuario convierte el problema en un recuerdo común.', 'La tua idea sorprende e poi unisce. Lo spogliatoio trasforma il problema in un ricordo comune.', 'Deine Idee überrascht und verbindet. Die Kabine macht aus dem Problem eine gemeinsame Erinnerung.', 'A tua ideia surpreende e depois une. O balneário transforma o problema numa memória comum.', '皆を驚かせた案が、やがて一つにした。問題はチーム共通の思い出になった。'),
      { moral: 5, popularite: 3 }, 4, 0, { fans: 3 },
    ),
    approche(
      L('Rester en retrait et laisser le staff gérer.', 'Step back and let the staff handle it.', 'Mantenerte al margen y dejar que el cuerpo técnico lo gestione.', 'Restare in disparte e lasciare gestire lo staff.', 'Dich heraushalten und den Staff machen lassen.', 'Ficar de fora e deixar a equipa técnica resolver.', '距離を置き、スタッフに任せる。'),
      L('Tu évites le conflit immédiat, mais plusieurs coéquipiers retiennent surtout ton silence.', 'You avoid the immediate conflict, but several teammates mainly remember your silence.', 'Evitas el conflicto inmediato, pero varios compañeros recuerdan sobre todo tu silencio.', 'Eviti il conflitto immediato, ma diversi compagni ricordano soprattutto il tuo silenzio.', 'Du vermeidest den direkten Konflikt, doch mehrere Mitspieler merken sich vor allem dein Schweigen.', 'Evitas o conflito imediato, mas vários colegas recordam sobretudo o teu silêncio.', '目先の衝突は避けたが、何人もの仲間に沈黙だけが残った。'),
      { forme: 2, moral: -4 }, 1, -1, { coach: -3 },
    ),
  ],
  argent: [
    approche(
      L('Faire vérifier chaque ligne par un expert indépendant.', 'Have every line checked by an independent expert.', 'Hacer revisar cada línea por un experto independiente.', 'Far controllare ogni riga da un esperto indipendente.', 'Jede Zeile von einem unabhängigen Experten prüfen lassen.', 'Mandar verificar cada linha por um especialista independente.', '第三者の専門家に一行ずつ確認してもらう。'),
      L('L’examen coûte un peu, mais révèle les zones floues avant qu’elles ne deviennent des pièges.', 'The review costs a little but exposes the grey areas before they become traps.', 'La revisión cuesta algo, pero descubre las zonas grises antes de que se conviertan en trampas.', 'La verifica costa qualcosa, ma scopre le zone grigie prima che diventino trappole.', 'Die Prüfung kostet etwas, deckt aber Grauzonen auf, bevor sie zu Fallen werden.', 'A análise custa algum dinheiro, mas revela as zonas cinzentas antes de virarem armadilhas.', '費用はかかったが、曖昧な点が罠になる前に洗い出せた。'),
      { argent: -900, mental: 2, reputation: 2 }, 5, 1,
    ),
    approche(
      L('Négocier des garanties écrites.', 'Negotiate written guarantees.', 'Negociar garantías por escrito.', 'Negoziare garanzie scritte.', 'Schriftliche Garantien aushandeln.', 'Negociar garantias por escrito.', '書面で保証を取り付ける。'),
      L('La discussion est ferme et l’accord final protège mieux ton argent comme ton image.', 'The talks are firm and the final agreement better protects both your money and your image.', 'La negociación es firme y el acuerdo final protege mejor tu dinero y tu imagen.', 'La trattativa è ferma e l’accordo finale protegge meglio denaro e immagine.', 'Die Verhandlung ist hart, und die endgültige Vereinbarung schützt Geld und Ansehen besser.', 'A negociação é firme e o acordo final protege melhor o teu dinheiro e a tua imagem.', '強気の交渉で、金銭とイメージの両方を守る契約になった。'),
      { argent: 4200, mental: 1, reputation: 1 }, 5, 1,
    ),
    approche(
      L('Accepter vite pour saisir l’occasion.', 'Accept quickly to seize the opportunity.', 'Aceptar rápido para aprovechar la oportunidad.', 'Accettare in fretta per cogliere l’occasione.', 'Schnell zusagen und die Chance nutzen.', 'Aceitar depressa para aproveitar a oportunidade.', '好機を逃さないよう、すぐ受け入れる。'),
      L('L’argent arrive immédiatement. Les détails négligés, eux, reviennent quelques semaines plus tard.', 'The money arrives immediately. The overlooked details return a few weeks later.', 'El dinero llega de inmediato. Los detalles ignorados vuelven unas semanas después.', 'Il denaro arriva subito. I dettagli trascurati tornano qualche settimana dopo.', 'Das Geld kommt sofort. Die übersehenen Details melden sich einige Wochen später.', 'O dinheiro chega de imediato. Os detalhes ignorados regressam algumas semanas depois.', '金はすぐ入ったが、見落とした条件が数週間後に跳ね返ってきた。'),
      { argent: 9000, moral: -4, reputation: -3 }, 3, 0, { fans: -2 },
    ),
    approche(
      L('Refuser et préserver ton indépendance.', 'Decline and preserve your independence.', 'Rechazar y preservar tu independencia.', 'Rifiutare e preservare la tua indipendenza.', 'Ablehnen und deine Unabhängigkeit bewahren.', 'Recusar e preservar a tua independência.', '断って、自分の自由を守る。'),
      L('Tu laisses passer de l’argent, mais personne ne pourra utiliser ton nom ou ta confiance contre toi.', 'You pass up money, but nobody can use your name or trust against you.', 'Dejas pasar dinero, pero nadie podrá usar tu nombre ni tu confianza contra ti.', 'Rinunci al denaro, ma nessuno potrà usare il tuo nome o la tua fiducia contro di te.', 'Du verzichtest auf Geld, aber niemand kann deinen Namen oder dein Vertrauen gegen dich verwenden.', 'Deixas passar dinheiro, mas ninguém poderá usar o teu nome ou a tua confiança contra ti.', '収入は逃したが、名前や信頼を利用される余地はなくなった。'),
      { argent: -1200, mental: 2, reputation: 3 }, 4, 1,
    ),
  ],
  medias: [
    approche(
      L('Répondre publiquement avec les faits.', 'Respond publicly with the facts.', 'Responder públicamente con los hechos.', 'Rispondere pubblicamente con i fatti.', 'Öffentlich mit Fakten antworten.', 'Responder publicamente com os factos.', '事実を示して公に答える。'),
      L('Ton message est sobre, vérifiable et coupe court aux versions les plus folles.', 'Your message is measured, verifiable and stops the wildest versions in their tracks.', 'Tu mensaje es sobrio, verificable y frena las versiones más disparatadas.', 'Il tuo messaggio è misurato, verificabile e ferma le versioni più assurde.', 'Deine Botschaft ist sachlich, überprüfbar und stoppt die wildesten Versionen.', 'A tua mensagem é sóbria, verificável e trava as versões mais absurdas.', '落ち着いた検証可能な説明が、荒唐無稽な噂を止めた。'),
      { reputation: 5, mental: 1 }, 5, 1, { fans: 4, coach: 2 },
    ),
    approche(
      L('Désamorcer avec humour sans viser personne.', 'Defuse it with humour without targeting anyone.', 'Desactivar la polémica con humor sin atacar a nadie.', 'Sdrammatizzare con umorismo senza colpire nessuno.', 'Mit Humor entschärfen, ohne jemanden anzugreifen.', 'Desarmar a polémica com humor sem atacar ninguém.', '誰も傷つけないユーモアで収める。'),
      L('La réponse devient plus virale que la polémique et te rend étonnamment sympathique.', 'The response becomes more viral than the controversy and makes you unexpectedly likeable.', 'La respuesta se vuelve más viral que la polémica y te hace inesperadamente simpático.', 'La risposta diventa più virale della polemica e ti rende sorprendentemente simpatico.', 'Die Antwort verbreitet sich stärker als die Kontroverse und macht dich unerwartet sympathisch.', 'A resposta torna-se mais viral do que a polémica e deixa-te inesperadamente simpático.', '返答の方が騒動より拡散し、思いがけず好感を集めた。'),
      { popularite: 6, moral: 3, reputation: 1 }, 4, 1, { fans: 6 },
    ),
    approche(
      L('Documenter le dossier et passer par le club.', 'Document the case and go through the club.', 'Documentar el caso y pasar por el club.', 'Documentare il caso e passare dal club.', 'Den Vorgang dokumentieren und über den Verein gehen.', 'Documentar o caso e passar pelo clube.', '証拠を整理し、クラブを通して対応する。'),
      L('La réponse tarde, mais le dossier solide protège tout le monde lorsque les questions précises arrivent.', 'The response takes longer, but the solid case protects everyone when detailed questions arrive.', 'La respuesta tarda, pero el expediente sólido protege a todos cuando llegan las preguntas precisas.', 'La risposta tarda, ma il dossier solido protegge tutti quando arrivano le domande precise.', 'Die Antwort dauert länger, doch die saubere Dokumentation schützt alle bei genauen Nachfragen.', 'A resposta demora, mas o processo sólido protege todos quando chegam as perguntas concretas.', '対応は遅れたが、詳細な質問が来た時に確かな資料が全員を守った。'),
      { vision: 2, reputation: 3, forme: -2 }, 4, 1, { coach: 5 },
    ),
    approche(
      L('Ne rien alimenter et attendre que le bruit retombe.', 'Feed nothing and wait for the noise to fade.', 'No alimentar nada y esperar a que pase el ruido.', 'Non alimentare nulla e aspettare che il rumore cali.', 'Nichts weiter befeuern und warten, bis der Lärm nachlässt.', 'Não alimentar nada e esperar que o ruído passe.', '反応せず、騒ぎが収まるのを待つ。'),
      L('Le sujet s’essouffle, mais ton silence laisse à chacun la liberté d’inventer sa version.', 'The story loses steam, but your silence lets everyone invent their own version.', 'El tema pierde fuerza, pero tu silencio deja que cada uno invente su versión.', 'La storia si spegne, ma il tuo silenzio lascia a tutti la libertà di inventare la propria versione.', 'Das Thema verliert an Kraft, doch dein Schweigen lässt Raum für jede erfundene Version.', 'O assunto perde força, mas o teu silêncio deixa cada um inventar a sua versão.', '話題は薄れたが、沈黙がそれぞれの憶測を許してしまった。'),
      { moral: -2, reputation: -4, forme: 2 }, 1, -1, { fans: -3 },
    ),
  ],
  perso: [
    approche(
      L('Parler franchement avec toutes les personnes concernées.', 'Talk honestly with everyone involved.', 'Hablar con franqueza con todas las personas implicadas.', 'Parlare con franchezza con tutte le persone coinvolte.', 'Offen mit allen Beteiligten sprechen.', 'Falar com franqueza com todas as pessoas envolvidas.', '関係者全員と率直に話す。'),
      L('La conversation est difficile, mais les non-dits cessent enfin de décider à ta place.', 'The conversation is difficult, but unspoken tensions finally stop deciding for you.', 'La conversación es difícil, pero los silencios dejan por fin de decidir por ti.', 'La conversazione è difficile, ma i non detti smettono finalmente di decidere al posto tuo.', 'Das Gespräch ist schwer, aber das Ungesagte entscheidet endlich nicht mehr für dich.', 'A conversa é difícil, mas o que ficou por dizer deixa finalmente de decidir por ti.', '難しい話し合いだったが、言えなかったことに振り回されなくなった。'),
      { moral: 7, mental: 2 }, 5, 1,
    ),
    approche(
      L('Dégager du temps, même si le rugby doit attendre.', 'Make time, even if rugby has to wait.', 'Sacar tiempo, aunque el rugby tenga que esperar.', 'Trovare il tempo, anche se il rugby dovrà aspettare.', 'Zeit schaffen, auch wenn Rugby warten muss.', 'Arranjar tempo, mesmo que o râguebi tenha de esperar.', 'ラグビーを後回しにしてでも時間を作る。'),
      L('Tu manques une partie du programme, mais tu retrouves un équilibre que les statistiques ne mesurent pas.', 'You miss part of the programme but regain a balance no statistic can measure.', 'Te pierdes parte del programa, pero recuperas un equilibrio que ninguna estadística mide.', 'Salti una parte del programma, ma ritrovi un equilibrio che nessuna statistica misura.', 'Du verpasst einen Teil des Programms, gewinnst aber ein Gleichgewicht zurück, das keine Statistik misst.', 'Falhas parte do programa, mas recuperas um equilíbrio que nenhuma estatística mede.', '練習の一部は欠けたが、数字では測れない心の均衡を取り戻した。'),
      { moral: 10, forme: -4 }, 5, 1, { coach: -2 },
    ),
    approche(
      L('Chercher un compromis précis et limité.', 'Find a precise, limited compromise.', 'Buscar un compromiso concreto y limitado.', 'Cercare un compromesso preciso e limitato.', 'Einen klaren, begrenzten Kompromiss suchen.', 'Procurar um compromisso concreto e limitado.', '範囲を絞った具体的な妥協案を探す。'),
      L('Le compromis ne satisfait personne totalement, ce qui est peut-être la preuve qu’il est juste.', 'The compromise satisfies nobody completely, which may be proof that it is fair.', 'El compromiso no satisface del todo a nadie, quizá la prueba de que es justo.', 'Il compromesso non soddisfa del tutto nessuno, forse la prova che è giusto.', 'Der Kompromiss stellt niemanden ganz zufrieden – vielleicht gerade deshalb ist er fair.', 'O compromisso não satisfaz ninguém por completo, talvez a prova de que é justo.', '誰も完全には満足しない。だからこそ公平な妥協なのかもしれない。'),
      { moral: 4, forme: 2, mental: 1 }, 4, 0, { coach: 1 },
    ),
    approche(
      L('Donner la priorité à ta carrière cette fois.', 'Put your career first this time.', 'Dar prioridad a tu carrera esta vez.', 'Dare priorità alla carriera questa volta.', 'Diesmal deine Karriere an erste Stelle setzen.', 'Dar prioridade à carreira desta vez.', '今回はキャリアを優先する。'),
      L('Ton calendrier reste impeccable. Dans ta vie privée, la décision laisse une trace plus longue.', 'Your schedule stays impeccable. In your private life, the decision leaves a longer mark.', 'Tu calendario sigue impecable. En tu vida privada, la decisión deja una huella más duradera.', 'Il calendario resta impeccabile. Nella vita privata, la decisione lascia un segno più lungo.', 'Dein Kalender bleibt makellos. Privat hinterlässt die Entscheidung eine längere Spur.', 'O calendário fica impecável. Na vida privada, a decisão deixa uma marca mais duradoura.', '予定は完璧に守れたが、私生活には長く残る傷をつけた。'),
      { forme: 5, moral: -8, mental: 1 }, 2, -1, { coach: 5 },
    ),
  ],
  corps: [
    approche(
      L('Tout déclarer au médecin et suivre son protocole.', 'Tell the doctor everything and follow the protocol.', 'Contárselo todo al médico y seguir su protocolo.', 'Dire tutto al medico e seguire il protocollo.', 'Dem Arzt alles sagen und sein Protokoll befolgen.', 'Contar tudo ao médico e seguir o protocolo.', '医師にすべて伝え、指示に従う。'),
      L('Le diagnostic impose de ralentir, mais ton retour repose enfin sur autre chose que l’espoir.', 'The diagnosis forces you to slow down, but your return is finally based on more than hope.', 'El diagnóstico obliga a frenar, pero tu regreso por fin se apoya en algo más que la esperanza.', 'La diagnosi impone di rallentare, ma il rientro finalmente si basa su qualcosa di più della speranza.', 'Die Diagnose bremst dich, doch deine Rückkehr beruht endlich auf mehr als Hoffnung.', 'O diagnóstico obriga-te a abrandar, mas o regresso assenta finalmente em algo mais do que esperança.', '診断でペースは落ちたが、復帰が願望ではなく根拠に基づくものになった。'),
      { forme: 10, mental: 2 }, 5, 1, { coach: -1 },
    ),
    approche(
      L('Adapter la charge et mesurer chaque progrès.', 'Adapt the workload and measure every improvement.', 'Adaptar la carga y medir cada progreso.', 'Adattare il carico e misurare ogni progresso.', 'Die Belastung anpassen und jeden Fortschritt messen.', 'Adaptar a carga e medir cada progresso.', '負荷を調整し、小さな進歩も測る。'),
      L('Les progrès sont moins spectaculaires mais réguliers, et ton corps recommence à te faire confiance.', 'The gains are less spectacular but steady, and your body starts trusting you again.', 'Los progresos son menos espectaculares pero constantes, y tu cuerpo vuelve a confiar en ti.', 'I progressi sono meno spettacolari ma costanti, e il corpo ricomincia a fidarsi di te.', 'Die Fortschritte sind unspektakulär, aber stetig, und dein Körper fasst wieder Vertrauen.', 'Os progressos são menos espetaculares, mas constantes, e o corpo volta a confiar em ti.', '派手さはなくても着実に進み、身体が再び自分を信じ始めた。'),
      { forme: 7, endurance: 1, mental: 1 }, 5, 1, { coach: 3 },
    ),
    approche(
      L('Demander un second avis extérieur.', 'Seek an outside second opinion.', 'Pedir una segunda opinión externa.', 'Chiedere un secondo parere esterno.', 'Eine zweite externe Meinung einholen.', 'Pedir uma segunda opinião externa.', '外部の専門家にセカンドオピニオンを求める。'),
      L('Le second avis nuance le premier et donne au staff un plan plus précis, au prix d’une facture salée.', 'The second opinion adds nuance and gives the staff a clearer plan, at a hefty price.', 'La segunda opinión matiza la primera y da al cuerpo técnico un plan más preciso, a un precio elevado.', 'Il secondo parere precisa il primo e offre allo staff un piano migliore, a caro prezzo.', 'Die zweite Meinung ergänzt die erste und liefert dem Staff einen klareren Plan – gegen eine hohe Rechnung.', 'A segunda opinião ajusta a primeira e dá à equipa um plano mais preciso, por um preço elevado.', '別の見解で方針が明確になったが、費用は高くついた。'),
      { argent: -2600, forme: 6, vision: 1 }, 4, 1,
    ),
    approche(
      L('Serrer les dents et continuer normalement.', 'Grit your teeth and carry on as normal.', 'Apretar los dientes y seguir con normalidad.', 'Stringere i denti e continuare normalmente.', 'Die Zähne zusammenbeißen und normal weitermachen.', 'Cerrar os dentes e continuar normalmente.', '歯を食いしばり、いつも通り続ける。'),
      L('Tu tiens le rythme quelques jours. Ensuite, chaque compensation du corps présente sa propre facture.', 'You keep the pace for a few days. Then every physical compensation presents its own bill.', 'Mantienes el ritmo unos días. Después, cada compensación del cuerpo pasa su propia factura.', 'Reggi il ritmo per qualche giorno. Poi ogni compensazione del corpo presenta il conto.', 'Einige Tage hältst du das Tempo. Dann fordert jede Schonhaltung ihren eigenen Preis.', 'Aguentas o ritmo alguns dias. Depois, cada compensação do corpo apresenta a sua conta.', '数日は持ちこたえたが、かばった箇所が次々と代償を求めてきた。'),
      { forme: -12, moral: -4, mental: 1 }, 1, -1, { coach: 3 },
    ),
  ],
  nuit: [
    approche(
      L('Quitter les lieux immédiatement et rentrer.', 'Leave immediately and go home.', 'Marcharte de inmediato y volver a casa.', 'Andartene subito e tornare a casa.', 'Sofort gehen und nach Hause fahren.', 'Sair imediatamente e voltar para casa.', 'すぐその場を離れて帰宅する。'),
      L('Tu rates la suite de la soirée, mais te réveilles sans message inquiétant ni explication à fournir.', 'You miss the rest of the night but wake up with no worrying message and nothing to explain.', 'Te pierdes el resto de la noche, pero despiertas sin mensajes preocupantes ni explicaciones que dar.', 'Perdi il resto della serata, ma ti svegli senza messaggi preoccupanti né spiegazioni da dare.', 'Du verpasst den Rest des Abends, wachst aber ohne beunruhigende Nachrichten oder Erklärungsnot auf.', 'Perdes o resto da noite, mas acordas sem mensagens preocupantes nem explicações para dar.', '夜の続きは逃したが、不穏な連絡も説明すべきこともなく朝を迎えた。'),
      { forme: 5, mental: 2 }, 4, 1, { coach: 2 },
    ),
    approche(
      L('Rester pour protéger le coéquipier le plus exposé.', 'Stay to protect the most exposed teammate.', 'Quedarte para proteger al compañero más expuesto.', 'Restare per proteggere il compagno più esposto.', 'Bleiben und den gefährdetsten Mitspieler schützen.', 'Ficar para proteger o colega mais exposto.', '一番危うい仲間を守るために残る。'),
      L('La nuit devient longue, mais tu évites à un coéquipier une erreur qui aurait pu marquer sa carrière.', 'The night runs long, but you stop a teammate making a mistake that could have defined his career.', 'La noche se alarga, pero evitas a un compañero un error que podría haber marcado su carrera.', 'La notte si allunga, ma eviti a un compagno un errore che avrebbe potuto segnargli la carriera.', 'Die Nacht wird lang, aber du bewahrst einen Mitspieler vor einem karriereprägenden Fehler.', 'A noite alonga-se, mas evitas a um colega um erro que podia marcar a carreira.', '長い夜になったが、仲間のキャリアを左右しかねない過ちを防いだ。'),
      { forme: -5, moral: 5, reputation: 2 }, 5, 1, { coach: 3 },
    ),
    approche(
      L('Prendre les choses en main et organiser une sortie propre.', 'Take charge and organise a clean exit.', 'Tomar el control y organizar una salida limpia.', 'Prendere in mano la situazione e organizzare un’uscita pulita.', 'Die Führung übernehmen und einen sauberen Abgang organisieren.', 'Assumir o controlo e organizar uma saída segura.', '仕切り直し、安全に解散させる。'),
      L('Transports, téléphones et joueurs sont comptés. Tout le monde rentre, et personne ne devient une mauvaise nouvelle.', 'Transport, phones and players are accounted for. Everyone gets home and nobody becomes bad news.', 'Transporte, teléfonos y jugadores quedan controlados. Todos vuelven a casa y nadie acaba siendo una mala noticia.', 'Trasporti, telefoni e giocatori sono sotto controllo. Tutti tornano a casa e nessuno diventa una cattiva notizia.', 'Fahrten, Telefone und Spieler sind organisiert. Alle kommen heim, niemand wird zur schlechten Nachricht.', 'Transportes, telemóveis e jogadores ficam controlados. Todos chegam a casa e ninguém vira má notícia.', '移動手段も携帯も人数も確認し、全員が無事に帰った。誰もニュースにはならない。'),
      { mental: 2, reputation: 3, forme: -2 }, 5, 1, { coach: 5 },
    ),
    approche(
      L('Suivre le mouvement pour ne pas casser l’ambiance.', 'Go along with it so you do not kill the mood.', 'Seguir la corriente para no cortar el ambiente.', 'Seguire il gruppo per non rovinare l’atmosfera.', 'Mitziehen, um die Stimmung nicht zu verderben.', 'Ir com o grupo para não estragar o ambiente.', '場を壊さないよう流れに乗る。'),
      L('Sur le moment, le groupe t’adore. Le lendemain, les images et la fatigue racontent une autre histoire.', 'The group loves you in the moment. The next day, the footage and fatigue tell another story.', 'En el momento el grupo te adora. Al día siguiente, las imágenes y el cansancio cuentan otra historia.', 'Sul momento il gruppo ti adora. Il giorno dopo, immagini e stanchezza raccontano un’altra storia.', 'In dem Moment liebt dich die Gruppe. Am nächsten Tag erzählen Bilder und Müdigkeit eine andere Geschichte.', 'Na hora, o grupo adora-te. No dia seguinte, as imagens e o cansaço contam outra história.', 'その場では皆に喜ばれたが、翌日の映像と疲労は別の物語を語った。'),
      { moral: 3, forme: -10, reputation: -5 }, 1, -1, { fans: -4, coach: -5 },
    ),
  ],
  club: [
    approche(
      L('Te porter volontaire et mobiliser le groupe.', 'Volunteer and rally the group.', 'Ofrecerte y movilizar al grupo.', 'Offrirti volontario e mobilitare il gruppo.', 'Dich melden und die Gruppe mobilisieren.', 'Oferecer-te e mobilizar o grupo.', '自ら手を挙げ、チームを動かす。'),
      L('Ton implication débloque des bonnes volontés que les réunions officielles n’avaient jamais trouvées.', 'Your involvement unlocks goodwill that official meetings never managed to find.', 'Tu implicación despierta voluntades que las reuniones oficiales nunca habían logrado reunir.', 'Il tuo impegno sblocca disponibilità che le riunioni ufficiali non avevano mai trovato.', 'Dein Einsatz setzt Hilfsbereitschaft frei, die offizielle Sitzungen nie erreicht hatten.', 'O teu envolvimento desperta vontades que as reuniões oficiais nunca tinham encontrado.', '君の参加で、会議では引き出せなかった協力が次々と集まった。'),
      { reputation: 4, moral: 5, forme: -2 }, 5, 1, { fans: 6, coach: 3 },
    ),
    approche(
      L('Présenter un plan concret avec des responsables et un calendrier.', 'Present a concrete plan with owners and a timetable.', 'Presentar un plan concreto con responsables y calendario.', 'Presentare un piano concreto con responsabili e calendario.', 'Einen konkreten Plan mit Zuständigkeiten und Zeitplan vorlegen.', 'Apresentar um plano concreto com responsáveis e calendário.', '担当者と期限を明記した具体案を示す。'),
      L('Le débat change de ton dès que chacun voit ce qu’il peut réellement faire et pour quand.', 'The debate changes tone once everyone can see what they can actually do and by when.', 'El debate cambia de tono cuando todos ven qué pueden hacer realmente y para cuándo.', 'Il dibattito cambia tono quando tutti vedono cosa possono fare davvero e entro quando.', 'Die Debatte ändert sich, sobald alle sehen, was sie bis wann wirklich tun können.', 'O debate muda de tom quando todos veem o que podem realmente fazer e até quando.', '誰が何をいつまでにできるか見えた瞬間、議論の空気が変わった。'),
      { vision: 3, mental: 2, reputation: 2 }, 5, 1, { coach: 5 },
    ),
    approche(
      L('Demander au club de financer une vraie solution.', 'Ask the club to fund a proper solution.', 'Pedir al club que financie una solución de verdad.', 'Chiedere al club di finanziare una vera soluzione.', 'Vom Verein die Finanzierung einer echten Lösung verlangen.', 'Pedir ao clube que financie uma solução a sério.', 'クラブに正式な解決策への資金を求める。'),
      L('La direction finit par ouvrir le budget. En échange, elle attend désormais des résultats visibles.', 'The board finally opens the budget. In return, it now expects visible results.', 'La dirección acaba abriendo el presupuesto. A cambio, ahora espera resultados visibles.', 'La dirigenza alla fine apre il budget. In cambio, ora pretende risultati visibili.', 'Die Führung gibt schließlich Budget frei und erwartet dafür sichtbare Ergebnisse.', 'A direção acaba por abrir o orçamento. Em troca, passa a exigir resultados visíveis.', '運営側は予算を出したが、その代わり目に見える成果を求めてきた。'),
      { reputation: 2, mental: 1 }, 4, 0, { coach: -1, fans: 3 },
    ),
    approche(
      L('Refuser de remplacer les responsabilités du club.', 'Refuse to cover for the club’s responsibilities.', 'Negarte a suplir las responsabilidades del club.', 'Rifiutarti di sostituirti alle responsabilità del club.', 'Dich weigern, die Verantwortung des Vereins zu übernehmen.', 'Recusar substituir as responsabilidades do clube.', 'クラブの責任まで背負うことを拒む。'),
      L('Ta limite est légitime, mais le problème reste entier et ton refus devient une partie du débat.', 'Your boundary is legitimate, but the problem remains and your refusal becomes part of the debate.', 'Tu límite es legítimo, pero el problema sigue y tu negativa pasa a formar parte del debate.', 'Il tuo limite è legittimo, ma il problema resta e il rifiuto entra nel dibattito.', 'Deine Grenze ist berechtigt, doch das Problem bleibt und deine Absage wird Teil der Debatte.', 'O teu limite é legítimo, mas o problema continua e a recusa passa a fazer parte do debate.', '正当な線引きだが、問題は残り、拒否そのものも議論の一部になった。'),
      { forme: 3, reputation: -3, moral: -2 }, 1, -1, { fans: -4 },
    ),
  ],
  carriere: [
    approche(
      L('Négocier un projet précis avant de répondre.', 'Negotiate a precise project before answering.', 'Negociar un proyecto concreto antes de responder.', 'Negoziare un progetto preciso prima di rispondere.', 'Vor der Antwort ein klares Projekt aushandeln.', 'Negociar um projeto concreto antes de responder.', '返答の前に具体的なプロジェクトを交渉する。'),
      L('Tu obliges chacun à parler de rôle, de durée et de progression plutôt que de simples promesses.', 'You make everyone discuss role, length and development rather than empty promises.', 'Obligas a todos a hablar de rol, duración y progresión en lugar de simples promesas.', 'Costringi tutti a parlare di ruolo, durata e crescita invece che di semplici promesse.', 'Du zwingst alle, über Rolle, Laufzeit und Entwicklung statt leerer Versprechen zu sprechen.', 'Obrigas todos a falar de papel, duração e progressão em vez de simples promessas.', '役割、期間、成長計画を語らせ、曖昧な約束で終わらせなかった。'),
      { mental: 3, reputation: 2 }, 5, 1, { coach: 1, marche: true },
    ),
    approche(
      L('Accepter le défi et te mettre en danger.', 'Accept the challenge and put yourself on the line.', 'Aceptar el reto y ponerte a prueba.', 'Accettare la sfida e metterti in gioco.', 'Die Herausforderung annehmen und etwas riskieren.', 'Aceitar o desafio e pôr-te à prova.', '挑戦を受け、自分を試す。'),
      L('Tu choisis l’incertitude utile. La prochaine étape exigera plus de toi, mais elle peut agrandir ta carrière.', 'You choose useful uncertainty. The next step will demand more but could make your career bigger.', 'Eliges una incertidumbre útil. El siguiente paso exigirá más, pero puede hacer crecer tu carrera.', 'Scegli un’incertezza utile. Il prossimo passo chiederà di più, ma può allargare la carriera.', 'Du wählst produktive Unsicherheit. Der nächste Schritt fordert mehr, kann deine Karriere aber vergrößern.', 'Escolhes uma incerteza útil. O próximo passo vai exigir mais, mas pode ampliar a carreira.', '意味のある不確実さを選んだ。次の一歩は厳しいが、キャリアを広げる可能性がある。'),
      { moral: 6, mental: 2, forme: -3 }, 5, 1, { marche: true },
    ),
    approche(
      L('Attendre des garanties sportives supplémentaires.', 'Wait for further sporting guarantees.', 'Esperar más garantías deportivas.', 'Aspettare ulteriori garanzie sportive.', 'Auf weitere sportliche Garantien warten.', 'Esperar por mais garantias desportivas.', '競技面の追加保証を待つ。'),
      L('Tu ne fermes aucune porte, mais le temps permet aussi à d’autres candidats d’entrer dans la discussion.', 'You close no doors, but time also lets other candidates enter the conversation.', 'No cierras ninguna puerta, pero el tiempo permite que otros candidatos entren en la conversación.', 'Non chiudi nessuna porta, ma il tempo permette ad altri candidati di entrare nella trattativa.', 'Du schließt keine Tür, aber die Zeit bringt auch andere Kandidaten ins Gespräch.', 'Não fechas nenhuma porta, mas o tempo também deixa outros candidatos entrar na conversa.', '扉は閉じなかったが、待つ間に別の候補も交渉へ入ってきた。'),
      { vision: 2, moral: -2 }, 3, 0, { marche: true },
    ),
    approche(
      L('Refuser et ouvrir officiellement ton marché.', 'Decline and officially open your market.', 'Rechazar y abrir oficialmente tu mercado.', 'Rifiutare e aprire ufficialmente il mercato.', 'Ablehnen und offiziell auf den Markt gehen.', 'Recusar e abrir oficialmente o teu mercado.', '断り、正式に移籍市場へ出る。'),
      L('Le refus est propre et le message circule vite : tu es disponible pour un projet réellement convaincant.', 'The refusal is clean and word travels fast: you are available for a genuinely convincing project.', 'La negativa es limpia y el mensaje corre rápido: estás disponible para un proyecto realmente convincente.', 'Il rifiuto è corretto e la voce corre: sei disponibile per un progetto davvero convincente.', 'Die Absage ist sauber und spricht sich schnell herum: Du bist für ein wirklich überzeugendes Projekt verfügbar.', 'A recusa é limpa e a mensagem corre depressa: estás disponível para um projeto realmente convincente.', '丁寧に断り、本当に納得できるプロジェクトを求めていることが広まった。'),
      { reputation: 2, moral: 1 }, 4, 1, { marche: true },
    ),
  ],
};

const SUJETS_VESTIAIRE: Sujet[] = [
  sujet('tradition-capitaine',
    L('La tradition du capitaine', 'The captain’s tradition', 'La tradición del capitán', 'La tradizione del capitano', 'Die Tradition des Kapitäns', 'A tradição do capitão', '主将の伝統'),
    L('Le capitaine veut modifier un vieux rituel du vestiaire qui ne met plus tout le monde à l’aise.', 'The captain wants to change an old dressing-room ritual that no longer makes everyone comfortable.', 'El capitán quiere cambiar un viejo ritual del vestuario que ya no hace sentir cómodo a todo el mundo.', 'Il capitano vuole cambiare un vecchio rito dello spogliatoio che non mette più tutti a proprio agio.', 'Der Kapitän will ein altes Kabinenritual ändern, mit dem sich nicht mehr alle wohlfühlen.', 'O capitão quer mudar um velho ritual do balneário que já não deixa todos à vontade.', '主将が、全員にとって居心地がよいとは言えなくなった古い儀式を変えようとしている。')),
  sujet('recrue-isolee',
    L('La recrue isolée', 'The isolated recruit', 'El fichaje aislado', 'Il nuovo isolato', 'Der isolierte Neuzugang', 'O reforço isolado', '孤立する新加入選手'),
    L('Une recrue étrangère comprend les consignes mais reste seule dès que la séance se termine.', 'A foreign recruit understands the instructions but is alone as soon as training ends.', 'Un fichaje extranjero entiende las consignas, pero se queda solo en cuanto termina el entrenamiento.', 'Un nuovo straniero capisce le consegne ma resta solo appena finisce l’allenamento.', 'Ein ausländischer Neuzugang versteht die Anweisungen, bleibt nach dem Training aber allein.', 'Um reforço estrangeiro entende as instruções, mas fica sozinho assim que o treino termina.', '外国人の新加入選手は指示を理解しているが、練習が終わるといつも一人だ。')),
  sujet('doublure-conseil',
    L('La question de ta doublure', 'Your understudy’s question', 'La pregunta de tu suplente', 'La domanda della tua riserva', 'Die Frage deines Ersatzmanns', 'A pergunta do teu suplente', '控え選手の質問'),
    L('Ta doublure te demande franchement ce qui lui manque pour prendre ta place.', 'Your understudy asks you honestly what he lacks to take your place.', 'Tu suplente te pregunta con franqueza qué le falta para quitarte el puesto.', 'La tua riserva ti chiede sinceramente cosa gli manca per prendere il tuo posto.', 'Dein Ersatzmann fragt offen, was ihm fehlt, um deinen Platz zu übernehmen.', 'O teu suplente pergunta-te com franqueza o que lhe falta para ficar com o teu lugar.', '控え選手が、君のポジションを奪うには何が足りないのか率直に尋ねてきた。')),
  sujet('anciens-brouilles',
    L('Les deux anciens brouillés', 'The feuding veterans', 'Los dos veteranos enfrentados', 'I due veterani in lite', 'Die zerstrittenen Routiniers', 'Os dois veteranos desavindos', '対立する二人のベテラン'),
    L('Deux cadres qui ne s’adressent plus la parole commencent à diviser le reste du groupe.', 'Two senior players who no longer speak are starting to divide the rest of the squad.', 'Dos veteranos que ya no se hablan empiezan a dividir al resto del grupo.', 'Due senatori che non si parlano più stanno dividendo il resto del gruppo.', 'Zwei Führungsspieler, die nicht mehr miteinander reden, spalten langsam die Mannschaft.', 'Dois veteranos que já não se falam começam a dividir o resto do grupo.', '口を利かなくなった二人の中心選手が、チーム全体を分裂させ始めている。')),
  sujet('erreur-espoir',
    L('L’erreur du jeune espoir', 'The academy prospect’s mistake', 'El error de la joven promesa', 'L’errore del giovane talento', 'Der Fehler des Nachwuchstalents', 'O erro do jovem talento', '若手有望株の失敗'),
    L('Un espoir a envoyé par erreur un document interne à une conversation extérieure au club.', 'An academy prospect accidentally sent an internal document to a chat outside the club.', 'Una joven promesa envió por error un documento interno a una conversación ajena al club.', 'Un giovane talento ha inviato per errore un documento interno a una chat esterna al club.', 'Ein Nachwuchstalent hat versehentlich ein internes Dokument an einen vereinsfremden Chat geschickt.', 'Um jovem talento enviou por engano um documento interno para uma conversa fora do clube.', '若手選手が誤って内部資料をクラブ外のチャットへ送ってしまった。')),
  sujet('kine-chambre',
    L('Le kiné pris pour cible', 'The physio under fire', 'El fisio en el punto de mira', 'Il fisioterapista preso di mira', 'Der Physio als Zielscheibe', 'O fisioterapeuta visado', '標的にされた理学療法士'),
    L('Les plaisanteries répétées contre le kiné ne font plus rire la personne qui les subit.', 'Repeated jokes about the physio are no longer funny to the person on the receiving end.', 'Las bromas repetidas contra el fisio ya no hacen gracia a quien las sufre.', 'Le battute ripetute sul fisioterapista non fanno più ridere chi le subisce.', 'Die ständigen Witze über den Physio sind für den Betroffenen längst nicht mehr lustig.', 'As piadas repetidas contra o fisioterapeuta já não fazem rir quem as sofre.', '理学療法士を狙った繰り返しの冗談は、本人にとってもう笑えるものではない。')),
  sujet('intendant-accuse',
    L('L’intendant accusé', 'The kit manager blamed', 'El utillero acusado', 'Il magazziniere accusato', 'Der beschuldigte Zeugwart', 'O roupeiro acusado', '責められる用具係'),
    L('Du matériel a disparu et plusieurs joueurs accusent l’intendant sans la moindre preuve.', 'Equipment has gone missing and several players are blaming the kit manager without any evidence.', 'Ha desaparecido material y varios jugadores culpan al utillero sin ninguna prueba.', 'È sparito del materiale e diversi giocatori accusano il magazziniere senza alcuna prova.', 'Ausrüstung ist verschwunden, und mehrere Spieler beschuldigen ohne Beweise den Zeugwart.', 'Desapareceu material e vários jogadores culpam o roupeiro sem qualquer prova.', '備品がなくなり、証拠もないまま複数の選手が用具係を責めている。')),
  sujet('coloc-insomnie',
    L('Les nuits de ton colocataire', 'Your roommate’s sleepless nights', 'Las noches de tu compañero de habitación', 'Le notti del tuo compagno di stanza', 'Die schlaflosen Nächte deines Zimmerpartners', 'As noites do teu colega de quarto', 'ルームメイトの眠れない夜'),
    L('Ton colocataire de déplacement ne dort presque plus et refuse pourtant de demander de l’aide.', 'Your tour roommate barely sleeps any more yet refuses to seek help.', 'Tu compañero de habitación en los viajes casi no duerme, pero se niega a pedir ayuda.', 'Il tuo compagno di stanza in trasferta non dorme quasi più ma rifiuta di chiedere aiuto.', 'Dein Zimmerpartner auf Auswärtsfahrten schläft kaum noch, will aber keine Hilfe suchen.', 'O teu colega de quarto nas deslocações quase não dorme, mas recusa pedir ajuda.', '遠征で同室の仲間がほとんど眠れていないのに、助けを求めようとしない。')),
  sujet('leader-retour',
    L('Le retour du leader blessé', 'The injured leader returns', 'El regreso del líder lesionado', 'Il ritorno del leader infortunato', 'Die Rückkehr des verletzten Anführers', 'O regresso do líder lesionado', '負傷したリーダーの復帰'),
    L('Un leader revient de blessure et réclame immédiatement la place gagnée entre-temps par un jeune.', 'A leader returns from injury and immediately demands the place an academy player earned in his absence.', 'Un líder vuelve de lesión y reclama de inmediato el puesto que un joven se ganó durante su ausencia.', 'Un leader rientra dall’infortunio e rivuole subito il posto conquistato nel frattempo da un giovane.', 'Ein Führungsspieler kehrt nach Verletzung zurück und fordert sofort den Platz, den sich ein Junger erarbeitet hat.', 'Um líder regressa de lesão e exige de imediato o lugar conquistado entretanto por um jovem.', 'リーダー格の選手が負傷から戻り、その間に若手が勝ち取った場所をすぐ返せと求めている。')),
  sujet('groupe-prive',
    L('Le groupe privé ne l’est plus', 'The private group is no longer private', 'El grupo privado ya no lo es', 'Il gruppo privato non è più privato', 'Die private Gruppe ist nicht mehr privat', 'O grupo privado deixou de o ser', '非公開ではなくなったグループ'),
    L('Des messages du groupe des joueurs sont sortis de leur contexte et ont quitté le vestiaire.', 'Messages from the players’ group have been taken out of context and have left the dressing room.', 'Mensajes del grupo de jugadores han salido de contexto y del vestuario.', 'Messaggi del gruppo dei giocatori sono stati estrapolati e hanno lasciato lo spogliatoio.', 'Nachrichten aus der Spielergruppe wurden aus dem Zusammenhang gerissen und nach außen getragen.', 'Mensagens do grupo dos jogadores foram tiradas do contexto e saíram do balneário.', '選手グループのメッセージが文脈を切り取られ、ロッカールームの外へ流出した。')),
];

const SUJETS_ARGENT: Sujet[] = [
  sujet('droits-image',
    L('Le contrat de droits d’image', 'The image-rights contract', 'El contrato de derechos de imagen', 'Il contratto sui diritti d’immagine', 'Der Bildrechtevertrag', 'O contrato de direitos de imagem', '肖像権契約'),
    L('Ton agent présente un contrat qui autoriserait une marque à utiliser ton visage longtemps après ton départ.', 'Your agent presents a contract allowing a brand to use your face long after you leave.', 'Tu agente presenta un contrato que permitiría a una marca usar tu imagen mucho después de tu marcha.', 'Il tuo agente presenta un contratto che permetterebbe a un marchio di usare il tuo volto a lungo dopo la partenza.', 'Dein Berater legt einen Vertrag vor, der einer Marke die Nutzung deines Gesichts lange nach deinem Weggang erlaubt.', 'O teu agente apresenta um contrato que permitiria a uma marca usar o teu rosto muito depois da tua saída.', '代理人が、退団後も長期間ブランドに肖像を使わせる契約を持ってきた。')),
  sujet('pret-proche',
    L('Le prêt demandé par un proche', 'A relative asks for a loan', 'El préstamo que pide un familiar', 'Il prestito chiesto da una persona cara', 'Die Kreditanfrage eines Angehörigen', 'O empréstimo pedido por um familiar', '身近な人からの借金依頼'),
    L('Un proche te demande une somme importante pour sauver un projet auquel toute la famille tient.', 'A relative asks for a large sum to save a project the whole family cares about.', 'Un familiar te pide una suma importante para salvar un proyecto importante para toda la familia.', 'Una persona cara ti chiede una somma importante per salvare un progetto a cui tiene tutta la famiglia.', 'Ein Angehöriger bittet um eine große Summe, um ein Familienprojekt zu retten.', 'Um familiar pede-te uma soma importante para salvar um projeto querido por toda a família.', '家族全員が大切にする事業を救うため、身近な人から多額の援助を頼まれた。')),
  sujet('commerce-quartier',
    L('Le commerce du quartier', 'The neighbourhood shop', 'El negocio del barrio', 'Il negozio del quartiere', 'Der Laden im Viertel', 'O comércio do bairro', '地元の店'),
    L('Un commerce fréquenté par les supporters cherche un investisseur pour survivre aux travaux autour du stade.', 'A shop popular with supporters needs an investor to survive construction work around the stadium.', 'Un negocio frecuentado por los aficionados busca inversor para sobrevivir a las obras alrededor del estadio.', 'Un negozio frequentato dai tifosi cerca un investitore per sopravvivere ai lavori attorno allo stadio.', 'Ein bei Fans beliebter Laden sucht einen Investor, um die Bauarbeiten rund ums Stadion zu überstehen.', 'Um comércio frequentado pelos adeptos procura um investidor para sobreviver às obras junto ao estádio.', 'サポーターが集う店が、スタジアム周辺工事を乗り切るため出資者を探している。')),
  sujet('sponsor-crypto',
    L('Le sponsor aux promesses parfaites', 'The sponsor with perfect promises', 'El patrocinador de las promesas perfectas', 'Lo sponsor dalle promesse perfette', 'Der Sponsor mit perfekten Versprechen', 'O patrocinador das promessas perfeitas', '完璧すぎるスポンサー'),
    L('Une plateforme financière propose un gros chèque pour vanter un placement présenté comme sans risque.', 'A financial platform offers a big cheque to promote an investment presented as risk-free.', 'Una plataforma financiera ofrece un gran cheque por promocionar una inversión presentada como libre de riesgo.', 'Una piattaforma finanziaria offre un grosso assegno per promuovere un investimento presentato come privo di rischi.', 'Eine Finanzplattform bietet viel Geld für die Werbung eines angeblich risikofreien Investments.', 'Uma plataforma financeira oferece um grande cheque para promover um investimento apresentado como sem risco.', '金融サービス会社から「リスクなし」とうたう投資商品の広告に高額報酬を提示された。')),
  sujet('prime-erronee',
    L('La prime calculée de travers', 'The miscalculated bonus', 'La prima mal calculada', 'Il premio calcolato male', 'Die falsch berechnete Prämie', 'O prémio mal calculado', '計算ミスのボーナス'),
    L('Le club t’a versé une prime deux fois supérieure au montant prévu dans ton contrat.', 'The club has paid you a bonus twice the amount stated in your contract.', 'El club te ha pagado una prima dos veces superior a la prevista en tu contrato.', 'Il club ti ha versato un premio doppio rispetto a quello previsto dal contratto.', 'Der Verein hat dir eine doppelt so hohe Prämie wie vertraglich vorgesehen gezahlt.', 'O clube pagou-te um prémio duas vezes superior ao previsto no contrato.', 'クラブから契約額の二倍のボーナスが振り込まれていた。')),
  sujet('comptable-alerte',
    L('L’alerte du comptable', 'The accountant’s warning', 'La alerta del contable', 'L’allarme del commercialista', 'Die Warnung des Steuerberaters', 'O alerta do contabilista', '会計士からの警告'),
    L('Ton comptable découvre une déclaration incomplète qui peut encore être corrigée, mais pas discrètement.', 'Your accountant finds an incomplete declaration that can still be corrected, but not quietly.', 'Tu contable descubre una declaración incompleta que aún puede corregirse, pero no discretamente.', 'Il commercialista scopre una dichiarazione incompleta che può ancora essere corretta, ma non in silenzio.', 'Dein Steuerberater entdeckt eine unvollständige Erklärung, die noch korrigiert werden kann – aber nicht unauffällig.', 'O teu contabilista descobre uma declaração incompleta que ainda pode ser corrigida, mas não discretamente.', '会計士が申告漏れを見つけた。まだ修正できるが、内密には済まない。')),
  sujet('achat-commun',
    L('L’achat proposé par un coéquipier', 'A teammate’s joint purchase', 'La compra propuesta por un compañero', 'L’acquisto proposto da un compagno', 'Der gemeinsame Kauf mit einem Mitspieler', 'A compra proposta por um colega', 'チームメイトとの共同購入'),
    L('Un coéquipier veut acheter avec toi un logement destiné aux jeunes joueurs de passage.', 'A teammate wants to buy a property with you for young players passing through the club.', 'Un compañero quiere comprar contigo una vivienda para jóvenes jugadores de paso por el club.', 'Un compagno vuole comprare con te un alloggio per i giovani giocatori di passaggio.', 'Ein Mitspieler will mit dir eine Unterkunft für junge Spieler auf Zeit kaufen.', 'Um colega quer comprar contigo uma casa para jovens jogadores de passagem pelo clube.', 'チームメイトから、短期加入の若手向け住宅を共同購入しようと提案された。')),
  sujet('exclusivite-crampons',
    L('L’exclusivité des crampons', 'The boot exclusivity deal', 'La exclusividad de las botas', 'L’esclusiva degli scarpini', 'Der exklusive Schuhvertrag', 'A exclusividade das botas', 'スパイクの独占契約'),
    L('Un équipementier offre une belle prime à condition de t’interdire toute autre marque pendant trois ans.', 'A kit supplier offers a strong bonus if you wear no other brand for three years.', 'Una marca ofrece una buena prima si te prohíbes usar cualquier otra durante tres años.', 'Un fornitore offre un ottimo premio a condizione che tu non usi altri marchi per tre anni.', 'Ein Ausrüster bietet eine hohe Prämie, wenn du drei Jahre lang keine andere Marke trägst.', 'Uma marca oferece um bom prémio se não usares qualquer outra durante três anos.', '用具メーカーから、三年間他社製品を使わない条件で高額契約を提示された。')),
  sujet('cagnotte-caritative',
    L('La cagnotte à ton nom', 'The fundraiser in your name', 'La colecta a tu nombre', 'La raccolta a tuo nome', 'Die Spendenaktion in deinem Namen', 'A angariação em teu nome', '自分の名を使った募金'),
    L('Une association utilise ton visage pour une cagnotte dont les comptes restent étonnamment vagues.', 'A charity is using your face for a fundraiser whose accounts remain strangely vague.', 'Una asociación usa tu imagen para una colecta cuyas cuentas siguen siendo extrañamente vagas.', 'Un’associazione usa il tuo volto per una raccolta dai conti stranamente vaghi.', 'Ein Verein nutzt dein Gesicht für eine Spendenaktion mit auffällig unklaren Zahlen.', 'Uma associação usa o teu rosto numa angariação cujas contas continuam estranhamente vagas.', '慈善団体が君の顔を使って募金しているが、収支報告が妙に曖昧だ。')),
  sujet('maillot-debuts',
    L('Le maillot de tes débuts', 'Your debut shirt', 'La camiseta de tu debut', 'La maglia dell’esordio', 'Dein Debüttrikot', 'A camisola da estreia', 'デビュー戦のジャージー'),
    L('Un collectionneur offre beaucoup pour ton premier maillot, tandis qu’un musée du club le réclame aussi.', 'A collector offers a great deal for your first shirt while the club museum also wants it.', 'Un coleccionista ofrece mucho por tu primera camiseta, mientras el museo del club también la reclama.', 'Un collezionista offre molto per la tua prima maglia, mentre la chiede anche il museo del club.', 'Ein Sammler bietet viel für dein erstes Trikot, doch auch das Vereinsmuseum möchte es.', 'Um colecionador oferece muito pela tua primeira camisola, enquanto o museu do clube também a pede.', 'デビュー戦のジャージーにコレクターが高値をつける一方、クラブ博物館も寄贈を望んでいる。')),
];

const SUJETS_MEDIAS: Sujet[] = [
  sujet('podcast-rival',
    L('Le podcast du rival', 'The rival’s podcast', 'El pódcast del rival', 'Il podcast del rivale', 'Der Podcast des Rivalen', 'O podcast do rival', 'ライバルのポッドキャスト'),
    L('Le capitaine d’un rival t’invite à parler sans filtre de ce qui oppose réellement vos deux clubs.', 'A rival captain invites you to speak candidly about what truly divides your two clubs.', 'El capitán de un rival te invita a hablar sin filtros de lo que realmente separa a vuestros clubes.', 'Il capitano di una rivale ti invita a parlare senza filtri di ciò che divide davvero i due club.', 'Der Kapitän eines Rivalen lädt dich ein, offen über die echte Rivalität beider Vereine zu sprechen.', 'O capitão de um rival convida-te a falar sem filtros sobre o que realmente separa os dois clubes.', 'ライバルの主将から、両クラブの本当の対立について率直に語る番組へ招かれた。')),
  sujet('vieille-interview',
    L('L’interview ressortie des archives', 'The interview from the archives', 'La entrevista rescatada del archivo', 'L’intervista riemersa dagli archivi', 'Das Interview aus dem Archiv', 'A entrevista recuperada do arquivo', '掘り起こされた昔のインタビュー'),
    L('Une phrase maladroite prononcée à dix-huit ans revient alors que tu ne penses plus du tout la même chose.', 'An awkward comment you made at eighteen resurfaces even though your views have completely changed.', 'Reaparece una frase torpe que dijiste a los dieciocho años, aunque ahora piensas de forma muy distinta.', 'Riemerge una frase infelice detta a diciotto anni, anche se oggi la pensi in modo del tutto diverso.', 'Eine unbedachte Aussage von dir mit achtzehn taucht wieder auf, obwohl du heute ganz anders denkst.', 'Uma frase infeliz dita aos dezoito anos reaparece, apesar de hoje pensares de forma muito diferente.', '十八歳の頃の不用意な発言が、今の考えとは全く違うのに掘り起こされた。')),
  sujet('fausse-video',
    L('La vidéo qui imite ta voix', 'The video mimicking your voice', 'El vídeo que imita tu voz', 'Il video che imita la tua voce', 'Das Video mit deiner falschen Stimme', 'O vídeo que imita a tua voz', '声を偽造した動画'),
    L('Une vidéo truquée utilise ton visage et ta voix pour promouvoir un produit que tu ne connais pas.', 'A manipulated video uses your face and voice to promote a product you have never heard of.', 'Un vídeo manipulado usa tu cara y tu voz para promocionar un producto que no conoces.', 'Un video manipolato usa volto e voce per promuovere un prodotto che non conosci.', 'Ein manipuliertes Video nutzt dein Gesicht und deine Stimme für ein unbekanntes Produkt.', 'Um vídeo manipulado usa o teu rosto e a tua voz para promover um produto que desconheces.', '偽造動画が君の顔と声を使い、知らない商品を宣伝している。')),
  sujet('question-off',
    L('La question prétendument hors micro', 'The supposedly off-record question', 'La pregunta supuestamente fuera de micrófono', 'La domanda presumibilmente fuori microfono', 'Die angeblich vertrauliche Frage', 'A pergunta supostamente sem microfone', 'オフレコのはずの質問'),
    L('Un journaliste te demande ce que tu penses vraiment du coach en promettant que rien ne sera cité.', 'A journalist asks what you really think of the coach and promises nothing will be quoted.', 'Un periodista te pregunta qué piensas de verdad del entrenador y promete no citar nada.', 'Un giornalista chiede cosa pensi davvero dell’allenatore promettendo che nulla sarà citato.', 'Ein Journalist fragt nach deiner echten Meinung über den Trainer und verspricht, nichts zu zitieren.', 'Um jornalista pergunta o que pensas realmente do treinador e promete não citar nada.', '記者から、絶対に引用しない約束で監督への本音を尋ねられた。')),
  sujet('documentaire',
    L('La caméra dans ton quotidien', 'The camera in your daily life', 'La cámara en tu día a día', 'La telecamera nella tua quotidianità', 'Die Kamera in deinem Alltag', 'A câmara no teu dia a dia', '日常に入るカメラ'),
    L('Une équipe documentaire veut filmer entraînements, domicile et discussions avec tes proches pendant six semaines.', 'A documentary crew wants to film training, your home and conversations with loved ones for six weeks.', 'Un equipo documental quiere grabar entrenamientos, tu casa y conversaciones con tus seres queridos durante seis semanas.', 'Una troupe vuole filmare allenamenti, casa e conversazioni con i tuoi cari per sei settimane.', 'Ein Dokumentarteam will sechs Wochen lang Training, Zuhause und Gespräche mit Angehörigen filmen.', 'Uma equipa documental quer filmar treinos, casa e conversas com os teus próximos durante seis semanas.', 'ドキュメンタリー班が六週間、練習、自宅、家族との会話まで撮影したいと言ってきた。')),
  sujet('clip-entrainement',
    L('Le geste d’entraînement devenu viral', 'The viral training moment', 'El gesto del entrenamiento que se hizo viral', 'Il gesto in allenamento diventato virale', 'Die virale Trainingsszene', 'O gesto do treino que se tornou viral', '拡散した練習中の場面'),
    L('Une séquence de quelques secondes te montre en colère sans révéler ce qui s’est passé juste avant.', 'A few seconds of footage show you angry without revealing what happened immediately before.', 'Unos segundos te muestran enfadado sin enseñar lo que ocurrió justo antes.', 'Pochi secondi ti mostrano arrabbiato senza far vedere ciò che è successo appena prima.', 'Ein kurzer Clip zeigt dich wütend, ohne zu zeigen, was unmittelbar davor geschah.', 'Alguns segundos mostram-te zangado sem revelar o que aconteceu imediatamente antes.', '数秒の映像が、直前の出来事を隠したまま君の怒る姿だけを映している。')),
  sujet('excuses-sponsor',
    L('Les excuses réclamées par le sponsor', 'The apology demanded by the sponsor', 'Las disculpas exigidas por el patrocinador', 'Le scuse richieste dallo sponsor', 'Die vom Sponsor verlangte Entschuldigung', 'O pedido de desculpas exigido pelo patrocinador', 'スポンサーが求める謝罪'),
    L('Un sponsor exige des excuses publiques après une remarque qui ne le visait pourtant pas.', 'A sponsor demands a public apology over a remark that was not even aimed at it.', 'Un patrocinador exige disculpas públicas por un comentario que ni siquiera iba dirigido a él.', 'Uno sponsor pretende scuse pubbliche per una frase che non era rivolta a lui.', 'Ein Sponsor fordert eine öffentliche Entschuldigung für eine Bemerkung, die ihn gar nicht betraf.', 'Um patrocinador exige desculpas públicas por uma observação que nem sequer lhe era dirigida.', 'スポンサーが、自分たちに向けたものでもない発言について公の謝罪を要求している。')),
  sujet('critique-jeune-fan',
    L('La lettre du jeune supporter', 'The young supporter’s letter', 'La carta del joven aficionado', 'La lettera del giovane tifoso', 'Der Brief des jungen Fans', 'A carta do jovem adepto', '少年ファンからの手紙'),
    L('Un jeune supporter publie une lettre très dure sur ton attitude, avec des détails étonnamment précis.', 'A young supporter posts a very harsh letter about your attitude, with surprisingly precise details.', 'Un joven aficionado publica una carta muy dura sobre tu actitud, con detalles sorprendentemente precisos.', 'Un giovane tifoso pubblica una lettera molto dura sul tuo atteggiamento, con dettagli sorprendentemente precisi.', 'Ein junger Fan veröffentlicht einen sehr harten Brief über dein Verhalten mit erstaunlich genauen Details.', 'Um jovem adepto publica uma carta muito dura sobre a tua atitude, com detalhes surpreendentemente precisos.', '少年サポーターが、驚くほど具体的な内容で君の態度を厳しく批判する手紙を公開した。')),
  sujet('vocal-fuite',
    L('Le message vocal transmis', 'The forwarded voice message', 'El mensaje de voz reenviado', 'Il vocale inoltrato', 'Die weitergeleitete Sprachnachricht', 'A mensagem de voz reencaminhada', '転送された音声メッセージ'),
    L('Un message vocal privé où tu plaisantes sur le calendrier est transmis à une rédaction.', 'A private voice message in which you joke about the schedule is forwarded to a newsroom.', 'Un mensaje de voz privado en el que bromeas sobre el calendario llega a una redacción.', 'Un messaggio vocale privato in cui scherzi sul calendario viene inoltrato a una redazione.', 'Eine private Sprachnachricht, in der du über den Spielplan scherzt, landet bei einer Redaktion.', 'Uma mensagem de voz privada em que brincas com o calendário é enviada a uma redação.', '日程について冗談を言った私的な音声が報道機関へ転送された。')),
  sujet('direct-tele',
    L('Le fauteuil du direct', 'The live television chair', 'El sillón del directo', 'La poltrona della diretta', 'Der Platz in der Livesendung', 'O lugar no direto', '生放送の席'),
    L('Une émission en direct te propose une longue interview sans transmettre les questions à l’avance.', 'A live show offers you a long interview without sharing the questions in advance.', 'Un programa en directo te ofrece una larga entrevista sin enviar las preguntas por adelantado.', 'Un programma in diretta propone una lunga intervista senza anticipare le domande.', 'Eine Livesendung bietet dir ein langes Interview, ohne vorher Fragen zu nennen.', 'Um programa em direto propõe-te uma longa entrevista sem enviar as perguntas antes.', '生放送番組から、質問を事前に知らせない長時間インタビューの依頼が来た。')),
];

const SUJETS_PERSO: Sujet[] = [
  sujet('fete-famille',
    L('La fête de famille impossible à déplacer', 'The family celebration that cannot move', 'La celebración familiar que no puede cambiarse', 'La festa di famiglia impossibile da spostare', 'Die unverschiebbare Familienfeier', 'A festa de família impossível de mudar', '動かせない家族行事'),
    L('Une réunion familiale importante tombe exactement pendant une journée ajoutée au programme du club.', 'An important family gathering falls exactly on a day newly added to the club programme.', 'Una reunión familiar importante coincide exactamente con un día añadido al programa del club.', 'Un importante incontro di famiglia cade proprio in un giorno aggiunto al programma del club.', 'Ein wichtiges Familientreffen fällt genau auf einen neu angesetzten Vereinstermin.', 'Uma reunião familiar importante calha exatamente num dia acrescentado ao programa do clube.', '大切な家族行事が、クラブの追加日程と完全に重なった。')),
  sujet('emploi-partenaire',
    L('Le poste rêvé de ta partenaire', 'Your partner’s dream job', 'El trabajo soñado de tu pareja', 'Il lavoro dei sogni del tuo partner', 'Der Traumjob deines Partners', 'O emprego de sonho da tua companheira', 'パートナーの夢の仕事'),
    L('Ta partenaire reçoit une offre professionnelle exceptionnelle dans une ville très éloignée de ton club.', 'Your partner receives an exceptional job offer in a city far from your club.', 'Tu pareja recibe una oferta profesional excepcional en una ciudad muy lejos de tu club.', 'Il tuo partner riceve un’offerta di lavoro eccezionale in una città molto lontana dal club.', 'Dein Partner erhält ein außergewöhnliches Jobangebot in einer weit entfernten Stadt.', 'A tua companheira recebe uma oferta profissional excecional numa cidade muito longe do clube.', 'パートナーが、クラブから遠く離れた街で夢のような仕事を提示された。')),
  sujet('ami-endette',
    L('L’ami qui n’appelle jamais', 'The friend who never calls', 'El amigo que nunca llama', 'L’amico che non chiama mai', 'Der Freund, der nie anruft', 'O amigo que nunca liga', 'めったに連絡しない友人'),
    L('Un vieil ami reprend contact uniquement parce qu’il traverse une situation personnelle très difficile.', 'An old friend gets back in touch only because he is going through a very difficult personal situation.', 'Un viejo amigo vuelve a contactar solo porque atraviesa una situación personal muy difícil.', 'Un vecchio amico si rifà vivo solo perché attraversa un momento personale molto difficile.', 'Ein alter Freund meldet sich nur, weil er eine sehr schwierige persönliche Phase durchlebt.', 'Um velho amigo volta a contactar apenas porque atravessa uma situação pessoal muito difícil.', 'めったに連絡しない旧友が、深刻な事情を抱えて突然助けを求めてきた。')),
  sujet('examen-etudes',
    L('La semaine des examens', 'Exam week', 'La semana de exámenes', 'La settimana degli esami', 'Die Prüfungswoche', 'A semana de exames', '試験週間'),
    L('La formation que tu suis pour préparer l’après-carrière place tous ses examens sur une semaine chargée.', 'The course preparing you for life after rugby schedules all its exams during a busy week.', 'La formación que sigues para preparar el futuro concentra todos sus exámenes en una semana cargada.', 'Il corso per il dopo-carriera concentra tutti gli esami in una settimana piena.', 'Deine Ausbildung für die Zeit nach der Karriere legt alle Prüfungen in eine volle Woche.', 'A formação para o pós-carreira marca todos os exames numa semana carregada.', '引退後に備えて受けている講座の試験が、忙しい一週間に集中した。')),
  sujet('voisinage',
    L('Le voisinage près du centre', 'The neighbours near the training ground', 'Los vecinos junto al centro', 'Il vicinato vicino al centro', 'Die Nachbarn am Trainingsgelände', 'A vizinhança junto ao centro', '練習場近くの住民'),
    L('Des voisins te choisissent comme intermédiaire après des mois de nuisances autour du centre d’entraînement.', 'Neighbours choose you as their intermediary after months of disruption around the training ground.', 'Los vecinos te eligen como intermediario tras meses de molestias alrededor del centro de entrenamiento.', 'I residenti ti scelgono come intermediario dopo mesi di disagi attorno al centro.', 'Anwohner wählen dich nach monatelangen Belastungen rund ums Trainingsgelände als Vermittler.', 'Os moradores escolhem-te como intermediário após meses de incómodo junto ao centro de treinos.', '練習場周辺の騒音に悩む住民たちから、クラブとの仲介役を頼まれた。')),
  sujet('ancien-coach',
    L('L’ancien coach en difficulté', 'The former coach in trouble', 'El antiguo entrenador en apuros', 'Il vecchio allenatore in difficoltà', 'Der frühere Trainer in Schwierigkeiten', 'O antigo treinador em dificuldades', '苦境の恩師'),
    L('Le premier entraîneur qui a cru en toi traverse une période difficile et refuse toute aide officielle.', 'The first coach who believed in you is going through a hard time and refuses official help.', 'El primer entrenador que creyó en ti atraviesa un mal momento y rechaza toda ayuda oficial.', 'Il primo allenatore che ha creduto in te attraversa un momento difficile e rifiuta aiuti ufficiali.', 'Der erste Trainer, der an dich glaubte, hat eine schwere Zeit und lehnt offizielle Hilfe ab.', 'O primeiro treinador que acreditou em ti atravessa um período difícil e recusa ajuda oficial.', '最初に才能を信じてくれた恩師が苦境にあり、公的な支援を拒んでいる。')),
  sujet('demenagement',
    L('Le déménagement à mi-saison', 'The mid-season move', 'La mudanza a mitad de temporada', 'Il trasloco a metà stagione', 'Der Umzug mitten in der Saison', 'A mudança a meio da época', 'シーズン途中の引っ越し'),
    L('Ton logement devient inhabitable et tu dois organiser un déménagement en pleine période sportive.', 'Your home becomes uninhabitable and you must arrange a move during a busy playing period.', 'Tu vivienda queda inhabitable y debes organizar una mudanza en plena competición.', 'La casa diventa inabitabile e devi organizzare un trasloco nel pieno della stagione.', 'Deine Wohnung wird unbewohnbar und du musst mitten in der Saison umziehen.', 'A tua casa fica inabitável e tens de organizar uma mudança em plena competição.', '自宅が住めなくなり、シーズン真っ最中に引っ越しを進める必要が出た。')),
  sujet('secret-famille',
    L('L’histoire familiale exposée', 'The family story exposed', 'La historia familiar expuesta', 'La storia familiare esposta', 'Die offengelegte Familiengeschichte', 'A história familiar exposta', '公になった家族の事情'),
    L('Une histoire intime concernant ta famille est racontée publiquement sans votre accord.', 'An intimate story about your family is told publicly without your consent.', 'Una historia íntima sobre tu familia se cuenta en público sin vuestro permiso.', 'Una storia intima sulla tua famiglia viene raccontata pubblicamente senza consenso.', 'Eine intime Geschichte über deine Familie wird ohne Zustimmung öffentlich erzählt.', 'Uma história íntima sobre a tua família é contada publicamente sem autorização.', '家族の私的な事情が、同意なしに公の場で語られた。')),
  sujet('animal-malade',
    L('Le compagnon à quatre pattes', 'The four-legged companion', 'El compañero de cuatro patas', 'Il compagno a quattro zampe', 'Der vierbeinige Begleiter', 'O companheiro de quatro patas', '大切なペット'),
    L('L’animal qui accompagne ta famille depuis des années doit subir une intervention au moment le moins pratique.', 'The pet that has been with your family for years needs surgery at the worst possible time.', 'El animal que acompaña a tu familia desde hace años debe operarse en el peor momento.', 'L’animale che accompagna la famiglia da anni deve operarsi nel momento peggiore.', 'Das langjährige Haustier deiner Familie braucht ausgerechnet jetzt eine Operation.', 'O animal que acompanha a família há anos precisa de uma operação no pior momento.', '長年家族と暮らしたペットが、最悪のタイミングで手術を必要としている。')),
  sujet('association-locale',
    L('L’association qui compte sur toi', 'The local group counting on you', 'La asociación que cuenta contigo', 'L’associazione che conta su di te', 'Der Verein, der auf dich zählt', 'A associação que conta contigo', '君を頼る地域団体'),
    L('Une petite association locale te demande du temps plutôt qu’un chèque pour maintenir son activité.', 'A small local group asks for your time rather than a cheque to keep its work going.', 'Una pequeña asociación local te pide tiempo, no dinero, para mantener su actividad.', 'Una piccola associazione locale chiede il tuo tempo, non un assegno, per continuare.', 'Eine kleine lokale Initiative bittet um deine Zeit statt um Geld, um weitermachen zu können.', 'Uma pequena associação local pede o teu tempo, não um cheque, para manter a atividade.', '地域の小さな団体が活動を続けるため、お金ではなく君の時間を求めている。')),
];

const SUJETS_CORPS: Sujet[] = [
  sujet('genou-sourd',
    L('Le genou qui murmure', 'The whispering knee', 'La rodilla que susurra', 'Il ginocchio che sussurra', 'Das flüsternde Knie', 'O joelho que sussurra', '小さく訴える膝'),
    L('Une douleur discrète au genou revient après chaque séance sans encore limiter franchement tes appuis.', 'A quiet knee pain returns after every session without yet clearly limiting your movement.', 'Un dolor discreto de rodilla vuelve tras cada sesión sin limitar todavía tus apoyos.', 'Un dolore lieve al ginocchio torna dopo ogni seduta senza limitare ancora chiaramente gli appoggi.', 'Nach jeder Einheit kehrt ein leichter Knieschmerz zurück, ohne dich bisher klar einzuschränken.', 'Uma dor discreta no joelho regressa após cada treino sem ainda limitar claramente os apoios.', '練習のたびに膝の鈍い痛みが戻るが、まだ動きを大きく妨げてはいない。')),
  sujet('epaule-raide',
    L('L’épaule qui ne se libère plus', 'The shoulder that will not loosen', 'El hombro que no se suelta', 'La spalla che non si scioglie', 'Die unbewegliche Schulter', 'O ombro que não solta', 'ほぐれない肩'),
    L('Ton épaule conserve une raideur inhabituelle malgré les soins et les exercices quotidiens.', 'Your shoulder remains unusually stiff despite daily treatment and exercises.', 'Tu hombro mantiene una rigidez inusual pese a los cuidados y ejercicios diarios.', 'La spalla resta insolitamente rigida nonostante cure ed esercizi quotidiani.', 'Deine Schulter bleibt trotz täglicher Behandlung und Übungen ungewöhnlich steif.', 'O teu ombro mantém uma rigidez invulgar apesar dos cuidados e exercícios diários.', '毎日の治療と運動を続けても、肩の異常な硬さが抜けない。')),
  sujet('donnees-sommeil',
    L('Les chiffres de ton sommeil', 'Your sleep numbers', 'Las cifras de tu sueño', 'I numeri del tuo sonno', 'Deine Schlafdaten', 'Os números do teu sono', '睡眠データの警告'),
    L('Les capteurs montrent une récupération très mauvaise alors que tu as l’impression de dormir normalement.', 'The trackers show very poor recovery even though you feel you are sleeping normally.', 'Los sensores muestran una recuperación muy mala aunque crees dormir con normalidad.', 'I sensori mostrano un recupero pessimo anche se ti sembra di dormire normalmente.', 'Die Sensoren zeigen sehr schlechte Erholung, obwohl du glaubst, normal zu schlafen.', 'Os sensores mostram uma recuperação muito má apesar de sentires que dormes normalmente.', '普段通り眠れている感覚なのに、計測データは回復が極端に悪いと示している。')),
  sujet('complement-inconnu',
    L('Le complément sans étiquette', 'The unlabelled supplement', 'El suplemento sin etiqueta', 'L’integratore senza etichetta', 'Das Präparat ohne Etikett', 'O suplemento sem rótulo', '表示のないサプリメント'),
    L('Une personne extérieure au staff te propose un produit censé accélérer la récupération sans montrer sa composition.', 'Someone outside the staff offers a product said to speed recovery without showing its ingredients.', 'Una persona ajena al cuerpo técnico te ofrece un producto que aceleraría la recuperación sin enseñar su composición.', 'Una persona esterna allo staff propone un prodotto che accelererebbe il recupero senza mostrarne gli ingredienti.', 'Jemand außerhalb des Staffs bietet ein angebliches Regenerationsmittel ohne Inhaltsangabe an.', 'Uma pessoa de fora da equipa oferece um produto que aceleraria a recuperação sem mostrar a composição.', 'スタッフ外の人物が、成分を明かさず回復を早めるという製品を勧めてきた。')),
  sujet('symptomes-choc',
    L('Les signes après le choc', 'The signs after the knock', 'Las señales tras el golpe', 'I segnali dopo il colpo', 'Die Zeichen nach dem Schlag', 'Os sinais após o choque', '衝突後の兆候'),
    L('Depuis un choc récent, la lumière te gêne et certains souvenirs immédiats restent flous.', 'Since a recent knock, light bothers you and some immediate memories remain hazy.', 'Desde un golpe reciente, la luz te molesta y algunos recuerdos inmediatos siguen borrosos.', 'Dopo un colpo recente, la luce ti disturba e alcuni ricordi immediati restano confusi.', 'Seit einem Zusammenprall stört dich Licht und manche unmittelbaren Erinnerungen bleiben verschwommen.', 'Desde um choque recente, a luz incomoda-te e algumas memórias imediatas continuam confusas.', '最近の衝突以来、光がつらく、直前の記憶が曖昧になることがある。')),
  sujet('crampes',
    L('Les crampes qui reviennent', 'The recurring cramps', 'Los calambres que vuelven', 'I crampi che tornano', 'Die wiederkehrenden Krämpfe', 'As cãibras que regressam', '繰り返すけいれん'),
    L('Des crampes apparaissent de plus en plus tôt malgré une hydratation et une préparation inchangées.', 'Cramps are appearing earlier and earlier despite unchanged hydration and preparation.', 'Los calambres aparecen cada vez antes pese a mantener la hidratación y la preparación.', 'I crampi arrivano sempre prima nonostante idratazione e preparazione invariate.', 'Krämpfe treten immer früher auf, obwohl Flüssigkeitszufuhr und Vorbereitung gleich bleiben.', 'As cãibras surgem cada vez mais cedo apesar de hidratação e preparação iguais.', '水分補給も準備も変えていないのに、けいれんが以前より早く出る。')),
  sujet('objectif-poids',
    L('Le chiffre imposé par la balance', 'The number imposed by the scales', 'La cifra impuesta por la báscula', 'Il numero imposto dalla bilancia', 'Die Vorgabe der Waage', 'O número imposto pela balança', '体重計が突きつける数字'),
    L('Le staff fixe un objectif de poids très rapide qui pourrait améliorer un secteur tout en fragilisant le reste.', 'The staff sets a rapid weight target that could improve one area while weakening everything else.', 'El cuerpo técnico fija un objetivo de peso muy rápido que podría mejorar un aspecto y debilitar el resto.', 'Lo staff fissa un obiettivo di peso rapido che potrebbe migliorare un aspetto e indebolire il resto.', 'Der Staff setzt ein schnelles Gewichtsziel, das einen Bereich stärken und den Rest schwächen könnte.', 'A equipa fixa um objetivo de peso muito rápido que pode melhorar um setor e fragilizar o resto.', 'スタッフが、一部を強化する代わりに他を損ないかねない急激な体重目標を設定した。')),
  sujet('dent-douleur',
    L('La douleur que personne ne voit', 'The pain nobody sees', 'El dolor que nadie ve', 'Il dolore che nessuno vede', 'Der unsichtbare Schmerz', 'A dor que ninguém vê', '見えない痛み'),
    L('Une douleur dentaire perturbe ton alimentation et ton sommeil sans apparaître dans les tests physiques.', 'A tooth problem is disrupting your eating and sleep without appearing in physical tests.', 'Un dolor dental altera tu alimentación y tu sueño sin aparecer en las pruebas físicas.', 'Un dolore dentale disturba alimentazione e sonno senza comparire nei test fisici.', 'Zahnschmerzen stören Essen und Schlaf, tauchen aber in keinem Fitnesstest auf.', 'Uma dor dentária perturba alimentação e sono sem aparecer nos testes físicos.', '歯の痛みが食事と睡眠を乱しているが、フィジカルテストには何も出ない。')),
  sujet('cicatrice',
    L('La vieille cicatrice', 'The old scar', 'La vieja cicatriz', 'La vecchia cicatrice', 'Die alte Narbe', 'A velha cicatriz', '古傷'),
    L('Une ancienne cicatrice devient sensible au contact et change inconsciemment ta manière de plaquer.', 'An old scar becomes tender on contact and unconsciously changes the way you tackle.', 'Una vieja cicatriz se vuelve sensible al contacto y cambia sin querer tu forma de placar.', 'Una vecchia cicatrice diventa sensibile al contatto e cambia inconsciamente il modo di placcare.', 'Eine alte Narbe reagiert empfindlich auf Kontakt und verändert unbewusst deine Tacklingtechnik.', 'Uma velha cicatriz torna-se sensível ao contacto e muda sem quereres a forma de placar.', '古傷が接触に敏感になり、無意識にタックルの形まで変わっている。')),
  sujet('plateau-reeducation',
    L('Le plateau de la rééducation', 'The rehabilitation plateau', 'El estancamiento de la rehabilitación', 'Il blocco della riabilitazione', 'Das Plateau in der Reha', 'O bloqueio da reabilitação', '停滞するリハビリ'),
    L('Après des semaines de travail, les mesures ne progressent plus et la date de retour commence à s’éloigner.', 'After weeks of work, the measurements have stopped improving and the return date is slipping away.', 'Tras semanas de trabajo, las mediciones ya no mejoran y la fecha de regreso empieza a alejarse.', 'Dopo settimane di lavoro, i valori non migliorano più e la data del rientro si allontana.', 'Nach Wochen Arbeit verbessern sich die Werte nicht mehr, und die Rückkehr rückt in die Ferne.', 'Após semanas de trabalho, as medições deixam de melhorar e a data de regresso começa a afastar-se.', '何週間も取り組んだのに数値が伸びず、復帰予定日が遠のき始めている。')),
];

const SUJETS_NUIT: Sujet[] = [
  sujet('diner-prolonge',
    L('Le dîner qui ne finit plus', 'The dinner that will not end', 'La cena que no termina', 'La cena che non finisce', 'Das endlose Abendessen', 'O jantar que não acaba', '終わらない夕食会'),
    L('Le dîner d’équipe se prolonge et plusieurs joueurs veulent déplacer la soirée dans un lieu beaucoup moins calme.', 'The team dinner runs late and several players want to move on to a much less quiet venue.', 'La cena del equipo se alarga y varios jugadores quieren continuar en un lugar mucho menos tranquilo.', 'La cena di squadra si prolunga e diversi giocatori vogliono spostarsi in un posto molto meno tranquillo.', 'Das Mannschaftsessen zieht sich, und mehrere Spieler wollen in ein deutlich wilderes Lokal weiterziehen.', 'O jantar da equipa prolonga-se e vários jogadores querem continuar num local muito menos calmo.', 'チームの夕食会が長引き、何人かがもっと騒がしい場所へ移ろうと言い出した。')),
  sujet('telephone-braque',
    L('La caméra d’un inconnu', 'A stranger’s camera', 'La cámara de un desconocido', 'La telecamera di uno sconosciuto', 'Die Kamera eines Fremden', 'A câmara de um desconhecido', '見知らぬ人のカメラ'),
    L('Un inconnu filme volontairement votre table et cherche manifestement une réaction spectaculaire.', 'A stranger deliberately films your table and is clearly looking for a spectacular reaction.', 'Un desconocido graba vuestra mesa a propósito y busca claramente una reacción espectacular.', 'Uno sconosciuto filma apposta il vostro tavolo e cerca chiaramente una reazione spettacolare.', 'Ein Fremder filmt absichtlich euren Tisch und will offensichtlich eine spektakuläre Reaktion.', 'Um desconhecido filma de propósito a vossa mesa e procura claramente uma reação espetacular.', '見知らぬ人物がわざと席を撮影し、派手な反応を引き出そうとしている。')),
  sujet('coequipier-ivre',
    L('Le coéquipier qui ne tient plus debout', 'The teammate who cannot stand', 'El compañero que no se tiene en pie', 'Il compagno che non sta in piedi', 'Der Mitspieler, der nicht mehr stehen kann', 'O colega que já não se aguenta de pé', '立てなくなった仲間'),
    L('Un coéquipier très alcoolisé refuse de rentrer et commence à provoquer les personnes autour de lui.', 'A very drunk teammate refuses to leave and starts provoking people around him.', 'Un compañero muy borracho se niega a irse y empieza a provocar a la gente de alrededor.', 'Un compagno molto ubriaco rifiuta di tornare e comincia a provocare chi gli sta intorno.', 'Ein stark betrunkener Mitspieler will nicht gehen und provoziert die Leute um sich herum.', 'Um colega muito embriagado recusa ir embora e começa a provocar quem está à volta.', 'ひどく酔った仲間が帰宅を拒み、周囲の人に絡み始めた。')),
  sujet('altercation',
    L('La dispute à la sortie', 'The argument outside', 'La discusión a la salida', 'La lite all’uscita', 'Der Streit vor der Tür', 'A discussão à saída', '店外での口論'),
    L('Une remarque adressée à un jeune joueur déclenche une dispute qui attire déjà les regards.', 'A remark aimed at a young player starts an argument that is already drawing attention.', 'Un comentario dirigido a un joven jugador provoca una discusión que ya atrae miradas.', 'Una frase rivolta a un giovane giocatore scatena una lite che attira già gli sguardi.', 'Eine Bemerkung gegen einen jungen Spieler löst einen Streit aus, der bereits Aufmerksamkeit zieht.', 'Uma observação dirigida a um jovem jogador provoca uma discussão que já atrai olhares.', '若手への一言から口論が始まり、すでに周囲の視線を集めている。')),
  sujet('telephone-perdu',
    L('Le téléphone disparu', 'The missing phone', 'El teléfono desaparecido', 'Il telefono scomparso', 'Das verschwundene Telefon', 'O telemóvel desaparecido', '消えた携帯電話'),
    L('Ton téléphone professionnel disparaît avec des conversations privées et plusieurs documents du club.', 'Your work phone disappears with private conversations and several club documents on it.', 'Desaparece tu teléfono profesional con conversaciones privadas y varios documentos del club.', 'Scompare il telefono di lavoro con conversazioni private e vari documenti del club.', 'Dein Diensthandy verschwindet samt privater Gespräche und mehrerer Vereinsdokumente.', 'O teu telemóvel profissional desaparece com conversas privadas e vários documentos do clube.', '私的な会話やクラブ資料が入った仕事用携帯がなくなった。')),
  sujet('taxi-refus',
    L('Le dernier trajet', 'The last ride home', 'El último trayecto', 'L’ultima corsa', 'Die letzte Fahrt', 'A última viagem', '最後の帰路'),
    L('Le dernier véhicule refuse de prendre tout le groupe et personne ne veut laisser un joueur seul.', 'The last vehicle refuses to take the whole group and nobody wants to leave one player behind.', 'El último vehículo se niega a llevar a todo el grupo y nadie quiere dejar solo a un jugador.', 'L’ultimo veicolo non prende tutto il gruppo e nessuno vuole lasciare solo un giocatore.', 'Das letzte Fahrzeug nimmt nicht die ganze Gruppe mit, und niemand will einen Spieler allein lassen.', 'O último veículo recusa levar todo o grupo e ninguém quer deixar um jogador sozinho.', '最後の車が全員を乗せられず、誰も一人だけ残したくない。')),
  sujet('lieu-clandestin',
    L('L’adresse sans enseigne', 'The unmarked venue', 'El local sin cartel', 'Il locale senza insegna', 'Der Ort ohne Schild', 'O local sem letreiro', '看板のない会場'),
    L('La suite de la soirée est annoncée dans un lieu privé dont personne ne connaît réellement l’organisateur.', 'The night is set to continue at a private venue whose organiser nobody really knows.', 'La noche seguirá en un local privado cuyo organizador nadie conoce de verdad.', 'La serata continua in un luogo privato di cui nessuno conosce davvero l’organizzatore.', 'Der Abend soll an einem privaten Ort weitergehen, dessen Veranstalter niemand wirklich kennt.', 'A noite vai continuar num local privado cujo organizador ninguém conhece realmente.', '誰が主催しているか誰も知らない私的な会場で、二次会が開かれるという。')),
  sujet('controle-police',
    L('Le contrôle sur le chemin', 'The roadside check', 'El control en el camino', 'Il controllo lungo la strada', 'Die Kontrolle auf dem Heimweg', 'A operação na estrada', '帰路の検問'),
    L('Un contrôle de police immobilise le véhicule alors que plusieurs passagers deviennent nerveux.', 'A police check stops the vehicle while several passengers grow nervous.', 'Un control policial detiene el vehículo mientras varios pasajeros se ponen nerviosos.', 'Un controllo di polizia ferma il veicolo mentre diversi passeggeri diventano nervosi.', 'Eine Polizeikontrolle hält das Fahrzeug an, während mehrere Mitfahrer nervös werden.', 'Uma operação policial imobiliza o veículo enquanto vários passageiros ficam nervosos.', '警察の検問で車が止められ、何人かの同乗者が落ち着きを失っている。')),
  sujet('direct-reseaux',
    L('Le direct lancé sans prévenir', 'The surprise livestream', 'El directo iniciado sin avisar', 'La diretta iniziata senza avvisare', 'Der Livestream ohne Warnung', 'O direto iniciado sem aviso', '突然始まったライブ配信'),
    L('Un joueur lance une diffusion en direct alors que tout le monde pense encore être dans un espace privé.', 'A player starts a livestream while everyone still thinks they are in a private space.', 'Un jugador inicia un directo mientras todos creen seguir en un espacio privado.', 'Un giocatore avvia una diretta mentre tutti pensano ancora di essere in uno spazio privato.', 'Ein Spieler startet einen Livestream, während alle noch von einem privaten Raum ausgehen.', 'Um jogador inicia um direto enquanto todos pensam ainda estar num espaço privado.', '全員が私的な場だと思っている中、一人の選手が突然ライブ配信を始めた。')),
  sujet('reveil-aeroport',
    L('Le réveil avant l’avion', 'The alarm before the flight', 'La alarma antes del avión', 'La sveglia prima del volo', 'Der Wecker vor dem Flug', 'O despertador antes do avião', '早朝便前の目覚まし'),
    L('Le vol du lendemain part à l’aube et la moitié du groupe semble avoir oublié l’heure du rendez-vous.', 'Tomorrow’s flight leaves at dawn and half the group seems to have forgotten the meeting time.', 'El vuelo de mañana sale al amanecer y la mitad del grupo parece haber olvidado la hora de encuentro.', 'Il volo di domani parte all’alba e metà del gruppo sembra aver dimenticato l’appuntamento.', 'Der Flug am nächsten Morgen geht im Morgengrauen, und die Hälfte der Gruppe scheint die Treffzeit vergessen zu haben.', 'O voo de amanhã parte de madrugada e metade do grupo parece ter esquecido a hora do encontro.', '翌朝の便は夜明け前なのに、チームの半分が集合時間を忘れているようだ。')),
];

const SUJETS_CLUB: Sujet[] = [
  sujet('materiel-ecole',
    L('Les maillots de l’école de rugby', 'The academy shirts', 'Las camisetas de la escuela de rugby', 'Le maglie della scuola rugby', 'Die Trikots der Rugbyjugend', 'As camisolas da escola de râguebi', 'ラグビースクールのジャージー'),
    L('L’école de rugby n’a plus assez de matériel adapté et risque de refuser de nouvelles inscriptions.', 'The rugby academy no longer has enough suitable equipment and may have to reject new registrations.', 'La escuela de rugby ya no tiene material suficiente y puede tener que rechazar nuevas inscripciones.', 'La scuola rugby non ha più abbastanza materiale e rischia di rifiutare nuove iscrizioni.', 'Der Rugby-Nachwuchs hat nicht genug passende Ausrüstung und muss womöglich neue Anmeldungen ablehnen.', 'A escola de râguebi já não tem material suficiente e pode ter de recusar novas inscrições.', 'ラグビースクールの用具が足りず、新規参加者を断らざるを得なくなりそうだ。')),
  sujet('travaux-stade',
    L('Le stade en travaux', 'The stadium under construction', 'El estadio en obras', 'Lo stadio in ristrutturazione', 'Das Stadion als Baustelle', 'O estádio em obras', '改修中のスタジアム'),
    L('Les travaux du stade prennent du retard et menacent plusieurs rendez-vous importants du club.', 'Stadium work is running late and threatens several important club dates.', 'Las obras del estadio se retrasan y amenazan varias citas importantes del club.', 'I lavori allo stadio sono in ritardo e minacciano diversi appuntamenti importanti.', 'Die Stadionarbeiten liegen zurück und gefährden mehrere wichtige Vereinstermine.', 'As obras do estádio atrasam-se e ameaçam vários compromissos importantes do clube.', 'スタジアム改修が遅れ、クラブの重要行事がいくつも危うくなっている。')),
  sujet('benevoles',
    L('Les bénévoles à bout', 'The exhausted volunteers', 'Los voluntarios agotados', 'I volontari esausti', 'Die erschöpften Ehrenamtlichen', 'Os voluntários esgotados', '疲れ切ったボランティア'),
    L('Les bénévoles historiques préviennent qu’ils arrêteront si leur charge et leur manque de reconnaissance ne changent pas.', 'Long-serving volunteers warn they will quit unless their workload and lack of recognition change.', 'Los voluntarios históricos avisan de que lo dejarán si no cambian su carga y falta de reconocimiento.', 'I volontari storici avvertono che lasceranno se non cambiano carico e mancanza di riconoscimento.', 'Langjährige Ehrenamtliche kündigen ihren Rückzug an, wenn Belastung und fehlende Anerkennung bleiben.', 'Os voluntários históricos avisam que vão sair se a carga e a falta de reconhecimento não mudarem.', '長年支えてきたボランティアが、負担と評価が変わらなければ辞めると通告した。')),
  sujet('section-feminine',
    L('Le créneau de la section féminine', 'The women’s team training slot', 'El horario de la sección femenina', 'L’orario della squadra femminile', 'Die Trainingszeit der Frauenmannschaft', 'O horário da equipa feminina', '女子チームの練習枠'),
    L('La section féminine réclame un partage plus équitable des terrains et des équipements du club.', 'The women’s team is asking for fairer access to club pitches and equipment.', 'La sección femenina reclama un reparto más justo de campos y material del club.', 'La squadra femminile chiede un accesso più equo a campi e attrezzature.', 'Die Frauenmannschaft fordert gerechteren Zugang zu Plätzen und Ausrüstung.', 'A equipa feminina pede um acesso mais justo aos campos e equipamentos do clube.', '女子チームが、グラウンドと用具をより公平に使えるよう求めている。')),
  sujet('educateur-part',
    L('Le départ de l’éducateur', 'The youth coach’s departure', 'La marcha del formador', 'La partenza dell’educatore', 'Der Abschied des Jugendtrainers', 'A saída do treinador da formação', '育成コーチの退任'),
    L('Un éducateur respecté annonce son départ après des mois sans réponse à ses demandes simples.', 'A respected youth coach announces his departure after months without answers to simple requests.', 'Un formador respetado anuncia su marcha tras meses sin respuesta a peticiones sencillas.', 'Un educatore rispettato annuncia l’addio dopo mesi senza risposta a richieste semplici.', 'Ein angesehener Jugendtrainer geht nach Monaten ohne Antwort auf einfache Anliegen.', 'Um treinador respeitado da formação anuncia a saída após meses sem resposta a pedidos simples.', '信頼される育成コーチが、簡単な要望にも数か月返答がなかったとして退任を告げた。')),
  sujet('bus-panne',
    L('Le transporteur absent', 'The missing bus company', 'La empresa de autobuses ausente', 'Il trasportatore assente', 'Das ausgefallene Busunternehmen', 'A transportadora ausente', '来ないバス会社'),
    L('Le transporteur habituel annonce qu’il ne pourra assurer plusieurs déplacements déjà planifiés.', 'The regular bus company says it cannot cover several already scheduled trips.', 'La empresa habitual anuncia que no podrá cubrir varios desplazamientos ya previstos.', 'Il trasportatore abituale comunica che non potrà coprire diverse trasferte già programmate.', 'Das übliche Busunternehmen kann mehrere geplante Auswärtsfahrten nicht übernehmen.', 'A transportadora habitual informa que não poderá assegurar várias deslocações já planeadas.', 'いつものバス会社が、予定済みの遠征を複数運行できないと連絡してきた。')),
  sujet('pelouse',
    L('L’avertissement du jardinier', 'The groundskeeper’s warning', 'La advertencia del jardinero', 'L’avvertimento del giardiniere', 'Die Warnung des Platzwarts', 'O aviso do jardineiro', 'グラウンドキーパーの警告'),
    L('Le jardinier estime que continuer à utiliser le terrain principal le rendra impraticable pendant plusieurs semaines.', 'The groundskeeper believes continued use of the main pitch will make it unplayable for several weeks.', 'El jardinero cree que seguir usando el campo principal lo dejará impracticable durante semanas.', 'Il giardiniere ritiene che continuare a usare il campo principale lo renderà impraticabile per settimane.', 'Der Platzwart warnt, dass weitere Nutzung den Hauptplatz wochenlang unbespielbar machen wird.', 'O jardineiro considera que continuar a usar o campo principal vai deixá-lo impraticável durante semanas.', 'グラウンドキーパーは、このまま主競技場を使えば数週間使用不能になると警告している。')),
  sujet('archives-club',
    L('Les cartons de l’histoire du club', 'The boxes of club history', 'Las cajas de la historia del club', 'Gli scatoloni della storia del club', 'Die Kisten der Vereinsgeschichte', 'As caixas da história do clube', 'クラブ史の段ボール箱'),
    L('Des archives uniques vont être jetées faute de place et personne ne sait encore comment les préserver.', 'Unique archives are about to be thrown away for lack of space and nobody knows how to preserve them.', 'Unos archivos únicos van a tirarse por falta de espacio y nadie sabe aún cómo conservarlos.', 'Archivi unici stanno per essere buttati per mancanza di spazio e nessuno sa come salvarli.', 'Einmalige Vereinsarchive sollen aus Platzmangel entsorgt werden, und niemand weiß, wie man sie rettet.', 'Arquivos únicos vão ser deitados fora por falta de espaço e ninguém sabe ainda como os preservar.', '保管場所がないため貴重な資料が廃棄されようとしているが、保存方法が決まっていない。')),
  sujet('salon-sponsors',
    L('Le salon réservé aux sponsors', 'The sponsor-only lounge', 'El salón reservado a patrocinadores', 'La sala riservata agli sponsor', 'Die exklusive Sponsorenlounge', 'A sala reservada aos patrocinadores', 'スポンサー専用ラウンジ'),
    L('Des sponsors veulent privatiser un espace jusque-là accessible aux familles et aux anciens du club.', 'Sponsors want exclusive use of an area previously open to families and club veterans.', 'Los patrocinadores quieren privatizar una zona hasta ahora abierta a familias y veteranos.', 'Gli sponsor vogliono privatizzare uno spazio finora aperto a famiglie ed ex giocatori.', 'Sponsoren wollen einen Bereich exklusiv nutzen, der bisher Familien und Ehemaligen offenstand.', 'Os patrocinadores querem privatizar um espaço até agora aberto a famílias e antigos jogadores.', 'スポンサーが、これまで家族やOBにも開かれていた場所を専用化したいと要求している。')),
  sujet('derby-securite',
    L('Le derby sous surveillance', 'The derby under scrutiny', 'El derbi bajo vigilancia', 'Il derby sotto sorveglianza', 'Das Derby unter Beobachtung', 'O dérbi sob vigilância', '警戒下のダービー'),
    L('Des incidents récents obligent le club à revoir l’accueil du prochain derby sans punir tous les supporters.', 'Recent incidents force the club to rethink the next derby without punishing every supporter.', 'Incidentes recientes obligan al club a replantear el próximo derbi sin castigar a toda la afición.', 'Incidenti recenti obbligano il club a ripensare il prossimo derby senza punire tutti i tifosi.', 'Jüngste Vorfälle zwingen den Verein, das nächste Derby neu zu planen, ohne alle Fans zu bestrafen.', 'Incidentes recentes obrigam o clube a repensar o próximo dérbi sem castigar todos os adeptos.', '最近の事件を受け、全サポーターを罰することなく次のダービー運営を見直す必要がある。')),
];

const SUJETS_CARRIERE: Sujet[] = [
  sujet('offre-etranger',
    L('L’offre venue de l’étranger', 'The offer from abroad', 'La oferta del extranjero', 'L’offerta dall’estero', 'Das Angebot aus dem Ausland', 'A proposta do estrangeiro', '海外からのオファー'),
    L('Un club étranger propose un rôle important, mais dans un championnat dont tu connais mal le niveau réel.', 'A foreign club offers an important role in a competition whose true level you barely know.', 'Un club extranjero ofrece un papel importante en una liga cuyo nivel real conoces poco.', 'Un club straniero offre un ruolo importante in un campionato di cui conosci poco il vero livello.', 'Ein ausländischer Verein bietet eine wichtige Rolle in einer Liga, deren Niveau du kaum kennst.', 'Um clube estrangeiro oferece um papel importante num campeonato cujo nível real conheces mal.', '海外クラブから重要な役割を提示されたが、そのリーグの実力をよく知らない。')),
  sujet('nouveau-poste',
    L('Le poste qui peut prolonger ta carrière', 'The position that could extend your career', 'El puesto que puede alargar tu carrera', 'Il ruolo che può allungare la carriera', 'Die Position für eine längere Karriere', 'A posição que pode prolongar a carreira', 'キャリアを延ばすポジション'),
    L('Le staff pense qu’un poste voisin préserverait ton corps mais exigerait de réapprendre plusieurs automatismes.', 'The staff believes a nearby position would protect your body but require relearning several habits.', 'El cuerpo técnico cree que un puesto cercano protegería tu cuerpo, pero exigiría reaprender varios automatismos.', 'Lo staff pensa che un ruolo vicino proteggerebbe il corpo ma richiederebbe di reimparare molti automatismi.', 'Der Staff meint, eine benachbarte Position würde deinen Körper schonen, aber viele Abläufe neu verlangen.', 'A equipa pensa que uma posição próxima protegeria o corpo, mas exigiria reaprender vários automatismos.', 'スタッフは、隣のポジションなら身体を守れるが、多くの動きを学び直す必要があると考えている。')),
  sujet('capitanat',
    L('Le brassard sans unanimité', 'The captaincy without consensus', 'El brazalete sin unanimidad', 'La fascia senza unanimità', 'Das Kapitänsamt ohne Einigkeit', 'A braçadeira sem unanimidade', '全員一致ではない主将候補'),
    L('Le coach envisage de te nommer capitaine alors qu’une partie du vestiaire préfère un autre cadre.', 'The coach is considering making you captain while part of the squad prefers another senior player.', 'El entrenador piensa nombrarte capitán, aunque parte del vestuario prefiere a otro veterano.', 'L’allenatore pensa di nominarti capitano mentre parte dello spogliatoio preferisce un altro senatore.', 'Der Trainer erwägt dich als Kapitän, obwohl ein Teil der Mannschaft einen anderen Führungsspieler bevorzugt.', 'O treinador pensa nomear-te capitão, embora parte do balneário prefira outro veterano.', '監督は君を主将に考えているが、チームの一部は別の中心選手を支持している。')),
  sujet('pret',
    L('Six mois ailleurs', 'Six months elsewhere', 'Seis meses fuera', 'Sei mesi altrove', 'Sechs Monate anderswo', 'Seis meses noutro lugar', '半年間の期限付き移籍'),
    L('Un prêt de six mois garantirait du temps de jeu sans aucune promesse sur ton rôle au retour.', 'A six-month loan would guarantee playing time but offers no promise about your role on return.', 'Una cesión de seis meses garantizaría minutos, sin promesas sobre tu papel al volver.', 'Un prestito di sei mesi garantirebbe gioco senza promesse sul ruolo al ritorno.', 'Eine sechsmonatige Leihe garantiert Spielzeit, aber keine Rolle nach der Rückkehr.', 'Um empréstimo de seis meses garante tempo de jogo sem promessas sobre o papel no regresso.', '半年の期限付き移籍なら出場機会は保証されるが、復帰後の役割は約束されない。')),
  sujet('rugby-sept',
    L('La parenthèse à sept', 'The sevens opportunity', 'El paréntesis del seven', 'La parentesi nel seven', 'Der Abstecher zum Siebener', 'A passagem pelo râguebi de sete', 'セブンズへの挑戦'),
    L('La fédération te propose une préparation à sept qui développerait tes qualités mais t’éloignerait du club.', 'The union offers you a sevens programme that would develop your skills but take you away from the club.', 'La federación te ofrece una preparación de seven que mejoraría tus cualidades, pero te alejaría del club.', 'La federazione propone una preparazione a sette che svilupperebbe le qualità ma ti allontanerebbe dal club.', 'Der Verband bietet ein Siebener-Programm, das dich weiterentwickeln, aber vom Verein entfernen würde.', 'A federação propõe uma preparação de sete que desenvolveria as qualidades, mas afastar-te-ia do clube.', '協会から、能力を伸ばせる一方でクラブを離れるセブンズの強化合宿に誘われた。')),
  sujet('agent-retraite',
    L('La retraite de ton agent', 'Your agent’s retirement', 'La jubilación de tu agente', 'Il ritiro del tuo agente', 'Der Ruhestand deines Beraters', 'A reforma do teu agente', '代理人の引退'),
    L('Ton agent historique arrête et souhaite transmettre ton dossier à une personne que tu n’as jamais rencontrée.', 'Your long-time agent is retiring and wants to hand your file to someone you have never met.', 'Tu agente de siempre se retira y quiere pasar tu expediente a alguien que nunca has conocido.', 'Il tuo agente storico si ritira e vuole passare il dossier a una persona mai incontrata.', 'Dein langjähriger Berater hört auf und will deine Akte jemandem übergeben, den du nie getroffen hast.', 'O teu agente histórico reforma-se e quer entregar o dossiê a alguém que nunca conheceste.', '長年の代理人が引退し、会ったことのない人物へ君の担当を引き継ぎたいと言っている。')),
  sujet('diplome-coach',
    L('Le premier diplôme d’entraîneur', 'The first coaching qualification', 'El primer título de entrenador', 'Il primo diploma da allenatore', 'Die erste Trainerlizenz', 'O primeiro diploma de treinador', '最初の指導者資格'),
    L('Une formation d’entraîneur compatible avec ta carrière occuperait presque toutes les prochaines coupures.', 'A coaching course compatible with your career would take up almost every coming break.', 'Una formación de entrenador compatible con tu carrera ocuparía casi todos los próximos descansos.', 'Un corso da allenatore compatibile con la carriera occuperebbe quasi tutte le prossime pause.', 'Eine Trainerfortbildung neben der Karriere würde fast jede kommende Pause beanspruchen.', 'Uma formação de treinador compatível com a carreira ocuparia quase todas as próximas pausas.', '現役と両立できる指導者講習があるが、今後の休養期間をほぼすべて使うことになる。')),
  sujet('consultant',
    L('Le micro du consultant', 'The pundit’s microphone', 'El micrófono del comentarista', 'Il microfono dell’opinionista', 'Das Mikrofon des Experten', 'O microfone do comentador', '解説者のマイク'),
    L('Une chaîne te propose de commenter des rencontres et d’évaluer publiquement des joueurs que tu affrontes encore.', 'A broadcaster offers you pundit work judging players you still face on the field.', 'Una cadena te ofrece comentar partidos y evaluar públicamente a jugadores a los que aún te enfrentas.', 'Una rete ti propone di commentare partite e giudicare pubblicamente giocatori che affronti ancora.', 'Ein Sender will dich als Experten, der Spieler bewertet, gegen die du noch antrittst.', 'Um canal propõe-te comentar jogos e avaliar publicamente jogadores que ainda enfrentas.', '放送局から、今も対戦する選手を公に評価する解説の仕事を提示された。')),
  sujet('prolongation-doublure',
    L('La prolongation avec un nouveau rôle', 'The extension with a new role', 'La renovación con un nuevo papel', 'Il rinnovo con un nuovo ruolo', 'Die Verlängerung mit neuer Rolle', 'A renovação com um novo papel', '役割変更を伴う契約延長'),
    L('Le club propose une saison supplémentaire avec un rôle de doublure, moins d’argent et davantage de mentorat.', 'The club offers another season as a back-up, with less money and more mentoring.', 'El club ofrece una temporada más como suplente, con menos dinero y más mentoría.', 'Il club offre un’altra stagione da riserva, con meno denaro e più tutoraggio.', 'Der Verein bietet ein weiteres Jahr als Ersatz, mit weniger Geld und mehr Mentorenaufgaben.', 'O clube propõe mais uma época como suplente, com menos dinheiro e mais mentoria.', 'クラブから、報酬を下げて控えと若手指導を担う一年延長を提示された。')),
  sujet('contact-rival',
    L('Le message du rival historique', 'The historic rival’s message', 'El mensaje del rival histórico', 'Il messaggio della rivale storica', 'Die Nachricht des Erzrivalen', 'A mensagem do rival histórico', '宿敵クラブからの連絡'),
    L('Le rival historique de ton club te contacte discrètement avec un projet sportif très ambitieux.', 'Your club’s historic rival contacts you discreetly with a highly ambitious sporting project.', 'El rival histórico de tu club te contacta discretamente con un proyecto deportivo muy ambicioso.', 'La rivale storica del club ti contatta in segreto con un progetto sportivo molto ambizioso.', 'Der Erzrivale deines Vereins meldet sich diskret mit einem äußerst ehrgeizigen Projekt.', 'O rival histórico do clube contacta-te discretamente com um projeto desportivo muito ambicioso.', 'クラブの宿敵から、非常に野心的な計画を携えて秘密裏に連絡が来た。')),
];

const THEMES: Theme[] = [
  {
    categorie: 'vestiaire', emoji: '🫂', sujets: SUJETS_VESTIAIRE,
    relances: ['urgence', 'public', 'conflit', 'moyens', 'temoin', 'passe', 'compromis'],
    approches: APPROCHES.vestiaire, poids: 0.72,
  },
  {
    categorie: 'argent', emoji: '💶', sujets: SUJETS_ARGENT,
    relances: ['urgence', 'public', 'conflit', 'moyens', 'passe', 'fuite'],
    approches: APPROCHES.argent, poids: 0.62,
  },
  {
    categorie: 'medias', emoji: '📡', sujets: SUJETS_MEDIAS,
    relances: ['urgence', 'public', 'conflit', 'temoin', 'passe', 'fuite'],
    approches: APPROCHES.medias, poids: 0.64,
  },
  {
    categorie: 'perso', emoji: '🧭', sujets: SUJETS_PERSO,
    relances: ['urgence', 'public', 'conflit', 'moyens', 'temoin', 'compromis'],
    approches: APPROCHES.perso, poids: 0.66,
  },
  {
    categorie: 'corps', emoji: '🫀', sujets: SUJETS_CORPS,
    relances: ['urgence', 'public', 'conflit', 'moyens', 'temoin', 'passe'],
    approches: APPROCHES.corps, poids: 0.58,
  },
  {
    categorie: 'nuit', emoji: '🌃', sujets: SUJETS_NUIT,
    relances: ['urgence', 'public', 'conflit', 'moyens', 'temoin', 'fuite'],
    approches: APPROCHES.nuit, poids: 0.48,
  },
  {
    categorie: 'club', emoji: '🏟️', sujets: SUJETS_CLUB,
    relances: ['urgence', 'public', 'conflit', 'moyens', 'temoin', 'fuite', 'compromis'],
    approches: APPROCHES.club, poids: 0.68,
  },
  {
    categorie: 'carriere', emoji: '🛤️', sujets: SUJETS_CARRIERE,
    relances: ['urgence', 'public', 'conflit', 'moyens', 'passe', 'compromis'],
    approches: APPROCHES.carriere, poids: 0.6,
  },
];

const LANGUES: Langue[] = ['fr', 'en', 'es', 'it', 'de', 'pt', 'ja'];
const ATTRIBUTS_IMPACT: StatVariable[] = [
  'mental', 'vision', 'endurance', 'passe', 'plaquage', 'force', 'vitesse', 'jeuAuPied',
];

function traduitTout(fabrique: (langue: Langue) => string): Traduction {
  return Object.fromEntries(LANGUES.map((langue) => [langue, fabrique(langue)])) as Traduction;
}

function titreCompose(s: Sujet, r: Relance, langue: Langue): string {
  return `${s.titre[langue]} — ${r.titre[langue]}`;
}

function sceneComposee(s: Sujet, r: Relance, langue: Langue): string {
  return `${s.scene[langue]} ${r.texte[langue]}`;
}

/**
 * Ajoute une petite variation technique propre à chaque combinaison. Les
 * profils éditoriaux gardent la direction du choix ; la variation évite que
 * deux décisions proches produisent exactement la même fiche d'impact.
 */
function issuePour(
  a: Approche, themeIndex: number, sujetIndex: number, relanceIndex: number, choixIndex: number,
): IssueSituation {
  const deltas: Deltas = { ...a.deltas };
  const attribut = ATTRIBUTS_IMPACT[
    (themeIndex * 11 + sujetIndex * 5 + relanceIndex * 3 + choixIndex) % ATTRIBUTS_IMPACT.length
  ];
  const variation = a.orientation > 0 ? 1 : a.orientation < 0 ? -1 : ((sujetIndex + relanceIndex) % 2 ? 1 : -1);
  deltas[attribut] = (deltas[attribut] ?? 0) + variation;

  // Les scènes d'argent utilisent des montants différents sans changer le
  // sens du choix. Cela rend les conséquences crédibles à plusieurs niveaux.
  if (THEMES[themeIndex].categorie === 'argent') {
    const palier = 200 * (1 + ((sujetIndex * 3 + relanceIndex) % 8));
    deltas.argent = (deltas.argent ?? 0) + (a.orientation < 0 ? -palier : palier);
  }

  const ovas = Math.max(0, Math.min(7, a.ovas + ((sujetIndex + relanceIndex + choixIndex) % 3) - 1));
  return { recit: a.recit.fr, deltas, ovas, ...(a.extras ?? {}) };
}

const situations: Situation[] = [];
const textes: Record<string, Traduction> = {};

for (const [themeIndex, theme] of THEMES.entries()) {
  for (const [sujetIndex, s] of theme.sujets.entries()) {
    for (const [relanceIndex, relanceId] of theme.relances.entries()) {
      const r = RELANCES[relanceId];
      const id = `etendue-${theme.categorie}-${s.id}-${r.id}`;

      // Quatre attitudes existent dans chaque univers. En retirer une à tour
      // de rôle donne toujours trois vrais choix, sans ordre automatique du
      // « bon » au « mauvais ».
      const retire = (sujetIndex + relanceIndex) % theme.approches.length;
      const retenues = theme.approches.filter((_, index) => index !== retire);
      const rotation = (themeIndex + sujetIndex + relanceIndex) % retenues.length;
      const ordonnees = [...retenues.slice(rotation), ...retenues.slice(0, rotation)];

      situations.push({
        id,
        emoji: theme.emoji,
        categorie: theme.categorie,
        poids: theme.poids + ((sujetIndex + relanceIndex) % 3) * 0.04,
        titre: titreCompose(s, r, 'fr'),
        situation: sceneComposee(s, r, 'fr'),
        choix: ordonnees.map((a, choixIndex) => ({
          texte: a.choix.fr,
          issue: issuePour(a, themeIndex, sujetIndex, relanceIndex, choixIndex),
        })),
      });

      textes[`sit.${id}.titre`] = traduitTout((langue) => titreCompose(s, r, langue));
      textes[`sit.${id}.txt`] = traduitTout((langue) => sceneComposee(s, r, langue));
      for (const [choixIndex, a] of ordonnees.entries()) {
        textes[`sit.${id}.c${choixIndex}`] = traduitTout((langue) => a.choix[langue]);
        textes[`sit.${id}.r${choixIndex}`] = traduitTout((langue) => a.recit[langue]);
      }
    }
  }
}

if (situations.length !== 500) {
  throw new Error(`Le catalogue étendu doit contenir exactement 500 situations (reçu : ${situations.length}).`);
}

const ids = new Set(situations.map((s) => s.id));
if (ids.size !== situations.length) {
  throw new Error('Le catalogue étendu contient des identifiants de situation en double.');
}

export const SITUATIONS_ETENDUES: Situation[] = situations;
export const TEXTES_SITUATIONS_ETENDUES: Record<string, Traduction> = textes;
