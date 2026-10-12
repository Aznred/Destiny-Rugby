// Trois nouveaux montages verticaux depuis les captures du vrai jeu déjà filmées.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');
const racine = path.resolve(__dirname,'..');
const source = path.join(racine,'trailer/work/tiktok-live');
const sortie = path.join(racine,'trailer/tiktok-2026-10-12');
const travail = path.join(sortie,'travail');
fs.mkdirSync(travail,{recursive:true});
const IPS = 30;
const recettes = [
  {nom:'01-prends-le-banc', description:'Tu penses faire mieux que le coach ? Prends le banc, compose ton XV et construis ton club. Carrière solo entraîneur sur destiny-rugby.fr. #DestinyRugby #RugbyManager #Rugby #GamingFR',
    plans:[['03-bureau',.3,3.0,['TU CRITIQUES','LE COACH ?'],'Carrière solo entraîneur'],
      ['04-composition',.4,3.5,['PRENDS','LE BANC.'],'Compose ton XV'],
      ['match-h1-01',1.4,5.0,['TON XV.','TES DÉCISIONS.'],'Mène ton club sur le terrain'],
      ['match-f1-06',1.0,2.5,['DESTINY','RUGBY'],'À toi d’écrire la suite']]},
  {nom:'02-sur-le-terrain', description:'Tu passes ou tu perces ? Crée ta carrière, prends les commandes et vis les matchs de Destiny Rugby. Gratuit dans ton navigateur : destiny-rugby.fr. #DestinyRugby #JeuDeRugby #Rugby #GamingFR',
    plans:[['match-h1-02',.6,3.5,['TU PASSES','OU TU PERCES ?'],'Sur le terrain, décide'],
      ['match-f1-07',.8,4.5,['PRENDS','LES COMMANDES.'],'Un match. Tes choix.'],
      ['match-h1-01',3.0,4.0,['ÉCRIS TA','CARRIÈRE.'],'Du premier match à la légende'],
      ['match-f1-01',4.8,2.0,['DESTINY','RUGBY'],'Joue gratuitement dans ton navigateur']]},
  {nom:'03-construis-ton-xv', description:'Ouvre tes packs, construis ta collection et compose ton équipe. Joueurs et joueuses sont dans Destiny Rugby. À toi de faire les bons choix : destiny-rugby.fr. #DestinyRugby #Rugby #Collection #RugbyGame',
    plans:[['07-collection',.5,3.0,['TON PROCHAIN XV','COMMENCE ICI.'],'Construis ta collection'],
      ['08-ouverture-pack',1.5,4.0,['UN PACK.','LA SURPRISE.'],'Ouvre tes packs'],
      ['08-ouverture-pack',6.0,4.0,['À TOI DE','COMPOSER.'],'Joueurs et joueuses'],
      ['04-composition',.5,3.0,['DESTINY','RUGBY'],'Collectionne. Compose. Joue.']]},
];
const xml = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const scenes = new Map();
function images(scene,debut,duree) {
  const dossier=scene.startsWith('match-') ? path.join(racine,'trailer/work/feminines',scene) : path.join(source,scene);
  if(!scenes.has(scene)) scenes.set(scene,JSON.parse(fs.readFileSync(path.join(dossier,'frames.json'))).frames.sort((a,b)=>a.at-b.at));
  const captures=scenes.get(scene), resultat=[];
  let index=0;
  for(let n=0;n<Math.round(duree*IPS);n++) {
    const temps=(debut+n/IPS)*1000;
    while(index+1<captures.length&&captures[index+1].at<=temps) index++;
    resultat.push(path.join(dossier,captures[index].file).replaceAll('\\','/'));
  }
  return resultat;
}
async function calque(nom,lignes,sous) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <rect width="1080" height="480" fill="#071c15"/><rect y="1440" width="1080" height="480" fill="#071c15"/>
    <path d="M90 91H990" stroke="#f4c86a" stroke-width="3"/>
    <text x="100" y="155" fill="#f4c86a" font-family="Arial" font-size="30" font-weight="bold" letter-spacing="6">DESTINY RUGBY</text>
    ${lignes.map((l,i)=>`<text x="96" y="${278+i*94}" fill="${i?'#f4c86a':'#fff7e9'}" font-family="Arial Black,Arial" font-size="${l.length>16?67:82}" font-weight="900" letter-spacing="-2">${xml(l)}</text>`).join('')}
    <text x="100" y="437" fill="#c3d4c6" font-family="Arial" font-size="30">${xml(sous)}</text>
    <rect x="98" y="478" width="884" height="964" rx="3" fill="none" stroke="#f4c86a" stroke-width="3"/>
    <text x="540" y="1527" text-anchor="middle" fill="#fff7e9" font-family="Arial" font-size="40" font-weight="bold">À TOI DE JOUER.</text>
    <text x="540" y="1602" text-anchor="middle" fill="#f4c86a" font-family="Arial" font-size="44" font-weight="bold">destiny-rugby.fr</text>
    <text x="540" y="1660" text-anchor="middle" fill="#b2c9bc" font-family="Arial" font-size="26" letter-spacing="2">GRATUIT · DANS TON NAVIGATEUR</text>
    <text x="540" y="1760" text-anchor="middle" fill="#b2c9bc" font-family="Arial" font-size="25">Lien en bio</text>
  </svg>`;
  const fichier=path.join(travail,nom+'.png');
  await sharp(Buffer.from(svg)).png().toFile(fichier);
  return fichier;
}
function executer(args) {
  const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',timeout:300000,windowsHide:true});
  if(r.status!==0)throw new Error(r.stderr||'Montage vidéo interrompu.');
}
async function monter(recette) {
  const morceaux=[];
  for(let i=0;i<recette.plans.length;i++) {
    const [scene,debut,duree,lignes,sous]=recette.plans[i];
    const captures=images(scene,debut,duree), liste=path.join(travail,`${recette.nom}-${i}.txt`);
    fs.writeFileSync(liste,captures.map(p=>`file '${p}'\nduration ${1/IPS}`).join('\n')+`\nfile '${captures.at(-1)}'\n`);
    const masque=await calque(`${recette.nom}-${i}`,lignes,sous);
    const morceau=path.join(travail,`${recette.nom}-${i}.mp4`);
    executer(['-f','concat','-safe','0','-i',liste,'-i',masque,'-filter_complex',
      '[0:v]fps=30,scale=880:960:force_original_aspect_ratio=increase:flags=lanczos,crop=880:960,pad=1080:1920:100:480:color=0x071c15[v];[v][1:v]overlay=0:0,format=yuv420p[o]',
      '-map','[o]','-t',String(duree),'-r','30','-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','19',morceau]);
    morceaux.push(morceau.replaceAll('\\','/'));
  }
  const liste=path.join(travail,recette.nom+'-montage.txt');
  fs.writeFileSync(liste,morceaux.map(p=>`file '${p}'`).join('\n'));
  const video=path.join(sortie,recette.nom+'.mp4');
  executer(['-f','concat','-safe','0','-i',liste,'-c','copy','-movflags','+faststart',video]);
  executer(['-i',video,'-f','null','-']); // Vérification du décodage du fichier entier.
  executer(['-ss','1','-i',video,'-frames:v','1',path.join(sortie,recette.nom+'.jpg')]);
  console.log(`${recette.nom} : ${recette.plans.reduce((s,p)=>s+p[2],0)} s · ${(fs.statSync(video).size/1e6).toFixed(1)} Mo`);
}
(async()=>{
  for(const recette of recettes) await monter(recette);
  fs.writeFileSync(path.join(sortie,'legendes.md'),recettes.map(r=>`## ${r.nom}\n\n${r.description}\n`).join('\n')+
    '\nFormat : 1080 × 1920, 30 images/seconde. Vidéos muettes, prêtes à recevoir un son dans TikTok. Captures du vrai jeu ; aucune publication automatique.\n');
  console.log('Trois publicités et leurs légendes sont prêtes.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
