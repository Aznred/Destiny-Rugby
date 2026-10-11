import assert from 'node:assert/strict';
import {scoreDeLaFiche,type FicheCarriere} from '../src/lib/classementMondial';
const base:FicheCarriere={v:2,pseudo:'Camille',nom:'Camille',poste:'demi-melee',nation:'France',ageDebut:18,age:18,saisons:1,
  note:100,reputation:20,matchs:10,essais:4,selections:0,titres:[],clubs:['Stade Toulousain'],score:0,cle:'cle-test-api'};
base.score=scoreDeLaFiche(base);
let controles=0;const dossiers=new Map();const lignes=new Map();let quota=0;let schema='v4';const requetes:string[]=[];
const verifier=(v:unknown,m:string)=>{assert.ok(v,m);controles++;};
const sql:any=(chaines:TemplateStringsArray,...parametres:unknown[])=>sql.query(chaines.reduce((s,c,i)=>s+c+(i<parametres.length?'$'+(i+1):''),''),parametres);
sql.query=async(q:string,p:unknown[]=[])=>{
  requetes.push(q);
  if(schema==='v3'&&(q.includes('classement_validations')||q.includes('c.validation')))throw {code:q.includes('classement_validations')?'42P01':'42703'};
  if(q.includes('select * from classement_validations where cle'))return dossiers.has(p[0])?[dossiers.get(p[0])]:[];
  if(q.includes('with ecrit as')) {
    const ancien=dossiers.get(p[1]);if(ancien&&ancien.revision!==p[9])return[];
    dossiers.set(p[1],{id:p[0],cle:p[1],user_id:p[2],fiche:JSON.parse(p[3] as string),validation:JSON.parse(p[4] as string),
      revision:p[5],valide_le:p[6],synchronise_le:p[7],decision:JSON.parse(p[8] as string)});
    return[{id:p[0]}];
  }
  if(q.includes('from envois'))return[{heure:quota,jour:quota}];
  if(q.includes('insert into envois')){quota++;return[];}
  if(q.includes('insert into classement')) {
    const ancien=lignes.get(p[0]);if(ancien && ancien.score > Number(p[2]))return[];
    const ligne={id:ancien?.id??lignes.size+1,pseudo:p[1],score:p[2],nom:p[3],poste:p[4],matchs:p[10],validation:p[15]?JSON.parse(p[15] as string):undefined};
    lignes.set(p[0],ligne);return[{id:ligne.id}];
  }
  if(q.includes('select id from classement where cle'))return lignes.has(p[0])?[{id:lignes.get(p[0]).id}]:[];
  if(q.includes('count(*)'))return[{total:lignes.size}];
  if(q.includes('row_number()'))return[{...lignes.get('cle-test-api'),rang:1}];
  if(q.includes('from classement'))return [...lignes.values()];
  return[];
};
(globalThis as any).sqlClassementTest38=sql;
process.env.DATABASE_URL='postgresql://banc-inutilisable';process.env.SEL_APPAREIL='sel-du-banc';
const {GET,POST}=await import('../api/classement');
const envoyer=(f:unknown)=>POST(new Request('http://localhost/api/classement',{method:'POST',headers:{'content-type':'application/json','x-vercel-forwarded-for':'127.0.0.1'},body:JSON.stringify(f)}));
let r=await envoyer(base);let d=await r.json();
verifier(r.status===200&&d.validation.statut==='ELIGIBLE'&&d.verificationEnregistree,'L’API accepte une progression forte et enregistre sa vérification');
verifier(lignes.size===1&&lignes.get(base.cle).score===base.score,'Score recalculé publié');
r=await envoyer({...base,cle:'ancienne',v:1});d=await r.json();
verifier(r.status===200&&d.validation.statut==='PENDING_VALIDATION'&&lignes.size===2,'Ancienne carrière publiée provisoirement');
r=await envoyer({...base,cle:'fraude',score:base.score+1000});d=await r.json();
verifier(d.validation.statut==='REJECTED'&&!lignes.has('fraude')&&dossiers.has('fraude'),'Score falsifié journalisé, aucun score frauduleux publié');
verifier(d.validation.regles.some((r:any)=>r.id==='score_modifie'),'Le refus a une explication');
verifier(!JSON.stringify(d.validation).includes('fraude'),'Réponse publique sans clé');
r=await envoyer({...base,cle:'negative',matchs:-5});d=await r.json();verifier(d.validation.statut==='REJECTED'&&!lignes.has('negative'),'Statistique négative bloquée côté API');
r=await envoyer({...base,cle:'ancienne'});d=await r.json();verifier(d.validation.statut==='ELIGIBLE','Même score, nouveaux faits : revalidation automatique');
const page=await (await GET(new Request('http://localhost/api/classement?categorie=entraineur&id=1'))).json();
verifier(page.parPage===50&&page.classement.length===2&&page.categorie==='entraineur','Lecture paginée du nouveau schéma');
verifier(!JSON.stringify(page).includes('cle-test-api'),'Aucune clé de publication dans la lecture');
const rangSql=requetes.find(q=>q.includes('row_number()'))!;
verifier(rangSql.includes("c.validation->>'visible'")&&rangSql.includes("c.poste='entraineur'"),'Le rang utilise les mêmes règles de visibilité et catégorie');
schema='v3';r=await envoyer({...base,cle:'compatibilite'});d=await r.json();
verifier(r.status===200&&!d.verificationEnregistree&&lignes.has('compatibilite'),'Schéma v3 encore utilisable avant installation des journaux');
verifier((await (await GET()).json()).classement.length===3,'Lecture ancienne base préservée');
quota=18;verifier((await envoyer(base)).status===429,'Protection contre le martèlement conservée');
quota=0;verifier((await POST(new Request('http://localhost/api/classement',{method:'POST',headers:{'x-vercel-forwarded-for':'127.0.0.1'},body:'{'}))).status===400,'JSON invalide expliqué');
console.log(`API classement : ${controles} contrôles réussis.`);
process.exit(0);
