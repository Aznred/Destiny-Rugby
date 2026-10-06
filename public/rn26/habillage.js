import * as THREE from '/rn26/vendor/three/build/three.module.js';

// ---------------------------------------------------------------------------
// HABILLAGE DU MATCH : tenues, panneaux, poteaux, tribunes, nom du porteur
// ---------------------------------------------------------------------------
// Tout est repeint sur des toiles à partir des atlas d'origine : les UV du
// stade et des joueurs ne changent pas, seules les couleurs deviennent celles
// de l'affiche du jour.

const borne=(v,a,b)=>Math.max(a,Math.min(b,v));
let pinceau=null;
/** Couleur CSS quelconque (hex, hsl, nom) → [r, g, b] sur 255. Le navigateur fait la lecture. */
export function rgb(c){
  pinceau??=document.createElement('canvas').getContext('2d');
  pinceau.fillStyle='#344054';pinceau.fillStyle=String(c||'#344054');
  const m=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(pinceau.fillStyle);
  if(m)return [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)];
  const n=/rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/.exec(pinceau.fillStyle);
  return n?[+n[1],+n[2],+n[3]]:[52,64,84];
}
export const hexa=c=>'#'+rgb(c).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
export const luminance=c=>{const [r,g,b]=Array.isArray(c)?c:rgb(c);return (r*.299+g*.587+b*.114)/255;};
const melange=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const css=c=>`rgb(${c.map(v=>Math.round(borne(v,0,255))).join(',')})`;
const ecart=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function toile(l,h=l){const c=document.createElement('canvas');c.width=l;c.height=h;return c;}
export function texture(canvas,renderer,retournee=false){
  const t=new THREE.CanvasTexture(canvas);t.flipY=retournee;t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=renderer?.capabilities.getMaxAnisotropy()||1;return t;
}
export function chargerImage(url){
  return new Promise(resolve=>{if(!url)return resolve(null);const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=url;});
}

// ---------------------------------------------------------------------------
// TENUES
// ---------------------------------------------------------------------------
export const MAILLOT_DEFAUT={principal:'#0b2a6b',secondaire:'#f3efe2',accent:'#ffffff',short:'#f3f3f0',chaussettes:'#c8202a',motif:'uni'};
/**
 * ⚠️ DEUX ÉQUIPES SE RECONNAISSENT D'UN COUP D'ŒIL. Quand les deux couleurs
 * principales sont trop voisines, l'équipe qui se déplace joue en tenue
 * extérieure : son principal et son secondaire sont échangés, et si cela ne
 * suffit pas encore, elle passe en blanc ou en anthracite.
 */
export function departagerTenues(domicile,exterieur){
  const a=rgb(domicile.principal);let e={...exterieur};
  if(ecart(a,rgb(e.principal))>=95)return [domicile,e];
  if(ecart(a,rgb(e.secondaire))>=110)e={...e,principal:exterieur.secondaire,secondaire:exterieur.principal,chaussettes:exterieur.secondaire,short:luminance(exterieur.secondaire)>.6?exterieur.principal:exterieur.short};
  else{const clair=luminance(a)<.5;e={...e,principal:clair?'#f1efe6':'#22262c',secondaire:exterieur.principal,accent:exterieur.principal,chaussettes:clair?'#f1efe6':'#22262c',short:clair?exterieur.principal:'#f1efe6'};}
  // Deux maillots cerclés ou rayés des mêmes couleurs se confondent même inversés : le visiteur joue uni.
  if(['cerceaux','rayures'].includes(domicile.motif)||['cerceaux','rayures'].includes(e.motif))e.motif='uni';
  return [domicile,e];
}
// Emplacements des marques de l'atlas d'origine (repère 2048) : on les fond dans le tissu.
// ⚠️ La marque de l'éditeur d'origine descend jusqu'à y = 1517 : la zone s'arrêtait
// à 1475 et laissait son nom lisible sur chaque poitrine.
const MARQUES=[[340,1405,115,125],[572,1380,105,115]];
/** Où se coud la marque Destiny Rugby, à la place de celle de l'atlas d'origine. */
const MARQUE_DESTINY={x:403,y:1486};
const MARQUE_SHORT=[395,295,60,70];
const ECUSSON={x:622,y:1437,taille:118};
/**
 * La tenue d'une équipe : l'atlas France d'origine (maillot bleu, short blanc,
 * bas rouges) repeint pixel par pixel. Les ombres et les coutures de l'atlas
 * sont conservées — seule la teinte change — puis l'écusson est cousu sur la
 * poitrine.
 */
