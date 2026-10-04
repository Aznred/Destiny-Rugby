// Port ciblé des sélecteurs originaux. Les primitives spatiales et la physique
// sont réécrites : ce module n'exécute pas le binaire IL2CPP de Rugby Nations.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const scalar=(node,key,fallback=0)=>node[key]?.SinglemValue??node[key]?.Int32mValue??fallback;
const type=node=>node.Type.split('.').pop();
function find(node,id){if(node.ID===id)return node;for(const c of node.Children||[]){const r=find(c,id);if(r)return r;}}
function utility(node){if(type(node).endsWith('Utility'))return node;for(const c of node.Children||[]){const r=utility(c);if(r)return r;}}
export class RecoveredAI {
  constructor(trees){this.trees=trees;this.decisions=0;}
  choose(tree,id,context){
    const selector=find(this.trees[tree].RootTask,id);
    if(!selector||type(selector)!=='UtilitySelector')throw Error('Sélecteur original absent');
    const options=selector.Children.map(branch=>{
      const task=utility(branch);return {task,branch,score:this.score(task,context)};
    });
    // Égalités : ordre de branche original conservé.
    let best=options[0];for(const item of options)if(item.score>best.score)best=item;
    this.decisions++;
    return {tree,selector:id,node:best.task.ID,type:type(best.task),name:best.task.Name,branch:best.branch.Name,
      score:best.score,options:options.filter(o=>Number.isFinite(o.score)).map(o=>({node:o.task.ID,name:o.task.Name,score:o.score}))};
  }
  score(n,c){
    const t=type(n),range=n.MinMaxRangeFloatUtilityVariableRange||{},min=range.SingleMinimumValue??0,max=range.SingleMaximumValue??0;
    const variation=min+(max-min)*c.random;
    if(t==='BaselineUtility')return scalar(n,'SharedFloatBaselineUtilityValue');
    if(t==='InGoalUtility')return c.inGoal?max:-Infinity;
    if(t==='PassUtility'){
      if(!c.receiver||c.nearTry<scalar(n,'SharedFloatTryLineIgnoreOffset'))return -Infinity;
      const threshold=scalar(n,'SharedFloatMinimumThreat');
      if(c.threat<threshold && !c.ruck)return -Infinity;
      const input=c.ruck?scalar(n,'SharedFloatThreatValue'):c.threat;
      return input*scalar(n,'SharedFloatThreatMultiplier',1)+c.quality*scalar(n,'SharedFloatWidePlayerMultiplier',.6)
        +c.threat*scalar(n,'SharedFloatThreatHighestMultiplier')+variation;
    }
    if(t==='DodgeUtility'||t==='PickAndGoUtility'){
      const side=n.Int32DodgeDirection;
      if(Math.abs(c.x+side*4)>35-(n.SingleTouchAvoidRange??8))return -Infinity;
      const free=side<0?c.freeLeft:c.freeRight;
      return c.threat*scalar(n,'SharedFloatThreatMultiplier',.6)*free+variation;
    }
    if(['CloseDefenseUtility','ClearanceKickUtility','BoxKickUtility','QuickKickUtility','GrubberKickUtility'].includes(t)){
      const phases=scalar(n,'SharedIntMinimumSuccessiveTackleCount',3);
      if(c.phases<phases)return -Infinity;
      if(t==='CloseDefenseUtility'&&c.ownMetres>22)return -Infinity;
      if(t==='BoxKickUtility'&&(c.ownMetres<20||c.ownMetres>50))return -Infinity;
      if(t==='GrubberKickUtility'&&(c.nearTry<10||c.nearTry>22))return -Infinity;
      if(t==='QuickKickUtility'&&c.ownMetres>35)return -Infinity;
      return .85+c.threat*.6+variation;
    }
    if(t==='StandingTackleUtility')return c.distance<1.45?2+variation:-Infinity;
    if(t==='DiveTackleUtility')return c.distance<2.5 && c.distance>1.35?1.15+variation:-Infinity;
    if(t==='TapTackleUtility')return c.distance<1.6 && c.behind?1.1+variation:-Infinity;
    // Situations hors du périmètre de cet aperçu : période, marque, drop, etc.
    return -Infinity;
  }
}
export class Match {
  constructor(ai,seed=26){this.ai=ai;this.seed=seed;this.time=0;this.score=[0,0];this.stats={passes:0,tackles:0,rucks:0,kicks:0,tries:0,turnovers:0};this.events=[];this.players=[];this.phases=0;
    for(let team=0;team<2;team++)for(let slot=0;slot<15;slot++)this.players.push({id:team*15+slot,team,number:slot+1,x:0,z:0,vx:0,vz:0,speed:slot<8?5.3:6.5,action:null,until:0,actionStart:0});
    this.restart(0);this.log('Coup d’envoi • Bleus à l’attaque');
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  direction(team){return team===0?1:-1;}
  restart(team){this.team=team;this.carrier=this.players[team*15+9];this.phase='open';this.phaseUntil=0;this.flight=null;this.nextThink=this.time+.8;this.lastPass=this.time;
    for(const p of this.players){const own=p.team===team,dir=this.direction(team);p.x=((p.number-1)%8-3.5)*7;p.z=dir*(own? -14-(p.number>8?4:0):8+(p.number>8?9:0));p.action=null;p.until=0;}
    this.carrier.x=-3;this.carrier.z=-8*this.direction(team);this.ball={x:this.carrier.x,y:1,z:this.carrier.z};
  }
  log(text,decision){this.events.unshift({time:this.time,text,decision});this.events=this.events.slice(0,10);if(decision)this.lastDecision=decision;}
  act(p,name,duration){p.action=name;p.until=this.time+duration;p.actionStart=this.time;}
  context(p,ruck=false){
    const dir=this.direction(p.team),opponents=this.players.filter(o=>o.team!==p.team&&o.until<this.time);
    const near=Math.min(...opponents.map(o=>distance(o,p))),threat=clamp((8-near)/8,0,1);
    const free=(side)=>clamp(Math.min(...opponents.map(o=>distance(o,{x:p.x+side*5,z:p.z+dir*4})))/8,0,1);
    let receiver=null,quality=-1;
    for(const q of this.players){if(q.team!==p.team||q.id===p.id||q.until>this.time||(q.z-p.z)*dir>-.5)continue;
      const length=distance(p,q);if(length<3||length>21)continue;
      const safety=clamp(Math.min(...opponents.map(o=>distance(o,q)))/9,0,1);
      const score=safety-.018*length+.12*(q.number>8);if(score>quality){quality=score;receiver=q;}}
    return {x:p.x,threat,nearTry:50-dir*p.z,ownMetres:50+dir*p.z,inGoal:dir*p.z>=50,phases:this.phases,
      receiver,quality:clamp(quality,0,1),freeLeft:free(-1),freeRight:free(1),random:this.random(),ruck};
  }
  attack(ruck=false){
    const p=this.carrier,c=this.context(p,ruck),d=this.ai.choose(ruck?'BreakdownAI':'UnionOpenPlayPossessionAI',ruck?33:84,c);this.lastDecision=d;
    if(d.type==='PassUtility'&&c.receiver&&(ruck||this.time-this.lastPass>1.6)){this.pass(p,c.receiver,d,ruck);return;}
    if(/KickUtility$/.test(d.type)){
      this.stats.kicks++;this.act(p,'kick_running',.9);const dir=this.direction(p.team);
      this.flight={kind:'kick',from:{x:p.x,z:p.z},to:{x:clamp(p.x+8*(this.random()-.5),-30,30),z:clamp(p.z+dir*30,-48,48)},start:this.time,duration:2.7};
      this.carrier=null;this.phase='flight';this.log('Jeu au pied • '+(p.team===0?'Bleus':'Rouges'),d);return;
    }
    if(d.type==='DodgeUtility'||d.type==='PickAndGoUtility')p.dodge=d.branch.includes('Left')?-1:1;else p.dodge=0;
    if(ruck)this.log('Sortie de ruck • '+(d.type==='PickAndGoUtility'?'petit côté':'relance'),d);
  }
  pass(p,q,d,ruck=false){
    const dir=this.direction(p.team),target={x:q.x,z:Math.min(q.z*dir,(p.z-.8*dir)*dir)*dir};
    this.flight={kind:'pass',from:{x:p.x,z:p.z},to:target,receiver:q.id,start:this.time,duration:clamp(distance(p,target)/18,.3,.85)};
    this.stats.passes++;this.lastPass=this.time;this.act(p,q.x<p.x?'pass_short_left':'pass_short_right',.8);
    this.carrier=null;this.phase='flight';this.log((ruck?'Sortie de ruck • ':'')+'Passe du n°'+p.number+' au n°'+q.number,d);
  }
  tackle(p,defender,decision){
    this.stats.tackles++;this.stats.rucks++;this.phases++;this.phase='ruck';this.phaseUntil=this.time+2.65;
    this.ruckPoint={x:p.x,z:p.z};this.downed=p.id;this.act(p,'dive_tackled_front',2.7);this.act(defender,'dive_tackle_success',2.7);
    this.log('Plaquage du n°'+defender.number+' • ruck '+this.phases,decision);
  }
  move(p,target,dt,speed=p.speed){
    const dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz),step=Math.min(len,speed*dt);
    p.vx=len>.05?dx/len*speed:0;p.vz=len>.05?dz/len*speed:0;
    if(len>.001){p.x+=dx/len*step;p.z+=dz/len*step;}
    p.x=clamp(p.x,-33.5,33.5);p.z=clamp(p.z,-54,54);
  }
  step(dt){
    this.time+=dt;if(this.time>=4800){this.phase='finished';return;}
    if(this.phase==='restart'){if(this.time>=this.phaseUntil)this.restart(1-this.team);return;}
    if(this.flight){const f=this.flight,u=clamp((this.time-f.start)/f.duration,0,1);
      this.ball={x:f.from.x+(f.to.x-f.from.x)*u,z:f.from.z+(f.to.z-f.from.z)*u,y:1+Math.sin(u*Math.PI)*(f.kind==='kick'?12:1.2)};
      if(u>=1){const q=f.kind==='pass'?this.players[f.receiver]:this.players.filter(p=>p.until<=this.time).sort((a,b)=>distance(a,f.to)-distance(b,f.to))[0];
        q.x=f.to.x;q.z=f.to.z;this.carrier=q;this.team=q.team;this.flight=null;this.phase='open';this.nextThink=this.time+.4;
        if(f.kind==='kick')this.log('Réception du coup de pied • n°'+q.number);}
    }
    const ball=this.ball,dir=this.direction(this.team),own=this.players.filter(p=>p.team===this.team),defense=this.players.filter(p=>p.team!==this.team);
    const chasers=[...defense].filter(p=>p.until<=this.time).sort((a,b)=>distance(a,ball)-distance(b,ball)).slice(0,3).map(p=>p.id);
    for(const p of this.players){
      if(p.until>this.time){p.vx=0;p.vz=0;continue;}p.action=null;
      if(p===this.carrier&&this.phase==='open'){
        const c=this.context(p);this.move(p,{x:clamp(p.x+(p.dodge||0)*3+(c.freeRight-c.freeLeft)*2,-30,30),z:p.z+dir*9},dt);continue;
      }
      let target;
      if(this.phase==='ruck' && distance(p,this.ruckPoint)<9 && p.number<=8){
        const offset=(p.number%3-1)*1.2;target={x:ball.x+offset,z:ball.z+(p.team===this.team?-dir:dir)*1.6};
        if(distance(p,target)<1.5)this.act(p,'ruck_struggle_middle_front',.2);
      }else if(p.team===this.team){
        const lane=p.number<=8?(p.number-4.5)*4.7:(p.number-12)*8.2;
        target={x:clamp(ball.x*.25+lane,-31,31),z:ball.z-dir*(p.number<=8?2.1+(p.number%3)*.7:1.6+(p.number%2)*1.2)};
        if(this.flight?.receiver===p.id)target=this.flight.to;
      }else if(chasers.includes(p.id)&&this.phase==='open')target={x:ball.x+(this.carrier?.vx||0)*.2,z:ball.z+(this.carrier?.vz||0)*.15};
      else target={x:clamp((p.number-8)*4.2+ball.x*.25,-31,31),z:ball.z+dir*(p.number<=8?6:12)};
      this.move(p,target,dt,p.team===this.team?p.speed*.88:p.speed*.9);
    }
    if(this.phase==='ruck'){
      this.ball={...this.ruckPoint,y:.22};
      if(this.time>=this.phaseUntil){
        if(this.random()<.13){this.team=1-this.team;this.stats.turnovers++;this.phases=0;this.log('Ballon gratté • changement de possession');}
        const eligible=this.players.filter(p=>p.team===this.team&&p.id!==this.downed);
        this.carrier=eligible.sort((a,b)=>distance(a,this.ball)-distance(b,this.ball))[0];this.carrier.x=this.ball.x;this.carrier.z=this.ball.z-this.direction(this.team)*.4;
        this.phase='open';this.nextThink=this.time+.7;this.attack(true);
      }return;
    }
    if(this.carrier&&this.phase==='open'){
      const p=this.carrier;this.ball={x:p.x,y:1.05,z:p.z};
      if(p.z*this.direction(p.team)>=50){const d=this.ai.choose('UnionOpenPlayPossessionAI',23,this.context(p));
        this.score[p.team]+=5;this.stats.tries++;this.act(p,'dive_tackled_front',2);this.log('ESSAI • '+(p.team===0?'Bleus':'Rouges'),d);this.phase='restart';this.phaseUntil=this.time+3;this.phases=0;return;}
      if(this.time>=this.nextThink){this.attack();this.nextThink=this.time+.37;}
      if(this.carrier){for(const q of defense){if(q.until>this.time)continue;const dist=distance(q,p);
        if(dist<1.3){const d=this.ai.choose('OpenPlayNonPossessionAI',66,{distance:dist,behind:(q.z-p.z)*dir<0,random:this.random()});
          if(d.type.includes('Tackle')){this.tackle(p,q,d);break;}}}}
    }
  }
}
