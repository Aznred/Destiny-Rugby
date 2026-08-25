import type { Ambiance } from './social';
import { langueCourante, locale, type Langue } from '../lib/i18n';
import type { SanctionSociale as SanctionEmbrouille } from '../lib/disciplineSociale';

type Reactions = { positifDebut: string[]; positifFin: string[]; negatifDebut: string[]; negatifFin: string[] };

const REACTIONS: Record<Exclude<Langue, 'fr'>, Reactions> = {
  en: {
    positifDebut: ['Great message.', 'Fully agreed.', 'That is the right attitude.', 'Keep going, {joueur}.'],
    positifFin: ['The supporters are with you. 💚', '{club} can be proud.', 'Now show it on the pitch. 🏉'],
    negatifDebut: ['Talk is cheap.', 'Sit down, clown.', 'Shut up and look at your stats.', 'Your rugby is as empty as this post.'],
    negatifFin: ['Prove it on the pitch, loser.', '{club} deserve better than this rubbish.', 'We saved the screenshot, idiot. 📌'],
  },
  es: {
    positifDebut: ['Gran mensaje.', 'Totalmente de acuerdo.', 'Esa es la actitud.', 'Sigue así, {joueur}.'],
    positifFin: ['La afición está contigo. 💚', '{club} puede estar orgulloso.', 'Ahora demuéstralo en el campo. 🏉'],
    negatifDebut: ['Hablar es fácil.', 'Siéntate, payaso.', 'Cállate y mira tus números.', 'Tu rugby está tan vacío como este mensaje.'],
    negatifFin: ['Demuéstralo en el campo, inútil.', '{club} merece más que esta basura.', 'Captura guardada, idiota. 📌'],
  },
  it: {
    positifDebut: ['Gran bel messaggio.', 'Pienamente d’accordo.', 'Questo è l’atteggiamento giusto.', 'Continua così, {joueur}.'],
    positifFin: ['I tifosi sono con te. 💚', '{club} può essere orgoglioso.', 'Ora dimostralo in campo. 🏉'],
    negatifDebut: ['Parlare è facile.', 'Siediti, pagliaccio.', 'Stai zitto e guarda le tue statistiche.', 'Il tuo rugby è vuoto come questo post.'],
    negatifFin: ['Dimostralo in campo, scarso.', '{club} merita più di questa spazzatura.', 'Screenshot salvato, idiota. 📌'],
  },
  de: {
    positifDebut: ['Starke Botschaft.', 'Volle Zustimmung.', 'Das ist die richtige Einstellung.', 'Weiter so, {joueur}.'],
    positifFin: ['Die Fans stehen hinter dir. 💚', '{club} kann stolz sein.', 'Jetzt auf dem Platz zeigen. 🏉'],
    negatifDebut: ['Reden ist leicht.', 'Setz dich, Clown.', 'Halt die Klappe und sieh dir deine Zahlen an.', 'Dein Rugby ist so leer wie dieser Beitrag.'],
    negatifFin: ['Beweise es auf dem Platz, Versager.', '{club} verdient mehr als diesen Müll.', 'Screenshot gespeichert, Idiot. 📌'],
  },
  pt: {
    positifDebut: ['Grande mensagem.', 'Concordo plenamente.', 'Essa é a atitude certa.', 'Continua assim, {joueur}.'],
    positifFin: ['Os adeptos estão contigo. 💚', '{club} pode ter orgulho.', 'Agora mostra-o em campo. 🏉'],
    negatifDebut: ['Falar é fácil.', 'Senta-te, palhaço.', 'Cala a boca e olha para os teus números.', 'O teu râguebi é tão vazio como esta publicação.'],
    negatifFin: ['Prova-o em campo, inútil.', '{club} merece mais do que este lixo.', 'Captura guardada, idiota. 📌'],
  },
  ja: {
    positifDebut: ['素晴らしいメッセージ。', '完全に同意。', 'その姿勢が大切だ。', '{joueur}、その調子。'],
    positifFin: ['サポーターは味方だ。💚', '{club}も誇りに思うはず。', '次はピッチで見せてくれ。🏉'],
    negatifDebut: ['言うだけなら簡単だ。', '座ってろ、ピエロ。', '黙って自分の数字を見ろ。', 'お前のラグビーはこの投稿と同じくらい空っぽだ。'],
    negatifFin: ['ピッチで証明しろ、下手くそ。', '{club}はこんなクソ投稿より上だ。', 'スクショ保存したぞ、馬鹿。📌'],
  },
};