export function creerTenue(source,maillot,ecusson,taille=1024){
  const m={...MAILLOT_DEFAUT,...maillot},c=toile(taille),ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(source,0,0,taille,taille);
  const image=ctx.getImageData(0,0,taille,taille),d=image.data,k=2048/taille;
  const P=rgb(m.principal),S=rgb(m.secondaire),A=rgb(m.accent),SH=rgb(m.short),CH=rgb(m.chaussettes);
  const dans=(X,Y,[x,y,l,h])=>X>=x&&X<x+l&&Y>=y&&Y<y+h;
  const tissu=(X,Y,t)=>{
    // `t` : 0 sur le corps du maillot, 1 sur les empiècements de l'atlas.
    let base=P;
    if(m.motif==='cerceaux'&&Math.floor((Y+20)/118)%2)base=S;
    else if(m.motif==='rayures'&&Math.floor(X/84)%2)base=S;
    else if(m.motif==='diagonale'&&Math.abs((X-500)*.82-(Y-1240)*.57)<74)base=S;
    const empiecement=m.motif==='epaules'||m.motif==='bande'?S:melange(base,luminance(base)>.5?[0,0,0]:[255,255,255],.13);
    return melange(base,empiecement,t);
  };
  for(let y=0;y<taille;y++)for(let x=0;x<taille;x++){
    const i=(y*taille+x)*4,r=d[i],g=d[i+1],b=d[i+2],X=x*k,Y=y*k;
    let cible=null,ombre=1;
    const marque=MARQUES.some(z=>dans(X,Y,z));
    if(marque||b>r+22&&b>g+8){
      if(!marque&&X>815&&Y>1445){cible=S;ombre=borne((r+g+b)/3/78,.75,1.1);}
      else cible=tissu(X,Y,marque?0:borne((b-98)/52,0,1));
    }else if(r>165&&g<75&&b<75){cible=CH;ombre=borne(r/216,.7,1.05);}
    else if(r>200&&g>200&&b>200||dans(X,Y,MARQUE_SHORT)){
      if(Y<462&&X<1345){cible=SH;ombre=dans(X,Y,MARQUE_SHORT)?1:borne((r+g+b)/3/240,.78,1.02);}
      else if(X>1420&&X<1530&&Y>470&&Y<925||X<135&&Y>1530)cible=A;
    }
    if(cible){d[i]=cible[0]*ombre;d[i+1]=cible[1]*ombre;d[i+2]=cible[2]*ombre;}
  }
  ctx.putImageData(image,0,0);
  if(ecusson){
    const t=ECUSSON.taille/k,ratio=ecusson.width/ecusson.height||1,l=ratio>1?t:t*ratio,h=ratio>1?t/ratio:t;
    ctx.drawImage(ecusson,ECUSSON.x/k-l/2,ECUSSON.y/k-h/2,l,h);
  }
  c.encre=luminance(m.motif==='cerceaux'?melange(P,S,.5):P)>.56?'#151b22':'#ffffff';
  // La marque du maillot : la nôtre, dans l'encre de la tenue.
  ctx.save();ctx.fillStyle=c.encre;ctx.globalAlpha=.9;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`900 ${Math.max(6,Math.round(21/k))}px ${TITRE}`;ctx.fillText('DESTINY',MARQUE_DESTINY.x/k,MARQUE_DESTINY.y/k-9/k);
  ctx.font=`800 ${Math.max(5,Math.round(13/k))}px ${FORTE}`;ctx.fillText('RUGBY',MARQUE_DESTINY.x/k,MARQUE_DESTINY.y/k+10/k);ctx.restore();
  c.lisere=c.encre==='#ffffff'?'rgba(10,14,18,.55)':'rgba(255,255,255,.6)';
  return c;
}
/** Le maillot d'un joueur : la tenue de son équipe, son numéro dans le dos. */
export function numeroter(tenue,numero,renderer,taille=tenue.width){
  const c=toile(taille),ctx=c.getContext('2d');ctx.drawImage(tenue,0,0,taille,taille);
  // Le dos est inversé dans l'atlas d'origine.
  ctx.save();ctx.translate(.256*taille,.47*taille);ctx.rotate(Math.PI);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`900 ${Math.round(taille*.112)}px "Archivo","Arial Black",Arial,sans-serif`;ctx.lineJoin='round';
  ctx.lineWidth=taille*.012;ctx.strokeStyle=tenue.lisere||'rgba(0,0,0,.5)';ctx.strokeText(String(numero),0,0);
  ctx.fillStyle=tenue.encre||'#fff';ctx.fillText(String(numero),0,0);ctx.restore();
  return texture(c,renderer);
}

