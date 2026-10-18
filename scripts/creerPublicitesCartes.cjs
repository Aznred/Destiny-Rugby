// Publicités FR/EN : vrais composants et modèles, aucune écriture dans le jeu.
// Aperçu local sur 5188 ; --capturer, puis --monter, ou aucun argument pour les deux.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const {sortie}=require('./campagneCartes/configuration.cjs');
(async()=>{
  fs.mkdirSync(sortie,{recursive:true});
  const temporaire=fs.realpathSync(os.tmpdir());
  const travail=fs.mkdtempSync(path.join(temporaire,'destiny-campagne-cartes-'));
  assert.ok(path.resolve(travail).startsWith(temporaire+path.sep)&&path.basename(travail).startsWith('destiny-campagne-cartes-'),'Travail temporaire inattendu.');
  try{
    if(!process.argv.includes('--monter'))await require('./campagneCartes/capturer.cjs').capturer(travail);
    if(!process.argv.includes('--capturer'))await require('./campagneCartes/monter.cjs').monter(travail);
  }finally{
    fs.rmSync(travail,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