export function reponsesSocialesTraduites(hostile: boolean): string[] | null {
  const langue = langueCourante();
  if (langue === 'fr') return null;
  const r = REACTIONS[langue];
  const debuts = hostile ? r.negatifDebut : r.positifDebut;
  const fins = hostile ? r.negatifFin : r.positifFin;
  return debuts.flatMap((debut) => fins.map((fin) => `${debut} ${fin}`));
}

const AMBIANCES: Record<Exclude<Langue, 'fr'>, Ambiance[]> = {
  en: [
    { type: 'media', texte: '📊 {division} standings updated. {club} remain one of the talking points.' },
    { type: 'journaliste', texte: 'Several clubs are reportedly monitoring {joueur}. One to watch.' },
    { type: 'fan', texte: 'Season ticket renewed. Come on {club}! 💚' },
    { type: 'fan', texte: 'The stadium was full yesterday. That is what rugby is about.' },
    { type: 'hater', texte: 'Can someone explain why {joueur} is still on the team sheet?' },
    { type: 'media', texte: '🔁 TRANSFERS, several deals could move before the end of the week.' },
    { type: 'journaliste', texte: '{nation} are refining their squad. A few surprises are expected.' },
    { type: 'coequipier', texte: 'Hard session this morning. The legs felt it. See you Sunday. 💪' },
  ],
  es: [
    { type: 'media', texte: '📊 Clasificación de {division} actualizada. {club} sigue dando que hablar.' },
    { type: 'journaliste', texte: 'Varios clubes siguen de cerca a {joueur}. Habrá que estar atentos.' },
    { type: 'fan', texte: 'Abono renovado. ¡Vamos {club}! 💚' },
    { type: 'fan', texte: 'El estadio estaba lleno ayer. Eso es rugby.' },
    { type: 'hater', texte: '¿Alguien puede explicar por qué {joueur} sigue en la convocatoria?' },
    { type: 'media', texte: '🔁 MERCADO, varios movimientos podrían cerrarse esta semana.' },
    { type: 'journaliste', texte: '{nation} perfila su lista. Se esperan algunas sorpresas.' },
    { type: 'coequipier', texte: 'Sesión durísima esta mañana. Las piernas lo han notado. Hasta el domingo. 💪' },
  ],
  it: [
    { type: 'media', texte: '📊 Classifica di {division} aggiornata. {club} continua a far parlare.' },
    { type: 'journaliste', texte: 'Diversi club seguono da vicino {joueur}. Situazione da osservare.' },
    { type: 'fan', texte: 'Abbonamento rinnovato. Forza {club}! 💚' },
    { type: 'fan', texte: 'Stadio pieno ieri. Questo è il rugby.' },
    { type: 'hater', texte: 'Qualcuno può spiegare perché {joueur} è ancora in lista?' },
    { type: 'media', texte: '🔁 MERCATO, diversi affari possono chiudersi questa settimana.' },
    { type: 'journaliste', texte: '{nation} sta definendo la rosa. Attese alcune sorprese.' },
    { type: 'coequipier', texte: 'Seduta durissima stamattina. Le gambe si fanno sentire. A domenica. 💪' },
  ],
  de: [
    { type: 'media', texte: '📊 Tabelle der {division} aktualisiert. {club} bleibt Gesprächsthema.' },
    { type: 'journaliste', texte: 'Mehrere Vereine beobachten {joueur} genau. Das bleibt spannend.' },
    { type: 'fan', texte: 'Dauerkarte verlängert. Auf geht’s, {club}! 💚' },
    { type: 'fan', texte: 'Das Stadion war gestern voll. Das ist Rugby.' },
    { type: 'hater', texte: 'Kann jemand erklären, warum {joueur} noch im Kader steht?' },
    { type: 'media', texte: '🔁 TRANSFERS, mehrere Wechsel könnten diese Woche abgeschlossen werden.' },
    { type: 'journaliste', texte: '{nation} stellt den Kader zusammen. Überraschungen werden erwartet.' },
    { type: 'coequipier', texte: 'Harte Einheit heute Morgen. Die Beine spüren es. Bis Sonntag. 💪' },
  ],
  pt: [
    { type: 'media', texte: '📊 Classificação da {division} atualizada. {club} continua em destaque.' },
    { type: 'journaliste', texte: 'Vários clubes acompanham {joueur} de perto. Caso a seguir.' },
    { type: 'fan', texte: 'Lugar anual renovado. Vamos, {club}! 💚' },
    { type: 'fan', texte: 'O estádio estava cheio ontem. Isto é râguebi.' },
    { type: 'hater', texte: 'Alguém explica porque {joueur} continua na ficha de jogo?' },
    { type: 'media', texte: '🔁 MERCADO, vários negócios podem fechar esta semana.' },
    { type: 'journaliste', texte: '{nation} está a fechar a convocatória. Esperam-se surpresas.' },
    { type: 'coequipier', texte: 'Treino duríssimo esta manhã. As pernas sentiram. Até domingo. 💪' },
  ],
  ja: [
    { type: 'media', texte: '📊 {division}の順位表を更新。{club}への注目は続く。' },
    { type: 'journaliste', texte: '複数のクラブが{joueur}を追っているとの情報。今後に注目。' },
    { type: 'fan', texte: 'シーズンチケット更新。頑張れ{club}！💚' },
    { type: 'fan', texte: '昨日は満員だった。これこそラグビー。' },
    { type: 'hater', texte: 'なぜ{joueur}がまだメンバー入りしているのか説明してほしい。' },
    { type: 'media', texte: '🔁 移籍情報、今週中に複数の交渉がまとまる可能性。' },
    { type: 'journaliste', texte: '{nation}が代表候補を絞り込み中。サプライズもありそうだ。' },
    { type: 'coequipier', texte: '今朝はハードな練習。脚にきた。日曜に会おう。💪' },
  ],
};

