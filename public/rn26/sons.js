// LE SON DU MATCH. Comme la scène, il ne décide de rien : il ÉCOUTE l'état du
// match (phase, score, vols, regroupements, mêlée, tirs) et joue ce qui s'y
// passe. Trois couches :
//   - un lit de foule à trois boucles, mélangées selon la tension du jeu ;
//   - les réactions du public (essai, tir, gros plaquage, faute, carton) —
//     le stade est celui du club qui reçoit, il ne réagit pas pareil aux deux ;
//   - le terrain : sifflet, chocs, efforts, annonces de mêlée, frappes du
//     ballon. L'APK n'a aucun bruit de frappe : elles sont synthétisées, avec
//     une variante par type de coup de pied et un grain différent à chaque fois.
//
// Rien n'est chargé tant que le son est coupé, et un appareil sans WebAudio
// reçoit un objet inerte : le match se joue pareil.

const BASE=new URL('./sons/',import.meta.url).href;
const CLE='destiny-rugby:son';
const ESSENTIELS=['foule_calme','foule_forte','sifflet_arret','sifflet_engagement','sifflet_essai','choc1','choc2','choc3','essai','acclamation'];
const SUITE=['foule_pleine','acclamation_courte','huees','sifflets_public','applaudissements','applaudissements_doux','montee_du_tir','tir_manque','gros_plaquage','rumeur','entree','victoire',
  'sifflet_mi_temps','sifflet_fin','choc4','choc5','choc6','effort1','effort2','effort3','pack1','pack2','pack3','voix_ruck','melee_flexion','melee_liez','melee_jeu','corne','volet'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lisse=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const hasard=(a,b)=>a+Math.random()*(b-a);
const OUVERT=['jeuCourant','ballonEnLAir','ballonLibre'];

function lirePreference(){
  try{const p=JSON.parse(localStorage.getItem(CLE)||'null');if(p&&typeof p==='object')return {muet:!!p.muet,volume:clamp(Number(p.volume)||.8,0,1)};}catch{/* stockage indisponible */}
  return {muet:false,volume:.8};
}
function ecrirePreference(p){try{localStorage.setItem(CLE,JSON.stringify(p));}catch{/* stockage indisponible */}}

/**
 * @param {{leger?:boolean}} options  `leger` : appareil modeste — pas de troisième boucle de foule ni de voix.
 */
export function creerSons(options={}){
  const Contexte=globalThis.AudioContext||globalThis.webkitAudioContext;
  const pref=lirePreference();
  let ctx=null,sortie=null,bruit=null,detruit=false,charge=0;
  const tampons=new Map(),demandes=new Map();
  const lit={calme:null,forte:null,pleine:null};
  // Ce qu'on a déjà entendu : le son réagit aux CHANGEMENTS de l'état.
  const vu={phase:'',scoreA:0,scoreB:0,vol:null,sifflet:null,ruck:null,impact:null,etapeMelee:'',etapeTir:'',tirVol:false,rebonds:0,echappee:null,jaunes:-1,rouges:-1,fini:false,penalite:null,match:null,engage:false};
  let tension=.2,elan=0,prochainEffort=0,attente=[];

  function contexte(){
    if(ctx||!Contexte||detruit)return ctx;
    try{ctx=new Contexte();}catch{return null;}
    sortie=ctx.createGain();sortie.gain.value=pref.muet?0:pref.volume;
    // Un limiteur : un essai, un sifflet et un choc au même instant ne saturent pas.
    const limiteur=ctx.createDynamicsCompressor();limiteur.threshold.value=-14;limiteur.ratio.value=6;limiteur.attack.value=.004;limiteur.release.value=.22;
    sortie.connect(limiteur);limiteur.connect(ctx.destination);
    const n=Math.floor(ctx.sampleRate*.4);bruit=ctx.createBuffer(1,n,ctx.sampleRate);
    const d=bruit.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    return ctx;
  }
  // Un navigateur ne laisse sonner qu'après un geste de l'utilisateur.
  const reveiller=()=>{if(ctx&&ctx.state==='suspended'&&!document.hidden)ctx.resume().catch(()=>{});};
  const surGeste=()=>{if(!pref.muet){contexte();reveiller();chargerTout();}};
  const surVisibilite=()=>{if(!ctx)return;if(document.hidden)ctx.suspend().catch(()=>{});else reveiller();};
  addEventListener('pointerdown',surGeste,{passive:true});addEventListener('keydown',surGeste);
  document.addEventListener('visibilitychange',surVisibilite);

  function charger(nom){
    if(tampons.has(nom))return Promise.resolve(tampons.get(nom));
    if(demandes.has(nom))return demandes.get(nom);
    const p=fetch(BASE+nom+'.ogg').then(r=>r.ok?r.arrayBuffer():Promise.reject(new Error(nom)))
      .then(b=>new Promise((ok,non)=>ctx.decodeAudioData(b,ok,non)))
      .then(t=>{tampons.set(nom,t);return t;}).catch(()=>null);
    demandes.set(nom,p);return p;
  }
  function chargerTout(){
    if(charge||!contexte())return;charge=1;
    Promise.all(ESSENTIELS.map(charger)).then(()=>{
      if(detruit)return;installerLit();
      const suite=options.leger?SUITE.filter(n=>!['foule_pleine','voix_ruck','entree','victoire'].includes(n)):SUITE;
      return Promise.all(suite.map(charger)).then(()=>{charge=2;if(!detruit)installerLit();});
    });
  }
  function boucle(nom){
    const t=tampons.get(nom);if(!t)return null;
    const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=t;s.loop=true;g.gain.value=0;s.connect(g);g.connect(sortie);
    // Départs décalés : trois boucles de même longueur ne respirent pas ensemble.
    s.start(0,Math.random()*t.duration);return {source:s,gain:g};
  }
  function installerLit(){
    if(!lit.calme)lit.calme=boucle('foule_calme');
    if(!lit.forte)lit.forte=boucle('foule_forte');
    if(!lit.pleine&&!options.leger)lit.pleine=boucle('foule_pleine');
  }
  function jouer(nom,{gain=1,taux=1,retard=0}={}){
    const t=tampons.get(nom);if(!t||!ctx||ctx.state!=='running'||pref.muet)return;
    const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=t;s.playbackRate.value=taux;g.gain.value=gain;
    s.connect(g);g.connect(sortie);s.start(ctx.currentTime+retard);
  }
  const plusTard=(dans,action)=>attente.push({dans,action});

  // ── Sons synthétisés : frappes, rebond, poteau ────────────────────────────
  const FRAPPES={place:[150,.24,1500,.95],degagement:[128,.26,1300,1],chandelle:[118,.28,1150,.95],rasant:[195,.14,2200,.7],drop:[160,.2,1700,.9],renvoi:[140,.24,1400,1],occupation:[132,.24,1350,.95]};
  function frappe(type){
    if(!ctx||ctx.state!=='running'||pref.muet)return;
    const [f0,duree,claque,force]=FRAPPES[type]||FRAPPES.degagement,t=ctx.currentTime,grain=hasard(.9,1.1);
    // Le corps du coup : un grave qui chute, comme un cuir gonflé frappé du pied.
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
    o.frequency.setValueAtTime(f0*grain,t);o.frequency.exponentialRampToValueAtTime(46,t+duree*.55);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.85*force,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duree);
    o.connect(g);g.connect(sortie);o.start(t);o.stop(t+duree+.02);
    // Le claquement : un bruit bref, plus sec sur un rasant, plus rond sur une chandelle.
    const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),gn=ctx.createGain();n.buffer=bruit;
    f.type='bandpass';f.frequency.value=claque*grain;f.Q.value=hasard(.7,1.3);
    gn.gain.setValueAtTime(.42*force,t);gn.gain.exponentialRampToValueAtTime(.0001,t+hasard(.05,.09));
    n.connect(f);f.connect(gn);gn.connect(sortie);n.start(t,Math.random()*.2);n.stop(t+.1);
  }
  function rebond(force=1){
    if(!ctx||ctx.state!=='running'||pref.muet)return;
    const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';
    o.frequency.setValueAtTime(hasard(95,125),t);o.frequency.exponentialRampToValueAtTime(52,t+.09);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.3*force,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+.13);
    o.connect(g);g.connect(sortie);o.start(t);o.stop(t+.15);
  }
  function poteau(){
    if(!ctx||ctx.state!=='running'||pref.muet)return;
    const t=ctx.currentTime;
    for(const [f,a,d] of [[610,.3,.7],[1475,.18,.45],[2390,.08,.3]]){
      const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f*hasard(.98,1.02);
      g.gain.setValueAtTime(a,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(sortie);o.start(t);o.stop(t+d+.02);
    }
  }
  const choc=(force=1)=>jouer('choc'+(1+Math.floor(Math.random()*(tampons.has('choc6')?6:3))),{gain:.55*force,taux:hasard(.88,1.12)});
  const effort=(gain=.3)=>jouer('effort'+(1+Math.floor(Math.random()*3)),{gain,taux:hasard(.9,1.1)});

  /** Le camp d'un score ou d'une faute, vu depuis les tribunes : 0 = le club qui reçoit. */
  function reagir(e,vitesse){
    const riche=vitesse<3.5;
    // ── Score ──────────────────────────────────────────────────────────────
    const dA=(e.scoreA||0)-vu.scoreA,dB=(e.scoreB||0)-vu.scoreB;
    if(dA>0||dB>0){
      const chezNous=dA>0,points=chezNous?dA:dB;
      if(points>=5){
        jouer('sifflet_essai',{gain:.8});
        if(chezNous){jouer('essai',{gain:1});elan=1;}
        else{jouer('acclamation_courte',{gain:.38});jouer('rumeur',{gain:.5,retard:.2});elan=.35;}
      }else if(chezNous){jouer('acclamation',{gain:.8});elan=Math.max(elan,.6);}
      else jouer('applaudissements_doux',{gain:.3});
    }
    vu.scoreA=e.scoreA||0;vu.scoreB=e.scoreB||0;

    // ── Sifflet : faute, en-avant, mi-temps, fin ───────────────────────────
    if(e.sifflet&&e.sifflet!==vu.sifflet){
      jouer('sifflet_arret',{gain:.9});jouer('sifflet_arret',{gain:.8,retard:.16,taux:.98});
      // Une pénalité contre le club qui reçoit : le stade gronde.
      if(/penalite/.test(e.sifflet.cle||'')&&e.penalite&&e.penalite.pour==='B'&&riche)jouer('huees',{gain:.3,retard:.5});
    }
    vu.sifflet=e.sifflet;
    if(e.phase!==vu.phase){
      if(e.phase==='miTemps'){jouer('sifflet_mi_temps',{gain:.9});jouer('applaudissements',{gain:.5,retard:.6});}
      if(e.phase==='coupEnvoi')vu.engage=false;
      if(e.phase==='melee'&&riche)vu.etapeMelee='';
    }
    if(e.fini&&!vu.fini){
      jouer('sifflet_fin',{gain:.95});
      if((e.scoreA||0)>(e.scoreB||0)){jouer('victoire',{gain:.9,retard:.8});elan=1;}else jouer('applaudissements_doux',{gain:.5,retard:.8});
    }
    vu.fini=!!e.fini;
    // Le coup d'envoi : un coup de sifflet, puis la frappe.
    if(e.phase==='coupEnvoi'&&!vu.engage&&(e.minuteur??1)<.55){vu.engage=true;jouer('sifflet_engagement',{gain:.85});}

    // ── Cartons ────────────────────────────────────────────────────────────
    const jaunes=e.discipline?.jaunes??0,rouges=e.discipline?.rouges??0;
    if(vu.jaunes>=0&&(jaunes>vu.jaunes||rouges>vu.rouges)){
      const contreNous=e.penalite?e.penalite.pour==='B':false;
      jouer(contreNous?'huees':'acclamation_courte',{gain:contreNous?.55:.5,retard:.4});
    }
    vu.jaunes=jaunes;vu.rouges=rouges;

    // ── Ballon : frappes, rebonds ──────────────────────────────────────────
    if(e.vol&&e.vol!==vu.vol&&e.vol.type==='pied'){
      const tir=e.tir&&e.tir.volLance;
      frappe(tir?'place':e.vol.intention||'degagement');
      if(tir&&e.tir.reussi===false){
        // Le ballon passe à côté : le stade le voit arriver avant le drapeau.
        const chezNous=e.tir.buteur?.cote==='A';
        plusTard((e.vol.duree||2)*.72,()=>jouer(chezNous?'tir_manque':'acclamation_courte',{gain:chezNous?.8:.4}));
        if(Math.random()<.12)plusTard((e.vol.duree||2)*.86,poteau);
      }
    }
    vu.vol=e.vol;
    const rebonds=e.ballonLibre?.rebonds??0;
    if(rebonds>vu.rebonds&&riche)rebond(clamp(1.1-rebonds*.25,.3,1));
    vu.rebonds=e.ballonLibre?rebonds:0;

    // ── Tir au but : le stade retient son souffle, ou siffle le buteur adverse ──
    const etapeTir=e.tir?.etape||'';
    if(etapeTir!==vu.etapeTir&&etapeTir==='elan'&&riche){
      if(e.tir.buteur?.cote==='A')jouer('montee_du_tir',{gain:.7});else jouer('sifflets_public',{gain:.32});
    }
    vu.etapeTir=etapeTir;

    // ── Contacts ───────────────────────────────────────────────────────────
    if(e.ruck&&e.ruck!==vu.ruck&&riche){choc(e.ruck.plaqueurId?1:.6);if(Math.random()<.5)effort(.28);}
    vu.ruck=e.ruck;
    if(e.grosImpact&&e.grosImpact!==vu.impact){choc(1.5);if(riche)jouer('gros_plaquage',{gain:.75,retard:.12});elan=Math.max(elan,.5);}
    vu.impact=e.grosImpact;

    // ── Mêlée : flexion, liez, jeu — puis les deux packs ───────────────────
    const etape=e.conquete?.melee?.etape||(e.phase==='melee'?'x':'');
    if(etape!==vu.etapeMelee&&riche){
      if(etape==='liaison'){jouer('melee_flexion',{gain:.75});jouer('melee_liez',{gain:.75,retard:1.05});}
      else if(etape==='impact'){jouer('melee_jeu',{gain:.8});plusTard(.32,()=>{choc(1.3);jouer('pack'+(1+Math.floor(Math.random()*3)),{gain:.6});});}
      else if(etape==='poussee')jouer('pack'+(1+Math.floor(Math.random()*3)),{gain:.5,retard:.6});
    }
    vu.etapeMelee=etape;

    // ── Percée : la rumeur monte ───────────────────────────────────────────
    if(e.echappee&&e.echappee!==vu.echappee){
      const chezNous=e.echappee.pion?.cote==='A';
      if(riche)jouer(chezNous?'acclamation_courte':'rumeur',{gain:chezNous?.5:.55});
      elan=Math.max(elan,chezNous?.8:.5);
    }
    vu.echappee=e.echappee;
    vu.phase=e.phase;
  }

  /** Ce que le jeu fait monter dans les tribunes, de 0 (attente) à 1 (essai imminent). */
  function mesurerTension(e){
    if(!OUVERT.includes(e.phase)&&e.phase!=='ruck'&&e.phase!=='maul')return e.phase==='tirAuBut'||e.phase==='transformation'?.3:.16;
    const x=e.ballon?.x??61,longueur=122;
    // Mètres jusqu'à la ligne visée par l'équipe qui a le ballon (en-buts de 11 m).
    const reste=e.possession==='A'?longueur-11-x:x-11;
    const proche=lisse(1-reste/32);
    return clamp(.24+proche*(e.possession==='A'?.62:.38),0,1);
  }

  const api={
    get disponible(){return !!Contexte;},
    get muet(){return pref.muet;},
    set muet(v){
      pref.muet=!!v;ecrirePreference(pref);
      if(!pref.muet){contexte();reveiller();chargerTout();}
      if(sortie)sortie.gain.setTargetAtTime(pref.muet?0:pref.volume,ctx.currentTime,.05);
    },
    get volume(){return pref.volume;},
    set volume(v){pref.volume=clamp(Number(v)||0,0,1);ecrirePreference(pref);if(sortie&&!pref.muet)sortie.gain.setTargetAtTime(pref.volume,ctx.currentTime,.05);},
    /** À chaque image : `fige` = match arrêté sur une décision, `vitesse` = accéléré. */
    surImage(match,dt,{fige=false,vitesse=1}={}){
      if(detruit||pref.muet||!match)return;
      if(!ctx){if(navigator.userActivation?.hasBeenActive)surGeste();return;}
      if(ctx.state!=='running')return;
      const e=match.e;
      if(vu.match!==match){
        // Un nouveau match : on repart de son état, sans rejouer ce qui a précédé.
        vu.match=match;vu.scoreA=e.scoreA||0;vu.scoreB=e.scoreB||0;vu.phase=e.phase;vu.vol=e.vol;vu.sifflet=e.sifflet;vu.ruck=e.ruck;vu.impact=e.grosImpact;
        vu.fini=!!e.fini;vu.jaunes=e.discipline?.jaunes??0;vu.rouges=e.discipline?.rouges??0;vu.echappee=e.echappee;vu.etapeTir=e.tir?.etape||'';attente=[];
      }
      if(!fige){
        reagir(e,vitesse);
        for(const a of attente)a.dans-=dt*vitesse;
        const mures=attente.filter(a=>a.dans<=0);attente=attente.filter(a=>a.dans>0);for(const a of mures)a.action();
        // Les regroupements vivent : un effort, une voix, de loin en loin.
        if((e.phase==='ruck'||e.phase==='maul')&&vitesse<3.5){
          prochainEffort-=dt;
          if(prochainEffort<=0){prochainEffort=hasard(1.1,2.6);effort(e.phase==='maul'?.34:.2);if(e.phase==='maul'&&Math.random()<.4)jouer('pack'+(1+Math.floor(Math.random()*3)),{gain:.35});}
        }
      }
      // Le lit de foule suit la tension, sans jamais sauter.
      elan=Math.max(0,elan-dt/5.5);
      const cible=fige?.12:clamp(mesurerTension(e)+elan*.6,0,1);
      tension+=(cible-tension)*clamp(dt/(cible>tension?.9:2.4),0,1);
      const t=ctx.currentTime,duc=fige?.4:1;
      if(lit.calme)lit.calme.gain.gain.setTargetAtTime((.3+.25*(1-tension))*duc,t,.2);
      if(lit.forte)lit.forte.gain.gain.setTargetAtTime(lisse((tension-.2)/.55)*.6*duc,t,.2);
      if(lit.pleine)lit.pleine.gain.gain.setTargetAtTime(lisse((tension-.6)/.4)*.7*duc,t,.2);
    },
    /** Sons d'habillage demandés par l'hôte ou la réalisation : `volet`, `corne`, `entree`. */
    evenement(nom,reglages){if(nom==='poteau')poteau();else jouer(nom,reglages);},
    detruire(){
      if(detruit)return;detruit=true;
      removeEventListener('pointerdown',surGeste);removeEventListener('keydown',surGeste);
      document.removeEventListener('visibilitychange',surVisibilite);
      for(const b of Object.values(lit))try{b?.source.stop();}catch{/* déjà arrêtée */}
      ctx?.close().catch(()=>{});ctx=null;
    },
  };
  return api;
}
