import type { FinCarriere, LegendeSauvegardee, MotifFinCarriere } from '../types';
import { langueCourante, type Langue } from '../lib/i18n';

interface LibellesFinCarriere {
  eyebrow: string;
  titres: Record<MotifFinCarriere, string>;
  raisons: Record<MotifFinCarriere, string>;
  detail: string;
  sauvegardee: string;
  boutonHall: string;
  boutonManager: string;
  age: string;
  saisons: string;
  matchs: string;
  essais: string;
  titresGagnes: string;
  score: string;
}

const L: Record<Langue, LibellesFinCarriere> = {
  fr: {
    eyebrow: 'FIN DE CARRIÈRE',
    titres: {
      retraiteChoisie: 'Tu as choisi de raccrocher', ageLimite: 'Le temps a sifflé la fin',
      blessure: 'Ton corps a dit stop', radiation: 'Le rugby t’a fermé ses portes',
      deces: 'Une carrière brutalement interrompue', sansClub: 'Le téléphone ne sonne plus',
      autre: 'La carrière s’arrête ici',
    },
    raisons: {
      retraiteChoisie: 'Cette décision vient de toi. Tu quittes les terrains au moment que tu as choisi, avec ton parcours intact derrière toi.',
      ageLimite: 'Tu as atteint la limite d’âge de la carrière joueur. Le jeu ne pouvait plus inscrire ton personnage pour une nouvelle saison.',
      blessure: 'Les examens médicaux ont déclaré ton état incompatible avec la poursuite du rugby. Cette blessure met définitivement fin à ta carrière.',
      radiation: 'Une décision disciplinaire définitive a retiré ta licence. Aucun club ni aucune fédération ne peut désormais t’aligner.',
      deces: 'L’évènement vécu dans ta carrière était définitif. Le récit de ton joueur s’achève brutalement à cet instant.',
      sansClub: 'Ton contrat était terminé ou rompu et aucun club n’a accepté de te recruter. Sans licence active ni équipe, la carrière ne pouvait plus continuer.',
      autre: 'Un évènement définitif du récit a rendu impossible la poursuite de ta carrière de joueur.',
    },
    detail: 'L’évènement décisif',
    sauvegardee: 'Ta carrière est sauvegardée. Elle va maintenant rejoindre le Hall des légendes avec tout son palmarès.',
    boutonHall: 'Entrer dans le Hall des légendes', boutonManager: 'Choisir mon premier banc',
    age: 'Âge', saisons: 'Saisons', matchs: 'Matchs', essais: 'Essais', titresGagnes: 'Titres', score: 'Score de légende',
  },
  en: {
    eyebrow: 'END OF CAREER',
    titres: {
      retraiteChoisie: 'You chose to retire', ageLimite: 'Time has called the final whistle',
      blessure: 'Your body said stop', radiation: 'Rugby closed its doors to you',
      deces: 'A career cut brutally short', sansClub: 'The phone has stopped ringing',
      autre: 'Your career ends here',
    },
    raisons: {
      retraiteChoisie: 'This was your decision. You leave the pitch on your own terms, with your entire journey behind you.',
      ageLimite: 'You reached the player-career age limit. The game could no longer register your character for another season.',
      blessure: 'Medical examinations ruled that you could no longer continue playing rugby. This injury permanently ends your career.',
      radiation: 'A final disciplinary ruling withdrew your licence. No club or federation can select you again.',
      deces: 'The event in your career was final. Your player’s story ends abruptly at this moment.',
      sansClub: 'Your contract ended or was terminated and no club agreed to sign you. Without an active licence or team, the career could not continue.',
      autre: 'A definitive story event made it impossible to continue your playing career.',
    },
    detail: 'The decisive event',
    sauvegardee: 'Your career has been saved. It will now enter the Hall of Fame with its complete honours.',
    boutonHall: 'Enter the Hall of Fame', boutonManager: 'Choose my first coaching job',
    age: 'Age', saisons: 'Seasons', matchs: 'Matches', essais: 'Tries', titresGagnes: 'Titles', score: 'Legend score',
  },
  es: {
    eyebrow: 'FIN DE LA CARRERA',
    titres: {
      retraiteChoisie: 'Has decidido retirarte', ageLimite: 'El tiempo pitó el final',
      blessure: 'Tu cuerpo dijo basta', radiation: 'El rugby te cerró sus puertas',
      deces: 'Una carrera interrumpida brutalmente', sansClub: 'El teléfono dejó de sonar',
      autre: 'Tu carrera termina aquí',
    },
    raisons: {
      retraiteChoisie: 'La decisión es tuya. Dejas el campo cuando tú eliges, con todo tu recorrido intacto.',
      ageLimite: 'Alcanzaste el límite de edad de la carrera de jugador. El juego ya no podía inscribirte para otra temporada.',
      blessure: 'Los exámenes médicos determinaron que no podías seguir jugando al rugby. Esta lesión pone fin definitivo a tu carrera.',
      radiation: 'Una decisión disciplinaria definitiva retiró tu licencia. Ningún club ni federación puede volver a alinearte.',
      deces: 'El acontecimiento vivido era definitivo. La historia de tu jugador termina bruscamente en este instante.',
      sansClub: 'Tu contrato terminó o fue rescindido y ningún club aceptó ficharte. Sin licencia activa ni equipo, la carrera no podía continuar.',
      autre: 'Un acontecimiento definitivo hizo imposible continuar tu carrera como jugador.',
    },
    detail: 'El acontecimiento decisivo',
    sauvegardee: 'Tu carrera está guardada. Ahora entrará en el Salón de la Fama con todo su palmarés.',
    boutonHall: 'Entrar en el Salón de la Fama', boutonManager: 'Elegir mi primer banquillo',
    age: 'Edad', saisons: 'Temporadas', matchs: 'Partidos', essais: 'Ensayos', titresGagnes: 'Títulos', score: 'Puntuación de leyenda',
  },
  it: {
    eyebrow: 'FINE CARRIERA',
    titres: {
      retraiteChoisie: 'Hai scelto di ritirarti', ageLimite: 'Il tempo ha fischiato la fine',
      blessure: 'Il tuo corpo ha detto basta', radiation: 'Il rugby ti ha chiuso le porte',
      deces: 'Una carriera spezzata brutalmente', sansClub: 'Il telefono non squilla più',
      autre: 'La carriera finisce qui',
    },
    raisons: {
      retraiteChoisie: 'La decisione è tua. Lasci il campo nel momento scelto, con tutto il tuo percorso alle spalle.',
      ageLimite: 'Hai raggiunto il limite d’età della carriera giocatore. Il gioco non poteva più iscriverti a una nuova stagione.',
      blessure: 'Gli esami medici hanno escluso la possibilità di continuare a giocare. Questo infortunio chiude definitivamente la carriera.',
      radiation: 'Una decisione disciplinare definitiva ha ritirato la tua licenza. Nessun club o federazione può più schierarti.',
      deces: 'L’evento vissuto era definitivo. La storia del tuo giocatore si interrompe bruscamente in questo momento.',
      sansClub: 'Il contratto è terminato o è stato risolto e nessun club ha accettato di ingaggiarti. Senza squadra, la carriera non poteva continuare.',
      autre: 'Un evento definitivo della storia ha reso impossibile continuare la carriera da giocatore.',
    },
    detail: 'L’evento decisivo',
    sauvegardee: 'La carriera è stata salvata. Ora entrerà nella Hall of Fame con tutto il suo palmarès.',
    boutonHall: 'Entra nella Hall of Fame', boutonManager: 'Scegli la mia prima panchina',
    age: 'Età', saisons: 'Stagioni', matchs: 'Partite', essais: 'Mete', titresGagnes: 'Titoli', score: 'Punteggio leggenda',
  },
  de: {
    eyebrow: 'KARRIEREENDE',
    titres: {
      retraiteChoisie: 'Du hast deinen Rücktritt gewählt', ageLimite: 'Die Zeit hat abgepfiffen',
      blessure: 'Dein Körper sagte Stopp', radiation: 'Der Rugby-Sport schloss seine Türen',
      deces: 'Eine jäh beendete Karriere', sansClub: 'Das Telefon klingelt nicht mehr',
      autre: 'Deine Karriere endet hier',
    },
    raisons: {
      retraiteChoisie: 'Diese Entscheidung kam von dir. Du verlässt den Platz zu deinem gewählten Zeitpunkt und blickst auf deine gesamte Laufbahn zurück.',
      ageLimite: 'Du hast die Altersgrenze der Spielerkarriere erreicht. Das Spiel konnte dich nicht mehr für eine weitere Saison melden.',
      blessure: 'Die medizinischen Untersuchungen schlossen eine Fortsetzung aus. Diese Verletzung beendet deine Karriere endgültig.',
      radiation: 'Eine endgültige Disziplinarentscheidung entzog dir die Lizenz. Kein Verein und kein Verband darf dich erneut aufstellen.',
      deces: 'Das Ereignis deiner Karriere war endgültig. Die Geschichte deines Spielers endet in diesem Moment abrupt.',
      sansClub: 'Dein Vertrag endete oder wurde aufgelöst und kein Verein wollte dich verpflichten. Ohne Team konnte die Karriere nicht weitergehen.',
      autre: 'Ein endgültiges Ereignis der Geschichte machte die Fortsetzung deiner Spielerkarriere unmöglich.',
    },
    detail: 'Das entscheidende Ereignis',
    sauvegardee: 'Deine Karriere ist gespeichert. Sie zieht nun mit allen Erfolgen in die Ruhmeshalle ein.',
    boutonHall: 'In die Ruhmeshalle eintreten', boutonManager: 'Meinen ersten Trainerposten wählen',
    age: 'Alter', saisons: 'Saisons', matchs: 'Spiele', essais: 'Versuche', titresGagnes: 'Titel', score: 'Legendenpunkte',
  },
  pt: {
    eyebrow: 'FIM DE CARREIRA',
    titres: {
      retraiteChoisie: 'Escolheste terminar a carreira', ageLimite: 'O tempo apitou para o fim',
      blessure: 'O teu corpo disse basta', radiation: 'O râguebi fechou-te as portas',
      deces: 'Uma carreira interrompida brutalmente', sansClub: 'O telefone deixou de tocar',
      autre: 'A carreira termina aqui',
    },
    raisons: {
      retraiteChoisie: 'A decisão foi tua. Deixas o campo no momento que escolheste, com todo o teu percurso intacto.',
      ageLimite: 'Atingiste o limite de idade da carreira de jogador. O jogo já não podia inscrever-te para outra época.',
      blessure: 'Os exames médicos determinaram que não podias continuar a jogar. Esta lesão termina definitivamente a tua carreira.',
      radiation: 'Uma decisão disciplinar definitiva retirou a tua licença. Nenhum clube ou federação pode voltar a utilizar-te.',
      deces: 'O acontecimento vivido era definitivo. A história do teu jogador termina abruptamente neste instante.',
      sansClub: 'O contrato terminou ou foi rescindido e nenhum clube aceitou contratar-te. Sem equipa, a carreira não podia continuar.',
      autre: 'Um acontecimento definitivo tornou impossível continuar a carreira de jogador.',
    },
    detail: 'O acontecimento decisivo',
    sauvegardee: 'A tua carreira está guardada. Vai agora entrar no Hall da Fama com todo o seu palmarés.',
    boutonHall: 'Entrar no Hall da Fama', boutonManager: 'Escolher o meu primeiro banco',
    age: 'Idade', saisons: 'Épocas', matchs: 'Jogos', essais: 'Ensaios', titresGagnes: 'Títulos', score: 'Pontuação de lenda',
  },
  ja: {
    eyebrow: '現役引退',
    titres: {
      retraiteChoisie: '自ら引退を決めた', ageLimite: '時間が試合終了を告げた',
      blessure: '身体が限界を告げた', radiation: 'ラグビー界から扉を閉ざされた',
      deces: '突然断たれたキャリア', sansClub: 'もう電話は鳴らない',
      autre: 'キャリアはここで終わる',
    },
    raisons: {
      retraiteChoisie: 'これはあなた自身の決断だ。自分で選んだ時にピッチを去り、歩んできたすべてを残す。',
      ageLimite: '選手キャリアの年齢上限に達したため、新しいシーズンへ登録できなくなった。',
      blessure: '医学的検査によりプレー続行は不可能と判断された。この負傷によりキャリアは正式に終了する。',
      radiation: '最終的な懲戒処分により選手資格を失った。今後はいかなるクラブや協会も起用できない。',
      deces: 'キャリア中に起きた出来事は取り消せないものだった。選手の物語はこの瞬間に突然終わる。',
      sansClub: '契約が終了または解除され、獲得を望むクラブがなかった。所属チームがないためキャリアを続けられない。',
      autre: '物語上の決定的な出来事により、選手キャリアを続けることが不可能になった。',
    },
    detail: '決定的な出来事',
    sauvegardee: 'キャリアは保存された。すべての実績とともに殿堂入りする。',
    boutonHall: '殿堂へ進む', boutonManager: '最初の監督先を選ぶ',
    age: '年齢', saisons: 'シーズン', matchs: '試合', essais: 'トライ', titresGagnes: 'タイトル', score: 'レジェンドスコア',
  },
};

export function texteFinCarriere(fin: FinCarriere, legende: LegendeSauvegardee) {
  const d = L[langueCourante()];
  return {
    eyebrow: d.eyebrow,
    titre: d.titres[fin.motif],
    raison: d.raisons[fin.motif],
    detailLabel: d.detail,
    sauvegardee: d.sauvegardee,
    bouton: fin.destination === 'manager' ? d.boutonManager : d.boutonHall,
    stats: [
      { emoji: '🎂', label: d.age, valeur: legende.age },
      { emoji: '📅', label: d.saisons, valeur: legende.saisons },
      { emoji: '🏉', label: d.matchs, valeur: legende.matchsJoues },
      { emoji: '🎯', label: d.essais, valeur: legende.essais },
      { emoji: '🏆', label: d.titresGagnes, valeur: legende.titres.length },
      { emoji: '⭐', label: d.score, valeur: legende.score },
    ],
  };
}