// ---------------------------------------------------------------------------
// PANNEAUX : les annonceurs de Destiny Rugby
// ---------------------------------------------------------------------------
// Aucune vraie marque : un stade a besoin de réclames, celles-ci sont les nôtres.
const TITRE='"Anton","Archivo","Arial Black",Impact,sans-serif',FORTE='"Archivo","Arial Black",Arial,sans-serif';
const RECLAMES=[
  {fond:['#0b1f18','#123527'],encre:'#f4e7b0',titre:'DESTINY RUGBY',suite:'ton destin est ovale',accent:'#e7b53c'},
  {fond:['#0e0e12','#1b1b22'],encre:'#ffffff',titre:'@destiny.rugby2',suite:'sur TikTok',accent:'#25f4ee',double:'#fe2c55'},
  {fond:['#f3ede0','#e6dcc6'],encre:'#2a1c12',titre:'CRAMPONS MOUSTACHE',suite:'ça glisse moins qu’avant',accent:'#b3472b'},
  {fond:['#c8202a','#8f1119'],encre:'#fff6e6',titre:'STRAP & FILS',suite:'tient jusqu’à la 80ᵉ',accent:'#ffd9a8'},
  {fond:['#16305f','#0c1c3b'],encre:'#f2f5ff',titre:'ASSURANCES LA MÊLÉE',suite:'on couvre vos cervicales',accent:'#8fb8ff'},
  {fond:['#f7c531','#e3a112'],encre:'#1c1608',titre:'OVALIE FM',suite:'80 minutes de mauvaise foi',accent:'#1c1608'},
  {fond:['#1d4a2c','#0f2c19'],encre:'#eaf6d8',titre:'GAZON MAUDIT',suite:'pelouses & faux rebonds',accent:'#a9e06b'},
  {fond:['#3a2416','#22140b'],encre:'#f6dfb8',titre:'BOUCHERIE DU PILIER',suite:'viande de devant',accent:'#e58a4e'},
  {fond:['#ffffff','#ece9e1'],encre:'#14202e',titre:'OPTIQUE HORS-JEU',suite:'voyez ce que l’arbitre a raté',accent:'#1f6fd0'},
  {fond:['#5b1f6e','#34103f'],encre:'#fbeaff',titre:'TAXI CHISTERA',suite:'la passe qui arrive',accent:'#ffcf5a'},
  {fond:['#0f6a78','#084451'],encre:'#eafcff',titre:'PROTÈGE-DENTS SOURIRE+',suite:'gardez les vôtres',accent:'#9af0ff'},
  {fond:['#e8e2d2','#d2c9b2'],encre:'#3b2a1a',titre:'CASSOULET PACK DE HUIT',suite:'la poussée vient du ventre',accent:'#a5411f'},
  {fond:['#101820','#1c2a38'],encre:'#f4e7b0',titre:'LA 3ᵉ MI-TEMPS',suite:'buvette officielle',accent:'#e7b53c'},
  {fond:['#d4551f','#a53a0f'],encre:'#fff3e0',titre:'DROP & CO',suite:'ça passe entre les poteaux',accent:'#ffe08a'},
  {fond:['#20324a','#131f30'],encre:'#eef3fa',titre:'KINÉ DU DIMANCHE',suite:'lundi, c’est nous',accent:'#7fd0b1'},
  {fond:['#f2f0ea','#dedbd0'],encre:'#0b2a6b',titre:'ÉCOLE DE RUGBY',suite:'inscriptions toute l’année',accent:'#c8202a'},
];
function reclame(ctx,r,x,y,l,h){
  const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,r.fond[0]);g.addColorStop(1,r.fond[1]);ctx.fillStyle=g;ctx.fillRect(x,y,l,h);
  ctx.fillStyle=r.accent;ctx.fillRect(x,y+h-5,l,3);
  ctx.save();ctx.beginPath();ctx.rect(x,y,l,h);ctx.clip();ctx.textBaseline='middle';
  const etroit=l<600;let taille=h*.66;ctx.font=`${taille}px ${TITRE}`;
  const place=l*(r.suite&&!etroit?.56:.9);
  while(ctx.measureText(r.titre).width>place&&taille>14){taille-=2;ctx.font=`${taille}px ${TITRE}`;}
  const lt=ctx.measureText(r.titre).width;
  let ls=0,ts=h*.3;if(r.suite&&!etroit){ctx.font=`700 ${ts}px ${FORTE}`;while(ctx.measureText(r.suite).width>l*.36&&ts>10){ts-=1;ctx.font=`700 ${ts}px ${FORTE}`;}ls=ctx.measureText(r.suite).width;}
  const total=lt+(ls?ls+h*.38:0),depart=x+(l-total)/2;
  ctx.font=`${taille}px ${TITRE}`;ctx.textAlign='left';
  if(r.double){ctx.fillStyle=r.double;ctx.fillText(r.titre,depart+2,y+h*.5+2);ctx.fillStyle=r.accent;ctx.fillText(r.titre,depart-2,y+h*.5-1);}
  ctx.fillStyle=r.encre;ctx.fillText(r.titre,depart,y+h*.5+1);
  if(ls){ctx.font=`700 ${ts}px ${FORTE}`;ctx.fillStyle=r.accent;ctx.fillRect(depart+lt+h*.17,y+h*.26,2,h*.48);ctx.fillStyle=r.encre;ctx.globalAlpha=.86;ctx.fillText(r.suite,depart+lt+h*.38,y+h*.52);}
  ctx.restore();
}
/** L'atlas des panneaux : huit bandeaux entiers puis huit rangées de deux demi-bandeaux, comme l'original. */
export function creerPanneaux(){
  const c=toile(1024),ctx=c.getContext('2d');
  const entiers=[0,1,2,3,5,6,4,7],demis=[1,8,9,10,11,0,12,13,14,1,15,2,5,0,6,1];
  for(let i=0;i<8;i++)reclame(ctx,RECLAMES[entiers[i]],0,i*64,1024,64);
  for(let i=0;i<8;i++)for(let j=0;j<2;j++)reclame(ctx,RECLAMES[demis[i*2+j]],j*512,512+i*64,512,64);
  return c;
}

