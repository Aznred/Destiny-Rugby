import type { Langue } from '../lib/i18n.js';

export type IdPoolCommentaire =
  | 'essai' | 'precision' | 'transformation' | 'transformationRatee'
  | 'penaliteBut' | 'penaliteRatee' | 'drop' | 'penalite' | 'motif'
  | 'plaquage' | 'franchissement' | 'grattage' | 'enAvant' | 'passeAvant'
  | 'degagement' | 'occupation' | 'chandelle' | 'cinquanteVingtDeux'
  | 'cinquanteVingtDeuxRate' | 'rasant' | 'transversale'
  | 'toucheGagnee' | 'touchePerdue' | 'meleeGagnee' | 'meleeDominee'
  | 'maul' | 'maulEssai' | 'carton' | 'remplacement'
  | 'pickAndGo' | 'percussion' | 'ecartement'
  | 'chambrage';

export type CleCommentaireDirect =
  | 'coupEnvoiMatch' | 'sirenePremiere' | 'sireneFinale' | 'coupEnvoiJoueur'
  | 'renvoi22Joueur' | 'toucheASuivre' | 'toucheDirecte' | 'ballonEnBut'
  | 'ballonAerien' | 'pousseTouche' | 'cassePlaquage' | 'offload'
  | 'cartonRouge' | 'penaltouche' | 'penaliteRapide' | 'tenuEnBut'
  | 'dropRate' | 'miTempsScore' | 'coupSiffletFinal' | 'deuxiemeMiTemps'
  | 'essaiTransformeFin' | 'essaiFin' | 'penaliteFin' | 'consigne'
  | 'changementDePlan'
  // ── Le joueur aux commandes (moteur/controle.ts) ─────────────────────────
  | 'actionSprint' | 'crochetReussi' | 'crochetRate' | 'raffutReussi'
  | 'appelBallon' | 'plaquageLance' | 'plaquageRateJoueur' | 'grattagePlonge'
  // ── Provocations et bagarres (moteur/bagarre.ts) ─────────────────────────
  // ── Les duels de la carte de décision (moteur/moteur.ts) ─────────────────
  // ⚠️ CE SONT DES REPLIS, PAS LE RÉCIT. `resoudreChoix` affiche d'abord la
  // phrase que le moteur a VRAIMENT écrite sur le joueur ; ces clés ne servent
  // que quand il n'a rien dit — un appel dans le vide, une passe propre qui ne
  // méritait pas de commentaire. Sans elles, l'écran resterait muet sur des
  // issues pourtant réelles.
  | 'choixArme' | 'choixTropTard' | 'duelContactKo' | 'duelGrattageKo'
  | 'duelPasseOk' | 'duelPasseKo' | 'duelPiedContre' | 'duelAppelKo'
  // ── Les gestes de poste (50/22, chandelle, chenille, percussion, offload)
  | 'duel5022Rate' | 'duelChenilleOk' | 'duelChenilleKo'
  | 'duelPercussionOk' | 'duelOffloadKo'
  // Les gestes qui mènent à la ligne : percée, chip, plongeon, interception,
  // contre-poussée — et l'échappée qu'ils ouvrent.
  | 'echappee' | 'duelPerceeKo' | 'duelChipOk' | 'duelChipKo' | 'duelPlongeonKo'
  | 'duelInterceptionOk' | 'duelInterceptionKo'
  | 'duelContreRuckOk' | 'duelContreRuckKo'
  | 'provocation' | 'provocationIgnoree' | 'bagarreDebut' | 'bagarreGenerale'
  | 'bagarreSeparee' | 'bagarreRecul' | 'coupPorte' | 'arbitreVideo';

type Pools = Record<IdPoolCommentaire, string[]>;
type Directs = Record<CleCommentaireDirect, string>;

