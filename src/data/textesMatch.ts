import type { Traduction } from '../lib/i18n';

/** Libellés de la feuille et de l'état du moteur de match. */
export const TEXTES_MATCH: Record<string, Traduction> = {
  'ml.vue.general': { fr: 'Général', en: 'Overview', es: 'General', it: 'Generale', de: 'Übersicht', pt: 'Geral', ja: '概要' },
  'ml.vue.attaque': { fr: 'Attaque', en: 'Attack', es: 'Ataque', it: 'Attacco', de: 'Angriff', pt: 'Ataque', ja: '攻撃' },
  'ml.vue.defense': { fr: 'Défense', en: 'Defence', es: 'Defensa', it: 'Difesa', de: 'Verteidigung', pt: 'Defesa', ja: '守備' },
  'ml.vue.conquete': { fr: 'Conquête', en: 'Set piece', es: 'Conquista', it: 'Conquista', de: 'Standards', pt: 'Conquista', ja: 'セットプレー' },
  'ml.vue.pied': { fr: 'Pied', en: 'Kicking', es: 'Patadas', it: 'Calci', de: 'Kickspiel', pt: 'Pontapé', ja: 'キック' },
  'ml.vue.discipline': { fr: 'Discipline', en: 'Discipline', es: 'Disciplina', it: 'Disciplina', de: 'Disziplin', pt: 'Disciplina', ja: '規律' },

  'ml.stat.metres': { fr: 'Mètres gagnés ballon en main', en: 'Metres carried', es: 'Metros ganados con el balón', it: 'Metri guadagnati palla in mano', de: 'Meter mit Ballgewinn', pt: 'Metros ganhos com a bola', ja: 'ボールキャリー獲得メートル' },
  'ml.stat.plaquages': { fr: 'Plaquages réussis', en: 'Tackles made', es: 'Placajes completados', it: 'Placcaggi riusciti', de: 'Erfolgreiche Tacklings', pt: 'Placagens realizadas', ja: '成功タックル' },
  'ml.stat.essais': { fr: 'Essais', en: 'Tries', es: 'Ensayos', it: 'Mete', de: 'Versuche', pt: 'Ensaios', ja: 'トライ' },
  'ml.stat.passes': { fr: 'Passes', en: 'Passes', es: 'Pases', it: 'Passaggi', de: 'Pässe', pt: 'Passes', ja: 'パス' },
  'ml.stat.courses': { fr: 'Ballons portés', en: 'Carries', es: 'Carreras con balón', it: 'Palloni portati', de: 'Ballvorträge', pt: 'Bolas transportadas', ja: 'ボールキャリー' },
  'ml.stat.franchissements': { fr: 'Franchissements / défenseurs battus', en: 'Line breaks / defenders beaten', es: 'Rupturas / defensores superados', it: 'Break / difensori battuti', de: 'Durchbrüche / geschlagene Verteidiger', pt: 'Quebras / defesas batidos', ja: 'ラインブレイク／突破した守備者' },
  'ml.stat.offloads': { fr: 'Offloads (passe après contact)', en: 'Offloads (pass after contact)', es: 'Descargas (pase tras contacto)', it: 'Offload (passaggio dopo il contatto)', de: 'Offloads (Pass nach Kontakt)', pt: 'Offloads (passe após contacto)', ja: 'オフロード（接触後のパス）' },
  'ml.stat.passesDecisives': { fr: 'Passes décisives', en: 'Try assists', es: 'Asistencias de ensayo', it: 'Assist per la meta', de: 'Try-Assists', pt: 'Assistências para ensaio', ja: 'トライアシスト' },
  'ml.stat.passesRatees': { fr: 'En-avant et passes ratées', en: 'Knock-ons and missed passes', es: 'Avants y pases fallados', it: 'In-avanti e passaggi sbagliati', de: 'Vorwürfe und Fehlpässe', pt: 'Avants e passes falhados', ja: 'ノックオンとパスミス' },
  'ml.stat.plaquagesManques': { fr: 'Plaquages manqués', en: 'Missed tackles', es: 'Placajes fallados', it: 'Placcaggi mancati', de: 'Verpasste Tacklings', pt: 'Placagens falhadas', ja: 'ミスタックル' },
  'ml.stat.grattages': { fr: 'Ballons grattés au sol', en: 'Breakdown turnovers won', es: 'Balones recuperados en el suelo', it: 'Palloni recuperati a terra', de: 'Eroberte Bälle am Boden', pt: 'Bolas recuperadas no chão', ja: 'ブレイクダウンでの奪取' },
  'ml.stat.rucksNettoyes': { fr: 'Rucks nettoyés', en: 'Rucks cleared', es: 'Rucks limpiados', it: 'Ruck ripulite', de: 'Gesäuberte Rucks', pt: 'Rucks limpos', ja: 'ラッククリア' },
  'ml.stat.melees': { fr: 'Mêlées gagnées par son pack', en: 'Scrums won by the pack', es: 'Melés ganadas por el paquete', it: 'Mischie vinte dal pacchetto', de: 'Vom Paket gewonnene Gedränge', pt: 'Formações ordenadas ganhas pelo pack', ja: 'パックが勝ったスクラム' },
  'ml.stat.touchesGagnees': { fr: 'Touches captées', en: 'Lineouts won', es: 'Touches ganadas', it: 'Rimesse vinte', de: 'Gewonnene Gassen', pt: 'Alinhamentos ganhos', ja: '獲得ラインアウト' },
  'ml.stat.pickAndGo': { fr: 'Pick and go (ballons portés au ras)', en: 'Pick and go carries', es: 'Pick and go', it: 'Pick and go', de: 'Pick-and-go-Läufe', pt: 'Pick and go', ja: 'ピック・アンド・ゴー' },
  'ml.stat.coupsDePied': { fr: 'Coups de pied', en: 'Kicks', es: 'Patadas', it: 'Calci', de: 'Kicks', pt: 'Pontapés', ja: 'キック' },
  'ml.stat.metresAuPied': { fr: 'Mètres au pied', en: 'Kicking metres', es: 'Metros al pie', it: 'Metri al piede', de: 'Kickmeter', pt: 'Metros ao pé', ja: 'キック獲得メートル' },
  'ml.stat.cinquanteVingtDeux': { fr: '50/22 réussis', en: 'Successful 50:22s', es: '50:22 logrados', it: '50:22 riusciti', de: 'Erfolgreiche 50:22', pt: '50:22 conseguidos', ja: '成功した50:22' },
  'ml.stat.buts': { fr: 'Tirs au but réussis', en: 'Goals made', es: 'Tiros a palos anotados', it: 'Calci piazzati riusciti', de: 'Erfolgreiche Torschüsse', pt: 'Pontapés aos postes convertidos', ja: '成功ゴールキック' },
  'ml.stat.butsTentes': { fr: 'Tirs au but tentés', en: 'Goals attempted', es: 'Tiros a palos intentados', it: 'Calci piazzati tentati', de: 'Versuchte Torschüsse', pt: 'Pontapés aos postes tentados', ja: 'ゴールキック試投' },
  'ml.stat.cartonsJaunes': { fr: 'Cartons jaunes', en: 'Yellow cards', es: 'Tarjetas amarillas', it: 'Cartellini gialli', de: 'Gelbe Karten', pt: 'Cartões amarelos', ja: 'イエローカード' },
  'ml.stat.cartonsRouges': { fr: 'Cartons rouges', en: 'Red cards', es: 'Tarjetas rojas', it: 'Cartellini rossi', de: 'Rote Karten', pt: 'Cartões vermelhos', ja: 'レッドカード' },
  'ml.stat.distance': { fr: 'Distance parcourue (km)', en: 'Distance covered (km)', es: 'Distancia recorrida (km)', it: 'Distanza percorsa (km)', de: 'Zurückgelegte Strecke (km)', pt: 'Distância percorrida (km)', ja: '走行距離（km）' },

  'ml.phase.coupEnvoi': { fr: 'coup d’envoi', en: 'kick-off', es: 'saque inicial', it: 'calcio d’inizio', de: 'Anstoß', pt: 'pontapé de saída', ja: 'キックオフ' },
  'ml.phase.renvoi22': { fr: 'renvoi aux 22', en: '22-metre drop-out', es: 'salida de 22', it: 'rinvio dai 22', de: '22-Meter-Abstoß', pt: 'pontapé de 22', ja: '22メートルドロップアウト' },
  'ml.phase.ruck': { fr: 'ruck', en: 'ruck', es: 'ruck', it: 'ruck', de: 'Ruck', pt: 'ruck', ja: 'ラック' },
  'ml.phase.melee': { fr: 'mêlée', en: 'scrum', es: 'melé', it: 'mischia', de: 'Gedränge', pt: 'formação ordenada', ja: 'スクラム' },
  'ml.phase.touche': { fr: 'touche', en: 'lineout', es: 'touche', it: 'rimessa laterale', de: 'Gasse', pt: 'alinhamento', ja: 'ラインアウト' },
  'ml.phase.maul': { fr: 'ballon porté', en: 'maul', es: 'maul', it: 'maul', de: 'Maul', pt: 'maul', ja: 'モール' },
  'ml.phase.ballonEnLAir': { fr: 'ballon en l’air', en: 'ball in the air', es: 'balón en el aire', it: 'pallone in aria', de: 'Ball in der Luft', pt: 'bola no ar', ja: 'ハイボール' },
  'ml.phase.tirAuBut': { fr: 'tir au but', en: 'kick at goal', es: 'tiro a palos', it: 'calcio piazzato', de: 'Torschuss', pt: 'pontapé aos postes', ja: 'ゴールキック' },
  'ml.phase.transformation': { fr: 'transformation', en: 'conversion', es: 'transformación', it: 'trasformazione', de: 'Erhöhung', pt: 'transformação', ja: 'コンバージョン' },
  'ml.phase.penalite': { fr: 'pénalité', en: 'penalty', es: 'golpe de castigo', it: 'punizione', de: 'Strafe', pt: 'penalidade', ja: 'ペナルティー' },
  'ml.phase.apresEssai': { fr: 'après l’essai', en: 'after the try', es: 'tras el ensayo', it: 'dopo la meta', de: 'nach dem Versuch', pt: 'após o ensaio', ja: 'トライ後' },
  'ml.phase.miTemps': { fr: 'mi-temps', en: 'half-time', es: 'descanso', it: 'intervallo', de: 'Halbzeit', pt: 'intervalo', ja: 'ハーフタイム' },

  'ml.systeme.blitz': { fr: 'défense montante', en: 'blitz defence', es: 'defensa presionante', it: 'difesa aggressiva', de: 'Blitz-Verteidigung', pt: 'defesa pressionante', ja: 'ブリッツディフェンス' },
  'ml.systeme.glissee': { fr: 'défense glissée', en: 'drift defence', es: 'defensa deslizante', it: 'difesa a scivolare', de: 'Drift-Verteidigung', pt: 'defesa deslizante', ja: 'ドリフトディフェンス' },
  'ml.systeme.repli': { fr: 'repli, couverture du pied', en: 'cover defence and kick coverage', es: 'repliegue y cobertura de patadas', it: 'ripiegamento e copertura dei calci', de: 'Rückzug und Kickabsicherung', pt: 'recuo e cobertura ao pé', ja: 'カバー守備とキック対応' },

  'ml.maNote': { fr: 'Ma note', en: 'My rating', es: 'Mi nota', it: 'Il mio voto', de: 'Meine Note', pt: 'A minha nota', ja: '自分の評価' },
  'ml.noteExplication': { fr: 'd’où elle vient', en: 'how it was calculated', es: 'cómo se calculó', it: 'come è stato calcolato', de: 'wie sie berechnet wurde', pt: 'como foi calculada', ja: '評価の内訳' },
  'ml.note.base': { fr: 'Base', en: 'Base', es: 'Base', it: 'Base', de: 'Basis', pt: 'Base', ja: '基礎点' },
  'ml.note.temps': { fr: 'Temps de jeu', en: 'Playing time', es: 'Tiempo de juego', it: 'Tempo di gioco', de: 'Spielzeit', pt: 'Tempo de jogo', ja: '出場時間' },
  'ml.note.plaquages': { fr: 'Plaquages ({n} pour {attendu} attendus)', en: 'Tackles ({n}, {attendu} expected)', es: 'Placajes ({n}, {attendu} esperados)', it: 'Placcaggi ({n}, {attendu} attesi)', de: 'Tacklings ({n}, {attendu} erwartet)', pt: 'Placagens ({n}, {attendu} esperadas)', ja: 'タックル（{n}、期待値{attendu}）' },
  'ml.note.plaquagesManques': { fr: 'Plaquages manqués ({n})', en: 'Missed tackles ({n})', es: 'Placajes fallados ({n})', it: 'Placcaggi mancati ({n})', de: 'Verpasste Tacklings ({n})', pt: 'Placagens falhadas ({n})', ja: 'ミスタックル（{n}）' },
  'ml.note.metres': { fr: 'Mètres gagnés ({n} pour {attendu} attendus)', en: 'Metres gained ({n}, {attendu} expected)', es: 'Metros ganados ({n}, {attendu} esperados)', it: 'Metri guadagnati ({n}, {attendu} attesi)', de: 'Gewonnene Meter ({n}, {attendu} erwartet)', pt: 'Metros ganhos ({n}, {attendu} esperados)', ja: '獲得メートル（{n}、期待値{attendu}）' },
  'ml.note.essais': { fr: 'Essais ({n})', en: 'Tries ({n})', es: 'Ensayos ({n})', it: 'Mete ({n})', de: 'Versuche ({n})', pt: 'Ensaios ({n})', ja: 'トライ（{n}）' },
  'ml.note.grattages': { fr: 'Ballons grattés ({n})', en: 'Turnovers won ({n})', es: 'Balones recuperados ({n})', it: 'Palloni recuperati ({n})', de: 'Eroberte Bälle ({n})', pt: 'Bolas recuperadas ({n})', ja: 'ボール奪取（{n}）' },
  'ml.note.buts': { fr: 'Tirs au but ({reussis}/{tentes})', en: 'Goal kicks ({reussis}/{tentes})', es: 'Tiros a palos ({reussis}/{tentes})', it: 'Calci piazzati ({reussis}/{tentes})', de: 'Torschüsse ({reussis}/{tentes})', pt: 'Pontapés aos postes ({reussis}/{tentes})', ja: 'ゴールキック（{reussis}/{tentes}）' },
  'ml.note.passesDecisives': { fr: 'Passes décisives ({n})', en: 'Try assists ({n})', es: 'Asistencias de ensayo ({n})', it: 'Assist per la meta ({n})', de: 'Try-Assists ({n})', pt: 'Assistências para ensaio ({n})', ja: 'トライアシスト（{n}）' },
  'ml.note.offloads': { fr: 'Offloads ({n})', en: 'Offloads ({n})', es: 'Descargas ({n})', it: 'Offload ({n})', de: 'Offloads ({n})', pt: 'Offloads ({n})', ja: 'オフロード（{n}）' },
  'ml.note.franchissements': { fr: 'Franchissements ({n})', en: 'Line breaks ({n})', es: 'Rupturas ({n})', it: 'Break ({n})', de: 'Durchbrüche ({n})', pt: 'Quebras ({n})', ja: 'ラインブレイク（{n}）' },
  'ml.note.turnovers': { fr: 'Ballons rendus ({n})', en: 'Turnovers conceded ({n})', es: 'Balones perdidos ({n})', it: 'Palloni persi ({n})', de: 'Ballverluste ({n})', pt: 'Bolas perdidas ({n})', ja: 'ターンオーバー献上（{n}）' },
  'ml.note.melees': { fr: 'Mêlée ({n})', en: 'Scrum ({n})', es: 'Melé ({n})', it: 'Mischia ({n})', de: 'Gedränge ({n})', pt: 'Formação ordenada ({n})', ja: 'スクラム（{n}）' },
  'ml.note.touches': { fr: 'Touches captées ({n})', en: 'Lineouts won ({n})', es: 'Touches ganadas ({n})', it: 'Rimesse vinte ({n})', de: 'Gewonnene Gassen ({n})', pt: 'Alinhamentos ganhos ({n})', ja: '獲得ラインアウト（{n}）' },
  'ml.note.pickAndGo': { fr: 'Pick and go ({n})', en: 'Pick and go ({n})', es: 'Pick and go ({n})', it: 'Pick and go ({n})', de: 'Pick and go ({n})', pt: 'Pick and go ({n})', ja: 'ピック・アンド・ゴー（{n}）' },
  'ml.note.cinquanteVingtDeux': { fr: '50/22 réussis ({n})', en: 'Successful 50:22s ({n})', es: '50:22 logrados ({n})', it: '50:22 riusciti ({n})', de: 'Erfolgreiche 50:22 ({n})', pt: '50:22 conseguidos ({n})', ja: '成功した50:22（{n}）' },
  'ml.note.cartons': { fr: 'Cartons', en: 'Cards', es: 'Tarjetas', it: 'Cartellini', de: 'Karten', pt: 'Cartões', ja: 'カード' },
  'ml.feuilleMatch': { fr: 'Feuille de match', en: 'Match sheet', es: 'Acta del partido', it: 'Tabellino', de: 'Spielbericht', pt: 'Ficha de jogo', ja: 'マッチシート' },

  // ═══ LA MANETTE — le joueur pilote son pion (moteur/controle.ts) ═════════
  // ⚠️ LES LIBELLÉS SONT COURTS PARCE QU'ILS VIVENT SUR UN BOUTON DE 64 px.
  // Toute l'explication est dans la clé `.aide`, affichée au survol sur
  // ordinateur et en appui long sur téléphone : c'est là qu'on dit le RISQUE,
  // parce qu'une action dont on ne connaît pas le prix n'est pas un choix.
  'ml.controleOn': { fr: 'Manette', en: 'Manual', es: 'Manual', it: 'Manuale', de: 'Manuell', pt: 'Manual', ja: '手動' },
  'ml.controleOff': { fr: 'Auto', en: 'Auto', es: 'Auto', it: 'Auto', de: 'Auto', pt: 'Auto', ja: '自動' },
  'ml.controleAide': { fr: 'Prendre la main sur ton joueur : plaquer, sprinter, passer, gratter…', en: 'Take control of your player: tackle, sprint, pass, jackal…', es: 'Toma el control de tu jugador: placar, esprintar, pasar, robar…', it: 'Prendi il controllo del tuo giocatore: placcare, scattare, passare, rubare…', de: 'Übernimm deinen Spieler: tackeln, sprinten, passen, jackaln …', pt: 'Assume o controlo do teu jogador: placar, sprintar, passar, roubar…', ja: '自分の選手を操作：タックル、スプリント、パス、ジャッカルなど' },
  // ═══ LE MODE — je joue, ou je regarde ═══════════════════════════════════
  // ⚠️ C'EST LE PREMIER CHOIX DE L'ÉCRAN, et il commande tout le reste : la
  // caméra, le tempo, la présence du HUD. Les anciens libellés « Manette » et
  // « Auto » nommaient un réglage ; ceux-ci nomment une INTENTION, et c'est
  // bien ce qu'on choisit en ouvrant un match.
  'ml.mode.jouer': { fr: 'Je joue', en: 'I play', es: 'Yo juego', it: 'Gioco io', de: 'Ich spiele', pt: 'Eu jogo', ja: '自分で操作' },
  'ml.mode.regarder': { fr: 'Je regarde', en: 'I watch', es: 'Yo miro', it: 'Guardo', de: 'Ich schaue zu', pt: 'Eu vejo', ja: '観戦' },

  // ═══ LES MOMENTS — le jeu ralentit quand c'est à toi (moteur/moments.ts) ══
  // ⚠️ CES CINQ LIGNES SONT LA BANNIÈRE DU RALENTI. Un jeu qui change de
  // vitesse sans rien dire passe pour un jeu qui saccade : la bannière dit
  // POURQUOI, en trois mots, au moment exact où la main doit bouger.
  'ml.moment.ballon': { fr: 'Le ballon est à toi', en: 'The ball is yours', es: 'El balón es tuyo', it: 'Il pallone è tuo', de: 'Der Ball gehört dir', pt: 'A bola é tua', ja: 'ボールは君のものだ' },
  'ml.moment.reception': { fr: 'Il arrive sur toi', en: 'It is coming to you', es: 'Te llega a ti', it: 'Sta arrivando da te', de: 'Er kommt zu dir', pt: 'Vem na tua direção', ja: 'ボールが来る' },
  'ml.moment.libre': { fr: 'Ballon libre — va le chercher', en: 'Loose ball — go and get it', es: 'Balón suelto — ve a por él', it: 'Pallone vagante — vai a prenderlo', de: 'Freier Ball — hol ihn dir', pt: 'Bola solta — vai buscá-la', ja: 'こぼれ球 — 取りに行け' },
  'ml.moment.defense': { fr: 'Il vient sur toi', en: 'He is running at you', es: 'Viene hacia ti', it: 'Ti sta venendo addosso', de: 'Er läuft auf dich zu', pt: 'Vem a correr para ti', ja: '相手が突っ込んでくる' },
  'ml.moment.ruck': { fr: 'Regroupement à ta portée', en: 'Breakdown within reach', es: 'Ruck a tu alcance', it: 'Raggruppamento a portata', de: 'Ruck in Reichweite', pt: 'Ruck ao teu alcance', ja: 'ブレイクダウンが目の前' },

  // ═══ LE TEMPO — à quelle vitesse le match se joue (moteur/moments.ts) ════
  // ⚠️ ON NE LES APPELLE PLUS « ×1 / ×2 / ×4 ». L'ancienne barre nommait « ×1 »
  // une simulation à CINQ FOIS la vitesse réelle : le libellé mentait, et c'est
  // ce mensonge qui faisait croire que le pilotage était cassé alors qu'il
  // était seulement cinq fois trop rapide. Chaque tempo dit ce qu'il FAIT.
  'ml.tempo.moments': { fr: 'Moments', en: 'Moments', es: 'Momentos', it: 'Momenti', de: 'Momente', pt: 'Momentos', ja: '見せ場' },
  'ml.tempo.moments.aide': { fr: 'Le match file, et retombe en temps réel dès qu’une action te concerne. Un match complet en cinq minutes, sans rien manquer des tiennes.', en: 'The match races on, then drops to real time the moment something involves you. A full match in five minutes, without missing any of yours.', es: 'El partido corre y baja a tiempo real en cuanto algo te implica. Un partido entero en cinco minutos, sin perderte ninguna de tus acciones.', it: 'La partita corre e torna al tempo reale appena qualcosa ti riguarda. Una partita intera in cinque minuti, senza perdere nulla delle tue azioni.', de: 'Das Spiel rast, fällt aber in Echtzeit zurück, sobald dich etwas betrifft. Ein ganzes Spiel in fünf Minuten, ohne eine eigene Aktion zu verpassen.', pt: 'O jogo corre e volta ao tempo real assim que algo te envolve. Um jogo completo em cinco minutos, sem perderes nenhuma das tuas ações.', ja: '試合は速く流れ、君が関わる場面だけ実時間に戻る。自分のプレーを逃さず、一試合を5分で。' },
  'ml.tempo.suivre': { fr: 'Suivre', en: 'Watch', es: 'Seguir', it: 'Seguire', de: 'Zuschauen', pt: 'Seguir', ja: '観戦' },
  'ml.tempo.suivre.aide': { fr: 'Le match se déroule à vitesse de retransmission, sans ralenti.', en: 'The match runs at broadcast speed, with no slow-down.', es: 'El partido va a velocidad de retransmisión, sin ralentí.', it: 'La partita scorre a velocità da telecronaca, senza rallentamenti.', de: 'Das Spiel läuft in Übertragungstempo, ohne Zeitlupe.', pt: 'O jogo decorre a velocidade de transmissão, sem abrandar.', ja: '中継と同じ速さで進み、スローにはならない。' },
  'ml.tempo.accelere': { fr: 'Accéléré', en: 'Fast', es: 'Acelerado', it: 'Accelerato', de: 'Schnell', pt: 'Acelerado', ja: '早送り' },
  'ml.tempo.accelere.aide': { fr: 'On avale les minutes. Pratique quand le score est fait.', en: 'Chews through the minutes. Handy once the result is settled.', es: 'Devora los minutos. Útil cuando el resultado ya está.', it: 'Divora i minuti. Comodo quando il risultato è deciso.', de: 'Frisst die Minuten. Praktisch, wenn das Ergebnis feststeht.', pt: 'Devora os minutos. Útil quando o resultado já está feito.', ja: '時間を一気に進める。勝敗が決まった後に便利。' },
  'ml.tempo.fin': { fr: 'Fin', en: 'To the end', es: 'Al final', it: 'Alla fine', de: 'Zum Ende', pt: 'Até ao fim', ja: '最後まで' },
  'ml.tempo.fin.aide': { fr: 'Jusqu’au coup de sifflet final, d’un coup.', en: 'Straight to the final whistle.', es: 'Directo al pitido final.', it: 'Dritto al fischio finale.', de: 'Direkt bis zum Schlusspfiff.', pt: 'Direto até ao apito final.', ja: '一気に試合終了まで。' },

  // ═══ LE HUD ET LE TIROIR ════════════════════════════════════════════════
  // ⚠️ TOUT CE QUI N'EST PAS LE JEU VIT DANS LE TIROIR. Le fil, le champ de
  // consigne et la notice occupaient les deux tiers d'un écran de téléphone :
  // le terrain tombait à deux cents pixels et le match devenait illisible.
  'ml.plus': { fr: 'Fil, consigne et commandes', en: 'Feed, instruction and controls', es: 'Narración, consigna y controles', it: 'Cronaca, indicazione e comandi', de: 'Ticker, Anweisung und Steuerung', pt: 'Relato, instrução e comandos', ja: '実況・指示・操作' },
  'ml.onglet.fil': { fr: 'Fil', en: 'Feed', es: 'Narración', it: 'Cronaca', de: 'Ticker', pt: 'Relato', ja: '実況' },
  'ml.onglet.consigne': { fr: 'Consigne', en: 'Instruction', es: 'Consigna', it: 'Indicazione', de: 'Anweisung', pt: 'Instrução', ja: '指示' },
  'ml.consigneAide': { fr: 'Écris ce que tu veux voir sur le terrain : « défendez plus bas », « joue au pied », « au ras du ruck ». Le placement de ton équipe suit.', en: 'Write what you want to see on the pitch: “defend deeper”, “kick it”, “play close to the ruck”. Your team’s shape follows.', es: 'Escribe lo que quieres ver en el campo: «defended más atrás», «juega al pie», «cerca del ruck». La colocación de tu equipo lo sigue.', it: 'Scrivi cosa vuoi vedere in campo: «difendete più bassi», «gioca al piede», «vicino alla ruck». Il piazzamento della squadra si adegua.', de: 'Schreib, was du auf dem Feld sehen willst: „tiefer verteidigen“, „spiel den Ball“, „eng am Ruck“. Die Aufstellung deiner Mannschaft folgt.', pt: 'Escreve o que queres ver no campo: «defendam mais atrás», «joga ao pé», «junto ao ruck». A colocação da tua equipa segue.', ja: 'ピッチで見たいことを書く：「もっと下がって守れ」「キックで蹴れ」「ラック際で」。味方の配置がそれに従う。' },
  'ml.discipline.titre': { fr: 'Chambrer, frapper, calmer', en: 'Sledge, swing, calm it', es: 'Chinchar, golpear, calmar', it: 'Provocare, colpire, calmare', de: 'Sticheln, schlagen, beruhigen', pt: 'Provocar, bater, acalmar', ja: '挑発・殴る・鎮める' },
  'ml.discipline.aide': { fr: 'Les gestes qui font monter la température — et qui coûtent des semaines. Rangés à part pour qu’on ne frappe pas en croyant passer.', en: 'The gestures that raise the temperature — and cost weeks. Kept apart so you never swing when you meant to pass.', es: 'Los gestos que suben la temperatura — y cuestan semanas. Aparte, para que no golpees creyendo pasar.', it: 'I gesti che alzano la temperatura — e costano settimane. Tenuti a parte, così non colpisci credendo di passare.', de: 'Die Gesten, die die Temperatur hochtreiben — und Wochen kosten. Getrennt gehalten, damit du nie zuschlägst, wenn du passen wolltest.', pt: 'Os gestos que sobem a temperatura — e custam semanas. À parte, para que não batas a pensar que passavas.', ja: '試合の温度を上げ、出場停止を招く行為。パスのつもりで殴らないよう、別枠にしてある。' },
  'ml.commandes.sprintTactile': { fr: 'Pousse le stick à fond pour sprinter', en: 'Push the stick all the way to sprint', es: 'Empuja el stick a fondo para esprintar', it: 'Spingi lo stick a fondo per scattare', de: 'Stick ganz durchdrücken zum Sprinten', pt: 'Empurra o stick até ao fim para sprintar', ja: 'スティックを目一杯倒すとスプリント' },

  // ═══ LA PREMIÈRE FOIS QU'ON PILOTE ══════════════════════════════════════
  // ⚠️ TROIS LIGNES, PAS UN TUTORIEL. Il s'affiche une seule fois et se ferme
  // au premier geste : ce qu'il faut savoir tient en « pouce gauche, bouton
  // droit, ça ralentit tout seul ».
  'ml.tuto.titre': { fr: 'Ton match, ta manette', en: 'Your match, your controls', es: 'Tu partido, tus mandos', it: 'La tua partita, i tuoi comandi', de: 'Dein Spiel, deine Steuerung', pt: 'O teu jogo, os teus comandos', ja: '君の試合、君の操作' },
  'ml.tuto.stick': { fr: 'Glisse le pouce sur la moitié gauche du terrain pour courir. À fond = sprint.', en: 'Drag your thumb on the left half of the pitch to run. All the way = sprint.', es: 'Desliza el pulgar por la mitad izquierda del campo para correr. A fondo = sprint.', it: 'Trascina il pollice sulla metà sinistra del campo per correre. A fondo = scatto.', de: 'Zieh den Daumen über die linke Feldhälfte, um zu laufen. Ganz durch = Sprint.', pt: 'Arrasta o polegar na metade esquerda do campo para correr. Até ao fim = sprint.', ja: 'ピッチ左半分を指でドラッグして走る。目一杯でスプリント。' },
  'ml.tuto.bouton': { fr: 'Le gros bouton en bas à droite joue l’action du moment — passer, plaquer, gratter.', en: 'The big button at bottom right plays the action of the moment — pass, tackle, jackal.', es: 'El botón grande abajo a la derecha juega la acción del momento: pasar, placar, robar.', it: 'Il pulsante grande in basso a destra gioca l’azione del momento: passare, placcare, rubare.', de: 'Der große Knopf unten rechts spielt die Aktion des Moments — passen, tackeln, jackaln.', pt: 'O botão grande em baixo à direita joga a ação do momento — passar, placar, roubar.', ja: '右下の大きなボタンがその瞬間のアクション（パス・タックル・ジャッカル）を実行する。' },
  'ml.tuto.moments': { fr: 'Le match file tout seul et RALENTIT dès qu’une action te concerne. Tu ne rates rien.', en: 'The match races on by itself and SLOWS DOWN whenever something involves you. You miss nothing.', es: 'El partido corre solo y SE RALENTIZA en cuanto algo te implica. No te pierdes nada.', it: 'La partita scorre da sola e RALLENTA appena qualcosa ti riguarda. Non ti perdi niente.', de: 'Das Spiel läuft von allein und WIRD LANGSAMER, sobald dich etwas betrifft. Du verpasst nichts.', pt: 'O jogo corre sozinho e ABRANDA assim que algo te envolve. Não perdes nada.', ja: '試合は自動で進み、君が関わる場面で必ずスローになる。見逃しはない。' },
  'ml.tuto.compris': { fr: 'C’est parti', en: 'Let’s go', es: 'Vamos', it: 'Si parte', de: 'Los geht’s', pt: 'Vamos', ja: 'はじめる' },
  // ═══ LA NOTICE DES COMMANDES (moteur/manette.ts) ════════════════════════
  'ml.commandes.titre': { fr: 'Commandes', en: 'Controls', es: 'Controles', it: 'Comandi', de: 'Steuerung', pt: 'Comandos', ja: '操作方法' },
  'ml.commandes.deplacer': { fr: 'Se déplacer', en: 'Move', es: 'Moverse', it: 'Muoversi', de: 'Bewegen', pt: 'Mover', ja: '移動' },
  'ml.commandes.sprint': { fr: 'Sprint (maintenu)', en: 'Sprint (hold)', es: 'Sprint (mantener)', it: 'Scatto (tenere premuto)', de: 'Sprint (halten)', pt: 'Sprint (manter)', ja: 'スプリント（長押し）' },
  'ml.commandes.principale': { fr: 'Action principale — le jeu choisit la bonne', en: 'Main action — the game picks the right one', es: 'Acción principal — el juego elige la correcta', it: 'Azione principale — il gioco sceglie quella giusta', de: 'Hauptaktion — das Spiel wählt die passende', pt: 'Ação principal — o jogo escolhe a certa', ja: 'メインアクション — 状況に応じて自動選択' },
  'ml.commandes.tactile': { fr: 'Glisse ton doigt sur le terrain pour courir', en: 'Drag your finger on the pitch to run', es: 'Desliza el dedo por el campo para correr', it: 'Trascina il dito sul campo per correre', de: 'Wische mit dem Finger über das Feld, um zu laufen', pt: 'Arrasta o dedo no campo para correr', ja: 'ピッチを指でドラッグして走る' },
  'ml.manetteDetectee': { fr: 'Manette détectée', en: 'Gamepad detected', es: 'Mando detectado', it: 'Controller rilevato', de: 'Controller erkannt', pt: 'Comando detetado', ja: 'コントローラーを検出' },

  'ml.surLeBanc': { fr: 'Sur le banc — tu entreras plus tard', en: 'On the bench — you will come on later', es: 'En el banquillo — entrarás más tarde', it: 'In panchina — entrerai più tardi', de: 'Auf der Bank — du kommst später rein', pt: 'No banco — entras mais tarde', ja: 'ベンチ — 後半に出場予定' },
  'ml.sanctionne': { fr: 'Carton : tu es hors du terrain', en: 'Carded: you are off the field', es: 'Tarjeta: estás fuera del campo', it: 'Cartellino: sei fuori dal campo', de: 'Karte: Du bist vom Feld', pt: 'Cartão: estás fora do campo', ja: 'カード：退出中' },
  'ml.actionsAttente': { fr: 'Rien à jouer sur cette phase', en: 'Nothing to play on this phase', es: 'Nada que jugar en esta fase', it: 'Niente da giocare in questa fase', de: 'In dieser Phase nichts zu spielen', pt: 'Nada a jogar nesta fase', ja: 'このフェーズでできることはない' },
  'ml.recharge': { fr: 'Tu reprends ton souffle', en: 'Catching your breath', es: 'Recuperas el aliento', it: 'Riprendi fiato', de: 'Du schöpfst Atem', pt: 'Recuperas o fôlego', ja: '息を整えている' },
  'ml.tensionAide': { fr: 'Température du match : plus elle monte, plus ça peut dégénérer.', en: 'Match temperature: the higher it climbs, the more likely things boil over.', es: 'Temperatura del partido: cuanto más sube, más fácil es que se desmadre.', it: 'Temperatura della partita: più sale, più facilmente degenera.', de: 'Temperatur des Spiels: je höher sie steigt, desto eher eskaliert es.', pt: 'Temperatura do jogo: quanto mais sobe, mais facilmente descamba.', ja: '試合の温度：上がるほど荒れやすくなる。' },

  'ml.act.sprint': { fr: 'Sprint', en: 'Sprint', es: 'Sprint', it: 'Scatto', de: 'Sprint', pt: 'Sprint', ja: 'スプリント' },
  'ml.act.sprint.aide': { fr: 'Coup d’accélérateur : plus dur à plaquer, mais l’endurance fond.', en: 'Burst of pace: harder to bring down, but stamina drains fast.', es: 'Acelerón: más difícil de placar, pero la resistencia cae rápido.', it: 'Accelerazione: più difficile da placcare, ma la resistenza crolla.', de: 'Antritt: schwerer zu stoppen, aber die Ausdauer schmilzt.', pt: 'Aceleração: mais difícil de placar, mas a resistência cai rápido.', ja: '加速：止められにくくなるが、スタミナを大きく消耗。' },
  'ml.act.crochet': { fr: 'Crochet', en: 'Sidestep', es: 'Quiebro', it: 'Finta', de: 'Haken', pt: 'Finta', ja: 'ステップ' },
  'ml.act.crochet.aide': { fr: 'Tu tentes d’effacer le plaqueur. Réussi, tu perces ; raté, tu peux lâcher le ballon.', en: 'You try to beat the tackler. It works, you break through; it fails, you may lose the ball.', es: 'Intentas superar al placador. Si sale, rompes; si falla, puedes perder el balón.', it: 'Provi a saltare il placcatore. Se riesce sfondi, se fallisce puoi perdere il pallone.', de: 'Du versuchst, den Tackler auszuspielen. Klappt es, brichst du durch; misslingt es, verlierst du womöglich den Ball.', pt: 'Tentas ultrapassar o placador. Se resultar, rompes; se falhar, podes perder a bola.', ja: 'タックラーをかわしにいく。成功すれば突破、失敗すればボールを失うことも。' },
  'ml.act.raffut': { fr: 'Raffut', en: 'Hand-off', es: 'Palanca', it: 'Puntello', de: 'Abwehrstoß', pt: 'Afastamento', ja: 'ハンドオフ' },
  'ml.act.raffut.aide': { fr: 'Tu passes en force et gardes un bras libre : beaucoup plus d’offloads.', en: 'You go through the contact with an arm free: far more offloads.', es: 'Pasas por la fuerza con un brazo libre: muchas más descargas.', it: 'Passi di forza con un braccio libero: molti più offload.', de: 'Du gehst mit freiem Arm durch den Kontakt: deutlich mehr Offloads.', pt: 'Passas à força com um braço livre: muitos mais offloads.', ja: '力で当たりつつ片腕を空ける：オフロードが大幅に増える。' },
  'ml.act.passe': { fr: 'Passer', en: 'Pass', es: 'Pasar', it: 'Passare', de: 'Passen', pt: 'Passar', ja: 'パス' },
  'ml.act.passe.aide': { fr: 'Tu donnes tout de suite au soutien, sans attendre la combinaison.', en: 'You give it to the support runner straight away, without waiting for the play.', es: 'Se la das al apoyo de inmediato, sin esperar a la jugada.', it: 'Passi subito al sostegno, senza aspettare lo schema.', de: 'Du gibst sofort zum Unterstützer ab, ohne den Spielzug abzuwarten.', pt: 'Dás logo ao apoio, sem esperar pela jogada.', ja: 'すぐにサポートへ渡す。サインを待たない。' },
  'ml.act.pied': { fr: 'Taper', en: 'Kick', es: 'Patear', it: 'Calciare', de: 'Kicken', pt: 'Chutar', ja: 'キック' },
  'ml.act.pied.aide': { fr: 'Coup de pied adapté à ta position : dégagement, occupation ou rasant.', en: 'A kick suited to where you are: clearance, territory or grubber.', es: 'Una patada adaptada a tu posición: despeje, ocupación o rastrón.', it: 'Un calcio adatto alla tua posizione: liberazione, occupazione o rasoterra.', de: 'Ein Kick passend zu deiner Position: Befreiung, Raumgewinn oder Grubber.', pt: 'Um pontapé adequado à tua posição: alívio, ocupação ou rasteiro.', ja: '位置に応じたキック：タッチ、陣地、グラバー。' },

  'ml.act.appel': { fr: 'Réclamer', en: 'Call for it', es: 'Pedirla', it: 'Chiamare', de: 'Fordern', pt: 'Pedir', ja: 'ボールを呼ぶ' },
  'ml.act.appel.aide': { fr: 'Tu appelles le ballon : tu entres dans la prochaine combinaison.', en: 'You call for the ball: you join the next passing move.', es: 'Pides el balón: entras en la próxima jugada.', it: 'Chiami il pallone: entri nel prossimo schema.', de: 'Du forderst den Ball: Du gehst in den nächsten Spielzug ein.', pt: 'Pedes a bola: entras na próxima jogada.', ja: 'ボールを呼ぶ：次のサインプレーに入る。' },
  'ml.act.soutien': { fr: 'Soutien', en: 'Support', es: 'Apoyo', it: 'Sostegno', de: 'Unterstützen', pt: 'Apoio', ja: 'サポート' },
  'ml.act.soutien.aide': { fr: 'Tu suis le porteur à son épaule : offloads et ballons nettoyés.', en: 'You follow the carrier off his shoulder: offloads and rucks cleared.', es: 'Sigues al portador a su hombro: descargas y rucks limpiados.', it: 'Segui il portatore alla sua spalla: offload e ruck ripuliti.', de: 'Du folgst dem Ballträger an seiner Schulter: Offloads und gesäuberte Rucks.', pt: 'Segues o portador ao ombro: offloads e rucks limpos.', ja: 'キャリアーの肩の後ろを追う：オフロードとラッククリア。' },

  'ml.act.plaquage': { fr: 'Plaquer', en: 'Tackle', es: 'Placar', it: 'Placcare', de: 'Tackeln', pt: 'Placar', ja: 'タックル' },
  'ml.act.plaquage.aide': { fr: 'Tu te jettes sur le porteur. Plus de plaquages réussis, mais aussi de fautes.', en: 'You throw yourself at the carrier. More tackles made — and more penalties.', es: 'Te lanzas sobre el portador. Más placajes, pero también más faltas.', it: 'Ti lanci sul portatore. Più placcaggi riusciti, ma anche più falli.', de: 'Du wirfst dich auf den Ballträger. Mehr Tacklings — und mehr Strafen.', pt: 'Atiras-te ao portador. Mais placagens, mas também mais faltas.', ja: 'キャリアーに飛び込む。成功が増えるが反則も増える。' },
  'ml.act.monter': { fr: 'Monter', en: 'Rush up', es: 'Subir', it: 'Salire', de: 'Vorrücken', pt: 'Subir', ja: '前に出る' },
  'ml.act.monter.aide': { fr: 'Tu montes vite sur ton vis-à-vis pour fermer l’espace.', en: 'You rush up on your opposite number to shut the space down.', es: 'Subes rápido sobre tu par para cerrar el espacio.', it: 'Sali rapidamente sul tuo diretto avversario per chiudere lo spazio.', de: 'Du rückst schnell auf deinen Gegenspieler vor und nimmst den Raum.', pt: 'Sobes depressa sobre o teu adversário direto para fechar o espaço.', ja: '相手に素早く詰めてスペースを消す。' },
  'ml.act.grattage': { fr: 'Gratter', en: 'Jackal', es: 'Robar', it: 'Rubare', de: 'Jackal', pt: 'Roubar', ja: 'ジャッカル' },
  'ml.act.grattage.aide': { fr: 'Tu contestes le ballon au sol. Gros gain — ou pénalité contre toi.', en: 'You contest the ball on the ground. A big win — or a penalty against you.', es: 'Disputas el balón en el suelo. Gran ganancia — o golpe en tu contra.', it: 'Contendi il pallone a terra. Grande colpo — o punizione contro di te.', de: 'Du kämpfst um den Ball am Boden. Großer Gewinn — oder Strafe gegen dich.', pt: 'Disputas a bola no chão. Grande ganho — ou penalidade contra ti.', ja: '地上のボールに絡む。大きな収穫か、自分への反則か。' },

  'ml.act.provoquer': { fr: 'Chambrer', en: 'Wind him up', es: 'Provocar', it: 'Provocare', de: 'Sticheln', pt: 'Provocar', ja: '挑発' },
  'ml.act.provoquer.aide': { fr: 'Tu provoques un adversaire. La tension monte, et quelqu’un peut craquer.', en: 'You wind up an opponent. The tension rises, and someone may snap.', es: 'Provocas a un rival. La tensión sube y alguien puede estallar.', it: 'Provochi un avversario. La tensione sale e qualcuno può esplodere.', de: 'Du stichelst gegen einen Gegner. Die Spannung steigt, jemand kann ausrasten.', pt: 'Provocas um adversário. A tensão sobe e alguém pode explodir.', ja: '相手を挑発する。緊張が高まり、誰かがキレるかもしれない。' },
  'ml.act.frapper': { fr: 'Frapper', en: 'Throw a punch', es: 'Golpear', it: 'Colpire', de: 'Zuschlagen', pt: 'Agredir', ja: '殴る' },
  'ml.act.frapper.aide': { fr: 'Tu portes un coup. Bagarre assurée, carton probable, commission derrière.', en: 'You throw a punch. A brawl for sure, a card likely, a hearing afterwards.', es: 'Lanzas un golpe. Tangana segura, tarjeta probable, comisión después.', it: 'Tiri un pugno. Rissa certa, cartellino probabile, commissione dopo.', de: 'Du schlägst zu. Schlägerei sicher, Karte wahrscheinlich, Sportgericht danach.', pt: 'Dás um murro. Rixa garantida, cartão provável, comissão a seguir.', ja: 'パンチを出す。乱闘は確実、カードも濃厚、あとで規律委員会。' },
  'ml.act.calmer': { fr: 'Calmer', en: 'Calm it down', es: 'Calmar', it: 'Calmare', de: 'Beruhigen', pt: 'Acalmar', ja: '鎮める' },
  'ml.act.calmer.aide': { fr: 'Tu fais retomber la tension et tu écartes les tiens.', en: 'You bring the temperature down and pull your team away.', es: 'Bajas la tensión y apartas a los tuyos.', it: 'Fai calare la tensione e allontani i tuoi.', de: 'Du nimmst die Spannung heraus und ziehst deine Leute weg.', pt: 'Fazes baixar a tensão e afastas os teus.', ja: '緊張を下げ、味方を引き離す。' },

  // ═══ LA BAGARRE — l'ordre que tu donnes (moteur/bagarre.ts) ══════════════
  'ml.bagarre.titre': { fr: 'Ça a dégénéré', en: 'It has boiled over', es: 'Se ha desmadrado', it: 'È degenerata', de: 'Es ist eskaliert', pt: 'Descambou', ja: '乱闘発生' },
  'ml.bagarre.texte': { fr: 'Tu es aux prises avec {nom}. Qu’est-ce que tu fais ?', en: 'You are grappling with {nom}. What do you do?', es: 'Estás enzarzado con {nom}. ¿Qué haces?', it: 'Sei alle prese con {nom}. Che cosa fai?', de: 'Du gehst mit {nom} aneinander. Was tust du?', pt: 'Estás às voltas com {nom}. O que fazes?', ja: '{nom}と揉み合っている。どうする？' },
  'ml.ordre.tous': { fr: 'On y va tous', en: 'Everyone in', es: 'Vamos todos', it: 'Andiamo tutti', de: 'Alle rein', pt: 'Vamos todos', ja: '全員行くぞ' },
  'ml.ordre.tous.aide': { fr: 'Le pack te suit. Générale, et des cartons des deux côtés.', en: 'The pack follows you. A mass brawl, and cards on both sides.', es: 'El paquete te sigue. Tangana general y tarjetas en los dos bandos.', it: 'Il pacchetto ti segue. Rissa generale e cartellini da entrambe le parti.', de: 'Das Pack folgt dir. Massenschlägerei und Karten auf beiden Seiten.', pt: 'O pack segue-te. Rixa geral e cartões dos dois lados.', ja: 'FWが続く。乱闘に発展し、両チームにカード。' },
  'ml.ordre.proteger': { fr: 'Protéger', en: 'Protect him', es: 'Proteger', it: 'Proteggere', de: 'Schützen', pt: 'Proteger', ja: '味方を守る' },
  'ml.ordre.proteger.aide': { fr: 'Tu pousses et tu tires sans frapper. Risque moyen.', en: 'You push and pull without throwing punches. Moderate risk.', es: 'Empujas y tiras sin golpear. Riesgo medio.', it: 'Spingi e tiri senza colpire. Rischio medio.', de: 'Du schiebst und ziehst, ohne zu schlagen. Mittleres Risiko.', pt: 'Empurras e puxas sem bater. Risco médio.', ja: '殴らずに押し引きする。リスクは中程度。' },
  'ml.ordre.calmer': { fr: 'On se calme', en: 'Break it up', es: 'Nos calmamos', it: 'Calmiamoci', de: 'Auseinander', pt: 'Acalmar', ja: '止めに入る' },
  'ml.ordre.calmer.aide': { fr: 'Tu sépares. L’arbitre le voit, la sanction s’allège.', en: 'You break it up. The referee notices, and your sanction eases.', es: 'Separas. El árbitro lo ve y tu sanción se alivia.', it: 'Dividi tutti. L’arbitro lo vede e la sanzione si alleggerisce.', de: 'Du trennst die Spieler. Der Schiedsrichter sieht es, deine Strafe fällt milder aus.', pt: 'Separas. O árbitro vê e a tua sanção alivia.', ja: '引き離す。レフリーが見ており、処分は軽くなる。' },
  'ml.ordre.reculer': { fr: 'Reculer', en: 'Walk away', es: 'Retirarse', it: 'Indietreggiare', de: 'Zurückziehen', pt: 'Recuar', ja: '下がる' },
  'ml.ordre.reculer.aide': { fr: 'Mains en l’air, tu t’écartes. Aucune sanction pour toi.', en: 'Hands up, you step away. No sanction for you.', es: 'Manos arriba, te apartas. Ninguna sanción para ti.', it: 'Mani in alto, ti allontani. Nessuna sanzione per te.', de: 'Hände hoch, du gehst weg. Keine Strafe für dich.', pt: 'Mãos no ar, afastas-te. Nenhuma sanção para ti.', ja: '両手を上げて離れる。自分への処分はなし。' },

  // ═══ APRÈS LE MATCH : la commission ══════════════════════════════════════
  'ml.sanction.titre': { fr: 'Commission de discipline', en: 'Disciplinary hearing', es: 'Comisión de disciplina', it: 'Commissione disciplinare', de: 'Sportgericht', pt: 'Comissão de disciplina', ja: '規律委員会' },
  'ml.sanction.suspension': { fr: '{n} semaines de suspension — {motif}.', en: '{n} weeks’ suspension — {motif}.', es: '{n} semanas de suspensión — {motif}.', it: '{n} settimane di squalifica — {motif}.', de: '{n} Wochen Sperre — {motif}.', pt: '{n} semanas de suspensão — {motif}.', ja: '出場停止{n}週間 — {motif}。' },
  'ml.sanction.semaines': { fr: '{n} semaines d’indisponibilité.', en: '{n} weeks out.', es: '{n} semanas de baja.', it: '{n} settimane di indisponibilità.', de: '{n} Wochen Ausfall.', pt: '{n} semanas de paragem.', ja: '{n}週間の離脱。' },
};
