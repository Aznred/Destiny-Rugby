import { PhysicalPlayers,lineoutGroups,scrumSlots,maulSlots } from './placements.mjs';
/** Pas fixe du moteur de match, en secondes. */
export const TICK=.15;
export const xyz=p=>({x:p.y-35,z:p.x-61});
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lisse=k=>{const u=clamp(k,0,1);return u*u*(3-2*u);};
export const PHASES={coupEnvoi:'Engagement',renvoi22:'Renvoi aux 22',jeuCourant:'Jeu courant',ballonEnLAir:'Jeu au pied',ballonLibre:'Ballon libre',ruck:'Ruck',maul:'Maul',melee:'Mêlée',touche:'Touche',penalite:'Pénalité',tirAuBut:'Bottage',transformation:'Transformation',aplatissage:'Aplatissage',tmo:'Arbitrage vidéo',apresEssai:'Essai',miTemps:'Mi-temps',fini:'Fin du match'};
export const ETAPES_MELEE={placement:'Les packs se placent',liaison:'Flexion, liez',impact:'Jeu !',introduction:'Introduction',poussee:'Poussée',sortie:'Sortie du ballon'};
export const ISSUES_MELEE={stable:'mêlée stable',avance:'le pack avance',recule:'le pack recule',tourne:'la mêlée tourne',ecroulee:'mêlée écroulée',relevee:'liaison perdue'};

// Gestes du moteur joués par tout le corps.
// Fautes : le geste reproché au joueur, tel qu'il est animé dans l'APK.
const FAUTES={foul_high:'high_tackle',foul_late:'dangerous_tackle_smash_success',foul_tip:'dangerous_tackle_tip_grab',foul_kick:'kick_grubber',
  foul_holding_ball:'not_releasing_ball',foul_not_rolling:'not_rolling_away',foul_off_feet:'jackaller_not_supporting_own_weight',
  foul_side_entry:'ruck_engage_left',foul_collapse:'collapsing_ruck_or_maul',foul_obstruction:'not_releasing_player',scuffle_separate:'not_releasing_player',
  reaction_high:'dangerous_tackled_smash_front_going_down'};
// Gestes en plusieurs temps : [clip, durée] enchaînés depuis le début du geste.
const SEQUENCES={
  reaction_tip:[['dangerous_tackled_tip_grabbed',.57],['dangerous_tackled_tip_in_air',1.5],['dangerous_tackled_tip_down',.57]],
  reaction_trip:[['tap_tackled_fall',1.13],['tap_tackled_getup',1.17]],
  foul_trip:[['tap_tackle_pre',.37],['tap_tackle_fall',.4]],
  jackal:[['jackal_engage',.57],['jackal_struggle',1.07],['jackal_success_standup',1]],
  reaction_hit:[['bumped_hit',.6],['standing_tackled_going_down',1.6]],
};
const gestures={pickup:'pick_up_ball',restart:'kick_restart',grubber:'kick_grubber',punt:'kick_running',box_kick:'kick_box',chip:'kick_box',drop:'kick_restart',conversion:'kick_conversion_a_kick',penalty:'kick_conversion_a_kick',tackle_low:'standing_tackle_front_grab',tackle_drive:'standing_tackle_front_grab',fall_forward:'standing_tackled_going_down',fall_back:'standing_tackled_going_down',contact_brace:'ruck_struggle_middle_front',clearout_drive:'ruck_engage_middle',ruck_bind:'ruck_engage_middle',ruck_push:'ruck_struggle_middle_front',try:'try_touchdown',dive_try:'try_dive',foul_knockon:'jumping_catch_fail',reaction_hit:'standing_tackled_going_down',charge_down:'jumping_catch_start_immediate',tap:'pick_up_ball'};
// Gestes superposés à la course : seuls le buste et les bras les jouent.
const hauts={handoff:'handoff_left',bump:'drive_with_ball',intercept:'pass_catch_from_left'};
// ── Plaquages : ce que le moteur a LU du contact (`duels.ts`) décide des gestes ──
// Une suite est une liste [clip, durée jouée, départ dans le clip, cadence].
// `c` : d'où vient le plaqueur, vu du porteur — −1 à sa gauche, 1 à sa droite, 0 de face, 2 dans son dos.
const AU_SOL=[['standing_tackled_put_out',.75],['standing_tackled_hold',99]];
const PLAQUAGES={
  // Le défenseur plonge dans les appuis : le porteur est fauché.
  jambes:{plaqueur:()=>[['dive_tackle_pre',.2,.12],['dive_tackle_success',1.67],['dive_tackle_success_hold',.5]],
    plaque:c=>[[c===-1?'dive_tackled_left':c===1?'dive_tackled_right':c===2?'dive_tackled_behind':'dive_tackled_front',.62],['dive_tackled_front_hold',.5],...AU_SOL]},
  // Cuillère : rattrapé, le défenseur plonge sur les chevilles.
  poursuite:{plaqueur:()=>[['tap_tackle_pre',.37],['tap_tackle_fall',.4],['tap_tackle_hold',1.2]],plaque:()=>[['tap_tackled_fall',1.13],...AU_SOL]},
  cote:{plaqueur:()=>[['standing_tackle_front_grab',.25],['standing_tackle_success_going_down',1.05,0,1.87]],
    plaque:c=>[[c===1?'tackled_right_struggle':'tackled_left_struggle',.55],['standing_tackled_going_down',.85,.2,1.6],...AU_SOL]},
  arriere:{plaqueur:()=>[['standing_tackle_behind_grab',.33],['standing_tackle_behind_struggle',.5],['standing_tackle_success_going_down',.9,.2,1.9]],
    plaque:()=>[['standing_tackled_behind_grabbed',.23],['standing_tackled_behind_struggle',.6],['standing_tackled_going_down',.9,.15,1.55],...AU_SOL]},
  // Le défenseur gagne l'impact : épaule, et le porteur part en arrière.
  dominant:{plaqueur:()=>[['dangerous_tackle_smash_pre',.16,.2],['dangerous_tackle_smash_success',1.37],['standing_tackle_success_hold',.4]],
    plaque:c=>[[c===-1?'dangerous_tackled_smash_left_going_down':c===1?'dangerous_tackled_smash_right_going_down':c===2?'dangerous_tackled_smash_behind_going_down':'dangerous_tackled_smash_front_going_down',1.5],...AU_SOL]},
  // Porteur enfermé debout : on lutte, puis les deux hommes vont au sol.
  debout:{plaqueur:()=>[['choke_tackle_grab_hold',.7],['choke_tackle_struggle',.85],['standing_tackle_success_going_down',.9,.2,1.9]],
    plaque:()=>[['choke_tackle_grabbed_hold',.7],['choke_tackled_struggle',.85],['standing_tackled_going_down',.9,.15,1.55],...AU_SOL]},
  haut:{plaqueur:()=>[['standing_tackle_front_grab',.3],['standing_tackle_front_struggle',.45],['standing_tackle_success_going_down',.95,.15,1.9]],
    plaque:()=>[['standing_tackled_front_grabbed',.3],['standing_tackled_front_struggle',.45],['standing_tackled_going_down',.95,.1,1.55],...AU_SOL]},
  // Le porteur gagne l'impact et emmène son plaqueur avant de tomber vers l'avant.
  accroche:{plaqueur:()=>[['standing_tackle_front_grab',.2],['standing_tackle_behind_struggle',.6],['standing_tackle_success_going_down',.95,.15,1.9]],
    plaque:c=>[[c===1?'tackled_right_struggle':'tackled_left_struggle',.8],['standing_tackled_going_down',.95,.1,1.55],...AU_SOL]},
};
// Le défenseur qui perd un duel, et celui qui finit son geste sur un passeur.
const VARIANTES={
  'reaction_hit:repousse':[['fended_hit',1,.05]],
  'reaction_hit:equilibre':[['handed_off',.8],['standing_tackled_going_down',1,.25,1.2]],
  'reaction_hit:elimine':[['running_change_direction',1,.25]],
  'fall_back:assis':[['charged_through',1.5],['standing_tackled_get_up',.9,1.3,1.6]],
  'fall_back:raffute':[['bumped_hit',1.03],['bumped_hold',.5],['standing_tackled_get_up',.87,1.3,1.6]],
  'tackle_low:apres-passe':[['standing_tackle_front_grab',.4],['standing_tackle_front_struggle',.8]],
};
/** Gestes de contact qu'on ne joue plus dès que le joueur est reparti en courant. */
const STATIQUES=new Set(['contact_brace','clearout_drive','ruck_bind','ruck_push']);
const jouerSuite=(clip,suite,t)=>{
  let reste=t;
  for(let k=0;k<suite.length;k++){const [nom,duree,depart=0,cadence=1]=suite[k];if(reste<duree||k===suite.length-1){clip(nom,depart+Math.min(reste,duree)*cadence);return;}reste-=duree;}
};
// Instant du contact pied-ballon dans chaque clip, et délai du moteur entre l'armé et la frappe.
const FRAPPES={kick_restart:1.15,kick_box:1.05,kick_running:.4,kick_grubber:.4};
const IMPACT_TIR=2.25,LACHER_PASSE=.27,PRISE_PASSE=.42,COLLECTE=.6;
const CELEBRATIONS=['PlayerCelebration01_002','celebration_b','PlayerCelebration03_001','celebration_c','PlayerCelebration05_002','celebration_d'];
const ENCOURAGEMENTS=['BackRowCelebrate_001_celebrate','FrontRowRightClap_001_celebrate','PlayerIdleSpotExcited01_002','PlayerIdleSpotExcited03_002'];
const LUTTES=['ruck_struggle_middle_front','ruck_struggle_left','ruck_struggle_right'];
const ENTREES=['ruck_engage_middle','ruck_engage_left','ruck_engage_right'];
/** Le jeu est arrêté : ceux qui attendent doivent rester vivants, pas figés. */
const ARRETS=new Set(['coupEnvoi','renvoi22','penalite','tirAuBut','transformation','melee','touche','apresEssai','tmo','miTemps','aplatissage']);
// Découpage d'une mêlée ou d'un tir joués d'un bloc par le moteur (cadence
// normale, direct en ligne) : la progression de la phase donne l'étape.
const SEUILS_MELEE=[['placement',0],['liaison',.07],['impact',.36],['introduction',.47],['poussee',.58],['sortie',.93]];
const SEUILS_TIR=[['pose',0],['pret',.6],['elan',.8]];
const cap=(dx,dz)=>Math.atan2(dx,dz)+Math.PI;
function hasard(id,sel){let h=2166136261^Math.imul(sel+3,0x9e3779b1);const t=String(id);for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>13;h=Math.imul(h,0x5bd1e995);return ((h^h>>>15)>>>0)/4294967296;}

