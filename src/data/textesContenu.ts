// LE CONTENU HORS LIGNE, EN SEPT LANGUES
//
// ⚠️ CE QUE CE FICHIER TRADUIT, ET POURQUOI IL EXISTE.
// Le jeu doit rester jouable SANS IA locale — c'est une règle du projet. Dans ce
// mode, tout ce qu'on lit vient de pools pré-écrits : les situations de vie
// (`data/situations.ts`), les scénarios (`data/scenarios.ts`), les évènements
// aléatoires (`data/evenements.ts`).
// Avec une clé, l'IA écrit directement dans la langue du joueur
// (`consigneDeLangue`) ; sans clé, il n'y avait RIEN — un joueur japonais
// tombait sur du français. C'est ce trou que ce fichier bouche.
//
// (Les pools de commentaire du moteur de match, eux, vivent dans
// `lib/moteur/commentaire.ts` : ce sont des tableaux tirés à la graine, pas des
// clés, et leur traduction obéit à une contrainte de déterminisme — voir là-bas.)
//
// CONVENTION DE CLÉS — l'id de l'entrée est celui de la donnée source, ce qui
// permet de traduire à la volée sans dupliquer les deltas ni les conditions :
//   sit.<id>.titre / .txt / .c<n> (libellé du choix) / .r<n> (récit de l'issue)
//   scn.<id>.…  idem pour les scénarios
//   evt.<id>.titre / .txt
//   mom.<id>.titre / .txt / .o<n> / .o<n>.ok / .o<n>.ko
//
// ⚠️ Une clé manquante retombe sur le français (`t()`), et les fonctions de
// traduction (`traduireSituation`, `traduireEvenement`…) renvoient l'objet
// d'origine intact : jamais de trou, jamais de « sit.bizutage.titre » à l'écran.

import type { Traduction } from '../lib/i18n.js';

import { TEXTES_SITUATIONS } from './textesSituations.js';
import { TEXTES_SITUATIONS_ETENDUES } from './situationsEtendues.js';

