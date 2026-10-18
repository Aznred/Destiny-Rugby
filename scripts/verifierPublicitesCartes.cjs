// Vérifie les médias réellement exportés et leur lecture dans Chromium.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const{spawnSync}=require('node:child_process');
const ffmpeg=require('ffmpeg-static');
const sharp=require('sharp');
const{ouvrirNavigateur,attendre}=require('./outilsNavigateur.cjs');
const{sortie}=require('./campagneCartes/configuration.cjs');
const lancer=args=>spawnSync(ffmpeg,['-hide_banner',...args],{encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:32*1024*1024});
(async()=>{
  const bilan=[];
  for(const langue of ['fr','en']){
    const fichier=path.join(sortie,`Destiny-Rugby-Ta-Carte-${langue.toUpperCase()}-25s.mp4`);
    const infos=lancer(['-i',fichier]).stderr;
    assert.match(infos,/1080x1920/);assert.match(infos,/60 fps/);assert.match(infos,/Audio: aac/);assert.match(infos,/Duration: 00:00:25\.0/);
    const decodage=lancer(['-v','error','-i',fichier,'-map','0:v:0','-f','framemd5','-']);
    assert.equal(decodage.status,0,decodage.stderr);
    const images=decodage.stdout.split('\n').filter(l=>l&&!l.startsWith('#'));
    assert.equal(images.length,1500,'Chaque export comporte 1 500 images décodables.');
    const distinctes=new Set(images.map(l=>l.split(',').at(-1).trim())).size;
    assert.ok(distinctes>1000,'Les animations et sous-titres doivent évoluer au rythme de la vidéo.');
    const son=lancer(['-i',fichier,'-vn','-af','volumedetect','-f','null','-']);assert.equal(son.status,0);
    const maximum=Number(son.stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1]);assert.ok(maximum<0 && maximum>-20,'Son présent, sans saturation.');
    for(const temps of [1.85,17.25]){
      // Les buffers binaires restent en mémoire ; ne jamais les écrire dans les journaux.
      const brut=spawnSync(ffmpeg,['-v','error','-ss',String(temps),'-i',fichier,'-frames:v','1','-f','image2pipe','-vcodec','png','-'],{windowsHide:true,maxBuffer:8*1024*1024});
      assert.equal(brut.status,0);
      const region=await sharp(brut.stdout).extract({left:300,top:450,width:480,height:700}).toBuffer();
      const stats=await sharp(region).stats();
      assert.ok(Math.max(...stats.channels.slice(0,3).map(c=>c.mean))>80,`La carte doit être visible lors de la révélation à ${temps} s.`);
    }
    const cartes=JSON.parse(fs.readFileSync(path.join(sortie,`sources/${langue}-cartes.json`),'utf8'));
    assert.equal(cartes.length,6);assert.ok(cartes.some(c=>c.genre==='female'));assert.ok(cartes.some(c=>c.championnat==='Régionale 3'));
    bilan.push({langue,largeur:1080,hauteur:1920,fps:60,duree:25,images:images.length,imagesDistinctes:distinctes,creteAudioDb:maximum,octets:fs.statSync(fichier).size,voixOff:false});
    console.log(`OK ${langue} : 25 s, 1080 × 1920, 60 images/s, ${images.length} images décodées, son sans saturation.`);
  }
  const p=await ouvrirNavigateur({port:9284});
  const temporaire=fs.realpathSync(os.tmpdir()),captures=fs.mkdtempSync(path.join(temporaire,'destiny-validation-cartes-'));
  assert.ok(path.resolve(captures).startsWith(temporaire+path.sep));
  const erreurs=[];p.ecouter('Runtime.exceptionThrown',e=>erreurs.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
  try{
    for(const [largeur,hauteur] of [[1920,1080],[390,844]]){
      await p.dimensions(largeur,hauteur);
      for(const langue of ['fr','en']){
        await p.ouvrir(`http://127.0.0.1:5188/trailer/cartes-tiktok-2026-10-18/Destiny-Rugby-Ta-Carte-${langue.toUpperCase()}-25s.mp4`);
        await p.jusqua('Boolean(document.querySelector("video")?.readyState>=2)');
        const dimensions=await p.evaluer(`(()=>{const v=document.querySelector('video');return [v.videoWidth,v.videoHeight,v.duration]})()`);
        assert.deepEqual(dimensions,[1080,1920,25]);
        await p.evaluer(`(async()=>{const v=document.querySelector('video');v.muted=true;await v.play();return true})()`);await attendre(600);
        assert.ok(await p.evaluer(`document.querySelector('video').currentTime>0`));
        await p.evaluer(`(()=>{const v=document.querySelector('video');v.pause();v.currentTime=24;return true})()`);
        await p.jusqua(`Boolean(document.querySelector('video')?.readyState>=2&&!document.querySelector('video').seeking)`);
        assert.equal(await p.evaluer(`Boolean(document.querySelector('video').error)`),false);
        await p.capture(path.join(captures,`${langue}-${largeur}.png`));
      }
      await p.ouvrir('http://127.0.0.1:5188/scripts/apercuCampagneCartes.html?vue=parcours');
      await p.jusqua('Boolean(document.querySelector(".nav-reglages-mobile"))');await attendre(700);
      await p.evaluer(`document.querySelector(${JSON.stringify(largeur>900?'.nav-bureau button:last-child':'.nav-reglages-mobile')}).click();true`);
      await p.jusqua('Boolean(document.querySelector(".cn-demandes summary"))');await attendre(250);
      assert.equal(await p.evaluer('document.documentElement.scrollWidth>innerWidth'),false);
      console.log(`OK navigateur ${largeur}px : vidéos FR/EN lisibles et parcours réel sans débordement.`);
    }
    assert.deepEqual(erreurs,[]);
  }finally{await p.fermer();fs.rmSync(captures,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
  fs.writeFileSync(path.join(sortie,'verification.json'),JSON.stringify({medias:bilan,navigateur:[1920,390],exceptions:erreurs},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
