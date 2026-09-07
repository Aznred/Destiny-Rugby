import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { creerCarriere } from '../src/lib/ligue/carriere';
import { catalogueMondialCarriere, carteDepuisSource } from '../src/lib/ligue/catalogueCarriere';
import { collectionCarriere } from '../src/lib/ligue/collectionCarriere';
import { creerGestionnaireCarriere } from '../serveur/carriereApi';
import type { StockageCarriere } from '../serveur/carriereStockage';
import type { ReponseCarriere } from '../serveur/carriereApi';
import { photoReelle } from '../src/lib/avatars';
import { cleBlasonCarte } from '../src/lib/useBlasonCarte';

assert.equal(photoReelle('Will SKELTON'), '/photos/william_skelton.webp');
assert.equal(photoReelle('Jiuta WAINIQOLO'), '/photos/jiuta_naqoli_wainiqolo.webp');
assert.equal(photoReelle('Huw JONES'), '/photos/new%20maj/urc_huw_jones.webp');
assert.equal(cleBlasonCarte('Montpellier Hérault Rugby'), 'montpellierhr');
const clubsDesJoueurs = new Map(catalogueMondialCarriere().filter(c => ['Will SKELTON', 'Jiuta WAINIQOLO', 'Huw JONES'].includes(c.nom)).map(c => [c.nom, c.clubReel]));
assert.equal(clubsDesJoueurs.get('Will SKELTON'), 'Stade Rochelais');
assert.equal(clubsDesJoueurs.get('Jiuta WAINIQOLO'), 'Lyon OU');
assert.equal(clubsDesJoueurs.get('Huw JONES'), 'RC Toulon');

const e = creerCarriere({ id: '12345678-1234-1234-1234-123456789abc', nom: 'Collection test', code: 'DR-TEST', compteId: 'compte-a', pseudo: 'Alice', clubNom: 'Club A', rythme: 1, maxClubs: 4 }, Date.now(), 'test-collection');
e.logo = 'https://logos.test/ligue.webp';
e.clubs[0].embleme = 'https://logos.test/club.webp';
e.clubs.push({ ...e.clubs[0], id: 'club-b', compteId: 'compte-b', nom: 'Club B', pseudo: 'Basile' });
const sources = ['bronze','argent','or','elite','star'].map(r => catalogueMondialCarriere().find(c=>c.rarete===r)!);
assert.ok(sources.every(Boolean));
const cartes = sources.map(s=>carteDepuisSource(s,e.id,e.clubs[0].id,1));
e.cartes = cartes;
e.transactions = cartes.map((c,i)=>({id:`t-${i}`,clubId:e.clubs[0].id,nature:i===0?'dotation':'pack',ovas:-100,cartes:[c.id],date:'2026-09-06T12:00:00.000Z',libelle:'Test'}));
cartes[4].proprietaire='club-b';
const page = (params = '') => collectionCarriere(e,'compte-a',new URLSearchParams(params));
assert.ok(page().catalogueTotal>1000);
assert.equal(page().joueurs.length,24);
assert.equal(page('page=NaN').page,1);
assert.equal(page('page=999999').page,page().pages);
assert.equal(page('statut=pack').total,4);
assert.equal(page('statut=moi').total,4);
assert.equal(page('club=club-b').total,1);
assert.equal(page('statut=libre').total,page().catalogueTotal-5);
const star=page('club=club-b').joueurs[0];
assert.equal(star.obtenuPar,e.clubs[0].id);
assert.equal(star.carte.proprietaire,'club-b');
assert.equal(star.obtention,'pack');
assert.equal(page('statut=distribue&rarete=bronze').joueurs[0].obtention,'dotation');
assert.ok(page('rarete=elite').joueurs.every(j=>j.carte.rarete==='elite'));
assert.ok(page('poste=pilier').joueurs.every(j=>j.carte.famille==='pilier'));
assert.equal(page('q=zzzintrouvablezz').total,0);
assert.throws(()=>collectionCarriere(e,'inconnu',new URLSearchParams()));
let compte: string | null='compte-a';
const stockage = {
 limiter: async()=>true,
 session:async()=>compte?{id:compte,identifiant:'secret',pseudo:'Test',empreinte:'secret'}:null,
 ligues:async()=>[{id:e.id,code:e.code,version:e.version,comptes:['compte-a','compte-b'],etat:e}],
 ligue:async()=>({id:e.id,code:e.code,version:e.version,comptes:['compte-a','compte-b'],etat:e}),
} as unknown as StockageCarriere;
const api=creerGestionnaireCarriere(stockage);
async function get() {
 let statut=200; let resultat: unknown;
 const res: ReponseCarriere={status(n){statut=n;return res},setHeader(){},json(v){resultat=v}};
 await api.handler({method:'GET',url:`/api/carriere?ligue=${e.id}&collection=1`,headers:{cookie:`destiny_carriere=${'a'.repeat(64)}`}},res);
 return {statut,resultat};
}
assert.equal((await get()).statut,200);
const publicJSON=JSON.stringify((await get()).resultat);
assert.ok(!publicJSON.includes('compte-a')&&!publicJSON.includes('empreinte')&&!publicJSON.includes('ovas'));
const session = await (async () => {
 let resultat: unknown;
 const res: ReponseCarriere={status(){return res},setHeader(){},json(v){resultat=v}};
 await api.handler({method:'GET',url:'/api/carriere',headers:{cookie:`destiny_carriere=${'a'.repeat(64)}`}},res);
 return resultat as { ligues: { clubEmbleme?: string; logo?: string }[] };
})();
assert.equal(session.ligues[0].clubEmbleme, e.clubs[0].embleme);
assert.equal(session.ligues[0].logo, e.logo);
compte='intrus'; assert.equal((await get()).statut,404);
compte=null; assert.equal((await get()).statut,401);
if (process.env.COLLECTION_FIXTURE) writeFileSync(process.env.COLLECTION_FIXTURE,JSON.stringify({page:page('statut=distribue'),vue:{id:e.id,saison:1,cartes:e.cartes,clubs:e.clubs.map(({compteId: _compteId,...c})=>c),monClubId:e.clubs[0].id}}));
console.log(`OK collection : ${page().catalogueTotal} joueurs, pagination, filtres, origine après transfert, dotation distincte, API 200/401/404, aucune donnée privée.`);
