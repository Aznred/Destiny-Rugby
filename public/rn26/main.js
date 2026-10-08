import { creerScene3D } from './scene.js';
import { DestinyMatch,PHASES,ETAPES_MELEE,ISSUES_MELEE,TICK } from './destiny.mjs';
import * as moteur from './moteur-destiny.js';

// ---------------------------------------------------------------------------
// PAGE D'APERÇU : un match de démonstration conduit par la scène elle-même
// ---------------------------------------------------------------------------
// Dans le jeu, les écrans de match montent `scene.js` et lui donnent LEUR état.
// Ici, la page crée un France – Angleterre et le fait avancer toute seule.
const $=s=>document.querySelector(s);
const outils={signalArbitre:moteur.signalArbitre,porteurPourAffichage:moteur.porteurPourAffichage,positionVol:moteur.positionVol,geometrieMelee:moteur.geometrieMelee,TEMPS_MELEE:moteur.TEMPS_MELEE,RITUEL_TIR:moteur.RITUEL_TIR,preparerChenille:moteur.preparerChenille};
let EQUIPES=[
  {nom:'France',maillot:{principal:'#0a2459',secondaire:'#1b3d9e',accent:'#ffffff',short:'#f1f1ee',chaussettes:'#d00000',motif:'epaules'}},
  {nom:'Angleterre',maillot:{principal:'#f2f4f3',secondaire:'#dfe5e8',accent:'#c8102e',short:'#f2f4f3',chaussettes:'#0b1f44',motif:'uni'}},
];
// ?equipes=<JSON> : deux équipes au choix ({nom, maillot, blason}), pour une affiche ou une capture.
try{const perso=new URLSearchParams(location.search).get('equipes');if(perso)EQUIPES=JSON.parse(perso);}catch{}
function nouveauMatch(){const etat=moteur.creerApercuDestiny();etat.carriereDixMinutes=true;return new DestinyMatch({etat,outils,avancer:moteur.avancer});}
let scene,match,paused=false,last=0,frames=0,fps=0,fpsStart=0,previousEvents='',hudAt=0;
const speedFactor=()=>Number($('#speed').value);