// ---------------------------------------------------------------------------
// POTEAUX ET PROTECTIONS
// ---------------------------------------------------------------------------
/**
 * L'atlas des abords, protections repeintes. Les poteaux lisent la zone
 * blanche de cet atlas ; les protections lisent les zones bleues marquées :
 * elles prennent la couleur du club qui reçoit, avec son écusson.
 */
export function creerAbords(source,teinte,ecusson){
  const c=toile(2048),ctx=c.getContext('2d');ctx.drawImage(source,0,0);
  const fond=rgb(teinte),sombre=melange(fond,[0,0,0],.22);
  const g=ctx.createLinearGradient(0,767,0,1014);g.addColorStop(0,css(fond));g.addColorStop(.5,css(sombre));g.addColorStop(.5,css(fond));g.addColorStop(1,css(sombre));
  // Le haut du bloc : blanc franc pour les poteaux et les fanions, sans les ombres peintes d'origine.
  ctx.fillStyle='#f6f6f2';ctx.fillRect(1500,500,548,268);
  ctx.fillStyle=css(fond);ctx.fillRect(1913,520,135,126);ctx.fillRect(1545,645,162,123);
  ctx.fillStyle=g;ctx.fillRect(1545,767,503,248);
  // La banderole verticale des abords portait le nom de l'éditeur d'origine.
  const bande=ctx.createLinearGradient(1243,0,1350,0);bande.addColorStop(0,'#0b1f18');bande.addColorStop(1,'#123527');
  ctx.fillStyle=bande;ctx.fillRect(1240,1376,114,320);
  ctx.save();ctx.translate(1297,1536);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#f4e7b0';ctx.font=`400 58px ${TITRE}`;ctx.fillText('DESTINY RUGBY',0,2,300);ctx.restore();
  if(ecusson)for(const y of [829,951]){
    const t=96,ratio=ecusson.width/ecusson.height||1,l=ratio>1?t:t*ratio,h=ratio>1?t/ratio:t;
    // Les faces des protections sont retournées dans l'atlas.
    ctx.save();ctx.translate(1795,y);ctx.rotate(Math.PI);ctx.drawImage(ecusson,-l/2,-h/2,l,h);ctx.restore();
  }
  return c;
}

