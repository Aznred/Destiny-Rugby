const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const sharp=require('sharp');
const ffmpeg=require('ffmpeg-static');
const {racine,sortie,langues,scenes}=require('./configuration.cjs');
const xml=t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function executer(args,travail){
  const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{cwd:travail,encoding:'utf8',windowsHide:true,timeout:300000});
  if(r.status!==0)throw new Error(r.stderr||`Montage interrompu : ${r.status}`);
}
function lignes(texte,maximum=23){
  if(Array.isArray(texte))return texte;
  const mots=texte.split(' '),l=[];let ligne='';
  for(const mot of mots){if(ligne&&(ligne+' '+mot).length>maximum){l.push(ligne);ligne=mot;}else ligne+=(ligne?' ':'')+mot;}
  if(ligne)l.push(ligne);return l;
}
const horloge=t=>`${Math.floor(t/3600)}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
const horlogeSrt=t=>`${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')},${String(Math.round(t%1*1000)).padStart(3,'0')}`;
function sousTitres(langue,travail){
  const d=langues[langue];
  const entete=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Parole,Arial,58,&H0068D6FF,&H00FFFFFF,&H00100B06,&H90000000,-1,0,0,0,100,100,0,0,1,4,3,2,95,95,278,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const dialogues=d.sousTitres.filter(([debut])=>debut<21).map(([debut,fin,texte])=>{
    const mots=texte.split(' '),pas=Math.floor((fin-debut)*100/mots.length);
    const karaoke=mots.map(m=>`{\\kf${pas}\\fs${m===m.toUpperCase()&&/[A-ZÀÉÈ]/.test(m)?68:58}}${m}`).join(' ');
    return `Dialogue: 2,${horloge(debut)},${horloge(fin)},Parole,,0,0,0,,{\\fad(35,45)\\fscx92\\fscy92\\t(0,110,\\fscx100\\fscy100)}${karaoke}`;
  }).join('\n');
  fs.writeFileSync(path.join(travail,langue+'.ass'),entete+dialogues+'\n');
  fs.writeFileSync(path.join(sortie,`Sous-titres-${langue}.srt`),d.sousTitres.map(([a,b,t],i)=>`${i+1}\n${horlogeSrt(a)} --> ${horlogeSrt(b)}\n${t}\n`).join('\n'));
  fs.writeFileSync(path.join(sortie,`Voix-${langue}-a-doubler.txt`),`DESTINY RUGBY — ${langue.toUpperCase()} — 25 s\n\nVoix énergique, directe, sourire dans la voix. Aucun nom de personne à imiter.\nLe hook est volontairement rapide. Les timecodes sont des repères de montage, pas un alignement vocal mesuré.\nLes propositions sont soumises à vérification avant publication.\n\n`+d.voix.map(([a,b,t])=>`${a.toFixed(1)}–${b.toFixed(1)} s\n${t}\n`).join('\n'));
  fs.writeFileSync(path.join(sortie,`Reperes-voix-${langue}.csv`),'debut;fin;texte\n'+d.voix.map(([a,b,t])=>`${a};${b};"${t.replaceAll('"','""')}"`).join('\n'));
}
async function fond(travail){
  const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><radialGradient id="h"><stop stop-color="#143b32" stop-opacity=".72"/><stop offset="1" stop-color="#020906" stop-opacity=".97"/></radialGradient><linearGradient id="l" x2="0" y2="1"><stop stop-color="#ffe2a0" stop-opacity=".22"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#h)"/><path d="M20 0 L600 1500 L250 900Z M1060 0 L470 1500 L810 900Z" fill="url(#l)"/><g stroke="#e6c775" opacity=".14" fill="none"><path d="M-200 1900L440 1000M1280 1900L640 1000M540 1920V1080M0 1540H1080M0 1780H1080"/><ellipse cx="540" cy="1380" rx="440" ry="110"/><ellipse cx="540" cy="1380" rx="360" ry="88"/></g><path d="M64 292H1016" stroke="#ebcc78" stroke-opacity=".22"/></svg>`);
  await sharp(path.join(sortie,'sources/terrain.png')).resize(1080,1920).blur(18).composite([{input:svg}]).png().toFile(path.join(travail,'fond.png'));
}
async function calque(langue,scene,travail){
  const d=langues[langue],fin=scene.type==='final';
  const titre=lignes(d[scene.titre],scene.titre==='hook'?23:26);
  const texte=titre.map((l,i)=>`<text x="540" y="${155+i*88}" text-anchor="middle" font-family="Impact" font-size="${l.length>25?65:80}" fill="${i?'#ffd668':'#fff9ed'}" stroke="#06110b" stroke-width="5" paint-order="stroke" letter-spacing="1">${xml(l)}</text>`).join('');
  const bandeau=scene.debut>=8&&scene.fin<=15?`<rect x="65" y="1430" width="950" height="70" rx="8" fill="#081810" stroke="#c6a65d" stroke-opacity=".5"/><text x="540" y="1475" text-anchor="middle" font-family="Arial" font-size="${langue==='en'?25:30}" font-weight="700" fill="#ffe2a0">${xml(d.examen)}</text>`:'';
  const final=fin?`<text x="540" y="1125" text-anchor="middle" font-family="Impact" font-size="132" letter-spacing="8" fill="#fff9ed">DESTINY</text><text x="540" y="1250" text-anchor="middle" font-family="Impact" font-size="145" letter-spacing="12" fill="#ffd668">RUGBY</text><rect x="104" y="1325" width="872" height="106" rx="8" fill="#ffd668"/><text x="540" y="1397" text-anchor="middle" fill="#07140c" font-family="Arial" font-weight="900" font-size="60">DESTINY-RUGBY.FR</text><text x="540" y="1500" text-anchor="middle" font-family="Arial" font-weight="900" font-size="44" fill="#fff9ed">${xml(langue==='en'?'FIND YOUR CARD — FREE TO PLAY':'TROUVE TA CARTE — GRATUIT')}</text><text x="540" y="1605" text-anchor="middle" font-family="Arial" font-weight="700" font-size="30" fill="#c8d9c8">${xml(d.commentaire)}</text>`:'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><linearGradient id="haut" x2="0" y2="1"><stop stop-color="#020905" stop-opacity=".98"/><stop offset="1" stop-color="#020905" stop-opacity="0"/></linearGradient><linearGradient id="bas" x2="0" y2="1"><stop stop-color="#020905" stop-opacity="0"/><stop offset=".4" stop-color="#020905" stop-opacity=".96"/></linearGradient></defs><rect width="1080" height="340" fill="url(#haut)"/><rect y="1370" width="1080" height="550" fill="url(#bas)"/>${texte}${bandeau}${final}${scene.debut>=3&&!fin?'<text x="540" y="1740" text-anchor="middle" fill="#e7cf8a" font-family="Arial" font-size="26" letter-spacing="5">DESTINY RUGBY</text>':''}</svg>`;
  const fichier=path.join(travail,`${langue}-${scene.nom}-calque.png`);await sharp(Buffer.from(svg)).png().toFile(fichier);return fichier;
}
async function sequence(langue,scene,travail){
  const duree=scene.fin-scene.debut,entrees=['-loop','1','-framerate','60','-i',path.join(travail,'fond.png')],filtres=[];
  let prochain=1,base='fond';
  filtres.push('[0:v]format=rgba[fond]');
  const entreeImage=fichier=>{const n=prochain++;entrees.push('-loop','1','-framerate','60','-i',fichier);return n;};
  const entreeVideo=(fichier,debut=0)=>{const n=prochain++;if(debut)entrees.push('-ss',String(debut));entrees.push('-i',fichier);return n;};
  const incruster=(n,preparation,x,y,nom)=>{filtres.push(`[${n}:v]${preparation}[${nom}];[${base}][${nom}]overlay=x='${x}':y='${y}':shortest=1[${nom}fond]`);base=nom+'fond';};
  const carte=(i,largeur,x,y,nom,angle=0,revelation=false)=>{
    const n=entreeImage(path.join(sortie,`sources/${langue}-carte-${i}.png`));
    const taille=`scale=${largeur}:${largeur*1.5},setsar=1${revelation?',format=rgba,fade=t=in:st=0:d=0.10:alpha=1':''}`;
    incruster(n,`${taille},format=rgba,pad=iw+120:ih+120:60:60:color=0x00000000,rotate='${angle}+.025*sin(t*2)':ow=iw:oh=ih:c=none`,x,y,nom);
  };
  if(scene.type==='carte')carte(scene.i,640,'(W-w)/2+9*sin(t*3)','255+15*sin(t*2)','carte',0,!!scene.revelation);
  else if(scene.type==='duo'){
    carte(scene.indices[0],500,'-55+15*sin(t*2)',345,'gauche',-.10);
    carte(scene.indices[1],500,'485-15*sin(t*2)',430,'droite',.10);
  }else if(scene.type==='collection'||scene.type==='final'){
    const fin=scene.type==='final';
    carte(1,fin?320:390,fin?'30':'-80',fin?'350':'450','gauche',-.14);
    carte(5,fin?320:390,fin?'610':'650',fin?'350':'450','droite',.14);
    carte(0,fin?380:470,'(W-w)/2',fin?'390':'300','centre',0);
    if(fin){const n=entreeImage(path.join(travail,'logo.png'));incruster(n,'scale=104:104','488','922','logo');}
  }else if(scene.type==='ecran'){
    const n=entreeImage(path.join(sortie,`sources/${langue}-${scene.image}.png`));
    const cadres={parametres:[0,710,540,150],menu:[0,475,540,400],recherche:[0,430,540,470]};
    const cadre=cadres[scene.image];
    if(cadre){const [x,y,w,h]=cadre;incruster(n,`crop=${w}:${h}:${x}:${y},scale=900:-1,format=rgba`,'90',String(820-h*900/w/2),'interface');}
    else incruster(n,"scale=900:1600,crop=900:1080:0:150,zoompan=z='1+on*.00018':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=900x1080:fps=60",'90','310','interface');
  }else if(scene.type==='match'){
    const n=entreeVideo(path.join(sortie,'sources/match.mp4'),scene.nom==='equipe'?1.3:0);
    incruster(n,'scale=1080:1920,format=rgba','0','0','terrain');
  }else if(scene.type==='pack'){
    const n=entreeVideo(path.join(sortie,`sources/pack-${langue}.mp4`));
    incruster(n,'scale=1080:1920,eq=brightness=-0.07:contrast=1.15','0','0','pochette');
  }
  const n=entreeImage(await calque(langue,scene,travail));
  filtres.push(`[${base}][${n}:v]overlay=0:0:shortest=1,format=yuv420p[o]`);
  const fichier=path.join(travail,`${langue}-${scene.nom}.mp4`);
  executer([...entrees,'-filter_complex',filtres.join(';'),'-map','[o]','-t',String(duree),'-frames:v',String(Math.round(duree*60)),'-r','60','-an','-c:v','libx264','-threads','4','-filter_complex_threads','2','-preset','fast','-crf','18',fichier],travail);
  return fichier;
}
async function monter(travail){
  fs.mkdirSync(path.join(travail,'polices'));
  for(const f of ['impact.ttf','arialbd.ttf'])if(fs.existsSync('C:/Windows/Fonts/'+f))fs.copyFileSync('C:/Windows/Fonts/'+f,path.join(travail,'polices',f));
  await fond(travail);
  await sharp(path.join(racine,'public/favicon.svg')).resize(104,104).png().toFile(path.join(travail,'logo.png'));
  const son=require('./son.cjs').composer(travail);
  for(const langue of ['fr','en']){
    sousTitres(langue,travail);const fichiers=[];
    for(const scene of scenes){fichiers.push(await sequence(langue,scene,travail));console.log(`${langue} : ${scene.nom} (${scene.debut}–${scene.fin} s).`);}
    const liste=path.join(travail,langue+'-montage.txt');fs.writeFileSync(liste,fichiers.map(f=>`file '${f.replaceAll('\\','/')}'`).join('\n'));
    const muet=path.join(travail,langue+'-muet.mp4');executer(['-f','concat','-safe','0','-i',liste,'-c','copy',muet],travail);
    const video=path.join(sortie,`Destiny-Rugby-Ta-Carte-${langue.toUpperCase()}-25s.mp4`);
    executer(['-i',muet,'-i',son,'-vf',`ass=filename=${langue}.ass:fontsdir=polices`,'-map','0:v:0','-map','1:a:0','-t','25','-c:v','libx264','-threads','4','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','60','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',video],travail);
    executer(['-ss','1.85','-i',video,'-frames:v','1','-q:v','2',path.join(sortie,`Apercu-${langue}.jpg`)],travail);
    const choix=scenes.map(s=>`eq(n,${Math.round((s.debut+s.fin)/2*60)})`).join('+');
    executer(['-i',video,'-vf',`select='${choix}',scale=270:480,tile=6x3`,'-frames:v','1','-q:v','2',path.join(sortie,`Plans-${langue}.jpg`)],travail);
    console.log(`Export ${langue} : ${(fs.statSync(video).size/1048576).toFixed(1)} Mo.`);
  }
  fs.writeFileSync(path.join(sortie,'montage.json'),JSON.stringify({largeur:1080,hauteur:1920,fps:60,duree:25,voixOff:false,motif:'À doubler : choix explicite du demandeur après vérification du quota ElevenLabs.',scenes},null,2));
}
module.exports={monter};