export const TEXTES_CONTENU: Record<string, Traduction> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // ÉVÈNEMENTS ALÉATOIRES (data/evenements.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  'evt.repere.titre': { fr: 'Repéré par un recruteur', en: 'Spotted by a scout', es: 'Descubierto por un ojeador', it: 'Notato da un osservatore', de: 'Von einem Scout entdeckt', pt: 'Descoberto por um olheiro', ja: 'スカウトの目に留まる' },
  'evt.repere.txt': {
    fr: 'Un recruteur d’un grand club t’a observé à l’entraînement. Ta cote grimpe.',
    en: 'A scout from a big club watched you train. Your stock is rising.',
    es: 'Un ojeador de un gran club te observó en el entrenamiento. Tu cotización sube.',
    it: 'Un osservatore di un grande club ti ha visto in allenamento. La tua quotazione sale.',
    de: 'Ein Scout eines großen Vereins hat dich im Training beobachtet. Dein Marktwert steigt.',
    pt: 'Um olheiro de um grande clube viu-te a treinar. A tua cotação sobe.',
    ja: '強豪クラブのスカウトが練習を見ていた。評価が上がっている。',
  },
  'evt.blessure.titre': { fr: 'Petite blessure', en: 'Minor injury', es: 'Lesión leve', it: 'Piccolo infortunio', de: 'Kleine Verletzung', pt: 'Lesão ligeira', ja: '軽い負傷' },
  'evt.blessure.txt': {
    fr: 'Une gêne à l’ischio te freine deux semaines. La rééducation entame ta forme.',
    en: 'A tight hamstring slows you down for two weeks. Rehab eats into your fitness.',
    es: 'Una molestia en el isquio te frena dos semanas. La rehabilitación merma tu forma.',
    it: 'Un fastidio al flessore ti frena per due settimane. La riabilitazione intacca la forma.',
    de: 'Eine Verhärtung im Oberschenkel bremst dich zwei Wochen. Die Reha kostet Form.',
    pt: 'Um incómodo no isquiotibial trava-te duas semanas. A reabilitação come a tua forma.',
    ja: 'ハムストリングの張りで2週間離脱。リハビリでコンディションが落ちる。',
  },
  'evt.essai.titre': { fr: 'Essai en solitaire', en: 'Solo try', es: 'Ensayo en solitario', it: 'Meta in solitaria', de: 'Solo-Versuch', pt: 'Ensaio a solo', ja: '独走トライ' },
  'evt.essai.txt': {
    fr: 'Crochet, appui, et tu aplatis dans le coin ! Le stade explose.',
    en: 'A step, a change of pace, and you ground it in the corner! The stadium erupts.',
    es: '¡Quiebro, apoyo y anotas en el rincón! El estadio estalla.',
    it: 'Finta, appoggio, e schiacci in bandierina! Lo stadio esplode.',
    de: 'Ein Haken, ein Antritt, und du legst in der Ecke ab! Das Stadion tobt.',
    pt: 'Um corte, um apoio, e apoias no canto! O estádio explode.',
    ja: 'ステップ、加速、そしてコーナーでグラウンディング！ スタジアムが沸く。',
  },
  'evt.presse.titre': { fr: 'Polémique dans la presse', en: 'A press storm', es: 'Polémica en la prensa', it: 'Polemica sulla stampa', de: 'Wirbel in der Presse', pt: 'Polémica na imprensa', ja: '報道が炎上' },
  'evt.presse.txt': {
    fr: 'Une déclaration mal comprise fait la une. L’ambiance se tend.',
    en: 'A misread quote makes the front page. The mood tightens.',
    es: 'Una declaración malinterpretada abre los diarios. El ambiente se tensa.',
    it: 'Una dichiarazione fraintesa finisce in prima pagina. L’aria si fa pesante.',
    de: 'Eine missverstandene Aussage steht auf der Titelseite. Die Stimmung kippt.',
    pt: 'Uma declaração mal interpretada abre os jornais. O ambiente aperta.',
    ja: '誤解された発言が一面に。空気が張り詰める。',
  },
  'evt.sponsor.titre': { fr: 'Contrat de sponsoring', en: 'Sponsorship deal', es: 'Contrato de patrocinio', it: 'Contratto di sponsorizzazione', de: 'Sponsorenvertrag', pt: 'Contrato de patrocínio', ja: 'スポンサー契約' },
  'evt.sponsor.txt': {
    fr: 'Un équipementier te propose un partenariat. Ton compte respire.',
    en: 'A kit brand offers you a partnership. Your bank account breathes.',
    es: 'Una marca deportiva te ofrece un acuerdo. Tu cuenta respira.',
    it: 'Un marchio tecnico ti propone una partnership. Il conto respira.',
    de: 'Ein Ausrüster bietet dir eine Partnerschaft an. Dein Konto atmet auf.',
    pt: 'Uma marca de equipamento propõe-te uma parceria. A tua conta respira.',
    ja: '用具メーカーからパートナー契約の話。懐に余裕ができる。',
  },
  'evt.capitaine.titre': { fr: 'Brassard de capitaine', en: 'The captain’s armband', es: 'Brazalete de capitán', it: 'Fascia da capitano', de: 'Kapitänsbinde', pt: 'Braçadeira de capitão', ja: 'キャプテンマーク' },
  'evt.capitaine.txt': {
    fr: 'Le coach te confie le brassard pour un match. Le leadership te grandit.',
    en: 'The coach hands you the armband for a game. Leadership makes you taller.',
    es: 'El entrenador te da el brazalete por un partido. El liderazgo te hace crecer.',
    it: 'L’allenatore ti affida la fascia per una partita. La leadership ti fa crescere.',
    de: 'Der Trainer gibt dir für ein Spiel die Binde. Verantwortung lässt dich wachsen.',
    pt: 'O treinador dá-te a braçadeira num jogo. A liderança faz-te crescer.',
    ja: 'コーチが一試合キャプテンを任せた。責任が人を大きくする。',
  },
  'evt.fatigue.titre': { fr: 'Coup de fatigue', en: 'Hitting the wall', es: 'Bajón de energía', it: 'Colpo di stanchezza', de: 'Müdigkeitseinbruch', pt: 'Quebra de energia', ja: '疲労の蓄積' },
  'evt.fatigue.txt': {
    fr: 'Enchaînement de matchs, sommeil en vrac. Ton corps tire la langue.',
    en: 'Games back to back, sleep in pieces. Your body is hanging on.',
    es: 'Partidos encadenados, sueño hecho trizas. Tu cuerpo saca la lengua.',
    it: 'Partite a raffica, sonno a pezzi. Il corpo è a terra.',
    de: 'Spiel auf Spiel, kaputter Schlaf. Dein Körper hängt durch.',
    pt: 'Jogos seguidos, sono aos bocados. O corpo dá sinais.',
    ja: '連戦に睡眠不足。体が悲鳴を上げている。',
  },
  'evt.muscu.titre': { fr: 'Cycle de musculation réussi', en: 'A gym block that paid off', es: 'Ciclo de gimnasio exitoso', it: 'Ciclo di pesi riuscito', de: 'Erfolgreicher Kraftblock', pt: 'Ciclo de ginásio bem-sucedido', ja: '筋力強化サイクル成功' },
  'evt.muscu.txt': {
    fr: 'Six semaines de fonte payantes : tu pousses des charges records.',
    en: 'Six weeks of iron pay off: you are lifting personal bests.',
    es: 'Seis semanas de hierro con premio: mueves cargas récord.',
    it: 'Sei settimane di ghisa ripagate: sollevi carichi record.',
    de: 'Sechs Wochen Eisen zahlen sich aus: Du drückst Bestwerte.',
    pt: 'Seis semanas de ferro compensadas: levantas cargas recorde.',
    ja: '6週間の鉄が実る。自己ベストの重量を挙げた。',
  },
  'evt.penalty.titre': { fr: 'Pénalité de la gagne', en: 'The winning penalty', es: 'El penal de la victoria', it: 'Il calcio della vittoria', de: 'Der Siegstrafstoß', pt: 'O pontapé da vitória', ja: '決勝のペナルティゴール' },
  'evt.penalty.txt': {
    fr: 'Dernière minute, face aux poteaux… et tu la passes. Sang-froid total.',
    en: 'Last minute, in front of the posts… and you slot it. Ice cold.',
    es: 'Último minuto, frente a los palos… y la metes. Sangre fría total.',
    it: 'Ultimo minuto, davanti ai pali… e la metti dentro. Freddezza assoluta.',
    de: 'Letzte Minute, vor den Stangen … und du verwandelst. Eiskalt.',
    pt: 'Último minuto, em frente aos postes… e marcas. Sangue-frio total.',
    ja: 'ラストプレー、ポール正面、決めた。完璧な冷静さ。',
  },
  'evt.carton.titre': { fr: 'Carton rouge', en: 'Red card', es: 'Tarjeta roja', it: 'Cartellino rosso', de: 'Rote Karte', pt: 'Cartão vermelho', ja: 'レッドカード' },
  'evt.carton.txt': {
    fr: 'Un plaquage haut de trop : tu files aux vestiaires. Suspension à la clé.',
    en: 'One high tackle too many: off you go. A ban is coming.',
    es: 'Un placaje alto de más: te vas al vestuario. Sanción asegurada.',
    it: 'Un placcaggio alto di troppo: negli spogliatoi. Squalifica in arrivo.',
    de: 'Ein hohes Tackling zu viel: ab in die Kabine. Sperre inklusive.',
    pt: 'Uma placagem alta a mais: vais para o balneário. Suspensão à vista.',
    ja: 'ハイタックル一つで退場。出場停止は免れない。',
  },
  'evt.jeune.titre': { fr: 'Mentor d’un jeune', en: 'Mentoring a youngster', es: 'Mentor de un joven', it: 'Mentore di un giovane', de: 'Mentor eines Jungen', pt: 'Mentor de um jovem', ja: '若手の指導役' },
  'evt.jeune.txt': {
    fr: 'Tu prends un espoir sous ton aile. Transmettre te recentre.',
    en: 'You take a prospect under your wing. Passing it on centres you.',
    es: 'Tomas a una promesa bajo tu ala. Transmitir te recentra.',
    it: 'Prendi un giovane sotto la tua ala. Trasmettere ti ricentra.',
    de: 'Du nimmst ein Talent unter deine Fittiche. Weitergeben erdet dich.',
    pt: 'Levas uma promessa debaixo da tua asa. Transmitir centra-te.',
    ja: '有望株を手元に置いて育てる。伝えることが自分を整える。',
  },
  'evt.derby.titre': { fr: 'Homme du match dans le derby', en: 'Man of the match in the derby', es: 'Mejor jugador del derbi', it: 'Migliore in campo nel derby', de: 'Spieler des Spiels im Derby', pt: 'Homem do jogo no dérbi', ja: 'ダービーのマン・オブ・ザ・マッチ' },
  'evt.derby.txt': {
    fr: 'Dans le choc de la région, tu as tout dévoré. Héros d’un soir.',
    en: 'In the local showdown, you devoured everything. Hero for a night.',
    es: 'En el choque de la región, lo devoraste todo. Héroe por una noche.',
    it: 'Nello scontro di zona hai divorato tutto. Eroe per una sera.',
    de: 'Im Duell der Region hast du alles verschlungen. Held eines Abends.',
    pt: 'No choque da região, devoraste tudo. Herói por uma noite.',
    ja: '地域の大一番で全てを支配した。今夜のヒーロー。',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCÉNARIOS À CHOIX (data/scenarios.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  'scn.contrat.titre': { fr: 'Première proposition de contrat', en: 'Your first contract offer', es: 'Primera oferta de contrato', it: 'Prima proposta di contratto', de: 'Das erste Vertragsangebot', pt: 'Primeira proposta de contrato', ja: '初めての契約提示' },
  'scn.contrat.txt': {
    fr: 'Le club te propose ton premier contrat pro, mais le salaire est modeste. Ton agent pense que tu peux négocier.',
    en: 'The club offers you your first pro contract, but the money is modest. Your agent thinks you can push.',
    es: 'El club te ofrece tu primer contrato profesional, pero el salario es modesto. Tu agente cree que puedes negociar.',
    it: 'Il club ti propone il primo contratto da professionista, ma lo stipendio è modesto. Il tuo agente pensa che si possa trattare.',
    de: 'Der Verein bietet dir deinen ersten Profivertrag, aber das Gehalt ist bescheiden. Dein Berater glaubt, da geht mehr.',
    pt: 'O clube oferece-te o primeiro contrato profissional, mas o salário é modesto. O teu agente acha que dá para negociar.',
    ja: 'クラブが初のプロ契約を提示。ただし年俸は控えめだ。エージェントは交渉の余地があると見ている。',
  },
  'scn.contrat.c0': { fr: 'Signer tout de suite, la sécurité avant tout.', en: 'Sign right away, security first.', es: 'Firmar ya, la seguridad primero.', it: 'Firmare subito, prima la sicurezza.', de: 'Sofort unterschreiben, Sicherheit zuerst.', pt: 'Assinar já, segurança primeiro.', ja: 'すぐ署名する。まずは安定を。' },
  'scn.contrat.r0': {
    fr: 'Tu signes sans discuter. Le staff apprécie ta loyauté et ta sérénité.',
    en: 'You sign without haggling. The staff notes your loyalty and your calm.',
    es: 'Firmas sin discutir. El cuerpo técnico valora tu lealtad y tu serenidad.',
    it: 'Firmi senza discutere. Lo staff apprezza la tua lealtà e la tua calma.',
    de: 'Du unterschreibst ohne Feilschen. Der Staff schätzt deine Treue und Ruhe.',
    pt: 'Assinas sem discutir. A equipa técnica aprecia a tua lealdade e serenidade.',
    ja: '交渉せずに署名。スタッフは忠誠心と落ち着きを評価した。',
  },
  'scn.contrat.c1': { fr: 'Négocier un meilleur salaire.', en: 'Negotiate a better wage.', es: 'Negociar un mejor salario.', it: 'Trattare uno stipendio migliore.', de: 'Ein besseres Gehalt aushandeln.', pt: 'Negociar um salário melhor.', ja: 'より良い年俸を交渉する。' },
  'scn.contrat.r1': {
    fr: 'Bras de fer tendu… mais tu obtiens gain de cause. Le vestiaire te regarde autrement.',
    en: 'A tense stand-off… but you get your way. The dressing room sees you differently.',
    es: 'Pulso tenso… pero te sales con la tuya. El vestuario te mira de otra forma.',
    it: 'Braccio di ferro teso… ma la spunti. Lo spogliatoio ti guarda diversamente.',
    de: 'Ein zähes Ringen … aber du setzt dich durch. Die Kabine sieht dich anders.',
    pt: 'Braço de ferro tenso… mas ganhas a queda. O balneário olha-te de outra forma.',
    ja: '緊張した綱引き、だが押し切った。ロッカールームの見る目が変わる。',
  },
  'scn.contrat.c2': { fr: 'Tester le marché ailleurs.', en: 'Test the market elsewhere.', es: 'Tantear el mercado en otro sitio.', it: 'Sondare il mercato altrove.', de: 'Den Markt anderswo testen.', pt: 'Testar o mercado noutro lado.', ja: '他所で市場価値を試す。' },
  'scn.contrat.r2': {
    fr: 'Personne ne surenchérit et le club se braque. Tu reviens signer, un peu échaudé.',
    en: 'Nobody outbids and the club digs in. You come back and sign, a little burnt.',
    es: 'Nadie puja más y el club se cierra. Vuelves a firmar, algo escarmentado.',
    it: 'Nessuno rilancia e il club si irrigidisce. Torni a firmare, un po’ scottato.',
    de: 'Niemand überbietet, der Verein macht dicht. Du kommst zurück und unterschreibst, leicht gebrannt.',
    pt: 'Ninguém licita mais e o clube fecha-se. Voltas a assinar, um pouco queimado.',
    ja: '競合は現れず、クラブは態度を硬化。少し痛い目を見て署名に戻る。',
  },
  'scn.soiree.titre': { fr: 'Soirée la veille du match', en: 'A night out before the game', es: 'Fiesta la víspera del partido', it: 'Serata alla vigilia della partita', de: 'Party am Abend vor dem Spiel', pt: 'Noitada na véspera do jogo', ja: '試合前夜の誘い' },
  'scn.soiree.txt': {
    fr: 'Tes coéquipiers t’entraînent en soirée alors que tu joues demain. Que fais-tu ?',
    en: 'Your team-mates drag you out the night before you play. What do you do?',
    es: 'Tus compañeros te arrastran de fiesta y mañana juegas. ¿Qué haces?',
    it: 'I compagni ti trascinano fuori la sera prima di giocare. Che fai?',
    de: 'Deine Mitspieler ziehen dich am Abend vor dem Spiel raus. Was tust du?',
    pt: 'Os teus colegas arrastam-te para a noite e amanhã jogas. O que fazes?',
    ja: '明日は試合。チームメイトが夜遊びに誘ってきた。どうする？',
  },
  'scn.soiree.c0': { fr: 'Rester te reposer et bien dormir.', en: 'Stay in, rest, sleep properly.', es: 'Quedarte a descansar y dormir bien.', it: 'Restare a riposare e dormire bene.', de: 'Zu Hause bleiben und gut schlafen.', pt: 'Ficar a descansar e dormir bem.', ja: '家で休んでしっかり寝る。' },
  'scn.soiree.r0': {
    fr: 'Frais et affûté, tu réalises un gros match. Le coach le remarque.',
    en: 'Fresh and sharp, you put in a big performance. The coach notices.',
    es: 'Fresco y afilado, haces un partidazo. El entrenador lo nota.',
    it: 'Fresco e affilato, disputi una gran partita. L’allenatore lo nota.',
    de: 'Frisch und scharf lieferst du ein großes Spiel. Der Trainer merkt es.',
    pt: 'Fresco e afiado, fazes um grande jogo. O treinador repara.',
    ja: '万全の状態で大きな試合をやってのけた。コーチは見ている。',
  },
  'scn.soiree.c1': { fr: 'Sortir un peu, sans excès.', en: 'Go out briefly, nothing silly.', es: 'Salir un poco, sin excesos.', it: 'Uscire un po’, senza esagerare.', de: 'Kurz mitgehen, ohne Übertreibung.', pt: 'Sair um bocado, sem exageros.', ja: '少しだけ顔を出す。羽目は外さない。' },
  'scn.soiree.r1': {
    fr: 'Bonne ambiance, mais tu accuses le coup au réveil. Match moyen.',
    en: 'Good fun, but you feel it in the morning. An average game.',
    es: 'Buen ambiente, pero lo acusas al despertar. Partido mediocre.',
    it: 'Bella serata, ma al risveglio la paghi. Partita mediocre.',
    de: 'Nette Runde, aber morgens spürst du es. Durchschnittliches Spiel.',
    pt: 'Bom ambiente, mas sentes ao acordar. Jogo médio.',
    ja: '楽しい夜だったが、朝に響いた。平凡な出来。',
  },
  'scn.soiree.c2': { fr: 'Sortir toute la nuit.', en: 'Stay out all night.', es: 'Salir toda la noche.', it: 'Restare fuori tutta la notte.', de: 'Die ganze Nacht durchmachen.', pt: 'Ficar fora a noite toda.', ja: '朝まで飲む。' },
  'scn.soiree.r2': {
    fr: 'Catastrophe : jambes lourdes, erreurs, remplacé à la mi-temps.',
    en: 'A disaster: heavy legs, errors, hooked at half-time.',
    es: 'Desastre: piernas pesadas, errores, sustituido al descanso.',
    it: 'Disastro: gambe pesanti, errori, sostituito all’intervallo.',
    de: 'Desaster: schwere Beine, Fehler, zur Halbzeit runter.',
    pt: 'Desastre: pernas pesadas, erros, substituído ao intervalo.',
    ja: '大失敗。足は重く、ミス連発、ハーフタイムで交代。',
  },
  'scn.blessure_choix.titre': { fr: 'Douleur avant un grand match', en: 'A niggle before a big game', es: 'Dolor antes de un gran partido', it: 'Dolore prima di una grande partita', de: 'Schmerz vor einem großen Spiel', pt: 'Dor antes de um grande jogo', ja: '大一番前の痛み' },
  'scn.blessure_choix.txt': {
    fr: 'Tu ressens une gêne musculaire à deux jours d’un match capital. Le staff te laisse juge.',
    en: 'You feel a muscle niggle two days before a huge game. The staff leaves it to you.',
    es: 'Sientes una molestia muscular a dos días de un partido capital. El staff te deja decidir.',
    it: 'Senti un fastidio muscolare a due giorni da una partita capitale. Lo staff lascia decidere a te.',
    de: 'Zwei Tage vor einem entscheidenden Spiel zwickt ein Muskel. Der Staff überlässt dir die Wahl.',
    pt: 'Sentes um incómodo muscular a dois dias de um jogo decisivo. A equipa técnica deixa-te decidir.',
    ja: '大一番の2日前、筋肉に違和感。判断はお前に任せるとスタッフは言う。',
  },
  'scn.blessure_choix.c0': { fr: 'Déclarer forfait pour te soigner.', en: 'Rule yourself out and get treated.', es: 'Declararte baja para curarte.', it: 'Dare forfait per curarti.', de: 'Absagen und behandeln lassen.', pt: 'Desistir do jogo para tratar.', ja: '欠場を申し出て治療する。' },
  'scn.blessure_choix.r0': {
    fr: 'Sage décision : tu reviens à 100 % la semaine suivante.',
    en: 'A wise call: you come back at 100 % the following week.',
    es: 'Decisión sabia: vuelves al 100 % la semana siguiente.',
    it: 'Scelta saggia: torni al 100 % la settimana dopo.',
    de: 'Kluge Entscheidung: Du kommst nächste Woche bei 100 % zurück.',
    pt: 'Decisão sensata: voltas a 100 % na semana seguinte.',
    ja: '賢明な判断。翌週には万全で戻ってきた。',
  },
  'scn.blessure_choix.c1': { fr: 'Serrer les dents et jouer.', en: 'Grit your teeth and play.', es: 'Apretar los dientes y jugar.', it: 'Stringere i denti e giocare.', de: 'Zähne zusammenbeißen und spielen.', pt: 'Cerrar os dentes e jogar.', ja: '歯を食いしばって出る。' },
  'scn.blessure_choix.r1': {
    fr: 'Tu tiens… jusqu’à la 60ᵉ où la blessure se rouvre. Plusieurs semaines dehors.',
    en: 'You hold on… until the 60th minute, when it goes again. Weeks on the sidelines.',
    es: 'Aguantas… hasta el minuto 60, cuando la lesión se reabre. Varias semanas fuera.',
    it: 'Reggi… fino al 60º, quando l’infortunio si riapre. Diverse settimane fuori.',
    de: 'Du hältst durch … bis zur 60. Minute, dann reißt es wieder. Wochen Pause.',
    pt: 'Aguentas… até aos 60 minutos, quando a lesão reabre. Várias semanas de fora.',
    ja: '60分までは持った。そこで再発。数週間の離脱。',
  },
  'scn.media.titre': { fr: 'Interview d’après-match', en: 'Post-match interview', es: 'Entrevista tras el partido', it: 'Intervista dopo la partita', de: 'Interview nach dem Spiel', pt: 'Entrevista pós-jogo', ja: '試合後インタビュー' },
  'scn.media.txt': {
    fr: 'Après une défaite frustrante, un journaliste te tend le micro. L’arbitrage était discutable.',
    en: 'After a frustrating defeat, a reporter holds out the mic. The refereeing was debatable.',
    es: 'Tras una derrota frustrante, un periodista te acerca el micro. El arbitraje fue discutible.',
    it: 'Dopo una sconfitta frustrante, un giornalista ti porge il microfono. L’arbitraggio era discutibile.',
    de: 'Nach einer frustrierenden Niederlage hält dir ein Reporter das Mikro hin. Die Schiedsrichterleistung war fragwürdig.',
    pt: 'Depois de uma derrota frustrante, um jornalista estende-te o microfone. A arbitragem foi discutível.',
    ja: '悔しい敗戦の後、記者がマイクを向ける。レフェリングには疑問が残った。',
  },
  'scn.media.c0': { fr: 'Rester diplomate et fair-play.', en: 'Stay diplomatic and sporting.', es: 'Ser diplomático y deportivo.', it: 'Restare diplomatico e sportivo.', de: 'Diplomatisch und fair bleiben.', pt: 'Ser diplomático e desportivo.', ja: '外交的に、フェアに答える。' },
  'scn.media.r0': {
    fr: 'Ta maturité impressionne. Ton image grandit.',
    en: 'Your maturity impresses. Your image grows.',
    es: 'Tu madurez impresiona. Tu imagen crece.',
    it: 'La tua maturità colpisce. La tua immagine cresce.',
    de: 'Deine Reife beeindruckt. Dein Image wächst.',
    pt: 'A tua maturidade impressiona. A tua imagem cresce.',
    ja: '成熟した対応が評価される。イメージが上がった。',
  },
  'scn.media.c1': { fr: 'Critiquer ouvertement l’arbitre.', en: 'Openly criticise the referee.', es: 'Criticar abiertamente al árbitro.', it: 'Criticare apertamente l’arbitro.', de: 'Den Schiedsrichter offen kritisieren.', pt: 'Criticar abertamente o árbitro.', ja: '公然とレフェリーを批判する。' },
  'scn.media.r1': {
    fr: 'Le buzz enfle, la commission te sanctionne. Mauvaise pub.',
    en: 'The buzz swells, the panel sanctions you. Bad publicity.',
    es: 'El ruido crece, el comité te sanciona. Mala publicidad.',
    it: 'Il caso monta, la commissione ti sanziona. Cattiva pubblicità.',
    de: 'Der Wirbel wächst, das Gremium bestraft dich. Schlechte Presse.',
    pt: 'O ruído cresce, a comissão sanciona-te. Má publicidade.',
    ja: '騒ぎは大きくなり、規律委員会が処分を下す。悪い宣伝だ。',
  },
  'scn.jeune_talent.titre': { fr: 'Un cadre te met au défi', en: 'A senior player calls you out', es: 'Un veterano te reta', it: 'Un senatore ti sfida', de: 'Ein Führungsspieler fordert dich heraus', pt: 'Um veterano desafia-te', ja: '主力選手からの挑戦' },
  'scn.jeune_talent.txt': {
    fr: 'À l’entraînement, un ancien du club te provoque sur un exercice de plaquage devant tout le monde.',
    en: 'At training, a club veteran challenges you on a tackling drill in front of everyone.',
    es: 'En el entrenamiento, un veterano del club te provoca en un ejercicio de placaje delante de todos.',
    it: 'In allenamento, un veterano del club ti provoca in un esercizio di placcaggio davanti a tutti.',
    de: 'Im Training fordert dich ein Vereinsveteran bei einer Tackling-Übung vor allen heraus.',
    pt: 'No treino, um veterano do clube provoca-te num exercício de placagem à frente de todos.',
    ja: '練習中、ベテランが全員の前でタックル練習の勝負を仕掛けてきた。',
  },
  'scn.jeune_talent.c0': { fr: 'Relever le défi à fond.', en: 'Take it on, full bore.', es: 'Aceptar el reto a tope.', it: 'Raccogliere la sfida a fondo.', de: 'Die Herausforderung voll annehmen.', pt: 'Aceitar o desafio a fundo.', ja: '全力で受けて立つ。' },
  'scn.jeune_talent.r0': {
    fr: 'Tu ne lâches rien et gagnes le respect du groupe.',
    en: 'You give nothing away and win the group’s respect.',
    es: 'No cedes nada y te ganas el respeto del grupo.',
    it: 'Non molli di un centimetro e ti guadagni il rispetto del gruppo.',
    de: 'Du gibst keinen Zentimeter ab und gewinnst den Respekt der Gruppe.',
    pt: 'Não cedes nada e ganhas o respeito do grupo.',
    ja: '一歩も引かず、チームの敬意を勝ち取った。',
  },
  'scn.jeune_talent.c1': { fr: 'Rester prudent pour éviter la blessure.', en: 'Stay careful, avoid the injury.', es: 'Ser prudente para evitar lesionarte.', it: 'Restare prudente per evitare l’infortunio.', de: 'Vorsichtig bleiben, Verletzung vermeiden.', pt: 'Ser prudente para evitar a lesão.', ja: '怪我を避けて慎重にいく。' },
  'scn.jeune_talent.r1': {
    fr: 'Choix raisonnable, mais certains y voient un manque de caractère.',
    en: 'A sensible call, but some read it as a lack of bottle.',
    es: 'Elección razonable, pero algunos lo leen como falta de carácter.',
    it: 'Scelta ragionevole, ma qualcuno ci legge una mancanza di carattere.',
    de: 'Vernünftig, doch manche lesen darin fehlenden Charakter.',
    pt: 'Escolha sensata, mas alguns leem-na como falta de carácter.',
    ja: '妥当な判断。だが気概の欠如と見る者もいる。',
  },
  'scn.transfert.titre': { fr: 'Offre d’un club plus huppé', en: 'An offer from a bigger club', es: 'Oferta de un club más grande', it: 'Offerta di un club più blasonato', de: 'Angebot eines größeren Vereins', pt: 'Proposta de um clube maior', ja: '格上クラブからのオファー' },
  'scn.transfert.txt': {
    fr: 'Un club d’une division supérieure te veut, mais tu y seras remplaçant. Ton club actuel te fait jouer titulaire.',
    en: 'A club a division up wants you, but you would be a substitute there. Your current club starts you every week.',
    es: 'Un club de una división superior te quiere, pero allí serías suplente. Tu club actual te hace titular.',
    it: 'Un club di categoria superiore ti vuole, ma lì saresti riserva. Il tuo club attuale ti fa giocare titolare.',
    de: 'Ein Verein eine Liga höher will dich, dort wärst du Ersatz. Dein aktueller Verein lässt dich starten.',
    pt: 'Um clube de uma divisão acima quer-te, mas serias suplente. O teu clube atual dá-te titularidade.',
    ja: '上位リーグのクラブが興味を示す。だが向こうでは控えだ。今のクラブなら先発。',
  },
  'scn.transfert.c0': { fr: 'Partir pour le grand club.', en: 'Leave for the big club.', es: 'Irte al club grande.', it: 'Partire per il grande club.', de: 'Zum großen Verein wechseln.', pt: 'Sair para o clube grande.', ja: 'ビッグクラブへ移る。' },
  'scn.transfert.r0': {
    fr: 'Nouveau standing, mais tu ronges ton frein sur le banc.',
    en: 'A new standing, but you chew the bit on the bench.',
    es: 'Nuevo estatus, pero te comes las uñas en el banquillo.',
    it: 'Nuovo status, ma mordi il freno in panchina.',
    de: 'Neues Ansehen, aber du scharrst auf der Bank.',
    pt: 'Novo estatuto, mas roes o freio no banco.',
    ja: '格は上がった。だがベンチで焦れる日々。',
  },
  'scn.transfert.c1': { fr: 'Rester titulaire et t’imposer.', en: 'Stay a starter and make your name.', es: 'Quedarte de titular e imponerte.', it: 'Restare titolare e imporsi.', de: 'Stammspieler bleiben und dich durchsetzen.', pt: 'Ficar titular e impor-te.', ja: '先発として残り、地位を築く。' },
  'scn.transfert.r1': {
    fr: 'Tu enchaînes les matchs et progresses vite. Les recruteurs notent.',
    en: 'You rack up games and improve fast. Scouts take note.',
    es: 'Encadenas partidos y progresas rápido. Los ojeadores toman nota.',
    it: 'Colleziona partite e cresci in fretta. Gli osservatori prendono nota.',
    de: 'Du sammelst Spiele und entwickelst dich schnell. Scouts notieren.',
    pt: 'Acumulas jogos e progrides depressa. Os olheiros tomam nota.',
    ja: '出場を重ね、急速に伸びる。スカウトが書き留めた。',
  },
  'scn.capitanat.titre': { fr: 'Le brassard te tend les bras', en: 'The armband is there for the taking', es: 'El brazalete te espera', it: 'La fascia ti aspetta', de: 'Die Binde liegt bereit', pt: 'A braçadeira espera-te', ja: 'キャプテンマークが手の届くところに' },
  'scn.capitanat.txt': {
    fr: 'Le capitaine est blessé. Le coach hésite à te confier le brassard malgré ton jeune âge.',
    en: 'The captain is injured. The coach hesitates to give you the armband despite your youth.',
    es: 'El capitán está lesionado. El entrenador duda en darte el brazalete pese a tu juventud.',
    it: 'Il capitano è infortunato. L’allenatore esita ad affidarti la fascia nonostante la giovane età.',
    de: 'Der Kapitän ist verletzt. Der Trainer zögert, dir trotz deiner Jugend die Binde zu geben.',
    pt: 'O capitão está lesionado. O treinador hesita em dar-te a braçadeira apesar da tua juventude.',
    ja: 'キャプテンが負傷。コーチは若いお前に任せるか迷っている。',
  },
  'scn.capitanat.c0': { fr: 'Accepter la responsabilité.', en: 'Take the responsibility.', es: 'Aceptar la responsabilidad.', it: 'Accettare la responsabilità.', de: 'Die Verantwortung annehmen.', pt: 'Aceitar a responsabilidade.', ja: '責任を引き受ける。' },
  'scn.capitanat.r0': {
    fr: 'Tu mènes le groupe avec autorité. Un leader est né.',
    en: 'You lead the group with authority. A leader is born.',
    es: 'Diriges al grupo con autoridad. Ha nacido un líder.',
    it: 'Guidi il gruppo con autorità. È nato un leader.',
    de: 'Du führst die Gruppe mit Autorität. Ein Anführer ist geboren.',
    pt: 'Lideras o grupo com autoridade. Nasceu um líder.',
    ja: '威厳をもってチームを率いた。リーダーが生まれた。',
  },
  'scn.capitanat.c1': { fr: 'Refuser, tu ne te sens pas prêt.', en: 'Decline, you don’t feel ready.', es: 'Rechazar, no te sientes preparado.', it: 'Rifiutare, non ti senti pronto.', de: 'Ablehnen, du fühlst dich nicht bereit.', pt: 'Recusar, não te sentes pronto.', ja: '断る。まだその時ではない。' },
  'scn.capitanat.r1': {
    fr: 'Honnête, mais l’occasion passe à un autre.',
    en: 'Honest, but the chance goes to someone else.',
    es: 'Honesto, pero la oportunidad pasa a otro.',
    it: 'Onesto, ma l’occasione passa a un altro.',
    de: 'Ehrlich, doch die Chance geht an einen anderen.',
    pt: 'Honesto, mas a oportunidade passa para outro.',
    ja: '正直な判断。だが機会は他の誰かへ。',
  },
  'scn.entrainement_choix.titre': { fr: 'Programme d’intersaison', en: 'Pre-season programme', es: 'Programa de pretemporada', it: 'Programma di preparazione', de: 'Vorbereitungsprogramm', pt: 'Programa de pré-época', ja: 'オフシーズンのプログラム' },
  'scn.entrainement_choix.txt': {
    fr: 'Tu as six semaines pour te préparer. Sur quoi mets-tu l’accent ?',
    en: 'You have six weeks to prepare. Where do you put the emphasis?',
    es: 'Tienes seis semanas para prepararte. ¿En qué pones el acento?',
    it: 'Hai sei settimane per prepararti. Su cosa punti?',
    de: 'Du hast sechs Wochen Vorbereitung. Worauf legst du den Fokus?',
    pt: 'Tens seis semanas para te preparares. Em que pões a ênfase?',
    ja: '準備期間は6週間。何に重点を置く？',
  },
  'scn.entrainement_choix.c0': { fr: 'Puissance et musculation.', en: 'Power and weights.', es: 'Potencia y musculación.', it: 'Potenza e pesi.', de: 'Kraft und Gewichte.', pt: 'Potência e musculação.', ja: 'パワーとウエイト。' },
  'scn.entrainement_choix.r0': {
    fr: 'Tu prends de la masse et de la percussion.',
    en: 'You pack on mass and carrying power.',
    es: 'Ganas masa y capacidad de choque.',
    it: 'Metti su massa e capacità d’urto.',
    de: 'Du legst an Masse und Wucht zu.',
    pt: 'Ganhas massa e capacidade de choque.',
    ja: '体重が増え、当たりが強くなった。',
  },
  'scn.entrainement_choix.c1': { fr: 'Vitesse et cardio.', en: 'Speed and conditioning.', es: 'Velocidad y cardio.', it: 'Velocità e fiato.', de: 'Tempo und Kondition.', pt: 'Velocidade e cardio.', ja: 'スピードと持久力。' },
  'scn.entrainement_choix.r1': {
    fr: 'Plus vif et endurant, tu débordes tes vis-à-vis.',
    en: 'Sharper and fitter, you get outside your opposite number.',
    es: 'Más vivo y resistente, desbordas a tus rivales directos.',
    it: 'Più brillante e resistente, superi i diretti avversari.',
    de: 'Spritziger und ausdauernder überläufst du deine Gegenspieler.',
    pt: 'Mais vivo e resistente, ultrapassas os adversários diretos.',
    ja: '鋭さと粘りが増し、マークマンを外せるようになった。',
  },
  'scn.entrainement_choix.c2': { fr: 'Technique et jeu au pied.', en: 'Skills and kicking.', es: 'Técnica y juego al pie.', it: 'Tecnica e gioco al piede.', de: 'Technik und Kickspiel.', pt: 'Técnica e jogo ao pé.', ja: '技術とキック。' },
  'scn.entrainement_choix.r2': {
    fr: 'Ton pied et ta lecture du jeu montent d’un cran.',
    en: 'Your boot and your reading of the game go up a level.',
    es: 'Tu pie y tu lectura del juego suben un escalón.',
    it: 'Il tuo piede e la lettura del gioco salgono di livello.',
    de: 'Dein Fuß und deine Spielübersicht steigen eine Stufe.',
    pt: 'O teu pé e a tua leitura de jogo sobem um patamar.',
    ja: 'キックと状況判断がひとつ上のレベルに。',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SITUATIONS DE VIE
  // ═══════════════════════════════════════════════════════════════════════════
  // Elles vivent dans leur propre fichier — 30 situations, c'est déjà plus long
  // que tout ce qui précède. Fusionnées ici, donc invisibles pour les appelants :
  // `t('sit.bizutage.titre')` marche sans rien savoir de tout ça.
  //
  // ⚠️ `TEXTES_MOMENTS` a disparu avec `data/moments.ts` : les « moments
  // décisifs » posaient un choix de 80ᵉ minute APRÈS le coup de sifflet final
  // (retour de jeu : « supprime les scénarios de matchs, le match est déjà
  // passé »). Le match se joue dans le moteur 2D, et nulle part ailleurs.
  ...TEXTES_SITUATIONS,
  ...TEXTES_SITUATIONS_ETENDUES,
};