export class DestinyMatch {
  /**
   * `etat` : l'état du match — celui du moteur, que l'hôte fait avancer, ou sa
   * reconstitution image par image à partir des relevés du direct (`direct`).
   * `outils` : fonctions pures du moteur. `avancer` : seulement quand la scène
   * conduit elle-même le match (page d'aperçu).
   */
  constructor({etat,outils,avancer=null,direct=false}){
    this.e=etat;this.outils=outils;this.avancer=avancer;this.direct=direct;
    this.previous=new Map();this.used=new Set();this.physics=new PhysicalPlayers();
    this.slots=new Map();this.memo=new Map();this.flights=new Map();this.players=[];this.liftGroups=[];
    this.ball={x:0,y:.14,z:0};this.time=etat.sim;this.sync();
  }
  /** La scène conduit le match : retenue éventuelle, un pas de moteur, puis lecture. */
  step(dt){this.hold(dt);this.avancer(this.e,dt);this.observe();}
  /**
   * Les joueurs rejoignent une conquête avant qu'elle ne commence : la phase
   * est retenue tant que les avants ne sont pas à leur place.
   */
  hold(dt){
    if(this.direct)return;
    const m=this.e.conquete?.melee;
    const enRoute=this.players.some(p=>(p.source.role==='melee'||p.source.role==='alignement')&&p.arrival>.6);
    const retenir=(this.phase==='melee'&&m?m.etape==='placement':['melee','touche'].includes(this.phase)&&this.progress()<.12)&&enRoute&&this.time-this.phaseStart<22;
    if(retenir)this.e.minuteur+=dt;
  }
  /** Relit l'état s'il a avancé. Renvoie vrai quand un nouveau pas a été lu. */
  observe(){
    const e=this.e;
    if(!this.direct&&e.sim===this.time&&e.phase===this.phase)return false;
    this.previous=new Map(this.players.map(p=>[p.id,{x:p.x,z:p.z}]));this.previousBall={...this.ball};
    this.sync(clamp(e.sim-this.time,0,1.2));return true;
  }
  /**
   * CE QUE LE MOTEUR NE JOUE PAS, MAIS QU'ON DOIT VOIR. Un remplacement est
   * instantané pour le match : l'entrant prend la place du sortant. À l'image,
   * le sortant quitte la pelouse à pied vers son banc et l'entrant arrive en
   * courant de la touche. Idem pour l'entrée des équipes avant le coup d'envoi.
   * Seules les positions AFFICHÉES changent ; le match ne voit rien.
   */
  scenographie(dt){
    const e=this.e,now=e.sim,ici=new Set(this.players.map(p=>p.id));
    this.changements??=[];this.presents??=ici;this.dernieres??=new Map();
    // Les bancs : devant la tribune principale, de part et d'autre de la ligne médiane.
    const banc=equipe=>({x:37,z:equipe===0?-5:5});
    for(const p of this.players){
      if(this.presents.has(p.id)||this.recent.get(p.id)?.clip!=='substitution')continue;
      const b=banc(p.team),d=Math.hypot(p.x-b.x,p.z-b.z);
      this.changements.push({type:'entree',id:p.id,debut:now,duree:clamp(d/5.6,1.2,7),de:b,equipe:p.team});
      this.remplacement={debut:now,z:b.z,equipe:p.team};
    }
    for(const id of this.presents){
      if(ici.has(id))continue;
      const src=e.pions.find(q=>q.id===id);
      // Un exclu ne « sort » pas ainsi : seul un joueur remplacé regagne son banc.
      if(!src?.remplace)continue;
      const equipe=src.cote==='A'?0:1,de=this.dernieres.get(id)||xyz(src.pos),b=banc(equipe);
      const blesse=!!(src.blessure||src.blesse),allure=blesse?1.3:2.6,d=Math.hypot(de.x-b.x,de.z-b.z);
      this.changements.push({type:'sortie',id,debut:now,duree:clamp(d/allure,1.5,24),de,vers:b,equipe,src,allure,blesse});
    }
    this.presents=ici;
    this.changements=this.changements.filter(c=>now>=c.debut-.01&&now-c.debut<c.duree);
    const ouvert=['jeuCourant','ballonEnLAir','ballonLibre'].includes(e.phase);
    for(const c of this.changements){
      // Le jeu a repris : on ne laisse personne traîner hors de sa place.
      if(ouvert&&c.type==='entree')c.duree=Math.min(c.duree,now-c.debut+.5);
      const k=clamp((now-c.debut)/c.duree,0,1);
      if(c.type==='entree'){
        const p=this.players.find(q=>q.id===c.id);if(!p)continue;
        const dx=p.x-c.de.x,dz=p.z-c.de.z,d=Math.hypot(dx,dz)||1,v=Math.min(6.2,d/c.duree);
        p.x=c.de.x+dx*k;p.z=c.de.z+dz*k;p.vx=dx/d*v;p.vz=dz/d*v;p.entrant=true;
      }else{
        const dx=c.vers.x-c.de.x,dz=c.vers.z-c.de.z,d=Math.hypot(dx,dz)||1;
        const vx=dx/d*c.allure,vz=dz/d*c.allure,x=c.de.x+dx*k,z=c.de.z+dz*k;
        this.players.push({x,z,id:c.id,team:c.equipe,number:c.src.numero,shirt:c.src.numeroMaillot??c.src.numero,vx,vz,visible:true,arrival:0,fantome:true,boite:c.blesse,
          // Une copie neutre : aucune formation ne doit lui redonner une place.
          source:{...c.src,role:'sortie',corps:null,sanction:0,pos:{x:z+61,y:x+35},vitesse:{x:vz,y:vx}}});
      }
    }
    // ── L'entrée des équipes : deux files sortent du tunnel, puis chacun gagne sa place ──
    const cortege=this.cortege;
    if(cortege){
      const avant=cortege.places??=new Map();
      for(const p of this.players){
        const file=p.team===0?-1.6:1.6,rang=clamp(p.number,1,15)-1;
        const ki=clamp((cortege.k-rang*.03)/.55,0,1);
        let x,z;
        if(ki<.5){const u=ki/.5;x=40-u*30;z=file;}
        else{const u=lisse((ki-.5)/.5);x=10+(p.x-10)*u;z=file+(p.z-file)*u;}
        const prec=avant.get(p.id),pas=Math.max(dt,1/120);
        p.vx=prec?clamp((x-prec.x)/pas,-7,7):0;p.vz=prec?clamp((z-prec.z)/pas,-7,7):0;
        p.x=x;p.z=z;p.cortege=true;p.visible=ki>0;avant.set(p.id,{x,z});
      }
    }
    this.dernieres=new Map(this.players.filter(p=>!p.fantome).map(p=>[p.id,{x:p.x,z:p.z}]));
  }
  /**
   * Entrée des équipes, conduite par l'hôte : `k` va de 0 (dans le tunnel) à 1
   * (chacun à sa place de coup d'envoi). `null` rend la main au match.
   */
  entrer(k,dt=1/60){
    if(k==null){if(this.cortege){this.cortege=null;this.previous=new Map();this.sync(0);}return;}
    this.previous=new Map(this.players.map(p=>[p.id,{x:p.x,z:p.z}]));
    this.cortege={...this.cortege,k:clamp(k,0,1)};
    this.sync(dt);
  }
  /** Position de l'image entre deux pas du moteur (0 → pas précédent, 1 → pas courant). */
  alpha(){return this.direct?1:clamp((this.e.reliquat??0)/TICK,0,1);}
  offset(){return this.direct?0:clamp(this.e.reliquat??0,0,TICK)-TICK;}
  sync(dt=0){
    const e=this.e;
    if(this.phase!==e.phase){
      // Après un écroulement ou une mêlée relevée, les joueurs ne se « relèvent » pas une seconde fois.
      if(this.phase==='melee')this.scrumEnd={time:e.sim,slots:new Map(this.slots),rupture:!!this.melee?.penalite};
      if(this.phase==='maul')this.maulEnd={time:e.sim,slots:new Map(this.slots),essai:e.phase==='aplatissage'};
      this.phaseStart=e.sim;
    }
    if(this.ruck!==e.ruck){
      // Le relayeur garde son rôle un instant après la sortie : c'est lui qui joue le ballon.
      if(!e.ruck&&this.ruck?.organisation?.relayeurId)this.relay={id:this.ruck.organisation.relayeurId,since:e.sim};
      this.ruck=e.ruck;this.ruckStart=e.sim;
    }
    this.time=e.sim;this.clock=e.t;this.phase=e.phase;this.score=[e.scoreA,e.scoreB];this.team=e.possession==='A'?0:1;this.carrier=this.outils.porteurPourAffichage(e);
    this.players=e.pions.filter(p=>p.surLeTerrain).map(p=>({...xyz(p.pos),id:p.id,team:p.cote==='A'?0:1,number:p.numero,shirt:p.numeroMaillot??p.numero,source:p,vx:p.vitesse.y,vz:p.vitesse.x,visible:p.sanction<=0}));
    this.recent=new Map();for(const g of e.gestes||[])if(e.sim-g.debut<=Math.max(g.duree,1.6))this.recent.set(g.joueurId,g);
    this.flight=e.vol;const v=e.vol;
    if(v&&this.lastFlight!==v){this.lastFlight=v;this.flightStart=e.sim-v.ecoule;if(v.receveur)this.flights.set(v.receveur.id,{start:this.flightStart,duree:v.duree,de:xyz(v.de)});if(v.auteur)this.flights.set('de:'+v.auteur.id,{start:this.flightStart,duree:v.duree,vers:xyz(v.vers),type:v.type});}
    this.melee=this.lireMelee();this.tir=this.lireTir();
    // Dans un ruck, le ballon est présenté vers l'arrière puis talonné jusqu'au
    // dernier pied : c'est là que le relayeur vient le prendre.
    let sol=e.ballon;
    if(e.phase==='ruck'&&e.ruck&&!e.ruck.organisation?.chenille){
      const s=e.possession==='A'?1:-1,k=lisse((e.sim-this.ruckStart-.9)/1.5);
      sol={x:e.ballon.x-s*1.3*k,y:e.ballon.y-.12*k};
    }
    this.ball={...xyz(sol),y:e.ballonLibre?.hauteur??(v?this.outils.positionVol(v).hauteur:e.porteur||e.piedPrepare?1.02:.14)};
    if(this.conquest!==e.conquete){this.conquest=e.conquete;this.liftGroups=lineoutGroups(this.players,e.conquete);this.leurre=null;}
    // Faux saut : le premier bloc de l'équipe qui lance monte pour de faux, le ballon part derrière.
    if(e.phase==='touche'&&e.conquete?.combinaison==='leurreDevant'&&!this.leurre){
      const pris=new Set(this.liftGroups.flatMap(g=>[g.jumper,...g.lifters])),bord=p=>Math.min(p.source.pos.y,70-p.source.pos.y);
      const devant=this.players.filter(p=>p.team===this.team&&p.source.role==='alignement'&&!pris.has(p.id)).sort((a,b)=>bord(a)-bord(b)).slice(0,3);
      if(devant.length===3){const tri=[...devant].sort((a,b)=>a.source.pos.y-b.source.pos.y);this.leurre={sauteur:tri[1].id,lifteurs:[tri[0].id,tri[2].id]};}
    }
    if(e.aplatissage&&this.aplatissage!==e.aplatissage){this.aplatissage=e.aplatissage;const g=(e.gestes||[]).filter(g=>g.joueurId===e.aplatissage.marqueur.id).pop();this.essai={id:e.aplatissage.marqueur.id,start:e.sim,plonge:g?.clip==='dive_try',maul:e.aplatissage.origine==='maul'};}
    if(e.sifflet!==this.lastWhistle){this.lastWhistle=e.sifflet;if(e.sifflet)this.whistle={start:e.sim,cle:e.sifflet.cle||''};if(/carton/.test(e.sifflet?.cle||''))this.card={start:e.sim,red:/Rouge/.test(e.sifflet.cle)};}
    this.slots=this.formation(0);
    this.players=this.physics.update(this.players,dt,this);
    this.scenographie(dt);
    this.byId=new Map(this.players.map(p=>[p.id,p]));
    this.events=(e.commentaires||[]).slice(-7).reverse();
    const sum=key=>e.pions.reduce((n,p)=>n+(p.stats?.[key]||0),0),c=e.compteurs||{};
    this.stats={passes:sum('passes'),tackles:sum('plaquages'),kicks:sum('coupsDePied'),tries:(e.essaisA||0)+(e.essaisB||0),breaks:c.percees||0,rucks:c.rucks||0,scrums:c.melees||0,lineouts:c.touches||0,knockons:c.enAvants||0};
  }
  progress(offset=0){
    if(this.direct&&this.e.progression!==undefined)return clamp(this.e.progression,0,1);
    return clamp(1-(this.e.minuteur-offset)/(this.e.dureeArret||1),0,1);
  }
  /** Durée d'écran de la phase arrêtée en cours, en secondes. */
  dureePhase(){return Math.max(1.5,this.e.dureeArret||7);}
  /**
   * La mêlée à afficher. En cadence détaillée, le moteur la joue par étapes ;
   * sinon elle est découpée ici d'après la progression de la phase, pour que
   * les packs se lient, entrent, poussent et libèrent même quand le moteur
   * l'expédie d'un seul bloc.
   */
  lireMelee(){
    const e=this.e,c=e.conquete;
    if(e.phase!=='melee'||!c)return null;
    if(c.melee)return c.melee;
    let m=this.meleeLue?.conquete===c?this.meleeLue:null;
    if(!m){
      const introducteur=e.possession;
      m=this.meleeLue={conquete:c,synthese:true,centre:{x:e.ballon.x,y:e.ballon.y},introducteur,talonneur:introducteur,etape:'placement',etapeDepuis:e.sim,debut:e.sim,avanceFinale:0,angleFinal:0,issue:'stable',durees:{}};
    }
    const p=this.progress(),D=this.dureePhase();
    let i=0;while(i+1<SEUILS_MELEE.length&&p>=SEUILS_MELEE[i+1][1])i++;
    const [etape,seuil]=SEUILS_MELEE[i];
    if(m.etape!==etape||!m.durees[etape]){m.etape=etape;m.etapeDepuis=e.sim-(p-seuil)*D;}
    for(let k=0;k<SEUILS_MELEE.length;k++)m.durees[SEUILS_MELEE[k][0]]=((SEUILS_MELEE[k+1]?.[1]??1)-SEUILS_MELEE[k][1])*D;
    m.dureePoussee=m.durees.poussee;
    const vers=c.pousseVers;
    m.avanceFinale=!vers?0:vers===m.introducteur?1.3:-1.3;m.issue=!vers?'stable':m.avanceFinale>0?'avance':'recule';
    m.perdant=vers?(vers==='A'?'B':'A'):undefined;
    return m;
  }
  /** Géométrie de la mêlée à l'instant affiché (avance, angle, écart entre les packs). */
  geometrie(m,now){
    if(!m.synthese)return this.outils.geometrieMelee(m,now);
    const depuis=now-m.etapeDepuis,d=m.durees;
    const k=m.etape==='sortie'?1:m.etape==='poussee'?lisse(depuis/Math.max(.1,d.poussee)):0;
    const ecart=m.etape==='placement'?1.4:m.etape==='liaison'?1.4-.55*lisse(depuis/Math.max(.1,d.liaison)-.3):m.etape==='impact'?.85*(1-lisse(depuis/Math.max(.1,Math.min(.55,d.impact*.8)))):0;
    return {avance:m.avanceFinale*k,angle:m.angleFinal*k,ecart};
  }
  /** Durée de la liaison : celle du moteur, ou celle du découpage. */
  dureeLiaison(m){return m.synthese?Math.max(.4,m.durees.liaison):this.outils.TEMPS_MELEE.liaison;}
  /**
   * Le tir au but à afficher. Sans rituel détaillé dans le moteur, les étapes
   * (pose, concentration, élan) sont lues sur la progression de la phase.
   */
  lireTir(){
    const e=this.e,t=e.tir;
    if(!t)return null;
    if(t.etape)return t;
    let lu=this.tirLu?.source===t?this.tirLu:null;
    if(!lu)lu=this.tirLu={source:t,synthese:true,lieu:{...(t.lieu||e.vol?.de||e.ballon)},etape:'pose',etapeDepuis:e.sim};
    Object.assign(lu,{buteur:t.buteur,volLance:t.volLance,retombe:t.retombe,reussi:t.reussi,valeur:t.valeur});
    if(t.volLance){lu.departSim??=e.sim-(e.vol?.ecoule||0);return lu;}
    const p=this.progress(),D=this.dureePhase();
    let i=0;while(i+1<SEUILS_TIR.length&&p>=SEUILS_TIR[i+1][1])i++;
    const [etape,seuil]=SEUILS_TIR[i];
    if(lu.etape!==etape||lu.etapeDepuis===undefined){lu.etape=etape;lu.etapeDepuis=e.sim-(p-seuil)*D;}
    lu.dureePose=(SEUILS_TIR[1][1])*D;
    // L'élan est calé sur la frappe : le pied touche le ballon quand la phase s'achève.
    lu.frappeDans=Math.max(0,e.minuteur);
    return lu;
  }
  /** Souvenir attaché à une clé : la valeur est calculée une fois, à la première demande. */
  remember(key,make){if(!this.memo.has(key)){if(this.memo.size>600)this.memo.clear();this.memo.set(key,make());}return this.memo.get(key);}
  /** Places des joueurs liés (mêlée, maul) à l'instant affiché. */
  formation(offset=0){
    const e=this.e,m=this.melee;
    if(e.phase==='melee'&&m){
      const g=this.geometrie(m,e.sim+offset),sI=m.introducteur==='A'?1:-1,centre=xyz({x:m.centre.x+sI*g.avance,y:m.centre.y});
      const slots=scrumSlots(this.players,centre,g.angle,g.ecart);
      // Le demi introduit côté pilier gauche, face au tunnel, jusqu'à ce que le ballon soit talonné.
      const equipe=m.introducteur==='A'?0:1,neuf=this.players.find(p=>p.number===9&&p.team===equipe);
      if(neuf&&['placement','liaison','impact','introduction'].includes(m.etape)){
        const s=equipe===0?1:-1,fx=s*Math.sin(g.angle),fz=s*Math.cos(g.angle),lx=fz,lz=-fx;
        slots.set(neuf.id,{x:centre.x+lx*1.42-fx*.1,z:centre.z+lz*1.42-fz*.1,heading:cap(-lx,-lz),kind:'demi'});
      }
      this.scrum={centre,angle:g.angle,ecart:g.ecart,m};
      return slots;
    }
    if(e.phase==='maul')return maulSlots(this.players,xyz(e.ballon),this.team,e.maul?.receveurId);
    return new Map();
  }
  /**
   * Ce que regarde un joueur qui attend : le buteur, les poteaux, le ballon ou
   * un coéquipier. Le choix change toutes les quelques secondes, à un rythme
   * propre à chacun — trente têtes ne tournent jamais ensemble.
   */
  regard(p,now){
    const tir=this.tir,periode=5+hasard(p.id,11)*5,tour=Math.floor((now+hasard(p.id,12)*periode)/periode),x=hasard(p.id,40+tour);
    if(tir&&tir.etape!=='celebration'){
      const buteur=this.byId?.get(tir.buteur.id),goal=tir.buteur.cote==='A'?50:-50;
      if(x<.56&&buteur&&buteur.id!==p.id)return {x:buteur.x,y:1.5,z:buteur.z};
      if(x<.8)return {x:0,y:6,z:goal};
    }
    if(x>.86){
      // Un mot à un coéquipier : le plus proche.
      let proche=null,dMin=7;
      for(const q of this.players){if(q.id===p.id||q.team!==p.team)continue;const d=Math.hypot(q.x-p.x,q.z-p.z);if(d<dMin&&d>.6){dMin=d;proche=q;}}
      if(proche)return {x:proche.x,y:1.6,z:proche.z};
    }
    return {x:this.ball.x,y:1,z:this.ball.z};
  }
  motion(p,offset=0){
    const e=this.e,s=p.source,now=e.sim+offset,recent=this.recent.get(p.id),speed=Math.hypot(p.vx,p.vz),progress=this.progress(offset);
    const d={name:null,time:0,loop:true,normalized:false,loco:true,idle:p.number%3===0?'idle_alt_01':p.number<=8?'heavy_idle':'light_idle',heading:null,upper:null,anchor:null,air:false,carry:false,watch:false,raise:0};
    const clip=(name,time,loop=false,normalized=false)=>{d.name=name;d.time=time;d.loop=loop;d.normalized=normalized;d.loco=false;return d;};
    const done=()=>{this.used.add(d.name||d.idle);if(d.upper)this.used.add(d.upper.name);return d;};
    /** Celui qui attend, debout, pendant un arrêt de jeu : vivant, et qui regarde quelque chose. */
    const attendre=()=>{if(Math.hypot(s.vitesse.x,s.vitesse.y)<.4&&p.arrival<.95&&!s.corps&&p.id!==this.carrier){d.vivant=true;d.regard=this.regard(p,now);}return done();};
    const tir=this.tir,slot=this.slots.get(p.id);
    /** L'adversaire debout le plus proche. */
    const proche=(rayon=2.6)=>{let mieux=null,dMin=rayon;for(const q of this.players){if(q.team===p.team||q.fantome)continue;const dq=Math.hypot(q.x-p.x,q.z-p.z);if(dq<dMin){dMin=dq;mieux=q;}}return mieux;};
    /**
     * La passe se fait en courant : seul le haut du corps la joue. Chistera,
     * offload à une main ou dans le dos n'existent pas dans l'APK : la scène
     * les construit (bras et buste), par-dessus une passe à peine esquissée.
     */
    const donner=()=>{
      if(!recent||!/^(pass|pass_left|offload)$/.test(recent.clip)||now-recent.debut>=.95)return;
      const vol=this.flights.get('de:'+p.id),cote=this.side(p,null,vol?.vers),longue=vol&&Math.hypot(vol.vers.x-p.x,vol.vers.z-p.z)>13&&recent.clip!=='offload';
      const t=now-recent.debut,construit=vol&&['chistera','dos','une-main'].includes(recent.variante);
      d.upper={name:`pass_${longue?'long':'short'}_${cote<0?'left':'right'}`,time:t+LACHER_PASSE-.1,weight:clamp(t/.08,0,1)*clamp((.75-t)/.25,0,1)*(construit?.3:1)};
      if(construit)d.proc={type:recent.variante==='une-main'?'unemain':'chistera',point:vol.vers,t:t+.12,duree:.62};
    };
    // Remplacé qui regagne son banc, remplaçant qui entre, cortège d'avant-match : une course, rien d'autre.
    if(p.fantome||p.entrant||p.cortege){
      // Un blessé regagne son banc en boitant.
      if(p.boite&&speed>.3){clip('walking_fast_limp',now*.95,true);d.heading=cap(p.vx,p.vz);return done();}
      if(speed<.3){d.vivant=true;d.regard=this.regard(p,now);}
      return done();
    }

    // ── Le buteur : chaque étape de son rituel a son geste ──────────────────
    if(tir?.buteur.id===p.id&&tir.etape){
      const place=xyz(tir.lieu||e.ballon),goalZ=p.team===0?50:-50,depuis=now-(tir.etapeDepuis??now);
      const face=cap(-place.x,goalZ-place.z),tee={x:place.x,z:place.z,heading:face,mode:'abs'};
      if(tir.volLance){
        const t=IMPACT_TIR+(now-(tir.departSim??now));
        if(t<4.35){clip('kick_conversion_a_kick',t);d.anchor=tee;}
        return done();
      }
      if(tir.synthese){
        // Rituel découpé sur la progression : il n'est posé au tee qu'une fois arrivé.
        if(p.arrival>1.2||speed>1.6){d.carry='deux';return done();}
        if(tir.etape==='pose')clip('kick_conversion_a_setup',.22+.78*clamp(depuis/Math.max(.5,tir.dureePose),0,1),false,true);
        else if(tir.etape==='pret')clip('kick_conversion_a_ready',depuis,true);
        else clip('kick_conversion_a_kick',clamp(IMPACT_TIR-(tir.frappeDans-offset),0,IMPACT_TIR));
        d.anchor=tee;return done();
      }
      if(tir.etape==='ramassage'){
        const sol=xyz(tir.ballonAuSol||tir.lieu||e.ballon);
        clip('kickoff_pickup_ball',depuis*1.15);
        d.anchor={...this.remember('ramassage:'+tir.etapeDepuis,()=>({x:p.x,z:p.z,heading:cap(sol.x-p.x,sol.z-p.z)})),mode:'rel'};
      }else if(tir.etape==='transport'){d.carry='deux';d.heading=speed<.4?face:null;}
      else if(tir.etape==='pose'){clip('kick_conversion_a_setup',clamp(depuis/this.outils.RITUEL_TIR.pose,0,1),false,true);d.anchor=tee;}
      else if(tir.etape==='pret'){clip('kick_conversion_a_ready',depuis,true);d.anchor=tee;}
      else if(tir.etape==='elan'){clip('kick_conversion_a_kick',Math.min(depuis,IMPACT_TIR));d.anchor=tee;}
      return done();
    }
    // ── Après l'essai : le marqueur se relève puis célèbre, ses coéquipiers l'entourent ──
    if(tir?.etape==='celebration'&&tir.marqueurId===p.id){
      const essai=this.essai?.id===p.id?this.essai:null,depuis=now-(essai?.start??tir.etapeDepuis);
      const fin=essai?.plonge||essai?.maul?4.05:1.9;
      if(essai&&depuis<fin){clip(essai.maul?'try_pushover_maul':essai.plonge?'try_dive':'try_touchdown',depuis);return done();}
      const debut=(essai?.start??tir.etapeDepuis)+(essai?fin:0);
      clip(CELEBRATIONS[(p.number+p.team*3)%CELEBRATIONS.length],now-debut);
      d.anchor={...this.remember('fete:'+tir.etapeDepuis,()=>({x:p.x,z:p.z,heading:p.team===0?0:Math.PI})),mode:'rel'};
      return done();
    }
    if(tir?.etape==='celebration'&&tir.feteurs?.includes(p.id)){
      const marqueur=this.byId.get(tir.marqueurId);
      if(marqueur&&speed<.6&&Math.hypot(marqueur.x-p.x,marqueur.z-p.z)<3.4){
        clip(ENCOURAGEMENTS[(p.number+p.team)%ENCOURAGEMENTS.length],now+p.number*.37,true);d.heading=cap(marqueur.x-p.x,marqueur.z-p.z);
      }
      return done();
    }

    // ── Mêlée : liaison, impact, poussée, puis l'issue réellement jouée ──────
    const m=this.melee;
    if(e.phase==='melee'&&m&&slot?.kind==='melee'){
      const depuis=now-m.etapeDepuis,n=p.number;
      // ⚠️ ON ARRIVE DÉJÀ TOURNÉ. Un avant venu du mauvais côté rejoignait sa
      // place face à son propre camp, puis pivotait d'un demi-tour en se liant
      // (mesuré : un tiers des images de placement, dos à l'adversaire). Dans
      // les derniers mètres il regarde la mêlée et finit en pas chassés.
      if(m.etape==='placement'&&p.arrival>.45){if(p.arrival<3)d.heading=slot.heading;return done();}
      // Mêlée jouée d'un bloc : un avant encore en chemin la rejoint debout, il ne glisse pas lié.
      if(m.synthese&&p.arrival>.9&&m.etape!=='poussee'&&m.etape!=='sortie')return done();
      d.anchor={x:slot.x,z:slot.z,heading:slot.heading,mode:'slot',pivot:5};
      const perdant=m.perdant===(p.team===0?'A':'B'),rupture=m.ruptureApres??Infinity;
      // Départ du 8 : il contrôle le ballon à ses pieds, le ramasse et se détache du pack.
      if(n===8&&m.depart8&&m.etape==='sortie'&&(p.team===0?'A':'B')===(m.talonneur??m.introducteur)&&depuis>.25){clip('scrum8_pick_up_ball',(depuis-.25)*1.6);return done();}
      if(m.etape==='placement')clip(`scrum${n}_bind`,0);
      else if(m.etape==='liaison'){clip(`scrum${n}_bind`,clamp(depuis/this.dureeLiaison(m),0,1),false,true);d.anchor.ref='end';}
      else if(m.etape==='impact'){clip(`scrum${n}_set`,depuis);d.anchor.ref='start';}
      else if((m.etape==='poussee'||m.etape==='sortie')&&m.issue==='ecroulee'&&now-this.pushStart(m)>rupture)clip(`scrum${n}_collapse`,(now-this.pushStart(m)-rupture)*1.4);
      else if((m.etape==='poussee'||m.etape==='sortie')&&m.issue==='relevee'&&perdant&&now-this.pushStart(m)>rupture)clip(`scrum${n}_stand`,(now-this.pushStart(m)-rupture)*1.2);
      // La poussée : les appuis travaillent d'autant plus vite que la mêlée se déplace.
      else{clip(`scrum${n}_walk`,n*.21,true);d.rate=m.etape==='introduction'?.45:m.issue==='stable'?.6:.95;}
      return done();
    }
    if(e.phase==='melee'&&m&&p.number===9){
      const depuis=now-m.etapeDepuis,introduit=(p.team===0?'A':'B')===m.introducteur;
      if(slot?.kind==='demi'){
        if(p.arrival<.5){
          d.heading=slot.heading;
          if(m.etape==='introduction'){clip('scrum_put_in',depuis*1.1);d.anchor={x:slot.x,z:slot.z,heading:slot.heading,mode:'slot'};}
          else d.carry='deux';
        }
      }else if(introduit||m.talonneur===(p.team===0?'A':'B')){
        // Derrière son numéro 8 : il se baisse sur le ballon juste avant la sortie.
        const reste=e.minuteur-offset;
        if(this.scrum)d.heading=cap(this.ball.x-p.x,this.ball.z-p.z);
        if(m.etape==='sortie'&&p.arrival<.7&&reste<COLLECTE&&!m.penalite)clip('ruck_pass_short_left_collect',COLLECTE-reste);
        else d.watch=true;
      }else d.watch=true;
      return done();
    }
    // Fin de mêlée : les avants se relèvent avant de repartir.
    if(this.scrumEnd&&!this.scrumEnd.rupture&&now-this.scrumEnd.time<1.15&&this.scrumEnd.slots.get(p.id)?.kind==='melee'&&p.id!==this.carrier&&!s.corps){
      const ancien=this.scrumEnd.slots.get(p.id);
      clip(`scrum${p.number}_stand`,.25+(now-this.scrumEnd.time)*1.9);d.anchor={x:ancien.x,z:ancien.z,heading:ancien.heading,mode:'slot'};
      return done();
    }

    // ── Maul écroulé : le groupe s'affaisse vers l'avant, là où il s'est arrêté ──
    if(this.maulEnd&&e.phase!=='maul'&&/maul/.test(e.penalite?.motif||'')&&now-this.maulEnd.time<3.3&&!(recent&&FAUTES[recent.clip])){
      const ancien=this.maulEnd.slots.get(p.id);
      if(ancien?.kind==='maul'&&ancien.role!=='garde'){
        clip(ancien.role==='porteur'?'maul_carry_walk_collapse_forwards':'maul_push_walk_collapse_forwards',Math.min(now-this.maulEnd.time,2.85));
        d.anchor={x:ancien.x,z:ancien.z,heading:ancien.heading,mode:'slot'};
        return done();
      }
    }

    // ── Touche ────────────────────────────────────────────────────────────────
    if(e.phase==='touche'){
      const c=e.conquete;
      if(p.number===2&&s.cote===e.possession){
        // Le lanceur va chercher le ballon : il court jusqu'à lui les mains libres,
        // se baisse pour le ramasser, puis gagne sa place en le tenant.
        const ram=c?.ramassage;
        if(ram==='ramasse'){
          clip('pick_up_ball',Math.max(0,now-(c.ramassageDepuis??now)));
          if(c.ballonAuSol){const b=xyz(c.ballonAuSol);d.heading=cap(b.x-p.x,b.z-p.z);d.pivot=7;}
          return done();
        }
        if(ram==='aller')return done();
        // ⚠️ EN ROUTE, IL REGARDE OÙ IL VA. Son cap était fixé vers le terrain dès
        // le début de la phase : il rejoignait la ligne de touche en crabe.
        if(p.arrival>.5||speed>1.2){d.carry='deux';return done();}
        clip(progress<.42?'lout_throw_hold':progress<.6?'lout_throw_pull_back':'lout_throw_release',progress<.42?now:progress<.6?(progress-.42)/.18:(progress-.6)/.4,progress<.42,progress>=.42);
        d.heading=Math.atan2((c?.reception?.y??35)-s.pos.y,(c?.reception?.x??s.pos.x)-s.pos.x)+Math.PI;d.pivot=5;
        return done();
      }
      if(s.role==='alignement'){
        const group=this.liftGroups.find(g=>[g.jumper,...g.lifters].includes(p.id));
        const target=this.byId.get(group?.jumper),lifters=(group?.lifters||[]).map(id=>this.byId.get(id));
        const saute=target&&p.id===target.id&&progress>.48;
        if(!saute&&(p.arrival>.45||speed>2))return done();
        // Le leurre : faux saut du premier bloc, juste avant le vrai lancer.
        const faux=this.leurre&&progress>.3&&progress<.58?(progress-.3)/.28:-1;
        if(faux>=0&&this.leurre.sauteur===p.id){clip('lout_jump_fake',faux,false,true);d.heading=s.pos.y>35?Math.PI/2:-Math.PI/2;return done();}
        if(faux>=0&&this.leurre.lifteurs.includes(p.id)){const cible=this.byId.get(this.leurre.sauteur);clip('lout_boost_fake',faux,false,true);if(cible)d.heading=cap(cible.x-p.x,cible.z-p.z);return done();}
        if(saute){clip(p.team===0?'lout_jump_catch_pass_l':'lout_jump_catch_pass_r',(progress-.48)/.52,false,true);d.air=true;}
        else if(lifters.includes(p)&&progress>.48)clip('lout_boost01',(progress-.48)/.52,false,true);
        else clip(p.number%2?'lout_ready01':'lout_ready02',now+p.number*.4,true);
        d.heading=target&&lifters.includes(p)?cap(target.x-p.x,target.z-p.z):s.pos.y>35?Math.PI/2:-Math.PI/2;
        return done();
      }
    }

    // ── Maul : un groupe debout qui marche, le porteur identifiable à l'arrière ──
    if(e.phase==='maul'&&slot?.kind==='maul'){
      const age=now-this.phaseStart;
      if(slot.role==='garde'){d.heading=slot.heading;d.watch=true;return done();}
      if(p.arrival>.55)return done();
      // Debout et en appui : le buste nettement plus haut qu'en mêlée, chacun à sa façon.
      d.anchor={x:slot.x,z:slot.z,heading:slot.heading,mode:'slot'};d.raise=.42+slot.lean;
      // La cadence des appuis suit l'avancée du groupe : un maul arrêté piétine.
      const avance=clamp(Math.hypot(p.vx,p.vz)/.95,.45,1.35);
      const porte=this.maulHolder(now)===p.id;
      if(slot.role==='porteur'||slot.role==='receveur'&&porte){
        if(porte){clip('maul_carry_walk',slot.seed*2.3,true);d.rate=avance;d.raise=.2;d.sway=Math.sin(now*1.7+slot.seed*6)*.2;}
        else if(age<.75+slot.seed*.3)clip('maul_push_engage',age);
        else{clip('maul_push_walk',slot.seed*2.3,true);d.rate=avance;}
      }else{
        const entree=.55+slot.seed*.45;
        if(age<entree)clip('maul_push_engage',age/entree,false,true);else{clip('maul_push_walk',slot.seed*2.3,true);d.rate=avance;}
      }
      return done();
    }
    // Essai en force : le porteur du maul s'effondre dans l'en-but avec le ballon.
    if(this.essai?.maul&&this.essai.id===p.id&&now-this.essai.start<4.05&&['aplatissage','tmo'].includes(e.phase)){clip('try_pushover_maul',now-this.essai.start);return done();}

    // ── Ruck ──────────────────────────────────────────────────────────────────
    if(e.phase==='ruck'){
      const r=e.ruck,o=r?.organisation,age=now-this.ruckStart;
      if(r&&(r.porteurId===p.id||r.plaqueurId===p.id)){
        const victim=r.porteurId===p.id;
        const suites=r.plaquage&&PLAQUAGES[r.plaquage.type];
        if(suites){
          const autre=this.byId.get(victim?r.plaqueurId:r.porteurId);
          // Le cap du porteur et le côté d'où vient le plaqueur, figés à l'impact.
          const lu=this.remember('plaquage:'+this.ruckStart,()=>{
            const v=this.byId.get(r.porteurId),t=this.byId.get(r.plaqueurId),cap0=v?.team===0?Math.PI:0;
            return {cap:cap0,cote:r.plaquage.angle==='face'||!v||!t?0:r.plaquage.angle==='dos'?2:this.side(v,cap0,t)};
          });
          const suite=victim?suites.plaque(lu.cote):suites.plaqueur(lu.cote),total=suite.reduce((n,x)=>n+x[1],0);
          if(victim||age<Math.max(total,1.9))jouerSuite(clip,suite,age);
          else clip('standing_tackled_get_up',.2+clamp((age-Math.max(total,1.9))/1.6,0,1)*.8,false,true);
          // Le plaqué garde le sens de sa course ; le plaqueur est tourné vers lui.
          d.heading=victim?lu.cap:autre?cap(autre.x-p.x,autre.z-p.z):null;
          return done();
        }
        // Par derrière : le plaqueur a rattrapé le porteur, saisi dans le dos.
        const derriere=this.remember('derriere:'+this.ruckStart,()=>{const a=this.byId.get(r.porteurId),b=this.byId.get(r.plaqueurId);return{v:!!a&&!!b&&(b.source.pos.x-a.source.pos.x)*(a.source.cote==='A'?1:-1)<-.3};}).v;
        if(age<.2)clip(victim?(derriere?'standing_tackled_behind_grabbed':'standing_tackled_front_grabbed'):(derriere?'standing_tackle_behind_grab':'standing_tackle_front_grab'),age/.2,false,true);
        else if(age<1.25)clip(victim?'standing_tackled_going_down':'standing_tackle_success_going_down',(age-.2)/1.05,false,true);
        else if(victim)clip(age<2?'standing_tackled_put_out':'standing_tackled_hold',age<2?(age-1.25)/.75:0,false,age<2);
        else if(age<1.9)clip('standing_tackle_success_hold',0);
        else clip('standing_tackled_get_up',.2+(age-1.9)/1.6*.8,false,true);
        const partner=this.byId.get(victim?r.plaqueurId:r.porteurId);if(partner)d.heading=victim&&derriere?(p.team===0?Math.PI:0):cap(partner.x-p.x,partner.z-p.z);
        if(victim&&s.corps)d.heading=Math.atan2(Math.sin(s.corps.direction),Math.cos(s.corps.direction))+Math.PI;
        return done();
      }
      const face=p.team===0?Math.PI:0;
      // Où en est le pion du moteur : encore en chemin, ou arrêté à sa place.
      const ecartPlace=s.cible?Math.hypot(s.pos.x-s.cible.x,s.pos.y-s.cible.y):p.arrival,vPion=Math.hypot(s.vitesse.x,s.vitesse.y);
      if(o?.relayeurId===p.id&&!s.corps){
        // Le relayeur — le 9 ou celui qui le remplace — arrive debout, regarde
        // le ballon, puis se baisse pour le prendre quand il sort. ⚠️ Il passe
        // AVANT les joueurs liés : un avant du regroupement peut être désigné.
        if(ecartPlace>.5||vPion>1.3||p.arrival>.6)return done();
        d.heading=cap(this.ball.x-p.x,this.ball.z-p.z);
        if(o.chenille){
          clip(o.chenille.pretDepuis!==undefined?'extending_ruck_scrum_half_foot_loop':'extending_ruck_scrum_half_foot_get_ball',now-o.chenille.debut,o.chenille.pretDepuis!==undefined);
          d.heading=face;return done();
        }
        const reste=e.minuteur-offset;
        if(reste<COLLECTE&&!this.direct)clip('ruck_pass_short_left_collect',COLLECTE-reste);else d.watch=true;
        return done();
      }
      if(o?.chenille&&o.attaque.includes(p.id)){
        if(p.arrival>.5)return done();
        // Les trois liés de la chenille : cadence d'origine, à demi-vitesse.
        clip('extending_ruck_forward_0'+(o.attaque.indexOf(p.id)+1),(now-o.chenille.debut)*.5,true);d.heading=face;return done();
      }
      if(o&&(o.attaque.includes(p.id)||o.defense.includes(p.id))&&!s.corps){
        // ⚠️ ON NE SE LIE QU'ARRIVÉ. Le soutien court jusqu'à sa place, s'y
        // arrête, PUIS entre dans le regroupement et y reste ancré. Lié trop
        // tôt, il finissait sa course en posture de poussée : il glissait.
        const lie=this.remember('lie:'+this.ruckStart+':'+p.id,()=>({}));
        if(lie.depuis===undefined){
          if(ecartPlace<.32&&vPion<.8&&p.arrival<.55){lie.depuis=now;lie.place={x:p.x,z:p.z};}
        }else if(ecartPlace>.95||Math.hypot(xyz(s.cible||s.pos).x-lie.place.x,xyz(s.cible||s.pos).z-lie.place.z)>.95)lie.depuis=undefined;
        if(lie.depuis===undefined){if(speed<.6)d.heading=face;return done();}
        const i=(o.attaque.includes(p.id)?o.attaque:o.defense).indexOf(p.id),t=Math.max(0,now-lie.depuis);
        if(t<.9)clip(ENTREES[i%3],t);else clip(LUTTES[i%3],t*.5+i*.4,true);
        d.anchor={x:lie.place.x,z:lie.place.z,heading:face,mode:'slot',fondu:.35};d.lie=true;return done();
      }
    }
    // ⚠️ LE COUP DE PIED PASSE AVANT LE RELAIS. Le 9 qui tape derrière son ruck
    // restait dans sa posture de relayeur, tourné vers le regroupement : le
    // ballon partait dans son dos, sans geste de frappe.
    // ── Jeu au pied dans le jeu courant : l'armé précède la frappe ──────────
    const pied=e.piedPrepare?.auteurId===p.id&&!e.vol?e.piedPrepare:null;
    // ⚠️ ON FRAPPE DANS L'AXE OÙ L'ON REGARDE. Le botteur gardait le cap de sa
    // course et le ballon partait ailleurs. Pendant qu'il se place il regarde sa
    // cible ; à l'armé, bassin et épaules se tournent vers elle.
    const viseePied=pied?xyz(pied.arrivee):null;
    if(pied&&pied.pretDepuis===undefined&&viseePied)d.regard={x:viseePied.x,y:2.2,z:viseePied.z};
    if(pied&&pied.pretDepuis!==undefined){
      d.heading=cap(viseePied.x-p.x,viseePied.z-p.z);d.pivot=5;
      const name=pied.intention==='renvoi'||pied.intention==='drop'?'kick_restart':pied.intention==='rasant'?'kick_grubber':pied.intention==='chandelle'||p.number===9?'kick_box':'kick_running';
      const delai=pied.intention==='drop'?1.12:pied.intention==='renvoi'?1.05:p.number===9?.84:.7;
      clip(name,Math.max(0,now-pied.pretDepuis+FRAPPES[name]-delai));
      this.memo.set('pied:'+p.id,{name,debut:pied.pretDepuis+delai-FRAPPES[name]});
      return done();
    }
    const frappe=this.memo.get('pied:'+p.id);
    if(frappe&&e.vol?.type==='pied'&&e.vol.auteur?.id===p.id&&now-frappe.debut<FRAPPES[frappe.name]+.7){
      clip(frappe.name,now-frappe.debut);
      const ou=xyz(e.vol.vers);d.heading=cap(ou.x-p.x,ou.z-p.z);d.pivot=5;
      return done();
    }
    // Filet : quelle que soit la façon dont le coup de pied est parti, celui qui
    // vient de frapper est tourné vers là où va le ballon.
    if(e.vol?.type==='pied'&&e.vol.auteur?.id===p.id&&e.vol.ecoule<.9){const ou=xyz(e.vol.vers);d.heading=cap(ou.x-p.x,ou.z-p.z);d.pivot=9;}
    // Sortie de ruck ou de mêlée : accroupi sur le ballon, puis la passe du relayeur.
    const relais=this.relay?.id===p.id&&now-this.relay.since<2.6?this.relay:this.scrumEnd&&p.number===9&&now-this.scrumEnd.time<2.6?{id:p.id,since:this.scrumEnd.time}:null;
    if(relais&&!s.corps){
      const passe=recent&&/^(pass|pass_left|offload)$/.test(recent.clip)&&recent.debut>=relais.since-.01?recent:null;
      if(passe){
        const vol=this.flights.get('de:'+p.id),cote=this.side(p,relais.heading??cap(0,p.team===0?1:-1),vol?.vers),longue=vol&&Math.hypot(vol.vers.x-p.x,vol.vers.z-p.z)>11;
        const t=now-passe.debut+.18;
        if(t<(longue?3.2:1.35)){clip(`ruck_pass_${longue?'long':'short'}_${cote<0?'left':'right'}`,t);d.heading=relais.heading??null;return done();}
      }else if(p.id===this.carrier&&speed<1.4&&now-relais.since<1.2){
        relais.heading??=cap(0,p.team===0?1:-1);
        clip('ruck_pass_short_left',0);d.heading=relais.heading;d.attache='sol';return done();
      }
    }

    // ── Cellule d'avants : trois liés qui attaquent la ligne ────────────────
    const cellule=e.cellule;
    if(cellule&&e.phase==='jeuCourant'&&!s.corps){
      const pousse=cellule.pousse,devant=cap(0,p.team===0?1:-1);
      if(pousse){
        // Le plaquage est engagé : le porteur, tenu debout, pousse encore avec ses deux soutiens.
        const t=now-pousse.debut,cadence=clamp(speed/.95,.55,1.4);
        if(cellule.porteurId===p.id){clip('standing_tackled_front_struggle',t,true);d.heading=devant;return done();}
        if(pousse.defenseurId===p.id){const porteur=this.byId.get(cellule.porteurId);clip('standing_tackle_front_struggle',t,true);if(porteur)d.heading=cap(porteur.x-p.x,porteur.z-p.z);return done();}
        if(cellule.accroches?.includes(p.id)){clip('maul_push_walk',hasard(p.id,5)*.6,true);d.rate=cadence;d.raise=.3;d.heading=devant;d.fondu=.3;return done();}
      }else if(cellule.accroches?.includes(p.id)&&cellule.porteurId===this.carrier){
        // Liés au porteur : les jambes courent, le buste et les bras tiennent le maillot.
        d.upper={name:'maul_push_walk',time:now+hasard(p.id,5),loop:true,weight:.62};
      }
    }

    if(recent&&now-recent.debut<=recent.duree&&['foul_holding_ball','foul_not_rolling','foul_off_feet'].includes(recent.clip)){
      clip(FAUTES[recent.clip],now-recent.debut);
      d.anchor={...this.remember('faute:'+recent.id,()=>({x:p.x,z:p.z,heading:p.team===0?Math.PI:0})),mode:'rel',fondu:.25};return done();
    }
    // ── Plaquage manqué : le défenseur plonge dans le vide, puis se relève ────
    if(s.corps&&recent?.clip==='tackle_low'&&recent.variante==='manque'){
      const c=s.corps,chute=Math.min(1.2,c.duree*.52);
      if(c.age<chute)clip('standing_tackle_fail_going_down',clamp(c.age/chute,0,1),false,true);
      else clip('standing_tackle_fail_get_up',.42+clamp((c.age-chute)/Math.max(.2,c.duree-chute),0,1)*.58,false,true);
      d.heading=this.remember('manque:'+recent.id,()=>({h:speed>.6?cap(p.vx,p.vz):p.team===0?Math.PI:0})).h;
      return done();
    }
    // ── Joueur au sol après une chute ────────────────────────────────────────
    if(s.corps&&!['coupEnvoi','renvoi22','penalite','tirAuBut','transformation','miTemps','fini'].includes(e.phase)&&!(recent&&gestures[recent.clip]&&e.phase!=='ruck')){
      const c=s.corps,moitie=c.duree*.5;
      if(c.age<moitie)clip('standing_tackled_going_down',clamp(c.age/moitie,0,1),false,true);
      else clip('standing_tackled_get_up',.3+clamp((c.age-moitie)/moitie,0,1)*.62,false,true);
      d.heading=Math.atan2(Math.sin(c.direction),Math.cos(c.direction))+Math.PI;
      // Offload ou passe au contact : le ballon part des bras pendant que le corps tombe.
      donner();
      return done();
    }

    // Réception d'un coup de pied.
    if(e.vol?.type==='pied'&&['jeuCourant','ballonEnLAir'].includes(e.phase)){
      const chute=xyz(e.vol.vers),loin=Math.hypot(p.x-chute.x,p.z-chute.z),reste=e.vol.duree-e.vol.ecoule-offset;
      if(loin<6&&speed<2.4)d.heading=cap(this.ball.x-p.x,this.ball.z-p.z);
      if(loin<2.6&&reste<.75&&speed<3.2){
        const haut=e.vol.hauteur>5;
        clip(haut?'jumping_catch_success':'catch_kick',(haut?.55:.5)-reste);d.air=haut;return done();
      }
      if(loin<14)d.watch=true;
    }

    // ── Fautes et altercations : ce que l'arbitre a vu, on le voit aussi ─────
    if(recent&&now-recent.debut<=recent.duree){
      const t=now-recent.debut,ici=()=>({...this.remember('faute:'+recent.id,()=>({x:p.x,z:p.z,heading:cap(p.vx,p.vz)})),mode:'rel',fondu:.2});
      /** L'adversaire le plus proche : celui sur qui porte le geste. */
      const vise=()=>{let proche=null,dMin=2.6;for(const q of this.players){if(q.team===p.team)continue;const dq=Math.hypot(q.x-p.x,q.z-p.z);if(dq<dMin){dMin=dq;proche=q;}}return proche;};
      if(recent.clip==='foul_punch'&&!s.corps){
        // Aucun coup de poing ni bousculade dans l'APK : le geste est construit
        // par la scène (bras et buste), tourné vers l'adversaire visé.
        const cible=vise();
        const bouscule=recent.variante==='bousculade';
        d.proc={type:bouscule?'bousculade':'poing',cible:cible?.id,t,duree:recent.duree};
        // Le corps suit : il s'avance d'un pas sur l'adversaire, à portée de bras.
        clip(bouscule?'bump':'fend',Math.min(t*1.05,1.2));
        if(cible){const dx=cible.x-p.x,dz=cible.z-p.z,dd=Math.hypot(dx,dz)||1;const portee=bouscule?1.02:.8;d.anchor={x:cible.x-dx/dd*portee,z:cible.z-dz/dd*portee,heading:cap(dx,dz),mode:'slot',fondu:.22};}
        return done();
      }
      const perdu=recent.variante&&VARIANTES[recent.clip+':'+recent.variante];
      if(perdu){
        jouerSuite(clip,perdu,t);
        // Tourné vers celui qui vient de le battre, tel qu'il l'était à l'impact.
        const face=this.remember('duel:'+recent.id,()=>{const adv=vise();return{h:adv?cap(adv.x-p.x,adv.z-p.z):null};}).h;
        if(recent.variante==='elimine')d.heading=speed>.6?cap(p.vx,p.vz):face;else if(face!==null)d.heading=face;
        return done();
      }
      if(SEQUENCES[recent.clip]&&!(recent.clip==='jackal'&&p.id===this.carrier&&speed>1.5)){
        let reste=t;const suite=SEQUENCES[recent.clip];
        for(let k=0;k<suite.length;k++){const [nom,duree]=suite[k];if(reste<duree||k===suite.length-1){clip(nom,Math.min(reste,duree));break;}reste-=duree;}
        if(recent.clip==='reaction_hit'){const agresseur=vise();if(agresseur)d.heading=cap(agresseur.x-p.x,agresseur.z-p.z);}
        else if(recent.clip!=='jackal')d.anchor=ici();
        return done();
      }
      if(FAUTES[recent.clip]){
        clip(FAUTES[recent.clip],t);
        const an=ici();
        // Entrée sur le côté : il arrive en travers du regroupement, pas par l'axe.
        if(recent.clip==='foul_side_entry')an.heading=(p.team===0?Math.PI:0)+Math.PI/2*(hasard(p.id,9)<.5?-1:1);
        if(recent.clip==='foul_high'||recent.clip==='foul_late'||recent.clip==='foul_tip'){const cible=vise();if(cible)an.heading=cap(cible.x-p.x,cible.z-p.z);}
        d.anchor=an;return done();
      }
    }
    // ── Gestes du jeu courant ────────────────────────────────────────────────
    // ⚠️ UN GESTE DE REGROUPEMENT NE SE JOUE PAS EN COURANT. Le ruck fini, un
    // soutien reparti à pleine vitesse gardait sa posture de poussée deux
    // secondes, tourné vers l'ancien regroupement (mesuré : 180 images sur 36 000).
    if(recent&&gestures[recent.clip]&&now-recent.debut<=recent.duree&&!(STATIQUES.has(recent.clip)&&speed>1.6&&e.phase!=='ruck')){clip(gestures[recent.clip],now-recent.debut);return done();}
    // ── Crochet : l'appui se voit, le porteur ne s'arrête pas ────────────────
    if(recent?.clip==='dodge'&&now-recent.debut<.95&&p.id===this.carrier){
      const [genre,appui]=String(recent.variante||'exterieur:1').split(':'),t=now-recent.debut;
      // Appui vers la gauche du joueur : l'équipe 0 a sa gauche du côté des y croissants.
      const vers=(Number(appui)>0)===(p.team===0)?'left':'right',contre=vers==='left'?'right':'left';
      // Double appui : un faux pas de l'autre côté, puis le vrai.
      const nom='dodge_'+(genre==='double'&&t<.28?contre:vers);
      if(genre==='feinte')d.upper={name:nom,time:.2+t,weight:clamp(t/.1,0,1)*clamp((.9-t)/.25,0,1)};
      else{clip(nom,.15+t*1.05);d.heading=speed>.6?cap(p.vx,p.vz):null;d.fondu=.14;return done();}
    }
    donner();
    if(d.upper){/* la passe prime */}
    else if(recent?.clip==='catch'){
      const vol=this.flights.get(p.id);
      if(vol){
        // ⚠️ LA RÉCEPTION SE PRÉPARE. Les mains ne montaient qu'à la dernière
        // demi-seconde, buste droit devant : un receveur lancé prenait le
        // ballon « dans le dos ». La tête se tourne dès que le ballon part, le
        // buste s'ouvre vers lui pendant le vol, les mains sont prêtes avant
        // l'arrivée — puis le corps se referme sur sa course.
        const arrivee=vol.start+vol.duree,t=PRISE_PASSE-(arrivee-now),cote=this.side(p,null,vol.de);
        if(t>-.4&&t<1)d.upper={name:cote<0?'pass_catch_from_left':'pass_catch_from_right',time:Math.max(0,t),weight:clamp((t+.4)/.3,0,1)*clamp((1-t)/.3,0,1)};
        const avant=arrivee-now;
        d.ouvre={x:this.ball.x,y:Math.max(1.1,this.ball.y),z:this.ball.z,poids:avant>0?clamp((now-vol.start)/.25,0,1):clamp(1+avant/.35,0,1)};
      }
    }else if(recent&&hauts[recent.clip]&&now-recent.debut<Math.min(recent.duree,1.2)){
      const t=now-recent.debut,fin=Math.min(recent.duree,1.2),poids=clamp(t/.1,0,1)*clamp((fin-t)/.25,0,1);
      let nom=hauts[recent.clip],depart=0;
      if(recent.clip==='handoff'){
        // Le bras se tend du côté du défenseur : à l'épaule d'un geste bref, au torse d'un vrai raffut.
        const adv=proche(2.8),c=adv?this.side(p,null,adv):1;
        nom=recent.variante==='torse'?'fend':c<0?'handoff_left':'handoff_right';if(nom==='fend')depart=.12;
      }else if(recent.clip==='bump'){
        // Percussion : l'épaule en avant, le centre de gravité bas ; plaquage cassé : on s'arrache.
        nom=recent.variante==='casse'?'standing_tackled_breakaway':'bump';depart=recent.variante==='casse'?0:.1;
        if(recent.variante!=='casse')d.raise=-.2*poids;
      }
      d.upper={name:nom,time:depart+t,weight:poids};
    }
    if(p.id===this.carrier&&!d.upper)d.carry=speed<.8&&!['jeuCourant'].includes(e.phase)?'deux':'bras';
    // Le jeu est arrêté : personne ne reste planté comme une statue.
    if(ARRETS.has(e.phase)||tir)return attendre();
    return done();
  }
  /** Début de la poussée : l'issue (écroulement, relevée) se compte depuis là. */
  pushStart(m){return m.etape==='poussee'?m.etapeDepuis:m.etape==='sortie'?m.etapeDepuis-m.dureePoussee:Infinity;}
  /** De quel côté du joueur se trouve un point : négatif à sa gauche. */
  side(p,heading,target){
    if(!target)return 1;
    const h=heading??cap(p.vx,p.vz),fx=-Math.sin(h),fz=-Math.cos(h),dx=target.x-p.x,dz=target.z-p.z;
    // Droite du joueur = avant × haut.
    return (-fz)*dx+fx*dz>=0?1:-1;
  }
  /** Le ballon du maul passe de main en main, du receveur vers le dernier joueur. */
  maulChain(){
    const liste=[...this.slots].filter(([,s])=>s.kind==='maul'&&s.attaque&&s.role!=='garde');
    const receveur=liste.find(([,s])=>s.role==='receveur')?.[0],porteur=liste.find(([,s])=>s.role==='porteur')?.[0];
    const relais=liste.filter(([,s])=>s.role==='lie').sort((a,b)=>Math.abs(a[1].x-(this.slots.get(porteur)?.x??0))-Math.abs(b[1].x-(this.slots.get(porteur)?.x??0)))[0]?.[0];
    return [receveur,relais,porteur].filter(Boolean);
  }
  maulTransfer(now){
    const chain=this.maulChain(),age=now-this.phaseStart;
    if(chain.length<2)return {from:chain[0],to:chain[0],u:1};
    // Le receveur garde le ballon le temps que le groupe se lie, puis le fait glisser vers l'arrière.
    const depart=1.3,pas=.75,k=clamp((age-depart)/pas,0,chain.length-1),i=Math.min(chain.length-2,Math.floor(k));
    return {from:chain[i],to:chain[i+1],u:clamp(k-i,0,1)};
  }
  maulHolder(now){const t=this.maulTransfer(now);return t.u>.5?t.to:t.from;}
  nextPhase(phase){let steps=0;while(this.e.phase!==phase&&!this.e.fini&&steps++<32000)this.step(TICK);return this.e.phase===phase;}
  /** Consigne de chenille au demi de mêlée, au premier ruck où il est disponible derrière ses avants. */
  chain(){
    for(let essai=0;essai<40&&!this.e.fini;essai++){
      if(this.phase!=='ruck'&&!this.nextPhase('ruck'))return false;
      const neuf=this.e.pions.find(p=>p.numero===9&&p.cote===this.e.possession&&p.surLeTerrain);
      if(neuf&&this.outils.preparerChenille(this.e,neuf)){this.sync();return true;}
      // Demi pris dans ce regroupement : pas de chenille sans lui, on attend le ruck suivant.
      let garde=0;while(this.e.phase==='ruck'&&!this.e.fini&&garde++<200)this.step(TICK);
    }
    return false;
  }
}