// Le français reste dans moteur/commentaire.ts. Ces pools remplacent les
// formulations françaises avant interpolation des noms, clubs et distances.
export const POOLS_COMMENTAIRES: Record<Exclude<Langue, 'fr'>, Pools> = {
  en: {
    essai: ['TRY! {nom} grounds the ball {precision}!'],
    precision: ['in the corner', 'under the posts', 'after breaking two tackles'],
    transformation: ['Conversion by {nom}, straight through.'],
    transformationRatee: ['{nom} misses the conversion.'],
    penaliteBut: ['Penalty by {nom}, three more points from {distance} metres.'],
    penaliteRatee: ['{nom} misses the penalty from {distance} metres.'],
    drop: ['DROP GOAL BY {nom}! Three points.'],
    penalite: ['Penalty to {club} : {motif}.'],
    motif: ['offside', 'high tackle', 'not releasing', 'tackler not rolling away', 'side entry at the ruck', 'scrum infringement', 'obstruction', 'punch', 'mass brawl', 'foul play', 'punch spotted on the footage'],
    plaquage: ['Big tackle by {nom} on {cible}!'],
    franchissement: ['{nom} breaks the defensive line!'],
    grattage: ['Turnover by {nom}! Ball won on the ground.'],
    enAvant: ['Knock-on by {nom}, scrum to {club}.'],
    passeAvant: ['Forward pass by {nom}, scrum to {club}.'],
    degagement: ['{nom} clears to touch and gains fifty metres.'],
    occupation: ['{nom} kicks for territory.'],
    chandelle: ['High ball from {nom}, the chase is on!'],
    cinquanteVingtDeux: ['50:22 by {nom}! Their lineout!'],
    cinquanteVingtDeuxRate: ['{nom} attempts the 50:22 but misses it.'],
    rasant: ['Grubber kick from {nom} behind the defence!'],
    transversale: ['Cross-field kick from {nom} towards the wing!'],
    toucheGagnee: ['Clean lineout ball for {club}, taken by {nom}.'],
    touchePerdue: ['Lineout lost! {club} win the ball.'],
    meleeGagnee: ['Solid scrum from {club}, clean ball.'],
    meleeDominee: ['Dominant scrum! {club} go forward and win the penalty.'],
    maul: ['Driving maul from {club}, moving forward!'],
    maulEssai: ['TRY from the driving maul! {nom} grounds it.'],
    carton: ['YELLOW CARD for {nom} : {motif}. {club} down to fourteen for ten minutes.'],
    remplacement: ['{entrant} replaces {sortant} for {club}.'],
    pickAndGo: ['Pick and go by {nom}, another metre gained.'],
    percussion: ['{nom} carries hard through the middle.'],
    ecartement: ['The ball goes wide… {nom} receives it!'],
    chambrage: ['Still standing, are you?', 'We’re waiting.', 'Is that it?', 'Stay with us, it’s a long one.', 'Have a look at the scoreboard.', 'Planning on running today?', 'Another hour of this.', 'Easy now, grandad.', 'Are you done?', 'Back to the changing room.'],
  },
  es: {
    essai: ['¡ENSAYO! ¡{nom} posa el balón {precision}!'],
    precision: ['en la esquina', 'bajo palos', 'tras romper dos placajes'],
    transformation: ['Transformación de {nom}, entre palos.'],
    transformationRatee: ['{nom} falla la transformación.'],
    penaliteBut: ['Golpe de castigo de {nom}: tres puntos desde {distance} metros.'],
    penaliteRatee: ['{nom} falla el golpe desde {distance} metros.'],
    drop: ['¡DROP DE {nom}! Tres puntos.'],
    penalite: ['Golpe de castigo para {club}: {motif}.'],
    motif: ['fuera de juego', 'placaje alto', 'balón retenido en el suelo', 'el placador no se aparta', 'entrada lateral al ruck', 'falta técnica en melé', 'obstrucción', 'puñetazo', 'tangana general', 'juego sucio', 'puñetazo detectado en las imágenes'],
    plaquage: ['¡Gran placaje de {nom} sobre {cible}!'],
    franchissement: ['¡{nom} rompe la línea defensiva!'],
    grattage: ['¡Recuperación de {nom}! Balón ganado en el suelo.'],
    enAvant: ['Avant de {nom}, melé para {club}.'],
    passeAvant: ['Pase adelantado de {nom}, melé para {club}.'],
    degagement: ['{nom} despeja a touche y gana cincuenta metros.'],
    occupation: ['{nom} juega al pie para ocupar campo.'],
    chandelle: ['¡Patada alta de {nom}, comienza la persecución!'],
    cinquanteVingtDeux: ['¡50:22 de {nom}! Touche para su equipo.'],
    cinquanteVingtDeuxRate: ['{nom} intenta el 50:22, pero no lo encuentra.'],
    rasant: ['¡Patada rasa de {nom} a la espalda de la defensa!'],
    transversale: ['¡Patada cruzada de {nom} hacia el ala!'],
    toucheGagnee: ['Touche limpia para {club}, recibe {nom}.'],
    touchePerdue: ['¡Touche perdida! {club} recupera el balón.'],
    meleeGagnee: ['Melé sólida de {club}, balón limpio.'],
    meleeDominee: ['¡Melé dominante! {club} avanza y obtiene el golpe.'],
    maul: ['Maul de {club}, ¡avanza!'],
    maulEssai: ['¡ENSAYO de maul! {nom} posa el balón.'],
    carton: ['AMARILLA para {nom}: {motif}. {club} jugará con catorce diez minutos.'],
    remplacement: ['{entrant} sustituye a {sortant} en {club}.'],
    pickAndGo: ['Pick and go de {nom}, gana otro metro.'],
    percussion: ['{nom} carga con fuerza por el centro.'],
    ecartement: ['El balón llega al exterior… ¡recibe {nom}!'],
    chambrage: ['¿Todavía en pie?', 'Te estamos esperando.', '¿Eso es todo?', 'Aguanta, queda mucho.', 'Mira el marcador.', '¿Piensas correr hoy?', 'Una hora más así.', 'Tranquilo, abuelo.', '¿Has terminado?', 'Vuelve al vestuario.'],
  },
  it: {
    essai: ['META! {nom} schiaccia {precision}!'],
    precision: ['all’angolo', 'sotto i pali', 'dopo aver rotto due placcaggi'],
    transformation: ['Trasformazione di {nom}, tra i pali.'],
    transformationRatee: ['{nom} sbaglia la trasformazione.'],
    penaliteBut: ['Calcio di punizione di {nom}: tre punti da {distance} metri.'],
    penaliteRatee: ['{nom} sbaglia il calcio da {distance} metri.'],
    drop: ['DROP DI {nom}! Tre punti.'],
    penalite: ['Punizione per {club}: {motif}.'],
    motif: ['fuorigioco', 'placcaggio alto', 'pallone trattenuto a terra', 'placcatore che non si sposta', 'ingresso laterale nel ruck', 'fallo tecnico in mischia', 'ostruzione', 'pugno', 'rissa generale', 'gioco scorretto', 'pugno individuato dalle immagini'],
    plaquage: ['Gran placcaggio di {nom} su {cible}!'],
    franchissement: ['{nom} rompe la linea difensiva!'],
    grattage: ['Pallone recuperato da {nom} a terra!'],
    enAvant: ['In avanti di {nom}, mischia per {club}.'],
    passeAvant: ['Passaggio in avanti di {nom}, mischia per {club}.'],
    degagement: ['{nom} libera in touche e guadagna cinquanta metri.'],
    occupation: ['{nom} calcia per guadagnare territorio.'],
    chandelle: ['Campanile di {nom}: parte la caccia!'],
    cinquanteVingtDeux: ['50:22 di {nom}! Rimessa per la sua squadra.'],
    cinquanteVingtDeuxRate: ['{nom} tenta il 50:22 ma non lo trova.'],
    rasant: ['Calcio rasoterra di {nom} dietro la difesa!'],
    transversale: ['Calcio incrociato di {nom} verso l’ala!'],
    toucheGagnee: ['Rimessa pulita per {club}, presa da {nom}.'],
    touchePerdue: ['Rimessa persa! {club} recupera il pallone.'],
    meleeGagnee: ['Mischia solida di {club}, pallone pulito.'],
    meleeDominee: ['Mischia dominante! {club} avanza e ottiene la punizione.'],
    maul: ['Maul di {club}, avanza!'],
    maulEssai: ['META da maul! {nom} schiaccia.'],
    carton: ['GIALLO per {nom}: {motif}. {club} in quattordici per dieci minuti.'],
    remplacement: ['{entrant} sostituisce {sortant} per {club}.'],
    pickAndGo: ['Pick and go di {nom}, un altro metro.'],
    percussion: ['{nom} carica con forza al centro.'],
    ecartement: ['Il pallone va al largo… lo riceve {nom}!'],
    chambrage: ['Stai ancora in piedi?', 'Ti stiamo aspettando.', 'Tutto qui?', 'Resta con noi, è lunga.', 'Guarda il tabellone.', 'Hai intenzione di correre oggi?', 'Un’altra ora così.', 'Piano, nonno.', 'Hai finito?', 'Torna negli spogliatoi.'],
  },
  de: {
    essai: ['VERSUCH! {nom} legt den Ball {precision} ab!'],
    precision: ['in der Ecke', 'unter den Stangen', 'nach zwei gebrochenen Tackles'],
    transformation: ['Erhöhung durch {nom}, sicher verwandelt.'],
    transformationRatee: ['{nom} verfehlt die Erhöhung.'],
    penaliteBut: ['Straftritt von {nom}: drei Punkte aus {distance} Metern.'],
    penaliteRatee: ['{nom} verfehlt den Straftritt aus {distance} Metern.'],
    drop: ['DROP GOAL VON {nom}! Drei Punkte.'],
    penalite: ['Straftritt für {club}: {motif}.'],
    motif: ['Abseits', 'hohes Tackle', 'Ball am Boden nicht freigegeben', 'Tackler rollt nicht weg', 'seitlicher Eintritt ins Ruck', 'technischer Fehler im Gedränge', 'Behinderung', 'Faustschlag', 'Massenschlägerei', 'unfaires Spiel', 'auf dem Video entdeckter Faustschlag'],
    plaquage: ['Hartes Tackle von {nom} gegen {cible}!'],
    franchissement: ['{nom} durchbricht die Verteidigungslinie!'],
    grattage: ['Turnover durch {nom}! Ball am Boden gewonnen.'],
    enAvant: ['Vorwurf von {nom}, Gedränge für {club}.'],
    passeAvant: ['Vorwärtspass von {nom}, Gedränge für {club}.'],
    degagement: ['{nom} klärt ins Aus und gewinnt fünfzig Meter.'],
    occupation: ['{nom} kickt auf Raumgewinn.'],
    chandelle: ['Hoher Ball von {nom}, die Jagd beginnt!'],
    cinquanteVingtDeux: ['50:22 von {nom}! Eigene Gasse.'],
    cinquanteVingtDeuxRate: ['{nom} versucht den 50:22, verfehlt ihn aber.'],
    rasant: ['Flacher Kick von {nom} hinter die Abwehr!'],
    transversale: ['Crosskick von {nom} zum Flügel!'],
    toucheGagnee: ['Sauberer Gassenball für {club}, gefangen von {nom}.'],
    touchePerdue: ['Gasse verloren! {club} gewinnt den Ball.'],
    meleeGagnee: ['Stabiles Gedränge von {club}, sauberer Ball.'],
    meleeDominee: ['Dominantes Gedränge! {club} geht vorwärts und erhält den Straftritt.'],
    maul: ['Maul von {club}, es geht voran!'],
    maulEssai: ['VERSUCH aus dem Maul! {nom} legt ab.'],
    carton: ['GELBE KARTE für {nom}: {motif}. {club} zehn Minuten zu vierzehnt.'],
    remplacement: ['{entrant} ersetzt {sortant} bei {club}.'],
    pickAndGo: ['Pick and Go von {nom}, noch ein Meter.'],
    percussion: ['{nom} trägt hart durch die Mitte.'],
    ecartement: ['Der Ball geht nach außen… {nom} bekommt ihn!'],
    chambrage: ['Stehst du noch?', 'Wir warten.', 'Das war’s?', 'Bleib dran, es dauert.', 'Schau auf die Anzeigetafel.', 'Willst du heute noch laufen?', 'Noch eine Stunde davon.', 'Ruhig, Opa.', 'Bist du fertig?', 'Ab in die Kabine.'],
  },
  pt: {
    essai: ['ENSAIO! {nom} apoia a bola {precision}!'],
    precision: ['no canto', 'debaixo dos postes', 'depois de quebrar duas placagens'],
    transformation: ['Transformação de {nom}, entre os postes.'],
    transformationRatee: ['{nom} falha a transformação.'],
    penaliteBut: ['Penalidade de {nom}: três pontos de {distance} metros.'],
    penaliteRatee: ['{nom} falha a penalidade de {distance} metros.'],
    drop: ['DROP DE {nom}! Três pontos.'],
    penalite: ['Penalidade para {club}: {motif}.'],
    motif: ['fora de jogo', 'placagem alta', 'bola retida no chão', 'placador não se afasta', 'entrada lateral no ruck', 'falta técnica na formação ordenada', 'obstrução', 'murro', 'rixa geral', 'jogo desleal', 'murro detetado nas imagens'],
    plaquage: ['Grande placagem de {nom} sobre {cible}!'],
    franchissement: ['{nom} quebra a linha defensiva!'],
    grattage: ['Recuperação de {nom}! Bola ganha no chão.'],
    enAvant: ['Avanço de {nom}, formação ordenada para {club}.'],
    passeAvant: ['Passe para a frente de {nom}, formação ordenada para {club}.'],
    degagement: ['{nom} alivia para fora e ganha cinquenta metros.'],
    occupation: ['{nom} chuta para ganhar território.'],
    chandelle: ['Bola alta de {nom}, começa a perseguição!'],
    cinquanteVingtDeux: ['50:22 de {nom}! Lançamento para a sua equipa.'],
    cinquanteVingtDeuxRate: ['{nom} tenta o 50:22, mas falha.'],
    rasant: ['Pontapé rasteiro de {nom} atrás da defesa!'],
    transversale: ['Pontapé cruzado de {nom} para a ponta!'],
    toucheGagnee: ['Lançamento limpo para {club}, recebido por {nom}.'],
    touchePerdue: ['Lançamento perdido! {club} recupera a bola.'],
    meleeGagnee: ['Formação ordenada sólida de {club}, bola limpa.'],
    meleeDominee: ['Formação dominante! {club} avança e ganha a penalidade.'],
    maul: ['Maul de {club}, está a avançar!'],
    maulEssai: ['ENSAIO de maul! {nom} apoia a bola.'],
    carton: ['AMARELO para {nom}: {motif}. {club} com catorze durante dez minutos.'],
    remplacement: ['{entrant} substitui {sortant} em {club}.'],
    pickAndGo: ['Pick and go de {nom}, mais um metro.'],
    percussion: ['{nom} carrega com força pelo centro.'],
    ecartement: ['A bola vai para fora… {nom} recebe!'],
    chambrage: ['Ainda de pé?', 'Estamos à tua espera.', 'É só isso?', 'Aguenta, ainda é longo.', 'Olha para o marcador.', 'Pensas correr hoje?', 'Mais uma hora assim.', 'Calma, avô.', 'Já acabaste?', 'Volta ao balneário.'],
  },
  ja: {
    essai: ['トライ！{nom}が{precision}グラウンディング！'],
    precision: ['コーナーで', 'ポスト下で', '2つのタックルを破って'],
    transformation: ['{nom}のコンバージョン成功。'],
    transformationRatee: ['{nom}のコンバージョンは失敗。'],
    penaliteBut: ['{nom}が{distance}メートルからペナルティゴール成功。3点。'],
    penaliteRatee: ['{nom}が{distance}メートルからのペナルティを外す。'],
    drop: ['{nom}のドロップゴール！3点。'],
    penalite: ['{club}にペナルティ。理由：{motif}。'],
    motif: ['オフサイド', 'ハイタックル', 'ノットリリース', 'タックラーが退かない', 'ラックへの横入り', 'スクラムでの反則', 'オブストラクション', 'パンチ', '乱闘', 'ラフプレー', '映像で確認されたパンチ'],
    plaquage: ['{nom}が{cible}へ強烈なタックル！'],
    franchissement: ['{nom}がディフェンスラインを突破！'],
    grattage: ['{nom}がジャッカル成功！ボールを奪う。'],
    enAvant: ['{nom}がノックオン。{club}のスクラム。'],
    passeAvant: ['{nom}のパスが前に。{club}のスクラム。'],
    degagement: ['{nom}がタッチへ蹴り出し、50メートル前進。'],
    occupation: ['{nom}がエリアを取るキック。'],
    chandelle: ['{nom}のハイパント。チェイスが始まる！'],
    cinquanteVingtDeux: ['{nom}の50:22！自チームボールのラインアウト。'],
    cinquanteVingtDeuxRate: ['{nom}が50:22を狙うが失敗。'],
    rasant: ['{nom}が守備の裏へグラバーキック！'],
    transversale: ['{nom}がウイングへクロスキック！'],
    toucheGagnee: ['{club}がラインアウトを確保。{nom}がキャッチ。'],
    touchePerdue: ['ラインアウトを失う！{club}がボールを獲得。'],
    meleeGagnee: ['{club}の安定したスクラム。クリーンボール。'],
    meleeDominee: ['スクラムを圧倒！{club}が前進してペナルティ獲得。'],
    maul: ['{club}のモールが前進！'],
    maulEssai: ['モールからトライ！{nom}がグラウンディング。'],
    carton: ['{nom}にイエローカード：{motif}。{club}は10分間14人。'],
    remplacement: ['{club}、{sortant}に代わって{entrant}。'],
    pickAndGo: ['{nom}のピック・アンド・ゴー。さらに1メートル。'],
    percussion: ['{nom}が中央を力強くキャリー。'],
    ecartement: ['ボールが外へ…{nom}が受ける！'],
    chambrage: ['まだ立ってるのか？', '待ってるぞ。', 'それだけか？', '長いぞ、ついてこい。', 'スコアボードを見ろ。', '今日は走る気あるのか？', 'あと一時間これが続く。', '落ち着けよ、じいさん。', '終わったか？', 'ロッカーに戻れ。'],
  },
};

