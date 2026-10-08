import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { classifierFfr } from '../serveur/ffr/classification.js';
import { sourceJeuneCarriere, ageSourceJeune, exclusionJeuneCarriere, filtreJeunesCarriere } from '../serveur/ffr/jeunesCarriere.js';
import { stockageFichier } from '../serveur/carriereFichier.js';
import { joueursLocaux } from '../serveur/ffr/stockageLocal.js';
import { creerGestionnaireCarriere, empreinteJeton } from '../serveur/carriereApi.js';
import type { ReponseCarriere } from '../serveur/carriereApi.js';
import type { SourceFfr } from '../serveur/ffr/classification.js';

const fixture: SourceFfr = {ffr_id:123456, first_name:'Fixture',last_name:'Formation',sex:'M',club:'Club X',
  category:'U18',category_season:'2026-2027',competition:'Crabos',season:'2026-2027',position:'Centre',
  secondary_positions:['Arrière'],matches:14,starts:10,age:17,photo:'/photos/fixture.webp',birth_date:'2009-01-01'};
const profil = classifierFfr(fixture);
const source = sourceJeuneCarriere(profil)!;
assert.equal(source.id, 'ffr_123456');
assert.equal(source.id, source.sourcePlayerId);
assert.equal(source.id, source.youthPlayerId);
assert.equal(sourceJeuneCarriere(classifierFfr({...fixture,ffr_id:undefined,player_id:'FFR_0123456'}))!.id,source.id);
assert.equal(classifierFfr(fixture,'2027-10-08').age,18,'Une nouvelle version peut prendre une nouvelle date réelle.');
assert.equal(classifierFfr({...fixture,ffr_id:undefined,player_id:'FFR_123456',category:'Senior',birth_date:'2001-01-01'}).id, source.id);
assert.equal(source.poste,'premier_centre');
assert.deepEqual(source.postesSecondaires,['arriere']);
assert.equal(source.ageEstime,false);
assert.ok(!('photo' in source) && !('birth_date' in source) && !('raw' in source) && !('potential' in source));
assert.equal(sourceJeuneCarriere(classifierFfr({...fixture,ffr_id:123457}))!.id,'ffr_123457','Un homonyme conserve son identifiant distinct.');
assert.equal(ageSourceJeune(classifierFfr({...fixture,birth_date:undefined,age:undefined}))!.age,17);
assert.equal(ageSourceJeune(classifierFfr({...fixture,birth_date:undefined,age:undefined,age_max:19}))!.age,19);
assert.equal(ageSourceJeune(classifierFfr({...fixture,birth_date:undefined,age:undefined,age_max:19}))!.estime,true);
assert.equal(exclusionJeuneCarriere(classifierFfr({...fixture,sex:undefined})),'UNKNOWN_OR_OTHER_GENDER');
assert.equal(exclusionJeuneCarriere(classifierFfr({...fixture,position:undefined})),'MISSING_POSITION');
assert.equal(sourceJeuneCarriere(classifierFfr({...fixture,category:'Senior',category_observed:undefined,competition:'Fédérale 3',age:undefined,birth_date:undefined})),null);
assert.equal(filtreJeunesCarriere(new URLSearchParams('limit=999999')).limit,2000);
assert.throws(()=>filtreJeunesCarriere(new URLSearchParams('version=../../secret')));

// Un véritable import de deux saisons reconnaît la même licence, puis une
// tentative de reprendre une entrée différente est refusée avant tout changement.
if (process.argv.includes('--import')) {
  mkdirSync('.ffr/tests-temp',{recursive:true});
  const versionTest = `test_jeunes_${randomUUID().replaceAll('-','')}`;
  const entree = `.ffr/tests-temp/${versionTest}.json`;
  const lignes = [{...fixture,ffr_id:654321,season:'2025-2026'},
    {...fixture,ffr_id:654321,age:19,birth_date:'2007-01-01',category:'Senior',competition:'Régionale 3',season:'2026-2027'},
    {...fixture,ffr_id:654322,club:'US COLOMIERS'}];
  writeFileSync(entree,'[\n'+lignes.map(j=>JSON.stringify(j)).join(',\n')+'\n]\n');
  const importer = (...options:string[]) => spawnSync(process.execPath,['--loader','./scripts/chargeurTypeScript.mjs','scripts/importFfrFull.mjs',entree,versionTest,'--prive-seulement',...options],{encoding:'utf8'});
  const resultat = importer();assert.equal(resultat.status,0,resultat.stderr);
  const chemin = `.ffr/${versionTest}/sources.sqlite`;
  const db = new DatabaseSync(chemin,{readOnly:true});
  try {
    assert.equal(db.prepare('SELECT count(*) n FROM sources').get()!.n,2);
    assert.equal(db.prepare("SELECT usage FROM sources WHERE id='ffr_654321'").get()!.usage,'MALE_SENIOR_CARD');
    const jeune = JSON.parse(String(db.prepare('SELECT data FROM career_youth_sources').get()!.data));
    assert.equal(jeune.id,'ffr_654322');assert.equal(jeune.clubSource,'US Colomiers');assert.equal(jeune.niveauDivision,2);
    assert.equal(JSON.parse(readFileSync(`.ffr/${versionTest}/report.json`,'utf8')).same_id_duplicates,1);
  } finally { db.close(); }
  const avant = readFileSync(`.ffr/${versionTest}/report.json`,'utf8');
  const refuseDate = importer('--reprendre','--date-reference=2027-10-08');
  assert.notEqual(refuseDate.status,0);assert.match(refuseDate.stderr,/autre date de référence FFR/);
  assert.equal(readFileSync(`.ffr/${versionTest}/report.json`,'utf8'),avant);
  writeFileSync(entree,'[\n'+JSON.stringify({...fixture,ffr_id:654399})+'\n]\n');
  const refuse = importer('--reprendre');assert.notEqual(refuse.status,0);
  assert.match(refuse.stderr,/autre entrée FFR/);
  assert.equal(readFileSync(`.ffr/${versionTest}/report.json`,'utf8'),avant);
  const atelierNeuf = resolve('.ffr/tests-temp',`atelier-${versionTest}`), racine = process.cwd();
  mkdirSync(resolve(atelierNeuf,'.ffr',versionTest),{recursive:true});
  copyFileSync(chemin,resolve(atelierNeuf,'.ffr',versionTest,'sources.sqlite'));
  writeFileSync(resolve(atelierNeuf,'.ffr','active-career-dataset.json'),JSON.stringify({version:versionTest}));
  try {
    process.chdir(atelierNeuf);
    const premierStockage = joueursLocaux(undefined,()=>undefined);
    assert.ok(premierStockage?.jeunesCarriere,'Un atelier neuf n’exige pas l’ancien import historique.');
    const premierVivier = await premierStockage.jeunesCarriere(new URLSearchParams());
    assert.equal(premierVivier.version,versionTest);assert.equal(premierVivier.total,1);
  } finally { process.chdir(racine); }
  console.log('Import réel de fixture : jeune et senior fusionnés par licence, club canonique et reprise d’une autre entrée refusée.');
}

