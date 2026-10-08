// correctif30-animations
// correctif24-scene
// correctif23-ruck
// correctif23-touche
import { PhysicalPlayers,lineoutGroups,scrumSlots,maulSlots } from './placements.mjs';
// Correctif 30 : la bibliothèque d'animations — à chaque variante écrite par le moteur, sa suite de clips.
import * as B from './animations.mjs';
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
// ⚠️ Correctif 30 : `high_tackle`, `not_releasing_ball`, `not_rolling_away`, `collapsing_ruck_or_maul` et `not_releasing_player`
// sont les SIGNAUX DE L'ARBITRE de l'APK (debout, sur place) — ils étaient joués par le joueur fautif. Les fautes passent par
// `B.FAUTES30` ; cette table n'est plus que le repli, avec des gestes de JOUEUR, tant que la banque n'est pas arrivée.
const FAUTES={foul_high:'standing_tackle_front_struggle',foul_late:'standing_tackle_front_grab',foul_tip:'standing_tackle_front_struggle',foul_kick:'kick_grubber',
  foul_holding_ball:'standing_tackled_hold',foul_not_rolling:'standing_tackle_success_hold',foul_off_feet:'pick_up_ball',
  foul_side_entry:'ruck_engage_left',foul_collapse:'standing_tackled_going_down',foul_obstruction:'bump',foul_charge:'bump',foul_scrum:'standing_tackled_going_down',
  reaction_high:'standing_tackled_going_down',reaction_charge:'standing_tackled_going_down'};
// Gestes en plusieurs temps : [clip, durée] enchaînés depuis le début du geste.
const SEQUENCES={
  reaction_tip:[['dangerous_tackled_tip_grabbed',.57],['dangerous_tackled_tip_in_air',1.5],['dangerous_tackled_tip_down',.57]],
  reaction_trip:[['tap_tackled_fall',1.13],['tap_tackled_getup',1.17]],
  foul_trip:[['tap_tackle_pre',.37],['tap_tackle_fall',.4]],
  jackal:[['jackal_engage',.57],['jackal_struggle',1.07],['jackal_success_standup',1]],
  reaction_hit:[['bumped_hit',.6],['standing_tackled_going_down',1.6]],
};
const gestures={pickup:'pick_up_ball',restart:'kick_restart',grubber:'kick_grubber',punt:'kick_running',box_kick:'kick_box',chip:'kick_box',drop:'kick_restart',conversion:'kick_conversion_a_kick',penalty:'kick_conversion_a_kick',tackle_low:'standing_tackle_front_grab',tackle_drive:'standing_tackle_front_grab',fall_forward:'standing_tackled_going_down',fall_back:'standing_tackled_going_down',contact_brace:'ruck_struggle_middle_front',clearout_drive:'ruck_engage_middle',ruck_bind:'ruck_engage_middle',ruck_push:'ruck_struggle_middle_front',try:'try_touchdown',dive_try:'try_dive',foul_knockon:'jumping_catch_fail',reaction_hit:'standing_tackled_going_down',charge_down:'jumping_catch_start_immediate',tap:'pick_up_ball',
  // IA par poste : les avants qui se lient pour un maul simulé, la remise en jeu armée d'une touche rapide.
  maul_bind:'maul_push_engage',quick_throw:'lout_throw_pull_back',plongeon:'dive_tackle_pre'};