export const COMMENTAIRES_DIRECTS: Record<Langue, Directs> = {
  fr: {
    coupEnvoiMatch: 'Coup d’envoi ! {clubA} reçoit {clubB}.', sirenePremiere: '🔔 La sirène retentit. On joue jusqu’à la sortie du ballon.', sireneFinale: '🔔 Sirène ! Le temps est écoulé : ballon mort et c’est terminé.', coupEnvoiJoueur: '{nom} donne le coup d’envoi.', renvoi22Joueur: 'Renvoi aux 22 de {nom}.', toucheASuivre: 'Touche à suivre pour {club}.', toucheDirecte: '{nom} trouve la touche directement : pas de gain de terrain.', ballonEnBut: 'Ballon dans l’en-but, renvoi aux 22.', ballonAerien: '{nom} récupère le ballon dans les airs !', pousseTouche: '{nom} est poussé en touche.', cassePlaquage: '{porteur} se dégage du plaquage de {defenseur} !', offload: 'Offload de {porteur} pour {receveur} !', cartonRouge: '🟥 CARTON ROUGE pour {nom} ({motif}) : {club} finit à quatorze.', penaltouche: '{nom} trouve la touche à {distance} mètres de la ligne.', penaliteRapide: 'Pénalité jouée vite par {club}.', tenuEnBut: '{nom} est tenu dans l’en-but ! Renvoi aux 22 pour {club}.', dropRate: 'Drop manqué de {nom}.', miTempsScore: 'Mi-temps : {clubA} {scoreA} : {scoreB} {clubB}', coupSiffletFinal: 'Coup de sifflet final : {clubA} {scoreA} : {scoreB} {clubB}.', deuxiemeMiTemps: 'Deuxième mi-temps !', essaiTransformeFin: 'Essai transformé de {nom} dans les arrêts de jeu !', essaiFin: 'Essai de {nom} au bout du temps additionnel !', penaliteFin: 'Pénalité de {nom} à la dernière seconde.', consigne: '📣 Consigne : « {libelle} »', changementDePlan: '📋 {club} change son plan de jeu.',
    actionSprint: '{nom} met un coup d’accélérateur !', crochetReussi: 'Crochet de {nom} ! {cible} plaque dans le vide.', crochetRate: '{nom} tente le crochet, {cible} ne se laisse pas prendre.', raffutReussi: 'Raffut de {nom} ! Il traverse le plaquage.', appelBallon: '{nom} réclame le ballon à la voix.', plaquageLance: '{nom} se lance sur {cible} !', plaquageRateJoueur: '{nom} se manque, {cible} file dans son dos.', grattagePlonge: '{nom} plonge sur le ballon au sol…', provocation: '{nom} chambre {cible}. Le ton monte.', provocationIgnoree: '{cible} ne relève même pas la tête.', bagarreDebut: '💢 Ça dégénère : {nom} et {cible} en viennent aux mains.', bagarreGenerale: 'Les deux packs s’en mêlent, l’arbitre est débordé.', bagarreSeparee: '{nom} sépare tout le monde et fait reculer les siens.', bagarreRecul: '{nom} lève les mains et s’écarte du groupe.', coupPorte: '{nom} envoie un coup de poing à {cible} !', arbitreVideo: 'L’arbitre demande les images. Tout le monde attend.', choixArme: '{nom} joue son geste.', choixTropTard: 'Trop tard, l’action est passée.', duelContactKo: '{cible} stoppe {nom} net.', duelGrattageKo: '{nom} n’arrive pas à s’emparer du ballon.', duelPasseOk: '{nom} donne proprement à {cible}.', duelPasseKo: 'La passe de {nom} part au sol.', duelPiedContre: 'Le coup de pied de {nom} est CONTRÉ par {cible} !', duelAppelKo: '{nom} appelle le ballon, personne ne le voit.', duel5022Rate: 'La touche est ratée : le ballon reste en jeu.', duelChenilleOk: '{nom} protège la sortie derrière son paquet.', duelChenilleKo: 'La chenille de {nom} s’écroule.', duelPercussionOk: '{nom} rentre dedans et avance.', duelOffloadKo: '{nom} force l’offload, le ballon est au sol.', echappee: '{nom} est dans l’espace, plus personne devant !', duelPerceeKo: 'L’intervalle se referme sur {nom}.', duelChipOk: '{nom} pique par-dessus et reprend son coup de pied !', duelChipKo: 'Le coup de pied de {nom} file trop loin, ballon rendu.', duelPlongeonKo: '{nom} plonge, mais il est tenu à un mètre.', duelInterceptionOk: 'Interception de {nom} ! Il part seul !', duelInterceptionKo: '{nom} sort de sa ligne et ne touche rien.', duelContreRuckOk: 'Contre-poussée de {nom}, le ballon change de camp !', duelContreRuckKo: 'La contre-poussée de {nom} ne passe pas.',
  },
  en: {
    coupEnvoiMatch: 'Kick-off! {clubA} host {clubB}.', sirenePremiere: '🔔 The siren sounds. Play continues until the ball is dead.', sireneFinale: '🔔 Final siren! Time is up; the next dead ball ends the match.', coupEnvoiJoueur: '{nom} takes the kick-off.', renvoi22Joueur: '22-metre drop-out by {nom}.', toucheASuivre: 'Lineout to {club}.', toucheDirecte: '{nom} kicks directly into touch: no territorial gain.', ballonEnBut: 'Ball into in-goal, 22-metre drop-out.', ballonAerien: '{nom} wins the ball in the air!', pousseTouche: '{nom} is driven into touch.', cassePlaquage: '{porteur} breaks out of {defenseur}’s tackle!', offload: '{porteur} offloads to {receveur}!', cartonRouge: '🟥 RED CARD for {nom} ({motif}) : {club} finish with fourteen.', penaltouche: '{nom} finds touch {distance} metres from the line.', penaliteRapide: 'Quick tap penalty by {club}.', tenuEnBut: '{nom} is held up! 22-metre drop-out to {club}.', dropRate: '{nom} misses the drop goal.', miTempsScore: 'Half-time: {clubA} {scoreA} : {scoreB} {clubB}', coupSiffletFinal: 'Full-time : {clubA} {scoreA} : {scoreB} {clubB}.', deuxiemeMiTemps: 'Second half!', essaiTransformeFin: 'Converted try by {nom} in added time!', essaiFin: 'Try by {nom} at the end of added time!', penaliteFin: 'Last-second penalty by {nom}.', consigne: '📣 Instruction: “{libelle}”', changementDePlan: '📋 {club} change their game plan.',
    actionSprint: '{nom} kicks on the afterburners!', crochetReussi: 'Sidestep from {nom}! {cible} tackles thin air.', crochetRate: '{nom} goes for the step, {cible} is not fooled.', raffutReussi: 'Hand-off from {nom}! He powers through the tackle.', appelBallon: '{nom} calls loudly for the ball.', plaquageLance: '{nom} launches himself at {cible}!', plaquageRateJoueur: '{nom} misses, {cible} slips through behind him.', grattagePlonge: '{nom} goes over the ball on the ground…', provocation: '{nom} gets in {cible}’s face. The temperature rises.', provocationIgnoree: '{cible} does not even look up.', bagarreDebut: '💢 It boils over: {nom} and {cible} start throwing punches.', bagarreGenerale: 'Both packs pile in, the referee is overwhelmed.', bagarreSeparee: '{nom} pulls everyone apart and drags his team away.', bagarreRecul: '{nom} raises his hands and steps away.', coupPorte: '{nom} throws a punch at {cible}!', arbitreVideo: 'The referee goes to the screen. Everyone waits.', choixArme: '{nom} goes for it.', choixTropTard: 'Too late, the moment is gone.', duelContactKo: '{cible} stops {nom} dead.', duelGrattageKo: '{nom} cannot get his hands on the ball.', duelPasseOk: '{nom} passes cleanly to {cible}.', duelPasseKo: '{nom}’s pass goes to ground.', duelPiedContre: '{nom}’s kick is CHARGED DOWN by {cible}!', duelAppelKo: '{nom} calls for the ball, nobody sees him.', duel5022Rate: 'The kick misses touch: the ball stays in play.', duelChenilleOk: '{nom} shields the ball behind his pack.', duelChenilleKo: '{nom}’s caterpillar collapses.', duelPercussionOk: '{nom} carries hard and makes ground.', duelOffloadKo: '{nom} forces the offload and spills it.', echappee: '{nom} is in the clear, nobody in front!', duelPerceeKo: 'The gap shuts on {nom}.', duelChipOk: '{nom} chips over and regathers his own kick!', duelChipKo: '{nom}’s kick runs away, possession handed back.', duelPlongeonKo: '{nom} dives, but he is held a metre short.', duelInterceptionOk: 'Intercepted by {nom}! He is away!', duelInterceptionKo: '{nom} jumps out of the line and gets nothing.', duelContreRuckOk: 'Counter-ruck from {nom}, the ball turns over!', duelContreRuckKo: '{nom}’s counter-ruck does not get through.',
  },
  es: {
    coupEnvoiMatch: '¡Saque inicial! {clubA} recibe a {clubB}.', sirenePremiere: '🔔 Suena la sirena. Se juega hasta que el balón quede muerto.', sireneFinale: '🔔 ¡Sirena final! El siguiente balón muerto termina el partido.', coupEnvoiJoueur: '{nom} realiza el saque inicial.', renvoi22Joueur: 'Saque de 22 de {nom}.', toucheASuivre: 'Touche para {club}.', toucheDirecte: '{nom} manda el balón directamente a touche: sin ganancia territorial.', ballonEnBut: 'Balón en la zona de marca, saque de 22.', ballonAerien: '¡{nom} gana el balón por alto!', pousseTouche: '{nom} es empujado a touche.', cassePlaquage: '¡{porteur} rompe el placaje de {defenseur}!', offload: '¡Offload de {porteur} para {receveur}!', cartonRouge: '🟥 ROJA para {nom} ({motif}): {club} termina con catorce.', penaltouche: '{nom} encuentra la touche a {distance} metros de la línea.', penaliteRapide: 'Golpe jugado rápido por {club}.', tenuEnBut: '¡{nom} queda retenido en la zona de marca! Saque de 22 para {club}.', dropRate: '{nom} falla el drop.', miTempsScore: 'Descanso: {clubA} {scoreA} : {scoreB} {clubB}', coupSiffletFinal: 'Final : {clubA} {scoreA} : {scoreB} {clubB}.', deuxiemeMiTemps: '¡Segunda parte!', essaiTransformeFin: '¡Ensayo transformado de {nom} en el tiempo añadido!', essaiFin: '¡Ensayo de {nom} al final del tiempo añadido!', penaliteFin: 'Golpe de {nom} en el último segundo.', consigne: '📣 Instrucción: «{libelle}»', changementDePlan: '📋 {club} cambia su plan de juego.',
    actionSprint: '¡{nom} mete un acelerón!', crochetReussi: '¡Quiebro de {nom}! {cible} placa el aire.', crochetRate: '{nom} intenta el quiebro, {cible} no se deja engañar.', raffutReussi: '¡Palanca de {nom}! Atraviesa el placaje.', appelBallon: '{nom} pide el balón a gritos.', plaquageLance: '¡{nom} se lanza sobre {cible}!', plaquageRateJoueur: '{nom} falla y {cible} se escapa por su espalda.', grattagePlonge: '{nom} se lanza sobre el balón en el suelo…', provocation: '{nom} se encara con {cible}. Sube la temperatura.', provocationIgnoree: '{cible} ni siquiera levanta la cabeza.', bagarreDebut: '💢 Se desmadra: {nom} y {cible} llegan a las manos.', bagarreGenerale: 'Los dos paquetes se meten, el árbitro está desbordado.', bagarreSeparee: '{nom} separa a todos y aleja a los suyos.', bagarreRecul: '{nom} levanta las manos y se aparta.', coupPorte: '¡{nom} le suelta un puñetazo a {cible}!', arbitreVideo: 'El árbitro pide las imágenes. Todos esperan.', choixArme: '{nom} se lanza a por ello.', choixTropTard: 'Demasiado tarde, la acción ya pasó.', duelContactKo: '{cible} para a {nom} en seco.', duelGrattageKo: '{nom} no logra hacerse con el balón.', duelPasseOk: '{nom} pasa limpio a {cible}.', duelPasseKo: 'El pase de {nom} se va al suelo.', duelPiedContre: '¡La patada de {nom} es BLOQUEADA por {cible}!', duelAppelKo: '{nom} pide el balón, nadie lo ve.', duel5022Rate: 'Falla el toque: el balón sigue en juego.', duelChenilleOk: '{nom} protege la salida detrás de su paquete.', duelChenilleKo: 'La oruga de {nom} se derrumba.', duelPercussionOk: '{nom} entra fuerte y gana terreno.', duelOffloadKo: '{nom} fuerza el offload y se le cae.', echappee: '¡{nom} está en el espacio, nadie por delante!', duelPerceeKo: 'El hueco se cierra sobre {nom}.', duelChipOk: '¡{nom} pica por encima y recupera su propia patada!', duelChipKo: 'La patada de {nom} se va larga, balón devuelto.', duelPlongeonKo: '{nom} se lanza, pero lo sujetan a un metro.', duelInterceptionOk: '¡Intercepción de {nom}! ¡Se va solo!', duelInterceptionKo: '{nom} sale de su línea y no toca nada.', duelContreRuckOk: '¡Contra-ruck de {nom}, el balón cambia de bando!', duelContreRuckKo: 'El contra-ruck de {nom} no pasa.',
  },
  it: {
    coupEnvoiMatch: 'Calcio d’inizio! {clubA} ospita {clubB}.', sirenePremiere: '🔔 Suona la sirena. Si gioca fino al pallone morto.', sireneFinale: '🔔 Sirena finale! Il prossimo pallone morto chiude la partita.', coupEnvoiJoueur: '{nom} dà il calcio d’inizio.', renvoi22Joueur: 'Rinvio dai 22 di {nom}.', toucheASuivre: 'Rimessa per {club}.', toucheDirecte: '{nom} calcia direttamente in touche: nessun guadagno territoriale.', ballonEnBut: 'Pallone in area di meta, rinvio dai 22.', ballonAerien: '{nom} conquista il pallone in aria!', pousseTouche: '{nom} viene spinto in touche.', cassePlaquage: '{porteur} rompe il placcaggio di {defenseur}!', offload: 'Offload di {porteur} per {receveur}!', cartonRouge: '🟥 ROSSO per {nom} ({motif}): {club} chiude in quattordici.', penaltouche: '{nom} trova la touche a {distance} metri dalla linea.', penaliteRapide: 'Punizione giocata rapidamente da {club}.', tenuEnBut: '{nom} è tenuto alto in meta! Rinvio dai 22 per {club}.', dropRate: '{nom} sbaglia il drop.', miTempsScore: 'Intervallo: {clubA} {scoreA} : {scoreB} {clubB}', coupSiffletFinal: 'Finale : {clubA} {scoreA} : {scoreB} {clubB}.', deuxiemeMiTemps: 'Secondo tempo!', essaiTransformeFin: 'Meta trasformata di {nom} nel recupero!', essaiFin: 'Meta di {nom} alla fine del recupero!', penaliteFin: 'Punizione di {nom} all’ultimo secondo.', consigne: '📣 Indicazione: «{libelle}»', changementDePlan: '📋 {club} cambia il proprio piano di gioco.',
    actionSprint: '{nom} dà un’accelerata!', crochetReussi: 'Finta di {nom}! {cible} placca il vuoto.', crochetRate: '{nom} prova la finta, {cible} non ci casca.', raffutReussi: 'Puntello di {nom}! Attraversa il placcaggio.', appelBallon: '{nom} chiama il pallone a gran voce.', plaquageLance: '{nom} si lancia su {cible}!', plaquageRateJoueur: '{nom} sbaglia, {cible} scappa alle sue spalle.', grattagePlonge: '{nom} si tuffa sul pallone a terra…', provocation: '{nom} provoca {cible}. La tensione sale.', provocationIgnoree: '{cible} non alza nemmeno la testa.', bagarreDebut: '💢 Degenera: {nom} e {cible} vengono alle mani.', bagarreGenerale: 'I due pacchetti si scontrano, l’arbitro è travolto.', bagarreSeparee: '{nom} divide tutti e allontana i suoi.', bagarreRecul: '{nom} alza le mani e si scosta.', coupPorte: '{nom} tira un pugno a {cible}!', arbitreVideo: 'L’arbitro chiede le immagini. Tutti aspettano.', choixArme: '{nom} tenta la giocata.', choixTropTard: 'Troppo tardi, l’azione è passata.', duelContactKo: '{cible} ferma {nom} di netto.', duelGrattageKo: '{nom} non riesce a impossessarsi del pallone.', duelPasseOk: '{nom} serve pulito {cible}.', duelPasseKo: 'Il passaggio di {nom} finisce a terra.', duelPiedContre: 'Il calcio di {nom} è MURATO da {cible}!', duelAppelKo: '{nom} chiama il pallone, nessuno lo vede.', duel5022Rate: 'Il calcio manca la touche: la palla resta in gioco.', duelChenilleOk: '{nom} protegge l’uscita dietro il suo pacchetto.', duelChenilleKo: 'Il bruco di {nom} crolla.', duelPercussionOk: '{nom} entra duro e guadagna terreno.', duelOffloadKo: '{nom} forza l’offload e perde la palla.', echappee: '{nom} è nello spazio, non c’è più nessuno!', duelPerceeKo: 'Il varco si chiude su {nom}.', duelChipOk: '{nom} scavalca e riprende il proprio calcio!', duelChipKo: 'Il calcio di {nom} scappa via, palla restituita.', duelPlongeonKo: '{nom} si tuffa, ma è tenuto a un metro.', duelInterceptionOk: 'Intercetto di {nom}! Va via da solo!', duelInterceptionKo: '{nom} esce dalla linea e non tocca nulla.', duelContreRuckOk: 'Contro-ruck di {nom}, la palla cambia squadra!', duelContreRuckKo: 'Il contro-ruck di {nom} non passa.',
  },
  de: {
    coupEnvoiMatch: 'Ankick! {clubA} empfängt {clubB}.', sirenePremiere: '🔔 Die Sirene ertönt. Gespielt wird bis zum nächsten toten Ball.', sireneFinale: '🔔 Schlusssirene! Der nächste tote Ball beendet das Spiel.', coupEnvoiJoueur: '{nom} führt den Ankick aus.', renvoi22Joueur: '22-Meter-Abkick von {nom}.', toucheASuivre: 'Gasse für {club}.', toucheDirecte: '{nom} kickt direkt ins Aus: kein Raumgewinn.', ballonEnBut: 'Ball im Malfeld, 22-Meter-Abkick.', ballonAerien: '{nom} gewinnt den Ball in der Luft!', pousseTouche: '{nom} wird ins Aus gedrängt.', cassePlaquage: '{porteur} löst sich aus dem Tackle von {defenseur}!', offload: 'Offload von {porteur} zu {receveur}!', cartonRouge: '🟥 ROTE KARTE für {nom} ({motif}) : {club} beendet das Spiel zu vierzehnt.', penaltouche: '{nom} findet das Aus {distance} Meter vor der Linie.', penaliteRapide: 'Schneller Straftritt von {club}.', tenuEnBut: '{nom} wird im Malfeld hochgehalten! 22-Meter-Abkick für {club}.', dropRate: '{nom} verfehlt das Dropgoal.', miTempsScore: 'Halbzeit: {clubA} {scoreA} : {scoreB} {clubB}', coupSiffletFinal: 'Schlusspfiff : {clubA} {scoreA} : {scoreB} {clubB}.', deuxiemeMiTemps: 'Zweite Halbzeit!', essaiTransformeFin: 'Erhöhter Versuch von {nom} in der Nachspielzeit!', essaiFin: 'Versuch von {nom} am Ende der Nachspielzeit!', penaliteFin: 'Straftritt von {nom} in letzter Sekunde.', consigne: '📣 Anweisung: „{libelle}“', changementDePlan: '📋 {club} ändert den Spielplan.',
    actionSprint: '{nom} zieht das Tempo an!', crochetReussi: 'Haken von {nom}! {cible} tackelt ins Leere.', crochetRate: '{nom} versucht den Haken, {cible} fällt nicht darauf herein.', raffutReussi: 'Abwehrstoß von {nom}! Er bricht durch das Tackling.', appelBallon: '{nom} fordert den Ball lautstark.', plaquageLance: '{nom} wirft sich auf {cible}!', plaquageRateJoueur: '{nom} verfehlt ihn, {cible} entwischt in seinem Rücken.', grattagePlonge: '{nom} greift den Ball am Boden an …', provocation: '{nom} stichelt gegen {cible}. Die Stimmung kippt.', provocationIgnoree: '{cible} schaut nicht einmal auf.', bagarreDebut: '💢 Es eskaliert: {nom} und {cible} gehen aufeinander los.', bagarreGenerale: 'Beide Packs mischen mit, der Schiedsrichter ist überfordert.', bagarreSeparee: '{nom} trennt alle und zieht seine Leute zurück.', bagarreRecul: '{nom} hebt die Hände und geht weg.', coupPorte: '{nom} schlägt {cible} mit der Faust!', arbitreVideo: 'Der Schiedsrichter geht an den Bildschirm. Alle warten.', choixArme: '{nom} zieht es durch.', choixTropTard: 'Zu spät, die Aktion ist vorbei.', duelContactKo: '{cible} stoppt {nom} eiskalt.', duelGrattageKo: '{nom} bekommt den Ball nicht zu fassen.', duelPasseOk: '{nom} spielt sauber zu {cible}.', duelPasseKo: 'Der Pass von {nom} landet am Boden.', duelPiedContre: 'Der Kick von {nom} wird von {cible} GEBLOCKT!', duelAppelKo: '{nom} fordert den Ball, niemand sieht ihn.', duel5022Rate: 'Der Kick verfehlt die Seitenlinie: der Ball bleibt im Spiel.', duelChenilleOk: '{nom} schirmt den Ball hinter seinem Pack ab.', duelChenilleKo: 'Die Raupe von {nom} bricht zusammen.', duelPercussionOk: '{nom} geht hart rein und gewinnt Meter.', duelOffloadKo: '{nom} erzwingt den Offload und verliert ihn.', echappee: '{nom} ist durch, niemand mehr davor!', duelPerceeKo: 'Die Lücke schließt sich um {nom}.', duelChipOk: '{nom} hebt ihn drüber und nimmt seinen eigenen Kick auf!', duelChipKo: 'Der Kick von {nom} läuft zu weit, Ball zurückgegeben.', duelPlongeonKo: '{nom} hechtet, wird aber einen Meter davor gehalten.', duelInterceptionOk: 'Abgefangen von {nom}! Er ist durch!', duelInterceptionKo: '{nom} bricht aus der Kette und trifft nichts.', duelContreRuckOk: 'Konter-Ruck von {nom}, der Ball wechselt die Seite!', duelContreRuckKo: 'Der Konter-Ruck von {nom} kommt nicht durch.',
  },
  pt: {
    coupEnvoiMatch: 'Pontapé de saída! {clubA} recebe {clubB}.', sirenePremiere: '🔔 Soa a sirene. Joga-se até a bola ficar morta.', sireneFinale: '🔔 Sirene final! A próxima bola morta termina o jogo.', coupEnvoiJoueur: '{nom} dá o pontapé de saída.', renvoi22Joueur: 'Pontapé de 22 de {nom}.', toucheASuivre: 'Lançamento para {club}.', toucheDirecte: '{nom} chuta diretamente para fora: sem ganho territorial.', ballonEnBut: 'Bola na área de ensaio, pontapé de 22.', ballonAerien: '{nom} conquista a bola no ar!', pousseTouche: '{nom} é empurrado para fora.', cassePlaquage: '{porteur} liberta-se da placagem de {defenseur}!', offload: 'Offload de {porteur} para {receveur}!', cartonRouge: '🟥 VERMELHO para {nom} ({motif}) : {club} termina com catorze.', penaltouche: '{nom} encontra a linha lateral a {distance} metros da linha.', penaliteRapide: 'Penalidade jogada rapidamente por {club}.', tenuEnBut: '{nom} é travado na área de ensaio! Pontapé de 22 para {club}.', dropRate: '{nom} falha o drop.', miTempsScore: 'Intervalo: {clubA} {scoreA} : {scoreB} {clubB}', coupSiffletFinal: 'Final : {clubA} {scoreA} : {scoreB} {clubB}.', deuxiemeMiTemps: 'Segunda parte!', essaiTransformeFin: 'Ensaio transformado de {nom} nos descontos!', essaiFin: 'Ensaio de {nom} no fim dos descontos!', penaliteFin: 'Penalidade de {nom} no último segundo.', consigne: '📣 Instrução: «{libelle}»', changementDePlan: '📋 {club} muda o seu plano de jogo.',
    actionSprint: '{nom} dá uma acelerada!', crochetReussi: 'Finta de {nom}! {cible} placa o vazio.', crochetRate: '{nom} tenta a finta, {cible} não se deixa enganar.', raffutReussi: 'Afastamento de {nom}! Atravessa a placagem.', appelBallon: '{nom} pede a bola em voz alta.', plaquageLance: '{nom} atira-se a {cible}!', plaquageRateJoueur: '{nom} falha e {cible} escapa-se pelas costas.', grattagePlonge: '{nom} mergulha sobre a bola no chão…', provocation: '{nom} provoca {cible}. O ambiente aquece.', provocationIgnoree: '{cible} nem levanta a cabeça.', bagarreDebut: '💢 Descamba: {nom} e {cible} vão às mãos.', bagarreGenerale: 'Os dois packs entram na confusão, o árbitro está ultrapassado.', bagarreSeparee: '{nom} separa toda a gente e afasta os seus.', bagarreRecul: '{nom} levanta as mãos e afasta-se.', coupPorte: '{nom} dá um murro em {cible}!', arbitreVideo: 'O árbitro pede as imagens. Todos esperam.', choixArme: '{nom} vai mesmo em frente.', choixTropTard: 'Tarde demais, a jogada já passou.', duelContactKo: '{cible} pára {nom} a seco.', duelGrattageKo: '{nom} não consegue agarrar a bola.', duelPasseOk: '{nom} passa limpo para {cible}.', duelPasseKo: 'O passe de {nom} vai ao chão.', duelPiedContre: 'O pontapé de {nom} é TAPADO por {cible}!', duelAppelKo: '{nom} pede a bola, ninguém o vê.', duel5022Rate: 'O pontapé falha a linha lateral: a bola continua em jogo.', duelChenilleOk: '{nom} protege a saída atrás do seu pack.', duelChenilleKo: 'A lagarta de {nom} desmorona.', duelPercussionOk: '{nom} entra forte e ganha terreno.', duelOffloadKo: '{nom} força o offload e perde a bola.', echappee: '{nom} está no espaço, ninguém à frente!', duelPerceeKo: 'O intervalo fecha-se sobre {nom}.', duelChipOk: '{nom} pica por cima e recupera o seu próprio pontapé!', duelChipKo: 'O pontapé de {nom} vai longo demais, bola devolvida.', duelPlongeonKo: '{nom} mergulha, mas é suspenso a um metro.', duelInterceptionOk: 'Interceção de {nom}! Vai sozinho!', duelInterceptionKo: '{nom} sai da linha e não toca em nada.', duelContreRuckOk: 'Contra-ruck de {nom}, a bola muda de lado!', duelContreRuckKo: 'O contra-ruck de {nom} não passa.',
  },
  ja: {
    coupEnvoiMatch: 'キックオフ！{clubA}対{clubB}。', sirenePremiere: '🔔 ホーンが鳴る。ボールデッドまでプレー続行。', sireneFinale: '🔔 最終ホーン！次のボールデッドで試合終了。', coupEnvoiJoueur: '{nom}がキックオフ。', renvoi22Joueur: '{nom}の22メートルドロップアウト。', toucheASuivre: '{club}のラインアウト。', toucheDirecte: '{nom}がダイレクトタッチ。地域獲得なし。', ballonEnBut: 'ボールがインゴールへ。22メートルドロップアウト。', ballonAerien: '{nom}が空中戦を制する！', pousseTouche: '{nom}がタッチへ押し出される。', cassePlaquage: '{porteur}が{defenseur}のタックルを外す！', offload: '{porteur}から{receveur}へオフロード！', cartonRouge: '🟥 {nom}にレッドカード（{motif}）。{club}は14人で終了。', penaltouche: '{nom}がゴールライン手前{distance}メートルへタッチキック。', penaliteRapide: '{club}がクイックタップ。', tenuEnBut: '{nom}がインゴールで保持される！{club}の22メートルドロップアウト。', dropRate: '{nom}のドロップゴールは失敗。', miTempsScore: 'ハーフタイム：{clubA} {scoreA} : {scoreB} {clubB}', coupSiffletFinal: '試合終了、{clubA} {scoreA} : {scoreB} {clubB}。', deuxiemeMiTemps: '後半開始！', essaiTransformeFin: '追加時間に{nom}がコンバージョン付きトライ！', essaiFin: '追加時間終了間際に{nom}がトライ！', penaliteFin: '最後の1秒で{nom}がペナルティ成功。', consigne: '📣 指示：「{libelle}」', changementDePlan: '📋 {club}が戦術を変更。',
    actionSprint: '{nom}がギアを上げた！', crochetReussi: '{nom}のステップ！{cible}のタックルは空を切る。', crochetRate: '{nom}がステップを試みるが、{cible}は釣られない。', raffutReussi: '{nom}のハンドオフ！タックルを突き破る。', appelBallon: '{nom}が大声でボールを呼ぶ。', plaquageLance: '{nom}が{cible}へ飛び込む！', plaquageRateJoueur: '{nom}が外し、{cible}が背後を抜けていく。', grattagePlonge: '{nom}が地上のボールに絡みにいく…', provocation: '{nom}が{cible}を挑発。空気が張りつめる。', provocationIgnoree: '{cible}は顔も上げない。', bagarreDebut: '💢 荒れた：{nom}と{cible}が殴り合いに。', bagarreGenerale: '両フォワードが入り乱れ、レフリーは手に負えない。', bagarreSeparee: '{nom}が全員を引き離し、味方を下がらせる。', bagarreRecul: '{nom}は両手を上げてその場を離れる。', coupPorte: '{nom}が{cible}を殴った！', arbitreVideo: 'レフリーが映像を確認。全員が待つ。', choixArme: '{nom}が仕掛ける。', choixTropTard: '遅かった。プレーはもう終わっている。', duelContactKo: '{cible}が{nom}を完全に止めた。', duelGrattageKo: '{nom}はボールを奪い取れない。', duelPasseOk: '{nom}が{cible}へ正確にパス。', duelPasseKo: '{nom}のパスが地面に落ちる。', duelPiedContre: '{nom}のキックが{cible}にチャージされた！', duelAppelKo: '{nom}がボールを呼ぶが、誰も見ていない。', duel5022Rate: 'タッチを外し、ボールはインプレーのまま。', duelChenilleOk: '{nom}がパックの後ろでボールを守る。', duelChenilleKo: '{nom}のキャタピラーが崩れる。', duelPercussionOk: '{nom}が力強く当たって前に出る。', duelOffloadKo: '{nom}がオフロードを無理にねじ込み、こぼす。', echappee: '{nom}がスペースへ、前には誰もいない！', duelPerceeKo: 'ギャップが{nom}の前で閉じる。', duelChipOk: '{nom}がチップキックを自ら再獲得！', duelChipKo: '{nom}のキックが伸びすぎ、ボールを渡してしまう。', duelPlongeonKo: '{nom}が飛び込むが、あと1メートルで止められる。', duelInterceptionOk: '{nom}がインターセプト！独走だ！', duelInterceptionKo: '{nom}がラインを飛び出すも空を切る。', duelContreRuckOk: '{nom}のカウンターラック、ボールが入れ替わる！', duelContreRuckKo: '{nom}のカウンターラックは通らない。',
  },
};
