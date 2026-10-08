import { AsyncLocalStorage } from 'node:async_hooks';
import { fournirPoolFfr } from '../../src/lib/ligue/eligibiliteJoueurs.js';
import { catalogueBaseCarriere, rareteCarriere, statistiquesCarte } from '../../src/lib/ligue/catalogueCarriere.js';
import type { SourceCarte } from '../../src/lib/ligue/catalogueCarriere.js';
import { POSTE_PAR_ID } from '../../src/data/rugby.js';
import { normaliserFfr } from './classification.js';
import type { ProfilFfr } from './classification.js';
import type { StockageJoueurs } from './stockage.js';
export const contexteFfr = new AsyncLocalStorage<{ request?: boolean; authorized?: boolean; pool: 'men'|'women'|'mixed'; joueurs: readonly SourceCarte[]; revisionFfr?: string }>();
fournirPoolFfr(()=>contexteFfr.getStore()??null);
export function sourceDepuisProfil(p: ProfilFfr,version: string): SourceCarte {
  if(!p.primary_position||p.overall===null||p.potential===null)throw new Error('Profil incomplet.');
  const famille=POSTE_PAR_ID[p.primary_position].famille;
  return {sourceId:p.id,nom:p.name,poste:p.primary_position,famille,postesSecondaires:p.secondary_positions,
    note:p.overall,potentiel:p.potential,age:p.age??25,nation:p.countryId==='FR'?'France':p.countryId,
    clubReel:p.club!,championnat:p.competition!,pays:p.countryId==='FR'?'France':p.countryId,photo:p.photo??undefined,
    origine:'ffr',rarete:rareteCarriere(p.overall),statistiques:statistiquesCarte(p.overall,famille,p.id),gender:p.gender==='female'?'female':'male',
    countryId:p.countryId,clubId:p.clubId??undefined,competitionId:p.competitionId??undefined,dataConfidence:p.data_confidence,datasetVersion:version};
}
export function serviceFfr(storage?: StockageJoueurs){
  const access=new Map<string,{value:boolean;at:number}>();
  const pools=new Map<string,{at:number;revision:string;joueurs:readonly SourceCarte[]}>();
  return {
    invalidate(){pools.clear();},
    async acces(id:string){
      if(!storage)return false;const known=access.get(id);if(known&&Date.now()-known.at<30000)return known.value;
      const value=await storage.acces(id);access.set(id,{value,at:Date.now()});if(access.size>512)access.delete(access.keys().next().value!);return value;
    },
    async avecPool<T>(pool:'men'|'women'|'mixed',op:()=>T|Promise<T>):Promise<T>{
      let cached=pools.get(pool);
      if(storage&&(!cached||Date.now()-cached.at>=30000)){
        try{
          const result=await storage.catalogue(pool==='women'?'female':'male');
          if(pool==='mixed') { const feminine=await storage.catalogue('female'); result.joueurs=[...result.joueurs,...feminine.joueurs]; result.revision+=':'+feminine.revision; }
          const revision=result.version+':'+result.revision;
          if(cached?.revision===revision)cached.at=Date.now();
          else {
            const old=catalogueBaseCarriere(),byName=new Map<string,SourceCarte[]>();
            for(const c of old){const key=normaliserFfr(c.nom);const list=byName.get(key)??[];list.push(c);byName.set(key,list);}
            const joueurs=result.joueurs.map(p=>{
              const c=sourceDepuisProfil(p,result.version), matches=byName.get(p.identity_key);
              // Preserve existing IDs and validated cards. A name ambiguity never joins records.
              const legacy=matches?.length===1&&normaliserFfr(matches[0].clubReel)===normaliserFfr(p.club??'')?matches[0]:null;
              return legacy&&pool==='men'?{...legacy,gender:'male' as const}:c;
            });
            cached={at:Date.now(),revision,joueurs};pools.set(pool,cached);
          }
        }catch(e){if(pool==='women'||(e as {code?:string}).code!=='42P01')throw e;}
      }
      return contexteFfr.run({...contexteFfr.getStore(),pool,joueurs:cached?.joueurs??[],revisionFfr:cached?.revision??''},op);
    },
  };
}
