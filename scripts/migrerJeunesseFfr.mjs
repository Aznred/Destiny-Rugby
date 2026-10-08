// Simulation par défaut. Applique uniquement après déploiement des protections.
import {readFileSync,writeFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
import {stockageNeon} from '../serveur/carriereStockage.ts';
import {catalogueBaseCarriere} from '../src/lib/ligue/catalogueCarriere.ts';
import {cartesJeunesseARetirer,migrerCartesJeunesse,anonymiseurJeunesse,anonymiserHistoriqueJeunesse} from '../src/lib/ligue/migrationJeunesse.ts';
import {compensationsSoloFfr,migrerCollectionFfr} from '../src/lib/ligue/migrationCollectionFfr.ts';
import {carteSeniorAutorisee} from '../src/lib/ligue/eligibiliteJoueurs.ts';
import {echeancesMarche} from '../src/lib/ligue/marchePartage.ts';
import {operationMarcheCarriere} from '../src/lib/ligue/carriere.ts';
const version=process.argv[2]??'2026_10_FFR_FULL';
if(!/^[A-Za-z0-9_]{3,60}$/.test(version))throw new Error('Version invalide.');
const root=`.ffr/${version}`,appliquer=process.argv.includes('--appliquer');
const envLine=readFileSync('.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
const url=process.env.DATABASE_URL??envLine?.slice(envLine.indexOf('=')+1).trim().replace(/^["']|["']$/g,'');
if(!url)throw new Error('DATABASE_URL absente.');
const audit=JSON.parse(readFileSync(`${root}/production-audit.json`,'utf8'));
if(audit.database_host!==new URL(url).hostname)throw new Error('Base différente de celle auditée.');
const sql=neon(url),stockage=stockageNeon(url),sources=new Set(JSON.parse(readFileSync(`${root}/withdrawn-sources.json`,'utf8')));
const avant=JSON.parse(readFileSync(`${root}/catalogue-before.json`,'utf8'));
const correspondances=compensationsSoloFfr(avant,catalogueBaseCarriere(),sources);
const nettoyer=anonymiseurJeunesse(avant.filter(c=>sources.has(c.sourceId)));
const keys=JSON.stringify([...correspondances.keys()]),now=Date.now();
const bilan={version,mode:appliquer?'APPLY':'DRY_RUN',ligues:0,cartesRetirees:0,compensationsRegens:0,marches:0,
  remboursements:0,offresSoloAnnulees:0,comptesSolo:0,exemplairesSolo:0,historiquesAnonymises:0,ventesEnCours:0,legacyCards:0,le:new Date(now).toISOString()};
const [legacy]=await sql`select count(*)::int n from cartes`;
bilan.legacyCards=legacy.n;
if(legacy.n)throw new Error('Le socle historique cartes contient des cartes : ajouter son audit par référence avant application.');
const marches=await sql`select id,revision,donnees from carriere_marches`;
for(const m of marches) bilan.ventesEnCours+=m.donnees.annonces.filter(a=>!carteSeniorAutorisee(a.carte)&&a.etat==='reclamee').length;
if(appliquer){
  const response=await fetch('https://destiny-rugby.fr/api/carriere?catalogueSolo=1');
  const data=await response.json();
  if(!response.ok||!String(data.revisionFfr??'').startsWith(version+':'))throw new Error('Déployez les protections FFR sur destiny-rugby.fr avant la migration des sauvegardes.');
  if(bilan.ventesEnCours)throw new Error('Vente jeunesse partiellement soldée : une reprise transactionnelle est requise avant migration.');
}
// Annuler et restituer les cartes séquestrées AVANT de convertir la collection.
const offres=await sql`select id,compte from collection_offres where statut='ouverte' and
 (offertes ?| array(select jsonb_array_elements_text(${keys}::jsonb)) or souhaitees ?| array(select jsonb_array_elements_text(${keys}::jsonb))
 or exists(select 1 from jsonb_array_elements(propositions) p where p->'cartes' ?| array(select jsonb_array_elements_text(${keys}::jsonb))))`;
for(const o of offres){
  bilan.offresSoloAnnulees++;
  if(appliquer)await sql.transaction([
    sql`insert into player_migration_snapshots(migration,kind,entity_id,revision,data)
      select ${version},'solo-offer',id::text,0,to_jsonb(collection_offres) from collection_offres where id=${o.id}::uuid and statut='ouverte' on conflict do nothing`,
    sql`insert into player_migration_snapshots(migration,kind,entity_id,revision,data)
      select ${version},'solo-escrow',compte::text,coalesce((donnees->'collectionSolo'->>'revision')::int,0),donnees from compte_boutique where compte=${o.compte}::uuid on conflict do nothing`,
    sql`select collection_annuler(${o.id}::uuid,${o.compte}::uuid)`,
  ]);
}
// Le marché conserve sa file durable de restitutions jusqu'au CAS de chaque ligue.
for(const m of marches){
  const suivant=structuredClone(m.donnees);
  const modifie=echeancesMarche(suivant,0);
  if(!modifie&&!suivant.remboursements.length)continue;
  if(modifie)bilan.marches++;
  if(appliquer&&modifie){
    await sql`insert into player_migration_snapshots(migration,kind,entity_id,revision,data) values(${version},'market',${m.id},${m.revision},${JSON.stringify(m.donnees)}::jsonb) on conflict do nothing`;
    if(!await stockage.comparerEtEcrireMarche(m.id,m.revision,suivant))throw new Error('Marché modifié pendant la migration. Relancez.');
  }
  for(const r of suivant.remboursements){
    bilan.remboursements++;
    if(!appliquer)continue;
    for(let essai=0;essai<12;essai++){
      const l=await stockage.ligue(r.ligueId);if(!l)break;
      await stockage.snapshotFfr(l,version);
      const op=operationMarcheCarriere(l.etat,{type:'restituer',clubId:r.clubId,ref:r.ref,libelle:'Retrait jeunesse : Ovas réservés restitués'},now);
      if(!op.fait||await stockage.comparerEtEcrire({...l,etat:op.etat},l.version))break;
      if(essai===11)throw new Error('Ligue très sollicitée. Relancez la migration.');
    }
  }
}
const ligues=await sql`select id from carriere_ligues order by id`;
for(const {id} of ligues){
  for(let essai=0;essai<12;essai++){
    const l=await stockage.ligue(String(id));if(!l)break;
    const retrait=cartesJeunesseARetirer(l.etat),s=structuredClone(l.etat),old=JSON.stringify(l.etat);
    migrerCartesJeunesse(s,now);anonymiserHistoriqueJeunesse(s,nettoyer);
    if(JSON.stringify(s)===old)break;
    if(appliquer){await stockage.snapshotFfr(l,version);s.version=l.etat.version+1;
      if(!await stockage.comparerEtEcrire({...l,etat:s},l.version)){if(essai===11)throw new Error('Ligue très sollicitée. Relancez.');continue;}}
    bilan.ligues++;bilan.cartesRetirees+=retrait.length;bilan.compensationsRegens+=retrait.filter(c=>c.proprietaire).length;break;
  }
}
const coffres=await sql`select compte,donnees from compte_boutique where (donnees->'collectionSolo'->'quantites') ?|
  array(select jsonb_array_elements_text(${keys}::jsonb)) order by compte`;
for(const b of coffres){
  for(let essai=0;essai<12;essai++){
    const [actuel]=essai?await sql`select donnees from compte_boutique where compte=${b.compte}::uuid`:[b];
    const {collection,log}=migrerCollectionFfr(actuel.donnees.collectionSolo,correspondances);
    if(!log.length)break;
    if(appliquer){
      const donnees={...actuel.donnees,collectionSolo:collection};
      const [r]=await sql`with cible as (select * from compte_boutique where compte=${b.compte}::uuid and donnees=${JSON.stringify(actuel.donnees)}::jsonb for update),
       snapshot as (insert into player_migration_snapshots(migration,kind,entity_id,revision,data)
         select ${version},'solo',compte::text,${collection.revision-1},donnees from cible on conflict do nothing returning entity_id),
       change as (update compte_boutique set donnees=${JSON.stringify(donnees)}::jsonb,modifie_le=now() where compte in(select compte from cible) returning compte),
       log as (insert into player_migration_snapshots(migration,kind,entity_id,revision,data)
         select ${version},'solo-compensation',compte::text,${collection.revision},${JSON.stringify(log)}::jsonb from change on conflict do nothing returning entity_id)
       select count(*)::int n from change`;
      if(!r.n){if(essai===11)throw new Error('Collection modifiée pendant la migration. Relancez.');continue;}
    }
    bilan.comptesSolo++;bilan.exemplairesSolo+=log.reduce((n,c)=>n+c.exemplaires,0);break;
  }
}
// Les reprises sont des instantanés privés du moteur ; conserver leurs clés et scores.
const reprises=await sql`select ligue,match,code,donnees from carriere_reprises`;
for(const r of reprises){
  const originale=typeof r.donnees==='string'?JSON.parse(r.donnees):r.donnees;
  const scrubbed=nettoyer(originale),before=JSON.stringify(originale),after=JSON.stringify(scrubbed);
  if(before===after)continue;bilan.historiquesAnonymises++;
  if(appliquer)await sql.transaction([
    sql`insert into player_migration_snapshots(migration,kind,entity_id,revision,data) values(${version},'match-resume',${`${r.ligue}:${r.match}:${r.code}`},0,${before}::jsonb) on conflict do nothing`,
    sql`update carriere_reprises set donnees=${after} where ligue=${r.ligue}::uuid and match=${r.match} and code=${r.code} and donnees=${r.donnees}`,
  ]);
}
writeFileSync(`${root}/${appliquer?'migration-result':'migration-plan'}.json`,JSON.stringify(bilan,null,2));
console.log(JSON.stringify(bilan,null,2));
