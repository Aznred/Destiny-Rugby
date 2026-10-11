import type { Traduction } from '../lib/i18n';
const tr=(fr:string,en:string,es:string,it:string,de:string,pt:string,ja:string):Traduction=>({fr,en,es,it,de,pt,ja});
export const TEXTES_VALIDATION_CLASSEMENT: Record<string,Traduction> = {
  'cl38.ELIGIBLE':tr('Classée','Ranked','Clasificada','In classifica','Gewertet','Classificada','ランキング対象'),
  'cl38.LIMITED':tr('Provisoire · sous contrôle','Provisional · monitored','Provisional · supervisada','Provvisoria · monitorata','Vorläufig · geprüft','Provisória · monitorizada','暫定・確認中'),
  'cl38.PENDING_VALIDATION':tr('Classement en cours de validation','Ranking under validation','Clasificación en validación','Classifica in verifica','Rangliste wird geprüft','Classificação em validação','ランキング確認中'),
  'cl38.REJECTED':tr('Classement refusé','Ranking rejected','Clasificación rechazada','Classifica rifiutata','Wertung abgelehnt','Classificação recusada','ランキング対象外'),
  'cl38.provisoire':tr('Provisoire','Provisional','Provisional','Provvisoria','Vorläufig','Provisória','暫定'),
  'cl38.attente':tr('La prochaine synchronisation complétera la vérification.','The next sync will complete validation.','La próxima sincronización completará la validación.','La prossima sincronizzazione completerà la verifica.','Die nächste Synchronisierung vervollständigt die Prüfung.','A próxima sincronização completará a validação.','次の同期で確認が進みます。'),
  'cl38.refusAide':tr('Ta carrière reste intacte. Une nouvelle synchronisation vérifiera les données corrigées.','Your career is intact. The next sync will check corrected data.','Tu carrera sigue intacta. La próxima sincronización comprobará los datos corregidos.','La carriera resta intatta. La prossima sincronizzazione verificherà i dati corretti.','Deine Karriere bleibt erhalten. Die nächste Synchronisierung prüft korrigierte Daten.','A tua carreira fica intacta. A próxima sincronização verificará os dados corrigidos.','キャリアは保護されています。次の同期で修正データを確認します。'),
  'cl38.details':tr('Voir la vérification','View validation','Ver validación','Vedi verifica','Prüfung ansehen','Ver validação','確認内容'),
  'cl38.risque':tr('Score de risque : {score}/100','Risk score: {score}/100','Riesgo: {score}/100','Rischio: {score}/100','Risiko: {score}/100','Risco: {score}/100','リスク：{score}/100'),
  'cl38.recompenses':tr('Récompenses compétitives en attente de validation.','Competitive rewards await validation.','Premios competitivos pendientes de validación.','Premi competitivi in attesa di verifica.','Wettbewerbsbelohnungen warten auf Prüfung.','Prémios competitivos aguardam validação.','競技報酬は確認待ちです。'),
  'cl38.synchroniser':tr('Synchroniser maintenant','Sync now','Sincronizar ahora','Sincronizza ora','Jetzt synchronisieren','Sincronizar agora','今すぐ同期'),
  'cl38.labo':tr('Classement en ligne — Validation','Online ranking — Validation','Clasificación online — Validación','Classifica online — Verifica','Online-Rangliste — Prüfung','Classificação online — Validação','オンラインランキング・確認'),
  'cl38.valider':tr('Valider','Approve','Validar','Approva','Bestätigen','Validar','承認'),
  'cl38.refuser':tr('Refuser','Reject','Rechazar','Rifiuta','Ablehnen','Recusar','拒否'),
  'cl38.reinitialiser':tr('Réinitialiser la vérification','Reset validation','Restablecer validación','Reimposta verifica','Prüfung zurücksetzen','Reiniciar validação','確認をリセット'),
  'cl38.actualiser':tr('Actualiser','Refresh','Actualizar','Aggiorna','Aktualisieren','Atualizar','更新'),
  'cl38.revalider':tr('Revalider les carrières enregistrées','Revalidate saved careers','Revalidar carreras guardadas','Verifica le carriere salvate','Gespeicherte Karrieren erneut prüfen','Revalidar carreiras guardadas','保存済みキャリアを再確認'),
  'cl38.vide':tr('Aucune carrière pour ce filtre.','No careers match this filter.','No hay carreras para este filtro.','Nessuna carriera per questo filtro.','Keine Karriere entspricht dem Filter.','Nenhuma carreira para este filtro.','該当するキャリアはありません。'),
  'cl38.filtre':tr('Filtrer la validation','Filter validation','Filtrar validación','Filtra verifica','Prüfung filtern','Filtrar validação','確認を絞り込む'),
};
