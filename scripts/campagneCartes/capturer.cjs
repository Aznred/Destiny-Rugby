const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const ffmpeg = require('ffmpeg-static');
const {ouvrirNavigateur,attendre} = require('../outilsNavigateur.cjs');
const {sortie} = require('./configuration.cjs');
const base = process.env.DESTINY_URL || 'http://127.0.0.1:5188';
function encoder(travail,nom,nombre){
  const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-framerate','60','-i',path.join(travail,nom+'-%04d.png'),'-frames:v',String(nombre),'-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p',path.join(sortie,'sources',nom+'.mp4')],{encoding:'utf8',windowsHide:true});
  if(r.status!==0)throw new Error(r.stderr);
}
async function capturer(travail){
  const dossier=path.join(sortie,'sources');fs.mkdirSync(dossier,{recursive:true});
  const p=await ouvrirNavigateur({largeur:480,hauteur:720,port:9281});
  const erreurs=[];
  p.ecouter('Runtime.exceptionThrown',e=>erreurs.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
  const imagesPretes=()=>p.evaluer(`Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{});})).then(()=>true)`);
  const cliquer=texte=>p.evaluer(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(texte)}));if(!b)throw Error('Commande absente');b.click();return true})()`);
  const texteChamp=async(selecteur,texte)=>{
    await p.evaluer(`(()=>{const e=document.querySelector(${JSON.stringify(selecteur)});if(!e)throw Error('Champ absent');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(e,${JSON.stringify(texte)});e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);await attendre(80);
  };
  const centrer=selecteur=>p.evaluer(`document.querySelector(${JSON.stringify(selecteur)}).scrollIntoView({block:'center',behavior:'instant'});true`);
  try{
    for(const langue of ['fr','en']){
      await p.dimensions(480,720);
      await p.envoyer('Emulation.setDeviceMetricsOverride',{width:480,height:720,deviceScaleFactor:2,mobile:false});
      await p.envoyer('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
      await p.ouvrir(`${base}/scripts/apercuCampagneCartes.html?lang=${langue}&vue=carte`);
      await p.jusqua('Boolean(window.__choisirCarte && document.querySelector(".dr-player-photo"))');
      const cartes=await p.evaluer('window.__tournageCartes.cartes');
      assert.equal(cartes.length,6);assert.ok(cartes.some(c=>c.genre==='female'));
      fs.writeFileSync(path.join(dossier,langue+'-cartes.json'),JSON.stringify(cartes,null,2));
      for(let i=0;i<6;i++){
        await p.evaluer(`window.__choisirCarte(${i});true`);await attendre(150);await imagesPretes();
        await p.capture(path.join(dossier,`${langue}-carte-${i}.png`));
      }
      console.log(`Cartes ${langue} : ${cartes.map(c=>c.nom).join(', ')}.`);
      await p.dimensions(540,960);
      await p.envoyer('Emulation.setDefaultBackgroundColorOverride',{color:{r:7,g:20,b:14,a:1}});
      await p.ouvrir(`${base}/scripts/apercuCampagneCartes.html?lang=${langue}&vue=parcours`);
      await p.jusqua('Boolean(document.querySelector(".nav-reglages-mobile"))');
      await attendre(800);
      await p.evaluer(`document.querySelector('.nav-reglages-mobile').click();true`);
      await p.jusqua('Boolean(document.querySelector(".cn-demandes summary"))');
      // Le cadrage se place directement sur Contribution, à l'écart des champs de clés.
      await centrer('.cn-demandes summary');await attendre(250);
      await p.capture(path.join(dossier,`${langue}-parametres.png`));
      await p.evaluer(`document.querySelector('.cn-demandes').open=true;true`);await attendre(150);
      await centrer('.cn-demandes summary');
      await p.capture(path.join(dossier,`${langue}-menu.png`));
      await cliquer('Ouvrir le menu complet');
      await p.jusqua('Boolean(document.querySelector(".complete-carte-bloc-recherche input")) && !document.querySelector(".overlay")');
      await centrer('.complete-carte-bloc-recherche');
      const recherche=langue==='fr'?'Antoine Dupont':'Marcus Smith';
      await texteChamp('.complete-carte-bloc-recherche input',recherche);
      await cliquer('Rechercher');
      await p.jusqua('Boolean(document.querySelector(".cn-carte-choix"))');await imagesPretes();
      await p.capture(path.join(dossier,`${langue}-recherche.png`));
      await p.evaluer(`(()=>{const b=[...document.querySelectorAll('.cn-carte-choix')].find(b=>b.querySelector('b').textContent===${JSON.stringify(cartes[0].nom)});if(!b)throw Error('Carte recherchée absente');b.click();return true})()`);
      await p.jusqua('Boolean(document.querySelector(".complete-carte-formulaire-conteneur .cn-formulaire"))');
      await centrer('.cn-formulaire fieldset');await imagesPretes();
      await p.capture(path.join(dossier,`${langue}-champs.png`));
      await centrer('.cn-formulaire input[type="file"]');
      await p.capture(path.join(dossier,`${langue}-photo.png`));
      assert.equal(await p.evaluer('document.documentElement.scrollWidth>innerWidth'),false);
      console.log(`Parcours réel ${langue} : paramètres, menu, recherche, formulaire et photo, sans envoi.`);
    }
    if(process.argv.includes('--parcours')){assert.deepEqual(erreurs,[]);return;}
    await p.dimensions(720,1280);
    await p.ouvrir(base+'/rn26/index.html?banc=1&stade=grand');
    await p.jusqua('Boolean(window.rn26?.match && window.rn26?.scene3D)');
    await p.evaluer(`(()=>{const pause=document.querySelector('#pause');if(pause?.textContent==='Pause')pause.click();const camera=document.querySelector('#camera');camera.value='close';camera.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#phase').value='aplatissage';document.querySelector('#observe').click();const s=document.createElement('style');s.textContent='header,aside,#status,#saved,body>div:not(#scene){display:none!important}html,body{margin:0;overflow:hidden;background:#07130f}#scene{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}';document.head.appendChild(s);rn26.scene3D.television={ralentis:false};rn26.scene3D.recadrer();return true})()`);
    for(let i=0;i<180;i++){
      await p.evaluer('rn26.match.step(1/60);rn26.scene3D.image(1/60,{vitesse:1});true');
      await p.capture(path.join(travail,`match-${String(i).padStart(4,'0')}.png`));
      if(i%60===0)console.log(`Match 3D : ${i}/180 images.`);
    }
    encoder(travail,'match',180);
    fs.copyFileSync(path.join(travail,'match-0080.png'),path.join(dossier,'terrain.png'));
    for(const langue of ['fr','en']){
      await p.ouvrir(`${base}/scripts/apercuCampagneCartes.html?lang=${langue}&vue=pack`);
      await p.jusqua('Boolean(document.querySelector("canvas[data-ready=true]"))');
      for(let i=0;i<72;i++){
        await p.capture(path.join(travail,`pack-${langue}-${String(i).padStart(4,'0')}.png`));
      }
      encoder(travail,'pack-'+langue,72);
      console.log(`Pochette 3D ${langue} capturée.`);
    }
    await p.dimensions(540,960);
    await p.ouvrir('https://www.destiny-rugby.fr/');
    await p.jusqua('Boolean(document.querySelector("main"))');
    await p.evaluer(`(()=>{[...document.querySelectorAll('button')].find(b=>/^(Passer|Skip)$/.test(b.textContent.trim()))?.click();return true})()`);
    await attendre(800);await imagesPretes();
    await p.capture(path.join(dossier,'site-en-ligne.png'));
    assert.deepEqual(erreurs,[],'Aucune exception dans les composants capturés.');
  }finally{await p.fermer();}
}
module.exports={capturer};
