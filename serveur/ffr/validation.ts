import { classifierFfr } from './classification.js';
import type { ProfilFfr } from './classification.js';
export function editionProfil(p: ProfilFfr, edit: Record<string, unknown> = {}): ProfilFfr {
  // Identity, sex, age and category cannot be changed through the publication editor.
  const raw = { ...p.raw };
  for (const [field, max] of [['club',150],['competition',180],['position',40]] as const) {
    if (edit[field] !== undefined) {
      if (typeof edit[field] !== 'string' || !edit[field].trim() || edit[field].length>max) throw new Error('Champ invalide.');
      raw[field]=edit[field].trim();
    }
  }
  if(edit.photo!==undefined){
    if(typeof edit.photo!=='string'||edit.photo.length>2000||!(/^(https:\/\/|\/photos\/)/.test(edit.photo)||edit.photo===''))throw new Error('Photo invalide.');
    raw.photo=edit.photo;
  }
  const next=classifierFfr(raw);
  for(const field of ['overall','potential'] as const) if(edit[field]!==undefined){
    if(!Number.isInteger(edit[field])||Number(edit[field])<1||Number(edit[field])>99)throw new Error('Note invalide.');
    next[field]=Number(edit[field]);
  }
  if(next.overall!==null&&next.potential!==null&&next.potential<next.overall)throw new Error('Le potentiel doit être supérieur ou égal au GEN.');
  next.duplicate=p.duplicate;
  if(edit.duplicateResolution==='DISTINCT'){
    if(typeof edit.duplicateEvidence!=='string'||edit.duplicateEvidence.trim().length<12||edit.duplicateEvidence.length>1000)
      throw new Error('Documentez les preuves de cette identité distincte.');
    next.duplicate=false;
  }
  return next;
}
export function exigerPublication(p: ProfilFfr) {
  if(p.senior_status!=='senior'||p.usage==='YOUTH_REGEN_SOURCE'||p.card_status!=='ACTIVE_CARD'||p.duplicate)
    throw new Error('Ce profil ne remplit pas les critères senior. Les doublons doivent être résolus avant approbation.');
}
