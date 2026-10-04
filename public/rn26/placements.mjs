const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

/** Stable groups: lifters never swap sides halfway through their lift. */
export function lineoutGroups(players,conquest){
  if(!conquest||conquest.horsAlignement)return [];
  const chosen=players.find(p=>p.id===conquest.cibleId);
  return [0,1].map(team=>{
    const mates=players.filter(p=>p.team===team&&p.source.role==='alignement');
    const jumper=mates.find(p=>p.id===conquest.cibleId)||mates.sort((a,b)=>Math.abs(a.x-(chosen?.x??0))-Math.abs(b.x-(chosen?.x??0)))[0];
    if(!jumper)return null;
    const lifters=mates.filter(p=>p!==jumper).sort((a,b)=>distance(a,jumper)-distance(b,jumper)).slice(0,2).sort((a,b)=>a.x-b.x);
    return {jumper:jumper.id,lifters:lifters.map(p=>p.id)};
  }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// MÊLÉE : les places des seize avants, lues sur les clips de poussée d'origine
// ---------------------------------------------------------------------------
// Repère du pack : x vers la droite du joueur, f vers l'adversaire, en mètres.
// Ce sont les positions pour lesquelles les liaisons des bras ont été animées.
export const PLACES_MELEE={1:[-.59,.14],2:[-.03,.25],3:[.55,.14],4:[-.29,-.50],5:[.30,-.51],6:[-.84,-.61],7:[.85,-.59],8:[.01,-1.20]};
/** Du milieu du tunnel à l'origine d'un pack lié, épaules contre épaules. */
const DEMI_TUNNEL=.47;
/** Chaque pack est décalé vers sa gauche : les têtes s'intercalent, pilier gauche à l'extérieur. */
const DECALAGE_TETES=.15;

/**
 * Place et orientation de chaque avant pour une géométrie de mêlée donnée.
 * `centre` est le milieu du tunnel, `axe` l'angle (repère du lecteur) de la
 * direction d'attaque de l'équipe 0, `ecart` le recul de chaque pack avant l'impact.
 */
export function scrumSlots(players,centre,angle,ecart){
  const slots=new Map();
  for(const p of players){
    const place=PLACES_MELEE[p.number];
    if(!place||p.source.role!=='melee')continue;
    const sens=p.team===0?1:-1;
    // L'équipe 0 attaque vers +z ; la rotation de la mêlée tourne les deux packs ensemble.
    const fx=sens*Math.sin(angle),fz=sens*Math.cos(angle),rx=-fz,rz=fx;
    const recul=DEMI_TUNNEL+ecart;
    slots.set(p.id,{
      x:centre.x-fx*recul+rx*(place[0]-DECALAGE_TETES)+fx*place[1],
      z:centre.z-fz*recul+rz*(place[0]-DECALAGE_TETES)+fz*place[1],
      heading:Math.atan2(fx,fz)+Math.PI,kind:'melee',
    });
  }
  return slots;
}

// ---------------------------------------------------------------------------
// MAUL : un groupe debout, dissymétrique, le porteur protégé à l'arrière
// ---------------------------------------------------------------------------
// [latéral, profondeur] depuis la ligne de contact, dans le sens de l'attaque.
const MAUL_ATTAQUE=[[0,-.28,'receveur'],[-.58,-.2,'lie'],[.55,-.32,'lie'],[-.3,-.92,'lie'],[.36,-1.02,'lie'],[-.72,-1.18,'lie'],[.05,-1.62,'lie'],[.18,-2.25,'porteur']];
const MAUL_DEFENSE=[[-.08,.42,'lie'],[.55,.5,'lie'],[-.66,.46,'lie'],[.22,1.12,'lie'],[-.42,1.2,'lie'],[1.75,1.05,'garde'],[-1.9,.9,'garde'],[.3,2.6,'garde']];
function hasard(id,sel){let h=2166136261^sel;for(let i=0;i<id.length;i++){h^=id.charCodeAt(i);h=Math.imul(h,16777619);}return ((h>>>0)%1000)/1000;}

/**
 * Formation du maul autour du ballon. Le receveur du lancer est au contact,
 * le talonneur vient fermer l'arrière et recevra le ballon.
 */
export function maulSlots(players,centre,team,receveurId){
  const slots=new Map(),sens=team===0?1:-1,fx=0,fz=sens,rx=-fz,rz=fx;
  for(const side of [team,1-team]){
    const pack=players.filter(p=>p.team===side&&p.number<=8&&p.source.role==='maul');
    const attaque=side===team;
    let ordre;
    if(attaque){
      const receveur=pack.find(p=>p.id===receveurId)||pack.find(p=>p.number===4||p.number===5)||pack[0];
      const porteur=pack.find(p=>p.number===2&&p!==receveur)||pack.filter(p=>p!==receveur).sort((a,b)=>b.number-a.number)[0];
      const autres=pack.filter(p=>p!==receveur&&p!==porteur).sort((a,b)=>a.number-b.number);
      ordre=[receveur,...autres.slice(0,6),porteur].filter(Boolean);
      // Le porteur garde toujours la dernière place, même à effectif réduit.
      ordre=ordre.map((p,i)=>[p,p===porteur?MAUL_ATTAQUE[7]:MAUL_ATTAQUE[Math.min(i,6)]]);
    }else ordre=pack.sort((a,b)=>a.number-b.number).map((p,i)=>[p,MAUL_DEFENSE[Math.min(i,7)]]);
    for(const [p,[lat,prof,role]] of ordre){
      const jx=(hasard(p.id,1)-.5)*.16,jz=(hasard(p.id,2)-.5)*.16;
      // Personne n'est exactement dans l'axe : chacun pousse avec une épaule.
      const lacet=(hasard(p.id,3)-.5)*(role==='garde'?.3:.62)+(role==='lie'&&Math.abs(lat)>.5?-Math.sign(lat)*.3*(attaque?1:-1):0);
      const dir=attaque?1:-1;
      slots.set(p.id,{
        x:centre.x+rx*(lat+jx)+fx*(prof+jz),z:centre.z+rz*(lat+jx)+fz*(prof+jz),
        heading:Math.atan2(fx*dir,fz*dir)+Math.PI+lacet,kind:'maul',role,attaque,
        seed:hasard(p.id,4),lean:(hasard(p.id,5)-.35)*.34,
      });
    }
  }
  return slots;
}

const ARRETS=new Set(['melee','touche','coupEnvoi','renvoi22','penalite','tirAuBut','transformation','apresEssai','miTemps','tmo']);

/** Continuous bodies at 60 Hz, shared by playback and deterministic checks. */
export class PhysicalPlayers {
  bodies=new Map();
  pins=new Map();
  /** Le corps est tenu à cette place : son geste (racine du clip) le déplace seul. */
  pin(id,x,z){this.pins.set(id,{x,z});const b=this.bodies.get(id);if(b){b.x=x;b.z=z;b.vx=0;b.vz=0;}}
  unpin(id){this.pins.delete(id);}
  update(players,dt,match){
    const targets=new Map(players.map(p=>[p.id,{x:p.x,z:p.z}]));
    const slots=match.slots||new Map();
    for(const [id,slot] of slots)if(targets.has(id))targets.set(id,{x:slot.x,z:slot.z});
    const maul=match.phase==='maul';
    if(match.phase==='touche'&&match.progress()>.35){
      const u=clamp((match.progress()-.35)/.14,0,1);
      for(const g of match.liftGroups||[]){const jumper=targets.get(g.jumper);if(!jumper)continue;
        g.lifters.forEach((id,i)=>{const t=targets.get(id);if(t)targets.set(id,{x:t.x+(jumper.x+(i? .52:-.52)-t.x)*u,z:t.z+(jumper.z-t.z)*u});});
      }
    }
    for(const p of players)if(!this.bodies.has(p.id))this.bodies.set(p.id,{...targets.get(p.id),vx:0,vz:0});
    const steps=Math.max(1,Math.ceil(dt/(1/60))),h=dt/steps;
    const active=players.filter(p=>p.visible);
    const arret=ARRETS.has(match.phase);
    for(let tick=0;tick<steps;tick++){
      const starts=new Map(active.map(p=>[p.id,{...this.bodies.get(p.id)}]));
      for(const p of active){
        const b=this.bodies.get(p.id);
        if(this.pins.has(p.id))continue;
        const t=targets.get(p.id),dx=t.x-b.x,dz=t.z-b.z,d=Math.hypot(dx,dz);
        // ⚠️ QUAND LE MOTEUR JOUE CHAQUE DÉPLACEMENT (`placementJoue`), LE CORPS COLLE
        // À SA COURSE. La poursuite ci-dessous laisse un corps lancé un mètre derrière
        // sa place : un plaqueur et un porteur qui convergent semblaient donc encore à
        // deux pas l'un de l'autre quand le moteur les avait déjà au contact — le
        // « plaquage à distance ». Elle ne reste utile qu'au joueur que la scène place
        // elle-même (mêlée, ruck, alignement) ou qui revient de loin.
        // Le trajet du pas est réparti sur ses sous-pas : la vitesse du corps reste
        // celle de sa course (c'est elle qui choisit l'allure et le cap à l'image).
        if(match.e.placementJoue&&!slots.has(p.id)&&d<1.6){const k=1/(steps-tick);b.x+=dx*k;b.z+=dz*k;b.vx=h?dx*k/h:0;b.vz=h?dz*k/h:0;continue;}
        let vx=dx*9,vz=dz*9;
        // On rejoint une phase arrêtée en trottinant : seul un chasseur sprinte.
        // Quand le moteur joue lui-même le placement (`placementJoue`), le corps
        // suit sa course : le freiner ici le laisserait en retard sur la phase.
        const plafond=arret&&!match.e.placementJoue&&p.source.role!=='chasseur'?(d>18?6.2:4.8):Infinity;
        const max=Math.min(plafond,Math.max(3.5,p.source.vitesseMax||8.5)),speed=Math.hypot(vx,vz);
        if(speed>max){vx*=max/speed;vz*=max/speed;}
        // Anticipate a crossing and walk around a standing body.
        if(!slots.has(p.id))for(const q of active){if(q.id===p.id||q.source.corps)continue;const other=this.bodies.get(q.id);
          const rx=other.x-b.x,rz=other.z-b.z,dist=Math.hypot(rx,rz),along=d>0?(rx*dx+rz*dz)/d:0;
          if(dist<1.15&&dist>.01&&along>0&&d>.5){
            const cross=dx*rz-dz*rx,sign=Math.abs(cross)>.03?Math.sign(cross):p.id<q.id?1:-1;
            const avoid=(1.15-dist)*2.6;vx+=sign*rz/dist*avoid;vz-=sign*rx/dist*avoid;
          }
        }
        const change=Math.hypot(vx-b.vx,vz-b.vz),limit=(d<.5?35:24)*h;
        const k=change>limit?limit/change:1;b.vx+=(vx-b.vx)*k;b.vz+=(vz-b.vz)*k;
        b.x+=b.vx*h;b.z+=b.vz*h;
      }
      for(let pass=0;pass<5;pass++)for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
        const p=active[i],q=active[j];if(p.source.corps||q.source.corps)continue;
        const pinP=this.pins.has(p.id),pinQ=this.pins.has(q.id);
        if(pinP&&pinQ)continue;
        const sp=slots.get(p.id),sq=slots.get(q.id);
        // Deux joueurs liés dans la même formation se touchent : c'est voulu.
        if(sp&&sq&&sp.kind===sq.kind&&sp.role!=='garde'&&sq.role!=='garde')continue;
        const a=this.bodies.get(p.id),b=this.bodies.get(q.id);
        const lifting=match.phase==='touche'&&(match.liftGroups||[]).some(g=>[g.jumper,...g.lifters].includes(p.id)&&[g.jumper,...g.lifters].includes(q.id));
        const radius=lifting?.46:(maul&&p.number<=8&&q.number<=8)||p.source.role===q.source.role&&['melee','ruck'].includes(p.source.role)?.60:.72;
        let dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>=radius)continue;
        if(d<.00001){dx=p.id<q.id?.001:-.001;dz=.001;d=Math.hypot(dx,dz);}
        dx/=d;dz/=d;
        // Deux corps qui se rentrent dedans sont séparés tout de suite ; un simple
        // encombrement (ruck, alignement) se résorbe doucement, sans à-coup.
        const approche=Math.max(0,-((b.vx-a.vx)*dx+(b.vz-a.vz)*dz));
        const push=Math.min((radius-d)*(pinP||pinQ?1:.5),.014+approche*h*.55);
        if(!pinP){a.x-=dx*push;a.z-=dz*push;}
        if(!pinQ){b.x+=dx*push;b.z+=dz*push;}
      }
      for(const p of active){const b=this.bodies.get(p.id),start=starts.get(p.id);if(h&&!this.pins.has(p.id)){
        // Aucun corps n'est projeté plus vite qu'un sprint, même pris dans une mêlée ouverte.
        const pas=Math.hypot(b.x-start.x,b.z-start.z),borne=11*h;
        if(pas>borne){b.x=start.x+(b.x-start.x)*borne/pas;b.z=start.z+(b.z-start.z)*borne/pas;}
        b.vx=(b.x-start.x)/h;b.vz=(b.z-start.z)/h;}}
    }
    return players.map(p=>{const b=this.bodies.get(p.id),t=targets.get(p.id);return {...p,...b,arrival:distance(b,t),target:t};});
  }
}
