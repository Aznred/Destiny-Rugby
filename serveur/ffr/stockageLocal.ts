// Development-only indexed data. Never import this module from Vercel.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { filtreSource, vueSource } from './stockage.js';
import type { StockageJoueurs } from './stockage.js';
import type { ProfilFfr } from './classification.js';
import { editionProfil, exigerPublication } from './validation.js';
import { filtreJeunesCarriere, REFERENCE_JEUNES_FFR, versionFfrValide } from './jeunesCarriere.js';
import type { SourceJeuneFfr } from '../../src/lib/jeunesFfr.js';
export function joueursLocaux(version='2026_10_FFR_FULL', authorized: () => string | undefined): StockageJoueurs | undefined {
  let path=resolve('.ffr',version,'sources.sqlite');
  // Un atelier neuf peut préparer son premier vivier sans posséder l'import historique.
  const pointeurLocal = resolve('.ffr', 'active-career-dataset.json');
  if (!existsSync(path) && version === '2026_10_FFR_FULL' && existsSync(pointeurLocal)) {
    const premiereVersion = JSON.parse(readFileSync(pointeurLocal,'utf8')).version;
    if (typeof premiereVersion === 'string' && versionFfrValide(premiereVersion)) {
      version = premiereVersion;path = resolve('.ffr',version,'sources.sqlite');
    }
  }
  if(!existsSync(path))return undefined;
  const db=new DatabaseSync(path);
  return {
    async acces(compte){return authorized()===compte;},
    async rechercher(params){
      const f=filtreSource(params),clauses=['id>?'],args:(string|number)[]=[f.after];
      if(f.q){
        const words=f.q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
        clauses.push(`(id=? OR (${words.map(()=> 'id IN(SELECT id FROM sources_name_tokens WHERE token>=? AND token<?)').join(' AND ')||'0'}))`);
        args.push(f.q);for(const word of words)args.push(word,word+'\uffff');
      }
      if(f.gender){clauses.push('gender=?');args.push(f.gender);}
      const filters:Record<string,string>={seniors:"usage IN ('MALE_SENIOR_CARD','FEMALE_SENIOR_CARD')",youth:"usage='YOUTH_REGEN_SOURCE'",regens:"usage='YOUTH_REGEN_SOURCE'",
        low:"card_status='LOW_CONFIDENCE'",duplicates:'duplicate=1',position:'position IS NULL',club:'club IS NULL',overall:'overall IS NULL',review:"review='PENDING'"};
      if(filters[f.filter])clauses.push(filters[f.filter]);args.push(f.limit+1);
      const rows=db.prepare(`SELECT data,review,revision,duplicate FROM sources WHERE ${clauses.join(' AND ')} ORDER BY id LIMIT ?`).all(...args);
      const page=rows.slice(0,f.limit);return {version,next:rows.length>f.limit?JSON.parse(String(page.at(-1)!.data)).id:null,
        joueurs:page.map(r=>vueSource({...JSON.parse(String(r.data)),duplicate:r.duplicate===1},String(r.review),Number(r.revision)))};
    },
    async catalogue(gender){
      const rows=db.prepare("SELECT data,duplicate FROM sources WHERE gender=? AND card_status='ACTIVE_CARD' AND duplicate=0 AND (review='APPROVED' OR (gender='male' AND review='PENDING')) ORDER BY id LIMIT 10000").all(gender);
      const revision=db.prepare('SELECT count(*) AS n FROM decisions').get()!.n;
      return {version,revision:String(revision),joueurs:rows.map(r=>JSON.parse(String(r.data)) as ProfilFfr)};
    },
    async decider(id,revision,action,actor,edit){
      const r=db.prepare('SELECT * FROM sources WHERE id=?').get(id);
      if(!r||Number(r.revision)!==revision)throw new Error('Le profil a changé. Rechargez la page.');
      const p=editionProfil({...JSON.parse(String(r.data)),duplicate:r.duplicate===1},edit);
      if(action==='APPROVE')exigerPublication(p);
      const review=action==='APPROVE'?'APPROVED':action==='REJECT'?'REJECTED':'PENDING';
      db.exec('BEGIN IMMEDIATE');try{
        const result=db.prepare('UPDATE sources SET data=?,review=?,revision=revision+1,position=?,club=?,competition=?,overall=?,card_status=?,confidence=?,duplicate=? WHERE id=? AND revision=?')
          .run(JSON.stringify(p),review,p.primary_position,p.club,p.competition,p.overall,p.card_status,p.data_confidence,p.duplicate?1:0,id,revision);
        if(result.changes!==1)throw new Error('Modification concurrente.');
        db.prepare('INSERT INTO decisions VALUES(?,?,?,?,?,?)').run(id,revision+1,action,actor,new Date().toISOString(),JSON.stringify({profile:p,edit:edit??{}}));db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}
    },
    async rapport(){return JSON.parse(String(db.prepare("SELECT value FROM meta WHERE key='report'").get()!.value));},
    async jeunesCarriere(params){
      const filtre = filtreJeunesCarriere(params);
      const pointeur = resolve('.ffr', 'active-career-dataset.json');
      const active = existsSync(pointeur) ? JSON.parse(readFileSync(pointeur, 'utf8')).version : version;
      const snapshotVersion = filtre.version || active;
      if (typeof snapshotVersion !== 'string' || !versionFfrValide(snapshotVersion)) throw new Error('Version de vivier invalide.');
      const fichier = resolve('.ffr', snapshotVersion, 'sources.sqlite');
      if (!existsSync(fichier)) throw new Error('Cette version du vivier est indisponible.');
      const snapshot = new DatabaseSync(fichier, {readOnly:true});
      try {
        const prepare = snapshot.prepare("SELECT value FROM meta WHERE key='career_youth_report'").get();
        if (!prepare) return {version:null, referenceDate:REFERENCE_JEUNES_FFR, joueurs:[], next:null, total:0};
        const rapport = JSON.parse(String(prepare.value));
        const rows = snapshot.prepare('SELECT id,data FROM career_youth_sources WHERE id>? ORDER BY id LIMIT ?').all(filtre.after, filtre.limit + 1);
        const page = rows.slice(0, filtre.limit);
        return {version:snapshotVersion, referenceDate:String(rapport.referenceDate), total:Number(rapport.usable),
          next:rows.length > filtre.limit ? String(page.at(-1)!.id) : null,
          joueurs:page.map(row => JSON.parse(String(row.data)) as SourceJeuneFfr)};
      } finally { snapshot.close(); }
    },
  };
}