// ---------------------------------------------------------------------------
// BALLON ET PANNEAU DU STADE : nos marques à la place de celles d'origine
// ---------------------------------------------------------------------------
/**
 * Le ballon : les deux quartiers de l'atlas d'origine portaient une marque
 * d'équipementier. Même découpe (un quartier par moitié d'image), aux couleurs
 * et au nom de Destiny Rugby.
 */
export function creerBallon(taille=512){
  const c=toile(taille),ctx=c.getContext('2d'),k=taille/512;
  const quartier=(x0,fond,ovale,encre,texte,trait)=>{
    ctx.fillStyle=fond;ctx.fillRect(x0,0,256*k,taille);
    ctx.fillStyle=ovale;ctx.beginPath();ctx.ellipse(x0+128*k,256*k,98*k,214*k,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=trait;ctx.lineWidth=7*k;ctx.beginPath();ctx.ellipse(x0+128*k,256*k,78*k,190*k,0,0,Math.PI*2);ctx.stroke();
    ctx.save();ctx.translate(x0+128*k,256*k);ctx.rotate(-Math.PI/2);ctx.scale(-1,1);/* le quartier est cousu en miroir sur le ballon */ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=encre;ctx.font=`400 ${Math.round(74*k)}px ${TITRE}`;ctx.fillText(texte,0,4*k,330*k);ctx.restore();
  };
  quartier(0,'#123527','#f6f3e8','#0b1f18','DESTINY','#e7b53c');
  quartier(256*k,'#0b1f18','#f6f3e8','#123527','RUGBY','#e7b53c');
  return c;
}
/**
 * L'atlas du stade : un panneau bleu portait l'adresse et le logo de l'éditeur
 * d'origine. Le panneau reste, le marquage devient le nôtre.
 */
export function nettoyerStade(source){
  const c=toile(source.width,source.height),ctx=c.getContext('2d'),k=source.width/2048;
  ctx.drawImage(source,0,0);
  const g=ctx.createLinearGradient(925*k,0,1058*k,0);g.addColorStop(0,'#0d2a6e');g.addColorStop(1,'#123a92');
  ctx.fillStyle=g;ctx.fillRect(925*k,893*k,133*k,314*k);
  ctx.save();ctx.translate(990*k,1050*k);ctx.rotate(Math.PI/2);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#f4f6ff';ctx.font=`400 ${Math.round(54*k)}px ${TITRE}`;ctx.fillText('DESTINY RUGBY',0,2*k,290*k);ctx.restore();
  return c;
}

// ---------------------------------------------------------------------------
// TRIBUNES
// ---------------------------------------------------------------------------
const PEAUX_PUBLIC=[[226,185,154],[201,145,104],[173,118,81],[135,83,51],[98,59,41]];
/**
 * Le public aux couleurs d'une équipe. L'atlas d'origine est un masque : le
 * rouge marque le haut porté, le bleu le second vêtement, le vert la peau.
 * Trois supporters sur quatre portent les couleurs, les autres viennent en civil.
 */
export function creerPublic(source,principal,secondaire,taille=1024){
  const c=toile(taille),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,taille,taille);
  const image=ctx.getImageData(0,0,taille,taille),d=image.data,P=rgb(principal),S=rgb(secondaire);
  const civils=[[62,74,96],[150,150,146],[42,46,54],[112,84,66],[226,224,216]];
  // Une colonne de l'atlas contient un spectateur : il garde la même tenue de la tête aux pieds.
  const pas=taille/64;
  for(let y=0;y<taille;y++)for(let x=0;x<taille;x++){
    const i=(y*taille+x)*4;if(d[i+3]<40)continue;
    const r=d[i],g=d[i+1],b=d[i+2],qui=Math.floor(x/pas)+Math.floor(y/(taille/16))*71,h=(Math.imul(qui+11,2654435761)>>>0)/4294967296;
    let cible;
    if(g>r*.82&&g>b*.6){cible=melange(PEAUX_PUBLIC[Math.floor(h*4.99)],[0,0,0],1-borne(g/150,.55,1));}
    else{
      const haut=h<.74?(h<.5?P:S):civils[Math.floor(h*40)%civils.length],bas=h<.3?S:[38,42,52];
      const part=b/(r+b+1),ombre=borne(Math.max(r,b)/215,.45,1.05);
      cible=melange(haut,bas,borne((part-.28)/.4,0,1)).map(v=>v*ombre);
    }
    d[i]=cible[0];d[i+1]=cible[1];d[i+2]=cible[2];
  }
  ctx.putImageData(image,0,0);return c;
}