// Gestes superposés à la course : seuls le buste et les bras les jouent.
// « scoop » : le ballon ramassé au sol sans s'arrêter — le buste plonge, les jambes continuent.
const hauts={handoff:'handoff_left',bump:'drive_with_ball',intercept:'pass_catch_from_left',scoop:'pick_up_ball'};
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
  // Correctif 30 : le botteur contré encaisse le contact du contreur, emporté par son élan ; le second plaqueur finit son geste en haut.
  'reaction_hit:contre':[['bumped_hit',.75,.1]],
};
/** Gestes de contact qu'on ne joue plus dès que le joueur est reparti en courant. */
const STATIQUES=new Set(['contact_brace','clearout_drive','ruck_bind','ruck_push','maul_bind']);
const jouerSuite=(clip,suite,t)=>{
  let reste=t;
  for(let k=0;k<suite.length;k++){const [nom,duree,depart=0,cadence=1]=suite[k];if(reste<duree||k===suite.length-1){clip(nom,depart+Math.min(reste,duree)*cadence);return;}reste-=duree;}
};
// Instant du contact pied-ballon dans chaque clip, et délai du moteur entre l'armé et la frappe.
const FRAPPES={kick_restart:1.15,kick_box:1.05,kick_running:.4,kick_grubber:.4,kick_grubber_loose:.36};
/** Durée d'une suite sans son dernier temps tenu. */
const dureeSuite=suite=>suite.reduce((n,x)=>n+(x[1]<50?x[1]:0),0);
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
    // Correctif 30 : la scène dit quels clips sont arrivés (banques chargées à la demande) ; sans elle, tout est réputé là.
    this.dispo=()=>true;
    this.ball={x:0,y:.14,z:0};this.time=etat.sim;this.sync();
  }
  /** Tous les clips d'une suite sont-ils chargés ? Sinon la scène joue le repli de la banque commune. */
  suiteDispo(suite){return !!suite&&suite.every(x=>this.dispo(x[0]));}
  /** Le jeu physique du Correctif 30 est-il celui de ce match ? (niveau du moteur, transporté par le film d'un direct) */
  get physique(){return (this.e.ia??1)>=6;}
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
    // ⚠️ Ce sont des lieux du STADE : après le changement de côté, ils sont en face (`inv`).
    const inv=e.cotesInverses?-1:1;
    const banc=equipe=>({x:37*inv,z:(equipe===0?-5:5)*inv});
    for(const p of this.players){
      // Retour d'un exclu temporaire : il repart du bord du terrain où il attendait et rejoint sa place en courant.
      const banni=!this.presents.has(p.id)&&this.changements.find(c=>c.carton&&!c.rouge&&c.id===p.id);
      if(banni){const d=Math.hypot(p.x-banni.vers.x,p.z-banni.vers.z);this.changements.push({type:'entree',id:p.id,debut:now,duree:clamp(d/5.6,1.2,9),de:banni.vers,equipe:p.team,retour:true});continue;}
      if(this.presents.has(p.id)||this.recent.get(p.id)?.clip!=='substitution')continue;
      const b=banc(p.team),d=Math.hypot(p.x-b.x,p.z-b.z);
      this.changements.push({type:'entree',id:p.id,debut:now,duree:clamp(d/5.6,1.2,7),de:b,equipe:p.team});
      this.remplacement={debut:now,z:b.z,equipe:p.team};
    }
    for(const id of this.presents){
      if(ici.has(id))continue;
      const src=e.pions.find(q=>q.id===id);
      // ⚠️ UN EXCLU NE DISPARAÎT PLUS. Il reste face à l'arbitre le temps que le
      // carton sorte, tête basse, puis quitte la pelouse en marchant : vers son
      // banc pour dix minutes, vers le tunnel pour un rouge.
      if(!src?.remplace){
        if(!(src?.sanction>0))continue;
        const equipe=src.cote==='A'?0:1,de=this.dernieres.get(id)||xyz(src.pos),rouge=src.sanction>9000;
        // Dix minutes : il attend debout au bord de la touche, devant son banc, et c'est de là qu'il rentrera.
        // Correctif 24 : il QUITTE la pelouse. Un jaune va s'asseoir derrière son banc, à six mètres de la touche ; un rouge rentre au tunnel.
        const vers=rouge?{x:44*inv,z:(equipe===0?-1.6:1.6)*inv}:{x:41.5*inv,z:(equipe===0?-8:8)*inv},d=Math.hypot(de.x-vers.x,de.z-vers.z);
        this.changements.push({type:'sortie',id,debut:now,attente:4.8,duree:4.8+clamp(d/2.3,2,30),de,vers,equipe,src,allure:2.3,carton:true,rouge});
        // Son corps physique est oublié : à son retour il repart du bord du terrain, pas de l'endroit de la faute.
        this.physics.bodies.delete(id);
        continue;
      }
      const equipe=src.cote==='A'?0:1,de=this.dernieres.get(id)||xyz(src.pos),b=banc(equipe);
      const blesse=!!(src.blessure||src.blesse),allure=blesse?1.3:2.6,d=Math.hypot(de.x-b.x,de.z-b.z);
      this.changements.push({type:'sortie',id,debut:now,duree:clamp(d/allure,1.5,24),de,vers:b,equipe,src,allure,blesse});
    }
    this.presents=ici;
    // Un exclu temporaire reste visible au bord du terrain jusqu'à son retour.
    this.changements=this.changements.filter(c=>now>=c.debut-.01&&(c.carton&&!c.rouge?!ici.has(c.id):now-c.debut<c.duree));
    const ouvert=['jeuCourant','ballonEnLAir','ballonLibre'].includes(e.phase);
    for(const c of this.changements){
      // Le jeu a repris : on ne laisse personne traîner hors de sa place.
      if(ouvert&&c.type==='entree'&&!c.retour)c.duree=Math.min(c.duree,now-c.debut+.5);
      const attente=c.attente||0,k=clamp((now-c.debut-attente)/(c.duree-attente),0,1);
      if(c.type==='entree'){
        const p=this.players.find(q=>q.id===c.id);if(!p)continue;
        const dx=p.x-c.de.x,dz=p.z-c.de.z,d=Math.hypot(dx,dz)||1,v=Math.min(6.2,d/c.duree);
        p.x=c.de.x+dx*k;p.z=c.de.z+dz*k;p.vx=dx/d*v;p.vz=dz/d*v;p.entrant=true;
      }else{
        // Sorti : il n'est plus sur la scène de jeu (le jaune reviendra de là où il s'est assis).
        if(c.carton&&k>=1)continue;
        const dx=c.vers.x-c.de.x,dz=c.vers.z-c.de.z,d=Math.hypot(dx,dz)||1;
        // Tant que l'arbitre n'a pas fini, il ne bouge pas.
        const part=now-c.debut>=attente&&k<1,vx=part?dx/d*c.allure:0,vz=part?dz/d*c.allure:0,x=c.de.x+dx*k,z=c.de.z+dz*k;
        this.players.push({x,z,id:c.id,team:c.equipe,number:c.src.numero,shirt:c.src.numeroMaillot??c.src.numero,vx,vz,visible:true,arrival:0,fantome:true,boite:c.blesse,exclu:c.carton?now-c.debut:undefined,
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
    // Correctif 30 : le porteur dont on n'a accroché qu'une jambe trébuche sans tomber ; un ballon mal assuré danse une
    // fraction de seconde dans les mains de celui qui le reçoit ; le second plaqueur a son propre geste.
    for(const g of e.gestes||[]){
      if(g.clip==='tackle_low'&&g.variante==='manque:une-jambe'&&e.sim-g.debut<.2&&this.carrier&&this.trebuche?.de!==g.id)this.trebuche={de:g.id,id:this.carrier,start:g.debut,par:g.joueurId};
      if(g.clip==='catch'&&g.variante==='jonglee'&&this.jongle?.de!==g.id&&e.sim-g.debut<g.duree+.6)this.jongle={de:g.id,id:g.joueurId,arrivee:g.debut+g.duree,duree:B.RECEPTIONS.jonglee.second};
    }
    this.flight=e.vol;const v=e.vol;
    if(v&&this.lastFlight!==v){this.lastFlight=v;this.flightStart=e.sim-v.ecoule;if(v.receveur)this.flights.set(v.receveur.id,{start:this.flightStart,duree:v.duree,de:xyz(v.de)});if(v.auteur)this.flights.set('de:'+v.auteur.id,{start:this.flightStart,duree:v.duree,vers:xyz(v.vers),type:v.type});}
    this.melee=this.lireMelee();this.tir=this.lireTir();
    // Dans un ruck, le ballon est présenté vers l'arrière puis talonné jusqu'au
    // dernier pied : c'est là que le relayeur vient le prendre.
    let sol=e.ballon;
    if(e.phase==='ruck'&&e.ruck&&!e.ruck.organisation?.chenille&&!e.ruck.duel){
      const s=e.possession==='A'?1:-1,k=lisse((e.sim-this.ruckStart-.9)/1.5);
      sol={x:e.ballon.x-s*1.3*k,y:e.ballon.y-.12*k};
    }
    this.ball={...xyz(sol),y:e.ballonLibre?.hauteur??(v?this.outils.positionVol(v).hauteur:e.porteur||e.piedPrepare?1.02:.14)};
    // Correctif 30 : un sauteur qui vient d'un autre bloc n'a ses lifteurs qu'une fois arrivé — les blocs sont relus à ce moment.
    const glisse=!!e.conquete?.glissement&&this.progress()>.36;
    if(this.conquest!==e.conquete||this.contreur!==e.conquete?.issue?.contreurId||glisse!==this.glisse){this.conquest=e.conquete;this.contreur=e.conquete?.issue?.contreurId;this.glisse=glisse;this.liftGroups=lineoutGroups(this.players,e.conquete);this.leurre=null;this.leurres=null;}
    // Correctif 30 — LES FAUX SAUTS, un ou deux, dans l'ordre annoncé : chaque faux sauteur est porté pour de faux par ses deux
    // voisins libres, sur sa fenêtre de la formation. Le vrai saut part ensuite (0,48).
    if(e.phase==='touche'&&e.conquete?.feintes?.length&&!this.leurres){
      const pris=new Set(this.liftGroups.flatMap(g=>[g.jumper,...g.lifters])),ids=e.conquete.feintes,fenetres=ids.length>1?[[.2,.42],[.33,.56]]:[[.3,.58]];
      this.leurres=[];
      ids.forEach((id,i)=>{
        const faux=this.players.find(p=>p.id===id);if(!faux)return;
        const voisins=this.players.filter(p=>p.team===faux.team&&p.source.role==='alignement'&&p.id!==faux.id&&!pris.has(p.id)).sort((a,b)=>Math.hypot(a.x-faux.x,a.z-faux.z)-Math.hypot(b.x-faux.x,b.z-faux.z)).slice(0,2);
        pris.add(faux.id);for(const v of voisins)pris.add(v.id);
        this.leurres.push({sauteur:faux.id,lifteurs:voisins.map(p=>p.id),de:fenetres[i][0],a:fenetres[i][1]});
      });
    }
    // Faux saut annoncé ailleurs que devant : celui que l'annonce désigne, porté pour de faux par ses deux voisins.
    if(e.phase==='touche'&&e.conquete?.leurreId&&!this.leurre&&!e.conquete.feintes){
      const pris=new Set(this.liftGroups.flatMap(g=>[g.jumper,...g.lifters])),faux=this.players.find(p=>p.id===e.conquete.leurreId);
      if(faux&&!pris.has(faux.id)){
        const voisins=this.players.filter(p=>p.team===faux.team&&p.source.role==='alignement'&&p.id!==faux.id&&!pris.has(p.id)).sort((a,b)=>Math.hypot(a.x-faux.x,a.z-faux.z)-Math.hypot(b.x-faux.x,b.z-faux.z)).slice(0,2);
        this.leurre={sauteur:faux.id,lifteurs:voisins.map(p=>p.id)};
      }
    }
    // Faux saut : le premier bloc de l'équipe qui lance monte pour de faux, le ballon part derrière.
    if(e.phase==='touche'&&e.conquete?.combinaison==='leurreDevant'&&!this.leurre&&!e.conquete.feintes){
      const pris=new Set(this.liftGroups.flatMap(g=>[g.jumper,...g.lifters])),bord=p=>Math.min(p.source.pos.y,70-p.source.pos.y);
      const devant=this.players.filter(p=>p.team===this.team&&p.source.role==='alignement'&&!pris.has(p.id)).sort((a,b)=>bord(a)-bord(b)).slice(0,3);
      if(devant.length===3){const tri=[...devant].sort((a,b)=>a.source.pos.y-b.source.pos.y);this.leurre={sauteur:tri[1].id,lifteurs:[tri[0].id,tri[2].id]};}
    }
    if(e.aplatissage&&this.aplatissage!==e.aplatissage){this.aplatissage=e.aplatissage;const g=(e.gestes||[]).filter(g=>g.joueurId===e.aplatissage.marqueur.id).pop();this.essai={id:e.aplatissage.marqueur.id,start:e.sim,plonge:g?.clip==='dive_try',maul:e.aplatissage.origine==='maul',style:e.aplatissage.style};}
    if(e.sifflet!==this.lastWhistle){this.lastWhistle=e.sifflet;if(e.sifflet)this.whistle={start:e.sim,cle:e.sifflet.cle||'',avertissement:e.sifflet.avertissement};if(/carton/.test(e.sifflet?.cle||''))this.card={start:e.sim,red:/Rouge/.test(e.sifflet.cle)};}
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
  dureeLiaison(m){return m.durees?.liaison!=null?Math.max(.4,m.durees.liaison):this.outils.TEMPS_MELEE.liaison;}
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
    // Correctif 30 — LE POSTE ET LA FATIGUE : un avant court plus bas, un joueur épuisé s'affaisse. C'est une retouche de
    // posture par-dessus le geste (quelques centimètres de buste), pas un autre jeu d'animations : rien ne devient lent.
    const profil=B.PROFILS[B.profilDuNumero(p.number)],usure=B.FATIGUE[this.physique?(s.fatigue||0):0];
    const done=()=>{
      this.used.add(d.name||d.idle);if(d.upper)this.used.add(d.upper.name);
      if(this.physique&&d.loco&&speed>1.4&&!p.fantome)d.raise=(d.raise||0)+profil.raise+usure.raise*clamp(speed/5,.4,1);
      return d;
    };
    /** L'essai tel qu'il a été marqué (style du moteur), ou le geste d'origine tant que la banque n'est pas là. */
    const gesteEssai=(essai)=>{
      const E=essai?.style&&B.ESSAIS[essai.style];
      if(E&&this.dispo(E.clip))return E;
      return essai?.maul?B.ESSAIS.maul:essai?.plonge?B.REPLI_ESSAI.plonge:B.REPLI_ESSAI.pose;
    };
    /** Le cap de celui qui marque : dans l'axe, ou de travers vers le coin. */
    const capEssai=E=>{const devant=p.team===0?1:-1,b=E.biais||0;return cap(Math.sign(p.x||1)*Math.sin(b),devant*Math.cos(b));};
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
      // Correctif 30 — le STYLE de la passe : vrillée (le geste long, quel que soit l'écart), courte du bout des doigts, ou
      // lâchée en se dérobant juste avant le plaquage.
      const P=B.PASSES[recent.variante]||B.PASSES.classique,long=P.long??longue,fin=P.fin;
      if(t>=fin+.2)return;
      d.upper={name:`pass_${long?'long':'short'}_${cote<0?'left':'right'}`,time:t+LACHER_PASSE-.1+(P.avance||0),weight:clamp(t/.08,0,1)*clamp((fin-t)/.25,0,1)*(construit?.3:P.poids)};
      if(P.penche)d.sway=(cote<0?-1:1)*P.penche*clamp(t/.1,0,1)*clamp((fin-t)/.2,0,1);
      if(construit)d.proc={type:recent.variante==='une-main'?'unemain':'chistera',point:vol.vers,t:t+.12,duree:.62};
    };
    // Remplacé qui regagne son banc, remplaçant qui entre, cortège d'avant-match : une course, rien d'autre.
    if(p.fantome||p.entrant||p.cortege){
      // L'exclu, pendant que le carton sort : il écoute l'arbitre, puis baisse la tête.
      if(p.exclu!==undefined&&p.exclu<4.9&&speed<.3){
        const arb=e.arbitre?xyz(e.arbitre.pos):null;
        clip('PlayerIdleSpotDisappointed01_002',Math.max(0,p.exclu-1.2));d.fondu=.4;
        if(arb)d.heading=cap(arb.x-p.x,arb.z-p.z);
        return done();
      }
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
        else if(tir.etape==='pret'||tir.etape==='vise')clip('kick_conversion_a_ready',depuis,true);
        else clip('kick_conversion_a_kick',clamp(IMPACT_TIR-(tir.frappeDans-offset),0,IMPACT_TIR));
        d.anchor=tee;return done();
      }
      if(tir.etape==='ramassage'){
        const sol=xyz(tir.ballonAuSol||tir.lieu||e.ballon);
        clip('kickoff_pickup_ball',depuis*1.15);
        d.anchor={...this.remember('ramassage:'+tir.etapeDepuis,()=>({x:p.x,z:p.z,heading:cap(sol.x-p.x,sol.z-p.z)})),mode:'rel'};
      }else if(tir.etape==='transport'){d.carry='deux';d.heading=speed<.4?face:null;}
      else if(tir.etape==='pose'){const fait=tir.humain?0:(tir.rituel?.de??0);clip('kick_conversion_a_setup',fait+(1-fait)*clamp(depuis/(tir.humain?this.outils.RITUEL_TIR.poseHumain:(tir.rituel?.pose??this.outils.RITUEL_TIR.pose)),0,1),false,true);d.anchor=tee;}
      else if(tir.etape==='pret'||tir.etape==='vise'){clip('kick_conversion_a_ready',depuis,true);d.anchor=tee;}
      else if(tir.etape==='elan'){clip('kick_conversion_a_kick',Math.min(depuis,IMPACT_TIR));d.anchor=tee;}
      return done();
    }
    // ── Après l'essai : le marqueur se relève puis célèbre, ses coéquipiers l'entourent ──
    if(tir?.etape==='celebration'&&tir.marqueurId===p.id){
      const essai=this.essai?.id===p.id?this.essai:null,depuis=now-(essai?.start??tir.etapeDepuis);
      const E=gesteEssai(essai),fin=E.fin;
      if(essai&&depuis<fin){clip(E.clip,depuis);if(E.biais)d.heading=capEssai(E);return done();}
      const debut=(essai?.start??tir.etapeDepuis)+(essai?fin:0);
      // Correctif 30 : la fête dépend du match (`tir.celebration`) — sobre, accolade, ballon brandi, collective, décisive.
      const fete=B.CELEBRATIONS30[tir.celebration],liste=fete?fete.marqueur.filter(n=>this.dispo(n)):[];
      const fetes=liste.length?liste[(p.number+p.team*3)%liste.length]:CELEBRATIONS[(p.number+p.team*3)%CELEBRATIONS.length],tt=now-debut;
      if(fete?.leve&&essai){
        // Il ramasse le ballon qu'il vient d'aplatir, le brandit à bout de bras, puis le repose : le buteur viendra le chercher là.
        if(tt<1.1)clip('pick_up_ball',tt*1.05);else{clip(fetes,tt-1.1);if(tt<3.7)d.proc={type:'ballonLeve',t:tt-1.1,duree:2.6};}
        d.ballon=clamp((tt-.45)/.3,0,1)*clamp((3.55-tt)/.4,0,1);
      }else clip(fetes,tt);
      d.anchor={...this.remember('fete:'+tir.etapeDepuis,()=>({x:p.x,z:p.z,heading:p.team===0?0:Math.PI})),mode:'rel'};
      return done();
    }
    if(tir?.etape==='celebration'&&tir.feteurs?.includes(p.id)){
      const marqueur=this.byId.get(tir.marqueurId);
      const fete=B.CELEBRATIONS30[tir.celebration],liste=fete?fete.feteurs.filter(n=>this.dispo(n)):[];
      if(marqueur&&speed<.6&&Math.hypot(marqueur.x-p.x,marqueur.z-p.z)<(fete?.rayon??3.4)){
        clip(liste.length?liste[(p.number+p.team)%liste.length]:ENCOURAGEMENTS[(p.number+p.team)%ENCOURAGEMENTS.length],now+p.number*.37,true);d.heading=cap(marqueur.x-p.x,marqueur.z-p.z);
      }
      return done();
    }
    // Correctif 30 — ceux qui viennent d'encaisser : les plus proches de l'en-but accusent le coup, tête basse, mains sur les
    // hanches. Trois sur cinq seulement, et jamais tous le même geste ; les autres regagnent leur place comme avant.
    if(this.physique&&tir?.etape==='celebration'&&tir.marqueurId&&speed<.5&&!s.corps){
      const marqueur=this.byId.get(tir.marqueurId);
      if(marqueur&&marqueur.team!==p.team&&Math.hypot(marqueur.x-p.x,marqueur.z-p.z)<16&&hasard(p.id,71)<.6){
        const liste=B.DECEPTIONS.filter(n=>this.dispo(n));
        if(liste.length){
          clip(liste[(p.number+Math.floor(tir.etapeDepuis))%liste.length],Math.max(0,now-tir.etapeDepuis-hasard(p.id,72)*.8));d.fondu=.5;
          d.anchor={...this.remember('deception:'+tir.etapeDepuis+':'+p.id,()=>({x:p.x,z:p.z,heading:cap(marqueur.x-p.x,marqueur.z-p.z)})),mode:'rel',fondu:.5};
          return done();
        }
      }
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
    if(e.phase==='touche'&&e.conquete?.rapide){
      // Pas d'alignement : celui qui est au ballon le ramasse, arme à deux mains
      // au-dessus de la tête, et remet en jeu. Les autres courent se replacer.
      const r=e.conquete.rapide;
      if(r.lanceurId===p.id&&r.etape&&r.etape!=='aller'){
        const depuis=now-(r.depuis??now),vers=this.byId?.get(r.receveurId);
        if(r.etape==='ramasse'){clip('pick_up_ball',depuis);d.heading=cap(this.ball.x-p.x,this.ball.z-p.z);d.pivot=7;}
        else{clip('lout_throw_pull_back',Math.min(.45+depuis*1.5,1.25));if(vers)d.heading=cap(vers.x-p.x,vers.z-p.z);d.pivot=9;}
        d.anchor={...this.remember('remise:'+r.depuis,()=>({x:p.x,z:p.z,heading:d.heading??(p.team===0?Math.PI:0)})),heading:d.heading??0,mode:'rel',fondu:.25};
        return done();
      }
    }else if(e.phase==='touche'){
      const c=e.conquete;
      if((c?.lanceurId?p.id===c.lanceurId:p.number===2)&&s.cote===e.possession){
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
        // Un faux saut, ou deux (Correctif 30) : chaque bloc monte sur sa fenêtre, les lifteurs tournés vers leur sauteur.
        for(const L of this.leurres??(this.leurre?[{...this.leurre,de:.3,a:.58}]:[])){
          const faux=progress>L.de&&progress<L.a?(progress-L.de)/(L.a-L.de):-1;
          if(faux>=0&&L.sauteur===p.id){clip('lout_jump_fake',faux,false,true);d.heading=s.pos.y>35?Math.PI/2:-Math.PI/2;return done();}
          if(faux>=0&&L.lifteurs.includes(p.id)){const cible=this.byId.get(L.sauteur);clip('lout_boost_fake',faux,false,true);if(cible)d.heading=cap(cible.x-p.x,cible.z-p.z);return done();}
        }
        // Monté trop tôt ou trop tard (Correctif 30) : il saute, et le ballon n'est pas dans ses mains.
        const rate=saute&&e.conquete?.issue?.cause==='timing'&&this.dispo('lout_jump_miss');
        if(saute){clip(rate?'lout_jump_miss':p.team===0?'lout_jump_catch_pass_l':'lout_jump_catch_pass_r',(progress-.48)/.52,false,true);d.air=true;}
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
      // Correctif 30 : le second plaqueur d'un plaquage à deux joue lui aussi — en haut, pendant que le premier est aux jambes.
      const second=!!r?.plaquage?.secondId&&r.plaquage.secondId===p.id&&!s.corps;
      if(r&&(r.porteurId===p.id||r.plaqueurId===p.id||second)){
        const victim=r.porteurId===p.id;
        // ═══ LES VINGT-DEUX PLAQUAGES (Correctif 30) ═══ La variante écrite par le moteur choisit la suite ; le type d'origine
        // sert de repli tant que la banque « contact » n'est pas arrivée — la physique, elle, est la même dans les deux cas.
        const v30=r.plaquage?.variante?B.PLAQUAGES30[r.plaquage.variante]:null;
        const base=r.plaquage&&PLAQUAGES[v30?v30.repli:r.plaquage.type];
        let suites=v30||base;
        if(suites){
          const autre=this.byId.get(victim?r.plaqueurId:r.porteurId);
          // Le cap du porteur et le côté d'où vient le plaqueur, figés à l'impact.
          const lu=this.remember('plaquage:'+this.ruckStart,()=>{
            const v=this.byId.get(r.porteurId),t=this.byId.get(r.plaqueurId),cap0=v?.team===0?Math.PI:0;
            return {cap:cap0,cote:r.plaquage.angle==='face'||!v||!t?0:r.plaquage.angle==='dos'?2:r.plaquage.cote||this.side(v,cap0,t)};
          });
          const prendre=S=>second?(S.second?S.second(lu.cote):null):victim?S.plaque(lu.cote):S.plaqueur(lu.cote);
          let suite=prendre(suites);
          if(v30&&suite&&!this.suiteDispo(suite)){suites=base;suite=suites&&!second?prendre(suites):null;}
          if(suite){
            const total=dureeSuite(suite),fin=Math.max(total,1.9),porteur=this.byId.get(r.porteurId);
            if(second){
              // Il finit son geste sur le porteur, puis repart : le moteur ne l'a retenu qu'une demi-seconde.
              if(age>total)return done();
              jouerSuite(clip,suite,age);d.heading=porteur?cap(porteur.x-p.x,porteur.z-p.z):null;d.fondu=.14;return done();
            }
            if(victim||age<fin||suites.debout)jouerSuite(clip,suite,age);
            else{
              // Il se relève — par le clip de son plaquage (plongé, debout), et moins vite s'il est cuit.
              const releve=suites.releve&&this.dispo(suites.releve)?suites.releve:'standing_tackled_get_up';
              clip(releve,.2+clamp((age-fin)/(1.6/usure.releve),0,1)*.8,false,true);
            }
            // Le plaqué garde le sens de sa course ; le plaqueur est tourné vers lui.
            d.heading=victim?lu.cap:autre?cap(autre.x-p.x,autre.z-p.z):null;
            return done();
          }
        }
        if(second)return done();
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
      // ═══ LE DUEL DU RUCK (Correctif 23) : ce que le moteur a décidé, on le voit se jouer ═══
      const duel=r?.duel;
      // Correctif 30 : le gratteur délogé (séquence « perdu ») est au sol pour le moteur — sa chute reste celle de la séquence.
      if(duel&&(!s.corps||duel.acteurId===p.id&&duel.sequence==='perdu')){
        const t=now-duel.contact,i=Math.max(0,duel.contreursIds.indexOf(p.id));
        if(duel.type==='gratte'&&duel.acteurId===p.id){
          // Il arrive en courant, les yeux sur le ballon ; au contact il se couche dessus, lutte, puis se relève avec lui.
          if(t<0){d.heading=cap(this.ball.x-p.x,this.ball.z-p.z);return done();}
          const ancre=this.remember('gratte:'+duel.debut,()=>({x:p.x,z:p.z}));
          // ═══ LES CINQ GRATTAGES (Correctif 30) ═══ rapide, contesté, récompensé d'une pénalité, perdu, trop tardif : la
          // séquence et ses trois temps (prise d'appui, lutte, conclusion) sont écrits par le moteur dans `ruck.duel`.
          let suite=duel.temps&&B.GRATTAGES[duel.sequence]?B.GRATTAGES[duel.sequence](duel.temps):SEQUENCES.jackal;
          if(!this.suiteDispo(suite))suite=this.suiteDispo(SEQUENCES.jackal)?SEQUENCES.jackal:B.REPLI_GRATTAGE;
          jouerSuite(clip,suite,t);
          d.heading=cap(this.ball.x-ancre.x,this.ball.z-ancre.z);
          const lutte=duel.temps?duel.temps.appui+duel.temps.lutte:1.64;
          // Les MAINS SUR LE BALLON : il se baisse, prend appui, va chercher le ballon et le tire à lui (cinématique inverse) —
          // ce n'est plus un joueur simplement penché.
          if(t<lutte+.25)d.proc={type:'mainsBallon',t,appui:duel.temps?.appui??.57,fin:lutte,tire:duel.sequence!=='tardif'};
          // Délogé, il n'est plus ancré : c'est le moteur qui le repousse.
          if(!(duel.sequence==='perdu'&&t>lutte))d.anchor={x:ancre.x,z:ancre.z,heading:d.heading,mode:'slot',fondu:.25};
          return done();
        }
        if(duel.type==='contre'&&duel.contreursIds.includes(p.id)){
          // Ils arrivent lancés (locomotion), percutent, puis poussent : le corps suit le moteur, rien n'est ancré.
          d.heading=cap(this.ball.x-p.x,this.ball.z-p.z);
          if(t<0)return done();
          // Correctif 30 : seul, à deux ou en groupe — et la fin se voit : le premier ramasse le ballon gagné, ou tous sont refoulés.
          const V=B.CONTRE_RUCKS[duel.variante],cadence=V?.cadence??1.5,finPoussee=duel.fin-.55;
          if(now>finPoussee&&duel.issue==='turnover'&&i===0){clip('pick_up_ball',(now-finPoussee)*1.5);return done();}
          if(now>finPoussee&&duel.issue==='attaqueConserve'&&this.dispo('ruck_disengage_middle_front_second')){clip('ruck_disengage_middle_front_second',now-finPoussee);return done();}
          const entree=V&&i===0&&this.dispo(V.entree)?V.entree:ENTREES[i%3];
          if(t<.9)clip(entree,t*1.5);else clip(LUTTES[i%3],(t-.9)*cadence+i*.4,true);
          d.raise=V?.raise??.25;
          return done();
        }
        if(duel.type==='contre'&&t>=0&&o&&o.attaque.includes(p.id)){
          // Les soutiens encaissent : ils luttent à pleine cadence et reculent avec le groupe.
          const j=o.attaque.indexOf(p.id);clip(LUTTES[j%3],t*1.5+j*.3,true);d.heading=face;d.raise=.2;
          return done();
        }
      }
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
        if(reste<COLLECTE&&!this.direct)clip('ruck_pass_short_left_collect',COLLECTE-reste);
        else{
          d.watch=true;
          // Il annonce le côté d'un bras tendu (geste construit) avant de se baisser sur le ballon.
          if(recent?.clip==='direct_play'&&now-recent.debut<recent.duree){
            const cote=recent.variante==='d'?1:-1;
            d.proc={type:'pointer',point:{x:p.x+cote*4,z:p.z+(p.team===0?-1.5:1.5)},t:now-recent.debut,duree:recent.duree};
          }
        }
        return done();
      }
      if(o?.chenille&&o.attaque.includes(p.id)){
        if(p.arrival>.5)return done();
        // Les trois liés de la chenille : cadence d'origine, à demi-vitesse.
        clip('extending_ruck_forward_0'+(o.attaque.indexOf(p.id)+1),(now-o.chenille.debut)*.5,true);d.heading=face;return done();
      }
      // Correctif 30 — LE SOUTIEN QUI VIENT DÉLOGER LE GRATTEUR : il arrive lancé, épaule basse, et l'emporte (« deloge ») ou bute sur lui.
      if(recent?.clip==='clearout_drive'&&B.DELOGEURS[recent.variante]&&now-recent.debut<recent.duree&&!s.corps){
        const suite=this.suiteDispo(B.DELOGEURS[recent.variante])?B.DELOGEURS[recent.variante]:B.REPLI_DEBLAYAGE.nettoyeur;
        jouerSuite(clip,suite,now-recent.debut);d.heading=cap(this.ball.x-p.x,this.ball.z-p.z);d.raise=-.15;d.fondu=.12;
        return done();
      }
      // Correctif 30 — LES HUIT DÉBLAYAGES : épaule basse, poussée droite, de côté, à deux ; en face on résiste, on recule, on
      // perd l'équilibre. Pendant le déblayage PERSONNE N'EST ANCRÉ : le moteur repousse vraiment celui qui cède, et on le voit.
      const deblai=recent&&(recent.clip==='clearout_drive'||recent.clip==='contact_brace')&&B.DEBLAYAGES[recent.variante]&&now-recent.debut<recent.duree+.35&&!s.corps?B.DEBLAYAGES[recent.variante]:null;
      if(deblai){
        const nettoie=recent.clip==='clearout_drive',fait=(r?.deblayages||[]).find(x=>(nettoie?x.de:x.sur)===p.id&&Math.abs(x.t-recent.debut)<.01);
        const autre=fait&&this.byId.get(nettoie?fait.sur:fait.de),c=autre&&this.side(p,face,autre)<0?'left':'right';
        let suite=nettoie?deblai.nettoyeur(c):deblai.cible(c);
        if(!this.suiteDispo(suite))suite=nettoie?B.REPLI_DEBLAYAGE.nettoyeur:B.REPLI_DEBLAYAGE.cible;
        jouerSuite(clip,suite,now-recent.debut);
        d.heading=autre&&nettoie?cap(autre.x-p.x,autre.z-p.z):face;d.raise=(nettoie?deblai.raise:deblai.raiseCible)||0;d.fondu=.14;
        return done();
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
        if(t<.9)clip(ENTREES[i%3],t);else clip(LUTTES[i%3],t*(r?.duel?1.2:.5)+i*.4,true);
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
      // Le petit par-dessus n'existe pas dans l'APK : c'est le coup de pied en course, le buste
      // en arrière et les bras écartés (construit par la scène), sur une frappe plus courte.
      const chip=pied.intention==='parDessus';
      // Correctif 30 : sous la pression, un rasant part d'un geste arraché, et le buste tombe en arrière sur toutes les frappes.
      const presse=recent?.variante==='presse'&&['punt','grubber','box_kick','chip','drop'].includes(recent.clip);
      const name=pied.intention==='renvoi'||pied.intention==='drop'?'kick_restart':pied.intention==='rasant'?(presse&&this.dispo('kick_grubber_loose')?'kick_grubber_loose':'kick_grubber'):chip?'kick_running':pied.intention==='chandelle'||p.number===9?'kick_box':'kick_running';
      if(presse)d.raise=B.FRAPPES30.presse.penche;
      const delai=pied.intention==='drop'?1.12:pied.intention==='renvoi'?1.05:p.number===9?.84:.7;
      clip(name,Math.max(0,now-pied.pretDepuis+FRAPPES[name]-delai));
      this.memo.set('pied:'+p.id,{name,debut:pied.pretDepuis+delai-FRAPPES[name],chip});
      if(chip)d.proc={type:'parDessus',t:now-pied.pretDepuis,duree:delai+.55};
      return done();
    }
    const frappe=this.memo.get('pied:'+p.id);
    if(frappe&&e.vol?.type==='pied'&&e.vol.auteur?.id===p.id&&now-frappe.debut<FRAPPES[frappe.name]+.7){
      clip(frappe.name,now-frappe.debut);
      const ou=xyz(e.vol.vers);d.heading=cap(ou.x-p.x,ou.z-p.z);d.pivot=5;
      if(frappe.chip)d.proc={type:'parDessus',t:now-frappe.debut-FRAPPES[frappe.name]+.7,duree:1.25};
      return done();
    }
    // Remise en jeu d'une touche rapide : le ballon part à deux mains, au-dessus de la tête.
    if(recent?.variante==='remise'&&/^pass/.test(recent.clip)&&now-recent.debut<1.15&&!s.corps){
      const vol=this.flights.get('de:'+p.id);
      clip('lout_throw_release',now-recent.debut+.12);
      d.anchor={...this.remember('remise:lacher:'+recent.id,()=>({x:p.x,z:p.z,heading:vol?cap(vol.vers.x-p.x,vol.vers.z-p.z):p.team===0?Math.PI:0})),mode:'rel',fondu:.12};
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
      // Correctif 30 : le geste de CELUI QUI FAUTE (couché sur le ballon, resté dans le passage, tombé sur le ruck) — plus le signal de l'arbitre.
      const F=B.FAUTES30[recent.clip],suite=F&&F.suite(1);
      if(suite&&this.suiteDispo(suite))jouerSuite(clip,suite,now-recent.debut);else clip(FAUTES[recent.clip],now-recent.debut);
      d.anchor={...this.remember('faute:'+recent.id,()=>({x:p.x,z:p.z,heading:p.team===0?Math.PI:0})),mode:'rel',fondu:.25};return done();
    }
    // ═══ LES TREIZE PLAQUAGES MANQUÉS (Correctif 30) ═══ « manque:<variante> » : plongé trop tôt, passé dans le dos, pris à
    // contre-pied, glissé, une jambe seulement, battu à la course, à genoux, percuté, assis, rebondi — ou resté debout, battu.
    const manque=recent?.clip==='tackle_low'&&typeof recent.variante==='string'&&recent.variante.startsWith('manque:')?recent.variante.slice(7):null;
    if(manque){
      const debout=B.MANQUES_DEBOUT.has(manque),t=now-recent.debut;
      let suite=B.MANQUES[manque];
      if(!this.suiteDispo(suite))suite=debout?B.REPLIS_MANQUE.debout:B.REPLIS_MANQUE.sol;
      const total=dureeSuite(suite);
      if(t<(debout?total:Math.max(total,recent.duree))){
        jouerSuite(clip,suite,t);
        // Tourné comme il l'était en se jetant : vers sa course, ou vers le camp d'en face s'il était arrêté.
        d.heading=this.remember('manque:'+recent.id,()=>({h:speed>.6?cap(p.vx,p.vz):p.team===0?Math.PI:0})).h;d.fondu=.14;
        return done();
      }
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
      // ⚠️ LANCÉ, ON LE CAPTE AUSSI. Un ailier qui arrivait à pleine vitesse sur une
      // passe au pied n'avait aucun geste : le ballon apparaissait dans ses bras.
      // Les bras et le buste montent vers lui, les jambes gardent leur course.
      if(loin<3.6&&reste<.6&&reste>-.2&&speed>=3.2){
        const haut=e.vol.hauteur>5;
        d.upper={name:haut?'jumping_catch_success':'catch_kick',time:Math.max(0,(haut?.55:.5)-reste),weight:clamp((.6-reste)/.22,0,1)};
        d.ouvre={x:this.ball.x,y:Math.max(1.4,this.ball.y),z:this.ball.z,poids:clamp((.7-reste)/.3,0,1)};
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
      // ═══ ALTERCATIONS (Correctif 30) ═══ Aucun de ces gestes n'existe dans l'APK : la scène les construit (bras et buste),
      // tournés vers l'adversaire. On se pousse, on se parle, on se tient par le maillot, on sépare — personne ne frappe.
      if(/^scuffle_(push|grab|talk|separate)$/.test(recent.clip)&&!s.corps){
        const cible=vise(),quoi=recent.clip.slice(8);
        d.proc={type:quoi==='push'?'bousculade':quoi==='grab'?'saisir':quoi==='talk'?'parler':'ecarter',cible:cible?.id,t,duree:recent.duree,reponse:recent.variante==='reponse'};
        if(cible){
          const dx=cible.x-p.x,dz=cible.z-p.z;d.heading=cap(dx,dz);d.pivot=8;d.regard={x:cible.x,y:1.6,z:cible.z};
          // Le corps accompagne la poussée d'un pas ; celui qui tient ou qui sépare reste sur ses appuis.
          if(quoi==='push'&&speed<1.2){clip('bump',Math.min(.15+t*.9,1.1));d.fondu=.2;}
        }
        return done();
      }
      // Les fautes de jeu, avec le geste de celui qui les commet (bibliothèque) ; et leurs victimes, selon le côté de l'impact.
      const F30=B.FAUTES30[recent.clip];
      if(F30&&!s.corps){
        const cible=F30.vise?vise():null,c=cible?this.side(p,cap(p.vx,p.vz),cible):1,suite=F30.suite(c);
        if(this.suiteDispo(suite)){
          jouerSuite(clip,suite,t);
          const an=ici();
          if(F30.travers)an.heading=(p.team===0?Math.PI:0)+Math.PI/2*(hasard(p.id,9)<.5?-1:1);
          if(cible)an.heading=cap(cible.x-p.x,cible.z-p.z);
          if(F30.brasHaut&&cible)d.proc={type:'brasHaut',cible:cible.id,t,duree:Math.min(recent.duree,1.3)};
          d.anchor=an;return done();
        }
      }
      const V30=B.VICTIMES[recent.clip];
      if(V30){
        const suite=V30(recent.variante);
        if(this.suiteDispo(suite)){
          jouerSuite(clip,suite,t);
          d.heading=this.remember('victime:'+recent.id,()=>({h:speed>.6?cap(p.vx,p.vz):p.team===0?Math.PI:0})).h;d.fondu=.12;
          return done();
        }
      }
      if(recent.clip==='foul_offside'&&!s.corps){
        // Pas de geste de hors-jeu dans l'APK : il s'arrête net et lève les deux mains (construit).
        d.proc={type:'mainsLevees',t,duree:recent.duree};
        const arb=e.arbitre?xyz(e.arbitre.pos):null;
        if(speed<1&&arb)d.heading=cap(arb.x-p.x,arb.z-p.z);
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
    // Correctif 30 — L'ESSAI TEL QU'IL EST MARQUÉ : plongeon, en force, glissade, posé, en coin, sous les poteaux, après mêlée, après interception.
    if(recent&&(recent.clip==='try'||recent.clip==='dive_try')&&now-recent.debut<=recent.duree+.2){
      const E=gesteEssai({style:recent.variante,plonge:recent.clip==='dive_try'});
      clip(E.clip,now-recent.debut);if(E.biais)d.heading=capEssai(E);return done();
    }
    // Correctif 30 — LE CONTRE : il arrive bras levés sur le botteur (tout le corps), ou les lève seulement pour gêner.
    if(recent?.clip==='charge_down'&&B.CONTRE[recent.variante]&&now-recent.debut<1.1&&this.dispo(B.CONTRE[recent.variante].clip)){
      const C=B.CONTRE[recent.variante],t=now-recent.debut;
      d.proc={type:'mainsLevees',t,duree:1.1};
      if(C.haut)d.upper={name:C.clip,time:C.depart+t*C.cadence,weight:clamp(t/.1,0,1)*clamp((1.1-t)/.3,0,1)};
      else{clip(C.clip,C.depart+t*C.cadence);d.heading=speed>.6?cap(p.vx,p.vz):null;d.fondu=.1;return done();}
    }else
    if(recent&&gestures[recent.clip]&&now-recent.debut<=recent.duree&&!(STATIQUES.has(recent.clip)&&speed>1.6&&e.phase!=='ruck')){clip(gestures[recent.clip],now-recent.debut);return done();}
    // ── Feinte de passe : le haut du corps arme la passe vers le partenaire, puis ramène le ballon ──
    // Aucun clip de feinte dans l'APK : on joue le DÉBUT de la passe courte, à l'endroit puis à
    // l'envers, sur le buste seul. Les jambes ne ralentissent pas.
    if(recent?.clip==='dummy_pass'&&now-recent.debut<.7&&p.id===this.carrier){
      const t=now-recent.debut,versY=recent.variante==='plus';
      // L'équipe 0 a sa gauche du côté des y croissants.
      const cote=versY===(p.team===0)?'left':'right';
      const arme=t<.32?t:Math.max(0,.32-(t-.32)*.85);
      d.upper={name:'pass_short_'+cote,time:LACHER_PASSE-.34+arme,weight:clamp(t/.08,0,1)*clamp((.7-t)/.2,0,1)};
    }
    // ── Crochet : l'appui se voit, le porteur ne s'arrête pas ────────────────
    // Correctif 30 : une jambe accrochée — le porteur trébuche, se rattrape, et repart.
    if(this.trebuche?.id===p.id&&now-this.trebuche.start<B.TREBUCHE.duree&&now>=this.trebuche.start&&p.id===this.carrier&&!s.corps){
      const par=this.byId.get(this.trebuche.par),c=par&&this.side(p,cap(p.vx,p.vz),par)<0?'left':'right';
      if(this.dispo(B.TREBUCHE[c])){clip(B.TREBUCHE[c],.1+(now-this.trebuche.start)*1.05);d.heading=speed>.6?cap(p.vx,p.vz):null;d.fondu=.12;return done();}
    }
    // ═══ LES DOUZE CROCHETS (Correctif 30) ═══ intérieur, extérieur, double, appui court, feinte de corps, faux extérieur,
    // arrêt-relance, explosif, lourd, rotation du bassin, crochet-accélération — et le crochet raté, que le plaquage coupe.
    if(recent?.clip==='dodge'&&p.id===this.carrier){
      const [genre,appui]=String(recent.variante||'exterieur:1').split(':'),t=now-recent.debut;
      // Appui vers la gauche du joueur : l'équipe 0 a sa gauche du côté des y croissants.
      const vers=(Number(appui)>0)===(p.team===0)?'left':'right',contre=vers==='left'?'right':'left';
      const c=(B.CROCHETS[genre]||B.CROCHETS.exterieur)(t,vers,contre);
      if(t<c.fin){
        if(c.raise)d.raise=(d.raise||0)+c.raise;
        if(c.sway)d.sway=c.sway;
        if(c.upper)d.upper={name:this.dispo(c.upper)?c.upper:'dodge_'+vers,time:c.time,weight:c.poids??1};
        else if(c.clip){clip(this.dispo(c.clip)?c.clip:'dodge_'+vers,c.time);d.heading=speed>.6?cap(p.vx,p.vz):null;d.fondu=.14;return done();}
      }
    }
    donner();
    // Le bras levé de celui qui réclame le ballon : l'ailier avant une passe au pied, le soutien d'une percée.
    if(recent?.clip==='call_ball'&&now-recent.debut<recent.duree&&p.id!==this.carrier)d.proc={type:'appel',cote:recent.variante==='d'?1:-1,t:now-recent.debut,duree:recent.duree};
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
        // ═══ LES SEPT RÉCEPTIONS (Correctif 30) ═══ poitrine, bras tendus, ballon haut, derrière soi, difficile, mal assurée
        // (elle danse avant d'être maîtrisée), en pleine course. Le moteur a lu le vol ; le buste et les mains le suivent.
        const R=B.RECEPTIONS[recent.variante]||B.RECEPTIONS.poitrine,lateral=cote<0?'pass_catch_from_left':'pass_catch_from_right';
        const nom=R.clip==='cote'||!this.dispo(R.clip)?lateral:R.clip,tot=R.tot||0;
        if(t>-.4-tot&&t<1)d.upper={name:nom,time:Math.max(0,t+tot+(nom===lateral?0:R.depart||0)),weight:clamp((t+.4+tot)/.3,0,1)*clamp((1-t)/.3,0,1)*R.poids};
        const avant=arrivee-now,ouvert=avant>0?clamp((now-vol.start)/.25,0,1):clamp(1+avant/.35,0,1);
        d.ouvre={x:this.ball.x,y:Math.max(R.hauteur,this.ball.y),z:this.ball.z,poids:ouvert};
        // Derrière lui : le buste se vrille vers l'arrière pour aller chercher le ballon.
        if(R.torsion)d.sway=(cote<0?1:-1)*R.torsion*ouvert;
        if(R.penche)d.raise=(d.raise||0)+R.penche*ouvert;
        // Bras tendus : les mains vont au-devant du ballon dans le dernier tiers du vol.
        if(R.tendus&&avant>-.12&&avant<.45)d.proc={type:'mainsVers',point:{x:this.ball.x,y:Math.max(R.hauteur,this.ball.y),z:this.ball.z},poids:R.tendus*clamp((.45-avant)/.2,0,1)*clamp((avant+.12)/.1,0,1)};
      }
    }else if(recent&&hauts[recent.clip]&&now-recent.debut<Math.min(recent.duree,1.2)){
      const t=now-recent.debut,fin=Math.min(recent.duree,1.2),poids=clamp(t/.1,0,1)*clamp((fin-t)/.25,0,1);
      let nom=hauts[recent.clip],depart=0;
      // Ramassé dans la course : le buste plonge vers le ballon, puis se redresse.
      if(recent.clip==='scoop'){depart=.3;d.raise=-.5*poids;}
      let boucle=false;
      if(recent.clip==='handoff'){
        // Le bras se tend du côté du défenseur : à l'épaule d'un geste bref, au torse d'un vrai raffut.
        const adv=proche(2.8),c=adv?this.side(p,null,adv):1;
        nom=recent.variante==='torse'?'fend':c<0?'handoff_left':'handoff_right';if(nom==='fend')depart=.12;
        // ═══ LES SIX RAFFUTS (Correctif 30) ═══ La main va se POSER sur le défenseur (poitrine, épaule) par cinématique inverse ;
        // il peut d'abord rentrer le ballon, ou sortir le bras sans rien changer à sa foulée.
        const R=B.RAFFUTS[recent.variante];
        if(R){
          nom=R.haut==='cote'?(c<0?'handoff_left':'handoff_right'):R.haut;depart=R.depart||0;
          if(R.rentre&&t<R.rentre){d.carry='deux';nom=null;}
          if(R.main&&adv&&t<R.fin)d.proc={type:'raffut',cible:adv.id,os:R.main,cote:c,t:t-(R.rentre||0),duree:R.fin-(R.rentre||0),poids:R.poids};
          if(R.penche)d.sway=(c<0?1:-1)*R.penche*poids;
          if(nom&&!this.dispo(nom))nom=c<0?'handoff_left':'handoff_right';
        }
      }else if(recent.clip==='bump'){
        // Percussion : l'épaule en avant, le centre de gravité bas ; plaquage cassé : on s'arrache.
        nom=recent.variante==='casse'?'standing_tackled_breakaway':'bump';depart=recent.variante==='casse'?0:.1;
        if(recent.variante!=='casse')d.raise=-.2*poids;
        // ═══ LES CINQ PERCUSSIONS (Correctif 30) ═══ centre qui traverse, troisième ligne lancé, pilier, quelques centimètres, stoppé net.
        const P=B.PERCUSSIONS[recent.variante];
        if(P&&this.dispo(P.haut)){nom=P.haut;depart=P.depart||0;boucle=!!P.boucle;d.raise=P.raise*poids;}
      }
      if(nom)d.upper={name:nom,time:depart+t,weight:poids,loop:boucle};
    }
    if(p.id===this.carrier&&!d.upper)d.carry=speed<.8&&!['jeuCourant'].includes(e.phase)?'deux':'bras';
    // Le capitaine appelé par l'arbitre : il vient à lui, puis l'écoute, tourné vers lui.
    if(this.whistle?.avertissement===p.id&&now-this.whistle.start<9&&e.phase==='penalite'&&e.arbitre&&speed<.5){
      const arb=xyz(e.arbitre.pos);d.heading=cap(arb.x-p.x,arb.z-p.z);d.regard={x:arb.x,y:1.6,z:arb.z};return done();
    }
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
