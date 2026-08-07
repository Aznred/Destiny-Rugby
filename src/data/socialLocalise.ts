import type { Ambiance } from './social';
import { langueCourante, locale, type Langue } from '../lib/i18n';

type Reactions = { positifDebut: string[]; positifFin: string[]; negatifDebut: string[]; negatifFin: string[] };

const REACTIONS: Record<Exclude<Langue, 'fr'>, Reactions> = {
  en: {
    positifDebut: ['Great message.', 'Fully agreed.', 'That is the right attitude.', 'Keep going, {joueur}.'],
    positifFin: ['The supporters are with you. 💚', '{club} can be proud.', 'Now show it on the pitch. 🏉'],
    negatifDebut: ['Talk is cheap.', 'This is not convincing.', 'Focus on your rugby.', 'The season tells another story.'],
    negatifFin: ['Prove it on the pitch.', '{club} deserve better.', 'We will remember this post. 📌'],
  },
  es: {
    positifDebut: ['Gran mensaje.', 'Totalmente de acuerdo.', 'Esa es la actitud.', 'Sigue así, {joueur}.'],
    positifFin: ['La afición está contigo. 💚', '{club} puede estar orgulloso.', 'Ahora demuéstralo en el campo. 🏉'],
    negatifDebut: ['Hablar es fácil.', 'Esto no convence.', 'Concéntrate en tu rugby.', 'La temporada cuenta otra historia.'],
    negatifFin: ['Demuéstralo en el campo.', '{club} merece más.', 'Guardaremos esta publicación. 📌'],
  },
  it: {
    positifDebut: ['Gran bel messaggio.', 'Pienamente d’accordo.', 'Questo è l’atteggiamento giusto.', 'Continua così, {joueur}.'],
    positifFin: ['I tifosi sono con te. 💚', '{club} può essere orgoglioso.', 'Ora dimostralo in campo. 🏉'],
    negatifDebut: ['Parlare è facile.', 'Non convince.', 'Pensa al rugby.', 'La stagione racconta altro.'],
    negatifFin: ['Dimostralo in campo.', '{club} merita di più.', 'Conserveremo questo post. 📌'],
  },
  de: {
    positifDebut: ['Starke Botschaft.', 'Volle Zustimmung.', 'Das ist die richtige Einstellung.', 'Weiter so, {joueur}.'],
    positifFin: ['Die Fans stehen hinter dir. 💚', '{club} kann stolz sein.', 'Jetzt auf dem Platz zeigen. 🏉'],
    negatifDebut: ['Reden ist leicht.', 'Das überzeugt nicht.', 'Konzentriere dich aufs Rugby.', 'Die Saison erzählt etwas anderes.'],
    negatifFin: ['Beweise es auf dem Platz.', '{club} verdient mehr.', 'Diesen Beitrag merken wir uns. 📌'],
  },
  pt: {
    positifDebut: ['Grande mensagem.', 'Concordo plenamente.', 'Essa é a atitude certa.', 'Continua assim, {joueur}.'],
    positifFin: ['Os adeptos estão contigo. 💚', '{club} pode ter orgulho.', 'Agora mostra-o em campo. 🏉'],
    negatifDebut: ['Falar é fácil.', 'Isto não convence.', 'Concentra-te no râguebi.', 'A época conta outra história.'],
    negatifFin: ['Prova-o em campo.', '{club} merece mais.', 'Vamos guardar esta publicação. 📌'],
  },
  ja: {
    positifDebut: ['素晴らしいメッセージ。', '完全に同意。', 'その姿勢が大切だ。', '{joueur}、その調子。'],
    positifFin: ['サポーターは味方だ。💚', '{club}も誇りに思うはず。', '次はピッチで見せてくれ。🏉'],
    negatifDebut: ['言うだけなら簡単だ。', '説得力がない。', 'ラグビーに集中してくれ。', '今季の内容とは違う。'],
    negatifFin: ['ピッチで証明してくれ。', '{club}にはもっと必要だ。', 'この投稿は覚えておく。📌'],
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
    { type: 'media', texte: '🔁 TRANSFERS — several deals could move before the end of the week.' },
    { type: 'journaliste', texte: '{nation} are refining their squad. A few surprises are expected.' },
    { type: 'coequipier', texte: 'Hard session this morning. The legs felt it. See you Sunday. 💪' },
  ],
  es: [
    { type: 'media', texte: '📊 Clasificación de {division} actualizada. {club} sigue dando que hablar.' },
    { type: 'journaliste', texte: 'Varios clubes siguen de cerca a {joueur}. Habrá que estar atentos.' },
    { type: 'fan', texte: 'Abono renovado. ¡Vamos {club}! 💚' },
    { type: 'fan', texte: 'El estadio estaba lleno ayer. Eso es rugby.' },
    { type: 'hater', texte: '¿Alguien puede explicar por qué {joueur} sigue en la convocatoria?' },
    { type: 'media', texte: '🔁 MERCADO — varios movimientos podrían cerrarse esta semana.' },
    { type: 'journaliste', texte: '{nation} perfila su lista. Se esperan algunas sorpresas.' },
    { type: 'coequipier', texte: 'Sesión durísima esta mañana. Las piernas lo han notado. Hasta el domingo. 💪' },
  ],
  it: [
    { type: 'media', texte: '📊 Classifica di {division} aggiornata. {club} continua a far parlare.' },
    { type: 'journaliste', texte: 'Diversi club seguono da vicino {joueur}. Situazione da osservare.' },
    { type: 'fan', texte: 'Abbonamento rinnovato. Forza {club}! 💚' },
    { type: 'fan', texte: 'Stadio pieno ieri. Questo è il rugby.' },
    { type: 'hater', texte: 'Qualcuno può spiegare perché {joueur} è ancora in lista?' },
    { type: 'media', texte: '🔁 MERCATO — diversi affari possono chiudersi questa settimana.' },
    { type: 'journaliste', texte: '{nation} sta definendo la rosa. Attese alcune sorprese.' },
    { type: 'coequipier', texte: 'Seduta durissima stamattina. Le gambe si fanno sentire. A domenica. 💪' },
  ],
  de: [
    { type: 'media', texte: '📊 Tabelle der {division} aktualisiert. {club} bleibt Gesprächsthema.' },
    { type: 'journaliste', texte: 'Mehrere Vereine beobachten {joueur} genau. Das bleibt spannend.' },
    { type: 'fan', texte: 'Dauerkarte verlängert. Auf geht’s, {club}! 💚' },
    { type: 'fan', texte: 'Das Stadion war gestern voll. Das ist Rugby.' },
    { type: 'hater', texte: 'Kann jemand erklären, warum {joueur} noch im Kader steht?' },
    { type: 'media', texte: '🔁 TRANSFERS — mehrere Wechsel könnten diese Woche abgeschlossen werden.' },
    { type: 'journaliste', texte: '{nation} stellt den Kader zusammen. Überraschungen werden erwartet.' },
    { type: 'coequipier', texte: 'Harte Einheit heute Morgen. Die Beine spüren es. Bis Sonntag. 💪' },
  ],
  pt: [
    { type: 'media', texte: '📊 Classificação da {division} atualizada. {club} continua em destaque.' },
    { type: 'journaliste', texte: 'Vários clubes acompanham {joueur} de perto. Caso a seguir.' },
    { type: 'fan', texte: 'Lugar anual renovado. Vamos, {club}! 💚' },
    { type: 'fan', texte: 'O estádio estava cheio ontem. Isto é râguebi.' },
    { type: 'hater', texte: 'Alguém explica porque {joueur} continua na ficha de jogo?' },
    { type: 'media', texte: '🔁 MERCADO — vários negócios podem fechar esta semana.' },
    { type: 'journaliste', texte: '{nation} está a fechar a convocatória. Esperam-se surpresas.' },
    { type: 'coequipier', texte: 'Treino duríssimo esta manhã. As pernas sentiram. Até domingo. 💪' },
  ],
  ja: [
    { type: 'media', texte: '📊 {division}の順位表を更新。{club}への注目は続く。' },
    { type: 'journaliste', texte: '複数のクラブが{joueur}を追っているとの情報。今後に注目。' },
    { type: 'fan', texte: 'シーズンチケット更新。頑張れ{club}！💚' },
    { type: 'fan', texte: '昨日は満員だった。これこそラグビー。' },
    { type: 'hater', texte: 'なぜ{joueur}がまだメンバー入りしているのか説明してほしい。' },
    { type: 'media', texte: '🔁 移籍情報 — 今週中に複数の交渉がまとまる可能性。' },
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
