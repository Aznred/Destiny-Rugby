// Production locale de rushes : enregistre les images du vrai rendu Vite.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const dir=__dirname,base='http://127.0.0.1:5197',pause=ms=>new Promise(r=>setTimeout(r,ms));
const mode=process.argv[2]||'fr',port=9256;
async function main(){
 const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
 '--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${path.resolve(dir,'../../node_modules/.capture-trailers-oct12')}`,
 '--use-gl=angle','--use-angle=d3d11','--no-first-run','--hide-scrollbars','--autoplay-policy=no-user-gesture-required','--mute-audio','about:blank'],{windowsHide:true,stdio:'ignore'});
 let ws;try{
 let tab;for(let n=0;n<100&&!tab;n++){try{tab=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');}catch{}if(!tab)await pause(150);}
 if(!tab)throw Error('Le moteur de capture ne démarre pas');
 ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let id=1,actuel=null;const demandes=new Map();
 ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.method==='Page.screencastFrame'){
  if(actuel){const file=String(actuel.frames.length).padStart(5,'0')+'.jpg';fs.writeFileSync(path.join(actuel.dir,file),Buffer.from(m.params.data,'base64'));actuel.frames.push({file,at:(m.params.metadata.timestamp-actuel.debut)*1000});}
  ws.send(JSON.stringify({id:id++,method:'Page.screencastFrameAck',params:{sessionId:m.params.sessionId}}));return;}
  const q=demandes.get(m.id);if(!q)return;demandes.delete(m.id);m.error?q.j(Error(m.error.message)):q.r(m.result);};
 const send=(method,params={})=>new Promise((r,j)=>{const n=id++;demandes.set(n,{r,j});ws.send(JSON.stringify({id:n,method,params}));});
 const ev=async expression=>{const x=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(x.exceptionDetails)throw Error(x.exceptionDetails.exception?.description||x.exceptionDetails.text);return x.result.value;};
 const nav=async url=>{await send('Page.navigate',{url:base+url});await pause(3500);};
 const attendre=async exp=>{for(let i=0;i<120;i++){if(await ev(exp).catch(()=>false))return;await pause(250);}throw Error('Attente expirée : '+exp);};
 const filmer=async(nom,duree,action)=>{
  const dossier=path.join(dir,'rushes',nom);fs.mkdirSync(dossier,{recursive:true});
  const first=await send('Page.captureScreenshot',{format:'jpeg',quality:92});fs.writeFileSync(path.join(dossier,'00000.jpg'),Buffer.from(first.data,'base64'));
  actuel={dir:dossier,debut:Date.now()/1000,frames:[{file:'00000.jpg',at:0}]};
  await send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:1080,maxHeight:1920,everyNthFrame:1});
  if(action)await action();await pause(duree*1000);await send('Page.stopScreencast');
  const data=actuel;actuel=null;data.frames=data.frames.map(f=>({...f,at:Math.max(0,f.at)})).sort((a,b)=>a.at-b.at);
  fs.writeFileSync(path.join(dossier,'frames.json'),JSON.stringify({duration:duree*1000,frames:data.frames},null,1));console.log(nom+': '+data.frames.length+' images');
 };
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:540,height:960,deviceScaleFactor:2,mobile:false});
 if(mode==='fr'||mode==='en'){
  const lang=mode;
  for(const femme of [false,true]){
   if(fs.existsSync(path.join(dir,'rushes',`${lang}-${femme?'femmes':'pack'}`,'frames.json')))continue;
   await nav(`/trailer/capture-2026-10-12/plateau.html?lang=${lang}${femme?'&femme=1':''}`);
   await attendre('Boolean(document.querySelector("canvas[data-ready=true]"))');
   const source=await ev('window.__provenance');fs.writeFileSync(path.join(dir,`cartes-${lang}-${femme?'femmes':'hommes'}.json`),JSON.stringify(source,null,2));
   await filmer(`${lang}-${femme?'femmes':'pack'}`,15,()=>ev('document.querySelector(".pack-show-touch").click()'));
  }
  const clubs=lang==='fr'?['Stade Toulousain','Union Bordeaux Bègles','Stade Rochelais','RC Toulon','Meze Rugby Club']:['Leinster','Saracens','Munster','Stade Toulousain','Crusaders'];
  for(let i=0;i<clubs.length;i++){
   if(fs.existsSync(path.join(dir,'rushes',`${lang}-club-${i}`,'frames.json')))continue;
   await nav(`/trailer/capture-2026-10-12/plateau.html?lang=${lang}&club=${encodeURIComponent(clubs[i])}`);
   await attendre('Boolean(document.querySelector(".fiche-club"))');
   await filmer(`${lang}-club-${i}`,2.5,()=>ev('document.querySelector(".fiche-club")?.scrollBy({top:220,behavior:"smooth"})'));
  }
  await nav('/');await ev(`localStorage.setItem('destiny-rugby:tutoriel',JSON.stringify({v:1,vus:{},desactive:true}))`);
  await nav('/');await ev(`document.querySelector('button') && [...document.querySelectorAll('button')].find(b=>/Passer|Skip/.test(b.textContent))?.click()`);
  const state=expr=>ev(`(async()=>{const {useGame}=await import('/src/store/useGame.ts');return ${expr}})()`);
  await state(`useGame.getState().setLangue('${lang}')`);
  await state(`useGame.getState().setEcran('creation')`);await pause(1200);await filmer(`${lang}-creation`,4);
  await state(`useGame.getState().creerManager({nom:'Alex Martin',nation:'France',club:'Stade Toulousain',age:34,libre:true})`);await pause(1600);
  await filmer(`${lang}-manager`,4);
  await ev('document.querySelector(".manager-onglets button:nth-child(2)")?.click()');await pause(1200);await filmer(`${lang}-composition`,5);
  await state(`useGame.getState().setEcran('collectionSolo')`);await pause(6000);await filmer(`${lang}-boutique`,5,()=>ev('document.querySelector(".bp3-fleche.droite")?.click()'));
  await state(`useGame.getState().setEcran('carriereEnLigne')`);await pause(3000);await filmer(`${lang}-online`,4);
 }else{
  const femme=mode==='match-f';await nav(`/rn26/index.html?stade=grand${femme?'&genre=femme':''}`);
  await attendre('Boolean(window.rn26?.match && window.rn26?.scene3D)');
  await ev(`(()=>{const s=document.createElement('style');s.textContent='header,aside,#status,#saved,body>div:not(#scene){display:none!important} html,body{margin:0;overflow:hidden;background:#000} #scene{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important}';document.head.append(s);window.dispatchEvent(new Event('resize'));const c=document.querySelector('#camera');c.value='close';c.dispatchEvent(new Event('change',{bubbles:true}));rn26.scene3D.recadrer()})()`);
  await pause(4000);await filmer(mode,50);
 }
 }finally{ws?.close();chrome.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