export function ambiancesSocialesTraduites(): Ambiance[] | null {
  const langue = langueCourante();
  return langue === 'fr' ? null : AMBIANCES[langue];
}

export function sanctionSociale(
  joueur: { club: string }, amende: number, grossier: boolean,
): { titre: string; texte: string } | null {
  const langue = langueCourante();
  if (langue === 'fr') return null;
  const montant = amende.toLocaleString(locale(langue));
  const donnees: Record<Exclude<Langue, 'fr'>, { titre: string; grossier: string; simple: string }> = {
    en: { titre: '⚠️ Summoned by the club', grossier: `Your post went around the league. ${joueur.club} fine you €${montant} and remind you what the shirt represents.`, simple: `${joueur.club}'s media staff did not appreciate it. Internal fine of €${montant} and a cold meeting with the coaches.` },
    es: { titre: '⚠️ Citado por el club', grossier: `Tu mensaje recorrió la liga. ${joueur.club} te multa con ${montant} € y te recuerda lo que representa la camiseta.`, simple: `Al departamento de comunicación de ${joueur.club} no le gustó. Multa interna de ${montant} € y charla muy fría con el cuerpo técnico.` },
    it: { titre: '⚠️ Convocato dal club', grossier: `Il messaggio ha fatto il giro del campionato. ${joueur.club} ti multa di ${montant} € e ti ricorda cosa rappresenta la maglia.`, simple: `La comunicazione di ${joueur.club} non ha gradito. Multa interna di ${montant} € e colloquio gelido con lo staff.` },
    de: { titre: '⚠️ Vom Verein einbestellt', grossier: `Der Beitrag machte in der Liga die Runde. ${joueur.club} verhängt ${montant} € Strafe und erinnert dich daran, wofür das Trikot steht.`, simple: `Die Medienabteilung von ${joueur.club} war nicht begeistert. ${montant} € interne Strafe und ein frostiges Gespräch mit dem Trainerteam.` },
    pt: { titre: '⚠️ Chamado pelo clube', grossier: `A mensagem correu o campeonato. ${joueur.club} aplica uma multa de ${montant} € e recorda-te o que a camisola representa.`, simple: `A comunicação de ${joueur.club} não gostou. Multa interna de ${montant} € e conversa muito fria com a equipa técnica.` },
    ja: { titre: '⚠️ クラブから呼び出し', grossier: `投稿がリーグ中に広まった。${joueur.club}は${montant}ユーロの罰金を科し、ジャージの意味を再確認させた。`, simple: `${joueur.club}の広報は不快感を示した。${montant}ユーロの内部罰金とスタッフとの厳しい面談。` },
  };
  const d = donnees[langue];
  return { titre: d.titre, texte: grossier ? d.grossier : d.simple };
}

