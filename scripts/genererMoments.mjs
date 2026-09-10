// Bibliothèque de reconstitutions génériques. Les résultats viennent toujours du serveur.
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {once} from 'node:events';
mkdirSync('public/moments',{recursive:true}); mkdirSync('public/icons',{recursive:true});
const W=960,H=540;
const proj=(x,y,z=0)=>[95+x*7.6+y*.85,435-y*2.75-z*3.4];
const line=(x1,y1,x2,y2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
const segment=(a,b,extra='')=>line(...a,...b,extra);
const poly=pts=>pts.map(p=>proj(...p).join(',')).join(' ');
function joueur(x,y,c,n,t,immobile=false) {
 const [a,b]=proj(x,y); const phase=immobile?0:Math.sin(t*13+n)*4;
 return `<g transform="translate(${a} ${b})"><ellipse cx="4" cy="1" rx="10" ry="3" fill="#000" opacity=".28"/>
 <g stroke="#111f25" stroke-width="4" stroke-linecap="round">${line(-3,-11,-5+phase,0)}${line(3,-11,5-phase,0)}</g>
 <path d="M-5 -25 L5 -25 L7 -10 L-7 -10 Z" fill="${c}" stroke="#fff" stroke-opacity=".2"/>
 <g stroke="#c69c7a" stroke-width="3.4" stroke-linecap="round">${line(-5,-23,-9+phase,-14)}${line(5,-23,9-phase,-14)}</g>
 <circle cy="-31" r="4.6" fill="#c69c7a"/><path d="M-4 -33 Q0 -39 4 -33" fill="#302622"/>
 <text y="-15" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="7" fill="#fff">${n}</text></g>`;
}
function scene(type,v,t,duree) {
 const p=Math.min(1,t/(duree-1)); const kick=['penalite_reussie','transformation','butRate'].includes(type);
 const stop=['penalite','carton','remplacement','jalon'].includes(type);
 const gauche=v===1; const voie=18+v*12;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
 <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#061920"/><stop offset="1" stop-color="#385555"/></linearGradient>
 <linearGradient id="grass" x2="0" y2="1"><stop stop-color="#285844"/><stop offset="1" stop-color="#387b52"/></linearGradient>
 <radialGradient id="light"><stop stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
 </defs><rect width="960" height="540" fill="url(#sky)"/>
 <path d="M0 170 L90 68 L880 68 L960 170V300H0Z" fill="#182c31"/>`;
 for(let row=0;row<9;row++) for(let col=0;col<90;col++) {
 const x=25+col*10.5,y=90+row*9; const c=['#657777','#b1ada0','#374c51','#a0acb0'][(col*7+row*11)%4];
 svg+=`<rect x="${x}" y="${y}" width="4" height="3" fill="${c}" opacity=".65"/>`;
 }
 svg+=`<rect x="0" y="178" width="960" height="28" fill="#0b252c"/><text x="480" y="197" fill="#c4d6ce" font-family="Arial" font-size="13" letter-spacing="8" text-anchor="middle">DESTINY RUGBY · MATCHDAY</text>
 <polygon points="${poly([[-8,-10],[108,-10],[108,80],[-8,80]])}" fill="#214333"/>
 <polygon points="${poly([[0,0],[100,0],[100,70],[0,70]])}" fill="url(#grass)"/>`;
 for(let x=0;x<100;x+=20)svg+=`<polygon points="${poly([[x,0],[x+10,0],[x+10,70],[x,70]])}" fill="#fff" opacity=".035"/>`;
 for(const x of [0,22,50,78,100])svg+=segment(proj(x,0),proj(x,70),'stroke="#e3eee4" stroke-width="1.5" opacity=".7"');
 for(const y of [0,70])svg+=segment(proj(0,y),proj(100,y),'stroke="#e3eee4" stroke-width="2" opacity=".8"');
 for(const y of [5,65])svg+=segment(proj(0,y),proj(100,y),'stroke="#e3eee4" stroke-width="1" stroke-dasharray="8 12" opacity=".45"');
 const acteurs=[]; let bx=0,by=0,bz=0;
 for(let i=0;i<11;i++) {
   let y=8+(i*13)%56,x=kick?75+i%3*6:stop?55+i%4*5:48+p*23+(i%3)*5;
   acteurs.push({x,y,c:'#26343d',n:i+1});
   let ax=kick?40+i%3*7:stop?36+i%4*5:20+p*38+(i%3)*6;
   acteurs.push({x:ax,y:y+3,c:'#b6c5b3',n:i+1});
 }
 if(kick) {
   bx=40+Math.min(1,Math.max(0,(p-.28)/.65))*61;
   by=35+(type==='butRate'?Math.min(1,p)*15:0); bz=p>.28?Math.sin(Math.min(1,(p-.28)/.72)*Math.PI)*13:0;
   acteurs.push({x:38,y:35,c:'#b6c5b3',n:10});
 } else if(stop) {
   bx=50;by=35; acteurs.push({x:56,y:36,c:'#dbac55',n:0});
 } else {
   bx=25+p*(type==='essai'?77:50); by=voie+Math.sin(p*Math.PI*2+v)*5;
   if(p<.34) bx-=5;
   acteurs.push({x:bx,y:by,c:'#b6c5b3',n:v===1?11:v===2?13:14}); bz=2;
 }
 acteurs.sort((a,b)=>b.y-a.y);
 for(const a of acteurs)svg+=joueur(a.x,a.y,a.c,a.n,t,stop||kick);
 for(const x of [0,100]) {
   svg+=segment(proj(x,32),proj(x,32,12),'stroke="#e5ebec" stroke-width="3"');
   svg+=segment(proj(x,38),proj(x,38,12),'stroke="#e5ebec" stroke-width="3"');
   svg+=segment(proj(x,32,3),proj(x,38,3),'stroke="#e5ebec" stroke-width="3"');
 }
 const ballon=proj(bx,by,bz);
 svg+=`<ellipse cx="${ballon[0]}" cy="${ballon[1]-9}" rx="4.5" ry="2.6" fill="#fff7d9" transform="rotate(-25 ${ballon[0]} ${ballon[1]-9})"/>`;
 // La sanction précise reste dans le commentaire : le clip ne présume pas de la couleur du carton.
 svg+=`<rect width="960" height="540" fill="none" stroke="#061613" stroke-width="35" opacity=".15"/>
 <text x="26" y="514" font-family="Arial" font-size="11" letter-spacing="3" fill="#bdd0c6" opacity=".7">RECONSTITUTION · ${gauche?'CAMÉRA 01':v===2?'CAMÉRA 02':'CAMÉRA 03'}</text></svg>`;
 return svg.replace(/<text[\s\S]*?<\/text>/g,'');
}
const types=['essai','transformation','penalite_reussie','butRate','penalite','carton','franchissement','remplacement','jalon'];
const manifest={};
for(const type of types) for(let v=1;v<=3;v++) {
 const id=`${type}_${v}`,duree=type==='essai'?10:7,path=`public/moments/${id}.mp4`;
 manifest[id]={src:`/moments/${id}.mp4`,duree};
 if(existsSync(path) && statSync(path).size > 1000 && !process.argv.includes(id))continue;
 const proc=spawn(ffmpeg,['-y','-f','image2pipe','-vcodec','png','-r','12','-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','ultrafast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',path],{stdio:['pipe','ignore','pipe'],windowsHide:true});
 let erreur='';proc.stderr.on('data',d=>erreur+=d);const fini=new Promise((resolve,reject)=>proc.on('close',code=>code===0?resolve():reject(new Error(erreur))));
 for(let f=0;f<duree*12;f++) {
  const png=await sharp(Buffer.from(scene(type,v,f/12,duree))).resize(640,360).png().toBuffer();
  if(!proc.stdin.write(png))await once(proc.stdin,'drain');
 }
 proc.stdin.end();await fini; console.log(id);
}
writeFileSync('public/moments/catalogue.json',JSON.stringify(manifest,null,2));
await sharp(Buffer.from(scene('essai',2,1,10))).webp({quality:85}).toFile('public/moments/stade.webp');
const icone=`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="110" fill="#123c32"/><ellipse cx="256" cy="238" rx="133" ry="83" fill="#e1c378" transform="rotate(-35 256 238)"/><path d="M173 297L337 182M230 221L251 250M256 203L277 232" stroke="#123c32" stroke-width="14" stroke-linecap="round"/><text x="256" y="401" text-anchor="middle" fill="#fff" font-family="Arial" font-weight="bold" font-size="42">DESTINY</text></svg>`;
for(const size of [192,512])await sharp(Buffer.from(icone)).resize(size,size).png().toFile(`public/icons/icon-${size}.png`);
await sharp(Buffer.from('<svg width="96" height="96" xmlns="http://www.w3.org/2000/svg"><ellipse cx="48" cy="48" rx="34" ry="20" fill="white" transform="rotate(-35 48 48)"/></svg>')).png().toFile('public/icons/badge-96.png');
console.log('27 clips, affiche et icônes générés.');
