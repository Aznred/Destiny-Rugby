// Retire les identités du paquet public, sans décaler les indices d'effectif.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, unlinkSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { normaliserFfr } from '../serveur/ffr/classification.ts';
const version = process.argv[2] ?? '2026_10_FFR_FULL';
if (!/^[A-Za-z0-9_]{3,60}$/.test(version)) throw new Error('Version invalide.');
const root = resolve('.ffr', version), sauvegardes = resolve(root, 'public-before');
mkdirSync(sauvegardes, { recursive: true });
const retirees = new Set(JSON.parse(readFileSync(resolve(root, 'withdrawn-sources.json'), 'utf8')));
const noms = new Set([...retirees].filter(id => id.startsWith('reel:')).map(id => id.slice(5)));
const licences = new Set(), portraits = new Set();
const bilanPath=resolve(root,'public-cleanup.json');
const precedent=existsSync(bilanPath)?JSON.parse(readFileSync(bilanPath,'utf8')):{};
for(const portrait of precedent.portraits??[])portraits.add(portrait);
let identites = 0, photos = 0;
// Les valeurs générées sont du JSON ; aucune exécution de code du fichier.
function modifierExport(fichier, nom, transformation) {
  const path = resolve('src/data', fichier), source = readFileSync(path, 'utf8');
  const debut = source.indexOf(`export const ${nom}`);
  if (debut < 0) throw new Error(`Export absent : ${nom}`);
  const egal = source.indexOf('=', debut), start = source.indexOf('{', egal), fin = source.indexOf('\n};', start);
  if (start < 0 || fin < 0) throw new Error(`Format généré inattendu : ${nom}`);
  const data = JSON.parse(source.slice(start, fin + 2).replace(/,\s*([}\]])/g, '$1'));
  transformation(data);
  const sortie = source.slice(0, start) + JSON.stringify(data, null, 2) + source.slice(fin + 2);
  if (source !== sortie) {
    const snapshot = resolve(sauvegardes, fichier);
    if (!existsSync(snapshot)) copyFileSync(path, snapshot);
    writeFileSync(path, sortie);
  }
}
modifierExport('amateurs.ts', 'EFFECTIFS_AMATEURS', data => {
  for (const club of Object.keys(data)) data[club] = data[club].split('~').map(entree => {
    const [nom, , , licence] = entree.split('|');
    if (!noms.has(normaliserFfr(nom))) return entree;
    if (licence) licences.add(licence);
    identites++; return '';
  }).join('~');
});
for (const [fichier, exportId] of [['photosFfr.ts', 'PHOTOS_FFR_PAR_ID'], ['photosDetourees.ts', 'PHOTOS_DETOUREES_PAR_ID']]) {
  modifierExport(fichier, exportId, data => { for (const [licence,uri] of Object.entries(data)) if (licences.has(licence)||portraits.has(uri)) { portraits.add(uri); delete data[licence]; photos++; } });
}
for (const [fichier, exportClub] of [['photosFfr.ts', 'PHOTOS_FFR_SUPPLEMENTAIRES'], ['photosDetourees.ts', 'PHOTOS_DETOUREES_PAR_CLUB'], ['photosDetourees.ts', 'JOUEURS_DETOURES_SUPPLEMENTAIRES']]) {
  modifierExport(fichier, exportClub, data => { for (const club of Object.keys(data)) for (const [cle, valeur] of Object.entries(data[club])) {
    if (!noms.has(normaliserFfr(typeof valeur === 'object' ? valeur.nom : cle))&&!portraits.has(typeof valeur==='object'?valeur.photo:valeur)) continue;
    portraits.add(typeof valeur === 'object' ? valeur.photo : valeur); delete data[club][cle]; photos++;
  } });
}
function fichiersSource(dossier){return readdirSync(dossier,{withFileTypes:true}).flatMap(e=>e.isDirectory()?fichiersSource(resolve(dossier,e.name)):/\.(ts|tsx|css)$/.test(e.name)?[resolve(dossier,e.name)]:[]);}
const references=fichiersSource(resolve('src')).map(p=>readFileSync(p,'utf8')).join('\n');
const publicRoot=resolve('public'),conserves=[];let portraitsArchives=precedent.portraitsArchives??0;
for(const uri of portraits){
  if(references.includes(uri)){conserves.push(uri);continue;}
  if(!uri.startsWith('/photos/'))throw new Error('Portrait hors du répertoire public autorisé.');
  const path=resolve(publicRoot,decodeURIComponent(uri.slice(1)));
  if(!path.startsWith(publicRoot+sep))throw new Error('Chemin portrait invalide.');
  if(existsSync(path)){
    const snapshot=resolve(root,'portraits-before',relative(publicRoot,path));
    mkdirSync(dirname(snapshot),{recursive:true});if(!existsSync(snapshot))copyFileSync(path,snapshot);
    unlinkSync(path);portraitsArchives++;
  }
}
const bilan={version,identites:identites+(precedent.identites??0),photos:photos+(precedent.photos??0),portraits:[...portraits],portraitsArchives,conserves};
writeFileSync(bilanPath,JSON.stringify(bilan,null,2));
console.log(JSON.stringify({version,identites:bilan.identites,photos:bilan.photos,portraitsArchives,portraitsEncoreReferences:conserves.length}));