/** Texte complet des sanctions graduées, dans les sept langues du jeu. */
export function sanctionEmbrouilleSociale(
  joueur: { club: string }, sanction: SanctionEmbrouille,
): { titre: string; texte: string } {
  const langue = langueCourante();
  const montant = sanction.amende.toLocaleString(locale(langue));
  const semaines = sanction.semaines;
  const fuite = sanction.fuite;

  const fr = {
    avertissement: ['⚠️ Recadrage du club', `${fuite ? 'Une capture de la discussion privée a fuité.' : 'Le clash public est arrivé au staff.'} ${joueur.club} te donne un avertissement officiel : la prochaine sortie coûtera ta place.`],
    amende: ['💸 Amende interne', `${fuite ? 'La capture privée tourne sur L’Ovale.' : 'L’embrouille publique a fait le tour du club.'} ${joueur.club} te sanctionne de ${montant} € et ta relation avec le staff se dégrade.`],
    banc: ['🪑 Mis sur le banc', `${joueur.club} te sanctionne après ${fuite ? 'la fuite de tes messages' : 'ton clash public'} : ${montant} € d’amende et ${semaines} semaine${semaines > 1 ? 's' : ''} comme remplaçant imposé.`],
    suspension: ['⛔ Suspendu par le club', `${joueur.club} juge l’altercation intenable : ${montant} € d’amende et ${semaines} semaine${semaines > 1 ? 's' : ''} de suspension. Tu ne peux plus être aligné.`],
    exclusion: ['📄 Contrat rompu', `${joueur.club} met fin à ton contrat après cette nouvelle embrouille. Tu es exclu du club et replacé immédiatement sur le marché.`],
  } as const;

  const traductions: Record<Exclude<Langue, 'fr'>, Record<SanctionEmbrouille['niveau'], readonly [string, string]>> = {
    en: {
      avertissement: ['⚠️ Formal club warning', `${fuite ? 'A screenshot of the private chat leaked.' : 'The public row reached the coaches.'} ${joueur.club} issue a formal warning: the next outburst could cost your place.`],
      amende: ['💸 Internal fine', `${fuite ? 'The private screenshot is spreading on L’Ovale.' : 'The public row went around the club.'} ${joueur.club} fine you €${montant} and the coaches lose trust in you.`],
      banc: ['🪑 Dropped to the bench', `${joueur.club} punish ${fuite ? 'the leaked messages' : 'your public row'}: a €${montant} fine and ${semaines} week${semaines > 1 ? 's' : ''} as a forced substitute.`],
      suspension: ['⛔ Suspended by the club', `${joueur.club} rule the row unacceptable: a €${montant} fine and a ${semaines}-week suspension. You cannot be selected.`],
      exclusion: ['📄 Contract terminated', `${joueur.club} terminate your contract after another row. You are expelled from the club and immediately placed on the market.`],
    },
    es: {
      avertissement: ['⚠️ Advertencia del club', `${fuite ? 'Se filtró una captura de la conversación privada.' : 'La pelea pública llegó al cuerpo técnico.'} ${joueur.club} te da un aviso oficial: la próxima salida puede costarte el puesto.`],
      amende: ['💸 Multa interna', `${fuite ? 'La captura privada circula por L’Ovale.' : 'La pelea pública recorrió el club.'} ${joueur.club} te multa con ${montant} € y el cuerpo técnico pierde confianza en ti.`],
      banc: ['🪑 Al banquillo', `${joueur.club} te sanciona por ${fuite ? 'los mensajes filtrados' : 'la pelea pública'}: ${montant} € y ${semaines} semana${semaines > 1 ? 's' : ''} como suplente obligado.`],
      suspension: ['⛔ Suspendido por el club', `${joueur.club} considera intolerable la pelea: ${montant} € y ${semaines} semana${semaines > 1 ? 's' : ''} de suspensión. No puedes jugar.`],
      exclusion: ['📄 Contrato rescindido', `${joueur.club} rescinde tu contrato tras otra pelea. Quedas expulsado del club y vuelves inmediatamente al mercado.`],
    },
    it: {
      avertissement: ['⚠️ Richiamo ufficiale', `${fuite ? 'È trapelato uno screenshot della chat privata.' : 'La lite pubblica è arrivata allo staff.'} ${joueur.club} ti richiama ufficialmente: la prossima uscita può costarti il posto.`],
      amende: ['💸 Multa interna', `${fuite ? 'Lo screenshot privato gira su L’Ovale.' : 'La lite pubblica ha fatto il giro del club.'} ${joueur.club} ti multa di ${montant} € e lo staff perde fiducia.`],
      banc: ['🪑 Mandato in panchina', `${joueur.club} ti punisce per ${fuite ? 'i messaggi trapelati' : 'la lite pubblica'}: ${montant} € e ${semaines} settiman${semaines > 1 ? 'e' : 'a'} da riserva obbligata.`],
      suspension: ['⛔ Sospeso dal club', `${joueur.club} giudica intollerabile la lite: ${montant} € e ${semaines} settiman${semaines > 1 ? 'e' : 'a'} di sospensione. Non puoi giocare.`],
      exclusion: ['📄 Contratto risolto', `${joueur.club} risolve il contratto dopo l’ennesima lite. Sei escluso dal club e torni subito sul mercato.`],
    },
    de: {
      avertissement: ['⚠️ Offizielle Verwarnung', `${fuite ? 'Ein Screenshot des privaten Chats wurde geleakt.' : 'Der öffentliche Streit erreichte den Trainerstab.'} ${joueur.club} verwarnt dich offiziell: Der nächste Ausbruch kann deinen Platz kosten.`],
      amende: ['💸 Vereinsstrafe', `${fuite ? 'Der private Screenshot kursiert auf L’Ovale.' : 'Der öffentliche Streit machte im Verein die Runde.'} ${joueur.club} verhängt ${montant} € Strafe und der Stab verliert Vertrauen.`],
      banc: ['🪑 Auf die Bank gesetzt', `${joueur.club} bestraft ${fuite ? 'die geleakten Nachrichten' : 'deinen öffentlichen Streit'}: ${montant} € und ${semaines} Woche${semaines > 1 ? 'n' : ''} als erzwungener Ersatzspieler.`],
      suspension: ['⛔ Vom Verein suspendiert', `${joueur.club} hält den Streit für untragbar: ${montant} € und ${semaines} Woche${semaines > 1 ? 'n' : ''} Sperre. Du darfst nicht eingesetzt werden.`],
      exclusion: ['📄 Vertrag aufgelöst', `${joueur.club} löst deinen Vertrag nach dem erneuten Streit auf. Du wirst ausgeschlossen und sofort auf den Markt gesetzt.`],
    },
    pt: {
      avertissement: ['⚠️ Advertência do clube', `${fuite ? 'Foi divulgada uma captura da conversa privada.' : 'A discussão pública chegou à equipa técnica.'} ${joueur.club} dá-te um aviso oficial: a próxima saída pode custar o teu lugar.`],
      amende: ['💸 Multa interna', `${fuite ? 'A captura privada circula no L’Ovale.' : 'A discussão pública percorreu o clube.'} ${joueur.club} multa-te em ${montant} € e a equipa técnica perde confiança.`],
      banc: ['🪑 Mandado para o banco', `${joueur.club} pune ${fuite ? 'as mensagens divulgadas' : 'a discussão pública'}: ${montant} € e ${semaines} semana${semaines > 1 ? 's' : ''} como suplente obrigatório.`],
      suspension: ['⛔ Suspenso pelo clube', `${joueur.club} considera a discussão intolerável: ${montant} € e ${semaines} semana${semaines > 1 ? 's' : ''} de suspensão. Não podes jogar.`],
      exclusion: ['📄 Contrato rescindido', `${joueur.club} rescinde o contrato após nova discussão. És expulso do clube e colocado imediatamente no mercado.`],
    },
    ja: {
      avertissement: ['⚠️ クラブからの正式警告', `${fuite ? '非公開チャットのスクリーンショットが流出した。' : '公開口論がスタッフに届いた。'}${joueur.club}は正式警告を出した。次の問題行動ではポジションを失う。`],
      amende: ['💸 クラブ内罰金', `${fuite ? '非公開のスクリーンショットがL’Ovaleで拡散中。' : '公開口論がクラブ中に広まった。'}${joueur.club}は${montant}ユーロの罰金を科し、スタッフの信頼も低下した。`],
      banc: ['🪑 ベンチ降格', `${joueur.club}は${fuite ? '流出メッセージ' : '公開口論'}を処分。${montant}ユーロの罰金と${semaines}週間の強制ベンチスタート。`],
      suspension: ['⛔ クラブから出場停止', `${joueur.club}は口論を看過できないと判断。${montant}ユーロの罰金と${semaines}週間の出場停止で、試合には出られない。`],
      exclusion: ['📄 契約解除', `${joueur.club}は度重なる口論を理由に契約を解除。クラブを追放され、直ちに移籍市場へ戻る。`],
    },
  };

  const ligne = langue === 'fr' ? fr[sanction.niveau] : traductions[langue][sanction.niveau];
  return { titre: ligne[0], texte: ligne[1] };
}

export function miseAuBancSociale(semaines: number): { titre: string; texte: string } {
  const langue = langueCourante();
  const lignes: Record<Langue, [string, string]> = {
    fr: ['Sanction interne', `Remplaçant imposé pendant ${semaines} semaine${semaines > 1 ? 's' : ''}`],
    en: ['Internal sanction', `Forced substitute for ${semaines} week${semaines > 1 ? 's' : ''}`],
    es: ['Sanción interna', `Suplente obligado durante ${semaines} semana${semaines > 1 ? 's' : ''}`],
    it: ['Sanzione interna', `Riserva obbligata per ${semaines} settiman${semaines > 1 ? 'e' : 'a'}`],
    de: ['Interne Sanktion', `Für ${semaines} Woche${semaines > 1 ? 'n' : ''} als Ersatzspieler gesetzt`],
    pt: ['Sanção interna', `Suplente obrigatório durante ${semaines} semana${semaines > 1 ? 's' : ''}`],
    ja: ['クラブ内処分', `${semaines}週間、強制的にベンチスタート`],
  };
  return { titre: lignes[langue][0], texte: lignes[langue][1] };
}