// ---------------------------------------------------------------------------
// NOM DU PORTEUR
// ---------------------------------------------------------------------------
/** Le nom de famille, tel qu'on le crie en tribune. */
export function nomCourt(nom=''){
  const mots=String(nom).trim().split(/\s+/);if(mots.length<2)return mots[0]||'';
  const particule=/^(de|du|des|le|la|van|von|da|dos|di|del|mc|mac|o’|o')$/i;
  let i=mots.length-1;while(i>1&&particule.test(mots[i-1]))i--;
  return mots.slice(i).join(' ');
}
/**
 * L'étiquette posée sous le porteur du ballon : son nom dans une flamme. Une
 * seule toile, redessinée seulement quand le porteur change.
 */
export function creerEtiquette(renderer){
  const c=toile(512,128),ctx=c.getContext('2d'),tex=texture(c,renderer,true);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false}));
  sprite.center.set(.5,1);sprite.renderOrder=20;sprite.visible=false;
  let courant='';
  const ecrire=(nom,teinte)=>{
    const cle=nom+'|'+teinte;if(cle===courant)return;courant=cle;
    ctx.clearRect(0,0,512,128);if(!nom)return;
    const feu=rgb(teinte),chaud=melange(feu,[255,196,72],.62),texte=nom.toUpperCase();
    let taille=62;ctx.font=`${taille}px ${TITRE}`;while(ctx.measureText(texte).width>430&&taille>26){taille-=2;ctx.font=`${taille}px ${TITRE}`;}
    const l=ctx.measureText(texte).width;
    // La flamme : un halo chaud derrière le nom, effilé sur les côtés.
    const g=ctx.createRadialGradient(256,70,4,256,70,l*.62+40);g.addColorStop(0,`rgba(${chaud.map(Math.round).join(',')},.78)`);g.addColorStop(.45,`rgba(${feu.map(Math.round).join(',')},.34)`);g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.save();ctx.translate(256,70);ctx.scale(1,.36);ctx.translate(-256,-70);ctx.fillStyle=g;ctx.fillRect(0,-140,512,420);ctx.restore();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    ctx.shadowColor=css(chaud);ctx.shadowBlur=18;ctx.lineWidth=7;ctx.strokeStyle='rgba(18,10,4,.82)';ctx.strokeText(texte,256,68);
    ctx.shadowBlur=9;ctx.fillStyle='#fff8e6';ctx.fillText(texte,256,68);ctx.shadowBlur=0;
    tex.needsUpdate=true;
  };
  return {sprite,ecrire};
}

/** Un kit dont l'atlas est fourni en image (kits créés dans le Labo) : posé tel quel, sans repeindre. */
export function tenueDepuisImage(image,maillot,taille=1024){
  const c=toile(taille),ctx=c.getContext('2d');ctx.drawImage(image,0,0,taille,taille);
  c.encre=luminance(maillot?.principal||'#0b2a6b')>.56?'#151b22':'#ffffff';
  c.lisere=c.encre==='#ffffff'?'rgba(10,14,18,.55)':'rgba(255,255,255,.6)';
  return c;
}
