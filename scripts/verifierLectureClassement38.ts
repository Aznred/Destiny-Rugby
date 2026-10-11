import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GET} from '../api/classement';
const l=readFileSync('.env','utf8').split(/\r?\n/).find(l=>l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL??=l?.slice(l.indexOf('=')+1).trim().replace(/^["']|["']$/g,'');
for(const categorie of ['total','joueur','entraineur','joueurEntraineur']) {
 const r=await GET(new Request('http://localhost/api/classement?categorie='+categorie));const d=await r.json();
 assert.equal(r.status,200);assert.ok(d.total>=0&&d.classement.length<=50);
 assert.ok(d.classement.every((l:any)=>!('cle' in l)&&!('userId' in l)));
 if(categorie==='total')assert.equal(d.total,1304);
 console.log(`${categorie} : ${d.total} carrières visibles, ${d.classement.length} sur la page, réponse publique sans clé privée.`);
}
