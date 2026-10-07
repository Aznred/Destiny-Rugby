import type { Traduction } from '../lib/i18n.js';

// LES TEXTES DES PROPOSITIONS DE CARTES (Correctif 26) — propositions reçues, envoyées, confirmation, retrait.
//
// ⚠️ SEPT LANGUES POUR CHAQUE CLÉ, ET LES MÊMES VARIABLES PARTOUT : `npm run verify:traductions` refuse une
// langue manquante ou une variable qui change d'une langue à l'autre.

const tr = (fr: string, en: string, es: string, it: string, de: string, pt: string, ja: string): Traduction => (
  { fr, en, es, it, de, pt, ja }
);

export const TEXTES_ECHANGES_SOLO: Record<string, Traduction> = {
  'ech.recues.titre': tr('Propositions reçues', 'Proposals received', 'Propuestas recibidas', 'Proposte ricevute', 'Erhaltene Angebote', 'Propostas recebidas', '受け取った提案'),
  'ech.recues.vide': tr('Personne ne t’a encore fait de proposition. Elles arriveront ici, quelle que soit la page de la bourse.', 'Nobody has made you a proposal yet. They will land here, whatever page of the market you are on.', 'Nadie te ha hecho una propuesta todavía. Llegarán aquí, sea cual sea la página del mercado.', 'Nessuno ti ha ancora fatto una proposta. Arriveranno qui, qualunque sia la pagina della borsa.', 'Noch hat dir niemand ein Angebot gemacht. Sie landen hier, egal auf welcher Seite der Börse du bist.', 'Ainda ninguém te fez uma proposta. Vão chegar aqui, seja qual for a página da bolsa.', 'まだ提案は届いていません。市場のどのページにいても、ここに届きます。'),
  'ech.recues.de': tr('{pseudo} te propose', '{pseudo} offers you', '{pseudo} te propone', '{pseudo} ti propone', '{pseudo} bietet dir', '{pseudo} propõe-te', '{pseudo} からの提案'),
  'ech.recues.contre': tr('Contre ton offre', 'For your offer', 'A cambio de tu oferta', 'In cambio della tua offerta', 'Für dein Angebot', 'Em troca da tua oferta', 'あなたの出品と交換'),
  'ech.envoyees.titre': tr('Mes propositions envoyées', 'My proposals sent', 'Mis propuestas enviadas', 'Le mie proposte inviate', 'Meine gesendeten Angebote', 'As minhas propostas enviadas', '送った提案'),
  'ech.envoyees.vide': tr('Aucune proposition en attente.', 'No proposal pending.', 'Ninguna propuesta pendiente.', 'Nessuna proposta in attesa.', 'Kein Angebot ausstehend.', 'Nenhuma proposta pendente.', '保留中の提案はありません。'),
  'ech.envoyees.a': tr('À {pseudo} · je propose', 'To {pseudo} · I offer', 'A {pseudo} · propongo', 'A {pseudo} · propongo', 'An {pseudo} · ich biete', 'A {pseudo} · proponho', '{pseudo} へ · 自分の提案'),
  'ech.envoyees.contre': tr('Contre ses cartes', 'For their cards', 'A cambio de sus cartas', 'In cambio delle sue carte', 'Für diese Karten', 'Em troca das cartas dele', '相手のカードと交換'),
  'ech.attente': tr('En attente de réponse', 'Awaiting a reply', 'A la espera de respuesta', 'In attesa di risposta', 'Wartet auf Antwort', 'A aguardar resposta', '返答待ち'),
  'ech.retirer': tr('Retirer ma proposition', 'Withdraw my proposal', 'Retirar mi propuesta', 'Ritira la mia proposta', 'Mein Angebot zurückziehen', 'Retirar a minha proposta', '提案を取り下げる'),
  'ech.dejaProposee': tr('Proposition envoyée · en attente de {pseudo}', 'Proposal sent · waiting for {pseudo}', 'Propuesta enviada · esperando a {pseudo}', 'Proposta inviata · in attesa di {pseudo}', 'Angebot gesendet · wartet auf {pseudo}', 'Proposta enviada · à espera de {pseudo}', '提案を送信済み · {pseudo} の返答待ち'),
  'ech.composer.titre': tr('Ta proposition à {pseudo}', 'Your proposal to {pseudo}', 'Tu propuesta a {pseudo}', 'La tua proposta a {pseudo}', 'Dein Angebot an {pseudo}', 'A tua proposta a {pseudo}', '{pseudo} への提案'),
  'ech.composer.jePropose': tr('Je propose', 'I offer', 'Propongo', 'Propongo', 'Ich biete', 'Proponho', '自分が出すカード'),
  'ech.composer.jeRecois': tr('Je reçois si {pseudo} accepte', 'I receive if {pseudo} accepts', 'Recibo si {pseudo} acepta', 'Ricevo se {pseudo} accetta', 'Ich erhalte, wenn {pseudo} annimmt', 'Recebo se {pseudo} aceitar', '{pseudo} が承諾すれば受け取るカード'),
  'ech.composer.aide': tr('Tes cartes restent dans ta collection tant que {pseudo} n’a pas accepté.', 'Your cards stay in your collection until {pseudo} accepts.', 'Tus cartas siguen en tu colección hasta que {pseudo} acepte.', 'Le tue carte restano nella tua collezione finché {pseudo} non accetta.', 'Deine Karten bleiben in deiner Sammlung, bis {pseudo} annimmt.', 'As tuas cartas ficam na tua coleção até {pseudo} aceitar.', '{pseudo} が承諾するまで、カードはあなたのコレクションに残ります。'),
  'ech.composer.confirmer': tr('Envoyer la proposition', 'Send the proposal', 'Enviar la propuesta', 'Invia la proposta', 'Angebot senden', 'Enviar a proposta', '提案を送る'),
  'ech.composer.annuler': tr('Annuler', 'Cancel', 'Cancelar', 'Annulla', 'Abbrechen', 'Cancelar', 'キャンセル'),
  'ech.composer.vide': tr('Ajoute une ou plusieurs cartes.', 'Add one or more cards.', 'Añade una o varias cartas.', 'Aggiungi una o più carte.', 'Füge eine oder mehrere Karten hinzu.', 'Adiciona uma ou várias cartas.', 'カードを1枚以上追加してください。'),
  'ech.engagee': tr('Déjà promise dans une autre proposition.', 'Already promised in another proposal.', 'Ya prometida en otra propuesta.', 'Già promessa in un’altra proposta.', 'Bereits in einem anderen Angebot zugesagt.', 'Já prometida noutra proposta.', '別の提案で使用中です。'),
  'ech.fait.tradeCreated': tr('Offre publiée.', 'Offer published.', 'Oferta publicada.', 'Offerta pubblicata.', 'Angebot veröffentlicht.', 'Oferta publicada.', '出品しました。'),
  'ech.fait.tradeProposed': tr('Proposition envoyée.', 'Proposal sent.', 'Propuesta enviada.', 'Proposta inviata.', 'Angebot gesendet.', 'Proposta enviada.', '提案を送りました。'),
  'ech.fait.tradeAccepted': tr('Échange conclu : ta collection est à jour.', 'Trade completed: your collection is up to date.', 'Intercambio cerrado: tu colección está al día.', 'Scambio concluso: la tua collezione è aggiornata.', 'Tausch abgeschlossen: deine Sammlung ist aktuell.', 'Troca concluída: a tua coleção está atualizada.', '交換成立。コレクションを更新しました。'),
  'ech.fait.tradeRefused': tr('Proposition refusée.', 'Proposal declined.', 'Propuesta rechazada.', 'Proposta rifiutata.', 'Angebot abgelehnt.', 'Proposta recusada.', '提案を断りました。'),
  'ech.fait.tradeCancelled': tr('Offre retirée : tes cartes sont revenues.', 'Offer withdrawn: your cards are back.', 'Oferta retirada: tus cartas han vuelto.', 'Offerta ritirata: le tue carte sono tornate.', 'Angebot zurückgezogen: deine Karten sind zurück.', 'Oferta retirada: as tuas cartas voltaram.', '出品を取り下げ、カードが戻りました。'),
  'ech.fait.tradeWithdrawn': tr('Proposition retirée.', 'Proposal withdrawn.', 'Propuesta retirada.', 'Proposta ritirata.', 'Angebot zurückgezogen.', 'Proposta retirada.', '提案を取り下げました。'),
  'ech.vide.offre': tr('Aucune carte', 'No card', 'Ninguna carta', 'Nessuna carta', 'Keine Karte', 'Nenhuma carta', 'カードなし'),
  'ech.vide.libre': tr('Libre à toutes les propositions', 'Open to any proposal', 'Abierta a cualquier propuesta', 'Aperta a qualsiasi proposta', 'Offen für jedes Angebot', 'Aberta a qualquer proposta', 'どんな提案も歓迎'),
  'ech.vide.don': tr('Choisis au moins un doublon.', 'Pick at least one duplicate.', 'Elige al menos un repetido.', 'Scegli almeno un doppione.', 'Wähle mindestens ein Duplikat.', 'Escolhe pelo menos um repetido.', 'ダブりを1枚以上選んでください。'),
  'ech.vide.souhait': tr('Choisis les cartes voulues.', 'Pick the cards you want.', 'Elige las cartas que quieres.', 'Scegli le carte che vuoi.', 'Wähle die gewünschten Karten.', 'Escolhe as cartas que queres.', '欲しいカードを選んでください。'),
  'ech.vide.recherche': tr('Aucun doublon ne correspond à cette recherche.', 'No duplicate matches this search.', 'Ningún repetido coincide con esta búsqueda.', 'Nessun doppione corrisponde a questa ricerca.', 'Kein Duplikat passt zu dieser Suche.', 'Nenhum repetido corresponde a esta pesquisa.', '該当するダブりがありません。'),
  'ech.erreur': tr('Échange indisponible pour le moment.', 'Trading is unavailable right now.', 'Intercambio no disponible por ahora.', 'Scambio non disponibile al momento.', 'Tausch derzeit nicht verfügbar.', 'Troca indisponível de momento.', '現在、交換は利用できません。'),
};