const fichier = `.ffr/verification-jeunes-${randomUUID()}.json`;
const stockage = stockageFichier(fichier), compteId = randomUUID();
try {
  await stockage.creerCompte({id:compteId,identifiant:'fixture-jeunes',pseudo:'Fixture'});
  await stockage.ouvrirSession(empreinteJeton('fixture-jeunes-token'),compteId,Date.now()+60000);
  stockage.joueurs = {acces:async()=>false,rechercher:async()=>({version:null,joueurs:[],next:null}),
    catalogue:async()=>({version:'fixture',revision:'0',joueurs:[]}),decider:async()=>{},rapport:async()=>null,
    jeunesCarriere:async(params)=>{const f=filtreJeunesCarriere(params);return {version:f.version||'fixture',referenceDate:'2026-10-08',joueurs:[source],next:null,total:1};}};
  const api = creerGestionnaireCarriere(stockage);
  async function appeler(url:string, token?:string, method='GET') {
    let status=0,data:unknown; const headers:Record<string,string>={};
    const response:ReponseCarriere={status(value){status=value;return response;},setHeader(name,value){headers[name]=value;},json(value){data=value;}};
    await api.handler({method,url,headers:{host:'localhost',...(token?{cookie:`destiny_carriere=${token}`}:{})}},response);
    return {status,data,headers};
  }
  assert.equal((await appeler('/api/carriere?jeunesCarriere=1')).status,401);
  const page = await appeler('/api/carriere?jeunesCarriere=1','fixture-jeunes-token');
  assert.equal(page.status,200,'Un compte ordinaire connecté accède à son vivier de carrière.');
  assert.equal(page.headers['Cache-Control'],'private, no-store');
  assert.equal((page.data as {joueurs:unknown[]}).joueurs.length,1);
  assert.equal((await appeler('/api/carriere?baseJoueurs=1','fixture-jeunes-token')).status,404,'L’accès carrière ne donne aucun accès administrateur.');
  assert.equal((await appeler('/api/carriere?jeunesCarriere=1&version=..%2Fsecret','fixture-jeunes-token')).status,400);
  const cartes = await appeler('/api/carriere?catalogueSolo=1','fixture-jeunes-token');
  assert.ok(!(cartes.data as {ffr:{sourceId:string}[]}).ffr.some(c=>c.sourceId===source.id),'Le vivier privé ne remplit pas le catalogue en ligne.');

  const local = joueursLocaux(undefined,()=>undefined);
  if (local?.jeunesCarriere) {
    const premiere = await local.jeunesCarriere(new URLSearchParams('limit=1'));
    if (premiere.version) {
      const identites = new Set<string>(); let pageLocale = premiere;
      for (;;) {
        assert.equal(pageLocale.version,premiere.version);
        for (const joueur of pageLocale.joueurs) {
          assert.ok(!identites.has(joueur.id));identites.add(joueur.id);
          assert.equal(joueur.sourcePlayerId,joueur.id);assert.equal(joueur.youthPlayerId,joueur.id);
          assert.ok(!('photo' in joueur) && !('raw' in joueur) && !('birth_date' in joueur));
        }
        if (!pageLocale.next) break;
        pageLocale = await local.jeunesCarriere(new URLSearchParams({version:premiere.version,after:pageLocale.next,limit:'7'}));
      }
      assert.equal(identites.size,premiere.total);
      await assert.rejects(local.jeunesCarriere(new URLSearchParams('version=version_inexistante')));
      console.log(`Snapshot privé : ${identites.size} identités uniques, pages épinglées et payload minimal validés.`);
    }
  }
  console.log('Pipeline jeunes FFR : identité partagée jeune/senior, preuves et exclusions, session obligatoire, confidentialité et séparation des cartes validées.');
} finally { if (existsSync(fichier)) unlinkSync(fichier); }
