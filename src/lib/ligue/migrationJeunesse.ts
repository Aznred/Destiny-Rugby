import { sourceRetireeFfr, empreinteSourceFfr } from './eligibiliteJoueurs.js';
import { VERSION_PROTECTION_FFR } from '../../data/protectionFfr.generated.js';
import { graine } from './aleatoire.js';
import { rareteCarriere } from './raretesCartes.js';
import { statistiquesCarte } from './statistiquesCarte.js';
import type { EtatCarriereEnLigne } from './typesCarriere.js';
const first=['Mathis','Adam','Noé','Louis','Arthur','Hugo','Gabriel','Jules','Raphaël','Léo'];
const last=['Bernard','Laurent','Morel','Garnier','Fontaine','Roux','Leroy','Faure','Perrin','Blanc'];
export const cartesJeunesseARetirer = (etat: EtatCarriereEnLigne) => etat.cartes.filter(c => !c.retiree && c.origine !== 'formation'
  && (sourceRetireeFfr(c.sourceId) || sourceRetireeFfr(c.speciale?.base ?? c.sourceId) || c.age < 18));
/** Nettoie les instantanés et récits en conservant leurs références primaires. */
export function anonymiseurJeunesse(identites: readonly {nom:string;photo?:string}[]) {
  const photos = new Set(identites.map(c => c.photo).filter(Boolean));
  const noms = [...new Set(identites.map(c => c.nom).filter(Boolean))].sort((a,b)=>b.length-a.length);
  const motif = noms.length ? new RegExp(noms.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g') : null;
  const references = new Set(['id','sourceId','carteId','joueurId','capitaineId','buteurId','viceCapitaineId','buteur2Id','engagementId','droppeurId','lanceurId','lanceur2Id','clubId','competitionId','cartes','titulaires','remplacants','cartesDonnees','cartesDemandees']);
  const nettoyer=(value:unknown,key=''):unknown=>{
    if(typeof value==='string') {
      if(references.has(key))return value;
      if(photos.has(value))return undefined;
      return motif ? value.replace(motif,'Joueur retiré') : value;
    }
    if(Array.isArray(value))return value.map(v=>nettoyer(v,key));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,nettoyer(v,k)]));
    return value;
  };
  return nettoyer;
}
export function anonymiserHistoriqueJeunesse(etat: EtatCarriereEnLigne, nettoyer: ReturnType<typeof anonymiseurJeunesse>) {
  etat.rencontres=nettoyer(etat.rencontres) as EtatCarriereEnLigne['rencontres'];
  etat.histoire=nettoyer(etat.histoire) as EtatCarriereEnLigne['histoire'];
  etat.transactions=nettoyer(etat.transactions) as EtatCarriereEnLigne['transactions'];
  etat.ventes=nettoyer(etat.ventes) as EtatCarriereEnLigne['ventes'];
}
/** Mutates only the copied state. The backend snapshots it before the CAS commit. */
export function migrerCartesJeunesse(etat: EtatCarriereEnLigne,now:number): void {
  const withdrawn=cartesJeunesseARetirer(etat);if(!withdrawn.length)return;
  const nettoyer=anonymiseurJeunesse(withdrawn);
  const ids=new Set(withdrawn.map(c=>c.id));
  const replacements=new Map<string,string>();const date=new Date(now).toISOString();
  for(const c of withdrawn){
    const owner=c.proprietaire,rng=graine(`regen-compensation:${etat.id}:${c.id}`);
    if(owner){
      const sourceId=`regen:${empreinteSourceFfr(c.id)}`,id=`${etat.id}:${sourceId}`;
      const note=Math.min(99,c.note+Math.floor(rng()*3));
      const replacement={...c,id,sourceId,nom:`${first[Math.floor(rng()*first.length)]} ${last[Math.floor(rng()*last.length)]}`,
        photo:undefined,age:18+Math.floor(rng()*3),note,potentiel:Math.min(99,Math.max(note,c.potentiel)+Math.floor(rng()*3)),
        origine:'formation' as const,rarete:rareteCarriere(note),statistiques:statistiquesCarte(note,c.famille,sourceId),
        gender:'male' as const,verrou:undefined,speciale:undefined,retiree:undefined,datasetVersion:undefined};
      etat.cartes.push(replacement);replacements.set(c.id,id);
      etat.transactions.push({id:`${etat.id}:migration-ffr:${empreinteSourceFfr(c.id)}`,clubId:owner,nature:'dotation',ovas:0,
        cartes:[id],libelle:'Retrait jeunesse : carte fictive de compensation équivalente',date});
    }
    c.retiree=true;c.proprietaire=null;delete c.verrou;delete c.photo;c.nom='Joueur retiré';
    (etat.migrationsFfr??=[]).push({version:VERSION_PROTECTION_FFR,carteId:c.id,owner,compensation:0,le:date});
  }
  for(const sale of etat.ventes)if(ids.has(sale.carteId)){
    sale.joueurNom='Joueur retiré';
    if(sale.etat==='ouverte'){
      // Shared-market escrow is refunded by the shared saga, never twice here.
      if(sale.enchere&&!sale.partagee){const bidder=etat.clubs.find(c=>c.id===sale.enchere!.clubId);if(bidder)bidder.ovas+=sale.enchere.montant;}
      sale.etat='annulee';
    }
  }
  for(const e of etat.echanges)if(e.etat==='propose'&&[...e.cartesDonnees,...e.cartesDemandees].some(id=>ids.has(id)))e.etat='annule';
  for(const club of etat.clubs){
    for(const comp of [club.composition,...(club.compositionsSauvegardees??[]).map(s=>s.composition)]){
      comp.titulaires=comp.titulaires.map(id=>replacements.get(id)??id);comp.remplacants=comp.remplacants.map(id=>replacements.get(id)??id);
      for(const key of ['capitaineId','buteurId','viceCapitaineId','buteur2Id','engagementId','droppeurId','lanceurId','lanceur2Id'] as const){
        const value=comp[key];if(value&&replacements.has(value))comp[key]=replacements.get(value)!;
      }
    }
  }
  // Keep scores and historic primary references. Scrub youth identity in match snapshots and narrative history.
  anonymiserHistoriqueJeunesse(etat,nettoyer);
}