// ?sans=squelettes,soudure,elagage,cadence : coupe une optimisation, pour la mesurer.
// ?banc=1 : la page n'avance que sur demande (rn26.play, rn26.mesurer) — deux chargements donnent alors la MÊME image.
const BANC=new URLSearchParams(location.search).has('banc');
const SANS=Object.fromEntries((new URLSearchParams(location.search).get('sans')||'').split(',').filter(Boolean).map(n=>[n,false]));
async function boot(){
  $('#loading').textContent='Chargement du stade, des équipements et des mouvements…';
  scene=await creerScene3D($('#scene'),{outils,equipes:EQUIPES,capture:true,camera:'tv',habillage:{nom:'Destiny Rugby'},stade:new URLSearchParams(location.search).get('stade')||undefined,ballon:new URLSearchParams(location.search).get('ballon')||undefined,...SANS});
  majSon();
  match=scene.brancher(nouveauMatch());
  $('#loading').remove();if(!BANC)requestAnimationFrame(frame);
  // Accès de contrôle pour les vérifications automatisées (aucun effet en jeu).
  const i=scene.interne;
  window.rn26={get match(){return match;},set match(m){match=scene.brancher(m);},scene3D:scene,actors:i.actors,officials:i.officials,camera:i.camera,scene:i.scene,renderer:i.renderer,motions:i.motions,THREE:i.THREE,rig:i.rig,ballState:i.ballState,hud,nouveauMatch,
    render:(dt,still)=>scene.image(dt,{still,fige:paused,vitesse:speedFactor()}),
    pause(v=true){if(paused!==v)togglePause();},get paused(){return paused;},
    get view(){return scene.vue;},set view(v){scene.vue=v;},
    /** Avance la simulation de n pas en rendant chaque image intermédiaire. */
    advance(n=1,dt=TICK){for(let k=0;k<n;k++){match.step(dt);scene.image(dt,{still:true});}hud();},
    /** Ce que coûte une image : joue `secondes` de match hors de la boucle d'affichage, puis compte sous chaque caméra. */
    mesurer(secondes=8){
      const R=i.renderer,dessin=R.render.bind(R);let tRendu=0,n=0;
      if(!paused)togglePause();
      R.render=(s,c)=>{const t0=performance.now();dessin(s,c);tRendu+=performance.now()-t0;n++;};
      const t0=performance.now();
      try{window.rn26.play(secondes,60);}finally{R.render=dessin;}
      const total=performance.now()-t0,cameras={};
      for(const c of ['tv','follow','close','wide','aerienne','basse','enbut']){
        scene.camera=c;scene.recadrer();for(let k=0;k<3;k++)scene.image(.016,{still:true,fige:true});
        cameras[c]={appels:R.info.render.calls,triangles:R.info.render.triangles,horsChamp:scene.mesures().elagues};
      }
      scene.camera=$('#camera').value;scene.recadrer();
      let fixes=0,animes=0;const squelettes=new Set();
      i.scene.traverse(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh){animes++;squelettes.add(o.skeleton);}else fixes++;});
      return {stade:new URLSearchParams(location.search).get('stade')||'international',sans:Object.keys(SANS),images:n,msParImage:+(total/n).toFixed(2),msRendu:+(tRendu/n).toFixed(2),toile:R.domElement.width+'x'+R.domElement.height,maillagesFixes:fixes,maillagesAnimes:animes,squelettes:squelettes.size,geometries:R.info.memory.geometries,textures:R.info.memory.textures,cameras};
    },
    /** Une somme de l'image affichée sous une caméra, match arrêté : deux réglages qui rendent la même image rendent la même somme. */
    empreinte(camera='wide'){
      scene.camera=camera;scene.recadrer();for(let k=0;k<3;k++)scene.image(.016,{still:true,fige:true});
      const gl=i.renderer.getContext(),l=gl.drawingBufferWidth,h=gl.drawingBufferHeight,p=new Uint8Array(l*h*4);
      gl.readPixels(0,0,l,h,gl.RGBA,gl.UNSIGNED_BYTE,p);
      let s=2166136261;for(let k=0;k<p.length;k++)s=Math.imul(s^p[k],16777619);
      return {camera,somme:(s>>>0).toString(16),pixels:p};
    },
    /** Recadre immédiatement la caméra et les poses à la prochaine image. */
    snap(){scene.recadrer();},
    /** Joue le match hors de la boucle d'affichage, image par image, comme à l'écran. */
    play(seconds,rate=60){const dt=1/rate;for(let t=0;t<seconds&&!match.e.fini;t+=dt){match.step(dt*speedFactor());scene.image(dt,{vitesse:speedFactor()});}hud();}};
}
function togglePause(){paused=!paused;$('#pause').textContent=paused?'Reprendre':'Pause';}
$('#pause').onclick=togglePause;
$('#camera').onchange=()=>{if(scene)scene.camera=$('#camera').value;};
function majSon(){const s=scene?.son,b=$('#son');if(!s?.disponible){b.hidden=true;return;}b.textContent=s.muet?'Son coupé':'Son';b.setAttribute('aria-pressed',String(!s.muet));}
$('#son').onclick=()=>{if(scene?.son){scene.son.muet=!scene.son.muet;majSon();}};
$('#reset').onclick=()=>{if(scene){match=scene.brancher(nouveauMatch());previousEvents='';$('#saved').textContent='';}};
$('#step').onclick=()=>{if(!match)return;if(!paused)togglePause();match.step(.4);scene.image(.08,{still:true});hud();};
$('#observe').onclick=()=>{
  if(!match)return;const phase=$('#phase').value;
  if(match.phase===phase)match.step(.3);
  const found=phase==='chenille'?match.chain():match.nextPhase(phase);scene.recadrer();
  if(found){if(!paused)togglePause();$('#saved').textContent=phase==='chenille'?'Consigne de chenille envoyée au 9. Reprendre pour voir la liaison et le dégagement.':'Phase atteinte pendant le match. Reprendre pour la voir se dérouler.';}
  else $('#saved').textContent='Cette phase ne survient plus avant la fin. Recommencer pour rechercher à nouveau.';
  scene.image(.15,{still:true});hud();
};
function hud(){
  $('#score').textContent=match.score.join(' : ');const sec=Math.floor(match.clock);$('#clock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  const m=match.melee,tir=match.tir,cellule=match.e.cellule;
  $('#decision').textContent=m?`Mêlée · ${ETAPES_MELEE[m.etape]}`:tir?.etape==='celebration'?'Essai !':cellule?.pousse?'Cellule d’avants · poussée':PHASES[match.phase]||match.phase;
  const carrier=match.players.find(p=>p.id===match.carrier),club=t=>EQUIPES[t].nom;
  const relayeur=match.e.ruck?.organisation?.relayeurId&&match.byId.get(match.e.ruck.organisation.relayeurId);
  $('#source').textContent=m?.issue&&!m.synthese?`Poussée : ${ISSUES_MELEE[m.issue]}`
    :relayeur&&relayeur.number!==9?`${club(relayeur.team)} · le n° ${relayeur.shirt} assure le relais derrière le ruck`
    :carrier?`${club(carrier.team)} · n° ${carrier.shirt} · ${carrier.source.nom}${match.e.lancement?.type==='pickAndGo'&&carrier.number<=8?' · pick and go':cellule?.accroches?.length&&cellule.porteurId===carrier.id?' · cellule liée':''}`:`${club(match.team)} · ${match.e.conquete?'Conquête en cours':match.flight?'Ballon en vol':'Placement des joueurs'}`;
  const key=match.events.map(e=>e.minute+e.seconde+e.texte).join('|');if(key!==previousEvents){previousEvents=key;$('#trace').replaceChildren(...match.events.slice(0,5).map(e=>{const li=document.createElement('li'),t=document.createElement('time');t.textContent=e.minute+':'+String(e.seconde%60).padStart(2,'0');li.append(t,document.createTextNode(e.texte));return li;}));}
  const s=match.stats;$('#stats').textContent=`${s.passes} passes · ${s.tackles} plaquages · ${s.breaks} percées · ${s.kicks} coups de pied`;
  $('#status').textContent=`${s.scrums} mêlées · ${s.lineouts} touches · ${s.knockons} en-avant · ${match.used.size} mouvements utilisés / ${Object.keys(scene.interne.motions.clips).length} prêts · ${fps} i/s`;
}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.075,(now-last)/1000||.016);last=now;
  if(!paused&&!match.e.fini)match.step(dt*speedFactor());
  scene.image(dt,{fige:paused,vitesse:speedFactor()});
  frames++;if(now-fpsStart>1000){fps=Math.round(frames*1000/(now-fpsStart));frames=0;fpsStart=now;}if(now-hudAt>200){hud();hudAt=now;}
}
$('#capture').onclick=async()=>{
  const source=scene.interne.renderer.domElement,c=document.createElement('canvas');c.width=source.width;c.height=source.height;const x=c.getContext('2d');x.drawImage(source,0,0);
  const scale=c.width/innerWidth;x.scale(scale,scale);x.fillStyle='#08271ee8';x.fillRect(22,22,600,92);x.fillStyle='#fff';x.font='bold 23px system-ui';x.fillText('DESTINY RUGBY / Simulation 3D',38,53);x.font='17px system-ui';x.fillText('FRANCE  '+match.score.join(' : ')+'  ANGLETERRE  ·  '+$('#clock').textContent+'  ·  '+(PHASES[match.phase]||match.phase),38,82);x.font='12px system-ui';x.fillStyle='#b6d5b7';x.fillText('Stade, joueurs, ballon et mouvements RN26 · moteur de match Destiny Rugby',38,102);
  if(location.pathname.startsWith('/rn26/')){const a=document.createElement('a');a.download='destiny-rugby-simulation.png';a.href=c.toDataURL('image/png');a.click();$('#saved').textContent='Image prête au téléchargement';return;}
  const r=await fetch('/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:c.toDataURL('image/png')})});$('#saved').textContent=r.ok?'Image sauvegardée : simulation-match.png':'Échec de sauvegarde';
};
boot().catch(e=>{console.error(e);$('#loading').textContent='Erreur de chargement : '+e.message;});
